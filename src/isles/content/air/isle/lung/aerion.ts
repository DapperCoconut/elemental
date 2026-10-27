import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  BECALMED_SKINS, BRASS, BRASS_DARK, BREATH, CLOUD, CORK, GLASS, OAK, OAK_DARK, OVERDUE, ROYAL, ROYAL_DEEP, SAILCLOTH, SKY, SKY_DEEP,
  aerionSigil, bellows, breathBottle, breathMeter, cloudPuff, sailArm, sleeper, weathervane, windStreak,
} from './art';

/**
 * King Aerion the Breath-Taxer, Sovereign of Highspire — the Air Isle's monarch and finale.
 *
 * He owns the air, meters every breath above the cloud line, and keeps the isle's arrears corked
 * in bottles in his palace. The fight is one long breath, taken and given back:
 *
 *   I   The Tax           — enthroned on his bellows. The air thins and a brass meter goes on your
 *                           chest — gasp from the ration bottles he sets down or go breathless;
 *                           the toll-bellows draw you in and blow a fan of corks back out; he
 *                           chalks your debt on the floor in a tally, four strokes and the fifth
 *                           struck through them all.
 *   II  The Inhale        — he draws everything toward his mouth. The whole room is pulled at him
 *                           while the debris of the isle — shingles, sail-rags, corks — streams in
 *                           off the walls along drawn lines; two spiral draughts wheel slowly round
 *                           him like water round a drain; he gasps, and rings of air collapse on you.
 *   III Hurricane Crown   — the palace sails turn. Their great lattice arms sweep the floor from
 *                           the hub overhead, each with one bare bay the wind goes through;
 *                           tornadoes walk the room; his crown throws off a spiral of gale-blades.
 *   IV  Breathless        — he lets it all out at once. A wall of wind crosses the room with only
 *                           a few calm eddies in it; the stolen bottles crack one after another
 *                           and burst into stars of gust; then he is out of breath and gasps at
 *                           the loosed breaths — catch them before he drinks them back.
 *   V   Vacuum (hard)     — the air is gone. Breathe only inside one drifting pocket; the vacuum
 *                           implodes where it is thinnest; a great bell jar comes down over you.
 *
 * Every signature is bespoke and none of them look like the Brand-King's, the Tide-Queen's or the
 * Gardener's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const A_MAIN = 0x8a9ae8;
const A_LIT = 0xe8f0ff;
const A_DARK = 0x1e2458;
const CHALK = 0xf4f0e4;
const GALE = 0xd8ecff;
const VOID = 0x0a0c18;

const FT = 96;
/** The anchor post an `anchor` phase stands on — the bellows-throne is painted round it. */
const THRONE = { x: 480, y: 218 };
const PLAYER_R = 20;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);
const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
/** Move the player bodily (the wind does it), clamped to the field. */
const carry = (tk: BossToolkit, dx: number, dy: number): void => {
  const p = tk.player;
  if (!p.active || p.hp <= 0) return;
  p.x = clampN(p.x + dx, 40, tk.W - 40);
  p.y = clampN(p.y + dy, FT + 20, tk.H - 40);
};
const live = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;
type Gfx = Phaser.GameObjects.Graphics;

/** A breath-meter worn over the player's head — shared by the Tax and the Vacuum. */
function drawPlayerMeter(g: Gfx, tk: BossToolkit, fill: number, time: number): void {
  const p = tk.player;
  const low = fill < 0.25;
  const x = p.x, y = p.y - 50;
  if (low && Math.floor(time / 140) % 2 === 0) { g.fillStyle(OVERDUE, 0.35); g.fillCircle(x, y, 20); }
  breathMeter(g, x, y, 14, fill, 1);
  g.lineStyle(2, low ? OVERDUE : BRASS, 0.9); g.strokeCircle(x, y, 16);
}

// ── I. The Breath Tax ────────────────────────────────────────────────
// A brass meter goes on your chest and the room's air thins: it drains for seven seconds. He sets
// ration bottles down round the room; reach one and gasp from it. Run dry and you are breathless.

const breathTax = (tk: BossToolkit): SignatureMove => {
  const DRAIN = 16;
  const GULP = 45;
  const LEVY_MS = 7000;
  let meter = 100;
  let until = 0;
  let lastChoke = 0;
  let bottles: { x: number; y: number; taken: boolean; at: number }[] = [];
  return {
    durationMs: 2800,
    windupMs: 900,
    gesture: 'point',
    tell: 'THE BREATH TAX',
    cast(time) {
      if (time >= until) meter = 100;
      until = time + LEVY_MS;
      bottles = [];
      const p = tk.player;
      const n = tk.hard ? 3 : 4;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const d = 170 + Math.random() * 120;
        bottles.push({ x: tk.clampX(tk.player.x + Math.cos(a) * d, 70), y: tk.clampY(p.y + Math.sin(a) * d, 70), taken: false, at: time + i * 120 });
      }
      tk.sfx('money');
      float(tk, p.x, p.y - 70, 'METERED', '#ffe08a');
    },
    update(time, dt) {
      if (time >= until) return;
      const p = tk.player;
      meter = Math.max(0, meter - DRAIN * dt);
      for (const b of bottles) {
        if (b.taken || time < b.at || !live(tk)) continue;
        if (dist(p.x, p.y, b.x, b.y - 10) < 34) {
          b.taken = true;
          meter = Math.min(100, meter + GULP);
          float(tk, b.x, b.y - 40, 'GASP', '#d8f4ff');
          tk.sfx('bubble');
        }
      }
      if (meter <= 0 && live(tk) && time - lastChoke > 600) {
        lastChoke = time;
        tk.hitPlayer(5, p.x, p.y);
        tk.slowPlayer(0.65, 650);
        float(tk, p.x, p.y - 40, 'BREATHLESS', '#ff9a8a');
      }
    },
    drawGround(g, time) {
      if (time >= until) return;
      // The air thinning: pale streaks drawn off the floor toward the throne.
      for (let i = 0; i < 14; i++) {
        const k = ((time / 1600) + i / 14) % 1;
        const a = (i / 14) * Math.PI * 2;
        const r = 420 * (1 - k);
        windStreak(g, tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r * 0.75, a + Math.PI, 20, 0.25 * k);
      }
      for (const b of bottles) {
        if (b.taken || time < b.at) continue;
        g.lineStyle(2, BREATH, 0.4 + Math.sin(time / 160 + b.x) * 0.2); g.strokeCircle(b.x, b.y - 8, 30);
        g.fillStyle(BREATH, 0.08); g.fillCircle(b.x, b.y - 8, 30);
      }
    },
    drawAir(g, time) {
      if (time >= until) return;
      for (const b of bottles) {
        if (b.taken || time < b.at) continue;
        const drop = clampN((time - b.at) / 260, 0, 1);
        breathBottle(g, b.x, b.y - (1 - drop) * 50, 1.2, time / 1000 + b.x, 1);
      }
      if (live(tk)) drawPlayerMeter(g, tk, meter / 100, time);
    },
    onPhaseEnd() { until = 0; bottles = []; },
  };
};

// ── I. The Toll-Bellows ──────────────────────────────────────────────
// The throne's bellows draw: a cone of the floor in front of him is sucked toward his feet. Then
// they blow — whatever is in the cone is thrown back out, and a fan of corks comes with it.

const tollBellows = (tk: BossToolkit): SignatureMove => {
  const HALF = 0.5;
  const LEN = 640;
  const CORKS = 7;
  let active = false;
  let a = 0;
  let born = 0, blowAt = 0, blowEnd = 0;
  let blew = false;
  let thrown = false;
  const inCone = (x: number, y: number): boolean => {
    const d = dist(x, y, tk.bossX, tk.bossY);
    return d < LEN && Math.abs(wrap(Math.atan2(y - tk.bossY, x - tk.bossX) - a)) < HALF + Math.atan2(PLAYER_R, Math.max(40, d));
  };
  return {
    durationMs: 3400,
    windupMs: 800,
    hold: 'draw',
    tell: 'THE TOLL-BELLOWS',
    cast(time) {
      active = true;
      a = tk.angleToPlayer();
      born = time;
      blowAt = time + tk.warn(1500);
      blowEnd = blowAt + 360;
      blew = false;
      thrown = false;
      tk.pull(tk.bossX, tk.bossY, 95, blowAt - time);
      tk.sfx('gust');
    },
    update(time, dt) {
      if (!active) return;
      if (time > blowEnd + 900) { active = false; return; }
      if (!blew && time >= blowAt) {
        blew = true;
        tk.sfx('tornado');
        for (let i = 0; i < CORKS; i++) {
          const ca = a - HALF + ((i + 0.5) / CORKS) * HALF * 2;
          tk.spawnBullet({ x: tk.bossX + Math.cos(ca) * 40, y: tk.bossY + Math.sin(ca) * 40, angle: ca, speed: 270, damage: 9, r: 7, lifeMs: 3200, color: CORK });
        }
        const p = tk.player;
        if (live(tk) && inCone(p.x, p.y)) { thrown = true; tk.hitPlayer(14, p.x, p.y); float(tk, p.x, p.y - 44, 'TOLLED', '#ffe08a'); }
      }
      if (thrown && time < blowEnd) {
        const p = tk.player;
        const pa = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        carry(tk, Math.cos(pa) * 520 * dt, Math.sin(pa) * 520 * dt);
      }
    },
    drawGround(g, time) {
      if (!active || time > blowEnd) return;
      const k = clampN((time - born) / Math.max(1, blowAt - born), 0, 1);
      g.fillStyle(GALE, 0.05 + k * 0.14);
      g.slice(tk.bossX, tk.bossY, LEN, a - HALF, a + HALF, false); g.fillPath();
      g.lineStyle(2, 0xffffff, 0.3 + k * 0.4);
      for (const s of [-1, 1]) g.lineBetween(tk.bossX, tk.bossY, tk.bossX + Math.cos(a + s * HALF) * LEN, tk.bossY + Math.sin(a + s * HALF) * LEN);
      if (k > 0.78 && Math.floor(time / 100) % 2 === 0) {
        g.lineStyle(3, 0xff9a8a, 0.6); g.beginPath(); g.arc(tk.bossX, tk.bossY, LEN, a - HALF, a + HALF, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const ox = tk.bossX + Math.cos(a) * 30, oy = tk.bossY + Math.sin(a) * 30 + 10;
      if (time < blowAt) {
        // Air streaming into the nozzle.
        for (let i = 0; i < 16; i++) {
          const k = ((time / 700) + i / 16) % 1;
          const sa = a + ((((i * 7) % 11) - 5) / 5) * HALF;
          const r = LEN * (1 - k);
          windStreak(g, tk.bossX + Math.cos(sa) * r, tk.bossY + Math.sin(sa) * r, sa + Math.PI, 26, 0.3 + k * 0.5);
        }
        bellows(g, ox, oy, 90, a, 0.4 + 0.6 * clampN((time - born) / Math.max(1, blowAt - born), 0, 1), 1);
      } else if (time < blowEnd + 300) {
        const k = (time - blowAt) / 660;
        bellows(g, ox, oy, 90, a, Math.max(0.05, 1 - k * 3), 1);
        for (let i = 0; i < 22; i++) {
          const sa = a + ((((i * 7) % 11) - 5) / 5) * HALF;
          const r = LEN * clampN(k * 1.6 + (i % 4) * 0.05, 0, 1);
          windStreak(g, tk.bossX + Math.cos(sa) * r, tk.bossY + Math.sin(sa) * r, sa, 36, 0.8 * (1 - k));
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── I. The Tally ─────────────────────────────────────────────────────
// He chalks your arrears on the floor round you the way a clerk does: four strokes, struck down one
// after another, and then the fifth drawn through them all. Stand between the strokes; then step
// out of the line of the fifth.

const tally = (tk: BossToolkit): SignatureMove => {
  const GAP = 112;
  const LEN = 280;
  const HALF = 15;
  interface Stroke { x1: number; y1: number; x2: number; y2: number; at: number; done: boolean; half: number; dmg: number }
  let strokes: Stroke[] = [];
  let born = 0;
  return {
    durationMs: 3400,
    windupMs: 850,
    gesture: 'slam',
    tell: 'THE TALLY',
    cast(time) {
      const p = tk.player;
      const cx = tk.clampX(p.x, 190), cy = tk.clampY(p.y, 170);
      const rot = (Math.random() - 0.5) * 0.5;
      const ca = Math.cos(rot), sa = Math.sin(rot);
      const P = (u: number, v: number) => ({ x: cx + ca * u - sa * v, y: cy + sa * u + ca * v });
      born = time;
      const first = time + tk.warn(1000);
      strokes = [];
      for (let i = 0; i < 4; i++) {
        const u = (i - 1.5) * GAP;
        const a = P(u, -LEN / 2), b = P(u, LEN / 2);
        strokes.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, at: first + i * 360, done: false, half: HALF, dmg: 12 });
      }
      const d0 = P(-GAP * 2.1, LEN * 0.45), d1 = P(GAP * 2.1, -LEN * 0.45);
      strokes.push({ x1: d0.x, y1: d0.y, x2: d1.x, y2: d1.y, at: first + 4 * 360 + 520, done: false, half: HALF + 4, dmg: 15 });
      tk.sfx('clock-tick');
    },
    update(time) {
      const p = tk.player;
      for (const s of strokes) {
        if (s.done || time < s.at) continue;
        s.done = true;
        tk.sfx('stab');
        if (live(tk) && segDist(p.x, p.y, s.x1, s.y1, s.x2, s.y2) < s.half + PLAYER_R * 0.6) {
          tk.hitPlayer(s.dmg, p.x, p.y);
          float(tk, p.x, p.y - 44, 'IN ARREARS', '#f4f0e4');
        }
      }
      strokes = strokes.filter((s) => !s.done || time < s.at + 1400);
    },
    drawGround(g, time) {
      strokes.forEach((s, i) => {
        if (!s.done) {
          // The chalk line he will strike, dotted, filling in as the stroke comes.
          const k = clampN(1 - (s.at - time) / Math.max(1, s.at - born), 0, 1);
          g.lineStyle(s.half * 2, CHALK, 0.05 + k * 0.12); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          g.lineStyle(2, CHALK, 0.25 + k * 0.5);
          const n = 18;
          for (let j = 0; j < n; j += 2) {
            g.lineBetween(s.x1 + (s.x2 - s.x1) * (j / n), s.y1 + (s.y2 - s.y1) * (j / n), s.x1 + (s.x2 - s.x1) * ((j + 1) / n), s.y1 + (s.y2 - s.y1) * ((j + 1) / n));
          }
          // The next stroke to fall is ringed.
          const nextIdx = strokes.findIndex((x) => !x.done);
          if (i === nextIdx && k > 0.6 && Math.floor(time / 100) % 2 === 0) {
            g.lineStyle(3, 0xff9a8a, 0.55); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          }
        } else {
          // A struck stroke: a fat chalk mark, smudged at the ends, fading.
          const k = clampN(1 - (time - s.at) / 1400, 0, 1);
          g.lineStyle(s.half * 1.6, CHALK, 0.85 * k); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
          g.fillStyle(CHALK, 0.5 * k); g.fillCircle(s.x1, s.y1, s.half); g.fillCircle(s.x2, s.y2, s.half * 0.7);
        }
      });
    },
    drawAir(g, time) {
      for (const s of strokes) {
        if (!s.done || time - s.at > 160) continue;
        const k = (time - s.at) / 160;
        // The stroke coming down: a great stick of chalk dragged the length of the line.
        const x = s.x1 + (s.x2 - s.x1) * k, y = s.y1 + (s.y2 - s.y1) * k;
        g.fillStyle(CHALK, 1); g.fillRoundedRect(x - 8, y - 36, 16, 36, 4);
        g.fillStyle(0xffffff, 0.6); g.fillCircle(x, y, 14 * (1 - k) + 6);
      }
    },
    onPhaseEnd() { strokes = []; },
  };
};

// ── II. The Inhale ───────────────────────────────────────────────────
// He breathes in, and the whole room comes with it: you are dragged toward his mouth, and the
// debris of the isle comes off the walls along straight lines into it — shingles, sail-rags,
// corks, bottles. Lean away and step out of each line before its debris comes through.

const inhale = (tk: BossToolkit): SignatureMove => {
  const SPEED = 430;
  const N = 9;
  const R = 13;
  type Kind = 0 | 1 | 2 | 3;
  interface Debris { sx: number; sy: number; x: number; y: number; at: number; born: number; gone: boolean; kind: Kind; spin: number }
  let debris: Debris[] = [];
  let endAt = 0;
  const edgePoint = (): { x: number; y: number } => {
    const side = Math.floor(Math.random() * 3);
    if (side === 0) return { x: 10, y: FT + 40 + Math.random() * (tk.H - FT - 80) };
    if (side === 1) return { x: tk.W - 10, y: FT + 40 + Math.random() * (tk.H - FT - 80) };
    return { x: 60 + Math.random() * (tk.W - 120), y: tk.H - 10 };
  };
  return {
    durationMs: 3900,
    windupMs: 900,
    hold: 'charge',
    tell: 'THE INHALE',
    cast(time) {
      const first = time + tk.warn(950);
      debris = [];
      for (let i = 0; i < N; i++) {
        const e = edgePoint();
        debris.push({ sx: e.x, sy: e.y, x: e.x, y: e.y, at: first + i * 260, born: time, gone: false, kind: (i % 4) as Kind, spin: Math.random() * 6 });
      }
      endAt = first + N * 260 + 1800;
      tk.pull(tk.bossX, tk.bossY, 118, endAt - time - 600);
      tk.sfx('gust');
    },
    update(time, dt) {
      if (time > endAt) { debris = []; return; }
      const p = tk.player;
      for (const d of debris) {
        if (d.gone || time < d.at) continue;
        const dx = tk.bossX - d.x, dy = tk.bossY - d.y;
        const len = Math.hypot(dx, dy);
        if (len < 34) { d.gone = true; continue; }
        d.x += (dx / len) * SPEED * dt;
        d.y += (dy / len) * SPEED * dt;
        d.spin += dt * 10;
        if (live(tk) && dist(p.x, p.y, d.x, d.y) < R + PLAYER_R) {
          d.gone = true;
          tk.hitPlayer(11, p.x, p.y);
          tk.boom(d.x, d.y, 26, GALE);
        }
      }
    },
    drawGround(g, time) {
      for (const d of debris) {
        if (d.gone) continue;
        if (time < d.at) {
          // The line it will travel, from the wall to his mouth.
          const k = clampN((time - d.born) / Math.max(1, d.at - d.born), 0, 1);
          g.lineStyle(R * 2 + 6, GALE, 0.04 + k * 0.1); g.lineBetween(d.sx, d.sy, tk.bossX, tk.bossY);
          g.lineStyle(1.5, 0xffffff, 0.2 + k * 0.5);
          const n = 24;
          for (let j = 0; j < n; j += 2) g.lineBetween(d.sx + (tk.bossX - d.sx) * (j / n), d.sy + (tk.bossY - d.sy) * (j / n), d.sx + (tk.bossX - d.sx) * ((j + 1) / n), d.sy + (tk.bossY - d.sy) * ((j + 1) / n));
          g.fillStyle(k > 0.8 && Math.floor(time / 90) % 2 === 0 ? 0xff9a8a : 0xffffff, 0.7); g.fillCircle(d.sx, d.sy, 7 + k * 5);
        }
      }
    },
    drawAir(g, time) {
      if (time > endAt) return;
      // The room drawn in: streaks off every wall toward him.
      for (let i = 0; i < 20; i++) {
        const k = ((time / 900) + i / 20) % 1;
        const a = (i / 20) * Math.PI * 2;
        const r = 520 * (1 - k);
        windStreak(g, tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r, a + Math.PI, 30, 0.5 * k);
      }
      for (const d of debris) {
        if (d.gone || time < d.at) continue;
        const c = Math.cos(d.spin), s = Math.sin(d.spin);
        if (d.kind === 0) {
          // A roof shingle.
          g.fillStyle(0x5a4a5a, 1);
          g.fillTriangle(d.x + c * 12 - s * 7, d.y + s * 12 + c * 7, d.x - c * 12 - s * 7, d.y - s * 12 + c * 7, d.x + s * 7, d.y - c * 7);
        } else if (d.kind === 1) {
          // A rag of sailcloth, flapping.
          g.fillStyle(SAILCLOTH, 1);
          g.fillTriangle(d.x - c * 12, d.y - s * 12, d.x + c * 12, d.y + s * 12, d.x - s * 10 + Math.sin(time / 40) * 3, d.y + c * 10);
        } else if (d.kind === 2) {
          g.fillStyle(CORK, 1); g.fillRoundedRect(d.x - 7, d.y - 5, 14, 10, 3);
          g.fillStyle(ROYAL, 1); g.fillCircle(d.x, d.y, 2.5);
        } else {
          breathBottle(g, d.x, d.y + 10, 0.6, d.spin, 1);
        }
        g.lineStyle(2, GALE, 0.4); g.lineBetween(d.x, d.y, d.x - (tk.bossX - d.x) * 0.08, d.y - (tk.bossY - d.y) * 0.08);
      }
    },
    onPhaseEnd() { debris = []; endAt = 0; },
  };
};

// ── II. The Draught ──────────────────────────────────────────────────
// Two spiral arms of air wheel slowly round him, the way water goes round a drain. Touch one and
// it bites and drags you along it, inward. They turn the way the arrows show — keep ahead of them.

const draught = (tk: BossToolkit): SignatureMove => {
  const SPIN = 0.36;
  const TWIST = 0.0062;
  const BAND = 17;
  const R0 = 70;
  const R1 = 640;
  let born = 0, liveAt = 0, endAt = 0;
  let base = 0;
  let dir = 1;
  let lastHit = 0;
  let active = false;
  const armAngle = (k: number, r: number, time: number): number =>
    base + k * Math.PI + dir * SPIN * Math.max(0, time - liveAt) / 1000 - dir * r * TWIST;
  return {
    durationMs: 3600,
    windupMs: 800,
    gesture: 'raise',
    tell: 'THE DRAUGHT',
    cast(time) {
      active = true;
      born = time;
      liveAt = time + tk.warn(1100);
      endAt = liveAt + 2700;
      dir = Math.random() < 0.5 ? 1 : -1;
      // Lay the arms down either side of you, not on you.
      base = tk.angleToPlayer() + Math.PI / 2 + dir * dist(tk.player.x, tk.player.y, tk.bossX, tk.bossY) * TWIST;
      tk.sfx('tornado');
    },
    update(time, dt) {
      if (!active) return;
      if (time > endAt) { active = false; return; }
      if (time < liveAt || !live(tk)) return;
      const p = tk.player;
      const r = dist(p.x, p.y, tk.bossX, tk.bossY);
      if (r < R0 || r > R1) return;
      const fa = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
      for (let k = 0; k < 2; k++) {
        const off = Math.abs(wrap(fa - armAngle(k, r, time))) * r;
        if (off < BAND + PLAYER_R * 0.6) {
          // Drawn along it, inward.
          carry(tk, -Math.cos(fa) * 70 * dt, -Math.sin(fa) * 70 * dt);
          if (time - lastHit > 650) { lastHit = time; tk.hitPlayer(9, p.x, p.y); float(tk, p.x, p.y - 40, 'DRAWN IN', '#d8ecff'); }
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const on = time >= liveAt;
      const k = on ? 1 : clampN((time - born) / Math.max(1, liveAt - born), 0, 1);
      for (let arm = 0; arm < 2; arm++) {
        g.lineStyle(BAND * 2, GALE, on ? 0.2 : 0.04 + k * 0.1);
        g.beginPath();
        for (let r = R0; r <= R1; r += 16) {
          const a = armAngle(arm, r, time);
          const x = tk.bossX + Math.cos(a) * r, y = tk.bossY + Math.sin(a) * r;
          if (r === R0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        // Arrows along the arm showing which way it is turning.
        for (let r = R0 + 80; r <= R1; r += 140) {
          const a = armAngle(arm, r, time);
          const x = tk.bossX + Math.cos(a) * r, y = tk.bossY + Math.sin(a) * r;
          const ta = a + dir * Math.PI / 2;
          g.fillStyle(0xffffff, on ? 0.55 : 0.2 + k * 0.3);
          g.fillTriangle(x + Math.cos(ta) * 14, y + Math.sin(ta) * 14, x - Math.sin(ta) * 7, y + Math.cos(ta) * 7, x + Math.sin(ta) * 7, y - Math.cos(ta) * 7);
        }
      }
      if (!on && k > 0.8 && Math.floor(time / 100) % 2 === 0) { g.lineStyle(3, 0xff9a8a, 0.5); g.strokeCircle(tk.bossX, tk.bossY, R0); }
    },
    drawAir(g, time) {
      if (!active || time < liveAt) return;
      // Motes of air pouring in along each arm.
      for (let arm = 0; arm < 2; arm++) {
        for (let i = 0; i < 18; i++) {
          const f = 1 - (((time / 1300) + i / 18) % 1);
          const r = R0 + (R1 - R0) * f;
          const a = armAngle(arm, r, time) + Math.sin(i * 3.1) * 0.03;
          g.fillStyle(0xffffff, 0.35 + (1 - f) * 0.5); g.fillEllipse(tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r, 7, 3);
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── II. The Gasp ─────────────────────────────────────────────────────
// A sharp breath in: two rings of air collapse on you from far out, each with one gap, the second
// gap turned a little from the first. Then the place they meet goes to nothing and bangs.

const gasp = (tk: BossToolkit): SignatureMove => {
  const START = 430;
  const SPEED = -300;
  let cx = 0, cy = 0;
  let rings: { at: number; gap: number }[] = [];
  let bangAt = 0;
  let banged = true;
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'recoil',
    tell: 'THE GASP',
    cast(time) {
      const p = tk.player;
      cx = tk.clampX(p.x, 120); cy = tk.clampY(p.y, 120);
      const gap = Math.random() * Math.PI * 2;
      const delay = tk.warn(900);
      rings = [{ at: time + delay, gap }, { at: time + delay + 520, gap: gap + (Math.random() < 0.5 ? 0.32 : -0.32) }];
      for (const r of rings) {
        tk.spawnRing({ cx, cy, delayMs: r.at - time, speed: SPEED, gapCentre: r.gap, gapHalf: 0.44, band: 18, damage: 12, startRadius: START });
      }
      bangAt = rings[1].at + (START / -SPEED) * 1000 + 120;
      banged = false;
      tk.sfx('sonic-pulse');
    },
    update(time) {
      if (banged || time < bangAt) return;
      banged = true;
      tk.explode(cx, cy, 70, 13, A_LIT);
      tk.sfx('explosion-small');
    },
    drawGround(g, time) {
      if (banged && time > bangAt + 300) return;
      // Chevrons round each ring, pointing in — the air rushing to fill the hole.
      for (const r of rings) {
        const rad = START + (SPEED * (time - r.at)) / 1000;
        if (rad <= 8 || rad > 700) continue;
        for (let i = 0; i < 16; i++) {
          const a = r.gap + Math.PI / 16 + (i / 16) * Math.PI * 2;
          if (Math.abs(wrap(a - r.gap)) < 0.44) continue;
          const x = cx + Math.cos(a) * (rad + 24), y = cy + Math.sin(a) * (rad + 24);
          g.lineStyle(2, 0xffffff, 0.45);
          g.lineBetween(x - Math.sin(a) * 8, y + Math.cos(a) * 8, x - Math.cos(a) * 10, y - Math.sin(a) * 10);
          g.lineBetween(x + Math.sin(a) * 8, y - Math.cos(a) * 8, x - Math.cos(a) * 10, y - Math.sin(a) * 10);
        }
        // The gap, marked with a little bright doorway.
        g.lineStyle(4, 0x9af0c8, 0.7);
        g.beginPath(); g.arc(cx, cy, rad + 26, r.gap - 0.4, r.gap + 0.4, false); g.strokePath();
      }
      if (!banged) {
        const k = clampN(1 - (bangAt - time) / 1800, 0, 1);
        g.fillStyle(VOID, 0.1 + k * 0.35); g.fillCircle(cx, cy, 70 * k);
        g.lineStyle(2, A_LIT, 0.3 + k * 0.4); g.strokeCircle(cx, cy, 70);
      }
    },
    onPhaseEnd() { rings = []; banged = true; },
  };
};

// ── III. The Sails Turn ──────────────────────────────────────────────
// Overhead, the palace's four great sails come round. Their shadows lie across the floor first;
// then the lattice arms sweep the room from the hub over the north wall. Each sail has one bay
// with no cloth in it — the wind goes through there, and so can you. Stand where the next sail's
// bare bay will pass.

const sailsTurn = (tk: BossToolkit): SignatureMove => {
  const HUB = { x: 480, y: 40 };
  const LEN = 780;
  const HALF = 30;
  const INNER = 150;
  const BAY = 105;
  const OMEGA = 0.62;
  interface Sail { bay: number }
  let sails: Sail[] = [];
  let a0 = 0;
  let born = 0, liveAt = 0, endAt = 0;
  let active = false;
  let prev = 0;
  const hitBy: boolean[] = [false, false, false, false];
  const angleAt = (time: number): number => a0 + OMEGA * Math.max(0, Math.min(time, endAt) - liveAt) / 1000;
  const bayRange = (s: Sail): [number, number] => [INNER + s.bay * BAY, INNER + (s.bay + 1) * BAY];
  return {
    durationMs: 4200,
    windupMs: 900,
    gesture: 'raise',
    tell: 'THE SAILS TURN',
    cast(time) {
      active = true;
      born = time;
      liveAt = time + tk.warn(1300);
      endAt = liveAt + 2600;
      // Start the arms so the first sail to reach you is a little way off.
      const pa = Math.atan2(tk.player.y - HUB.y, tk.player.x - HUB.x);
      a0 = pa - 0.55 - Math.random() * 0.5;
      prev = a0;
      sails = [0, 1, 2, 3].map(() => ({ bay: Math.floor(Math.random() * 5) }));
      hitBy.fill(false);
      tk.sfx('gear-turn');
    },
    update(time) {
      if (!active) return;
      if (time > endAt + 400) { active = false; return; }
      const cur = angleAt(time);
      if (time >= liveAt && live(tk)) {
        const p = tk.player;
        const r = dist(p.x, p.y, HUB.x, HUB.y);
        const fa = Math.atan2(p.y - HUB.y, p.x - HUB.x);
        sails.forEach((s, k) => {
          if (hitBy[k] || r < INNER - PLAYER_R || r > LEN + PLAYER_R) return;
          const [b0, b1] = bayRange(s);
          if (r > b0 + PLAYER_R * 0.6 && r < b1 - PLAYER_R * 0.6) return;
          const off = (k * Math.PI) / 2;
          const span = cur - prev;
          const rel = wrap(fa - (prev + off));
          const pad = Math.atan2(HALF + PLAYER_R * 0.6, Math.max(60, r));
          if (rel >= -pad && rel <= span + pad) {
            hitBy[k] = true;
            tk.hitPlayer(15, p.x, p.y);
            carry(tk, Math.cos(fa + Math.PI / 2) * 40, Math.sin(fa + Math.PI / 2) * 40);
            float(tk, p.x, p.y - 44, 'SWEPT', '#e8dcc0');
            tk.sfx('clang');
          }
        });
      }
      prev = cur;
    },
    drawGround(g, time) {
      if (!active) return;
      const a = angleAt(time);
      const k = clampN((time - born) / Math.max(1, liveAt - born), 0, 1);
      sails.forEach((s, i) => {
        const ang = a + (i * Math.PI) / 2;
        const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
        // The sail's shadow on the floor, darker on the clothed bays, clear on the bare one.
        const [b0, b1] = bayRange(s);
        for (let bay = 0; bay < 6; bay++) {
          const r0 = INNER + bay * BAY, r1 = Math.min(LEN, r0 + BAY);
          const bare = r0 >= b0 && r1 <= b1;
          const x0 = HUB.x + ca * r0, y0 = HUB.y + sa * r0, x1 = HUB.x + ca * r1, y1 = HUB.y + sa * r1;
          if (bare) {
            g.lineStyle(2, 0x9af0c8, 0.3 + k * 0.5);
            g.lineBetween(x0 + nx * HALF, y0 + ny * HALF, x1 + nx * HALF, y1 + ny * HALF);
            g.lineBetween(x0 - nx * HALF, y0 - ny * HALF, x1 - nx * HALF, y1 - ny * HALF);
            continue;
          }
          g.fillStyle(0x000000, 0.08 + k * 0.16);
          g.fillTriangle(x0 + nx * HALF, y0 + ny * HALF, x1 + nx * HALF, y1 + ny * HALF, x1 - nx * HALF, y1 - ny * HALF);
          g.fillTriangle(x0 + nx * HALF, y0 + ny * HALF, x1 - nx * HALF, y1 - ny * HALF, x0 - nx * HALF, y0 - ny * HALF);
        }
        // The rings the bare bay will run along — where to stand for this sail.
        if (time < liveAt) {
          g.lineStyle(1.5, 0x9af0c8, 0.12 + k * 0.15);
          g.beginPath(); g.arc(HUB.x, HUB.y, (b0 + b1) / 2, ang, ang + 0.9, false); g.strokePath();
        }
      });
      if (time < liveAt && k > 0.75 && Math.floor(time / 110) % 2 === 0) {
        g.lineStyle(3, 0xff9a8a, 0.4); g.beginPath(); g.arc(HUB.x, HUB.y, INNER, 0, Math.PI, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!active || time < liveAt - 200) return;
      const a = angleAt(time);
      const fade = time > endAt ? clampN(1 - (time - endAt) / 400, 0, 1) : clampN((time - liveAt + 200) / 300, 0, 1);
      sails.forEach((s, i) => {
        const ang = a + (i * Math.PI) / 2;
        sailArm(g, HUB.x, HUB.y, ang, LEN, HALF * 2, 0.85 * fade);
        // Strip the cloth off the bare bay: draw the lattice open there.
        const [b0, b1] = bayRange(s);
        const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
        g.fillStyle(SKY, 0.65 * fade);
        const p0 = { x: HUB.x + ca * b0 + nx * 3, y: HUB.y + sa * b0 + ny * 3 }, p1 = { x: HUB.x + ca * b1 + nx * 3, y: HUB.y + sa * b1 + ny * 3 };
        g.fillTriangle(p0.x, p0.y, p1.x, p1.y, p1.x + nx * HALF * 1.9, p1.y + ny * HALF * 1.9);
        g.fillTriangle(p0.x, p0.y, p1.x + nx * HALF * 1.9, p1.y + ny * HALF * 1.9, p0.x + nx * HALF * 1.8, p0.y + ny * HALF * 1.8);
        g.lineStyle(2, OAK_DARK, fade);
        g.lineBetween(p0.x, p0.y, p0.x + nx * HALF * 1.8, p0.y + ny * HALF * 1.8);
        g.lineBetween(p1.x, p1.y, p1.x + nx * HALF * 1.9, p1.y + ny * HALF * 1.9);
      });
      g.fillStyle(OAK_DARK, fade); g.fillCircle(HUB.x, HUB.y, 26);
      g.fillStyle(BRASS, fade); g.fillCircle(HUB.x, HUB.y, 14);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── III. Twisters ────────────────────────────────────────────────────
// Dust spins up at the edges of the room and stands up into tornadoes that walk at you. Each tugs
// at you as it nears; one that catches you swings you round and throws you out of it.

const twisters = (tk: BossToolkit): SignatureMove => {
  const SPEED = 82;
  const R = 34;
  const LIFE = 4600;
  interface Twister { x: number; y: number; born: number; liveAt: number; endAt: number; caughtUntil: number; seed: number }
  let tws: Twister[] = [];
  let thrownUntil = 0;
  let throwA = 0;
  return {
    durationMs: 4600,
    windupMs: 800,
    gesture: 'sweep',
    tell: 'TWISTERS',
    cast(time) {
      const n = tk.hard ? 4 : 3;
      tws = [];
      const spots = [
        { x: 70, y: FT + 70 }, { x: tk.W - 70, y: FT + 70 }, { x: 70, y: tk.H - 70 }, { x: tk.W - 70, y: tk.H - 70 }, { x: tk.W / 2, y: tk.H - 60 },
      ].sort(() => Math.random() - 0.5);
      for (let i = 0; i < n; i++) {
        const s = spots[i];
        const liveAt = time + tk.warn(900) + i * 250;
        tws.push({ x: s.x, y: s.y, born: time, liveAt, endAt: liveAt + LIFE, caughtUntil: 0, seed: Math.random() * 10 });
      }
      tk.sfx('tornado');
    },
    update(time, dt) {
      const p = tk.player;
      if (time < thrownUntil) carry(tk, Math.cos(throwA) * 420 * dt, Math.sin(throwA) * 420 * dt);
      for (const t of tws) {
        if (time < t.liveAt || time > t.endAt) continue;
        // Walk at the player, wandering.
        const a = Math.atan2(p.y - t.y, p.x - t.x) + Math.sin(time / 600 + t.seed) * 0.6;
        t.x = tk.clampX(t.x + Math.cos(a) * SPEED * dt, 40);
        t.y = tk.clampY(t.y + Math.sin(a) * SPEED * dt, 40);
        if (!live(tk)) continue;
        const d = dist(p.x, p.y, t.x, t.y);
        if (d < 170 && d > R && time >= t.caughtUntil) carry(tk, ((t.x - p.x) / d) * 38 * dt, ((t.y - p.y) / d) * 38 * dt);
        if (d < R + PLAYER_R * 0.5 && time >= t.caughtUntil && time >= thrownUntil) {
          t.caughtUntil = time + 1300;
          tk.hitPlayer(14, p.x, p.y);
          throwA = Math.atan2(p.y - t.y, p.x - t.x) + Math.PI / 2;
          thrownUntil = time + 280;
          float(tk, p.x, p.y - 44, 'SWEPT UP', '#d8ecff');
          tk.sfx('whoosh');
        }
      }
      tws = tws.filter((t) => time < t.endAt + 500);
    },
    drawGround(g, time) {
      for (const t of tws) {
        if (time < t.liveAt) {
          // Dust starting to spin where it will stand up.
          const k = clampN((time - t.born) / Math.max(1, t.liveAt - t.born), 0, 1);
          for (let i = 0; i < 8; i++) {
            const a = time / 120 + i * 0.8;
            const r = 40 * (1 - k * 0.5);
            g.fillStyle(0xc8b8a0, 0.3 + k * 0.4); g.fillEllipse(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r * 0.5, 8, 4);
          }
          g.lineStyle(2, 0xffffff, 0.2 + k * 0.5); g.strokeEllipse(t.x, t.y, R * 2.4, R * 1.1);
          continue;
        }
        const fade = time > t.endAt ? clampN(1 - (time - t.endAt) / 500, 0, 1) : 1;
        g.fillStyle(0x000000, 0.2 * fade); g.fillEllipse(t.x, t.y + 4, R * 2.6, R * 0.9);
        g.lineStyle(1.5, GALE, 0.25 * fade); g.strokeCircle(t.x, t.y, 170);
      }
    },
    drawAir(g, time) {
      for (const t of tws) {
        if (time < t.liveAt) continue;
        const fade = time > t.endAt ? clampN(1 - (time - t.endAt) / 500, 0, 1) : 1;
        // The funnel: stacked rings, wide at the top, swaying, debris round its waist.
        for (let k = 0; k < 9; k++) {
          const f = k / 8;
          const sway = Math.sin(time / 260 + t.seed + f * 3) * 10 * f;
          const w = (R * 0.5 + f * R * 1.8) * fade;
          const y = t.y - f * 120;
          g.lineStyle(3, k % 2 ? 0xd8e0ec : 0xb8c4d4, 0.75 * fade);
          g.strokeEllipse(t.x + sway, y, w * 2, w * 0.5);
        }
        for (let i = 0; i < 5; i++) {
          const a = time / 150 + i * 1.3 + t.seed;
          const f = 0.2 + (i % 3) * 0.2;
          g.fillStyle(i % 2 ? 0x8a7a6a : SAILCLOTH, fade); g.fillRect(t.x + Math.cos(a) * (R * 0.6 + f * R * 1.6), t.y - f * 120 + Math.sin(a) * 6, 5, 3);
        }
      }
    },
    onPhaseEnd() { tws = []; thrownUntil = 0; },
  };
};

// ── III. Crown of Gales ──────────────────────────────────────────────
// The hurricane on his brow throws off its blades: crescents of gale that circle him close for a
// beat, then spiral outward, turning slowly. Two waves, the second set a quarter-turn on. Read
// the gaps and walk with them.

const crownOfGales = (tk: BossToolkit): SignatureMove => {
  const N = tk.hard ? 9 : 8;
  const OMEGA = 0.55;
  const GROW = 150;
  const HOLD = 650;
  const R = 15;
  interface Blade { wave: number; a0: number; born: number; out: number; done: boolean; cx: number; cy: number }
  let blades: Blade[] = [];
  const pos = (b: Blade, time: number): { x: number; y: number; r: number; a: number } => {
    const t = Math.max(0, time - b.born) / 1000;
    const r = 60 + Math.max(0, time - b.out) / 1000 * GROW;
    const a = b.a0 + t * OMEGA;
    return { x: b.cx + Math.cos(a) * r, y: b.cy + Math.sin(a) * r, r, a };
  };
  return {
    durationMs: 3800,
    windupMs: 900,
    gesture: 'raise',
    tell: 'CROWN OF GALES',
    cast(time) {
      blades = [];
      const base = Math.random() * Math.PI * 2;
      for (let w = 0; w < 2; w++) {
        const born = time + w * 1100;
        for (let i = 0; i < N; i++) {
          blades.push({ wave: w, a0: base + (i / N) * Math.PI * 2 + w * (Math.PI / N) * 0.5, born, out: born + tk.warn(HOLD), done: false, cx: tk.bossX, cy: tk.bossY });
        }
      }
      tk.sfx('wings');
    },
    update(time) {
      const p = tk.player;
      for (const b of blades) {
        if (b.done || time < b.born) continue;
        const q = pos(b, time);
        if (q.r > 760) { b.done = true; continue; }
        if (time >= b.out && live(tk) && dist(p.x, p.y, q.x, q.y) < R + PLAYER_R) {
          b.done = true;
          tk.hitPlayer(11, p.x, p.y);
          float(tk, p.x, p.y - 40, 'GALED', '#d8ecff');
        }
      }
      blades = blades.filter((b) => !b.done);
    },
    drawGround(g, time) {
      // Each wave's spiral path, faint, while it is still held close.
      for (const b of blades) {
        if (time < b.born || time >= b.out) continue;
        const k = clampN((time - b.born) / Math.max(1, b.out - b.born), 0, 1);
        g.lineStyle(1.5, GALE, 0.1 + k * 0.25);
        g.beginPath();
        for (let s = 0; s <= 12; s++) {
          const tt = s * 0.25;
          const r = 60 + tt * GROW;
          const a = b.a0 + (b.out - b.born) / 1000 * OMEGA + tt * OMEGA;
          const x = b.cx + Math.cos(a) * r, y = b.cy + Math.sin(a) * r;
          if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const b of blades) {
        if (time < b.born) continue;
        const q = pos(b, time);
        const held = time < b.out;
        // A crescent of wind, its horns trailing.
        const ta = q.a + Math.PI / 2;
        g.lineStyle(held ? 3 : 5, held ? A_LIT : 0xffffff, held ? 0.6 : 0.95);
        g.beginPath(); g.arc(q.x, q.y, R, ta - 1.6, ta + 1.6, false); g.strokePath();
        g.lineStyle(2, GALE, 0.5);
        g.beginPath(); g.arc(q.x - Math.cos(ta) * 5, q.y - Math.sin(ta) * 5, R * 0.8, ta - 1.3, ta + 1.3, false); g.strokePath();
      }
    },
    onPhaseEnd() { blades = []; },
  };
};

// ── IV. The Exhale ───────────────────────────────────────────────────
// Everything he ever took, let out at once: a wall of wind crosses the whole room. There are a
// few calm eddies in it — circles of still air where leaves turn lazily — and nowhere else.

const theExhale = (tk: BossToolkit): SignatureMove => {
  const SPEED = 260;
  const EDDY_R = 54;
  const BAND = 26;
  let dirX = 1, dirY = 0;
  let pos0 = 0;
  let born = 0, goAt = 0;
  let active = false;
  let struck = false;
  let pushUntil = 0;
  let eddies: { x: number; y: number }[] = [];
  /** Where the front is, along its own axis, at `time`. */
  const front = (time: number): number => pos0 + Math.max(0, time - goAt) / 1000 * SPEED;
  const along = (x: number, y: number): number => (dirX !== 0 ? (dirX > 0 ? x : tk.W - x) : y - FT);
  return {
    durationMs: 4800,
    windupMs: 1000,
    hold: 'spray',
    tell: 'THE EXHALE',
    cast(time) {
      active = true;
      struck = false;
      const r = Math.random();
      if (r < 0.4) { dirX = 1; dirY = 0; } else if (r < 0.8) { dirX = -1; dirY = 0; } else { dirX = 0; dirY = 1; }
      pos0 = -40;
      born = time;
      goAt = time + tk.warn(1300);
      // A calm within reach of you, and a few more scattered.
      const p = tk.player;
      eddies = [];
      const a = Math.random() * Math.PI * 2;
      eddies.push({ x: tk.clampX(p.x + Math.cos(a) * 170, 80), y: tk.clampY(p.y + Math.sin(a) * 140, 80) });
      for (let i = 0; i < 3; i++) eddies.push({ x: 120 + Math.random() * (tk.W - 240), y: FT + 80 + Math.random() * (tk.H - FT - 160) });
      tk.sfx('gust');
    },
    update(time, dt) {
      if (!active) return;
      const total = dirX !== 0 ? tk.W : tk.H - FT;
      if (front(time) > total + 80) { active = false; return; }
      if (time < goAt) return;
      const p = tk.player;
      if (time < pushUntil) carry(tk, dirX * 380 * dt, dirY * 380 * dt);
      if (struck || !live(tk)) return;
      const f = front(time);
      const at = along(p.x, p.y);
      if (Math.abs(at - f) < BAND + PLAYER_R * 0.6) {
        if (eddies.some((e) => dist(p.x, p.y, e.x, e.y) < EDDY_R - 4)) return;
        struck = true;
        pushUntil = time + 260;
        tk.hitPlayer(15, p.x, p.y);
        float(tk, p.x, p.y - 44, 'EXHALED', '#e8f0ff');
        tk.sfx('tornado');
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clampN((time - born) / Math.max(1, goAt - born), 0, 1);
      // The calm eddies: leaves turning slowly in still air.
      for (const e of eddies) {
        g.fillStyle(0x9af0c8, 0.08 + k * 0.08); g.fillCircle(e.x, e.y, EDDY_R);
        g.lineStyle(2, 0x9af0c8, 0.4 + k * 0.3); g.strokeCircle(e.x, e.y, EDDY_R);
        for (let i = 0; i < 4; i++) {
          const a = time / 900 + i * 1.6;
          g.fillStyle(i % 2 ? 0xc8a868 : 0x8ab868, 0.8); g.fillEllipse(e.x + Math.cos(a) * EDDY_R * 0.55, e.y + Math.sin(a) * EDDY_R * 0.55, 7, 3.5);
        }
      }
      // The edge it is coming from, glowing.
      if (time < goAt) {
        g.fillStyle(GALE, 0.1 + k * 0.2);
        if (dirX > 0) g.fillRect(0, FT, 30 + k * 30, tk.H - FT);
        else if (dirX < 0) g.fillRect(tk.W - 30 - k * 30, FT, 30 + k * 30, tk.H - FT);
        else g.fillRect(0, FT, tk.W, 30 + k * 30);
      }
    },
    drawAir(g, time) {
      if (!active || time < goAt) return;
      const f = front(time);
      // The wall of wind: a band of streaks, with the room behind it scoured clean.
      for (let i = 0; i < 34; i++) {
        const off = ((i * 53) % 40) - 20;
        if (dirX !== 0) {
          const x = dirX > 0 ? f + off : tk.W - f - off;
          const y = FT + 10 + ((i * 97) % (tk.H - FT - 20));
          windStreak(g, x, y, dirX > 0 ? 0 : Math.PI, 50, 0.8);
        } else {
          const x = 10 + ((i * 97) % (tk.W - 20));
          windStreak(g, x, FT + f + off, Math.PI / 2, 50, 0.8);
        }
      }
      g.fillStyle(0xffffff, 0.12);
      if (dirX > 0) g.fillRect(f - BAND, FT, BAND * 2, tk.H - FT);
      else if (dirX < 0) g.fillRect(tk.W - f - BAND, FT, BAND * 2, tk.H - FT);
      else g.fillRect(0, FT + f - BAND, tk.W, BAND * 2);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── IV. The Bottles Shatter ──────────────────────────────────────────
// The stolen bottles stand round the room and crack one after another — the cracks spreading
// across the glass tell you which goes next — and each bursts into a six-pointed star of gust.

const bottlesShatter = (tk: BossToolkit): SignatureMove => {
  const SPOKE = 210;
  const HALF = 14;
  interface Btl { x: number; y: number; rot: number; at: number; born: number; done: boolean }
  let bottles: Btl[] = [];
  return {
    durationMs: 4000,
    windupMs: 900,
    gesture: 'slam',
    tell: 'THE BOTTLES SHATTER',
    cast(time) {
      const n = tk.hard ? 10 : 8;
      bottles = [];
      const first = time + tk.warn(1250);
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0;
        for (let tries = 0; tries < 12; tries++) {
          x = 90 + Math.random() * (tk.W - 180); y = FT + 70 + Math.random() * (tk.H - FT - 140);
          if (bottles.every((b) => dist(b.x, b.y, x, y) > 130) && dist(x, y, tk.player.x, tk.player.y) > 60) break;
        }
        bottles.push({ x, y, rot: Math.random() * Math.PI, at: first + i * 320, born: time, done: false });
      }
      tk.sfx('crystal-chime');
    },
    update(time) {
      const p = tk.player;
      for (const b of bottles) {
        if (b.done || time < b.at) continue;
        b.done = true;
        tk.sfx('crystal-shatter');
        if (live(tk)) {
          for (let s = 0; s < 6; s++) {
            const a = b.rot + (s / 6) * Math.PI * 2;
            if (segDist(p.x, p.y, b.x, b.y, b.x + Math.cos(a) * SPOKE, b.y + Math.sin(a) * SPOKE) < HALF + PLAYER_R * 0.6) {
              tk.hitPlayer(12, p.x, p.y);
              break;
            }
          }
        }
        if (Math.random() < 0.35) float(tk, b.x, b.y - 50, '...thank you...', '#e8fbff');
      }
      bottles = bottles.filter((b) => !b.done || time < b.at + 600);
    },
    drawGround(g, time) {
      for (const b of bottles) {
        if (b.done) continue;
        const k = clampN(1 - (b.at - time) / Math.max(1, b.at - b.born), 0, 1);
        for (let s = 0; s < 6; s++) {
          const a = b.rot + (s / 6) * Math.PI * 2;
          g.lineStyle(HALF * 2, GALE, 0.03 + k * k * 0.16);
          g.lineBetween(b.x, b.y, b.x + Math.cos(a) * SPOKE, b.y + Math.sin(a) * SPOKE);
          g.lineStyle(1.5, 0xffffff, 0.12 + k * k * 0.6);
          g.lineBetween(b.x, b.y, b.x + Math.cos(a) * SPOKE, b.y + Math.sin(a) * SPOKE);
        }
        if (k > 0.85 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xff9a8a, 0.6); g.strokeCircle(b.x, b.y, 26); }
      }
    },
    drawAir(g, time) {
      for (const b of bottles) {
        if (!b.done) {
          const k = clampN(1 - (b.at - time) / Math.max(1, b.at - b.born), 0, 1);
          const shake = k > 0.7 ? Math.sin(time / 25 + b.x) * 2 : 0;
          breathBottle(g, b.x + shake, b.y + 14, 1.15, time / 1000 + b.x, 1, k > 0.35);
          // The cracks spreading as it nears its turn.
          g.lineStyle(1.2, 0xffffff, 0.9);
          for (let c = 0; c < Math.floor(k * 6); c++) {
            const a = b.rot + c * 1.1;
            g.lineBetween(b.x + shake, b.y + 2, b.x + shake + Math.cos(a) * 11 * k, b.y + 2 + Math.sin(a) * 11 * k);
          }
          continue;
        }
        const k = (time - b.at) / 600;
        for (let s = 0; s < 6; s++) {
          const a = b.rot + (s / 6) * Math.PI * 2;
          windStreak(g, b.x + Math.cos(a) * SPOKE * Math.min(1, k * 2), b.y + Math.sin(a) * SPOKE * Math.min(1, k * 2), a, 30, 0.9 * (1 - k));
          g.fillStyle(GLASS, 0.8 * (1 - k)); g.fillTriangle(b.x + Math.cos(a + 0.3) * 30 * k, b.y + Math.sin(a + 0.3) * 30 * k, b.x + Math.cos(a) * 40 * k, b.y + Math.sin(a) * 40 * k, b.x + Math.cos(a - 0.2) * 26 * k, b.y + Math.sin(a - 0.2) * 26 * k);
        }
        g.fillStyle(BREATH, 0.5 * (1 - k)); g.fillCircle(b.x, b.y - k * 40, 14 + k * 24);
      }
    },
    onPhaseEnd() { bottles = []; },
  };
};

// ── IV. Last Gasp ────────────────────────────────────────────────────
// He is out of breath. The breaths loosed from the shattered bottles drift across the room back
// toward him along drawn lines, and every one that reaches his mouth heals him. Catch them first:
// each one you touch is freed (and gives you a little back).

const lastGasp = (tk: BossToolkit): SignatureMove => {
  const N = 10;
  const SPEED = 140;
  interface Wisp { sx: number; sy: number; x: number; y: number; at: number; gone: boolean; seed: number }
  let wisps: Wisp[] = [];
  let endAt = 0;
  return {
    durationMs: 3600,
    windupMs: 800,
    hold: 'draw',
    tell: 'LAST GASP',
    cast(time) {
      wisps = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.random() * 0.3;
        const x = tk.clampX(tk.bossX + Math.cos(a) * 900, 30), y = tk.clampY(tk.bossY + Math.sin(a) * 700, 30);
        wisps.push({ sx: x, sy: y, x, y, at: time + 400 + i * 150, gone: false, seed: Math.random() * 6 });
      }
      endAt = time + 400 + N * 150 + 6000;
      tk.sfx('screech');
    },
    update(time, dt) {
      if (time > endAt) { wisps = []; return; }
      const p = tk.player;
      for (const w of wisps) {
        if (w.gone || time < w.at) continue;
        const dx = tk.bossX - w.x, dy = tk.bossY - w.y;
        const d = Math.hypot(dx, dy);
        if (d < 32) {
          w.gone = true;
          tk.healBoss(6);
          tk.sfx('bubble');
          continue;
        }
        w.x += (dx / d) * SPEED * dt + Math.sin(time / 200 + w.seed) * 20 * dt;
        w.y += (dy / d) * SPEED * dt + Math.cos(time / 230 + w.seed) * 20 * dt;
        if (live(tk) && dist(p.x, p.y, w.x, w.y) < 30) {
          w.gone = true;
          p.heal(3);
          float(tk, w.x, w.y - 30, 'FREED +3', '#9af0c8');
          tk.sfx('sparkle');
        }
      }
      wisps = wisps.filter((w) => !w.gone);
    },
    drawGround(g) {
      for (const w of wisps) {
        g.lineStyle(1.5, BREATH, 0.25);
        const n = 20;
        for (let j = 0; j < n; j += 2) g.lineBetween(w.x + (tk.bossX - w.x) * (j / n), w.y + (tk.bossY - w.y) * (j / n), w.x + (tk.bossX - w.x) * ((j + 1) / n), w.y + (tk.bossY - w.y) * ((j + 1) / n));
      }
    },
    drawAir(g, time) {
      for (const w of wisps) {
        if (time < w.at) { g.fillStyle(BREATH, 0.3); g.fillCircle(w.x, w.y, 6); continue; }
        // A loose breath: a pale curl with a tail, a faint face in it.
        const a = Math.atan2(tk.bossY - w.y, tk.bossX - w.x);
        g.fillStyle(BREATH, 0.25); g.fillCircle(w.x, w.y, 18);
        g.fillStyle(BREATH, 0.8); g.fillCircle(w.x, w.y, 9);
        for (let k = 1; k <= 4; k++) { g.fillStyle(BREATH, 0.5 - k * 0.1); g.fillCircle(w.x - Math.cos(a) * k * 8 + Math.sin(time / 100 + k) * 3, w.y - Math.sin(a) * k * 8, 7 - k); }
        g.fillStyle(0x6a7a9a, 0.7); g.fillCircle(w.x - 3, w.y - 2, 1.4); g.fillCircle(w.x + 3, w.y - 2, 1.4);
        g.lineStyle(1, 0x6a7a9a, 0.7); g.beginPath(); g.arc(w.x, w.y + 2, 2.5, 0, Math.PI, false); g.strokePath();
      }
      if (wisps.length) {
        // His open mouth, gasping.
        g.fillStyle(VOID, 0.6); g.fillEllipse(tk.bossX, tk.bossY + 10, 26, 18 + Math.sin(time / 90) * 4);
      }
    },
    onPhaseEnd() { wisps = []; },
  };
};

// ── V (hard). Vacuum ─────────────────────────────────────────────────
// The air is gone. One pocket of it drifts across the room; inside it you breathe, outside it
// your meter drains, and empty you suffocate. Follow the pocket.

const vacuum = (tk: BossToolkit): SignatureMove => {
  const POCKET_R = 112;
  const DRAIN = 30;
  const REFILL = 70;
  const DRIFT = 68;
  const LIFE = 6200;
  let meter = 100;
  let active = false;
  let born = 0, endAt = 0;
  let px = 0, py = 0, vx = 0, vy = 0;
  let lastChoke = 0;
  return {
    durationMs: 4600,
    windupMs: 900,
    gesture: 'raise',
    tell: 'VACUUM',
    cast(time) {
      active = true;
      born = time;
      endAt = time + tk.warn(800) + LIFE;
      meter = 100;
      const p = tk.player;
      const a = Math.random() * Math.PI * 2;
      px = tk.clampX(p.x + Math.cos(a) * 180, 140); py = tk.clampY(p.y + Math.sin(a) * 130, 140);
      const away = Math.atan2(tk.H / 2 + FT / 2 - py, tk.W / 2 - px) + (Math.random() - 0.5) * 0.8;
      vx = Math.cos(away) * DRIFT; vy = Math.sin(away) * DRIFT;
      tk.sfx('hush');
    },
    update(time, dt) {
      if (!active) return;
      if (time > endAt) { active = false; return; }
      px += vx * dt; py += vy * dt;
      if (px < 140 || px > tk.W - 140) { vx = -vx; px = clampN(px, 140, tk.W - 140); }
      if (py < FT + 120 || py > tk.H - 120) { vy = -vy; py = clampN(py, FT + 120, tk.H - 120); }
      if (time < born + tk.warn(800) || !live(tk)) return;
      const p = tk.player;
      const inside = dist(p.x, p.y, px, py) < POCKET_R;
      meter = inside ? Math.min(100, meter + REFILL * dt) : Math.max(0, meter - DRAIN * dt);
      if (meter <= 0 && time - lastChoke > 500) {
        lastChoke = time;
        tk.hitPlayer(6, p.x, p.y);
        float(tk, p.x, p.y - 40, 'NO AIR', '#ff9a8a');
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clampN((time - born) / 800, 0, 1);
      // Everything outside the pocket goes dark: a ring of vacuum whose inner edge is the pocket.
      const ring = 1500;
      g.lineStyle(ring, VOID, 0.42 * k);
      g.strokeCircle(px, py, POCKET_R + ring / 2);
      g.fillStyle(0xd8f4ff, 0.08); g.fillCircle(px, py, POCKET_R);
      g.lineStyle(3, 0xd8f4ff, 0.5 + Math.sin(time / 140) * 0.25); g.strokeCircle(px, py, POCKET_R);
      // Where it is drifting.
      const a = Math.atan2(vy, vx);
      g.fillStyle(0xd8f4ff, 0.6);
      const ax = px + Math.cos(a) * (POCKET_R + 18), ay = py + Math.sin(a) * (POCKET_R + 18);
      g.fillTriangle(ax + Math.cos(a) * 14, ay + Math.sin(a) * 14, ax - Math.sin(a) * 9, ay + Math.cos(a) * 9, ax + Math.sin(a) * 9, ay - Math.cos(a) * 9);
    },
    drawAir(g, time) {
      if (!active) return;
      // Air inside the pocket, turning over itself.
      for (let i = 0; i < 8; i++) {
        const a = time / 700 + i * 0.8;
        const r = POCKET_R * (0.3 + ((i * 37) % 10) / 16);
        g.fillStyle(BREATH, 0.5); g.fillEllipse(px + Math.cos(a) * r, py + Math.sin(a) * r, 9, 4);
      }
      if (live(tk)) drawPlayerMeter(g, tk, meter / 100, time);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── V (hard). Implosion ──────────────────────────────────────────────
// Where the vacuum is thinnest it gives way. Four points round you, one after another: the air
// streams into each, it drags at you in its last half-second, and then it caves in.

const implosion = (tk: BossToolkit): SignatureMove => {
  const RAD = 82;
  interface Pt2 { x: number; y: number; born: number; at: number; done: boolean }
  let pts: Pt2[] = [];
  return {
    durationMs: 3400,
    windupMs: 800,
    gesture: 'clap',
    tell: 'IMPLOSION',
    cast(time) {
      const p = tk.player;
      pts = [];
      const a0 = Math.random() * Math.PI * 2;
      const first = time + tk.warn(1100);
      pts.push({ x: tk.clampX(p.x, 80), y: tk.clampY(p.y, 80), born: time, at: first, done: false });
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i / 3) * Math.PI * 2;
        pts.push({ x: tk.clampX(p.x + Math.cos(a) * 175, 80), y: tk.clampY(p.y + Math.sin(a) * 175, 80), born: time, at: first + (i + 1) * 430, done: false });
      }
      tk.sfx('gravity-slam');
    },
    update(time, dt) {
      const p = tk.player;
      for (const q of pts) {
        if (q.done) continue;
        if (time >= q.at) {
          q.done = true;
          tk.sfx('explosion-medium');
          tk.boom(q.x, q.y, RAD, A_DARK);
          if (live(tk) && dist(p.x, p.y, q.x, q.y) < RAD) { tk.hitPlayer(15, p.x, p.y); float(tk, p.x, p.y - 40, 'CRUSHED', '#c8c8ff'); }
          continue;
        }
        if (q.at - time < 520 && live(tk)) {
          const d = dist(p.x, p.y, q.x, q.y);
          if (d < 210 && d > 6) carry(tk, ((q.x - p.x) / d) * 70 * dt, ((q.y - p.y) / d) * 70 * dt);
        }
      }
      pts = pts.filter((q) => !q.done || time < q.at + 500);
    },
    drawGround(g, time) {
      for (const q of pts) {
        if (q.done) {
          const k = (time - q.at) / 500;
          g.lineStyle(3, A_LIT, 0.6 * (1 - k)); g.strokeCircle(q.x, q.y, RAD * (1 - k * 0.6));
          continue;
        }
        const k = clampN((time - q.born) / Math.max(1, q.at - q.born), 0, 1);
        g.fillStyle(VOID, 0.08 + k * 0.3); g.fillCircle(q.x, q.y, RAD);
        g.lineStyle(2, A_LIT, 0.3 + k * 0.5); g.strokeCircle(q.x, q.y, RAD);
        // Air pouring in from all round, faster as it nears.
        for (let i = 0; i < 12; i++) {
          const f = 1 - (((time / (700 - k * 400)) + i / 12) % 1);
          const a = (i / 12) * Math.PI * 2 + q.x;
          windStreak(g, q.x + Math.cos(a) * RAD * 1.6 * f, q.y + Math.sin(a) * RAD * 1.6 * f, a + Math.PI, 14, 0.6 * (1 - f));
        }
        g.fillStyle(VOID, 0.8); g.fillCircle(q.x, q.y, 6 + (1 - k) * 18);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.6); g.strokeCircle(q.x, q.y, RAD + 3); }
      }
    },
    onPhaseEnd() { pts = []; },
  };
};

// ── V (hard). The Bell Jar ───────────────────────────────────────────
// A great bell jar comes down over where you stand — its shadow grows first. Be clear of it when
// it lands. Under its rim you are crushed; inside it the air is pumped out, until you find the
// flaw in the glass and lean on it (or it lifts by itself).

const bellJar = (tk: BossToolkit): SignatureMove => {
  const RAD = 150;
  const RIM = 22;
  const TRAP_MS = 2700;
  const FLAW_MS = 800;
  let active = false;
  let cx = 0, cy = 0, born = 0, landAt = 0, liftAt = 0;
  let landed = false, trapped = false;
  let flawA = 0, flawHeld = 0;
  let lastSuck = 0;
  return {
    durationMs: 4200,
    windupMs: 900,
    gesture: 'slam',
    tell: 'THE BELL JAR',
    cast(time) {
      const p = tk.player;
      active = true;
      cx = tk.clampX(p.x, 170); cy = tk.clampY(p.y, 160);
      born = time;
      landAt = time + tk.warn(1400);
      liftAt = landAt + TRAP_MS;
      landed = false; trapped = false; flawHeld = 0;
      flawA = Math.random() * Math.PI * 2;
      tk.sfx('crystal-chime');
    },
    update(time, dt) {
      if (!active) return;
      if (time > liftAt + 500) { active = false; return; }
      const p = tk.player;
      if (!landed && time >= landAt) {
        landed = true;
        tk.sfx('anvil');
        tk.scene.cameras.main.shake(180, 0.005);
        if (live(tk)) {
          const d = dist(p.x, p.y, cx, cy);
          if (Math.abs(d - RAD) < RIM + PLAYER_R * 0.6) {
            tk.hitPlayer(16, p.x, p.y);
            const a = Math.atan2(p.y - cy, p.x - cx);
            carry(tk, Math.cos(a) * 60, Math.sin(a) * 60);
            float(tk, p.x, p.y - 44, 'UNDER THE RIM', '#c8e8f8');
          } else if (d < RAD) {
            trapped = true;
            lastSuck = time + 500;
            float(tk, p.x, p.y - 44, 'UNDER GLASS', '#c8e8f8');
          }
        }
      }
      if (!landed || time >= liftAt || !live(tk)) return;
      const d = dist(p.x, p.y, cx, cy);
      const a = Math.atan2(p.y - cy, p.x - cx);
      if (trapped) {
        // The glass holds you in; the air is pumped out.
        if (d > RAD - PLAYER_R) carry(tk, -Math.cos(a) * (d - RAD + PLAYER_R), -Math.sin(a) * (d - RAD + PLAYER_R));
        if (time - lastSuck > 500) { lastSuck = time; tk.hitPlayer(5, p.x, p.y); }
        const fx = cx + Math.cos(flawA) * (RAD - 30), fy = cy + Math.sin(flawA) * (RAD - 30);
        if (dist(p.x, p.y, fx, fy) < 34) {
          flawHeld += dt * 1000;
          if (flawHeld >= FLAW_MS) {
            liftAt = time;
            tk.sfx('crystal-shatter');
            float(tk, fx, fy - 30, 'SHATTERED', '#ffffff');
          }
        } else flawHeld = Math.max(0, flawHeld - dt * 1500);
      } else if (d < RAD + PLAYER_R) {
        // From outside it is just a wall of glass.
        carry(tk, Math.cos(a) * (RAD + PLAYER_R - d), Math.sin(a) * (RAD + PLAYER_R - d));
      }
    },
    drawGround(g, time) {
      if (!active) return;
      if (!landed) {
        const k = clampN((time - born) / Math.max(1, landAt - born), 0, 1);
        g.fillStyle(0x000000, 0.08 + k * 0.28); g.fillCircle(cx, cy, RAD * (1.3 - k * 0.3));
        g.lineStyle(RIM * 2, 0xffffff, 0.04 + k * 0.12); g.strokeCircle(cx, cy, RAD);
        g.lineStyle(2, GLASS, 0.3 + k * 0.6); g.strokeCircle(cx, cy, RAD);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a8a, 0.7); g.strokeCircle(cx, cy, RAD + RIM); }
      } else if (trapped && time < liftAt) {
        const fx = cx + Math.cos(flawA) * (RAD - 30), fy = cy + Math.sin(flawA) * (RAD - 30);
        g.fillStyle(0xffffff, 0.12 + (flawHeld / FLAW_MS) * 0.3); g.fillCircle(fx, fy, 34);
        g.lineStyle(2, 0xffffff, 0.6); g.beginPath(); g.arc(fx, fy, 38, -Math.PI / 2, -Math.PI / 2 + (flawHeld / FLAW_MS) * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const drop = landed ? 0 : 1 - clampN((time - born) / Math.max(1, landAt - born), 0, 1);
      const lift = time >= liftAt ? clampN((time - liftAt) / 500, 0, 1) : 0;
      const y = cy - drop * 220 - lift * 260;
      const a = 1 - lift;
      if (drop > 0.95) return;
      // The jar: a tall dome of glass with a knob, a rim of brass at the foot.
      g.fillStyle(GLASS, 0.14 * a); g.fillEllipse(cx, y - RAD * 0.5, RAD * 2, RAD * 2.2);
      g.lineStyle(3, GLASS, 0.7 * a); g.strokeEllipse(cx, y - RAD * 0.5, RAD * 2, RAD * 2.2);
      g.fillStyle(0xffffff, 0.35 * a); g.fillEllipse(cx - RAD * 0.5, y - RAD * 0.9, 14, 60);
      g.lineStyle(6, BRASS, a); g.strokeEllipse(cx, y + RAD * 0.55 - 4, RAD * 2, RAD * 0.4);
      g.fillStyle(BRASS_DARK, a); g.fillCircle(cx, y - RAD * 1.6, 9);
      if (landed && trapped && time < liftAt) {
        // The flaw: a white star of cracks in the glass.
        const fx = cx + Math.cos(flawA) * (RAD - 30), fy = cy + Math.sin(flawA) * (RAD - 30) - 20;
        g.lineStyle(1.5, 0xffffff, 0.9);
        for (let i = 0; i < 6; i++) { const ca = i * 1.05; g.lineBetween(fx, fy, fx + Math.cos(ca) * 12, fy + Math.sin(ca) * 12); }
        // The air being pumped out through the knob.
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 500) + i / 5) % 1;
          g.fillStyle(BREATH, 0.6 * (1 - ph)); g.fillCircle(cx + Math.sin(i * 2) * 20 * (1 - ph), y - RAD * 0.2 - ph * RAD * 1.3, 4);
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Body decor ───────────────────────────────────────────────────────

/**
 * The Breath-Taxer: a crown of four little windmill sails turning on a brass circlet; a brass
 * breath-meter on his own chest, always full; a violet mantle pleated like sailcloth, and a
 * bandolier of corked bottles across him. In the Inhale his mouth gapes and the air streams into
 * it; in the Hurricane Crown the circlet becomes a ring of storm; Breathless, he is deflated, his
 * bottles broken at the neck, his meter falling; in the Vacuum he is a hollow outline of a king.
 */
function drawAerion(g: Gfx, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  const ph = s.phaseIdx;
  const sec = t / 1000;

  // ── The mantle, spread behind and below him like a fan of sail.
  if (ph <= 3) {
    const pleats = 11;
    for (let i = 0; i < pleats; i++) {
      const a = Math.PI * (0.06 + (0.88 * i) / (pleats - 1));
      const billow = ph === 2 ? Math.sin(sec * 4 + i) * 0.18 : ph === 3 ? -0.15 : 0;
      const len = r * (1.15 + billow + (i % 2) * 0.12);
      const x = s.x + Math.cos(a) * len, y = s.y + Math.sin(a) * len * 0.9 + r * 0.2;
      const col = i % 2 ? ROYAL : ROYAL_DEEP;
      g.fillStyle(col, ph === 3 ? 0.75 : 1);
      g.fillTriangle(s.x + Math.cos(a - 0.14) * r * 0.6, s.y + Math.sin(a - 0.14) * r * 0.6, s.x + Math.cos(a + 0.14) * r * 0.6, s.y + Math.sin(a + 0.14) * r * 0.6, x, y);
      if (ph === 3 && i % 3 === 0) { g.fillStyle(ROYAL_DEEP, 1); g.fillTriangle(x - 4, y, x + 4, y, x, y + 8); }
    }
    g.lineStyle(2, BRASS, 0.8);
    g.beginPath(); g.arc(s.x, s.y + r * 0.2, r * 1.15, Math.PI * 0.08, Math.PI * 0.92, false); g.strokePath();
  } else {
    // Vacuum: the mantle is only an outline where it used to be.
    g.lineStyle(1.5, A_LIT, 0.35);
    g.beginPath(); g.arc(s.x, s.y + r * 0.2, r * 1.15, Math.PI * 0.08, Math.PI * 0.92, false); g.strokePath();
  }

  // ── The bandolier of bottles across him.
  if (ph <= 3) {
    g.lineStyle(4, 0x3a2a1a, 1); g.lineBetween(s.x - r * 0.8, s.y - r * 0.35, s.x + r * 0.7, s.y + r * 0.7);
    for (let i = 0; i < 4; i++) {
      const f = 0.15 + i * 0.22;
      const bx = s.x - r * 0.8 + r * 1.5 * f, by = s.y - r * 0.35 + r * 1.05 * f;
      if (ph === 3) {
        // Broken at the neck, the breath gone out of them.
        g.fillStyle(GLASS, 0.5); g.fillCircle(bx, by + 5, 5);
        g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(bx - 3, by, bx + 2, by - 3);
      } else {
        breathBottle(g, bx, by + 10, 0.42, sec + i, 1);
      }
    }
  }

  // ── His own breath-meter, on his chest.
  const meterFill = ph <= 2 ? 1 : ph === 3 ? 0.25 + Math.sin(sec * 3) * 0.1 : 0;
  breathMeter(g, s.x + r * 0.32, s.y + r * 0.1, r * 0.22, meterFill, ph === 4 ? 0.5 : 1);

  // ── The face: puffed cheeks in the Tax, a gaping drain of a mouth in the Inhale.
  if (ph === 0) {
    g.fillStyle(lit(s.palette.main, 0.35), 0.7);
    g.fillCircle(s.x - r * 0.42, s.y + r * 0.08, r * 0.2 + s.castGlow * 3); g.fillCircle(s.x + r * 0.42, s.y + r * 0.08, r * 0.2 + s.castGlow * 3);
    g.fillStyle(0xff9ab8, 0.3); g.fillCircle(s.x - r * 0.42, s.y + r * 0.12, r * 0.1); g.fillCircle(s.x + r * 0.42, s.y + r * 0.12, r * 0.1);
  } else if (ph === 1) {
    for (let i = 0; i < 8; i++) {
      const k = ((sec * 1.4) + i / 8) % 1;
      const a = (i / 8) * Math.PI * 2;
      const rr = r * (2.2 - k * 1.8);
      windStreak(g, s.x + Math.cos(a) * rr, s.y + r * 0.3 + Math.sin(a) * rr, a + Math.PI, 12, 0.6 * k);
    }
  } else if (ph === 3) {
    // Deflated: wrinkles across the body, a little sweat of breath off him.
    g.lineStyle(1.5, dim(s.palette.main, 0.4), 0.7);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(s.x, s.y + r * 0.5 + i * 4, r * (0.5 - i * 0.08), Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath(); }
  }

  // ── What he holds.
  const h = s.hands[0];
  if (h && ph === 0) {
    // A hand-bellows, the toll-collector's tool.
    bellows(g, h.x, h.y, r * 0.9, s.facing, 0.3 + s.castGlow * 0.7, 1);
  } else if (h && ph === 1) {
    // Both hands cupped to his mouth, drawing air.
    const h2 = s.hands[1];
    for (const hh of [h, h2]) { if (!hh) continue; g.lineStyle(2, GALE, 0.5); g.lineBetween(hh.x, hh.y, s.x, s.y + r * 0.3); }
  } else if (h && ph === 2) {
    // A weathervane for a sceptre.
    weathervane(g, h.x, h.y, sec * 1.4, r * 0.9, 1, 0x3a4250);
  } else if (h && ph === 3) {
    // A bottle neck, snapped, still corked.
    g.fillStyle(GLASS, 0.6); g.fillRect(h.x - 3, h.y - 12, 6, 12);
    g.fillStyle(CORK, 1); g.fillRect(h.x - 4, h.y - 16, 8, 5);
  }

  // ── The crown.
  const top = s.y - r - 4;
  if (ph <= 1) {
    // A brass circlet with four little windmills on it, turning.
    g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(s.x - r * 0.62, top + 4, s.x + r * 0.62, top + 4);
    g.lineStyle(2, BRASS, 1); g.lineBetween(s.x - r * 0.6, top + 3, s.x + r * 0.6, top + 3);
    for (let i = 0; i < 4; i++) {
      const mx = s.x - r * 0.48 + i * r * 0.32, my = top - 10 - (i === 1 || i === 2 ? 5 : 0);
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(mx, top + 3, mx, my);
      const spin = sec * (3 + i * 0.4) * (i % 2 ? -1 : 1);
      for (let k = 0; k < 4; k++) {
        const a = spin + (k / 4) * Math.PI * 2;
        g.lineStyle(1.5, BRASS, 1); g.lineBetween(mx, my, mx + Math.cos(a) * 8, my + Math.sin(a) * 8);
        g.fillStyle(SAILCLOTH, 1); g.fillTriangle(mx + Math.cos(a) * 3, my + Math.sin(a) * 3, mx + Math.cos(a) * 8, my + Math.sin(a) * 8, mx + Math.cos(a + 0.5) * 7, my + Math.sin(a + 0.5) * 7);
      }
      g.fillStyle(OVERDUE, 1); g.fillCircle(mx, my, 2);
    }
  } else if (ph === 2) {
    // The Hurricane Crown: a ring of storm cloud turning about his head, lightning in it.
    for (let i = 0; i < 12; i++) {
      const a = sec * 2.2 + (i / 12) * Math.PI * 2;
      const x = s.x + Math.cos(a) * r * 0.9, y = top - 6 + Math.sin(a) * r * 0.28;
      g.fillStyle(i % 2 ? 0x8a94a8 : 0xb8c4d4, 0.95); g.fillCircle(x, y, 7 + (i % 3) * 2);
    }
    if (Math.floor(t / 180) % 5 === 0) {
      const a = sec * 2.2;
      g.lineStyle(2, 0xffffff, 0.9);
      g.lineBetween(s.x + Math.cos(a) * r * 0.9, top - 6, s.x + Math.cos(a) * r * 0.7, top + 8);
      g.lineBetween(s.x + Math.cos(a) * r * 0.7, top + 8, s.x + Math.cos(a) * r * 0.8, top + 18);
    }
  } else if (ph === 3) {
    // The circlet, its windmills stopped and broken.
    g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(s.x - r * 0.6, top + 6, s.x + r * 0.55, top + 2);
    for (let i = 0; i < 4; i++) {
      const mx = s.x - r * 0.48 + i * r * 0.32, my = top - 4;
      g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(mx, top + 4, mx + (i - 1.5) * 3, my);
      if (i % 2 === 0) { g.fillStyle(SAILCLOTH, 0.7); g.fillTriangle(mx, my, mx + 6, my + 6, mx + 2, my + 9); }
    }
  } else {
    // Vacuum: a halo of nothing — a dark ring the light bends round.
    g.lineStyle(4, VOID, 0.9); g.strokeEllipse(s.x, top - 6, r * 1.4, r * 0.4);
    g.lineStyle(1.5, A_LIT, 0.5); g.strokeEllipse(s.x, top - 6, r * 1.5, r * 0.46);
  }

  // Breath leaking off him by phase.
  for (let i = 0; i < 5; i++) {
    const p = ((sec / 2) + i / 5) % 1;
    const x = s.x + Math.sin(sec * 1.3 + i * 2) * r * 1.1;
    const y = ph === 1 ? s.y - r * 1.4 + p * r * 1.6 : s.y - r * 0.5 - p * r * 1.8;
    g.fillStyle(ph === 4 ? A_LIT : BREATH, 0.6 * (1 - p)); g.fillCircle(x, y, 3 + p * 3);
  }
  if (s.hurt) { g.fillStyle(BREATH, 0.6); g.fillCircle(s.x - r * 0.3, s.y - r * 0.2, 5); }
}

// ── Arena ────────────────────────────────────────────────────────────

/**
 * The hub of the palace's sails: a round room under the windshaft, its floorboards laid radiating
 * from the throne like the dress of a millstone, the great brake-wheel's oak rim set into the floor
 * around the bellows-throne. Along the top wall, the sky through the sail-hatch with the four
 * great sails at rest across it; down both sides, the King's cellar — tiers of corked bottles;
 * along the foot, the oldest debtors asleep on their pallets with the glass tubes running up.
 */
function drawSailHub(g: Gfx, W: number, H: number): void {
  const rng = mulberry(0xa3e10f);
  g.fillStyle(0x2a1e12, 1); g.fillRect(0, 0, W, H);
  // Radiating boards.
  for (let k = 0; k < 64; k++) {
    const a0 = (k / 64) * Math.PI * 2, a1 = ((k + 1) / 64) * Math.PI * 2;
    const c = rng() < 0.5 ? 0x8a6a46 : 0x7a5c3c;
    g.fillStyle(c, 1);
    g.fillTriangle(THRONE.x, THRONE.y, THRONE.x + Math.cos(a0) * 900, THRONE.y + Math.sin(a0) * 900, THRONE.x + Math.cos(a1) * 900, THRONE.y + Math.sin(a1) * 900);
    g.lineStyle(1.5, 0x3a2a1a, 0.7);
    g.lineBetween(THRONE.x, THRONE.y, THRONE.x + Math.cos(a0) * 900, THRONE.y + Math.sin(a0) * 900);
  }
  // Pegged rings — where the boards are fixed down.
  for (const rr of [140, 260, 390, 520]) {
    for (let k = 0; k < rr / 7; k++) {
      const a = (k / (rr / 7)) * Math.PI * 2;
      g.fillStyle(0x3a2a1a, 0.8); g.fillCircle(THRONE.x + Math.cos(a) * rr, THRONE.y + Math.sin(a) * rr, 1.8);
    }
  }
  // The brake-wheel's rim, oak with iron cogs, round the throne.
  g.lineStyle(26, dim(OAK_DARK, 0.25), 1); g.strokeCircle(THRONE.x, THRONE.y, 180);
  g.lineStyle(18, OAK_DARK, 1); g.strokeCircle(THRONE.x, THRONE.y, 180);
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    g.fillStyle(0x2a2e36, 1);
    g.fillCircle(THRONE.x + Math.cos(a) * 196, THRONE.y + Math.sin(a) * 196, 5);
  }
  // The violet runner from the throne to the foot of the room.
  g.fillStyle(ROYAL_DEEP, 1); g.fillRect(W / 2 - 46, THRONE.y + 60, 92, H - THRONE.y - 60);
  g.fillStyle(ROYAL, 1); g.fillRect(W / 2 - 40, THRONE.y + 60, 80, H - THRONE.y - 60);
  for (let y = THRONE.y + 100; y < H; y += 56) aerionSigil(g, W / 2, y, 11, BRASS, 0.55);
  // The great sigil inlaid where the runner crosses the room's middle.
  const cx = W / 2, cy = 440;
  g.fillStyle(0x1a1430, 0.55); g.fillCircle(cx, cy, 86);
  g.lineStyle(3, BRASS, 0.7); g.strokeCircle(cx, cy, 80);
  aerionSigil(g, cx, cy, 58, BRASS, 0.9);
  // The bellows-throne round the anchor post.
  g.fillStyle(0x000000, 0.4); g.fillEllipse(THRONE.x, THRONE.y + 46, 260, 44);
  bellows(g, THRONE.x - 64, THRONE.y + 14, 140, 0.15, 0.85);
  bellows(g, THRONE.x + 64, THRONE.y + 14, 140, Math.PI - 0.15, 0.85);
  g.fillStyle(OAK_DARK, 1); g.fillRect(THRONE.x - 56, THRONE.y - 46, 112, 18);
  g.fillStyle(ROYAL, 1); g.fillRoundedRect(THRONE.x - 50, THRONE.y - 76, 100, 34, 10);
  aerionSigil(g, THRONE.x, THRONE.y - 92, 18, BRASS, 1);
  // The sail-hatch along the top wall: sky, cloud, and the sails at rest across it.
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, FT, W, 46);
  g.fillStyle(SKY, 1); g.fillRect(8, FT + 4, W - 16, 36);
  g.fillStyle(SKY_DEEP, 0.25); g.fillRect(8, FT + 4, W - 16, 12);
  for (let i = 0; i < 8; i++) cloudPuff(g, 30 + rng() * (W - 60), FT + 28 + rng() * 8, 0.35 + rng() * 0.2, 0.9, CLOUD);
  for (const a of [Math.PI * 0.15, Math.PI * 0.65]) sailArm(g, W / 2, FT - 200, a + Math.PI * 0.25, 330, 40, 0.75);
  for (let x = 8; x < W; x += 96) { g.fillStyle(OAK_DARK, 1); g.fillRect(x - 3, FT + 4, 6, 36); }
  // The cellar walls: tiers of bottles down both sides.
  for (const x0 of [0, W - 40]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, FT + 46, 40, H - FT - 46);
    for (let y = FT + 90; y < H - 60; y += 48) {
      g.fillStyle(OAK, 1); g.fillRect(x0, y, 40, 4);
      for (let k = 0; k < 2; k++) breathBottle(g, x0 + 11 + k * 18, y, 0.42, y * 0.03 + k, 1);
    }
  }
  // The oldest debtors along the foot of the room.
  for (let i = 0; i < 6; i++) sleeper(g, 110 + i * 150 + (i >= 3 ? 40 : -40), H - 18, 0.7, i * 1.3, BECALMED_SKINS[i % BECALMED_SKINS.length], false);
  // The sails' shadows lying across the floor from the hatch.
  g.fillStyle(0x000000, 0.07);
  for (const a of [Math.PI * 0.32, Math.PI * 0.68]) {
    g.fillTriangle(W / 2, FT, W / 2 + Math.cos(a) * 900 - Math.sin(a) * 60, FT + Math.sin(a) * 900 + Math.cos(a) * 60, W / 2 + Math.cos(a) * 900 + Math.sin(a) * 60, FT + Math.sin(a) * 900 - Math.cos(a) * 60);
  }
}

// ── The def ──────────────────────────────────────────────────────────

export const AERION_BOSS: WorldBossDef = {
  worldId: 'isle:aerion',
  name: 'King Aerion',
  title: 'the Breath-Taxer, Sovereign of Highspire',
  color: A_MAIN,
  colorLit: A_LIT,
  colorDark: A_DARK,
  accent: BRASS,
  damageMult: 1.35,

  intro: [
    'You are breathing very loudly for someone in arrears.',
    'Six of my children. Three of my wardens. A whole floor of corks. Every breath you took to do it — mine.',
    'Sit. Let me read your meter. I think you will find you owe me everything.',
  ],
  banter: [
    'Air is not free. Nothing that keeps you alive is free. That is rather the point of it.',
    'They are not imprisoned. They are resting. On credit.',
    'I have never once taken a breath that was not owed to me. Ask my ledgers.',
    'Every sigh is a quarter-groat. Do keep sighing.',
    'The sky is a treasury, and I am the only one with the key to it.',
    'Hold your breath, by all means. That is the only untaxed thing on Highspire.',
    'Down below the cloud line they breathe for nothing, and look at them. Grubbing.',
    'I can hear you panting from here. That is going on the account.',
  ],
  defeatLine: 'THE BOTTLES BREAK',
  resumeLine: 'Back again, and breathing on my credit again. Your arrears are compounding.',

  phases: [
    {
      name: 'The Tax',
      line: 'Let us begin with what you owe. Meter on. Breathe — carefully.',
      hp: 580,
      cycle: ['sig:levy', 'volley', 'sig:bellows', 'sig:tally', 'radial', 'sig:bellows', 'sig:levy', 'lanes', 'sig:tally', 'barrage'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'The Inhale',
      line: 'Very well. Then I shall simply take it back. All of it. Come here.',
      hp: 630,
      cycle: ['sig:inhale', 'sig:draught', 'homing', 'sig:gasp', 'spiral', 'sig:inhale', 'sig:gasp', 'volley', 'sig:draught', 'slamchain'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1050,
      harassMs: 3000,
    },
    {
      name: 'Hurricane Crown',
      line: 'Turn the sails. TURN THEM. Let the whole sky come round and look at you.',
      hp: 680,
      cycle: ['sig:sails', 'sig:twisters', 'sig:crown', 'barrage', 'sig:twisters', 'radial', 'sig:sails', 'sig:crown', 'lanes', 'sig:twisters'],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1000,
      harassMs: 2900,
    },
    {
      name: 'Breathless',
      line: '...no. No, I am not out of breath. I have ALL of it. Here — have it. Have it ALL.',
      hp: 730,
      cycle: ['sig:exhale', 'sig:shatter', 'sig:lastgasp', 'spiral', 'sig:exhale', 'sig:shatter', 'quake', 'sig:lastgasp', 'sanctuary'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 920,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'NOT ONE BREATH IS FREE',
    extraPhase: {
      name: 'Vacuum',
      line: 'If I cannot have it, nobody shall. Let there be no air at all.',
      hp: 580,
      cycle: ['sig:vacuum', 'sig:implode', 'sig:belljar', 'volley', 'sig:implode', 'sig:vacuum', 'homing', 'sig:belljar', 'sweep'],
      harass: ['h-rune', 'h-lane'],
      restMs: 880,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.16 },
    radial: { count: 20 },
    lanes: { halfW: 28 },
  },

  signatures: {
    levy: breathTax,
    bellows: tollBellows,
    tally,
    inhale,
    draught,
    gasp,
    sails: sailsTurn,
    twisters,
    crown: crownOfGales,
    exhale: theExhale,
    shatter: bottlesShatter,
    lastgasp: lastGasp,
    vacuum,
    implode: implosion,
    belljar: bellJar,
  },

  look: { crest: 'none', pattern: 'rings', aura: 'none', hands: 'gauntlet', torsoR: 44, mouth: 'line', eyes: 2, eyeColor: 0xe8f4ff },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'none', look: { pattern: 'swirl', aura: 'smoke', mouth: 'maw' } },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { pattern: 'swirl', aura: 'dust', hands: 'wisp', mouth: 'grin' } },
    { movement: 'rush', gimmick: 'none', tint: 'hot', look: { pattern: 'cracks', aura: 'bubbles', hands: 'ball', mouth: 'grate' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { pattern: 'smooth', aura: 'none', hands: 'orb', mouth: 'none', eyes: 1, torsoR: 40 } },
  ],

  drawDecor: drawAerion,
  drawArena: drawSailHub,
};
