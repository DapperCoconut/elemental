import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, P, PCOL, dist, drawKeg, drawPuff, drawSpark } from '../util';
import { dim } from '../../../../../art/IsleArt';

/**
 * KEG ALLEY — Keg-Roller Bram.
 *
 * Powder kegs trundle out of chutes in the side walls and roll to a stop on the floor. Walk into a
 * resting keg and you kick it: it rolls off the way you were facing it — the line from your body
 * through the keg — and bursts on whoever it reaches, on a wall, or on another keg (which goes up
 * with it). The blast does not care who kicked it. Every fourth keg comes out with its fuse already
 * burning and will go off where it stands unless somebody boots it somewhere useful first.
 *
 * Bram plays the alley properly: he walks round behind the nearest keg so his approach lines it up
 * on you, then walks through it. The counter is the same move — get behind a keg first, or stand
 * so a keg sits between you and him and let him kick it into its neighbour.
 */

type Side = 'player' | 'npc';

interface Keg {
  x: number; y: number;
  vx: number; vy: number;
  heading: number;
  roll: number;
  /** Arriving from a chute, resting, or kicked and live. */
  state: 'arriving' | 'rest' | 'kicked';
  stopX: number;
  kicker: Side | null;
  /** Scene time the fuse runs out (lit kegs only). */
  fuseAt: number;
  fuseLen: number;
  /** No re-kick until this time (stops a kick registering twice in one stride). */
  lockUntil: number;
  dead: boolean;
}

interface Scorch { x: number; y: number; r: number; at: number }
interface Dribble { x: number; y: number; at: number }
interface Chute { side: -1 | 1; y: number; flashAt: number }

const KEG_R = 17;
const KICK_SPEED = 370;
const BLAST_R = 80;
const MAX_KEGS = 5;
const FUSE_MS = 4800;

export const KEG_ALLEY: GimmickDef = {
  id: 'powder-kegs',
  rules: 'Walk into a keg to kick it. It bursts on whoever it reaches — or a wall, or another keg. Lit kegs blow where they stand.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const kegs: Keg[] = [];
    const scorches: Scorch[] = [];
    const dribbles: Dribble[] = [];
    const spawnEvery = ctx.hard ? 2000 : 2600;
    const damage = ctx.hard ? 22 : 18;
    let nextSpawn = -1;
    let spawned = 0;
    // Five chute mouths, alternating walls, spread down the room.
    const chutes: Chute[] = [];
    for (let i = 0; i < 5; i++) {
      chutes.push({ side: i % 2 === 0 ? -1 : 1, y: top + 60 + ((H - top - 110) * i) / 4, flashAt: -9999 });
    }

    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

    const spawnKeg = (now: number): void => {
      const ch = chutes[Math.floor(rng() * chutes.length)];
      ch.flashAt = now;
      const lit = spawned % 4 === 3;
      spawned++;
      const from = ch.side < 0 ? -10 : W + 10;
      const stopX = ch.side < 0 ? 150 + rng() * (W * 0.42 - 150) : W * 0.58 + rng() * (W * 0.42 - 150);
      kegs.push({
        x: from, y: ch.y + (rng() - 0.5) * 24,
        vx: -ch.side * (150 + rng() * 40), vy: 0,
        heading: Math.PI / 2, roll: 0, state: 'arriving', stopX,
        kicker: null, fuseAt: lit ? now + FUSE_MS : 0, fuseLen: FUSE_MS, lockUntil: 0, dead: false,
      });
      ctx.sfx('drum-hit');
    };

    const burst = (k: Keg, now: number): void => {
      if (k.dead) return;
      k.dead = true;
      ctx.tk.boom(k.x, k.y, BLAST_R, P.flame);
      ctx.flash(k.x, k.y, P.spark);
      ctx.sfx('explosion-medium');
      scorches.push({ x: k.x, y: k.y, r: BLAST_R * (0.55 + rng() * 0.2), at: now });
      if (scorches.length > 14) scorches.shift();
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighterOf(s);
        if (!f.active || f.hp <= 0) continue;
        const d = dist(f.x, f.y, k.x, k.y);
        if (d > BLAST_R + 14) continue;
        ctx.hit(f, damage, f.x, f.y);
        // A shove out of the blast — never a velocity write.
        const a = Math.atan2(f.y - k.y, f.x - k.x);
        ctx.nudge(f, Math.cos(a) * 46, Math.sin(a) * 46);
        if (k.kicker && s === k.kicker) ctx.float(f.x, f.y - 40, 'OWN GOAL', PCOL.red);
      }
      // Sympathetic detonation: any keg in the blast goes up a beat later.
      for (const o of kegs) {
        if (o === k || o.dead) continue;
        if (dist(o.x, o.y, k.x, k.y) < BLAST_R * 0.85) {
          ctx.tk.schedule(140, () => burst(o, ctx.tk.now));
          if (!o.dead) ctx.float(o.x, o.y - 26, 'CHAIN!', PCOL.spark);
        }
      }
    };

    const kick = (k: Keg, by: Side, now: number): void => {
      const f = fighterOf(by);
      let a = Math.atan2(k.y - f.y, k.x - f.x);
      // A light lean toward the target: kicks meant for someone tend to find them.
      const target = fighterOf(other(by));
      const want = Math.atan2(target.y - k.y, target.x - k.x);
      let diff = want - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const assist = by === 'player' ? 0.38 : 0.5;
      if (Math.abs(diff) < assist) a += diff * (by === 'player' ? 0.7 : 0.85);
      if (by === 'npc') a += (rng() - 0.5) * 0.3;
      k.state = 'kicked';
      k.kicker = by;
      k.vx = Math.cos(a) * KICK_SPEED;
      k.vy = Math.sin(a) * KICK_SPEED;
      k.heading = a + Math.PI / 2;
      k.lockUntil = now + 250;
      ctx.sfx('whoosh');
      ctx.float(k.x, k.y - 24, 'KICK!', by === 'player' ? PCOL.hot : PCOL.red);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        const now = time;
        if (nextSpawn < 0) nextSpawn = now + 1400;
        if (dt === 0) return;
        if (now >= nextSpawn && kegs.filter((k) => !k.dead).length < MAX_KEGS) {
          spawnKeg(now);
          nextSpawn = now + spawnEvery * (0.8 + rng() * 0.4);
        }

        for (const k of kegs) {
          if (k.dead) continue;
          if (k.fuseAt > 0 && now >= k.fuseAt) { burst(k, now); continue; }
          if (k.state === 'arriving') {
            k.x += k.vx * dt;
            k.roll += (k.vx * dt) / KEG_R;
            const past = k.vx > 0 ? k.x >= k.stopX : k.x <= k.stopX;
            if (past) {
              k.vx *= Math.pow(0.02, dt);
              if (Math.abs(k.vx) < 12) { k.vx = 0; k.state = 'rest'; }
            }
          } else if (k.state === 'kicked') {
            k.x += k.vx * dt;
            k.y += k.vy * dt;
            k.roll += (KICK_SPEED * dt) / KEG_R;
            if (rng() < dt * 30) dribbles.push({ x: k.x + (rng() - 0.5) * 6, y: k.y + (rng() - 0.5) * 6, at: now });
            const tgt = fighterOf(other(k.kicker ?? 'player'));
            const hitWall = k.x < 26 || k.x > W - 26 || k.y < top + 8 || k.y > H - 18;
            const hitFoe = tgt.active && tgt.hp > 0 && dist(tgt.x, tgt.y, k.x, k.y) < KEG_R + 22;
            const hitKeg = kegs.some((o) => o !== k && !o.dead && dist(o.x, o.y, k.x, k.y) < KEG_R * 1.8);
            if (hitWall || hitFoe || hitKeg) { burst(k, now); continue; }
          }
          // Kicks — any keg that is not already flying.
          if (k.state !== 'kicked' && now >= k.lockUntil) {
            for (const s of ['player', 'npc'] as Side[]) {
              const f = fighterOf(s);
              if (!f.active || f.hp <= 0) continue;
              if (dist(f.x, f.y, k.x, k.y) < KEG_R + 18) { kick(k, s, now); break; }
            }
          }
        }
        for (let i = kegs.length - 1; i >= 0; i--) if (kegs[i].dead) kegs.splice(i, 1);
        while (dribbles.length && now - dribbles[0].at > 5000) dribbles.shift();
      },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        const now = ctx.tk.now;
        let best: Keg | null = null;
        let bestD = 520;
        for (const k of kegs) {
          if (k.dead || k.state === 'kicked') continue;
          // A lit keg about to blow is somebody else's problem.
          if (k.fuseAt > 0 && k.fuseAt - now < 1100) continue;
          const d = dist(n.x, n.y, k.x, k.y);
          if (d < bestD) { bestD = d; best = k; }
        }
        if (!best) {
          // Nothing to kick: keep clear of anything about to go off.
          for (const k of kegs) {
            if (k.fuseAt > 0 && k.fuseAt - now < 1400 && dist(n.x, n.y, k.x, k.y) < BLAST_R + 30) {
              const a = Math.atan2(n.y - k.y, n.x - k.x);
              return { x: n.x + Math.cos(a) * 120, y: n.y + Math.sin(a) * 120 };
            }
          }
          return null;
        }
        // Stand behind the keg, opposite the player, then walk through it.
        const a = Math.atan2(best.y - p.y, best.x - p.x);
        const behind = { x: best.x + Math.cos(a) * 48, y: best.y + Math.sin(a) * 48 };
        if (dist(n.x, n.y, behind.x, behind.y) < 30) return { x: best.x, y: best.y };
        return behind;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Chutes in the walls: a timber mouth with iron lips that flashes as a keg drops out.
        for (const ch of chutes) {
          const x = ch.side < 0 ? 0 : W;
          const lip = ch.side < 0 ? 1 : -1;
          g.fillStyle(P.oakDark, 1); g.fillRect(ch.side < 0 ? 0 : W - 22, ch.y - 26, 22, 52);
          g.fillStyle(P.powder, 1); g.fillRect(ch.side < 0 ? 0 : W - 16, ch.y - 20, 16, 40);
          g.fillStyle(P.iron, 1); g.fillRect(x + lip * 18 - 2, ch.y - 28, 4, 56);
          const f = Math.max(0, 1 - (time - ch.flashAt) / 500);
          if (f > 0) { g.fillStyle(P.spark, 0.4 * f); g.fillCircle(x + lip * 20, ch.y, 30); }
          // Chalk roll-line showing where kegs come from.
          g.lineStyle(1, P.saltpetre, 0.12);
          for (let s = 30; s < 140; s += 14) g.lineBetween(x + lip * s, ch.y, x + lip * (s + 6), ch.y);
        }
        for (const s of scorches) {
          const age = (time - s.at) / 9000;
          if (age >= 1) continue;
          g.fillStyle(0x0a0806, 0.5 * (1 - age)); g.fillCircle(s.x, s.y, s.r);
          g.fillStyle(0x2a1a10, 0.4 * (1 - age)); g.fillCircle(s.x, s.y, s.r * 0.6);
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + s.x;
            g.lineStyle(2, 0x0a0806, 0.45 * (1 - age));
            g.lineBetween(s.x, s.y, s.x + Math.cos(a) * s.r * 1.25, s.y + Math.sin(a) * s.r * 1.1);
          }
        }
        for (const d of dribbles) {
          const a = 1 - (time - d.at) / 5000;
          g.fillStyle(P.powder, 0.7 * a); g.fillCircle(d.x, d.y, 2);
        }
        for (const k of kegs) {
          if (k.state === 'kicked') {
            // Motion smear behind a kicked keg.
            g.lineStyle(KEG_R * 1.4, k.kicker === 'player' ? P.spark : P.redcoat, 0.18);
            g.lineBetween(k.x, k.y, k.x - k.vx * 0.12, k.y - k.vy * 0.12);
          }
          drawKeg(g, k.x, k.y, KEG_R, k.state === 'kicked' ? k.heading : Math.PI / 2, k.roll);
          if (k.state === 'rest') {
            // A faint ring: "kickable".
            g.lineStyle(1.5, P.saltpetre, 0.18 + Math.sin(time / 260 + k.x) * 0.08);
            g.strokeCircle(k.x, k.y, KEG_R + 12);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const k of kegs) {
          if (k.fuseAt <= 0 || k.dead) continue;
          const left = Math.max(0, (k.fuseAt - time) / k.fuseLen);
          // The fuse: a short cord out of the bung with the spark eating down it.
          const fx = k.x + 4, fy = k.y - KEG_R;
          const len = 6 + left * 18;
          g.lineStyle(2, dim(P.oak, 0.5), 1);
          g.lineBetween(fx, fy, fx + len * 0.6, fy - len);
          drawSpark(g, fx + len * 0.6, fy - len, time, 0.8 + (1 - left) * 0.5);
          // Countdown arc — the closer to zero, the redder and faster it pulses.
          const urgent = left < 0.3;
          g.lineStyle(3, urgent ? P.flame : P.spark, urgent ? 0.6 + Math.sin(time / 50) * 0.3 : 0.55);
          g.beginPath(); g.arc(k.x, k.y, KEG_R + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false); g.strokePath();
          if (urgent) {
            g.lineStyle(1, P.flame, 0.3); g.strokeCircle(k.x, k.y, BLAST_R);
          }
          if (Math.floor(time / 300) % 3 === 0) drawPuff(g, fx + len * 0.6, fy - len - 6, 4, P.smoke, 0.25, k.x);
        }
      },
    };
  },
};
