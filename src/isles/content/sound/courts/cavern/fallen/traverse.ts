import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRONZE, BRONZE_LIT, LAMP, PLANK, PLANK_DARK, PLANK_LIT, ROCK_DARK, ROCK_DEEP, ROPE, ROPE_DARK, SILVER, SILVER_DARK,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * The Rigger's Traverse — Tamar Sheave, Line-Rigger, who in the King's telling strung the haul-lines
 * over the Echo Caves so the Tuners could have a man across the chasm, over the pool, into any
 * grotto, before the singer in it had finished the verse.
 *
 * Three lines run over the floor between timber posts. Sheave sends laden baskets down them, from
 * the end farther from you down the line nearest you: the line shimmers first, then the basket
 * runs, swinging low enough to bowl over whoever stands under its line. Step off the line.
 *
 * The thing to do is ride. Stand on a post's deck a moment and you clip on and fly the whole line
 * to the far post, above everything (nothing touches you on the way) — and your boots strike
 * whoever stands under the line as you pass. Strike a post to send a basket from it at once. At
 * half health the brakes come off: baskets run from both ends of a line together.
 */

const ID = fallenId('cavern', 'traverse');
const LIFT = 58;
const SAG = 18;
const LANE = 30;
const SEND_MS = 3400;
const SEND_LATE_MS = 2900;
const WARN_MS = 950;
const BASKET_SPEED = 360;
const BASKET_DMG = 12;
const RIDE_SPEED = 560;
const CLIP_MS = 380;
const RIDE_CD = 3000;
const KICK_DMG = 14;
const DECK = 24;

/** A haul-line between two posts. */
interface Line { a: Pt; b: Pt; len: number }
/** A basket on a line: shown at `from` until `runAt`, then running toward the other end. */
interface Basket { line: Line; fromA: boolean; at: number; runAt: number; hit: Set<Fighter> }
/** A fighter riding a line. */
interface Ride { line: Line; fromA: boolean; at: number; ms: number; kicked: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const mk = (a: Pt, b: Pt): Line => ({ a, b, len: dist(a.x, a.y, b.x, b.y) });
  const lines: Line[] = [
    mk({ x: 80, y: top + 80 }, { x: W - 80, y: top + 205 }),
    mk({ x: 80, y: H - 80 }, { x: W - 260, y: top + 55 }),
    mk({ x: 330, y: H - 40 }, { x: W - 80, y: H - 120 }),
  ];
  const baskets: Basket[] = [];
  const rides = new Map<Fighter, Ride | null>([[player, null], [npc, null]]);
  const rideReady = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const dwell = new Map<Fighter, { at: Pt | null; since: number }>([[player, { at: null, since: 0 }], [npc, { at: null, since: 0 }]]);
  const kickedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  let nextSend = ctx.scene.time.now + 2200;
  let started = false;
  let unbraked = false;

  const at = (l: Line, fromA: boolean, k: number): Pt => {
    const s = fromA ? l.a : l.b, e = fromA ? l.b : l.a;
    return { x: s.x + (e.x - s.x) * k, y: s.y + (e.y - s.y) * k };
  };
  const basketK = (bk: Basket, time: number) => clamp(((time - bk.runAt) / 1000) * BASKET_SPEED / bk.line.len, 0, 1);
  const busy = (l: Line) => baskets.some((bk) => bk.line === l);
  const other = (f: Fighter) => (f === player ? npc : player);
  const laneOf = (l: Line, f: Fighter) => segDist(f.x, f.y, l.a.x, l.a.y, l.b.x, l.b.y);

  function send(l: Line, fromA: boolean, warn: number, time: number): void {
    baskets.push({ line: l, fromA, at: time, runAt: time + warn, hit: new Set() });
    ctx.sfx('gear-turn');
  }

  // The posts can be struck: a basket leaves from that post at once.
  const posts: StrikeTarget[] = [];
  for (const l of lines) {
    for (const fromA of [true, false]) {
      const p = fromA ? l.a : l.b;
      posts.push(ctx.target({
        x: p.x, y: p.y - 8, r: 18,
        onStruck: () => { const now = ctx.scene.time.now; if (!busy(l)) send(l, fromA, 520, now); },
      }));
    }
  }

  function clip(f: Fighter, l: Line, fromA: boolean, time: number): void {
    const ms = (l.len / RIDE_SPEED) * 1000;
    rides.set(f, { line: l, fromA, at: time, ms, kicked: false });
    ctx.root(f, ms + 80);
    ctx.airborne(f, ms);
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('BASKETS RUN THE LINES — STEP OFF. STAND ON A POST\'S DECK TO RIDE A LINE OVER HIM.', '#ffc874'); }
      if (!unbraked && npc.hp < npc.maxHp * 0.5) {
        unbraked = true;
        ctx.banner('THE BRAKES ARE OFF: BASKETS RUN FROM BOTH ENDS', '#ffc874');
        ctx.sfx('snap-back');
      }
      // Sheave sends a basket down the line nearest the player, from the end farther from them.
      if (time >= nextSend) {
        nextSend = time + (unbraked ? SEND_LATE_MS : SEND_MS);
        const l = lines.reduce((p, q) => (laneOf(p, player) < laneOf(q, player) ? p : q));
        if (!busy(l)) {
          const fromA = dist(l.a.x, l.a.y, player.x, player.y) > dist(l.b.x, l.b.y, player.x, player.y);
          send(l, fromA, WARN_MS, time);
          if (unbraked) send(l, !fromA, WARN_MS, time);
        }
      }
      for (let i = baskets.length - 1; i >= 0; i--) {
        const bk = baskets[i];
        if (time < bk.runAt) continue;
        const k = basketK(bk, time);
        const p = at(bk.line, bk.fromA, k);
        for (const f of [player, npc]) {
          if (bk.hit.has(f) || !alive(f) || rides.get(f) || ctx.isAirborne(f) || dist(p.x, p.y, f.x, f.y) > LANE + 6) continue;
          bk.hit.add(f);
          ctx.hit(f, BASKET_DMG, f.x, f.y);
          const dx = bk.line.b.x - bk.line.a.x, dy = bk.line.b.y - bk.line.a.y, l = Math.hypot(dx, dy) || 1;
          const side = Math.sign((f.x - p.x) * -dy + (f.y - p.y) * dx) || 1;
          ctx.nudge(f, (-dy / l) * side * 40, (dx / l) * side * 40);
          ctx.sfx('hit-heavy');
        }
        if (k >= 1) { baskets.splice(i, 1); ctx.sfx('clang'); }
      }
      for (const f of [player, npc]) {
        const r = rides.get(f);
        if (r) {
          const k = clamp((time - r.at) / r.ms, 0, 1);
          const p = at(r.line, r.fromA, k);
          ctx.nudge(f, p.x - f.x, p.y - f.y);
          const o = other(f);
          if (!r.kicked && alive(o) && !ctx.isAirborne(o) && dist(o.x, o.y, p.x, p.y) < LANE + 10) {
            r.kicked = true;
            kickedAt.set(o, time);
            ctx.hit(o, KICK_DMG, o.x, o.y);
            ctx.stun(o, 450);
            ctx.sfx('hit-heavy');
          }
          if (k >= 1) { rides.set(f, null); rideReady.set(f, time + RIDE_CD); ctx.sfx('land'); dwell.get(f)!.at = null; }
          continue;
        }
        if (!alive(f)) continue;
        // Standing on a post's deck clips you on, once the line has had its rest.
        let deck: { l: Line; fromA: boolean; p: Pt } | null = null;
        for (const l of lines) for (const fromA of [true, false]) {
          const p = fromA ? l.a : l.b;
          if (dist(p.x, p.y, f.x, f.y) < DECK) deck = { l, fromA, p };
        }
        const d = dwell.get(f)!;
        if (!deck || time < rideReady.get(f)!) { d.at = null; continue; }
        if (d.at !== deck.p) { d.at = deck.p; d.since = time; }
        if (time - d.since >= CLIP_MS) { d.at = null; clip(f, deck.l, deck.fromA, time); }
      }
    },

    npcSeek() {
      if (rides.get(npc)) return null;
      const now = ctx.scene.time.now;
      // Off any line a basket is coming down.
      for (const bk of baskets) {
        const l = bk.line;
        if (laneOf(l, npc) > LANE + 30) continue;
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, len = Math.hypot(dx, dy) || 1;
        const side = Math.sign((npc.x - l.a.x) * -dy + (npc.y - l.a.y) * dx) || 1;
        return { x: clamp(npc.x + (-dy / len) * side * 90, 50, W - 50), y: clamp(npc.y + (dx / len) * side * 90, top + 40, H - 40) };
      }
      // The player is standing under a line: go to its nearer post and ride it over them.
      if (now >= rideReady.get(npc)!) {
        for (const l of lines) {
          if (laneOf(l, player) > LANE) continue;
          const p = dist(l.a.x, l.a.y, npc.x, npc.y) < dist(l.b.x, l.b.y, npc.x, npc.y) ? l.a : l.b;
          if (dist(p.x, p.y, npc.x, npc.y) < 340) return { x: p.x, y: p.y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of lines) {
        // The lane under the line: worn floor where baskets have bowled people over.
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, len = l.len, nx = -dy / len, ny = dx / len;
        g.fillStyle(ROCK_DEEP, 0.22);
        g.fillPoints([
          { x: l.a.x + nx * LANE, y: l.a.y + ny * LANE }, { x: l.b.x + nx * LANE, y: l.b.y + ny * LANE },
          { x: l.b.x - nx * LANE, y: l.b.y - ny * LANE }, { x: l.a.x - nx * LANE, y: l.a.y - ny * LANE },
        ], true);
        const warm = baskets.some((bk) => bk.line === l);
        for (let s = 0; s < len; s += 22) {
          const x = l.a.x + (dx / len) * s, y = l.a.y + (dy / len) * s;
          g.fillStyle(warm ? LAMP : ROPE_DARK, warm ? 0.5 : 0.35); g.fillRect(x - 5, y - 1, 10, 2);
        }
        for (const p of [l.a, l.b]) deckAt(g, p);
      }
      for (const bk of baskets) {
        if (time < bk.runAt) {
          // Warning: a shimmer racing down the lane from the sending post.
          const k = (time - bk.at) / (bk.runAt - bk.at);
          for (let j = 0; j < 4; j++) {
            const p = at(bk.line, bk.fromA, ((k * 1.6 + j * 0.25) % 1));
            g.fillStyle(LAMP, 0.6 * (1 - k * 0.3)); g.fillCircle(p.x, p.y, 4);
          }
        } else {
          const p = at(bk.line, bk.fromA, basketK(bk, time));
          shadow(g, p.x, p.y + 4, 40, 14, 0.4);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const l of lines) {
        postAt(g, l.a); postAt(g, l.b);
        rope(g, l);
      }
      for (const bk of baskets) {
        const k = time < bk.runAt ? 0 : basketK(bk, time);
        const p = at(bk.line, bk.fromA, k);
        const swing = time < bk.runAt ? Math.sin(t * 6) * 3 : Math.sin(t * 9) * 6;
        basket(g, p.x, p.y, ropeY(bk.line, p), swing);
      }
      for (const f of [player, npc]) {
        const r = rides.get(f);
        if (!r) continue;
        const k = clamp((time - r.at) / r.ms, 0, 1);
        const p = at(r.line, r.fromA, k);
        const ry = ropeY(r.line, p);
        pulley(g, p.x, ry);
        g.lineStyle(2, ROPE, 1); g.lineBetween(p.x - 3, ry + 4, f.x - 8, f.y - 22); g.lineBetween(p.x + 3, ry + 4, f.x + 8, f.y - 22);
        g.lineStyle(1.5, LAMP, 0.6);
        for (let i = 1; i <= 3; i++) g.lineBetween(f.x - 12 - i * 8, f.y - 10 + i * 2, f.x - 4 - i * 8, f.y - 10 + i * 2);
      }
      // A kick from above: a burst over the head of whoever was ridden over.
      for (const f of [player, npc]) {
        const k = (time - kickedAt.get(f)!) / 400;
        if (k < 0 || k > 1 || !alive(f)) continue;
        g.lineStyle(3, LAMP, 1 - k);
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4; g.lineBetween(f.x + Math.cos(a) * 14, f.y - 30 + Math.sin(a) * 14, f.x + Math.cos(a) * (22 + k * 12), f.y - 30 + Math.sin(a) * (22 + k * 12)); }
      }
    },

    drawHud(g, time) {
      // A pulley wheel that fills as your next ride comes ready.
      const x = 38, y = ctx.top + 26;
      const left = clamp((rideReady.get(player)! - time) / RIDE_CD, 0, 1);
      g.fillStyle(ROCK_DEEP, 0.7); g.fillCircle(x, y, 20);
      g.fillStyle(left > 0 ? SILVER_DARK : BRONZE, 1); g.fillCircle(x, y, 14);
      if (left > 0) { g.fillStyle(BRONZE, 1); g.slice(x, y, 14, -Math.PI / 2, -Math.PI / 2 + (1 - left) * Math.PI * 2, false); g.fillPath(); }
      g.lineStyle(3, ROPE, 1); g.strokeCircle(x, y, 10);
      g.fillStyle(ROCK_DARK, 1); g.fillCircle(x, y, 3);
      if (rides.get(player)) { g.lineStyle(2, LAMP, 1); g.strokeCircle(x, y, 18); }
    },

    destroy() { for (const p of posts) p.remove(); },
  };
}

/** Height of the rope above floor point p on line l: lifted, with a sag at the middle. */
function ropeY(l: Line, p: Pt): number {
  const k = clamp(dist(l.a.x, l.a.y, p.x, p.y) / l.len, 0, 1);
  return p.y - LIFT + Math.sin(Math.PI * k) * SAG;
}

/** The haul-line: laid hemp, sagging between its posts, with its twist picked out. */
function rope(g: G, l: Line): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const k = i / 20, x = l.a.x + (l.b.x - l.a.x) * k, y = l.a.y + (l.b.y - l.a.y) * k;
    pts.push({ x, y: y - LIFT + Math.sin(Math.PI * k) * SAG });
  }
  g.lineStyle(5, ROPE_DARK, 1); g.strokePoints(pts, false);
  g.lineStyle(2, ROPE, 1); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y - 1 })), false);
  g.lineStyle(1, dim(ROPE_DARK, 0.4), 0.9);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let s = 0; s < 3; s++) { const k = s / 3, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k; g.lineBetween(x - 2, y - 2, x + 2, y + 2); }
  }
}

/** A post's deck on the floor: planks on bearers, a ring-bolt in the rock. */
function deckAt(g: G, p: Pt): void {
  g.fillStyle(PLANK_DARK, 1); g.fillRect(p.x - DECK, p.y - DECK * 0.5, DECK * 2, DECK);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? PLANK : PLANK_LIT, 1); g.fillRect(p.x - DECK + 1, p.y - DECK * 0.5 + 1 + i * (DECK / 4), DECK * 2 - 2, DECK / 4 - 2);
  }
  g.fillStyle(ROCK_DARK, 1); g.fillCircle(p.x - DECK + 5, p.y - DECK * 0.5 + 4, 2); g.fillCircle(p.x + DECK - 5, p.y + DECK * 0.5 - 4, 2);
}

/** A post: a squared timber with an iron cap and a brass sheave where the line runs over. */
function postAt(g: G, p: Pt): void {
  const top = p.y - LIFT - 8;
  g.fillStyle(PLANK_DARK, 1); g.fillRect(p.x - 6, top, 12, LIFT + 2);
  g.fillStyle(PLANK, 1); g.fillRect(p.x - 4, top, 5, LIFT + 2);
  g.fillStyle(SILVER_DARK, 1); g.fillRect(p.x - 8, top - 4, 16, 6);
  g.fillStyle(SILVER, 1); g.fillRect(p.x - 7, top - 4, 14, 2);
  g.fillStyle(BRONZE, 1); g.fillCircle(p.x, top + 6, 5);
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(p.x - 1, top + 5, 2);
  for (const s of [-1, 1]) { g.lineStyle(2, ROPE_DARK, 0.9); g.lineBetween(p.x, top + 4, p.x + s * 16, p.y - 4); }
}

/** A trolley block running on the line. */
function pulley(g: G, x: number, y: number): void {
  g.fillStyle(SILVER_DARK, 1); g.fillRoundedRect(x - 7, y - 6, 14, 14, 3);
  g.fillStyle(BRONZE, 1); g.fillCircle(x, y, 5);
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(x - 1, y - 1, 1.6);
}

/** A laden haul-basket swinging under its trolley: woven wicker, rope bridle, a sack poking out. */
function basket(g: G, x: number, y: number, ry: number, swing: number): void {
  pulley(g, x, ry);
  const bx = x + swing, by = y - 10;
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(x, ry + 6, bx - 13, by - 14); g.lineBetween(x, ry + 6, bx + 13, by - 14);
  g.fillStyle(0x6e5428, 1); g.fillPoints([{ x: bx - 16, y: by - 14 }, { x: bx + 16, y: by - 14 }, { x: bx + 11, y: by + 6 }, { x: bx - 11, y: by + 6 }], true);
  g.fillStyle(0xd8c89a, 1); g.fillEllipse(bx - 3, by - 16, 14, 8);
  g.lineStyle(1, 0xa88a58, 1);
  for (let i = 0; i < 4; i++) { const yy = by - 11 + i * 4.5; g.lineBetween(bx - 15 + i, yy, bx + 15 - i, yy); }
  g.lineStyle(1, 0x4a3a1a, 1);
  for (let i = -3; i <= 3; i++) g.lineBetween(bx + i * 4.5, by - 14, bx + i * 3.4, by + 6);
  g.lineStyle(2, 0x8a6a3a, 1); g.lineBetween(bx - 17, by - 14, bx + 17, by - 14);
}

export const FALLEN_TRAVERSE: GimmickDef = {
  id: ID,
  rules: 'Baskets run the lines: step off. Stand on a post\'s deck to ride a line high over all and kick whoever is under it. Strike a post to send one.',
  make,
};
