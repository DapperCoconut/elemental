import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mixC } from '../../../../art/IsleArt';
import { SF, angDiff, breathMeter, clamp, comet, inlayStar, segDist, star } from './palette';

/**
 * Prince Nova, the Evening Star — the King's youngest, who keeps the Ledger of Stars. Every soul on
 * Highspire has a star in his chart, named at birth; when a household falls behind on the Breath
 * Tax he inks their star out, and the collectors come up the Cloudstair with their bottles. He is
 * a boy made of starlight: a white-violet body with a slow ring of rays behind his head, gold eyes,
 * and over his heart a little golden breath-meter whose needle never moves — the royal family pays
 * no breath. He is vain, precise and bored, and he burns.
 *
 * Phase one, *Starlight*: he hovers and draws. Constellations are pricked out round you and then
 * snap shut like a drawstring; the Pole Star is set over the floor and the whole sky wheels round
 * it in rings, each with a gap. Phase two, *Red Giant*: he swells to twice his size, red and
 * roaring, and walks you down — his body balloons out in a burning disc that sheds a nebula ring,
 * plasma loops arch out of him and crash down, and the solar wind pours off him and blows you back
 * through a stream of embers. Hard mode, *White Dwarf*: he collapses into a tiny, blinding, heavy
 * point and moves like light — ricocheting off the walls along lines he shows you once, and
 * dropping crumbs of degenerate matter that drag you in before they burst.
 */

const BODY = 0xf4f0ff;
const BODY_LIT = 0xffffff;
const BODY_DARK = 0x3a2a8e;
const FIELD_TOP = 96;

const secs = (dt: number): number => (dt > 1 ? dt / 1000 : dt);

// ── Signature: Constellation (phase 1) ───────────────────────────────
// Six stars are pricked out round you, one by one, and joined into a figure. Then it snaps shut:
// every line pulls in to the middle like a drawstring. Be outside it when it does.

const snap = (tk: BossToolkit): SignatureMove => {
  interface Fig { pts: { x: number; y: number }[]; cx: number; cy: number; bornAt: number; snapAt: number; doneAt: number; hit: boolean }
  const SNAP_MS = 460;
  let figs: Fig[] = [];
  const at = (f: Fig, time: number): { x: number; y: number }[] => {
    const k = clamp((time - f.snapAt) / SNAP_MS, 0, 1);
    const e = k * k;
    return f.pts.map((p) => ({ x: p.x + (f.cx - p.x) * e, y: p.y + (f.cy - p.y) * e }));
  };
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'point',
    tell: 'CONSTELLATION',
    cast(time) {
      tk.sfx('crystal-chime');
      figs = [];
      const n = tk.hard ? 2 : 1;
      for (let j = 0; j < n; j++) {
        const p = tk.player;
        const cx = tk.clampX(p.x + (j ? (Math.random() - 0.5) * 260 : 0), 120), cy = tk.clampY(p.y + (j ? (Math.random() - 0.5) * 180 : 0), 120);
        const pts: { x: number; y: number }[] = [];
        const rot = Math.random() * Math.PI * 2;
        for (let i = 0; i < 6; i++) {
          const a = rot + (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const r = 150 + Math.random() * 45;
          pts.push({ x: clamp(cx + Math.cos(a) * r, 20, tk.W - 20), y: clamp(cy + Math.sin(a) * r * 0.8, FIELD_TOP + 10, tk.H - 10) });
        }
        const bornAt = time + j * 700;
        figs.push({ pts, cx, cy, bornAt, snapAt: bornAt + tk.warn(1150), doneAt: bornAt + tk.warn(1150) + SNAP_MS, hit: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const f of figs) {
        if (f.hit || time < f.snapAt || time > f.doneAt) continue;
        const pts = at(f, time);
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 16) {
            f.hit = true;
            tk.hitPlayer(16, p.x, p.y);
            tk.sfx('snap-back');
            break;
          }
        }
      }
      if (figs.length && figs.every((f) => time > f.doneAt + 400)) figs = [];
    },
    drawGround(g, time) {
      for (const f of figs) {
        if (time < f.bornAt || time > f.doneAt + 300) continue;
        if (time < f.snapAt) {
          // The stars prick out in order, the lines drawn between them as they come.
          const k = clamp((time - f.bornAt) / (f.snapAt - f.bornAt), 0, 1);
          const shown = Math.floor(k * 7);
          const pts = f.pts;
          g.fillStyle(SF.violet, 0.05 + k * 0.1);
          g.fillPoints(pts.map((q) => new Phaser.Geom.Point(q.x, q.y)), true, true);
          for (let i = 0; i < Math.min(shown, 6); i++) {
            const a = pts[i], b = pts[(i + 1) % 6];
            if (i + 1 < shown || shown >= 6) { g.lineStyle(2, SF.star, 0.4 + k * 0.5); g.lineBetween(a.x, a.y, b.x, b.y); }
          }
        }
      }
    },
    drawAir(g, time) {
      for (const f of figs) {
        if (time < f.bornAt || time > f.doneAt + 300) continue;
        if (time < f.snapAt) {
          const k = clamp((time - f.bornAt) / (f.snapAt - f.bornAt), 0, 1);
          const shown = Math.floor(k * 7);
          f.pts.forEach((q, i) => { if (i < shown) star(g, q.x, q.y, 9 + k * 5, SF.star, 0.9); });
        } else {
          const pts = at(f, Math.min(time, f.doneAt));
          const fade = time > f.doneAt ? 1 - (time - f.doneAt) / 300 : 1;
          g.lineStyle(5, SF.starHot, fade);
          for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; g.lineBetween(a.x, a.y, b.x, b.y); }
          g.lineStyle(12, SF.violet, 0.35 * fade);
          for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; g.lineBetween(a.x, a.y, b.x, b.y); }
          for (const q of pts) star(g, q.x, q.y, 10, SF.starHot, fade);
          if (time > f.doneAt) star(g, f.cx, f.cy, 40 * fade, SF.starHot, fade);
        }
      }
    },
    onPhaseEnd() { figs = []; },
  };
};

// ── Signature: Pole Star (phase 1) ───────────────────────────────────
// He sets the Pole Star over the floor and the sky wheels round it: three rings of stars, each
// with one gap, turning in alternate directions and breathing in and out. Keep between them,
// or slip through a gap.

const polaris = (tk: BossToolkit): SignatureMove => {
  const BASE = [100, 190, 280];
  const AMP = 22;
  const STAR_R = 9;
  let px = 0, py = 0, bornAt = 0, liveAt = 0, endAt = 0, active = false, lastHit = 0;
  let gaps: number[] = [];
  const spin = [0.7, -0.5, 0.36];
  const radiusOf = (i: number, time: number): number => BASE[i] + AMP * Math.sin(time / 600 + i * 2.1);
  const starsOf = (i: number, time: number): { x: number; y: number }[] => {
    const r = radiusOf(i, time);
    const n = Math.floor((Math.PI * 2 * r) / 34);
    const rot = ((time - bornAt) / 1000) * spin[i];
    const out: { x: number; y: number }[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rot;
      if (Math.abs(angDiff(a, gaps[i] + rot)) < 0.5) continue;
      out.push({ x: px + Math.cos(a) * r, y: py + Math.sin(a) * r });
    }
    return out;
  };
  return {
    durationMs: 3800,
    windupMs: 550,
    hold: 'conduct',
    tell: 'POLE STAR',
    cast(time) {
      tk.sfx('sparkle');
      const p = tk.player;
      const a = Math.random() * Math.PI * 2;
      px = tk.clampX(p.x + Math.cos(a) * 60, 100); py = tk.clampY(p.y + Math.sin(a) * 60, 100);
      gaps = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
      bornAt = time; liveAt = time + tk.warn(950); endAt = liveAt + (tk.hard ? 3000 : 2600);
      active = true;
    },
    update(time) {
      if (!active) return;
      if (time > endAt) { active = false; return; }
      if (time < liveAt || time - lastHit < 600) return;
      const p = tk.player;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(Math.hypot(p.x - px, p.y - py) - radiusOf(i, time)) > STAR_R + 20) continue;
        if (starsOf(i, time).some((s) => Math.hypot(p.x - s.x, p.y - s.y) < STAR_R + 16)) {
          lastHit = time;
          tk.hitPlayer(10, p.x, p.y);
          tk.sfx('zap');
          return;
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const live = time >= liveAt;
      for (let i = 0; i < 3; i++) {
        g.lineStyle(1, SF.violetLit, live ? 0.2 : 0.35);
        g.strokeCircle(px, py, radiusOf(i, time));
      }
      // The meridians of the wheeling sky.
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + (time - bornAt) / 3000;
        g.lineStyle(1, SF.violet, 0.15); g.lineBetween(px, py, px + Math.cos(a) * 320, py + Math.sin(a) * 320);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const live = time >= liveAt;
      const k = live ? 1 : clamp((time - bornAt) / (liveAt - bornAt), 0, 1);
      for (let i = 0; i < 3; i++) for (const s of starsOf(i, time)) star(g, s.x, s.y, live ? STAR_R : 4 + k * 3, live ? SF.star : SF.violetLit, live ? 1 : 0.5);
      star(g, px, py, 18 + Math.sin(time / 120) * 3, SF.starGold, 1);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Red Giant (phase 2) ───────────────────────────────────
// He balloons. A dull red ring shows how far: his burning body rolls out to it, then throws its
// outer layer off as a slow planetary nebula — a ring with one gap, drifting out across the room.

const giant = (tk: BossToolkit): SignatureMove => {
  const MAX = 230;
  let ox = 0, oy = 0, bornAt = 0, swellAt = 0, peakAt = 0, shellR = 0, gapA = 0, active = false, burned = false, shellHit = false;
  return {
    durationMs: 3600,
    windupMs: 650,
    hold: 'brace',
    tell: 'RED GIANT',
    cast(time) {
      tk.sfx('inferno');
      ox = tk.bossX; oy = tk.bossY;
      bornAt = time; swellAt = time + tk.warn(900); peakAt = swellAt + 700;
      gapA = tk.angleToPlayer(ox, oy) + Math.PI * (0.6 + Math.random() * 0.8);
      shellR = 0; active = true; burned = false; shellHit = false;
    },
    update(time, dt) {
      if (!active) return;
      const p = tk.player;
      const d = Math.hypot(p.x - ox, p.y - oy);
      if (!burned && time >= swellAt && time <= peakAt) {
        const r = MAX * clamp((time - swellAt) / (peakAt - swellAt), 0, 1);
        if (d < r) { burned = true; tk.hitPlayer(18, p.x, p.y); tk.sfx('status-burn'); }
      }
      if (time > peakAt) {
        if (shellR === 0) { shellR = MAX; tk.sfx('flame-burst'); }
        shellR += 175 * secs(dt);
        const inGap = Math.abs(angDiff(Math.atan2(p.y - oy, p.x - ox), gapA)) < 0.55;
        if (!shellHit && !inGap && Math.abs(d - shellR) < 22) { shellHit = true; tk.hitPlayer(14, p.x, p.y); }
        if (shellR > 900) active = false;
      }
    },
    drawGround(g, time) {
      if (!active) return;
      if (time < swellAt) {
        const k = clamp((time - bornAt) / (swellAt - bornAt), 0, 1);
        g.fillStyle(SF.giantDeep, 0.08 + k * 0.14); g.fillCircle(ox, oy, MAX);
        g.lineStyle(3, SF.giant, 0.4 + k * 0.5); g.strokeCircle(ox, oy, MAX);
      } else if (time <= peakAt + 250) {
        const r = MAX * clamp((time - swellAt) / (peakAt - swellAt), 0, 1);
        g.fillStyle(SF.giant, 0.4); g.fillCircle(ox, oy, r);
        g.fillStyle(SF.giantLit, 0.25); g.fillCircle(ox, oy, r * 0.7);
        g.lineStyle(4, SF.giantLit, 0.9); g.strokeCircle(ox, oy, r);
      }
      if (shellR > 0) {
        // The nebula: a ragged pink-and-teal shell, its gap a dark notch.
        const fade = clamp((900 - shellR) / 300, 0, 1);
        g.lineStyle(36, SF.nebula, 0.22 * fade);
        g.beginPath(); g.arc(ox, oy, shellR, gapA + 0.55, gapA - 0.55 + Math.PI * 2, false); g.strokePath();
        g.lineStyle(6, SF.nebula, 0.8 * fade);
        g.beginPath(); g.arc(ox, oy, shellR, gapA + 0.55, gapA - 0.55 + Math.PI * 2, false); g.strokePath();
        g.lineStyle(3, SF.comet, 0.5 * fade);
        g.beginPath(); g.arc(ox, oy, shellR - 14, gapA + 0.6, gapA - 0.6 + Math.PI * 2, false); g.strokePath();
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Prominence (phase 2) ──────────────────────────────────
// Loops of plasma arch out of him and come down: each shows its line on the floor and a ring at
// its far foot, the arch climbs, then it crashes — the foot bursts and the line burns.

const prominence = (tk: BossToolkit): SignatureMove => {
  interface Loop { ax: number; ay: number; bx: number; by: number; bornAt: number; fireAt: number; fired: boolean }
  const FOOT_R = 56;
  const HALF = 16;
  let loops: Loop[] = [];
  return {
    durationMs: 3000,
    windupMs: 550,
    gesture: 'raise',
    tell: 'PROMINENCE',
    cast(time) {
      tk.sfx('plasma-arc');
      loops = [];
      const n = tk.hard ? 5 : 4;
      const base = tk.angleToPlayer();
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 260, () => {
          const p = tk.player;
          const a = base + (i - (n - 1) / 2) * 0.55;
          const near = i === Math.floor(n / 2);
          const d = 200 + Math.random() * 150;
          const bx = near ? tk.clampX(p.x, 50) : tk.clampX(tk.bossX + Math.cos(a) * d, 50);
          const by = near ? tk.clampY(p.y, 50) : tk.clampY(tk.bossY + Math.sin(a) * d, 50);
          loops.push({ ax: tk.bossX, ay: tk.bossY, bx, by, bornAt: tk.now, fireAt: tk.now + tk.warn(1000), fired: false });
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of loops) {
        if (l.fired || time < l.fireAt) continue;
        l.fired = true;
        tk.sfx('explosion-medium');
        if (Math.hypot(p.x - l.bx, p.y - l.by) < FOOT_R) tk.hitPlayer(16, p.x, p.y);
        else if (segDist(p.x, p.y, l.ax, l.ay, l.bx, l.by) < HALF + 14) tk.hitPlayer(12, p.x, p.y);
      }
      loops = loops.filter((l) => time < l.fireAt + 600);
    },
    drawGround(g, time) {
      for (const l of loops) {
        if (!l.fired) {
          const k = clamp((time - l.bornAt) / (l.fireAt - l.bornAt), 0, 1);
          g.lineStyle(HALF * 2, SF.giant, 0.08 + k * 0.14); g.lineBetween(l.ax, l.ay, l.bx, l.by);
          g.lineStyle(2, SF.giantLit, 0.4 + k * 0.4); g.lineBetween(l.ax, l.ay, l.bx, l.by);
          g.fillStyle(SF.giant, 0.1 + k * 0.2); g.fillCircle(l.bx, l.by, FOOT_R);
          g.lineStyle(2, SF.giantLit, 0.5 + k * 0.5); g.strokeCircle(l.bx, l.by, FOOT_R * (1.3 - k * 0.3));
        } else {
          const k = clamp((time - l.fireAt) / 600, 0, 1);
          g.lineStyle(HALF * 2 * (1 - k * 0.5), SF.giantLit, 0.6 * (1 - k)); g.lineBetween(l.ax, l.ay, l.bx, l.by);
          g.fillStyle(SF.giantDeep, 0.5 * (1 - k)); g.fillCircle(l.bx, l.by, FOOT_R);
        }
      }
    },
    drawAir(g, time) {
      for (const l of loops) {
        // The arch itself, climbing as it winds up, then slamming flat.
        const k = l.fired ? 1 - clamp((time - l.fireAt) / 220, 0, 1) : clamp((time - l.bornAt) / (l.fireAt - l.bornAt), 0, 1);
        if (k <= 0) continue;
        const h = 40 + k * 150;
        g.lineStyle(7, SF.giant, 0.85); g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const x = l.ax + (l.bx - l.ax) * u, y = l.ay + (l.by - l.ay) * u - Math.sin(u * Math.PI) * h;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        g.lineStyle(3, SF.giantLit, 0.95); g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const x = l.ax + (l.bx - l.ax) * u, y = l.ay + (l.by - l.ay) * u - Math.sin(u * Math.PI) * h - 2;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
    },
    onPhaseEnd() { loops = []; },
  };
};

// ── Signature: Solar Wind (phase 2) ──────────────────────────────────
// He exhales. A cone of solar wind pours off him toward you for two seconds: it shoves the whole
// room away from him and carries a stream of embers down its length. Get out of the cone.

const solarWind = (tk: BossToolkit): SignatureMove => {
  const HALF = 0.42;
  const LEN = 620;
  let a0 = 0, ox = 0, oy = 0, bornAt = 0, liveAt = 0, endAt = 0, lastEmber = 0, active = false;
  return {
    durationMs: 3200,
    windupMs: 500,
    hold: 'spray',
    tell: 'SOLAR WIND',
    cast(time) {
      tk.sfx('gust');
      ox = tk.bossX; oy = tk.bossY;
      a0 = tk.angleToPlayer();
      bornAt = time; liveAt = time + tk.warn(750); endAt = liveAt + 2100;
      active = true;
    },
    update(time) {
      if (!active) return;
      if (time > endAt) { active = false; return; }
      if (time < liveAt) return;
      ox = tk.bossX; oy = tk.bossY;
      // The blow: a steady shove away from him, applied as suction toward a point far down the cone.
      tk.pull(ox + Math.cos(a0) * 2000, oy + Math.sin(a0) * 2000, 85, 150);
      if (time - lastEmber > (tk.hard ? 95 : 120)) {
        lastEmber = time;
        const a = a0 + (Math.random() - 0.5) * HALF * 1.8;
        tk.spawnBullet({ x: ox + Math.cos(a) * 40, y: oy + Math.sin(a) * 40, angle: a, speed: 330 + Math.random() * 80, damage: 4, r: 5, lifeMs: 2200, color: SF.giantLit });
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = time < liveAt ? clamp((time - bornAt) / (liveAt - bornAt), 0, 1) : 1;
      const pts = [new Phaser.Geom.Point(ox, oy)];
      for (let i = 0; i <= 10; i++) { const a = a0 - HALF + (i / 10) * HALF * 2; pts.push(new Phaser.Geom.Point(ox + Math.cos(a) * LEN, oy + Math.sin(a) * LEN)); }
      g.fillStyle(SF.giant, time < liveAt ? 0.06 + k * 0.1 : 0.12); g.fillPoints(pts, true, true);
      g.lineStyle(2, SF.giantLit, 0.4 + k * 0.4);
      g.lineBetween(ox, oy, ox + Math.cos(a0 - HALF) * LEN, oy + Math.sin(a0 - HALF) * LEN);
      g.lineBetween(ox, oy, ox + Math.cos(a0 + HALF) * LEN, oy + Math.sin(a0 + HALF) * LEN);
    },
    drawAir(g, time) {
      if (!active || time < liveAt) return;
      // Streamers of wind racing down the cone.
      for (let i = 0; i < 16; i++) {
        const ph = ((time / 1000) * 2.2 + i * 0.137) % 1;
        const a = a0 + Math.sin(i * 2.3) * HALF * 0.9;
        const r = 50 + ph * (LEN - 50);
        g.lineStyle(2, mixC(SF.giantLit, 0xffffff, 0.4), 0.55 * (1 - ph));
        g.lineBetween(ox + Math.cos(a) * r, oy + Math.sin(a) * r, ox + Math.cos(a) * (r + 46), oy + Math.sin(a) * (r + 46));
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: White Dwarf (hard) ────────────────────────────────────
// He becomes a blinding point and moves like light: the path is drawn once — three straight runs,
// banking off the walls — and then he takes it, faster than you can follow. Be off every line.

const dwarfDash = (tk: BossToolkit): SignatureMove => {
  const SPEED = 950;
  const HIT_R = 34;
  let path: { x: number; y: number }[] = [];
  let bornAt = 0, goAt = 0, active = false, hitLeg = -1;
  const legTimes = (): number[] => {
    const out = [0];
    for (let i = 1; i < path.length; i++) out.push(out[i - 1] + (Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) / SPEED) * 1000);
    return out;
  };
  const posAt = (time: number): { x: number; y: number; leg: number } | null => {
    const ts = legTimes();
    const e = time - goAt;
    for (let i = 1; i < path.length; i++) {
      if (e <= ts[i]) {
        const k = (e - ts[i - 1]) / Math.max(1, ts[i] - ts[i - 1]);
        return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * k, y: path[i - 1].y + (path[i].y - path[i - 1].y) * k, leg: i };
      }
    }
    return null;
  };
  return {
    durationMs: 2800,
    windupMs: 450,
    locksBody: true,
    gesture: 'recoil',
    tell: 'WHITE DWARF',
    cast(time) {
      tk.sfx('blink');
      // Aim at the player, then bank off the walls twice.
      let x = tk.bossX, y = tk.bossY;
      let a = tk.angleToPlayer();
      path = [{ x, y }];
      const x0 = 50, x1 = tk.W - 50, y0 = FIELD_TOP + 40, y1 = tk.H - 40;
      for (let b = 0; b < 3; b++) {
        const dx = Math.cos(a), dy = Math.sin(a);
        const tx = dx > 0 ? (x1 - x) / dx : dx < 0 ? (x0 - x) / dx : Infinity;
        const ty = dy > 0 ? (y1 - y) / dy : dy < 0 ? (y0 - y) / dy : Infinity;
        const t = Math.min(tx, ty);
        x += dx * t; y += dy * t;
        path.push({ x, y });
        if (tx < ty) a = Math.PI - a; else a = -a;
      }
      bornAt = time; goAt = time + tk.warn(800); active = true; hitLeg = -1;
    },
    update(time) {
      if (!active) return;
      if (time < goAt) return;
      const pos = posAt(time);
      if (!pos) {
        const end = path[path.length - 1];
        tk.host.setBossPos(end.x, end.y);
        active = false;
        tk.sfx('land');
        return;
      }
      tk.host.setBossPos(pos.x, pos.y);
      const p = tk.player;
      if (hitLeg !== pos.leg && Math.hypot(p.x - pos.x, p.y - pos.y) < HIT_R) {
        hitLeg = pos.leg;
        tk.hitPlayer(17, p.x, p.y);
        tk.sfx('hit-heavy');
      }
    },
    drawGround(g, time) {
      if (!active && time > goAt + 1200) return;
      const k = clamp((time - bornAt) / Math.max(1, goAt - bornAt), 0, 1);
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        g.lineStyle(HIT_R * 2, 0xffffff, time < goAt ? 0.05 + k * 0.1 : 0.04);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(2, 0xffffff, time < goAt ? 0.4 + k * 0.5 : 0.2);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (let i = 1; i < path.length - 1; i++) { g.lineStyle(2, SF.starGold, 0.7); g.strokeCircle(path[i].x, path[i].y, 14); }
    },
    drawAir(g, time) {
      if (!active || time < goAt) return;
      const pos = posAt(time);
      if (!pos) return;
      const prev = path[pos.leg - 1];
      comet(g, pos.x, pos.y, Math.atan2(pos.y - prev.y, pos.x - prev.x), 160, 8, time / 1000, 1, 0xffffff);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Degenerate Matter (hard) ──────────────────────────────
// He sheds crumbs of himself — matter so dense a spoonful outweighs a mountain. They drop round
// you, the floor dimpling under each, and drag you toward them; then one by one they burst.

const degenerate = (tk: BossToolkit): SignatureMove => {
  interface Crumb { x: number; y: number; bornAt: number; popAt: number; popped: boolean }
  const R = 64;
  let crumbs: Crumb[] = [];
  return {
    durationMs: 3200,
    windupMs: 500,
    gesture: 'clap',
    tell: 'DEGENERATE MATTER',
    cast(time) {
      tk.sfx('gravity-slam');
      crumbs = [];
      const p = tk.player;
      const n = 5;
      const rot = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        const d = i === 0 ? 0 : 130 + Math.random() * 40;
        crumbs.push({ x: tk.clampX(p.x + Math.cos(a) * d, 60), y: tk.clampY(p.y + Math.sin(a) * d, 60), bornAt: time, popAt: time + tk.warn(1250) + i * 190, popped: false });
      }
    },
    update(time) {
      const live = crumbs.filter((c) => !c.popped);
      if (live.length) {
        // The drag: toward the heaviest point — the next to burst. Capped well under walk speed.
        const next = live.reduce((a, b) => (a.popAt < b.popAt ? a : b));
        tk.pull(next.x, next.y, 60, 120);
      }
      const p = tk.player;
      for (const c of crumbs) {
        if (c.popped || time < c.popAt) continue;
        c.popped = true;
        tk.sfx('explosion-small');
        if (Math.hypot(p.x - c.x, p.y - c.y) < R) tk.hitPlayer(14, p.x, p.y);
      }
      crumbs = crumbs.filter((c) => time < c.popAt + 500);
    },
    drawGround(g, time) {
      for (const c of crumbs) {
        if (!c.popped) {
          const k = clamp((time - c.bornAt) / (c.popAt - c.bornAt), 0, 1);
          // The floor dimpling: rings drawn inward toward the crumb.
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 700) + i / 3) % 1;
            g.lineStyle(1.5, 0xffffff, 0.3 * (1 - ph)); g.strokeCircle(c.x, c.y, R * (1 - ph) + 6);
          }
          g.fillStyle(0xffffff, 0.06 + k * 0.14); g.fillCircle(c.x, c.y, R);
          g.lineStyle(2, SF.starGold, 0.4 + k * 0.5); g.strokeCircle(c.x, c.y, R);
        } else {
          const k = clamp((time - c.popAt) / 500, 0, 1);
          g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillCircle(c.x, c.y, R * (0.5 + k * 0.6));
        }
      }
    },
    drawAir(g, time) {
      for (const c of crumbs) {
        if (c.popped) continue;
        const k = clamp((time - c.bornAt) / (c.popAt - c.bornAt), 0, 1);
        star(g, c.x, c.y, 6 + k * 8 + Math.sin(time / 50) * 1.5, 0xffffff, 1);
      }
    },
    onPhaseEnd() { crumbs = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const NOVA_BOSS: WorldBossDef = {
  worldId: 'isle:nova',
  name: 'Prince Nova',
  title: 'the Evening Star',
  color: BODY,
  colorLit: BODY_LIT,
  colorDark: BODY_DARK,
  accent: SF.starGold,
  damageMult: 1.3,

  intro: [
    'You climbed all the way above the clouds. Breathing hard, I expect. That will be on your account.',
    'Every soul on this rock has a star in my chart. I looked yours up. I have the ink ready.',
  ],
  banter: [
    'Father counts the breaths. I only keep the books.',
    'A star costs nothing to name and a great deal to keep lit. Ask anyone I have snuffed.',
    'My needle never moves. Do you know why? Because I do not owe the air. The air owes me.',
    'You fought my brothers and sisters down there in the weather. Up here there is no weather. Only light.',
    'Every star you see tonight is burning itself to death. They are so very proud of it.',
    'One more snuffed star in the Ledger. Nobody will notice. Nobody ever looks up.',
    'Stand still. I want to measure you.',
  ],
  defeatLine: 'THE EVENING STAR SETS',
  resumeLine: 'Another one on the summit, wheezing. I kept your page open.',

  phases: [
    {
      name: 'Starlight',
      line: 'Let me show you how a chart is drawn. Hold still — you are one of the points.',
      hp: 500,
      cycle: [
        'sig:snap', 'volley', 'sig:polaris', 'homing',
        'sig:snap', 'spiral', 'sig:polaris', 'sig:snap', 'barrage',
      ],
      harass: ['h-snipe', 'h-orbs', 'h-flak'],
      restMs: 1050,
      harassMs: 3200,
    },
    {
      name: 'Red Giant',
      line: 'Very well. I shall stop being polite and start being enormous.',
      hp: 600,
      cycle: [
        'sig:giant', 'sig:prominence', 'charge', 'sig:solarwind',
        'sig:prominence', 'quake', 'sig:giant', 'sweep', 'sig:solarwind', 'charge',
      ],
      harass: ['h-rune', 'h-lane', 'h-flak', 'h-mines'],
      restMs: 950,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE EVENING STAR COLLAPSES',
    extraPhase: {
      name: 'White Dwarf',
      line: 'There. Small. Heavy. Faster than your eyes. This is what a star is, at the end.',
      hp: 430,
      cycle: [
        'sig:dwarf', 'sig:degenerate', 'sig:snap', 'sig:dwarf',
        'stream', 'sig:degenerate', 'sig:polaris', 'sig:dwarf', 'slamchain',
      ],
      harass: ['h-snipe', 'h-orbs', 'h-rune', 'h-mines'],
      restMs: 760,
      harassMs: 2300,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.16, speed: 230 },
    homing: { count: 3 },
    spiral: { arms: 4, speed: 170 },
    barrage: { count: 6 },
    charge: { halfW: 56 },
    quake: { rings: 3, gapHalf: 0.55 },
    sweep: { halfW: 26 },
    stream: { count: 14 },
    slamchain: { count: 5 },
  },

  signatures: {
    snap,
    polaris,
    giant,
    prominence,
    solarwind: solarWind,
    dwarf: dwarfDash,
    degenerate,
  },

  /**
   * The Zenith Tower's observatory chamber: a floor of polished black stone with the whole of
   * Highspire's sky inlaid in silver across it — the ecliptic band, the meridian, hour-ticks round
   * the rim, and the figures of the constellations pricked out in gold — under the ribs of the dome,
   * whose slit, open along the top wall, shows the real night beyond.
   */
  drawArena(g, W, H) {
    g.fillStyle(SF.nightDeep, 1); g.fillRect(0, 0, W, H);
    // The slit in the dome along the top wall, the sky in it.
    g.fillStyle(SF.zenith, 1); g.fillRect(W / 2 - 160, 0, 320, FIELD_TOP);
    for (let i = 0; i < 40; i++) { g.fillStyle(SF.star, 0.4 + ((i * 37) % 10) / 20); g.fillRect(W / 2 - 150 + ((i * 97) % 300), (i * 53) % (FIELD_TOP - 6), 1.5, 1.5); }
    g.fillStyle(SF.stoneDark, 1); g.fillRect(W / 2 - 170, 0, 10, FIELD_TOP); g.fillRect(W / 2 + 160, 0, 10, FIELD_TOP);
    // Polished black floor.
    g.fillStyle(0x0d0e1c, 1); g.fillRect(0, FIELD_TOP, W, H - FIELD_TOP);
    for (let i = 0; i < 30; i++) { g.fillStyle(0x2a2d4a, 0.25); g.fillRect(((i * 211) % W), FIELD_TOP + ((i * 131) % (H - FIELD_TOP)), 90, 2); }
    // The great inlaid chart: a disc of silver lines.
    const cx = W / 2, cy = (FIELD_TOP + H) / 2, R = Math.min(W, H - FIELD_TOP) * 0.46;
    g.lineStyle(3, SF.silver, 0.5); g.strokeCircle(cx, cy, R);
    g.lineStyle(1.5, SF.silver, 0.3); g.strokeCircle(cx, cy, R * 0.66); g.strokeCircle(cx, cy, R * 0.33);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(i % 6 === 0 ? 2 : 1, SF.silver, i % 6 === 0 ? 0.45 : 0.2);
      g.lineBetween(cx + Math.cos(a) * R * (i % 6 === 0 ? 0.05 : 0.9), cy + Math.sin(a) * R * (i % 6 === 0 ? 0.05 : 0.9), cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }
    // The ecliptic: a tilted band of gold across the chart.
    g.lineStyle(14, SF.brass, 0.12); g.strokeEllipse(cx, cy, R * 1.9, R * 0.8);
    g.lineStyle(2, SF.brassLit, 0.5); g.strokeEllipse(cx, cy, R * 1.9, R * 0.8);
    // Gold stars pricked over it, and the figures joined in faint lines.
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const a = ((i * 137.5) % 360) * (Math.PI / 180), r = Math.sqrt(((i * 61) % 100) / 100) * R * 0.96;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      pts.push({ x, y });
      inlayStar(g, x, y, 2 + (i % 4), SF.leaf, 0.85, i);
    }
    g.lineStyle(1, SF.leaf, 0.25);
    for (let i = 0; i < pts.length - 1; i += 2) if (Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) < 140) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    // At the centre: his own star, the Evening Star, inlaid larger than any other.
    inlayStar(g, cx, cy, 14, SF.starGold, 1);
    // The dome's ribs along the side walls.
    for (let y = FIELD_TOP + 30; y < H; y += 90) {
      for (const x of [14, W - 14]) { g.fillStyle(SF.brassDark, 1); g.fillRect(x - 6, y, 12, 50); g.fillStyle(SF.brass, 1); g.fillRect(x - 3, y, 4, 50); }
    }
  },

  look: { crest: 'halo', pattern: 'rings', aura: 'sparks', hands: 'orb', torsoR: 36, mouth: 'line', eyes: 2, eyeColor: 0xffe08a },

  /**
   * The star-boy: a slow wheel of eight rays behind his head, pinpoint stars between his head and
   * hands joined in lines like a figure, and over his heart a gold breath-meter whose needle sits at
   * zero. As a Red Giant the rays become a roaring corona and dark sunspots drift across him. As a
   * White Dwarf he is a blinding point with a lens-flare cross through it.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const r = s.radius;
    const giantPhase = s.phaseIdx === 1;
    const dwarf = s.hard && s.phaseIdx >= 2;
    if (dwarf) {
      g.fillStyle(0xffffff, 0.25); g.fillCircle(s.x, s.y, r * 2.2);
      g.lineStyle(2, 0xffffff, 0.8);
      g.lineBetween(s.x - r * 4, s.y, s.x + r * 4, s.y); g.lineBetween(s.x, s.y - r * 4, s.x, s.y + r * 4);
      g.lineStyle(1, SF.comet, 0.6);
      g.lineBetween(s.x - r * 2.4, s.y - r * 2.4, s.x + r * 2.4, s.y + r * 2.4); g.lineBetween(s.x - r * 2.4, s.y + r * 2.4, s.x + r * 2.4, s.y - r * 2.4);
      star(g, s.x, s.y, r * 1.4 + Math.sin(t * 20) * 2, 0xffffff, 0.9);
      return;
    }
    if (giantPhase) {
      // The corona: tongues of flame all the way round, roaring.
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + t * 0.3;
        const L = r * (0.35 + 0.25 * Math.sin(t * 5 + i * 1.7)) * (1 + s.castGlow * 0.5);
        g.lineStyle(5, i % 2 ? SF.giant : SF.giantLit, 0.75);
        g.lineBetween(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, s.x + Math.cos(a) * (r + L), s.y + Math.sin(a) * (r + L));
      }
      // Sunspots drifting across the face.
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.12 + i / 3) % 1);
        const sx = s.x - r * 0.7 + k * r * 1.4, sy = s.y + (i - 1) * r * 0.32;
        const fade = Math.sin(k * Math.PI);
        g.fillStyle(SF.giantDeep, 0.7 * fade); g.fillCircle(sx, sy, r * 0.12);
        g.fillStyle(0x000000, 0.5 * fade); g.fillCircle(sx, sy, r * 0.06);
      }
    } else {
      // The wheel of rays behind his head.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.4;
        const L = r * (i % 2 ? 0.5 : 0.85) * (1 + s.castGlow * 0.4);
        const bx = s.x + Math.cos(a) * r * 0.95, by = s.y - r * 0.2 + Math.sin(a) * r * 0.95;
        g.fillStyle(SF.starGold, 0.55);
        g.fillTriangle(bx - Math.sin(a) * 4, by + Math.cos(a) * 4, bx + Math.sin(a) * 4, by - Math.cos(a) * 4, bx + Math.cos(a) * L, by + Math.sin(a) * L);
      }
      // A figure drawn between his head and his hands.
      const crown = { x: s.x, y: s.y - r * 1.25 };
      const hs = s.hands.slice(0, 2);
      g.lineStyle(1.5, SF.star, 0.6);
      for (const h of hs) g.lineBetween(crown.x, crown.y, h.x, h.y);
      if (hs.length === 2) g.lineBetween(hs[0].x, hs[0].y, hs[1].x, hs[1].y);
      star(g, crown.x, crown.y, 7 + Math.sin(t * 3) * 1.5, SF.star, 1);
      for (const h of hs) star(g, h.x, h.y, 5, SF.star, 0.9);
    }
    // The royal breath-meter over his heart: needle at zero, always.
    breathMeter(g, s.x + r * 0.3, s.y + r * 0.35, r * 0.2, 0);
    if (s.hurt) { g.fillStyle(SF.violet, 0.3); g.fillCircle(s.x, s.y, r * 0.95); }
  },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'shrink', tint: 'hot', look: { torsoR: 52, crest: 'spires', aura: 'flame', pattern: 'swirl', hands: 'claw', mouth: 'maw', eyeColor: 0xffb070 } },
    { movement: 'rush', gimmick: 'none', tint: 'pale', look: { torsoR: 22, crest: 'none', aura: 'sparks', pattern: 'smooth', hands: 'wisp', mouth: 'none', eyes: 1, eyeColor: 0xffffff } },
  ],
};
