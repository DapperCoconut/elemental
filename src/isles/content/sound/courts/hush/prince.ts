import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import { ribbon, stitchedMouth } from './art';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, FELT, FELT_DARK, FELT_LIT, FELT_OAT, FELT_PLUM, HUSH, HUSH_DEEP, IRON, LAMP,
  LAMP_GLOW, MUTE, MUTE_ACCENT, MUTE_DARK, MUTE_LIT, SILK, SILK_SHADE, SNOW, SNOW_LIT, SNOW_SHADE,
} from './palette';
import { clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Mute — the Maestro's first chair of the silence, governor of the Hush Court.
 *
 * Mute has no voice. He gave it, they say, the first night of the Score — sang his own song for the
 * Maestro and had it taken, and was given the Hush to keep in return. He reads the register of the
 * muted every evening without a sound. He fights the way the Hush is kept:
 *
 * • **Shush** (stalking): rings of hush roll out from him, each with one gap, and whoever they
 *   catch is silenced; and he moves without footfalls — his shadow slides out across the floor
 *   ahead of him, and where it stops he is suddenly there, a felt palm coming down.
 * • **Dead Air** (hovering, pale): the arena goes silent. Snow blows in across the floor in
 *   drifts, and his darts are invisible — you see them only as tracks ploughed through the snow.
 * • **Gag** (hard, blinking, cold): white silk gags fly out in long ribbons that wrap and hold
 *   whoever they catch, and silk snares laid across the floor snap taut.
 */

const TOP = 96;

/** Per-fight shared state: the snow drifts of Dead Air (darts show only where they cross them). */
interface MuteState { drifts: Rect[]; driftAt: number }
const STATE = new WeakMap<BossToolkit, MuteState>();
const state = (tk: BossToolkit): MuteState => {
  let s = STATE.get(tk);
  if (!s) { s = { drifts: [], driftAt: -9999 }; STATE.set(tk, s); }
  return s;
};
const inRect = (r: Rect, x: number, y: number): boolean => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

const live = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Shush ─────────────────────────────────────────────────
// He lifts a finger to the gag. Three rings of hush roll out from him one after another, sharing
// one gap that drifts a little each ring. A ring that catches you silences you (and stings).

interface HushRing { r: number; gap: number; startAt: number; dealt: boolean; cx: number; cy: number }

const shush = (tk: BossToolkit): SignatureMove => {
  let rings: HushRing[] = [];
  const GAP = 0.52, SPEED = 235, BAND = 16;
  return {
    durationMs: 1900,
    windupMs: 700,
    gesture: 'raise',
    tell: 'SHHH',
    cast(time) {
      const base = tk.angleToPlayer() + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8);
      const drift = (Math.random() < 0.5 ? -1 : 1) * 0.2;
      const n = tk.hard ? 4 : 3;
      rings = [];
      for (let i = 0; i < n; i++) rings.push({ r: 30, gap: base + drift * i, startAt: time + i * 520, dealt: false, cx: tk.bossX, cy: tk.bossY });
      tk.sfx('hush');
    },
    update(time, dt) {
      const p = tk.player;
      for (const r of rings) {
        if (time < r.startAt) { r.cx = tk.bossX; r.cy = tk.bossY; continue; }
        r.r += SPEED * dt;
        if (r.dealt || !live(tk)) continue;
        const d = dist(p.x, p.y, r.cx, r.cy);
        if (Math.abs(d - r.r) > BAND + 14) continue;
        if (Math.abs(wrapAngle(Math.atan2(p.y - r.cy, p.x - r.cx) - r.gap)) < GAP) continue;
        r.dealt = true;
        tk.hitPlayer(7, p.x, p.y);
        tk.silence(1600);
      }
      rings = rings.filter((r) => r.r < 1000);
    },
    drawGround(g, time) {
      for (const r of rings) {
        if (time < r.startAt) {
          // The telegraph: a faint ring at his feet, its gap already showing.
          const k = 1 - (r.startAt - time) / 1600;
          g.lineStyle(2, SILK, clamp(k, 0.1, 0.5));
          g.beginPath(); g.arc(r.cx, r.cy, 46, r.gap + GAP, r.gap - GAP + Math.PI * 2, false); g.strokePath();
          continue;
        }
        const fade = clamp(1 - r.r / 1000, 0, 1);
        g.lineStyle(BAND * 1.6, HUSH, 0.28 * fade);
        g.beginPath(); g.arc(r.cx, r.cy, r.r, r.gap + GAP, r.gap - GAP + Math.PI * 2, false); g.strokePath();
        g.lineStyle(2, SILK, 0.75 * fade);
        g.beginPath(); g.arc(r.cx, r.cy, r.r + BAND * 0.7, r.gap + GAP, r.gap - GAP + Math.PI * 2, false); g.strokePath();
        g.beginPath(); g.arc(r.cx, r.cy, r.r - BAND * 0.7, r.gap + GAP, r.gap - GAP + Math.PI * 2, false); g.strokePath();
        // Hush marks riding the ring: little closed brackets, no ripples.
        for (let i = 0; i < 16; i++) {
          const a = r.gap + GAP + 0.15 + (i / 16) * (Math.PI * 2 - GAP * 2 - 0.3);
          const mx = r.cx + Math.cos(a) * r.r, my = r.cy + Math.sin(a) * r.r;
          g.lineStyle(1.5, SILK, 0.6 * fade);
          g.beginPath(); g.arc(mx, my, 5, a + Math.PI * 0.6, a + Math.PI * 1.4, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { rings = []; },
  };
};

// ── Signature: Soft Step ─────────────────────────────────────────────
// No footfalls. His shadow slides away from him over the floor to a spot just past you, and
// sits there pulsing. Then he is suddenly over it, and a felt palm comes down: hit and hushed.

const softStep = (tk: BossToolkit): SignatureMove => {
  let from: Pt | null = null;
  let to: Pt | null = null;
  let startAt = 0, arriveAt = 0, slamAt = 0;
  let slammed = true;
  const R = 104;
  return {
    durationMs: 1700,
    windupMs: 300,
    gesture: 'point',
    tell: '…',
    cast(time) {
      const p = tk.player;
      const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) + (Math.random() - 0.5) * 0.8;
      from = { x: tk.bossX, y: tk.bossY };
      to = { x: tk.clampX(p.x + Math.cos(a) * 70), y: tk.clampY(p.y + Math.sin(a) * 50) };
      startAt = time;
      arriveAt = time + tk.warn(1050);
      slamAt = arriveAt + 380;
      slammed = false;
      tk.schedule(arriveAt - time, () => {
        if (to) tk.spawnCharge({ toX: to.x, toY: to.y, warnMs: 60, travelMs: 200, halfW: 24, damage: 8 });
      });
    },
    update(time) {
      if (slammed || !to || time < slamAt) return;
      slammed = true;
      const p = tk.player;
      tk.boom(to.x, to.y, R, SILK);
      tk.sfx('hush');
      if (live(tk) && dist(p.x, p.y, to.x, to.y) < R) { tk.hitPlayer(12, p.x, p.y); tk.silence(1200); }
    },
    drawGround(g, time) {
      if (!from || !to || time > slamAt + 400) return;
      const k = clamp((time - startAt) / Math.max(1, arriveAt - startAt), 0, 1);
      const sx = from.x + (to.x - from.x) * k, sy = from.y + (to.y - from.y) * k;
      // The shadow, sliding with nobody above it.
      g.fillStyle(0x0c1018, 0.42); g.fillEllipse(sx, sy + 18, 70, 24);
      g.fillStyle(0x0c1018, 0.25); g.fillEllipse(sx, sy + 18, 90, 32);
      // Where it will stop: a soft ring, tightening.
      if (!slammed) {
        g.lineStyle(2, SILK, 0.3 + k * 0.5); g.strokeCircle(to.x, to.y, R * (1.25 - k * 0.25));
        g.fillStyle(HUSH_DEEP, 0.1 + k * 0.12); g.fillCircle(to.x, to.y, R);
      } else {
        const f = clamp((time - slamAt) / 400, 0, 1);
        g.fillStyle(SILK, 0.35 * (1 - f)); g.fillCircle(to.x, to.y, R * (0.8 + f * 0.3));
      }
    },
    drawAir(g, time) {
      if (!to || slammed || time < arriveAt) return;
      // The felt palm, coming down.
      const f = clamp((time - arriveAt) / (slamAt - arriveAt), 0, 1);
      const y = to.y - 90 + f * 70;
      g.fillStyle(FELT_DARK, 1); g.fillRoundedRect(to.x - 26, y - 20, 52, 40, 12);
      g.fillStyle(FELT_LIT, 1); g.fillRoundedRect(to.x - 22, y - 16, 44, 30, 10);
      for (let i = 0; i < 4; i++) { g.fillStyle(FELT_LIT, 1); g.fillRoundedRect(to.x - 22 + i * 11, y - 36, 9, 22, 4); }
    },
    onPhaseEnd() { from = null; to = null; slammed = true; },
  };
};

// ── Signature: Drift ─────────────────────────────────────────────────
// Snow blows in under the doors and lies across the floor in three bands. Wading slows you a
// little. It is also the only place his Dead Air darts can be seen.

const drift = (tk: BossToolkit): SignatureMove => {
  const st = state(tk);
  let lastSlow = 0;
  return {
    durationMs: 1300,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'DRIFT',
    cast(time) {
      const horiz = Math.random() < 0.5;
      st.drifts = [];
      const n = 3;
      for (let i = 0; i < n; i++) {
        if (horiz) { const h = 64; const y = TOP + 50 + ((i + 0.5) * (tk.H - TOP - 100)) / n - h / 2 + (Math.random() - 0.5) * 30; st.drifts.push({ x: 0, y, w: tk.W, h }); }
        else { const w = 74; const x = 60 + ((i + 0.5) * (tk.W - 120)) / n - w / 2 + (Math.random() - 0.5) * 40; st.drifts.push({ x, y: TOP, w, h: tk.H - TOP }); }
      }
      st.driftAt = time;
      tk.sfx('gust');
    },
    update(time) {
      const p = tk.player;
      if (time - lastSlow > 180 && st.drifts.some((r) => inRect(r, p.x, p.y))) { lastSlow = time; tk.slowPlayer(0.85, 220); }
    },
    drawGround(g, time) {
      const k = clamp((time - st.driftAt) / 800, 0, 1);
      const rng = mulberry(Math.floor(st.driftAt) | 1);
      for (const r of st.drifts) {
        g.fillStyle(SNOW_SHADE, 0.8 * k); g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(SNOW, 0.9 * k); g.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
        // Lumpy edges and wind ripples.
        const long = r.w > r.h;
        for (let d = 0; d < (long ? r.w : r.h); d += 26) {
          g.fillStyle(SNOW, 0.9 * k);
          if (long) { g.fillCircle(r.x + d, r.y + 2, 8 + rng() * 6); g.fillCircle(r.x + d + 12, r.y + r.h - 2, 7 + rng() * 6); }
          else { g.fillCircle(r.x + 2, r.y + d, 8 + rng() * 6); g.fillCircle(r.x + r.w - 2, r.y + d + 12, 7 + rng() * 6); }
          g.lineStyle(1, SNOW_SHADE, 0.6 * k);
          if (long) { g.beginPath(); g.arc(r.x + d + 6, r.y + r.h / 2, 10, Math.PI * 1.1, Math.PI * 1.8, false); g.strokePath(); }
          else { g.beginPath(); g.arc(r.x + r.w / 2, r.y + d + 6, 10, Math.PI * 0.6, Math.PI * 1.3, false); g.strokePath(); }
        }
        for (let i = 0; i < 30; i++) { g.fillStyle(SNOW_LIT, 0.9 * k); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1.5, 1.5); }
      }
    },
    onPhaseEnd() { st.drifts = []; },
  };
};

// ── Signature: Dead Air ──────────────────────────────────────────────
// A fan of darts you cannot see. A faint puff at his hands when they go; after that, only the
// furrows they plough through the snow drifts show where they are.

interface Dart { x: number; y: number; vx: number; vy: number; dieAt: number; dead: boolean }
interface Furrow { x: number; y: number; a: number; at: number }

const deadAir = (tk: BossToolkit): SignatureMove => {
  const st = state(tk);
  let darts: Dart[] = [];
  let furrows: Furrow[] = [];
  let puffAt = -9999;
  let puff: Pt = { x: 0, y: 0 };
  return {
    durationMs: 1500,
    windupMs: 650,
    gesture: 'clap',
    tell: '',
    cast(time) {
      if (st.drifts.length === 0) {
        // Snow lies where it last blew, or in two bands if none has yet.
        st.drifts = [{ x: 0, y: TOP + 140, w: tk.W, h: 60 }, { x: 0, y: tk.H - 190, w: tk.W, h: 60 }];
        st.driftAt = time;
      }
      const a0 = tk.angleToPlayer();
      const n = tk.hard ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.2;
        darts.push({ x: tk.bossX, y: tk.bossY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dieAt: time + 4200, dead: false });
      }
      puffAt = time; puff = { x: tk.bossX, y: tk.bossY };
      tk.sfx('hush');
    },
    update(time, dt) {
      const p = tk.player;
      for (const d of darts) {
        if (d.dead) continue;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (time > d.dieAt || d.x < -20 || d.x > tk.W + 20 || d.y < TOP - 20 || d.y > tk.H + 20) { d.dead = true; continue; }
        if (st.drifts.some((r) => inRect(r, d.x, d.y))) {
          furrows.push({ x: d.x, y: d.y, a: Math.atan2(d.vy, d.vx), at: time });
        }
        if (live(tk) && dist(p.x, p.y, d.x, d.y) < 26) { d.dead = true; tk.hitPlayer(10, p.x, p.y); }
      }
      darts = darts.filter((d) => !d.dead);
      furrows = furrows.filter((f) => time - f.at < 1300);
    },
    drawGround(g, time) {
      // The furrows: dents in the snow, fresh ones bright-edged.
      for (const f of furrows) {
        const k = (time - f.at) / 1300;
        const c = Math.cos(f.a), s = Math.sin(f.a);
        g.lineStyle(5, HUSH_DEEP, 0.55 * (1 - k)); g.lineBetween(f.x - c * 6, f.y - s * 6, f.x + c * 6, f.y + s * 6);
        g.lineStyle(1.5, SNOW_LIT, 0.8 * (1 - k)); g.lineBetween(f.x - c * 6 - s * 4, f.y - s * 6 + c * 4, f.x + c * 6 - s * 4, f.y + s * 6 + c * 4);
      }
      // The dart itself, while it is in the snow: a spray thrown up ahead of it.
      for (const d of darts) {
        if (!st.drifts.some((r) => inRect(r, d.x, d.y))) continue;
        for (let i = 0; i < 4; i++) { g.fillStyle(SNOW_LIT, 0.9); g.fillCircle(d.x + (Math.random() - 0.5) * 10, d.y - 4 - Math.random() * 8, 2); }
      }
    },
    drawAir(g, time) {
      if (time - puffAt < 450) {
        const k = (time - puffAt) / 450;
        g.fillStyle(SILK, 0.4 * (1 - k)); g.fillCircle(puff.x, puff.y - 10, 18 + k * 30);
        // The only tell of where the fan went: short pale breaths leaving his hands.
        for (const d of darts) {
          const a = Math.atan2(d.vy, d.vx);
          g.lineStyle(2, SILK, 0.5 * (1 - k));
          g.lineBetween(puff.x + Math.cos(a) * 30, puff.y + Math.sin(a) * 30, puff.x + Math.cos(a) * (60 + k * 40), puff.y + Math.sin(a) * (60 + k * 40));
        }
      }
      // The barest shimmer of the air where a dart passes — only if you know to look.
      for (const d of darts) { g.lineStyle(1, MUTE_LIT, 0.07); g.strokeCircle(d.x, d.y, 7); }
    },
    onPhaseEnd() { darts = []; furrows = []; },
  };
};

// ── Signature: Gag ───────────────────────────────────────────────────
// White silk gags unspool from his sleeves in long ribbons, weaving toward where you stood (the
// path is drawn first). A ribbon that reaches you wraps you — held fast, and stung.

interface Gag { pts: Pt[]; head: number; startAt: number; caught: boolean; wrapUntil: number; done: boolean; seed: number }

const gag = (tk: BossToolkit): SignatureMove => {
  let gags: Gag[] = [];
  const SPEED = 420;
  return {
    durationMs: 2200,
    windupMs: 750,
    gesture: 'sweep',
    hold: 'reach',
    tell: 'GAG',
    cast(time) {
      const p = tk.player;
      const n = 3;
      gags = [];
      for (let i = 0; i < n; i++) {
        const tx = tk.clampX(p.x + (i - 1) * 70), ty = tk.clampY(p.y + (i - 1) * 30);
        const a = Math.atan2(ty - tk.bossY, tx - tk.bossX);
        const len = dist(tk.bossX, tk.bossY, tx, ty) + 120;
        const pts: Pt[] = [];
        const seed = Math.random() * 6;
        for (let d = 0; d <= len; d += 14) {
          const w = Math.sin(d / 60 + seed) * 26 * Math.min(1, d / 120);
          pts.push({ x: tk.bossX + Math.cos(a) * d - Math.sin(a) * w, y: tk.bossY + Math.sin(a) * d + Math.cos(a) * w });
        }
        gags.push({ pts, head: 0, startAt: time + tk.warn(700) + i * 180, caught: false, wrapUntil: 0, done: false, seed });
      }
      tk.sfx('whip');
    },
    update(time, dt) {
      const p = tk.player;
      for (const gg of gags) {
        if (gg.done || time < gg.startAt) continue;
        gg.head = Math.min(gg.pts.length - 1, gg.head + (SPEED * dt) / 14);
        if (gg.head >= gg.pts.length - 1) gg.done = true;
        const h = gg.pts[Math.floor(gg.head)];
        if (!gg.caught && live(tk) && !gags.some((o) => o.caught && time < o.wrapUntil) && dist(p.x, p.y, h.x, h.y) < 24) {
          gg.caught = true;
          gg.wrapUntil = time + 1300;
          tk.root(1300);
          tk.hitPlayer(8, p.x, p.y);
          tk.sfx('status-slow');
        }
      }
      if (gags.every((g) => g.done && time > g.wrapUntil + 400)) gags = [];
    },
    drawGround(g, time) {
      for (const gg of gags) {
        if (time >= gg.startAt) continue;
        // The path: a dotted silk line weaving toward you.
        for (let i = 0; i < gg.pts.length; i += 2) { g.fillStyle(SILK, 0.35); g.fillCircle(gg.pts[i].x, gg.pts[i].y, 2); }
      }
    },
    drawAir(g, time) {
      const p = tk.player;
      for (const gg of gags) {
        if (time < gg.startAt) continue;
        const end = Math.floor(gg.head);
        const start = Math.max(0, end - 26);
        for (let i = start; i < end; i++) {
          const a = gg.pts[i], b = gg.pts[i + 1];
          const k = (i - start) / 26;
          g.lineStyle(7 * (0.5 + k * 0.5), SILK_SHADE, 0.9); g.lineBetween(a.x, a.y + 2, b.x, b.y + 2);
          g.lineStyle(5 * (0.5 + k * 0.5), SILK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
        }
        if (!gg.done) { const h = gg.pts[end]; g.fillStyle(SILK, 1); g.fillCircle(h.x, h.y, 6); g.fillStyle(MUTE_ACCENT, 0.7); g.fillCircle(h.x, h.y, 2.5); }
        // Wrapped: coils of silk round you, a bow at the side.
        if (gg.caught && time < gg.wrapUntil) {
          for (let i = 0; i < 4; i++) {
            g.lineStyle(4, i % 2 ? SILK : SILK_SHADE, 1);
            g.strokeEllipse(p.x, p.y - 28 + i * 10, 46, 10);
          }
          g.fillStyle(SILK, 1); g.fillTriangle(p.x + 22, p.y - 14, p.x + 34, p.y - 22, p.x + 34, p.y - 6);
        }
      }
    },
    onPhaseEnd() { gags = []; },
  };
};

// ── Signature: Silk Snare ────────────────────────────────────────────
// Two long white ribbons drop across the floor in an X through you, lying slack. Then they snap
// taut: whoever stands on one is caught and held.

interface Snare { x: number; y: number; a: number; fireAt: number; dealt: boolean }

const snare = (tk: BossToolkit): SignatureMove => {
  let snares: Snare[] = [];
  const HALF = 18;
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'clap',
    tell: 'SNARE',
    cast(time) {
      const p = tk.player;
      const a = Math.random() * Math.PI;
      snares = [0, 1].map((i) => ({ x: p.x, y: p.y, a: a + i * (Math.PI / 2 + (Math.random() - 0.5) * 0.5), fireAt: time + tk.warn(1150) + i * 260, dealt: false }));
      tk.sfx('trap-set');
    },
    update(time) {
      const p = tk.player;
      for (const s of snares) {
        if (s.dealt || time < s.fireAt) continue;
        s.dealt = true;
        tk.sfx('trap-snap');
        const c = Math.cos(s.a) * 1200, sn = Math.sin(s.a) * 1200;
        if (live(tk) && segDist(p.x, p.y, s.x - c, s.y - sn, s.x + c, s.y + sn) < HALF + 12) { tk.root(1000); tk.hitPlayer(11, p.x, p.y); }
      }
      snares = snares.filter((s) => !s.dealt || time < s.fireAt + 500);
    },
    drawGround(g, time) {
      for (const s of snares) {
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        if (s.dealt) {
          const k = clamp((time - s.fireAt) / 500, 0, 1);
          g.lineStyle(HALF * 2 * (1 - k * 0.6), SILK, 0.8 * (1 - k)); g.lineBetween(s.x - c * 1200, s.y - sn * 1200, s.x + c * 1200, s.y + sn * 1200);
          continue;
        }
        // Slack: a lazy wavy ribbon lying on the floor, tightening as the snap nears.
        const k = clamp(1 - (s.fireAt - time) / 1150, 0, 1);
        const amp = 12 * (1 - k);
        let px = s.x - c * 1100, py = s.y - sn * 1100;
        for (let d = -1100; d <= 1100; d += 20) {
          const w = Math.sin(d / 40) * amp;
          const x = s.x + c * d - sn * w, y = s.y + sn * d + c * w;
          g.lineStyle(4, SILK, 0.4 + k * 0.5); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
      }
    },
    onPhaseEnd() { snares = []; },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const MUTE_BOSS: WorldBossDef = {
  worldId: 'isle:mute',
  name: 'Prince Mute',
  title: 'the Unheard',
  color: MUTE,
  colorLit: MUTE_LIT,
  colorDark: MUTE_DARK,
  accent: MUTE_ACCENT,
  // Tier 3 of the ninth isle.
  damageMult: 1.45,

  intro: [
    '(he raises one finger to the white silk over his mouth)',
    '(Sister Lintel, from the doorway, whispering) He says: you are very loud. He says: he will help with that.',
  ],
  banter: [
    '(he signs HUSH, and the whole room seems to lean in)',
    '(he points at your mouth, and then at the ribbons on the rail outside)',
    '(he signs something that is not one of the four shapes, and then looks at his hand as if it stung)',
    '(a breath through the silk — the nearest thing he has to a word)',
    '(he taps his chest where a reed is pinned, and shakes his head: no note left on it)',
  ],
  defeatLine: 'THE HUSH IS BROKEN',
  resumeLine: '(he waits by the door with the register open at a fresh page, and taps the empty line)',

  phases: [
    {
      name: 'Shush',
      line: '(he lifts a finger to the gag, and the snow outside stops falling)',
      hp: 580,
      cycle: [
        'sig:shush', 'volley', 'sig:softstep', 'radial', 'sig:shush',
        'homing', 'sig:softstep', 'sweep', 'sig:shush', 'sig:softstep',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Dead Air',
      line: '(the room goes silent — not quiet: silent. Your own footsteps stop making a sound.)',
      hp: 670,
      cycle: [
        'sig:drift', 'sig:deadair', 'sig:shush', 'sig:deadair', 'lanes',
        'sig:softstep', 'sig:deadair', 'sig:drift', 'spiral', 'sig:deadair',
      ],
      harass: ['h-flak', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE GAG',
    extraPhase: {
      name: 'Gag',
      line: '(he draws a white ribbon from his sleeve, and another, and another, and they do not end)',
      hp: 500,
      cycle: [
        'sig:gag', 'sig:snare', 'sig:shush', 'barrage', 'sig:gag',
        'sig:softstep', 'sig:snare', 'homing', 'sig:gag', 'sig:shush',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.5 },
    radial: { count: 14, speed: 190 },
    spiral: { arms: 3, speed: 170 },
    sweep: { halfW: 26 },
  },

  signatures: {
    shush,
    softstep: softStep,
    drift,
    deadair: deadAir,
    gag,
    snare,
  },

  look: {
    crest: 'veil', pattern: 'weave', aura: 'frost', hands: 'wisp',
    torsoR: 34, mouth: 'stitch', eyes: 2, eyeColor: MUTE_ACCENT,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { aura: 'none', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'cold', look: { aura: 'smoke', hands: 'orb' } },
  ],

  /**
   * The Unheard's tells. Quilted grey earmuffs on a band over his crown; a white silk gag tied
   * across his mouth in a bow at one side, its tails fluttering; a long white scarf wound at the
   * throat; a brass tuning-reed pinned at the collar with no note left on it; one hand held up,
   * finger raised to the lips. In Shush his shadow lies heavy under him (the only sign of him
   * moving). In Dead Air he is fading at the edges into falling snow. In Gag ribbons stream from
   * both sleeves without end.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const dead = s.phaseIdx === 1;
    const gagPhase = s.hard && s.phaseIdx >= 2;
    // The heavy shadow: watch it, not him.
    if (s.phaseIdx === 0) { g.fillStyle(0x0c1018, 0.35); g.fillEllipse(s.x, s.y + R * 0.95, R * 2.4, R * 0.7); }
    // The scarf wound at the throat, one long tail trailing behind.
    g.fillStyle(SILK_SHADE, 1); g.fillRoundedRect(s.x - R * 0.75, s.y + R * 0.35, R * 1.5, R * 0.34, R * 0.15);
    g.fillStyle(SILK, 1); g.fillRoundedRect(s.x - R * 0.72, s.y + R * 0.32, R * 1.44, R * 0.26, R * 0.12);
    ribbon(g, s.x - R * 0.5, s.y + R * 0.5, R * 1.3, s.t / 1000, 1.3, SILK, 0.95, -1);
    // The tuning-reed at the collar: brass, blank.
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(s.x + R * 0.28, s.y + R * 0.38, R * 0.32, R * 0.09);
    g.fillStyle(BRONZE_LIT, 1); g.fillRect(s.x + R * 0.3, s.y + R * 0.39, R * 0.28, R * 0.04);
    // The gag across the mouth, tied in a bow at his left.
    const my = s.y + R * 0.08;
    g.fillStyle(SILK_SHADE, 1); g.fillRoundedRect(s.x - R * 0.78, my - R * 0.13, R * 1.56, R * 0.28, R * 0.12);
    g.fillStyle(SILK, 1); g.fillRoundedRect(s.x - R * 0.76, my - R * 0.15, R * 1.52, R * 0.22, R * 0.1);
    stitchedMouth(g, s.x, my - R * 0.03, R * 0.12, dim(SILK, 0.25), 0.7);
    const bx = s.x - R * 0.8;
    g.fillStyle(SILK, 1);
    g.fillTriangle(bx, my, bx - R * 0.34, my - R * 0.2, bx - R * 0.34, my + R * 0.16);
    g.fillTriangle(bx, my, bx - R * 0.1, my - R * 0.32, bx + R * 0.12, my - R * 0.3);
    ribbon(g, bx - 2, my + 2, R * 0.7, s.t / 1000, 0.2, SILK, 1, -0.7);
    ribbon(g, bx + 2, my + 3, R * 0.6, s.t / 1000, 2.2, SILK_SHADE, 1, -0.4);
    // Quilted earmuffs on their band.
    g.lineStyle(R * 0.14, FELT_DARK, 1);
    g.beginPath(); g.arc(s.x, s.y - R * 0.2, R * 0.98, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    for (const k of [-1, 1]) {
      const ex = s.x + k * R * 0.92, ey = s.y - R * 0.1;
      g.fillStyle(dim(FELT, 0.25), 1); g.fillCircle(ex, ey + 2, R * 0.33);
      g.fillStyle(FELT, 1); g.fillCircle(ex, ey, R * 0.31);
      g.lineStyle(1.2, FELT_OAT, 0.7);
      g.lineBetween(ex - R * 0.2, ey - R * 0.2, ex + R * 0.2, ey + R * 0.2); g.lineBetween(ex + R * 0.2, ey - R * 0.2, ex - R * 0.2, ey + R * 0.2);
      g.fillStyle(FELT_OAT, 1); g.fillCircle(ex, ey, R * 0.05);
    }
    // One hand raised, finger to the lips.
    const hand = s.hands[0];
    if (hand) {
      const fx = hand.x, fy = hand.y - 6 - s.castGlow * 6;
      g.lineStyle(5, MUTE_LIT, 1); g.lineBetween(fx, fy, fx, fy - 20);
      g.fillStyle(MUTE_LIT, 1); g.fillCircle(fx, fy - 20, 2.5);
      if (s.castGlow > 0.2) { g.lineStyle(1.5, SILK, s.castGlow * 0.6); g.strokeCircle(fx, fy - 20, 8 + s.castGlow * 10); }
    }
    if (dead) {
      // Fading at the edges: flakes coming off him, a pale breath of no-sound round his outline.
      for (let i = 0; i < 12; i++) {
        const ph = (s.t / 1600 + i / 12) % 1;
        const a = i * 2.39 + s.t / 3000;
        g.fillStyle(SNOW_LIT, 0.8 * (1 - ph)); g.fillCircle(s.x + Math.cos(a) * R * (1 + ph * 0.8), s.y + Math.sin(a) * R * (1 + ph * 0.5) + ph * 16, 2);
      }
      g.lineStyle(3, HUSH, 0.25 + Math.sin(s.t / 300) * 0.1); g.strokeCircle(s.x, s.y, R * 1.15);
    }
    if (gagPhase) {
      // Ribbons streaming from both sleeves, without end.
      for (const h of s.hands) {
        for (let i = 0; i < 3; i++) ribbon(g, h.x, h.y, R * (1.2 + i * 0.3), s.t / 1000, i * 1.7 + h.x * 0.01, i % 2 ? SILK_SHADE : SILK, 0.95, i - 1);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, MUTE_ACCENT, 0.35 + Math.sin(s.t / 140) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The back room of the Quiet House, where the voices are taken: walls padded floor to ceiling
   * in diamond-tufted felt, a pale felt floor with snow blown in under the two doors, the brass
   * voice-pipe on the back wall that carries every taken voice up the mountain to the Organ, pegs
   * of white ribbons waiting to be tied, and the prince's stitched mouth inlaid in the floor.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5117e);
    // Felt floor: big quilted squares, a stitch at every seam.
    g.fillStyle(FELT_LIT, 1); g.fillRect(0, 0, W, H);
    const T = 64;
    for (let y = TOP; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        g.fillStyle(((x + y) / T) % 2 ? lit(FELT_LIT, 0.06) : dim(FELT_LIT, 0.04), 1); g.fillRect(x, y, T, T);
        g.lineStyle(1, FELT_OAT, 0.35);
        for (let d = 4; d < T; d += 8) { g.lineBetween(x + d, y, x + d + 3, y); g.lineBetween(x, y + d, x, y + d + 3); }
      }
    }
    // The back wall under the HUD: padded diamonds, bronze buttons.
    g.fillStyle(FELT_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let y = 6; y < 100; y += 22) for (let x = ((y / 22) % 2) * 11; x < W; x += 22) {
      g.fillStyle(FELT, 1); g.fillEllipse(x + 11, y + 9, 18, 14);
      g.fillStyle(BRONZE, 1); g.fillCircle(x, y, 1.6);
    }
    // The voice-pipe: brass, up the wall from a funnel at the centre, a valve wheel, frost on it.
    const px = W / 2;
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(px - 12, 0, 24, 92);
    g.fillStyle(BRONZE, 1); g.fillRect(px - 9, 0, 18, 92);
    g.fillStyle(BRONZE_LIT, 1); g.fillRect(px - 6, 0, 4, 92);
    g.fillStyle(BRONZE, 1); g.fillTriangle(px - 34, 104, px + 34, 104, px, 70);
    g.fillStyle(0x1a1610, 1); g.fillEllipse(px, 104, 60, 12);
    g.lineStyle(3, IRON, 1); g.strokeCircle(px + 26, 40, 11); g.lineBetween(px + 15, 40, px + 37, 40); g.lineBetween(px + 26, 29, px + 26, 51);
    for (let i = 0; i < 8; i++) { g.fillStyle(SNOW_LIT, 0.6); g.fillCircle(px - 8 + rng() * 16, 10 + rng() * 80, 1.5); }
    // Pegs of ribbons along the back wall, waiting.
    for (let x = 40; x < W - 30; x += 46) {
      if (Math.abs(x - px) < 60) continue;
      g.fillStyle(IRON, 1); g.fillRect(x - 2, 84, 4, 8);
      ribbon(g, x, 90, 20, x * 0.01, x * 0.3, SILK, 0.9, 0.2);
    }
    g.fillStyle(FELT_PLUM, 1); g.fillRect(0, 102, W, 8);
    // Padded side walls.
    for (const x0 of [0, W - 30]) {
      g.fillStyle(FELT_DARK, 1); g.fillRect(x0, TOP, 30, H - TOP);
      for (let y = TOP + 10; y < H; y += 30) { g.fillStyle(FELT, 1); g.fillRoundedRect(x0 + 4, y, 22, 24, 6); g.fillStyle(BRONZE, 1); g.fillCircle(x0 + 15, y + 12, 1.4); }
    }
    // Snow blown in under the two doors (bottom left and right).
    for (const [x, y] of [[90, H - 20], [W - 90, H - 20]] as [number, number][]) {
      for (let i = 0; i < 9; i++) { g.fillStyle(i % 2 ? SNOW : SNOW_SHADE, 0.85); g.fillEllipse(x + (rng() - 0.5) * 150, y - rng() * 60, 50 + rng() * 60, 16 + rng() * 10); }
      g.fillStyle(FELT_PLUM, 1); g.fillRect(x - 50, H - 10, 100, 10);
    }
    // The stitched mouth inlaid at the centre, and a ring of lamplight round it.
    const cx = W / 2, cy = (H + TOP) / 2;
    g.lineStyle(10, SILK, 0.18); g.strokeCircle(cx, cy, 150);
    stitchedMouth(g, cx, cy, 90, SILK, 0.25);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      glow(g, cx + Math.cos(a) * 250, cy + Math.sin(a) * 170, 30, LAMP_GLOW, 0.03, 3);
      g.fillStyle(LAMP, 0.25); g.fillCircle(cx + Math.cos(a) * 250, cy + Math.sin(a) * 170, 4);
    }
    // A cold blue wash, as in a room with no fire.
    g.fillStyle(0x9ec2e6, 0.05); g.fillRect(0, TOP, W, H - TOP);
  },
};
