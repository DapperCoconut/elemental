import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { SF, alive, clamp, comet, dist, makeClock, segDist, star } from '../palette';

/**
 * Shooting Stars — Stargazer Vega.
 *
 * Stars fall on the roof all fight long. Each one is called first: a dotted trail is drawn in
 * from the edge of the sky to the spot it will hit, a ring on the flags shows the landing, and
 * the trail brightens as the star comes. Then it streaks in along the trail — whoever stands on
 * the trail as it passes is clipped — and lands in a burst that hurts anyone close. Where it
 * lands it leaves a crater full of stardust, glowing violet, that fades over a few seconds. A
 * fighter standing in stardust is *starlit*: every hit they land is 40% harder.
 *
 * Vega aims about a third of the falls at you and wants the craters for herself. The exploit is
 * that she cannot aim them all: read each trail, step aside, and step into the crater it leaves
 * the moment it lands — or stand so the next trail runs through her.
 */

interface Fall { sx: number; sy: number; x: number; y: number; bornAt: number; strikeAt: number; landAt: number; hit: Set<Fighter>; landed: boolean }
interface Crater { x: number; y: number; bornAt: number; dieAt: number }

export const shootingStarsGimmick: GimmickDef = {
  id: 'starfall-shooting-stars',
  rules: 'Stars fall along drawn trails. Their craters fill with stardust: stand in one and your hits land 40% harder.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const EVERY = hard ? 2050 : 2600;
    const WARN = hard ? 1150 : 1350;
    const STREAK_MS = 320;
    const TRAIL_HALF = 22;
    const BLAST_R = 50;
    const DUST_R = hard ? 64 : 72;
    const DUST_MS = hard ? 6000 : 7000;
    const TRAIL_DMG = hard ? 12 : 10;
    const BLAST_DMG = hard ? 16 : 14;
    const BOOST = 1.4;

    let falls: Fall[] = [];
    let craters: Crater[] = [];
    let nextAt = -1;
    let count = 0;
    let now = 0;

    const fighters = (): Fighter[] => [ctx.player, ctx.npc];
    const starlit = (f: Fighter): boolean => alive(f) && craters.some((c) => now >= c.bornAt && now < c.dieAt && dist(f.x, f.y, c.x, c.y) < DUST_R);

    /** Pick where the next star lands: some at you, some at her, the rest anywhere. */
    const announce = (): void => {
      const pick = count % 3;
      count++;
      let tx: number, ty: number;
      const p = ctx.player, n = ctx.npc;
      if (pick === 0 && alive(p)) { tx = p.x + (rng() - 0.5) * 90; ty = p.y + (rng() - 0.5) * 70; }
      else if (pick === 1 && alive(n) && rng() < 0.55) { tx = n.x + (rng() - 0.5) * 120; ty = n.y + (rng() - 0.5) * 90; }
      else { tx = 90 + rng() * (W - 180); ty = top + 80 + rng() * (H - top - 150); }
      tx = clamp(tx, 70, W - 70); ty = clamp(ty, top + 60, H - 60);
      // It comes in from a high corner of the sky — a long, readable diagonal.
      const fromLeft = tx > W / 2 ? rng() < 0.75 : rng() < 0.25;
      const sx = fromLeft ? -40 : W + 40;
      const sy = top - 20 + rng() * 160;
      falls.push({ sx, sy, x: tx, y: ty, bornAt: now, strikeAt: now + WARN, landAt: now + WARN + STREAK_MS, hit: new Set(), landed: false });
      ctx.sfx('beam-charge');
    };

    return {
      update(time: number) {
        tick(time);
        now = time;
        if (nextAt < 0) nextAt = time + 1400;
        if (time >= nextAt) { announce(); nextAt = time + EVERY; }
        for (const f of falls) {
          if (time >= f.strikeAt && !f.landed) {
            // The head runs from the edge to the landing spot; anyone on the run behind it is clipped.
            const k = clamp((time - f.strikeAt) / STREAK_MS, 0, 1);
            const hx = f.sx + (f.x - f.sx) * k, hy = f.sy + (f.y - f.sy) * k;
            for (const fi of fighters()) {
              if (!alive(fi) || f.hit.has(fi)) continue;
              if (segDist(fi.x, fi.y, f.sx, f.sy, hx, hy) < TRAIL_HALF) {
                f.hit.add(fi);
                ctx.hit(fi, TRAIL_DMG, fi.x, fi.y);
                ctx.float(fi.x, fi.y - 46, 'CLIPPED', '#8fe3ff');
              }
            }
          }
          if (!f.landed && time >= f.landAt) {
            f.landed = true;
            ctx.sfx('meteor');
            ctx.flash(f.x, f.y, SF.dust);
            for (const fi of fighters()) {
              if (alive(fi) && !f.hit.has(fi) && dist(fi.x, fi.y, f.x, f.y) < BLAST_R) ctx.hit(fi, BLAST_DMG, fi.x, fi.y);
            }
            craters.push({ x: f.x, y: f.y, bornAt: time + 150, dieAt: time + 150 + DUST_MS });
            if (craters.length > 3) craters.shift();
          }
        }
        falls = falls.filter((f) => time < f.landAt + 500);
        craters = craters.filter((c) => time < c.dieAt);
      },

      // Starlit hits land harder: your stardust is the foe's damage taken, and hers is yours.
      playerTakenMult: () => (starlit(ctx.npc) ? BOOST : 1),
      npcTakenMult: () => (starlit(ctx.player) ? BOOST : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Off any live trail or landing ring first.
        for (const f of falls) {
          if (f.landed) continue;
          const onTrail = segDist(n.x, n.y, f.sx, f.sy, f.x, f.y) < TRAIL_HALF + 26;
          const onLanding = dist(n.x, n.y, f.x, f.y) < BLAST_R + 26;
          if (!onTrail && !onLanding) continue;
          // Step perpendicular to the trail, toward the middle of the roof.
          const a = Math.atan2(f.y - f.sy, f.x - f.sx) + Math.PI / 2;
          const s = (W / 2 - n.x) * Math.cos(a) + ((top + H) / 2 - n.y) * Math.sin(a) >= 0 ? 1 : -1;
          return { x: clamp(n.x + Math.cos(a) * s * 110, 60, W - 60), y: clamp(n.y + Math.sin(a) * s * 110, top + 50, H - 50) };
        }
        // Then into the freshest dust nobody is about to hit.
        let best: Crater | null = null, bestD = Infinity;
        for (const c of craters) {
          if (now < c.bornAt || c.dieAt - now < 1200) continue;
          if (falls.some((f) => !f.landed && dist(c.x, c.y, f.x, f.y) < BLAST_R + 40)) continue;
          const d = dist(n.x, n.y, c.x, c.y);
          if (d < bestD && d < 520) { bestD = d; best = c; }
        }
        return best ? { x: best.x, y: best.y } : null;
      },

      drawGround(g, time) {
        const t = time / 1000;
        // Craters: black glass bowls, the dust in them glittering as it settles and fades.
        for (const c of craters) {
          const life = clamp((c.dieAt - time) / DUST_MS, 0, 1);
          const grow = clamp((time - c.bornAt + 150) / 250, 0, 1);
          g.fillStyle(0x000000, 0.3 * grow); g.fillEllipse(c.x + 3, c.y + 5, DUST_R * 1.6, DUST_R * 0.95);
          g.fillStyle(SF.glass, 0.85 * grow); g.fillEllipse(c.x, c.y, DUST_R * 1.25 * grow, DUST_R * 0.75 * grow);
          g.fillStyle(SF.violet, (0.15 + 0.3 * life) * grow); g.fillEllipse(c.x, c.y, DUST_R * 2 * grow, DUST_R * 1.2 * grow);
          g.lineStyle(2, SF.dust, (0.3 + 0.5 * life) * grow); g.strokeEllipse(c.x, c.y, DUST_R * 2, DUST_R * 1.2);
          // The life ring: how long the dust lasts.
          g.lineStyle(2.5, SF.starGold, 0.8); g.beginPath(); g.arc(c.x, c.y, DUST_R * 0.35, -Math.PI / 2, -Math.PI / 2 + life * Math.PI * 2); g.strokePath();
          for (let i = 0; i < 9; i++) {
            const a = i * 0.7 + c.x;
            const r = DUST_R * (0.25 + ((i * 37) % 10) / 14);
            const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.3);
            star(g, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.58, 2 + tw * 2.5, SF.dust, (0.4 + 0.6 * life) * tw);
          }
        }
        // Trails: dotted from the sky's edge, brightening as the star comes; the landing ring.
        for (const f of falls) {
          if (f.landed) continue;
          const k = clamp((time - f.bornAt) / (f.strikeAt - f.bornAt), 0, 1);
          const len = Math.hypot(f.x - f.sx, f.y - f.sy);
          const ux = (f.x - f.sx) / len, uy = (f.y - f.sy) / len;
          for (let d = 0; d < len; d += 18) {
            const ph = ((d / 18 - time / 60) % 4 + 4) % 4;
            g.fillStyle(SF.comet, (0.15 + k * 0.55) * (ph < 1 ? 1 : 0.45));
            g.fillCircle(f.sx + ux * d, f.sy + uy * d, 2.2 + k * 1.2);
          }
          g.lineStyle(1, SF.comet, 0.12 + k * 0.25);
          g.lineBetween(f.sx - uy * TRAIL_HALF, f.sy + ux * TRAIL_HALF, f.x - uy * TRAIL_HALF, f.y + ux * TRAIL_HALF);
          g.lineBetween(f.sx + uy * TRAIL_HALF, f.sy - ux * TRAIL_HALF, f.x + uy * TRAIL_HALF, f.y - ux * TRAIL_HALF);
          g.fillStyle(SF.violet, 0.08 + k * 0.2); g.fillEllipse(f.x, f.y, BLAST_R * 2, BLAST_R * 1.25);
          g.lineStyle(2, SF.starGold, 0.4 + k * 0.5); g.strokeEllipse(f.x, f.y, BLAST_R * 2 * (1.4 - k * 0.4), BLAST_R * 1.25 * (1.4 - k * 0.4));
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        // The streaking star, and the splash of light where it lands.
        for (const f of falls) {
          if (time >= f.strikeAt && !f.landed) {
            const k = clamp((time - f.strikeAt) / STREAK_MS, 0, 1);
            const a = Math.atan2(f.y - f.sy, f.x - f.sx);
            comet(g, f.sx + (f.x - f.sx) * k, f.sy + (f.y - f.sy) * k, a, 140, 9, t);
          } else if (f.landed) {
            const k = clamp((time - f.landAt) / 500, 0, 1);
            g.lineStyle(4 * (1 - k), SF.starHot, 1 - k); g.strokeCircle(f.x, f.y, BLAST_R * (0.4 + k));
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              g.fillStyle(SF.dust, 1 - k); g.fillCircle(f.x + Math.cos(a) * BLAST_R * k * 1.4, f.y + Math.sin(a) * BLAST_R * k * 0.9 - k * 20, 2.5);
            }
          } else {
            // The star itself, high in the corner, gathering before it comes.
            const k = clamp((time - f.bornAt) / (f.strikeAt - f.bornAt), 0, 1);
            star(g, clamp(f.sx, 14, W - 14), clamp(f.sy, top + 10, H - 10), 6 + k * 10, SF.star, 0.5 + k * 0.5);
          }
        }
        // Starlit fighters: a crown of motes circling over them.
        for (const fi of [ctx.player, ctx.npc]) {
          if (!starlit(fi)) continue;
          for (let i = 0; i < 5; i++) {
            const a = t * 2.4 + (i / 5) * Math.PI * 2;
            star(g, fi.x + Math.cos(a) * 22, fi.y - 40 + Math.sin(a) * 6, 4, SF.starGold, 0.9);
          }
        }
      },

      drawHud(g) {
        // A star for each side, lit while that side stands in stardust.
        const pip = (x: number, on: boolean): void => {
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, top + 14, 11);
          star(g, x, top + 14, on ? 10 : 6, on ? SF.starGold : SF.stoneMid, on ? 1 : 0.6);
        };
        pip(W / 2 - 40, starlit(ctx.player));
        pip(W / 2 + 40, starlit(ctx.npc));
      },

      destroy() { falls = []; craters = []; },
    };
  },
};
