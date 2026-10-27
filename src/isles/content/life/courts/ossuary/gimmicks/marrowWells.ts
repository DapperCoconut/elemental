import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, O, OCOL, alive, dist, drawMarrow, jit } from '../util';

/**
 * MARROW WELLS — Digger Femur.
 *
 * Three wells stand open in the yard, brimming with marrow-jelly rendered down from everything the
 * court composts. They lean on the world: come within a few strides of a rim and you are drawn in
 * toward the middle — gently at the edge, harder the closer you get, never faster than you can
 * walk. At the centre the marrow scalds.
 *
 * On a slow clock one well *surges*: its rim glows and its ripples run inward, then for a moment
 * it hauls twice as hard. And a blow that lands on anyone inside a well's pull knocks them a
 * stride further in — the marrow takes every hit as an invitation.
 *
 * Femur digs in hobnails (the wells take him at a little over half strength) and fights from the
 * far side of you, so his blows drive you toward the rim. Turn him round. Stand between him and
 * open ground, hit him while he is in a pull, and let the well have him.
 */

type Side = 'player' | 'npc';

interface Well { x: number; y: number; seed: number; surgeWarnAt: number; surgeAt: number; surgeEnd: number }

const PULL_R = 175;
const SCALD_R = 40;
const RIM_R = 52;
const SURGE_WARN = 1200;
const SURGE_MS = 1600;
const SHOVE = 26;

export const MARROW_WELLS: GimmickDef = {
  id: 'ossuary-marrow-wells',
  rules: 'Three marrow wells pull in anyone near them (never faster than walking); their centres scald. A well that glows is about to surge. A hit on someone inside a pull knocks them a stride toward the well.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const wells: Well[] = [
      { x: 250, y: top + 150 }, { x: W - 250, y: top + 150 }, { x: W / 2, y: H - 130 },
    ].map((p, i) => ({ ...p, seed: i * 5.3 + 1, surgeWarnAt: -1, surgeAt: -1, surgeEnd: -1 }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const lastScald: Record<Side, number> = { player: 0, npc: 0 };
    const steam: { x: number; y: number; at: number }[] = [];
    let now = 0;
    let nextSurge = -1;
    let surgeIdx = 0;
    let internal = false;
    const surgeEvery = ctx.hard ? 5200 : 7000;

    const surging = (w: Well): boolean => now >= w.surgeAt && now < w.surgeEnd;

    /** The well whose pull a point is inside, nearest first. */
    const wellAt = (x: number, y: number): Well | null => {
      let best: Well | null = null, bd = Infinity;
      for (const w of wells) {
        const d = dist(x, y, w.x, w.y);
        if (d < PULL_R && d < bd) { bd = d; best = w; }
      }
      return best;
    };

    const onHurt = (s: Side): void => {
      if (internal) return;
      const f = fighterOf(s);
      if (!alive(f)) return;
      const w = wellAt(f.x, f.y);
      if (!w) return;
      const d = dist(f.x, f.y, w.x, w.y);
      if (d < 4) return;
      const k = Math.min(SHOVE, d - 6);
      ctx.nudge(f, ((w.x - f.x) / d) * k, ((w.y - f.y) / d) * k);
      ctx.float(f.x, f.y - 44, 'DRAWN IN', OCOL.marrow);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextSurge < 0) nextSurge = time + 3500;
        if (dt === 0) return;
        if (time >= nextSurge) {
          // The next well round surges — or, on hard, the one nearest you.
          let w = wells[surgeIdx % wells.length];
          if (ctx.hard) {
            const p = ctx.player;
            w = wells.slice().sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
          }
          surgeIdx++;
          w.surgeWarnAt = time; w.surgeAt = time + SURGE_WARN; w.surgeEnd = time + SURGE_WARN + SURGE_MS;
          nextSurge = time + surgeEvery;
          ctx.sfx('gravity-slam');
          ctx.float(w.x, w.y - 70, 'THE WELL SURGES', OCOL.marrow);
        }
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f)) continue;
          for (const w of wells) {
            const d = dist(f.x, f.y, w.x, w.y);
            if (d >= PULL_R || d < 2) continue;
            // Gentle at the edge, strong at the rim; capped well under walking pace.
            let sp = 45 + 75 * (1 - d / PULL_R);
            if (surging(w)) sp = Math.min(160, sp * 2);
            if (s === 'npc') sp *= 0.58;
            const step = Math.min(sp * dt, d - 1);
            ctx.nudge(f, ((w.x - f.x) / d) * step, ((w.y - f.y) / d) * step);
            if (d < SCALD_R && now - lastScald[s] > 500) {
              lastScald[s] = now;
              internal = true;
              try { ctx.hit(f, ctx.hard ? 11 : 9, f.x, f.y); } finally { internal = false; }
              ctx.sfx('sizzle');
              steam.push({ x: f.x, y: f.y, at: now });
              if (s === 'npc') ctx.float(f.x, f.y - 50, 'FEMUR SCALDS', OCOL.green);
            }
          }
        }
        while (steam.length && now - steam[0].at > 1200) steam.shift();
      },

      onPlayerHurt() { onHurt('player'); },
      onNpcHurt() { onHurt('npc'); },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Caught near a surging well: get out the far side of its pull.
        const mine = wellAt(n.x, n.y);
        if (mine && (now >= mine.surgeWarnAt && now < mine.surgeEnd)) {
          const a = Math.atan2(n.y - mine.y, n.x - mine.x);
          return { x: mine.x + Math.cos(a) * (PULL_R + 40), y: mine.y + Math.sin(a) * (PULL_R + 40) };
        }
        // Otherwise: stand so you are between him and the nearest well, and hit you toward it.
        let best: Well | null = null, bd = Infinity;
        for (const w of wells) { const d = dist(p.x, p.y, w.x, w.y); if (d < bd) { bd = d; best = w; } }
        if (!best || bd > 300) return null;
        const a = Math.atan2(p.y - best.y, p.x - best.x);
        return { x: p.x + Math.cos(a) * 110, y: p.y + Math.sin(a) * 110 };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const w of wells) {
          const warn = now >= w.surgeWarnAt && now < w.surgeAt;
          const surge = surging(w);
          // The lean of the ground: a faint dished ring of disturbed loam, and ripples running in.
          g.fillStyle(O.loamDeep, 0.4); g.fillCircle(w.x, w.y, PULL_R);
          g.lineStyle(1.5, surge ? O.marrowHot : O.marrowLit, surge ? 0.5 : 0.18); g.strokeCircle(w.x, w.y, PULL_R);
          const speed = surge ? 1.6 : warn ? 1.0 : 0.35;
          for (let i = 0; i < 4; i++) {
            const k = 1 - ((t * speed + i / 4) % 1);
            const r = RIM_R + (PULL_R - RIM_R) * k;
            g.lineStyle(1.5, surge ? O.marrowHot : O.marrowLit, (surge ? 0.5 : warn ? 0.35 : 0.15) * (1 - k * 0.5));
            g.strokeCircle(w.x, w.y, r);
          }
          // Streaks of loam dragged toward the rim.
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + jit(w.seed, i) * 0.3;
            const r0 = RIM_R + 20 + jit(w.seed, i + 20) * 90;
            g.lineStyle(2, O.loamLit, 0.35);
            g.lineBetween(w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0, w.x + Math.cos(a + 0.18) * (r0 - 22), w.y + Math.sin(a + 0.18) * (r0 - 22));
          }
          // The well-head: a ring of fitted stones, gapped where buckets have worn it.
          g.fillStyle(0x000000, 0.35); g.fillCircle(w.x + 4, w.y + 6, RIM_R + 6);
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const sx = w.x + Math.cos(a) * (RIM_R - 4), sy = w.y + Math.sin(a) * (RIM_R - 4);
            const tone = i % 3 === 0 ? O.stoneDark : i % 3 === 1 ? O.stone : O.stoneLit;
            g.fillStyle(dim(tone, 0.4), 1); g.fillCircle(sx, sy + 1, 10);
            g.fillStyle(tone, 1); g.fillCircle(sx, sy, 9);
          }
          if (warn) {
            const k = (now - w.surgeWarnAt) / SURGE_WARN;
            g.lineStyle(5, O.marrowHot, 0.4 + k * 0.5); g.strokeCircle(w.x, w.y, RIM_R + 4);
          }
          drawMarrow(g, w.x, w.y, SCALD_R + 4, SCALD_R + 2, t * (surge ? 2.2 : 1), w.seed, surge ? 1 : warn ? 0.8 : 0.5);
          // The swirl, turning inward.
          for (let i = 0; i < 3; i++) {
            const a0 = t * (surge ? 3 : 1.1) + i * 2.1;
            g.lineStyle(1.5, O.marrowHot, 0.5);
            g.beginPath();
            for (let s = 0; s <= 10; s++) {
              const r = (SCALD_R - 2) * (1 - s / 11);
              const a = a0 + s * 0.35;
              const x = w.x + Math.cos(a) * r, y = w.y + Math.sin(a) * r * 0.9;
              if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.strokePath();
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        // A windlass over each well: two posts and a bucket on a chain, swinging toward a surge.
        for (const w of wells) {
          const surge = surging(w);
          const lx = w.x - RIM_R - 4, rx = w.x + RIM_R + 4;
          g.fillStyle(O.timber, 1); g.fillRect(lx - 3, w.y - 70, 6, 66); g.fillRect(rx - 3, w.y - 70, 6, 66);
          g.fillStyle(O.timberLit, 1); g.fillRect(lx - 3, w.y - 70, 2, 66); g.fillRect(rx - 3, w.y - 70, 2, 66);
          g.lineStyle(5, O.timber, 1); g.lineBetween(lx, w.y - 64, rx, w.y - 64);
          g.fillStyle(O.iron, 1); g.fillCircle(rx + 5, w.y - 64, 4);
          const swing = Math.sin(t * (surge ? 9 : 1.4) + w.seed) * (surge ? 0.3 : 0.08);
          const bx = w.x + Math.sin(swing) * 30, by = w.y - 64 + Math.cos(swing) * 30;
          g.lineStyle(1.5, O.ironLit, 1); g.lineBetween(w.x, w.y - 64, bx, by);
          g.fillStyle(O.timberLit, 1); g.fillRect(bx - 7, by, 14, 11);
          g.fillStyle(O.marrow, 1); g.fillRect(bx - 6, by + 1, 12, 3);
          g.lineStyle(1, O.iron, 1); g.strokeRect(bx - 7, by, 14, 11);
          // Heat haze off the jelly.
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.5 + i / 3 + w.seed) % 1;
            g.fillStyle(O.marrowLit, 0.16 * (1 - ph)); g.fillCircle(w.x + Math.sin(t + i * 2) * 10, w.y - ph * 56, 6 + ph * 10);
          }
        }
        for (const s of steam) {
          const k = (now - s.at) / 1200;
          for (let i = 0; i < 4; i++) {
            g.fillStyle(0xffffff, 0.35 * (1 - k)); g.fillCircle(s.x - 12 + i * 8 + Math.sin(k * 6 + i) * 3, s.y - 10 - k * 50 - i * 3, 4 + k * 9);
          }
        }
        // Who is in a pull: a thin red tether from them to the well's heart.
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f)) continue;
          const w = wellAt(f.x, f.y);
          if (!w) continue;
          const k = 1 - dist(f.x, f.y, w.x, w.y) / PULL_R;
          g.lineStyle(1.5, s === 'player' ? O.marrowLit : lit(O.marrowLit, 0.4), 0.2 + k * 0.5);
          g.lineBetween(f.x, f.y + 14, w.x, w.y);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // The marrow's heat at the screen edge when you are close to a rim.
        const p = ctx.player;
        const w = wellAt(p.x, p.y);
        if (!w) return;
        const k = Math.max(0, 1 - dist(p.x, p.y, w.x, w.y) / PULL_R);
        g.fillStyle(O.marrow, 0.18 * k); g.fillRect(0, top, W, 10 + 18 * k); g.fillRect(0, H - 10 - 18 * k, W, 10 + 18 * k);
      },
    };
  },
};
