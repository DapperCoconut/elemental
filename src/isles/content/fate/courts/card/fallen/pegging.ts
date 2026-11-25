import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, CARD_RED, CARD_RED_DARK, CARD_RED_LIT, GILT, GILT_DARK, GILT_LIT, IVORY, IVORY_DARK,
  IVORY_SHADE, MAHOGANY, MAHOGANY_DARK, MAHOGANY_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Pegged Out — Crib-Keeper Lemoyne Purlow, who in the King's telling kept the cribbage boards on
 * the Rail and marked down, in a little book, every player who ever beat a favourite.
 *
 * A cribbage board the length of the yard is let into the floor: three long rows of holes, a
 * street that runs left, back, and left again. Each fighter has two pegs on it — yours ivory, his
 * crimson. Every blow you land on him is a point, and the hole your back peg will leap to (your
 * front peg plus your points) glows in your colour, moving on with every blow. On the count your
 * back peg leaps over your front one and drives into that hole — crushing whoever is standing on
 * it. His does the same to you. So count your blows: land just enough that your hole is under him,
 * and watch where his crimson hole sits. The first peg home *pegs out* and bursts the other.
 * Halfway down the counts come quicker.
 */

const ID = fallenId('card', 'pegging');
const ROWS = 3;
const PER_ROW = 22;
const HOLES = ROWS * PER_ROW;
const COUNT_MS = 3400;
const COUNT_FAST_MS = 2500;
const LOCK_MS = 950;
const LEAP_MS = 380;
const CRUSH_R = 44;
const POINT_GAP = 220;
const MAX_PTS = 9;
const PEG_OUT = 30;

interface Side { f: Fighter; front: number; back: number; pts: number; lastPt: number; lockTo: number; leapFrom: number; leapAt: number; color: number; lit: number; dark: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const rowY = [0.24, 0.52, 0.8].map((k) => top + (H - top) * k);
  const x0 = 96, x1 = W - 96;
  /** Hole i's spot: rows run left→right, right→left, left→right. Below 0 are the start pegs. */
  const hole = (i: number): { x: number; y: number } => {
    if (i < 0) return { x: x0 - 44, y: rowY[0] + (i === -1 ? -12 : 12) };
    const r = Math.min(ROWS - 1, Math.floor(i / PER_ROW)), c = i - r * PER_ROW;
    const t = c / (PER_ROW - 1);
    return { x: r % 2 === 0 ? x0 + (x1 - x0) * t : x1 - (x1 - x0) * t, y: rowY[r] };
  };
  const fresh = (f: Fighter, color: number, li: number, dk: number): Side => ({ f, front: -1, back: -2, pts: 0, lastPt: -1e9, lockTo: -1, leapFrom: -2, leapAt: -1e9, color, lit: li, dark: dk });
  const you = fresh(player, IVORY, 0xffffff, IVORY_DARK);
  const him = fresh(npc, CARD_RED, CARD_RED_LIT, CARD_RED_DARK);
  const sides = [you, him];
  const other = (s: Side): Side => (s === you ? him : you);
  let gimHit = false;
  let countStart = 0;
  let started = false;
  let fast = false;
  let now = 0;
  let outAt = -1e9;
  let outTo: Fighter = npc;

  const aim = (s: Side): number => Math.min(HOLES - 1, Math.max(0, s.front) + Math.max(1, s.pts) + (s.front < 0 ? -1 : 0));
  const target = (s: Side): number => (s.lockTo >= 0 ? s.lockTo : aim(s));
  const countLen = () => (fast ? COUNT_FAST_MS : COUNT_MS);

  function score(s: Side): void {
    if (now - s.lastPt < POINT_GAP || s.lockTo >= 0) return;
    s.lastPt = now;
    s.pts = Math.min(MAX_PTS, s.pts + 1);
  }

  function hurt(f: Fighter, amount: number): void {
    gimHit = true;
    ctx.hit(f, amount, f.x, f.y);
    gimHit = false;
  }

  function leap(s: Side, time: number): void {
    const to = s.lockTo;
    s.leapFrom = s.back; s.leapAt = time;
    s.back = s.front; s.front = to;
    const p = hole(to), o = other(s);
    if (alive(o.f) && dist(o.f.x, o.f.y, p.x, p.y) < CRUSH_R) {
      hurt(o.f, 12 + s.pts * 2);
      ctx.stun(o.f, 350);
    }
    s.pts = 0; s.lockTo = -1;
    if (to >= HOLES - 1) {
      outAt = time; outTo = o.f;
      ctx.banner(s === you ? 'YOU PEG OUT' : 'HE PEGS OUT', s === you ? '#f5eedb' : '#ea5560');
      ctx.sfx('jackpot');
      if (alive(o.f)) { hurt(o.f, PEG_OUT); ctx.stun(o.f, 700); }
      for (const ss of sides) { ss.front = -1; ss.back = -2; ss.pts = 0; }
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; countStart = time + 600; ctx.banner('EVERY BLOW MOVES YOUR PEG ON — ON THE COUNT IT LEAPS AND CRUSHES WHOEVER IS THERE', '#f5eedb'); }
      if (!fast && npc.hp < npc.maxHp * 0.5) { fast = true; ctx.banner('THE COUNTS COME QUICKER', '#ea5560'); ctx.sfx('status-buff'); }
      const len = countLen();
      if (time >= countStart + len - LOCK_MS && you.lockTo < 0 && him.lockTo < 0 && time < countStart + len) {
        for (const s of sides) s.lockTo = aim(s);
        ctx.sfx('countdown-tick');
      }
      if (time >= countStart + len) {
        if (you.lockTo < 0) for (const s of sides) s.lockTo = aim(s);
        for (const s of sides) leap(s, time);
        ctx.sfx('hammer-forge');
        countStart = time;
      }
    },

    onNpcHurt() { if (!gimHit) score(you); },
    onPlayerHurt() { if (!gimHit) score(him); },

    npcSeek() {
      // Off your glowing hole, onto the row gap away from it.
      const p = hole(target(you));
      const d = dist(npc.x, npc.y, p.x, p.y);
      if (d < CRUSH_R + 50) {
        const r = rowY.reduce((b, y) => (Math.abs(y - p.y) < Math.abs(b - p.y) ? y : b), rowY[0]);
        const dir = npc.y >= r ? 1 : -1;
        const gy = clamp(r + dir * ((rowY[1] - rowY[0]) / 2), top + 50, H - 40);
        return { x: clamp(npc.x + (npc.x >= p.x ? 60 : -60), 50, W - 50), y: gy };
      }
      // Otherwise keep you near his own hole: walk round so you sit between him and it.
      const q = hole(target(him));
      if (dist(player.x, player.y, q.x, q.y) < 160) return { x: clamp(player.x + (player.x - q.x) * 0.6, 50, W - 50), y: clamp(player.y + (player.y - q.y) * 0.6, top + 50, H - 40) };
      return null;
    },

    drawGround(g, time) {
      // The board: a long inlaid strip per row, joined round the ends like a street.
      for (let r = 0; r < ROWS; r++) {
        const y = rowY[r];
        g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x0 - 26, y - 14, x1 - x0 + 52, 34, 12);
        g.fillStyle(MAHOGANY_DARK, 1); g.fillRoundedRect(x0 - 28, y - 18, x1 - x0 + 56, 34, 12);
        g.fillStyle(MAHOGANY, 1); g.fillRoundedRect(x0 - 24, y - 15, x1 - x0 + 48, 28, 10);
        g.lineStyle(1, MAHOGANY_LIT, 0.5); g.lineBetween(x0 - 16, y - 10, x1 + 16, y - 10); g.lineBetween(x0 - 16, y + 8, x1 + 16, y + 8);
        g.lineStyle(1.5, GILT_DARK, 0.9); g.strokeRoundedRect(x0 - 24, y - 15, x1 - x0 + 48, 28, 10);
      }
      // The turns at the ends, and the skunk line two-thirds of the way.
      for (const [r, x] of [[0, x1], [1, x0]] as [number, number][]) {
        const ya = rowY[r], yb = rowY[r + 1], cx = x + (x === x1 ? 20 : -20);
        g.lineStyle(10, MAHOGANY_DARK, 1); g.beginPath(); g.arc(cx, (ya + yb) / 2, (yb - ya) / 2, x === x1 ? -Math.PI / 2 : Math.PI / 2, x === x1 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
        g.lineStyle(2, GILT_DARK, 0.8); g.beginPath(); g.arc(cx, (ya + yb) / 2, (yb - ya) / 2, x === x1 ? -Math.PI / 2 : Math.PI / 2, x === x1 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
      }
      const sk = hole(Math.floor(HOLES * 0.66));
      g.lineStyle(2, CARD_RED_DARK, 0.8); g.lineBetween(sk.x + 18, sk.y - 14, sk.x + 18, sk.y + 12);
      // Every fifth hole has a brass ring, every hole a dark socket.
      for (let i = 0; i < HOLES; i++) {
        const p = hole(i);
        if (i % 5 === 4) { g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, 5.5); g.fillStyle(BRASS, 1); g.fillCircle(p.x, p.y - 0.5, 4.5); }
        g.fillStyle(0x140906, 1); g.fillCircle(p.x, p.y, 3.2);
      }
      // The home hole at the end, gilt.
      const end = hole(HOLES - 1);
      glow(g, end.x, end.y, 22, GILT_LIT, 0.07, 3);
      g.fillStyle(GILT, 1); g.fillCircle(end.x, end.y, 7); g.fillStyle(0x140906, 1); g.fillCircle(end.x, end.y, 3.5);
      // Each side's coming hole and the floor it will crush.
      const len = countLen();
      const left = clamp((countStart + len - time) / LOCK_MS, 0, 1);
      for (const s of sides) {
        const p = hole(target(s));
        const locked = s.lockTo >= 0;
        g.fillStyle(s.color, locked ? 0.16 : 0.07); g.fillCircle(p.x, p.y, CRUSH_R);
        g.lineStyle(2, s === you ? 0xffffff : CARD_RED_LIT, locked ? 0.9 : 0.45); g.strokeCircle(p.x, p.y, CRUSH_R);
        if (locked) { g.lineStyle(3, s === you ? 0xffffff : CARD_RED_LIT, 0.9); g.strokeCircle(p.x, p.y, CRUSH_R * left + 6); }
        // The street between the front peg and the coming hole, dotted in the side's colour.
        for (let i = Math.max(0, s.front) + 1; i < target(s); i++) { const q = hole(i); g.fillStyle(s.color, 0.55); g.fillCircle(q.x, q.y, 2.2); }
      }
      for (const s of sides) for (const i of [s.back, s.front]) if (!(i === s.front && time - s.leapAt < LEAP_MS)) pegShadow(g, hole(i).x, hole(i).y);
      const k = (time - outAt) / 700;
      if (k >= 0 && k < 1 && alive(outTo)) { g.lineStyle(4, GILT_LIT, 1 - k); g.strokeCircle(outTo.x, outTo.y, 20 + k * 90); }
    },

    drawAir(g, time) {
      for (const s of sides) {
        const leaping = time - s.leapAt < LEAP_MS;
        drawPeg(g, hole(s.back).x, hole(s.back).y, 0, s);
        if (leaping) {
          const k = (time - s.leapAt) / LEAP_MS, a = hole(s.leapFrom), b = hole(s.front);
          const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 3, 16 * (1 - k * 0.3), 6);
          drawPeg(g, x, y, Math.sin(k * Math.PI) * 70, s);
          if (k > 0.85) { g.lineStyle(3, s === you ? 0xffffff : CARD_RED_LIT, (1 - k) * 6); g.strokeCircle(b.x, b.y, CRUSH_R * (k - 0.5) * 2); }
        } else drawPeg(g, hole(s.front).x, hole(s.front).y, 0, s);
      }
    },

    drawHud(g) {
      // The count: each side's points as pegs in a little rail, and the race along the board.
      const bx = 18, by = top + 8;
      g.fillStyle(MAHOGANY_DARK, 0.92); g.fillRoundedRect(bx, by, 236, 52, 6);
      g.lineStyle(1.5, GILT_DARK, 1); g.strokeRoundedRect(bx, by, 236, 52, 6);
      sides.forEach((s, r) => {
        const y = by + 15 + r * 22;
        for (let i = 0; i < MAX_PTS; i++) {
          g.fillStyle(i < s.pts ? s.color : 0x140906, 1); g.fillCircle(bx + 14 + i * 11, y, i < s.pts ? 4 : 2.4);
        }
        const k = clamp((s.front + 1) / HOLES, 0, 1);
        g.fillStyle(MAHOGANY, 1); g.fillRect(bx + 118, y - 3, 108, 6);
        g.fillStyle(s.color, 1); g.fillRect(bx + 118, y - 3, 108 * k, 6);
        g.fillStyle(GILT, 1); g.fillRect(bx + 224, y - 5, 3, 10);
      });
    },
  };
}

function pegShadow(g: G, x: number, y: number): void { g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 3, y + 2, 12, 5); }

/** A turned cribbage peg standing in its hole: a tapered shank, a collar and a round head. */
function drawPeg(g: G, x: number, y: number, rise: number, s: Side): void {
  const by = y - rise;
  g.fillStyle(s.dark, 1); g.fillRect(x - 3, by - 22, 6, 22);
  g.fillStyle(s.color, 1); g.fillRect(x - 2.4, by - 22, 4, 21);
  g.fillStyle(s.lit, 0.7); g.fillRect(x - 2, by - 21, 1.4, 18);
  g.fillStyle(s.color === IVORY ? GILT : GILT_DARK, 1); g.fillRect(x - 4, by - 24, 8, 3);
  g.fillStyle(s.dark, 1); g.fillCircle(x, by - 29, 6);
  g.fillStyle(s.color, 1); g.fillCircle(x - 0.5, by - 29.5, 5.2);
  g.fillStyle(s.color === IVORY ? IVORY_SHADE : lit(s.color, 0.2), 1); g.fillCircle(x + 1, by - 28, 2.6);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 2, by - 31, 1.4);
}

export const FALLEN_PEGGING: GimmickDef = {
  id: ID,
  rules: 'Each blow you land moves your peg\'s hole one on. On the count each back peg leaps and crushes whoever is there. First home bursts the other.',
  make,
};
