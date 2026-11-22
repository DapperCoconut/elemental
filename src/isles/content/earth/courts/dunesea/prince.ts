import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import { drift, fulgurite, quicksand, sandFin, windSigil, windTower } from './art';
import {
  BRASS, BRASS_LIT, COBALT, FLOW, GLASS, GLASS_DARK, GLASS_LIT, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE,
  SIROCCO, SIROCCO_DARK, SIROCCO_JEWEL, SIROCCO_LIT, STONE, STONE_DARK, STONE_DEEP, STONE_LIT, STRIPE_INDIGO,
  STRIPE_SAFFRON, TILE, TILE_DARK, TILE_LIT,
} from './palette';
import { clamp, dist } from './util';

/**
 * Prince Sirocco, the Restless — Regent Gravane's son, governor of the Dunesea Court.
 *
 * As a boy Sirocco flew kites off the dunes. His father saw one over the Palace, called it "a thing
 * that goes where it is not told", and buried it — the kite, its string, and the dune it flew from.
 * Sirocco took the lesson the wrong way round: if what goes where it likes gets buried, then he
 * would be the thing that buries. He became the wind. He never stays in a room, never finishes a
 * sentence where he started it, and never once says he did anything: the wind did. He fights
 * like weather:
 *
 * • **Desert Wind** (orbiting): scouring lanes of blown sand that stream through the room and
 *   shove you down them; great crescent dunes that walk across the floor; dust devils that
 *   wander after you, suck at you, and burst into gravel.
 * • **Sand Burial** (stalking, the hot tint): he goes under. A fin circles you and lunges through
 *   where you stand; a quicksand vortex drags at you while what it has swallowed orbits its rim;
 *   sand pours from the sky onto every place you have just been.
 * • **Glass Desert** (hard, blinking): his storm calls lightning, and lightning makes glass of
 *   sand — fulgurites stand up where it strikes and shatter into shards; the whole floor fuses into
 *   a chequer of glass that cracks and bursts one colour, then the other.
 */

const TOP = 96;

/** While the Prince is under the sand (Sand Shark): the rig is covered and a fin rides on top. */
let sunkUntil = 0;
let sunkFrom = 0;

const inField = (tk: BossToolkit, p: Pt): Pt => ({ x: clamp(p.x, 50, tk.W - 50), y: clamp(p.y, TOP + 40, tk.H - 40) });
const alivePlayer = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Scouring Lanes ────────────────────────────────────────
// The wind lays three parallel lanes of blowing sand across the room, one through you. They stream
// for a second and a half: inside one you are sand-blasted and shoved down its length.

const scour = (tk: BossToolkit): SignatureMove => {
  let a = 0;
  let offs: number[] = [];
  let cx = 0, cy = 0;
  let warnAt = 0, fireAt = 0, endAt = 0, lastTick = 0;
  const HALF = 34;
  const across = (x: number, y: number, o: number) => Math.abs((x - cx) * -Math.sin(a) + (y - cy) * Math.cos(a) - o);
  return {
    durationMs: 2700,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'SCOURING WIND',
    cast(time) {
      const p = tk.player;
      a = (Math.random() < 0.5 ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.3;
      cx = p.x; cy = p.y;
      offs = [-160, 0, 160].map((o) => o + (Math.random() - 0.5) * 30);
      warnAt = time;
      fireAt = time + tk.warn(1000);
      endAt = fireAt + 1500;
      tk.sfx('gust');
    },
    update(time) {
      if (time < fireAt || time > endAt || !alivePlayer(tk)) return;
      const p = tk.player;
      if (time - lastTick < 300) return;
      if (offs.some((o) => across(p.x, p.y, o) < HALF)) {
        lastTick = time;
        tk.hitPlayer(4, p.x, p.y);
        tk.pull(p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240, 125, 320);
        tk.sfx('hit-light');
      }
    },
    drawGround(g, time) {
      if (time > endAt + 300 || !offs.length) return;
      const firing = time >= fireAt;
      const k = firing ? 1 : clamp((time - warnAt) / Math.max(1, fireAt - warnAt), 0, 1);
      const L = 1300;
      for (const o of offs) {
        const ox = cx - Math.sin(a) * o, oy = cy + Math.cos(a) * o;
        const x1 = ox - Math.cos(a) * L, y1 = oy - Math.sin(a) * L, x2 = ox + Math.cos(a) * L, y2 = oy + Math.sin(a) * L;
        g.lineStyle(HALF * 2, firing ? SAND_LIT : SAND_DARK, firing ? 0.3 : 0.08 + k * 0.14); g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(2, SIROCCO, 0.25 + k * 0.5);
        g.lineBetween(x1 - Math.sin(a) * HALF, y1 + Math.cos(a) * HALF, x2 - Math.sin(a) * HALF, y2 + Math.cos(a) * HALF);
        g.lineBetween(x1 + Math.sin(a) * HALF, y1 - Math.cos(a) * HALF, x2 + Math.sin(a) * HALF, y2 - Math.cos(a) * HALF);
        // Grains streaming down the lane: sparse while it gathers, a torrent when it fires.
        const n = firing ? 40 : Math.round(6 + k * 10);
        for (let i = 0; i < n; i++) {
          const ph = ((time / (firing ? 260 : 700)) + i * 0.618) % 1;
          const d = -900 + ph * 1800, w = (((i * 37) % 21) - 10) / 10 * HALF * 0.85;
          const px = ox + Math.cos(a) * d - Math.sin(a) * w, py = oy + Math.sin(a) * d + Math.cos(a) * w;
          if (py < TOP || py > tk.H + 10) continue;
          g.lineStyle(firing ? 2 : 1.4, SAND_PALE, firing ? 0.75 : 0.5);
          g.lineBetween(px, py, px - Math.cos(a) * (firing ? 18 : 8), py - Math.sin(a) * (firing ? 18 : 8));
        }
      }
    },
    onPhaseEnd() { offs = []; },
  };
};

// ── Signature: The Dunes Walk ────────────────────────────────────────
// Two great crescent dunes (barchans, horns forward) walk across the room one after the other, each
// down its own marked track. A dune's slip face crushes and carries whoever it rolls over. Step off
// the track.

interface Barchan { y: number; dir: 1 | -1; x: number; warnAt: number; goAt: number; dealt: boolean; seed: number }

const dunes = (tk: BossToolkit): SignatureMove => {
  let list: Barchan[] = [];
  const RX = 76, RY = 128, SPEED = 240;
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE DUNES WALK',
    cast(time) {
      const p = tk.player;
      const dir: 1 | -1 = p.x > tk.W / 2 ? 1 : -1;
      const y2 = p.y > (TOP + tk.H) / 2 ? p.y - 250 : p.y + 250;
      list = [p.y, y2].map((y, i) => ({
        y: clamp(y, TOP + 60, tk.H - 60), dir, x: dir > 0 ? -RX - 20 : tk.W + RX + 20,
        warnAt: time, goAt: time + tk.warn(1100) + i * 650, dealt: false, seed: Math.random() * 6,
      }));
      tk.sfx('quake');
    },
    update(time, dt) {
      const p = tk.player;
      for (const b of list) {
        if (time < b.goAt) continue;
        b.x += b.dir * SPEED * dt;
        const dx = (p.x - b.x) / RX, dy = (p.y - b.y) / RY;
        if (!b.dealt && alivePlayer(tk) && dx * dx + dy * dy < 1) {
          b.dealt = true;
          tk.hitPlayer(15, p.x, p.y);
          tk.slowPlayer(0.6, 900);
          tk.pull(p.x + b.dir * 260, p.y, 130, 500);
          tk.sfx('stone-slam');
        }
      }
      list = list.filter((b) => (b.dir > 0 ? b.x < tk.W + RX * 2 : b.x > -RX * 2));
    },
    drawGround(g, time) {
      for (const b of list) {
        // The track: where the dune will walk.
        if (time < b.goAt + 300) {
          const k = clamp((time - b.warnAt) / Math.max(1, b.goAt - b.warnAt), 0, 1);
          g.fillStyle(SAND_DEEP, 0.08 + k * 0.14); g.fillRect(0, b.y - RY, tk.W, RY * 2);
          g.lineStyle(2, SIROCCO, 0.3 + k * 0.4); g.lineBetween(0, b.y - RY, tk.W, b.y - RY); g.lineBetween(0, b.y + RY, tk.W, b.y + RY);
          for (let x = 40; x < tk.W; x += 90) {
            const cx = b.dir > 0 ? x : tk.W - x;
            g.lineStyle(3, SIROCCO_LIT, 0.15 + k * 0.4);
            g.lineBetween(cx - b.dir * 14, b.y - 18, cx, b.y); g.lineBetween(cx - b.dir * 14, b.y + 18, cx, b.y);
          }
        }
        if (time < b.goAt) continue;
        // The dune: a crescent, lit back to windward, horns reaching forward, a dark slip face in the lee.
        const x = b.x, y = b.y, d = b.dir;
        g.fillStyle(0x000000, 0.18); g.fillEllipse(x + d * 10, y + 12, RX * 2.2, RY * 2);
        g.fillStyle(SAND_DARK, 1); g.fillEllipse(x, y, RX * 2, RY * 2);
        g.fillStyle(SAND, 1); g.fillEllipse(x - d * 14, y - 6, RX * 1.7, RY * 1.8);
        g.fillStyle(SAND_LIT, 0.8); g.fillEllipse(x - d * 30, y - 16, RX * 0.9, RY * 1.1);
        // Horns.
        for (const k of [-1, 1]) {
          g.fillStyle(SAND, 1); g.fillTriangle(x + d * RX * 0.2, y + k * RY * 0.55, x + d * RX * 0.2, y + k * RY * 0.95, x + d * RX * 1.3, y + k * RY * 0.9);
        }
        // Slip face and the crest line.
        g.fillStyle(SAND_DEEP, 0.9); g.fillEllipse(x + d * RX * 0.55, y, RX * 0.7, RY * 1.1);
        g.lineStyle(3, SAND_PALE, 0.9);
        g.beginPath(); g.arc(x - d * 6, y, RY * 0.62, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
        // Sand avalanching off the crest.
        for (let i = 0; i < 8; i++) {
          const ph = (time / 280 + i / 8) % 1;
          g.fillStyle(SAND_PALE, 0.6 * (1 - ph));
          g.fillCircle(x + d * (RX * 0.5 + ph * 50), y - RY * 0.6 + (i / 7) * RY * 1.2, 2 + ph * 3);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Dust Devils ───────────────────────────────────────────
// He claps up three whirlwinds. They wander after you, sucking at you when close and buffeting on
// contact, then collapse in a burst of gravel.

interface Devil { x: number; y: number; bornAt: number; dieAt: number; seed: number; lastHit: number; lastPull: number }

const devils = (tk: BossToolkit): SignatureMove => {
  let list: Devil[] = [];
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'clap',
    tell: 'DUST DEVILS',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random();
        const p = inField(tk, { x: tk.bossX + Math.cos(a) * 80, y: tk.bossY + Math.sin(a) * 60 });
        list.push({ x: p.x, y: p.y, bornAt: time, dieAt: time + 4400 + i * 300, seed: Math.random() * 10, lastHit: 0, lastPull: 0 });
      }
      tk.sfx('tornado');
    },
    update(time, dt) {
      const p = tk.player;
      for (let i = list.length - 1; i >= 0; i--) {
        const d = list[i];
        const a = Math.atan2(p.y - d.y, p.x - d.x) + Math.sin(time / 500 + d.seed) * 0.9;
        d.x = clamp(d.x + Math.cos(a) * 100 * dt, 40, tk.W - 40);
        d.y = clamp(d.y + Math.sin(a) * 100 * dt, TOP + 30, tk.H - 30);
        const dd = dist(d.x, d.y, p.x, p.y);
        if (alivePlayer(tk) && dd < 100 && time - d.lastPull > 200) { d.lastPull = time; tk.pull(d.x, d.y, 80, 240); }
        if (alivePlayer(tk) && dd < 30 && time - d.lastHit > 800) { d.lastHit = time; tk.hitPlayer(9, p.x, p.y); }
        if (time > d.dieAt) {
          for (let k = 0; k < 8; k++) tk.spawnBullet({ x: d.x, y: d.y, angle: (k / 8) * Math.PI * 2 + d.seed, speed: 190, damage: 7, r: 5, lifeMs: 2400, color: SAND_DARK });
          tk.boom(d.x, d.y, 40, SAND_LIT);
          tk.sfx('rock-throw');
          list.splice(i, 1);
        }
      }
    },
    drawGround(g) {
      for (const d of list) { g.fillStyle(SAND_DEEP, 0.3); g.fillEllipse(d.x, d.y + 6, 50, 16); }
    },
    drawAir(g, time) {
      for (const d of list) {
        const grow = clamp((time - d.bornAt) / 400, 0, 1);
        const left = clamp((d.dieAt - time) / 400, 0, 1);
        const s = grow * (0.6 + left * 0.4);
        // A funnel of stacked, wobbling rings of sand, wide at the top.
        for (let k = 0; k < 9; k++) {
          const f = k / 8;
          const w = (10 + f * 46) * s;
          const ox = Math.sin(time / 160 + d.seed + f * 3) * 8 * f;
          g.lineStyle(3 - f, k % 2 ? SAND_LIT : SAND, 0.65);
          g.strokeEllipse(d.x + ox, d.y - f * 90 * s, w, w * 0.32);
        }
        // Debris orbiting the funnel.
        for (let i = 0; i < 5; i++) {
          const a = time / 120 + i * 1.3 + d.seed;
          const f = ((i * 0.23 + time / 2400) % 1);
          g.fillStyle(i % 2 ? STONE_DARK : SAND_DEEP, 0.9);
          g.fillCircle(d.x + Math.cos(a) * (12 + f * 30) * s, d.y - f * 80 * s + Math.sin(a) * 6, 2.5);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Sand Shark ────────────────────────────────────────────
// He goes under. A fin circles you, cutting a ring round where you stood, then turns and lunges
// straight through you and bursts up in a spray of sand.

const shark = (tk: BossToolkit): SignatureMove => {
  sunkUntil = 0;
  let trail: Pt[] = [];
  let lungeLine: { x1: number; y1: number; x2: number; y2: number; at: number } | null = null;
  return {
    durationMs: 4400,
    windupMs: 450,
    gesture: 'recoil',
    locksBody: true,
    tell: 'HE GOES UNDER',
    cast(time) {
      const p = tk.player;
      const c = inField(tk, { x: p.x, y: p.y });
      const R = 190;
      const a0 = Math.atan2(tk.bossY - c.y, tk.bossX - c.x);
      const SEG = 6, WARN = 170, TRAVEL = 280;
      sunkFrom = time;
      sunkUntil = time + 4300;
      trail = [];
      tk.sfx('whoosh');
      for (let i = 1; i <= SEG; i++) {
        tk.schedule((i - 1) * (tk.warn(WARN) + TRAVEL), () => {
          const a = a0 + (i / SEG) * Math.PI * 1.6;
          tk.spawnCharge({ toX: c.x + Math.cos(a) * R, toY: c.y + Math.sin(a) * R * 0.8, warnMs: WARN, travelMs: TRAVEL, halfW: 24, damage: 10 });
        });
      }
      const lungeAt = SEG * (tk.warn(WARN) + TRAVEL) + 120;
      tk.schedule(lungeAt, () => {
        const q = tk.player;
        const a = Math.atan2(q.y - tk.bossY, q.x - tk.bossX);
        const to = inField(tk, { x: q.x + Math.cos(a) * 150, y: q.y + Math.sin(a) * 150 });
        lungeLine = { x1: tk.bossX, y1: tk.bossY, x2: to.x, y2: to.y, at: tk.now };
        tk.spawnCharge({ toX: to.x, toY: to.y, warnMs: 650, travelMs: 380, halfW: 34, damage: 16 });
        tk.sfx('roar');
      });
      tk.schedule(lungeAt + tk.warn(650) + 400, () => {
        for (let k = 0; k < 12; k++) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: (k / 12) * Math.PI * 2, speed: 200, damage: 7, r: 5, lifeMs: 2400, color: SAND_LIT });
        tk.boom(tk.bossX, tk.bossY, 70, SAND_LIT);
        tk.sfx('explosion-medium');
        sunkUntil = tk.now + 250;
        lungeLine = null;
      });
    },
    update(time) {
      if (time < sunkUntil) {
        const last = trail[trail.length - 1];
        if (!last || dist(last.x, last.y, tk.bossX, tk.bossY) > 10) trail.push({ x: tk.bossX, y: tk.bossY });
        if (trail.length > 40) trail.shift();
      } else if (trail.length) trail.shift();
    },
    drawGround(g, time) {
      // The furrow the fin leaves behind.
      trail.forEach((p, i) => {
        const k = i / Math.max(1, trail.length);
        g.fillStyle(SAND_DEEP, 0.3 * k); g.fillEllipse(p.x, p.y + 6, 30, 12);
      });
      if (lungeLine) {
        const k = clamp((time - lungeLine.at) / tk.warn(650), 0, 1);
        g.lineStyle(68, SIROCCO_DARK, 0.1 + k * 0.15); g.lineBetween(lungeLine.x1, lungeLine.y1, lungeLine.x2, lungeLine.y2);
      }
    },
    drawAir(g, time) {
      if (time < sunkUntil && time > sunkFrom + 300) {
        const prev = trail[trail.length - 2] ?? { x: tk.bossX - 1, y: tk.bossY };
        sandFin(g, tk.bossX, tk.bossY, Math.atan2(tk.bossY - prev.y, tk.bossX - prev.x), 1.2, time);
      }
    },
    onPhaseEnd() { sunkUntil = 0; trail = []; lungeLine = null; },
  };
};

// ── Signature: Quicksand Vortex ──────────────────────────────────────
// A whirlpool of sand opens near you and drags at you for three seconds; its throat chews whoever it
// reaches, and the things it has swallowed ride round its rim. When it closes, it spits them out.

interface Debris { a: number; r: number; kind: number; dealt: boolean }

const vortex = (tk: BossToolkit): SignatureMove => {
  let on = false;
  let cx = 0, cy = 0, openAt = 0, endAt = 0, lastPull = 0;
  let debris: Debris[] = [];
  const pos = (d: Debris) => ({ x: cx + Math.cos(d.a) * d.r, y: cy + Math.sin(d.a) * d.r * 0.7 });
  return {
    durationMs: 3900,
    windupMs: 600,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'QUICKSAND VORTEX',
    cast(time) {
      const p = tk.player;
      const c = inField(tk, { x: (p.x * 2 + tk.W / 2) / 3, y: (p.y * 2 + (TOP + tk.H) / 2) / 3 });
      cx = c.x; cy = c.y;
      on = true;
      openAt = time + tk.warn(900);
      endAt = openAt + 3000;
      debris = Array.from({ length: tk.hard ? 7 : 5 }, (_, i) => ({ a: (i / 5) * Math.PI * 2, r: 190, kind: i % 3, dealt: false }));
      tk.sfx('time-warp');
      tk.schedule(tk.warn(900), () => {
        tk.spawnPool({ x: cx, y: cy, radius: 54, lifeMs: 3000, damage: 7, tickMs: 500 });
        tk.sfx('slime-splat');
      });
    },
    update(time, dt) {
      if (!on) return;
      const p = tk.player;
      if (time >= openAt && time < endAt) {
        if (alivePlayer(tk) && time - lastPull > 200) { lastPull = time; tk.pull(cx, cy, 110, 260); }
        for (const d of debris) {
          d.a += dt * (1.6 + (190 - d.r) / 90);
          d.r = Math.max(70, d.r - dt * 30);
          const q = pos(d);
          if (!d.dealt && alivePlayer(tk) && dist(q.x, q.y, p.x, p.y) < 30) { d.dealt = true; tk.hitPlayer(8, p.x, p.y); }
        }
      }
      if (time >= endAt) {
        for (const d of debris) {
          const q = pos(d);
          tk.spawnBullet({ x: q.x, y: q.y, angle: Math.atan2(q.y - cy, q.x - cx) + 0.4, speed: 220, damage: 8, r: 6, lifeMs: 2400, color: STONE_DARK });
        }
        tk.sfx('rock-throw');
        on = false;
        debris = [];
      }
    },
    drawGround(g, time) {
      if (!on) return;
      const t = time / 1000;
      if (time < openAt) {
        const k = clamp(1 - (openAt - time) / tk.warn(900), 0, 1);
        quicksand(g, cx, cy, 40 + k * 140, t * 2, 1, 0);
        g.lineStyle(2, SIROCCO, 0.3 + k * 0.5); g.strokeEllipse(cx, cy, 380 * k + 40, 266 * k + 28);
        return;
      }
      quicksand(g, cx, cy, 180, t * 3, 1, 1);
      // Spiral arms dragging inward.
      for (let arm = 0; arm < 4; arm++) {
        g.lineStyle(3, SAND_DEEP, 0.55);
        g.beginPath();
        for (let s = 0; s <= 16; s++) {
          const f = s / 16;
          const a = arm * (Math.PI / 2) + f * 4 - t * 3;
          const r = 180 * (1 - f * 0.85);
          if (s === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7); else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7);
        }
        g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!on || time < openAt) return;
      for (const d of debris) {
        const q = pos(d);
        if (d.kind === 0) {
          // A broken jar.
          g.fillStyle(0xb8643a, 1); g.fillCircle(q.x, q.y - 6, 8); g.fillStyle(dim(0xb8643a, 0.3), 1); g.fillRect(q.x - 3, q.y - 16, 6, 4);
        } else if (d.kind === 1) {
          // A beam of a buried house.
          g.lineStyle(6, 0x5e3e24, 1); g.lineBetween(q.x - 14, q.y - 4, q.x + 14, q.y - 10);
        } else {
          // A sanded roof-tile, turquoise.
          g.fillStyle(TILE, 1); g.fillRect(q.x - 8, q.y - 10, 16, 8); g.fillStyle(TILE_LIT, 0.7); g.fillRect(q.x - 8, q.y - 10, 16, 2);
        }
      }
    },
    onPhaseEnd() { on = false; debris = []; },
  };
};

// ── Signature: Sand Burial ───────────────────────────────────────────
// Sand pours out of the sky onto each place you have just been, one after another down your trail,
// and settles there as a heap that drags at your feet.

const burial = (tk: BossToolkit): SignatureMove => {
  const trail: Pt[] = [];
  let lastRec = 0;
  let pours: { x: number; y: number; at: number; fallAt: number }[] = [];
  return {
    durationMs: 2500,
    windupMs: 500,
    gesture: 'slam',
    tell: 'SAND BURIAL',
    cast(time) {
      const spots = trail.slice(-6);
      if (!spots.length) spots.push({ x: tk.player.x, y: tk.player.y });
      spots.push({ x: tk.player.x, y: tk.player.y });
      pours = [];
      spots.forEach((s, i) => {
        const warn = 950 + i * 140;
        tk.spawnZone({ x: s.x, y: s.y, radius: 54, warnMs: warn, damage: 12, slowMult: 0.55, slowMs: 1400, poolMs: 2400, poolDamage: 3 });
        pours.push({ x: s.x, y: s.y, at: time, fallAt: time + tk.warn(warn) });
      });
      tk.sfx('stone-rise');
    },
    update(time) {
      if (time - lastRec > 260) {
        lastRec = time;
        const p = tk.player;
        const l = trail[trail.length - 1];
        if (!l || dist(l.x, l.y, p.x, p.y) > 50) trail.push({ x: p.x, y: p.y });
        if (trail.length > 10) trail.shift();
      }
      pours = pours.filter((p) => time < p.fallAt + 500);
    },
    drawAir(g, time) {
      // Streams of sand pouring from the top of the room onto each mark, thickening to the fall.
      for (const p of pours) {
        const k = clamp((time - p.at) / Math.max(1, p.fallAt - p.at), 0, 1);
        if (time > p.fallAt) {
          const f = (time - p.fallAt) / 500;
          g.fillStyle(SAND_LIT, 0.6 * (1 - f)); g.fillEllipse(p.x, p.y - f * 10, 120 * (0.6 + f), 40 * (0.6 + f));
          continue;
        }
        for (let i = 0; i < 4; i++) {
          const sx = p.x - 10 + i * 7 + Math.sin(time / 90 + i) * 2;
          g.lineStyle(1 + k * 3, i % 2 ? SAND_LIT : SAND, 0.25 + k * 0.5);
          g.lineBetween(sx, TOP, sx, TOP + (p.y - TOP) * k);
        }
        g.fillStyle(SAND, 0.4 + k * 0.4); g.fillEllipse(p.x, p.y, 30 + k * 50, 10 + k * 16);
      }
    },
    onPhaseEnd() { pours = []; },
  };
};

// ── Signature: Fulgurite (hard) ──────────────────────────────────────
// His storm calls lightning down onto the sand round you — a dark cloud-shadow and a crackle first.
// Each strike leaves a fulgurite, a stalk of fused glass, that cracks and bursts into shards.

interface Strike { x: number; y: number; at: number; fireAt: number; fired: boolean; burstAt: number; burst: boolean; seed: number }

const fulgur = (tk: BossToolkit): SignatureMove => {
  let list: Strike[] = [];
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'raise',
    tell: 'LIGHTNING ON SAND',
    cast(time) {
      const p = tk.player;
      const n = 5;
      list = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 90 + Math.random() * 150;
        const q = inField(tk, { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8 });
        const fireAt = time + tk.warn(900) + i * 180;
        list.push({ x: q.x, y: q.y, at: time, fireAt, fired: false, burstAt: fireAt + 1500, burst: false, seed: Math.random() * 10 });
      }
      tk.sfx('electric-charge');
    },
    update(time) {
      const p = tk.player;
      for (const s of list) {
        if (!s.fired && time >= s.fireAt) {
          s.fired = true;
          if (alivePlayer(tk) && dist(s.x, s.y, p.x, p.y) < 48) tk.hitPlayer(14, p.x, p.y);
          tk.sfx('thunder');
        }
        if (s.fired && !s.burst && time >= s.burstAt) {
          s.burst = true;
          for (let k = 0; k < 8; k++) tk.spawnBullet({ x: s.x, y: s.y - 10, angle: (k / 8) * Math.PI * 2 + s.seed, speed: 210, damage: 7, r: 4, lifeMs: 2200, color: GLASS });
          tk.sfx('crystal-shatter');
        }
      }
      list = list.filter((s) => !s.burst || time < s.burstAt + 400);
    },
    drawGround(g, time) {
      for (const s of list) {
        if (!s.fired) {
          const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
          g.fillStyle(0x1a1430, 0.12 + k * 0.25); g.fillEllipse(s.x, s.y, 110, 50);
          g.lineStyle(2, GLASS_LIT, 0.2 + k * 0.6); g.strokeEllipse(s.x, s.y, 96 * (1.2 - k * 0.2), 42 * (1.2 - k * 0.2));
          if (Math.floor(time / 70) % 3 === 0) {
            const a = s.seed + time / 50;
            g.lineStyle(1.5, GLASS_LIT, 0.6 * k); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 14);
          }
          continue;
        }
        if (!s.burst) {
          const crack = clamp((time - s.fireAt) / (s.burstAt - s.fireAt), 0, 1);
          fulgurite(g, s.x, s.y, 1.1, crack > 0.5 ? (crack - 0.5) * 2 : 0, s.seed);
        } else {
          const f = (time - s.burstAt) / 400;
          g.fillStyle(GLASS_LIT, 0.4 * (1 - f)); g.fillCircle(s.x, s.y - 10, 30 * (1 + f));
        }
      }
    },
    drawAir(g, time) {
      for (const s of list) {
        if (!s.fired || time - s.fireAt > 220) continue;
        // The bolt: a jagged line from the top of the room.
        const k = 1 - (time - s.fireAt) / 220;
        const rng = mulberry(Math.floor(s.seed * 1000));
        let px = s.x + (rng() - 0.5) * 60, py = TOP - 10;
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const nx = i === steps ? s.x : s.x + (rng() - 0.5) * 50 * (1 - i / steps), ny = TOP - 10 + ((s.y - TOP + 10) * i) / steps;
          g.lineStyle(6, GLASS_LIT, 0.35 * k); g.lineBetween(px, py, nx, ny);
          g.lineStyle(2.5, 0xffffff, k); g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
        glow(g, s.x, s.y, 50, GLASS_LIT, 0.12 * k, 3);
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: The Glass Floor (hard) ────────────────────────────────
// The whole floor fuses into a chequer of glass tiles. One colour glows, cracks and bursts; then the
// other. Stand on the dark squares, then move.

const glassFloor = (tk: BossToolkit): SignatureMove => {
  let on = false;
  let firstParity = 0;
  let warnAt = 0, burstA = 0, burstB = 0;
  let dealtA = false, dealtB = false;
  const T = 120;
  const parityAt = (x: number, y: number) => (Math.floor(x / T) + Math.floor((y - TOP) / T)) % 2;
  return {
    durationMs: 3200,
    windupMs: 600,
    gesture: 'slam',
    tell: 'THE SAND TURNS TO GLASS',
    cast(time) {
      const p = tk.player;
      on = true;
      firstParity = parityAt(p.x, p.y);
      warnAt = time;
      burstA = time + tk.warn(1100);
      burstB = burstA + tk.warn(1000);
      dealtA = dealtB = false;
      tk.sfx('crystal-chime');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      if (!dealtA && time >= burstA) {
        dealtA = true;
        tk.sfx('crystal-shatter');
        if (alivePlayer(tk) && parityAt(p.x, p.y) === firstParity) tk.hitPlayer(13, p.x, p.y);
      }
      if (!dealtB && time >= burstB) {
        dealtB = true;
        tk.sfx('crystal-shatter');
        if (alivePlayer(tk) && parityAt(p.x, p.y) !== firstParity) tk.hitPlayer(13, p.x, p.y);
      }
      if (time > burstB + 600) on = false;
    },
    drawGround(g, time) {
      if (!on) return;
      for (let y = TOP; y < tk.H; y += T) {
        for (let x = 0; x < tk.W; x += T) {
          const par = parityAt(x + 1, y + 1);
          const first = par === firstParity;
          const start = first ? warnAt : burstA, end = first ? burstA : burstB;
          if (time > end + 500) continue;
          if (time >= end) {
            const f = (time - end) / 500;
            g.fillStyle(GLASS_LIT, 0.5 * (1 - f)); g.fillRect(x, y, T, T);
            for (let i = 0; i < 4; i++) { g.fillStyle(GLASS, 1 - f); g.fillTriangle(x + 20 + i * 24, y + 60 - f * 40, x + 30 + i * 24, y + 50 - f * 50, x + 26 + i * 24, y + 72 - f * 30); }
            continue;
          }
          const k = clamp((time - start) / Math.max(1, end - start), 0, 1);
          const live = time >= start;
          g.fillStyle(live ? GLASS : GLASS_DARK, live ? 0.14 + k * 0.36 : 0.08); g.fillRect(x + 2, y + 2, T - 4, T - 4);
          g.lineStyle(1.5, GLASS_LIT, live ? 0.3 + k * 0.6 : 0.15); g.strokeRect(x + 2, y + 2, T - 4, T - 4);
          if (live && k > 0.4) {
            g.lineStyle(1.2, 0xffffff, (k - 0.4) * 1.4);
            g.lineBetween(x + T / 2, y + T / 2, x + 12, y + 20); g.lineBetween(x + T / 2, y + T / 2, x + T - 16, y + 30);
            g.lineBetween(x + T / 2, y + T / 2, x + T / 2 + 10, y + T - 14);
          }
        }
      }
    },
    onPhaseEnd() { on = false; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const SIROCCO_BOSS: WorldBossDef = {
  worldId: 'isle:sirocco',
  name: 'Prince Sirocco',
  title: 'the Restless',
  color: SIROCCO,
  colorLit: SIROCCO_LIT,
  colorDark: SIROCCO_DARK,
  accent: SIROCCO_JEWEL,
  // Tier 2 of the fifth isle.
  damageMult: 1.15,

  intro: [
    'You walked in. Nobody walks into the Palace. The wind brings them, or the wind does not.',
    'I am not going to fight you. The wind is. I am only standing where it happens to blow.',
  ],
  banter: [
    'A pit was covered. A house was sanded. Who did it? Look up. Feel that? It did.',
    'Father buries what he cannot rule. I am kinder. I only move the sand a little.',
    'Do not stand still. Standing still is how you get buried. Ask anyone.',
    'I had a kite once. It went where it liked. You see what happened to it.',
    'The wind never stays. I never stay. Watch — I am already somewhere else.',
  ],
  defeatLine: 'THE WIND DROPS',
  resumeLine: 'Back on the dunes. Most people the wind takes stay taken. You keep blowing back.',

  phases: [
    {
      name: 'Desert Wind',
      line: 'The wind is up. It is always up, in my court. Mind your eyes.',
      hp: 460,
      cycle: [
        'sig:scour', 'volley', 'sig:dunes', 'sig:devils', 'radial',
        'sig:scour', 'homing', 'sig:dunes', 'sweep', 'sig:devils',
      ],
      harass: ['h-flak', 'h-lane'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'Sand Burial',
      line: 'Fine. FINE. Then under you go — and I will come up from beneath.',
      hp: 540,
      cycle: [
        'sig:shark', 'sig:burial', 'lanes', 'sig:vortex', 'barrage',
        'sig:shark', 'sig:scour', 'sig:burial', 'spiral', 'sig:vortex',
      ],
      harass: ['h-snipe', 'h-mines', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE STORM BREAKS OVER THE DUNES',
    extraPhase: {
      name: 'Glass Desert',
      line: 'Lightning on sand makes glass. Glass keeps a shape. Father would like that. I hate it.',
      hp: 390,
      cycle: [
        'sig:fulgurite', 'sig:glass', 'sig:devils', 'homing',
        'sig:fulgurite', 'sig:scour', 'sig:glass', 'radial', 'sig:shark',
      ],
      harass: ['h-orbs', 'h-flak', 'h-snipe'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 6, speed: 220, spreadRad: 0.55 },
    radial: { count: 16, speed: 175 },
    lanes: { halfW: 30 },
    spiral: { arms: 3, speed: 170 },
    sweep: { halfW: 26 },
  },

  signatures: {
    scour,
    dunes,
    devils,
    shark,
    vortex,
    burial,
    fulgurite: fulgur,
    glass: glassFloor,
  },

  look: {
    crest: 'veil', pattern: 'swirl', aura: 'dust', hands: 'wisp',
    torsoR: 34, mouth: 'none', eyes: 2, eyeColor: SIROCCO_JEWEL,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'tremor', tint: 'hot', look: { aura: 'smoke', hands: 'claw', pattern: 'scales' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'sparks', hands: 'blade', pattern: 'facets' } },
  ],

  /**
   * The Restless's tells. A desert wrap wound high round his head in saffron and indigo, its long
   * tail streaming out downwind behind him and never hanging still; a veil across the lower face
   * so you only ever see his eyes; the old city's turquoise set as a jewel at his brow; and a ring
   * of grains forever orbiting him, as if he were the eye of something. In Sand Burial a fin of
   * sand rides his spine, and when he goes under the dune closes over him entirely. In Glass Desert
   * the sand on him has fused — glass shards crust his shoulders and lightning crawls between them.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const burialPhase = s.phaseIdx === 1;
    const glassPhase = s.hard && s.phaseIdx >= 2;
    // Under the sand: a mound over the body and nothing else (the fin rides on top in drawAir).
    if (s.t < sunkUntil) {
      g.fillStyle(SAND_DEEP, 0.6); g.fillEllipse(s.x + 4, s.y + R * 0.6, R * 3, R * 1.1);
      g.fillStyle(SAND, 1); g.fillEllipse(s.x, s.y + R * 0.2, R * 2.8, R * 1.6);
      g.fillStyle(SAND_LIT, 1); g.fillEllipse(s.x - R * 0.4, s.y - R * 0.1, R * 1.4, R * 0.6);
      for (let i = 0; i < 6; i++) { const ph = (s.t / 300 + i / 6) % 1; g.fillStyle(SAND_PALE, 0.7 * (1 - ph)); g.fillCircle(s.x - R + i * R * 0.4, s.y - R * 0.2 - ph * 14, 2.2); }
      return;
    }
    // The orbiting ring of grains.
    for (let i = 0; i < 18; i++) {
      const a = s.t / 500 + (i / 18) * Math.PI * 2;
      const rr = R * (1.5 + Math.sin(s.t / 300 + i) * 0.12);
      g.fillStyle(i % 3 ? SAND_LIT : SIROCCO_LIT, 0.7);
      g.fillCircle(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.55 + R * 0.2, 1.8);
    }
    // The wrap's tail, streaming downwind (away from the player), rippling.
    const down = s.facing + Math.PI;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      const wave = Math.sin(s.t / 120 - f * 5) * 8 * f;
      pts.push({ x: s.x + Math.cos(down) * (R * 0.6 + f * R * 2) - Math.sin(down) * wave, y: s.y - R * 0.7 + Math.sin(down) * (R * 0.6 + f * R * 2) * 0.5 + Math.cos(down) * wave + f * 6 });
    }
    for (let k = 0; k < pts.length - 1; k++) {
      g.lineStyle(10 - k, k % 2 ? STRIPE_INDIGO : STRIPE_SAFFRON, 1);
      g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    }
    // The wrap round the crown: layered bands of cloth.
    for (let i = 0; i < 4; i++) {
      const c = i % 2 ? STRIPE_INDIGO : STRIPE_SAFFRON;
      g.fillStyle(dim(c, 0.25), 1); g.fillEllipse(s.x, s.y - R * (0.55 + i * 0.16) + 1, R * (1.9 - i * 0.28), R * 0.42);
      g.fillStyle(c, 1); g.fillEllipse(s.x, s.y - R * (0.55 + i * 0.16), R * (1.84 - i * 0.28), R * 0.36);
      g.lineStyle(1, lit(c, 0.3), 0.6); g.lineBetween(s.x - R * (0.7 - i * 0.12), s.y - R * (0.58 + i * 0.16), s.x + R * (0.5 - i * 0.1), s.y - R * (0.48 + i * 0.16));
    }
    // The jewel at the brow, catching light when he casts.
    const jx = s.x, jy = s.y - R * 0.55;
    g.fillStyle(BRASS, 1); g.fillCircle(jx, jy, 6.5);
    g.fillStyle(SIROCCO_JEWEL, 1); g.fillCircle(jx, jy, 4.5);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(jx - 1.5, jy - 1.5, 1.4);
    if (s.castGlow > 0.05) glow(g, jx, jy, 18, SIROCCO_JEWEL, 0.08 * s.castGlow, 3);
    // The veil over the lower face, fluttering.
    const vy = s.y + R * 0.05;
    g.fillStyle(dim(STRIPE_INDIGO, 0.3), 0.95);
    g.fillTriangle(s.x - R * 0.72, vy, s.x + R * 0.72, vy, s.x + Math.sin(s.t / 140) * 4, vy + R * 0.85);
    g.fillStyle(STRIPE_INDIGO, 0.95);
    g.fillTriangle(s.x - R * 0.66, vy - 1, s.x + R * 0.66, vy - 1, s.x + Math.sin(s.t / 140) * 4, vy + R * 0.78);
    g.lineStyle(1.5, BRASS_LIT, 0.8); g.lineBetween(s.x - R * 0.7, vy, s.x + R * 0.7, vy);
    for (let i = -2; i <= 2; i++) { g.fillStyle(BRASS, 1); g.fillCircle(s.x + i * R * 0.25, vy + 2, 1.5); }
    if (burialPhase) {
      // A dorsal fin of sand riding his back.
      const bx = s.x - Math.cos(s.facing) * R * 0.5, by = s.y - R * 0.9;
      g.fillStyle(SAND_DARK, 1); g.fillTriangle(bx - 14, by + 10, bx + 14, by + 10, bx - Math.cos(s.facing) * 10, by - 24);
      g.fillStyle(SAND, 1); g.fillTriangle(bx - 10, by + 9, bx + 6, by + 9, bx - Math.cos(s.facing) * 10, by - 22);
      for (let i = 0; i < 3; i++) { const ph = (s.t / 240 + i / 3) % 1; g.fillStyle(SAND_PALE, 0.7 * (1 - ph)); g.fillCircle(bx - Math.cos(s.facing) * 10, by - 22 + ph * 30, 1.6); }
    }
    if (glassPhase) {
      // Fused glass crusting his shoulders, lightning crawling between the shards.
      const shards: Pt[] = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.85 + (i / 6) * Math.PI * 1.3;
        const sx = s.x + Math.cos(a) * R * 0.95, sy = s.y + Math.sin(a) * R * 0.8;
        shards.push({ x: sx, y: sy });
        g.fillStyle(GLASS_DARK, 0.95); g.fillTriangle(sx - 6, sy + 4, sx + 6, sy + 4, sx + Math.cos(a) * 14, sy + Math.sin(a) * 14 - 6);
        g.fillStyle(GLASS, 0.9); g.fillTriangle(sx - 4, sy + 3, sx + 3, sy + 3, sx + Math.cos(a) * 12, sy + Math.sin(a) * 12 - 6);
        g.fillStyle(GLASS_LIT, 0.8); g.fillCircle(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8 - 4, 1.4);
      }
      if (Math.floor(s.t / 90) % 3 !== 0) {
        const i = Math.floor(s.t / 90) % (shards.length - 1);
        const a = shards[i], b = shards[i + 1];
        const mx = (a.x + b.x) / 2 + Math.sin(s.t) * 6, my = (a.y + b.y) / 2 - 8;
        g.lineStyle(1.5, GLASS_LIT, 0.9); g.lineBetween(a.x, a.y, mx, my); g.lineBetween(mx, my, b.x, b.y);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, SIROCCO_LIT, 0.3 + Math.sin(s.t / 120) * 0.2); g.strokeEllipse(s.x, s.y + R * 0.2, R * 3.4, R * 1.6); }
  },

  /**
   * The Palace's inner court: an eight-point-star tiled floor in saffron, indigo and turquoise,
   * sand drifting in over it from the west doorway and the corners; squares of light fall where the
   * windcatcher shafts come down; a dry fountain at the heart is full to the lip with sand; the back
   * wall under the HUD is an arcade of lattice-screened arches between windtower feet.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x51a0cc);
    // Tiled floor.
    const T = 48;
    g.fillStyle(STONE, 1); g.fillRect(0, 0, W, H);
    for (let y = 100; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const cx = x + T / 2, cy = y + T / 2;
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? STONE_LIT : STONE, 1); g.fillRect(x, y, T, T);
        // An eight-point star in every tile.
        const c = ((x / T) % 3) === 0 ? TILE : (k ? STRIPE_SAFFRON : STRIPE_INDIGO);
        g.fillStyle(c, 0.85);
        g.fillRect(cx - 9, cy - 9, 18, 18);
        g.fillTriangle(cx, cy - 14, cx - 6, cy - 6, cx + 6, cy - 6); g.fillTriangle(cx, cy + 14, cx - 6, cy + 6, cx + 6, cy + 6);
        g.fillTriangle(cx - 14, cy, cx - 6, cy - 6, cx - 6, cy + 6); g.fillTriangle(cx + 14, cy, cx + 6, cy - 6, cx + 6, cy + 6);
        g.fillStyle(k ? STONE : STONE_LIT, 1); g.fillCircle(cx, cy, 4);
        g.lineStyle(1, STONE_DARK, 0.5); g.strokeRect(x, y, T, T);
      }
    }
    // Light from the windcatcher shafts.
    for (const [x, y] of [[200, 260], [W - 200, 260], [200, H - 120], [W - 200, H - 120]] as [number, number][]) {
      g.fillStyle(0xfff0c8, 0.12); g.fillRect(x - 54, y - 54, 108, 108);
      g.fillStyle(0xfff0c8, 0.08); g.fillRect(x - 70, y - 70, 140, 140);
      for (let i = 0; i < 5; i++) { g.lineStyle(2, 0x000000, 0.06); g.lineBetween(x - 54, y - 40 + i * 22, x + 54, y - 40 + i * 22); }
    }
    // The dry fountain, choked with sand.
    const cx = W / 2, cy = (H + 110) / 2;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      g.fillStyle(i % 2 ? STONE_DARK : STONE_DEEP, 1);
      g.fillTriangle(cx, cy, cx + Math.cos(a0) * 104, cy + Math.sin(a0) * 74, cx + Math.cos(a1) * 104, cy + Math.sin(a1) * 74);
    }
    g.fillStyle(TILE_DARK, 1); g.fillEllipse(cx, cy, 180, 124);
    g.fillStyle(FLOW, 1); g.fillEllipse(cx, cy - 2, 164, 112);
    g.fillStyle(SAND_LIT, 0.8); g.fillEllipse(cx - 20, cy - 16, 90, 40);
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 7, cy - 40, 14, 40);
    g.fillStyle(STONE_LIT, 1); g.fillEllipse(cx, cy - 40, 30, 10);
    windSigil(g, cx, cy - 52, 9, BRASS, 0.9);
    // Back wall: an arcade between windtower feet, under the HUD.
    g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, 106);
    for (let i = 0; i < 12; i++) {
      const ax = 40 + i * ((W - 80) / 11);
      g.fillStyle(STONE_DEEP, 1); g.fillRect(ax - 22, 36, 44, 66); g.fillTriangle(ax - 22, 37, ax + 22, 37, ax, 12);
      g.lineStyle(1, BRASS, 0.5);
      for (let k = 0; k < 6; k++) { g.lineBetween(ax - 22, 40 + k * 11, ax + 22, 50 + k * 11); g.lineBetween(ax + 22, 40 + k * 11, ax - 22, 50 + k * 11); }
      g.lineStyle(2, TILE, 0.8); g.lineBetween(ax - 24, 38, ax, 10); g.lineBetween(ax, 10, ax + 24, 38);
    }
    for (const tx of [20, W - 20]) windTower(g, tx, 108, 100, 40);
    for (let k = 0; k < W; k += 10) { g.fillStyle(((k / 10) | 0) % 2 ? STRIPE_SAFFRON : COBALT, 1); g.fillRect(k, 100, 10, 6); }
    // Sand creeping in from the west doorway and the corners.
    drift(g, 60, H - 4, 260, 70, rng, true);
    drift(g, 30, 300, 120, 50, rng, true);
    drift(g, W - 80, H - 4, 200, 34, rng, false);
    for (let i = 0; i < 60; i++) { g.fillStyle(SAND, 0.4 + rng() * 0.4); g.fillEllipse(rng() * W * 0.5, 120 + rng() * (H - 120), 16 + rng() * 30, 4 + rng() * 6); }
  },
};
