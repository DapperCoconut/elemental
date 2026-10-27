import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, COPPER, ENAMEL, IRON, IRON_LIT, LAMPLIGHT, LODE, LODE_GLINT, LODE_MID, LODE_SHEEN,
  LODE_WASH, NAVY, NAVY_DARK, NAVY_LIT, VERD, WHITE,
} from './palette';
import { arrow, dashedEllipse, dist, gear, lodestone, pebble, planet } from './orbitArt';

/**
 * Prince Perigee — the Closest Approach, governor of the Orbit Court.
 *
 * The King's patient son. He never chases anything; he only waits at the bottom of the well and
 * lets it come to him. He keeps the Breath Tax by the chain — a link off a household's tether for
 * every missed payment, so each pass brings the house nearer the moon, where breath weighs more
 * and costs more — and he calls this arithmetic, not cruelty. Everything comes round to him.
 *
 * Phase one (*Satellite*) he circles you as a moon does, three small black moons circling him in
 * turn: he flings them down locked lines, opens gravity wells that drag you toward their collapse,
 * and swings his whole body round you on an ellipse whose closest point is wherever you stood.
 * Phase two (*Freefall*) he takes "down" away: it turns from wall to wall, gears pour down the
 * new down, iron ballast drops along it, and a great pendulum swings from the new up. Hard mode's
 * third phase (*Singularity*) he collapses into a point that eats the light — the dark grows round
 * him and snaps shut, rings of debris fall inward, and what he swallows comes back as radiation.
 */

/** The player's hit radius, as the toolkit reckons it. */
const PLAYER_R = 20;
const FIELD_TOP = 96;

/** Which way "down" is during Freefall (radians: 0 east, π/2 south). Read by the Freefall moves and the decor. */
const DOWN = { a: Math.PI / 2, setAt: -99999 };

/** The four walls' "down" directions. */
const DOWNS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** The field's centre and half-extent along a direction. */
const fieldCentre = (tk: BossToolkit): Pt => ({ x: tk.W / 2, y: (FIELD_TOP + tk.H) / 2 });
const halfAlong = (tk: BossToolkit, a: number): number => (Math.abs(Math.cos(a)) > 0.5 ? tk.W / 2 : (tk.H - FIELD_TOP) / 2);

// ── Signature: Moonfling ────────────────────────────────────────────
// Three little black moons spin up round him, then one by one stop dead,
// shiver on a locked line toward you, and fly down it.

const moonfling = (tk: BossToolkit): SignatureMove => {
  interface Moon { i: number; n: number; aimAt: number; flyAt: number; x: number; y: number; dir: number; flying: boolean; done: boolean }
  let moons: Moon[] = [];
  let castAt = 0;
  const SPEED = 520;
  const R = 18;
  return {
    durationMs: 3600,
    windupMs: 800,
    hold: 'conduct',
    tell: 'MOONFLING',
    cast(time) {
      tk.sfx('magnet-pull');
      castAt = time;
      const n = tk.hard ? 4 : 3;
      moons = [];
      for (let i = 0; i < n; i++) {
        const flyAt = time + tk.warn(1000) + i * 560;
        moons.push({ i, n, aimAt: flyAt - tk.warn(700), flyAt, x: tk.bossX, y: tk.bossY, dir: 0, flying: false, done: false });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const m of moons) {
        if (m.done) continue;
        if (time < m.aimAt) {
          const a = (m.i / m.n) * Math.PI * 2 + (time - castAt) / 260;
          m.x = tk.bossX + Math.cos(a) * 74; m.y = tk.bossY + Math.sin(a) * 56;
          m.dir = Math.atan2(p.y - m.y, p.x - m.x);
          continue;
        }
        if (!m.flying && time >= m.flyAt) { m.flying = true; tk.sfx('whoosh'); }
        if (!m.flying) continue;
        m.x += Math.cos(m.dir) * SPEED * dt; m.y += Math.sin(m.dir) * SPEED * dt;
        if (dist(m.x, m.y, p.x, p.y) < R + PLAYER_R * 0.7) { tk.hitPlayer(16, p.x, p.y); m.done = true; tk.sfx('stone-slam'); }
        if (m.x < -40 || m.x > tk.W + 40 || m.y < FIELD_TOP - 40 || m.y > tk.H + 40) m.done = true;
      }
      moons = moons.filter((m) => !m.done);
    },
    drawGround(g, time) {
      for (const m of moons) {
        if (time < m.aimAt || m.flying) continue;
        const k = Phaser.Math.Clamp((time - m.aimAt) / Math.max(1, m.flyAt - m.aimAt), 0, 1);
        const ex = m.x + Math.cos(m.dir) * 1200, ey = m.y + Math.sin(m.dir) * 1200;
        g.lineStyle((R + PLAYER_R * 0.7) * 2, LODE_SHEEN, 0.08 + 0.16 * k); g.lineBetween(m.x, m.y, ex, ey);
        g.lineStyle(2, LODE_GLINT, 0.4 + 0.5 * k); g.lineBetween(m.x, m.y, ex, ey);
        // A chain of beads down the line, running ahead of the throw.
        for (let s = 1; s < 10; s++) {
          const d = s * 70 + ((time / 3) % 70);
          g.fillStyle(LODE_WASH, 0.5 * k); g.fillCircle(m.x + Math.cos(m.dir) * d, m.y + Math.sin(m.dir) * d, 2.5);
        }
      }
    },
    drawAir(g, time) {
      for (const m of moons) {
        if (m.flying) {
          for (let s = 1; s <= 4; s++) {
            g.fillStyle(LODE_SHEEN, 0.25 - s * 0.05); g.fillCircle(m.x - Math.cos(m.dir) * s * 14, m.y - Math.sin(m.dir) * s * 14, R * (1 - s * 0.15));
          }
        }
        const shiver = !m.flying && time >= m.aimAt ? Math.sin(time / 18) * 2 : 0;
        lodestone(g, m.x + shiver, m.y, R, time / 1000, 1);
      }
    },
    onPhaseEnd() { moons = []; },
  };
};

// ── Signature: Gravity Wells ────────────────────────────────────────
// Sinks open in the floor round you — one under your feet — and the
// nearest drags at you as it winds tighter. Then they collapse, in turn.

const gravityWell = (tk: BossToolkit): SignatureMove => {
  interface Well { x: number; y: number; born: number; at: number; done: boolean }
  let wells: Well[] = [];
  const R = 72;
  return {
    durationMs: 3400,
    windupMs: 700,
    gesture: 'raise',
    tell: 'GRAVITY WELLS',
    cast(time) {
      tk.sfx('gravity-slam');
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const a0 = Math.random() * Math.PI * 2;
      wells = [{ x: tk.clampX(p.x, 60), y: tk.clampY(p.y, 60), born: time, at: time + tk.warn(2000), done: false }];
      for (let i = 1; i < n; i++) {
        const a = a0 + (i / (n - 1)) * Math.PI * 2;
        wells.push({ x: tk.clampX(p.x + Math.cos(a) * 240, 60), y: tk.clampY(p.y + Math.sin(a) * 180, 60), born: time, at: time + tk.warn(2000) + i * 260, done: false });
      }
    },
    update(time) {
      const p = tk.player;
      let near: Well | null = null, nd = Infinity;
      for (const w of wells) {
        if (w.done) continue;
        const d = dist(w.x, w.y, p.x, p.y);
        if (d < nd) { nd = d; near = w; }
        if (time >= w.at) {
          w.done = true;
          tk.sfx('explosion-medium');
          if (d < R + PLAYER_R * 0.4) tk.hitPlayer(15, p.x, p.y);
        }
      }
      if (near && nd < 320 && nd > 8) tk.pull(near.x, near.y, tk.hard ? 110 : 92, 120);
      wells = wells.filter((w) => !w.done || time < w.at + 500);
    },
    drawGround(g, time) {
      for (const w of wells) {
        if (w.done) {
          const q = Phaser.Math.Clamp((time - w.at) / 500, 0, 1);
          g.fillStyle(LODE_WASH, 0.5 * (1 - q)); g.fillCircle(w.x, w.y, R * (1 - q * 0.6));
          continue;
        }
        const k = Phaser.Math.Clamp((time - w.born) / Math.max(1, w.at - w.born), 0, 1);
        g.fillStyle(LODE, 0.25 + 0.3 * k); g.fillCircle(w.x, w.y, R);
        g.lineStyle(2, LODE_GLINT, 0.5 + 0.4 * k); g.strokeCircle(w.x, w.y, R);
        // A spiral winding tighter as it nears collapse.
        g.lineStyle(2, LODE_GLINT, 0.6);
        g.beginPath();
        const turns = 2 + k * 3;
        for (let s = 0; s <= 40; s++) {
          const q = s / 40;
          const a = q * turns * Math.PI * 2 + time / (300 - k * 200);
          const r = R * (1 - q);
          const x = w.x + Math.cos(a) * r, y = w.y + Math.sin(a) * r;
          if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        g.fillStyle(0x000000, 0.9); g.fillCircle(w.x, w.y, 6 + k * 8);
      }
    },
    drawAir(g, time) {
      // Grit being dragged into each well.
      for (const w of wells) {
        if (w.done) continue;
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 900) + i / 6) % 1;
          const a = i * 1.05 + ph * 2;
          const r = R * 1.5 * (1 - ph);
          pebble(g, w.x + Math.cos(a) * r, w.y + Math.sin(a) * r * 0.8, 2.5, IRON_LIT, 1 - ph * 0.5);
        }
      }
    },
    onPhaseEnd() { wells = []; },
  };
};

// ── Signature: Closest Approach ─────────────────────────────────────
// He draws an ellipse on the floor whose near end is where you stand,
// then swings round it himself — slow out, a whip-crack past the near end,
// slow home.

const closestApproach = (tk: BossToolkit): SignatureMove => {
  interface Swing { bx: number; by: number; cx: number; cy: number; a: number; b: number; ang: number; born: number; go: number; end: number; hit: boolean }
  let sw: Swing | null = null;
  const TRAVEL = 1500;
  const posAt = (s: Swing, q: number): Pt => {
    const M = q * Math.PI * 2;
    const phi = M - 0.6 * Math.sin(M);
    const E = Math.PI + phi;
    const ex = Math.cos(E) * s.a, ey = Math.sin(E) * s.b;
    return {
      x: tk.clampX(s.cx + ex * Math.cos(s.ang) - ey * Math.sin(s.ang), 50),
      y: tk.clampY(s.cy + ex * Math.sin(s.ang) + ey * Math.cos(s.ang), 50),
    };
  };
  return {
    durationMs: 3000,
    windupMs: 600,
    locksBody: true,
    hold: 'brace',
    tell: 'CLOSEST APPROACH',
    cast(time) {
      tk.sfx('engine');
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY;
      const ang = Math.atan2(p.y - by, p.x - bx);
      const reach = dist(bx, by, p.x, p.y) + 40;
      const a = Math.max(120, reach / 2);
      sw = { bx, by, cx: bx + Math.cos(ang) * a, cy: by + Math.sin(ang) * a, a, b: tk.hard ? 150 : 130, ang, born: time, go: time + tk.warn(950), end: time + tk.warn(950) + TRAVEL, hit: false };
    },
    update(time) {
      if (!sw) return;
      const s = sw;
      if (time >= s.go && time <= s.end) {
        const q = (time - s.go) / TRAVEL;
        const pos = posAt(s, q);
        tk.host.setBossPos(pos.x, pos.y);
        const p = tk.player;
        if (!s.hit && dist(pos.x, pos.y, p.x, p.y) < 46 + PLAYER_R * 0.5) { s.hit = true; tk.hitPlayer(18, p.x, p.y); tk.sfx('hit-heavy'); }
      }
      if (time > s.end) { tk.host.setBossPos(s.bx, s.by); sw = null; }
    },
    drawGround(g, time) {
      if (!sw) return;
      const s = sw;
      const k = Phaser.Math.Clamp((time - s.born) / Math.max(1, s.go - s.born), 0, 1);
      // The orbit he will fly, and a burning mark at its near end.
      const pts: Pt[] = [];
      for (let i = 0; i <= 48; i++) pts.push(posAt(s, i / 48));
      g.lineStyle(92, LODE_SHEEN, time < s.go ? 0.05 + 0.08 * k : 0.06);
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
      for (let i = 0; i < 48; i += 2) {
        g.lineStyle(3, LODE_GLINT, 0.4 + 0.5 * k); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }
      const peri = posAt(s, 0.5);
      g.lineStyle(3, BRASS_LIT, 0.5 + 0.5 * k); g.strokeCircle(peri.x, peri.y, 30 + (1 - k) * 30);
      g.fillStyle(BRASS, 0.12 + 0.2 * k); g.fillCircle(peri.x, peri.y, 46);
    },
    drawAir(g, time) {
      if (!sw || time < sw.go) return;
      const s = sw;
      // Afterimages behind him as he whips round.
      for (let i = 1; i <= 5; i++) {
        const q = Phaser.Math.Clamp((time - s.go) / TRAVEL - i * 0.025, 0, 1);
        const p = posAt(s, q);
        g.fillStyle(LODE_SHEEN, 0.3 - i * 0.05); g.fillCircle(p.x, p.y, 34 - i * 3);
      }
    },
    onPhaseEnd() { if (sw) tk.host.setBossPos(sw.bx, sw.by); sw = null; },
  };
};

// ── Signature: Downshift ────────────────────────────────────────────
// "Down" turns to another wall. Everything is dragged toward it, and a
// tumble of brass gears pours down the new down in rows — with a gap.

const downshift = (tk: BossToolkit): SignatureMove => {
  DOWN.a = Math.PI / 2; DOWN.setAt = -99999;
  interface Gear { x: number; y: number; vx: number; vy: number; r: number; rot: number; done: boolean }
  let gears: Gear[] = [];
  let shift: { born: number; from: number; to: number; start: number; end: number; waves: number; next: number; gap: number } | null = null;
  const SPACING = 55;
  return {
    durationMs: 3800,
    windupMs: 700,
    hold: 'conduct',
    tell: 'DOWN IS THAT WAY',
    cast(time) {
      tk.sfx('gear-turn');
      const choices = DOWNS.filter((d) => Math.abs(Phaser.Math.Angle.Wrap(d - DOWN.a)) > 0.1);
      const to = choices[Math.floor(Math.random() * choices.length)];
      const start = time + tk.warn(800);
      shift = { born: time, from: DOWN.a, to, start, end: start + 2800, waves: tk.hard ? 7 : 6, next: start, gap: -1 };
      DOWN.a = to; DOWN.setAt = time;
    },
    update(time, dt) {
      const p = tk.player;
      if (shift) {
        const sh = shift;
        if (time >= sh.start && time <= sh.end) {
          // Everything leans toward the new down.
          tk.pull(p.x + Math.cos(sh.to) * 2000, p.y + Math.sin(sh.to) * 2000, tk.hard ? 100 : 84, 120);
          if (sh.waves > 0 && time >= sh.next) {
            sh.waves--;
            sh.next = time + 430;
            // A row of gears along the up wall, falling down; a three-wide gap that drifts by one.
            const c = fieldCentre(tk);
            const ux = Math.cos(sh.to), uy = Math.sin(sh.to);
            const nx = -uy, ny = ux;
            const across = Math.abs(ux) > 0.5 ? tk.H - FIELD_TOP : tk.W;
            const cols = Math.floor(across / SPACING);
            if (sh.gap < 0) {
              // Start the gap on the player's column so the first row is always readable.
              const off = (p.x - c.x) * nx + (p.y - c.y) * ny;
              sh.gap = Phaser.Math.Clamp(Math.round(off / SPACING + cols / 2 - 1), 0, cols - 3);
            } else sh.gap = Phaser.Math.Clamp(sh.gap + (Math.random() < 0.5 ? -1 : 1), 0, cols - 3);
            const back = halfAlong(tk, sh.to) + 20;
            for (let i = 0; i < cols; i++) {
              if (i >= sh.gap && i < sh.gap + 3) continue;
              const off = (i - cols / 2 + 0.5) * SPACING;
              gears.push({ x: c.x - ux * back + nx * off, y: c.y - uy * back + ny * off, vx: ux * 250, vy: uy * 250, r: 11, rot: Math.random() * 6, done: false });
            }
            tk.sfx('clang');
          }
        }
        if (time > sh.end + 400) shift = null;
      }
      for (const gr of gears) {
        gr.x += gr.vx * dt; gr.y += gr.vy * dt; gr.rot += dt * 6;
        if (!gr.done && dist(gr.x, gr.y, p.x, p.y) < gr.r + PLAYER_R * 0.8) { gr.done = true; tk.hitPlayer(10, p.x, p.y); }
        if (gr.x < -40 || gr.x > tk.W + 40 || gr.y < FIELD_TOP - 60 || gr.y > tk.H + 40) gr.done = true;
      }
      gears = gears.filter((gr) => !gr.done);
    },
    drawGround(g, time) {
      if (!shift) return;
      const sh = shift;
      const c = fieldCentre(tk);
      const k = Phaser.Math.Clamp((time - sh.born) / Math.max(1, sh.start - sh.born), 0, 1);
      // The great arrow swinging round from the old down to the new.
      const a = sh.from + Phaser.Math.Angle.Wrap(sh.to - sh.from) * Math.min(1, k * 1.4);
      const live = time < sh.end;
      if (live) arrow(g, c.x - Math.cos(a) * 90, c.y - Math.sin(a) * 90, a, 150, BRASS_LIT, 0.35 + 0.3 * k, 8);
      // The new floor: the down wall glows brass.
      const ux = Math.cos(sh.to), uy = Math.sin(sh.to);
      const h = halfAlong(tk, sh.to);
      const wx = c.x + ux * (h - 10), wy = c.y + uy * (h - 10);
      const len = Math.abs(ux) > 0.5 ? tk.H - FIELD_TOP : tk.W;
      g.lineStyle(18, BRASS, live ? 0.25 + 0.2 * Math.sin(time / 120) : 0.1);
      g.lineBetween(wx - uy * len / 2, wy + ux * len / 2, wx + uy * len / 2, wy - ux * len / 2);
    },
    drawAir(g) {
      for (const gr of gears) gear(g, gr.x, gr.y, gr.r, 10, gr.rot % 2 < 1 ? BRASS : COPPER, gr.rot, 1);
    },
    onPhaseEnd() { gears = []; shift = null; },
  };
};

// ── Signature: Ballast ──────────────────────────────────────────────
// Iron weights drop from the up wall and fall the length of the room
// along strips that light first — one on your strip — then thud into the
// down wall in a burst.

const ballast = (tk: BossToolkit): SignatureMove => {
  interface Weight { off: number; born: number; at: number; t: number; landed: boolean; hit: boolean; dropAt: number }
  let weights: Weight[] = [];
  let down = Math.PI / 2;
  const STRIP = 70;
  const R = 28;
  const SPEED = 760;
  const posOf = (w: Weight, time: number): Pt => {
    const c = fieldCentre(tk);
    const ux = Math.cos(down), uy = Math.sin(down);
    const back = halfAlong(tk, down) + 30;
    const travel = Math.max(0, (time - w.at) / 1000) * SPEED;
    const along = -back + Math.min(travel, back * 2 - 20);
    return { x: c.x - uy * w.off + ux * along, y: c.y + ux * w.off + uy * along };
  };
  return {
    durationMs: 3200,
    windupMs: 650,
    gesture: 'slam',
    tell: 'BALLAST',
    cast(time) {
      tk.sfx('anvil');
      down = DOWN.a;
      const c = fieldCentre(tk);
      const p = tk.player;
      const ux = Math.cos(down), uy = Math.sin(down);
      const across = Math.abs(ux) > 0.5 ? (tk.H - FIELD_TOP) / 2 : tk.W / 2;
      const mine = (p.x - c.x) * -uy + (p.y - c.y) * ux;
      const offs = [Phaser.Math.Clamp(mine, -across + STRIP / 2, across - STRIP / 2)];
      const n = tk.hard ? 5 : 4;
      for (let tries = 0; offs.length < n && tries < 40; tries++) {
        const o = (Math.random() * 2 - 1) * (across - STRIP / 2);
        if (offs.every((q) => Math.abs(q - o) > STRIP * 1.4)) offs.push(o);
      }
      weights = offs.map((off, i) => ({ off, born: time, at: time + tk.warn(950) + i * 360, t: 0, landed: false, hit: false, dropAt: 0 }));
    },
    update(time) {
      const p = tk.player;
      const back = halfAlong(tk, down) + 30;
      for (const w of weights) {
        if (time < w.at || w.landed) continue;
        const pos = posOf(w, time);
        if (!w.hit && dist(pos.x, pos.y, p.x, p.y) < R + PLAYER_R * 0.6) { w.hit = true; tk.hitPlayer(15, p.x, p.y); }
        if ((time - w.at) / 1000 * SPEED >= back * 2 - 20) {
          w.landed = true; w.dropAt = time;
          tk.sfx('stone-slam');
          if (dist(pos.x, pos.y, p.x, p.y) < 74 + PLAYER_R * 0.4 && !w.hit) tk.hitPlayer(9, p.x, p.y);
        }
      }
      weights = weights.filter((w) => !w.landed || time < w.dropAt + 500);
    },
    drawGround(g, time) {
      const c = fieldCentre(tk);
      const ux = Math.cos(down), uy = Math.sin(down);
      const len = (halfAlong(tk, down) + 30) * 2;
      for (const w of weights) {
        const sx = c.x - uy * w.off, sy = c.y + ux * w.off;
        if (!w.landed) {
          const k = Phaser.Math.Clamp((time - w.born) / Math.max(1, w.at - w.born), 0, 1);
          g.lineStyle(STRIP, IRON, 0.08 + 0.14 * k);
          g.lineBetween(sx - ux * len / 2, sy - uy * len / 2, sx + ux * len / 2, sy + uy * len / 2);
          g.lineStyle(2, IRON_LIT, 0.3 + 0.5 * k);
          for (const side of [-1, 1]) {
            g.lineBetween(sx - ux * len / 2 - uy * side * STRIP / 2, sy - uy * len / 2 + ux * side * STRIP / 2, sx + ux * len / 2 - uy * side * STRIP / 2, sy + uy * len / 2 + ux * side * STRIP / 2);
          }
        }
        const end = { x: sx + ux * (len / 2 - 20), y: sy + uy * (len / 2 - 20) };
        if (w.landed) {
          const q = Phaser.Math.Clamp((time - w.dropAt) / 500, 0, 1);
          g.lineStyle(6 * (1 - q), BRASS_LIT, 1 - q); g.strokeCircle(end.x, end.y, 30 + q * 50);
        } else {
          g.lineStyle(2, BRASS, 0.5); g.strokeCircle(end.x, end.y, 74);
        }
      }
    },
    drawAir(g, time) {
      for (const w of weights) {
        if (time < w.at || w.landed) continue;
        const p = posOf(w, time);
        // A cast-iron weight with a ring on top, falling "down".
        g.fillStyle(IRON, 1);
        g.fillTriangle(p.x - R, p.y + R * 0.7, p.x + R, p.y + R * 0.7, p.x, p.y - R);
        g.fillStyle(IRON_LIT, 0.6); g.fillTriangle(p.x - R * 0.7, p.y + R * 0.5, p.x - R * 0.1, p.y + R * 0.5, p.x - R * 0.1, p.y - R * 0.5);
        g.lineStyle(3, IRON_LIT, 1); g.strokeCircle(p.x, p.y - R - 4, 6);
        g.fillStyle(LAMPLIGHT, 1); g.fillRect(p.x - 8, p.y + 2, 16, 3);
      }
    },
    onPhaseEnd() { weights = []; },
  };
};

// ── Signature: Pendulum ─────────────────────────────────────────────
// A great brass bob on a rod hung from the new "up" wall swings across
// the room. Its arc is drawn first; read where the bob will be.

const pendulum = (tk: BossToolkit): SignatureMove => {
  interface Swing { px: number; py: number; L: number; down: number; born: number; go: number; end: number; lastHit: number }
  let sw: Swing | null = null;
  const BOB = 40;
  const AMP = 0.95;
  const PERIOD = 1700;
  const bobAt = (s: Swing, time: number): Pt => {
    const t = Math.max(0, time - s.go);
    const th = AMP * Math.cos((t / PERIOD) * Math.PI * 2);
    return { x: s.px + Math.cos(s.down + th) * s.L, y: s.py + Math.sin(s.down + th) * s.L };
  };
  return {
    durationMs: 4000,
    windupMs: 700,
    hold: 'reach',
    tell: 'PENDULUM',
    cast(time) {
      tk.sfx('clock-tick');
      const down = DOWN.a;
      const c = fieldCentre(tk);
      const h = halfAlong(tk, down);
      const px = c.x - Math.cos(down) * (h + 50), py = c.y - Math.sin(down) * (h + 50);
      const L = (h * 2 + 50) * (Math.abs(Math.cos(down)) > 0.5 ? 0.62 : 0.86);
      sw = { px, py, L, down, born: time, go: time + tk.warn(1000), end: time + tk.warn(1000) + PERIOD * 1.5, lastHit: 0 };
    },
    update(time) {
      if (!sw) return;
      const s = sw;
      if (time >= s.go && time <= s.end) {
        const b = bobAt(s, time);
        const p = tk.player;
        if (time - s.lastHit > 700 && dist(b.x, b.y, p.x, p.y) < BOB + PLAYER_R * 0.6) { s.lastHit = time; tk.hitPlayer(16, p.x, p.y); tk.sfx('hit-heavy'); }
        const ph = ((time - s.go) / (PERIOD / 2)) % 1;
        if (ph < 0.02) tk.sfx('whoosh');
      }
      if (time > s.end + 300) sw = null;
    },
    drawGround(g, time) {
      if (!sw) return;
      const s = sw;
      const k = Phaser.Math.Clamp((time - s.born) / Math.max(1, s.go - s.born), 0, 1);
      // The swept arc, as a broad band.
      g.lineStyle((BOB + PLAYER_R * 0.6) * 2, BRASS, time < s.go ? 0.06 + 0.12 * k : 0.07);
      g.beginPath(); g.arc(s.px, s.py, s.L, s.down - AMP, s.down + AMP, false); g.strokePath();
      g.lineStyle(2, BRASS_LIT, 0.5 + 0.3 * k);
      g.beginPath(); g.arc(s.px, s.py, s.L, s.down - AMP, s.down + AMP, false); g.strokePath();
      // Tick marks where it turns.
      for (const e of [-AMP, AMP]) {
        const x = s.px + Math.cos(s.down + e) * s.L, y = s.py + Math.sin(s.down + e) * s.L;
        g.lineStyle(3, BRASS_LIT, 0.8); g.strokeCircle(x, y, 10);
      }
      if (time >= s.go) {
        const b = bobAt(s, time);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x + 6, b.y + 26, BOB * 2, BOB * 0.6);
      }
    },
    drawAir(g, time) {
      if (!sw) return;
      const s = sw;
      const b = time >= s.go ? bobAt(s, time) : { x: s.px + Math.cos(s.down + AMP) * s.L, y: s.py + Math.sin(s.down + AMP) * s.L };
      g.lineStyle(7, BRASS_DARK, 1); g.lineBetween(s.px, s.py, b.x, b.y);
      g.lineStyle(3, BRASS_LIT, 0.8); g.lineBetween(s.px, s.py, b.x, b.y);
      planet(g, b.x, b.y, BOB, BRASS, false, 1, BRASS_DARK);
      gear(g, b.x, b.y, BOB * 0.45, 12, BRASS_DARK, time / 400, 0.9);
    },
    onPhaseEnd() { sw = null; },
  };
};

// ── Signature: Accretion ────────────────────────────────────────────
// Rings of rubble fall inward to him from the walls, each with one gap
// where you stand; the gap creeps a little ring to ring.

const accretion = (tk: BossToolkit): SignatureMove => {
  interface Band { cx: number; cy: number; at: number; gap: number }
  let bands: Band[] = [];
  const START = 600;
  const SPEED = 240;
  const GAP = 0.5;
  return {
    durationMs: 3200,
    windupMs: 700,
    hold: 'brace',
    tell: 'ACCRETION',
    cast(time) {
      tk.sfx('tornado');
      const n = tk.hard ? 4 : 3;
      const g0 = tk.angleToPlayer();
      const drift = Math.random() < 0.5 ? 0.24 : -0.24;
      const cx = tk.bossX, cy = tk.bossY;
      bands = [];
      for (let i = 0; i < n; i++) {
        const gap = g0 + drift * i;
        const at = time + i * 650;
        bands.push({ cx, cy, at, gap });
        tk.schedule(i * 650, () => tk.spawnRing({ cx, cy, delayMs: 0, speed: -SPEED, startRadius: START, gapCentre: gap, gapHalf: GAP, band: 22, damage: 12 }));
      }
    },
    update(time) {
      bands = bands.filter((b) => time < b.at + (START / SPEED) * 1000 + 200);
    },
    drawAir(g, time) {
      // Rubble riding each ring in: pebbles, a bent link, a brass cog, all swirling.
      for (const b of bands) {
        if (time < b.at) continue;
        const r = START - ((time - b.at) / 1000) * SPEED;
        if (r <= 0) continue;
        const n = Math.max(8, Math.floor(r / 14));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + (time - b.at) / 900;
          if (Math.abs(Phaser.Math.Angle.Wrap(a - b.gap)) < GAP) continue;
          const x = b.cx + Math.cos(a) * r, y = b.cy + Math.sin(a) * r;
          if (i % 7 === 0) gear(g, x, y, 5, 8, BRASS, a, 0.9);
          else pebble(g, x, y, 3 + (i % 3), i % 2 ? IRON_LIT : LODE_GLINT, 0.9);
        }
      }
    },
    onPhaseEnd() { bands = []; },
  };
};

// ── Signature: The Light Eater ──────────────────────────────────────
// The dark round him swells while he drags you in toward it, then snaps
// shut. Be outside its rim when it does.

const lightEater = (tk: BossToolkit): SignatureMove => {
  interface Dark { x: number; y: number; born: number; at: number; done: boolean }
  let dark: Dark | null = null;
  const MAX = 250;
  return {
    durationMs: 3200,
    windupMs: 800,
    hold: 'charge',
    tell: 'IT EATS THE LIGHT',
    cast(time) {
      tk.sfx('beam-charge');
      dark = { x: tk.bossX, y: tk.bossY, born: time, at: time + tk.warn(1700), done: false };
    },
    update(time) {
      if (!dark) return;
      const d = dark;
      const p = tk.player;
      if (!d.done) {
        tk.pull(d.x, d.y, tk.hard ? 84 : 70, 120);
        if (time >= d.at) {
          d.done = true;
          tk.sfx('gravity-slam');
          if (dist(d.x, d.y, p.x, p.y) < MAX + PLAYER_R * 0.4) tk.hitPlayer(18, p.x, p.y);
        }
      }
      if (d.done && time > d.at + 600) dark = null;
    },
    drawGround(g, time) {
      if (!dark) return;
      const d = dark;
      if (!d.done) {
        const k = Phaser.Math.Clamp((time - d.born) / Math.max(1, d.at - d.born), 0, 1);
        g.fillStyle(0x000000, 0.25 + 0.4 * k); g.fillCircle(d.x, d.y, MAX * (0.2 + 0.8 * k));
        g.lineStyle(3, LODE_GLINT, 0.6); g.strokeCircle(d.x, d.y, MAX * (0.2 + 0.8 * k));
        g.lineStyle(2, LODE_WASH, 0.35 + 0.4 * k); g.strokeCircle(d.x, d.y, MAX);
        // Light being drawn in: streaks crawling inward from outside the rim.
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const ph = ((time / 500) + i * 0.37) % 1;
          const r0 = MAX + 120 - ph * 140;
          g.lineStyle(2, ENAMEL, 0.5 * (1 - ph));
          g.lineBetween(d.x + Math.cos(a) * r0, d.y + Math.sin(a) * r0, d.x + Math.cos(a) * (r0 - 24), d.y + Math.sin(a) * (r0 - 24));
        }
      } else {
        const q = Phaser.Math.Clamp((time - d.at) / 600, 0, 1);
        g.lineStyle(10 * (1 - q), WHITE, 1 - q); g.strokeCircle(d.x, d.y, MAX * (1 - q));
      }
    },
    onPhaseEnd() { dark = null; },
  };
};

// ── Signature: Hawking Radiation ────────────────────────────────────
// What he swallowed comes back out: three slow shells of pale motes, each
// turned half a step from the last, spaced to walk between.

const hawking = (tk: BossToolkit): SignatureMove => {
  const flares: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'HAWKING RADIATION',
    cast() {
      const n = tk.hard ? 18 : 14;
      const off = Math.random() * Math.PI;
      for (let k = 0; k < 3; k++) {
        tk.schedule(k * 460, () => {
          const x = tk.bossX, y = tk.bossY;
          flares.push({ x, y, at: tk.now });
          tk.sfx('sparkle');
          for (let i = 0; i < n; i++) {
            const a = off + ((i + k * 0.5) / n) * Math.PI * 2;
            tk.spawnBullet({ x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30, angle: a, speed: 150, damage: 8, r: 6, lifeMs: 5200, color: LODE_WASH });
          }
        });
      }
    },
    update(time) {
      while (flares.length && time - flares[0].at > 500) flares.shift();
    },
    drawAir(g, time) {
      for (const f of flares) {
        const q = (time - f.at) / 500;
        g.lineStyle(4 * (1 - q), LODE_WASH, 1 - q); g.strokeCircle(f.x, f.y, 30 + q * 50);
        g.fillStyle(WHITE, 0.5 * (1 - q)); g.fillCircle(f.x, f.y, 12 * (1 - q));
      }
    },
    onPhaseEnd() { flares.length = 0; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const PERIGEE_BOSS: WorldBossDef = {
  worldId: 'isle:perigee',
  name: 'Prince Perigee',
  title: 'The Closest Approach',
  color: LODE_MID,
  colorLit: LODE_GLINT,
  colorDark: LODE,
  accent: BRASS,
  damageMult: 1.15,

  intro: [
    'You have been falling toward me since you landed. Everyone does. I simply wait at the bottom.',
    'Father taxes the breath. I only bring it closer. Closer is heavier, heavier is dearer. Arithmetic.',
  ],
  banter: [
    'Every house in this court comes round to me in the end. I have never once had to go to one.',
    'A link here, a link there. Nobody notices a link. They notice the moon getting bigger.',
    'You can run. Running is only a longer orbit.',
    'The sleepers on my flank do not mind. They turn so peacefully. You would turn peacefully too.',
    'Do you feel heavier? That is me. That is always me.',
    'I do not push. I never push. I only pull, and wait.',
  ],
  defeatLine: 'THE CHAINS GO SLACK',
  resumeLine: 'Back again. Of course you are. Everything comes back round.',

  phases: [
    {
      name: 'Satellite',
      line: 'Round and round. Let us see how close you will let me come.',
      hp: 460,
      cycle: [
        'sig:moonfling', 'volley', 'sig:gravityWell', 'homing', 'sig:closestApproach',
        'radial', 'sig:moonfling', 'hazard', 'sig:gravityWell', 'sig:closestApproach', 'lanes',
      ],
      harass: ['h-orbs', 'h-snipe', 'h-flak'],
      restMs: 1000,
      harassMs: 2900,
    },
    {
      name: 'Freefall',
      line: 'Down is wherever I say it is. Shall we find out which wall you land on?',
      hp: 550,
      cycle: [
        'sig:downshift', 'sig:ballast', 'barrage', 'sig:pendulum', 'sig:downshift',
        'spiral', 'sig:ballast', 'sig:pendulum', 'slamchain',
      ],
      harass: ['h-lane', 'h-mines', 'h-rune'],
      restMs: 900,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'NOTHING ESCAPES THE PERIGEE',
    extraPhase: {
      name: 'Singularity',
      line: 'Closer. Closer than close. There is no light this near me — there is only me.',
      hp: 400,
      cycle: [
        'sig:lightEater', 'sig:accretion', 'sig:hawking', 'quake', 'sig:lightEater',
        'sig:accretion', 'sanctuary', 'sig:hawking',
      ],
      harass: ['h-orbs', 'h-lane', 'h-snipe'],
      restMs: 820,
      harassMs: 2300,
    },
  },

  tuning: {
    homing: { count: 3, speed: 150 },
    hazard: { radius: 58, durationMs: 4000 },
  },

  signatures: {
    moonfling,
    gravityWell,
    closestApproach,
    downshift,
    ballast,
    pendulum,
    accretion,
    lightEater,
    hawking,
  },

  look: {
    crest: 'orbs', pattern: 'rings', aura: 'dust', hands: 'orb',
    torsoR: 34, eyes: 2, eyeColor: LODE_GLINT, mouth: 'line',
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none', tint: 'none' },
    { movement: 'blink', gimmick: 'none', tint: 'cold', look: { crest: 'halo', pattern: 'gears', aura: 'chains', hands: 'gauntlet', torsoR: 36, eyes: 2, mouth: 'grate' } },
    { movement: 'anchor', gimmick: 'gloom', tint: 'void', look: { crest: 'none', pattern: 'smooth', aura: 'none', hands: 'wisp', eyes: 1, mouth: 'none', torsoR: 28 } },
  ],

  /**
   * The silhouette is the orbit. In Satellite, Perigee wears a brass armillary ring tilted round
   * his body like a planet's, and three little black moons wheel round him on it — one always
   * crossing in front of him. In Freefall the ring tumbles loose and points the way "down" is,
   * his cloak streams the other way, and loose brass falls off him toward the down wall. In
   * Singularity there is barely a body: a black point ringed by a blinding accretion disc, light
   * bending round it, and everything near it smeared into streaks.
   */
  drawDecor(g, s: BossBodyState) {
    const R = s.radius;
    const sec = s.t / 1000;
    const phase = s.phaseIdx;

    if (phase === 0) {
      const tilt = -0.35;
      const rx = R * 2.1, ry = R * 0.6;
      // Back half of the ring and the moons behind him.
      const ringPt = (a: number): Pt => {
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        return { x: s.x + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: s.y + ex * Math.sin(tilt) + ey * Math.cos(tilt) };
      };
      const drawArc = (a0: number, a1: number, w: number, c: number, al: number): void => {
        g.lineStyle(w, c, al);
        g.beginPath();
        for (let i = 0; i <= 20; i++) { const p = ringPt(a0 + (a1 - a0) * (i / 20)); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
        g.strokePath();
      };
      drawArc(Math.PI, Math.PI * 2, 4, BRASS_DARK, 0.8);
      drawArc(0, Math.PI, 5, BRASS, 1);
      drawArc(0.2, Math.PI - 0.2, 1.5, BRASS_LIT, 0.8);
      for (let i = 0; i < 3; i++) {
        const a = sec * 1.1 + (i / 3) * Math.PI * 2;
        const p = ringPt(a);
        const front = Math.sin(a) > 0;
        lodestone(g, p.x, p.y - 2, (front ? 9 : 7) + s.castGlow * 2, sec, front ? 1 : 0.7);
      }
      // The perigee sigil on his chest: a dot riding a long ellipse.
      g.lineStyle(1.5, LODE_WASH, 0.7); g.strokeEllipse(s.x, s.y + R * 0.15, R * 0.9, R * 0.36);
      g.fillStyle(LODE_WASH, 1); g.fillCircle(s.x + R * 0.42, s.y + R * 0.15, 2.5);
    } else if (phase === 1) {
      const d = DOWN.a;
      // Cloak streaming up away from down.
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * R * 0.32;
        const nx = -Math.sin(d), ny = Math.cos(d);
        const len = R * (1.6 + 0.4 * Math.sin(sec * 6 + i));
        g.lineStyle(R * 0.28, NAVY, 0.85);
        g.lineBetween(s.x + nx * off, s.y + ny * off, s.x + nx * off - Math.cos(d) * len, s.y + ny * off - Math.sin(d) * len);
        g.lineStyle(2, NAVY_LIT, 0.6);
        g.lineBetween(s.x + nx * off, s.y + ny * off, s.x + nx * off - Math.cos(d) * len * 0.9, s.y + ny * off - Math.sin(d) * len * 0.9);
      }
      // The ring, tumbling loose round him.
      g.lineStyle(4, BRASS, 0.95); g.strokeEllipse(s.x, s.y, R * 2.4, R * (0.5 + 0.4 * Math.abs(Math.sin(sec * 2))));
      // An arrow over him: this way is down.
      arrow(g, s.x - Math.cos(d) * R * 0.4, s.y - R * 1.6 - Math.sin(d) * R * 0.4, d, R * 0.8, BRASS_LIT, 0.95, 3);
      // Brass bits shaken loose, falling down.
      for (let i = 0; i < 6; i++) {
        const ph = (sec * 0.9 + i / 6) % 1;
        const side = ((i * 37) % 7 - 3) / 3;
        const x = s.x - Math.sin(d) * side * R + Math.cos(d) * ph * R * 3;
        const y = s.y + Math.cos(d) * side * R + Math.sin(d) * ph * R * 3;
        gear(g, x, y, 4, 8, i % 2 ? BRASS : COPPER, sec * 4 + i, 1 - ph);
      }
    } else {
      // The accretion disc, back half first.
      g.lineStyle(8, LODE_GLINT, 0.5);
      g.beginPath(); g.arc(s.x, s.y, R * 2.4, Math.PI, Math.PI * 2, false); g.strokePath();
      for (let i = 0; i < 4; i++) {
        g.lineStyle(3 - i * 0.5, i % 2 ? LAMPLIGHT : LODE_WASH, 0.75 - i * 0.12);
        g.strokeEllipse(s.x, s.y, R * (3 + i * 0.5), R * (0.8 + i * 0.12));
      }
      // The point: a hole where his body was, light bending round it.
      g.fillStyle(LODE_WASH, 0.25 + s.castGlow * 0.3); g.fillCircle(s.x, s.y, R * 1.15);
      g.fillStyle(0x000000, 1); g.fillCircle(s.x, s.y, R * 0.95);
      g.lineStyle(2, WHITE, 0.9); g.strokeCircle(s.x, s.y, R * 0.97);
      // The front of the disc crossing over the hole.
      g.lineStyle(5, LAMPLIGHT, 0.85);
      g.beginPath(); g.arc(s.x, s.y + R * 0.05, R * 1.6, 0.15, Math.PI - 0.15, false); g.strokePath();
      // Streaks of things being pulled in.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + sec * 0.6;
        const ph = (sec * 1.2 + i * 0.29) % 1;
        const r0 = R * (3.2 - ph * 2);
        g.lineStyle(2, ENAMEL, 0.6 * (1 - ph));
        g.lineBetween(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0 * 0.6, s.x + Math.cos(a - 0.3) * (r0 - 16), s.y + Math.sin(a - 0.3) * (r0 - 16) * 0.6);
      }
    }
    if (s.hurt) { g.lineStyle(3, LODE_WASH, 0.8); g.strokeCircle(s.x, s.y, R * 1.3); }
  },

  /**
   * The Prince's floor is the observatory hall of the Periapsis: polished navy stone pricked with
   * brass star-studs in their constellations, the whole of it one great inlaid orrery — the seven
   * elliptical orbits of the court's islets in brass, each with its islet's little planet riding
   * it, all of them pinched in toward a black lodestone plate in the middle. A slot of moonlight
   * from the open dome falls across the floor, and the tall windows at the edges glow violet.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x9e71);
    const cx = W / 2, cy = (FIELD_TOP + H) / 2 + 6;
    g.fillStyle(NAVY_DARK, 1); g.fillRect(0, 0, W, H);
    // Polished slabs, faint.
    for (let x = 0; x < W; x += 80) for (let y = FIELD_TOP; y < H; y += 80) {
      g.fillStyle(rng() < 0.5 ? NAVY : NAVY_DARK, 0.5); g.fillRect(x + 1, y + 1, 78, 78);
    }
    // Star-studs in loose constellations, joined by fine brass lines.
    for (let c = 0; c < 7; c++) {
      const sx = rng() * W, sy = FIELD_TOP + rng() * (H - FIELD_TOP);
      let px = sx, py = sy;
      for (let k = 0; k < 4; k++) {
        const nx = Phaser.Math.Clamp(px + (rng() - 0.5) * 120, 10, W - 10), ny = Phaser.Math.Clamp(py + (rng() - 0.5) * 90, FIELD_TOP + 10, H - 10);
        g.lineStyle(1, BRASS_DARK, 0.6); g.lineBetween(px, py, nx, ny);
        g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(nx, ny, 2);
        px = nx; py = ny;
      }
    }
    for (let i = 0; i < 120; i++) { g.fillStyle(BRASS_LIT, 0.3 + rng() * 0.5); g.fillCircle(rng() * W, FIELD_TOP + rng() * (H - FIELD_TOP), 0.8 + rng()); }
    // The inlaid orrery: seven orbits pinched toward the lodestone plate, each with its planet.
    const cols = [BRASS, COPPER, VERD, BRASS, COPPER, VERD, BRASS];
    for (let i = 0; i < 7; i++) {
      const rx = 70 + i * 58, ry = 34 + i * 34;
      const off = i * 8;
      g.lineStyle(3, BRASS_DARK, 0.9); g.strokeEllipse(cx + off, cy, rx * 2, ry * 2);
      g.lineStyle(1, BRASS_LIT, 0.45); g.strokeEllipse(cx + off, cy - 1, rx * 2, ry * 2);
      const a = rng() * Math.PI * 2;
      planet(g, cx + off + Math.cos(a) * rx, cy + Math.sin(a) * ry, 5 + (i % 3), cols[i], i === 6, 0.9);
    }
    dashedEllipse(g, cx, cy, 460, 262, 60, 0, 2, BRASS, 0.4);
    g.fillStyle(LODE_SHEEN, 0.35); g.fillCircle(cx, cy, 52);
    lodestone(g, cx, cy, 34, 0, 1);
    // The slot of moonlight from the dome.
    g.fillStyle(LODE_WASH, 0.05);
    g.fillPoints([new Phaser.Geom.Point(W * 0.18, FIELD_TOP), new Phaser.Geom.Point(W * 0.3, FIELD_TOP), new Phaser.Geom.Point(W * 0.72, H), new Phaser.Geom.Point(W * 0.55, H)], true, true);
    // Tall violet windows along the side walls.
    for (let i = 0; i < 4; i++) {
      const y = FIELD_TOP + 50 + i * ((H - FIELD_TOP - 100) / 3);
      for (const x of [10, W - 10]) {
        g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 8, y - 40, 16, 70, { tl: 8, tr: 8, bl: 0, br: 0 });
        g.fillStyle(LODE_GLINT, 0.7); g.fillRoundedRect(x - 5, y - 37, 10, 64, { tl: 5, tr: 5, bl: 0, br: 0 });
        g.fillStyle(LODE_GLINT, 0.06); g.fillCircle(x, y, 60);
      }
    }
    g.lineStyle(3, BRASS_DARK, 0.7); g.strokeRect(6, FIELD_TOP - 4, W - 12, H - FIELD_TOP - 2);
  },
};
