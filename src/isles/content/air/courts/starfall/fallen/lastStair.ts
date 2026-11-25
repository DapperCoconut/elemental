import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mulberry, type G } from '../../../../../art/IsleArt';
import { SF, alive, breathBottle, clamp, dist } from '../palette';
import { fallenId } from '../../../../meteor/spec';

/**
 * Down the Last Stair — Stair-Sergeant Rosalind Crake, in the star's telling the collectors'
 * sergeant on the Last Stair, who saw every crate of corked breath up the final flight to the Lung
 * and every debtor who tried to climb after it back down.
 *
 * The fight is on the stair itself: five broad moonstone steps climbing north to the gate. The
 * higher fighter has the stair: whoever stands on a lower step than the other takes 30% more.
 * But the crates come down from the top. A collectors' crate teeters on the chute's lip (its
 * fall-line is marked down the flight), then tumbles, step by step; each step it lands on, it
 * strikes whoever stands in its column on that step and knocks them a step down. So the high
 * ground is where the crates start — hold it and dodge sideways, or give it up.
 *
 * The exploit: strike a crate as it tumbles and the bottles inside burst in a gust of stolen
 * breath that bowls everyone near it a step down the stair — throw Crake off her step. At half the
 * chute runs free: crates in pairs, falling faster. The bot climbs to the step above yours and
 * steps out of any column a crate is about to land in.
 */

const ID = fallenId('starfall', 'last-stair');
const STEPS = 5;
const TEETER_MS = 1100;
const STEP_MS = 300;
const COL_HALF = 46;
const CRATE_DMG = 14;
const BURST_R = 110;
const BURST_DMG = 10;
const LOW = 1.3;

/** A crate on its way down: its column, the step it last landed on, and its strike handle. */
interface Crate { x: number; at: number; fallAt: number; step: number; target: StrikeTarget | null; seed: number; done: boolean }
/** A burst crate, for the art. */
interface Burst { x: number; y: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const stepH = (H - top) / STEPS;
  const stepOf = (y: number): number => clamp(Math.floor((y - top) / stepH), 0, STEPS - 1);
  const midY = (s: number): number => top + stepH * (s + 0.5);
  const crates: Crate[] = [];
  const bursts: Burst[] = [];
  let nextDrop = -1;
  let free = false;
  let now = 0;

  const stepMs = (): number => (free ? 240 : STEP_MS);
  /** Where a crate is drawn: on the lip while it teeters, then bouncing from step to step. */
  const crateAt = (c: Crate, time: number): { x: number; y: number; hop: number } => {
    if (time < c.fallAt) return { x: c.x + Math.sin(time / 40) * 2, y: top + 24, hop: 0 };
    const k = clamp(((time - c.fallAt) % stepMs()) / stepMs(), 0, 1);
    const s = Math.min(c.step + 1, STEPS);
    const y0 = c.step < 0 ? top + 24 : midY(c.step), y1 = s >= STEPS ? H + 30 : midY(s);
    return { x: c.x, y: y0 + (y1 - y0) * k, hop: Math.sin(k * Math.PI) * 22 };
  };

  /** Knock a fighter a step down the stair. */
  const knockDown = (f: Fighter): void => { if (stepOf(f.y) < STEPS - 1) ctx.nudge(f, 0, stepH); };

  /** A struck crate bursts: the corked breath bowls everyone near it a step down. */
  function burst(c: Crate): void {
    if (c.done) return;
    const p = crateAt(c, now);
    c.done = true;
    c.target?.remove(); c.target = null;
    bursts.push({ x: p.x, y: p.y, at: now, seed: c.seed });
    ctx.sfx('gust');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, p.x, p.y) > BURST_R) continue;
      ctx.hit(f, BURST_DMG, f.x, f.y);
      knockDown(f);
    }
  }

  function drop(x: number, time: number): void {
    const c: Crate = { x: clamp(x, 70, W - 70), at: time, fallAt: time + tk.warn(TEETER_MS), step: -1, target: null, seed: Math.floor(rng() * 1e6), done: false };
    c.target = ctx.target({ x: c.x, y: top + 24, r: 30, onStruck: () => { if (now >= c.fallAt) burst(c); } });
    crates.push(c);
    ctx.sfx('gear-turn');
  }

  return {
    update(time) {
      now = time;
      if (nextDrop < 0) nextDrop = time + 1400;
      if (!free && npc.hp < npc.maxHp * 0.5) {
        free = true;
        ctx.banner('THE CHUTE RUNS FREE', '#e8dcc0');
        ctx.sfx('engine');
      }
      if (time >= nextDrop) {
        nextDrop = time + (free ? 2300 : 2400);
        // Mostly down your column; once free, a second crate a gap away.
        const x = rng() < 0.7 ? player.x + (rng() - 0.5) * 60 : 90 + rng() * (W - 180);
        drop(x, time);
        if (free) drop(x + (x < W / 2 ? 1 : -1) * (180 + rng() * 120), time);
      }
      for (const c of crates) {
        if (c.done) continue;
        if (time < c.fallAt) continue;
        const landed = Math.floor((time - c.fallAt) / stepMs());
        while (c.step < landed && !c.done) {
          c.step++;
          if (c.step >= STEPS) { c.done = true; c.target?.remove(); c.target = null; bursts.push({ x: c.x, y: H - 20, at: time, seed: c.seed }); ctx.sfx('crystal-shatter'); break; }
          ctx.sfx('drum-hit');
          for (const f of [player, npc]) {
            if (!alive(f) || stepOf(f.y) !== c.step || Math.abs(f.x - c.x) > COL_HALF) continue;
            ctx.hit(f, CRATE_DMG, f.x, f.y);
            knockDown(f);
          }
        }
        const p = crateAt(c, time);
        c.target?.moveTo(p.x, p.y - p.hop);
      }
      for (let i = crates.length - 1; i >= 0; i--) if (crates[i].done) crates.splice(i, 1);
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 800) bursts.splice(i, 1);
    },

    playerTakenMult: () => (stepOf(npc.y) < stepOf(player.y) ? LOW : 1),
    npcTakenMult: () => (stepOf(player.y) < stepOf(npc.y) ? LOW : 1),

    npcSeek() {
      const want = Math.max(0, stepOf(player.y) - 1);
      // A column a crate will land in on that step soon is no place to stand.
      const risky = (x: number): number => crates.reduce((n, c) => n + (Math.abs(x - c.x) < COL_HALF + 30 && c.step < want ? 1 : 0), 0);
      let bx = npc.x, bs = risky(npc.x) * 1000 + Math.abs(npc.x - player.x) * 0.2;
      for (const dx of [-150, -80, 80, 150, -240, 240]) {
        const x = clamp(player.x + dx, 70, W - 70);
        const s = risky(x) * 1000 + Math.abs(x - npc.x) * 0.3;
        if (s < bs) { bs = s; bx = x; }
      }
      return { x: bx, y: midY(want) };
    },

    drawGround(g, time) {
      drawStair(g, W, H, top, stepH);
      // Each live crate's fall-line, chevrons down the flight from the lip.
      for (const c of crates) {
        const k = time < c.fallAt ? clamp((time - c.at) / Math.max(1, c.fallAt - c.at), 0, 1) : 1;
        for (let s = Math.max(0, c.step + 1); s < STEPS; s++) {
          const y = midY(s);
          const a = 0.2 + k * 0.45;
          g.fillStyle(SF.giant, a * 0.35); g.fillRect(c.x - COL_HALF, y - stepH / 2 + 4, COL_HALF * 2, stepH - 8);
          g.lineStyle(3, SF.giantLit, a); g.lineBetween(c.x - 16, y - 8, c.x, y + 4); g.lineBetween(c.x, y + 4, c.x + 16, y - 8);
        }
      }
      for (const b of bursts) {
        const k = clamp((time - b.at) / 800, 0, 1);
        g.lineStyle(3, 0x9ad6c6, 0.6 * (1 - k)); g.strokeCircle(b.x, b.y, 20 + k * BURST_R);
        const rr = mulberry(b.seed);
        for (let i = 0; i < 14; i++) {
          const a = rr() * Math.PI * 2, d = 10 + k * BURST_R * (0.4 + rr() * 0.6);
          g.fillStyle(0x1f3a32, 1 - k); g.fillTriangle(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, b.x + Math.cos(a) * d + 5, b.y + Math.sin(a) * d + 2, b.x + Math.cos(a) * d + 1, b.y + Math.sin(a) * d + 6);
        }
      }
    },

    drawAir(g, time) {
      for (const c of crates) {
        const p = crateAt(c, time);
        const teeter = time < c.fallAt ? Math.sin(time / 60) * 0.12 : (time - c.fallAt) / 120;
        drawCrate(g, p.x, p.y - p.hop, p.hop, teeter);
      }
      for (const b of bursts) {
        const k = clamp((time - b.at) / 800, 0, 1);
        // The freed breath: pale curls going up and out.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k;
          const x = b.x + Math.cos(a) * k * 70, y = b.y + Math.sin(a) * k * 40 - k * 30;
          g.lineStyle(3, 0xd8f0ea, 0.6 * (1 - k)); g.beginPath(); g.arc(x, y, 8 + k * 6, a, a + 3.4); g.strokePath();
        }
      }
    },

    drawHud(g) {
      // A little side-on stair, with who stands on which step.
      const x = 18, y = top + 8, sw = 14, sh = 5;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 4, y - 4, sw * STEPS + 12, sh * STEPS + 18, 6);
      for (let i = 0; i < STEPS; i++) {
        g.fillStyle(i === 0 ? SF.stoneLit : SF.stone, 1);
        g.fillRect(x + i * sw, y + i * sh, sw * STEPS - i * sw, sh);
      }
      const mark = (f: Fighter, col: number): void => {
        const s = stepOf(f.y);
        g.fillStyle(col, 1); g.fillCircle(x + s * sw + 5 + (f === npc ? 7 : 0), y + s * sh - 3, 3.5);
      };
      mark(player, SF.comet); mark(npc, 0xffa040);
    },

    destroy() { for (const c of crates) c.target?.remove(); crates.length = 0; },
  };
}

/** The Last Stair from above: five broad treads, bright nosings, deep risers, brass rails, the gate. */
function drawStair(g: G, W: number, H: number, top: number, stepH: number): void {
  for (let s = 0; s < STEPS; s++) {
    const y = top + s * stepH;
    const tread = lit(SF.stoneMid, 0.22 - s * 0.05);
    g.fillStyle(tread, 1); g.fillRect(0, y, W, stepH);
    // Worn hollow down the middle where the collectors climb.
    g.fillStyle(dim(tread, 0.12), 0.8); g.fillEllipse(W / 2, y + stepH * 0.55, W * 0.28, stepH * 0.5);
    const r = mulberry(300 + s);
    for (let i = 0; i < 26; i++) { g.fillStyle(r() < 0.5 ? SF.stoneLit : SF.stoneDark, 0.3); g.fillCircle(r() * W, y + 6 + r() * (stepH - 20), 1 + r() * 2); }
    // Joint lines between the slabs.
    g.lineStyle(1, SF.stoneDeep, 0.4);
    for (let x = (s % 2) * 60; x < W; x += 120) g.lineBetween(x, y + 2, x, y + stepH - 14);
    // The riser's shadow, then the lit nosing of the step below's edge.
    g.fillStyle(SF.stoneDeep, 0.85); g.fillRect(0, y + stepH - 12, W, 12);
    g.fillStyle(SF.stoneLit, 0.9); g.fillRect(0, y + stepH - 13, W, 2.5);
    g.fillStyle(SF.brass, 0.5); g.fillRect(0, y + stepH - 10, W, 1.5);
  }
  // The chute's lip at the top: a brass rail and the stacked crates waiting behind it.
  g.fillStyle(SF.palace, 1); g.fillRect(0, top, W, 10);
  g.lineStyle(3, SF.brass, 1); g.lineBetween(0, top + 10, W, top + 10);
  for (let x = 30; x < W; x += 90) { g.fillStyle(SF.brassDark, 1); g.fillRect(x - 2, top, 4, 12); }
  // The balustrades down each side.
  for (const x of [10, W - 10]) {
    g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 8, top, 16, H - top);
    g.lineStyle(3, SF.brass, 0.9); g.lineBetween(x, top, x, H);
    for (let y = top + 20; y < H; y += 46) { g.fillStyle(SF.brassLit, 0.9); g.fillCircle(x, y, 3.5); }
  }
  glow(g, W / 2, top + 6, 220, SF.starGold, 0.025, 3);
}

/** A collectors' crate: planks, brass corner-bands, a lid of corked breath-bottles. */
function drawCrate(g: G, x: number, y: number, hop: number, spin: number): void {
  g.fillStyle(0x000000, 0.3 - hop * 0.008); g.fillEllipse(x, y + hop + 18, 60 - hop * 0.6, 14);
  const s = 26, wob = Math.sin(spin) * 5;
  g.fillStyle(0x5a3a22, 1); g.fillRect(x - s, y - s + wob * 0.3, s * 2, s * 2);
  g.fillStyle(0x7a5232, 1);
  for (let i = 0; i < 3; i++) g.fillRect(x - s + 3, y - s + 3 + i * 17 + wob * 0.3, s * 2 - 6, 13);
  g.lineStyle(1, 0x3a2414, 1);
  for (let i = 0; i < 3; i++) g.lineBetween(x - s + 3, y - s + 16 + i * 17 + wob * 0.3, x + s - 3, y - s + 16 + i * 17 + wob * 0.3);
  g.fillStyle(SF.brass, 1);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(x + dx * s - (dx > 0 ? 8 : 0), y + dy * s - (dy > 0 ? 8 : 0) + wob * 0.3, 8, 8);
  g.lineStyle(2, SF.brassDark, 1); g.strokeRect(x - s, y - s + wob * 0.3, s * 2, s * 2);
  // Bottles standing in the open top, corks sealed with the King's red wax.
  for (let i = 0; i < 3; i++) breathBottle(g, x - 14 + i * 14, y - s + 6 + wob * 0.3, 7, 0.8);
}

export const FALLEN_LAST_STAIR: GimmickDef = {
  id: ID,
  rules: 'Whoever stands lower takes more. Crates tumble down from the top, knocking you a step down. Strike one as it falls: its breath bowls her off her step.',
  make,
};
