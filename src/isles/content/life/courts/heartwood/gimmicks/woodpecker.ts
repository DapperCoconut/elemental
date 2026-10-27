import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { HW, alive, angDiff, clamp, dist, lenticel, makeClock, splinter, woodpecker } from '../palette';

/**
 * Woodpecker — Drummer Pike.
 *
 * Five birch trunks stand in the yard. A woodpecker lands on one, clinging to one side, and
 * drums a counted rhythm — the count hangs over the trunk as pips (three to six beats, never
 * the same twice running) and every beat cracks the bark a little more. On the last beat the
 * trunk bursts: a fan of splinters flies out of its *far* side, away from the bird, and the
 * splinters hit whoever they meet, Pike included. The fan is painted on the floor from the
 * first beat, widening as the count runs down.
 *
 * Barge into a drumming trunk and the bird takes fright and flies to another — the volley is
 * cancelled, which is a way to save yourself, or to spoil Pike's. Pike keeps out of the fan and
 * tries to hold you inside it. On hard, two birds drum at once, out of step.
 */

interface Drum { trunk: number; side: number; beats: number; beat: number; nextAt: number; interval: number; dir: number }
interface Shard { x: number; y: number; vx: number; vy: number; dieAt: number; hit: Set<Fighter> }

export const woodpeckerGimmick: GimmickDef = {
  id: 'heartwood-woodpecker',
  rules: 'Woodpeckers drum a count on the trunks; on the last beat a fan of splinters bursts out the far side. Barge a trunk to scare the bird.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const TRUNK_R = 22;
    const FAN = 0.55;
    const FAN_LEN = 520;
    const SHARD_SPEED = 360;
    const SHARD_DMG = hard ? 9 : 8;
    const SHARDS = hard ? 9 : 8;
    const mid = (top + H) / 2;
    const trunks: Pt[] = [
      { x: W * 0.2, y: top + 120 }, { x: W * 0.8, y: top + 130 }, { x: W / 2, y: mid + 10 },
      { x: W * 0.22, y: H - 110 }, { x: W * 0.78, y: H - 100 },
    ];
    const crack = trunks.map(() => 0);
    let drums: Drum[] = [];
    let shards: Shard[] = [];
    let lastBeats = 0;
    let birdFlight: { fx: number; fy: number; tx: number; ty: number; at: number }[] = [];
    let now = 0;
    let nextDrumAt = 1400;

    const busy = (i: number): boolean => drums.some((d) => d.trunk === i);
    const startDrum = (exclude: number): void => {
      const free = trunks.map((_, i) => i).filter((i) => i !== exclude && !busy(i));
      if (!free.length) return;
      // Prefer trunks near the player: the fan has to matter.
      free.sort((a, b) => dist(trunks[a].x, trunks[a].y, ctx.player.x, ctx.player.y) - dist(trunks[b].x, trunks[b].y, ctx.player.x, ctx.player.y));
      const i = free[Math.floor(rng() * Math.min(3, free.length))];
      const t = trunks[i];
      // The bird lands on the side away from the player's general direction, so the fan points at them, roughly.
      const toP = Math.atan2(ctx.player.y - t.y, ctx.player.x - t.x) + (rng() - 0.5) * 1.1;
      let beats = 3 + Math.floor(rng() * 4);
      if (beats === lastBeats) beats = beats === 6 ? 3 : beats + 1;
      lastBeats = beats;
      const interval = (hard ? 380 : 440) + rng() * 160;
      drums.push({ trunk: i, side: toP + Math.PI, beats, beat: 0, nextAt: now + 700, interval, dir: toP });
      ctx.sfx('wings');
    };

    const burst = (d: Drum): void => {
      const t = trunks[d.trunk];
      for (let k = 0; k < SHARDS; k++) {
        const a = d.dir - FAN + (FAN * 2 * k) / (SHARDS - 1) + (rng() - 0.5) * 0.05;
        const sp = SHARD_SPEED * (0.85 + rng() * 0.3);
        shards.push({ x: t.x + Math.cos(a) * TRUNK_R, y: t.y - 20 + Math.sin(a) * TRUNK_R, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dieAt: now + (FAN_LEN / sp) * 1000, hit: new Set() });
      }
      crack[d.trunk] = 0;
      ctx.sfx('explosion-small');
      ctx.flash(t.x, t.y - 20, HW.barkLit);
    };

    const flush = (d: Drum): void => {
      const t = trunks[d.trunk];
      ctx.float(t.x, t.y - 70, 'SHOO!', '#f4f2ea');
      ctx.sfx('wings');
      drums = drums.filter((q) => q !== d);
      const free = trunks.map((_, i) => i).filter((i) => i !== d.trunk && !busy(i));
      const to = free.length ? trunks[free[Math.floor(rng() * free.length)]] : t;
      birdFlight.push({ fx: t.x, fy: t.y - 40, tx: to.x, ty: to.y - 40, at: now });
      nextDrumAt = now + 900;
    };

    const inFan = (d: Drum, f: Fighter): boolean => {
      const t = trunks[d.trunk];
      const dd = dist(f.x, f.y, t.x, t.y);
      return dd < FAN_LEN && dd > TRUNK_R && Math.abs(angDiff(Math.atan2(f.y - t.y, f.x - t.x), d.dir)) < FAN + 0.08;
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        const want = hard ? 2 : 1;
        if (drums.length < want && time >= nextDrumAt) { startDrum(-1); nextDrumAt = time + (hard ? 1300 : 900); }
        for (const d of [...drums]) {
          const t = trunks[d.trunk];
          for (const f of [ctx.player, ctx.npc]) {
            if (alive(f) && dist(f.x, f.y, t.x, t.y) < TRUNK_R + 26 && d.beat < d.beats) { flush(d); break; }
          }
          if (!drums.includes(d) || time < d.nextAt) continue;
          d.beat++;
          d.nextAt = time + d.interval;
          crack[d.trunk] = d.beat / d.beats;
          if (d.beat < d.beats) ctx.sfx('drum-hit');
          else {
            burst(d);
            drums = drums.filter((q) => q !== d);
            nextDrumAt = time + (hard ? 900 : 1300);
          }
        }
        for (const s of shards) {
          s.x += s.vx * dt; s.y += s.vy * dt;
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || s.hit.has(f) || dist(s.x, s.y, f.x, f.y) > 24) continue;
            s.hit.add(f);
            ctx.hit(f, SHARD_DMG, f.x, f.y);
            ctx.sfx('stab');
          }
        }
        shards = shards.filter((s) => time < s.dieAt && s.x > -20 && s.x < W + 20 && s.y > top - 20 && s.y < H + 20);
        birdFlight = birdFlight.filter((b) => time - b.at < 700);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Step out of any fan about to fire, sideways off its axis.
        for (const d of drums) {
          if (!inFan(d, n) || d.beats - d.beat > 2) continue;
          const t = trunks[d.trunk];
          const side = angDiff(Math.atan2(n.y - t.y, n.x - t.x), d.dir) >= 0 ? 1 : -1;
          const a = d.dir + side * (FAN + 0.6);
          const r = clamp(dist(n.x, n.y, t.x, t.y), 90, 260);
          return { x: clamp(t.x + Math.cos(a) * r, 60, W - 60), y: clamp(t.y + Math.sin(a) * r, top + 50, H - 50) };
        }
        // If the player is drifting out of a fan, flush nothing — stand on the far edge to herd them back.
        const d = drums.find((q) => !inFan(q, ctx.player) && dist(ctx.player.x, ctx.player.y, trunks[q.trunk].x, trunks[q.trunk].y) < 300);
        if (d) {
          const t = trunks[d.trunk];
          const pa = Math.atan2(ctx.player.y - t.y, ctx.player.x - t.x);
          const side = angDiff(pa, d.dir) >= 0 ? 1 : -1;
          const a = d.dir + side * (FAN + 0.9);
          return { x: clamp(t.x + Math.cos(a) * 200, 60, W - 60), y: clamp(t.y + Math.sin(a) * 200, top + 50, H - 50) };
        }
        return null;
      },

      drawGround(g, time) {
        // The fan, from the first beat: a wedge that darkens as the count runs down.
        for (const d of drums) {
          const t = trunks[d.trunk];
          const k = d.beat / d.beats;
          const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(t.x, t.y)];
          const reach = FAN_LEN * (0.45 + k * 0.55);
          for (let i = 0; i <= 10; i++) {
            const a = d.dir - FAN + (FAN * 2 * i) / 10;
            pts.push(new Phaser.Geom.Point(t.x + Math.cos(a) * reach, t.y + Math.sin(a) * reach));
          }
          g.fillStyle(HW.heart, 0.08 + k * 0.18); g.fillPoints(pts, true, true);
          g.lineStyle(2, HW.heartLit, 0.35 + k * 0.5); g.strokePoints(pts, true, true);
          // Grain lines down the wedge, the way the wood will split.
          for (let i = 1; i < 5; i++) {
            const a = d.dir - FAN + (FAN * 2 * i) / 5;
            g.lineStyle(1, HW.heartDeep, 0.3 + k * 0.4);
            g.lineBetween(t.x + Math.cos(a) * 30, t.y + Math.sin(a) * 30, t.x + Math.cos(a) * reach * 0.9, t.y + Math.sin(a) * reach * 0.9);
          }
          if (d.beats - d.beat === 1 && Math.sin(time / 50) > 0) {
            g.lineStyle(3, HW.whitewash, 0.6); g.strokePoints(pts, true, true);
          }
        }
        for (let i = 0; i < trunks.length; i++) {
          const t = trunks[i];
          g.fillStyle(0x000000, 0.3); g.fillEllipse(t.x + 6, t.y + 6, 60, 18);
        }
      },

      drawAir(g, time) {
        const tt = time / 1000;
        // The trunks: birch columns, cracking up the middle as they are drummed.
        for (let i = 0; i < trunks.length; i++) {
          const t = trunks[i];
          g.fillStyle(HW.barkShade, 1); g.fillRect(t.x - TRUNK_R, t.y - 110, TRUNK_R * 2, 110);
          g.fillStyle(HW.bark, 1); g.fillRect(t.x - TRUNK_R + 3, t.y - 110, TRUNK_R * 2 - 12, 110);
          g.fillStyle(HW.barkLit, 0.6); g.fillRect(t.x - TRUNK_R + 6, t.y - 110, 6, 110);
          for (let k = 0; k < 6; k++) lenticel(g, t.x - 2, t.y - 12 - k * 17, 16 + (k % 2) * 6, 0.8);
          g.fillStyle(HW.sapwood, 1); g.fillEllipse(t.x, t.y - 110, TRUNK_R * 2, 10);
          if (crack[i] > 0) {
            g.lineStyle(1.5 + crack[i] * 2.5, HW.heartDeep, 0.9);
            g.beginPath(); g.moveTo(t.x, t.y - 100 + (1 - crack[i]) * 60);
            for (let y = t.y - 100 + (1 - crack[i]) * 60; y < t.y - 4; y += 10) g.lineTo(t.x + Math.sin(y * 0.4) * 4, y);
            g.strokePath();
          }
        }
        // The birds, and the count over them.
        for (const d of drums) {
          const t = trunks[d.trunk];
          const facing = Math.cos(d.side) >= 0 ? 1 : -1;
          const bx = t.x + facing * (TRUNK_R + 4), by = t.y - 64;
          const peck = time < d.nextAt && d.nextAt - time > d.interval - 90 ? 1 : 0;
          woodpecker(g, bx, by, -facing, 10, peck);
          if (peck) {
            for (let k = 0; k < 4; k++) { g.fillStyle(HW.barkLit, 0.9); g.fillCircle(bx - facing * 12 + (k - 1.5) * 4, by - 8 - k * 3, 1.6); }
          }
          for (let k = 0; k < d.beats; k++) {
            const px = t.x - (d.beats - 1) * 7 + k * 14, py = t.y - 136;
            const last = k === d.beats - 1;
            g.fillStyle(0x000000, 0.5); g.fillCircle(px, py, last ? 7 : 5.5);
            g.fillStyle(k < d.beat ? (last ? 0xd8262a : HW.whitewash) : last ? 0x6a2020 : 0x4a4440, 1);
            g.fillCircle(px, py, last ? 5 : 4);
          }
        }
        for (const b of birdFlight) {
          const k = (time - b.at) / 700;
          const x = b.fx + (b.tx - b.fx) * k, y = b.fy + (b.ty - b.fy) * k - Math.sin(k * Math.PI) * 60;
          woodpecker(g, x, y, b.tx >= b.fx ? 1 : -1, 9, Math.sin(tt * 40) > 0 ? 0.6 : 0);
        }
        for (const s of shards) splinter(g, s.x, s.y, Math.atan2(s.vy, s.vx), 16);
      },

      destroy() { drums = []; shards = []; },
    };
  },
};
