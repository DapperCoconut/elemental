import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { bolt, sparks } from '../art';
import { ARC, COPPER, COPPER_DARK, COPPER_LIT, FOAM, IRON, IRON_DARK, IRON_LIT, RACE, RACE_DEEP, RACE_LIT, RIVET, SPARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Mill Race — Millwright Tessa.
 *
 * The race runs straight through the middle of the yard, left to right, and anyone who steps
 * into it is carried downstream — hardest in the middle of the channel. Two turbines spin in the
 * race. Beside one (a ring round it, banks included) you are *charged*: the turbine's field runs
 * through you and your cooldowns run half again as fast. Too close and the
 * blades bite you instead, and a fighter carried down the race is carried into them.
 *
 * Every so often Tessa opens the sluice: a white surge comes down from upstream and the race
 * runs twice as hard for a while. She keeps to the banks, inside a turbine's ring, out of the
 * water. Take her ring from her, or make her cross the race to get to the other one.
 */

const BLADE_L = 60;
const CHARGE_IN = 66;
const CHARGE_OUT = 150;
const HALF = 70;
/** How much faster a charged fighter's cooldowns run. */
const CHARGE_RATE = 1.5;

interface Turbine { x: number; y: number; a: number; spin: number; bitAt: Map<Fighter, number> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cy = (top + H) / 2;
  const y0 = cy - HALF, y1 = cy + HALF;
  const flow = ctx.hard ? 112 : 92;
  const surgeEvery = ctx.hard ? 7000 : 9000;
  const SURGE_WARN = 1200;
  const SURGE_MS = 2400;
  const biteDmg = ctx.hard ? 10 : 8;
  const turbines: Turbine[] = [
    { x: 330, y: cy, a: 0, spin: 3.2, bitAt: new Map() },
    { x: 690, y: cy, a: 0.4, spin: -3.2, bitAt: new Map() },
  ];
  let nextSurge = -1;
  let warnAt = -1;
  let surgeUntil = 0;
  const charged = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let streamT = 0;

  const inRace = (f: Fighter) => f.y > y0 && f.y < y1;
  const isCharged = (f: Fighter) => (charged.get(f) ?? 0) > ctx.scene.time.now;

  function hurt(f: Fighter, n: number, x: number, y: number): void {
    if (f === player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n, x, y);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextSurge < 0) nextSurge = time + surgeEvery * 0.6;
      if (warnAt < 0 && time >= nextSurge - SURGE_WARN) { warnAt = time; ctx.banner('THE SLUICE OPENS', '#bfe8ff'); ctx.sfx('water-jet'); }
      if (time >= nextSurge) { nextSurge = time + surgeEvery; warnAt = -1; surgeUntil = time + SURGE_MS; ctx.sfx('splash'); }
      const surging = time < surgeUntil;
      const speed = flow * (surging ? 2 : 1);
      streamT += dt * speed;
      for (const t of turbines) t.a += t.spin * (surging ? 1.6 : 1) * dt;

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // Carried downstream; strongest in mid-channel.
        if (inRace(f)) {
          const depth = 1 - Math.abs(f.y - cy) / HALF;
          ctx.nudge(f, speed * (0.55 + depth * 0.45) * dt, 0);
        }
        for (const t of turbines) {
          const d = dist(t.x, t.y, f.x, f.y);
          if (d >= CHARGE_IN && d <= CHARGE_OUT) {
            if (!isCharged(f)) { ctx.float(f.x, f.y - 46, 'CHARGED', '#bff0ff'); ctx.sfx('electric-charge'); }
            charged.set(f, time + 900);
          }
          // The blades.
          if (d < BLADE_L + 22) {
            const last = t.bitAt.get(f) ?? -9999;
            if (time - last < 650) continue;
            for (let k = 0; k < 4; k++) {
              const b = t.a + (k * Math.PI) / 2;
              if (segDist(f.x, f.y, t.x, t.y, t.x + Math.cos(b) * BLADE_L, t.y + Math.sin(b) * BLADE_L) < 26) {
                t.bitAt.set(f, time);
                hurt(f, biteDmg, f.x, f.y);
                const a = Math.atan2(f.y - t.y, f.x - t.x);
                ctx.nudge(f, Math.cos(a) * 50, Math.sin(a) * 50);
                ctx.sfx('slash');
                break;
              }
            }
          }
        }
      }
    },

    playerCooldownRate: () => (isCharged(player) ? CHARGE_RATE : 1),
    npcCooldownRate: () => (isCharged(npc) ? CHARGE_RATE : 1),

    npcSeek() {
      if (!alive(player)) return null;
      // The bank inside a turbine's ring — the one the player is not standing in, on her side.
      const theirs = turbines.find((t) => { const d = dist(t.x, t.y, player.x, player.y); return d <= CHARGE_OUT + 20; });
      const pick = turbines.filter((t) => t !== theirs).sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y))[0] ?? turbines[0];
      const side = npc.y < cy ? -1 : 1;
      // Upstream of the hub, so the race would carry her past it rather than into it.
      return { x: pick.x - 30, y: cy + side * 112 };
    },

    drawGround(g, time) {
      const surging = time < surgeUntil;
      // Kerbs: dressed stone with iron edging.
      for (const ky of [y0 - 14, y1]) {
        g.fillStyle(0x3a3e46, 1); g.fillRect(0, ky, W, 14);
        for (let x = 0; x < W; x += 24) { g.fillStyle(x % 48 ? 0x4a4e56 : 0x42464e, 1); g.fillRect(x + 1, ky + 1, 22, 12); }
        g.fillStyle(IRON_LIT, 0.6); g.fillRect(0, ky === y1 ? ky : ky + 12, W, 2);
      }
      // The water.
      g.fillStyle(RACE, 1); g.fillRect(0, y0, W, y1 - y0);
      g.fillStyle(RACE_DEEP, 1); g.fillRect(0, y0 + HALF * 0.45, W, HALF * 1.1);
      for (let i = 0; i < 14; i++) {
        const lane = y0 + 8 + ((i * 0.618) % 1) * (y1 - y0 - 16);
        const depth = 1 - Math.abs(lane - cy) / HALF;
        const step = 110 + (i % 4) * 26;
        const off = (streamT * (0.55 + depth * 0.45) + i * 53) % step;
        for (let x = off - step; x < W; x += step) {
          g.lineStyle(1.5, FOAM, (0.25 + depth * 0.25) * (surging ? 1.4 : 1));
          g.lineBetween(x, lane, x + 26 + (i % 3) * 10, lane + Math.sin(time / 300 + x * 0.02) * 1.5);
        }
      }
      // Arrows painted on the kerbs, downstream.
      for (let x = 60; x < W; x += 160) {
        for (const ky of [y0 - 7, y1 + 7]) {
          g.fillStyle(lit(RACE_LIT, 0.3), 0.5); g.fillTriangle(x + 12, ky, x - 6, ky - 5, x - 6, ky + 5);
        }
      }
      // The surge coming: a white wall of water from upstream.
      if (warnAt >= 0 || surging) {
        const k = warnAt >= 0 ? clamp((time - warnAt) / SURGE_WARN, 0, 1) : 1;
        const fx = warnAt >= 0 ? -40 + k * 120 : ((time - (surgeUntil - SURGE_MS)) / SURGE_MS) * (W + 200) - 60;
        g.fillStyle(FOAM, 0.55); g.fillRect(fx - 60, y0, 60, y1 - y0);
        for (let i = 0; i < 10; i++) { g.fillStyle(0xffffff, 0.6); g.fillCircle(fx + Math.sin(time / 80 + i) * 8, y0 + 8 + i * ((y1 - y0 - 16) / 9), 7); }
        if (surging) { g.fillStyle(FOAM, 0.08); g.fillRect(0, y0, W, y1 - y0); }
      }
      // Turbines: the charge ring on the ground, the iron housing, and the blades turning in the water.
      for (const t of turbines) {
        g.lineStyle(CHARGE_OUT - CHARGE_IN, ARC, 0.05 + Math.sin(time / 150 + t.x) * 0.015); g.strokeCircle(t.x, t.y, (CHARGE_IN + CHARGE_OUT) / 2);
        g.lineStyle(2, ARC, 0.35);
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2 + time / 2000;
          g.beginPath(); g.arc(t.x, t.y, CHARGE_OUT, a, a + 0.12, false); g.strokePath();
        }
        g.fillStyle(IRON_DARK, 1); g.fillCircle(t.x, t.y, BLADE_L + 8);
        g.fillStyle(RACE_DEEP, 1); g.fillCircle(t.x, t.y, BLADE_L + 2);
        g.lineStyle(3, IRON_LIT, 0.8); g.strokeCircle(t.x, t.y, BLADE_L + 6);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle(RIVET, 1); g.fillCircle(t.x + Math.cos(a) * (BLADE_L + 6), t.y + Math.sin(a) * (BLADE_L + 6), 1.6); }
        for (let k = 0; k < 4; k++) {
          const b = t.a + (k * Math.PI) / 2;
          const ex = t.x + Math.cos(b) * BLADE_L, ey = t.y + Math.sin(b) * BLADE_L;
          const nx = -Math.sin(b), ny = Math.cos(b);
          g.fillStyle(IRON, 1);
          g.fillTriangle(t.x + nx * 6, t.y + ny * 6, t.x - nx * 6, t.y - ny * 6, ex + nx * 14 * Math.sign(t.spin), ey + ny * 14 * Math.sign(t.spin));
          g.lineStyle(2, IRON_LIT, 1); g.lineBetween(t.x, t.y, ex, ey);
          g.fillStyle(FOAM, 0.5); g.fillCircle(ex, ey, 3);
        }
        // Copper hub windings.
        g.fillStyle(COPPER_DARK, 1); g.fillCircle(t.x, t.y, 16);
        for (let k = 0; k < 8; k++) { const a = t.a * 0.5 + (k / 8) * Math.PI * 2; g.lineStyle(2, k % 2 ? COPPER : COPPER_LIT, 1); g.lineBetween(t.x, t.y, t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14); }
        g.fillStyle(IRON_DARK, 1); g.fillCircle(t.x, t.y, 5);
      }
    },

    drawAir(g, time) {
      // The field: an arc from each turbine hub to anyone it is charging.
      for (const f of [player, npc]) {
        if (!alive(f) || !isCharged(f)) continue;
        const t = turbines.reduce((a, b) => (dist(a.x, a.y, f.x, f.y) < dist(b.x, b.y, f.x, f.y) ? a : b));
        if (dist(t.x, t.y, f.x, f.y) <= CHARGE_OUT + 10) bolt(g, t.x, t.y, f.x, f.y - 14, Math.floor(time / 70), 1.6, ARC, 0.7, 10, false);
        glow(g, f.x, f.y - 10, 30, ARC, 0.05, 2);
        sparks(g, f.x, f.y - 20, 20, time, 3, SPARK);
      }
      // Spray off the blades.
      for (const t of turbines) {
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 500) + i / 6) % 1;
          g.fillStyle(FOAM, 0.5 * (1 - ph)); g.fillCircle(t.x + BLADE_L * 0.8 + ph * 20, t.y - 10 + Math.sin(i * 2) * 30 - ph * 14, 2 + ph * 2);
        }
      }
    },
  };
}

export const MILL_RACE: GimmickDef = {
  id: 'dynamo-mill-race',
  rules: 'The race carries anyone in it downstream. Beside a turbine you are charged: your cooldowns run half again as fast. Its blades bite back. The sluice surges.',
  make,
};
