import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import {
  BRASS, HAZARD_YELLOW, IRON, IRON_DARK, IRON_LIT, REDLINE, RIVET, clamp, frameClock, hazardStripes, rivets,
} from '../util';

/**
 * Conveyor Floor — Foreman Brindle's shop floor is five coal belts, alternating direction,
 * that carry both fighters whether they like it or not. Each belt ends in a toothed crusher
 * roller on its *downstream* side, which chews anyone the belt delivers to it. Iron freight
 * crates ride the belts too and shove whoever they run into.
 *
 * On the klaxon every belt reverses — the crushers swap ends. The beacon spins up and the
 * chevrons strobe amber for a beat first, so a player who is watching can be standing on a
 * belt that is *about* to carry the foreman into the teeth. Brindle reads the belts too: the
 * bot steps off a lane that is feeding him to a crusher.
 */

interface Crate { lane: number; x: number; hitP: boolean; hitN: boolean; spin: number }

const LANES = 5;
const CRUSH_W = 66;
const CRATE_R = 18;

function makeConveyor(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const laneH = (H - top) / LANES;
  const speed = hard ? 86 : 68;
  const periodMs = hard ? 6200 : 7600;
  const warnMs = 1800;
  const crushDmg = hard ? 9 : 7;
  const tick = frameClock();

  /** +1 carries right, −1 carries left. Lane 0 starts carrying left. */
  let flip = 1;
  const laneDir = (i: number): number => (i % 2 === 0 ? -1 : 1) * flip;
  const laneOf = (y: number): number => clamp(Math.floor((y - top) / laneH), 0, LANES - 1);
  const laneMid = (i: number): number => top + laneH * (i + 0.5);

  const travel: number[] = new Array(LANES).fill(0);
  let nextKlaxon = ctx.scene.time.now + periodMs;
  let lastCrushP = 0;
  let lastCrushN = 0;
  let nextCrate = ctx.scene.time.now + 1800;
  const crates: Crate[] = [];
  const debris: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  /** Is this point in the live crusher mouth of its lane? */
  const inCrusher = (x: number, y: number): boolean => {
    const d = laneDir(laneOf(y));
    return d > 0 ? x > W - CRUSH_W : x < CRUSH_W;
  };

  const carry = (f: Fighter, dt: number): void => {
    if (!alive(f)) return;
    ctx.nudge(f, laneDir(laneOf(f.y)) * speed * dt, 0);
  };

  const crush = (f: Fighter, time: number, isPlayer: boolean): void => {
    if (!alive(f) || !inCrusher(f.x, f.y)) return;
    const last = isPlayer ? lastCrushP : lastCrushN;
    if (time - last < 520) return;
    if (isPlayer) lastCrushP = time; else lastCrushN = time;
    ctx.hit(f, crushDmg, f.x, f.y);
    ctx.sfx('anvil');
    // Spat back out onto the belt, slightly.
    ctx.nudge(f, -laneDir(laneOf(f.y)) * 26, 0);
    for (let i = 0; i < 5; i++) debris.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.6 });
    if (!isPlayer) ctx.float(f.x, f.y - 34, 'CRUSHED', '#ffd27a');
  };

  return {
    update(time) {
      const dt = tick(time);
      for (let i = 0; i < LANES; i++) travel[i] += laneDir(i) * speed * dt;

      carry(ctx.player, dt);
      carry(ctx.npc, dt);
      crush(ctx.player, time, true);
      crush(ctx.npc, time, false);

      // Klaxon — reverse every belt.
      if (time >= nextKlaxon) {
        flip = -flip;
        nextKlaxon = time + periodMs;
        ctx.banner('KLAXON — BELTS REVERSED', '#ffd23a');
        ctx.sfx('train-horn');
      }

      // Freight.
      if (time >= nextCrate) {
        nextCrate = time + (hard ? 1700 : 2300);
        const lane = Math.floor(ctx.rng() * LANES);
        const d = laneDir(lane);
        crates.push({ lane, x: d > 0 ? CRUSH_W - 10 : W - CRUSH_W + 10, hitP: false, hitN: false, spin: 0 });
      }
      for (const c of crates) {
        const d = laneDir(c.lane);
        c.x += d * speed * 1.05 * dt;
        const cy = laneMid(c.lane);
        for (const [f, isP] of [[ctx.player, true], [ctx.npc, false]] as [Fighter, boolean][]) {
          if (!alive(f)) continue;
          if (Math.abs(f.x - c.x) < CRATE_R + 18 && Math.abs(f.y - cy) < CRATE_R + 16) {
            ctx.nudge(f, d * 150 * dt, 0);
            const struck = isP ? c.hitP : c.hitN;
            if (!struck) {
              if (isP) c.hitP = true; else c.hitN = true;
              ctx.hit(f, 5, f.x, f.y);
              ctx.sfx('clang');
            }
          }
        }
      }
      for (let i = crates.length - 1; i >= 0; i--) {
        const c = crates[i];
        const d = laneDir(c.lane);
        if ((d > 0 && c.x > W - CRUSH_W + 14) || (d < 0 && c.x < CRUSH_W - 14)) {
          for (let k = 0; k < 7; k++) debris.push({ x: c.x, y: laneMid(c.lane), vx: (Math.random() - 0.5) * 220, vy: -80 - Math.random() * 140, life: 0.7 });
          crates.splice(i, 1);
        } else if (c.x < -40 || c.x > W + 40) crates.splice(i, 1);
      }
      for (const b of debris) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 420 * dt; b.life -= dt; }
      for (let i = debris.length - 1; i >= 0; i--) if (debris[i].life <= 0) debris.splice(i, 1);
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const lane = laneOf(n.y);
      const d = laneDir(lane);
      const toTeeth = d > 0 ? W - CRUSH_W - n.x : n.x - CRUSH_W;
      const soon = nextKlaxon - ctx.scene.time.now < warnMs;
      // Being delivered to the teeth (or about to be, when the klaxon flips it): get off.
      if (toTeeth < 150 || (soon && (d > 0 ? n.x < 170 : n.x > W - 170))) {
        const other = lane > 0 && laneDir(lane - 1) !== d ? lane - 1 : Math.min(LANES - 1, lane + 1);
        return { x: clamp(n.x - d * 120, 120, W - 120), y: laneMid(other) };
      }
      return null;
    },

    drawGround(g, time) {
      const soon = nextKlaxon - time < warnMs;
      const strobe = soon && Math.floor(time / 140) % 2 === 0;
      for (let i = 0; i < LANES; i++) {
        const y0 = top + laneH * i;
        const d = laneDir(i);
        // Belt bed.
        g.fillStyle(0x161414, 1); g.fillRect(0, y0 + 4, W, laneH - 8);
        // Moving slats.
        const off = ((travel[i] % 28) + 28) % 28;
        for (let x = -28 + off; x < W + 28; x += 28) {
          g.fillStyle(0x2b2724, 1); g.fillRect(x, y0 + 8, 22, laneH - 16);
          g.fillStyle(0x3a3530, 1); g.fillRect(x, y0 + 8, 22, 3);
        }
        // Chevrons pointing downstream.
        const coff = ((travel[i] % 120) + 120) % 120;
        for (let x = -120 + coff; x < W + 120; x += 120) {
          const cy = y0 + laneH / 2;
          g.lineStyle(5, strobe ? HAZARD_YELLOW : dim(HAZARD_YELLOW, 0.35), strobe ? 0.9 : 0.55);
          g.lineBetween(x - d * 12, cy - 16, x + d * 8, cy);
          g.lineBetween(x + d * 8, cy, x - d * 12, cy + 16);
        }
        // Steel rail between lanes.
        g.fillStyle(IRON, 1); g.fillRect(0, y0, W, 6);
        g.fillStyle(IRON_LIT, 1); g.fillRect(0, y0, W, 2);
        rivets(g, { x: 10, y: y0 + 3 }, { x: W - 10, y: y0 + 3 }, 40, 1.4, RIVET);

        // Crushers: downstream end has live teeth, upstream end a dumb feed roller.
        for (const side of [-1, 1]) {
          const live = side === d;
          const x0 = side > 0 ? W - CRUSH_W : 0;
          g.fillStyle(IRON_DARK, 1); g.fillRect(x0, y0 + 4, CRUSH_W, laneH - 8);
          if (live) {
            g.fillStyle(REDLINE, 0.15 + 0.1 * Math.sin(time / 90)); g.fillRect(x0, y0 + 4, CRUSH_W, laneH - 8);
            const rx = side > 0 ? W - CRUSH_W / 2 : CRUSH_W / 2;
            const turn = time / 120 * side;
            // Toothed roller seen from above: a drum with teeth marching.
            g.fillStyle(0x4a4e55, 1); g.fillRect(rx - 18, y0 + 10, 36, laneH - 20);
            for (let k = 0; k < 7; k++) {
              const ty = y0 + 12 + (((k * 14 + turn * 10) % (laneH - 24)) + (laneH - 24)) % (laneH - 24);
              g.fillStyle(lit(0x4a4e55, 0.3), 1);
              g.fillTriangle(rx - 18, ty, rx - 27, ty + 5, rx - 18, ty + 10);
              g.fillTriangle(rx + 18, ty, rx + 27, ty + 5, rx + 18, ty + 10);
            }
            g.fillStyle(lit(0x4a4e55, 0.18), 1); g.fillRect(rx - 18, y0 + 10, 6, laneH - 20);
          } else {
            const rx = side > 0 ? W - CRUSH_W / 2 : CRUSH_W / 2;
            g.fillStyle(0x3a3f45, 1); g.fillRoundedRect(rx - 14, y0 + 12, 28, laneH - 24, 12);
            g.fillStyle(IRON_LIT, 0.6); g.fillRect(rx - 10, y0 + 14, 4, laneH - 28);
          }
        }
      }
      g.fillStyle(IRON, 1); g.fillRect(0, H - 6, W, 6);
      hazardStripes(g, { x: CRUSH_W - 4, y: top, w: 4, h: H - top }, 0.7, 10);
      hazardStripes(g, { x: W - CRUSH_W, y: top, w: 4, h: H - top }, 0.7, 10);
    },

    drawAir(g) {
      for (const c of crates) {
        const cy = laneMid(c.lane);
        g.fillStyle(0x000000, 0.35); g.fillEllipse(c.x + 3, cy + CRATE_R - 2, CRATE_R * 2.4, 10);
        g.fillStyle(0x2c2f34, 1); g.fillRect(c.x - CRATE_R - 1, cy - CRATE_R * 1.6, CRATE_R * 2 + 2, CRATE_R * 2.4);
        g.fillStyle(0x50565e, 1); g.fillRect(c.x - CRATE_R, cy - CRATE_R * 1.55, CRATE_R * 2, CRATE_R * 2.3);
        g.lineStyle(2, 0x2c2f34, 1);
        g.lineBetween(c.x - CRATE_R, cy - CRATE_R * 1.55, c.x + CRATE_R, cy + CRATE_R * 0.75);
        g.lineBetween(c.x + CRATE_R, cy - CRATE_R * 1.55, c.x - CRATE_R, cy + CRATE_R * 0.75);
        rivets(g, { x: c.x - CRATE_R + 3, y: cy - CRATE_R * 1.45 }, { x: c.x + CRATE_R - 3, y: cy - CRATE_R * 1.45 }, 8, 1.1, BRASS);
        // Coal heaped on top.
        g.fillStyle(0x141210, 1); g.fillEllipse(c.x, cy - CRATE_R * 1.55, CRATE_R * 1.7, 8);
      }
      for (const b of debris) {
        g.fillStyle(b.life > 0.3 ? 0x1c1a18 : 0x605a54, clamp(b.life * 2, 0, 1));
        g.fillRect(b.x - 2, b.y - 2, 4, 4);
      }
    },

    drawHud(g, time) {
      // The klaxon beacon, top-left of the field: spins up as the reversal nears.
      const x = 40, y = top + 28;
      const left = clamp((nextKlaxon - time) / periodMs, 0, 1);
      const soon = nextKlaxon - time < warnMs;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 22, 120, 44, 10);
      g.fillStyle(0x2a2a2a, 1); g.fillRect(x - 10, y + 6, 20, 8);
      g.fillStyle(soon ? 0xffb020 : 0x7a5a1a, 1); g.fillCircle(x, y, 12);
      if (soon) {
        const a = time / 90;
        g.fillStyle(0xffd060, 0.35);
        g.slice(x, y, 40, a, a + 0.7, false); g.fillPath();
        g.slice(x, y, 40, a + Math.PI, a + Math.PI + 0.7, false); g.fillPath();
      }
      g.fillStyle(0x333333, 1); g.fillRect(x + 22, y - 4, 60, 8);
      g.fillStyle(soon ? 0xffb020 : HAZARD_YELLOW, 1); g.fillRect(x + 22, y - 4, 60 * (1 - left), 8);
    },
  };
}

export const CONVEYOR_FLOOR: GimmickDef = {
  id: 'boilerworks-conveyors',
  rules: 'The belts carry you both toward their crushers. On the klaxon every belt reverses.',
  make: makeConveyor,
};
