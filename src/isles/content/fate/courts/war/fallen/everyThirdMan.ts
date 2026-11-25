import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { conscript, numberGlyph } from '../art';
import {
  BAIZE_LIT, BRASS, BRASS_DARK, BRASS_LIT, COAT, INK, IRON_LIT, IVORY, IVORY_DARK, LAMP, RED, RED_DARK, RED_LIT,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Every Third Man — Drill-Sergeant Obadiah Thrale, who drilled the Sunday draft on the parade
 * ground, and who in the King's telling kept the old punishment for a company that grumbled.
 *
 * Seven conscripts stand at attention about the yard, and the two of you stand among them. At
 * "From the right — number!" Thrale's pace-stick walks across the yard and every man it passes
 * calls the next number, in the order the line reaches them. Every third man — three, six, nine —
 * is ordered one pace forward: held a moment where he stands, and a volley is fired into the
 * ground round him.
 *
 * You can see your number coming. Walk ahead of a conscript, or let one get ahead of you, and you
 * change it — and his. The Sergeant is a body like any other: put him third, or stand him by a
 * marked man. Past half the count runs both ways in turn, and the company falls in afresh
 * between counts. The bot counts its own number ahead and steps past a man to dodge a three.
 */

const ID = fallenId('war', 'third-man');
const RING = 70;
const SWEEP = 170;
const HOLD_MS = 380;
const VOLLEY_MS = 1000;

interface Body { kind: 'player' | 'npc' | 'man'; f?: Fighter; x: number; y: number; hx: number; hy: number; n: number; face: number }
interface Volley { x: number; y: number; at: number; fireAt: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const spots: Pt[] = [{ x: 150, y: 210 }, { x: 260, y: 500 }, { x: 380, y: 300 }, { x: 500, y: 560 }, { x: 610, y: 220 }, { x: 720, y: 430 }, { x: 850, y: 560 }];
  const men: Body[] = spots.map((p, i) => ({ kind: 'man', x: p.x, y: p.y, hx: p.x, hy: p.y, n: 0, face: i % 2 ? -1 : 1 }));
  const pb: Body = { kind: 'player', f: player, x: 0, y: 0, hx: 0, hy: 0, n: 0, face: 1 };
  const nb: Body = { kind: 'npc', f: npc, x: 0, y: 0, hx: 0, hy: 0, n: 0, face: 1 };
  const bodies = [...men, pb, nb];
  const volleys: Volley[] = [];
  let both = false, started = false;
  let sweeping = false, sweepX = 0, dir = 1, called = 0, nextCount = 0, marchFrom = 0;

  const bx = (b: Body) => (b.f ? b.f.x : b.x);
  const by = (b: Body) => (b.f ? b.f.y : b.y);
  const passed = (b: Body) => (dir > 0 ? bx(b) <= sweepX : bx(b) >= sweepX);

  function mark(b: Body, time: number): void {
    volleys.push({ x: bx(b), y: by(b), at: time, fireAt: time + tk.warn(VOLLEY_MS), fired: false });
    if (b.f && alive(b.f)) ctx.root(b.f, HOLD_MS);
    ctx.sfx('drum-hit');
  }

  function fire(v: Volley): void {
    v.fired = true;
    ctx.sfx('musket');
    if (alive(player) && dist(player.x, player.y, v.x, v.y) < RING + 18) tk.hitPlayer(both ? 26 : 22, player.x, player.y);
    if (alive(npc) && dist(npc.x, npc.y, v.x, v.y) < RING + 18) { ctx.hit(npc, 32, npc.x, npc.y); ctx.float(npc.x, npc.y - 56, 'ONE PACE FORWARD', '#ffb070'); }
  }

  return {
    update(time, dt) {
      if (!started) { started = true; nextCount = time + 1800; }
      if (!both && npc.hp < npc.maxHp * 0.5) { both = true; ctx.banner('FROM THE LEFT, TOO', '#ffb070'); ctx.sfx('drum-hit'); }
      // The company falling in at fresh marks between counts.
      if (both && !sweeping) {
        const k = clamp((time - marchFrom) / 1200, 0, 1);
        for (const m of men) { m.x = m.x + (m.hx - m.x) * k; m.y = m.y + (m.hy - m.y) * k; }
      }
      if (!sweeping && time >= nextCount) {
        sweeping = true; called = 0;
        for (const b of bodies) b.n = 0;
        sweepX = dir > 0 ? 20 : W - 20;
        ctx.banner(dir > 0 ? 'FROM THE RIGHT — NUMBER!' : 'FROM THE LEFT — NUMBER!', '#ffe2a8');
        ctx.sfx('countdown-tick');
      }
      if (sweeping) {
        sweepX += dir * SWEEP * Math.min(dt, 0.1);
        const now = bodies.filter((b) => !b.n && (b.kind === 'man' || alive(b.f as Fighter)) && passed(b)).sort((a, b) => dir * (bx(a) - bx(b)));
        for (const b of now) {
          b.n = ++called;
          ctx.sfx(b.n % 3 === 0 ? 'hit-medium' : 'clock-tick');
          if (b.n % 3 === 0) mark(b, time);
        }
        if (sweepX > W - 10 || sweepX < 10) {
          sweeping = false;
          nextCount = time + (both ? 2300 : 3100);
          if (both) {
            dir = -dir; marchFrom = time;
            for (const m of men) { m.hx = 100 + rng() * (W - 200); m.hy = top + 90 + rng() * (H - top - 160); }
          }
        }
      }
      for (const v of volleys) if (!v.fired && time >= v.fireAt) fire(v);
      for (let i = volleys.length - 1; i >= 0; i--) if (time - volleys[i].fireAt > 700) volleys.splice(i, 1);
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      for (const v of volleys) {
        if (v.fired || dist(npc.x, npc.y, v.x, v.y) > RING + 40) continue;
        const a = Math.atan2(npc.y - v.y, npc.x - v.x);
        return { x: tk.clampX(v.x + Math.cos(a) * (RING + 80)), y: tk.clampY(v.y + Math.sin(a) * (RING + 80)) };
      }
      if (!sweeping || nb.n) return null;
      // Count ahead: everyone between the stick and me goes before me.
      const ahead = bodies.filter((b) => b !== nb && !b.n && (b.kind === 'man' || alive(b.f as Fighter)) && dir * (bx(b) - sweepX) >= 0 && dir * (bx(b) - npc.x) < 0);
      const mine = called + ahead.length + 1;
      if (mine % 3 !== 0) return null;
      const beyond = bodies.filter((b) => b !== nb && !b.n && dir * (bx(b) - npc.x) > 0).sort((a, b) => dir * (bx(a) - bx(b)));
      if (beyond.length) return { x: tk.clampX(bx(beyond[0]) + dir * 50), y: npc.y };
      return { x: tk.clampX(sweepX - dir * 30), y: npc.y };
    },

    drawGround(g, time) {
      if (sweeping) drawSweep(g, sweepX, dir, W, top, H, time);
      for (const v of volleys) {
        const k = clamp((time - v.at) / (v.fireAt - v.at), 0, 1);
        g.fillStyle(RED, v.fired ? 0.3 : 0.06 + k * 0.16); g.fillCircle(v.x, v.y, RING);
        g.lineStyle(2, IVORY, 0.4 + k * 0.5); g.strokeCircle(v.x, v.y, RING);
        g.lineStyle(4, RED_LIT, 0.9); g.beginPath(); g.arc(v.x, v.y, RING - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        // The chalked boot-marks of "one pace forward".
        for (const s of [-1, 1]) { g.lineStyle(1.5, IVORY, 0.7); g.strokeEllipse(v.x + s * 6, v.y + 14, 7, 13); }
        if (v.fired) for (let i = 0; i < 9; i++) { const a = i * 2.3, r = (i % 3) * 18 + 10; g.fillStyle(0x1a140e, 0.8); g.fillCircle(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r * 0.7, 3); }
      }
      for (const m of men) shadow(g, m.x, m.y + 2, 26, 7);
    },

    drawAir(g, time) {
      for (const m of men) {
        const marked = m.n > 0 && m.n % 3 === 0;
        conscript(g, m.x, m.y + (marked ? 6 : 0), 0.85, m.face, both && !sweeping ? time / 120 : 0, COAT, marked ? 0.2 : 0, m.n);
      }
      for (const b of bodies) if (b.n) drawPlate(g, bx(b), by(b) - (b.kind === 'man' ? 64 : 84), b.n, b.kind);
      for (const v of volleys) {
        const k = (time - v.fireAt) / 600;
        if (k < 0 || k > 1) continue;
        drawVolley(g, v.x, v.y, top, k);
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 92, y = top + 18;
      g.fillStyle(0x000000, 0.6); g.fillRoundedRect(x0 - 10, y - 14, 204, 28, 6);
      const order = bodies.filter((b) => b.n).sort((a, b) => a.n - b.n);
      for (let i = 0; i < 9; i++) {
        const x = x0 + i * 20, third = (i + 1) % 3 === 0;
        g.fillStyle(third ? RED_DARK : TIMBER_DARK, 1); g.fillRoundedRect(x - 8, y - 10, 16, 20, 3);
        const b = order[i];
        if (b) {
          const c = b.kind === 'player' ? BAIZE_LIT : b.kind === 'npc' ? RED_LIT : IVORY_DARK;
          g.fillStyle(c, 1); g.fillCircle(x, y + 4, 4);
          numberGlyph(g, x, y - 4, 7, i + 1, third ? LAMP : IVORY);
        } else { g.fillStyle(0x000000, 0.4); g.fillCircle(x, y + 4, 3); }
      }
      g.fillStyle(sweeping ? LAMP : 0x666666, sweeping ? 0.6 + Math.sin(time / 90) * 0.4 : 1);
      const ax = x0 + 186;
      if (dir > 0) g.fillTriangle(ax - 5, y - 6, ax - 5, y + 6, ax + 5, y); else g.fillTriangle(ax + 5, y - 6, ax + 5, y + 6, ax - 5, y);
    },
  };
}

/** The count's line: Thrale's brass-shod pace-stick striding along the top, a chalk line ruled down behind it. */
function drawSweep(g: G, x: number, dir: number, W: number, top: number, H: number, time: number): void {
  g.fillStyle(IVORY, 0.05); g.fillRect(dir > 0 ? 0 : x, top, dir > 0 ? x : W - x, H - top);
  for (let y = top + 10; y < H; y += 22) { g.lineStyle(3, IVORY, 0.75); g.lineBetween(x, y, x, y + 12); }
  const open = 0.35 + Math.abs(Math.sin(time / 180)) * 0.35, hy = top + 8, len = 60;
  for (const s of [-1, 1]) {
    const fx = x + Math.sin(open * s) * len, fy = hy + Math.cos(open) * len;
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(x, hy, fx, fy);
    g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(x, hy, fx, fy);
    g.fillStyle(BRASS, 1); g.fillCircle(fx, fy, 3);
  }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, hy, 6); g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, hy, 2.5);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 6, hy, x + 6, hy);
}

/** A called number on a little ivory plate over the man's head; three, six and nine are painted red. */
function drawPlate(g: G, x: number, y: number, n: number, kind: Body['kind']): void {
  const third = n % 3 === 0;
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 12, y - 10, 24, 22, 4);
  g.fillStyle(third ? RED : IVORY, 1); g.fillRoundedRect(x - 11, y - 11, 22, 20, 4);
  g.lineStyle(1.5, third ? RED_DARK : BRASS, 1); g.strokeRoundedRect(x - 11, y - 11, 22, 20, 4);
  numberGlyph(g, x, y - 1, 12, n, third ? IVORY : INK);
  if (kind !== 'man') { g.fillStyle(kind === 'player' ? BAIZE_LIT : RED_LIT, 1); g.fillTriangle(x - 4, y + 9, x + 4, y + 9, x, y + 15); }
  if (third) glow(g, x, y, 18, RED_LIT, 0.08, 2);
}

/** The volley: a rank of muskets along the north edge flashes, and the ball comes down in a spray. */
function drawVolley(g: G, x: number, y: number, top: number, k: number): void {
  for (let i = -1; i <= 1; i++) {
    const mx = x + i * 30, my = top + 6;
    g.lineStyle(3, TIMBER_DARK, 1 - k); g.lineBetween(mx, my - 4, mx + i * 4, my + 18);
    g.lineStyle(1.5, IRON_LIT, 1 - k); g.lineBetween(mx + i * 4, my + 18, mx + i * 5, my + 26);
    g.fillStyle(LAMP, 1 - k); g.fillCircle(mx + i * 5, my + 28, 6 * (1 - k) + 2);
    for (let j = 0; j < 3; j++) { g.fillStyle(0xd8d0c4, 0.5 * (1 - k)); g.fillCircle(mx + i * 5 + j * 6 - 6, my + 30 + j * 4 - k * 10, 8 + k * 10); }
    if (k < 0.35) { g.lineStyle(2, 0xfff0c0, 0.8 * (1 - k / 0.35)); g.lineBetween(mx + i * 5, my + 30, x + i * 14, y); }
  }
}

export const FALLEN_THIRD_MAN: GimmickDef = {
  id: ID,
  rules: 'The count walks the yard; every third man it reaches is held and shot at. Pass a conscript to change your number. Make Thrale the third.',
  make,
};
