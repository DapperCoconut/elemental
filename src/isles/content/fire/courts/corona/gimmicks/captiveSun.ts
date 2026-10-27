import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { BRASS, BRASS_DARK, BRASS_LIT, SUN, SUN_CORE, SUN_DEEP, SUN_RIM } from '../palette';

/**
 * Captive Sun — Sunwarden Helia's fight.
 *
 * A thumb-sized cousin of the King's sun, still wearing a brass gimbal ring, runs an
 * elliptical track round the room. Three bands around it:
 * • the **core** (≈34px) burns whoever is inside it, either fighter;
 * • the **warm band** (core to ≈122px) is the good light — whoever stands in it hits 35%
 *   harder (pulled as the *other* side's taken-multiplier);
 * • everything else is ordinary shade.
 * Every so often Helia calls **Noon**: the sun swells, its core briefly doubles, and anyone
 * caught inside is scorched. The sun also reverses its orbit now and then — telegraphed by its
 * gimbal ring spinning down and the track arrows flipping.
 *
 * Helia rides the band between the sun and you. The counter-play: keep the sun's body between
 * the two of you, or step into the band on her far side so she has to cross the core to reach
 * the light.
 */

const BAND_MULT = 1.35;
const CORE_R = 34;
const BAND_R = 122;
const BURN_TICK_MS = 480;

export const CAPTIVE_SUN: GimmickDef = {
  id: 'corona-captive-sun',
  rules: 'A captive sun orbits the room. Its warm band makes your hits 35% harder; its core burns. Mind Noon.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const cx = W / 2;
    const cy = (top + H) / 2 + 6;
    const rx = 300;
    const ry = (H - top) / 2 - 92;
    const speed = hard ? 0.46 : 0.36; // rad/s along the track
    const burn = hard ? 13 : 10;
    const noonDmg = hard ? 22 : 18;
    const noonEvery = hard ? 8200 : 10500;
    const noonWarn = hard ? 1200 : 1500;

    let ang = Math.random() * Math.PI * 2;
    let dir = 1;
    /** A reversal is pending: the sun slows to a stop, then runs the other way. */
    let reverseAt = ctx.scene.time.now + 13000 + Math.random() * 5000;
    let reversing = 0; // 0 none, else time the reversal began
    let flipped = false;
    let noonAt = ctx.scene.time.now + noonEvery;
    let noonFiredAt = -99999;
    const lastBurn = { p: 0, n: 0 };
    const inBand = { p: false, n: false };
    let sx = cx;
    let sy = cy;

    const sunAt = (a: number): Pt => ({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });

    /** 0 inside the core, 1 in the warm band, 2 outside. */
    const zoneOf = (x: number, y: number, coreR: number): number => {
      const d = Phaser.Math.Distance.Between(x, y, sx, sy);
      return d < coreR ? 0 : d < BAND_R ? 1 : 2;
    };

    const coreR = (time: number): number => {
      const since = time - noonFiredAt;
      if (since >= 0 && since < 900) return CORE_R + 46 * Math.sin((since / 900) * Math.PI);
      return CORE_R;
    };

    return {
      update(time, dt) {
        // Orbit, with a stop-and-turn when the gimbal reverses.
        let mult = 1;
        if (!reversing && time >= reverseAt) {
          reversing = time;
          ctx.float(sx, sy - 50, 'THE SUN TURNS', '#ffd54a');
          ctx.sfx('gear-turn');
        }
        if (reversing) {
          // Coast to a stop over the first half, flip once, spin back up over the second.
          const k = (time - reversing) / 1600;
          if (k < 0.5) mult = 1 - k * 2;
          else {
            if (!flipped) { flipped = true; dir = -dir; }
            mult = Math.min(1, (k - 0.5) * 2);
          }
          if (k >= 1) { reversing = 0; flipped = false; reverseAt = time + 12000 + Math.random() * 7000; }
        }
        ang += dir * speed * mult * dt;
        const s = sunAt(ang);
        sx = s.x; sy = s.y;

        // Noon: telegraph, then the core swells.
        if (time >= noonAt) {
          noonAt = time + noonEvery;
          noonFiredAt = time + noonWarn;
          ctx.banner('NOON', '#fff3b0');
          ctx.sfx('beam-charge');
          ctx.scene.time.delayedCall(noonWarn, () => {
            ctx.sfx('light-beam');
            ctx.flash(sx, sy, SUN_CORE);
            for (const f of [ctx.player, ctx.npc]) {
              if (f.active && f.hp > 0 && Phaser.Math.Distance.Between(f.x, f.y, sx, sy) < CORE_R + 46) {
                ctx.hit(f, noonDmg, f.x, f.y);
              }
            }
          });
        }

        const cr = coreR(time);
        const pairs: [typeof ctx.player, 'p' | 'n'][] = [[ctx.player, 'p'], [ctx.npc, 'n']];
        for (const [f, k] of pairs) {
          if (!f.active || f.hp <= 0) { inBand[k] = false; continue; }
          const z = zoneOf(f.x, f.y, cr);
          if (z === 0 && time - lastBurn[k] > BURN_TICK_MS) {
            lastBurn[k] = time;
            ctx.hit(f, burn, f.x, f.y);
            ctx.sfx('sizzle');
          }
          const now = z === 1;
          if (now && !inBand[k]) ctx.float(f.x, f.y - 34, 'SUNLIT', k === 'p' ? '#ffe28a' : '#ffb070');
          inBand[k] = now;
        }
      },

      playerTakenMult: () => (inBand.n ? BAND_MULT : 1),
      npcTakenMult: () => (inBand.p ? BAND_MULT : 1),

      npcSeek() {
        // Ride the band on the side facing the player — in the light, between sun and foe,
        // and slipping ahead along the orbit so she does not fall into the core.
        const p = ctx.player;
        const a = Math.atan2(p.y - sy, p.x - sx);
        const lead = dir * 0.35;
        const r = (CORE_R + BAND_R) / 2 + 6;
        const t = ctx.scene.time.now;
        if (t > noonFiredAt - noonWarn && t < noonFiredAt + 900) {
          // Noon is coming: step out to the band's outer lip.
          return { x: sx + Math.cos(a + lead) * (BAND_R - 8), y: sy + Math.sin(a + lead) * (BAND_R - 8) };
        }
        return { x: sx + Math.cos(a + lead) * r, y: sy + Math.sin(a + lead) * r };
      },

      drawGround(g, time) {
        // The track: brass rail dashes with travel arrows (flip with the orbit).
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2;
          const p = sunAt(a);
          g.fillStyle(BRASS_DARK, 0.55);
          g.fillCircle(p.x, p.y, 2.5);
          if (i % 6 === 0) {
            const t2 = sunAt(a + dir * 0.06);
            const ux = t2.x - p.x, uy = t2.y - p.y;
            const len = Math.hypot(ux, uy) || 1;
            const nx = ux / len, ny = uy / len;
            g.fillStyle(BRASS, 0.5);
            g.fillTriangle(p.x + nx * 9, p.y + ny * 9, p.x - ny * 5, p.y + nx * 5, p.x + ny * 5, p.y - nx * 5);
          }
        }
        // The pool of warm light on the floor.
        g.fillStyle(SUN, 0.07); g.fillCircle(sx, sy + 6, BAND_R + 18);
        g.fillStyle(SUN, 0.1); g.fillCircle(sx, sy + 6, BAND_R);
        g.lineStyle(2, SUN_RIM, 0.45 + Math.sin(time / 180) * 0.12);
        g.strokeCircle(sx, sy + 6, BAND_R);
        // Noon warning: the swell's footprint pulses on the floor.
        if (time < noonFiredAt && time > noonFiredAt - noonWarn) {
          const k = 1 - (noonFiredAt - time) / noonWarn;
          g.fillStyle(SUN_RIM, 0.12 + k * 0.25); g.fillCircle(sx, sy + 6, CORE_R + 46);
          g.lineStyle(3, SUN_CORE, 0.5 + k * 0.5); g.strokeCircle(sx, sy + 6, (CORE_R + 46) * (0.4 + k * 0.6));
        }
        // Scorch under the core.
        g.fillStyle(SUN_DEEP, 0.3); g.fillEllipse(sx, sy + 10, coreR(time) * 2, coreR(time) * 0.9);
      },

      drawAir(g, time) {
        const cr = coreR(time);
        // Corona tongues licking off the disk.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + time / 900;
          const l = cr + 8 + Math.sin(time / 140 + i * 1.9) * 7;
          g.lineStyle(3, SUN_RIM, 0.55);
          g.lineBetween(sx + Math.cos(a) * cr * 0.8, sy + Math.sin(a) * cr * 0.8, sx + Math.cos(a) * l, sy + Math.sin(a) * l);
        }
        g.fillStyle(SUN_RIM, 0.35); g.fillCircle(sx, sy, cr + 6);
        g.fillStyle(SUN, 1); g.fillCircle(sx, sy, cr);
        g.fillStyle(SUN_CORE, 0.95); g.fillCircle(sx - cr * 0.2, sy - cr * 0.2, cr * 0.55);
        // Sunspots crawling over the disk.
        for (let i = 0; i < 3; i++) {
          const a = time / (1100 + i * 300) + i * 2.1;
          g.fillStyle(SUN_DEEP, 0.4);
          g.fillCircle(sx + Math.cos(a) * cr * 0.55, sy + Math.sin(a) * cr * 0.4, 3 + i);
        }
        // The brass gimbal it is still chained into — spins down during a reversal.
        const spin = reversing ? (time - reversing) / 1600 : 1;
        const ga = time / 500 * (reversing ? Math.abs(1 - spin * 2) : 1);
        g.lineStyle(3, BRASS, 0.95);
        g.strokeEllipse(sx, sy, (cr + 14) * 2, (cr + 14) * 2 * Math.abs(Math.cos(ga)) + 4);
        g.lineStyle(2, BRASS_LIT, 0.9);
        g.strokeEllipse(sx, sy, (cr + 14) * 2 * Math.abs(Math.sin(ga * 0.7)) + 4, (cr + 14) * 2);
        g.fillStyle(BRASS_LIT, 1);
        g.fillCircle(sx, sy - cr - 14, 3); g.fillCircle(sx, sy + cr + 14, 3);
      },

      drawHud(g, time) {
        // Noon clock: a sun-arc filling toward the next Noon, centred under the HUD strip.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (noonAt - t) / noonEvery, 0, 1);
        const x = W / 2, y = 118;
        g.lineStyle(6, 0x000000, 0.4);
        g.beginPath(); g.arc(x, y, 22, Math.PI, 0, false); g.strokePath();
        g.lineStyle(4, k > 0.85 ? SUN_CORE : SUN, 0.9);
        g.beginPath(); g.arc(x, y, 22, Math.PI, Math.PI + Math.PI * k, false); g.strokePath();
        g.fillStyle(SUN, 0.9 + Math.sin(time / 120) * 0.1); g.fillCircle(x, y, 6);
        // Who is sunlit right now: a small glow pip per side.
        g.fillStyle(inBand.p ? SUN : 0x333333, 0.9); g.fillCircle(x - 34, y, 4);
        g.fillStyle(inBand.n ? SUN_RIM : 0x333333, 0.9); g.fillCircle(x + 34, y, 4);
      },
    };
  },
};
