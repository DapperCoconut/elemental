import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import { chainLinks, chainPost, draughtSeal, ironBall, key, manacle, padlock, sagPoints, tallyMarks } from './art';
import {
  BRUISE, BRUISE_LIT, FETTER, FETTER_DARK, FETTER_KEY, FETTER_LIT, HOT, HOT_LIT, INK, IRON, IRON_DARK, IRON_LIT,
  PAPER, RUST, STONE, STONE_DARK, STONE_LIT, TAR, TIMBER, TIMBER_DARK,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Fetter, Keeper of the Keys — the Matriarch's broodling who governs the Shackle Court.
 *
 * Fetter holds every key on the court on one great ring at his hip — the gaol's, the stocks',
 * the Works', every debtor's ankle-iron — and he can name the lock each one opens. His mother
 * keeps a ledger too: what each of her children owes her for its life. Fetter's page is the
 * longest. He has never missed a payment. He fights the way a gaoler keeps a gaol:
 *
 * • **Manacles** (orbiting): throws a chain with a cuff on the end — a post slams into the floor
 *   and, if the throw caught you, you are tethered to it and can only move round it (strike the
 *   post to break it); then fences you in, chains snapping taut between his posts; then lays a
 *   ring of open irons round you that clap shut one after another.
 * • **The Gaoler** (anchored, the void tint): out comes the great ball and chain. He whirls it in
 *   a widening spiral that smashes the floor, and hurls it up to land on you and drags it home
 *   along the ground.
 * • **Life Sentence** (hard, stalking, pale): the walls chain in toward the centre. The padlocks
 *   on each wall can be struck to push it back.
 */

const TOP = 96;
const PLAYER_R = 20;

const alive = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;

/** Move the player bodily (a tether, a fence) — clamped to the floor. */
function place(tk: BossToolkit, x: number, y: number): void {
  const p = tk.player;
  p.x = clamp(x, 40, tk.W - 40);
  p.y = clamp(y, TOP + 20, tk.H - 40);
}

const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);

// ── Shared: the iron posts ───────────────────────────────────────────
// The Manacles throw leaves a post in the floor; the Chain Fence strings chains between them.

interface Post { x: number; y: number; at: number; handle: StrikeTarget | null; struck: number }
const POSTS = new WeakMap<BossToolkit, Post[]>();
const postsOf = (tk: BossToolkit): Post[] => {
  let p = POSTS.get(tk);
  if (!p) { p = []; POSTS.set(tk, p); }
  return p;
};

/** Whether the great ball is off his hand (the decor stops drawing it while a move has it). */
let ballOut = false;

function addPost(tk: BossToolkit, x: number, y: number, time: number, onStruck: (p: Post, amount: number) => void): Post {
  const posts = postsOf(tk);
  while (posts.length >= 5) posts.shift()?.handle?.remove();
  const post: Post = { x: tk.clampX(x, 50), y: tk.clampY(y, 60), at: time, handle: null, struck: 0 };
  post.handle = tk.spawnTarget({ x: post.x, y: post.y - 14, r: 20, onStruck: (by, amount) => { if (by === 'player') onStruck(post, amount); } });
  posts.push(post);
  return post;
}

function drawPosts(tk: BossToolkit, g: Phaser.GameObjects.Graphics, time: number): void {
  for (const p of postsOf(tk)) {
    const k = clamp((time - p.at) / 220, 0, 1);
    if (k < 1) {
      // Slamming in: dropping from above, then dust.
      g.fillStyle(0x000000, 0.3 * k); g.fillEllipse(p.x, p.y + 2, 30, 9);
      chainPost(g, p.x, p.y - (1 - k) * 120, 1.3);
    } else {
      chainPost(g, p.x, p.y, 1.3);
      const d = (time - p.at - 220) / 400;
      if (d < 1) { g.lineStyle(3 * (1 - d), STONE_LIT, 1 - d); g.strokeEllipse(p.x, p.y, 30 + d * 50, 10 + d * 16); }
    }
    // Cracks in the flags round its foot.
    g.lineStyle(1.2, STONE_DARK, 0.8);
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + p.x; g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 6); }
  }
}

// ── Signature: Manacles ──────────────────────────────────────────────
// He winds a chain round his fist and throws it, cuff first, down a line through you. A post
// slams into the floor where it lands. If the cuff caught you, you are tethered to that post on
// a short chain — you can move only round it — until it lets go or you break the post.

const manacles = (tk: BossToolkit): SignatureMove => {
  let throwAt = 0, fireAt = 0;
  let a = 0, ox = 0, oy = 0, ex = 0, ey = 0;
  let live = false;
  let tether: Post | null = null;
  let tetherUntil = 0;
  let snapAt = -9999;
  const LEN = 120;
  const HALF = 24;
  const breakPost = (p: Post, amount: number) => {
    if (tether !== p) return;
    p.struck += amount;
    if (p.struck >= 22) {
      tether = null;
      snapAt = tk.now;
      tk.sfx('shield-break');
      float(tk, p.x, p.y - 50, 'CHAIN BROKEN', '#d8f0a0');
    }
  };
  return {
    durationMs: 1500,
    windupMs: 560,
    gesture: 'point',
    hold: 'draw',
    tell: 'MANACLES',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY;
      a = tk.angleToPlayer();
      const reach = clamp(dist(ox, oy, tk.player.x, tk.player.y) + 70, 200, 620);
      ex = tk.clampX(ox + Math.cos(a) * reach, 50); ey = tk.clampY(oy + Math.sin(a) * reach, 60);
      throwAt = time;
      fireAt = time + tk.warn(760);
      live = true;
      tk.sfx('chain');
    },
    update(time) {
      const p = tk.player;
      if (live && time >= fireAt) {
        live = false;
        const caught = alive(tk) && segDist(p.x, p.y, ox, oy, ex, ey) < HALF + PLAYER_R;
        // The post goes in just past you if you were caught, at the throw's end if not.
        const px = caught ? p.x + Math.cos(a) * 50 : ex, py = caught ? p.y + Math.sin(a) * 50 : ey;
        const post = addPost(tk, px, py, time, breakPost);
        tk.sfx('stone-slam');
        if (caught) {
          tk.hitPlayer(9, p.x, p.y);
          tether = post;
          tetherUntil = time + (tk.hard ? 4000 : 3400);
          float(tk, p.x, p.y - 50, 'TETHERED', '#ffb0a0');
        }
      }
      if (tether && (time >= tetherUntil || !alive(tk))) { tether = null; snapAt = time; tk.sfx('snap-back'); }
      if (tether) {
        const d = dist(p.x, p.y, tether.x, tether.y);
        if (d > LEN) place(tk, tether.x + ((p.x - tether.x) * LEN) / d, tether.y + ((p.y - tether.y) * LEN) / d);
      }
    },
    drawGround(g, time) {
      if (live) {
        // The throw's line, brightening, a cuff-shaped mark at its end.
        const k = clamp((time - throwAt) / Math.max(1, fireAt - throwAt), 0, 1);
        g.fillStyle(IRON_DARK, 0.12 + k * 0.14);
        const nx = -Math.sin(a), ny = Math.cos(a);
        g.fillPoints([
          { x: ox + nx * HALF, y: oy + ny * HALF }, { x: ex + nx * HALF, y: ey + ny * HALF },
          { x: ex - nx * HALF, y: ey - ny * HALF }, { x: ox - nx * HALF, y: oy - ny * HALF },
        ], true, true);
        g.lineStyle(2, FETTER_LIT, 0.3 + k * 0.5);
        g.lineBetween(ox + nx * HALF, oy + ny * HALF, ex + nx * HALF, ey + ny * HALF);
        g.lineBetween(ox - nx * HALF, oy - ny * HALF, ex - nx * HALF, ey - ny * HALF);
        g.lineStyle(2, FETTER_LIT, 0.4 + k * 0.4); g.strokeCircle(ex, ey, 14 + (1 - k) * 20);
      }
      drawPosts(tk, g, time);
      if (tether) {
        g.lineStyle(1.5, BRUISE_LIT, 0.35); g.strokeCircle(tether.x, tether.y, LEN);
      }
    },
    drawAir(g, time) {
      // The chain in flight: links paying out from his fist, the cuff at the head.
      if (live || time - fireAt < 200) {
        const k = live ? clamp((time - throwAt) / Math.max(1, fireAt - throwAt), 0, 1) : 1;
        const out = k < 0.7 ? 0.15 : (k - 0.7) / 0.3;
        const hx = ox + (ex - ox) * out, hy = oy + (ey - oy) * out;
        chainLinks(g, [{ x: ox, y: oy }, { x: hx, y: hy }], 9, IRON, 1.8);
        manacle(g, hx, hy, 9, a + Math.PI, 0.8, 0);
      }
      const p = tk.player;
      if (tether && alive(tk)) {
        const d = dist(p.x, p.y, tether.x, tether.y - 24);
        const sag = Math.max(0, (LEN - d) * 0.3);
        chainLinks(g, sagPoints(tether.x + 8, tether.y - 22, p.x, p.y + 12, sag, 8), 8, d > LEN - 6 ? IRON_LIT : IRON, 1.8);
        manacle(g, p.x, p.y + 14, 6, -Math.PI / 2, 0, 0);
        const q = clamp((tetherUntil - time) / (tk.hard ? 4000 : 3400), 0, 1);
        g.lineStyle(3, BRUISE_LIT, 0.8); g.beginPath(); g.arc(tether.x, tether.y - 52, 10, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2, false); g.strokePath();
        // Damage on the post, as cracks of light.
        if (tether.struck > 0) { g.lineStyle(2, HOT_LIT, 0.8); g.lineBetween(tether.x - 6, tether.y - 34, tether.x + 2, tether.y - 20 + (tether.struck / 22) * 10); }
      }
      if (time - snapAt < 400) {
        const k = (time - snapAt) / 400;
        for (let i = 0; i < 6; i++) { g.fillStyle(IRON_LIT, 1 - k); g.fillCircle(p.x + Math.cos(i) * k * 40, p.y + 10 + Math.sin(i) * k * 20, 2.5); }
      }
    },
    onPhaseEnd() {
      live = false; tether = null;
      for (const p of postsOf(tk)) p.handle?.remove();
      postsOf(tk).length = 0;
    },
  };
};

// ── Signature: Chain Fence ───────────────────────────────────────────
// He tops up his posts round you to four or more, and chains lie slack between them on the floor
// in a ring. They snap taut one after another — a hit if you are on the line — and then stand as
// a fence for a while: crossing a taut chain hurts and throws you back.

interface Span { ax: number; ay: number; bx: number; by: number; snapAt: number; dealt: boolean }

const fence = (tk: BossToolkit): SignatureMove => {
  let spans: Span[] = [];
  let downAt = 0;
  let lastCross = 0;
  let prev = { x: 0, y: 0 };
  const side = (s: Span, x: number, y: number) => Math.sign((s.bx - s.ax) * (y - s.ay) - (s.by - s.ay) * (x - s.ax));
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'clap',
    tell: 'CHAIN FENCE',
    cast(time) {
      const p = tk.player;
      const posts = postsOf(tk);
      // Posts round you, in angle order: his own if close, new ones to make up four.
      let ring = posts.filter((q) => dist(q.x, q.y, p.x, p.y) < 320);
      const want = tk.hard ? 5 : 4;
      const base = Math.random() * Math.PI * 2;
      for (let i = ring.length; i < want; i++) {
        const ang = base + (i / want) * Math.PI * 2;
        const r = 150 + Math.random() * 70;
        ring.push(addPost(tk, p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.85, time, () => {}));
      }
      ring = ring.slice(0, 6).sort((u, v) => Math.atan2(u.y - p.y, u.x - p.x) - Math.atan2(v.y - p.y, v.x - p.x));
      spans = ring.map((q, i) => {
        const r = ring[(i + 1) % ring.length];
        return { ax: q.x, ay: q.y - 18, bx: r.x, by: r.y - 18, snapAt: time + tk.warn(1050) + i * 170, dealt: false };
      });
      downAt = time + tk.warn(1050) + ring.length * 170 + (tk.hard ? 2600 : 2100);
      prev = { x: p.x, y: p.y };
      tk.sfx('chain');
    },
    update(time) {
      const p = tk.player;
      if (!spans.length) { prev = { x: p.x, y: p.y }; return; }
      for (const s of spans) {
        if (s.dealt || time < s.snapAt) continue;
        s.dealt = true;
        tk.sfx('whip');
        if (alive(tk) && segDist(p.x, p.y, s.ax, s.ay, s.bx, s.by) < 14 + PLAYER_R) tk.hitPlayer(11, p.x, p.y);
      }
      // A taut span is a fence.
      if (alive(tk) && time - lastCross > 500) {
        for (const s of spans) {
          if (!s.dealt) continue;
          const before = side(s, prev.x, prev.y), after = side(s, p.x, p.y);
          if (before !== 0 && after !== 0 && before !== after && segDist(p.x, p.y, s.ax, s.ay, s.bx, s.by) < 40) {
            lastCross = time;
            tk.hitPlayer(7, p.x, p.y);
            place(tk, prev.x + (prev.x - p.x) * 2, prev.y + (prev.y - p.y) * 2);
            break;
          }
        }
      }
      prev = { x: p.x, y: p.y };
      if (time >= downAt) spans = [];
    },
    drawGround(g, time) {
      for (const s of spans) {
        if (s.dealt) continue;
        // Slack on the floor: a wavy run of links, glowing as the snap nears.
        const k = clamp(1 - (s.snapAt - time) / 1000, 0, 1);
        const len = dist(s.ax, s.ay, s.bx, s.by);
        const nx = -(s.by - s.ay) / (len || 1), ny = (s.bx - s.ax) / (len || 1);
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, w = Math.sin(t * Math.PI * 3 + s.ax) * 10 * (1 - k * 0.8);
          pts.push({ x: s.ax + (s.bx - s.ax) * t + nx * w, y: s.ay + 18 + (s.by - s.ay) * t + ny * w });
        }
        chainLinks(g, pts, 8, mixC(IRON, BRUISE_LIT, k), 1.6, 0.6 + k * 0.4);
      }
    },
    drawAir(g, time) {
      for (const s of spans) {
        if (!s.dealt) continue;
        const fresh = time - s.snapAt < 200;
        chainLinks(g, [{ x: s.ax, y: s.ay }, { x: s.bx, y: s.by }], 9, fresh ? IRON_LIT : IRON, 2.2);
        if (fresh) { g.lineStyle(4, BRUISE_LIT, 0.5); g.lineBetween(s.ax, s.ay, s.bx, s.by); }
        const thrum = Math.sin(time / 30) * 1.5;
        g.lineStyle(1, BRUISE_LIT, 0.35); g.lineBetween(s.ax, s.ay + thrum, s.bx, s.by + thrum);
      }
    },
    onPhaseEnd() { spans = []; },
  };
};

// ── Signature: Clapping Irons ────────────────────────────────────────
// A ring of open leg-irons is flung down round you. A beat later they clap shut one after
// another round the ring, and last of all the one on the spot where you stood. Each that claps on
// you bites and drags at your step. Slip out across one that has already shut.

interface Iron { x: number; y: number; at: number; dealt: boolean; a: number }

const irons = (tk: BossToolkit): SignatureMove => {
  let ring: Iron[] = [];
  let clearAt = 0;
  const CATCH = 34;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'CLAPPING IRONS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 9 : 8;
      const r = 118;
      const base = Math.random() * Math.PI * 2;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const start = time + tk.warn(950);
      ring = [];
      for (let i = 0; i < n; i++) {
        const a = base + dir * (i / n) * Math.PI * 2;
        ring.push({ x: tk.clampX(p.x + Math.cos(a) * r, 40), y: tk.clampY(p.y + Math.sin(a) * r * 0.8, 40), at: start + i * 240, dealt: false, a });
      }
      ring.push({ x: p.x, y: p.y, at: start + n * 240 + 120, dealt: false, a: 0 });
      clearAt = start + n * 240 + 900;
      tk.sfx('trap-set');
    },
    update(time) {
      const p = tk.player;
      for (const c of ring) {
        if (c.dealt || time < c.at) continue;
        c.dealt = true;
        tk.sfx('trap-snap');
        if (alive(tk) && dist(p.x, p.y, c.x, c.y) < CATCH + PLAYER_R * 0.5) {
          tk.hitPlayer(8, p.x, p.y);
          tk.slowPlayer(0.45, 1100);
          float(tk, p.x, p.y - 50, 'CLAPPED IN IRONS', '#ffb0a0');
        }
      }
      if (time > clearAt) ring = [];
    },
    drawGround(g, time) {
      for (const c of ring) {
        if (c.dealt) {
          const k = clamp((time - c.at) / 600, 0, 1);
          g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillCircle(c.x, c.y, CATCH);
          continue;
        }
        const k = clamp(1 - (c.at - time) / 900, 0, 1);
        g.fillStyle(BRUISE, 0.08 + k * 0.18); g.fillCircle(c.x, c.y, CATCH);
        g.lineStyle(2, BRUISE_LIT, 0.3 + k * 0.6); g.strokeCircle(c.x, c.y, CATCH);
        // The order round the ring: a tick on the next to go.
        if (k > 0.6) { g.lineStyle(3, 0xffe2a8, (k - 0.6) * 2); g.strokeCircle(c.x, c.y, CATCH + 6); }
      }
    },
    drawAir(g, time) {
      for (const c of ring) {
        const open = c.dealt ? 0 : 1 - clamp(1 - (c.at - time) / 140, 0, 1);
        manacle(g, c.x, c.y - 4, 14, c.a + Math.PI / 2, open, 0);
        if (c.dealt && time - c.at < 220) {
          const k = (time - c.at) / 220;
          for (let i = 0; i < 6; i++) { g.lineStyle(1.5, IRON_LIT, 1 - k); const a = i * 1.05; g.lineBetween(c.x + Math.cos(a) * 12, c.y + Math.sin(a) * 8, c.x + Math.cos(a) * (18 + k * 18), c.y + Math.sin(a) * (12 + k * 12)); }
        }
      }
    },
    onPhaseEnd() { ring = []; },
  };
};

// ── Signature: The Great Swing ───────────────────────────────────────
// Out comes the great ball. He plants himself and whirls it round on its chain, letting chain out
// as it goes, so the ball sweeps a widening spiral that smashes the floor. The spiral it will
// take is shown on the floor ahead of it. Step across the arm behind the ball.

interface Crack { x: number; y: number; a: number; at: number }

const greatSwing = (tk: BossToolkit): SignatureMove => {
  let startAt = 0, endAt = 0;
  let a0 = 0, dir = 1;
  let cx = 0, cy = 0;
  let lastHit = 0, lastCrack = 0;
  const cracks: Crack[] = [];
  const R0 = 80, R1 = 360;
  const OMEGA = 2.05;
  const DUR = 3500;
  const BALL = 26;
  const at = (time: number) => {
    const k = clamp((time - startAt) / DUR, 0, 1);
    const a = a0 + dir * OMEGA * ((time - startAt) / 1000);
    const r = R0 + (R1 - R0) * k;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.82, a, r };
  };
  return {
    durationMs: 3700,
    windupMs: 750,
    gesture: 'raise',
    hold: 'brace',
    locksBody: true,
    tell: 'THE GREAT SWING',
    cast(time) {
      cx = tk.bossX; cy = tk.bossY;
      // Start the ball on the far side from you, so the first pass comes round to you.
      a0 = tk.angleToPlayer() + Math.PI;
      dir = Math.random() < 0.5 ? 1 : -1;
      startAt = time; endAt = time + DUR;
      ballOut = true;
      tk.sfx('whoosh');
    },
    update(time) {
      if (time < startAt || time > endAt) { if (time > endAt + 200 && ballOut && endAt > 0) ballOut = false; return; }
      const b = at(time);
      const p = tk.player;
      if (alive(tk) && time - lastHit > 700 && dist(p.x, p.y, b.x, b.y) < BALL + PLAYER_R) {
        lastHit = time;
        tk.hitPlayer(14, p.x, p.y);
        tk.sfx('anvil');
      }
      if (time - lastCrack > 110) {
        lastCrack = time;
        cracks.push({ x: b.x, y: b.y + 10, a: b.a + Math.PI / 2, at: time });
        if (cracks.length > 60) cracks.shift();
        if (Math.floor((time - startAt) / 330) % 2 === 0) tk.sfx('stone-slam');
      }
    },
    drawGround(g, time) {
      for (const c of cracks) {
        const k = clamp((time - c.at) / 3200, 0, 1);
        if (k >= 1) continue;
        g.lineStyle(2, STONE_DARK, 0.8 * (1 - k));
        g.lineBetween(c.x - Math.cos(c.a) * 14, c.y - Math.sin(c.a) * 5, c.x + Math.cos(c.a) * 14, c.y + Math.sin(c.a) * 5);
        g.lineBetween(c.x, c.y, c.x + Math.cos(c.a + 1) * 10, c.y + Math.sin(c.a + 1) * 6);
        g.fillStyle(0x000000, 0.15 * (1 - k)); g.fillEllipse(c.x, c.y, 22, 8);
      }
      if (time > endAt) return;
      // The spiral ahead of the ball: dotted, brighter where it will come soonest.
      const from = Math.max(time, startAt);
      for (let s = 0; s < 1400; s += 50) {
        const t = from + s;
        if (t > endAt) break;
        const b = at(t);
        const k = 1 - s / 1400;
        g.fillStyle(BRUISE_LIT, 0.12 + k * 0.4); g.fillCircle(b.x, b.y, 3 + k * 3);
      }
      if (time < startAt) return;
      // Its reach, widening.
      const b = at(time);
      g.lineStyle(1.5, BRUISE_LIT, 0.25); g.strokeEllipse(cx, cy, b.r * 2, b.r * 1.64);
    },
    drawAir(g, time) {
      if (time < startAt || time > endAt) return;
      const b = at(time);
      chainLinks(g, [{ x: cx, y: cy - 10 }, { x: b.x, y: b.y - BALL * 0.9 }], 12, IRON, 2.6);
      // Motion ghosts round the arc behind it.
      for (let k = 1; k <= 3; k++) {
        const gb = at(time - k * 40);
        g.fillStyle(IRON_DARK, 0.14 * (4 - k)); g.fillCircle(gb.x, gb.y, BALL);
      }
      ironBall(g, b.x, b.y, BALL, 0.4);
    },
    onPhaseEnd() { endAt = 0; ballOut = false; cracks.length = 0; },
  };
};

// ── Signature: Drop and Reel ─────────────────────────────────────────
// He hurls the ball high: its shadow swells over where you stand and it comes down in a crater.
// Then the chain jerks taut along the floor back to his fist, and he reels the ball home along it
// — anything on the chain's line when the ball comes back is ploughed.

const dropAndReel = (tk: BossToolkit): SignatureMove => {
  let tx = 0, ty = 0;
  let throwAt = 0, landAt = 0, tautAt = 0, reelAt = 0, homeAt = 0;
  let hx = 0, hy = 0;
  let reelHit = false;
  let active = false;
  let landed = false;
  const R = 70;
  const REEL_MS = 520;
  const ballPos = (time: number) => {
    if (time < landAt) {
      const k = clamp((time - throwAt) / (landAt - throwAt), 0, 1);
      return { x: hx + (tx - hx) * k, y: hy + (ty - hy) * k - Math.sin(k * Math.PI) * 260, k };
    }
    if (time < reelAt) return { x: tx, y: ty, k: 1 };
    const k = clamp((time - reelAt) / REEL_MS, 0, 1);
    return { x: tx + (hx - tx) * k, y: ty + (hy - ty) * k, k };
  };
  return {
    durationMs: 2700,
    windupMs: 650,
    gesture: 'raise',
    hold: 'charge',
    locksBody: true,
    tell: 'DROP AND REEL',
    cast(time) {
      tx = tk.player.x; ty = tk.player.y;
      hx = tk.bossX; hy = tk.bossY;
      throwAt = time;
      landAt = time + tk.warn(1100);
      tautAt = landAt + 380;
      reelAt = tautAt + tk.warn(420);
      homeAt = reelAt + REEL_MS;
      reelHit = false; landed = false;
      active = true;
      ballOut = true;
      tk.sfx('whoosh');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      if (!landed && time >= landAt) {
        landed = true;
        tk.explode(tx, ty, R, 16, IRON_LIT);
        tk.sfx('gravity-slam');
      }
      if (time >= reelAt && time < homeAt && !reelHit && alive(tk)) {
        const b = ballPos(time);
        if (dist(p.x, p.y, b.x, b.y) < 28 + PLAYER_R) {
          reelHit = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.sfx('anvil');
          // Dragged a step toward him with it.
          const a = Math.atan2(hy - p.y, hx - p.x);
          place(tk, p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40);
        }
      }
      if (time >= homeAt) { active = false; ballOut = false; }
    },
    drawGround(g, time) {
      if (!active) return;
      if (time < landAt) {
        const k = clamp((time - throwAt) / (landAt - throwAt), 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(tx, ty, R * 2 * (0.4 + k * 0.6), R * 0.9 * (0.4 + k * 0.6));
        g.lineStyle(2, BRUISE_LIT, 0.3 + k * 0.6); g.strokeEllipse(tx, ty, R * 2, R * 0.9 * 2);
      } else {
        // The crater.
        g.fillStyle(STONE_DARK, 0.8); g.fillEllipse(tx, ty + 6, R * 1.3, R * 0.6);
        g.lineStyle(2, STONE_DARK, 1);
        for (let i = 0; i < 7; i++) { const a = i * 0.9; g.lineBetween(tx + Math.cos(a) * R * 0.6, ty + 6 + Math.sin(a) * R * 0.28, tx + Math.cos(a) * R * 1.1, ty + 6 + Math.sin(a) * R * 0.5); }
      }
      // The reel's line: brightening between taut and reel.
      if (time >= tautAt && time < homeAt) {
        const k = clamp((time - tautAt) / Math.max(1, reelAt - tautAt), 0, 1);
        const len = dist(tx, ty, hx, hy) || 1;
        const nx = -(hy - ty) / len * 28, ny = (hx - tx) / len * 28;
        g.fillStyle(BRUISE, 0.1 + k * 0.18);
        g.fillPoints([{ x: tx + nx, y: ty + ny }, { x: hx + nx, y: hy + ny }, { x: hx - nx, y: hy - ny }, { x: tx - nx, y: ty - ny }], true, true);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const b = ballPos(time);
      const slack = time < tautAt ? 30 : 0;
      chainLinks(g, sagPoints(hx, hy - 10, b.x, b.y - 22, slack, 10), 11, time >= tautAt ? IRON_LIT : IRON, 2.4);
      ironBall(g, b.x, b.y, 24, 0.4);
      if (time >= landAt && time - landAt < 350) {
        const k = (time - landAt) / 350;
        g.lineStyle(4 * (1 - k), STONE_LIT, 1 - k); g.strokeEllipse(tx, ty, R * 2 * (1 + k), R * (1 + k));
      }
    },
    onPhaseEnd() { active = false; ballOut = false; },
  };
};

// ── Signature: Life Sentence ─────────────────────────────────────────
// The walls of the room chain in. Four walls of hanging chain creep toward the middle (and lurch
// every time he calls the sentence again); touching one hurts and throws you back in. Each wall
// carries padlocks — strike a padlock to push its wall back.

interface Wall { side: 0 | 1 | 2 | 3; inset: number; locks: StrikeTarget[]; pushedAt: number }

const lifeSentence = (tk: BossToolkit): SignatureMove => {
  let walls: Wall[] = [];
  let lastHurt = 0;
  let lurchAt = -9999;
  const CREEP = 7;
  const PUSH = 80;
  const MAX_X = 300, MAX_Y = 170;
  const lineOf = (w: Wall) => {
    switch (w.side) {
      case 0: return w.inset;               // left wall at x
      case 1: return tk.W - w.inset;        // right wall at x
      case 2: return TOP + w.inset;         // top wall at y
      default: return tk.H - w.inset;       // bottom wall at y
    }
  };
  const lockPos = (w: Wall, i: number) => {
    const t = (i + 1) / 3;
    const l = lineOf(w);
    return w.side < 2 ? { x: l, y: TOP + (tk.H - TOP) * t } : { x: tk.W * t, y: l };
  };
  const moveLocks = (w: Wall) => w.locks.forEach((h, i) => { const q = lockPos(w, i); h.moveTo(q.x, q.y); });
  return {
    durationMs: 1300,
    windupMs: 700,
    gesture: 'flex',
    tell: 'LIFE SENTENCE',
    cast(time) {
      if (!walls.length) {
        walls = ([0, 1, 2, 3] as const).map((side) => ({ side, inset: 10, locks: [], pushedAt: -9999 }));
        for (const w of walls) {
          for (let i = 0; i < 2; i++) {
            const q = lockPos(w, i);
            const h = tk.spawnTarget({
              x: q.x, y: q.y, r: 22, passThrough: false,
              onStruck: (by) => {
                if (by !== 'player') return;
                w.inset = Math.max(10, w.inset - PUSH);
                w.pushedAt = tk.now;
                moveLocks(w);
                tk.sfx('clang');
              },
            });
            w.locks.push(h);
          }
        }
        tk.sfx('chain');
      } else {
        // Each new sentence: the walls lurch in.
        for (const w of walls) { w.inset = Math.min(w.side < 2 ? MAX_X : MAX_Y, w.inset + 46); moveLocks(w); }
        lurchAt = time;
        tk.sfx('gravity-slam');
      }
    },
    update(time, dt) {
      if (!walls.length) return;
      const step = Math.min(dt, 0.05);
      for (const w of walls) {
        w.inset = Math.min(w.side < 2 ? MAX_X : MAX_Y, w.inset + CREEP * step * (tk.hard ? 1.3 : 1));
        moveLocks(w);
      }
      const p = tk.player;
      if (!alive(tk)) return;
      for (const w of walls) {
        const l = lineOf(w);
        const over = w.side === 0 ? p.x - PLAYER_R < l : w.side === 1 ? p.x + PLAYER_R > l : w.side === 2 ? p.y - PLAYER_R < l : p.y + PLAYER_R > l;
        if (!over) continue;
        if (time - lastHurt > 650) { lastHurt = time; tk.hitPlayer(7, p.x, p.y); tk.sfx('hit-medium'); }
        if (w.side === 0) place(tk, l + PLAYER_R + 14, p.y);
        else if (w.side === 1) place(tk, l - PLAYER_R - 14, p.y);
        else if (w.side === 2) place(tk, p.x, l + PLAYER_R + 14);
        else place(tk, p.x, l - PLAYER_R - 14);
      }
    },
    drawGround(g) {
      for (const w of walls) {
        const l = lineOf(w);
        // The floor outside the wall: shadowed.
        g.fillStyle(0x000000, 0.28);
        if (w.side === 0) g.fillRect(0, TOP, l, tk.H - TOP);
        else if (w.side === 1) g.fillRect(l, TOP, tk.W - l, tk.H - TOP);
        else if (w.side === 2) g.fillRect(0, TOP, tk.W, l - TOP);
        else g.fillRect(0, l, tk.W, tk.H - l);
      }
    },
    drawAir(g, time) {
      for (const w of walls) {
        const l = lineOf(w);
        const fresh = time - w.pushedAt < 300 || time - lurchAt < 300;
        // A curtain of hanging chains along the line.
        if (w.side < 2) {
          for (let y = TOP + 6; y < tk.H; y += 26) chainLinks(g, [{ x: l, y }, { x: l + Math.sin(time / 300 + y) * 2, y: y + 24 }], 8, fresh ? IRON_LIT : IRON, 1.8);
          g.lineStyle(3, BRUISE_LIT, 0.25); g.lineBetween(l, TOP, l, tk.H);
        } else {
          for (let x = 6; x < tk.W; x += 26) chainLinks(g, [{ x, y: l }, { x: x + 24, y: l + Math.sin(time / 300 + x) * 2 }], 8, fresh ? IRON_LIT : IRON, 1.8);
          g.lineStyle(3, BRUISE_LIT, 0.25); g.lineBetween(0, l, tk.W, l);
        }
        for (let i = 0; i < w.locks.length; i++) {
          const q = lockPos(w, i);
          glow(g, q.x, q.y, 22, FETTER_KEY, 0.05, 2);
          padlock(g, q.x, q.y + 4, 1.6, FETTER_KEY);
        }
      }
    },
    onPhaseEnd() {
      for (const w of walls) for (const h of w.locks) h.remove();
      walls = [];
    },
  };
};

// ── The prince ───────────────────────────────────────────────────────

export const FETTER_BOSS: WorldBossDef = {
  worldId: 'isle:fetter',
  name: 'Prince Fetter',
  title: 'Keeper of the Keys',
  color: FETTER,
  colorLit: FETTER_LIT,
  colorDark: FETTER_DARK,
  accent: FETTER_KEY,
  // Tier 2 of the seventh isle.
  damageMult: 1.25,

  intro: [
    'Every key in this court is on this ring. I can tell you the lock each one opens. I can tell you who is behind it.',
    'You came in owing nothing. That is not allowed. Let us open your account.',
  ],
  banter: [
    'Mother keeps a ledger too. Mine is the longest page. I have never once been late.',
    'A chain is only a debt you can see.',
    'They call it cruelty. It is bookkeeping.',
    'Hold still. The irons fit better on the ones who hold still.',
    'Everybody owes. The only question is to whom.',
  ],
  defeatLine: 'THE KEYS FALL',
  resumeLine: 'Back again. Interest has accrued. I did warn you it would.',

  phases: [
    {
      name: 'Manacles',
      line: 'Wrist, ankle, neck. Choose. No? Then I will.',
      hp: 510,
      cycle: [
        'sig:manacle', 'volley', 'sig:fence', 'hazard', 'sig:irons',
        'sig:manacle', 'radial', 'sig:fence', 'homing', 'sig:irons',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'The Gaoler',
      line: 'Fetch my ball. The big one. The one the gang drags at the Draught-Moon.',
      hp: 590,
      cycle: [
        'sig:swing', 'sig:pendulum', 'lanes', 'sig:manacle', 'sig:swing',
        'barrage', 'sig:pendulum', 'sweep', 'sig:irons',
      ],
      harass: ['h-flak', 'h-lane', 'h-mines'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE SENTENCE IS LIFE',
    extraPhase: {
      name: 'Life Sentence',
      line: 'No one leaves the Fetterhold. Watch the walls. They have heard the sentence too.',
      hp: 430,
      cycle: [
        'sig:sentence', 'sig:manacle', 'sig:irons', 'homing',
        'sig:sentence', 'sig:pendulum', 'sig:fence', 'spiral',
      ],
      harass: ['h-orbs', 'h-snipe'],
      restMs: 1000,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 14, speed: 185 },
    hazard: { radius: 62 },
    lanes: { count: 3, warnMs: 900 },
    spiral: { arms: 3, speed: 165 },
  },

  signatures: {
    manacle: manacles,
    fence,
    irons,
    swing: greatSwing,
    pendulum: dropAndReel,
    sentence: lifeSentence,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'chains', hands: 'gauntlet',
    torsoR: 36, mouth: 'grate', eyes: 2, eyeColor: FETTER_KEY,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'void', look: { hands: 'ball', mouth: 'line', aura: 'sparks' } },
    { movement: 'stalk', gimmick: 'none', tint: 'pale', look: { pattern: 'rings', mouth: 'stitch', eyes: 1 } },
  ],

  /**
   * The Keeper's tells. An iron collar round his neck with a padlock at the throat, and on his hip
   * the great keyring — every key in the court, jingling as he moves. Both wrists in open cuffs
   * with a broken length of chain swinging off each (he wears them; nobody ever locked them), and
   * on the left wrist the Matriarch's two bite-scars, the Mark, in bruise purple. As the Gaoler he
   * hauls the great ball on its chain from his right fist; under the Life Sentence the chains wind
   * round him like a winding-sheet and the keyring is gone — he has thrown away the keys.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const gaoler = s.phaseIdx === 1;
    const sentence = s.hard && s.phaseIdx >= 2;
    // The collar.
    g.lineStyle(R * 0.22, IRON_DARK, 1); g.strokeEllipse(s.x, s.y - R * 0.62, R * 1.3, R * 0.5);
    g.lineStyle(R * 0.14, IRON_LIT, 1); g.strokeEllipse(s.x, s.y - R * 0.66, R * 1.26, R * 0.46);
    padlock(g, s.x, s.y - R * 0.28, 1.1, FETTER_KEY);
    // Cuffs on both wrists, broken chain swinging.
    s.hands.slice(0, 2).forEach((h, i) => {
      manacle(g, h.x, h.y, 7, -Math.PI / 2 + (i ? 0.3 : -0.3), 0.15, 0);
      const sw = Math.sin(s.t / 260 + i * 2) * 8;
      chainLinks(g, [{ x: h.x, y: h.y + 7 }, { x: h.x + sw * 0.5, y: h.y + 18 }, { x: h.x + sw, y: h.y + 28 }], 6, IRON, 1.3);
      if (i === 0) { g.fillStyle(BRUISE_LIT, 1); g.fillCircle(h.x - 3, h.y - 10, 1.6); g.fillCircle(h.x + 3, h.y - 10, 1.6); }
    });
    if (!sentence) {
      // The keyring at his hip.
      const kx = s.x + R * 0.75, ky = s.y + R * 0.55;
      const jingle = Math.sin(s.t / 120) * 0.15 + s.castGlow * 0.3;
      g.lineStyle(3, FETTER_KEY, 1); g.strokeCircle(kx, ky, 8);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.2 + i * 0.32 + jingle * (i % 2 ? 1 : -1);
        key(g, kx + Math.cos(a) * 14, ky + Math.sin(a) * 14, 0.9, a, i % 3 ? FETTER_KEY : lit(FETTER_KEY, 0.25));
      }
    } else {
      // Chains wound round him like a winding-sheet.
      for (let k = 0; k < 3; k++) {
        const y0 = s.y - R * 0.4 + k * R * 0.42;
        chainLinks(g, [{ x: s.x - R * 0.95, y: y0 - R * 0.2 }, { x: s.x + R * 0.95, y: y0 + R * 0.2 }], 8, k % 2 ? IRON : IRON_LIT, 1.8);
      }
      draughtSeal(g, s.x, s.y + R * 0.15, 8);
    }
    if (gaoler && !ballOut) {
      // The great ball hanging from his fist.
      const h = s.hands[1] ?? s.hands[0];
      if (h) {
        const sw = Math.sin(s.t / 500) * 10;
        chainLinks(g, sagPoints(h.x, h.y + 6, h.x + sw, h.y + 46, 6, 5), 9, IRON, 2);
        ironBall(g, h.x + sw, h.y + 62, 18, 0.4);
      }
    }
    if (s.enraged) { g.lineStyle(2, BRUISE_LIT, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Counting Floor of the Fetterhold: black flags under a vaulted gaol roof, a ring of iron
   * floor-rings round the room where the worst debtors are chained to hear their accounts read,
   * the tally of every one scratched beside its ring, a bruise-purple runner up the middle to a
   * seat made of chain, and at its foot the Prince's own lectern with the court's copy of the
   * Ledger, chained shut.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xfe77e2);
    // Flags.
    g.fillStyle(0x1e2026, 1); g.fillRect(0, 0, W, H);
    for (let y = 96; y < H; y += 48) {
      const sh = ((y / 48) % 2) * 32;
      for (let x = -sh; x < W; x += 64) {
        g.fillStyle(mixC(STONE_DARK, 0x000000, 0.2 + rng() * 0.3), 1); g.fillRect(x + 2, y + 2, 60, 44);
      }
    }
    // The back wall: dark stone, barred slots, iron cressets.
    g.fillStyle(0x16181c, 1); g.fillRect(0, 0, W, 106);
    for (let x = 40; x < W; x += 110) {
      g.fillStyle(0x060606, 1); g.fillRect(x - 10, 30, 20, 40);
      g.lineStyle(2, IRON, 1); for (let k = 1; k < 3; k++) g.lineBetween(x - 10 + k * 7, 30, x - 10 + k * 7, 70);
    }
    for (const x of [120, W - 120]) {
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 10, 70, 20, 10);
      g.fillStyle(HOT, 0.9); g.fillCircle(x, 64, 7); g.fillStyle(HOT_LIT, 0.9); g.fillCircle(x, 62, 3.5);
      glow(g, x, 64, 60, HOT, 0.04, 4);
    }
    g.fillStyle(STONE, 1); g.fillRect(0, 104, W, 6);
    // The runner and the chain seat.
    const cx = W / 2;
    g.fillStyle(dim(BRUISE, 0.3), 1); g.fillRect(cx - 52, 110, 104, H - 110);
    g.fillStyle(BRUISE, 1); g.fillRect(cx - 46, 110, 92, H - 110);
    g.lineStyle(2, FETTER_KEY, 0.5); g.lineBetween(cx - 40, 110, cx - 40, H); g.lineBetween(cx + 40, 110, cx + 40, H);
    for (let y = 150; y < H; y += 80) draughtSeal(g, cx, y, 9);
    g.fillStyle(TAR, 1); g.fillRect(cx - 40, 14, 80, 92);
    for (let k = 0; k < 5; k++) chainLinks(g, [{ x: cx - 32 + k * 16, y: 18 }, { x: cx - 32 + k * 16, y: 100 }], 8, k % 2 ? IRON : IRON_LIT, 1.6);
    // The lectern with the court's copy of the Ledger, chained shut.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - 6, 128, 12, 30);
    g.fillStyle(TIMBER, 1); g.fillRect(cx - 34, 116, 68, 16);
    g.fillStyle(0x3a1a20, 1); g.fillRect(cx - 28, 108, 56, 12);
    g.fillStyle(PAPER, 1); g.fillRect(cx - 26, 108, 52, 3);
    chainLinks(g, [{ x: cx - 30, y: 114 }, { x: cx + 30, y: 114 }], 7, IRON, 1.4);
    // The floor-rings round the room, each with its tally.
    const ry = (H + 110) / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = cx + Math.cos(a) * 330, y = ry + Math.sin(a) * 200;
      g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 6);
      g.lineStyle(3, IRON, 1); g.strokeCircle(x + 6, y + 4, 8);
      g.fillStyle(RUST, 0.3); g.fillEllipse(x + 6, y + 10, 30, 10);
      tallyMarks(g, x - 18, y + 16, 5 + Math.floor(rng() * 20), STONE_LIT, 0.35, 0.8);
    }
    // A grate at the heart, the mire breathing up through it.
    g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, ry, 44);
    g.fillStyle(0x0a100a, 1); g.fillCircle(cx, ry, 38);
    g.lineStyle(3, IRON, 1);
    for (let k = -3; k <= 3; k++) g.lineBetween(cx + k * 10, ry - Math.sqrt(1444 - (k * 10) ** 2), cx + k * 10, ry + Math.sqrt(1444 - (k * 10) ** 2));
    g.lineStyle(2, IRON_LIT, 0.5); g.strokeCircle(cx, ry, 42);
    for (let i = 0; i < 5; i++) { g.fillStyle(0x9adf5a, 0.05); g.fillCircle(cx + (rng() - 0.5) * 60, ry - 20 - rng() * 40, 18 + rng() * 14); }
    // Words scratched round the grate.
    g.lineStyle(1, STONE, 0.4);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.lineBetween(cx + Math.cos(a) * 54, ry + Math.sin(a) * 54, cx + Math.cos(a) * 62, ry + Math.sin(a) * 62); }
    g.fillStyle(INK, 0.4); g.fillRect(0, H - 8, W, 8);
  },
};
