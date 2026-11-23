import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { OBS } from '../../../../../art/PinnacleArt';
import { TIDE, TIDE_PALE } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf, inArena, otherOf } from './util';

/**
 * DECREE OF THE DRAWN DOOR — Councilor Penhallow Sepia, Seat of the Well (ink).
 *
 * Sepia worded every clause of the Undertow, and the Undertow had no doors but the ones the clerk
 * drew. He draws them here: round black holes inked on the floor, three at most, in a ring — in at
 * one, out at the next. Walk onto one and you drop through and pop up out of the next. A shot that
 * crosses a hole goes in too, and flies out of the next one the same way it was going — at
 * whoever it was fired at. Every few seconds the oldest hole is rubbed out and a new one sketched
 * (in pencil first: you can see where it will be).
 *
 * Sepia is perfected ink — finger guns with no cooldown — so his own hail comes round corners at
 * you. Yours can too: fire into the hole whose next one opens beside him.
 */

const HOLE_R = 36;
const ENTER_R = 26;
const SKETCH_MS = 1300;
const ERASE_MS = 700;

interface Hole { x: number; y: number; n: number; state: 'sketch' | 'open' | 'erase'; at: number }
interface Pop { x: number; y: number; at: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const REDRAW_MS = ctx.hard ? 6500 : 8000;
  const FALL_CD = 1600;
  const SHOT_SPEED = 560;

  const holes: Hole[] = [];
  let serial = 0;
  let nextRedraw = 0;
  const fallCd: Record<Who, number> = { player: 0, npc: 0 };
  const last: Record<Who, { x: number; y: number }> = { player: { x: 0, y: 0 }, npc: { x: 0, y: 0 } };
  const pops: Pop[] = [];
  const shotBudget = new Map<Hole, number>();
  let started = false;

  const open = () => holes.filter((h) => h.state === 'open').sort((a, b) => a.n - b.n);
  /** The hole you come out of: the next open one in drawing order, wrapping. */
  const exitOf = (h: Hole): Hole | null => {
    const o = open();
    if (o.length < 2) return null;
    const i = o.indexOf(h);
    return o[(i + 1) % o.length];
  };

  const sketch = (time: number) => {
    const p = ctx.player, q = ctx.npc;
    let best: { x: number; y: number } | null = null;
    for (let tries = 0; tries < 60 && !best; tries++) {
      const c = inArena(ctx, 110 + rng() * (W - 220), top + 90 + rng() * (H - top - 170), 80);
      if (holes.some((h) => dist(h.x, h.y, c.x, c.y) < 240)) continue;
      if (dist(p.x, p.y, c.x, c.y) < 120 || dist(q.x, q.y, c.x, c.y) < 120) continue;
      best = c;
    }
    if (!best) return;
    holes.push({ x: best.x, y: best.y, n: serial++, state: 'sketch', at: time + SKETCH_MS });
    ctx.sfx('trap-set');
  };

  return {
    update(time) {
      if (!started) {
        started = true;
        for (const w of WHO) { const f = fighterOf(ctx, w); last[w] = { x: f.x, y: f.y }; }
        sketch(time); sketch(time);
        nextRedraw = time + 5200;
        ctx.banner('THE DRAWN DOOR: IN AT ONE HOLE, OUT AT THE NEXT', '#d4f0ff');
      }
      for (let i = holes.length - 1; i >= 0; i--) {
        const h = holes[i];
        if (h.state === 'sketch' && time >= h.at) { h.state = 'open'; ctx.sfx('slime-splat'); }
        if (h.state === 'erase' && time >= h.at) holes.splice(i, 1);
      }
      if (time >= nextRedraw) {
        nextRedraw = time + REDRAW_MS;
        const o = open();
        if (o.length >= 3) { o[0].state = 'erase'; o[0].at = time + ERASE_MS; ctx.sfx('whoosh'); }
        sketch(time);
      }
      // Fighters dropping through.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const hx = f.x - last[w].x, hy = f.y - last[w].y;
        last[w] = { x: f.x, y: f.y };
        if (!alive(f) || time < fallCd[w] || ctx.isAirborne(f)) continue;
        for (const h of open()) {
          if (dist(f.x, f.y, h.x, h.y) > ENTER_R) continue;
          const e = exitOf(h);
          if (!e) break;
          let a = Math.atan2(hy, hx);
          if (Math.hypot(hx, hy) < 0.5) a = Math.atan2((top + H) / 2 - e.y, W / 2 - e.x);
          const out = inArena(ctx, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 44);
          ctx.nudge(f, out.x - f.x, out.y - f.y);
          ctx.airborne(f, 360);
          fallCd[w] = time + FALL_CD;
          last[w] = { x: f.x, y: f.y };
          pops.push({ x: h.x, y: h.y, at: time }, { x: e.x, y: e.y, at: time });
          ctx.sfx('boing');
          ctx.float(e.x, e.y - 46, 'POP!', '#ffffff');
          break;
        }
      }
      // Shots dropping through: blocked here, re-fired from the next hole at the shooter's foe.
      shotBudget.clear();
      for (const h of open()) {
        const e = exitOf(h);
        if (!e) continue;
        for (const s of ctx.shotsNear(h.x, h.y, HOLE_R - 4)) {
          const used = shotBudget.get(h) ?? 0;
          if (used >= 4) { s.block(); continue; }
          shotBudget.set(h, used + 1);
          const owner: Who = s.owner;
          const of = fighterOf(ctx, owner);
          const a = Math.atan2(h.y - of.y, h.x - of.x);
          s.block();
          ctx.tk.spawnBullet({
            x: e.x + Math.cos(a) * (HOLE_R + 6), y: e.y + Math.sin(a) * (HOLE_R + 6), angle: a, speed: SHOT_SPEED,
            damage: clamp(Math.round(s.damage), 3, 18), r: 6, lifeMs: 1700, color: 0xf4f8ff,
            hits: [fighterOf(ctx, otherOf(owner))],
          });
          pops.push({ x: e.x, y: e.y, at: time });
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 500) pops.splice(i, 1);
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const o = open();
      if (o.length < 2) return null;
      const dp = dist(n.x, n.y, p.x, p.y);
      // Far off: take the door that lets out next to you.
      if (dp > 360) {
        for (const h of o) {
          const e = exitOf(h);
          if (e && dist(e.x, e.y, p.x, p.y) < 220 && dist(n.x, n.y, h.x, h.y) < dp * 0.7) return { x: h.x, y: h.y };
        }
      }
      // Hurt and pressed: the door that lets out furthest from you.
      if (n.hp / n.maxHp < 0.35 && dp < 220) {
        let best: Hole | null = null, bd = -1;
        for (const h of o) { const e = exitOf(h); if (!e) continue; const d = dist(e.x, e.y, p.x, p.y); if (d > bd) { bd = d; best = h; } }
        if (best) return { x: best.x, y: best.y };
      }
      return null;
    },
    drawGround(g, time) {
      const o = open();
      // Pencil lines from each hole to its next: the filing order.
      for (const h of o) {
        const e = exitOf(h);
        if (!e) continue;
        const d = dist(h.x, h.y, e.x, e.y);
        const ux = (e.x - h.x) / d, uy = (e.y - h.y) / d;
        for (let s = HOLE_R + 10; s < d - HOLE_R - 10; s += 22) {
          if ((Math.floor(s / 22) + Math.floor(time / 300)) % 3 === 0) continue;
          g.lineStyle(1.5, 0xd8dce4, 0.18); g.lineBetween(h.x + ux * s, h.y + uy * s, h.x + ux * (s + 10), h.y + uy * (s + 10));
        }
      }
      for (const h of holes) drawHole(g, h, time);
      for (const p of pops) {
        const k = (time - p.at) / 500;
        g.lineStyle(3 * (1 - k), 0xffffff, 1 - k); g.strokeEllipse(p.x, p.y, HOLE_R * 2 * (1 + k), HOLE_R * (1 + k));
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(0x0a0a0e, 1 - k); g.fillCircle(p.x + Math.cos(a) * (HOLE_R + k * 30), p.y + Math.sin(a) * (HOLE_R + k * 30) * 0.5, 3); }
      }
    },
    drawAir(g, time) {
      // Cartoon stars round anyone just popped out.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const since = FALL_CD - (fallCd[w] - time);
        if (!alive(f) || since < 0 || since > 700) continue;
        for (let i = 0; i < 4; i++) {
          const a = time / 150 + (i / 4) * Math.PI * 2;
          star(g, f.x + Math.cos(a) * 20, f.y - 30 + Math.sin(a) * 6, 4);
        }
      }
    },
  };

  /** A hole inked on the glass: black, a hard white rim, hatching round it, a tick toward its exit. */
  function drawHole(g: Phaser.GameObjects.Graphics, h: Hole, time: number): void {
    if (h.state === 'sketch') {
      const k = clamp(1 - (h.at - time) / SKETCH_MS, 0, 1);
      g.lineStyle(1.5, 0xd8dce4, 0.7);
      g.beginPath();
      for (let i = 0; i <= 30 * k; i++) { const a = -Math.PI / 2 + (i / 30) * Math.PI * 2; const px = h.x + Math.cos(a) * HOLE_R, py = h.y + Math.sin(a) * HOLE_R * 0.5; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
      g.strokePath();
      // The quill doing the drawing.
      const a = -Math.PI / 2 + k * Math.PI * 2;
      const qx = h.x + Math.cos(a) * HOLE_R, qy = h.y + Math.sin(a) * HOLE_R * 0.5;
      g.lineStyle(3, 0xeef0f4, 1); g.lineBetween(qx, qy, qx + 14, qy - 34);
      g.fillStyle(0xeef0f4, 1); g.fillTriangle(qx + 10, qy - 30, qx + 30, qy - 52, qx + 20, qy - 26);
      g.fillStyle(0x0a0a0e, 1); g.fillCircle(qx, qy, 2);
      g.fillStyle(0x0a0a0e, 0.15 * k); g.fillEllipse(h.x, h.y, HOLE_R * 2, HOLE_R);
      return;
    }
    const k = h.state === 'erase' ? clamp((h.at - time) / ERASE_MS, 0, 1) : 1;
    g.fillStyle(0xf4f6fa, 0.9 * k); g.fillEllipse(h.x, h.y, HOLE_R * 2 + 8, HOLE_R + 6);
    g.fillStyle(0x020204, k); g.fillEllipse(h.x, h.y, HOLE_R * 2, HOLE_R);
    // Depth: inner rings going down into nothing, a blue glint far down.
    for (let i = 1; i <= 3; i++) { g.lineStyle(1, 0x2a2a34, 0.6 * k); g.strokeEllipse(h.x, h.y + i * 2, HOLE_R * 2 * (1 - i * 0.22), HOLE_R * (1 - i * 0.22)); }
    g.fillStyle(TIDE, 0.35 * k); g.fillEllipse(h.x, h.y + 6, 10, 4);
    // Hatching round the rim, the way the old cartoons shade a hole.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r0 = HOLE_R + 6, r1 = HOLE_R + 12 + (i % 2) * 4;
      g.lineStyle(1.4, 0x0a0a0e, 0.8 * k);
      g.lineBetween(h.x + Math.cos(a) * r0, h.y + Math.sin(a) * r0 * 0.5, h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1 * 0.5);
    }
    // Where it lets out: a little inked arrow on the rim pointing at the next hole.
    const e = exitOf(h);
    if (e && h.state === 'open') {
      const a = Math.atan2(e.y - h.y, e.x - h.x);
      const ax = h.x + Math.cos(a) * (HOLE_R + 18), ay = h.y + Math.sin(a) * (HOLE_R * 0.5 + 12);
      g.fillStyle(TIDE_PALE, 0.85);
      g.fillTriangle(ax + Math.cos(a) * 9, ay + Math.sin(a) * 9, ax + Math.cos(a + 2.4) * 7, ay + Math.sin(a + 2.4) * 7, ax + Math.cos(a - 2.4) * 7, ay + Math.sin(a - 2.4) * 7);
    }
    if (h.state === 'erase') {
      // The eraser rubbing it out, crumbs flying.
      const ex = h.x + Math.sin(time / 40) * HOLE_R * 0.6;
      g.fillStyle(0xe8a8b8, 1); g.fillRect(ex - 14, h.y - 30, 28, 16);
      g.fillStyle(OBS.edge, 1); g.fillRect(ex - 14, h.y - 36, 28, 6);
      for (let i = 0; i < 5; i++) { g.fillStyle(0xe8a8b8, 0.7); g.fillCircle(ex + Math.sin(time / 30 + i) * 22, h.y - 10 + (i * 7) % 14, 1.6); }
    }
  }

  function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(x, y - r * 1.6, x - r * 0.5, y, x + r * 0.5, y);
    g.fillTriangle(x, y + r * 1.6, x - r * 0.5, y, x + r * 0.5, y);
    g.fillTriangle(x - r * 1.6, y, x, y - r * 0.5, x, y + r * 0.5);
    g.fillTriangle(x + r * 1.6, y, x, y - r * 0.5, x, y + r * 0.5);
  }
};

export const DRAWN_DOOR: GimmickDef = {
  id: 'bench-water-drawn-door',
  rules: 'Every hole the clerk inks is a door to the next. Fall in, pop out of the next one — and so does every shot, at whoever it was fired at.',
  make,
};
