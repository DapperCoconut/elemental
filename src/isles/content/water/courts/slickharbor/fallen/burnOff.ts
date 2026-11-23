import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  FLAME, FLAME_LIT, RUST, RUST_LIT, SAFETY_RED, SAFETY_WHITE, SOOT, STEEL, STEEL_DARK, STEEL_LIT, clamp, dist,
  flameTongue, frameClock, noise, segDist, sootPuff,
} from '../util';

/**
 * Burn-Off — Ossian Pyle tends the ground flare, the brick pit where the refinery burns off the gas
 * the Queen has no use for. In the star's telling he is the man who also burned off the ledgers,
 * the petitions and the doors of the households that were short. He fights in the flare-pit yard.
 *
 * From the nozzle at the yard's heart **a plume of burning gas lies along the ground and sweeps
 * round like the hand of a clock**. It burns for a few seconds, gutters to a pilot you can cross
 * (red sparks along it warn of the relight), and burns again. Pyle lobs firebrands at you between.
 *
 * The turn the player can make: **the damper**. Strike the nozzle and the plume stalls, then swings
 * back the other way — into Pyle, if he was sheltering behind it. He knows the trick too: he will
 * throw the damper on you. At half health he opens the second vent: two plumes, back to back.
 */

const ID = fallenId('slickharbor', 'burn-off');
const BURN_MS = 4000;
const GUTTER_MS = 1700;
const SPUTTER_MS = 650;
const LURCH_MS = 520;
const REACH = 560;
const SKIRT_R = 46;

function makeBurnOff(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const tick = frameClock();
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 8 };
  const plumeDmg = 7;
  const skirtDmg = 5;
  let theta = -Math.PI / 2;
  let dir = 1;
  let omega = 0.55;
  let twin = false;
  let burning = false;
  let phaseAt = ctx.scene.time.now + 1200; // first light after a short sputter
  let lurchUntil = 0;
  let damperReady = 0;
  let nextBelch = ctx.scene.time.now + 3000;
  const tickAt = new Map<Fighter, number>();

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const arms = (): number[] => (twin ? [theta, theta + Math.PI] : [theta]);
  const halfW = (r: number): number => 16 + r * 0.06;
  const inPlume = (x: number, y: number): boolean => {
    const r = dist(C.x, C.y, x, y);
    if (r < SKIRT_R || r > REACH) return false;
    return arms().some((a) => segDist(x, y, C.x, C.y, C.x + Math.cos(a) * REACH, C.y + Math.sin(a) * REACH) < halfW(r) + 12);
  };
  /** How far (radians) the nearest arm still has to turn before it reaches angle `phi`. */
  const aheadOf = (phi: number): number => Math.min(...arms().map((a) => {
    const d = (dir * (phi - a)) % (Math.PI * 2);
    return d < 0 ? d + Math.PI * 2 : d;
  }));

  const damper: StrikeTarget = ctx.target({
    x: C.x, y: C.y - 6, r: 30, passThrough: true,
    onStruck(by) {
      const time = ctx.scene.time.now;
      if (time < damperReady) return;
      damperReady = time + 3200;
      lurchUntil = time + LURCH_MS;
      ctx.sfx('gear-turn');
      ctx.float(C.x, C.y - 54, by === 'player' ? 'DAMPER!' : 'HIS DAMPER', by === 'player' ? '#ffc860' : '#ff8a6a');
    },
  });

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const P = ctx.player, N = ctx.npc;
      if (!twin && N.hp < N.maxHp * 0.5) {
        twin = true; omega = 0.42;
        ctx.banner('BOTH VENTS OPEN — two plumes now', '#ffc860');
        ctx.sfx('inferno');
      }
      // The plume's own clock: burn, gutter, sputter, burn.
      if (time >= phaseAt) {
        burning = !burning;
        phaseAt = time + (burning ? BURN_MS : GUTTER_MS);
        ctx.sfx(burning ? 'flame-burst' : 'smoke');
      }
      // The damper: stall, then swing back.
      if (lurchUntil) {
        if (time >= lurchUntil) { lurchUntil = 0; dir = -dir; ctx.sfx('whoosh'); }
      } else theta += dir * omega * dt;

      if (burning) {
        for (const f of [P, N]) {
          if (!alive(f) || !inPlume(f.x, f.y)) continue;
          const last = tickAt.get(f) ?? 0;
          if (time - last < 450) continue;
          tickAt.set(f, time);
          ctx.hit(f, plumeDmg, f.x, f.y);
          if (f === P) ctx.sfx('status-burn');
        }
      }
      // The pit's brick skirt is red-hot.
      for (const f of [P, N]) {
        if (!alive(f) || dist(f.x, f.y, C.x, C.y) >= SKIRT_R) continue;
        const last = tickAt.get(f) ?? 0;
        if (time - last < 500) continue;
        tickAt.set(f, time);
        ctx.hit(f, skirtDmg, f.x, f.y);
      }
      // Firebrands lobbed at you: one where you stand, two either side.
      if (time >= nextBelch && alive(P) && alive(N)) {
        nextBelch = time + 4300;
        const a = Math.atan2(P.y - N.y, P.x - N.x);
        for (const off of [-80, 0, 80]) {
          tk.spawnZone({
            x: clamp(P.x - Math.sin(a) * off, 50, W - 50), y: clamp(P.y + Math.cos(a) * off, top + 40, H - 40),
            radius: 44, warnMs: 950, damage: 8,
          });
        }
        ctx.sfx('fireball');
      }
    },

    npcSeek(): Pt | null {
      const N = ctx.npc;
      const phi = Math.atan2(N.y - C.y, N.x - C.x);
      if (aheadOf(phi) > 1.4 && !inPlume(N.x, N.y)) return null;
      // Shelter in the wake: behind the sweeping arm, where it has just been.
      const back = arms()[0] - dir * (twin ? Math.PI / 2 : Math.PI * 0.6);
      const r = clamp(dist(C.x, C.y, N.x, N.y), 150, 240);
      return { x: clamp(C.x + Math.cos(back) * r, 50, W - 50), y: clamp(C.y + Math.sin(back) * r, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // Scorched yard: radial soot spokes from a century of sweeping fire.
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2 + noise(i) * 0.1;
        g.lineStyle(10 + noise(i * 3) * 14, SOOT, 0.18 + noise(i * 7) * 0.12);
        g.lineBetween(C.x + Math.cos(a) * 60, C.y + Math.sin(a) * 60, C.x + Math.cos(a) * (300 + noise(i * 2) * 260), C.y + Math.sin(a) * (300 + noise(i * 2) * 260));
      }
      // Pre-light sparks: red ticks running down the arm before it catches.
      if (!burning && phaseAt - time < SPUTTER_MS) {
        for (const a of arms()) {
          for (let d = SKIRT_R + 10; d < REACH; d += 22) {
            const on = Math.floor(ts * 14 + d / 22) % 2 === 0;
            if (!on) continue;
            g.lineStyle(3, SAFETY_RED, 0.75);
            g.lineBetween(C.x + Math.cos(a) * d, C.y + Math.sin(a) * d, C.x + Math.cos(a) * (d + 12), C.y + Math.sin(a) * (d + 12));
          }
        }
      }
      drawPit(g, ts);
    },

    drawAir(g, time) {
      const ts = time / 1000;
      for (const a of arms()) {
        const ca = Math.cos(a), sa = Math.sin(a);
        if (burning) {
          const life = clamp((phaseAt - time) / BURN_MS, 0, 1);
          const fade = life < 0.12 ? life / 0.12 : 1;
          // The plume lies along the ground: an orange bed, a white-hot core, tongues licking up.
          for (let d = SKIRT_R; d < REACH; d += 18) {
            const x = C.x + ca * d, y = C.y + sa * d, w = halfW(d);
            g.fillStyle(FLAME, 0.3 * fade); g.fillCircle(x, y, w + 6);
            g.fillStyle(FLAME_LIT, 0.4 * fade); g.fillCircle(x, y, w * 0.6);
            if (d < 200) { g.fillStyle(0xffffff, 0.35 * fade * (1 - d / 200)); g.fillCircle(x, y, w * 0.3); }
            flameTongue(g, x + (noise(d) - 0.5) * w, y + 4, 14 + w * 0.9, ts, d * 0.13 + a, fade);
          }
          for (let i = 0; i < 4; i++) {
            const d = REACH - 40 + i * 10;
            sootPuff(g, C.x + ca * d, C.y + sa * d - 10, (ts * 0.7 + i / 4) % 1, 18, 0.5 * fade);
          }
        } else {
          // Guttered: a blue pilot at the nozzle and a smoke streak along the arm's line.
          g.fillStyle(0x6aa8ff, 0.7); g.fillCircle(C.x + ca * (SKIRT_R + 4), C.y + sa * (SKIRT_R + 4), 5 + Math.sin(ts * 20));
          for (let d = SKIRT_R + 20; d < REACH; d += 60) sootPuff(g, C.x + ca * d, C.y + sa * d, (ts * 0.4 + d * 0.003) % 1, 12, 0.3);
        }
      }
      if (lurchUntil) {
        // The damper thrown: the plume shudders, a curved arrow showing which way it will swing.
        const a0 = theta, a1 = theta - dir * 0.6;
        g.lineStyle(4, SAFETY_WHITE, 0.8); g.beginPath(); g.arc(C.x, C.y, 120, Math.min(a0, a1), Math.max(a0, a1), false); g.strokePath();
        const ex = C.x + Math.cos(a1) * 120, ey = C.y + Math.sin(a1) * 120;
        const ta = a1 - dir * Math.PI / 2;
        g.fillStyle(SAFETY_WHITE, 0.9);
        g.fillTriangle(ex + Math.cos(ta) * 12, ey + Math.sin(ta) * 12, ex + Math.cos(ta + 2.4) * 9, ey + Math.sin(ta + 2.4) * 9, ex + Math.cos(ta - 2.4) * 9, ey + Math.sin(ta - 2.4) * 9);
      }
    },

    drawHud(g, time) {
      // A clock face of the yard: the plume hands, the way they turn, and the damper's readiness.
      const x = W - 64, y = top + 42, r = 26;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, r + 6);
      g.fillStyle(0x2a2420, 1); g.fillCircle(x, y, r + 2);
      g.lineStyle(2, RUST_LIT, 1); g.strokeCircle(x, y, r);
      for (const a of arms()) { g.lineStyle(4, burning ? FLAME : 0x6aa8ff, 1); g.lineBetween(x, y, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); }
      const ready = clamp(1 - (damperReady - time) / 3200, 0, 1);
      g.lineStyle(3, ready >= 1 ? 0x4aa86a : SAFETY_RED, 1);
      g.beginPath(); g.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready, false); g.strokePath();
      const ar = theta + dir * 0.9;
      g.fillStyle(SAFETY_WHITE, 1); g.fillCircle(x + Math.cos(ar) * (r - 8), y + Math.sin(ar) * (r - 8), 3);
      g.fillStyle(STEEL_LIT, 1); g.fillCircle(x, y, 3);
    },

    destroy() { damper.remove(); tickAt.clear(); },
  };

  /** The brick flare pit: a ring of fire-brick, the steel nozzle head and its red damper wheel. */
  function drawPit(g: G, ts: number): void {
    g.fillStyle(0x000000, 0.4); g.fillCircle(C.x + 3, C.y + 4, SKIRT_R + 4);
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 0.9) / 18) * Math.PI * 2;
      g.fillStyle(noise(i) > 0.5 ? RUST : 0x6a2e16, 1);
      g.beginPath(); g.arc(C.x, C.y, SKIRT_R, a0, a1, false); g.arc(C.x, C.y, SKIRT_R - 12, a1, a0, true); g.closePath(); g.fillPath();
    }
    const heat = 0.5 + 0.5 * Math.sin(ts * 3);
    g.fillStyle(FLAME, 0.25 + heat * 0.2); g.fillCircle(C.x, C.y, SKIRT_R - 12);
    g.fillStyle(SOOT, 0.9); g.fillCircle(C.x, C.y, SKIRT_R - 18);
    // Nozzle head and the burners pointing down each arm.
    g.fillStyle(STEEL_DARK, 1); g.fillCircle(C.x, C.y, 15);
    g.fillStyle(STEEL, 1); g.fillCircle(C.x, C.y - 2, 11);
    for (const a of arms()) {
      g.lineStyle(8, STEEL_DARK, 1); g.lineBetween(C.x, C.y, C.x + Math.cos(a) * (SKIRT_R - 6), C.y + Math.sin(a) * (SKIRT_R - 6));
      g.lineStyle(4, STEEL_LIT, 0.6); g.lineBetween(C.x, C.y - 1, C.x + Math.cos(a) * (SKIRT_R - 8), C.y + Math.sin(a) * (SKIRT_R - 8) - 1);
    }
    const wa = ts * (lurchUntil ? 12 : 0.4);
    g.lineStyle(3, SAFETY_RED, 1); g.strokeCircle(C.x, C.y - 2, 8);
    for (let k = 0; k < 4; k++) { const a = wa + (k / 4) * Math.PI * 2; g.lineBetween(C.x, C.y - 2, C.x + Math.cos(a) * 8, C.y - 2 + Math.sin(a) * 8); }
  }
}

export const FALLEN_BURN_OFF: GimmickDef = {
  id: ID,
  rules: 'A plume of burning gas sweeps the yard like a clock hand, guttering between burns. Strike the nozzle\'s damper to swing it back at Pyle.',
  make: makeBurnOff,
};
