import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { CANVAS, CANVAS_DARK, GOLD, GOLD_DARK, GOLD_LIT, SIDE_NPC, SIDE_PLAYER, SKY, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Still Life — Portraitist Likeness.
 *
 * Likeness paints from life, and life will not hold still, so he paints whoever holds stillest.
 * His easel stands at the top of the yard; the canvas fills, stroke by stroke, with whichever
 * fighter has moved least these last moments (if the sitter changes he scrapes it and starts
 * over). Finished, the portrait steps out of its frame — a painted copy of the sitter that fights
 * for the painter, chasing you and flicking paint.
 *
 * He is a sand-and-hourglass man, too: every so often he calls "HOLD STILL!" and a gilt frame is
 * chalked round you — be outside it when the sand runs out, or be held in the pose. A dash blurs
 * the portrait; strike the easel to smear it. And if *he* is the sitter, his copy is his own
 * likeness: every blow you land on it lands on him.
 */

const COPY_MS = 14000;
const FRAME_W = 190, FRAME_H = 140;

interface Sitter { f: Fighter; speed: number; lx: number; ly: number }

interface Copy {
  of: 'player' | 'npc';
  x: number; y: number;
  bornAt: number;
  hp: number;
  nextShot: number;
  target: StrikeTarget | null;
  hurtAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const EASEL: Pt = { x: W / 2, y: top + 92 };
  const RATE = ctx.hard ? 1 / 6 : 1 / 7.2;
  const sitters: Sitter[] = [player, npc].map((f) => ({ f, speed: 0, lx: f.x, ly: f.y }));
  let sitter: 'player' | 'npc' | null = null;
  let progress = 0;
  const copies: Copy[] = [];
  const COPY_HP = ctx.hard ? 4 : 3;
  const HOLD_EVERY = ctx.hard ? 9000 : 11000;
  const HOLD_WARN = 1150;
  let nextHold = 0;
  let hold: { x: number; y: number; at: number } | null = null;
  let heldUntil = 0;
  let blurCd = 0;
  let started = false;

  const easel = ctx.target({
    x: EASEL.x, y: EASEL.y - 10, r: 38,
    onStruck: () => {
      if (progress <= 0) return;
      progress = Math.max(0, progress - 0.2);
      ctx.float(EASEL.x, EASEL.y - 80, 'SMEARED', '#f0e0c0');
      ctx.sfx('slime-splat');
    },
  });

  const fighterOf = (s: 'player' | 'npc') => (s === 'player' ? player : npc);

  function finish(time: number): void {
    if (!sitter) return;
    const of = sitter;
    const c: Copy = { of, x: EASEL.x, y: EASEL.y + 40, bornAt: time, hp: COPY_HP, nextShot: time + 1200, target: null, hurtAt: -9999 };
    c.target = ctx.target({
      x: c.x, y: c.y, r: 22,
      onStruck: (by) => {
        if (by !== 'player') return;
        c.hp--; c.hurtAt = ctx.scene.time.now;
        ctx.sfx('slime-splat');
        if (c.of === 'npc' && alive(npc)) { ctx.hit(npc, ctx.hard ? 8 : 10, npc.x, npc.y); ctx.float(npc.x, npc.y - 48, 'LIKENESS!', '#ffd090'); }
        if (c.hp <= 0) { c.target?.remove(); c.target = null; ctx.float(c.x, c.y - 36, 'SCRAPED', '#f0e0c0'); }
      },
    });
    copies.push(c);
    if (copies.filter((k) => k.target).length > 2) { const old = copies.find((k) => k.target); old?.target?.remove(); if (old) old.target = null; }
    progress = 0;
    ctx.banner(of === 'player' ? 'YOUR LIKENESS STEPS OUT' : 'LIKENESS PAINTS HIMSELF', '#ffe2a8');
    ctx.sfx('portal');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextHold = time + 6000; }
      // How still is everyone? A smoothed speed.
      for (const s of sitters) {
        const v = dt > 0 ? dist(s.lx, s.ly, s.f.x, s.f.y) / dt : 0;
        s.speed += (Math.min(v, 400) - s.speed) * Math.min(1, dt * 2.2);
        s.lx = s.f.x; s.ly = s.f.y;
      }
      const [sp, sn] = sitters;
      let still: 'player' | 'npc' | null = null;
      if (alive(player) && alive(npc)) {
        if (sp.speed + 25 < sn.speed && sp.speed < 110) still = 'player';
        else if (sn.speed + 25 < sp.speed && sn.speed < 110) still = 'npc';
      }
      if (still) {
        if (sitter && sitter !== still && progress > 0) {
          progress = Math.max(0, progress - dt * 0.45);
        } else {
          if (sitter !== still) { sitter = still; ctx.sfx('beam-charge'); }
          const calm = clamp(1 - sitters[still === 'player' ? 0 : 1].speed / 110, 0.25, 1);
          progress += RATE * calm * dt * (time < heldUntil && still === 'player' ? 1.8 : 1);
          if (progress >= 1) finish(time);
        }
      }
      // A dash blurs the sitter's portrait.
      if (sitter && time > blurCd && ctx.dashing(fighterOf(sitter)) && progress > 0) {
        blurCd = time + 600;
        progress = Math.max(0, progress - 0.15);
        ctx.float(EASEL.x, EASEL.y - 80, 'BLURRED', '#f0e0c0');
      }
      // HOLD STILL: a gilt frame chalked round you; inside it when the sand runs out, you are held.
      if (!hold && time >= nextHold - HOLD_WARN && alive(player)) {
        hold = { x: clamp(player.x, FRAME_W / 2 + 20, W - FRAME_W / 2 - 20), y: clamp(player.y, top + FRAME_H / 2 + 10, H - FRAME_H / 2 - 10), at: time };
        ctx.sfx('clock-tick');
        if (alive(npc)) ctx.float(npc.x, npc.y - 56, 'HOLD STILL!', '#ffe2a8');
      }
      if (hold && time >= hold.at + HOLD_WARN) {
        if (alive(player) && Math.abs(player.x - hold.x) < FRAME_W / 2 && Math.abs(player.y - hold.y) < FRAME_H / 2) {
          const ms = ctx.hard ? 1600 : 1300;
          ctx.root(player, ms);
          heldUntil = time + ms;
          ctx.float(player.x, player.y - 50, 'HELD IN THE POSE', '#ffe2a8');
          ctx.sfx('time-warp');
        }
        hold = null;
        nextHold = time + HOLD_EVERY;
      }
      // The copies: walk at you, flick paint, fade when their time is up.
      for (let i = copies.length - 1; i >= 0; i--) {
        const c = copies[i];
        const age = time - c.bornAt;
        if (!c.target) { if (time - c.hurtAt > 600 || age > COPY_MS + 600) copies.splice(i, 1); continue; }
        if (age > COPY_MS) { c.target.remove(); c.target = null; c.hurtAt = time; continue; }
        if (!alive(player)) continue;
        const d = dist(c.x, c.y, player.x, player.y);
        const a = Math.atan2(player.y - c.y, player.x - c.x);
        const want = d > 170 ? 1 : d < 120 ? -0.6 : 0.2;
        c.x = clamp(c.x + Math.cos(a + (want < 0.5 ? 1.2 : 0)) * 120 * want * dt, 40, W - 40);
        c.y = clamp(c.y + Math.sin(a + (want < 0.5 ? 1.2 : 0)) * 120 * want * dt, top + 30, H - 30);
        c.target.moveTo(c.x, c.y);
        if (time >= c.nextShot && age > 900) {
          c.nextShot = time + (ctx.hard ? 1100 : 1400);
          ctx.tk.spawnBullet({ x: c.x, y: c.y - 10, angle: a, speed: 300, damage: ctx.hard ? 7 : 6, r: 6, lifeMs: 2600, color: c.of === 'player' ? SIDE_PLAYER : SIDE_NPC });
          ctx.sfx('slime-splat');
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // Never still himself: he circles you, brush up, so you are the one who sits.
      const a = time / 1700;
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 170, top + 60, H - 40) };
    },

    drawGround(g, time) {
      // The chalked HOLD STILL frame, sand running out of an hourglass at its head.
      if (hold) {
        const k = clamp((time - hold.at) / HOLD_WARN, 0, 1);
        const x0 = hold.x - FRAME_W / 2, y0 = hold.y - FRAME_H / 2;
        g.fillStyle(GOLD_LIT, 0.06 + k * 0.14); g.fillRect(x0, y0, FRAME_W, FRAME_H);
        g.lineStyle(8, GOLD_DARK, 0.5 + k * 0.4); g.strokeRect(x0, y0, FRAME_W, FRAME_H);
        g.lineStyle(4, GOLD, 0.6 + k * 0.4); g.strokeRect(x0, y0, FRAME_W, FRAME_H);
        for (const [cx, cy] of [[x0, y0], [x0 + FRAME_W, y0], [x0, y0 + FRAME_H], [x0 + FRAME_W, y0 + FRAME_H]]) { g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx, cy, 6); }
        hourglass(g, hold.x, y0 - 4, 1 - k);
      }
      // Wet footprints of the copies.
      for (const c of copies) { g.fillStyle(c.of === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.15); g.fillEllipse(c.x, c.y + 16, 34, 10); }
    },

    drawAir(g, time) {
      // The easel and its canvas.
      const ex = EASEL.x, ey = EASEL.y;
      g.fillStyle(0x000000, 0.2); g.fillEllipse(ex, ey + 30, 70, 12);
      g.lineStyle(4, TIMBER_DARK, 1);
      g.lineBetween(ex - 26, ey + 30, ex - 10, ey - 70); g.lineBetween(ex + 26, ey + 30, ex + 10, ey - 70); g.lineBetween(ex, ey - 64, ex + 4, ey + 34);
      g.lineStyle(5, TIMBER, 1); g.lineBetween(ex - 34, ey + 4, ex + 34, ey + 4);
      const cw = 64, ch = 70, cx = ex - cw / 2, cy = ey - 68;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(cx - 5, cy - 5, cw + 10, ch + 10);
      g.fillStyle(GOLD, 1); g.fillRect(cx - 4, cy - 4, cw + 8, ch + 8);
      g.fillStyle(CANVAS, 1); g.fillRect(cx, cy, cw, ch);
      if (sitter && progress > 0) portrait(g, cx, cy, cw, ch, progress, sitter === 'player' ? SIDE_PLAYER : SIDE_NPC, time);
      // Progress: a gilt bar under the canvas that empties back as it is scraped.
      g.fillStyle(0x000000, 0.4); g.fillRect(cx, cy + ch + 8, cw, 5);
      g.fillStyle(sitter === 'player' ? SIDE_PLAYER : SIDE_NPC, 1); g.fillRect(cx, cy + ch + 8, cw * clamp(progress, 0, 1), 5);
      // Who is sitting: a little gilt pointer from the easel to the sitter.
      if (sitter && progress > 0.05) {
        const f = fighterOf(sitter);
        if (alive(f)) {
          const a = Math.atan2(f.y - ey, f.x - ex);
          g.lineStyle(1.5, GOLD_LIT, 0.35 + progress * 0.4);
          for (let s = 50; s < Math.min(dist(ex, ey, f.x, f.y) - 30, 600); s += 22) g.lineBetween(ex + Math.cos(a) * s, ey + Math.sin(a) * s, ex + Math.cos(a) * (s + 10), ey + Math.sin(a) * (s + 10));
        }
      }
      // The copies: brushstroke figures in a broken gilt frame, wet paint dripping.
      for (const c of copies) {
        const age = time - c.bornAt;
        const fade = c.target ? clamp(age / 500, 0, 1) : clamp(1 - (time - c.hurtAt) / 600, 0, 1);
        const col = c.of === 'player' ? SIDE_PLAYER : SIDE_NPC;
        const hurt = time - c.hurtAt < 180;
        paintedFigure(g, c.x, c.y, col, fade, time, hurt);
        if (c.target) for (let i = 0; i < c.hp; i++) { g.fillStyle(col, fade); g.fillCircle(c.x - (c.hp - 1) * 5 + i * 10, c.y - 46, 3); }
      }
      if (time < heldUntil && alive(player)) {
        // Held: the frame snapped tight round you.
        g.lineStyle(4, GOLD, 0.8); g.strokeRect(player.x - 30, player.y - 40, 60, 70);
        glow(g, player.x, player.y, 30, GOLD_LIT, 0.05, 2);
      }
    },

    destroy() { easel.remove(); for (const c of copies) c.target?.remove(); copies.length = 0; },
  };
}

/** An hourglass, `k` of its sand still to run. */
function hourglass(g: G, x: number, y: number, k: number): void {
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 10, y - 30, 20, 3); g.fillRect(x - 10, y - 3, 20, 3);
  g.fillStyle(0xeaf6ff, 0.8); g.fillTriangle(x - 8, y - 27, x + 8, y - 27, x, y - 15); g.fillTriangle(x - 8, y - 3, x + 8, y - 3, x, y - 15);
  g.fillStyle(0xe8c890, 1);
  g.fillTriangle(x - 8 * k, y - 15 - 12 * k, x + 8 * k, y - 15 - 12 * k, x, y - 15);
  g.fillTriangle(x - 8 * (1 - k), y - 3, x + 8 * (1 - k), y - 3, x, y - 3 - 12 * (1 - k));
  g.lineStyle(1, 0xe8c890, 1); g.lineBetween(x, y - 15, x, y - 4);
}

/** The portrait as it comes: a wash of sky, then the figure blocked in, then the face, then gilt. */
function portrait(g: G, x: number, y: number, w: number, h: number, k: number, col: number, time: number): void {
  g.fillStyle(SKY, Math.min(1, k * 3)); g.fillRect(x + 2, y + 2, (w - 4) * Math.min(1, k * 3), h * 0.6);
  if (k > 0.2) {
    const b = clamp((k - 0.2) / 0.3, 0, 1);
    g.fillStyle(CANVAS_DARK, b); g.fillRect(x + 2, y + h * 0.6, w - 4, h * 0.4 - 2);
    g.fillStyle(col, b); g.fillEllipse(x + w / 2, y + h * 0.78, w * 0.6, h * 0.5);
  }
  if (k > 0.5) {
    const f = clamp((k - 0.5) / 0.3, 0, 1);
    g.fillStyle(lit(col, 0.5), f); g.fillCircle(x + w / 2, y + h * 0.38, 11);
    g.fillStyle(dim(col, 0.5), f); g.fillCircle(x + w / 2 - 4, y + h * 0.37, 1.8); g.fillCircle(x + w / 2 + 4, y + h * 0.37, 1.8);
  }
  if (k > 0.8) {
    const f = clamp((k - 0.8) / 0.2, 0, 1);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.4;
      g.lineStyle(1.5, GOLD_LIT, f); g.lineBetween(x + w / 2 + Math.cos(a) * 13, y + h * 0.38 + Math.sin(a) * 13, x + w / 2 + Math.cos(a) * 20, y + h * 0.38 + Math.sin(a) * 20);
    }
    // The last strokes go on in a flicker.
    g.fillStyle(0xffffff, 0.3 * Math.abs(Math.sin(time / 60))); g.fillRect(x, y, w, h);
  }
}

/** A painted copy: a fighter made of thick strokes of one colour, a gilt frame-corner on its shoulder. */
function paintedFigure(g: G, x: number, y: number, col: number, a: number, time: number, hurt: boolean): void {
  if (a <= 0) return;
  const c = hurt ? 0xffffff : col;
  g.fillStyle(0x000000, 0.15 * a); g.fillEllipse(x, y + 18, 34, 9);
  // Torso and head in heavy strokes.
  for (let i = 0; i < 5; i++) {
    g.lineStyle(7, i % 2 ? lit(c, 0.2) : dim(c, 0.12), 0.85 * a);
    g.lineBetween(x - 12 + i * 6, y + 14, x - 9 + i * 4.5, y - 14 + Math.sin(time / 300 + i) * 1.5);
  }
  g.fillStyle(lit(c, 0.35), 0.9 * a); g.fillCircle(x, y - 22, 10);
  g.lineStyle(3, dim(c, 0.3), 0.8 * a); g.strokeCircle(x, y - 22, 10);
  // Blank painted eyes.
  g.fillStyle(0xffffff, a); g.fillCircle(x - 3.5, y - 23, 2); g.fillCircle(x + 3.5, y - 23, 2);
  // A flicking brush-arm.
  const sw = Math.sin(time / 180) * 0.6;
  g.lineStyle(4, c, a); g.lineBetween(x + 10, y - 6, x + 22 + Math.cos(sw) * 4, y - 16 + Math.sin(sw) * 8);
  // A broken piece of the gilt frame it stepped out of.
  g.lineStyle(4, GOLD, a); g.lineBetween(x - 20, y - 36, x - 20, y - 14); g.lineBetween(x - 20, y - 36, x - 4, y - 36);
  // Drips.
  for (let i = 0; i < 3; i++) { g.fillStyle(c, 0.8 * a); g.fillEllipse(x - 8 + i * 8, y + 18 + ((time / 12 + i * 9) % 8), 3, 5); }
}

export const STILL_LIFE: GimmickDef = {
  id: 'mural-still-life',
  rules: 'Likeness paints whoever holds stillest; a finished portrait steps out and fights for him. Dash or strike the easel to smear it. Step out of his frame.',
  make,
};
