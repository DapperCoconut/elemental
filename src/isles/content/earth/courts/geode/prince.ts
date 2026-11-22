import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mixC, mulberry, type G } from '../../../../art/IsleArt';
import { crystalPoint, cutGem, gemSide, poly, regentSeal } from './art';
import {
  AMETHYST, AMETHYST_DARK, AMETHYST_DEEP, AMETHYST_LIT, BRASS, BRASS_DARK, BRASS_LIT, FACET, FACET_DARK, FACET_LIT,
  FLAG, FLAG_DARK, FLAW, QUARTZ, QUARTZ_DARK, QUARTZ_LIT, SLATE, SPECTRUM,
} from './palette';
import { bounceRay, clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Facet, the Flawless — Regent Gravane's son, governor of the Geode Court.
 *
 * Facet grades the court's Tithe himself, through a loupe he never takes out of his eye, and a
 * stone with a flaw in it counts for nothing: it goes to the Grinding Wheel and the household goes
 * short. He was cut, as a boy, by his father, to see if he would crack. He did — a hairline down
 * the back, never healed — and he has not let anyone stand behind him since. He fights the way a
 * jeweller works:
 *
 * • **Brilliant Cut** (orbiting): he throws three beams of cut light that bounce off the crystal
 *   panels round the hall; sets his loupe on you — a burning focus that follows, then locks; and
 *   lays the grading table across the floor, half its tiles marked flawed, then the other half.
 * • **Cluster** (blinking, cold): he grows crystal copies of himself round you that shatter in
 *   rings of shards, and erupts a star of crystal spikes out from wherever he stands.
 * • **Flawless** (hard, anchored, pale): polished whole, he takes no hurt from the front — only a
 *   blow from behind, where the old crack is, gets through. He turns to face you; he spins on his
 *   heel with a blade of light; he flashes the table of his face down a cone in front of him.
 */

const TOP = 96;
/** The hall's walls, which are panelled in crystal — the box Brilliant Cut bounces in. */
const BOX = { x0: 34, y0: TOP + 10, x1: 960 - 34, y1: 640 - 22 };
/** Hard-mode HP knob. */
const HARD_HP = 1.3;
const FLAWLESS_HP = 410;

/**
 * Flawless's guard, shared between the move that runs it and the decor that reads the body
 * state. `facing` turns toward you at his own pace; only a hit while you stand behind it lands.
 */
const guard = {
  phase: 0, hard: false, facing: Math.PI / 2, open: false,
  spinFrom: 0, spinUntil: 0, spinA0: 0, spinDir: 1, lockUntil: 0, crackFx: 0,
};
const flawlessOn = () => guard.hard && guard.phase >= 2;

// ── Signature: Brilliant Cut ─────────────────────────────────────────
// Three beams of cut light fanned at you, each bouncing off the crystal panels round the hall
// (two bounces; three in the Cluster). The paths are drawn first; then they fire together.

interface CutBeam { pts: { x: number; y: number }[] }

const brilliant = (tk: BossToolkit): SignatureMove => {
  let beams: CutBeam[] = [];
  let warnAt = 0, fireAt = 0, dealt = true;
  return {
    durationMs: 2000,
    windupMs: 600,
    gesture: 'point',
    hold: 'draw',
    tell: 'BRILLIANT CUT',
    cast(time) {
      const a = tk.angleToPlayer();
      const bounces = guard.phase >= 1 ? 3 : 2;
      const spread = tk.hard ? 0.42 : 0.36;
      beams = [-1, 0, 1].map((k) => ({ pts: bounceRay(tk.bossX, tk.bossY, a + k * spread, BOX, bounces, 2600) }));
      warnAt = time; fireAt = time + tk.warn(1050); dealt = false;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (dealt || time < fireAt) return;
      dealt = true;
      tk.sfx('light-beam');
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      for (const b of beams) {
        for (let i = 0; i < b.pts.length - 1; i++) {
          if (segDist(p.x, p.y, b.pts[i].x, b.pts[i].y, b.pts[i + 1].x, b.pts[i + 1].y) < 13 + 12) { tk.hitPlayer(14, p.x, p.y); return; }
        }
      }
    },
    drawGround(g, time) {
      if (!beams.length || time > fireAt + 450) return;
      const firing = time >= fireAt;
      const k = firing ? clamp((time - fireAt) / 450, 0, 1) : clamp((time - warnAt) / Math.max(1, fireAt - warnAt), 0, 1);
      beams.forEach((b, bi) => {
        const c = SPECTRUM[(bi * 2 + 1) % SPECTRUM.length];
        for (let i = 0; i < b.pts.length - 1; i++) {
          const p0 = b.pts[i], p1 = b.pts[i + 1];
          if (firing) {
            g.lineStyle(30, c, 0.18 * (1 - k)); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
            g.lineStyle(12, lit(c, 0.4), 0.8 * (1 - k)); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
            g.lineStyle(3, 0xffffff, 1 - k); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          } else {
            g.lineStyle(1.5 + k * 2, c, 0.25 + k * 0.5); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          }
        }
        // A glint on each panel it strikes.
        for (let i = 1; i < b.pts.length - 1; i++) {
          const q = b.pts[i];
          g.fillStyle(0xffffff, firing ? 1 - k : 0.3 + k * 0.6); g.fillCircle(q.x, q.y, 4 + k * 4);
          g.lineStyle(1.5, c, firing ? 1 - k : k); g.strokeCircle(q.x, q.y, 12 + k * 6);
        }
      });
    },
    onPhaseEnd() { beams = []; dealt = true; },
  };
};

// ── Signature: The Loupe ─────────────────────────────────────────────
// He sets his loupe on you: three burning foci in turn, each following you for a moment, then
// locking where you stand and narrowing to a point before it burns.

interface Focus { startAt: number; lockAt: number; burnAt: number; x: number; y: number; done: boolean }

const loupe = (tk: BossToolkit): SignatureMove => {
  let foci: Focus[] = [];
  const R = 56;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE LOUPE',
    cast(time) {
      const p = tk.player;
      foci = [0, 1, 2].map((i) => {
        const startAt = time + i * 620;
        const lockAt = startAt + 1100;
        return { startAt, lockAt, burnAt: lockAt + tk.warn(600), x: p.x, y: p.y, done: false };
      });
      tk.sfx('prism');
    },
    update(time, dt) {
      const p = tk.player;
      for (const f of foci) {
        if (f.done || time < f.startAt) continue;
        if (time < f.lockAt) {
          const k = Math.min(1, dt * 4);
          f.x += (p.x - f.x) * k; f.y += (p.y - f.y) * k;
          continue;
        }
        if (time >= f.burnAt) {
          f.done = true;
          tk.sfx('sizzle');
          if (p.active && p.hp > 0 && dist(p.x, p.y, f.x, f.y) < R + 8) { tk.hitPlayer(15, p.x, p.y); tk.slowPlayer(0.6, 800); }
        }
      }
      foci = foci.filter((f) => !f.done || time < f.burnAt + 500);
    },
    drawGround(g, time) {
      for (const f of foci) {
        if (time < f.startAt) continue;
        if (f.done) {
          const k = clamp((time - f.burnAt) / 500, 0, 1);
          g.fillStyle(0x2a1a10, 0.4 * (1 - k)); g.fillCircle(f.x, f.y, R * 0.8);
          g.lineStyle(3, 0xffd070, 1 - k); g.strokeCircle(f.x, f.y, R * (0.6 + k * 0.5));
          continue;
        }
        const locked = time >= f.lockAt;
        const k = locked ? clamp((time - f.lockAt) / Math.max(1, f.burnAt - f.lockAt), 0, 1) : 0;
        // A disc of gathered light, the hot point narrowing as it focuses.
        g.fillStyle(0xfff4d8, 0.1 + k * 0.2); g.fillCircle(f.x, f.y, R);
        g.lineStyle(2, locked ? 0xffd070 : 0xfff4d8, 0.35 + k * 0.6); g.strokeCircle(f.x, f.y, R);
        g.fillStyle(0xffffff, 0.4 + k * 0.6); g.fillCircle(f.x, f.y, (1 - k) * R * 0.5 + 3);
      }
    },
    drawAir(g, time) {
      // The lens hangs in the air above each focus, a brass ring with a glint.
      for (const f of foci) {
        if (f.done || time < f.startAt) continue;
        const lx = f.x - 30, ly = f.y - 110;
        g.lineStyle(1.5, 0xfff4d8, 0.35); g.lineBetween(lx, ly, f.x, f.y);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, 46, 34);
        g.fillStyle(QUARTZ_LIT, 0.4); g.fillEllipse(lx, ly, 38, 27);
        g.fillStyle(0xffffff, 0.6); g.fillEllipse(lx - 8, ly - 6, 12, 6);
        g.lineStyle(2, BRASS, 1); g.strokeEllipse(lx, ly, 46, 34);
      }
    },
    onPhaseEnd() { foci = []; },
  };
};

// ── Signature: The Grading Table ─────────────────────────────────────
// The floor is laid out as a grading tray of diamond tiles. Half are marked flawed — cracks
// creeping over them — and burst; then the other half. Stand on the sound ones, then cross.

const TILE_SX = 60, TILE_SY = 40;
const parity = (x: number, y: number) => {
  const u = x / TILE_SX, v = (y - TOP) / TILE_SY;
  return ((Math.floor((u + v) / 2) + Math.floor((u - v) / 2)) % 2 + 2) % 2;
};

const grading = (tk: BossToolkit): SignatureMove => {
  let firstSet = 0;
  let warnA = 0, fireA = 0, fireB = 0;
  let stage = 0; // 0 idle, 1 A warning, 2 B warning, 3 done
  let seed = 0;
  return {
    durationMs: 3000,
    windupMs: 550,
    gesture: 'sweep',
    tell: 'THE GRADING TABLE',
    cast(time) {
      // The set you are standing on goes first.
      const p = tk.player;
      firstSet = parity(p.x, p.y);
      warnA = time; fireA = time + tk.warn(1250); fireB = fireA + tk.warn(1100);
      stage = 1; seed = Math.random() * 10;
      tk.sfx('crystal-chime');
    },
    update(time) {
      const p = tk.player;
      const burst = (set: number) => {
        tk.sfx('crystal-shatter');
        if (p.active && p.hp > 0 && parity(p.x, p.y) === set) { tk.hitPlayer(13, p.x, p.y); tk.slowPlayer(0.7, 500); }
      };
      if (stage === 1 && time >= fireA) { stage = 2; burst(firstSet); }
      else if (stage === 2 && time >= fireB) { stage = 3; burst(1 - firstSet); }
    },
    drawGround(g, time) {
      if (stage === 0 || (stage === 3 && time > fireB + 500)) return;
      for (let i = -9; i <= 17; i++) {
        for (let j = -9; j <= 9; j++) {
          const set = ((i + j) % 2 + 2) % 2;
          const cu = i + j + 1, cv = i - j;
          const cx = cu * TILE_SX, cy = TOP + cv * TILE_SY;
          if (cx < -TILE_SX || cx > tk.W + TILE_SX || cy < TOP - TILE_SY || cy > tk.H + TILE_SY) continue;
          const pts = [
            { x: (i + j) * TILE_SX, y: TOP + (i - j) * TILE_SY },
            { x: (i + j + 1) * TILE_SX, y: TOP + (i - j + 1) * TILE_SY },
            { x: (i + j + 2) * TILE_SX, y: TOP + (i - j) * TILE_SY },
            { x: (i + j + 1) * TILE_SX, y: TOP + (i - j - 1) * TILE_SY },
          ];
          const first = set === firstSet;
          const fireAt = first ? fireA : fireB;
          const warnFrom = first ? warnA : fireA;
          if (time < warnFrom) {
            g.lineStyle(1, FACET_LIT, 0.2); g.strokePoints(pts, true);
            continue;
          }
          if (time >= fireAt) {
            const k = clamp((time - fireAt) / 500, 0, 1);
            if (k < 1) { g.fillStyle(0xffffff, 0.45 * (1 - k)); g.fillPoints(pts, true); }
            continue;
          }
          const k = clamp((time - warnFrom) / Math.max(1, fireAt - warnFrom), 0, 1);
          g.fillStyle(AMETHYST_DARK, 0.12 + k * 0.22); g.fillPoints(pts, true);
          g.lineStyle(1.5, FACET_LIT, 0.4 + k * 0.4); g.strokePoints(pts, true);
          // Flaw cracks creeping in from a corner.
          const h = (((i * 31 + j * 17 + Math.floor(seed * 7)) % 4) + 4) % 4;
          const o = pts[h];
          g.lineStyle(1.5, 0xffffff, 0.3 + k * 0.6);
          g.lineBetween(o.x, o.y, o.x + (cx - o.x) * k * 1.4, o.y + (cy - o.y) * k * 1.4);
          g.lineBetween(o.x + (cx - o.x) * k * 0.7, o.y + (cy - o.y) * k * 0.7, o.x + (cx - o.x) * k * 0.7 + 10 * k, o.y + (cy - o.y) * k * 0.7 - 8 * k);
          // The grader's chalk cross on a flawed stone.
          if (k > 0.5) {
            g.lineStyle(2, 0xffffff, (k - 0.5) * 1.6);
            g.lineBetween(cx - 8, cy - 6, cx + 8, cy + 6); g.lineBetween(cx + 8, cy - 6, cx - 8, cy + 6);
          }
        }
      }
    },
    onPhaseEnd() { stage = 0; },
  };
};

// ── Signature: Cluster ───────────────────────────────────────────────
// Crystal copies of the Prince grow up round you — three of them, each a statue of him in
// amethyst. One after another they crack and shatter in a ring of shards.

interface Copy { x: number; y: number; growAt: number; burstAt: number; burst: boolean; spin: number }

const cluster = (tk: BossToolkit): SignatureMove => {
  let copies: Copy[] = [];
  return {
    durationMs: 2300,
    windupMs: 650,
    gesture: 'clap',
    tell: 'CLUSTER',
    cast(time) {
      const p = tk.player;
      const base = Math.random() * Math.PI * 2;
      const n = tk.hard ? 4 : 3;
      copies = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        copies.push({
          x: tk.clampX(p.x + Math.cos(a) * 200, 70), y: tk.clampY(p.y + Math.sin(a) * 170, 60),
          growAt: time, burstAt: time + tk.warn(1500) + i * 380, burst: false, spin: Math.random() * Math.PI,
        });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const c of copies) {
        if (c.burst || time < c.burstAt) continue;
        c.burst = true;
        tk.sfx('crystal-shatter');
        const n = tk.hard ? 10 : 9;
        for (let k = 0; k < n; k++) {
          tk.spawnBullet({ x: c.x, y: c.y - 30, angle: c.spin + (k / n) * Math.PI * 2, speed: 205, damage: 9, r: 6, lifeMs: 3500, color: AMETHYST_LIT });
        }
        if (p.active && p.hp > 0 && dist(p.x, p.y, c.x, c.y) < 56) tk.hitPlayer(10, p.x, p.y);
      }
      copies = copies.filter((c) => !c.burst || time < c.burstAt + 500);
    },
    drawGround(g, time) {
      for (const c of copies) {
        if (c.burst) continue;
        const k = clamp((time - c.growAt) / Math.max(1, c.burstAt - c.growAt), 0, 1);
        g.fillStyle(AMETHYST_DEEP, 0.3); g.fillEllipse(c.x, c.y + 4, 70, 22);
        g.lineStyle(1.5, AMETHYST_LIT, 0.2 + k * 0.6); g.strokeCircle(c.x, c.y, 56);
      }
    },
    drawAir(g, time) {
      for (const c of copies) {
        if (c.burst) {
          const k = clamp((time - c.burstAt) / 500, 0, 1);
          glow(g, c.x, c.y - 30, 50 * (1 - k) + 10, AMETHYST_LIT, 0.1 * (1 - k), 2);
          continue;
        }
        const grow = clamp((time - c.growAt) / 600, 0, 1);
        const k = clamp((time - c.growAt) / Math.max(1, c.burstAt - c.growAt), 0, 1);
        crystalStatue(g, c.x, c.y, grow, k, time);
      }
    },
    onPhaseEnd() { copies = []; },
  };
};

/** A crystal copy of Facet: his cut-gem crown and shoulders grown in amethyst, cracking as it ripens. */
function crystalStatue(g: G, x: number, y: number, grow: number, ripe: number, time: number): void {
  const s = grow;
  const shake = ripe > 0.75 ? Math.sin(time / 20) * 1.5 : 0;
  // Body: a faceted cone.
  poly(g, [{ x: x - 22 * s + shake, y }, { x: x + 22 * s + shake, y }, { x: x + 14 * s, y: y - 44 * s }, { x: x - 14 * s, y: y - 44 * s }], AMETHYST_DARK, 0.9);
  poly(g, [{ x: x - 22 * s + shake, y }, { x: x + shake, y }, { x, y: y - 44 * s }, { x: x - 14 * s, y: y - 44 * s }], AMETHYST, 0.9);
  // Head and the crown he always wears.
  g.fillStyle(AMETHYST_LIT, 0.9); g.fillCircle(x + shake, y - 54 * s, 11 * s);
  gemSide(g, x + shake, y - 62 * s, 22 * s, AMETHYST_LIT, 0.95);
  // Shoulder points.
  for (const k of [-1, 1]) crystalPoint(g, x + k * 16 * s + shake, y - 38 * s, 7 * s, 18 * s, k * 0.7, AMETHYST, 0.9);
  // Cracks as it ripens.
  if (ripe > 0.4) {
    const kk = (ripe - 0.4) / 0.6;
    g.lineStyle(1.5, 0xffffff, kk);
    g.lineBetween(x - 4, y - 50 * s, x + 6, y - 30 * s); g.lineBetween(x + 6, y - 30 * s, x - 2, y - 12 * s);
    g.lineBetween(x + 6, y - 30 * s, x + 14, y - 22 * s);
    if (ripe > 0.8) glow(g, x, y - 30, 40, AMETHYST_LIT, 0.08, 2);
  }
}

// ── Signature: Star Facet ────────────────────────────────────────────
// He drives his heel into the floor and a star of crystal spikes erupts out from him along
// eight lines, rank after rank outward; a second star follows, turned half a point.

interface Spike { x: number; y: number; at: number; erupt: number; wave: number }

const starburst = (tk: BossToolkit): SignatureMove => {
  let spikes: Spike[] = [];
  const dealt = new Set<number>();
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'slam',
    tell: 'STAR FACET',
    locksBody: true,
    cast(time) {
      spikes = [];
      dealt.clear();
      const ox = tk.bossX, oy = tk.bossY;
      const base = Math.random() * Math.PI;
      for (let w = 0; w < 2; w++) {
        for (let k = 0; k < 8; k++) {
          const a = base + (k / 8) * Math.PI * 2 + w * (Math.PI / 8);
          for (let r = 70; r < 620; r += 58) {
            const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
            if (x < 30 || x > tk.W - 30 || y < TOP + 10 || y > tk.H - 20) break;
            const at = time + w * tk.warn(900) + (r / 58) * 70;
            spikes.push({ x, y, at, erupt: at + tk.warn(700), wave: w });
          }
        }
      }
      tk.sfx('stone-slam');
    },
    update(time) {
      const p = tk.player;
      for (const s of spikes) {
        if (time < s.erupt || time > s.erupt + 120 || dealt.has(s.wave)) continue;
        if (p.active && p.hp > 0 && dist(p.x, p.y, s.x, s.y) < 28 + 12) { dealt.add(s.wave); tk.hitPlayer(12, p.x, p.y); }
      }
      if (spikes.length && time > Math.max(...spikes.map((s) => s.erupt)) + 700) spikes = [];
    },
    drawGround(g, time) {
      for (const s of spikes) {
        if (time < s.at || time >= s.erupt) continue;
        const k = clamp((time - s.at) / Math.max(1, s.erupt - s.at), 0, 1);
        g.fillStyle(FACET_DARK, 0.15 + k * 0.3);
        g.fillPoints([{ x: s.x, y: s.y - 14 }, { x: s.x + 18, y: s.y }, { x: s.x, y: s.y + 14 }, { x: s.x - 18, y: s.y }], true);
        g.lineStyle(1.2, FACET_LIT, 0.3 + k * 0.6);
        g.strokePoints([{ x: s.x, y: s.y - 14 }, { x: s.x + 18, y: s.y }, { x: s.x, y: s.y + 14 }, { x: s.x - 18, y: s.y }], true);
      }
    },
    drawAir(g, time) {
      for (const s of spikes) {
        if (time < s.erupt || time > s.erupt + 700) continue;
        const k = clamp((time - s.erupt) / 700, 0, 1);
        const h = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        crystalPoint(g, s.x - 6, s.y + 4, 10, 40 * h, -0.25, FACET, 0.95);
        crystalPoint(g, s.x + 6, s.y + 4, 12, 52 * h, 0.15, FACET_LIT, 0.95);
      }
    },
    onPhaseEnd() { spikes = []; },
  };
};

// ── Signature: Pirouette (and the Flawless guard) ────────────────────
// Every frame of Flawless, this move turns the Prince to face you, and he is impervious to any blow
// unless you stand behind him (`takenMult`). Cast, he spins once on his heel with a blade of light
// held out at arm's length — and as he spins his back comes round to you.

const pirouette = (tk: BossToolkit): SignatureMove => {
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'PIROUETTE',
    cast(time) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const a0 = guard.facing;
      const warn = tk.warn(700);
      tk.spawnSweep({ ox: tk.bossX, oy: tk.bossY, a0, a1: a0 + dir * Math.PI * 2, warnMs: warn, travelMs: 1500, halfW: 16, damage: 14, length: 520 });
      guard.spinA0 = a0; guard.spinDir = dir; guard.spinFrom = time + warn; guard.spinUntil = time + warn + 1500;
      tk.sfx('whoosh');
    },
    update(time, dt) {
      if (!flawlessOn()) { guard.open = false; return; }
      const toP = tk.angleToPlayer();
      if (time >= guard.spinFrom && time < guard.spinUntil) {
        guard.facing = guard.spinA0 + guard.spinDir * Math.PI * 2 * ((time - guard.spinFrom) / (guard.spinUntil - guard.spinFrom));
      } else if (time >= guard.lockUntil) {
        const rate = tk.hard ? 1.05 : 0.9;
        const d = wrapAngle(toP - guard.facing);
        guard.facing += clamp(d, -rate * dt, rate * dt);
      }
      guard.open = Math.abs(wrapAngle(toP - guard.facing)) > 1.95;
    },
    // Polished whole: nothing gets through his face, only a blow from behind, at the old crack.
    takenMult() { return flawlessOn() && !guard.open ? 0 : 1; },
    onBossHurt() { if (flawlessOn()) guard.crackFx = tk.now; },
    onPhaseEnd() { guard.spinUntil = 0; guard.lockUntil = 0; guard.open = false; },
  };
};

// ── Signature: Table Glare ───────────────────────────────────────────
// He holds still and the great table facet of his face flares: a cone of white light in front of
// him (his facing held while it builds). Behind him is the only dark in the hall.

const glare = (tk: BossToolkit): SignatureMove => {
  let warnAt = 0, fireAt = 0, a = 0, dealt = true;
  const LEN = 470, HALF = 0.62;
  return {
    durationMs: 1700,
    windupMs: 400,
    gesture: 'flex',
    hold: 'brace',
    tell: 'TABLE GLARE',
    locksBody: true,
    cast(time) {
      a = flawlessOn() ? guard.facing : tk.angleToPlayer();
      warnAt = time; fireAt = time + tk.warn(950); dealt = false;
      guard.lockUntil = fireAt + 200;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (dealt || time < fireAt) return;
      dealt = true;
      tk.sfx('light-beam');
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      const d = dist(p.x, p.y, tk.bossX, tk.bossY);
      const off = Math.abs(wrapAngle(Math.atan2(p.y - tk.bossY, p.x - tk.bossX) - a));
      if (d < LEN && off < HALF) { tk.hitPlayer(16, p.x, p.y); tk.slowPlayer(0.5, 900); }
    },
    drawGround(g, time) {
      if (time > fireAt + 400 || time < warnAt) return;
      const firing = time >= fireAt;
      const k = firing ? clamp((time - fireAt) / 400, 0, 1) : clamp((time - warnAt) / Math.max(1, fireAt - warnAt), 0, 1);
      const x = tk.bossX, y = tk.bossY;
      const pts = [{ x, y }];
      for (let i = 0; i <= 12; i++) { const b = a - HALF + (i / 12) * HALF * 2; pts.push({ x: x + Math.cos(b) * LEN, y: y + Math.sin(b) * LEN }); }
      g.fillStyle(firing ? 0xffffff : FACET_LIT, firing ? 0.55 * (1 - k) : 0.06 + k * 0.16); g.fillPoints(pts, true);
      g.lineStyle(2, FACET_LIT, firing ? 1 - k : 0.3 + k * 0.6); g.strokePoints(pts, true);
    },
    onPhaseEnd() { dealt = true; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const FACET_BOSS: WorldBossDef = {
  worldId: 'isle:facet',
  name: 'Prince Facet',
  title: 'the Flawless',
  color: FACET,
  colorLit: FACET_LIT,
  colorDark: FACET_DARK,
  accent: FLAW,
  // Tier 3 of the fifth isle.
  damageMult: 1.2,

  intro: [
    'Hold still. I am looking at you through the loupe. Mm. An inclusion. Two. A feather of cracks by the eye.',
    'You would grade at nothing, stranger. Nothing goes to the Wheel. Shall we see how finely you grind?',
  ],
  banter: [
    'A stone is worth what it would be if nothing had ever happened to it.',
    'Father struck me once, to see if I would ring true. I rang true. I ring true.',
    'Every flaw in the court comes through my hands. I find it. That is all a loupe does. It finds.',
    'Do not walk behind me. Nobody walks behind me.',
    'Light only shows you what was always there. I only show you what you are.',
  ],
  defeatLine: 'THE STONE IS FLAWED',
  resumeLine: 'You came back. Twice cut. I will find the second flaw faster than the first.',

  phases: [
    {
      name: 'Brilliant Cut',
      line: 'Fifty-seven facets. Each one a mirror. You are going to stand in all of them.',
      hp: 480,
      cycle: [
        'sig:brilliant', 'volley', 'sig:loupe', 'sig:grading', 'radial',
        'sig:brilliant', 'homing', 'sig:loupe', 'lanes', 'sig:grading',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Cluster',
      line: 'You cracked the table. Then I shall be more than one stone. A cluster cannot be flawed all over.',
      hp: 570,
      cycle: [
        'sig:cluster', 'sig:starburst', 'sig:brilliant', 'spiral', 'sig:cluster',
        'barrage', 'sig:starburst', 'sig:loupe', 'sweep',
      ],
      harass: ['h-flak', 'h-orbs', 'h-mines'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    hpMult: HARD_HP,
    damageMult: 1.25,
    restMult: 0.7,
    introLine: 'POLISHED WHOLE. NOT A MARK ON HIM',
    extraPhase: {
      name: 'Flawless',
      line: 'Polished. Whole. You will not find a mark on my face. Do not look for one anywhere else.',
      hp: FLAWLESS_HP,
      cycle: [
        'sig:glare', 'sig:pirouette', 'sig:brilliant', 'homing',
        'sig:glare', 'sig:starburst', 'sig:pirouette', 'sig:cluster',
      ],
      harass: ['h-rune', 'h-snipe'],
      restMs: 1000,
      harassMs: 2800,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.48 },
    radial: { count: 16, speed: 185 },
    spiral: { arms: 4, speed: 170 },
    lanes: { count: 3 },
  },

  signatures: {
    brilliant,
    loupe,
    grading,
    cluster,
    starburst,
    pirouette,
    glare,
  },

  look: {
    crest: 'crown', pattern: 'facets', aura: 'sparks', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: FACET_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'blink', gimmick: 'none', tint: 'cold', look: { crest: 'spires', hands: 'blade', aura: 'frost' } },
    { movement: 'anchor', gimmick: 'none', tint: 'pale', look: { crest: 'halo', pattern: 'smooth', hands: 'gauntlet', aura: 'none' } },
  ],

  /**
   * The Flawless's tells. A brilliant-cut gem sits on his head for a crown, its table to the sky;
   * a jeweller's loupe is screwed into his right eye, a brass rim on a chain; a short cape of cut
   * crystal panels hangs from his shoulders. In the Cluster amethyst points have broken out of his
   * shoulders and back, and two faint refracted copies of him shiver to either side. In Flawless
   * he is polished smooth: a great bright table facet is held to the front like a face, and on
   * the far side of him a thin gold crack glows — brightest when you are standing behind it.
   */
  drawDecor(g, s) {
    // Keep the shared guard in step with the fight (and fresh on a new one).
    if (s.phaseIdx !== guard.phase || s.hard !== guard.hard) {
      guard.phase = s.phaseIdx; guard.hard = s.hard;
      guard.facing = s.facing; guard.spinUntil = 0; guard.lockUntil = 0;
    }
    const R = s.radius;
    const flawless = s.hard && s.phaseIdx >= 2;
    const clusterPhase = s.phaseIdx === 1;

    // Refracted copies shivering to either side in the Cluster.
    if (clusterPhase) {
      for (const k of [-1, 1]) {
        const off = k * (R * 1.3 + Math.sin(s.t / 160 + k) * 4);
        g.fillStyle(SPECTRUM[k < 0 ? 0 : 5], 0.12); g.fillCircle(s.x + off, s.y, R * 0.95);
        gemSide(g, s.x + off, s.y - R * 0.95, R * 0.8, SPECTRUM[k < 0 ? 0 : 5], 0.18);
      }
    }

    // Cape of cut crystal panels behind the shoulders.
    if (!flawless) {
      for (let i = 0; i < 6; i++) {
        const t = i / 5 - 0.5;
        const px = s.x + t * R * 1.7, py = s.y + R * 0.2;
        const c = i % 2 ? FACET_DARK : mixC(FACET_DARK, AMETHYST, 0.4);
        poly(g, [{ x: px - R * 0.18, y: py }, { x: px + R * 0.18, y: py }, { x: px + t * 6, y: py + R * 0.95 + Math.abs(t) * -6 }], c, 0.85);
      }
    }

    if (flawless) {
      // The table facet held to the front: a bright octagon facing `guard.facing`.
      const fa = guard.facing;
      const fx = s.x + Math.cos(fa) * R * 0.9, fy = s.y + Math.sin(fa) * R * 0.75;
      glow(g, fx, fy, R * 0.8, FACET_LIT, 0.06, 2);
      cutGem(g, fx, fy, R * 0.5, FACET_LIT, 0.95);
      // The old crack, on the side away from the facet.
      const ba = fa + Math.PI;
      const bx = s.x + Math.cos(ba) * R * 0.8, by = s.y + Math.sin(ba) * R * 0.65;
      const pulse = guard.open ? 0.75 + Math.sin(s.t / 70) * 0.25 : 0.35;
      const px = -Math.sin(ba), py = Math.cos(ba);
      g.lineStyle(guard.open ? 3 : 2, FLAW, pulse);
      g.lineBetween(bx + px * R * 0.45, by + py * R * 0.45 - 6, bx + px * 0.1 * R, by + py * 0.1 * R);
      g.lineBetween(bx + px * 0.1 * R, by + py * 0.1 * R, bx - px * R * 0.2, by - py * R * 0.2 + 4);
      g.lineBetween(bx - px * R * 0.2, by - py * R * 0.2 + 4, bx - px * R * 0.5, by - py * R * 0.5 - 2);
      if (guard.open) glow(g, bx, by, R * 0.6, FLAW, 0.08, 2);
      if (s.t - guard.crackFx < 360) {
        const k = (s.t - guard.crackFx) / 360;
        g.lineStyle(3, FLAW, 1 - k); g.strokeCircle(bx, by, R * (0.3 + k * 0.6));
      }
      // A thin facing line on the floor, so you can read where he looks.
      g.lineStyle(1.5, FACET_LIT, 0.25); g.lineBetween(s.x, s.y + R * 0.9, s.x + Math.cos(fa) * R * 2.4, s.y + R * 0.9 + Math.sin(fa) * R * 1.4);
    }

    // Crystal points broken out of his shoulders in the Cluster.
    if (clusterPhase) {
      for (let i = 0; i < 5; i++) {
        const t = i / 4 - 0.5;
        crystalPoint(g, s.x + t * R * 1.6, s.y - R * 0.35, R * 0.22, R * (0.9 - Math.abs(t) * 0.6) * (0.85 + s.castGlow * 0.3), t * 1.4, mixC(AMETHYST, AMETHYST_LIT, (i % 2) * 0.4));
      }
    }

    // The crown: a brilliant, table up, in brass claws.
    const cy = s.y - R * 1.02;
    const cw = R * (flawless ? 1.0 : 0.9);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(s.x - cw * 0.45, cy - 2, cw * 0.9, 5);
    for (const k of [-0.42, -0.14, 0.14, 0.42]) { g.lineStyle(2, BRASS, 1); g.lineBetween(s.x + k * cw, cy, s.x + k * cw * 0.8, cy - cw * 0.35); }
    glow(g, s.x, cy - cw * 0.5, cw * 0.7, FACET_LIT, 0.04 + s.castGlow * 0.06, 2);
    // Upside-down brilliant: pavilion up, the culet a spike.
    poly(g, [{ x: s.x - cw * 0.5, y: cy }, { x: s.x + cw * 0.5, y: cy }, { x: s.x + cw * 0.3, y: cy - cw * 0.28 }, { x: s.x - cw * 0.3, y: cy - cw * 0.28 }], FACET_LIT);
    poly(g, [{ x: s.x - cw * 0.3, y: cy - cw * 0.28 }, { x: s.x + cw * 0.3, y: cy - cw * 0.28 }, { x: s.x, y: cy - cw * 0.85 }], FACET);
    poly(g, [{ x: s.x, y: cy - cw * 0.28 }, { x: s.x + cw * 0.3, y: cy - cw * 0.28 }, { x: s.x, y: cy - cw * 0.85 }], FACET_DARK, 0.8);
    g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(s.x - cw * 0.5, cy, s.x + cw * 0.5, cy);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(s.x - cw * 0.12, cy - cw * 0.5, 2.2);

    // The loupe in his right eye (on the side toward you), on its chain.
    if (!flawless) {
      const ex = s.x + Math.cos(s.facing) * R * 0.32 + 7, ey = s.y - R * 0.18 + Math.sin(s.facing) * R * 0.18;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(ex, ey, 7.5);
      g.fillStyle(QUARTZ_LIT, 0.7); g.fillCircle(ex, ey, 5.5);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(ex - 2, ey - 2, 1.8);
      g.lineStyle(1, BRASS_LIT, 0.9);
      g.beginPath(); g.arc(ex - 4, ey + 14, 12, -Math.PI * 0.4, Math.PI * 0.6, false); g.strokePath();
    }

    // The gem in his second hand: the stone he is grading, catching the light.
    const hand = s.hands[1];
    if (hand) cutGem(g, hand.x, hand.y - 10 - s.castGlow * 4, 6 + s.castGlow * 2, clusterPhase ? AMETHYST_LIT : QUARTZ, 1);
    if (s.enraged) { g.lineStyle(1.5, FACET_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.45); }
  },

  /**
   * The Grading Hall of the Cutting-House: a floor of dark slate inlaid, wall to wall, with one
   * enormous brilliant cut in pale stone — table, star facets, kite facets, girdle — as if the
   * room were a gem seen from above. The walls are panelled in mirror-crystal (Brilliant Cut
   * bounces off them), chandeliers of crystal points hang in pools of light, and the Regent's seal
   * is let into the floor at the culet.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xfa2e7);
    g.fillStyle(SLATE, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { g.fillStyle(dim(SLATE, 0.25), 0.4); g.fillRect(rng() * W, 100 + rng() * (H - 100), 3, 1.5); }
    // The great inlaid brilliant.
    const cx = W / 2, cy = (H + TOP) / 2 + 6;
    const Rg = 250, Rt = 120;
    const ring = (r: number, n: number, off: number, sy = 0.72) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + off;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * sy };
    });
    const girdle = ring(Rg, 16, 0), table = ring(Rt, 8, Math.PI / 8), mid = ring((Rg + Rt) / 2 + 20, 8, 0);
    poly(g, girdle, FLAG_DARK, 0.55);
    for (let i = 0; i < 16; i++) {
      const p0 = girdle[i], p1 = girdle[(i + 1) % 16], m = mid[Math.floor(((i + 1) % 16) / 2) % 8];
      poly(g, [p0, p1, m], i % 2 ? FLAG : dim(FLAG, 0.12), 0.5);
    }
    for (let i = 0; i < 8; i++) {
      const t0 = table[i], t1 = table[(i + 1) % 8], m = mid[(i + 1) % 8];
      poly(g, [t0, t1, m], i % 2 ? mixC(FLAG, AMETHYST_LIT, 0.25) : FLAG, 0.55);
    }
    poly(g, table, mixC(FLAG, FACET_LIT, 0.3), 0.6);
    g.lineStyle(2, BRASS_DARK, 0.6); g.strokePoints(girdle, true); g.strokePoints(table, true);
    g.lineStyle(1, BRASS, 0.4);
    for (let i = 0; i < 8; i++) { g.lineBetween(table[i].x, table[i].y, mid[i].x, mid[i].y); g.lineBetween(mid[i].x, mid[i].y, girdle[i * 2].x, girdle[i * 2].y); }
    regentSeal(g, cx, cy, 16);
    // Mirror-crystal panels round the walls.
    for (let x = 0; x < W; x += 48) {
      for (const [y, h] of [[TOP - 6, 18], [H - 22, 22]] as [number, number][]) {
        g.fillStyle(QUARTZ_DARK, 1); g.fillRect(x + 2, y, 44, h);
        g.fillStyle(QUARTZ, 0.8); g.fillTriangle(x + 4, y + 2, x + 44, y + 2, x + 24, y + h - 2);
        g.fillStyle(QUARTZ_LIT, 0.6); g.fillRect(x + 6, y + 3, 10, 2);
        g.lineStyle(1.5, BRASS_DARK, 1); g.strokeRect(x + 2, y, 44, h);
      }
    }
    for (let y = TOP; y < H; y += 48) {
      for (const x of [0, W - 34]) {
        g.fillStyle(QUARTZ_DARK, 1); g.fillRect(x, y + 2, 34, 44);
        g.fillStyle(QUARTZ, 0.75); g.fillTriangle(x + 2, y + 4, x + 32, y + 24, x + 2, y + 44);
        g.lineStyle(1.5, BRASS_DARK, 1); g.strokeRect(x, y + 2, 34, 44);
      }
    }
    // The back wall above the HUD line: banded geode stone behind the panels.
    for (let i = 0; i < 5; i++) { g.fillStyle([AMETHYST_DEEP, AMETHYST_DARK, FACET_DARK, AMETHYST_DARK, AMETHYST_DEEP][i], 1); g.fillRect(0, i * 18, W, 18); }
    for (let x = 14; x < W; x += 34) crystalPoint(g, x, 90, 12, 30 + rng() * 26, Math.PI + (rng() - 0.5) * 0.4, AMETHYST);
    // Pools of chandelier light, each under a hanging cluster.
    for (const [x, y] of [[200, 230], [W - 200, 230], [200, H - 140], [W - 200, H - 140]] as [number, number][]) {
      for (let k = 0; k < 4; k++) { g.fillStyle(0xfff4d8, 0.025); g.fillEllipse(x, y, 220 - k * 40, 110 - k * 20); }
      for (let i = 0; i < 6; i++) crystalPoint(g, x - 15 + i * 6, y - 40, 4, 12 + (i % 3) * 5, Math.PI, QUARTZ_LIT, 0.6);
    }
  },
};
