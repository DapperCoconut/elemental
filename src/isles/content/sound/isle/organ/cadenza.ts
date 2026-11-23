import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  CANDLE, EBONY, GHOST, GILT, GILT_DARK, GILT_LIT, IVORY, OAK, OAK_DARK, OAK_LIT, RIBBON, ROSE_BLUE, ROSE_GOLD,
  ROSE_RED, SILVER, SILVER_DARK, SILVER_DEEP, SILVER_LIT, VIOLET, WAX_RED,
  cadenzaSigil, candle, fermata, ghostMouth, manual, noteHead, organPipe, segno, staveLines, stopKnob, trebleClef,
} from './art';

/**
 * Maestro Cadenza, Conductor of the Score — Choirholm's monarch, at the Console of the Great Organ.
 *
 * He says an isle is a choir and a choir needs a conductor. The fight is his Score in four
 * movements, and on hard a repeat sign that takes it from the top while he plays on:
 *
 *   I   Overture   — on the podium. His baton beats time in the air, and the beat comes down on
 *                    the floor: the pattern in two (a march — each downbeat bursts), in three (a
 *                    waltz — each beat throws a ring of notes), in four (common time — the bar
 *                    stays struck and its beats fall a moment after). Every shape glows first, its
 *                    beats marked, then the baton's tip runs along it.
 *   II  Fugue      — he walks round you, and every idea he states is answered. A subject of five
 *                    notes, then the same five from a clef on another wall a bar later, then a
 *                    third; a canon that follows his own footsteps a beat behind; a stretto where
 *                    the entries crowd in from all four walls.
 *   III Crescendo  — dynamics are written over the arena, pp to ff, and everything grows with
 *                    them: the hairpin opens wider and blasts down its length; orbiting notes fly
 *                    out faster each wave; fff — three rings. Then the General Pause: in the
 *                    silence, whoever moves is struck. Then pp again.
 *   IV  Requiem    — he plays the Organ. Eight sealed pipes ring the arena, each with a voice in
 *       of Voices    it: they fire columns at you, weep homing voices, and play tutti down their
 *                    own lines. Strike a pipe to cut its ribbon: the freed voice turns and sings
 *                    AT him, and while it sings his defences are down.
 *   V   Da Capo    — (hard) the D.C. sign glows on the score above him and the Overture is laid
 *       (hard)       over whatever he is playing now.
 *
 * Every attack is telegraphed and every signature is his own.
 */

// ── Palette ──────────────────────────────────────────────────────────

const C_MAIN = 0x5a4a8a;
const C_LIT = 0xf4ecd0;
const C_DARK = 0x14101e;
const BATON = 0xfaf6ea;
const FT = 96;
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
type Gfx = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

/** An italic dynamic letter — f or p — in the engraver's style, `x,y` its baseline centre. */
function dynLetter(g: Gfx, ch: 'f' | 'p', x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(3 * s, color, a);
  if (ch === 'f') {
    g.beginPath(); g.moveTo(x - 5 * s, y + 8 * s); g.lineTo(x + 2 * s, y - 14 * s);
    g.arc(x + 6 * s, y - 14 * s, 4 * s, Math.PI, Math.PI * 1.8, false); g.strokePath();
    g.lineBetween(x - 4 * s, y - 4 * s, x + 6 * s, y - 4 * s);
  } else {
    g.lineBetween(x - 2 * s, y - 6 * s, x - 7 * s, y + 10 * s);
    g.strokeEllipse(x + 1 * s, y - 2 * s, 9 * s, 8 * s);
  }
}

// ── Shared fight state (one per toolkit) ─────────────────────────────

interface OrganPipe {
  x: number; y: number;          // the pipe's foot
  axis: 'v' | 'h';               // the line it plays tutti down
  state: 'sealed' | 'singing' | 'open';
  until: number;
  target: StrikeTarget | null;
  lit: number;                   // when it last began a warning glow
}
interface Shared { dyn: number; crescActive: boolean; pipes: OrganPipe[]; /** The General Pause is on: nothing else may strike. */ silent: boolean }
const SHARED = new WeakMap<BossToolkit, Shared>();
const shared = (tk: BossToolkit): Shared => {
  let s = SHARED.get(tk);
  if (!s) { s = { dyn: 0, crescActive: false, pipes: [], silent: false }; SHARED.set(tk, s); }
  return s;
};

const SING_MS = 4500;
const OPEN_MS = 5000;

/** The Organ's eight sealed pipes round the arena — spawned on the first Requiem cast. */
function ensurePipes(tk: BossToolkit): OrganPipe[] {
  const st = shared(tk);
  if (st.pipes.length) return st.pipes;
  const spots: { x: number; y: number; axis: 'v' | 'h' }[] = [
    { x: 150, y: FT + 100, axis: 'v' }, { x: 370, y: FT + 100, axis: 'v' }, { x: 590, y: FT + 100, axis: 'v' }, { x: 810, y: FT + 100, axis: 'v' },
    { x: 36, y: 300, axis: 'h' }, { x: tk.W - 36, y: 470, axis: 'h' },
    { x: 260, y: tk.H - 14, axis: 'v' }, { x: 700, y: tk.H - 14, axis: 'v' },
  ];
  st.pipes = spots.map((s) => {
    const p: OrganPipe = { ...s, state: 'sealed', until: 0, target: null, lit: 0 };
    p.target = tk.spawnTarget({
      x: s.x, y: s.y - 26, r: 26,
      onStruck: (by) => {
        if (by !== 'player' || p.state !== 'sealed') return;
        p.state = 'singing';
        p.until = tk.now + SING_MS;
        float(tk, p.x, p.y - 80, 'THE VOICE TURNS ON HIM', '#d8f0ff');
        tk.sfx('holy-chord');
      },
    });
    return p;
  });
  return st.pipes;
}
function clearPipes(tk: BossToolkit): void {
  const st = shared(tk);
  for (const p of st.pipes) p.target?.remove();
  st.pipes = [];
}
const mouthOf = (p: OrganPipe): P => ({ x: p.x, y: p.y - 30 });

// ── The conducting patterns (Overture, and Da Capo) ──────────────────

type Beat = 2 | 3 | 4;
/** Each pattern in unit space (y down), with the beats (ictus points) the baton strikes. */
const PATTERNS: Record<Beat, { pts: P[]; ictus: P[] }> = {
  2: {
    pts: [{ x: -0.1, y: -1 }, { x: 0, y: 0.9 }, { x: 0.6, y: 0.1 }, { x: 0.32, y: 0.62 }, { x: -0.1, y: -0.9 }],
    ictus: [{ x: 0, y: 0.9 }, { x: 0.32, y: 0.62 }],
  },
  3: {
    pts: [{ x: 0, y: -1 }, { x: 0, y: 0.9 }, { x: 0.95, y: 0.45 }, { x: 0.05, y: -0.95 }],
    ictus: [{ x: 0, y: 0.9 }, { x: 0.95, y: 0.45 }, { x: 0.05, y: -0.95 }],
  },
  4: {
    pts: [{ x: 0, y: -1 }, { x: 0, y: 0.9 }, { x: -0.85, y: 0.4 }, { x: 0.95, y: 0.45 }, { x: 0.05, y: -0.95 }],
    ictus: [{ x: 0, y: 0.9 }, { x: -0.85, y: 0.4 }, { x: 0.95, y: 0.45 }, { x: 0.05, y: -0.95 }],
  },
};
/** Chaikin-smooth a polyline twice, keeping its ends — the baton never moves in straight lines. */
function smooth(pts: P[]): P[] {
  let cur = pts;
  for (let it = 0; it < 3; it++) {
    const out: P[] = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i], b = cur[i + 1];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    out.push(cur[cur.length - 1]);
    cur = out;
  }
  return cur;
}

interface Trace {
  beat: Beat;
  pts: P[]; cum: number[]; total: number;
  ictus: { x: number; y: number; d: number; done: boolean }[];
  born: number; strikeAt: number; speed: number; hit: boolean; lingerUntil: number;
  color: number;
}

/**
 * The baton's strokes on the floor. A trace glows (its beats ringed and numbered by dots), then
 * the baton's tip runs it; the 150px behind the tip burns. Each beat it passes does the pattern's
 * own thing. Owned per signature so a Da Capo can lay a pattern over another move.
 */
class Tracer {
  traces: Trace[] = [];
  constructor(private tk: BossToolkit) {}

  lay(beat: Beat, cx: number, cy: number, scale: number, flip: boolean, warnMs: number, color: number): void {
    const tk = this.tk;
    const pat = PATTERNS[beat];
    const tx = (p: P): P => ({ x: tk.clampX(cx + (flip ? -p.x : p.x) * scale, 30), y: clampN(cy + p.y * scale, FT + 20, tk.H - 24) });
    const pts = smooth(pat.pts.map(tx));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i].x, pts[i].y, pts[i - 1].x, pts[i - 1].y));
    const ictus = pat.ictus.map(tx).map((q) => {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < pts.length; i++) { const d = dist(q.x, q.y, pts[i].x, pts[i].y); if (d < bd) { bd = d; bi = i; } }
      return { x: pts[bi].x, y: pts[bi].y, d: cum[bi], done: false };
    });
    const now = tk.now;
    this.traces.push({ beat, pts, cum, total: cum[cum.length - 1], ictus, born: now, strikeAt: now + tk.warn(warnMs), speed: 820, hit: false, lingerUntil: 0, color });
    tk.sfx('beam-charge');
  }

  private at(t: Trace, d: number): P {
    d = clampN(d, 0, t.total);
    let i = 1;
    while (i < t.cum.length - 1 && t.cum[i] < d) i++;
    const a = t.pts[i - 1], b = t.pts[i];
    const seg = Math.max(0.001, t.cum[i] - t.cum[i - 1]);
    const k = clampN((d - t.cum[i - 1]) / seg, 0, 1);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  /** Is the player within reach of the path between distances d0 and d1? */
  private touches(t: Trace, d0: number, d1: number, reach: number): boolean {
    const p = this.tk.player;
    for (let i = 1; i < t.pts.length; i++) {
      if (t.cum[i] < d0 || t.cum[i - 1] > d1) continue;
      if (segDist(p.x, p.y, t.pts[i - 1].x, t.pts[i - 1].y, t.pts[i].x, t.pts[i].y) < reach) return true;
    }
    return false;
  }

  update(time: number): void {
    const tk = this.tk;
    const p = tk.player;
    for (const t of this.traces) {
      if (time < t.strikeAt) continue;
      const tip = ((time - t.strikeAt) / 1000) * t.speed;
      if (!t.hit && p.active && this.touches(t, tip - 150, tip, 22 + PLAYER_R)) {
        t.hit = true;
        tk.hitPlayer(16, p.x, p.y);
        float(tk, p.x, p.y - 44, 'ON THE BEAT', '#ffe8a0');
      }
      for (const ic of t.ictus) {
        if (ic.done || tip < ic.d) continue;
        ic.done = true;
        if (t.beat === 2) {
          tk.explode(ic.x, ic.y, 58, 14, GILT);
          tk.sfx('drum-hit');
        } else if (t.beat === 3) {
          const off = Math.random() * Math.PI;
          for (let k = 0; k < 6; k++) tk.spawnBullet({ x: ic.x, y: ic.y, angle: off + (k / 6) * Math.PI * 2, speed: 170, damage: 10, r: 7, color: GILT_LIT, lifeMs: 3200 });
          tk.sfx('crystal-chime');
        } else {
          tk.spawnZone({ x: ic.x, y: ic.y, radius: 52, warnMs: 600, damage: 12 });
          tk.sfx('clock-tick');
        }
      }
      if (t.beat === 4 && tip >= t.total && !t.lingerUntil) t.lingerUntil = time + 900;
      if (t.lingerUntil && time < t.lingerUntil && !t.hit && p.active && this.touches(t, 0, t.total, 16 + PLAYER_R)) {
        t.hit = true;
        tk.hitPlayer(12, p.x, p.y);
        float(tk, p.x, p.y - 44, 'THE BAR LINE', '#ffe8a0');
      }
    }
    this.traces = this.traces.filter((t) => {
      if (time < t.strikeAt) return true;
      const tip = ((time - t.strikeAt) / 1000) * t.speed;
      if (t.beat === 4) return !t.lingerUntil || time < t.lingerUntil + 200;
      return tip < t.total + 300;
    });
  }

  draw(g: Gfx, time: number): void {
    for (const t of this.traces) {
      const warn = time < t.strikeAt;
      const k = warn ? clampN((time - t.born) / Math.max(1, t.strikeAt - t.born), 0, 1) : 1;
      const tip = warn ? 0 : ((time - t.strikeAt) / 1000) * t.speed;
      // The whole shape, glowing in as he traces it in the air.
      g.lineStyle(14, t.color, (warn ? 0.06 + k * 0.1 : 0.06));
      this.stroke(g, t, 0, warn ? t.total * Math.min(1, k * 1.6) : t.total);
      g.lineStyle(2.5, lit(t.color, 0.4), warn ? 0.3 + k * 0.5 : 0.25);
      this.stroke(g, t, 0, warn ? t.total * Math.min(1, k * 1.6) : t.total);
      if (warn && k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.5); this.stroke(g, t, 0, t.total); }
      // The beats, ringed, with their count as dots.
      t.ictus.forEach((ic, i) => {
        if (ic.done) return;
        const r = t.beat === 2 ? 58 : t.beat === 3 ? 24 : 52;
        g.lineStyle(2, t.color, 0.3 + k * 0.5); g.strokeCircle(ic.x, ic.y, r);
        for (let d = 0; d <= i; d++) { g.fillStyle(GILT_LIT, 0.6 + k * 0.4); g.fillCircle(ic.x - i * 5 + d * 10, ic.y, 3.2); }
      });
      if (!warn) {
        // The struck part burns, fading behind the tip; the tip is a white star.
        g.lineStyle(18, CANDLE, 0.25); this.stroke(g, t, tip - 150, tip);
        g.lineStyle(6, GILT_LIT, 0.95); this.stroke(g, t, tip - 150, tip);
        if (t.lingerUntil && time < t.lingerUntil) { g.lineStyle(8, GILT, 0.5 + Math.sin(time / 50) * 0.2); this.stroke(g, t, 0, t.total); }
        if (tip < t.total) {
          const q = this.at(t, tip);
          g.fillStyle(0xffffff, 1); g.fillCircle(q.x, q.y, 6);
          for (let s = 0; s < 4; s++) {
            const a = time / 80 + (s * Math.PI) / 2;
            g.lineStyle(2, 0xffffff, 0.8); g.lineBetween(q.x, q.y, q.x + Math.cos(a) * 13, q.y + Math.sin(a) * 13);
          }
        }
      }
    }
  }

  private stroke(g: Gfx, t: Trace, d0: number, d1: number): void {
    d0 = Math.max(0, d0); d1 = Math.min(t.total, d1);
    if (d1 <= d0) return;
    g.beginPath();
    const a = this.at(t, d0);
    g.moveTo(a.x, a.y);
    for (let i = 1; i < t.pts.length; i++) {
      if (t.cum[i] <= d0) continue;
      if (t.cum[i] >= d1) break;
      g.lineTo(t.pts[i].x, t.pts[i].y);
    }
    const b = this.at(t, d1);
    g.lineTo(b.x, b.y);
    g.strokePath();
  }

  clear(): void { this.traces = []; }
}

/** I. A conducting pattern in `beat`, laid over the player (alternately mirrored). */
const conduct = (beat: Beat, name: string) => (tk: BossToolkit): SignatureMove => {
  const tracer = new Tracer(tk);
  let flip = false;
  return {
    durationMs: beat === 4 ? 2900 : 2500,
    windupMs: 700,
    gesture: 'raise',
    hold: 'conduct',
    tell: name,
    cast() {
      flip = !flip;
      const p = tk.player;
      tracer.lay(beat, p.x + (Math.random() - 0.5) * 60, p.y - 10, beat === 2 ? 150 : 175, flip, 1300, beat === 2 ? 0xffc870 : beat === 3 ? 0xd8b0ff : 0x9ad8ff);
      if (beat === 2 && tk.hard) tk.schedule(900, () => tracer.lay(2, tk.player.x, tk.player.y, 130, !flip, 1100, 0xffc870));
    },
    update(time) { tracer.update(time); },
    drawGround(g, time) { tracer.draw(g, time); },
    onPhaseEnd() { tracer.clear(); },
  };
};

// ── II. Fugue ────────────────────────────────────────────────────────

/** The subject's shape: five notes, each a small turn off the aim, each its own speed. */
const MOTIF: { da: number; v: number }[] = [
  { da: -0.14, v: 250 }, { da: 0, v: 275 }, { da: 0.12, v: 250 }, { da: -0.05, v: 295 }, { da: 0.16, v: 262 },
];
const NOTE_COL = [0xffe0a0, 0xd8b0ff, 0x9ad8ff];

/**
 * The Subject: he states five notes at you; a bar later a clef glows on another wall and the
 * answer comes from there — the same five; a bar after, a third voice from a third wall.
 */
const subject = (tk: BossToolkit): SignatureMove => {
  interface Entry { x: number; y: number; born: number; fireAt: number; voice: number; fired: boolean }
  let entries: Entry[] = [];
  const BAR = 1500;
  const play = (x: number, y: number, voice: number) => {
    const a0 = Math.atan2(tk.player.y - y, tk.player.x - x);
    MOTIF.forEach((m, i) => tk.schedule(i * 115, () => {
      tk.spawnBullet({ x, y, angle: a0 + m.da, speed: m.v, damage: 11, r: 7, color: NOTE_COL[voice], lifeMs: 4200 });
    }));
    tk.sfx('crystal-chime');
  };
  const wallPoint = (side: number): P => {
    const p = tk.player;
    if (side === 0) return { x: 30, y: clampN(p.y + (Math.random() - 0.5) * 200, FT + 40, tk.H - 40) };
    if (side === 1) return { x: tk.W - 30, y: clampN(p.y + (Math.random() - 0.5) * 200, FT + 40, tk.H - 40) };
    if (side === 2) return { x: clampN(p.x + (Math.random() - 0.5) * 260, 60, tk.W - 60), y: FT + 24 };
    return { x: clampN(p.x + (Math.random() - 0.5) * 260, 60, tk.W - 60), y: tk.H - 26 };
  };
  return {
    durationMs: 2400,
    windupMs: 650,
    gesture: 'point',
    hold: 'conduct',
    tell: 'THE SUBJECT',
    cast(time) {
      play(tk.bossX, tk.bossY, 0);
      const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (let v = 1; v <= 2; v++) {
        const q = wallPoint(sides[v - 1]);
        entries.push({ x: q.x, y: q.y, born: time + (v - 1) * BAR, fireAt: time + v * BAR + tk.warn(300), voice: v, fired: false });
      }
    },
    update(time) {
      for (const e of entries) if (!e.fired && time >= e.fireAt) { e.fired = true; play(e.x, e.y, e.voice); }
      entries = entries.filter((e) => time < e.fireAt + 800);
    },
    drawAir(g, time) {
      for (const e of entries) {
        if (time < e.born) continue;
        const k = clampN((time - e.born) / Math.max(1, e.fireAt - e.born), 0, 1);
        const a = e.fired ? 1 - (time - e.fireAt) / 800 : 0.35 + k * 0.65;
        // A clef and a scrap of stave on the wall: this voice enters here.
        g.fillStyle(0x0a0810, 0.6 * a); g.fillCircle(e.x, e.y, 30);
        g.lineStyle(2, NOTE_COL[e.voice], 0.8 * a); g.strokeCircle(e.x, e.y, 22 + (1 - k) * 18);
        staveLines(g, e.x - 26, e.y - 12, 52, 6, NOTE_COL[e.voice], 0.5 * a, 1);
        trebleClef(g, e.x - 4, e.y + 2, 0.6, NOTE_COL[e.voice], a, 2);
        if (!e.fired && k > 0.7 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.6); g.strokeCircle(e.x, e.y, 32); }
        if (!e.fired) {
          // A dotted aim line toward you, as the answer is about to come.
          const pa = Math.atan2(tk.player.y - e.y, tk.player.x - e.x);
          for (let d = 40; d < 40 + k * 220; d += 18) { g.fillStyle(NOTE_COL[e.voice], 0.5 * a); g.fillCircle(e.x + Math.cos(pa) * d, e.y + Math.sin(pa) * d, 2); }
        }
      }
    },
    onPhaseEnd() { entries = []; },
  };
};

/**
 * The Canon: as he walks he lays a note at every step, and a beat behind him the canon follows —
 * each note bursts 1.7s after it was laid, in the order he laid them. Do not walk in his steps.
 */
const canon = (tk: BossToolkit): SignatureMove => {
  interface Mark { x: number; y: number; laid: number; goAt: number; done: boolean; i: number }
  let marks: Mark[] = [];
  let layUntil = 0;
  let nextLay = 0;
  let count = 0;
  return {
    durationMs: 2700,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'CANON',
    cast(time) { layUntil = time + 2500; nextLay = time; count = 0; tk.sfx('clock-tick'); },
    update(time) {
      if (time < layUntil && time >= nextLay) {
        nextLay = time + 150;
        marks.push({ x: tk.bossX, y: tk.bossY + 10, laid: time, goAt: time + tk.warn(1700), done: false, i: count++ });
      }
      for (const m of marks) {
        if (m.done || time < m.goAt) continue;
        m.done = true;
        tk.explode(m.x, m.y, 42, 13, 0xd8b0ff);
        if (m.i % 3 === 0) tk.sfx('drum-hit');
      }
      marks = marks.filter((m) => time < m.goAt + 300);
    },
    drawGround(g, time) {
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (m.done) continue;
        const k = clampN((time - m.laid) / Math.max(1, m.goAt - m.laid), 0, 1);
        // The steps joined by a ghost of stave, each a note-head in a closing ring.
        if (i > 0 && !marks[i - 1].done) { g.lineStyle(1.5, 0xd8b0ff, 0.25); g.lineBetween(marks[i - 1].x, marks[i - 1].y, m.x, m.y); }
        g.fillStyle(0xd8b0ff, 0.08 + k * 0.12); g.fillCircle(m.x, m.y, 42);
        g.lineStyle(2, 0xd8b0ff, 0.4 + k * 0.5); g.strokeCircle(m.x, m.y, 42 * (1 - k * 0.6) + 8);
        noteHead(g, m.x, m.y, 1.1, k > 0.8 ? 0xffffff : 0xd8b0ff, 0.9, m.i % 2 ? 1 : -1);
      }
    },
    onPhaseEnd() { marks = []; layUntil = 0; },
  };
};

/**
 * Stretto: the entries crowd in. Four clefs light on the four walls, one after another, and each
 * sends its line straight across the room through where you stand when it enters.
 */
const stretto = (tk: BossToolkit): SignatureMove => {
  interface Entry { side: number; x: number; y: number; born: number; until: number }
  let entries: Entry[] = [];
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'clap',
    hold: 'conduct',
    tell: 'STRETTO',
    cast() {
      const order = [0, 2, 1, 3].sort(() => Math.random() - 0.5);
      order.forEach((side, i) => tk.schedule(i * 380, () => {
        const p = tk.player;
        const horiz = side < 2;
        const x = side === 0 ? 24 : side === 1 ? tk.W - 24 : p.x;
        const y = side === 2 ? FT + 20 : side === 3 ? tk.H - 20 : p.y;
        tk.spawnLane({ x: p.x, y: p.y, angle: horiz ? 0 : Math.PI / 2, halfW: 24, warnMs: 1000, damage: 14 });
        entries.push({ side, x, y, born: tk.now, until: tk.now + tk.warn(1000) + 450 });
        tk.sfx('sonic-pulse');
      }));
    },
    update(time) { entries = entries.filter((e) => time < e.until); },
    drawAir(g, time) {
      for (const e of entries) {
        const k = clampN((time - e.born) / Math.max(1, e.until - e.born), 0, 1);
        const c = NOTE_COL[e.side % 3];
        g.fillStyle(0x0a0810, 0.6); g.fillCircle(e.x, e.y, 22);
        trebleClef(g, e.x - 3, e.y + 2, 0.55, c, 1 - k * 0.6, 2);
        g.lineStyle(2, c, 0.8 - k * 0.6); g.strokeCircle(e.x, e.y, 18 + k * 14);
      }
    },
    onPhaseEnd() { entries = []; },
  };
};

// ── III. Crescendo ───────────────────────────────────────────────────

/** Louder: every Crescendo cast pushes the dynamic up; time pushes it too. */
const louder = (tk: BossToolkit, amt: number): number => {
  const st = shared(tk);
  st.crescActive = true;
  st.dyn = clampN(st.dyn + amt, 0, 1);
  return st.dyn;
};

/**
 * The Hairpin: a crescendo sign opens on the floor from him toward you — two lines from a point,
 * widening as it is drawn (wider the louder he is) — then the blast runs down it from the point.
 * Out of the wedge before the wave reaches you. Two, when he is past mf.
 */
const hairpin = (tk: BossToolkit): SignatureMove => {
  interface Pin { ox: number; oy: number; a: number; born: number; fireAt: number; open: number; hit: boolean }
  let pins: Pin[] = [];
  const LEN = 700;
  const WAVE = 1000;
  const lay = () => {
    const d = shared(tk).dyn;
    const now = tk.now;
    pins.push({ ox: tk.bossX, oy: tk.bossY, a: tk.angleToPlayer(), born: now, fireAt: now + tk.warn(1150), open: 0.3 + d * 0.24, hit: false });
    tk.sfx('beam-charge');
  };
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'CRESCENDO',
    cast() {
      const d = louder(tk, 0.16);
      lay();
      if (d > 0.5) tk.schedule(800, lay);
    },
    update(time, dt) {
      const st = shared(tk);
      if (st.silent) { pins = []; return; }
      if (st.crescActive) st.dyn = clampN(st.dyn + dt * 0.022, 0, 1);
      const p = tk.player;
      for (const pin of pins) {
        if (pin.hit || time < pin.fireAt || !p.active) continue;
        const r = ((time - pin.fireAt) / 1000) * WAVE;
        const pd = dist(p.x, p.y, pin.ox, pin.oy);
        const off = Math.abs(wrap(Math.atan2(p.y - pin.oy, p.x - pin.ox) - pin.a));
        if (off < pin.open + Math.atan2(PLAYER_R, Math.max(40, pd)) && Math.abs(pd - r) < 34) {
          pin.hit = true;
          tk.hitPlayer(14 + st.dyn * 8, p.x, p.y);
          float(tk, p.x, p.y - 44, 'FORTE', '#ffb08a');
        }
      }
      pins = pins.filter((pin) => time < pin.fireAt + (LEN / WAVE) * 1000 + 200);
    },
    drawGround(g, time) {
      for (const pin of pins) {
        const warn = time < pin.fireAt;
        const k = warn ? clampN((time - pin.born) / Math.max(1, pin.fireAt - pin.born), 0, 1) : 1;
        const h = pin.open * k;
        g.fillStyle(0xff9a6a, 0.05 + k * 0.1);
        g.slice(pin.ox, pin.oy, LEN, pin.a - h, pin.a + h, false); g.fillPath();
        // The hairpin itself: two engraved strokes from the point.
        g.lineStyle(5, EBONY, 0.7);
        g.lineBetween(pin.ox, pin.oy, pin.ox + Math.cos(pin.a - h) * LEN, pin.oy + Math.sin(pin.a - h) * LEN);
        g.lineBetween(pin.ox, pin.oy, pin.ox + Math.cos(pin.a + h) * LEN, pin.oy + Math.sin(pin.a + h) * LEN);
        g.lineStyle(2.5, 0xffd0a0, 0.6 + k * 0.4);
        g.lineBetween(pin.ox, pin.oy, pin.ox + Math.cos(pin.a - h) * LEN, pin.oy + Math.sin(pin.a - h) * LEN);
        g.lineBetween(pin.ox, pin.oy, pin.ox + Math.cos(pin.a + h) * LEN, pin.oy + Math.sin(pin.a + h) * LEN);
        if (warn && k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.fillStyle(0xffffff, 0.08); g.slice(pin.ox, pin.oy, LEN, pin.a - h, pin.a + h, false); g.fillPath(); }
        if (!warn) {
          const r = ((time - pin.fireAt) / 1000) * WAVE;
          g.lineStyle(18, 0xff8a5a, 0.35); g.beginPath(); g.arc(pin.ox, pin.oy, r, pin.a - h, pin.a + h, false); g.strokePath();
          g.lineStyle(5, 0xfff0d0, 0.9); g.beginPath(); g.arc(pin.ox, pin.oy, r, pin.a - h, pin.a + h, false); g.strokePath();
        }
      }
    },
    drawAir(g) {
      // The dynamics written across the top of the arena: pp ... ff, and where he is now.
      const st = shared(tk);
      if (!st.crescActive) return;
      const x0 = 260, x1 = tk.W - 260, y = FT + 18;
      g.fillStyle(0x0a0810, 0.5); g.fillRoundedRect(x0 - 50, y - 18, x1 - x0 + 100, 36, 10);
      dynLetter(g, 'p', x0 - 34, y + 4, 0.6, IVORY, 0.9); dynLetter(g, 'p', x0 - 24, y + 4, 0.6, IVORY, 0.9);
      dynLetter(g, 'f', x1 + 22, y + 4, 0.6, IVORY, 0.9); dynLetter(g, 'f', x1 + 32, y + 4, 0.6, IVORY, 0.9);
      g.lineStyle(2, IVORY, 0.8); g.lineBetween(x0, y, x1, y - 10); g.lineBetween(x0, y, x1, y + 10);
      const mx = x0 + (x1 - x0) * st.dyn, mh = 10 * st.dyn;
      g.fillStyle(0xff9a6a, 1); g.fillTriangle(mx, y - mh - 8, mx - 6, y - mh - 16, mx + 6, y - mh - 16);
      g.lineStyle(3, 0xff9a6a, 0.9); g.lineBetween(mx, y - mh, mx, y + mh);
    },
    onPhaseEnd() { pins = []; const st = shared(tk); st.crescActive = false; st.dyn = 0; },
  };
};

/**
 * Accelerando: notes gather round him and spin, faster and faster, then fly out in three waves —
 * each wave faster than the last, each set between the last one's notes. More notes, louder.
 */
const accelerando = (tk: BossToolkit): SignatureMove => {
  let orbitUntil = 0;
  let orbitFrom = 0;
  let n = 8;
  let spin = 0;
  let cx = 0, cy = 0;
  return {
    durationMs: 3000,
    windupMs: 500,
    gesture: 'raise',
    hold: 'charge',
    tell: 'ACCELERANDO',
    cast(time) {
      const d = louder(tk, 0.16);
      n = 8 + Math.round(d * 4);
      orbitFrom = time;
      orbitUntil = time + tk.warn(1000);
      cx = tk.bossX; cy = tk.bossY;
      tk.sfx('time-warp');
      [0, 380, 760].forEach((delay, w) => tk.schedule(orbitUntil - time + delay, () => {
        const sp = [150, 205, 270][w] * (1 + shared(tk).dyn * 0.35);
        for (let i = 0; i < n; i++) {
          const a = spin + (i / n) * Math.PI * 2 + (w % 2 ? Math.PI / n : 0);
          tk.spawnBullet({ x: tk.bossX + Math.cos(a) * 60, y: tk.bossY + Math.sin(a) * 60, angle: a, speed: sp, damage: 10, r: 6, color: [0xffe0a0, 0xffb080, 0xff8a6a][w], lifeMs: 4000 });
        }
        tk.sfx('sonic-pulse');
      }));
    },
    update(time, dt) {
      if (time < orbitUntil) {
        const k = (time - orbitFrom) / Math.max(1, orbitUntil - orbitFrom);
        spin += dt * (2 + k * 9);
        cx = tk.bossX; cy = tk.bossY;
      }
    },
    drawAir(g, time) {
      if (time >= orbitUntil) return;
      const k = clampN((time - orbitFrom) / Math.max(1, orbitUntil - orbitFrom), 0, 1);
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * Math.PI * 2;
        const r = 60 - k * 8;
        noteHead(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.1, k > 0.8 ? 0xffffff : 0xffd0a0, 0.6 + k * 0.4, 0);
        g.lineStyle(2, 0xffb080, 0.3 * k); g.beginPath(); g.arc(cx, cy, r, a - 0.4 * k, a, false); g.strokePath();
      }
    },
    onPhaseEnd() { orbitUntil = 0; },
  };
};

/**
 * fff: the climax. "fff" blazes over him, then three rings roll out sharing one gap that drifts a
 * little each ring — get in the gap and stay in it. Faster the louder he is.
 */
const climax = (tk: BossToolkit): SignatureMove => {
  let showUntil = 0;
  let gap = 0;
  return {
    durationMs: 2800,
    windupMs: 700,
    gesture: 'slam',
    tell: 'fff',
    cast(time) {
      const d = louder(tk, 0.22);
      gap = tk.angleToPlayer() + (Math.random() - 0.5) * 1.2;
      const drift = (Math.random() < 0.5 ? -1 : 1) * 0.16;
      for (let i = 0; i < 3; i++) {
        tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: 1100 + i * 460, speed: 320 + d * 80, gapCentre: gap + drift * i, gapHalf: 0.5, band: 18, damage: 15 });
      }
      showUntil = time + 1100 + 2 * 460;
      tk.sfx('boss-phase');
    },
    drawAir(g, time) {
      if (time >= showUntil) return;
      const k = 1 - (showUntil - time) / (1100 + 920);
      const x = tk.bossX, y = tk.bossY - 78;
      const s = 0.9 + Math.sin(time / 60) * 0.08 + k * 0.4;
      for (let i = -1; i <= 1; i++) dynLetter(g, 'f', x + i * 14 * s, y, s, 0xff9a6a, 0.95);
      // Where the gap will open — a pale wedge on the floor.
      g.fillStyle(0xfff0d0, 0.08); g.slice(x, tk.bossY, 600, gap - 0.5, gap + 0.5, false); g.fillPath();
      g.lineStyle(2, 0xfff0d0, 0.35); g.beginPath(); g.arc(x, tk.bossY, 80, gap - 0.5, gap + 0.5, false); g.strokePath();
    },
    onPhaseEnd() { showUntil = 0; },
  };
};

/**
 * The General Pause. "G.P." — a fermata spreads over the whole arena. Then everything stops: the
 * hazards are wiped and the room goes silent. Hold still: whoever moves more than a step in the
 * silence is struck. Then pp, and it all builds again.
 */
const generalPause = (tk: BossToolkit): SignatureMove => {
  let tellAt = 0, silentAt = 0, endAt = 0;
  let ox = 0, oy = 0, lx = 0, ly = 0, moved = 0, struck = false;
  const ALLOW = 40;
  const SILENT_MS = 1600;
  return {
    durationMs: 4400,
    windupMs: 500,
    gesture: 'raise',
    hold: 'conduct',
    locksBody: true,
    tell: 'G.P.',
    cast(time) {
      tellAt = time;
      silentAt = time + tk.warn(1500);
      endAt = silentAt + SILENT_MS;
      struck = false;
      shared(tk).crescActive = true;
      tk.sfx('hush');
    },
    update(time) {
      if (!silentAt) return;
      const p = tk.player;
      if (time >= silentAt && time < endAt) {
        if (ox === 0 && oy === 0) {
          tk.clearHazards();
          shared(tk).silent = true;
          ox = lx = p.x; oy = ly = p.y; moved = 0;
        }
        moved += dist(p.x, p.y, lx, ly);
        lx = p.x; ly = p.y;
        if (!struck && moved > ALLOW && p.active) {
          struck = true;
          tk.explode(p.x, p.y, 40, 22 + shared(tk).dyn * 10, 0xff6a5a);
          float(tk, p.x, p.y - 50, 'YOU MOVED', '#ff8a7a');
          tk.sfx('judgement');
        }
      } else if (time >= endAt) {
        silentAt = 0; ox = 0; oy = 0;
        shared(tk).dyn = 0;
        shared(tk).silent = false;
        float(tk, tk.bossX, tk.bossY - 70, 'pp', '#d8e8ff');
      }
    },
    drawAir(g, time) {
      if (!silentAt) return;
      const p = tk.player;
      if (time < silentAt) {
        const k = clampN((time - tellAt) / Math.max(1, silentAt - tellAt), 0, 1);
        g.fillStyle(0x000000, 0.1 + k * 0.2); g.fillRect(0, FT, tk.W, tk.H - FT);
        fermata(g, tk.W / 2, FT + 70, 1.6 + k * 1.4, IVORY, 0.4 + k * 0.6);
        if (k > 0.7 && Math.floor(time / 100) % 2 === 0) { g.lineStyle(2, IVORY, 0.8); g.strokeCircle(p.x, p.y, 34); }
      } else {
        // The silence: grey, still, the fermata held; a ring round you that shrinks with your allowance.
        g.fillStyle(0x10101a, 0.38); g.fillRect(0, FT, tk.W, tk.H - FT);
        fermata(g, tk.W / 2, FT + 70, 3, IVORY, 0.85);
        const left = clampN(1 - moved / ALLOW, 0, 1);
        g.lineStyle(3, struck ? 0xff6a5a : IVORY, 0.8); g.strokeCircle(ox || p.x, oy || p.y, 14 + left * 26);
        const k = clampN((time - silentAt) / SILENT_MS, 0, 1);
        g.lineStyle(4, IVORY, 0.6); g.beginPath(); g.arc(tk.W / 2, FT + 56, 52, Math.PI, Math.PI + k * Math.PI, false); g.strokePath();
      }
    },
    onPhaseEnd() { silentAt = 0; ox = 0; oy = 0; shared(tk).silent = false; },
  };
};

// ── IV. Requiem of Voices ────────────────────────────────────────────

/**
 * Requiem: three of the sealed pipes open their mouths — a ghostly voice in each — and each sings
 * a column straight through where you stand. Also owns the Organ itself: the pipes, their voices,
 * and his defences while a freed voice sings at him (×1.6, more with more voices).
 */
const requiem = (tk: BossToolkit): SignatureMove => {
  return {
    durationMs: 2500,
    windupMs: 700,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'REQUIEM',
    cast(time) {
      const pipes = ensurePipes(tk);
      const sealed = pipes.filter((p) => p.state === 'sealed').sort(() => Math.random() - 0.5).slice(0, 3);
      if (!sealed.length) {
        // Every voice is out — he sings the columns himself.
        for (let i = 0; i < 2; i++) tk.spawnLane({ x: tk.bossX, y: tk.bossY, angle: tk.angleToPlayer() + (i ? 0.5 : -0.5), halfW: 26, warnMs: 1100, damage: 16 });
        return;
      }
      for (const p of sealed) {
        p.lit = time;
        const m = mouthOf(p);
        tk.spawnLane({ x: m.x, y: m.y, angle: Math.atan2(tk.player.y - m.y, tk.player.x - m.x), halfW: 26, warnMs: 1100, damage: 16 });
      }
      tk.sfx('holy-chord');
    },
    update(time) {
      for (const p of shared(tk).pipes) {
        if (p.state === 'singing' && time >= p.until) { p.state = 'open'; p.until = time + OPEN_MS; }
        else if (p.state === 'open' && time >= p.until) {
          p.state = 'sealed';
          float(tk, p.x, p.y - 80, 'RESEALED', '#ff9a8a');
          tk.sfx('hush');
        }
      }
    },
    takenMult() {
      const n = shared(tk).pipes.filter((p) => p.state === 'singing').length;
      return n === 0 ? 1 : Math.min(2, 1.4 + n * 0.2);
    },
    drawGround(g, time) {
      // Beams of the freed voices singing at him.
      for (const p of shared(tk).pipes) {
        if (p.state !== 'singing') continue;
        const m = mouthOf(p);
        const k = clampN((p.until - time) / SING_MS, 0, 1);
        g.lineStyle(14, GHOST, 0.12 * k); g.lineBetween(m.x, m.y, tk.bossX, tk.bossY);
        g.lineStyle(3, 0xffffff, 0.5 * k); g.lineBetween(m.x, m.y, tk.bossX, tk.bossY);
        for (let i = 0; i < 5; i++) {
          const f = ((time / 700) + i / 5) % 1;
          noteHead(g, m.x + (tk.bossX - m.x) * f, m.y + (tk.bossY - m.y) * f - Math.sin(f * Math.PI) * 20, 1, GHOST, 0.9 * k, 1);
        }
      }
    },
    drawAir(g, time) {
      for (const p of shared(tk).pipes) {
        const vertical = p.axis === 'v';
        const h = vertical ? 92 : 80;
        const warm = p.lit && time - p.lit < 1700 ? 1 - (time - p.lit) / 1700 : 0;
        organPipe(g, p.x, p.y, 30, h, { metal: SILVER, sealed: p.state === 'sealed', glow: Math.max(warm, p.state === 'singing' ? 1 : 0), mouthOpen: warm });
        if (p.state === 'sealed') ghostMouth(g, p.x, p.y - 26, 0.75, 0.15 + warm * 0.8, 0.55 + warm * 0.45);
        else if (p.state === 'singing') {
          ghostMouth(g, p.x, p.y - 26, 0.95, 0.6 + Math.sin(time / 80) * 0.35, 1);
          g.lineStyle(2, RIBBON, 0.9); g.lineBetween(p.x + 12, p.y - 60, p.x + 22, p.y - 30);
        } else {
          // Emptied; he is reaching to reseal it — a ribbon winding back on as the time runs out.
          const k = clampN(1 - (p.until - time) / OPEN_MS, 0, 1);
          g.lineStyle(3, RIBBON, 0.8); g.beginPath(); g.arc(p.x, p.y - 50, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { clearPipes(tk); },
  };
};

/**
 * Lacrimosa: from every sealed pipe a weeping voice drifts out — a pale face that follows you,
 * slowly, turning after you. Outwalk them; they fade after a while.
 */
const lacrimosa = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2200,
  windupMs: 700,
  gesture: 'raise',
  tell: 'LACRIMOSA',
  cast() {
    const pipes = ensurePipes(tk).filter((p) => p.state === 'sealed').sort(() => Math.random() - 0.5).slice(0, 4);
    const from = pipes.length ? pipes.map(mouthOf) : [{ x: tk.bossX, y: tk.bossY }];
    from.forEach((m, i) => tk.schedule(i * 220, () => {
      tk.spawnBullet({ x: m.x, y: m.y, angle: Math.atan2(tk.player.y - m.y, tk.player.x - m.x), speed: 150, damage: 11, r: 10, turn: 1.05, lifeMs: 4800, color: GHOST });
    }));
    for (const p of pipes) p.lit = tk.now;
    tk.sfx('screech');
  },
  onPhaseEnd() { clearPipes(tk); },
});

/**
 * Tutti: every sealed pipe plays at once, each straight down its own line — the top and bottom
 * pipes down their columns, the side pipes across their rows. A freed pipe sits it out.
 */
const tutti = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2600,
  windupMs: 800,
  gesture: 'slam',
  hold: 'brace',
  tell: 'TUTTI',
  cast(time) {
    const pipes = ensurePipes(tk).filter((p) => p.state === 'sealed');
    for (const p of pipes) {
      p.lit = time;
      const m = mouthOf(p);
      tk.spawnLane({ x: m.x, y: m.y, angle: p.axis === 'v' ? Math.PI / 2 : 0, halfW: 30, warnMs: 1400, damage: 17 });
    }
    if (!pipes.length) tk.spawnLane({ x: tk.bossX, y: tk.bossY, angle: tk.angleToPlayer(), halfW: 30, warnMs: 1200, damage: 17 });
    tk.sfx('boss-phase');
  },
  onPhaseEnd() { clearPipes(tk); },
});

// ── V. Da Capo (hard) ────────────────────────────────────────────────

/**
 * Da Capo: the D.C. sign glows on the score over his head, and the Overture is played again —
 * a conducting pattern laid over you while he goes straight on to whatever is next.
 */
const daCapo = (tk: BossToolkit): SignatureMove => {
  const tracer = new Tracer(tk);
  let signUntil = 0;
  let beat: Beat = 2;
  return {
    durationMs: 900,
    windupMs: 600,
    gesture: 'point',
    tell: 'D.C.',
    cast(time) {
      signUntil = time + tk.warn(1300);
      const b = beat;
      beat = (beat === 4 ? 2 : beat + 1) as Beat;
      tracer.lay(b, tk.player.x, tk.player.y - 10, 165, Math.random() < 0.5, 1300, 0xffe070);
      tk.sfx('time-warp');
    },
    update(time) { tracer.update(time); },
    drawGround(g, time) { tracer.draw(g, time); },
    drawAir(g, time) {
      if (time >= signUntil) return;
      const k = clampN(1 - (signUntil - time) / tk.warn(1300), 0, 1);
      const x = tk.bossX, y = tk.bossY - 92;
      g.fillStyle(IVORY, 0.85); g.fillRoundedRect(x - 34, y - 22, 68, 44, 6);
      staveLines(g, x - 30, y - 12, 60, 6, EBONY, 0.5, 1);
      segno(g, x, y, 0.9 + k * 0.2, GILT_DARK, 1);
      g.lineStyle(3, GILT_LIT, 0.5 + Math.sin(time / 70) * 0.4); g.strokeRoundedRect(x - 36, y - 24, 72, 48, 7);
    },
    onPhaseEnd() { tracer.clear(); signUntil = 0; },
  };
};

// ── Body decor ───────────────────────────────────────────────────────

/**
 * The Maestro: white tie and tails — a starched shirt-front and white bow tie on the coat, a
 * long ivory baton in his right hand (its tip catches light as he casts), and over him whatever
 * movement he is in: a metronome for the Overture, a shadow baton for the second voice of the
 * Fugue, the hairpin for Crescendo, the ribbons of the Requiem, and on hard the D.C. sign.
 */
function drawCadenza(g: Gfx, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  // Shirt-front and lapels.
  g.fillStyle(IVORY, 1); g.fillTriangle(s.x - r * 0.34, s.y - r * 0.3, s.x + r * 0.34, s.y - r * 0.3, s.x, s.y + r * 0.62);
  g.fillStyle(C_DARK, 1);
  g.fillTriangle(s.x - r * 0.34, s.y - r * 0.3, s.x - r * 0.12, s.y - r * 0.3, s.x - r * 0.05, s.y + r * 0.4);
  g.fillTriangle(s.x + r * 0.34, s.y - r * 0.3, s.x + r * 0.12, s.y - r * 0.3, s.x + r * 0.05, s.y + r * 0.4);
  for (let i = 0; i < 3; i++) { g.fillStyle(GILT, 1); g.fillCircle(s.x, s.y - r * 0.05 + i * r * 0.17, 1.8); }
  // The white bow tie.
  const by = s.y - r * 0.28;
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(s.x, by, s.x - 11, by - 6, s.x - 11, by + 6);
  g.fillTriangle(s.x, by, s.x + 11, by - 6, s.x + 11, by + 6);
  g.fillStyle(0xd8d4c8, 1); g.fillCircle(s.x, by, 2.6);
  // The baton.
  const h = s.hands[0] ?? { x: s.x + r, y: s.y };
  const a = s.facing - 0.5 + Math.sin(t / 260) * 0.25 * (1 - s.castGlow) - s.castGlow * 0.6;
  const tipX = h.x + Math.cos(a) * 52, tipY = h.y + Math.sin(a) * 52;
  g.fillStyle(0x8a6a3a, 1); g.fillCircle(h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 5, 4);
  g.lineStyle(3, BATON, 1); g.lineBetween(h.x, h.y, tipX, tipY);
  g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(h.x + Math.cos(a) * 8, h.y + Math.sin(a) * 8 - 1, tipX, tipY - 1);
  if (s.castGlow > 0.05) {
    g.fillStyle(GILT_LIT, 0.3 * s.castGlow); g.fillCircle(tipX, tipY, 12);
    g.fillStyle(0xffffff, s.castGlow); g.fillCircle(tipX, tipY, 3);
  }
  const ox = s.x, oy = s.y - r - 34;
  if (s.phaseIdx === 0) {
    // A metronome ticking over him.
    g.fillStyle(OAK_DARK, 1); g.fillTriangle(ox - 12, oy + 12, ox + 12, oy + 12, ox, oy - 16);
    g.fillStyle(OAK_LIT, 1); g.fillTriangle(ox - 9, oy + 10, ox + 9, oy + 10, ox, oy - 12);
    const sw = Math.sin(t / 300) * 0.5;
    g.lineStyle(2, GILT_LIT, 1); g.lineBetween(ox, oy + 8, ox + Math.sin(sw) * 18, oy + 8 - Math.cos(sw) * 18);
    g.fillStyle(GILT, 1); g.fillCircle(ox + Math.sin(sw) * 12, oy + 8 - Math.cos(sw) * 12, 2.5);
  } else if (s.phaseIdx === 1) {
    // The answering voice: a shadow baton a beat behind his, in the other hand.
    const h2 = s.hands[1] ?? { x: s.x - r, y: s.y };
    const a2 = s.facing + 0.5 + Math.sin((t - 400) / 260) * 0.25;
    g.lineStyle(3, 0xd8b0ff, 0.6); g.lineBetween(h2.x, h2.y, h2.x + Math.cos(a2) * 48, h2.y + Math.sin(a2) * 48);
    trebleClef(g, ox, oy, 0.55, 0xd8b0ff, 0.7, 2);
  } else if (s.phaseIdx === 2) {
    // The hairpin, opening and closing over his head.
    const op = 4 + (Math.sin(t / 400) * 0.5 + 0.5) * 8;
    g.lineStyle(3, 0xff9a6a, 0.9); g.lineBetween(ox - 22, oy, ox + 22, oy - op); g.lineBetween(ox - 22, oy, ox + 22, oy + op);
  } else if (s.phaseIdx === 3) {
    // White ribbons of the muted drifting round him.
    for (let i = 0; i < 4; i++) {
      const ra = t / 900 + i * (Math.PI / 2);
      const rx = s.x + Math.cos(ra) * (r + 24), ry = s.y + Math.sin(ra) * (r + 14);
      g.lineStyle(2.5, RIBBON, 0.7); g.beginPath(); g.moveTo(rx, ry);
      for (let k = 1; k <= 5; k++) g.lineTo(rx - Math.cos(ra) * k * 5 + Math.sin(t / 150 + k) * 3, ry - Math.sin(ra) * k * 5 + k * 2);
      g.strokePath();
    }
  } else if (s.hard) {
    segno(g, ox, oy, 0.8, GILT_LIT, 0.6 + Math.sin(t / 200) * 0.3);
  }
  if (s.enraged) {
    // Sweat-flecked: stray notes thrown off as he conducts harder.
    for (let i = 0; i < 3; i++) {
      const f = ((t / 500) + i / 3) % 1;
      noteHead(g, s.x + (i - 1) * 20, s.y - r - f * 40, 0.8, C_LIT, 1 - f, 1);
    }
  }
}

// ── The Console (the arena) ──────────────────────────────────────────

/**
 * The Console under the Rose of Pipes. A floor of black and white marble laid like a keyboard —
 * long ivory slabs with ebony between — the pedalboard fanned across the middle, the great Rose of
 * Pipes rising off the back wall round a rose window, the stop jambs at either side, and candles.
 */
function drawConsoleHall(g: Gfx, W: number, H: number): void {
  const rng = mulberry(0xcade);
  g.fillStyle(0x0c0a10, 1); g.fillRect(0, FT, W, H - FT);
  // The keyboard floor: ivory slabs, every few an ebony one inset.
  const KW = 60;
  for (let x = 0; x < W; x += KW) {
    g.fillStyle(0xe8e0cc, 1); g.fillRect(x + 1, FT + 120, KW - 2, H - FT - 120);
    g.fillStyle(0xfaf4e4, 0.6); g.fillRect(x + 3, FT + 122, 4, H - FT - 126);
    g.fillStyle(0xc8c0a8, 1); g.fillRect(x + 1, H - 10, KW - 2, 10);
    for (let i = 0; i < 4; i++) { g.lineStyle(1, 0xc8bca0, 0.4); g.lineBetween(x + 6 + rng() * (KW - 12), FT + 130 + rng() * 300, x + 6 + rng() * (KW - 12), FT + 160 + rng() * 300); }
  }
  for (let i = 0; i < W / KW; i++) {
    const n = i % 7;
    if (n === 2 || n === 6) continue;
    const x = (i + 1) * KW;
    g.fillStyle(EBONY, 1); g.fillRect(x - 17, FT + 120, 34, (H - FT - 120) * 0.58);
    g.fillStyle(0x3a3440, 1); g.fillRect(x - 15, FT + 120, 4, (H - FT - 120) * 0.55);
  }
  // The back wall: oak casework and the Rose of Pipes.
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, FT, W, 120);
  g.fillStyle(OAK, 1); g.fillRect(0, FT + 90, W, 30);
  g.fillStyle(GILT, 1); g.fillRect(0, FT + 116, W, 4);
  for (let i = -14; i <= 14; i++) {
    const x = W / 2 + i * 31;
    const h = 100 - Math.abs(i) * 4.5;
    g.fillStyle(SILVER_DEEP, 1); g.fillRect(x - 11, FT + 110 - h, 22, h);
    g.fillStyle(i % 2 ? SILVER : SILVER_DARK, 1); g.fillRect(x - 9, FT + 110 - h, 18, h);
    g.fillStyle(SILVER_LIT, 0.6); g.fillRect(x - 6, FT + 112 - h, 3, h - 6);
    g.fillStyle(SILVER_DEEP, 1); g.fillTriangle(x - 7, FT + 96, x + 7, FT + 96, x, FT + 86);
  }
  const rx = W / 2, ry = FT + 48;
  const panes = [ROSE_RED, ROSE_BLUE, ROSE_GOLD, VIOLET];
  g.fillStyle(EBONY, 1); g.fillCircle(rx, ry, 46);
  for (let k = 0; k < 16; k++) {
    g.fillStyle(panes[k % 4], 0.9);
    g.slice(rx, ry, 42, (k / 16) * Math.PI * 2, ((k + 1) / 16) * Math.PI * 2, false); g.fillPath();
  }
  g.lineStyle(2, EBONY, 1); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.lineBetween(rx, ry, rx + Math.cos(a) * 42, ry + Math.sin(a) * 42); }
  g.strokeCircle(rx, ry, 42); g.strokeCircle(rx, ry, 16);
  g.fillStyle(GILT, 1); g.fillCircle(rx, ry, 13);
  cadenzaSigil(g, rx, ry, 11, EBONY, 1);
  // Light from the rose falling on the keys.
  for (let k = 0; k < 4; k++) { g.fillStyle(panes[k], 0.06); g.fillEllipse(rx - 240 + k * 160, FT + 260 + (k % 2) * 80, 220, 90); }
  // The pedalboard fanned across the middle of the floor.
  for (let i = 0; i < 17; i++) {
    const x = W / 2 + (i - 8) * 26;
    const a = (i - 8) * 0.025;
    g.fillStyle(i % 2 ? EBONY : OAK_LIT, 0.9);
    g.fillPoints([{ x: x - 9, y: H - 160 }, { x: x + 9, y: H - 160 }, { x: x + 9 + a * 300, y: H - 30 }, { x: x - 9 + a * 300, y: H - 30 }], true, true);
  }
  // Stop jambs at the sides, a manual laid along the foot of the back wall.
  for (const x0 of [8, W - 52]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, FT + 140, 44, 220);
    g.fillStyle(OAK, 1); g.fillRect(x0 + 3, FT + 143, 38, 214);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) stopKnob(g, x0 + 12 + j * 20, FT + 168 + i * 24, 0.6, (i + j) % 3 === 0, (i + j) % 3);
  }
  manual(g, W / 2 - 180, FT + 136, 12, 30, 14);
  // Candles along the sides.
  for (let y = FT + 400; y < H - 40; y += 70) { candle(g, 30, y, 1, y, true); candle(g, W - 30, y, 1, y + 1, true); }
  // The stave inlaid in gilt across the keys — his Score, under everyone's feet.
  staveLines(g, 60, FT + 200, W - 120, 14, GILT_DARK, 0.4, 2);
  for (let x = 120; x < W - 80; x += 70) noteHead(g, x, FT + 200 + ((x / 70) % 5) * 14, 1.4, GILT_DARK, 0.45, 1);
  // Wax seals pressed into the floor at the spots where the Organ's pipes stand.
  for (const [x, y] of [[150, FT + 100], [370, FT + 100], [590, FT + 100], [810, FT + 100], [36, 300], [W - 36, 470], [260, H - 14], [700, H - 14]] as const) {
    g.fillStyle(dim(WAX_RED, 0.3), 0.8); g.fillCircle(x, y + 6, 10);
    g.fillStyle(WAX_RED, 0.7); g.fillCircle(x, y + 5, 7);
  }
}

// ── The def ──────────────────────────────────────────────────────────

export const CADENZA_BOSS: WorldBossDef = {
  worldId: 'isle:cadenza',
  name: 'Maestro Cadenza',
  title: 'Conductor of the Score, Master of Choirholm',
  color: C_MAIN,
  colorLit: C_LIT,
  colorDark: C_DARK,
  accent: GILT,
  damageMult: 1.6,

  intro: [
    'You are late. You came in on the wrong beat, and you have been out of time ever since you landed.',
    'Six first chairs, put down. Three wardens. My blowers have stopped walking the wheel. Listen to it.',
    'An isle is a choir. A choir needs a conductor. Take your part — there is only one left. The rest.',
  ],
  banter: [
    'Every child gets a note. One note. It is more than most people deserve.',
    'Do not sing. Nobody asked you to sing. Count.',
    'I did not take their voices. I kept them. They are in tune now, for the first time in their lives.',
    'Vesper prayed. Fanfare blew. Folio wrote. I conduct. Only one of those is a job.',
    'One, two, three, four. You are behind. You are always behind.',
    'Silence between the Hours is not cruelty. It is a rest. Music is mostly rests.',
    'Listen to the Organ. Four hundred voices, and not one of them wrong.',
    'Your feet are making noise. Noise is fined.',
  ],
  defeatLine: 'THE ORGAN FALLS SILENT',
  resumeLine: 'Again. From the top. And this time — in time.',

  phases: [
    {
      name: 'Overture',
      line: 'The Overture. Watch the baton. Everyone always forgets to watch the baton.',
      hp: 640,
      cycle: ['sig:in2', 'volley', 'sig:in3', 'radial', 'sig:in4', 'lanes', 'sig:in3', 'sig:in2', 'barrage', 'sig:in4'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
    },
    {
      name: 'Fugue',
      line: 'A subject. An answer. Another answer. Every voice says the same thing, as it should.',
      hp: 700,
      cycle: ['sig:subject', 'sig:canon', 'homing', 'sig:stretto', 'spiral', 'sig:subject', 'sig:canon', 'volley', 'sig:stretto', 'slamchain'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 980,
      harassMs: 2900,
    },
    {
      name: 'Crescendo',
      line: 'Pianissimo. ...Piano. Mezzo-piano. You will want to remember how quiet this was.',
      hp: 740,
      cycle: ['sig:hairpin', 'sig:accelerando', 'sig:climax', 'sig:hairpin', 'sig:accelerando', 'sig:gp', 'radial', 'sig:climax', 'sig:hairpin', 'sig:gp'],
      harass: ['h-snipe', 'h-lane'],
      restMs: 920,
      harassMs: 3000,
    },
    {
      name: 'Requiem of Voices',
      line: 'Very well. I shall not conduct you. I shall PLAY you. Organ — all stops out.',
      hp: 780,
      cycle: ['sig:requiem', 'sig:lacrimosa', 'sig:tutti', 'sig:requiem', 'barrage', 'sig:lacrimosa', 'sig:tutti', 'sanctuary', 'sig:requiem', 'homing'],
      harass: ['h-orbs', 'h-mines'],
      restMs: 900,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'DA CAPO AL FINE',
    extraPhase: {
      name: 'Da Capo',
      line: 'D.C. — from the top. Did you think it ended? A Score never ends. It repeats.',
      hp: 560,
      cycle: ['sig:dacapo', 'sig:tutti', 'sig:subject', 'sig:hairpin', 'sig:requiem', 'sig:canon', 'sig:lacrimosa', 'sig:accelerando', 'spiral'],
      harass: ['h-rune', 'h-lane'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 20 },
    lanes: { halfW: 28 },
  },

  signatures: {
    in2: conduct(2, 'IN TWO'),
    in3: conduct(3, 'IN THREE'),
    in4: conduct(4, 'IN FOUR'),
    subject,
    canon,
    stretto,
    hairpin,
    accelerando,
    climax,
    gp: generalPause,
    requiem,
    lacrimosa,
    tutti,
    dacapo: daCapo,
  },

  look: { crest: 'mane', pattern: 'smooth', aura: 'none', hands: 'ball', torsoR: 40, mouth: 'line', eyes: 2, eyeColor: 0xfff0c8 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', look: { pattern: 'rings' } },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { pattern: 'swirl', aura: 'sparks', mouth: 'grin' } },
    { movement: 'anchor', gimmick: 'none', tint: 'pale', look: { pattern: 'weave', aura: 'smoke', hands: 'wisp' } },
    { movement: 'blink', gimmick: 'none', tint: 'gold', look: { pattern: 'grid', aura: 'sparks', eyes: 3 } },
  ],

  drawDecor: drawCadenza,
  drawArena: drawConsoleHall,
};

