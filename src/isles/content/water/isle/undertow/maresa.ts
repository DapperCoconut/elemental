import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { CORAL, FOAM, GOLD, KELP, PEARL, PEARL_SHEEN, maresaSigil, nacre, sleeperInBubble } from './art';

/**
 * Queen Maresa Undertow, Sovereign of the Drowned Reach — the Water Isle's monarch and finale.
 *
 * She owns the tide. The fight is the sea rising round you in four movements, then (on hard)
 * going horribly still:
 *
 *   I   The Dry Tithe  — enthroned on her clam. The tide floods the hall on her clock; only the
 *                        tithe-stones that were paid for stand dry. She sends the collector's
 *                        shells skimming out and back, and leaves houses under around you —
 *                        each one sinks and floods outward in a square, its door the way out.
 *   II  The Undertow   — she rises off the throne and the whole room drains toward her: a pull,
 *                        and rings of current collapsing in on her with one shared gap. The
 *                        drowned ballast rises out of the floor in bubbles. She throws her anchor
 *                        and reels it home along its chain.
 *   III High Water     — the hall fills to the brim. Only the tithe-barges float; the rest of the
 *                        floor is deep, slow and cold. Rogue waves break across the room with one
 *                        trough to duck through, and her pearl strand breaks and bounces.
 *   IV  The Maelstrom  — she becomes the whirlpool. The room turns round its eye; spiral arms of
 *                        foam sweep it, each with one hole in it; waterspouts hunt you; she throws
 *                        the drowned of her chorus at you one by one.
 *   V   Dead Calm (hard) — no wind, no tide, no sound. You are becalmed — slowed everywhere but in
 *                        the cat's-paws where a breath of wind still touches the water. The glass
 *                        sea cracks; a sounding-line counts the fathoms down onto you.
 *
 * Every signature is bespoke and none of them look like the Brand-King's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const SEA_MAIN = 0x1f7a8c;
const SEA_LIT = 0x7ae8e0;
const SEA_DARK = 0x0a2a3a;
const WATER = 0x2a7ab8;
const DEEPWATER = 0x0e3a66;
const WHITE = 0xf4ffff;
const ANCHOR_IRON = 0x2a3238;
const RAFT_WOOD = 0x6a4a2a;

const FT = 96;
/** The anchor post an `anchor` phase stands on — the clam throne is painted round it. */
const THRONE = { x: 480, y: 218 };
/** Centre of the maelstrom. */
const EYE = { x: 480, y: 372 };
/** The four tithe-stones set in the hall floor. Three are paid for each tide; one is left under. */
const PLINTHS = [{ x: 170, y: 330 }, { x: 790, y: 330 }, { x: 300, y: 520 }, { x: 660, y: 520 }];
const PLAYER_R = 20;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);
const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
/** Move the player bodily (the sea does it), clamped to the field like the toolkit's suction. */
const carry = (tk: BossToolkit, dx: number, dy: number): void => {
  const p = tk.player;
  if (!p.active || p.hp <= 0) return;
  p.x = clampN(p.x + dx, 40, tk.W - 40);
  p.y = clampN(p.y + dy, 40, tk.H - 40);
};

/** A drawn wave crest — a scalloped line of foam. */
function crest(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number, t: number, alpha: number, amp = 4): void {
  g.lineStyle(3, WHITE, alpha);
  g.beginPath();
  for (let x = x0; x <= x1; x += 12) {
    const yy = y + Math.sin(x * 0.06 + t / 260) * amp;
    if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy);
  }
  g.strokePath();
}

// ── I. The Dry Tithe ─────────────────────────────────────────────────
// The sea comes in from the bottom of the hall and climbs to just short of the throne. Three
// of the four tithe-stones rise — they were paid for — and stand dry; the fourth was not, and
// sinks. Out in the water you are slowed and the cold bites; on a paid stone or up by the
// throne you are dry. It holds, then drains. Recast while flooded, the tide holds longer.

const dryTithe = (tk: BossToolkit): SignatureMove => {
  const FLOOD_Y = FT + 160;
  const RISE = 125;
  const FALL = 230;
  const HOLD = 2700;
  const STONE_R = 44;
  let state: 'off' | 'warn' | 'rise' | 'hold' | 'fall' = 'off';
  let line = 640;
  let at = 0;
  let born = 0;
  let holdUntil = 0;
  let lastTick = 0;
  let under = 0;
  const paid = (i: number) => i !== under;
  const dry = (x: number, y: number) => y < line + 4 || PLINTHS.some((s, i) => paid(i) && dist(x, y, s.x, s.y) < STONE_R);
  return {
    durationMs: 2300,
    windupMs: 1000,
    gesture: 'raise',
    tell: 'THE TIDE COMES IN',
    cast(time) {
      if (state === 'off' || state === 'fall') {
        under = Math.floor(Math.random() * PLINTHS.length);
        born = time;
        at = time + tk.warn(900);
        if (state === 'off') line = tk.H;
        state = 'warn';
        tk.sfx('rain');
        float(tk, PLINTHS[under].x, PLINTHS[under].y - 46, 'LEFT UNDER', '#9ac8ff');
      } else {
        holdUntil = Math.max(holdUntil, time + HOLD);
        float(tk, tk.W / 2, FLOOD_Y - 20, 'THE TIDE HOLDS', '#9ae8ff');
        tk.sfx('splash');
      }
    },
    update(time, dt) {
      if (state === 'off') return;
      if (state === 'warn' && time >= at) { state = 'rise'; tk.sfx('water-jet'); }
      if (state === 'rise') {
        line -= RISE * dt;
        if (line <= FLOOD_Y) { line = FLOOD_Y; state = 'hold'; holdUntil = time + HOLD; }
      } else if (state === 'hold') {
        if (time >= holdUntil) { state = 'fall'; tk.sfx('splash'); }
      } else if (state === 'fall') {
        line += FALL * dt;
        if (line >= tk.H + 10) { state = 'off'; line = tk.H; }
      }
      const p = tk.player;
      if (state === 'warn' || !p.active || dry(p.x, p.y)) return;
      tk.slowPlayer(0.65, 220);
      if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(5, p.x, p.y); }
    },
    drawGround(g, time) {
      if (state === 'off') return;
      const warnK = state === 'warn' ? clampN((time - born) / Math.max(1, at - born), 0, 1) : 1;
      // The water.
      if (state !== 'warn') {
        g.fillStyle(DEEPWATER, 0.42); g.fillRect(0, line, tk.W, tk.H - line);
        for (let i = 0; i < 16; i++) {
          const x = (i * 71 + time * 0.03) % tk.W;
          const y = line + 30 + ((i * 47) % Math.max(30, tk.H - line - 40));
          g.lineStyle(1.5, FOAM, 0.18);
          g.beginPath(); g.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
        }
        crest(g, 0, tk.W, line, time, 0.8);
        g.fillStyle(WHITE, 0.12); g.fillRect(0, line - 2, tk.W, 8);
      } else {
        // The warning: the sea gathering at the foot of the hall, chevrons pointing up.
        g.fillStyle(DEEPWATER, 0.2 + warnK * 0.2); g.fillRect(0, tk.H - 26 * warnK, tk.W, 26 * warnK);
        for (let i = 0; i < 9; i++) {
          const x = 60 + i * 105;
          g.lineStyle(3, FOAM, 0.2 + warnK * 0.5);
          g.lineBetween(x - 12, tk.H - 40, x, tk.H - 54); g.lineBetween(x, tk.H - 54, x + 12, tk.H - 40);
        }
        g.lineStyle(2, FOAM, 0.15 + warnK * 0.3); g.lineBetween(0, FLOOD_Y, tk.W, FLOOD_Y);
      }
      // The tithe-stones.
      PLINTHS.forEach((s, i) => {
        if (paid(i)) {
          const rise = state === 'warn' ? warnK : 1;
          g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y + 10, STONE_R * 2.2, 18);
          g.fillStyle(0x3a4a4e, 1); g.fillEllipse(s.x, s.y + 4, STONE_R * 2, 26);
          g.fillStyle(0x5a6a6a, 1); g.fillRect(s.x - STONE_R, s.y - 10 * rise, STONE_R * 2, 14 * rise);
          g.fillStyle(0x7a8a86, 1); g.fillEllipse(s.x, s.y - 10 * rise, STONE_R * 2, 26);
          g.fillStyle(GOLD, 0.9); g.fillCircle(s.x, s.y - 10 * rise, 9);
          maresaSigil(g, s.x, s.y - 10 * rise, 6, 0x6a4a12, 0.9);
          g.lineStyle(2, GOLD, 0.35 + Math.sin(time / 240 + i) * 0.15); g.strokeEllipse(s.x, s.y - 10 * rise, STONE_R * 2 + 6, 30);
        } else {
          // The one left under: cracked, sinking, a roof-peak going down with it.
          const sink = state === 'warn' ? warnK : 1;
          g.fillStyle(0x1a2226, 1); g.fillEllipse(s.x, s.y + 6 * sink, STONE_R * 1.8, 22);
          g.lineStyle(2, 0x0a0e10, 1); g.lineBetween(s.x - 20, s.y, s.x + 18, s.y + 8); g.lineBetween(s.x - 4, s.y - 8, s.x + 6, s.y + 10);
          g.fillStyle(0x5a2e22, 1 - sink * 0.6); g.fillTriangle(s.x - 18, s.y - 4 + sink * 10, s.x + 18, s.y - 4 + sink * 10, s.x, s.y - 26 + sink * 18);
          g.lineStyle(3, 0x9ac8ff, 0.5); g.lineBetween(s.x - 16, s.y - 16, s.x + 16, s.y + 16); g.lineBetween(s.x + 16, s.y - 16, s.x - 16, s.y + 16);
        }
      });
    },
    onPhaseEnd() { state = 'off'; line = tk.H; },
  };
};

// ── I. The Collector's Shells ────────────────────────────────────────
// She flicks five scallop shells off the arm of the throne. Each skims out on a curling petal of
// a path and comes back to her hand; they cross each other on the way. The petals are drawn on
// the floor before they fly — find the floor no petal covers.

const collectorShells = (tk: BossToolkit): SignatureMove => {
  const D = 330;
  const LIFE = 2300;
  const BEND = 1.7;
  const R = 13;
  interface Shell { a: number; c: number; ox: number; oy: number; born: number; launchAt: number; hitOut: boolean; hitBack: boolean }
  let shells: Shell[] = [];
  const pos = (s: Shell, time: number): { x: number; y: number; k: number } => {
    const k = clampN((time - s.launchAt) / LIFE, 0, 1);
    const ox = s.ox + (tk.bossX - s.ox) * k, oy = s.oy + (tk.bossY - s.oy) * k;
    const d = D * Math.sin(Math.PI * k);
    const ang = s.a + s.c * k * BEND;
    return { x: ox + Math.cos(ang) * d, y: oy + Math.sin(ang) * d, k };
  };
  return {
    durationMs: 2600,
    windupMs: 850,
    gesture: 'sweep',
    tell: 'THE COLLECTOR\'S SHELLS',
    cast(time) {
      tk.sfx('whoosh');
      const aim = tk.angleToPlayer();
      const n = tk.hard ? 6 : 5;
      const launch = time + tk.warn(650);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5;
        const c = i % 2 === 0 ? 1 : -1;
        shells.push({ a: aim + t * 2.0 - c * BEND * 0.5, c, ox: tk.bossX, oy: tk.bossY, born: time, launchAt: launch + i * 90, hitOut: false, hitBack: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const s of shells) {
        if (time < s.launchAt) continue;
        const q = pos(s, time);
        if (!p.active || dist(p.x, p.y, q.x, q.y) > R + PLAYER_R) continue;
        if (q.k < 0.5 && !s.hitOut) { s.hitOut = true; tk.hitPlayer(11, p.x, p.y); tk.sfx('slash'); }
        else if (q.k >= 0.5 && !s.hitBack) { s.hitBack = true; tk.hitPlayer(11, p.x, p.y); tk.sfx('slash'); }
      }
      shells = shells.filter((s) => time < s.launchAt + LIFE);
    },
    drawGround(g, time) {
      for (const s of shells) {
        if (time >= s.launchAt + 200) continue;
        const k = clampN((time - s.born) / Math.max(1, s.launchAt - s.born), 0, 1);
        // The petal of the path, dotted.
        for (let j = 1; j < 22; j++) {
          const kk = j / 22;
          const d = D * Math.sin(Math.PI * kk);
          const ang = s.a + s.c * kk * BEND;
          g.fillStyle(PEARL_SHEEN, 0.15 + k * 0.4);
          g.fillCircle(s.ox + Math.cos(ang) * d, s.oy + Math.sin(ang) * d, 2.4);
        }
      }
    },
    drawAir(g, time) {
      for (const s of shells) {
        if (time < s.launchAt) continue;
        const q = pos(s, time);
        const spin = time / 60 + s.a * 10;
        // A scallop: a fan of ribs, pink-white, spinning.
        g.fillStyle(0x000000, 0.25); g.fillEllipse(q.x + 3, q.y + 10, 22, 7);
        for (let r = 0; r < 7; r++) {
          const a0 = spin + (r / 7) * Math.PI * 1.3, a1 = spin + ((r + 1) / 7) * Math.PI * 1.3;
          g.fillStyle(r % 2 ? 0xf8d8d0 : 0xe8a8a0, 1);
          g.slice(q.x, q.y, R + 2, a0, a1, false); g.fillPath();
        }
        g.fillStyle(0xb87a70, 1); g.fillCircle(q.x, q.y, 3);
        for (let tr = 1; tr < 4; tr++) {
          const qq = pos(s, time - tr * 30);
          g.fillStyle(FOAM, 0.25 / tr); g.fillCircle(qq.x, qq.y, 6);
        }
      }
    },
    onPhaseEnd() { shells = []; },
  };
};

// ── I. Left Under ────────────────────────────────────────────────────
// Three little houses rise out of the floor around you — the homes that could not pay. Each
// sinks in turn and the sea floods out of it in a widening square. The square is open on the
// side the front door faces: run out through the door.

const leftUnder = (tk: BossToolkit): SignatureMove => {
  const SPEED = 290;
  const BAND = 15;
  const MAX = 420;
  interface House { x: number; y: number; born: number; sinkAt: number; door: 0 | 1 | 2 | 3; sunk: boolean; hit: boolean }
  let houses: House[] = [];
  const sideOf = (dx: number, dy: number): 0 | 1 | 2 | 3 => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
  const place = (time: number, a: number) => {
    const p = tk.player;
    const r = 150 + Math.random() * 50;
    const x = tk.clampX(p.x + Math.cos(a) * r, 80), y = tk.clampY(p.y + Math.sin(a) * r, 80);
    houses.push({ x, y, born: time, sinkAt: time + tk.warn(1300), door: sideOf(tk.bossX - x, tk.bossY - y), sunk: false, hit: false });
    tk.sfx('stone-rise');
  };
  return {
    durationMs: 2900,
    windupMs: 900,
    gesture: 'point',
    tell: 'LEFT UNDER',
    cast(time) {
      const a0 = Math.random() * Math.PI * 2;
      place(time, a0);
      tk.schedule(520, () => place(tk.now, a0 + (Math.PI * 2) / 3));
      tk.schedule(1040, () => place(tk.now, a0 + (Math.PI * 4) / 3));
    },
    update(time) {
      const p = tk.player;
      for (const h of houses) {
        if (!h.sunk && time >= h.sinkAt) {
          h.sunk = true;
          tk.explode(h.x, h.y, 40, 14, WATER);
          tk.sfx('splash');
        }
        if (!h.sunk || h.hit || !p.active) continue;
        const s = ((time - h.sinkAt) / 1000) * SPEED;
        if (s > MAX) continue;
        const dx = p.x - h.x, dy = p.y - h.y;
        const cheb = Math.max(Math.abs(dx), Math.abs(dy));
        if (Math.abs(cheb - s) < BAND + 8 && sideOf(dx, dy) !== h.door) {
          h.hit = true;
          tk.hitPlayer(13, p.x, p.y);
        }
      }
      houses = houses.filter((h) => !h.sunk || time < h.sinkAt + (MAX / SPEED) * 1000 + 100);
    },
    drawGround(g, time) {
      for (const h of houses) {
        if (!h.sunk) {
          // Where the flood will go: a square outline with its open side lit.
          const k = clampN((time - h.born) / Math.max(1, h.sinkAt - h.born), 0, 1);
          const s = 70 + k * 30;
          g.lineStyle(2, WATER, 0.2 + k * 0.4);
          // Sides: 0 right (x=+s), 1 bottom, 2 left, 3 top.
          const sides: [number, number, number, number][] = [
            [s, -s, s, s], [-s, s, s, s], [-s, -s, -s, s], [-s, -s, s, -s],
          ];
          sides.forEach(([x1, y1, x2, y2], i) => {
            if (i === h.door) return;
            g.lineBetween(h.x + x1, h.y + y1, h.x + x2, h.y + y2);
          });
          const [dx1, dy1, dx2, dy2] = sides[h.door];
          g.lineStyle(4, WHITE, 0.3 + k * 0.5);
          g.lineBetween(h.x + dx1 * 0.3, h.y + dy1 * 0.3, h.x + dx2 * 0.3, h.y + dy2 * 0.3);
          continue;
        }
        const s = ((time - h.sinkAt) / 1000) * SPEED;
        if (s > MAX) continue;
        const a = 1 - s / MAX;
        const sides: [number, number, number, number][] = [
          [s, -s, s, s], [-s, s, s, s], [-s, -s, -s, s], [-s, -s, s, -s],
        ];
        sides.forEach(([x1, y1, x2, y2], i) => {
          if (i === h.door) return;
          g.lineStyle(BAND * 2, WATER, 0.45 * a); g.lineBetween(h.x + x1, h.y + y1, h.x + x2, h.y + y2);
          g.lineStyle(3, WHITE, 0.75 * a); g.lineBetween(h.x + x1, h.y + y1, h.x + x2, h.y + y2);
        });
      }
    },
    drawAir(g, time) {
      for (const h of houses) {
        if (h.sunk) {
          const k = (time - h.sinkAt) / 500;
          if (k < 1) { g.fillStyle(FOAM, 0.6 * (1 - k)); g.fillCircle(h.x, h.y - 10, 20 + k * 30); }
          continue;
        }
        const k = clampN((time - h.born) / Math.max(1, h.sinkAt - h.born), 0, 1);
        const rise = Math.min(1, (time - h.born) / 260);
        const sink = k > 0.75 ? (k - 0.75) * 4 : 0;
        const y = h.y + sink * 20;
        const hgt = 30 * rise * (1 - sink * 0.6);
        // A stilt-house: tide-stained walls, a slate roof, the door on the open side.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(h.x, h.y + 6, 56, 14);
        g.fillStyle(0x5a5a4e, 1); g.fillRect(h.x - 20, y - hgt, 40, hgt);
        g.fillStyle(0x3a4a52, 1); g.fillTriangle(h.x - 26, y - hgt, h.x + 26, y - hgt, h.x, y - hgt - 22 * rise);
        g.fillStyle(0x6a8a8a, 0.6); g.fillRect(h.x - 20, y - hgt * 0.4, 40, 3);
        const dx = [1, 0, -1, 0][h.door], dy = [0, 1, 0, -1][h.door];
        g.fillStyle(0xffe8a8, 0.85); g.fillRect(h.x - 5 + dx * 14, y - 16 + dy * 4, 10, 14);
        // The door's way out, as an arrow on the floor.
        g.fillStyle(WHITE, 0.5 + Math.sin(time / 100) * 0.2);
        const ax = h.x + dx * 44, ay = h.y + dy * 44;
        g.fillTriangle(ax + dx * 12, ay + dy * 12, ax - dy * 9, ay + dx * 9, ax + dy * 9, ay - dx * 9);
        // Water at the sills as it goes down.
        if (sink > 0) { g.fillStyle(WATER, 0.5); g.fillEllipse(h.x, h.y - 2, 60, 16); }
      }
    },
    onPhaseEnd() { houses = []; },
  };
};

// ── II. The Undertow ─────────────────────────────────────────────────
// Everything drains toward her. A steady pull drags you in while rings of current collapse on
// her from the walls — they share one gap, drawn as a wedge before the first arrives, drifting
// a little each ring. Stand in the wedge and let them pass; do not let the pull put you in her.

const undertow = (tk: BossToolkit): SignatureMove => {
  const RINGS = 4;
  const GAP = 0.55;
  const START_R = 560;
  const SPEED = 250;
  const PULL_MS = 3900;
  let active = false;
  let from = 0, firstAt = 0, until = 0, cx = 0, cy = 0, g0 = 0, drift = 0, lastMaw = 0;
  return {
    durationMs: 3600,
    windupMs: 950,
    hold: 'reach',
    tell: 'THE UNDERTOW',
    cast(time) {
      active = true;
      cx = tk.bossX; cy = tk.bossY;
      from = time;
      firstAt = time + tk.warn(650);
      until = time + PULL_MS;
      g0 = tk.angleToPlayer(cx, cy) + (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.5);
      drift = (Math.random() < 0.5 ? 1 : -1) * 0.16;
      tk.pull(cx, cy, tk.hard ? 104 : 92, PULL_MS);
      tk.sfx('tornado');
      // Each ring is spawned on its own beat (a delayed ring would be born outside the field's
      // reach and culled), all closing on the point she stood when she called the undertow.
      for (let i = 0; i < RINGS; i++) {
        tk.schedule(firstAt - time + i * 720, () => tk.spawnRing({
          cx, cy, delayMs: 0, speed: -SPEED, startRadius: START_R,
          gapCentre: g0 + drift * i, gapHalf: GAP, band: 16, damage: 12,
        }));
      }
    },
    update(time) {
      if (!active) return;
      if (time > until + 2400) { active = false; return; }
      const p = tk.player;
      if (time < until && p.active && dist(p.x, p.y, tk.bossX, tk.bossY) < 78 && time - lastMaw > 420) {
        lastMaw = time;
        tk.hitPlayer(7, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      // Streaks of water flowing in on her, curling as they come.
      const on = time < until;
      for (let i = 0; i < 30; i++) {
        const ph = ((time / 1400) + i / 30) % 1;
        const r = 460 * (1 - ph) + 40;
        const a = (i / 30) * Math.PI * 2 + ph * 1.2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const x2 = cx + Math.cos(a - 0.1) * (r - 26), y2 = cy + Math.sin(a - 0.1) * (r - 26);
        g.lineStyle(2, FOAM, (on ? 0.35 : 0.12) * ph);
        g.lineBetween(x, y, x2, y2);
      }
      // The shared gap, as a wedge of clear water.
      const ringsDone = Math.floor(Math.max(0, time - firstAt) / 720);
      if (ringsDone < RINGS) {
        const gap = g0 + drift * Math.min(RINGS - 1, ringsDone);
        const k = time < firstAt ? (time - from) / Math.max(1, firstAt - from) : 1;
        g.fillStyle(WHITE, 0.07 + k * 0.1);
        g.slice(cx, cy, 520, gap - GAP, gap + GAP, false); g.fillPath();
        g.lineStyle(2, WHITE, 0.25 + k * 0.3);
        g.lineBetween(cx + Math.cos(gap) * 80, cy + Math.sin(gap) * 80, cx + Math.cos(gap) * 520, cy + Math.sin(gap) * 520);
      }
      // Her maw — the drain at her feet.
      if (on) {
        g.fillStyle(0x020a14, 0.4); g.fillCircle(tk.bossX, tk.bossY, 78);
        for (let k = 0; k < 3; k++) {
          const a = time / 200 + k * 2.1;
          g.lineStyle(2, SEA_LIT, 0.5);
          g.beginPath(); g.arc(tk.bossX, tk.bossY, 50 + k * 10, a, a + 1.5, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── II. Ballast Rises ────────────────────────────────────────────────
// Bubbles well up out of the floor around you, a sleeper curled in each — the drowned she keeps.
// When a bubble bursts it bursts hard; what climbs out of it is not awake, and it is hers.

const ballastRises = (tk: BossToolkit): SignatureMove => {
  interface Bub { x: number; y: number; born: number; popAt: number; popped: boolean; skin: number; cloth: number }
  let bubs: Bub[] = [];
  const looks: [number, number][] = [[0xc8b098, 0x5a4a6a], [0xa88a70, 0x3a5a5a], [0xd8c0a8, 0x6a3a3a], [0xb89a82, 0x2a3a5a]];
  return {
    durationMs: 2200,
    windupMs: 900,
    hold: 'conduct',
    tell: 'BALLAST RISES',
    cast(time) {
      tk.sfx('bubble');
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const a0 = Math.random() * Math.PI * 2;
      const warn = tk.warn(1400);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const r = 160 + Math.random() * 50;
        const x = tk.clampX(p.x + Math.cos(a) * r, 80), y = tk.clampY(p.y + Math.sin(a) * r, 80);
        const [skin, cloth] = looks[i % looks.length];
        bubs.push({ x, y, born: time, popAt: time + warn, popped: false, skin, cloth });
        tk.spawnZone({ x, y, radius: 40, warnMs: 1400, damage: 10 });
      }
    },
    update(time) {
      for (const b of bubs) {
        if (b.popped || time < b.popAt) continue;
        b.popped = true;
        tk.sfx('splash');
        tk.spawnAdd({ x: b.x, y: b.y, hp: 34, speed: 74, damage: 8, ranged: false, maxAlive: 5 });
      }
      bubs = bubs.filter((b) => time < b.popAt + 500);
    },
    drawAir(g, time) {
      for (const b of bubs) {
        if (b.popped) {
          const k = (time - b.popAt) / 500;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            g.fillStyle(FOAM, 1 - k); g.fillCircle(b.x + Math.cos(a) * (20 + k * 40), b.y - 24 + Math.sin(a) * (20 + k * 30), 3);
          }
          continue;
        }
        const k = clampN((time - b.born) / Math.max(1, b.popAt - b.born), 0, 1);
        const r = 12 + k * 14 + (k > 0.8 ? Math.sin(time / 30) * 2 : 0);
        sleeperInBubble(g, b.x, b.y, r, time / 1000, b.skin, b.cloth, k);
      }
    },
    onPhaseEnd() { bubs = []; },
  };
};

// ── II. The Crown's Anchor ───────────────────────────────────────────
// She hurls the great anchor of the royal barge at where you stand. It lands hard; the chain
// lies on the floor from it to her hand; then she reels it home and the chain and the flukes
// drag the floor all the way back. Be past the anchor, not between it and her. Twice.

const crownsAnchor = (tk: BossToolkit): SignatureMove => {
  const FLY = 420;
  const LIE = 600;
  const REEL = 900;
  interface Throw { tx: number; ty: number; born: number; landAt: number; landed: boolean; chainHit: boolean; headHit: boolean }
  let throws: Throw[] = [];
  const reelAt = (t: Throw) => t.landAt + LIE;
  const endAt = (t: Throw) => reelAt(t) + REEL;
  const head = (t: Throw, time: number): { x: number; y: number } => {
    if (time < reelAt(t)) return { x: t.tx, y: t.ty };
    const k = clampN((time - reelAt(t)) / REEL, 0, 1);
    const e = k * k;
    return { x: t.tx + (tk.bossX - t.tx) * e, y: t.ty + (tk.bossY - t.ty) * e };
  };
  const hurl = (time: number) => {
    const p = tk.player;
    throws.push({ tx: tk.clampX(p.x, 60), ty: tk.clampY(p.y, 60), born: time, landAt: time + tk.warn(950), landed: false, chainHit: false, headHit: false });
    tk.sfx('chain');
  };
  const drawAnchor = (g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, s: number): void => {
    const ca = Math.cos(a), sa = Math.sin(a);
    const P = (u: number, v: number) => ({ x: x + ca * u - sa * v, y: y + sa * u + ca * v });
    const ring = P(-30 * s, 0), crownP = P(22 * s, 0);
    g.lineStyle(7 * s, 0x0e1418, 1); g.lineBetween(ring.x, ring.y, crownP.x, crownP.y);
    g.lineStyle(4 * s, ANCHOR_IRON, 1); g.lineBetween(ring.x, ring.y, crownP.x, crownP.y);
    const st0 = P(-20 * s, -16 * s), st1 = P(-20 * s, 16 * s);
    g.lineStyle(5 * s, 0x4a3a22, 1); g.lineBetween(st0.x, st0.y, st1.x, st1.y);
    g.lineStyle(3 * s, ANCHOR_IRON, 1); g.strokeCircle(ring.x, ring.y, 5 * s);
    // The arms, curving back to two flukes.
    for (const v of [-1, 1]) {
      const m = P(26 * s, v * 10 * s), e = P(16 * s, v * 22 * s);
      g.lineStyle(5 * s, ANCHOR_IRON, 1); g.lineBetween(crownP.x, crownP.y, m.x, m.y); g.lineBetween(m.x, m.y, e.x, e.y);
      const f0 = P(10 * s, v * 26 * s), f1 = P(22 * s, v * 18 * s), f2 = P(12 * s, v * 16 * s);
      g.fillStyle(ANCHOR_IRON, 1); g.fillTriangle(f0.x, f0.y, f1.x, f1.y, f2.x, f2.y);
    }
    g.fillStyle(GOLD, 0.8); g.fillCircle(crownP.x, crownP.y, 3 * s);
  };
  const drawChain = (g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, alpha: number): void => {
    const d = dist(x1, y1, x2, y2);
    const n = Math.max(2, Math.floor(d / 11));
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      g.lineStyle(2.5, i % 2 ? 0x5a6a72 : 0x3a464c, alpha);
      if (i % 2) g.strokeEllipse(x, y, Math.abs(Math.cos(a)) * 9 + 3, Math.abs(Math.sin(a)) * 9 + 3);
      else g.strokeEllipse(x, y, Math.abs(Math.sin(a)) * 5 + 3, Math.abs(Math.cos(a)) * 5 + 3);
    }
  };
  return {
    durationMs: 3600,
    windupMs: 900,
    gesture: 'punch',
    tell: 'THE CROWN\'S ANCHOR',
    cast(time) {
      hurl(time);
      tk.schedule(1450, () => hurl(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const t of throws) {
        if (!t.landed && time >= t.landAt) {
          t.landed = true;
          tk.explode(t.tx, t.ty, 54, 18, ANCHOR_IRON);
          tk.scene.cameras.main.shake(200, 0.006);
          tk.sfx('anvil');
        }
        if (time < reelAt(t) || time > endAt(t) || !p.active) continue;
        if (time - reelAt(t) < 40) tk.sfx('chain');
        const h = head(t, time);
        if (!t.headHit && dist(p.x, p.y, h.x, h.y) < 30 + PLAYER_R) {
          t.headHit = true;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.6, 600);
        } else if (!t.chainHit && segDist(p.x, p.y, tk.bossX, tk.bossY, h.x, h.y) < 8 + PLAYER_R) {
          t.chainHit = true;
          tk.hitPlayer(12, p.x, p.y);
        }
      }
      throws = throws.filter((t) => time < endAt(t) + 50);
    },
    drawGround(g, time) {
      for (const t of throws) {
        if (time < t.landAt) {
          const k = clampN((time - t.born) / Math.max(1, t.landAt - t.born), 0, 1);
          g.lineStyle(2, ANCHOR_IRON, 0.25 + k * 0.4);
          for (let i = 0; i < 16; i++) {
            const a = i / 16, b = (i + 0.5) / 16;
            g.lineBetween(tk.bossX + (t.tx - tk.bossX) * a, tk.bossY + (t.ty - tk.bossY) * a, tk.bossX + (t.tx - tk.bossX) * b, tk.bossY + (t.ty - tk.bossY) * b);
          }
          g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillCircle(t.tx, t.ty, 54 * (0.5 + k * 0.5));
          g.lineStyle(3, SEA_LIT, 0.4 + k * 0.5); g.strokeCircle(t.tx, t.ty, 54);
          continue;
        }
        // The chain on the floor, then dragging.
        const h = head(t, time);
        const reeling = time >= reelAt(t);
        drawChain(g, tk.bossX, tk.bossY, h.x, h.y, reeling ? 1 : 0.85);
        if (!reeling) {
          const k = (time - t.landAt) / LIE;
          g.lineStyle(3, WHITE, 0.15 + k * 0.5);
          g.lineBetween(tk.bossX, tk.bossY, h.x, h.y);
          // The furrow the anchor left.
          g.fillStyle(0x0a1418, 0.5); g.fillEllipse(t.tx, t.ty + 6, 70, 20);
        } else {
          g.fillStyle(FOAM, 0.3); g.fillEllipse(h.x, h.y + 6, 50, 16);
        }
      }
    },
    drawAir(g, time) {
      for (const t of throws) {
        const a = Math.atan2(t.ty - tk.bossY, t.tx - tk.bossX);
        if (time < t.landAt) {
          const k = (time - (t.landAt - FLY)) / FLY;
          if (k < 0) continue;
          const x = tk.bossX + (t.tx - tk.bossX) * k, y = tk.bossY + (t.ty - tk.bossY) * k - Math.sin(k * Math.PI) * 80;
          drawChain(g, tk.bossX, tk.bossY, x, y, 0.9);
          drawAnchor(g, x, y, a + k * 0.6, 1.1);
          continue;
        }
        const h = head(t, time);
        drawAnchor(g, h.x, h.y, a, 1.1);
      }
    },
    onPhaseEnd() { throws = []; },
  };
};

// ── III. High Water ──────────────────────────────────────────────────
// The hall fills to the brim. Four tithe-barges float on it, drifting slow circles; on a barge
// you are dry. Everywhere else is deep — slow and cold. It holds while she works, then drains.

const highWater = (tk: BossToolkit): SignatureMove => {
  const RISE_MS = 1500;
  const HOLD_MS = 7600;
  const DRAIN_MS = 1100;
  const RW = 124, RH = 78;
  const BARGES = [
    { cx: 250, cy: 250, rx: 80, ry: 34, w: 0.42, ph: 0 },
    { cx: 710, cy: 250, rx: 80, ry: 34, w: -0.38, ph: 1.7 },
    { cx: 260, cy: 500, rx: 70, ry: 40, w: -0.4, ph: 3.1 },
    { cx: 700, cy: 500, rx: 70, ry: 40, w: 0.44, ph: 4.4 },
  ];
  let state: 'off' | 'rise' | 'full' | 'drain' = 'off';
  let at = 0;
  let born = 0;
  let holdUntil = 0;
  let lastTick = 0;
  const level = (time: number) => (state === 'off' ? 0 : state === 'rise' ? clampN((time - born) / Math.max(1, at - born), 0, 1)
    : state === 'full' ? 1 : 1 - clampN((time - at) / DRAIN_MS, 0, 1));
  const barge = (b: typeof BARGES[number], time: number) => ({
    x: b.cx + Math.cos(time / 1000 * b.w + b.ph) * b.rx,
    y: b.cy + Math.sin(time / 1000 * b.w * 1.3 + b.ph) * b.ry,
  });
  const onBarge = (x: number, y: number, time: number) => BARGES.some((b) => {
    const p = barge(b, time);
    return Math.abs(x - p.x) < RW / 2 + 4 && Math.abs(y - p.y) < RH / 2 + 4;
  });
  return {
    durationMs: 2200,
    windupMs: 1000,
    gesture: 'raise',
    tell: 'HIGH WATER',
    cast(time) {
      if (state === 'off' || state === 'drain') {
        state = 'rise';
        born = time;
        at = time + tk.warn(RISE_MS);
        tk.sfx('rain');
      } else {
        holdUntil = Math.max(holdUntil, time + HOLD_MS * 0.6);
        float(tk, tk.W / 2, FT + 40, 'THE WATER RISES AGAIN', '#9ae8ff');
      }
    },
    update(time) {
      if (state === 'rise' && time >= at) { state = 'full'; holdUntil = time + HOLD_MS; tk.sfx('splash'); }
      else if (state === 'full' && time >= holdUntil) { state = 'drain'; at = time; }
      else if (state === 'drain' && time >= at + DRAIN_MS) state = 'off';
      if (level(time) < 0.85) return;
      const p = tk.player;
      if (!p.active || onBarge(p.x, p.y, time)) return;
      tk.slowPlayer(0.62, 220);
      if (time - lastTick > 520) { lastTick = time; tk.hitPlayer(5, p.x, p.y); }
    },
    drawGround(g, time) {
      if (state === 'off') return;
      const k = level(time);
      // The water, rising from every edge.
      const inset = (1 - k) * 220;
      g.fillStyle(DEEPWATER, 0.5 * k); g.fillRect(0, FT, tk.W, tk.H - FT);
      if (k < 1) {
        g.lineStyle(4, WHITE, 0.6); g.strokeRect(inset, FT + inset * 0.6, tk.W - inset * 2, tk.H - FT - inset * 1.2);
      }
      for (let i = 0; i < 9; i++) {
        const y = FT + 40 + i * 60;
        g.lineStyle(2, FOAM, 0.12 * k);
        g.beginPath();
        for (let x = 0; x <= tk.W; x += 24) {
          const yy = y + Math.sin(x * 0.03 + time / 500 + i) * 5;
          if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
        g.strokePath();
      }
      // The barges.
      for (const b of BARGES) {
        const p = barge(b, time);
        const bob = Math.sin(time / 400 + b.ph) * 2;
        const x = p.x - RW / 2, y = p.y - RH / 2 + bob;
        g.fillStyle(0x000000, 0.3 * k); g.fillEllipse(p.x, p.y + RH / 2 + 4, RW + 10, 16);
        g.fillStyle(dim(RAFT_WOOD, 0.4), 1); g.fillRoundedRect(x - 3, y - 3, RW + 6, RH + 6, 14);
        g.fillStyle(RAFT_WOOD, 1); g.fillRoundedRect(x, y, RW, RH, 12);
        g.lineStyle(1.5, dim(RAFT_WOOD, 0.35), 1);
        for (let px = x + 14; px < x + RW - 6; px += 14) g.lineBetween(px, y + 4, px, y + RH - 4);
        g.lineStyle(2, 0xc8b088, 0.8); g.strokeRoundedRect(x + 4, y + 4, RW - 8, RH - 8, 10);
        // A tithe-chest lashed to the deck, a bollard at each end.
        g.fillStyle(0x3a2a12, 1); g.fillRect(p.x - 12, p.y - 10 + bob, 24, 16);
        g.fillStyle(GOLD, 0.9); g.fillRect(p.x - 12, p.y - 4 + bob, 24, 3);
        g.fillStyle(0x2a1a0a, 1); g.fillCircle(x + 10, p.y + bob, 4); g.fillCircle(x + RW - 10, p.y + bob, 4);
        crest(g, x - 6, x + RW + 6, y + RH + 2, time, 0.5 * k, 2);
      }
    },
    onPhaseEnd() { state = 'off'; },
  };
};

// ── III. The Rogue Wave ──────────────────────────────────────────────
// A breaking wave runs the length of the hall wall to wall, one trough in it to slip through,
// marked at the edge it starts from. A second follows the other way, its trough elsewhere.

const rogueWave = (tk: BossToolkit): SignatureMove => {
  const SPEED = 290;
  const TROUGH = 64;
  const THICK = 28;
  interface Wave { dir: 1 | -1; gapY: number; born: number; startAt: number; x: number; hit: boolean }
  let waves: Wave[] = [];
  const make = (time: number, dir: 1 | -1, avoid?: number) => {
    let gy = FT + 100 + Math.random() * (tk.H - FT - 180);
    if (avoid !== undefined && Math.abs(gy - avoid) < 170) gy = avoid > (FT + tk.H) / 2 ? avoid - 220 : avoid + 220;
    gy = clampN(gy, FT + 90, tk.H - 80);
    waves.push({ dir, gapY: gy, born: time, startAt: time + tk.warn(1150), x: dir > 0 ? -THICK : tk.W + THICK, hit: false });
  };
  return {
    durationMs: 3300,
    windupMs: 900,
    gesture: 'sweep',
    tell: 'ROGUE WAVE',
    cast(time) {
      tk.sfx('water-jet');
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      make(time, dir);
      const first = waves[waves.length - 1].gapY;
      tk.schedule(1700, () => make(tk.now, (dir === 1 ? -1 : 1), first));
    },
    update(time, dt) {
      const p = tk.player;
      for (const w of waves) {
        if (time < w.startAt) continue;
        if (time - w.startAt < 40) tk.sfx('splash');
        w.x += w.dir * SPEED * dt;
        if (w.hit || !p.active) continue;
        if (Math.abs(p.x - w.x) < THICK / 2 + PLAYER_R && Math.abs(p.y - w.gapY) > TROUGH - 10) {
          w.hit = true;
          tk.hitPlayer(18, p.x, p.y);
          carry(tk, w.dir * 70, 0);
          tk.slowPlayer(0.7, 700);
        }
      }
      waves = waves.filter((w) => w.x > -80 && w.x < tk.W + 80);
    },
    drawGround(g, time) {
      for (const w of waves) {
        if (time >= w.startAt) continue;
        const k = clampN((time - w.born) / Math.max(1, w.startAt - w.born), 0, 1);
        const ex = w.dir > 0 ? 0 : tk.W;
        // The sea standing up at the starting wall, the trough marked bright.
        g.fillStyle(WATER, 0.15 + k * 0.3);
        g.fillRect(w.dir > 0 ? 0 : tk.W - 24, FT, 24, w.gapY - TROUGH - FT);
        g.fillRect(w.dir > 0 ? 0 : tk.W - 24, w.gapY + TROUGH, 24, tk.H - w.gapY - TROUGH);
        g.fillStyle(WHITE, 0.08 + k * 0.12);
        g.fillRect(0, w.gapY - TROUGH, tk.W, TROUGH * 2);
        g.lineStyle(2, WHITE, 0.25 + k * 0.4);
        g.lineBetween(0, w.gapY - TROUGH, tk.W, w.gapY - TROUGH); g.lineBetween(0, w.gapY + TROUGH, tk.W, w.gapY + TROUGH);
        for (let i = 0; i < 3; i++) {
          const ax = ex + w.dir * (40 + i * 30);
          g.fillStyle(WHITE, 0.3 + k * 0.5);
          g.fillTriangle(ax + w.dir * 14, w.gapY, ax, w.gapY - 10, ax, w.gapY + 10);
        }
      }
    },
    drawAir(g, time) {
      for (const w of waves) {
        if (time < w.startAt) continue;
        for (const [y0, y1] of [[FT, w.gapY - TROUGH], [w.gapY + TROUGH, tk.H]] as [number, number][]) {
          if (y1 <= y0) continue;
          // The body of the wave and its curling lip.
          g.fillStyle(DEEPWATER, 0.85); g.fillRect(w.x - THICK / 2 - w.dir * 20, y0, THICK + 10, y1 - y0);
          g.fillStyle(WATER, 0.9); g.fillRect(w.x - THICK / 2, y0, THICK, y1 - y0);
          g.fillStyle(WHITE, 0.85); g.fillRect(w.x + w.dir * (THICK / 2 - 4), y0, 6, y1 - y0);
          for (let y = y0 + 8; y < y1; y += 18) {
            const sp = Math.sin(time / 60 + y) * 6;
            g.fillStyle(FOAM, 0.8); g.fillCircle(w.x + w.dir * (THICK / 2 + 4 + sp), y, 4);
          }
          // Spray behind.
          for (let i = 0; i < 6; i++) {
            const y = y0 + ((i * 53 + time * 0.2) % Math.max(1, y1 - y0));
            g.fillStyle(FOAM, 0.3); g.fillCircle(w.x - w.dir * (30 + i * 8), y, 3);
          }
        }
        // The trough's lips.
        g.fillStyle(WHITE, 0.9);
        g.fillEllipse(w.x, w.gapY - TROUGH, THICK + 14, 12); g.fillEllipse(w.x, w.gapY + TROUGH, THICK + 14, 12);
      }
    },
    onPhaseEnd() { waves = []; },
  };
};

// ── III. The Broken Strand ───────────────────────────────────────────
// Her pearls come off their string all at once. They hang in the air a moment, each with a line
// showing which way it will go, then scatter and carom off the walls of the hall.

const brokenStrand = (tk: BossToolkit): SignatureMove => {
  const SPEED = 215;
  const LIFE = 5200;
  const HANG = 520;
  const R = 9;
  interface Pearl { x: number; y: number; vx: number; vy: number; launchAt: number; dieAt: number; dead: boolean }
  let pearls: Pearl[] = [];
  return {
    durationMs: 2000,
    windupMs: 850,
    gesture: 'clap',
    tell: 'THE BROKEN STRAND',
    cast(time) {
      tk.sfx('crystal-shatter');
      const n = tk.hard ? 10 : 8;
      const a0 = tk.angleToPlayer() + Math.PI / n;
      const launchAt = time + tk.warn(HANG);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        pearls.push({
          x: tk.bossX + Math.cos(a) * 46, y: tk.bossY + Math.sin(a) * 46,
          vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, launchAt, dieAt: launchAt + LIFE, dead: false,
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const pr of pearls) {
        if (pr.dead || time < pr.launchAt) continue;
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        if (pr.x < 20) { pr.x = 20; pr.vx = Math.abs(pr.vx); }
        if (pr.x > tk.W - 20) { pr.x = tk.W - 20; pr.vx = -Math.abs(pr.vx); }
        if (pr.y < FT + 10) { pr.y = FT + 10; pr.vy = Math.abs(pr.vy); }
        if (pr.y > tk.H - 20) { pr.y = tk.H - 20; pr.vy = -Math.abs(pr.vy); }
        if (p.active && dist(p.x, p.y, pr.x, pr.y) < R + PLAYER_R) {
          pr.dead = true;
          tk.hitPlayer(10, p.x, p.y);
        }
      }
      pearls = pearls.filter((pr) => !pr.dead && time < pr.dieAt);
    },
    drawGround(g, time) {
      for (const pr of pearls) {
        if (time >= pr.launchAt) { g.fillStyle(0x000000, 0.22); g.fillEllipse(pr.x + 3, pr.y + 12, 16, 6); continue; }
        g.lineStyle(2, PEARL_SHEEN, 0.5);
        g.lineBetween(pr.x, pr.y, pr.x + pr.vx * 0.4, pr.y + pr.vy * 0.4);
      }
    },
    drawAir(g, time) {
      // The snapped string, while they hang.
      const hanging = pearls.filter((pr) => time < pr.launchAt);
      if (hanging.length > 1) {
        g.lineStyle(1, GOLD, 0.6);
        for (let i = 0; i < hanging.length - 1; i++) g.lineBetween(hanging[i].x, hanging[i].y, hanging[i + 1].x, hanging[i + 1].y);
      }
      for (const pr of pearls) {
        const fade = time > pr.dieAt - 500 ? (pr.dieAt - time) / 500 : 1;
        g.fillStyle(0x8a8078, fade); g.fillCircle(pr.x, pr.y, R + 1);
        g.fillStyle(mixC(PEARL, PEARL_SHEEN, (Math.sin(time / 200 + pr.vx) + 1) / 2), fade); g.fillCircle(pr.x, pr.y, R);
        g.fillStyle(0xffffff, 0.85 * fade); g.fillCircle(pr.x - 3, pr.y - 3, 2.6);
      }
    },
    onPhaseEnd() { pearls = []; },
  };
};

// ── IV. The Maelstrom ────────────────────────────────────────────────
// The hall turns round its eye. You are carried round and drawn in; three spiral arms of foam
// sweep the room, each with one hole in it at its own distance from the eye — shift in or out
// to meet the hole of the arm that is coming. The eye itself drowns you. When she calls it
// again, the tide turns: the whirl reverses, and the holes move.

const maelstrom = (tk: BossToolkit): SignatureMove => {
  const ARMS = 3;
  const RMIN = 70;
  const RMAX = 340;
  const HOLE = 38;
  const TWIST = 0.0055;
  const SPIN = 0.55;
  const FADE_MS = 1500;
  let active = false;
  let dir: 1 | -1 = 1;
  let base = 0;
  let armedAt = 0;
  let flipAt = 0;
  let lastHit = 0;
  let lastCore = 0;
  let holes: number[] = [140, 220, 300];
  const roll = () => {
    const h = [120 + Math.random() * 40, 200 + Math.random() * 30, 280 + Math.random() * 40];
    for (let i = h.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [h[i], h[j]] = [h[j], h[i]]; }
    holes = h;
  };
  const armAng = (k: number, r: number) => base + (k * Math.PI * 2) / ARMS - dir * r * TWIST;
  return {
    durationMs: 1800,
    windupMs: 1000,
    hold: 'charge',
    tell: 'THE MAELSTROM',
    cast(time) {
      tk.sfx('tornado');
      if (!active) {
        active = true;
        dir = 1;
        roll();
        base = tk.angleToPlayer(EYE.x, EYE.y) + Math.PI / 3;
        armedAt = time + tk.warn(FADE_MS);
        float(tk, EYE.x, FT + 40, 'THE HALL TURNS', '#9ae8ff');
      } else {
        flipAt = time + tk.warn(1200);
        float(tk, EYE.x, FT + 40, 'THE TIDE TURNS', '#ffe08a');
      }
    },
    update(time, dt) {
      if (!active) return;
      if (flipAt && time >= flipAt) {
        flipAt = 0;
        dir = dir === 1 ? -1 : 1;
        roll();
        armedAt = time + 500;
        tk.sfx('time-warp');
      }
      base += dir * SPIN * dt * (flipAt ? 0.4 : 1);
      const p = tk.player;
      if (!p.active) return;
      const dx = p.x - EYE.x, dy = p.y - EYE.y;
      const r = Math.hypot(dx, dy) || 1;
      // Carried round and drawn in.
      if (r < RMAX + 80) {
        const tx = -dy / r, ty = dx / r;
        carry(tk, tx * dir * 48 * dt - (dx / r) * 20 * dt, ty * dir * 48 * dt - (dy / r) * 20 * dt);
      }
      if (time < armedAt) return;
      if (r < RMIN && time - lastCore > 450) { lastCore = time; tk.hitPlayer(8, p.x, p.y); tk.sfx('bubble'); return; }
      if (r < RMIN || r > RMAX || time - lastHit < 700) return;
      const th = Math.atan2(dy, dx);
      for (let k = 0; k < ARMS; k++) {
        if (Math.abs(r - holes[k]) < HOLE) continue;
        if (Math.abs(wrap(th - armAng(k, r))) * r < 15 + PLAYER_R * 0.5) {
          lastHit = time;
          tk.hitPlayer(10, p.x, p.y);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clampN(1 - (armedAt - time) / FADE_MS, 0, 1);
      // The bowl of the whirl: rings of darker water toward the eye.
      for (let i = 5; i >= 1; i--) {
        g.fillStyle(0x020a1a, 0.06 * i); g.fillCircle(EYE.x, EYE.y, RMAX * (i / 5) + 20);
      }
      // Swirl lines.
      for (let i = 0; i < 18; i++) {
        const r0 = 80 + (i * 17) % 260;
        const a = base * 1.3 + i * 1.9;
        g.lineStyle(1.5, FOAM, 0.12);
        g.beginPath(); g.arc(EYE.x, EYE.y, r0, a, a + 0.9, false); g.strokePath();
      }
      // The arms, broken at their holes.
      for (let a = 0; a < ARMS; a++) {
        let prev: { x: number; y: number } | null = null;
        for (let r = RMIN; r <= RMAX; r += 10) {
          const ang = armAng(a, r);
          const pt = { x: EYE.x + Math.cos(ang) * r, y: EYE.y + Math.sin(ang) * r };
          const inHole = Math.abs(r - holes[a]) < HOLE;
          if (prev && !inHole) {
            g.lineStyle(22, WATER, 0.35 * k); g.lineBetween(prev.x, prev.y, pt.x, pt.y);
            g.lineStyle(6, WHITE, 0.75 * k); g.lineBetween(prev.x, prev.y, pt.x, pt.y);
          }
          prev = inHole ? null : pt;
        }
        // Mark the hole with two posts of spray so it reads at a glance.
        for (const e of [-HOLE, HOLE]) {
          const r = holes[a] + e;
          const ang = armAng(a, r);
          g.fillStyle(WHITE, 0.8 * k); g.fillCircle(EYE.x + Math.cos(ang) * r, EYE.y + Math.sin(ang) * r, 5);
        }
      }
      // The eye.
      g.fillStyle(0x01040a, 0.85); g.fillCircle(EYE.x, EYE.y, RMIN);
      for (let i = 0; i < 4; i++) {
        const a = -base * 2 + i * 1.57;
        g.lineStyle(3, SEA_LIT, 0.5);
        g.beginPath(); g.arc(EYE.x, EYE.y, RMIN - 8 - i * 12, a, a + 2.2, false); g.strokePath();
      }
      if (flipAt && Math.floor(time / 120) % 2 === 0) { g.lineStyle(4, GOLD, 0.6); g.strokeCircle(EYE.x, EYE.y, RMAX + 10); }
    },
    onPhaseEnd() { active = false; flipAt = 0; },
  };
};

// ── IV. Waterspouts ──────────────────────────────────────────────────
// Spinning columns of water stand up off the floor around you and come after you, slow and
// stubborn, turning wide. When they die they fall in a ring of spray.

const waterspouts = (tk: BossToolkit): SignatureMove => {
  const SPEED = 72;
  const TURN = 1.2;
  const LIFE = 5600;
  const R = 34;
  interface Spout { x: number; y: number; born: number; formAt: number; ang: number; lastHit: number; done: boolean }
  let spouts: Spout[] = [];
  return {
    durationMs: 2000,
    windupMs: 900,
    hold: 'conduct',
    tell: 'WATERSPOUTS',
    cast(time) {
      tk.sfx('tornado');
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 250, 70), y = tk.clampY(p.y + Math.sin(a) * 220, 70);
        spouts.push({ x, y, born: time, formAt: time + tk.warn(1000), ang: Math.atan2(p.y - y, p.x - x), lastHit: 0, done: false });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of spouts) {
        if (s.done || time < s.formAt) continue;
        if (time > s.formAt + LIFE) {
          s.done = true;
          tk.explode(s.x, s.y, 64, 12, WATER);
          tk.sfx('splash');
          continue;
        }
        const want = Math.atan2(p.y - s.y, p.x - s.x);
        const d = wrap(want - s.ang);
        s.ang += clampN(d, -TURN * dt, TURN * dt);
        s.x = clampN(s.x + Math.cos(s.ang) * SPEED * dt, 40, tk.W - 40);
        s.y = clampN(s.y + Math.sin(s.ang) * SPEED * dt, FT + 20, tk.H - 40);
        if (p.active && dist(p.x, p.y, s.x, s.y) < R + PLAYER_R * 0.6 && time - s.lastHit > 900) {
          s.lastHit = time;
          tk.hitPlayer(12, p.x, p.y);
          tk.slowPlayer(0.6, 600);
        }
      }
      spouts = spouts.filter((s) => !s.done || time < s.formAt + LIFE + 200);
    },
    drawGround(g, time) {
      for (const s of spouts) {
        if (s.done) continue;
        if (time < s.formAt) {
          const k = clampN((time - s.born) / Math.max(1, s.formAt - s.born), 0, 1);
          for (let i = 0; i < 3; i++) {
            const a = time / 120 + i * 2.1;
            g.lineStyle(2, FOAM, 0.2 + k * 0.5);
            g.beginPath(); g.arc(s.x, s.y, R * (0.5 + k * 0.6) + i * 4, a, a + 2, false); g.strokePath();
          }
          continue;
        }
        g.fillStyle(0x000000, 0.25); g.fillEllipse(s.x, s.y + 6, R * 2.4, 18);
        g.fillStyle(WATER, 0.3); g.fillEllipse(s.x, s.y, R * 2.2, R);
        for (let i = 0; i < 3; i++) {
          const a = time / 90 + i * 2.1;
          g.lineStyle(2, WHITE, 0.6);
          g.beginPath(); g.arc(s.x, s.y, R + i * 3, a, a + 1.6, false); g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      for (const s of spouts) {
        if (s.done || time < s.formAt) continue;
        const grow = Math.min(1, (time - s.formAt) / 400);
        const hgt = 120 * grow;
        for (let i = 0; i < 10; i++) {
          const k = i / 10;
          const y = s.y - k * hgt;
          const w = (R * 0.8) * (0.5 + k * 0.9);
          const sway = Math.sin(time / 160 + k * 5) * 8 * k;
          g.fillStyle(i % 2 ? WATER : SEA_MAIN, 0.55);
          g.fillEllipse(s.x + sway, y, w * 2, 12);
          g.lineStyle(1.5, WHITE, 0.5);
          g.beginPath(); g.arc(s.x + sway, y, w, time / 80 + i, time / 80 + i + 1.2, false); g.strokePath();
        }
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 500) + i / 5) % 1;
          g.fillStyle(FOAM, (1 - ph) * 0.6);
          g.fillCircle(s.x + Math.cos(i * 1.3 + time / 200) * (R + ph * 20), s.y - hgt - ph * 20, 3);
        }
      }
    },
    onPhaseEnd() { spouts = []; },
  };
};

// ── IV. The Drowned Chorus ───────────────────────────────────────────
// Eight of her ballast circle her in their bubbles, singing in their sleep. She throws them at
// you one at a time — the next to go glows, and a thread of water marks where it is aimed.

const drownedChorus = (tk: BossToolkit): SignatureMove => {
  const N = 8;
  const ORBIT = 110;
  const SPIN = 1.6;
  const GAP_MS = 340;
  const SPEED = 330;
  const R = 15;
  interface Singer { idx: number; launchAt: number; flying: boolean; x: number; y: number; vx: number; vy: number; dead: boolean }
  let singers: Singer[] = [];
  let a0 = 0;
  let born = 0;
  const orbitPos = (s: Singer, time: number) => {
    const a = a0 + (s.idx / N) * Math.PI * 2 + ((time - born) / 1000) * SPIN;
    return { x: tk.bossX + Math.cos(a) * ORBIT, y: tk.bossY + Math.sin(a) * ORBIT };
  };
  return {
    durationMs: 3800,
    windupMs: 900,
    hold: 'conduct',
    tell: 'THE DROWNED CHORUS',
    cast(time) {
      tk.sfx('holy-chord');
      a0 = Math.random() * Math.PI * 2;
      born = time;
      const first = time + tk.warn(900);
      singers = [];
      for (let i = 0; i < N; i++) singers.push({ idx: i, launchAt: first + i * GAP_MS, flying: false, x: 0, y: 0, vx: 0, vy: 0, dead: false });
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of singers) {
        if (s.dead) continue;
        if (!s.flying) {
          const o = orbitPos(s, time);
          s.x = o.x; s.y = o.y;
          if (time >= s.launchAt) {
            s.flying = true;
            const a = Math.atan2(p.y - s.y, p.x - s.x);
            s.vx = Math.cos(a) * SPEED; s.vy = Math.sin(a) * SPEED;
            tk.sfx('bubble');
          }
          continue;
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < -30 || s.x > tk.W + 30 || s.y < FT - 30 || s.y > tk.H + 30) { s.dead = true; continue; }
        if (p.active && dist(p.x, p.y, s.x, s.y) < R + PLAYER_R) {
          s.dead = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.boom(s.x, s.y, 28, FOAM);
        }
      }
      singers = singers.filter((s) => !s.dead);
    },
    drawGround(g, time) {
      const p = tk.player;
      for (const s of singers) {
        if (s.flying || s.launchAt - time > 280) continue;
        // The aim thread.
        const k = 1 - (s.launchAt - time) / 280;
        g.lineStyle(2, FOAM, 0.2 + k * 0.5);
        const a = Math.atan2(p.y - s.y, p.x - s.x);
        g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 600, s.y + Math.sin(a) * 600);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const s of singers) {
        const next = !s.flying && s.launchAt - time < 280;
        sleeperInBubble(g, s.x, s.y + R, R, t, 0xc8b098, s.idx % 2 ? 0x3a5a5a : 0x5a4a6a, next ? 1 : 0);
        if (next) { g.lineStyle(3, WHITE, 0.6 + Math.sin(time / 40) * 0.3); g.strokeCircle(s.x, s.y, R + 4); }
        // The song: small notes of bubble rising.
        if (!s.flying && s.idx % 2 === 0) {
          const ph = (t * 0.8 + s.idx * 0.13) % 1;
          g.fillStyle(FOAM, (1 - ph) * 0.6); g.fillCircle(s.x + Math.sin(t * 3 + s.idx) * 5, s.y - R - ph * 24, 2);
        }
      }
    },
    onPhaseEnd() { singers = []; },
  };
};

// ── V (hard). Dead Calm ──────────────────────────────────────────────
// No wind. No tide. The sea is glass and you are becalmed — slow, everywhere, except in the
// cat's-paws: two patches of ruffled water where a breath of wind still touches. They wander,
// and you see where they are going before they go. Her other moves are built to make you leave.

const deadCalm = (tk: BossToolkit): SignatureMove => {
  const PAW_R = 66;
  const MOVE_MS = 5200;
  const SLIDE_MS = 1000;
  interface Paw { x: number; y: number; fx: number; fy: number; tx: number; ty: number; slideAt: number }
  let active = false;
  let paws: Paw[] = [];
  let nextMove = 0;
  let pulseAt = 0;
  const spot = (avoid: Paw[]): { x: number; y: number } => {
    let best = { x: tk.W / 2, y: tk.H / 2 };
    let score = -1;
    for (let i = 0; i < 10; i++) {
      const c = { x: 110 + Math.random() * (tk.W - 220), y: FT + 90 + Math.random() * (tk.H - FT - 160) };
      const s = Math.min(...avoid.map((a) => dist(a.tx, a.ty, c.x, c.y)), 600) - Math.abs(dist(tk.bossX, tk.bossY, c.x, c.y) - 260) * 0.2;
      if (s > score) { score = s; best = c; }
    }
    return best;
  };
  const retarget = (time: number) => {
    for (const p of paws) {
      p.fx = p.x; p.fy = p.y;
      const t = spot(paws.filter((q) => q !== p));
      p.tx = t.x; p.ty = t.y;
      p.slideAt = time + tk.warn(1200);
    }
    nextMove = time + MOVE_MS;
  };
  return {
    durationMs: 1600,
    windupMs: 1000,
    hold: 'brace',
    tell: 'DEAD CALM',
    cast(time) {
      tk.sfx('hush');
      pulseAt = time;
      if (!active) {
        active = true;
        paws = [];
        for (let i = 0; i < 2; i++) {
          const s = spot(paws);
          paws.push({ x: s.x, y: s.y, fx: s.x, fy: s.y, tx: s.x, ty: s.y, slideAt: 0 });
        }
        nextMove = time + MOVE_MS;
        float(tk, tk.W / 2, FT + 40, 'BECALMED', '#e8f0f0');
      } else {
        retarget(time);
        float(tk, tk.W / 2, FT + 40, 'THE CALM DEEPENS', '#e8f0f0');
      }
    },
    update(time) {
      if (!active) return;
      if (time >= nextMove) retarget(time);
      for (const p of paws) {
        if (!p.slideAt || time < p.slideAt) continue;
        const k = clampN((time - p.slideAt) / SLIDE_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        p.x = p.fx + (p.tx - p.fx) * e; p.y = p.fy + (p.ty - p.fy) * e;
        if (k >= 1) p.slideAt = 0;
      }
      const pl = tk.player;
      if (!pl.active) return;
      if (!paws.some((p) => dist(pl.x, pl.y, p.x, p.y) < PAW_R)) tk.slowPlayer(0.68, 200);
    },
    drawGround(g, time) {
      if (!active) return;
      // The glass: long still highlights, and the player's reflection hanging under them.
      for (let i = 0; i < 7; i++) {
        const y = FT + 50 + i * 78;
        g.lineStyle(1, 0xffffff, 0.06); g.lineBetween(40, y, tk.W - 40, y + 2);
      }
      const pl = tk.player;
      if (pl.active) {
        g.fillStyle(0xe8f0f0, 0.06); g.fillEllipse(pl.x, pl.y + 34, 34, 46);
      }
      if (time - pulseAt < 900) {
        const k = (time - pulseAt) / 900;
        g.lineStyle(3, 0xe8f0f0, 0.4 * (1 - k)); g.strokeCircle(tk.bossX, tk.bossY, 40 + k * 600);
      }
      for (const p of paws) {
        // Where it will go.
        if (p.slideAt && time < p.slideAt) {
          const k = clampN(1 - (p.slideAt - time) / 1200, 0, 1);
          g.lineStyle(2, 0xe8f0f0, 0.2 + k * 0.5); g.strokeCircle(p.tx, p.ty, PAW_R * (0.5 + k * 0.5));
          for (let i = 1; i < 8; i++) {
            const t = i / 8;
            g.fillStyle(0xe8f0f0, 0.25 * k); g.fillCircle(p.x + (p.tx - p.x) * t, p.y + (p.ty - p.y) * t, 2);
          }
        }
        // The cat's-paw: ruffled water, a ring of little catspaw ripples.
        g.fillStyle(0x9ae8f0, 0.1); g.fillCircle(p.x, p.y, PAW_R);
        g.lineStyle(2, 0xe8ffff, 0.45); g.strokeCircle(p.x, p.y, PAW_R);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + time / 900;
          const r = 14 + ((i * 23) % (PAW_R - 22));
          const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
          g.lineStyle(1.5, 0xffffff, 0.45);
          g.lineBetween(x - 5, y + 2, x, y - 2); g.lineBetween(x, y - 2, x + 5, y + 2);
        }
      }
    },
    onPhaseEnd() { active = false; paws = []; },
  };
};

// ── V (hard). The Sea of Glass ───────────────────────────────────────
// She sets her heel on the still water and it cracks. Three cracks run across the glass — one
// from under your feet — drawn as they spread, then the glass along them shatters.

const seaOfGlass = (tk: BossToolkit): SignatureMove => {
  const SEGS = 4;
  const SEG_LEN = 150;
  interface Crack { pts: { x: number; y: number }[]; born: number; fireAt: number; endAt: number; hit: boolean }
  let cracks: Crack[] = [];
  const make = (time: number, x: number, y: number) => {
    const pts = [{ x, y }];
    let a = Math.random() * Math.PI * 2;
    for (let i = 0; i < SEGS; i++) {
      a += (Math.random() - 0.5) * 1.1;
      const last = pts[pts.length - 1];
      let nx = last.x + Math.cos(a) * SEG_LEN, ny = last.y + Math.sin(a) * SEG_LEN;
      if (nx < 40 || nx > tk.W - 40) { a = Math.PI - a; nx = clampN(nx, 40, tk.W - 40); }
      if (ny < FT + 20 || ny > tk.H - 30) { a = -a; ny = clampN(ny, FT + 20, tk.H - 30); }
      pts.push({ x: nx, y: ny });
    }
    // Run back the other way from the origin too, so a crack never simply starts at your feet.
    const back = [{ x, y }];
    let b = Math.atan2(pts[1].y - y, pts[1].x - x) + Math.PI;
    for (let i = 0; i < 2; i++) {
      b += (Math.random() - 0.5) * 0.8;
      const last = back[back.length - 1];
      back.push({ x: clampN(last.x + Math.cos(b) * SEG_LEN, 40, tk.W - 40), y: clampN(last.y + Math.sin(b) * SEG_LEN, FT + 20, tk.H - 30) });
    }
    const fireAt = time + tk.warn(1150);
    cracks.push({ pts: [...back.reverse(), ...pts.slice(1)], born: time, fireAt, endAt: fireAt + 420, hit: false });
  };
  const near = (c: Crack, x: number, y: number) => {
    for (let i = 0; i < c.pts.length - 1; i++) {
      if (segDist(x, y, c.pts[i].x, c.pts[i].y, c.pts[i + 1].x, c.pts[i + 1].y) < 14 + PLAYER_R * 0.7) return true;
    }
    return false;
  };
  return {
    durationMs: 2600,
    windupMs: 900,
    gesture: 'slam',
    tell: 'THE SEA OF GLASS',
    cast(time) {
      tk.sfx('ice-shatter');
      const p = tk.player;
      make(time, p.x, p.y);
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        make(time, tk.clampX(p.x + Math.cos(a) * 220, 70), tk.clampY(p.y + Math.sin(a) * 180, 70));
      }
    },
    update(time) {
      const p = tk.player;
      for (const c of cracks) {
        if (time < c.fireAt || time > c.endAt || c.hit || !p.active) continue;
        if (time - c.fireAt < 30) tk.sfx('crystal-shatter');
        if (near(c, p.x, p.y)) { c.hit = true; tk.hitPlayer(16, p.x, p.y); }
      }
      cracks = cracks.filter((c) => time < c.endAt + 900);
    },
    drawGround(g, time) {
      for (const c of cracks) {
        const total = c.pts.length - 1;
        if (time < c.fireAt) {
          const k = clampN((time - c.born) / Math.max(1, c.fireAt - c.born), 0, 1);
          // The crack runs out from its middle toward both ends.
          const mid = 2;
          const reach = k * Math.max(mid, total - mid);
          g.lineStyle(2, 0xe8f8ff, 0.3 + k * 0.6);
          for (let i = 0; i < total; i++) {
            const from = i < mid ? mid - i - 1 : i - mid;
            if (from > reach) continue;
            const part = clampN(reach - from, 0, 1);
            const a = c.pts[i], b = c.pts[i + 1];
            const [sx, sy, ex, ey] = i < mid ? [b.x, b.y, a.x, a.y] : [a.x, a.y, b.x, b.y];
            g.lineBetween(sx, sy, sx + (ex - sx) * part, sy + (ey - sy) * part);
            // Little branches.
            const mx = (sx + ex) / 2, my = (sy + ey) / 2;
            if (part > 0.5) { g.lineStyle(1, 0xe8f8ff, 0.4); g.lineBetween(mx, my, mx + (ey - sy) * 0.12, my - (ex - sx) * 0.12); g.lineStyle(2, 0xe8f8ff, 0.3 + k * 0.6); }
          }
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) {
            g.lineStyle(10, 0xe8f8ff, 0.18);
            for (let i = 0; i < total; i++) g.lineBetween(c.pts[i].x, c.pts[i].y, c.pts[i + 1].x, c.pts[i + 1].y);
          }
          continue;
        }
        // Shattered: a wide seam of broken glass, then shards settling.
        const k = clampN((time - c.fireAt) / (c.endAt - c.fireAt + 900), 0, 1);
        for (let i = 0; i < total; i++) {
          const a = c.pts[i], b = c.pts[i + 1];
          g.lineStyle(26 * (1 - k), 0xbfe8f8, 0.5 * (1 - k)); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(3, WHITE, 0.9 * (1 - k)); g.lineBetween(a.x, a.y, b.x, b.y);
          for (let j = 0; j < 5; j++) {
            const t = (j + 0.5) / 5;
            const x = a.x + (b.x - a.x) * t + Math.sin(j * 7 + i) * 10, y = a.y + (b.y - a.y) * t + Math.cos(j * 5 + i) * 10;
            g.fillStyle(0xe8f8ff, 0.8 * (1 - k)); g.fillTriangle(x, y - 5, x + 4, y + 3, x - 4, y + 2);
          }
        }
      }
    },
    onPhaseEnd() { cracks = []; },
  };
};

// ── V (hard). The Sounding Line ──────────────────────────────────────
// A leadsman's line, swung from somewhere far above. The weight comes down six times on a
// tightening spiral round where you stood, counting fathoms as it lands — the sixth on your
// mark. Step out of the spiral, not round it.

const soundingLine = (tk: BossToolkit): SignatureMove => {
  const COUNT = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
  const R0 = 230;
  const ZONE = 46;
  interface Drop { x: number; y: number; at: number; i: number; landed: boolean }
  let drops: Drop[] = [];
  return {
    durationMs: 3200,
    windupMs: 900,
    gesture: 'point',
    tell: 'THE SOUNDING LINE',
    cast(time) {
      tk.sfx('clock-tick');
      const p = tk.player;
      const cx = p.x, cy = p.y;
      const a0 = Math.random() * Math.PI * 2;
      const spin = Math.random() < 0.5 ? 1 : -1;
      const warn = tk.warn(900);
      for (let i = 0; i < COUNT.length; i++) {
        const r = R0 * (1 - i / (COUNT.length - 1));
        const a = a0 + spin * i * 1.1;
        const x = tk.clampX(cx + Math.cos(a) * r, 60), y = tk.clampY(cy + Math.sin(a) * r, 60);
        const delay = i * 380;
        drops.push({ x, y, at: time + delay + warn, i, landed: false });
        tk.schedule(delay, () => tk.spawnZone({ x, y, radius: ZONE, warnMs: 900, damage: 13 }));
      }
    },
    update(time) {
      for (const d of drops) {
        if (d.landed || time < d.at) continue;
        d.landed = true;
        tk.sfx(d.i === COUNT.length - 1 ? 'anvil' : 'drum-hit');
        float(tk, d.x, d.y - 40, `${COUNT[d.i]} FATHOM${d.i ? 'S' : ''}`, d.i === COUNT.length - 1 ? '#ffe08a' : '#c8e8f0');
      }
      drops = drops.filter((d) => time < d.at + 700);
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (d.landed) {
          const k = (time - d.at) / 700;
          g.lineStyle(2, 0xc8e8f0, 0.6 * (1 - k)); g.strokeCircle(d.x, d.y, ZONE * (0.8 + k * 0.8));
          continue;
        }
        const lead = d.at - time;
        if (lead > 900 * tk.telegraphScale) continue;
        // The line comes down from the dark with its knots, the weight swinging.
        const k = clampN(1 - lead / (900 * tk.telegraphScale), 0, 1);
        const wy = d.y - 160 * (1 - k);
        const sway = Math.sin(time / 120 + d.i) * 10 * (1 - k);
        g.lineStyle(1.5, 0xc8b088, 0.8); g.lineBetween(d.x + sway * 0.3, FT, d.x + sway, wy - 12);
        for (let j = 1; j <= d.i + 1; j++) {
          const ky = FT + ((wy - 12 - FT) * j) / (d.i + 2);
          g.fillStyle(0xc8b088, 0.9); g.fillCircle(d.x + sway * (ky - FT) / Math.max(1, wy - FT), ky, 2.2);
        }
        g.fillStyle(0x4a5058, 1); g.fillRoundedRect(d.x + sway - 6, wy - 12, 12, 20, 4);
        g.fillStyle(0x8a9098, 1); g.fillRect(d.x + sway - 4, wy - 10, 3, 16);
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Body decor ───────────────────────────────────────────────────────

/**
 * The Queen: a tall crown of white coral tipped with pearls, a whirlpool jewel at its brow; a
 * long mantle of sea-green sailcloth and kelp; a driftwood-and-gold trident; a strand of pearls.
 * Every piece moves with the phase: the mantle drapes over the clam, streams in toward her,
 * floats out on the high water like a jellyfish's bell, spirals round her as the whirl, and in
 * the calm hangs dead straight over a perfect reflection. The strand breaks in High Water; the
 * trident is gone into the maelstrom; in the calm she holds a sounding-line instead.
 */
function drawMaresa(g: Phaser.GameObjects.Graphics, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  const ph = s.phaseIdx;
  const MANTLE = 0x1e5a52;
  const MANTLE_LIT = 0x3a8a72;

  // ── Reflection (Dead Calm) — drawn first, under everything.
  if (ph >= 4) {
    g.fillStyle(0xe8f0f0, 0.08); g.fillEllipse(s.x, s.y + r * 1.9, r * 1.9, r * 1.6);
    g.lineStyle(1, 0xffffff, 0.15); g.strokeEllipse(s.x, s.y + r * 1.9, r * 2, r * 1.7);
    g.fillStyle(0xe8f0f0, 0.06);
    for (let i = 0; i < 5; i++) g.fillTriangle(s.x - r * 0.5 + i * r * 0.25, s.y + r * 2.6, s.x - r * 0.4 + i * r * 0.25, s.y + r * 2.6, s.x - r * 0.45 + i * r * 0.25, s.y + r * 3.3);
  }

  // ── The mantle.
  if (ph === 0) {
    // Draped down over the lip of the clam: long lobes hanging below her.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / 8);
      const len = r * (0.9 + Math.sin(i * 1.7) * 0.15);
      const x0 = s.x + Math.cos(a) * r * 0.9, y0 = s.y + Math.sin(a) * r * 0.9;
      const sway = Math.sin(t / 700 + i) * 3;
      g.lineStyle(10, i % 2 ? MANTLE : MANTLE_LIT, 0.95);
      g.lineBetween(x0, y0, x0 + Math.cos(a) * len * 0.3 + sway, y0 + len);
      g.fillStyle(GOLD, 0.7); g.fillCircle(x0 + Math.cos(a) * len * 0.3 + sway, y0 + len, 2.5);
    }
  } else if (ph === 1) {
    // Streaming in toward her, as everything does.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t / 900;
      const ph2 = ((t / 600) + i * 0.1) % 1;
      const r0 = r + 10 + (1 - ph2) * 34;
      g.lineStyle(7, i % 2 ? MANTLE : MANTLE_LIT, 0.4 + ph2 * 0.5);
      g.beginPath(); g.arc(s.x, s.y, r0, a, a + 0.5, false); g.strokePath();
    }
  } else if (ph === 2) {
    // Floating out on the high water like a jellyfish's bell.
    const pulse = 1 + Math.sin(t / 500) * 0.08;
    g.fillStyle(MANTLE, 0.45); g.fillEllipse(s.x, s.y + r * 0.35, r * 3.2 * pulse, r * 1.4 * pulse);
    g.lineStyle(3, MANTLE_LIT, 0.8); g.strokeEllipse(s.x, s.y + r * 0.35, r * 3.2 * pulse, r * 1.4 * pulse);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = s.x + Math.cos(a) * r * 1.6 * pulse, y = s.y + r * 0.35 + Math.sin(a) * r * 0.7 * pulse;
      g.lineStyle(2, KELP, 0.8); g.lineBetween(x, y, x + Math.sin(t / 300 + i) * 6, y + 16);
    }
  } else if (ph === 3) {
    // Spiral arms of mantle winding round her — she is the whirl.
    for (let arm = 0; arm < 3; arm++) {
      let px = s.x, py = s.y;
      for (let k = 1; k <= 14; k++) {
        const rr = r * 0.6 + k * 5;
        const a = t / 260 + arm * 2.09 + k * 0.32;
        const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr;
        g.lineStyle(9 - k * 0.5, arm % 2 ? MANTLE : MANTLE_LIT, 0.85);
        g.lineBetween(px, py, x, y);
        px = x; py = y;
      }
    }
  } else {
    // Dead calm: the mantle hangs dead straight, not a thread moving.
    for (let i = 0; i < 7; i++) {
      const x = s.x - r * 0.9 + (i * r * 1.8) / 6;
      g.lineStyle(8, i % 2 ? 0x4a5a5a : 0x6a7a7a, 0.9);
      g.lineBetween(x, s.y + r * 0.4, x, s.y + r * 1.6);
    }
  }

  // ── The pearl strand across her chest.
  if (ph <= 1) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.2 + (0.6 * i) / 8);
      const x = s.x + Math.cos(a) * r * 0.62, y = s.y + Math.sin(a) * r * 0.42 + r * 0.05;
      g.fillStyle(0x8a8078, 1); g.fillCircle(x, y, 3.6);
      g.fillStyle(PEARL, 1); g.fillCircle(x, y, 3);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 1, y - 1, 1);
    }
  } else if (ph === 2) {
    // Broken: the string hanging, three pearls left.
    g.lineStyle(1, GOLD, 0.8);
    g.lineBetween(s.x - r * 0.5, s.y + r * 0.2, s.x - r * 0.3, s.y + r * 0.62);
    g.lineBetween(s.x + r * 0.5, s.y + r * 0.2, s.x + r * 0.4, s.y + r * 0.5);
    for (const [dx, dy] of [[-0.42, 0.34], [-0.33, 0.52], [0.46, 0.32]]) {
      g.fillStyle(PEARL, 1); g.fillCircle(s.x + dx * r, s.y + dy * r, 3);
    }
  }

  // ── What she holds.
  const h = s.hands[0];
  if (h && ph <= 2) {
    // The trident: driftwood shaft, gold tines, a pearl at the crossing.
    const a = s.facing;
    const len = r * 2.0;
    const hx = h.x + Math.cos(a) * len, hy = h.y + Math.sin(a) * len;
    const bx = h.x - Math.cos(a) * r * 0.6, by = h.y - Math.sin(a) * r * 0.6;
    g.lineStyle(6, 0x3a2a1a, 1); g.lineBetween(bx, by, hx, hy);
    g.lineStyle(2, 0x8a6a4a, 1); g.lineBetween(bx, by, hx, hy);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const cx = h.x + Math.cos(a) * len * 0.86, cy = h.y + Math.sin(a) * len * 0.86;
    g.lineStyle(3, GOLD, 1); g.lineBetween(cx + nx * 10, cy + ny * 10, cx - nx * 10, cy - ny * 10);
    for (const k of [-1, 0, 1]) {
      const sx = cx + nx * 10 * k, sy = cy + ny * 10 * k;
      const ex = sx + Math.cos(a) * (k === 0 ? 22 : 15), ey = sy + Math.sin(a) * (k === 0 ? 22 : 15);
      g.lineStyle(3, GOLD, 1); g.lineBetween(sx, sy, ex, ey);
      g.fillStyle(lit(GOLD, 0.3), 1); g.fillTriangle(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, ex + nx * 3, ey + ny * 3, ex - nx * 3, ey - ny * 3);
    }
    g.fillStyle(PEARL, 1); g.fillCircle(cx, cy, 4.5 + s.castGlow * 2);
    if (s.castGlow > 0.3) { g.fillStyle(SEA_LIT, 0.2 * s.castGlow); g.fillCircle(hx, hy, 22); }
  } else if (h && ph >= 4) {
    // The sounding-line, hanging dead still from her hand.
    g.lineStyle(1.5, 0xc8b088, 0.9); g.lineBetween(h.x, h.y, h.x, h.y + r * 1.4);
    for (let k = 1; k < 4; k++) { g.fillStyle(0xc8b088, 1); g.fillCircle(h.x, h.y + (r * 1.4 * k) / 4, 2); }
    g.fillStyle(0x4a5058, 1); g.fillRoundedRect(h.x - 5, h.y + r * 1.4, 10, 16, 3);
  }

  // ── The crown: white coral branching up off a gold band, pearls on the tips.
  const top = s.y - r - 2;
  const tilt = ph === 3 ? Math.sin(t / 300) * 0.25 : 0;
  const w = r * 1.2;
  const bandCol = ph >= 4 ? 0x9aa0a0 : GOLD;
  const coral = ph >= 4 ? 0xd8dede : ph === 3 ? 0xc8f0f0 : 0xf4ece0;
  const P = (u: number, v: number) => ({ x: s.x + u * Math.cos(tilt) - v * Math.sin(tilt), y: top + u * Math.sin(tilt) + v * Math.cos(tilt) });
  const b0 = P(-w / 2, 0), b1 = P(w / 2, 0);
  g.lineStyle(8, dim(bandCol, 0.5), 1); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.lineStyle(5, bandCol, 1); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  const tines = [-0.42, -0.21, 0, 0.21, 0.42];
  tines.forEach((u, i) => {
    const hgt = (i === 2 ? 34 : i % 2 ? 22 : 28) + (s.enraged ? 4 : 0);
    const base = P(u * w, -2);
    const tip = P(u * w * 1.25, -hgt);
    g.lineStyle(5, dim(coral, 0.35), 1); g.lineBetween(base.x, base.y, tip.x, tip.y);
    g.lineStyle(3, coral, 1); g.lineBetween(base.x, base.y, tip.x, tip.y);
    // A fork two-thirds up each tine.
    const fk = P(u * w * 1.15, -hgt * 0.62);
    for (const side of [-1, 1]) {
      const ft = P(u * w * 1.15 + side * 7, -hgt * 0.62 - 9);
      g.lineStyle(2, coral, 1); g.lineBetween(fk.x, fk.y, ft.x, ft.y);
      g.fillStyle(coral, 1); g.fillCircle(ft.x, ft.y, 1.8);
    }
    g.fillStyle(0x8a8078, 1); g.fillCircle(tip.x, tip.y, 4);
    g.fillStyle(ph >= 4 ? 0xd8dede : PEARL, 1); g.fillCircle(tip.x, tip.y, 3.3);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(tip.x - 1, tip.y - 1, 1.1);
  });
  // The whirlpool jewel at the brow.
  const j = P(0, -2);
  g.fillStyle(SEA_DARK, 1); g.fillCircle(j.x, j.y, 7);
  g.lineStyle(1.5, ph >= 4 ? 0xe8f0f0 : SEA_LIT, 1);
  g.beginPath();
  for (let k = 0; k <= 14; k++) {
    const a = (k / 14) * Math.PI * 3.4 + (ph === 3 ? t / 120 : t / 900);
    const rr = 6 * (1 - k / 15);
    const x = j.x + Math.cos(a) * rr, y = j.y + Math.sin(a) * rr;
    if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  // In the calm, the crown drips.
  if (ph >= 4) {
    for (let i = 0; i < 3; i++) {
      const p = ((t / 1600) + i / 3) % 1;
      g.fillStyle(0xe8f0f0, 0.7 * (1 - p)); g.fillCircle(s.x - w / 3 + i * (w / 3), top + 6 + p * 26, 1.6);
    }
  }
  // Coral at her shoulders (all but the calm).
  if (ph < 4) {
    for (const side of [-1, 1]) {
      const sx = s.x + side * r * 0.9, sy = s.y - r * 0.45;
      g.lineStyle(4, CORAL, 0.95); g.lineBetween(sx, sy, sx + side * 10, sy - 12);
      g.lineStyle(3, CORAL, 0.95); g.lineBetween(sx + side * 10, sy - 12, sx + side * 18, sy - 14); g.lineBetween(sx + side * 10, sy - 12, sx + side * 8, sy - 22);
      g.fillStyle(lit(CORAL, 0.3), 1); g.fillCircle(sx + side * 18, sy - 14, 2.5); g.fillCircle(sx + side * 8, sy - 22, 2.5);
    }
  }
}

// ── Arena ────────────────────────────────────────────────────────────

/**
 * The throne room at the bottom of the maelstrom: a floor of mother-of-pearl, a sailcloth
 * runner up to the clam throne, the four tithe-stones set in the floor, the drowned asleep in
 * niches along both walls, and — round it all — the walls of the whirlpool itself, a cylinder
 * of turning water with the eye of the sky far, far above.
 */
function drawThroneRoom(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  const rng = mulberry(0x5ea5ea);
  g.fillStyle(0x020812, 1); g.fillRect(0, 0, W, H);
  nacre(g, 0, FT, W, H - FT, 30, rng);
  // A dim wash so the floor never out-shouts the fight.
  g.fillStyle(0x0a2030, 0.45); g.fillRect(0, FT, W, H - FT);
  // The sailcloth runner.
  g.fillStyle(0x0e1e2a, 1); g.fillRect(W / 2 - 50, THRONE.y + 30, 100, H - THRONE.y - 30);
  g.fillStyle(0x3a5a6e, 1); g.fillRect(W / 2 - 44, THRONE.y + 30, 88, H - THRONE.y - 30);
  g.lineStyle(1, 0x5a7a8a, 0.6);
  for (let y = THRONE.y + 40; y < H; y += 22) g.lineBetween(W / 2 - 44, y, W / 2 + 44, y);
  g.lineStyle(2, GOLD, 0.55);
  g.lineBetween(W / 2 - 38, THRONE.y + 30, W / 2 - 38, H); g.lineBetween(W / 2 + 38, THRONE.y + 30, W / 2 + 38, H);
  // The sigil in gold at the eye of the room.
  g.fillStyle(0x0a1418, 0.55); g.fillCircle(EYE.x, EYE.y, 96);
  maresaSigil(g, EYE.x, EYE.y, 80, 0x8a7a5a, 0.85);
  maresaSigil(g, EYE.x, EYE.y, 76, GOLD, 0.25);
  // The tithe-stone sockets.
  for (const p of PLINTHS) {
    g.fillStyle(0x000000, 0.5); g.fillEllipse(p.x, p.y + 6, 98, 34);
    g.fillStyle(0x2a3438, 1); g.fillEllipse(p.x, p.y + 4, 88, 28);
    g.lineStyle(2, GOLD, 0.4); g.strokeEllipse(p.x, p.y + 4, 88, 28);
    g.fillStyle(GOLD, 0.35); g.fillCircle(p.x, p.y + 4, 6);
  }
  // The clam throne round the anchor post.
  g.fillStyle(0x000000, 0.5); g.fillEllipse(THRONE.x, THRONE.y + 44, 300, 50);
  for (let k = 0; k < 15; k++) {
    const a0 = Math.PI + (k / 15) * Math.PI, a1 = Math.PI + ((k + 1) / 15) * Math.PI;
    g.fillStyle(k % 2 ? 0xe8c8b8 : 0xc8a090, 1);
    g.slice(THRONE.x, THRONE.y + 20, 128, a0, a1, false); g.fillPath();
  }
  g.lineStyle(2, 0x6a4a4a, 1);
  for (let k = 0; k <= 15; k++) {
    const a = Math.PI + (k / 15) * Math.PI;
    g.lineBetween(THRONE.x, THRONE.y + 20, THRONE.x + Math.cos(a) * 128, THRONE.y + 20 + Math.sin(a) * 128);
  }
  g.lineStyle(4, 0x6a4a4a, 1); g.beginPath(); g.arc(THRONE.x, THRONE.y + 20, 128, Math.PI, 0, false); g.strokePath();
  g.fillStyle(0x6a4a4a, 1); g.fillEllipse(THRONE.x, THRONE.y + 30, 260, 40);
  g.fillStyle(0xd8b8a8, 1); g.fillEllipse(THRONE.x, THRONE.y + 26, 248, 30);
  g.fillStyle(0xf0dcd0, 0.5); g.fillEllipse(THRONE.x - 40, THRONE.y + 22, 80, 8);
  // Pearl pillars either side of the throne.
  for (const x of [THRONE.x - 200, THRONE.x + 200]) {
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, THRONE.y + 40, 50, 14);
    for (let k = 0; k < 6; k++) {
      const y = THRONE.y + 30 - k * 20;
      g.fillStyle(0x8a8078, 1); g.fillCircle(x, y, 13);
      g.fillStyle(PEARL, 1); g.fillCircle(x, y, 11);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 4, y - 4, 3);
    }
  }
  // Niches of sleepers down both walls.
  for (const x of [30, W - 30]) {
    for (let y = FT + 120; y < H - 40; y += 120) {
      g.fillStyle(0x020608, 1); g.fillRoundedRect(x - 24, y - 52, 48, 54, { tl: 22, tr: 22, bl: 0, br: 0 });
      sleeperInBubble(g, x, y, 17, (x + y) * 0.01, [0xc8b098, 0xa88a70, 0xd8c0a8][Math.floor(y / 120) % 3], [0x5a4a6a, 0x3a5a5a, 0x6a3a3a][Math.floor(y / 120) % 3], 0);
    }
  }
  // The walls of the whirlpool — turning water standing round the room.
  for (let i = 0; i < 46; i++) {
    const left = i % 2 === 0;
    const x = left ? 4 + rng() * 10 : W - 14 + rng() * 10;
    const y = FT + rng() * (H - FT);
    g.lineStyle(2, FOAM, 0.15 + rng() * 0.2);
    g.lineBetween(x, y, x + (left ? 1 : -1) * 4, y + 30 + rng() * 40);
  }
  g.fillStyle(WATER, 0.18); g.fillRect(0, FT, 10, H - FT); g.fillRect(W - 10, FT, 10, H - FT);
  // The ceiling of the hall: the far-off eye of the maelstrom, a ring of light.
  g.fillStyle(0x061828, 1); g.fillRect(0, FT, W, 24);
  for (let x = 0; x < W; x += 40) {
    g.lineStyle(2, FOAM, 0.25); g.beginPath(); g.arc(x + 20, FT + 24, 18, Math.PI, Math.PI * 1.8, false); g.strokePath();
  }
  g.fillStyle(0xbff8ff, 0.04);
  for (let i = 0; i < 4; i++) g.fillTriangle(260 + i * 140, FT + 24, 320 + i * 140, FT + 24, 300 + i * 150, H);
}

// ── The def ──────────────────────────────────────────────────────────

export const MARESA_BOSS: WorldBossDef = {
  worldId: 'isle:maresa',
  name: 'Queen Maresa Undertow',
  title: 'Sovereign of the Drowned Reach',
  color: SEA_MAIN,
  colorLit: SEA_LIT,
  colorDark: SEA_DARK,
  accent: GOLD,
  damageMult: 1.25,

  intro: [
    'You have walked on my sea floor in dry boots. Do you know what that costs, on my isle?',
    'Six of my children, broken. Every lever, pulled. Every keeper, beaten. And still you are dry.',
    'Pay the tithe, little landsman. One coin. One head.',
  ],
  banter: [
    'The tide comes in when I say. The tide goes out when you pay.',
    'They are not dead. They are ballast. A crown this heavy needs something under it.',
    'Ebb was always the soft one. He let them keep their doorsteps.',
    'I did not drown them. I simply declined to give them their floors back.',
    'Every coin on the Reach has been under my water once.',
    'The sea is not cruel. It is only owed.',
    'Hold your breath. Everybody holds their breath, for me.',
    'Lanternjaw kept the dark for me. I keep the deep for myself.',
  ],
  defeatLine: 'THE TIDE GOES OUT',
  resumeLine: 'Back on my floor. The sea does not get tired of you. Neither do I.',

  phases: [
    {
      name: 'The Dry Tithe',
      line: 'Twice a day I let the sea in. Today, I think, three times.',
      hp: 500,
      cycle: ['sig:tide', 'volley', 'sig:shells', 'radial', 'sig:houses', 'lanes', 'sig:shells', 'sig:tide', 'barrage', 'sig:houses'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'The Undertow',
      line: 'Come here. Everything comes to me in the end. Everything.',
      hp: 540,
      cycle: ['sig:undertow', 'sig:ballast', 'volley', 'sig:anchor', 'spiral', 'sig:undertow', 'sig:anchor', 'homing', 'sig:ballast', 'slamchain'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1100,
      harassMs: 3100,
    },
    {
      name: 'High Water',
      line: 'Then let it all go under. The whole hall. You can float, or you can pay.',
      hp: 580,
      cycle: ['sig:highwater', 'sig:wave', 'sig:pearls', 'barrage', 'sig:wave', 'radial', 'sig:highwater', 'sig:pearls', 'lanes', 'sig:wave'],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1050,
      harassMs: 3000,
    },
    {
      name: 'The Maelstrom',
      line: 'I am the sea at the bottom of the sea. Turn with me. Turn, and turn, and go down.',
      hp: 620,
      cycle: ['sig:maelstrom', 'sig:spouts', 'sig:chorus', 'spiral', 'sig:maelstrom', 'sig:spouts', 'quake', 'sig:chorus', 'sanctuary'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 950,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'THE SEA REMEMBERS EVERY DEBT',
    extraPhase: {
      name: 'Dead Calm',
      line: '...hush. No wind. No tide. No one moves on my sea without my leave.',
      hp: 480,
      cycle: ['sig:becalm', 'sig:fathom', 'sig:glass', 'volley', 'sig:fathom', 'sig:glass', 'sig:becalm', 'homing', 'sig:glass', 'sweep'],
      harass: ['h-rune', 'h-lane'],
      restMs: 900,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 18 },
    lanes: { halfW: 30 },
  },

  signatures: {
    tide: dryTithe,
    shells: collectorShells,
    houses: leftUnder,
    undertow,
    ballast: ballastRises,
    anchor: crownsAnchor,
    highwater: highWater,
    wave: rogueWave,
    pearls: brokenStrand,
    maelstrom,
    spouts: waterspouts,
    chorus: drownedChorus,
    becalm: deadCalm,
    glass: seaOfGlass,
    fathom: soundingLine,
  },

  look: { crest: 'none', pattern: 'scales', aura: 'bubbles', hands: 'orb', torsoR: 42, mouth: 'line', eyes: 2, eyeColor: PEARL },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'none', tint: 'cold', look: { pattern: 'swirl', hands: 'claw' } },
    { movement: 'stalk', gimmick: 'none', look: { pattern: 'drip', aura: 'bubbles', hands: 'orb' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { pattern: 'swirl', aura: 'frost', hands: 'wisp', mouth: 'maw', eyes: 3 } },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { pattern: 'smooth', aura: 'none', hands: 'ball', eyes: 1, torsoR: 38 } },
  ],

  drawDecor: drawMaresa,
  drawArena: drawThroneRoom,
};
