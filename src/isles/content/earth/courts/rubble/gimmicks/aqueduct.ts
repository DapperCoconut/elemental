import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { lit, type G } from '../../../../../art/IsleArt';
import { ashlar, crack } from '../art';
import { FOAM, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, MOSS_DARK, TIMBER, TIMBER_DARK, WATER, WATER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Aqueduct — Watersmith Lev.
 *
 * The capital's aqueduct still crosses this yard on its arches, and still carries the mountain's
 * water — as far as the first broken arch, where it all comes down at once. The fall batters
 * whoever stands under it and the stream it makes runs down the yard, washing fighters along to
 * the bottom wall, where it churns.
 *
 * Strike an arch and it shakes; strike it twice and it crumbles. Water
 * always pours out at the first gap from the source, so breaking an arch upstream of the fall
 * *moves the fall* — onto whoever is under it. Lev's masons mortar broken arches back after a
 * while (all but the old break), and every so often Lev opens the sluice at the source and the
 * stream doubles.
 *
 * Catch him under an intact arch upstream of the fall and strike it to bring the water down on him.
 */

const ARCHES = 7;
const SPAN = 128;
const ROW_Y = 236;
const OLD_BREAK = 5;
const FALL_R = 54;
const STREAM_HALF = 62;
const REBUILD_MS = 14000;
/** The fall pours off the upstream stump's lip, a little short of the arch's middle. */
const LIP = SPAN * 0.26;
/** An arch's strike body: the span over the yard. Overhead, so shots fly on beneath it. */
const ARCH_R = 40;
const ARCH_UP = 40;

interface Arch { x: number; cracks: number; broken: boolean; brokeAt: number; lastCrack: number; debrisAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const x0 = (W - ARCHES * SPAN) / 2;
  const arches: Arch[] = Array.from({ length: ARCHES }, (_, i) => ({
    x: x0 + SPAN / 2 + i * SPAN, cracks: 0, broken: i === OLD_BREAK, brokeAt: -1, lastCrack: -9999, debrisAt: -1,
  }));
  const surgeEvery = ctx.hard ? 6800 : 8400;
  const SURGE_WARN = 1300;
  const SURGE_MS = 2600;
  let nextSurge = 0;
  let surgeWarnAt = -1;
  let surgeUntil = 0;
  let fallX = arches[OLD_BREAK].x - LIP;
  let lastFallX = fallX;
  /** Where the fall poured before it last moved (a wet patch, drying). */
  let prevFallX = fallX;
  let fallMovedAt = -9999;
  const tick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let started = false;

  const activeFall = () => arches.find((a) => a.broken) ?? arches[OLD_BREAK];
  const surging = () => ctx.scene.time.now < surgeUntil;
  const half = () => (surging() ? STREAM_HALF * 1.5 : STREAM_HALF);
  const fallFoot = () => ({ x: fallX, y: ROW_Y + 44 });
  const inStream = (f: Fighter) => Math.abs(f.x - fallX) < half() && f.y > ROW_Y + 20;
  const inFall = (f: Fighter) => dist(f.x, f.y, fallX, ROW_Y + 44) < FALL_R * (surging() ? 1.25 : 1);
  const underArch = (f: Fighter) => arches.find((a) => !a.broken && Math.abs(f.x - a.x) < SPAN * 0.55 && Math.abs(f.y - ROW_Y) < 90);

  function shake(a: Arch): void {
    const time = ctx.scene.time.now;
    if (a.broken || time - a.lastCrack < 600) return;
    a.lastCrack = time;
    a.cracks++;
    ctx.sfx('hit-medium');
    if (a.cracks >= 2) {
      a.broken = true;
      a.brokeAt = time;
      a.cracks = 0;
      a.debrisAt = time + 600;
      ctx.float(a.x, ROW_Y - 60, 'THE ARCH GOES', '#cfe8f0');
      ctx.sfx('stone-slam');
    }
  }

  const bodies = arches.map((a) => ctx.target({ x: a.x, y: ROW_Y - ARCH_UP, r: ARCH_R, passThrough: true, onStruck: () => shake(a) }));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSurge = time + 5000; }
      // Lev's masons mortar broken arches back — never the old break.
      for (let i = 0; i < arches.length; i++) {
        const a = arches[i];
        if (a.broken && i !== OLD_BREAK && time - a.brokeAt > REBUILD_MS) {
          a.broken = false; a.cracks = 0;
          ctx.float(a.x, ROW_Y - 60, 'MORTARED', '#e6d2a8');
        }
        // Falling voussoirs after an arch crumbles.
        if (a.debrisAt > 0 && time >= a.debrisAt) {
          a.debrisAt = -1;
          for (const f of [player, npc]) {
            if (alive(f) && Math.abs(f.x - a.x) < SPAN * 0.45 && Math.abs(f.y - (ROW_Y + 30)) < 70) {
              ctx.hit(f, 12, f.x, f.y);
              ctx.float(f.x, f.y - 40, 'MASONRY', '#e6d2a8');
            }
          }
          ctx.sfx('rock-throw');
        }
      }
      // Water pours out at the first gap from the source.
      const fa = activeFall();
      const target = fa.x - LIP;
      if (Math.abs(target - lastFallX) > 1) { prevFallX = lastFallX; lastFallX = target; fallMovedAt = time; ctx.sfx('splash'); ctx.banner('THE FALL MOVES', '#cfe8f0'); }
      fallX += (target - fallX) * Math.min(1, dt * 6);

      // The sluice.
      if (surgeWarnAt < 0 && time >= nextSurge - SURGE_WARN) { surgeWarnAt = time; ctx.banner('LEV OPENS THE SLUICE', '#9ad0e8'); ctx.sfx('geyser'); }
      if (time >= nextSurge) { nextSurge = time + surgeEvery; surgeWarnAt = -1; surgeUntil = time + SURGE_MS; ctx.sfx('water-jet'); }
      const surge = surging();

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (inFall(f)) {
          // Battered under the fall, thrown downstream.
          ctx.nudge(f, (f.x - fallX) * dt * 2, (surge ? 300 : 230) * dt);
          if (time >= (tick.get(f) ?? 0)) {
            tick.set(f, time + 700);
            ctx.hit(f, (surge ? 13 : 9) * (ctx.hard ? 1.15 : 1), f.x, f.y);
            ctx.sfx('splash');
          }
        } else if (inStream(f)) {
          // Washed along to the bottom wall, where the water churns.
          ctx.nudge(f, (fallX - f.x) * dt * 0.6, (surge ? 220 : 140) * dt);
          if (f.y > H - 90 && time >= (tick.get(f) ?? 0)) { tick.set(f, time + 800); ctx.hit(f, 4, f.x, f.y); }
        }
      }
    },

    destroy() { for (const b of bodies) b.remove(); },

    playerSpeedMult() { return inStream(player) ? 0.8 : 1; },
    npcSpeedMult() { return inStream(npc) ? 0.8 : 1; },

    npcSeek() {
      // Out of the water, beside you; when you stand under an arch upstream of the fall, he
      // goes to its downstream foot to strike it and bring the water down on you.
      const fa = activeFall();
      const upstream = underArch(player);
      const side = player.x < fallX ? -1 : 1;
      let x = player.x + side * 210, y = player.y;
      if (upstream && upstream.x < fa.x) { x = upstream.x + 66; y = ROW_Y + 16; }
      if (Math.abs(x - fallX) < half() + 40) x = fallX + (x < fallX ? -1 : 1) * (half() + 60);
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The stream down the yard: a channel of white water, foam lines racing along it.
      const hw = half();
      const y0 = ROW_Y + 20;
      g.fillStyle(WATER, 0.55); g.fillRect(fallX - hw, y0, hw * 2, H - y0);
      g.fillStyle(lit(WATER, 0.2), 0.35); g.fillRect(fallX - hw * 0.6, y0, hw * 1.2, H - y0);
      for (let i = 0; i < 18; i++) {
        const ph = ((time / (surging() ? 380 : 620)) + i * 0.137) % 1;
        const x = fallX - hw + 8 + ((i * 53) % (hw * 2 - 16)), y = y0 + ph * (H - y0);
        g.lineStyle(2, FOAM, 0.55 * Math.sin(ph * Math.PI)); g.lineBetween(x, y, x, y + 20);
      }
      // The churn at the bottom wall.
      for (let i = 0; i < 6; i++) {
        const a = time / 300 + i;
        g.fillStyle(FOAM, 0.35); g.fillCircle(fallX - hw * 0.7 + i * hw * 0.28, H - 40 + Math.sin(a) * 6, 10 + Math.sin(a * 1.3) * 4);
      }
      // The splash pool under the fall.
      const ff = fallFoot();
      g.fillStyle(WATER_LIT, 0.4); g.fillEllipse(ff.x, ff.y, FALL_R * 2.2, FALL_R * 1.1);
      for (let i = 0; i < 3; i++) {
        const ph = ((time / 500) + i / 3) % 1;
        g.lineStyle(2, FOAM, 0.6 * (1 - ph)); g.strokeEllipse(ff.x, ff.y, FALL_R * (0.8 + ph * 1.4), FALL_R * (0.4 + ph * 0.7));
      }
      // Where the fall was: a wet patch, drying.
      if (time - fallMovedAt < 2500) {
        g.fillStyle(WATER, 0.3 * (1 - (time - fallMovedAt) / 2500)); g.fillRect(prevFallX - 40, ROW_Y + 20, 80, 120);
      }
      // Pier footings across the yard.
      for (let i = 0; i <= ARCHES; i++) {
        const px = x0 + i * SPAN;
        g.fillStyle(LIME_DEEP, 0.5); g.fillEllipse(px, ROW_Y + 6, 46, 14);
      }
      // The sluice surge rising at the source.
      if (surgeWarnAt >= 0) {
        const k = clamp((time - surgeWarnAt) / SURGE_WARN, 0, 1);
        g.lineStyle(3, WATER_LIT, 0.3 + k * 0.6); g.lineBetween(x0, ROW_Y + 30, x0 + k * (fallX - x0), ROW_Y + 30);
      }
    },

    drawAir(g, time) {
      // The arcade: piers and arches overhead, the channel on top.
      for (let i = 0; i < arches.length; i++) drawArch(g, arches[i], i, time, i === OLD_BREAK);
      // Water running in the channel as far as the fall.
      const chanY = ROW_Y - 66;
      g.fillStyle(WATER_LIT, 0.8); g.fillRect(x0, chanY, fallX - x0, 4);
      for (let i = 0; i < 10; i++) {
        const ph = ((time / 500) + i * 0.1) % 1;
        const x = x0 + ph * (fallX - x0);
        g.fillStyle(FOAM, 0.6); g.fillRect(x, chanY, 8, 2);
      }
      // The fall: a sheet of water off the broken lip, spray at its foot.
      const w = surging() ? 54 : 38;
      for (let i = 0; i < 7; i++) {
        const x = fallX - w / 2 + (i / 6) * w;
        const wob = Math.sin(time / 90 + i) * 2;
        g.fillStyle(i % 2 ? WATER_LIT : FOAM, 0.55); g.fillRect(x + wob, chanY + 2, w / 7 + 1, ROW_Y + 44 - chanY);
      }
      for (let i = 0; i < 10; i++) {
        const ph = ((time / 420) + i * 0.1) % 1;
        const a = (i / 10) * Math.PI * 2;
        g.fillStyle(FOAM, 0.5 * (1 - ph)); g.fillCircle(fallX + Math.cos(a) * ph * 50, ROW_Y + 44 - ph * 24 + Math.sin(a) * 8, 3 + ph * 4);
      }
    },
  };

  /** One arch of the aqueduct in the fight, with its cracks, its broken stumps, or Lev's scaffold while it is mortared back. */
  function drawArch(g: G, a: Arch, i: number, time: number, old: boolean): void {
    const ax = a.x;
    const pierW = 26, h = 112;
    const top0 = ROW_Y - h;
    for (const px of [ax - SPAN / 2, ax + SPAN / 2]) {
      g.fillStyle(LIME_DARK, 0.92); g.fillRect(px - pierW / 2, top0, pierW, h);
      g.fillStyle(LIME, 0.92); g.fillRect(px - pierW / 2, top0, pierW - 4, h);
      for (let c = 12; c < h; c += 14) { g.fillStyle(LIME_DEEP, 0.5); g.fillRect(px - pierW / 2, top0 + c, pierW, 1); }
      g.fillStyle(MOSS_DARK, 0.35); g.fillRect(px - 4, top0 + 10, 4, h * 0.6);
    }
    if (!a.broken) {
      const r = (SPAN - pierW) / 2;
      g.lineStyle(12, LIME_DARK, 0.92); g.beginPath(); g.arc(ax, top0 + 46, r, Math.PI, 0, false); g.strokePath();
      g.lineStyle(8, LIME, 0.92); g.beginPath(); g.arc(ax, top0 + 46, r, Math.PI, 0, false); g.strokePath();
      g.fillStyle(LIME, 0.92); g.fillRect(ax - SPAN / 2, top0 - 4, SPAN, 18);
      g.fillStyle(LIME_LIT, 1); g.fillRect(ax - SPAN / 2, top0 - 6, SPAN, 3);
      if (a.cracks > 0) {
        crack(g, ax - 10, top0 + 4, 40, 1.2, LIME_DEEP, 0.95, 2);
        g.fillStyle(LIME_LIT, 0.8); g.fillRect(ax - 4 + Math.sin(time / 50) * 2, top0 + 18 + (time / 6) % 30, 3, 3);
      }
      // Lev's scaffold, still up on a freshly mortared arch.
      if (a.brokeAt > 0 && time - a.brokeAt < REBUILD_MS + 2500) {
        g.lineStyle(2, TIMBER, 0.9);
        g.lineBetween(ax - SPAN * 0.35, ROW_Y, ax - SPAN * 0.35, top0); g.lineBetween(ax + SPAN * 0.35, ROW_Y, ax + SPAN * 0.35, top0);
        g.lineStyle(1.5, TIMBER_DARK, 0.9); g.lineBetween(ax - SPAN * 0.35, top0 + 40, ax + SPAN * 0.35, top0 + 40);
      }
    } else {
      // Ragged stumps of channel over each pier.
      for (const d of [-1, 1]) {
        const px = ax + d * SPAN / 2;
        g.fillStyle(LIME, 0.92);
        g.fillTriangle(px, top0 - 6, px - d * SPAN * 0.24, top0 - 6, px, top0 + 26);
        g.fillStyle(LIME_LIT, 1); g.fillRect(Math.min(px, px - d * SPAN * 0.24), top0 - 8, SPAN * 0.24, 3);
      }
      if (old) { for (let k = 0; k < 3; k++) ashlar(g, ax - 30 + k * 26, ROW_Y + 10, 20, 10, LIME_DARK); }
      void i;
    }
  }
}

export const AQUEDUCT: GimmickDef = {
  id: 'rubble-aqueduct',
  rules: 'The aqueduct pours out at its first broken arch and washes fighters down the yard. Strike an arch to crack it, twice to break it; break one upstream and the fall moves there.',
  make,
};
