import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import { Clock, S, alive, clamp, dist, jit } from '../util';

/**
 * WICKS IN THE GALE — Fen Gutteridge, Night-Warden (oil).
 *
 * Stormeye's storm lamps are lit at dusk and burn behind thick glass all night; a lit door is a
 * door the gale is never let through. In the star's telling the night-warden goes round with his
 * snuffer and his can of lamp oil and turns down the wicks of the streets in arrears, so that when
 * the gale walks in it knows which doors to take.
 *
 * Six storm lamps stand round the yard, each throwing a pool of light. Every few seconds a gust
 * front gathers at one side of the yard (spray thickens along that edge) and then rolls across it
 * faster than anyone can run. Inside a lamp's light you are sheltered; out in the dark the gust
 * batters you and throws you along with it. Before each gust Gutteridge snuffs one lamp — the one
 * nearest you, guttering first so you can see it go.
 *
 * Lamps are STRUCK to turn them: strike a dark lamp to light it, a lit one to snuff it. Snuff the
 * lamp he is sheltering under just before the front arrives. Past half he turns the wicks up: lit
 * lamps flare, and the flame-hot ring right round the post burns — shelter in the light, not at the
 * lamp.
 */

type Side = 'player' | 'npc';

interface Lamp { x: number; y: number; lit: boolean; guttering: boolean; snuffedAt: number; litAt: number; target: StrikeTarget | null; i: number }

interface Front { dir: 1 | -1; gatherAt: number; goAt: number; hit: Record<Side, boolean>; done: boolean }

const LIGHT_R = 118;
const FLARE_R = 46;
const FRONT_SPEED = 520;

export const FALLEN_WICKS: GimmickDef = {
  id: fallenId('stormeye', 'wicks'),
  rules: 'Gust fronts sweep the yard; only lamplight shelters you. The warden snuffs a lamp before each gust. Strike a lamp to light it or snuff it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const midY = top + (H - top) / 2;
    const spots: Pt[] = [
      { x: 170, y: top + 120 }, { x: W / 2, y: top + 95 }, { x: W - 170, y: top + 120 },
      { x: 170, y: H - 110 }, { x: W / 2, y: H - 85 }, { x: W - 170, y: H - 110 },
    ];
    const lamps: Lamp[] = spots.map((p, i) => ({ x: p.x, y: p.y, lit: true, guttering: false, snuffedAt: -9999, litAt: 0, target: null, i }));
    const gatherMs = ctx.tk.warn(1900);
    let now = 0;
    let front: Front | null = null;
    let nextFront = -1;
    let flare = false;
    let burnAt = 0;
    let dirFlip: 1 | -1 = 1;

    const toggle = (l: Lamp): void => {
      if (now - Math.max(l.snuffedAt, l.litAt) < 350) return;
      l.lit = !l.lit;
      l.guttering = false;
      if (l.lit) { l.litAt = now; ctx.sfx('flame-burst'); } else { l.snuffedAt = now; ctx.sfx('smoke'); }
      ctx.flash(l.x, l.y - 46, l.lit ? S.lamp : S.slateDark);
    };
    for (const l of lamps) l.target = ctx.target({ x: l.x, y: l.y - 30, r: 20, onStruck: () => toggle(l) });

    const lightAt = (x: number, y: number): Lamp | null => {
      for (const l of lamps) if (l.lit && dist(x, y, l.x, l.y) < LIGHT_R) return l;
      return null;
    };
    const frontX = (f: Front, time: number): number => {
      const d = ((time - f.goAt) / 1000) * FRONT_SPEED;
      return f.dir > 0 ? -40 + d : W + 40 - d;
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextFront < 0) nextFront = time + 2200;
        if (dt === 0) return;
        if (!flare && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          flare = true;
          ctx.banner('The wicks are turned up', '#ffd88a');
          ctx.sfx('inferno');
        }

        if (!front && time >= nextFront) {
          front = { dir: dirFlip, gatherAt: time, goAt: time + gatherMs, hit: { player: false, npc: false }, done: false };
          dirFlip = dirFlip > 0 ? -1 : 1;
          // The warden picks the lamp nearest you to gutter — never leaving fewer than three lit.
          if (lamps.filter((l) => l.lit).length > 3) {
            let pick: Lamp | null = null;
            for (const l of lamps) if (l.lit && (!pick || dist(l.x, l.y, ctx.player.x, ctx.player.y) < dist(pick.x, pick.y, ctx.player.x, ctx.player.y))) pick = l;
            if (pick) pick.guttering = true;
          }
          ctx.sfx('gust');
        }
        // A guttering lamp goes out half-way through the gathering.
        if (front) for (const l of lamps) {
          if (l.guttering && time >= front.gatherAt + gatherMs * 0.5) { l.guttering = false; l.lit = false; l.snuffedAt = time; ctx.sfx('smoke'); }
        }
        if (front && time >= front.goAt) {
          const fx = frontX(front, time);
          if (time - front.goAt < 40) ctx.sfx('tornado');
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (front.hit[side] || !alive(f)) continue;
            const passed = front.dir > 0 ? fx >= f.x : fx <= f.x;
            if (!passed) continue;
            front.hit[side] = true;
            if (lightAt(f.x, f.y)) continue;
            ctx.hit(f, 11, f.x, f.y);
            ctx.nudge(f, front.dir * 90, 0);
            ctx.root(f, 350);
            ctx.sfx('hit-medium');
          }
          if (fx < -80 || fx > W + 80) { front = null; nextFront = time + (flare ? 3300 : 4200); }
        }
        // The flare: the ring right round a lit post is hot enough to burn.
        if (flare && time >= burnAt) {
          burnAt = time + 500;
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (!alive(f)) continue;
            for (const l of lamps) if (l.lit && dist(f.x, f.y, l.x, l.y) < FLARE_R) { ctx.hit(f, 4, f.x, f.y); break; }
          }
        }
      },

      npcSeek(): Pt | null {
        if (!front) return null;
        const n = ctx.npc;
        let best: Lamp | null = null;
        for (const l of lamps) {
          if (!l.lit || l.guttering) continue;
          if (!best || dist(l.x, l.y, n.x, n.y) < dist(best.x, best.y, n.x, n.y)) best = l;
        }
        if (!best) return null;
        // Stand in the light but off the hot ring: between the lamp and the middle of the yard.
        const a = Math.atan2(midY - best.y, W / 2 - best.x);
        const off = flare ? 80 : 50;
        return { x: clamp(best.x + Math.cos(a) * off, 50, W - 50), y: clamp(best.y + Math.sin(a) * off, top + 40, H - 40) };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Pools of lamplight on the wet setts, wavering with the flame.
        for (const l of lamps) {
          const k = l.lit ? (l.guttering ? 0.45 + 0.45 * Math.abs(Math.sin(time / 47 + l.i)) : clamp((time - l.litAt) / 300, 0, 1)) : 0;
          if (k > 0) {
            const w = 1 + Math.sin(time / 130 + l.i) * 0.03;
            for (let r = 0; r < 4; r++) { g.fillStyle(S.lamp, (0.05 + r * 0.03) * k); g.fillEllipse(l.x, l.y, LIGHT_R * 2 * w * (1 - r * 0.18), LIGHT_R * 1.5 * w * (1 - r * 0.18)); }
            g.lineStyle(1.5, S.lamp, 0.35 * k); g.strokeEllipse(l.x, l.y, LIGHT_R * 2, LIGHT_R * 1.5);
            // Light caught in the puddles.
            for (let i = 0; i < 3; i++) { g.fillStyle(0xfff0c0, 0.12 * k); g.fillEllipse(l.x + (jit(l.i, i) - 0.5) * 140, l.y + (jit(l.i, i + 5) - 0.5) * 80, 22, 6); }
            if (flare) {
              const p = 0.5 + 0.5 * Math.sin(time / 90 + l.i);
              g.fillStyle(0xff8a3a, 0.16 + 0.1 * p); g.fillCircle(l.x, l.y, FLARE_R);
              g.lineStyle(2, 0xffb060, 0.55 + 0.3 * p); g.strokeCircle(l.x, l.y, FLARE_R);
            }
          } else {
            // A snuffed lamp leaves a spilt-oil stain and nothing else.
            g.fillStyle(0x14181e, 0.4); g.fillEllipse(l.x, l.y + 4, 42, 12);
          }
          g.fillStyle(0x000000, 0.35); g.fillEllipse(l.x, l.y + 3, 24, 8);
        }
        // The gathering: spray and grit thickening along the upwind edge.
        if (front && time < front.goAt) {
          const k = clamp((time - front.gatherAt) / (front.goAt - front.gatherAt), 0, 1);
          const ex = front.dir > 0 ? 0 : W;
          g.fillStyle(S.cloudLit, 0.08 + 0.16 * k); g.fillRect(front.dir > 0 ? 0 : W - 40 - k * 40, top, 40 + k * 40, H - top);
          for (let i = 0; i < 22; i++) {
            const y = top + jit(31, i) * (H - top);
            const x = ex + front.dir * (8 + jit(32, i) * 60 * k) + Math.sin(time / 90 + i) * 4;
            g.lineStyle(2, S.cloudLit, 0.3 + 0.4 * k); g.lineBetween(x, y, x + front.dir * (14 + k * 20), y + 3);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The lamps: iron post, cross-bar and ladder rest, a brass-hooded storm lantern with a glass
        // chimney; flame, oil reservoir, and smoke from a snuffed wick.
        for (const l of lamps) {
          const x = l.x, y = l.y;
          g.fillStyle(0x1e2228, 1); g.fillRect(x - 3, y - 56, 6, 56);
          g.fillStyle(0x30363e, 1); g.fillRect(x - 2, y - 56, 2, 56);
          g.fillStyle(0x1e2228, 1); g.fillRect(x - 12, y - 52, 24, 3); g.fillRect(x - 6, y - 4, 12, 4);
          g.fillStyle(S.brassDark, 1); g.fillRect(x - 9, y - 62, 18, 6);
          g.fillStyle(S.glassDark, 0.9); g.fillRoundedRect(x - 8, y - 82, 16, 22, 4);
          const on = l.lit;
          const flick = l.guttering ? Math.abs(Math.sin(time / 37 + l.i)) : 1;
          if (on) {
            g.fillStyle(S.lamp, 0.35 * flick); g.fillRoundedRect(x - 7, y - 81, 14, 20, 4);
            const fh = (flare ? 15 : 10) * flick;
            g.fillStyle(0xff9a3a, 0.95); g.fillEllipse(x, y - 66 - fh * 0.4, 6, fh);
            g.fillStyle(0xfff4c0, 1); g.fillEllipse(x, y - 65 - fh * 0.3, 3, fh * 0.5);
            g.fillStyle(S.lamp, 0.12 * flick); g.fillCircle(x, y - 70, flare ? 38 : 26);
          } else {
            for (let i = 0; i < 4; i++) {
              const ph = ((time - l.snuffedAt) / 900 + i * 0.25) % 1;
              if (time - l.snuffedAt > 5000 && i > 1) continue;
              g.fillStyle(0x8a909a, 0.35 * (1 - ph)); g.fillCircle(x + Math.sin(ph * 6 + i) * 5, y - 88 - ph * 30, 3 + ph * 6);
            }
          }
          g.fillStyle(S.glass, 0.4); g.fillRect(x - 6, y - 80, 2, 16);
          g.fillStyle(S.brass, 1); g.fillTriangle(x - 11, y - 82, x + 11, y - 82, x, y - 92);
          g.fillStyle(S.brassLit, 1); g.fillRect(x - 2, y - 96, 4, 5);
          g.fillStyle(S.brassDark, 1); g.fillRect(x - 6, y - 61, 12, 3);
        }
        // The front itself: a wall of torn rain and flung slate-grit rolling across.
        if (front && time >= front.goAt) {
          const fx = frontX(front, time);
          for (let i = 0; i < 40; i++) {
            const y = top + jit(51, i) * (H - top);
            const x = fx - front.dir * jit(52, i) * 90;
            g.lineStyle(i % 3 ? 1.5 : 3, i % 4 ? S.cloudLit : S.rain, 0.6); g.lineBetween(x, y, x - front.dir * (30 + jit(53, i) * 40), y - 6);
          }
          g.fillStyle(S.cloudLit, 0.18); g.fillRect(front.dir > 0 ? fx - 60 : fx, top, 60, H - top);
          for (let i = 0; i < 10; i++) { g.fillStyle(S.slateLit, 0.8); g.fillRect(fx - front.dir * jit(54, i) * 40, top + jit(55, i) * (H - top), 4, 3); }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // Six little lanterns, bottom left, and a gust gauge filling as the front gathers.
        const x0 = 22, y0 = H - 24;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 12, y0 - 22, 6 * 22 + 70, 36, 8);
        for (const l of lamps) {
          const x = x0 + l.i * 22;
          g.fillStyle(S.brassDark, 1); g.fillRect(x - 5, y0 - 16, 10, 3);
          g.fillStyle(l.lit ? (l.guttering && Math.floor(time / 90) % 2 ? S.slateLit : S.lamp) : S.slateDark, 1); g.fillRoundedRect(x - 4, y0 - 13, 8, 12, 2);
          g.fillStyle(S.brassDark, 1); g.fillRect(x - 5, y0 - 1, 10, 3);
        }
        const gx = x0 + 6 * 22 + 6;
        const k = front ? (time < front.goAt ? clamp((time - front.gatherAt) / (front.goAt - front.gatherAt), 0, 1) : 1) : 0;
        g.fillStyle(S.slateDark, 1); g.fillRect(gx, y0 - 10, 44, 8);
        g.fillStyle(k >= 1 ? S.bolt : S.cloudLit, 1); g.fillRect(gx, y0 - 10, 44 * k, 8);
        if (front) {
          const ax = front.dir > 0 ? gx + 44 : gx;
          g.fillStyle(S.cloudLit, 1); g.fillTriangle(ax, y0 - 6, ax - front.dir * 7, y0 - 11, ax - front.dir * 7, y0 - 1);
        }
        if (flare) { g.fillStyle(0xff9a3a, 1); g.fillCircle(gx + 22, y0 + 6, 3); }
      },

      destroy() {
        for (const l of lamps) l.target?.remove();
      },
    };
  },
};
