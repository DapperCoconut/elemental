import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { soulWisp } from '../art';
import { PAPER, PAPER_DARK, SOUL, SOUL_LIT, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';
import { THEM, wirePlate, YOU } from './common';

/**
 * Nothing Stays Lost — Aldhelm Spruce, the Prince's Old Tutor.
 *
 * Spruce taught the boy who became the Lamplighter his first lesson: nothing that goes out may stay
 * lost; everything comes home to the light. In his yard that holds for shots. A shot that misses —
 * that runs out, or ends anywhere but on the one it was meant for — becomes a little lost soul where
 * it fell. It waits a breath, showing the frosted line it will take, and then flies straight home
 * to whoever fired it. It cannot hurt its own shooter, and a shooter who catches it gets a quick
 * rush of cooldowns; but anyone else on that line is struck as it passes.
 *
 * So her misses come home through you if you stand between them and her, and yours go home through
 * her. Shoot *past* her on purpose and the stray flies back to you straight through where she
 * stands. Spruce also sets lessons: every few seconds he lobs chalk high over you to land behind and
 * beside you, and each piece flies home to him — across you, unless you step off its line. Past
 * half, the lessons come five pieces at a time.
 */

const WAIT = 650;
const SPEED = 310;
const HIT_R = 24;
const MAX_STRAYS = 12;
const LESSON_EVERY = 6500;
const LOB_MS = 720;

type Side = 'player' | 'npc';
interface Track { x: number; y: number; vx: number; vy: number; owner: Side; damage: number; bornAt: number; seen: boolean }
interface Stray { x: number; y: number; owner: Side; dmg: number; bornAt: number; dir: Pt | null; left: number; spent: boolean; endAt: number }
interface Chalk { x0: number; y0: number; x1: number; y1: number; t0: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  let tracks: Track[] = [];
  const strays: Stray[] = [];
  const chalks: Chalk[] = [];
  let late = false;
  let nextLesson = 0;
  let started = false;
  const rush: Record<Side, number> = { player: 0, npc: 0 };
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

  function addStray(x: number, y: number, owner: Side, dmg: number, time: number): void {
    if (strays.filter((s) => !s.spent).length >= MAX_STRAYS) return;
    strays.push({ x: clamp(x, 30, W - 30), y: clamp(y, top + 20, H - 20), owner, dmg: clamp(Math.round(dmg * 0.7), 6, 14), bornAt: time, dir: null, left: 0, spent: false, endAt: 0 });
    ctx.sfx('ice-shard');
  }

  /**
   * Follow every shot in flight frame to frame (shot handles are rebuilt each call, so they are
   * matched by owner and predicted position). One that vanishes away from its target missed.
   */
  function trackShots(time: number, dt: number): void {
    const cur = ctx.shotsNear(W / 2, H / 2, 1400);
    for (const t of tracks) t.seen = false;
    const next: Track[] = [];
    for (const s of cur) {
      let best: Track | null = null, bd = 46;
      for (const t of tracks) {
        if (t.seen || t.owner !== s.owner) continue;
        const d = dist(t.x + t.vx * dt, t.y + t.vy * dt, s.x, s.y);
        if (d < bd) { bd = d; best = t; }
      }
      if (best) {
        best.seen = true;
        if (dt > 0) { best.vx = (s.x - best.x) / dt; best.vy = (s.y - best.y) / dt; }
        best.x = s.x; best.y = s.y; best.damage = s.damage;
        next.push(best);
      } else next.push({ x: s.x, y: s.y, vx: 0, vy: 0, owner: s.owner, damage: s.damage, bornAt: time, seen: true });
    }
    for (const t of tracks) {
      if (t.seen) continue;
      const victim = fighter(other(t.owner));
      const lx = t.x + t.vx * dt, ly = t.y + t.vy * dt;
      if (time - t.bornAt < 90 || t.damage < 2) continue;
      if (dist(lx, ly, victim.x, victim.y) < 62) continue; // it found its mark
      addStray(lx, ly, t.owner, t.damage, time);
    }
    tracks = next;
  }

  function lesson(time: number): void {
    const a = Math.atan2(player.y - npc.y, player.x - npc.x);
    const bx = Math.cos(a), by = Math.sin(a), px = -by, py = bx;
    const spots: [number, number][] = [[110, 0], [60, 100], [60, -100]];
    if (late) spots.push([20, 190], [20, -190]);
    for (const [back, side] of spots) {
      chalks.push({ x0: npc.x, y0: npc.y - 30, x1: clamp(player.x + bx * back + px * side, 40, W - 40), y1: clamp(player.y + by * back + py * side, top + 30, H - 30), t0: time });
    }
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!started) { started = true; nextLesson = time + 4000; }
      if (!late && alive(npc) && npc.hp <= npc.maxHp * 0.5) { late = true; ctx.banner('THE LESSONS LENGTHEN', '#e4f5ff'); ctx.sfx('boss-phase'); }
      trackShots(time, dt);

      if (time >= nextLesson && alive(npc) && alive(player)) { lesson(time); nextLesson = time + (late ? 5200 : LESSON_EVERY); }
      for (let i = chalks.length - 1; i >= 0; i--) {
        const c = chalks[i];
        if (time - c.t0 >= LOB_MS) { addStray(c.x1, c.y1, 'npc', 18, time); chalks.splice(i, 1); }
      }

      for (const s of strays) {
        if (s.spent) continue;
        const home = fighter(s.owner), foe = fighter(other(s.owner));
        if (!s.dir) {
          if (time - s.bornAt < WAIT) continue;
          const d = dist(s.x, s.y, home.x, home.y) || 1;
          s.dir = { x: (home.x - s.x) / d, y: (home.y - s.y) / d };
          s.left = d + 40;
          ctx.sfx('screech');
        }
        const step = SPEED * dt;
        const nx = s.x + s.dir.x * step, ny = s.y + s.dir.y * step;
        if (alive(foe) && segDist(foe.x, foe.y, s.x, s.y, nx, ny) < HIT_R + 18) {
          ctx.hit(foe, s.dmg, foe.x, foe.y);
          ctx.flash(foe.x, foe.y - 20, SOUL_LIT);
          ctx.sfx('frost-blast');
          s.spent = true; s.endAt = time;
          continue;
        }
        if (alive(home) && segDist(home.x, home.y, s.x, s.y, nx, ny) < HIT_R + 14) {
          rush[s.owner] = time + 1500;
          ctx.sfx('crystal-chime');
          s.spent = true; s.endAt = time;
          continue;
        }
        s.x = nx; s.y = ny; s.left -= step;
        if (s.left <= 0) { s.spent = true; s.endAt = time; }
      }
      for (let i = strays.length - 1; i >= 0; i--) if (strays[i].spent && time - strays[i].endAt > 500) strays.splice(i, 1);
    },

    playerCooldownRate() { return ctx.scene.time.now < rush.player ? 1.5 : 1; },
    npcCooldownRate() { return ctx.scene.time.now < rush.npc ? 1.5 : 1; },

    npcSeek() {
      // Off the line of any of the stranger's strays coming home.
      for (const s of strays) {
        if (s.spent || s.owner !== 'player') continue;
        const tx = s.dir ? s.x + s.dir.x * s.left : player.x, ty = s.dir ? s.y + s.dir.y * s.left : player.y;
        if (segDist(npc.x, npc.y, s.x, s.y, tx, ty) > 56) continue;
        const lx = tx - s.x, ly = ty - s.y, l = Math.hypot(lx, ly) || 1;
        const side = (npc.x - s.x) * -ly + (npc.y - s.y) * lx >= 0 ? 1 : -1;
        return { x: clamp(npc.x - ly / l * side * 90, 60, W - 60), y: clamp(npc.y + lx / l * side * 90, top + 40, H - 40) };
      }
      // A stray of his waiting: put the stranger between it and him.
      const mine = strays.find((s) => !s.spent && !s.dir && s.owner === 'npc');
      if (mine) {
        const d = dist(mine.x, mine.y, player.x, player.y) || 1;
        return { x: clamp(player.x + (player.x - mine.x) / d * 150, 60, W - 60), y: clamp(player.y + (player.y - mine.y) / d * 150, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.sin(ctx.scene.time.now / 1700) * 0.5;
      return { x: clamp(player.x + Math.cos(a) * 260, 60, W - 60), y: clamp(player.y + Math.sin(a) * 220, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // Each waiting stray's way home, frosted on the flags with chevrons pointing home.
      for (const s of strays) {
        if (s.spent) continue;
        const home = fighter(s.owner);
        const tx = s.dir ? s.x + s.dir.x * s.left : home.x, ty = s.dir ? s.y + s.dir.y * s.left : home.y;
        const k = s.dir ? 1 : clamp((time - s.bornAt) / WAIT, 0, 1);
        const col = s.owner === 'player' ? YOU : THEM;
        const L = dist(s.x, s.y, tx, ty) || 1, ux = (tx - s.x) / L, uy = (ty - s.y) / L;
        g.lineStyle(HIT_R * 1.4, SOUL, 0.05 + k * 0.08); g.lineBetween(s.x, s.y, tx, ty);
        g.lineStyle(1.4, SOUL_LIT, 0.35 + k * 0.4);
        for (let d = 10; d < L; d += 26) {
          const cx = s.x + ux * d, cy = s.y + uy * d;
          g.lineBetween(cx - ux * 6 - uy * 6, cy - uy * 6 + ux * 6, cx, cy);
          g.lineBetween(cx - ux * 6 + uy * 6, cy - uy * 6 - ux * 6, cx, cy);
        }
        g.lineStyle(1.2, col, 0.5); g.strokeCircle(s.x, s.y, 12 + (1 - k) * 10);
      }
      // Where each lobbed chalk will land: a chalk cross, shadow swelling.
      for (const c of chalks) {
        const k = clamp((time - c.t0) / LOB_MS, 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.18); g.fillEllipse(c.x1, c.y1, 8 + k * 14, 4 + k * 6);
        g.lineStyle(1.6, PAPER, 0.7); g.lineBetween(c.x1 - 8, c.y1 - 4, c.x1 + 8, c.y1 + 4); g.lineBetween(c.x1 - 8, c.y1 + 4, c.x1 + 8, c.y1 - 4);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const c of chalks) {
        const k = clamp((time - c.t0) / LOB_MS, 0, 1);
        const x = c.x0 + (c.x1 - c.x0) * k, y = c.y0 + (c.y1 - c.y0) * k - Math.sin(k * Math.PI) * 120;
        const a = time / 60;
        g.lineStyle(4, PAPER, 1); g.lineBetween(x - Math.cos(a) * 7, y - Math.sin(a) * 7, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
        g.lineStyle(1, PAPER_DARK, 1); g.lineBetween(x + Math.cos(a) * 5, y + Math.sin(a) * 5, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      }
      for (const s of strays) {
        const col = s.owner === 'player' ? YOU : THEM;
        if (s.spent) {
          const k = (time - s.endAt) / 500;
          g.lineStyle(2, SOUL_LIT, 1 - k); g.strokeCircle(s.x, s.y - 12, 8 + k * 24);
          continue;
        }
        const head = s.dir ? Math.atan2(s.dir.y, s.dir.x) : -Math.PI / 2;
        const y = s.y - 12 + (s.dir ? 0 : Math.sin(t * 6 + s.x) * 2);
        glow(g, s.x, y, 20, SOUL, 0.06, 2);
        soulWisp(g, s.x, y, 8, t + s.bornAt, lit(SOUL, 0.2), 0.95, !!s.dir, head);
        // The frozen shard it was, at its heart, rimmed in its shooter's colour.
        g.fillStyle(SOUL_LIT, 1); g.fillTriangle(s.x - 3, y + 2, s.x + 3, y + 2, s.x, y - 6);
        g.lineStyle(1.4, col, 0.9); g.strokeCircle(s.x, y, 10);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      wirePlate(g, cx, y, 210, 30);
      // A little slate: chalk marks for the next lesson, filling.
      g.fillStyle(0x2e3a36, 1); g.fillRect(cx - 94, y + 7, 56, 16);
      g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeRect(cx - 94, y + 7, 56, 16);
      const k = clamp(1 - (nextLesson - time) / (late ? 5200 : LESSON_EVERY), 0, 1);
      const n = late ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const on = k >= (i + 1) / (n + 1);
        g.lineStyle(1.6, PAPER, on ? 1 : 0.25);
        g.lineBetween(cx - 88 + i * 9, y + 10, cx - 85 + i * 9, y + 20);
      }
      // Strays in the air, his and yours.
      const mine = strays.filter((s) => !s.spent && s.owner === 'player').length;
      const his = strays.filter((s) => !s.spent && s.owner === 'npc').length;
      for (let i = 0; i < Math.min(mine, 6); i++) { g.fillStyle(YOU, 1); g.fillCircle(cx - 22 + i * 8, y + 15, 2.8); }
      for (let i = 0; i < Math.min(his, 6); i++) { g.fillStyle(THEM, 1); g.fillCircle(cx + 40 + i * 8, y + 15, 2.8); }
      g.lineStyle(1, PAPER_DARK, 0.8); g.lineBetween(cx + 32, y + 8, cx + 32, y + 22);
      if (time < rush.player) { g.lineStyle(1.6, SOUL_LIT, 0.9); g.strokeCircle(cx + 94, y + 15, 6 + Math.sin(time / 80)); }
    },

    destroy() { strays.length = 0; chalks.length = 0; },
  };
}

export const FALLEN_STRAY_HOME: GimmickDef = {
  id: fallenId('lantern', 'stray-home'),
  rules: 'A shot that misses becomes a lost soul and flies home to its shooter, striking anyone else on the line. Miss past him on purpose.',
  make,
};
