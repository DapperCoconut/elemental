import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  CRUDE, CRUDE_AMBER, CRUDE_LIT, FLAME, FLAME_LIT, GILT, GILT_DARK, LAMP_GOLD, LAMP_LIT, SAFETY_RED,
  SAFETY_WHITE, SOOT, STEEL, STEEL_DARK, STEEL_LIT, blobPts, clamp, crudePuddle, dist, droplet, drumEnd,
  flameTongue, noise, oilDrum, queensMark, sheenAt, slick, sootPuff,
} from './util';

/**
 * Prince Crude, the Lamp-Oil Prince — Queen Maresa's fourth child, who pumps the seabed under
 * Slickharbor dry to keep his mother's lamps burning across the Reach, and takes the Dry Tithe
 * in barrels from every household with no coin. He lives inside a gilded storage tank and he is
 * very nearly made of what he sells: a fat, glossy, rainbow-skinned body that drips as it
 * walks, the Queen's own glass lamp burning on his head as a crown, and a pump-jack's red
 * horsehead nodding over his shoulder like a second, patient head.
 *
 * Phase one, *Gusher*: he stalks the floor bringing wells up under you and skating at you
 * across his own slicks, rolling tithe drums down the rows. Every gush and every skate leaves
 * oil on the floor, and thick oil drags at your boots.
 *
 * Phase two, *Wildfire*: he circles, lamp blazing. He sprays oil and puts his lamp to it, and
 * the fire runs from slick to slick in the order the floor shows you; a whirl of burning oil
 * hunts you, drinking every slick it crosses.
 *
 * Hard mode adds *The Spill*: he rides a tide of crude that floods the floor from one side,
 * with a couple of floating rafts to stand on.
 */

// Palette — crude brown with lamp-gold light and the violet of an oil sheen.
const MAIN = 0x6a4424;
const LIT = 0xffc860;
const DARK = 0x120c08;
const ACCENT = 0xb44ad0;

const TOP = 96;

// ── The floor's oil, shared by every signature ───────────────────────

/**
 * Oil on the prince's floor. Gushers, skates and sprays add to it; Lamplight and the barrels
 * set it on fire; the whirl drinks it. One fight runs at a time, and the Wellspring signature
 * (built first, alive all fight) owns updating and painting it.
 */
interface FieldSlick { x: number; y: number; r: number; seed: number; bornAt: number; igniteAt: number; burnUntil: number; dead: boolean }
const field = { slicks: [] as FieldSlick[], seed: 1, lastTick: 0, phaseIdx: 0 };

const addSlick = (tk: BossToolkit, x: number, y: number, r: number): void => {
  const s = field.slicks;
  // Merge into an overlapping slick rather than stacking.
  for (const o of s) {
    if (!o.dead && o.burnUntil === 0 && o.igniteAt === 0 && dist(x, y, o.x, o.y) < (o.r + r) * 0.5) { o.r = Math.min(96, o.r + r * 0.25); return; }
  }
  s.push({ x: tk.clampX(x, 50), y: tk.clampY(y, 50), r, seed: field.seed++ * 1.31, bornAt: tk.now, igniteAt: 0, burnUntil: 0, dead: false });
  if (s.filter((o) => !o.dead).length > 16) { const old = s.find((o) => !o.dead && o.burnUntil === 0); if (old) old.dead = true; }
};
const slickAt = (x: number, y: number): FieldSlick | null => {
  for (const s of field.slicks) {
    if (s.dead) continue;
    const dx = (x - s.x) / s.r, dy = (y - s.y) / (s.r * 0.62);
    if (dx * dx + dy * dy < 1) return s;
  }
  return null;
};
const burning = (s: FieldSlick, time: number): boolean => s.burnUntil > 0 && time < s.burnUntil && time >= s.igniteAt;

/** Fire runs from `start` through every slick within reach of a lit one, a beat per hop. */
const chainIgnite = (start: FieldSlick, at: number, hopMs: number): number => {
  const queue: { s: FieldSlick; t: number }[] = [{ s: start, t: at }];
  const seen = new Set<FieldSlick>([start]);
  let last = at;
  while (queue.length) {
    const { s, t } = queue.shift()!;
    s.igniteAt = t;
    s.burnUntil = t + 3600;
    last = Math.max(last, t);
    for (const o of field.slicks) {
      if (o.dead || seen.has(o) || o.burnUntil) continue;
      if (dist(s.x, s.y, o.x, o.y) < s.r + o.r + 70) { seen.add(o); queue.push({ s: o, t: t + hopMs }); }
    }
  }
  return last;
};

// ── Signature: Wellspring ────────────────────────────────────────────
// Crude stamps and wells come up under you, one after another, each re-aimed where you are. The
// spot bubbles and swells first; then a column of crude, and a ring of droplets that fall back as
// slicks. This move also keeps the floor's oil: sticky to wade, and scalding where it burns.

const wellspring = (tk: BossToolkit): SignatureMove => {
  field.slicks = [];
  field.seed = 1;
  field.lastTick = 0;
  interface Well { x: number; y: number; bornAt: number; gushAt: number; dealt: boolean }
  interface Drop { x: number; y: number; landAt: number; dealt: boolean }
  let wells: Well[] = [];
  let drops: Drop[] = [];
  const WARN = 950, R = 54;
  const raise = (): void => {
    const p = tk.player;
    const now = tk.now;
    wells.push({ x: tk.clampX(p.x, 60), y: tk.clampY(p.y, 60), bornAt: now, gushAt: now + tk.warn(WARN), dealt: false });
    tk.sfx('quake');
  };
  return {
    durationMs: 2700,
    windupMs: 650,
    gesture: 'slam',
    tell: 'WELLSPRING',
    cast() {
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) tk.schedule(i * 620, raise);
    },
    update(time) {
      const p = tk.player;
      for (const w of wells) {
        if (w.dealt || time < w.gushAt) continue;
        w.dealt = true;
        tk.sfx('geyser');
        if (dist(p.x, p.y, w.x, w.y) < R + 14) tk.hitPlayer(16, p.x, p.y);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + Math.random() * 0.8;
          const r = 90 + Math.random() * 90;
          drops.push({ x: tk.clampX(w.x + Math.cos(a) * r, 50), y: tk.clampY(w.y + Math.sin(a) * r * 0.75, 50), landAt: time + tk.warn(900) + i * 60, dealt: false });
        }
      }
      for (const d of drops) {
        if (d.dealt || time < d.landAt) continue;
        d.dealt = true;
        if (dist(p.x, p.y, d.x, d.y) < 28) tk.hitPlayer(6, p.x, p.y);
        addSlick(tk, d.x, d.y, 34 + Math.random() * 14);
      }
      wells = wells.filter((w) => time < w.gushAt + 800);
      drops = drops.filter((d) => time < d.landAt + 100);

      // The oil on the floor: wading slows you, burning slicks scald.
      for (const s of field.slicks) if (s.burnUntil && time >= s.burnUntil) s.dead = true;
      field.slicks = field.slicks.filter((s) => !s.dead || time - s.burnUntil < 2500);
      const under = slickAt(p.x, p.y);
      if (under && p.active) {
        if (burning(under, time)) {
          if (time - field.lastTick > 450) { field.lastTick = time; tk.hitPlayer(7, p.x, p.y); tk.sfx('status-burn'); }
        } else if (!under.burnUntil) {
          tk.slowPlayer(0.72, 160);
        }
      }
    },
    drawGround(g, time) {
      const ts = time / 1000;
      for (const s of field.slicks) {
        if (s.dead) {
          // Scorch left by a burnt slick.
          const a = clamp(1 - (time - s.burnUntil) / 2500, 0, 1);
          g.fillStyle(SOOT, 0.75 * a); g.fillPoints(blobPts(s.x, s.y, s.r, s.r * 0.62, s.seed), true, true);
          continue;
        }
        const grow = clamp((time - s.bornAt) / 300, 0.3, 1);
        if (burning(s, time)) {
          g.fillStyle(FLAME, 0.22); g.fillEllipse(s.x, s.y, s.r * 2.6, s.r * 1.7);
          g.fillStyle(0x200a04, 0.95); g.fillPoints(blobPts(s.x, s.y, s.r, s.r * 0.62, s.seed), true, true);
          g.fillStyle(FLAME, 0.5); g.fillEllipse(s.x, s.y, s.r * 1.5, s.r * 0.85);
          continue;
        }
        slick(g, s.x, s.y, s.r * grow, s.r * 0.62 * grow, s.seed, ts * 0.5 + s.seed, 1);
        if (s.burnUntil && time < s.igniteAt) {
          // Next in line to catch: its rim flickers, brighter as its turn comes.
          const c = clamp(1 - (s.igniteAt - time) / 900, 0, 1);
          g.lineStyle(3 + c * 3, Math.floor(time / 80) % 2 ? FLAME_LIT : FLAME, 0.3 + c * 0.7);
          g.strokePoints(blobPts(s.x, s.y, s.r * 1.06, s.r * 0.66, s.seed), true, true);
        }
      }
      for (const w of wells) {
        if (time >= w.gushAt) continue;
        const c = clamp((time - w.bornAt) / (w.gushAt - w.bornAt), 0, 1);
        g.fillStyle(CRUDE, 0.25 + c * 0.45); g.fillCircle(w.x, w.y, R * (0.5 + c * 0.5));
        g.lineStyle(3, LIT, 0.4 + c * 0.5); g.strokeCircle(w.x, w.y, R);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + w.x;
          g.lineStyle(2, CRUDE_AMBER, c); g.lineBetween(w.x + Math.cos(a) * 10, w.y + Math.sin(a) * 8, w.x + Math.cos(a) * R * c, w.y + Math.sin(a) * R * c * 0.7);
        }
        for (let b = 0; b < 5; b++) {
          const ph = (ts * 3 + b / 5) % 1;
          g.lineStyle(1.5, CRUDE_AMBER, (1 - ph) * c); g.strokeCircle(w.x + Math.cos(b * 2.3) * 24, w.y + Math.sin(b * 2.3) * 14, 2 + ph * 7);
        }
        if (c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.5); g.strokeCircle(w.x, w.y, R + 5); }
      }
      for (const d of drops) {
        if (d.dealt) continue;
        const k = clamp(1 - (d.landAt - time) / 900, 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(d.x, d.y, 48 * (0.4 + k * 0.6), 24 * (0.4 + k * 0.6));
        g.lineStyle(1.5, CRUDE_AMBER, 0.3 + k * 0.5); g.strokeCircle(d.x, d.y, 28);
      }
    },
    drawAir(g, time) {
      const ts = time / 1000;
      for (const s of field.slicks) {
        if (s.dead || !burning(s, time)) continue;
        const life = clamp((s.burnUntil - time) / 3600, 0, 1);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + s.seed;
          const rr = s.r * (0.2 + noise(s.seed + i) * 0.6);
          flameTongue(g, s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.6, 18 + 22 * life, ts, i + s.seed);
        }
        sootPuff(g, s.x, s.y - 26, (ts * 0.5 + s.seed) % 1, 16, 0.5);
      }
      for (const w of wells) {
        if (time < w.gushAt) continue;
        const k = clamp((time - w.gushAt) / 800, 0, 1);
        const hgt = 200 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * (1 - k * 0.4);
        // A fat column with a gold lamp-glint running up it — the Prince's oil is the good stuff.
        g.fillStyle(CRUDE, 0.95 * (1 - k * 0.5)); g.fillRect(w.x - 22, w.y - hgt, 44, hgt);
        g.fillStyle(CRUDE_LIT, 0.8 * (1 - k * 0.5)); g.fillRect(w.x - 22, w.y - hgt, 8, hgt);
        g.fillStyle(LIT, 0.6 * (1 - k)); g.fillRect(w.x + 6, w.y - hgt, 3, hgt);
        for (let c = 0; c < 6; c++) {
          const a = -Math.PI / 2 + (c - 2.5) * 0.5;
          g.fillStyle(c % 2 ? CRUDE : CRUDE_LIT, 0.9 * (1 - k));
          g.fillCircle(w.x + Math.cos(a) * (20 + k * 40), w.y - hgt + Math.sin(a) * (10 + k * 20), 12 + k * 6);
        }
        g.lineStyle(2, sheenAt(ts * 3), 0.7 * (1 - k)); g.strokeEllipse(w.x, w.y, R * 2 + k * 70, R + k * 34);
      }
      for (const d of drops) {
        if (d.dealt) continue;
        const k = clamp(1 - (d.landAt - time) / 900, 0, 1);
        droplet(g, d.x, d.y - (1 - k) * (1 - k) * 280, 6.5);
      }
    },
    onPhaseEnd() { wells = []; drops = []; field.slicks = []; field.phaseIdx++; },
  };
};

// ── Signature: Greased Lightning ─────────────────────────────────────
// Crude skates. Three legs, each shown as a rainbow-sheened lane before he takes it; he comes
// down each one fast, body first, and leaves a trail of oil behind him. Step out of the lane.

const greasedLightning = (tk: BossToolkit): SignatureMove => {
  interface Leg { fx: number; fy: number; tx: number; ty: number; showAt: number; goAt: number; endAt: number; dealt: boolean; trailed: number }
  let legs: Leg[] = [];
  const HALF = 40, WARN = 700, TRAVEL = 420;
  const plan = (time: number): void => {
    legs = [];
    let fx = tk.bossX, fy = tk.bossY;
    const n = tk.hard ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const p = tk.player;
      // Odd legs carve across the room; even legs go through where you are.
      let tx: number, ty: number;
      if (i % 2 === 0) {
        const a = Math.atan2(p.y - fy, p.x - fx);
        tx = p.x + Math.cos(a) * 110; ty = p.y + Math.sin(a) * 110;
      } else {
        tx = fx < tk.W / 2 ? tk.W - 120 : 120; ty = tk.clampY(fy + (Math.random() - 0.5) * 260, 90);
      }
      tx = tk.clampX(tx, 90); ty = tk.clampY(ty, 90);
      const showAt = time + i * (WARN + TRAVEL) * 0.85;
      legs.push({ fx, fy, tx, ty, showAt, goAt: showAt + tk.warn(WARN), endAt: showAt + tk.warn(WARN) + TRAVEL, dealt: false, trailed: 0 });
      fx = tx; fy = ty;
    }
  };
  return {
    durationMs: 3700,
    windupMs: 500,
    gesture: 'sweep',
    locksBody: true,
    tell: 'GREASED LIGHTNING',
    cast(time) { plan(time); tk.sfx('dash'); },
    update(time) {
      const p = tk.player;
      for (const l of legs) {
        if (time < l.goAt || time > l.endAt + 30) continue;
        const k = clamp((time - l.goAt) / (l.endAt - l.goAt), 0, 1);
        const e = 1 - (1 - k) * (1 - k);
        const x = l.fx + (l.tx - l.fx) * e, y = l.fy + (l.ty - l.fy) * e;
        tk.host.setBossPos(x, y);
        if (!l.dealt && dist(p.x, p.y, x, y) < HALF + 14) { l.dealt = true; tk.hitPlayer(17, p.x, p.y); tk.sfx('hit-heavy'); }
        // Oil left behind every 70px.
        const along = dist(l.fx, l.fy, x, y);
        while (l.trailed + 70 < along) {
          l.trailed += 70;
          const t = l.trailed / (dist(l.fx, l.fy, l.tx, l.ty) || 1);
          addSlick(tk, l.fx + (l.tx - l.fx) * t, l.fy + (l.ty - l.fy) * t, 30);
        }
      }
      legs = legs.filter((l) => time < l.endAt + 200);
    },
    drawGround(g, time) {
      const ts = time / 1000;
      for (const l of legs) {
        if (time < l.showAt || time >= l.goAt + 60) continue;
        const c = clamp((time - l.showAt) / (l.goAt - l.showAt), 0, 1);
        const a = Math.atan2(l.ty - l.fy, l.tx - l.fx);
        const nx = -Math.sin(a), ny = Math.cos(a);
        const quad = [
          new Phaser.Geom.Point(l.fx + nx * HALF, l.fy + ny * HALF), new Phaser.Geom.Point(l.tx + nx * HALF, l.ty + ny * HALF),
          new Phaser.Geom.Point(l.tx - nx * HALF, l.ty - ny * HALF), new Phaser.Geom.Point(l.fx - nx * HALF, l.fy - ny * HALF),
        ];
        g.fillStyle(CRUDE, 0.22 + c * 0.25); g.fillPoints(quad, true);
        // Sheen chevrons streaming down the lane toward the end he'll skate to.
        const len = dist(l.fx, l.fy, l.tx, l.ty);
        for (let d = (ts * 260) % 40; d < len * c; d += 40) {
          const x = l.fx + Math.cos(a) * d, y = l.fy + Math.sin(a) * d;
          g.lineStyle(3, sheenAt(ts * 2 + d * 0.02), 0.7);
          g.lineBetween(x + nx * HALF * 0.7 - Math.cos(a) * 12, y + ny * HALF * 0.7 - Math.sin(a) * 12, x, y);
          g.lineBetween(x - nx * HALF * 0.7 - Math.cos(a) * 12, y - ny * HALF * 0.7 - Math.sin(a) * 12, x, y);
        }
        g.lineStyle(2, LIT, 0.4 + c * 0.5); g.strokePoints(quad, true);
        if (c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.45); g.strokeCircle(l.tx, l.ty, HALF + 6); }
      }
    },
    drawAir(g, time) {
      // Spray off his heels while he skates.
      for (const l of legs) {
        if (time < l.goAt || time > l.endAt) continue;
        const a = Math.atan2(l.ty - l.fy, l.tx - l.fx);
        for (let i = 0; i < 8; i++) {
          const ph = ((time / 200) + i / 8) % 1;
          const x = tk.bossX - Math.cos(a) * (20 + ph * 50) + Math.sin(a) * (i - 3.5) * 5;
          const y = tk.bossY + 18 - Math.sin(a) * (20 + ph * 50) - Math.cos(a) * (i - 3.5) * 5 - Math.sin(ph * Math.PI) * 14;
          g.fillStyle(i % 3 ? CRUDE : sheenAt(i), 1 - ph); g.fillCircle(x, y, 3 * (1 - ph) + 1);
        }
      }
    },
    onPhaseEnd() { legs = []; },
  };
};

// ── Signature: Rolling Stock ─────────────────────────────────────────
// Tithe drums come rolling across the floor down the rows, from one wall to the other. The rows
// they'll use are marked with arrows first and two rows are always left empty. A drum that
// rolls through fire swells, glows, and goes up.

const rollingStock = (tk: BossToolkit): SignatureMove => {
  interface Drum { row: number; y: number; x: number; dir: number; startAt: number; dealt: boolean; heatAt: number; blown: boolean; color: number }
  let drums: Drum[] = [];
  let rows: number[] = [];
  let dir = 1;
  let showAt = 0;
  const ROWS = 7, SPEED = 330, R = 20;
  const rowY = (i: number): number => TOP + 54 + (i * (tk.H - TOP - 104)) / (ROWS - 1);
  const xAt = (d: Drum, time: number): number => {
    const start = d.dir > 0 ? -30 : tk.W + 30;
    return start + d.dir * SPEED * Math.max(0, (time - d.startAt) / 1000);
  };
  return {
    durationMs: 3300,
    windupMs: 600,
    gesture: 'clap',
    tell: 'ROLLING STOCK',
    cast(time) {
      dir = tk.player.x < tk.W / 2 ? -1 : 1;
      // Leave two rows empty.
      const pr = clamp(Math.round(((tk.player.y - TOP - 54) / (tk.H - TOP - 104)) * (ROWS - 1)), 0, ROWS - 1);
      // The gap is beside you, never on you: you always have to take a step.
      let side = Math.random() < 0.5 ? -1 : 1;
      if (pr + side < 0 || pr + side > ROWS - 1) side = -side;
      const gapA = pr + side;
      const gapB = gapA + side >= 0 && gapA + side <= ROWS - 1 ? gapA + side : pr - side;
      rows = [];
      for (let i = 0; i < ROWS; i++) if (i !== gapA && i !== gapB) rows.push(i);
      showAt = time;
      const warn = tk.warn(1000);
      const cols = [0x3a1e18, 0x2a2a30, SAFETY_RED, 0x1e3a2a];
      drums = rows.map((r, i) => ({ row: r, y: rowY(r), x: 0, dir, startAt: time + warn + (i % 3) * 260, dealt: false, heatAt: 0, blown: false, color: cols[i % cols.length] }));
      tk.sfx('drum-hit');
    },
    update(time) {
      const p = tk.player;
      for (const d of drums) {
        if (d.blown || time < d.startAt) continue;
        d.x = xAt(d, time);
        if (!d.dealt && dist(p.x, p.y, d.x, d.y) < R + 16) { d.dealt = true; tk.hitPlayer(14, p.x, p.y); tk.sfx('hit-medium'); }
        // Through fire: swells, then blows.
        const s = slickAt(d.x, d.y);
        if (!d.heatAt && s && burning(s, time)) { d.heatAt = time + 320; tk.sfx('sizzle'); }
        if (d.heatAt && time >= d.heatAt) {
          d.blown = true;
          tk.explode(d.x, d.y, 80, 14, FLAME);
          tk.sfx('explosion-medium');
          addSlick(tk, d.x, d.y, 40);
        }
      }
      drums = drums.filter((d) => !d.blown && (time < d.startAt + 200 || (d.x > -60 && d.x < tk.W + 60)));
    },
    drawGround(g, time) {
      if (!drums.length) return;
      const ts = time / 1000;
      for (const r of rows) {
        const y = rowY(r);
        const anyPending = drums.some((d) => d.row === r && time < d.startAt + 3000);
        if (!anyPending) continue;
        const c = clamp((time - showAt) / tk.warn(1000), 0, 1);
        g.fillStyle(CRUDE, 0.12 + c * 0.12); g.fillRect(0, y - R - 4, tk.W, (R + 4) * 2);
        for (let x = (ts * 200 * dir) % 60 + (dir > 0 ? 0 : 60); x < tk.W + 60; x += 60) {
          const xx = dir > 0 ? x : tk.W - x;
          g.lineStyle(3, SAFETY_WHITE, 0.25 + c * 0.4);
          g.lineBetween(xx - dir * 10, y - 10, xx, y); g.lineBetween(xx - dir * 10, y + 10, xx, y);
        }
      }
    },
    drawAir(g, time) {
      for (const d of drums) {
        if (time < d.startAt) continue;
        const x = xAt(d, time);
        const roll = ((x / R) % (Math.PI * 2));
        const heat = d.heatAt ? clamp(1 - (d.heatAt - time) / 320, 0, 1) : 0;
        g.fillStyle(0x000000, 0.35); g.fillEllipse(x, d.y + R - 2, R * 2.4, 10);
        // A drum on its side seen from above: a barrel body with hoops that spin as it rolls.
        const body = heat ? lit(d.color, heat * 0.6) : d.color;
        g.fillStyle(dim(body, 0.5), 1); g.fillRoundedRect(x - R, d.y - R * 1.3, R * 2, R * 2.6, 6);
        g.fillStyle(body, 1); g.fillRoundedRect(x - R + 2, d.y - R * 1.3 + 2, R * 2 - 4, R * 2.6 - 4, 5);
        for (let k = 0; k < 3; k++) {
          const yy = d.y - R * 1.3 + ((((k / 3) * R * 2.6) + roll * 8) % (R * 2.6));
          g.fillStyle(dim(body, 0.35), 1); g.fillRect(x - R + 1, yy, R * 2 - 2, 3);
        }
        g.fillStyle(lit(body, 0.3), 0.6); g.fillRect(x - R + 4, d.y - R * 1.2, 4, R * 2.4);
        if (heat) { g.fillStyle(FLAME_LIT, heat * 0.5); g.fillCircle(x, d.y, R * (1.1 + heat * 0.4)); }
      }
    },
    onPhaseEnd() { drums = []; rows = []; },
  };
};

// ── Signature: Lamplight ─────────────────────────────────────────────
// Crude lifts the Queen's lamp off his head. If the floor is dry he sprays it first — a fan of
// oil arcing out toward you. Then he lobs the lit wick at the slick nearest you, and the fire
// runs slick to slick through every one close enough to its neighbour, a beat per hop. The order
// is shown: each slick's rim flickers as its turn comes.

const lamplight = (tk: BossToolkit): SignatureMove => {
  interface Glob { fx: number; fy: number; tx: number; ty: number; bornAt: number; landAt: number; done: boolean }
  interface Wick { fx: number; fy: number; target: FieldSlick; bornAt: number; landAt: number; done: boolean }
  let globs: Glob[] = [];
  let wick: Wick | null = null;
  const throwWick = (): void => {
    const p = tk.player;
    let best: FieldSlick | null = null, bd = Infinity;
    for (const s of field.slicks) {
      if (s.dead || s.burnUntil) continue;
      const d = dist(p.x, p.y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    if (!best) return;
    const now = tk.now;
    wick = { fx: tk.bossX, fy: tk.bossY - 50, target: best, bornAt: now, landAt: now + tk.warn(800), done: false };
    // Light the chain now so the floor can show its order while the wick is in the air.
    chainIgnite(best, wick.landAt, tk.hard ? 160 : 210);
    tk.sfx('fireball');
  };
  return {
    durationMs: 2600,
    windupMs: 750,
    gesture: 'raise',
    tell: 'LAMPLIGHT',
    cast(time) {
      const live = field.slicks.filter((s) => !s.dead && !s.burnUntil).length;
      if (live < 5) {
        // Spray first: a fan of globs toward the player.
        const a0 = tk.angleToPlayer();
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.32;
          const r = 140 + Math.random() * 160;
          globs.push({
            fx: tk.bossX, fy: tk.bossY, tx: tk.clampX(tk.bossX + Math.cos(a) * r, 50), ty: tk.clampY(tk.bossY + Math.sin(a) * r, 50),
            bornAt: time, landAt: time + 600 + i * 50, done: false,
          });
        }
        tk.sfx('oil-splash');
        tk.schedule(950, throwWick);
      } else {
        throwWick();
      }
    },
    update(time) {
      for (const gl of globs) {
        if (gl.done || time < gl.landAt) continue;
        gl.done = true;
        addSlick(tk, gl.tx, gl.ty, 44 + Math.random() * 14);
      }
      globs = globs.filter((gl) => !gl.done);
      if (wick && !wick.done && time >= wick.landAt) { wick.done = true; tk.sfx('flame-burst'); }
      if (wick && wick.done && time > wick.landAt + 400) wick = null;
    },
    drawAir(g, time) {
      for (const gl of globs) {
        const k = clamp((time - gl.bornAt) / (gl.landAt - gl.bornAt), 0, 1);
        const x = gl.fx + (gl.tx - gl.fx) * k, y = gl.fy + (gl.ty - gl.fy) * k - Math.sin(k * Math.PI) * 90;
        droplet(g, x, y, 7);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(gl.tx, gl.ty, 30 * k + 6, 12 * k + 3);
      }
      if (wick && !wick.done) {
        const k = clamp((time - wick.bornAt) / (wick.landAt - wick.bornAt), 0, 1);
        const t = wick.target;
        const x = wick.fx + (t.x - wick.fx) * k, y = wick.fy + (t.y - wick.fy) * k - Math.sin(k * Math.PI) * 120;
        g.fillStyle(FLAME, 0.3); g.fillCircle(x, y, 14);
        flameTongue(g, x, y + 6, 18, time / 1000, 7);
        g.fillStyle(0xe8dcc0, 1); g.fillRect(x - 1, y, 2, 8);
        // A trail of falling embers.
        for (let i = 1; i < 6; i++) {
          const tt = clamp(k - i * 0.04, 0, 1);
          const ex = wick.fx + (t.x - wick.fx) * tt, ey = wick.fy + (t.y - wick.fy) * tt - Math.sin(tt * Math.PI) * 120 + i * 3;
          g.fillStyle(FLAME_LIT, 0.8 - i * 0.12); g.fillCircle(ex, ey, 2);
        }
      }
    },
    onPhaseEnd() { globs = []; wick = null; },
  };
};

// ── Signature: Fire Whirl ────────────────────────────────────────────
// A whirl of burning oil peels off him and walks toward you, slower than you run. Every slick it
// crosses it drinks, and grows. It lives for a while, then collapses into soot.

const fireWhirl = (tk: BossToolkit): SignatureMove => {
  interface Whirl { x: number; y: number; r: number; bornAt: number; until: number; lastHit: number }
  let whirl: Whirl | null = null;
  return {
    durationMs: 1600,
    windupMs: 700,
    hold: 'conduct',
    tell: 'FIRE WHIRL',
    cast(time) {
      whirl = { x: tk.bossX, y: tk.bossY + 20, r: 38, bornAt: time, until: time + (tk.hard ? 7500 : 6500), lastHit: 0 };
      tk.sfx('tornado');
    },
    update(time, dt) {
      if (!whirl) return;
      if (time >= whirl.until) { whirl = null; return; }
      const p = tk.player;
      const spd = (tk.hard ? 92 : 78) * (time - whirl.bornAt < 600 ? 0.3 : 1);
      const a = Math.atan2(p.y - whirl.y, p.x - whirl.x);
      whirl.x = tk.clampX(whirl.x + Math.cos(a) * spd * dt, 50);
      whirl.y = tk.clampY(whirl.y + Math.sin(a) * spd * dt, 50);
      // Drink a slick: it vanishes into the whirl, which grows.
      const s = slickAt(whirl.x, whirl.y);
      if (s && !burning(s, time)) {
        s.dead = true; s.burnUntil = time;
        whirl.r = Math.min(74, whirl.r + 9);
        whirl.until = Math.min(whirl.until + 600, time + 9000);
        tk.host.showFloatingText(whirl.x, whirl.y - whirl.r - 30, 'IT DRINKS', '#ffb060');
        tk.sfx('flame-burst');
      }
      if (dist(p.x, p.y, whirl.x, whirl.y) < whirl.r + 14 && time - whirl.lastHit > 420) {
        whirl.lastHit = time;
        tk.hitPlayer(9, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!whirl) return;
      const k = clamp((whirl.until - time) / 800, 0, 1);
      g.fillStyle(FLAME, 0.18 * k); g.fillEllipse(whirl.x, whirl.y + 6, whirl.r * 2.8, whirl.r * 1.4);
      g.lineStyle(3, FLAME_LIT, 0.5 * k); g.strokeEllipse(whirl.x, whirl.y + 6, whirl.r * 2.2, whirl.r * 1.1);
      g.fillStyle(SOOT, 0.5 * k); g.fillEllipse(whirl.x, whirl.y + 6, whirl.r * 1.4, whirl.r * 0.7);
    },
    drawAir(g, time) {
      if (!whirl) return;
      const ts = time / 1000;
      const k = clamp((whirl.until - time) / 800, 0, 1) * clamp((time - whirl.bornAt) / 400, 0, 1);
      const hgt = whirl.r * 3.4;
      // Spiral bands of fire climbing a funnel that widens toward the top.
      for (let i = 0; i < 26; i++) {
        const t = i / 26;
        const a = ts * 9 + t * 14;
        const rr = whirl.r * (0.35 + t * 0.75);
        const x = whirl.x + Math.cos(a) * rr, y = whirl.y - t * hgt + Math.sin(a) * rr * 0.3;
        const c = t < 0.4 ? FLAME_LIT : t < 0.75 ? FLAME : 0x3a2010;
        g.fillStyle(c, (0.85 - t * 0.4) * k); g.fillCircle(x, y, 6 + t * 7);
      }
      g.fillStyle(0xffffff, 0.5 * k); g.fillEllipse(whirl.x, whirl.y - 6, whirl.r * 0.5, 10);
      for (let i = 0; i < 4; i++) sootPuff(g, whirl.x + Math.sin(ts * 3 + i) * 10, whirl.y - hgt, (ts * 0.6 + i / 4) % 1, 18, 0.5 * k);
    },
    onPhaseEnd() { whirl = null; },
  };
};

// ── Signature: The Spill (hard) ──────────────────────────────────────
// Crude bursts and the floor floods sideways: a tide of crude surges in from one wall as three
// breakers, each reaching past the last, holds with a swell, and draws back. Wading in it drags at you and burns your skin; two drum-rafts float in it, and the far
// strip of floor stays dry. The tide's edge darkens and froths along its wall before it comes.

const theSpill = (tk: BossToolkit): SignatureMove => {
  interface Raft { x: number; y: number; seed: number }
  let from: 'l' | 'r' = 'l';
  let startAt = 0, fullAt = 0, holdUntil = 0, endAt = 0;
  let rafts: Raft[] = [];
  let lastTick = 0;
  const REACH = 0.7, RAFT_R = 46;
  /** How far the tide has come in, 0..1 of the arena width it will cover. */
  const extent = (time: number): number => {
    if (!startAt || time < startAt) return 0;
    // It comes in as three breakers, each pushing past where the last fell back to.
    if (time < fullAt) { const u = (time - startAt) / (fullAt - startAt); return clamp(u + 0.09 * Math.sin(u * Math.PI * 6), 0, 1); }
    if (time < holdUntil) return 1 - 0.04 * (1 + Math.sin(time / 260));
    if (time < endAt) return 1 - (time - holdUntil) / (endAt - holdUntil);
    return 0;
  };
  const frontX = (time: number): number => {
    const e = extent(time) * REACH * tk.W;
    return from === 'l' ? e : tk.W - e;
  };
  const flooded = (x: number, time: number): boolean => {
    if (extent(time) <= 0) return false;
    const fx = frontX(time);
    return from === 'l' ? x < fx : x > fx;
  };
  const raftPos = (r: Raft, time: number): { x: number; y: number } => ({
    x: r.x + Math.sin(time / 900 + r.seed) * 16, y: r.y + Math.cos(time / 1100 + r.seed) * 10,
  });
  let warnAt = 0;
  return {
    durationMs: 3400,
    windupMs: 900,
    hold: 'brace',
    tell: 'THE SPILL',
    cast(time) {
      from = tk.player.x < tk.W / 2 ? 'l' : 'r';
      warnAt = time;
      startAt = time + tk.warn(1400);
      fullAt = startAt + 2600;
      holdUntil = fullAt + 2200;
      endAt = holdUntil + 1600;
      const span = REACH * tk.W;
      rafts = [0.3, 0.68].map((f, i) => ({
        x: from === 'l' ? span * f : tk.W - span * f,
        y: TOP + 90 + (i === 0 ? 0.25 : 0.7) * (tk.H - TOP - 140) + (Math.random() - 0.5) * 60,
        seed: i * 2.1,
      }));
      tk.sfx('rain');
      tk.host.showFloatingText(from === 'l' ? 160 : tk.W - 160, TOP + 40, 'THE TIDE IS COMING IN', '#d8b070');
    },
    update(time) {
      if (!startAt || time >= endAt) { if (endAt && time >= endAt) startAt = 0; return; }
      const p = tk.player;
      if (!flooded(p.x, time) || !p.active) return;
      const onRaft = rafts.some((r) => { const rp = raftPos(r, time); return dist(p.x, p.y, rp.x, rp.y) < RAFT_R; });
      if (onRaft) return;
      tk.slowPlayer(0.55, 160);
      if (time - lastTick > 500) { lastTick = time; tk.hitPlayer(5, p.x, p.y); }
    },
    drawGround(g, time) {
      if (!startAt && !warnAt) return;
      const ts = time / 1000;
      if (startAt && time < startAt) {
        // The warning: the wall it comes from darkens and froths.
        const c = clamp((time - warnAt) / (startAt - warnAt), 0, 1);
        const w = 30 + c * 60;
        const x0 = from === 'l' ? 0 : tk.W - w;
        g.fillStyle(CRUDE, 0.3 + c * 0.5); g.fillRect(x0, TOP, w, tk.H - TOP);
        for (let y = TOP; y < tk.H; y += 14) {
          const fx = from === 'l' ? w + Math.sin(y * 0.1 + ts * 6) * 6 : tk.W - w - Math.sin(y * 0.1 + ts * 6) * 6;
          g.fillStyle(CRUDE_AMBER, 0.5 * c); g.fillCircle(fx, y, 3);
        }
        // Where the tide will reach, dashed.
        const reachX = from === 'l' ? REACH * tk.W : tk.W - REACH * tk.W;
        for (let y = TOP; y < tk.H; y += 24) { g.lineStyle(3, LIT, 0.3 + c * 0.5); g.lineBetween(reachX, y, reachX, y + 12); }
        return;
      }
      const e = extent(time);
      if (e <= 0) return;
      const fx = frontX(time);
      const x0 = from === 'l' ? 0 : fx, w = from === 'l' ? fx : tk.W - fx;
      g.fillStyle(CRUDE, 0.94); g.fillRect(x0, TOP, w, tk.H - TOP);
      // Swells and sheen bands across the tide.
      for (let i = 0; i < 12; i++) {
        const y = TOP + 20 + ((i * 47 + ts * 20) % (tk.H - TOP - 30));
        g.lineStyle(2, sheenAt(ts * 0.5 + i * 0.7), 0.3);
        g.lineBetween(x0 + 10, y + Math.sin(ts + i) * 4, x0 + w - 10, y + Math.cos(ts + i) * 4);
      }
      // A frothing, lumpy front.
      for (let y = TOP; y < tk.H; y += 10) {
        const off = Math.sin(y * 0.07 + ts * 5) * 10 + Math.sin(y * 0.19 + ts * 3) * 5;
        const xx = from === 'l' ? fx + off : fx - off;
        g.fillStyle(CRUDE_LIT, 0.95); g.fillCircle(xx, y, 9);
        g.fillStyle(CRUDE_AMBER, 0.6); g.fillCircle(xx - (from === 'l' ? 2 : -2), y - 2, 3);
      }
      // Rafts: a pallet lashed onto drums, riding the swell.
      for (const r of rafts) {
        const rp = raftPos(r, time);
        if (!flooded(rp.x, time)) continue;
        g.lineStyle(3, LAMP_GOLD, 0.35 + 0.2 * Math.sin(ts * 4)); g.strokeCircle(rp.x, rp.y, RAFT_R + 4);
        for (const dx of [-22, 0, 22]) drumEnd(g, rp.x + dx, rp.y + 12, 11, 0x3a1e18);
        g.fillStyle(0x6a4a2e, 1); g.fillRect(rp.x - 40, rp.y - 16, 80, 28);
        g.lineStyle(2, 0x3e2a1a, 1);
        for (let k = 0; k < 5; k++) g.lineBetween(rp.x - 40 + k * 20, rp.y - 16, rp.x - 40 + k * 20, rp.y + 12);
        g.lineStyle(1.5, 0x8a7450, 1); g.lineBetween(rp.x - 40, rp.y - 2, rp.x + 40, rp.y - 2);
      }
    },
    onPhaseEnd() { startAt = 0; warnAt = 0; rafts = []; },
  };
};

// ── Look ─────────────────────────────────────────────────────────────

/**
 * Crude's decor: the glossy sheen sliding over his body, the drips he leaves, the Queen's glass
 * lamp burning on his head as a crown, and the pump-jack horsehead nodding over his shoulder.
 */
function drawCrudeDecor(g: Phaser.GameObjects.Graphics, s: BossBodyState): void {
  field.phaseIdx = s.phaseIdx;
  const R = s.radius;
  const ts = s.t / 1000;
  // The Spill: he's half poured out — a pool spreads under him.
  if (s.phaseIdx >= 2) {
    g.fillStyle(CRUDE, 0.9); g.fillPoints(blobPts(s.x, s.y + R * 0.7, R * 1.9, R * 0.75, 4.2, 14, 0.3), true, true);
    for (let k = 0; k < 3; k++) {
      g.lineStyle(2, sheenAt(ts + k), 0.35);
      g.strokePoints(blobPts(s.x, s.y + R * 0.7, R * (1.6 - k * 0.35), R * (0.62 - k * 0.12), 4.2 + k, 14, 0.3), true, true);
    }
  }
  // The pump-jack horsehead behind his right shoulder, nodding.
  const rock = Math.sin(ts * (s.enraged ? 3.4 : 2)) * 0.32;
  const px = s.x + R * 0.55, py = s.y - R * 0.95;
  const fx = px - Math.cos(rock - 0.5) * R * 1.1, fy = py - Math.sin(rock - 0.5) * R * 1.1 - R * 0.2;
  const bx = px + Math.cos(rock - 0.5) * R * 0.55, by = py + Math.sin(rock - 0.5) * R * 0.55;
  g.lineStyle(6, STEEL_DARK, 1); g.lineBetween(px, py + R * 0.5, px, py);
  g.lineStyle(7, STEEL_DARK, 1); g.lineBetween(fx, fy, bx, by);
  g.lineStyle(4, STEEL, 1); g.lineBetween(fx, fy, bx, by);
  g.fillStyle(STEEL_LIT, 1); g.fillCircle(px, py, 3);
  g.fillStyle(STEEL_DARK, 1);
  g.fillPoints([
    new Phaser.Geom.Point(fx + 5, fy - 7), new Phaser.Geom.Point(fx - 9, fy - 11), new Phaser.Geom.Point(fx - 14, fy),
    new Phaser.Geom.Point(fx - 8, fy + 12), new Phaser.Geom.Point(fx + 5, fy + 8),
  ], true);
  g.fillStyle(SAFETY_RED, 1);
  g.fillPoints([
    new Phaser.Geom.Point(fx + 3, fy - 5), new Phaser.Geom.Point(fx - 8, fy - 9), new Phaser.Geom.Point(fx - 12, fy),
    new Phaser.Geom.Point(fx - 7, fy + 10), new Phaser.Geom.Point(fx + 3, fy + 6),
  ], true);
  g.lineStyle(1.2, 0x1a1a1a, 1); g.lineBetween(fx - 13, fy + 1, s.x + R * 0.2, s.y - R * 0.3);
  // Gloss: a black skin over the rig's body, with a thin-film rainbow sliding round it.
  g.fillStyle(CRUDE, 0.55); g.fillCircle(s.x, s.y, R * 0.98);
  for (let k = 0; k < 4; k++) {
    const a0 = ts * 0.6 + k * 0.5;
    g.lineStyle(2.5 - k * 0.4, sheenAt(ts * 0.8 + k * 1.2), 0.55 - k * 0.08);
    g.beginPath(); g.arc(s.x, s.y, R * (0.92 - k * 0.12), a0, a0 + 1.6, false); g.strokePath();
  }
  g.fillStyle(0xffffff, 0.22); g.fillEllipse(s.x - R * 0.35, s.y - R * 0.45, R * 0.5, R * 0.2);
  g.fillStyle(CRUDE_AMBER, 0.35); g.fillEllipse(s.x + R * 0.3, s.y + R * 0.5, R * 0.6, R * 0.16);
  // Drips falling off his underside.
  for (let i = 0; i < 3; i++) {
    const ph = ((s.t / 700) + i / 3) % 1;
    const dx = s.x + (i - 1) * R * 0.45;
    droplet(g, dx, s.y + R * 0.85 + ph * 22, 2.6 * (1 - ph * 0.5), 1 - ph);
  }
  // Wildfire: flames licking off his shoulders.
  if (s.phaseIdx === 1) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      flameTongue(g, s.x + Math.cos(a) * R * 0.9, s.y + Math.sin(a) * R * 0.8 + 4, 14 + (s.enraged ? 6 : 0), ts, i * 1.3);
    }
  }
  // The crown: the Queen's glass lamp, brass collar, flame inside.
  const cx = s.x - R * 0.1, cy = s.y - R - 6;
  g.fillStyle(GILT_DARK, 1); g.fillRoundedRect(cx - 13, cy - 4, 26, 10, 3);
  g.fillStyle(GILT, 1); g.fillRoundedRect(cx - 11, cy - 3, 22, 6, 2);
  queensMark(g, cx, cy + 1, 3, GILT_DARK, 1);
  // Glass chimney: bulb then neck.
  g.fillStyle(0xe8f4ff, 0.22); g.fillEllipse(cx, cy - 14, 22, 22); g.fillRect(cx - 6, cy - 40, 12, 22);
  g.lineStyle(1.5, 0xe8f4ff, 0.6); g.strokeEllipse(cx, cy - 14, 22, 22); g.strokeRect(cx - 6, cy - 40, 12, 22);
  const big = s.phaseIdx === 1 ? 1.7 : s.phaseIdx >= 2 ? 0.7 : 1;
  const fl = 0.8 + 0.2 * Math.sin(ts * 12) + 0.1 * noise(Math.floor(ts * 14));
  g.fillStyle(s.phaseIdx >= 2 ? FLAME : LAMP_GOLD, 0.25 + s.castGlow * 0.3); g.fillCircle(cx, cy - 16, 16 * big);
  g.fillStyle(s.phaseIdx >= 2 ? FLAME : LAMP_GOLD, 0.95); g.fillTriangle(cx - 5 * big, cy - 8, cx + 5 * big, cy - 8, cx, cy - 8 - 18 * big * fl);
  g.fillStyle(LAMP_LIT, 0.95); g.fillTriangle(cx - 2.5, cy - 8, cx + 2.5, cy - 8, cx, cy - 8 - 9 * big * fl);
  if (s.phaseIdx >= 2) for (let i = 0; i < 2; i++) sootPuff(g, cx, cy - 44, (ts * 0.7 + i / 2) % 1, 6, 0.7);
  if (s.phaseIdx === 1 && s.enraged) flameTongue(g, cx, cy - 38, 18, ts, 9);
  // Gilt cap on the chimney.
  g.fillStyle(GILT, 1); g.fillRect(cx - 8, cy - 43, 16, 4);
  if (s.hurt) { g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(s.x, s.y, R + 3); }
}

/** Inside the Lamphouse's tank: a round floor of gilt-banded plates radiating from the wellhead. */
function drawCrudeArena(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  const rng = mulberry(5150);
  const cx = W / 2, cy = (TOP + H) / 2 + 10;
  g.fillStyle(0x0a0908, 1); g.fillRect(0, 0, W, H);
  // Black lacquered plate floor in concentric courses of radial plates.
  for (let ring = 0; ring < 7; ring++) {
    const r0 = 60 + ring * 70, r1 = r0 + 70;
    const n = 8 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const c = (i + ring) % 2 ? 0x1a1714 : 0x221e1a;
      g.fillStyle(lit(c, rng() * 0.05), 1);
      g.fillPoints([
        new Phaser.Geom.Point(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * 0.78), new Phaser.Geom.Point(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0 * 0.78),
        new Phaser.Geom.Point(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1 * 0.78), new Phaser.Geom.Point(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1 * 0.78),
      ], true);
      g.lineStyle(1, 0x000000, 0.7); g.lineBetween(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0 * 0.78, cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1 * 0.78);
    }
    // Gold-leaf course band with studs.
    g.lineStyle(3, GILT_DARK, 1); g.strokeEllipse(cx, cy, r1 * 2, r1 * 2 * 0.78);
    g.lineStyle(1.5, GILT, 0.8); g.strokeEllipse(cx, cy, r1 * 2 - 2, r1 * 2 * 0.78 - 2);
  }
  // Crude seeping up through the seams.
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2, r = 80 + rng() * 380;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.78;
    if (y < TOP + 10) continue;
    crudePuddle(g, x, y, 8 + rng() * 16, i + 0.4, 0.7);
  }
  // The wellhead at the centre: a gilt collar round a black bore, the Queen's mark inlaid.
  g.fillStyle(0x000000, 0.4); g.fillEllipse(cx, cy + 6, 140, 80);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(cx, cy, 120, 74);
  g.fillStyle(GILT, 1); g.fillEllipse(cx, cy - 2, 110, 66);
  g.fillStyle(0x07060a, 1); g.fillEllipse(cx, cy - 2, 70, 40);
  g.fillStyle(CRUDE_LIT, 0.6); g.fillEllipse(cx - 10, cy - 8, 30, 8);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.fillStyle(GILT_DARK, 1); g.fillCircle(cx + Math.cos(a) * 46, cy - 2 + Math.sin(a) * 27, 2.4);
  }
  queensMark(g, cx, cy - 74, 26, GILT, 0.3);
  // Tank wall along the top: black with a gold band and porthole lamps.
  g.fillStyle(0x16131a, 1); g.fillRect(0, TOP, W, 46);
  g.fillStyle(GILT_DARK, 1); g.fillRect(0, TOP + 34, W, 8);
  g.fillStyle(GILT, 1); g.fillRect(0, TOP + 35, W, 4);
  for (let x = 60; x < W; x += 140) {
    g.fillStyle(LAMP_GOLD, 0.12); g.fillCircle(x, TOP + 18, 22);
    g.fillStyle(GILT_DARK, 1); g.fillCircle(x, TOP + 18, 11);
    g.fillStyle(LAMP_GOLD, 0.9); g.fillCircle(x, TOP + 18, 8);
  }
  // Gilded lamp stands in the four corners, each a lamp burning tithe oil.
  for (const [lx, ly] of [[40, TOP + 80], [W - 40, TOP + 80], [40, H - 30], [W - 40, H - 30]] as const) {
    g.fillStyle(LAMP_GOLD, 0.08); g.fillCircle(lx, ly - 46, 60);
    oilDrum(g, lx, ly, 9, 0x2a1a10, true);
    g.fillStyle(GILT_DARK, 1); g.fillRect(lx - 2, ly - 54, 4, 34);
    g.fillStyle(LAMP_GOLD, 0.95); g.fillRect(lx - 6, ly - 66, 12, 12);
    g.fillStyle(GILT, 1); g.fillTriangle(lx - 8, ly - 66, lx + 8, ly - 66, lx, ly - 74);
  }
  // A ring channel of crude round the rim of the floor.
  g.lineStyle(10, CRUDE, 0.9); g.strokeEllipse(cx, cy, W * 1.02, (H - TOP) * 1.02);
  g.lineStyle(2, ACCENT, 0.25); g.strokeEllipse(cx, cy, W * 1.0, (H - TOP) * 1.0);
}

// ── The def ──────────────────────────────────────────────────────────

export const CRUDE_BOSS: WorldBossDef = {
  worldId: 'isle:crude',
  name: 'Prince Crude',
  title: 'The Lamp-Oil Prince',
  color: MAIN,
  colorLit: LIT,
  colorDark: DARK,
  accent: ACCENT,
  damageMult: 1,

  intro: [
    'Mind the floor. It\'s worth more than you are.',
    'Mother\'s lamps burn across the whole Reach. Every flame of them came up through me.',
  ],
  banter: [
    'A coin a head, or a barrel. You look about a barrel and a half.',
    'Every lamp in the Undertow is lit with Slickharbor. You\'re standing in the Queen\'s light.',
    'Slip. Go on. Everyone does.',
    'They call it short weight. I call it the ballast fee.',
    'The sea\'s just oil that hasn\'t been sold yet.',
    'You smell of fresh air. Disgusting.',
  ],
  defeatLine: 'THE LAMPS GO OUT',
  resumeLine: 'Back for a second barrel? The pumps never stopped, dry-foot.',

  phases: [
    {
      name: 'Gusher',
      line: 'Up it comes. All of it. All for her.',
      hp: 380,
      cycle: ['sig:wellspring', 'volley', 'sig:skate', 'hazard', 'sig:barrels', 'lanes', 'sig:wellspring', 'homing'],
      harass: ['h-snipe', 'h-flak', 'h-mines'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Wildfire',
      line: 'You know what oil is for? It\'s for BURNING.',
      hp: 460,
      cycle: ['sig:lamplight', 'sig:whirl', 'radial', 'sig:wellspring', 'sig:lamplight', 'sig:barrels', 'sweep', 'barrage'],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE WHOLE HARBOUR IS COMING UP',
    extraPhase: {
      name: 'The Spill',
      line: 'If I can\'t hold it in, nobody walks dry. Not you. Not her.',
      hp: 340,
      cycle: ['sig:spill', 'sig:skate', 'sig:lamplight', 'quake', 'sig:spill', 'sig:barrels', 'sig:whirl', 'stream'],
      harass: ['h-mines', 'h-rune', 'h-snipe'],
      restMs: 850,
      harassMs: 2400,
    },
  },

  tuning: {
    lanes: { halfW: 32, warnMs: 900 },
    hazard: { radius: 70 },
  },

  signatures: {
    wellspring,
    skate: greasedLightning,
    barrels: rollingStock,
    lamplight,
    whirl: fireWhirl,
    spill: theSpill,
  },

  look: {
    crest: 'none', pattern: 'drip', aura: 'bubbles', hands: 'ball',
    torsoR: 38, mouth: 'grin', eyes: 2, eyeColor: LAMP_GOLD,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'hot', look: { aura: 'flame', pattern: 'cracks' } },
    { movement: 'anchor', gimmick: 'none', tint: 'void', look: { aura: 'smoke', pattern: 'swirl', mouth: 'maw' } },
  ],

  drawDecor: drawCrudeDecor,
  drawArena: drawCrudeArena,
};
