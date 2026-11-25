import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRICK_DARK, GILT, GILT_LIT, IRON, ISTRIA, OAK_DARK, SEQ_PINK, SEQ_TEAL, SEQ_GOLD, VELVET, VELVET_LIT,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Fat Thursday's Bull — Bull-Warden Bastian Corna, who keeps the carnival bull that is run in the
 * Campo on the last Thursday before Lent, and who in the King's telling ran it through the
 * crowds that would not sing at Vespers.
 *
 * The bull is staked in the middle of the yard on a long rope, gilt horns hung with ribbons. It
 * runs at RED: at whoever struck it last — or, when nobody has, at the warden's red cape. It paws
 * the stones first (its line is scraped on the floor), then charges straight down that line out to
 * the rope's end, goring and tossing everyone in its way, and stands blown a moment after.
 *
 * Bastian flies his cape from behind you, so the bull's line runs through you to him. The exploit
 * is the same trick turned round: strike the bull when he stands between it and you, then step off
 * the line — it runs at you, through him. Every charge at you ends with red back on his cape.
 * Halfway down the handlers let out the rope: the bull reaches further, paws shorter, runs sooner.
 */

const ID = fallenId('masque', 'bull');
const ROPE = 250;
const ROPE_HALF = 330;
const PAW_MS = 950;
const PAW_HALF_MS = 800;
const AUTO_MS = 6400;
const AUTO_HALF_MS = 5000;
const CHARGE_SPEED = 560;
const GORE_R = 46;
const WINDED_MS = 900;

type State = 'idle' | 'paw' | 'charge' | 'winded';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const stake: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  const bull = { x: stake.x + 40, y: stake.y + 20, face: 0, state: 'idle' as State, until: 0, autoAt: 0 };
  let red: Fighter = npc;
  let line: { a: Pt; b: Pt } | null = null;
  let wander: Pt = { ...stake };
  let gored = new Set<Fighter>();
  let longRope = false;
  let started = false;
  let chargeEnd = -9999;
  let hoof = 0;
  const tossed: { x: number; y: number; at: number }[] = [];

  const reach = (): number => (longRope ? ROPE_HALF : ROPE);
  const target: StrikeTarget = ctx.target({
    x: bull.x, y: bull.y - 16, r: 30,
    onStruck: (by) => {
      const now = tk.now;
      if ((bull.state !== 'idle' && bull.state !== 'winded') || now - chargeEnd < 600) return;
      red = by === 'player' ? player : npc;
      paw(now);
      ctx.float(bull.x, bull.y - 60, 'GOADED', '#ff8aa0');
    },
  });

  /** Lock the charge: from the bull toward red, out to where the rope runs taut (or the wall). */
  function paw(now: number): void {
    bull.state = 'paw';
    bull.until = now + (longRope ? PAW_HALF_MS : PAW_MS);
    const a = Math.atan2(red.y - bull.y, red.x - bull.x);
    const dx = Math.cos(a), dy = Math.sin(a);
    // Ray–circle: the bull is inside the rope's circle, so take the far root.
    const ox = bull.x - stake.x, oy = bull.y - stake.y;
    const bq = ox * dx + oy * dy;
    const c = ox * ox + oy * oy - reach() * reach();
    let t = -bq + Math.sqrt(Math.max(0, bq * bq - c));
    const tw = Math.min(
      dx > 0 ? (W - 40 - bull.x) / dx : dx < 0 ? (40 - bull.x) / dx : Infinity,
      dy > 0 ? (H - 34 - bull.y) / dy : dy < 0 ? (top + 30 - bull.y) / dy : Infinity,
    );
    t = Math.max(40, Math.min(t, tw));
    line = { a: { x: bull.x, y: bull.y }, b: { x: bull.x + dx * t, y: bull.y + dy * t } };
    bull.face = a;
    ctx.sfx('roar');
  }

  function gore(f: Fighter, now: number): void {
    gored.add(f);
    const a = bull.face;
    const side = Math.sign((f.x - bull.x) * -Math.sin(a) + (f.y - bull.y) * Math.cos(a)) || 1;
    if (f === player) tk.hitPlayer(22, f.x, f.y); else ctx.hit(f, 28, f.x, f.y);
    ctx.nudge(f, -Math.sin(a) * side * 64 + Math.cos(a) * 20, Math.cos(a) * side * 64 + Math.sin(a) * 20);
    ctx.stun(f, 500);
    tossed.push({ x: f.x, y: f.y, at: now });
    ctx.float(f.x, f.y - 52, 'GORED', '#ff8aa0');
    ctx.sfx('hit-heavy');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; bull.autoAt = time + 4200; }
      if (!longRope && npc.hp <= npc.maxHp * 0.5) {
        longRope = true;
        ctx.banner('The handlers let out the rope. The bull runs further now.', '#ffd0d8');
        ctx.sfx('chain');
      }

      if (bull.state === 'idle') {
        if (dist(bull.x, bull.y, wander.x, wander.y) < 10) {
          const a = rng() * Math.PI * 2, r = rng() * reach() * 0.4;
          wander = { x: stake.x + Math.cos(a) * r, y: stake.y + Math.sin(a) * r * 0.8 };
        }
        const d = dist(bull.x, bull.y, wander.x, wander.y) || 1;
        bull.x += ((wander.x - bull.x) / d) * 42 * dt; bull.y += ((wander.y - bull.y) / d) * 42 * dt;
        bull.face = Math.atan2(wander.y - bull.y, wander.x - bull.x);
        if (time >= bull.autoAt && alive(red)) paw(time);
      } else if (bull.state === 'paw') {
        hoof += dt * 14;
        if (time >= bull.until && line) { bull.state = 'charge'; gored = new Set(); ctx.sfx('stone-slam'); }
      } else if (bull.state === 'charge' && line) {
        const d = dist(bull.x, bull.y, line.b.x, line.b.y);
        const step = CHARGE_SPEED * dt;
        if (d <= step) { bull.x = line.b.x; bull.y = line.b.y; } else {
          bull.x += ((line.b.x - bull.x) / d) * step; bull.y += ((line.b.y - bull.y) / d) * step;
        }
        for (const f of [player, npc]) if (alive(f) && !gored.has(f) && dist(f.x, f.y, bull.x, bull.y) < GORE_R + 12) gore(f, time);
        if (d <= step) {
          bull.state = 'winded'; bull.until = time + WINDED_MS; chargeEnd = time;
          ctx.sfx('snap-back');
          // Red goes back to the warden's cape after every run.
          red = npc;
          line = null;
        }
      } else if (bull.state === 'winded' && time >= bull.until) {
        bull.state = 'idle';
        bull.autoAt = time + (longRope ? AUTO_HALF_MS : AUTO_MS);
        wander = { ...stake };
      }
      target.moveTo(bull.x, bull.y - 16);
      while (tossed.length && time - tossed[0].at > 600) tossed.shift();
    },

    npcSeek() {
      // In the scraped line: get off it, sideways.
      if (line && (bull.state === 'paw' || bull.state === 'charge')) {
        if (segDist(npc.x, npc.y, line.a.x, line.a.y, line.b.x, line.b.y) < GORE_R + 40) {
          const a = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x);
          const side = Math.sign((npc.x - line.a.x) * -Math.sin(a) + (npc.y - line.a.y) * Math.cos(a)) || 1;
          return { x: clamp(npc.x - Math.sin(a) * side * 130, 60, W - 60), y: clamp(npc.y + Math.cos(a) * side * 130, top + 40, H - 40) };
        }
        return null;
      }
      // Cape flying: stand behind the player, so the bull's line runs through them to him.
      if (red === npc) {
        const a = Math.atan2(player.y - bull.y, player.x - bull.x);
        const r = dist(bull.x, bull.y, player.x, player.y) + 130;
        return { x: clamp(bull.x + Math.cos(a) * r, 60, W - 60), y: clamp(bull.y + Math.sin(a) * r, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The rope's reach chalked on the campo, and the iron stake with its ring.
      g.lineStyle(2, ISTRIA, 0.18); g.strokeCircle(stake.x, stake.y, reach());
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        g.lineStyle(2, ISTRIA, 0.25); g.lineBetween(stake.x + Math.cos(a) * (reach() - 6), stake.y + Math.sin(a) * (reach() - 6), stake.x + Math.cos(a) * reach(), stake.y + Math.sin(a) * reach());
      }
      // Trodden straw and dung round the stake.
      g.fillStyle(0xc8a860, 0.22); g.fillEllipse(stake.x, stake.y + 6, 150, 70);
      g.fillStyle(BRICK_DARK, 0.3); g.fillEllipse(stake.x + 30, stake.y + 14, 16, 8);
      // The scraped charge line: hoof-scrapes running toward red.
      if (line && bull.state === 'paw') {
        const k = clamp(1 - (bull.until - time) / (longRope ? PAW_HALF_MS : PAW_MS), 0, 1);
        g.lineStyle(GORE_R * 2, VELVET, 0.1 + 0.15 * k); g.lineBetween(line.a.x, line.a.y, line.b.x, line.b.y);
        const L = dist(line.a.x, line.a.y, line.b.x, line.b.y);
        const ux = (line.b.x - line.a.x) / L, uy = (line.b.y - line.a.y) / L;
        for (let s = 30; s < L * k; s += 34) {
          const px = line.a.x + ux * s, py = line.a.y + uy * s;
          g.lineStyle(3, VELVET_LIT, 0.7);
          g.lineBetween(px - uy * 10 - ux * 6, py + ux * 10 - uy * 6, px, py);
          g.lineBetween(px + uy * 10 - ux * 6, py - ux * 10 - uy * 6, px, py);
        }
        g.lineStyle(2, VELVET_LIT, 0.4 + 0.4 * k); g.strokeCircle(line.b.x, line.b.y, 16);
      }
      for (const t of tossed) {
        const k = (time - t.at) / 600;
        g.lineStyle(3, 0xc8a860, 0.6 * (1 - k)); g.strokeCircle(t.x, t.y, 14 + k * 30);
      }
    },

    drawAir(g, time) {
      // The tether: slack and sagging, or bar-taut on a run.
      const hx = bull.x + Math.cos(bull.face) * 30, hy = bull.y - 18 + Math.sin(bull.face) * 10;
      const taut = bull.state === 'charge' || dist(stake.x, stake.y, bull.x, bull.y) > reach() - 12;
      g.fillStyle(IRON, 1); g.fillRect(stake.x - 4, stake.y - 22, 8, 22);
      g.lineStyle(3, IRON, 1); g.strokeCircle(stake.x, stake.y - 24, 6);
      if (taut) { g.lineStyle(3, 0xb08a58, 1); g.lineBetween(stake.x, stake.y - 24, hx, hy); } else {
        const mx = (stake.x + hx) / 2, my = (stake.y + hy) / 2 + 26;
        const pts: Pt[] = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          pts.push({ x: (1 - t) * (1 - t) * stake.x + 2 * (1 - t) * t * mx + t * t * hx, y: (1 - t) * (1 - t) * (stake.y - 24) + 2 * (1 - t) * t * my + t * t * hy });
        }
        g.lineStyle(3, 0xb08a58, 1); g.strokePoints(pts, false);
      }
      drawBull(g, bull.x, bull.y, bull.face, bull.state, time, hoof);
      // The red cape: over whoever the bull is fixed on.
      if (alive(red)) drawCape(g, red.x, red.y, time, red === npc);
    },

    drawHud(g, time) {
      // A rosette naming who is red, and the horns' fuse to the next run.
      const x = 30, y = top + 10;
      g.fillStyle(0x140c10, 0.72); g.fillRoundedRect(x - 10, y - 4, 108, 34, 6);
      const mine = red === player;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time / 2000;
        g.fillStyle(mine ? SEQ_TEAL : VELVET_LIT, 1); g.fillCircle(x + 6 + Math.cos(a) * 9, y + 13 + Math.sin(a) * 9, 4);
      }
      g.fillStyle(mine ? 0xffffff : VELVET, 1); g.fillCircle(x + 6, y + 13, 5);
      const left = bull.state === 'idle' ? clamp((bull.autoAt - time) / (longRope ? AUTO_HALF_MS : AUTO_MS), 0, 1) : 0;
      g.fillStyle(0x3a2a20, 1); g.fillRect(x + 26, y + 9, 64, 8);
      g.fillStyle(bull.state === 'idle' ? GILT : VELVET_LIT, 1); g.fillRect(x + 26, y + 9, 64 * (1 - left), 8);
      g.lineStyle(1, GILT_LIT, 0.8); g.strokeRect(x + 26, y + 9, 64, 8);
    },

    destroy() { target.remove(); },
  };

}

/** The carnival bull: a deep-chested black beast, gilt horns hung with ribbons, flanks heaving. */
function drawBull(g: G, x: number, y: number, face: number, state: State, time: number, hoof: number): void {
  const fx = Math.cos(face) >= 0 ? 1 : -1;
  const run = state === 'charge';
  const heave = Math.sin(time / (state === 'winded' ? 120 : 400)) * 2;
  shadow(g, x, y + 2, 92, 22, 0.4);
  // Legs: four, scissoring on a run, stamping on a paw.
  for (let i = 0; i < 4; i++) {
    const lx = x + (i < 2 ? -22 : 20) * fx + (i % 2 ? 6 : -4);
    const sw = run ? Math.sin(time / 50 + i * 1.6) * 8 : state === 'paw' && i === 3 ? Math.sin(hoof) * 6 : 0;
    g.lineStyle(7, 0x1a1214, 1); g.lineBetween(lx, y - 20, lx + sw, y - 2);
    g.fillStyle(0x3a3434, 1); g.fillEllipse(lx + sw, y - 1, 9, 4);
  }
  // Body, hump and belly.
  g.fillStyle(0x1e1618, 1); g.fillEllipse(x, y - 30 + heave * 0.3, 84, 40);
  g.fillStyle(0x2a2022, 1); g.fillEllipse(x - 8 * fx, y - 40, 50, 22);
  g.fillStyle(lit(0x1e1618, 0.15), 1); g.fillEllipse(x - 4 * fx, y - 42, 34, 8);
  // A carnival saddle-cloth.
  g.fillStyle(VELVET, 1); g.fillRect(x - 18, y - 46, 30, 22);
  g.fillStyle(GILT, 1); g.fillRect(x - 18, y - 26, 30, 3);
  for (let k = 0; k < 5; k++) { g.fillStyle([SEQ_PINK, SEQ_GOLD, SEQ_TEAL][k % 3], 1); g.fillCircle(x - 15 + k * 6, y - 22, 2); }
  // Tail.
  g.lineStyle(2, 0x1a1214, 1); g.lineBetween(x - 40 * fx, y - 36, x - 48 * fx, y - 18 + Math.sin(time / 200) * 3);
  g.fillStyle(0x1a1214, 1); g.fillEllipse(x - 48 * fx, y - 16, 5, 7);
  // Head low on a charge, the gilt horns forward.
  const hx = x + 42 * fx, hy = y - (run ? 22 : 32);
  g.fillStyle(0x1a1214, 1); g.fillEllipse(hx, hy, 28, 22);
  g.fillStyle(0x3a2a2a, 1); g.fillEllipse(hx + 10 * fx, hy + 6, 12, 9);
  g.fillStyle(0x000000, 1); g.fillCircle(hx + 12 * fx, hy + 6, 1.5);
  g.fillStyle(state === 'paw' || run ? 0xff4a4a : 0x8a2a2a, 1); g.fillCircle(hx + 3 * fx, hy - 4, 2.2);
  for (const s of [-1, 1]) {
    g.lineStyle(4, GILT, 1); g.lineBetween(hx - 2 * fx, hy - 8, hx + (8 + s * 2) * fx, hy - 16 + s * 2);
    g.lineStyle(3, GILT_LIT, 1); g.lineBetween(hx + (8 + s * 2) * fx, hy - 16 + s * 2, hx + 18 * fx, hy - 20 + s * 4);
  }
  for (let k = 0; k < 3; k++) {
    g.lineStyle(2, [SEQ_PINK, SEQ_TEAL, SEQ_GOLD][k], 0.9);
    g.lineBetween(hx - 4 * fx, hy - 10, hx - (14 + k * 5) * fx, hy - 4 + Math.sin(time / 110 + k) * 5);
  }
  if (state === 'winded') { g.fillStyle(0xffffff, 0.3); g.fillCircle(hx + 20 * fx, hy + 6 - ((time / 8) % 14), 3); }
  if (state === 'paw') { g.fillStyle(0xc8a860, 0.4); g.fillCircle(x - 18 * fx + Math.sin(hoof) * 6, y - 2, 6); }
}

/** The red cape: a muleta flourished over whoever the bull is fixed on. */
function drawCape(g: G, x: number, y: number, time: number, warden: boolean): void {
  const w = Math.sin(time / 180) * 6;
  const c = warden ? 0xc8202a : 0xe03a40;
  g.fillStyle(dim(c, 0.3), 0.95);
  g.fillTriangle(x + 14, y - 44, x + 36 + w, y - 20, x + 18, y - 6);
  g.fillStyle(c, 0.95); g.fillTriangle(x + 14, y - 44, x + 30 + w, y - 26, x + 16, y - 10);
  g.lineStyle(2, OAK_DARK, 1); g.lineBetween(x + 10, y - 46, x + 22, y - 42);
}

export const FALLEN_BULL: GimmickDef = {
  id: ID,
  rules: 'The staked bull charges whoever struck it last, or his red cape, out to the rope\'s end, goring all on its line. Strike it with him in between.',
  make,
};
