import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, R, RCOL, alive, dist, drawBrazier, drawBrazierFlame, drawGlint, jit } from '../util';

/**
 * FROSTBITE — Trapper Tarn.
 *
 * Out on the frozen market square the cold is the third fighter. Each of you carries a cold
 * meter that fills while you stand still and while you are far from a burning brazier; standing
 * in a brazier's warmth drains it. Fill it and you freeze solid for a moment — rooted, and brittle
 * enough that hits on you land harder.
 *
 * There are four licensed braziers on the square. Walk into a lit one and you kick it over: it
 * goes out. Stand beside a dead one for a moment and you strike it alight again. Tarn wears his
 * furs (the cold takes him slower) and plays the braziers like traps — whichever one is keeping
 * you warm, he walks over and boots it.
 *
 * So boot his. Kick out the brazier he is warming at, light the ones on your side, and keep him
 * pinned in a cold corner until he locks up.
 */

type Side = 'player' | 'npc';

interface Brazier { x: number; y: number; lit: boolean; changedAt: number; lightProgress: number; seed: number }
interface Ember { x: number; y: number; vx: number; vy: number; at: number }

interface Body {
  side: Side;
  cold: number;
  frozenUntil: number;
  holdX: number; holdY: number;
  /** Rolling anchor for "standing still". */
  ax: number; ay: number; anchorAt: number;
  still: boolean;
  warm: boolean;
  /** The brazier this fighter just lit — they cannot boot it until they have stepped away. */
  guard: Brazier | null;
}

const WARM_R = 150;
const KICK_R = 24;
const LIGHT_R = 46;
const LIGHT_MS = 1400;
const FREEZE_MS = 1350;

export const FROSTBITE: GimmickDef = {
  id: 'rimefast-frostbite',
  rules: 'A cold meter fills while you stand still or stray from a lit brazier; full, you freeze solid. Walk into a brazier to kick it out — stand by a dead one to relight it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const inset = 190;
    const braziers: Brazier[] = [
      { x: inset, y: top + 120 }, { x: W - inset, y: top + 120 },
      { x: inset, y: H - 100 }, { x: W - inset, y: H - 100 },
    ].map((p, i) => ({ ...p, lit: true, changedAt: -9999, lightProgress: 0, seed: i * 13.7 }));
    if (ctx.hard) braziers.forEach((b, i) => { if (i % 2 === 1) b.lit = false; });
    const embers: Ember[] = [];
    const bodies: Body[] = (['player', 'npc'] as Side[]).map((side) => ({
      side, cold: 0.15, frozenUntil: 0, holdX: 0, holdY: 0, ax: 0, ay: 0, anchorAt: -1, still: false, warm: false, guard: null,
    }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const bodyOf = (s: Side): Body => bodies[s === 'player' ? 0 : 1];
    let now = 0;

    const nearestLit = (x: number, y: number): Brazier | null => {
      let best: Brazier | null = null, bd = Infinity;
      for (const b of braziers) {
        if (!b.lit) continue;
        const d = dist(b.x, b.y, x, y);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    };

    const kick = (b: Brazier, s: Side): void => {
      b.lit = false;
      b.changedAt = now;
      b.lightProgress = 0;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        embers.push({ x: b.x, y: b.y - 20, vx: Math.cos(a) * (60 + jit(b.seed, i) * 90), vy: Math.sin(a) * 50 - 40, at: now });
      }
      ctx.sfx('sizzle');
      ctx.float(b.x, b.y - 54, s === 'player' ? 'KICKED OUT' : 'TARN BOOTS IT', s === 'player' ? RCOL.warm : RCOL.red);
    };

    const light = (b: Brazier, s: Side): void => {
      b.lit = true;
      b.changedAt = now;
      b.lightProgress = 0;
      bodyOf(s).guard = b;
      ctx.sfx('flame-burst');
      ctx.float(b.x, b.y - 54, 'ALIGHT', RCOL.hot);
    };

    const step = (bd: Body, dt: number): void => {
      const f = fighterOf(bd.side);
      if (!alive(f)) return;
      if (bd.anchorAt < 0) { bd.ax = f.x; bd.ay = f.y; bd.anchorAt = now; }
      if (bd.frozenUntil > now) {
        ctx.nudge(f, bd.holdX - f.x, bd.holdY - f.y);
        return;
      }
      // "Still" means you have not got 26px from where you were 0.6 seconds ago.
      if (dist(f.x, f.y, bd.ax, bd.ay) > 26) { bd.ax = f.x; bd.ay = f.y; bd.anchorAt = now; bd.still = false; }
      else bd.still = now - bd.anchorAt > 600;

      const lit = nearestLit(f.x, f.y);
      bd.warm = !!lit && dist(lit.x, lit.y, f.x, f.y) < WARM_R;
      const furs = bd.side === 'npc' ? 0.6 : 1;
      let rate: number;
      if (bd.warm) rate = -0.3;
      else rate = (0.05 + (bd.still ? 0.13 : 0) + 0.07) * furs * (ctx.hard ? 1.15 : 1);
      if (bd.warm && bd.still) rate = -0.38;
      bd.cold = Math.max(0, Math.min(1, bd.cold + rate * dt));
      if (bd.cold >= 1) {
        bd.frozenUntil = now + FREEZE_MS;
        bd.holdX = f.x; bd.holdY = f.y;
        bd.cold = 0.4;
        ctx.stun(f, FREEZE_MS);
        ctx.sfx('status-freeze');
        ctx.flash(f.x, f.y, R.frost);
        ctx.float(f.x, f.y - 50, bd.side === 'player' ? 'FROZEN SOLID' : 'TARN FREEZES!', bd.side === 'player' ? RCOL.red : RCOL.green);
      }

      // Braziers: walk into a lit one to boot it; stand by a dead one to light it.
      if (bd.guard && dist(bd.guard.x, bd.guard.y, f.x, f.y) > LIGHT_R + 12) bd.guard = null;
      for (const b of braziers) {
        const d = dist(b.x, b.y, f.x, f.y);
        if (b.lit && d < KICK_R && bd.guard !== b && now - b.changedAt > 500) kick(b, bd.side);
        else if (!b.lit && d < LIGHT_R && now - b.changedAt > 600) {
          b.lightProgress += dt * 1000;
          if (b.lightProgress >= LIGHT_MS) light(b, bd.side);
        }
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        for (const b of braziers) {
          // A half-struck light goes cold again if nobody is nursing it.
          const nursing = bodies.some((bd) => alive(fighterOf(bd.side)) && dist(b.x, b.y, fighterOf(bd.side).x, fighterOf(bd.side).y) < LIGHT_R);
          if (!b.lit && !nursing) b.lightProgress = Math.max(0, b.lightProgress - dt * 2000);
        }
        for (const bd of bodies) step(bd, dt);
        for (const e of embers) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 140 * dt; e.vx *= Math.pow(0.2, dt); }
        while (embers.length && time - embers[0].at > 1300) embers.shift();
      },

      playerSpeedMult: () => 1 - bodyOf('player').cold * 0.18,
      npcSpeedMult: () => 1 - bodyOf('npc').cold * 0.18,
      playerTakenMult: () => (bodyOf('player').frozenUntil > now ? 1.3 : 1),
      npcTakenMult: () => (bodyOf('npc').frozenUntil > now ? 1.3 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        const me = bodyOf('npc'), you = bodyOf('player');
        // Getting cold himself: warm up at the edge of the nearest fire (not in it — he knows).
        if (me.cold > 0.62) {
          const b = nearestLit(n.x, n.y);
          if (b) {
            const a = Math.atan2(n.y - b.y, n.x - b.x);
            return { x: b.x + Math.cos(a) * 70, y: b.y + Math.sin(a) * 70 };
          }
        }
        // You are warming at a brazier: he goes and boots it.
        if (you.warm) {
          const b = nearestLit(p.x, p.y);
          if (b && dist(b.x, b.y, p.x, p.y) < WARM_R + 20) return { x: b.x, y: b.y };
        }
        // You are frozen: walk in for the free hits.
        if (you.frozenUntil > now) return { x: p.x + 60, y: p.y };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const b of braziers) {
          // A melted ring round each lit brazier: wet stone showing through the frost.
          if (b.lit) {
            g.fillStyle(R.water, 0.18); g.fillCircle(b.x, b.y, WARM_R * 0.55);
            g.lineStyle(2, R.ember, 0.18 + Math.sin(t * 2 + b.seed) * 0.06); g.strokeCircle(b.x, b.y, WARM_R);
            for (let i = 0; i < 18; i++) {
              const a = (i / 18) * Math.PI * 2 + t * 0.05;
              g.fillStyle(R.ember, 0.22); g.fillCircle(b.x + Math.cos(a) * WARM_R, b.y + Math.sin(a) * WARM_R, 2);
            }
          } else {
            // Cold ring: rime spreading back over the stones.
            g.lineStyle(1.5, R.frost, 0.3); g.strokeCircle(b.x, b.y, LIGHT_R);
            if (b.lightProgress > 0) {
              g.lineStyle(4, R.emberHot, 0.85);
              g.beginPath(); g.arc(b.x, b.y, LIGHT_R, -Math.PI / 2, -Math.PI / 2 + (b.lightProgress / LIGHT_MS) * Math.PI * 2, false); g.strokePath();
            }
          }
          drawBrazier(g, b.x, b.y, b.lit ? 1 : 0);
          if (!b.lit) {
            // Tipped: spilled black coals on the frost, still smoking for a moment.
            for (let i = 0; i < 6; i++) { g.fillStyle(0x141010, 0.9); g.fillCircle(b.x + 16 + jit(b.seed, i) * 22, b.y + 6 + jit(b.seed, i + 9) * 10, 2.5); }
            const s = 1 - (time - b.changedAt) / 2500;
            if (s > 0) for (let i = 0; i < 3; i++) {
              const ph = ((t * 0.8 + i * 0.33) % 1);
              g.fillStyle(0x6a6a70, 0.3 * s * (1 - ph)); g.fillCircle(b.x + Math.sin(t + i) * 6, b.y - 26 - ph * 40, 5 + ph * 8);
            }
          }
        }
        // Frost creeping on whoever is cold — a pale rime ring on the ground at their feet.
        for (const bd of bodies) {
          const f = fighterOf(bd.side);
          if (!alive(f) || bd.cold < 0.3) continue;
          g.lineStyle(2, R.frost, (bd.cold - 0.3) * 0.9); g.strokeEllipse(f.x, f.y + 16, 46 + bd.cold * 20, 14 + bd.cold * 6);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = 18 + bd.cold * 18;
            g.lineStyle(1, R.frost, (bd.cold - 0.3) * 0.8);
            g.lineBetween(f.x + Math.cos(a) * r * 0.5, f.y + 16 + Math.sin(a) * r * 0.2, f.x + Math.cos(a) * r, f.y + 16 + Math.sin(a) * r * 0.36);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const b of braziers) drawBrazierFlame(g, b.x, b.y, t, b.lit ? Math.min(1, (time - b.changedAt) / 400) : 0);
        for (const e of embers) {
          const a = 1 - (time - e.at) / 1300;
          g.fillStyle(R.emberHot, Math.max(0, a)); g.fillCircle(e.x, e.y, 2);
        }
        // Each fighter's cold as a little ice-blue gauge over the head, and a block when frozen.
        for (const bd of bodies) {
          const f = fighterOf(bd.side);
          if (!alive(f)) continue;
          if (bd.frozenUntil > time) {
            g.fillStyle(R.ice, 0.45); g.fillRoundedRect(f.x - 28, f.y - 36, 56, 62, 6);
            g.lineStyle(2, R.glassLit, 0.85); g.strokeRoundedRect(f.x - 28, f.y - 36, 56, 62, 6);
            drawGlint(g, f.x - 14, f.y - 26, 5, 0.8);
            continue;
          }
          if (bd.side === 'player' || bd.cold < 0.05) continue;
          const x = f.x - 20, y = f.y - 44;
          g.fillStyle(0x000000, 0.45); g.fillRect(x - 1, y - 1, 42, 6);
          g.fillStyle(bd.cold > 0.75 ? R.frost : R.iceDeep, 1); g.fillRect(x, y, 40 * bd.cold, 4);
        }
        if (bodyOf('player').warm) {
          // Heat shimmer over you while you warm.
          for (let i = 0; i < 3; i++) {
            const ph = ((t * 0.9 + i * 0.33) % 1);
            g.lineStyle(1.5, R.emberHot, 0.35 * (1 - ph));
            g.lineBetween(ctx.player.x - 10 + i * 10, ctx.player.y - 30 - ph * 26, ctx.player.x - 8 + i * 10, ctx.player.y - 38 - ph * 26);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        const me = bodyOf('player');
        // Frost eating in from the screen edges as you chill.
        if (me.cold > 0.4) {
          const k = (me.cold - 0.4) / 0.6;
          const depth = 30 + k * 60;
          g.fillStyle(R.frost, 0.16 * k);
          g.fillRect(0, top, W, depth * 0.5); g.fillRect(0, H - depth * 0.5, W, depth * 0.5);
          g.fillRect(0, top, depth * 0.5, H - top); g.fillRect(W - depth * 0.5, top, depth * 0.5, H - top);
          for (let i = 0; i < 16; i++) {
            const x = jit(3, i) * W, edge = i % 2 ? top + 4 : H - 4;
            drawGlint(g, x, edge + (i % 2 ? 1 : -1) * depth * 0.3, 4 + k * 4, 0.4 * k);
          }
        }
        // The thermometer: bottom-left, a glass tube that drains from warm to blue.
        const x = 22, y = H - 130;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 9, y - 6, 18, 112, 8);
        g.fillStyle(R.glassLit, 0.25); g.fillRoundedRect(x - 6, y - 3, 12, 100, 6);
        const fill = 1 - me.cold;
        const c = me.cold > 0.75 ? R.frost : fill > 0.5 ? R.ember : R.iceDeep;
        g.fillStyle(c, 0.95); g.fillRect(x - 4, y + 2 + (1 - fill) * 88, 8, fill * 88);
        g.fillStyle(c, 1); g.fillCircle(x, y + 102, 9);
        if (me.cold > 0.8 && Math.floor(time / 200) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(x, y + 102, 12); }
      },
    };
  },
};
