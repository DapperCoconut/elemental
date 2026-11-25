import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { shadow, type G } from '../../../../../art/IsleArt';
import { LAWN_DARK, LAWN_DEEP, LAWN_LIT, STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Heavy Roller — Groundsman Abel Stroud, who in the King's telling rolled the lawns flat over
 * the beds of households that came up short, so there would be nothing left to weigh next year.
 *
 * A stone lawn roller as wide as a path works the lawn the way a groundsman does: straight across
 * one stripe, a step over, and back along the next, so the floor fills with light and dark bands
 * behind it. The stripe it is on and the one it will turn into are marked. Whoever it runs over is
 * flattened — stunned, hurt — and it rolls on. Strike it and it turns round on the spot and rolls
 * back the way it came, faster for a moment: so you can send it back down the stripe at Stroud.
 *
 * From half, his boy brings out the second roller, and it works the lawn the other way — down the
 * columns — so the two cross.
 */

const ID = fallenId('bloom', 'heavy-roller');
const HALF_W = 44;
const DRUM_HALF = 30;
const SPEED = 150;
const STEP = 112;
const HIT_GAP = 1100;

interface Roller {
  axis: 'x' | 'y';
  /** Position along the travel axis and across it (the stripe's centre). */
  along: number; lane: number; dir: number; laneDir: number;
  stepping: number; stepFrom: number; boostUntil: number;
  t: StrikeTarget; hitAt: Map<Fighter, number>; mown: number[]; turnAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const minLane = (r: Roller) => (r.axis === 'x' ? top + HALF_W + 6 : HALF_W + 6);
  const maxLane = (r: Roller) => (r.axis === 'x' ? H - HALF_W - 6 : W - HALF_W - 6);
  const span = (r: Roller) => (r.axis === 'x' ? [40, W - 40] : [top + 40, H - 40]);
  const pos = (r: Roller) => (r.axis === 'x' ? { x: r.along, y: r.lane } : { x: r.lane, y: r.along });
  const rollers: Roller[] = [];
  let turned = false;

  function addRoller(axis: 'x' | 'y', along: number, lane: number): void {
    // The drum is built after its strike handle, which only reads it once struck.
    let r: Roller;
    const start = axis === 'x' ? { x: along, y: lane } : { x: lane, y: along };
    const t = ctx.target({
      x: start.x, y: start.y, r: 40,
      onStruck: () => {
        const now = tk.now;
        if (now - r.turnAt < 450) return;
        r.turnAt = now;
        r.dir = -r.dir;
        r.boostUntil = now + 1500;
        ctx.sfx('stone-slam');
        const q = pos(r);
        ctx.float(q.x, q.y - 50, 'TURNED', '#e6dfcd');
      },
    });
    r = { axis, along, lane, dir: 1, laneDir: 1, stepping: 0, stepFrom: lane, boostUntil: 0, t, hitAt: new Map(), mown: [], turnAt: 0 };
    rollers.push(r);
  }

  /** Inside the drum's footprint (its width across the stripe, its depth along). */
  function under(r: Roller, f: Fighter): boolean {
    const p = pos(r);
    const da = Math.abs((r.axis === 'x' ? f.x : f.y) - (r.axis === 'x' ? p.x : p.y));
    const dl = Math.abs((r.axis === 'x' ? f.y : f.x) - (r.axis === 'x' ? p.y : p.x));
    return da < DRUM_HALF + 18 && dl < HALF_W + 14;
  }

  return {
    update(time, dtS) {
      const dt = stepDt(dtS);
      if (!rollers.length) addRoller('x', 60, top + HALF_W + 6);
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        addRoller('y', H - 50, W - HALF_W - 6);
        rollers[1].dir = -1; rollers[1].laneDir = -1;
        ctx.banner('THE SECOND ROLLER', '#e6dfcd');
        ctx.sfx('quake');
      }
      for (const r of rollers) {
        if (r.stepping > 0) {
          // A step over into the next stripe.
          r.stepping = Math.max(0, r.stepping - dt / 0.8);
          r.lane = r.stepFrom + (1 - r.stepping) * STEP * r.laneDir;
        } else {
          const v = SPEED * (time < r.boostUntil ? 1.6 : 1);
          r.along += r.dir * v * dt;
          const [a0, a1] = span(r);
          if (r.along > a1 || r.along < a0) {
            r.along = clamp(r.along, a0, a1);
            r.dir = -r.dir;
            if (r.mown.length > 5) r.mown.shift();
            r.mown.push(r.lane);
            let nl = r.lane + STEP * r.laneDir;
            if (nl > maxLane(r) || nl < minLane(r)) { r.laneDir = -r.laneDir; nl = r.lane + STEP * r.laneDir; }
            r.stepFrom = r.lane;
            r.stepping = 1;
            ctx.sfx('gear-turn');
          }
        }
        const p = pos(r);
        r.t.moveTo(p.x, p.y);
        for (const f of [player, npc]) {
          if (!alive(f) || !under(r, f) || time - (r.hitAt.get(f) ?? -1e9) < HIT_GAP) continue;
          r.hitAt.set(f, time);
          if (f === player) { tk.hitPlayer(14, f.x, f.y); tk.stun(600); }
          else { ctx.hit(npc, 24, f.x, f.y); ctx.stun(npc, 700); ctx.float(f.x, f.y - 56, 'ROLLED FLAT', '#e6dfcd'); }
          // Squeezed out to the side of the drum.
          const side = (r.axis === 'x' ? f.y - p.y : f.x - p.x) >= 0 ? 1 : -1;
          if (r.axis === 'x') ctx.nudge(f, 0, side * (HALF_W + 30)); else ctx.nudge(f, side * (HALF_W + 30), 0);
          ctx.sfx('stone-slam');
        }
      }
    },

    npcSeek() {
      for (const r of rollers) {
        const p = pos(r);
        const ahead = (r.axis === 'x' ? npc.x - p.x : npc.y - p.y) * r.dir;
        const off = r.axis === 'x' ? npc.y - p.y : npc.x - p.x;
        if (ahead > -40 && ahead < 340 && Math.abs(off) < HALF_W + 50) {
          // Out of the stripe, to whichever side he already leans (away from the next stripe if dead centre).
          const s = Math.abs(off) > 4 ? Math.sign(off) : -r.laneDir;
          const lanePos = r.axis === 'x' ? p.y : p.x;
          const out = lanePos + s * (HALF_W + 90);
          return r.axis === 'x' ? { x: npc.x, y: tk.clampY(out) } : { x: tk.clampX(out), y: npc.y };
        }
      }
      // Herd you: stand on the far side of you from the drum's stripe, so stepping away from him is stepping in.
      const r = rollers[0];
      if (!r || !alive(player)) return null;
      const p = pos(r);
      if (r.axis === 'x' && Math.abs(player.y - p.y) < 160 && (player.x - p.x) * r.dir > 0) {
        const s = player.y > p.y ? 1 : -1;
        return { x: tk.clampX(player.x + r.dir * 60), y: tk.clampY(player.y + s * 120) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const r of rollers) {
        // Stripes it has already rolled: flattened, the grass laid over.
        for (let i = 0; i < r.mown.length; i++) drawStripe(g, r, r.mown[i], W, H, top, i % 2 ? LAWN_LIT : LAWN_DARK, 0.28);
        drawStripe(g, r, r.lane, W, H, top, LAWN_DEEP, 0.18);
        // The next stripe, chalked.
        const nl = r.lane + STEP * r.laneDir;
        const next = nl > maxLane(r) || nl < minLane(r) ? r.lane - STEP * r.laneDir : nl;
        g.lineStyle(2, 0xf4f0e6, 0.25 + Math.sin(time / 200) * 0.1);
        for (const e of [-1, 1]) {
          const c = next + e * HALF_W;
          for (let k = 0; k < 24; k++) {
            const a = (r.axis === 'x' ? 0 : top) + k * ((r.axis === 'x' ? W : H - top) / 24);
            if (r.axis === 'x') g.lineBetween(a, c, a + 14, c); else g.lineBetween(c, a, c, a + 14);
          }
        }
        // Chevrons ahead of the drum on its stripe.
        const p = pos(r);
        for (let k = 1; k <= 4; k++) {
          const d = k * 52 + ((time / 8) % 52);
          const cx = r.axis === 'x' ? p.x + r.dir * d : p.x, cy = r.axis === 'x' ? p.y : p.y + r.dir * d;
          const ux = r.axis === 'x' ? r.dir : 0, uy = r.axis === 'x' ? 0 : r.dir;
          g.lineStyle(3, 0xf4f0e6, 0.4 * (1 - k / 5));
          g.lineBetween(cx - ux * 8 - uy * 16, cy - uy * 8 - ux * 16, cx + ux * 8, cy + uy * 8);
          g.lineBetween(cx - ux * 8 + uy * 16, cy - uy * 8 + ux * 16, cx + ux * 8, cy + uy * 8);
        }
      }
    },

    drawAir(g, time) {
      for (const r of rollers) drawRoller(g, r, pos(r), time);
    },

    drawHud(g) {
      // One pip per roller, its arrow showing which way it rolls.
      rollers.forEach((r, i) => {
        const x = W / 2 - 20 + i * 40, y = top + 16;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 16, y - 11, 32, 22, 5);
        g.fillStyle(STONE, 1); g.fillRoundedRect(x - 10, y - 6, 20, 12, 3);
        g.fillStyle(STONE_LIT, 1);
        if (r.axis === 'x') g.fillTriangle(x + r.dir * 13, y, x + r.dir * 6, y - 5, x + r.dir * 6, y + 5);
        else g.fillTriangle(x, y + r.dir * 13, x - 5, y + r.dir * 6, x + 5, y + r.dir * 6);
      });
    },

    destroy() { for (const r of rollers) r.t.remove(); },
  };
}

/** One rolled stripe of lawn, full width or full height. */
function drawStripe(g: G, r: Roller, lane: number, W: number, H: number, top: number, color: number, a: number): void {
  g.fillStyle(color, a);
  if (r.axis === 'x') g.fillRect(0, lane - HALF_W, W, HALF_W * 2);
  else g.fillRect(lane - HALF_W, top, HALF_W * 2, H - top);
}

/** The roller: a ribbed stone drum in an iron-strapped oak frame, its long handle trailing behind. */
function drawRoller(g: G, r: Roller, p: { x: number; y: number }, time: number): void {
  const ax = r.axis === 'x';
  const spin = (r.along / 14) % 1;
  shadow(g, p.x, p.y + 6, ax ? DRUM_HALF * 2.4 : HALF_W * 2.4, ax ? HALF_W * 1.1 : DRUM_HALF * 1.2, 0.4);
  // The handle trails behind the drum.
  const hx = ax ? p.x - r.dir * 80 : p.x, hy = ax ? p.y : p.y - r.dir * 80;
  g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(p.x, p.y - 20, hx, hy - 34);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(p.x, p.y - 21, hx, hy - 35);
  g.lineStyle(4, TIMBER_DARK, 1);
  if (ax) g.lineBetween(hx, hy - 46, hx, hy - 22); else g.lineBetween(hx - 12, hy - 34, hx + 12, hy - 34);
  // Drum body: viewed side-on along x, end-on along y.
  const w = ax ? DRUM_HALF * 2 : HALF_W * 2, h = ax ? HALF_W * 2 : DRUM_HALF * 2;
  const x0 = p.x - w / 2, y0 = p.y - h / 2 - 20;
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(x0, y0, w, h, 10);
  g.fillStyle(STONE, 1); g.fillRoundedRect(x0 + 3, y0 + 3, w - 6, h * 0.55, 8);
  g.fillStyle(STONE_LIT, 0.6); g.fillRect(x0 + 6, y0 + 6, w - 12, 4);
  // Ribs that turn with it.
  for (let k = 0; k < 5; k++) {
    const f = (k / 5 + spin) % 1;
    g.lineStyle(2, STONE_DARK, 0.4 + Math.sin(f * Math.PI) * 0.5);
    if (ax) { const yy = y0 + 4 + f * (h - 8); g.lineBetween(x0 + 3, yy, x0 + w - 3, yy); }
    else { const xx = x0 + 4 + f * (w - 8); g.lineBetween(xx, y0 + 3, xx, y0 + h - 3); }
  }
  // The oak frame and its iron axle caps.
  g.lineStyle(5, TIMBER_DARK, 1); g.strokeRoundedRect(x0 - 4, y0 - 4, w + 8, h + 8, 12);
  g.lineStyle(2, TIMBER_LIT, 1); g.strokeRoundedRect(x0 - 3, y0 - 3, w + 6, h + 6, 12);
  for (const s of [-1, 1]) {
    const cx = ax ? p.x : p.x + s * (HALF_W + 3), cy = ax ? p.y - 20 + s * (HALF_W + 3) : p.y - 20;
    g.fillStyle(0x3a3a3c, 1); g.fillCircle(cx, cy, 6);
    g.fillStyle(0x6a6a6e, 1); g.fillCircle(cx - 1, cy - 1, 2.5);
  }
  // Grass clippings thrown up off the front.
  for (let i = 0; i < 6; i++) {
    const ph = (time / 300 + i * 0.17) % 1;
    const fx = ax ? p.x + r.dir * (DRUM_HALF + 6 + ph * 18) : p.x - HALF_W + i * 16;
    const fy = ax ? p.y - HALF_W + i * 16 : p.y + r.dir * (DRUM_HALF + 6 + ph * 18);
    g.fillStyle(LAWN_LIT, 0.8 * (1 - ph)); g.fillRect(fx, fy - ph * 14, 3, 2);
  }
}

export const FALLEN_HEAVY_ROLLER: GimmickDef = {
  id: ID,
  rules: 'A stone roller mows the lawn stripe by stripe and flattens whoever it meets. Strike it to turn it back down the stripe. At half, a second.',
  make,
};
