import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dustPuff, rollingBoulder, shard } from '../art';
import { DUST, GRANITE_DEEP, MAGMA_LIT, SANDSTONE } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Rolling Stone — Roller Cobb.
 *
 * Cobb rolls the households' tithe boulders down the runnel to Quarrymouth, and he keeps one for
 * himself: a great round stone that rolls round the yard, rebounding off the walls and gaining
 * speed with every bounce. Whoever it meets is flattened — knocked flat, hurt in proportion to
 * how fast it was going — and the stone is spent, rolling on at its starting pace.
 *
 * Nobody owns it. Strike the stone — a shot, a swing, a blast — and it rings and bats straight at
 * the other fighter at the speed it had. Cobb knows the trick and plays it — he hangs about the
 * boulder's far side, ready to swing it your way. A dotted track shows where the stone will run to its next wall, and the bounce count is
 * chalked on its face.
 */

const R = 34;
const BASE = 150;
const GAIN = 1.12;
const MAX = 430;
const BAT_CD = 650;

interface Stone { x: number; y: number; vx: number; vy: number; spin: number; bounces: number; batAt: number; batBy: Fighter | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const minX = 40 + R, maxX = W - 40 - R, minY = top + 10 + R, maxY = H - 30 - R;
  const a0 = rng() * Math.PI * 2;
  const s: Stone = { x: W / 2, y: (top + H) / 2, vx: Math.cos(a0) * BASE, vy: Math.sin(a0) * BASE, spin: 0, bounces: 0, batAt: -9999, batBy: null };
  const flattenedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const puffs: { x: number; y: number; at: number; r: number }[] = [];
  const chips: { x: number; y: number; vx: number; vy: number; at: number; spin: number }[] = [];

  const speed = () => Math.hypot(s.vx, s.vy);
  const setSpeed = (v: number) => { const k = v / Math.max(1, speed()); s.vx *= k; s.vy *= k; };

  function bounce(time: number): void {
    s.bounces++;
    setSpeed(Math.min(MAX * (ctx.hard ? 1.1 : 1), speed() * GAIN));
    puffs.push({ x: s.x, y: s.y + R * 0.6, at: time, r: R });
    for (let i = 0; i < 4; i++) {
      const a = rng() * Math.PI * 2;
      chips.push({ x: s.x, y: s.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 60, at: time, spin: rng() * 6 });
    }
    ctx.sfx(speed() > 300 ? 'stone-slam' : 'rock-throw');
  }

  /** The stone flattens a fighter: damage by speed, a shove along its line, a moment knocked down. */
  function flatten(f: Fighter, time: number): void {
    const v = speed();
    const dmg = Math.round(8 + (v / MAX) * 16);
    const nx = s.vx / v, ny = s.vy / v;
    if (f === player) tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(f, dmg, f.x, f.y);
    ctx.nudge(f, nx * 70, ny * 70);
    ctx.stun(f, v > 300 ? 650 : 400);
    ctx.float(f.x, f.y - 46, v > 300 ? 'FLATTENED!' : 'FLATTENED', '#e8d2a8');
    ctx.sfx('hit-heavy');
    flattenedAt.set(f, time);
    puffs.push({ x: f.x, y: f.y, at: time, r: R * 1.2 });
    // Spent: it rolls on, slowed, the way it was going, and bounces off the fighter.
    const dx = s.x - f.x, dy = s.y - f.y, d = Math.hypot(dx, dy) || 1;
    s.vx = (dx / d) * BASE; s.vy = (dy / d) * BASE;
    s.bounces = 0;
  }

  /** A blow struck on the stone: bat it at the other fighter, at the speed it had (or more). */
  function bat(by: Fighter, time: number): void {
    if (time - s.batAt < BAT_CD) return;
    const target = by === player ? npc : player;
    if (!alive(target)) return;
    const a = Math.atan2(target.y - s.y, target.x - s.x);
    const v = clamp(Math.max(speed(), BASE * 1.6), BASE, MAX);
    s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v;
    s.batAt = time; s.batBy = by;
    ctx.float(s.x, s.y - R - 20, 'BATTED!', by === player ? '#a8e0ff' : '#ffb8a0');
    ctx.flash(s.x, s.y, 0xfff0d0);
    ctx.sfx('clang');
  }

  const target = ctx.target({
    x: s.x, y: s.y, r: R,
    onStruck: (by) => bat(by === 'player' ? player : npc, ctx.scene.time.now),
  });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.spin += (speed() / R) * dt * (s.vx >= 0 ? 1 : -1);
      if (s.x < minX) { s.x = minX; s.vx = Math.abs(s.vx); bounce(time); }
      if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx); bounce(time); }
      if (s.y < minY) { s.y = minY; s.vy = Math.abs(s.vy); bounce(time); }
      if (s.y > maxY) { s.y = maxY; s.vy = -Math.abs(s.vy); bounce(time); }
      target.moveTo(s.x, s.y);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // The fighter who batted it is safe from it for a moment.
        if (s.batBy === f && time - s.batAt < 700) continue;
        if (time - (flattenedAt.get(f) ?? 0) < 900) continue;
        if (dist(f.x, f.y, s.x, s.y) < R + 18) flatten(f, time);
      }
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.spin += dt * 8;
        if (time - c.at > 600) chips.splice(i, 1);
      }
      while (puffs.length && time - puffs[0].at > 700) puffs.shift();
    },

    destroy() { target.remove(); },

    npcSeek() {
      // Hang at the stone's side, on the far side from you, ready to bat it your way — unless
      // it is coming at him, in which case get off its line.
      const v = speed();
      const toN = { x: npc.x - s.x, y: npc.y - s.y };
      const along = (toN.x * s.vx + toN.y * s.vy) / Math.max(1, v);
      const off = Math.abs((toN.x * s.vy - toN.y * s.vx) / Math.max(1, v));
      if (along > 0 && along < 320 && off < R + 50) {
        const px = -s.vy / v, py = s.vx / v;
        const side = (toN.x * px + toN.y * py) >= 0 ? 1 : -1;
        return { x: clamp(npc.x + px * side * 140, 60, W - 60), y: clamp(npc.y + py * side * 140, top + 50, H - 40) };
      }
      const a = Math.atan2(s.y - player.y, s.x - player.x);
      return { x: clamp(s.x + Math.cos(a) * (R + 40), 60, W - 60), y: clamp(s.y + Math.sin(a) * (R + 40), top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The track: dots along its line to the next wall, brighter the faster it goes.
      const v = speed();
      let tx = s.x, ty = s.y;
      const nx = s.vx / v, ny = s.vy / v;
      let tMax = Infinity;
      if (nx > 0) tMax = Math.min(tMax, (maxX - s.x) / nx); else if (nx < 0) tMax = Math.min(tMax, (minX - s.x) / nx);
      if (ny > 0) tMax = Math.min(tMax, (maxY - s.y) / ny); else if (ny < 0) tMax = Math.min(tMax, (minY - s.y) / ny);
      tMax = Math.min(tMax, 900);
      const heat = v / MAX;
      for (let d = R + 10; d < tMax; d += 22) {
        tx = s.x + nx * d; ty = s.y + ny * d;
        g.fillStyle(heat > 0.7 ? MAGMA_LIT : DUST, 0.18 + heat * 0.4 * (1 - d / (tMax + 1)));
        g.fillCircle(tx, ty + R * 0.6, 3);
      }
      // The groove it has worn: a faint scuff behind it.
      for (let k = 1; k < 6; k++) {
        g.fillStyle(GRANITE_DEEP, 0.08 * (6 - k)); g.fillEllipse(s.x - nx * k * 16, s.y - ny * k * 16 + R * 0.7, R * 1.2, R * 0.3);
      }
      // Recently flattened fighters: a dent in the dust.
      for (const [f, at] of flattenedAt) {
        const k = (time - at) / 900;
        if (k < 0 || k > 1) continue;
        g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillEllipse(f.x, f.y + 10, 70, 26);
      }
    },

    drawAir(g, time) {
      const v = speed();
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 700, p.r * 0.7);
      for (const c of chips) shard(g, c.x, c.y, 3.5, c.spin, SANDSTONE);
      // Speed lines when it is fast.
      if (v > 260) {
        const nx = s.vx / v, ny = s.vy / v;
        for (let i = -2; i <= 2; i++) {
          g.lineStyle(2, 0xffffff, 0.12 + (v / MAX) * 0.2);
          g.lineBetween(s.x - nx * (R + 6) - ny * i * 10, s.y - ny * (R + 6) + nx * i * 10, s.x - nx * (R + 40) - ny * i * 10, s.y - ny * (R + 40) + nx * i * 10);
        }
      }
      const heatTint = v > MAX * 0.8 ? 0xff9050 : 0;
      rollingBoulder(g, s.x, s.y, R, s.spin, heatTint);
      // The bounce count chalked on its face.
      g.lineStyle(2, 0xf0ecdc, 0.85);
      for (let k = 0; k < Math.min(6, s.bounces); k++) g.lineBetween(s.x - 10 + k * 4, s.y - 6, s.x - 10 + k * 4, s.y + 4);
      if (s.bounces >= 5) g.lineBetween(s.x - 12, s.y + 2, s.x + 12, s.y - 4);
      // Batted: a ring of white for a beat.
      if (time - s.batAt < 300) { g.lineStyle(3, 0xffffff, 1 - (time - s.batAt) / 300); g.strokeCircle(s.x, s.y, R + 8 + (time - s.batAt) / 10); }
    },

    drawHud(g) {
      // A speed gauge: a chalk bar on a slate, top centre.
      const w = 160, x = W / 2 - w / 2, y = top + 8;
      const k = speed() / MAX;
      g.fillStyle(0x2a2a30, 0.8); g.fillRoundedRect(x - 4, y - 3, w + 8, 14, 5);
      g.fillStyle(k > 0.75 ? 0xff9050 : 0xe8dcc0, 0.95); g.fillRoundedRect(x, y, Math.max(4, w * k), 8, 4);
      for (let i = 1; i < 6; i++) { g.fillStyle(0x000000, 0.4); g.fillRect(x + (w * i) / 6, y, 1, 8); }
    },
  };
}

export const ROLLING_STONE: GimmickDef = {
  id: 'stonehold-rolling-stone',
  rules: 'A boulder rolls round the yard, faster with every bounce, and flattens whoever it meets. Strike it to bat it at your foe.',
  make,
};
