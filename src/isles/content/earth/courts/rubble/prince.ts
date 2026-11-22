import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import { ashlar, crack, spoil, strataFace, wreckingBall } from './art';
import {
  BLAST, CHALK, DUST, DUST_DARK, DUST_LIT, FUSE, GHOST, HAZARD, IRON, IRON_LIT, LIME, LIME_DARK, LIME_DEEP, LIME_LIT,
  MOSS, MOSS_DARK, RUST, RUST_LIT, SCREE, SCREE_DARK, SEAL, STRATA_BUFF, TIMBER, TIMBER_DARK, WRECK, WRECK_DARK,
  WRECK_LIT,
} from './palette';
import { clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Wreck, the Last Demolisher — Regent Gravane's son, governor of the Rubble Court.
 *
 * When he was nine Wreck built a tower of offcuts in the palace yard, higher than the wall, and
 * his father had it buried while he watched: a king's son builds nothing that might outlast him.
 * At eleven he pulled the Old King's colossus over with his own hands. He has been knocking the
 * capital down stone by stone ever since, for the Regent, because that is the only thing he was
 * ever allowed to finish. He fights like a demolition crew:
 *
 * • **Wrecking Ball** (stalking): the ball on its chain — a great swing on a crane line through the
 *   whole yard; a flail whirled round himself on a lengthening chain; the ball cast at you and
 *   hauled back along the floor.
 * • **Demolition** (orbiting, red-hot): he blows the yard's last towers — they topple along their
 *   length; a façade peels off block by block down a line through you; breaching charges ring you,
 *   every blast shaped inward.
 * • **Ruin of Ages** (hard, planted, pale): time-lapse decay — the floor crumbles tile by tile in a
 *   wave, leaving one old road; rings of weathering roll out of him with two gaps in them.
 */

const TOP = 96;

/** Shared with the decor: the ball is out on its chain, not slung at his side. */
let ballOut = false;

// ── Signature: The Great Swing ───────────────────────────────────────
// A crane line drops from above the yard. The ball is hoisted to one side and swings through the
// whole width on a great arc — there and back — that passes right through where you stood. The
// arc is a band at the chain's length from the pivot: step toward the pivot, or past the band.

const pendulum = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let px = 0, py = 0, L = 0, A = 1, startSide = 1;
  let warnAt = 0, swingAt = 0, endAt = 0, lastHit = 0;
  const SWING = 2600, BALL_R = 30;
  const angle = (time: number) => {
    const u = clamp((time - swingAt) / SWING, 0, 1) * 2;
    return startSide * A * Math.cos(Math.PI * u);
  };
  const ball = (a: number) => ({ x: px + Math.sin(a) * L, y: py + Math.cos(a) * L });
  return {
    durationMs: 3900,
    windupMs: 500,
    gesture: 'raise',
    hold: 'draw',
    tell: 'THE GREAT SWING',
    cast(time) {
      const p = tk.player;
      px = clamp(p.x + (Math.random() - 0.5) * 80, 160, tk.W - 160);
      py = 60;
      L = clamp(p.y - py, 250, 520);
      A = tk.hard ? 1.1 : 1;
      startSide = Math.random() < 0.5 ? 1 : -1;
      warnAt = time;
      swingAt = time + tk.warn(1100);
      endAt = swingAt + SWING;
      live = true;
      ballOut = true;
      tk.sfx('chain');
    },
    update(time) {
      if (!live) return;
      if (time > endAt) { live = false; ballOut = false; return; }
      if (time < swingAt) return;
      const b = ball(angle(time));
      const p = tk.player;
      if (p.active && p.hp > 0 && time - lastHit > 600 && dist(b.x, b.y, p.x, p.y) < BALL_R + 20) {
        lastHit = time;
        tk.hitPlayer(18, p.x, p.y);
        tk.slowPlayer(0.6, 600);
        tk.sfx('hit-heavy');
      }
      if (Math.abs(angle(time)) < 0.05) tk.sfx('whoosh');
    },
    drawGround(g, time) {
      if (!live) return;
      const k = clamp((time - warnAt) / Math.max(1, swingAt - warnAt), 0, 1);
      // The arc the ball will sweep, laid on the floor as a band.
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const a0 = -A + (2 * A * i) / steps, a1 = -A + (2 * A * (i + 1)) / steps;
        const b0 = ball(a0), b1 = ball(a1);
        if (b0.y < TOP && b1.y < TOP) continue;
        g.lineStyle(BALL_R * 2 + 26, HAZARD, time < swingAt ? 0.05 + k * 0.12 : 0.06); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
        if (i % 2 === 0) { g.lineStyle(2, HAZARD, 0.3 + k * 0.5); g.lineBetween(b0.x, b0.y, b1.x, b1.y); }
      }
      // The ball's shadow.
      const b = time < swingAt ? ball(startSide * A) : ball(angle(time));
      g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x, b.y + BALL_R, BALL_R * 2.2, BALL_R * 0.7);
    },
    drawAir(g, time) {
      if (!live) return;
      // The crane jib poking in over the HUD edge, and the line.
      g.lineStyle(5, RUST, 1); g.lineBetween(px - 140, TOP - 30, px + 20, py);
      g.lineStyle(2, RUST_LIT, 1); for (let i = 0; i < 6; i++) g.lineBetween(px - 140 + i * 26, TOP - 30 + i * 0.2 * 30, px - 114 + i * 26, py + 8);
      const a = time < swingAt ? startSide * A * clamp((time - warnAt) / Math.max(1, swingAt - warnAt), 0, 1) : angle(time);
      const b = ball(a);
      g.lineStyle(3, IRON, 1); g.lineBetween(px, py, b.x, b.y - BALL_R);
      for (let i = 1; i < 10; i++) { const k = i / 10; g.lineStyle(1, IRON_LIT, 0.8); g.strokeCircle(px + (b.x - px) * k, py + (b.y - BALL_R - py) * k, 2.5); }
      wreckingBall(g, b.x, b.y, BALL_R);
      // Motion streaks on the swing.
      if (time >= swingAt) {
        for (let i = 1; i <= 3; i++) {
          const pb = ball(angle(time - i * 40));
          g.fillStyle(IRON_LIT, 0.18 / i); g.fillCircle(pb.x, pb.y, BALL_R);
        }
      }
    },
    onPhaseEnd() { live = false; ballOut = false; },
  };
};

// ── Signature: Wrecker's Flail ───────────────────────────────────────
// He plants his feet and whirls the ball round himself, paying the chain out until it sweeps a
// great ring of the yard, then reeling it back. The widest reach is chalked on the floor first.
// Get in close under the chain, or stand out past the ring.

const flail = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let warnAt = 0, spinAt = 0, endAt = 0, lastHit = 0;
  let a = 0;
  const SPIN = 3200, R0 = 70, RMAX = 250, BALL_R = 24;
  const radius = (time: number) => R0 + (RMAX - R0) * Math.sin(Math.PI * clamp((time - spinAt) / SPIN, 0, 1));
  return {
    durationMs: 3600,
    windupMs: 450,
    gesture: 'sweep',
    hold: 'brace',
    locksBody: true,
    tell: 'WRECKER\'S FLAIL',
    cast(time) {
      warnAt = time;
      spinAt = time + tk.warn(700);
      endAt = spinAt + SPIN;
      a = tk.angleToPlayer() + Math.PI;
      live = true;
      ballOut = true;
      tk.sfx('chain');
    },
    update(time, dt) {
      if (!live) return;
      if (time > endAt) { live = false; ballOut = false; return; }
      if (time < spinAt) return;
      a += dt * (tk.hard ? 3.0 : 2.6);
      const r = radius(time);
      const bx = tk.bossX + Math.cos(a) * r, by = tk.bossY + Math.sin(a) * r * 0.85;
      const p = tk.player;
      if (p.active && p.hp > 0 && time - lastHit > 700 && dist(bx, by, p.x, p.y) < BALL_R + 20) {
        lastHit = time;
        tk.hitPlayer(15, p.x, p.y);
        tk.sfx('clang');
      }
      if (Math.floor(time / 380) !== Math.floor((time - dt * 1000) / 380)) tk.sfx('whoosh');
    },
    drawGround(g, time) {
      if (!live) return;
      const k = time < spinAt ? clamp((time - warnAt) / Math.max(1, spinAt - warnAt), 0, 1) : 1;
      // The widest reach, chalked: a dashed hazard ellipse.
      for (let i = 0; i < 36; i += 2) {
        const a0 = (i / 36) * Math.PI * 2, a1 = ((i + 1) / 36) * Math.PI * 2;
        g.lineStyle(3, HAZARD, 0.25 + k * 0.4);
        g.lineBetween(tk.bossX + Math.cos(a0) * RMAX, tk.bossY + Math.sin(a0) * RMAX * 0.85, tk.bossX + Math.cos(a1) * RMAX, tk.bossY + Math.sin(a1) * RMAX * 0.85);
      }
      // The scuffed ring the ball is cutting right now.
      if (time >= spinAt) {
        const r = radius(time);
        g.lineStyle(BALL_R * 2, DUST_DARK, 0.2); g.strokeEllipse(tk.bossX, tk.bossY, r * 2, r * 1.7);
      }
    },
    drawAir(g, time) {
      if (!live || time < spinAt) return;
      const r = radius(time);
      const bx = tk.bossX + Math.cos(a) * r, by = tk.bossY + Math.sin(a) * r * 0.85;
      // The chain, a blur of links, and the ball.
      const n = Math.round(r / 14);
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.lineStyle(1.5, IRON_LIT, 0.9); g.strokeCircle(tk.bossX + (bx - tk.bossX) * k, tk.bossY + (by - tk.bossY) * k, 2.4);
      }
      for (let i = 1; i <= 4; i++) {
        const pa = a - i * 0.12;
        g.fillStyle(IRON_LIT, 0.16 / i); g.fillCircle(tk.bossX + Math.cos(pa) * r, tk.bossY + Math.sin(pa) * r * 0.85, BALL_R);
      }
      wreckingBall(g, bx, by, BALL_R);
    },
    onPhaseEnd() { live = false; ballOut = false; },
  };
};

// ── Signature: Cast and Haul ─────────────────────────────────────────
// He hurls the ball at where you stand (its landing is marked), it smashes in and throws rubble
// out sideways; the chain lies across the floor to him, pulsing as it goes taut — and then he
// hauls the ball home along it, ploughing up everything on the line.

const haul = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let tx = 0, ty = 0, ox = 0, oy = 0;
  let castAt = 0, landAt = 0, haulAt = 0, endAt = 0;
  let landed = false, hitHaul = false;
  const LIE = 650, HAUL = 650, BALL_R = 28;
  const ballPos = (time: number) => {
    if (time < landAt) {
      const k = clamp((time - castAt) / Math.max(1, landAt - castAt), 0, 1);
      return { x: ox + (tx - ox) * k, y: oy + (ty - oy) * k - Math.sin(k * Math.PI) * 160 };
    }
    if (time < haulAt) return { x: tx, y: ty };
    const k = clamp((time - haulAt) / HAUL, 0, 1);
    return { x: tx + (tk.bossX - tx) * k, y: ty + (tk.bossY - ty) * k };
  };
  return {
    durationMs: 3000,
    windupMs: 550,
    gesture: 'punch',
    hold: 'charge',
    locksBody: true,
    tell: 'CAST AND HAUL',
    cast(time) {
      const p = tk.player;
      tx = tk.clampX(p.x); ty = tk.clampY(p.y);
      ox = tk.bossX; oy = tk.bossY;
      castAt = time;
      landAt = time + tk.warn(900);
      haulAt = landAt + LIE;
      endAt = haulAt + HAUL;
      landed = false; hitHaul = false;
      live = true;
      ballOut = true;
      tk.spawnZone({ x: tx, y: ty, radius: 66, warnMs: 900, damage: 16 });
      tk.sfx('rock-throw');
    },
    update(time) {
      if (!live) return;
      if (!landed && time >= landAt) {
        landed = true;
        tk.sfx('stone-slam');
        // Rubble thrown out sideways from the strike.
        const a = Math.atan2(ty - oy, tx - ox);
        for (const k of [-1, 1]) for (const s of [0.9, 1.3]) {
          tk.spawnBullet({ x: tx, y: ty, angle: a + k * s, speed: 210, damage: 7, r: 6, lifeMs: 2200, color: LIME_DARK });
        }
      }
      if (time >= haulAt && !hitHaul) {
        const b = ballPos(time);
        const p = tk.player;
        if (p.active && p.hp > 0 && dist(b.x, b.y, p.x, p.y) < BALL_R + 20) {
          hitHaul = true;
          tk.hitPlayer(13, p.x, p.y);
          tk.slowPlayer(0.6, 500);
        }
      }
      if (time > endAt) { live = false; ballOut = false; }
    },
    drawGround(g, time) {
      if (!live || time < landAt) return;
      const b = ballPos(time);
      // The chain lying across the floor, pulsing as it comes taut.
      const k = clamp((time - landAt) / LIE, 0, 1);
      const taut = time < haulAt ? 0.3 + k * 0.6 + Math.sin(time / 50) * 0.1 : 0.9;
      g.lineStyle(BALL_R * 2 + 18, 0xd04a2a, time < haulAt ? 0.06 + k * 0.14 : 0.08); g.lineBetween(b.x, b.y, tk.bossX, tk.bossY);
      const n = Math.max(2, Math.round(dist(b.x, b.y, tk.bossX, tk.bossY) / 14));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const sag = time < haulAt ? Math.sin(t * Math.PI) * 10 * (1 - k) : 0;
        g.lineStyle(2, IRON_LIT, taut); g.strokeCircle(b.x + (tk.bossX - b.x) * t, b.y + (tk.bossY - b.y) * t + sag, 2.6);
      }
      // The furrow ploughed behind a hauled ball.
      if (time >= haulAt) { g.lineStyle(14, DUST_DARK, 0.5); g.lineBetween(tx, ty, b.x, b.y); }
      // The crater.
      g.fillStyle(DUST_DARK, 0.6); g.fillEllipse(tx, ty + 6, 90, 34);
      for (let i = 0; i < 6; i++) crack(g, tx, ty + 6, 40, i * 1.05, LIME_DEEP, 0.7);
    },
    drawAir(g, time) {
      if (!live) return;
      const b = ballPos(time);
      if (time < landAt) {
        // In flight: the chain trailing back to him.
        g.lineStyle(2, IRON, 0.9); g.lineBetween(tk.bossX, tk.bossY, b.x, b.y);
      }
      wreckingBall(g, b.x, b.y, BALL_R);
      if (landed && time - landAt < 400) {
        const k = (time - landAt) / 400;
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.fillStyle(DUST, 0.6 * (1 - k)); g.fillCircle(tx + Math.cos(a) * k * 60, ty + Math.sin(a) * k * 30 - k * 20, 10 + k * 8); }
      }
    },
    onPhaseEnd() { live = false; ballOut = false; },
  };
};

// ── Signature: Blow the Towers ───────────────────────────────────────
// Ruined towers stand at the yard's edges, each with a charge fizzing at its foot. One after
// another they blow and topple inward along a line through where you stood — the fall's shadow
// lengthens across the floor first. Where a tower lands it lies as rubble a while, slow to cross.

interface Tower { x: number; y: number; ang: number; fallAt: number; dealt: boolean; seed: number }

const towers = (tk: BossToolkit): SignatureMove => {
  let list: Tower[] = [];
  const LEN = 470, HALF = 44, RUBBLE = 2600, TOPPLE = 360;
  const end = (t: Tower) => ({ x: t.x + Math.cos(t.ang) * LEN, y: t.y + Math.sin(t.ang) * LEN });
  return {
    durationMs: 2700,
    windupMs: 600,
    gesture: 'point',
    hold: 'conduct',
    tell: 'BLOW THE TOWERS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 3 : 2;
      const sides = ['w', 'e', 's', 'n'].sort(() => Math.random() - 0.5).slice(0, n);
      list = sides.map((s, i) => {
        const x = s === 'w' ? 50 : s === 'e' ? tk.W - 50 : clamp(p.x + (Math.random() - 0.5) * 300, 120, tk.W - 120);
        const y = s === 'n' ? TOP + 30 : s === 's' ? tk.H - 30 : clamp(p.y + (Math.random() - 0.5) * 220, TOP + 80, tk.H - 80);
        return { x, y, ang: Math.atan2(p.y - y, p.x - x), fallAt: time + tk.warn(1500) + i * 650, dealt: false, seed: Math.random() * 10 };
      });
      tk.sfx('grenade-throw');
    },
    update(time) {
      const p = tk.player;
      for (const t of list) {
        if (!t.dealt && time >= t.fallAt + TOPPLE) {
          t.dealt = true;
          tk.sfx('explosion-large');
          const e = end(t);
          if (p.active && p.hp > 0 && segDist(p.x, p.y, t.x, t.y, e.x, e.y) < HALF + 12) { tk.hitPlayer(20, p.x, p.y); tk.slowPlayer(0.5, 700); }
        } else if (!t.dealt && time >= t.fallAt && time - t.fallAt < 20) tk.sfx('explosion-small');
        if (t.dealt && time - t.fallAt < RUBBLE + TOPPLE) {
          const e = end(t);
          if (p.active && segDist(p.x, p.y, t.x, t.y, e.x, e.y) < HALF) tk.slowPlayer(0.65, 200);
        }
      }
      list = list.filter((t) => time < t.fallAt + TOPPLE + RUBBLE + 400);
    },
    drawGround(g, time) {
      for (const t of list) {
        const e = end(t);
        const nx = -Math.sin(t.ang) * HALF, ny = Math.cos(t.ang) * HALF;
        if (!t.dealt) {
          // The fall's shadow lengthening across the floor.
          const k = clamp(1 - (t.fallAt - time) / 1500, 0, 1);
          const lx = t.x + (e.x - t.x) * k, ly = t.y + (e.y - t.y) * k;
          g.fillStyle(0x000000, 0.12 + k * 0.2);
          g.fillTriangle(t.x + nx, t.y + ny, t.x - nx, t.y - ny, lx + nx, ly + ny);
          g.fillTriangle(t.x - nx, t.y - ny, lx - nx, ly - ny, lx + nx, ly + ny);
          g.lineStyle(2, HAZARD, 0.25 + k * 0.5);
          g.lineBetween(t.x + nx, t.y + ny, e.x + nx, e.y + ny); g.lineBetween(t.x - nx, t.y - ny, e.x - nx, e.y - ny);
          continue;
        }
        // The fallen tower: courses of stone lying along the line, dust settling.
        const fade = clamp((t.fallAt + TOPPLE + RUBBLE + 400 - time) / 600, 0, 1);
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9;
          const cx = t.x + (e.x - t.x) * k, cy = t.y + (e.y - t.y) * k;
          g.fillStyle(LIME_DEEP, 0.9 * fade); g.fillEllipse(cx, cy + 4, HALF * 2.1, HALF * 1.3);
          g.fillStyle(i % 2 ? LIME : LIME_DARK, fade); g.fillEllipse(cx, cy, HALF * 1.9, HALF * 1.1);
          ashlar(g, cx + Math.sin(t.seed + i) * 18, cy + 6, 16, 10, LIME_LIT);
        }
      }
    },
    drawAir(g, time) {
      for (const t of list) {
        if (t.dealt) {
          const k = clamp((time - t.fallAt - TOPPLE) / 700, 0, 1);
          if (k < 1) { const e = end(t); for (let i = 0; i < 6; i++) { g.fillStyle(DUST, 0.5 * (1 - k)); g.fillCircle(t.x + (e.x - t.x) * (i / 5), t.y + (e.y - t.y) * (i / 5) - k * 30, 30 + k * 30); } }
          continue;
        }
        // Toppling: the tower drawn lying further over each frame.
        const k = time >= t.fallAt ? clamp((time - t.fallAt) / TOPPLE, 0, 1) : 0;
        drawTower(g, t, k, time);
      }
    },
    onPhaseEnd() { list = []; },
  };

  /** A ruined tower stump, crenels broken, a charge on its foot — or, as `k` goes to 1, falling over along its line. */
  function drawTower(g: G, t: Tower, k: number, time: number): void {
    const H = 150;
    // Standing, it rises straight up from its base; falling, its top swings down toward its line.
    const fx = Math.cos(t.ang), fy = Math.sin(t.ang);
    const topX = t.x + fx * LEN * k * 0.98, topY = t.y - H * (1 - k) + fy * LEN * k * 0.98;
    const w = 46;
    const nx = -(topY - t.y), ny = topX - t.x;
    const nl = Math.hypot(nx, ny) || 1;
    const ox = (nx / nl) * w / 2, oy = (ny / nl) * w / 2;
    g.fillStyle(LIME_DARK, 1);
    g.fillTriangle(t.x + ox, t.y + oy, t.x - ox, t.y - oy, topX + ox, topY + oy);
    g.fillTriangle(t.x - ox, t.y - oy, topX - ox, topY - oy, topX + ox, topY + oy);
    g.fillStyle(LIME, 1);
    g.fillTriangle(t.x + ox * 0.7, t.y + oy * 0.7, t.x - ox * 0.7, t.y - oy * 0.7, topX + ox * 0.7, topY + oy * 0.7);
    g.fillTriangle(t.x - ox * 0.7, t.y - oy * 0.7, topX - ox * 0.7, topY - oy * 0.7, topX + ox * 0.7, topY + oy * 0.7);
    for (let i = 1; i < 8; i++) {
      const q = i / 8;
      const cx = t.x + (topX - t.x) * q, cy = t.y + (topY - t.y) * q;
      g.lineStyle(1, LIME_DEEP, 0.7); g.lineBetween(cx + ox, cy + oy, cx - ox, cy - oy);
    }
    // Crenels at the top, two missing; a black window.
    for (let c = 0; c < 4; c++) {
      if (c === 1) continue;
      const q = (c - 1.5) / 2;
      g.fillStyle(LIME_LIT, 1); g.fillCircle(topX + ox * q * 2, topY + oy * q * 2, 6);
    }
    const wx = t.x + (topX - t.x) * 0.6, wy = t.y + (topY - t.y) * 0.6;
    g.fillStyle(0x0c0a08, 1); g.fillCircle(wx, wy, 7);
    // The charge at its foot, spitting.
    if (k === 0) {
      g.fillStyle(SEAL, 1); g.fillRect(t.x - 8, t.y - 16, 16, 14);
      g.fillStyle(HAZARD, 1); g.fillRect(t.x - 8, t.y - 11, 16, 3);
      glow(g, t.x + 8, t.y - 20, 10, FUSE, 0.12, 3);
      for (let i = 0; i < 4; i++) { const a = time / 40 + i * 1.6; g.fillStyle(lit(FUSE, 0.3), 1); g.fillCircle(t.x + 8 + Math.cos(a) * 5, t.y - 20 + Math.sin(a) * 5, 1.3); }
    } else {
      glow(g, t.x, t.y - 10, 40 * (1 - k) + 10, BLAST, 0.1, 3);
    }
  }
};

// ── Signature: Falling Masonry ───────────────────────────────────────
// The last façade on the yard peels away: a line of dressed blocks comes off it one after another,
// down a line through you, from one end to the other. Every block's shadow grows on the floor
// before it lands. Step off the line — or wait for the gap after the block above you.

interface Block { x: number; y: number; at: number; dealt: boolean }

const masonry = (tk: BossToolkit): SignatureMove => {
  let blocks: Block[] = [];
  const S = 64, N = 9, GAP = 76, WARN = 900;
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'slam',
    tell: 'FALLING MASONRY',
    cast(time) {
      const p = tk.player;
      const a = Math.random() * Math.PI;
      const dir = Math.random() < 0.5 ? 1 : -1;
      blocks = [];
      for (let i = 0; i < N; i++) {
        const k = (i - (N - 1) / 2) * dir;
        const x = p.x + Math.cos(a) * k * GAP, y = p.y + Math.sin(a) * k * GAP;
        if (x < 30 || x > tk.W - 30 || y < TOP + 20 || y > tk.H - 20) continue;
        blocks.push({ x, y, at: time + tk.warn(WARN) + i * (tk.hard ? 130 : 160), dealt: false });
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const b of blocks) {
        if (b.dealt || time < b.at) continue;
        b.dealt = true;
        tk.sfx('stone-slam');
        if (p.active && p.hp > 0 && Math.abs(p.x - b.x) < S / 2 + 14 && Math.abs(p.y - b.y) < S / 2 + 14) tk.hitPlayer(14, p.x, p.y);
      }
      blocks = blocks.filter((b) => time < b.at + 1600);
    },
    drawGround(g, time) {
      for (const b of blocks) {
        if (!b.dealt) {
          const k = clamp(1 - (b.at - time) / (WARN * 1.3), 0, 1);
          g.fillStyle(0x000000, 0.1 + k * 0.3); g.fillRect(b.x - (S / 2) * (0.5 + k * 0.5), b.y - (S / 2) * (0.5 + k * 0.5), S * (0.5 + k * 0.5), S * (0.5 + k * 0.5));
          g.lineStyle(2, HAZARD, 0.2 + k * 0.6); g.strokeRect(b.x - S / 2, b.y - S / 2, S, S);
          continue;
        }
        // Landed: the block lies broken in its own dust.
        const fade = clamp((b.at + 1600 - time) / 500, 0, 1);
        g.fillStyle(LIME_DEEP, fade); g.fillRect(b.x - S / 2, b.y - S / 2 + 6, S, S - 6);
        g.fillStyle(LIME, fade); g.fillRect(b.x - S / 2 + 2, b.y - S / 2, S - 4, S - 10);
        g.fillStyle(LIME_LIT, fade); g.fillRect(b.x - S / 2 + 2, b.y - S / 2, S - 4, 3);
        crack(g, b.x - 10, b.y - S / 2 + 4, S * 0.8, 1.3, LIME_DEEP, fade);
      }
    },
    drawAir(g, time) {
      for (const b of blocks) {
        if (b.dealt) {
          const k = clamp((time - b.at) / 400, 0, 1);
          if (k < 1) { g.fillStyle(DUST, 0.55 * (1 - k)); g.fillCircle(b.x, b.y, S * 0.5 + k * 30); }
          continue;
        }
        // Falling: a moulded block dropping out of the sky over its shadow.
        const k = clamp(1 - (b.at - time) / (WARN * 1.3), 0, 1);
        if (k < 0.35) continue;
        const h = (1 - k) * 380;
        const y = b.y - h;
        g.fillStyle(LIME_DARK, 1); g.fillRect(b.x - S / 2, y - S / 2, S, S * 0.8);
        g.fillStyle(LIME, 1); g.fillRect(b.x - S / 2 + 2, y - S / 2, S - 6, S * 0.7);
        // A carved moulding along its face: the façade it came off.
        g.fillStyle(LIME_LIT, 1); g.fillRect(b.x - S / 2 + 2, y - S / 2 + 8, S - 6, 4);
        g.fillStyle(LIME_DEEP, 1); g.fillRect(b.x - S / 2 + 2, y - S / 2 + 12, S - 6, 2);
        for (let i = 0; i < 4; i++) { g.fillStyle(LIME_DEEP, 0.7); g.fillCircle(b.x - S / 2 + 10 + i * 14, y - S / 2 + 22, 3); }
      }
    },
    onPhaseEnd() { blocks = []; },
  };
};

// ── Signature: Breaching Charges ─────────────────────────────────────
// Four charges are slapped down in a ring round you, fuses fizzing, each a shaped charge whose
// blast is a cone aimed in at the middle. The middle is the worst place in the yard. Slip out of
// the ring between two charges, or behind one.

interface Charge { x: number; y: number; a: number }

const breach = (tk: BossToolkit): SignatureMove => {
  let charges: Charge[] = [];
  let blowAt = 0, dealt = true, castAt = 0;
  const R = 140, CONE = 0.38, LEN = 210;
  const inCone = (c: Charge, x: number, y: number) => {
    const d = dist(c.x, c.y, x, y);
    if (d > LEN || d < 1) return d < 1;
    return Math.abs(wrapAngle(Math.atan2(y - c.y, x - c.x) - c.a)) < CONE;
  };
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'clap',
    tell: 'BREACHING CHARGES',
    cast(time) {
      const p = tk.player;
      const cx = tk.clampX(p.x, 160), cy = clamp(p.y, TOP + 150, tk.H - 150);
      const a0 = Math.random() * Math.PI * 2;
      const n = tk.hard ? 5 : 4;
      charges = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        charges.push({ x, y, a: Math.atan2(cy - y, cx - x) });
      }
      castAt = time;
      blowAt = time + tk.warn(1500);
      dealt = false;
      tk.sfx('trap-set');
    },
    update(time) {
      if (dealt || time < blowAt) return;
      dealt = true;
      tk.sfx('explosion-large');
      const p = tk.player;
      if (p.active && p.hp > 0 && charges.some((c) => inCone(c, p.x, p.y))) { tk.hitPlayer(16, p.x, p.y); tk.slowPlayer(0.6, 500); }
    },
    drawGround(g, time) {
      if (!charges.length) return;
      const blown = dealt && time >= blowAt;
      if (blown && time - blowAt > 700) { charges = []; return; }
      const k = clamp((time - castAt) / Math.max(1, blowAt - castAt), 0, 1);
      for (const c of charges) {
        // The cone each will blow, chalked in.
        const a0 = c.a - CONE, a1 = c.a + CONE;
        const alpha = blown ? 0.5 * (1 - (time - blowAt) / 700) : 0.08 + k * 0.22;
        g.fillStyle(blown ? BLAST : HAZARD, alpha);
        g.fillTriangle(c.x, c.y, c.x + Math.cos(a0) * LEN, c.y + Math.sin(a0) * LEN, c.x + Math.cos(c.a) * LEN, c.y + Math.sin(c.a) * LEN);
        g.fillTriangle(c.x, c.y, c.x + Math.cos(c.a) * LEN, c.y + Math.sin(c.a) * LEN, c.x + Math.cos(a1) * LEN, c.y + Math.sin(a1) * LEN);
        if (!blown) {
          g.lineStyle(1.5, CHALK, 0.4 + k * 0.4);
          g.lineBetween(c.x, c.y, c.x + Math.cos(a0) * LEN, c.y + Math.sin(a0) * LEN); g.lineBetween(c.x, c.y, c.x + Math.cos(a1) * LEN, c.y + Math.sin(a1) * LEN);
        }
      }
    },
    drawAir(g, time) {
      if (!charges.length) return;
      if (dealt && time >= blowAt) {
        const k = clamp((time - blowAt) / 500, 0, 1);
        for (const c of charges) { g.fillStyle(BLAST, 0.5 * (1 - k)); g.fillCircle(c.x + Math.cos(c.a) * 60 * k, c.y + Math.sin(c.a) * 60 * k, 24 + k * 30); }
        return;
      }
      const k = clamp((time - castAt) / Math.max(1, blowAt - castAt), 0, 1);
      for (const c of charges) {
        // A shaped charge: a squat cone of copper on a tripod, aimed in, with a fuse burning down.
        g.fillStyle(IRON, 1); for (const d of [-0.9, 0.9, Math.PI]) g.fillRect(c.x + Math.cos(c.a + d) * 10 - 1, c.y + Math.sin(c.a + d) * 10 - 1, 2, 8);
        g.fillStyle(RUST_LIT, 1); g.fillCircle(c.x, c.y - 6, 9);
        g.fillStyle(RUST, 1); g.fillTriangle(c.x + Math.cos(c.a) * 14, c.y - 6 + Math.sin(c.a) * 14, c.x + Math.cos(c.a + 1.8) * 8, c.y - 6 + Math.sin(c.a + 1.8) * 8, c.x + Math.cos(c.a - 1.8) * 8, c.y - 6 + Math.sin(c.a - 1.8) * 8);
        g.fillStyle(HAZARD, 1); g.fillRect(c.x - 6, c.y - 8, 12, 2);
        const fx = c.x - Math.cos(c.a) * (16 - k * 10), fy = c.y - 10 - Math.sin(c.a) * (16 - k * 10);
        g.lineStyle(1.2, TIMBER_DARK, 1); g.lineBetween(c.x - Math.cos(c.a) * 6, c.y - 8 - Math.sin(c.a) * 6, fx, fy);
        glow(g, fx, fy, 8, FUSE, 0.14, 2);
        g.fillStyle(lit(FUSE, 0.4), 1); g.fillCircle(fx + Math.sin(time / 30) * 2, fy, 1.6);
      }
    },
    onPhaseEnd() { charges = []; dealt = true; },
  };
};

// ── Signature: Ruin of Ages ──────────────────────────────────────────
// Time-lapse decay. A wave of centuries sweeps across the yard row by row: each row of tiles
// cracks, crumbles to a pit, then silts back up. One old road survives every row, wandering a
// tile at a time — the crumbling flags light it up. Stand on the road, or walk it.

interface AgeRow { idx: number; safe: number; warnAt: number; fallAt: number; restoreAt: number; dealt: boolean }

const ages = (tk: BossToolkit): SignatureMove => {
  const T = 80;
  let rows: AgeRow[] = [];
  let vertical = true;
  let reverse = false;
  let cols = 0, lines = 0;
  let lastTick = 0;
  const PIT_MS = 1500;
  const tileOf = (x: number, y: number) => {
    const c = Math.floor(x / T), r = Math.floor((y - TOP) / T);
    return vertical ? { line: reverse ? lines - 1 - r : r, pos: c } : { line: reverse ? lines - 1 - c : c, pos: r };
  };
  const rectOf = (line: number, pos: number) => {
    const L = reverse ? lines - 1 - line : line;
    return vertical ? { x: pos * T, y: TOP + L * T } : { x: L * T, y: TOP + pos * T };
  };
  return {
    durationMs: 3200,
    windupMs: 700,
    gesture: 'raise',
    hold: 'conduct',
    locksBody: true,
    tell: 'RUIN OF AGES',
    cast(time) {
      vertical = Math.random() < 0.6;
      reverse = Math.random() < 0.5;
      const colsV = Math.ceil(tk.W / T), rowsV = Math.ceil((tk.H - TOP) / T);
      cols = vertical ? colsV : rowsV;
      lines = vertical ? rowsV : colsV;
      // The old road starts under you and wanders a tile at a time.
      let safe = tileOf(tk.player.x, tk.player.y).pos;
      rows = [];
      const step = tk.hard ? 340 : 400;
      for (let i = 0; i < lines; i++) {
        if (i > 0) safe = clamp(safe + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 0), 0, cols - 2);
        const warnAt = time + i * step;
        const fallAt = warnAt + tk.warn(900);
        rows.push({ idx: i, safe, warnAt, fallAt, restoreAt: fallAt + PIT_MS, dealt: false });
      }
      tk.sfx('clock-tick');
    },
    update(time) {
      const p = tk.player;
      if (!(p.active && p.hp > 0)) return;
      const here = tileOf(p.x, p.y);
      const row = rows.find((r) => r.idx === here.line);
      const onRoad = row ? here.pos === row.safe || here.pos === row.safe + 1 : true;
      for (const r of rows) {
        if (!r.dealt && time >= r.fallAt) {
          r.dealt = true;
          if (r.idx % 2 === 0) tk.sfx('stone-slam');
          if (r === row && !onRoad) { tk.hitPlayer(10, p.x, p.y); tk.slowPlayer(0.55, 600); }
        }
      }
      if (row && !onRoad && time >= row.fallAt && time < row.restoreAt && time - lastTick > 500) {
        lastTick = time;
        tk.hitPlayer(5, p.x, p.y);
        tk.slowPlayer(0.6, 520);
      }
      rows = rows.filter((r) => time < r.restoreAt + 600);
    },
    drawGround(g, time) {
      for (const r of rows) {
        if (time < r.warnAt) continue;
        for (let pos = 0; pos < cols; pos++) {
          const rc = rectOf(r.idx, pos);
          const safe = pos === r.safe || pos === r.safe + 1;
          if (safe) {
            // The old road: flags that never crack, picked out bright.
            g.lineStyle(2, LIME_LIT, time < r.restoreAt ? 0.6 : 0.2); g.strokeRect(rc.x + 4, rc.y + 4, T - 8, T - 8);
            continue;
          }
          if (time < r.fallAt) {
            const k = clamp((time - r.warnAt) / Math.max(1, r.fallAt - r.warnAt), 0, 1);
            // Cracking: lines spread across the tile, moss and dust creep in — years passing.
            g.fillStyle(MOSS_DARK, 0.08 + k * 0.2); g.fillRect(rc.x + 2, rc.y + 2, T - 4, T - 4);
            crack(g, rc.x + T * 0.2, rc.y + T * 0.3, T * 0.4 * k + 6, 0.4 + pos, LIME_DEEP, 0.4 + k * 0.5);
            crack(g, rc.x + T * 0.7, rc.y + T * 0.6, T * 0.3 * k + 4, 2.4 + pos, LIME_DEEP, 0.3 + k * 0.5);
            g.lineStyle(1.5, 0xd8c8a0, 0.15 + k * 0.4); g.strokeRect(rc.x + 2, rc.y + 2, T - 4, T - 4);
          } else if (time < r.restoreAt) {
            // Crumbled to a pit, sand pouring in from the edges.
            g.fillStyle(0x14100c, 0.85); g.fillRect(rc.x + 3, rc.y + 3, T - 6, T - 6);
            g.fillStyle(STRATA_BUFF, 0.6); g.fillRect(rc.x + 3, rc.y + 3, T - 6, 8);
            const silt = clamp((time - r.fallAt) / PIT_MS, 0, 1);
            g.fillStyle(DUST, 0.3 + silt * 0.6); g.fillRect(rc.x + 3, rc.y + T - 3 - (T - 6) * silt, T - 6, (T - 6) * silt);
          } else {
            const k = clamp((time - r.restoreAt) / 600, 0, 1);
            g.fillStyle(DUST_LIT, 0.4 * (1 - k)); g.fillRect(rc.x + 3, rc.y + 3, T - 6, T - 6);
          }
        }
      }
    },
    drawAir(g, time) {
      // An hourglass over him while the ages run, its sand falling.
      if (!rows.length) return;
      const x = tk.bossX, y = tk.bossY - 80;
      const k = (time / 1200) % 1;
      g.lineStyle(2, LIME_LIT, 0.8); g.lineBetween(x - 12, y - 18, x + 12, y - 18); g.lineBetween(x - 12, y + 18, x + 12, y + 18);
      g.fillStyle(GHOST, 0.3); g.fillTriangle(x - 10, y - 16, x + 10, y - 16, x, y); g.fillTriangle(x - 10, y + 16, x + 10, y + 16, x, y);
      g.fillStyle(STRATA_BUFF, 0.9); g.fillTriangle(x - 8 * (1 - k), y - 2 - 12 * (1 - k), x + 8 * (1 - k), y - 2 - 12 * (1 - k), x, y - 2);
      g.fillStyle(STRATA_BUFF, 0.9); g.fillTriangle(x - 8 * k, y + 16, x + 8 * k, y + 16, x, y + 16 - 12 * k);
      g.fillRect(x - 0.5, y - 2, 1, 16);
    },
    onPhaseEnd() { rows = []; },
  };
};

// ── Signature: Weathering ────────────────────────────────────────────
// The centuries roll out of him in rings: a band of erosion — moss, then sand, then nothing —
// expanding across the yard. Each ring has two gaps, marked before it starts by pale rays from
// him; the second ring's gaps are turned only a little from the first's. Stand in a ray.

interface Ring { at: number; gap: number; dealt: boolean }

const weathering = (tk: BossToolkit): SignatureMove => {
  let rings: Ring[] = [];
  let cx = 0, cy = 0, castAt = 0;
  const SPEED = 230, BAND = 24, GAP_HALF = 0.5, R0 = 40;
  const radius = (r: Ring, time: number) => R0 + (SPEED * (time - r.at)) / 1000;
  const inGap = (r: Ring, a: number) => Math.abs(wrapAngle(a - r.gap)) < GAP_HALF || Math.abs(wrapAngle(a - r.gap - Math.PI)) < GAP_HALF;
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'flex',
    locksBody: true,
    tell: 'WEATHERING',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      castAt = time;
      const g0 = tk.angleToPlayer(cx, cy) + (Math.random() - 0.5) * 0.6;
      const start = time + tk.warn(900);
      rings = [{ at: start, gap: g0, dealt: false }, { at: start + 750, gap: g0 + (Math.random() < 0.5 ? 0.3 : -0.3), dealt: false }];
      if (tk.hard) rings.push({ at: start + 1500, gap: rings[1].gap + (Math.random() < 0.5 ? 0.3 : -0.3), dealt: false });
      tk.sfx('time-warp');
    },
    update(time) {
      const p = tk.player;
      for (const r of rings) {
        if (r.dealt || time < r.at) continue;
        const rad = radius(r, time);
        const d = dist(cx, cy, p.x, p.y);
        if (p.active && p.hp > 0 && Math.abs(d - rad) < BAND && !inGap(r, Math.atan2(p.y - cy, p.x - cx))) {
          r.dealt = true;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.6, 600);
        }
        if (rad > 1200) r.dealt = true;
      }
      rings = rings.filter((r) => time < r.at || radius(r, time) < 1250);
    },
    drawGround(g, time) {
      if (!rings.length) return;
      // The gaps' rays, before and while the rings run.
      for (const r of rings) {
        if (time > r.at && radius(r, time) > 1200) continue;
        const k = clamp((time - castAt) / Math.max(1, r.at - castAt), 0, 1);
        for (const a of [r.gap, r.gap + Math.PI]) {
          g.fillStyle(GHOST, 0.05 + k * 0.08);
          g.fillTriangle(cx, cy, cx + Math.cos(a - GAP_HALF * 0.8) * 900, cy + Math.sin(a - GAP_HALF * 0.8) * 900, cx + Math.cos(a + GAP_HALF * 0.8) * 900, cy + Math.sin(a + GAP_HALF * 0.8) * 900);
        }
      }
      for (const r of rings) {
        if (time < r.at) continue;
        const rad = radius(r, time);
        // The band: moss on the inside edge, sand on the outside, drawn in arcs that skip the gaps.
        const segs = 60;
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
          const mid = (a0 + a1) / 2;
          if (inGap(r, mid)) continue;
          g.lineStyle(BAND, i % 2 ? MOSS : STRATA_BUFF, 0.55);
          g.lineBetween(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad, cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad);
          g.lineStyle(3, DUST_LIT, 0.7);
          g.lineBetween(cx + Math.cos(a0) * (rad + BAND / 2), cy + Math.sin(a0) * (rad + BAND / 2), cx + Math.cos(a1) * (rad + BAND / 2), cy + Math.sin(a1) * (rad + BAND / 2));
        }
      }
    },
    onPhaseEnd() { rings = []; },
  };
};

export const WRECK_BOSS: WorldBossDef = {
  worldId: 'isle:wreck',
  name: 'Prince Wreck',
  title: 'the Last Demolisher',
  color: WRECK,
  colorLit: WRECK_LIT,
  colorDark: WRECK_DARK,
  accent: HAZARD,
  // Tier 4 of the fifth isle: the hardest court on Bedrock Hold.
  damageMult: 1.35,

  intro: [
    'Stand clear of the line. No? Then you\'re part of the job.',
    'Father wants this city forgotten. I make it forgettable. Stone by stone. You\'re one more stone.',
  ],
  banter: [
    'Everything comes down. That\'s not cruelty. That\'s gravity.',
    'I built a tower once. It doesn\'t matter. It\'s under your feet.',
    'Chalk a cross on it, and it\'s already gone. It just doesn\'t know yet.',
    'You fight like a builder. Builders always lose here.',
    'Father says I finish things. Look at this yard. I finish everything.',
  ],
  defeatLine: 'THE LAST WALL FALLS',
  resumeLine: 'Back on the site. Hard hat on, this time. I\'d have you on my crew if you\'d stop un-burying things.',

  phases: [
    {
      name: 'Wrecking Ball',
      line: 'Mind your head. The ball doesn\'t.',
      hp: 520,
      cycle: [
        'sig:pendulum', 'volley', 'sig:haul', 'quake', 'sig:flail',
        'charge', 'sig:pendulum', 'radial', 'sig:haul', 'sig:flail',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Demolition',
      line: 'Clear the site! Fire in the hole — all the holes!',
      hp: 620,
      cycle: [
        'sig:towers', 'sig:breach', 'lanes', 'sig:masonry', 'slamchain',
        'sig:towers', 'barrage', 'sig:breach', 'minefield', 'sig:masonry',
      ],
      harass: ['h-flak', 'h-mines', 'h-lane'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'EVERYTHING COMES DOWN IN THE END',
    extraPhase: {
      name: 'Ruin of Ages',
      line: 'You want to see what Father does? Watch. This is a thousand years. This is what he wants.',
      hp: 450,
      cycle: [
        'sig:ages', 'sig:weathering', 'spiral', 'sig:masonry',
        'sig:ages', 'sweep', 'sig:weathering', 'homing',
      ],
      harass: ['h-orbs', 'h-rune'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 16, speed: 185 },
    quake: { radius: 70 },
    charge: { halfW: 34 },
    spiral: { arms: 3, speed: 170 },
  },

  signatures: {
    pendulum,
    flail,
    haul,
    towers,
    masonry,
    breach,
    ages,
    weathering,
  },

  look: {
    crest: 'none', pattern: 'cracks', aura: 'dust', hands: 'gauntlet',
    torsoR: 36, mouth: 'grate', eyes: 2, eyeColor: HAZARD,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'tremor', tint: 'hot', look: { aura: 'smoke', mouth: 'line' } },
    { movement: 'anchor', gimmick: 'none', tint: 'pale', look: { aura: 'dust', hands: 'ball', mouth: 'stitch', pattern: 'smooth' } },
  ],

  /**
   * The Last Demolisher's tells. He wears a foreman's iron hard hat with a hazard band and a chalk
   * cross on the brim, and over it — jammed on crooked — the cracked stone crown off the colossus,
   * too big for him. On the Wrecking Ball he carries his ball slung on its chain at his side,
   * dragging a furrow; in Demolition a bandolier of red charges crosses his chest and he holds a
   * plunger box, its handle up; in the Ruin of Ages he is weathering away: moss on his shoulders,
   * sand pouring from the cracks in him, the crown worn smooth, flakes of him drifting off.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const hardP3 = s.hard && s.phaseIdx >= 2;
    const demo = s.phaseIdx === 1;
    // The hard hat: an iron dome with a brim and a hazard band, a chalk cross on the front.
    const hy = s.y - R * 0.78;
    g.fillStyle(dim(IRON, 0.2), 1); g.fillEllipse(s.x, hy + 6, R * 1.9, R * 0.42);
    g.fillStyle(hardP3 ? RUST : IRON, 1); g.fillEllipse(s.x, hy - 4, R * 1.4, R * 0.9);
    g.fillStyle(hardP3 ? RUST_LIT : IRON_LIT, 0.8); g.fillEllipse(s.x - R * 0.25, hy - R * 0.22, R * 0.45, R * 0.22);
    for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? IRON : HAZARD, hardP3 ? 0.5 : 1); g.fillRect(s.x - R * 0.68 + k * R * 0.17, hy + 1, R * 0.17, R * 0.14); }
    g.lineStyle(2, CHALK, 0.9); g.lineBetween(s.x - 5, hy - 12, s.x + 5, hy - 2); g.lineBetween(s.x + 5, hy - 12, s.x - 5, hy - 2);
    // The colossus's crown, jammed on crooked: stone points with a crack through.
    const tilt = 0.18;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + tilt;
      const bx = s.x + Math.cos(a) * R * 0.62, by = hy - 8 + Math.sin(a) * R * 0.32;
      const tx = s.x + Math.cos(a) * R * 0.85, ty = hy - 8 + Math.sin(a) * R * 0.6 - (hardP3 ? 6 : 14);
      g.fillStyle(LIME_DARK, 1); g.fillTriangle(bx - 6, by, bx + 6, by, tx, ty);
      g.fillStyle(hardP3 ? LIME_LIT : LIME, 1); g.fillTriangle(bx - 4, by, bx + 3, by, tx, ty + 2);
    }
    g.lineStyle(R * 0.12, LIME_DARK, 1);
    g.beginPath(); g.arc(s.x, hy - 8, R * 0.62, Math.PI + tilt + 0.2, Math.PI * 2 + tilt - 0.2, false); g.strokePath();
    crack(g, s.x + R * 0.2, hy - 14, R * 0.3, 1.7, LIME_DEEP, 1);

    if (demo) {
      // A bandolier of charges across the chest.
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        const cx = s.x - R * 0.6 + k * R * 1.2, cy = s.y - R * 0.3 + k * R * 0.8;
        g.fillStyle(SEAL, 1); g.fillRect(cx - 3, cy - 7, 6, 13);
        g.fillStyle(HAZARD, 1); g.fillRect(cx - 3, cy - 2, 6, 2);
      }
      g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(s.x - R * 0.7, s.y - R * 0.4, s.x + R * 0.7, s.y + R * 0.55);
      // The plunger box in his second hand.
      const h = s.hands[1];
      if (h) {
        g.fillStyle(TIMBER, 1); g.fillRect(h.x - 9, h.y - 6, 18, 12);
        g.fillStyle(HAZARD, 1); g.fillRect(h.x - 9, h.y - 2, 18, 3);
        const up = 12 - s.castGlow * 9;
        g.lineStyle(2, IRON, 1); g.lineBetween(h.x, h.y - 6, h.x, h.y - 6 - up);
        g.lineStyle(3, IRON_LIT, 1); g.lineBetween(h.x - 7, h.y - 6 - up, h.x + 7, h.y - 6 - up);
        if (s.castGlow > 0.5) glow(g, h.x, h.y - 8, 14, FUSE, 0.1, 2);
      }
    } else if (hardP3) {
      // Weathering away: moss on the shoulders, sand pouring from the cracks, flakes drifting off.
      for (const k of [-1, 1]) { g.fillStyle(MOSS_DARK, 0.9); g.fillEllipse(s.x + k * R * 0.7, s.y - R * 0.45, R * 0.5, R * 0.25); g.fillStyle(MOSS, 0.8); g.fillEllipse(s.x + k * R * 0.66, s.y - R * 0.5, R * 0.3, R * 0.14); }
      for (let i = 0; i < 3; i++) {
        const sx = s.x - R * 0.4 + i * R * 0.4, sy = s.y + R * 0.1 + (i % 2) * R * 0.2;
        const ph = (s.t / 700 + i * 0.3) % 1;
        g.fillStyle(STRATA_BUFF, 0.9); g.fillRect(sx - 1, sy, 2, R * 0.9 * ph);
        g.fillStyle(STRATA_BUFF, 0.6); g.fillEllipse(sx, s.y + R * 1.05, 10 * ph + 4, 4);
      }
      for (let i = 0; i < 5; i++) {
        const ph = (s.t / 1600 + i / 5) % 1;
        g.fillStyle(LIME_DARK, 1 - ph); g.fillRect(s.x + Math.cos(i * 1.3) * R * (0.7 + ph), s.y - R * 0.2 - ph * R * 1.2, 4, 3);
      }
    }
    // The ball slung at his side on the Wrecking Ball — unless it is out on the chain.
    if (s.phaseIdx === 0 && !ballOut) {
      const h = s.hands[0];
      if (h) {
        const bx = h.x - 6 + Math.sin(s.t / 500) * 4, by = h.y + 34;
        for (let i = 1; i < 5; i++) { const k = i / 5; g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(h.x + (bx - h.x) * k, h.y + (by - 12 - h.y) * k, 2.4); }
        wreckingBall(g, bx, by, 13);
      }
    }
    if (s.enraged) { g.lineStyle(2, HAZARD, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Wrecker's Yard: packed earth trodden flat, the crane's rails across the top under the
   * palace's half-pulled-down front, chalk demolition plans scrawled over the whole floor (crosses,
   * fall lines, numbers), rubble banks round the edges with hazard poles stuck in them, and the
   * outline of a long-buried boy's tower still showing as a ring of offcuts near the middle.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x3a7c15);
    g.fillStyle(DUST_DARK, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { g.fillStyle(rng() < 0.5 ? DUST : SCREE_DARK, 0.35); g.fillRect(rng() * W, 100 + rng() * (H - 100), 2 + rng() * 3, 1.5); }
    // Ruts of the ballast carts.
    for (let i = 0; i < 4; i++) { const y = 200 + i * 110; g.lineStyle(10, 0x000000, 0.06); g.lineBetween(0, y, W, y + 30 - i * 20); }
    // The palace's front behind the HUD: strata, then the wrecked wall, then the crane rail.
    strataFace(g, { x: 0, y: 0, w: W, h: 50 }, rng);
    for (let x = 0; x < W; x += 60) {
      const h = 30 + rng() * 40;
      g.fillStyle(LIME_DARK, 1); g.fillRect(x, 100 - h, 58, h);
      g.fillStyle(LIME, 1); g.fillRect(x + 2, 100 - h, 52, h - 4);
      if (rng() < 0.5) { g.lineStyle(2, CHALK, 0.8); const cx = x + 28, cy = 100 - h / 2; g.lineBetween(cx - 6, cy - 6, cx + 6, cy + 6); g.lineBetween(cx + 6, cy - 6, cx - 6, cy + 6); }
    }
    for (const dy of [104, 116]) { g.fillStyle(IRON, 1); g.fillRect(0, dy, W, 3); }
    for (let x = 0; x < W; x += 20) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, 101, 7, 18); }
    // Chalk demolition plans all over the floor.
    for (let i = 0; i < 26; i++) {
      const x = 60 + rng() * (W - 120), y = 140 + rng() * (H - 180);
      g.lineStyle(2, CHALK, 0.25);
      if (i % 3 === 0) { g.lineBetween(x - 10, y - 10, x + 10, y + 10); g.lineBetween(x + 10, y - 10, x - 10, y + 10); }
      else if (i % 3 === 1) { const a = rng() * Math.PI * 2; g.lineBetween(x, y, x + Math.cos(a) * 80, y + Math.sin(a) * 80); g.lineBetween(x + Math.cos(a) * 80, y + Math.sin(a) * 80, x + Math.cos(a + 2.6) * 70, y + Math.sin(a + 2.6) * 70); }
      else { g.strokeCircle(x, y, 14 + rng() * 10); }
    }
    // The ring of offcuts where the boy's tower stood, still showing through the dust.
    const cx = W / 2, cy = (H + 110) / 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ashlar(g, cx + Math.cos(a) * 46, cy + Math.sin(a) * 28 + 6, 14, 8, i % 2 ? LIME : LIME_DARK);
    }
    g.lineStyle(1.5, CHALK, 0.18); g.strokeEllipse(cx, cy, 120, 74);
    // Rubble banks round the edges, hazard poles stuck in them.
    for (let x = 30; x < W; x += 110) { spoil(g, x, H - 6, 120, 30, rng); }
    for (const x0 of [0, W]) for (let y = 160; y < H; y += 120) spoil(g, x0, y, 80, 40, rng);
    for (const [x, y] of [[40, 200], [W - 40, 330], [40, 470], [W - 40, 560], [W / 2 + 200, H - 20]] as [number, number][]) {
      g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 36, 4, 36);
      for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? IRON : HAZARD, 1); g.fillRect(x - 3, y - 36 + k * 8, 6, 8); }
    }
    g.fillStyle(SCREE, 0.15); g.fillRect(0, 100, W, 30);
  },
};
