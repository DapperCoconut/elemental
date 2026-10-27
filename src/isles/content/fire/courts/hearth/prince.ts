import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { brandSigil } from '../../../../art/IsleArt';
import {
  BRAND, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE, KINDLE_DARK, KINDLE_GOLD, KINDLE_LIT, SMOKE, SOOT,
} from './palette';

/**
 * Prince Kindle, the Hearthwarden — King Ashgrave's eldest, governor of the Hearth Court.
 *
 * Kindle is not cruel; he is *dutiful*, which is worse. He believes the fire must be kept, and
 * he fights by keeping it: he plants tithe hearths round his hall and lets them do the work.
 *
 * • **The Kept Flame** (rooted): Kindle stands his ground and plants up to four tithe hearths
 *   on fixed hall slots. Each puffs a slow ring of embers on its own clock, and when he calls
 *   the tithe every lit hearth throws a homing coal at you *and heals him*. Stand on a hearth
 *   for a second to douse it — that's the whole answer to the phase.
 * • **Every Hearth Answers** (stalking): he relights every cold hearth and chains them: lines
 *   of fire run hearth to hearth round the room, each line warning, burning and resting on its
 *   own staggered clock. Douse a hearth and both its lines die with it.
 * • **The Royal Brand** (hard, orbiting, crowned): the hearths are drawn into the floor and
 *   the King's sigil is burnt into it stroke by stroke — right arc, left arc, the flame's two
 *   sides, the coal at its heart. The ring is broken at the top, as the brand always is: the
 *   gap is where you stand.
 *
 * Signatures share one state per fight (the hearths), keyed on the toolkit. Only `kept-flame`
 * runs the hearths' clocks and draws them; the others plant, relight or call on them.
 */

// ── Shared hearth state ──────────────────────────────────────────────

interface Hearth {
  slot: number;
  x: number; y: number;
  lit: boolean;
  /** While it is still falling into place. */
  landsAt: number;
  plantedAt: number;
  douse: number;
  /** Personal puff clock offset. */
  offset: number;
}

interface KindleState {
  hearths: Hearth[];
  chained: boolean;
  /** Hearth activity holds still across a phase change. */
  quietUntil: number;
  lineHitAt: number;
}

const STATES = new WeakMap<BossToolkit, KindleState>();
function state(tk: BossToolkit): KindleState {
  let s = STATES.get(tk);
  if (!s) {
    s = { hearths: [], chained: false, quietUntil: 0, lineHitAt: 0 };
    STATES.set(tk, s);
  }
  return s;
}

const MAX_HEARTHS = 4;
const DOUSE_R = 38;
const DOUSE_MS = 1000;
const LAND_MS = 1150;

/** Six fixed slots round the hall — an ellipse that fits under the HUD strip. */
function slotPos(tk: BossToolkit, i: number): { x: number; y: number } {
  const a = (Math.PI * 2 * i) / 6 + Math.PI / 6;
  return { x: tk.W / 2 + Math.cos(a) * 270, y: tk.H * 0.58 + Math.sin(a) * 185 };
}

/** Plant one hearth on the free slot nearest the player. Returns false if the hall is full. */
function plant(tk: BossToolkit, s: KindleState, time: number, delay = 0): boolean {
  if (s.hearths.length >= MAX_HEARTHS) return false;
  const used = new Set(s.hearths.map((h) => h.slot));
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < 6; i++) {
    if (used.has(i)) continue;
    const p = slotPos(tk, i);
    const d = Phaser.Math.Distance.Between(p.x, p.y, tk.player.x, tk.player.y);
    if (d < bd) { bd = d; best = i; }
  }
  if (best < 0) return false;
  const p = slotPos(tk, best);
  const landsAt = time + delay + tk.warn(LAND_MS);
  s.hearths.push({ slot: best, x: p.x, y: p.y, lit: true, landsAt, plantedAt: time, douse: 0, offset: Math.random() * 3000 });
  tk.schedule(landsAt - time, () => {
    tk.explode(p.x, p.y, 58, 14, KINDLE);
    tk.sfx('anvil');
  });
  return true;
}

const lit = (s: KindleState, time: number) => s.hearths.filter((h) => h.lit && time >= h.landsAt);

/** The live chain: lit hearths in order round the hall, each joined to the next. */
function chainLinks(s: KindleState, time: number): [Hearth, Hearth, number][] {
  const L = lit(s, time).sort((a, b) => a.slot - b.slot);
  if (L.length < 2) return [];
  const out: [Hearth, Hearth, number][] = [];
  for (let i = 0; i < L.length; i++) {
    if (L.length === 2 && i === 1) break;
    out.push([L[i], L[(i + 1) % L.length], i]);
  }
  return out;
}

const LINE_PERIOD = 5600;
const LINE_WARN = 1500;
const LINE_BURN = 2000;
const LINE_HALF = 13;

function linePhase(time: number, i: number): 'off' | 'warn' | 'burn' {
  const t = ((time + i * 1400) % LINE_PERIOD);
  if (t < LINE_WARN) return 'warn';
  if (t < LINE_WARN + LINE_BURN) return 'burn';
  return 'off';
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// ── Signature: The Kept Flame ────────────────────────────────────────
// Plants a hearth, and — as the one signature that owns them — runs every hearth's clock for
// the whole fight: ember puffs, dousing, and (once chained) the fire lines.

const keptFlame = (tk: BossToolkit): SignatureMove => {
  const s = state(tk);
  let lastTime = -1;
  return {
    durationMs: 1300,
    windupMs: 700,
    gesture: 'point',
    tell: 'THE KEPT FLAME',
    cast(time) {
      if (!plant(tk, s, time)) {
        // A full hall: every hearth puffs together, 0.6s from now.
        const P = s.chained ? 5600 : 4200;
        for (const h of lit(s, time)) h.offset = P - 600 - (time % P);
      }
      tk.sfx('flame-burst');
    },
    update(time, dt) {
      const prevTime = lastTime < 0 ? time : lastTime;
      lastTime = time;
      if (time < s.quietUntil) return;
      const p = tk.player;
      const puffEvery = s.chained ? 5600 : 4200;
      for (const h of s.hearths) {
        if (time < h.landsAt) continue;
        // Dousing: stand on it.
        if (h.lit && p.active && Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) < DOUSE_R) {
          h.douse += dt * 1000;
          if (h.douse >= DOUSE_MS) {
            h.lit = false;
            h.douse = 0;
            tk.host.showFloatingText(h.x, h.y - 40, 'DOUSED', '#bfe8ff');
            tk.sfx('sizzle');
          }
        } else {
          h.douse = Math.max(0, h.douse - dt * 2400);
        }
        if (!h.lit) continue;
        // The puff: a slow ring of six embers, gaps wide enough to walk.
        const t = (time + h.offset) % puffEvery;
        const prev = (prevTime + h.offset) % puffEvery;
        if (t < prev) {
          const a0 = Math.random() * Math.PI;
          for (let k = 0; k < 6; k++) {
            const a = a0 + (Math.PI * 2 * k) / 6;
            tk.spawnBullet({ x: h.x + Math.cos(a) * 20, y: h.y - 14 + Math.sin(a) * 20, angle: a, speed: 120, damage: 8, r: 6, lifeMs: 4200, color: EMBER_LIT });
          }
        }
      }
      // Fire lines, once the hearths answer one another.
      if (s.chained && p.active && p.hp > 0 && time - s.lineHitAt > 650) {
        for (const [a, b, i] of chainLinks(s, time)) {
          if (linePhase(time, i) !== 'burn') continue;
          if (segDist(p.x, p.y, a.x, a.y - 12, b.x, b.y - 12) < LINE_HALF + 14) {
            s.lineHitAt = time;
            tk.hitPlayer(11, p.x, p.y);
            break;
          }
        }
      }
    },
    drawGround(g, time) {
      // Lines under the hearths.
      if (s.chained) {
        for (const [a, b, i] of chainLinks(s, time)) {
          const ph = linePhase(time, i);
          const ax = a.x, ay = a.y - 12, bx = b.x, by = b.y - 12;
          if (ph === 'warn') {
            const k = ((time + i * 1400) % LINE_PERIOD) / LINE_WARN;
            g.lineStyle(LINE_HALF * 2, EMBER_DARK, 0.18 + k * 0.14);
            g.lineBetween(ax, ay, bx, by);
            // Sparks running hearth to hearth — the fuse being lit.
            const len = Math.hypot(bx - ax, by - ay);
            for (let d = 0; d < len; d += 26) {
              const on = ((d / len) < k);
              g.fillStyle(on ? EMBER_LIT : EMBER_DARK, on ? 0.95 : 0.5);
              g.fillCircle(ax + (bx - ax) * (d / len), ay + (by - ay) * (d / len), on ? 3 : 2);
            }
            if (k > 0.8 && Math.floor(time / 80) % 2 === 0) {
              g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(ax, ay, bx, by);
            }
          } else if (ph === 'burn') {
            g.lineStyle(LINE_HALF * 2.4, EMBER, 0.45); g.lineBetween(ax, ay, bx, by);
            g.lineStyle(LINE_HALF, EMBER_LIT, 0.9); g.lineBetween(ax, ay, bx, by);
            const len = Math.hypot(bx - ax, by - ay);
            const nx = -(by - ay) / len, ny = (bx - ax) / len;
            for (let d = 14; d < len - 14; d += 22) {
              const t = d / len;
              const h = 10 + Math.sin(time / 70 + d) * 6;
              const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
              g.lineStyle(2.5, KINDLE_GOLD, 0.85);
              g.lineBetween(x, y, x + nx * (Math.sin(d) > 0 ? h : -h) * 0.4, y - h);
            }
          } else {
            g.lineStyle(2, SOOT, 0.35); g.lineBetween(ax, ay, bx, by);
          }
        }
      }
      for (const h of s.hearths) {
        if (time < h.landsAt) {
          const k = 1 - (h.landsAt - time) / Math.max(1, h.landsAt - h.plantedAt);
          g.fillStyle(KINDLE, 0.12 + k * 0.2); g.fillCircle(h.x, h.y, 58);
          g.lineStyle(2.5, KINDLE_LIT, 0.5 + k * 0.5); g.strokeCircle(h.x, h.y, 58);
          brandSigil(g, h.x, h.y, 18 * k + 6, KINDLE_GOLD, 0.3 + k * 0.5);
          continue;
        }
        drawHearth(g, h, time);
      }
    },
    drawAir(g, time) {
      for (const h of s.hearths) {
        if (time < h.landsAt) {
          // The hearth itself, dropping out of the dark.
          const k = (h.landsAt - time) / Math.max(1, h.landsAt - h.plantedAt);
          drawHearthBody(g, h.x, h.y - k * 260, true, time);
          continue;
        }
        if (h.lit) {
          for (let i = 0; i < 3; i++) {
            const hh = 14 + Math.sin(time / 100 + i * 2 + h.slot) * 5;
            g.fillStyle(i === 1 ? EMBER_LIT : EMBER, 0.9);
            g.fillTriangle(h.x - 12 + i * 8, h.y - 22, h.x - 4 + i * 8, h.y - 22, h.x - 8 + i * 8, h.y - 22 - hh);
          }
        } else {
          const ph = (time % 1600) / 1600;
          g.fillStyle(SMOKE, 0.4 * (1 - ph)); g.fillCircle(h.x + ph * 8, h.y - 24 - ph * 30, 4 + ph * 6);
        }
        if (h.douse > 0) {
          const k = h.douse / DOUSE_MS;
          g.lineStyle(4, 0xbfe8ff, 0.95);
          g.beginPath(); g.arc(h.x, h.y - 10, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() {
      s.quietUntil = tk.now + 2600;
      s.hearths = s.hearths.filter((h) => tk.now >= h.landsAt);
      for (const h of s.hearths) h.douse = 0;
    },
  };
};

// ── Signature: The Tithe Is Called ───────────────────────────────────
// Every lit hearth pays: one homing coal each, thrown at you, and a mouthful of heat to him.
// A hall of cold hearths pays nothing — this is the move that makes dousing matter.

const titheCall = (tk: BossToolkit): SignatureMove => {
  const s = state(tk);
  let fxUntil = 0;
  let fxFrom: { x: number; y: number }[] = [];
  return {
    durationMs: 1500,
    windupMs: 800,
    gesture: 'raise',
    tell: 'THE TITHE IS CALLED',
    cast(time) {
      const L = lit(s, time);
      if (!L.length) {
        plant(tk, s, time);
        tk.host.showFloatingText(tk.bossX, tk.bossY - 60, 'No hearth answers. Then I plant one.', '#ffd27a');
        return;
      }
      fxFrom = L.map((h) => ({ x: h.x, y: h.y - 20 }));
      fxUntil = time + 700;
      L.forEach((h, i) => {
        tk.schedule(i * 160, () => {
          const a = tk.angleToPlayer(h.x, h.y);
          tk.spawnBullet({ x: h.x, y: h.y - 22, angle: a, speed: 165, damage: 12, r: 8, turn: 1.35, lifeMs: 4400 });
        });
      });
      tk.healBoss(5 * L.length);
      tk.sfx('money');
    },
    drawAir(g, time) {
      if (time >= fxUntil) return;
      const k = 1 - (fxUntil - time) / 700;
      // Heat drawn from every lit hearth back to the Prince.
      for (const f of fxFrom) {
        const x = f.x + (tk.bossX - f.x) * k, y = f.y + (tk.bossY - f.y) * k;
        g.fillStyle(KINDLE_GOLD, 0.9 * (1 - k * 0.5)); g.fillCircle(x, y, 5);
        g.lineStyle(2, EMBER_LIT, 0.4); g.lineBetween(f.x, f.y, x, y);
      }
    },
  };
};

// ── Signature: Ash Census ────────────────────────────────────────────
// Kindle counts the household. Six cobbles round you are numbered one to six in ash and go up in
// that order. The numbers are the tell — walk from the high numbers to the ones already spent.

const census = (tk: BossToolkit): SignatureMove => {
  interface Mark { x: number; y: number; n: number; firesAt: number; bornAt: number; dealt: boolean }
  let marks: Mark[] = [];
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'point',
    tell: 'ASH CENSUS',
    cast(time) {
      const p = tk.player;
      marks = [];
      const turn = Math.random() < 0.5 ? 1 : -1;
      const a0 = Math.random() * Math.PI * 2;
      for (let n = 0; n < 6; n++) {
        const a = a0 + turn * n * 1.05;
        const r = n === 0 ? 0 : 95 + (n % 2) * 45;
        const x = tk.clampX(p.x + Math.cos(a) * r, 60);
        const y = tk.clampY(p.y + Math.sin(a) * r, 60);
        marks.push({ x, y, n: n + 1, bornAt: time, firesAt: time + tk.warn(1350) + n * 330, dealt: false });
      }
      tk.sfx('clock-tick');
    },
    update(time) {
      for (const m of marks) {
        if (m.dealt || time < m.firesAt) continue;
        m.dealt = true;
        tk.explode(m.x, m.y, 52, 13, EMBER);
        tk.sfx('explosion-small');
      }
      marks = marks.filter((m) => !m.dealt || time < m.firesAt + 500);
    },
    drawGround(g, time) {
      for (const m of marks) {
        if (m.dealt) {
          const k = (time - m.firesAt) / 500;
          g.fillStyle(SOOT, 0.5 * (1 - k)); g.fillCircle(m.x, m.y, 52);
          continue;
        }
        const k = Phaser.Math.Clamp(1 - (m.firesAt - time) / Math.max(1, m.firesAt - m.bornAt), 0, 1);
        g.fillStyle(SOOT, 0.35); g.fillCircle(m.x, m.y, 52);
        g.fillStyle(EMBER, 0.08 + k * 0.3); g.fillCircle(m.x, m.y, 52 * k);
        g.lineStyle(2, KINDLE_LIT, 0.4 + k * 0.5); g.strokeCircle(m.x, m.y, 52);
        const hot = k > 0.8 && Math.floor(time / 90) % 2 === 0;
        digit(g, m.n, m.x, m.y, 22, hot ? 0xffffff : KINDLE_GOLD, 0.6 + k * 0.4);
      }
    },
    onPhaseEnd() { marks = []; },
  };
};

// ── Signature: The Signet ────────────────────────────────────────────
// Kindle presses his signet to the floor three times, chasing you: each press is the brand's
// shape spreading under your feet, then a hiss and a scorched sigil left behind.

const signet = (tk: BossToolkit): SignatureMove => {
  interface Stamp { x: number; y: number; bornAt: number; firesAt: number; dealt: boolean }
  let stamps: Stamp[] = [];
  return {
    durationMs: 2100,
    windupMs: 650,
    gesture: 'slam',
    tell: 'THE SIGNET',
    cast(time) {
      stamps = [];
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 480, () => {
          const p = tk.player;
          stamps.push({ x: tk.clampX(p.x, 70), y: tk.clampY(p.y, 70), bornAt: tk.now, firesAt: tk.now + tk.warn(1050), dealt: false });
        });
      }
    },
    update(time) {
      for (const s of stamps) {
        if (s.dealt || time < s.firesAt) continue;
        s.dealt = true;
        tk.explode(s.x, s.y, 72, 16, BRAND);
        tk.sfx('hammer-forge');
      }
      stamps = stamps.filter((s) => !s.dealt || time < s.firesAt + 3200);
    },
    drawGround(g, time) {
      for (const s of stamps) {
        if (s.dealt) {
          const k = (time - s.firesAt) / 3200;
          brandSigil(g, s.x, s.y, 46, 0x2a140c, 0.8 * (1 - k));
          brandSigil(g, s.x, s.y, 46, BRAND, 0.35 * (1 - k) * (1 - k));
          continue;
        }
        const k = Phaser.Math.Clamp(1 - (s.firesAt - time) / Math.max(1, s.firesAt - s.bornAt), 0, 1);
        g.fillStyle(KINDLE_DARK, 0.2 + k * 0.15); g.fillCircle(s.x, s.y, 72);
        g.lineStyle(2.5, KINDLE_LIT, 0.5 + k * 0.5); g.strokeCircle(s.x, s.y, 72);
        brandSigil(g, s.x, s.y, 20 + k * 30, KINDLE_GOLD, 0.35 + k * 0.5);
        if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.6); g.strokeCircle(s.x, s.y, 75); }
      }
    },
    drawAir(g, time) {
      // The signet ring descending onto each pending stamp.
      for (const s of stamps) {
        if (s.dealt) continue;
        const k = Phaser.Math.Clamp(1 - (s.firesAt - time) / Math.max(1, s.firesAt - s.bornAt), 0, 1);
        const y = s.y - (1 - k) * 120 - 10;
        g.fillStyle(0x000000, 0.25 * k); g.fillEllipse(s.x, s.y, 40 * k, 12 * k);
        g.lineStyle(5, KINDLE_GOLD, 0.9); g.strokeCircle(s.x, y, 13);
        g.fillStyle(KINDLE, 1); g.fillRoundedRect(s.x - 9, y - 22, 18, 12, 3);
        brandSigil(g, s.x, y - 16, 4, KINDLE_GOLD, 1);
      }
    },
    onPhaseEnd() { stamps = []; },
  };
};

// ── Signature: Every Hearth Answers ──────────────────────────────────
// Phase two's opener and its reset: every cold hearth relights, the hall is filled to three,
// and the hearths begin answering one another down lines of fire.

const answer = (tk: BossToolkit): SignatureMove => {
  const s = state(tk);
  let fxUntil = 0;
  return {
    durationMs: 1700,
    windupMs: 900,
    hold: 'conduct',
    tell: 'EVERY HEARTH ANSWERS',
    cast(time) {
      let relit = 0;
      for (const h of s.hearths) if (!h.lit) { h.lit = true; relit++; }
      let n = 0;
      while (s.hearths.length < 3 && plant(tk, s, time, n * 250)) n++;
      s.chained = true;
      fxUntil = time + 900;
      tk.host.showFloatingText(tk.bossX, tk.bossY - 64, relit ? `${relit} relit` : 'Answer me.', '#ffd27a');
      tk.sfx('inferno');
    },
    drawAir(g, time) {
      if (time >= fxUntil) return;
      const k = 1 - (fxUntil - time) / 900;
      for (const h of s.hearths) {
        g.lineStyle(3, KINDLE_GOLD, 0.8 * (1 - k));
        g.strokeCircle(h.x, h.y - 10, 20 + k * 50);
        g.lineStyle(1.5, EMBER_LIT, 0.5 * (1 - k));
        g.lineBetween(tk.bossX, tk.bossY, h.x, h.y - 10);
      }
    },
  };
};

// ── Signature: The Royal Brand ───────────────────────────────────────
// Hard mode's third phase. The hearths sink into the floor and the King's sigil is burnt into
// the hall one stroke at a time; every stroke warns, then burns until the whole brand flares and
// fades. Its ring is broken at the top — the brand always is — and that gap is the safe ground.

type Stroke =
  | { kind: 'arc'; a0: number; a1: number }
  | { kind: 'edge'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'disc'; x: number; y: number; r: number };

const royalBrand = (tk: BossToolkit): SignatureMove => {
  const s = state(tk);
  const STROKE_HALF = 17;
  let active = false;
  let startAt = 0;
  let cx = 0, cy = 0, R = 0;
  let strokes: Stroke[] = [];
  let flared = false;
  let lastHit = 0;
  const STEP = 1250;
  const WARN = 1200;
  const flareAt = () => startAt + strokes.length * STEP + WARN + 600;
  const endAt = () => flareAt() + 1100;

  function build(): void {
    cx = tk.W / 2; cy = tk.H * 0.57; R = 215;
    const tl = { x: cx - R * 0.45, y: cy + R * 0.45 };
    const tr = { x: cx + R * 0.45, y: cy + R * 0.45 };
    const tp = { x: cx, y: cy - R * 0.75 };
    strokes = [
      { kind: 'arc', a0: -Math.PI * 0.35, a1: Math.PI * 0.5 },
      { kind: 'arc', a0: Math.PI * 0.5, a1: Math.PI * 1.35 },
      { kind: 'edge', x1: tl.x, y1: tl.y, x2: tp.x, y2: tp.y },
      { kind: 'edge', x1: tr.x, y1: tr.y, x2: tp.x, y2: tp.y },
      { kind: 'disc', x: cx, y: cy + R * 0.3, r: R * 0.36 },
    ];
  }

  function on(st: Stroke, x: number, y: number, pad: number): boolean {
    if (st.kind === 'disc') return Math.hypot(x - st.x, y - st.y) < st.r + pad;
    if (st.kind === 'edge') return segDist(x, y, st.x1, st.y1, st.x2, st.y2) < STROKE_HALF + pad;
    const d = Math.hypot(x - cx, y - cy);
    if (Math.abs(d - R) > STROKE_HALF + pad) return false;
    let a = Math.atan2(y - cy, x - cx);
    while (a < st.a0) a += Math.PI * 2;
    while (a > st.a0 + Math.PI * 2) a -= Math.PI * 2;
    return a <= st.a1;
  }

  function trace(g: Phaser.GameObjects.Graphics, st: Stroke, w: number, color: number, a: number, upTo = 1): void {
    if (st.kind === 'disc') {
      g.fillStyle(color, a * 0.6); g.fillCircle(st.x, st.y, st.r * upTo);
      g.lineStyle(Math.min(w, 6), color, a); g.strokeCircle(st.x, st.y, st.r);
      return;
    }
    g.lineStyle(w, color, a);
    if (st.kind === 'edge') {
      g.lineBetween(st.x1, st.y1, st.x1 + (st.x2 - st.x1) * upTo, st.y1 + (st.y2 - st.y1) * upTo);
    } else {
      g.beginPath(); g.arc(cx, cy, R, st.a0, st.a0 + (st.a1 - st.a0) * upTo, false); g.strokePath();
    }
  }

  return {
    durationMs: 2600,
    windupMs: 1000,
    hold: 'brace',
    tell: 'THE ROYAL BRAND',
    cast(time) {
      // The hearths sink into the floor: the brand is all the fire there is now.
      s.hearths = [];
      s.chained = false;
      build();
      active = true;
      flared = false;
      startAt = time;
      tk.sfx('judgement');
    },
    update(time) {
      if (!active) return;
      if (time >= endAt()) { active = false; return; }
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      if (!flared && time >= flareAt()) {
        flared = true;
        tk.scene.cameras.main.shake(260, 0.006);
        tk.sfx('explosion-large');
        if (strokes.some((st) => on(st, p.x, p.y, 10))) tk.hitPlayer(18, p.x, p.y);
      }
      if (time - lastHit < 600) return;
      for (let i = 0; i < strokes.length; i++) {
        const burnsAt = startAt + i * STEP + WARN;
        if (time < burnsAt || time > flareAt()) continue;
        if (on(strokes[i], p.x, p.y, 8)) {
          lastHit = time;
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.75, 500);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      // The faint whole of the brand, so the gap at the top can be read from the start.
      for (const st of strokes) trace(g, st, 2, KINDLE_GOLD, 0.18);
      g.lineStyle(2, 0xd8ffd8, 0.5);
      for (const a of [-Math.PI * 0.35, Math.PI * 1.35]) {
        g.lineBetween(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 30));
      }
      const fade = time > flareAt() ? 1 - (time - flareAt()) / 1100 : 1;
      for (let i = 0; i < strokes.length; i++) {
        const st = strokes[i];
        const t0 = startAt + i * STEP;
        if (time < t0) continue;
        if (time < t0 + WARN) {
          // Being drawn: a bright line racing along the stroke.
          const k = (time - t0) / WARN;
          trace(g, st, STROKE_HALF * 2, EMBER_DARK, 0.25);
          trace(g, st, 3, KINDLE_GOLD, 0.95, k);
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) trace(g, st, STROKE_HALF * 2, 0xffffff, 0.15);
        } else {
          const flick = 1 + Math.sin(time / 60 + i) * 0.1;
          trace(g, st, STROKE_HALF * 2.4 * flick, EMBER, 0.45 * fade);
          trace(g, st, STROKE_HALF * 0.9, EMBER_LIT, 0.9 * fade);
          if (st.kind === 'disc') {
            g.fillStyle(KINDLE_GOLD, 0.25 * fade); g.fillCircle(st.x, st.y, st.r * 0.6);
          }
        }
      }
      if (flared) {
        const k = (time - flareAt()) / 1100;
        g.lineStyle(10, 0xffffff, 0.5 * (1 - k));
        g.beginPath(); g.arc(cx, cy, R, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Drawing helpers ──────────────────────────────────────────────────

/** A tithe hearth: an iron fire-basket on a hearthstone, the brand cast in its front. */
function drawHearthBody(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean, time: number): void {
  g.fillStyle(IRON, 1);
  g.fillRect(x - 20, y - 26, 40, 6);
  g.fillRect(x - 18, y - 22, 4, 22); g.fillRect(x + 14, y - 22, 4, 22);
  for (let i = -1; i <= 1; i++) g.fillRect(x + i * 9 - 1, y - 22, 2, 16);
  g.fillStyle(lit ? EMBER : 0x2b2725, 1); g.fillEllipse(x, y - 24, 32, 9);
  if (lit) { g.fillStyle(EMBER_LIT, 0.8 + Math.sin(time / 120) * 0.2); g.fillEllipse(x, y - 25, 18, 5); }
  brandSigil(g, x, y - 12, 5, lit ? KINDLE_GOLD : 0x4a4541, 1);
}

function drawHearth(g: Phaser.GameObjects.Graphics, h: Hearth, time: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(h.x, h.y + 4, 64, 18);
  g.fillStyle(0x4f4a46, 1); g.fillEllipse(h.x, h.y, 56, 18);
  g.fillStyle(0x5d5853, 1); g.fillEllipse(h.x, h.y - 2, 50, 14);
  if (h.lit) {
    g.fillStyle(GLOW, 0.08); g.fillCircle(h.x, h.y - 10, 50);
    g.lineStyle(1.5, 0xbfe8ff, 0.25 + Math.sin(time / 250) * 0.1);
    g.strokeCircle(h.x, h.y, DOUSE_R);
  }
  drawHearthBody(g, h.x, h.y, h.lit, time);
}

/** Seven-segment numerals, drawn in ash-gold — the census's numbers. */
function digit(g: Phaser.GameObjects.Graphics, n: number, x: number, y: number, h: number, color: number, a: number): void {
  const segs: Record<number, string> = { 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc' };
  const w = h * 0.55;
  const top = y - h / 2, mid = y, bot = y + h / 2, l = x - w / 2, r = x + w / 2;
  const lines: Record<string, [number, number, number, number]> = {
    a: [l, top, r, top], b: [r, top, r, mid], c: [r, mid, r, bot], d: [l, bot, r, bot],
    e: [l, mid, l, bot], f: [l, top, l, mid], g: [l, mid, r, mid],
  };
  g.lineStyle(4, color, a);
  for (const ch of segs[n] ?? '') {
    const [x1, y1, x2, y2] = lines[ch];
    g.lineBetween(x1, y1, x2, y2);
  }
}

// ── The def ──────────────────────────────────────────────────────────

export const KINDLE_BOSS: WorldBossDef = {
  worldId: 'isle:kindle',
  name: 'Prince Kindle',
  title: 'the Hearthwarden',
  color: KINDLE,
  colorLit: KINDLE_LIT,
  colorDark: KINDLE_DARK,
  accent: KINDLE_GOLD,
  // Tier 1: the first prince anyone meets.
  damageMult: 0.8,

  intro: [
    'Wipe your feet. The soot is the King\'s.',
    'I am told you have been putting out fires. Let me show you why we keep them.',
  ],
  banter: [
    'Every hearth in this town is a promise. I am the one who keeps promises.',
    'You think the tithe is cruelty. It is order. Order is warm.',
    'My father brands. I only ask that the fire be kept.',
    'A cold hearth is a confession. What are you confessing?',
    'Douse one. I will light two. That is what duty is.',
  ],
  defeatLine: 'THE KEPT FLAME GUTTERS',
  resumeLine: 'Back again. The hearths remembered you. So did I.',

  phases: [
    {
      name: 'The Kept Flame',
      line: 'A hearth here. A hearth there. You see? The hall is warmer already.',
      hp: 300,
      cycle: [
        'sig:kept-flame', 'volley', 'sig:kept-flame', 'sig:census',
        'hazard', 'sig:tithe', 'sig:kept-flame', 'lanes', 'radial', 'sig:tithe',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1300,
      harassMs: 3700,
    },
    {
      name: 'Every Hearth Answers',
      line: 'Enough asking. Every hearth in this hall — answer me.',
      hp: 360,
      cycle: [
        'sig:answer', 'sig:signet', 'spiral', 'sig:census', 'sig:tithe',
        'charge', 'sig:signet', 'barrage', 'sig:answer', 'homing',
      ],
      harass: ['h-flak', 'h-rune', 'h-orbs'],
      restMs: 1100,
      harassMs: 3100,
    },
  ],

  hard: {
    introLine: 'THE PRINCE TAKES UP THE BRAND',
    extraPhase: {
      name: 'The Royal Brand',
      line: 'Then I will do what my father does. Hold still. It is only a mark.',
      hp: 280,
      cycle: [
        'sig:royal-brand', 'homing', 'sig:signet', 'sig:census',
        'sig:royal-brand', 'quake', 'stream', 'sig:signet',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane'],
      restMs: 900,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230 },
    radial: { count: 14, speed: 200 },
    hazard: { radius: 60 },
  },

  signatures: {
    'kept-flame': keptFlame,
    tithe: titheCall,
    census,
    signet,
    answer,
    'royal-brand': royalBrand,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'smoke', hands: 'gauntlet',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: KINDLE_GOLD,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'wards', tint: 'hot', look: { pattern: 'cracks', aura: 'flame' } },
    { movement: 'orbit', gimmick: 'stalkers', tint: 'gold', look: { crest: 'crown', aura: 'sparks', hands: 'claw', mouth: 'grate' } },
  ],

  /**
   * The Hearthwarden's two tells: a tall iron stove-pipe hat with the kept flame burning out of
   * its mouth, and the long hooked poker he carries. On hard's last phase the hat burns away and
   * the King's crown is underneath — and the brand on his chest goes gold.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const crowned = s.hard && s.phaseIdx >= 2;
    // The poker, hanging from the off hand.
    const hand = s.hands[1] ?? s.hands[0];
    if (hand) {
      const a = Math.PI / 2 + Math.sin(s.t / 600) * 0.15 + (s.castGlow > 0.3 ? -0.9 * s.castGlow : 0);
      const len = R * 2.1;
      const ex = hand.x + Math.cos(a) * len, ey = hand.y + Math.sin(a) * len;
      g.lineStyle(5, IRON, 1); g.lineBetween(hand.x, hand.y, ex, ey);
      g.lineStyle(2, 0x5a5550, 1); g.lineBetween(hand.x, hand.y, ex, ey);
      const ha = a + Math.PI / 2;
      g.lineStyle(4, s.castGlow > 0.3 ? EMBER_LIT : IRON, 1);
      g.lineBetween(ex, ey, ex + Math.cos(ha) * 11, ey + Math.sin(ha) * 11);
      g.fillStyle(EMBER, 0.6 + s.castGlow * 0.4); g.fillCircle(ex, ey, 3.5);
    }
    // The brand on his chest.
    brandSigil(g, s.x, s.y + R * 0.35, R * 0.2, crowned ? KINDLE_GOLD : BRAND, 0.85);
    if (crowned) {
      // Hat gone; a halo of the King's sigil burning behind the crown.
      const pulse = 1 + Math.sin(s.t / 200) * 0.05;
      g.lineStyle(3, KINDLE_GOLD, 0.6);
      g.beginPath(); g.arc(s.x, s.y - R * 0.2, R * 1.45 * pulse, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
      return;
    }
    // The stove-pipe hat: brim, tall iron pipe, band, and the kept flame at its mouth.
    const top = s.y - R - 4;
    const hh = R * 1.15;
    g.fillStyle(SOOT, 1); g.fillEllipse(s.x, top + 2, R * 1.5, R * 0.34);
    g.fillStyle(IRON, 1); g.fillRect(s.x - R * 0.42, top - hh, R * 0.84, hh);
    g.fillStyle(0x3a3532, 1); g.fillRect(s.x - R * 0.42, top - hh, R * 0.2, hh);
    g.fillStyle(s.palette.main, 1); g.fillRect(s.x - R * 0.43, top - R * 0.32, R * 0.86, R * 0.16);
    brandSigil(g, s.x, top - R * 0.24, R * 0.1, KINDLE_GOLD, 1);
    g.fillStyle(IRON, 1); g.fillRect(s.x - R * 0.5, top - hh - 4, R, 6);
    const fh = (R * 0.55 + Math.sin(s.t / 90) * 4) * (s.enraged ? 1.4 : 1) * (1 + s.castGlow * 0.5);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * R * 0.22;
      g.fillStyle(i === 1 ? (s.phaseIdx >= 1 ? KINDLE_GOLD : EMBER_LIT) : EMBER, 0.92);
      g.fillTriangle(s.x + ox - R * 0.14, top - hh - 4, s.x + ox + R * 0.14, top - hh - 4, s.x + ox, top - hh - 4 - fh * (i === 1 ? 1 : 0.7));
    }
    // Smoke off the flame.
    const ph = (s.t % 1400) / 1400;
    g.fillStyle(SMOKE, 0.35 * (1 - ph));
    g.fillCircle(s.x + ph * 16, top - hh - fh - ph * 30, 4 + ph * 8);
  },

  /** Kindle's hall: soot-black flags, a crimson runner, the great fireplace, and the brand in brass. */
  drawArena(g, W, H) {
    g.fillStyle(0x221d1b, 1); g.fillRect(0, 0, W, H);
    // Flagstones.
    for (let y = 0; y < H; y += 48) {
      const shift = (Math.floor(y / 48) % 2) * 24;
      for (let x = -shift; x < W; x += 48) {
        const v = ((x * 7 + y * 13) % 5) / 100;
        g.fillStyle(Phaser.Display.Color.GetColor(40 + v * 200, 35 + v * 180, 32 + v * 160), 1);
        g.fillRect(x + 2, y + 2, 44, 44);
      }
    }
    // The runner, door to fireplace.
    g.fillStyle(KINDLE_DARK, 1); g.fillRect(W / 2 - 70, 96, 140, H - 96);
    g.fillStyle(0x6a1e0e, 1); g.fillRect(W / 2 - 62, 96, 124, H - 96);
    g.lineStyle(3, KINDLE_GOLD, 0.6);
    g.lineBetween(W / 2 - 56, 96, W / 2 - 56, H); g.lineBetween(W / 2 + 56, 96, W / 2 + 56, H);
    for (let y = 130; y < H; y += 70) brandSigil(g, W / 2, y, 9, KINDLE_GOLD, 0.35);
    // The great fireplace along the top wall.
    g.fillStyle(0x3a3532, 1); g.fillRect(W / 2 - 200, 60, 400, 70);
    g.fillStyle(0x4b4540, 1); g.fillRect(W / 2 - 210, 92, 420, 12);
    g.fillStyle(SOOT, 1); g.fillRoundedRect(W / 2 - 120, 96, 240, 40, { tl: 0, tr: 0, bl: 30, br: 30 });
    for (let i = 0; i < 14; i++) {
      g.fillStyle(i % 2 ? EMBER : EMBER_DARK, 1);
      g.fillCircle(W / 2 - 100 + i * 15, 124, 7);
    }
    g.fillStyle(GLOW, 0.08); g.fillEllipse(W / 2, 150, 420, 120);
    // The brand, inlaid in brass at the centre of the hall.
    brandSigil(g, W / 2, H * 0.57, 120, 0x5a4a2a, 0.45);
    brandSigil(g, W / 2, H * 0.57, 116, KINDLE_GOLD, 0.12);
    // Iron candle-stands down both sides, and tithe ledgers stacked by the walls.
    for (const x of [70, W - 70]) {
      for (let y = 160; y < H - 40; y += 120) {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, 26, 8);
        g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 40, 4, 40); g.fillRect(x - 10, y - 42, 20, 3);
        g.fillStyle(GLOW, 0.9); g.fillCircle(x, y - 48, 4);
        g.fillStyle(GLOW, 0.1); g.fillCircle(x, y - 48, 18);
      }
    }
    for (const [x, y] of [[130, H - 60], [W - 140, H - 70], [140, 170]] as [number, number][]) {
      for (let k = 0; k < 4; k++) {
        g.fillStyle(k % 2 ? 0x5a3a28 : 0x6b4a32, 1); g.fillRect(x - 18 + (k % 2) * 3, y - k * 8, 36, 7);
        g.fillStyle(0xd8ccb0, 1); g.fillRect(x - 16 + (k % 2) * 3, y - k * 8 + 1, 32, 2);
      }
    }
    // Soot vignette.
    for (let i = 0; i < 6; i++) {
      g.lineStyle(40, 0x000000, 0.08);
      g.strokeRect(i * 18, i * 18, W - i * 36, H - i * 36);
    }
  },
};
