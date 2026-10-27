import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef, BossBodyState } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mulberry, mixC, lit } from '../../../../art/IsleArt';
import {
  PLASMA, PLASMA_LIT, PLASMA_DEEP, PLASMA_CORE, SUN, SUN_CORE, SUN_RIM, SUN_DEEP,
  BRASS, BRASS_LIT, BRASS_DARK, GLASS_SAND, GLASS_SAND_DARK, GLASS_SHEEN, GLASS_DEEP, GLASS_GLINT,
  GLASS_CRACK, SHADE,
} from './palette';

/**
 * Prince Flux — Keeper of the Captive Sun, governor of the Corona Court.
 *
 * The King's scholar-child. Flux keeps a miniature sun in a brass armillary cage over his
 * laboratory and meters its warmth out to the plateau: a household whose Tithe Fire is kept
 * gets its noon, a household gone cold gets its sunlight "rationed". He fights the way he
 * runs his experiments — he sets up an apparatus around you and watches what happens.
 *
 * Phase one (*Corona*) is coronal-loop work: arches of plasma rising off footpoints on the
 * floor, field lines reconnecting, twisted flux ropes. Phase two (*Containment Failure*) splits
 * him into twin lobes joined by a plasma filament that pulses taut on a clock. Hard mode's third
 * phase (*Sunborn*) is the experiment finished — he is a small star with his own gravity.
 */

/** The player's hit radius, as the toolkit reckons it. */
const PLAYER_R = 20;

// ── Geometry helpers ─────────────────────────────────────────────────

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Points along a loop standing up off the floor between two footpoints. */
function archPoints(ax: number, ay: number, bx: number, by: number, h: number, n = 18): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t - Math.sin(Math.PI * t) * h });
  }
  return pts;
}

/** Quadratic curve through `a`, bowing so its midpoint lands on `apex`, ending at `b`. */
function bowPoints(ax: number, ay: number, apx: number, apy: number, bx: number, by: number, n = 20): { x: number; y: number }[] {
  const cx = 2 * apx - (ax + bx) / 2;
  const cy = 2 * apy - (ay + by) / 2;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({ x: u * u * ax + 2 * u * t * cx + t * t * bx, y: u * u * ay + 2 * u * t * cy + t * t * by });
  }
  return pts;
}

function polyline(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** An ellipse rotated by `rot`, stroked — the armillary's bands. */
function tiltedRing(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number, rot: number,
  from = 0, to = Math.PI * 2, n = 28,
): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
  }
  polyline(g, pts);
}

function ringPoint(cx: number, cy: number, rx: number, ry: number, rot: number, a: number): { x: number; y: number } {
  const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
  return { x: cx + ex * Math.cos(rot) - ey * Math.sin(rot), y: cy + ex * Math.sin(rot) + ey * Math.cos(rot) };
}

// ── The twin lobe (shared between the phase-two signatures) ──────────

/**
 * Containment Failure's second body. The rig only ever paints one Flux, so the lobe is state
 * held per fight (keyed on the toolkit) and drawn by the signature that tore it loose. The
 * other phase-two moves read it to fire from both bodies.
 */
interface FluxLink {
  on: boolean;
  x: number;
  y: number;
  /** Filament pulse clock: warning from → burns from → burns to. */
  nextPulseAt: number;
  warnFrom: number;
  burnFrom: number;
  burnTo: number;
  pulseDealt: boolean;
  lastTouchAt: number;
  /** A pinch in progress: the lobe is flung from (fx, fy) to (tx, ty), arriving at `to`. */
  pinch: { fx: number; fy: number; tx: number; ty: number; from: number; to: number } | null;
}

const LINKS = new WeakMap<BossToolkit, FluxLink>();

function linkOf(tk: BossToolkit): FluxLink {
  let l = LINKS.get(tk);
  if (!l) {
    l = {
      on: false, x: 0, y: 0, nextPulseAt: 0, warnFrom: 0, burnFrom: 0, burnTo: 0,
      pulseDealt: true, lastTouchAt: 0, pinch: null,
    };
    LINKS.set(tk, l);
  }
  return l;
}

/** Where the lobe wants to be: Flux's mirror image across the middle of the room. */
function mirrorTarget(tk: BossToolkit): { x: number; y: number } {
  const cy = tk.H * 0.58;
  return {
    x: Phaser.Math.Clamp(tk.W - tk.bossX, 90, tk.W - 90),
    y: Phaser.Math.Clamp(2 * cy - tk.bossY, 150, tk.H - 70),
  };
}

/** A gapped burst of plasma off a point — the gap always faces the player, so it never seals. */
function gappedBurst(tk: BossToolkit, x: number, y: number, count: number, speed: number, damage: number, color: number): void {
  const toP = Math.atan2(tk.player.y - y, tk.player.x - x);
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = toP + step * (i + 0.5);
    if (Math.abs(Phaser.Math.Angle.Wrap(a - toP)) < step * 1.1) continue;
    tk.spawnBullet({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, angle: a, speed, damage, r: 6, color });
  }
}

// ── Signature: Coronal Loop ──────────────────────────────────────────
// Three arches of plasma stand up off the floor around the player, one after
// another. Each footpoint pair glows first and a ghost of the arch climbs; then
// the loop rises and the strip of floor beneath it burns. When a loop snaps, its
// footpoints spit a pair of sparks outward along the loop's own line.

const LOOP_HALF = 120;
const LOOP_H = 74;
const LOOP_BAND = 20;
const LOOP_WARN = 1000;
const LOOP_LIVE = 1100;

const coronalLoop = (tk: BossToolkit): SignatureMove => {
  interface Loop { ax: number; ay: number; bx: number; by: number; born: number; rise: number; end: number; lastHit: number; snapped: boolean }
  let loops: Loop[] = [];
  return {
    durationMs: 2400,
    windupMs: 950,
    hold: 'conduct',
    tell: 'CORONAL LOOP',
    cast() {
      tk.sfx('plasma-arc');
      const count = tk.hard ? 4 : 3;
      for (let k = 0; k < count; k++) {
        tk.schedule(k * 430, () => {
          const p = tk.player;
          const now = tk.now;
          const off = 30 + Math.random() * 50;
          const oa = Math.random() * Math.PI * 2;
          const cx = tk.clampX(p.x + Math.cos(oa) * off, 80);
          const cy = tk.clampY(p.y + Math.sin(oa) * off, 70);
          const a = Math.random() * Math.PI;
          const rise = now + tk.warn(LOOP_WARN);
          loops.push({
            ax: cx - Math.cos(a) * LOOP_HALF, ay: cy - Math.sin(a) * LOOP_HALF * 0.75,
            bx: cx + Math.cos(a) * LOOP_HALF, by: cy + Math.sin(a) * LOOP_HALF * 0.75,
            born: now, rise, end: rise + LOOP_LIVE, lastHit: 0, snapped: false,
          });
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of loops) {
        if (time >= l.rise && time < l.end && time - l.lastHit > 450) {
          if (distToSeg(p.x, p.y, l.ax, l.ay, l.bx, l.by) < LOOP_BAND + PLAYER_R) {
            l.lastHit = time;
            tk.hitPlayer(16, p.x, p.y);
          }
        }
        if (time >= l.end && !l.snapped) {
          l.snapped = true;
          tk.sfx('zap');
          const mx = (l.ax + l.bx) / 2, my = (l.ay + l.by) / 2;
          for (const [fx, fy] of [[l.ax, l.ay], [l.bx, l.by]] as const) {
            tk.boom(fx, fy, 26, PLASMA_LIT);
            const out = Math.atan2(fy - my, fx - mx);
            for (const da of [-0.22, 0.22]) {
              tk.spawnBullet({ x: fx, y: fy, angle: out + da, speed: 220, damage: 9, r: 5, color: PLASMA_LIT });
            }
          }
        }
      }
      loops = loops.filter((l) => time < l.end + 400);
    },
    drawGround(g, time) {
      for (const l of loops) {
        if (time < l.rise) {
          const k = Phaser.Math.Clamp((time - l.born) / Math.max(1, l.rise - l.born), 0, 1);
          // Footprint: dashes marching between the footpoints, filling in as it nears.
          g.fillStyle(PLASMA, 0.08 + k * 0.14);
          const ang = Math.atan2(l.by - l.ay, l.bx - l.ax);
          const len = Math.hypot(l.bx - l.ax, l.by - l.ay);
          for (let s = 0; s < len; s += 16) {
            const x = l.ax + Math.cos(ang) * s, y = l.ay + Math.sin(ang) * s;
            if (((s / 16) | 0) % 2 === 0) g.fillCircle(x, y, LOOP_BAND * (0.5 + k * 0.5));
          }
          for (const [fx, fy] of [[l.ax, l.ay], [l.bx, l.by]] as const) {
            g.lineStyle(2, PLASMA_LIT, 0.4 + k * 0.5);
            g.strokeCircle(fx, fy, 10 + (1 - k) * 18);
            g.fillStyle(PLASMA_LIT, 0.5 + k * 0.4);
            g.fillCircle(fx, fy, 4 + k * 3);
          }
        } else if (time < l.end + 300) {
          const fade = time > l.end ? 1 - (time - l.end) / 300 : 1;
          g.lineStyle(LOOP_BAND * 2, PLASMA_DEEP, 0.4 * fade);
          g.lineBetween(l.ax, l.ay, l.bx, l.by);
          g.lineStyle(LOOP_BAND, PLASMA, 0.35 * fade);
          g.lineBetween(l.ax, l.ay, l.bx, l.by);
          g.lineStyle(2, PLASMA_CORE, 0.8 * fade);
          g.lineBetween(l.ax, l.ay, l.bx, l.by);
        }
      }
    },
    drawAir(g, time) {
      for (const l of loops) {
        if (time > l.end) continue;
        if (time < l.rise) {
          const k = Phaser.Math.Clamp((time - l.born) / Math.max(1, l.rise - l.born), 0, 1);
          g.lineStyle(1.5, PLASMA_LIT, 0.25 + k * 0.35);
          polyline(g, archPoints(l.ax, l.ay, l.bx, l.by, LOOP_H * k * 0.8, 14));
          continue;
        }
        const up = Phaser.Math.Clamp((time - l.rise) / 180, 0, 1);
        const h = LOOP_H * up * (1 + Math.sin(time / 90) * 0.04);
        const pts = archPoints(l.ax, l.ay, l.bx, l.by, h);
        g.lineStyle(14, PLASMA_DEEP, 0.45); polyline(g, pts);
        g.lineStyle(8, PLASMA, 0.85); polyline(g, pts);
        g.lineStyle(3, PLASMA_LIT, 1); polyline(g, pts);
        // Twisted field strands wrapping the loop.
        g.lineStyle(1.2, PLASMA_CORE, 0.8);
        const twist = archPoints(l.ax, l.ay, l.bx, l.by, h, 24).map((q, i) => ({
          x: q.x, y: q.y + Math.sin(i * 0.9 + time / 70) * 5,
        }));
        polyline(g, twist);
      }
    },
    onPhaseEnd() { loops = []; },
  };
};

// ── Signature: Magnetic Reconnection ─────────────────────────────────
// Field lines bow in off both walls toward where the player stands, nested
// three deep like iron filings. Where they touch, they reconnect: the meeting
// point detonates and four jets of plasma fire out along the X the lines make.
// The X is drawn the whole time — stand off the diagonals.

const reconnection = (tk: BossToolkit): SignatureMove => {
  interface Rx { x: number; y: number; born: number; meetAt: number; base: number; fired: boolean }
  let rx: Rx | null = null;
  return {
    durationMs: 2100,
    windupMs: 900,
    hold: 'reach',
    tell: 'MAGNETIC RECONNECTION',
    cast(time) {
      tk.sfx('magnet-pull');
      const p = tk.player;
      const x = tk.clampX(p.x, 160), y = tk.clampY(p.y, 80);
      rx = { x, y, born: time, meetAt: time + tk.warn(1500), base: Math.PI / 4 + (Math.random() < 0.5 ? 0 : 0.35), fired: false };
      tk.spawnZone({ x, y, radius: 88, warnMs: 1500, damage: 22 });
    },
    update(time) {
      if (!rx) return;
      if (!rx.fired && time >= rx.meetAt) {
        rx.fired = true;
        tk.sfx('thunder');
        const { x, y, base } = rx;
        for (let d = 0; d < 4; d++) {
          const a = base + d * (Math.PI / 2);
          for (let i = 0; i < 4; i++) {
            tk.schedule(i * 95, () => tk.spawnBullet({
              x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, angle: a, speed: 285, damage: 10, r: 6, color: PLASMA_LIT,
            }));
          }
        }
      }
      if (time > rx.meetAt + 500) rx = null;
    },
    drawGround(g, time) {
      if (!rx) return;
      const k = Phaser.Math.Clamp((time - rx.born) / Math.max(1, rx.meetAt - rx.born), 0, 1);
      // The X — where the jets will run.
      for (let d = 0; d < 4; d++) {
        const a = rx.base + d * (Math.PI / 2);
        g.lineStyle(10, PLASMA, 0.06 + k * 0.12);
        g.lineBetween(rx.x, rx.y, rx.x + Math.cos(a) * 700, rx.y + Math.sin(a) * 700);
        g.lineStyle(1.5, PLASMA_LIT, 0.2 + k * 0.45);
        for (let s = 40; s < 700; s += 26) {
          g.lineBetween(rx.x + Math.cos(a) * s, rx.y + Math.sin(a) * s, rx.x + Math.cos(a) * (s + 12), rx.y + Math.sin(a) * (s + 12));
        }
      }
    },
    drawAir(g, time) {
      if (!rx) return;
      const raw = (time - rx.born) / Math.max(1, rx.meetAt - rx.born);
      const k = Phaser.Math.Clamp(raw, 0, 1);
      const ease = k * k * (3 - 2 * k);
      const fade = raw > 1 ? Math.max(0, 1 - (time - rx.meetAt) / 500) : 1;
      for (const side of [-1, 1]) {
        const wx = side < 0 ? 26 : tk.W - 26;
        for (let n = 0; n < 3; n++) {
          const span = 170 + n * 55;
          const reach = (rx.x - wx) * ease - side * (12 + n * 22);
          const apx = wx + reach;
          const pts = bowPoints(wx, rx.y - span, apx, rx.y, wx, rx.y + span);
          g.lineStyle(5 - n, n === 0 ? PLASMA_LIT : PLASMA, (0.75 - n * 0.18) * fade);
          polyline(g, pts);
        }
      }
      if (raw > 1 && fade > 0) {
        g.fillStyle(PLASMA_CORE, fade * 0.8);
        g.fillCircle(rx.x, rx.y, 10 + (1 - fade) * 30);
      }
    },
    onPhaseEnd() { rx = null; },
  };
};

// ── Signature: Flux Rope ─────────────────────────────────────────────
// A twisted rope of plasma — two strands braided round an axis — crawls out of
// Flux along a lane drawn for a beat first. The strands cross at nodes, so the
// axis is not safe either: walk out of the braid's width, sideways.

const ROPE_LEN = 230;
const ROPE_AMP = 44;
const ROPE_SPEED = 165;

const fluxRope = (tk: BossToolkit): SignatureMove => {
  interface Rope { ox: number; oy: number; dir: number; born: number; launch: number; lastHit: number }
  let ropes: Rope[] = [];
  const headOf = (r: Rope, time: number): number => Math.max(0, ((time - r.launch) / 1000) * ROPE_SPEED);
  return {
    durationMs: 1700,
    windupMs: 800,
    gesture: 'point',
    tell: 'FLUX ROPE',
    cast(time) {
      tk.sfx('electric-charge');
      const aim = tk.angleToPlayer();
      const dirs = tk.hard ? [aim - 0.42, aim + 0.42] : [aim];
      dirs.forEach((dir, i) => {
        ropes.push({ ox: tk.bossX, oy: tk.bossY, dir, born: time, launch: time + tk.warn(700) + i * 500, lastHit: 0 });
      });
      if (!tk.hard) {
        tk.schedule(900, () => {
          const a2 = tk.angleToPlayer();
          ropes.push({ ox: tk.bossX, oy: tk.bossY, dir: a2, born: tk.now, launch: tk.now + tk.warn(700), lastHit: 0 });
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const r of ropes) {
        if (time < r.launch || time - r.lastHit < 450) continue;
        const head = headOf(r, time);
        const dx = p.x - r.ox, dy = p.y - r.oy;
        const c = Math.cos(r.dir), s = Math.sin(r.dir);
        const u = dx * c + dy * s;
        const v = -dx * s + dy * c;
        if (u < head - ROPE_LEN || u > head + 10 || u < 0) continue;
        const along = head - u;
        const off = ROPE_AMP * Math.sin(along * 0.045 + time * 0.006) * Math.min(1, along / 40 + 0.3);
        if (Math.abs(v - off) < 9 + PLAYER_R || Math.abs(v + off) < 9 + PLAYER_R) {
          r.lastHit = time;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.8, 500);
        }
      }
      ropes = ropes.filter((r) => headOf(r, time) - ROPE_LEN < 1250);
    },
    drawGround(g, time) {
      for (const r of ropes) {
        if (time >= r.launch) continue;
        const k = Phaser.Math.Clamp((time - r.born) / Math.max(1, r.launch - r.born), 0, 1);
        const c = Math.cos(r.dir), s = Math.sin(r.dir);
        const L = 1200;
        // The lane the braid will fill — its width, both edges, a crawling chevron.
        g.lineStyle(ROPE_AMP * 2 + 18, PLASMA_DEEP, 0.08 + k * 0.12);
        g.lineBetween(r.ox, r.oy, r.ox + c * L, r.oy + s * L);
        g.lineStyle(1.5, PLASMA_LIT, 0.3 + k * 0.4);
        for (const side of [-1, 1]) {
          const ex = -s * side * (ROPE_AMP + 9), ey = c * side * (ROPE_AMP + 9);
          g.lineBetween(r.ox + ex, r.oy + ey, r.ox + c * L + ex, r.oy + s * L + ey);
        }
        const chev = ((time - r.born) * 0.4) % 60;
        for (let d = chev; d < L; d += 60) {
          const x = r.ox + c * d, y = r.oy + s * d;
          g.lineBetween(x - c * 8 - s * 10, y - s * 8 + c * 10, x, y);
          g.lineBetween(x - c * 8 + s * 10, y - s * 8 - c * 10, x, y);
        }
      }
    },
    drawAir(g, time) {
      for (const r of ropes) {
        if (time < r.launch) continue;
        const head = headOf(r, time);
        const c = Math.cos(r.dir), s = Math.sin(r.dir);
        const a: { x: number; y: number }[] = [];
        const b: { x: number; y: number }[] = [];
        for (let along = 0; along <= ROPE_LEN; along += 8) {
          const u = head - along;
          if (u < 0) break;
          const off = ROPE_AMP * Math.sin(along * 0.045 + time * 0.006) * Math.min(1, along / 40 + 0.3);
          const bx = r.ox + c * u, by = r.oy + s * u;
          a.push({ x: bx - s * off, y: by + c * off });
          b.push({ x: bx + s * off, y: by - c * off });
        }
        g.lineStyle(12, PLASMA_DEEP, 0.4); polyline(g, a); polyline(g, b);
        g.lineStyle(6, PLASMA, 0.95); polyline(g, a);
        g.lineStyle(6, SUN, 0.9); polyline(g, b);
        g.lineStyle(2, PLASMA_CORE, 1); polyline(g, a); polyline(g, b);
        // The knot at the head.
        const hx = r.ox + c * head, hy = r.oy + s * head;
        g.fillStyle(PLASMA_LIT, 0.35); g.fillCircle(hx, hy, 18);
        g.fillStyle(PLASMA_CORE, 0.95); g.fillCircle(hx, hy, 7);
      }
    },
    onPhaseEnd() { ropes = []; },
  };
};

// ── Signature: Containment Failure ───────────────────────────────────
// The first cast tears a second lobe out of Flux: it drifts to his mirror image
// across the room and stays, joined to him by a plasma filament. The filament
// is harmless most of the time; on a clock it flickers, then pulls taut and
// sears for a moment — don't be standing across it. Recasting it re-ruptures
// the lobe with a gapped burst and snaps the filament taut at once.

const FILAMENT_HALF = 13;

const containment = (tk: BossToolkit): SignatureMove => {
  const link = linkOf(tk);
  const startPulse = (time: number, burnMs: number): void => {
    link.warnFrom = time;
    link.burnFrom = time + tk.warn(900);
    link.burnTo = link.burnFrom + burnMs;
    link.pulseDealt = false;
    link.nextPulseAt = link.burnTo + 3600;
  };
  return {
    durationMs: 1400,
    windupMs: 1000,
    gesture: 'recoil',
    tell: 'CONTAINMENT FAILURE',
    cast(time) {
      tk.sfx('chaos');
      if (!link.on) {
        link.on = true;
        link.x = tk.bossX;
        link.y = tk.bossY;
        link.pinch = null;
        link.pulseDealt = true;
        link.burnTo = 0;
        link.nextPulseAt = time + 2400;
        tk.boom(tk.bossX, tk.bossY, 70, PLASMA_LIT);
        gappedBurst(tk, tk.bossX, tk.bossY, 14, 200, 10, PLASMA_LIT);
      } else {
        tk.boom(link.x, link.y, 60, PLASMA_LIT);
        gappedBurst(tk, link.x, link.y, 12, 190, 10, PLASMA_LIT);
        startPulse(time, 700);
      }
    },
    update(time, dt) {
      if (!link.on) return;
      // Lobe motion: flung by a pinch, otherwise easing to the mirror point.
      if (link.pinch) {
        const pk = link.pinch;
        const k = Phaser.Math.Clamp((time - pk.from) / Math.max(1, pk.to - pk.from), 0, 1);
        const e = k * k;
        link.x = pk.fx + (pk.tx - pk.fx) * e;
        link.y = pk.fy + (pk.ty - pk.fy) * e;
        if (time > pk.to + 450) link.pinch = null;
      } else {
        const m = mirrorTarget(tk);
        const f = Math.min(1, dt * 1.8);
        link.x += (m.x - link.x) * f;
        link.y += (m.y - link.y) * f;
      }

      const p = tk.player;
      // The filament pulse.
      if (!link.pinch && time >= link.nextPulseAt && time > link.burnTo) startPulse(time, 450);
      if (time >= link.burnFrom && time < link.burnTo && !link.pulseDealt) {
        if (distToSeg(p.x, p.y, tk.bossX, tk.bossY, link.x, link.y) < FILAMENT_HALF + PLAYER_R) {
          link.pulseDealt = true;
          tk.hitPlayer(15, p.x, p.y);
          tk.slowPlayer(0.75, 600);
        }
      }
      // Touching the lobe itself scalds.
      if (Phaser.Math.Distance.Between(p.x, p.y, link.x, link.y) < 22 + PLAYER_R && time - link.lastTouchAt > 750) {
        link.lastTouchAt = time;
        tk.hitPlayer(9, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!link.on) return;
      const ax = tk.bossX, ay = tk.bossY, bx = link.x, by = link.y;
      const warn = time >= link.warnFrom && time < link.burnFrom;
      const burn = time >= link.burnFrom && time < link.burnTo;
      const len = Math.hypot(bx - ax, by - ay);
      const ang = Math.atan2(by - ay, bx - ax);
      const c = Math.cos(ang), s = Math.sin(ang);
      if (burn) {
        g.lineStyle(FILAMENT_HALF * 2 + 10, PLASMA, 0.45);
        g.lineBetween(ax, ay, bx, by);
        g.lineStyle(FILAMENT_HALF * 2 - 6, PLASMA_LIT, 0.8);
        g.lineBetween(ax, ay, bx, by);
        g.lineStyle(3, PLASMA_CORE, 1);
        g.lineBetween(ax, ay, bx, by);
        return;
      }
      if (warn) {
        const k = (time - link.warnFrom) / Math.max(1, link.burnFrom - link.warnFrom);
        const flick = Math.sin(time / (60 - k * 35)) > 0 ? 1 : 0.4;
        g.lineStyle(FILAMENT_HALF * 2, PLASMA, (0.12 + k * 0.2) * flick);
        g.lineBetween(ax, ay, bx, by);
        g.lineStyle(1.5, PLASMA_LIT, 0.8 * flick);
        for (const side of [-1, 1]) {
          const ox = -s * side * FILAMENT_HALF, oy = c * side * FILAMENT_HALF;
          g.lineBetween(ax + ox, ay + oy, bx + ox, by + oy);
        }
      }
      // Slack: two loose strands sagging and twisting between the bodies.
      for (const ph of [0, Math.PI]) {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const sag = Math.sin(Math.PI * t) * (warn ? 6 : 16) * Math.sin(time / 260 + ph + t * 6);
          pts.push({ x: ax + c * len * t - s * sag, y: ay + s * len * t + c * sag });
        }
        g.lineStyle(2, ph === 0 ? PLASMA_LIT : PLASMA, 0.55);
        polyline(g, pts);
      }
    },
    drawAir(g, time) {
      if (!link.on) return;
      const x = link.x, y = link.y;
      // The lobe: a rolling globe of plasma, its own sliver of brass collar still on it.
      g.fillStyle(PLASMA_DEEP, 0.3); g.fillCircle(x, y, 34 + Math.sin(time / 140) * 3);
      for (let i = 0; i < 4; i++) {
        const a = time / 260 + i * 1.6;
        g.fillStyle(i % 2 ? PLASMA : PLASMA_LIT, 0.6);
        g.fillCircle(x + Math.cos(a) * 7, y + Math.sin(a) * 6, 20 - i * 3);
      }
      g.fillStyle(PLASMA_CORE, 0.9); g.fillCircle(x, y, 7);
      g.lineStyle(3, BRASS, 0.9);
      g.beginPath(); g.arc(x, y, 24, time / 500, time / 500 + 1.7, false); g.strokePath();
      // Static crawling off the surface.
      g.lineStyle(1.2, PLASMA_CORE, 0.8);
      for (let i = 0; i < 3; i++) {
        const a = ((time / 90 + i * 97) % 628) / 100;
        const r0 = 22, r1 = 34 + ((i * 7 + time / 40) % 9);
        g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + 0.2) * r1, y + Math.sin(a + 0.2) * r1);
      }
    },
    onPhaseEnd() { link.on = false; link.pinch = null; link.burnTo = 0; },
  };
};

// ── Signature: Pinch ─────────────────────────────────────────────────
// The lobes try to become one star again. Flux braces; the lobe is flung back
// at him along the filament and they collide just off his body. The collision
// point is ringed from the start — be elsewhere — and the recombination sheds
// a ring of plasma outward as the lobe rebounds.

const pinch = (tk: BossToolkit): SignatureMove => {
  const link = linkOf(tk);
  let meet: { x: number; y: number; at: number; done: boolean } | null = null;
  return {
    durationMs: 1900,
    windupMs: 850,
    hold: 'brace',
    locksBody: true,
    tell: 'PINCH',
    cast(time) {
      tk.sfx('gravity-slam');
      let x = tk.bossX, y = tk.bossY;
      if (link.on) {
        const a = Math.atan2(link.y - tk.bossY, link.x - tk.bossX);
        x = tk.bossX + Math.cos(a) * 64;
        y = tk.bossY + Math.sin(a) * 64;
      }
      x = tk.clampX(x, 80); y = tk.clampY(y, 70);
      const at = time + tk.warn(1300);
      meet = { x, y, at, done: false };
      tk.spawnZone({ x, y, radius: 120, warnMs: 1300, damage: 24 });
      if (link.on) {
        // Hold the lobe a beat, then fling it.
        link.pinch = { fx: link.x, fy: link.y, tx: x, ty: y, from: time + (at - time) * 0.35, to: at };
      }
    },
    update(time) {
      if (!meet) return;
      if (link.pinch && time < link.pinch.from) { link.pinch.fx = link.x; link.pinch.fy = link.y; }
      if (!meet.done && time >= meet.at) {
        meet.done = true;
        tk.sfx('explosion-medium');
        const off = Math.random() * Math.PI;
        for (let i = 0; i < 10; i++) {
          const a = off + (Math.PI * 2 * i) / 10;
          tk.spawnBullet({ x: meet.x + Math.cos(a) * 40, y: meet.y + Math.sin(a) * 40, angle: a, speed: 190, damage: 9, r: 6, color: SUN });
        }
      }
      if (time > meet.at + 600) meet = null;
    },
    drawAir(g, time) {
      if (!meet) return;
      if (time < meet.at) {
        // Field lines squeezing in round the meeting point.
        const k = 1 - Phaser.Math.Clamp((meet.at - time) / 1300, 0, 1);
        g.lineStyle(1.5, PLASMA_LIT, 0.3 + k * 0.5);
        for (let i = 0; i < 3; i++) {
          const r = 120 * (1 - k * 0.6) - i * 14;
          if (r > 4) tiltedRing(g, meet.x, meet.y, r, r * 0.55, time / 400 + i, 0, Math.PI * 2, 24);
        }
      } else {
        const f = 1 - (time - meet.at) / 600;
        g.fillStyle(SUN_CORE, f * 0.9); g.fillCircle(meet.x, meet.y, 20 + (1 - f) * 70);
      }
    },
    onPhaseEnd() { meet = null; },
  };
};

// ── Signature: Mirror Fire ───────────────────────────────────────────
// Both lobes take turns: Flux throws sun-gold triplets, the lobe answers with
// violet triplets that bend a little after you. Two angles of fire at once —
// stand where one body hides behind the other.

const mirrorFire = (tk: BossToolkit): SignatureMove => {
  const link = linkOf(tk);
  let flashes: { x: number; y: number; at: number; c: number }[] = [];
  return {
    durationMs: 1900,
    windupMs: 750,
    gesture: 'clap',
    tell: 'MIRROR FIRE',
    cast() {
      tk.sfx('plasma-arc');
      const rounds = link.on ? 6 : 5;
      for (let r = 0; r < rounds; r++) {
        tk.schedule(r * 320, () => {
          const fromLobe = link.on && r % 2 === 1;
          const x = fromLobe ? link.x : tk.bossX;
          const y = fromLobe ? link.y : tk.bossY;
          const aim = Math.atan2(tk.player.y - y, tk.player.x - x);
          const color = fromLobe ? PLASMA_LIT : SUN;
          for (const da of [-0.2, 0, 0.2]) {
            tk.spawnBullet({
              x: x + Math.cos(aim + da) * 24, y: y + Math.sin(aim + da) * 24, angle: aim + da,
              speed: fromLobe ? 205 : 240, damage: 10, r: 6, color, turn: fromLobe ? 0.45 : 0,
            });
          }
          flashes.push({ x, y, at: tk.now, c: color });
          tk.sfx('zap');
        });
      }
    },
    drawAir(g, time) {
      flashes = flashes.filter((f) => time - f.at < 220);
      for (const f of flashes) {
        const k = 1 - (time - f.at) / 220;
        g.lineStyle(3, f.c, k);
        g.strokeCircle(f.x, f.y, 26 + (1 - k) * 18);
      }
    },
    onPhaseEnd() { flashes = []; },
  };
};

// ── Signature: Gravity Well ──────────────────────────────────────────
// Sunborn's own gravity. The star drags the room toward itself (capped well
// under walk speed) while a ring of molten debris spirals *outward* through
// the pull. The ring has one wide gap — find it as the debris passes, or stay
// out beyond it and keep walking against the drag.

const gravityWell = (tk: BossToolkit): SignatureMove => {
  interface Well { born: number; solidAt: number; end: number; spin: number; a0: number; slots: number[]; hitAt: number[] }
  let well: Well | null = null;
  const DUR = 3800;
  const radiusAt = (w: Well, time: number): number => 80 + ((time - w.born) / DUR) * 300;
  return {
    durationMs: 3900,
    windupMs: 1000,
    hold: 'draw',
    locksBody: true,
    tell: 'GRAVITY WELL',
    cast(time) {
      tk.sfx('gravity-slam');
      tk.pull(tk.bossX, tk.bossY, tk.hard ? 105 : 92, DUR);
      const gap = Math.floor(Math.random() * 12);
      const slots: number[] = [];
      for (let i = 0; i < 12; i++) if (i !== gap && i !== (gap + 1) % 12) slots.push(i);
      well = {
        born: time, solidAt: time + tk.warn(800), end: time + DUR,
        spin: Math.random() < 0.5 ? 1.05 : -1.05, a0: Math.random() * Math.PI * 2,
        slots, hitAt: slots.map(() => 0),
      };
    },
    update(time) {
      if (!well) return;
      if (time > well.end) { well = null; return; }
      if (time < well.solidAt) return;
      const p = tk.player;
      const r = radiusAt(well, time);
      const rot = well.a0 + well.spin * ((time - well.born) / 1000);
      well.slots.forEach((slot, i) => {
        const a = rot + (Math.PI * 2 * slot) / 12;
        const x = tk.bossX + Math.cos(a) * r, y = tk.bossY + Math.sin(a) * r * 0.85;
        if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < 12 + PLAYER_R && time - well!.hitAt[i] > 700) {
          well!.hitAt[i] = time;
          tk.hitPlayer(14, p.x, p.y);
        }
      });
    },
    drawGround(g, time) {
      if (!well) return;
      // Spacetime sagging: lensing rings dragged toward the star.
      for (let i = 0; i < 5; i++) {
        const ph = ((time / 900 + i / 5) % 1);
        const r = 320 * (1 - ph) + 30;
        g.lineStyle(1.5, SUN_RIM, 0.25 * ph);
        g.strokeEllipse(tk.bossX, tk.bossY, r * 2, r * 1.7);
      }
      const r = radiusAt(well, time);
      g.lineStyle(1.5, SUN, time < well.solidAt ? 0.5 : 0.18);
      g.strokeEllipse(tk.bossX, tk.bossY, r * 2, r * 1.7);
    },
    drawAir(g, time) {
      if (!well) return;
      const ghost = time < well.solidAt;
      const r = radiusAt(well, time);
      const rot = well.a0 + well.spin * ((time - well.born) / 1000);
      for (const slot of well.slots) {
        const a = rot + (Math.PI * 2 * slot) / 12;
        const x = tk.bossX + Math.cos(a) * r, y = tk.bossY + Math.sin(a) * r * 0.85;
        // A tail of embers behind each chunk.
        for (let t = 1; t <= 3; t++) {
          const ta = a - well.spin * t * 0.07;
          g.fillStyle(SUN_RIM, (ghost ? 0.12 : 0.35) / t);
          g.fillCircle(tk.bossX + Math.cos(ta) * (r - t * 5), tk.bossY + Math.sin(ta) * (r - t * 5) * 0.85, 9 - t * 1.5);
        }
        g.fillStyle(SHADE, ghost ? 0.25 : 0.95);
        g.fillCircle(x, y, 12);
        g.fillStyle(SUN_DEEP, ghost ? 0.2 : 0.9);
        g.fillCircle(x - 2, y - 2, 8);
        g.fillStyle(SUN, ghost ? 0.2 : 0.9);
        g.fillCircle(x - 3, y - 3, 3.5);
      }
    },
    onPhaseEnd() { well = null; },
  };
};

// ── Signature: Coronal Mass Ejection ─────────────────────────────────
// Three wedges of the star's surface tear loose in turn, each aimed where the
// player is when it is chosen. A wedge paints its full reach first, fills in
// from the star outward, then burns for a moment. Step sideways, not back.

const ejection = (tk: BossToolkit): SignatureMove => {
  interface Wedge { a: number; half: number; reach: number; born: number; fireAt: number; endAt: number; dealt: boolean; sounded: boolean }
  let wedges: Wedge[] = [];
  return {
    durationMs: 2700,
    windupMs: 900,
    hold: 'spray',
    tell: 'CORONAL MASS EJECTION',
    cast() {
      tk.sfx('beam-charge');
      const count = tk.hard ? 4 : 3;
      for (let k = 0; k < count; k++) {
        tk.schedule(k * 620, () => {
          const now = tk.now;
          const fireAt = now + tk.warn(900);
          wedges.push({ a: tk.angleToPlayer(), half: 0.3, reach: 560, born: now, fireAt, endAt: fireAt + 380, dealt: false, sounded: false });
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const w of wedges) {
        if (time < w.fireAt) continue;
        if (!w.sounded) { w.sounded = true; tk.sfx('flame-burst'); }
        if (w.dealt) continue;
        const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
        const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        const slack = Math.atan2(PLAYER_R * 0.6, Math.max(1, d));
        if (time < w.endAt && d < w.reach && Math.abs(Phaser.Math.Angle.Wrap(a - w.a)) < w.half + slack) {
          w.dealt = true;
          tk.hitPlayer(20, p.x, p.y);
        }
        if (time >= w.endAt) w.dealt = true;
      }
      wedges = wedges.filter((w) => time < w.endAt + 250);
    },
    drawGround(g, time) {
      for (const w of wedges) {
        const x = tk.bossX, y = tk.bossY;
        if (time < w.fireAt) {
          const k = Phaser.Math.Clamp((time - w.born) / Math.max(1, w.fireAt - w.born), 0, 1);
          g.lineStyle(2, SUN, 0.55 + k * 0.3);
          g.beginPath(); g.slice(x, y, w.reach, w.a - w.half, w.a + w.half, false); g.strokePath();
          g.fillStyle(SUN_RIM, 0.1 + k * 0.18);
          g.beginPath(); g.slice(x, y, w.reach * k, w.a - w.half, w.a + w.half, false); g.fillPath();
        }
      }
    },
    drawAir(g, time) {
      for (const w of wedges) {
        if (time < w.fireAt) continue;
        const f = time < w.endAt ? 1 : 1 - (time - w.endAt) / 250;
        const x = tk.bossX, y = tk.bossY;
        g.fillStyle(SUN_RIM, 0.45 * f);
        g.beginPath(); g.slice(x, y, w.reach, w.a - w.half, w.a + w.half, false); g.fillPath();
        g.fillStyle(SUN, 0.6 * f);
        g.beginPath(); g.slice(x, y, w.reach * 0.8, w.a - w.half * 0.6, w.a + w.half * 0.6, false); g.fillPath();
        // Ejected filaments streaming out along the wedge.
        g.lineStyle(2, SUN_CORE, 0.8 * f);
        for (let i = 0; i < 6; i++) {
          const a = w.a + ((i / 5) - 0.5) * w.half * 1.6;
          const s0 = ((time * 0.9 + i * 83) % w.reach);
          g.lineBetween(x + Math.cos(a) * s0, y + Math.sin(a) * s0, x + Math.cos(a) * (s0 + 40), y + Math.sin(a) * (s0 + 40));
        }
      }
    },
    onPhaseEnd() { wedges = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const FLUX_BOSS: WorldBossDef = {
  worldId: 'isle:flux',
  name: 'Prince Flux',
  title: 'Keeper of the Captive Sun',
  color: PLASMA,
  colorLit: PLASMA_LIT,
  colorDark: PLASMA_DEEP,
  accent: SUN,
  damageMult: 1.0,

  intro: [
    'Hold still. You are casting a shadow on my instrument.',
    'Father lends me the sun. I lend it to whoever keeps his fire. You, I think, get the dark.',
  ],
  banter: [
    'Fascinating. You flinch at exactly the frequency I predicted.',
    'Every cold hearth on this plateau is a noon I did not have to spend.',
    'Do not touch the filament. Or do. I need the data either way.',
    'The sun does not hate you. It simply has a ration, and you are not on it.',
    'I wrote your next step down before you took it. Page forty.',
    'Brass, glass and arithmetic — that is all a cage is, and all a court is.',
  ],
  defeatLine: 'THE CAGE IS OPEN',
  resumeLine: 'Ah, the second sample. Same apparatus. Let us see if you differ.',

  phases: [
    {
      name: 'Corona',
      line: 'Observe the loops. They are very beautiful, briefly.',
      hp: 380,
      cycle: [
        'sig:coronalLoop', 'volley', 'sig:fluxRope', 'lanes',
        'sig:reconnection', 'homing', 'sig:coronalLoop', 'barrage', 'sig:fluxRope',
      ],
      harass: ['h-flak', 'h-snipe', 'h-rune'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'Containment Failure',
      line: 'That was not — the field is — write this down, somebody, WRITE IT DOWN.',
      hp: 450,
      cycle: [
        'sig:containment', 'sig:mirrorFire', 'sig:pinch', 'spiral',
        'sig:mirrorFire', 'sig:containment', 'minefield', 'sig:pinch', 'sweep', 'sig:reconnection',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane'],
      restMs: 980,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE EXPERIMENT HAS A RESULT',
    extraPhase: {
      name: 'Sunborn',
      line: 'I opened the cage from the inside. Now I am the thing in it.',
      hp: 330,
      cycle: [
        'sig:gravityWell', 'sig:ejection', 'radial', 'sig:coronalLoop',
        'sig:gravityWell', 'quake', 'sig:ejection', 'sanctuary', 'sig:fluxRope',
      ],
      harass: ['h-orbs', 'h-rune', 'h-snipe', 'h-mines'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  signatures: {
    coronalLoop,
    reconnection,
    fluxRope,
    containment,
    pinch,
    mirrorFire,
    gravityWell,
    ejection,
  },

  look: {
    crest: 'antennae', pattern: 'swirl', aura: 'sparks', hands: 'orb',
    torsoR: 34, eyes: 2, eyeColor: SUN_CORE, mouth: 'line',
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'wards', tint: 'pale', look: { pattern: 'static', mouth: 'grin', hands: 'wisp' } },
    { movement: 'anchor', gimmick: 'tremor', tint: 'gold', look: { crest: 'halo', pattern: 'smooth', aura: 'flame', eyes: 1, torsoR: 40 } },
  ],

  /**
   * The armillary. A brass orrery rides Flux's head — two tilted bands turning against each
   * other with a bead of sun running round them — and a brass monocle sits over his right eye.
   * Containment Failure tears a violet seam across him and snaps one band loose; Sunborn burns
   * the armillary away entirely and leaves corona rays and orbiting cinders.
   */
  drawDecor(g, s: BossBodyState) {
    const R = s.radius;
    const t = s.t;
    if (s.phaseIdx >= 2) {
      // Sunborn — corona rays licking off the limb, a cinder belt, the brass all melted off.
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14 + t / 1400;
        const len = 10 + Math.sin(t / 120 + i * 1.7) * 6 + (s.enraged ? 6 : 0);
        const bx = s.x + Math.cos(a) * (R + 2), by = s.y + Math.sin(a) * (R + 2);
        g.fillStyle(i % 2 ? SUN : SUN_RIM, 0.8);
        g.fillTriangle(
          bx + Math.cos(a + 1.57) * 4, by + Math.sin(a + 1.57) * 4,
          bx - Math.cos(a + 1.57) * 4, by - Math.sin(a + 1.57) * 4,
          bx + Math.cos(a) * len, by + Math.sin(a) * len,
        );
      }
      for (let i = 0; i < 3; i++) {
        const a = t / 600 + (Math.PI * 2 * i) / 3;
        const p = ringPoint(s.x, s.y, R + 26, (R + 26) * 0.4, 0.3, a);
        g.fillStyle(SHADE, 0.9); g.fillCircle(p.x, p.y, 4);
        g.fillStyle(SUN_RIM, 0.9); g.fillCircle(p.x - 1, p.y - 1, 2);
      }
      return;
    }

    const hubX = s.x, hubY = s.y - R - 16;
    const torn = s.phaseIdx === 1;
    // Back halves of the bands first (behind the bead), then the fronts.
    g.lineStyle(3, BRASS_DARK, 1);
    tiltedRing(g, hubX, hubY, R * 0.95, R * 0.32, 0.25 + Math.sin(t / 900) * 0.1, Math.PI, Math.PI * 2);
    if (!torn) tiltedRing(g, hubX, hubY, R * 0.8, R * 0.28, -0.5 + Math.sin(t / 700) * 0.12, Math.PI, Math.PI * 2);
    // The bead of sun.
    const beadA = t / 340;
    const bead = ringPoint(hubX, hubY, R * 0.95, R * 0.32, 0.25 + Math.sin(t / 900) * 0.1, beadA);
    g.fillStyle(SUN, 0.25); g.fillCircle(bead.x, bead.y, 8);
    g.fillStyle(SUN_CORE, 1); g.fillCircle(bead.x, bead.y, 3.5);
    // Central pip.
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(hubX, hubY, 3);
    g.lineStyle(2.5, BRASS, 1);
    tiltedRing(g, hubX, hubY, R * 0.95, R * 0.32, 0.25 + Math.sin(t / 900) * 0.1, 0, Math.PI);
    if (!torn) {
      g.lineStyle(2.5, BRASS_LIT, 1);
      tiltedRing(g, hubX, hubY, R * 0.8, R * 0.28, -0.5 + Math.sin(t / 700) * 0.12, 0, Math.PI);
    } else {
      // The snapped band, dangling and swinging off one pivot.
      const sw = Math.sin(t / 260) * 0.5;
      const px = hubX + R * 0.8, py = hubY;
      g.lineStyle(2.5, BRASS_LIT, 1);
      g.beginPath(); g.arc(px - R * 0.5, py + 8, R * 0.5, sw - 0.3, sw + 1.6, false); g.strokePath();
    }
    // The monocle over the right eye.
    const ex = s.x + R * 0.32 + Math.cos(s.facing) * R * 0.13;
    const ey = s.y - R * 0.12 + Math.sin(s.facing) * R * 0.1;
    g.lineStyle(2.5, BRASS_LIT, 1); g.strokeCircle(ex, ey, R * 0.25);
    g.fillStyle(GLASS_GLINT, 0.18); g.fillCircle(ex, ey, R * 0.22);
    g.lineStyle(1, BRASS, 0.9);
    g.lineBetween(ex + R * 0.24, ey + 3, s.x + R * 0.75, s.y + R * 0.4);

    if (torn) {
      // The containment seam: a jagged violet tear down the body, leaking.
      const seam: { x: number; y: number }[] = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        seam.push({ x: s.x - R * 0.15 + (i % 2 ? 6 : -6) + k * R * 0.3, y: s.y - R * 0.85 + k * R * 1.7 });
      }
      g.lineStyle(6, PLASMA_DEEP, 0.6); polyline(g, seam);
      g.lineStyle(2.5, PLASMA_LIT, 1); polyline(g, seam);
      const ph = (t % 700) / 700;
      g.fillStyle(PLASMA_LIT, 1 - ph);
      g.fillCircle(s.x + Math.sin(t / 200) * 4, s.y + R * 0.85 + ph * 18, 2.5);
    } else if (s.castGlow > 0.3) {
      // Arcs jumping between the hands while he winds up.
      const [a, b] = s.hands;
      if (a && b) {
        g.lineStyle(1.5, PLASMA_LIT, s.castGlow);
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          pts.push({ x: a.x + (b.x - a.x) * k + (i % 2 ? 5 : -5) * Math.sin(t / 40 + i), y: a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * 26 });
        }
        polyline(g, pts);
      }
    }
  },

  /**
   * Flux's laboratory floor, under the cage: sand fused into glass, a brass orrery inlaid in it
   * ring by ring, and conduits running in from the walls to the centre plate.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xf1c5);
    g.fillStyle(GLASS_SAND_DARK, 0.55); g.fillRect(0, 0, W, H);
    // Glossy fused-glass sheets.
    for (let i = 0; i < 26; i++) {
      const x = rng() * W, y = 96 + rng() * (H - 96);
      g.fillStyle(rng() < 0.5 ? GLASS_SHEEN : GLASS_DEEP, 0.12 + rng() * 0.12);
      g.fillEllipse(x, y, 90 + rng() * 160, 30 + rng() * 50);
      g.fillStyle(GLASS_GLINT, 0.12);
      g.fillEllipse(x - 20, y - 6, 30 + rng() * 30, 3);
    }
    const cx = W / 2, cy = H * 0.58;
    // Conduits: violet channels in from the walls.
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + 0.2;
      const x1 = cx + Math.cos(a) * 640, y1 = cy + Math.sin(a) * 440;
      g.lineStyle(12, SHADE, 0.55); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 40, x1, y1);
      g.lineStyle(5, PLASMA_DEEP, 0.8); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 40, x1, y1);
      g.lineStyle(1.5, PLASMA_LIT, 0.6); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 40, x1, y1);
    }
    // The orrery inlay: brass rings, each with its planet disc.
    for (let k = 0; k < 4; k++) {
      const rx = 90 + k * 75, ry = rx * 0.62;
      g.lineStyle(4, BRASS_DARK, 0.85); g.strokeEllipse(cx, cy, rx * 2, ry * 2);
      g.lineStyle(1.5, BRASS_LIT, 0.55); g.strokeEllipse(cx, cy - 1, rx * 2, ry * 2);
      const a = rng() * Math.PI * 2;
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(px, py, 9 - k);
      g.fillStyle(k === 1 ? PLASMA : BRASS, 1); g.fillCircle(px - 1, py - 1, 6 - k);
    }
    // Tick marks round the outer ring, like an astrolabe's limb.
    for (let i = 0; i < 48; i++) {
      const a = (Math.PI * 2 * i) / 48;
      const r0 = i % 4 === 0 ? 300 : 308;
      g.lineStyle(i % 4 === 0 ? 2.5 : 1.2, BRASS, 0.6);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.62, cx + Math.cos(a) * 318, cy + Math.sin(a) * 318 * 0.62);
    }
    // Centre plate where the sun's light falls through the cage.
    g.fillStyle(SUN, 0.08); g.fillEllipse(cx, cy, 200, 124);
    g.fillStyle(SUN_CORE, 0.07); g.fillEllipse(cx, cy, 110, 68);
    g.lineStyle(3, BRASS, 0.8); g.strokeEllipse(cx, cy, 70, 44);
    // Heat cracks through the glass.
    for (let i = 0; i < 9; i++) {
      let x = rng() * W, y = 110 + rng() * (H - 120);
      let a = rng() * Math.PI * 2;
      g.lineStyle(1.2, GLASS_CRACK, 0.55);
      for (let s = 0; s < 5; s++) {
        const nx = x + Math.cos(a) * (14 + rng() * 22), ny = y + Math.sin(a) * (14 + rng() * 22);
        g.lineBetween(x, y, nx, ny);
        x = nx; y = ny; a += (rng() - 0.5) * 1.1;
      }
    }
    // A scatter of sand grains that never quite fused.
    for (let i = 0; i < 260; i++) {
      g.fillStyle(rng() < 0.5 ? GLASS_SAND : lit(GLASS_SAND, 0.3), 0.3);
      g.fillRect(rng() * W, 96 + rng() * (H - 96), 1.5, 1.5);
    }
    g.fillStyle(mixC(SHADE, PLASMA_DEEP, 0.3), 0.35);
    g.fillRect(0, H - 10, W, 10);
  },
};
