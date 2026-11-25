import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mulberry, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  ASHLAR, ASHLAR_DARK, FLAG, FLAG_DARK, FLAG_LIT, GROUT, OAK, OAK_DARK, OAK_LIT, SLATE, SLATE_DARK, SLATE_LIT, SNOW,
  SNOW_DEEP, SNOW_LIT, SNOW_SHADE,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { FOE, vellum } from './common';

/**
 * Rolled Clear — Novice-Master Wulfric Dene.
 *
 * Every dawn the Novice-Master's boys sweep the close, and in the star's telling he rolls what they
 * sweep into balls and sends them off the cathedral roof at whoever kneels out of place. Snow slides
 * from the eaves along the north edge (a cornice bulges and a line shows where it will run), forms
 * a ball and rolls straight at whichever fighter stood nearer that spot. On fresh snow the ball
 * gathers and grows; over the swept strips of bare flag it sheds and shrinks. A shot that meets it
 * shaves it down, and a small one crumbles. Whoever it reaches is bowled over, harder the bigger it
 * has grown, and a big one packs them in where they stand.
 *
 * The rule is the ground: meet a ball on the flags and it is a handful; let it cross the snow and
 * it is a boulder. A clever player stands so Dene is the nearer and lets the snow do the rest. Past
 * half the roof sheds two at once, and the boys move a strip whenever the bell lets them.
 */

const ROLL = 172;            // px/s — slower than a walk
const R0 = 12;
const R_MAX = 54;
const GROW = 0.075;          // px of radius per px rolled on snow
const SHED = 0.22;           // px of radius per px rolled on flags
const SHAVE = 7;             // radius off per shot
const WARN = 1100;
const STRIP_W = 86;

interface Ball { x: number; y: number; dx: number; dy: number; r: number; trav: number; dead: boolean; seed: number; shavedAt: number }
interface Cornice { x: number; at: number; dx: number; dy: number; aimAt: Fighter }
interface Strip { x: number; born: number; dying: number }
interface Puff { x: number; y: number; r: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const balls: Ball[] = [];
  const cornices: Cornice[] = [];
  const strips: Strip[] = [{ x: W * 0.32, born: -9999, dying: 0 }, { x: W * 0.7, born: -9999, dying: 0 }];
  const puffs: Puff[] = [];
  let nextShed = 2600;
  let nextStrip = 12000;
  let t0 = -1;
  const half = () => npc.hp < npc.maxHp * 0.5;
  const flakes = Array.from({ length: 140 }, (_, i) => { const r = mulberry(i * 31 + 7); return { x: r() * W, y: top + r() * (H - top), s: 0.6 + r() * 1.4 }; });

  /** How far down a strip the broom has got (0..1), and how much of it is still bare (fading back to snow). */
  const reveal = (s: Strip, time: number) => clamp((time - s.born) / 1600, 0, 1);
  const bare = (s: Strip, time: number) => (s.dying ? 1 - clamp((time - s.dying) / 1500, 0, 1) : 1);
  function swept(x: number, y: number, time: number): boolean {
    for (const s of strips) {
      if (Math.abs(x - s.x) > STRIP_W / 2) continue;
      if (bare(s, time) < 0.5) continue;
      if (y < top + reveal(s, time) * (H - top)) return true;
    }
    return false;
  }

  function shed(time: number, avoidX: number | null): void {
    let x = 0;
    for (let tries = 0; tries < 8; tries++) { x = 90 + rng() * (W - 180); if (avoidX === null || Math.abs(x - avoidX) > 200) break; }
    const y = top + 8;
    const aimAt = [player, npc].filter(alive).sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y))[0] ?? player;
    const a = Math.atan2(aimAt.y - y, aimAt.x - x);
    cornices.push({ x, at: time + WARN, dx: Math.cos(a), dy: Math.sin(a), aimAt });
    ctx.sfx('trap-set');
  }

  function burst(b: Ball, time: number): void {
    b.dead = true;
    puffs.push({ x: b.x, y: b.y, r: b.r, at: time, seed: b.seed });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (t0 < 0) t0 = time;
      const el = time - t0;

      // The roof sheds.
      if (el >= nextShed) {
        shed(time, null);
        if (half()) shed(time, cornices[cornices.length - 1].x);
        nextShed = el + (half() ? 3500 : 4300);
      }
      // The boys move a strip: the oldest fills back in, a new one is swept elsewhere.
      if (el >= nextStrip) {
        const old = strips.filter((s) => !s.dying).sort((a, b) => a.born - b.born)[0];
        if (old) old.dying = time;
        let x = 0;
        for (let tries = 0; tries < 10; tries++) {
          x = 100 + rng() * (W - 200);
          if (strips.every((s) => s.dying || Math.abs(s.x - x) > 180)) break;
        }
        strips.push({ x, born: time, dying: 0 });
        nextStrip = el + (half() ? 9000 : 12000);
      }
      for (let i = strips.length - 1; i >= 0; i--) if (strips[i].dying && time - strips[i].dying > 1600) strips.splice(i, 1);

      // Cornices let go.
      for (let i = cornices.length - 1; i >= 0; i--) {
        const c = cornices[i];
        if (time < c.at) continue;
        cornices.splice(i, 1);
        balls.push({ x: c.x, y: top + 14, dx: c.dx, dy: c.dy, r: R0, trav: 0, dead: false, seed: Math.floor(rng() * 1e6), shavedAt: -9999 });
        ctx.sfx('stone-rise');
      }

      // Balls roll, gather, shed, take shots and bowl people over.
      for (const b of balls) {
        if (b.dead) continue;
        const step = ROLL * dt;
        b.x += b.dx * step; b.y += b.dy * step; b.trav += step;
        b.r = swept(b.x, b.y, time) ? b.r - SHED * step : Math.min(R_MAX, b.r + GROW * step);
        for (const s of ctx.shotsNear(b.x, b.y, b.r + 8)) {
          s.block();
          b.r -= SHAVE; b.shavedAt = time;
          ctx.sfx('ice-shard');
        }
        if (b.r < 8) { burst(b, time); continue; }
        if (b.x < 26 || b.x > W - 26 || b.y > H - 24 || b.y < top) { burst(b, time); ctx.sfx('land'); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, b.x, b.y) > b.r + 20) continue;
          const dmg = Math.round(4 + b.r * 0.32);
          ctx.hit(f, dmg, b.x, b.y);
          ctx.nudge(f, b.dx * (40 + b.r), b.dy * (40 + b.r));
          if (b.r >= 30) ctx.root(f, 600);
          ctx.sfx(b.r >= 30 ? 'stone-slam' : 'hit-medium');
          burst(b, time);
          break;
        }
      }
      for (let i = balls.length - 1; i >= 0; i--) if (balls[i].dead) balls.splice(i, 1);
      for (let i = puffs.length - 1; i >= 0; i--) if (time - puffs[i].at > 700) puffs.splice(i, 1);
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      // A ball (or a ball about to drop) whose line runs through him: step off the line.
      const lines: { x: number; y: number; dx: number; dy: number; r: number }[] = [
        ...balls.map((b) => ({ x: b.x, y: b.y, dx: b.dx, dy: b.dy, r: b.r })),
        ...cornices.map((c) => ({ x: c.x, y: top + 14, dx: c.dx, dy: c.dy, r: 30 })),
      ];
      for (const l of lines) {
        const along = (npc.x - l.x) * l.dx + (npc.y - l.y) * l.dy;
        if (along < -20) continue;
        const px = l.x + l.dx * along, py = l.y + l.dy * along;
        const off = dist(npc.x, npc.y, px, py);
        if (off > l.r + 56) continue;
        const nx = -l.dy, ny = l.dx;
        const side = (npc.x - px) * nx + (npc.y - py) * ny >= 0 ? 1 : -1;
        return { x: clamp(npc.x + nx * side * 130, 50, W - 50), y: clamp(npc.y + ny * side * 130, top + 40, H - 40) };
      }
      // Otherwise he likes the swept flags, where nothing he meets is big.
      if (!swept(npc.x, npc.y, time)) {
        const s = strips.filter((q) => !q.dying && reveal(q, time) > 0.9).sort((a, b) => Math.abs(a.x - npc.x) - Math.abs(b.x - npc.x))[0];
        if (s && Math.abs(s.x - npc.x) < 240) return { x: s.x, y: clamp(npc.y, top + 60, H - 60) };
      }
      return null;
    },

    drawGround(g, time) {
      // Snow blown in through the west doors lies over the whole nave floor.
      g.fillStyle(SNOW_SHADE, 0.9); g.fillRect(0, top, W, H - top);
      g.fillStyle(SNOW, 0.85); g.fillRect(0, top + 4, W, H - top - 4);
      for (const fl of flakes) {
        g.fillStyle(fl.s > 1.3 ? SNOW_LIT : SNOW_SHADE, 0.7); g.fillEllipse(fl.x, fl.y, 6 * fl.s, 2.4 * fl.s);
      }
      // The swept strips: bare flags, grout lines, broom arcs, snow banked at both edges.
      for (const s of strips) {
        const k = reveal(s, time) * bare(s, time);
        if (k <= 0) continue;
        const yEnd = top + reveal(s, time) * (H - top);
        const a = bare(s, time);
        const x0 = s.x - STRIP_W / 2;
        g.fillStyle(FLAG, a); g.fillRect(x0, top, STRIP_W, yEnd - top);
        g.fillStyle(FLAG_LIT, 0.35 * a); g.fillRect(x0, top, STRIP_W / 2, yEnd - top);
        g.lineStyle(1.5, GROUT, 0.8 * a);
        for (let y = top + 22; y < yEnd; y += 44) g.lineBetween(x0, y, x0 + STRIP_W, y);
        for (let y = top, row = 0; y < yEnd; y += 44, row++) {
          const jx = x0 + (row % 2 ? STRIP_W * 0.35 : STRIP_W * 0.7);
          g.lineBetween(jx, y, jx, Math.min(yEnd, y + 22));
        }
        // Broom arcs left in the last dusting.
        g.lineStyle(1, SNOW_SHADE, 0.55 * a);
        for (let y = top + 14; y < yEnd - 8; y += 18) {
          g.beginPath(); g.arc(s.x + ((y * 13) % 17) - 8, y + 10, 26, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
        }
        // The banks the brooms pushed aside.
        for (const side of [-1, 1]) {
          for (let y = top; y < yEnd; y += 12) {
            const bx = s.x + side * (STRIP_W / 2 + 4);
            g.fillStyle(SNOW_DEEP, 0.5 * a); g.fillEllipse(bx + side * 2, y + 3, 14, 13);
            g.fillStyle(SNOW_LIT, 0.95 * a); g.fillEllipse(bx, y, 13, 11);
          }
        }
        // The broom still at work.
        if (reveal(s, time) < 1) {
          const by = yEnd;
          g.fillStyle(OAK_DARK, 1); g.fillRect(s.x - 2, by - 54, 4, 50);
          g.fillStyle(0xc8a860, 1); g.fillTriangle(s.x - 20, by + 6, s.x + 20, by + 6, s.x, by - 8);
          g.lineStyle(1, 0x8a6a30, 0.9);
          for (let k2 = -16; k2 <= 16; k2 += 4) g.lineBetween(s.x + k2 * 0.4, by - 6, s.x + k2, by + 6);
          g.fillStyle(SNOW_LIT, 0.8);
          for (let q = 0; q < 6; q++) g.fillCircle(s.x + (q - 2.5) * 9, by + 10 + ((time / 40 + q * 7) % 8), 2);
        }
      }
      // Each ball's furrow behind it and its shadow.
      for (const b of balls) {
        g.lineStyle(b.r * 1.1, SNOW_SHADE, 0.45);
        const back = Math.min(b.trav, 90);
        g.lineBetween(b.x - b.dx * back, b.y - b.dy * back, b.x, b.y);
        shadow(g, b.x + 6, b.y + b.r * 0.8, b.r * 2.1, b.r * 0.6, 0.28);
      }
      // A cornice's line: where the slide will run.
      for (const c of cornices) {
        const k = 1 - clamp((c.at - time) / WARN, 0, 1);
        const col = c.aimAt === npc ? FOE : 0x7fb4ff;
        const y = top + 14;
        for (let d = 20; d < 900; d += 26) {
          const x = c.x + c.dx * d, yy = y + c.dy * d;
          if (x < 0 || x > W || yy > H) break;
          g.fillStyle(col, 0.18 + 0.4 * k); g.fillCircle(x, yy, 3);
        }
      }
    },

    drawAir(g, time) {
      // The eaves along the north edge: slates, a gutter, icicles, and every cornice bulging to go.
      g.fillStyle(SLATE_DARK, 1); g.fillRect(0, top - 2, W, 12);
      for (let x = 0; x < W; x += 22) { g.fillStyle((x / 22) % 2 ? SLATE : SLATE_LIT, 1); g.fillRect(x, top - 2, 21, 8); }
      g.fillStyle(ASHLAR_DARK, 1); g.fillRect(0, top + 8, W, 3);
      g.fillStyle(SNOW, 1); for (let x = 0; x < W; x += 14) g.fillEllipse(x + 7, top - 3, 18, 7);
      for (let x = 9; x < W; x += 31) {
        const len = 6 + ((x * 7) % 11);
        g.fillStyle(0xdff2ff, 0.85); g.fillTriangle(x - 2, top + 10, x + 2, top + 10, x, top + 10 + len);
      }
      for (const c of cornices) {
        const k = 1 - clamp((c.at - time) / WARN, 0, 1);
        const shake = Math.sin(time / 30) * 2 * k;
        g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(c.x + shake, top + 4 + k * 8, 40 + k * 18, 16 + k * 14);
        g.fillStyle(SNOW_LIT, 1); g.fillEllipse(c.x + shake - 4, top + k * 8, 34 + k * 12, 10 + k * 8);
        g.fillStyle(ASHLAR, 0.8);
        for (let q = 0; q < 4; q++) g.fillCircle(c.x - 14 + q * 9 + shake, top + 16 + k * 10 + ((time / 50 + q * 5) % 10), 1.6);
      }
      // The balls themselves: packed snow, turning as they roll, grit and twigs caught in them.
      for (const b of balls) {
        const spin = b.trav / Math.max(8, b.r);
        const shaved = time - b.shavedAt < 220;
        g.fillStyle(SNOW_DEEP, 1); g.fillCircle(b.x, b.y, b.r);
        g.fillStyle(SNOW_SHADE, 1); g.fillCircle(b.x - b.r * 0.08, b.y - b.r * 0.08, b.r * 0.92);
        g.fillStyle(SNOW, 1); g.fillCircle(b.x - b.r * 0.2, b.y - b.r * 0.22, b.r * 0.72);
        const rr = mulberry(b.seed);
        for (let q = 0; q < 7; q++) {
          const a = rr() * Math.PI * 2 + spin, d = rr() * 0.8 * b.r;
          const vis = Math.cos(a - spin * 0.5);
          if (vis < 0) continue;
          const px = b.x + Math.cos(a) * d, py = b.y + Math.sin(a) * d * 0.9;
          if (q < 3) { g.lineStyle(1.2, OAK, 0.8 * vis); g.lineBetween(px - 3, py - 1, px + 3, py + 1.5); }
          else { g.fillStyle(q % 2 ? FLAG_DARK : OAK_LIT, 0.7 * vis); g.fillCircle(px, py, 1.4); }
        }
        // Seams where it was packed layer on layer.
        g.lineStyle(1, SNOW_DEEP, 0.55);
        for (let q = 1; q <= 2; q++) { g.beginPath(); g.arc(b.x, b.y, b.r * (0.45 + q * 0.18), spin + q, spin + q + 1.6); g.strokePath(); }
        g.fillStyle(SNOW_LIT, 0.95); g.fillEllipse(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.45, b.r * 0.28);
        if (shaved) {
          g.fillStyle(SNOW_LIT, 0.9);
          for (let q = 0; q < 6; q++) { const a = q * 1.05 + time / 90; g.fillCircle(b.x + Math.cos(a) * (b.r + 6), b.y + Math.sin(a) * (b.r + 6), 2.2); }
        }
      }
      // Bursts: a ring of clods flung out and settling.
      for (const p of puffs) {
        const k = (time - p.at) / 700;
        const rr = mulberry(p.seed + 3);
        for (let q = 0; q < 12; q++) {
          const a = rr() * Math.PI * 2, d = (p.r * 0.5 + 30) * Math.min(1, k * 2.2) * (0.5 + rr() * 0.7);
          g.fillStyle(q % 3 ? SNOW : SNOW_LIT, 1 - k); g.fillCircle(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.7 - 10 * Math.sin(k * Math.PI), 2 + rr() * p.r * 0.12);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      vellum(g, x, y, 168, 28);
      // The next slide: a cornice filling, and how many go at once.
      const el = t0 < 0 ? 0 : time - t0;
      const period = half() ? 3500 : 4300;
      const k = clamp(1 - (nextShed - el) / period, 0, 1);
      g.fillStyle(SLATE, 1); g.fillRect(x - 70, y + 9, 70, 10);
      g.fillStyle(SNOW, 1); g.fillRect(x - 70, y + 9, 70 * k, 10);
      g.lineStyle(1, SLATE_DARK, 1); g.strokeRect(x - 70, y + 9, 70, 10);
      for (let i = 0; i < (half() ? 2 : 1); i++) {
        const bx = x + 18 + i * 22;
        g.fillStyle(SNOW_SHADE, 1); g.fillCircle(bx, y + 14, 8);
        g.fillStyle(SNOW_LIT, 1); g.fillCircle(bx - 2, y + 12, 4);
      }
      // Balls rolling now: a pip each, sized by how big it has grown.
      for (let i = 0; i < Math.min(4, balls.length); i++) {
        const r = 1.5 + (balls[i].r / R_MAX) * 3.5;
        g.fillStyle(dim(SNOW, 0.3), 1); g.fillCircle(x + 62 - i * 8, y + 14, r + 0.8);
        g.fillStyle(balls[i].r >= 30 ? lit(FOE, 0.3) : SNOW_LIT, 1); g.fillCircle(x + 62 - i * 8, y + 14, r);
      }
    },
  };
}

export const FALLEN_ROLLED_CLEAR: GimmickDef = {
  id: fallenId('cathedral', 'rolled-clear'),
  rules: 'Snowballs slide off the roof at whoever is nearer. On snow they grow, on swept flags they shrink, and shots shave them. Big ones pack you in.',
  make,
};
