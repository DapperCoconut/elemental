import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import {
  CHERRY, GRAPE, ICING, LEMON, MINT, PINK_PALE, candyCane, dist, segDist, sideOf, taffy,
} from '../art';

/**
 * Taffy Pull — Puller Nougat's yard outside the Taffy Works.
 *
 * Candy-cane hooks stand round the yard, and Nougat throws strands of warm taffy between them —
 * pink, mint, lemon, grape. A strand is a wall that gives: run into one and it stretches round
 * you, slowing you as it goes, until it will stretch no further and *snaps you back* the way you
 * came, hard. Taffy is not fussy about what it throws you into. A fighter flung into the other
 * one hits them like a sack of sugar.
 *
 * Every strand tires: after three flings it tears and hangs in two limp halves from its hooks,
 * and Nougat strings a fresh one — always somewhere that cuts across your path.
 *
 * Nougat plays the slingshot. When you are standing behind him he backs into a strand to be shot
 * at you. Turn it round: let him chase you up against a strand with nothing behind you, or stand
 * him between yourself and the strand you are about to run at.
 */

const HOOKS_FRAC: [number, number][] = [
  [0.08, 0.12], [0.5, 0.06], [0.92, 0.12],
  [0.05, 0.52], [0.95, 0.52],
  [0.08, 0.92], [0.5, 0.96], [0.92, 0.92],
];
/** Hook pairs a strand may run between — each crosses open floor. */
const PAIRS: [number, number][] = [
  [0, 7], [2, 5], [1, 6], [3, 4], [0, 4], [2, 3], [3, 7], [4, 5], [1, 5], [1, 7], [0, 6], [2, 6], [1, 3], [1, 4],
];
const COLORS = [PINK_PALE, MINT, LEMON, GRAPE];

const MAX_STRANDS = 3;
const MAX_STRANDS_HARD = 4;
const STRING_MS = 700;
const RESTRING_MS = 6500;
const RESTRING_HARD_MS = 5200;
const BAND = 14;
const MAX_DEPTH = 72;
const MAX_HOLD_MS = 700;
const STRETCH_SPEED = 0.55;
const FLING_MS = 300;
const FLING_BASE = 110;
const FLING_PER_DEPTH = 2.3;
const FLING_MAX = 320;
const THWACK = 4;
const SLING_DAMAGE = 14;
const SLING_HARD_DAMAGE = 17;
const SLING_R = 44;
const TEAR_AFTER = 3;

interface Strand {
  a: number; b: number;
  color: number;
  bornAt: number;
  flings: number;
  torn: number;
  /** Per-fighter side memory: +1 / −1 of the line, or 0 if not yet known. */
  side: Map<Fighter, number>;
}

interface Catch { strand: Strand; f: Fighter; entrySide: number; at: number; depth: number }
interface Fling { f: Fighter; vx: number; vy: number; until: number; slung: boolean; from: Pt }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const field = H - top;
  const hooks: Pt[] = HOOKS_FRAC.map(([fx, fy]) => ({ x: W * fx, y: top + 26 + (field - 52) * fy }));
  const maxStrands = ctx.hard ? MAX_STRANDS_HARD : MAX_STRANDS;
  const restringMs = ctx.hard ? RESTRING_HARD_MS : RESTRING_MS;
  const slingDamage = ctx.hard ? SLING_HARD_DAMAGE : SLING_DAMAGE;

  let strands: Strand[] = [];
  let torn: { a: Pt; b: Pt; color: number; at: number }[] = [];
  const catches = new Map<Fighter, Catch>();
  const flings = new Map<Fighter, Fling>();
  let nextString = 2600;
  let colorIdx = 0;
  let announced = false;

  const live = (s: Strand, time: number): boolean => time - s.bornAt >= STRING_MS;
  const other = (f: Fighter): Fighter => (f === ctx.player ? ctx.npc : ctx.player);
  const foot = (f: Fighter): Pt => ({ x: f.x, y: f.y + 12 });

  const addStrand = (a: number, b: number, time: number): void => {
    strands.push({ a, b, color: COLORS[colorIdx++ % COLORS.length], bornAt: time, flings: 0, torn: 0, side: new Map() });
    ctx.sfx('snap-back');
  };
  // Two strands are already up at the bell.
  addStrand(PAIRS[0][0], PAIRS[0][1], -STRING_MS);
  addStrand(PAIRS[3][0], PAIRS[3][1], -STRING_MS);

  /** A new pair — one that cuts between the fighters, or close across the player. */
  const pickPair = (): [number, number] | null => {
    const used = new Set(strands.map((s) => `${s.a}-${s.b}`));
    const p = ctx.player, n = ctx.npc;
    let best: [number, number] | null = null, bestScore = -Infinity;
    for (const [a, b] of PAIRS) {
      if (used.has(`${a}-${b}`)) continue;
      const A = hooks[a], B = hooks[b];
      const between = sideOf(p.x, p.y, A.x, A.y, B.x, B.y) !== sideOf(n.x, n.y, A.x, A.y, B.x, B.y);
      const near = segDist(p.x, p.y, A.x, A.y, B.x, B.y);
      const score = (between ? 260 : 0) - Math.abs(near - 90) * 0.6 + rng() * 140;
      if (score > bestScore) { bestScore = score; best = [a, b]; }
    }
    return best;
  };

  const tear = (s: Strand, time: number): void => {
    torn.push({ a: hooks[s.a], b: hooks[s.b], color: s.color, at: time });
    strands = strands.filter((q) => q !== s);
    for (const [f, c] of catches) if (c.strand === s) catches.delete(f);
    ctx.sfx('snap-back');
    const A = hooks[s.a], B = hooks[s.b];
    ctx.float((A.x + B.x) / 2, (A.y + B.y) / 2 - 30, 'TORN', '#ffd0e0');
    nextString = Math.min(nextString, time + 900);
  };

  const release = (c: Catch, time: number): void => {
    catches.delete(c.f);
    const s = c.strand;
    if (c.depth < 22) return;
    const A = hooks[s.a], B = hooks[s.b];
    const len = dist(A.x, A.y, B.x, B.y) || 1;
    // The normal pointing back to the side they came from.
    let nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
    if (sideOf(A.x + nx * 10, A.y + ny * 10, A.x, A.y, B.x, B.y) !== c.entrySide) { nx = -nx; ny = -ny; }
    const d = Math.min(FLING_MAX, FLING_BASE + c.depth * FLING_PER_DEPTH);
    const v = d / (FLING_MS / 1000);
    flings.set(c.f, { f: c.f, vx: nx * v, vy: ny * v, until: time + FLING_MS, slung: false, from: { x: c.f.x, y: c.f.y } });
    s.side.set(c.f, c.entrySide);
    ctx.hit(c.f, THWACK, c.f.x, c.f.y);
    ctx.sfx('boing');
    ctx.float(c.f.x, c.f.y - 46, 'SNAP!', '#ffb8de');
    s.flings++;
    if (s.flings >= TEAR_AFTER) tear(s, time);
  };

  const track = (f: Fighter, time: number, dt: number): void => {
    if (!f.active || f.hp <= 0) return;
    const fl = flings.get(f);
    if (fl) {
      // In flight: carried by the snap; slam into the other fighter if they are in the way.
      ctx.nudge(f, fl.vx * dt, fl.vy * dt);
      const o = other(f);
      if (!fl.slung && o.active && o.hp > 0 && dist(f.x, f.y, o.x, o.y) < SLING_R) {
        fl.slung = true;
        ctx.hit(o, slingDamage, o.x, o.y);
        const sp = Math.hypot(fl.vx, fl.vy) || 1;
        ctx.nudge(o, (fl.vx / sp) * 50, (fl.vy / sp) * 50);
        ctx.sfx('hit-heavy');
        ctx.float(o.x, o.y - 50, f === ctx.player ? 'SLINGSHOT!' : 'SLUNG INTO YOU', f === ctx.player ? '#ffd27a' : '#ff9a9a');
        ctx.scene.cameras.main.shake(120, 0.005);
      }
      if (time >= fl.until) flings.delete(f);
      return;
    }
    const p = foot(f);
    const held = catches.get(f);
    if (held) {
      const s = held.strand;
      const A = hooks[s.a], B = hooks[s.b];
      const sd = sideOf(p.x, p.y, A.x, A.y, B.x, B.y);
      const off = segDist(p.x, p.y, A.x, A.y, B.x, B.y);
      held.depth = sd === held.entrySide ? -off : off;
      if (held.depth < -BAND) { catches.delete(f); return; }
      if (held.depth > MAX_DEPTH || time - held.at > MAX_HOLD_MS) release(held, time);
      return;
    }
    for (const s of strands) {
      if (!live(s, time)) continue;
      const A = hooks[s.a], B = hooks[s.b];
      const sd = sideOf(p.x, p.y, A.x, A.y, B.x, B.y);
      const off = segDist(p.x, p.y, A.x, A.y, B.x, B.y);
      const prev = s.side.get(f) ?? 0;
      // Within the strand's reach — not past its hooks.
      const len = dist(A.x, A.y, B.x, B.y) || 1;
      const along = ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / len;
      const inside = along > 16 && along < len - 16;
      if (inside && off < BAND && prev !== 0) {
        catches.set(f, { strand: s, f, entrySide: prev, at: time, depth: 0 });
        return;
      }
      if (off > BAND || !inside) s.side.set(f, sd);
      else if (prev === 0) s.side.set(f, sd);
    }
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('PULL!', '#ffd0e8'); }
      // Nougat strings a new strand on a clock (or straight after one tears).
      if (time >= nextString) {
        nextString = time + restringMs;
        const pair = pickPair();
        if (pair) {
          if (strands.length >= maxStrands) {
            const old = strands.reduce((m, s) => (s.bornAt < m.bornAt ? s : m), strands[0]);
            tear(old, time);
            nextString = time + restringMs;
          }
          addStrand(pair[0], pair[1], time);
          const A = hooks[pair[0]];
          ctx.float(A.x, A.y - 50, 'STRINGING', '#ffe0f0');
        }
      }
      track(ctx.player, time, dt);
      track(ctx.npc, time, dt);
      torn = torn.filter((t) => time - t.at < 1400);
    },

    playerSpeedMult: () => (catches.has(ctx.player) ? STRETCH_SPEED : 1),
    npcSpeedMult: () => (catches.has(ctx.npc) ? STRETCH_SPEED : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      if (flings.has(n) || catches.has(n)) return null;
      // The slingshot: the player stands behind him, a strand lies ahead of him — back into it.
      for (const s of strands) {
        if (!live(s, now)) continue;
        const A = hooks[s.a], B = hooks[s.b];
        const sn = sideOf(n.x, n.y, A.x, A.y, B.x, B.y);
        if (sn !== sideOf(p.x, p.y, A.x, A.y, B.x, B.y)) continue;
        const dn = segDist(n.x, n.y + 12, A.x, A.y, B.x, B.y), dp = segDist(p.x, p.y + 12, A.x, A.y, B.x, B.y);
        if (dn > 220 || dp < dn + 60 || dp > dn + 340) continue;
        // Continue the line from the player through him on to the strand.
        const ux = n.x - p.x, uy = n.y - p.y, l = Math.hypot(ux, uy) || 1;
        return { x: n.x + (ux / l) * (dn + 60), y: n.y + (uy / l) * (dn + 60) };
      }
      return null;
    },

    drawGround(g, time) {
      // Each strand's shadow on the floor, and a pale strip of sugar where it will catch you.
      for (const s of strands) {
        const A = hooks[s.a], B = hooks[s.b];
        const k = Math.min(1, (time - s.bornAt) / STRING_MS);
        const ex = A.x + (B.x - A.x) * k, ey = A.y + (B.y - A.y) * k;
        g.lineStyle(BAND * 2, s.color, live(s, time) ? 0.1 : 0.05); g.lineBetween(A.x, A.y, ex, ey);
        g.lineStyle(3, 0x000000, 0.14); g.lineBetween(A.x, A.y + 3, ex, ey + 3);
      }
      // A fling throws up a smear of sugar along the floor.
      for (const fl of flings.values()) {
        g.lineStyle(6, ICING, 0.25); g.lineBetween(fl.from.x, fl.from.y + 12, fl.f.x, fl.f.y + 12);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const lift = 26;
      for (const s of strands) {
        const A = { x: hooks[s.a].x, y: hooks[s.a].y - lift }, B = { x: hooks[s.b].x, y: hooks[s.b].y - lift };
        const k = Math.min(1, (time - s.bornAt) / STRING_MS);
        if (k < 1) {
          // Being thrown: a blob of taffy flying from hook to hook, trailing its strand.
          const ex = { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k - Math.sin(k * Math.PI) * 40 };
          taffy(g, A, ex, null, 5, s.color, ICING, 0.9, t * 30);
          g.fillStyle(s.color, 1); g.fillCircle(ex.x, ex.y, 7);
          continue;
        }
        // A caught fighter bows the strand round them.
        let bow: Pt | null = null;
        for (const c of catches.values()) {
          if (c.strand === s && c.depth > 0) bow = { x: c.f.x, y: c.f.y - 10 };
        }
        const sag = Math.sin(t * 2 + s.a) * 3 + 8;
        const mid = bow ?? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + sag };
        const wear = s.flings / TEAR_AFTER;
        taffy(g, A, B, mid, 7 - wear * 2.5, s.color, ICING, 0.95, 0);
        if (wear > 0) {
          // Strings of pulled sugar where it is wearing thin.
          for (let i = 0; i < s.flings * 2; i++) {
            const f = 0.3 + i * 0.09;
            const px = A.x + (B.x - A.x) * f, py = A.y + (B.y - A.y) * f + sag * Math.sin(f * Math.PI);
            g.lineStyle(1, dim(s.color, 0.2), 0.8); g.lineBetween(px, py, px + Math.sin(t * 3 + i) * 3, py + 9);
          }
        }
      }
      // Torn strands hang from their hooks and drip away.
      for (const tr of torn) {
        const k = (time - tr.at) / 1400;
        for (const [P, Q] of [[tr.a, tr.b], [tr.b, tr.a]] as [Pt, Pt][]) {
          const end = { x: P.x + (Q.x - P.x) * 0.22, y: P.y - lift + 40 + k * 30 };
          taffy(g, { x: P.x, y: P.y - lift }, end, { x: (P.x + end.x) / 2 + 6, y: (P.y - lift + end.y) / 2 + 10 }, 5, tr.color, ICING, 1 - k, 0);
        }
      }
      // The hooks.
      hooks.forEach((h, i) => candyCane(g, h.x, h.y, 44, h.x < W / 2 ? 1 : -1, i % 2 ? MINT : CHERRY, 5));
      // Flung fighters wear a squash of motion lines.
      for (const fl of flings.values()) {
        const sp = Math.hypot(fl.vx, fl.vy) || 1;
        const ux = fl.vx / sp, uy = fl.vy / sp;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2, ICING, 0.7);
          g.lineBetween(fl.f.x - ux * (20 + i * 8) + uy * (i - 1) * 9, fl.f.y - uy * (20 + i * 8) - ux * (i - 1) * 9,
            fl.f.x - ux * (36 + i * 10) + uy * (i - 1) * 9, fl.f.y - uy * (36 + i * 10) - ux * (i - 1) * 9);
        }
      }
    },
  };
}

export const TAFFY_PULL: GimmickDef = {
  id: 'confection-taffy-pull',
  rules: 'Run into a taffy strand and it stretches, then SNAPS you back the way you came. Get flung into your foe and they take the hit.',
  make,
};
