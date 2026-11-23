import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { mixC } from '../../../../../art/IsleArt';
import { DROWNED, FOAM, TIDE, TIDE_LIT, TIDE_PALE } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf } from './util';

/**
 * DECREE OF THE WEIGHTING STONE — Councilor Aldous Rimewright, Seat of Rime (ice).
 *
 * Rimewright wrote the clause that sent the drowned down *weighted*: a stone of black glass, bound
 * in iron and rime, to keep each sleeper on the floor of the Undertow. One of them sits on the
 * fighting floor. Strike it — with anything — and after a breath (its path is drawn on the ice) it
 * slides away from whoever struck it, fast, glancing off the walls and slowing as it goes. Whoever
 * it runs into is FROZEN to it (stunned) and hurt; the track it leaves is rime, and rime drags.
 *
 * It is billiards. Rimewright is perfected ice and lines up behind the stone so his casts send it
 * at you — and so can you: anything you fire at him *through* the stone sends it at him.
 */

const STONE_R = 30;

interface Rime { x: number; y: number; at: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top } = ctx;
  const ARM_MS = ctx.hard ? 380 : 460;
  const SPEED = ctx.hard ? 700 : 640;
  const FRICTION = 0.62;
  const DMG = ctx.hard ? 24 : 20;
  const FREEZE_MS = ctx.hard ? 1000 : 900;
  const RIME_MS = 3600;

  const s = { x: W / 2, y: (top + H) / 2 + 20, vx: 0, vy: 0, dx: 1, dy: 0 };
  let state: 'idle' | 'arming' | 'slide' = 'idle';
  let armAt = 0;
  let lastBy: Who = 'npc';
  let target: StrikeTarget | null = null;
  const rime: Rime[] = [];
  let lastRime = { x: s.x, y: s.y };
  const hitCd: Record<Who, number> = { player: 0, npc: 0 };
  const frozeAt: Record<Who, number> = { player: -9999, npc: -9999 };
  let spin = 0;
  const now = () => ctx.scene.time.now;
  const speed = () => Math.hypot(s.vx, s.vy);

  const strike = (by: Who) => {
    if (state === 'arming' || (state === 'slide' && speed() > 140)) return;
    const f = fighterOf(ctx, by);
    let dx = s.x - f.x, dy = s.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) { const a = ctx.rng() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= d; dy /= d; }
    s.dx = dx; s.dy = dy; s.vx = 0; s.vy = 0;
    state = 'arming'; armAt = now() + ARM_MS; lastBy = by;
    ctx.sfx('ice-shard');
  };

  /** Where the stone would run: out along its line, one bounce, for the telegraph. */
  const path = (): { x: number; y: number }[] => {
    const pts = [{ x: s.x, y: s.y }];
    let x = s.x, y = s.y, dx = s.dx, dy = s.dy, left = 520;
    for (let b = 0; b < 2 && left > 0; b++) {
      const tx = dx > 0 ? (W - STONE_R - x) / dx : dx < 0 ? (STONE_R - x) / dx : Infinity;
      const ty = dy > 0 ? (H - STONE_R - y) / dy : dy < 0 ? (top + STONE_R - y) / dy : Infinity;
      const t = Math.min(tx, ty, left);
      x += dx * t; y += dy * t; left -= t;
      pts.push({ x, y });
      if (t === tx) dx = -dx; else if (t === ty) dy = -dy;
    }
    return pts;
  };

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.05);
      if (!target) {
        target = ctx.target({ x: s.x, y: s.y, r: STONE_R, onStruck: (by) => strike(by) });
        ctx.banner('THE WEIGHTING STONE: IT SLIDES FROM WHOEVER STRIKES IT', '#d4f0ff');
      }
      if (state === 'arming' && time >= armAt) {
        state = 'slide'; s.vx = s.dx * SPEED; s.vy = s.dy * SPEED;
        ctx.sfx('frost-blast');
      }
      if (state === 'slide') {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < STONE_R) { s.x = STONE_R; s.vx = Math.abs(s.vx) * 0.85; ctx.sfx('clang'); }
        if (s.x > W - STONE_R) { s.x = W - STONE_R; s.vx = -Math.abs(s.vx) * 0.85; ctx.sfx('clang'); }
        if (s.y < top + STONE_R) { s.y = top + STONE_R; s.vy = Math.abs(s.vy) * 0.85; ctx.sfx('clang'); }
        if (s.y > H - STONE_R) { s.y = H - STONE_R; s.vy = -Math.abs(s.vy) * 0.85; ctx.sfx('clang'); }
        const k = Math.exp(-FRICTION * dt);
        s.vx *= k; s.vy *= k;
        spin += speed() * dt * 0.02;
        if (dist(s.x, s.y, lastRime.x, lastRime.y) > 16) { rime.push({ x: s.x, y: s.y, at: time }); lastRime = { x: s.x, y: s.y }; }
        // Whoever it runs into.
        const sp = speed();
        if (sp > 160) {
          for (const w of WHO) {
            const f = fighterOf(ctx, w);
            if (!alive(f) || time < hitCd[w] || dist(f.x, f.y, s.x, s.y) > STONE_R + 22) continue;
            hitCd[w] = time + 700;
            frozeAt[w] = time;
            ctx.hit(f, Math.round(DMG * clamp(sp / SPEED, 0.55, 1)), f.x, f.y);
            ctx.stun(f, FREEZE_MS);
            ctx.nudge(f, (s.vx / sp) * 46, (s.vy / sp) * 46);
            ctx.sfx('ice-shatter');
            ctx.flash(f.x, f.y, TIDE_PALE);
            if (w === 'player') ctx.float(f.x, f.y - 50, 'WEIGHTED', '#d4f0ff');
            // It glances off them, losing most of its run.
            const nx = (s.x - f.x) / (dist(s.x, s.y, f.x, f.y) || 1), ny = (s.y - f.y) / (dist(s.x, s.y, f.x, f.y) || 1);
            const dot = s.vx * nx + s.vy * ny;
            if (dot < 0) { s.vx -= 2 * dot * nx; s.vy -= 2 * dot * ny; }
            s.vx *= 0.45; s.vy *= 0.45;
          }
        }
        if (speed() < 45) { state = 'idle'; s.vx = 0; s.vy = 0; }
      }
      target?.moveTo(s.x, s.y);
      while (rime.length && time - rime[0].at > RIME_MS) rime.shift();
    },
    playerSpeedMult() { return onRime(ctx.player.x, ctx.player.y) ? 0.68 : 1; },
    npcSpeedMult() { return onRime(ctx.npc.x, ctx.npc.y) ? 0.68 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (state === 'slide' && speed() > 160) {
        // Coming at him: step off its line.
        const sp = speed(), ux = s.vx / sp, uy = s.vy / sp;
        const rx = n.x - s.x, ry = n.y - s.y;
        const along = rx * ux + ry * uy, across = rx * -uy + ry * ux;
        if (along > 0 && Math.abs(across) < 70) {
          const side = across >= 0 ? 1 : -1;
          return { x: clamp(n.x + -uy * side * 130, 60, W - 60), y: clamp(n.y + ux * side * 130, top + 60, H - 60) };
        }
        return null;
      }
      if (state !== 'idle') return null;
      // Line up behind it, so that his casts send it at you.
      const a = Math.atan2(p.y - s.y, p.x - s.x);
      return { x: clamp(s.x - Math.cos(a) * 70, 50, W - 50), y: clamp(s.y - Math.sin(a) * 70, top + 50, H - 50) };
    },
    destroy() { target?.remove(); target = null; },
    drawGround(g, time) {
      // The track: rime crystals, newest brightest.
      for (let i = 0; i < rime.length; i++) {
        const r = rime[i];
        const k = 1 - (time - r.at) / RIME_MS;
        g.fillStyle(TIDE_PALE, 0.14 * k); g.fillCircle(r.x, r.y, 24);
        g.fillStyle(0xffffff, 0.3 * k); g.fillCircle(r.x, r.y, 9);
        const a = (i * 2.4) % (Math.PI * 2);
        g.lineStyle(1.2, 0xffffff, 0.55 * k);
        for (let j = 0; j < 3; j++) {
          const b = a + (j / 3) * Math.PI;
          g.lineBetween(r.x - Math.cos(b) * 8, r.y - Math.sin(b) * 8, r.x + Math.cos(b) * 8, r.y + Math.sin(b) * 8);
        }
      }
      // The house it rests in: frost rings round its resting place.
      if (state !== 'slide') {
        for (let i = 3; i >= 1; i--) { g.lineStyle(2, i === 1 ? TIDE_LIT : TIDE, 0.18 + (3 - i) * 0.08); g.strokeCircle(s.x, s.y, STONE_R + i * 14); }
      }
      // The telegraph: its run drawn on the ice, filling as it arms.
      if (state === 'arming') {
        const k = clamp(1 - (armAt - time) / ARM_MS, 0, 1);
        const pts = path();
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          g.lineStyle(STONE_R * 2, lastBy === 'player' ? TIDE_PALE : OBS.seam, 0.08 + k * 0.1); g.lineBetween(a.x, a.y, b.x, b.y);
          const segs = Math.floor(dist(a.x, a.y, b.x, b.y) / 26);
          for (let j = 0; j < segs; j++) {
            if ((j + Math.floor(time / 60)) % 2) continue;
            const f0 = j / segs, f1 = (j + 0.5) / segs;
            g.lineStyle(3, lastBy === 'player' ? TIDE_PALE : OBS.seamLit, 0.5 + k * 0.4);
            g.lineBetween(a.x + (b.x - a.x) * f0, a.y + (b.y - a.y) * f0, a.x + (b.x - a.x) * f1, a.y + (b.y - a.y) * f1);
          }
        }
      }
    },
    drawAir(g, time) {
      drawStone(g, time);
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const k = (time - frozeAt[w]) / FREEZE_MS;
        if (!alive(f) || k < 0 || k > 1) continue;
        // Rimed over: a cage of ice shards round the stunned.
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + 0.3;
          const r0 = 16, r1 = 30 + (i % 2) * 8;
          g.fillStyle(TIDE_PALE, 0.65 * (1 - k * 0.6));
          g.fillTriangle(f.x + Math.cos(a - 0.2) * r0, f.y + Math.sin(a - 0.2) * r0, f.x + Math.cos(a + 0.2) * r0, f.y + Math.sin(a + 0.2) * r0, f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1 - 6);
        }
        g.lineStyle(2, 0xffffff, 0.6 * (1 - k)); g.strokeCircle(f.x, f.y, 26);
      }
    },
  };

  function onRime(x: number, y: number): boolean {
    for (const r of rime) if (Math.abs(r.x - x) < 26 && Math.abs(r.y - y) < 26) return true;
    return false;
  }

  /** The stone: black glass in iron hoops, frosted, a sleeper's chain trailing off it. */
  function drawStone(g: Phaser.GameObjects.Graphics, time: number): void {
    const x = s.x, y = s.y, r = STONE_R;
    const arming = state === 'arming';
    const shake = arming ? Math.sin(time / 18) * 2 : 0;
    const cx = x + shake;
    g.fillStyle(0x000000, 0.45); g.fillEllipse(cx + 4, y + r * 0.7, r * 2.2, r * 0.7);
    // The chain it was tied to a sleeper by, lying slack behind it.
    const back = Math.atan2(-s.dy, -s.dx);
    for (let i = 1; i <= 5; i++) {
      const lx = cx + Math.cos(back + Math.sin(i + spin) * 0.25) * (r + i * 9), ly = y + Math.sin(back + Math.sin(i + spin) * 0.25) * (r + i * 9);
      g.lineStyle(2.4, 0x2a2a34, 1); g.strokeEllipse(lx, ly, i % 2 ? 9 : 5, i % 2 ? 5 : 9);
      g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(lx, ly - 0.5, i % 2 ? 9 : 5, i % 2 ? 5 : 9);
    }
    g.fillStyle(OBS.glass, 1); g.fillCircle(cx, y, r);
    g.fillStyle(OBS.facet, 1); g.fillCircle(cx - r * 0.18, y - r * 0.18, r * 0.78);
    g.fillStyle(OBS.sheen, 0.9); g.fillCircle(cx - r * 0.3, y - r * 0.32, r * 0.42);
    // Something kept inside: the outline of a sleeper's hand pressed to the glass.
    g.fillStyle(DROWNED, 0.25); g.fillEllipse(cx + r * 0.25, y + r * 0.15, r * 0.5, r * 0.4);
    for (let i = 0; i < 4; i++) { g.lineStyle(2, DROWNED, 0.22); g.lineBetween(cx + r * 0.2 + i * 4, y + r * 0.05, cx + r * 0.16 + i * 5, y - r * 0.25); }
    // Iron hoops, turning as it rolls.
    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI / 2;
      const w = Math.abs(Math.cos(a)) * r * 2;
      g.lineStyle(4, 0x23222c, 1); g.strokeEllipse(cx, y, Math.max(3, w), r * 2);
      g.lineStyle(1.2, OBS.edge, 0.6); g.strokeEllipse(cx, y - 1, Math.max(3, w), r * 2);
    }
    // Rime crusting the top, and a violet seam where it has cracked.
    g.fillStyle(TIDE_PALE, 0.7);
    for (let i = 0; i < 7; i++) { const a = Math.PI * 1.1 + (i / 6) * Math.PI * 0.8; g.fillTriangle(cx + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, cx + Math.cos(a + 0.15) * r, y + Math.sin(a + 0.15) * r, cx + Math.cos(a + 0.07) * (r + 6 + (i % 3) * 3), y + Math.sin(a + 0.07) * (r + 6 + (i % 3) * 3)); }
    seam(g, [{ x: cx - r * 0.5, y: y + r * 0.4 }, { x: cx - r * 0.1, y: y + r * 0.1 }, { x: cx + r * 0.1, y: y + r * 0.5 }], 1, 0.8, arming ? 1 : 0.2, TIDE);
    g.lineStyle(1.4, OBS.edge, 0.8); g.strokeCircle(cx, y, r);
    if (arming) {
      const k = clamp(1 - (armAt - time) / ARM_MS, 0, 1);
      g.lineStyle(3, mixC(TIDE, 0xffffff, k), 0.9); g.strokeCircle(cx, y, r + 6 + k * 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + time / 120; g.fillStyle(FOAM, 0.8); g.fillCircle(cx + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12), 2); }
    }
    if (state === 'slide' && speed() > 200) {
      const sp = speed();
      for (let i = 1; i <= 4; i++) { g.fillStyle(TIDE_LIT, 0.18 / i); g.fillCircle(x - (s.vx / sp) * i * 14, y - (s.vy / sp) * i * 14, r * (1 - i * 0.12)); }
    }
  }
};

export const WEIGHTING_STONE: GimmickDef = {
  id: 'bench-water-weighting-stone',
  rules: 'The weighting stone slides away from whoever strikes it and freezes whoever it runs into. The rime it leaves drags at your feet.',
  make,
};

