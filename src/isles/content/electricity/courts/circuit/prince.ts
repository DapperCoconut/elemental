import type Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { segText, valve } from './art';
import {
  BYTE, BYTE_DARK, BYTE_LIT, CARD, CARD_DARK, COPPER, FAULT, FILAMENT, FILAMENT_LIT, GASGLOW, GOLD, GOLD_DARK, GOLD_LIT,
  NIXIE, SILK,
} from './palette';
import { bits, clamp, dist, hex } from './util';

/**
 * Prince Byte, the Reckoner — Empress Ohmrine's son, governor of the Circuit Court.
 *
 * Byte was given to the Tabulator to raise. His mother wanted a son who could reckon the Draw
 * without favour, and the machine taught him that a house is a number and a number is never
 * sorry. He runs the court to the last digit and has never once been wrong. He fights like a
 * program running:
 *
 * • **Compile** (anchored at his console): the floor is a grid of bits. He compiles a pattern —
 *   every 1 strikes — and then its inverse, so the only safe tiles the second time are the ones
 *   that just struck; a shift register walks a column of 1s across the floor with a two-tile gap
 *   for a carry; and he routes packets at you that travel like current, along x then turning on y.
 * • **Overclock** (rushing, the hot tint): he runs faster and faster. He forks subroutine drones
 *   that hang about the room and copy his every jump — when he dashes, each of them dashes the same
 *   vector from where it is; and each time he overclocks the clock multiplier rises and everything
 *   he does gets quicker.
 * • **Kernel Panic** (hard, blinking): the arena reboots region by region — a region's boot bar
 *   fills and whatever is inside when it completes is struck — and a great pointer drags a
 *   selection box after you and deletes whatever is in it.
 */

const TOP = 96;
const W = 960;
const H = 640;
const GC = 12;
const GR = 7;
const TW = W / GC;
const TH = (H - TOP) / GR;

const tileOf = (x: number, y: number): [number, number] => [clamp(Math.floor(x / TW), 0, GC - 1), clamp(Math.floor((y - TOP) / TH), 0, GR - 1)];
const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

/** Overclock state the decor reads (the fan on his back spins with it). */
let decorClock = 1;

/** State the Overclock signatures share within one fight: the forked drones and the clock. */
interface Drone {
  x: number; y: number; ang: number; born: number; nextShot: number; id: number;
  dash: { fx: number; fy: number; tx: number; ty: number; startAt: number; arriveAt: number; dealt: boolean; warnAt: number } | null;
}
interface Shared { drones: Drone[]; clock: number; nextId: number }
const SHARED = new WeakMap<BossToolkit, Shared>();
function shared(tk: BossToolkit): Shared {
  let s = SHARED.get(tk);
  if (!s) { s = { drones: [], clock: 1, nextId: 1 }; SHARED.set(tk, s); }
  return s;
}

/** A tile's rect. */
const tile = (c: number, r: number) => ({ x: c * TW, y: TOP + r * TH, w: TW, h: TH });

/** Paint one bit tile: a dark cell with its digit, glowing toward a strike. */
function bitTile(g: Phaser.GameObjects.Graphics, c: number, r: number, one: boolean, k: number, color: number): void {
  const t = tile(c, r);
  if (one) {
    g.fillStyle(color, 0.08 + k * 0.3); g.fillRect(t.x + 3, t.y + 3, t.w - 6, t.h - 6);
    g.lineStyle(2, color, 0.3 + k * 0.6); g.strokeRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8);
    segText(g, t.x + t.w / 2 - 7, t.y + t.h / 2 - 12, '1', 24, lit(color, k * 0.5), 0.35 + k * 0.6);
  } else {
    segText(g, t.x + t.w / 2 - 7, t.y + t.h / 2 - 12, '0', 24, color, 0.12);
  }
}

// ── Signature: Compile ───────────────────────────────────────────────
// A random pattern of 1s strikes; then its inverse. Stand on a 0 for the first, step onto a tile
// that just struck for the second.

interface Pass { mask: boolean[]; warnAt: number; fireAt: number; dealt: boolean }

const compile = (tk: BossToolkit): SignatureMove => {
  let passes: Pass[] = [];
  const DMG = 14;
  return {
    durationMs: 2500,
    windupMs: 600,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'COMPILE',
    cast(time) {
      const mask = Array.from({ length: GC * GR }, () => Math.random() < 0.46);
      // Never leave the player boxed in: a 0 on their tile or a neighbour.
      const [pc, pr] = tileOf(tk.player.x, tk.player.y);
      const near: number[] = [];
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        const c = pc + dc, r = pr + dr;
        if (c >= 0 && c < GC && r >= 0 && r < GR) near.push(r * GC + c);
      }
      if (near.every((i) => mask[i])) mask[near[Math.floor(Math.random() * near.length)]] = false;
      const w1 = tk.warn(1150), w2 = tk.warn(1000);
      passes = [
        { mask, warnAt: time, fireAt: time + w1, dealt: false },
        { mask: mask.map((b) => !b), warnAt: time + w1, fireAt: time + w1 + w2, dealt: false },
      ];
      tk.sfx('glitch');
    },
    update(time) {
      for (const p of passes) {
        if (p.dealt || time < p.fireAt) continue;
        p.dealt = true;
        tk.sfx('zap');
        if (!alivePlayer(tk)) continue;
        const [c, r] = tileOf(tk.player.x, tk.player.y);
        if (p.mask[r * GC + c]) tk.hitPlayer(DMG, tk.player.x, tk.player.y);
      }
      passes = passes.filter((p) => !p.dealt || time < p.fireAt + 350);
    },
    drawGround(g, time) {
      for (const p of passes) {
        if (time < p.warnAt) continue;
        if (p.dealt) {
          const k = clamp((time - p.fireAt) / 350, 0, 1);
          for (let i = 0; i < p.mask.length; i++) {
            if (!p.mask[i]) continue;
            const t = tile(i % GC, Math.floor(i / GC));
            g.fillStyle(BYTE_LIT, 0.55 * (1 - k)); g.fillRect(t.x + 2, t.y + 2, t.w - 4, t.h - 4);
          }
          continue;
        }
        const k = clamp((time - p.warnAt) / Math.max(1, p.fireAt - p.warnAt), 0, 1);
        for (let i = 0; i < p.mask.length; i++) bitTile(g, i % GC, Math.floor(i / GC), p.mask[i], k, BYTE);
      }
    },
    onPhaseEnd() { passes = []; },
  };
};

// ── Signature: Shift Register ────────────────────────────────────────
// A column of 1s walks across the floor one column a beat, with a two-tile gap — the carry — that
// drifts a row now and then. Be in the gap when the column reaches you.

const shift = (tk: BossToolkit): SignatureMove => {
  let col = -1;
  let dir = 1;
  let gap = 0;
  let stepAt = 0;
  let firstAt = 0;
  let gaps: number[] = [];
  const STEP = 250;
  const DMG = 12;
  const active = () => col >= 0 && col < GC;
  return {
    durationMs: 1400,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'SHIFT REGISTER',
    cast(time) {
      dir = tk.player.x > W / 2 ? 1 : -1;
      col = dir > 0 ? 0 : GC - 1;
      gap = clamp(tileOf(tk.player.x, tk.player.y)[1] - (Math.random() < 0.5 ? 1 : 0), 0, GR - 2);
      // Plan the whole carry path now, so the telegraph can show the next column's gap.
      gaps = [];
      let gg = gap;
      for (let i = 0; i < GC; i++) { gaps.push(gg); if (i % 2 === 1) gg = clamp(gg + (Math.random() < 0.5 ? -1 : 1), 0, GR - 2); }
      firstAt = time + tk.warn(950);
      stepAt = firstAt;
      tk.sfx('clock-tick');
    },
    update(time) {
      if (!active() || time < stepAt) return;
      const i = dir > 0 ? col : GC - 1 - col;
      const gp = gaps[i] ?? 0;
      if (alivePlayer(tk)) {
        const [pc, pr] = tileOf(tk.player.x, tk.player.y);
        if (pc === col && pr !== gp && pr !== gp + 1) tk.hitPlayer(DMG, tk.player.x, tk.player.y);
      }
      tk.sfx('clock-tick');
      col += dir;
      stepAt = time + STEP;
    },
    drawGround(g, time) {
      if (!active()) return;
      const warming = time < firstAt;
      const k = warming ? clamp(1 - (firstAt - time) / 950, 0, 1) : 1;
      // The column about to strike, and a ghost of the next.
      for (const [cc, a] of [[col, 1], [col + dir, 0.35]] as [number, number][]) {
        if (cc < 0 || cc >= GC) continue;
        const i = dir > 0 ? cc : GC - 1 - cc;
        const gp = gaps[i] ?? 0;
        for (let r = 0; r < GR; r++) {
          const one = r !== gp && r !== gp + 1;
          if (!one) {
            const t = tile(cc, r);
            g.lineStyle(2, GOLD_LIT, 0.5 * a); g.strokeRect(t.x + 6, t.y + 6, t.w - 12, t.h - 12);
            segText(g, t.x + t.w / 2 - 7, t.y + t.h / 2 - 12, 'C', 24, GOLD_LIT, 0.6 * a);
            continue;
          }
          bitTile(g, cc, r, true, (warming ? k * 0.7 : 0.6 + 0.4 * clamp(1 - (stepAt - time) / STEP, 0, 1)) * a, FILAMENT);
        }
      }
      // The trail of already-shifted columns, fading.
      for (let back = 1; back <= 3; back++) {
        const cc = col - dir * back;
        if (cc < 0 || cc >= GC || warming) continue;
        const t = tile(cc, 0);
        g.fillStyle(FILAMENT, 0.1 / back); g.fillRect(t.x, TOP, TW, H - TOP);
      }
    },
    onPhaseEnd() { col = -1; },
  };
};

// ── Signature: Packet Routing ────────────────────────────────────────
// Packets leave him and travel like current on a board: along x to your column, then a hard
// 90° turn down y. Their routes are drawn first as dotted traces.

interface Packet { sx: number; sy: number; cx: number; ex: number; ey: number; launchAt: number; d: number; total: number; dealt: boolean; bits: string }

const packet = (tk: BossToolkit): SignatureMove => {
  let packets: Packet[] = [];
  const DMG = 9;
  return {
    durationMs: 1700,
    windupMs: 450,
    gesture: 'point',
    tell: 'ROUTE',
    cast(time) {
      const n = tk.hard ? 7 : 5;
      const sx = tk.bossX, sy = tk.bossY;
      const px = tk.player.x, py = tk.player.y;
      packets = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 64;
        const cx = clamp(px + off, 40, W - 40);
        const down = py >= sy ? 1 : -1;
        const ey = down > 0 ? H - 10 : TOP + 10;
        const total = Math.abs(cx - sx) + Math.abs(ey - sy);
        packets.push({ sx, sy, cx, ex: cx, ey, launchAt: time + tk.warn(750) + i * 150, d: 0, total, dealt: false, bits: bits(Math.floor(Math.random() * 256)) });
      }
      tk.sfx('drone-buzz');
    },
    update(time, dt) {
      const clockMul = shared(tk).clock;
      for (const p of packets) {
        if (time < p.launchAt || p.d >= p.total) continue;
        p.d += 340 * clockMul * dt;
        const pos = where(p);
        if (!p.dealt && alivePlayer(tk) && dist(pos.x, pos.y, tk.player.x, tk.player.y) < 26) {
          p.dealt = true;
          tk.hitPlayer(DMG, pos.x, pos.y);
        }
      }
      packets = packets.filter((p) => p.d < p.total && !p.dealt);
    },
    drawGround(g, time) {
      for (const p of packets) {
        if (p.d > 0) continue;
        const k = clamp(1 - (p.launchAt - time) / 750, 0, 1);
        // The route: dotted along x, a corner pad, dotted down y.
        g.fillStyle(BYTE, 0.2 + k * 0.5);
        const step = 14;
        for (let x = Math.min(p.sx, p.cx); x <= Math.max(p.sx, p.cx); x += step) g.fillRect(x - 2, p.sy - 2, 4, 4);
        for (let y = Math.min(p.sy, p.ey); y <= Math.max(p.sy, p.ey); y += step) g.fillRect(p.cx - 2, y - 2, 4, 4);
        g.lineStyle(2, BYTE_LIT, 0.3 + k * 0.5); g.strokeRect(p.cx - 7, p.sy - 7, 14, 14);
      }
    },
    drawAir(g) {
      for (const p of packets) {
        if (p.d <= 0) continue;
        const pos = where(p);
        // A packet: a header square and its payload bits trailing behind.
        const back = backDir(p);
        for (let i = 0; i < 8; i++) {
          const bx = pos.x + back.x * (12 + i * 7), by = pos.y + back.y * (12 + i * 7);
          g.fillStyle(p.bits[i] === '1' ? BYTE_LIT : BYTE_DARK, 0.9 - i * 0.09); g.fillRect(bx - 2.5, by - 2.5, 5, 5);
        }
        g.fillStyle(BYTE, 0.25); g.fillCircle(pos.x, pos.y, 14);
        g.fillStyle(0x062010, 1); g.fillRect(pos.x - 8, pos.y - 8, 16, 16);
        g.lineStyle(2, BYTE_LIT, 1); g.strokeRect(pos.x - 8, pos.y - 8, 16, 16);
        g.fillStyle(BYTE_LIT, 1); g.fillRect(pos.x - 3, pos.y - 3, 6, 6);
      }
    },
    onPhaseEnd() { packets = []; },
  };
  function where(p: Packet): { x: number; y: number } {
    const leg1 = Math.abs(p.cx - p.sx);
    if (p.d < leg1) return { x: p.sx + Math.sign(p.cx - p.sx) * p.d, y: p.sy };
    return { x: p.cx, y: p.sy + Math.sign(p.ey - p.sy) * (p.d - leg1) };
  }
  function backDir(p: Packet): { x: number; y: number } {
    const leg1 = Math.abs(p.cx - p.sx);
    if (p.d < leg1) return { x: -Math.sign(p.cx - p.sx), y: 0 };
    return { x: 0, y: -Math.sign(p.ey - p.sy) };
  }
};

// ── Signature: Fork ──────────────────────────────────────────────────
// He forks two subroutine drones (four at most). They hang about the room on their own orbits,
// fire a single bit at you now and then — and copy every Jump he makes. This move's update runs
// the drones for the whole phase.

const fork = (tk: BossToolkit): SignatureMove => {
  const S = shared(tk);
  const LIFE = 15000;
  return {
    durationMs: 900,
    windupMs: 500,
    gesture: 'clap',
    tell: 'FORK()',
    cast(time) {
      for (const k of [-1, 1]) {
        if (S.drones.length >= 4) break;
        S.drones.push({
          x: tk.clampX(tk.bossX + k * 70), y: tk.clampY(tk.bossY - 30), ang: Math.atan2(tk.bossY - tk.player.y, tk.bossX - tk.player.x) + k * 1.2,
          born: time, nextShot: time + 1600, id: S.nextId++, dash: null,
        });
      }
      tk.sfx('drone-buzz');
    },
    update(time, dt) {
      const p = tk.player;
      for (let i = S.drones.length - 1; i >= 0; i--) {
        const d = S.drones[i];
        if (time - d.born > LIFE) { tk.boom(d.x, d.y, 30, BYTE); S.drones.splice(i, 1); continue; }
        if (d.dash) {
          const dsh = d.dash;
          if (time >= dsh.startAt) {
            const k = clamp((time - dsh.startAt) / Math.max(1, dsh.arriveAt - dsh.startAt), 0, 1);
            d.x = dsh.fx + (dsh.tx - dsh.fx) * k; d.y = dsh.fy + (dsh.ty - dsh.fy) * k;
            if (!dsh.dealt && alivePlayer(tk) && dist(d.x, d.y, p.x, p.y) < 40) { dsh.dealt = true; tk.hitPlayer(10, p.x, p.y); }
            if (k >= 1) d.dash = null;
          }
          continue;
        }
        // Drift on an orbit round the player.
        d.ang += dt * 0.5 * S.clock;
        const tx = tk.clampX(p.x + Math.cos(d.ang) * 250), ty = tk.clampY(p.y + Math.sin(d.ang) * 220);
        d.x += (tx - d.x) * Math.min(1, dt * 1.4); d.y += (ty - d.y) * Math.min(1, dt * 1.4);
        if (time >= d.nextShot) {
          d.nextShot = time + 2600 / S.clock;
          tk.spawnBullet({ x: d.x, y: d.y, angle: tk.angleToPlayer(d.x, d.y), speed: 230, damage: 7, r: 5, lifeMs: 3500, color: BYTE_LIT });
          tk.sfx('zap');
        }
      }
    },
    drawGround(g, time) {
      for (const d of S.drones) {
        const dsh = d.dash;
        if (!dsh || time >= dsh.startAt) continue;
        const k = clamp((time - dsh.warnAt) / Math.max(1, dsh.startAt - dsh.warnAt), 0, 1);
        const a = Math.atan2(dsh.ty - dsh.fy, dsh.tx - dsh.fx);
        const px = -Math.sin(a) * 20, py = Math.cos(a) * 20;
        g.fillStyle(BYTE, 0.08 + k * 0.2);
        g.fillPoints([
          { x: dsh.fx + px, y: dsh.fy + py }, { x: dsh.tx + px, y: dsh.ty + py }, { x: dsh.tx - px, y: dsh.ty - py }, { x: dsh.fx - px, y: dsh.fy - py },
        ] as Phaser.Geom.Point[], true);
        g.lineStyle(1.5, BYTE_LIT, 0.3 + k * 0.6); g.lineBetween(dsh.fx, dsh.fy, dsh.tx, dsh.ty);
      }
    },
    drawAir(g, time) {
      for (const d of S.drones) {
        const bob = Math.sin(time / 180 + d.id) * 3;
        const x = d.x, y = d.y + bob;
        // A subroutine: a small valve-headed copy of him on a buzzing rotor, its number on a tag.
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 26, 26, 8);
        const rot = time / 30;
        g.lineStyle(2, dim(BYTE, 0.2), 0.8);
        g.lineBetween(x - Math.cos(rot) * 16, y - 18 - Math.sin(rot) * 3, x + Math.cos(rot) * 16, y - 18 + Math.sin(rot) * 3);
        g.fillStyle(BYTE_DARK, 1); g.fillCircle(x, y, 11);
        g.fillStyle(BYTE, 1); g.fillCircle(x, y, 9);
        g.fillStyle(0x041008, 1); g.fillRoundedRect(x - 7, y - 3, 14, 6, 2);
        g.fillStyle(BYTE_LIT, 1); g.fillRect(x - 5 + ((time / 60) % 10), y - 1, 2, 2);
        valve(g, x, y - 8, 0.4, 0.9);
        segText(g, x - 10, y + 13, '0' + (d.id % 10), 7, SILK, 0.7);
        if (d.dash) { g.lineStyle(2, BYTE_LIT, 0.5); g.strokeCircle(x, y, 16); }
      }
    },
    onPhaseEnd() { S.drones = []; },
  };
};

// ── Signature: Jump ──────────────────────────────────────────────────
// He dashes through you — and every drone he has forked copies the jump, the same vector from
// wherever it hangs, all at once. A volley of parallel dashes.

const jump = (tk: BossToolkit): SignatureMove => {
  const S = shared(tk);
  return {
    durationMs: 1300,
    windupMs: 450,
    gesture: 'flex',
    hold: 'charge',
    tell: 'JMP',
    cast(time) {
      const a = tk.angleToPlayer();
      const reach = clamp(dist(tk.bossX, tk.bossY, tk.player.x, tk.player.y) + 150, 260, 620);
      const vx = Math.cos(a) * reach, vy = Math.sin(a) * reach;
      const warn = tk.warn(800);
      const travel = 380 / S.clock;
      tk.spawnCharge({ toX: tk.bossX + vx, toY: tk.bossY + vy, warnMs: 800, travelMs: travel, halfW: 26, damage: 14 });
      for (const d of S.drones) {
        if (d.dash) continue;
        d.dash = {
          fx: d.x, fy: d.y, tx: tk.clampX(d.x + vx, 50), ty: tk.clampY(d.y + vy, 50),
          warnAt: time, startAt: time + warn, arriveAt: time + warn + travel, dealt: false,
        };
      }
      tk.sfx('dash');
    },
  };
};

// ── Signature: Overclock ─────────────────────────────────────────────
// The clock goes up a notch (×1.2 each, to ×2): packets, drones and jumps all get quicker. The
// heat vents off him in a ring with a gap right where you stand — so stand.

const overclock = (tk: BossToolkit): SignatureMove => {
  const S = shared(tk);
  let ventAt = -1;
  return {
    durationMs: 1200,
    windupMs: 700,
    gesture: 'flex',
    hold: 'brace',
    tell: 'OVERCLOCK',
    cast(time) {
      S.clock = Math.min(2, Math.round((S.clock + 0.2) * 10) / 10);
      decorClock = S.clock;
      ventAt = time;
      tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: 450, speed: 300, gapCentre: tk.angleToPlayer(), gapHalf: 0.55, band: 18, damage: 11 });
      tk.sfx('engine');
    },
    drawAir(g, time) {
      if (ventAt < 0 || time - ventAt > 1200) return;
      const k = (time - ventAt) / 1200;
      // Heat shimmer and the new clock rate over his head.
      for (let i = 0; i < 6; i++) {
        const x = tk.bossX - 30 + i * 12, y = tk.bossY - 60 - k * 50;
        g.lineStyle(2, FILAMENT, (1 - k) * 0.6);
        g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x + 4, y + 10); g.lineTo(x - 2, y); g.strokePath();
      }
      segText(g, tk.bossX - 24, tk.bossY - 100 - k * 20, 'X' + S.clock.toFixed(1), 16, NIXIE, 1 - k);
    },
    onPhaseEnd() { S.clock = 1; decorClock = 1; ventAt = -1; },
  };
};

// ── Signature: Reboot (hard) ─────────────────────────────────────────
// The room reboots in regions (3×2). A region's boot bar fills; whatever is in it as the bar
// completes is struck. Three regions go, one after another — yours first.

interface Region { c: number; r: number; warnAt: number; fireAt: number; dealt: boolean; seed: number }

const reboot = (tk: BossToolkit): SignatureMove => {
  let regions: Region[] = [];
  const RW = W / 3, RH = (H - TOP) / 2;
  const DMG = 16;
  const inRegion = (rg: Region, x: number, y: number) => x >= rg.c * RW && x < (rg.c + 1) * RW && y >= TOP + rg.r * RH && y < TOP + (rg.r + 1) * RH;
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'slam',
    tell: 'KERNEL PANIC',
    cast(time) {
      const pc = clamp(Math.floor(tk.player.x / RW), 0, 2), pr = clamp(Math.floor((tk.player.y - TOP) / RH), 0, 1);
      const all: [number, number][] = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) if (c !== pc || r !== pr) all.push([c, r]);
      all.sort(() => Math.random() - 0.5);
      const order: [number, number][] = [[pc, pr], all[0], all[1]];
      regions = order.map(([c, r], i) => {
        const warnAt = time + i * 650;
        return { c, r, warnAt, fireAt: warnAt + tk.warn(1350), dealt: false, seed: Math.floor(Math.random() * 0xffff) };
      });
      tk.sfx('glitch');
    },
    update(time) {
      for (const rg of regions) {
        if (rg.dealt || time < rg.fireAt) continue;
        rg.dealt = true;
        tk.sfx('explosion-small');
        if (alivePlayer(tk) && inRegion(rg, tk.player.x, tk.player.y)) tk.hitPlayer(DMG, tk.player.x, tk.player.y);
      }
      regions = regions.filter((rg) => !rg.dealt || time < rg.fireAt + 500);
    },
    drawGround(g, time) {
      for (const rg of regions) {
        if (time < rg.warnAt) continue;
        const x = rg.c * RW, y = TOP + rg.r * RH;
        if (rg.dealt) {
          const k = clamp((time - rg.fireAt) / 500, 0, 1);
          g.fillStyle(k < 0.3 ? 0xffffff : 0x000000, (k < 0.3 ? 0.6 : 0.5) * (1 - k)); g.fillRect(x, y, RW, RH);
          continue;
        }
        const k = clamp((time - rg.warnAt) / Math.max(1, rg.fireAt - rg.warnAt), 0, 1);
        // A boot screen: blue panel, scrolling hex, and the progress bar.
        g.fillStyle(0x1a3aa0, 0.18 + k * 0.22); g.fillRect(x + 2, y + 2, RW - 4, RH - 4);
        g.lineStyle(2, 0x8ab0ff, 0.5 + k * 0.4); g.strokeRect(x + 4, y + 4, RW - 8, RH - 8);
        const lines = Math.floor(k * 7);
        for (let i = 0; i < lines; i++) segText(g, x + 16, y + 16 + i * 18, hex(rg.seed * (i + 3)) + hex(rg.seed + i * 977, 4), 10, 0xcfe0ff, 0.6);
        const bw = RW - 60;
        g.fillStyle(0x000000, 0.6); g.fillRect(x + 30, y + RH - 34, bw, 14);
        g.fillStyle(k > 0.8 ? FAULT : 0xcfe0ff, 0.95); g.fillRect(x + 32, y + RH - 32, (bw - 4) * k, 10);
      }
    },
    onPhaseEnd() { regions = []; },
  };
};

// ── Signature: Drag Select (hard) ────────────────────────────────────
// A great pointer appears near you and drags a marching-ants selection box after you; when it lets
// go, everything in the box is deleted and it double-clicks where its tip rests.

const cursor = (tk: BossToolkit): SignatureMove => {
  let ax = 0, ay = 0, cx = 0, cy = 0;
  let dragUntil = -1, deleteAt = -1;
  let doneAt = -1;
  let clicked = false;
  const SPEED = 165;
  const box = () => ({ x0: Math.min(ax, cx), x1: Math.max(ax, cx), y0: Math.min(ay, cy), y1: Math.max(ay, cy) });
  return {
    durationMs: 1600,
    windupMs: 450,
    gesture: 'point',
    tell: 'SELECT',
    cast(time) {
      const a = Math.random() * Math.PI * 2;
      ax = tk.clampX(tk.player.x + Math.cos(a) * 240, 60); ay = tk.clampY(tk.player.y + Math.sin(a) * 200, 60);
      cx = ax; cy = ay;
      dragUntil = time + 2100;
      deleteAt = dragUntil + tk.warn(480);
      doneAt = -1;
      clicked = false;
      tk.sfx('blink');
    },
    update(time, dt) {
      if (dragUntil < 0) return;
      if (time < dragUntil && alivePlayer(tk)) {
        const a = Math.atan2(tk.player.y - cy, tk.player.x - cx);
        const d = dist(cx, cy, tk.player.x, tk.player.y);
        const step = Math.min(d, SPEED * dt);
        cx = tk.clampX(cx + Math.cos(a) * step, 30); cy = tk.clampY(cy + Math.sin(a) * step, 30);
      }
      if (time >= dragUntil && !clicked) {
        clicked = true;
        tk.spawnZone({ x: cx, y: cy, radius: 64, warnMs: 480, damage: 12 });
      }
      if (deleteAt > 0 && time >= deleteAt) {
        deleteAt = -1;
        doneAt = time;
        tk.sfx('glitch');
        const b = box();
        const p = tk.player;
        if (alivePlayer(tk) && p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1) tk.hitPlayer(15, p.x, p.y);
      }
      if (doneAt > 0 && time - doneAt > 450) dragUntil = -1;
    },
    drawGround(g, time) {
      if (dragUntil < 0) return;
      const b = box();
      if (doneAt > 0) {
        const k = clamp((time - doneAt) / 450, 0, 1);
        g.fillStyle(0xffffff, 0.45 * (1 - k)); g.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        return;
      }
      const armed = time >= dragUntil;
      g.fillStyle(armed ? FAULT : 0x8ab0ff, armed ? 0.16 + Math.sin(time / 50) * 0.06 : 0.1);
      g.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      // Marching ants.
      const ph = (time / 40) % 16;
      const ants = (x0: number, y0: number, x1: number, y1: number) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        for (let d = -ph; d < len; d += 16) {
          const s = Math.max(0, d), e = Math.min(len, d + 8);
          if (e <= s) continue;
          g.lineBetween(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len, x0 + ((x1 - x0) * e) / len, y0 + ((y1 - y0) * e) / len);
        }
      };
      g.lineStyle(2, armed ? FAULT : 0xffffff, 0.9);
      ants(b.x0, b.y0, b.x1, b.y0); ants(b.x1, b.y0, b.x1, b.y1); ants(b.x1, b.y1, b.x0, b.y1); ants(b.x0, b.y1, b.x0, b.y0);
      if (armed) segText(g, (b.x0 + b.x1) / 2 - 30, (b.y0 + b.y1) / 2 - 8, 'DEL', 18, FAULT, 0.9);
    },
    drawAir(g) {
      if (dragUntil < 0 || doneAt > 0) return;
      // The pointer: a huge white arrow with a black rim, its tip at (cx, cy).
      const s = 2.2;
      const pts = [[0, 0], [0, 22], [5, 17], [9, 26], [13, 24], [9, 16], [16, 16]].map(([x, y]) => ({ x: cx + x * s, y: cy + y * s }));
      g.fillStyle(0x000000, 0.3); g.fillPoints(pts.map((p) => ({ x: p.x + 4, y: p.y + 5 })) as Phaser.Geom.Point[], true);
      g.fillStyle(0x0a0a0a, 1); g.fillPoints(pts.map((p) => ({ x: p.x + (p.x - cx) * 0.08 - 1, y: p.y + (p.y - cy) * 0.08 - 1 })) as Phaser.Geom.Point[], true);
      g.fillStyle(0xffffff, 1); g.fillPoints(pts as Phaser.Geom.Point[], true);
    },
    onPhaseEnd() { dragUntil = -1; deleteAt = -1; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const BYTE_BOSS: WorldBossDef = {
  worldId: 'isle:byte',
  name: 'Prince Byte',
  title: 'the Reckoner',
  color: BYTE,
  colorLit: BYTE_LIT,
  colorDark: BYTE_DARK,
  accent: FILAMENT,
  // Tier 2 of Voltreach.
  damageMult: 1.2,

  intro: [
    'Visitor. Unregistered. No meter, no rating, no number. You are a rounding error.',
    'I have reckoned this court to the last ohm for nine years and I have never been wrong. Let me reckon you.',
  ],
  banter: [
    'A household is a number. A number does not need a name. Mother explained it very clearly.',
    'Off by one. Do you know what off by one costs a family? I do. I have the table.',
    'The Tabulator raised me. It never raised its voice. It never had to.',
    'Every time you dodge, I learn. Every time I learn, you are smaller.',
    'Do not take it personally. I do not have the routine for personal.',
  ],
  defeatLine: 'BYTE HALTS',
  resumeLine: 'Retry. Of course. I have logged the previous attempt. It was very instructive.',

  phases: [
    {
      name: 'Compile',
      line: 'Compiling. The floor is the program. You are standing in it.',
      hp: 470,
      cycle: [
        'sig:compile', 'volley', 'sig:packet', 'sig:shift', 'radial',
        'sig:compile', 'sig:packet', 'lanes', 'sig:shift',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Overclock',
      line: 'Raising the clock. Then raising it again. Mother says I was always a quick child.',
      hp: 550,
      cycle: [
        'sig:fork', 'sig:jump', 'sig:overclock', 'sig:packet', 'sig:jump',
        'barrage', 'sig:fork', 'sig:jump', 'sig:overclock', 'spiral',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'FATAL EXCEPTION IN MODULE BYTE',
    extraPhase: {
      name: 'Kernel Panic',
      line: 'Unhandled. Unhandled! Rebooting everything. Everything you are standing on first.',
      hp: 400,
      cycle: [
        'sig:reboot', 'sig:cursor', 'sig:compile', 'homing',
        'sig:reboot', 'sig:cursor', 'sig:shift', 'sweep',
      ],
      harass: ['h-mines', 'h-orbs'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 6, speed: 230, spreadRad: 0.55 },
    radial: { count: 16, speed: 190 },
    lanes: { count: 3, warnMs: 900 },
    barrage: { count: 10 },
    spiral: { arms: 4, speed: 175 },
    homing: { count: 3, speed: 170 },
  },

  signatures: { compile, shift, packet, fork, jump, overclock, reboot, cursor },

  look: {
    crest: 'antennae', pattern: 'grid', aura: 'glitch', hands: 'orb',
    torsoR: 32, mouth: 'grate', eyes: 1, eyeColor: BYTE_LIT,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'rush', gimmick: 'none', tint: 'hot', look: { aura: 'sparks', pattern: 'static', hands: 'blade', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { aura: 'glitch', pattern: 'static', eyes: 3, hands: 'wisp', mouth: 'stitch' } },
  ],

  /**
   * The Reckoner's tells. A crown of five valves stands on his head, filaments glowing; a cathode
   * visor runs across his face, a green trace scrolling on it; a ribbon of punched tape trails from
   * the back of his collar. Overclocked, the valves go white-hot and a cooling fan on his back
   * spins faster with every notch of the clock (its rate in nixie numerals over it). In Kernel
   * Panic the visor turns panic-blue, scrolling dump, the valves gutter one by one, and his body
   * tears into displaced scanline slices.
   */
  drawDecor(g, s) {
    if (s.phaseIdx !== 1) decorClock = 1;
    const R = s.radius;
    const over = s.phaseIdx === 1;
    const panic = s.hard && s.phaseIdx >= 2;
    const t = s.t;
    // Punched tape trailing behind, away from where he faces.
    const back = s.facing + Math.PI;
    let px = s.x + Math.cos(back) * R * 0.6, py = s.y - R * 0.4;
    for (let i = 0; i < 9; i++) {
      const nx = px + Math.cos(back) * 9 + Math.sin(t / 220 + i) * 2;
      const ny = py + 6 + Math.cos(t / 260 + i * 0.8) * 2;
      g.lineStyle(7, CARD_DARK, 1); g.lineBetween(px, py, nx, ny);
      g.lineStyle(5, CARD, 1); g.lineBetween(px, py, nx, ny);
      if (i % 2) { g.fillStyle(0x2a2420, 1); g.fillCircle((px + nx) / 2, (py + ny) / 2, 1.1); }
      px = nx; py = ny;
    }
    // The cooling fan on his back when overclocked.
    if (over) {
      const fx = s.x + Math.cos(back) * R * 0.75, fy = s.y - R * 0.1;
      g.fillStyle(0x1a1a1a, 1); g.fillCircle(fx, fy, R * 0.42);
      g.lineStyle(2, GOLD_DARK, 1); g.strokeCircle(fx, fy, R * 0.42);
      const spin = (t / 1000) * 14 * decorClock;
      for (let k = 0; k < 5; k++) {
        const a = spin + (k / 5) * Math.PI * 2;
        g.fillStyle(0x6a6a72, 0.9);
        g.fillTriangle(fx, fy, fx + Math.cos(a) * R * 0.38, fy + Math.sin(a) * R * 0.38, fx + Math.cos(a + 0.6) * R * 0.3, fy + Math.sin(a + 0.6) * R * 0.3);
      }
      g.fillStyle(GOLD, 1); g.fillCircle(fx, fy, 3);
      segText(g, fx - 12, fy - R * 0.42 - 16, 'X' + decorClock.toFixed(1), 9, NIXIE, 0.95);
    }
    // The visor.
    const vw = R * 1.5, vh = R * 0.46, vx = s.x - vw / 2, vy = s.y - R * 0.38;
    g.fillStyle(0x050807, 1); g.fillRoundedRect(vx - 2, vy - 2, vw + 4, vh + 4, 6);
    g.fillStyle(panic ? 0x1a3aa0 : 0x04140a, 1); g.fillRoundedRect(vx, vy, vw, vh, 5);
    if (panic) {
      for (let i = 0; i < 3; i++) segText(g, vx + 4, vy + 2 + i * (vh / 3), hex(Math.floor(t / 90) * 7919 + i * 313, 6), vh / 3.6, 0xcfe0ff, 0.85);
    } else {
      // A scrolling trace: a sine for Compile, a fast saw for Overclock.
      g.lineStyle(1.6, over ? FILAMENT_LIT : BYTE_LIT, 1);
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const xx = vx + 3 + (i / 24) * (vw - 6);
        const ph = i / 3 - t / (over ? 60 : 180);
        const yy = vy + vh / 2 + (over ? ((ph % 1) + 1) % 1 - 0.5 : Math.sin(ph)) * vh * 0.34;
        if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.strokePath();
    }
    g.fillStyle(0xffffff, 0.16); g.fillRect(vx + 3, vy + 2, vw - 6, 2);
    // The valve crown.
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.34;
      const bx = s.x + Math.cos(a) * R * 0.95, by = s.y + Math.sin(a) * R * 0.95;
      let heat = 0.75 + s.castGlow * 0.25;
      if (over) heat = 1;
      if (panic) heat = (Math.floor(t / 130) + k * 3) % 5 < 2 ? 0 : 0.8;
      if (over) { g.fillStyle(0xffffff, 0.12 + Math.sin(t / 40 + k) * 0.05); g.fillCircle(bx, by - 12, 10); }
      valve(g, bx, by, 0.72 + (k === 2 ? 0.2 : 0), heat, k === 2 && !over);
    }
    // Gold pins down his collar like a chip's legs.
    for (let k = -3; k <= 3; k++) {
      const cx = s.x + k * R * 0.22;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(cx - 2.5, s.y + R * 0.72, 5, 8);
      g.fillStyle(GOLD, 1); g.fillRect(cx - 2, s.y + R * 0.72, 4, 7);
    }
    // Kernel panic: the body tears into displaced scanline slices.
    if (panic) {
      for (let i = 0; i < 4; i++) {
        const sy = s.y - R + ((t / 7 + i * 37) % (R * 2));
        const off = Math.sin(t / 50 + i * 2) * 10;
        g.fillStyle(i % 2 ? GASGLOW : BYTE, 0.35); g.fillRect(s.x - R + off, sy, R * 2, 3);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, over ? FILAMENT : BYTE_LIT, 0.3 + Math.sin(t / 110) * 0.2); g.strokeRect(s.x - R * 1.4, s.y - R * 1.4, R * 2.8, R * 2.8); }
  },

  /**
   * Inside the Die: the floor is the silicon itself — indigo-black wafer etched with circuitry finer
   * than thread, the 12×7 bit-grid he compiles on scored faintly in it, gold bond pads all round
   * the edge with their hair-thin wires running out to the pins, and at the heart the processor core,
   * a square of brighter lattice where the reckoning happens.
   */
  drawArena(g, W2, H2) {
    const rng = mulberry(0xb17e);
    g.fillStyle(0x0c0a1a, 1); g.fillRect(0, 0, W2, H2);
    // Wafer sheen: broad diagonal bands of interference colour.
    for (let i = -6; i < 14; i++) {
      g.lineStyle(60, [0x2a1a4a, 0x1a2a4a, 0x1a3a3a][((i % 3) + 3) % 3], 0.18);
      g.lineBetween(i * 110, 0, i * 110 + 400, H2);
    }
    // Microcircuitry: little right-angled traces everywhere.
    for (let i = 0; i < 420; i++) {
      const x = rng() * W2, y = TOP + rng() * (H2 - TOP);
      const len = 6 + rng() * 26;
      g.lineStyle(1, rng() < 0.2 ? BYTE : 0x4a5a8a, 0.35 + rng() * 0.3);
      if (rng() < 0.5) { g.lineBetween(x, y, x + len, y); g.lineBetween(x + len, y, x + len, y + len * 0.4); }
      else { g.lineBetween(x, y, x, y + len); g.lineBetween(x, y + len, x + len * 0.5, y + len); }
    }
    // The bit grid, scored faintly.
    for (let c = 0; c <= GC; c++) { g.lineStyle(1, BYTE, 0.16); g.lineBetween(c * TW, TOP, c * TW, H2); }
    for (let r = 0; r <= GR; r++) { g.lineStyle(1, BYTE, 0.16); g.lineBetween(0, TOP + r * TH, W2, TOP + r * TH); }
    for (let c = 0; c < GC; c++) for (let r = 0; r < GR; r++) {
      g.fillStyle(BYTE, 0.2); g.fillRect(c * TW + 2, TOP + r * TH + 2, 3, 3);
    }
    // The core at the heart.
    const cx = W2 / 2, cy = (H2 + TOP) / 2;
    g.fillStyle(0x10203a, 0.8); g.fillRect(cx - 100, cy - 70, 200, 140);
    for (let k = 0; k < 6; k++) { g.lineStyle(1, BYTE_LIT, 0.25 - k * 0.03); g.strokeRect(cx - 100 + k * 12, cy - 70 + k * 9, 200 - k * 24, 140 - k * 18); }
    for (let i = 0; i < 40; i++) { g.fillStyle(BYTE_LIT, 0.25); g.fillRect(cx - 90 + rng() * 180, cy - 60 + rng() * 120, 2, 2); }
    // Bond pads round the edge with gold wires out to the frame.
    const padRow = (x0: number, y0: number, dx: number, dy: number, n: number, wx: number, wy: number) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + dx * i, y = y0 + dy * i;
        g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 7, y - 7, 14, 14);
        g.fillStyle(GOLD, 1); g.fillRect(x - 6, y - 6, 12, 12);
        g.fillStyle(GOLD_LIT, 0.6); g.fillRect(x - 6, y - 6, 12, 3);
        g.lineStyle(1, GOLD_LIT, 0.5); g.lineBetween(x, y, x + wx, y + wy);
      }
    };
    padRow(40, H2 - 16, 40, 0, 23, 0, 20);
    padRow(12, TOP + 30, 0, 40, 13, -20, 0);
    padRow(W2 - 12, TOP + 30, 0, 40, 13, 20, 0);
    // The frame under the HUD: the chip's lid seen from inside, with its part number.
    g.fillStyle(0x16141e, 1); g.fillRect(0, 0, W2, TOP);
    g.fillStyle(0x24222c, 1); g.fillRect(0, TOP - 8, W2, 8);
    for (let x = 20; x < W2; x += 36) { g.fillStyle(GOLD, 0.8); g.fillRect(x, TOP - 14, 10, 6); }
    segText(g, W2 - 200, 30, 'BYTE-8', 22, SILK, 0.18);
    // Copper bus lines along the floor's edges.
    g.lineStyle(3, COPPER, 0.35); g.strokeRect(26, TOP + 16, W2 - 52, H2 - TOP - 36);
  },
};
