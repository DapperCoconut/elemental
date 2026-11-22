import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { lathe, pot, saggarStack, sherd } from './art';
import {
  BISQUE, BRICK, BRICK_DARK, BRICK_LIT, CELADON, COBALT, FIRE, FIRE_DEEP, FIRE_LIT, GLAZE,
  GLAZE_DARK, GLAZE_LIT, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_LIT, MARL, MARL_DARK, OXBLOOD, SLIP, SLIP_DARK, SLIP_DEEP,
  SLIP_LIT, SOOT, STRATA, TERRA, TERRA_LIT,
} from './palette';
import { clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Glaze — the Regent Gravane's son, governor of the Potter's Court.
 *
 * Glaze cannot abide a crack. As a boy he threw a lopsided bowl, and his father tapped it, heard
 * it ring false and threw it on the Ruck; the boy dug every piece out that night and mended it in
 * gold, and has hidden it ever since. Now he taps the court's soldiers at muster himself and
 * listens, and never says a word. He fights the way a pot is made:
 *
 * • **On the Wheel** (anchored): he sits at his wheel in the kiln's heart and throws — pots lobbed
 *   high that burst into sherds and slip; a centring spiral of slip arms turning round his wheel;
 *   ribbons of clay turned off the trimming tool, curling out in spirals.
 * • **Fired** (stalking, the hot tint): he walks into the kiln and comes out glazed hard. Kiln
 *   mouths in the walls blast cones of heat; glaze drips down in columns and runs where it lands;
 *   the glaze *crazes*, cracks racing out across the floor from his feet and flashing.
 * • **Kintsugi** (hard, blinking, the gold tint): shattered at last, he does what he did to his
 *   bowl: his pieces fly out round you and the gold seams between them burn, then fly home; and
 *   seams of molten gold trace jagged lines across the kiln floor.
 */

const TOP = 96;

/** The current phase, published by `drawDecor` so the moves and the wheel can change with it. */
let glazePhase = 0;

const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Thrown Pots ───────────────────────────────────────────
// He lobs pots high over the room: a shadow and a ring show where each will land. Each bursts in a
// ring of sherds and leaves a puddle of slip that drags at your feet.

interface Flight { fx: number; fy: number; tx: number; ty: number; at: number; landAt: number; landed: boolean; spin: number; glaze: number }
interface Puddle { x: number; y: number; r: number; at: number }

const thrownPots = (tk: BossToolkit): SignatureMove => {
  let flights: Flight[] = [];
  let puddles: Puddle[] = [];
  let wheelA = 0;
  let lastT = 0;
  return {
    durationMs: 2000,
    windupMs: 600,
    gesture: 'raise',
    tell: 'THROWN POTS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const a = tk.angleToPlayer();
      const perp = a + Math.PI / 2;
      const glazes = [CELADON, COBALT, OXBLOOD, GLAZE];
      flights = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 120;
        const tx = tk.clampX(p.x + Math.cos(perp) * off + (Math.random() - 0.5) * 40);
        const ty = tk.clampY(p.y + Math.sin(perp) * off + (Math.random() - 0.5) * 40);
        const at = time + i * 220;
        flights.push({ fx: tk.bossX, fy: tk.bossY - 30, tx, ty, at, landAt: at + tk.warn(1050), landed: false, spin: Math.random() * 6, glaze: glazes[i % 4] });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      const dt = lastT ? clamp((time - lastT) / 1000, 0, 0.1) : 0;
      lastT = time;
      wheelA += dt * (glazePhase === 0 ? 2.4 : 0);
      const p = tk.player;
      for (const f of flights) {
        if (f.landed || time < f.landAt) continue;
        f.landed = true;
        tk.sfx('crystal-shatter');
        tk.boom(f.tx, f.ty, 46, TERRA);
        if (alivePlayer(tk) && dist(p.x, p.y, f.tx, f.ty) < 44) tk.hitPlayer(12, f.tx, f.ty);
        for (let k = 0; k < 7; k++) {
          const b = (k / 7) * Math.PI * 2 + f.spin;
          tk.spawnBullet({ x: f.tx, y: f.ty, angle: b, speed: 210, damage: 6, r: 4, lifeMs: 2200, color: TERRA_LIT });
        }
        puddles.push({ x: f.tx, y: f.ty, r: 54, at: time });
      }
      flights = flights.filter((f) => !f.landed || time - f.landAt < 300);
      puddles = puddles.filter((q) => time - q.at < 4200);
      if (alivePlayer(tk) && puddles.some((q) => dist(q.x, q.y, p.x, p.y) < q.r)) tk.slowPlayer(0.6, 250);
    },
    drawGround(g, time) {
      // On the Wheel: the Prince's wheel-head, turning under him.
      if (glazePhase === 0) {
        const x = tk.bossX, y = tk.bossY + 26;
        g.fillStyle(IRON, 1); g.fillEllipse(x, y, 132, 50);
        g.fillStyle(STRATA[2], 1); g.fillEllipse(x, y - 2, 124, 44);
        for (let r = 0.3; r < 1; r += 0.18) { g.lineStyle(1, dim(STRATA[2], 0.25), 0.7); g.strokeEllipse(x, y - 2, 124 * r, 44 * r); }
        for (let i = 0; i < 6; i++) {
          const a = wheelA + (i / 6) * Math.PI * 2;
          g.fillStyle(SLIP_DARK, 0.8); g.fillEllipse(x + Math.cos(a) * 46, y - 2 + Math.sin(a) * 15, 12, 5);
        }
        g.lineStyle(3, lit(STRATA[2], 0.2), 0.35); g.beginPath(); g.arc(x, y - 2, 56, wheelA, wheelA + 0.9, false); g.strokePath();
      }
      for (const q of puddles) {
        const k = clamp((4200 - (time - q.at)) / 700, 0, 1);
        g.fillStyle(SLIP_DEEP, 0.5 * k); g.fillEllipse(q.x + 3, q.y + 3, q.r * 2.1, q.r * 1.4);
        g.fillStyle(SLIP, 0.85 * k); g.fillEllipse(q.x, q.y, q.r * 2, q.r * 1.3);
        g.fillStyle(SLIP_LIT, 0.4 * k); g.fillEllipse(q.x - q.r * 0.3, q.y - q.r * 0.25, q.r * 0.6, q.r * 0.2);
      }
      for (const f of flights) {
        if (f.landed) continue;
        const k = clamp((time - f.at) / Math.max(1, f.landAt - f.at), 0, 1);
        g.fillStyle(0x000000, 0.1 + k * 0.25); g.fillEllipse(f.tx, f.ty, 20 + k * 40, 8 + k * 16);
        g.lineStyle(2, TERRA_LIT, 0.3 + k * 0.6); g.strokeCircle(f.tx, f.ty, 44);
        g.lineStyle(1.5, TERRA_LIT, 0.4); g.beginPath(); g.arc(f.tx, f.ty, 50, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const f of flights) {
        if (time < f.at) continue;
        if (f.landed) {
          const k = (time - f.landAt) / 300;
          for (let i = 0; i < 8; i++) { const a = f.spin + i * 0.8; g.fillStyle(TERRA, 1 - k); g.fillRect(f.tx + Math.cos(a) * k * 50, f.ty + Math.sin(a) * k * 30 - k * 20, 5, 4); }
          continue;
        }
        const k = clamp((time - f.at) / Math.max(1, f.landAt - f.at), 0, 1);
        const x = f.fx + (f.tx - f.fx) * k, y = f.fy + (f.ty - f.fy) * k - Math.sin(k * Math.PI) * 150;
        // A tumbling jar, glazed at the lip.
        const tilt = Math.sin(time / 120 + f.spin) * 4;
        pot(g, x + tilt * 0.3, y + 12, 22, 'jar', BISQUE, f.glaze);
        g.lineStyle(1, SLIP_LIT, 0.4); g.lineBetween(x - 16, y + tilt, x + 16, y - tilt);
      }
    },
    onPhaseEnd() { flights = []; puddles = []; },
  };
};

// ── Signature: Centring ──────────────────────────────────────────────
// Three arms of slip curl out from his wheel in a spiral and sweep round the room as it turns.
// Faint while they gather, solid when they turn. Ride round with the gap, or step through it.

const centring = (tk: BossToolkit): SignatureMove => {
  let startAt = -1;
  let liveAt = 0;
  let endAt = 0;
  let base = 0;
  let dir = 1;
  let lastHit = 0;
  const ARMS = 3;
  const SPEED = () => (tk.hard ? 1.75 : 1.35);
  const curl = 0.0055;
  const armAngle = (time: number, i: number, r: number) => base + dir * Math.max(0, time - liveAt) / 1000 * SPEED() + (i / ARMS) * Math.PI * 2 + dir * r * curl;
  return {
    durationMs: 3600,
    windupMs: 500,
    hold: 'conduct',
    locksBody: true,
    tell: 'CENTRING',
    cast(time) {
      startAt = time;
      liveAt = time + tk.warn(950);
      endAt = liveAt + 2600;
      base = tk.angleToPlayer() + Math.PI / ARMS;
      dir = Math.random() < 0.5 ? 1 : -1;
      tk.sfx('slime-splat');
    },
    update(time) {
      if (startAt >= 0 && time > endAt + 300) startAt = -1;
      if (startAt < 0 || time < liveAt || time > endAt || !alivePlayer(tk)) return;
      const p = tk.player;
      const r = dist(p.x, p.y, tk.bossX, tk.bossY);
      if (r < 40 || r > 520 || time - lastHit < 600) return;
      const pa = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
      for (let i = 0; i < ARMS; i++) {
        if (Math.abs(wrapAngle(pa - armAngle(time, i, r))) * r < 28) {
          lastHit = time;
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.65, 500);
          tk.sfx('hit-medium');
          break;
        }
      }
    },
    drawGround(g, time) {
      if (startAt < 0 || time > endAt + 300) return;
      const warn = time < liveAt;
      const k = warn ? clamp((time - startAt) / Math.max(1, liveAt - startAt), 0, 1) : clamp(1 - (time - endAt) / 300, 0, 1);
      for (let i = 0; i < ARMS; i++) {
        for (const [w, c, a] of [[warn ? 4 : 22, SLIP_DARK, warn ? 0.35 * k : 0.9 * k], [warn ? 2 : 14, SLIP, warn ? 0.5 * k : k], [warn ? 0 : 4, SLIP_LIT, 0.6 * k]] as [number, number, number][]) {
          if (w <= 0) continue;
          g.lineStyle(w, c, a);
          g.beginPath();
          for (let r = 40; r <= 520; r += 16) {
            const an = armAngle(time, i, r);
            const x = tk.bossX + Math.cos(an) * r, y = tk.bossY + Math.sin(an) * r;
            if (r === 40) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.strokePath();
        }
        // Throwing marks along a live arm.
        if (!warn) {
          for (let r = 70; r < 500; r += 60) {
            const an = armAngle(time, i, r);
            g.fillStyle(SLIP_DEEP, 0.6 * k); g.fillCircle(tk.bossX + Math.cos(an) * r, tk.bossY + Math.sin(an) * r, 3);
          }
        }
      }
    },
    onPhaseEnd() { startAt = -1; },
  };
};

// ── Signature: Turnings ──────────────────────────────────────────────
// He trims the foot of a pot on the wheel, and the turnings come off in ribbons — curling out
// from the wheel in spirals, half one way and half the other. Weave between the curls.

interface Ribbon { a: number; r: number; w: number; born: number; hit: boolean; seed: number }

const turnings = (tk: BossToolkit): SignatureMove => {
  let ribbons: Ribbon[] = [];
  let emitUntil = 0;
  let nextEmit = 0;
  let emitted = 0;
  let lastT = 0;
  let ox = 0, oy = 0;
  return {
    durationMs: 2400,
    windupMs: 550,
    gesture: 'sweep',
    tell: 'TURNINGS',
    cast(time) {
      emitUntil = time + 1300;
      nextEmit = time;
      emitted = 0;
      ox = tk.bossX; oy = tk.bossY;
      tk.sfx('slash');
    },
    update(time) {
      const dt = lastT ? clamp((time - lastT) / 1000, 0, 0.1) : 0;
      lastT = time;
      if (time < emitUntil && time >= nextEmit) {
        nextEmit = time + (tk.hard ? 95 : 120);
        const k = emitted++;
        ribbons.push({ a: k * 0.9 + Math.random() * 0.2, r: 30, w: (k % 2 ? 1 : -1) * 0.85, born: time, hit: false, seed: Math.random() * 6 });
      }
      const p = tk.player;
      for (const b of ribbons) {
        b.r += 165 * dt;
        b.a += b.w * dt;
        if (b.hit || !alivePlayer(tk)) continue;
        const x = ox + Math.cos(b.a) * b.r, y = oy + Math.sin(b.a) * b.r;
        if (dist(x, y, p.x, p.y) < 20 + 9) { b.hit = true; tk.hitPlayer(7, x, y); }
      }
      ribbons = ribbons.filter((b) => !b.hit && b.r < 760);
    },
    drawAir(g, time) {
      for (const b of ribbons) {
        const x = ox + Math.cos(b.a) * b.r, y = oy + Math.sin(b.a) * b.r;
        // A curled ribbon of leather-hard clay: a little spiral, darker on its inner face.
        const rot = time / 90 + b.seed;
        g.lineStyle(5, MARL_DARK, 1);
        g.beginPath(); g.arc(x, y, 9, rot, rot + 4.2, false); g.strokePath();
        g.lineStyle(3, MARL, 1);
        g.beginPath(); g.arc(x, y, 9, rot, rot + 4.2, false); g.strokePath();
        g.lineStyle(1.5, lit(MARL, 0.3), 1);
        g.beginPath(); g.arc(x, y, 5, rot + 1, rot + 4, false); g.strokePath();
        g.lineStyle(1, SLIP_LIT, 0.35); g.lineBetween(x, y, x - Math.cos(b.a) * 16, y - Math.sin(b.a) * 16);
      }
    },
    onPhaseEnd() { ribbons = []; emitUntil = 0; },
  };
};

// ── Signature: Kiln Blast ────────────────────────────────────────────
// A kiln mouth opens in the wall across the room from you and breathes a cone of heat after its
// door glows. The scorched floor stays hot for a moment after.

interface Mouth { x: number; y: number; a: number; warnAt: number; fireAt: number; dealt: boolean }

const kilnBlast = (tk: BossToolkit): SignatureMove => {
  let mouths: Mouth[] = [];
  let lastTick = 0;
  const HALF = 0.3;
  const LEN = 980;
  const inCone = (m: Mouth, x: number, y: number) => {
    const d = dist(m.x, m.y, x, y);
    return d < LEN && Math.abs(wrapAngle(Math.atan2(y - m.y, x - m.x) - m.a)) < HALF;
  };
  const mouthFor = (side: number): { x: number; y: number } => {
    const W = tk.W, H = tk.H;
    if (side === 0) return { x: W * (0.25 + Math.random() * 0.5), y: TOP + 6 };
    if (side === 1) return { x: W - 10, y: TOP + (H - TOP) * (0.25 + Math.random() * 0.5) };
    if (side === 2) return { x: W * (0.25 + Math.random() * 0.5), y: H - 6 };
    return { x: 10, y: TOP + (H - TOP) * (0.25 + Math.random() * 0.5) };
  };
  return {
    durationMs: 2200,
    windupMs: 500,
    gesture: 'point',
    tell: 'KILN BLAST',
    cast(time) {
      const p = tk.player;
      // The wall furthest from you, so the cone crosses the room.
      const dists = [p.y - TOP, tk.W - p.x, tk.H - p.y, p.x];
      const far = dists.indexOf(Math.max(...dists));
      const sides = tk.hard ? [far, (far + 1 + Math.floor(Math.random() * 3)) % 4] : [far];
      mouths = sides.map((s, i) => {
        const m = mouthFor(s);
        return { x: m.x, y: m.y, a: Math.atan2(p.y - m.y, p.x - m.x), warnAt: time, fireAt: time + tk.warn(1250) + i * 450, dealt: false };
      });
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const m of mouths) {
        if (m.dealt || time < m.fireAt) continue;
        m.dealt = true;
        tk.sfx('inferno');
        if (alivePlayer(tk) && inCone(m, p.x, p.y)) tk.hitPlayer(16, p.x, p.y);
      }
      // The scorch lingers.
      if (alivePlayer(tk) && time - lastTick > 500 && mouths.some((m) => m.dealt && time - m.fireAt < 2000 && inCone(m, p.x, p.y))) {
        lastTick = time;
        tk.hitPlayer(3, p.x, p.y);
      }
      mouths = mouths.filter((m) => !m.dealt || time - m.fireAt < 2200);
    },
    drawGround(g, time) {
      for (const m of mouths) {
        const live = m.dealt;
        const k = live ? clamp(1 - (time - m.fireAt) / 2200, 0, 1) : clamp((time - m.warnAt) / Math.max(1, m.fireAt - m.warnAt), 0, 1);
        const a0 = m.a - HALF, a1 = m.a + HALF;
        const pts = [{ x: m.x, y: m.y }];
        for (let i = 0; i <= 10; i++) { const a = a0 + ((a1 - a0) * i) / 10; pts.push({ x: m.x + Math.cos(a) * LEN, y: m.y + Math.sin(a) * LEN }); }
        if (!live) {
          g.fillStyle(FIRE, 0.05 + k * 0.12); g.fillPoints(pts, true, true);
          g.lineStyle(2, FIRE, 0.25 + k * 0.6);
          g.lineBetween(m.x, m.y, m.x + Math.cos(a0) * LEN, m.y + Math.sin(a0) * LEN);
          g.lineBetween(m.x, m.y, m.x + Math.cos(a1) * LEN, m.y + Math.sin(a1) * LEN);
          // Heat shimmer ripples running down the cone.
          for (let i = 0; i < 5; i++) {
            const d = ((time / 4 + i * 180) % LEN);
            g.lineStyle(1.5, FIRE_LIT, 0.25 * k);
            g.beginPath(); g.arc(m.x, m.y, d, a0, a1, false); g.strokePath();
          }
        } else {
          // Scorched floor: a dark fan with a red edge, cooling.
          g.fillStyle(SOOT, 0.35 * k); g.fillPoints(pts, true, true);
          g.lineStyle(3, FIRE_DEEP, 0.6 * k);
          g.lineBetween(m.x, m.y, m.x + Math.cos(a0) * LEN, m.y + Math.sin(a0) * LEN);
          g.lineBetween(m.x, m.y, m.x + Math.cos(a1) * LEN, m.y + Math.sin(a1) * LEN);
        }
      }
    },
    drawAir(g, time) {
      for (const m of mouths) {
        // The mouth in the wall: a brick arch with a glowing iron door.
        const glowK = m.dealt ? clamp(1 - (time - m.fireAt) / 800, 0, 1) : clamp((time - m.warnAt) / Math.max(1, m.fireAt - m.warnAt), 0, 1);
        g.fillStyle(BRICK_DARK, 1); g.fillCircle(m.x, m.y, 30);
        g.fillStyle(BRICK, 1); g.fillCircle(m.x, m.y, 26);
        g.fillStyle(mixC(SOOT, FIRE, glowK), 1); g.fillCircle(m.x, m.y, 18);
        g.fillStyle(FIRE_LIT, glowK * 0.9); g.fillCircle(m.x, m.y, 10);
        glow(g, m.x, m.y, 50, FIRE, 0.04 + glowK * 0.06, 3);
        if (m.dealt && time - m.fireAt < 700) {
          // The blast itself: tongues of flame down the cone.
          const k = (time - m.fireAt) / 700;
          for (let i = 0; i < 26; i++) {
            const a = m.a + ((i % 9) / 8 - 0.5) * HALF * 1.8;
            const d = ((i * 37) % 100) / 100 * LEN * (0.3 + k * 0.7);
            const x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d;
            g.fillStyle(i % 3 ? FIRE : FIRE_LIT, (1 - k) * 0.8); g.fillCircle(x, y, 10 + (d / LEN) * 24);
          }
        }
      }
    },
    onPhaseEnd() { mouths = []; },
  };
};

// ── Signature: Glaze Drips ───────────────────────────────────────────
// Glaze runs off his fired shell and drips from the kiln roof in three columns, one through you,
// top to bottom. Each drop's shadow swells first; where it lands it runs downhill and drags.

interface Drop { x: number; y: number; color: number; at: number; landAt: number; landed: boolean }
interface Run { x: number; y: number; color: number; at: number }

const glazeDrips = (tk: BossToolkit): SignatureMove => {
  let drops: Drop[] = [];
  let runs: Run[] = [];
  let lastTick = 0;
  const runLen = (r: Run, time: number) => clamp((time - r.at) / 3000, 0, 1) * 70;
  const inRun = (r: Run, x: number, y: number, time: number) => segDist(x, y, r.x, r.y, r.x, r.y + runLen(r, time)) < 26;
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'raise',
    tell: 'GLAZE DRIPS',
    cast(time) {
      const p = tk.player;
      const cols = [p.x - 170, p.x, p.x + 170].map((x) => tk.clampX(x, 50));
      const colors = [CELADON, COBALT, OXBLOOD];
      drops = [];
      cols.forEach((x, c) => {
        for (let i = 0; i < 5; i++) {
          const y = TOP + 70 + i * ((tk.H - TOP - 120) / 4);
          const at = time + i * 260 + c * 80;
          drops.push({ x: x + (Math.random() - 0.5) * 20, y, color: colors[c], at, landAt: at + tk.warn(760), landed: false });
        }
      });
      tk.sfx('rain');
    },
    update(time) {
      const p = tk.player;
      for (const d of drops) {
        if (d.landed || time < d.landAt) continue;
        d.landed = true;
        if (alivePlayer(tk) && dist(d.x, d.y, p.x, p.y) < 36) tk.hitPlayer(9, d.x, d.y);
        runs.push({ x: d.x, y: d.y, color: d.color, at: time });
        tk.sfx('slime-splat');
      }
      drops = drops.filter((d) => !d.landed);
      runs = runs.filter((r) => time - r.at < 4200);
      if (alivePlayer(tk) && runs.some((r) => inRun(r, p.x, p.y, time))) {
        tk.slowPlayer(0.65, 250);
        if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(2, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      for (const r of runs) {
        const fade = clamp((4200 - (time - r.at)) / 800, 0, 1);
        const len = runLen(r, time);
        g.fillStyle(dim(r.color, 0.35), 0.6 * fade); g.fillEllipse(r.x + 2, r.y + 3, 50, 26);
        g.fillStyle(r.color, 0.9 * fade); g.fillEllipse(r.x, r.y, 46, 24);
        g.fillRoundedRect(r.x - 9, r.y, 18, len, 8);
        g.fillCircle(r.x, r.y + len, 11);
        g.fillStyle(0xffffff, 0.35 * fade); g.fillEllipse(r.x - 10, r.y - 5, 12, 4);
      }
      for (const d of drops) {
        const k = clamp((time - d.at) / Math.max(1, d.landAt - d.at), 0, 1);
        if (k <= 0) continue;
        g.fillStyle(0x000000, 0.1 + k * 0.22); g.fillEllipse(d.x, d.y, 18 + k * 50, 8 + k * 22);
        g.lineStyle(2, d.color, 0.3 + k * 0.6); g.strokeEllipse(d.x, d.y, 22 + k * 52, 10 + k * 24);
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        const k = clamp((time - d.at) / Math.max(1, d.landAt - d.at), 0, 1);
        if (k <= 0) continue;
        const y = d.y - (1 - k * k) * 300;
        g.lineStyle(4, d.color, 0.5); g.lineBetween(d.x, y - 26, d.x, y - 4);
        g.fillStyle(d.color, 1); g.fillCircle(d.x, y, 7);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(d.x - 2.5, y - 2.5, 2.4);
      }
    },
    onPhaseEnd() { drops = []; runs = []; },
  };
};

// ── Signature: Crazing ───────────────────────────────────────────────
// The glaze crazes: hairline cracks race out across the kiln floor from his feet, branching as
// they go — dark at first, then white-hot along every line.

interface Crack { x1: number; y1: number; x2: number; y2: number; at: number }

const crazing = (tk: BossToolkit): SignatureMove => {
  let cracks: Crack[] = [];
  let flashAt = 0;
  let done = true;
  let startAt = 0;
  return {
    durationMs: 2300,
    windupMs: 650,
    gesture: 'slam',
    tell: 'CRAZING',
    cast(time) {
      cracks = [];
      startAt = time;
      done = false;
      const grow = tk.warn(1100);
      flashAt = time + grow + 120;
      const n = tk.hard ? 6 : 5;
      const toP = tk.angleToPlayer();
      type Tip = { x: number; y: number; a: number; d: number; len: number };
      const tips: Tip[] = [];
      for (let i = 0; i < n; i++) tips.push({ x: tk.bossX, y: tk.bossY, a: toP + (i - (n - 1) / 2) * (Math.PI * 2 / n), d: 0, len: 0 });
      let guard = 0;
      while (tips.length && guard++ < 400) {
        const t = tips.shift();
        if (!t) break;
        const step = 34 + Math.random() * 18;
        const a = t.a + (Math.random() - 0.5) * 0.8;
        const nx = t.x + Math.cos(a) * step, ny = t.y + Math.sin(a) * step;
        if (nx < 20 || nx > tk.W - 20 || ny < TOP + 10 || ny > tk.H - 10 || t.len > 620) continue;
        cracks.push({ x1: t.x, y1: t.y, x2: nx, y2: ny, at: time + (t.len / 620) * grow });
        tips.push({ x: nx, y: ny, a, d: t.d + 1, len: t.len + step });
        if (Math.random() < 0.16 && cracks.length < 120) tips.push({ x: nx, y: ny, a: a + (Math.random() < 0.5 ? 0.7 : -0.7), d: t.d + 1, len: t.len + step });
      }
      tk.sfx('crystal-chime');
    },
    update(time) {
      if (done || time < flashAt) return;
      done = true;
      tk.sfx('crystal-shatter');
      const p = tk.player;
      if (alivePlayer(tk) && cracks.some((c) => segDist(p.x, p.y, c.x1, c.y1, c.x2, c.y2) < 14 + 10)) tk.hitPlayer(12, p.x, p.y);
    },
    drawGround(g, time) {
      if (!cracks.length || time > flashAt + 700) return;
      const flashing = time >= flashAt;
      const k = flashing ? clamp(1 - (time - flashAt) / 700, 0, 1) : 1;
      for (const c of cracks) {
        if (time < c.at) continue;
        if (flashing) {
          g.lineStyle(10, FIRE_LIT, 0.35 * k); g.lineBetween(c.x1, c.y1, c.x2, c.y2);
          g.lineStyle(4, 0xffffff, 0.9 * k); g.lineBetween(c.x1, c.y1, c.x2, c.y2);
        } else {
          const grow = clamp((time - c.at) / 120, 0, 1);
          const ex = c.x1 + (c.x2 - c.x1) * grow, ey = c.y1 + (c.y2 - c.y1) * grow;
          g.lineStyle(3, GLAZE_DARK, 0.85); g.lineBetween(c.x1, c.y1, ex, ey);
          g.lineStyle(1, GLAZE_LIT, 0.4 + clamp((time - startAt) / Math.max(1, flashAt - startAt), 0, 1) * 0.5); g.lineBetween(c.x1, c.y1, ex, ey);
        }
      }
    },
    onPhaseEnd() { cracks = []; done = true; },
  };
};

// ── Signature: Shatter and Rejoin ────────────────────────────────────
// Kintsugi. Four pieces of him fly out to the corners of a square round you; the gold seams
// between them charge and burn; then the pieces fly home to him, straight through the middle.

interface Piece { x: number; y: number; sx: number; sy: number; hit: boolean; seed: number }

const shatter = (tk: BossToolkit): SignatureMove => {
  let pieces: Piece[] = [];
  let outAt = 0, seamAt = 0, burnAt = 0, homeAt = 0, endAt = 0;
  let burned = false;
  let active = false;
  let hx = 0, hy = 0;
  const pos = (pc: Piece, time: number): { x: number; y: number } => {
    if (time < seamAt) { const k = clamp((time - outAt) / Math.max(1, seamAt - outAt), 0, 1); return { x: pc.sx + (pc.x - pc.sx) * k, y: pc.sy + (pc.y - pc.sy) * k }; }
    if (time < homeAt) return { x: pc.x, y: pc.y };
    const k = clamp((time - homeAt) / Math.max(1, endAt - homeAt), 0, 1);
    return { x: pc.x + (hx - pc.x) * k * k, y: pc.y + (hy - pc.y) * k * k };
  };
  return {
    durationMs: 3400,
    windupMs: 600,
    gesture: 'recoil',
    tell: 'SHATTER',
    cast(time) {
      const p = tk.player;
      const rot = Math.random() * Math.PI;
      const R = 190;
      pieces = [];
      for (let i = 0; i < 4; i++) {
        const a = rot + (i / 4) * Math.PI * 2;
        pieces.push({ x: tk.clampX(p.x + Math.cos(a) * R, 40), y: tk.clampY(p.y + Math.sin(a) * R, 40), sx: tk.bossX, sy: tk.bossY, hit: false, seed: i * 1.7 });
      }
      outAt = time;
      seamAt = time + 500;
      burnAt = seamAt + tk.warn(900);
      homeAt = burnAt + 600;
      endAt = homeAt + 650;
      burned = false;
      active = true;
      hx = tk.bossX; hy = tk.bossY;
      tk.sfx('crystal-shatter');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      if (!burned && time >= burnAt) {
        burned = true;
        tk.sfx('beam-fire');
        if (alivePlayer(tk)) {
          for (let i = 0; i < 4; i++) {
            const a = pieces[i], b = pieces[(i + 1) % 4];
            if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 12 + 12) { tk.hitPlayer(14, p.x, p.y); break; }
          }
        }
      }
      if (time >= homeAt) {
        hx = tk.bossX; hy = tk.bossY;
        for (const pc of pieces) {
          if (pc.hit || !alivePlayer(tk)) continue;
          const q = pos(pc, time);
          if (dist(q.x, q.y, p.x, p.y) < 20 + 16) { pc.hit = true; tk.hitPlayer(10, q.x, q.y); }
        }
      }
      if (time > endAt) { active = false; pieces = []; }
    },
    drawGround(g, time) {
      if (!active) return;
      // The seams: faint gold charging, then a burning bar.
      if (time >= seamAt && time < homeAt) {
        const charging = time < burnAt;
        const k = charging ? clamp((time - seamAt) / Math.max(1, burnAt - seamAt), 0, 1) : clamp(1 - (time - burnAt) / 600, 0, 1);
        for (let i = 0; i < 4; i++) {
          const a = pieces[i], b = pieces[(i + 1) % 4];
          if (charging) {
            g.lineStyle(2, GOLD, 0.3 + k * 0.5); g.lineBetween(a.x, a.y, b.x, b.y);
            const mx = a.x + (b.x - a.x) * k, my = a.y + (b.y - a.y) * k;
            g.fillStyle(GOLD_LIT, 0.9); g.fillCircle(mx, my, 3);
          } else {
            g.lineStyle(20, GOLD, 0.35 * k); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(8, GOLD_LIT, 0.9 * k); g.lineBetween(a.x, a.y, b.x, b.y);
          }
        }
      }
      // The paths home.
      if (time >= burnAt && time < homeAt + 200) {
        for (const pc of pieces) { g.lineStyle(2, GLAZE_LIT, 0.4); g.lineBetween(pc.x, pc.y, tk.bossX, tk.bossY); }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      for (const pc of pieces) {
        if (pc.hit) continue;
        const q = pos(pc, time);
        // A sherd of the Prince: celadon glaze over white body, its broken edges gilt.
        const rot = time / 200 + pc.seed;
        const pts = [0, 1, 2, 3, 4].map((i) => {
          const a = rot + (i / 5) * Math.PI * 2;
          const r = 16 + ((i * 7 + pc.seed * 10) % 6);
          return { x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r * 0.8 };
        });
        g.fillStyle(GLAZE_DARK, 1); g.fillPoints(pts.map((p) => ({ x: p.x + 1.5, y: p.y + 2 })), true, true);
        g.fillStyle(GLAZE, 1); g.fillPoints(pts, true, true);
        g.lineStyle(2.5, GOLD, 1); g.strokePoints(pts, true, true);
        g.fillStyle(GLAZE_LIT, 0.7); g.fillEllipse(q.x - 4, q.y - 4, 8, 4);
      }
    },
    onPhaseEnd() { active = false; pieces = []; },
  };
};

// ── Signature: Golden Seam ───────────────────────────────────────────
// A jagged seam is traced across the kiln floor from him, through where you stand and on to the
// wall — then it fills with molten gold that burns for a moment before it sets.

const goldenSeam = (tk: BossToolkit): SignatureMove => {
  let pts: { x: number; y: number }[] = [];
  let traceAt = 0, fillAt = 0, setAt = 0, goneAt = 0;
  let lastHit = 0;
  const onSeam = (x: number, y: number) => {
    for (let i = 0; i < pts.length - 1; i++) if (segDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < 16 + 10) return true;
    return false;
  };
  return {
    durationMs: 2000,
    windupMs: 550,
    gesture: 'point',
    tell: 'GOLDEN SEAM',
    cast(time) {
      const a = tk.angleToPlayer();
      pts = [{ x: tk.bossX, y: tk.bossY }];
      let x = tk.bossX, y = tk.bossY;
      for (let i = 0; i < 16; i++) {
        const b = a + (i % 2 ? 0.5 : -0.5) * (0.6 + Math.random() * 0.5);
        x += Math.cos(b) * 70; y += Math.sin(b) * 70;
        if (x < 10 || x > tk.W - 10 || y < TOP || y > tk.H - 10) break;
        pts.push({ x, y });
      }
      traceAt = time;
      fillAt = time + tk.warn(1000);
      setAt = fillAt + 1600;
      goneAt = setAt + 2500;
      tk.sfx('crystal-chime');
    },
    update(time) {
      if (time < fillAt || time > setAt || pts.length < 2 || !alivePlayer(tk)) return;
      if (time - lastHit < 700) return;
      const p = tk.player;
      if (onSeam(p.x, p.y)) { lastHit = time; tk.hitPlayer(12, p.x, p.y); tk.sfx('sizzle'); }
    },
    drawGround(g, time) {
      if (pts.length < 2 || time > goneAt) return;
      if (time < fillAt) {
        // Tracing: a dark crack running out segment by segment.
        const k = clamp((time - traceAt) / Math.max(1, fillAt - traceAt), 0, 1);
        const n = (pts.length - 1) * Math.min(1, k * 1.4);
        for (let i = 0; i < Math.floor(n); i++) { g.lineStyle(4, SOOT, 0.8); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); }
        for (let i = 0; i < pts.length - 1; i++) { g.lineStyle(1.5, GOLD, 0.25 + k * 0.4); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); }
      } else if (time < setAt) {
        // Molten: glowing gold, bubbling.
        for (let i = 0; i < pts.length - 1; i++) {
          g.lineStyle(26, GOLD_DARK, 0.4); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
          g.lineStyle(14, GOLD, 0.95); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
          g.lineStyle(4, GOLD_LIT, 0.9); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        }
        for (let i = 0; i < pts.length; i++) {
          const ph = ((time / 300) + i * 0.37) % 1;
          g.fillStyle(GOLD_LIT, 0.8 * (1 - ph)); g.fillCircle(pts[i].x, pts[i].y - ph * 10, 3);
        }
      } else {
        // Set: a gilt line in the floor, harmless, glinting.
        const k = clamp((goneAt - time) / 600, 0, 1);
        for (let i = 0; i < pts.length - 1; i++) { g.lineStyle(4, GOLD_DARK, 0.6 * k); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); }
        const gi = Math.floor((time / 120) % pts.length);
        g.fillStyle(0xffffff, 0.7 * k); g.fillCircle(pts[gi].x, pts[gi].y, 2.5);
      }
    },
    onPhaseEnd() { pts = []; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const GLAZE_BOSS: WorldBossDef = {
  worldId: 'isle:glaze',
  name: 'Prince Glaze',
  title: 'the Unbroken',
  color: GLAZE,
  colorLit: GLAZE_LIT,
  colorDark: GLAZE_DARK,
  accent: GOLD,
  // Tier 2 of the fifth isle.
  damageMult: 1.15,

  intro: [
    'Stand still. I want to hear you.',
    'Everything rings, if you strike it. Whole things ring true. Let us find out which you are.',
  ],
  banter: [
    'A crack is a lie the clay tells. I do not allow lies in my court.',
    'Father taps every pot twice. I tap every soldier once. I never need twice.',
    'You are thrown off-centre. I can hear it from here.',
    'What rings false goes on the Ruck. It is not cruelty. It is listening.',
    'Hold still. The wheel is turning. Things go round.',
  ],
  defeatLine: 'IT RINGS FALSE',
  resumeLine: 'Back again. Fired twice. Most things dunt the second time. Not you, it seems.',

  phases: [
    {
      name: 'On the Wheel',
      line: 'Sit. Watch. Everything in this court started on a wheel. So did I.',
      hp: 450,
      cycle: [
        'sig:pots', 'volley', 'sig:centring', 'radial', 'sig:turnings',
        'sig:pots', 'hazard', 'sig:centring', 'homing', 'sig:turnings',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'Fired',
      line: 'Into the kiln, then. What comes out of the fire comes out hard.',
      hp: 530,
      cycle: [
        'sig:blast', 'sig:drips', 'lanes', 'sig:crazing', 'sig:blast',
        'barrage', 'sig:drips', 'sig:pots', 'sig:crazing', 'sweep',
      ],
      harass: ['h-flak', 'h-rune', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'WHAT IS BROKEN IS MENDED IN GOLD',
    extraPhase: {
      name: 'Kintsugi',
      line: 'You broke me. Father broke me first. I learnt what to do with the pieces.',
      hp: 380,
      cycle: [
        'sig:shatter', 'sig:seam', 'sig:crazing', 'homing',
        'sig:shatter', 'sig:pots', 'sig:seam', 'spiral',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 215, spreadRad: 0.5 },
    radial: { count: 16, speed: 175 },
    hazard: { radius: 62 },
    spiral: { arms: 4, speed: 160 },
  },

  signatures: {
    pots: thrownPots,
    centring,
    turnings,
    blast: kilnBlast,
    drips: glazeDrips,
    crazing,
    shatter,
    seam: goldenSeam,
  },

  look: {
    crest: 'none', pattern: 'rings', aura: 'dust', hands: 'ball',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: GOLD,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { aura: 'flame', pattern: 'smooth', hands: 'gauntlet' } },
    { movement: 'blink', gimmick: 'none', tint: 'gold', look: { aura: 'sparks', pattern: 'cracks', hands: 'orb', mouth: 'stitch' } },
  ],

  /**
   * The Unbroken's tells. On his head he wears a lidded celadon jar for a crown, tall and narrow,
   * with a gold knop; a potter's apron hangs from his waist, smeared with slip and a handprint.
   * Fired, the whole of him is glazed — a wet gloss over his shell, runs of glaze dripping from
   * the crown — and he smokes. In Kintsugi he is broken: zigzag seams of gold across his body,
   * the jar-crown split and mended, and three of his own sherds orbiting him, never quite fitting.
   */
  drawDecor(g, s) {
    glazePhase = s.phaseIdx;
    const R = s.radius;
    const fired = s.phaseIdx === 1;
    const kintsugi = s.hard && s.phaseIdx >= 2;
    // The apron: a trapezoid of stained canvas, a slip handprint on it.
    if (!fired) {
      g.fillStyle(0xb8a888, 0.95);
      g.fillPoints([{ x: s.x - R * 0.55, y: s.y + R * 0.25 }, { x: s.x + R * 0.55, y: s.y + R * 0.25 }, { x: s.x + R * 0.7, y: s.y + R * 1.05 }, { x: s.x - R * 0.7, y: s.y + R * 1.05 }], true, true);
      g.fillStyle(SLIP_DARK, 0.7); g.fillEllipse(s.x + R * 0.2, s.y + R * 0.6, R * 0.32, R * 0.3);
      for (let i = 0; i < 4; i++) g.fillEllipse(s.x + R * 0.08 + i * R * 0.09, s.y + R * 0.38, R * 0.07, R * 0.16);
      g.fillStyle(SLIP, 0.6); g.fillEllipse(s.x - R * 0.3, s.y + R * 0.85, R * 0.4, R * 0.12);
      g.lineStyle(2, 0x6a5a40, 1); g.lineBetween(s.x - R * 0.55, s.y + R * 0.25, s.x + R * 0.55, s.y + R * 0.25);
    }
    // The jar-crown.
    const cx = s.x, cy = s.y - R * 0.82;
    lathe(g, cx, cy, R * 1.1, (v) => R * (0.2 + Math.sin(v * Math.PI * 0.9) * 0.16 - (v > 0.85 ? (v - 0.85) * 0.6 : 0)), fired ? lit(GLAZE, 0.05) : GLAZE, { lit: GLAZE_LIT, dark: GLAZE_DARK, mouth: false });
    g.fillStyle(GLAZE_DARK, 1); g.fillEllipse(cx, cy - R * 1.1, R * 0.36, R * 0.12);
    g.fillStyle(GOLD, 1); g.fillCircle(cx, cy - R * 1.18, R * 0.08);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx - 1, cy - R * 1.2, R * 0.03);
    // Crackle in the celadon (crazing is beautiful on a pot — only on a pot).
    g.lineStyle(0.8, GLAZE_DARK, 0.6);
    for (let i = 0; i < 5; i++) g.lineBetween(cx - R * 0.15 + i * R * 0.07, cy - R * 0.2 - i * 3, cx - R * 0.1 + i * R * 0.07, cy - R * 0.5 - i * 2);
    if (fired) {
      // Gloss over the whole shell; glaze running off the crown; smoke.
      g.fillStyle(0xffffff, 0.22); g.fillEllipse(s.x - R * 0.35, s.y - R * 0.3, R * 0.5, R * 0.8);
      for (let i = 0; i < 5; i++) {
        const ph = ((s.t / 1100) + i / 5) % 1;
        const dx = (i - 2) * R * 0.32;
        g.fillStyle([CELADON, COBALT, OXBLOOD][i % 3], 0.9);
        g.fillRoundedRect(s.x + dx - 2.5, s.y - R * 0.9, 5, R * 0.4 + ph * R * 0.9, 2.5);
        g.fillCircle(s.x + dx, s.y - R * 0.5 + ph * R * 0.9, 3.5);
      }
      for (let i = 0; i < 3; i++) {
        const ph = ((s.t / 1600) + i / 3) % 1;
        g.fillStyle(SOOT, 0.3 * (1 - ph)); g.fillCircle(s.x + Math.sin(s.t / 500 + i) * 10, cy - R * 1.2 - ph * 50, 8 + ph * 16);
      }
      glow(g, s.x, s.y + R * 0.8, R * 1.1, FIRE, 0.035, 3);
    }
    if (kintsugi) {
      // Gold seams across the body.
      const seams = [
        [{ x: -0.9, y: -0.3 }, { x: -0.4, y: -0.1 }, { x: -0.2, y: 0.4 }, { x: 0.3, y: 0.55 }, { x: 0.8, y: 0.3 }],
        [{ x: -0.1, y: -0.95 }, { x: 0.05, y: -0.5 }, { x: 0.35, y: -0.2 }, { x: 0.9, y: -0.35 }],
        [{ x: -0.6, y: 0.7 }, { x: -0.3, y: 0.4 }],
      ];
      const pulse = 0.7 + Math.sin(s.t / 160) * 0.3;
      for (const seam of seams) {
        const pts = seam.map((p) => ({ x: s.x + p.x * R, y: s.y + p.y * R }));
        g.lineStyle(5, GOLD_DARK, 0.6); g.strokePoints(pts, false);
        g.lineStyle(3, GOLD, 1); g.strokePoints(pts, false);
        g.lineStyle(1, GOLD_LIT, pulse); g.strokePoints(pts, false);
      }
      // The crown split and mended.
      g.lineStyle(2, GOLD, 1); g.lineBetween(cx - R * 0.1, cy, cx + R * 0.05, cy - R * 0.5); g.lineBetween(cx + R * 0.05, cy - R * 0.5, cx - R * 0.05, cy - R * 1.0);
      // Three of his own sherds, orbiting, never quite fitting back.
      for (let i = 0; i < 3; i++) {
        const a = s.t / 700 + (i / 3) * Math.PI * 2;
        const ox = s.x + Math.cos(a) * R * 1.45, oy = s.y + Math.sin(a) * R * 0.9;
        const pts = [0, 1, 2, 3].map((k) => ({ x: ox + Math.cos(a * 2 + k * 1.7) * 8, y: oy + Math.sin(a * 2 + k * 1.7) * 6 }));
        g.fillStyle(GLAZE, 1); g.fillPoints(pts, true, true);
        g.lineStyle(1.5, GOLD, 1); g.strokePoints(pts, true, true);
      }
    }
    // The second hand: a trimming tool on the wheel (a loop of wire on a handle), or the gold brush.
    const hand = s.hands[1];
    if (hand) {
      if (kintsugi) {
        g.lineStyle(3, 0x553a24, 1); g.lineBetween(hand.x, hand.y, hand.x + 6, hand.y - 22);
        g.fillStyle(GOLD, 1); g.fillEllipse(hand.x + 7, hand.y - 26, 6, 10);
      } else {
        g.lineStyle(3, 0x553a24, 1); g.lineBetween(hand.x, hand.y + 4, hand.x + 4, hand.y - 14);
        g.lineStyle(1.5, IRON_LIT, 1); g.strokeEllipse(hand.x + 5, hand.y - 20, 10, 12);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, GOLD_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The floor of the great glost kiln, seen from inside: a round hearth of radial firebrick,
   * saggar bungs stacked round the curved wall, firemouths glowing through the wall's foot, the
   * crown of the kiln a dark ring overhead (under the HUD), and in the middle the Prince's wheel
   * pit with its ring of gilt — the only gold in the room until he breaks.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x61a2e);
    const cx = W / 2, cy = (H + 96) / 2;
    // The hearth: firebrick laid in rings.
    g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 0, W, H);
    for (let ring = 0; ring < 16; ring++) {
      const r0 = ring * 38, r1 = r0 + 38;
      const n = Math.max(6, Math.floor((r1 * Math.PI * 2) / 34));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 + (ring % 2) * (Math.PI / n), a1 = a0 + (Math.PI * 2) / n - 0.01;
        const c = mixC(BRICK, rng() < 0.5 ? BRICK_LIT : BRICK_DARK, rng() * 0.5);
        g.fillStyle(c, 1);
        g.fillPoints([
          { x: cx + Math.cos(a0) * (r0 + 1.5), y: cy + Math.sin(a0) * (r0 + 1.5) }, { x: cx + Math.cos(a1) * (r0 + 1.5), y: cy + Math.sin(a1) * (r0 + 1.5) },
          { x: cx + Math.cos(a1) * (r1 - 1.5), y: cy + Math.sin(a1) * (r1 - 1.5) }, { x: cx + Math.cos(a0) * (r1 - 1.5), y: cy + Math.sin(a0) * (r1 - 1.5) },
        ], true, true);
      }
    }
    // Soot and glaze spatter: generations of firings.
    for (let i = 0; i < 40; i++) { g.fillStyle(SOOT, 0.15 + rng() * 0.15); g.fillEllipse(rng() * W, 110 + rng() * (H - 110), 30 + rng() * 80, 14 + rng() * 30); }
    for (let i = 0; i < 70; i++) { g.fillStyle([CELADON, COBALT, OXBLOOD, GLAZE][i % 4], 0.35); g.fillCircle(rng() * W, 110 + rng() * (H - 110), 1.5 + rng() * 3); }
    // The kiln wall: dark curve top and sides, firemouths glowing at its foot.
    g.fillStyle(SOOT, 1); g.fillRect(0, 0, W, 100);
    for (let x = 0; x < W; x += 30) { g.fillStyle(BRICK_DARK, 1); g.fillRect(x + 1, 70, 28, 12); g.fillRect(x + 16, 84, 28, 12); }
    for (let k = 0; k < 6; k++) {
      const fx = 80 + k * ((W - 160) / 5);
      g.fillStyle(BRICK, 1); g.fillRect(fx - 22, 74, 44, 30);
      g.fillStyle(FIRE_DEEP, 1); g.fillRect(fx - 16, 80, 32, 22);
      g.fillStyle(FIRE, 1); g.fillRect(fx - 12, 86, 24, 16);
      g.fillStyle(FIRE_LIT, 0.8); g.fillRect(fx - 7, 92, 14, 10);
      glow(g, fx, 110, 50, FIRE, 0.035, 3);
    }
    g.fillStyle(0x000000, 0.25); g.fillRect(0, 100, W, 8);
    // Saggar bungs stacked round the walls — unfired soldiers' heads peeping from one.
    for (let y = 170; y < H - 30; y += 92) {
      saggarStack(g, 26, y, 4 + Math.floor(rng() * 3), 13);
      saggarStack(g, W - 26, y + 46, 4 + Math.floor(rng() * 3), 13);
    }
    // The wheel pit at the heart: a stone collar inlaid with gold, a crack mended in gold across it.
    g.fillStyle(dim(STRATA[3], 0.3), 1); g.fillCircle(cx, cy, 108);
    g.fillStyle(STRATA[2], 1); g.fillCircle(cx, cy, 100);
    for (let r = 30; r < 100; r += 14) { g.lineStyle(1.5, dim(STRATA[2], 0.2), 0.6); g.strokeCircle(cx, cy, r); }
    g.lineStyle(4, GOLD_DARK, 1); g.strokeCircle(cx, cy, 104);
    g.lineStyle(2, GOLD, 1); g.strokeCircle(cx, cy, 104);
    g.lineStyle(3, GOLD, 0.9);
    g.strokePoints([{ x: cx - 96, y: cy + 20 }, { x: cx - 50, y: cy + 4 }, { x: cx - 20, y: cy + 28 }, { x: cx + 30, y: cy + 10 }, { x: cx + 70, y: cy + 36 }, { x: cx + 98, y: cy + 24 }], false);
    // Sherds of the Ruck, swept to the edges.
    for (let i = 0; i < 60; i++) {
      const a = rng() * Math.PI * 2, d = 320 + rng() * 200;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
      if (y < 110 || y > H - 10 || x < 50 || x > W - 50) continue;
      sherd(g, x, y, 3 + rng() * 4, rng() < 0.7 ? TERRA : BISQUE, rng);
    }
  },
};
