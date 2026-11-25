import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, mulberry } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HUSH_DEEP, SLUSH, SNOW, SNOW_DEEP, SNOW_LIT, SNOW_SHADE, TRODDEN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Let It Lie — Wilhelmina Hoarley, Snow-Warden.
 *
 * A shovel scrapes; a broom hisses. So in the star's telling Hush does not clear its snow at all.
 * The snow-warden walks the yard to see that nobody does, and the snow lies where it falls, deeper
 * every hour, softer than any felt, until the whole court is buried in quiet.
 *
 * Snow falls the whole fight and **lies, deepening** (unevenly: it drifts deeper in some places
 * than others). **Deep snow slows you.** When the snow under a fighter **fills to the top** they are
 * **snowed in**: held, chilled, and left in a dug-out hollow. Nothing clears it but force: **every
 * shot in flight ploughs a furrow** through the snow it passes over, and **a dash ploughs one too**.
 * So you keep your own ground open with your shots and your feet, and leave Hoarley standing in the
 * deep. Past half, a blizzard comes in and the snow lies twice as fast.
 */

const SLUG = 'let-it-lie';
const CELL = 40;
const FALL = 0.05;
const BLIZZARD = 1.75;
const FULL = 0.97;
const WARN_AT = 0.8;
const BURY_DMG = 9;
const BURY_ROOT = 1300;
const BURY_CD = 2600;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cols = Math.ceil(W / CELL), rows = Math.ceil((H - top) / CELL);
  const depth = new Float32Array(cols * rows);
  const rate = new Float32Array(cols * rows);
  const seed = Math.floor(rng() * 1e6);
  // Drifts: the fall is uneven, deeper in long bands where the wind lays it.
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const band = Math.sin(c * 0.55 + r * 0.32 + seed) * 0.5 + 0.5;
    rate[i] = 0.55 + band * 0.75 + rng() * 0.15;
    depth[i] = 0.15 + rng() * 0.25;
  }
  let mult = 1;
  let half = false;
  const buriedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const flakes: { x: number; y: number; s: number }[] = Array.from({ length: 70 }, () => ({ x: rng() * W, y: top + rng() * (H - top), s: rng() }));

  const cellOf = (x: number, y: number): number => {
    const c = clamp(Math.floor(x / CELL), 0, cols - 1), r = clamp(Math.floor((y - top) / CELL), 0, rows - 1);
    return r * cols + c;
  };
  const at = (f: Fighter): number => depth[cellOf(f.x, f.y)];
  const centre = (i: number): Pt => ({ x: (i % cols) * CELL + CELL / 2, y: top + Math.floor(i / cols) * CELL + CELL / 2 });

  /** Plough a furrow at (x, y): the cell under it cleared, its neighbours pushed down. */
  function plough(x: number, y: number, hard: number): void {
    const c0 = Math.floor(x / CELL), r0 = Math.floor((y - top) / CELL);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = c0 + dc, r = r0 + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const i = r * cols + c;
      depth[i] = Math.max(0, depth[i] - (dr === 0 && dc === 0 ? hard : hard * 0.35));
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; mult = BLIZZARD; ctx.banner('A BLIZZARD COMES IN — THE SNOW LIES DEEP', '#eef2f6'); ctx.sfx('gust'); }
      for (let i = 0; i < depth.length; i++) depth[i] = Math.min(1, depth[i] + FALL * rate[i] * mult * dt);
      // Force is the only shovel: shots and dashes plough.
      for (const s of ctx.shotsNear(W / 2, (top + H) / 2, 1200)) plough(s.x, s.y, 0.9);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (ctx.dashing(f)) plough(f.x, f.y, 1);
        if (ctx.isAirborne(f) || at(f) < FULL || time - (buriedAt.get(f) ?? 0) < BURY_CD) continue;
        buriedAt.set(f, time);
        ctx.root(f, BURY_ROOT);
        ctx.hit(f, BURY_DMG, f.x, f.y);
        ctx.float(f.x, f.y - 52, 'SNOWED IN', '#eef2f6');
        ctx.sfx('status-freeze');
        // They dig themselves a hollow.
        plough(f.x, f.y, 0.65);
      }
      for (const fl of flakes) {
        fl.y += (26 + fl.s * 30) * mult * dt;
        fl.x += Math.sin(time / 900 + fl.s * 9) * 12 * dt + (half ? 50 * dt : 0);
        if (fl.y > H) { fl.y = top; fl.x = rng() * W; }
        if (fl.x > W) fl.x -= W;
      }
    },

    playerSpeedMult: () => 1 - at(player) * 0.5,
    npcSpeedMult: () => 1 - at(npc) * 0.5,

    npcSeek() {
      if (!alive(npc)) return null;
      const here = at(npc);
      if (here < 0.65) return null;
      // Wade for the nearest open ground, preferring ground toward you.
      const c0 = Math.floor(npc.x / CELL), r0 = Math.floor((npc.y - top) / CELL);
      let best: Pt | null = null, score = 1e9;
      for (let dr = -5; dr <= 5; dr++) for (let dc = -5; dc <= 5; dc++) {
        const c = c0 + dc, r = r0 + dr;
        if (c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1) continue;
        const i = r * cols + c;
        if (depth[i] > 0.4) continue;
        const p = centre(i);
        const s = dist(p.x, p.y, npc.x, npc.y) + dist(p.x, p.y, player.x, player.y) * 0.25 + depth[i] * 200;
        if (s < score) { score = s; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      const rng = mulberry(seed);
      for (let i = 0; i < depth.length; i++) {
        const p = centre(i);
        const d = depth[i];
        const jx = (rng() - 0.5) * 10, jy = (rng() - 0.5) * 8;
        if (d < 0.12) {
          // A ploughed furrow: bare trodden ground with slush in it.
          g.fillStyle(TRODDEN, 0.55); g.fillEllipse(p.x, p.y, CELL + 6, CELL * 0.8);
          g.fillStyle(SLUSH, 0.35); g.fillEllipse(p.x + jx * 0.4, p.y + jy * 0.4, CELL * 0.5, CELL * 0.3);
          continue;
        }
        // Lying snow: a soft heap, shadowed on its lower side, higher and whiter the deeper it is.
        const h = d * 12;
        const w = CELL * (0.9 + d * 0.5);
        g.fillStyle(SNOW_DEEP, 0.35 + d * 0.3); g.fillEllipse(p.x + jx, p.y + jy + 4, w, CELL * 0.75 + d * 8);
        g.fillStyle(SNOW_SHADE, 0.7); g.fillEllipse(p.x + jx, p.y + jy - h * 0.3, w * 0.92, CELL * 0.62 + d * 6);
        g.fillStyle(SNOW, 0.6 + d * 0.4); g.fillEllipse(p.x + jx - 2, p.y + jy - h * 0.6, w * 0.78, CELL * 0.5 + d * 4);
        if (d > 0.5) { g.fillStyle(SNOW_LIT, 0.8); g.fillEllipse(p.x + jx - 6, p.y + jy - h * 0.8, w * 0.3, 4); }
        // Nearly full: a cold blue rim — stand here and it will close over you.
        if (d >= WARN_AT) {
          const k = (d - WARN_AT) / (FULL - WARN_AT);
          g.lineStyle(1.5, HUSH_DEEP, 0.15 + k * 0.4 + Math.sin(time / 160 + i) * 0.08 * k);
          g.strokeEllipse(p.x + jx, p.y + jy - h * 0.3, w * 0.9, CELL * 0.6);
        }
      }
      // Fighters standing in deep snow: sunk to the shins, and a warning ring when it is near full.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = at(f);
        if (d < 0.3) continue;
        g.fillStyle(SNOW, 0.9); g.fillEllipse(f.x, f.y + 12, 34 + d * 16, 10 + d * 10);
        g.fillStyle(SNOW_SHADE, 0.8); g.fillEllipse(f.x, f.y + 16, 30 + d * 12, 6 + d * 6);
        if (d >= WARN_AT) { g.lineStyle(2.5, HUSH_DEEP, 0.4 + Math.sin(time / 90) * 0.3); g.strokeCircle(f.x, f.y - 4, 30); }
      }
    },

    drawAir(g, time) {
      // The fall itself — thicker and slanted in the blizzard.
      for (const fl of flakes) {
        const s = 1.2 + fl.s * 1.8;
        g.fillStyle(SNOW_LIT, 0.55 + fl.s * 0.35); g.fillCircle(fl.x, fl.y, s);
        if (half) { g.lineStyle(1, SNOW_LIT, 0.35); g.lineBetween(fl.x, fl.y, fl.x - 6, fl.y - 4); }
      }
      // Just snowed in: a crust of snow heaped over the fighter, cracking off.
      for (const f of [player, npc]) {
        const k = (time - (buriedAt.get(f) ?? -9999)) / BURY_ROOT;
        if (k < 0 || k > 1 || !alive(f)) continue;
        g.fillStyle(SNOW, 0.85 * (1 - k * 0.6)); g.fillEllipse(f.x, f.y - 6, 54, 50 * (1 - k * 0.5));
        g.fillStyle(SNOW_LIT, 0.7 * (1 - k)); g.fillEllipse(f.x - 8, f.y - 22, 22, 8);
        g.lineStyle(1.5, SNOW_DEEP, 0.7 * (1 - k)); g.lineBetween(f.x - 14, f.y - 10, f.x + 4, f.y - 2); g.lineBetween(f.x + 4, f.y - 2, f.x + 16, f.y - 14);
        glow(g, f.x, f.y - 10, 40, 0xdfeaf6, 0.05 * (1 - k), 2);
      }
    },

    drawHud(g) {
      // The snow under your feet, against the line where it closes over you.
      const d = alive(player) ? at(player) : 0;
      const x = W - 182, y = top + 16;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 8, y - 9, 168, 18, 8);
      g.fillStyle(d >= WARN_AT ? 0x9ec2e6 : SNOW, 1); g.fillRoundedRect(x, y - 4, 152 * d, 8, 4);
      g.fillStyle(HUSH_DEEP, 1); g.fillRect(x + 152 * FULL - 1, y - 7, 2, 14);
    },
  };
}

export const FALLEN_LET_IT_LIE: GimmickDef = {
  id: fallenId('hush', SLUG),
  rules: 'Snow lies and deepens: deep snow slows you, and where it fills you are snowed in. Every shot ploughs a furrow through it; so does a dash.',
  make,
};
