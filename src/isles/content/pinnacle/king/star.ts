import type Phaser from 'phaser';
import type { BossEntry, SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { OBS, councilMask, lit, mixC } from '../../../art/PinnacleArt';
import type { KingPart } from './contract';
import { BANDS, CX, CY, STAR_R, activeSky, lightReach, planetPos, skyOf, type Planet } from './starSky';
import { COLD, RING_DUST, SHADE, TAU, clamp, drawRings, drawSpace, drawStar, shadowPoly, sm } from './starArt';
import { KING_OUTRO as OUTRO_ENTRY, STAR_ENTRY } from './starCine';

/**
 * THE OBSIDIAN KING — Act III, THE STAR UNSHELLED (phase index 2, pool 1300).
 *
 * The hall is gone. Seen from above the pole, he burns at the centre of his own rings — the
 * thing that fell into the sea, with the King's face — and the fight is on the ring disc round
 * him. Two worlds ride round him: Ashfall (small, molten, near) and the Crownworld (a gas giant,
 * far). They bruise you if you walk into them, and they throw shadow across the ring away from
 * him — the only shelter there is from his light. The band just outside his surface burns.
 *
 *   THE ORRERY         — each world's orbit lights up in turn, then that world races one lap.
 *                        Step out of the lit lane; step back when the other one lights.
 *   SOLAR FLARE        — a flare sweeps two-thirds of the way round him. Its reach is marked;
 *                        get beyond it (the far east / west of the ring), into a world's shadow
 *                        (the flare is cut off by planets), or dash through it.
 *   METEOR SHOWER      — a shower streams in from one quarter of the sky onto marked craters.
 *   EVENT HORIZON      — a black hole opens on the ring near you, drags you and the ring's ice
 *                        toward it, and collapses: walk out against the pull, clear of its ring.
 *   COMETS             — comets swing round him on true gravity: their whole path is drawn
 *                        before they come. Their dust tails slow.
 *   THE RINGS BREAK    — alternate ring bands detonate, then the others: hop band to band.
 *   THE CONSTELLATION  — stars light, join into the Crown / the Sword / the Mask, and the lines fire.
 *   THE LAST OF THE SHELL — the shell fragments that orbit him (masks, still) leave and fire the
 *                        mask's violet slit through where you stood when they locked.
 *   SUPERNOVA          — the worlds stop and line up; everything not in a world's shadow is
 *                        burned. Afterwards he is spent — dim, and open to harm.
 */

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

const PLAYER_R = 20;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
/** Act III is being fought (not the entry, not the fall, not another act). */
const live = (tk: BossToolkit): boolean => tk.fighting && tk.phase === 2;
/** The player, if they can be hurt. */
const target = (tk: BossToolkit) => {
  const p = tk.player;
  return p.active && p.hp > 0 ? p : null;
};
/** A chevron pointing along `a`. */
function chevron(g: G, x: number, y: number, a: number, s: number, color: number, alpha: number): void {
  g.lineStyle(2, color, alpha);
  g.lineBetween(x, y, x + Math.cos(a + Math.PI - 0.6) * s, y + Math.sin(a + Math.PI - 0.6) * s);
  g.lineBetween(x, y, x + Math.cos(a + Math.PI + 0.6) * s, y + Math.sin(a + Math.PI + 0.6) * s);
}
/** A tapered beam from r0 to r1 along `a` out of the star, three layers. */
function starBeam(g: G, a: number, r0: number, r1: number, w: number, alpha: number, c0: number, c1: number): void {
  const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
  const q = (r: number, o: number): P => ({ x: CX + Math.cos(a) * r + px * o, y: CY + Math.sin(a) * r + py * o });
  const layer = (ww: number, c: number, al: number): void => {
    g.fillStyle(c, al * alpha);
    g.fillPoints([q(r0, ww * 0.7), q(r1 - ww * 0.4, ww), q(r1 + ww * 0.6, 0), q(r1 - ww * 0.4, -ww), q(r0, -ww * 0.7)], true);
  };
  layer(w * 1.6, c0, 0.28);
  layer(w, c1, 0.6);
  layer(w * 0.32, 0xffffff, 0.95);
}

// ── THE ORRERY ───────────────────────────────────────────────────────
// Each world's lane round him lights up, chevrons marching the way it turns; then the world
// races one whole lap in 1.7 s. Stand off the lit lane — the other lane is safe until it lights.

const orrery = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  interface Lap { p: Planet; lightAt: number; goAt: number; started: boolean }
  let laps: Lap[] = [];
  return {
    durationMs: 6600,
    windupMs: 800,
    gesture: 'raise',
    tell: 'THE ORRERY',
    cast(time) {
      const order = Math.random() < 0.5 ? [...sky.planets] : [...sky.planets].reverse();
      const gap = tk.warn(800);
      laps = order.map((p, i) => {
        const lightAt = time + i * (gap + 1900);
        return { p, lightAt, goAt: lightAt + gap, started: false };
      });
      tk.sfx('gear-turn');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      for (const l of laps) {
        if (!l.started && time >= l.goAt) { l.started = true; sky.race(l.p); tk.sfx('tornado'); }
      }
      laps = laps.filter((l) => !l.started || l.p.race > 0);
    },
    drawGround(g, time) {
      for (const l of laps) {
        if (time < l.lightAt) continue;
        const p = l.p;
        const k = l.started ? 1 : clamp((time - l.lightAt) / Math.max(1, l.goAt - l.lightAt), 0, 1);
        const hot = p.kind === 'ash' ? 0xff7a3a : 0xc8a8ff;
        const reach = p.r + PLAYER_R;
        g.lineStyle(reach * 2, hot, 0.05 + 0.13 * k);
        g.strokeCircle(CX, CY, p.orbit);
        const blink = !l.started && k > 0.7 && Math.floor(time / 90) % 2 === 0;
        g.lineStyle(2, blink ? 0xffffff : lit(hot, 0.4), 0.3 + 0.5 * k);
        g.strokeCircle(CX, CY, p.orbit - reach);
        g.strokeCircle(CX, CY, p.orbit + reach);
        const dir = Math.sign(p.omega);
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU + dir * (time / 1000) * (0.5 + 2.5 * k);
          chevron(g, CX + Math.cos(a) * p.orbit, CY + Math.sin(a) * p.orbit, a + dir * Math.PI / 2, 8, lit(hot, 0.5), 0.25 + 0.5 * k);
        }
      }
    },
    onPhaseEnd() { laps = []; sky.reset(); },
  };
};

// ── SOLAR FLARE ──────────────────────────────────────────────────────
// A prominence swells on his limb, the swept sector and its reach are marked, and a flare sweeps
// 206° round him. The planets cut it off: their shadows are safe. So is anywhere past its reach,
// and a dash through it.

const solarFlare = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const SWEEP = 3.6, L = 310, HALF = 30, SWEEP_MS = 1700;
  interface Flare { a0: number; dir: number; born: number; startAt: number; prev: number; hit: boolean; fired: boolean }
  let flares: Flare[] = [];
  const angleAt = (f: Flare, time: number): number => f.a0 + f.dir * SWEEP * clamp((time - f.startAt) / SWEEP_MS, 0, 1);
  return {
    durationMs: 3300,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'SOLAR FLARE',
    cast(time) {
      const a = tk.angleToPlayer(CX, CY);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const startAt = time + tk.warn(850);
      flares = [{ a0: a - dir * 1.7, dir, born: time, startAt, prev: a - dir * 1.7, hit: false, fired: false }];
      if (tk.hard) flares.push({ a0: a - dir * 1.7 + Math.PI, dir, born: time, startAt, prev: a - dir * 1.7 + Math.PI, hit: false, fired: false });
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      const p = target(tk);
      for (const f of flares) {
        if (time < f.startAt) continue;
        if (!f.fired) { f.fired = true; tk.sfx('inferno'); }
        const cur = angleAt(f, time);
        if (p && !f.hit && time <= f.startAt + SWEEP_MS) {
          const d = dist(p.x, p.y, CX, CY);
          if (d < L + PLAYER_R && !tk.playerDashing() && !sky.inShadow(p.x, p.y)) {
            const pad = Math.asin(Math.min(1, (HALF + PLAYER_R) / Math.max(d, HALF + PLAYER_R)));
            const midA = f.prev + (cur - f.prev) / 2;
            if (Math.abs(wrap(Math.atan2(p.y - CY, p.x - CX) - midA)) <= Math.abs(cur - f.prev) / 2 + pad) {
              f.hit = true;
              tk.hitPlayer(16, p.x, p.y);
              tk.sfx('flame-burst');
            }
          }
        }
        f.prev = cur;
      }
      flares = flares.filter((f) => time < f.startAt + SWEEP_MS + 600);
    },
    drawGround(g, time) {
      for (const f of flares) {
        const a1 = f.a0 + f.dir * SWEEP;
        if (time < f.startAt) {
          const k = clamp((time - f.born) / Math.max(1, f.startAt - f.born), 0, 1);
          g.fillStyle(OBS.starDeep, 0.05 + 0.1 * k);
          g.beginPath(); g.slice(CX, CY, L, f.a0, a1, f.dir < 0); g.fillPath();
          g.lineStyle(2.5, OBS.star, 0.35 + 0.45 * k);
          g.beginPath(); g.arc(CX, CY, L, f.a0, a1, f.dir < 0); g.strokePath();
          g.lineStyle(3, 0xffffff, 0.3 + 0.6 * k);
          g.lineBetween(CX + Math.cos(f.a0) * STAR_R, CY + Math.sin(f.a0) * STAR_R, CX + Math.cos(f.a0) * L, CY + Math.sin(f.a0) * L);
          for (let i = 0; i < 9; i++) {
            const a = f.a0 + f.dir * SWEEP * (((i / 9) + time / 2400) % 1);
            chevron(g, CX + Math.cos(a) * (L - 22), CY + Math.sin(a) * (L - 22), a + f.dir * Math.PI / 2, 9, OBS.star, 0.6 * k);
          }
        } else {
          // Scorched where it has been.
          const cur = angleAt(f, time);
          const fade = 1 - clamp((time - f.startAt - SWEEP_MS) / 600, 0, 1);
          g.fillStyle(OBS.starDeep, 0.1 * fade);
          g.beginPath(); g.slice(CX, CY, L, f.a0, cur, f.dir < 0); g.fillPath();
        }
      }
    },
    drawAir(g, time) {
      for (const f of flares) {
        if (time < f.startAt) {
          // The prominence swelling on his limb where the flare will leave.
          const k = clamp((time - f.born) / Math.max(1, f.startAt - f.born), 0, 1);
          const pts: P[] = [];
          for (let i = 0; i <= 12; i++) {
            const u = i / 12;
            const a = f.a0 - 0.3 + u * 0.6;
            const r = STAR_R + Math.sin(u * Math.PI) * (20 + 60 * k) + Math.sin(time / 60 + i) * 3;
            pts.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
          }
          g.lineStyle(14, OBS.starDeep, 0.5); g.strokePoints(pts);
          g.lineStyle(5, OBS.starCore, 0.9); g.strokePoints(pts);
          continue;
        }
        if (time > f.startAt + SWEEP_MS) continue;
        const cur = angleAt(f, time);
        const reach = lightReach(sky.planets, cur, L);
        const flick = 1 + Math.sin(time / 30) * 0.08;
        starBeam(g, cur, STAR_R * 0.9, reach, HALF * flick, 1, OBS.starDeep, OBS.star);
        // Plasma knots riding out along it.
        for (let i = 0; i < 6; i++) {
          const r = STAR_R + ((time / 4 + i * 40) % (reach - STAR_R));
          g.fillStyle(0xffffff, 0.7); g.fillCircle(CX + Math.cos(cur) * r, CY + Math.sin(cur) * r, 4);
        }
        // Where a world stops it: a splash of fire on its lit face.
        if (reach < L - 1) {
          const sx = CX + Math.cos(cur) * reach, sy = CY + Math.sin(cur) * reach;
          g.fillStyle(OBS.star, 0.45); g.fillCircle(sx, sy, 22);
          g.fillStyle(0xffffff, 0.8); g.fillCircle(sx, sy, 9);
        } else {
          g.fillStyle(OBS.starDeep, 0.35); g.fillCircle(CX + Math.cos(cur) * L, CY + Math.sin(cur) * L, 26 * flick);
        }
      }
    },
    onPhaseEnd() { flares = []; },
  };
};

// ── METEOR SHOWER ────────────────────────────────────────────────────
// A shower out of one quarter of the sky: every stone's crater is ringed before it lands, and a
// third of them are aimed where you stand as they are loosed.

const meteorShower = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const BLAST = 40;
  interface Rock { born: number; landAt: number; x: number; y: number; placed: boolean; aimed: boolean; done: boolean }
  let rocks: Rock[] = [];
  let craters: { x: number; y: number; at: number }[] = [];
  let src = -Math.PI / 2;
  let lastHit = -1e9;
  return {
    durationMs: 3800,
    windupMs: 750,
    gesture: 'raise',
    tell: 'METEOR SHOWER',
    cast(time) {
      src = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const n = tk.hard ? 24 : 18;
      rocks = [];
      for (let i = 0; i < n; i++) {
        const born = time + i * 120;
        rocks.push({ born, landAt: born + tk.warn(620), x: 0, y: 0, placed: false, aimed: i % 3 === 0, done: false });
      }
      tk.sfx('meteor');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      const p = tk.player;
      for (const r of rocks) {
        if (!r.placed && time >= r.born) {
          r.placed = true;
          if (r.aimed) {
            r.x = tk.clampX(p.x + (Math.random() - 0.5) * 60);
            r.y = tk.clampY(p.y + (Math.random() - 0.5) * 60);
          } else {
            for (let tries = 0; tries < 12; tries++) {
              r.x = 60 + Math.random() * 840; r.y = 130 + Math.random() * 470;
              if (dist(r.x, r.y, CX, CY) > 130) break;
            }
          }
        }
        if (r.placed && !r.done && time >= r.landAt) {
          r.done = true;
          craters.push({ x: r.x, y: r.y, at: time });
          tk.boom(r.x, r.y, BLAST + 6, 0xffb070);
          tk.sfx(r.aimed ? 'meteor' : 'explosion-small');
          const t = target(tk);
          if (t && dist(t.x, t.y, r.x, r.y) < BLAST + PLAYER_R * 0.6 && time > lastHit + 250) {
            lastHit = time;
            tk.hitPlayer(10, t.x, t.y);
          }
        }
      }
      rocks = rocks.filter((r) => !r.done);
      craters = craters.filter((c) => time < c.at + 900);
    },
    drawGround(g, time) {
      for (const r of rocks) {
        if (!r.placed) continue;
        const k = clamp((time - r.born) / Math.max(1, r.landAt - r.born), 0, 1);
        g.fillStyle(OBS.starDeep, 0.06 + 0.2 * k); g.fillCircle(r.x, r.y, BLAST);
        g.lineStyle(2, k > 0.8 && Math.floor(time / 70) % 2 ? 0xffffff : OBS.star, 0.5 + 0.4 * k); g.strokeCircle(r.x, r.y, BLAST);
        g.lineStyle(1.5, OBS.starCore, 0.6); g.strokeCircle(r.x, r.y, BLAST * (1 - k) + 3);
        g.lineStyle(1, OBS.star, 0.4);
        g.lineBetween(r.x - 10, r.y, r.x + 10, r.y); g.lineBetween(r.x, r.y - 10, r.x, r.y + 10);
      }
      for (const c of craters) {
        const f = (time - c.at) / 900;
        g.fillStyle(0x1a0a06, 0.6 * (1 - f)); g.fillCircle(c.x, c.y, 18);
        g.lineStyle(3, 0xff7a2a, 0.8 * (1 - f)); g.strokeCircle(c.x, c.y, 18 + f * 10);
        g.fillStyle(0xffa050, 0.4 * (1 - f)); g.fillCircle(c.x, c.y, 8);
      }
    },
    drawAir(g, time) {
      const dx = Math.cos(src), dy = Math.sin(src);
      for (const r of rocks) {
        if (!r.placed) continue;
        const k = clamp((time - r.born) / Math.max(1, r.landAt - r.born), 0, 1);
        const far = 760 * Math.pow(1 - k, 1.3);
        const hx = r.x + dx * far, hy = r.y + dy * far;
        const tail = 70 + 60 * k;
        g.lineStyle(9, 0xff7a2a, 0.22); g.lineBetween(hx, hy, hx + dx * tail, hy + dy * tail);
        g.lineStyle(4, OBS.star, 0.6); g.lineBetween(hx, hy, hx + dx * tail * 0.7, hy + dy * tail * 0.7);
        g.lineStyle(1.5, 0xc8a8ff, 0.5); g.lineBetween(hx + 3, hy, hx + 3 + dx * tail * 1.2, hy + dy * tail * 1.2);
        g.fillStyle(OBS.star, 0.35); g.fillCircle(hx, hy, 10);
        g.fillStyle(0xffffff, 1); g.fillCircle(hx, hy, 4.5);
      }
    },
    onPhaseEnd() { rocks = []; craters = []; },
  };
};

// ── EVENT HORIZON ────────────────────────────────────────────────────
// A black hole opens on the ring a little way from you. It drags you (slower than you walk) and
// the ring's ice toward it; the ice that falls past can strike you; touching the horizon hurts and
// spits you out. Then it collapses — everything within its marked ring is struck.

const eventHorizon = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const HORIZON = 30, COLLAPSE_R = 165, PULL_MS = 5000;
  interface Hole { x: number; y: number; born: number; openAt: number; pullTo: number; collapseAt: number; goneAt: number; collapsed: boolean }
  interface Bit { r: number; a: number; w: number; size: number; hit: boolean; tone: number }
  let hole: Hole | null = null;
  let bits: Bit[] = [];
  let spawnAcc = 0;
  let lastHorizon = -1e9;
  const place = (): P => {
    const p = tk.player;
    const pa = Math.atan2(p.y - CY, p.x - CX);
    for (let tries = 0; tries < 24; tries++) {
      const a = pa + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
      const d = 270 + Math.random() * 90;
      const x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d;
      if (x > 120 && x < 840 && y > 170 && y < 580 && dist(x, y, p.x, p.y) > 200) return { x, y };
    }
    return { x: p.x < CX ? 820 : 140, y: p.y < CY ? 520 : 200 };
  };
  return {
    durationMs: 7600,
    windupMs: 800,
    gesture: 'clap',
    tell: 'EVENT HORIZON',
    cast(time) {
      const at = place();
      const openAt = time + tk.warn(700);
      const pullTo = openAt + PULL_MS;
      const collapseAt = pullTo + tk.warn(750);
      hole = { x: at.x, y: at.y, born: time, openAt, pullTo, collapseAt, goneAt: collapseAt + 600, collapsed: false };
      bits = [];
      tk.sfx('portal');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk) || !hole) return;
      const h = hole;
      const p = target(tk);
      if (time >= h.openAt && time < h.pullTo) {
        sky.hole = { x: h.x, y: h.y, k: sm(time, h.openAt, h.openAt + 700) };
        if (p) tk.pull(h.x, h.y, 105, 160);
        spawnAcc += dt;
        while (spawnAcc > 0.12) {
          spawnAcc -= 0.12;
          bits.push({ r: 300 + Math.random() * 140, a: Math.random() * TAU, w: 0.8 + Math.random() * 0.6, size: 3 + Math.random() * 4, hit: false, tone: Math.random() });
        }
        if (Math.floor(time / 900) !== Math.floor((time - dt * 1000) / 900)) tk.sfx('magnet-pull');
      } else if (time >= h.pullTo && !h.collapsed) {
        sky.hole = { x: h.x, y: h.y, k: 1 - sm(time, h.pullTo, h.collapseAt) };
      }
      for (const b of bits) {
        b.a += b.w * dt * (1 + 120 / b.r);
        b.r -= (50 + 9000 / b.r) * dt;
        if (p && !b.hit) {
          const bx = h.x + Math.cos(b.a) * b.r, by = h.y + Math.sin(b.a) * b.r;
          if (dist(bx, by, p.x, p.y) < PLAYER_R + b.size) { b.hit = true; tk.hitPlayer(5, p.x, p.y); tk.sfx('hit-light'); }
        }
      }
      bits = bits.filter((b) => b.r > HORIZON - 4 && !b.hit);
      if (p && time >= h.openAt && !h.collapsed) {
        const d = dist(p.x, p.y, h.x, h.y);
        if (d < HORIZON + PLAYER_R && time > lastHorizon + 900) {
          lastHorizon = time;
          tk.hitPlayer(13, p.x, p.y);
          const a = d > 0.01 ? Math.atan2(p.y - h.y, p.x - h.x) : Math.random() * TAU;
          p.x = clamp(h.x + Math.cos(a) * (HORIZON + PLAYER_R + 90), 40, tk.W - 40);
          p.y = clamp(h.y + Math.sin(a) * (HORIZON + PLAYER_R + 90), 116, tk.H - 40);
          tk.sfx('snap-back');
        }
      }
      if (!h.collapsed && time >= h.collapseAt) {
        h.collapsed = true;
        sky.hole = null;
        bits = [];
        tk.boom(h.x, h.y, COLLAPSE_R, 0xffffff);
        tk.boom(h.x, h.y, COLLAPSE_R * 0.6, OBS.seam);
        tk.sfx('gravity-slam');
        tk.scene.cameras.main.shake(280, 0.008);
        if (p && dist(p.x, p.y, h.x, h.y) < COLLAPSE_R + PLAYER_R * 0.5) tk.hitPlayer(16, p.x, p.y);
      }
      if (time >= h.goneAt) { hole = null; sky.hole = null; }
    },
    drawGround(g, time) {
      const h = hole;
      if (!h) return;
      if (time < h.openAt) {
        const k = clamp((time - h.born) / Math.max(1, h.openAt - h.born), 0, 1);
        g.lineStyle(2, OBS.seam, 0.4 + 0.5 * k); g.strokeCircle(h.x, h.y, 60 * (1 - k) + HORIZON);
        g.fillStyle(0x000000, 0.8 * k); g.fillCircle(h.x, h.y, HORIZON * k);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + time / 300;
          g.lineStyle(1.5, OBS.seamLit, 0.5 * k);
          g.lineBetween(h.x + Math.cos(a) * 90, h.y + Math.sin(a) * 90, h.x + Math.cos(a + 0.6) * 40, h.y + Math.sin(a + 0.6) * 40);
        }
        return;
      }
      if (h.collapsed) {
        const f = clamp((time - h.collapseAt) / 600, 0, 1);
        g.lineStyle(6 * (1 - f) + 1, 0xffffff, 1 - f); g.strokeCircle(h.x, h.y, COLLAPSE_R * (0.6 + f * 0.6));
        return;
      }
      const strength = time < h.pullTo ? sm(time, h.openAt, h.openAt + 700) : 1 - 0.6 * sm(time, h.pullTo, h.collapseAt);
      // The pull: rings drawn inward.
      for (let i = 0; i < 5; i++) {
        const f = ((time / 1400) + i / 5) % 1;
        g.lineStyle(1.5, OBS.seamLit, 0.22 * (1 - f) * strength); g.strokeCircle(h.x, h.y, HORIZON + (1 - f) * 260);
      }
      // The accretion disk: three arms spiralling in, dust to fire to white.
      for (let arm = 0; arm < 3; arm++) {
        const pts: P[] = [];
        for (let i = 0; i <= 22; i++) {
          const f = i / 22;
          const r = 150 - f * (150 - HORIZON - 4);
          const a = arm * (TAU / 3) + time / 380 + f * 3.4;
          pts.push({ x: h.x + Math.cos(a) * r * strength, y: h.y + Math.sin(a) * r * strength });
        }
        for (let i = 1; i < pts.length; i++) {
          const f = i / pts.length;
          g.lineStyle(2 + f * 5, mixC(mixC(RING_DUST, OBS.starDeep, Math.min(1, f * 1.6)), 0xffffff, Math.max(0, f - 0.6) * 2.2), (0.25 + f * 0.6) * strength);
          g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        }
      }
      g.fillStyle(OBS.starDeep, 0.15 * strength); g.fillCircle(h.x, h.y, HORIZON + 26);
      g.lineStyle(1, 0xffffff, 0.35); g.strokeCircle(h.x, h.y, HORIZON + 16);
      g.fillStyle(0x000000, 1); g.fillCircle(h.x, h.y, HORIZON);
      g.lineStyle(2.5, 0xffffff, 0.9); g.strokeCircle(h.x, h.y, HORIZON + 1.5);
      // The collapse ring.
      if (time >= h.pullTo) {
        const k = clamp((time - h.pullTo) / Math.max(1, h.collapseAt - h.pullTo), 0, 1);
        g.fillStyle(0xffffff, 0.05 + 0.15 * k); g.fillCircle(h.x, h.y, COLLAPSE_R);
        g.lineStyle(3, k > 0.75 && Math.floor(time / 80) % 2 ? 0xffffff : OBS.seamLit, 0.5 + 0.5 * k); g.strokeCircle(h.x, h.y, COLLAPSE_R);
      }
    },
    drawAir(g) {
      const h = hole;
      if (!h) return;
      for (const b of bits) {
        const x = h.x + Math.cos(b.a) * b.r, y = h.y + Math.sin(b.a) * b.r;
        const ta = b.a - 0.25;
        const c = b.tone < 0.6 ? 0xe8d7a8 : b.tone < 0.85 ? RING_DUST : OBS.edge;
        g.lineStyle(b.size * 0.7, c, 0.35);
        g.lineBetween(x, y, h.x + Math.cos(ta) * (b.r + 14), h.y + Math.sin(ta) * (b.r + 14));
        g.fillStyle(c, 0.95); g.fillCircle(x, y, b.size);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 1, y - 1, b.size * 0.35);
      }
    },
    onPhaseEnd() { hole = null; bits = []; sky.hole = null; },
  };
};

// ── COMETS ───────────────────────────────────────────────────────────
// Comets swing round him on real gravity (integrated as they are loosed, so the drawn path is
// exactly the path). Their heads strike; the dust tail they leave hangs on the ring and slows.

const GM = 1.2e7;
const STEP = 1 / 60;
/** A comet's whole path: in from 600 px out, swung round him, out past the edge. */
function cometPath(base: number, side: number): P[] {
  for (let tries = 0; tries < 12; tries++) {
    const th = base + tries * 0.53;
    let x = CX + Math.cos(th) * 600, y = CY + Math.sin(th) * 600;
    const ang = th + Math.PI + side * (0.42 + Math.random() * 0.1);
    let vx = Math.cos(ang) * 320, vy = Math.sin(ang) * 320;
    const pts: P[] = [{ x, y }];
    let minD = 1e9, entered = false, ok = false;
    for (let i = 0; i < 480; i++) {
      const dx = x - CX, dy = y - CY;
      const d = Math.hypot(dx, dy);
      minD = Math.min(minD, d);
      if (d < 150) break;
      const a = GM / (d * d * d);
      vx -= dx * a * STEP; vy -= dy * a * STEP;
      x += vx * STEP; y += vy * STEP;
      pts.push({ x, y });
      if (x > 0 && x < 960 && y > 96 && y < 640) entered = true;
      else if (entered && (x < -120 || x > 1080 || y < -120 || y > 760)) { ok = true; break; }
    }
    if (ok && minD >= 150) return pts;
  }
  const y = Math.random() < 0.5 ? 150 : 590;
  return Array.from({ length: 220 }, (_, i) => ({ x: -100 + i * 5.5, y }));
}

const comets = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const HEAD = 16, TAIL = 54;
  interface Comet { pts: P[]; born: number; goAt: number; hit: boolean }
  let list: Comet[] = [];
  const idxAt = (c: Comet, time: number): number => Math.floor((time - c.goAt) / (STEP * 1000));
  return {
    durationMs: 4600,
    windupMs: 750,
    gesture: 'point',
    tell: 'COMETS',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const base = Math.random() * TAU;
      list = [];
      for (let i = 0; i < n; i++) {
        const born = time + i * 650;
        list.push({ pts: cometPath(base + (i * TAU) / n, i % 2 ? 1 : -1), born, goAt: born + tk.warn(900), hit: false });
      }
      tk.sfx('whoosh');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      const p = target(tk);
      for (const c of list) {
        const idx = idxAt(c, time);
        if (idx === 0) tk.sfx('ice-shard');
        if (!p || idx < 0) continue;
        if (idx < c.pts.length && !c.hit) {
          const h = c.pts[idx];
          if (dist(h.x, h.y, p.x, p.y) < HEAD + PLAYER_R) { c.hit = true; tk.hitPlayer(15, p.x, p.y); tk.sfx('ice-shatter'); }
        }
        for (let j = Math.max(0, idx - TAIL); j < Math.min(idx, c.pts.length); j += 3) {
          if (dist(c.pts[j].x, c.pts[j].y, p.x, p.y) < 24) { tk.slowPlayer(0.6, 350); break; }
        }
      }
      list = list.filter((c) => idxAt(c, time) < c.pts.length + TAIL + 30);
    },
    drawGround(g, time) {
      for (const c of list) {
        if (time < c.born) continue;
        const idx = idxAt(c, time);
        const k = clamp((time - c.born) / Math.max(1, c.goAt - c.born), 0, 1);
        // The path, dotted, from the head onward.
        for (let j = Math.max(0, idx); j < c.pts.length; j += 5) {
          const blink = idx < 0 && k > 0.75 && Math.floor(time / 90) % 2 === 0;
          g.fillStyle(blink ? 0xffffff : COLD, (0.25 + 0.5 * k) * (j % 15 === 0 ? 1 : 0.6));
          g.fillCircle(c.pts[j].x, c.pts[j].y, j % 15 === 0 ? 3 : 1.8);
        }
        // The dust it leaves on the ring.
        for (let j = Math.max(0, idx - TAIL); j < Math.min(idx, c.pts.length); j += 2) {
          const f = (idx - j) / TAIL;
          g.fillStyle(0xd8e8ff, 0.18 * (1 - f)); g.fillCircle(c.pts[j].x, c.pts[j].y, 16 * (1 - f * 0.4));
        }
      }
    },
    drawAir(g, time) {
      for (const c of list) {
        const idx = idxAt(c, time);
        if (idx < 0 || idx >= c.pts.length) continue;
        const h = c.pts[idx];
        // Dust tail: back along the path, gold-white, thinning.
        for (let j = 1; j < 40; j++) {
          const a = c.pts[Math.max(0, idx - j)], b = c.pts[Math.max(0, idx - j + 1)];
          const f = j / 40;
          g.lineStyle(14 * (1 - f) + 1, mixC(0xffffff, OBS.star, f), 0.45 * (1 - f));
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
        // Ion tail: straight away from him, blue.
        const dx = h.x - CX, dy = h.y - CY;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d;
        g.lineStyle(8, COLD, 0.18); g.lineBetween(h.x, h.y, h.x + ux * 150, h.y + uy * 150);
        g.lineStyle(2, COLD, 0.6); g.lineBetween(h.x, h.y, h.x + ux * 120, h.y + uy * 120);
        // Coma and nucleus.
        g.fillStyle(COLD, 0.15); g.fillCircle(h.x, h.y, 24);
        g.fillStyle(0xd8f0ff, 0.4); g.fillCircle(h.x, h.y, 13);
        g.fillStyle(0xffffff, 1); g.fillCircle(h.x, h.y, 5.5);
      }
    },
    onPhaseEnd() { list = []; },
  };
};

// ── THE RINGS BREAK ──────────────────────────────────────────────────
// Every other band of the ring glows and cracks — then detonates. Then the others. Hop a band.

const ringsBreak = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  interface Beat { bands: number[]; from: number; at: number; done: boolean }
  let beats: Beat[] = [];
  let flashes: { bands: number[]; at: number }[] = [];
  const bandOf = (d: number): number => BANDS.findIndex(([r0, r1]) => d >= r0 && d < r1);
  const parity = (q: number): number[] => BANDS.map((_, i) => i).filter((i) => i % 2 === q);
  const strokeBand = (g: G, i: number, color: number, alpha: number): void => {
    const [r0, r1] = BANDS[i];
    g.lineStyle(r1 - r0, color, alpha); g.strokeCircle(CX, CY, (r0 + r1) / 2);
  };
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'slam',
    tell: 'THE RINGS BREAK',
    cast(time) {
      const q = Math.random() < 0.5 ? 0 : 1;
      const at1 = time + tk.warn(900);
      const at2 = at1 + tk.warn(760);
      beats = [{ bands: parity(q), from: time, at: at1, done: false }, { bands: parity(1 - q), from: at1, at: at2, done: false }];
      if (tk.hard) beats.push({ bands: parity(q), from: at2, at: at2 + tk.warn(650), done: false });
      tk.sfx('crystal-chime');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      for (const b of beats) {
        if (b.done || time < b.at) continue;
        b.done = true;
        flashes.push({ bands: b.bands, at: time });
        tk.sfx('explosion-medium');
        tk.scene.cameras.main.shake(220, 0.005);
        for (const i of b.bands) {
          const mid = (BANDS[i][0] + Math.min(BANDS[i][1], 460)) / 2;
          for (let k = 0; k < 2; k++) {
            const a = Math.random() * TAU;
            tk.boom(CX + Math.cos(a) * mid, CY + Math.sin(a) * mid, 40, OBS.star);
          }
        }
        const p = target(tk);
        if (p && b.bands.includes(bandOf(dist(p.x, p.y, CX, CY)))) tk.hitPlayer(15, p.x, p.y);
      }
      beats = beats.filter((b) => !b.done);
      flashes = flashes.filter((f) => time < f.at + 500);
    },
    drawGround(g, time) {
      beats.forEach((b, n) => {
        if (n === 0) {
          const k = clamp((time - b.from) / Math.max(1, b.at - b.from), 0, 1);
          const blink = k > 0.75 && Math.floor(time / 80) % 2 === 0;
          for (const i of b.bands) {
            strokeBand(g, i, blink ? 0xffffff : OBS.starDeep, 0.08 + 0.24 * k);
            const [r0, r1] = BANDS[i];
            g.lineStyle(2, OBS.star, 0.5 + 0.5 * k); g.strokeCircle(CX, CY, r0 + 1); g.strokeCircle(CX, CY, r1 - 1);
            // Cracks of light running round the band.
            const n2 = Math.round(10 + 26 * k);
            for (let j = 0; j < n2; j++) {
              const a = (j * 2.39996 + i * 1.3 + Math.floor(time / 110) * 0.7) % TAU;
              const rr = r0 + ((j * 37) % 100) / 100 * Math.min(r1 - r0, 300);
              const len = 6 + 14 * k;
              g.lineStyle(1.6, OBS.starCore, 0.4 + 0.5 * k);
              g.lineBetween(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, CX + Math.cos(a + len / rr) * (rr + 5), CY + Math.sin(a + len / rr) * (rr + 5));
            }
          }
        } else {
          for (const i of b.bands) {
            const [r0, r1] = BANDS[i];
            g.lineStyle(1.5, OBS.star, 0.2); g.strokeCircle(CX, CY, r0 + 1); g.strokeCircle(CX, CY, r1 - 1);
          }
        }
      });
      for (const f of flashes) {
        const k = clamp((time - f.at) / 500, 0, 1);
        for (const i of f.bands) {
          strokeBand(g, i, mixC(0xffffff, OBS.starDeep, k), 0.65 * (1 - k));
        }
      }
    },
    onPhaseEnd() { beats = []; flashes = []; },
  };
};

// ── THE CONSTELLATION ────────────────────────────────────────────────
// Stars light one by one across the ring and join into a figure — the Crown, the Sword, the Mask —
// its lines drawn thin first, then fired. Find the open sky between the lines.

interface Figure { pts: [number, number][]; edges: [number, number][] }
const FIGURES: Figure[] = [
  // The Crown: five points over a band.
  { pts: [[-0.9, 0.6], [0.9, 0.6], [-0.9, -0.55], [-0.45, 0.02], [0, -0.85], [0.45, 0.02], [0.9, -0.55]], edges: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]] },
  // The Sword: the blade's two edges to the tip, the guard, the grip.
  { pts: [[0, -1], [-0.13, 0.35], [0.13, 0.35], [-0.62, 0.35], [0.62, 0.35], [0, 0.95], [0, 0.35]], edges: [[0, 1], [0, 2], [3, 1], [1, 2], [2, 4], [6, 5]] },
  // The Mask: its kite, and its slit.
  {
    pts: [[-0.44, -0.95], [0, -1.0], [0.44, -0.95], [0.8, -0.27], [0.5, 0.48], [0, 0.95], [-0.5, 0.48], [-0.8, -0.27], [-0.95, -0.2], [0.95, -0.2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [8, 9]],
  },
];

const constellation = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const HALF = 11, STARS_MS = 650;
  interface Live { pts: P[]; edges: [number, number][]; start: number; linesAt: number; fireAt: number; hit: boolean; fired: boolean }
  let figs: Live[] = [];
  const build = (f: Figure, start: number): Live => {
    const rot = (Math.random() - 0.5) * 0.7;
    const ox = (Math.random() - 0.5) * 60, oy = (Math.random() - 0.5) * 40;
    const c = Math.cos(rot), s = Math.sin(rot);
    const pts = f.pts.map(([x, y]) => {
      const px = x * 360, py = y * 235;
      return { x: CX + ox + px * c - py * s, y: CY + oy + px * s + py * c };
    });
    const linesAt = start + STARS_MS;
    return { pts, edges: f.edges, start, linesAt, fireAt: linesAt + tk.warn(800), hit: false, fired: false };
  };
  return {
    durationMs: 4200,
    windupMs: 700,
    gesture: 'raise',
    tell: 'THE CONSTELLATION',
    cast(time) {
      const order = [...FIGURES].sort(() => Math.random() - 0.5).slice(0, tk.hard ? 3 : 2);
      figs = [];
      let start = time;
      for (const f of order) {
        const fig = build(f, start);
        figs.push(fig);
        start = fig.fireAt - 250;
      }
      tk.sfx('sparkle');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      const p = target(tk);
      for (const f of figs) {
        if (time < f.fireAt) continue;
        if (!f.fired) { f.fired = true; tk.sfx('light-beam'); }
        if (p && !f.hit && time < f.fireAt + 300) {
          for (const [a, b] of f.edges) {
            if (segDist(p.x, p.y, f.pts[a].x, f.pts[a].y, f.pts[b].x, f.pts[b].y) < HALF + PLAYER_R) {
              f.hit = true; tk.hitPlayer(13, p.x, p.y); break;
            }
          }
        }
      }
      figs = figs.filter((f) => time < f.fireAt + 600);
    },
    drawGround(g, time) {
      for (const f of figs) {
        if (time < f.start) continue;
        // The stars, one by one.
        f.pts.forEach((pt, i) => {
          const on = sm(time, f.start + (i * STARS_MS) / f.pts.length, f.start + ((i + 1) * STARS_MS) / f.pts.length);
          if (on <= 0) return;
          const tw = 0.8 + 0.2 * Math.sin(time / 90 + i);
          g.fillStyle(OBS.star, 0.2 * on); g.fillCircle(pt.x, pt.y, 12 * on);
          g.lineStyle(1.5, OBS.starCore, 0.9 * on * tw);
          g.lineBetween(pt.x - 10 * on, pt.y, pt.x + 10 * on, pt.y); g.lineBetween(pt.x, pt.y - 10 * on, pt.x, pt.y + 10 * on);
          g.fillStyle(0xffffff, on); g.fillCircle(pt.x, pt.y, 3);
        });
        if (time < f.linesAt || time >= f.fireAt) continue;
        const k = clamp((time - f.linesAt) / Math.max(1, f.fireAt - f.linesAt), 0, 1);
        const draw = clamp(k / 0.4, 0, 1);
        const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
        for (const [a, b] of f.edges) {
          const A = f.pts[a], B = f.pts[b];
          const ex = A.x + (B.x - A.x) * draw, ey = A.y + (B.y - A.y) * draw;
          g.lineStyle((HALF + PLAYER_R) * 2, OBS.star, 0.05 + 0.06 * k); g.lineBetween(A.x, A.y, ex, ey);
          g.lineStyle(1.5, blink ? 0xffffff : OBS.starCore, 0.4 + 0.5 * k); g.lineBetween(A.x, A.y, ex, ey);
        }
      }
    },
    drawAir(g, time) {
      for (const f of figs) {
        if (time < f.fireAt) continue;
        const k = clamp((time - f.fireAt) / 600, 0, 1);
        const a1 = 1 - k;
        for (const [a, b] of f.edges) {
          const A = f.pts[a], B = f.pts[b];
          g.lineStyle(HALF * 3, OBS.star, 0.3 * a1); g.lineBetween(A.x, A.y, B.x, B.y);
          g.lineStyle(HALF * 1.1, OBS.star, 0.8 * a1); g.lineBetween(A.x, A.y, B.x, B.y);
          g.lineStyle(3, 0xffffff, a1); g.lineBetween(A.x, A.y, B.x, B.y);
        }
        for (const pt of f.pts) { g.fillStyle(0xffffff, a1); g.fillCircle(pt.x, pt.y, 6 + 10 * k); }
      }
    },
    onPhaseEnd() { figs = []; },
  };
};

// ── THE LAST OF THE SHELL ────────────────────────────────────────────
// Three (four) fragments of his shell leave his orbit — each still a mask — and take stations
// round you. Each tracks you with its slit, locks (the line goes solid), and fires the King's
// violet down it. Move after the lock.

const lastOfTheShell = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const HALF = 16, LEN = 1300, BEAM_MS = 220;
  interface Frag { from: P; x: number; y: number; born: number; arriveAt: number; lockAt: number; fireAt: number; aim: number; fired: boolean; hit: boolean }
  let frags: Frag[] = [];
  const posOf = (f: Frag, time: number): P => {
    if (time < f.arriveAt) {
      const e = sm(time, f.born, f.arriveAt);
      return { x: f.from.x + (f.x - f.from.x) * e, y: f.from.y + (f.y - f.from.y) * e };
    }
    const back = sm(time, f.fireAt + BEAM_MS, f.fireAt + BEAM_MS + 600);
    return { x: f.x + (f.from.x - f.x) * back, y: f.y + (f.from.y - f.y) * back };
  };
  return {
    durationMs: 3800,
    windupMs: 650,
    gesture: 'point',
    tell: 'THE LAST OF THE SHELL',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      const p = tk.player;
      const base = Math.random() * TAU;
      frags = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i * TAU) / n;
        let x = clamp(p.x + Math.cos(a) * 250, 60, 900), y = clamp(p.y + Math.sin(a) * 250, 130, 600);
        const d = dist(x, y, CX, CY);
        if (d < 150) { const o = Math.atan2(y - CY, x - CX); x = CX + Math.cos(o) * 150; y = CY + Math.sin(o) * 150; }
        const fa = (i / 6) * TAU;
        const born = time;
        const arriveAt = time + 550;
        const lockAt = arriveAt + i * 320 + tk.warn(480);
        frags.push({ from: { x: CX + Math.cos(fa) * STAR_R * 1.6, y: CY + Math.sin(fa) * STAR_R * 1.6 }, x, y, born, arriveAt, lockAt, fireAt: lockAt + tk.warn(300), aim: 0, fired: false, hit: false });
      }
      sky.shardsOut = n;
      tk.sfx('crystal-shatter');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      const p = target(tk);
      for (const f of frags) {
        const at = posOf(f, time);
        if (time < f.lockAt) f.aim = Math.atan2(tk.player.y - at.y, tk.player.x - at.x);
        if (time >= f.fireAt && !f.fired) { f.fired = true; tk.sfx('beam-fire'); }
        if (p && f.fired && !f.hit && time < f.fireAt + BEAM_MS && !tk.playerDashing()) {
          const dx = p.x - f.x, dy = p.y - f.y;
          const along = dx * Math.cos(f.aim) + dy * Math.sin(f.aim);
          const perp = Math.abs(-dx * Math.sin(f.aim) + dy * Math.cos(f.aim));
          if (along > 0 && perp < HALF + PLAYER_R) { f.hit = true; tk.hitPlayer(14, p.x, p.y); }
        }
      }
      frags = frags.filter((f) => time < f.fireAt + BEAM_MS + 600);
      if (!frags.length) sky.shardsOut = 0;
    },
    drawGround(g, time) {
      for (const f of frags) {
        if (time < f.arriveAt || time >= f.fireAt) continue;
        const ex = f.x + Math.cos(f.aim) * LEN, ey = f.y + Math.sin(f.aim) * LEN;
        if (time < f.lockAt) {
          for (let i = 0; i < 30; i++) {
            const u = i / 30, v = (i + 0.5) / 30;
            g.lineStyle(1.5, OBS.seam, 0.35);
            g.lineBetween(f.x + (ex - f.x) * u, f.y + (ey - f.y) * u, f.x + (ex - f.x) * v, f.y + (ey - f.y) * v);
          }
        } else {
          const blink = time > f.fireAt - 150 && Math.floor(time / 60) % 2 === 0;
          g.lineStyle((HALF + PLAYER_R) * 2, OBS.seam, 0.1); g.lineBetween(f.x, f.y, ex, ey);
          g.lineStyle(2, blink ? 0xffffff : OBS.seamLit, 0.8); g.lineBetween(f.x, f.y, ex, ey);
        }
      }
    },
    drawAir(g, time) {
      for (const f of frags) {
        const at = posOf(f, time);
        if (time < f.arriveAt) {
          g.lineStyle(3, OBS.star, 0.25); g.lineBetween(f.from.x, f.from.y, at.x, at.y);
        }
        if (time >= f.fireAt && time < f.fireAt + BEAM_MS + 120) {
          const k = clamp((time - f.fireAt) / (BEAM_MS + 120), 0, 1);
          const ex = f.x + Math.cos(f.aim) * LEN, ey = f.y + Math.sin(f.aim) * LEN;
          g.lineStyle(HALF * 2.6, OBS.seam, 0.3 * (1 - k)); g.lineBetween(f.x, f.y, ex, ey);
          g.lineStyle(HALF * 1.1, OBS.seamLit, 0.75 * (1 - k)); g.lineBetween(f.x, f.y, ex, ey);
          g.lineStyle(4, 0xffffff, 1 - k); g.lineBetween(f.x, f.y, ex, ey);
          g.fillStyle(0xffffff, 0.8 * (1 - k)); g.fillCircle(f.x, f.y, 20);
        }
        const locked = time >= f.lockAt;
        councilMask(g, at.x, at.y, 17, { crack: 1, glow: locked ? 1.6 : 0.8, slit: locked ? OBS.seamLit : OBS.seam });
        g.fillStyle(OBS.star, 0.18); g.fillCircle(at.x, at.y, 26);
      }
    },
    onPhaseEnd() { frags = []; sky.shardsOut = 0; },
  };
};

// ── SUPERNOVA ────────────────────────────────────────────────────────
// The worlds stop and are drawn round to east and west, where their shadows lie across open
// ring. He swells and whitens; the shadows are marked as the only cold places on the disc. Then
// the light — everything not in a world's shadow is burned. Afterwards he is spent: dim, and he
// takes half again as much harm.

const supernova = (tk: BossToolkit): SignatureMove => {
  const sky = skyOf(tk);
  const SPENT_MS = 3800;
  let from = 0, blastAt = 0, releaseAt = 0, flashAt = -1e9, charging = false, lastSec = -1;
  return {
    durationMs: 7000,
    windupMs: 900,
    gesture: 'flex',
    tell: 'SUPERNOVA — HIDE IN A WORLD’S SHADOW',
    cast(time) {
      from = time;
      blastAt = time + tk.warn(3600);
      charging = true;
      lastSec = -1;
      sky.halt = true;
      sky.align(time, 1300, tk.player.x < CX ? -1 : 1);
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      sky.tick(time, dt);
      if (!live(tk)) return;
      if (charging) {
        sky.nova = clamp((time - from) / Math.max(1, blastAt - from), 0, 1);
        const sec = Math.ceil((blastAt - time) / 1000);
        if (sec !== lastSec && sec <= 3 && sec > 0) { lastSec = sec; tk.sfx('countdown-tick'); }
        if (time >= blastAt) {
          charging = false;
          sky.nova = 0;
          sky.spentUntil = time + SPENT_MS;
          releaseAt = time + 500;
          flashAt = time;
          tk.sfx('explosion-large');
          tk.sfx('holy-chord');
          tk.scene.cameras.main.flash(450, 255, 248, 230);
          tk.scene.cameras.main.shake(700, 0.016);
          const p = target(tk);
          if (p && !sky.inShadow(p.x, p.y)) tk.hitPlayer(26, p.x, p.y);
        }
      } else if (releaseAt && time >= releaseAt) {
        releaseAt = 0;
        sky.halt = false;
      }
    },
    takenMult() { return tk.now < sky.spentUntil ? 1.5 : 1; },
    drawGround(g, time) {
      if (!charging) return;
      const k = sky.nova;
      g.fillStyle(OBS.star, 0.06 + 0.16 * k); g.fillRect(0, 0, tk.W, tk.H);
      for (const p of sky.planets) {
        const poly = shadowPoly(p);
        g.fillStyle(SHADE, 0.55 + 0.25 * k); g.fillPoints(poly, true);
        const blink = k > 0.8 && Math.floor(time / 90) % 2 === 0;
        g.lineStyle(2.5, blink ? 0xffffff : COLD, 0.6 + 0.4 * k);
        g.lineBetween(poly[0].x, poly[0].y, poly[1].x, poly[1].y);
        g.lineBetween(poly[3].x, poly[3].y, poly[2].x, poly[2].y);
        // Chevrons down the middle of the shelter, outward.
        const pp = planetPos(p);
        for (let i = 0; i < 6; i++) {
          const r = p.orbit + p.r + 20 + ((i * 50 + time / 12) % 300);
          chevron(g, CX + Math.cos(p.angle) * r, CY + Math.sin(p.angle) * r, p.angle, 9, COLD, 0.5 * k);
        }
        g.lineStyle(2, COLD, 0.5 * k); g.strokeCircle(pp.x, pp.y, p.r + 6);
      }
    },
    drawAir(g, time) {
      if (charging) {
        const k = sky.nova;
        for (let i = 0; i < 4; i++) {
          const f = 1 - (((time / 1000) * (0.6 + k) + i / 4) % 1);
          g.lineStyle(3 + 6 * k, 0xffffff, 0.12 + 0.3 * k * (1 - f)); g.strokeCircle(CX, CY, STAR_R + f * 520);
        }
        return;
      }
      const f = clamp((time - flashAt) / 900, 0, 1);
      if (f >= 1) return;
      g.fillStyle(0xfffbea, 0.85 * (1 - f) * (1 - f)); g.fillRect(0, 0, tk.W, tk.H);
      for (const p of sky.planets) { g.fillStyle(SHADE, 0.85 * (1 - f)); g.fillPoints(shadowPoly(p), true); }
      g.lineStyle(50 * (1 - f) + 4, 0xffffff, 0.8 * (1 - f)); g.strokeCircle(CX, CY, STAR_R + f * 1000);
    },
    onPhaseEnd() { charging = false; releaseAt = 0; sky.reset(); },
  };
};

// ── The act ──────────────────────────────────────────────────────────

/** Act III — the star at the centre of its rings. */
export const KING_STAR: KingPart = {
  phase: {
    name: 'The Star Unshelled',
    line: 'No more glass. No more masks. This is what sat on your throne.',
    hp: 1300,
    cycle: [
      'sig:p3-flare', 'sig:p3-meteors', 'sig:p3-orrery', 'sig:p3-rings', 'sig:p3-comets', 'sig:p3-shards',
      'sig:p3-blackhole', 'sig:p3-constellation', 'sig:p3-supernova', 'sig:p3-flare', 'sig:p3-rings', 'radial',
      'sig:p3-meteors', 'sig:p3-blackhole', 'sig:p3-comets', 'sig:p3-orrery', 'sig:p3-constellation', 'sig:p3-supernova',
    ],
    harass: ['h-snipe', 'h-orbs'],
    restMs: 2000,
    harassMs: 3800,
    style: { movement: 'anchor', anchorAt: { x: CX, y: CY }, hideRig: true, tint: 'gold', look: { torsoR: STAR_R } },
    entry: STAR_ENTRY,
  },
  signatures: {
    'p3-orrery': orrery,
    'p3-flare': solarFlare,
    'p3-meteors': meteorShower,
    'p3-blackhole': eventHorizon,
    'p3-comets': comets,
    'p3-rings': ringsBreak,
    'p3-constellation': constellation,
    'p3-shards': lastOfTheShell,
    'p3-supernova': supernova,
  },
  /** Him, whole: the star, its face, its crown of rays, the last of the shell. */
  drawDecor(g, s) {
    const sky = activeSky();
    const spentLeft = sky ? sky.spentUntil - s.t : 0;
    drawStar(g, s.x, s.y, s.t / 1000, {
      nova: sky?.nova ?? 0,
      spent: spentLeft > 0 ? Math.min(1, spentLeft / 500) : 0,
      shardsOut: sky?.shardsOut ?? 0,
      facing: s.facing,
      hurt: s.hurt,
      castGlow: s.castGlow,
      hp: s.hpRatio,
    });
  },
  /** Deep space — no floor at all. */
  drawArena: drawSpace,
  /** The ring disc turning round him, the worlds and their shadows. */
  drawBackdrop(g, s, W, H) { drawRings(g, s.t / 1000, activeSky(), W, H); },
};

/** His fall: the star gutters and goes out. */
export const KING_OUTRO: BossEntry = OUTRO_ENTRY;
