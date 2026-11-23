import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { coin, coinFlat, coinStack, ingot, lotToken } from './art';
import {
  BAIZE_DARK, BRASS, BRASS_DARK, BULLION, BULLION_ACCENT, BULLION_DARK, BULLION_LIT, CARD_RED, GOLD, GOLD_DARK,
  GOLD_DEEP, GOLD_LIT, GOLD_PALE, INK_GREEN, LACQUER, LAMP_GLOW, LAMP_GREEN, MARBLE, MARBLE_DARK,
  MARBLE_VEIN, MOLTEN, MOLTEN_LIT, PAPER, PAPER_DARK, PAVE_BLACK, PAVE_RED,
} from './palette';
import { clamp, dist, wrapAngle } from './util';

/**
 * Prince Bullion, Worth His Weight — the Croupier-King's lucky child, governor of the Treasury.
 *
 * Bullion's Lot has never been drawn, and he has never once paid for anything. He has himself
 * weighed in gold every morning and is pleased, every morning, to find himself worth exactly
 * that. He fights the way money moves:
 *
 * • **Coin Toss** (orbiting): he flips sovereigns high over the floor, their shadows swelling
 *   where they will land; each comes down heads (a burst) or tails (a puddle of molten gold that
 *   lingers) — the face shows only as it lands. And he rolls coins on their edges across the room
 *   like runaway wheels, bouncing off the walls.
 * • **Gold Standard** (stalking, gilded): he pours gilt over himself. The plate is on his *front*
 *   and turns slowly to follow you — blows from in front clang off it, blows from behind flake it
 *   away. He swings a gold bar in a great arc before him and slams it down at the end.
 * • **Market Crash** (hard, blinking): ingots fall from the ceiling along a jagged market chart
 *   that climbs across the room and then crashes; and ticker tape unspools across the floor and
 *   snaps taut.
 */

const TOP = 96;

/** The Gold Standard's plate, shared by its signature and the Prince's decor. */
interface Flake { x: number; y: number; vx: number; vy: number; at: number; a: number }
const gilt = { on: false, a: 0, plates: 0, max: 8, flakes: [] as Flake[], clangAt: 0 };
/** How wide the plate wraps round his front (half-angle, radians). */
const PLATE_HALF = 1.25;

// ── Signature: Coin Toss ─────────────────────────────────────────────
// Five sovereigns flipped high, landing round you one after another. A shadow swells where each
// will come down. Heads: a burst. Tails: molten gold, a puddle that burns for a while.

interface Tossed { x: number; y: number; launchAt: number; landAt: number; heads: boolean; dealt: boolean; fromX: number; fromY: number }

const toss = (tk: BossToolkit): SignatureMove => {
  let coins: Tossed[] = [];
  return {
    durationMs: 2300,
    windupMs: 600,
    gesture: 'raise',
    tell: 'HEADS OR TAILS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      coins = [];
      const spots: { x: number; y: number }[] = [{ x: p.x, y: p.y }];
      for (let tries = 0; spots.length < n && tries < 60; tries++) {
        const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170;
        const x = tk.clampX(p.x + Math.cos(a) * d, 60), y = tk.clampY(p.y + Math.sin(a) * d * 0.85, 60);
        if (spots.every((s) => dist(s.x, s.y, x, y) > 100)) spots.push({ x, y });
      }
      spots.forEach((s, i) => {
        const launchAt = time + i * 170;
        coins.push({ x: s.x, y: s.y, launchAt, landAt: launchAt + tk.warn(1350), heads: Math.random() < 0.5, dealt: false, fromX: tk.bossX, fromY: tk.bossY - 40 });
      });
      tk.sfx('dice');
    },
    update(time) {
      for (const c of coins) {
        if (c.dealt || time < c.landAt) continue;
        c.dealt = true;
        if (c.heads) {
          tk.explode(c.x, c.y, 66, 12, GOLD_LIT);
          tk.sfx('jackpot');
        } else {
          tk.spawnPool({ x: c.x, y: c.y, radius: 54, lifeMs: 4200, damage: 3, tickMs: 550 });
          tk.sfx('sizzle');
        }
      }
      coins = coins.filter((c) => !c.dealt || time < c.landAt + 600);
    },
    drawGround(g, time) {
      for (const c of coins) {
        if (c.dealt) {
          const k = clamp((time - c.landAt) / 600, 0, 1);
          if (c.heads) { g.lineStyle(4 * (1 - k), GOLD_PALE, 1 - k); g.strokeCircle(c.x, c.y, 30 + k * 50); }
          else { g.fillStyle(MOLTEN, 0.5 * (1 - k)); g.fillCircle(c.x, c.y, 54); }
          coinFlat(g, c.x, c.y, 10 * (1 - k * 0.3), 'gold');
          continue;
        }
        if (time < c.launchAt) continue;
        const k = clamp((time - c.launchAt) / Math.max(1, c.landAt - c.launchAt), 0, 1);
        // The shadow swells as it falls; a gold ring marks the reach.
        g.fillStyle(0x000000, 0.12 + k * 0.32); g.fillEllipse(c.x, c.y, 20 + k * 90, 10 + k * 46);
        g.lineStyle(2, GOLD, 0.25 + k * 0.6); g.strokeCircle(c.x, c.y, 62);
        // The face shows at the last moment: a red rim for tails (the puddle), white for heads.
        if (k > 0.75) { g.lineStyle(3, c.heads ? GOLD_PALE : MOLTEN, (k - 0.75) * 4); g.strokeCircle(c.x, c.y, 54); }
      }
    },
    drawAir(g, time) {
      for (const c of coins) {
        if (c.dealt || time < c.launchAt) continue;
        const k = clamp((time - c.launchAt) / Math.max(1, c.landAt - c.launchAt), 0, 1);
        const x = c.fromX + (c.x - c.fromX) * k, y = c.fromY + (c.y - c.fromY) * k - Math.sin(k * Math.PI) * 260;
        // Spinning in the air; in the last quarter it slows and settles on its face.
        const spin = k < 0.75 ? Math.cos(time / 35 + c.x) : Math.cos((1 - (k - 0.75) * 4) * Math.PI * 0.5) * (c.heads ? 1 : -1);
        const face = k < 0.75 ? (spin > 0 ? 'head' : 'tail') : c.heads ? 'head' : 'tail';
        coin(g, x, y, 13, 'gold', spin, face);
        if (k > 0.75) glow(g, x, y, 22, c.heads ? GOLD_PALE : MOLTEN, 0.06, 2);
      }
    },
    onPhaseEnd() { coins = []; },
  };
};

// ── Signature: Spending Spree ────────────────────────────────────────
// He bowls three sovereigns along the floor on their edges. Their lines show first; then they
// roll fast, wobbling, rebounding off the walls. They run you down if you stand in the way.

interface Roller { x: number; y: number; vx: number; vy: number; aimAt: number; goAt: number; dieAt: number; bounces: number; hitAt: number; phase: number }

const spree = (tk: BossToolkit): SignatureMove => {
  let rollers: Roller[] = [];
  const R = 24;
  const SPEED = 300;
  return {
    durationMs: 1600,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'SPENDING SPREE',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const base = tk.angleToPlayer();
      rollers = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.42;
        rollers.push({
          x: tk.bossX, y: tk.bossY + 10, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED,
          aimAt: time, goAt: time + tk.warn(700) + i * 140, dieAt: time + 5200, bounces: 0, hitAt: 0, phase: Math.random() * 6,
        });
      }
      tk.sfx('money');
    },
    update(time, dt) {
      const p = tk.player;
      for (const r of rollers) {
        if (time < r.goAt) continue;
        r.x += r.vx * dt; r.y += r.vy * dt;
        if (r.x < 40 || r.x > tk.W - 40) { r.vx = -r.vx; r.x = clamp(r.x, 40, tk.W - 40); r.bounces++; tk.sfx('clang'); }
        if (r.y < TOP + 30 || r.y > tk.H - 30) { r.vy = -r.vy; r.y = clamp(r.y, TOP + 30, tk.H - 30); r.bounces++; tk.sfx('clang'); }
        if (p.active && p.hp > 0 && time - r.hitAt > 800 && dist(r.x, r.y, p.x, p.y) < R + 18) {
          r.hitAt = time;
          tk.hitPlayer(11, p.x, p.y);
          tk.slowPlayer(0.6, 600);
        }
        if (r.bounces > 3) r.dieAt = Math.min(r.dieAt, time + 200);
      }
      rollers = rollers.filter((r) => time < r.dieAt);
    },
    drawGround(g, time) {
      for (const r of rollers) {
        if (time >= r.goAt) {
          // A gold scuff along the floor behind it.
          const a = Math.atan2(r.vy, r.vx);
          g.lineStyle(6, GOLD, 0.18); g.lineBetween(r.x, r.y + 18, r.x - Math.cos(a) * 60, r.y + 18 - Math.sin(a) * 60);
          g.fillStyle(0x000000, 0.25); g.fillEllipse(r.x, r.y + 20, 30, 9);
          continue;
        }
        const k = clamp((time - r.aimAt) / Math.max(1, r.goAt - r.aimAt), 0, 1);
        const a = Math.atan2(r.vy, r.vx);
        g.lineStyle(3, GOLD, 0.2 + k * 0.5); g.lineBetween(r.x, r.y + 18, r.x + Math.cos(a) * 900, r.y + 18 + Math.sin(a) * 900);
        for (let d = 40; d < 600; d += 60) { g.fillStyle(GOLD_LIT, (0.2 + k * 0.5) * (1 - d / 600)); g.fillCircle(r.x + Math.cos(a) * d, r.y + 18 + Math.sin(a) * d, 3); }
      }
    },
    drawAir(g, time) {
      for (const r of rollers) {
        // A coin on its edge: tall and thin, its milled rim streaming as it turns, wobbling.
        const wob = Math.sin(time / 90 + r.phase) * 0.18;
        const turn = time >= r.goAt ? time / 25 : 0;
        const w = 9 + Math.abs(Math.sin(wob * 3)) * 6;
        g.fillStyle(GOLD_DEEP, 1); g.fillEllipse(r.x + 2, r.y, w + 3, R * 2);
        g.fillStyle(GOLD_DARK, 1); g.fillEllipse(r.x, r.y, w, R * 2);
        for (let i = 0; i < 8; i++) {
          const yy = r.y - R + ((i * 6 + turn) % (R * 2));
          g.fillStyle(GOLD_LIT, 0.7); g.fillRect(r.x - w / 2 + 1, yy, w - 2, 1.5);
        }
        g.fillStyle(GOLD, 1); g.fillEllipse(r.x - w * 0.6 + wob * 20, r.y, w * 0.9, R * 1.9);
        g.fillStyle(GOLD_PALE, 0.6); g.fillEllipse(r.x - w * 0.6 + wob * 20, r.y - R * 0.4, w * 0.3, R * 0.6);
      }
    },
    onPhaseEnd() { rollers = []; },
  };
};

// ── Signature: Gold Standard ─────────────────────────────────────────
// He pours gilt over himself. The plate armours his FRONT and turns slowly to follow you; blows
// from in front clang off, blows from behind flake it away. Strip every plate and he is bare
// until he gilds again. The pour throws off a ring of molten drops.

const goldStandard = (tk: BossToolkit): SignatureMove => {
  gilt.on = false; gilt.plates = 0; gilt.flakes = []; gilt.a = 0;
  let pouredAt = -9999;
  const behind = () => Math.abs(wrapAngle(Math.atan2(tk.player.y - tk.bossY, tk.player.x - tk.bossX) - gilt.a)) > PLATE_HALF;
  return {
    durationMs: 1500,
    windupMs: 750,
    hold: 'brace',
    tell: 'THE GOLD STANDARD',
    cast(time) {
      gilt.on = true;
      gilt.max = tk.hard ? 10 : 8;
      gilt.plates = gilt.max;
      gilt.a = tk.angleToPlayer();
      pouredAt = time;
      tk.sfx('hammer-forge');
      const n = tk.hard ? 14 : 11;
      const off = Math.random();
      for (let i = 0; i < n; i++) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: ((i + off) / n) * Math.PI * 2, speed: 150, damage: 8, r: 6, color: MOLTEN });
    },
    update(time, dt) {
      // The plate turns toward you — slowly. Circle him.
      if (gilt.on) {
        const want = tk.angleToPlayer();
        const d = wrapAngle(want - gilt.a);
        const rate = tk.hard ? 1.35 : 1.05;
        gilt.a += clamp(d, -rate * dt, rate * dt);
      }
      for (const f of gilt.flakes) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * dt; }
      gilt.flakes = gilt.flakes.filter((f) => time - f.at < 900);
    },
    takenMult: () => (!gilt.on ? 1 : behind() ? 1.3 : 0.22),
    onBossHurt() {
      if (!gilt.on) return;
      const now = tk.now;
      if (!behind()) {
        if (now - gilt.clangAt > 500) { gilt.clangAt = now; tk.sfx('shield-block'); }
        return;
      }
      gilt.plates--;
      const back = gilt.a + Math.PI + (Math.random() - 0.5) * 1.2;
      for (let i = 0; i < 5; i++) {
        const a = back + (Math.random() - 0.5) * 1.4;
        gilt.flakes.push({ x: tk.bossX + Math.cos(back) * 30, y: tk.bossY + Math.sin(back) * 30, vx: Math.cos(a) * (80 + Math.random() * 90), vy: Math.sin(a) * 90 - 120, at: now, a: Math.random() * 6 });
      }
      tk.sfx('crystal-shatter');
      if (gilt.plates <= 0) {
        gilt.on = false;
        tk.sfx('shield-break');
        // A little of the stripped gilt is left on the floor for you.
        tk.spawnHealOrb(tk.bossX + Math.cos(back) * 70, tk.bossY + Math.sin(back) * 70, 10);
      }
    },
    drawGround(g, time) {
      if (!gilt.on) return;
      // The plate's facing, as a gold arc on the floor before him — you can see where "behind" is.
      g.lineStyle(5, GOLD, 0.35);
      g.beginPath(); g.arc(tk.bossX, tk.bossY + 10, 70, gilt.a - PLATE_HALF, gilt.a + PLATE_HALF, false); g.strokePath();
      g.lineStyle(2, GOLD_PALE, 0.2 + Math.sin(time / 200) * 0.1);
      g.beginPath(); g.arc(tk.bossX, tk.bossY + 10, 78, gilt.a + PLATE_HALF, gilt.a - PLATE_HALF + Math.PI * 2, false); g.strokePath();
      if (time - pouredAt < 700) { const k = (time - pouredAt) / 700; g.fillStyle(MOLTEN, 0.35 * (1 - k)); g.fillCircle(tk.bossX, tk.bossY + 10, 40 + k * 60); }
    },
    drawAir(g, time) {
      for (const f of gilt.flakes) {
        const k = (time - f.at) / 900;
        g.fillStyle(k < 0.4 ? GOLD_PALE : GOLD, 1 - k);
        g.fillTriangle(f.x + Math.cos(f.a + k * 8) * 5, f.y + Math.sin(f.a + k * 8) * 5, f.x + Math.cos(f.a + 2.1 + k * 8) * 5, f.y + Math.sin(f.a + 2.1 + k * 8) * 5, f.x + Math.cos(f.a + 4.2 + k * 8) * 5, f.y + Math.sin(f.a + 4.2 + k * 8) * 5);
      }
      if (time - pouredAt < 800) {
        // The pour: gilt running down from a ladle over his head.
        const k = (time - pouredAt) / 800;
        g.fillStyle(MOLTEN_LIT, 1 - k); g.fillRect(tk.bossX - 4, tk.bossY - 90, 8, 60 * (1 - k * 0.5));
        g.fillStyle(BRASS_DARK, 1 - k); g.fillEllipse(tk.bossX + 6, tk.bossY - 96, 30, 12);
      }
    },
    onPhaseEnd() { gilt.on = false; gilt.flakes = []; },
  };
};

// ── Signature: Bar Swing ─────────────────────────────────────────────
// He hefts a gold bar and swings it in a great arc before him — the arc is drawn first — then
// brings it down at the end of the swing. Stand behind him.

const barSwing = (tk: BossToolkit): SignatureMove => {
  let swing: { a0: number; a1: number; startAt: number; endAt: number; slamAt: number; slamX: number; slamY: number; ox: number; oy: number; dealt: boolean } | null = null;
  const LEN = 230;
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'sweep',
    hold: 'charge',
    locksBody: true,
    tell: 'BAR SWING',
    cast(time) {
      const a = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const a0 = a - dir * 1.3, a1 = a + dir * 1.3;
      const warn = tk.warn(850), travel = 560;
      tk.spawnSweep({ ox: tk.bossX, oy: tk.bossY, a0, a1, warnMs: 850, travelMs: travel, halfW: 26, damage: 14, length: LEN });
      const slamX = tk.clampX(tk.bossX + Math.cos(a1) * 170), slamY = tk.clampY(tk.bossY + Math.sin(a1) * 170);
      tk.spawnZone({ x: slamX, y: slamY, radius: 72, warnMs: 850 + travel + 300, damage: 12 });
      swing = { a0, a1, startAt: time + warn, endAt: time + warn + travel, slamAt: time + tk.warn(850 + travel + 300), slamX, slamY, ox: tk.bossX, oy: tk.bossY, dealt: false };
      // The plate swings round with the bar.
      if (gilt.on) gilt.a = a;
      tk.sfx('whoosh');
    },
    update(time) {
      if (!swing) return;
      if (!swing.dealt && time >= swing.slamAt) { swing.dealt = true; tk.sfx('gravity-slam'); }
      if (time > swing.slamAt + 600) swing = null;
    },
    drawAir(g, time) {
      if (!swing) return;
      let a: number;
      let len = LEN;
      if (time < swing.startAt) a = swing.a0 - (swing.a1 - swing.a0) * 0.08 * Math.sin(time / 60);
      else if (time < swing.endAt) a = swing.a0 + (swing.a1 - swing.a0) * ((time - swing.startAt) / Math.max(1, swing.endAt - swing.startAt));
      else { a = swing.a1; len = 170; }
      // The bar: a long gold ingot on a short haft from his hand, motion-blurred mid-swing.
      const hx = swing.ox + Math.cos(a) * 30, hy = swing.oy + Math.sin(a) * 30;
      const ex = swing.ox + Math.cos(a) * len, ey = swing.oy + Math.sin(a) * len;
      if (time >= swing.startAt && time < swing.endAt) {
        for (let k = 1; k <= 3; k++) {
          const b = a - (swing.a1 - swing.a0) * 0.06 * k;
          g.lineStyle(18, GOLD, 0.15 / k); g.lineBetween(hx, hy, swing.ox + Math.cos(b) * len, swing.oy + Math.sin(b) * len);
        }
      }
      const lifted = time >= swing.endAt && time < swing.slamAt ? clamp((time - swing.endAt) / Math.max(1, swing.slamAt - swing.endAt), 0, 1) : 0;
      const lift = Math.sin(lifted * Math.PI) * 50;
      g.lineStyle(20, GOLD_DEEP, 1); g.lineBetween(hx, hy - lift * 0.3, ex, ey - lift);
      g.lineStyle(15, GOLD_DARK, 1); g.lineBetween(hx, hy - 2 - lift * 0.3, ex, ey - 2 - lift);
      g.lineStyle(7, GOLD, 1); g.lineBetween(hx, hy - 5 - lift * 0.3, ex, ey - 5 - lift);
      g.lineStyle(2, GOLD_PALE, 0.8); g.lineBetween(hx, hy - 7 - lift * 0.3, ex, ey - 7 - lift);
      // The assay stamp at its head.
      g.lineStyle(1.5, GOLD_DEEP, 1); g.strokeCircle(ex - Math.cos(a) * 16, ey - lift - Math.sin(a) * 16 - 4, 4);
      if (swing.dealt && time - swing.slamAt < 500) {
        const k = (time - swing.slamAt) / 500;
        g.lineStyle(5 * (1 - k), GOLD_PALE, 1 - k); g.strokeCircle(swing.slamX, swing.slamY, 40 + k * 60);
        for (let i = 0; i < 8; i++) { const b = (i / 8) * Math.PI * 2; coinFlat(g, swing.slamX + Math.cos(b) * (20 + k * 60), swing.slamY + Math.sin(b) * (14 + k * 40), 4 * (1 - k)); }
      }
    },
    onPhaseEnd() { swing = null; },
  };
};

// ── Signature: Market Crash ──────────────────────────────────────────
// A market chart is traced across the floor, left to right: it climbs, and climbs, and then it
// crashes. Ingots fall from the ceiling on every point of it in turn — and when it crashes, the
// whole bottom of the room goes down with it.

interface ChartPt { x: number; y: number; fallAt: number; big: boolean; dealt: boolean }

const marketCrash = (tk: BossToolkit): SignatureMove => {
  let chart: ChartPt[] = [];
  let drawnAt = 0;
  let crashY = 0;
  let crashAt = 0;
  let crashDealt = true;
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'point',
    tell: 'MARKET CRASH',
    cast(time) {
      const N = 11;
      const rising = 8;
      chart = [];
      drawnAt = time;
      let y = tk.H - 90 - Math.random() * 40;
      const ltr = Math.random() < 0.5;
      for (let i = 0; i < N; i++) {
        const k = ltr ? i : N - 1 - i;
        const x = 70 + (k * (tk.W - 140)) / (N - 1);
        if (i > 0 && i < rising) y = clamp(y - (20 + Math.random() * 50) + (i % 3 === 2 ? 40 : 0), TOP + 70, tk.H - 70);
        if (i >= rising) y = clamp(y + 90 + Math.random() * 40, TOP + 70, tk.H - 60);
        const big = i >= rising;
        const fallAt = time + tk.warn(1000) + i * 150;
        chart.push({ x, y, fallAt, big, dealt: false });
        tk.spawnZone({ x, y, radius: big ? 66 : 44, warnMs: 1000 + i * 150 / Math.max(0.01, tk.telegraphScale), damage: big ? 13 : 11 });
      }
      // The crash takes the floor out from under the bottom of the chart.
      crashY = tk.H - 64;
      crashAt = time + tk.warn(1000 + N * 150 + 400);
      crashDealt = false;
      tk.spawnLane({ x: tk.W / 2, y: crashY, angle: 0, halfW: 40, warnMs: 1000 + N * 150 + 400, damage: 12 });
      tk.sfx('beam-charge');
    },
    update(time) {
      for (const c of chart) if (!c.dealt && time >= c.fallAt) { c.dealt = true; tk.sfx(c.big ? 'hammer-forge' : 'anvil'); }
      if (!crashDealt && time >= crashAt) { crashDealt = true; tk.sfx('quake'); }
      if (chart.length && time > crashAt + 900) chart = [];
    },
    drawGround(g, time) {
      if (!chart.length) return;
      // The chart, traced in green ink while it climbs and red when it falls, growing point to point.
      const shown = clamp((time - drawnAt) / 700, 0, 1) * (chart.length - 1);
      for (let i = 0; i < chart.length - 1; i++) {
        if (i > shown) break;
        const a = chart[i], b = chart[i + 1];
        const u = clamp(shown - i, 0, 1);
        const up = b.y < a.y;
        g.lineStyle(9, 0x000000, 0.25); g.lineBetween(a.x, a.y + 4, a.x + (b.x - a.x) * u, a.y + 4 + (b.y - a.y) * u);
        g.lineStyle(5, up ? LAMP_GREEN : CARD_RED, 0.85); g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
      }
      for (const c of chart) { g.fillStyle(c.big ? CARD_RED : LAMP_GLOW, 0.9); g.fillCircle(c.x, c.y, 4); }
      // The crash band.
      if (!crashDealt) {
        const k = clamp(1 - (crashAt - time) / 1600, 0, 1);
        for (let x = 0; x < tk.W; x += 40) { g.fillStyle(CARD_RED, 0.08 + k * 0.12); g.fillTriangle(x, crashY - 40, x + 20, crashY - 40 + 16, x + 40, crashY - 40); }
      } else if (time - crashAt < 700) {
        const k = (time - crashAt) / 700;
        g.fillStyle(0x000000, 0.4 * (1 - k)); g.fillRect(0, crashY - 40, tk.W, 80);
      }
    },
    drawAir(g, time) {
      for (const c of chart) {
        const lead = 520;
        if (time < c.fallAt - lead) continue;
        if (!c.dealt) {
          const k = clamp(1 - (c.fallAt - time) / lead, 0, 1);
          // Ingots dropping, end over end.
          const yy = c.y - (1 - k * k) * 360;
          ingot(g, c.x, yy, c.big ? 1.5 : 1.1);
          continue;
        }
        const k = clamp((time - c.fallAt) / 700, 0, 1);
        if (k >= 1) continue;
        ingot(g, c.x, c.y + 6, c.big ? 1.5 : 1.1, 0.1 * (1 - k));
        g.lineStyle(3 * (1 - k), GOLD_PALE, 1 - k); g.strokeCircle(c.x, c.y, (c.big ? 50 : 30) + k * 40);
      }
    },
    onPhaseEnd() { chart = []; crashDealt = true; },
  };
};

// ── Signature: Ticker Tape ───────────────────────────────────────────
// Three ribbons of ticker tape unspool across the room, one through you, printing prices as they
// go; when each reaches the far wall it snaps taut and cuts.

interface Tape { y: number; fromLeft: boolean; at: number; fireAt: number; fired: boolean; seed: number }

const ticker = (tk: BossToolkit): SignatureMove => {
  let tapes: Tape[] = [];
  return {
    durationMs: 2400,
    windupMs: 550,
    gesture: 'clap',
    tell: 'TICKER TAPE',
    cast(time) {
      const p = tk.player;
      tapes = [];
      const ys = [p.y, p.y - 150, p.y + 150].map((y) => clamp(y, TOP + 40, tk.H - 40));
      ys.forEach((y, i) => {
        const warn = 1100 + i * 300;
        tapes.push({ y, fromLeft: (i + (Math.random() < 0.5 ? 0 : 1)) % 2 === 0, at: time, fireAt: time + tk.warn(warn), fired: false, seed: Math.random() * 10 });
        tk.spawnLane({ x: tk.W / 2, y, angle: 0, halfW: 20, warnMs: warn, damage: 12 });
      });
      tk.sfx('reload');
    },
    update(time) {
      for (const t of tapes) if (!t.fired && time >= t.fireAt) { t.fired = true; tk.sfx('slash'); }
      tapes = tapes.filter((t) => time < t.fireAt + 600);
    },
    drawAir(g, time) {
      for (const t of tapes) {
        const k = clamp((time - t.at) / Math.max(1, t.fireAt - t.at), 0, 1);
        const len = tk.W * k;
        const x0 = t.fromLeft ? 0 : tk.W - len;
        const taut = t.fired ? clamp(1 - (time - t.fireAt) / 600, 0, 1) : 0;
        // The tape: a paper ribbon, curled while it unspools, a hard bright line when it snaps.
        g.fillStyle(PAPER_DARK, 0.9 - taut * 0.4); g.fillRect(x0, t.y - 7, len, 14);
        g.fillStyle(PAPER, 0.95 - taut * 0.4); g.fillRect(x0, t.y - 6, len, 10);
        for (let x = 0; x < len; x += 18) {
          const px = t.fromLeft ? x0 + x : x0 + len - x;
          const h = 2 + ((Math.floor(x / 18) * 7 + t.seed * 3) % 5);
          g.fillStyle(((Math.floor(x / 18) + Math.floor(t.seed)) % 3) ? INK_GREEN : CARD_RED, 0.85);
          g.fillRect(px - 5, t.y - h / 2, 2, h); g.fillRect(px - 1, t.y - 1, 5, 2);
        }
        // The spool at its leading end.
        const sx = t.fromLeft ? x0 + len : x0;
        if (!t.fired) {
          g.fillStyle(BRASS_DARK, 1); g.fillCircle(sx, t.y, 9);
          g.fillStyle(BRASS, 1); g.fillCircle(sx, t.y, 6);
          g.lineStyle(1.5, PAPER, 1); g.strokeCircle(sx, t.y, 4 + Math.sin(time / 40) * 1);
        }
        if (taut > 0) { g.lineStyle(4 * taut, GOLD_PALE, taut); g.lineBetween(0, t.y, tk.W, t.y); }
      }
    },
    onPhaseEnd() { tapes = []; },
  };
};

export const BULLION_BOSS: WorldBossDef = {
  worldId: 'isle:bullion',
  name: 'Prince Bullion',
  title: 'Worth His Weight',
  color: BULLION,
  colorLit: BULLION_LIT,
  colorDark: BULLION_DARK,
  accent: BULLION_ACCENT,
  // Tier 2 of the eighth isle.
  damageMult: 1.3,

  intro: [
    'You\'ll want an appointment. Appointments cost. Ah — you\'ve brought nothing. Then you\'ll pay in kind.',
    'I am worth exactly my weight in gold. I checked this morning. Shall we see what you weigh?',
  ],
  banter: [
    'Heads, I win. Tails, you lose. It\'s on every coin, darling. Read it.',
    'Father says chance is the only fair ruler. I\'ve never once been drawn. Isn\'t chance kind?',
    'Everything has a price. Yours is coming down.',
    'I don\'t pay. I\'m paid. It\'s a very different posture — straighter in the back.',
    'Short weight! Short weight! Somebody fetch the clerk.',
  ],
  defeatLine: 'THE GILT COMES OFF',
  resumeLine: 'Back for a re-draw? Everyone comes back. Nobody wins, but everyone comes back.',

  phases: [
    {
      name: 'Coin Toss',
      line: 'Call it in the air. Go on. It doesn\'t matter what you call.',
      hp: 530,
      cycle: [
        'sig:toss', 'volley', 'sig:spree', 'radial', 'sig:toss',
        'hazard', 'sig:spree', 'homing', 'sig:toss', 'sig:spree',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Gold Standard',
      line: 'Very well. I shall be what I\'m worth. Mind — it\'s all on the front.',
      hp: 610,
      cycle: [
        'sig:gild', 'sig:bar', 'lanes', 'sig:bar', 'sig:toss',
        'barrage', 'sig:gild', 'sig:bar', 'sig:spree', 'sig:bar',
      ],
      harass: ['h-flak', 'h-rune', 'h-lane'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE MARKET ALWAYS CRASHES',
    extraPhase: {
      name: 'Market Crash',
      line: 'Up, and up, and up — you never see the top. Nobody ever sees the top.',
      hp: 450,
      cycle: [
        'sig:crash', 'sig:ticker', 'sig:spree', 'sweep',
        'sig:crash', 'sig:toss', 'sig:ticker', 'spiral',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 900,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.5 },
    radial: { count: 16, speed: 185 },
    hazard: { radius: 64 },
    spiral: { arms: 4, speed: 175 },
  },

  signatures: {
    toss,
    spree,
    gild: goldStandard,
    bar: barSwing,
    crash: marketCrash,
    ticker,
  },

  look: {
    crest: 'stack', pattern: 'rings', aura: 'coins', hands: 'ball',
    torsoR: 35, mouth: 'grin', eyes: 2, eyeColor: GOLD_PALE,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'gold', look: { hands: 'gauntlet', pattern: 'plates', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'blood', look: { aura: 'sparks', pattern: 'cracks', mouth: 'grate', hands: 'claw' } },
  ],

  /**
   * Worth His Weight's tells. A milled ruff like the edge of a coin round his neck, a gold monocle
   * on a chain, and on his chest his Lot — gilt, polished, never drawn — on a thick gold chain. In
   * Coin Toss a sovereign spins on his raised thumb. In Gold Standard a crescent of gilt plate
   * hangs on his FRONT, following you round, thinning as you flake it; he hefts a bar. In Market
   * Crash the gilt is cracked, a red chart-arrow plunges across his chest, and loose ingots orbit
   * him, falling one by one as he loses health.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const phase = s.phaseIdx;
    const crash = s.hard && phase >= 2;
    // The milled ruff.
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.15 + (i / 21) * Math.PI * 0.7;
      const x = s.x + Math.cos(a) * R * 0.92, y = s.y + Math.sin(a) * R * 0.92;
      g.fillStyle(i % 2 ? GOLD : GOLD_DARK, 1); g.fillRect(x - 2, y - 4, 4, 8);
    }
    // The chain and his Lot.
    g.lineStyle(3, GOLD_DARK, 1);
    g.beginPath(); g.arc(s.x, s.y - R * 0.1, R * 0.62, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
    g.lineStyle(1.5, GOLD_LIT, 1);
    g.beginPath(); g.arc(s.x, s.y - R * 0.12, R * 0.62, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
    lotToken(g, s.x, s.y + R * 0.56, 7, 1);
    glow(g, s.x, s.y + R * 0.56, 12, GOLD_LIT, 0.05 + s.castGlow * 0.05, 2);
    // The monocle over his right eye.
    const ex = s.x + Math.cos(s.facing) * R * 0.18 + R * 0.22, ey = s.y - R * 0.22;
    g.lineStyle(2, GOLD_LIT, 1); g.strokeCircle(ex, ey, R * 0.2);
    g.fillStyle(0xffffff, 0.18); g.fillCircle(ex, ey, R * 0.18);
    g.lineStyle(1, GOLD_DARK, 1); g.lineBetween(ex + R * 0.18, ey + R * 0.1, s.x + R * 0.5, s.y + R * 0.4);

    if (phase === 0 && !crash) {
      // A sovereign spinning on his thumb.
      const h = s.hands[1];
      if (h) {
        const y = h.y - 22 - Math.abs(Math.sin(s.t / 300)) * 18;
        coin(g, h.x, y, 8, 'gold', Math.cos(s.t / 40), Math.cos(s.t / 40) > 0 ? 'head' : 'tail');
      }
    } else if (phase === 1) {
      // The gilt plate on his front: a crescent of overlapping gold scales, thinning as it flakes.
      if (gilt.on) {
        const cover = gilt.plates / Math.max(1, gilt.max);
        const n = 9;
        const shown = Math.max(1, Math.round(n * cover));
        for (let i = 0; i < n; i++) {
          const a = gilt.a - PLATE_HALF + (i / (n - 1)) * PLATE_HALF * 2;
          const idx = Math.abs(i - (n - 1) / 2);
          if (idx > shown / 2 + 0.01) continue;
          const px = s.x + Math.cos(a) * R * 1.12, py = s.y + Math.sin(a) * R * 1.12;
          g.fillStyle(GOLD_DEEP, 1); g.fillEllipse(px + 1, py + 2, R * 0.62, R * 0.5);
          g.fillStyle(GOLD, 1); g.fillEllipse(px, py, R * 0.58, R * 0.46);
          g.fillStyle(GOLD_PALE, 0.55); g.fillEllipse(px - 3, py - 4, R * 0.2, R * 0.12);
        }
        if (s.t - gilt.clangAt < 200) { g.lineStyle(3, GOLD_PALE, 1 - (s.t - gilt.clangAt) / 200); g.beginPath(); g.arc(s.x, s.y, R * 1.4, gilt.a - PLATE_HALF, gilt.a + PLATE_HALF, false); g.strokePath(); }
      } else {
        // Bare: gilt drips and bald patches where the plate came off.
        for (let i = 0; i < 4; i++) { g.fillStyle(GOLD, 0.7); g.fillEllipse(s.x - R * 0.5 + i * R * 0.33, s.y + R * 0.3 + ((s.t / 30 + i * 13) % 20), 4, 7); }
      }
      // The bar on his shoulder.
      const h = s.hands[0];
      if (h) {
        g.lineStyle(10, GOLD_DARK, 1); g.lineBetween(h.x, h.y, h.x - 10, h.y - 38);
        g.lineStyle(5, GOLD, 1); g.lineBetween(h.x - 1, h.y - 2, h.x - 11, h.y - 38);
      }
    } else if (crash) {
      // Cracked gilt, the chart arrow, and the ingots he still holds orbiting him.
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + 0.4;
        g.lineStyle(1.5, GOLD_DEEP, 0.9);
        g.lineBetween(s.x + Math.cos(a) * R * 0.2, s.y + Math.sin(a) * R * 0.2, s.x + Math.cos(a) * R * 0.85, s.y + Math.sin(a) * R * 0.85);
      }
      const pts = [{ x: -0.7, y: 0.1 }, { x: -0.35, y: -0.25 }, { x: -0.1, y: -0.05 }, { x: 0.15, y: -0.4 }, { x: 0.5, y: 0.45 }];
      for (let i = 0; i < pts.length - 1; i++) {
        g.lineStyle(4, i < 3 ? LAMP_GREEN : CARD_RED, 1);
        g.lineBetween(s.x + pts[i].x * R, s.y + pts[i].y * R, s.x + pts[i + 1].x * R, s.y + pts[i + 1].y * R);
      }
      g.fillStyle(CARD_RED, 1); g.fillTriangle(s.x + 0.5 * R, s.y + 0.55 * R, s.x + 0.38 * R, s.y + 0.3 * R, s.x + 0.62 * R, s.y + 0.35 * R);
      const n = Math.max(1, Math.round(6 * s.hpRatio));
      for (let i = 0; i < n; i++) {
        const a = s.t / 700 + (i / 6) * Math.PI * 2;
        ingot(g, s.x + Math.cos(a) * R * 1.55, s.y + Math.sin(a) * R * 0.9 + 6, 0.55);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, BULLION_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Exchequer's counting floor: gold bricks laid in herringbone, a broad marble border with a
   * running key of red and black, the King's profile in a great coin mosaic at the heart, and under
   * the HUD the back wall of tellers' grilles, each with its green lamp and its stacks of coin.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xb0111);
    // Herringbone gold brick.
    g.fillStyle(GOLD_DARK, 1); g.fillRect(0, 0, W, H);
    const BW = 40, BH = 16;
    for (let y = 100; y < H + BW; y += BH) {
      for (let x = -BW; x < W + BW; x += BW) {
        const odd = (Math.floor(y / BH) + Math.floor(x / BW)) % 2;
        const shade = rng() < 0.5 ? GOLD : lit(GOLD, 0.06);
        if (odd) { g.fillStyle(shade, 1); g.fillRect(x + 1, y + 1, BW - 2, BH - 2); g.fillStyle(GOLD_LIT, 0.35); g.fillRect(x + 1, y + 1, BW - 2, 2); }
        else { g.fillStyle(dim(shade, 0.08), 1); g.fillRect(x + (y % (BH * 2) === 0 ? 0 : BW / 2) + 1, y + 1, BW / 2 - 2, BH - 2); }
      }
    }
    // Marble border with a red-and-black key.
    for (const [x, y, w, h] of [[0, 100, W, 26], [0, H - 26, W, 26], [0, 100, 26, H - 100], [W - 26, 100, 26, H - 100]] as [number, number, number, number][]) {
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(x, y, w, h);
      g.fillStyle(MARBLE, 1); g.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
    for (let x = 30; x < W - 30; x += 24) {
      g.fillStyle(((x / 24) | 0) % 2 ? PAVE_RED : PAVE_BLACK, 0.85);
      g.fillRect(x, 108, 12, 10); g.fillRect(x, H - 18, 12, 10);
    }
    for (let y = 130; y < H - 30; y += 24) {
      g.fillStyle(((y / 24) | 0) % 2 ? PAVE_RED : PAVE_BLACK, 0.85);
      g.fillRect(8, y, 10, 12); g.fillRect(W - 18, y, 10, 12);
    }
    for (let i = 0; i < 20; i++) { g.lineStyle(1, MARBLE_VEIN, 0.4); const x = rng() * W; g.lineBetween(x, H - 24, x + 30, H - 6); }
    // The coin mosaic at the heart: milled rim, the King's profile, the House's wheel round it.
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(GOLD_DEEP, 1); g.fillCircle(cx, cy, 150);
    g.fillStyle(MARBLE, 1); g.fillCircle(cx, cy, 144);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.fillStyle(i % 2 ? PAVE_RED : PAVE_BLACK, 1);
      g.fillTriangle(cx + Math.cos(a) * 144, cy + Math.sin(a) * 144, cx + Math.cos(a + 0.13) * 144, cy + Math.sin(a + 0.13) * 144, cx + Math.cos(a + 0.065) * 118, cy + Math.sin(a + 0.065) * 118);
    }
    coin(g, cx, cy, 112, 'gold', 1, 'head');
    g.lineStyle(3, GOLD_LIT, 0.4); g.strokeCircle(cx, cy, 160);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.fillStyle(GOLD_LIT, 0.18);
      g.fillTriangle(cx + Math.cos(a - 0.08) * 165, cy + Math.sin(a - 0.08) * 165, cx + Math.cos(a + 0.08) * 165, cy + Math.sin(a + 0.08) * 165, cx + Math.cos(a) * 280, cy + Math.sin(a) * 280);
    }
    // Under the HUD: the tellers' grilles.
    g.fillStyle(LACQUER, 1); g.fillRect(0, 0, W, 100);
    for (let x = 0; x < W; x += 96) {
      g.fillStyle(BAIZE_DARK, 1); g.fillRect(x + 8, 20, 80, 64);
      g.fillStyle(LAMP_GLOW, 0.12); g.fillRect(x + 8, 50, 80, 34);
      g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x + 48, 54, 26, 10);
      coinStack(g, x + 28, 82, 4, 6); coinStack(g, x + 68, 82, 6, 6);
      g.lineStyle(2, BRASS, 1); for (let gx = x + 14; gx < x + 86; gx += 10) g.lineBetween(gx, 20, gx, 84);
      g.lineStyle(3, GOLD, 1); g.strokeRect(x + 8, 20, 80, 64);
    }
    g.fillStyle(GOLD_DARK, 1); g.fillRect(0, 94, W, 8);
    g.fillStyle(GOLD, 1); g.fillRect(0, 94, W, 3);
    // A warm lamp-glow at the edges.
    for (let i = 0; i < 6; i++) { g.lineStyle(36, LAMP_GLOW, 0.025); g.strokeRect(i * 16, 100 + i * 16, W - i * 32, H - 100 - i * 32); }
  },
};
