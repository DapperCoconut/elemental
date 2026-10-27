import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { brandSigil, dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import {
  BRASS, FLAME, FLAME_CORE, FLAME_MID, HONEY, MOLTEN, SEAL_RED, WAX, WAX_DARK, WAX_OLD, WICK,
  candle, dist, flame, smokeCurl, waxPuddle,
} from './art';

/**
 * Prince Tallow — the Tall Candle of Candlewick, King Ashgrave's vainest child.
 *
 * Tallow governs the court by the Inch-Tax: every house is a candle, and his Inchwardens
 * measure how far each has burned. Burn too slow and you are hoarding the King's light; too
 * fast and you are wasting it. He measures himself most of all — he is very tall, and he would
 * like you to notice.
 *
 * Phase one, *The Tall Candle*: he hovers at his full height, a wax column with a wick on top,
 * lashing with the wick and taxing the floor by the inch. Phase two, *Burned Down*: the column
 * is gone, he is a furious stub rushing about in his own pool, flooding the room with molten
 * wax and pressing sealing-wax brands into the floor. Hard mode, *Last Light*: the room goes
 * dark and he is the only thing burning — moths come to his flame, and he snuffs himself to
 * move where you cannot see.
 */

const TALLOW = 0xf0dcae;
const TALLOW_LIT = 0xfff4d6;
const TALLOW_DARK = 0x6e4c22;
const ACCENT = 0xffa53a;
const RULER = 0xc9a46a;

const PLAYER_R = 20;

// ── Signature: Wick Lash ─────────────────────────────────────────────
// His wick, uncoiled into a braided whip. Three lashes, each a curve that hooks to alternate
// sides of the line between you — so stepping straight sideways is not always enough. The whole
// curve is laid out as a scorched dotted path before it cracks, base to tip.

const LASH_WARN_MS = 640;
const LASH_CRACK_MS = 200;
const LASH_FADE_MS = 700;
const LASH_DAMAGE = 16;

const wickLash = (tk: BossToolkit): SignatureMove => {
  interface Lash { pts: { x: number; y: number }[]; bornAt: number; cracksAt: number; dealt: boolean }
  let lashes: Lash[] = [];
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'WICK LASH',
    cast() {
      for (let k = 0; k < 3; k++) {
        tk.schedule(k * 720, () => {
          const now = tk.now;
          const ox = tk.bossX, oy = tk.bossY - 12;
          const p = tk.player;
          const a = Math.atan2(p.y - oy, p.x - ox);
          const reach = Math.min(580, dist(ox, oy, p.x, p.y) + 120);
          const side = k % 2 === 0 ? 1 : -1;
          const ex = ox + Math.cos(a) * reach, ey = oy + Math.sin(a) * reach;
          const mx = (ox + ex) / 2 + Math.cos(a + Math.PI / 2) * side * reach * 0.34;
          const my = (oy + ey) / 2 + Math.sin(a + Math.PI / 2) * side * reach * 0.34;
          const pts: { x: number; y: number }[] = [];
          for (let i = 0; i <= 28; i++) {
            const t = i / 28;
            pts.push({
              x: (1 - t) * (1 - t) * ox + 2 * (1 - t) * t * mx + t * t * ex,
              y: (1 - t) * (1 - t) * oy + 2 * (1 - t) * t * my + t * t * ey,
            });
          }
          const cracksAt = now + tk.warn(LASH_WARN_MS);
          lashes.push({ pts, bornAt: now, cracksAt, dealt: false });
          tk.schedule(cracksAt - now, () => tk.sfx('whip'));
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of lashes) {
        if (l.dealt || time < l.cracksAt || time > l.cracksAt + LASH_CRACK_MS + 60) continue;
        const prog = Math.min(1, (time - l.cracksAt) / LASH_CRACK_MS);
        const upto = Math.ceil(prog * (l.pts.length - 1));
        for (let i = 0; i <= upto; i++) {
          if (dist(l.pts[i].x, l.pts[i].y, p.x, p.y) < PLAYER_R + 8) {
            l.dealt = true;
            tk.hitPlayer(LASH_DAMAGE, p.x, p.y);
            tk.slowPlayer(0.75, 500);
            break;
          }
        }
      }
      lashes = lashes.filter((l) => time < l.cracksAt + LASH_CRACK_MS + LASH_FADE_MS);
    },
    drawGround(g, time) {
      for (const l of lashes) {
        if (time < l.cracksAt) {
          const k = (time - l.bornAt) / Math.max(1, l.cracksAt - l.bornAt);
          // A dotted scorch-path laid down the curve, filling from base toward the tip.
          for (let i = 0; i < l.pts.length; i++) {
            const on = i / (l.pts.length - 1) <= k;
            g.fillStyle(on ? ACCENT : WAX_DARK, on ? 0.75 : 0.35);
            g.fillCircle(l.pts[i].x, l.pts[i].y, on ? 4 : 3);
          }
          const tip = l.pts[l.pts.length - 1];
          g.lineStyle(2, ACCENT, 0.4 + k * 0.5); g.strokeCircle(tip.x, tip.y, 14 + Math.sin(time / 70) * 2);
        } else {
          const fade = 1 - (time - l.cracksAt) / (LASH_CRACK_MS + LASH_FADE_MS);
          g.lineStyle(5, 0x1a120a, 0.35 * fade);
          g.beginPath(); g.moveTo(l.pts[0].x, l.pts[0].y);
          for (const pt of l.pts) g.lineTo(pt.x, pt.y);
          g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      for (const l of lashes) {
        if (time < l.cracksAt || time > l.cracksAt + LASH_CRACK_MS + 260) continue;
        const prog = Math.min(1, (time - l.cracksAt) / LASH_CRACK_MS);
        const upto = Math.max(1, Math.ceil(prog * (l.pts.length - 1)));
        // The braid: two strands twisting round the curve.
        for (const strand of [0, Math.PI]) {
          g.lineStyle(3.5, strand ? WICK : 0x5a3a20, 1);
          g.beginPath();
          for (let i = 0; i <= upto; i++) {
            const a = i < l.pts.length - 1
              ? Math.atan2(l.pts[i + 1].y - l.pts[i].y, l.pts[i + 1].x - l.pts[i].x)
              : Math.atan2(l.pts[i].y - l.pts[i - 1].y, l.pts[i].x - l.pts[i - 1].x);
            const tw = Math.sin(i * 1.3 + strand) * 3;
            const x = l.pts[i].x - Math.sin(a) * tw, y = l.pts[i].y + Math.cos(a) * tw;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.strokePath();
        }
        // The burning tip.
        const tip = l.pts[upto];
        flame(g, tip.x, tip.y, 7, time / 1000, upto, 0.08);
        for (let i = 0; i < 5; i++) {
          g.fillStyle(FLAME_MID, 0.8);
          g.fillCircle(tip.x + Math.sin(time / 40 + i) * 10, tip.y + Math.cos(time / 55 + i * 2) * 8, 1.6);
        }
      }
    },
    onPhaseEnd() { lashes = []; },
  };
};

// ── Signature: The Inch-Tax ──────────────────────────────────────────
// A great brass-bound ruler is laid across the room through where you stand. Its inches are
// marked one pip or two: the one-pip inches are taxed first, then the two-pip inches. Stand in
// a two-pip inch, then step into a one-pip inch once it has been stamped.

const INCH = 64;
const RULER_HALF_W = 44;
const TAX_WARN_MS = 1300;
const TAX_GAP_MS = 700;
const TAX_DAMAGE = 18;

const inchTax = (tk: BossToolkit): SignatureMove => {
  interface Rod { x: number; y: number; angle: number; phase: number; bornAt: number; fire: [number, number]; dealt: [boolean, boolean] }
  let rods: Rod[] = [];
  const parityAt = (r: Rod, px: number, py: number): { along: number; perp: number; parity: number } => {
    const ux = Math.cos(r.angle), uy = Math.sin(r.angle);
    const along = (px - r.x) * ux + (py - r.y) * uy;
    const perp = Math.abs(-(px - r.x) * uy + (py - r.y) * ux);
    const idx = Math.floor((along - r.phase) / INCH);
    return { along, perp, parity: ((idx % 2) + 2) % 2 };
  };
  return {
    durationMs: 2600,
    windupMs: 750,
    gesture: 'point',
    tell: 'THE INCH-TAX',
    cast() {
      tk.sfx('judgement');
      const p = tk.player;
      const now = tk.now;
      const f1 = now + tk.warn(TAX_WARN_MS);
      rods.push({
        x: p.x, y: p.y, angle: tk.angleToPlayer() + Math.PI / 2 + (Math.random() - 0.5) * 0.5,
        phase: Math.random() * INCH, bornAt: now, fire: [f1, f1 + TAX_GAP_MS], dealt: [false, false],
      });
      tk.schedule(f1 - now, () => tk.sfx('stone-slam'));
      tk.schedule(f1 - now + TAX_GAP_MS, () => tk.sfx('stone-slam'));
    },
    update(time) {
      const p = tk.player;
      for (const r of rods) {
        for (const k of [0, 1] as const) {
          if (r.dealt[k] || time < r.fire[k]) continue;
          if (time > r.fire[k] + 160) { r.dealt[k] = true; continue; }
          const at = parityAt(r, p.x, p.y);
          if (at.perp < RULER_HALF_W + PLAYER_R * 0.5 && at.parity === k) {
            r.dealt[k] = true;
            tk.hitPlayer(TAX_DAMAGE, p.x, p.y);
          }
        }
      }
      rods = rods.filter((r) => time < r.fire[1] + 700);
    },
    drawGround(g, time) {
      for (const r of rods) {
        const ux = Math.cos(r.angle), uy = Math.sin(r.angle);
        const nx = -uy, ny = ux;
        const L = 1300;
        const corner = (s: number, w: number): Phaser.Geom.Point => new Phaser.Geom.Point(r.x + ux * s + nx * w, r.y + uy * s + ny * w);
        // The ruler's body.
        g.fillStyle(dim(RULER, 0.45), 0.55);
        g.fillPoints([corner(-L, -RULER_HALF_W - 4), corner(L, -RULER_HALF_W - 4), corner(L, RULER_HALF_W + 4), corner(-L, RULER_HALF_W + 4)], true, true);
        g.fillStyle(RULER, 0.35);
        g.fillPoints([corner(-L, -RULER_HALF_W), corner(L, -RULER_HALF_W), corner(L, RULER_HALF_W), corner(-L, RULER_HALF_W)], true, true);
        // Inches, taxed in two passes.
        for (let k = -22; k <= 22; k++) {
          const s0 = r.phase + k * INCH;
          const parity = ((k % 2) + 2) % 2;
          const fireAt = r.fire[parity];
          const quad = [corner(s0 + 2, -RULER_HALF_W), corner(s0 + INCH - 2, -RULER_HALF_W), corner(s0 + INCH - 2, RULER_HALF_W), corner(s0 + 2, RULER_HALF_W)];
          if (time < fireAt) {
            const k0 = parity === 0 ? r.bornAt : r.fire[0];
            const charge = Phaser.Math.Clamp((time - k0) / Math.max(1, fireAt - k0), 0, 1);
            g.fillStyle(SEAL_RED, (parity === 0 || time >= r.fire[0]) ? 0.1 + charge * 0.32 : 0.06);
            g.fillPoints(quad, true, true);
            if (charge > 0.8 && (parity === 0 || time >= r.fire[0]) && Math.floor(time / 80) % 2 === 0) {
              g.fillStyle(0xffffff, 0.14); g.fillPoints(quad, true, true);
            }
          } else {
            const fade = 1 - Math.min(1, (time - fireAt) / 600);
            g.fillStyle(0xfff4d6, 0.7 * fade); g.fillPoints(quad, true, true);
            const mid = corner(s0 + INCH / 2, 0);
            brandSigil(g, mid.x, mid.y, 13, SEAL_RED, 0.8 * fade + 0.15);
          }
          // Tick marks: every eighth, longer at the half, full at the inch.
          for (let q = 0; q < 8; q++) {
            const s = s0 + (q * INCH) / 8;
            const len = q === 0 ? RULER_HALF_W : q === 4 ? 18 : 9;
            const a = corner(s, -RULER_HALF_W), b = corner(s, -RULER_HALF_W + len);
            g.lineStyle(q === 0 ? 2 : 1, 0x2a1d10, 0.7); g.lineBetween(a.x, a.y, b.x, b.y);
          }
          // One pip or two.
          for (let pip = 0; pip <= parity; pip++) {
            const c = corner(s0 + INCH / 2 + (parity ? (pip ? 9 : -9) : 0), RULER_HALF_W * 0.45);
            g.fillStyle(SEAL_RED, 0.95); g.fillCircle(c.x, c.y, 5);
            g.fillStyle(0xffffff, 0.4); g.fillCircle(c.x - 1.5, c.y - 1.5, 1.5);
          }
        }
        // Brass end-caps along both edges.
        g.lineStyle(2, BRASS, 0.7);
        for (const w of [-RULER_HALF_W, RULER_HALF_W]) { const a = corner(-L, w), b = corner(L, w); g.lineBetween(a.x, a.y, b.x, b.y); }
      }
    },
    onPhaseEnd() { rods = []; },
  };
};

// ── Signature: Drip Curtain ──────────────────────────────────────────
// He tips his crown and lobs gobbets of wax along the path you just walked — each lands where
// you were a moment ago and sets as a dragging puddle. Keep moving forward; doubling back walks
// into your own trail.

const GLOB_FLIGHT_MS = 850;
const GLOB_R = 38;
const GLOB_DAMAGE = 12;
const CURTAIN_PUDDLE_MS = 5200;

const dripCurtain = (tk: BossToolkit): SignatureMove => {
  interface Glob { sx: number; sy: number; tx: number; ty: number; bornAt: number; landAt: number }
  interface Pud { x: number; y: number; bornAt: number; dieAt: number; seed: number }
  const trail: { t: number; x: number; y: number }[] = [];
  let lastSample = 0;
  let globs: Glob[] = [];
  let puds: Pud[] = [];
  const pastPos = (ago: number): { x: number; y: number } => {
    const want = tk.now - ago;
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].t <= want) return trail[i];
    return trail[0] ?? { x: tk.player.x, y: tk.player.y };
  };
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'raise',
    tell: 'DRIP CURTAIN',
    cast() {
      tk.sfx('slime-splat');
      for (let i = 0; i < 8; i++) {
        tk.schedule(i * 170, () => {
          const at = pastPos(520);
          const now = tk.now;
          globs.push({
            sx: tk.bossX, sy: tk.bossY - 70,
            tx: tk.clampX(at.x + (Math.random() - 0.5) * 16), ty: tk.clampY(at.y + (Math.random() - 0.5) * 16),
            bornAt: now, landAt: now + tk.warn(GLOB_FLIGHT_MS),
          });
        });
      }
    },
    update(time) {
      const p = tk.player;
      if (time - lastSample > 80) {
        lastSample = time;
        trail.push({ t: time, x: p.x, y: p.y });
        while (trail.length > 30) trail.shift();
      }
      for (const gl of globs) {
        if (time < gl.landAt) continue;
        tk.sfx('slime-splat');
        if (dist(gl.tx, gl.ty, p.x, p.y) < GLOB_R + PLAYER_R * 0.4) tk.hitPlayer(GLOB_DAMAGE, gl.tx, gl.ty);
        puds.push({ x: gl.tx, y: gl.ty, bornAt: time, dieAt: time + CURTAIN_PUDDLE_MS, seed: Math.random() * 10 });
      }
      globs = globs.filter((gl) => time < gl.landAt);
      puds = puds.filter((pd) => time < pd.dieAt);
      if (puds.some((pd) => dist(pd.x, pd.y, p.x, p.y) < GLOB_R)) tk.slowPlayer(0.6, 140);
    },
    drawGround(g, time) {
      const t = time / 1000;
      for (const pd of puds) {
        const k = (time - pd.bornAt) / (pd.dieAt - pd.bornAt);
        waxPuddle(g, pd.x, pd.y, GLOB_R * (1 - Math.max(0, k - 0.85) * 3), t, Math.min(1, k * 1.4), MOLTEN, pd.seed);
      }
      for (const gl of globs) {
        const k = Math.min(1, (time - gl.bornAt) / (gl.landAt - gl.bornAt));
        g.fillStyle(0x000000, 0.1 + k * 0.25); g.fillEllipse(gl.tx, gl.ty, GLOB_R * 2 * (1.3 - k * 0.3), GLOB_R * 1.2 * (1.3 - k * 0.3));
        g.lineStyle(2, ACCENT, 0.45 + k * 0.45); g.strokeEllipse(gl.tx, gl.ty, GLOB_R * 2, GLOB_R * 1.2);
      }
    },
    drawAir(g, time) {
      for (const gl of globs) {
        const k = Math.min(1, (time - gl.bornAt) / (gl.landAt - gl.bornAt));
        const x = gl.sx + (gl.tx - gl.sx) * k;
        const y = gl.sy + (gl.ty - gl.sy) * k - Math.sin(k * Math.PI) * 150;
        g.fillStyle(dim(WAX, 0.25), 1); g.fillCircle(x + 1, y + 1, 8);
        g.fillStyle(lit(WAX, 0.1), 1); g.fillCircle(x, y, 7.5);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 2.5, y - 2.5, 2.2);
        // A thread of wax trailing back toward his crown.
        g.lineStyle(2, WAX, 0.4);
        const bk = Math.max(0, k - 0.08);
        g.lineBetween(x, y, gl.sx + (gl.tx - gl.sx) * bk, gl.sy + (gl.ty - gl.sy) * bk - Math.sin(bk * Math.PI) * 150);
      }
    },
    onPhaseEnd() { globs = []; puds = []; },
  };
};

// ── Signature: Molten Flood ──────────────────────────────────────────
// Burned down to a stub, he simply melts: a tide of wax spreads from his pool across the whole
// floor, slower than you walk, and holds for a few seconds. Three wick-islands rise first —
// raised plinths of set wax, the only dry ground. One is always within reach.

const FLOOD_WARN_MS = 1200;
const FLOOD_SPEED = 150;
const FLOOD_HOLD_MS = 4600;
const FLOOD_RECEDE_SPEED = 360;
const ISLAND_R = 54;
const FLOOD_DAMAGE = 7;
const FLOOD_TICK_MS = 450;

const moltenFlood = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0, cy = 0;
  let bornAt = 0, floodAt = 0, recedeAt = 0;
  let radius = 0;
  let lastTick = 0;
  let islands: { x: number; y: number }[] = [];
  const maxR = (): number => Math.hypot(tk.W, tk.H);
  return {
    durationMs: 5200,
    windupMs: 800,
    hold: 'brace',
    tell: 'THE WAX RISES',
    cast() {
      tk.sfx('geyser');
      const now = tk.now;
      active = true;
      cx = tk.bossX; cy = tk.bossY;
      bornAt = now;
      floodAt = now + tk.warn(FLOOD_WARN_MS);
      recedeAt = floodAt + FLOOD_HOLD_MS;
      radius = 0;
      lastTick = 0;
      const p = tk.player;
      islands = [];
      // The first island is always a reachable run from where you stand.
      for (let tries = 0; tries < 40 && islands.length < 3; tries++) {
        const first = islands.length === 0;
        const a = Math.random() * Math.PI * 2;
        const d = first ? 150 + Math.random() * 150 : 120 + Math.random() * 520;
        const x = tk.clampX((first ? p.x : tk.W / 2) + Math.cos(a) * d, 90);
        const y = tk.clampY((first ? p.y : (tk.H + 96) / 2) + Math.sin(a) * d * 0.7, 90);
        if (dist(x, y, cx, cy) < 150) continue;
        if (islands.some((i) => dist(i.x, i.y, x, y) < 210)) continue;
        islands.push({ x, y });
      }
    },
    update(time, dt) {
      if (!active) return;
      if (time >= floodAt && time < recedeAt) radius = Math.min(maxR(), radius + FLOOD_SPEED * dt);
      else if (time >= recedeAt) {
        radius -= FLOOD_RECEDE_SPEED * dt;
        if (radius <= 0) { active = false; return; }
      }
      const p = tk.player;
      if (radius > 0 && dist(cx, cy, p.x, p.y) < radius && !islands.some((i) => dist(i.x, i.y, p.x, p.y) < ISLAND_R)) {
        tk.slowPlayer(0.6, 300);
        if (time - lastTick > FLOOD_TICK_MS) { lastTick = time; tk.hitPlayer(FLOOD_DAMAGE, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const t = time / 1000;
      if (time < floodAt) {
        // The pool at his foot swelling, and the islands calling you over.
        const k = (time - bornAt) / Math.max(1, floodAt - bornAt);
        g.fillStyle(MOLTEN, 0.35); g.fillCircle(cx, cy + 10, 40 + k * 40);
      }
      if (radius > 0) {
        g.fillStyle(MOLTEN, 0.42); g.fillCircle(cx, cy, radius);
        g.lineStyle(10, lit(MOLTEN, 0.3), 0.6); g.strokeCircle(cx, cy, radius);
        g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(cx, cy, radius - 6);
        for (let i = 0; i < 4; i++) {
          const rr = ((t * 70 + i * 90) % Math.max(60, radius));
          g.lineStyle(1.5, 0xffffff, 0.18); g.strokeCircle(cx, cy, rr);
        }
      }
      for (const isl of islands) {
        const up = Math.min(1, (time - bornAt) / 400);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(isl.x + 3, isl.y + 6, ISLAND_R * 2.1, ISLAND_R * 1.2);
        g.fillStyle(dim(WAX, 0.25), 1); g.fillEllipse(isl.x, isl.y + 4 * up, ISLAND_R * 2, ISLAND_R * 1.2);
        g.fillStyle(lit(WAX, 0.1), 1); g.fillEllipse(isl.x, isl.y - 2 * up, ISLAND_R * 1.9, ISLAND_R * 1.05);
        if (time < floodAt) {
          const pulse = 1 + Math.sin(time / 110) * 0.08;
          g.lineStyle(3, HONEY, 0.85); g.strokeEllipse(isl.x, isl.y, ISLAND_R * 2.3 * pulse, ISLAND_R * 1.35 * pulse);
        }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const t = time / 1000;
      // Each island is a stub with its wick still alight.
      for (const isl of islands) {
        g.fillStyle(WAX_OLD, 1); g.fillRect(isl.x - 6, isl.y - 22, 12, 20);
        g.fillStyle(WAX, 1); g.fillRect(isl.x - 5, isl.y - 22, 8, 20);
        g.lineStyle(1.4, WICK, 1); g.lineBetween(isl.x, isl.y - 22, isl.x, isl.y - 27);
        flame(g, isl.x, isl.y - 27, 5, t, isl.x, 0.05);
      }
    },
    onPhaseEnd() { active = false; radius = 0; islands = []; },
  };
};

// ── Signature: Sealing Wax ───────────────────────────────────────────
// Six blobs of red sealing wax drop round you in a hexagon and run together into walls — all
// but one side, marked with gold chevrons. Then the signet comes down on the middle. Leave by
// the open side, or burn your way through a wall.

const SEAL_R = 125;
const SEAL_POSTS_MS = 650;
const SEAL_RUN_MS = 900;
const SEAL_STAMP_MS = 2700;
const SEAL_DAMAGE = 26;
const SEAL_WALL_DAMAGE = 10;

const sealingWax = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0, cy = 0, a0 = 0, gapIdx = 0;
  let bornAt = 0, postsAt = 0, wallsAt = 0, stampAt = 0, endAt = 0;
  let stamped = false;
  let lastWallHit = 0;
  const post = (i: number): { x: number; y: number } => {
    const a = a0 + (i * Math.PI) / 3;
    return { x: cx + Math.cos(a) * SEAL_R, y: cy + Math.sin(a) * SEAL_R };
  };
  const segDist = (px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Phaser.Math.Clamp(((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  };
  return {
    durationMs: 3400,
    windupMs: 650,
    gesture: 'slam',
    tell: 'SEALING WAX',
    cast() {
      tk.sfx('stone-rise');
      const p = tk.player;
      const now = tk.now;
      active = true; stamped = false;
      cx = tk.clampX(p.x, 150); cy = tk.clampY(p.y, 150);
      a0 = Math.random() * Math.PI;
      // The open side faces away from him: he wants you to run, not to come closer.
      let best = 0, bd = -1;
      for (let i = 0; i < 6; i++) {
        const m = { x: (post(i).x + post((i + 1) % 6).x) / 2, y: (post(i).y + post((i + 1) % 6).y) / 2 };
        const d = dist(m.x, m.y, tk.bossX, tk.bossY);
        if (d > bd) { bd = d; best = i; }
      }
      gapIdx = best;
      bornAt = now;
      postsAt = now + tk.warn(SEAL_POSTS_MS);
      wallsAt = postsAt + SEAL_RUN_MS;
      stampAt = now + tk.warn(SEAL_STAMP_MS);
      endAt = stampAt + 1100;
    },
    update(time) {
      if (!active) return;
      if (time >= endAt) { active = false; return; }
      const p = tk.player;
      if (time >= wallsAt && time < endAt - 300) {
        for (let i = 0; i < 6; i++) {
          if (i === gapIdx) continue;
          if (segDist(p.x, p.y, post(i), post((i + 1) % 6)) < PLAYER_R * 0.7 + 5 && time - lastWallHit > 600) {
            lastWallHit = time;
            tk.hitPlayer(SEAL_WALL_DAMAGE, p.x, p.y);
          }
        }
      }
      if (!stamped && time >= stampAt) {
        stamped = true;
        tk.sfx('stone-slam');
        tk.scene.cameras.main.shake(220, 0.006);
        tk.boom(cx, cy, SEAL_R, SEAL_RED);
        if (dist(cx, cy, p.x, p.y) < SEAL_R * 0.9) tk.hitPlayer(SEAL_DAMAGE, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      // The signet's shadow, darkening as it descends.
      if (time < stampAt) {
        const k = Phaser.Math.Clamp((time - bornAt) / Math.max(1, stampAt - bornAt), 0, 1);
        g.fillStyle(0x000000, 0.08 + k * 0.28); g.fillCircle(cx, cy, SEAL_R * 0.9 * (0.6 + k * 0.4));
        if (k > 0.82 && Math.floor(time / 85) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.55); g.strokeCircle(cx, cy, SEAL_R * 0.9); }
      } else {
        const fade = 1 - (time - stampAt) / (endAt - stampAt);
        g.fillStyle(SEAL_RED, 0.55 * fade); g.fillCircle(cx, cy, SEAL_R * 0.9);
        brandSigil(g, cx, cy, SEAL_R * 0.5, dim(SEAL_RED, 0.4), 0.9 * fade);
      }
      // Posts.
      for (let i = 0; i < 6; i++) {
        const pt = post(i);
        if (time < postsAt) {
          const k = (time - bornAt) / Math.max(1, postsAt - bornAt);
          g.lineStyle(2, SEAL_RED, 0.4 + k * 0.5); g.strokeCircle(pt.x, pt.y, 16 - k * 6);
        } else {
          g.fillStyle(dim(SEAL_RED, 0.35), 1); g.fillCircle(pt.x + 1, pt.y + 2, 12);
          g.fillStyle(SEAL_RED, 1); g.fillCircle(pt.x, pt.y, 11);
          g.fillStyle(0xffffff, 0.35); g.fillCircle(pt.x - 3, pt.y - 3, 3);
        }
      }
      // Walls running together from both posts toward the middle of each side.
      if (time >= postsAt) {
        const run = Phaser.Math.Clamp((time - postsAt) / SEAL_RUN_MS, 0, 1);
        for (let i = 0; i < 6; i++) {
          const a = post(i), b = post((i + 1) % 6);
          if (i === gapIdx) {
            const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const out = Math.atan2(m.y - cy, m.x - cx);
            for (let c = 0; c < 3; c++) {
              const d = 8 + c * 16 + ((time / 12) % 16);
              const x = m.x + Math.cos(out) * d, y = m.y + Math.sin(out) * d;
              g.lineStyle(3, HONEY, 0.9);
              g.lineBetween(x - Math.cos(out - 0.7) * 9, y - Math.sin(out - 0.7) * 9, x, y);
              g.lineBetween(x - Math.cos(out + 0.7) * 9, y - Math.sin(out + 0.7) * 9, x, y);
            }
            continue;
          }
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          g.lineStyle(12, dim(SEAL_RED, 0.3), 1);
          g.lineBetween(a.x, a.y, a.x + (mx - a.x) * run, a.y + (my - a.y) * run);
          g.lineBetween(b.x, b.y, b.x + (mx - b.x) * run, b.y + (my - b.y) * run);
          g.lineStyle(8, SEAL_RED, 1);
          g.lineBetween(a.x, a.y, a.x + (mx - a.x) * run, a.y + (my - a.y) * run);
          g.lineBetween(b.x, b.y, b.x + (mx - b.x) * run, b.y + (my - b.y) * run);
        }
      }
    },
    drawAir(g, time) {
      if (!active || time >= stampAt) return;
      // The signet ring, high and coming down.
      const k = Phaser.Math.Clamp((time - bornAt) / Math.max(1, stampAt - bornAt), 0, 1);
      const h = (1 - k * k) * 220 + 10;
      const r = 30 + k * 22;
      g.fillStyle(dim(BRASS, 0.4), 0.9); g.fillCircle(cx, cy - h + 3, r + 3);
      g.fillStyle(BRASS, 0.95); g.fillCircle(cx, cy - h, r);
      g.fillStyle(lit(BRASS, 0.3), 0.9); g.fillCircle(cx - r * 0.3, cy - h - r * 0.3, r * 0.3);
      brandSigil(g, cx, cy - h, r * 0.55, dim(BRASS, 0.55), 0.95);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Moths to the Flame ────────────────────────────────────
// In the dark he is the only light, and the moths know it. Six ember-moths flutter out of his
// flame, fan wide, then come for you — slowly, turning lazily enough to be outrun in a circle.

const MOTH_SPEED = 118;
const MOTH_TURN = 1.7;
const MOTH_LIFE_MS = 6000;
const MOTH_DAMAGE = 8;

const moths = (tk: BossToolkit): SignatureMove => {
  interface Moth { x: number; y: number; a: number; bornAt: number; seed: number; dead: boolean }
  let swarm: Moth[] = [];
  return {
    durationMs: 1800,
    windupMs: 600,
    gesture: 'raise',
    tell: 'MOTHS TO THE FLAME',
    cast() {
      tk.sfx('wings');
      const now = tk.now;
      const n = tk.hard ? 7 : 6;
      for (let i = 0; i < n; i++) {
        swarm.push({ x: tk.bossX, y: tk.bossY - 50, a: (i / n) * Math.PI * 2, bornAt: now, seed: Math.random() * 10, dead: false });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const m of swarm) {
        const age = time - m.bornAt;
        if (age > 650) {
          const want = Math.atan2(p.y - m.y, p.x - m.x);
          m.a = Phaser.Math.Angle.RotateTo(m.a, want, MOTH_TURN * dt);
        }
        const flutter = Math.sin(time / 90 + m.seed) * 0.6;
        const sp = age < 650 ? 150 : MOTH_SPEED;
        m.x += Math.cos(m.a + flutter) * sp * dt;
        m.y += Math.sin(m.a + flutter) * sp * dt;
        if (dist(m.x, m.y, p.x, p.y) < PLAYER_R + 8) {
          m.dead = true;
          tk.hitPlayer(MOTH_DAMAGE, m.x, m.y);
        }
      }
      swarm = swarm.filter((m) => !m.dead && time - m.bornAt < MOTH_LIFE_MS);
    },
    drawAir(g, time) {
      for (const m of swarm) {
        const life = 1 - (time - m.bornAt) / MOTH_LIFE_MS;
        const flap = Math.abs(Math.sin(time / 45 + m.seed));
        glow(g, m.x, m.y, 16, FLAME_MID, 0.05, 3);
        g.fillStyle(0xe8d8b8, 0.85 * Math.min(1, life * 4));
        for (const s of [-1, 1]) {
          g.fillTriangle(m.x, m.y, m.x + s * 11 * flap, m.y - 7, m.x + s * 9 * flap, m.y + 4);
          g.fillTriangle(m.x, m.y + 1, m.x + s * 6 * flap, m.y + 7, m.x + s * 3, m.y + 2);
        }
        g.fillStyle(ACCENT, 1); g.fillEllipse(m.x, m.y, 4, 9);
        g.fillStyle(FLAME_CORE, 1); g.fillCircle(m.x, m.y - 1, 1.6);
      }
    },
    onPhaseEnd() { swarm = []; },
  };
};

// ── Signature: Snuffed (and the Last Light itself) ───────────────────
// He pinches out his own wick. For a heartbeat the room is truly dark; an ember glows where he
// will re-light — and then he does, in a ring of flung wax tears with a gap left open toward
// you. This signature also carries the Last Light: in the hard phase his flame is drawn over
// the gloom, so in a black room he is the one thing you can always see.

const SNUFF_DARK_MS = 1400;
const EMBER_AT_MS = 700;
const TEARS = 12;

const snuffed = (tk: BossToolkit): SignatureMove => {
  let phaseEnds = 0;
  let lastLightSeen = false;
  let offFrom = 0, offUntil = 0;
  let fromX = 0, fromY = 0, toX = 0, toY = 0;
  let moved = false, relit = true;
  const lastLight = (): boolean => phaseEnds >= 2 || lastLightSeen;
  return {
    durationMs: 2300,
    windupMs: 500,
    locksBody: true,
    hold: 'brace',
    tell: 'SNUFFED',
    cast() {
      lastLightSeen = true;
      tk.sfx('hush');
      const now = tk.now;
      offFrom = now; offUntil = now + SNUFF_DARK_MS;
      fromX = tk.bossX; fromY = tk.bossY;
      const p = tk.player;
      const a = Math.atan2(p.y - fromY, p.x - fromX);
      toX = tk.clampX(p.x + Math.cos(a) * 250, 100);
      toY = tk.clampY(p.y + Math.sin(a) * 200, 100);
      moved = false; relit = false;
    },
    update(time) {
      if (!moved && offUntil && time >= offFrom + EMBER_AT_MS) {
        moved = true;
        tk.host.setBossPos(toX, toY);
      }
      if (!relit && offUntil && time >= offUntil) {
        relit = true;
        tk.sfx('flame-burst');
        const aim = tk.angleToPlayer(toX, toY);
        for (let i = 0; i < TEARS; i++) {
          const a = aim + (i / TEARS) * Math.PI * 2;
          // Two tears either side of the line to you are held back: the way out is toward him.
          if (i === 0 || i === 1 || i === TEARS - 1) continue;
          tk.spawnBullet({ x: toX + Math.cos(a) * 30, y: toY + Math.sin(a) * 30, angle: a, speed: 170, damage: 11, r: 6, color: TALLOW_LIT });
        }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      const dark = offUntil && time >= offFrom && time < offUntil;
      if (dark) {
        if (time < offFrom + EMBER_AT_MS + 200) smokeCurl(g, fromX, fromY - 60, t, 0.5, 50);
        if (time >= offFrom + EMBER_AT_MS) {
          const k = (time - offFrom - EMBER_AT_MS) / (SNUFF_DARK_MS - EMBER_AT_MS);
          glow(g, toX, toY - 56, 10 + k * 22, ACCENT, 0.06, 3);
          g.fillStyle(FLAME_MID, 0.6 + k * 0.4); g.fillCircle(toX, toY - 56, 2 + k * 3);
        }
        return;
      }
      if (!lastLight()) return;
      // The Last Light: his flame, over the dark.
      const x = tk.bossX, y = tk.bossY;
      glow(g, x, y - 20, 120, FLAME_MID, 0.035, 5);
      glow(g, x, y - 50, 40, FLAME_CORE, 0.06, 3);
      flame(g, x, y - 52, 13, t, 2, 0);
    },
    onPhaseEnd() {
      phaseEnds++;
      offUntil = 0;
      relit = true; moved = true;
    },
  };
};

// ── The def ──────────────────────────────────────────────────────────

/** A fixed seed so the body's drips hold still frame to frame. */
const DECOR_SEED = 4417;

export const TALLOW_BOSS: WorldBossDef = {
  worldId: 'isle:tallow',
  name: 'Prince Tallow',
  title: 'The Tall Candle of Candlewick',
  color: TALLOW,
  colorLit: TALLOW_LIT,
  colorDark: TALLOW_DARK,
  accent: ACCENT,
  damageMult: 1.0,

  intro: [
    'Stand up straight. You are being measured.',
    'Five foot nothing. Hardly worth the wick.',
    'Father keeps the Kiln. I keep the inches.',
  ],
  banter: [
    'Every house in this court burns for the King. Yours will too.',
    'I have been measured every morning of my life. I have never once come up short.',
    'Too slow and you hoard his light. Too fast and you waste it. There is a correct speed to die.',
    'Do you know how long a tall candle lasts? Longer than you.',
    'Inchwardens! Note the rate at which this one is guttering.',
    'Mind the drip. It is very expensive wax.',
  ],
  defeatLine: 'THE TALL CANDLE IS OUT',
  resumeLine: 'Back again? I have only lost an inch or two.',

  phases: [
    {
      name: 'The Tall Candle',
      line: 'Look up. Further. Further than that.',
      hp: 360,
      cycle: [
        'sig:inchTax', 'volley', 'sig:wickLash', 'barrage',
        'sig:dripCurtain', 'lanes', 'sig:wickLash', 'radial',
      ],
      harass: ['h-snipe', 'h-flak', 'h-rune'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Burned Down',
      line: 'You have made me SHORT. Do you understand what you have done?',
      hp: 430,
      cycle: [
        'sig:moltenFlood', 'slamchain', 'sig:sealingWax', 'stream',
        'sig:wickLash', 'hazard', 'sig:moltenFlood', 'charge', 'sig:sealingWax', 'quake',
      ],
      harass: ['h-mines', 'h-flak', 'h-snipe', 'h-rune'],
      restMs: 980,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE LAST INCH BURNS BRIGHTEST',
    extraPhase: {
      name: 'Last Light',
      line: 'Then let it be dark. I will still be the tallest thing in it.',
      hp: 320,
      cycle: [
        'sig:snuffed', 'sig:moths', 'sig:inchTax', 'spiral',
        'sig:snuffed', 'homing', 'sig:moths', 'sig:wickLash', 'lanes',
      ],
      harass: ['h-orbs', 'h-rune', 'h-flak'],
      restMs: 820,
      harassMs: 2500,
    },
  },

  tuning: {
    barrage: { radius: 52 },
    hazard: { durationMs: 5200 },
  },

  signatures: {
    wickLash,
    inchTax,
    dripCurtain,
    moltenFlood,
    sealingWax,
    moths,
    snuffed,
  },

  look: { crest: 'none', pattern: 'drip', aura: 'flame', hands: 'ball', torsoR: 34, mouth: 'line', eyes: 2 },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'rush', gimmick: 'none', tint: 'hot', look: { torsoR: 40, mouth: 'grate', aura: 'sparks' } },
    { movement: 'blink', gimmick: 'gloom', tint: 'pale', look: { torsoR: 30, aura: 'smoke', mouth: 'none', eyes: 1 } },
  ],

  /**
   * The candle itself. Phase one stands a tall wax column on his head, wick and flame on top,
   * shrinking as the phase's health goes; phase two is the stub — a molten crater where the
   * column was, wax overflowing down the body into a pool at his feet; the Last Light leaves a
   * finger-width stub and a flame far too big for it.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const R = s.radius;
    const rng = mulberry(DECOR_SEED);
    if (s.phaseIdx === 0) {
      const colW = R * 1.05;
      const colH = 46 + 74 * s.hpRatio;
      const base = s.y - R * 0.72;
      const tip = candle(g, s.x, base, colW, colH, s.palette.main, rng, 0.25, Math.sin(t * 0.7) * 3);
      flame(g, tip.x, tip.y, 9 + s.castGlow * 5 + (s.enraged ? 2 : 0), t, 1, 0.06);
      // The measuring tape he wears as a sash.
      g.lineStyle(6, HONEY, 0.95);
      g.lineBetween(s.x - R * 0.85, s.y - R * 0.45, s.x + R * 0.7, s.y + R * 0.6);
      g.lineStyle(1, 0x2a1d10, 0.8);
      for (let i = 0; i < 9; i++) {
        const k = i / 8;
        const x = s.x - R * 0.85 + (R * 1.55) * k, y = s.y - R * 0.45 + (R * 1.05) * k;
        g.lineBetween(x, y - 3, x + 1.5, y + (i % 2 ? 0 : 2));
      }
    } else if (s.phaseIdx === 1) {
      // Pool at his feet.
      waxPuddle(g, s.x, s.y + R * 0.85, R * 1.5, t, 0, MOLTEN, 3);
      // Wax overflowing the crater and running down the body.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.12 + i * 0.13);
        const x = s.x + Math.cos(a) * R * 0.92;
        const y = s.y + Math.sin(a) * R * 0.92;
        const len = 10 + ((i * 7) % 11) + Math.sin(t * 1.5 + i) * 3;
        g.fillStyle(lit(MOLTEN, 0.15), 0.95); g.fillRoundedRect(x - 3, y, 6, len, 3);
        g.fillCircle(x, y + len, 3.6);
      }
      g.fillStyle(dim(s.palette.main, 0.2), 1); g.fillEllipse(s.x, s.y - R * 0.82, R * 1.3, R * 0.42);
      g.fillStyle(MOLTEN, 1); g.fillEllipse(s.x, s.y - R * 0.8, R * 1.1, R * 0.32);
      g.fillStyle(0xffffff, 0.4); g.fillEllipse(s.x - R * 0.25, s.y - R * 0.84, R * 0.3, R * 0.08);
      g.lineStyle(2, WICK, 1); g.lineBetween(s.x, s.y - R * 0.8, s.x + 2, s.y - R * 0.8 - 9);
      flame(g, s.x + 2, s.y - R * 0.8 - 9, 13 + s.castGlow * 6, t * 1.6, 4, 0.07);
      for (let i = 0; i < 6; i++) {
        const ph = ((s.t + i * 170) % 900) / 900;
        g.fillStyle(FLAME_MID, (1 - ph) * 0.9);
        g.fillCircle(s.x + Math.sin(t * 3 + i * 2) * (8 + i * 3), s.y - R - 14 - ph * 46, 1.8);
      }
    } else {
      const stubH = 12;
      const base = s.y - R * 0.75;
      g.fillStyle(dim(WAX, 0.3), 1); g.fillRect(s.x - 5, base - stubH, 10, stubH);
      g.fillStyle(WAX, 1); g.fillRect(s.x - 4, base - stubH, 7, stubH);
      g.lineStyle(2, WICK, 1); g.lineBetween(s.x, base - stubH, s.x, base - stubH - 6);
      // Drawn here for anything the gloom leaves visible; the Snuffed signature draws the
      // over-the-dark copy that is the phase's whole point.
      flame(g, s.x, base - stubH - 6, 15 + s.castGlow * 6, t, 2, 0.08);
      g.fillStyle(mixC(FLAME_CORE, 0xffffff, 0.5), 0.9); g.fillCircle(s.x, base - stubH - 14, 3);
    }
    // Wax sweat when he is struck.
    if (s.hurt) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(lit(WAX, 0.2), 0.9);
        g.fillCircle(s.x + (i - 1.5) * R * 0.4, s.y + R * 0.4 + (i % 2) * 6, 3);
      }
    }
  },

  /**
   * His throne hall, at the foot of the colossal candle: the floor is a cross-section of the
   * candle itself — poured rings of wax, year on year, round the black well where the wick goes
   * down — with drip-runnels cut outward to the rim and a palisade of tapers round the edge.
   */
  drawArena(g, W, H) {
    const cx = W / 2, cy = (H + 96) / 2;
    g.fillStyle(0x2a1f14, 1); g.fillRect(0, 0, W, H);
    const maxR = Math.hypot(W, H) * 0.55;
    for (let i = 0; i < 26; i++) {
      const r = maxR * (1 - i / 26);
      const c = i % 2 ? mixC(WAX, WAX_OLD, 0.25 + (i % 5) * 0.06) : mixC(WAX, 0xfff4d6, (i % 3) * 0.1);
      g.fillStyle(c, 1); g.fillEllipse(cx, cy, r * 2, r * 1.5);
    }
    // The wick well.
    g.fillStyle(WAX_DARK, 1); g.fillEllipse(cx, cy, 86, 60);
    g.fillStyle(0x140c06, 1); g.fillEllipse(cx, cy, 58, 40);
    g.lineStyle(3, BRASS, 0.8); g.strokeEllipse(cx, cy, 92, 66);
    // Runnels to the rim.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13;
      g.lineStyle(5, dim(WAX, 0.25), 0.7);
      g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 42, cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR * 0.75);
      g.lineStyle(1.5, 0xffffff, 0.35);
      g.lineBetween(cx + Math.cos(a) * 62, cy + Math.sin(a) * 43 - 2, cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR * 0.75 - 2);
    }
    // The Inchwardens' marks on the floor: a ring of tick-lines like a vast dial.
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r0 = 250, r1 = i % 6 === 0 ? 278 : 262;
      g.lineStyle(i % 6 === 0 ? 2.5 : 1.2, WAX_DARK, 0.55);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.68, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.68);
    }
    // Tapers round the edge, top and bottom rows (flames static on the baked floor).
    const rng = mulberry(9001);
    for (let x = 40; x < W; x += 74) {
      for (const y of [112, H - 12]) {
        const tip = candle(g, x + (rng() - 0.5) * 12, y, 16, 26 + rng() * 22, WAX, rng, 0.3);
        g.fillStyle(FLAME_MID, 0.18); g.fillCircle(tip.x, tip.y - 4, 12);
        g.fillStyle(FLAME, 0.95); g.fillTriangle(tip.x - 3, tip.y, tip.x + 3, tip.y, tip.x, tip.y - 11);
        g.fillStyle(FLAME_CORE, 0.95); g.fillCircle(tip.x, tip.y - 2, 2);
      }
    }
    // Royal seal pressed into the floor before the throne.
    brandSigil(g, cx, cy - 160, 22, SEAL_RED, 0.45);
  },
};
