import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  BOTTLE, BRASS, DREAM, DREAM_LIT, FEATHER, LAMP_FULL, LINEN, MOON, MOON_GOLD, NIGHTMARE, NIGHTMARE_EYE, PLAYER_TINT,
  QUILTS, WALNUT, WALNUT_LIT, breathBottle, breathMeter, dist, dotted, dreamSheep, moon, nightcapOn, pillow, segDist,
  star, stitchLine, zzz,
} from './art';

/**
 * Prince Reverie — His Drowsiness, Governor of the Slumber Court, King Aerion's dreamiest son.
 *
 * Reverie keeps the Breath Tax by putting it to bed. A household in arrears is laid down on the
 * Long Ward and hummed to sleep by the Lullaby Belfry, and a sleeper breathes eleven times a
 * minute instead of twenty — less breath drawn, less breath owed, and every night the
 * Night-Collector corks a bottle off each of them for the Lung. Reverie thinks it the kindest
 * arrangement on the isle. He has not been properly awake in years, and does not intend to be.
 *
 * Phase one, *Sweet Dreams*: he drifts about the room in his nightcap like a man in a warm bath —
 * soap-bubble dreams that make you drowsy, a stampede of dream-sheep down the lanes of his
 * counterpane, and numbered sheep leaping onto you one at a time. Phase two, *Night Terror*: the
 * dream sours; the room goes dark, he flickers from place to place, black hands reach up out of
 * the floor after you, eyes open in the dark and stare, and the wardrobe door creaks open. Hard
 * mode, *Never Wake*: a dream inside a dream — gilt frames close in on you one inside another,
 * your own last steps come back to haunt you, and his patterns loop, again and again.
 */

const REV = 0x9a8ae0;
const REV_LIT = 0xe4dcff;
const REV_DARK = 0x2a2050;
const ACCENT = MOON_GOLD;
const GILT = 0xd8b04a;
const GILT_DARK = 0x7a5a1a;

const PLAYER_R = 20;
const TOP = 96;

// ── Signature: Sleepy Bubbles ────────────────────────────────────────
// A fan of big soap-bubble dreams blown off his fingertips; each one has a sleeper curled up
// inside it, and they wander after you at a dozing pace. Touch one and it pops in your face:
// a sting, and a heavy drowsy slow.

const SB_SPEED = 72;
const SB_TURN = 1.3;
const SB_LIFE_MS = 6500;
const SB_R = 22;
const SB_DAMAGE = 10;

const sleepyBubbles = (tk: BossToolkit): SignatureMove => {
  interface Bubble { x: number; y: number; a: number; bornAt: number; seed: number }
  let bubbles: Bubble[] = [];
  const pops: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 1500,
    windupMs: 600,
    gesture: 'raise',
    tell: 'SLEEPY BUBBLES',
    cast() {
      const n = tk.hard ? 7 : 5;
      const a0 = tk.angleToPlayer();
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.42;
        bubbles.push({ x: tk.bossX + Math.cos(a) * 40, y: tk.bossY + Math.sin(a) * 40, a, bornAt: tk.now + i * 90, seed: Math.random() * 10 });
      }
      tk.sfx('bubble');
    },
    update(time, dt) {
      const p = tk.player;
      for (const b of [...bubbles]) {
        if (time < b.bornAt) continue;
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        const diff = Phaser.Math.Angle.Wrap(want - b.a);
        b.a += Phaser.Math.Clamp(diff, -SB_TURN * dt, SB_TURN * dt);
        const wob = Math.sin((time - b.bornAt) / 300 + b.seed) * 30;
        b.x += Math.cos(b.a) * SB_SPEED * dt + Math.cos(b.a + Math.PI / 2) * wob * dt;
        b.y += Math.sin(b.a) * SB_SPEED * dt + Math.sin(b.a + Math.PI / 2) * wob * dt;
        b.x = tk.clampX(b.x, 20); b.y = tk.clampY(b.y, 20);
        if (dist(b.x, b.y, p.x, p.y) < SB_R + PLAYER_R - 4) {
          tk.hitPlayer(SB_DAMAGE, b.x, b.y);
          tk.slowPlayer(0.45, 1500);
          tk.host.showFloatingText(p.x, p.y - 50, 'DROWSY', '#e4d8ff');
          tk.sfx('bubble');
          pops.push({ x: b.x, y: b.y, at: time });
          bubbles = bubbles.filter((q) => q !== b);
        } else if (time - b.bornAt > SB_LIFE_MS) {
          pops.push({ x: b.x, y: b.y, at: time });
          bubbles = bubbles.filter((q) => q !== b);
        }
      }
      while (pops.length && time - pops[0].at > 400) pops.shift();
    },
    drawGround(g, time) {
      for (const b of bubbles) {
        if (time < b.bornAt) continue;
        g.fillStyle(0x000000, 0.15); g.fillEllipse(b.x, b.y + SB_R + 10, SB_R * 1.4, 6);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const b of bubbles) {
        if (time < b.bornAt) continue;
        const grow = Math.min(1, (time - b.bornAt) / 300);
        const fade = Math.min(1, (b.bornAt + SB_LIFE_MS - time) / 500);
        const r = SB_R * grow * (1 + Math.sin(t * 4 + b.seed) * 0.05);
        // A soap skin with a slow rainbow sheen.
        g.fillStyle(DREAM, 0.14 * fade); g.fillCircle(b.x, b.y, r);
        g.lineStyle(2, mixC(DREAM_LIT, 0x9af0ff, 0.5 + 0.5 * Math.sin(t * 2 + b.seed)), 0.85 * fade); g.strokeCircle(b.x, b.y, r);
        g.lineStyle(1.4, mixC(0xffc8e8, DREAM_LIT, 0.5 + 0.5 * Math.cos(t * 2.4 + b.seed)), 0.5 * fade);
        g.beginPath(); g.arc(b.x, b.y, r - 3, t + b.seed, t + b.seed + 1.6, false); g.strokePath();
        g.fillStyle(0xffffff, 0.75 * fade); g.fillEllipse(b.x - r * 0.4, b.y - r * 0.45, r * 0.35, r * 0.2);
        // A tiny sleeper curled up inside.
        g.fillStyle(LINEN, 0.7 * fade); g.fillEllipse(b.x, b.y + 3, r * 0.8, r * 0.45);
        g.fillStyle(0xf0d8c0, 0.8 * fade); g.fillCircle(b.x - r * 0.28, b.y - 1, r * 0.2);
        zzz(g, b.x + r * 0.2, b.y - r * 0.2, 3, t + b.seed, DREAM_LIT, 0.8 * fade);
      }
      for (const p of pops) {
        const k = (time - p.at) / 400;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(DREAM_LIT, 1 - k); g.fillCircle(p.x + Math.cos(a) * (SB_R + k * 20), p.y + Math.sin(a) * (SB_R + k * 20), 2);
        }
      }
    },
    onPhaseEnd() { bubbles = []; },
  };
};

// ── Signature: Sheep Stampede ────────────────────────────────────────
// The counterpane is quilted into six long channels. Dream-sheep come thundering down all but two
// of them from one side; the two quiet channels are marked with a hurdle at the entry end — the
// flock won't jump into those. Get into a quiet channel before the hooves arrive.

const SS_ROWS = 6;
const SS_WARN_MS = 1250;
const SS_SPEED = 540;
const SS_DAMAGE = 12;

const sheepStampede = (tk: BossToolkit): SignatureMove => {
  interface Row { y0: number; y1: number; safe: boolean }
  interface Runner { row: number; x: number; y: number }
  let rows: Row[] = [];
  let runners: Runner[] = [];
  let dir: 1 | -1 = 1;
  let startAt = 0;
  let live = false;
  const hitRows = new Set<number>();
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'SHEEP STAMPEDE',
    cast() {
      const h = (tk.H - TOP) / SS_ROWS;
      const pRow = Phaser.Math.Clamp(Math.floor((tk.player.y - TOP) / h), 0, SS_ROWS - 1);
      // One quiet channel always within a step of the player; another anywhere else.
      const near = Phaser.Math.Clamp(pRow + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 0 : 1), 0, SS_ROWS - 1);
      let far = Math.floor(Math.random() * SS_ROWS);
      if (far === near) far = (far + 3) % SS_ROWS;
      rows = [];
      for (let i = 0; i < SS_ROWS; i++) rows.push({ y0: TOP + i * h, y1: TOP + (i + 1) * h, safe: i === near || i === far });
      dir = Math.random() < 0.5 ? 1 : -1;
      runners = [];
      for (let i = 0; i < SS_ROWS; i++) {
        if (rows[i].safe) continue;
        const n = tk.hard ? 4 : 3;
        for (let k = 0; k < n; k++) runners.push({ row: i, x: dir === 1 ? -40 - k * 70 : tk.W + 40 + k * 70, y: (rows[i].y0 + rows[i].y1) / 2 + (Math.random() - 0.5) * h * 0.4 });
      }
      startAt = tk.now + tk.warn(SS_WARN_MS);
      live = true;
      hitRows.clear();
      tk.sfx('drum-hit');
    },
    update(time, dt) {
      if (!live) return;
      if (time < startAt) return;
      const p = tk.player;
      let any = false;
      for (const r of runners) {
        r.x += dir * SS_SPEED * dt;
        if ((dir === 1 && r.x < tk.W + 80) || (dir === -1 && r.x > -80)) any = true;
        const row = rows[r.row];
        if (!hitRows.has(r.row) && p.y > row.y0 - 6 && p.y < row.y1 + 6 && Math.abs(r.x - p.x) < 30 && Math.abs(r.y - p.y) < row.y1 - row.y0) {
          hitRows.add(r.row);
          tk.hitPlayer(SS_DAMAGE, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 50, 'TRAMPLED', '#ffffff');
          tk.sfx('hit-medium');
        }
      }
      if (!any) live = false;
    },
    drawGround(g, time) {
      if (!live) return;
      const pre = time < startAt;
      const k = pre ? 1 - (startAt - time) / tk.warn(SS_WARN_MS) : 1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.safe) {
          g.fillStyle(DREAM_LIT, 0.08 + 0.06 * k); g.fillRect(0, r.y0 + 2, tk.W, r.y1 - r.y0 - 4);
          continue;
        }
        g.fillStyle(0xffffff, (pre ? 0.05 + 0.12 * k : 0.08)); g.fillRect(0, r.y0 + 2, tk.W, r.y1 - r.y0 - 4);
        // Hoof-dust arrows racing along the channel, the way the flock will come.
        if (pre) {
          for (let x = 0; x < tk.W; x += 70) {
            const ax = dir === 1 ? (x + (time / 4) % 70) : tk.W - (x + (time / 4) % 70);
            const cy = (r.y0 + r.y1) / 2;
            g.lineStyle(3, FEATHER, 0.25 + 0.4 * k);
            g.lineBetween(ax, cy, ax - dir * 14, cy - 10); g.lineBetween(ax, cy, ax - dir * 14, cy + 10);
          }
        }
      }
    },
    drawAir(g, time) {
      if (!live) return;
      const t = time / 1000;
      // Hurdles at the entry of the quiet channels.
      const ex = dir === 1 ? 24 : tk.W - 24;
      for (const r of rows) {
        if (!r.safe) continue;
        g.fillStyle(WALNUT, 1); g.fillRect(ex - 3, r.y0 + 10, 6, r.y1 - r.y0 - 20);
        for (let k = 0; k < 3; k++) { g.lineStyle(3, WALNUT_LIT, 1); g.lineBetween(ex - 12, r.y0 + 18 + k * 18, ex + 12, r.y0 + 26 + k * 18); }
      }
      if (time < startAt) return;
      for (const rn of runners) {
        if (rn.x < -60 || rn.x > tk.W + 60) continue;
        const hop = (Math.sin(t * 16 + rn.y) + 1) * 0.12;
        dreamSheep(g, rn.x, rn.y, 14, dir, t * 2.4 + rn.y, hop, 1);
        g.fillStyle(FEATHER, 0.35); g.fillCircle(rn.x - dir * 26, rn.y + 2, 7); g.fillCircle(rn.x - dir * 40, rn.y, 5);
      }
    },
    onPhaseEnd() { live = false; runners = []; },
  };
};

// ── Signature: Counting Leap ─────────────────────────────────────────
// He counts sheep out loud, and on each number a sheep leaps from behind him and lands where you
// are standing — or where you will be. Each landing is ringed and marked with its number in pips.

const CL_COUNT = 5;
const CL_STAGGER_MS = 460;
const CL_FLIGHT_MS = 950;
const CL_R = 56;
const CL_DAMAGE = 11;

const countingLeap = (tk: BossToolkit): SignatureMove => {
  interface Leap { n: number; from: Pt; to: Pt; at: number; landed: boolean }
  let leaps: Leap[] = [];
  const thumps: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 3200,
    windupMs: 500,
    gesture: 'point',
    tell: 'ONE... TWO... THREE...',
    cast() {
      const n = tk.hard ? CL_COUNT + 2 : CL_COUNT;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * CL_STAGGER_MS, () => {
          const p = tk.player;
          // Every other sheep leads the player a little.
          const lead = i % 2 ? 60 : 0;
          const a = Math.random() * Math.PI * 2;
          leaps.push({
            n: i + 1, from: { x: tk.bossX, y: tk.bossY }, at: tk.now, landed: false,
            to: { x: tk.clampX(p.x + Math.cos(a) * lead, 60), y: tk.clampY(p.y + Math.sin(a) * lead, 60) },
          });
          tk.sfx('boing');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of leaps) {
        if (l.landed || time - l.at < tk.warn(CL_FLIGHT_MS)) continue;
        l.landed = true;
        thumps.push({ x: l.to.x, y: l.to.y, at: time });
        tk.sfx('land');
        if (dist(l.to.x, l.to.y, p.x, p.y) < CL_R + PLAYER_R * 0.5) {
          tk.hitPlayer(CL_DAMAGE, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 50, `${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'][l.n - 1] ?? l.n}!`, '#e4d8ff');
        }
      }
      leaps = leaps.filter((l) => !l.landed || time - l.at < tk.warn(CL_FLIGHT_MS) + 500);
      while (thumps.length && time - thumps[0].at > 500) thumps.shift();
    },
    drawGround(g, time) {
      for (const l of leaps) {
        if (l.landed) continue;
        const k = (time - l.at) / tk.warn(CL_FLIGHT_MS);
        g.fillStyle(DREAM, 0.08 + 0.18 * k); g.fillCircle(l.to.x, l.to.y, CL_R * (0.5 + 0.5 * k));
        g.lineStyle(2, DREAM_LIT, 0.4 + 0.5 * k); g.strokeCircle(l.to.x, l.to.y, CL_R);
        // The number, in pips.
        for (let i = 0; i < l.n; i++) {
          const a = -Math.PI / 2 + (i / Math.max(1, l.n)) * Math.PI * 2;
          g.fillStyle(LINEN, 0.9); g.fillCircle(l.to.x + Math.cos(a) * 12 * (l.n > 1 ? 1 : 0), l.to.y + Math.sin(a) * 12 * (l.n > 1 ? 1 : 0), 3.5);
        }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const l of leaps) {
        const k = Math.min(1, (time - l.at) / tk.warn(CL_FLIGHT_MS));
        if (l.landed) {
          const b = (time - l.at - tk.warn(CL_FLIGHT_MS)) / 500;
          dreamSheep(g, l.to.x + b * 40, l.to.y - Math.sin(b * Math.PI) * 30, 15, 1, t, 0, 1 - b);
          continue;
        }
        const x = l.from.x + (l.to.x - l.from.x) * k, y = l.from.y + (l.to.y - l.from.y) * k - Math.sin(k * Math.PI) * 140;
        dreamSheep(g, x, y, 15, l.to.x >= l.from.x ? 1 : -1, t, 0.5, 1);
      }
      for (const th of thumps) {
        const k = (time - th.at) / 500;
        g.lineStyle(3, LINEN, 0.8 * (1 - k)); g.strokeEllipse(th.x, th.y, CL_R * 2 * (0.6 + k * 0.6), CL_R * (0.6 + k * 0.6));
      }
    },
    onPhaseEnd() { leaps = []; },
  };
};

// ── Signature: Nightmare Hands ───────────────────────────────────────
// Pools of black open on the floor where you stand, one after another, chasing you. Each one
// stares up with two red eyes for a moment — then a hand comes up out of it and closes.

const NH_COUNT = 6;
const NH_EVERY_MS = 300;
const NH_WARN_MS = 900;
const NH_R = 46;
const NH_DAMAGE = 13;

const nightmareHands = (tk: BossToolkit): SignatureMove => {
  interface Hand { x: number; y: number; at: number; fired: boolean; got: boolean }
  let hands: Hand[] = [];
  return {
    durationMs: 2500,
    windupMs: 600,
    gesture: 'slam',
    tell: 'NIGHTMARE HANDS',
    cast() {
      const n = tk.hard ? NH_COUNT + 2 : NH_COUNT;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * NH_EVERY_MS, () => {
          const p = tk.player;
          hands.push({ x: tk.clampX(p.x, 40), y: tk.clampY(p.y + 8, 40), at: tk.now, fired: false, got: false });
          tk.sfx('curse-cast');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const h of hands) {
        if (h.fired || time - h.at < tk.warn(NH_WARN_MS)) continue;
        h.fired = true;
        tk.sfx('slash');
        if (dist(h.x, h.y, p.x, p.y + 8) < NH_R) {
          h.got = true;
          tk.hitPlayer(NH_DAMAGE, p.x, p.y);
          tk.slowPlayer(0.2, 700);
          tk.host.showFloatingText(p.x, p.y - 52, 'GRABBED', '#ff5a7a');
        }
      }
      hands = hands.filter((h) => time - h.at < tk.warn(NH_WARN_MS) + 600);
    },
    // Drawn over the gloom so the pools read in the dark.
    drawAir(g, time) {
      const t = time / 1000;
      for (const h of hands) {
        const warn = tk.warn(NH_WARN_MS);
        const k = Math.min(1, (time - h.at) / warn);
        if (!h.fired) {
          g.fillStyle(NIGHTMARE, 0.5 + 0.35 * k); g.fillEllipse(h.x, h.y, NH_R * 2 * (0.4 + 0.6 * k), NH_R * 0.9 * (0.4 + 0.6 * k));
          g.lineStyle(2, NIGHTMARE_EYE, 0.3 + 0.5 * k); g.strokeEllipse(h.x, h.y, NH_R * 2, NH_R * 0.9);
          if (k > 0.35) {
            g.fillStyle(NIGHTMARE_EYE, k); g.fillCircle(h.x - 7, h.y - 2, 2.4); g.fillCircle(h.x + 7, h.y - 2, 2.4);
          }
          // Fingertips testing the surface.
          for (let f = 0; f < 4; f++) {
            const fx = h.x - 12 + f * 8, fy = h.y + Math.sin(t * 8 + f) * 2;
            g.fillStyle(NIGHTMARE, 0.9); g.fillEllipse(fx, fy - 3 * k, 4, 6 * k + 1);
          }
          continue;
        }
        const r = (time - h.at - warn) / 600;
        const rise = Math.min(1, r * 4), close = Math.min(1, Math.max(0, r * 4 - 0.5));
        g.fillStyle(NIGHTMARE, 0.8 * (1 - r)); g.fillEllipse(h.x, h.y, NH_R * 2, NH_R * 0.9);
        g.fillStyle(NIGHTMARE, 1 - r * 0.7);
        g.fillRoundedRect(h.x - 10, h.y - 54 * rise, 20, 54 * rise, 6);
        for (let f = 0; f < 4; f++) {
          const fa = -Math.PI / 2 + (f - 1.5) * (0.5 - close * 0.42);
          g.lineStyle(6, NIGHTMARE, 1 - r * 0.7);
          const bx = h.x + (f - 1.5) * 5, by = h.y - 54 * rise;
          g.lineBetween(bx, by, bx + Math.cos(fa) * 28 * rise, by + Math.sin(fa) * 28 * rise);
        }
        g.lineStyle(5, NIGHTMARE, 1 - r * 0.7); g.lineBetween(h.x - 10, h.y - 40 * rise, h.x - 22, h.y - 56 * rise);
        if (h.got) { g.lineStyle(2, NIGHTMARE_EYE, 1 - r); g.strokeCircle(h.x, h.y - 30, 26 + r * 20); }
      }
    },
    onPhaseEnd() { hands = []; },
  };
};

// ── Signature: The Wardrobe ──────────────────────────────────────────
// A wardrobe stands at the edge of the room. Its doors creak open, there are eyes in the dark
// inside — and a long thin arm comes out and sweeps the room in an arc. The arc is marked, and
// so is which way the arm will sweep.

const WR_WARN_MS = 1150;
const WR_SWEEP_MS = 1050;
const WR_ARC = 1.0;
const WR_LEN = 760;
const WR_HALF = 24;
const WR_DAMAGE = 15;

const wardrobe = (tk: BossToolkit): SignatureMove => {
  interface Ward { x: number; y: number; a0: number; a1: number; at: number; hit: boolean; facing: number }
  let ward: Ward | null = null;
  const tip = (w: Ward, k: number): Pt => {
    const a = w.a0 + (w.a1 - w.a0) * k;
    return { x: w.x + Math.cos(a) * WR_LEN, y: w.y + Math.sin(a) * WR_LEN };
  };
  return {
    durationMs: 2500,
    windupMs: 700,
    gesture: 'point',
    tell: 'THE WARDROBE',
    cast() {
      const p = tk.player;
      // Stand it on the side wall nearer the player, level-ish with them — close enough that a
      // sidestep toward the arm's starting edge clears the arc before it comes round.
      const left = p.x < tk.W / 2;
      const x = left ? 30 : tk.W - 30;
      const y = tk.clampY(p.y + (Math.random() - 0.5) * 160, 120);
      const mid = Math.atan2(p.y - y, p.x - x);
      const s = Math.random() < 0.5 ? 1 : -1;
      ward = { x, y, a0: mid - s * WR_ARC / 2, a1: mid + s * WR_ARC / 2, at: tk.now, hit: false, facing: left ? 1 : -1 };
      tk.sfx('screech');
    },
    update(time) {
      if (!ward) return;
      const warn = tk.warn(WR_WARN_MS);
      const k = (time - ward.at - warn) / WR_SWEEP_MS;
      if (k < 0) return;
      if (k > 1.3) { ward = null; return; }
      if (k <= 1 && !ward.hit) {
        const p = tk.player;
        const e = tip(ward, Math.min(1, k));
        if (segDist(p.x, p.y, ward.x, ward.y, e.x, e.y) < WR_HALF + PLAYER_R) {
          ward.hit = true;
          tk.hitPlayer(WR_DAMAGE, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 52, 'SNATCHED', '#ff5a7a');
          tk.sfx('hit-heavy');
        }
      }
    },
    drawAir(g, time) {
      if (!ward) return;
      const w = ward;
      const warn = tk.warn(WR_WARN_MS);
      const pre = time - w.at < warn;
      const ko = Math.min(1, (time - w.at) / warn);
      // The marked arc, with arrowheads showing the sweep.
      if (pre || (time - w.at - warn) / WR_SWEEP_MS < 1) {
        const steps = 24;
        g.fillStyle(NIGHTMARE_EYE, pre ? 0.06 + 0.1 * ko : 0.05);
        g.beginPath(); g.moveTo(w.x, w.y);
        for (let i = 0; i <= steps; i++) { const a = w.a0 + (w.a1 - w.a0) * (i / steps); g.lineTo(w.x + Math.cos(a) * WR_LEN, w.y + Math.sin(a) * WR_LEN); }
        g.closePath(); g.fillPath();
        g.lineStyle(2, NIGHTMARE_EYE, 0.4 + 0.3 * ko);
        const e0 = tip(w, 0), e1 = tip(w, 1);
        g.lineBetween(w.x, w.y, e0.x, e0.y);
        dotted(g, [{ x: w.x, y: w.y }, e1], 14, 2, NIGHTMARE_EYE, 0.5 + 0.3 * ko);
        for (let r = 200; r < WR_LEN; r += 180) {
          const am = w.a0 + (w.a1 - w.a0) * 0.5;
          const ax = w.x + Math.cos(am) * r, ay = w.y + Math.sin(am) * r;
          const da = Math.sign(w.a1 - w.a0);
          const tx = Math.cos(am + da * Math.PI / 2), ty = Math.sin(am + da * Math.PI / 2);
          g.lineStyle(3, NIGHTMARE_EYE, 0.5 * ko);
          g.lineBetween(ax, ay, ax - tx * 12 + Math.cos(am) * 8, ay - ty * 12 + Math.sin(am) * 8);
          g.lineBetween(ax, ay, ax - tx * 12 - Math.cos(am) * 8, ay - ty * 12 - Math.sin(am) * 8);
        }
      }
      // The wardrobe: tall walnut, doors swinging open on the dark.
      const x = w.x, y = w.y;
      g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 40, 70, 14);
      g.fillStyle(dim(WALNUT, 0.3), 1); g.fillRect(x - 30, y - 70, 60, 112);
      g.fillStyle(0x08040c, 1); g.fillRect(x - 24, y - 62, 48, 96);
      const open = Math.min(1, ko * 1.4);
      for (const s of [-1, 1]) {
        const dw = 24 * (1 - open * 0.75);
        g.fillStyle(WALNUT, 1); g.fillRect(s < 0 ? x - 24 - (24 - dw) * 0.6 : x + 24 - dw + (24 - dw) * 0.6, y - 62, dw, 96);
        g.fillStyle(WALNUT_LIT, 1); g.fillCircle(s < 0 ? x - 24 + dw - 4 : x + 24 - dw + 4, y - 14, 2);
      }
      g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - 34, y - 78, 68, 10);
      if (open > 0.3) { g.fillStyle(NIGHTMARE_EYE, open); g.fillCircle(x - 6, y - 30, 2.6); g.fillCircle(x + 6, y - 30, 2.6); }
      // The arm.
      if (!pre) {
        const k = Math.min(1, (time - w.at - warn) / WR_SWEEP_MS);
        const back = Math.max(0, (time - w.at - warn) / WR_SWEEP_MS - 1) / 0.3;
        const len = 1 - Math.min(1, back);
        const a = w.a0 + (w.a1 - w.a0) * k;
        const ex = w.x + Math.cos(a) * WR_LEN * len, ey = w.y + Math.sin(a) * WR_LEN * len;
        g.lineStyle(WR_HALF * 1.2, NIGHTMARE, 0.95); g.lineBetween(w.x, w.y - 10, ex, ey);
        g.lineStyle(3, mixC(NIGHTMARE, DREAM, 0.3), 0.8); g.lineBetween(w.x, w.y - 16, ex, ey - 6);
        // Long fingers at the end.
        for (let f = 0; f < 4; f++) {
          const fa = a + (f - 1.5) * 0.3;
          g.lineStyle(5, NIGHTMARE, 0.95 * len); g.lineBetween(ex, ey, ex + Math.cos(fa) * 30, ey + Math.sin(fa) * 30);
        }
      }
    },
    onPhaseEnd() { ward = null; },
  };
};

// ── Signature: Eyes in the Dark ──────────────────────────────────────
// Eyes open round the edges of the dark room. Each stares at you down a thin line that follows
// you — until it stops following, flushes red, and fires a needle of shadow down it.

const EY_TRACK_MS = 1200;
const EY_LOCK_MS = 450;
const EY_SPEED = 680;
const EY_DAMAGE = 9;

const staringEyes = (tk: BossToolkit): SignatureMove => {
  interface Eye { x: number; y: number; at: number; a: number; fired: boolean }
  let eyes: Eye[] = [];
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'EYES IN THE DARK',
    cast() {
      const n = tk.hard ? 8 : 6;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 200, () => {
          // A point on the room's rim.
          const a = base + (i / n) * Math.PI * 2;
          const cx = tk.W / 2, cy = (tk.H + TOP) / 2;
          const x = tk.clampX(cx + Math.cos(a) * tk.W * 0.6, 34), y = tk.clampY(cy + Math.sin(a) * (tk.H - TOP) * 0.6, 34);
          eyes.push({ x, y, at: tk.now, a: tk.angleToPlayer(x, y), fired: false });
          tk.sfx('blink');
        });
      }
    },
    update(time) {
      for (const e of eyes) {
        const age = time - e.at;
        if (age < tk.warn(EY_TRACK_MS)) e.a = tk.angleToPlayer(e.x, e.y);
        else if (!e.fired && age >= tk.warn(EY_TRACK_MS) + tk.warn(EY_LOCK_MS)) {
          e.fired = true;
          tk.spawnBullet({ x: e.x, y: e.y, angle: e.a, speed: EY_SPEED, damage: EY_DAMAGE, r: 6, lifeMs: 2400, color: NIGHTMARE_EYE });
          tk.sfx('stab');
        }
      }
      eyes = eyes.filter((e) => time - e.at < tk.warn(EY_TRACK_MS) + tk.warn(EY_LOCK_MS) + 500);
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const e of eyes) {
        const age = time - e.at;
        const track = tk.warn(EY_TRACK_MS);
        const locked = age >= track;
        const open = Math.min(1, age / 250) * (e.fired ? Math.max(0, 1 - (age - track - tk.warn(EY_LOCK_MS)) / 500) : 1);
        // The sightline.
        if (!e.fired) {
          const L = 1100;
          g.lineStyle(locked ? 2.5 : 1, locked ? NIGHTMARE_EYE : DREAM_LIT, locked ? 0.7 + 0.3 * Math.sin(t * 30) : 0.3);
          g.lineBetween(e.x, e.y, e.x + Math.cos(e.a) * L, e.y + Math.sin(e.a) * L);
        }
        // The eye: an almond of white with a red iris, opening in the dark.
        g.fillStyle(NIGHTMARE, 0.9 * open); g.fillEllipse(e.x, e.y, 40, 22 * open + 1);
        g.fillStyle(0xf4eef8, open); g.fillEllipse(e.x, e.y, 32, 16 * open + 0.5);
        const ix = e.x + Math.cos(e.a) * 6, iy = e.y + Math.sin(e.a) * 3;
        g.fillStyle(NIGHTMARE_EYE, open); g.fillCircle(ix, iy, 6 * open);
        g.fillStyle(0x0a0408, open); g.fillCircle(ix, iy, 3 * open);
      }
    },
    onPhaseEnd() { eyes = []; },
  };
};

// ── Signature: Déjà Vu ───────────────────────────────────────────────
// He has been watching you sleepwalk. A pale shade of you walks back over the last three seconds
// of your own steps, and every footprint it leaves bursts a moment later. Don't go back the way
// you came — and don't meet yourself.

const DV_RECORD_MS = 3000;
const DV_REPLAY_MS = 2200;
const DV_BURST_DELAY_MS = 700;
const DV_R = 36;
const DV_DAMAGE = 12;

const dejaVu = (tk: BossToolkit): SignatureMove => {
  const record: { x: number; y: number; at: number }[] = [];
  let replay: { pts: Pt[]; at: number; touched: boolean } | null = null;
  let marks: { x: number; y: number; at: number; done: boolean }[] = [];
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'clap',
    tell: 'DÉJÀ VU',
    cast() {
      if (record.length < 4) return;
      replay = { pts: record.map((r) => ({ x: r.x, y: r.y })), at: tk.now, touched: false };
      marks = [];
      tk.sfx('time-warp');
    },
    update(time) {
      const p = tk.player;
      // Always watching.
      if (record.length === 0 || time - record[record.length - 1].at >= 100) record.push({ x: p.x, y: p.y, at: time });
      while (record.length && time - record[0].at > DV_RECORD_MS) record.shift();
      if (replay) {
        const k = (time - replay.at) / DV_REPLAY_MS;
        const n = replay.pts.length;
        const idx = Math.min(n - 1, Math.floor(k * n));
        while (marks.length < Math.min(n, idx + 1)) {
          const q = replay.pts[marks.length];
          if (marks.length % 2 === 0) marks.push({ x: q.x, y: q.y, at: time, done: false });
          else marks.push({ x: q.x, y: q.y, at: time, done: true });
        }
        const s = replay.pts[idx];
        if (!replay.touched && dist(s.x, s.y, p.x, p.y) < PLAYER_R * 2) {
          replay.touched = true;
          tk.hitPlayer(DV_DAMAGE, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 52, 'YOU MET YOURSELF', '#c8e0ff');
          tk.sfx('glitch');
        }
        if (k >= 1 && marks.every((m) => m.done)) replay = null;
      }
      for (const m of marks) {
        if (m.done || time - m.at < tk.warn(DV_BURST_DELAY_MS)) continue;
        m.done = true;
        tk.explode(m.x, m.y, DV_R, DV_DAMAGE, DREAM);
      }
    },
    drawGround(g, time) {
      for (const m of marks) {
        if (m.done) continue;
        const k = (time - m.at) / tk.warn(DV_BURST_DELAY_MS);
        g.fillStyle(PLAYER_TINT, 0.1 + 0.2 * k); g.fillCircle(m.x, m.y, DV_R * (0.5 + 0.5 * k));
        g.lineStyle(1.5, DREAM_LIT, 0.4 + 0.5 * k); g.strokeCircle(m.x, m.y, DV_R);
        g.fillStyle(DREAM_LIT, 0.7); g.fillEllipse(m.x - 4, m.y + 6, 7, 4.5); g.fillEllipse(m.x + 4, m.y + 2, 7, 4.5);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      if (replay) {
        const k = Math.min(1, (time - replay.at) / DV_REPLAY_MS);
        const s = replay.pts[Math.min(replay.pts.length - 1, Math.floor(k * replay.pts.length))];
        // A pale, translucent you, eyes shut, nightcap on, walking backward through time.
        g.fillStyle(PLAYER_TINT, 0.25); g.fillCircle(s.x, s.y, 22);
        g.lineStyle(2, DREAM_LIT, 0.7); g.strokeCircle(s.x, s.y, 22);
        g.lineStyle(1.5, DREAM_LIT, 0.8);
        g.beginPath(); g.arc(s.x - 7, s.y - 4, 3, 0.2, Math.PI - 0.2, false); g.strokePath();
        g.beginPath(); g.arc(s.x + 7, s.y - 4, 3, 0.2, Math.PI - 0.2, false); g.strokePath();
        nightcapOn(g, s.x, s.y - 12, 14, lit(PLAYER_TINT, 0.4), 0.7, 0.6, Math.sin(t * 3) * 2);
        // Clock hands spinning backwards over its head.
        const cx = s.x, cy = s.y - 50;
        g.lineStyle(1.5, DREAM_LIT, 0.6); g.strokeCircle(cx, cy, 9);
        g.lineBetween(cx, cy, cx + Math.cos(-t * 8) * 7, cy + Math.sin(-t * 8) * 7);
      }
    },
    onPhaseEnd() { replay = null; marks = []; },
  };
};

// ── Signature: Recurring Dream ───────────────────────────────────────
// He throws a pattern of lanes — and then the dream loops, and throws exactly the same pattern
// again, a little faster, and (on hard) a third time. The next loop's lanes are ghosted on the
// floor in advance, so a player who learns the first can walk the rest.

const RD_LANES = 4;
const RD_WARN_MS = 900;
const RD_GAP_MS = 230;
const RD_LOOP_MS = 1700;
const RD_DAMAGE = 12;
const RD_HALF = 30;

const recurringDream = (tk: BossToolkit): SignatureMove => {
  interface Lane { x: number; y: number; angle: number }
  let pattern: Lane[] = [];
  let startAt = 0;
  let loops = 0;
  let active = false;
  const fire = (loop: number): void => {
    const scale = loop === 0 ? 1 : loop === 1 ? 0.8 : 0.65;
    pattern.forEach((l, i) => {
      tk.schedule(i * RD_GAP_MS * scale, () => {
        tk.spawnLane({ x: l.x, y: l.y, angle: l.angle, halfW: RD_HALF, warnMs: RD_WARN_MS * scale, damage: RD_DAMAGE });
        tk.sfx('beam-charge');
      });
    });
  };
  return {
    durationMs: 4000,
    windupMs: 600,
    gesture: 'raise',
    tell: 'AGAIN',
    cast() {
      const p = tk.player;
      pattern = [];
      for (let i = 0; i < RD_LANES; i++) {
        const through = i === 0 ? { x: p.x, y: p.y } : { x: tk.clampX(120 + Math.random() * (tk.W - 240)), y: tk.clampY(TOP + 80 + Math.random() * (tk.H - TOP - 160)) };
        pattern.push({ x: through.x, y: through.y, angle: (i % 2 ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.7 });
      }
      loops = tk.hard ? 3 : 2;
      startAt = tk.now;
      active = true;
      fire(0);
      for (let l = 1; l < loops; l++) {
        const loop = l;
        tk.schedule(RD_LOOP_MS * l, () => {
          fire(loop);
          tk.host.showFloatingText(tk.bossX, tk.bossY - 70, loop === 1 ? 'AGAIN...' : 'AND AGAIN...', '#e4d8ff');
          tk.sfx('clock-tick');
        });
      }
    },
    update(time) {
      if (active && time - startAt > RD_LOOP_MS * loops + 1500) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      // Ghosts of the next loop's lanes — dotted, faint, so the pattern can be learned.
      const loopIdx = Math.floor((time - startAt) / RD_LOOP_MS);
      if (loopIdx + 1 >= loops) return;
      for (const l of pattern) {
        const L = 1200;
        const ax = l.x - Math.cos(l.angle) * L, ay = l.y - Math.sin(l.angle) * L;
        const bx = l.x + Math.cos(l.angle) * L, by = l.y + Math.sin(l.angle) * L;
        dotted(g, [{ x: ax, y: ay }, { x: bx, y: by }], 18, 2, DREAM_LIT, 0.25, time / 20);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      // A rewinding clock over his head, one pip per loop.
      const t = time / 1000;
      const x = tk.bossX, y = tk.bossY - 92;
      g.fillStyle(REV_DARK, 0.7); g.fillCircle(x, y, 14);
      g.lineStyle(2, MOON_GOLD, 0.9); g.strokeCircle(x, y, 14);
      g.lineBetween(x, y, x + Math.cos(-t * 6) * 10, y + Math.sin(-t * 6) * 10);
      g.lineBetween(x, y, x + Math.cos(-t * 0.5) * 6, y + Math.sin(-t * 0.5) * 6);
      const done = Math.min(loops, Math.floor((time - startAt) / RD_LOOP_MS) + 1);
      for (let i = 0; i < loops; i++) { g.fillStyle(i < done ? MOON_GOLD : 0x1a1430, 1); g.fillCircle(x - (loops - 1) * 6 + i * 12, y + 22, 3.5); }
    },
    onPhaseEnd() { active = false; pattern = []; },
  };
};

// ── Signature: A Dream Within a Dream ────────────────────────────────
// Gilt picture frames appear at the edge of the room and close in on the middle, one inside the
// next. Each frame has one open door, all on the same side, each a step along from the last; a
// closing frame that passes over you anywhere but through its door hurts. Meet each frame at its
// door, then sidestep to the next one's.

const DD_FRAMES = 3;
const DD_EVERY_MS = 1150;
const DD_SPEED = 105;
const DD_DOOR = 130;
const DD_DAMAGE = 14;

const dreamWithinDream = (tk: BossToolkit): SignatureMove => {
  interface Frame { at: number; hw0: number; hh0: number; side: 0 | 1 | 2 | 3; off: number; wasIn: boolean; hit: boolean; dead: boolean }
  let frames: Frame[] = [];
  const cx = (): number => tk.W / 2;
  const cy = (): number => (tk.H + TOP) / 2;
  const size = (f: Frame, time: number): { hw: number; hh: number } => {
    const d = Math.max(0, (time - f.at) / 1000) * DD_SPEED;
    const ratio = f.hh0 / f.hw0;
    const hw = Math.max(0, f.hw0 - d);
    return { hw, hh: hw * ratio };
  };
  const inside = (x: number, y: number, hw: number, hh: number): boolean => Math.abs(x - cx()) < hw && Math.abs(y - cy()) < hh;
  /** Where the door sits along its side (centre, px from the side's middle). */
  const doorAt = (f: Frame, hw: number): number => f.off * (hw / f.hw0);
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'clap',
    tell: 'A DREAM WITHIN A DREAM',
    cast() {
      const n = tk.hard ? DD_FRAMES + 1 : DD_FRAMES;
      const hw0 = tk.W / 2 - 14, hh0 = (tk.H - TOP) / 2 - 8;
      // Every frame's door is on the same side — the side nearest the player when he casts — and
      // each one drifts along it by less than a door's width from the last, so a player who went
      // through one door has time to sidestep to the next (the ring-gap rule, for frames).
      const p0 = tk.player;
      const ndx = (p0.x - cx()) / hw0, ndy = (p0.y - cy()) / hh0;
      const side: 0 | 1 | 2 | 3 = Math.abs(ndx) > Math.abs(ndy) ? (ndx < 0 ? 3 : 1) : (ndy < 0 ? 0 : 2);
      const along = side % 2 === 0 ? hw0 : hh0;
      const limit = along * 0.55;
      let off = Phaser.Math.Clamp((side % 2 === 0 ? p0.x - cx() : p0.y - cy()) + (Math.random() - 0.5) * 120, -limit, limit);
      for (let i = 0; i < n; i++) {
        const myOff = off;
        off = Phaser.Math.Clamp(off + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 50), -limit, limit);
        tk.schedule(i * DD_EVERY_MS, () => {
          const p = tk.player;
          frames.push({ at: tk.now + tk.warn(500), hw0, hh0, side, off: myOff, wasIn: inside(p.x, p.y, hw0, hh0), hit: false, dead: false });
          tk.sfx('portal');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const f of frames) {
        if (f.dead || time < f.at) continue;
        const { hw, hh } = size(f, time);
        if (hw < 16) { f.dead = true; continue; }
        const now = inside(p.x, p.y, hw, hh);
        if (f.wasIn && !now && !f.hit) {
          // Which side did the edge cross them on?
          const dx = p.x - cx(), dy = p.y - cy();
          const side: 0 | 1 | 2 | 3 = Math.abs(dx) / hw > Math.abs(dy) / hh ? (dx < 0 ? 3 : 1) : (dy < 0 ? 0 : 2);
          const along = side % 2 === 0 ? dx : dy;
          const door = doorAt(f, hw);
          const halfDoor = Math.min(DD_DOOR, (side % 2 === 0 ? hw : hh) * 1.6) / 2;
          if (side === f.side && Math.abs(along - door) < halfDoor) {
            tk.host.showFloatingText(p.x, p.y - 50, 'THROUGH THE DOOR', '#ffe2a0');
          } else {
            f.hit = true;
            tk.hitPlayer(DD_DAMAGE, p.x, p.y);
            tk.host.showFloatingText(p.x, p.y - 50, 'FRAMED', '#ffd27a');
            tk.sfx('clang');
          }
        }
        f.wasIn = now;
      }
      frames = frames.filter((f) => !f.dead);
    },
    drawGround(g, time) {
      for (const f of frames) {
        if (time < f.at) {
          // Wind-up: the frame's outline flickers at the edge of the room.
          const k = 1 - (f.at - time) / tk.warn(500);
          g.lineStyle(3, GILT, 0.3 * k); g.strokeRect(cx() - f.hw0, cy() - f.hh0, f.hw0 * 2, f.hh0 * 2);
          continue;
        }
        const { hw, hh } = size(f, time);
        // The painted night inside the frame.
        g.fillStyle(0x1a1840, 0.12); g.fillRect(cx() - hw, cy() - hh, hw * 2, hh * 2);
      }
    },
    drawAir(g, time) {
      for (const f of frames) {
        if (time < f.at) continue;
        const { hw, hh } = size(f, time);
        const x0 = cx() - hw, y0 = cy() - hh, x1 = cx() + hw, y1 = cy() + hh;
        // A thick gilt moulding, darker underside, a lit inner bead.
        g.lineStyle(14, GILT_DARK, 0.95); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
        g.lineStyle(10, GILT, 1); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
        g.lineStyle(2, lit(GILT, 0.5), 1); g.strokeRect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8);
        // Corner rosettes.
        for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as [number, number][]) {
          g.fillStyle(GILT_DARK, 1); g.fillCircle(px, py, 11);
          g.fillStyle(GILT, 1); g.fillCircle(px, py, 8);
          star(g, px, py, 5, lit(GILT, 0.4), 1);
        }
        // The door: a gap in the moulding with an open door swung inward, moonlight through it.
        const door = doorAt(f, hw);
        const half = Math.min(DD_DOOR, (f.side % 2 === 0 ? hw : hh) * 1.6) / 2;
        let dx0: number, dy0: number, dx1: number, dy1: number;
        if (f.side === 0 || f.side === 2) { const y = f.side === 0 ? y0 : y1; dx0 = cx() + door - half; dx1 = cx() + door + half; dy0 = y - 9; dy1 = y + 9; }
        else { const x = f.side === 3 ? x0 : x1; dy0 = cy() + door - half; dy1 = cy() + door + half; dx0 = x - 9; dx1 = x + 9; }
        g.fillStyle(0x1a1840, 1); g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
        g.fillStyle(MOON, 0.55); g.fillRect(dx0 + 2, dy0 + 2, dx1 - dx0 - 4, dy1 - dy0 - 4);
        g.lineStyle(3, WALNUT_LIT, 1);
        if (f.side === 0 || f.side === 2) g.lineBetween(dx0, (dy0 + dy1) / 2, dx0 + 14, (dy0 + dy1) / 2 + (f.side === 0 ? 30 : -30));
        else g.lineBetween((dx0 + dx1) / 2, dy0, (dx0 + dx1) / 2 + (f.side === 3 ? 30 : -30), dy0 + 14);
      }
    },
    onPhaseEnd() { frames = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const REVERIE_BOSS: WorldBossDef = {
  worldId: 'isle:reverie',
  name: 'Prince Reverie',
  title: 'His Drowsiness, Warden of the Long Ward',
  color: REV,
  colorLit: REV_LIT,
  colorDark: REV_DARK,
  accent: ACCENT,
  damageMult: 1.1,

  intro: [
    'Mm? Oh. A visitor. Do keep your voice down — half the isle is asleep in my court, and they owe so very much.',
    'Father taxes breath. I merely help people take less of it.',
    'Lie down. Everyone lies down for me, in the end.',
  ],
  banter: [
    'A sleeper breathes eleven times a minute. A worried man, twenty. Which would you rather be taxed on?',
    'Six hundred beds on the Long Ward, and not one complaint. Not one. Isn\'t that restful?',
    'I have not been properly awake since I was nine. I recommend it.',
    'You\'re breathing very hard. That\'s going on your bill, you know.',
    'Shh. Shh. Count with me. One... two...',
    'Father says I am lazy. Father has never once collected more breath than I have.',
  ],
  defeatLine: 'HIS DROWSINESS WAKES AT LAST',
  resumeLine: 'Back again? You must be dreaming.',

  phases: [
    {
      name: 'Sweet Dreams',
      line: 'There, there. Close your eyes. The sheep will see to everything.',
      hp: 430,
      cycle: [
        'sig:sleepyBubbles', 'volley', 'sig:sheepStampede', 'sig:countingLeap', 'radial',
        'sig:sleepyBubbles', 'homing', 'sig:sheepStampede', 'sig:countingLeap', 'barrage',
      ],
      harass: ['h-orbs', 'h-flak', 'h-snipe'],
      restMs: 1060,
      harassMs: 3000,
    },
    {
      name: 'Night Terror',
      line: 'You WOKE me. Nobody wakes me. Now it\'s a bad dream — and it\'s yours.',
      hp: 510,
      cycle: [
        'sig:nightmareHands', 'sig:staringEyes', 'lanes', 'sig:wardrobe', 'spiral',
        'sig:nightmareHands', 'charge', 'sig:staringEyes', 'sig:wardrobe', 'minefield',
      ],
      harass: ['h-rune', 'h-flak', 'h-mines'],
      restMs: 940,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'NEVER WAKE',
    extraPhase: {
      name: 'Never Wake',
      line: 'Wake up. Wake UP. ...No. This is still the dream. It\'s always still the dream.',
      hp: 370,
      cycle: [
        'sig:dreamWithinDream', 'sig:dejaVu', 'sig:recurringDream', 'sig:nightmareHands',
        'sig:dreamWithinDream', 'sweep', 'sig:dejaVu', 'sig:recurringDream', 'quake',
      ],
      harass: ['h-lane', 'h-rune', 'h-orbs'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.8 },
    radial: { count: 14, speed: 230 },
    homing: { count: 3 },
    lanes: { halfW: 28 },
  },

  signatures: {
    sleepyBubbles,
    sheepStampede,
    countingLeap,
    nightmareHands,
    wardrobe,
    staringEyes,
    dejaVu,
    recurringDream,
    dreamWithinDream,
  },

  look: { crest: 'none', pattern: 'swirl', aura: 'bubbles', hands: 'ball', torsoR: 34, mouth: 'line', eyes: 2, eyeColor: DREAM_LIT },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'blink', gimmick: 'gloom', tint: 'void', look: { pattern: 'static', aura: 'smoke', hands: 'claw', mouth: 'maw', eyes: 3, eyeColor: NIGHTMARE_EYE, torsoR: 36 } },
    { movement: 'orbit', gimmick: 'none', tint: 'pale', look: { pattern: 'rings', aura: 'glitch', hands: 'wisp', mouth: 'stitch', eyes: 2, torsoR: 34 } },
  ],

  /**
   * Sweet Dreams: a long lilac nightcap slumped over one shoulder with a gold crescent on its
   * pompom, eyelids half down, a patchwork quilt worn as a cape, a chamberstick with a candle in
   * one hand, and his own brass breath-meter on his chest with the needle full — he has never been
   * short. Night Terror: the cap torn and blackened, the candle blown out and smoking, and shadow
   * fingers trailing off him to the floor. Never Wake: he comes in loops — a lagging echo of
   * himself a step behind, a gilt frame hanging round him, and a clock face orbiting backwards.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const R = s.radius;
    const lx = Math.cos(s.facing) * (R * 0.13), ly = Math.sin(s.facing) * (R * 0.1);
    const lids = (cover: number, color: number): void => {
      // Heavy eyelids pulled down over the rig's eyes.
      for (const side of [-1, 1]) {
        const ex = s.x + side * R * 0.32 + lx, ey = s.y - R * 0.12 + ly;
        const er = R * 0.17 * 1.3;
        g.fillStyle(color, 1);
        g.fillRect(ex - er, ey - er, er * 2, er * cover * 1.6);
        g.lineStyle(2, dim(color, 0.4), 1); g.lineBetween(ex - er, ey - er + er * cover * 1.6, ex + er, ey - er + er * cover * 1.6);
      }
    };
    if (s.phaseIdx === 0) {
      // Quilt cape round his shoulders.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const px = s.x + Math.cos(a) * R * 0.92, py = s.y + Math.sin(a) * R * 0.75;
        g.fillStyle(dim(QUILTS[i % QUILTS.length], 0.2), 1); g.fillRect(px - 8, py - 6, 16, 14);
        g.fillStyle(QUILTS[i % QUILTS.length], 1); g.fillRect(px - 7, py - 7, 14, 12);
        stitchLine(g, px - 7, py - 1, px + 7, py - 1, 0x6a5a7a, 0.7, 3, 2);
      }
      lids(0.5, s.palette.main);
      nightcapOn(g, s.x, s.y - R * 0.55, R * 0.95, s.palette.lit, 1, 0.9, Math.sin(t * 1.2) * 4);
      // The gold crescent on the pompom.
      const tipX = s.x + R * 0.95 * 2.2 + Math.sin(t * 1.2) * 4, tipY = s.y - R * 0.55 - R * 0.95 * 0.39;
      g.fillStyle(MOON_GOLD, 1); g.fillCircle(tipX, tipY, 6);
      g.fillStyle(FEATHER, 1); g.fillCircle(tipX + 3, tipY - 2, 5);
      breathMeter(g, s.x - R * 0.35, s.y + R * 0.42, 6, 1);
      // Chamberstick in the first hand, a candle with a lazy flame.
      const h = s.hands[0];
      if (h) {
        g.fillStyle(BRASS, 1); g.fillEllipse(h.x, h.y + 6, 22, 7);
        g.fillStyle(LINEN, 1); g.fillRect(h.x - 3, h.y - 14, 6, 20);
        const fl = Math.sin(t * 9) * 1.5;
        g.fillStyle(LAMP_FULL, 0.25); g.fillCircle(h.x, h.y - 20, 10);
        g.fillStyle(LAMP_FULL, 1); g.fillEllipse(h.x + fl * 0.3, h.y - 20, 5, 9);
      }
      zzz(g, s.x + R * 0.9, s.y - R * 1.2, 7, t, DREAM_LIT, 0.9);
    } else if (s.phaseIdx === 1) {
      // Shadow fingers trailing off him to the floor.
      for (let i = 0; i < 6; i++) {
        const bx = s.x - R * 0.7 + i * R * 0.28;
        const sway = Math.sin(t * 2 + i) * 6;
        g.lineStyle(5 - (i % 2), NIGHTMARE, 0.85);
        g.beginPath(); g.moveTo(bx, s.y + R * 0.6);
        g.lineTo(bx + sway * 0.5, s.y + R * 1.1); g.lineTo(bx + sway, s.y + R * 1.6 + (i % 3) * 6);
        g.strokePath();
      }
      // The cap torn and blackened, hanging in tatters.
      nightcapOn(g, s.x, s.y - R * 0.55, R * 0.95, mixC(NIGHTMARE, DREAM, 0.25), 1, 1.1, Math.sin(t * 3) * 6);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(NIGHTMARE, 1);
        g.fillTriangle(s.x - R * 0.6 + i * R * 0.4, s.y - R * 0.95, s.x - R * 0.4 + i * R * 0.4, s.y - R * 0.95, s.x - R * 0.5 + i * R * 0.4, s.y - R * 0.7);
      }
      // The candle out, smoke curling off the wick.
      const h = s.hands[0];
      if (h) {
        g.fillStyle(dim(BRASS, 0.4), 1); g.fillEllipse(h.x, h.y + 6, 22, 7);
        g.fillStyle(dim(LINEN, 0.4), 1); g.fillRect(h.x - 3, h.y - 12, 6, 18);
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.8 + i / 4) % 1;
          g.fillStyle(0x6a6080, 0.5 * (1 - ph)); g.fillCircle(h.x + Math.sin(ph * 8 + i) * 5, h.y - 16 - ph * 34, 3 + ph * 5);
        }
      }
    } else {
      // The echo: a lagging copy of him a step behind, in outline.
      const ex = s.x - Math.cos(s.facing) * 22 + Math.sin(t * 2) * 4, ey = s.y - Math.sin(s.facing) * 22;
      g.lineStyle(2, REV_LIT, 0.35); g.strokeCircle(ex, ey, R);
      g.lineStyle(1.5, REV_LIT, 0.25); g.strokeCircle(ex - 20, ey + 4, R * 0.95);
      lids(0.8, s.palette.main);
      nightcapOn(g, s.x, s.y - R * 0.55, R * 0.95, s.palette.lit, 0.85, 0.5, Math.sin(t * 0.8) * 3);
      // A gilt frame hung round him.
      g.lineStyle(5, GILT, 0.8); g.strokeRect(s.x - R * 1.5, s.y - R * 1.9, R * 3, R * 3.4);
      g.lineStyle(1.5, lit(GILT, 0.4), 0.8); g.strokeRect(s.x - R * 1.5 + 4, s.y - R * 1.9 + 4, R * 3 - 8, R * 3.4 - 8);
      // A clock face orbiting backwards.
      const a = -t * 1.4;
      const cx = s.x + Math.cos(a) * R * 1.8, cy = s.y + Math.sin(a) * R * 1.2;
      g.fillStyle(LINEN, 0.85); g.fillCircle(cx, cy, 9);
      g.lineStyle(1.5, REV_DARK, 1); g.strokeCircle(cx, cy, 9);
      g.lineBetween(cx, cy, cx + Math.cos(-t * 7) * 7, cy + Math.sin(-t * 7) * 7);
    }
    if (s.hurt) {
      // Feathers knocked out of him.
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + t;
        g.fillStyle(FEATHER, 0.9);
        g.fillEllipse(s.x + Math.cos(a) * (R + 8), s.y + Math.sin(a) * (R + 8), 7, 3);
      }
    }
  },

  /**
   * The Prince's bedchamber, seen from the canopy: the floor of the fight is the top of his own
   * enormous bed. A counterpane of midnight silk channel-quilted in long diamonds, embroidered in
   * gold thread with the constellations of the sleeping sky and a crescent moon over a little
   * flock of sheep; gold piping round its edge; the carved headboard and a bank of pillows along
   * the top; and on the counterpane, where he sleeps on them, a heap of corked breath bottles —
   * the court's tax, kept warm.
   */
  drawArena(g, W, H) {
    g.fillStyle(0x14122a, 1); g.fillRect(0, 0, W, H);
    const x0 = 24, y0 = TOP + 34, x1 = W - 24, y1 = H - 30;
    // The silk, with a sheen that runs across it.
    g.fillStyle(0x22204a, 1); g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let i = 0; i < 12; i++) { g.fillStyle(0x3a3870, 0.08); g.fillEllipse(x0 + (i * 97) % (x1 - x0), y0 + 40 + ((i * 53) % (y1 - y0 - 80)), 300, 60); }
    // Channel quilting in long diamonds.
    g.lineStyle(1.5, 0x15132e, 0.9);
    for (let d = -H; d < W + H; d += 70) {
      g.lineBetween(d, y0, d + (y1 - y0) * 0.6, y1);
      g.lineBetween(d, y1, d + (y1 - y0) * 0.6, y0);
    }
    g.lineStyle(1, 0x3a3870, 0.4);
    for (let d = -H; d < W + H; d += 70) g.lineBetween(d + 2, y0, d + 2 + (y1 - y0) * 0.6, y1);
    // Constellations in gold thread: stars joined by a running stitch.
    const figures: Pt[][] = [
      [{ x: 120, y: 220 }, { x: 170, y: 190 }, { x: 230, y: 210 }, { x: 260, y: 260 }, { x: 210, y: 300 }],
      [{ x: 700, y: 200 }, { x: 760, y: 240 }, { x: 820, y: 220 }, { x: 860, y: 270 }],
      [{ x: 640, y: 480 }, { x: 700, y: 520 }, { x: 780, y: 500 }, { x: 820, y: 560 }, { x: 760, y: 590 }],
      [{ x: 140, y: 470 }, { x: 200, y: 520 }, { x: 160, y: 580 }],
    ];
    for (const fig of figures) {
      for (let i = 0; i < fig.length - 1; i++) stitchLine(g, fig[i].x, fig[i].y, fig[i + 1].x, fig[i + 1].y, MOON_GOLD, 0.6, 5, 4);
      for (const p of fig) star(g, p.x, p.y, 5, MOON_GOLD, 0.85, p.x);
    }
    for (let i = 0; i < 60; i++) { const x = x0 + ((i * 137) % (x1 - x0)), y = y0 + ((i * 89) % (y1 - y0)); g.fillStyle(MOON, 0.5); g.fillCircle(x, y, 1.2); }
    // The moon and its flock, embroidered in the middle.
    const cx = W / 2, cy = (H + TOP) / 2 + 10;
    moon(g, cx - 40, cy - 30, 46, 0.8, 0.7);
    for (let i = 0; i < 3; i++) dreamSheep(g, cx + 30 + i * 46, cy + 50 - (i % 2) * 14, 13, -1, i, i === 1 ? 0.45 : 0, 0.75, mixC(LINEN, MOON_GOLD, 0.2));
    // Gold piping round the counterpane.
    g.lineStyle(6, GILT_DARK, 1); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.lineStyle(3, MOON_GOLD, 1); g.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
    // The headboard and the bank of pillows along the top.
    g.fillStyle(WALNUT, 1); g.fillRect(0, TOP - 6, W, 40);
    g.fillStyle(WALNUT_LIT, 1); g.fillRect(0, TOP - 6, W, 5);
    for (let x = 60; x < W; x += 120) { g.fillStyle(dim(WALNUT, 0.3), 1); g.fillCircle(x, TOP + 12, 9); moon(g, x, TOP + 12, 5, 0.9, 0.7); }
    for (let i = 0; i < 6; i++) pillow(g, 110 + i * 150, TOP + 34, 120, 36, i % 2 ? LINEN : FEATHER, 1, (i % 3 - 1) * 0.06);
    // The heap of corked breath at the foot of the bed, where his feet go.
    for (let i = 0; i < 14; i++) {
      const bx = W - 170 + (i % 5) * 22 + (Math.floor(i / 5) % 2) * 11, by = H - 44 - Math.floor(i / 5) * 14;
      breathBottle(g, bx, by, 6, 0.8, 1, (i % 3 - 1) * 0.3);
    }
    g.fillStyle(BOTTLE, 0.15); g.fillEllipse(W - 120, H - 56, 140, 50);
    // The footboard rail.
    g.fillStyle(WALNUT, 1); g.fillRect(0, H - 18, W, 18);
    g.fillStyle(WALNUT_LIT, 1); g.fillRect(0, H - 18, W, 3);
  },
};
