import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, P, PCOL, dist, drawPuff, drawSpark } from '../util';

/**
 * PASS THE BLAME — Informer Jory Pettle.
 *
 * In the King's telling Jory is the fort's informer, the man who always had a name ready when
 * something went missing from the magazine. His fight is a lit petard — a bell of cast iron full of
 * powder, the kind sappers hang on a gate — that clings by a lodestone to whoever holds the blame.
 * Its fuse burns down on a cord over the holder's head; when it runs out, the holder goes up.
 *
 * Blame passes the way it always has in the fort: land a blow on the other side and the petard
 * jumps to them. After a blast a fresh one is set down loose on the flags, and its lodestone creeps
 * toward whoever is nearest — lead it to him, or keep your distance. Past half his strength the
 * fuses are cut shorter and the blast reaches anyone standing close to the holder, too.
 */

type Holder = 'player' | 'npc' | 'loose' | 'none';

const FUSE_MS = 9000;
const FUSE_SHORT_MS = 6800;
const GRACE_MS = 1100;
const BLAST = 58;
const SPLASH = 30;
const SPLASH_R = 140;
const CLING_R = 34;
const CREEP = 72;

export const PASS_THE_BLAME: GimmickDef = {
  id: fallenId('powder', 'petard'),
  rules: 'A lit petard clings to whoever holds the blame — land a hit to pass it on. When its fuse runs out, the holder goes up.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    let holder: Holder = 'none';
    let fuseAt = 0;
    let fuseLen = FUSE_MS;
    let passedAt = -9999;
    let started = -1;
    let respawnAt = 0;
    const loose: Pt = { x: W / 2, y: (top + H) / 2 };
    /** The petard in flight between holders: from/to and when it left. */
    let flight: { fx: number; fy: number; at: number } | null = null;
    let blasts: { x: number; y: number; at: number; r: number }[] = [];
    /** Set while the gimmick deals its own damage, so its blasts never pass the blame. */
    let selfHit = false;

    const late = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;
    const holderF = (): Fighter | null => (holder === 'player' ? ctx.player : holder === 'npc' ? ctx.npc : null);

    const cling = (to: 'player' | 'npc', now: number, from: Pt): void => {
      holder = to; passedAt = now;
      flight = { fx: from.x, fy: from.y, at: now };
      ctx.sfx('magnet-pull');
      const f = to === 'player' ? ctx.player : ctx.npc;
      if (to === 'npc') ctx.float(f.x, f.y - 50, 'BLAME PASSED', PCOL.spark);
    };

    const pass = (to: 'player' | 'npc', now: number): void => {
      if (holder === to || holder === 'loose' || holder === 'none') return;
      if (now - passedAt < GRACE_MS) return;
      const from = holderF();
      cling(to, now, from ? { x: from.x, y: from.y - 30 } : loose);
      // Passing it pulls the cord a little tighter: never more than the fuse it came in with.
      fuseAt = Math.max(fuseAt, now - fuseLen + 3200);
    };

    const blow = (now: number): void => {
      const f = holderF();
      if (!f) return;
      ctx.tk.boom(f.x, f.y, late() ? SPLASH_R : 80, P.flame);
      ctx.flash(f.x, f.y, P.sparkHot);
      ctx.sfx('explosion-large');
      blasts.push({ x: f.x, y: f.y, at: now, r: late() ? SPLASH_R : 80 });
      selfHit = true;
      ctx.hit(f, BLAST, f.x, f.y);
      if (late()) {
        const other = f === ctx.player ? ctx.npc : ctx.player;
        if (dist(other.x, other.y, f.x, f.y) < SPLASH_R + 14) {
          ctx.hit(other, SPLASH, other.x, other.y);
          const a = Math.atan2(other.y - f.y, other.x - f.x);
          ctx.nudge(other, Math.cos(a) * 46, Math.sin(a) * 46);
        }
      }
      selfHit = false;
      holder = 'none';
      respawnAt = now + 2400;
    };

    const setLoose = (): void => {
      // Down on the flags, as far from both fighters as the room allows.
      let best: Pt = { x: W / 2, y: (top + H) / 2 };
      let bestD = -1;
      for (let i = 0; i < 24; i++) {
        const p = { x: 110 + rng() * (W - 220), y: top + 80 + rng() * (H - top - 150) };
        const d = Math.min(dist(p.x, p.y, ctx.player.x, ctx.player.y), dist(p.x, p.y, ctx.npc.x, ctx.npc.y));
        if (d > bestD) { bestD = d; best = p; }
      }
      loose.x = best.x; loose.y = best.y;
      holder = 'loose';
      ctx.sfx('trap-set');
    };

    /** The petard bell: iron, flanged, with the lodestone lug and a spitting fuse. */
    const drawPetard = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, time: number, k: number): void => {
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 13 * s, 26 * s, 7 * s);
      g.fillStyle(dim(P.iron, 0.3), 1);
      g.fillTriangle(x - 13 * s, y + 10 * s, x + 13 * s, y + 10 * s, x, y - 12 * s);
      g.fillStyle(P.iron, 1); g.fillEllipse(x, y + 2 * s, 22 * s, 20 * s);
      g.fillStyle(dim(P.iron, 0.4), 1); g.fillRect(x - 15 * s, y + 8 * s, 30 * s, 4 * s);
      g.fillStyle(P.ironLit, 0.8); g.fillEllipse(x - 4 * s, y - 2 * s, 5 * s, 9 * s);
      // Lodestone lug: a dark red-brown stone bolted on top.
      g.fillStyle(0x5a2a20, 1); g.fillRoundedRect(x - 5 * s, y - 15 * s, 10 * s, 6 * s, 2);
      g.lineStyle(1, lit(0x5a2a20, 0.3), 1); g.strokeRoundedRect(x - 5 * s, y - 15 * s, 10 * s, 6 * s, 2);
      // Fuse cord: shorter as it burns, spark at its end.
      const len = 6 + 18 * (1 - k);
      const ex = x + 6 * s + Math.sin(time / 200) * 2, ey = y - 15 * s - len * s;
      g.lineStyle(2, 0x6a5a40, 1); g.lineBetween(x + 3 * s, y - 13 * s, ex, ey);
      drawSpark(g, ex, ey, time, 0.7 + k * 0.5);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (started < 0) { started = time; respawnAt = time + 1600; }
        fuseLen = late() ? FUSE_SHORT_MS : FUSE_MS;
        if (flight && time - flight.at > 340) flight = null;
        blasts = blasts.filter((b) => time - b.at < 900);
        if (holder === 'none') {
          if (time >= respawnAt) setLoose();
          return;
        }
        if (holder === 'loose') {
          // The lodestone creeps toward the nearer body and clings on touch.
          const p = ctx.player, n = ctx.npc;
          const dp = dist(loose.x, loose.y, p.x, p.y), dn = dist(loose.x, loose.y, n.x, n.y);
          const f = dp <= dn ? p : n;
          const d = Math.min(dp, dn);
          const step = (CREEP * dt) / Math.max(1, d);
          loose.x += (f.x - loose.x) * Math.min(1, step);
          loose.y += (f.y - loose.y) * Math.min(1, step);
          if (d < CLING_R) {
            fuseAt = time;
            cling(f === p ? 'player' : 'npc', time, { x: loose.x, y: loose.y });
          }
          return;
        }
        if (time - fuseAt >= fuseLen) blow(time);
      },

      onNpcHurt(amount: number) {
        if (selfHit || amount < 4) return;
        if (holder === 'player') pass('npc', ctx.tk.now);
      },

      onPlayerHurt(amount: number) {
        if (selfHit || amount < 4) return;
        if (holder === 'npc') pass('player', ctx.tk.now);
      },

      npcSeek(): Pt | null {
        const p = ctx.player, n = ctx.npc;
        if (holder === 'npc') return { x: p.x, y: p.y };
        if (holder === 'player') {
          // Keep out of reach — and, late, out of the blast round you.
          const a = Math.atan2(n.y - p.y, n.x - p.x);
          const r = late() ? SPLASH_R + 120 : 240;
          return { x: ctx.tk.clampX(p.x + Math.cos(a) * r, 80), y: ctx.tk.clampY(p.y + Math.sin(a) * r, 80) };
        }
        if (holder === 'loose') {
          // Herd the creeping petard toward you: stand so that you are the nearer one, never it.
          const a = Math.atan2(loose.y - p.y, loose.x - p.x);
          return { x: ctx.tk.clampX(loose.x + Math.cos(a) * 200, 80), y: ctx.tk.clampY(loose.y + Math.sin(a) * 200, 80) };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The informer's chalked tally on the flags: a stroke for every name he ever gave.
        for (let i = 0; i < 9; i++) {
          const bx = 90 + i * ((W - 180) / 8), by = H - 46;
          for (let j = 0; j < 4; j++) { g.lineStyle(2, P.saltpetre, 0.14); g.lineBetween(bx + j * 6, by - 9, bx + j * 6, by + 9); }
          g.lineStyle(2, P.saltpetre, 0.14); g.lineBetween(bx - 3, by + 7, bx + 23, by - 7);
        }
        const f = holderF();
        if (f && holder !== 'none') {
          const k = Math.min(1, (time - fuseAt) / fuseLen);
          // Splash circle (late) and a scorch shadow that darkens as the fuse runs.
          if (late()) {
            g.lineStyle(2, P.flame, 0.25 + k * 0.5); g.strokeCircle(f.x, f.y, SPLASH_R);
            g.fillStyle(P.flame, 0.04 + k * 0.08); g.fillCircle(f.x, f.y, SPLASH_R);
          }
          g.fillStyle(0x140d08, 0.15 + k * 0.3); g.fillEllipse(f.x, f.y + 10, 56, 20);
        }
        if (holder === 'loose') {
          // A drag-scar on the flags behind the creeping petard, and its lodestone's field lines.
          for (let i = 1; i <= 3; i++) {
            const r = ((time / 8 + i * 22) % 66);
            g.lineStyle(1.5, 0x8a4a3a, 0.4 * (1 - r / 66)); g.strokeCircle(loose.x, loose.y, 20 + r);
          }
        }
        for (const b of blasts) {
          const k = (time - b.at) / 900;
          g.fillStyle(0x140d08, 0.5 * (1 - k)); g.fillCircle(b.x, b.y, b.r * 0.55);
          drawPuff(g, b.x, b.y - 10 - k * 30, b.r * (0.5 + k * 0.4), P.smoke, 0.45 * (1 - k), b.x);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const k = holder === 'player' || holder === 'npc' ? Math.min(1, (time - fuseAt) / fuseLen) : 0;
        if (holder === 'loose') { drawPetard(g, loose.x, loose.y, 1.1, time, 0); return; }
        const f = holderF();
        if (!f) return;
        let x = f.x + 18, y = f.y - 44;
        if (flight) {
          const t = Math.min(1, (time - flight.at) / 340);
          x = flight.fx + (x - flight.fx) * t; y = flight.fy + (y - flight.fy) * t - Math.sin(t * Math.PI) * 46;
        } else {
          // A taut chain from the lodestone to the holder's shoulder.
          g.lineStyle(1.5, P.ironLit, 0.8); g.lineBetween(x, y + 10, f.x + 6, f.y - 18);
          for (let i = 1; i < 5; i++) {
            const t = i / 5;
            g.fillStyle(P.ironLit, 1); g.fillCircle(x + (f.x + 6 - x) * t, y + 10 + (f.y - 18 - y - 10) * t, 1.6);
          }
        }
        const shake = k > 0.75 ? Math.sin(time / 25) * 2 * k : 0;
        drawPetard(g, x + shake, y, 1, time, k);
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The fuse cord across the top: burned length black, the spark at the burning point.
        const x0 = W / 2 - 140, y0 = top + 18, w = 280;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 34, y0 - 14, w + 48, 28, 8);
        const live = holder === 'player' || holder === 'npc';
        const k = live ? Math.min(1, (time - fuseAt) / fuseLen) : 0;
        g.lineStyle(4, 0x6a5a40, 1); g.lineBetween(x0 + w * k, y0, x0 + w, y0);
        g.lineStyle(4, 0x1a1410, 1); g.lineBetween(x0, y0, x0 + w * k, y0);
        if (live) drawSpark(g, x0 + w * k, y0, time, 0.8);
        // Whose blame it is: a small petard over a portrait dot in the holder's colour.
        const col = holder === 'player' ? 0x8fb4ff : holder === 'npc' ? P.redcoat : P.smoke;
        g.fillStyle(col, 1); g.fillCircle(x0 - 18, y0, 8);
        g.fillStyle(P.iron, 1); g.fillTriangle(x0 - 25, y0 + 4, x0 - 11, y0 + 4, x0 - 18, y0 - 7);
      },
    };
  },
};
