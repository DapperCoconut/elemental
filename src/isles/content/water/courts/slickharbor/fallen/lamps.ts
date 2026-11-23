import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CRUDE, FLAME, FLAME_LIT, GILT, GILT_DARK, LAMP_GOLD, LAMP_LIT, SAFETY_RED, SOOT, STEEL_DARK, clamp, dist,
  flameTongue, frameClock, noise, queensLamp, sootPuff,
} from '../util';

/**
 * The Queen's Lamps — Hesper Gill is the Lamplighter of the Long Quay. In the star's telling she is
 * proud of it: the Queen's lamps burn on Slickharbor's tithe oil, and not one has gone out on her
 * round in thirty years. Four of them stand at the corners of her stretch of quay.
 *
 * **Every lit lamp feeds her**: the oil the harbour paid makes her quicker — her cooldowns run
 * faster for each lamp burning. And the lamps **flare**: the one nearest you whitens, its pool of
 * light tightens to a ring, and then the glass blows hot gold across the whole pool.
 *
 * The turn the player can make: **strike a lamp** to snuff it and slow her down — and strike one
 * while she stands in its light and the glass bursts over her. She walks her round to relight them
 * with her taper (striking an unlit lamp relights it at once). At half health the long night shift
 * starts: snuffed lamps relight themselves, and two lamps flare at a time.
 */

const ID = fallenId('slickharbor', 'queens-lamps');
const POOL_R = 112;
const FLARE_WARN = 1000;
const SELF_LIGHT_MS = 7000;

interface Lamp { x: number; y: number; lit: boolean; outAt: number; flareAt: number; tend: number; target: StrikeTarget | null }

function makeLamps(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const flareDmg = 12;
  const burstDmg = 13;
  const lamps: Lamp[] = [
    { x: 150, y: top + 120 }, { x: W - 150, y: top + 120 }, { x: 150, y: H - 64 }, { x: W - 150, y: H - 64 },
  ].map((p) => ({ ...p, lit: true, outAt: 0, flareAt: 0, tend: 0, target: null }));
  let night = false;
  let nextFlare = ctx.scene.time.now + 3000;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const litCount = (): number => lamps.filter((l) => l.lit).length;
  const relight = (l: Lamp): void => { l.lit = true; l.tend = 0; ctx.sfx('flame-burst'); ctx.flash(l.x, l.y - 80, LAMP_GOLD); };

  for (const l of lamps) {
    l.target = ctx.target({
      x: l.x, y: l.y - 34, r: 22,
      onStruck(by) {
        const N = ctx.npc;
        if (by === 'npc') { if (!l.lit) relight(l); return; }
        if (!l.lit) return;
        l.lit = false; l.outAt = ctx.scene.time.now; l.flareAt = 0;
        ctx.sfx('crystal-shatter');
        if (alive(N) && dist(N.x, N.y, l.x, l.y) < POOL_R) {
          ctx.hit(N, burstDmg, N.x, N.y);
          ctx.float(N.x, N.y - 50, 'THE GLASS BURSTS', '#ffc860');
          ctx.flash(N.x, N.y, FLAME_LIT);
        }
      },
    });
  }

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const P = ctx.player, N = ctx.npc;
      if (!night && N.hp < N.maxHp * 0.5) {
        night = true;
        ctx.banner('THE LONG NIGHT SHIFT — the lamps will not stay out', '#ffc860');
        ctx.sfx('holy-chord');
      }
      // Flares: the lit lamp(s) nearest you whiten, then blow their whole pool.
      if (time >= nextFlare && alive(P) && alive(N)) {
        nextFlare = time + (night ? 4400 : 5200);
        const ready = lamps.filter((l) => l.lit && l.flareAt === 0)
          .sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y));
        for (const l of ready.slice(0, night ? 2 : 1)) l.flareAt = time + FLARE_WARN;
        if (ready.length) ctx.sfx('beam-charge');
      }
      for (const l of lamps) {
        if (l.flareAt && time >= l.flareAt) {
          l.flareAt = 0;
          ctx.sfx('light-beam');
          ctx.flash(l.x, l.y - 40, LAMP_LIT);
          for (const f of [P, N]) if (alive(f) && dist(f.x, f.y, l.x, l.y) < POOL_R) ctx.hit(f, flareDmg, f.x, f.y);
        }
        if (l.lit) continue;
        // Her round: standing at a dark lamp with her taper lights it.
        if (alive(N) && dist(N.x, N.y, l.x, l.y) < 50) {
          l.tend += dt;
          if (l.tend >= 0.9) relight(l);
        } else l.tend = Math.max(0, l.tend - dt);
        if (!l.lit && night && time - l.outAt >= SELF_LIGHT_MS) relight(l);
      }
    },

    npcCooldownRate() { return 1 + 0.2 * litCount(); },

    npcSeek(): Pt | null {
      const N = ctx.npc;
      // Out of a pool that is about to blow.
      for (const l of lamps) {
        if (!l.flareAt || dist(N.x, N.y, l.x, l.y) > POOL_R + 10) continue;
        const a = Math.atan2(N.y - l.y, N.x - l.x);
        return { x: clamp(l.x + Math.cos(a) * (POOL_R + 50), 50, W - 50), y: clamp(l.y + Math.sin(a) * (POOL_R + 50), top + 40, H - 40) };
      }
      if (litCount() > 2) return null;
      let best: Lamp | null = null, bd = 1e9;
      for (const l of lamps) if (!l.lit) { const d = dist(N.x, N.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
      return best ? { x: best.x + (best.x < W / 2 ? 26 : -26), y: best.y + (best.y < H / 2 ? 18 : -18) } : null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The Long Quay's stone kerb between the lamps, worn and tide-marked.
      g.lineStyle(3, 0x3a342e, 0.8);
      g.strokeRect(150, top + 120, W - 300, H - 64 - top - 120);
      for (const l of lamps) drawPool(g, l, time, ts);
    },

    drawAir(g, time) {
      const ts = time / 1000;
      for (const l of lamps) {
        queensLamp(g, l.x, l.y, l.lit);
        const hx = l.x, hy = l.y - 76;
        if (l.lit) {
          const warn = l.flareAt ? clamp(1 - (l.flareAt - time) / FLARE_WARN, 0, 1) : 0;
          glow(g, hx, hy, 18 + warn * 26, warn > 0 ? LAMP_LIT : LAMP_GOLD, 0.08 + warn * 0.12, 4);
          if (warn > 0) { g.fillStyle(0xffffff, 0.4 + warn * 0.5); g.fillRect(hx - 6, hy - 6, 12, 12); }
        } else {
          sootPuff(g, hx, hy - 8, (ts * 0.6 + l.x * 0.001) % 1, 6, 0.5);
          if (l.tend > 0) {
            g.lineStyle(2, GILT, 0.9); g.beginPath(); g.arc(hx, hy, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (l.tend / 0.9), false); g.strokePath();
          }
          if (night) {
            const k = clamp((time - l.outAt) / SELF_LIGHT_MS, 0, 1);
            g.fillStyle(FLAME, 0.3 + 0.5 * k * noise(Math.floor(time / 60))); g.fillCircle(hx, hy + 2, 1.5 + k * 3);
          }
        }
      }
      // Hesper's lighting pole: a long brass-hooked staff with a taper burning at its tip.
      const N = ctx.npc;
      if (alive(N)) {
        const bx = N.x + 12, by = N.y - 10, tx = N.x + 30, ty = N.y - 76;
        g.lineStyle(3, 0x4a3420, 1); g.lineBetween(bx, by, tx, ty);
        g.lineStyle(2, GILT, 1); g.beginPath(); g.arc(tx + 5, ty - 2, 5, Math.PI, Math.PI * 2.2, false); g.strokePath();
        flameTongue(g, tx - 1, ty - 2, 10, ts, 3.3);
      }
    },

    drawHud(g) {
      // Her round, on a strip of four lamp-heads, and her pace beside it.
      const x0 = 26, y0 = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 8, y0 - 6, 150, 40, 8);
      lamps.forEach((l, i) => {
        const x = x0 + 8 + i * 26, y = y0 + 6;
        g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 7, y, x + 7, y, x, y - 7);
        g.fillStyle(l.lit ? LAMP_GOLD : 0x2a2a2a, 1); g.fillRect(x - 5, y, 10, 11);
        if (l.lit) { g.fillStyle(LAMP_LIT, 1); g.fillTriangle(x - 2, y + 9, x + 2, y + 9, x, y + 3); }
        if (l.flareAt) { g.lineStyle(2, SAFETY_RED, 1); g.strokeRect(x - 7, y - 2, 14, 15); }
        g.fillStyle(GILT, 1); g.fillRect(x - 6, y + 11, 12, 2);
        g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 1, y + 13, 2, 12);
      });
      const rate = (litCount() * 0.2) / 0.8;
      g.fillStyle(0x1a1410, 1); g.fillRect(x0 + 110, y0 - 1, 10, 30);
      g.fillStyle(FLAME, 1); g.fillRect(x0 + 111, y0 + 28 - 28 * rate, 8, 28 * rate);
    },

    destroy() { for (const l of lamps) l.target?.remove(); },
  };

  /** A lamp's pool of light on the wet stones: warm gold layers, and the tightening ring of a flare. */
  function drawPool(g: G, l: Lamp, time: number, ts: number): void {
    if (!l.lit) {
      g.fillStyle(SOOT, 0.25); g.fillCircle(l.x, l.y, POOL_R * 0.5);
      return;
    }
    const flick = 0.92 + 0.08 * noise(Math.floor(ts * 12) + l.x);
    for (let k = 0; k < 4; k++) { g.fillStyle(LAMP_GOLD, 0.05 * flick); g.fillCircle(l.x, l.y, POOL_R * (1 - k * 0.2)); }
    g.lineStyle(1.5, LAMP_GOLD, 0.25); g.strokeCircle(l.x, l.y, POOL_R);
    // Wet cobbles catching the light.
    for (let i = 0; i < 10; i++) {
      const a = noise(i + l.x) * Math.PI * 2, r = noise(i * 3 + l.y) * POOL_R * 0.85;
      g.fillStyle(LAMP_LIT, 0.12); g.fillEllipse(l.x + Math.cos(a) * r, l.y + Math.sin(a) * r * 0.8, 14, 5);
    }
    g.fillStyle(CRUDE, 0.35); g.fillEllipse(l.x + 20, l.y + 10, 40, 12);
    if (l.flareAt) {
      const c = clamp(1 - (l.flareAt - time) / FLARE_WARN, 0, 1);
      g.fillStyle(LAMP_LIT, 0.1 + c * 0.22); g.fillCircle(l.x, l.y, POOL_R);
      g.lineStyle(3, SAFETY_RED, 0.6 + c * 0.4); g.strokeCircle(l.x, l.y, POOL_R);
      g.lineStyle(2, 0xffffff, 0.7); g.strokeCircle(l.x, l.y, POOL_R * (1 - c) + 8);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + ts;
        g.lineStyle(1.5, FLAME_LIT, 0.4 * c);
        g.lineBetween(l.x + Math.cos(a) * 20, l.y + Math.sin(a) * 14, l.x + Math.cos(a) * POOL_R * c, l.y + Math.sin(a) * POOL_R * c);
      }
    }
  }
}

export const FALLEN_QUEENS_LAMPS: GimmickDef = {
  id: ID,
  rules: 'Each lit lamp speeds Gill\'s cooldowns, and the one nearest you flares its whole pool. Strike a lamp to snuff it; burst one over her.',
  make: makeLamps,
};
