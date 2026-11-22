import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, lit, mixC, mulberry } from '../../../../art/IsleArt';
import {
  BONE, BRASS, BRASS_DARK, CANDLE, CHAIN, DUST, DUST_DEEP, IRON, MORTAR, SKINS, SOOT, STONE, STONE_DARK, STONE_DEEP,
  STONE_LIT, STRATA, TITHE_RED, ashlar, candle, cellFront, dustDrift, gravaneSeal, headstone, rubbleHeap, sarcophagus,
  slabFloor, strataFace,
} from './art';

/**
 * Regent Gravane the Burier, steward of Bedrock Hold "until the Old King wakes" — the Earth
 * Isle's monarch and finale. He sits on the Old King's sealed sarcophagus at the bottom of his
 * hold, and he buries whatever he cannot rule. The fight is the Stone Tithe, start to end:
 *
 *   I   The Tithe        — enthroned on the box. Tithe-blocks drop on their shadows and every
 *                          one that lands on you is weight you carry (slower, block by block);
 *                          plumb-bobs swing on their lines across the floor and add to it; the
 *                          great Scales come down — strike the light pan to shed the tithe.
 *   II  Interment        — he gets up to wall you in. A cell rises round you, door last (get out
 *                          before it shuts; if not, shoulder a wall until it gives); the floor
 *                          becomes a gallery of cells whose slabs drop end to end; he trowels
 *                          mortar round you that sets hard on whoever is standing in it.
 *   III Landslide Throne — the hold quakes. The ceiling comes in section by section, all but one;
 *                          he burrows under the floor, a ridge running at you, and surfaces;
 *                          faults split the floor and erupt along their length like a fuse.
 *   IV  Buried Alive     — earth pours in from every edge until there is one box of floor left;
 *                          he digs graves in a ring round you and throws the spoil; headstones
 *                          rise in a row and topple, one after the next.
 *   V   The Old King Wakes (hard) — the sarcophagus opens and it is empty. He buries himself in
 *                          the stolen earth and fights as the mountain: the lid is hurled round
 *                          the room off the walls; the strata slide and carry you into the rock;
 *                          a chain of peaks thrusts up after you.
 *
 * Every signature is bespoke; none of them looks like an earlier monarch's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const G_MAIN = 0x8a7a62;
const G_LIT = 0xe0d0b0;
const G_DARK = 0x2a221a;
const G_ACCENT = BRASS;
const EARTH = 0x5a4632;
const EARTH_LIT = 0x8a6e4e;
const FT = 96;
/** Where the anchor phases sit him: on the Old King's box (the kit's anchor point). */
const THRONE = { x: 480, y: 218 };
const PLAYER_R = 20;

type Gfx = Phaser.GameObjects.Graphics;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);
const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
const liveP = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;
/** Move the player bodily (the earth does it), clamped to the field. */
const carry = (tk: BossToolkit, dx: number, dy: number): void => {
  const p = tk.player;
  if (!liveP(tk)) return;
  p.x = clampN(p.x + dx, 40, tk.W - 40);
  p.y = clampN(p.y + dy, FT + 20, tk.H - 40);
};
/** Keep the player inside a box (walled in). Returns which walls they are pressed against. */
const confine = (tk: BossToolkit, x0: number, y0: number, x1: number, y1: number): { l: boolean; r: boolean; t: boolean; b: boolean } => {
  const p = tk.player;
  const pad = PLAYER_R - 4;
  const out = { l: p.x <= x0 + pad + 1, r: p.x >= x1 - pad - 1, t: p.y <= y0 + pad + 1, b: p.y >= y1 - pad - 1 };
  p.x = clampN(p.x, x0 + pad, x1 - pad);
  p.y = clampN(p.y, y0 + pad, y1 - pad);
  return out;
};

/** The weight of tithe the player carries — shared by the first phase's three moves. */
interface Tithe { weight: number }
const TITHES = new WeakMap<BossToolkit, Tithe>();
const titheOf = (tk: BossToolkit): Tithe => {
  let t = TITHES.get(tk);
  if (!t) { t = { weight: 0 }; TITHES.set(tk, t); }
  return t;
};
const MAX_WEIGHT = 4;
const addWeight = (tk: BossToolkit, n: number): void => {
  const t = titheOf(tk);
  const before = t.weight;
  t.weight = Math.min(MAX_WEIGHT, t.weight + n);
  if (t.weight > before) float(tk, tk.player.x, tk.player.y - 60, `TITHE ${t.weight}/${MAX_WEIGHT}`, '#d8c0a0');
};

/** The burrow state the decor reads (one boss fight runs at a time). */
const BURROW = { until: 0, from: 0 };

/** A cut stone falling from the dark: drawn above its shadow, `k` 0 (high) → 1 (landed). */
const fallingBlock = (g: Gfx, x: number, y: number, k: number, s: number, tally: number): void => {
  const h = (1 - k) * (1 - k) * 340;
  ashlar(g, x, y - h, s * (0.7 + k * 0.3), tally, 0.4 + k * 0.6);
};

// ── I. The Stone Tithe ───────────────────────────────────────────────
// Cut blocks drop from the dark onto their own shadows — three on you, four about the floor.
// Each that lands on you is tithe-weight you carry (slower per block, up to four). The weight
// stays until you pay it on the Scales. Landed blocks sit a moment, then crumble.

const stoneTithe = (tk: BossToolkit): SignatureMove => {
  const R = 40;
  interface Drop { x: number; y: number; at: number; land: number; done: boolean; tally: number }
  let drops: Drop[] = [];
  const drop = (x: number, y: number) => {
    const now = tk.now;
    drops.push({ x: tk.clampX(x, 50), y: clampN(y, FT + 50, tk.H - 50), at: now, land: now + tk.warn(1050), done: false, tally: 1 + Math.floor(Math.random() * 5) });
  };
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE STONE TITHE',
    cast() {
      const p = tk.player;
      const order: [number, number][] = [[0, 0], [70, -40], [-70, 40]];
      for (let i = 0; i < 4; i++) order.push([(Math.random() - 0.5) * 700, (Math.random() - 0.5) * 380]);
      order.forEach(([dx, dy], i) => tk.schedule(i * 200, () => {
        const q = tk.player;
        drop(i < 3 ? q.x + dx : p.x + dx, i < 3 ? q.y + dy : (FT + tk.H) / 2 + dy);
      }));
      tk.sfx('rock-throw');
    },
    update(time) {
      const t = titheOf(tk);
      // The weight: four blocks on your back is a third of your stride gone.
      if (t.weight > 0 && liveP(tk)) tk.slowPlayer(1 - t.weight * 0.085, 160);
      const p = tk.player;
      for (const d of drops) {
        if (d.done || time < d.land) continue;
        d.done = true;
        tk.boom(d.x, d.y, R + 8, DUST);
        tk.sfx('stone-slam');
        if (liveP(tk) && dist(p.x, p.y, d.x, d.y) < R + PLAYER_R) {
          tk.hitPlayer(14, p.x, p.y);
          addWeight(tk, 1);
        }
      }
      drops = drops.filter((d) => time < d.land + 2400);
    },
    drawGround(g, time) {
      for (const d of drops) {
        if (time < d.land) {
          const k = clampN((time - d.at) / Math.max(1, d.land - d.at), 0, 1);
          g.fillStyle(0x000000, 0.18 + k * 0.4); g.fillEllipse(d.x, d.y, R * 2 * (0.4 + k * 0.6), R * 1.2 * (0.4 + k * 0.6));
          g.lineStyle(2, TITHE_RED, 0.3 + k * 0.5); g.strokeCircle(d.x, d.y, R);
          if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.7); g.strokeCircle(d.x, d.y, R); }
        } else {
          // The block where it landed, crumbling over its last second.
          const f = clampN((time - d.land - 1400) / 1000, 0, 1);
          g.fillStyle(DUST, 0.35 * (1 - f)); g.fillEllipse(d.x, d.y + 4, R * 2.2, R * 0.9);
          if (f < 1) ashlar(g, d.x, d.y + 14 + f * 8, 1.5 * (1 - f * 0.6), d.tally, 1 - f);
        }
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (time >= d.land) continue;
        const k = clampN((time - d.at) / Math.max(1, d.land - d.at), 0, 1);
        fallingBlock(g, d.x, d.y + 14, k, 1.5, d.tally);
      }
      // The tithe you carry: blocks strapped to your back, a strap over the shoulder.
      const w = titheOf(tk).weight;
      if (w > 0 && liveP(tk)) {
        const p = tk.player;
        g.lineStyle(2, 0x4a3624, 1); g.lineBetween(p.x - 14, p.y - 30, p.x + 12, p.y - 6);
        for (let i = 0; i < w; i++) ashlar(g, p.x - 18 + (i % 2) * 14, p.y - 18 - Math.floor(i / 2) * 14, 0.45, i + 2);
      }
    },
    onPhaseEnd() { drops = []; titheOf(tk).weight = 0; },
  };
};

// ── I. Weighed and Found Wanting ─────────────────────────────────────
// The great Scales come down over the floor: a pan at each side, his weight on the one nearer
// you. Strike the light pan while the beam settles and every blow sheds a stone of tithe off
// your back onto it. When it settles: carry nothing and you are weighed light; still carrying
// and you are found short (+1 weight); in his pan you are crushed. His pan slams, and the
// ground ripples out from it with a gap toward the light pan.

const weighed = (tk: BossToolkit): SignatureMove => {
  const PAN_R = 64;
  const PANS = [{ x: 230, y: 440 }, { x: 730, y: 440 }];
  let live = false;
  let heavy = 0;
  let settleAt = 0;
  let bornAt = 0;
  let settledAt = -9999;
  /** The light pan, while the Scales are down: the thing you strike to shed the tithe. */
  let pan: StrikeTarget | null = null;
  let shedAt = 0;
  const dropPan = () => { pan?.remove(); pan = null; };
  return {
    durationMs: 3400,
    windupMs: 600,
    gesture: 'clap',
    tell: 'WEIGHED',
    locksBody: true,
    cast(time) {
      const p = tk.player;
      heavy = dist(p.x, p.y, PANS[0].x, PANS[0].y) < dist(p.x, p.y, PANS[1].x, PANS[1].y) ? 0 : 1;
      live = true;
      bornAt = time;
      settleAt = time + tk.warn(2500);
      const light = PANS[1 - heavy];
      dropPan();
      pan = tk.spawnTarget({
        x: light.x, y: light.y, r: PAN_R * 0.8, passThrough: true,
        onStruck: (by) => {
          const t = titheOf(tk);
          if (by !== 'player' || !live || t.weight <= 0 || tk.now - shedAt < 250) return;
          shedAt = tk.now;
          t.weight--;
          float(tk, light.x, light.y - 50, t.weight > 0 ? `SHED — ${t.weight} LEFT` : 'TITHE PAID', '#ffe2a8');
          tk.sfx('anvil');
        },
      });
      if (titheOf(tk).weight > 0) float(tk, light.x, light.y - 70, 'STRIKE THE LIGHT PAN', '#ffe2a8');
      tk.sfx('chain');
    },
    update(time) {
      if (!live || time < settleAt) return;
      live = false;
      dropPan();
      settledAt = time;
      const p = tk.player;
      const light = PANS[1 - heavy], hv = PANS[heavy];
      tk.sfx('gravity-slam');
      tk.boom(hv.x, hv.y, PAN_R + 10, BRASS);
      if (!liveP(tk)) return;
      if (dist(p.x, p.y, hv.x, hv.y) < PAN_R) {
        tk.hitPlayer(26, p.x, p.y);
        addWeight(tk, 2);
        float(tk, p.x, p.y - 48, 'CRUSHED IN THE PAN', '#ff9a7a');
      } else if (titheOf(tk).weight > 0) {
        tk.hitPlayer(10, p.x, p.y);
        addWeight(tk, 1);
        float(tk, p.x, p.y - 48, 'FOUND WANTING', '#d8c0a0');
      } else {
        float(tk, p.x, p.y - 64, 'WEIGHED: LIGHT', '#ffe2a8');
        tk.sfx('jackpot');
      }
      tk.spawnRing({
        cx: hv.x, cy: hv.y, delayMs: 120, speed: 330, gapCentre: Math.atan2(light.y - hv.y, light.x - hv.x),
        gapHalf: 0.5, band: 18, damage: 12, startRadius: PAN_R,
      });
    },
    drawGround(g, time) {
      const showing = live || time - settledAt < 800;
      if (!showing) return;
      const k = live ? clampN((time - bornAt) / Math.max(1, settleAt - bornAt), 0, 1) : 1;
      const fade = live ? 1 : 1 - (time - settledAt) / 800;
      PANS.forEach((pn, i) => {
        const isHeavy = i === heavy;
        const drop = isHeavy ? k * 8 : -k * 4;
        g.fillStyle(0x000000, 0.3 * fade); g.fillEllipse(pn.x, pn.y + 10, PAN_R * 2.1, PAN_R * 0.8);
        g.fillStyle(BRASS_DARK, 0.95 * fade); g.fillEllipse(pn.x, pn.y + 6 + drop, PAN_R * 2, PAN_R * 0.95);
        g.fillStyle(isHeavy ? dim(BRASS, 0.2) : lit(BRASS, 0.15), 0.9 * fade); g.fillEllipse(pn.x, pn.y + drop, PAN_R * 1.9, PAN_R * 0.85);
        g.lineStyle(2, lit(BRASS, 0.4), 0.8 * fade); g.strokeEllipse(pn.x, pn.y + drop, PAN_R * 1.9, PAN_R * 0.85);
        if (isHeavy) {
          for (let b = 0; b < 4; b++) ashlar(g, pn.x - 30 + (b % 2) * 30 + (b > 1 ? 15 : 0), pn.y + drop + 8 - (b > 1 ? 18 : 0), 0.85, 5, fade);
          if (live && k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.8); g.strokeEllipse(pn.x, pn.y + drop, PAN_R * 1.9, PAN_R * 0.85); }
        } else {
          g.fillStyle(0xffe2a8, (0.12 + Math.sin(time / 130) * 0.06) * fade); g.fillEllipse(pn.x, pn.y + drop, PAN_R * 1.7, PAN_R * 0.75);
        }
      });
    },
    drawAir(g, time) {
      const showing = live || time - settledAt < 800;
      if (!showing) return;
      const k = live ? clampN((time - bornAt) / Math.max(1, settleAt - bornAt), 0, 1) : 1;
      const fade = live ? Math.min(1, (time - bornAt) / 300) : 1 - (time - settledAt) / 800;
      // The beam, high over everything, tipping toward his pan as the weight goes on.
      const tilt = (heavy === 0 ? -1 : 1) * k * 0.12;
      const cx = 480, cy = FT + 24;
      const ex = Math.cos(tilt) * 250, ey = Math.sin(tilt) * 250;
      g.lineStyle(11, BRASS_DARK, fade); g.lineBetween(cx - ex, cy - ey, cx + ex, cy + ey);
      g.lineStyle(6, BRASS, fade); g.lineBetween(cx - ex, cy - ey - 1, cx + ex, cy + ey - 1);
      g.fillStyle(BRASS, fade); g.fillCircle(cx, cy, 12);
      g.fillStyle(BRASS_DARK, fade); g.fillCircle(cx, cy, 5);
      for (const [i, sx] of [[0, -1], [1, 1]] as [number, number][]) {
        const bx = cx + sx * ex, by = cy + sx * ey;
        const pn = PANS[i];
        const drop = i === heavy ? k * 8 : -k * 4;
        g.lineStyle(2, CHAIN, 0.9 * fade);
        g.lineBetween(bx, by, pn.x - PAN_R * 0.85, pn.y + drop);
        g.lineBetween(bx, by, pn.x + PAN_R * 0.85, pn.y + drop);
        g.lineBetween(bx, by, pn.x, pn.y - PAN_R * 0.4 + drop);
      }
    },
    onPhaseEnd() { live = false; settledAt = -9999; dropPan(); },
  };
};

// ── I. Plumb Lines ───────────────────────────────────────────────────
// Three lead plumb-bobs drop on lines from the dark and swing back and forth across the floor
// in rows — one on your row, one above, one below — out of step with each other. The track
// and the bob's shadow show first. A bob that catches you adds to the tithe.

const plumbLines = (tk: BossToolkit): SignatureMove => {
  const AMP = 330;
  const PERIOD = 2300;
  const BOB_R = 24;
  const SWING_MS = 5200;
  interface Bob { cx: number; y: number; ph: number; startAt: number; endAt: number; lastHit: number }
  let bobs: Bob[] = [];
  const pos = (b: Bob, time: number): number => b.cx + Math.sin(((time - b.startAt) / PERIOD) * Math.PI * 2 + b.ph) * AMP;
  return {
    durationMs: 2400,
    windupMs: 700,
    gesture: 'point',
    tell: 'PLUMB LINES',
    cast(time) {
      const p = tk.player;
      const rows = [p.y, p.y - 150, p.y + 150].map((y) => clampN(y, FT + 50, tk.H - 50));
      const start = time + tk.warn(950);
      bobs = rows.map((y, i) => ({ cx: 480, y, ph: i * 2.1 + Math.PI / 2, startAt: start, endAt: start + SWING_MS, lastHit: 0 }));
      tk.sfx('chain');
    },
    update(time) {
      const p = tk.player;
      for (const b of bobs) {
        if (time < b.startAt || time > b.endAt || !liveP(tk)) continue;
        const x = pos(b, time);
        if (dist(p.x, p.y, x, b.y) < BOB_R + PLAYER_R && time - b.lastHit > 700) {
          b.lastHit = time;
          tk.hitPlayer(13, p.x, p.y);
          addWeight(tk, 1);
          tk.sfx('anvil');
        }
      }
      bobs = bobs.filter((b) => time < b.endAt + 500);
    },
    drawGround(g, time) {
      for (const b of bobs) {
        const warm = time < b.startAt;
        const a = warm ? clampN(1 - (b.startAt - time) / 950, 0, 1) : time > b.endAt ? 1 - (time - b.endAt) / 500 : 1;
        // The track: a chalk line with tick-marks, the swing's ends marked.
        g.lineStyle(2, MORTAR, 0.25 * a); g.lineBetween(b.cx - AMP, b.y, b.cx + AMP, b.y);
        for (let x = b.cx - AMP; x <= b.cx + AMP; x += 55) { g.lineBetween(x, b.y - 5, x, b.y + 5); }
        const x = warm ? pos(b, b.startAt) : pos(b, time);
        g.fillStyle(0x000000, 0.35 * a); g.fillEllipse(x, b.y + 8, BOB_R * 2.1, BOB_R * 0.9);
        if (warm && Math.floor(time / 100) % 2 === 0) { g.lineStyle(2, 0xff9a7a, 0.6); g.strokeCircle(x, b.y, BOB_R + 4); }
      }
    },
    drawAir(g, time) {
      for (const b of bobs) {
        const warm = time < b.startAt;
        const a = time > b.endAt ? 1 - (time - b.endAt) / 500 : 1;
        const x = warm ? pos(b, b.startAt) : pos(b, time);
        const drop = warm ? (1 - clampN(1 - (b.startAt - time) / 950, 0, 1)) * 200 : 0;
        const by = b.y - 12 - drop;
        // The line from the dark (it pivots far above, so it leans with the swing).
        g.lineStyle(1.5, 0xd8d0c0, 0.7 * a); g.lineBetween(480 + (x - 480) * 0.25, FT, x, by - BOB_R);
        // The bob: a lead cone with a brass cap and a point.
        g.fillStyle(0x4a4a50, a);
        g.fillTriangle(x - BOB_R, by - BOB_R * 0.5, x + BOB_R, by - BOB_R * 0.5, x, by + BOB_R * 1.1);
        g.fillStyle(0x6a6a72, a); g.fillEllipse(x, by - BOB_R * 0.5, BOB_R * 2, BOB_R * 0.7);
        g.fillStyle(BRASS, a); g.fillEllipse(x, by - BOB_R * 0.7, BOB_R * 0.9, BOB_R * 0.35);
        g.fillStyle(0x8a8a92, 0.7 * a); g.fillTriangle(x - BOB_R * 0.5, by - BOB_R * 0.3, x - BOB_R * 0.2, by - BOB_R * 0.3, x - 2, by + BOB_R * 0.8);
      }
    },
    onPhaseEnd() { bobs = []; },
  };
};

// ── II. Interment ────────────────────────────────────────────────────
// A cell rises round you, three walls up and the door-slab coming last. Leave by the door
// before it shuts. If it shuts with you inside you are interred: mortar pours in and hurts
// until you shoulder a wall hard enough (lean into one for a second) to break it.

const interment = (tk: BossToolkit): SignatureMove => {
  const HALF = 92;
  const MAX_SEALED = 3600;
  interface Cell { x: number; y: number; door: 0 | 1 | 2 | 3; at: number; shutAt: number; sealed: boolean; broke: number; push: number[]; tick: number; gone: number }
  let cell: Cell | null = null;
  const sides = (c: Cell) => ({ x0: c.x - HALF, y0: c.y - HALF, x1: c.x + HALF, y1: c.y + HALF });
  const inside = (c: Cell): boolean => {
    const p = tk.player, s = sides(c);
    return p.x > s.x0 && p.x < s.x1 && p.y > s.y0 && p.y < s.y1;
  };
  const drawWall = (g: Gfx, x0: number, y0: number, x1: number, y1: number, h: number, a: number, cracked: number) => {
    const horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0);
    const w = horiz ? x1 - x0 : 18, hh = horiz ? 18 : y1 - y0;
    const x = horiz ? x0 : x0 - 9, y = horiz ? y0 - 9 : y0;
    g.fillStyle(0x000000, 0.3 * a); g.fillRect(x + 4, y + 6, w, hh);
    g.fillStyle(STONE_DARK, a); g.fillRect(x, y - h, w, hh + h);
    g.fillStyle(STONE, a); g.fillRect(x + 1, y - h, w - 2, Math.max(2, hh - 2));
    g.lineStyle(1, STONE_DARK, 0.9 * a);
    if (horiz) for (let xx = x + 16; xx < x + w; xx += 22) g.lineBetween(xx, y - h, xx, y + hh - 2);
    else for (let yy = y + 16; yy < y + hh; yy += 22) g.lineBetween(x, yy, x + w, yy);
    g.fillStyle(MORTAR, 0.5 * a); g.fillRect(x, y - h, w, 2);
    if (cracked > 0) {
      g.lineStyle(2, 0x1a1410, a);
      const mx = x + w / 2, my = y + hh / 2;
      for (let k = 0; k < 4; k++) g.lineBetween(mx, my, mx + Math.cos(k * 1.7) * 30 * cracked, my + Math.sin(k * 1.7) * 30 * cracked);
    }
  };
  return {
    durationMs: 3800,
    windupMs: 700,
    gesture: 'slam',
    tell: 'INTERMENT',
    cast(time) {
      const p = tk.player;
      const x = clampN(p.x, HALF + 40, tk.W - HALF - 40), y = clampN(p.y, FT + HALF + 20, tk.H - HALF - 30);
      const door = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
      cell = { x, y, door, at: time, shutAt: time + tk.warn(1450), sealed: false, broke: 0, push: [0, 0, 0, 0], tick: 0, gone: 0 };
      tk.sfx('stone-rise');
    },
    update(time, dt) {
      const c = cell;
      if (!c || c.gone) { if (c && time - c.gone > 700) cell = null; return; }
      if (!c.sealed && time >= c.shutAt) {
        if (liveP(tk) && inside(c)) {
          c.sealed = true;
          c.tick = time + 500;
          float(tk, c.x, c.y - HALF - 20, 'INTERRED', '#e8d8b8');
          tk.sfx('stone-slam');
        } else { c.gone = time; tk.sfx('stone-slam'); return; }
      }
      if (!c.sealed) return;
      // Walled in: kept inside; leaning on a wall cracks it. Mortar hurts until you are out.
      const s = sides(c);
      const pr = confine(tk, s.x0, s.y0, s.x1, s.y1);
      const lean = [pr.t, pr.r, pr.b, pr.l];
      for (let i = 0; i < 4; i++) c.push[i] = lean[i] ? c.push[i] + dt : Math.max(0, c.push[i] - dt * 0.5);
      if (time >= c.tick) { c.tick = time + 600; tk.hitPlayer(5, tk.player.x, tk.player.y); }
      const broke = c.push.findIndex((v) => v >= 0.9);
      if (broke >= 0 || time - c.shutAt > MAX_SEALED) {
        c.broke = broke >= 0 ? broke : c.door;
        c.gone = time;
        tk.boom(c.x, c.y, HALF, STONE_LIT);
        float(tk, tk.player.x, tk.player.y - 50, 'BROKE OUT', '#ffe2a8');
        tk.sfx('stone-slam');
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        carry(tk, dirs[c.broke][0] * 40, dirs[c.broke][1] * 40);
      }
    },
    drawGround(g, time) {
      const c = cell;
      if (!c) return;
      const s = sides(c);
      if (c.sealed && !c.gone) {
        // Mortar rising inside.
        const k = clampN((time - c.shutAt) / MAX_SEALED, 0, 1);
        g.fillStyle(MORTAR, 0.3 + k * 0.4); g.fillRect(s.x0, s.y0, HALF * 2, HALF * 2);
      } else if (!c.sealed) {
        const k = clampN((time - c.at) / Math.max(1, c.shutAt - c.at), 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.18); g.fillRect(s.x0, s.y0, HALF * 2, HALF * 2);
        // The door gap: a lit doorway on the floor, the way out.
        const dx = [c.x, s.x1, c.x, s.x0][c.door], dy = [s.y0, c.y, s.y1, c.y][c.door];
        g.fillStyle(0xffe2a8, 0.25 + Math.sin(time / 110) * 0.1); g.fillCircle(dx, dy, 34);
        if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.8); g.strokeRect(s.x0, s.y0, HALF * 2, HALF * 2); }
      }
    },
    drawAir(g, time) {
      const c = cell;
      if (!c) return;
      const s = sides(c);
      const k = clampN((time - c.at) / Math.max(1, c.shutAt - c.at), 0, 1);
      const fade = c.gone ? 1 - (time - c.gone) / 700 : 1;
      const walls: [number, number, number, number][] = [[s.x0, s.y0, s.x1, s.y0], [s.x1, s.y0, s.x1, s.y1], [s.x0, s.y1, s.x1, s.y1], [s.x0, s.y0, s.x0, s.y1]];
      walls.forEach(([a, b, cc, d], i) => {
        if (c.gone && i === c.broke) return;
        const isDoor = i === c.door;
        const h = isDoor ? (c.sealed ? 36 : Math.max(0, (k - 0.6) / 0.4) * 36) : Math.min(1, k * 1.8) * 36;
        if (h <= 0.5 && isDoor) return;
        drawWall(g, a, b, cc, d, h, clampN(fade, 0, 1), c.sealed && !c.gone ? clampN(c.push[i] / 0.9, 0, 1) : 0);
      });
      if (c.gone && c.broke >= 0) {
        const f = (time - c.gone) / 700;
        const [a, b, cc, d] = walls[c.broke];
        for (let i = 0; i < 10; i++) {
          const x = a + (cc - a) * (i / 9), y = b + (d - b) * (i / 9);
          g.fillStyle(STONE, 1 - f); g.fillRect(x - 6 + Math.sin(i) * f * 40, y - 6 - f * 30 + f * f * 60, 12, 10);
        }
      }
    },
    onPhaseEnd() { cell = null; },
  };
};

// ── II. The Gallery ──────────────────────────────────────────────────
// Partitions rise across the floor and it is a gallery of six cells. Then the ceiling-slab of
// each cell drops, end to end, starting from the cell he stands by. Run ahead of it — or turn
// and step into a cell that has already come down.

const gallery = (tk: BossToolkit): SignatureMove => {
  const N = 6;
  const STEP = 360;
  let cols: { x0: number; x1: number; slamAt: number; dealt: boolean }[] = [];
  let bornAt = 0;
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE GALLERY',
    cast(time) {
      bornAt = time;
      const cw = tk.W / N;
      const fromLeft = tk.bossX < tk.W / 2;
      const start = time + tk.warn(1150);
      cols = [];
      for (let i = 0; i < N; i++) {
        const order = fromLeft ? i : N - 1 - i;
        cols.push({ x0: i * cw, x1: (i + 1) * cw, slamAt: start + order * STEP, dealt: false });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const c of cols) {
        if (c.dealt || time < c.slamAt) continue;
        c.dealt = true;
        tk.sfx('stone-slam');
        if (liveP(tk) && p.x > c.x0 + 6 && p.x < c.x1 - 6) tk.hitPlayer(17, p.x, p.y);
      }
      if (cols.length && time > cols.reduce((m, c) => Math.max(m, c.slamAt), 0) + 900) cols = [];
    },
    drawGround(g, time) {
      for (const c of cols) {
        if (time < c.slamAt) {
          const k = clampN(1 - (c.slamAt - time) / Math.max(1, c.slamAt - bornAt), 0, 1);
          g.fillStyle(0x000000, 0.1 + k * 0.35); g.fillRect(c.x0, FT, c.x1 - c.x0, tk.H - FT);
          if (c.slamAt - time < 400 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.7); g.strokeRect(c.x0 + 4, FT + 4, c.x1 - c.x0 - 8, tk.H - FT - 8); }
        } else {
          const f = clampN((time - c.slamAt) / 900, 0, 1);
          g.fillStyle(STONE, 0.55 * (1 - f)); g.fillRect(c.x0, FT, c.x1 - c.x0, tk.H - FT);
          g.fillStyle(DUST, 0.4 * (1 - f));
          for (let i = 0; i < 6; i++) g.fillEllipse(c.x0 + 20 + i * ((c.x1 - c.x0 - 40) / 5), tk.H - 60 - (i % 2) * 220, 40, 12);
        }
      }
    },
    drawAir(g, time) {
      if (!cols.length) return;
      const rise = clampN((time - bornAt) / 400, 0, 1);
      // The partitions, a debt-plate on each, and each cell's slab hanging over it.
      for (let i = 1; i < N; i++) {
        const x = cols[i].x0;
        g.fillStyle(STONE_DARK, 0.95); g.fillRect(x - 7, FT, 14, (tk.H - FT) * rise);
        g.fillStyle(STONE, 0.95); g.fillRect(x - 5, FT, 10, (tk.H - FT) * rise);
        for (let y = FT + 26; y < FT + (tk.H - FT) * rise; y += 26) { g.lineStyle(1, STONE_DARK, 1); g.lineBetween(x - 5, y, x + 5, y); }
        g.fillStyle(BRASS, 0.9 * rise); g.fillRect(x - 5, FT + 120, 10, 7);
      }
      for (const c of cols) {
        if (time >= c.slamAt) continue;
        const k = clampN(1 - (c.slamAt - time) / 600, 0, 1);
        if (k <= 0) continue;
        // The slab coming down: drawn high and small, landing full-size.
        const inset = (1 - k) * 30;
        g.fillStyle(STONE_LIT, 0.25 + k * 0.5);
        g.fillRect(c.x0 + 8 + inset, FT + 10 + inset - (1 - k) * 60, c.x1 - c.x0 - 16 - inset * 2, tk.H - FT - 20 - inset * 2);
        g.lineStyle(2, STONE_DARK, 0.6 * k); g.strokeRect(c.x0 + 8 + inset, FT + 10 + inset - (1 - k) * 60, c.x1 - c.x0 - 16 - inset * 2, tk.H - FT - 20 - inset * 2);
      }
    },
    onPhaseEnd() { cols = []; },
  };
};

// ── II. Mortar and Trowel ────────────────────────────────────────────
// He flings trowel-loads of mortar in arcs round you; each lands as a wet pool that drags at
// your feet. Two seconds later it sets — whoever is standing in it then is set in it, held
// fast and hurt. Get out before the sheen goes off the top.

const mortarTrowel = (tk: BossToolkit): SignatureMove => {
  const R = 66;
  const FLY = 650;
  const WET = 2100;
  interface Load { sx: number; sy: number; x: number; y: number; at: number; land: number; setAt: number; done: boolean }
  let loads: Load[] = [];
  let heldUntil = 0;
  let held: { x: number; y: number } | null = null;
  return {
    durationMs: 2800,
    windupMs: 650,
    gesture: 'sweep',
    tell: 'MORTAR AND TROWEL',
    cast(time) {
      const p = tk.player;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const d = i === 0 ? 0 : 110 + Math.random() * 40;
        const x = tk.clampX(p.x + Math.cos(a) * d, 60), y = clampN(p.y + Math.sin(a) * d, FT + 60, tk.H - 60);
        const at = time + i * 140;
        loads.push({ sx: tk.bossX, sy: tk.bossY - 30, x, y, at, land: at + tk.warn(FLY), setAt: at + tk.warn(FLY) + WET, done: false });
      }
      tk.sfx('slime-splat');
    },
    update(time) {
      const p = tk.player;
      for (const l of loads) {
        if (time < l.land || l.done) continue;
        const inPool = liveP(tk) && dist(p.x, p.y, l.x, l.y) < R;
        if (time < l.setAt) {
          if (inPool) tk.slowPlayer(0.55, 120);
        } else {
          l.done = true;
          tk.sfx('stone-rise');
          if (inPool) {
            tk.hitPlayer(12, p.x, p.y);
            heldUntil = time + 1200;
            held = { x: p.x, y: p.y };
            float(tk, p.x, p.y - 50, 'SET IN MORTAR', '#e8e0c8');
          }
        }
      }
      if (held && time < heldUntil) confine(tk, held.x - 8, held.y - 8, held.x + 8, held.y + 8);
      else held = null;
      loads = loads.filter((l) => time < l.setAt + 1500);
    },
    drawGround(g, time) {
      for (const l of loads) {
        if (time < l.land) {
          const k = clampN((time - l.at) / Math.max(1, l.land - l.at), 0, 1);
          g.lineStyle(2, MORTAR, 0.3 + k * 0.5); g.strokeCircle(l.x, l.y, R * (0.5 + k * 0.5));
          continue;
        }
        const wet = time < l.setAt;
        const k = wet ? clampN((time - l.land) / WET, 0, 1) : 1;
        const f = wet ? 0 : clampN((time - l.setAt - 900) / 600, 0, 1);
        g.fillStyle(dim(MORTAR, 0.25), 0.9 * (1 - f)); g.fillEllipse(l.x, l.y + 3, R * 2.1, R * 1.25);
        g.fillStyle(wet ? MORTAR : dim(MORTAR, 0.1), 0.9 * (1 - f)); g.fillEllipse(l.x, l.y, R * 2, R * 1.15);
        if (wet) {
          // The sheen on wet mortar, going dull as it sets; a flicker at the end.
          g.fillStyle(0xffffff, 0.35 * (1 - k)); g.fillEllipse(l.x - 16, l.y - 10, R * 0.8, R * 0.25);
          if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.7); g.strokeEllipse(l.x, l.y, R * 2, R * 1.15); }
          // Trowel ridges.
          g.lineStyle(1.5, dim(MORTAR, 0.2), 0.7);
          for (let i = -2; i <= 2; i++) g.lineBetween(l.x - R * 0.7, l.y + i * 10, l.x + R * 0.7, l.y + i * 10 + 4);
        } else {
          g.lineStyle(1, dim(MORTAR, 0.4), 0.8 * (1 - f));
          for (let i = 0; i < 5; i++) g.lineBetween(l.x - 30 + i * 14, l.y - 16, l.x - 26 + i * 12, l.y + 18);
        }
      }
    },
    drawAir(g, time) {
      for (const l of loads) {
        if (time < l.at || time >= l.land) continue;
        const k = (time - l.at) / Math.max(1, l.land - l.at);
        const x = l.sx + (l.x - l.sx) * k, y = l.sy + (l.y - l.sy) * k - Math.sin(k * Math.PI) * 130;
        g.fillStyle(MORTAR, 1); g.fillCircle(x, y, 13);
        g.fillStyle(lit(MORTAR, 0.3), 1); g.fillCircle(x - 4, y - 4, 5);
        g.fillStyle(MORTAR, 0.5); g.fillCircle(x - (l.x - l.sx) * 0.03, y + 8, 6);
      }
      if (held && time < heldUntil) {
        const p = tk.player;
        g.fillStyle(MORTAR, 0.95); g.fillEllipse(p.x, p.y + 6, 50, 22);
        g.fillStyle(dim(MORTAR, 0.15), 1); g.fillEllipse(p.x, p.y + 10, 50, 10);
      }
    },
    onPhaseEnd() { loads = []; held = null; },
  };
};

// ── III. The Ceiling Comes In ────────────────────────────────────────
// The floor is twelve sections under twelve sections of roof. Cracks run through the roof in
// three waves and each cracked section comes down. One section never cracks — it is marked
// with a pillar of light through a gap — but every wave the rest change, so keep moving.

const ceilingFalls = (tk: BossToolkit): SignatureMove => {
  const C = 4, Rw = 3;
  const WARN = 1150;
  const GAP = 950;
  interface Sec { c: number; r: number; at: number; fallAt: number; dealt: boolean; seed: number }
  let secs: Sec[] = [];
  let safe = -1;
  const rect = (c: number, r: number) => {
    const w = tk.W / C, h = (tk.H - FT) / Rw;
    return { x: c * w, y: FT + r * h, w, h };
  };
  return {
    durationMs: 4200,
    windupMs: 700,
    gesture: 'flex',
    tell: 'THE CEILING COMES IN',
    cast(time) {
      const all: number[] = [];
      for (let i = 0; i < C * Rw; i++) all.push(i);
      safe = all[Math.floor(Math.random() * all.length)];
      const rest = all.filter((i) => i !== safe).sort(() => Math.random() - 0.5);
      const waves = [rest.slice(0, 4), rest.slice(4, 8), rest.slice(8)];
      secs = [];
      waves.forEach((wv, wi) => {
        for (const i of wv) {
          const at = time + wi * GAP;
          secs.push({ c: i % C, r: Math.floor(i / C), at, fallAt: at + tk.warn(WARN), dealt: false, seed: i * 31 + wi });
        }
      });
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const s of secs) {
        if (s.dealt || time < s.fallAt) continue;
        s.dealt = true;
        const r = rect(s.c, s.r);
        tk.sfx('stone-slam');
        if (liveP(tk) && p.x > r.x + 4 && p.x < r.x + r.w - 4 && p.y > r.y + 4 && p.y < r.y + r.h - 4) tk.hitPlayer(20, p.x, p.y);
      }
      if (secs.length && secs.every((s) => s.dealt && time > s.fallAt + 1200)) secs = [];
    },
    drawGround(g, time) {
      if (!secs.length) return;
      if (safe >= 0) {
        const r = rect(safe % C, Math.floor(safe / C));
        g.fillStyle(0xffe2a8, 0.08 + Math.sin(time / 200) * 0.03); g.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
      }
      for (const s of secs) {
        const r = rect(s.c, s.r);
        if (time < s.at) continue;
        if (time < s.fallAt) {
          const k = clampN((time - s.at) / Math.max(1, s.fallAt - s.at), 0, 1);
          g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
          // Cracks spreading out from the section's middle as the roof goes.
          const rng = mulberry(s.seed);
          g.lineStyle(2, 0x0a0806, 0.5 + k * 0.4);
          for (let i = 0; i < 6; i++) {
            let x = r.x + r.w / 2, y = r.y + r.h / 2;
            const a0 = rng() * Math.PI * 2;
            for (let j = 0; j < 4; j++) {
              const a = a0 + (rng() - 0.5) * 1.2, len = (12 + rng() * 26) * k;
              const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
              g.lineBetween(x, y, nx, ny); x = nx; y = ny;
            }
          }
          if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.7); g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8); }
        } else {
          const f = clampN((time - s.fallAt - 500) / 700, 0, 1);
          g.fillStyle(DUST_DEEP, 0.7 * (1 - f)); g.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
          if (f < 1) {
            const rng = mulberry(s.seed + 7);
            for (let i = 0; i < 4; i++) rubbleHeap(g, r.x + 30 + rng() * (r.w - 60), r.y + 30 + rng() * (r.h - 50), 0.8 * (1 - f * 0.5), rng);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const s of secs) {
        if (time < s.fallAt - 300 || time > s.fallAt + 200) continue;
        const r = rect(s.c, s.r);
        const k = clampN((time - (s.fallAt - 300)) / 300, 0, 1);
        // The roof section itself coming down: a slab with strata on its underside.
        const inset = (1 - k) * 26;
        g.fillStyle(STRATA[s.seed % STRATA.length], 0.4 + k * 0.5);
        g.fillRect(r.x + 6 + inset, r.y + 6 + inset - (1 - k) * 80, r.w - 12 - inset * 2, r.h - 12 - inset * 2);
        g.lineStyle(2, STONE_DEEP, 0.7);
        for (let yy = r.y + 20; yy < r.y + r.h - 10; yy += 18) g.lineBetween(r.x + 8 + inset, yy - (1 - k) * 80, r.x + r.w - 8 - inset, yy + 3 - (1 - k) * 80);
      }
    },
    onPhaseEnd() { secs = []; safe = -1; },
  };
};

// ── III. He Burrows ──────────────────────────────────────────────────
// He goes down into the floor. A ridge of heaved earth runs at you, a little faster than you
// walk, and stops; the ground there bulges and splits, and he comes up through it with a
// shower of rocks. Run when the ridge stops — the bulge shows where.

const burrow = (tk: BossToolkit): SignatureMove => {
  const DIG = 550;
  const RUN = 1500;
  const SURF = 750;
  const SPEED = 225;
  let stage: 'idle' | 'dig' | 'run' | 'surf' = 'idle';
  let stageAt = 0;
  let x = 0, y = 0;
  let trail: { x: number; y: number; at: number }[] = [];
  let bumped = false;
  let surfacedAt = -9999;
  return {
    durationMs: DIG + RUN + SURF + 500,
    windupMs: 500,
    gesture: 'slam',
    tell: 'HE BURROWS',
    locksBody: true,
    cast(time) {
      stage = 'dig'; stageAt = time;
      x = tk.bossX; y = tk.bossY;
      trail = []; bumped = false;
      BURROW.from = time; BURROW.until = time + DIG + RUN + tk.warn(SURF);
      tk.sfx('quake');
    },
    update(time, dt) {
      if (stage === 'idle') return;
      const p = tk.player;
      if (stage === 'dig' && time >= stageAt + DIG) { stage = 'run'; stageAt = time; }
      if (stage === 'run') {
        const a = Math.atan2(p.y - y, p.x - x);
        const d = dist(x, y, p.x, p.y);
        const stepLen = Math.min(d, SPEED * clampN(dt, 0, 0.05));
        x += Math.cos(a) * stepLen; y += Math.sin(a) * stepLen;
        x = tk.clampX(x); y = tk.clampY(y);
        tk.host.setBossPos(x, y);
        if (!trail.length || dist(trail[trail.length - 1].x, trail[trail.length - 1].y, x, y) > 16) trail.push({ x, y, at: time });
        if (!bumped && liveP(tk) && d < 34 + PLAYER_R) {
          bumped = true;
          tk.hitPlayer(10, p.x, p.y);
          carry(tk, Math.cos(a) * 50, Math.sin(a) * 50);
        }
        if (time >= stageAt + RUN) { stage = 'surf'; stageAt = time; tk.sfx('stone-rise'); }
      }
      if (stage === 'surf' && time >= stageAt + tk.warn(SURF)) {
        stage = 'idle';
        surfacedAt = time;
        BURROW.until = 0;
        tk.explode(x, y, 96, 22, EARTH_LIT);
        tk.sfx('explosion-medium');
        for (let i = 0; i < 10; i++) {
          tk.spawnBullet({ x, y, angle: (i / 10) * Math.PI * 2 + Math.random() * 0.2, speed: 250, damage: 9, r: 9, color: STONE_LIT, lifeMs: 2600 });
        }
      }
      trail = trail.filter((t) => time - t.at < 1800);
    },
    drawGround(g, time) {
      // The ridge of heaved earth behind him.
      for (const t of trail) {
        const f = (time - t.at) / 1800;
        g.fillStyle(EARTH, 0.7 * (1 - f)); g.fillEllipse(t.x, t.y, 44, 22);
        g.fillStyle(EARTH_LIT, 0.6 * (1 - f)); g.fillEllipse(t.x - 4, t.y - 4, 28, 10);
      }
      if (stage === 'surf') {
        const k = clampN((time - stageAt) / tk.warn(SURF), 0, 1);
        g.fillStyle(EARTH, 0.4 + k * 0.4); g.fillCircle(x, y, 40 + k * 56);
        g.lineStyle(3, 0xffc890, 0.4 + k * 0.5); g.strokeCircle(x, y, 96);
        g.lineStyle(2, 0x0a0806, 0.8);
        for (let i = 0; i < 7; i++) { const a = i * 0.9; g.lineBetween(x, y, x + Math.cos(a) * (30 + k * 60), y + Math.sin(a) * (30 + k * 60)); }
        if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.8); g.strokeCircle(x, y, 96); }
      }
      if (time - surfacedAt < 900) {
        const f = (time - surfacedAt) / 900;
        g.fillStyle(EARTH, 0.6 * (1 - f)); g.fillCircle(x, y, 100);
        rubbleHeap(g, x, y + 20, 1.6 * (1 - f * 0.4), mulberry(7));
      }
    },
    onPhaseEnd() { stage = 'idle'; trail = []; BURROW.until = 0; },
  };
};

// ── III. Fault Line ──────────────────────────────────────────────────
// A fault opens across the floor in a zigzag, passing through where you stand; the crack shows
// first. Then it goes off along its length from one end like a fuse, rock spitting up out of
// it; the side you are on lurches along it. Then a second fault, across the first.

const faultLine = (tk: BossToolkit): SignatureMove => {
  const SEGS = 9;
  const FUSE = 85;
  interface Fault { pts: { x: number; y: number }[]; at: number; fireAt: number; fired: boolean[]; hit: boolean; lurched: boolean }
  let faults: Fault[] = [];
  const open = (time: number, angle: number) => {
    const p = tk.player;
    const L = 1300;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const f = i / SEGS - 0.5;
      const zig = (i % 2 ? 1 : -1) * (14 + Math.random() * 18);
      pts.push({ x: p.x + ux * L * f - uy * zig, y: p.y + uy * L * f + ux * zig });
    }
    faults.push({ pts, at: time, fireAt: time + tk.warn(1050), fired: new Array(SEGS).fill(false), hit: false, lurched: false });
    tk.sfx('quake');
  };
  return {
    durationMs: 3600,
    windupMs: 650,
    gesture: 'slam',
    tell: 'FAULT LINE',
    cast(time) {
      const a = Math.random() * Math.PI;
      open(time, a);
      tk.schedule(1500, () => open(tk.now, a + Math.PI / 2 + (Math.random() - 0.5) * 0.5));
    },
    update(time) {
      const p = tk.player;
      for (const f of faults) {
        for (let i = 0; i < SEGS; i++) {
          if (f.fired[i] || time < f.fireAt + i * FUSE) continue;
          f.fired[i] = true;
          const a = f.pts[i], b = f.pts[i + 1];
          if (i % 3 === 0) tk.sfx('stone-rise');
          if (!f.hit && liveP(tk) && segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 26 + PLAYER_R * 0.6) {
            f.hit = true;
            tk.hitPlayer(16, p.x, p.y);
          }
        }
        if (!f.lurched && time >= f.fireAt + SEGS * FUSE + 80) {
          f.lurched = true;
          // The side you are on slides along the fault.
          const a = f.pts[0], b = f.pts[SEGS];
          const L = dist(a.x, a.y, b.x, b.y) || 1;
          const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
          const side = Math.sign((p.x - a.x) * uy - (p.y - a.y) * ux) || 1;
          carry(tk, ux * 50 * side, uy * 50 * side);
          tk.sfx('quake');
        }
      }
      faults = faults.filter((f) => time < f.fireAt + SEGS * FUSE + 1200);
    },
    drawGround(g, time) {
      for (const f of faults) {
        const k = clampN((time - f.at) / Math.max(1, f.fireAt - f.at), 0, 1);
        const shown = Math.ceil(k * SEGS);
        for (let i = 0; i < SEGS; i++) {
          const a = f.pts[i], b = f.pts[i + 1];
          const fired = f.fired[i];
          if (!fired && i >= shown) continue;
          const fade = fired ? clampN(1 - (time - (f.fireAt + i * FUSE)) / 1100, 0, 1) : 1;
          g.lineStyle(fired ? 16 : 6, 0x0a0806, 0.85 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(fired ? 6 : 2, fired ? 0xffa860 : 0xd8b890, (fired ? 0.8 : 0.5 + k * 0.4) * fade); g.lineBetween(a.x, a.y, b.x, b.y);
          if (!fired && k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(26 * 2, 0xff9a7a, 0.08); g.lineBetween(a.x, a.y, b.x, b.y); }
        }
      }
    },
    drawAir(g, time) {
      // Rock spitting up out of the crack as the fuse runs.
      for (const f of faults) {
        for (let i = 0; i < SEGS; i++) {
          const t0 = f.fireAt + i * FUSE;
          if (time < t0 || time > t0 + 600) continue;
          const k = (time - t0) / 600;
          const a = f.pts[i], b = f.pts[i + 1];
          for (let j = 0; j < 4; j++) {
            const m = (j + 0.5) / 4;
            const x = a.x + (b.x - a.x) * m + Math.sin(j * 2.3 + i) * 10, y = a.y + (b.y - a.y) * m - Math.sin(k * Math.PI) * (30 + j * 8);
            g.fillStyle(j % 2 ? STONE : EARTH_LIT, 1 - k); g.fillRect(x - 5, y - 5, 10, 8);
          }
        }
      }
    },
    onPhaseEnd() { faults = []; },
  };
};

// ── IV. Earth Pours In ───────────────────────────────────────────────
// Earth pours in at every edge and the floor shrinks to one box (outlined first). Outside it
// the earth is up to your waist — slow, and it hurts. It holds, then slumps back.

const earthPours = (tk: BossToolkit): SignatureMove => {
  const WARN = 900;
  const FILL = 2000;
  const HOLD = 1700;
  const SLUMP = 900;
  const BW = 360, BH = 250;
  let at = 0;
  let bx = 0, by = 0;
  let live = false;
  let tick = 0;
  const box = (time: number): { x0: number; y0: number; x1: number; y1: number } => {
    const t = time - at - tk.warn(WARN);
    const k = t < 0 ? 0 : t < FILL ? t / FILL : t < FILL + HOLD ? 1 : Math.max(0, 1 - (t - FILL - HOLD) / SLUMP);
    const e = k * k * (3 - 2 * k);
    return {
      x0: e * (bx - BW / 2), y0: FT + e * (by - BH / 2 - FT),
      x1: tk.W - e * (tk.W - bx - BW / 2), y1: tk.H - e * (tk.H - by - BH / 2),
    };
  };
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'raise',
    tell: 'EARTH POURS IN',
    cast(time) {
      at = time; live = true; tick = 0;
      const p = tk.player;
      // The box is never quite where you are — you will have to walk to it.
      const a = Math.random() * Math.PI * 2;
      bx = clampN(p.x + Math.cos(a) * 170, BW / 2 + 30, tk.W - BW / 2 - 30);
      by = clampN(p.y + Math.sin(a) * 120, FT + BH / 2 + 20, tk.H - BH / 2 - 20);
      tk.sfx('quake');
    },
    update(time) {
      if (!live) return;
      if (time > at + tk.warn(WARN) + FILL + HOLD + SLUMP) { live = false; return; }
      if (time < at + tk.warn(WARN)) return;
      const b = box(time);
      const p = tk.player;
      const out = p.x < b.x0 + 12 || p.x > b.x1 - 12 || p.y < b.y0 + 12 || p.y > b.y1 - 12;
      if (out && liveP(tk)) {
        tk.slowPlayer(0.6, 150);
        if (time >= tick) { tick = time + 420; tk.hitPlayer(6, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      if (!live) return;
      if (time < at + tk.warn(WARN)) {
        const k = (time - at) / tk.warn(WARN);
        g.lineStyle(3, 0xffe2a8, 0.4 + k * 0.4); g.strokeRect(bx - BW / 2, by - BH / 2, BW, BH);
        if (Math.floor(time / 110) % 2 === 0) { g.fillStyle(0xffe2a8, 0.08); g.fillRect(bx - BW / 2, by - BH / 2, BW, BH); }
        return;
      }
      const b = box(time);
      // The earth: four tongues of soil with a lumpy, sliding edge.
      g.fillStyle(EARTH, 0.92);
      g.fillRect(0, FT, b.x0, tk.H - FT); g.fillRect(b.x1, FT, tk.W - b.x1, tk.H - FT);
      g.fillRect(b.x0, FT, b.x1 - b.x0, b.y0 - FT); g.fillRect(b.x0, b.y1, b.x1 - b.x0, tk.H - b.y1);
      g.fillStyle(EARTH_LIT, 0.85);
      for (let i = 0; i < 18; i++) {
        const f = i / 17;
        const wob = Math.sin(time / 180 + i * 1.7) * 5;
        g.fillCircle(b.x0 + wob, b.y0 + (b.y1 - b.y0) * f, 12); g.fillCircle(b.x1 + wob, b.y0 + (b.y1 - b.y0) * f, 12);
        g.fillCircle(b.x0 + (b.x1 - b.x0) * f, b.y0 + wob, 12); g.fillCircle(b.x0 + (b.x1 - b.x0) * f, b.y1 + wob, 12);
      }
      // Stones and roots and the odd bone carried in with it.
      const rng = mulberry(11);
      for (let i = 0; i < 40; i++) {
        const x = rng() * tk.W, y = FT + rng() * (tk.H - FT);
        if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) continue;
        g.fillStyle(rng() < 0.2 ? BONE : rng() < 0.5 ? STONE : dim(EARTH, 0.3), 0.8); g.fillEllipse(x + Math.sin(time / 400 + i) * 3, y, 6 + rng() * 8, 4 + rng() * 4);
      }
    },
    drawAir(g, time) {
      if (!live || time < at + tk.warn(WARN)) return;
      // The pours themselves: four falls of earth from the edges of the roof.
      for (const [x, y] of [[0, (FT + tk.H) / 2], [tk.W, (FT + tk.H) / 2], [tk.W / 2, FT], [tk.W / 2, tk.H]] as [number, number][]) {
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 300) + i / 6) % 1;
          g.fillStyle(EARTH_LIT, 0.7 * (1 - ph));
          g.fillCircle(x + (tk.W / 2 - x) * 0.06 * ph + Math.sin(i * 2) * 20, y + (y === FT ? 1 : y === tk.H ? -1 : 0) * ph * 30 + Math.cos(i * 3) * 30, 9 - ph * 4);
        }
      }
    },
    onPhaseEnd() { live = false; },
  };
};

// ── IV. Six Feet ─────────────────────────────────────────────────────
// He digs graves in a ring round you — six open pits, one after another. Each grave's spoil is
// thrown at you as it is dug. Open graves are pits: step into one and you fall in, hurt. The
// ring has gaps; the graves fill back in after a few seconds.

const sixFeet = (tk: BossToolkit): SignatureMove => {
  const N = 6;
  const RING = 165;
  const GW = 46, GH = 80;
  const OPEN = 3200;
  interface Grave { x: number; y: number; a: number; dugAt: number; thrown: boolean; fell: boolean }
  let graves: Grave[] = [];
  const inGrave = (gr: Grave, x: number, y: number): boolean => {
    const dx = x - gr.x, dy = y - gr.y;
    const c = Math.cos(-gr.a), s = Math.sin(-gr.a);
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) < GW / 2 + 4 && Math.abs(ly) < GH / 2 + 4;
  };
  return {
    durationMs: 3000,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'SIX FEET',
    cast(time) {
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      graves = [];
      for (let i = 0; i < N; i++) {
        const a = a0 + (i / N) * Math.PI * 2;
        graves.push({
          x: clampN(p.x + Math.cos(a) * RING, 50, tk.W - 50), y: clampN(p.y + Math.sin(a) * RING, FT + 50, tk.H - 50),
          a, dugAt: time + tk.warn(500) + i * 230, thrown: false, fell: false,
        });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const gr of graves) {
        if (time < gr.dugAt) continue;
        if (!gr.thrown) {
          gr.thrown = true;
          tk.sfx('rock-throw');
          tk.spawnBullet({ x: gr.x, y: gr.y, angle: Math.atan2(p.y - gr.y, p.x - gr.x), speed: 300, damage: 10, r: 13, color: EARTH_LIT, lifeMs: 2200 });
        }
        if (!gr.fell && time < gr.dugAt + OPEN && liveP(tk) && inGrave(gr, p.x, p.y)) {
          gr.fell = true;
          tk.hitPlayer(12, p.x, p.y);
          tk.slowPlayer(0.5, 900);
          float(tk, p.x, p.y - 48, 'IN THE GRAVE', '#d8c0a0');
        }
      }
      graves = graves.filter((gr) => time < gr.dugAt + OPEN + 600);
    },
    drawGround(g, time) {
      for (const gr of graves) {
        const c = Math.cos(gr.a), s = Math.sin(gr.a);
        const P = (lx: number, ly: number) => ({ x: gr.x + lx * c - ly * s, y: gr.y + lx * s + ly * c });
        const poly = (w: number, h: number) => [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];
        if (time < gr.dugAt) {
          const k = clampN(1 - (gr.dugAt - time) / 700, 0, 1);
          g.lineStyle(2, DUST, 0.3 + k * 0.6); g.strokePoints(poly(GW, GH), true, true);
          continue;
        }
        const fill = clampN((time - gr.dugAt - OPEN) / 600, 0, 1);
        // The spoil heap at the head, then the pit: dark, with the cut sides lit.
        const head = P(0, -GH / 2 - 14);
        g.fillStyle(EARTH, 0.9 * (1 - fill)); g.fillEllipse(head.x, head.y, GW * 1.4, 18);
        g.fillStyle(SOOT, 0.95 * (1 - fill)); g.fillPoints(poly(GW, GH), true, true);
        g.fillStyle(EARTH, 0.9 * (1 - fill)); g.fillPoints([P(-GW / 2, -GH / 2), P(GW / 2, -GH / 2), P(GW / 2 - 5, -GH / 2 + 10), P(-GW / 2 + 5, -GH / 2 + 10)], true, true);
        g.lineStyle(2, EARTH_LIT, 0.8 * (1 - fill)); g.strokePoints(poly(GW, GH), true, true);
        if (fill > 0) { g.fillStyle(EARTH_LIT, fill); g.fillPoints(poly(GW * fill, GH * fill), true, true); }
      }
    },
    drawAir(g, time) {
      // The spade, flicking the earth out of each grave as it is dug.
      for (const gr of graves) {
        const k = (time - gr.dugAt + 300) / 400;
        if (k < 0 || k > 1) continue;
        const x = gr.x, y = gr.y - 40 - Math.sin(k * Math.PI) * 30;
        g.lineStyle(3, 0x4a3624, 1 - k); g.lineBetween(x - 10, y - 20, x + 8, y + 10);
        g.fillStyle(IRON, 1 - k); g.fillTriangle(x + 4, y + 8, x + 16, y + 6, x + 12, y + 24);
        for (let i = 0; i < 5; i++) { g.fillStyle(EARTH_LIT, 1 - k); g.fillCircle(x + 10 + i * 6 * k, y + 10 - i * 8 * k, 3); }
      }
    },
    onPhaseEnd() { graves = []; },
  };
};

// ── IV. Headstones ───────────────────────────────────────────────────
// A row of headstones rises across the floor between you and him, and they topple toward you
// one after the next, falling flat — each one's footprint is shown on the floor as it starts
// to lean. Then a second row, nearer.

const headstones = (tk: BossToolkit): SignatureMove => {
  const N = 7;
  const SLAB_W = 54, SLAB_L = 130;
  const LEAN = 820;
  const STEP = 170;
  interface Stone { x: number; y: number; a: number; fallAt: number; bornAt: number; dealt: boolean }
  let stones: Stone[] = [];
  const row = (time: number, dFromBoss: number) => {
    const p = tk.player;
    const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
    const cx = tk.bossX + Math.cos(a) * dFromBoss, cy = tk.bossY + Math.sin(a) * dFromBoss;
    const px = -Math.sin(a), py = Math.cos(a);
    for (let i = 0; i < N; i++) {
      const f = i - (N - 1) / 2;
      const x = cx + px * f * (SLAB_W + 14), y = cy + py * f * (SLAB_W + 14);
      if (x < 30 || x > tk.W - 30 || y < FT + 20 || y > tk.H - 20) continue;
      stones.push({ x, y, a, bornAt: time, fallAt: time + tk.warn(LEAN) + i * STEP, dealt: false });
    }
  };
  const inFall = (s: Stone, x: number, y: number): boolean => {
    const dx = x - s.x, dy = y - s.y;
    const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
    const across = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
    return along > -10 && along < SLAB_L + 10 && Math.abs(across) < SLAB_W / 2 + PLAYER_R * 0.6;
  };
  return {
    durationMs: 3400,
    windupMs: 650,
    gesture: 'point',
    tell: 'HEADSTONES',
    cast(time) {
      stones = [];
      const d = dist(tk.bossX, tk.bossY, tk.player.x, tk.player.y);
      row(time, Math.max(80, d - 150));
      tk.schedule(1300, () => row(tk.now, Math.max(60, dist(tk.bossX, tk.bossY, tk.player.x, tk.player.y) - 90)));
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const s of stones) {
        if (s.dealt || time < s.fallAt) continue;
        s.dealt = true;
        tk.sfx('stone-slam');
        if (liveP(tk) && inFall(s, p.x, p.y)) tk.hitPlayer(18, p.x, p.y);
      }
      stones = stones.filter((s) => time < s.fallAt + 1200);
    },
    drawGround(g, time) {
      for (const s of stones) {
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        const P = (al: number, ac: number) => ({ x: s.x + al * c - ac * sn, y: s.y + al * sn + ac * c });
        const foot = [P(0, -SLAB_W / 2), P(SLAB_L, -SLAB_W / 2), P(SLAB_L, SLAB_W / 2), P(0, SLAB_W / 2)];
        if (time < s.fallAt) {
          const k = clampN(1 - (s.fallAt - time) / Math.max(1, s.fallAt - s.bornAt), 0, 1);
          g.fillStyle(0x000000, 0.1 + k * 0.3); g.fillPoints(foot, true, true);
          if (s.fallAt - time < 350 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(2, 0xff9a7a, 0.8); g.strokePoints(foot, true, true); }
        } else {
          // Fallen flat: the slab lying on its face, cracked, then sinking into the dust.
          const f = clampN((time - s.fallAt - 400) / 800, 0, 1);
          g.fillStyle(STONE_DARK, 1 - f); g.fillPoints(foot, true, true);
          g.fillStyle(STONE, 1 - f); g.fillPoints([P(4, -SLAB_W / 2 + 4), P(SLAB_L - 4, -SLAB_W / 2 + 4), P(SLAB_L - 4, SLAB_W / 2 - 4), P(4, SLAB_W / 2 - 4)], true, true);
          const m1 = P(SLAB_L * 0.45, -SLAB_W / 2 + 4), m2 = P(SLAB_L * 0.55, SLAB_W / 2 - 4);
          g.lineStyle(2, STONE_DEEP, 1 - f); g.lineBetween(m1.x, m1.y, m2.x, m2.y);
          if (time - s.fallAt < 300) { g.fillStyle(DUST, 0.6 * (1 - (time - s.fallAt) / 300)); g.fillPoints(foot.map((q) => ({ x: q.x + (q.x - s.x) * 0.1, y: q.y + (q.y - s.y) * 0.1 })), true, true); }
        }
      }
    },
    drawAir(g, time) {
      for (const s of stones) {
        if (time >= s.fallAt) continue;
        const rise = clampN((time - s.bornAt) / 350, 0, 1);
        const k = clampN(1 - (s.fallAt - time) / Math.max(1, s.fallAt - s.bornAt), 0, 1);
        // Standing, then leaning further and further toward you.
        headstone(g, s.x, s.y, 1.6 * rise, s.a > -Math.PI / 2 && s.a < Math.PI / 2 ? k * 0.8 : -k * 0.8, rise);
      }
    },
    onPhaseEnd() { stones = []; },
  };
};

// ── V. The Lid ───────────────────────────────────────────────────────
// The Old King's lid comes off — the box is empty — and he hurls the slab across the room.
// Its path, two bounces off the walls, is chalked first. After the first throw the open,
// empty sarcophagus stays on the throne for the rest of the fight.

const theLid = (tk: BossToolkit): SignatureMove => {
  const SPEED = 540;
  const HALF = 34;
  let path: { x: number; y: number }[] = [];
  let at = 0, goAt = 0;
  let hit = false;
  let thrown = false;
  let live = false;
  let total = 0;
  const posAt = (d: number): { x: number; y: number; a: number } => {
    let left = d;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const L = dist(a.x, a.y, b.x, b.y);
      if (left <= L) { const f = left / Math.max(1, L); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: Math.atan2(b.y - a.y, b.x - a.x) }; }
      left -= L;
    }
    const e = path[path.length - 1];
    return { x: e.x, y: e.y, a: 0 };
  };
  return {
    durationMs: 3000,
    windupMs: 800,
    gesture: 'sweep',
    tell: 'THE LID',
    cast(time) {
      const p = tk.player;
      let x = tk.bossX, y = tk.bossY;
      let a = Math.atan2(p.y - y, p.x - x);
      path = [{ x, y }];
      // Trace two bounces off the field's walls.
      for (let b = 0; b < 3; b++) {
        let best = Infinity;
        let nx = x, ny = y, flipX = false;
        const vx = Math.cos(a), vy = Math.sin(a);
        const tryT = (t: number, fx: boolean) => { if (t > 1 && t < best) { best = t; nx = x + vx * t; ny = y + vy * t; flipX = fx; } };
        if (vx > 0) tryT((tk.W - 40 - x) / vx, true); if (vx < 0) tryT((40 - x) / vx, true);
        if (vy > 0) tryT((tk.H - 40 - y) / vy, false); if (vy < 0) tryT((FT + 30 - y) / vy, false);
        if (best === Infinity) break;
        path.push({ x: nx, y: ny });
        x = nx; y = ny;
        a = flipX ? Math.PI - a : -a;
      }
      total = 0;
      for (let i = 0; i < path.length - 1; i++) total += dist(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      at = time; goAt = time + tk.warn(950); hit = false; live = true;
      tk.sfx('stone-rise');
    },
    update(time) {
      if (!live || time < goAt) return;
      const d = ((time - goAt) / 1000) * SPEED;
      if (d >= total) { live = false; tk.boom(path[path.length - 1].x, path[path.length - 1].y, 60, STONE_LIT); tk.sfx('stone-slam'); return; }
      if (!thrown) { thrown = true; tk.sfx('whoosh'); }
      const q = posAt(d);
      const p = tk.player;
      if (!hit && liveP(tk) && dist(p.x, p.y, q.x, q.y) < HALF + PLAYER_R + 10) { hit = true; tk.hitPlayer(24, p.x, p.y); }
    },
    drawGround(g, time) {
      // Once thrown, the empty box on the throne for good.
      if (thrown) {
        sarcophagus(g, THRONE.x, THRONE.y + 46, 150, 104, 1, true, 1);
        g.fillStyle(0xe8dcc0, 1); g.fillRect(THRONE.x - 8, THRONE.y - 4, 16, 11);
        g.lineStyle(0.8, 0x6a5a48, 1); g.lineBetween(THRONE.x - 5, THRONE.y, THRONE.x + 5, THRONE.y); g.lineBetween(THRONE.x - 5, THRONE.y + 3, THRONE.x + 3, THRONE.y + 3);
      }
      if (!live) return;
      const k = clampN((time - at) / Math.max(1, goAt - at), 0, 1);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        g.lineStyle(HALF * 2, 0xffe2a8, time < goAt ? 0.05 + k * 0.1 : 0.05); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(2, MORTAR, 0.5 + k * 0.4); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      if (time < goAt && k > 0.8 && Math.floor(time / 90) % 2 === 0) {
        for (let i = 0; i < path.length - 1; i++) { g.lineStyle(3, 0xff9a7a, 0.6); g.lineBetween(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y); }
      }
    },
    drawAir(g, time) {
      if (!live) return;
      const d = time < goAt ? 0 : ((time - goAt) / 1000) * SPEED;
      const q = posAt(d);
      const spin = time < goAt ? 0 : (time - goAt) / 90;
      const c = Math.cos(spin), s = Math.sin(spin);
      const P = (x: number, y: number) => ({ x: q.x + x * c - y * s, y: q.y - (time < goAt ? 40 : 18) + x * s + y * c });
      g.fillStyle(0x000000, 0.3); g.fillEllipse(q.x, q.y + 10, 90, 28);
      g.fillStyle(STONE_DARK, 1); g.fillPoints([P(-58, -26), P(58, -26), P(58, 26), P(-58, 26)], true, true);
      g.fillStyle(STONE_LIT, 1); g.fillPoints([P(-54, -22), P(54, -22), P(54, 22), P(-54, 22)], true, true);
      // The Old King's effigy on it, crowned.
      const hd = P(-38, 0);
      g.fillStyle(lit(STONE, 0.2), 1); g.fillCircle(hd.x, hd.y, 9);
      const b1 = P(-26, -12), b2 = P(40, -16), b3 = P(40, 16), b4 = P(-26, 12);
      g.fillStyle(lit(STONE, 0.1), 1); g.fillPoints([b1, b2, b3, b4], true, true);
      const cr = P(-48, 0);
      g.fillStyle(BRASS, 1); g.fillCircle(cr.x, cr.y, 5);
    },
    onPhaseEnd() { live = false; },
  };
};

// ── V. Strata ────────────────────────────────────────────────────────
// The floor shears into five bands of rock and they slide, each its own way, carrying whatever
// stands on them. Ride a band into the wall and the rock grinds you. Arrows show which way
// each band will go. Walk against it, or step onto a band going the other way.

const strata = (tk: BossToolkit): SignatureMove => {
  const N = 5;
  const WARN = 900;
  const SLIDE = 2600;
  const SPEED = 150;
  let bands: { y0: number; y1: number; v: number; ground: boolean }[] = [];
  let at = 0;
  let live = false;
  let shift: number[] = [];
  let crushed = false;
  let crushTick = 0;
  return {
    durationMs: 3500,
    windupMs: 700,
    gesture: 'flex',
    tell: 'STRATA',
    cast(time) {
      const h = (tk.H - FT) / N;
      bands = [];
      for (let i = 0; i < N; i++) bands.push({ y0: FT + i * h, y1: FT + (i + 1) * h, v: (i % 2 ? 1 : -1) * SPEED * (0.8 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1), ground: false });
      shift = new Array(N).fill(0);
      at = time; live = true; crushed = false; crushTick = 0;
      tk.sfx('quake');
    },
    update(time, dt) {
      if (!live) return;
      const t = time - at - tk.warn(WARN);
      if (t > SLIDE) { live = false; return; }
      if (t < 0) return;
      const s = clampN(dt, 0, 0.05);
      const p = tk.player;
      bands.forEach((b, i) => {
        shift[i] += b.v * s;
        if (liveP(tk) && p.y >= b.y0 && p.y < b.y1) {
          carry(tk, b.v * s, 0);
          // Carried into the side of the hold: the rock grinds you.
          const atWall = (b.v < 0 && p.x <= 41) || (b.v > 0 && p.x >= tk.W - 41);
          if (atWall && time >= crushTick) {
            crushTick = time + 650;
            tk.hitPlayer(crushed ? 7 : 16, p.x, p.y);
            if (!crushed) float(tk, p.x, p.y - 50, 'GROUND IN THE ROCK', '#d8b890');
            crushed = true;
          }
        }
      });
    },
    drawGround(g, time) {
      if (!live) return;
      const t = time - at - tk.warn(WARN);
      bands.forEach((b, i) => {
        const c = STRATA[(i * 2 + 1) % STRATA.length];
        const off = ((shift[i] % 60) + 60) % 60;
        g.fillStyle(c, t < 0 ? 0.18 : 0.42); g.fillRect(0, b.y0, tk.W, b.y1 - b.y0);
        // Bedding lines and pebbles that travel with the band.
        g.lineStyle(1.5, dim(c, 0.35), 0.7);
        for (let x = -60 + off; x < tk.W + 60; x += 60) {
          g.lineBetween(x, b.y0 + 10, x + 40, b.y0 + 14);
          g.lineBetween(x + 20, b.y1 - 14, x + 56, b.y1 - 10);
          g.fillStyle(lit(c, 0.2), 0.7); g.fillEllipse(x + 30, (b.y0 + b.y1) / 2, 8, 4);
        }
        // The seams grinding.
        g.lineStyle(4, STONE_DEEP, 0.8); g.lineBetween(0, b.y0, tk.W, b.y0);
        // Arrows: which way this band is going.
        const dir = Math.sign(b.v);
        const ay = (b.y0 + b.y1) / 2;
        g.lineStyle(3, t < 0 ? 0xffe2a8 : lit(c, 0.4), t < 0 ? 0.6 + Math.sin(time / 90) * 0.3 : 0.5);
        for (let x = 80; x < tk.W; x += 200) {
          const ox = t < 0 ? 0 : ((shift[i] * 0.5) % 200);
          g.lineBetween(x + ox - dir * 14, ay - 12, x + ox + dir * 6, ay); g.lineBetween(x + ox + dir * 6, ay, x + ox - dir * 14, ay + 12);
        }
        // Where the band runs into the wall, the rock heaps up.
        if (t >= 0) {
          const wx = dir < 0 ? 0 : tk.W - 30;
          g.fillStyle(dim(c, 0.2), 0.9); g.fillRect(wx, b.y0 + 2, 30, b.y1 - b.y0 - 4);
          g.fillStyle(DUST, 0.5); for (let k = 0; k < 4; k++) g.fillCircle(wx + 15 + Math.sin(time / 60 + k) * 6, b.y0 + 12 + k * ((b.y1 - b.y0 - 20) / 3), 5);
        }
      });
    },
    onPhaseEnd() { live = false; },
  };
};

// ── V. Orogeny ───────────────────────────────────────────────────────
// A chain of peaks thrusts up out of the floor one after another, each a little nearer to
// where you are now. The ground swells first where each will break. Step off its line.

const orogeny = (tk: BossToolkit): SignatureMove => {
  const N = 10;
  const STEP = 230;
  const GAP = 78;
  const R = 46;
  interface Peak { x: number; y: number; at: number; fireAt: number; dealt: boolean }
  let peaks: Peak[] = [];
  let cx = 0, cy = 0;
  return {
    durationMs: N * STEP + 900,
    windupMs: 650,
    gesture: 'slam',
    tell: 'OROGENY',
    cast(time) {
      peaks = [];
      cx = tk.bossX; cy = tk.bossY;
      for (let i = 0; i < N; i++) {
        tk.schedule(i * STEP, () => {
          const p = tk.player;
          const a = Math.atan2(p.y - cy, p.x - cx);
          cx = tk.clampX(cx + Math.cos(a) * GAP, 40); cy = tk.clampY(cy + Math.sin(a) * GAP, 40);
          peaks.push({ x: cx, y: cy, at: tk.now, fireAt: tk.now + tk.warn(650), dealt: false });
        });
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const k of peaks) {
        if (k.dealt || time < k.fireAt) continue;
        k.dealt = true;
        tk.sfx('stone-rise');
        if (liveP(tk) && dist(p.x, p.y, k.x, k.y) < R + PLAYER_R * 0.7) tk.hitPlayer(18, p.x, p.y);
      }
      peaks = peaks.filter((k) => time < k.fireAt + 1400);
    },
    drawGround(g, time) {
      for (const k of peaks) {
        if (time < k.fireAt) {
          const f = clampN((time - k.at) / Math.max(1, k.fireAt - k.at), 0, 1);
          g.fillStyle(EARTH, 0.25 + f * 0.4); g.fillCircle(k.x, k.y, R * (0.5 + f * 0.5));
          g.lineStyle(2, 0xffc890, 0.3 + f * 0.6); g.strokeCircle(k.x, k.y, R);
          g.lineStyle(1.5, 0x0a0806, 0.7);
          for (let i = 0; i < 5; i++) { const a = i * 1.26; g.lineBetween(k.x, k.y, k.x + Math.cos(a) * R * f, k.y + Math.sin(a) * R * f); }
        }
      }
    },
    drawAir(g, time) {
      for (const k of peaks) {
        if (time < k.fireAt) continue;
        const f = clampN((time - k.fireAt) / 160, 0, 1);
        const fade = clampN(1 - (time - k.fireAt - 900) / 500, 0, 1);
        const h = 70 * f;
        // A peak of banded rock, snow of dust on its tip.
        g.fillStyle(0x000000, 0.3 * fade); g.fillEllipse(k.x, k.y + 6, R * 2, R * 0.6);
        g.fillStyle(STRATA[3], fade); g.fillTriangle(k.x - R, k.y + 4, k.x + R, k.y + 4, k.x + 6, k.y - h);
        g.fillStyle(STRATA[0], fade); g.fillTriangle(k.x - R * 0.2, k.y + 4, k.x + R, k.y + 4, k.x + 6, k.y - h);
        g.lineStyle(2, STRATA[5], fade);
        for (let j = 1; j < 4; j++) { const yy = k.y + 4 - (h * j) / 4; const hw = R * (1 - j / 4); g.lineBetween(k.x - hw + 6 * (j / 4), yy, k.x + hw + 6 * (j / 4), yy); }
        g.fillStyle(DUST, fade); g.fillTriangle(k.x - 6, k.y - h + 14, k.x + 14, k.y - h + 12, k.x + 6, k.y - h);
      }
    },
    onPhaseEnd() { peaks = []; },
  };
};

// ── Decor ────────────────────────────────────────────────────────────

/**
 * The Regent over his rig: a steward's chain of office with a little pair of scales hung on it,
 * the Old King's crown tied at his belt (he has never once put it on), and a grave-spade in his
 * hand. Mortar on him while he is walling people in; earth falling off him as he burrows; half
 * buried in his own pour at the end; and as the mountain, strata across his body and peaks on
 * his shoulders, the crown jammed onto a summit at last.
 */
function drawGravane(g: Gfx, s: BossBodyState): void {
  const { x, y, radius: r, t, phaseIdx: ph } = s;
  const h0 = s.hands[0], h1 = s.hands[1] ?? s.hands[0];
  // While burrowed, a heap of earth over him is all you see.
  if (BURROW.until > 0 && t < BURROW.until && t > BURROW.from + 300) {
    g.fillStyle(EARTH, 1); g.fillEllipse(x, y + r * 0.4, r * 2.6, r * 1.5);
    g.fillStyle(EARTH_LIT, 1); g.fillEllipse(x - r * 0.3, y + r * 0.1, r * 1.4, r * 0.7);
    for (let i = 0; i < 6; i++) { g.fillStyle(STONE, 1); g.fillRect(x - r + i * r * 0.4, y + r * 0.2 + Math.sin(t / 90 + i) * 3, 8, 6); }
    return;
  }
  if (ph === 4) {
    // The mountain: strata bands across the body, two peaks on the shoulders.
    for (let k = 0; k < 5; k++) {
      g.fillStyle(STRATA[k * 2 % STRATA.length], 0.55);
      g.fillEllipse(x, y - r * 0.6 + k * r * 0.32, r * 1.9 * Math.sqrt(1 - Math.pow((k - 2) / 3, 2)), r * 0.22);
    }
    for (const sx of [-1, 1]) {
      const px = x + sx * r * 0.85, py = y - r * 0.55;
      g.fillStyle(STRATA[3], 1); g.fillTriangle(px - r * 0.45, py + r * 0.2, px + r * 0.45, py + r * 0.2, px + sx * 4, py - r * 0.9);
      g.fillStyle(STRATA[0], 1); g.fillTriangle(px, py + r * 0.2, px + r * 0.45, py + r * 0.2, px + sx * 4, py - r * 0.9);
      g.fillStyle(DUST, 1); g.fillTriangle(px - 6 + sx * 4, py - r * 0.6, px + 6 + sx * 4, py - r * 0.6, px + sx * 4, py - r * 0.9);
    }
    // The Old King's crown, jammed on the summit at last.
    g.fillStyle(BRASS, 1);
    g.fillPoints([{ x: x - 16, y: y - r - 4 }, { x: x - 16, y: y - r - 16 }, { x: x - 8, y: y - r - 9 }, { x, y: y - r - 20 }, { x: x + 8, y: y - r - 9 }, { x: x + 16, y: y - r - 16 }, { x: x + 16, y: y - r - 4 }], true, true);
    g.fillStyle(TITHE_RED, 1); g.fillCircle(x, y - r - 9, 3);
    // Scree sliding off him.
    for (let i = 0; i < 5; i++) {
      const p2 = ((t / 700) + i / 5) % 1;
      g.fillStyle(STONE, 1 - p2); g.fillRect(x - r + (i * r * 0.5), y - r * 0.3 + p2 * r * 1.4, 6, 5);
    }
    return;
  }
  // The chain of office, and the steward's scales on it.
  g.lineStyle(3, BRASS_DARK, 1);
  g.beginPath(); g.arc(x, y - r * 0.55, r * 0.7, 0.25, Math.PI - 0.25, false); g.strokePath();
  for (let k = 0; k < 7; k++) { const a = 0.3 + (k / 6) * (Math.PI - 0.6); g.fillStyle(BRASS, 1); g.fillCircle(x + Math.cos(a) * r * 0.7, y - r * 0.55 + Math.sin(a) * r * 0.7, 2.6); }
  const my = y + r * 0.18;
  const tilt = Math.sin(t / 600) * 0.15;
  g.lineStyle(2, BRASS, 1); g.lineBetween(x - 12 * Math.cos(tilt), my - 12 * Math.sin(tilt), x + 12 * Math.cos(tilt), my + 12 * Math.sin(tilt));
  g.lineBetween(x, my, x, my - 6);
  for (const sx of [-1, 1]) {
    const px = x + sx * 12 * Math.cos(tilt), py = my + sx * 12 * Math.sin(tilt);
    g.lineStyle(1, CHAIN, 1); g.lineBetween(px, py, px - 4, py + 7); g.lineBetween(px, py, px + 4, py + 7);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py + 8, 10, 3);
  }
  // The crown at his belt.
  const bx = x + r * 0.6, by = y + r * 0.55;
  g.lineStyle(1.5, 0x4a3624, 1); g.lineBetween(bx - 4, by - 10, bx, by - 2);
  g.fillStyle(BRASS, 1);
  g.fillPoints([{ x: bx - 9, y: by + 6 }, { x: bx - 9, y: by - 2 }, { x: bx - 4, y: by + 2 }, { x: bx, y: by - 4 }, { x: bx + 4, y: by + 2 }, { x: bx + 9, y: by - 2 }, { x: bx + 9, y: by + 6 }], true, true);
  g.fillStyle(TITHE_RED, 1); g.fillCircle(bx, by + 2, 1.8);
  // The grave-spade in his right hand.
  const a = s.facing;
  const hx = h0.x, hy = h0.y;
  const tx = hx + Math.cos(a + 0.6) * 46, ty = hy + Math.sin(a + 0.6) * 46;
  g.lineStyle(4, 0x3a2a1c, 1); g.lineBetween(hx - Math.cos(a + 0.6) * 16, hy - Math.sin(a + 0.6) * 16, tx, ty);
  g.fillStyle(IRON, 1);
  const pa = a + 0.6, nx = -Math.sin(pa), ny = Math.cos(pa);
  g.fillPoints([
    { x: tx + nx * 9, y: ty + ny * 9 }, { x: tx - nx * 9, y: ty - ny * 9 },
    { x: tx - nx * 7 + Math.cos(pa) * 22, y: ty - ny * 7 + Math.sin(pa) * 22 }, { x: tx + Math.cos(pa) * 28, y: ty + Math.sin(pa) * 28 },
    { x: tx + nx * 7 + Math.cos(pa) * 22, y: ty + ny * 7 + Math.sin(pa) * 22 },
  ], true, true);
  g.lineStyle(1.5, STONE_LIT, 0.6); g.lineBetween(tx - nx * 7 + Math.cos(pa) * 22, ty - ny * 7 + Math.sin(pa) * 22, tx + Math.cos(pa) * 28, ty + Math.sin(pa) * 28);
  if (ph === 1) {
    // A mason's trowel in the other hand, mortar dripping off it and spattered on him.
    g.fillStyle(IRON, 1); g.fillTriangle(h1.x, h1.y, h1.x + 18, h1.y + 6, h1.x + 6, h1.y + 20);
    g.fillStyle(MORTAR, 1); g.fillCircle(h1.x + 10, h1.y + 12, 4);
    const d = (t / 500) % 1;
    g.fillStyle(MORTAR, 1 - d); g.fillCircle(h1.x + 8, h1.y + 18 + d * 20, 2.5);
    for (let k = 0; k < 5; k++) { g.fillStyle(MORTAR, 0.8); g.fillCircle(x - r * 0.5 + k * r * 0.25, y + r * 0.2 + (k % 2) * 8, 2.5); }
  }
  if (ph === 2) {
    for (let k = 0; k < 6; k++) {
      const d = ((t / 600) + k / 6) % 1;
      g.fillStyle(EARTH_LIT, 1 - d); g.fillRect(x - r * 0.8 + k * r * 0.3, y - r * 0.2 + d * r * 1.3, 6, 5);
    }
  }
  if (ph === 3) {
    // Up to the knees in his own pour.
    g.fillStyle(EARTH, 1); g.fillEllipse(x, y + r * 0.9, r * 2.4, r * 0.8);
    g.fillStyle(EARTH_LIT, 1); g.fillEllipse(x - r * 0.3, y + r * 0.75, r * 1.2, r * 0.3);
  }
  // Dust, always, coming off his shoulders.
  for (let i = 0; i < 4; i++) {
    const d = ((t / 900) + i / 4) % 1;
    g.fillStyle(DUST, 0.5 * (1 - d)); g.fillCircle(x - r * 0.7 + i * r * 0.45, y - r * 0.8 - d * 20, 3 + d * 4);
  }
}

/**
 * The throne room, drawn once over the warden floor: the bottom of the hold. The back wall is
 * the oldest, darkest strata; the Old King's sarcophagus stands at the anchor, chained, with
 * the Regent's seat — a worn cushion — on the lid; the floor is black slab with the seal in
 * brass and rings of tithe-tallies round it; sealed cells line the walls; headstones and fallen
 * rock fill the corners and the dust has drifted into everything.
 */
function drawThroneRoom(g: Gfx, W: number, H: number): void {
  const rng = mulberry(4401);
  g.fillStyle(0x000000, 0.4); g.fillRect(0, FT, W, H - FT);
  slabFloor(g, 0, FT + 60, W, H - FT - 60, 0x3e3830, rng);
  strataFace(g, 0, FT, W, 70, rng, 5);
  for (let x = 60; x < W; x += 120) {
    if (Math.abs(x - THRONE.x) < 130) continue;
    cellFront(g, x, FT + 70, 60, 44, rng, rng() < 0.85 ? Math.floor(rng() * 50) : -1, false);
  }
  // Rings of tithe-tallies round the seal.
  const cx = W / 2, cy = (FT + H) / 2 + 60;
  for (let ring = 0; ring < 3; ring++) {
    const rr = 120 + ring * 50;
    for (let k = 0; k < 24 + ring * 8; k++) {
      const a = (k / (24 + ring * 8)) * Math.PI * 2;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.6;
      g.lineStyle(1.5, TITHE_RED, 0.3); g.lineBetween(x, y - 5, x, y + 5);
    }
  }
  g.lineStyle(4, BRASS_DARK, 0.7); g.strokeEllipse(cx, cy, 220, 132);
  gravaneSeal(g, cx, cy, 52, BRASS_DARK, 0.85);
  // The Old King's sarcophagus at the anchor, chained shut, the Regent's cushion on the lid.
  sarcophagus(g, THRONE.x, THRONE.y + 46, 150, 104, 0, true);
  g.lineStyle(4, CHAIN, 1);
  g.lineBetween(THRONE.x - 80, THRONE.y - 30, THRONE.x + 80, THRONE.y - 24);
  g.lineBetween(THRONE.x - 80, THRONE.y + 2, THRONE.x + 80, THRONE.y + 8);
  g.fillStyle(0x5a1a1a, 1); g.fillEllipse(THRONE.x, THRONE.y - 12, 60, 22);
  g.fillStyle(0x7a2a2a, 1); g.fillEllipse(THRONE.x, THRONE.y - 15, 52, 14);
  for (const sx of [-1, 1]) {
    candle(g, THRONE.x + sx * 100, THRONE.y + 52, sx * 3, 1.2);
    candle(g, THRONE.x + sx * 124, THRONE.y + 20, sx * 5, 1);
  }
  // Tithe-blocks stacked high either side of the throne — this season's.
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      ashlar(g, THRONE.x + sx * (190 + (k % 3) * 34) + (Math.floor(k / 3) % 2) * 17, THRONE.y + 40 - Math.floor(k / 3) * 22, 0.95, 1 + Math.floor(rng() * 5));
    }
  }
  // Headstones and rock in the corners, dust drifted against everything.
  headstone(g, 70, H - 40, 1.2, -0.2); headstone(g, 120, H - 70, 0.9, 0.15); headstone(g, W - 80, H - 46, 1.1, 0.2);
  rubbleHeap(g, 70, FT + 150, 1.2, rng); rubbleHeap(g, W - 70, FT + 160, 1.3, rng);
  dustDrift(g, 0, FT + 60, W, 50, rng, 0.8);
  dustDrift(g, 0, H - 70, W, 70, rng, 0.6);
  for (let i = 0; i < 26; i++) { g.fillStyle(BONE, 0.5); g.fillRect(rng() * W, FT + 120 + rng() * (H - FT - 140), 8, 2); }
  // Soot where the old torches stood.
  for (let i = 0; i < 8; i++) {
    const x = 60 + rng() * (W - 120), y = FT + 140 + rng() * (H - FT - 200);
    g.fillStyle(SOOT, 0.25); g.fillEllipse(x, y, 30 + rng() * 30, 10);
  }
  g.fillStyle(CANDLE, 0.03); g.fillCircle(THRONE.x, THRONE.y + 30, 220);
  g.fillStyle(mixC(STONE_DEEP, DUST_DEEP, 0.3), 0.15); g.fillRect(0, H - 30, W, 30);
}

// ── The Regent ───────────────────────────────────────────────────────

export const GRAVANE_BOSS: WorldBossDef = {
  worldId: 'isle:gravane',
  name: 'Regent Gravane',
  title: 'the Burier, Steward of Bedrock Hold',
  color: G_MAIN,
  colorLit: G_LIT,
  colorDark: G_DARK,
  accent: G_ACCENT,
  damageMult: 1.4,

  intro: [
    'You have come a long way down to stand on the Old King\'s floor in your boots.',
    'Six of my children, toppled. My wardens, out of a job. Half my cells, open. And you owe the Tithe.',
    'Everyone owes the Tithe. Pay it on my Scales. Let us see what you weigh.',
  ],
  banter: [
    'I keep this hold for the King. Until he wakes. He will wake. He is resting.',
    'What I cannot rule I bury. What I bury I keep. Nothing is lost down here.',
    'A song is only a debt you have not paid yet.',
    'Bould throws himself at walls. I have always preferred to build them.',
    'Four stone short is four stone short. I did not make the arithmetic.',
    'The capital was untidy. I put it away.',
    'Do not look at the box. Nobody looks at the box.',
    'Every season, the Tithe. Every season, the Scales. Every season, short.',
  ],
  defeatLine: 'THE HOLD IS OPENED',
  resumeLine: 'You again. You came back down. Nobody comes back down. They are carried.',

  phases: [
    {
      name: 'The Tithe',
      line: 'Here is the Tithe. Carry it. Everyone carries it.',
      hp: 570,
      cycle: ['sig:tithe', 'volley', 'sig:plumb', 'sig:scales', 'radial', 'sig:tithe', 'sig:plumb', 'lanes', 'sig:scales', 'barrage'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'Interment',
      line: 'Then you are short, and what is short is interred. Hold still. I lay a straight course.',
      hp: 620,
      cycle: ['sig:cell', 'sig:mortar', 'homing', 'sig:gallery', 'spiral', 'sig:cell', 'sig:gallery', 'volley', 'sig:mortar', 'slamchain'],
      harass: ['h-rune', 'h-orbs'],
      restMs: 1020,
      harassMs: 3000,
    },
    {
      name: 'Landslide Throne',
      line: 'You would break my walls? Then have the mountain. All of it. On you.',
      hp: 670,
      cycle: ['sig:ceiling', 'sig:burrow', 'sig:fault', 'barrage', 'sig:burrow', 'quake', 'sig:ceiling', 'sig:fault', 'hazard', 'sig:burrow'],
      harass: ['h-snipe', 'h-lane'],
      restMs: 980,
      harassMs: 2800,
    },
    {
      name: 'Buried Alive',
      line: 'Enough. I will bury this whole room, and you in it, and the box, and myself if I must.',
      hp: 720,
      cycle: ['sig:pour', 'sig:graves', 'sig:headstones', 'spiral', 'sig:pour', 'sig:headstones', 'minefield', 'sig:graves', 'sanctuary'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 900,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE OLD KING WAKES — OR DOES HE',
    extraPhase: {
      name: 'The Old King Wakes',
      line: '...it is empty. It is EMPTY. Forty years. Then I am the King. Then I am the mountain.',
      hp: 570,
      cycle: ['sig:lid', 'sig:strata', 'sig:orogeny', 'volley', 'sig:strata', 'sig:orogeny', 'sig:lid', 'homing', 'sig:orogeny', 'sweep'],
      harass: ['h-rune', 'h-lane'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.14 },
    radial: { count: 16 },
    lanes: { halfW: 30 },
    quake: { rings: 3 },
  },

  signatures: {
    tithe: stoneTithe,
    scales: weighed,
    plumb: plumbLines,
    cell: interment,
    gallery,
    mortar: mortarTrowel,
    ceiling: ceilingFalls,
    burrow,
    fault: faultLine,
    pour: earthPours,
    graves: sixFeet,
    headstones,
    lid: theLid,
    strata,
    orogeny,
  },

  look: { crest: 'stack', pattern: 'plates', aura: 'dust', hands: 'gauntlet', torsoR: 44, mouth: 'grate', eyes: 2, eyeColor: 0xe8d8a8 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none', tint: 'gold' },
    { movement: 'stalk', gimmick: 'none', look: { pattern: 'grid', aura: 'dust', hands: 'gauntlet', mouth: 'line' } },
    { movement: 'rush', gimmick: 'tremor', tint: 'hot', look: { pattern: 'cracks', aura: 'smoke', hands: 'claw', mouth: 'maw' } },
    { movement: 'orbit', gimmick: 'none', tint: 'void', look: { pattern: 'drip', aura: 'dust', hands: 'ball', mouth: 'stitch', eyes: 3 } },
    { movement: 'stalk', gimmick: 'none', tint: 'blood', look: { crest: 'spires', pattern: 'facets', aura: 'smoke', hands: 'claw', torsoR: 52, eyes: 1, mouth: 'maw' } },
  ],

  drawDecor: drawGravane,
  drawArena: drawThroneRoom,
};
