import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, COPPER, COPPER_DARK, ROCK_DARK, ROCK_DEEP, SPARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Feedback — Howler Squeal.
 *
 * Squeal has wired two of the Tuners' great listening horns into the walls facing each other
 * across the room, and set them listening to each other. A squealing ring of sound shuttles
 * between them; every time it reaches a horn the horn hears it and shouts it back louder, so it
 * comes back wider, faster and angrier — five passes and it bursts, a blast that catches
 * everyone near its track.
 *
 * A fighter standing in its path takes it — the louder it is, the harder — but damps it back
 * down to a whisper. So who takes it, and when? Damp it early for a small hit; or let it grow
 * and make sure he is on its track when it bursts. Squeal likes it loud.
 */

const LEVELS = 5;
const BASE_R = 40;
const GROW_R = 20;
const BURST_R = 230;

interface Ring {
  x: number; y: number;
  dir: number;
  level: number;
  /** The row it is drifting toward as it travels. */
  targetY: number;
  /** Fighters already hit on this pass. */
  hit: Set<Fighter>;
  dampedAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const LEFT = 52, RIGHT = W - 52;
  const speedOf = (level: number) => (ctx.hard ? 250 : 210) + level * 34;
  const radiusOf = (level: number) => BASE_R + level * GROW_R;
  const damageOf = (level: number) => 4 + level * 4;
  const ring: Ring = { x: LEFT, y: (top + H) / 2, dir: 1, level: 0, targetY: (top + H) / 2, hit: new Set(), dampedAt: -9999 };
  const bursts: { x: number; y: number; at: number }[] = [];
  const hornFlash = [-9999, -9999];
  let started = false;

  function newRow(): void {
    // Rows drift toward a fighter, alternating, so the track sweeps the room.
    const f = rng() < 0.5 ? player : npc;
    ring.targetY = clamp(f.y + (rng() - 0.5) * 160, top + 70, H - 60);
  }

  function burst(time: number): void {
    ctx.sfx('explosion-medium');
    ctx.banner('FEEDBACK!', '#fff27a');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const d = Math.abs(f.y - ring.y);
      if (d > BURST_R * 0.55 && dist(f.x, f.y, ring.x, ring.y) > BURST_R) continue;
      ctx.hit(f, ctx.hard ? 26 : 22, f.x, f.y);
      const a = Math.atan2(f.y - ring.y, f.x - ring.x);
      ctx.nudge(f, Math.cos(a) * 60, Math.sin(a) * 60);
    }
    bursts.push({ x: ring.x, y: ring.y, at: time });
    ring.level = 0;
    ring.hit.clear();
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; newRow(); ctx.banner('STAND IN THE SQUEAL TO DAMP IT — OR LET IT GROW', '#fff27a'); }
      ring.x += ring.dir * speedOf(ring.level) * dt;
      ring.y += clamp(ring.targetY - ring.y, -90 * dt, 90 * dt);
      const r = radiusOf(ring.level);
      // A horn hears it and shouts it back louder.
      if ((ring.dir > 0 && ring.x >= RIGHT) || (ring.dir < 0 && ring.x <= LEFT)) {
        ring.x = ring.dir > 0 ? RIGHT : LEFT;
        hornFlash[ring.dir > 0 ? 1 : 0] = time;
        ring.dir = -ring.dir;
        ring.hit.clear();
        ring.level += 1;
        newRow();
        if (ring.level >= LEVELS) burst(time);
        else {
          ctx.sfx(ring.level >= 3 ? 'screech' : 'sonic-pulse');
          ctx.float(ring.x + ring.dir * 40, ring.y - r - 16, `LOUDER ×${ring.level + 1}`, '#fff27a');
        }
        return;
      }
      // Whoever is in its path takes it, and damps it down.
      for (const f of [player, npc]) {
        if (!alive(f) || ring.hit.has(f) || dist(f.x, f.y, ring.x, ring.y) > r + 12) continue;
        ring.hit.add(f);
        const dmg = damageOf(ring.level);
        ctx.hit(f, ctx.hard ? dmg + 2 : dmg, f.x, f.y);
        ctx.nudge(f, ring.dir * 34, 0);
        if (ring.level > 0) ctx.float(f.x, f.y - 50, 'DAMPED', '#fff27a');
        ring.level = 0;
        ring.dampedAt = time;
        ctx.sfx('zap');
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 800) bursts.splice(i, 1);
    },

    npcSeek() {
      const r = radiusOf(ring.level);
      // Quiet: step in and damp it cheaply only if it is coming at you and you are near it.
      if (ring.level <= 1) {
        const ahead = (npc.x - ring.x) * ring.dir > 0 && Math.abs(npc.y - ring.y) < r + 30;
        if (ahead) return { x: npc.x, y: npc.y };
        return null;
      }
      // Loud: keep well off its track, and keep the player on it if you can.
      const offY = ring.y < (top + H) / 2 ? ring.y + r + 150 : ring.y - r - 150;
      return { x: clamp(player.x + (npc.x < player.x ? -200 : 200), 60, W - 60), y: clamp(offY, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const r = radiusOf(ring.level);
      // Its track ahead along the row, and the burst reach when it is nearly due.
      const ahead = ring.dir > 0 ? RIGHT : LEFT;
      g.fillStyle(SPARK, 0.05 + ring.level * 0.03); g.fillRect(Math.min(ring.x, ahead), ring.y - r, Math.abs(ahead - ring.x), r * 2);
      g.lineStyle(1, SPARK, 0.2 + ring.level * 0.08);
      g.lineBetween(Math.min(ring.x, ahead), ring.y - r, Math.max(ring.x, ahead), ring.y - r);
      g.lineBetween(Math.min(ring.x, ahead), ring.y + r, Math.max(ring.x, ahead), ring.y + r);
      if (ring.level === LEVELS - 1) {
        const pulse = 0.5 + Math.sin(time / 70) * 0.5;
        g.lineStyle(2, 0xff6a3a, 0.3 + pulse * 0.4); g.strokeCircle(ahead, ring.y, BURST_R);
        g.fillStyle(0xff6a3a, 0.05 + pulse * 0.04); g.fillRect(0, ring.y - BURST_R * 0.55, W, BURST_R * 1.1);
      }
      // Copper cable along the floor from horn to horn.
      g.lineStyle(3, COPPER_DARK, 0.7); g.lineBetween(LEFT, H - 26, RIGHT, H - 26);
      g.lineStyle(1.5, COPPER, 0.9); g.lineBetween(LEFT, H - 27, RIGHT, H - 27);
      const sp = (time / 1000) * speedOf(ring.level);
      for (let k = 0; k < 6; k++) { const x = LEFT + ((sp + k * 140) % (RIGHT - LEFT)); g.fillStyle(SPARK, 0.8); g.fillCircle(x, H - 27, 2); }
      for (const b of bursts) {
        const k = (time - b.at) / 800;
        g.fillStyle(0xff6a3a, 0.35 * (1 - k)); g.fillCircle(b.x, b.y, BURST_R * (0.4 + k * 0.6));
      }
    },

    drawAir(g, time) {
      // The two horns, bell-out from each wall, cabinets behind them.
      for (const side of [0, 1]) {
        const x = side ? W - 18 : 18, s = side ? -1 : 1;
        const y = (top + H) / 2;
        const flash = clamp(1 - (time - hornFlash[side]) / 400, 0, 1);
        g.fillStyle(ROCK_DEEP, 1); g.fillRect(side ? W - 20 : 0, top, 20, H - top);
        g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(x, y - 12, x, y + 12, x + s * 40, y - 70);
        g.fillTriangle(x, y - 12, x, y + 12, x + s * 40, y + 70);
        g.fillTriangle(x + s * 40, y - 70, x + s * 40, y + 70, x, y + 12);
        g.fillStyle(lit(BRONZE, flash * 0.5), 1); g.fillEllipse(x + s * 40, y, 22, 146);
        g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x + s * 42, y, 12, 120);
        g.fillStyle(BRONZE_LIT, 0.7); for (let i = 0; i < 6; i++) g.fillCircle(x + s * 40, y - 60 + i * 24, 1.6);
        if (flash > 0) { glow(g, x + s * 44, y, 60, SPARK, 0.06 * flash, 3); for (let i = 0; i < 4; i++) { g.lineStyle(2, SPARK, flash); g.lineBetween(x + s * 44, y - 40 + i * 26, x + s * (60 + ((time / 10) % 20)), y - 44 + i * 28); } }
        // A little VU dial over each horn.
        const dx = x + s * 18, dy = top + 26;
        g.fillStyle(0xe8e0c8, 1); g.fillCircle(dx, dy, 9);
        g.lineStyle(1.5, 0xc02020, 1); const va = Math.PI + 0.3 + (ring.level / LEVELS) * (Math.PI - 0.6); g.lineBetween(dx, dy, dx + Math.cos(va) * 8, dy + Math.sin(va) * 8);
        g.lineStyle(1.5, BRONZE, 1); g.strokeCircle(dx, dy, 9.5);
      }
      // The squeal: concentric jagged rings, crackling more with every level.
      const r = radiusOf(ring.level);
      const hot = mixHot(ring.level);
      for (let k = 0; k < 3; k++) {
        const rr = r * (0.55 + k * 0.22);
        g.lineStyle(3 - k * 0.6, hot, 0.85 - k * 0.2);
        g.beginPath();
        const n = 28;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const j = Math.sin(a * (6 + ring.level * 2) + time / (60 - ring.level * 8)) * (2 + ring.level * 1.5);
          const px = ring.x + Math.cos(a) * (rr + j), py = ring.y + Math.sin(a) * (rr + j) * 0.9;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      glow(g, ring.x, ring.y, r, hot, 0.03 + ring.level * 0.012, 3);
      // Sparks spitting off it.
      for (let i = 0; i < 3 + ring.level * 2; i++) {
        const a = (time / 90 + i * 2.1) % (Math.PI * 2);
        g.lineStyle(1.5, SPARK, 0.9); g.lineBetween(ring.x + Math.cos(a) * r, ring.y + Math.sin(a) * r * 0.9, ring.x + Math.cos(a) * (r + 10), ring.y + Math.sin(a) * (r + 10) * 0.9);
      }
      if (time - ring.dampedAt < 400) { const k = (time - ring.dampedAt) / 400; g.lineStyle(2, 0xffffff, 1 - k); g.strokeCircle(ring.x, ring.y, r + k * 30); }
    },

    drawHud(g) {
      // Five pips: how loud it is now.
      const x0 = W / 2 - 50, y = top + 12;
      for (let i = 0; i < LEVELS; i++) {
        g.fillStyle(0x000000, 0.5); g.fillRect(x0 + i * 22 - 2, y - 2, 18, 12);
        g.fillStyle(i < ring.level + 1 ? mixHot(i) : dim(BRONZE, 0.5), 0.95); g.fillRect(x0 + i * 22, y, 14, 8);
      }
    },
  };
}

/** Yellow at a whisper, white-orange at a howl. */
function mixHot(level: number): number {
  return [0xfff27a, 0xffd860, 0xffb048, 0xff8a3a, 0xff5a2a][clamp(level, 0, 4)];
}

export const FEEDBACK: GimmickDef = {
  id: 'cavern-feedback',
  rules: 'A squealing ring shuttles between two horns, louder each pass; after five it bursts. Stand in its path to take it and damp it back to a whisper.',
  make,
};
