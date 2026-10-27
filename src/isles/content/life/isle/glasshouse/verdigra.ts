import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mixC, mulberry } from '../../../../art/IsleArt';
import {
  BARK, BRASS, GLASS, IRON, LEAF, ROSE, ROSE_DEEP, ROSE_PALE, SAP, SOIL, VERDIGRIS, VERDIGRIS_DEEP, YEW, YEW_LIT,
  bramble, glassPane, graftedSubject, ironRib, rose, shears, verdigraSigil,
} from './art';

/**
 * Empress Verdigra the Gardener, Sovereign of Thornwild — the Life Isle's monarch and finale.
 *
 * She tends the isle as one garden and you are a weed in it. The fight is a garden year in four
 * movements, then (on hard) a winter that does not touch her:
 *
 *   I   The Pruning   — enthroned among her roses. Her great shears open across the floor and
 *                       snap shut on whatever is in their mouth; she deadheads the throne roses
 *                       and the heads roll out and rebound off the walls; she stakes out an
 *                       espalier round you and draws its wires in tight — out through the one
 *                       unstrung bay.
 *   II  The Graft     — she rises and grafts. A scion vine whips out at you and, if it takes,
 *                       binds you to her (stray too far and it tears you; she feeds on it); four
 *                       rootstocks are driven round you and vines graft between them in a cross;
 *                       she T-buds the floor under you and a thorn-sapling grows out of the cut.
 *   III Overgrowth    — the dome breaks. Panes of glass come down in two waves; the jungle
 *                       floods in — creepers crawl the floor at you leaving tangle behind them;
 *                       pitcher plants open round you, drink you in, and snap.
 *   IV  Compost       — she rots and blooms by turns. The floor goes to rot in a chequer, then
 *                       the chequer turns — what rotted blooms, what bloomed rots; worms tunnel
 *                       at you and surface; she goes to seed and blows a curtain of down across.
 *   V   Evergreen (hard) — winter, and she does not drop a leaf. Holly blades spiral off her and
 *                       drop their berries; needles fall everywhere but the shelter of one bough
 *                       that drifts across the room; she buries heart-seeds of herself that heal
 *                       her unless you trample them through their thorns.
 *
 * Every signature is bespoke and none of them look like the Brand-King's or the Tide-Queen's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const V_MAIN = 0x3aa888;
const V_LIT = 0xb8f0d8;
const V_DARK = 0x0e3a30;
const ROT = 0x4a3a1e;
const ROT_DEEP = 0x22180c;
const FUNGUS = 0xd8c8a0;
const HOLLY = 0x1e5a2a;
const BERRY = 0xd8202a;
const FROST = 0xe8f8ff;
const PINE = 0x2a5a3a;
const DOWN = 0xf4f0e0;

const FT = 96;
/** The anchor post an `anchor` phase stands on — the trellis throne is painted round it. */
const THRONE = { x: 480, y: 218 };
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
/** Move the player bodily (the graft does it), clamped to the field. */
const carry = (tk: BossToolkit, dx: number, dy: number): void => {
  const p = tk.player;
  if (!p.active || p.hp <= 0) return;
  p.x = clampN(p.x + dx, 40, tk.W - 40);
  p.y = clampN(p.y + dy, FT + 20, tk.H - 40);
};
type Gfx = Phaser.GameObjects.Graphics;

// ── I. The Great Shears ──────────────────────────────────────────────
// Her shears, big as a gate, open across the floor with their pivot planted off to one side of
// you and their mouth over you. They close. Anything in the mouth as the blades pass is cut.
// Leave the mouth before it closes — out past the blade, or round behind the pivot. Twice.

const greatShears = (tk: BossToolkit): SignatureMove => {
  const OPEN = 0.55;
  const LEN = 560;
  const CLOSE_MS = 340;
  interface Cut { px: number; py: number; a: number; born: number; closeAt: number; hit: boolean; prevHalf: number }
  let cuts: Cut[] = [];
  const half = (c: Cut, time: number): number => {
    if (time < c.closeAt) return OPEN;
    return OPEN * clampN(1 - (time - c.closeAt) / CLOSE_MS, 0, 1);
  };
  const plant = (time: number) => {
    const p = tk.player;
    const side = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) + (Math.random() < 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.6);
    const px = tk.clampX(p.x + Math.cos(side) * 250, 30), py = clampN(p.y + Math.sin(side) * 250, FT + 10, tk.H - 30);
    cuts.push({ px, py, a: Math.atan2(p.y - py, p.x - px), born: time, closeAt: time + tk.warn(1150), hit: false, prevHalf: OPEN });
    tk.sfx('clang');
  };
  return {
    durationMs: 3000,
    windupMs: 900,
    gesture: 'sweep',
    tell: 'THE GREAT SHEARS',
    cast(time) {
      plant(time);
      tk.schedule(1300, () => plant(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const c of cuts) {
        const h = half(c, time);
        if (time >= c.closeAt && time - c.closeAt < 30) tk.sfx('slash');
        if (!c.hit && p.active && time >= c.closeAt) {
          const d = Math.abs(wrap(Math.atan2(p.y - c.py, p.x - c.px) - c.a));
          const r = dist(p.x, p.y, c.px, c.py);
          // Cut when a blade passes over you: you were inside the mouth a moment ago and are not now.
          const pad = Math.atan2(PLAYER_R, Math.max(30, r));
          if (r < LEN + PLAYER_R && d <= c.prevHalf + pad && d >= h - pad) {
            c.hit = true;
            tk.hitPlayer(18, p.x, p.y);
            float(tk, p.x, p.y - 40, 'SNIP', '#e8f0f0');
          }
        }
        c.prevHalf = h;
      }
      cuts = cuts.filter((c) => time < c.closeAt + CLOSE_MS + 500);
    },
    drawGround(g, time) {
      for (const c of cuts) {
        const h = half(c, time);
        if (h <= 0.01) continue;
        const k = time < c.closeAt ? clampN((time - c.born) / Math.max(1, c.closeAt - c.born), 0, 1) : 1;
        // The mouth of the shears on the floor: everything that will be cut.
        g.fillStyle(0xe8f0f0, 0.05 + k * 0.12);
        g.slice(c.px, c.py, LEN, c.a - h, c.a + h, false); g.fillPath();
        g.lineStyle(2, 0xffffff, 0.25 + k * 0.4);
        g.lineBetween(c.px, c.py, c.px + Math.cos(c.a) * LEN, c.py + Math.sin(c.a) * LEN);
        if (k > 0.75 && time < c.closeAt && Math.floor(time / 100) % 2 === 0) {
          g.lineStyle(3, 0xff8a9a, 0.6);
          g.beginPath(); g.arc(c.px, c.py, LEN, c.a - h, c.a + h, false); g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      for (const c of cuts) {
        const fade = time > c.closeAt + CLOSE_MS ? 1 - (time - c.closeAt - CLOSE_MS) / 500 : 1;
        shears(g, c.px, c.py, c.a, Math.max(0.01, half(c, time)), LEN, clampN(fade, 0, 1));
        if (time >= c.closeAt && time < c.closeAt + CLOSE_MS + 200) {
          for (let i = 0; i < 10; i++) {
            const f = (i + 0.5) / 10;
            const x = c.px + Math.cos(c.a) * LEN * f, y = c.py + Math.sin(c.a) * LEN * f;
            g.fillStyle(i % 2 ? LEAF : ROSE, 0.8); g.fillEllipse(x + Math.sin(time / 30 + i) * 10, y - ((time - c.closeAt) / 10) % 30, 6, 3);
          }
        }
      }
    },
    onPhaseEnd() { cuts = []; },
  };
};

// ── I. Deadheading ───────────────────────────────────────────────────
// She snips the spent roses off the throne and they roll — big heavy heads, down the floor along
// spokes she has chalked first, rebounding once off the wall before they burst. The chalk shows
// the bounce too. Stand between the spokes.

const deadheading = (tk: BossToolkit): SignatureMove => {
  const N = 9;
  const SPEED = 250;
  const R = 17;
  const LIFE = 2800;
  interface Head { x: number; y: number; vx: number; vy: number; bounced: boolean; dead: boolean; spin: number; path: { x: number; y: number }[] }
  let heads: Head[] = [];
  let rollAt = 0;
  let born = 0;
  let ox = 0, oy = 0;
  /** Trace a spoke and its one bounce, for the chalk line. */
  const trace = (x: number, y: number, vx: number, vy: number): { x: number; y: number }[] => {
    const pts = [{ x, y }];
    let bx = x, by = y, dx = vx, dy = vy, bounced = false;
    for (let i = 0; i < 160; i++) {
      bx += dx * 0.02; by += dy * 0.02;
      if (!bounced && (bx < R || bx > tk.W - R)) { dx = -dx; bounced = true; pts.push({ x: bx, y: by }); }
      else if (!bounced && (by < FT + R || by > tk.H - R)) { dy = -dy; bounced = true; pts.push({ x: bx, y: by }); }
      else if (bounced && (bx < 0 || bx > tk.W || by < FT || by > tk.H)) break;
    }
    pts.push({ x: bx, y: by });
    return pts;
  };
  return {
    durationMs: 3200,
    windupMs: 850,
    gesture: 'clap',
    tell: 'DEADHEADING',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY + 20;
      born = time;
      rollAt = time + tk.warn(900);
      const toP = tk.angleToPlayer(ox, oy);
      const spread = Math.PI * 1.1;
      heads = [];
      for (let i = 0; i < N; i++) {
        const a = toP - spread / 2 + (i / (N - 1)) * spread + (Math.random() - 0.5) * 0.06;
        const vx = Math.cos(a) * SPEED, vy = Math.sin(a) * SPEED;
        heads.push({ x: ox, y: oy, vx, vy, bounced: false, dead: false, spin: 0, path: trace(ox, oy, vx, vy) });
      }
      tk.sfx('slash');
    },
    update(time, dt) {
      if (time < rollAt) return;
      const p = tk.player;
      for (const h of heads) {
        if (h.dead) continue;
        h.x += h.vx * dt; h.y += h.vy * dt; h.spin += dt * 9;
        if (!h.bounced && (h.x < R || h.x > tk.W - R)) { h.vx = -h.vx; h.bounced = true; tk.sfx('boing'); }
        else if (!h.bounced && (h.y < FT + R || h.y > tk.H - R)) { h.vy = -h.vy; h.bounced = true; tk.sfx('boing'); }
        else if (h.bounced && (h.x < -20 || h.x > tk.W + 20 || h.y < FT - 20 || h.y > tk.H + 20)) h.dead = true;
        if (time - rollAt > LIFE) { h.dead = true; tk.boom(h.x, h.y, 24, ROSE); }
        if (!h.dead && p.active && dist(p.x, p.y, h.x, h.y) < R + PLAYER_R) {
          h.dead = true;
          tk.hitPlayer(12, p.x, p.y);
          tk.boom(h.x, h.y, 30, ROSE);
          tk.sfx('thorn');
        }
      }
      heads = heads.filter((h) => !h.dead);
    },
    drawGround(g, time) {
      if (time >= rollAt + 400) return;
      const k = clampN((time - born) / Math.max(1, rollAt - born), 0, 1);
      for (const h of heads) {
        g.lineStyle(2, 0xffffff, (0.15 + k * 0.35) * (time > rollAt ? 1 - (time - rollAt) / 400 : 1));
        for (let i = 1; i < h.path.length; i++) {
          const a = h.path[i - 1], b = h.path[i];
          const n = Math.max(2, Math.floor(dist(a.x, a.y, b.x, b.y) / 16));
          for (let s = 0; s < n; s += 2) {
            g.lineBetween(a.x + (b.x - a.x) * (s / n), a.y + (b.y - a.y) * (s / n), a.x + (b.x - a.x) * ((s + 1) / n), a.y + (b.y - a.y) * ((s + 1) / n));
          }
        }
      }
    },
    drawAir(g, time) {
      const pre = time < rollAt;
      for (const h of heads) {
        if (pre) {
          // Held in a basket of snipped heads at her feet until she lets them go.
          const k = clampN((time - born) / Math.max(1, rollAt - born), 0, 1);
          rose(g, ox + Math.cos(h.path[1] ? Math.atan2(h.vy, h.vx) : 0) * 30 * k, oy + Math.sin(Math.atan2(h.vy, h.vx)) * 20 * k, 9, ROSE, 0.7);
          continue;
        }
        g.fillStyle(0x000000, 0.3); g.fillEllipse(h.x, h.y + R * 0.8, R * 2, R * 0.6);
        rose(g, h.x, h.y, R * 0.75, h.bounced ? ROSE_DEEP : ROSE, 1);
        // Tumbling: a petal flicking off with every turn.
        const a = h.spin;
        g.fillStyle(ROSE_PALE, 0.8); g.fillEllipse(h.x - h.vx * 0.06 + Math.cos(a) * 6, h.y - h.vy * 0.06 + Math.sin(a) * 6, 6, 3);
      }
    },
    onPhaseEnd() { heads = []; },
  };
};

// ── I. The Espalier ──────────────────────────────────────────────────
// She trains you flat against the wall like a pear tree. Six stakes drive into the floor round
// you and wire is strung between them — all but one bay. Then the wire is drawn tight and the
// stakes walk inward. Leave through the unstrung bay.

const espalier = (tk: BossToolkit): SignatureMove => {
  const N = 6;
  const R0 = 175;
  const TIGHTEN_MS = 1150;
  let active = false;
  let cx = 0, cy = 0, a0 = 0, gap = 0, born = 0, drawAt = 0, hit = false;
  const radius = (time: number): number => (time < drawAt ? R0 : R0 * clampN(1 - (time - drawAt) / TIGHTEN_MS, 0, 1));
  const stake = (i: number, r: number) => {
    const a = a0 + (i / N) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  return {
    durationMs: 2700,
    windupMs: 800,
    gesture: 'slam',
    tell: 'THE ESPALIER',
    cast(time) {
      const p = tk.player;
      cx = tk.clampX(p.x, 90); cy = tk.clampY(p.y, 90);
      a0 = Math.random() * Math.PI * 2;
      gap = Math.floor(Math.random() * N);
      born = time;
      drawAt = time + tk.warn(1050);
      hit = false;
      active = true;
      for (let i = 0; i < N; i++) tk.schedule(i * 90, () => tk.sfx('hammer-forge'));
    },
    update(time) {
      if (!active) return;
      if (time > drawAt + TIGHTEN_MS + 200) { active = false; return; }
      if (time < drawAt || hit) return;
      if (time - drawAt < 30) tk.sfx('chain');
      const p = tk.player;
      if (!p.active) return;
      const r = radius(time);
      for (let i = 0; i < N; i++) {
        if (i === gap) continue;
        const a = stake(i, r), b = stake((i + 1) % N, r);
        if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 6 + PLAYER_R) {
          hit = true;
          tk.hitPlayer(15, p.x, p.y);
          tk.slowPlayer(0.6, 700);
          float(tk, p.x, p.y - 40, 'TRAINED', '#d8c878');
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const r = radius(time);
      const k = clampN((time - born) / Math.max(1, drawAt - born), 0, 1);
      // The unstrung bay, lit — the way out.
      const ga = a0 + ((gap + 0.5) / N) * Math.PI * 2;
      g.fillStyle(0xffffff, 0.06 + k * 0.1);
      g.slice(cx, cy, R0 + 40, ga - Math.PI / N, ga + Math.PI / N, false); g.fillPath();
      g.fillStyle(0xffffff, 0.5 + Math.sin(time / 100) * 0.2);
      const ax = cx + Math.cos(ga) * (R0 + 30), ay = cy + Math.sin(ga) * (R0 + 30);
      g.fillTriangle(ax + Math.cos(ga) * 14, ay + Math.sin(ga) * 14, ax - Math.sin(ga) * 9, ay + Math.cos(ga) * 9, ax + Math.sin(ga) * 9, ay - Math.cos(ga) * 9);
      // The wires: slack and sagging, then taut and humming as they draw in.
      const taut = time >= drawAt;
      for (let i = 0; i < N; i++) {
        if (i === gap) continue;
        const a = stake(i, r), b = stake((i + 1) % N, r);
        if (!taut) {
          g.lineStyle(1.5, 0xc8c8b8, 0.3 + k * 0.4);
          const mx = (a.x + b.x) / 2 + (cx - (a.x + b.x) / 2) * 0.08, my = (a.y + b.y) / 2 + 10;
          g.lineBetween(a.x, a.y - 14, mx, my - 14); g.lineBetween(mx, my - 14, b.x, b.y - 14);
        } else {
          g.lineStyle(3, 0xe8e8d8, 0.95); g.lineBetween(a.x, a.y - 14, b.x, b.y - 14);
          g.lineStyle(7, 0xffffff, 0.15); g.lineBetween(a.x, a.y - 14, b.x, b.y - 14);
        }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const r = radius(time);
      const drop = clampN((time - born) / 300, 0, 1);
      for (let i = 0; i < N; i++) {
        const s = stake(i, r);
        const y = s.y - (1 - drop) * 60;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 2, 16, 6);
        g.fillStyle(BARK, 1); g.fillRect(s.x - 3, y - 26, 6, 26);
        g.fillStyle(lit(BARK, 0.25), 1); g.fillRect(s.x - 3, y - 26, 2, 26);
        g.fillStyle(BRASS, 1); g.fillCircle(s.x, y - 14, 2.5);
        // A pear-leaf tied to every stake — what she means to grow on it.
        g.fillStyle(LEAF, 0.9); g.fillEllipse(s.x + 6, y - 22, 9, 4);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── II. The Scion ────────────────────────────────────────────────────
// A cutting of her own vine whips out at you. If it takes, you are grafted onto her: stray past
// the length of the scion and it tears at you and drags you back, and she drinks from the union
// while it holds. Two whips. Step off the line.

const scion = (tk: BossToolkit): SignatureMove => {
  const HALF = 22;
  const GRAFT_MS = 3400;
  const LEASH = 210;
  interface Whip { a: number; ox: number; oy: number; born: number; fireAt: number; done: boolean }
  let whips: Whip[] = [];
  let graftUntil = 0;
  let lastTear = 0;
  let lastDrink = 0;
  const whip = (time: number, off: number) => {
    const a = tk.angleToPlayer() + off;
    whips.push({ a, ox: tk.bossX, oy: tk.bossY, born: time, fireAt: time + tk.warn(900), done: false });
  };
  return {
    durationMs: 2600,
    windupMs: 800,
    gesture: 'point',
    tell: 'THE SCION',
    cast(time) {
      whip(time, 0);
      tk.schedule(560, () => whip(tk.now, (Math.random() < 0.5 ? 1 : -1) * 0.32));
      tk.sfx('whip');
    },
    update(time) {
      const p = tk.player;
      for (const w of whips) {
        if (w.done || time < w.fireAt) continue;
        w.done = true;
        tk.sfx('whip');
        const ex = w.ox + Math.cos(w.a) * 1100, ey = w.oy + Math.sin(w.a) * 1100;
        if (p.active && segDist(p.x, p.y, w.ox, w.oy, ex, ey) < HALF + PLAYER_R) {
          tk.hitPlayer(10, p.x, p.y);
          if (time >= graftUntil) float(tk, p.x, p.y - 44, 'GRAFTED', '#9ad86a');
          graftUntil = time + GRAFT_MS;
        }
      }
      whips = whips.filter((w) => !w.done || time < w.fireAt + 400);
      if (time >= graftUntil || !p.active) return;
      const d = dist(p.x, p.y, tk.bossX, tk.bossY);
      if (d > LEASH) {
        // The union tears; the vine hauls you back toward her.
        const excess = d - LEASH;
        const a = Math.atan2(tk.bossY - p.y, tk.bossX - p.x);
        carry(tk, Math.cos(a) * excess * 0.25, Math.sin(a) * excess * 0.25);
        if (time - lastTear > 450) { lastTear = time; tk.hitPlayer(4, p.x, p.y); }
      }
      if (time - lastDrink > 1100) { lastDrink = time; tk.healBoss(5); }
    },
    drawGround(g, time) {
      for (const w of whips) {
        if (w.done) continue;
        const k = clampN((time - w.born) / Math.max(1, w.fireAt - w.born), 0, 1);
        const ex = w.ox + Math.cos(w.a) * 1100, ey = w.oy + Math.sin(w.a) * 1100;
        g.fillStyle(LEAF, 0.06 + k * 0.1);
        const nx = -Math.sin(w.a) * HALF, ny = Math.cos(w.a) * HALF;
        g.fillTriangle(w.ox + nx, w.oy + ny, w.ox - nx, w.oy - ny, ex + nx, ey + ny);
        g.fillTriangle(w.ox - nx, w.oy - ny, ex - nx, ey - ny, ex + nx, ey + ny);
        g.lineStyle(2, YEW_LIT, 0.3 + k * 0.5); g.lineBetween(w.ox + nx, w.oy + ny, ex + nx, ey + ny); g.lineBetween(w.ox - nx, w.oy - ny, ex - nx, ey - ny);
      }
      if (time < graftUntil) {
        // The scion's reach, drawn round her — the length of your leash.
        g.lineStyle(2, SAP, 0.35); g.strokeCircle(tk.bossX, tk.bossY, LEASH);
      }
    },
    drawAir(g, time) {
      for (const w of whips) {
        if (!w.done) continue;
        const k = (time - w.fireAt) / 400;
        const len = 1100 * Math.min(1, k * 3);
        bramble(g, w.ox, w.oy, w.ox + Math.cos(w.a) * len, w.oy + Math.sin(w.a) * len, time / 1000, 0x4a8a2a, 1 - k);
      }
      if (time < graftUntil) {
        const p = tk.player;
        const d = dist(p.x, p.y, tk.bossX, tk.bossY);
        bramble(g, tk.bossX, tk.bossY, p.x, p.y, time / 1000, d > LEASH ? 0xa86a2a : 0x4a8a2a, 0.9);
        // The graft-union: bound in raffia where it meets you.
        g.lineStyle(4, 0xc8a868, 1); g.strokeCircle(p.x, p.y - 4, 14);
        const mx = (p.x + tk.bossX) / 2, my = (p.y + tk.bossY) / 2;
        g.fillStyle(SAP, 0.7); g.fillCircle(mx + Math.sin(time / 100) * 3, my, 4);
      }
    },
    onPhaseEnd() { whips = []; graftUntil = 0; },
  };
};

// ── II. Rootstock ────────────────────────────────────────────────────
// Four rootstocks are driven in round you, cut flat for grafting. Then vines take between
// them: first the two sides, then the two diagonals — a box with a cross in it. Each union is
// marked before it takes. Stand in a corner of the box, not on its lines.

const rootstock = (tk: BossToolkit): SignatureMove => {
  const HALF = 14;
  const ORDER: [number, number][] = [[0, 1], [2, 3], [0, 2], [1, 3]];
  interface Union { a: number; b: number; fireAt: number; fired: boolean; hit: boolean }
  let stocks: { x: number; y: number }[] = [];
  let unions: Union[] = [];
  let born = 0;
  let endAt = 0;
  return {
    durationMs: 3200,
    windupMs: 850,
    gesture: 'slam',
    tell: 'ROOTSTOCK',
    cast(time) {
      const p = tk.player;
      const rot = Math.random() * Math.PI;
      const s = 170 + Math.random() * 30;
      // A square: 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right (in its own frame).
      stocks = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([u, v]) => ({
        x: tk.clampX(p.x + (u * Math.cos(rot) - v * Math.sin(rot)) * s, 50),
        y: tk.clampY(p.y + (u * Math.sin(rot) + v * Math.cos(rot)) * s, 50),
      }));
      born = time;
      const first = time + tk.warn(1000);
      unions = ORDER.map(([a, b], i) => ({ a, b, fireAt: first + i * 460, fired: false, hit: false }));
      endAt = first + ORDER.length * 460 + 600;
      tk.sfx('stone-rise');
    },
    update(time) {
      if (time > endAt) { stocks = []; unions = []; return; }
      const p = tk.player;
      for (const u of unions) {
        if (u.fired || time < u.fireAt) continue;
        u.fired = true;
        tk.sfx('whip');
        const A = stocks[u.a], B = stocks[u.b];
        if (p.active && segDist(p.x, p.y, A.x, A.y, B.x, B.y) < HALF + PLAYER_R) { tk.hitPlayer(13, p.x, p.y); u.hit = true; }
      }
    },
    drawGround(g, time) {
      for (const u of unions) {
        const A = stocks[u.a], B = stocks[u.b];
        if (!A || !B) continue;
        if (!u.fired) {
          const k = clampN(1 - (u.fireAt - time) / Math.max(1, u.fireAt - born), 0, 1);
          g.lineStyle(HALF * 2, LEAF, 0.05 + k * 0.15); g.lineBetween(A.x, A.y, B.x, B.y);
          g.lineStyle(2, YEW_LIT, 0.25 + k * 0.5);
          const n = 14;
          for (let i = 0; i < n; i += 2) g.lineBetween(A.x + (B.x - A.x) * (i / n), A.y + (B.y - A.y) * (i / n), A.x + (B.x - A.x) * ((i + 1) / n), A.y + (B.y - A.y) * ((i + 1) / n));
        }
      }
    },
    drawAir(g, time) {
      for (const s of stocks) {
        // A cut rootstock: a stump with a flat white face and the graft-cleft in it.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 4, 36, 10);
        g.fillStyle(BARK, 1); g.fillRect(s.x - 13, s.y - 22, 26, 24);
        g.fillStyle(lit(BARK, 0.15), 1); g.fillRect(s.x - 13, s.y - 22, 6, 24);
        g.fillStyle(0xe8d8b0, 1); g.fillEllipse(s.x, s.y - 22, 26, 9);
        g.lineStyle(1, 0x8a6a4a, 1); g.strokeEllipse(s.x, s.y - 22, 16, 5); g.lineBetween(s.x, s.y - 26, s.x, s.y - 18);
      }
      for (const u of unions) {
        if (!u.fired) continue;
        const A = stocks[u.a], B = stocks[u.b];
        if (!A || !B) continue;
        const k = Math.min(1, (time - u.fireAt) / 120);
        bramble(g, A.x, A.y - 20, A.x + (B.x - A.x) * k, A.y - 20 + (B.y - A.y) * k, time / 1000, u.hit ? 0x8a4a2a : 0x3a7a2a, 0.95);
      }
    },
    onPhaseEnd() { stocks = []; unions = []; },
  };
};

// ── II. T-Budding ────────────────────────────────────────────────────
// She cuts a T into the floor under you, lifts the bark and slips a bud in. The cut itself is the
// first danger; then the bud takes, and a thorn-sapling grows from it and throws three rings of
// thorns, each turned a little from the last. Get out of the T, then read the gaps.

const tBudding = (tk: BossToolkit): SignatureMove => {
  const PULSES = 3;
  const RING = 12;
  interface Bud { x: number; y: number; a: number; born: number; cutAt: number; cut: boolean; pulses: number; nextAt: number; spin: number }
  let buds: Bud[] = [];
  const inT = (b: Bud, x: number, y: number): boolean => {
    const dx = x - b.x, dy = y - b.y;
    const u = dx * Math.cos(b.a) + dy * Math.sin(b.a);
    const v = -dx * Math.sin(b.a) + dy * Math.cos(b.a);
    const stem = Math.abs(v) < 18 + PLAYER_R && u > -10 && u < 140;
    const bar = Math.abs(u) < 18 + PLAYER_R && Math.abs(v) < 80;
    return stem || bar;
  };
  const place = (time: number) => {
    const p = tk.player;
    buds.push({ x: tk.clampX(p.x, 80), y: tk.clampY(p.y, 80), a: Math.random() * Math.PI * 2, born: time, cutAt: time + tk.warn(950), cut: false, pulses: 0, nextAt: 0, spin: Math.random() * Math.PI });
    tk.sfx('stab');
  };
  return {
    durationMs: 3000,
    windupMs: 850,
    gesture: 'punch',
    tell: 'T-BUDDING',
    cast(time) {
      place(time);
      if (tk.hard) tk.schedule(700, () => place(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const b of buds) {
        if (!b.cut && time >= b.cutAt) {
          b.cut = true;
          b.nextAt = time + 600;
          tk.sfx('slash');
          if (p.active && inT(b, p.x, p.y)) tk.hitPlayer(12, p.x, p.y);
        }
        if (b.cut && b.pulses < PULSES && time >= b.nextAt) {
          b.pulses++;
          b.nextAt = time + 650;
          tk.sfx('thorn');
          const off = b.spin + b.pulses * (Math.PI / RING);
          for (let i = 0; i < RING; i++) {
            tk.spawnBullet({ x: b.x, y: b.y - 16, angle: off + (i / RING) * Math.PI * 2, speed: 185, damage: 8, r: 6, lifeMs: 3200, color: 0xd8c890 });
          }
        }
      }
      buds = buds.filter((b) => b.pulses < PULSES || time < b.nextAt + 400);
    },
    drawGround(g, time) {
      for (const b of buds) {
        const ca = Math.cos(b.a), sa = Math.sin(b.a);
        const P = (u: number, v: number) => ({ x: b.x + ca * u - sa * v, y: b.y + sa * u + ca * v });
        const k = b.cut ? 1 : clampN((time - b.born) / Math.max(1, b.cutAt - b.born), 0, 1);
        const col = b.cut ? 0x2a1a0e : 0xffffff;
        const al = b.cut ? 0.8 : 0.12 + k * 0.25;
        g.fillStyle(col, al);
        const s0 = P(-10, -18), s1 = P(140, -18), s2 = P(140, 18), s3 = P(-10, 18);
        g.fillTriangle(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y); g.fillTriangle(s0.x, s0.y, s2.x, s2.y, s3.x, s3.y);
        const b0 = P(-18, -80), b1 = P(18, -80), b2 = P(18, 80), b3 = P(-18, 80);
        g.fillTriangle(b0.x, b0.y, b1.x, b1.y, b2.x, b2.y); g.fillTriangle(b0.x, b0.y, b2.x, b2.y, b3.x, b3.y);
        if (b.cut) {
          // The lifted bark flaps either side of the cut.
          g.lineStyle(3, BARK, 1); g.lineBetween(s0.x, s0.y, s1.x, s1.y); g.lineBetween(s3.x, s3.y, s2.x, s2.y);
          g.lineBetween(b0.x, b0.y, b3.x, b3.y); g.lineBetween(b1.x, b1.y, b2.x, b2.y);
        } else if (k > 0.7 && Math.floor(time / 100) % 2 === 0) {
          g.lineStyle(2, 0xff8a9a, 0.7); g.strokeTriangle(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y);
        }
      }
    },
    drawAir(g, time) {
      for (const b of buds) {
        if (!b.cut) continue;
        const grow = clampN((time - b.cutAt) / 600, 0, 1);
        // The sapling: a thorny whip with a crown of leaves, binding tape at its foot.
        g.lineStyle(4, BARK, 1); g.lineBetween(b.x, b.y, b.x, b.y - 10 - grow * 30);
        g.lineStyle(3, 0xc8a868, 1); g.lineBetween(b.x - 6, b.y - 4, b.x + 6, b.y - 4);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + time / 500;
          g.fillStyle(i % 2 ? LEAF : YEW_LIT, 1); g.fillEllipse(b.x + Math.cos(a) * 10 * grow, b.y - 10 - grow * 30 + Math.sin(a) * 6 * grow, 10 * grow, 5 * grow);
        }
        if (b.pulses < PULSES && b.nextAt - time < 220) { g.fillStyle(0xffffff, 0.4); g.fillCircle(b.x, b.y - 16, 16); }
      }
    },
    onPhaseEnd() { buds = []; },
  };
};

// ── III. The Dome Breaks ─────────────────────────────────────────────
// The great dome gives. Panes come down in two waves, each pane's shadow growing on the floor
// before it lands. The waves never share a pane, and some of the floor is under no pane at all.
// The glass stays where it falls, and the jungle comes in after it, for the rest of her reign.

const domeBreaks = (tk: BossToolkit): SignatureMove => {
  const COLS = 6, ROWS = 4;
  const FALL_MS = 1050;
  interface Pane { c: number; r: number; fallAt: number; born: number; landed: boolean }
  let panes: Pane[] = [];
  /** Shards and creeping jungle left on the floor once the dome has gone — cosmetic, permanent. */
  let shards: { x: number; y: number; w: number; h: number; a: number }[] = [];
  let broken = false;
  const cw = () => tk.W / COLS, ch = () => (tk.H - FT) / ROWS;
  const rect = (p: Pane) => ({ x: p.c * cw(), y: FT + p.r * ch(), w: cw(), h: ch() });
  return {
    durationMs: 3200,
    windupMs: 900,
    gesture: 'raise',
    tell: 'THE DOME BREAKS',
    cast(time) {
      tk.sfx('crystal-shatter');
      tk.scene.cameras.main.shake(220, 0.004);
      const cells: { c: number; r: number }[] = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r });
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      const a = Math.round(cells.length * 0.4), b = Math.round(cells.length * 0.3);
      const w1 = time + tk.warn(FALL_MS), w2 = w1 + tk.warn(800);
      panes = [
        ...cells.slice(0, a).map((c) => ({ ...c, born: time, fallAt: w1, landed: false })),
        ...cells.slice(a, a + b).map((c) => ({ ...c, born: w1 - 200, fallAt: w2, landed: false })),
      ];
    },
    update(time) {
      const p = tk.player;
      for (const pn of panes) {
        if (pn.landed || time < pn.fallAt) continue;
        pn.landed = true;
        const r = rect(pn);
        if (p.active && p.x > r.x - 6 && p.x < r.x + r.w + 6 && p.y > r.y - 6 && p.y < r.y + r.h + 6) tk.hitPlayer(15, p.x, p.y);
        tk.sfx('ice-shatter');
        if (!broken) broken = true;
        if (shards.length < 60) {
          for (let i = 0; i < 2; i++) shards.push({ x: r.x + Math.random() * r.w, y: r.y + Math.random() * r.h, w: 10 + Math.random() * 16, h: 6 + Math.random() * 8, a: Math.random() * Math.PI });
        }
      }
      panes = panes.filter((pn) => !pn.landed || time < pn.fallAt + 320);
    },
    drawGround(g, time) {
      if (broken) {
        // The fallen glass, glinting, and the jungle creeping in along the walls.
        for (const s of shards) {
          g.fillStyle(GLASS, 0.18 + Math.sin(time / 500 + s.x) * 0.06);
          g.fillTriangle(s.x, s.y, s.x + Math.cos(s.a) * s.w, s.y + Math.sin(s.a) * s.w, s.x + Math.cos(s.a + 1.2) * s.h, s.y + Math.sin(s.a + 1.2) * s.h);
        }
        for (let i = 0; i < 12; i++) {
          const left = i % 2 === 0;
          const y = FT + 30 + Math.floor(i / 2) * 90;
          const x0 = left ? 0 : tk.W;
          const reach = 40 + Math.sin(time / 1500 + i) * 10;
          bramble(g, x0, y, x0 + (left ? reach : -reach), y + 30, time / 2000 + i, 0x2e5a22, 0.7);
          g.fillStyle(LEAF, 0.7); g.fillEllipse(x0 + (left ? reach : -reach), y + 30, 14, 7);
        }
      }
      for (const pn of panes) {
        if (pn.landed) continue;
        const r = rect(pn);
        const k = clampN((time - pn.born) / Math.max(1, pn.fallAt - pn.born), 0, 1);
        if (k <= 0) continue;
        // The shadow of the pane coming down — it sharpens and darkens as it nears.
        const inset = (1 - k) * 22;
        g.fillStyle(0x000000, 0.1 + k * 0.32); g.fillRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2);
        g.lineStyle(2, GLASS, 0.15 + k * 0.4); g.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      }
    },
    drawAir(g, time) {
      for (const pn of panes) {
        const r = rect(pn);
        if (!pn.landed) {
          const k = clampN((time - pn.born) / Math.max(1, pn.fallAt - pn.born), 0, 1);
          if (k < 0.6) continue;
          // The pane itself, dropping out of the dome in the last beat.
          const f = (k - 0.6) / 0.4;
          const y = r.y - (1 - f) * 160;
          glassPane(g, r.x + 8, y + 8, r.w - 16, r.h - 16, 0.4 + f * 0.6, false);
          ironRib(g, r.x + 8, y + 8, r.x + r.w - 8, y + 8, 3);
          continue;
        }
        const k = (time - pn.fallAt) / 320;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + pn.c;
          const x = r.x + r.w / 2 + Math.cos(a) * (20 + k * 70), y = r.y + r.h / 2 + Math.sin(a) * (14 + k * 46) - Math.sin(k * Math.PI) * 20;
          g.fillStyle(GLASS, 0.8 * (1 - k)); g.fillTriangle(x, y, x + 9, y + 3, x + 2, y + 10);
        }
      }
    },
    onPhaseEnd() { panes = []; },
  };
};

// ── III. Creepers ────────────────────────────────────────────────────
// Three creepers come in off the walls and crawl the floor at you, turning slowly, leaving a mat
// of tangle behind them that drags and scratches. The heads bite. Make them turn — walk them in
// a circle — and keep the floor behind you clean.

const creepers = (tk: BossToolkit): SignatureMove => {
  const SPEED = 150;
  const TURN = 1.25;
  const LIFE = 3600;
  const TRAIL_MS = 2600;
  interface Creeper { x: number; y: number; a: number; born: number; startAt: number; dead: boolean; bit: boolean; trail: { x: number; y: number; at: number }[]; lastDrop: number }
  let cs: Creeper[] = [];
  let lastTick = 0;
  return {
    durationMs: 3200,
    windupMs: 900,
    hold: 'conduct',
    tell: 'CREEPERS',
    cast(time) {
      cs = [];
      const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 3);
      sides.forEach((s, i) => {
        const x = s === 0 ? 20 : s === 1 ? tk.W - 20 : 80 + Math.random() * (tk.W - 160);
        const y = s === 2 ? FT + 20 : s === 3 ? tk.H - 20 : FT + 60 + Math.random() * (tk.H - FT - 120);
        const p = tk.player;
        cs.push({ x, y, a: Math.atan2(p.y - y, p.x - x), born: time, startAt: time + tk.warn(800) + i * 300, dead: false, bit: false, trail: [], lastDrop: 0 });
      });
      tk.sfx('thorn');
    },
    update(time, dt) {
      const p = tk.player;
      for (const c of cs) {
        if (c.dead || time < c.startAt) continue;
        if (time - c.startAt > LIFE) { c.dead = true; continue; }
        const want = Math.atan2(p.y - c.y, p.x - c.x);
        const d = wrap(want - c.a);
        c.a += clampN(d, -TURN * dt, TURN * dt);
        c.x += Math.cos(c.a) * SPEED * dt; c.y += Math.sin(c.a) * SPEED * dt;
        if (time - c.lastDrop > 60) { c.lastDrop = time; c.trail.push({ x: c.x, y: c.y, at: time }); }
        if (!c.bit && p.active && dist(p.x, p.y, c.x, c.y) < 16 + PLAYER_R) {
          c.bit = true;
          c.dead = true;
          tk.hitPlayer(13, p.x, p.y);
          tk.boom(c.x, c.y, 28, LEAF);
        }
      }
      // The tangle left behind.
      let onTrail = false;
      for (const c of cs) {
        c.trail = c.trail.filter((t) => time - t.at < TRAIL_MS);
        if (!onTrail && p.active) onTrail = c.trail.some((t) => time - t.at > 250 && dist(p.x, p.y, t.x, t.y) < 14 + PLAYER_R * 0.6);
      }
      if (onTrail) {
        tk.slowPlayer(0.6, 200);
        if (time - lastTick > 450) { lastTick = time; tk.hitPlayer(4, p.x, p.y); }
      }
      cs = cs.filter((c) => !c.dead || c.trail.length > 0);
    },
    drawGround(g, time) {
      for (const c of cs) {
        if (time < c.startAt) {
          // Where it will come in: leaves stirring on the wall.
          const k = clampN((time - c.born) / Math.max(1, c.startAt - c.born), 0, 1);
          g.fillStyle(LEAF, 0.2 + k * 0.5); g.fillCircle(c.x, c.y, 10 + k * 14);
          g.lineStyle(2, YEW_LIT, 0.3 + k * 0.4); g.lineBetween(c.x, c.y, c.x + Math.cos(c.a) * 60 * k, c.y + Math.sin(c.a) * 60 * k);
          continue;
        }
        for (let i = 1; i < c.trail.length; i++) {
          const a = c.trail[i - 1], b = c.trail[i];
          const age = (time - b.at) / TRAIL_MS;
          g.lineStyle(14, 0x1e3a14, 0.55 * (1 - age)); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(3, 0x4a8a2a, 0.9 * (1 - age)); g.lineBetween(a.x, a.y, b.x, b.y);
          if (i % 3 === 0) { g.fillStyle(YEW_LIT, 0.9 * (1 - age)); g.fillEllipse(b.x + Math.sin(i) * 7, b.y + Math.cos(i) * 7, 8, 4); }
        }
      }
    },
    drawAir(g, time) {
      for (const c of cs) {
        if (c.dead || time < c.startAt) continue;
        // The growing tip: a curl of new shoot, two leaves and a hooked mouth of thorns.
        g.fillStyle(0x2e5a22, 1); g.fillCircle(c.x, c.y, 12);
        g.fillStyle(LEAF, 1); g.fillEllipse(c.x - Math.sin(c.a) * 10, c.y + Math.cos(c.a) * 10, 14, 7); g.fillEllipse(c.x + Math.sin(c.a) * 10, c.y - Math.cos(c.a) * 10, 14, 7);
        g.lineStyle(3, YEW_LIT, 1);
        g.beginPath(); g.arc(c.x + Math.cos(c.a) * 10, c.y + Math.sin(c.a) * 10, 7, c.a - 2 + time / 200, c.a + 1 + time / 200, false); g.strokePath();
        g.fillStyle(0xe8d8b0, 1);
        for (const s of [-1, 1]) g.fillTriangle(c.x + Math.cos(c.a) * 12, c.y + Math.sin(c.a) * 12, c.x + Math.cos(c.a + s * 0.6) * 18, c.y + Math.sin(c.a + s * 0.6) * 18, c.x + Math.cos(c.a + s * 0.3) * 8, c.y + Math.sin(c.a + s * 0.3) * 8);
      }
    },
    onPhaseEnd() { cs = []; },
  };
};

// ── III. Pitcher Plants ──────────────────────────────────────────────
// Three pitchers swell up round you, one after another. Each opens its lid and drinks — the
// air goes into it, and you with the air — then the lid snaps shut on whatever is at its lip.
// Walk away from the one that is drinking.

const pitchers = (tk: BossToolkit): SignatureMove => {
  const DRINK_MS = 1300;
  const SNAP_R = 56;
  interface Pitcher { x: number; y: number; born: number; drinkAt: number; snapAt: number; snapped: boolean }
  let ps: Pitcher[] = [];
  return {
    durationMs: 4200,
    windupMs: 850,
    hold: 'reach',
    tell: 'PITCHER PLANTS',
    cast(time) {
      ps = [];
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i / 3) * Math.PI * 2;
        const r = 130 + Math.random() * 40;
        const drinkAt = time + tk.warn(700) + i * 1100;
        ps.push({ x: tk.clampX(p.x + Math.cos(a) * r, 70), y: tk.clampY(p.y + Math.sin(a) * r, 70), born: time, drinkAt, snapAt: drinkAt + DRINK_MS, snapped: false });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const pc of ps) {
        if (time >= pc.drinkAt && time < pc.snapAt) {
          if (time - pc.drinkAt < 30) { tk.pull(pc.x, pc.y, tk.hard ? 96 : 84, DRINK_MS); tk.sfx('gust'); }
        }
        if (!pc.snapped && time >= pc.snapAt) {
          pc.snapped = true;
          tk.sfx('trap-snap');
          if (p.active && dist(p.x, p.y, pc.x, pc.y) < SNAP_R + PLAYER_R * 0.5) {
            tk.hitPlayer(16, p.x, p.y);
            float(tk, p.x, p.y - 44, 'DIGESTED', '#c8d870');
          }
        }
      }
      ps = ps.filter((pc) => time < pc.snapAt + 500);
    },
    drawGround(g, time) {
      for (const pc of ps) {
        const drinking = time >= pc.drinkAt && time < pc.snapAt;
        g.lineStyle(2, 0xc8d870, drinking ? 0.7 : 0.3); g.strokeCircle(pc.x, pc.y, SNAP_R);
        if (drinking) {
          for (let i = 0; i < 14; i++) {
            const ph = ((time / 700) + i / 14) % 1;
            const a = (i / 14) * Math.PI * 2;
            const r = 220 * (1 - ph) + 20;
            g.lineStyle(2, 0xe8f0c8, 0.35 * ph);
            g.lineBetween(pc.x + Math.cos(a) * r, pc.y + Math.sin(a) * r, pc.x + Math.cos(a) * (r - 18), pc.y + Math.sin(a) * (r - 18));
          }
          if (pc.snapAt - time < 400 && Math.floor(time / 90) % 2 === 0) { g.fillStyle(0xff8a6a, 0.2); g.fillCircle(pc.x, pc.y, SNAP_R); }
        }
      }
    },
    drawAir(g, time) {
      for (const pc of ps) {
        const grow = clampN((time - pc.born) / 400, 0, 1);
        const open = time >= pc.drinkAt && time < pc.snapAt ? 1 : 0;
        const snapK = pc.snapped ? clampN((time - pc.snapAt) / 120, 0, 1) : 0;
        const h = 44 * grow;
        // The pitcher: a fat green-and-red urn with a lid on a hinge.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(pc.x, pc.y + 4, 40, 12);
        g.fillStyle(0x3a6a22, 1); g.fillEllipse(pc.x, pc.y - h * 0.4, 34 * grow, h);
        g.fillStyle(0x8a2a2a, 0.8);
        for (let k = 0; k < 4; k++) g.fillEllipse(pc.x - 8 + k * 5, pc.y - h * 0.4 + (k % 2) * 8, 4, 10 * grow);
        g.fillStyle(0xa83a3a, 1); g.fillEllipse(pc.x, pc.y - h * 0.9, 30 * grow, 9 * grow);
        g.fillStyle(0x1a0a0a, 1); g.fillEllipse(pc.x, pc.y - h * 0.9, 22 * grow, 6 * grow);
        const lidA = -Math.PI / 2 - (open ? 1.1 : 0) * (1 - snapK);
        const hx = pc.x + 12 * grow, hy = pc.y - h * 0.9;
        g.fillStyle(0x4a7a2a, 1);
        g.fillEllipse(hx + Math.cos(lidA) * 14 - 12, hy + Math.sin(lidA) * 10 + (open ? 0 : 2), 28 * grow, 9 * grow);
        if (snapK > 0 && snapK < 1) { g.fillStyle(0xffffff, 0.5 * (1 - snapK)); g.fillCircle(pc.x, pc.y - h * 0.9, 26); }
      }
    },
    onPhaseEnd() { ps = []; },
  };
};

// ── IV. Rot and Bloom ────────────────────────────────────────────────
// The floor is a chequer of beds. Half go to rot — steaming first, then soft and stinking, and
// it eats at you while you stand in it. Then the chequer turns: the rotten beds burst into
// flower and the clean ones rot. Hop with the turn.

const rotAndBloom = (tk: BossToolkit): SignatureMove => {
  const COLS = 4, ROWS = 3;
  const WARN1 = 1000, ROT_MS = 1500, WARN2 = 750;
  let active = false;
  let parity = 0;
  let born = 0;
  let t1 = 0, t2 = 0, t3 = 0, t4 = 0;
  let lastTick = 0;
  const cw = () => tk.W / COLS, ch = () => (tk.H - FT) / ROWS;
  const cellOf = (x: number, y: number) => ({ c: clampN(Math.floor(x / cw()), 0, COLS - 1), r: clampN(Math.floor((y - FT) / ch()), 0, ROWS - 1) });
  /** Which parity is rotten at `time`, or -1 if nothing is biting yet / any more. */
  const rotting = (time: number): number => (time >= t1 && time < t2 ? parity : time >= t3 && time < t4 ? 1 - parity : -1);
  const warning = (time: number): number => (time < t1 ? parity : time >= t2 && time < t3 ? 1 - parity : -1);
  return {
    durationMs: 4800,
    windupMs: 900,
    hold: 'brace',
    tell: 'ROT AND BLOOM',
    cast(time) {
      active = true;
      born = time;
      parity = Math.random() < 0.5 ? 0 : 1;
      t1 = time + tk.warn(WARN1); t2 = t1 + ROT_MS; t3 = t2 + tk.warn(WARN2); t4 = t3 + ROT_MS;
      tk.sfx('status-poison');
      tk.schedule(t2 - time, () => { float(tk, tk.W / 2, FT + 30, 'THE ROT BLOOMS', '#ff9ab8'); tk.sfx('sparkle'); });
    },
    update(time) {
      if (!active) return;
      if (time > t4) { active = false; return; }
      const rp = rotting(time);
      const p = tk.player;
      if (rp < 0 || !p.active) return;
      const { c, r } = cellOf(p.x, p.y);
      if ((c + r) % 2 === rp) {
        tk.slowPlayer(0.7, 200);
        if (time - lastTick > 400) { lastTick = time; tk.hitPlayer(6, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const rp = rotting(time), wp = warning(time);
      const bloomP = time >= t2 ? parity : -1;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const x = c * cw(), y = FT + r * ch();
        const par = (c + r) % 2;
        const seed = c * 7 + r * 13;
        if (par === rp) {
          // Rotten: a black-brown bed, mushrooms up, flies.
          g.fillStyle(ROT_DEEP, 0.55); g.fillRect(x + 2, y + 2, cw() - 4, ch() - 4);
          for (let i = 0; i < 9; i++) {
            const mx = x + 20 + ((seed * 37 + i * 53) % (cw() - 40)), my = y + 20 + ((seed * 17 + i * 41) % (ch() - 40));
            g.fillStyle(ROT, 0.8); g.fillEllipse(mx, my, 30, 12);
            if (i % 3 === 0) { g.fillStyle(FUNGUS, 0.9); g.fillEllipse(mx, my - 6, 10, 6); g.fillStyle(0x6a5a3a, 1); g.fillRect(mx - 1, my - 4, 2, 5); }
            const fl = time / 120 + i;
            g.fillStyle(0x1a1a10, 0.8); g.fillCircle(mx + Math.cos(fl) * 10, my - 16 + Math.sin(fl * 1.3) * 5, 1.4);
          }
        } else if (par === wp) {
          // About to rot: it steams.
          const k = time < t1 ? clampN((time - born) / Math.max(1, t1 - born), 0, 1) : clampN((time - t2) / Math.max(1, t3 - t2), 0, 1);
          g.fillStyle(ROT, 0.1 + k * 0.25); g.fillRect(x + 2, y + 2, cw() - 4, ch() - 4);
          for (let i = 0; i < 5; i++) {
            const ph = ((time / 900) + i / 5) % 1;
            g.fillStyle(0xc8b890, (1 - ph) * 0.35 * k); g.fillCircle(x + 30 + ((seed + i * 47) % (cw() - 60)), y + ch() - 20 - ph * 50, 6 + ph * 8);
          }
          if (k > 0.75 && Math.floor(time / 110) % 2 === 0) { g.lineStyle(2, 0xc8a868, 0.7); g.strokeRect(x + 4, y + 4, cw() - 8, ch() - 8); }
        }
        if (par === bloomP && par !== rp) {
          // What rotted, blooming: flowers through the compost.
          for (let i = 0; i < 8; i++) {
            const fx = x + 18 + ((seed * 29 + i * 61) % (cw() - 36)), fy = y + 18 + ((seed * 11 + i * 37) % (ch() - 36));
            rose(g, fx, fy, 5, i % 2 ? ROSE : ROSE_PALE, clampN((time - t2) / 400, 0.2, 1));
          }
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── IV. Worm Casts ───────────────────────────────────────────────────
// Something is turning the compost. Three mounds of earth come at you under the floor — slowly
// turning to follow — and stop, and swell, and burst. When a mound stops, it is about to surface.

const wormCasts = (tk: BossToolkit): SignatureMove => {
  const SPEED = 165;
  const TURN = 1.6;
  const RUN_MS = 1900;
  const SURFACE_MS = 650;
  const R = 52;
  interface Worm { x: number; y: number; a: number; startAt: number; stopAt: number; burstAt: number; burst: boolean; trail: { x: number; y: number }[] }
  let worms: Worm[] = [];
  return {
    durationMs: 3600,
    windupMs: 850,
    gesture: 'slam',
    tell: 'WORM CASTS',
    cast(time) {
      worms = [];
      for (let i = 0; i < 3; i++) {
        const startAt = time + tk.warn(400) + i * 520;
        const stopAt = startAt + RUN_MS;
        const a = tk.angleToPlayer() + (i - 1) * 0.7;
        worms.push({ x: tk.bossX, y: tk.bossY, a, startAt, stopAt, burstAt: stopAt + tk.warn(SURFACE_MS), burst: false, trail: [] });
      }
      tk.sfx('quake');
    },
    update(time, dt) {
      const p = tk.player;
      for (const w of worms) {
        if (time >= w.startAt && time < w.stopAt) {
          const want = Math.atan2(p.y - w.y, p.x - w.x);
          w.a += clampN(wrap(want - w.a), -TURN * dt, TURN * dt);
          w.x = tk.clampX(w.x + Math.cos(w.a) * SPEED * dt, 40); w.y = tk.clampY(w.y + Math.sin(w.a) * SPEED * dt, 40);
          if (w.trail.length === 0 || dist(w.x, w.y, w.trail[w.trail.length - 1].x, w.trail[w.trail.length - 1].y) > 14) w.trail.push({ x: w.x, y: w.y });
        }
        if (!w.burst && time >= w.burstAt) {
          w.burst = true;
          tk.explode(w.x, w.y, R, 14, ROT);
          tk.sfx('rock-throw');
        }
      }
      worms = worms.filter((w) => !w.burst || time < w.burstAt + 600);
    },
    drawGround(g, time) {
      for (const w of worms) {
        // The ridge of turned earth it has left.
        for (let i = 0; i < w.trail.length; i++) {
          const t = w.trail[i];
          g.fillStyle(ROT, 0.55); g.fillEllipse(t.x, t.y, 18, 10);
          g.fillStyle(lit(ROT, 0.2), 0.5); g.fillEllipse(t.x - 2, t.y - 2, 8, 4);
        }
        if (time < w.startAt) continue;
        if (time >= w.stopAt && !w.burst) {
          const k = clampN((time - w.stopAt) / Math.max(1, w.burstAt - w.stopAt), 0, 1);
          g.fillStyle(ROT_DEEP, 0.2 + k * 0.4); g.fillCircle(w.x, w.y, R * (0.5 + k * 0.5));
          g.lineStyle(3, 0xc8a868, 0.4 + k * 0.5); g.strokeCircle(w.x, w.y, R);
        }
      }
    },
    drawAir(g, time) {
      for (const w of worms) {
        if (time < w.startAt) continue;
        if (!w.burst) {
          // The mound, heaving as it goes.
          const heave = 1 + Math.sin(time / 70) * 0.12 + (time >= w.stopAt ? clampN((time - w.stopAt) / 600, 0, 1) * 0.5 : 0);
          g.fillStyle(SOIL, 1); g.fillEllipse(w.x, w.y - 4, 30 * heave, 16 * heave);
          g.fillStyle(lit(SOIL, 0.2), 1); g.fillEllipse(w.x - 4, w.y - 8, 12, 6);
          for (let i = 0; i < 3; i++) { g.fillStyle(0x6a5a3a, 1); g.fillCircle(w.x - 10 + i * 10, w.y - 8 + Math.sin(time / 40 + i) * 3, 2); }
          continue;
        }
        const k = (time - w.burstAt) / 600;
        // The worm, rearing out of the cast for a moment.
        g.lineStyle(10, 0xc87a6a, 1 - k); g.lineBetween(w.x, w.y, w.x + Math.sin(k * 6) * 10, w.y - 40 * Math.sin(k * Math.PI));
        g.fillStyle(0xd88a7a, 1 - k); g.fillCircle(w.x + Math.sin(k * 6) * 10, w.y - 40 * Math.sin(k * Math.PI), 6);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(SOIL, 1 - k); g.fillCircle(w.x + Math.cos(a) * (10 + k * 50), w.y + Math.sin(a) * (6 + k * 30) - Math.sin(k * Math.PI) * 20, 4);
        }
      }
    },
    onPhaseEnd() { worms = []; },
  };
};

// ── IV. Gone to Seed ─────────────────────────────────────────────────
// She goes to seed and blows. A curtain of down drifts across the room from one wall, bobbing on
// the air, with three gaps in it you can see coming; then a second from the other side with its
// gaps somewhere else. Wait in a gap.

const goneToSeed = (tk: BossToolkit): SignatureMove => {
  const SPEED = 125;
  const N = 30;
  const GAP = 80;
  interface Seed { x: number; y0: number; dir: 1 | -1; startAt: number; ph: number; dead: boolean }
  let seeds: Seed[] = [];
  let curtains: { dir: 1 | -1; gaps: number[]; born: number; startAt: number }[] = [];
  const curtain = (time: number, dir: 1 | -1) => {
    const span = tk.H - FT - 40;
    const gaps = [0, 1, 2].map((i) => FT + 40 + ((i + 0.5) / 3) * span + (Math.random() - 0.5) * span * 0.18);
    const startAt = time + tk.warn(1000);
    curtains.push({ dir, gaps, born: time, startAt });
    for (let i = 0; i < N; i++) {
      const y0 = FT + 30 + (i / (N - 1)) * (tk.H - FT - 60);
      if (gaps.some((gy) => Math.abs(gy - y0) < GAP / 2 + 10)) continue;
      seeds.push({ x: dir > 0 ? -10 : tk.W + 10, y0, dir, startAt: startAt + (Math.random() * 120), ph: Math.random() * Math.PI * 2, dead: false });
    }
  };
  const seedY = (s: Seed, time: number) => s.y0 + Math.sin((time - s.startAt) / 400 + s.ph) * 9;
  return {
    durationMs: 4200,
    windupMs: 900,
    gesture: 'raise',
    tell: 'GONE TO SEED',
    cast(time) {
      seeds = []; curtains = [];
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      curtain(time, dir);
      tk.schedule(1700, () => curtain(tk.now, (-dir) as 1 | -1));
      tk.sfx('gust');
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of seeds) {
        if (s.dead || time < s.startAt) continue;
        s.x += s.dir * SPEED * dt;
        if (s.x < -30 || s.x > tk.W + 30) { s.dead = true; continue; }
        if (p.active && dist(p.x, p.y, s.x, seedY(s, time)) < 9 + PLAYER_R) {
          s.dead = true;
          tk.hitPlayer(7, p.x, p.y);
        }
      }
      seeds = seeds.filter((s) => !s.dead);
      curtains = curtains.filter((c) => time < c.startAt + ((tk.W + 60) / SPEED) * 1000);
    },
    drawGround(g, time) {
      for (const c of curtains) {
        if (time > c.startAt + 600) continue;
        const k = clampN((time - c.born) / Math.max(1, c.startAt - c.born), 0, 1);
        // The gaps, shown as lanes of still air across the room, arrows the way the down will come.
        for (const gy of c.gaps) {
          g.fillStyle(0xffffff, 0.04 + k * 0.08); g.fillRect(0, gy - GAP / 2, tk.W, GAP);
          g.lineStyle(1.5, 0xffffff, 0.2 + k * 0.3); g.lineBetween(0, gy - GAP / 2, tk.W, gy - GAP / 2); g.lineBetween(0, gy + GAP / 2, tk.W, gy + GAP / 2);
        }
        const ex = c.dir > 0 ? 20 : tk.W - 20;
        for (let i = 0; i < 6; i++) {
          const y = FT + 60 + i * ((tk.H - FT - 120) / 5);
          g.lineStyle(3, DOWN, 0.3 + k * 0.4);
          g.lineBetween(ex, y - 10, ex + c.dir * 14, y); g.lineBetween(ex + c.dir * 14, y, ex, y + 10);
        }
      }
    },
    drawAir(g, time) {
      for (const s of seeds) {
        if (time < s.startAt) continue;
        const y = seedY(s, time);
        // A dandelion seed: a dark achene hanging under a parasol of white down.
        g.lineStyle(1, 0xc8c0a8, 0.9); g.lineBetween(s.x, y, s.x, y - 10);
        g.fillStyle(0x6a5a3a, 1); g.fillEllipse(s.x, y + 2, 3, 6);
        for (let k = 0; k < 7; k++) {
          const a = -Math.PI + (k / 6) * Math.PI;
          g.lineStyle(1, DOWN, 0.9); g.lineBetween(s.x, y - 10, s.x + Math.cos(a) * 9, y - 10 + Math.sin(a) * 6);
        }
        g.fillStyle(DOWN, 0.25); g.fillEllipse(s.x, y - 12, 20, 9);
      }
    },
    onPhaseEnd() { seeds = []; curtains = []; },
  };
};

// ── V (hard). Holly ──────────────────────────────────────────────────
// Holly leaves spin off her on a turning spiral, edges like saws. Where each one comes to rest it
// drops its berry, and the berry bursts. Read the arms — they turn as they go out.

const holly = (tk: BossToolkit): SignatureMove => {
  const N = 7;
  const OUT = 220;
  const TURN = 1.3;
  const LIFE = 1700;
  const R = 13;
  interface Leaf { a0: number; ox: number; oy: number; startAt: number; hit: boolean; dropped: boolean }
  let leaves: Leaf[] = [];
  const pos = (l: Leaf, time: number) => {
    const s = clampN((time - l.startAt) / 1000, 0, LIFE / 1000);
    const a = l.a0 + s * TURN;
    return { x: l.ox + Math.cos(a) * OUT * s, y: l.oy + Math.sin(a) * OUT * s, spin: s * 14 };
  };
  return {
    durationMs: 3000,
    windupMs: 850,
    hold: 'charge',
    tell: 'HOLLY',
    cast(time) {
      leaves = [];
      const a0 = Math.random() * Math.PI * 2;
      const start = time + tk.warn(700);
      for (let w = 0; w < 2; w++) {
        for (let i = 0; i < N; i++) leaves.push({ a0: a0 + (i / N) * Math.PI * 2 + w * (Math.PI / N), ox: tk.bossX, oy: tk.bossY, startAt: start + w * 650, hit: false, dropped: false });
      }
      tk.sfx('slash');
    },
    update(time) {
      const p = tk.player;
      for (const l of leaves) {
        if (time < l.startAt) continue;
        const q = pos(l, time);
        if (!l.hit && time - l.startAt < LIFE && p.active && dist(p.x, p.y, q.x, q.y) < R + PLAYER_R) {
          l.hit = true;
          tk.hitPlayer(11, p.x, p.y);
        }
        if (!l.dropped && time - l.startAt >= LIFE) {
          l.dropped = true;
          tk.spawnZone({ x: q.x, y: q.y, radius: 40, warnMs: 650, damage: 9 });
        }
      }
      leaves = leaves.filter((l) => time < l.startAt + LIFE + 900);
    },
    drawGround(g, time) {
      for (const l of leaves) {
        if (time >= l.startAt) continue;
        // The arm it will fly along, chalked in frost.
        g.lineStyle(1.5, FROST, 0.35);
        g.beginPath();
        for (let s = 0; s <= 10; s++) {
          const f = (s / 10) * (LIFE / 1000);
          const a = l.a0 + f * TURN;
          const x = l.ox + Math.cos(a) * OUT * f, y = l.oy + Math.sin(a) * OUT * f;
          if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const l of leaves) {
        if (time < l.startAt) continue;
        const q = pos(l, time);
        if (time - l.startAt >= LIFE) {
          // The berry left lying.
          g.fillStyle(BERRY, 1); g.fillCircle(q.x, q.y, 5); g.fillStyle(0xffffff, 0.7); g.fillCircle(q.x - 1.5, q.y - 1.5, 1.5);
          continue;
        }
        if (l.hit) continue;
        const ca = Math.cos(q.spin), sa = Math.sin(q.spin);
        // A holly leaf: a long lobed blade with spined points, a berry at its stem.
        const pts: { x: number; y: number }[] = [];
        for (let k = 0; k <= 10; k++) {
          const u = -1 + (k / 10) * 2;
          const v = (k % 2 ? 1 : 0.55) * (1 - u * u) * 9 + 1;
          pts.push({ x: q.x + ca * u * 16 - sa * v, y: q.y + sa * u * 16 + ca * v });
        }
        for (let k = 10; k >= 0; k--) {
          const u = -1 + (k / 10) * 2;
          const v = -((k % 2 ? 1 : 0.55) * (1 - u * u) * 9 + 1);
          pts.push({ x: q.x + ca * u * 16 - sa * v, y: q.y + sa * u * 16 + ca * v });
        }
        g.fillStyle(HOLLY, 1); g.fillPoints(pts as Phaser.Types.Math.Vector2Like[], true, true);
        g.lineStyle(1, lit(HOLLY, 0.4), 1); g.lineBetween(q.x - ca * 15, q.y - sa * 15, q.x + ca * 15, q.y + sa * 15);
        g.fillStyle(BERRY, 1); g.fillCircle(q.x - ca * 16, q.y - sa * 16, 3.5);
      }
    },
    onPhaseEnd() { leaves = []; },
  };
};

// ── V (hard). Needle Fall ────────────────────────────────────────────
// Pine needles come down everywhere at once, a hard green rain — everywhere but under one bough
// that reaches across the room on the slant. The bough drifts. Keep under it.

const needleFall = (tk: BossToolkit): SignatureMove => {
  const HALF = 72;
  const SLANT = 1.05;
  const RUN_MS = 3800;
  const DRIFT = 110;
  let active = false;
  let born = 0, startAt = 0, endAt = 0;
  let c0 = 0;
  let dir = 1;
  let lastTick = 0;
  // The bough is a band through a moving point, perpendicular offset along the normal.
  const nx = Math.cos(SLANT), ny = Math.sin(SLANT);
  const centre = (time: number) => c0 + dir * DRIFT * clampN((time - startAt) / 1000, 0, RUN_MS / 1000);
  const offset = (x: number, y: number) => (x - tk.W / 2) * nx + (y - (FT + tk.H) / 2) * ny;
  return {
    durationMs: 4600,
    windupMs: 900,
    hold: 'brace',
    tell: 'NEEDLE FALL',
    cast(time) {
      active = true;
      born = time;
      startAt = time + tk.warn(1200);
      endAt = startAt + RUN_MS;
      const p = tk.player;
      const po = offset(p.x, p.y);
      // Start the bough near the player, drifting toward the far side of the room.
      dir = po > 0 ? -1 : 1;
      c0 = po + dir * -40;
      tk.sfx('rain');
    },
    update(time) {
      if (!active) return;
      if (time > endAt) { active = false; return; }
      if (time < startAt) return;
      const p = tk.player;
      if (!p.active) return;
      if (Math.abs(offset(p.x, p.y) - centre(time)) > HALF && time - lastTick > 360) {
        lastTick = time;
        tk.hitPlayer(5, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clampN((time - born) / Math.max(1, startAt - born), 0, 1);
      const c = centre(time);
      // The bough's shelter on the floor: a band of dry needles-shadow.
      const tx = -ny, ty = nx;
      const mx = tk.W / 2 + nx * c, my = (FT + tk.H) / 2 + ny * c;
      const L = 900;
      const a1 = { x: mx + nx * HALF + tx * L, y: my + ny * HALF + ty * L };
      const a2 = { x: mx + nx * HALF - tx * L, y: my + ny * HALF - ty * L };
      const b1 = { x: mx - nx * HALF + tx * L, y: my - ny * HALF + ty * L };
      const b2 = { x: mx - nx * HALF - tx * L, y: my - ny * HALF - ty * L };
      g.fillStyle(0x0a1a10, 0.2 + k * 0.25); g.fillTriangle(a1.x, a1.y, a2.x, a2.y, b2.x, b2.y); g.fillTriangle(a1.x, a1.y, b2.x, b2.y, b1.x, b1.y);
      g.lineStyle(2, FROST, 0.3 + k * 0.4); g.lineBetween(a1.x, a1.y, a2.x, a2.y); g.lineBetween(b1.x, b1.y, b2.x, b2.y);
      // Arrows showing the way the bough will move.
      for (let i = -3; i <= 3; i++) {
        const ax = mx + tx * i * 110, ay = my + ty * i * 110;
        g.lineStyle(2, FROST, 0.4);
        g.lineBetween(ax - nx * dir * 10 + tx * 8, ay - ny * dir * 10 + ty * 8, ax + nx * dir * 6, ay + ny * dir * 6);
        g.lineBetween(ax - nx * dir * 10 - tx * 8, ay - ny * dir * 10 - ty * 8, ax + nx * dir * 6, ay + ny * dir * 6);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const c = centre(time);
      const raining = time >= startAt;
      // The needles, falling on the slant everywhere outside the shelter.
      const n = raining ? 90 : 20;
      for (let i = 0; i < n; i++) {
        const fx = ((i * 0.618) % 1) * tk.W;
        const fall = ((time / (raining ? 380 : 900)) + i * 0.137) % 1;
        const x = (fx + fall * 60) % tk.W, y = FT + fall * (tk.H - FT);
        if (Math.abs(offset(x, y) - c) < HALF) continue;
        g.lineStyle(1.5, i % 3 ? PINE : lit(PINE, 0.3), raining ? 0.9 : 0.4);
        g.lineBetween(x, y, x + 4, y + 12);
      }
      // The bough itself, overhead: a long fir branch drawn faint above the shelter.
      const tx = -ny, ty = nx;
      const mx = tk.W / 2 + nx * c, my = (FT + tk.H) / 2 + ny * c - 30;
      g.lineStyle(5, BARK, 0.35); g.lineBetween(mx - tx * 700, my - ty * 700, mx + tx * 700, my + ty * 700);
      for (let i = -12; i <= 12; i++) {
        const bx = mx + tx * i * 45, by = my + ty * i * 45;
        g.lineStyle(3, PINE, 0.35);
        g.lineBetween(bx, by, bx + nx * 26 + tx * 10, by + ny * 26 + ty * 10); g.lineBetween(bx, by, bx - nx * 26 + tx * 10, by - ny * 26 + ty * 10);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── V (hard). Heart-Seeds ────────────────────────────────────────────
// She buries three seeds of herself in the floor, each in a ring of thorns that springs at once.
// After the thorns, the seed lies bare for a while: trample it. Any seed left to ripen heals her.

const heartSeeds = (tk: BossToolkit): SignatureMove => {
  const INNER = 26, OUTER = 74;
  const RIPEN_MS = 3400;
  interface HSeed { x: number; y: number; born: number; ringAt: number; ripeAt: number; rung: boolean; done: boolean; trodden: boolean }
  let hs: HSeed[] = [];
  return {
    durationMs: 3400,
    windupMs: 850,
    gesture: 'slam',
    tell: 'HEART-SEEDS',
    cast(time) {
      hs = [];
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i / 3) * Math.PI * 2;
        const r = 170 + Math.random() * 90;
        const ringAt = time + tk.warn(950);
        hs.push({ x: tk.clampX(p.x + Math.cos(a) * r, 80), y: tk.clampY(p.y + Math.sin(a) * r, 80), born: time, ringAt, ripeAt: ringAt + RIPEN_MS, rung: false, done: false, trodden: false });
      }
      tk.sfx('heartbeat');
    },
    update(time) {
      const p = tk.player;
      for (const s of hs) {
        if (s.done) continue;
        if (!s.rung && time >= s.ringAt) {
          s.rung = true;
          tk.sfx('thorn');
          const d = dist(p.x, p.y, s.x, s.y);
          if (p.active && d > INNER - 4 && d < OUTER + PLAYER_R) tk.hitPlayer(12, p.x, p.y);
        }
        if (s.rung && p.active && dist(p.x, p.y, s.x, s.y) < INNER + 6) {
          s.done = true; s.trodden = true;
          float(tk, s.x, s.y - 30, 'TRAMPLED', '#c8a868');
          tk.sfx('stone-slam');
          continue;
        }
        if (time >= s.ripeAt) {
          s.done = true;
          tk.healBoss(tk.hard ? 24 : 18, s.x, s.y);
          tk.sfx('heal');
        }
      }
      hs = hs.filter((s) => !s.done || time < s.ripeAt + 600);
    },
    drawGround(g, time) {
      for (const s of hs) {
        if (s.done) continue;
        if (!s.rung) {
          const k = clampN((time - s.born) / Math.max(1, s.ringAt - s.born), 0, 1);
          // The ring the thorns will spring from — the middle stays clear.
          g.fillStyle(HOLLY, 0.12 + k * 0.25);
          g.fillCircle(s.x, s.y, OUTER);
          g.fillStyle(0xe8f8ff, 0.12 + k * 0.1); g.fillCircle(s.x, s.y, INNER);
          g.lineStyle(2, FROST, 0.3 + k * 0.5); g.strokeCircle(s.x, s.y, OUTER); g.strokeCircle(s.x, s.y, INNER);
        } else {
          const k = clampN((time - s.ringAt) / RIPEN_MS, 0, 1);
          g.lineStyle(3, VERDIGRIS, 0.6); g.beginPath(); g.arc(s.x, s.y, INNER + 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      for (const s of hs) {
        if (s.done) continue;
        if (s.rung && time - s.ringAt < 500) {
          const f = (time - s.ringAt) / 500;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            bramble(g, s.x + Math.cos(a) * INNER, s.y + Math.sin(a) * INNER, s.x + Math.cos(a) * OUTER, s.y + Math.sin(a) * OUTER, time / 1000, HOLLY, 1 - f);
          }
        }
        // The seed: a green-gold heart, beating, frost on it.
        const beat = 1 + Math.max(0, Math.sin(time / 160)) * 0.25 * (s.rung ? clampN((time - s.ringAt) / RIPEN_MS, 0.2, 1) : 0.2);
        const r = 9 * beat;
        g.fillStyle(VERDIGRIS_DEEP, 1); g.fillCircle(s.x - r * 0.5, s.y - r * 0.3, r * 0.7); g.fillCircle(s.x + r * 0.5, s.y - r * 0.3, r * 0.7);
        g.fillTriangle(s.x - r * 1.15, s.y - r * 0.1, s.x + r * 1.15, s.y - r * 0.1, s.x, s.y + r * 1.2);
        g.fillStyle(SAP, 0.8); g.fillCircle(s.x - r * 0.4, s.y - r * 0.5, r * 0.25);
        g.fillStyle(FROST, 0.6); g.fillCircle(s.x + r * 0.5, s.y + r * 0.1, 1.5);
      }
    },
    onPhaseEnd() { hs = []; },
  };
};

// ── Body decor ───────────────────────────────────────────────────────

/**
 * The Empress: a crown that is a little glasshouse dome of iron ribs and green glass with a rose
 * under it; a high collar of roses; a long gown of clipped yew that changes with the year; and in
 * her hand the great shears (Pruning), a grafting knife trailing scion-vine (Graft), nothing at
 * all as the jungle pours off her (Overgrowth), rot and bloom by turns (Compost), and in the
 * Evergreen a wreath of holly in place of the broken dome.
 */
function drawVerdigra(g: Gfx, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  const ph = s.phaseIdx;
  // Compost alternates every 3s between rot (0) and bloom (1).
  const rotting = ph === 3 && Math.floor(t / 3000) % 2 === 0;

  // ── The gown, spread under her.
  if (ph === 0) {
    // Clipped yew in a neat scalloped hem, roses at every point.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.12 + (0.76 * i) / 8);
      const x = s.x + Math.cos(a) * r * 1.15, y = s.y + Math.sin(a) * r * 1.0 + r * 0.25;
      g.fillStyle(dim(YEW, 0.25), 1); g.fillCircle(x, y, r * 0.32);
      g.fillStyle(YEW, 1); g.fillCircle(x, y - 2, r * 0.28);
      if (i % 2 === 0) rose(g, x, y + r * 0.2, r * 0.1, ROSE, 0.9);
    }
  } else if (ph === 1) {
    // Graft-tape binding vines all round the hem, scions waving out.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t / 2000;
      const len = r * (1.1 + Math.sin(t / 400 + i) * 0.25);
      bramble(g, s.x + Math.cos(a) * r * 0.8, s.y + Math.sin(a) * r * 0.8, s.x + Math.cos(a) * (r + len), s.y + Math.sin(a) * (r + len), t / 1000 + i, 0x4a8a2a, 0.9);
      g.lineStyle(3, 0xc8a868, 1);
      const bx = s.x + Math.cos(a) * r * 0.95, by = s.y + Math.sin(a) * r * 0.95;
      g.lineBetween(bx - Math.sin(a) * 5, by + Math.cos(a) * 5, bx + Math.sin(a) * 5, by - Math.cos(a) * 5);
    }
  } else if (ph === 2) {
    // Overgrown: fronds and leaves spilling every way, flowers in all of it.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.sin(t / 900 + i) * 0.1;
      const len = r * (0.9 + ((i * 37) % 10) / 20);
      const ex = s.x + Math.cos(a) * (r + len), ey = s.y + Math.sin(a) * (r + len) * 0.85;
      g.lineStyle(4, i % 2 ? LEAF : YEW_LIT, 0.9); g.lineBetween(s.x + Math.cos(a) * r * 0.7, s.y + Math.sin(a) * r * 0.7, ex, ey);
      for (let k = 1; k <= 3; k++) {
        const fx = s.x + Math.cos(a) * (r + len * k / 3), fy = s.y + Math.sin(a) * (r + len * k / 3) * 0.85;
        g.fillStyle(LEAF, 0.9); g.fillEllipse(fx + Math.cos(a + 1.4) * 5, fy + Math.sin(a + 1.4) * 5, 8, 4);
      }
      if (i % 3 === 0) rose(g, ex, ey, 4, i % 2 ? ROSE_PALE : 0xf0d84a, 1);
    }
  } else if (ph === 3) {
    if (rotting) {
      // Rot: a sodden brown skirt, toadstools, flies.
      g.fillStyle(ROT, 0.9); g.fillEllipse(s.x, s.y + r * 0.6, r * 2.8, r * 1.2);
      g.fillStyle(ROT_DEEP, 0.8); g.fillEllipse(s.x, s.y + r * 0.75, r * 2.2, r * 0.7);
      for (let i = 0; i < 6; i++) {
        const mx = s.x - r * 1.1 + i * r * 0.44, my = s.y + r * 0.9 + (i % 2) * 6;
        g.fillStyle(0x6a5a3a, 1); g.fillRect(mx - 1.5, my - 8, 3, 8);
        g.fillStyle(FUNGUS, 1); g.fillEllipse(mx, my - 9, 12, 6);
      }
      for (let i = 0; i < 6; i++) {
        const a = t / 140 + i * 1.1;
        g.fillStyle(0x1a1a10, 1); g.fillCircle(s.x + Math.cos(a) * r * 1.3, s.y - r * 0.2 + Math.sin(a * 1.7) * r * 0.6, 1.6);
      }
    } else {
      // Bloom: out of the same compost, every flower at once.
      g.fillStyle(SOIL, 0.8); g.fillEllipse(s.x, s.y + r * 0.6, r * 2.6, r * 1.1);
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * (0.05 + (0.9 * i) / 11);
        rose(g, s.x + Math.cos(a) * r * 1.2, s.y + Math.sin(a) * r * 0.7 + r * 0.3, r * 0.14, [ROSE, ROSE_PALE, 0xf0d84a, 0xc87ad8][i % 4], 1);
      }
    }
  } else {
    // Evergreen: a skirt of pine boughs, frosted, holly berries in it.
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (0.05 + (0.9 * i) / 9);
      const x0 = s.x + Math.cos(a) * r * 0.8, y0 = s.y + Math.sin(a) * r * 0.8;
      const x1 = s.x + Math.cos(a) * r * 1.8, y1 = s.y + Math.sin(a) * r * 1.4;
      g.lineStyle(3, BARK, 1); g.lineBetween(x0, y0, x1, y1);
      for (let k = 1; k < 6; k++) {
        const f = k / 6;
        const bx = x0 + (x1 - x0) * f, by = y0 + (y1 - y0) * f;
        g.lineStyle(2, PINE, 1); g.lineBetween(bx, by, bx + Math.cos(a + 0.9) * 9, by + Math.sin(a + 0.9) * 9); g.lineBetween(bx, by, bx + Math.cos(a - 0.9) * 9, by + Math.sin(a - 0.9) * 9);
      }
      g.fillStyle(FROST, 0.7); g.fillCircle(x1, y1, 2);
      if (i % 3 === 1) { g.fillStyle(BERRY, 1); g.fillCircle(x1 - 4, y1 - 3, 3); }
    }
  }

  // ── The rose collar.
  if (ph !== 4 && !(ph === 3 && rotting)) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + (0.9 * i) / 6);
      rose(g, s.x + Math.cos(a) * r * 0.95, s.y + Math.sin(a) * r * 0.55 + r * 0.25, r * 0.13, i % 2 ? ROSE : ROSE_DEEP, ph === 2 ? 1 : 0.85);
    }
  } else if (ph === 3) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + (0.9 * i) / 6);
      g.fillStyle(0x5a3a22, 1); g.fillCircle(s.x + Math.cos(a) * r * 0.95, s.y + Math.sin(a) * r * 0.55 + r * 0.25, r * 0.11);
    }
  }

  // ── What she holds.
  const h = s.hands[0];
  if (h && ph === 0) {
    shears(g, h.x, h.y, s.facing, 0.12 + s.castGlow * 0.3, r * 1.9, 1);
  } else if (h && ph === 1) {
    // The grafting knife: a curved blade, a scion vine trailing from her other hand to it.
    const a = s.facing;
    g.lineStyle(5, 0x3a2414, 1); g.lineBetween(h.x, h.y, h.x - Math.cos(a) * 12, h.y - Math.sin(a) * 12);
    g.lineStyle(3, 0xd8e4e8, 1);
    g.beginPath(); g.arc(h.x + Math.cos(a) * 10, h.y + Math.sin(a) * 10, 14, a - 1.6, a + 0.2, false); g.strokePath();
    const h2 = s.hands[1];
    if (h2) bramble(g, h2.x, h2.y, h.x, h.y, t / 1000, 0x4a8a2a, 0.8);
  } else if (h && ph === 4) {
    // A sprig of mistletoe-white frost held up.
    g.lineStyle(2, PINE, 1); g.lineBetween(h.x, h.y, h.x, h.y - 18);
    g.fillStyle(FROST, 0.9); g.fillCircle(h.x - 4, h.y - 18, 3); g.fillCircle(h.x + 4, h.y - 16, 3);
  }

  // ── The crown.
  const top = s.y - r - 2;
  if (ph <= 1) {
    // A little glasshouse dome: iron ribs over green panes, a rose inside, a finial on top.
    const w = r * 0.9;
    g.fillStyle(0x6ad8b8, 0.25); g.slice(s.x, top, w, Math.PI, 0, false); g.fillPath();
    rose(g, s.x, top - w * 0.35, w * 0.22, ROSE, 1);
    g.lineStyle(3, IRON, 1); g.beginPath(); g.arc(s.x, top, w, Math.PI, 0, false); g.strokePath();
    for (let k = 1; k < 5; k++) {
      const a = Math.PI + (k / 5) * Math.PI;
      g.lineStyle(2, IRON, 1); g.lineBetween(s.x, top - w + 2, s.x + Math.cos(a) * w, top + Math.sin(a) * w * 0.15);
    }
    g.lineStyle(4, VERDIGRIS, 1); g.lineBetween(s.x - w - 3, top, s.x + w + 3, top);
    g.fillStyle(BRASS, 1); g.fillCircle(s.x, top - w - 4, 4);
    g.fillStyle(0xffffff, 0.4); g.fillEllipse(s.x - w * 0.45, top - w * 0.5, 4, 10);
  } else if (ph <= 3) {
    // The dome broken open: bent ribs, a few teeth of glass, ivy through it.
    const w = r * 0.9;
    g.lineStyle(4, VERDIGRIS, 1); g.lineBetween(s.x - w - 3, top, s.x + w + 3, top);
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI + (k / 4) * Math.PI;
      const len = w * (0.5 + ((k * 7) % 5) / 10);
      g.lineStyle(2.5, IRON, 1); g.lineBetween(s.x + Math.cos(a) * w * 0.9, top, s.x + Math.cos(a) * w * 0.9 + Math.cos(a - 0.4) * len * 0.3, top - len);
      if (k % 2 === 0) { g.fillStyle(GLASS, 0.5); g.fillTriangle(s.x + Math.cos(a) * w * 0.9, top - len * 0.5, s.x + Math.cos(a) * w * 0.9 + 6, top - len * 0.4, s.x + Math.cos(a) * w * 0.9 + 2, top - len * 0.9); }
    }
    if (ph === 2 || !rotting) {
      for (let i = 0; i < 5; i++) { g.fillStyle(LEAF, 1); g.fillEllipse(s.x - w + i * w * 0.5, top - 6 - (i % 2) * 10, 10, 5); }
    } else {
      for (let i = 0; i < 3; i++) { g.fillStyle(FUNGUS, 1); g.fillEllipse(s.x - w * 0.6 + i * w * 0.6, top - 6, 10, 5); }
    }
  } else {
    // The holly wreath.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = s.x + Math.cos(a) * r * 0.55, y = top - 4 + Math.sin(a) * r * 0.18;
      g.fillStyle(HOLLY, 1); g.fillEllipse(x, y, 12, 6);
      if (i % 3 === 0) { g.fillStyle(BERRY, 1); g.fillCircle(x, y - 3, 3); }
    }
    g.fillStyle(FROST, 0.8);
    for (let i = 0; i < 3; i++) { const p = ((t / 1800) + i / 3) % 1; g.fillCircle(s.x - r * 0.4 + i * r * 0.4, top - 10 - p * 20, 1.6); }
  }

  // Petals, leaves or flies falling off her by phase.
  const n = 5;
  for (let i = 0; i < n; i++) {
    const p = ((t / 2200) + i / n) % 1;
    const x = s.x + Math.sin(t / 700 + i * 2) * r * 1.2, y = s.y - r + p * r * 2.6;
    const c = ph === 0 ? ROSE_PALE : ph === 1 ? SAP : ph === 2 ? LEAF : ph === 3 ? (rotting ? ROT : ROSE) : FROST;
    g.fillStyle(c, 0.8 * (1 - p)); g.fillEllipse(x, y, 5, 3);
  }
  if (s.hurt) { g.fillStyle(SAP, 0.5); g.fillCircle(s.x + r * 0.4, s.y - r * 0.2, 4); }
}

// ── Arena ────────────────────────────────────────────────────────────

/**
 * The throne room under the great dome: a floor of green glass mosaic, the lattice shadow of the
 * dome's ribs fanning from the oculus over the throne, two crescent rose-beds round the trellis
 * throne, a rose-red runner, glass cloches, and the pruned standing in hedge-niches along both
 * walls — her best topiary, kept where she can see it.
 */
function drawThroneRoom(g: Gfx, W: number, H: number): void {
  const rng = mulberry(0x9e4d16a);
  g.fillStyle(0x061410, 1); g.fillRect(0, 0, W, H);
  // Mosaic.
  for (let y = FT; y < H; y += 24) {
    for (let x = ((y / 24) % 2) * 12 - 12; x < W; x += 24) {
      const c = rng() < 0.08 ? 0x6ad8b8 : rng() < 0.5 ? 0x1e4a3e : 0x245446;
      g.fillStyle(c, 1); g.fillRect(x + 1, y + 1, 22, 22);
    }
  }
  g.fillStyle(0x061410, 0.4); g.fillRect(0, FT, W, H - FT);
  // The runner up to the throne.
  g.fillStyle(ROSE_DEEP, 1); g.fillRect(W / 2 - 48, THRONE.y + 30, 96, H - THRONE.y - 30);
  g.fillStyle(0x8a2a3a, 1); g.fillRect(W / 2 - 42, THRONE.y + 30, 84, H - THRONE.y - 30);
  for (let y = THRONE.y + 60; y < H; y += 48) rose(g, W / 2, y, 6, ROSE_PALE, 0.5);
  // The rose-beds: two crescents of soil and roses round the throne.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + side * (0.55 + i * 0.13);
      const x = THRONE.x + Math.cos(a) * 190, y = THRONE.y + 20 + Math.sin(a) * 120;
      g.fillStyle(0x1a100a, 1); g.fillCircle(x, y, 22);
      g.fillStyle(0x2e2016, 1); g.fillCircle(x, y, 19);
      rose(g, x - 5, y - 3, 6, rng() < 0.6 ? ROSE : ROSE_PALE, 0.9);
      rose(g, x + 7, y + 4, 5, rng() < 0.5 ? ROSE_DEEP : ROSE, 0.8);
    }
  }
  // The sigil inlaid in brass at the room's heart.
  const cx = W / 2, cy = 420;
  g.fillStyle(0x061410, 0.55); g.fillCircle(cx, cy, 90);
  g.lineStyle(3, BRASS, 0.6); g.strokeCircle(cx, cy, 84);
  verdigraSigil(g, cx, cy, 64, VERDIGRIS_DEEP, 0.9);
  verdigraSigil(g, cx, cy, 60, VERDIGRIS, 0.3);
  // The trellis throne round the anchor post.
  g.fillStyle(0x000000, 0.45); g.fillEllipse(THRONE.x, THRONE.y + 40, 240, 40);
  g.lineStyle(5, IRON, 1);
  g.beginPath(); g.arc(THRONE.x, THRONE.y, 92, Math.PI, 0, false); g.strokePath();
  for (let k = 0; k < 9; k++) {
    const x = THRONE.x - 84 + k * 21;
    g.lineStyle(3, IRON, 1); g.lineBetween(x, THRONE.y + 30, x, THRONE.y - Math.sin((k / 8) * Math.PI) * 80);
  }
  for (let y = THRONE.y - 40; y < THRONE.y + 30; y += 16) { g.lineStyle(2, IRON, 1); g.lineBetween(THRONE.x - 88, y, THRONE.x + 88, y); }
  for (let i = 0; i < 30; i++) {
    const a = Math.PI + rng() * Math.PI;
    const rr = 60 + rng() * 40;
    rose(g, THRONE.x + Math.cos(a) * rr, THRONE.y + Math.sin(a) * rr * 0.9, 4 + rng() * 3, rng() < 0.7 ? ROSE : ROSE_PALE, 0.85);
  }
  g.fillStyle(0x2a3a34, 1); g.fillEllipse(THRONE.x, THRONE.y + 30, 200, 26);
  g.fillStyle(0x3a5a4a, 1); g.fillEllipse(THRONE.x, THRONE.y + 26, 190, 18);
  // Glass cloches either side.
  for (const x of [THRONE.x - 280, THRONE.x + 280]) {
    g.fillStyle(0x3a4a44, 1); g.fillRect(x - 20, THRONE.y + 10, 40, 26);
    rose(g, x, THRONE.y - 6, 8, ROSE, 1);
    g.fillStyle(GLASS, 0.14); g.fillEllipse(x, THRONE.y - 10, 40, 50);
    g.lineStyle(2, GLASS, 0.5); g.strokeEllipse(x, THRONE.y - 10, 40, 50);
  }
  // The pruned in their hedge-niches along both walls.
  for (const x of [26, W - 26]) {
    for (let y = FT + 130; y < H - 20; y += 130) {
      g.fillStyle(dim(YEW, 0.4), 1); g.fillRoundedRect(x - 26, y - 84, 52, 86, { tl: 24, tr: 24, bl: 0, br: 0 });
      graftedSubject(g, x, y, 0.8, (x + y) * 0.01, [0xd8b898, 0xb08a68, 0xc8a080, 0x9a7458][Math.floor(y / 130) % 4], 0);
    }
  }
  // The dome: ribs fanning from the oculus over the throne, their shadows on the floor.
  g.lineStyle(7, 0x000000, 0.1);
  for (let k = 0; k < 11; k++) {
    const a = Math.PI * (0.06 + (k / 10) * 0.88);
    g.lineBetween(THRONE.x, FT, THRONE.x - Math.cos(a) * 1100, FT + Math.sin(a) * 900);
  }
  for (const rr of [220, 380, 560]) { g.lineStyle(6, 0x000000, 0.08); g.beginPath(); g.arc(THRONE.x, FT, rr, 0.05, Math.PI - 0.05, false); g.strokePath(); }
  g.fillStyle(IRON, 1); g.fillRect(0, FT, W, 18);
  for (let x = 0; x < W; x += 40) glassPane(g, x, FT, 40, 18, 1, false);
  g.fillStyle(0xf8ffd8, 0.035);
  for (let i = 0; i < 4; i++) g.fillTriangle(260 + i * 140, FT + 18, 320 + i * 140, FT + 18, 300 + i * 150, H);
  g.fillStyle(mixC(V_MAIN, 0x000000, 0.6), 0.2); g.fillRect(0, FT, 8, H - FT); g.fillRect(W - 8, FT, 8, H - FT);
}

// ── The def ──────────────────────────────────────────────────────────

export const VERDIGRA_BOSS: WorldBossDef = {
  worldId: 'isle:verdigra',
  name: 'Empress Verdigra',
  title: 'the Gardener, Sovereign of Thornwild',
  color: V_MAIN,
  colorLit: V_LIT,
  colorDark: V_DARK,
  accent: ROSE,
  damageMult: 1.3,

  intro: [
    'Something has got into my glasshouse. Something unpruned.',
    'Six of my children, cut back to the root. My wardens, trampled. My hedges, ringing themselves. You.',
    'Come into the light, little weed. Let me see what shape you ought to be.',
  ],
  banter: [
    'A garden is only tyranny with flowers in it. I have never once pretended otherwise.',
    'They are not prisoners. They are topiary. There is a difference, and it is shape.',
    'Every family weighs its bloom. Some come up short. Something must be cut.',
    'Petalis always cut too gently. He let the roses keep their thorns.',
    'Hold still. A clean cut heals. A ragged one festers.',
    'I do not hate you. I do not hate the bindweed. I simply have shears.',
    'Thornwild flowers because I prune it. Ask anyone. Ask the hedges.',
    'Grow. Go on. Grow, and see what it gets you.',
  ],
  defeatLine: 'THE GARDEN GOES WILD',
  resumeLine: 'Back again, and in a different shape. I can work with that. I always can.',

  phases: [
    {
      name: 'The Pruning',
      line: 'Sit. Be still. This will not hurt for long — nothing I cut hurts for long.',
      hp: 540,
      cycle: ['sig:shears', 'volley', 'sig:deadhead', 'radial', 'sig:espalier', 'lanes', 'sig:shears', 'sig:deadhead', 'barrage', 'sig:espalier'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'The Graft',
      line: 'Then I will not cut you. I will graft you. You will be part of something lovely.',
      hp: 590,
      cycle: ['sig:scion', 'sig:rootstock', 'homing', 'sig:budding', 'spiral', 'sig:scion', 'sig:budding', 'volley', 'sig:rootstock', 'slamchain'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1050,
      harassMs: 3000,
    },
    {
      name: 'Overgrowth',
      line: 'Fine. FINE. Let it all in. Let it all grow. See how you like a garden nobody tends.',
      hp: 640,
      cycle: ['sig:shatter', 'sig:creepers', 'sig:pitchers', 'barrage', 'sig:creepers', 'radial', 'sig:shatter', 'sig:pitchers', 'hazard', 'sig:creepers'],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1000,
      harassMs: 2900,
    },
    {
      name: 'Compost',
      line: 'Everything rots. Everything rots, and out of the rot — me. Again. Always again.',
      hp: 690,
      cycle: ['sig:rotbloom', 'sig:worms', 'sig:seedfall', 'spiral', 'sig:rotbloom', 'sig:worms', 'quake', 'sig:seedfall', 'sanctuary'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 920,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'NOTHING SHE PLANTS EVER DIES',
    extraPhase: {
      name: 'Evergreen',
      line: '...winter. How quaint. Everything else drops its leaves. Not I. Never I.',
      hp: 540,
      cycle: ['sig:holly', 'sig:needles', 'sig:heartseed', 'volley', 'sig:holly', 'sig:heartseed', 'sig:needles', 'homing', 'sig:holly', 'sweep'],
      harass: ['h-rune', 'h-lane'],
      restMs: 880,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.15 },
    radial: { count: 18 },
    lanes: { halfW: 30 },
  },

  signatures: {
    shears: greatShears,
    deadhead: deadheading,
    espalier,
    scion,
    rootstock,
    budding: tBudding,
    shatter: domeBreaks,
    creepers,
    pitchers,
    rotbloom: rotAndBloom,
    worms: wormCasts,
    seedfall: goneToSeed,
    holly,
    needles: needleFall,
    heartseed: heartSeeds,
  },

  look: { crest: 'none', pattern: 'weave', aura: 'petals', hands: 'ball', torsoR: 42, mouth: 'line', eyes: 2, eyeColor: 0xf0f8d8 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'none', look: { pattern: 'weave', aura: 'leaves', hands: 'claw' } },
    { movement: 'stalk', gimmick: 'none', tint: 'sick', look: { pattern: 'cracks', aura: 'leaves', hands: 'wisp', mouth: 'grin' } },
    { movement: 'rush', gimmick: 'none', tint: 'blood', look: { pattern: 'drip', aura: 'dust', hands: 'claw', mouth: 'maw', eyes: 3 } },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { pattern: 'scales', aura: 'frost', hands: 'blade', eyes: 1, torsoR: 40 } },
  ],

  drawDecor: drawVerdigra,
  drawArena: drawThroneRoom,
};
