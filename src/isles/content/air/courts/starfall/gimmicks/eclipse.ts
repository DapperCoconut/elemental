import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { SF, alive, clamp, dist, makeClock } from '../palette';

/**
 * Eclipse — Umbra the Eclipser.
 *
 * The moon's disc slides across the roof on a long slow pass, and under it lies a round black
 * shadow. Inside the shadow you are *hidden and hushed*: struck blows go astray (you take 40%
 * less) but your voice is gone — basic attack only, every other key locked — as the becalmed
 * lie silent in the Lung. Halfway through each pass comes totality: the count goes up, three,
 * two, one, and the corona flares round the disc, burning everyone who is *not* in the shadow.
 *
 * So the shadow is a shelter you must reach on the count and a gag you want out of the rest of
 * the time. Umbra keeps to the light to cast and slides into the dark on the count. The exploit:
 * shadow-edge fighting — stand on the rim, step in on "one", step out the instant it flares —
 * while crowding Umbra so he has to cross open floor to reach the dark.
 */

interface Pass { ax: number; ay: number; bx: number; by: number; startAt: number; endAt: number; totalAt: number; flared: boolean; counted: number }

export const eclipseGimmick: GimmickDef = {
  id: 'starfall-eclipse',
  rules: 'The moon\'s shadow crosses the floor: inside you take less but can only basic attack. At totality the corona burns everyone outside it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const R = hard ? 112 : 126;
    const PASS_MS = hard ? 9000 : 10500;
    const REST_MS = hard ? 2200 : 2800;
    const FLARE_DMG = hard ? 28 : 22;
    const HIDE = 0.6;
    const mid = (top + H) / 2;

    let pass: Pass | null = null;
    let nextAt = -1;
    let dir = rng() < 0.5 ? 1 : -1;
    let lastHush = 0;
    let flareAt = -9999;
    let now = 0;

    /** Start a pass across the roof: side to side, on a slant that changes each time. */
    const begin = (time: number): void => {
      const y0 = mid + (rng() - 0.5) * (H - top - 260);
      const y1 = mid + (rng() - 0.5) * (H - top - 260);
      const ax = dir > 0 ? -R - 20 : W + R + 20, bx = dir > 0 ? W + R + 20 : -R - 20;
      pass = { ax, ay: y0, bx, by: y1, startAt: time, endAt: time + PASS_MS, totalAt: time + PASS_MS / 2, flared: false, counted: 4 };
      dir = -dir;
      ctx.sfx('hush');
    };

    const discAt = (time: number): Pt | null => {
      if (!pass) return null;
      const k = clamp((time - pass.startAt) / (pass.endAt - pass.startAt), 0, 1);
      return { x: pass.ax + (pass.bx - pass.ax) * k, y: pass.ay + (pass.by - pass.ay) * k };
    };

    const inShadow = (f: Fighter): boolean => {
      const d = discAt(now);
      return !!d && alive(f) && dist(f.x, f.y, d.x, d.y) < R;
    };

    return {
      update(time: number) {
        tick(time);
        now = time;
        if (nextAt < 0) nextAt = time + 1500;
        if (!pass && time >= nextAt) begin(time);
        if (!pass) return;
        // Hushed while in the dark: refreshed in short beats so stepping out frees you at once.
        if (time - lastHush >= 220) {
          lastHush = time;
          for (const f of [ctx.player, ctx.npc]) if (inShadow(f)) ctx.silence(f, 300);
        }
        // The count to totality.
        const toTotal = pass.totalAt - time;
        if (!pass.flared && toTotal <= 3000 && toTotal > 0) {
          const n = Math.ceil(toTotal / 1000);
          if (n < pass.counted) {
            pass.counted = n;
            ctx.banner(`TOTALITY IN ${n}`, '#fff4d0');
            ctx.sfx('countdown-tick');
          }
        }
        if (!pass.flared && time >= pass.totalAt) {
          pass.flared = true;
          flareAt = time;
          ctx.banner('TOTALITY', '#fff4d0');
          ctx.sfx('holy-chord');
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || inShadow(f)) continue;
            ctx.hit(f, FLARE_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'CORONA', '#fff4d0');
          }
        }
        if (time >= pass.endAt) { pass = null; nextAt = time + REST_MS; }
      },

      playerTakenMult: () => (inShadow(ctx.player) ? HIDE : 1),
      npcTakenMult: () => (inShadow(ctx.npc) ? HIDE : 1),

      npcSeek(): Pt | null {
        const d = discAt(now);
        if (!pass || !d) return null;
        const n = ctx.npc;
        const toTotal = pass.totalAt - now;
        // On the count, into the dark — aiming where the disc will be when it flares.
        if (!pass.flared && toTotal < 3300) {
          const k = clamp((pass.totalAt - pass.startAt) / (pass.endAt - pass.startAt), 0, 1);
          return { x: clamp(pass.ax + (pass.bx - pass.ax) * k, 60, W - 60), y: clamp(pass.ay + (pass.by - pass.ay) * k, top + 50, H - 50) };
        }
        // Otherwise out of it, so he can cast.
        if (dist(n.x, n.y, d.x, d.y) < R + 20) {
          const a = Math.atan2(n.y - d.y, n.x - d.x);
          return { x: clamp(d.x + Math.cos(a) * (R + 80), 60, W - 60), y: clamp(d.y + Math.sin(a) * (R + 80), top + 50, H - 50) };
        }
        return null;
      },

      drawGround(g, time) {
        const d = discAt(time);
        if (pass && d) {
          const toTotal = pass.totalAt - time;
          const near = pass.flared ? 0 : clamp(1 - toTotal / 3000, 0, 1);
          // The penumbra, then the umbra: soft grey, then true black at totality.
          g.fillStyle(0x000000, 0.12); g.fillCircle(d.x, d.y, R * 1.35);
          g.fillStyle(0x000000, 0.18); g.fillCircle(d.x, d.y, R * 1.15);
          g.fillStyle(SF.nightDeep, 0.55 + near * 0.35); g.fillCircle(d.x, d.y, R);
          g.lineStyle(2, SF.moon, 0.35 + near * 0.5); g.strokeCircle(d.x, d.y, R);
          // The path it will take, faint, so you can meet it.
          g.lineStyle(1, SF.moon, 0.15);
          g.lineBetween(pass.ax, pass.ay, pass.bx, pass.by);
          // Where totality will happen, marked on the floor until it does.
          if (!pass.flared) {
            const k = clamp((pass.totalAt - pass.startAt) / (pass.endAt - pass.startAt), 0, 1);
            const tx = pass.ax + (pass.bx - pass.ax) * k, ty = pass.ay + (pass.by - pass.ay) * k;
            g.lineStyle(2, SF.corona, 0.25 + near * 0.5);
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * Math.PI * 2 + time / 2000;
              g.beginPath(); g.arc(tx, ty, R, a, a + 0.18); g.strokePath();
            }
          }
        }
        // The corona's burn across the lit floor just after totality.
        const k = (time - flareAt) / 700;
        if (k >= 0 && k < 1 && d) {
          g.fillStyle(SF.corona, 0.35 * (1 - k)); g.fillRect(0, top, W, H - top);
          g.fillStyle(SF.nightDeep, 0.8 * (1 - k)); g.fillCircle(d.x, d.y, R);
        }
      },

      drawAir(g, time) {
        const d = discAt(time);
        if (!pass || !d) return;
        const t = time / 1000;
        const toTotal = pass.totalAt - time;
        const near = pass.flared ? 0 : clamp(1 - toTotal / 3000, 0, 1);
        // The moon itself, high over its shadow (drawn up and faint, so you can see under it).
        const mx = d.x, my = d.y - 46;
        g.fillStyle(SF.moonShade, 0.18); g.fillCircle(mx, my, R * 0.62);
        g.fillStyle(SF.moon, 0.16); g.fillCircle(mx - 6, my - 6, R * 0.56);
        for (const [cx, cy, r] of [[-0.2, -0.15, 0.12], [0.18, 0.1, 0.09], [0.05, -0.3, 0.06], [-0.1, 0.25, 0.07]] as const) {
          g.fillStyle(SF.moonShade, 0.18); g.fillCircle(mx + cx * R, my + cy * R, r * R);
        }
        // The corona: building streamers round the disc as totality nears, a blaze at the flare.
        const since = time - flareAt;
        const blaze = since >= 0 && since < 900 ? 1 - since / 900 : 0;
        const amt = Math.max(near * 0.6, blaze);
        if (amt > 0.02) {
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + Math.sin(t + i) * 0.1;
            const L = R * (0.25 + ((i * 7) % 5) * 0.09) * (0.5 + amt);
            g.lineStyle(3 + amt * 4, SF.corona, 0.6 * amt);
            g.lineBetween(d.x + Math.cos(a) * R, d.y + Math.sin(a) * R, d.x + Math.cos(a) * (R + L), d.y + Math.sin(a) * (R + L));
          }
          g.lineStyle(5 + amt * 8, SF.corona, 0.7 * amt); g.strokeCircle(d.x, d.y, R + 2);
        }
        if (blaze > 0) {
          g.lineStyle(8 * blaze, SF.starHot, blaze); g.strokeCircle(d.x, d.y, R + (1 - blaze) * 400);
        }
        // The hushed: a dark seal over the mouth.
        for (const f of [ctx.player, ctx.npc]) {
          if (!inShadow(f)) continue;
          g.fillStyle(SF.nightDeep, 0.85); g.fillRoundedRect(f.x - 12, f.y - 52, 24, 9, 4);
          g.lineStyle(1.5, SF.moon, 0.8); g.lineBetween(f.x - 8, f.y - 47.5, f.x + 8, f.y - 47.5);
        }
      },

      drawHud(g) {
        if (!pass || pass.flared) return;
        // A sun with the moon's disc sliding over it: how close totality is.
        const toTotal = pass.totalAt - now;
        const k = clamp(1 - toTotal / (pass.totalAt - pass.startAt), 0, 1);
        const x = W / 2, y = top + 16;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 34, y - 14, 68, 28, 10);
        g.fillStyle(SF.corona, 1); g.fillCircle(x, y, 10);
        g.fillStyle(SF.nightDeep, 1); g.fillCircle(x - 22 + k * 22, y, 10);
      },

      destroy() { pass = null; },
    };
  },
};
