import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { chalkLine, noonShadow } from '../art';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, GOLD, GOLD_DARK, GOLD_LIT, INK, IRON, IRON_DARK, IRON_LIT, PARCH, PARCH_DARK, RIVET,
  ROBE_DARK, SUN, WAX,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Drawn from the Wheel — Lot-Drawer Ismenia Cardew.
 *
 * Juries on Solmara are drawn from the wheel: a brass drum full of name-balls, turned by a crank
 * until a ball drops from its hatch. Cardew turned it. In the star's telling she learned to feel,
 * through the crank, exactly where every name was — and the wheel only ever gave the bench the
 * jurors it wanted.
 *
 * The wheel stands in the middle of the yard and turns. On her beat the drum catches with a clank,
 * the hatch's chalk line locks, and a heavy name-ball flies off the drum along that line — straight
 * out on the tangent — bowling over whoever it meets and caroming once off the balustrade. Step off
 * the locked line.
 *
 * The exploit is the crank: strike it and the hatch springs at once, wherever it is. Watch the
 * chalk line sweep round with the drum and strike when it lies across her. At half the wheel is
 * thrown into reverse and turns faster, and its balls carom twice.
 */

const ID = fallenId('tribunal', 'jury-wheel');
const DRUM_R = 50;
const BODY_R = 64;
const BALL_R = 15;
const BALL_SPEED = 300;
const LOCK_MS = 620;
const CRANK_LOCK_MS = 380;
const BEAT_MS = 2300;
const BEAT_LATE_MS = 1800;
const DMG_YOU = 13;
const DMG_FOE = 19;
const CRANK_CD = 1400;

interface Ball { x: number; y: number; vx: number; vy: number; bounces: number; born: number; hitP: number; hitN: number; dead: boolean; deadAt: number; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  let ang = 0;
  let spin = 1.15;
  let late = false;
  let lockAt = 0, fireAt = 0, locked = false;
  let nextBeat = 0;
  let lastCrank = -1e9;
  let started = false;
  const balls: Ball[] = [];

  /** The hatch's point on the rim and the tangent it would fly along. */
  const hatch = (a: number) => ({ x: cx + Math.cos(a) * DRUM_R, y: cy + Math.sin(a) * DRUM_R * 0.8 });
  const tangent = (a: number) => {
    const dir = spin >= 0 ? 1 : -1;
    const tx = -Math.sin(a) * dir, ty = Math.cos(a) * dir * 0.8;
    const l = Math.hypot(tx, ty) || 1;
    return { x: tx / l, y: ty / l };
  };
  /** How far a point lies off the hatch's line (only ahead of the hatch). */
  const offLine = (a: number, px: number, py: number): number => {
    const h = hatch(a), t = tangent(a);
    const along = (px - h.x) * t.x + (py - h.y) * t.y;
    if (along < 0) return 1e9;
    return Math.abs((px - h.x) * -t.y + (py - h.y) * t.x);
  };

  const crank: StrikeTarget = ctx.target({
    x: cx + DRUM_R + 34, y: cy - 22, r: 22,
    onStruck() {
      if (tk.now - lastCrank < CRANK_CD || locked) return;
      lastCrank = tk.now;
      locked = true; lockAt = tk.now; fireAt = tk.now + tk.warn(CRANK_LOCK_MS);
      ctx.sfx('gear-turn');
    },
  });

  function fire(): void {
    const h = hatch(ang), t = tangent(ang);
    balls.push({ x: h.x + t.x * 10, y: h.y + t.y * 10, vx: t.x * BALL_SPEED, vy: t.y * BALL_SPEED, bounces: 0, born: tk.now, hitP: 0, hitN: 0, dead: false, deadAt: 0, spin: 0 });
    ctx.sfx('rock-throw');
    locked = false;
    nextBeat = tk.now + (late ? BEAT_LATE_MS : BEAT_MS);
  }

  function bowl(b: Ball, f: Fighter, time: number): void {
    const last = f === player ? b.hitP : b.hitN;
    if (time - last < 700 || dist(f.x, f.y, b.x, b.y) > BALL_R + 22) return;
    if (f === player) { b.hitP = time; tk.hitPlayer(DMG_YOU, f.x, f.y); } else { b.hitN = time; ctx.hit(npc, DMG_FOE, f.x, f.y); }
    const sp = Math.max(1, Math.hypot(b.vx, b.vy));
    ctx.nudge(f, (b.vx / sp) * 46, (b.vy / sp) * 46);
    ctx.sfx('hit-heavy');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBeat = time + 1800; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true; spin = -1.6;
        ctx.banner('THE WHEEL RUNS BACKWARD', '#e8c860');
        ctx.sfx('gear-turn');
      }
      // The drum turns — except while the hatch is caught.
      if (!locked) ang = wrapAngle(ang + spin * dt);
      if (!locked && time >= nextBeat) { locked = true; lockAt = time; fireAt = time + tk.warn(LOCK_MS); ctx.sfx('clang'); }
      if (locked && time >= fireAt) fire();

      // The frame is solid: shoulder fighters off it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, cx, cy);
        if (d < BODY_R && d > 0.1) ctx.nudge(f, ((f.x - cx) / d) * (BODY_R - d), ((f.y - cy) / d) * (BODY_R - d));
      }

      const maxB = late ? 2 : 1;
      for (const b of balls) {
        if (b.dead) continue;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.spin += Math.hypot(b.vx, b.vy) * dt / BALL_R;
        let bounced = false;
        if (b.x < 30 || b.x > W - 30) { b.vx = -b.vx; b.x = clamp(b.x, 30, W - 30); bounced = true; }
        if (b.y < top + 20 || b.y > H - 20) { b.vy = -b.vy; b.y = clamp(b.y, top + 20, H - 20); bounced = true; }
        if (bounced) {
          b.bounces++; b.vx *= 0.82; b.vy *= 0.82;
          ctx.sfx('clang');
          if (b.bounces > maxB) { b.dead = true; b.deadAt = time; continue; }
        }
        if (time - b.born > 4200) { b.dead = true; b.deadAt = time; continue; }
        if (alive(player)) bowl(b, player, time);
        if (alive(npc)) bowl(b, npc, time);
      }
      for (let i = balls.length - 1; i >= 0; i--) if (balls[i].dead && time - balls[i].deadAt > 500) balls.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Off the locked line, and out of the way of anything rolling at him.
      if (locked && offLine(ang, npc.x, npc.y) < 70) {
        const t = tangent(ang);
        const h = hatch(ang);
        const s = (npc.x - h.x) * -t.y + (npc.y - h.y) * t.x >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x - t.y * s * 120), y: tk.clampY(npc.y + t.x * s * 120) };
      }
      for (const b of balls) {
        if (b.dead) continue;
        const sp = Math.max(1, Math.hypot(b.vx, b.vy));
        const ux = b.vx / sp, uy = b.vy / sp;
        const rx = npc.x - b.x, ry = npc.y - b.y;
        const along = rx * ux + ry * uy, off = rx * -uy + ry * ux;
        if (along > 0 && along < 260 && Math.abs(off) < 50) {
          const s = off >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x - uy * s * 100), y: tk.clampY(npc.y + ux * s * 100) };
        }
      }
      // Stand by the crank when the line is about to sweep across you, ready to spring it.
      const soon = wrapAngle(ang + spin * 0.45);
      if (!locked && offLine(soon, player.x, player.y) < 60) return { x: cx + DRUM_R + 70, y: cy - 10 };
      return null;
    },

    drawGround(g, time) {
      noonShadow(g, cx, cy + 34, 150, 0.34);
      // The hatch's chalk line, sweeping round with the drum; bright and solid once it locks.
      const h = hatch(ang), t = tangent(ang);
      const L = 1100;
      if (locked) {
        const k = clamp((time - lockAt) / Math.max(1, fireAt - lockAt), 0, 1);
        g.fillStyle(SUN, 0.06 + k * 0.16);
        const nx = -t.y * (BALL_R + 8), ny = t.x * (BALL_R + 8);
        g.fillPoints([{ x: h.x + nx, y: h.y + ny }, { x: h.x + t.x * L + nx, y: h.y + t.y * L + ny }, { x: h.x + t.x * L - nx, y: h.y + t.y * L - ny }, { x: h.x - nx, y: h.y - ny }], true);
        chalkLine(g, h.x + nx, h.y + ny, h.x + t.x * L + nx, h.y + t.y * L + ny, 0.6 + k * 0.4, 2);
        chalkLine(g, h.x - nx, h.y - ny, h.x + t.x * L - nx, h.y + t.y * L - ny, 0.6 + k * 0.4, 2);
      } else {
        chalkLine(g, h.x, h.y, h.x + t.x * L, h.y + t.y * L, 0.28, 1.5);
      }
      for (const b of balls) {
        const a = b.dead ? clamp(1 - (time - b.deadAt) / 500, 0, 1) : 1;
        g.fillStyle(0x6a7088, 0.3 * a); g.fillEllipse(b.x, b.y + 4, BALL_R * 2.2, BALL_R * 0.9);
      }
    },

    drawAir(g, time) {
      drawWheel(g, cx, cy, ang, spin, locked, time, tk.now - lastCrank < 300);
      for (const b of balls) {
        const a = b.dead ? clamp(1 - (time - b.deadAt) / 500, 0, 1) : 1;
        drawBall(g, b.x, b.y - BALL_R + (b.dead ? (1 - a) * 8 : 0), b.spin, a);
      }
    },

    drawHud(g) {
      // The beat: the hatch catches when the gilt bar fills; the crank's ratchet beside it.
      const x0 = 24, y = top + 26;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 10, y - 16, 150, 34, 8);
      const total = late ? BEAT_LATE_MS : BEAT_MS;
      const k = locked ? 1 : clamp(1 - (nextBeat - tk.now) / total, 0, 1);
      g.fillStyle(0x2a2420, 1); g.fillRect(x0, y - 4, 100, 8);
      g.fillStyle(locked ? 0xe8642a : GOLD, 1); g.fillRect(x0, y - 4, 100 * k, 8);
      const ready = tk.now - lastCrank >= CRANK_CD;
      g.lineStyle(2, ready ? GOLD_LIT : 0x5a5248, 1); g.strokeCircle(x0 + 120, y, 9);
      g.lineBetween(x0 + 120, y, x0 + 120 + Math.cos(ang) * 9, y + Math.sin(ang) * 9);
      g.fillStyle(spin < 0 ? 0xe8642a : GOLD, 1); g.fillTriangle(x0 + 133, y - 4, x0 + 133, y + 4, x0 + 139 * (spin < 0 ? 0.97 : 1.01), y);
    },

    destroy() { crank.remove(); },
  };
}

/** The jury wheel: a brass-hooped mahogany drum on an iron trestle, name-balls glinting in its slots. */
function drawWheel(g: G, x: number, y: number, ang: number, spin: number, locked: boolean, time: number, jolt: boolean): void {
  const R = DRUM_R;
  // Trestle legs.
  g.lineStyle(6, IRON_DARK, 1);
  g.lineBetween(x - R - 6, y + 26, x - R + 14, y - 30); g.lineBetween(x + R + 6, y + 26, x + R - 14, y - 30);
  g.lineStyle(3, IRON_LIT, 1);
  g.lineBetween(x - R - 6, y + 25, x - R + 13, y - 30); g.lineBetween(x + R + 6, y + 25, x + R - 13, y - 30);
  // The drum, seen from above at a tilt: dark mahogany face inside a brass hoop.
  const sh = jolt ? Math.sin(time / 15) * 2 : 0;
  g.fillStyle(0x3a2014, 1); g.fillEllipse(x + sh, y - 18, R * 2 + 10, R * 1.6 + 8);
  g.fillStyle(0x5a3020, 1); g.fillEllipse(x + sh, y - 20, R * 2, R * 1.6);
  // Staves turning with the drum.
  for (let i = 0; i < 12; i++) {
    const a = ang + (i / 12) * Math.PI * 2;
    g.lineStyle(1.5, 0x2a160c, 0.9);
    g.lineBetween(x + sh + Math.cos(a) * R * 0.25, y - 20 + Math.sin(a) * R * 0.2, x + sh + Math.cos(a) * R, y - 20 + Math.sin(a) * R * 0.8);
  }
  // Slots with name-balls showing through.
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * Math.PI * 2 + 0.26;
    const sx = x + sh + Math.cos(a) * R * 0.62, sy = y - 20 + Math.sin(a) * R * 0.5;
    g.fillStyle(INK, 1); g.fillEllipse(sx, sy, 12, 8);
    g.fillStyle(BRONZE_LIT, 1); g.fillCircle(sx - 1, sy - 1, 3);
  }
  g.lineStyle(5, BRONZE_DARK, 1); g.strokeEllipse(x + sh, y - 20, R * 2, R * 1.6);
  g.lineStyle(2, BRONZE_LIT, 1); g.strokeEllipse(x + sh, y - 21, R * 2 - 3, R * 1.6 - 3);
  for (let i = 0; i < 16; i++) {
    const a = ang + (i / 16) * Math.PI * 2;
    g.fillStyle(RIVET, 1); g.fillCircle(x + sh + Math.cos(a) * R, y - 20 + Math.sin(a) * R * 0.8, 1.6);
  }
  // The hub and its gilt boss.
  g.fillStyle(IRON, 1); g.fillCircle(x + sh, y - 20, 11);
  g.fillStyle(GOLD, 1); g.fillCircle(x + sh, y - 20, 7);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x + sh - 2, y - 22, 2.5);
  // The hatch: a gilt door on the rim with a red wax seal, sprung open when it catches.
  const hx = x + sh + Math.cos(ang) * R, hy = y - 20 + Math.sin(ang) * R * 0.8;
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(hx, hy, 10);
  g.fillStyle(locked ? lit(GOLD, 0.5) : GOLD, 1); g.fillCircle(hx, hy, 8);
  g.fillStyle(WAX, 1); g.fillCircle(hx, hy, 3.5);
  if (locked) glow(g, hx, hy, 22, SUN, 0.08 + Math.sin(time / 50) * 0.03, 3);
  // The crank on the east axle.
  const kx = x + R + 34, ky = y - 22;
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + R - 4, y - 20, kx, ky);
  const ca = ang * 2;
  g.lineStyle(4, BRONZE, 1); g.lineBetween(kx, ky, kx + Math.cos(ca) * 16, ky + Math.sin(ca) * 10);
  g.fillStyle(ROBE_DARK, 1); g.fillRoundedRect(kx + Math.cos(ca) * 16 - 4, ky + Math.sin(ca) * 10 - 9, 8, 14, 3);
  g.fillStyle(BRONZE_DARK, 1); g.fillCircle(kx, ky, 5);
  // Direction chevrons painted on the trestle's foot-board.
  const dir = spin >= 0 ? 1 : -1;
  for (let i = -1; i <= 1; i++) {
    const bx = x + i * 18, by = y + 30;
    g.lineStyle(2, dim(GOLD, 0.2), 0.9);
    g.lineBetween(bx - 4 * dir, by - 4, bx + 4 * dir, by); g.lineBetween(bx + 4 * dir, by, bx - 4 * dir, by + 4);
  }
}

/** A name-ball: a heavy brass ball with a parchment slip wound round it, the name in ink. */
function drawBall(g: G, x: number, y: number, spin: number, a: number): void {
  g.fillStyle(BRONZE_DARK, a); g.fillCircle(x, y, BALL_R);
  g.fillStyle(BRONZE, a); g.fillCircle(x - 1, y - 1, BALL_R - 2);
  const band = Math.sin(spin) * BALL_R * 0.7;
  g.fillStyle(PARCH, a); g.fillEllipse(x, y + band * 0.4, BALL_R * 1.9, 7);
  g.lineStyle(1, PARCH_DARK, a); g.strokeEllipse(x, y + band * 0.4, BALL_R * 1.9, 7);
  g.lineStyle(1, INK, a * 0.8);
  for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 4 - 1, y + band * 0.4 - 1, x + i * 4 + 1, y + band * 0.4 + 1);
  g.fillStyle(BRONZE_LIT, a); g.fillCircle(x - 5, y - 6, 3.5);
  g.fillStyle(0xffffff, a * 0.6); g.fillCircle(x - 6, y - 7, 1.5);
}

export const FALLEN_JURY_WHEEL: GimmickDef = {
  id: ID,
  rules: 'The jury wheel turns; on the clank a name-ball flies off its hatch\'s chalk line, bowling whoever it meets. Strike the crank to spring it now.',
  make,
};
