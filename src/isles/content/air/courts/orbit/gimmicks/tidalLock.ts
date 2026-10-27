import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from './shared';
import { clampIn, fighterOf, live, SIDES } from './shared';
import { BRASS, BRASS_LIT, CSS_LODE, CSS_SKY, LODE_GLINT, LODE_SHEEN, LODE_WASH, NAVY_LIT, WHITE } from '../palette';
import { dashedEllipse, filings, lodestone } from '../orbitArt';

/**
 * Tidal Lock — Moonkeeper Selene's fight.
 *
 * A little moon — a lodestone the size of a cartwheel — rides a long ellipse across the yard.
 * Like any moon it goes slow at the far end of its orbit and whips round the near end, the
 * *perigee*, marked on the paving with a brass chevron. Its **pull** drags both fighters toward
 * it, gently out at apogee, hard as it swings in. Touch the moon itself and it bowls you over.
 *
 * Inside the violet **tide-ring** round the moon the stone strains at everything: anyone in it
 * takes a quarter more damage. And at perigee the moon **yanks** — everyone near is hauled a long
 * stride toward it in one jolt. The orbit precesses, so the perigee creeps round the yard each
 * pass.
 *
 * Selene stands so that you are between her and her moon, and lets it pull you into the tide.
 * Turn it round: keep the moon's path between you and her, and let the yank drag *her* in.
 */

const MOON_R = 30;
const TIDE_R = 130;
const PULL_RANGE = 430;
const YANK_RANGE = 300;
const YANK = 72;

export const TIDAL_LOCK: GimmickDef = {
  id: 'orbit-tidal-lock',
  rules: 'A small moon rides an ellipse and pulls you in, hardest at perigee. Inside its tide-ring you take +25%. Touching it bowls you over.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const cx = W / 2, cy = (top + H) / 2 + 8;
    const A = 350, B = 180;
    const period = hard ? 7000 : 8600;
    const n = (Math.PI * 2) / (period / 1000);
    const contact = hard ? 15 : 12;
    let E = Math.PI * 0.85;
    let rot = ctx.rng() * Math.PI;
    let orbits = 0;
    let yankAt = -99999;
    let yankPt: Pt = { x: cx, y: cy };
    const lastTouch = { p: 0, n: 0 };
    const trail: Pt[] = [];
    const bowled: { x: number; y: number; at: number }[] = [];

    const posAt = (e: number, r = rot): Pt => {
      const ex = Math.cos(e) * A, ey = Math.sin(e) * B;
      return { x: cx + ex * Math.cos(r) - ey * Math.sin(r), y: cy + ex * Math.sin(r) + ey * Math.cos(r) };
    };
    let moon = posAt(E);
    let prev = moon;
    /** How near perigee the moon is: 1 at perigee, 0 half an orbit away. */
    const nearPerigee = (): number => 0.5 + 0.5 * Math.cos(E);
    const inTide = (f: { x: number; y: number }): boolean => Math.hypot(f.x - moon.x, f.y - moon.y) < TIDE_R;

    return {
      update(time, dt) {
        // Kepler, roughly: the moon sweeps faster the nearer it is to perigee (E = 0).
        E += (n / (1 - 0.6 * Math.cos(E))) * dt;
        let crossed = false;
        if (E >= Math.PI * 2) {
          E -= Math.PI * 2;
          crossed = true;
          orbits++;
          rot += hard ? 0.85 : 0.7;
        }
        prev = moon;
        moon = posAt(E);
        trail.push({ x: moon.x, y: moon.y });
        if (trail.length > 14) trail.shift();
        const vx = (moon.x - prev.x) / Math.max(0.001, dt), vy = (moon.y - prev.y) / Math.max(0.001, dt);
        const vl = Math.hypot(vx, vy) || 1;

        // The yank, as the moon crosses perigee.
        if (crossed && time - yankAt > 1000) {
          yankAt = time;
          yankPt = { x: moon.x, y: moon.y };
          ctx.sfx('gravity-slam');
          for (const k of SIDES) {
            const f = fighterOf(ctx, k);
            if (!live(f)) continue;
            const d = Math.hypot(moon.x - f.x, moon.y - f.y);
            if (d > YANK_RANGE || d < MOON_R + 24) continue;
            const step = Math.min(YANK, d - MOON_R - 24);
            ctx.nudge(f, ((moon.x - f.x) / d) * step, ((moon.y - f.y) / d) * step);
            ctx.float(f.x, f.y - 46, k === 'p' ? 'YANKED' : 'SELENE IS YANKED IN', k === 'p' ? CSS_SKY : CSS_LODE);
          }
        }

        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f)) continue;
          const d = Math.hypot(moon.x - f.x, moon.y - f.y);
          // Contact: bowled along the moon's path.
          if (d < MOON_R + 18) {
            if (time - lastTouch[k] > 1000) {
              lastTouch[k] = time;
              ctx.hit(f, contact, f.x, f.y);
              ctx.nudge(f, (vx / vl) * 64 + ((f.x - moon.x) / Math.max(1, d)) * 30, (vy / vl) * 64 + ((f.y - moon.y) / Math.max(1, d)) * 30);
              bowled.push({ x: f.x, y: f.y, at: time });
              ctx.sfx('stone-slam');
            }
            continue;
          }
          // The pull: stronger close in, stronger still at perigee, always under a walk.
          if (d < PULL_RANGE) {
            const s = Math.min(hard ? 140 : 125, (8200 / Math.max(60, d)) * (0.75 + 0.9 * nearPerigee()));
            const step = Math.min(s * dt, d - MOON_R - 20);
            if (step > 0) ctx.nudge(f, ((moon.x - f.x) / d) * step, ((moon.y - f.y) / d) * step);
          }
        }
        while (bowled.length && time - bowled[0].at > 600) bowled.shift();
      },

      playerTakenMult: () => (inTide(ctx.player) ? 1.25 : 1),
      npcTakenMult: () => (inTide(ctx.npc) ? 1.25 : 1),

      npcSeek() {
        const nf = ctx.npc, p = ctx.player;
        const dn = Math.hypot(nf.x - moon.x, nf.y - moon.y);
        // The moon is close or coming: step out of its way, sideways to its path.
        const ahead = posAt(E + 0.5);
        const dAhead = Math.hypot(nf.x - ahead.x, nf.y - ahead.y);
        if (dn < TIDE_R + 30 || dAhead < 90) {
          const away = Math.atan2(nf.y - moon.y, nf.x - moon.x);
          return clampIn(ctx, moon.x + Math.cos(away) * (TIDE_R + 120), moon.y + Math.sin(away) * (TIDE_R + 90));
        }
        // Otherwise: stand beyond you from the moon, so the moon pulls you away from her and
        // into the tide while she plays from range.
        const dp = Math.hypot(p.x - moon.x, p.y - moon.y);
        if (dp < PULL_RANGE) {
          const a = Math.atan2(p.y - moon.y, p.x - moon.x);
          return clampIn(ctx, p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 130);
        }
        return null;
      },

      drawGround(g, time) {
        const sec = time / 1000;
        // The orbit, dashed in lodestone violet, and the brass chevron at perigee.
        dashedEllipse(g, cx, cy, A, B, 40, (sec * 0.2) % 1, 2, LODE_GLINT, 0.4, rot);
        const peri = posAt(0);
        const pa = Math.atan2(peri.y - cy, peri.x - cx);
        const glow = Phaser.Math.Clamp((nearPerigee() - 0.75) / 0.25, 0, 1);
        g.fillStyle(BRASS, 0.6 + 0.4 * glow);
        for (let i = 0; i < 2; i++) {
          const ox = peri.x + Math.cos(pa) * (16 + i * 12), oy = peri.y + Math.sin(pa) * (16 + i * 12);
          g.fillTriangle(
            ox + Math.cos(pa) * 10, oy + Math.sin(pa) * 10,
            ox + Math.cos(pa + 2.3) * 10, oy + Math.sin(pa + 2.3) * 10,
            ox + Math.cos(pa - 2.3) * 10, oy + Math.sin(pa - 2.3) * 10,
          );
        }
        // Perigee coming: the yank radius tightens on the marker.
        if (glow > 0) {
          g.lineStyle(2 + glow * 2, LODE_WASH, 0.25 + 0.5 * glow);
          g.strokeCircle(peri.x, peri.y, YANK_RANGE * (1.15 - glow * 0.15));
          g.fillStyle(LODE_GLINT, 0.05 + 0.08 * glow); g.fillCircle(peri.x, peri.y, YANK_RANGE);
        }
        const since = time - yankAt;
        if (since < 500) { g.lineStyle(8 * (1 - since / 500), LODE_WASH, 1 - since / 500); g.strokeCircle(yankPt.x, yankPt.y, YANK_RANGE * (1 - since / 500)); }
        // The tide-ring and the moon's shadow.
        g.fillStyle(LODE_SHEEN, 0.14); g.fillCircle(moon.x, moon.y + 12, TIDE_R);
        g.lineStyle(2, LODE_GLINT, 0.55 + 0.2 * Math.sin(sec * 4)); g.strokeCircle(moon.x, moon.y + 12, TIDE_R);
        g.fillStyle(0x000000, 0.35); g.fillEllipse(moon.x, moon.y + 26, MOON_R * 2.2, MOON_R * 0.7);
        // Pull made visible: filings at each fighter's feet combed toward the moon.
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f)) continue;
          const d = Math.hypot(moon.x - f.x, moon.y - f.y);
          if (d > PULL_RANGE) continue;
          const a = Math.atan2(moon.y - f.y, moon.x - f.x);
          const k2 = 1 - d / PULL_RANGE;
          for (let i = -1; i <= 1; i++) filings(g, f.x + i * 10, f.y + 18, a, 6 + k2 * 14, 0.3 + k2 * 0.6);
        }
      },

      drawAir(g, time) {
        // The trail of a moon in a hurry.
        for (let i = 0; i < trail.length; i++) {
          const q = i / trail.length;
          g.fillStyle(LODE_SHEEN, 0.25 * q); g.fillCircle(trail[i].x, trail[i].y - 10, MOON_R * (0.5 + 0.5 * q));
        }
        lodestone(g, moon.x, moon.y - 10, MOON_R, time / 1000, 1);
        // A little brass equator band so you can see it spin.
        g.lineStyle(2, BRASS_LIT, 0.6);
        g.beginPath(); g.arc(moon.x, moon.y - 10, MOON_R * 0.98, 0.15 + (time / 400) % 0.3, Math.PI - 0.15, false); g.strokePath();
        for (const b of bowled) {
          const q = (time - b.at) / 600;
          g.lineStyle(3 * (1 - q), LODE_WASH, 1 - q); g.strokeCircle(b.x, b.y, 16 + q * 30);
        }
        // Tide-struck fighters shimmer.
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f) || !inTide(f)) continue;
          g.lineStyle(1.5, LODE_GLINT, 0.6 + 0.3 * Math.sin(time / 70)); g.strokeEllipse(f.x, f.y - 6, 40, 52);
        }
      },

      drawHud(g) {
        // A tiny orbit with the moon's place on it; the perigee end burns bright as it nears.
        const x = W / 2, y = 114;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 44, y - 13, 88, 26, 8);
        g.lineStyle(1.5, NAVY_LIT, 0.9); g.strokeEllipse(x, y, 64, 16);
        g.fillStyle(BRASS_LIT, 0.4 + 0.6 * nearPerigee()); g.fillCircle(x + 32, y, 3);
        g.fillStyle(WHITE, 1); g.fillCircle(x + Math.cos(E) * 32, y + Math.sin(E) * 8, 3.5);
        g.fillStyle(LODE_GLINT, 1); g.fillCircle(x + Math.cos(E) * 32, y + Math.sin(E) * 8, 2);
      },
    };
  },
};

