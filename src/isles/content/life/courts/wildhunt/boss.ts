import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  ANTLER, ANTLER_DARK, BARK, BARK_DARK, BLOOD, FUR, FUR_LIT, GILT, HUNT_GREEN, HUNT_RED, HUNT_RED_LIT,
  LEAF_GOLD, MOSS, VERDIGRIS, WOLF, WOLF_DARK, WOLF_LIT, antler, antlerPair, clamp, dist, gardenersMark, hound,
  huntingHorn, logEnd, pawprint, quad, segDist, spear, stag,
} from './util';
import { wolfHead } from './areaArt';

/**
 * Prince Fang, Master of the Wildhunt — the Empress Verdigra's fourth child, who keeps her chase
 * in Thornwild's deep forest. He takes the Bloom Tithe in game, and the households that come up
 * short he runs as quarry before they go to the Glasshouse: "the garden must be weeded, and the
 * weeds may as well be sport." He gives them the count of a hundred. He counts slowly.
 *
 * Phase one, *The Chase*: mounted on a great white-antlered elk, oxblood cloak, horn at his hip.
 * He circles you, looses hounds that run you down in a pincer, rides you down in a great arc that
 * ends in a lance-thrust through the middle, and throws boar-spears on lines that he hauls back.
 *
 * Phase two, *The Beast Within*: thrown from the saddle, he comes up a wolf. He rushes and pounces
 * three times running, howls rings of dread under a red moon, and rakes the floor with claws the
 * width of the room.
 *
 * Hard mode adds *The Wild Hunt*: pale and antler-crowned, he calls the hunt that rides the sky —
 * spectral riders gallop straight across the room one after another, and spectral hounds with them.
 */

const MAIN = 0x7a4a2e;
const LIT = 0xffc070;
const DARK = 0x1e140c;
const ACCENT = HUNT_RED;
const GHOST = 0xc8e8ff;

const TOP = 96;

/** The phase the body is in, kept by the decor painter so signatures can dress for it. */
const fight = { phaseIdx: 0 };

// ── Signature: Loose the Hounds ──────────────────────────────────────
// Three or four hounds slip off him and run curving lines that close on you from both sides —
// a pincer. Each line is laid out first in pawprints; then the hounds run it. Step off the lines.

const looseHounds = (tk: BossToolkit): SignatureMove => {
  interface Run { a: { x: number; y: number }; c: { x: number; y: number }; b: { x: number; y: number }; showAt: number; goAt: number; endAt: number; dealt: boolean; coat: number }
  let runs: Run[] = [];
  const WARN = 850, RUN = 950;
  return {
    durationMs: 2300,
    windupMs: 600,
    gesture: 'point',
    tell: 'LOOSE THE HOUNDS',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const ghost = fight.phaseIdx >= 2;
      const a0 = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
      runs = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const bend = (110 + Math.floor(i / 2) * 70) * side;
        const mx = (tk.bossX + p.x) / 2, my = (tk.bossY + p.y) / 2;
        const c = { x: tk.clampX(mx + Math.cos(a0 + Math.PI / 2) * bend), y: tk.clampY(my + Math.sin(a0 + Math.PI / 2) * bend) };
        const b = { x: tk.clampX(p.x + Math.cos(a0 - side * 0.5) * 140), y: tk.clampY(p.y + Math.sin(a0 - side * 0.5) * 140) };
        const goAt = time + tk.warn(WARN) + i * 140;
        runs.push({ a: { x: tk.bossX, y: tk.bossY }, c, b, showAt: time, goAt, endAt: goAt + RUN, dealt: false, coat: ghost ? GHOST : [0x8a6a4a, 0xc8b49a, 0x5a4434, 0x9a7a5a][i] });
      }
      tk.sfx('screech');
    },
    update(time) {
      const p = tk.player;
      for (const r of runs) {
        if (r.dealt || time < r.goAt || time > r.endAt) continue;
        const h = quad(r.a, r.c, r.b, (time - r.goAt) / RUN);
        if (dist(p.x, p.y, h.x, h.y) < 28) { r.dealt = true; tk.hitPlayer(12, p.x, p.y); tk.sfx('slash'); }
      }
      runs = runs.filter((r) => time < r.endAt + 200);
    },
    drawGround(g, time) {
      for (const r of runs) {
        if (time > r.endAt) continue;
        const c = clamp((time - r.showAt) / (r.goAt - r.showAt), 0, 1);
        // Pawprints appear along the line, front to back, then fade as the hound passes.
        for (let k = 1; k < 18; k++) {
          const t = k / 18;
          if (t > c * 1.05) break;
          const ran = time > r.goAt && (time - r.goAt) / RUN > t;
          const p0 = quad(r.a, r.c, r.b, t), p1 = quad(r.a, r.c, r.b, Math.min(1, t + 0.02));
          const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          const off = k % 2 ? 6 : -6;
          pawprint(g, p0.x - Math.sin(a) * off, p0.y + Math.cos(a) * off, a, 7, ran ? 0x2a1a10 : 0xff8a5a, ran ? 0.25 : 0.65);
        }
        if (c > 0.85 && time < r.goAt && Math.floor(time / 70) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.4); g.strokeCircle(r.b.x, r.b.y, 18); }
      }
    },
    drawAir(g, time) {
      for (const r of runs) {
        if (time < r.goAt || time > r.endAt) continue;
        const t = (time - r.goAt) / RUN;
        const h = quad(r.a, r.c, r.b, t), h2 = quad(r.a, r.c, r.b, Math.min(1, t + 0.03));
        hound(g, h.x, h.y, h2.x >= h.x ? 1 : -1, 1.15, time / 30, r.coat, r.coat === GHOST ? 0.7 : 1);
      }
    },
    onPhaseEnd() { runs = []; },
  };
};

// ── Signature: Ride Down ─────────────────────────────────────────────
// He wheels the elk round you at a gallop — an arc shown as a churned ribbon of hoofprints — and
// at its end turns in and drives the lance straight through where you stood. Step off the ring,
// out of the middle.

const rideDown = (tk: BossToolkit): SignatureMove => {
  let cx = 0, cy = 0, R = 0, a0 = 0, sweep = 0;
  let showAt = 0, arcAt = 0, arcEnd = 0, thrustEnd = 0;
  let tx = 0, ty = 0;
  let dealtArc = false, dealtThrust = false, active = false;
  const HW = 34, ARC_MS = 1000, THRUST_MS = 380;
  const arcPt = (t: number): { x: number; y: number } => ({ x: cx + Math.cos(a0 + sweep * t) * R, y: cy + Math.sin(a0 + sweep * t) * R * 0.8 });
  return {
    durationMs: 2700,
    windupMs: 550,
    gesture: 'sweep',
    locksBody: true,
    tell: 'RIDE DOWN',
    cast(time) {
      const p = tk.player;
      cx = tk.clampX(p.x, 150); cy = tk.clampY(p.y + 0, 140);
      R = clamp(dist(tk.bossX, tk.bossY, cx, cy), 150, 240);
      a0 = Math.atan2((tk.bossY - cy) / 0.8, tk.bossX - cx);
      sweep = (Math.random() < 0.5 ? -1 : 1) * Math.PI * 1.25;
      showAt = time; arcAt = time + tk.warn(800); arcEnd = arcAt + ARC_MS; thrustEnd = arcEnd + THRUST_MS;
      const e = arcPt(1);
      tx = tk.clampX(cx + (cx - e.x) * 1.1); ty = tk.clampY(cy + (cy - e.y) * 1.1);
      dealtArc = false; dealtThrust = false; active = true;
      tk.sfx('dash');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      if (time >= arcAt && time < arcEnd) {
        const q = arcPt((time - arcAt) / ARC_MS);
        tk.host.setBossPos(tk.clampX(q.x), tk.clampY(q.y));
        if (!dealtArc && dist(p.x, p.y, q.x, q.y) < HW + 14) { dealtArc = true; tk.hitPlayer(15, p.x, p.y); tk.sfx('hit-heavy'); }
      } else if (time >= arcEnd && time < thrustEnd) {
        const e = arcPt(1);
        const k = (time - arcEnd) / THRUST_MS;
        const x = e.x + (tx - e.x) * k, y = e.y + (ty - e.y) * k;
        tk.host.setBossPos(tk.clampX(x), tk.clampY(y));
        if (!dealtThrust && dist(p.x, p.y, x, y) < HW + 14) { dealtThrust = true; tk.hitPlayer(18, p.x, p.y); tk.sfx('stab'); }
      } else if (time >= thrustEnd) active = false;
    },
    drawGround(g, time) {
      if (!active || time > arcEnd + 60) return;
      const c = clamp((time - showAt) / (arcAt - showAt), 0, 1);
      // The arc ribbon: churned turf, hoofprints in pairs, brightening as it fills.
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        if (t > c) break;
        const q = arcPt(t);
        g.fillStyle(0x3a2a18, 0.35); g.fillCircle(q.x, q.y, HW);
      }
      for (let k = 0; k < 24; k++) {
        const t = k / 24;
        if (t > c) break;
        const q = arcPt(t), q2 = arcPt(Math.min(1, t + 0.02));
        const a = Math.atan2(q2.y - q.y, q2.x - q.x);
        const col = time >= arcAt && (time - arcAt) / ARC_MS > t ? 0x2a1a10 : 0xffb070;
        g.fillStyle(col, 0.7);
        g.fillEllipse(q.x - Math.sin(a) * 9, q.y + Math.cos(a) * 9, 9, 6); g.fillEllipse(q.x + Math.sin(a) * 9, q.y - Math.cos(a) * 9, 9, 6);
      }
      // The lance line from the arc's end through the middle.
      const e = arcPt(1);
      g.lineStyle(2, HUNT_RED_LIT, 0.3 + c * 0.6);
      const a = Math.atan2(ty - e.y, tx - e.x), nx = -Math.sin(a), ny = Math.cos(a);
      g.lineBetween(e.x + nx * HW, e.y + ny * HW, tx + nx * HW, ty + ny * HW);
      g.lineBetween(e.x - nx * HW, e.y - ny * HW, tx - nx * HW, ty - ny * HW);
      g.fillStyle(HUNT_RED, 0.1 + c * 0.12);
      g.fillTriangle(e.x + nx * HW, e.y + ny * HW, e.x - nx * HW, e.y - ny * HW, tx + nx * HW, ty + ny * HW);
      g.fillTriangle(e.x - nx * HW, e.y - ny * HW, tx - nx * HW, ty - ny * HW, tx + nx * HW, ty + ny * HW);
    },
    drawAir(g, time) {
      if (!active || time < arcEnd || time > thrustEnd) return;
      // The lance levelled in front of him.
      const e = arcPt(1);
      const a = Math.atan2(ty - e.y, tx - e.x);
      spear(g, tk.bossX - Math.cos(a) * 20, tk.bossY - Math.sin(a) * 20, tk.bossX + Math.cos(a) * 70, tk.bossY + Math.sin(a) * 70);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Spear and Line ────────────────────────────────────────
// Boar-spears on cords: he throws a fan of them, each line shown first, and they stick quivering
// in the turf. Then he hauls the cords and every spear comes skidding back down its own line.

const spearAndLine = (tk: BossToolkit): SignatureMove => {
  interface Sp { tx: number; ty: number; ox: number; oy: number; throwAt: number; landAt: number; haulAt: number; backAt: number; dOut: boolean; dBack: boolean }
  let spears: Sp[] = [];
  const FLY = 260, HAUL = 380, R = 22;
  const pos = (s: Sp, time: number): { x: number; y: number } => {
    if (time < s.landAt) { const k = clamp((time - s.throwAt) / FLY, 0, 1); return { x: s.ox + (s.tx - s.ox) * k, y: s.oy + (s.ty - s.oy) * k }; }
    if (time < s.haulAt) return { x: s.tx, y: s.ty };
    const k = clamp((time - s.haulAt) / HAUL, 0, 1);
    return { x: s.tx + (tk.bossX - s.tx) * k, y: s.ty + (tk.bossY - s.ty) * k };
  };
  return {
    durationMs: 3000,
    windupMs: 650,
    gesture: 'punch',
    tell: 'SPEAR AND LINE',
    cast(time) {
      const n = tk.hard ? 5 : 4;
      const a0 = tk.angleToPlayer();
      spears = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.3;
        const L = 520;
        const throwAt = time + tk.warn(700) + i * 90;
        spears.push({
          ox: tk.bossX, oy: tk.bossY, tx: tk.clampX(tk.bossX + Math.cos(a) * L), ty: tk.clampY(tk.bossY + Math.sin(a) * L),
          throwAt, landAt: throwAt + FLY, haulAt: throwAt + FLY + tk.warn(900), backAt: throwAt + FLY + tk.warn(900) + HAUL, dOut: false, dBack: false,
        });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const s of spears) {
        if (time >= s.throwAt && time < s.landAt && !s.dOut) {
          const q = pos(s, time);
          if (dist(p.x, p.y, q.x, q.y) < R) { s.dOut = true; tk.hitPlayer(13, p.x, p.y); tk.sfx('stab'); }
        }
        if (time >= s.landAt && time < s.landAt + 40) tk.sfx('thorn');
        if (time >= s.haulAt && time < s.backAt && !s.dBack) {
          const q = pos(s, time);
          if (dist(p.x, p.y, q.x, q.y) < R + 4) { s.dBack = true; tk.hitPlayer(11, p.x, p.y); tk.sfx('slash'); }
        }
      }
      spears = spears.filter((s) => time < s.backAt + 100);
    },
    drawGround(g, time) {
      for (const s of spears) {
        if (time > s.backAt) continue;
        // The line's telegraph, then the cord itself lying slack (taut and bright as he hauls).
        const pre = time < s.throwAt;
        const c = pre ? clamp(1 - (s.throwAt - time) / 700, 0, 1) : 1;
        const hauling = time >= s.haulAt - tk.warn(400);
        g.lineStyle(pre ? 2 : hauling ? 3 : 1.5, pre ? 0xffb070 : hauling ? 0xffe0a0 : 0xc8b08a, pre ? 0.3 + c * 0.5 : hauling ? 0.9 : 0.6);
        const q = pos(s, time);
        g.lineBetween(tk.bossX, tk.bossY, pre ? s.tx : q.x, pre ? s.ty : q.y);
        if (hauling && time < s.haulAt && Math.floor(time / 70) % 2 === 0) { g.lineStyle(6, 0xffffff, 0.25); g.lineBetween(tk.bossX, tk.bossY, s.tx, s.ty); }
        if (!pre && time >= s.landAt && time < s.haulAt) {
          g.fillStyle(0x2a1a10, 0.5); g.fillEllipse(s.tx, s.ty + 4, 20, 7);
        }
      }
    },
    drawAir(g, time) {
      for (const s of spears) {
        if (time < s.throwAt || time > s.backAt) continue;
        const q = pos(s, time);
        const a = Math.atan2(s.ty - s.oy, s.tx - s.ox);
        if (time >= s.landAt && time < s.haulAt) {
          // Stuck in, butt in the air, quivering.
          const w = Math.sin(time / 30) * 3 * clamp(1 - (time - s.landAt) / 500, 0, 1);
          spear(g, q.x - Math.cos(a) * 30 + w, q.y - Math.sin(a) * 18 - 34, q.x, q.y);
        } else {
          spear(g, q.x - Math.cos(a) * 50, q.y - Math.sin(a) * 50, q.x, q.y);
        }
      }
    },
    onPhaseEnd() { spears = []; },
  };
};

// ── Signature: Pounce ────────────────────────────────────────────────
// The wolf crouches and springs — three times running. Each landing is marked first with four
// claw-scores; each spring re-aims where you are when the last one lands.

const pounce = (tk: BossToolkit): SignatureMove => {
  interface Leap { fx: number; fy: number; tx: number; ty: number; showAt: number; goAt: number; landAt: number; dealt: boolean }
  let leaps: Leap[] = [];
  let count = 0;
  const WARN = 650, AIR = 420, R = 58;
  const plan = (time: number): void => {
    const p = tk.player;
    const fx = tk.bossX, fy = tk.bossY;
    const a = Math.atan2(p.y - fy, p.x - fx);
    const tx = tk.clampX(p.x + Math.cos(a) * 30, 70), ty = tk.clampY(p.y + Math.sin(a) * 30, 70);
    leaps.push({ fx, fy, tx, ty, showAt: time, goAt: time + tk.warn(WARN), landAt: time + tk.warn(WARN) + AIR, dealt: false });
  };
  return {
    durationMs: 3600,
    windupMs: 500,
    hold: 'brace',
    locksBody: true,
    tell: 'POUNCE',
    cast(time) { leaps = []; count = 1; plan(time); tk.sfx('roar'); },
    update(time) {
      const p = tk.player;
      for (const l of leaps) {
        if (time >= l.goAt && time < l.landAt) {
          const k = (time - l.goAt) / AIR;
          tk.host.setBossPos(l.fx + (l.tx - l.fx) * k, l.fy + (l.ty - l.fy) * k);
        } else if (!l.dealt && time >= l.landAt) {
          l.dealt = true;
          tk.host.setBossPos(l.tx, l.ty);
          if (dist(p.x, p.y, l.tx, l.ty) < R + 12) tk.hitPlayer(16, p.x, p.y);
          tk.boom(l.tx, l.ty, R, BLOOD);
          tk.sfx('stone-slam');
          if (count < (tk.hard ? 4 : 3)) { count++; plan(time + 120); }
        }
      }
      leaps = leaps.filter((l) => time < l.landAt + 600);
    },
    drawGround(g, time) {
      for (const l of leaps) {
        if (time > l.landAt + 600) continue;
        const c = clamp((time - l.showAt) / (l.goAt - l.showAt), 0, 1);
        if (time < l.landAt) {
          g.fillStyle(BLOOD, 0.1 + c * 0.15); g.fillCircle(l.tx, l.ty, R);
          g.lineStyle(2, 0xff6a4a, 0.4 + c * 0.5); g.strokeCircle(l.tx, l.ty, R);
          for (let k = 0; k < 4; k++) {
            const x = l.tx - 24 + k * 16;
            g.lineStyle(3, 0xffe0c0, 0.3 + c * 0.6); g.lineBetween(x - 8, l.ty - 22, x + 6, l.ty + 22 * c);
          }
          if (c > 0.8 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.45); g.strokeCircle(l.tx, l.ty, R + 4); }
        } else {
          const k = (time - l.landAt) / 600;
          for (let j = 0; j < 4; j++) { const x = l.tx - 24 + j * 16; g.lineStyle(4, BLOOD, 0.8 * (1 - k)); g.lineBetween(x - 8, l.ty - 22, x + 6, l.ty + 22); }
        }
      }
    },
    drawAir(g, time) {
      for (const l of leaps) {
        if (time < l.goAt || time > l.landAt) continue;
        const k = (time - l.goAt) / AIR;
        // The arc of the leap: a shadow below, a streak of grey above.
        const x = l.fx + (l.tx - l.fx) * k, y = l.fy + (l.ty - l.fy) * k;
        g.fillStyle(WOLF_LIT, 0.35); g.fillEllipse(x, y - Math.sin(k * Math.PI) * 60, 50, 20);
      }
    },
    onPhaseEnd() { leaps = []; count = 0; },
  };
};

// ── Signature: Blood-Moon Howl ───────────────────────────────────────
// A red moon rises over the yard and he howls: two rings of dread roll out, each with a gap
// (the second's gap drifted a little from the first's). While he howls, your legs go heavy.

const bloodMoonHowl = (tk: BossToolkit): SignatureMove => {
  interface Ring { x: number; y: number; at: number; gap: number; dealt: boolean }
  let rings: Ring[] = [];
  let moonAt = 0, howlUntil = 0;
  const SPD = 300, BAND = 22, GAP = 0.5;
  return {
    durationMs: 2600,
    windupMs: 800,
    hold: 'charge',
    tell: 'BLOOD-MOON HOWL',
    cast(time) {
      moonAt = time; howlUntil = time + 1500;
      const g0 = tk.angleToPlayer() + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.8);
      rings = [{ x: tk.bossX, y: tk.bossY, at: time, gap: g0, dealt: false }];
      tk.schedule(650, () => rings.push({ x: tk.bossX, y: tk.bossY, at: tk.now, gap: g0 + (Math.random() < 0.5 ? 1 : -1) * GAP * 0.8, dealt: false }));
      if (tk.hard) tk.schedule(1300, () => rings.push({ x: tk.bossX, y: tk.bossY, at: tk.now, gap: g0, dealt: false }));
      tk.sfx('roar');
    },
    update(time) {
      const p = tk.player;
      if (time < howlUntil) tk.slowPlayer(0.82, 120);
      for (const r of rings) {
        if (r.dealt) continue;
        const rad = ((time - r.at) / 1000) * SPD;
        const d = dist(p.x, p.y, r.x, r.y);
        if (Math.abs(d - rad) < BAND / 2 + 14) {
          let da = Math.atan2(p.y - r.y, p.x - r.x) - r.gap;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > GAP) { r.dealt = true; tk.hitPlayer(13, p.x, p.y); }
        }
      }
      rings = rings.filter((r) => ((time - r.at) / 1000) * SPD < 1300);
    },
    drawGround(g, time) {
      if (time - moonAt > 3000) return;
      const k = clamp(1 - Math.abs((time - moonAt) - 1300) / 1700, 0, 1);
      g.fillStyle(0x3a0a08, 0.25 * k); g.fillRect(0, TOP, tk.W, tk.H - TOP);
    },
    drawAir(g, time) {
      const ts = time / 1000;
      // The moon, rising behind the trophy wall.
      if (time - moonAt < 3000) {
        const k = clamp(1 - Math.abs((time - moonAt) - 1300) / 1700, 0, 1);
        const mx = tk.W - 120, my = TOP + 70 - k * 20;
        g.fillStyle(0xc83a2a, 0.15 * k); g.fillCircle(mx, my, 60);
        g.fillStyle(0xe85a3a, 0.8 * k); g.fillCircle(mx, my, 34);
        g.fillStyle(0xa83020, 0.6 * k); g.fillCircle(mx - 8, my - 6, 8); g.fillCircle(mx + 10, my + 8, 5);
      }
      for (const r of rings) {
        const rad = ((time - r.at) / 1000) * SPD;
        const fade = clamp(1 - rad / 1300, 0.2, 1);
        // Breath-ring: a ragged red-grey band, the gap clean.
        for (let k = 0; k < 2; k++) {
          g.lineStyle(k ? 3 : 7, k ? 0xffb0a0 : 0x8a2a20, (k ? 0.6 : 0.75) * fade);
          g.beginPath(); g.arc(r.x, r.y, Math.max(2, rad - k * 6), r.gap + GAP, r.gap + Math.PI * 2 - GAP, false); g.strokePath();
        }
        for (let j = 0; j < 14; j++) {
          const a = r.gap + GAP + ((j + 0.5) / 14) * (Math.PI * 2 - GAP * 2);
          const rr = rad + Math.sin(ts * 10 + j) * 4;
          g.fillStyle(0xd8d0c8, 0.4 * fade); g.fillCircle(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, 3);
        }
      }
      if (time < howlUntil) {
        // The howl itself: lines streaming up off his muzzle.
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 300) + i / 4) % 1;
          g.lineStyle(2, 0xffd0c0, 0.6 * (1 - ph));
          g.beginPath(); g.arc(tk.bossX, tk.bossY - 40, 12 + ph * 40, -Math.PI * 0.8, -Math.PI * 0.2, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { rings = []; howlUntil = 0; },
  };
};

// ── Signature: Rake ──────────────────────────────────────────────────
// Three claw-gouges the length of the room tear across it at an angle, the middle one through
// you. Scratches show first; stand between them.

const rake = (tk: BossToolkit): SignatureMove => {
  let lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let showAt = 0, tearAt = 0, dealt = false;
  const HW = 20, GAP = 92;
  return {
    durationMs: 1900,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'RAKE',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer() + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      lines = [-1, 0, 1].map((k) => {
        const cx = p.x + nx * k * GAP, cy = p.y + ny * k * GAP;
        return { x1: cx - ux * 1200, y1: cy - uy * 1200, x2: cx + ux * 1200, y2: cy + uy * 1200 };
      });
      if (tk.hard) {
        const cx = p.x + nx * 2 * GAP, cy = p.y + ny * 2 * GAP;
        lines.push({ x1: cx - ux * 1200, y1: cy - uy * 1200, x2: cx + ux * 1200, y2: cy + uy * 1200 });
      }
      showAt = time; tearAt = time + tk.warn(800); dealt = false;
      tk.sfx('slash');
    },
    update(time) {
      if (dealt || !lines.length || time < tearAt) return;
      dealt = true;
      const p = tk.player;
      if (lines.some((l) => segDist(p.x, p.y, l.x1, l.y1, l.x2, l.y2) < HW + 12)) tk.hitPlayer(17, p.x, p.y);
      tk.sfx('hit-heavy');
    },
    drawGround(g, time) {
      if (!lines.length || time > tearAt + 900) return;
      const c = clamp((time - showAt) / (tearAt - showAt), 0, 1);
      for (const l of lines) {
        if (time < tearAt) {
          g.lineStyle(2, 0xffe0c0, 0.25 + c * 0.55); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
          g.lineStyle(HW * 2, BLOOD, 0.06 + c * 0.1); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
        } else {
          const k = (time - tearAt) / 900;
          g.lineStyle(HW * 1.4, 0x1a0c08, 0.85 * (1 - k)); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
          g.lineStyle(4, BLOOD, 0.9 * (1 - k)); g.lineBetween(l.x1, l.y1, l.x2, l.y2);
        }
      }
    },
    drawAir(g, time) {
      if (!lines.length || time < tearAt || time > tearAt + 200) return;
      // The swipe: four white streaks fanned from his paw.
      const k = (time - tearAt) / 200;
      for (let i = 0; i < 4; i++) {
        g.lineStyle(4, 0xffffff, 0.8 * (1 - k));
        g.beginPath(); g.arc(tk.bossX, tk.bossY, 50 + i * 10, -0.8 + k, 0.8 + k, false); g.strokePath();
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: The Wild Hunt (hard) ──────────────────────────────────
// He calls the hunt that rides the sky. Pale riders on pale elk gallop straight across the yard,
// edge to edge, one after another, each crossing near you; a ghost-trail of hoofprints lights the
// line before each one rides.

const wildHunt = (tk: BossToolkit): SignatureMove => {
  interface Rider { x1: number; y1: number; x2: number; y2: number; showAt: number; goAt: number; endAt: number; dealt: boolean; seed: number }
  let riders: Rider[] = [];
  const WARN = 900, RIDE = 700;
  return {
    durationMs: 3800,
    windupMs: 900,
    hold: 'conduct',
    tell: 'THE WILD HUNT',
    cast(time) {
      const n = tk.hard ? 6 : 5;
      riders = [];
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 420, () => {
          const p = tk.player;
          const a = Math.random() * Math.PI;
          const off = (Math.random() - 0.5) * 120;
          const ux = Math.cos(a), uy = Math.sin(a);
          const cx = p.x - uy * off, cy = p.y + ux * off;
          const now = tk.now;
          riders.push({ x1: cx - ux * 900, y1: cy - uy * 900, x2: cx + ux * 900, y2: cy + uy * 900, showAt: now, goAt: now + tk.warn(WARN), endAt: now + tk.warn(WARN) + RIDE, dealt: false, seed: i * 1.7 });
        });
      }
      tk.sfx('boss-phase');
    },
    update(time) {
      const p = tk.player;
      for (const r of riders) {
        if (r.dealt || time < r.goAt || time > r.endAt) continue;
        const k = (time - r.goAt) / RIDE;
        const x = r.x1 + (r.x2 - r.x1) * k, y = r.y1 + (r.y2 - r.y1) * k;
        if (dist(p.x, p.y, x, y) < 40) { r.dealt = true; tk.hitPlayer(15, p.x, p.y); tk.sfx('hit-heavy'); }
      }
      riders = riders.filter((r) => time < r.endAt + 300);
    },
    drawGround(g, time) {
      for (const r of riders) {
        if (time > r.endAt) continue;
        const c = clamp((time - r.showAt) / (r.goAt - r.showAt), 0, 1);
        g.lineStyle(56, GHOST, 0.05 + c * 0.08); g.lineBetween(r.x1, r.y1, r.x2, r.y2);
        const a = Math.atan2(r.y2 - r.y1, r.x2 - r.x1);
        for (let d = 0; d < 1800 * c; d += 36) {
          const x = r.x1 + Math.cos(a) * d, y = r.y1 + Math.sin(a) * d;
          if (x < -20 || x > tk.W + 20 || y < TOP - 20 || y > tk.H + 20) continue;
          g.fillStyle(GHOST, 0.5); g.fillEllipse(x - Math.sin(a) * 8, y + Math.cos(a) * 8, 7, 5);
        }
        if (c > 0.8 && time < r.goAt && Math.floor(time / 70) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.5); g.lineBetween(r.x1, r.y1, r.x2, r.y2); }
      }
    },
    drawAir(g, time) {
      for (const r of riders) {
        if (time < r.goAt || time > r.endAt) continue;
        const k = (time - r.goAt) / RIDE;
        const x = r.x1 + (r.x2 - r.x1) * k, y = r.y1 + (r.y2 - r.y1) * k;
        const dir = r.x2 >= r.x1 ? 1 : -1;
        // A streaming ghost-trail, then the elk and its rider.
        for (let i = 1; i < 6; i++) {
          const tx = x - (r.x2 - r.x1) * 0.02 * i, ty = y - (r.y2 - r.y1) * 0.02 * i;
          g.fillStyle(GHOST, 0.18 - i * 0.025); g.fillEllipse(tx, ty, 60, 26);
        }
        stag(g, x, y, dir, 0.9, time / 25, 1, 0.6);
        g.fillStyle(GHOST, 0.65); g.fillCircle(x - dir * 4, y - 34, 11);
        g.fillStyle(0x1a2a3a, 0.8); g.fillCircle(x - dir * 1, y - 36, 2); g.fillCircle(x - dir * 7, y - 36, 2);
        antler(g, x - dir * 8, y - 42, 14, -1, GHOST, 3, 0.7);
        antler(g, x, y - 42, 14, 1, GHOST, 3, 0.7);
        g.lineStyle(2, GHOST, 0.5); g.lineBetween(x + dir * 6, y - 30, x + dir * 50, y - 44);
      }
    },
    onPhaseEnd() { riders = []; },
  };
};

// ── Look ─────────────────────────────────────────────────────────────

/** Fang's decor: the elk he rides, the antler crown and horn (phase one); the wolf (two); the pale hunt (three). */
function drawFangDecor(g: Phaser.GameObjects.Graphics, s: BossBodyState): void {
  fight.phaseIdx = s.phaseIdx;
  const R = s.radius;
  const ts = s.t / 1000;
  const dir = Math.cos(s.facing) >= 0 ? 1 : -1;
  if (s.phaseIdx === 0) {
    // The elk under him: hindquarters behind, chest, neck and great white rack ahead.
    const gait = ts * 9;
    const leg = (lx: number, ph: number): void => {
      const fx = s.x + lx + Math.sin(ph) * 8;
      g.lineStyle(6, 0x5a3a22, 1); g.lineBetween(s.x + lx, s.y + R * 0.6, fx, s.y + R * 1.25);
      g.lineBetween(fx, s.y + R * 1.25, fx + Math.sin(ph) * 4, s.y + R * 1.7);
      g.fillStyle(0x1a1410, 1); g.fillRect(fx + Math.sin(ph) * 4 - 3, s.y + R * 1.66, 6, 5);
    };
    leg(dir * R * 0.9, gait); leg(dir * R * 0.6, gait + Math.PI); leg(-dir * R * 0.8, gait + Math.PI / 2); leg(-dir * R * 1.1, gait + Math.PI * 1.5);
    g.fillStyle(0x6a4a2e, 1); g.fillEllipse(s.x - dir * R * 0.9, s.y + R * 0.5, R * 1.3, R * 0.9);
    g.fillStyle(0xe8dcc0, 1); g.fillEllipse(s.x - dir * R * 1.4, s.y + R * 0.4, R * 0.35, R * 0.5);
    g.fillStyle(0x7a5634, 1); g.fillEllipse(s.x + dir * R * 0.9, s.y + R * 0.45, R * 1.2, R * 0.85);
    const hx = s.x + dir * R * 1.75, hy = s.y - R * 0.15 + Math.sin(gait) * 2;
    g.lineStyle(R * 0.36, 0x7a5634, 1); g.lineBetween(s.x + dir * R * 1.2, s.y + R * 0.3, hx, hy);
    g.fillStyle(0x7a5634, 1); g.fillEllipse(hx + dir * 8, hy, 26, 17);
    g.fillStyle(0x161210, 1); g.fillCircle(hx + dir * 18, hy + 3, 2.2); g.fillCircle(hx + dir * 6, hy - 3, 2);
    // Dewlap bell and harness in livery.
    g.fillStyle(0x4a3220, 1); g.fillTriangle(hx - dir * 4, hy + 6, hx + dir * 6, hy + 6, hx, hy + 22);
    g.lineStyle(3, HUNT_RED, 1); g.lineBetween(hx - dir * 6, hy - 4, hx + dir * 14, hy + 4);
    g.fillStyle(GILT, 1); g.fillCircle(hx - dir * 6, hy - 2, 2.5);
    antler(g, hx - dir * 2, hy - 8, 34, -dir, ANTLER, 5);
    antler(g, hx + dir * 6, hy - 8, 34, dir, lit(ANTLER, 0.1), 5);
    // Saddle-cloth under him.
    g.fillStyle(HUNT_RED, 1); g.fillRoundedRect(s.x - R * 0.9, s.y + R * 0.35, R * 1.8, R * 0.45, 5);
    g.fillStyle(GILT, 1); g.fillRect(s.x - R * 0.9, s.y + R * 0.72, R * 1.8, 3);
    // Oxblood cloak streaming back, fur-collared.
    const flap = Math.sin(ts * 6) * 5;
    g.fillStyle(dim(HUNT_RED, 0.25), 1);
    g.fillTriangle(s.x - dir * R * 0.3, s.y - R * 0.7, s.x - dir * R * 0.4, s.y + R * 0.3, s.x - dir * (R * 1.9 + flap), s.y + R * 0.1 - flap);
    g.fillStyle(FUR_LIT, 1); g.fillEllipse(s.x, s.y - R * 0.75, R * 1.3, R * 0.38);
    g.fillStyle(FUR, 1); g.fillEllipse(s.x, s.y - R * 0.7, R * 1.1, R * 0.25);
    huntingHorn(g, s.x - dir * R * 0.75, s.y + R * 0.05, 12, -dir);
  } else if (s.phaseIdx === 1) {
    // The wolf: ears up, a long muzzle toward you, hackles, a brush of a tail.
    g.fillStyle(WOLF_DARK, 1);
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 - dir * 0.3 + (k - 3) * 0.28;
      g.fillTriangle(s.x + Math.cos(a - 0.1) * R * 0.85, s.y + Math.sin(a - 0.1) * R * 0.85, s.x + Math.cos(a + 0.1) * R * 0.85, s.y + Math.sin(a + 0.1) * R * 0.85, s.x + Math.cos(a) * R * (1.25 + (k % 2) * 0.15), s.y + Math.sin(a) * R * (1.25 + (k % 2) * 0.15));
    }
    const sway = Math.sin(ts * 4) * 6;
    g.lineStyle(R * 0.4, WOLF, 1); g.lineBetween(s.x - dir * R * 0.8, s.y + R * 0.3, s.x - dir * R * 1.6, s.y + R * 0.1 + sway);
    g.fillStyle(WOLF_LIT, 1); g.fillCircle(s.x - dir * R * 1.65, s.y + R * 0.1 + sway, R * 0.2);
    for (const side of [-1, 1]) {
      g.fillStyle(WOLF, 1); g.fillTriangle(s.x + side * R * 0.65, s.y - R * 0.55, s.x + side * R * 0.25, s.y - R * 0.85, s.x + side * R * 0.55, s.y - R * 1.35);
      g.fillStyle(0xd8a8a0, 1); g.fillTriangle(s.x + side * R * 0.58, s.y - R * 0.62, s.x + side * R * 0.36, s.y - R * 0.82, s.x + side * R * 0.53, s.y - R * 1.15);
    }
    const mx = s.x + Math.cos(s.facing) * R * 0.75, my = s.y + Math.sin(s.facing) * R * 0.6 + R * 0.15;
    g.fillStyle(WOLF, 1); g.fillEllipse(mx, my, R * 0.8, R * 0.5);
    g.fillStyle(0x161210, 1); g.fillCircle(mx + Math.cos(s.facing) * R * 0.35, my + Math.sin(s.facing) * R * 0.2, 4);
    g.fillStyle(0xffffff, 1);
    for (const side of [-1, 1]) g.fillTriangle(mx - 6 + side * 6, my + 4, mx - 2 + side * 6, my + 4, mx - 4 + side * 6, my + 13);
    if (s.enraged) { g.fillStyle(BLOOD, 0.8); g.fillCircle(mx, my + 10, 3); }
  } else {
    // The pale huntsman: a towering ghost-rack and a cold wake.
    for (let i = 0; i < 5; i++) {
      const ph = ((ts * 0.6) + i / 5) % 1;
      g.fillStyle(GHOST, 0.25 * (1 - ph)); g.fillCircle(s.x - Math.cos(s.facing) * (20 + ph * 60), s.y + R * 0.3 - ph * 30, R * (0.5 + ph * 0.5));
    }
    antler(g, s.x - R * 0.25, s.y - R * 0.85, R * 1.5, -1, GHOST, 5, 0.85);
    antler(g, s.x + R * 0.25, s.y - R * 0.85, R * 1.5, 1, GHOST, 5, 0.85);
    for (let i = 0; i < 3; i++) {
      const a = ts * 1.4 + (i / 3) * Math.PI * 2;
      hound(g, s.x + Math.cos(a) * R * 1.8, s.y + Math.sin(a) * R * 1.1, Math.cos(a + Math.PI / 2) >= 0 ? 1 : -1, 0.6, ts * 10 + i, GHOST, 0.55);
    }
  }
  // The antler crown he never takes off (phases one and two) — gilt band, small tines.
  if (s.phaseIdx < 2) {
    const cy = s.y - R * 0.92;
    g.fillStyle(dim(GILT, 0.4), 1); g.fillRoundedRect(s.x - R * 0.45, cy - 3, R * 0.9, 8, 3);
    g.fillStyle(GILT, 1); g.fillRoundedRect(s.x - R * 0.42, cy - 2, R * 0.84, 5, 2);
    g.fillStyle(VERDIGRIS, 1); g.fillCircle(s.x, cy, 3);
    antler(g, s.x - R * 0.3, cy - 2, R * 0.6, -1, s.phaseIdx === 1 ? ANTLER_DARK : ANTLER, 3);
    antler(g, s.x + R * 0.3, cy - 2, R * 0.6, 1, s.phaseIdx === 1 ? ANTLER_DARK : ANTLER, 3);
  }
  if (s.hurt) { g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(s.x, s.y, R + 3); }
}

/** The Kill Ground in Fangholt's yard: log-end paving, a ring of turf round the quarry post, the trophy wall. */
function drawFangArena(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  const rng = mulberry(7121);
  const cx = W / 2, cy = (TOP + H) / 2 + 14;
  g.fillStyle(0x140e08, 1); g.fillRect(0, 0, W, H);
  // Log-end paving across the whole yard.
  for (let y = TOP + 4; y < H + 10; y += 21) {
    for (let x = ((y / 21) % 2) * 10; x < W + 10; x += 21) logEnd(g, x + (rng() - 0.5) * 2, y, 9 + rng() * 1.5, 0.85);
  }
  g.fillStyle(0x000000, 0.25); g.fillRect(0, TOP, W, H - TOP);
  // The run: an oval of trampled turf, ringed by a low kerb of split logs.
  g.fillStyle(0x3a4a22, 1); g.fillEllipse(cx, cy, W * 0.78, (H - TOP) * 0.72);
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    g.fillStyle(rng() < 0.5 ? MOSS : 0x2a3418, 0.5);
    g.fillEllipse(cx + Math.cos(a) * r * W * 0.36, cy + Math.sin(a) * r * (H - TOP) * 0.33, 30 + rng() * 50, 10 + rng() * 16);
  }
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, r = 0.3 + rng() * 0.6;
    pawprint(g, cx + Math.cos(a) * r * W * 0.36, cy + Math.sin(a) * r * (H - TOP) * 0.33, rng() * 6, 6, 0x1a140c, 0.5);
  }
  for (let k = 0; k < 7; k++) { const a = rng() * Math.PI * 2, r = rng() * 0.8; g.fillStyle(BLOOD, 0.3); g.fillEllipse(cx + Math.cos(a) * r * 300, cy + Math.sin(a) * r * 160, 14 + rng() * 20, 6 + rng() * 8); }
  g.lineStyle(10, BARK_DARK, 1); g.strokeEllipse(cx, cy, W * 0.78, (H - TOP) * 0.72);
  g.lineStyle(5, BARK, 1); g.strokeEllipse(cx, cy, W * 0.78 - 4, (H - TOP) * 0.72 - 4);
  // The quarry post at the centre: where the caps are tied before the count.
  g.fillStyle(0x000000, 0.35); g.fillEllipse(cx + 4, cy + 6, 50, 16);
  gardenersMark(g, cx, cy + 2, 30, dim(GILT, 0.4), 0.5);
  g.fillStyle(BARK_DARK, 1); g.fillCircle(cx, cy, 13);
  logEnd(g, cx, cy - 2, 11);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; antlerPair(g, cx + Math.cos(a) * 22, cy + Math.sin(a) * 12, 7, ANTLER_DARK, 0.8, false); }
  // The trophy wall along the top: log wall hung with racks and wolf-head shields.
  g.fillStyle(0x2a1c10, 1); g.fillRect(0, TOP, W, 54);
  for (let y = TOP + 2; y < TOP + 52; y += 13) { g.fillStyle(rng() < 0.5 ? 0x5a3a22 : 0x4a301c, 1); g.fillRoundedRect(-4, y, W + 8, 12, 6); }
  for (let x = 50; x < W; x += 92) {
    if (Math.floor(x / 92) % 3 === 1) { g.fillStyle(HUNT_RED, 1); g.fillRoundedRect(x - 16, TOP + 10, 32, 36, 6); wolfHead(g, x, TOP + 28, 9, ANTLER); }
    else antlerPair(g, x, TOP + 34, 24, rng() < 0.5 ? ANTLER : ANTLER_DARK, 1);
  }
  g.fillStyle(GILT, 1); g.fillRect(0, TOP + 52, W, 3);
  // Torches in the four corners and banners down the sides.
  for (const [tx, ty] of [[30, TOP + 90], [W - 30, TOP + 90], [30, H - 30], [W - 30, H - 30]] as const) {
    g.fillStyle(0xff8a3a, 0.08); g.fillCircle(tx, ty - 30, 60);
    g.fillStyle(0x2a2a2a, 1); g.fillRect(tx - 3, ty - 40, 6, 40);
    g.fillStyle(0xff8a3a, 0.9); g.fillTriangle(tx - 8, ty - 40, tx + 8, ty - 40, tx, ty - 62);
    g.fillStyle(0xffd060, 0.9); g.fillTriangle(tx - 4, ty - 40, tx + 4, ty - 40, tx, ty - 52);
  }
  for (const bx of [14, W - 14]) {
    g.fillStyle(HUNT_GREEN, 1); g.fillRect(bx - 8, TOP + 140, 16, H - TOP - 220);
    for (let y = TOP + 160; y < H - 90; y += 60) { g.fillStyle(LEAF_GOLD, 0.8); g.fillCircle(bx, y, 3); }
  }
}

// ── The def ──────────────────────────────────────────────────────────

export const FANG_BOSS: WorldBossDef = {
  worldId: 'isle:fang',
  name: 'Prince Fang',
  title: 'Master of the Wildhunt',
  color: MAIN,
  colorLit: LIT,
  colorDark: DARK,
  accent: ACCENT,
  damageMult: 1.05,

  intro: [
    'I\'ll give you the count of a hundred.',
    'Mother keeps a garden. Somebody has to keep the weeds running. One... two...',
  ],
  banter: [
    'Seventeen. Eighteen. You\'re not running. Why is nobody ever running properly?',
    'The pack has your scent. They always have it. It\'s the only thing they love.',
    'Short at the Tithe is short at the Tithe. Mother doesn\'t care how. I only care how fast.',
    'Every rack on my wall was a family once. Well. The racks were deer. You know what I mean.',
    'Fifty-one. Fifty-two. Mother says I count too slowly. I say it\'s kinder.',
    'You fight like quarry that thinks it\'s a hunter. I love those.',
  ],
  defeatLine: 'THE HUNT IS OVER',
  resumeLine: 'Back on the run? I lost count. Let\'s start again from one.',

  phases: [
    {
      name: 'The Chase',
      line: 'A hundred. Ready or not.',
      hp: 410,
      cycle: ['sig:hounds', 'volley', 'sig:ride', 'lanes', 'sig:spears', 'homing', 'sig:hounds', 'sig:ride'],
      harass: ['h-snipe', 'h-flak', 'h-lane'],
      restMs: 1150,
      harassMs: 3100,
    },
    {
      name: 'The Beast Within',
      line: 'You unhorsed me. Do you know what\'s under the cloak? Neither did Mother, till she grafted it.',
      hp: 490,
      cycle: ['sig:pounce', 'sig:howl', 'sig:rake', 'slamchain', 'sig:pounce', 'radial', 'sig:howl', 'barrage'],
      harass: ['h-orbs', 'h-rune', 'h-mines'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE HORN CALLS THE WHOLE FOREST',
    extraPhase: {
      name: 'The Wild Hunt',
      line: 'Every hunt I ever rode is riding still. Look up, quarry. Look UP.',
      hp: 360,
      cycle: ['sig:wildhunt', 'sig:hounds', 'sig:rake', 'quake', 'sig:wildhunt', 'sig:ride', 'sig:howl', 'spiral'],
      harass: ['h-lane', 'h-snipe', 'h-orbs'],
      restMs: 850,
      harassMs: 2400,
    },
  },

  tuning: {
    lanes: { halfW: 30, warnMs: 900 },
    volley: { count: 5, spreadRad: 0.5 },
  },

  signatures: {
    hounds: looseHounds,
    ride: rideDown,
    spears: spearAndLine,
    pounce,
    howl: bloodMoonHowl,
    rake,
    wildhunt: wildHunt,
  },

  look: {
    crest: 'horns', pattern: 'weave', aura: 'leaves', hands: 'gauntlet',
    torsoR: 36, mouth: 'line', eyes: 2, eyeColor: 0xffc84a,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'rush', gimmick: 'none', tint: 'blood', look: { crest: 'mane', pattern: 'cracks', aura: 'dust', hands: 'claw', mouth: 'maw' } },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { crest: 'veil', pattern: 'swirl', aura: 'smoke', hands: 'wisp', mouth: 'none', eyeColor: GHOST } },
  ],

  drawDecor: drawFangDecor,
  drawArena: drawFangArena,
};

