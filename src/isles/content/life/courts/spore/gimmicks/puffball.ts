import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { live, SIDES } from './shared';
import { CSS_SPORE, CSS_STEM, MOSS_LIT, SPORE, SPORE_DARK, STEM, WHITE } from '../palette';
import { puffball, sporeCloud } from '../sporeArt';

/**
 * Puffball — Puffer Gill's fight.
 *
 * Puffballs dot the Lea, fat and white. Step on one and it bursts into a choking spore cloud:
 * inside, you cough (poison, a tick every half-second) and wade (slowed to 60%). Clouds hang for
 * a few seconds and thin. Puffballs are not all alike — each one **ripens** as the fight goes on,
 * browning and cracking at the crown, and a ripe one bursts bigger *and sets off every puffball
 * its cloud touches*, a beat later. The Lea regrows: buttons push up through the moss and swell.
 *
 * Gill harvests the stuff, and he plays with it: every few seconds he walks up behind a puffball
 * and **punts** it at you — its line is chalked on the moss first, then it rolls, bursting where
 * it stops or on whoever it meets. But a rolling puffball can be **batted back**: strike out (any
 * cast) as it reaches you and it turns round and rolls at Gill instead. He has a mask. It is not a
 * very good mask.
 */

const BALL_R = 20;
const CLOUD_R = 92;
const RIPE_CLOUD_R = 122;
const CLOUD_MS = 4200;
const GROW_MS = 2600;
const RIPEN_MS = 13000;
const ROLL_SPEED = 330;
const AIM_MS = 520;
const SLOW = 0.6;

interface Ball { x: number; y: number; born: number; grownAt: number; seed: number; fuseAt: number }
interface Cloud { x: number; y: number; r: number; born: number; dieAt: number; seed: number }
interface Roll { x: number; y: number; tx: number; ty: number; at: number; by: Side; ripe: number; seed: number; batted: number }

export const PUFFBALL: GimmickDef = {
  id: 'spore-puffball',
  rules: 'Step on a puffball and it bursts into poison spore that slows. Ripe ones set off their neighbours. Strike a rolling one to bat it back.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const maxBalls = hard ? 10 : 8;
    const kickEvery = hard ? 4300 : 5400;
    const tick = hard ? 3 : 2;
    let balls: Ball[] = [];
    let clouds: Cloud[] = [];
    let rolls: Roll[] = [];
    let kickAt = ctx.scene.time.now + 3200;
    let regrowAt = ctx.scene.time.now + 2000;
    const coughAt = { p: 0, n: 0 };
    const inCloud = { p: false, n: false };
    const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const ripeOf = (b: Ball, time: number): number => Phaser.Math.Clamp((time - b.grownAt) / RIPEN_MS, 0, 1);
    const grown = (b: Ball, time: number): boolean => time >= b.grownAt;

    const place = (time: number, instant: boolean): void => {
      for (let i = 0; i < 12; i++) {
        const x = 80 + ctx.rng() * (W - 160), y = top + 60 + ctx.rng() * (H - top - 110);
        if (balls.some((b) => Phaser.Math.Distance.Between(b.x, b.y, x, y) < 110)) continue;
        if (SIDES.some((k) => Phaser.Math.Distance.Between(fOf(k).x, fOf(k).y, x, y) < 90)) continue;
        // Opening crop starts part-ripe so the Lea has some brown in it from the off.
        const head = instant ? RIPEN_MS * ctx.rng() * 0.6 : 0;
        balls.push({ x, y, born: time, grownAt: instant ? time - head : time + GROW_MS, seed: Math.floor(ctx.rng() * 999), fuseAt: 0 });
        return;
      }
    };
    for (let i = 0; i < maxBalls - 2; i++) place(ctx.scene.time.now, true);

    const burst = (x: number, y: number, ripe: number, time: number): void => {
      const r = ripe >= 1 ? RIPE_CLOUD_R : CLOUD_R;
      clouds.push({ x, y, r, born: time, dieAt: time + CLOUD_MS + (ripe >= 1 ? 800 : 0), seed: Math.floor(ctx.rng() * 999) });
      ctx.sfx(ripe >= 1 ? 'explosion-small' : 'spore');
      // Whoever is right on top takes the pop as well as the cough.
      for (const k of SIDES) {
        const f = fOf(k);
        if (live(f) && Phaser.Math.Distance.Between(f.x, f.y, x, y) < 40) ctx.hit(f, ripe >= 1 ? 8 : 5, f.x, f.y);
      }
      // A ripe cloud lights the fuse of every grown puffball it touches.
      if (ripe >= 1) {
        for (const b of balls) {
          if (b.fuseAt || !grown(b, time)) continue;
          if (Phaser.Math.Distance.Between(b.x, b.y, x, y) < r + BALL_R) b.fuseAt = time + 380;
        }
      }
    };

    const pop = (b: Ball, time: number): void => {
      balls = balls.filter((q) => q !== b);
      burst(b.x, b.y, ripeOf(b, time), time);
    };

    return {
      update(time, dt) {
        // Regrowth.
        if (time >= regrowAt) {
          regrowAt = time + (hard ? 1900 : 2500);
          if (balls.length < maxBalls) place(time, false);
        }
        // Treading on a grown puffball, and fuses lit by a ripe neighbour.
        for (const b of balls.slice()) {
          if (!grown(b, time)) continue;
          if (b.fuseAt && time >= b.fuseAt) { pop(b, time); continue; }
          for (const k of SIDES) {
            const f = fOf(k);
            if (live(f) && Phaser.Math.Distance.Between(f.x, f.y + 10, b.x, b.y) < BALL_R + 12) { pop(b, time); break; }
          }
        }
        // Gill's punt: the grown puffball nearest him, if he has walked up to one.
        if (time >= kickAt) {
          const n = ctx.npc, p = ctx.player;
          const pick = balls.filter((b) => grown(b, time) && !b.fuseAt)
            .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, n.x, n.y) - Phaser.Math.Distance.Between(b.x, b.y, n.x, n.y))[0];
          if (pick && live(n) && Phaser.Math.Distance.Between(pick.x, pick.y, n.x, n.y) < 140) {
            kickAt = time + kickEvery;
            balls = balls.filter((q) => q !== pick);
            const a = Math.atan2(p.y - pick.y, p.x - pick.x);
            const len = Math.max(160, Phaser.Math.Distance.Between(pick.x, pick.y, p.x, p.y) + 60);
            rolls.push({
              x: pick.x, y: pick.y,
              tx: Phaser.Math.Clamp(pick.x + Math.cos(a) * len, 30, W - 30), ty: Phaser.Math.Clamp(pick.y + Math.sin(a) * len, top + 20, H - 20),
              at: time + AIM_MS, by: 'n', ripe: ripeOf(pick, time), seed: pick.seed, batted: 0,
            });
            ctx.float(n.x, n.y - 46, 'PUNT!', CSS_STEM);
          } else kickAt = time + 600;
        }
        // Rolling puffballs.
        rolls = rolls.filter((r) => {
          if (time < r.at) return true;
          const d = Phaser.Math.Distance.Between(r.x, r.y, r.tx, r.ty);
          const step = ROLL_SPEED * Math.min(0.05, dt);
          if (d <= step) { burst(r.tx, r.ty, r.ripe, time); return false; }
          r.x += ((r.tx - r.x) / d) * step;
          r.y += ((r.ty - r.y) / d) * step;
          for (const k of SIDES) {
            if (k === r.by) continue;
            const f = fOf(k);
            if (!live(f) || Phaser.Math.Distance.Between(f.x, f.y, r.x, r.y) > BALL_R + 24) continue;
            // Struck as it arrived: it turns and rolls back at whoever sent it.
            if (Date.now() - (f.lastPressAt ?? 0) < 380 && r.batted < 2) {
              const back = fOf(r.by);
              const a = Math.atan2(back.y - r.y, back.x - r.x);
              const len = Phaser.Math.Distance.Between(r.x, r.y, back.x, back.y) + 60;
              r.by = k;
              r.tx = Phaser.Math.Clamp(r.x + Math.cos(a) * len, 30, W - 30);
              r.ty = Phaser.Math.Clamp(r.y + Math.sin(a) * len, top + 20, H - 20);
              r.batted++;
              ctx.float(r.x, r.y - 30, k === 'p' ? 'BATTED BACK!' : 'GILL BATS IT BACK', CSS_SPORE);
              ctx.sfx('boing');
              return true;
            }
            burst(r.x, r.y, r.ripe, time);
            return false;
          }
          return true;
        });
        clouds = clouds.filter((c) => time < c.dieAt);
        // The cough.
        for (const k of SIDES) {
          const f = fOf(k);
          const was = inCloud[k];
          inCloud[k] = live(f) && clouds.some((c) => Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) < c.r * 0.85);
          if (inCloud[k] && !was && k === 'n') ctx.float(f.x, f.y - 44, 'GILL IS COUGHING', CSS_SPORE);
          if (inCloud[k] && time >= coughAt[k]) {
            coughAt[k] = time + 500;
            ctx.hit(f, tick, f.x, f.y);
          }
        }
      },

      playerSpeedMult: () => (inCloud.p ? SLOW : 1),
      npcSpeedMult: () => (inCloud.n ? SLOW : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        // Out of the spore, away from its middle.
        const c = clouds.find((cc) => Phaser.Math.Distance.Between(n.x, n.y, cc.x, cc.y) < cc.r);
        if (c) {
          const a = Math.atan2(n.y - c.y, n.x - c.x);
          return { x: Phaser.Math.Clamp(c.x + Math.cos(a) * (c.r + 50), 60, W - 60), y: Phaser.Math.Clamp(c.y + Math.sin(a) * (c.r + 50), top + 40, H - 40) };
        }
        // A punt is due: get behind a grown puffball, on the far side of it from you.
        if (t > kickAt - 1500) {
          const pick = balls.filter((b) => grown(b, t) && !b.fuseAt)
            .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, n.x, n.y) - Phaser.Math.Distance.Between(b.x, b.y, n.x, n.y))[0];
          if (pick) {
            const a = Math.atan2(pick.y - p.y, pick.x - p.x);
            return { x: Phaser.Math.Clamp(pick.x + Math.cos(a) * 62, 40, W - 40), y: Phaser.Math.Clamp(pick.y + Math.sin(a) * 62, top + 30, H - 30) } as Pt;
          }
        }
        return null;
      },

      drawGround(g, time) {
        // Clouds sit low over the moss.
        for (const c of clouds) {
          const age = time - c.born, left = c.dieAt - time;
          const grow = Phaser.Math.Clamp(age / 320, 0, 1);
          const fade = Phaser.Math.Clamp(left / 900, 0, 1);
          sporeCloud(g, c.x, c.y, c.r * (0.4 + 0.6 * grow), SPORE, fade, time / 1000, c.seed);
          g.lineStyle(1.5, SPORE_DARK, 0.5 * fade); g.strokeCircle(c.x, c.y, c.r * 0.85 * grow);
        }
        // The chalked line of a punt before it rolls.
        for (const r of rolls) {
          if (time >= r.at) continue;
          const k = (time - (r.at - AIM_MS)) / AIM_MS;
          const d = Phaser.Math.Distance.Between(r.x, r.y, r.tx, r.ty);
          const n = Math.floor(d / 18);
          for (let i = 0; i < n; i++) {
            if (i / n > k + 0.1) break;
            const q = i / n;
            g.fillStyle(STEM, 0.6); g.fillCircle(r.x + (r.tx - r.x) * q, r.y + (r.ty - r.y) * q, 2);
          }
          g.lineStyle(2, SPORE, 0.5 + 0.4 * k); g.strokeCircle(r.tx, r.ty, r.ripe >= 1 ? RIPE_CLOUD_R * 0.6 : CLOUD_R * 0.6);
        }
        // Buttons pushing up through the moss.
        for (const b of balls) {
          if (grown(b, time)) continue;
          const k = Phaser.Math.Clamp((time - b.born) / GROW_MS, 0, 1);
          g.fillStyle(MOSS_LIT, 0.5); g.fillEllipse(b.x, b.y + 6, 30 * k + 6, 10 * k + 3);
        }
      },

      drawAir(g, time) {
        for (const b of balls) {
          const k = grown(b, time) ? 1 : Phaser.Math.Clamp((time - b.born) / GROW_MS, 0, 1);
          if (k <= 0.05) continue;
          const ripe = ripeOf(b, time);
          const shake = b.fuseAt ? Math.sin(time / 18) * 2 : ripe >= 1 ? Math.sin(time / 60) * 0.8 : 0;
          puffball(g, b.x + shake, b.y, BALL_R * (0.3 + 0.7 * k), ripe, b.seed);
          if (ripe >= 1) {
            // Ripe: a ring of dust leaking off the crown — this one sets off its neighbours.
            g.lineStyle(1, SPORE, 0.4 + 0.3 * Math.sin(time / 140 + b.seed)); g.strokeCircle(b.x, b.y, BALL_R + 8);
          }
        }
        for (const r of rolls) {
          const spin = time / 60;
          puffball(g, r.x, r.y, BALL_R, r.ripe, r.seed);
          g.lineStyle(1.5, SPORE_DARK, 0.7);
          g.lineBetween(r.x + Math.cos(spin) * 8, r.y + Math.sin(spin) * 7, r.x - Math.cos(spin) * 8, r.y - Math.sin(spin) * 7);
          if (time >= r.at) { g.fillStyle(SPORE, 0.3); g.fillCircle(r.x - (r.tx - r.x) * 0.02, r.y + 10, 8); }
        }
        // Coughers: puffs bursting off the mouth.
        for (const k of SIDES) {
          if (!inCloud[k]) continue;
          const f = fOf(k);
          const ph = (time % 500) / 500;
          g.fillStyle(WHITE, 0.6 * (1 - ph)); g.fillCircle(f.x + 12 + ph * 14, f.y - 14 - ph * 8, 3 + ph * 4);
        }
      },

      drawHud(g) {
        // Gill's next punt.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (kickAt - t) / kickEvery, 0, 1);
        const x = W / 2 - 60, y = 106;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 4, y - 4, 128, 16, 6);
        g.fillStyle(SPORE, 0.9); g.fillRoundedRect(x, y, 120 * k, 8, 4);
        puffball(g, x + 132, y + 4, 7, k, 3);
      },
    };
  },
};
