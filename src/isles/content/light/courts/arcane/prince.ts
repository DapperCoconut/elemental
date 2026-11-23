import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import { rune, sigilCircle } from './art';
import {
  BRASS, BRASS_DARK, CHALK, FONT, GOLD, GOLD_DARK, GOLD_LIT, MANA, MANA_DEEP, MANA_LIT, MARBLE, MARBLE_DARK, MARBLE_LIT,
  MARBLE_SHADE, ROBE, ROBE_DARK, SCORCH, SIGIL, SIGIL_ACCENT, SIGIL_DARK, SIGIL_LIT, SLATE_DEEP, VIOLET, VIOLET_DARK,
  VIOLET_LIT,
} from './palette';
import { clamp, dist, inTriangle, polygon, segDist } from './util';

/**
 * Prince Sigil, the Radiance of the Circle — Chancellor of the Spellwrights' Academy.
 *
 * Sigil drew the Anchor Circle for the Despot in one sitting, twenty-two years ago, and it has
 * never needed another line. He is the finest hand at sigilry Solmara has had, and he has never
 * once looked up from the chalk to see what it was holding. He fights the way he lectures:
 *
 * • **Runecraft** (orbiting): he traces sigils in the air and each shape is its own spell — a
 *   triangle chalked round you that bursts into fire, a circle round himself that wards him and
 *   then rolls outward as a ring (step *inside* it and the ward breaks), a spiral that winds into
 *   a vortex and pops.
 * • **Ritual** (anchored, the cold tint): the lecture floor becomes a great magic circle. Its three
 *   rings turn, and their segments flare in sequence; runes on the rim name each other and chords
 *   of light cross the circle between them; and he stamps a binding seal under your feet.
 * • **Overload** (hard, blinking, the hot tint): every spell is cast twice, mirrored through the
 *   heart of the dome, and mana fissures crack the floor from wherever he stands.
 */

const TOP = 96;
const ARENA_H = 640;
const CX = 480;
const CY = (TOP + ARENA_H) / 2;

/** True in the hard Overload phase, when every spell comes in a mirrored pair. */
const overloaded = (tk: BossToolkit): boolean => tk.hard && tk.phase >= 2;
/** Mirror a point through the heart of the dome. */
const mirror = (x: number, y: number): { x: number; y: number } => ({ x: CX * 2 - x, y: CY * 2 - y });
const playerLive = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;

/** A progressively-drawn polyline (a sigil being traced): `k` 0..1 of its length. */
function tracePoly(g: G, pts: { x: number; y: number }[], k: number, w: number, color: number, a: number): void {
  if (pts.length < 2 || k <= 0) return;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  let left = total * clamp(k, 0, 1);
  g.lineStyle(w, color, a);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const p = pts[i - 1], q = pts[i];
    const d = dist(p.x, p.y, q.x, q.y);
    const f = Math.min(1, left / d);
    g.lineBetween(p.x, p.y, p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f);
    left -= d;
    if (f < 1) { glow(g, p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, 10, color, 0.12, 2); }
  }
}

// ── Signature: Triangle (fire) ───────────────────────────────────────
// He traces a triangle in the air round where you stand — the chalk runs corner to corner — and
// when the third side closes, the inside bursts into flame. Overload: a mirrored twin too.

interface Tri { pts: { x: number; y: number }[]; at: number; fireAt: number; dealt: boolean }

const triangle = (tk: BossToolkit): SignatureMove => {
  let tris: Tri[] = [];
  return {
    durationMs: 1900,
    windupMs: 500,
    gesture: 'point',
    hold: 'draw',
    tell: 'TRIANGLE',
    cast(time) {
      const p = tk.player;
      const rot = Math.random() * Math.PI * 2;
      const fireAt = time + tk.warn(1150);
      const make = (x: number, y: number): Tri => ({ pts: polygon(tk.clampX(x, 90), tk.clampY(y, 80), 125, 3, rot), at: time, fireAt, dealt: false });
      tris = [make(p.x, p.y)];
      if (overloaded(tk)) { const m = mirror(p.x, p.y); tris.push(make(m.x, m.y)); }
      tk.sfx('curse-cast');
    },
    update(time) {
      for (const t of tris) {
        if (t.dealt || time < t.fireAt) continue;
        t.dealt = true;
        tk.sfx('flame-burst');
        const p = tk.player;
        if (playerLive(tk) && inTriangle(p.x, p.y, t.pts[0], t.pts[1], t.pts[2])) tk.hitPlayer(18, p.x, p.y);
      }
      tris = tris.filter((t) => !t.dealt || time < t.fireAt + 600);
    },
    drawGround(g, time) {
      for (const t of tris) {
        const [a, b, c] = t.pts;
        if (!t.dealt) {
          const k = clamp((time - t.at) / Math.max(1, t.fireAt - t.at), 0, 1);
          g.fillStyle(SCORCH, 0.12 + k * 0.18); g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
          tracePoly(g, [a, b, c, a], k * 1.05, 3, CHALK, 0.9);
          for (const v of t.pts) { g.lineStyle(1.5, GOLD, 0.6 + k * 0.4); g.strokeCircle(v.x, v.y, 8 + (1 - k) * 8); }
          rune(g, (a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, 12, 2, CHALK, 0.3 + k * 0.5, 2);
        } else {
          const k = clamp((time - t.fireAt) / 600, 0, 1);
          g.fillStyle(0xff8a3a, 0.55 * (1 - k)); g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
          g.lineStyle(4 * (1 - k), GOLD_LIT, 1 - k); g.strokeTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
        }
      }
    },
    drawAir(g, time) {
      for (const t of tris) {
        if (!t.dealt) continue;
        const k = clamp((time - t.fireAt) / 600, 0, 1);
        const cx = (t.pts[0].x + t.pts[1].x + t.pts[2].x) / 3, cy = (t.pts[0].y + t.pts[1].y + t.pts[2].y) / 3;
        for (let i = 0; i < 14; i++) {
          const v = t.pts[i % 3], f = (i * 0.137) % 1;
          const fx = cx + (v.x - cx) * f, fy = cy + (v.y - cy) * f;
          const h = (18 + (i % 4) * 6) * (1 - k);
          g.fillStyle(i % 2 ? 0xffb040 : 0xffe080, 0.8 * (1 - k)); g.fillTriangle(fx - 5, fy, fx + 5, fy, fx + Math.sin(time / 60 + i) * 3, fy - h - k * 20);
        }
      }
    },
    onPhaseEnd() { tris = []; },
  };
};

// ── Signature: Circle (ward) ─────────────────────────────────────────
// He draws a circle round himself: inside it he is warded and your blows glance off. Then its rim
// rolls outward as a ring, twice, each with a gap. Step INSIDE the circle and the ring never
// reaches you — and the ward, turned inside out, makes him easier to hurt.

const wardCircle = (tk: BossToolkit): SignatureMove => {
  const WARD_R = 115;
  let until = 0;
  let at = 0;
  let cx = 0, cy = 0;
  let twin: { x: number; y: number } | null = null;
  const inside = () => playerLive(tk) && dist(tk.player.x, tk.player.y, tk.bossX, tk.bossY) < WARD_R;
  return {
    durationMs: 2600,
    windupMs: 450,
    gesture: 'raise',
    tell: 'CIRCLE',
    cast(time) {
      at = time; until = time + 3200;
      cx = tk.bossX; cy = tk.bossY;
      const gap = tk.angleToPlayer() + Math.PI + (Math.random() - 0.5) * 1.2;
      const delay = tk.warn(900);
      tk.spawnRing({ cx, cy, delayMs: delay, speed: 250, gapCentre: gap, gapHalf: 0.6, band: 16, damage: 14, startRadius: WARD_R });
      tk.spawnRing({ cx, cy, delayMs: delay + 700, speed: 250, gapCentre: gap + 0.35, gapHalf: 0.6, band: 16, damage: 14, startRadius: WARD_R });
      twin = null;
      if (overloaded(tk)) {
        twin = mirror(cx, cy);
        tk.spawnRing({ cx: twin.x, cy: twin.y, delayMs: delay + 350, speed: 250, gapCentre: gap + Math.PI, gapHalf: 0.65, band: 16, damage: 12, startRadius: WARD_R * 0.6 });
      }
      tk.sfx('holy-chord');
    },
    takenMult() {
      if (tk.now >= until) return 1;
      return inside() ? 1.25 : 0.25;
    },
    drawGround(g, time) {
      if (time >= until) return;
      const k = clamp((time - at) / 500, 0, 1);
      const fade = clamp((until - time) / 400, 0, 1);
      const x = tk.bossX, y = tk.bossY;
      const broken = inside();
      g.fillStyle(broken ? 0xff8a6a : MANA, 0.08 * fade); g.fillCircle(x, y, WARD_R);
      g.beginPath(); g.arc(x, y, WARD_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
      g.lineStyle(3, broken ? 0xff8a6a : CHALK, 0.85 * fade); g.strokePath();
      g.lineStyle(1.2, GOLD, 0.6 * fade); g.strokeCircle(x, y, WARD_R - 10);
      for (let i = 0; i < 12; i++) {
        const a = time / 1400 + (i / 12) * Math.PI * 2;
        rune(g, x + Math.cos(a) * (WARD_R - 5), y + Math.sin(a) * (WARD_R - 5), 4, i, broken ? 0xff8a6a : GOLD, 0.7 * fade * k, 1.2);
      }
      if (twin) { g.lineStyle(2, VIOLET_LIT, 0.6 * fade); g.strokeCircle(twin.x, twin.y, WARD_R * 0.6); }
      // The origin of the rolling rings, so the eye finds the rim.
      g.lineStyle(1, CHALK, 0.25 * fade); g.strokeCircle(cx, cy, WARD_R + 4);
    },
    drawAir(g, time) {
      if (time >= until) return;
      const fade = clamp((until - time) / 400, 0, 1);
      if (!inside()) {
        // The ward-panes over him.
        for (let i = 0; i < 6; i++) {
          const a = time / 600 + (i / 6) * Math.PI * 2;
          const px = tk.bossX + Math.cos(a) * 42, py = tk.bossY - 8 + Math.sin(a) * 42;
          g.lineStyle(1.5, MANA_LIT, 0.5 * fade);
          for (let s = 0; s < 6; s++) {
            const a1 = (s / 6) * Math.PI * 2, a2 = ((s + 1) / 6) * Math.PI * 2;
            g.lineBetween(px + Math.cos(a1) * 9, py + Math.sin(a1) * 9, px + Math.cos(a2) * 9, py + Math.sin(a2) * 9);
          }
        }
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── Signature: Spiral (vortex) ───────────────────────────────────────
// A spiral is chalked near you, winding inward; it becomes a vortex that drags you toward its eye,
// and the eye pops. Walk out against the pull. Overload: a mirrored twin pops as well.

interface Spiral { x: number; y: number; at: number; popAt: number; pulled: boolean; dealt: boolean; twin: boolean }

const spiral = (tk: BossToolkit): SignatureMove => {
  let sp: Spiral[] = [];
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'sweep',
    hold: 'draw',
    tell: 'SPIRAL',
    cast(time) {
      const p = tk.player;
      const a = Math.random() * Math.PI * 2;
      const x = tk.clampX(p.x + Math.cos(a) * 70, 90), y = tk.clampY(p.y + Math.sin(a) * 60, 80);
      const popAt = time + tk.warn(2000);
      sp = [{ x, y, at: time, popAt, pulled: false, dealt: false, twin: false }];
      if (overloaded(tk)) { const m = mirror(x, y); sp.push({ x: m.x, y: m.y, at: time, popAt: popAt + 250, pulled: true, dealt: false, twin: true }); }
      tk.sfx('time-warp');
    },
    update(time) {
      for (const s of sp) {
        if (!s.pulled && time >= s.at + 600) {
          s.pulled = true;
          tk.pull(s.x, s.y, 115, Math.max(300, s.popAt - time - 150));
          tk.sfx('tornado');
        }
        if (!s.dealt && time >= s.popAt) {
          s.dealt = true;
          tk.explode(s.x, s.y, 84, s.twin ? 14 : 20, VIOLET);
          tk.sfx('explosion-medium');
        }
      }
      sp = sp.filter((s) => !s.dealt || time < s.popAt + 400);
    },
    drawGround(g, time) {
      for (const s of sp) {
        const k = clamp((time - s.at) / 600, 0, 1);
        const left = clamp((s.popAt - time) / Math.max(1, s.popAt - s.at), 0, 1);
        if (s.dealt) continue;
        const spin = time / 260;
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          const a = t * Math.PI * 6 + (s.pulled ? spin : 0);
          const r = 96 * (1 - t);
          pts.push({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r * 0.8 });
        }
        tracePoly(g, pts, k, 2.5, s.twin ? VIOLET_LIT : CHALK, 0.85);
        g.lineStyle(2, VIOLET, 0.3 + (1 - left) * 0.6); g.strokeCircle(s.x, s.y, 84);
        g.fillStyle(VIOLET_DARK, 0.15 + (1 - left) * 0.3); g.fillCircle(s.x, s.y, 84 * (1 - left * 0.7));
      }
    },
    drawAir(g, time) {
      for (const s of sp) {
        if (!s.pulled || s.dealt) continue;
        // Motes streaming in to the eye.
        for (let i = 0; i < 12; i++) {
          const ph = (time / 700 + i / 12) % 1;
          const a = i * 0.52 + time / 300;
          const r = 120 * (1 - ph);
          g.fillStyle(VIOLET_LIT, 0.8 * ph); g.fillCircle(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8, 2);
        }
        glow(g, s.x, s.y, 20, VIOLET_LIT, 0.1, 3);
      }
    },
    onPhaseEnd() { sp = []; },
  };
};

// ── The great circle of the Ritual (shared by its signatures) ────────

/** Bands of the great circle (inner, outer radius) and how many segments each has. */
const BANDS: [number, number, number][] = [[52, 150, 6], [150, 270, 8], [270, 420, 10]];
const BAND_SPEED = [0.28, -0.2, 0.12];
const SQ = 0.82;

/** Which band and segment a point falls in, given the rings' rotations. */
function segmentAt(x: number, y: number, rot: number[]): { band: number; seg: number } | null {
  const dx = x - CX, dy = (y - CY) / SQ;
  const r = Math.hypot(dx, dy);
  const band = BANDS.findIndex(([r0, r1]) => r >= r0 && r < r1);
  if (band < 0) return null;
  const n = BANDS[band][2];
  const a = ((Math.atan2(dy, dx) - rot[band]) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
  return { band, seg: Math.floor((a / (Math.PI * 2)) * n) };
}

/** A segment of a band, filled. */
function fillSegment(g: G, band: number, seg: number, rot: number, color: number, a: number): void {
  const [r0, r1, n] = BANDS[band];
  const a0 = rot + (seg / n) * Math.PI * 2, a1 = rot + ((seg + 1) / n) * Math.PI * 2;
  const steps = 8;
  g.fillStyle(color, a);
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + (a1 - a0) * (i / steps), t1 = a0 + (a1 - a0) * ((i + 1) / steps);
    const p0 = { x: CX + Math.cos(t0) * r0, y: CY + Math.sin(t0) * r0 * SQ };
    const p1 = { x: CX + Math.cos(t0) * r1, y: CY + Math.sin(t0) * r1 * SQ };
    const p2 = { x: CX + Math.cos(t1) * r1, y: CY + Math.sin(t1) * r1 * SQ };
    const p3 = { x: CX + Math.cos(t1) * r0, y: CY + Math.sin(t1) * r0 * SQ };
    g.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    g.fillTriangle(p0.x, p0.y, p2.x, p2.y, p3.x, p3.y);
  }
}

/** The rings' live rotation — one clock, so every Ritual move reads the same circle. */
const ringRot = (time: number): number[] => BAND_SPEED.map((s, i) => (time / 1000) * s + i * 0.4);

// ── Signature: The Ritual Turns ──────────────────────────────────────
// The great circle on the floor turns, ring against ring. He calls a pattern and its segments are
// chalked bright — they turn with the rings — then flare, ring by ring. Read the gaps as they turn.

interface Flare { band: number; seg: number; warnAt: number; fireAt: number; dealt: boolean }

const ritual = (tk: BossToolkit): SignatureMove => {
  let flares: Flare[] = [];
  return {
    durationMs: 2800,
    windupMs: 550,
    gesture: 'clap',
    hold: 'conduct',
    locksBody: true,
    tell: 'THE RITUAL TURNS',
    cast(time) {
      flares = [];
      const pattern = Math.floor(Math.random() * 3);
      const warn = tk.warn(1100);
      BANDS.forEach(([, , n], band) => {
        const delay = band * 520;
        for (let seg = 0; seg < n; seg++) {
          let on = false;
          if (pattern === 0) on = (seg + band) % 2 === 0;
          else if (pattern === 1) on = seg % 3 !== band % 3;
          else on = seg < n / 2 ? band % 2 === 0 : band % 2 === 1;
          if (on) flares.push({ band, seg, warnAt: time + delay, fireAt: time + delay + warn, dealt: false });
        }
      });
      tk.sfx('beam-charge');
    },
    update(time) {
      const rot = ringRot(time);
      let fired = false;
      for (const f of flares) {
        if (f.dealt || time < f.fireAt) continue;
        f.dealt = true; fired = true;
        const p = tk.player;
        if (!playerLive(tk)) continue;
        const at = segmentAt(p.x, p.y, rot);
        if (at && at.band === f.band && at.seg === f.seg) tk.hitPlayer(16, p.x, p.y);
      }
      if (fired) tk.sfx('light-beam');
      flares = flares.filter((f) => !f.dealt || time < f.fireAt + 450);
    },
    drawGround(g, time) {
      const rot = ringRot(time);
      for (const f of flares) {
        if (time < f.warnAt) continue;
        if (!f.dealt) {
          const k = clamp((time - f.warnAt) / Math.max(1, f.fireAt - f.warnAt), 0, 1);
          fillSegment(g, f.band, f.seg, rot[f.band], MANA, 0.1 + k * 0.28);
        } else {
          const k = clamp((time - f.fireAt) / 450, 0, 1);
          fillSegment(g, f.band, f.seg, rot[f.band], 0xffffff, 0.75 * (1 - k));
        }
      }
    },
    onPhaseEnd() { flares = []; },
  };
};

// ── Signature: Naming the Runes (chords) ─────────────────────────────
// Runes light on the rim of the great circle and call to each other: chords of light are chalked
// across the circle between them, one always through where you stand, and then they fire.

interface Chord { ax: number; ay: number; bx: number; by: number; at: number; fireAt: number; dealt: boolean; ia: number; ib: number }

const chords = (tk: BossToolkit): SignatureMove => {
  let list: Chord[] = [];
  const RIM = 400;
  const HALF = 22;
  const rimPt = (a: number) => ({ x: CX + Math.cos(a) * RIM, y: CY + Math.sin(a) * RIM * SQ });
  return {
    durationMs: 2200,
    windupMs: 500,
    gesture: 'point',
    tell: 'THE RUNES ANSWER',
    cast(time) {
      const p = tk.player;
      list = [];
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        let a0: number, a1: number;
        if (i === 0) {
          // Through the player: a line at a random angle through them, clipped to the rim.
          const th = Math.random() * Math.PI;
          const dx = Math.cos(th), dy = Math.sin(th);
          const px = p.x - CX, py = (p.y - CY) / SQ;
          const b = px * dx + py * dy, c = px * px + py * py - RIM * RIM;
          const disc = Math.sqrt(Math.max(0, b * b - c));
          const t0 = -b - disc, t1 = -b + disc;
          a0 = Math.atan2(py + dy * t0, px + dx * t0); a1 = Math.atan2(py + dy * t1, px + dx * t1);
        } else {
          a0 = Math.random() * Math.PI * 2; a1 = a0 + Math.PI * (0.55 + Math.random() * 0.6);
        }
        const A = rimPt(a0), B = rimPt(a1);
        const fireAt = time + tk.warn(1150) + i * 260;
        list.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, at: time, fireAt, dealt: false, ia: i * 2, ib: i * 2 + 1 });
        if (overloaded(tk) && i === 0) {
          const ma = mirror(A.x, A.y), mb = mirror(B.x, B.y);
          // Mirrored through the heart, then turned a quarter so the twin is never the same line.
          const rot = (q: { x: number; y: number }) => ({ x: CX + (q.y - CY) / SQ, y: CY - (q.x - CX) * SQ });
          const ra = rot(ma), rb = rot(mb);
          list.push({ ax: ra.x, ay: ra.y, bx: rb.x, by: rb.y, at: time, fireAt: fireAt + 380, dealt: false, ia: 6, ib: 7 });
        }
      }
      tk.sfx('crystal-chime');
    },
    update(time) {
      for (const c of list) {
        if (c.dealt || time < c.fireAt) continue;
        c.dealt = true;
        tk.sfx('beam-fire');
        const p = tk.player;
        if (playerLive(tk) && segDist(p.x, p.y, c.ax, c.ay, c.bx, c.by) < HALF + 12) tk.hitPlayer(15, p.x, p.y);
      }
      list = list.filter((c) => !c.dealt || time < c.fireAt + 400);
    },
    drawGround(g, time) {
      for (const c of list) {
        if (!c.dealt) {
          const k = clamp((time - c.at) / Math.max(1, c.fireAt - c.at), 0, 1);
          g.lineStyle(HALF * 2 * k, MANA, 0.08 + k * 0.12); g.lineBetween(c.ax, c.ay, c.bx, c.by);
          tracePoly(g, [{ x: c.ax, y: c.ay }, { x: c.bx, y: c.by }], Math.min(1, k * 1.6), 2, CHALK, 0.8);
        } else {
          const k = clamp((time - c.fireAt) / 400, 0, 1);
          g.lineStyle(HALF * 2 * (1 - k * 0.5), 0xffffff, 0.7 * (1 - k)); g.lineBetween(c.ax, c.ay, c.bx, c.by);
          g.lineStyle(HALF, MANA_LIT, 0.9 * (1 - k)); g.lineBetween(c.ax, c.ay, c.bx, c.by);
        }
      }
    },
    drawAir(g, time) {
      // The calling runes on the rim.
      for (const c of list) {
        const k = c.dealt ? 1 : clamp((time - c.at) / 400, 0, 1);
        for (const [x, y, i] of [[c.ax, c.ay, c.ia], [c.bx, c.by, c.ib]] as [number, number, number][]) {
          glow(g, x, y - 20, 16, MANA, 0.08 * k, 2);
          g.fillStyle(SLATE_DEEP, 0.9 * k); g.fillCircle(x, y - 20, 12);
          rune(g, x, y - 20, 7, i, MANA_LIT, k, 1.8);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: The Binding Seal ──────────────────────────────────────
// A square seal is stamped round you, chalked corner by corner. Be outside it when it sets — or be
// bound where you stand. Once set, the seal lingers and drags at whoever walks on it.

const seal = (tk: BossToolkit): SignatureMove => {
  let x = 0, y = 0, at = 0, setAt = 0, until = 0, dealt = true, rot = 0;
  let lastDrag = 0;
  const HALF = 82;
  const inSeal = (px: number, py: number) => {
    const dx = px - x, dy = py - y;
    const c = Math.cos(-rot), s = Math.sin(-rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) < HALF && Math.abs(ly) < HALF;
  };
  const corners = () => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({
    x: x + (a * HALF) * Math.cos(rot) - (b * HALF) * Math.sin(rot),
    y: y + (a * HALF) * Math.sin(rot) + (b * HALF) * Math.cos(rot),
  }));
  return {
    durationMs: 1800,
    windupMs: 450,
    gesture: 'slam',
    tell: 'THE SEAL',
    cast(time) {
      x = tk.clampX(tk.player.x, 100); y = tk.clampY(tk.player.y, 90);
      rot = Math.PI / 4 * (Math.random() < 0.5 ? 1 : 0) + (Math.random() - 0.5) * 0.3;
      at = time; setAt = time + tk.warn(1150); until = setAt + 3400; dealt = false;
      tk.sfx('stone-rise');
    },
    update(time) {
      if (!dealt && time >= setAt) {
        dealt = true;
        tk.sfx('chain');
        const p = tk.player;
        if (playerLive(tk) && inSeal(p.x, p.y)) { tk.hitPlayer(10, p.x, p.y); tk.root(1200); }
      }
      if (dealt && time < until && time - lastDrag > 300 && playerLive(tk) && inSeal(tk.player.x, tk.player.y)) {
        lastDrag = time;
        tk.slowPlayer(0.55, 360);
      }
    },
    drawGround(g, time) {
      if (time >= until || at === 0) return;
      const cs = corners();
      if (!dealt) {
        const k = clamp((time - at) / Math.max(1, setAt - at), 0, 1);
        g.fillStyle(VIOLET_DARK, 0.1 + k * 0.2);
        g.fillTriangle(cs[0].x, cs[0].y, cs[1].x, cs[1].y, cs[2].x, cs[2].y); g.fillTriangle(cs[0].x, cs[0].y, cs[2].x, cs[2].y, cs[3].x, cs[3].y);
        tracePoly(g, [...cs, cs[0]], k * 1.05, 3, CHALK, 0.9);
        rune(g, x, y, 22, 6, VIOLET_LIT, 0.3 + k * 0.6, 2.4);
      } else {
        const fade = clamp((until - time) / 500, 0, 1);
        const flash = clamp(1 - (time - setAt) / 300, 0, 1);
        g.fillStyle(flash > 0 ? 0xffffff : VIOLET_DARK, (0.25 + flash * 0.4) * fade);
        g.fillTriangle(cs[0].x, cs[0].y, cs[1].x, cs[1].y, cs[2].x, cs[2].y); g.fillTriangle(cs[0].x, cs[0].y, cs[2].x, cs[2].y, cs[3].x, cs[3].y);
        g.lineStyle(3, VIOLET_LIT, 0.8 * fade);
        for (let i = 0; i < 4; i++) g.lineBetween(cs[i].x, cs[i].y, cs[(i + 1) % 4].x, cs[(i + 1) % 4].y);
        // Chains of chalk from corner to centre.
        for (const c of cs) {
          for (let i = 1; i < 6; i++) { const t = i / 6; g.lineStyle(1.5, CHALK, 0.6 * fade); g.strokeCircle(c.x + (x - c.x) * t, c.y + (y - c.y) * t, 3); }
        }
        rune(g, x, y, 22, 6, VIOLET_LIT, 0.8 * fade, 2.4);
      }
    },
    onPhaseEnd() { until = 0; at = 0; dealt = true; },
  };
};

// ── Signature: Mana Fissures (Overload) ──────────────────────────────
// The floor cracks from where he stands: jagged fissures run out — one always toward you — and
// erupt in light along their length, then stay open, leaking, for a while. Overload mirrors them.

interface Fissure { pts: { x: number; y: number }[]; at: number; eruptAt: number; until: number; dealt: boolean }

const fissure = (tk: BossToolkit): SignatureMove => {
  let cracks: Fissure[] = [];
  const tick = { at: 0 };
  const onCrack = (f: Fissure, x: number, y: number, w: number) => {
    for (let i = 1; i < f.pts.length; i++) if (segDist(x, y, f.pts[i - 1].x, f.pts[i - 1].y, f.pts[i].x, f.pts[i].y) < w) return true;
    return false;
  };
  const crackFrom = (ox: number, oy: number, a: number): { x: number; y: number }[] => {
    const pts = [{ x: ox, y: oy }];
    let x = ox, y = oy;
    for (let i = 0; i < 9; i++) {
      const ja = a + (Math.random() - 0.5) * 0.9;
      x += Math.cos(ja) * 62; y += Math.sin(ja) * 62;
      if (x < 20 || x > tk.W - 20 || y < TOP + 10 || y > tk.H - 10) break;
      pts.push({ x, y });
    }
    return pts;
  };
  return {
    durationMs: 2000,
    windupMs: 500,
    gesture: 'slam',
    tell: 'MANA FISSURES',
    cast(time) {
      const toYou = tk.angleToPlayer();
      const eruptAt = time + tk.warn(1100);
      const arms = [toYou, toYou + 2.1, toYou - 2.1];
      cracks = cracks.filter((c) => time < c.until).slice(-3);
      for (const a of arms) cracks.push({ pts: crackFrom(tk.bossX, tk.bossY, a), at: time, eruptAt, until: eruptAt + 4200, dealt: false });
      if (overloaded(tk)) {
        const m = mirror(tk.bossX, tk.bossY);
        const back = Math.atan2(tk.player.y - m.y, tk.player.x - m.x);
        cracks.push({ pts: crackFrom(m.x, m.y, back + 0.5), at: time, eruptAt: eruptAt + 300, until: eruptAt + 4500, dealt: false });
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const c of cracks) {
        if (c.dealt || time < c.eruptAt) continue;
        c.dealt = true;
        tk.sfx('crystal-shatter');
        if (playerLive(tk) && onCrack(c, p.x, p.y, 30)) tk.hitPlayer(17, p.x, p.y);
      }
      if (playerLive(tk) && time - tick.at > 550 && cracks.some((c) => c.dealt && time > c.eruptAt + 400 && time < c.until && onCrack(c, p.x, p.y, 16))) {
        tick.at = time;
        tk.hitPlayer(4, p.x, p.y);
      }
      cracks = cracks.filter((c) => time < c.until);
    },
    drawGround(g, time) {
      for (const c of cracks) {
        if (!c.dealt) {
          const k = clamp((time - c.at) / Math.max(1, c.eruptAt - c.at), 0, 1);
          tracePoly(g, c.pts, k * 1.1, 3, MANA_DEEP, 0.9);
          tracePoly(g, c.pts, k, 1.2, MANA_LIT, 0.8);
          if (k > 0.6) tracePoly(g, c.pts, 1, 30 * (k - 0.6), MANA, 0.12);
        } else {
          const open = clamp((c.until - time) / 600, 0, 1);
          const burst = clamp(1 - (time - c.eruptAt) / 400, 0, 1);
          tracePoly(g, c.pts, 1, 10, SLATE_DEEP, 0.8 * open);
          tracePoly(g, c.pts, 1, 5, MANA, (0.6 + Math.sin(time / 80) * 0.2) * open);
          tracePoly(g, c.pts, 1, 2, 0xffffff, 0.8 * open);
          if (burst > 0) tracePoly(g, c.pts, 1, 60 * burst, MANA_LIT, 0.4 * burst);
        }
      }
    },
    drawAir(g, time) {
      for (const c of cracks) {
        if (!c.dealt) continue;
        const burst = clamp(1 - (time - c.eruptAt) / 500, 0, 1);
        c.pts.forEach((p, i) => {
          if (i === 0) return;
          const h = burst * 70 + Math.sin(time / 120 + i) * 4 + 6;
          g.fillStyle(MANA_LIT, 0.35 + burst * 0.5); g.fillTriangle(p.x - 4, p.y, p.x + 4, p.y, p.x, p.y - h);
        });
      }
    },
    onPhaseEnd() { cracks = []; },
  };
};

export const SIGIL_BOSS: WorldBossDef = {
  worldId: 'isle:sigil',
  name: 'Prince Sigil',
  title: 'the Radiance of the Circle',
  color: SIGIL,
  colorLit: SIGIL_LIT,
  colorDark: SIGIL_DARK,
  accent: SIGIL_ACCENT,
  // Tier 3 of the tenth isle.
  damageMult: 1.5,

  intro: [
    'Sit. Not there — that is a line. Sit outside the line. Everything in this dome is a line or outside one.',
    'I drew the circle that holds the sun. One sitting. It has never needed another stroke. Shall I show you how?',
  ],
  banter: [
    'A triangle is fire. A circle is a ward. A spiral is a door. A student who asks why is a fourth shape.',
    'I do not look up from the chalk. Looking up is how a hand shakes.',
    'You are untidy. Untidy sigils go off in the hand.',
    'The Despot asked for noon. I drew noon. What he does with it is not a matter of sigilry.',
    'Again. From the top. Your footwork has no geometry at all.',
  ],
  defeatLine: 'THE CHALK BREAKS',
  resumeLine: 'You are back. Good. A proof is not a proof until it has been done twice.',

  phases: [
    {
      name: 'Runecraft',
      line: 'Observe. Three shapes. Every working on Solmara is made of these three. Take notes.',
      hp: 600,
      cycle: [
        'sig:triangle', 'volley', 'sig:circle', 'sig:spiral', 'radial',
        'sig:triangle', 'homing', 'sig:spiral', 'sig:circle',
      ],
      harass: ['h-rune', 'h-snipe'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Ritual',
      line: 'Enough shapes. The dome is a circle. It has always been a circle. You have been standing in my working.',
      hp: 690,
      cycle: [
        'sig:ritual', 'sig:chords', 'sig:seal', 'lanes', 'sig:ritual',
        'sig:triangle', 'spiral', 'sig:chords', 'sig:ritual', 'sig:seal',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'EVERY SPELL, TWICE',
    extraPhase: {
      name: 'Overload',
      line: 'My hand is shaking. Do you see? I have never — the chalk is going twice. It is going TWICE.',
      hp: 520,
      cycle: [
        'sig:fissure', 'sig:triangle', 'sig:spiral', 'sig:circle', 'sig:fissure',
        'sig:chords', 'barrage', 'sig:triangle', 'sig:spiral',
      ],
      harass: ['h-rune', 'h-mines', 'h-flak'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 190 },
    homing: { count: 3, speed: 170 },
    lanes: { count: 3, warnMs: 900 },
  },

  signatures: {
    triangle,
    circle: wardCircle,
    spiral,
    ritual,
    chords,
    seal,
    fissure,
  },

  look: {
    crest: 'orbs', pattern: 'runes', aura: 'sparks', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 3, eyeColor: SIGIL_ACCENT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'cold', look: { crest: 'halo', aura: 'dust' } },
    { movement: 'blink', gimmick: 'none', tint: 'hot', look: { aura: 'glitch', mouth: 'grate', hands: 'wisp' } },
  ],

  /**
   * The Radiance of the Circle's tells. A tall pointed hood of white vellum, gold-edged and
   * written all over in his own runes, with a high stiff collar; a long stick of chalk in his
   * first hand whose tip glows as he casts; an open grimoire floating at his second hand, its
   * pages lifting. In Runecraft three runestones circle his head. In the Ritual they lock into a
   * ring behind him and a turning sigil circle opens under his feet. In Overload everything is
   * doubled — six stones, a mirrored ghost of his hood — and mana cracks glow across his robe.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const ritualPhase = s.phaseIdx === 1;
    const over = s.hard && s.phaseIdx >= 2;
    // Under his feet in the Ritual: a turning sigil.
    if (ritualPhase) sigilCircle(g, s.x, s.y + R * 0.9, R * 1.5, 0.45, GOLD, 0.6, 5, Math.floor(s.t / 400));
    // The stiff collar: fanned vellum leaves behind the head.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32;
      const px = s.x + Math.cos(a) * R * 1.05, py = s.y - R * 0.2 + Math.sin(a) * R * 0.75;
      g.fillStyle(MARBLE_SHADE, 1); g.fillTriangle(s.x + Math.cos(a - 0.14) * R * 0.6, s.y - R * 0.2 + Math.sin(a - 0.14) * R * 0.5, s.x + Math.cos(a + 0.14) * R * 0.6, s.y - R * 0.2 + Math.sin(a + 0.14) * R * 0.5, px, py);
      g.lineStyle(1, GOLD, 0.9); g.lineBetween(s.x + Math.cos(a) * R * 0.6, s.y - R * 0.2 + Math.sin(a) * R * 0.5, px, py);
    }
    // The tall hood: vellum, gold edge, his runes in a column.
    const drawHood = (ox: number, alpha: number) => {
      const tipX = s.x + ox + Math.sin(s.t / 900) * 4, tipY = s.y - R * 2.6;
      g.fillStyle(MARBLE_DARK, alpha); g.fillTriangle(s.x + ox - R * 0.72, s.y - R * 0.45, s.x + ox + R * 0.72, s.y - R * 0.45, tipX, tipY);
      g.fillStyle(MARBLE, alpha); g.fillTriangle(s.x + ox - R * 0.62, s.y - R * 0.5, s.x + ox + R * 0.62, s.y - R * 0.5, tipX, tipY + 4);
      g.fillStyle(MARBLE_LIT, alpha * 0.8); g.fillTriangle(s.x + ox - R * 0.5, s.y - R * 0.5, s.x + ox - R * 0.12, s.y - R * 0.5, tipX - 1, tipY + 8);
      g.lineStyle(2, GOLD, alpha); g.lineBetween(s.x + ox - R * 0.72, s.y - R * 0.45, tipX, tipY); g.lineBetween(s.x + ox + R * 0.72, s.y - R * 0.45, tipX, tipY);
      g.fillStyle(GOLD, alpha); g.fillRect(s.x + ox - R * 0.72, s.y - R * 0.52, R * 1.44, 4);
      for (let i = 0; i < 4; i++) {
        const k = 0.2 + i * 0.2;
        rune(g, s.x + ox + (tipX - s.x - ox) * k, s.y - R * 0.5 + (tipY - s.y + R * 0.5) * k, 4 - i * 0.5, i * 2 + 1, over ? MANA_LIT : GOLD_DARK, alpha, 1.2);
      }
      g.fillStyle(SIGIL_ACCENT, alpha); g.fillCircle(tipX, tipY, 3 + s.castGlow * 2);
    };
    if (over) drawHood(Math.sin(s.t / 120) * 10 + 8, 0.35);
    drawHood(0, 1);
    // Runestones about his head.
    const n = over ? 6 : 3;
    for (let i = 0; i < n; i++) {
      let px: number, py: number;
      if (ritualPhase) {
        const a = -Math.PI / 2 + (i - 1) * 0.9;
        px = s.x + Math.cos(a) * R * 1.75; py = s.y - R * 0.9 + Math.sin(a) * R * 0.8;
      } else {
        const a = s.t / (over ? 380 : 700) + (i / n) * Math.PI * 2;
        px = s.x + Math.cos(a) * R * 1.5; py = s.y - R * 1.3 + Math.sin(a) * R * 0.42;
      }
      g.fillStyle(SLATE_DEEP, 1); g.fillTriangle(px - 6, py + 6, px + 6, py + 6, px, py - 9);
      g.fillStyle(0x646c80, 1); g.fillTriangle(px - 4, py + 5, px + 1, py + 5, px - 1, py - 6);
      rune(g, px, py, 3.5, i * 3, MANA_LIT, 0.8 + Math.sin(s.t / 200 + i) * 0.2, 1.2);
    }
    if (ritualPhase) { g.lineStyle(1.5, GOLD, 0.5); g.strokeEllipse(s.x, s.y - R * 1.4, R * 3.4, R * 1.4); }
    // The robe's front: ultramarine with a chalk sigil, cracks of mana in Overload.
    g.fillStyle(ROBE_DARK, 0.6); g.fillTriangle(s.x - R * 0.5, s.y + R * 0.2, s.x + R * 0.5, s.y + R * 0.2, s.x, s.y + R * 1.05);
    g.lineStyle(1.2, CHALK, 0.8); g.strokeCircle(s.x, s.y + R * 0.45, R * 0.22);
    if (over) {
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + 0.4;
        g.lineStyle(2, MANA, 0.6 + Math.sin(s.t / 90 + i) * 0.3);
        g.lineBetween(s.x + Math.cos(a) * R * 0.2, s.y + Math.sin(a) * R * 0.2, s.x + Math.cos(a + 0.3) * R * 0.85, s.y + Math.sin(a + 0.3) * R * 0.85);
      }
    }
    // The chalk in his first hand, glowing at the tip as he casts.
    const h0 = s.hands[0];
    if (h0) {
      const a = s.facing;
      const tx = h0.x + Math.cos(a) * 26, ty = h0.y + Math.sin(a) * 26 - 6;
      g.lineStyle(5, CHALK, 1); g.lineBetween(h0.x, h0.y, tx, ty);
      g.lineStyle(2, MARBLE_SHADE, 1); g.lineBetween(h0.x, h0.y + 2, tx, ty + 2);
      glow(g, tx, ty, 10 + s.castGlow * 10, SIGIL_ACCENT, 0.08 + s.castGlow * 0.12, 3);
      g.fillStyle(0xffffff, 0.8 + s.castGlow * 0.2); g.fillCircle(tx, ty, 2.5 + s.castGlow * 2);
    }
    // The floating grimoire at his second hand.
    const h1 = s.hands[1];
    if (h1) {
      const bx = h1.x, by = h1.y - 22 + Math.sin(s.t / 400) * 3;
      g.fillStyle(VIOLET_DARK, 1); g.fillRect(bx - 16, by - 2, 32, 5);
      g.fillStyle(0xfaf4e0, 1); g.fillTriangle(bx, by, bx - 16, by - 4, bx - 15, by + 2); g.fillTriangle(bx, by, bx + 16, by - 4, bx + 15, by + 2);
      g.fillRect(bx - 15, by - 4, 30, 5);
      g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(bx, by - 5, bx, by + 3);
      const flip = (s.t / 300) % 1;
      g.fillStyle(0xfffaf0, 0.9); g.fillTriangle(bx, by - 4, bx + 14 * Math.cos(flip * Math.PI), by - 4 - Math.sin(flip * Math.PI) * 10, bx + 2, by - 2);
      rune(g, bx - 8, by - 1, 2, Math.floor(s.t / 300), GOLD_DARK, 1, 1);
      glow(g, bx, by - 6, 14, FONT, 0.05 + s.castGlow * 0.06, 2);
    }
    if (s.enraged) { g.lineStyle(1.5, SIGIL_ACCENT, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The lecture dome: a floor of white marble under the oculus, with the Academy's great teaching
   * circle inlaid in brass across it (the rings of the Ritual, laid in metal); tiered benches of
   * the lecture theatre in a crescent along the top wall, ultramarine-cushioned and empty; slate
   * boards on the side walls chalked with proofs; and the shaft of noon from the oculus pooling
   * white at the heart, where he stands to teach.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x51a11);
    g.fillStyle(MARBLE, 1); g.fillRect(0, 0, W, H);
    // Marble slabs, veined.
    for (let y = 100; y < H; y += 64) {
      for (let x = (y / 64) % 2 ? -32 : 0; x < W; x += 64) {
        g.fillStyle(rng() < 0.5 ? MARBLE_LIT : MARBLE, 1); g.fillRect(x + 1, y + 1, 62, 62);
        if (rng() < 0.4) { g.lineStyle(1, MARBLE_DARK, 0.2); g.lineBetween(x + rng() * 60, y + rng() * 60, x + rng() * 60, y + rng() * 60); }
      }
    }
    g.lineStyle(1, MARBLE_SHADE, 0.6);
    for (let y = 100; y < H; y += 64) g.lineBetween(0, y, W, y);
    // The brass teaching circle — the Ritual's rings, in metal.
    for (const [r0, r1, n] of BANDS) {
      g.lineStyle(3, BRASS_DARK, 0.7); g.strokeEllipse(CX, CY, r1 * 2, r1 * 2 * SQ);
      g.lineStyle(1.5, BRASS, 0.8); g.strokeEllipse(CX, CY, r1 * 2 - 4, r1 * 2 * SQ - 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.lineStyle(1.5, BRASS, 0.5);
        g.lineBetween(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0 * SQ, CX + Math.cos(a) * r1, CY + Math.sin(a) * r1 * SQ);
        rune(g, CX + Math.cos(a + Math.PI / n) * (r0 + r1) / 2, CY + Math.sin(a + Math.PI / n) * ((r0 + r1) / 2) * SQ, 6, i + n, BRASS_DARK, 0.45, 1.4);
      }
    }
    g.lineStyle(3, BRASS_DARK, 0.7); g.strokeEllipse(CX, CY, BANDS[0][0] * 2, BANDS[0][0] * 2 * SQ);
    // The oculus' light pooling at the heart.
    glow(g, CX, CY, 120, 0xffffff, 0.05, 5);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(CX, CY, 96, 96 * SQ);
    // The lecture theatre's tiers in a crescent along the top.
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, 0, W, 110);
    for (let k = 0; k < 4; k++) {
      const y = 12 + k * 24;
      g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE, 1); g.fillRect(0, y, W, 22);
      g.fillStyle(MARBLE_LIT, 0.8); g.fillRect(0, y, W, 2);
      // Cushions, ultramarine, every seat empty.
      for (let x = 20 + (k % 2) * 30; x < W; x += 60) { g.fillStyle(k % 2 ? ROBE : VIOLET, 0.9); g.fillRect(x, y + 6, 34, 10); g.fillStyle(lit(ROBE, 0.3), 0.6); g.fillRect(x, y + 6, 34, 2); }
    }
    g.fillStyle(GOLD, 1); g.fillRect(0, 108, W, 4);
    // Slate boards on the side walls, chalked with proofs.
    for (const x0 of [0, W - 28]) {
      g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, 112, 28, H - 112);
      for (let y = 150; y < H - 60; y += 150) {
        g.fillStyle(BRASS_DARK, 1); g.fillRect(x0 + 2, y - 2, 24, 84);
        g.fillStyle(SLATE_DEEP, 1); g.fillRect(x0 + 4, y, 20, 80);
        g.lineStyle(1, CHALK, 0.8); g.strokeCircle(x0 + 14, y + 22, 7);
        for (let l = 0; l < 4; l++) g.lineBetween(x0 + 7, y + 40 + l * 9, x0 + 7 + 6 + rng() * 8, y + 40 + l * 9);
      }
    }
    // A lectern at the bottom of the hall, and chalk dust everywhere.
    g.fillStyle(dim(BRASS, 0.2), 1); g.fillRect(CX - 24, H - 34, 48, 26);
    g.fillStyle(BRASS, 1); g.fillRect(CX - 28, H - 38, 56, 6);
    for (let i = 0; i < 180; i++) { g.fillStyle(CHALK, 0.35); g.fillCircle(rng() * W, 115 + rng() * (H - 115), 1); }
    // The faint shadow of the oculus rim — the only shadow in the dome, a ring, never moving.
    g.lineStyle(10, 0x000000, 0.035); g.strokeEllipse(CX, CY, 230, 230 * SQ);
    sigilCircle(g, CX, CY, 46, SQ, GOLD, 0.6, 3, 2);
  },
};
