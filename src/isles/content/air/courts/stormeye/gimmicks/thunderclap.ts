import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, S, SCOL, alive, clamp, dist, drawBolt, drawCloud, jit } from '../util';

/**
 * THUNDERCLAP — Clapper Boom.
 *
 * Every few seconds a cloud gathers low over one spot of the yard — a forked mark scorches into
 * the setts under it, with a wide ring round it painted with three ticks. Then the FLASH: a bolt
 * into the mark (stand on it and it hits you outright). And after the flash, its thunder — a
 * shockwave rolling out from the strike at the speed of sound, while the yard counts it in: ONE,
 * TWO, THREE. Inside the ring (the count of three) the thunder is a wall that knocks you flat and
 * stuns you. Past it, it is only a grumble.
 *
 * Sound is quicker than you, but not by much: from any decent distance you can outrun the loud
 * part, and with the gathering to warn you, you can be clear before the flash. Boom calls the
 * strikes in turn — at you, at himself, at the open yard — and he is as deafened by them as anyone.
 * Run when he does not, and he will be standing still when you reach him.
 */

type Side = 'player' | 'npc';

interface Strike {
  x: number; y: number;
  at: number; flashAt: number;
  flashed: boolean;
  hit: Record<Side, boolean>;
  seed: number;
  counted: number;
}

const LOUD_R = 330;
const SOUND = 250;
const DIRECT_R = 48;

export const THUNDERCLAP: GimmickDef = {
  id: 'stormeye-thunderclap',
  rules: 'Lightning gathers over a mark, then flashes. Its thunder rolls out from the strike faster than you walk — inside the three-count ring it stuns whoever it catches. Get clear of the ring before it reaches you.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const every = ctx.hard ? 3400 : 4300;
    const gather = ctx.tk.warn(1150);
    const stunMs = ctx.hard ? 1100 : 900;
    let now = 0;
    let nextAt = -1;
    let turn = 0;
    let strikes: Strike[] = [];
    let flashAt = -9999;

    const call = (): void => {
      // In turn: at you, at himself, at the open yard (on hard, sometimes two at once).
      const who = turn % 3;
      turn++;
      const spot = (base: Fighter | null): Pt => {
        if (!base || !alive(base)) return { x: 120 + rng() * (W - 240), y: top + 70 + rng() * (H - top - 120) };
        const a = rng() * Math.PI * 2, d = 40 + rng() * 60;
        return { x: clamp(base.x + Math.cos(a) * d, 70, W - 70), y: clamp(base.y + Math.sin(a) * d, top + 50, H - 40) };
      };
      const pts: Pt[] = [spot(who === 0 ? ctx.player : who === 1 ? ctx.npc : null)];
      if (ctx.hard && who === 2) pts.push(spot(ctx.player));
      for (const p of pts) {
        strikes.push({ x: p.x, y: p.y, at: now, flashAt: now + gather, flashed: false, hit: { player: false, npc: false }, seed: rng() * 100, counted: 0 });
      }
      ctx.sfx('electric-charge');
    };

    const radiusOf = (s: Strike, time: number): number => (time < s.flashAt ? 0 : ((time - s.flashAt) / 1000) * SOUND);

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextAt < 0) nextAt = time + 2000;
        if (dt === 0) return;
        if (time >= nextAt) { call(); nextAt = time + every; }
        for (const s of strikes) {
          if (!s.flashed && time >= s.flashAt) {
            s.flashed = true;
            flashAt = time;
            ctx.sfx('thunder');
            for (const side of ['player', 'npc'] as Side[]) {
              const f = fighterOf(side);
              if (alive(f) && dist(f.x, f.y, s.x, s.y) < DIRECT_R) {
                ctx.hit(f, ctx.hard ? 16 : 13, f.x, f.y);
                ctx.flash(f.x, f.y, S.bolt);
              }
            }
          }
          if (!s.flashed) continue;
          const r = radiusOf(s, time);
          // The count, called as the thunder rolls out.
          const step = Math.floor((r / LOUD_R) * 3);
          if (step > s.counted && s.counted < 3) {
            s.counted = step;
            const words = ['ONE', 'TWO', 'THREE'];
            ctx.float(s.x, s.y - 30 - s.counted * 16, words[Math.min(2, s.counted - 1)], s.counted === 3 ? SCOL.bolt : SCOL.violet);
            if (s.counted === 3) ctx.sfx('drum-hit');
          }
          if (r > LOUD_R) continue;
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (s.hit[side] || !alive(f)) continue;
            const d = dist(f.x, f.y, s.x, s.y);
            // Caught by the front itself — the band of shoved air, not the quiet behind it.
            if (d <= r && r - d < 26 && d < LOUD_R) {
              s.hit[side] = true;
              ctx.hit(f, ctx.hard ? 8 : 6, f.x, f.y);
              ctx.stun(f, stunMs);
              ctx.sfx('sonic-pulse');
              ctx.float(f.x, f.y - 56, side === 'player' ? 'THUNDERSTRUCK' : 'BOOM IS DEAFENED', side === 'player' ? SCOL.red : SCOL.green);
            }
          }
        }
        strikes = strikes.filter((s) => !s.flashed || radiusOf(s, time) < 700);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Run directly away from any strike whose loud ring still has him.
        for (const s of strikes) {
          const r = radiusOf(s, now);
          if (r > LOUD_R) continue;
          const d = dist(n.x, n.y, s.x, s.y);
          if (d > LOUD_R + 20 || (s.flashed && d < r)) continue;
          const a = Math.atan2(n.y - s.y, n.x - s.x);
          return { x: clamp(s.x + Math.cos(a) * (LOUD_R + 60), 60, W - 60), y: clamp(s.y + Math.sin(a) * (LOUD_R + 60), top + 40, H - 40) };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        for (const s of strikes) {
          const k = clamp((time - s.at) / (s.flashAt - s.at), 0, 1);
          const r = radiusOf(s, time);
          // The loud ring: where the count of three ends, ticked at one and two.
          if (r < LOUD_R) {
            g.lineStyle(2, S.boltGlow, 0.25 + k * 0.35); g.strokeCircle(s.x, s.y, LOUD_R);
            for (let c = 1; c <= 3; c++) {
              const rr = (LOUD_R * c) / 3;
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + c * 0.3;
                g.fillStyle(S.boltGlow, 0.3 + k * 0.3); g.fillCircle(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr, c === 3 ? 3 : 2);
              }
            }
          }
          if (!s.flashed) {
            // The mark: a forked scorch burning into the setts, and the darkness of the cloud above.
            g.fillStyle(0x000000, 0.1 + k * 0.3); g.fillEllipse(s.x, s.y, DIRECT_R * 2.4, DIRECT_R * 1.2);
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2 + jit(s.seed, i) * 0.5;
              const L = (DIRECT_R + jit(s.seed, i + 6) * 20) * k;
              const mx = s.x + Math.cos(a + 0.25) * L * 0.5, my = s.y + Math.sin(a + 0.25) * L * 0.25;
              g.lineStyle(2, S.boltGlow, 0.4 + k * 0.5);
              g.lineBetween(s.x, s.y, mx, my); g.lineBetween(mx, my, s.x + Math.cos(a) * L, s.y + Math.sin(a) * L * 0.5);
            }
            g.lineStyle(2.5, S.bolt, 0.5 + k * 0.4); g.strokeEllipse(s.x, s.y, DIRECT_R * 2, DIRECT_R);
            if (k > 0.8 && Math.floor(time / 70) % 2) { g.fillStyle(S.bolt, 0.25); g.fillEllipse(s.x, s.y, DIRECT_R * 2, DIRECT_R); }
            continue;
          }
          // The thunder: a fat band of shoved air, bunched rings inside it, loud to the count of three.
          if (r < LOUD_R) {
            for (let i = 0; i < 4; i++) {
              const rr = r - i * 9;
              if (rr <= 0) continue;
              g.lineStyle(i === 0 ? 6 : 2, i === 0 ? S.bolt : S.boltGlow, (i === 0 ? 0.85 : 0.45) - i * 0.08); g.strokeCircle(s.x, s.y, rr);
            }
            g.fillStyle(S.boltGlow, 0.06); g.fillCircle(s.x, s.y, r);
          } else {
            // Past three it is only a grumble: a faint dashed ripple.
            const f = clamp(1 - (r - LOUD_R) / 370, 0, 1);
            for (let i = 0; i < 30; i += 2) {
              const a0 = (i / 30) * Math.PI * 2;
              g.lineStyle(2, S.boltGlow, 0.3 * f);
              g.beginPath(); g.arc(s.x, s.y, r, a0, a0 + Math.PI / 30, false); g.strokePath();
            }
          }
          // The burn where it struck.
          g.fillStyle(0x0c0e12, 0.5); g.fillEllipse(s.x, s.y, 50, 20);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const s of strikes) {
          if (!s.flashed) {
            // The cloud coming down over the mark, darker and lower, flickering inside.
            const k = clamp((time - s.at) / (s.flashAt - s.at), 0, 1);
            const flick = k > 0.6 && Math.floor(time / 60 + s.seed) % 3 === 0;
            drawCloud(g, s.x, s.y - 190 + k * 50, 46 + k * 18, 0.45 + k * 0.45, flick ? S.cloudLit : S.cloudDark, Math.floor(s.seed));
            continue;
          }
          const since = time - s.flashAt;
          if (since < 240) {
            const a = 1 - since / 240;
            drawBolt(g, s.x + (jit(s.seed, 1) - 0.5) * 60, s.y - 220, s.x, s.y, Math.floor(s.seed), a, 5, 30);
            g.fillStyle(S.bolt, 0.5 * a); g.fillCircle(s.x, s.y, 26 + since * 0.15);
          }
          // Grit kicked up off the setts as the loud ring passes.
          const r = radiusOf(s, time);
          if (r < LOUD_R) {
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2 + jit(s.seed, i);
              g.fillStyle(S.slateLit, 0.6); g.fillCircle(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r - 6 - jit(s.seed, i + 3) * 8, 2);
            }
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The flash: the whole yard white for a blink.
        const since = time - flashAt;
        if (since < 160) { g.fillStyle(0xffffff, 0.35 * (1 - since / 160)); g.fillRect(0, 0, W, H); }
        // The count, top centre: a bolt pip, then three pips lighting as the newest thunder rolls.
        const live = strikes.filter((s) => s.flashed && radiusOf(s, time) < LOUD_R + 40).pop();
        const cx = W / 2, y = top + 14;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 64, y - 10, 128, 20, 8);
        g.fillStyle(live ? S.bolt : S.cloud, 1);
        g.fillTriangle(cx - 52, y - 7, cx - 44, y - 7, cx - 50, y + 1); g.fillTriangle(cx - 49, y - 1, cx - 42, y - 1, cx - 48, y + 7);
        for (let i = 0; i < 3; i++) {
          const on = live ? live.counted > i : false;
          g.fillStyle(on ? (i === 2 ? S.boltHot : S.boltGlow) : S.cloudDark, 1); g.fillCircle(cx - 16 + i * 24, y, on ? 7 : 5);
        }
      },
    };
  },
};
