import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { foamEdge, shells, tideStaff } from '../art';
import {
  BUOY, FOAM, PAINT_CREAM, SAND, SAND_DARK, SAND_LIT, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, WEED,
} from '../palette';
import { alive, clamp, dist, stepDt, swell } from '../util';

/**
 * High Water Mark — Tidecaller Marisol.
 *
 * The tide comes in up the flats from the sea edge (the bottom of the arena), stands at the
 * painted mark, and goes back out — on a clock you can read off the tide-staffs on both walls
 * and the gauge in the corner. Wading slows you; Marisol swims, so the water *speeds her up*.
 * Two shell banks stand above the water at every tide.
 *
 * At the top of each flood a breaker runs along the waterline: the foam goes white, then it
 * slams whoever is standing in the surf — Marisol included. On the ebb the sea leaves a few
 * puddles behind, and when there is no water near her Marisol is *stranded*: slow, gasping,
 * and taking more from every hit.
 *
 * The bot plays the water (`npcSeek`): at the flood she stays in it, close to you; at low water
 * she runs for the last puddles. The read is the clock — fight her on the banks at high tide,
 * and on the open sand when the sea is out.
 */

const PERIOD_MS = 19000;
/** Fractions of the cycle: low slack, flood, high slack, ebb. */
const LOW_END = 0.16;
const FLOOD_END = 0.48;
const HIGH_END = 0.64;
const WADE_MULT = 0.66;
const SWIM_MULT = 1.38;
const STRAND_MS = 1300;
const SURF_BAND = 46;
const SURF_DMG = 12;

interface Bank { x: number; y: number; rx: number; ry: number }
interface Puddle { x: number; y: number; r: number; until: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const period = ctx.hard ? 16000 : PERIOD_MS;
  const banks: Bank[] = [
    { x: W * 0.27, y: top + (H - top) * 0.52, rx: ctx.hard ? 74 : 92, ry: ctx.hard ? 36 : 44 },
    { x: W * 0.73, y: top + (H - top) * 0.66, rx: ctx.hard ? 74 : 92, ry: ctx.hard ? 36 : 44 },
  ];
  const puddles: Puddle[] = [];
  let t0 = -1;
  let lastPhase = '';
  let surfAt = 0;
  let surfDone = true;
  let nDry = 0;
  let stranded = false;
  let surfFx = 0;
  /** Water front as a y for a given x. Lower `level` → nearer the sea edge. */
  const lowest = H - 26;
  const highest = top + 110;
  let level = 0;
  let time = 0;

  const frontY = (x: number, tm = time): number =>
    lowest - level * (lowest - highest) + Math.sin(x * 0.021 + tm / 700) * 7 + Math.sin(x * 0.057 - tm / 420) * 3;

  const onBank = (p: Pt): boolean => banks.some((b) => ((p.x - b.x) / b.rx) ** 2 + ((p.y - b.y) / b.ry) ** 2 < 1);
  const inSea = (f: Fighter): boolean => f.y > frontY(f.x) && !onBank(f);
  const inPuddle = (f: Fighter): boolean => puddles.some((p) => dist(f.x, f.y, p.x, p.y) < p.r);
  const wet = (f: Fighter): boolean => inSea(f) || inPuddle(f);

  function phaseOf(k: number): 'low' | 'flood' | 'high' | 'ebb' {
    if (k < LOW_END) return 'low';
    if (k < FLOOD_END) return 'flood';
    if (k < HIGH_END) return 'high';
    return 'ebb';
  }

  function levelOf(k: number): number {
    if (k < LOW_END) return 0;
    if (k < FLOOD_END) return swell((k - LOW_END) / (FLOOD_END - LOW_END) / 2);
    if (k < HIGH_END) return 1;
    return 1 - swell((k - HIGH_END) / (1 - HIGH_END) / 2);
  }

  function leavePuddles(tm: number): void {
    puddles.length = 0;
    const n = ctx.hard ? 2 : 3;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 10; tries++) {
        const p = { x: 90 + rng() * (W - 180), y: top + (H - top) * (0.45 + rng() * 0.45) };
        if (onBank(p) || puddles.some((q) => dist(q.x, q.y, p.x, p.y) < 140)) continue;
        puddles.push({ ...p, r: 36 + rng() * 10, until: tm + period * 0.34, seed: rng() * 10 });
        break;
      }
    }
  }

  return {
    update(tm, dtRaw) {
      const dt = stepDt(dtRaw);
      time = tm;
      if (t0 < 0) t0 = tm;
      const k = ((tm - t0) % period) / period;
      level = levelOf(k);
      const ph = phaseOf(k);
      if (ph !== lastPhase) {
        if (ph === 'flood') { ctx.banner('THE FLOOD', '#a6cfc6'); ctx.sfx('water-jet'); }
        if (ph === 'high') {
          ctx.banner('HIGH WATER', '#eef6f0');
          surfAt = tm + 1100;
          surfDone = false;
          ctx.sfx('countdown-tick');
        }
        if (ph === 'ebb') { ctx.banner('THE EBB', '#d6cbb2'); leavePuddles(tm); ctx.sfx('splash'); }
        lastPhase = ph;
      }
      // The high-water breaker along the waterline.
      if (!surfDone && tm >= surfAt) {
        surfDone = true;
        surfFx = tm;
        ctx.sfx('geyser');
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          if (Math.abs(f.y - frontY(f.x)) < SURF_BAND && !onBank(f)) {
            ctx.hit(f, ctx.hard ? SURF_DMG + 4 : SURF_DMG, f.x, f.y);
            ctx.nudge(f, 0, -40);
            ctx.float(f.x, f.y - 40, 'BREAKER', '#eef6f0');
          }
        }
      }
      for (let i = puddles.length - 1; i >= 0; i--) if (tm > puddles[i].until) puddles.splice(i, 1);
      // Stranding.
      if (alive(npc) && !wet(npc)) nDry += dt * 1000; else nDry = 0;
      const was = stranded;
      stranded = nDry > STRAND_MS;
      if (stranded && !was) { ctx.float(npc.x, npc.y - 46, 'STRANDED', '#e2d1ab'); ctx.sfx('status-debuff'); }
    },

    playerSpeedMult: () => (alive(player) && wet(player) ? WADE_MULT : 1),
    npcSpeedMult: () => (alive(npc) && wet(npc) ? SWIM_MULT : stranded ? 0.84 : 1),
    npcTakenMult: () => (stranded ? 1.25 : 1),

    npcSeek() {
      // At the flood: in the water, close to you, never on a bank.
      if (level > 0.25) {
        const y = Math.max(frontY(player.x) + 50, Math.min(H - 50, player.y + 40));
        return { x: clamp(player.x + (npc.x < player.x ? -110 : 110), 60, W - 60), y: clamp(y, top + 60, H - 50) };
      }
      // Low water: the nearest puddle, or the sea edge itself.
      let best: Puddle | null = null;
      let bd = Infinity;
      for (const p of puddles) {
        const d = dist(npc.x, npc.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) return { x: best.x, y: best.y };
      return { x: clamp(npc.x, 80, W - 80), y: H - 40 };
    },

    drawGround(g, tm) {
      // Shell banks first: the sea laps round them.
      for (const b of banks) drawBank(g, b, ctx.hard);
      // Puddles left by the ebb.
      for (const p of puddles) {
        const fade = clamp((p.until - tm) / 1500, 0, 1);
        g.fillStyle(SEA_DEEP, 0.75 * fade); g.fillEllipse(p.x, p.y, p.r * 2.1, p.r * 1.3);
        g.fillStyle(SEA_SHALLOW, 0.6 * fade); g.fillEllipse(p.x - 3, p.y - 2, p.r * 1.7, p.r * 0.9);
        const rk = ((tm / 900 + p.seed) % 1);
        g.lineStyle(1.2, SEA_LIT, 0.6 * (1 - rk) * fade); g.strokeEllipse(p.x, p.y, p.r * rk * 1.8, p.r * rk);
      }
      drawSea(g, W, H, highest, frontY, level, tm, banks, !surfDone && tm > surfAt - 1100 ? 1 - (surfAt - tm) / 1100 : 0);
      // Wading rings round whoever is in the water.
      for (const f of [player, npc]) {
        if (!alive(f) || !wet(f)) continue;
        const r = (tm / 500) % 1;
        g.lineStyle(1.5, FOAM, 0.6 * (1 - r)); g.strokeEllipse(f.x, f.y + 14, 30 + r * 30, 10 + r * 8);
        if (f === npc) {
          // Marisol swims: a wake behind her.
          g.fillStyle(FOAM, 0.35); g.fillEllipse(f.x, f.y + 16, 46, 10);
        }
      }
      // The breaker's slam: a white sheet up the waterline.
      if (surfFx && tm - surfFx < 650) {
        const k = (tm - surfFx) / 650;
        g.fillStyle(FOAM, 0.55 * (1 - k));
        g.beginPath();
        g.moveTo(0, frontY(0) - SURF_BAND * (1 - k * 0.5));
        for (let x = 0; x <= W; x += 16) g.lineTo(x, frontY(x) - SURF_BAND * (1 - k * 0.5) - Math.sin(x * 0.05) * 6);
        for (let x = W; x >= 0; x -= 16) g.lineTo(x, frontY(x) + SURF_BAND);
        g.closePath(); g.fillPath();
      }
    },

    drawAir(g, tm) {
      // A gasping Marisol: little drops off her head while she is stranded.
      if (stranded && alive(npc)) {
        for (let i = 0; i < 3; i++) {
          const k = ((tm / 600) + i / 3) % 1;
          g.fillStyle(SEA_LIT, 0.8 * (1 - k)); g.fillCircle(npc.x - 10 + i * 10, npc.y - 40 - k * 16, 2.5);
        }
      }
    },

    drawHud(g, tm) {
      // A tide-staff gauge in the top-left: water level, and which way it is going.
      const x = 22, y0 = top + 14, h = 110;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 10, y0 - 8, 44, h + 16, 6);
      for (let i = 0; i < 10; i++) { g.fillStyle(i % 2 ? PAINT_CREAM : BUOY, 1); g.fillRect(x, y0 + i * (h / 10), 8, h / 10); }
      g.fillStyle(SEA, 0.8); g.fillRect(x - 2, y0 + h * (1 - level), 12, h * level);
      g.lineStyle(2, FOAM, 0.9); g.lineBetween(x - 4, y0 + h * (1 - level), x + 12, y0 + h * (1 - level));
      const k = t0 < 0 ? 0 : ((tm - t0) % period) / period;
      const ph = phaseOf(k);
      g.fillStyle(FOAM, 0.9);
      if (ph === 'flood') g.fillTriangle(x + 20, y0 + 30, x + 28, y0 + 30, x + 24, y0 + 20);
      else if (ph === 'ebb') g.fillTriangle(x + 20, y0 + 20, x + 28, y0 + 20, x + 24, y0 + 30);
      else g.fillRect(x + 19, y0 + 24, 10, 3);
      if (stranded) { g.fillStyle(SAND_LIT, 0.95); g.fillCircle(x + 24, y0 + h - 6, 5); }
    },
  };
}

function drawBank(g: Phaser.GameObjects.Graphics, b: Bank, hard: boolean): void {
  g.fillStyle(SAND_DARK, 1); g.fillEllipse(b.x, b.y + 4, b.rx * 2 + 12, b.ry * 2 + 10);
  g.fillStyle(SAND, 1); g.fillEllipse(b.x, b.y, b.rx * 2, b.ry * 2);
  g.fillStyle(SAND_LIT, 0.6); g.fillEllipse(b.x - b.rx * 0.2, b.y - b.ry * 0.3, b.rx * 1.1, b.ry * 0.7);
  // Shell crust, seeded off the bank's own position so it never shimmers.
  let s = Math.floor(b.x * 13 + b.y * 7);
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  shells(g, { x: b.x - b.rx * 0.8, y: b.y - b.ry * 0.6, w: b.rx * 1.6, h: b.ry * 1.2 }, hard ? 18 : 26, r);
  tideStaff(g, b.x + b.rx * 0.45, b.y - 2, 46);
  g.fillStyle(WEED, 0.6); g.fillEllipse(b.x - b.rx * 0.6, b.y + b.ry * 0.6, 18, 5);
}

function drawSea(
  g: Phaser.GameObjects.Graphics, W: number, H: number, markY: number, front: (x: number, tm?: number) => number, level: number,
  tm: number, banks: Bank[], surfWarn: number,
): void {
  // The sheet: deep at the sea edge, shallow at the front.
  const bands: [number, number, number][] = [[0, SEA_SHALLOW, 0.62], [22, SEA, 0.66], [80, SEA_DEEP, 0.62]];
  for (const [off, c, a] of bands) {
    g.fillStyle(c, a);
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, Math.min(H, front(x) + off * (0.4 + level)));
    g.lineTo(W, H);
    g.closePath(); g.fillPath();
  }
  // Light lines drifting up the sheet.
  for (let i = 0; i < 9; i++) {
    const x = ((i * 113 + tm / 18) % (W + 80)) - 40;
    const y0 = front(x) + 20 + ((i * 47) % 160);
    if (y0 > H - 6) continue;
    g.lineStyle(1.2, SEA_LIT, 0.4); g.lineBetween(x, y0, x + 26, y0 - 2);
  }
  // Round each bank: a ring of foam where the sea meets the sand.
  for (const b of banks) {
    if (b.y + b.ry < front(b.x) - 4) continue;
    g.lineStyle(2, FOAM, 0.55 + Math.sin(tm / 300) * 0.15); g.strokeEllipse(b.x, b.y, b.rx * 2 + 8, b.ry * 2 + 6);
  }
  // The lip of foam; it goes bright white in the second before a breaker.
  const w = 3 + surfWarn * 5;
  foamEdge(g, 0, W, (x) => front(x), w, 0.6 + surfWarn * 0.4);
  if (surfWarn > 0.6 && Math.floor(tm / 90) % 2 === 0) {
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginPath(); g.moveTo(0, front(0) - 30);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, front(x) - 30);
    g.strokePath();
  }
  // The painted mark on the side walls: where the sea will stop.
  g.lineStyle(2, dim(BUOY, 0.1), 0.7);
  for (let x = 30; x < W - 30; x += 28) g.lineBetween(x, markY - 8, x + 14, markY - 8);
  for (const sx of [14, W - 14]) tideStaff(g, sx, H - 16, H - markY + 40);
}

export const HIGH_WATER: GimmickDef = {
  id: 'tidewater-high-water',
  rules: 'The tide floods in and ebbs out. Wading slows you; Marisol swims faster. High water breaks along the waterline. Caught dry, she is stranded.',
  make,
};
