import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { breathBottle, breathMeter, kite, weathervane } from './art';
import {
  BOTTLE, BRASS, BRASS_DARK, BRASS_LIT, BREATH, CLOUD, CLOUD_SHADE, KITE_BLUE, KITE_COLORS, KITE_OCHRE, KITE_RED,
  LEATHER, LEATHER_DARK, LIME, ROPE, SKY, SKY_DEEP, SKY_LIT, SLATE_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, ZEPHYR,
  ZEPHYR_DARK, ZEPHYR_LIT, ZEPHYR_SCARF,
} from './palette';
import { clamp, dist, wrapAngle } from './util';

/**
 * Prince Zephyr, the Measure of the Wind — King Aerion's son, governor of the Galeward Court.
 *
 * Zephyr was the best kite-flyer the shoulder ever saw, at four. His father came down from the
 * Lung, watched him for an hour, cut the line and handed him an anemometer: *measure it, boy;
 * don't play in it.* He has measured ever since — every gust logged, every vane pinned to the
 * toll, every lungful billed. He fights like a boy who still remembers how to fly, and is trying
 * very hard to forget:
 *
 * • **Fair Wind** (gliding in circles): he looses a flight of fighting-kites that fan out round
 *   you, hang, lock their aim and dive on glass lines; he lays crosswind lanes across the room
 *   that shove you sideways full of flying slate; he plants a great anemometer on you whose cups
 *   come round like scythes.
 * • **Gale Force** (rooted, the cold tint, a whirlwind for a body): the room turns round him —
 *   you are dragged round in a circle through spiral arms of grit; downbursts slam down where you
 *   are going; the weathercock on his crown spins, stops, and the wind fires down its arrow.
 * • **Becalmed** (hard, pale, drifting): the air is sucked out of the room. Your breath drains,
 *   and the only air is in the bottles he has corked — stand at one to breathe. Corks fly, and
 *   burst in shards of glass.
 */

const TOP = 96;

// ── Signature: Kite Blades ───────────────────────────────────────────
// A flight of fighting-kites fans out from his hands to points round you, hangs on its lines,
// locks its aim on where you stand — a line to each target — then dives along it.

interface Blade { sx: number; sy: number; hx: number; hy: number; tx: number; ty: number; outAt: number; lockAt: number; diveAt: number; color: number; hit: boolean; done: boolean }

const kiteBlades = (tk: BossToolkit): SignatureMove => {
  let blades: Blade[] = [];
  const OUT = 600, HANG = 700, DIVE_SPEED = 560;
  return {
    durationMs: 2800,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'KITE BLADES',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const a0 = Math.random() * Math.PI * 2;
      blades = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const hx = tk.clampX(p.x + Math.cos(a) * 250, 50), hy = tk.clampY(p.y + Math.sin(a) * 200, 50);
        const lockAt = time + OUT + HANG + i * 260;
        blades.push({ sx: tk.bossX, sy: tk.bossY, hx, hy, tx: p.x, ty: p.y, outAt: time, lockAt, diveAt: lockAt + tk.warn(420), color: KITE_COLORS[i % 4], hit: false, done: false });
      }
      tk.sfx('wings');
    },
    update(time) {
      const p = tk.player;
      for (const b of blades) {
        if (b.done) continue;
        if (time < b.lockAt) { b.tx = p.x; b.ty = p.y; continue; }
        if (time < b.diveAt) continue;
        // Diving: position along the line from hang point through the target and on.
        const len = dist(b.hx, b.hy, b.tx, b.ty) || 1;
        const d = ((time - b.diveAt) / 1000) * DIVE_SPEED;
        const ux = (b.tx - b.hx) / len, uy = (b.ty - b.hy) / len;
        const x = b.hx + ux * d, y = b.hy + uy * d;
        if (!b.hit && p.active && p.hp > 0 && dist(x, y, p.x, p.y) < 24) { b.hit = true; tk.hitPlayer(9, p.x, p.y); tk.sfx('slash'); }
        if (d > len + 260 || x < -40 || x > tk.W + 40 || y < TOP - 40 || y > tk.H + 40) b.done = true;
      }
      if (blades.length && blades.every((b) => b.done)) blades = [];
    },
    drawGround(g, time) {
      for (const b of blades) {
        if (b.done || time < b.outAt + OUT * 0.6) continue;
        // The aim line: faint while it tracks, bright and steady once locked.
        const locked = time >= b.lockAt;
        if (time >= b.diveAt) continue;
        const k = locked ? clamp((time - b.lockAt) / Math.max(1, b.diveAt - b.lockAt), 0, 1) : 0;
        const ux = b.tx - b.hx, uy = b.ty - b.hy;
        const len = Math.hypot(ux, uy) || 1;
        g.lineStyle(locked ? 3 : 1, locked ? b.color : 0xffffff, locked ? 0.4 + k * 0.5 : 0.18);
        g.lineBetween(b.hx, b.hy, b.hx + (ux / len) * (len + 200), b.hy + (uy / len) * (len + 200));
        if (locked) { g.lineStyle(2, b.color, 0.5 + k * 0.4); g.strokeCircle(b.tx, b.ty, 14 + (1 - k) * 12); }
      }
    },
    drawAir(g, time) {
      for (const b of blades) {
        if (b.done) continue;
        let x: number, y: number;
        const ang = Math.atan2(b.ty - b.hy, b.tx - b.hx);
        if (time < b.outAt + OUT) {
          const k = clamp((time - b.outAt) / OUT, 0, 1);
          const e = 1 - (1 - k) * (1 - k);
          x = b.sx + (b.hx - b.sx) * e; y = b.sy + (b.hy - b.sy) * e - Math.sin(k * Math.PI) * 60;
        } else if (time < b.diveAt) {
          x = b.hx + Math.sin(time / 140 + b.color) * 3; y = b.hy + Math.cos(time / 170) * 3;
        } else {
          const len = dist(b.hx, b.hy, b.tx, b.ty) || 1;
          const d = ((time - b.diveAt) / 1000) * DIVE_SPEED;
          x = b.hx + ((b.tx - b.hx) / len) * d; y = b.hy + ((b.ty - b.hy) / len) * d;
        }
        // The glass line back to his hand, glittering.
        g.lineStyle(1, ROPE, 0.6); g.lineBetween(tk.bossX, tk.bossY - 10, x, y);
        kite(g, x, y, time >= b.diveAt ? 1.5 : 1.3, b.color, time >= b.lockAt ? ang : ang + Math.sin(time / 200) * 0.4, time / 1000);
      }
    },
    onPhaseEnd() { blades = []; },
  };
};

// ── Signature: Crosswind Lanes ───────────────────────────────────────
// Three bands are laid across the room, arrows showing which way each will blow. Then they blow:
// inside one you are shoved along it, and slates come skating down it with a gap in each rank.

interface Band { c: number; dir: 1 | -1; horiz: boolean }

const crosswindLanes = (tk: BossToolkit): SignatureMove => {
  let bands: Band[] = [];
  let startAt = 0, blowAt = 0, endAt = 0, lastRank = 0;
  let active = false;
  const HALF = 40;
  const inBand = (b: Band, x: number, y: number) => Math.abs((b.horiz ? y : x) - b.c) < HALF;
  return {
    durationMs: 3600,
    windupMs: 550,
    gesture: 'sweep',
    tell: 'CROSSWIND',
    cast(time) {
      const p = tk.player;
      const horiz = Math.random() < 0.6;
      const base = horiz ? p.y : p.x;
      const lo = horiz ? TOP + 50 : 60, hi = horiz ? tk.H - 40 : tk.W - 60;
      bands = [-1, 0, 1].map((k, i) => ({ c: clamp(base + k * 140, lo, hi), dir: (i % 2 ? -1 : 1) as 1 | -1, horiz }));
      startAt = time; blowAt = time + tk.warn(1000); endAt = blowAt + 2400; lastRank = 0;
      active = true;
      tk.sfx('gust');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      if (time >= blowAt && time < endAt) {
        for (const b of bands) {
          if (!inBand(b, p.x, p.y)) continue;
          // Shoved along it.
          const fx = b.horiz ? p.x + b.dir * 900 : p.x, fy = b.horiz ? p.y : p.y + b.dir * 900;
          tk.pull(fx, fy, 110, 120);
        }
        if (time - lastRank > 520) {
          lastRank = time;
          for (const b of bands) {
            // A rank of slates along the band's upwind edge, one gap.
            const gapAt = Math.random();
            for (let k = 0; k < 3; k++) {
              const off = (k - 1) * 26;
              if (k === Math.floor(gapAt * 3)) continue;
              const x = b.horiz ? (b.dir > 0 ? 10 : tk.W - 10) : b.c + off;
              const y = b.horiz ? b.c + off : (b.dir > 0 ? TOP + 6 : tk.H - 6);
              tk.spawnBullet({ x, y, angle: b.horiz ? (b.dir > 0 ? 0 : Math.PI) : (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2), speed: 330, damage: 6, r: 6, lifeMs: 4000, color: SLATE_DARK });
            }
          }
        }
      }
      if (time > endAt + 300) { active = false; bands = []; }
    },
    drawGround(g, time) {
      if (!active) return;
      const blowing = time >= blowAt && time < endAt;
      const k = blowing ? 1 : clamp((time - startAt) / Math.max(1, blowAt - startAt), 0, 1);
      for (const b of bands) {
        const x0 = b.horiz ? 0 : b.c - HALF, y0 = b.horiz ? b.c - HALF : TOP;
        const w = b.horiz ? tk.W : HALF * 2, h = b.horiz ? HALF * 2 : tk.H - TOP;
        g.fillStyle(SKY_LIT, blowing ? 0.16 : 0.05 + k * 0.08); g.fillRect(x0, y0, w, h);
        g.lineStyle(2, ZEPHYR, 0.3 + k * 0.5); g.strokeRect(x0, y0, w, h);
        // Chevrons marching the way it will blow.
        const len = b.horiz ? tk.W : tk.H - TOP;
        const run = ((time / (blowing ? 160 : 500)) % 1) * 60;
        for (let d = -60 + run; d < len; d += 60) {
          const cx = b.horiz ? (b.dir > 0 ? d : tk.W - d) : b.c, cy = b.horiz ? b.c : (b.dir > 0 ? TOP + d : tk.H - d);
          const ax = b.horiz ? b.dir : 0, ay = b.horiz ? 0 : b.dir;
          g.lineStyle(3, 0xffffff, (blowing ? 0.5 : 0.25) * k);
          g.lineBetween(cx - ax * 10 - ay * 12, cy - ay * 10 - ax * 12, cx, cy);
          g.lineBetween(cx - ax * 10 + ay * 12, cy - ay * 10 + ax * 12, cx, cy);
        }
      }
    },
    onPhaseEnd() { active = false; bands = []; },
  };
};

// ── Signature: Anemometer ────────────────────────────────────────────
// He plants a great anemometer where you stand: a mast and three cups on long arms. It spins up —
// a ring shows the band the cups will sweep — and then the cups come round like scythes. Inside
// the ring, by the mast, is calm; outside it is calm; crossing the band is the trick.

const anemometer = (tk: BossToolkit): SignatureMove => {
  let cx = 0, cy = 0, startAt = 0, liveAt = 0, endAt = 0, ang = 0, spin = 0;
  let active = false;
  let lastHit = 0;
  const R = 150, CUP = 22;
  return {
    durationMs: 3200,
    windupMs: 500,
    gesture: 'slam',
    tell: 'ANEMOMETER',
    cast(time) {
      const p = tk.player;
      cx = tk.clampX(p.x, 120); cy = tk.clampY(p.y + 10, 120);
      startAt = time; liveAt = time + tk.warn(1100); endAt = liveAt + (tk.hard ? 3400 : 2800);
      ang = Math.random() * Math.PI * 2; spin = 0;
      active = true;
      tk.sfx('gear-turn');
    },
    update(time, dtRaw) {
      if (!active) return;
      const dt = clamp(dtRaw, 0, 0.05);
      const want = time < liveAt ? 1.2 : tk.hard ? 3.6 : 3.1;
      spin += (want - spin) * clamp(dt * 3, 0, 1);
      ang += spin * dt;
      const p = tk.player;
      if (time >= liveAt && time < endAt && p.active && p.hp > 0 && time - lastHit > 700) {
        for (let i = 0; i < 3; i++) {
          const a = ang + (i * Math.PI * 2) / 3;
          if (dist(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8, p.x, p.y) < CUP + 16) {
            lastHit = time; tk.hitPlayer(12, p.x, p.y); tk.sfx('clang');
            break;
          }
        }
      }
      if (time > endAt + 400) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clamp((time - startAt) / Math.max(1, liveAt - startAt), 0, 1);
      const live = time >= liveAt && time < endAt;
      // The swept band.
      g.lineStyle((CUP + 14) * 2, BRASS, live ? 0.14 : 0.05 + k * 0.08);
      g.strokeEllipse(cx, cy, R * 2, R * 1.6);
      g.lineStyle(2, BRASS_LIT, 0.3 + k * 0.5); g.strokeEllipse(cx, cy, (R + CUP + 14) * 2, (R + CUP + 14) * 1.6);
      g.strokeEllipse(cx, cy, (R - CUP - 14) * 2, (R - CUP - 14) * 1.6);
      g.fillStyle(0x000000, 0.2); g.fillEllipse(cx, cy + 4, 30, 10);
    },
    drawAir(g, time) {
      if (!active) return;
      const fade = time > endAt ? clamp(1 - (time - endAt) / 400, 0, 1) : clamp((time - startAt) / 300, 0, 1);
      // The mast.
      g.fillStyle(dim(BRASS, 0.3), fade); g.fillRect(cx - 3, cy - 70, 6, 70);
      g.fillStyle(BRASS_LIT, fade); g.fillCircle(cx, cy - 70, 6);
      for (let i = 0; i < 3; i++) {
        const a = ang + (i * Math.PI * 2) / 3;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.8;
        g.lineStyle(3, BRASS_DARK, fade); g.lineBetween(cx, cy - 70, x, y - 30);
        // A cup: a brass half-sphere, mouth turned to the wind it catches.
        g.fillStyle(BRASS_DARK, fade); g.fillCircle(x, y - 30, CUP);
        g.fillStyle(BRASS, fade); g.fillCircle(x - Math.sin(a) * 4, y - 30 + Math.cos(a) * 3, CUP - 4);
        g.fillStyle(dim(BRASS, 0.55), fade); g.fillCircle(x - Math.sin(a) * 8, y - 30 + Math.cos(a) * 6, CUP - 10);
        // Its shadow on the floor where it will strike.
        g.fillStyle(0x000000, 0.18 * fade); g.fillEllipse(x, y, CUP * 2, CUP);
        if (spin > 2) { g.lineStyle(2, 0xffffff, 0.3 * fade); g.beginPath(); g.arc(cx, cy - 30, R, a - 0.5, a, false); g.strokePath(); }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Room Turns ────────────────────────────────────────
// Gale Force. He becomes the eye. For a few seconds you are dragged round him in a circle — never
// toward him, always round — through arms of grit that spiral off his body. Walk against the turn
// to slow it, and thread the arms.

const roomTurns = (tk: BossToolkit): SignatureMove => {
  let startAt = 0, endAt = 0, lastArm = 0, armAng = 0;
  let active = false;
  const DIR = 1;
  return {
    durationMs: 4800,
    windupMs: 700,
    hold: 'conduct',
    locksBody: true,
    tell: 'THE ROOM TURNS',
    cast(time) {
      startAt = time; endAt = time + tk.warn(600) + 4200; lastArm = 0;
      armAng = tk.angleToPlayer() + Math.PI;
      active = true;
      tk.sfx('tornado');
    },
    update(time, dtRaw) {
      if (!active) return;
      const dt = clamp(dtRaw, 0, 0.05);
      const live = time >= startAt + tk.warn(600) && time < endAt;
      if (live) {
        const p = tk.player;
        const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        const d = dist(p.x, p.y, tk.bossX, tk.bossY);
        // A point ahead round the circle — the pull drags you along the turn, not in.
        const ahead = a + DIR * 0.9;
        tk.pull(tk.bossX + Math.cos(ahead) * d * 1.08, tk.bossY + Math.sin(ahead) * d * 1.08, tk.hard ? 120 : 100, 120);
        armAng += DIR * (tk.hard ? 1.5 : 1.25) * dt;
        if (time - lastArm > (tk.hard ? 120 : 150)) {
          lastArm = time;
          for (let k = 0; k < 3; k++) {
            const aa = armAng + (k * Math.PI * 2) / 3;
            tk.spawnBullet({ x: tk.bossX + Math.cos(aa) * 30, y: tk.bossY + Math.sin(aa) * 30, angle: aa + 0.25, speed: 190, damage: 6, r: 5, lifeMs: 3200, color: 0xc9c3b4 });
          }
        }
      }
      if (time > endAt + 200) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clamp((time - startAt) / Math.max(1, tk.warn(600)), 0, 1);
      // The whole floor streaking round him.
      for (let i = 0; i < 26; i++) {
        const r = 60 + ((i * 53) % 520);
        const a0 = (time / 1000) * (1.6 - r / 900) * DIR + i * 1.7;
        g.lineStyle(2, 0xffffff, 0.08 + k * 0.18);
        g.beginPath(); g.arc(tk.bossX, tk.bossY, r, a0, a0 + 0.5, false); g.strokePath();
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Downburst ─────────────────────────────────────────────
// Four columns of air come down one after another where you are heading — a shrinking shadow
// marks each — and each slams the floor and throws a ring of grit out with one gap in it.

interface Burst { x: number; y: number; warnAt: number; fireAt: number; fired: boolean }

const downburst = (tk: BossToolkit): SignatureMove => {
  let bursts: Burst[] = [];
  let lx = 0, ly = 0;
  const R = 80;
  return {
    durationMs: 3000,
    windupMs: 500,
    gesture: 'raise',
    tell: 'DOWNBURST',
    cast(time) {
      bursts = [];
      lx = tk.player.x; ly = tk.player.y;
      const n = tk.hard ? 5 : 4;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 450, () => {
          const p = tk.player;
          // Lead the target along the way you have been walking.
          const vx = p.x - lx, vy = p.y - ly;
          lx = p.x; ly = p.y;
          const x = tk.clampX(p.x + vx * 1.6, 60), y = tk.clampY(p.y + vy * 1.6, 60);
          bursts.push({ x, y, warnAt: tk.now, fireAt: tk.now + tk.warn(850), fired: false });
        });
      }
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const b of bursts) {
        if (b.fired || time < b.fireAt) continue;
        b.fired = true;
        tk.explode(b.x, b.y, R, 12, ZEPHYR_LIT);
        tk.sfx('gravity-slam');
        const gap = Math.atan2(p.y - b.y, p.x - b.x) + (Math.random() < 0.5 ? 0.9 : -0.9);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          if (Math.abs(wrapAngle(a - gap)) < 0.45) continue;
          tk.spawnBullet({ x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, angle: a, speed: 200, damage: 5, r: 5, lifeMs: 2400, color: 0xd8d0c0 });
        }
      }
      bursts = bursts.filter((b) => !b.fired || time < b.fireAt + 500);
    },
    drawGround(g, time) {
      for (const b of bursts) {
        if (b.fired) {
          const k = (time - b.fireAt) / 500;
          g.lineStyle(5 * (1 - k), 0xffffff, 1 - k); g.strokeEllipse(b.x, b.y, R * 2 * (1 + k), R * 1.4 * (1 + k));
          continue;
        }
        const k = clamp((time - b.warnAt) / Math.max(1, b.fireAt - b.warnAt), 0, 1);
        g.fillStyle(ZEPHYR_DARK, 0.1 + k * 0.2); g.fillEllipse(b.x, b.y, R * 2, R * 1.4);
        g.lineStyle(2, ZEPHYR_LIT, 0.4 + k * 0.5); g.strokeEllipse(b.x, b.y, R * 2 * (1.5 - k * 0.5), R * 1.4 * (1.5 - k * 0.5));
      }
    },
    drawAir(g, time) {
      for (const b of bursts) {
        if (b.fired) continue;
        const k = clamp((time - b.warnAt) / Math.max(1, b.fireAt - b.warnAt), 0, 1);
        // The column, coming down out of the sky, swirling.
        const top = b.y - 360 + k * 300;
        g.fillStyle(ZEPHYR_LIT, 0.08 + k * 0.12); g.fillRect(b.x - R * 0.5, top, R, b.y - top);
        for (let i = 0; i < 5; i++) {
          const yy = top + ((time / 6 + i * 40) % Math.max(1, b.y - top));
          g.lineStyle(2, 0xffffff, 0.3 * k); g.strokeEllipse(b.x, yy, R * (0.6 + k * 0.4), 10);
        }
      }
    },
    onPhaseEnd() { bursts = []; },
  };
};

// ── Signature: Weathercock ───────────────────────────────────────────
// The brass cock on his crown spins, slows, stops — pointing at you. A beat, and the wind fires
// down the arrow in a lane. Then it spins again from where it stopped, two or three times.

const weathercockLance = (tk: BossToolkit): SignatureMove => {
  let shots: { a: number; stopAt: number; fireAt: number; fired: boolean }[] = [];
  let spinFrom = 0;
  return {
    durationMs: 3200,
    windupMs: 450,
    gesture: 'point',
    tell: 'WEATHERCOCK',
    cast(time) {
      shots = [];
      const n = tk.hard ? 4 : 3;
      spinFrom = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const stopAt = time + 450 + i * 850;
        shots.push({ a: 0, stopAt, fireAt: stopAt + tk.warn(520), fired: false });
      }
      tk.sfx('gear-turn');
    },
    update(time) {
      for (const s of shots) {
        if (time < s.stopAt) continue;
        if (s.a === 0) {
          s.a = tk.angleToPlayer() || 0.0001;
          tk.spawnLane({ x: tk.bossX, y: tk.bossY, angle: s.a, halfW: 30, warnMs: tk.warn(520), fireMs: 300, damage: 13 });
          tk.sfx('clock-tick');
        }
        if (!s.fired && time >= s.fireAt) { s.fired = true; tk.sfx('gust'); }
      }
      if (shots.length && shots.every((s) => s.fired) && time > shots[shots.length - 1].fireAt + 400) shots = [];
    },
    drawAir(g, time) {
      if (!shots.length) return;
      // The cock: spinning between stops, still on each stop.
      let a = spinFrom + time / 60;
      for (const s of shots) if (time >= s.stopAt && s.a !== 0 && time < s.fireAt + 200) a = s.a;
      weathervane(g, tk.bossX, tk.bossY - 52, 26, a, 1.6);
      for (const s of shots) {
        if (!s.fired || time > s.fireAt + 300) continue;
        const k = (time - s.fireAt) / 300;
        for (let i = 0; i < 6; i++) {
          const d = 60 + i * 120 + k * 120;
          g.lineStyle(2, 0xffffff, 0.7 * (1 - k));
          g.lineBetween(tk.bossX + Math.cos(s.a) * d, tk.bossY + Math.sin(s.a) * d, tk.bossX + Math.cos(s.a) * (d + 50), tk.bossY + Math.sin(s.a) * (d + 50));
        }
      }
    },
    onPhaseEnd() { shots = []; },
  };
};

// ── Signature: Becalmed ──────────────────────────────────────────────
// Hard. He breathes in, and keeps breathing in. The room's air drains — a gauge of your breath
// empties — and he draws you toward him. The only air left is in three corked bottles set round
// the room: stand at one and it uncorks, filling you up. Run dry and you choke for a tick at a
// time, slowed.

interface Jar { x: number; y: number; left: number }

let becalmBreath = 1;

const becalmed = (tk: BossToolkit): SignatureMove => {
  let jars: Jar[] = [];
  let startAt = 0, endAt = 0, lastTick = 0;
  let active = false;
  const JAR_R = 36;
  return {
    durationMs: 3000,
    windupMs: 800,
    hold: 'draw',
    tell: 'BECALMED',
    cast(time) {
      startAt = time; endAt = time + (tk.hard ? 9000 : 8000);
      becalmBreath = 1;
      active = true;
      jars = [];
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3;
        jars.push({ x: tk.clampX(tk.W / 2 + Math.cos(a) * 320, 70), y: tk.clampY((TOP + tk.H) / 2 + Math.sin(a) * 200, 70), left: 1 });
      }
      tk.sfx('tornado');
    },
    update(time, dtRaw) {
      if (!active) return;
      const dt = clamp(dtRaw, 0, 0.05);
      const p = tk.player;
      if (time < endAt) {
        tk.pull(tk.bossX, tk.bossY, 55, 120);
        becalmBreath = Math.max(0, becalmBreath - dt / 4.2);
        for (const j of jars) {
          if (j.left <= 0 || dist(p.x, p.y, j.x, j.y) > JAR_R) continue;
          const take = Math.min(j.left, dt * 1.4);
          j.left -= take; becalmBreath = Math.min(1, becalmBreath + take * 1.3);
          if (j.left <= 0) tk.sfx('bubble');
        }
        if (becalmBreath <= 0 && time - lastTick > 500 && p.active && p.hp > 0) {
          lastTick = time;
          tk.hitPlayer(4, p.x, p.y);
          tk.slowPlayer(0.7, 600);
        }
      } else { active = false; jars = []; becalmBreath = 1; }
    },
    drawGround(g, time) {
      if (!active) return;
      // The room going grey and still: a pale wash, thickening as the air goes.
      const k = clamp((time - startAt) / 1200, 0, 1);
      g.fillStyle(0xdde4ee, 0.08 * k + (1 - becalmBreath) * 0.1); g.fillRect(0, TOP, tk.W, tk.H - TOP);
      for (const j of jars) {
        if (j.left <= 0) continue;
        g.fillStyle(BREATH, 0.12 + Math.sin(time / 200) * 0.04); g.fillCircle(j.x, j.y, JAR_R);
        g.lineStyle(2, BREATH, 0.6); g.strokeCircle(j.x, j.y, JAR_R);
      }
      // Streams of air flowing to him across the floor.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const ph = 1 - ((time / 900 + i * 0.27) % 1);
        const r = 60 + ph * 420;
        g.lineStyle(1.5, 0xffffff, 0.25 * (1 - ph));
        g.lineBetween(tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r, tk.bossX + Math.cos(a) * (r + 30), tk.bossY + Math.sin(a) * (r + 30));
      }
    },
    drawAir(g, time) {
      if (!active) return;
      for (const j of jars) breathBottle(g, j.x, j.y + 12, 1.5, time / 1000, j.left);
      // The breath gauge over your head.
      const p = tk.player;
      const x = p.x, y = p.y - 64;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 32, y - 6, 64, 12, 5);
      g.fillStyle(becalmBreath < 0.25 ? 0xff7a5a : BREATH, 1); g.fillRoundedRect(x - 30, y - 4, 60 * becalmBreath, 8, 4);
      if (becalmBreath <= 0 && Math.floor(time / 150) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.9); g.strokeRoundedRect(x - 32, y - 6, 64, 12, 5); }
    },
    onPhaseEnd() { active = false; jars = []; becalmBreath = 1; },
  };
};

// ── Signature: Corked ────────────────────────────────────────────────
// Hard. He lobs corked breath-bottles, three at a time, at the ground round you: each lands on a
// marked ring and bursts — glass shards flying out, a puff of stolen breath.

interface Lob { sx: number; sy: number; x: number; y: number; at: number; landAt: number; landed: boolean }

const corked = (tk: BossToolkit): SignatureMove => {
  let lobs: Lob[] = [];
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'punch',
    tell: 'CORKED',
    cast(time) {
      const p = tk.player;
      lobs = [];
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = i === 0 ? 0 : 110 + Math.random() * 60;
        const x = tk.clampX(p.x + Math.cos(a) * r, 60), y = tk.clampY(p.y + Math.sin(a) * r, 60);
        const landAt = time + tk.warn(900) + i * 220;
        lobs.push({ sx: tk.bossX, sy: tk.bossY - 20, x, y, at: time, landAt, landed: false });
        tk.spawnZone({ x, y, radius: 60, warnMs: landAt - time, damage: 10 });
      }
      tk.sfx('grenade-throw');
    },
    update(time) {
      for (const l of lobs) {
        if (l.landed || time < l.landAt) continue;
        l.landed = true;
        tk.sfx('crystal-shatter');
        const a0 = Math.random() * Math.PI;
        for (let i = 0; i < 6; i++) {
          const a = a0 + (i / 6) * Math.PI * 2;
          tk.spawnBullet({ x: l.x, y: l.y, angle: a, speed: 240, damage: 5, r: 4, lifeMs: 1800, color: BOTTLE });
        }
      }
      lobs = lobs.filter((l) => !l.landed || time < l.landAt + 600);
    },
    drawAir(g, time) {
      for (const l of lobs) {
        if (l.landed) {
          const k = (time - l.landAt) / 600;
          for (let i = 0; i < 6; i++) { const a = i * 1.05; g.fillStyle(BREATH, 0.5 * (1 - k)); g.fillCircle(l.x + Math.cos(a) * k * 40, l.y - k * 30 + Math.sin(a) * k * 20, 6 * (1 - k) + 2); }
          continue;
        }
        const k = clamp((time - l.at) / Math.max(1, l.landAt - l.at), 0, 1);
        const x = l.sx + (l.x - l.sx) * k, y = l.sy + (l.y - l.sy) * k - Math.sin(k * Math.PI) * 140;
        breathBottle(g, x, y + 12, 1.1, time / 1000 + k * 6, 1);
      }
    },
    onPhaseEnd() { lobs = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const ZEPHYR_BOSS: WorldBossDef = {
  worldId: 'isle:zephyr',
  name: 'Prince Zephyr',
  title: 'the Measure of the Wind',
  color: ZEPHYR,
  colorLit: ZEPHYR_LIT,
  colorDark: ZEPHYR_DARK,
  accent: BRASS,
  // Tier 1 of the fourth isle.
  damageMult: 1.0,

  intro: [
    'Wind from the south-south-west, eleven knots, gusting fourteen. You came up Vane Street breathing all of it.',
    'Unmetered. Do you know what that costs? I do. I know exactly what everything costs.',
  ],
  banter: [
    'Every gust on this shoulder is in my books. Every one. I measured them myself.',
    'Father says air is the only thing worth owning, because everyone needs it.',
    'A kite is just a way of wasting wind. I gave mine up. You should give yours up.',
    'Breathe shallow. It\'s cheaper.',
    'I read the anemometer every hour. I have not missed an hour in fifteen years.',
  ],
  defeatLine: 'THE WIND GOES FREE',
  resumeLine: 'You again. I logged your last visit. Heavy breathing, gusting to panic.',

  phases: [
    {
      name: 'Fair Wind',
      line: 'Fair wind. Let us see how you fly in it.',
      hp: 400,
      cycle: [
        'sig:kiteblades', 'volley', 'sig:crosswind', 'homing', 'sig:anemometer',
        'radial', 'sig:kiteblades', 'lanes', 'sig:crosswind', 'sig:anemometer',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'Gale Force',
      line: 'No. NO. You don\'t get to enjoy it. Nobody gets to ENJOY it.',
      hp: 480,
      cycle: [
        'sig:turns', 'sig:downburst', 'spiral', 'sig:cock', 'barrage',
        'sig:turns', 'sig:kiteblades', 'sig:downburst', 'sig:cock', 'sweep',
      ],
      harass: ['h-flak', 'h-lane', 'h-rune'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'NOT ONE BREATH UNPAID',
    extraPhase: {
      name: 'Becalmed',
      line: 'Then nobody breathes. Not you. Not me. Hold it. HOLD it.',
      hp: 350,
      cycle: [
        'sig:becalmed', 'sig:corked', 'sig:cock', 'homing',
        'sig:corked', 'sig:kiteblades', 'sig:becalmed', 'sig:downburst',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.55 },
    radial: { count: 16, speed: 190 },
    spiral: { arms: 4, speed: 175 },
    lanes: { halfW: 34 },
  },

  signatures: {
    kiteblades: kiteBlades,
    crosswind: crosswindLanes,
    anemometer,
    turns: roomTurns,
    downburst,
    cock: weathercockLance,
    becalmed,
    corked,
  },

  look: {
    crest: 'none', pattern: 'rings', aura: 'none', hands: 'ball',
    torsoR: 33, mouth: 'line', eyes: 2, eyeColor: ZEPHYR_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'cold', look: { pattern: 'swirl', aura: 'dust', hands: 'wisp', mouth: 'grate' } },
    { movement: 'hover', gimmick: 'none', tint: 'pale', look: { pattern: 'smooth', aura: 'none', hands: 'claw', mouth: 'stitch' } },
  ],

  /**
   * The Measure of the Wind's tells. A leather flying-cap with its goggles pushed up, a brass
   * weathercock riding the crown of it and turning to follow you, a long red scarf streaming off
   * his neck downwind, a brass breath-meter strapped over his heart and an anemometer spinning in
   * his second hand. In Gale Force his lower body is a whirlwind — a funnel of turning bands with
   * slate and straw going round — and the scarf whips in circles. Becalmed, the goggles are down,
   * the scarf hangs dead, the meter's needle is on zero and a bandolier of corked bottles crosses
   * his chest.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const gale = s.phaseIdx === 1;
    const calm = s.hard && s.phaseIdx >= 2;
    const t = s.t;

    if (gale) {
      // The funnel under him: bands turning, debris riding them.
      for (let i = 0; i < 6; i++) {
        const yy = s.y + R * 0.6 + i * 9;
        const w = R * (1.8 - i * 0.22);
        g.lineStyle(3, i % 2 ? ZEPHYR_LIT : 0xffffff, 0.55 - i * 0.06);
        g.strokeEllipse(s.x + Math.sin(t * 6 + i) * 3, yy, w, 10);
      }
      for (let i = 0; i < 7; i++) {
        const a = t * 5 + i * 0.9;
        const r = R * (1.1 + (i % 3) * 0.2);
        const dx = s.x + Math.cos(a) * r, dy = s.y + R * 0.3 + Math.sin(a) * r * 0.35;
        g.fillStyle(i % 2 ? 0x8e8d96 : 0xd8b46a, 0.9);
        g.fillRect(dx - 3, dy - 2, 6, 4);
      }
      // Wind wrapped round him.
      for (let i = 0; i < 3; i++) {
        const a0 = t * 4 + i * 2.1;
        g.lineStyle(2, 0xffffff, 0.5);
        g.beginPath(); g.arc(s.x, s.y, R * 1.35, a0, a0 + 1.2, false); g.strokePath();
      }
    }

    // The scarf: streaming east in Fair Wind, whipping round in the Gale, hanging dead Becalmed.
    {
      const nx = s.x + R * 0.1, ny = s.y + R * 0.55;
      const pts: { x: number; y: number }[] = [];
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        let x: number, y: number;
        if (calm) { x = nx + Math.sin(f * 2) * 3; y = ny + f * R * 1.3; }
        else if (gale) { const a = t * 6 - f * 2.4; x = nx + Math.cos(a) * f * R * 1.4; y = ny + Math.sin(a) * f * R * 0.6; }
        else { x = nx + f * R * 1.9; y = ny + Math.sin(t * 9 - f * 5) * 5 * f - f * 6; }
        pts.push({ x, y });
      }
      for (let k = 0; k < pts.length - 1; k++) {
        g.lineStyle(7 - k * 0.5, k % 3 === 2 ? lit(ZEPHYR_SCARF, 0.2) : ZEPHYR_SCARF, calm ? 0.7 : 1);
        g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
      }
      const end = pts[pts.length - 1];
      g.lineStyle(1.5, dim(ZEPHYR_SCARF, 0.2), 1);
      for (let k = -1; k <= 1; k++) g.lineBetween(end.x, end.y, end.x + (calm ? k * 2 : 6), end.y + (calm ? 6 : k * 3));
    }

    // The breath-meter over his heart. Its needle reads his own health — he meters himself too.
    breathMeter(g, s.x - R * 0.35, s.y + R * 0.2, R * 0.22, calm ? 0 : 1 - s.hpRatio);
    if (calm) {
      // A bandolier of corked bottles across the chest.
      g.lineStyle(4, LEATHER_DARK, 1); g.lineBetween(s.x - R * 0.8, s.y - R * 0.2, s.x + R * 0.7, s.y + R * 0.75);
      for (let i = 0; i < 4; i++) {
        const k = 0.15 + i * 0.22;
        breathBottle(g, s.x - R * 0.8 + R * 1.5 * k, s.y - R * 0.2 + R * 0.95 * k + 6, 0.42, t + i, 0.6);
      }
    }

    // The flying-cap: a leather dome on the crown, ear-flaps, goggles up (down when becalmed).
    g.fillStyle(LEATHER_DARK, 1); g.fillEllipse(s.x, s.y - R * 0.62, R * 1.5, R * 0.8);
    g.fillStyle(LEATHER, 1); g.fillEllipse(s.x - 2, s.y - R * 0.66, R * 1.4, R * 0.66);
    g.lineStyle(1.5, LEATHER_DARK, 1); g.lineBetween(s.x, s.y - R * 0.98, s.x, s.y - R * 0.34);
    for (const k of [-1, 1]) {
      g.fillStyle(LEATHER, 1); g.fillEllipse(s.x + k * R * 0.72, s.y - R * 0.2, R * 0.28, R * 0.5);
    }
    const gy = calm ? s.y - R * 0.12 : s.y - R * 0.72;
    for (const k of [-1, 1]) {
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(s.x + k * R * 0.28, gy, R * 0.2);
      g.fillStyle(calm ? 0x5a6a80 : SKY_LIT, 1); g.fillCircle(s.x + k * R * 0.28, gy, R * 0.14);
      g.fillStyle(0xffffff, 0.7); g.fillCircle(s.x + k * R * 0.28 - 2, gy - 2, R * 0.04);
    }
    g.lineStyle(2, LEATHER_DARK, 1); g.lineBetween(s.x - R * 0.08, gy, s.x + R * 0.08, gy);

    // The weathercock on his crown, turning to follow you (pinned dead still when becalmed).
    if (!gale) weathervane(g, s.x, s.y - R * 0.9, R * 0.5, calm ? 0 : s.facing, 0.9);

    // The anemometer in his second hand, spinning with the castGlow.
    const hand = s.hands[1];
    if (hand && !calm) {
      const hx = hand.x, hy = hand.y - 6;
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(hx, hy + 6, hx, hy - 22);
      for (let i = 0; i < 3; i++) {
        const a = t * (gale ? 18 : 9) * (1 + s.castGlow) + (i * Math.PI * 2) / 3;
        const cx = hx + Math.cos(a) * 11, cy = hy - 22 + Math.sin(a) * 4;
        g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(hx, hy - 22, cx, cy);
        g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 3.5);
      }
    }
    // A little kite tugging at the first hand in Fair Wind — the one thing he still carries.
    const hand0 = s.hands[0];
    if (hand0 && !gale && !calm) {
      const kx = hand0.x - 40 + Math.sin(t * 1.3) * 8, ky = hand0.y - 52 + Math.cos(t * 1.7) * 6;
      g.lineStyle(1, ROPE, 0.8); g.lineBetween(hand0.x, hand0.y, kx, ky);
      kite(g, kx, ky, 0.8, KITE_RED, Math.atan2(ky - hand0.y, kx - hand0.x), t);
    }
    if (s.enraged) { g.lineStyle(1.5, ZEPHYR_LIT, 0.35 + Math.sin(t * 8) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The top room of the Weather House: a parquet floor laid as a great thirty-two-point wind-rose
   * in pale ash and lapis with brass points, under a glass roof; tally-desks and barometers along
   * the north wall (under the HUD), the east wall open to the sky with the cloud sea beyond a
   * brass rail, and the floor scattered with logbook pages the draught keeps lifting.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x2e9f17);
    // Parquet: herringbone in two woods.
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(0, 0, W, H);
    for (let y = 96; y < H; y += 20) {
      for (let x = (y / 20) % 2 ? 0 : -20; x < W; x += 40) {
        g.fillStyle(rng() < 0.5 ? lit(TIMBER_LIT, 0.08) : TIMBER_LIT, 1); g.fillRect(x, y, 38, 9);
        g.fillStyle(TIMBER, 1); g.fillRect(x + 20, y + 10, 18, 9);
      }
    }
    // The north wall: tally-desks and barometers under the HUD.
    g.fillStyle(LIME, 1); g.fillRect(0, 0, W, 104);
    for (let x = 30; x < W; x += 120) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, 54, 80, 40);
      g.fillStyle(0xf2efe6, 1); g.fillRect(x + 6, 48, 30, 8); g.fillRect(x + 40, 46, 30, 10);
      // A barometer on the wall above each desk.
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + 40, 22, 14);
      g.fillStyle(0xf6f0dc, 1); g.fillCircle(x + 40, 22, 11);
      const a = -Math.PI / 2 + (rng() - 0.5) * 2;
      g.lineStyle(2, 0x1a1a1a, 1); g.lineBetween(x + 40, 22, x + 40 + Math.cos(a) * 9, 22 + Math.sin(a) * 9);
    }
    g.fillStyle(SLATE_DARK, 1); g.fillRect(0, 98, W, 8);
    // The east side open to the sky: a brass rail and the cloud sea.
    g.fillStyle(SKY, 1); g.fillRect(W - 70, 106, 70, H - 106);
    g.fillStyle(SKY_DEEP, 0.4); g.fillRect(W - 70, 106, 70, 60);
    for (let i = 0; i < 14; i++) { g.fillStyle(i % 2 ? CLOUD : CLOUD_SHADE, 0.9); g.fillCircle(W - 30 + rng() * 40, 150 + rng() * (H - 160), 18 + rng() * 18); }
    g.fillStyle(BRASS_DARK, 1); g.fillRect(W - 74, 106, 6, H - 106);
    g.fillStyle(BRASS, 1); g.fillRect(W - 76, 106, 3, H - 106);
    for (let y = 130; y < H; y += 40) { g.fillStyle(BRASS_DARK, 1); g.fillRect(W - 78, y, 10, 4); }
    // The wind-rose: thirty-two points, the cardinals long and lapis, the rest ash and brass.
    const cx = (W - 70) / 2, cy = (H + 106) / 2;
    g.fillStyle(lit(TIMBER_LIT, 0.2), 1); g.fillCircle(cx, cy, 250);
    g.lineStyle(4, BRASS, 0.9); g.strokeCircle(cx, cy, 250);
    g.lineStyle(2, BRASS_DARK, 0.7); g.strokeCircle(cx, cy, 236);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
      const len = i % 8 === 0 ? 236 : i % 4 === 0 ? 180 : i % 2 === 0 ? 130 : 90;
      const half = i % 8 === 0 ? 0.09 : 0.06;
      const col = i % 8 === 0 ? KITE_BLUE : i % 4 === 0 ? ZEPHYR_DARK : i % 2 === 0 ? BRASS : TIMBER;
      g.fillStyle(col, 0.9);
      g.fillTriangle(cx + Math.cos(a - half) * 26, cy + Math.sin(a - half) * 26, cx + Math.cos(a + half) * 26, cy + Math.sin(a + half) * 26, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      g.fillStyle(lit(col, 0.25), 0.8);
      g.fillTriangle(cx, cy, cx + Math.cos(a + half) * 26, cy + Math.sin(a + half) * 26, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    }
    g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 24);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(cx - 4, cy - 4, 10);
    // Logbook pages lifting in the draught, and a dropped red kite in the corner.
    for (let i = 0; i < 16; i++) {
      const x = 40 + rng() * (W - 160), y = 130 + rng() * (H - 170);
      const a = rng() * Math.PI;
      g.fillStyle(0x000000, 0.12); g.fillEllipse(x + 3, y + 3, 22, 8);
      g.fillStyle(0xf2efe6, 1);
      g.fillPoints([[-10, -6], [10, -7], [11, 6], [-9, 7]].map(([px, py]) => new Phaser.Geom.Point(x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a))), true, true);
      g.lineStyle(1, 0x8a8476, 0.6); g.lineBetween(x - 6, y - 2, x + 6, y - 2); g.lineBetween(x - 6, y + 2, x + 4, y + 2);
    }
    kite(g, 70, H - 60, 1.6, KITE_RED, -0.6, 0);
    kite(g, W - 130, 160, 1.0, KITE_OCHRE, 2.4, 1);
  },
};
