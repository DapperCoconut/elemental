import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim } from '../../../../../art/IsleArt';
import { Clock, R, RCOL, alive, dist, drawGlint, drawIcicle, jit } from '../util';

/**
 * ICICLE GALLERY — Sculptor Vell.
 *
 * The fight is in the long gallery under the palace's west wing, where Vell keeps her ice
 * statues. Three rafters cross the hall overhead and every one of them is hung with icicles;
 * each icicle throws a shadow on the floor directly beneath it, so you always know what is over
 * your head.
 *
 * Loud hits shake them loose. Whenever either fighter takes a solid blow, the icicles over and
 * around them tremble — their shadows darken — and a moment later they drop, skewering anyone
 * standing in the shadow and leaving a heap of crunching shards. Broken icicles drip and grow back.
 *
 * Vell rings her tuning chisel on a clock: the note sings through the icicles over *you*, so
 * keep your eyes on the shadows. But the hall cannot tell whose hit was whose — land a big one on
 * her while she is under a rafter, and the gallery will finish the job.
 */

interface Icicle {
  x: number;
  /** Ground y of its shadow (the danger spot). */
  gy: number;
  /** Full length when grown. */
  len: number;
  /** 0–1 grown. Only a grown icicle (≥ 0.65) can fall. */
  grow: number;
  state: 'hang' | 'shake' | 'fall';
  fallAt: number;
  seed: number;
}
interface Heap { x: number; y: number; at: number; seed: number }
interface Chime { x: number; y: number; at: number; fireAt: number }

/** How high the rafters hang above the floor, in screen pixels. */
const LOFT = 128;
const SHADOW_R = 30;
const SHAKE_MS = 700;
const DROP_MS = 240;
const HEAP_MS = 5200;
const REGROW_PER_S = 0.11;

export const ICICLE_GALLERY: GimmickDef = {
  id: 'rimefast-icicles',
  rules: 'Icicles hang over the gallery — each shows its shadow below. Loud hits shake loose the ones nearby and they fall on whoever is in the shadow. Vell\'s chisel rings the ones over you.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const icicles: Icicle[] = [];
    const heaps: Heap[] = [];
    const chimes: Chime[] = [];
    const rafters = [top + 152, top + 306, top + 460];
    const damage = ctx.hard ? 22 : 18;
    for (const ry of rafters) {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const x = 70 + ((W - 140) * (i + 0.5)) / count + (rng() - 0.5) * 34;
        icicles.push({ x, gy: ry + (rng() - 0.5) * 12, len: 26 + rng() * 22, grow: 1, state: 'hang', fallAt: 0, seed: rng() * 100 });
      }
    }
    let now = 0;
    let nextChime = -1;
    const chimeEvery = ctx.hard ? 5000 : 6600;

    const shakeNear = (x: number, y: number, r: number): number => {
      let n = 0;
      for (const ic of icicles) {
        if (ic.state !== 'hang' || ic.grow < 0.65) continue;
        if (dist(ic.x, ic.gy, x, y) > r) continue;
        ic.state = 'shake';
        ic.fallAt = now + SHAKE_MS + rng() * 220;
        n++;
      }
      if (n) ctx.sfx('crystal-chime');
      return n;
    };

    /** True while a falling icicle's own damage lands — it does not shake the rest loose. */
    let ownHit = false;
    const onHurt = (f: Fighter, amount: number): void => {
      if (ownHit || amount < 6) return;
      const r = amount >= 15 ? 190 : 130;
      shakeNear(f.x, f.y, r);
    };

    const land = (ic: Icicle): void => {
      ic.state = 'hang';
      ic.grow = 0;
      heaps.push({ x: ic.x, y: ic.gy, at: now, seed: ic.seed });
      if (heaps.length > 20) heaps.shift();
      ctx.sfx('ice-shatter');
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        if (dist(f.x, f.y + 8, ic.x, ic.gy) < SHADOW_R + 10) {
          ownHit = true;
          try { ctx.hit(f, damage, f.x, f.y); } finally { ownHit = false; }
          ctx.float(f.x, f.y - 48, f === ctx.player ? 'SKEWERED' : 'THE GALLERY BITES HER', f === ctx.player ? RCOL.red : RCOL.green);
        }
      }
    };

    const inHeap = (f: Fighter): boolean => heaps.some((h) => now - h.at < HEAP_MS && dist(h.x, h.y, f.x, f.y + 8) < 30);
    const underIcicle = (x: number, y: number, pad = 0): Icicle | null => {
      for (const ic of icicles) {
        if (ic.grow < 0.65) continue;
        if (dist(ic.x, ic.gy, x, y + 8) < SHADOW_R + 8 + pad) return ic;
      }
      return null;
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextChime < 0) nextChime = time + 3800;
        if (dt === 0) return;

        if (time >= nextChime) {
          const p = ctx.player;
          chimes.push({ x: p.x, y: p.y, at: time, fireAt: time + 850 });
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'PING', RCOL.ice);
          ctx.sfx('crystal-chime');
          nextChime = time + chimeEvery * (0.85 + rng() * 0.3);
        }
        for (let i = chimes.length - 1; i >= 0; i--) {
          const c = chimes[i];
          if (time < c.fireAt) continue;
          chimes.splice(i, 1);
          shakeNear(c.x, c.y, 120);
        }

        for (const ic of icicles) {
          if (ic.state === 'shake' && time >= ic.fallAt) { ic.state = 'fall'; ic.fallAt = time + DROP_MS; ctx.sfx('whoosh'); }
          else if (ic.state === 'fall' && time >= ic.fallAt) land(ic);
          else if (ic.state === 'hang' && ic.grow < 1) ic.grow = Math.min(1, ic.grow + REGROW_PER_S * dt);
        }
        while (heaps.length && time - heaps[0].at > HEAP_MS + 500) heaps.shift();
      },

      onPlayerHurt(amount: number) { onHurt(ctx.player, amount); },
      onNpcHurt(amount: number) { onHurt(ctx.npc, amount); },

      playerSpeedMult: () => (inHeap(ctx.player) ? 0.7 : 1),
      npcSpeedMult: () => (inHeap(ctx.npc) ? 0.7 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Out from under anything grown or trembling.
        const ic = underIcicle(n.x, n.y, 14);
        if (!ic) return null;
        // Step to whichever side of the rafter is nearer, clear of the shadow.
        const dy = n.y + 8 - ic.gy;
        const out = dy >= 0 ? SHADOW_R + 40 : -(SHADOW_R + 46);
        return { x: n.x + (n.x >= ic.x ? 18 : -18), y: ic.gy + out };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Statues on plinths along the walls (Vell's work — ice figures in mid-gesture).
        for (let i = 0; i < 4; i++) {
          for (const sx of [34, W - 34]) {
            const y = top + 70 + i * ((H - top - 120) / 3);
            g.fillStyle(R.stoneDark, 1); g.fillRect(sx - 16, y - 2, 32, 10);
            g.fillStyle(R.ice, 0.75); g.fillEllipse(sx, y - 16, 18, 26);
            g.fillStyle(R.ice, 0.75); g.fillCircle(sx, y - 34, 8);
            g.fillStyle(R.glassLit, 0.6); g.fillEllipse(sx - 3, y - 20, 5, 14);
            g.lineStyle(3, R.ice, 0.7); g.lineBetween(sx, y - 24, sx + (jit(i, sx) > 0.5 ? 14 : -14), y - 40 - jit(i + 3, sx) * 8);
          }
        }
        // Shadows on the floor — the readable part of the rule.
        for (const ic of icicles) {
          if (ic.grow < 0.2) continue;
          const shaking = ic.state === 'shake';
          const falling = ic.state === 'fall';
          const k = falling ? 1 - (ic.fallAt - time) / DROP_MS : 0;
          const base = ic.grow >= 0.65 ? 0.26 : 0.1;
          const a = shaking ? 0.36 + Math.sin(time / 35) * 0.1 : falling ? 0.5 + k * 0.3 : base * ic.grow;
          const r = SHADOW_R * (0.5 + ic.grow * 0.5) * (falling ? 0.7 + k * 0.3 : 1);
          g.fillStyle(0x0a1a2a, a); g.fillEllipse(ic.x, ic.gy, r * 1.4, r * 0.62);
          // A sharp sliver for the icicle's own point, lined up under it.
          g.fillStyle(0x0a1a2a, a * 0.9); g.fillTriangle(ic.x - 3, ic.gy, ic.x + 3, ic.gy, ic.x + 1, ic.gy + 12 * ic.grow);
          if (shaking) { g.lineStyle(2, R.frost, 0.65); g.strokeEllipse(ic.x, ic.gy, SHADOW_R * 2.2, SHADOW_R); }
          // Drips from the tip making a little frozen splash ring below.
          const ph = ((time / 1000 + ic.seed) % 2.3) / 2.3;
          if (ic.grow > 0.3 && ph > 0.85) {
            g.lineStyle(1, R.frost, (1 - ph) * 3); g.strokeEllipse(ic.x + 1, ic.gy, (ph - 0.85) * 120, (ph - 0.85) * 40);
          }
        }
        // Heaps of shards where icicles came down.
        for (const h of heaps) {
          const life = 1 - (time - h.at) / HEAP_MS;
          if (life <= 0) continue;
          const a = Math.min(1, life * 2);
          for (let i = 0; i < 9; i++) {
            const ang = jit(h.seed, i) * Math.PI * 2;
            const r = jit(h.seed, i + 20) * 24;
            const x = h.x + Math.cos(ang) * r, y = h.y + Math.sin(ang) * r * 0.45;
            g.fillStyle(R.iceDeep, a); g.fillTriangle(x - 4, y + 2, x + 4, y + 2, x + (jit(h.seed, i + 40) - 0.5) * 8, y - 7);
            g.fillStyle(R.glassLit, a * 0.8); g.fillTriangle(x - 2, y + 1, x, y + 1, x - 1, y - 5);
          }
        }
        // Vell's chime: a singing ring tightening on where you stood.
        for (const c of chimes) {
          const k = Math.min(1, (time - c.at) / (c.fireAt - c.at));
          g.lineStyle(2, R.glass, 0.4 + k * 0.4); g.strokeCircle(c.x, c.y, 120 * (1.35 - k * 0.35));
          g.lineStyle(1, R.glassLit, 0.3); g.strokeCircle(c.x, c.y, 120 * (1.2 - k * 0.2));
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The rafters: frosted timbers spanning the hall, drawn up in the loft.
        for (const ry of rafters) {
          const y = ry - LOFT - 6;
          g.fillStyle(dim(R.timber, 0.4), 0.55); g.fillRect(0, y - 6, W, 14);
          g.fillStyle(R.timber, 0.55); g.fillRect(0, y - 7, W, 10);
          g.fillStyle(R.snow, 0.7); g.fillRect(0, y - 9, W, 3);
          for (let x = 40; x < W; x += 120) {
            g.fillStyle(R.iron, 0.55); g.fillRect(x - 3, y - 7, 6, 12);
          }
        }
        for (const ic of icicles) {
          if (ic.grow <= 0.02) continue;
          const len = ic.len * ic.grow;
          const rootY = ic.gy - LOFT;
          if (ic.state === 'fall') {
            const k = 1 - (ic.fallAt - time) / DROP_MS;
            const y = rootY + k * k * (LOFT - len * 0.5);
            drawIcicle(g, ic.x, y, len, 8 + len * 0.12);
            g.lineStyle(1, R.frost, 0.5); g.lineBetween(ic.x, y - 6, ic.x, y - 34);
            continue;
          }
          const wob = ic.state === 'shake' ? Math.sin(time / 28 + ic.seed) * 3 : 0;
          drawIcicle(g, ic.x, rootY, len, 8 + len * 0.12, 0.95, wob);
          if (ic.state === 'shake' && Math.floor(time / 90) % 2 === 0) drawGlint(g, ic.x + wob, rootY + len * 0.5, 4, 0.8);
        }
      },
    };
  },
};
