import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import { anvil, bellows, poly, regentSeal, rivets, slackTub } from './art';
import {
  ANVIL, ANVIL_CORE, ANVIL_DARK, ANVIL_LIT, BRICK, BRICK_DARK, BRONZE, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW,
  IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, IRONSTONE_DARK, LEATHER, LEATHER_LIT, SLAG, STEAM, STONE_DARK, TIMBER,
  TIMBER_DARK,
} from './palette';
import { clamp, dist, heatColor, segDist } from './util';

/**
 * Prince Anvil, the Unbending — Regent Gravane's son, governor of the Forge Court.
 *
 * Anvil was a gentle boy who liked hinges. His father sent him to Ezra Clinker to be made hard,
 * came to watch a lesson, saw him laughing at a hinge, and had Ezra interred and the boy quenched
 * in the pond. He came out of the water hard and has never been anything else; he governs his
 * court the way he was taught, by weight and by the blow. He fights the way the foundry works:
 *
 * • **Hammer and Tongs** (stalking): a drop-forge cadence of three slams walking at you, the last
 *   one throwing a shockwave ring with one gap (back toward him); long tongs that shoot out and
 *   drag you in for a follow-up blow; and the Anvil Chorus — anvils dropped round you, then
 *   struck in turn, each ringing out a ring of sparks.
 * • **Molten Core** (planted, the hot tint): his chest splits white-hot. Molten iron runs across
 *   the floor in snaking rivers (the scorched path shows first); a rain of Tithe ingots falls on
 *   long shadows and lies hot where it lands; and he vents his core in a sweeping beam of heat
 *   that spits slag.
 * • **Tempered** (hard, rushing, the cold tint): quenched steel, blued and straw-banded. While he
 *   is cold nothing marks him (impervious); he only glows — and only takes hurt — just after he
 *   works. He folds steel in three blade sweeps that leave temper colours hanging in the
 *   air, and plunges into the quench, rings of steam rolling out of him.
 */

const TOP = 96;

/** Read off the rig every frame (drawDecor), so the moves know which Anvil they are. */
let phaseNow = 0;
let hardNow = false;
/** Tempered: he glows (and can be hurt) until this scene time. */
let glowUntil = 0;
const tempered = () => hardNow && phaseNow >= 2;
/** Every move in the Tempered phase heats him: a few seconds in which blows land. */
const workHeat = (time: number) => { if (tempered()) glowUntil = Math.max(glowUntil, time + 3600); };

// ── Signature: Drop Forge ────────────────────────────────────────────
// Three blows walk at you from where he stands, each a hammer-shadow then a slam that cracks the
// floor. The last lands where you stood and throws a shockwave ring; its one gap faces him.

interface Slam { x: number; y: number; at: number; dealt: boolean; last: boolean }

const dropForge = (tk: BossToolkit): SignatureMove => {
  let slams: Slam[] = [];
  const R = 66;
  return {
    durationMs: 2700,
    windupMs: 600,
    gesture: 'slam',
    tell: 'DROP FORGE',
    cast(time) {
      workHeat(time);
      const p = tk.player;
      const bx = tk.bossX, by = tk.bossY;
      slams = [];
      for (let i = 0; i < 3; i++) {
        const k = (i + 1) / 3;
        slams.push({ x: tk.clampX(bx + (p.x - bx) * k), y: tk.clampY(by + (p.y - by) * k), at: time + tk.warn(900) + i * 460, dealt: false, last: i === 2 });
      }
      tk.sfx('hammer-forge');
    },
    update(time) {
      const p = tk.player;
      for (const s of slams) {
        if (s.dealt || time < s.at) continue;
        s.dealt = true;
        tk.sfx('anvil');
        tk.boom(s.x, s.y, R, ANVIL_CORE);
        if (p.active && p.hp > 0 && dist(p.x, p.y, s.x, s.y) < R + 14) { tk.hitPlayer(16, p.x, p.y); tk.slowPlayer(0.6, 600); }
        if (s.last) {
          const back = Math.atan2(tk.bossY - s.y, tk.bossX - s.x);
          tk.spawnRing({ cx: s.x, cy: s.y, delayMs: 420, speed: 310, gapCentre: back, gapHalf: 0.62, band: 16, damage: 12 });
          tk.sfx('quake');
        }
      }
      slams = slams.filter((s) => !s.dealt || time < s.at + 900);
    },
    drawGround(g, time) {
      for (const s of slams) {
        if (!s.dealt) {
          const k = clamp(1 - (s.at - time) / tk.warn(900), 0, 1);
          // The hammer's shadow, swelling and darkening as it comes down.
          g.fillStyle(0x000000, 0.18 + k * 0.32); g.fillRect(s.x - 30 - k * 14, s.y - 12 - k * 6, 60 + k * 28, 24 + k * 12);
          g.lineStyle(2, ANVIL_CORE, 0.25 + k * 0.6); g.strokeCircle(s.x, s.y, R);
          if (s.last) {
            const back = Math.atan2(tk.bossY - s.y, tk.bossX - s.x);
            g.lineStyle(3, HEAT_YELLOW, 0.3 + k * 0.4);
            g.beginPath(); g.arc(s.x, s.y, R + 16, back - 0.62, back + 0.62, false); g.strokePath();
          }
          continue;
        }
        // Cracks starred out from the blow, glowing and fading.
        const k = clamp((time - s.at) / 900, 0, 1);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + s.x * 0.01;
          const l = 30 + ((i * 37) % 5) * 12;
          g.lineStyle(3, heatColor(0.7 * (1 - k)), 1 - k);
          g.lineBetween(s.x, s.y, s.x + Math.cos(a) * l * 0.5, s.y + Math.sin(a) * l * 0.5 + 3);
          g.lineBetween(s.x + Math.cos(a) * l * 0.5, s.y + Math.sin(a) * l * 0.5 + 3, s.x + Math.cos(a + 0.2) * l, s.y + Math.sin(a + 0.2) * l);
        }
      }
    },
    drawAir(g, time) {
      for (const s of slams) {
        if (s.dealt) continue;
        const k = clamp(1 - (s.at - time) / tk.warn(900), 0, 1);
        if (k < 0.55) continue;
        // The head coming down at the end of its swing.
        const y = s.y - 120 * (1 - (k - 0.55) / 0.45);
        g.fillStyle(IRON_DARK, 1); g.fillRect(s.x - 28, y - 26, 56, 30);
        g.fillStyle(IRON, 1); g.fillRect(s.x - 26, y - 24, 20, 26);
        g.fillStyle(IRON_SHEEN, 0.8); g.fillRect(s.x - 28, y + 2, 56, 3);
        g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(s.x + 4, y - 26, s.x + 18, y - 90);
      }
    },
    onPhaseEnd() { slams = []; },
  };
};

// ── Signature: Tongs ─────────────────────────────────────────────────
// He levels a pair of long tongs at you; the line shows; the jaws shoot out along it. Caught, you
// are dragged in to him — and the hammer comes down where he stands.

const tongs = (tk: BossToolkit): SignatureMove => {
  let lines: { a: number; at: number; dealt: boolean }[] = [];
  let ox = 0, oy = 0;
  let caughtAt = -9999;
  const LEN = 540, SHOOT = 220;
  return {
    durationMs: 1900,
    windupMs: 650,
    gesture: 'point',
    hold: 'reach',
    tell: 'TONGS',
    cast(time) {
      workHeat(time);
      ox = tk.bossX; oy = tk.bossY;
      const a = tk.angleToPlayer();
      const fire = time + tk.warn(800);
      lines = tk.hard ? [{ a: a - 0.3, at: fire, dealt: false }, { a: a + 0.3, at: fire + 260, dealt: false }] : [{ a, at: fire, dealt: false }];
      if (tk.hard) lines.push({ a, at: fire + 520, dealt: false });
      tk.sfx('chain');
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.dealt || time < l.at) continue;
        const k = clamp((time - l.at) / SHOOT, 0, 1);
        const tx = ox + Math.cos(l.a) * LEN * k, ty = oy + Math.sin(l.a) * LEN * k;
        if (p.active && p.hp > 0 && segDist(p.x, p.y, ox, oy, tx, ty) < 30) {
          l.dealt = true;
          lines.forEach((m) => { m.dealt = true; });
          caughtAt = time;
          tk.hitPlayer(13, p.x, p.y);
          tk.pull(tk.bossX, tk.bossY, 130, 700);
          tk.slowPlayer(0.5, 900);
          tk.sfx('snap-back');
          tk.schedule(650, () => tk.spawnZone({ x: tk.bossX, y: tk.bossY, radius: 86, warnMs: 380, damage: 14 }));
        } else if (k >= 1) {
          l.dealt = true;
        }
      }
      lines = lines.filter((l) => !l.dealt || time < l.at + SHOOT + 300);
    },
    drawGround(g, time) {
      for (const l of lines) {
        if (time >= l.at) continue;
        const k = clamp(1 - (l.at - time) / tk.warn(800), 0, 1);
        g.lineStyle(26, IRON_DARK, 0.08 + k * 0.12); g.lineBetween(ox, oy, ox + Math.cos(l.a) * LEN, oy + Math.sin(l.a) * LEN);
        g.lineStyle(2, ANVIL_CORE, 0.3 + k * 0.5); g.lineBetween(ox, oy, ox + Math.cos(l.a) * LEN, oy + Math.sin(l.a) * LEN);
      }
    },
    drawAir(g, time) {
      for (const l of lines) {
        if (time < l.at) continue;
        const k = clamp((time - l.at) / SHOOT, 0, 1);
        const back = clamp((time - l.at - SHOOT) / 300, 0, 1);
        const reach = LEN * k * (1 - back);
        const tx = ox + Math.cos(l.a) * reach, ty = oy + Math.sin(l.a) * reach;
        const nx = -Math.sin(l.a), ny = Math.cos(l.a);
        const open = time - caughtAt < 600 ? 2 : 9;
        // Two long reins and the jaws at the end.
        for (const s of [-1, 1]) {
          g.lineStyle(5, IRON_DARK, 1); g.lineBetween(ox + nx * s * 6, oy + ny * s * 6, tx + nx * s * open, ty + ny * s * open);
          g.lineStyle(2, IRON_LIT, 0.8); g.lineBetween(ox + nx * s * 6, oy + ny * s * 6 - 1, tx + nx * s * open, ty + ny * s * open - 1);
          poly(g, [
            { x: tx + nx * s * open, y: ty + ny * s * open },
            { x: tx + Math.cos(l.a) * 22 + nx * s * 2, y: ty + Math.sin(l.a) * 22 + ny * s * 2 },
            { x: tx + Math.cos(l.a) * 16 + nx * s * (open + 6), y: ty + Math.sin(l.a) * 16 + ny * s * (open + 6) },
          ], IRON);
        }
        g.fillStyle(IRON_SHEEN, 1); g.fillCircle(ox + Math.cos(l.a) * 30, oy + Math.sin(l.a) * 30, 4);
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: Anvil Chorus ──────────────────────────────────────────
// Anvils drop round you on their shadows. Then he strikes them, one after another, and each rings
// out a ring of sparks. Stand between the spark lines.

interface ChorusAnvil { x: number; y: number; landAt: number; strikeAt: number; landed: boolean; struck: boolean }

const chorus = (tk: BossToolkit): SignatureMove => {
  let anvils: ChorusAnvil[] = [];
  return {
    durationMs: 3400,
    windupMs: 500,
    gesture: 'raise',
    tell: 'ANVIL CHORUS',
    cast(time) {
      workHeat(time);
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const a0 = Math.random() * Math.PI * 2;
      anvils = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const d = 170 + Math.random() * 50;
        const landAt = time + tk.warn(850) + i * 140;
        anvils.push({ x: tk.clampX(p.x + Math.cos(a) * d, 70), y: tk.clampY(p.y + Math.sin(a) * d, 70), landAt, strikeAt: time + tk.warn(850) + n * 140 + 500 + i * 340, landed: false, struck: false });
      }
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const a of anvils) {
        if (!a.landed && time >= a.landAt) {
          a.landed = true;
          tk.boom(a.x, a.y, 44, IRON);
          tk.sfx('stone-slam');
          if (p.active && p.hp > 0 && dist(p.x, p.y, a.x, a.y) < 50) tk.hitPlayer(14, p.x, p.y);
        }
        if (a.landed && !a.struck && time >= a.strikeAt) {
          a.struck = true;
          tk.sfx('anvil');
          const off = Math.random() * Math.PI;
          for (let i = 0; i < 8; i++) tk.spawnBullet({ x: a.x, y: a.y - 20, angle: off + (i / 8) * Math.PI * 2, speed: 210, damage: 7, r: 4, lifeMs: 2600, color: HEAT_YELLOW });
        }
      }
      anvils = anvils.filter((a) => !a.struck || time < a.strikeAt + 500);
    },
    drawGround(g, time) {
      for (const a of anvils) {
        if (a.landed) { g.fillStyle(0x000000, 0.35); g.fillEllipse(a.x, a.y + 2, 50, 14); continue; }
        const k = clamp(1 - (a.landAt - time) / tk.warn(850), 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.35); g.fillEllipse(a.x, a.y + 2, 30 + k * 30, 10 + k * 8);
        g.lineStyle(2, IRON_SHEEN, 0.3 + k * 0.5); g.strokeCircle(a.x, a.y, 50);
      }
    },
    drawAir(g, time) {
      for (const a of anvils) {
        if (!a.landed) {
          const k = clamp(1 - (a.landAt - time) / tk.warn(850), 0, 1);
          if (k > 0.5) anvil(g, a.x, a.y - (1 - (k - 0.5) / 0.5) * 220, 1.3);
          continue;
        }
        const ringing = a.struck ? clamp(1 - (time - a.strikeAt) / 500, 0, 1) : 0;
        const next = !a.struck && time > a.strikeAt - 340;
        anvil(g, a.x, a.y, 1.3, next ? 0.6 : ringing * 0.9);
        if (ringing > 0) { g.lineStyle(3 * ringing, HEAT_YELLOW, ringing); g.strokeCircle(a.x, a.y - 30, 20 + (1 - ringing) * 60); }
      }
    },
    onPhaseEnd() { anvils = []; },
  };
};

// ── Signature: Molten Run ────────────────────────────────────────────
// Rivers of molten iron snake across the floor from one wall to the other, passing close by you.
// Each path is scorched black first; then the iron runs along it and lies there, burning.

interface Run { pts: Pt[]; cum: number[]; len: number; startAt: number; front: number; until: number; tickAt: number }

const moltenRun = (tk: BossToolkit): SignatureMove => {
  let runs: Run[] = [];
  const SPEED = 440, HALF = 24, LINGER = 2400;
  const build = (time: number, i: number): Run => {
    const p = tk.player;
    const horiz = Math.random() < 0.5;
    const pts: Pt[] = [];
    const amp = 60 + Math.random() * 60, ph = Math.random() * 6;
    const off = (i - 0.5) * 140 * (tk.hard ? 0.9 : 1);
    for (let k = 0; k <= 24; k++) {
      const u = k / 24;
      if (horiz) pts.push({ x: u * tk.W, y: clamp(p.y + off + Math.sin(u * 7 + ph) * amp, TOP + 30, tk.H - 30) });
      else pts.push({ x: clamp(p.x + off + Math.sin(u * 6 + ph) * amp, 30, tk.W - 30), y: TOP + u * (tk.H - TOP) });
    }
    if (Math.random() < 0.5) pts.reverse();
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const len = cum[cum.length - 1];
    const startAt = time + tk.warn(1000) + i * 300;
    return { pts, cum, len, startAt, front: 0, until: startAt + (len / SPEED) * 1000 + LINGER, tickAt: 0 };
  };
  const near = (r: Run, x: number, y: number, upTo: number) => {
    for (let k = 1; k < r.pts.length; k++) {
      if (r.cum[k - 1] > upTo) break;
      if (segDist(x, y, r.pts[k - 1].x, r.pts[k - 1].y, r.pts[k].x, r.pts[k].y) < HALF + 14) return true;
    }
    return false;
  };
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'MOLTEN RUN',
    cast(time) {
      runs = [];
      const n = tk.hard ? 3 : 2;
      for (let i = 0; i < n; i++) runs.push(build(time, i));
      tk.sfx('oil-splash');
    },
    update(time) {
      const p = tk.player;
      for (const r of runs) {
        if (time < r.startAt) continue;
        r.front = Math.min(r.len, ((time - r.startAt) / 1000) * SPEED);
        if (time - r.tickAt > 500 && p.active && p.hp > 0 && near(r, p.x, p.y, r.front)) {
          r.tickAt = time;
          tk.hitPlayer(8, p.x, p.y);
          tk.slowPlayer(0.6, 600);
          tk.sfx('sizzle');
        }
      }
      runs = runs.filter((r) => time < r.until);
    },
    drawGround(g, time) {
      for (const r of runs) {
        const fade = clamp((r.until - time) / 500, 0, 1);
        // The scorched path.
        g.lineStyle(HALF * 2 + 6, SLAG, 0.35 * fade);
        g.beginPath(); g.moveTo(r.pts[0].x, r.pts[0].y); for (const q of r.pts) g.lineTo(q.x, q.y); g.strokePath();
        if (time < r.startAt) {
          const k = clamp(1 - (r.startAt - time) / tk.warn(1000), 0, 1);
          g.lineStyle(2, ANVIL_CORE, 0.3 + k * 0.6);
          g.beginPath(); g.moveTo(r.pts[0].x, r.pts[0].y); for (const q of r.pts) g.lineTo(q.x, q.y); g.strokePath();
          continue;
        }
        // The molten iron up to its front, cooling to red behind.
        for (let k = 1; k < r.pts.length; k++) {
          if (r.cum[k - 1] > r.front) break;
          const a = r.pts[k - 1], b = r.pts[k];
          const t = clamp((r.front - r.cum[k]) / 900, 0, 1);
          const bx = r.cum[k] > r.front ? a.x + (b.x - a.x) * ((r.front - r.cum[k - 1]) / (r.cum[k] - r.cum[k - 1])) : b.x;
          const by = r.cum[k] > r.front ? a.y + (b.y - a.y) * ((r.front - r.cum[k - 1]) / (r.cum[k] - r.cum[k - 1])) : b.y;
          g.lineStyle(HALF * 2, heatColor(0.95 - t * 0.45), fade); g.lineBetween(a.x, a.y, bx, by);
          g.lineStyle(HALF * 0.6, heatColor(1 - t * 0.3), fade * 0.9); g.lineBetween(a.x, a.y, bx, by);
        }
        if (r.front < r.len) {
          let fx = r.pts[0].x, fy = r.pts[0].y;
          for (let k = 1; k < r.pts.length; k++) {
            if (r.cum[k] >= r.front) {
              const u = (r.front - r.cum[k - 1]) / Math.max(1, r.cum[k] - r.cum[k - 1]);
              fx = r.pts[k - 1].x + (r.pts[k].x - r.pts[k - 1].x) * u; fy = r.pts[k - 1].y + (r.pts[k].y - r.pts[k - 1].y) * u;
              break;
            }
          }
          glow(g, fx, fy, 40, HEAT_YELLOW, 0.08, 3);
          g.fillStyle(HEAT_WHITE, 1); g.fillCircle(fx, fy, HALF * 0.8);
        }
      }
    },
    onPhaseEnd() { runs = []; },
  };
};

// ── Signature: Ingot Rain ────────────────────────────────────────────
// Tithe ingots fall out of the dark on long rectangular shadows — one on you, the rest scattered.
// They land with a clang and lie white-hot for a while. Stepping on a hot one burns.

interface FallingIngot { x: number; y: number; a: number; at: number; landed: boolean; hotUntil: number; tickAt: number }

const ingotRain = (tk: BossToolkit): SignatureMove => {
  let ingots: FallingIngot[] = [];
  const HW = 34, HH = 14;
  const inside = (n: FallingIngot, x: number, y: number, pad: number) => {
    const dx = x - n.x, dy = y - n.y;
    const u = dx * Math.cos(n.a) + dy * Math.sin(n.a), v = -dx * Math.sin(n.a) + dy * Math.cos(n.a);
    return Math.abs(u) < HW + pad && Math.abs(v) < HH + pad;
  };
  const corners = (n: FallingIngot, w: number, h: number, dy = 0): Pt[] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({
    x: n.x + Math.cos(n.a) * i * w - Math.sin(n.a) * j * h,
    y: n.y + dy + Math.sin(n.a) * i * w + Math.cos(n.a) * j * h,
  }));
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'INGOT RAIN',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 9 : 7;
      ingots = [];
      for (let i = 0; i < n; i++) {
        const onYou = i === 0;
        const x = onYou ? p.x : 80 + Math.random() * (tk.W - 160);
        const y = onYou ? p.y : TOP + 60 + Math.random() * (tk.H - TOP - 100);
        ingots.push({ x: tk.clampX(x), y: tk.clampY(y), a: Math.random() * Math.PI, at: time + tk.warn(950) + i * 170, landed: false, hotUntil: 0, tickAt: 0 });
      }
      tk.sfx('mortar-launch');
    },
    update(time) {
      const p = tk.player;
      for (const n of ingots) {
        if (!n.landed && time >= n.at) {
          n.landed = true;
          n.hotUntil = time + 2600;
          tk.sfx('clang');
          if (p.active && p.hp > 0 && inside(n, p.x, p.y, 16)) { tk.hitPlayer(14, p.x, p.y); n.tickAt = time; }
        } else if (n.landed && time < n.hotUntil && time - n.tickAt > 600 && p.active && p.hp > 0 && inside(n, p.x, p.y, 8)) {
          n.tickAt = time;
          tk.hitPlayer(4, p.x, p.y);
        }
      }
      ingots = ingots.filter((n) => !n.landed || time < n.hotUntil);
    },
    drawGround(g, time) {
      for (const n of ingots) {
        if (!n.landed) {
          const k = clamp(1 - (n.at - time) / tk.warn(950), 0, 1);
          poly(g, corners(n, HW * (0.6 + k * 0.4), HH * (0.6 + k * 0.4)), 0x000000, 0.15 + k * 0.35);
          g.lineStyle(1.5, ANVIL_CORE, 0.25 + k * 0.6); g.strokePoints(corners(n, HW + 8, HH + 8), true);
          continue;
        }
        const heat = clamp((n.hotUntil - time) / 2600, 0, 1);
        glow(g, n.x, n.y, 46, HEAT_ORANGE, 0.03 * heat, 3);
        poly(g, corners(n, HW + 3, HH + 3), dim(heatColor(heat), 0.3));
        poly(g, corners(n, HW, HH, -3), heatColor(heat * 0.95));
        regentSeal(g, n.x, n.y - 3, 6, dim(heatColor(heat), 0.4));
      }
    },
    drawAir(g, time) {
      for (const n of ingots) {
        if (n.landed) continue;
        const k = clamp(1 - (n.at - time) / tk.warn(950), 0, 1);
        if (k < 0.6) continue;
        const dy = -(1 - (k - 0.6) / 0.4) * 260;
        poly(g, corners(n, HW, HH, dy), heatColor(0.8));
        g.lineStyle(2, HEAT_YELLOW, 0.5); g.lineBetween(n.x, n.y + dy - 16, n.x, n.y + dy - 60);
      }
    },
    onPhaseEnd() { ingots = []; },
  };
};

// ── Signature: Core Vent ─────────────────────────────────────────────
// He plants, throws his chest open and sweeps a beam of white heat across the floor; then the core
// spits gobbets of slag that curl after you.

const coreVent = (tk: BossToolkit): SignatureMove => {
  let sweep: { a0: number; a1: number; startAt: number; travel: number; ox: number; oy: number } | null = null;
  let globs: { at: number; done: boolean }[] = [];
  return {
    durationMs: 3200,
    windupMs: 800,
    gesture: 'flex',
    hold: 'brace',
    locksBody: true,
    tell: 'CORE VENT',
    cast(time) {
      const a = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const a0 = a - dir * 1.25, a1 = a + dir * 1.25;
      const travel = tk.hard ? 1300 : 1600;
      tk.spawnSweep({ ox: tk.bossX, oy: tk.bossY, a0, a1, warnMs: 900, travelMs: travel, halfW: 24, damage: 16, length: 600 });
      sweep = { a0, a1, startAt: time + tk.warn(900), travel, ox: tk.bossX, oy: tk.bossY };
      globs = [0, 1, 2].map((i) => ({ at: sweep!.startAt + travel + 150 + i * 260, done: false }));
      tk.sfx('beam-charge');
    },
    update(time) {
      for (const gl of globs) {
        if (gl.done || time < gl.at) continue;
        gl.done = true;
        const a = tk.angleToPlayer();
        for (const k of [-1, 0, 1]) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: a + k * 0.32, speed: 175, damage: 8, r: 7, turn: 0.55, lifeMs: 3200, color: HEAT_ORANGE });
        tk.sfx('slime-splat');
      }
      if (sweep && time > sweep.startAt + sweep.travel + 300) sweep = null;
    },
    drawAir(g, time) {
      if (!sweep || time < sweep.startAt) return;
      const k = clamp((time - sweep.startAt) / sweep.travel, 0, 1);
      const a = sweep.a0 + (sweep.a1 - sweep.a0) * k;
      const ex = sweep.ox + Math.cos(a) * 600, ey = sweep.oy + Math.sin(a) * 600;
      // Heat shimmer either side, the white beam in the middle.
      g.lineStyle(44, HEAT_ORANGE, 0.12); g.lineBetween(sweep.ox, sweep.oy, ex, ey);
      g.lineStyle(22, HEAT_YELLOW, 0.5); g.lineBetween(sweep.ox, sweep.oy, ex, ey);
      g.lineStyle(8, HEAT_WHITE, 0.95); g.lineBetween(sweep.ox, sweep.oy, ex, ey);
      for (let i = 0; i < 8; i++) {
        const d = ((time / 3 + i * 80) % 600);
        g.fillStyle(HEAT_WHITE, 0.8); g.fillCircle(sweep.ox + Math.cos(a) * d + Math.sin(i) * 8, sweep.oy + Math.sin(a) * d + Math.cos(i) * 8, 2);
      }
    },
    onPhaseEnd() { sweep = null; globs = []; },
  };
};

// ── Signature: Folded Steel (Tempered) ───────────────────────────────
// Three blade sweeps, back, forth and wide, each leaving a fan of temper colours hanging in the
// air behind the edge — straw, bronze, purple, blue — as steel shows when it is drawn.

const TEMPER_COLORS = [0xe8d27a, 0xc08a3a, 0x8a4aa8, 0x3a5ad0, 0x6a9ad8];

const foldedSteel = (tk: BossToolkit): SignatureMove => {
  let cuts: { a0: number; a1: number; startAt: number; travel: number; ox: number; oy: number }[] = [];
  return {
    durationMs: 2900,
    windupMs: 550,
    gesture: 'sweep',
    hold: 'draw',
    tell: 'FOLDED STEEL',
    cast(time) {
      workHeat(time);
      const a = tk.angleToPlayer();
      const plan: [number, number, number][] = [[a - 0.9, a + 0.9, 0], [a + 0.9, a - 0.9, 650], [a - 1.4, a + 1.4, 1300]];
      cuts = plan.map(([a0, a1, delay]) => {
        const travel = 520;
        tk.schedule(delay, () => tk.spawnSweep({ ox: tk.bossX, oy: tk.bossY, a0, a1, warnMs: 450, travelMs: travel, halfW: 18, damage: 13, length: 470 }));
        return { a0, a1, startAt: time + delay + tk.warn(450), travel, ox: tk.bossX, oy: tk.bossY };
      });
      tk.sfx('slash');
    },
    update(time) {
      for (const c of cuts) { if (time < c.startAt) { c.ox = tk.bossX; c.oy = tk.bossY; } }
      cuts = cuts.filter((c) => time < c.startAt + c.travel + 700);
    },
    drawAir(g, time) {
      for (const c of cuts) {
        if (time < c.startAt) continue;
        const k = clamp((time - c.startAt) / c.travel, 0, 1);
        const fade = clamp(1 - (time - c.startAt - c.travel) / 700, 0, 1);
        const a = c.a0 + (c.a1 - c.a0) * k;
        // The afterimage: bands of temper colour across the swept fan.
        for (let i = 0; i < TEMPER_COLORS.length; i++) {
          const r = 90 + i * 76;
          g.lineStyle(10, TEMPER_COLORS[i], 0.35 * fade);
          g.beginPath();
          g.arc(c.ox, c.oy, r, Math.min(c.a0, a), Math.max(c.a0, a), false);
          g.strokePath();
        }
        if (k < 1) {
          g.lineStyle(5, HEAT_WHITE, 0.95); g.lineBetween(c.ox, c.oy, c.ox + Math.cos(a) * 470, c.oy + Math.sin(a) * 470);
          g.lineStyle(2, IRON_SHEEN, 1); g.lineBetween(c.ox + Math.cos(a + 0.02) * 30, c.oy + Math.sin(a + 0.02) * 30, c.ox + Math.cos(a + 0.02) * 470, c.oy + Math.sin(a + 0.02) * 470);
        }
      }
    },
    onPhaseEnd() { cuts = []; },
  };
};

// ── Signature: Quench (Tempered) ─────────────────────────────────────
// He plunges into the quench: two rings of steam roll out of him, their gaps a little apart, and
// he comes out cold — his glow gone at once. Also runs his temper: while he is cold, nothing marks him.

const quench = (tk: BossToolkit): SignatureMove => {
  let plungeAt = -9999;
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'clap',
    tell: 'QUENCH',
    cast(time) {
      plungeAt = time;
      glowUntil = 0;
      const gap = Math.random() * Math.PI * 2;
      tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: 380, speed: 290, gapCentre: gap, gapHalf: 0.6, band: 16, damage: 12 });
      tk.spawnRing({ cx: tk.bossX, cy: tk.bossY, delayMs: 1050, speed: 290, gapCentre: gap + 0.4, gapHalf: 0.6, band: 16, damage: 12 });
      tk.sfx('geyser');
    },
    // The temper: impervious while he is cold.
    takenMult() { return tempered() && tk.now >= glowUntil ? 0 : 1; },
    drawAir(g, time) {
      const k = (time - plungeAt) / 1600;
      if (k < 0 || k > 1) return;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + i;
        const d = 30 + k * 120 * (0.7 + ((i * 7) % 5) / 10);
        g.fillStyle(STEAM, 0.4 * (1 - k)); g.fillCircle(tk.bossX + Math.cos(a) * d, tk.bossY + Math.sin(a) * d * 0.7 - k * 50, 16 + k * 26);
      }
      // The tank he went into, rising out of the floor and sinking back.
      const up = Math.sin(Math.min(1, k * 2) * Math.PI);
      slackTub(g, tk.bossX, tk.bossY + 26, 46 * up + 1);
    },
    onPhaseEnd() { plungeAt = -9999; glowUntil = 0; },
  };
};

export const ANVIL_BOSS: WorldBossDef = {
  worldId: 'isle:anvil',
  name: 'Prince Anvil',
  title: 'the Unbending',
  color: ANVIL,
  colorLit: ANVIL_LIT,
  colorDark: ANVIL_DARK,
  accent: ANVIL_CORE,
  // Tier 3 of the fifth isle.
  damageMult: 1.25,

  intro: [
    'You beat my five. Good iron, all of them. I will have them reforged.',
    'Everything is ore until it is struck. Come here and be struck.',
  ],
  banter: [
    'Soft things bend. I was soft once. Father fixed it.',
    'Weigh heavy. Strike true. Do not sing.',
    'A hinge is a weakness that moves. I do not make hinges.',
    'Every blow makes the iron better. Remember that while I make you better.',
    'Stand still on the anvil. It goes easier.',
  ],
  defeatLine: 'THE HAMMER IS DOWN',
  resumeLine: 'Back on the anvil. Good. Iron that comes back for more is worth working.',

  phases: [
    {
      name: 'Hammer and Tongs',
      line: 'Hammer and tongs. That is how my father taught me. That is how I will teach you.',
      hp: 490,
      cycle: [
        'sig:hammer', 'volley', 'sig:tongs', 'quake', 'sig:chorus',
        'radial', 'sig:hammer', 'sig:tongs', 'barrage', 'sig:chorus',
      ],
      harass: ['h-snipe', 'h-flak'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Molten Core',
      line: 'You have brought me to heat. Nobody brings me to heat. Now the iron runs.',
      hp: 580,
      cycle: [
        'sig:pour', 'sig:ingots', 'lanes', 'sig:core', 'sig:pour',
        'hazard', 'sig:ingots', 'spiral', 'sig:core',
      ],
      harass: ['h-flak', 'h-lane', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'QUENCHED, HE COMES OUT HARD',
    extraPhase: {
      name: 'Tempered',
      line: 'Quenched. As I was at ten. Strike me while I glow — when I am cold, nothing marks me.',
      hp: 420,
      cycle: [
        'sig:folded', 'sig:quench', 'sig:hammer', 'homing',
        'sig:folded', 'sig:tongs', 'sig:quench', 'sweep',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 14, speed: 185 },
    quake: { radius: 120 },
    hazard: { radius: 64 },
    spiral: { arms: 3, speed: 170 },
  },

  signatures: {
    hammer: dropForge,
    tongs,
    chorus,
    pour: moltenRun,
    ingots: ingotRain,
    core: coreVent,
    folded: foldedSteel,
    quench,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'sparks', hands: 'gauntlet',
    torsoR: 38, mouth: 'grate', eyes: 2, eyeColor: ANVIL_CORE,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'hot', look: { aura: 'flame', pattern: 'cracks', mouth: 'maw' } },
    { movement: 'rush', gimmick: 'none', tint: 'cold', look: { aura: 'smoke', pattern: 'smooth', mouth: 'line', hands: 'blade' } },
  ],

  /**
   * The Unbending's tells. His helm *is* an anvil — a flat steel face across his brow, the horn
   * jutting forward over his eyes, the heel behind — and a leather apron hangs from his waist.
   * He swings a great sledge in one hand and carries long tongs in the other. In the Molten Core
   * his chest splits along white-hot seams and iron drips from the sledge; Tempered, he is
   * blued steel banded in temper colours, carrying a folded blade, and he only glows when he works.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    hardNow = s.hard;
    const R = s.radius;
    const molten = s.phaseIdx === 1;
    const temperedNow = s.hard && s.phaseIdx >= 2;
    const glowing = temperedNow && s.t < glowUntil;
    // The apron.
    poly(g, [{ x: s.x - R * 0.6, y: s.y + R * 0.2 }, { x: s.x + R * 0.6, y: s.y + R * 0.2 }, { x: s.x + R * 0.75, y: s.y + R * 1.3 }, { x: s.x - R * 0.75, y: s.y + R * 1.3 }], molten ? dim(LEATHER, 0.3) : LEATHER, 0.95);
    g.fillStyle(LEATHER_LIT, 0.5); g.fillRect(s.x - R * 0.55, s.y + R * 0.22, R * 1.1, 3);
    for (let i = 0; i < 3; i++) { g.fillStyle(0x000000, 0.25); g.fillCircle(s.x - R * 0.3 + i * R * 0.3, s.y + R * (0.7 + (i % 2) * 0.25), 3); }
    // Molten seams across the chest.
    if (molten) {
      const pulse = 0.7 + Math.sin(s.t / 120) * 0.3;
      glow(g, s.x, s.y, R * 1.2, ANVIL_CORE, 0.04 * pulse, 3);
      g.lineStyle(4, HEAT_YELLOW, pulse);
      g.lineBetween(s.x - R * 0.5, s.y - R * 0.4, s.x - R * 0.1, s.y); g.lineBetween(s.x - R * 0.1, s.y, s.x + R * 0.2, s.y - R * 0.3);
      g.lineBetween(s.x + R * 0.2, s.y - R * 0.3, s.x + R * 0.55, s.y + R * 0.1); g.lineBetween(s.x - R * 0.1, s.y, s.x, s.y + R * 0.45);
      g.lineStyle(2, HEAT_WHITE, pulse); g.lineBetween(s.x - R * 0.1, s.y, s.x + R * 0.2, s.y - R * 0.3);
    }
    // Temper bands.
    if (temperedNow) {
      for (let i = 0; i < TEMPER_COLORS.length; i++) {
        g.lineStyle(3, TEMPER_COLORS[i], 0.55); g.strokeCircle(s.x, s.y, R * (0.35 + i * 0.13));
      }
      if (glowing) {
        const k = clamp((glowUntil - s.t) / 3600, 0, 1);
        glow(g, s.x, s.y, R * 1.5, HEAT_ORANGE, 0.05 + k * 0.04, 3);
        g.lineStyle(3, HEAT_YELLOW, 0.5 + k * 0.5); g.strokeCircle(s.x, s.y, R * 1.08);
      } else {
        // The cold sheen sliding across him.
        const ph = (s.t / 1400) % 1;
        g.lineStyle(3, IRON_SHEEN, 0.5 * Math.sin(ph * Math.PI));
        g.lineBetween(s.x - R + ph * R * 2, s.y - R * 0.9, s.x - R * 0.6 + ph * R * 2, s.y + R * 0.9);
      }
    }
    // The anvil helm: heel behind, flat face, horn forward over the eyes.
    const hy = s.y - R * 0.95;
    const f = Math.cos(s.facing) >= 0 ? 1 : -1;
    const helm = temperedNow ? mixC(ANVIL, 0x3a5ad0, 0.35) : molten ? mixC(ANVIL, HEAT_RED, 0.35) : ANVIL;
    poly(g, [
      { x: s.x - R * 0.55, y: hy + R * 0.25 }, { x: s.x + R * 0.55, y: hy + R * 0.25 }, { x: s.x + R * 0.4, y: hy },
      { x: s.x - R * 0.4, y: hy },
    ], dim(helm, 0.3));
    poly(g, [
      { x: s.x - f * R * 0.85, y: hy - R * 0.02 }, { x: s.x - f * R * 0.7, y: hy - R * 0.32 }, { x: s.x + f * R * 0.62, y: hy - R * 0.32 },
      { x: s.x + f * R * 1.35, y: hy - R * 0.2 }, { x: s.x + f * R * 0.62, y: hy - R * 0.02 },
    ], helm);
    g.fillStyle(molten ? HEAT_YELLOW : IRON_SHEEN, molten ? 0.9 : 0.8); g.fillRect(s.x - R * 0.68, hy - R * 0.36, R * 1.3, 3);
    rivets(g, s.x - R * 0.5, hy - R * 0.12, s.x + R * 0.5, hy - R * 0.12, 4, 1.4, ANVIL_LIT);
    // The sledge (or, tempered, the folded blade) in the first hand.
    const h0 = s.hands[0];
    if (h0) {
      const raise = s.castGlow;
      if (temperedNow) {
        const a = -Math.PI / 2 - 0.4 - raise * 0.5;
        const ex = h0.x + Math.cos(a) * R * 1.6, ey = h0.y + Math.sin(a) * R * 1.6;
        g.lineStyle(7, IRON_DARK, 1); g.lineBetween(h0.x, h0.y, ex, ey);
        g.lineStyle(4, IRON_SHEEN, 1); g.lineBetween(h0.x, h0.y, ex, ey);
        for (let i = 0; i < 4; i++) { const k = 0.3 + i * 0.17; g.fillStyle(TEMPER_COLORS[i], 0.8); g.fillCircle(h0.x + (ex - h0.x) * k, h0.y + (ey - h0.y) * k, 2); }
        g.lineStyle(4, BRONZE, 1); g.lineBetween(h0.x - 9, h0.y + 3, h0.x + 9, h0.y - 3);
      } else {
        const a = -Math.PI / 2 - 0.25 - raise * 0.6;
        const hx = h0.x + Math.cos(a) * R * 1.25, hhy = h0.y + Math.sin(a) * R * 1.25;
        g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(h0.x, h0.y + 8, hx, hhy);
        g.lineStyle(2, TIMBER, 1); g.lineBetween(h0.x - 1, h0.y + 8, hx - 1, hhy);
        const head = molten ? heatColor(0.75 + Math.sin(s.t / 100) * 0.1) : IRON_DARK;
        g.fillStyle(head, 1); g.fillRect(hx - 18, hhy - 14, 36, 22);
        g.fillStyle(molten ? HEAT_WHITE : IRON, molten ? 0.6 : 1); g.fillRect(hx - 16, hhy - 12, 12, 18);
        if (molten) {
          for (let i = 0; i < 2; i++) {
            const ph = (s.t / 700 + i / 2) % 1;
            g.fillStyle(HEAT_ORANGE, 1 - ph); g.fillCircle(hx - 6 + i * 12, hhy + 10 + ph * 40, 3 * (1 - ph * 0.5));
          }
        }
      }
    }
    // The tongs in the second hand.
    const h1 = s.hands[1];
    if (h1) {
      for (const k of [-1, 1]) {
        g.lineStyle(3, IRON_DARK, 1); g.lineBetween(h1.x, h1.y, h1.x + 10 + k * 3, h1.y + R * 0.9);
        g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(h1.x, h1.y - 1, h1.x + 10 + k * 3, h1.y + R * 0.9 - 1);
      }
      g.fillStyle(IRON_SHEEN, 1); g.fillCircle(h1.x + 4, h1.y + R * 0.3, 2.5);
      if (molten) { g.fillStyle(heatColor(0.85), 1); g.fillRect(h1.x + 4, h1.y + R * 0.9 - 4, 14, 6); }
    }
    if (s.enraged) { g.lineStyle(1.5, ANVIL_CORE, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The floor of the Anvil Hall: rings of riveted black plate round a great anvil inlaid in
   * polished steel, the Hall's forge hearths along the top wall glowing under their hoods, racks
   * of sledges down the left, the Prince's quench tank on the right, and a slag gutter along the
   * foot of the room.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xa77e11);
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(IRON_DARK, 1); g.fillRect(0, 0, W, H);
    // Concentric rings of plate, each ring cut into segments.
    for (let ring = 8; ring >= 1; ring--) {
      const r0 = ring * 62;
      const n = ring * 6;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const tone = mixC(IRON, IRON_DARK, ((i + ring) % 3) * 0.25 + rng() * 0.1);
        g.fillStyle(tone, 1);
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r0, a0 + 0.01, a1 - 0.01, false); g.closePath(); g.fillPath();
      }
      g.lineStyle(3, ANVIL_DARK, 1); g.strokeCircle(cx, cy, r0);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillStyle(IRON_LIT, 0.7); g.fillCircle(cx + Math.cos(a) * (r0 - 8), cy + Math.sin(a) * (r0 - 8), 1.6); }
    }
    // The inlaid anvil.
    g.fillStyle(IRON_SHEEN, 0.18);
    g.fillRect(cx - 90, cy - 30, 170, 34);
    g.fillTriangle(cx + 80, cy - 30, cx + 80, cy + 4, cx + 170, cy - 18);
    g.fillRect(cx - 120, cy - 30, 30, 22);
    g.fillRect(cx - 40, cy + 4, 80, 22); g.fillRect(cx - 70, cy + 26, 140, 18);
    g.lineStyle(2, IRON_SHEEN, 0.4); g.strokeRect(cx - 90, cy - 30, 170, 34);
    regentSeal(g, cx, cy - 13, 12, dim(IRON, 0.2));
    // Hearths along the top wall.
    g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 0, W, 110);
    for (let y = 2; y < 108; y += 9) for (let x = ((y / 9) | 0) % 2 ? 0 : 9; x < W; x += 18) { g.fillStyle(rng() < 0.2 ? dim(BRICK, 0.2) : BRICK, 1); g.fillRect(x, y, 16, 7); }
    for (let i = 0; i < 5; i++) {
      const hx = 96 + i * 192;
      g.fillStyle(STONE_DARK, 1); g.fillRect(hx - 56, 52, 112, 58);
      g.fillStyle(0x140806, 1); g.fillRoundedRect(hx - 40, 64, 80, 40, 10);
      g.fillStyle(HEAT_ORANGE, 0.85); g.fillRoundedRect(hx - 32, 74, 64, 26, 8);
      g.fillStyle(HEAT_YELLOW, 0.8); g.fillEllipse(hx, 92, 40, 10);
      g.fillStyle(IRON_DARK, 1); g.fillTriangle(hx - 64, 52, hx + 64, 52, hx, 6);
      g.fillStyle(IRON, 1); g.fillTriangle(hx - 56, 52, hx + 56, 52, hx, 12);
      glow(g, hx, 110, 70, HEAT_ORANGE, 0.04, 3);
      bellows(g, hx - 74, 96, 0.9, 0.3);
    }
    g.fillStyle(IRONSTONE_DARK, 1); g.fillRect(0, 108, W, 8);
    // Racks of sledges down the left wall.
    for (let y = 170; y < H - 80; y += 110) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(8, y, 40, 8);
      for (let i = 0; i < 3; i++) {
        g.lineStyle(4, TIMBER, 1); g.lineBetween(14 + i * 12, y + 8, 14 + i * 12, y + 70);
        g.fillStyle(IRON_DARK, 1); g.fillRect(8 + i * 12, y + 64, 14, 16);
      }
    }
    // The quench tank on the right.
    g.fillStyle(IRON_DARK, 1); g.fillRect(W - 70, 240, 62, 220);
    g.fillStyle(0x2a3c48, 1); g.fillRect(W - 62, 250, 46, 200);
    g.fillStyle(0x6a8ea0, 0.25); g.fillRect(W - 58, 256, 12, 186);
    rivets(g, W - 66, 244, W - 66, 456, 10, 1.4, IRON_SHEEN);
    for (let i = 0; i < 4; i++) { g.fillStyle(STEAM, 0.12); g.fillCircle(W - 40 + (rng() - 0.5) * 30, 250 - i * 14, 16 + i * 4); }
    // The slag gutter along the foot.
    g.fillStyle(BRICK_DARK, 1); g.fillRect(0, H - 22, W, 22);
    g.fillStyle(HEAT_RED, 0.75); g.fillRect(0, H - 16, W, 10);
    for (let x = 0; x < W; x += 26) { g.fillStyle(SLAG, 0.9); g.fillEllipse(x + rng() * 14, H - 11, 14, 5); }
    // Scale and spark-burns on the plates.
    for (let i = 0; i < 70; i++) { g.fillStyle(rng() < 0.5 ? 0x000000 : HEAT_RED, 0.2); g.fillCircle(60 + rng() * (W - 120), 140 + rng() * (H - 190), 1 + rng() * 3); }
  },
};
