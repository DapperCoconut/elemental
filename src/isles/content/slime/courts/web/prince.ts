import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { eggSac, giantSpider, lantern, orbWeb, spiderling, strand } from './art';
import {
  BARK, BARK_DARK, BONE, BRUISE, BRUISE_DARK, BRUISE_LIT, DEW, DROP, DROP_GLINT, GAS, GOLD_THREAD, HOURGLASS, LAMP,
  PLANK_DARK, PLANK_LIT, SILK, SILK_LIT, SILK_SHADE, SPIDER, VENOM, WEFT, WEFT_DARK, WEFT_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Weft, the Spymaster — Matriarch Nyxa's broodling, governor of the Web Court.
 *
 * The runt of her clutch and the quietest, Weft was given the listening: a thread to hold and
 * orders to say what he heard. He has held it ever since. Every informer on the isle is a strand
 * in his web, every report a tag knotted on, and he hears the town the way a spider hears its web —
 * by what trembles. He does not shout. He finishes your sentences. He fights the way he governs:
 *
 * • **Spinner** (orbiting): he spins web panels across the floor that slow you and catch your shots,
 *   drops spiders on draglines out of the dark of the rafters, and casts a line to reel you in.
 * • **Spymaster** (anchored in his web, the void tint): threads run from him to every wall. He plucks
 *   them one at a time and a strike runs down the string; he draws them all taut in turn; and he sets
 *   his listeners about the room — ear-trumpets that report where you stand. Strike them deaf.
 * • **Cocoon** (hard, hovering, pale): he wraps himself in silk — nearly untouchable — while egg sacs
 *   ripen round him. Burn the cocoon open with blows, and strike the sacs before they hatch.
 */

const TOP = 96;

/** The phase currently drawn — read from drawDecor (the only place the kit tells us). */
let phaseNow = 0;

// ── Signature: Web Panels ────────────────────────────────────────────
// Three orb webs are spun across the floor, one on you. A ring of spokes, then the spiral fills in;
// the instant it closes, whoever is inside is caught. They stay a while: wading through one is
// slow, and any shot thrown into one is caught in the silk.

interface Panel { x: number; y: number; r: number; at: number; doneAt: number; dealt: boolean; until: number; caught: { x: number; y: number }[]; rot: number }

const panels = (tk: BossToolkit): SignatureMove => {
  let list: Panel[] = [];
  let slowTick = 0;
  return {
    durationMs: 1900,
    windupMs: 600,
    gesture: 'sweep',
    hold: 'conduct',
    tell: 'WEB PANELS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const spin = tk.warn(1150);
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const d = i === 0 ? 0 : 150 + Math.random() * 60;
        list.push({
          x: tk.clampX(p.x + Math.cos(a) * d, 90), y: tk.clampY(p.y + Math.sin(a) * d * 0.8, 70), r: 78,
          at: time, doneAt: time + spin + i * 160, dealt: false, until: time + spin + i * 160 + (tk.hard ? 9000 : 7500), caught: [], rot: Math.random() * 3,
        });
      }
      if (list.length > 7) list = list.slice(-7);
      tk.sfx('whip');
    },
    update(time) {
      const p = tk.player;
      const live = p.active && p.hp > 0;
      for (const w of list) {
        if (!w.dealt && time >= w.doneAt) {
          w.dealt = true;
          tk.sfx('trap-snap');
          if (live && dist(p.x, p.y, w.x, w.y) < w.r) { tk.hitPlayer(10, p.x, p.y); tk.slowPlayer(0.45, 900); }
        }
        if (!w.dealt) continue;
        // Shots thrown into a finished panel are caught fast.
        for (const s of tk.shotsNear(w.x, w.y, w.r)) {
          s.block();
          if (w.caught.length < 8) w.caught.push({ x: s.x, y: s.y });
        }
      }
      if (live && time > slowTick && list.some((w) => w.dealt && time < w.until && dist(p.x, p.y, w.x, w.y) < w.r)) {
        slowTick = time + 200;
        tk.slowPlayer(0.55, 260);
      }
      list = list.filter((w) => time < w.until + 500);
    },
    drawGround(g, time) {
      for (const w of list) {
        const fade = clamp((w.until + 500 - time) / 500, 0, 1);
        if (!w.dealt) {
          // Being spun: spokes first, then the spiral creeping inward.
          const k = clamp((time - w.at) / Math.max(1, w.doneAt - w.at), 0, 1);
          g.fillStyle(WEFT_DARK, 0.12 + k * 0.12); g.fillCircle(w.x, w.y, w.r);
          g.lineStyle(1.5, WEFT_LIT, 0.35 + k * 0.4); g.strokeCircle(w.x, w.y, w.r);
          const spokes = Math.round(4 + k * 10);
          orbWeb(g, w.x, w.y, w.r * Math.min(1, k * 2), SILK_LIT, 0.25 + k * 0.4, spokes, 1, 1 - k, w.rot);
          // The spinner running round: a little spider on the spiral.
          const a = w.rot + k * 14;
          spiderling(g, w.x + Math.cos(a) * w.r * (1 - k * 0.8), w.y + Math.sin(a) * w.r * (1 - k * 0.8), a + Math.PI / 2, time / 1000, SPIDER);
          continue;
        }
        g.fillStyle(SILK, 0.1 * fade); g.fillCircle(w.x, w.y, w.r);
        orbWeb(g, w.x, w.y, w.r, SILK_LIT, 0.6 * fade, 14, 1, 0, w.rot);
        for (const c of w.caught) { g.fillStyle(SILK_LIT, 0.8 * fade); g.fillCircle(c.x, c.y, 5); g.lineStyle(1, SILK_SHADE, fade); g.strokeCircle(c.x, c.y, 5); }
        // Dew on it, shining as it slowly turns to the light.
        for (let i = 0; i < 8; i++) {
          const a = w.rot + i * 0.8;
          g.fillStyle(DEW, (0.4 + Math.sin(time / 400 + i) * 0.3) * fade); g.fillCircle(w.x + Math.cos(a) * w.r * 0.6, w.y + Math.sin(a) * w.r * 0.6, 1.5);
        }
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── Signature: Dropline ──────────────────────────────────────────────
// Out of the dark of the rafters, spiders drop on their draglines round you — one after another,
// a shadow swelling under each before it lands — and spring back up their threads.

interface Drop { x: number; y: number; at: number; landAt: number; dealt: boolean }

const dropline = (tk: BossToolkit): SignatureMove => {
  let drops: Drop[] = [];
  return {
    durationMs: 1700,
    windupMs: 450,
    gesture: 'raise',
    tell: 'DROPLINE',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      const a0 = Math.random() * Math.PI * 2;
      drops = [];
      for (let i = 0; i < n; i++) {
        const onYou = i === n - 1;
        const a = a0 + i * 2.4;
        const d = onYou ? 0 : 70 + (i % 2) * 80;
        drops.push({ x: tk.clampX(p.x + Math.cos(a) * d, 60), y: tk.clampY(p.y + Math.sin(a) * d, 60), at: time, landAt: time + tk.warn(850) + i * 240, dealt: false });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const d of drops) {
        if (d.dealt || time < d.landAt) continue;
        d.dealt = true;
        tk.sfx('stone-slam');
        tk.boom(d.x, d.y, 54, SPIDER);
        if (p.active && p.hp > 0 && dist(p.x, p.y, d.x, d.y) < 54) tk.hitPlayer(12, p.x, p.y);
      }
      drops = drops.filter((d) => time < d.landAt + 900);
    },
    drawGround(g, time) {
      for (const d of drops) {
        if (d.dealt) continue;
        const k = clamp((time - d.at) / Math.max(1, d.landAt - d.at), 0, 1);
        g.fillStyle(0x000000, 0.1 + k * 0.3); g.fillEllipse(d.x, d.y, 30 + k * 70, 12 + k * 26);
        g.lineStyle(1.5, HOURGLASS, 0.2 + k * 0.6); g.strokeCircle(d.x, d.y, 54);
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        const fall = d.dealt ? 1 - clamp((time - d.landAt) / 900, 0, 1) * 1 : clamp((time - d.at) / Math.max(1, d.landAt - d.at), 0, 1);
        const k = d.dealt ? clamp((time - d.landAt) / 900, 0, 1) : 0;
        // Fast at the end: an eased fall, then a spring back up.
        const ease = d.dealt ? 1 - k * k : fall * fall * fall;
        const y = TOP + (d.y - 10 - TOP) * ease;
        g.lineStyle(1, SILK_LIT, 0.7); g.lineBetween(d.x, TOP, d.x, y - 8);
        giantSpider(g, d.x, y, 0.36, time / 60, Math.PI / 2, false);
        if (d.dealt && k < 0.3) { g.lineStyle(2, SILK_LIT, 1 - k / 0.3); g.strokeCircle(d.x, d.y, 30 + k * 80); }
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Signature: Reel In ───────────────────────────────────────────────
// He casts a sticky line at you, aimed down a glowing sight-line. If it takes you, he reels you in
// hand over hand and bites as you arrive. If it misses, it lies on the floor, sticky, for a while.

const reel = (tk: BossToolkit): SignatureMove => {
  let aimAt = 0, fireAt = 0, a = 0, fired = true, caughtAt = 0, reelUntil = 0, bit = true;
  let line: { x0: number; y0: number; x1: number; y1: number; until: number } | null = null;
  return {
    durationMs: 2100,
    windupMs: 400,
    gesture: 'point',
    hold: 'draw',
    tell: 'REEL IN',
    cast(time) {
      aimAt = time;
      fireAt = time + tk.warn(760);
      a = tk.angleToPlayer();
      fired = false;
      bit = true;
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY;
      if (!fired) {
        // The aim follows you slowly while it builds.
        const want = tk.angleToPlayer();
        const d = Math.atan2(Math.sin(want - a), Math.cos(want - a));
        a += clamp(d, -0.018, 0.018);
      }
      if (!fired && time >= fireAt) {
        fired = true;
        tk.sfx('whip');
        const ex = bx + Math.cos(a) * 900, ey = by + Math.sin(a) * 900;
        if (p.active && p.hp > 0 && segDist(p.x, p.y, bx, by, ex, ey) < 24) {
          caughtAt = time;
          reelUntil = time + 1100;
          bit = false;
          tk.pull(bx, by, 130, 1100);
          tk.slowPlayer(0.35, 1100);
          tk.hitPlayer(5, p.x, p.y);
        } else {
          line = { x0: bx, y0: by, x1: tk.clampX(ex, 20), y1: tk.clampY(ey, 20), until: time + 4000 };
        }
      }
      if (!bit && time >= reelUntil) {
        bit = true;
        if (p.active && p.hp > 0 && dist(p.x, p.y, bx, by) < 110) { tk.hitPlayer(15, p.x, p.y); tk.sfx('stab'); }
      }
      if (line && time < line.until && p.active && segDist(p.x, p.y, line.x0, line.y0, line.x1, line.y1) < 16) tk.slowPlayer(0.5, 300);
      if (line && time > line.until) line = null;
    },
    drawGround(g, time) {
      if (line) {
        const fade = clamp((line.until - time) / 600, 0, 1);
        g.lineStyle(4, SILK_SHADE, 0.35 * fade); g.lineBetween(line.x0, line.y0 + 3, line.x1, line.y1 + 3);
        g.lineStyle(2, SILK_LIT, 0.8 * fade); g.lineBetween(line.x0, line.y0, line.x1, line.y1);
      }
      if (!fired) {
        const k = clamp((time - aimAt) / Math.max(1, fireAt - aimAt), 0, 1);
        const bx = tk.bossX, by = tk.bossY;
        g.lineStyle(3 + k * 6, WEFT_LIT, 0.08 + k * 0.18); g.lineBetween(bx, by, bx + Math.cos(a) * 900, by + Math.sin(a) * 900);
        g.lineStyle(1, GOLD_THREAD, 0.3 + k * 0.6); g.lineBetween(bx, by, bx + Math.cos(a) * 900, by + Math.sin(a) * 900);
      }
    },
    drawAir(g, time) {
      if (time < reelUntil + 150 && caughtAt > 0) {
        const p = tk.player;
        const bx = tk.bossX, by = tk.bossY;
        // Hand over hand: the line between, and coils piling at his feet.
        g.lineStyle(2, SILK_LIT, 0.9); g.lineBetween(bx, by, p.x, p.y);
        for (let i = 0; i < 4; i++) { g.lineStyle(1.5, SILK_LIT, 0.7); g.strokeEllipse(bx + 20, by + 26, 14 + i * 4, 5 + i * 1.5); }
        for (let i = 0; i < 3; i++) { const a2 = time / 120 + i * 2; g.lineStyle(1.5, SILK_LIT, 0.7); g.lineBetween(p.x + Math.cos(a2) * 16, p.y + Math.sin(a2) * 8, p.x - Math.cos(a2) * 16, p.y - Math.sin(a2) * 8); }
      }
    },
    onPhaseEnd() { line = null; fired = true; reelUntil = 0; bit = true; },
  };
};

// ── The Spymaster's threads (phase two) ──────────────────────────────
// From the Spymaster phase on, eight threads run from him to the walls. Pluck and Taut both use
// them; they are drawn (and aimed) from wherever he stands.

const THREADS = 8;
function threadEnd(i: number, bx: number, by: number, W: number, H: number): { x: number; y: number } {
  const a = (i / THREADS) * Math.PI * 2 + Math.PI / 8;
  const dx = Math.cos(a), dy = Math.sin(a);
  const tx = dx > 0 ? (W - 8 - bx) / dx : dx < 0 ? (8 - bx) / dx : Infinity;
  const ty = dy > 0 ? (H - 8 - by) / dy : dy < 0 ? (TOP + 4 - by) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: bx + dx * t, y: by + dy * t };
}

// ── Signature: Pluck ─────────────────────────────────────────────────
// He hooks a claw under one of his threads; it trembles; he plucks it and a strike runs down the
// string from him to the wall. Three in a row (four on hard), never the same string twice running.

interface Pluck { i: number; warnAt: number; fireAt: number; fired: boolean }

const pluck = (tk: BossToolkit): SignatureMove => {
  let queue: Pluck[] = [];
  let hitDone = new Set<number>();
  return {
    durationMs: 2600,
    windupMs: 350,
    gesture: 'clap',
    hold: 'conduct',
    tell: 'PLUCK',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const p = tk.player;
      // The first goes down the string nearest you; the rest either side of it.
      const pa = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) - Math.PI / 8;
      const near = ((Math.round((pa / (Math.PI * 2)) * THREADS) % THREADS) + THREADS) % THREADS;
      const order = [near, (near + 1) % THREADS, (near + THREADS - 1) % THREADS, (near + 4) % THREADS];
      queue = [];
      hitDone = new Set();
      for (let k = 0; k < n; k++) queue.push({ i: order[k], warnAt: time + k * 520, fireAt: time + tk.warn(650) + k * 520, fired: false });
    },
    update(time) {
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY;
      queue.forEach((q, k) => {
        if (time < q.fireAt) return;
        if (!q.fired) { q.fired = true; tk.sfx('zap'); }
        // The bead runs out along the string at 900 px/s; it strikes what it passes.
        const end = threadEnd(q.i, bx, by, tk.W, tk.H);
        const len = dist(bx, by, end.x, end.y);
        const run = ((time - q.fireAt) / 1000) * 900;
        if (run > len + 40 || hitDone.has(k)) return;
        const f = Math.min(1, run / len);
        const ex = bx + (end.x - bx) * f, ey = by + (end.y - by) * f;
        if (p.active && p.hp > 0 && segDist(p.x, p.y, bx + (end.x - bx) * Math.max(0, f - 0.08), by + (end.y - by) * Math.max(0, f - 0.08), ex, ey) < 18) {
          hitDone.add(k);
          tk.hitPlayer(12, p.x, p.y);
        }
      });
      queue = queue.filter((q) => time < q.fireAt + 1400);
    },
    drawGround(g, time) {
      if (phaseNow < 1) return;
      const bx = tk.bossX, by = tk.bossY;
      for (let i = 0; i < THREADS; i++) {
        const e = threadEnd(i, bx, by, tk.W, tk.H);
        const q = queue.find((x) => x.i === i && time < x.fireAt + 600);
        const warn = q && time >= q.warnAt && time < q.fireAt ? clamp((time - q.warnAt) / Math.max(1, q.fireAt - q.warnAt), 0, 1) : 0;
        // A plucked string trembles: draw it doubled, offset by a shiver.
        if (warn > 0) {
          const sh = Math.sin(time / 18) * 4 * warn;
          const nx = -(e.y - by) / Math.max(1, dist(bx, by, e.x, e.y)), ny = (e.x - bx) / Math.max(1, dist(bx, by, e.x, e.y));
          g.lineStyle(10, HOURGLASS, 0.1 + warn * 0.15); g.lineBetween(bx, by, e.x, e.y);
          g.lineStyle(1.5, GOLD_THREAD, 0.6 + warn * 0.4); g.lineBetween(bx + nx * sh, by + ny * sh, e.x + nx * sh * 0.3, e.y + ny * sh * 0.3);
          g.lineBetween(bx - nx * sh, by - ny * sh, e.x - nx * sh * 0.3, e.y - ny * sh * 0.3);
        } else {
          g.lineStyle(1.2, SILK_LIT, 0.45); g.lineBetween(bx, by, e.x, e.y);
        }
        // The anchor at the wall: a knot and a nail.
        g.fillStyle(PLANK_DARK, 1); g.fillCircle(e.x, e.y, 4);
        g.fillStyle(GOLD_THREAD, 1); g.fillCircle(e.x, e.y, 2);
      }
    },
    drawAir(g, time) {
      const bx = tk.bossX, by = tk.bossY;
      for (const q of queue) {
        if (time < q.fireAt) continue;
        const e = threadEnd(q.i, bx, by, tk.W, tk.H);
        const len = dist(bx, by, e.x, e.y);
        const f = Math.min(1, (((time - q.fireAt) / 1000) * 900) / len);
        if (f >= 1) continue;
        const x = bx + (e.x - bx) * f, y = by + (e.y - by) * f;
        glow(g, x, y, 22, GOLD_THREAD, 0.12, 3);
        g.fillStyle(0xffffff, 1); g.fillCircle(x, y, 5);
        g.lineStyle(3, GOLD_THREAD, 0.7); g.lineBetween(bx + (e.x - bx) * Math.max(0, f - 0.1), by + (e.y - by) * Math.max(0, f - 0.1), x, y);
      }
    },
    onPhaseEnd() { queue = []; },
  };
};

// ── Signature: Draw Taut ─────────────────────────────────────────────
// He draws his threads in with both hands, one after the next, round the clock: each string goes
// tight as a bar and cuts along its whole length. Stand between strings.

const taut = (tk: BossToolkit): SignatureMove => {
  let start = 0, dir = 1, first = 0, until = 0;
  return {
    durationMs: 2300,
    windupMs: 600,
    gesture: 'flex',
    hold: 'brace',
    tell: 'DRAW TAUT',
    cast(time) {
      start = time;
      dir = Math.random() < 0.5 ? 1 : -1;
      first = Math.floor(Math.random() * THREADS);
      const n = tk.hard ? THREADS : THREADS - 2;
      for (let k = 0; k < n; k++) {
        const i = (first + dir * k + THREADS * 2) % THREADS;
        const a = (i / THREADS) * Math.PI * 2 + Math.PI / 8;
        tk.spawnLane({ x: tk.bossX, y: tk.bossY, angle: a, halfW: 14, warnMs: tk.warn(700) + k * 150, damage: 10 });
      }
      until = time + tk.warn(700) + n * 150 + 400;
      tk.sfx('gear-turn');
    },
    drawAir(g, time) {
      if (time > until) return;
      // His hands winding the strings in: little coils spinning at his sides.
      const k = clamp((time - start) / Math.max(1, until - start), 0, 1);
      for (const s of [-1, 1]) {
        const x = tk.bossX + s * 44, y = tk.bossY + 8;
        g.lineStyle(2, GOLD_THREAD, 0.8);
        for (let r = 4; r < 4 + k * 12; r += 3) g.strokeEllipse(x, y, r * 2, r);
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── Signature: Listeners ─────────────────────────────────────────────
// He sets three listeners about the room — brass ear-trumpets on silk stands, each turning to find
// you. A trumpet that has you in its mouth when its time is up reports: your spot is marked and a
// strike comes down on it. Strike a trumpet to stop its ear.

interface Ear { x: number; y: number; a: number; doneAt: number; target: StrikeTarget | null; deaf: number; reported: boolean }

const listeners = (tk: BossToolkit): SignatureMove => {
  let ears: Ear[] = [];
  const CONE = 0.42, REACH = 520;
  return {
    durationMs: 1200,
    windupMs: 500,
    gesture: 'point',
    tell: 'LISTENERS',
    cast(time) {
      for (const e of ears) e.target?.remove();
      ears = [];
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const x = i % 2 ? tk.W - 90 - Math.random() * 120 : 90 + Math.random() * 120;
        const y = TOP + 70 + (i / Math.max(1, n - 1)) * (tk.H - TOP - 140);
        const e: Ear = { x, y, a: Math.atan2(tk.player.y - y, tk.player.x - x), doneAt: time + 3400 + i * 500, target: null, deaf: 0, reported: false };
        e.target = tk.spawnTarget({ x, y: y - 10, r: 18, onStruck: () => { if (!e.deaf) { e.deaf = tk.now; e.target?.remove(); e.target = null; tk.sfx('hush'); } } });
        ears.push(e);
      }
      tk.sfx('sonic-pulse');
    },
    update(time) {
      const p = tk.player;
      for (const e of ears) {
        if (e.deaf || e.reported) continue;
        // Turn toward you, a little slower than you can walk round it.
        const want = Math.atan2(p.y - e.y, p.x - e.x);
        const d = Math.atan2(Math.sin(want - e.a), Math.cos(want - e.a));
        e.a += clamp(d, -0.03, 0.03);
        if (time >= e.doneAt) {
          e.reported = true;
          e.target?.remove(); e.target = null;
          const pa = Math.atan2(p.y - e.y, p.x - e.x);
          const inCone = Math.abs(Math.atan2(Math.sin(pa - e.a), Math.cos(pa - e.a))) < CONE && dist(p.x, p.y, e.x, e.y) < REACH;
          if (inCone && p.active && p.hp > 0) {
            tk.sfx('judgement');
            tk.spawnZone({ x: p.x, y: p.y, radius: 64, warnMs: tk.warn(800), damage: 14 });
          }
        }
      }
      ears = ears.filter((e) => !(e.reported || e.deaf) || time < (e.deaf || e.doneAt) + 900);
    },
    drawGround(g, time) {
      for (const e of ears) {
        if (e.deaf || e.reported) continue;
        const k = clamp(1 - (e.doneAt - time) / 3400, 0, 1);
        // The cone it is listening down.
        g.fillStyle(GOLD_THREAD, 0.04 + k * 0.08);
        g.slice(e.x, e.y, REACH, e.a - CONE, e.a + CONE, false); g.fillPath();
        g.lineStyle(1, GOLD_THREAD, 0.2 + k * 0.4);
        g.lineBetween(e.x, e.y, e.x + Math.cos(e.a - CONE) * REACH, e.y + Math.sin(e.a - CONE) * REACH);
        g.lineBetween(e.x, e.y, e.x + Math.cos(e.a + CONE) * REACH, e.y + Math.sin(e.a + CONE) * REACH);
      }
    },
    drawAir(g, time) {
      for (const e of ears) {
        const gone = e.deaf || e.reported;
        const fade = gone ? 1 - clamp((time - (e.deaf || e.doneAt)) / 900, 0, 1) : 1;
        if (fade <= 0) continue;
        // A tripod of silk-wrapped canes, the trumpet on top, its bell turned to you.
        g.lineStyle(2, PLANK_DARK, fade);
        for (const s of [-1, 0, 1]) g.lineBetween(e.x, e.y - 18, e.x + s * 10, e.y + 4);
        const ca = Math.cos(e.a), sa = Math.sin(e.a);
        g.fillStyle(e.deaf ? dim(GOLD_THREAD, 0.5) : GOLD_THREAD, fade);
        g.fillTriangle(e.x - ca * 6, e.y - 20 - sa * 6, e.x + ca * 18 - sa * 10, e.y - 20 + sa * 18 + ca * 10, e.x + ca * 18 + sa * 10, e.y - 20 + sa * 18 - ca * 10);
        g.fillStyle(lit(GOLD_THREAD, 0.4), fade); g.fillEllipse(e.x + ca * 18, e.y - 20 + sa * 18, 8, 14);
        g.fillStyle(PLANK_DARK, fade); g.fillCircle(e.x + ca * 18, e.y - 20 + sa * 18, 3);
        if (!gone) {
          const k = clamp(1 - (e.doneAt - time) / 3400, 0, 1);
          g.lineStyle(2, HOURGLASS, 0.5); g.beginPath(); g.arc(e.x, e.y - 20, 22, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        if (e.deaf) { g.lineStyle(2, SILK_LIT, fade); g.lineBetween(e.x - 10, e.y - 30, e.x + 10, e.y - 10); g.lineBetween(e.x + 10, e.y - 30, e.x - 10, e.y - 10); }
      }
    },
    onPhaseEnd() { for (const e of ears) e.target?.remove(); ears = []; },
  };
};

// ── Signature: Cocoon (hard) ─────────────────────────────────────────
// He wraps himself in silk, round and round, and the blows slide off (most of them). Egg sacs
// drop round the room on threads and ripen. Every blow on the cocoon chars it; burn it through and
// it splits open with him dazed inside. If it holds, he climbs out mended, and the sacs hatch.

interface Sac { x: number; y: number; hatchAt: number; target: StrikeTarget | null; gone: number; hatched: boolean }
interface Ling { x: number; y: number; a: number; born: number; biteAt: number; target: StrikeTarget | null; dead: number }

const cocoon = (tk: BossToolkit): SignatureMove => {
  let wrapAt = 0, until = 0, char = 0, burstAt = 0, exposedUntil = 0;
  let sacs: Sac[] = [];
  let lings: Ling[] = [];
  const BURN = 46;
  const wrapped = () => tk.now < until && burstAt === 0;
  return {
    durationMs: 1200,
    windupMs: 500,
    gesture: 'recoil',
    hold: 'brace',
    tell: 'COCOON',
    cast(time) {
      wrapAt = time;
      until = time + 7000;
      char = 0;
      burstAt = 0;
      tk.sfx('whip');
      for (const s of sacs) s.target?.remove();
      sacs = [];
      const n = 3;
      for (let i = 0; i < n; i++) {
        const x = 120 + ((i + Math.random() * 0.6) / n) * (tk.W - 240), y = TOP + 120 + Math.random() * (tk.H - TOP - 220);
        const s: Sac = { x, y, hatchAt: time + 4200 + i * 400, target: null, gone: 0, hatched: false };
        s.target = tk.spawnTarget({ x, y, r: 18, onStruck: () => { if (!s.gone) { s.gone = tk.now; s.target?.remove(); s.target = null; tk.sfx('slime-splat'); } } });
        sacs.push(s);
      }
    },
    update(time, dt) {
      const p = tk.player;
      if (until > 0 && time >= until && burstAt === 0) {
        // It held: he climbs out mended.
        until = 0;
        tk.healBoss(30);
        tk.sfx('heal');
      }
      for (const s of sacs) {
        if (s.gone || s.hatched || time < s.hatchAt) continue;
        s.hatched = true;
        s.target?.remove(); s.target = null;
        tk.sfx('status-poison');
        for (let k = 0; k < 3; k++) {
          const l: Ling = { x: s.x, y: s.y, a: k * 2, born: time, biteAt: 0, target: null, dead: 0 };
          l.target = tk.spawnTarget({ x: l.x, y: l.y, r: 11, passThrough: true, onStruck: () => { if (!l.dead) { l.dead = tk.now; l.target?.remove(); l.target = null; } } });
          lings.push(l);
        }
      }
      sacs = sacs.filter((s) => !(s.gone || s.hatched) || time < Math.max(s.gone, s.hatchAt) + 800);
      for (const l of lings) {
        if (l.dead) continue;
        if (time - l.born > 8000) { l.dead = time; l.target?.remove(); l.target = null; continue; }
        const d = dist(l.x, l.y, p.x, p.y);
        l.a = Math.atan2(p.y - l.y, p.x - l.x) + Math.sin(time / 170 + l.born) * 0.5;
        if (d > 18) { l.x += Math.cos(l.a) * 140 * dt; l.y += Math.sin(l.a) * 140 * dt; l.target?.moveTo(l.x, l.y); }
        if (d < 22 && time >= l.biteAt && p.active && p.hp > 0) { l.biteAt = time + 800; tk.hitPlayer(6, p.x, p.y); }
      }
      lings = lings.filter((l) => !l.dead || time < l.dead + 400);
    },
    takenMult() {
      if (wrapped()) return 0.18;
      if (tk.now < exposedUntil) return 1.4;
      return 1;
    },
    onBossHurt(amount) {
      if (!wrapped()) return;
      // Blows land at 0.18 — count them back up to what was swung.
      char += amount / 0.18;
      if (char >= BURN) {
        burstAt = tk.now;
        exposedUntil = tk.now + 2600;
        until = 0;
        tk.sfx('shield-break');
        tk.boom(tk.bossX, tk.bossY, 70, SILK_LIT);
      }
    },
    drawGround(g, time) {
      for (const s of sacs) {
        if (s.gone || s.hatched) { const k = clamp((time - Math.max(s.gone, s.hatchAt)) / 800, 0, 1); g.fillStyle(s.gone ? BONE : VENOM, 0.4 * (1 - k)); g.fillEllipse(s.x, s.y + 20, 40, 12); continue; }
        const r = clamp(1 - (s.hatchAt - time) / 4200, 0, 1);
        g.fillStyle(0x000000, 0.15 + r * 0.15); g.fillEllipse(s.x, s.y + 24, 38, 11);
        g.lineStyle(2, r > 0.75 ? HOURGLASS : VENOM, 0.3 + r * 0.5);
        g.beginPath(); g.arc(s.x, s.y + 24, 24, -Math.PI / 2, -Math.PI / 2 + (1 - r) * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const s of sacs) if (!s.gone && !s.hatched) eggSac(g, s.x, s.y, 13, clamp(1 - (s.hatchAt - time) / 4200, 0, 1), time / 1000, s.y - TOP - 10);
      for (const l of lings) { if (!l.dead) spiderling(g, l.x, l.y, l.a, time / 1000); }
      const bx = tk.bossX, by = tk.bossY;
      if (wrapped()) {
        // The cocoon: bands of silk wound round and round him, charring as it is struck.
        const k = clamp((time - wrapAt) / 500, 0, 1);
        const c = clamp(char / BURN, 0, 1);
        g.fillStyle(SILK_SHADE, 0.85 * k); g.fillEllipse(bx, by, 84, 104);
        for (let i = 0; i < 9; i++) {
          const yy = by - 46 + i * 11;
          g.lineStyle(4, i % 2 ? SILK : SILK_LIT, 0.95 * k);
          g.lineBetween(bx - 38 + Math.abs(i - 4) * 3, yy + 4, bx + 38 - Math.abs(i - 4) * 3, yy - 3);
        }
        // Scorch where it has been struck.
        for (let i = 0; i < Math.round(c * 8); i++) {
          const a = i * 2.3;
          g.fillStyle(0x2a2018, 0.6); g.fillEllipse(bx + Math.cos(a) * 22, by + Math.sin(a) * 30, 14, 10);
          g.fillStyle(LAMP, 0.6); g.fillCircle(bx + Math.cos(a) * 22, by + Math.sin(a) * 30, 2);
        }
        g.lineStyle(1, SILK_LIT, 0.7); g.lineBetween(bx, by - 52, bx, TOP);
      } else if (time - burstAt < 600 && burstAt > 0) {
        const k = (time - burstAt) / 600;
        for (let i = 0; i < 10; i++) { const a = i * 0.63; g.fillStyle(SILK, 1 - k); g.fillEllipse(bx + Math.cos(a) * (30 + k * 60), by + Math.sin(a) * (40 + k * 50), 16, 6); }
      }
      if (tk.now < exposedUntil) { g.lineStyle(2, HOURGLASS, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(bx, by, 50); }
    },
    onPhaseEnd() {
      until = 0; exposedUntil = 0;
      for (const s of sacs) s.target?.remove();
      for (const l of lings) l.target?.remove();
      sacs = []; lings = [];
    },
  };
};

export const WEFT_BOSS: WorldBossDef = {
  worldId: 'isle:weft',
  name: 'Prince Weft',
  title: 'the Spymaster',
  color: WEFT,
  colorLit: WEFT_LIT,
  colorDark: WEFT_DARK,
  accent: GOLD_THREAD,
  // Tier 2 of the seventh isle.
  damageMult: 1.25,

  intro: [
    'You came over the Long Strand at the second bell. You stopped at the Web. You read Netty Moss\'s tag.',
    'I know. I always know. Sit, if you like. No? Then let us see if you are as quick as you are loud.',
  ],
  banter: [
    'Every thread in this court comes to my hand. I feel the town the way you feel your own pulse.',
    'Mother gave the others courts. She gave me a thread and said: tell me what it says. I have never stopped.',
    'You were going to say that. I heard it three moves ago.',
    'A name is only a knot. I do not hurt anyone. I only tie the knot.',
    'Shh. Listen. There — that was your heart. It is going very fast.',
  ],
  defeatLine: 'THE THREADS GO SLACK',
  resumeLine: 'Back. Of course. I heard you on the ladder. You breathe louder when you have lost once.',

  phases: [
    {
      name: 'Spinner',
      line: 'Let me show you how the Sheet was made. One panel at a time. With people inside.',
      hp: 500,
      cycle: [
        'sig:panels', 'volley', 'sig:dropline', 'sig:reel', 'homing',
        'sig:panels', 'radial', 'sig:dropline', 'sig:reel', 'hazard',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1200,
      harassMs: 3300,
    },
    {
      name: 'Spymaster',
      line: 'Enough spinning. Every thread in the court, to my hand. Now I can hear you think.',
      hp: 580,
      cycle: [
        'sig:pluck', 'sig:listeners', 'spiral', 'sig:taut', 'sig:pluck',
        'barrage', 'sig:listeners', 'sig:panels', 'sig:taut', 'lanes',
      ],
      harass: ['h-rune', 'h-lane'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE WEB HEARS EVERYTHING',
    extraPhase: {
      name: 'Cocoon',
      line: 'No. NO. Not loud. Too loud. I will wrap it all up and make it quiet again.',
      hp: 420,
      cycle: [
        'sig:cocoon', 'sig:dropline', 'sig:pluck', 'homing',
        'sig:panels', 'sig:cocoon', 'sig:reel', 'sig:taut', 'sweep',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.5 },
    radial: { count: 16, speed: 185 },
    hazard: { radius: 62 },
    spiral: { arms: 4, speed: 170 },
    homing: { count: 3 },
  },

  signatures: {
    panels,
    dropline,
    reel,
    pluck,
    taut,
    listeners,
    cocoon,
  },

  look: {
    crest: 'none', pattern: 'weave', aura: 'none', hands: 'claw',
    torsoR: 34, arms: 4, eyes: 3, eyeColor: HOURGLASS, mouth: 'line',
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'void', look: { eyes: 3, mouth: 'stitch' } },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { aura: 'smoke', hands: 'wisp', mouth: 'none' } },
  ],

  /**
   * The Spymaster's tells. Eight long jointed legs fan out behind him, ringed in gold at the knee;
   * a dragline runs from his back up into the dark; a high lace ruff of gold thread at his throat.
   * Spinner: a spindle turning in his lower hand, silk paying out. Spymaster: a cat's cradle of gold
   * thread strung between his two upper hands, and a listening-glass over one eye. Cocoon: loose
   * bands of silk already wound about him, legs drawn in tight.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    const R = s.radius;
    const cocoonPhase = s.hard && s.phaseIdx >= 2;
    // Legs: four a side, sweeping out and back, the gait slow and deliberate.
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const tuck = cocoonPhase ? 0.55 : 1;
        const ph = Math.sin(s.t / 260 + i * 1.3 + (side > 0 ? 1.7 : 0)) * 0.12;
        const a = -Math.PI / 2 + side * (0.55 + i * 0.42 + ph);
        const hx = s.x + Math.cos(a) * R * 0.6, hy = s.y + Math.sin(a) * R * 0.5;
        const kx = s.x + Math.cos(a) * R * 1.55 * tuck, ky = s.y + Math.sin(a) * R * 1.2 * tuck - R * 0.7;
        const fx = s.x + Math.cos(a + side * 0.25) * R * 2.1 * tuck, fy = s.y + Math.sin(a) * R * 0.9 * tuck + R * 0.5;
        g.lineStyle(4, WEFT_DARK, 1); g.lineBetween(hx, hy, kx, ky);
        g.lineStyle(3, WEFT_DARK, 1); g.lineBetween(kx, ky, fx, fy);
        g.lineStyle(1, lit(WEFT, 0.2), 0.6); g.lineBetween(hx, hy - 1, kx, ky - 1);
        g.fillStyle(GOLD_THREAD, 1); g.fillCircle(kx, ky, 2.6);
      }
    }
    // The dragline up into the rafters.
    g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(s.x, s.y - R * 0.6, s.x + Math.sin(s.t / 800) * 6, TOP);
    // The lace ruff.
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.15 + (i / 10) * Math.PI * 0.7;
      const px = s.x + Math.cos(a) * R * 0.85, py = s.y + Math.sin(a) * R * 0.55 + R * 0.25;
      g.fillStyle(i % 2 ? GOLD_THREAD : lit(GOLD_THREAD, 0.3), 0.9); g.fillEllipse(px, py, R * 0.32, R * 0.2);
      g.lineStyle(1, dim(GOLD_THREAD, 0.4), 0.7); g.strokeEllipse(px, py, R * 0.32, R * 0.2);
    }
    const h0 = s.hands[0], h1 = s.hands[1];
    if (cocoonPhase) {
      for (let i = 0; i < 4; i++) {
        const yy = s.y - R * 0.5 + i * R * 0.35;
        g.lineStyle(3, SILK_LIT, 0.8); g.lineBetween(s.x - R * 0.9, yy + 4, s.x + R * 0.9, yy - 4 + Math.sin(s.t / 400 + i) * 2);
      }
    } else if (s.phaseIdx === 1 && h0 && h1) {
      // A cat's cradle between the upper hands: a lattice of gold thread.
      const mx = (h0.x + h1.x) / 2, my = (h0.y + h1.y) / 2 - 8;
      g.lineStyle(1.2, GOLD_THREAD, 0.9);
      for (const k of [-6, 0, 6]) { g.lineBetween(h0.x, h0.y + k * 0.5, mx, my + k); g.lineBetween(h1.x, h1.y + k * 0.5, mx, my - k); }
      g.lineBetween(h0.x, h0.y, h1.x, h1.y);
      // The listening-glass over his left eye.
      g.lineStyle(2, GOLD_THREAD, 1); g.strokeCircle(s.x - R * 0.28, s.y - R * 0.2, 7);
      g.fillStyle(DEW, 0.35); g.fillCircle(s.x - R * 0.28, s.y - R * 0.2, 6);
      g.lineStyle(1, GOLD_THREAD, 0.8); g.lineBetween(s.x - R * 0.28 - 6, s.y - R * 0.2 + 4, s.x - R * 0.8, s.y + R * 0.3);
    } else if (h0) {
      // The spindle: a whorl spinning, silk running from it.
      const sx = h0.x, sy = h0.y + 10;
      g.lineStyle(2, PLANK_LIT, 1); g.lineBetween(sx, sy - 16, sx, sy + 14);
      g.fillStyle(BRUISE, 1); g.fillEllipse(sx, sy + 8, 14 + Math.sin(s.t / 40) * 4, 5);
      g.fillStyle(SILK_LIT, 1); g.fillEllipse(sx, sy - 4, 8, 12);
      g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(sx, sy - 16, s.x, s.y - R * 0.4);
    }
    if (s.enraged) { g.lineStyle(1.5, HOURGLASS, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.6); }
  },

  /**
   * The Loft's listening gallery: the floor is one vast orb web hung across the hollow of the
   * greatest trunk, and below it the drop — black, a long way down, a gleam of water and a breath
   * of marsh gas. Along the top, the wicker wall of the gallery with its row of lamplit slits, and
   * hundreds of threads converging from it to the hub, each ending in a tagged knot.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x77ef7);
    // The drop beneath the web.
    g.fillStyle(DROP, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { g.fillStyle(0x16261d, 0.5); g.fillEllipse(W * (0.2 + rng() * 0.6), H * (0.3 + rng() * 0.6), 220 + rng() * 200, 60 + rng() * 60); }
    g.fillStyle(DROP_GLINT, 0.25); g.fillEllipse(W * 0.62, H * 0.7, 160, 18);
    for (let i = 0; i < 8; i++) { g.fillStyle(GAS, 0.04); g.fillCircle(rng() * W, H * 0.4 + rng() * H * 0.6, 60 + rng() * 60); }
    // Far below, mangrove roots like ribs.
    for (let i = 0; i < 7; i++) { g.lineStyle(6, dim(BARK, 0.55), 0.6); const x = rng() * W; g.lineBetween(x, H, x + (rng() - 0.5) * 200, H * 0.45 + rng() * 80); }
    // The great web: hub in the middle of the floor, spokes out past every edge.
    const cx = W / 2, cy = (H + TOP) / 2 + 10;
    const spokes = 28;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      g.lineStyle(3, SILK_SHADE, 0.6); g.lineBetween(cx, cy, cx + Math.cos(a) * 900, cy + Math.sin(a) * 700);
      g.lineStyle(1.2, SILK_LIT, 0.9); g.lineBetween(cx, cy - 1, cx + Math.cos(a) * 900, cy + Math.sin(a) * 700 - 1);
    }
    for (let k = 1; k < 26; k++) {
      const rr = k * 26;
      g.lineStyle(k % 4 === 0 ? 2.2 : 1.2, k % 4 === 0 ? SILK_LIT : SILK, k % 4 === 0 ? 0.8 : 0.55);
      g.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const r = rr + (i / spokes) * 26;
        const px = cx + Math.cos(a) * r * 1.25, py = cy + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // Dew all over it, and a few old wrapped things caught in it.
    for (let i = 0; i < 160; i++) { g.fillStyle(DEW, 0.35 + rng() * 0.4); g.fillCircle(rng() * W, TOP + rng() * (H - TOP), 1 + rng()); }
    for (let i = 0; i < 6; i++) {
      const x = 60 + rng() * (W - 120), y = TOP + 60 + rng() * (H - TOP - 100);
      if (Math.abs(x - cx) < 150 && Math.abs(y - cy) < 120) continue;
      g.fillStyle(SILK_SHADE, 0.9); g.fillEllipse(x, y, 14, 26);
      g.lineStyle(1, SILK_LIT, 0.8); for (let k = -9; k <= 9; k += 4) g.lineBetween(x - 6, y + k, x + 6, y + k + 2);
    }
    // The hub: a woven boss in purple and gold, the Spymaster's sigil.
    g.fillStyle(BRUISE_DARK, 0.9); g.fillEllipse(cx, cy, 120, 90);
    g.lineStyle(2, GOLD_THREAD, 0.8); g.strokeEllipse(cx, cy, 120, 90);
    orbWeb(g, cx, cy, 44, GOLD_THREAD, 0.6, 12, 0.75);
    g.fillStyle(BRUISE_LIT, 0.4); g.fillEllipse(cx, cy, 30, 22);
    // The gallery wall along the top: wicker, lamplit listening slits, threads pouring out of them.
    g.fillStyle(0x5e5040, 1); g.fillRect(0, 0, W, TOP + 8);
    for (let y = 6; y < TOP + 8; y += 8) { g.lineStyle(1.5, 0x463a2e, 0.8); g.lineBetween(0, y, W, y + 2); }
    for (let x = 0; x < W; x += 14) { g.lineStyle(1, 0x7e6c54, 0.5); g.lineBetween(x, 0, x + 3, TOP + 8); }
    for (let x = 50; x < W; x += 76) {
      g.fillStyle(0x1a140e, 1); g.fillRect(x - 5, 30, 10, 40);
      g.fillStyle(LAMP, 0.85); g.fillRect(x - 3, 34, 6, 32);
      glow(g, x, 50, 22, LAMP, 0.04, 3);
      // Threads from each slit down to the hub, tagged.
      g.lineStyle(1, GOLD_THREAD, 0.25); g.lineBetween(x, 70, cx + (x - cx) * 0.15, cy - 40);
    }
    g.fillStyle(BARK_DARK, 1); g.fillRect(0, TOP + 4, W, 8);
    g.fillStyle(BARK, 1); g.fillRect(0, TOP + 2, W, 4);
    // Lanterns hung on lines along the sides.
    for (let y = TOP + 120; y < H - 40; y += 150) { lantern(g, 24, y, 0.9, true, 20); lantern(g, W - 24, y + 70, 0.9, true, 20); }
    // Guy-lines from the corners, sagging.
    strand(g, { x: 0, y: TOP + 10 }, { x: cx - 300, y: cy - 40 }, 30, SILK_LIT, 0.5, 2);
    strand(g, { x: W, y: TOP + 10 }, { x: cx + 300, y: cy - 40 }, 30, SILK_LIT, 0.5, 2);
  },
};
