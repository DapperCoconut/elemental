import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry, type G } from '../../../../art/IsleArt';
import { superball, toySoldier, windKey } from './art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CANVAS, CREPE, IRON, IRON_LIT, LATEX, LATEX_LIT, RUBBER, RUBBER_SHEEN, SPROCKET,
  SPROCKET_DARK, SPROCKET_LIT, TIN, TOY_BLUE, TOY_COLORS, TOY_GREEN, TOY_RED, TOY_VIOLET, TOY_YELLOW,
} from './palette';
import { clamp, dist, hop, segDist } from './util';

/**
 * Prince Sprocket, the Wound-Up — Empress Ohmrine's youngest, governor of the Bounce Court.
 *
 * When he was four he would not sit still, and his mother could not bear it. She had the court
 * toymaker build him a tin-plate back with a brass key in it, and told him that toys which run
 * down are put away. He has not stopped moving since. His winder turns the key a hundred times
 * every morning; the whole town winds its skeins all day to light his Toy Works at night; and the
 * Prince bounces, and plays, and makes everyone play with him, because if he stops he will be
 * put in the Box. He fights the way a toy box empties:
 *
 * • **Wind-Up** (orbiting): on his pogo spring he bounces in arcs and stamps down where you
 *   stood; his key turns and he lets go a ring of tin cogs that roll to the walls and bounce once;
 *   jack-in-the-boxes drop round you and their jacks spring out on a tune.
 * • **Stretch** (stalking, hot): his limbs turn to rubber. An arm whips across the room in an
 *   arc; a hand flies out to where you stand and, if it catches you, reels you in for a squeeze;
 *   he plants both hands, draws himself back like a slingshot and fires himself at you, and
 *   rebounds.
 * • **Snapback** (hard, rushing, gold): everything rebounds. Every shot fired in the room — his
 *   and yours — banks off the walls instead of leaving it; he throws superballs that bank off
 *   every wall, faster each time, and the walls of the room themselves flex and spring inward in
 *   a closing ring with one gap.
 */

/** True while the rig is drawn in the Snapback phase — read by the wall rebound. */
let snapNow = false;

const TOP = 96;

// ── Shared: bouncing toys ────────────────────────────────────────────

interface Bouncer {
  x: number; y: number; vx: number; vy: number; r: number;
  bounces: number; maxB: number; speedUp: number; dmg: number; color: number; dieAt: number; spin: number;
}

/** Moves bouncers, banks them off the walls, hits the player; returns the survivors. */
function stepBouncers(tk: BossToolkit, list: Bouncer[], dt: number, time: number): Bouncer[] {
  const p = tk.player;
  const out: Bouncer[] = [];
  for (const b of list) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.spin += Math.hypot(b.vx, b.vy) * dt * 0.04;
    let hitWall = false;
    if (b.x < 30 + b.r) { b.x = 30 + b.r; b.vx = Math.abs(b.vx); hitWall = true; }
    if (b.x > tk.W - 30 - b.r) { b.x = tk.W - 30 - b.r; b.vx = -Math.abs(b.vx); hitWall = true; }
    if (b.y < TOP + 10 + b.r) { b.y = TOP + 10 + b.r; b.vy = Math.abs(b.vy); hitWall = true; }
    if (b.y > tk.H - 20 - b.r) { b.y = tk.H - 20 - b.r; b.vy = -Math.abs(b.vy); hitWall = true; }
    if (hitWall) {
      b.bounces++;
      if (b.bounces > b.maxB) continue;
      b.vx *= b.speedUp; b.vy *= b.speedUp;
      tk.sfx('boing');
    }
    if (time > b.dieAt) continue;
    if (p.active && p.hp > 0 && dist(b.x, b.y, p.x, p.y) < b.r + 20) { tk.hitPlayer(b.dmg, b.x, b.y); continue; }
    out.push(b);
  }
  return out;
}

/** A tin cog wheel: toothed rim, spokes, a brass hub. */
function cog(g: G, x: number, y: number, r: number, a: number, c: number): void {
  const teeth = 10;
  g.fillStyle(dim(c, 0.3), 1);
  for (let i = 0; i < teeth; i++) {
    const b = a + (i / teeth) * Math.PI * 2;
    g.fillTriangle(x + Math.cos(b - 0.18) * r, y + Math.sin(b - 0.18) * r, x + Math.cos(b + 0.18) * r, y + Math.sin(b + 0.18) * r, x + Math.cos(b) * (r + 5), y + Math.sin(b) * (r + 5));
  }
  g.fillStyle(c, 1); g.fillCircle(x, y, r);
  g.fillStyle(lit(c, 0.3), 0.7); g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.4);
  g.lineStyle(2, dim(c, 0.4), 1);
  for (let i = 0; i < 4; i++) { const b = a + (i / 4) * Math.PI * 2; g.lineBetween(x, y, x + Math.cos(b) * r * 0.8, y + Math.sin(b) * r * 0.8); }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r * 0.28);
}

/** A rubber limb from (ax, ay) to (bx, by): a thick band, bowed by `bow`, with a fist at the end. */
function rubberArm(g: G, ax: number, ay: number, bx: number, by: number, bow: number, color: number): void {
  const mx = (ax + bx) / 2 - (by - ay) * bow, my = (ay + by) / 2 + (bx - ax) * bow;
  const len = Math.hypot(bx - ax, by - ay);
  const w = clamp(12 - len / 60, 5, 12);
  const N = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push({ x: (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx, y: (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by });
  }
  for (const [lw, c, a] of [[w + 4, RUBBER, 1], [w, color, 1], [2, lit(color, 0.4), 0.6]] as [number, number, number][]) {
    g.lineStyle(lw, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  }
  // Stretch marks: pale rings where the rubber is thinnest.
  for (let i = 3; i < N; i += 3) { g.lineStyle(1.5, LATEX_LIT, 0.4); g.strokeCircle(pts[i].x, pts[i].y, w * 0.5); }
  // The tin fist.
  g.fillStyle(RUBBER, 1); g.fillCircle(bx, by, 13);
  g.fillStyle(TIN, 1); g.fillCircle(bx, by, 11);
  g.fillStyle(lit(TIN, 0.4), 1); g.fillCircle(bx - 3, by - 3, 4);
  for (let k = -1; k <= 1; k++) { g.lineStyle(1.5, dim(TIN, 0.4), 1); g.lineBetween(bx + k * 4, by - 9, bx + k * 4, by - 3); }
}

// ── Signature: Pogo Stamp (Wind-Up) ──────────────────────────────────
// Three hops (four on hard), each to where you stand as it starts: a dashed arc, a ring where he
// will come down, then the stamp.

interface Hop { fx: number; fy: number; tx: number; ty: number; start: number; arrive: number; landed: boolean }

const pogo = (tk: BossToolkit): SignatureMove => {
  const N = tk.hard ? 4 : 3;
  const WARN = 430, TRAVEL = 380;
  let hops: Hop[] = [];
  let tacks: Bouncer[] = [];
  const hopOnce = () => {
    const p = tk.player;
    const tx = tk.clampX(p.x, 90), ty = tk.clampY(p.y, 90);
    const now = tk.now;
    tk.spawnCharge({ toX: tx, toY: ty, warnMs: WARN, travelMs: TRAVEL, halfW: 6, damage: 7 });
    tk.spawnZone({ x: tx, y: ty, radius: 78, warnMs: WARN + TRAVEL / tk.telegraphScale, damage: 14 });
    hops.push({ fx: tk.bossX, fy: tk.bossY, tx, ty, start: now + tk.warn(WARN), arrive: now + tk.warn(WARN) + TRAVEL, landed: false });
    tk.sfx('boing');
  };
  return {
    durationMs: 3300 + (N - 3) * 1100,
    windupMs: 600,
    gesture: 'slam',
    locksBody: true,
    tell: 'POGO STAMP',
    cast() {
      hops = [];
      const step = tk.warn(WARN) + TRAVEL + 240;
      for (let i = 0; i < N; i++) tk.schedule(i * step, hopOnce);
    },
    update(time, dt) {
      for (const h of hops) {
        if (h.landed || time < h.arrive) continue;
        h.landed = true;
        tk.sfx('stone-slam');
        if (tk.hard) {
          // Tin tacks jolted off the spring.
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.random();
            tacks.push({ x: h.tx, y: h.ty, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 5, bounces: 0, maxB: 0, speedUp: 1, dmg: 5, color: IRON_LIT, dieAt: time + 3000, spin: 0 });
          }
        }
      }
      hops = hops.filter((h) => time < h.arrive + 600);
      tacks = stepBouncers(tk, tacks, dt, time);
    },
    drawGround(g, time) {
      for (const h of hops) {
        if (time < h.arrive) {
          // The spring's shadow waiting at the landing.
          const k = clamp((time - (h.start - tk.warn(WARN))) / (h.arrive - h.start + tk.warn(WARN)), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(h.tx, h.ty + 6, 30 + k * 30, 10 + k * 8);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + time / 400;
            g.fillStyle(SPROCKET_LIT, 0.4 + k * 0.4); g.fillCircle(h.tx + Math.cos(a) * 64, h.ty + Math.sin(a) * 64, 2.5);
          }
        } else {
          const k = (time - h.arrive) / 600;
          g.lineStyle(5 * (1 - k), SPROCKET, 1 - k); g.strokeCircle(h.tx, h.ty, 30 + k * 70);
          for (let i = 0; i < 6; i++) { g.lineStyle(2, IRON_LIT, 1 - k); const a = i * 1.05; g.lineBetween(h.tx + Math.cos(a) * 14, h.ty + Math.sin(a) * 9, h.tx + Math.cos(a) * (24 + k * 30), h.ty + Math.sin(a) * (16 + k * 20)); }
        }
      }
    },
    drawAir(g, time) {
      for (const h of hops) {
        if (time >= h.arrive) continue;
        const peak = 80 + dist(h.fx, h.fy, h.tx, h.ty) * 0.25;
        const k = time < h.start ? 0 : (time - h.start) / (h.arrive - h.start);
        for (let i = 0; i <= 18; i++) {
          const q = i / 18;
          if (q < k) continue;
          const x = h.fx + (h.tx - h.fx) * q, y = h.fy + (h.ty - h.fy) * q - hop(q, peak);
          g.fillStyle(SPROCKET_LIT, i % 2 ? 0.25 : 0.6); g.fillCircle(x, y, 2.2);
        }
        if (time >= h.start) {
          // A ghost of him at the top of the arc, so the hop reads as up-and-over.
          const x = h.fx + (h.tx - h.fx) * k, y = h.fy + (h.ty - h.fy) * k - hop(k, peak);
          g.lineStyle(2, SPROCKET, 0.35); g.strokeCircle(x, y, 22);
          g.lineStyle(2, IRON_LIT, 0.4); for (let c = 0; c < 4; c++) g.strokeEllipse(x, y + 26 + c * 5, 14, 4);
        }
      }
      for (const t of tacks) { g.fillStyle(t.color, 1); g.fillCircle(t.x, t.y, t.r); g.lineStyle(1.5, LATEX_LIT, 0.8); g.lineBetween(t.x, t.y, t.x, t.y - 7); }
    },
    onPhaseEnd() { hops = []; tacks = []; },
  };
};

// ── Signature: Wind-Up (Wind-Up) ─────────────────────────────────────
// He plants; the key in his back turns three clicks while eight spokes of light show where the
// cogs will go; then he lets go and eight tin cogs roll out to the walls, bank once, and keep rolling.

const keywind = (tk: BossToolkit): SignatureMove => {
  let releaseAt = -1;
  let castAt = 0;
  let aim = 0;
  let cogs: Bouncer[] = [];
  const angles = () => Array.from({ length: 8 }, (_, i) => aim + Math.PI / 8 + (i / 8) * Math.PI * 2);
  return {
    durationMs: 1700,
    windupMs: 500,
    hold: 'brace',
    locksBody: true,
    tell: 'WIND-UP',
    cast(time) {
      castAt = time;
      releaseAt = time + tk.warn(800);
      aim = tk.angleToPlayer();
      for (let k = 0; k < 3; k++) tk.schedule((tk.warn(800) * k) / 3, () => tk.sfx('clock-tick'));
    },
    update(time, dt) {
      if (releaseAt > 0 && time >= releaseAt) {
        releaseAt = -1;
        for (const a of angles()) {
          cogs.push({ x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 11, bounces: 0, maxB: 1, speedUp: 1.1, dmg: 9, color: TOY_COLORS[Math.floor(Math.random() * TOY_COLORS.length)], dieAt: time + 6000, spin: Math.random() * 6 });
        }
        tk.sfx('gear-turn');
      }
      cogs = stepBouncers(tk, cogs, dt, time);
    },
    drawGround(g, time) {
      if (releaseAt < 0) return;
      const k = clamp((time - castAt) / (releaseAt - castAt), 0, 1);
      for (const a of angles()) {
        g.lineStyle(10, BRASS, 0.05 + k * 0.12);
        g.lineBetween(tk.bossX + Math.cos(a) * 34, tk.bossY + Math.sin(a) * 34, tk.bossX + Math.cos(a) * (60 + k * 300), tk.bossY + Math.sin(a) * (60 + k * 300));
        g.fillStyle(BRASS_LIT, 0.3 + k * 0.5); g.fillCircle(tk.bossX + Math.cos(a) * (60 + k * 300), tk.bossY + Math.sin(a) * (60 + k * 300), 4);
      }
    },
    drawAir(g) {
      for (const c of cogs) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x + 3, c.y + c.r + 3, c.r * 2, c.r * 0.6);
        cog(g, c.x, c.y, c.r, c.spin, c.color);
      }
    },
    onPhaseEnd() { releaseAt = -1; cogs = []; },
  };
};

// ── Signature: Jack-in-the-Box (Wind-Up) ─────────────────────────────
// Boxes drop round you; each one's crank turns on a little tune; then, one after another, each
// aims at you (a stripe of light) and its jack springs out down that stripe.

interface Jack { x: number; y: number; dropAt: number; aimAt: number; fireAt: number; angle: number; aimed: boolean; fired: boolean; color: number }

const jackbox = (tk: BossToolkit): SignatureMove => {
  let jacks: Jack[] = [];
  const REACH = 520;
  return {
    durationMs: 3000,
    windupMs: 550,
    gesture: 'clap',
    tell: 'JACK-IN-THE-BOX',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const base = Math.random() * Math.PI * 2;
      jacks = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 200, 60), y = tk.clampY(p.y + Math.sin(a) * 170, 60);
        const aimAt = time + tk.warn(700) + i * 300;
        jacks.push({ x, y, dropAt: time, aimAt, fireAt: aimAt + tk.warn(650), angle: 0, aimed: false, fired: false, color: TOY_COLORS[(i * 2) % TOY_COLORS.length] });
      }
      tk.sfx('trap-set');
    },
    update(time) {
      const p = tk.player;
      for (const j of jacks) {
        if (!j.aimed && time >= j.aimAt) { j.aimed = true; j.angle = Math.atan2(p.y - j.y, p.x - j.x); tk.sfx('countdown-tick'); }
        if (j.aimed && !j.fired && time >= j.fireAt) {
          j.fired = true;
          tk.sfx('boing');
          const ex = j.x + Math.cos(j.angle) * REACH, ey = j.y + Math.sin(j.angle) * REACH;
          if (p.active && p.hp > 0 && segDist(p.x, p.y, j.x, j.y, ex, ey) < 20 + 14) tk.hitPlayer(13, p.x, p.y);
        }
      }
      jacks = jacks.filter((j) => !j.fired || time < j.fireAt + 900);
    },
    drawGround(g, time) {
      for (const j of jacks) {
        if (!j.aimed || j.fired) continue;
        const k = clamp((time - j.aimAt) / (j.fireAt - j.aimAt), 0, 1);
        const ex = j.x + Math.cos(j.angle) * REACH, ey = j.y + Math.sin(j.angle) * REACH;
        g.lineStyle(28, j.color, 0.08 + k * 0.16); g.lineBetween(j.x, j.y, ex, ey);
        g.lineStyle(2, j.color, 0.4 + k * 0.5); g.lineBetween(j.x, j.y, ex, ey);
      }
    },
    drawAir(g, time) {
      for (const j of jacks) {
        const drop = clamp((time - j.dropAt) / 300, 0, 1);
        const y = j.y - (1 - drop) * 120;
        // The box.
        g.fillStyle(0x000000, 0.3 * drop); g.fillEllipse(j.x, j.y + 14, 40, 12);
        g.fillStyle(dim(j.color, 0.3), 1); g.fillRect(j.x - 17, y - 20, 34, 32);
        g.fillStyle(j.color, 1); g.fillRect(j.x - 15, y - 18, 30, 28);
        g.fillStyle(LATEX_LIT, 0.8); g.fillRect(j.x - 15, y - 8, 30, 4);
        // The crank, turning to the tune until it pops.
        const ca = j.fired ? 0 : time / 90;
        g.lineStyle(2, BRASS, 1); g.lineBetween(j.x + 17, y - 4, j.x + 17 + Math.cos(ca) * 8, y - 4 + Math.sin(ca) * 8);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(j.x + 17 + Math.cos(ca) * 8, y - 4 + Math.sin(ca) * 8, 2.5);
        if (!j.fired) {
          g.fillStyle(dim(j.color, 0.4), 1); g.fillRect(j.x - 18, y - 24, 36, 6);
          if (j.aimed && Math.sin(time / 40) > 0) { g.fillStyle(0xffffff, 0.5); g.fillRect(j.x - 18, y - 24, 36, 6); }
          continue;
        }
        // The jack, out on its spring down the stripe.
        const k = clamp((time - j.fireAt) / 140, 0, 1) * (1 - clamp((time - j.fireAt - 500) / 400, 0, 1));
        const ex = j.x + Math.cos(j.angle) * REACH * k, ey = y - 20 + Math.sin(j.angle) * REACH * k;
        g.lineStyle(2.5, IRON_LIT, 1);
        g.beginPath(); g.moveTo(j.x, y - 20);
        for (let i = 1; i <= 24; i++) {
          const q = i / 24;
          const px = j.x + (ex - j.x) * q - Math.sin(j.angle) * Math.sin(q * Math.PI * 12) * 6;
          const py = y - 20 + (ey - y + 20) * q + Math.cos(j.angle) * Math.sin(q * Math.PI * 12) * 6;
          g.lineTo(px, py);
        }
        g.strokePath();
        g.fillStyle(LATEX_LIT, 1); g.fillCircle(ex, ey, 12);
        g.fillStyle(TOY_RED, 1); g.fillCircle(ex, ey + 1, 3.5);
        g.fillStyle(RUBBER, 1); g.fillCircle(ex - 4, ey - 4, 1.8); g.fillCircle(ex + 4, ey - 4, 1.8);
        g.fillStyle(j.color, 1); g.fillTriangle(ex - 10, ey - 8, ex + 10, ey - 8, ex, ey - 26);
        g.fillStyle(TOY_YELLOW, 1); g.fillCircle(ex, ey - 26, 3);
      }
    },
    onPhaseEnd() { jacks = []; },
  };
};

// ── Signature: Rubber Whip (Stretch) ─────────────────────────────────
// An arm stretches out and sweeps across the room in an arc through you; on hard it comes back.

const whip = (tk: BossToolkit): SignatureMove => {
  let swings: { ox: number; oy: number; a0: number; a1: number; warnAt: number; startsAt: number; endsAt: number }[] = [];
  let dir = 1;
  const LEN = 440, TRAVEL = 620;
  const swing = (a0: number, a1: number) => {
    tk.spawnSweep({ ox: tk.bossX, oy: tk.bossY, a0, a1, warnMs: 650, travelMs: TRAVEL, halfW: 18, damage: 13, length: LEN });
    const now = tk.now;
    swings.push({ ox: tk.bossX, oy: tk.bossY, a0, a1, warnAt: now, startsAt: now + tk.warn(650), endsAt: now + tk.warn(650) + TRAVEL });
    tk.sfx('whip');
  };
  return {
    durationMs: 2000 + (tk.hard ? 1200 : 0),
    windupMs: 450,
    gesture: 'sweep',
    locksBody: true,
    tell: 'RUBBER WHIP',
    cast() {
      const a = tk.angleToPlayer();
      dir = -dir;
      swing(a - 1.3 * dir, a + 1.3 * dir);
      if (tk.hard) tk.schedule(tk.warn(650) + TRAVEL + 200, () => { const b = tk.angleToPlayer(); swing(b + 1.3 * dir, b - 1.3 * dir); });
    },
    update(time) { swings = swings.filter((s) => time < s.endsAt + 300); },
    drawAir(g, time) {
      for (const s of swings) {
        if (time < s.startsAt) {
          // Coiling back: the arm drawn short behind him, shivering.
          const k = (time - s.warnAt) / (s.startsAt - s.warnAt);
          const back = s.a0 + Math.PI * 0.85 * Math.sign(s.a0 - s.a1);
          rubberArm(g, s.ox, s.oy, s.ox + Math.cos(back) * (40 + k * 30), s.oy + Math.sin(back) * (40 + k * 30) + Math.sin(time / 30) * 2, 0.2, SPROCKET);
          continue;
        }
        const k = clamp((time - s.startsAt) / (s.endsAt - s.startsAt), 0, 1);
        const a = s.a0 + (s.a1 - s.a0) * k;
        const lag = s.a0 + (s.a1 - s.a0) * Math.max(0, k - 0.12);
        const len = time > s.endsAt ? LEN * (1 - (time - s.endsAt) / 300) : LEN;
        const tx = s.ox + Math.cos(a) * len, ty = s.oy + Math.sin(a) * len;
        rubberArm(g, s.ox, s.oy, tx, ty, (a - lag) * 0.6 * Math.sign(s.a1 - s.a0), SPROCKET);
        // The whoosh trail behind the fist.
        for (let i = 1; i < 6; i++) {
          const b = a - (s.a1 - s.a0) * 0.03 * i;
          g.fillStyle(SPROCKET_LIT, 0.35 - i * 0.05); g.fillCircle(s.ox + Math.cos(b) * len, s.oy + Math.sin(b) * len, 10 - i);
        }
      }
    },
    onPhaseEnd() { swings = []; },
  };
};

// ── Signature: Long Reach (Stretch) ──────────────────────────────────
// A hand flies out to where you stand (a ring shows where). Caught, you are reeled in to him and
// squeezed — a ring closes round him; get out before it does.

const grab = (tk: BossToolkit): SignatureMove => {
  let tx = 0, ty = 0;
  let castAt = 0, fireAt = -1, reelUntil = 0, missAt = -1;
  let caught = false;
  return {
    durationMs: 2800,
    windupMs: 450,
    gesture: 'point',
    hold: 'reach',
    locksBody: true,
    tell: 'LONG REACH',
    cast(time) {
      const p = tk.player;
      tx = tk.clampX(p.x); ty = tk.clampY(p.y);
      castAt = time;
      fireAt = time + tk.warn(850);
      caught = false;
      missAt = -1;
      tk.spawnZone({ x: tx, y: ty, radius: 58, warnMs: 850, damage: 7 });
      tk.sfx('whip');
      tk.schedule(tk.warn(850), () => {
        const q = tk.player;
        if (q.active && q.hp > 0 && dist(q.x, q.y, tx, ty) < 64) {
          caught = true;
          reelUntil = tk.now + 1200;
          tk.pull(tk.bossX, tk.bossY, 130, 1200);
          tk.slowPlayer(0.55, 1200);
          tk.spawnZone({ x: tk.bossX, y: tk.bossY, radius: 96, warnMs: 1200 / tk.telegraphScale, damage: 15 });
          tk.sfx('chain');
        } else {
          missAt = tk.now;
          tk.sfx('stone-slam');
        }
      });
    },
    update(time) { if (fireAt > 0 && time > fireAt + 2000) fireAt = -1; },
    drawAir(g, time) {
      if (fireAt < 0) return;
      const ox = tk.bossX, oy = tk.bossY;
      let hx: number, hy: number;
      if (time < fireAt) {
        const k = clamp((time - castAt) / (fireAt - castAt), 0, 1);
        const e = 1 - Math.pow(1 - k, 3);
        hx = ox + (tx - ox) * e; hy = oy + (ty - oy) * e - hop(e, 50);
      } else if (caught && time < reelUntil) {
        const p = tk.player;
        hx = p.x; hy = p.y - 4;
        // The squeeze: the hand's fingers round you.
        g.lineStyle(4, SPROCKET, 0.9); g.strokeCircle(p.x, p.y - 4, 24);
      } else {
        const t0 = missAt > 0 ? missAt : reelUntil;
        const k = clamp((time - t0) / 300, 0, 1);
        if (k >= 1) return;
        hx = tx + (ox - tx) * k; hy = ty + (oy - ty) * k;
      }
      rubberArm(g, ox, oy, hx, hy, Math.sin(time / 120) * 0.08, mixC(SPROCKET, TOY_VIOLET, 0.25));
    },
    onPhaseEnd() { fireAt = -1; },
  };
};

// ── Signature: Slingshot (Stretch) ───────────────────────────────────
// He grips two pegs either side of him, draws himself back on his own arms, and fires himself
// at you past where you stand; then the arms snap him back the way he came.

const slingshot = (tk: BossToolkit): SignatureMove => {
  let pegs: { x: number; y: number }[] = [];
  let castAt = 0, launchAt = -1, backAt = -1;
  let home = { x: 0, y: 0 };
  return {
    durationMs: 3400,
    windupMs: 500,
    hold: 'draw',
    locksBody: true,
    tell: 'SLINGSHOT',
    cast(time) {
      const a = tk.angleToPlayer();
      home = { x: tk.bossX, y: tk.bossY };
      const px = -Math.sin(a), py = Math.cos(a);
      pegs = [-1, 1].map((k) => ({ x: tk.clampX(home.x + px * k * 90 + Math.cos(a) * 30, 40), y: tk.clampY(home.y + py * k * 90 + Math.sin(a) * 30, 40) }));
      const p = tk.player;
      const toX = tk.clampX(p.x + Math.cos(a) * 170, 90), toY = tk.clampY(p.y + Math.sin(a) * 170, 90);
      castAt = time;
      launchAt = time + tk.warn(900);
      tk.spawnCharge({ toX, toY, warnMs: 900, travelMs: 420, halfW: 30, damage: 16 });
      tk.sfx('beam-charge');
      const back = tk.warn(900) + 420 + 250;
      backAt = time + back;
      tk.schedule(back, () => {
        tk.spawnCharge({ toX: home.x, toY: home.y, warnMs: 380, travelMs: 380, halfW: 26, damage: 11 });
        tk.sfx('snap-back');
      });
      tk.schedule(tk.warn(900), () => tk.sfx('snap-back'));
    },
    update(time) { if (launchAt > 0 && time > backAt + tk.warn(380) + 600) launchAt = -1; },
    drawGround(g) {
      if (launchAt < 0) return;
      for (const p of pegs) {
        g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 6, 24, 8);
        g.fillStyle(IRON, 1); g.fillRect(p.x - 4, p.y - 18, 8, 22);
        g.fillStyle(BRASS, 1); g.fillCircle(p.x, p.y - 20, 6);
      }
    },
    drawAir(g, time) {
      if (launchAt < 0) return;
      const bx = tk.bossX, by = tk.bossY;
      if (time < launchAt) {
        // Drawn back: both arms from the pegs to him, thinning as they stretch, quivering.
        const k = clamp((time - castAt) / (launchAt - castAt), 0, 1);
        for (const p of pegs) rubberArm(g, bx, by, p.x, p.y - 20, Math.sin(time / 25) * 0.03 * k, SPROCKET);
        glow(g, bx, by, 40 + k * 20, SPROCKET_LIT, 0.03 + k * 0.05, 3);
      } else if (time < launchAt + 500 || (time > backAt && time < backAt + tk.warn(380) + 380)) {
        // Released: the arms whip after him from the pegs.
        for (const p of pegs) {
          const mx = (p.x + bx) / 2 + Math.sin(time / 20) * 12, my = (p.y + by) / 2 + Math.cos(time / 20) * 12;
          g.lineStyle(6, RUBBER, 0.9); g.lineBetween(p.x, p.y - 20, mx, my); g.lineBetween(mx, my, bx, by);
          g.lineStyle(3, SPROCKET, 1); g.lineBetween(p.x, p.y - 20, mx, my); g.lineBetween(mx, my, bx, by);
        }
      }
    },
    onPhaseEnd() { launchAt = -1; },
  };
};

// ── Signature: Rebound (Snapback) ────────────────────────────────────
// A fan of aim lines, then five superballs that bank off every wall, faster each time. Through
// the whole Snapback phase (not only while this move is cast) every fighter's shot that reaches
// the edge of the room banks back off the wall, still its owner's.

const rebound = (tk: BossToolkit): SignatureMove => {
  let balls: Bouncer[] = [];
  let aim = 0, castAt = 0, releaseAt = -1;
  const N = 5;
  const EDGE = 26;
  let rings: { x: number; y: number; at: number }[] = [];
  let boingAt = 0;
  /** Shots at the walls bank back in: the walls' inward normals, kept owner. */
  const bankShots = (time: number): void => {
    const x0 = 30, x1 = tk.W - 30, y0 = TOP + 10, y1 = tk.H - 20;
    const cx = tk.W / 2, cy = (TOP + tk.H) / 2;
    for (const sh of tk.shotsNear(cx, cy, Math.hypot(tk.W, tk.H))) {
      const nx = sh.x < x0 + EDGE ? 1 : sh.x > x1 - EDGE ? -1 : 0;
      const ny = sh.y < y0 + EDGE ? 1 : sh.y > y1 - EDGE ? -1 : 0;
      if (!nx && !ny) continue;
      if (!sh.reflect(nx, ny, true)) continue;
      if (rings.length < 12 && !rings.some((r) => Math.hypot(r.x - sh.x, r.y - sh.y) < 40 && time - r.at < 200)) rings.push({ x: sh.x, y: sh.y, at: time });
      if (time - boingAt > 150) { boingAt = time; tk.sfx('boing'); }
    }
    rings = rings.filter((r) => time - r.at < 300);
  };
  return {
    durationMs: 1700,
    windupMs: 450,
    gesture: 'punch',
    tell: 'SNAPBACK',
    cast(time) {
      aim = tk.angleToPlayer();
      castAt = time;
      releaseAt = time + tk.warn(500);
    },
    update(time, dt) {
      if (releaseAt > 0 && time >= releaseAt) {
        releaseAt = -1;
        for (let i = 0; i < N; i++) {
          const a = aim + (i - (N - 1) / 2) * 0.26;
          balls.push({ x: tk.bossX, y: tk.bossY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 10, bounces: 0, maxB: 3, speedUp: 1.13, dmg: 9, color: [TOY_RED, TOY_YELLOW, TOY_BLUE, TOY_GREEN, TOY_VIOLET][i], dieAt: time + 7000, spin: i });
        }
        tk.sfx('boing');
      }
      balls = stepBouncers(tk, balls, dt, time);
      if (snapNow) bankShots(time);
    },
    drawGround(g, time) {
      if (releaseAt < 0) return;
      const k = clamp((time - castAt) / (releaseAt - castAt), 0, 1);
      for (let i = 0; i < N; i++) {
        const a = aim + (i - (N - 1) / 2) * 0.26;
        g.lineStyle(2, BRASS_LIT, 0.2 + k * 0.5);
        g.lineBetween(tk.bossX + Math.cos(a) * 30, tk.bossY + Math.sin(a) * 30, tk.bossX + Math.cos(a) * (80 + k * 200), tk.bossY + Math.sin(a) * (80 + k * 200));
      }
    },
    drawAir(g, time) {
      // A shot banking off the wall: a flex ring.
      for (const r of rings) {
        const k = clamp((time - r.at) / 300, 0, 1);
        g.lineStyle(3 * (1 - k) + 0.5, SPROCKET_LIT, 1 - k); g.strokeCircle(r.x, r.y, 6 + k * 16);
      }
      for (const b of balls) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x + 3, b.y + b.r + 3, b.r * 2, b.r * 0.6);
        superball(g, b.x, b.y, b.r + b.bounces, b.color, b.spin);
        if (b.bounces) { g.lineStyle(1.5, 0xffffff, 0.3 * b.bounces); g.strokeCircle(b.x, b.y, b.r + b.bounces + 4); }
      }
    },
    onPhaseEnd() { balls = []; releaseAt = -1; rings = []; snapNow = false; },
  };
};

// ── Signature: Recoil (Snapback) ─────────────────────────────────────
// The walls of the playroom bulge outward as he pushes, then spring back in: a ring closing from
// the walls with one gap (an arrow marks it). On hard a second ring follows, its gap shifted.

const recoil = (tk: BossToolkit): SignatureMove => {
  let castAt = -1;
  let gaps: number[] = [];
  const midY = () => (TOP + tk.H) / 2;
  return {
    durationMs: 3000,
    windupMs: 500,
    hold: 'brace',
    tell: 'RECOIL',
    cast(time) {
      castAt = time;
      const base = tk.angleToPlayer(tk.W / 2, midY()) + (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.6);
      gaps = [base];
      tk.spawnRing({ cx: tk.W / 2, cy: midY(), delayMs: 1100, speed: -240, gapCentre: base, gapHalf: 0.55, band: 22, damage: 14, startRadius: 600 });
      if (tk.hard) {
        const g2 = base + 0.4;
        gaps.push(g2);
        tk.spawnRing({ cx: tk.W / 2, cy: midY(), delayMs: 1800, speed: -240, gapCentre: g2, gapHalf: 0.55, band: 22, damage: 14, startRadius: 600 });
      }
      tk.sfx('gravity-slam');
    },
    drawGround(g, time) {
      if (castAt < 0) return;
      const k = (time - castAt) / 1100;
      if (k > 2.5) { castAt = -1; return; }
      // The walls flexing: bulging out, then snapping in.
      const flex = k < 1 ? Math.sin(k * Math.PI * 0.5) : Math.max(0, 1 - (k - 1) * 3);
      const W = tk.W, H = tk.H;
      g.lineStyle(10, SPROCKET, 0.25 + flex * 0.4);
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const x = (i / 20) * W, y = TOP + 6 - Math.sin((i / 20) * Math.PI) * 14 * flex; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokePath();
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const x = (i / 20) * W, y = H - 6 + Math.sin((i / 20) * Math.PI) * 14 * flex; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokePath();
      for (const x0 of [6, W - 6]) {
        g.beginPath();
        for (let i = 0; i <= 14; i++) { const y = TOP + (i / 14) * (H - TOP), x = x0 + (x0 < W / 2 ? -1 : 1) * Math.sin((i / 14) * Math.PI) * 14 * flex; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.strokePath();
      }
      // Arrows pointing out through each gap.
      for (const ga of gaps) {
        const r = 230;
        const x = W / 2 + Math.cos(ga) * r, y = midY() + Math.sin(ga) * r;
        g.fillStyle(TOY_YELLOW, 0.5 + Math.sin(time / 90) * 0.3);
        g.fillTriangle(x + Math.cos(ga) * 22, y + Math.sin(ga) * 22, x + Math.cos(ga + 2.4) * 14, y + Math.sin(ga + 2.4) * 14, x + Math.cos(ga - 2.4) * 14, y + Math.sin(ga - 2.4) * 14);
        g.lineStyle(2, TOY_YELLOW, 0.4); g.strokeCircle(x, y, 26);
      }
    },
    onPhaseEnd() { castAt = -1; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const SPROCKET_BOSS: WorldBossDef = {
  worldId: 'isle:sprocket',
  name: 'Prince Sprocket',
  title: 'the Wound-Up',
  color: SPROCKET,
  colorLit: SPROCKET_LIT,
  colorDark: SPROCKET_DARK,
  accent: BRASS,
  // Tier 2 of Voltreach.
  damageMult: 1.2,

  intro: [
    'A NEW TOY! Marguerite, look, a new one walked in by itself! Does it bounce? Make it bounce!',
    'You have to keep moving. That\'s the rule. If you stop, you get put away. Mother said. Ready? GO!',
  ],
  banter: [
    'Faster! Faster! Don\'t you dare run down!',
    'The whole town winds for me. Every attic. Every arm. Isn\'t it marvellous?',
    'I never sit down. Never ever. Sitting down is how it starts.',
    'You\'re fun! You\'re the most fun anyone\'s been in AGES!',
    'Again! Again! Again!',
  ],
  defeatLine: 'WOUND DOWN',
  resumeLine: 'You came back! Toys don\'t usually come back out of the Box. Let\'s play again!',

  phases: [
    {
      name: 'Wind-Up',
      line: 'Wind me up and watch me go! Boing! Boing! BOING!',
      hp: 480,
      cycle: [
        'sig:pogo', 'volley', 'sig:keywind', 'hazard', 'sig:jackbox',
        'radial', 'sig:pogo', 'homing', 'sig:keywind', 'sig:jackbox',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Stretch',
      line: 'Oh, you\'re quick. Fine. FINE. I\'ll just reach. I can reach anywhere. Look how far I go!',
      hp: 560,
      cycle: [
        'sig:whip', 'sig:grab', 'barrage', 'sig:slingshot', 'sig:whip',
        'lanes', 'sig:grab', 'spiral', 'sig:slingshot',
      ],
      harass: ['h-lane', 'h-orbs', 'h-flak'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'EVERYTHING COMES BACK',
    extraPhase: {
      name: 'Snapback',
      line: 'Everything comes back. Everything! Throw it away and it comes back! I always come back!',
      hp: 410,
      cycle: [
        'sig:rebound', 'sig:recoil', 'sig:pogo', 'homing',
        'sig:rebound', 'sig:grab', 'sig:recoil', 'minefield',
      ],
      harass: ['h-mines', 'h-snipe'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.5 },
    radial: { count: 14, speed: 185 },
    hazard: { radius: 62 },
    spiral: { arms: 3, speed: 170 },
    barrage: { count: 6 },
  },

  signatures: { pogo, keywind, jackbox, whip, grab, slingshot, rebound, recoil },

  look: {
    crest: 'crown', pattern: 'gears', aura: 'sparks', hands: 'ball',
    torsoR: 33, mouth: 'grin', eyes: 2, eyeColor: BRASS_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { hands: 'gauntlet', aura: 'none', mouth: 'line' } },
    { movement: 'rush', gimmick: 'none', tint: 'gold', look: { hands: 'orb', aura: 'glitch', mouth: 'grin' } },
  ],

  /**
   * The Wound-Up's tells. He is a tin toy of a boy: a riveted seam round his middle, a tin crown,
   * painted cheeks, and the great brass key in his back that never stops turning. In Wind-Up he
   * rides a pogo spring that coils and springs under him; in Stretch his arms are long black-red
   * rubber, stretched out to his hands wherever they are; in Snapback the tin has split down the
   * front and there is no clockwork inside — only a coiled spring, quivering.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const wind = s.phaseIdx === 0;
    const stretch = s.phaseIdx === 1;
    const snap = s.hard && s.phaseIdx >= 2;
    snapNow = snap;
    // The key in his back, turning (backwards in Snapback).
    const ka = (s.t / (wind ? 160 : stretch ? 420 : -120)) % (Math.PI * 2);
    const kx = s.x + R * 0.55, ky = s.y - R * 0.95;
    g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(s.x + R * 0.2, s.y - R * 0.3, kx, ky);
    const wv = Math.cos(ka);
    for (const k of [-1, 1]) {
      const lx = kx + k * 13 * wv, ly = ky - 10;
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, Math.max(3, 20 * Math.abs(wv)), 18);
      g.fillStyle(BRASS, 1); g.fillEllipse(lx - 0.5, ly - 0.5, Math.max(2, 17 * Math.abs(wv)), 15);
    }
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(kx, ky - 4, 3.5);
    // The tin seam and rivets round his middle.
    g.lineStyle(2, dim(TIN, 0.35), 0.9);
    g.beginPath(); g.arc(s.x, s.y + R * 0.1, R * 0.98, 0.15, Math.PI - 0.15, false); g.strokePath();
    for (let i = 0; i < 9; i++) {
      const a = 0.2 + (i / 8) * (Math.PI - 0.4);
      g.fillStyle(TIN, 1); g.fillCircle(s.x + Math.cos(a) * R * 0.98, s.y + R * 0.1 + Math.sin(a) * R * 0.98, 1.6);
    }
    // Painted cheeks.
    for (const k of [-1, 1]) { g.fillStyle(0xf07a8a, 0.75); g.fillCircle(s.x + k * R * 0.45, s.y + R * 0.05, R * 0.14); }
    // The tin crown, its points tipped with little brass balls.
    const cy = s.y - R * 0.92;
    g.fillStyle(dim(TIN, 0.2), 1); g.fillRect(s.x - R * 0.5, cy - 4, R, 8);
    for (let i = 0; i < 5; i++) {
      const x = s.x - R * 0.5 + (i / 4) * R;
      g.fillStyle(TIN, 1); g.fillTriangle(x - 5, cy - 3, x + 5, cy - 3, x, cy - 16 - (i === 2 ? 5 : 0));
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, cy - 17 - (i === 2 ? 5 : 0), 2.4);
    }
    g.fillStyle(TOY_RED, 1); g.fillCircle(s.x, cy, 3);
    if (wind) {
      // The pogo spring: coiled under him, bouncing.
      const ph = (s.t / 420) % 1;
      const squash = Math.abs(Math.sin(ph * Math.PI));
      const top = s.y + R * 0.85, len = R * (0.8 + squash * 0.6);
      for (let c = 0; c < 7; c++) {
        const yy = top + (c / 7) * len;
        g.lineStyle(3, IRON, 1); g.strokeEllipse(s.x, yy, R * 0.7, 7);
        g.lineStyle(1.2, IRON_LIT, 1); g.strokeEllipse(s.x, yy - 1, R * 0.66, 6);
      }
      g.fillStyle(RUBBER, 1); g.fillEllipse(s.x, top + len + 4, R * 0.5, 9);
      g.fillStyle(RUBBER_SHEEN, 0.6); g.fillEllipse(s.x - 4, top + len + 2, R * 0.2, 3);
      for (const k of [-1, 1]) { g.fillStyle(TIN, 1); g.fillRect(s.x + k * R * 0.42 - 6, top + 2, 12, 4); }
    }
    if (stretch) {
      // Rubber arms out to wherever his hands are.
      for (const [i, h] of s.hands.entries()) {
        const sx = s.x + (i % 2 ? 1 : -1) * R * 0.85, sy = s.y - R * 0.1;
        const mx = (sx + h.x) / 2 + Math.sin(s.t / 140 + i) * 8, my = (sy + h.y) / 2 + 10 + Math.cos(s.t / 160 + i) * 6;
        g.lineStyle(9, RUBBER, 1); g.lineBetween(sx, sy, mx, my); g.lineBetween(mx, my, h.x, h.y);
        g.lineStyle(5, SPROCKET, 1); g.lineBetween(sx, sy, mx, my); g.lineBetween(mx, my, h.x, h.y);
        g.lineStyle(1.5, LATEX_LIT, 0.4); g.lineBetween(sx, sy - 2, mx, my - 2);
      }
    }
    if (snap) {
      // The split tin and the spring heart.
      g.lineStyle(3, RUBBER, 1);
      g.lineBetween(s.x - 2, s.y - R * 0.6, s.x + 4, s.y - R * 0.2); g.lineBetween(s.x + 4, s.y - R * 0.2, s.x - 3, s.y + R * 0.2);
      g.lineBetween(s.x - 3, s.y + R * 0.2, s.x + 2, s.y + R * 0.6);
      const q = 1 + Math.sin(s.t / 50) * 0.12;
      g.lineStyle(2, BRASS_LIT, 1);
      g.beginPath();
      for (let i = 0; i <= 30; i++) {
        const a = (i / 30) * Math.PI * 6;
        const rr = (i / 30) * R * 0.32 * q;
        const x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      g.lineStyle(1.5, BRASS, 0.3 + Math.sin(s.t / 90) * 0.2); g.strokeCircle(s.x, s.y, R * (1.25 + ((s.t / 600) % 1) * 0.4));
    }
    if (s.enraged) { g.lineStyle(1.5, SPROCKET_LIT, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Toy Works' playroom: painted floorboards in toy colours, a round rug bordered with
   * alphabet blocks at the heart, a painted train-track oval round it, tin soldiers lined up
   * along the side walls, and under the HUD the long toy shelf — drums, tops, jack-boxes and a
   * row of broken toys waiting for the Box.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5b20c4e7);
    // Floorboards.
    const B = 40;
    for (let x = 0; x < W; x += B) {
      const c = [0x5a3a2a, 0x4a3024, 0x5a3a2a, 0x523426][(x / B) % 4];
      g.fillStyle(c, 1); g.fillRect(x, 0, B, H);
      g.fillStyle(0x000000, 0.25); g.fillRect(x + B - 2, 0, 2, H);
      for (let y = (x / B) % 2 ? 60 : 160; y < H; y += 200) { g.fillStyle(0x000000, 0.2); g.fillRect(x, y, B, 2); }
      g.fillStyle(0x3a2418, 1); g.fillCircle(x + 6, 140 + ((x * 7) % 300), 1.4);
    }
    const cx = W / 2, cy = (H + 110) / 2;
    // The painted train track.
    g.lineStyle(26, 0x2a1a14, 0.6); g.strokeEllipse(cx, cy, W - 180, H - 230);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = cx + Math.cos(a) * (W - 180) / 2, y = cy + Math.sin(a) * (H - 230) / 2;
      g.lineStyle(4, 0x6a4a30, 1); g.lineBetween(x - Math.cos(a) * 12, y - Math.sin(a) * 12, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    }
    g.lineStyle(2.5, IRON_LIT, 0.8); g.strokeEllipse(cx, cy, W - 196, H - 246); g.strokeEllipse(cx, cy, W - 164, H - 214);
    // The rug with its block border.
    g.fillStyle(dim(CANVAS, 0.3), 1); g.fillEllipse(cx, cy, 420, 280);
    g.fillStyle(CANVAS, 1); g.fillEllipse(cx, cy, 400, 264);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const x = cx + Math.cos(a) * 186, y = cy + Math.sin(a) * 120;
      const c = TOY_COLORS[i % TOY_COLORS.length];
      g.fillStyle(dim(c, 0.3), 1); g.fillRect(x - 9, y - 9, 18, 18);
      g.fillStyle(c, 1); g.fillRect(x - 8, y - 9, 16, 16);
      g.fillStyle(LATEX_LIT, 0.85); g.fillRect(x - 2, y - 6, 4, 10);
    }
    // A great painted key at the heart.
    windKey(g, cx - 60, cy, 0, 120, BRASS_DARK);
    windKey(g, cx - 62, cy - 2, 0, 120, BRASS);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(cx - 60, cy, 8);
    // Tin soldiers along the side walls, a few toppled.
    for (let y = 200; y < H - 50; y += 70) {
      toySoldier(g, 26, y, 0.8, TOY_RED, rng() < 0.15);
      toySoldier(g, W - 26, y + 30, 0.8, TOY_BLUE, rng() < 0.15);
    }
    // The toy shelf under the HUD.
    g.fillStyle(0x2a1a14, 1); g.fillRect(0, 0, W, 104);
    g.fillStyle(0x6a4a30, 1); g.fillRect(0, 92, W, 12);
    g.fillStyle(0x8a6040, 1); g.fillRect(0, 92, W, 3);
    for (let x = 30; x < W - 20; x += 54) {
      const k = Math.floor(rng() * 4);
      const c = TOY_COLORS[Math.floor(rng() * TOY_COLORS.length)];
      if (k === 0) {
        // A drum.
        g.fillStyle(c, 1); g.fillRect(x - 14, 64, 28, 28);
        g.fillStyle(LATEX, 1); g.fillEllipse(x, 64, 28, 8);
        g.lineStyle(1.5, BRASS, 1); for (let j = 0; j < 4; j++) g.lineBetween(x - 14 + j * 9, 66, x - 10 + j * 9, 90);
      } else if (k === 1) {
        // A spinning top.
        g.fillStyle(c, 1); g.fillTriangle(x - 16, 72, x + 16, 72, x, 92);
        g.fillStyle(lit(c, 0.3), 1); g.fillEllipse(x, 72, 32, 10);
        g.lineStyle(2, BRASS, 1); g.lineBetween(x, 66, x, 56);
      } else if (k === 2) {
        // A jack-box, lid shut.
        g.fillStyle(c, 1); g.fillRect(x - 15, 62, 30, 30);
        g.fillStyle(LATEX_LIT, 0.7); g.fillRect(x - 15, 74, 30, 4);
        g.lineStyle(2, BRASS, 1); g.lineBetween(x + 15, 76, x + 22, 70);
      } else {
        // A broken toy, waiting for the Box.
        toySoldier(g, x, 92, 0.7, c, true);
        g.lineStyle(1.5, LATEX_LIT, 0.5); g.lineBetween(x - 10, 60, x + 10, 60);
      }
    }
    // Lamplight from the portholes along the top, falling across the boards.
    for (let x = 80; x < W; x += 160) { g.fillStyle(0xffd88a, 0.04); g.fillTriangle(x - 20, 104, x + 20, 104, x + 60, H); }
    g.lineStyle(30, 0x000000, 0.15); g.strokeRect(0, 0, W, H);
    g.fillStyle(CREPE, 0.06); g.fillEllipse(cx, cy, 700, 460);
  },
};
