import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { fighterOf, live, SIDES } from './shared';
import { BRASS, BRASS_DARK, BRASS_LIT, COPPER, CSS_BRASS, CSS_METER, LAMPLIGHT, NAVY_LIT, VERD, WHITE } from '../palette';
import { dashedEllipse, distToSeg, gear, planet } from '../orbitArt';
import { dim } from '../../../../../art/IsleArt';

/**
 * Orrery — Clockmaker Tycho's fight.
 *
 * The yard is the face of a working orrery. A brass sun stands on a post in the middle, and
 * three long arms turn round it at three speeds, each carrying a brass planet on its tip along
 * a dashed elliptical orbit inlaid in the paving. The **arms** sweep the floor: get caught by
 * one and it carries you round with it. The **planets** slam whoever they meet — a hard hit and a
 * shove along the planet's path. Every planet shows the stretch of orbit it is about to sweep
 * as a bright arc ahead of it.
 *
 * The **sun-switch** sits on the sun's post: cast anything while standing on the brass boss in
 * the middle and the whole orrery throws into reverse. The sun is hot, though — linger on the
 * boss and it scorches you. Tycho knows the switch is there; when a planet is bearing down on
 * you he walks to the sun to keep it coming. But a planet in reverse hits whoever is behind it:
 * throw the switch when Tycho is standing on the orbit the planet has just passed.
 */

/** Orbit radii in "dial units" — an orbit is an ellipse of half-axes R×1.45 by R×0.88. */
const ORBITS = [104, 180, 256];
const AX = 1.45;
const AY = 0.88;
const PLANET_R = [19, 27, 34];
const PLANET_COL = [COPPER, VERD, BRASS];
const HUB_R = 54;
const ROD_HALF = 11;
const SWITCH_CD = 1800;
const SUN_GRACE = 2000;

export const ORRERY_GIMMICK: GimmickDef = {
  id: 'orbit-orrery',
  rules: 'Brass planets ride arms round the sun: arms carry you, planets slam you. Cast on the sun to throw the orrery into reverse.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const cx = W / 2, cy = (top + H) / 2 + 8;
    const omega = hard ? [1.1, 0.74, 0.52] : [0.92, 0.62, 0.44];
    const dmg = hard ? 17 : 13;
    let dir = 1;
    const theta = [0.3, 2.4, 4.4];
    let switchReady = 0;
    let flippedAt = -99999;
    let flippedBy: Side | null = null;
    const seenPress = { p: Date.now(), n: Date.now() };
    const lastHit = { p: [0, 0, 0], n: [0, 0, 0] };
    const sunSince = { p: 0, n: 0 };
    const sunTick = { p: 0, n: 0 };
    const slams: { x: number; y: number; at: number }[] = [];

    const planetAt = (i: number, th = theta[i]): Pt => ({ x: cx + Math.cos(th) * ORBITS[i] * AX, y: cy + Math.sin(th) * ORBITS[i] * AY });
    const planetVel = (i: number): Pt => ({
      x: -Math.sin(theta[i]) * ORBITS[i] * AX * omega[i] * dir,
      y: Math.cos(theta[i]) * ORBITS[i] * AY * omega[i] * dir,
    });
    /** A point's place on the dial: its radius in dial units and its angle. */
    const dial = (x: number, y: number): { rho: number; phi: number } => {
      const ux = (x - cx) / AX, uy = (y - cy) / AY;
      return { rho: Math.hypot(ux, uy), phi: Math.atan2(uy, ux) };
    };
    const rodStart = (p: Pt): Pt => {
      const d = Math.hypot(p.x - cx, p.y - cy) || 1;
      return { x: cx + ((p.x - cx) / d) * HUB_R, y: cy + ((p.y - cy) / d) * HUB_R };
    };
    const onHub = (x: number, y: number): boolean => Math.hypot(x - cx, y - cy) < HUB_R;
    /** Seconds until planet `i` reaches angle `phi` going the current way round. */
    const etaTo = (i: number, phi: number): number => {
      let d = (phi - theta[i]) * dir;
      d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return d / omega[i];
    };
    /** The orbit band a point stands in (a planet would touch it), or -1. */
    const bandOf = (x: number, y: number): number => {
      const { rho } = dial(x, y);
      for (let i = 0; i < ORBITS.length; i++) if (Math.abs(rho - ORBITS[i]) < PLANET_R[i] / 0.9 + 14) return i;
      return -1;
    };

    const flip = (time: number, k: Side): void => {
      dir = -dir;
      switchReady = time + SWITCH_CD;
      flippedAt = time;
      flippedBy = k;
      ctx.sfx('gear-turn');
      ctx.float(cx, cy - 70, k === 'p' ? 'REVERSED!' : 'TYCHO THROWS THE SWITCH', k === 'p' ? CSS_BRASS : CSS_METER);
    };

    return {
      update(time, dt) {
        for (let i = 0; i < theta.length; i++) theta[i] += omega[i] * dir * dt;

        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          // The sun-switch: a cast made on the boss.
          const at = f.lastPressAt ?? 0;
          if (at > seenPress[k]) {
            seenPress[k] = at;
            if (live(f) && onHub(f.x, f.y) && time >= switchReady) flip(time, k);
          }
          if (!live(f)) continue;
          // The sun scorches anyone who loiters on it.
          if (onHub(f.x, f.y)) {
            if (!sunSince[k]) sunSince[k] = time;
            if (time - sunSince[k] > SUN_GRACE && time >= sunTick[k]) {
              sunTick[k] = time + 500;
              ctx.hit(f, hard ? 5 : 4, f.x, f.y);
              ctx.sfx('sizzle');
              if (k === 'p') ctx.float(f.x, f.y - 46, 'THE SUN IS HOT', CSS_METER);
            }
          } else sunSince[k] = 0;
          // Arms and planets.
          for (let i = 0; i < theta.length; i++) {
            const p = planetAt(i);
            const s = rodStart(p);
            const dPlanet = Math.hypot(f.x - p.x, f.y - p.y);
            if (dPlanet < PLANET_R[i] + 18) {
              if (time - lastHit[k][i] > 900) {
                lastHit[k][i] = time;
                const v = planetVel(i);
                const vl = Math.hypot(v.x, v.y) || 1;
                ctx.hit(f, dmg, f.x, f.y);
                ctx.nudge(f, (v.x / vl) * 70 + ((f.x - p.x) / Math.max(1, dPlanet)) * 24, (v.y / vl) * 70 + ((f.y - p.y) / Math.max(1, dPlanet)) * 24);
                ctx.sfx('anvil');
                slams.push({ x: f.x, y: f.y, at: time });
                if (k === 'n') ctx.float(f.x, f.y - 50, flippedBy === 'p' && time - flippedAt < 6000 ? 'TYCHO MEETS HIS OWN PLANET' : 'PLANETFALL', CSS_BRASS);
              }
            } else if (distToSeg(f.x, f.y, s.x, s.y, p.x, p.y) < ROD_HALF + 12) {
              // Caught by the arm: carried round at the arm's speed where you stand on it.
              const { rho } = dial(f.x, f.y);
              const frac = Phaser.Math.Clamp(rho / ORBITS[i], 0, 1);
              const v = planetVel(i);
              ctx.nudge(f, v.x * frac * dt * 0.9, v.y * frac * dt * 0.9);
            }
          }
        }
        while (slams.length && time - slams[0].at > 500) slams.shift();
      },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        const mine = bandOf(n.x, n.y);
        // A planet is about to reach him: step off the orbit, toward the middle of the gap.
        if (mine >= 0 && etaTo(mine, dial(n.x, n.y).phi) < 0.9) {
          const { phi } = dial(n.x, n.y);
          const safe = mine === 0 ? ORBITS[0] * 0.55 : (ORBITS[mine] + ORBITS[mine - 1]) / 2;
          return { x: cx + Math.cos(phi) * safe * AX, y: cy + Math.sin(phi) * safe * AY };
        }
        // A planet bearing down on you, and the switch would turn it away: no — he wants it to
        // land. He goes to the sun only when a reversal would bring a planet onto you instead.
        const yours = bandOf(p.x, p.y);
        if (yours >= 0 && t >= switchReady - 400) {
          const eta = etaTo(yours, dial(p.x, p.y).phi);
          const back = (Math.PI * 2) / omega[yours] - eta;
          if (back < eta && back < 2.2 && !onHub(p.x, p.y)) return { x: cx, y: cy };
        }
        return null;
      },

      drawGround(g, time) {
        const sec = time / 1000;
        // The orbits, dashes creeping the way the orrery turns.
        for (let i = 0; i < ORBITS.length; i++) {
          dashedEllipse(g, cx, cy, ORBITS[i] * AX, ORBITS[i] * AY, 26 + i * 8, (sec * 0.25 * dir) % 1, 2, BRASS_LIT, 0.45);
          // The stretch the planet sweeps in the next 0.9s, brightening toward it.
          const span = omega[i] * 0.9 * dir;
          const steps = 10;
          for (let s = 0; s < steps; s++) {
            const a0 = theta[i] + (span * s) / steps, a1 = theta[i] + (span * (s + 1)) / steps;
            const p0 = planetAt(i, a0), p1 = planetAt(i, a1);
            g.lineStyle(PLANET_R[i] * 1.6, LAMPLIGHT, 0.16 * (1 - s / steps));
            g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          }
        }
        // The brass boss: the sun-switch. It glows when ready, and flares on a flip.
        const ready = time >= switchReady;
        g.fillStyle(BRASS_DARK, 0.9); g.fillCircle(cx, cy, HUB_R);
        g.fillStyle(ready ? BRASS : dim(BRASS, 0.4), 0.9); g.fillCircle(cx, cy, HUB_R - 6);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + sec * 0.3 * dir;
          g.lineStyle(2, BRASS_LIT, ready ? 0.6 : 0.25);
          g.lineBetween(cx + Math.cos(a) * (HUB_R - 4), cy + Math.sin(a) * (HUB_R - 4) * 0.9, cx + Math.cos(a) * (HUB_R + 10), cy + Math.sin(a) * (HUB_R + 10) * 0.9);
        }
        if (ready) { g.lineStyle(2, WHITE, 0.3 + 0.3 * Math.sin(sec * 5)); g.strokeCircle(cx, cy, HUB_R + 2); }
        const since = time - flippedAt;
        if (since < 600) { g.lineStyle(6 * (1 - since / 600), LAMPLIGHT, 1 - since / 600); g.strokeCircle(cx, cy, HUB_R + since / 4); }
        // Rods' shadows on the paving.
        for (let i = 0; i < ORBITS.length; i++) {
          const p = planetAt(i);
          const s = rodStart(p);
          g.lineStyle(ROD_HALF * 1.4, 0x000000, 0.18); g.lineBetween(s.x + 4, s.y + 8, p.x + 4, p.y + 8);
          g.fillStyle(0x000000, 0.22); g.fillEllipse(p.x + 4, p.y + PLANET_R[i] * 0.9, PLANET_R[i] * 2, PLANET_R[i] * 0.6);
        }
      },

      drawAir(g, time) {
        const sec = time / 1000;
        // The arms: brass rods with rivets, hinged at the sun.
        for (let i = ORBITS.length - 1; i >= 0; i--) {
          const p = planetAt(i);
          const s = rodStart(p);
          g.lineStyle(ROD_HALF * 0.9, BRASS_DARK, 1); g.lineBetween(s.x, s.y, p.x, p.y);
          g.lineStyle(ROD_HALF * 0.45, BRASS, 1); g.lineBetween(s.x, s.y - 1, p.x, p.y - 1);
          for (let r = 0.25; r < 1; r += 0.25) {
            g.fillStyle(BRASS_LIT, 1); g.fillCircle(s.x + (p.x - s.x) * r, s.y + (p.y - s.y) * r - 1, 2);
          }
          planet(g, p.x, p.y - 6, PLANET_R[i], PLANET_COL[i], i === 2, 1);
        }
        // The sun on its post, its gear-crown turning the way the orrery runs.
        gear(g, cx, cy - 34, 26, 16, BRASS, sec * 0.8 * dir, 1);
        g.fillStyle(LAMPLIGHT, 0.25 + 0.1 * Math.sin(sec * 3)); g.fillCircle(cx, cy - 34, 30);
        g.fillStyle(LAMPLIGHT, 1); g.fillCircle(cx, cy - 34, 13);
        g.fillStyle(WHITE, 0.8); g.fillCircle(cx - 4, cy - 38, 4);
        // Who is cooking on the sun.
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f) || !sunSince[k]) continue;
          const heat = Phaser.Math.Clamp((time - sunSince[k]) / SUN_GRACE, 0, 1);
          g.lineStyle(2, heat >= 1 ? 0xff6a3a : LAMPLIGHT, 0.3 + 0.6 * heat); g.strokeEllipse(f.x, f.y + 16, 30 + heat * 10, 9 + heat * 3);
        }
        // Slams: a ring of brass sparks.
        for (const s of slams) {
          const q = (time - s.at) / 500;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.lineStyle(2, BRASS_LIT, 1 - q);
            g.lineBetween(s.x + Math.cos(a) * (10 + q * 16), s.y + Math.sin(a) * (10 + q * 16), s.x + Math.cos(a) * (18 + q * 30), s.y + Math.sin(a) * (18 + q * 30));
          }
        }
      },

      drawHud(g) {
        // Which way the orrery turns, and whether the switch is ready.
        const t = ctx.scene.time.now;
        const x = W / 2, y = 114;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 40, y - 14, 80, 28, 8);
        g.lineStyle(2, BRASS, 0.9); g.strokeCircle(x - 14, y, 9);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 14 + Math.cos(t / 300 * dir) * 9, y + Math.sin(t / 300 * dir) * 9, 2.5);
        const k = Phaser.Math.Clamp(1 - (switchReady - t) / SWITCH_CD, 0, 1);
        g.fillStyle(NAVY_LIT, 0.6); g.fillRect(x + 2, y - 3, 30, 6);
        g.fillStyle(k >= 1 ? LAMPLIGHT : BRASS, 1); g.fillRect(x + 2, y - 3, 30 * k, 6);
      },
    };
  },
};
