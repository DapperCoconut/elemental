import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { S, drawBolt, drawCloud, drawHailstone, jit, segDist, wrapA } from './util';

/**
 * PRINCE SQUALL — King Aerion's second child, the Forecaster of the Stormeye Court.
 *
 * Squall is never wrong about the weather, because he is the weather. Up in the Barometer Tower he
 * holds the storm's eye open over the town by main force, and every dawn he posts the forecast —
 * which is a debt-list. Streets in arrears are named for "weather", and that night the wall behind
 * them comes down and he points the gale at them. He talks in bulletins. He is delighted by himself.
 *
 * Phase one, *Gathering Clouds*, he drifts in a raincloud of his own: forked lightning drawn on the
 * floor and struck along its branches a beat later, and rain bands — walls of downpour with a gap
 * in each — marching across the gallery. Phase two, *The Eye Closes*, he circles you inside a ring of
 * cloud: the eye of the storm shrinks round a point until only a little calm is left, then bursts
 * outward; tornadoes wind across the floor down paths he chalks first. On hard, *Perfect Storm*:
 * the gallery is cut into a forecast wheel — rain, lightning, gale, and one calm quarter, turning —
 * while hail sweeps the room in fronts with a winding gap.
 *
 * His silhouette is a man with weather for a hat: a raincloud over his head raining on his shoulders
 * and two copper lightning rods for a crest. Then a ring of cloud spinning round him with a funnel
 * twisting down from his feet. Then the four weathers orbiting him as sigils, lightning arcing
 * between the blades of his crown.
 */

const SKY = 0x5a6a9a;
const SKY_LIT = 0xd8e4ff;
const SKY_DARK = 0x22243a;
const VIOLET = 0xb8a8ff;

const FIELD_TOP = 96;

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

// ── Signature: Forked Lightning ──────────────────────────────────────
// Lightning trees drawn on the floor before they strike: a trunk from a root (one on you), splitting
// twice into branches. They flicker faint, then fire — the trunk first, the branches a beat after,
// running outward along exactly the lines shown. Stand between the branches, not on them.

interface Seg { x1: number; y1: number; x2: number; y2: number; depth: number }
interface Fork { segs: Seg[]; rx: number; ry: number; showAt: number; fireAt: number; hit: boolean; sounded: boolean; seed: number }

const FORK_STEP = 120;

const forks = (tk: BossToolkit): SignatureMove => {
  let fs: Fork[] = [];
  const grow = (out: Seg[], x: number, y: number, a: number, len: number, depth: number): void => {
    const x2 = Phaser.Math.Clamp(x + Math.cos(a) * len, 20, tk.W - 20);
    const y2 = Phaser.Math.Clamp(y + Math.sin(a) * len, FIELD_TOP + 10, tk.H - 14);
    out.push({ x1: x, y1: y, x2, y2, depth });
    if (depth >= 2) return;
    const spread = 0.45 + Math.random() * 0.35;
    grow(out, x2, y2, a - spread, len * 0.66, depth + 1);
    grow(out, x2, y2, a + spread, len * 0.66, depth + 1);
  };
  return {
    durationMs: 2700,
    windupMs: 600,
    tell: 'FORKED LIGHTNING',
    gesture: 'point',
    cast(time: number) {
      fs = [];
      const p = tk.player;
      const n = tk.hard ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const off = i === 0 ? 0 : 120 + Math.random() * 120;
        const oa = Math.random() * Math.PI * 2;
        const rx = tk.clampX(p.x + Math.cos(oa) * off, 50), ry = tk.clampY(p.y + Math.sin(oa) * off, 50);
        const segs: Seg[] = [];
        grow(segs, rx, ry, Math.random() * Math.PI * 2, 190 + Math.random() * 60, 0);
        const showAt = time + i * 380;
        fs.push({ segs, rx, ry, showAt, fireAt: showAt + tk.warn(1100), hit: false, sounded: false, seed: Math.random() * 1000 });
      }
      tk.sfx('electric-charge');
    },
    update(time: number) {
      const p = tk.player;
      for (const f of fs) {
        if (time < f.fireAt || f.hit) continue;
        for (const s of f.segs) {
          const litAt = f.fireAt + s.depth * FORK_STEP;
          if (time < litAt || time > litAt + 140) continue;
          if (segDist(p.x, p.y, s.x1, s.y1, s.x2, s.y2) < 18) { f.hit = true; tk.hitPlayer(15, p.x, p.y); tk.sfx('zap'); break; }
        }
      }
      for (const f of fs) if (time >= f.fireAt && !f.sounded) { f.sounded = true; tk.sfx('thunder'); }
      fs = fs.filter((f) => time < f.fireAt + FORK_STEP * 3 + 700);
    },
    drawGround(g, time) {
      for (const f of fs) {
        if (time < f.showAt) continue;
        if (time < f.fireAt) {
          const k = clamp((time - f.showAt) / (f.fireAt - f.showAt), 0, 1);
          const flick = Math.floor(time / 70 + f.seed) % 4 === 0 ? 0.5 : 1;
          for (const s of f.segs) {
            g.lineStyle(9 - s.depth * 2, VIOLET, (0.08 + k * 0.16) * flick); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
            g.lineStyle(1.5, SKY_LIT, (0.25 + k * 0.55) * flick); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          }
          g.lineStyle(2, SKY_LIT, 0.5 + k * 0.4); g.strokeCircle(f.rx, f.ry, 26 - k * 10);
          if (k > 0.82 && Math.floor(time / 80) % 2 === 0) { g.fillStyle(0xffffff, 0.3); g.fillCircle(f.rx, f.ry, 14); }
        } else {
          // Scorch along every branch that has fired.
          for (const s of f.segs) {
            const litAt = f.fireAt + s.depth * FORK_STEP;
            if (time < litAt) continue;
            const a = clamp(1 - (time - litAt) / 900, 0, 1);
            g.lineStyle(5, 0x0c0e14, 0.5 * a); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const f of fs) {
        if (time < f.fireAt) continue;
        for (let i = 0; i < f.segs.length; i++) {
          const s = f.segs[i];
          const litAt = f.fireAt + s.depth * FORK_STEP;
          const since = time - litAt;
          if (since < 0 || since > 280) continue;
          const a = 1 - since / 280;
          drawBolt(g, s.x1, s.y1, s.x2, s.y2, f.seed + i * 7, a, 4 - s.depth, 14 - s.depth * 3);
        }
        // The root: a bolt straight down from the cloud into it.
        const since = time - f.fireAt;
        if (since < 200) drawBolt(g, f.rx + 20, FIELD_TOP - 30, f.rx, f.ry, f.seed + 99, 1 - since / 200, 5, 26);
      }
    },
    onPhaseEnd() { fs = []; },
  };
};

// ── Signature: Rain Bands ────────────────────────────────────────────
// Walls of downpour march across the gallery from his side toward yours, one behind another. In a
// band you are slowed and soaked for steady damage — but every band has one gap in it, a lighter
// patch where the rain thins, and the gap in the next band is never far from the last. Walk through
// the gaps; the bands are a little slower than you, so you can also outwalk them for a while.

interface Band { s0: number; gap: number }

const BAND_HALF = 48;
const BAND_GAP = 62;
const BAND_SPACING = 250;
const BAND_SPEED = 170;

const rainbands = (tk: BossToolkit): SignatureMove => {
  let bands: Band[] = [];
  let nx = 1, ny = 0, ux = 0, uy = 1;
  let moveAt = 0, castAt = 0, endS = 0, uMin = 0, uMax = 0;
  let lastTick = 0;
  let live = false;
  const corners = (): { x: number; y: number }[] => [{ x: 0, y: FIELD_TOP }, { x: tk.W, y: FIELD_TOP }, { x: 0, y: tk.H }, { x: tk.W, y: tk.H }];
  const sOf = (b: Band, time: number): number => b.s0 + Math.max(0, time - moveAt) / 1000 * BAND_SPEED;
  return {
    durationMs: 3200,
    windupMs: 650,
    tell: 'RAIN BANDS',
    hold: 'conduct',
    cast(time: number) {
      const p = tk.player;
      const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) + (Math.random() - 0.5) * 0.6;
      nx = Math.cos(a); ny = Math.sin(a); ux = -ny; uy = nx;
      const ps = corners().map((c) => c.x * nx + c.y * ny);
      const us = corners().map((c) => c.x * ux + c.y * uy);
      const sMin = Math.min(...ps), sMax = Math.max(...ps);
      uMin = Math.min(...us); uMax = Math.max(...us);
      const count = tk.hard ? 4 : 3;
      let gap = Phaser.Math.Clamp(p.x * ux + p.y * uy + (Math.random() - 0.5) * 200, uMin + 90, uMax - 90);
      bands = [];
      for (let i = 0; i < count; i++) {
        bands.push({ s0: sMin - BAND_HALF * 0.4 - i * BAND_SPACING, gap });
        gap = Phaser.Math.Clamp(gap + (Math.random() - 0.5) * 300, uMin + 90, uMax - 90);
      }
      endS = sMax + BAND_HALF + 20;
      castAt = time;
      moveAt = time + tk.warn(900);
      live = true;
      tk.sfx('rain');
    },
    update(time: number) {
      if (!live) return;
      const last = bands[bands.length - 1];
      if (!last || sOf(last, time) > endS) { live = false; return; }
      if (time < moveAt) return;
      const p = tk.player;
      const pn = p.x * nx + p.y * ny, pu = p.x * ux + p.y * uy;
      for (const b of bands) {
        const s = sOf(b, time);
        if (Math.abs(pn - s) < BAND_HALF && Math.abs(pu - b.gap) > BAND_GAP) {
          tk.slowPlayer(0.6, 260);
          if (time - lastTick > 450) { lastTick = time; tk.hitPlayer(5, p.x, p.y); }
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!live) return;
      const warm = time < moveAt;
      const k = warm ? clamp((time - castAt) / (moveAt - castAt), 0, 1) : 1;
      const at = (s: number, u: number) => ({ x: nx * s + ux * u, y: ny * s + uy * u });
      for (const b of bands) {
        const s = sOf(b, time);
        const parts: [number, number][] = [[uMin, b.gap - BAND_GAP], [b.gap + BAND_GAP, uMax]];
        for (const [u0, u1] of parts) {
          if (u1 <= u0) continue;
          const A = at(s, u0), B = at(s, u1);
          g.lineStyle(BAND_HALF * 2, S.waterDeep, (warm ? 0.12 : 0.3) * k); g.lineBetween(A.x, A.y, B.x, B.y);
          const F1 = at(s + BAND_HALF, u0), F2 = at(s + BAND_HALF, u1);
          g.lineStyle(3, S.rain, 0.7 * k); g.lineBetween(F1.x, F1.y, F2.x, F2.y);
        }
        // The gap: a lighter window, edged in sky.
        const G1 = at(s - BAND_HALF, b.gap - BAND_GAP), G2 = at(s + BAND_HALF, b.gap - BAND_GAP);
        const G3 = at(s - BAND_HALF, b.gap + BAND_GAP), G4 = at(s + BAND_HALF, b.gap + BAND_GAP);
        g.lineStyle(2, SKY_LIT, 0.6 * k); g.lineBetween(G1.x, G1.y, G2.x, G2.y); g.lineBetween(G3.x, G3.y, G4.x, G4.y);
        const GC = at(s, b.gap);
        g.fillStyle(S.eye, 0.12 * k); g.fillCircle(GC.x, GC.y, BAND_GAP * 0.8);
        // Splash rings along the band's foot.
        for (let i = 0; i < 16; i++) {
          const u = uMin + jit(i, b.s0) * (uMax - uMin);
          if (Math.abs(u - b.gap) < BAND_GAP) continue;
          const ph = (time / 400 + jit(i, 3)) % 1;
          const P = at(s + (jit(i, 5) - 0.5) * BAND_HALF * 1.6, u);
          g.lineStyle(1, S.rain, 0.6 * (1 - ph) * k); g.strokeEllipse(P.x, P.y, 4 + ph * 14, 2 + ph * 5);
        }
      }
    },
    drawAir(g, time) {
      if (!live || time < moveAt - 200) return;
      // The rain itself: slanting streaks falling through each band.
      for (const b of bands) {
        const s = sOf(b, time);
        for (let i = 0; i < 60; i++) {
          const u = uMin + jit(i, b.gap) * (uMax - uMin);
          if (Math.abs(u - b.gap) < BAND_GAP) continue;
          const off = (jit(i, 9) - 0.5) * BAND_HALF * 2;
          const x = nx * (s + off) + ux * u, y = ny * (s + off) + uy * u;
          if (x < -10 || x > tk.W + 10 || y < FIELD_TOP - 10 || y > tk.H + 10) continue;
          const fall = ((time / 1000) * 3 + jit(i, 2)) % 1;
          const yy = y - 30 + fall * 30;
          g.lineStyle(1.2, S.rain, 0.75); g.lineBetween(x - 4, yy - 12, x, yy);
        }
      }
    },
    onPhaseEnd() { live = false; bands = []; },
  };
};

// ── Signature: The Eye Closes ────────────────────────────────────────
// The storm comes in on every side. A circle of calm is all that is left — it shrinks round a
// point near you, slower than you can walk, and outside it the cloud wall batters and drags. When it
// is small it holds a breath — and bursts outward from its middle as a ring with one notch in it,
// shown on the rim while it holds. Stand on the notch's side.

const EYE_R0 = 520;
const EYE_MIN = 130;
const EYE_SHRINK = 125;

const eyewall = (tk: BossToolkit): SignatureMove => {
  let cx = 0, cy = 0, gapA = 0;
  let castAt = 0, closeAt = 0, shutAt = 0, burstAt = 0;
  let live = false, burst = false, lastTick = 0;
  const radius = (time: number): number => {
    if (time < closeAt) return EYE_R0;
    return Math.max(EYE_MIN, EYE_R0 - ((time - closeAt) / 1000) * EYE_SHRINK);
  };
  return {
    durationMs: 4600,
    windupMs: 700,
    tell: 'THE EYE CLOSES',
    hold: 'brace',
    cast(time: number) {
      const p = tk.player;
      const mx = tk.W / 2, my = (tk.H + FIELD_TOP) / 2;
      cx = Phaser.Math.Clamp(p.x + (mx - p.x) * 0.4, EYE_MIN + 20, tk.W - EYE_MIN - 20);
      cy = Phaser.Math.Clamp(p.y + (my - p.y) * 0.4, FIELD_TOP + EYE_MIN, tk.H - EYE_MIN);
      castAt = time;
      closeAt = time + tk.warn(700);
      shutAt = closeAt + ((EYE_R0 - EYE_MIN) / EYE_SHRINK) * 1000;
      burstAt = shutAt + tk.warn(900);
      gapA = Math.random() * Math.PI * 2;
      live = true; burst = false;
      tk.sfx('tornado');
    },
    update(time: number) {
      if (!live) return;
      if (!burst && time >= burstAt) {
        burst = true;
        // From the very middle of the eye, so standing in the calm is no shelter: stand in the notch.
        tk.spawnRing({ cx, cy, delayMs: 0, speed: 340, gapCentre: gapA, gapHalf: 0.5, band: 22, damage: 14, startRadius: 0 });
        tk.sfx('thunder');
      }
      if (time > burstAt + 400) { live = false; return; }
      if (burst) return;
      const p = tk.player;
      if (Math.hypot(p.x - cx, p.y - cy) > radius(time) && time >= closeAt) {
        tk.slowPlayer(0.72, 300);
        if (time - lastTick > 450) { lastTick = time; tk.hitPlayer(6, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      if (!live || burst) return;
      const r = radius(time);
      const k = clamp((time - castAt) / (closeAt - castAt), 0, 1);
      // The storm everywhere but the eye.
      g.lineStyle(1400, S.galeDark, 0.5 * k); g.strokeCircle(cx, cy, r + 700);
      // Rain driven round the wall.
      for (let i = 0; i < 70; i++) {
        const rr = r + 20 + jit(i, 1) * 420;
        const a = jit(i, 2) * Math.PI * 2 - time / 1000 * (300 / rr);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (x < 0 || x > tk.W || y < FIELD_TOP || y > tk.H) continue;
        g.lineStyle(1.2, S.rain, 0.4 * k); g.lineBetween(x, y, cx + Math.cos(a - 0.1) * rr, cy + Math.sin(a - 0.1) * rr);
      }
      g.fillStyle(S.eye, 0.1); g.fillCircle(cx, cy, r);
      // The notch the burst will leave, shown from the moment it holds.
      if (time >= shutAt) {
        const h = clamp((time - shutAt) / (burstAt - shutAt), 0, 1);
        g.lineStyle(10, SKY_LIT, 0.4 + h * 0.5);
        g.beginPath(); g.arc(cx, cy, r + 8, gapA - 0.5, gapA + 0.5, false); g.strokePath();
        g.lineStyle(2, SKY_LIT, 0.5); g.lineBetween(cx, cy, cx + Math.cos(gapA) * (r + 60), cy + Math.sin(gapA) * (r + 60));
      }
    },
    drawAir(g, time) {
      if (!live || burst) return;
      const r = radius(time);
      // The cloud wall standing round the eye, puffs wheeling.
      const n = Math.max(18, Math.floor(r / 9));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - time / 1200;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (x < -30 || x > tk.W + 30 || y < FIELD_TOP - 30 || y > tk.H + 30) continue;
        g.fillStyle(i % 3 === 0 ? S.cloudLit : S.cloud, 0.75); g.fillCircle(x, y, 18 + Math.sin(time / 260 + i) * 4);
      }
      // Lightning walking in the wall.
      const slot = Math.floor(time / 260);
      const a = jit(slot, 7) * Math.PI * 2;
      if ((time % 260) < 90) {
        const x = cx + Math.cos(a) * (r + 30), y = cy + Math.sin(a) * (r + 30);
        drawBolt(g, x, y - 60, x + 10, y + 10, slot, 0.8, 2, 10);
      }
    },
    onPhaseEnd() { live = false; },
  };
};

// ── Signature: Tornadoes ─────────────────────────────────────────────
// He chalks a winding path across the floor from the edge — two or three of them — and down each a
// twister follows, weaving as it goes. Touch one and it hurts, drags you toward its middle for a
// moment and spits you out slowed. The paths are drawn in full before anything moves.

interface Twister { pts: { x: number; y: number }[]; L: number; goAt: number; showAt: number; lastHit: number; seed: number }

const TWIST_SPEED = 240;
const TWIST_R = 34;

const pathPoint = (tw: Twister, s: number): { x: number; y: number } => {
  const step = tw.L / (tw.pts.length - 1);
  const i = Math.min(tw.pts.length - 2, Math.floor(s / step));
  const u = clamp((s - i * step) / step, 0, 1);
  const a = tw.pts[i], b = tw.pts[i + 1];
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
};

const tornado = (tk: BossToolkit): SignatureMove => {
  let tws: Twister[] = [];
  return {
    durationMs: 3000,
    windupMs: 700,
    tell: 'TORNADOES',
    gesture: 'sweep',
    cast(time: number) {
      tws = [];
      const p = tk.player;
      const n = tk.hard ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const side = Math.floor(Math.random() * 4);
        const sx = side === 0 ? 10 : side === 1 ? tk.W - 10 : 60 + Math.random() * (tk.W - 120);
        const sy = side === 2 ? FIELD_TOP + 6 : side === 3 ? tk.H - 6 : FIELD_TOP + 40 + Math.random() * (tk.H - FIELD_TOP - 80);
        const tx = p.x + (Math.random() - 0.5) * 120, ty = p.y + (Math.random() - 0.5) * 120;
        const a = Math.atan2(ty - sy, tx - sx);
        const len = 1100;
        const amp = 40 + Math.random() * 30, ph = Math.random() * Math.PI * 2;
        const pts: { x: number; y: number }[] = [];
        for (let k = 0; k <= 40; k++) {
          const u = k / 40;
          const w = Math.sin(u * Math.PI * 3 + ph) * amp;
          const x = sx + Math.cos(a) * len * u - Math.sin(a) * w;
          const y = sy + Math.sin(a) * len * u + Math.cos(a) * w;
          pts.push({ x, y });
          if (x < -30 || x > tk.W + 30 || y < FIELD_TOP - 30 || y > tk.H + 30) break;
        }
        let L = 0;
        for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
        tws.push({ pts, L, showAt: time + i * 300, goAt: time + tk.warn(1000) + i * 500, lastHit: 0, seed: Math.random() * 100 });
      }
      tk.sfx('tornado');
    },
    update(time: number) {
      const p = tk.player;
      for (const tw of tws) {
        if (time < tw.goAt) continue;
        const s = ((time - tw.goAt) / 1000) * TWIST_SPEED;
        if (s > tw.L) continue;
        const q = pathPoint(tw, s);
        if (Math.hypot(p.x - q.x, p.y - q.y) < TWIST_R + 14 && time - tw.lastHit > 800) {
          tw.lastHit = time;
          tk.hitPlayer(14, p.x, p.y);
          tk.pull(q.x, q.y, 120, 350);
          tk.slowPlayer(0.6, 700);
          tk.sfx('gust');
        }
      }
      tws = tws.filter((tw) => time < tw.goAt + (tw.L / TWIST_SPEED) * 1000 + 300);
    },
    drawGround(g, time) {
      for (const tw of tws) {
        if (time < tw.showAt) continue;
        const travelled = time < tw.goAt ? 0 : ((time - tw.goAt) / 1000) * TWIST_SPEED;
        const k = clamp((time - tw.showAt) / Math.max(1, tw.goAt - tw.showAt), 0, 1);
        // The chalked path ahead of it: dashes, with chevrons pointing the way.
        let acc = 0;
        for (let i = 1; i < tw.pts.length; i++) {
          const a = tw.pts[i - 1], b = tw.pts[i];
          const seg = Math.hypot(b.x - a.x, b.y - a.y);
          acc += seg;
          if (acc < travelled) continue;
          if (i % 2 === 0) { g.lineStyle(TWIST_R * 1.6, SKY_DARK, 0.1 * k); g.lineBetween(a.x, a.y, b.x, b.y); }
          g.lineStyle(2, SKY_LIT, (0.25 + k * 0.45) * (i % 2 ? 1 : 0.4)); g.lineBetween(a.x, a.y, b.x, b.y);
          if (i % 5 === 0) {
            const an = Math.atan2(b.y - a.y, b.x - a.x);
            g.lineStyle(2.5, VIOLET, 0.6 * k);
            g.lineBetween(b.x - Math.cos(an - 0.5) * 12, b.y - Math.sin(an - 0.5) * 12, b.x, b.y);
            g.lineBetween(b.x - Math.cos(an + 0.5) * 12, b.y - Math.sin(an + 0.5) * 12, b.x, b.y);
          }
        }
        if (time >= tw.goAt && travelled <= tw.L) {
          const q = pathPoint(tw, travelled);
          // A skirt of dust and spray thrown round its foot.
          g.fillStyle(0x000000, 0.25); g.fillEllipse(q.x, q.y + 6, TWIST_R * 2.4, TWIST_R * 0.9);
          for (let i = 0; i < 10; i++) {
            const a = time / 120 + (i / 10) * Math.PI * 2;
            g.fillStyle(S.slateLit, 0.45); g.fillCircle(q.x + Math.cos(a) * TWIST_R * 1.1, q.y + 6 + Math.sin(a) * TWIST_R * 0.4, 2.5);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const tw of tws) {
        if (time < tw.goAt) continue;
        const s = ((time - tw.goAt) / 1000) * TWIST_SPEED;
        if (s > tw.L) continue;
        const q = pathPoint(tw, s);
        // The funnel: stacked rings widening upward, each slewed a little further by the turn.
        for (let k = 0; k < 11; k++) {
          const y = q.y - k * 13;
          const sway = Math.sin(time / 180 + k * 0.6 + tw.seed) * k * 1.6;
          const rx = 7 + k * 4.4;
          g.fillStyle(k % 2 ? S.cloud : S.cloudDark, 0.62 + k * 0.02); g.fillEllipse(q.x + sway, y, rx * 2, rx * 0.55);
          g.lineStyle(1.5, S.cloudLit, 0.6);
          const a0 = (time / 90 + k) % (Math.PI * 2);
          g.beginPath(); g.arc(q.x + sway, y, rx, a0, a0 + 1.4, false); g.strokePath();
        }
        // Debris whirled round it.
        for (let i = 0; i < 5; i++) {
          const a = time / 110 + (i / 5) * Math.PI * 2;
          const h = 20 + ((i * 23 + time / 20) % 110);
          const r = 10 + h * 0.3;
          g.fillStyle(i % 2 ? S.timber : S.slateDark, 1); g.fillRect(q.x + Math.cos(a) * r - 2, q.y - h + Math.sin(a) * r * 0.3 - 2, 4, 4);
        }
      }
    },
    onPhaseEnd() { tws = []; },
  };
};

// ── Signature: Hail Front (hard) ─────────────────────────────────────
// A front of hail sweeps down the gallery row by row. Every row is shadowed in full a moment before
// it lands, save one gap two stones wide — and each row's gap is at most one stone over from the
// row before. Find the gap and walk it down the room.

interface HailRow { y: number; gap: number; landAt: number; showAt: number; landed: boolean; seed: number }

const HAIL_CELL = 80;
const HAIL_R = 40;

const hailfront = (tk: BossToolkit): SignatureMove => {
  let rows: HailRow[] = [];
  const cols = (): number => Math.floor((tk.W - 40) / HAIL_CELL) + 1;
  const cellX = (i: number): number => 40 + i * HAIL_CELL;
  return {
    durationMs: 3200,
    windupMs: 650,
    tell: 'HAIL FRONT',
    gesture: 'slam',
    cast(time: number) {
      rows = [];
      const p = tk.player;
      const n = cols();
      let gap = Phaser.Math.Clamp(Math.round((p.x - 40) / HAIL_CELL), 0, n - 2);
      const fromTop = p.y > (tk.H + FIELD_TOP) / 2 || Math.random() < 0.5;
      const count = 7;
      for (let j = 0; j < count; j++) {
        const y = fromTop ? FIELD_TOP + 44 + j * 78 : tk.H - 30 - j * 78;
        const showAt = time + j * 240;
        rows.push({ y, gap, showAt, landAt: showAt + tk.warn(950), landed: false, seed: Math.random() * 100 });
        gap = Phaser.Math.Clamp(gap + (Math.floor(Math.random() * 3) - 1), 0, n - 2);
      }
      tk.sfx('ice-shard');
    },
    update(time: number) {
      const p = tk.player;
      for (const r of rows) {
        if (r.landed || time < r.landAt) continue;
        r.landed = true;
        tk.sfx('frost-blast');
        if (Math.abs(p.y - r.y) > HAIL_R + 4) continue;
        const inGap = p.x > cellX(r.gap) - HAIL_R + 6 && p.x < cellX(r.gap + 1) + HAIL_R - 6;
        if (!inGap) tk.hitPlayer(12, p.x, p.y);
      }
      rows = rows.filter((r) => !r.landed || time < r.landAt + 600);
    },
    drawGround(g, time) {
      for (const r of rows) {
        if (time < r.showAt) continue;
        const n = cols();
        if (!r.landed) {
          const k = clamp((time - r.showAt) / (r.landAt - r.showAt), 0, 1);
          for (let i = 0; i < n; i++) {
            if (i === r.gap || i === r.gap + 1) continue;
            const x = cellX(i);
            g.fillStyle(0x0a0e16, 0.12 + k * 0.32); g.fillEllipse(x, r.y, HAIL_R * 2, HAIL_R * 1.1);
            g.lineStyle(1.5, S.hailShade, 0.4 + k * 0.4); g.strokeEllipse(x, r.y, HAIL_R * 2, HAIL_R * 1.1);
          }
          // The gap, edged in clear sky.
          const gx = (cellX(r.gap) + cellX(r.gap + 1)) / 2;
          g.lineStyle(2, S.eyeLit, 0.5 + k * 0.4); g.strokeRoundedRect(gx - HAIL_CELL + 6, r.y - HAIL_R * 0.6, HAIL_CELL * 2 - 12, HAIL_R * 1.2, 10);
        } else {
          const f = clamp(1 - (time - r.landAt) / 600, 0, 1);
          for (let i = 0; i < n; i++) {
            if (i === r.gap || i === r.gap + 1) continue;
            for (let s = 0; s < 4; s++) drawHailstone(g, cellX(i) + (jit(r.seed + i, s) - 0.5) * 50, r.y + (jit(r.seed + i, s + 4) - 0.5) * 30, 3, f);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const r of rows) {
        if (r.landed || time < r.showAt) continue;
        const k = clamp((time - r.showAt) / (r.landAt - r.showAt), 0, 1);
        if (k < 0.5) continue;
        const u = (k - 0.5) / 0.5;
        const n = cols();
        for (let i = 0; i < n; i++) {
          if (i === r.gap || i === r.gap + 1) continue;
          for (let s = 0; s < 3; s++) {
            const x = cellX(i) + (jit(r.seed + i, s + 9) - 0.5) * 50;
            const y = r.y - (1 - u) * 260 + (jit(r.seed + i, s + 12) - 0.5) * 24;
            g.lineStyle(1, S.hail, 0.4); g.lineBetween(x - 3, y - 16, x, y);
            drawHailstone(g, x, y, 4, 0.95);
          }
        }
      }
    },
    onPhaseEnd() { rows = []; },
  };
};

// ── Signature: Perfect Storm — the Forecast Wheel (hard) ─────────────
// The gallery is cut into four quarters round its middle and each is given a weather: RAIN (slow
// and soaking), LIGHTNING (bolts called on wherever you stand in it), GALE (dragged toward its corner
// and battered) — and one CALM. Hail falls over all three storm quarters at once. Every so often
// the great needle at the hub swings a quarter-turn and the weathers all move round with it; the
// quarter that is about to fall calm blinks first.

type Weather = 'calm' | 'rain' | 'lightning' | 'gale';
const WHEEL_ORDER: Weather[] = ['calm', 'rain', 'lightning', 'gale'];
const WHEEL_STEP = 1800;

interface Mark { x: number; y: number; at: number; landAt: number; r: number; dmg: number; kind: 'bolt' | 'hail'; done: boolean; seed: number }

const wheel = (tk: BossToolkit): SignatureMove => {
  let calmQ = 0, startAt = 0, endAt = 0, castAt = 0;
  let live = false;
  let marks: Mark[] = [];
  let lastTick = 0, lastBolt = 0, lastHail = 0;
  const hub = (): { x: number; y: number } => ({ x: tk.W / 2, y: (tk.H + FIELD_TOP) / 2 });
  const quadOf = (x: number, y: number): number => {
    const h = hub();
    const a = (Math.atan2(y - h.y, x - h.x) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(a / (Math.PI / 2)) % 4;
  };
  const calmAt = (time: number): number => (time < startAt ? calmQ : (calmQ + Math.floor((time - startAt) / WHEEL_STEP)) % 4);
  const weatherOf = (q: number, time: number): Weather => WHEEL_ORDER[(q - calmAt(time) + 4) % 4];
  const corner = (q: number): { x: number; y: number } => {
    const a = (q + 0.5) * (Math.PI / 2);
    return { x: Math.cos(a) > 0 ? tk.W - 30 : 30, y: Math.sin(a) > 0 ? tk.H - 20 : FIELD_TOP + 10 };
  };
  const randIn = (q: number): { x: number; y: number } => {
    const h = hub();
    const a = (q + 0.1 + Math.random() * 0.8) * (Math.PI / 2);
    const d = 80 + Math.random() * 380;
    return { x: tk.clampX(h.x + Math.cos(a) * d, 40), y: tk.clampY(h.y + Math.sin(a) * d * 0.7, 40) };
  };
  return {
    durationMs: 3600,
    windupMs: 800,
    tell: 'PERFECT STORM',
    hold: 'conduct',
    cast(time: number) {
      const p = tk.player;
      // The first calm is the quarter beside yours — you have to move from the start.
      calmQ = (quadOf(p.x, p.y) + 1) % 4;
      castAt = time;
      startAt = time + tk.warn(1100);
      endAt = startAt + WHEEL_STEP * 4;
      marks = [];
      live = true;
      tk.sfx('boss-phase');
    },
    update(time: number) {
      if (!live) return;
      if (time > endAt) { live = false; marks = []; return; }
      const p = tk.player;
      if (time >= startAt) {
        const q = quadOf(p.x, p.y);
        const w = weatherOf(q, time);
        if (w === 'rain') {
          tk.slowPlayer(0.6, 220);
          if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(4, p.x, p.y); }
        } else if (w === 'gale') {
          const c = corner(q);
          tk.pull(c.x, c.y, 110, 220);
          if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(3, p.x, p.y); }
        } else if (w === 'lightning' && time - lastBolt > 750) {
          lastBolt = time;
          marks.push({ x: p.x, y: p.y, at: time, landAt: time + tk.warn(650), r: 42, dmg: 14, kind: 'bolt', done: false, seed: Math.random() * 100 });
        }
        // Hail over every stormy quarter.
        if (time - lastHail > 360) {
          lastHail = time;
          const storms = [0, 1, 2, 3].filter((qq) => weatherOf(qq, time) !== 'calm');
          const qq = storms[Math.floor(Math.random() * storms.length)];
          const pt = randIn(qq);
          marks.push({ x: pt.x, y: pt.y, at: time, landAt: time + tk.warn(800), r: 34, dmg: 9, kind: 'hail', done: false, seed: Math.random() * 100 });
        }
      }
      for (const m of marks) {
        if (m.done || time < m.landAt) continue;
        m.done = true;
        if (Math.hypot(p.x - m.x, p.y - m.y) < m.r) tk.hitPlayer(m.dmg, p.x, p.y);
        tk.sfx(m.kind === 'bolt' ? 'zap' : 'ice-shard');
      }
      marks = marks.filter((m) => !m.done || time < m.landAt + 300);
    },
    drawGround(g, time) {
      if (!live) return;
      const h = hub();
      const k = clamp((time - castAt) / Math.max(1, startAt - castAt), 0, 1);
      const R = 900;
      const next = (calmAt(time) + 1) % 4;
      const toNext = time < startAt ? 1 : 1 - ((time - startAt) % WHEEL_STEP) / WHEEL_STEP;
      for (let q = 0; q < 4; q++) {
        const w = weatherOf(q, time);
        const a0 = q * (Math.PI / 2), a1 = a0 + Math.PI / 2;
        const col = w === 'calm' ? S.eye : w === 'rain' ? S.waterDeep : w === 'lightning' ? 0x3a2a6a : S.galeDark;
        let alpha = (w === 'calm' ? 0.14 : 0.3) * k;
        if (q === next && toNext < 0.35 && Math.floor(time / 110) % 2 === 0) alpha = 0.22;
        g.fillStyle(col, alpha);
        g.beginPath(); g.moveTo(h.x, h.y); g.arc(h.x, h.y, R, a0, a1, false); g.closePath(); g.fillPath();
        // Each weather's own ground.
        if (w === 'rain') {
          for (let i = 0; i < 18; i++) {
            const a = a0 + jit(i, q) * (Math.PI / 2), d = 60 + jit(i, q + 4) * 420;
            const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d * 0.7;
            const ph = (time / 500 + jit(i, 2)) % 1;
            g.lineStyle(1, S.rain, 0.6 * (1 - ph) * k); g.strokeEllipse(x, y, 4 + ph * 16, 2 + ph * 6);
          }
        } else if (w === 'gale') {
          const c = corner(q);
          for (let i = 0; i < 14; i++) {
            const a = a0 + jit(i, q + 8) * (Math.PI / 2), d = 60 + ((time / 3 + jit(i, q + 9) * 400) % 420);
            const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d * 0.7;
            const an = Math.atan2(c.y - y, c.x - x);
            g.lineStyle(1.5, S.galeLit, 0.5 * k); g.lineBetween(x, y, x + Math.cos(an) * 22, y + Math.sin(an) * 22);
          }
        } else if (w === 'lightning' && Math.floor(time / 140 + q) % 5 === 0) {
          const a = a0 + jit(Math.floor(time / 140), q) * (Math.PI / 2), d = 100 + jit(Math.floor(time / 140), q + 1) * 300;
          const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d * 0.7;
          g.lineStyle(1.5, VIOLET, 0.6 * k); g.lineBetween(x - 12, y - 4, x + 4, y + 2); g.lineBetween(x + 4, y + 2, x - 2, y + 10);
        }
      }
      // Boundary spokes.
      for (let q = 0; q < 4; q++) {
        const a = q * (Math.PI / 2);
        g.lineStyle(3, S.brass, 0.6 * k); g.lineBetween(h.x, h.y, h.x + Math.cos(a) * R, h.y + Math.sin(a) * R);
      }
      // Marks: bolt targets (forked rings) and hail shadows.
      for (const m of marks) {
        if (m.done) { const f = 1 - (time - m.landAt) / 300; g.lineStyle(3, m.kind === 'bolt' ? S.bolt : S.hail, f); g.strokeCircle(m.x, m.y, m.r + (1 - f) * 16); continue; }
        const kk = clamp((time - m.at) / (m.landAt - m.at), 0, 1);
        if (m.kind === 'bolt') {
          g.fillStyle(VIOLET, 0.08 + kk * 0.2); g.fillCircle(m.x, m.y, m.r);
          g.lineStyle(2, SKY_LIT, 0.5 + kk * 0.4); g.strokeCircle(m.x, m.y, m.r);
          g.lineStyle(1.5, SKY_LIT, 0.6); g.lineBetween(m.x - m.r * 0.6, m.y, m.x + m.r * 0.6, m.y); g.lineBetween(m.x, m.y - m.r * 0.6, m.x, m.y + m.r * 0.6);
        } else {
          g.fillStyle(0x0a0e16, 0.15 + kk * 0.3); g.fillEllipse(m.x, m.y, m.r * 2, m.r * 1.1);
          g.lineStyle(1.5, S.hailShade, 0.5 + kk * 0.4); g.strokeEllipse(m.x, m.y, m.r * 2, m.r * 1.1);
        }
      }
    },
    drawAir(g, time) {
      if (!live) return;
      const h = hub();
      // The hub: a brass barometer boss with the great needle pointing at the calm quarter.
      const target = (calmAt(time) + 0.5) * (Math.PI / 2);
      const prev = (calmAt(time) - 0.5) * (Math.PI / 2);
      const swing = time < startAt ? 1 : clamp(((time - startAt) % WHEEL_STEP) / 260, 0, 1);
      const a = prev + wrapA(target - prev) * (1 - Math.pow(1 - swing, 3));
      g.fillStyle(S.brassDark, 1); g.fillCircle(h.x, h.y, 30);
      g.fillStyle(S.brass, 1); g.fillCircle(h.x, h.y, 26);
      g.fillStyle(0xf0e8d0, 1); g.fillCircle(h.x, h.y, 20);
      g.lineStyle(6, 0x1a1410, 1); g.lineBetween(h.x, h.y, h.x + Math.cos(a) * 110, h.y + Math.sin(a) * 110 * 0.7);
      g.lineStyle(3, S.red, 1); g.lineBetween(h.x, h.y, h.x + Math.cos(a) * 106, h.y + Math.sin(a) * 106 * 0.7);
      g.fillStyle(S.brassDark, 1); g.fillCircle(h.x, h.y, 6);
      // Bolts and hail coming down on their marks.
      for (const m of marks) {
        if (m.done) {
          if (m.kind === 'bolt' && time - m.landAt < 200) drawBolt(g, m.x + 14, FIELD_TOP - 20, m.x, m.y, m.seed, 1 - (time - m.landAt) / 200, 4, 22);
          continue;
        }
        const kk = clamp((time - m.at) / (m.landAt - m.at), 0, 1);
        if (m.kind === 'hail' && kk > 0.5) {
          const u = (kk - 0.5) / 0.5;
          for (let s = 0; s < 3; s++) drawHailstone(g, m.x + (jit(m.seed, s) - 0.5) * 30, m.y - (1 - u) * 240 + (jit(m.seed, s + 3) - 0.5) * 16, 3.5, 0.95);
        }
      }
    },
    onPhaseEnd() { live = false; marks = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const SQUALL_BOSS: WorldBossDef = {
  worldId: 'isle:squall',
  name: 'Prince Squall',
  title: 'The Forecaster of Stormeye',
  color: SKY,
  colorLit: SKY_LIT,
  colorDark: SKY_DARK,
  accent: VIOLET,
  damageMult: 1.2,

  intro: [
    'TODAY\'S FORECAST: YOU — WITH SCATTERED LIGHTNING.',
    'I am never wrong about the weather. I am the weather. Father lets me keep the eye open, at a modest fee.',
  ],
  banter: [
    'Outlook: worsening. Mostly for you.',
    'Ten-second forecast: a fork, there. And there. And — oh, there.',
    'The calm is a privilege. Privileges are invoiced.',
    'Down there every breath is metered. Up here I breathe the whole storm for nothing.',
    'Rain bands moving in from the west. Mind your step.',
    'Pressure falling. Yours, mostly.',
    'I named a street this morning. Did you hear the wall come down?',
    'Shutters up! Here it comes round again!',
  ],
  defeatLine: 'THE FORECAST CHANGES',
  resumeLine: 'Back again? The outlook has not improved. Neither have you.',

  phases: [
    {
      name: 'Gathering Clouds',
      line: 'Gathering clouds, with a light drizzle of consequences. Umbrellas will not help.',
      hp: 470,
      cycle: ['sig:forks', 'volley', 'sig:rainbands', 'lanes', 'sig:forks', 'radial', 'sig:rainbands', 'homing'],
      harass: ['h-snipe', 'h-flak', 'h-lane'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'The Eye Closes',
      line: 'You want the eye? Then come and stand in it — while I close it.',
      hp: 560,
      cycle: ['sig:eyewall', 'sig:tornado', 'barrage', 'sig:forks', 'spiral', 'sig:tornado', 'minefield', 'sig:eyewall'],
      harass: ['h-orbs', 'h-snipe', 'h-mines'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'EVERY WEATHER AT ONCE',
    extraPhase: {
      name: 'Perfect Storm',
      line: 'A perfect storm. All my life I have wanted to forecast one honestly.',
      hp: 400,
      cycle: ['sig:wheel', 'sig:hailfront', 'sig:tornado', 'sweep', 'sig:wheel', 'sig:forks', 'quake', 'sig:hailfront'],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 850,
      harassMs: 2500,
    },
  },

  tuning: {
    lanes: { halfW: 22 },
    volley: { spreadRad: 0.5 },
    radial: { speed: 230 },
  },

  signatures: { forks, rainbands, eyewall, tornado, hailfront, wheel },

  look: { crest: 'antennae', pattern: 'swirl', aura: 'sparks', hands: 'wisp', torsoR: 34, eyes: 1, eyeColor: 0xd8f0ff, mouth: 'line' },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { pattern: 'static', crest: 'spires', aura: 'smoke', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'tremor', tint: 'void', look: { crest: 'blades', pattern: 'cracks', aura: 'frost', eyes: 3, mouth: 'maw', torsoR: 38 } },
  ],

  /**
   * Weather for a hat. Gathering Clouds: a raincloud hangs over his head and rains on his
   * shoulders, flickering when he casts, and a brass barometer locket hangs on his chest. The Eye
   * Closes: a wall of cloud wheels round him in a ring and a funnel twists down from under him to the
   * floor; his locket's needle has swung to STORMY. Perfect Storm: four weather sigils orbit him —
   * a raindrop, a hailstone, a bolt and a gust-curl — and lightning arcs between the blades of his crown.
   */
  drawDecor(g, s) {
    const Rr = s.radius;
    // The barometer locket on his chest, its needle by phase.
    const lx = s.x + Rr * 0.3, ly = s.y + Rr * 0.18;
    g.fillStyle(S.brassDark, 1); g.fillCircle(lx, ly, 7.5);
    g.fillStyle(S.brass, 1); g.fillCircle(lx, ly, 6.5);
    g.fillStyle(0xf0e8d0, 1); g.fillCircle(lx, ly, 4.8);
    const na = s.phaseIdx === 0 ? Math.PI * 1.25 : s.phaseIdx === 1 ? Math.PI * 0.95 : Math.PI * 0.8 + Math.sin(s.t / 60) * 0.5;
    g.lineStyle(1.2, S.red, 1); g.lineBetween(lx, ly, lx + Math.cos(na) * 4, ly + Math.sin(na) * 4);
    g.lineStyle(1, S.brassDark, 1); g.lineBetween(lx, ly - 7, s.x + Rr * 0.05, s.y - Rr * 0.55);

    if (s.phaseIdx === 0) {
      // The raincloud hat.
      const cy = s.y - Rr * 1.75 + Math.sin(s.t / 500) * 3;
      const flick = s.castGlow > 0.3 && Math.floor(s.t / 70) % 2 === 0;
      drawCloud(g, s.x, cy, Rr * 1.15, 0.95, flick ? S.cloudLit : S.cloudDark, 5);
      // Rain off its belly onto his shoulders and past him.
      for (let i = 0; i < 12; i++) {
        const fx = s.x + (jit(i, 1) - 0.5) * Rr * 2.1;
        const ph = (s.t / 420 + jit(i, 2)) % 1;
        const y0 = cy + Rr * 0.15 + ph * Rr * 2.2;
        g.lineStyle(1.2, S.rain, 0.8 * (1 - ph * 0.6)); g.lineBetween(fx, y0, fx - 2, y0 + 7);
      }
      if (flick) drawBolt(g, s.x - Rr * 0.3, cy + Rr * 0.1, s.x - Rr * 0.6, s.y - Rr * 0.8, Math.floor(s.t / 70), 0.9, 1.5, 6);
    } else if (s.phaseIdx === 1) {
      // The cloud wall wheeling round him.
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - s.t / 700;
        const x = s.x + Math.cos(a) * Rr * 1.65, y = s.y + Math.sin(a) * Rr * 0.75;
        if (Math.sin(a) < 0) { g.fillStyle(S.cloudDark, 0.7); g.fillCircle(x, y, 9 + Math.sin(s.t / 200 + i) * 2); }
      }
      // The funnel twisting down from under him.
      for (let k = 0; k < 7; k++) {
        const y = s.y + Rr * 0.9 + k * 7;
        const sway = Math.sin(s.t / 160 + k * 0.7) * (k * 1.6);
        const rx = Rr * 0.55 - k * 3.4;
        g.fillStyle(k % 2 ? S.cloud : S.cloudDark, 0.75); g.fillEllipse(s.x + sway, y, rx * 2, rx * 0.45);
      }
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - s.t / 700;
        const x = s.x + Math.cos(a) * Rr * 1.65, y = s.y + Math.sin(a) * Rr * 0.75;
        if (Math.sin(a) >= 0) { g.fillStyle(i % 3 ? S.cloud : S.cloudLit, 0.85); g.fillCircle(x, y, 10 + Math.sin(s.t / 200 + i) * 2); }
      }
    } else {
      // The four weathers as sigils, orbiting.
      for (let i = 0; i < 4; i++) {
        const a = s.t / 900 + (i / 4) * Math.PI * 2;
        const x = s.x + Math.cos(a) * Rr * 1.7, y = s.y - Rr * 0.2 + Math.sin(a) * Rr * 0.9;
        g.fillStyle(SKY_DARK, 0.7); g.fillCircle(x, y, 10);
        if (i === 0) { g.fillStyle(S.waterLit, 1); g.fillCircle(x, y + 2, 4.5); g.fillTriangle(x - 4, y + 1, x + 4, y + 1, x, y - 7); }
        else if (i === 1) drawHailstone(g, x, y, 5, 1);
        else if (i === 2) { g.fillStyle(S.boltHot, 1); g.fillTriangle(x - 2, y - 7, x + 4, y - 7, x - 1, y + 1); g.fillTriangle(x - 1, y - 1, x + 5, y - 1, x - 1, y + 8); }
        else { g.lineStyle(2, S.galeLit, 1); g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 1.5, false); g.strokePath(); g.lineBetween(x + 5, y, x + 9, y + 2); }
      }
      // Lightning between the blades of the crown.
      const top = s.y - Rr * 1.25;
      if (Math.floor(s.t / 90) % 3 !== 0) drawBolt(g, s.x - Rr * 0.6, top, s.x + Rr * 0.6, top - 4, Math.floor(s.t / 90), 0.85, 1.5, 8);
      // Hail bouncing off his shoulders.
      for (let i = 0; i < 3; i++) {
        const ph = (s.t / 500 + i / 3) % 1;
        drawHailstone(g, s.x + (i - 1) * Rr * 0.6, s.y - Rr * 1.0 - Math.abs(Math.sin(ph * Math.PI)) * 16, 2.5, 1 - ph * 0.5);
      }
    }
    if (s.castGlow > 0.3) for (const h of s.hands) { g.fillStyle(VIOLET, 0.25 * s.castGlow); g.fillCircle(h.x, h.y, 13); }
  },

  /**
   * The Barometer Gallery at the top of the tower, open to the storm. The floor is the back of the
   * great dial: a disc of green-streaked copper engraved with the five weather bands (STORMY round to
   * VERY DRY) and their ticks, mercury channels inlaid like spokes, and the great needle itself laid
   * across the floor in iron, pointing at STORMY as it always does. Round it, an iron railing — and
   * beyond the railing, nothing but the gale going round.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5c4a11);
    const cx = W / 2, cy = FIELD_TOP + (H - FIELD_TOP) / 2;
    // The gale beyond the railing.
    g.fillStyle(S.galeDark, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const r = 300 + rng() * 420, a = rng() * Math.PI * 2, span = 0.1 + rng() * 0.3;
      g.lineStyle(1 + rng() * 3, rng() < 0.5 ? S.galeLit : S.cloud, 0.15 + rng() * 0.25);
      g.beginPath(); g.arc(cx, cy, r, a, a + span, false); g.strokePath();
    }
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2, r = 420 + rng() * 120;
      drawCloud(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.65, 30 + rng() * 30, 0.5, rng() < 0.5 ? S.cloud : S.cloudDark, i);
    }
    // The gallery floor: an ellipse of copper.
    const RX = W / 2 - 14, RY = (H - FIELD_TOP) / 2 - 6;
    g.fillStyle(dim(S.copper, 0.55), 1); g.fillEllipse(cx, cy, RX * 2 + 14, RY * 2 + 10);
    g.fillStyle(S.copperDark, 1); g.fillEllipse(cx, cy, RX * 2, RY * 2);
    for (let i = 0; i < 26; i++) {
      g.fillStyle(rng() < 0.5 ? S.verdigris : S.copper, 0.25 + rng() * 0.2);
      g.fillEllipse(cx + (rng() - 0.5) * RX * 1.6, cy + (rng() - 0.5) * RY * 1.6, 60 + rng() * 140, 20 + rng() * 50);
    }
    // The five weather bands round the rim.
    const bands = [0x4a4a7a, 0x5a789a, 0x8a9898, 0xc8b880, 0xd8a850];
    for (let i = 0; i < 5; i++) {
      const a0 = Math.PI * (0.75 + i * 0.3), a1 = a0 + Math.PI * 0.3;
      for (let k = 0; k < 24; k++) {
        const a = a0 + (a1 - a0) * (k / 24), b = a0 + (a1 - a0) * ((k + 1) / 24);
        g.lineStyle(26, bands[i], 0.75);
        g.lineBetween(cx + Math.cos(a) * (RX - 30), cy + Math.sin(a) * (RY - 22), cx + Math.cos(b) * (RX - 30), cy + Math.sin(b) * (RY - 22));
      }
    }
    // Ticks.
    for (let i = 0; i <= 60; i++) {
      const a = Math.PI * (0.75 + i * 0.025);
      const L = i % 5 === 0 ? 30 : 16;
      g.lineStyle(i % 5 === 0 ? 3 : 1.5, 0x1a1410, 0.8);
      g.lineBetween(cx + Math.cos(a) * (RX - 52), cy + Math.sin(a) * (RY - 40), cx + Math.cos(a) * (RX - 52 - L), cy + Math.sin(a) * (RY - 40 - L * 0.7));
    }
    // Mercury channels: silver spokes inlaid from the hub.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      g.lineStyle(5, S.slateDark, 1); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 44, cx + Math.cos(a) * (RX - 80), cy + Math.sin(a) * (RY - 60));
      g.lineStyle(2.5, S.mercury, 0.9); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 44, cx + Math.cos(a) * (RX - 80), cy + Math.sin(a) * (RY - 60));
    }
    // The great needle, inlaid in iron, pointing at STORMY.
    const na = Math.PI * 0.86;
    g.lineStyle(14, 0x14161c, 1); g.lineBetween(cx - Math.cos(na) * 90, cy - Math.sin(na) * 66, cx + Math.cos(na) * (RX - 70), cy + Math.sin(na) * (RY - 50));
    g.lineStyle(6, S.red, 0.8); g.lineBetween(cx, cy, cx + Math.cos(na) * (RX - 80), cy + Math.sin(na) * (RY - 58));
    g.fillStyle(S.brassDark, 1); g.fillCircle(cx, cy, 34);
    g.fillStyle(S.brass, 1); g.fillCircle(cx, cy, 28);
    g.fillStyle(lit(S.brass, 0.3), 1); g.fillCircle(cx - 8, cy - 8, 10);
    // Puddles on the copper, each with a scrap of storm in it.
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2, d = 0.3 + rng() * 0.5;
      const x = cx + Math.cos(a) * RX * d, y = cy + Math.sin(a) * RY * d;
      g.fillStyle(S.puddle, 0.7); g.fillEllipse(x, y, 30 + rng() * 30, 9 + rng() * 6);
      g.fillStyle(S.galeLit, 0.3); g.fillEllipse(x - 6, y - 2, 14, 3);
    }
    // The iron railing round the rim, and the top strip of the gale behind it.
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = cx + Math.cos(a) * (RX + 2), y = cy + Math.sin(a) * (RY + 2);
      g.fillStyle(0x14161c, 1); g.fillRect(x - 2, y - 14, 4, 16);
      g.fillStyle(S.slateLit, 1); g.fillCircle(x, y - 14, 2.5);
    }
    g.lineStyle(3, 0x14161c, 1); g.strokeEllipse(cx, cy - 12, RX * 2 + 4, RY * 2 + 4);
  },
};
