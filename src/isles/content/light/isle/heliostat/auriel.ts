import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Pt, StrikeTarget } from '../../../../IslesTypes';
import { glow, mixC, mulberry } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, DUSK, GLARE, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_LIT, MARBLE, MARBLE_SHADE, MIRROR, MIRROR_DARK,
  NIGHT, STAR, SUN, SUN_DEEP, SUN_HOT,
  beam, caustics, chainLink, clearFigure, lightShaft, standingMirror, sunDisc, sunburst,
} from './art';

/**
 * Despot Auriel of the Endless Noon — Solmara's monarch, the last before the Obsidian Pinnacle.
 *
 * He abolished darkness because darkness is where lies live, and he stands in the Crown of
 * Mirrors under the sun he has held still for twenty-two years. The fight is one long day, the
 * first in twenty-two years that is allowed to end:
 *
 *   I   Noonday     — the sun straight overhead. Shafts of light hammer down in rings round you;
 *                     the floor splits into gnomon-stripes and the stripes come down by turns;
 *                     Clarity takes your shadow off you, drags it along behind, and strikes it —
 *                     stop moving and your shadow catches up with you, and so does the light.
 *   II  Heliostat   — mirrors rise round the Crown and he angles them: one beam of sun is bounced
 *                     mirror to mirror across the floor, and re-angled every few seconds. Strike a
 *                     mirror and you turn it yourself — onto him (scalded: +50% taken). He flashes
 *                     a hand-mirror's glint at you that bounces off his nearest mirror; caustics
 *                     knot on the floor and the knots burn.
 *   III Corona      — he pulls the sun down and wears it. The arena whites out to the edges; only
 *                     the cone of his own shadow is cool, and it swings as he turns. Out of it you
 *                     heat to sunstroke. He turns his back on you to move the shade; throws
 *                     prominences; sends coronal waves whose only gap is his shadow; and drops
 *                     sunspots — cool for a moment, then they cave in.
 *   IV  Sunset      — the chain breaks. The sun falls, and the Crown goes from noon to dusk to
 *                     night as the phase runs on. His power wanes with the light (he hits softer,
 *                     he is hit harder) but in the dark only he glows: embers of the fallen sun
 *                     roll across the floor; long shadows are the only shelter from the low sun;
 *                     his eyes open at the edges of the night and he strikes out of it; and he
 *                     throws the last light he has left.
 *   V   Second Sun (hard) — a twin sun rises opposite the first: every shadow and every beam
 *                     comes from two sides at once.
 *
 * Every signature is bespoke; none borrow from the earlier monarchs.
 */

// ── Palette ──────────────────────────────────────────────────────────

const A_MAIN = 0xf0c048;
const A_LIT = 0xfff8d8;
const A_DARK = 0x6a4a10;
const COOL = 0x5a6aa8;
const VIOLET = 0x3a2a6a;

const FT = 96;
const TAU = Math.PI * 2;

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
const inField = (tk: BossToolkit, x: number, y: number, pad = 20): boolean =>
  x > pad && x < tk.W - pad && y > FT + pad && y < tk.H - pad;
const alivePlayer = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;
type Gfx = Phaser.GameObjects.Graphics;

/**
 * The sky the fight shares: how much light is left (Sunset), where his shadow points (Corona),
 * the cool sunspots, the two suns (Second Sun) and his mirrors (Heliostat). Each owning
 * signature resets its own fields when it is built (once per fight).
 */
const SKY_STATE = {
  light: 1,
  shadeA: Math.PI / 2,
  shadeOn: false,
  cool: [] as { x: number; y: number; r: number }[],
  suns: [] as Pt[],
  mirrors: [] as Pt[],
};

/** In the Sunset his strikes weaken with the light. */
const power = (tk: BossToolkit): number => (tk.phase === 3 ? 0.55 + 0.45 * SKY_STATE.light : 1);

/** Track "my phase has begun" across the interludes: onPhaseEnd sends a watcher dormant. */
class PhaseWatch {
  private seen = -1;
  dormant = true;
  /** True on the first frame of a new phase. */
  began(tk: BossToolkit): boolean {
    if (tk.phase === this.seen) return false;
    this.seen = tk.phase;
    this.dormant = false;
    return true;
  }
  live(tk: BossToolkit, phase: number): boolean { return !this.dormant && tk.phase === phase; }
  end(): void { this.dormant = true; }
}

/** Fill everything round (ox, oy) except the listed cones — a whiteout with shade cut out of it. */
const fanExcept = (g: Gfx, ox: number, oy: number, cones: { a: number; half: number }[], color: number, alpha: number): void => {
  const N = 72;
  g.fillStyle(color, alpha);
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    const mid = (a0 + a1) / 2;
    if (cones.some((c) => Math.abs(wrap(mid - c.a)) < c.half)) continue;
    g.fillTriangle(ox, oy, ox + Math.cos(a0) * 1400, oy + Math.sin(a0) * 1400, ox + Math.cos(a1) * 1400, oy + Math.sin(a1) * 1400);
  }
};

// ── I. Hammers of Noon ───────────────────────────────────────────────
// Rings of sun-shafts round where you stand: the centre first, then each ring outward, a beat
// apart. The coin of light on the floor is the warning. Step into the centre once it has fallen.
// Under the Second Sun the rings come down at your mirror point across the Crown as well.

const hammers = (tk: BossToolkit): SignatureMove => {
  interface Shaft { x: number; y: number; born: number; at: number; done: boolean }
  const HIT_R = 36;
  let shafts: Shaft[] = [];
  const ring = (cx: number, cy: number, t0: number) => {
    for (let k = 0; k < 4; k++) {
      const n = k === 0 ? 1 : 3 + 2 * k;
      for (let i = 0; i < n; i++) {
        const a = k * 0.4 + (i / n) * TAU;
        const x = cx + Math.cos(a) * 100 * k, y = cy + Math.sin(a) * 92 * k;
        if (!inField(tk, x, y, 10)) continue;
        shafts.push({ x, y, born: t0, at: t0 + tk.warn(900) + k * 380, done: false });
      }
    }
  };
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'raise',
    tell: 'HAMMERS OF NOON',
    cast(time) {
      const p = tk.player;
      ring(p.x, p.y, time);
      if (tk.phase === 4) ring(tk.W - p.x, FT + tk.H - p.y, time);
      tk.sfx('holy-chord');
    },
    update(time) {
      const p = tk.player;
      let rang = false;
      for (const s of shafts) {
        if (s.done || time < s.at) continue;
        s.done = true;
        if (!rang) { tk.sfx('light-beam'); rang = true; }
        if (alivePlayer(tk) && dist(p.x, p.y, s.x, s.y) < HIT_R + 8) {
          tk.hitPlayer(13, p.x, p.y);
          float(tk, p.x, p.y - 44, 'HAMMERED', '#fff2a8');
        }
      }
      shafts = shafts.filter((s) => time < s.at + 450);
    },
    drawGround(g, time) {
      for (const s of shafts) {
        if (s.done) {
          const k = (time - s.at) / 450;
          g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillCircle(s.x, s.y, HIT_R * (1 + k * 0.4));
          continue;
        }
        const k = clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        g.fillStyle(SUN, 0.1 + k * 0.25); g.fillCircle(s.x, s.y, HIT_R * (0.3 + 0.7 * k));
        g.lineStyle(2, GOLD_LIT, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, HIT_R);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.9); g.strokeCircle(s.x, s.y, HIT_R + 3); }
      }
    },
    drawAir(g, time) {
      for (const s of shafts) {
        if (!s.done) {
          const k = clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
          // The shaft gathering high above: a thin line that thickens as it comes.
          g.lineStyle(1 + k * 4, SUN, 0.1 + k * 0.25); g.lineBetween(s.x, FT, s.x, s.y);
          continue;
        }
        const k = (time - s.at) / 450;
        lightShaft(g, s.x, s.y, HIT_R * 1.6, s.y - FT + 40, SUN, 1 - k);
      }
    },
    onPhaseEnd() { shafts = []; },
  };
};

// ── I. The Gnomon ────────────────────────────────────────────────────
// The floor is ruled into stripes like the face of a sundial. The odd stripes shimmer and come
// down; then the even ones. Stand in an even stripe, and step into an odd one once it has fallen.
// Under the Second Sun the stripes are ruled both ways, and only the right squares are safe.

const gnomon = (tk: BossToolkit): SignatureMove => {
  interface Bar { x: number; y: number; w: number; h: number; born: number; at: number; done: boolean; vertical: boolean }
  const SW = 96;
  const SH = 90;
  let bars: Bar[] = [];
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'THE GNOMON',
    cast(time) {
      const a = time + tk.warn(1100), b = a + 800;
      const flip = Math.random() < 0.5 ? 0 : 1;
      for (let i = 0; i * SW < tk.W; i++) {
        bars.push({ x: i * SW, y: FT, w: SW, h: tk.H - FT, born: time, at: (i + flip) % 2 ? b : a, done: false, vertical: true });
      }
      if (tk.phase === 4) {
        for (let j = 0; FT + j * SH < tk.H; j++) {
          bars.push({ x: 0, y: FT + j * SH, w: tk.W, h: SH, born: time, at: (j + flip) % 2 ? b : a, done: false, vertical: false });
        }
      }
      tk.sfx('clock-tick');
    },
    update(time) {
      const p = tk.player;
      let hit = false, rang = false;
      for (const s of bars) {
        if (s.done || time < s.at) continue;
        s.done = true;
        if (!rang) { tk.sfx('beam-fire'); rang = true; }
        if (!hit && alivePlayer(tk) && p.x > s.x - 10 && p.x < s.x + s.w + 10 && p.y > s.y - 10 && p.y < s.y + s.h + 10) {
          hit = true;
          tk.hitPlayer(14, p.x, p.y);
          float(tk, p.x, p.y - 44, 'STRUCK AT NOON', '#fff2a8');
        }
      }
      bars = bars.filter((s) => time < s.at + 320);
    },
    drawGround(g, time) {
      for (const s of bars) {
        if (s.done) {
          const k = (time - s.at) / 320;
          g.fillStyle(0xffffff, 0.55 * (1 - k)); g.fillRect(s.x, s.y, s.w, s.h);
          continue;
        }
        const k = clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        g.fillStyle(SUN, (s.vertical ? 0.05 : 0.04) + k * 0.16); g.fillRect(s.x, s.y, s.w, s.h);
        g.lineStyle(2, GOLD, 0.25 + k * 0.5);
        if (s.vertical) { g.lineBetween(s.x + 2, s.y, s.x + 2, s.y + s.h); g.lineBetween(s.x + s.w - 2, s.y, s.x + s.w - 2, s.y + s.h); } else { g.lineBetween(s.x, s.y + 2, s.x + s.w, s.y + 2); g.lineBetween(s.x, s.y + s.h - 2, s.x + s.w, s.y + s.h - 2); }
        // Dust glinting in the gathering light.
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 900) + i / 4 + s.x * 0.003 + s.y * 0.002) % 1;
          const x = s.vertical ? s.x + s.w * (0.2 + 0.6 * ((i * 0.37) % 1)) : s.x + ((ph + i * 0.25) % 1) * s.w;
          const y = s.vertical ? s.y + ph * s.h : s.y + s.h * (0.2 + 0.6 * ((i * 0.37) % 1));
          g.fillStyle(0xffffff, 0.4 + k * 0.5); g.fillCircle(x, y, 1.6);
        }
        if (k > 0.85 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.7); g.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6); }
      }
    },
    drawAir(g, time) {
      for (const s of bars) {
        if (!s.done) continue;
        const k = (time - s.at) / 320;
        g.fillStyle(SUN, 0.35 * (1 - k)); g.fillRect(s.x + s.w * 0.15, s.y, s.w * 0.7, s.h);
      }
    },
    onPhaseEnd() { bars = []; },
  };
};

// ── I. Clarity ───────────────────────────────────────────────────────
// "No shadow anywhere — not even yours." He takes your shadow off you; it trails along behind on
// your path, a step late, and every beat a shaft strikes it. Keep moving and it strikes empty
// floor; stand still and your shadow catches you up, and the light finds you in it.

const clarity = (tk: BossToolkit): SignatureMove => {
  const LAG = 900;
  const BEAT = 600;
  const HIT_R = 34;
  const hist: { t: number; x: number; y: number }[] = [];
  let until = 0;
  let nextBeat = 0;
  let flashes: { x: number; y: number; at: number }[] = [];
  const shadowAt = (time: number): Pt => {
    const want = time - LAG;
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].t <= want) return hist[i];
    return hist[0] ?? { x: tk.player.x, y: tk.player.y };
  };
  return {
    durationMs: 4600,
    windupMs: 700,
    gesture: 'point',
    tell: 'CLARITY',
    cast(time) {
      until = time + 4400;
      nextBeat = time + tk.warn(800);
      tk.sfx('judgement');
      float(tk, tk.player.x, tk.player.y - 54, 'YOUR SHADOW IS TAKEN', '#fff8d8');
    },
    update(time) {
      const p = tk.player;
      hist.push({ t: time, x: p.x, y: p.y });
      while (hist.length > 2 && hist[0].t < time - 2000) hist.shift();
      if (time < until && time >= nextBeat) {
        const s = shadowAt(time);
        flashes.push({ x: s.x, y: s.y, at: time });
        tk.sfx('light-beam');
        if (alivePlayer(tk) && dist(p.x, p.y, s.x, s.y) < HIT_R + 8) {
          tk.hitPlayer(12, p.x, p.y);
          float(tk, p.x, p.y - 44, 'NOWHERE TO HIDE', '#fff2a8');
        }
        nextBeat += BEAT;
      }
      flashes = flashes.filter((f) => time < f.at + 380);
    },
    drawGround(g, time) {
      if (time >= until) return;
      const s = shadowAt(time);
      // Your shadow, lying on the floor without you: long, dark, a little the wrong shape.
      g.fillStyle(0x000000, 0.45); g.fillEllipse(s.x, s.y + 6, 40, 18);
      g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y - 8, 22, 30);
      g.fillStyle(0x000000, 0.35); g.fillCircle(s.x, s.y - 28, 9);
      const k = clampN((nextBeat - time) / BEAT, 0, 1);
      g.lineStyle(2, GOLD_LIT, 0.8); g.strokeCircle(s.x, s.y, HIT_R + k * 40);
      g.lineStyle(1, 0xffffff, 0.6);
      g.lineBetween(s.x - HIT_R - 10, s.y, s.x - HIT_R + 4, s.y); g.lineBetween(s.x + HIT_R - 4, s.y, s.x + HIT_R + 10, s.y);
      g.lineBetween(s.x, s.y - HIT_R - 10, s.x, s.y - HIT_R + 4); g.lineBetween(s.x, s.y + HIT_R - 4, s.x, s.y + HIT_R + 10);
      // A thread of light tying it back to you.
      const p = tk.player;
      g.lineStyle(1, 0xffffff, 0.25); g.lineBetween(p.x, p.y, s.x, s.y);
    },
    drawAir(g, time) {
      for (const f of flashes) {
        const k = (time - f.at) / 380;
        lightShaft(g, f.x, f.y, 60, f.y - FT + 30, SUN, 1 - k);
      }
    },
    onPhaseEnd() { until = 0; flashes = []; },
  };
};

// ── II. The Heliostat ────────────────────────────────────────────────
// Six great mirrors rise round the Crown. One beam of sun comes down from the zenith and he bounces
// it from mirror to mirror across the floor; every few seconds he re-angles them (the new path is
// traced first). Strike a mirror and it turns: the beam goes no further than that mirror, and
// from it straight into him — scalded, he takes half again as much, until he angles it away.
// The cast is his re-angling; the beam itself runs the whole phase.

const heliostat = (tk: BossToolkit): SignatureMove => {
  const POS: Pt[] = [
    { x: 110, y: 190 }, { x: 850, y: 190 }, { x: 110, y: 430 },
    { x: 850, y: 430 }, { x: 300, y: 590 }, { x: 660, y: 590 },
  ];
  const SOURCE: Pt = { x: tk.W / 2, y: FT + 2 };
  const EVERY = 7000;
  const WARN = 1300;
  const SCALD_MS = 4000;
  const HALF = 10;
  interface Mirror { x: number; y: number; target: StrikeTarget | null; struckAt: number; risen: number }
  interface Path { route: number[]; aim: Pt }
  const watch = new PhaseWatch();
  let mirrors: Mirror[] = [];
  let path: Path = { route: [], aim: { x: 0, y: 0 } };
  let next: Path | null = null;
  let switchAt = 0;
  let scaldUntil = 0;
  let lastHit = 0;
  SKY_STATE.mirrors = [];

  const pick = (): Path => {
    const idx = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
    return { route: idx, aim: { x: tk.player.x, y: tk.player.y } };
  };
  const strike = (i: number) => {
    if (!watch.live(tk, 1)) return;
    const now = tk.now;
    const at = path.route.indexOf(i);
    path = { route: at >= 0 ? path.route.slice(0, at + 1) : [i], aim: path.aim };
    next = null;
    scaldUntil = now + SCALD_MS;
    mirrors[i].struckAt = now;
    float(tk, tk.bossX, tk.bossY - 70, 'SCALDED', '#ffd27a');
    tk.sfx('prism');
  };
  const segments = (p: Path, toBoss: boolean): [Pt, Pt][] => {
    const pts: Pt[] = [SOURCE, ...p.route.map((i) => mirrors[i] ?? POS[i])];
    const out: [Pt, Pt][] = [];
    for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]]);
    const last = pts[pts.length - 1];
    if (toBoss) out.push([last, { x: tk.bossX, y: tk.bossY }]);
    else {
      const a = Math.atan2(p.aim.y - last.y, p.aim.x - last.x);
      out.push([last, { x: last.x + Math.cos(a) * 1200, y: last.y + Math.sin(a) * 1200 }]);
    }
    return out;
  };
  const raise = (time: number) => {
    mirrors = POS.map((m, i) => ({
      x: m.x, y: m.y, struckAt: 0, risen: time + i * 120,
      target: tk.spawnTarget({ x: m.x, y: m.y, r: 26, onStruck: () => strike(i) }),
    }));
    SKY_STATE.mirrors = POS.slice();
    path = pick();
    switchAt = time + EVERY;
    tk.sfx('stone-rise');
  };

  return {
    durationMs: 1500,
    windupMs: 600,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'HE ANGLES THE MIRRORS',
    cast(time) {
      if (!watch.live(tk, 1) || mirrors.length === 0) return;
      scaldUntil = 0;
      next = pick();
      switchAt = time + tk.warn(WARN);
      tk.sfx('gear-turn');
    },
    update(time) {
      if (watch.began(tk) && tk.phase === 1) raise(time);
      if (!watch.live(tk, 1) || mirrors.length === 0) return;
      if (scaldUntil && time >= scaldUntil) { scaldUntil = 0; next = pick(); switchAt = time + tk.warn(WARN); }
      if (!next && !scaldUntil && time >= switchAt - tk.warn(WARN)) next = pick();
      if (next && time >= switchAt) { path = next; next = null; switchAt = time + EVERY; tk.sfx('prism'); }
      const p = tk.player;
      if (alivePlayer(tk) && time - lastHit > 650 && time > (mirrors[mirrors.length - 1]?.risen ?? 0) + 500) {
        for (const [a, b] of segments(path, scaldUntil > time)) {
          if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < HALF + 18) {
            lastHit = time;
            tk.hitPlayer(10, p.x, p.y);
            float(tk, p.x, p.y - 44, 'IN THE BEAM', '#fff2a8');
            break;
          }
        }
      }
    },
    takenMult() { return scaldUntil > tk.now ? 1.5 : 1; },
    drawGround(g, time) {
      if (!watch.live(tk, 1) || mirrors.length === 0) return;
      // The traced path he is about to angle the beam along.
      if (next) {
        const blink = Math.floor(time / 140) % 2 === 0;
        for (const [a, b] of segments(next, false)) {
          const n = Math.max(2, Math.floor(dist(a.x, a.y, b.x, b.y) / 18));
          g.lineStyle(2, 0xffffff, blink ? 0.7 : 0.35);
          for (let i = 0; i < n; i += 2) {
            const f0 = i / n, f1 = (i + 1) / n;
            g.lineBetween(a.x + (b.x - a.x) * f0, a.y + (b.y - a.y) * f0, a.x + (b.x - a.x) * f1, a.y + (b.y - a.y) * f1);
          }
        }
      }
      for (const m of mirrors) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(m.x, m.y + 8, 56, 14);
        g.lineStyle(2, GOLD, 0.6); g.strokeCircle(m.x, m.y + 4, 28);
      }
    },
    drawAir(g, time) {
      if (!watch.live(tk, 1) || mirrors.length === 0) return;
      const scald = scaldUntil > time;
      const ready = time > mirrors[mirrors.length - 1].risen + 500;
      if (ready) {
        for (const [a, b] of segments(path, scald)) beam(g, a.x, a.y, b.x, b.y, HALF, time, 1);
        const pts = [SOURCE, ...path.route.map((i) => mirrors[i])];
        for (const q of pts) glow(g, q.x, q.y, 30, SUN, 0.12, 3);
        if (scald) {
          glow(g, tk.bossX, tk.bossY, 60, SUN_HOT, 0.12, 4);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + time / 200;
            g.fillStyle(0xffffff, 0.8); g.fillCircle(tk.bossX + Math.cos(a) * 40, tk.bossY + Math.sin(a) * 34, 3);
          }
        }
      }
      for (let i = 0; i < mirrors.length; i++) {
        const m = mirrors[i];
        const up = clampN((time - m.risen) / 500, 0, 1);
        if (up <= 0) continue;
        const flash = clampN(1 - (time - m.struckAt) / 400, 0, 1);
        const tilt = Math.sin(time / 1300 + i) * 0.3 + (m.struckAt && time - m.struckAt < SCALD_MS ? 0.8 : 0);
        const h = 66 * up;
        standingMirror(g, m.x, m.y + 22, 46, h, tilt, flash);
      }
    },
    onPhaseEnd() {
      watch.end();
      for (const m of mirrors) m.target?.remove();
      mirrors = [];
      next = null;
      scaldUntil = 0;
      SKY_STATE.mirrors = [];
    },
  };
};

// ── II. The Heliograph ───────────────────────────────────────────────
// He flashes a hand-mirror at you: a wedge of white glare, traced on the floor, and anyone in it
// is dazzled (a short stun). The flash then bounces — off his nearest great mirror in the
// Heliostat, off the second sun under the Second Sun — and comes at you again from there.

const heliograph = (tk: BossToolkit): SignatureMove => {
  interface Cone { ox: number; oy: number; a: number; half: number; len: number; born: number; at: number; done: boolean; bounce: boolean }
  let cones: Cone[] = [];
  const HALF = 0.3;
  const bounceFrom = (): Pt | null => {
    const p = tk.player;
    if (tk.phase === 1 && SKY_STATE.mirrors.length) {
      let best: Pt | null = null, bd = Infinity;
      for (const m of SKY_STATE.mirrors) {
        const d = dist(m.x, m.y, p.x, p.y);
        if (d > 140 && d < bd) { bd = d; best = m; }
      }
      return best;
    }
    if (tk.phase === 4 && SKY_STATE.suns.length > 1) return SKY_STATE.suns[1];
    return null;
  };
  return {
    durationMs: 2200,
    windupMs: 550,
    gesture: 'point',
    tell: 'THE HELIOGRAPH',
    cast(time) {
      const p = tk.player;
      cones.push({ ox: tk.bossX, oy: tk.bossY, a: Math.atan2(p.y - tk.bossY, p.x - tk.bossX), half: HALF, len: 1100, born: time, at: time + tk.warn(900), done: false, bounce: true });
      tk.sfx('blink');
    },
    update(time) {
      const p = tk.player;
      for (const c of cones) {
        if (c.done || time < c.at) continue;
        c.done = true;
        tk.sfx('light-beam');
        const d = dist(p.x, p.y, c.ox, c.oy);
        if (alivePlayer(tk) && d < c.len && Math.abs(wrap(Math.atan2(p.y - c.oy, p.x - c.ox) - c.a)) < c.half + Math.atan2(18, Math.max(30, d))) {
          tk.hitPlayer(12, p.x, p.y);
          tk.stun(450);
          float(tk, p.x, p.y - 46, 'DAZZLED', '#ffffff');
        }
        if (c.bounce) {
          const from = bounceFrom();
          if (from) {
            cones.push({ ox: from.x, oy: from.y, a: Math.atan2(p.y - from.y, p.x - from.x), half: HALF * 0.9, len: 1100, born: time, at: time + tk.warn(700), done: false, bounce: false });
          }
        }
      }
      cones = cones.filter((c) => time < c.at + 350);
    },
    drawGround(g, time) {
      for (const c of cones) {
        if (c.done) continue;
        const k = clampN((time - c.born) / Math.max(1, c.at - c.born), 0, 1);
        g.fillStyle(GLARE, 0.06 + k * 0.18);
        g.slice(c.ox, c.oy, c.len, c.a - c.half, c.a + c.half, false); g.fillPath();
        g.lineStyle(2, 0xffffff, 0.3 + k * 0.5);
        g.lineBetween(c.ox, c.oy, c.ox + Math.cos(c.a - c.half) * c.len, c.oy + Math.sin(c.a - c.half) * c.len);
        g.lineBetween(c.ox, c.oy, c.ox + Math.cos(c.a + c.half) * c.len, c.oy + Math.sin(c.a + c.half) * c.len);
      }
    },
    drawAir(g, time) {
      for (const c of cones) {
        if (!c.done) {
          // The mirror catching the light at the cone's apex, a growing star.
          const k = clampN((time - c.born) / Math.max(1, c.at - c.born), 0, 1);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI + time / 300;
            g.lineStyle(2, 0xffffff, 0.5 + k * 0.5);
            g.lineBetween(c.ox - Math.cos(a) * (6 + k * 18), c.oy - Math.sin(a) * (6 + k * 18), c.ox + Math.cos(a) * (6 + k * 18), c.oy + Math.sin(a) * (6 + k * 18));
          }
          continue;
        }
        const k = (time - c.at) / 350;
        g.fillStyle(0xffffff, 0.6 * (1 - k));
        g.slice(c.ox, c.oy, c.len, c.a - c.half, c.a + c.half, false); g.fillPath();
      }
    },
    onPhaseEnd() { cones = []; },
  };
};

// ── II. Caustic Net ──────────────────────────────────────────────────
// Light off the mirrors falls on the floor in a wobbling net, like the bottom of a sunlit pool.
// Where its strands cross, the light knots up and burns. The knots are marked; the strands are not
// dangerous. Stand in a mesh, not on a knot.

const causticNet = (tk: BossToolkit): SignatureMove => {
  interface Strand { x: number; y: number; a: number }
  let strands: Strand[] = [];
  let knots: Pt[] = [];
  let born = 0, at = 0, fired = 0;
  const KNOT_R = 48;
  const cross = (s: Strand, t: Strand): Pt | null => {
    const d = Math.sin(t.a - s.a);
    if (Math.abs(d) < 0.15) return null;
    const dx = t.x - s.x, dy = t.y - s.y;
    const u = (dx * Math.sin(t.a) - dy * Math.cos(t.a)) / d;
    return { x: s.x + Math.cos(s.a) * u, y: s.y + Math.sin(s.a) * u };
  };
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'clap',
    tell: 'CAUSTIC NET',
    cast(time) {
      const p = tk.player;
      strands = [];
      for (let i = 0; i < 5; i++) {
        const near = i < 2;
        strands.push({
          x: near ? p.x + (Math.random() - 0.5) * 60 : 120 + Math.random() * (tk.W - 240),
          y: near ? p.y + (Math.random() - 0.5) * 60 : FT + 80 + Math.random() * (tk.H - FT - 160),
          a: (i / 5) * Math.PI + Math.random() * 0.4,
        });
      }
      knots = [];
      for (let i = 0; i < strands.length; i++) {
        for (let j = i + 1; j < strands.length; j++) {
          const c = cross(strands[i], strands[j]);
          if (c && inField(tk, c.x, c.y, 30) && !knots.some((k) => dist(k.x, k.y, c.x, c.y) < KNOT_R * 1.6)) knots.push(c);
        }
      }
      knots = knots.slice(0, 9);
      born = time; at = time + tk.warn(1300); fired = 0;
      tk.sfx('sparkle');
    },
    update(time) {
      if (!at || fired || time < at) return;
      fired = time;
      const p = tk.player;
      tk.sfx('explosion-small');
      let hit = false;
      for (const k of knots) {
        tk.boom(k.x, k.y, KNOT_R, SUN);
        if (!hit && alivePlayer(tk) && dist(p.x, p.y, k.x, k.y) < KNOT_R + 10) {
          hit = true;
          tk.hitPlayer(14, p.x, p.y);
          float(tk, p.x, p.y - 44, 'KNOTTED', '#fff2a8');
        }
      }
    },
    drawGround(g, time) {
      if (!at || (fired && time > fired + 400)) return;
      const k = fired ? 1 : clampN((time - born) / Math.max(1, at - born), 0, 1);
      for (const s of strands) {
        g.lineStyle(2 + k * 2, 0xffffff, (0.25 + 0.4 * k) * (fired ? 1 - (time - fired) / 400 : 1));
        g.beginPath();
        for (let d = -1100; d <= 1100; d += 40) {
          const wob = Math.sin(d / 60 + time / 240) * 6;
          const x = s.x + Math.cos(s.a) * d - Math.sin(s.a) * wob, y = s.y + Math.sin(s.a) * d + Math.cos(s.a) * wob;
          if (d === -1100) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
      if (fired) return;
      for (const n of knots) {
        g.fillStyle(SUN, 0.12 + k * 0.3); g.fillCircle(n.x, n.y, KNOT_R * (0.3 + 0.7 * k));
        caustics(g, n.x, n.y, KNOT_R * 1.4, time, 0xffffff, 0.6, n.x);
        g.lineStyle(2, GOLD_LIT, 0.8); g.strokeCircle(n.x, n.y, KNOT_R);
      }
    },
    onPhaseEnd() { at = 0; strands = []; knots = []; },
  };
};

// ── III. Corona: he turns his back ───────────────────────────────────
// He wears the sun now. Everything is white to the edges but the cone of his own shadow, which
// follows you round — slowly. Out of the shade you heat; at full heat, sunstroke. His cast turns
// his back on you: the shade swings to a new side (traced first) and holds there a while before
// it starts to follow you again. The heat and the shade run the whole phase.

const corona = (tk: BossToolkit): SignatureMove => {
  const HALF = 0.42;
  const FILL_S = 2.3;
  const watch = new PhaseWatch();
  let shadeA = Math.PI / 2;
  let heat = 0;
  let ghostA: number | null = null;
  let swingAt = 0, swingFrom = 0, swingTo = 0, swingUntil = 0;
  let holdUntil = 0;
  let strokeAt = 0;
  SKY_STATE.shadeOn = false;

  const inShade = (x: number, y: number): boolean => {
    const d = dist(x, y, tk.bossX, tk.bossY);
    return d > 30 && Math.abs(wrap(Math.atan2(y - tk.bossY, x - tk.bossX) - shadeA)) < HALF + Math.atan2(14, Math.max(30, d));
  };

  return {
    durationMs: 2100,
    windupMs: 500,
    gesture: 'recoil',
    tell: 'HE TURNS HIS BACK',
    cast(time) {
      if (!watch.live(tk, 2)) return;
      ghostA = shadeA + (Math.random() < 0.5 ? 1 : -1) * (1.9 + Math.random() * 0.8);
      swingAt = time + tk.warn(1300);
      holdUntil = swingAt + 500 + 2600;
      tk.sfx('whoosh');
    },
    update(time, dt) {
      if (watch.began(tk) && tk.phase === 2) {
        shadeA = Math.atan2(tk.player.y - tk.bossY, tk.player.x - tk.bossX);
        heat = 0; ghostA = null; swingUntil = 0; holdUntil = 0;
        SKY_STATE.shadeOn = true;
      }
      if (!watch.live(tk, 2)) return;
      const step = clampN(dt, 0, 0.05);
      const p = tk.player;
      if (ghostA !== null && time >= swingAt) { swingFrom = shadeA; swingTo = ghostA; swingUntil = time + 500; ghostA = null; tk.sfx('gust'); }
      if (time < swingUntil) {
        const k = 1 - (swingUntil - time) / 500;
        shadeA = swingFrom + wrap(swingTo - swingFrom) * k;
      } else if (time > holdUntil && ghostA === null) {
        const want = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        const d = wrap(want - shadeA);
        shadeA += Math.sign(d) * Math.min(Math.abs(d), 0.75 * step);
      }
      SKY_STATE.shadeA = shadeA;
      if (!alivePlayer(tk)) return;
      const cool = inShade(p.x, p.y) || SKY_STATE.cool.some((c) => dist(p.x, p.y, c.x, c.y) < c.r);
      heat = clampN(heat + step * (cool ? -0.9 : 1 / FILL_S), 0, 1);
      if (heat >= 1) {
        heat = 0.3;
        strokeAt = time;
        tk.hitPlayer(14, p.x, p.y);
        float(tk, p.x, p.y - 50, 'SUNSTROKE', '#ffb060');
        tk.sfx('sizzle');
      }
    },
    drawGround(g, time) {
      if (!watch.live(tk, 2)) return;
      const bx = tk.bossX, by = tk.bossY;
      // The whiteout: everything but his shadow.
      fanExcept(g, bx, by, [{ a: shadeA, half: HALF }], GLARE, 0.26 + Math.sin(time / 300) * 0.03);
      // The shade itself, cool and blue.
      g.fillStyle(COOL, 0.22); g.slice(bx, by, 1400, shadeA - HALF, shadeA + HALF, false); g.fillPath();
      g.lineStyle(3, 0x9ab0e8, 0.7);
      g.lineBetween(bx, by, bx + Math.cos(shadeA - HALF) * 1400, by + Math.sin(shadeA - HALF) * 1400);
      g.lineBetween(bx, by, bx + Math.cos(shadeA + HALF) * 1400, by + Math.sin(shadeA + HALF) * 1400);
      // Where it is about to swing to.
      if (ghostA !== null && Math.floor(time / 130) % 2 === 0) {
        g.lineStyle(2, 0xc8d8ff, 0.8);
        g.lineBetween(bx, by, bx + Math.cos(ghostA - HALF) * 1400, by + Math.sin(ghostA - HALF) * 1400);
        g.lineBetween(bx, by, bx + Math.cos(ghostA + HALF) * 1400, by + Math.sin(ghostA + HALF) * 1400);
        g.fillStyle(COOL, 0.1); g.slice(bx, by, 1400, ghostA - HALF, ghostA + HALF, false); g.fillPath();
      }
    },
    drawAir(g, time) {
      if (!watch.live(tk, 2) || !alivePlayer(tk)) return;
      const p = tk.player;
      // The heat on you: a ring that fills and reddens, blinking near sunstroke.
      const c = mixC(0xffe08a, 0xff3a1a, heat);
      if (heat > 0.02) {
        g.lineStyle(4, 0x000000, 0.35); g.strokeCircle(p.x, p.y - 4, 30);
        g.lineStyle(4, c, heat > 0.75 && Math.floor(time / 110) % 2 === 0 ? 0.4 : 0.95);
        g.beginPath(); g.arc(p.x, p.y - 4, 30, -Math.PI / 2, -Math.PI / 2 + heat * TAU, false); g.strokePath();
        if (heat > 0.5) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 500) + i / 3) % 1;
            g.lineStyle(1.5, c, 0.6 * (1 - ph));
            const x = p.x - 10 + i * 10;
            g.lineBetween(x + Math.sin(ph * 8) * 3, p.y - 30 - ph * 24, x + Math.sin(ph * 8 + 1) * 3, p.y - 38 - ph * 24);
          }
        }
      }
      if (time - strokeAt < 400) { g.fillStyle(0xffffff, 0.4 * (1 - (time - strokeAt) / 400)); g.fillCircle(p.x, p.y - 4, 44); }
    },
    onPhaseEnd() { watch.end(); SKY_STATE.shadeOn = false; ghostA = null; heat = 0; },
  };
};

// ── III. Prominence ──────────────────────────────────────────────────
// Loops of the sun he wears tear off and arc out across the Crown, each landing where it is
// marked: the first on you, the rest round about. A landing splashes plasma.

const prominence = (tk: BossToolkit): SignatureMove => {
  interface Arc { sx: number; sy: number; x: number; y: number; born: number; at: number; done: boolean; lift: number }
  let arcs: Arc[] = [];
  const R = 60;
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'PROMINENCE',
    cast(time) {
      const p = tk.player;
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * TAU, d = i === 0 ? 0 : 90 + Math.random() * 90;
        const x = tk.clampX(p.x + Math.cos(a) * d, 40), y = tk.clampY(p.y + Math.sin(a) * d, 40);
        arcs.push({ sx: tk.bossX, sy: tk.bossY - 40, x, y, born: time, at: time + tk.warn(1000) + i * 230, done: false, lift: 140 + Math.random() * 80 });
      }
      tk.sfx('flame-burst');
    },
    update(time) {
      for (const a of arcs) {
        if (a.done || time < a.at) continue;
        a.done = true;
        tk.explode(a.x, a.y, R, 14, SUN_HOT);
        tk.sfx('explosion-small');
      }
      arcs = arcs.filter((a) => time < a.at + 500);
    },
    drawGround(g, time) {
      for (const a of arcs) {
        if (a.done) continue;
        const k = clampN((time - a.born) / Math.max(1, a.at - a.born), 0, 1);
        g.fillStyle(SUN_HOT, 0.1 + 0.25 * k); g.fillCircle(a.x, a.y, R * k);
        g.lineStyle(2, SUN_DEEP, 0.8); g.strokeCircle(a.x, a.y, R);
      }
    },
    drawAir(g, time) {
      for (const a of arcs) {
        const k = a.done ? 1 : clampN((time - a.born) / Math.max(1, a.at - a.born), 0, 1);
        const fade = a.done ? 1 - (time - a.at) / 500 : 1;
        // The loop of plasma: a quadratic arc, drawn up to the head.
        const cx = (a.sx + a.x) / 2, cy = Math.min(a.sy, a.y) - a.lift;
        const pt = (u: number): Pt => ({ x: (1 - u) * (1 - u) * a.sx + 2 * (1 - u) * u * cx + u * u * a.x, y: (1 - u) * (1 - u) * a.sy + 2 * (1 - u) * u * cy + u * u * a.y });
        g.lineStyle(10, SUN_DEEP, 0.3 * fade);
        g.beginPath();
        for (let i = 0; i <= 20; i++) { const q = pt((i / 20) * k); if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
        g.strokePath();
        g.lineStyle(4, SUN, 0.85 * fade);
        g.beginPath();
        for (let i = 0; i <= 20; i++) { const q = pt((i / 20) * k); if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
        g.strokePath();
        if (!a.done) { const h = pt(k); g.fillStyle(0xffffff, 1); g.fillCircle(h.x, h.y, 7); g.fillStyle(SUN_HOT, 0.5); g.fillCircle(h.x, h.y, 13); }
      }
    },
    onPhaseEnd() { arcs = []; },
  };
};

// ── III. Coronal Mass ────────────────────────────────────────────────
// Three rings of fire burst off him one after another. Their only gap is his shadow.

const coronalMass = (tk: BossToolkit): SignatureMove => {
  let gap = 0, until = 0;
  return {
    durationMs: 2400,
    windupMs: 1000,
    gesture: 'slam',
    tell: 'CORONAL MASS',
    locksBody: true,
    cast(time) {
      gap = SKY_STATE.shadeOn ? SKY_STATE.shadeA : Math.atan2(tk.player.y - tk.bossY, tk.player.x - tk.bossX);
      for (let i = 0; i < 3; i++) {
        tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: i * 650, speed: 290, gapCentre: gap, gapHalf: 0.5, band: 16, damage: 14 });
      }
      until = time + 2400;
      tk.sfx('explosion-medium');
    },
    drawGround(g, time) {
      if (time >= until) return;
      // The gap, pointed out along the floor.
      const bx = tk.bossX, by = tk.bossY;
      g.lineStyle(2, 0xc8d8ff, 0.6);
      for (let r = 60; r < 900; r += 40) {
        g.beginPath(); g.arc(bx, by, r, gap - 0.5, gap + 0.5, false); g.strokePath();
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── III. Sunspots ────────────────────────────────────────────────────
// Dark spots open on the floor: cold umbrae, cool to stand in (they quench the heat as well as
// his shade does). Then each one caves in on itself — be out before its rim closes.

const sunspots = (tk: BossToolkit): SignatureMove => {
  interface Spot { x: number; y: number; r: number; born: number; at: number; done: boolean }
  let spots: Spot[] = [];
  const LIFE = 3800;
  SKY_STATE.cool = [];
  return {
    durationMs: 1800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'SUNSPOTS',
    cast(time) {
      const p = tk.player;
      for (let i = 0; i < 4; i++) {
        for (let tries = 0; tries < 12; tries++) {
          const a = Math.random() * TAU, d = 120 + Math.random() * 220;
          const x = tk.clampX(p.x + Math.cos(a) * d, 60), y = tk.clampY(p.y + Math.sin(a) * d, 60);
          if (dist(x, y, tk.bossX, tk.bossY) < 150 || spots.some((s) => dist(s.x, s.y, x, y) < 140)) continue;
          spots.push({ x, y, r: 52, born: time, at: time + tk.warn(LIFE), done: false });
          break;
        }
      }
      tk.sfx('hush');
    },
    update(time) {
      const p = tk.player;
      for (const s of spots) {
        if (s.done || time < s.at) continue;
        s.done = true;
        tk.boom(s.x, s.y, s.r, VIOLET);
        tk.sfx('gravity-slam');
        if (alivePlayer(tk) && dist(p.x, p.y, s.x, s.y) < s.r + 8) {
          tk.hitPlayer(12, p.x, p.y);
          float(tk, p.x, p.y - 44, 'CAVED IN', '#c8b8ff');
        }
      }
      spots = spots.filter((s) => time < s.at + 300);
      SKY_STATE.cool = spots.filter((s) => !s.done).map((s) => ({ x: s.x, y: s.y, r: s.r }));
    },
    drawGround(g, time) {
      for (const s of spots) {
        if (s.done) continue;
        const k = clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        // Penumbra: a ragged ring closing in; umbra: a cold dark core.
        g.fillStyle(VIOLET, 0.35); g.fillCircle(s.x, s.y, s.r + 30 * (1 - k));
        g.fillStyle(0x0a0a1a, 0.65); g.fillCircle(s.x, s.y, s.r * 0.8);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU + time / 2000;
          g.lineStyle(2, 0x6a5aa8, 0.7);
          g.lineBetween(s.x + Math.cos(a) * s.r * 0.8, s.y + Math.sin(a) * s.r * 0.8, s.x + Math.cos(a) * (s.r + 30 * (1 - k)), s.y + Math.sin(a) * (s.r + 30 * (1 - k)));
        }
        g.lineStyle(2, k > 0.8 && Math.floor(time / 90) % 2 === 0 ? 0xffffff : 0x9a8ae8, 0.9); g.strokeCircle(s.x, s.y, s.r);
      }
    },
    onPhaseEnd() { spots = []; SKY_STATE.cool = []; },
  };
};

// ── IV. Sunset: embers of the fallen sun ─────────────────────────────
// This signature also carries the Sunset itself: on the phase's first frame the chain breaks and
// the sun falls, and from then on the light drains out of the Crown — noon, dusk, night — and
// his strength with it (he takes more as it darkens). Its cast: two great embers of the fallen
// sun roll across the floor, one each way, along lanes traced in the dusk.

const embers = (tk: BossToolkit): SignatureMove => {
  const watch = new PhaseWatch();
  const FALL_MS = 2600;
  const DUSK_MS = 46000;
  const R = 44;
  const SPEED = 560;
  interface Orb { ax: number; ay: number; bx: number; by: number; born: number; at: number; hit: boolean }
  let t0 = 0;
  let orbs: Orb[] = [];
  const rng = mulberry(91);
  const stars = Array.from({ length: 60 }, () => ({ x: rng() * 960, y: FT + rng() * 544, s: 0.6 + rng() * 1.6, ph: rng() * TAU }));
  SKY_STATE.light = 1;

  const lane = (vertical: boolean, time: number, delay: number): Orb => {
    const p = tk.player;
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (vertical) return { ax: p.x, ay: dir > 0 ? FT - 60 : tk.H + 60, bx: p.x, by: dir > 0 ? tk.H + 60 : FT - 60, born: time, at: time + delay, hit: false };
    return { ax: dir > 0 ? -60 : tk.W + 60, ay: p.y, bx: dir > 0 ? tk.W + 60 : -60, by: p.y, born: time, at: time + delay, hit: false };
  };
  const posOf = (o: Orb, time: number): Pt | null => {
    if (time < o.at) return null;
    const len = dist(o.ax, o.ay, o.bx, o.by);
    const f = ((time - o.at) / 1000) * SPEED / len;
    if (f > 1) return null;
    return { x: o.ax + (o.bx - o.ax) * f, y: o.ay + (o.by - o.ay) * f };
  };

  return {
    durationMs: 2800,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'EMBERS OF THE SUN',
    cast(time) {
      const v = Math.random() < 0.5;
      orbs.push(lane(v, time, tk.warn(1200)));
      tk.schedule(700, () => { orbs.push(lane(!v, tk.now, tk.warn(1200))); });
      tk.sfx('meteor');
    },
    update(time) {
      if (watch.began(tk) && tk.phase === 3) {
        t0 = time;
        tk.sfx('chain');
        tk.scene.cameras.main.shake(700, 0.01);
        tk.schedule(1600, () => { tk.sfx('explosion-large'); tk.scene.cameras.main.shake(500, 0.012); });
        float(tk, tk.W / 2, FT + 60, 'THE CHAIN BREAKS', '#ffd27a');
      }
      if (watch.live(tk, 3)) SKY_STATE.light = clampN(1 - (time - t0 - FALL_MS) / DUSK_MS, 0, 1);
      const p = tk.player;
      for (const o of orbs) {
        const q = posOf(o, time);
        if (!q || o.hit || !alivePlayer(tk)) continue;
        if (dist(p.x, p.y, q.x, q.y) < R + 16) {
          o.hit = true;
          tk.hitPlayer(18 * power(tk), p.x, p.y);
          float(tk, p.x, p.y - 46, 'EMBER', '#ffb060');
        }
      }
      orbs = orbs.filter((o) => time < o.at + (dist(o.ax, o.ay, o.bx, o.by) / SPEED) * 1000 + 600);
    },
    takenMult() { return watch.live(tk, 3) ? 1 + 0.35 * (1 - SKY_STATE.light) : 1; },
    drawGround(g, time) {
      if (!watch.live(tk, 3)) return;
      const L = SKY_STATE.light;
      // The sky going over: gold, then rose, then violet, then night, laid over the floor.
      const c = L > 0.5 ? mixC(0xffa040, DUSK, (1 - L) * 2) : mixC(DUSK, NIGHT, (0.5 - L) * 2);
      g.fillStyle(c, 0.1 + 0.62 * (1 - L)); g.fillRect(0, FT, tk.W, tk.H - FT);
      // In the glass of the floor, the first stars anyone here has seen in twenty-two years.
      if (L < 0.6) {
        const k = (0.6 - L) / 0.6;
        for (const s of stars) {
          g.fillStyle(STAR, k * (0.4 + 0.6 * Math.abs(Math.sin(time / 700 + s.ph))));
          g.fillCircle(s.x, s.y, s.s);
        }
      }
    },
    drawAir(g, time) {
      // The fall: the chain snaps, the sun drops out of the zenith and down through the floor.
      if (watch.live(tk, 3) && time - t0 < FALL_MS) {
        const k = (time - t0) / FALL_MS;
        const y = FT - 20 + k * k * (tk.H + 200);
        sunDisc(g, tk.W / 2 + k * 80, y, 64 - k * 10, time, 1 - k * 0.3);
        for (let i = 0; i < 8; i++) {
          const a = i * 0.8 + k * 6;
          chainLink(g, tk.W / 2 + Math.cos(a) * k * 300, FT + 20 + i * 14 + k * k * 400, a, 12, IRON_LIT);
        }
      }
      // The broken chain, swinging from the zenith for the rest of the phase.
      if (watch.live(tk, 3) && time - t0 >= 600) {
        const sw = Math.sin(time / 700) * 0.25;
        for (let i = 0; i < 5; i++) chainLink(g, tk.W / 2 + Math.sin(sw) * i * 16, FT + 8 + i * 16, Math.PI / 2 + sw, 10, IRON_LIT);
      }
      for (const o of orbs) {
        const q = posOf(o, time);
        if (time < o.at) {
          const k = clampN((time - o.born) / Math.max(1, o.at - o.born), 0, 1);
          g.lineStyle(R * 2, SUN_DEEP, 0.08 + 0.12 * k); g.lineBetween(o.ax, o.ay, o.bx, o.by);
          g.lineStyle(2, SUN_HOT, 0.5 + 0.4 * k); g.lineBetween(o.ax, o.ay, o.bx, o.by);
          continue;
        }
        if (!q) continue;
        // The ember's trail of glowing cinders behind it.
        const ux = (o.bx - o.ax) / dist(o.ax, o.ay, o.bx, o.by), uy = (o.by - o.ay) / dist(o.ax, o.ay, o.bx, o.by);
        for (let i = 1; i < 10; i++) {
          g.fillStyle(i % 2 ? SUN_HOT : SUN_DEEP, 0.7 - i * 0.06); g.fillCircle(q.x - ux * i * 22 + Math.sin(time / 50 + i) * 5, q.y - uy * i * 22, R * (0.6 - i * 0.05));
        }
        sunDisc(g, q.x, q.y, R * 0.8, time, 1, SUN_DEEP);
      }
    },
    onPhaseEnd() { watch.end(); orbs = []; },
  };
};

// ── IV. Long Shadows ─────────────────────────────────────────────────
// The sun lies on the horizon now, at one side of the Crown, and every mirror-frame throws a long
// shadow straight across the floor. Then the low sun rakes the room: everything lit is burned.
// Stand in a shadow — one always falls near you.

const longShadows = (tk: BossToolkit): SignatureMove => {
  const BAND = 64;
  let bands: number[] = [];
  let side = 1;
  let born = 0, at = 0, fired = 0;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'LONG SHADOWS',
    cast(time) {
      side = -side;
      const p = tk.player;
      const span = tk.H - FT - 80;
      bands = [0, 1, 2, 3].map((i) => FT + 40 + (i + 0.5) * (span / 4) + (Math.random() - 0.5) * 30);
      let ni = 0;
      bands.forEach((y, i) => { if (Math.abs(y - p.y) < Math.abs(bands[ni] - p.y)) ni = i; });
      if (Math.abs(bands[ni] - p.y) > 90) bands[ni] = clampN(p.y + (bands[ni] > p.y ? 60 : -60), FT + 40, tk.H - 40);
      born = time; at = time + tk.warn(1700); fired = 0;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!at || fired || time < at) return;
      fired = time;
      const p = tk.player;
      tk.sfx('inferno');
      if (alivePlayer(tk) && !bands.some((y) => Math.abs(p.y - y) < BAND / 2 - 6)) {
        tk.hitPlayer(16 * power(tk), p.x, p.y);
        float(tk, p.x, p.y - 46, 'RAKED BY THE LOW SUN', '#ffb060');
      }
    },
    drawAir(g, time) {
      if (!at || (fired && time > fired + 450)) return;
      const k = fired ? 1 : clampN((time - born) / Math.max(1, at - born), 0, 1);
      const sx = side > 0 ? tk.W + 30 : -30, sy = (FT + tk.H) / 2;
      // The sun on the horizon.
      sunDisc(g, sx, sy, 70, time, 0.9, SUN_DEEP);
      const sorted = [...bands].sort((a, b) => a - b);
      // Lit floor between the shadows, reddening as it builds.
      let y0 = FT;
      const lit0 = fired ? 0.55 * (1 - (time - fired) / 450) : 0.06 + 0.24 * k;
      for (const y of sorted) {
        g.fillStyle(SUN_DEEP, lit0); g.fillRect(0, y0, tk.W, Math.max(0, y - BAND / 2 - y0));
        y0 = y + BAND / 2;
      }
      g.fillStyle(SUN_DEEP, lit0); g.fillRect(0, y0, tk.W, tk.H - y0);
      // Horizontal rays streaming off the sun.
      for (let i = 0; i < 12; i++) {
        const y = FT + ((i * 47 + time * 0.05) % (tk.H - FT));
        g.lineStyle(1, SUN, 0.3 * k); g.lineBetween(sx, y, sx - side * tk.W, y);
      }
      if (fired) return;
      // The shadows: long and violet, with the mirror-frame that throws each one at the sun's end.
      for (const y of sorted) {
        g.fillStyle(VIOLET, 0.35); g.fillRect(0, y - BAND / 2, tk.W, BAND);
        g.lineStyle(2, 0x8a7ac8, 0.8); g.lineBetween(0, y - BAND / 2, tk.W, y - BAND / 2); g.lineBetween(0, y + BAND / 2, tk.W, y + BAND / 2);
        const fx = side > 0 ? tk.W - 26 : 26;
        g.fillStyle(GOLD_DARK, 1); g.fillRect(fx - 8, y - BAND / 2 - 6, 16, BAND + 12);
        g.fillStyle(MIRROR_DARK, 1); g.fillRect(fx - 5, y - BAND / 2 - 3, 10, BAND + 6);
      }
    },
    onPhaseEnd() { at = 0; bands = []; },
  };
};

// ── IV. Out of the Night ─────────────────────────────────────────────
// His eyes open at the edge of the dark — gold, one pair, then another, then another — and each
// pair streaks through where you were standing when it opened. Move off the line it traces.

const outOfTheNight = (tk: BossToolkit): SignatureMove => {
  interface Streak { ox: number; oy: number; ex: number; ey: number; open: number; at: number; done: boolean }
  let streaks: Streak[] = [];
  const HALF = 22;
  const edgePoint = (): Pt => {
    const s = Math.floor(Math.random() * 3);
    if (s === 0) return { x: 30, y: FT + 60 + Math.random() * (tk.H - FT - 120) };
    if (s === 1) return { x: tk.W - 30, y: FT + 60 + Math.random() * (tk.H - FT - 120) };
    return { x: 80 + Math.random() * (tk.W - 160), y: tk.H - 30 };
  };
  return {
    durationMs: 3000,
    windupMs: 600,
    gesture: 'recoil',
    tell: 'OUT OF THE NIGHT',
    cast(time) {
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 520, () => {
          const o = edgePoint(), p = tk.player;
          const a = Math.atan2(p.y - o.y, p.x - o.x);
          streaks.push({ ox: o.x, oy: o.y, ex: o.x + Math.cos(a) * 1300, ey: o.y + Math.sin(a) * 1300, open: tk.now, at: tk.now + tk.warn(950), done: false });
          tk.sfx('blink');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const s of streaks) {
        if (s.done || time < s.at) continue;
        s.done = true;
        tk.sfx('slash');
        if (alivePlayer(tk) && segDist(p.x, p.y, s.ox, s.oy, s.ex, s.ey) < HALF + 18) {
          tk.hitPlayer(16 * power(tk), p.x, p.y);
          float(tk, p.x, p.y - 46, 'FROM THE DARK', '#ffd27a');
        }
      }
      streaks = streaks.filter((s) => time < s.at + 450);
    },
    drawAir(g, time) {
      for (const s of streaks) {
        if (!s.done) {
          const k = clampN((time - s.open) / Math.max(1, s.at - s.open), 0, 1);
          // A pair of gold eyes in the dark.
          const blink = Math.abs(Math.sin(time / 260)) > 0.08 ? 1 : 0.2;
          glow(g, s.ox, s.oy, 26, GOLD_LIT, 0.08, 3);
          g.fillStyle(GOLD_LIT, blink); g.fillEllipse(s.ox - 7, s.oy, 8, 4); g.fillEllipse(s.ox + 7, s.oy, 8, 4);
          g.fillStyle(0xffffff, blink); g.fillCircle(s.ox - 7, s.oy, 1.4); g.fillCircle(s.ox + 7, s.oy, 1.4);
          // The line he will take, drawn out of them as a thread of light.
          const len = 1300 * k;
          const a = Math.atan2(s.ey - s.oy, s.ex - s.ox);
          g.lineStyle(2, GOLD_LIT, 0.35 + 0.5 * k); g.lineBetween(s.ox, s.oy, s.ox + Math.cos(a) * len, s.oy + Math.sin(a) * len);
          g.lineStyle(HALF * 2, GOLD, 0.06 + 0.08 * k); g.lineBetween(s.ox, s.oy, s.ex, s.ey);
          continue;
        }
        const k = (time - s.at) / 450;
        g.lineStyle(HALF * 2, A_LIT, 0.7 * (1 - k)); g.lineBetween(s.ox, s.oy, s.ex, s.ey);
        g.lineStyle(4, 0xffffff, 1 - k); g.lineBetween(s.ox, s.oy, s.ex, s.ey);
        // Afterimages of him strung along the streak.
        for (let i = 1; i <= 4; i++) {
          const f = i / 5;
          const x = s.ox + (s.ex - s.ox) * f * 0.6, y = s.oy + (s.ey - s.oy) * f * 0.6;
          g.fillStyle(A_MAIN, 0.4 * (1 - k)); g.fillCircle(x, y, 20);
          sunburst(g, x, y - 30, 12, GOLD, 0.4 * (1 - k));
        }
      }
    },
    onPhaseEnd() { streaks = []; },
  };
};

// ── IV. The Last Light ───────────────────────────────────────────────
// He gathers what light is left in his hands and lets it go as slow, seeking motes. The darker it
// is, the fewer he can find — but they are the only bright things in the room.

const lastLight = (tk: BossToolkit): SignatureMove => {
  let gatherUntil = 0;
  return {
    durationMs: 1800,
    windupMs: 900,
    gesture: 'clap',
    tell: 'THE LAST LIGHT',
    cast(time) {
      const n = tk.phase === 3 ? 4 + Math.round(SKY_STATE.light * 4) : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30, angle: a, speed: 145,
          damage: Math.max(1, Math.round(9 * power(tk))), r: 8, turn: 1.5, lifeMs: 5200, color: SUN,
        });
      }
      gatherUntil = time + 600;
      tk.sfx('sparkle');
    },
    drawAir(g, time) {
      if (time >= gatherUntil) return;
      const k = 1 - (gatherUntil - time) / 600;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + time / 300;
        const r = 160 * (1 - k);
        g.fillStyle(SUN, 0.8); g.fillCircle(tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r, 2.5);
      }
      glow(g, tk.bossX, tk.bossY, 30 + k * 30, SUN, 0.1, 4);
    },
    onPhaseEnd() { gatherUntil = 0; },
  };
};

// ── V. Second Sun: Double Noon ───────────────────────────────────────
// This signature also carries the Second Sun: from the phase's first frame two suns wheel round
// the Crown, opposite each other. Its cast: with a sun on each side his body throws two shadows,
// pointing away from each other — and then both suns blaze at once. Only his two shadows are safe.

const doubleNoon = (tk: BossToolkit): SignatureMove => {
  const watch = new PhaseWatch();
  const HALF = 0.36;
  let base = 0;
  let born = 0, at = 0, fired = 0;
  let ox = 0, oy = 0, a1 = 0;
  SKY_STATE.suns = [];
  const sunsAt = (time: number): Pt[] => {
    const th = base + time / 9000;
    const cx = tk.W / 2, cy = (FT + tk.H) / 2;
    return [
      { x: cx + Math.cos(th) * 520, y: cy + Math.sin(th) * 330 },
      { x: cx - Math.cos(th) * 520, y: cy - Math.sin(th) * 330 },
    ];
  };
  const inShadows = (x: number, y: number): boolean => {
    const d = dist(x, y, ox, oy);
    if (d < 30) return true;
    const a = Math.atan2(y - oy, x - ox);
    const pad = Math.atan2(14, Math.max(30, d));
    return Math.abs(wrap(a - a1)) < HALF + pad || Math.abs(wrap(a - a1 - Math.PI)) < HALF + pad;
  };
  return {
    durationMs: 2700,
    windupMs: 500,
    gesture: 'flex',
    tell: 'DOUBLE NOON',
    locksBody: true,
    cast(time) {
      const s = SKY_STATE.suns.length ? SKY_STATE.suns : sunsAt(time);
      ox = tk.bossX; oy = tk.bossY;
      a1 = Math.atan2(oy - s[0].y, ox - s[0].x);
      born = time; at = time + tk.warn(1800); fired = 0;
      tk.sfx('holy-chord');
    },
    update(time) {
      if (watch.began(tk) && tk.phase === 4) {
        base = Math.atan2(tk.player.y - (FT + tk.H) / 2, tk.player.x - tk.W / 2);
        float(tk, tk.W / 2, FT + 60, 'A SECOND SUN RISES', '#fff8d8');
        tk.sfx('boss-phase');
      }
      if (watch.live(tk, 4)) SKY_STATE.suns = sunsAt(time);
      if (!at || fired || time < at) return;
      fired = time;
      tk.sfx('explosion-large');
      const p = tk.player;
      if (alivePlayer(tk) && !inShadows(p.x, p.y)) {
        tk.hitPlayer(18, p.x, p.y);
        float(tk, p.x, p.y - 46, 'DOUBLE NOON', '#ffffff');
      }
    },
    drawGround(g, time) {
      if (!at || (fired && time > fired + 450)) return;
      const k = fired ? 1 : clampN((time - born) / Math.max(1, at - born), 0, 1);
      const a = fired ? 0.6 * (1 - (time - fired) / 450) : 0.05 + 0.3 * k;
      fanExcept(g, ox, oy, [{ a: a1, half: HALF }, { a: a1 + Math.PI, half: HALF }], fired ? 0xffffff : GLARE, a);
      if (fired) return;
      for (const c of [a1, a1 + Math.PI]) {
        g.fillStyle(COOL, 0.2); g.slice(ox, oy, 1400, c - HALF, c + HALF, false); g.fillPath();
        g.lineStyle(2, 0xa8b8f0, 0.8);
        g.lineBetween(ox, oy, ox + Math.cos(c - HALF) * 1400, oy + Math.sin(c - HALF) * 1400);
        g.lineBetween(ox, oy, ox + Math.cos(c + HALF) * 1400, oy + Math.sin(c + HALF) * 1400);
      }
    },
    drawAir(g, time) {
      if (!watch.live(tk, 4)) return;
      const s = SKY_STATE.suns;
      if (s.length < 2) return;
      sunDisc(g, s[0].x, s[0].y, 44, time, 0.95);
      sunDisc(g, s[1].x, s[1].y, 44, time + 777, 0.95, 0xffd8f0);
      // Their light crossing the Crown: two faint washes from either side.
      g.lineStyle(1, 0xffffff, 0.12);
      for (let i = -4; i <= 4; i++) {
        g.lineBetween(s[0].x, s[0].y, tk.W / 2 + i * 90, (FT + tk.H) / 2 + i * 30);
        g.lineBetween(s[1].x, s[1].y, tk.W / 2 - i * 90, (FT + tk.H) / 2 - i * 30);
      }
    },
    onPhaseEnd() { watch.end(); at = 0; SKY_STATE.suns = []; },
  };
};

// ── V. Crossfire ─────────────────────────────────────────────────────
// Each sun lays a beam across the Crown and swings it through where you stand — one, then the
// other from the opposite side, so the way out of the first is the way into the second.

const crossfire = (tk: BossToolkit): SignatureMove => {
  let flares: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'point',
    tell: 'CROSSFIRE',
    cast(time) {
      const suns = SKY_STATE.suns.length > 1 ? SKY_STATE.suns : [{ x: -40, y: FT + 40 }, { x: tk.W + 40, y: tk.H - 40 }];
      const p = tk.player;
      suns.slice(0, 2).forEach((s, i) => {
        const a = Math.atan2(p.y - s.y, p.x - s.x);
        const dir = i === 0 ? 1 : -1;
        tk.spawnSweep({ ox: s.x, oy: s.y, a0: a - 0.38 * dir, a1: a + 0.38 * dir, warnMs: 1100 + i * 600, travelMs: 800, halfW: 20, damage: 14 });
        flares.push({ x: s.x, y: s.y, at: time + tk.warn(1100 + i * 600) });
      });
      tk.sfx('beam-charge');
    },
    update(time) { flares = flares.filter((f) => time < f.at + 900); },
    drawAir(g, time) {
      for (const f of flares) {
        const k = time < f.at ? 1 - (f.at - time) / 1100 : 1;
        glow(g, clampN(f.x, 10, tk.W - 10), clampN(f.y, FT + 10, tk.H - 10), 40 + k * 40, SUN, 0.1, 4);
      }
    },
    onPhaseEnd() { flares = []; },
  };
};

// ── Body ─────────────────────────────────────────────────────────────

/**
 * Auriel: a tall robed figure in white and gold, a mantle of small mirrors on his shoulders and a
 * crown of mirror-rays that throws the light back at whoever looks. Each phase dresses him:
 * a shaft pinning him to the zenith (Noonday), a hand-mirror (Heliostat), the sun on his brow
 * (Corona), a cracked crown trailing broken chain (Sunset), two small suns wheeling round him
 * (Second Sun).
 */
function drawAuriel(g: Gfx, s: BossBodyState): void {
  const r = s.radius, t = s.t, ph = s.phaseIdx;
  const x = s.x, y = s.y;
  // Gold sash across the robe, the seal at its knot.
  g.lineStyle(r * 0.22, GOLD_DARK, 0.9); g.lineBetween(x - r * 0.7, y - r * 0.5, x + r * 0.55, y + r * 0.6);
  g.lineStyle(r * 0.14, GOLD, 1); g.lineBetween(x - r * 0.7, y - r * 0.52, x + r * 0.55, y + r * 0.58);
  sunburst(g, x - r * 0.08, y + r * 0.02, r * 0.26, GOLD_LIT, 1, t / 3000);
  // The mantle of mirrors.
  for (let i = -3; i <= 3; i++) {
    const mx = x + i * r * 0.3, my = y - r * 0.62 + Math.abs(i) * r * 0.1;
    g.fillStyle(GOLD_DARK, 1); g.fillRect(mx - r * 0.12, my - r * 0.14, r * 0.24, r * 0.28);
    g.fillStyle(MIRROR, 1); g.fillRect(mx - r * 0.09, my - r * 0.11, r * 0.18, r * 0.22);
    const gl = (Math.sin(t / 400 + i) + 1) / 2;
    g.fillStyle(0xffffff, 0.3 + gl * 0.6); g.fillRect(mx - r * 0.06, my - r * 0.1, r * 0.05, r * 0.2);
  }
  // The crown of mirror-rays.
  const hy = y - r * 1.02;
  const cracked = ph === 3;
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 11);
    const len = r * (cracked && i % 3 === 1 ? 0.55 : 0.95) * (i % 2 ? 0.8 : 1);
    const bx = x + Math.cos(a) * r * 0.42, by = hy + Math.sin(a) * r * 0.42;
    const ex = x + Math.cos(a) * len, ey = hy + Math.sin(a) * len;
    g.fillStyle(GOLD_DARK, 1);
    g.fillTriangle(bx + Math.cos(a + 1.57) * 4, by + Math.sin(a + 1.57) * 4, bx - Math.cos(a + 1.57) * 4, by - Math.sin(a + 1.57) * 4, ex, ey);
    g.fillStyle(i % 2 ? GOLD : MIRROR, 1);
    g.fillTriangle(bx + Math.cos(a + 1.57) * 2.5, by + Math.sin(a + 1.57) * 2.5, bx - Math.cos(a + 1.57) * 2.5, by - Math.sin(a + 1.57) * 2.5, ex, ey);
    if (!cracked || i % 3 !== 1) { g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(t / 200 + i)); g.fillCircle(ex, ey, 1.8); }
  }
  g.lineStyle(3, GOLD, 1); g.beginPath(); g.arc(x, hy, r * 0.42, Math.PI, 0, false); g.strokePath();

  if (ph === 0) {
    // Pinned to the zenith: a shaft from the top of the Crown down onto his crown.
    g.fillStyle(SUN, 0.12); g.fillRect(x - r * 0.4, FT, r * 0.8, Math.max(0, hy - FT));
    g.fillStyle(0xffffff, 0.25); g.fillRect(x - 3, FT, 6, Math.max(0, hy - FT));
  } else if (ph === 1) {
    // A hand-mirror, flashing as he casts.
    const h = s.hands[1] ?? { x: x + r, y };
    g.lineStyle(4, GOLD_DARK, 1); g.lineBetween(h.x, h.y, h.x + 6, h.y + 14);
    g.fillStyle(GOLD, 1); g.fillEllipse(h.x - 2, h.y - 8, 20, 24);
    g.fillStyle(MIRROR, 1); g.fillEllipse(h.x - 2, h.y - 8, 15, 19);
    g.fillStyle(0xffffff, 0.4 + s.castGlow * 0.6); g.fillEllipse(h.x - 5, h.y - 11, 5, 9);
    if (s.castGlow > 0.3) glow(g, h.x - 2, h.y - 8, 20 + s.castGlow * 30, 0xffffff, 0.1, 3);
  } else if (ph === 2) {
    // The sun, worn on his brow.
    sunDisc(g, x, hy - r * 0.2, r * 0.62, t, 0.95);
  } else if (ph === 3) {
    // A length of the broken chain hanging off the crown.
    const sw = Math.sin(t / 600) * 0.3;
    for (let i = 0; i < 4; i++) chainLink(g, x + r * 0.5 + Math.sin(sw) * i * 9, hy + i * 10, Math.PI / 2 + sw, 6, IRON_LIT);
  } else if (ph === 4) {
    for (let i = 0; i < 2; i++) {
      const a = t / 900 + i * Math.PI;
      sunDisc(g, x + Math.cos(a) * r * 1.7, y - r * 0.3 + Math.sin(a) * r * 0.9, r * 0.22, t + i * 500, 0.95, i ? 0xffd8f0 : SUN_HOT);
    }
  }
  if (s.hurt) { g.fillStyle(0xffffff, 0.25); g.fillCircle(x, y, r); }
}

/** What shows through the dark: in the Sunset, as the light goes, he is the only thing that glows. */
function drawAurielLit(g: Gfx, s: BossBodyState): void {
  if (s.phaseIdx !== 3) return;
  const dark = 1 - SKY_STATE.light;
  if (dark <= 0.05) return;
  const r = s.radius;
  glow(g, s.x, s.y, r * (1.6 + dark), SUN, 0.05 + dark * 0.07, 5);
  // The eyes, gold in the dark.
  g.fillStyle(GOLD_LIT, 0.5 + dark * 0.5);
  g.fillEllipse(s.x - r * 0.22, s.y - r * 0.2, r * 0.2, r * 0.09);
  g.fillEllipse(s.x + r * 0.22, s.y - r * 0.2, r * 0.2, r * 0.09);
  // The crown's rays still catching a light from nowhere.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 11);
    g.fillStyle(0xffffff, dark * (0.4 + 0.4 * Math.sin(s.t / 250 + i)));
    g.fillCircle(s.x + Math.cos(a) * r * 0.9, s.y - r * 1.02 + Math.sin(a) * r * 0.9, 1.8);
  }
}

/**
 * The Crown of Mirrors: a floor of gold and white wedges fanning from the foot of the pinned
 * sun's chain; concentric gilt rings like the face of a dial whose hand never moves; the great
 * mirrors of the Heliostat round the rim, tilted in; and behind a gilt rail at the back, the Clears
 * he keeps here to watch, so that someone always sees.
 */
function drawCrown(g: Gfx, W: number, H: number): void {
  const cx = W / 2, cy = FT;
  g.fillStyle(MARBLE, 1); g.fillRect(0, FT, W, H - FT);
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * Math.PI, a1 = ((i + 1) / 40) * Math.PI;
    g.fillStyle(i % 2 ? GOLD : MARBLE, i % 2 ? 0.6 : 1);
    g.fillTriangle(cx, cy, cx + Math.cos(a0) * 1200, cy + Math.sin(a0) * 1200, cx + Math.cos(a1) * 1200, cy + Math.sin(a1) * 1200);
  }
  for (let k = 1; k <= 7; k++) {
    g.lineStyle(4, GOLD_DARK, 0.45); g.strokeCircle(cx, cy, k * 82);
    g.lineStyle(1.5, GOLD_LIT, 0.7); g.strokeCircle(cx, cy, k * 82 - 4);
  }
  // Veins of grey in the white.
  const rng = mulberry(4242);
  for (let i = 0; i < 18; i++) {
    let vx = rng() * W, vy = FT + rng() * (H - FT);
    g.lineStyle(1, MARBLE_SHADE, 0.6); g.beginPath(); g.moveTo(vx, vy);
    for (let k = 0; k < 6; k++) { vx += (rng() - 0.5) * 50; vy += 12 + rng() * 10; g.lineTo(vx, vy); }
    g.strokePath();
  }
  // The seal at the dial's heart.
  const sy = (FT + H) / 2 + 40;
  g.fillStyle(GOLD_DARK, 0.5); g.fillCircle(cx, sy, 92);
  sunburst(g, cx, sy, 86, GOLD, 0.9);
  // The back wall: a gilt rail, the watching Clears behind it.
  g.fillStyle(0x1a1a24, 1); g.fillRect(0, FT, W, 30);
  for (let i = 0; i < 22; i++) clearFigure(g, 30 + i * 43 + rng() * 10, FT + 30, 0.6, i * 300, 0.35);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(0, FT + 28, W, 6);
  g.fillStyle(GOLD, 1); g.fillRect(0, FT + 28, W, 3);
  for (let x = 6; x < W; x += 16) { g.fillStyle(GOLD, 1); g.fillRect(x, FT + 14, 3, 16); }
  // Great mirrors round the rim, tilted in toward the floor.
  for (const [mx, my, tilt] of [[44, 230, 0.6], [44, 470, 0.6], [W - 44, 230, -0.6], [W - 44, 470, -0.6], [180, H - 10, 0.3], [W - 180, H - 10, -0.3]] as [number, number, number][]) {
    standingMirror(g, mx, my, 50, 80, tilt, 0);
  }
  // The chain's foot: the great collar where the Sun Chain comes down to the Crown.
  g.fillStyle(IRON, 1); g.fillRect(cx - 34, FT, 68, 22);
  g.fillStyle(BRASS, 1); g.fillRect(cx - 30, FT + 4, 60, 12);
  g.fillStyle(BRASS_DARK, 1); for (let i = 0; i < 5; i++) g.fillCircle(cx - 24 + i * 12, FT + 10, 2.4);
  // The noon glare that has lain on this floor for twenty-two years.
  for (let i = 0; i < 4; i++) { g.fillStyle(0xffffff, 0.05); g.fillCircle(cx, (FT + H) / 2, 200 + i * 80); }
}

// ── Def ──────────────────────────────────────────────────────────────

export const AURIEL_BOSS: WorldBossDef = {
  worldId: 'isle:auriel',
  name: 'Despot Auriel',
  title: 'of the Endless Noon',
  color: A_MAIN,
  colorLit: A_LIT,
  colorDark: A_DARK,
  accent: SUN_HOT,
  damageMult: 1.65,

  intro: [
    'Stand still. Let me look at you. ...There. Now I can see everything you are.',
    'Six of my Radiances put out. Three of my keepers. My mirrors, turned by a stranger\'s hand.',
    'You came up here out of the dark, I suppose. Everyone does. Nobody goes back to it.',
  ],
  banter: [
    'Darkness is where lies live. I did not abolish night. I abolished lying.',
    'A shadow is a hiding place. What have you to hide? Show me.',
    'Twenty-two years of noon and not one crime done in shade. Not one. Do you know what that costs?',
    'The Clears are not punished. They are only finished. Nothing is left in them to see through.',
    'Lumen thought light was beautiful. Light is not beautiful. Light is correct.',
    'Every child on Solmara has grown up seen. Every one of them. Safe.',
    'You squint. Everyone squints. You get used to it. You get used to everything.',
    'Hold still. The sun does.',
  ],
  defeatLine: 'THE SUN GOES DOWN ON SOLMARA',
  resumeLine: 'Back in the light. Of course you are. There is nowhere else to be.',

  phases: [
    {
      name: 'Noonday',
      line: 'It is noon. It has been noon for twenty-two years. Nothing casts a shadow here — not even you.',
      hp: 670,
      cycle: ['sig:shafts', 'volley', 'sig:gnomon', 'radial', 'sig:clarity', 'lanes', 'sig:shafts', 'sig:gnomon', 'sanctuary', 'sig:clarity'],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1050,
      harassMs: 3100,
    },
    {
      name: 'Heliostat',
      line: 'Raise the mirrors. Let us see how the light likes you from every side.',
      hp: 720,
      cycle: ['sig:heliostat', 'sig:heliograph', 'spiral', 'sig:caustics', 'sig:heliostat', 'homing', 'sig:heliograph', 'sig:caustics', 'barrage', 'sig:heliostat'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 980,
      harassMs: 2900,
    },
    {
      name: 'Corona',
      line: 'Very well. I will hold it myself. Come into my shadow, if you can find it. It is the only one left.',
      hp: 770,
      cycle: ['sig:corona', 'sig:prominence', 'sig:cme', 'volley', 'sig:sunspots', 'sig:corona', 'radial', 'sig:prominence', 'sig:sunspots', 'sig:cme'],
      harass: ['h-flak', 'h-lane'],
      restMs: 940,
      harassMs: 2900,
    },
    {
      name: 'Sunset',
      line: 'No. No — the chain — hold it. HOLD IT. ...It is going down. Do you see? It is going down.',
      hp: 820,
      cycle: ['sig:embers', 'sig:shadows', 'homing', 'sig:night', 'sig:lastlight', 'sig:embers', 'volley', 'sig:shadows', 'sig:night', 'sig:lastlight'],
      harass: ['h-orbs', 'h-snipe'],
      restMs: 900,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'TWO SUNS, AND NO SHADE UNDER EITHER',
    extraPhase: {
      name: 'Second Sun',
      line: 'Then I will hang another. Twice the light. Half the shadow. Nowhere — nowhere — to hide.',
      hp: 600,
      cycle: ['sig:doublenoon', 'sig:crossfire', 'sig:shafts', 'radial', 'sig:gnomon', 'sig:doublenoon', 'sig:heliograph', 'spiral', 'sig:crossfire', 'sig:shafts'],
      harass: ['h-rune', 'h-lane'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 20 },
    lanes: { halfW: 30 },
  },

  signatures: {
    shafts: hammers,
    gnomon,
    clarity,
    heliostat,
    heliograph,
    caustics: causticNet,
    corona,
    prominence,
    cme: coronalMass,
    sunspots,
    embers,
    shadows: longShadows,
    night: outOfTheNight,
    lastlight: lastLight,
    doublenoon: doubleNoon,
    crossfire,
  },

  look: { crest: 'halo', pattern: 'facets', aura: 'sparks', hands: 'orb', torsoR: 44, mouth: 'line', eyes: 2, eyeColor: 0xfff8d8 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none', tint: 'gold' },
    { movement: 'orbit', gimmick: 'none', look: { pattern: 'grid', hands: 'ball' } },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { pattern: 'swirl', aura: 'flame', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'none', tint: 'blood', look: { pattern: 'cracks', aura: 'smoke', hands: 'wisp', eyes: 2 } },
    { movement: 'orbit', gimmick: 'none', tint: 'pale', look: { pattern: 'rings', aura: 'sparks', eyes: 3, crest: 'spires' } },
  ],

  drawDecor: drawAuriel,
  drawLit: drawAurielLit,
  drawArena: drawCrown,
};
