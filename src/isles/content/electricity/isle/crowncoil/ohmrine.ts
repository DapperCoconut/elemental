import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, glow, lit, mixC } from '../../../../art/IsleArt';
import {
  AMBER, ARC, ARC_CORE, BRASS, BRASS_DARK, COPPER, COPPER_DARK, COPPER_LIT, IRON_DARK, IRON_LIT, PATINA, PORCELAIN,
  PORCELAIN_DARK, STORM, VIOLET, WARN_RED, bolt, busbar, coilTurn, crackle, insulator, meterDial, ohmSigil, pylon,
} from './art';

/**
 * Empress Ohmrine of the Grid, Sovereign of Voltreach — the Electricity Isle's monarch and finale.
 *
 * She caught the storm and strung it over every roof. The fight is the Grid itself, failing in
 * four stages, and then (on hard) the storm with nobody holding it:
 *
 *   I   The Draw         — enthroned in the Coil's last ring, she draws current out of you.
 *                          Pylons rise beside you and string wires to you (drained, slowed —
 *                          strike the pylon to snap it); she reads your meter, a ring of dials
 *                          that pop round you in order and then under you; she rings the
 *                          Brownout Bell, and dark rings roll out with one lit gap in each.
 *   II  The Grid         — she rises and the floor is the Grid: squares go live in patterns;
 *                          two busbars sweep the room from either side, each with one blown
 *                          fuse to slip through; glass fuses blow round the room in turn and
 *                          spray molten copper.
 *   III Tesla Crown      — the Coil discharges. Arms of arc wheel round a discharge post; ball
 *                          lightning drifts after you and bursts when two meet; lightning rods
 *                          spring up and the sky strikes each in turn, arcing to anyone near.
 *   IV  Blackout         — the power fails. She is lit only by her own crackle, and so are you:
 *                          your footprints spark and discharge behind you; a lightning flash
 *                          shows where the strikes will land, then the dark comes back; she
 *                          leaves crackling after-images of herself that fire at you in turn.
 *   V   The Endless Current (hard) — she plugs into the Coil and becomes the storm. Forked
 *                          bolts with their shadows drawn first; the whole crown goes live but
 *                          for a few porcelain insulator pads; her body becomes a bolt that
 *                          zigzags the room and leaves its path live behind it.
 *
 * Every signature is bespoke and none of them look like an earlier monarch's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const O_MAIN = 0x6aa8ff;
const O_LIT = 0xe0f0ff;
const O_DARK = 0x14204a;
const GRID_LIVE = 0x8ad0ff;
const BROWN = 0x3a2a14;
const MOLTEN = 0xffa040;

const FT = 96;
/** The anchor post the first phase stands on — the throne is painted round it. */
const THRONE = { x: 480, y: 210 };
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
const live = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;
type Gfx = Phaser.GameObjects.Graphics;
type P = { x: number; y: number };

// ═════════════════════════════════════════════════════════════════════
// I. THE DRAW
// ═════════════════════════════════════════════════════════════════════

// ── The Draw ─────────────────────────────────────────────────────────
// Two pylons rise either side of you. When they are up, any pylon within reach strings a wire
// to you and she draws on it: a drain tick every 0.6s that heals her, and you are slowed while
// any wire holds. Snap a wire by striking its pylon (a shot, a blow, anything). Stretch too far and
// it reels you back in.

const theDraw = (tk: BossToolkit): SignatureMove => {
  const RISE = 900;
  const HOOK_R = 340;
  const LIFE = 5600;
  const TICK = 700;
  const DRAIN = 2;
  const FEED = 3;
  /** Strike radius round the pylon's mast, and how high up the mast it sits. */
  const STRIKE_R = 30;
  const STRIKE_UP = 34;
  interface Pyl {
    x: number; y: number; born: number; upAt: number; hooked: boolean; dead: boolean; deadAt: number; tickAt: number; until: number;
    target: StrikeTarget | null; struckAt: number;
  }
  let pyls: Pyl[] = [];
  const topple = (w: Pyl, time: number) => {
    w.dead = true; w.deadAt = time;
    w.target?.remove(); w.target = null;
  };
  const snap = (w: Pyl) => {
    if (w.dead || !w.hooked) return;
    topple(w, tk.now);
    w.struckAt = tk.now;
    tk.sfx('snap-back');
    float(tk, w.x, w.y - 70, 'WIRE SNAPPED', '#ffe08a');
  };
  return {
    durationMs: 2000,
    windupMs: 800,
    gesture: 'raise',
    hold: 'draw',
    tell: 'THE DRAW',
    cast(time) {
      const p = tk.player;
      for (const s of [-1, 1]) {
        const x = tk.clampX(p.x + s * (200 + Math.random() * 60), 60);
        const y = clampN(p.y + (Math.random() - 0.5) * 140, FT + 60, tk.H - 50);
        pyls.push({ x, y, born: time, upAt: time + tk.warn(RISE), hooked: false, dead: false, deadAt: 0, tickAt: 0, until: 0, target: null, struckAt: 0 });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      let anyWire = false;
      for (const w of pyls) {
        if (w.dead) continue;
        if (!w.hooked && time >= w.upAt) {
          if (live(tk) && dist(p.x, p.y, w.x, w.y) <= HOOK_R) {
            w.hooked = true;
            w.tickAt = time + TICK;
            w.until = time + LIFE;
            w.target = tk.spawnTarget({ x: w.x, y: w.y - STRIKE_UP, r: STRIKE_R, onStruck: (by) => { if (by === 'player') snap(w); } });
            tk.sfx('chain');
            float(tk, p.x, p.y - 44, 'HOOKED TO THE GRID', '#bfe8ff');
          } else {
            // Nothing in reach: the pylon earths itself and topples.
            topple(w, time);
          }
          continue;
        }
        if (!w.hooked) continue;
        if (time >= w.until || !live(tk)) { topple(w, time); continue; }
        anyWire = true;
        if (dist(p.x, p.y, w.x, w.y) > 470) tk.pull(w.x, w.y, 110, 120);
        if (time >= w.tickAt) {
          w.tickAt = time + TICK;
          tk.hitPlayer(DRAIN, p.x, p.y);
          tk.healBoss(FEED, tk.bossX, tk.bossY - 40);
        }
      }
      if (anyWire) tk.slowPlayer(0.75, 200);
      pyls = pyls.filter((w) => !w.dead || time - w.deadAt < 700);
    },
    drawGround(g, time) {
      for (const w of pyls) {
        if (w.hooked || w.dead) {
          g.fillStyle(0x000000, 0.3); g.fillEllipse(w.x, w.y + 2, 60, 18);
          continue;
        }
        // The reach a rising pylon will hook: a ring of wire-ticks.
        const k = clampN((time - w.born) / Math.max(1, w.upAt - w.born), 0, 1);
        g.lineStyle(2, ARC, 0.15 + k * 0.45); g.strokeCircle(w.x, w.y, HOOK_R);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2 + time / 900;
          g.lineStyle(2, ARC, 0.3 + k * 0.4);
          g.lineBetween(w.x + Math.cos(a) * (HOOK_R - 8), w.y + Math.sin(a) * (HOOK_R - 8), w.x + Math.cos(a) * HOOK_R, w.y + Math.sin(a) * HOOK_R);
        }
      }
    },
    drawAir(g, time) {
      const p = tk.player;
      for (const w of pyls) {
        const rise = clampN((time - w.born) / Math.max(1, w.upAt - w.born), 0, 1);
        const fall = w.dead ? clampN((time - w.deadAt) / 700, 0, 1) : 0;
        const s = 0.55 * (0.25 + rise * 0.75);
        // A toppling pylon is drawn sinking and fading.
        pylon(g, w.x, w.y + fall * 40, s * (1 - fall * 0.6), mixC(IRON_LIT, ARC, w.hooked && !w.dead ? 0.3 : 0));
        if (w.hooked && !w.dead) {
          const topY = w.y - 150 * s;
          // The wire: a sagging cable to you, and one up from the pylon to her.
          const sag = (x1: number, y1: number, x2: number, y2: number, depth: number) => {
            g.lineStyle(3, 0x1a1a1a, 1);
            g.beginPath();
            for (let i = 0; i <= 14; i++) {
              const f = i / 14;
              const x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * depth;
              if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.strokePath();
            // Current pulses running along it toward her.
            for (let k = 0; k < 4; k++) {
              const f = ((time / 500 + k / 4) % 1);
              const x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * depth;
              g.fillStyle(ARC, 0.9); g.fillCircle(x, y, 3);
            }
          };
          sag(p.x, p.y - 20, w.x, topY, 40);
          sag(w.x, topY, tk.bossX, tk.bossY - 30, 60);
          crackle(g, p.x, p.y - 20, 14, Math.floor(time / 60), ARC, 0.8, 4);
          // The live junction on the mast: strike it to snap the wire.
          g.lineStyle(2, 0xffe08a, 0.5 + Math.sin(time / 120) * 0.3); g.strokeCircle(w.x, w.y - STRIKE_UP, STRIKE_R);
        }
        if (w.struckAt > 0 && time - w.struckAt < 400) {
          // Snapped: the cut end whipping back off the mast in a shower of sparks.
          const k = (time - w.struckAt) / 400;
          crackle(g, w.x, w.y - STRIKE_UP, STRIKE_R + k * 30, Math.floor(w.struckAt), 0xffe08a, 1 - k, 6);
        }
      }
    },
    onPhaseEnd() { for (const w of pyls) w.target?.remove(); pyls = []; },
  };
};

// ── Meter Reading ────────────────────────────────────────────────────
// She reads your meter. Six brass dials are stamped on the floor in a ring round where you
// stand, and a seventh under you. Their needles climb; the ring pops dial by dial, clockwise,
// and then the one under you. Stay in the middle while the ring goes — then out through the
// first dial that popped, before the centre reads.

const meterReading = (tk: BossToolkit): SignatureMove => {
  const N = 6;
  const RING = 118;
  const R = 62;
  const WARN = 1300;
  const STEP = 260;
  const DMG = 15;
  interface Dial { x: number; y: number; at: number; done: boolean; born: number; n: number }
  let dials: Dial[] = [];
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'point',
    tell: 'METER READING',
    cast(time) {
      const p = tk.player;
      const cx = clampN(p.x, RING + 50, tk.W - RING - 50), cy = clampN(p.y, FT + RING + 30, tk.H - RING - 30);
      const a0 = Math.random() * Math.PI * 2;
      const t0 = time + tk.warn(WARN);
      for (let i = 0; i < N; i++) {
        const a = a0 + (i / N) * Math.PI * 2;
        dials.push({ x: cx + Math.cos(a) * RING, y: cy + Math.sin(a) * RING, at: t0 + i * STEP, done: false, born: time, n: i + 1 });
      }
      dials.push({ x: cx, y: cy, at: t0 + N * STEP + 500, done: false, born: time, n: N + 1 });
      tk.sfx('clock-tick');
    },
    update(time) {
      for (const d of dials) {
        if (d.done || time < d.at) continue;
        d.done = true;
        tk.explode(d.x, d.y, R, DMG, AMBER);
        tk.sfx('zap');
      }
      dials = dials.filter((d) => time < d.at + 500);
    },
    drawGround(g, time) {
      for (const d of dials) {
        if (d.done) continue;
        const k = clampN((time - d.born) / Math.max(1, d.at - d.born), 0, 1);
        g.fillStyle(WARN_RED, 0.05 + k * 0.18); g.fillCircle(d.x, d.y, R);
        g.lineStyle(2, AMBER, 0.3 + k * 0.5); g.strokeCircle(d.x, d.y, R);
        meterDial(g, d.x, d.y, 18, k, 0.9);
        // The order it will read in, chalked beside it.
        g.fillStyle(0xf2ead2, 0.8);
        for (let i = 0; i < Math.min(d.n, 7); i++) g.fillRect(d.x - 14 + i * 4, d.y + 24, 2, 6);
      }
    },
    drawAir(g, time) {
      for (const d of dials) {
        if (!d.done) continue;
        const a = 1 - clampN((time - d.at) / 500, 0, 1);
        crackle(g, d.x, d.y - 10, 36, Math.floor(time / 50) + d.n, AMBER, a, 6);
        // The dial's glass flies off.
        for (let i = 0; i < 6; i++) {
          const an = (i / 6) * Math.PI * 2;
          g.fillStyle(0xf2ead2, a); g.fillRect(d.x + Math.cos(an) * (1 - a) * 50, d.y + Math.sin(an) * (1 - a) * 50 - 10, 3, 3);
        }
      }
    },
    onPhaseEnd() { dials = []; },
  };
};

// ── The Brownout Bell ────────────────────────────────────────────────
// The Bell tolls three times. Each toll rolls a ring of brownout out from her — the lamps going
// dark in a widening band — with one gap still lit. A lit wedge on the floor shows the gap
// before it comes; it creeps round a little each toll.

const brownoutBell = (tk: BossToolkit): SignatureMove => {
  const TOLLS = 3;
  const GAP = 0.46;
  const DRIFT = 0.3;
  const SPEED = 300;
  const BAND = 20;
  const DMG = 15;
  const LEAD = 650;
  interface Ring { ox: number; oy: number; gap: number; at: number; hit: boolean }
  let rings: Ring[] = [];
  let bellUntil = 0;
  let firstAt = 0;
  return {
    durationMs: 3200,
    windupMs: 600,
    gesture: 'clap',
    tell: 'THE BROWNOUT BELL',
    cast(time) {
      const g0 = tk.angleToPlayer() + (Math.random() < 0.5 ? 0.25 : -0.25);
      const dir = Math.random() < 0.5 ? 1 : -1;
      firstAt = time + tk.warn(LEAD);
      for (let i = 0; i < TOLLS; i++) {
        const at = firstAt + i * 800;
        rings.push({ ox: tk.bossX, oy: tk.bossY, gap: g0 + dir * DRIFT * i, at, hit: false });
        tk.schedule(at - time, () => tk.sfx('clang'));
      }
      bellUntil = firstAt + TOLLS * 800;
    },
    update(time) {
      const p = tk.player;
      for (const r of rings) {
        if (r.hit || time < r.at || !live(tk)) continue;
        const rad = ((time - r.at) / 1000) * SPEED;
        const d = dist(p.x, p.y, r.ox, r.oy);
        if (Math.abs(d - rad) < BAND + PLAYER_R * 0.5) {
          const off = Math.abs(wrap(Math.atan2(p.y - r.oy, p.x - r.ox) - r.gap));
          if (off > GAP) { r.hit = true; tk.hitPlayer(DMG, p.x, p.y); float(tk, p.x, p.y - 40, 'BROWNOUT', '#c8a060'); }
        }
      }
      rings = rings.filter((r) => time < r.at + 4000);
    },
    drawGround(g, time) {
      for (const r of rings) {
        const rad = ((time - r.at) / 1000) * SPEED;
        if (time < r.at) {
          // The lit wedge of the gap, before the ring comes.
          const k = clampN(1 - (r.at - time) / 900, 0, 1);
          g.fillStyle(0xffe08a, 0.04 + k * 0.1);
          g.slice(r.ox, r.oy, 700, r.gap - GAP, r.gap + GAP, false); g.fillPath();
          continue;
        }
        if (rad > 1300) continue;
        // The brownout band: a dark ring with dead lamps along it, the gap left lit.
        const seg = 48;
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          if (Math.abs(wrap(a - r.gap)) <= GAP) continue;
          const a2 = a + (Math.PI * 2) / seg;
          g.lineStyle(BAND * 2, BROWN, 0.75);
          g.beginPath(); g.arc(r.ox, r.oy, rad, a, a2, false); g.strokePath();
          if (i % 3 === 0) {
            g.fillStyle(0x6a5a3a, 0.9); g.fillCircle(r.ox + Math.cos(a) * rad, r.oy + Math.sin(a) * rad, 4);
          }
        }
        g.lineStyle(2, AMBER, 0.6);
        g.beginPath(); g.arc(r.ox, r.oy, rad + BAND, r.gap + GAP, r.gap - GAP + Math.PI * 2, false); g.strokePath();
        // The lit gap: lamps still burning.
        for (const s of [-1, 1]) {
          const a = r.gap + s * GAP;
          g.fillStyle(0xffe08a, 1); g.fillCircle(r.ox + Math.cos(a) * rad, r.oy + Math.sin(a) * rad, 5);
          glow(g, r.ox + Math.cos(a) * rad, r.oy + Math.sin(a) * rad, 18, AMBER, 0.08, 2);
        }
      }
    },
    drawAir(g, time) {
      if (time > bellUntil + 200) return;
      // The Bell itself over her head, swinging on each toll.
      const sw = Math.sin(time / 90) * (time > firstAt - 300 ? 0.5 : 0.15);
      const x = tk.bossX, y = tk.bossY - 112;
      g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x, y - 26, x + Math.sin(sw) * 8, y);
      g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x + Math.sin(sw) * 12 - 20, y + 26, x + Math.sin(sw) * 12 + 20, y + 26, x + Math.sin(sw) * 8, y - 2);
      g.fillStyle(BRASS, 1); g.fillTriangle(x + Math.sin(sw) * 12 - 16, y + 24, x + Math.sin(sw) * 12 + 16, y + 24, x + Math.sin(sw) * 8, y + 1);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + Math.sin(sw) * 16, y + 28, 4);
    },
    onPhaseEnd() { rings = []; },
  };
};

// ═════════════════════════════════════════════════════════════════════
// II. THE GRID
// ═════════════════════════════════════════════════════════════════════

const COLS = 8;
const ROWS = 4;
const CW = 960 / COLS;
const CH = (640 - FT) / ROWS;
type Pattern = (c: number, r: number) => boolean;
const PATTERNS: { name: string; on: Pattern }[] = [
  { name: 'CHEQUER', on: (c, r) => (c + r) % 2 === 0 },
  { name: 'CHEQUER', on: (c, r) => (c + r) % 2 === 1 },
  { name: 'MAINS', on: (_c, r) => r % 2 === 0 },
  { name: 'MAINS', on: (_c, r) => r % 2 === 1 },
  { name: 'FEEDERS', on: (c) => c % 2 === 0 },
  { name: 'FEEDERS', on: (c) => c % 2 === 1 },
  { name: 'RING MAIN', on: (c, r) => c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1 },
  { name: 'SUBSTATION', on: (c, r) => c >= 2 && c <= 5 && r >= 1 && r <= 2 },
  { name: 'CROSSBAR', on: (c, r) => c === 3 || c === 4 || r === 1 },
];

// ── The Grid ─────────────────────────────────────────────────────────
// The floor is the Grid: eight squares by four. Three patterns go live one after another — a
// square brightens and hums before it switches on, then bites anyone standing in it.

const theGrid = (tk: BossToolkit): SignatureMove => {
  const WARN = 900;
  const ON = 480;
  const GAP_MS = 1250;
  const DMG = 14;
  interface Sw { p: Pattern; name: string; at: number; born: number; hit: boolean }
  let sws: Sw[] = [];
  const cellOf = (x: number, y: number): [number, number] => [clampN(Math.floor(x / CW), 0, COLS - 1), clampN(Math.floor((y - FT) / CH), 0, ROWS - 1)];
  return {
    durationMs: 4000,
    windupMs: 600,
    gesture: 'slam',
    tell: 'THE GRID',
    cast(time) {
      let last = -1;
      for (let i = 0; i < 3; i++) {
        let k = Math.floor(Math.random() * PATTERNS.length);
        // Never the same pattern twice in a row, and never the exact complement of a chequer straight after it.
        if (k === last || (last >= 0 && PATTERNS[k].name === PATTERNS[last].name)) k = (k + 3) % PATTERNS.length;
        last = k;
        const born = time + i * GAP_MS;
        sws.push({ p: PATTERNS[k].on, name: PATTERNS[k].name, born, at: born + tk.warn(WARN), hit: false });
      }
      tk.sfx('glitch');
    },
    update(time) {
      const p = tk.player;
      for (const s of sws) {
        if (s.hit || time < s.at || time > s.at + ON || !live(tk)) continue;
        const [c, r] = cellOf(p.x, p.y);
        if (s.p(c, r)) { s.hit = true; tk.hitPlayer(DMG, p.x, p.y); float(tk, p.x, p.y - 40, 'LIVE', '#8ad0ff'); }
        if (time - s.at < 20) tk.sfx('zap');
      }
      sws = sws.filter((s) => time < s.at + ON + 100);
    },
    drawGround(g, time) {
      // The Grid's lines, faint, whenever the move is running.
      if (sws.length) {
        g.lineStyle(1.5, GRID_LIVE, 0.18);
        for (let c = 1; c < COLS; c++) g.lineBetween(c * CW, FT, c * CW, tk.H);
        for (let r = 1; r < ROWS; r++) g.lineBetween(0, FT + r * CH, tk.W, FT + r * CH);
      }
      for (const s of sws) {
        if (time < s.born) continue;
        const on = time >= s.at;
        const k = on ? 1 : clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            if (!s.p(c, r)) continue;
            const x = c * CW, y = FT + r * CH;
            if (on) {
              g.fillStyle(GRID_LIVE, 0.45); g.fillRect(x + 3, y + 3, CW - 6, CH - 6);
              g.lineStyle(3, ARC_CORE, 0.9); g.strokeRect(x + 3, y + 3, CW - 6, CH - 6);
            } else {
              g.fillStyle(GRID_LIVE, 0.04 + k * 0.14); g.fillRect(x + 4, y + 4, CW - 8, CH - 8);
              g.lineStyle(2, GRID_LIVE, 0.25 + k * 0.5); g.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
              // Corner relays clicking closed as it nears.
              const rr = 3 + k * 3;
              g.fillStyle(k > 0.8 && Math.floor(time / 90) % 2 ? 0xffffff : GRID_LIVE, 0.8);
              g.fillCircle(x + 10, y + 10, rr); g.fillCircle(x + CW - 10, y + 10, rr); g.fillCircle(x + 10, y + CH - 10, rr); g.fillCircle(x + CW - 10, y + CH - 10, rr);
            }
          }
        }
      }
    },
    drawAir(g, time) {
      for (const s of sws) {
        if (time < s.at || time > s.at + ON) continue;
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            if (!s.p(c, r)) continue;
            const x = c * CW + CW / 2, y = FT + r * CH + CH / 2;
            crackle(g, x, y, 34, Math.floor(time / 50) + c * 7 + r, ARC, 0.85, 5);
          }
        }
      }
    },
    onPhaseEnd() { sws = []; },
  };
};

// ── Busbars ──────────────────────────────────────────────────────────
// Two copper busbars, floor to ceiling, slide in from either side of the room and cross it.
// Each has one blown fuse — a gap — and the gaps are at different heights. Go through the gap.

const busbars = (tk: BossToolkit): SignatureMove => {
  const WARN = 1000;
  const SPEED = 230;
  const GAP = 62;
  const DMG = 16;
  interface Bar { x0: number; dir: 1 | -1; gapY: number; start: number; hit: boolean }
  let bars: Bar[] = [];
  const xOf = (b: Bar, time: number): number => b.x0 + b.dir * Math.max(0, time - b.start) / 1000 * SPEED;
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'BUSBARS',
    cast(time) {
      const p = tk.player;
      const a = clampN(p.y + (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 80), FT + GAP + 10, tk.H - GAP - 10);
      const b = clampN(FT + 70 + Math.random() * (tk.H - FT - 140), FT + GAP + 10, tk.H - GAP - 10);
      const start = time + tk.warn(WARN);
      bars.push({ x0: 10, dir: 1, gapY: a, start, hit: false }, { x0: tk.W - 10, dir: -1, gapY: Math.abs(b - a) < 160 ? clampN(a + (a < tk.H / 2 ? 220 : -220), FT + GAP + 10, tk.H - GAP - 10) : b, start, hit: false });
      tk.sfx('engine');
    },
    update(time) {
      const p = tk.player;
      for (const b of bars) {
        if (b.hit || time < b.start || !live(tk)) continue;
        const x = xOf(b, time);
        if (Math.abs(p.x - x) < 14 + PLAYER_R * 0.6 && Math.abs(p.y - b.gapY) > GAP - 8) {
          b.hit = true;
          tk.hitPlayer(DMG, p.x, p.y);
          float(tk, p.x, p.y - 40, 'BUSBAR', '#f2b277');
        }
      }
      bars = bars.filter((b) => time < b.start + (tk.W / SPEED) * 1000 + 200);
    },
    drawGround(g, time) {
      for (const b of bars) {
        if (time >= b.start) continue;
        // Before it moves: its track shown along the floor, the gap's lane lit.
        const k = clampN(1 - (b.start - time) / tk.warn(WARN), 0, 1);
        g.fillStyle(0xffe08a, 0.05 + k * 0.1); g.fillRect(0, b.gapY - GAP, tk.W, GAP * 2);
        g.lineStyle(2, b.dir > 0 ? COPPER_LIT : AMBER, 0.3 + k * 0.4);
        g.lineBetween(0, b.gapY - GAP, tk.W, b.gapY - GAP); g.lineBetween(0, b.gapY + GAP, tk.W, b.gapY + GAP);
        for (let x = 40; x < tk.W; x += 80) {
          const xx = b.dir > 0 ? x : tk.W - x;
          g.fillStyle(COPPER, 0.3 + k * 0.4); g.fillTriangle(xx, b.gapY - 8, xx, b.gapY + 8, xx + b.dir * 12, b.gapY);
        }
      }
    },
    drawAir(g, time) {
      for (const b of bars) {
        const x = time < b.start ? b.x0 : xOf(b, time);
        const k = time < b.start ? 0.5 : 1;
        for (const [y0, y1] of [[FT, b.gapY - GAP], [b.gapY + GAP, tk.H]] as [number, number][]) {
          g.fillStyle(COPPER_DARK, k); g.fillRect(x - 12, y0, 24, y1 - y0);
          g.fillStyle(COPPER, k); g.fillRect(x - 10, y0, 16, y1 - y0);
          g.fillStyle(COPPER_LIT, k * 0.8); g.fillRect(x - 9, y0, 3, y1 - y0);
          for (let y = y0 + 30; y < y1 - 10; y += 70) { g.fillStyle(PORCELAIN, k); g.fillRect(x - 14, y, 28, 7); }
          if (time >= b.start) bolt(g, x, y0 + 4, x, y1 - 4, Math.floor(time / 50) + (b.dir > 0 ? 0 : 9), ARC, 2, 0.6, 0.06, 2);
        }
        // The blown fuse in the gap: glass cartridge cracked, filament broken, smoking.
        g.fillStyle(0x2a2a2a, 1); g.fillRect(x - 6, b.gapY - GAP, 12, 8); g.fillRect(x - 6, b.gapY + GAP - 8, 12, 8);
        g.fillStyle(0x6a6e78, 0.6); g.fillCircle(x + Math.sin(time / 300) * 4, b.gapY - (time / 20) % 40, 4);
      }
    },
    onPhaseEnd() { bars = []; },
  };
};

// ── Blown Fuses ──────────────────────────────────────────────────────
// She plants glass fuses round the room. Each filament glows hotter until it blows, in turn,
// spraying molten copper outward in a fan of beads. Their order is ticked on each cap.

const blownFuses = (tk: BossToolkit): SignatureMove => {
  const N = 5;
  const WARN = 1100;
  const STEP = 420;
  const BEADS = 9;
  interface Fuse { x: number; y: number; a: number; born: number; at: number; done: boolean; n: number }
  let fuses: Fuse[] = [];
  return {
    durationMs: 3600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'BLOWN FUSES',
    cast(time) {
      const p = tk.player;
      const t0 = time + tk.warn(WARN);
      for (let i = 0; i < N; i++) {
        let x = 0, y = 0;
        for (let k = 0; k < 12; k++) {
          x = 80 + Math.random() * (tk.W - 160); y = FT + 60 + Math.random() * (tk.H - FT - 110);
          if (dist(x, y, p.x, p.y) > 170 && fuses.every((f) => dist(f.x, f.y, x, y) > 140)) break;
        }
        fuses.push({ x, y, a: Math.random() * Math.PI, born: time, at: t0 + i * STEP, done: false, n: i + 1 });
      }
    },
    update(time) {
      for (const f of fuses) {
        if (f.done || time < f.at) continue;
        f.done = true;
        tk.explode(f.x, f.y, 46, 10, MOLTEN);
        const a0 = Math.random() * Math.PI * 2;
        for (let i = 0; i < BEADS; i++) {
          tk.spawnBullet({ x: f.x, y: f.y, angle: a0 + (i / BEADS) * Math.PI * 2, speed: 220, damage: 8, r: 6, lifeMs: 3200, color: MOLTEN });
        }
        tk.sfx('glitch');
      }
      fuses = fuses.filter((f) => time < f.at + 400);
    },
    drawGround(g, time) {
      for (const f of fuses) {
        if (f.done) continue;
        const k = clampN((time - f.born) / Math.max(1, f.at - f.born), 0, 1);
        g.fillStyle(MOLTEN, 0.05 + k * 0.12); g.fillCircle(f.x, f.y, 46);
        g.lineStyle(1.5, MOLTEN, 0.2 + k * 0.4); g.strokeCircle(f.x, f.y, 46);
      }
    },
    drawAir(g, time) {
      for (const f of fuses) {
        const ca = Math.cos(f.a), sa = Math.sin(f.a);
        if (f.done) {
          const a = 1 - clampN((time - f.at) / 400, 0, 1);
          for (let i = 0; i < 8; i++) {
            const an = (i / 8) * Math.PI * 2;
            g.fillStyle(0xd8f0ff, a * 0.8); g.fillTriangle(f.x + Math.cos(an) * (1 - a) * 40, f.y + Math.sin(an) * (1 - a) * 40, f.x + Math.cos(an + 0.3) * (1 - a) * 46, f.y + Math.sin(an + 0.3) * (1 - a) * 46, f.x, f.y);
          }
          continue;
        }
        const k = clampN((time - f.born) / Math.max(1, f.at - f.born), 0, 1);
        // The cartridge: a glass tube between brass caps, a filament inside heating to white.
        const hx = ca * 26, hy = sa * 26;
        g.lineStyle(14, 0x9ad8f0, 0.35); g.lineBetween(f.x - hx, f.y - hy, f.x + hx, f.y + hy);
        g.lineStyle(2, mixC(0x6a3a1a, 0xffffff, k), 1); g.lineBetween(f.x - hx * 0.8, f.y - hy * 0.8, f.x + hx * 0.8, f.y + hy * 0.8);
        glow(g, f.x, f.y, 10 + k * 22, MOLTEN, 0.04 + k * 0.08, 3);
        for (const s of [-1, 1]) {
          g.fillStyle(BRASS, 1); g.fillCircle(f.x + s * hx, f.y + s * hy, 8);
          g.fillStyle(BRASS_DARK, 1); g.fillCircle(f.x + s * hx, f.y + s * hy, 3);
        }
        for (let i = 0; i < f.n; i++) { g.fillStyle(0xffffff, 0.85); g.fillRect(f.x - 10 + i * 5, f.y - 22, 3, 6); }
        if (k > 0.8) crackle(g, f.x, f.y, 14, Math.floor(time / 40) + f.n, MOLTEN, 0.9, 4);
      }
    },
    onPhaseEnd() { fuses = []; },
  };
};

// ═════════════════════════════════════════════════════════════════════
// III. TESLA CROWN
// ═════════════════════════════════════════════════════════════════════

// ── Tesla Spiral ─────────────────────────────────────────────────────
// She drives a discharge post into the floor where she stands. Arms of arc unfold from it,
// dotted at first, then live, and wheel round — slowly enough to walk with the gap.

const teslaSpiral = (tk: BossToolkit): SignatureMove => {
  const WARN = 1000;
  const LIVE_MS = 3400;
  const LEN = 560;
  const RATE = 0.62;
  const HALF = 13;
  const DMG = 10;
  const REHIT = 520;
  let post: { x: number; y: number; born: number; at: number; a0: number; dir: number; arms: number } | null = null;
  let lastHit = 0;
  const armAngle = (i: number, time: number): number => {
    if (!post) return 0;
    const t = Math.max(0, time - post.at) / 1000;
    return post.a0 + (i / post.arms) * Math.PI * 2 + post.dir * RATE * t;
  };
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'slam',
    tell: 'TESLA SPIRAL',
    cast(time) {
      post = { x: tk.bossX, y: tk.bossY, born: time, at: time + tk.warn(WARN), a0: tk.angleToPlayer() + Math.PI / 3, dir: Math.random() < 0.5 ? 1 : -1, arms: tk.hard ? 4 : 3 };
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!post) return;
      if (time > post.at + LIVE_MS) { post = null; return; }
      if (time < post.at || !live(tk) || time - lastHit < REHIT) return;
      const p = tk.player;
      for (let i = 0; i < post.arms; i++) {
        const a = armAngle(i, time);
        if (segDist(p.x, p.y, post.x, post.y, post.x + Math.cos(a) * LEN, post.y + Math.sin(a) * LEN) < HALF + PLAYER_R * 0.7) {
          lastHit = time;
          tk.hitPlayer(DMG, p.x, p.y);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!post) return;
      const on = time >= post.at;
      for (let i = 0; i < post.arms; i++) {
        const a = armAngle(i, time);
        if (!on) {
          const k = clampN((time - post.born) / Math.max(1, post.at - post.born), 0, 1);
          for (let d = 30; d < LEN * k; d += 20) {
            g.fillStyle(VIOLET, 0.5); g.fillCircle(post.x + Math.cos(a) * d, post.y + Math.sin(a) * d, 2.5);
          }
        } else {
          // Where the arm is going: a faint wake ahead of it.
          g.fillStyle(VIOLET, 0.06);
          g.slice(post.x, post.y, LEN, a, a + post.dir * 0.35, post.dir < 0); g.fillPath();
        }
      }
      g.fillStyle(IRON_DARK, 1); g.fillCircle(post.x, post.y, 14);
      g.lineStyle(3, COPPER, 1); g.strokeCircle(post.x, post.y, 14);
    },
    drawAir(g, time) {
      if (!post) return;
      // The post: a little Tesla coil with its toroid.
      g.fillStyle(COPPER_DARK, 1); g.fillRect(post.x - 6, post.y - 46, 12, 44);
      for (let y = post.y - 46; y < post.y - 4; y += 3) { g.fillStyle(COPPER, 1); g.fillRect(post.x - 6, y, 12, 1.6); }
      g.fillStyle(0xa8acb8, 1); g.fillEllipse(post.x, post.y - 50, 34, 10);
      if (time < post.at) return;
      for (let i = 0; i < post.arms; i++) {
        const a = armAngle(i, time);
        bolt(g, post.x, post.y - 50, post.x + Math.cos(a) * LEN, post.y + Math.sin(a) * LEN, Math.floor(time / 45) + i * 13, VIOLET, 3, 0.95, 0.1, 3);
      }
      crackle(g, post.x, post.y - 50, 22, Math.floor(time / 40), ARC_CORE, 0.9, 6);
    },
    onPhaseEnd() { post = null; },
  };
};

// ── Ball Lightning ───────────────────────────────────────────────────
// Four balls of lightning roll off her crown and drift after you, bouncing off the walls. One
// touching you bursts. Two touching each other swell for a moment and burst together — wider.
// Lead them into each other.

const ballLightning = (tk: BossToolkit): SignatureMove => {
  const N = 4;
  const R = 15;
  const SPEED = 92;
  const LIFE = 7500;
  const TOUCH_DMG = 14;
  const MERGE_R = 92;
  const MERGE_DMG = 16;
  const SWELL = 380;
  interface Ball { x: number; y: number; vx: number; vy: number; born: number; dead: boolean; swellAt: number; mate: Ball | null }
  let balls: Ball[] = [];
  let bursts: { x: number; y: number; at: number; r: number }[] = [];
  const pop = (b: Ball, r: number, time: number) => { b.dead = true; bursts.push({ x: b.x, y: b.y, at: time, r }); };
  return {
    durationMs: 2200,
    windupMs: 700,
    gesture: 'raise',
    tell: 'BALL LIGHTNING',
    cast(time) {
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.random();
        balls.push({ x: tk.bossX + Math.cos(a) * 40, y: tk.bossY - 30 + Math.sin(a) * 30, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, born: time + i * 160, dead: false, swellAt: 0, mate: null });
      }
      tk.sfx('plasma-arc');
    },
    update(time, dtRaw) {
      const dt = clampN(dtRaw, 0, 0.05);
      const p = tk.player;
      for (const b of balls) {
        if (b.dead || time < b.born) continue;
        if (b.swellAt > 0) {
          if (time >= b.swellAt + SWELL) {
            pop(b, MERGE_R, time);
            if (b.mate && !b.mate.dead) b.mate.dead = true;
            tk.explode((b.x + (b.mate?.x ?? b.x)) / 2, (b.y + (b.mate?.y ?? b.y)) / 2, MERGE_R, MERGE_DMG, ARC);
            tk.sfx('thunder');
          }
          continue;
        }
        // Drift toward you, turning slowly.
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        const na = cur + clampN(wrap(want - cur), -1.3 * dt, 1.3 * dt);
        b.vx = Math.cos(na) * SPEED; b.vy = Math.sin(na) * SPEED;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 30 || b.x > tk.W - 30) { b.vx = -b.vx; b.x = clampN(b.x, 30, tk.W - 30); }
        if (b.y < FT + 20 || b.y > tk.H - 20) { b.vy = -b.vy; b.y = clampN(b.y, FT + 20, tk.H - 20); }
        if (live(tk) && dist(b.x, b.y, p.x, p.y) < R + PLAYER_R) {
          tk.hitPlayer(TOUCH_DMG, p.x, p.y);
          pop(b, 40, time);
          tk.sfx('zap');
          continue;
        }
        if (time > b.born + LIFE) { pop(b, 30, time); continue; }
        for (const o of balls) {
          if (o === b || o.dead || o.swellAt > 0 || time < o.born) continue;
          if (dist(b.x, b.y, o.x, o.y) < R * 2.2) {
            b.swellAt = time; b.mate = o;
            o.swellAt = time; o.mate = b;
            tk.sfx('electric-charge');
            break;
          }
        }
      }
      // A ball whose mate has gone stops swelling and pops harmlessly.
      for (const b of balls) if (!b.dead && b.swellAt > 0 && b.mate?.dead && time < b.swellAt + SWELL) { b.dead = true; }
      balls = balls.filter((b) => !b.dead);
      bursts = bursts.filter((u) => time < u.at + 400);
    },
    drawGround(g, time) {
      for (const b of balls) {
        if (b.swellAt <= 0 || !b.mate) continue;
        const k = clampN((time - b.swellAt) / SWELL, 0, 1);
        const cx = (b.x + b.mate.x) / 2, cy = (b.y + b.mate.y) / 2;
        g.fillStyle(ARC, 0.08 + k * 0.2); g.fillCircle(cx, cy, MERGE_R);
        g.lineStyle(2, ARC_CORE, 0.4 + k * 0.5); g.strokeCircle(cx, cy, MERGE_R);
      }
    },
    drawAir(g, time) {
      for (const b of balls) {
        if (time < b.born) continue;
        const s = b.swellAt > 0 ? 1 + clampN((time - b.swellAt) / SWELL, 0, 1) * 0.8 : 1;
        glow(g, b.x, b.y, R * 2.4 * s, ARC, 0.07, 3);
        g.fillStyle(O_LIT, 0.85); g.fillCircle(b.x, b.y, R * 0.75 * s);
        g.fillStyle(0xffffff, 1); g.fillCircle(b.x, b.y, R * 0.35 * s);
        crackle(g, b.x, b.y, R * 1.5 * s, Math.floor(time / 45) + Math.floor(b.born), ARC, 0.9, 5);
      }
      for (const u of bursts) {
        const a = 1 - (time - u.at) / 400;
        g.lineStyle(3, ARC_CORE, a); g.strokeCircle(u.x, u.y, u.r * (1.1 - a * 0.4));
        crackle(g, u.x, u.y, u.r * 0.8, Math.floor(u.at), ARC, a, 8);
      }
    },
    onPhaseEnd() { balls = []; bursts = []; },
  };
};

// ── Lightning Rods ───────────────────────────────────────────────────
// Iron rods spring up round the room. The sky strikes them one after another; each strike
// arcs off its rod to anyone within its ring. Their order is lit up the rod.

const lightningRods = (tk: BossToolkit): SignatureMove => {
  const N = 6;
  const WARN = 1200;
  const STEP = 430;
  const REACH = 125;
  const DMG = 15;
  interface Rod { x: number; y: number; born: number; at: number; done: boolean; n: number; hitP: P | null }
  let rods: Rod[] = [];
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'LIGHTNING RODS',
    cast(time) {
      const p = tk.player;
      const t0 = time + tk.warn(WARN);
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < N; i++) {
        // A loose ring round you, so you have to read the order to get out of the way.
        const a = a0 + (i / N) * Math.PI * 2 * 1.0 + (Math.random() - 0.5) * 0.3;
        const r = 120 + Math.random() * 110;
        rods.push({ x: tk.clampX(p.x + Math.cos(a) * r, 50), y: clampN(p.y + Math.sin(a) * r, FT + 50, tk.H - 40), born: time, at: t0 + i * STEP, done: false, n: i + 1, hitP: null });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const r of rods) {
        if (r.done || time < r.at) continue;
        r.done = true;
        tk.sfx('thunder');
        tk.boom(r.x, r.y, 30, ARC);
        if (live(tk) && dist(p.x, p.y, r.x, r.y) <= REACH + PLAYER_R * 0.5) {
          tk.hitPlayer(DMG, p.x, p.y);
          r.hitP = { x: p.x, y: p.y };
        }
      }
      rods = rods.filter((r) => time < r.at + 500);
    },
    drawGround(g, time) {
      for (const r of rods) {
        if (r.done) continue;
        const k = clampN((time - r.born) / Math.max(1, r.at - r.born), 0, 1);
        const next = rods.find((o) => !o.done) === r;
        g.fillStyle(ARC, (next ? 0.08 : 0.03) + k * 0.12); g.fillCircle(r.x, r.y, REACH);
        g.lineStyle(next ? 3 : 1.5, next ? ARC_CORE : ARC, 0.3 + k * 0.5); g.strokeCircle(r.x, r.y, REACH);
      }
    },
    drawAir(g, time) {
      for (const r of rods) {
        const k = clampN((time - r.born) / 260, 0, 1);
        const h = 70 * k;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(r.x, r.y + 2, 18, 6);
        g.lineStyle(4, IRON_DARK, 1); g.lineBetween(r.x, r.y, r.x, r.y - h);
        g.lineStyle(2, IRON_LIT, 1); g.lineBetween(r.x, r.y, r.x, r.y - h);
        g.fillStyle(COPPER_LIT, 1); g.fillTriangle(r.x - 4, r.y - h, r.x + 4, r.y - h, r.x, r.y - h - 10);
        // Its number lit up the rod in amber studs.
        for (let i = 0; i < r.n; i++) { g.fillStyle(r.done ? 0x3a3a3a : AMBER, 0.9); g.fillCircle(r.x + 5, r.y - 8 - i * 9, 2.2); }
        if (r.done) {
          const a = 1 - clampN((time - r.at) / 500, 0, 1);
          bolt(g, r.x + Math.sin(r.at) * 80, FT - 20, r.x, r.y - h - 10, Math.floor(r.at), ARC, 4, a, 0.2, 2);
          if (r.hitP) bolt(g, r.x, r.y - h * 0.6, r.hitP.x, r.hitP.y - 20, Math.floor(time / 40) + r.n, ARC, 3, a, 0.25, 1);
          glow(g, r.x, r.y - h, 50, ARC_CORE, 0.1 * a, 3);
        }
      }
    },
    onPhaseEnd() { rods = []; },
  };
};

// ═════════════════════════════════════════════════════════════════════
// IV. BLACKOUT
// ═════════════════════════════════════════════════════════════════════

// ── Footprints ───────────────────────────────────────────────────────
// In the dark you are lit only by your own crackle. For four seconds every step you take leaves
// a spark-print, and each print discharges a beat later. Keep moving onto fresh floor.

const footprints = (tk: BossToolkit): SignatureMove => {
  const RUN = 4200;
  const EVERY = 140;
  const FUSE = 1100;
  const R = 22;
  const DMG = 6;
  const REHIT = 450;
  interface Print { x: number; y: number; at: number; done: boolean }
  let prints: Print[] = [];
  let until = 0;
  let lastDrop = 0;
  let lastHit = 0;
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'point',
    tell: 'YOUR OWN CRACKLE',
    cast(time) { until = time + RUN; lastDrop = time; tk.sfx('status-shock'); },
    update(time) {
      const p = tk.player;
      if (time < until && time - lastDrop >= EVERY && live(tk)) {
        lastDrop = time;
        prints.push({ x: p.x, y: p.y + 10, at: time + FUSE, done: false });
      }
      for (const pr of prints) {
        if (pr.done || time < pr.at) continue;
        pr.done = true;
        if (live(tk) && time - lastHit > REHIT && dist(p.x, p.y + 10, pr.x, pr.y) < R + PLAYER_R * 0.6) {
          lastHit = time;
          tk.hitPlayer(DMG, p.x, p.y);
        }
      }
      prints = prints.filter((pr) => time < pr.at + 260);
    },
    drawGround(g, time) {
      for (const pr of prints) {
        if (pr.done) {
          const a = 1 - (time - pr.at) / 260;
          crackle(g, pr.x, pr.y, R + 6, Math.floor(pr.at), ARC, a, 5);
          continue;
        }
        const k = clampN(1 - (pr.at - time) / FUSE, 0, 1);
        g.fillStyle(ARC, 0.15 + k * 0.45); g.fillEllipse(pr.x, pr.y, R * 1.2, R * 0.7);
        g.lineStyle(1.5, ARC_CORE, 0.3 + k * 0.6); g.strokeEllipse(pr.x, pr.y, R * 1.4, R * 0.8);
      }
    },
    drawAir(g, time) {
      if (time >= until || !live(tk)) return;
      // Your own crackle — the only light on you in the dark, so brighter there.
      const p = tk.player;
      crackle(g, p.x, p.y - 10, 26, Math.floor(time / 50), ARC, tk.dark ? 0.9 : 0.6, 6);
      glow(g, p.x, p.y, 60, ARC, tk.dark ? 0.05 : 0.03, 3);
    },
    onPhaseEnd() { prints = []; until = 0; },
  };
};

// ── Lightning Flash ──────────────────────────────────────────────────
// Lightning flashes through the slit in the Coil: for a moment the room is white and every spot
// the storm will strike is marked. Then the dark again — only the faintest scorch of each mark
// — until the strikes come down, flaring just before. Twice.

const lightningFlash = (tk: BossToolkit): SignatureMove => {
  const N = 9;
  const R = 58;
  const DELAY = 1500;
  const DMG = 16;
  interface Mark { x: number; y: number; at: number; done: boolean }
  let flashes: { at: number; marks: Mark[] }[] = [];
  const volley = (time: number) => {
    const p = tk.player;
    const marks: Mark[] = [];
    // One mark is always where you stand; the rest scattered, a few close.
    marks.push({ x: p.x, y: p.y, at: time + tk.warn(DELAY), done: false });
    for (let i = 1; i < N; i++) {
      const near = i < 4;
      const a = Math.random() * Math.PI * 2, r = near ? 110 + Math.random() * 60 : 0;
      const x = near ? p.x + Math.cos(a) * r : 60 + Math.random() * (tk.W - 120);
      const y = near ? p.y + Math.sin(a) * r : FT + 50 + Math.random() * (tk.H - FT - 90);
      marks.push({ x: tk.clampX(x, 40), y: clampN(y, FT + 40, tk.H - 40), at: time + tk.warn(DELAY) + i * 30, done: false });
    }
    flashes.push({ at: time, marks });
    tk.sfx('thunder');
  };
  return {
    durationMs: 3800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'LIGHTNING FLASH',
    cast(time) { volley(time); tk.schedule(1700, () => volley(tk.now)); },
    update(time) {
      const p = tk.player;
      for (const f of flashes) {
        for (const m of f.marks) {
          if (m.done || time < m.at) continue;
          m.done = true;
          if (live(tk) && dist(p.x, p.y, m.x, m.y) < R + PLAYER_R * 0.6) tk.hitPlayer(DMG, p.x, p.y);
        }
      }
      flashes = flashes.filter((f) => f.marks.some((m) => time < m.at + 300));
    },
    drawAir(g, time) {
      // Drawn in the air layer, over the gloom: in the dark the flash is the only light there is,
      // and the scorch it leaves on the eye is all you keep of the marks.
      const scorch = tk.dark ? 0.14 : 0.3;
      for (const f of flashes) {
        const lit0 = time - f.at < 320;
        for (const m of f.marks) {
          if (m.done) continue;
          const left = m.at - time;
          if (lit0) {
            g.fillStyle(0xffffff, 0.3); g.fillCircle(m.x, m.y, R);
            g.lineStyle(3, ARC_CORE, 0.95); g.strokeCircle(m.x, m.y, R);
          } else if (left < 280) {
            // The flare just before it lands.
            g.fillStyle(ARC, 0.25); g.fillCircle(m.x, m.y, R);
            g.lineStyle(2, ARC_CORE, 0.8); g.strokeCircle(m.x, m.y, R * (0.6 + (left / 280) * 0.4));
          } else {
            // The scorch left on the eye: barely there.
            g.lineStyle(1, ARC, scorch); g.strokeCircle(m.x, m.y, R);
          }
        }
      }
      for (const f of flashes) {
        const k = time - f.at;
        if (k < 320) {
          g.fillStyle(0xe8f4ff, (tk.dark ? 0.45 : 0.25) * (1 - k / 320)); g.fillRect(0, FT, tk.W, tk.H - FT);
          bolt(g, tk.W * 0.3 + Math.sin(f.at) * 200, FT - 30, tk.W * 0.5, FT + 60, Math.floor(f.at), ARC, 5, 1 - k / 320, 0.3, 4);
        }
        for (const m of f.marks) {
          if (!m.done || time - m.at > 300) continue;
          const a = 1 - (time - m.at) / 300;
          bolt(g, m.x + Math.sin(m.at) * 50, FT - 10, m.x, m.y, Math.floor(m.at), ARC, 3, a, 0.2, 2);
        }
      }
    },
    onPhaseEnd() { flashes = []; },
  };
};

// ── After-Images ─────────────────────────────────────────────────────
// She blinks round you in the dark and leaves a crackling after-image of herself at each place.
// They fire at you one after another, each down the line it is aiming along when it fires.

const afterImages = (tk: BossToolkit): SignatureMove => {
  const N = 4;
  const AIM = 760;
  const STEP = 520;
  const HALF = 22;
  const DMG = 14;
  interface Ghost { x: number; y: number; born: number; at: number; fired: boolean; laned: boolean; a: number }
  let ghosts: Ghost[] = [];
  return {
    durationMs: 3200,
    windupMs: 500,
    gesture: 'recoil',
    tell: 'AFTER-IMAGES',
    cast(time) {
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < N; i++) {
        const a = a0 + i * (Math.PI * 2 / N) + 0.4;
        const born = time + i * 140;
        ghosts.push({ x: tk.clampX(p.x + Math.cos(a) * 270, 50), y: clampN(p.y + Math.sin(a) * 270, FT + 40, tk.H - 40), born, at: time + tk.warn(AIM) + i * STEP, fired: false, laned: false, a: 0 });
      }
      tk.sfx('blink');
    },
    update(time) {
      const p = tk.player;
      for (const gh of ghosts) {
        if (gh.fired) continue;
        // Each keeps aiming at you until it is about to fire, then locks.
        if (time < gh.at - 380) gh.a = Math.atan2(p.y - gh.y, p.x - gh.x);
        if (time >= gh.at - 380 && !gh.laned) {
          gh.laned = true;
          tk.spawnLane({ x: gh.x, y: gh.y, angle: gh.a, halfW: HALF, warnMs: 380, fireMs: 300, damage: DMG });
        }
        if (time >= gh.at) { gh.fired = true; tk.sfx('beam-fire'); }
      }
      ghosts = ghosts.filter((gh) => time < gh.at + 500);
    },
    drawAir(g, time) {
      for (const gh of ghosts) {
        if (time < gh.born) continue;
        const a = gh.fired ? 1 - clampN((time - gh.at) / 500, 0, 1) : 0.85;
        // A ghost of her: the coil crown's rings and a body of crackle, nothing more.
        for (let k = 0; k < 3; k++) {
          g.lineStyle(2, O_MAIN, a * (0.8 - k * 0.2));
          g.strokeEllipse(gh.x, gh.y - 62 - k * 10, 34 - k * 8, 9 - k * 2);
        }
        g.lineStyle(2, O_LIT, a * 0.5); g.strokeEllipse(gh.x, gh.y - 14, 44, 64);
        crackle(g, gh.x, gh.y - 18, 30, Math.floor(time / 55) + Math.floor(gh.x), ARC, a, 7);
        g.fillStyle(ARC_CORE, a); g.fillCircle(gh.x - 7, gh.y - 30, 3); g.fillCircle(gh.x + 7, gh.y - 30, 3);
        if (!gh.fired) {
          // Its aim: a fine dotted line while it still turns, a bright one once it has locked
          // (drawn here, over the dark, because the lane's own telegraph is under it).
          const locked = gh.laned;
          for (let d = 30; d < (locked ? 900 : 220); d += 16) {
            g.fillStyle(locked ? ARC_CORE : ARC, locked ? 0.7 : 0.35);
            g.fillCircle(gh.x + Math.cos(gh.a) * d, gh.y + Math.sin(gh.a) * d, locked ? 2.4 : 1.8);
          }
        }
      }
    },
    onPhaseEnd() { ghosts = []; },
  };
};

// ═════════════════════════════════════════════════════════════════════
// V. THE ENDLESS CURRENT (hard)
// ═════════════════════════════════════════════════════════════════════

// ── Forked Sky ───────────────────────────────────────────────────────
// The sky strikes, forking. The bolt's shadow is drawn on the floor first — a trunk where you
// stand and branches running off it — and every tip of it lands. Three, in quick succession.

const forkedSky = (tk: BossToolkit): SignatureMove => {
  const WARN = 1100;
  const R = 52;
  const DMG = 15;
  interface Fork { born: number; at: number; pts: P[]; segs: [P, P][]; done: boolean }
  let forks: Fork[] = [];
  const make = (time: number) => {
    const p = tk.player;
    const root = { x: p.x, y: p.y };
    const pts: P[] = [root];
    const segs: [P, P][] = [];
    const branches = 3;
    for (let i = 0; i < branches; i++) {
      const a = Math.random() * Math.PI * 2;
      const mid = { x: root.x + Math.cos(a) * 90, y: root.y + Math.sin(a) * 90 };
      const tip = { x: tk.clampX(root.x + Math.cos(a + (Math.random() - 0.5) * 0.8) * 190, 40), y: clampN(root.y + Math.sin(a + (Math.random() - 0.5) * 0.8) * 190, FT + 40, tk.H - 40) };
      segs.push([root, mid], [mid, tip]);
      pts.push(tip);
    }
    forks.push({ born: time, at: time + tk.warn(WARN), pts, segs, done: false });
  };
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE SKY STRIKES',
    cast(time) {
      make(time);
      tk.schedule(700, () => make(tk.now));
      tk.schedule(1400, () => make(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const f of forks) {
        if (f.done || time < f.at) continue;
        f.done = true;
        tk.sfx('thunder');
        let hit = false;
        for (const pt of f.pts) {
          tk.boom(pt.x, pt.y, R, ARC);
          if (!hit && live(tk) && dist(p.x, p.y, pt.x, pt.y) < R + PLAYER_R * 0.6) { hit = true; tk.hitPlayer(DMG, p.x, p.y); }
        }
      }
      forks = forks.filter((f) => time < f.at + 400);
    },
    drawGround(g, time) {
      for (const f of forks) {
        if (f.done) continue;
        const k = clampN((time - f.born) / Math.max(1, f.at - f.born), 0, 1);
        // The shadow of the bolt on the floor: its branches, then the landing rings at the tips.
        for (const [a, b] of f.segs) { g.lineStyle(3, 0x000000, 0.25 + k * 0.3); g.lineBetween(a.x, a.y, b.x, b.y); }
        for (const pt of f.pts) {
          g.fillStyle(ARC, 0.06 + k * 0.18); g.fillCircle(pt.x, pt.y, R);
          g.lineStyle(2, ARC_CORE, 0.3 + k * 0.6); g.strokeCircle(pt.x, pt.y, R * (1.5 - k * 0.5));
        }
      }
    },
    drawAir(g, time) {
      for (const f of forks) {
        if (!f.done) continue;
        const a = 1 - clampN((time - f.at) / 400, 0, 1);
        const root = f.pts[0];
        bolt(g, root.x + Math.sin(f.at) * 60, FT - 30, root.x, root.y, Math.floor(f.at), ARC, 5, a, 0.18, 1);
        for (const [s, e] of f.segs) bolt(g, s.x, s.y, e.x, e.y, Math.floor(f.at) + Math.floor(e.x), ARC, 3, a, 0.25, 0);
      }
    },
    onPhaseEnd() { forks = []; },
  };
};

// ── The Live Crown ───────────────────────────────────────────────────
// The whole crown goes live. Porcelain insulator pads rise out of the floor; the floor hums,
// then bites everything that is not standing on a pad. Twice — the second set of pads shows
// while the first charge is still on.

const liveCrown = (tk: BossToolkit): SignatureMove => {
  const PADS = 4;
  const PAD_R = 50;
  const CHARGE = 1700;
  const ON = 600;
  const DMG = 18;
  interface Wave { pads: P[]; born: number; at: number; hit: boolean }
  let waves: Wave[] = [];
  const wave = (time: number, delay: number) => {
    const p = tk.player;
    const pads: P[] = [];
    for (let i = 0; i < PADS; i++) {
      let x = 0, y = 0;
      for (let k = 0; k < 14; k++) {
        x = 90 + Math.random() * (tk.W - 180); y = FT + 70 + Math.random() * (tk.H - FT - 120);
        // One pad is always within reach of you; none on top of another.
        const d = dist(x, y, p.x, p.y);
        if ((i > 0 || (d > 120 && d < 300)) && pads.every((q) => dist(q.x, q.y, x, y) > 200)) break;
      }
      pads.push({ x, y });
    }
    waves.push({ pads, born: time + delay, at: time + delay + tk.warn(CHARGE), hit: false });
  };
  const onPad = (w: Wave, x: number, y: number): boolean => w.pads.some((q) => dist(x, y, q.x, q.y) < PAD_R - 6);
  return {
    durationMs: 4600,
    windupMs: 700,
    gesture: 'slam',
    tell: 'THE LIVE CROWN',
    cast(time) { wave(time, 0); wave(time, tk.warn(CHARGE) + 200); tk.sfx('beam-charge'); },
    update(time) {
      const p = tk.player;
      for (const w of waves) {
        if (w.hit || time < w.at || time > w.at + ON || !live(tk)) continue;
        if (time - w.at < 20) tk.sfx('thunder');
        if (!onPad(w, p.x, p.y)) { w.hit = true; tk.hitPlayer(DMG, p.x, p.y); float(tk, p.x, p.y - 40, 'EARTHED', '#bfe8ff'); }
      }
      waves = waves.filter((w) => time < w.at + ON + 100);
    },
    drawGround(g, time) {
      for (const w of waves) {
        if (time < w.born) continue;
        const on = time >= w.at;
        const k = on ? 1 : clampN((time - w.born) / Math.max(1, w.at - w.born), 0, 1);
        // The floor charging: a blue wash that thickens, crawling with static.
        g.fillStyle(GRID_LIVE, on ? 0.32 : 0.04 + k * 0.12); g.fillRect(0, FT, tk.W, tk.H - FT);
        for (const q of w.pads) {
          g.fillStyle(STORM, on ? 1 : 0.6); g.fillCircle(q.x, q.y, PAD_R);
          g.fillStyle(PORCELAIN_DARK, 1); g.fillCircle(q.x, q.y, PAD_R - 6);
          g.fillStyle(PORCELAIN, 1); g.fillCircle(q.x, q.y - 2, PAD_R - 10);
          for (let r = PAD_R - 16; r > 8; r -= 9) { g.lineStyle(1.5, PORCELAIN_DARK, 0.8); g.strokeCircle(q.x, q.y - 2, r); }
          g.lineStyle(3, k > 0.75 && !on && Math.floor(time / 100) % 2 ? 0xffffff : AMBER, 0.9); g.strokeCircle(q.x, q.y, PAD_R);
        }
      }
    },
    drawAir(g, time) {
      for (const w of waves) {
        if (time < w.born) continue;
        const on = time >= w.at;
        const n = on ? 22 : Math.floor(clampN((time - w.born) / Math.max(1, w.at - w.born), 0, 1) * 10);
        for (let i = 0; i < n; i++) {
          const x = ((i * 173 + Math.floor(time / 70) * 61) % tk.W);
          const y = FT + ((i * 97 + Math.floor(time / 70) * 37) % (tk.H - FT));
          if (onPad(w, x, y)) continue;
          crackle(g, x, y, on ? 22 : 12, i + Math.floor(time / 60), ARC, on ? 0.9 : 0.5, 4);
        }
      }
    },
    onPhaseEnd() { waves = []; },
  };
};

// ── Body of Lightning ────────────────────────────────────────────────
// Her body becomes a bolt. A zigzag path is drawn across the room through where you stand; she
// goes down it in a blink, and the path stays live behind her for a moment.

const bodyOfLightning = (tk: BossToolkit): SignatureMove => {
  const WARN = 1000;
  const TRAVEL = 340;
  const STAY = 650;
  const HALF = 18;
  const DMG = 18;
  let path: P[] = [];
  let born = 0, goAt = 0;
  let hit = false;
  const along = (f: number): P => {
    if (path.length < 2) return { x: tk.bossX, y: tk.bossY };
    const n = path.length - 1;
    const s = clampN(f, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(s));
    const r = s - i;
    return { x: path[i].x + (path[i + 1].x - path[i].x) * r, y: path[i].y + (path[i + 1].y - path[i].y) * r };
  };
  return {
    durationMs: 2300,
    windupMs: 400,
    gesture: 'recoil',
    locksBody: true,
    tell: 'BODY OF LIGHTNING',
    cast(time) {
      const p = tk.player;
      const start = { x: tk.bossX, y: tk.bossY };
      const a = Math.atan2(p.y - start.y, p.x - start.x);
      const end = { x: tk.clampX(p.x + Math.cos(a) * 260, 60), y: clampN(p.y + Math.sin(a) * 260, FT + 50, tk.H - 50) };
      path = [start];
      // A zig, a zag, through you, a zig past you.
      const nx = -Math.sin(a), ny = Math.cos(a);
      for (let i = 1; i < 5; i++) {
        const f = i / 5;
        const side = (i % 2 ? 1 : -1) * (i === 3 ? 0 : 80);
        const bx = start.x + (end.x - start.x) * f + nx * side, by = start.y + (end.y - start.y) * f + ny * side;
        path.push({ x: tk.clampX(bx, 40), y: clampN(by, FT + 30, tk.H - 30) });
      }
      path.push(end);
      born = time; goAt = time + tk.warn(WARN); hit = false;
      tk.sfx('electric-charge');
    },
    update(time) {
      if (path.length < 2) return;
      if (time >= goAt && time <= goAt + TRAVEL) {
        const q = along((time - goAt) / TRAVEL);
        tk.host.setBossPos(q.x, q.y);
        if (time - goAt < 20) tk.sfx('thunder');
      }
      if (time >= goAt && time <= goAt + TRAVEL + STAY && !hit && live(tk)) {
        const p = tk.player;
        const reached = clampN((time - goAt) / TRAVEL, 0, 1) * (path.length - 1);
        for (let i = 0; i < path.length - 1 && i < reached; i++) {
          if (segDist(p.x, p.y, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y) < HALF + PLAYER_R * 0.6) {
            hit = true;
            tk.hitPlayer(DMG, p.x, p.y);
            float(tk, p.x, p.y - 40, 'STRUCK', '#e8f4ff');
            break;
          }
        }
      }
      if (time > goAt + TRAVEL + STAY + 200) path = [];
    },
    drawGround(g, time) {
      if (path.length < 2 || time >= goAt) return;
      const k = clampN((time - born) / Math.max(1, goAt - born), 0, 1);
      for (let i = 0; i < path.length - 1; i++) {
        g.lineStyle(HALF * 2, ARC, 0.05 + k * 0.12); g.lineBetween(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
        g.lineStyle(2, ARC_CORE, 0.3 + k * 0.6); g.lineBetween(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      }
      for (const q of path) { g.fillStyle(ARC_CORE, 0.6); g.fillCircle(q.x, q.y, 4); }
    },
    drawAir(g, time) {
      if (path.length < 2 || time < goAt) return;
      const reached = clampN((time - goAt) / TRAVEL, 0, 1) * (path.length - 1);
      const a = time > goAt + TRAVEL ? clampN(1 - (time - goAt - TRAVEL) / STAY, 0, 1) : 1;
      for (let i = 0; i < path.length - 1 && i < reached; i++) {
        bolt(g, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y, Math.floor(time / 40) + i * 5, ARC, 5, a, 0.18, 1);
      }
    },
    onPhaseEnd() { path = []; },
  };
};

// ═════════════════════════════════════════════════════════════════════
// Her body, her room
// ═════════════════════════════════════════════════════════════════════

/**
 * The Empress over the rig: a crown that is a coil — four copper toroids stacked over her head,
 * shrinking upward, arcs leaping between them; a brass meter set in her breast whose needle is
 * her own charge; a lightning rod for a sceptre; and three black cables trailing behind her
 * like a train, plugged into the Coil. Each phase reads differently: plugged in at the throne;
 * the Grid lit through her; the crown discharging; in the Blackout nothing of her but crackle
 * and eyes; on hard, her body is lightning.
 */
function drawOhmrine(g: Gfx, s: BossBodyState): void {
  const t = s.t / 1000;
  const r = s.radius;
  const seed = Math.floor(s.t / 60);
  const dark = s.phaseIdx === 3;
  const storm = s.phaseIdx >= 4;
  const back = s.facing + Math.PI;
  // The train of cables, trailing behind her to the floor (to the throne in phase I).
  if (!dark) {
    for (let k = -1; k <= 1; k++) {
      const a = back + k * 0.35;
      const len = s.phaseIdx === 0 ? Math.max(40, dist(s.x, s.y, THRONE.x, THRONE.y - 40)) : 70 + Math.abs(k) * 14;
      const ex = s.phaseIdx === 0 ? THRONE.x + k * 24 : s.x + Math.cos(a) * len;
      const ey = s.phaseIdx === 0 ? THRONE.y - 30 : s.y + Math.sin(a) * len * 0.6 + 26;
      g.lineStyle(5, 0x0a0a0a, 0.95);
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const f = i / 10;
        const x = s.x + (ex - s.x) * f, y = s.y + 10 + (ey - s.y - 10) * f + Math.sin(f * Math.PI) * 14;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      const f = (t * 1.6 + k * 0.3) % 1;
      g.fillStyle(ARC, 0.8); g.fillCircle(s.x + (ex - s.x) * f, s.y + 10 + (ey - s.y - 10) * f + Math.sin(f * Math.PI) * 14, 2.5);
    }
  }
  // The coil crown.
  const cy = s.y - r - 10;
  for (let k = 0; k < 4; k++) {
    const rx = r * (0.92 - k * 0.18), ry = rx * 0.26;
    const yy = cy - k * 13;
    if (dark) {
      g.lineStyle(1.5, O_MAIN, 0.35 + Math.sin(t * 9 + k) * 0.2); g.strokeEllipse(s.x, yy, rx * 2, ry * 2);
    } else {
      coilTurn(g, s.x, yy, rx, ry, 5 - k * 0.6, false);
      coilTurn(g, s.x, yy, rx, ry, 5 - k * 0.6, true);
    }
  }
  // Arcs between the turns, wild in the Tesla Crown.
  const arcs = s.phaseIdx === 2 ? 4 : storm ? 5 : 2;
  for (let k = 0; k < arcs; k++) {
    const a = t * (2 + k) + k * 1.7;
    const x1 = s.x + Math.cos(a) * r * 0.7, y1 = cy + Math.sin(a) * r * 0.16;
    const x2 = s.x + Math.cos(a + 1.2) * r * 0.4, y2 = cy - 39 + Math.sin(a + 1.2) * r * 0.08;
    bolt(g, x1, y1, x2, y2, seed + k, s.phaseIdx === 2 ? VIOLET : ARC, 1.6, 0.85, 0.3, 0);
  }
  if (s.phaseIdx === 2 || storm) {
    // Discharge off the crown's top: a streamer reaching out into the air.
    const a = -Math.PI / 2 + Math.sin(t * 3) * 0.9;
    bolt(g, s.x, cy - 44, s.x + Math.cos(a) * 70, cy - 44 + Math.sin(a) * 50, seed, VIOLET, 2, 0.8, 0.3, 2);
  }
  g.fillStyle(BRASS, dark ? 0.4 : 1); g.fillCircle(s.x, cy - 46, 4);
  // The meter in her breast — its needle is her charge in this phase.
  if (!dark) {
    meterDial(g, s.x, s.y + r * 0.22, r * 0.3, clampN(s.hpRatio, 0, 1) * 0.95, 0.95);
    if (s.phaseIdx === 1) {
      // The Grid lit through her robe: a lattice of live lines.
      g.lineStyle(1.2, GRID_LIVE, 0.45 + Math.sin(t * 6) * 0.2);
      for (let k = -2; k <= 2; k++) { g.lineBetween(s.x + k * r * 0.3, s.y - r * 0.6, s.x + k * r * 0.3, s.y + r * 0.8); g.lineBetween(s.x - r * 0.75, s.y + k * r * 0.3, s.x + r * 0.75, s.y + k * r * 0.3); }
    }
  }
  // The sceptre: a lightning rod in her lead hand, crackling at the tip.
  const h = s.hands[0];
  if (h) {
    const tx = h.x + Math.cos(s.facing - 0.5) * 8, ty = h.y - 44;
    g.lineStyle(3, IRON_DARK, dark ? 0.4 : 1); g.lineBetween(h.x, h.y + 10, tx, ty);
    g.lineStyle(1.5, IRON_LIT, dark ? 0.4 : 1); g.lineBetween(h.x, h.y + 10, tx, ty);
    g.fillStyle(COPPER_LIT, dark ? 0.5 : 1); g.fillTriangle(tx - 4, ty, tx + 4, ty, tx, ty - 10);
    crackle(g, tx, ty - 8, 10 + s.castGlow * 14, seed + 3, ARC, 0.6 + s.castGlow * 0.4, 4);
  }
  // In the Blackout, she is her crackle: a cloud of sparks where a body should be (and above the
  // dark, `drawOhmrineLit` paints it again — that is all of her you can see).
  if (dark) {
    crackle(g, s.x, s.y - 4, r * 1.1, seed, ARC, 0.85, 8);
    crackle(g, s.x + Math.sin(t * 5) * 8, s.y - r * 0.5, r * 0.6, seed + 11, VIOLET, 0.7, 5);
    glow(g, s.x, s.y, r * 1.8, ARC, 0.035, 3);
  }
  // The Endless Current: bolts running all through her.
  if (storm) {
    for (let k = 0; k < 4; k++) {
      const a = t * 4 + k * 1.6;
      bolt(g, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, s.x + Math.cos(a + 2.4) * r, s.y + Math.sin(a + 2.4) * r, seed + k * 3, ARC_CORE, 2, 0.8, 0.35, 1);
    }
    glow(g, s.x, s.y, r * 2.2, ARC, 0.05, 3);
  }
  if (s.enraged && !dark) crackle(g, s.x, s.y + r, r * 0.6, seed + 20, AMBER, 0.6, 4);
}

/**
 * What of the Empress shows through the Blackout's dark: her crackle — a cloud of sparks, the
 * faint rings of the coil crown, three eyes — and nothing else.
 */
function drawOhmrineLit(g: Gfx, s: BossBodyState): void {
  if (!s.inGloom) return;
  const t = s.t / 1000;
  const r = s.radius;
  const seed = Math.floor(s.t / 55);
  crackle(g, s.x, s.y - 10, r * 1.15, seed, ARC, 0.85, 8);
  crackle(g, s.x + Math.sin(t * 5) * 10, s.y - r, r * 0.65, seed + 5, VIOLET, 0.7, 5);
  const cy = s.y - r - 10;
  for (let k = 0; k < 4; k++) {
    const rx = r * (0.92 - k * 0.18);
    g.lineStyle(1.2, O_MAIN, 0.25 + Math.sin(t * 9 + k) * 0.15); g.strokeEllipse(s.x, cy - k * 13, rx * 2, rx * 0.52);
  }
  g.fillStyle(ARC_CORE, 0.9);
  g.fillCircle(s.x - 9, s.y - r * 0.55, 3); g.fillCircle(s.x + 9, s.y - r * 0.55, 3); g.fillCircle(s.x, s.y - r * 0.75, 2.4);
  if (s.castGlow > 0) glow(g, s.x, s.y - 10, r * (1.4 + s.castGlow), ARC, 0.05 * s.castGlow, 3);
}

/**
 * The Terminal at the top of the Crown Coil: a disc of copper ring-plates under the open storm,
 * the last turn of the coil round its edge, Tesla columns either side of the throne at the
 * back, the throne itself a seat in the ring with a great meter in its back, and a scatter of
 * porcelain studs where the Grid's mains come up through the floor.
 */
function drawTerminal(g: Gfx, W: number, H: number): void {
  // The storm sky above the ring (the HUD band and a strip below it).
  g.fillStyle(STORM, 1); g.fillRect(0, 0, W, FT + 50);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(0x1a2238, 0.5); g.fillEllipse(60 + i * 110, FT + 10 + (i % 3) * 10, 200, 50);
    g.fillStyle(0x0e1424, 0.6); g.fillEllipse(110 + i * 110, FT + 30, 160, 34);
  }
  // The ring floor: concentric plates of copper, bolted, patina in the seams.
  g.fillStyle(0x0c0e14, 1); g.fillRect(0, FT + 40, W, H - FT - 40);
  const cx = W / 2, cy = (FT + H) / 2 + 40;
  for (let i = 0; i < 9; i++) {
    const rx = 560 - i * 56, ry = 280 - i * 28;
    g.fillStyle(i % 2 ? dim(COPPER, 0.5) : dim(COPPER, 0.35), 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(2, PATINA, 0.45); g.strokeEllipse(cx, cy, rx * 2, ry * 2);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + i * 0.2;
      g.fillStyle(IRON_DARK, 0.9); g.fillCircle(cx + Math.cos(a) * (rx - 10), cy + Math.sin(a) * (ry - 6), 2);
    }
  }
  ohmSigil(g, cx, cy, 90, COPPER_LIT, 0.35);
  // The last turn of the coil round the edge of the ring.
  coilTurn(g, cx, cy + 10, 600, 300, 18, false);
  // The throne at the back of the ring.
  const tx = THRONE.x, ty = THRONE.y - 30;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(tx, ty + 40, 220, 40);
  g.fillStyle(IRON_DARK, 1); g.fillRect(tx - 100, ty + 10, 200, 26);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(tx - 70, ty - 70, 140, 84);
  g.fillStyle(COPPER, 1); g.fillRect(tx - 64, ty - 64, 128, 74);
  g.fillStyle(COPPER_LIT, 0.5); g.fillRect(tx - 64, ty - 64, 128, 4);
  meterDial(g, tx, ty - 32, 30, 0.97);
  for (const sx of [-1, 1]) insulator(g, tx + sx * 92, ty + 26, 1.3);
  // Tesla columns either side.
  for (const x of [130, W - 130]) {
    const base = FT + 190;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, base + 4, 130, 30);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - 50, base - 30, 100, 30);
    g.fillStyle(0x2a1a0e, 1); g.fillRect(x - 24, base - 170, 48, 140);
    for (let y = base - 170; y < base - 30; y += 4) { g.fillStyle(y % 8 === 0 ? COPPER : dim(COPPER, 0.25), 1); g.fillRect(x - 24, y, 48, 2.5); }
    coilTurn(g, x, base - 50, 44, 10, 5, true);
    g.fillStyle(0x6a6e78, 1); g.fillEllipse(x, base - 178, 110, 30);
    g.fillStyle(0xa8acb8, 1); g.fillEllipse(x, base - 182, 106, 24);
    g.fillStyle(0xe0e4ec, 0.5); g.fillEllipse(x - 20, base - 188, 36, 6);
  }
  // The mains coming up through the floor, studded with porcelain.
  busbar(g, 40, H - 26, W - 40, 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.fillStyle(PORCELAIN, 0.85); g.fillCircle(cx + Math.cos(a) * 470, cy + Math.sin(a) * 236, 5);
  }
  g.fillStyle(lit(O_DARK, 0.1), 0.15); g.fillRect(0, FT + 40, W, 6);
}

// ── The def ──────────────────────────────────────────────────────────

export const OHMRINE_BOSS: WorldBossDef = {
  worldId: 'isle:ohmrine',
  name: 'Empress Ohmrine',
  title: 'of the Grid, Sovereign of Voltreach',
  color: O_MAIN,
  colorLit: O_LIT,
  colorDark: O_DARK,
  accent: COPPER,
  damageMult: 1.45,

  intro: [
    'There is a draw on this tower I did not authorise. It is you.',
    'Six of my children switched off. My overseers short. My banks earthed by a jar-polisher. My cages, empty.',
    'Come into the ring, little load. Let me read your meter.',
  ],
  banter: [
    'Every household owes the Draw. You are a household of one. You are very far behind.',
    'A candle is a theft. Do you know what a whole lamplighter is? A burglary.',
    'I caught the storm. Somebody had to. It was only going to waste on the sea.',
    'Volt always drew too hard. Byte always counted wrong. Both never could decide.',
    'The Endless Current will light the whole sea forever. It only needs a little more. It always only needs a little more.',
    'You are not resisting me. You are resistance. I have a meter for that.',
    'Switched off. Switched off. Switched off. Earthed.',
    'When the Bell goes, everyone on Voltreach holds their breath. Listen. They are holding it now.',
  ],
  defeatLine: 'THE GRID GOES DARK',
  resumeLine: 'You again. Still drawing on my tower. I have kept your meter running.',

  phases: [
    {
      name: 'The Draw',
      line: 'Sit still and give. Everyone gives. That is all the Grid has ever asked.',
      hp: 600,
      cycle: ['sig:draw', 'volley', 'sig:meter', 'radial', 'sig:bell', 'lanes', 'sig:draw', 'sig:meter', 'barrage', 'sig:bell'],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'The Grid',
      line: 'Then stand on it. All of it. Every square of my isle is live if I say it is.',
      hp: 650,
      cycle: ['sig:grid', 'sig:busbars', 'homing', 'sig:fuses', 'spiral', 'sig:grid', 'sig:fuses', 'volley', 'sig:busbars', 'minefield'],
      harass: ['h-orbs', 'h-lane'],
      restMs: 1000,
      harassMs: 3000,
    },
    {
      name: 'Tesla Crown',
      line: 'Enough metering. Let the Coil speak for itself.',
      hp: 700,
      cycle: ['sig:spiral', 'sig:balls', 'sig:rods', 'barrage', 'sig:spiral', 'radial', 'sig:rods', 'sig:balls', 'sweep', 'sig:spiral'],
      harass: ['h-snipe', 'h-rune'],
      restMs: 960,
      harassMs: 2800,
    },
    {
      name: 'Blackout',
      line: '...what have you done to my lights. WHAT HAVE YOU DONE TO MY LIGHTS.',
      hp: 750,
      cycle: ['sig:footprints', 'sig:flash', 'sig:afterimages', 'stream', 'sig:flash', 'sig:footprints', 'quake', 'sig:afterimages', 'sanctuary'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 900,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'SHE IS THE STORM NOW',
    extraPhase: {
      name: 'The Endless Current',
      line: 'Then I will not hold it. I will BE it. Plug me in.',
      hp: 600,
      cycle: ['sig:forks', 'sig:crown', 'sig:body', 'volley', 'sig:forks', 'sig:body', 'sig:crown', 'homing', 'sig:forks', 'sig:body'],
      harass: ['h-rune', 'h-lane', 'h-snipe'],
      restMs: 850,
      harassMs: 2400,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 20 },
    lanes: { halfW: 28 },
  },

  signatures: {
    draw: theDraw,
    meter: meterReading,
    bell: brownoutBell,
    grid: theGrid,
    busbars,
    fuses: blownFuses,
    spiral: teslaSpiral,
    balls: ballLightning,
    rods: lightningRods,
    footprints,
    flash: lightningFlash,
    afterimages: afterImages,
    forks: forkedSky,
    crown: liveCrown,
    body: bodyOfLightning,
  },

  look: { crest: 'none', pattern: 'grid', aura: 'sparks', hands: 'orb', torsoR: 42, mouth: 'line', eyes: 2, eyeColor: 0xe0f4ff },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'none', tint: 'cold', look: { pattern: 'grid', aura: 'sparks', hands: 'gauntlet' } },
    { movement: 'orbit', gimmick: 'none', look: { pattern: 'static', aura: 'sparks', hands: 'wisp', mouth: 'grin' } },
    { movement: 'stalk', gimmick: 'gloom', tint: 'void', look: { pattern: 'static', aura: 'glitch', hands: 'wisp', mouth: 'none', eyes: 3 } },
    { movement: 'rush', gimmick: 'none', tint: 'pale', look: { pattern: 'static', aura: 'sparks', hands: 'blade', eyes: 1, torsoR: 40 } },
  ],

  drawDecor: drawOhmrine,
  drawLit: drawOhmrineLit,
  drawArena: drawTerminal,
};
