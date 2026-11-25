import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CHERRY, CRUMB_DARK, GINGER_DARK, ICING, IRON, MINT, VERDIGRA, dist, twist } from '../art';
import { alive, clamp, frameClock } from './util';

/**
 * Penned for the Cart — Fencewright Barley Stook, who built the candy-cane fences round every
 * garden in the court, and in the King's telling built the pens the short households waited in
 * for the Glasshouse cart.
 *
 * A ring is chalked round where you stand and Barley drives peppermint posts into it one by one,
 * each with a mallet-blow you can see coming. Wherever two neighbouring posts stand a striped rail
 * joins them, and a rail turns back anyone who walks into it from either side. Get out through a
 * gap before the last post goes in — the last slot carries a red flag — or be *penned*: held fast
 * and hurt when the cart comes. Strike a standing post and it falls flat, opening its gap again;
 * Barley has to drive it once more.
 *
 * Barley herds: he stands in the flagged gap while the pen goes up and steps out at the last
 * moment. Catch him there — a stun, a root, a body in his way — and he is penned in his own work.
 * Halfway, he drives from both ends of the ring at once, faster, and the cart turns round quicker.
 */

const ID = fallenId('confection', 'penned');
const R = 150;
const SLOTS = 12;
const STEP = (Math.PI * 2) / SLOTS;
const POST_MS = 430;
const POST_TURN_MS = 290;
const REST_MS = 3200;
const REST_TURN_MS = 2200;
const HOLD_MS = 1600;
const PEN_PLAYER = 22;
const PEN_NPC = 50;

type Stage = 'rest' | 'build' | 'penned';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = frameClock();
  let stage: Stage = 'rest';
  let stageAt = 0;
  let nextPostAt = 0;
  let c: Pt = { x: W / 2, y: (top + H) / 2 };
  let a0 = 0;
  const posted: boolean[] = new Array(SLOTS).fill(false);
  const fallen: { slot: number; at: number }[] = [];
  let queue: number[] = [];
  let lastSlot = 0;
  let turned = false;
  const targets: (StrikeTarget | null)[] = new Array(SLOTS).fill(null);
  const wasInside = new Map<Fighter, boolean>();
  const penned = new Set<Fighter>();
  let hammerAt = -1e9;
  let hammerSlot = -1;

  const slotPt = (i: number, r = R): Pt => ({ x: c.x + Math.cos(a0 + i * STEP) * r, y: c.y + Math.sin(a0 + i * STEP) * r });
  const angleOf = (x: number, y: number): number => Math.atan2(y - c.y, x - c.x);
  /** Which rail segment (between slot s and s+1) a point's bearing falls in. */
  const segOf = (x: number, y: number): number => {
    const a = ((angleOf(x, y) - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(a / STEP) % SLOTS;
  };
  const railUp = (s: number): boolean => posted[s] && posted[(s + 1) % SLOTS];
  const building = (): boolean => stage === 'build';

  const clearPosts = (): void => {
    for (let i = 0; i < SLOTS; i++) { posted[i] = false; targets[i]?.remove(); targets[i] = null; }
  };

  const drive = (slot: number, time: number): void => {
    posted[slot] = true;
    hammerAt = time; hammerSlot = slot;
    const p = slotPt(slot);
    ctx.sfx('hammer-forge');
    targets[slot]?.remove();
    targets[slot] = ctx.target({
      x: p.x, y: p.y - 14, r: 15,
      onStruck: (by) => {
        if (by !== 'player' || !posted[slot] || stage !== 'build') return;
        posted[slot] = false;
        targets[slot]?.remove(); targets[slot] = null;
        fallen.push({ slot, at: tk.now });
        queue.push(slot);
        lastSlot = slot;
        ctx.sfx('clang');
        ctx.float(p.x, p.y - 40, 'KNOCKED FLAT', '#c8ffe8');
      },
    });
    // The fighter standing right where the stake goes down gets the mallet too.
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, p.x, p.y) > 34) continue;
      if (f === player) tk.hitPlayer(8, p.x, p.y);
      else ctx.hit(npc, 12, p.x, p.y);
    }
  };

  const startPen = (time: number): void => {
    c = { x: clamp(player.x, R + 50, W - R - 50), y: clamp(player.y, top + R + 30, H - R - 30) };
    // The flagged last slot faces away from Barley, so he has to come round to herd it.
    const away = Math.atan2(c.y - npc.y, c.x - npc.x);
    a0 = away - (turned ? SLOTS / 2 : SLOTS - 1) * STEP;
    clearPosts();
    fallen.length = 0;
    if (turned) {
      queue = [];
      for (let k = 0; k < SLOTS / 2; k++) { queue.push(k); if (k > 0) queue.push(SLOTS - k); }
      queue.push(SLOTS / 2);
    } else {
      queue = Array.from({ length: SLOTS }, (_, i) => i);
    }
    lastSlot = queue[queue.length - 1];
    wasInside.clear();
    for (const f of [player, npc]) wasInside.set(f, dist(f.x, f.y, c.x, c.y) < R);
    stage = 'build'; stageAt = time;
    nextPostAt = time + tk.warn(900);
    ctx.sfx('trap-set');
  };

  const close = (time: number): void => {
    stage = 'penned'; stageAt = time;
    penned.clear();
    ctx.sfx('trap-snap');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, c.x, c.y) >= R - 4) continue;
      penned.add(f);
      ctx.root(f, HOLD_MS);
      if (f === player) tk.hitPlayer(PEN_PLAYER, f.x, f.y);
      else { ctx.hit(npc, PEN_NPC, f.x, f.y); ctx.float(f.x, f.y - 64, 'PENNED IN HIS OWN WORK', '#c8ffe8'); }
    }
    if (penned.size === 0) ctx.float(c.x, c.y - 30, 'EMPTY PEN', '#ffffff');
  };

  return {
    update(time) {
      step(time);
      if (!stageAt) { stageAt = time; }
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('TWO MALLETS — THE GAP CLOSES IN THE MIDDLE', '#c8ffe8');
        ctx.sfx('roar');
      }
      if (stage === 'rest' && time - stageAt >= (turned ? REST_TURN_MS : REST_MS)) startPen(time);
      else if (stage === 'build') {
        while (queue.length && time >= nextPostAt) {
          const s = queue.shift();
          if (s !== undefined) drive(s, time);
          nextPostAt += tk.warn(turned ? POST_TURN_MS : POST_MS);
          if (!queue.length) { close(time); break; }
        }
        // The rails turn back anyone crossing the ring where they stand.
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, c.x, c.y);
          const inside = d < R;
          const was = wasInside.get(f) ?? inside;
          if (inside !== was && railUp(segOf(f.x, f.y))) {
            const want = was ? R - 16 : R + 16;
            const ux = (f.x - c.x) / (d || 1), uy = (f.y - c.y) / (d || 1);
            ctx.nudge(f, c.x + ux * want - f.x, c.y + uy * want - f.y);
            continue;
          }
          wasInside.set(f, inside);
        }
      } else if (stage === 'penned' && time - stageAt >= HOLD_MS) {
        clearPosts();
        stage = 'rest'; stageAt = time;
      }
    },

    npcSeek() {
      if (!building() || !alive(npc)) return null;
      const left = queue.length;
      const gap = angleOf(slotPt(lastSlot).x, slotPt(lastSlot).y);
      const inside = dist(npc.x, npc.y, c.x, c.y) < R;
      const out = (r: number): Pt => ({ x: tk.clampX(c.x + Math.cos(gap) * r), y: tk.clampY(c.y + Math.sin(gap) * r) });
      if (left <= 2) return out(R + 70);
      if (dist(player.x, player.y, c.x, c.y) < R) return inside ? out(R - 24) : out(R + 34);
      return inside ? out(R + 70) : null;
    },

    drawGround(g, time) {
      if (stage === 'rest') return;
      // Trodden chalk ring and the post holes.
      g.lineStyle(26, CRUMB_DARK, 0.22); g.strokeCircle(c.x, c.y, R);
      g.lineStyle(2, ICING, 0.5); g.strokeCircle(c.x, c.y, R - 12); g.strokeCircle(c.x, c.y, R + 12);
      for (let i = 0; i < SLOTS; i++) {
        const p = slotPt(i);
        g.fillStyle(GINGER_DARK, 0.7); g.fillEllipse(p.x, p.y + 2, 14, 7);
      }
      for (const fl of fallen) {
        if (posted[fl.slot]) continue;
        const p = slotPt(fl.slot);
        const a = a0 + fl.slot * STEP + Math.PI / 2;
        twist(g, [{ x: p.x - Math.cos(a) * 20, y: p.y - Math.sin(a) * 20 + 4 }, { x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20 + 4 }], 6, ICING, CHERRY, 0.9, 8);
      }
      if (stage === 'penned') {
        const k = 1 - (time - stageAt) / HOLD_MS;
        g.fillStyle(VERDIGRA, 0.18 * k); g.fillCircle(c.x, c.y, R);
        drawCartRuts(g, c, R, k);
      }
      // The flagged last slot.
      if (building()) {
        const p = slotPt(lastSlot);
        g.lineStyle(3, CHERRY, 0.5 + Math.sin(time / 120) * 0.3); g.strokeCircle(p.x, p.y, 22);
      }
    },

    drawAir(g, time) {
      if (stage === 'rest') return;
      // Rails behind the posts, posts on top; draw by depth so the near side overlaps.
      const order = Array.from({ length: SLOTS }, (_, i) => i).sort((a, b) => slotPt(a).y - slotPt(b).y);
      for (const i of order) {
        const j = (i + 1) % SLOTS;
        if (railUp(i)) drawRail(g, slotPt(i), slotPt(j), time);
      }
      for (const i of order) if (posted[i]) drawPost(g, slotPt(i), time - (hammerSlot === i ? hammerAt : -1e9));
      if (building()) {
        const p = slotPt(lastSlot);
        drawFlag(g, p.x, p.y, time);
        if (queue.length) drawMallet(g, slotPt(queue[0]), clamp(1 - (nextPostAt - time) / tk.warn(turned ? POST_TURN_MS : POST_MS), 0, 1));
      }
    },

    drawHud(g) {
      const x = W / 2 - (SLOTS * 11) / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 8, y - 10, SLOTS * 11 + 16, 22, 5);
      for (let i = 0; i < SLOTS; i++) {
        const up = stage !== 'rest' && posted[i];
        const last = building() && i === lastSlot;
        g.fillStyle(up ? ICING : 0x3a3036, 1); g.fillRect(x + i * 11, y - 6, 6, 14);
        if (up) { g.fillStyle(CHERRY, 1); g.fillRect(x + i * 11, y - 3, 6, 2); g.fillRect(x + i * 11, y + 3, 6, 2); }
        if (last) { g.fillStyle(CHERRY, 1); g.fillTriangle(x + i * 11 + 3, y - 10, x + i * 11 + 10, y - 7, x + i * 11 + 3, y - 4); }
      }
    },

    destroy() { clearPosts(); },
  };
}

/** One peppermint post: striped stake, a gumdrop cap, a puff of sugar-dust when freshly driven. */
function drawPost(g: G, p: Pt, since: number): void {
  const h = 46;
  const sink = since < 140 ? (1 - since / 140) * 10 : 0;
  shadow(g, p.x, p.y + 2, 22, 7, 0.32);
  twist(g, [{ x: p.x, y: p.y }, { x: p.x, y: p.y - h + sink }], 9, ICING, CHERRY, 1, 9);
  g.fillStyle(dim(MINT, 0.3), 1); g.fillEllipse(p.x, p.y - h + sink, 14, 9);
  g.fillStyle(MINT, 1); g.fillEllipse(p.x, p.y - h - 2 + sink, 12, 8);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(p.x - 2, p.y - h - 4 + sink, 1.6);
  if (since < 400) {
    const k = 1 - since / 400;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      g.fillStyle(ICING, 0.7 * k); g.fillCircle(p.x + Math.cos(a) * (8 + 18 * (1 - k)), p.y + Math.sin(a) * 4, 2.5 * k + 1);
    }
  }
}

/** Two striped rails strung between neighbouring posts, sagging a little. */
function drawRail(g: G, a: Pt, b: Pt, time: number): void {
  for (const hgt of [16, 32]) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - hgt + 3 + Math.sin(time / 700 + a.x) * 0.6 };
    twist(g, [{ x: a.x, y: a.y - hgt }, mid, { x: b.x, y: b.y - hgt }], 5, ICING, CHERRY, 1, 7);
  }
}

/** The red flag tied on the last slot — the gap that closes last. */
function drawFlag(g: G, x: number, y: number, time: number): void {
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 14, y, x + 14, y - 54);
  const wv = Math.sin(time / 110) * 3;
  g.fillStyle(dim(CHERRY, 0.3), 1); g.fillTriangle(x + 15, y - 54, x + 38 + wv, y - 47, x + 15, y - 40);
  g.fillStyle(CHERRY, 1); g.fillTriangle(x + 15, y - 53, x + 35 + wv, y - 47, x + 15, y - 42);
}

/** Barley's mallet over the next slot, rising as the blow comes. */
function drawMallet(g: G, p: Pt, k: number): void {
  const lift = Math.sin(k * Math.PI * 0.9) * 26 + 36;
  g.lineStyle(1.5, CHERRY, 0.3 + k * 0.5); g.strokeCircle(p.x, p.y, 34);
  g.fillStyle(0x000000, 0.18 + k * 0.2); g.fillEllipse(p.x, p.y + 2, 26, 9);
  const hx = p.x + 6, hy = p.y - lift;
  g.lineStyle(4, GINGER_DARK, 1); g.lineBetween(hx + 18, hy + 22, hx, hy);
  g.fillStyle(dim(0x9a6a3a, 0.3), 1); g.fillRoundedRect(hx - 14, hy - 9, 28, 16, 4);
  g.fillStyle(0x9a6a3a, 1); g.fillRoundedRect(hx - 13, hy - 9, 26, 13, 4);
  g.fillStyle(IRON, 1); g.fillRect(hx - 14, hy - 9, 4, 16); g.fillRect(hx + 10, hy - 9, 4, 16);
  glow(g, p.x, p.y, 20, CHERRY, 0.03 * k, 2);
}

/** Wheel-ruts and a tailboard shadow drawn through the pen while the cart is "come". */
function drawCartRuts(g: G, c: Pt, r: number, k: number): void {
  for (const off of [-24, 24]) {
    g.lineStyle(5, dim(CRUMB_DARK, 0.4), 0.6 * k);
    g.lineBetween(c.x - r - 40, c.y + off, c.x + r + 40, c.y + off);
  }
  g.fillStyle(0x000000, 0.25 * k); g.fillRoundedRect(c.x - 60, c.y - 34, 120, 68, 8);
  g.lineStyle(2, VERDIGRA, 0.6 * k); g.strokeRoundedRect(c.x - 60, c.y - 34, 120, 68, 8);
}

export const FALLEN_PENNED: GimmickDef = {
  id: ID,
  rules: 'A pen of railed peppermint posts goes up round you: get out before the flagged last post. Strike a post to fell it. Pen Barley in his own gap.',
  make,
};
