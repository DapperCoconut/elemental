import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { auroraCurtain, auroraHue, compassRose, horseshoe, ironPlate, poleBadge } from './art';
import {
  AURORA_CRIMSON, AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET, BASALT, BASALT_DARK, BASALT_LIT, BRASS, BRASS_DARK, BRASS_LIT,
  COPPER, FILINGS, FILINGS_LIT, IRON, IRON_DARK, IRON_LIT, NORTH, NORTH_LIT, POLAR, POLAR_DARK, POLAR_LIT, SLATE_DEEP, SOUTH,
  SOUTH_LIT, SPARK,
} from './palette';
import { clamp, dist } from './util';

/**
 * Prince Polar, True North — Empress Ohmrine's son, governor of the Lodestar Court.
 *
 * His mother set him at the telescope when he was six and told him there is one star that never
 * moves, and that a prince should be like it: everything turns round him and he turns for nothing.
 * He has looked at it every night since. He governs the crag the way a magnet does — a household
 * is drawn in (lit, favoured, near) or driven off (switched off, sent up the Coil); there is
 * nothing in between, because he has never learned what in between is. He fights the same way:
 *
 * • **North** (anchored): everything comes to him. Iron plates slide in from the walls along
 *   lines that meet at his feet; the Lodestar drags you in toward a crown of spikes; and a ring
 *   of compass-shot is fired *inward* from the walls, converging on him through wherever you are.
 * • **South** (orbiting, the cold tint): everything is driven off. Repulse rings with one gap
 *   between them; iron bars flung out to stick in the floor and then flung again; and the South
 *   Wind, shoving you back onto walls the Grid has made live.
 * • **Magnetic Storm** (hard, blinking): the poles flip every beat — drawn in, driven off, drawn
 *   in — and the aurora comes down to the floor in curtains that sweep the room.
 */

const TOP = 96;

// ── Signature: Iron Tide ─────────────────────────────────────────────
// Iron plates appear all round the walls, each with a line drawn from it to him. Then they all
// slide in at once along those lines and stack at his feet. Two gaps in the ring of plates; the
// lines are furthest apart near the walls.

interface TidePlate { sx: number; sy: number; a: number; dealt: boolean }

const ironTide = (tk: BossToolkit): SignatureMove => {
  let plates: TidePlate[] = [];
  let fireAt = 0;
  let bornAt = 0;
  let cx = 0, cy = 0;
  const SPEED = 380;
  const pos = (p: TidePlate, time: number) => {
    const travel = Math.max(0, (time - fireAt) / 1000) * SPEED;
    const total = dist(p.sx, p.sy, cx, cy) - 60;
    const d = Math.min(travel, Math.max(0, total));
    return { x: p.sx - Math.cos(p.a) * d, y: p.sy - Math.sin(p.a) * d, done: travel >= total };
  };
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'raise',
    hold: 'draw',
    tell: 'IRON TIDE',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      const n = tk.hard ? 16 : 14;
      const gapA = tk.angleToPlayer() + Math.PI + (Math.random() - 0.5) * 1.2;
      plates = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        // Two gaps: one behind the prince from you, one at a random quarter.
        const g1 = Math.abs(Math.atan2(Math.sin(a - gapA), Math.cos(a - gapA)));
        const g2 = Math.abs(Math.atan2(Math.sin(a - gapA - Math.PI * 0.6), Math.cos(a - gapA - Math.PI * 0.6)));
        if (g1 < 0.3 || g2 < 0.25) continue;
        // Out to the walls along that angle.
        const c = Math.cos(a), s = Math.sin(a);
        const rx = c > 0 ? (tk.W - 40 - cx) / c : c < 0 ? (40 - cx) / c : Infinity;
        const ry = s > 0 ? (tk.H - 36 - cy) / s : s < 0 ? (TOP + 36 - cy) / s : Infinity;
        const r = Math.min(rx, ry);
        plates.push({ sx: cx + c * r, sy: cy + s * r, a, dealt: false });
      }
      bornAt = time;
      fireAt = time + tk.warn(1150);
      tk.sfx('magnet-pull');
    },
    update(time) {
      if (!plates.length || time < fireAt) return;
      const p = tk.player;
      for (const pl of plates) {
        if (pl.dealt) continue;
        const q = pos(pl, time);
        if (q.done) continue;
        if (p.active && p.hp > 0 && dist(q.x, q.y, p.x, p.y) < 20 + 22) {
          pl.dealt = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.7, 500);
        }
      }
      if (time > fireAt + 2200) plates = [];
    },
    drawGround(g, time) {
      if (!plates.length) return;
      const k = clamp((time - bornAt) / Math.max(1, fireAt - bornAt), 0, 1);
      for (const pl of plates) {
        if (time < fireAt) {
          g.lineStyle(2, SOUTH_LIT, 0.15 + k * 0.45); g.lineBetween(pl.sx, pl.sy, cx, cy);
          for (let d = 60; d < dist(pl.sx, pl.sy, cx, cy) - 60; d += 70) {
            const x = pl.sx - Math.cos(pl.a) * d, y = pl.sy - Math.sin(pl.a) * d;
            g.fillStyle(SOUTH_LIT, 0.2 + k * 0.4);
            g.fillTriangle(x - Math.cos(pl.a) * 9, y - Math.sin(pl.a) * 9, x + Math.cos(pl.a + 2.4) * 6, y + Math.sin(pl.a + 2.4) * 6, x + Math.cos(pl.a - 2.4) * 6, y + Math.sin(pl.a - 2.4) * 6);
          }
        }
        const q = pos(pl, time);
        ironPlate(g, q.x, q.y, 48, 30, pl.a + Math.PI / 2, time >= fireAt && !q.done ? 0.6 : 0);
      }
    },
    onPhaseEnd() { plates = []; },
  };
};

// ── Signature: The Lodestar ──────────────────────────────────────────
// He draws everything in: a long pull toward him while a crown of iron spikes bristles round his
// feet. It stabs up twice. Walk out against the pull before each.

const lodestar = (tk: BossToolkit): SignatureMove => {
  let bornAt = -1;
  let endAt = 0;
  return {
    durationMs: 2900,
    windupMs: 500,
    gesture: 'flex',
    hold: 'draw',
    locksBody: true,
    tell: 'THE LODESTAR',
    cast(time) {
      bornAt = time;
      endAt = time + 2900;
      tk.pull(tk.bossX, tk.bossY, 115, 2700);
      tk.spawnZone({ x: tk.bossX, y: tk.bossY, radius: 135, warnMs: 1500, damage: 14 });
      tk.schedule(1300, () => tk.spawnZone({ x: tk.bossX, y: tk.bossY, radius: 150, warnMs: 1350, damage: 14 }));
      tk.sfx('magnet-pull');
    },
    drawGround(g, time) {
      if (bornAt < 0 || time > endAt) return;
      // Filings racing in along the floor toward his feet.
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const ph = 1 - (((time - bornAt) / 700 + i * 0.07) % 1);
        const r = 160 + ph * 360;
        const x = tk.bossX + Math.cos(a) * r, y = tk.bossY + Math.sin(a) * r;
        g.lineStyle(2, FILINGS_LIT, 0.6 * (1 - ph * 0.6));
        g.lineBetween(x, y, x - Math.cos(a) * 14, y - Math.sin(a) * 14);
      }
    },
    drawAir(g, time) {
      if (bornAt < 0 || time > endAt) return;
      // The crown of spikes bristling round him.
      const k = clamp((time - bornAt) / 1400, 0, 1);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.1;
        const r0 = 50, r1 = 50 + k * 70 * (i % 2 ? 0.7 : 1);
        g.lineStyle(4, IRON_DARK, 1);
        g.lineBetween(tk.bossX + Math.cos(a) * r0, tk.bossY + Math.sin(a) * r0, tk.bossX + Math.cos(a) * r1, tk.bossY + Math.sin(a) * r1);
        g.lineStyle(1.5, IRON_LIT, 1);
        g.lineBetween(tk.bossX + Math.cos(a) * r0, tk.bossY + Math.sin(a) * r0, tk.bossX + Math.cos(a) * r1, tk.bossY + Math.sin(a) * r1);
      }
    },
    onPhaseEnd() { bornAt = -1; },
  };
};

// ── Signature: Compass Shot ──────────────────────────────────────────
// Markers light round a great circle about him, then each fires a ball of shot *inward*, at him,
// in a sweep — two waves, the second offset half a step. Near him the lines crowd together; out
// at the rim they are far apart.

interface Marker { x: number; y: number; at: number; fired: boolean }

const compassShot = (tk: BossToolkit): SignatureMove => {
  let marks: Marker[] = [];
  let cx = 0, cy = 0;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'point',
    hold: 'conduct',
    tell: 'COMPASS SHOT',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      marks = [];
      const n = tk.hard ? 18 : 16;
      const skip = Math.floor(Math.random() * n);
      const a0 = Math.random() * Math.PI * 2;
      for (let wave = 0; wave < 2; wave++) {
        for (let i = 0; i < n; i++) {
          if (wave === 0 && (i === skip || i === (skip + 1) % n)) continue;
          if (wave === 1 && (i === (skip + n / 2) % n)) continue;
          const a = a0 + ((i + wave * 0.5) / n) * Math.PI * 2;
          const x = tk.clampX(cx + Math.cos(a) * 470, 40), y = tk.clampY(cy + Math.sin(a) * 470, 40);
          marks.push({ x, y, at: time + tk.warn(900) + wave * 900 + i * 45, fired: false });
        }
      }
      tk.sfx('beam-charge');
    },
    update(time) {
      for (const m of marks) {
        if (m.fired || time < m.at) continue;
        m.fired = true;
        const a = Math.atan2(cy - m.y, cx - m.x);
        tk.spawnBullet({ x: m.x, y: m.y, angle: a, speed: 250, damage: 7, r: 6, lifeMs: dist(m.x, m.y, cx, cy) / 250 * 1000, color: BRASS_LIT });
      }
      if (marks.length && marks.every((m) => m.fired)) marks = [];
    },
    drawGround(g, time) {
      for (const m of marks) {
        if (m.fired) continue;
        const k = clamp(1 - (m.at - time) / 900, 0, 1);
        g.fillStyle(BRASS_DARK, 0.6); g.fillCircle(m.x, m.y, 10);
        g.lineStyle(2, BRASS_LIT, 0.3 + k * 0.6); g.strokeCircle(m.x, m.y, 10 + (1 - k) * 10);
        if (k > 0.3) { g.lineStyle(1, BRASS_LIT, (k - 0.3) * 0.5); g.lineBetween(m.x, m.y, m.x + (cx - m.x) * 0.25, m.y + (cy - m.y) * 0.25); }
      }
    },
    onPhaseEnd() { marks = []; },
  };
};

// ── Signature: Repulse ───────────────────────────────────────────────
// Three rings thrown off him, one after another, sharing one gap that drifts a little. The gap is
// painted on the floor as a wedge before the first ring goes.

const repulse = (tk: BossToolkit): SignatureMove => {
  let gapA = 0;
  let bornAt = -1;
  let firstAt = 0;
  let cx = 0, cy = 0;
  const HALF = 0.42;
  return {
    durationMs: 2100,
    windupMs: 650,
    gesture: 'clap',
    tell: 'REPULSE',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      gapA = tk.angleToPlayer() + (Math.random() - 0.5) * 1.6;
      bornAt = time;
      const lead = tk.warn(700);
      firstAt = time + lead;
      const n = tk.hard ? 4 : 3;
      const drift = (Math.random() < 0.5 ? -1 : 1) * HALF * 0.6;
      for (let i = 0; i < n; i++) {
        tk.spawnRing({ cx, cy, delayMs: lead + i * 420, speed: 310, gapCentre: gapA + drift * i, gapHalf: HALF, band: 16, damage: 9 });
      }
      tk.sfx('sonic-pulse');
    },
    drawGround(g, time) {
      if (bornAt < 0 || time > firstAt + 1600) return;
      const k = clamp((time - bornAt) / Math.max(1, firstAt - bornAt), 0, 1);
      // The wedge of safety, and blue warning rings round him.
      g.fillStyle(SOUTH_LIT, 0.12 + k * 0.12);
      g.beginPath(); g.slice(cx, cy, 520, gapA - HALF, gapA + HALF, false); g.fillPath();
      g.lineStyle(3, SOUTH, 0.3 + k * 0.4); g.strokeCircle(cx, cy, 44 + k * 20);
      g.lineStyle(2, SOUTH_LIT, 0.4 * (1 - k)); g.strokeCircle(cx, cy, 80 + (1 - k) * 40);
    },
    onPhaseEnd() { bornAt = -1; },
  };
};

// ── Signature: Flung Iron ────────────────────────────────────────────
// A fan of iron bars is flung off him toward you. They skid and stick upright in the floor —
// touching one hurts — and then, a beat later, he repels them again and they fly on to the walls.

interface Bar { x: number; y: number; a: number; d0: number; stage: 0 | 1 | 2; dealt: boolean; lastTouch: number }

const flungIron = (tk: BossToolkit): SignatureMove => {
  let bars: Bar[] = [];
  let launchAt = 0;
  let secondAt = 0;
  let endAt = 0;
  let cx = 0, cy = 0;
  return {
    durationMs: 1800,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'FLUNG IRON',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      const a0 = tk.angleToPlayer();
      const n = tk.hard ? 9 : 7;
      bars = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.26;
        bars.push({ x: cx, y: cy, a, d0: 0, stage: 0, dealt: false, lastTouch: 0 });
      }
      launchAt = time + tk.warn(650);
      secondAt = launchAt + 700 + tk.warn(1300);
      endAt = secondAt + 1500;
      tk.sfx('whoosh');
    },
    update(time, dt) {
      if (!bars.length) return;
      const p = tk.player;
      const live = p.active && p.hp > 0;
      for (const b of bars) {
        if (time < launchAt) continue;
        if (b.stage === 0) {
          // Skidding out, slowing to a stop at ~300px.
          const t = clamp((time - launchAt) / 700, 0, 1);
          const d = 300 * (1 - (1 - t) * (1 - t));
          b.x = tk.clampX(cx + Math.cos(b.a) * d, 40); b.y = tk.clampY(cy + Math.sin(b.a) * d, 40);
          if (!b.dealt && live && t < 0.9 && dist(b.x, b.y, p.x, p.y) < 20 + 16) { b.dealt = true; tk.hitPlayer(8, p.x, p.y); }
          if (t >= 1) { b.stage = 1; b.dealt = false; tk.sfx('clang'); }
        } else if (b.stage === 1) {
          if (live && dist(b.x, b.y, p.x, p.y) < 20 + 12 && time - b.lastTouch > 700) { b.lastTouch = time; tk.hitPlayer(5, p.x, p.y); }
          if (time >= secondAt) { b.stage = 2; tk.sfx('gravity-slam'); }
        } else {
          b.x += Math.cos(b.a) * 520 * dt; b.y += Math.sin(b.a) * 520 * dt;
          if (!b.dealt && live && dist(b.x, b.y, p.x, p.y) < 20 + 16) { b.dealt = true; tk.hitPlayer(9, p.x, p.y); }
        }
      }
      if (time > endAt) bars = [];
    },
    drawGround(g, time) {
      if (!bars.length) return;
      if (time < launchAt) {
        const k = clamp(1 - (launchAt - time) / 650, 0, 1);
        for (const b of bars) { g.lineStyle(2, SOUTH_LIT, 0.2 + k * 0.5); g.lineBetween(cx, cy, cx + Math.cos(b.a) * 300, cy + Math.sin(b.a) * 300); }
      }
      for (const b of bars) {
        if (b.stage !== 1) continue;
        // Where it will fly next.
        const k = clamp(1 - (secondAt - time) / 1300, 0, 1);
        g.lineStyle(2, NORTH, 0.15 + k * 0.5); g.lineBetween(b.x, b.y, b.x + Math.cos(b.a) * 700, b.y + Math.sin(b.a) * 700);
        g.fillStyle(0x000000, 0.35); g.fillEllipse(b.x + 3, b.y + 4, 22, 8);
      }
    },
    drawAir(g, time) {
      for (const b of bars) {
        if (time < launchAt) continue;
        const spin = b.stage === 1 ? 0 : time / 50;
        const upright = b.stage === 1;
        const L = upright ? 34 : 30;
        const a = upright ? -Math.PI / 2 + Math.sin(time / 90 + b.a) * 0.05 : b.a + spin;
        const x0 = b.x, y0 = b.y;
        const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L;
        g.lineStyle(7, IRON_DARK, 1); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(4, IRON, 1); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(4, SOUTH, 1); g.lineBetween(x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.75, x1, y1);
        if (upright) { g.lineStyle(1.5, SPARK, 0.4 + Math.sin(time / 70) * 0.3); g.strokeCircle(x0, y0 - 16, 14); }
      }
    },
    onPhaseEnd() { bars = []; },
  };
};

// ── Signature: South Wind ────────────────────────────────────────────
// He drives you off: a long shove away from him, while the Grid makes the walls live. Walk back
// toward him against the wind, or be pressed onto the copper.

const southWind = (tk: BossToolkit): SignatureMove => {
  let bornAt = -1;
  let liveAt = 0;
  let endAt = 0;
  let lastTick = 0;
  let lastPush = 0;
  const EDGE = 76;
  const onEdge = (x: number, y: number) => x < EDGE || x > tk.W - EDGE || y < TOP + EDGE - 20 || y > tk.H - EDGE + 10;
  return {
    durationMs: 3300,
    windupMs: 600,
    gesture: 'punch',
    hold: 'brace',
    locksBody: true,
    tell: 'SOUTH WIND',
    cast(time) {
      bornAt = time;
      liveAt = time + tk.warn(900);
      endAt = liveAt + 2600;
      lastPush = 0;
      tk.sfx('gust');
    },
    update(time) {
      if (bornAt < 0 || time > endAt) return;
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      // The push: re-aimed at a point beyond you, every few beats.
      if (time - lastPush > 220) {
        lastPush = time;
        const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        tk.pull(p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, 120, 300);
      }
      if (time >= liveAt && onEdge(p.x, p.y) && time - lastTick > 450) {
        lastTick = time;
        tk.hitPlayer(6, p.x, p.y);
        tk.sfx('zap');
      }
    },
    drawGround(g, time) {
      if (bornAt < 0 || time > endAt) return;
      const live = time >= liveAt;
      const k = live ? 1 : clamp((time - bornAt) / Math.max(1, liveAt - bornAt), 0, 1);
      const a = live ? 0.28 + Math.sin(time / 60) * 0.08 : 0.08 + k * 0.15;
      g.fillStyle(COPPER, a);
      g.fillRect(0, TOP, EDGE, tk.H - TOP); g.fillRect(tk.W - EDGE, TOP, EDGE, tk.H - TOP);
      g.fillRect(EDGE, TOP, tk.W - EDGE * 2, EDGE - 20); g.fillRect(EDGE, tk.H - EDGE + 10, tk.W - EDGE * 2, EDGE - 10);
      if (live) {
        for (let i = 0; i < 10; i++) {
          const t = ((time / 300) + i * 0.13) % 1;
          const x = t * tk.W;
          g.lineStyle(2, SPARK, 0.7); g.lineBetween(x, TOP + 6, x + 12, TOP + 20); g.lineBetween(x, tk.H - 6, x - 12, tk.H - 20);
        }
      }
      // Streaks of the wind running off him.
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const ph = ((time - bornAt) / 500 + i * 0.09) % 1;
        const r = 60 + ph * 380;
        g.lineStyle(1.5, SOUTH_LIT, 0.4 * (1 - ph));
        g.lineBetween(tk.bossX + Math.cos(ang) * r, tk.bossY + Math.sin(ang) * r, tk.bossX + Math.cos(ang) * (r + 22), tk.bossY + Math.sin(ang) * (r + 22));
      }
    },
    onPhaseEnd() { bornAt = -1; },
  };
};

// ── Signature: Pole Flip (Magnetic Storm) ────────────────────────────
// Five beats. On a NORTH beat he draws you in and spikes stab up round him at the beat's end;
// on a SOUTH beat he drives you off and the walls go live at its end. The badge over him shows
// which beat is next.

interface Beat { north: boolean; at: number; end: number; dealt: boolean }

const poleFlip = (tk: BossToolkit): SignatureMove => {
  let beats: Beat[] = [];
  const BEAT = 1300;
  const R_IN = 140;
  const EDGE = 84;
  return {
    durationMs: BEAT * 5 + 300,
    windupMs: 500,
    gesture: 'flex',
    hold: 'conduct',
    locksBody: true,
    tell: 'POLE FLIP',
    cast(time) {
      beats = [];
      let north = Math.random() < 0.5;
      for (let i = 0; i < 5; i++) {
        beats.push({ north, at: time + i * BEAT, end: time + (i + 1) * BEAT, dealt: false });
        north = !north;
      }
      tk.sfx('magnet-pull');
    },
    update(time) {
      const p = tk.player;
      const live = p.active && p.hp > 0;
      for (const b of beats) {
        if (time < b.at || time > b.end + 200) continue;
        if (!b.dealt && time < b.end) {
          if (b.north) tk.pull(tk.bossX, tk.bossY, 100, 120);
          else {
            const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
            tk.pull(p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, 100, 120);
          }
        }
        if (!b.dealt && time >= b.end) {
          b.dealt = true;
          tk.sfx(b.north ? 'stone-rise' : 'zap');
          if (!live) continue;
          const hit = b.north
            ? dist(p.x, p.y, tk.bossX, tk.bossY) < R_IN + 20
            : p.x < EDGE || p.x > tk.W - EDGE || p.y < TOP + EDGE - 20 || p.y > tk.H - EDGE + 10;
          if (hit) tk.hitPlayer(11, p.x, p.y);
        }
      }
      if (beats.length && time > beats[beats.length - 1].end + 300) beats = [];
    },
    drawGround(g, time) {
      for (const b of beats) {
        if (time < b.at || time > b.end + 250) continue;
        const k = clamp((time - b.at) / BEAT, 0, 1);
        const fired = time >= b.end;
        if (b.north) {
          g.fillStyle(NORTH, fired ? 0.5 : 0.06 + k * 0.16); g.fillCircle(tk.bossX, tk.bossY, R_IN);
          g.lineStyle(3, NORTH_LIT, 0.4 + k * 0.5); g.strokeCircle(tk.bossX, tk.bossY, R_IN);
          g.lineStyle(3, 0xffffff, 0.8);
          g.beginPath(); g.arc(tk.bossX, tk.bossY, R_IN - 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else {
          g.fillStyle(SOUTH, fired ? 0.5 : 0.06 + k * 0.16);
          g.fillRect(0, TOP, EDGE, tk.H - TOP); g.fillRect(tk.W - EDGE, TOP, EDGE, tk.H - TOP);
          g.fillRect(EDGE, TOP, tk.W - EDGE * 2, EDGE - 20); g.fillRect(EDGE, tk.H - EDGE + 10, tk.W - EDGE * 2, EDGE - 10);
          g.lineStyle(3, SOUTH_LIT, 0.4 + k * 0.5); g.strokeRect(EDGE, TOP + EDGE - 20, tk.W - EDGE * 2, tk.H - TOP - EDGE * 2 + 30);
        }
      }
    },
    drawAir(g, time) {
      const now = beats.find((b) => time >= b.at && time < b.end);
      if (!now) return;
      poleBadge(g, tk.bossX, tk.bossY - 92, now.north, 1);
      const next = beats.find((b) => b.at >= now.end);
      if (next) poleBadge(g, tk.bossX + 24, tk.bossY - 84, next.north, 0.45);
    },
    onPhaseEnd() { beats = []; },
  };
};

// ── Signature: Aurora Fall (Magnetic Storm) ──────────────────────────
// The aurora comes down to the floor: three curtains drop, one on you, then sweep across the room
// together. Inside a landed curtain the storm burns and drags at you.

interface Fall { x: number; dir: number; at: number; color: number; seed: number }

const auroraFall = (tk: BossToolkit): SignatureMove => {
  let falls: Fall[] = [];
  let landAt = 0;
  let endAt = 0;
  let lastTick = 0;
  const HALF = 46;
  const SWEEP = 150;
  const xNow = (f: Fall, time: number) => f.x + f.dir * Math.max(0, time - landAt) / 1000 * SWEEP;
  return {
    durationMs: 2200,
    windupMs: 550,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'AURORA FALL',
    cast(time) {
      const p = tk.player;
      const dir = p.x < tk.W / 2 ? 1 : -1;
      const xs = [p.x, p.x - dir * 260, p.x + dir * 300].map((x) => clamp(x, 70, tk.W - 70));
      const cols = [AURORA_GREEN, AURORA_VIOLET, AURORA_CRIMSON];
      falls = xs.map((x, i) => ({ x, dir, at: time, color: cols[i], seed: Math.random() * 10 }));
      landAt = time + tk.warn(1150);
      endAt = landAt + 3200;
      tk.sfx('holy-chord');
    },
    update(time) {
      if (!falls.length) return;
      if (time > endAt) { falls = []; return; }
      if (time < landAt) return;
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      if (falls.some((f) => Math.abs(p.x - xNow(f, time)) < HALF + 12) && time - lastTick > 500) {
        lastTick = time;
        tk.hitPlayer(6, p.x, p.y);
        tk.slowPlayer(0.7, 520);
      }
    },
    drawGround(g, time) {
      for (const f of falls) {
        const x = xNow(f, time);
        const landed = time >= landAt;
        g.fillStyle(f.color, landed ? 0.18 : 0.05 + clamp((time - f.at) / Math.max(1, landAt - f.at), 0, 1) * 0.1);
        g.fillRect(x - HALF, TOP, HALF * 2, tk.H - TOP);
        if (landed) { g.lineStyle(2, lit(f.color, 0.4), 0.6); g.lineBetween(x - HALF, tk.H - 8, x + HALF, tk.H - 8); }
        // Which way it will sweep.
        if (!landed) {
          g.fillStyle(lit(f.color, 0.3), 0.5);
          g.fillTriangle(x + f.dir * (HALF + 22), tk.H - 60, x + f.dir * HALF, tk.H - 70, x + f.dir * HALF, tk.H - 50);
        }
      }
    },
    drawAir(g, time) {
      for (const f of falls) {
        const k = clamp((time - f.at) / Math.max(1, landAt - f.at), 0, 1);
        const fade = clamp((endAt - time) / 500, 0, 1);
        auroraCurtain(g, xNow(f, time), 0, TOP + (tk.H - TOP) * k, HALF * 2, mixC(f.color, auroraHue(time / 1000, f.seed), 0.3), time + f.seed * 999, 0.85 * fade);
      }
    },
    onPhaseEnd() { falls = []; },
  };
};

export const POLAR_BOSS: WorldBossDef = {
  worldId: 'isle:polar',
  name: 'Prince Polar',
  title: 'True North',
  color: POLAR,
  colorLit: POLAR_LIT,
  colorDark: POLAR_DARK,
  accent: AURORA_TEAL,
  // Tier 3 of Voltreach.
  damageMult: 1.25,

  intro: [
    'Everything on this crag comes to me, or is sent away from me. Which are you?',
    'Mother says the pole star never moves. I have watched it twenty years. She is right. I am trying to be right.',
  ],
  banter: [
    'Near or far. There is no third thing. I have looked.',
    'The households that point to me are lit. The ones that don\'t, aren\'t. It is very simple. It is a compass.',
    'I do not turn. Things turn round me.',
    'You keep moving. Stop moving. Nothing that moves is true.',
    'Mother will want to know your bearing.',
  ],
  defeatLine: 'THE NEEDLE SWINGS',
  resumeLine: 'You came back. Things don\'t, usually. Either they are drawn in or they are gone.',

  phases: [
    {
      name: 'North',
      line: 'North. Come here. Everything comes here in the end.',
      hp: 500,
      cycle: [
        'sig:tide', 'volley', 'sig:lodestar', 'sig:compass', 'hazard',
        'sig:tide', 'radial', 'sig:compass', 'sig:lodestar', 'homing',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1200,
      harassMs: 3300,
    },
    {
      name: 'South',
      line: 'Then go. GO. Everyone does, when I turn round. I am turning round.',
      hp: 590,
      cycle: [
        'sig:repulse', 'sig:flung', 'lanes', 'sig:wind', 'sig:repulse',
        'barrage', 'sig:flung', 'spiral', 'sig:wind', 'sig:tide',
      ],
      harass: ['h-flak', 'h-lane', 'h-snipe'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE POLES WILL NOT HOLD',
    extraPhase: {
      name: 'Magnetic Storm',
      line: 'It moved. The star moved. Mother — the star MOVED.',
      hp: 430,
      cycle: [
        'sig:flip', 'sig:fall', 'sig:repulse', 'homing',
        'sig:flip', 'sig:tide', 'sig:fall', 'sweep', 'sig:compass',
      ],
      harass: ['h-orbs', 'h-mines', 'h-rune'],
      restMs: 950,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 190 },
    hazard: { radius: 64 },
    spiral: { arms: 4, speed: 175 },
    lanes: { halfW: 26 },
  },

  signatures: {
    tide: ironTide,
    lodestar,
    compass: compassShot,
    repulse,
    flung: flungIron,
    wind: southWind,
    flip: poleFlip,
    fall: auroraFall,
  },

  look: {
    crest: 'none', pattern: 'rings', aura: 'sparks', hands: 'gauntlet',
    torsoR: 36, mouth: 'line', eyes: 2, eyeColor: 0xa8d8ff,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { pattern: 'static', hands: 'orb' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'glitch', mouth: 'grate', eyes: 3 } },
  ],

  /**
   * True North's tells. Over his head stands a great horseshoe magnet like a crown, open to the
   * sky, its ends painted red and blue, and a single white star burning between them — the pole
   * star he was told to be. Iron filings stand on his shoulders like a mantle, and a brass compass
   * rose is pinned at his throat. In North the filings lie inward toward his chest; in South the
   * horseshoe turns over (blue up) and the filings bristle straight out; in the Magnetic Storm the
   * horseshoe spins, the star gutters, and aurora streams off the magnet's ends.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const south = s.phaseIdx === 1;
    const storm = s.hard && s.phaseIdx >= 2;
    // The mantle of filings.
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * 0.05 + (i / 25) * Math.PI * 0.9 + Math.PI;
      const bx = s.x + Math.cos(a) * R * 0.95, by = s.y + Math.sin(a) * R * 0.6 + R * 0.25;
      const out = south || storm ? 1 : -0.4;
      const len = (south ? 12 : 8) + (storm ? Math.sin(s.t / 60 + i) * 4 : 0);
      g.lineStyle(1.6, i % 3 ? FILINGS : FILINGS_LIT, 0.95);
      g.lineBetween(bx, by, bx + Math.cos(a) * len * out, by + Math.sin(a) * len * out);
    }
    // The compass rose at his throat.
    const tx = s.x, ty = s.y + R * 0.45;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(tx, ty, 8);
    g.fillStyle(BRASS, 1); g.fillCircle(tx, ty, 6.5);
    const na = storm ? s.t / 80 : south ? Math.PI / 2 : -Math.PI / 2;
    g.fillStyle(NORTH, 1); g.fillTriangle(tx + Math.cos(na) * 6, ty + Math.sin(na) * 6, tx + Math.cos(na + 1.6) * 2, ty + Math.sin(na + 1.6) * 2, tx + Math.cos(na - 1.6) * 2, ty + Math.sin(na - 1.6) * 2);
    g.fillStyle(SOUTH, 1); g.fillTriangle(tx - Math.cos(na) * 6, ty - Math.sin(na) * 6, tx + Math.cos(na + 1.6) * 2, ty + Math.sin(na + 1.6) * 2, tx + Math.cos(na - 1.6) * 2, ty + Math.sin(na - 1.6) * 2);
    // The horseshoe crown.
    const hy = s.y - R * 1.25;
    const spin = storm ? Math.sin(s.t / 260) * 0.6 : 0;
    horseshoe(g, s.x, hy, 2.6 + s.castGlow * 0.3, Math.PI + spin, south);
    // The pole star between its ends.
    const flick = storm ? 0.5 + Math.sin(s.t / 37) * 0.5 : 1;
    const sx = s.x, sy = hy - 6;
    glow(g, sx, sy, 22, 0xffffff, 0.08 * flick, 3);
    g.fillStyle(0xffffff, 0.9 * flick);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + s.t / 2000;
      g.fillTriangle(sx + Math.cos(a) * 9, sy + Math.sin(a) * 9, sx + Math.cos(a + 1.3) * 2.5, sy + Math.sin(a + 1.3) * 2.5, sx + Math.cos(a - 1.3) * 2.5, sy + Math.sin(a - 1.3) * 2.5);
    }
    g.fillCircle(sx, sy, 3);
    // The storm: aurora streaming off the magnet's ends.
    if (storm) {
      for (const k of [-1, 1]) {
        const ex = s.x + k * 21, ey = hy + 14;
        for (let i = 0; i < 5; i++) {
          const ph = ((s.t / 700) + i / 5) % 1;
          const c = [AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET][i % 3];
          g.fillStyle(c, 0.45 * (1 - ph));
          g.fillEllipse(ex + k * ph * 40 + Math.sin(s.t / 200 + i) * 6, ey - ph * 50, 8 + ph * 10, 4 + ph * 4);
        }
      }
    }
    // The field round him, shown as two faint loops from pole to pole.
    const fa = south ? 0.35 : 0.2;
    g.lineStyle(1.5, south ? SOUTH_LIT : NORTH_LIT, fa + s.castGlow * 0.3);
    for (const k of [-1, 1]) g.strokeEllipse(s.x + k * R * 0.9, s.y - R * 0.4, R * 1.2, R * 2.2);
    if (s.enraged) { g.lineStyle(2, SPARK, 0.35 + Math.sin(s.t / 100) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The observatory floor: polished basalt under the dome, a brass meridian line running north
   * to south through a great inlaid compass rose, star-chart circles cut round it, the dome's ribs
   * throwing long shadows from the middle, the telescope's iron mount across the top wall, and the
   * aurora coming in through the open slit as one long band of green across the floor.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x9017a5);
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(BASALT_DARK, 1); g.fillRect(0, 0, W, H);
    // Polished flags in rings round the centre.
    for (let r = 60; r < 760; r += 70) {
      const n = Math.round((r * Math.PI * 2) / 90);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (r / 70) * 0.2;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85;
        if (x < -40 || x > W + 40 || y < 80 || y > H + 40) continue;
        g.fillStyle(rng() < 0.5 ? BASALT : mixC(BASALT, BASALT_LIT, 0.35), 1);
        g.fillCircle(x, y, 30);
      }
    }
    g.lineStyle(1, 0x000000, 0.25);
    for (let r = 95; r < 760; r += 70) g.strokeEllipse(cx, cy, r * 2, r * 1.7);
    // The dome's rib shadows.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.lineStyle(14, 0x000000, 0.08);
      g.lineBetween(cx, cy, cx + Math.cos(a) * 900, cy + Math.sin(a) * 760);
    }
    // Star-chart circles cut in the floor, with brass studs for the stars.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const x = cx + Math.cos(a) * 300, y = cy + Math.sin(a) * 200;
      g.lineStyle(1.5, BRASS_DARK, 0.6); g.strokeCircle(x, y, 46);
      for (let k = 0; k < 7; k++) { g.fillStyle(BRASS_LIT, 0.6); g.fillCircle(x + (rng() - 0.5) * 70, y + (rng() - 0.5) * 70, 1.6); }
    }
    // The meridian line and the rose.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - 4, 100, 8, H - 100);
    g.fillStyle(BRASS, 1); g.fillRect(cx - 2, 100, 4, H - 100);
    compassRose(g, cx, cy, 170, 0.8);
    // The aurora through the slit: a long band of green across the floor.
    for (let i = 0; i < 4; i++) {
      g.fillStyle([AURORA_GREEN, AURORA_TEAL, AURORA_GREEN, AURORA_VIOLET][i], 0.05);
      g.fillPoints([{ x: W * 0.55 + i * 10, y: 100 }, { x: W * 0.62 + i * 10, y: 100 }, { x: W * 0.4 + i * 14, y: H }, { x: W * 0.3 + i * 14, y: H }], true);
    }
    // The back wall under the HUD: the telescope's iron mount, gears and the tube's foot.
    g.fillStyle(SLATE_DEEP, 1); g.fillRect(0, 0, W, 104);
    for (let x = 0; x < W; x += 60) { g.fillStyle(BASALT, 1); g.fillRect(x + 2, 6, 56, 90); g.fillStyle(BASALT_LIT, 0.4); g.fillRect(x + 2, 6, 56, 4); }
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 120, 40, 240, 64);
    for (const k of [-1, 1]) {
      const gx = cx + k * 80, gy = 70;
      g.lineStyle(4, IRON, 1); g.strokeCircle(gx, gy, 22);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.lineBetween(gx + Math.cos(a) * 22, gy + Math.sin(a) * 22, gx + Math.cos(a) * 28, gy + Math.sin(a) * 28); }
      g.fillStyle(BRASS, 1); g.fillCircle(gx, gy, 6);
    }
    g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - 26, 0, 52, 80);
    g.fillStyle(BRASS, 1); g.fillRect(cx - 20, 0, 40, 80);
    g.fillStyle(BRASS_LIT, 0.6); g.fillRect(cx - 16, 0, 6, 80);
    g.fillStyle(IRON_DARK, 1); g.fillRect(0, 100, W, 8);
    // Red and blue pole-stones at the four points, the rest of the rim brass.
    for (const [x, y, c] of [[cx, 130, NORTH], [cx, H - 26, SOUTH], [40, cy, dim(BRASS, 0.2)], [W - 40, cy, dim(BRASS, 0.2)]] as [number, number, number][]) {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 3, y + 8, 46, 16);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 20);
      g.fillStyle(c, 1); g.fillCircle(x, y - 2, 15);
    }
  },
};
