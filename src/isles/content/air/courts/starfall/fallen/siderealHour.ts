import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mulberry, type G } from '../../../../../art/IsleArt';
import { SF, alive, clamp, dist, inlayStar, star, P } from '../palette';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Sidereal Hour — Meridian-Keeper Tobias Wane, in the star's telling the man who kept the
 * summit's sky-clock and told the Prince's collectors which household stood under which hour.
 *
 * The floor is the great sidereal dial: hour-lines fanning from the pole star in the middle,
 * three rings of declination, a sky's worth of little inlaid stars — and the whole of it turns,
 * slowly, as the real sky turns. Wane calls cells of it by hour and ring: the called cells gild
 * over a slow count, *turning with the dial as they fill*, and then the starlight comes down on
 * them. So you do not dodge where a cell is, you dodge where it will be: step against the turn.
 *
 * The exploit is the pole star itself, the one fixed point: strike it and the next call is read
 * back against the caller — three cells round Wane instead of you. (When he strikes it, the clock
 * calls twice as wide.) At half, the hour turns: the dial reverses and doubles its speed, and
 * every call takes four cells. The bot steps out of its called cells toward where the dial will
 * have carried an uncalled one, and goes for the pole whenever it is lit and close.
 */

const ID = fallenId('starfall', 'sidereal-hour');
const HOURS = 12;
const RINGS = [44, 150, 258, 390];
const CALL_EVERY = 3000;
const GILD_MS = 1900;
const STRIKE_DMG = 22;
const POLE_R = 30;
const POLE_RECHARGE = 9000;

/** A cell of the dial by its hour (sector) and ring, in dial coordinates (they turn with it). */
interface Cell { hour: number; ring: number }
/** A call: cells gilding, and when the light comes down on them. */
interface Call { cells: Cell[]; at: number; fireAt: number; fired: boolean; against: 'player' | 'npc' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const SECTOR = (Math.PI * 2) / HOURS;
  let rot = 0;
  let omega = 0.12;
  let turned = false;
  let nextCall = -1;
  let calls: Call[] = [];
  let readBack: 'none' | 'player' | 'npc' = 'none';
  let poleLitAt = 0;
  let now = 0;
  let strikeFlash: { cells: Cell[]; at: number; rot: number } | null = null;

  /** Which cell a point falls in, given the dial's turn `r`. */
  const cellAt = (x: number, y: number, r: number): Cell | null => {
    const d = dist(x, y, cx, cy);
    // Standing on the pole is no refuge: its plate counts as the inner ring.
    let ring = d < RINGS[0] ? 0 : -1;
    for (let i = 0; i < RINGS.length - 1; i++) if (d >= RINGS[i] && d < RINGS[i + 1]) ring = i;
    if (d >= RINGS[RINGS.length - 1]) ring = RINGS.length - 2;
    if (ring < 0) return null;
    let a = Math.atan2(y - cy, x - cx) - r;
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return { hour: Math.floor(a / SECTOR) % HOURS, ring };
  };
  const same = (a: Cell, b: Cell): boolean => a.hour === b.hour && a.ring === b.ring;
  /** The dial's turn at a future moment. */
  const rotAt = (time: number): number => rot + omega * (time - now) / 1000;
  /** Centre of a cell at turn `r`. */
  const centre = (c: Cell, r: number): Pt => {
    const a = r + (c.hour + 0.5) * SECTOR;
    const d = (RINGS[c.ring] + Math.min(RINGS[c.ring + 1], 330)) / 2;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
  };
  const called = (f: Fighter, c: Call, r: number): boolean => {
    const cell = cellAt(f.x, f.y, r);
    return !!cell && c.cells.some((k) => same(k, cell));
  };

  let pole: StrikeTarget | null = null;
  const lightPole = (): void => {
    pole = ctx.target({
      x: cx, y: cy, r: POLE_R, passThrough: true,
      onStruck: (by) => {
        if (now < poleLitAt) return;
        readBack = by;
        poleLitAt = now + POLE_RECHARGE;
        ctx.sfx('clock-tick');
        ctx.float(cx, cy - 44, by === 'player' ? 'READ BACK' : 'WIDE CALL', '#ffe08a');
      },
    });
  };

  /** Call cells round a fighter: theirs, and its neighbours by hour and ring, where the dial will be. */
  function call(time: number): void {
    const n = turned ? 4 : 3;
    let against: Fighter = player;
    let count = n;
    if (readBack === 'player') against = npc;
    if (readBack === 'npc') count = n * 2;
    readBack = 'none';
    const fireAt = time + GILD_MS;
    // Aim at the cell the mark stands in now; the cell turns away with the dial, which is the read.
    const home = cellAt(against.x, against.y, rot) ?? { hour: Math.floor(rng() * HOURS), ring: 1 };
    const cells: Cell[] = [home];
    const offs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0], [1, -1], [-1, 1]];
    for (let i = offs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [offs[i], offs[j]] = [offs[j], offs[i]]; }
    for (const [dh, dr] of offs) {
      if (cells.length >= count) break;
      const ring = home.ring + dr;
      if (ring < 0 || ring > RINGS.length - 2) continue;
      const c = { hour: (home.hour + dh + HOURS) % HOURS, ring };
      if (!cells.some((k) => same(k, c))) cells.push(c);
    }
    calls.push({ cells, at: time, fireAt, fired: false, against: against === player ? 'player' : 'npc' });
    ctx.sfx('countdown-tick');
  }

  return {
    update(time, dt) {
      now = time;
      if (!pole) lightPole();
      if (nextCall < 0) nextCall = time + 1600;
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        omega = -0.22;
        ctx.banner('THE HOUR TURNS', '#ffe08a');
        ctx.sfx('time-warp');
      }
      rot += omega * dt;
      if (time >= nextCall) { nextCall = time + (turned ? CALL_EVERY - 400 : CALL_EVERY); call(time); }
      for (const c of calls) {
        if (c.fired || time < c.fireAt) continue;
        c.fired = true;
        strikeFlash = { cells: c.cells, at: time, rot };
        ctx.sfx('light-beam');
        for (const f of [player, npc]) if (alive(f) && called(f, c, rot)) ctx.hit(f, STRIKE_DMG, f.x, f.y);
      }
      calls = calls.filter((c) => !c.fired);
    },

    npcSeek() {
      // Out of any cell about to be lit — to where an uncalled cell will be when it fires.
      for (const c of calls) {
        const r = rotAt(c.fireAt);
        const mine = cellAt(npc.x, npc.y, r);
        if (!mine || !c.cells.some((k) => same(k, mine))) continue;
        let best: Pt | null = null, bd = Infinity;
        for (let h = 0; h < HOURS; h++) for (let ring = 0; ring < RINGS.length - 1; ring++) {
          const cell = { hour: h, ring };
          if (c.cells.some((k) => same(k, cell))) continue;
          const p = centre(cell, r);
          if (p.x < 60 || p.x > W - 60 || p.y < top + 50 || p.y > H - 50) continue;
          const d = dist(npc.x, npc.y, p.x, p.y);
          if (d < bd) { bd = d; best = p; }
        }
        return best;
      }
      // The pole is lit and near: go and strike it.
      if (now >= poleLitAt && dist(npc.x, npc.y, cx, cy) < 280) return { x: cx + 40, y: cy };
      return null;
    },

    drawGround(g, time) {
      drawDial(g, cx, cy, rot, W, H, top);
      for (const c of calls) {
        const k = clamp((time - c.at) / GILD_MS, 0, 1);
        for (const cell of c.cells) drawCell(g, cx, cy, cell, rot, k, c.against === 'npc');
      }
      if (strikeFlash) {
        const k = (time - strikeFlash.at) / 600;
        if (k >= 1) strikeFlash = null;
        else for (const cell of strikeFlash.cells) drawCell(g, cx, cy, cell, strikeFlash.rot, 1, false, 1 - k);
      }
      drawPole(g, cx, cy, time, now >= poleLitAt);
    },

    drawAir(g, time) {
      if (!strikeFlash) return;
      const k = (time - strikeFlash.at) / 600;
      if (k >= 1) return;
      // Shafts of starlight down onto the struck cells.
      for (const cell of strikeFlash.cells) {
        const p = centre(cell, strikeFlash.rot);
        g.fillStyle(SF.starHot, 0.35 * (1 - k)); g.fillTriangle(p.x - 26, p.y, p.x + 26, p.y, p.x + 8, top);
        g.fillStyle(SF.starGold, 0.25 * (1 - k)); g.fillTriangle(p.x - 12, p.y, p.x + 12, p.y, p.x + 4, top);
        star(g, p.x, p.y - 10, 20 * (1 - k) + 6, SF.starHot, 1 - k);
      }
    },

    drawHud(g) {
      // The sky-clock: a small face with its hand, the way it turns, and the pole's charge.
      const x = W - 60, y = top + 22;
      g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 20);
      g.lineStyle(2, SF.brass, 1); g.strokeCircle(x, y, 18);
      for (let i = 0; i < HOURS; i++) { const a = (i / HOURS) * Math.PI * 2; g.fillStyle(SF.silver, 0.8); g.fillCircle(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 1.2); }
      g.lineStyle(2.5, SF.starGold, 1); g.lineBetween(x, y, x + Math.cos(rot) * 13, y + Math.sin(rot) * 13);
      const dir = omega > 0 ? 1 : -1;
      g.lineStyle(2, SF.comet, 0.9); g.beginPath(); g.arc(x, y, 23, -1.2, 0.2, dir < 0); g.strokePath();
      const ex = x + Math.cos(dir > 0 ? 0.2 : -1.2) * 23, ey = y + Math.sin(dir > 0 ? 0.2 : -1.2) * 23;
      g.fillStyle(SF.comet, 1); g.fillCircle(ex, ey, 3);
      const charge = now >= poleLitAt ? 1 : 1 - (poleLitAt - now) / POLE_RECHARGE;
      inlayStar(g, x - 36, y, 7, charge >= 1 ? SF.starGold : SF.stoneDark, 1);
      g.fillStyle(SF.starGold, 0.8); g.fillRect(x - 44, y + 11, 16 * clamp(charge, 0, 1), 3);
    },

    destroy() { pole?.remove(); pole = null; calls = []; },
  };
}

/** Points along an annular sector (a dial cell). */
function sectorPts(cx: number, cy: number, a0: number, a1: number, r0: number, r1: number): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / n); pts.push(P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)); }
  return pts;
}

/** The sidereal dial: lapis rings, silver hour-lines, an inlaid sky turning with it. */
function drawDial(g: G, cx: number, cy: number, rot: number, W: number, H: number, top: number): void {
  const SECTOR = (Math.PI * 2) / HOURS;
  g.fillStyle(SF.lapisDeep, 0.75); g.fillCircle(cx, cy, RINGS[3] + 20);
  g.fillStyle(SF.lapis, 0.55); g.fillCircle(cx, cy, RINGS[2]);
  g.fillStyle(SF.lapisLit, 0.3); g.fillCircle(cx, cy, RINGS[1]);
  // The bezel: brass, ticked for every hour and quarter.
  g.lineStyle(6, SF.brassDark, 0.9); g.strokeCircle(cx, cy, RINGS[3] + 18);
  g.lineStyle(2, SF.brassLit, 0.7); g.strokeCircle(cx, cy, RINGS[3] + 20);
  for (let i = 0; i < HOURS * 4; i++) {
    const a = rot + (i / (HOURS * 4)) * Math.PI * 2, big = i % 4 === 0;
    const r0 = RINGS[3] + (big ? 8 : 13), r1 = RINGS[3] + 22;
    g.lineStyle(big ? 3 : 1.5, big ? SF.leaf : SF.brassLit, 0.9);
    g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  // Declination rings and hour-lines.
  g.lineStyle(1.5, SF.silver, 0.45);
  for (const r of RINGS.slice(0, 3)) g.strokeCircle(cx, cy, r);
  for (let h = 0; h < HOURS; h++) {
    const a = rot + h * SECTOR;
    g.lineStyle(h % 3 === 0 ? 2 : 1, SF.silver, h % 3 === 0 ? 0.55 : 0.3);
    g.lineBetween(cx + Math.cos(a) * RINGS[0], cy + Math.sin(a) * RINGS[0], cx + Math.cos(a) * (RINGS[3] + 4), cy + Math.sin(a) * (RINGS[3] + 4));
  }
  // The inlaid sky: the same stars every frame, carried round by the turn; a few joined as figures.
  const r = mulberry(4471);
  let prev: Pt | null = null;
  for (let i = 0; i < 70; i++) {
    const a = rot + r() * Math.PI * 2, d = RINGS[0] + 12 + r() * (RINGS[3] - RINGS[0] - 10), s = 1 + r() * 2.6;
    const p = { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
    if (p.y < top + 6 || p.y > H - 6 || p.x < 6 || p.x > W - 6) { prev = null; continue; }
    if (prev && i % 5 !== 0 && dist(prev.x, prev.y, p.x, p.y) < 130) { g.lineStyle(1, SF.leaf, 0.28); g.lineBetween(prev.x, prev.y, p.x, p.y); }
    inlayStar(g, p.x, p.y, s * 2, SF.leaf, 0.85, a);
    prev = p;
  }
}

/** A called cell: gold leaf laid over it as the count runs; `wave` brightens it as the light lands. */
function drawCell(g: G, cx: number, cy: number, c: Cell, rot: number, k: number, back: boolean, wave = 0): void {
  const SECTOR = (Math.PI * 2) / HOURS;
  const a0 = rot + c.hour * SECTOR, a1 = a0 + SECTOR;
  const r0 = RINGS[c.ring], r1 = RINGS[c.ring + 1];
  const tint = back ? SF.comet : SF.starGold;
  g.fillStyle(tint, 0.12 + k * 0.32 + wave * 0.4); g.fillPoints(sectorPts(cx, cy, a0, a1, r0, r1), true, true);
  // The leaf creeping in from the outer edge as the count runs.
  if (k < 1 && wave === 0) { g.fillStyle(tint, 0.35); g.fillPoints(sectorPts(cx, cy, a0, a1, r1 - (r1 - r0) * k, r1), true, true); }
  g.lineStyle(2 + wave * 3, wave > 0 ? SF.starHot : tint, 0.6 + k * 0.4);
  g.strokePoints(sectorPts(cx, cy, a0, a1, r0, r1), true, true);
}

/** The pole star at the dial's heart, on its brass gnomon — lit when it can be struck. */
function drawPole(g: G, cx: number, cy: number, time: number, lit: boolean): void {
  const t = time / 1000;
  g.fillStyle(SF.brassDark, 1); g.fillCircle(cx, cy, RINGS[0] - 2);
  g.fillStyle(SF.brass, 1); g.fillCircle(cx, cy, RINGS[0] - 7);
  g.lineStyle(1.5, SF.brassLit, 0.8); g.strokeCircle(cx, cy, RINGS[0] - 12);
  g.fillStyle(SF.stoneDeep, 1); g.fillCircle(cx, cy, 14);
  if (lit) {
    glow(g, cx, cy, 46, SF.starGold, 0.07, 4);
    star(g, cx, cy, 22 + Math.sin(t * 4) * 3, SF.starGold, 1);
  } else {
    star(g, cx, cy, 12, SF.stoneLit, 0.5);
  }
}

export const FALLEN_SIDEREAL_HOUR: GimmickDef = {
  id: ID,
  rules: 'The star-dial turns; called cells gild, turn with it, then light up. Strike the pole star: the next call lands round him. At half it spins back.',
  make,
};
