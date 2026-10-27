import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry, brandSigil } from '../../../../art/IsleArt';
import { P, drawKeg, drawPuff, drawSpark } from './util';

/**
 * PRINCE FUSE — the Brand-King's artillery-mad son, master of the Powder Court.
 *
 * He governs the tithe the gunner's way: every household's Tithe Fire must be kept hot enough to
 * light a match from, and the match is inspected. He loves the guns more than the King, and the
 * King knows it, which is why Fuse has the magazine and not the treasury.
 *
 * Phase one, *The Battery*, he digs in at the back and works the room with ordnance — a creeping
 * barrage, mortars, canister shot. Phase two, *Last Stand*, he comes over the parapet: rushing in,
 * pouring a powder trail that burns a maze through the room, tossing petards. On hard, *The
 * Magazine*: the room is a powder store and he is lighting it, stack by stack.
 *
 * His silhouette is the wick: a braided slow-match rising out of his bicorne, burning shorter as
 * his health goes — when the spark reaches the hat, the fight is nearly over one way or the other.
 */

const POWDER = 0x2a2522;
const POWDER_LIT = 0x7a6a58;
const POWDER_DARK = 0x0f0c0a;
const SPARK = 0xffb02e;

const FIELD_TOP = 96;

// ── Signature: Creeping Barrage ──────────────────────────────────────
// Ranks of shellbursts walk across the room away from Fuse, one rank at a time. Each rank leaves a
// two-shell gap that drifts at most one slot per rank, and a surveyor's chalk line with two green
// pennants marks the next rank — and its gap — before the shells land. Walk with the gap.

interface Rank { at: number; vertical: boolean; pos: number; slots: number[]; gap: number; slotStep: number }

const creeping = (tk: BossToolkit): SignatureMove => {
  let ranks: Rank[] = [];
  let until = 0;
  const STEP_MS = 470;
  const SLOT = 78;
  return {
    durationMs: 3400,
    windupMs: 900,
    tell: 'CREEPING BARRAGE',
    gesture: 'point',
    cast(time: number) {
      tk.sfx('mortar-launch');
      ranks = [];
      const p = tk.player;
      const dx = p.x - tk.bossX, dy = p.y - tk.bossY;
      const vertical = Math.abs(dx) >= Math.abs(dy) * 1.2;
      const dir = vertical ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
      const from = vertical ? tk.bossX + dir * 70 : tk.bossY + dir * 70;
      const lo = vertical ? 40 : FIELD_TOP + 20;
      const hi = vertical ? tk.W - 40 : tk.H - 30;
      const slots: number[] = [];
      const s0 = vertical ? FIELD_TOP + 30 : 50;
      const s1 = vertical ? tk.H - 30 : tk.W - 40;
      for (let s = s0; s <= s1; s += SLOT) slots.push(s);
      const pc = vertical ? p.y : p.x;
      let gap = 0;
      for (let i = 0; i < slots.length; i++) if (Math.abs(slots[i] - pc) < Math.abs(slots[gap] - pc)) gap = i;
      gap = Math.min(gap, slots.length - 2);
      const count = tk.hard ? 9 : 8;
      for (let k = 0; k < count; k++) {
        const pos = from + dir * k * 82;
        if (pos < lo || pos > hi) break;
        if (k > 0) gap = Phaser.Math.Clamp(gap + (Math.floor(Math.random() * 3) - 1), 0, slots.length - 2);
        ranks.push({ at: time + k * STEP_MS, vertical, pos, slots, gap, slotStep: SLOT });
        const g = gap;
        tk.schedule(k * STEP_MS, () => {
          tk.sfx('explosion-small');
          slots.forEach((s, i) => {
            if (i === g || i === g + 1) return;
            tk.spawnZone({ x: vertical ? pos : s, y: vertical ? s : pos, radius: 44, warnMs: 1000, damage: 15, fall: true });
          });
        });
      }
      until = time + ranks.length * STEP_MS + 1400;
    },
    drawGround(g, time) {
      if (time > until) return;
      for (const r of ranks) {
        const lead = r.at - time;
        if (lead > 650 || lead < -1000) continue;
        const a = lead > 0 ? 1 - lead / 650 : 1;
        // Chalk ranging line along the rank.
        const along = r.slots;
        for (let i = 0; i < along.length - 1; i++) {
          if (i === r.gap) continue;
          const s = along[i], e = along[i + 1];
          for (let d = s; d < e; d += 16) {
            const x0 = r.vertical ? r.pos : d, y0 = r.vertical ? d : r.pos;
            const x1 = r.vertical ? r.pos : d + 8, y1 = r.vertical ? d + 8 : r.pos;
            g.lineStyle(2, P.saltpetre, 0.45 * a); g.lineBetween(x0, y0, x1, y1);
          }
        }
        // Green pennants either side of the gap — the safe passage.
        for (const i of [r.gap, r.gap + 1]) {
          const s = along[i] + (i === r.gap ? -r.slotStep * 0.5 : r.slotStep * 0.5);
          const fx = r.vertical ? r.pos : s, fy = r.vertical ? s : r.pos;
          g.lineStyle(1.5, P.ironLit, a); g.lineBetween(fx, fy, fx, fy - 22);
          g.fillStyle(0x7ad66a, a); g.fillTriangle(fx, fy - 22, fx, fy - 13, fx + 12, fy - 18);
        }
      }
    },
    onPhaseEnd() { ranks = []; until = 0; },
  };
};

// ── Signature: Mortar Cross ──────────────────────────────────────────
// Five mortar bombs go up out of the frame with a thump each. Four come down in a cross around
// where you stood, the fifth on the spot itself, last. The diagonals are the way out. Each bomb
// leaves a patch of burning powder.

interface Shell { x: number; y: number; land: number; launch: number }

const mortar = (tk: BossToolkit): SignatureMove => {
  let shells: Shell[] = [];
  return {
    durationMs: 2600,
    windupMs: 750,
    tell: 'MORTARS!',
    gesture: 'raise',
    cast(time: number) {
      shells = [];
      const p = tk.player;
      const R = 112;
      const pts = [
        { x: p.x + R, y: p.y }, { x: p.x - R, y: p.y }, { x: p.x, y: p.y + R }, { x: p.x, y: p.y - R },
        { x: p.x, y: p.y },
      ];
      pts.forEach((pt, i) => {
        const delay = i < 4 ? i * 120 : 700;
        tk.schedule(delay, () => {
          tk.sfx('mortar-launch');
          const warn = 1500;
          tk.spawnZone({ x: pt.x, y: pt.y, radius: 58, warnMs: warn, damage: 20, poolMs: 2200, poolDamage: 6 });
          shells.push({ x: tk.clampX(pt.x), y: tk.clampY(pt.y), launch: tk.now, land: tk.now + tk.warn(warn) });
        });
      });
    },
    drawAir(g, time) {
      for (const s of shells) {
        const up = (time - s.launch) / 450;
        if (up < 1) {
          // Going up out of the mortar mouth, fast, trailing smoke.
          const y = tk.bossY - 30 - up * (tk.bossY + 40);
          g.fillStyle(POWDER_DARK, 1); g.fillCircle(tk.bossX + up * 10, y, 6);
          drawPuff(g, tk.bossX, tk.bossY - 34, 10 + up * 10, P.smoke, 0.4 * (1 - up), 3);
        }
        const down = 1 - (s.land - time) / 520;
        if (down > 0 && down < 1) {
          // Coming down on the mark, whistling.
          const y = s.y - (1 - down) * (s.y + 30);
          g.fillStyle(POWDER_DARK, 1); g.fillCircle(s.x, y, 7);
          g.fillStyle(SPARK, 0.9); g.fillCircle(s.x, y - 7, 2.5);
          g.lineStyle(2, P.smoke, 0.4); g.lineBetween(s.x, y - 10, s.x, y - 50);
        }
      }
      shells = shells.filter((s) => time < s.land + 200);
    },
    drawGround(g, time) {
      for (const s of shells) {
        const k = Math.max(0, Math.min(1, 1 - (s.land - time) / 1500));
        g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillEllipse(s.x, s.y, 14 + k * 50, 7 + k * 24);
      }
    },
    onPhaseEnd() { shells = []; },
  };
};

// ── Signature: Canister Shot ─────────────────────────────────────────
// A fat tin canister flies at a marked burst point and splits into a cone of grapeshot. The cone
// is drawn on the floor before it fires. Step out of the wedge — or inside the burst point, where
// the shot has not yet spread.

const grapeshot = (tk: BossToolkit): SignatureMove => {
  let live = false;
  let fx = 0, fy = 0, bx = 0, by = 0, ang = 0;
  let fireAt = 0, burstAt = 0;
  const SPREAD = 0.52;
  return {
    durationMs: 2000,
    windupMs: 500,
    tell: 'CANISTER!',
    hold: 'charge',
    cast(time: number) {
      const p = tk.player;
      fx = tk.bossX; fy = tk.bossY;
      ang = tk.angleToPlayer();
      const d = Phaser.Math.Clamp(Phaser.Math.Distance.Between(fx, fy, p.x, p.y) * 0.7, 140, 360);
      bx = fx + Math.cos(ang) * d; by = fy + Math.sin(ang) * d;
      fireAt = time + 700;
      burstAt = fireAt + (d / 460) * 1000;
      live = true;
      tk.sfx('reload');
      tk.schedule(700, () => tk.sfx('shotgun'));
      tk.schedule(burstAt - time, () => {
        tk.sfx('explosion-small');
        const n = tk.hard ? 15 : 13;
        for (let i = 0; i < n; i++) {
          const a = ang + (i / (n - 1) - 0.5) * SPREAD * 2 + (Math.random() - 0.5) * 0.04;
          tk.spawnBullet({ x: bx, y: by, angle: a, speed: 290 + (i % 3) * 25, damage: 9, r: 5, lifeMs: 2200, color: POWDER_LIT });
        }
        live = false;
      });
    },
    drawGround(g, time) {
      if (!live) return;
      const k = Math.min(1, (time - (fireAt - 700)) / 700);
      // Aim line and the burst ring.
      g.lineStyle(2, SPARK, 0.35 * k); g.lineBetween(fx, fy, bx, by);
      g.lineStyle(2, SPARK, 0.7); g.strokeCircle(bx, by, 14 + (1 - k) * 20);
      // The cone of shot that will come out of it.
      const L = 520;
      g.fillStyle(SPARK, 0.07 + k * 0.08);
      g.fillTriangle(bx, by, bx + Math.cos(ang - SPREAD) * L, by + Math.sin(ang - SPREAD) * L, bx + Math.cos(ang + SPREAD) * L, by + Math.sin(ang + SPREAD) * L);
      g.lineStyle(1.5, SPARK, 0.5 * k);
      g.lineBetween(bx, by, bx + Math.cos(ang - SPREAD) * L, by + Math.sin(ang - SPREAD) * L);
      g.lineBetween(bx, by, bx + Math.cos(ang + SPREAD) * L, by + Math.sin(ang + SPREAD) * L);
    },
    drawAir(g, time) {
      if (!live || time < fireAt) return;
      const k = Math.min(1, (time - fireAt) / (burstAt - fireAt));
      const x = fx + (bx - fx) * k, y = fy + (by - fy) * k;
      g.fillStyle(dim(P.iron, 0.3), 1); g.fillRoundedRect(x - 9, y - 7, 18, 14, 4);
      g.fillStyle(P.ironLit, 1); g.fillRect(x - 9, y - 2, 18, 3);
      drawPuff(g, x - Math.cos(ang) * 18, y - Math.sin(ang) * 18, 8, P.smoke, 0.4, 2);
    },
    onPhaseEnd() { live = false; },
  };
};

// ── Signature: Powder Trail ──────────────────────────────────────────
// Fuse pours a trail of blackpowder across the room in a maze of walls, outward from himself,
// then drops his match. Fire runs out along every line at a walking pace and each wall burns for
// a few seconds. Corners are left open; the walls only hurt where they are burning.

interface Seg { x1: number; y1: number; x2: number; y2: number; layAt: number; lightAt: number; len: number }

const TRAIL_SPEED = 520;

/** Distance from a point to a segment. */
function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1, vy = y2 - y1;
  const L2 = vx * vx + vy * vy;
  const t = L2 > 0 ? Phaser.Math.Clamp(((px - x1) * vx + (py - y1) * vy) / L2, 0, 1) : 0;
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}
const TRAIL_BURN_MS = 2700;

const trail = (tk: BossToolkit): SignatureMove => {
  let segs: Seg[] = [];
  let lastTick = 0;
  return {
    durationMs: 3200,
    windupMs: 700,
    tell: 'POWDER TRAIL',
    hold: 'spray',
    cast(time: number) {
      tk.sfx('sizzle');
      segs = [];
      const cols = 6, rows = 4;
      const cw = tk.W / cols, ch = (tk.H - FIELD_TOP) / rows;
      // Carve a perfect maze, then braid it so it is a room of walls, not a puzzle box.
      const id = (c: number, r: number) => r * cols + c;
      const seen = new Set<number>();
      const open = new Set<string>();
      const stack: [number, number][] = [[Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)]];
      seen.add(id(stack[0][0], stack[0][1]));
      while (stack.length) {
        const [c, r] = stack[stack.length - 1];
        const nb = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
          .map(([dx, dy]) => [c + dx, r + dy] as [number, number])
          .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen.has(id(x, y)));
        if (!nb.length) { stack.pop(); continue; }
        const [nx, ny] = nb[Math.floor(Math.random() * nb.length)];
        open.add(`${Math.min(c, nx)},${Math.min(r, ny)},${nx !== c ? 'v' : 'h'}`);
        seen.add(id(nx, ny));
        stack.push([nx, ny]);
      }
      const laidAt = time;
      const ox = tk.bossX, oy = tk.bossY;
      const add = (x1: number, y1: number, x2: number, y2: number): void => {
        const d = Math.min(Phaser.Math.Distance.Between(ox, oy, x1, y1), Phaser.Math.Distance.Between(ox, oy, x2, y2));
        const len = Math.hypot(x2 - x1, y2 - y1);
        segs.push({ x1, y1, x2, y2, len, layAt: laidAt + d * 1.6, lightAt: laidAt + 1500 + (d / TRAIL_SPEED) * 1000 });
      };
      const inset = 14;
      const braid = tk.hard ? 0.18 : 0.3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Vertical wall on the right of (c, r).
          if (c < cols - 1 && !open.has(`${c},${r},v`) && Math.random() > braid) {
            const x = (c + 1) * cw;
            add(x, FIELD_TOP + r * ch + inset, x, FIELD_TOP + (r + 1) * ch - inset);
          }
          // Horizontal wall under (c, r).
          if (r < rows - 1 && !open.has(`${c},${r},h`) && Math.random() > braid) {
            const y = FIELD_TOP + (r + 1) * ch;
            add(c * cw + inset, y, (c + 1) * cw - inset, y);
          }
        }
      }
      lastTick = 0;
    },
    update(time: number) {
      if (!segs.length) return;
      const p = tk.player;
      if (time - lastTick < 450) return;
      for (const s of segs) {
        const burnt = Math.min(1, ((time - s.lightAt) / 1000) * TRAIL_SPEED / s.len);
        if (burnt <= 0 || time > s.lightAt + (s.len / TRAIL_SPEED) * 1000 + TRAIL_BURN_MS) continue;
        // Only the burning stretch hurts.
        const ex = s.x1 + (s.x2 - s.x1) * burnt, ey = s.y1 + (s.y2 - s.y1) * burnt;
        if (segDist(p.x, p.y, s.x1, s.y1, ex, ey) < 18) {
          lastTick = time;
          tk.hitPlayer(12, p.x, p.y);
          tk.slowPlayer(0.75, 600);
          break;
        }
      }
      const last = segs.reduce((m, s) => Math.max(m, s.lightAt + (s.len / TRAIL_SPEED) * 1000 + TRAIL_BURN_MS), 0);
      if (time > last) segs = [];
    },
    drawGround(g, time) {
      for (const s of segs) {
        if (time < s.layAt) continue;
        // The poured powder: a dark grainy line.
        const pour = Math.min(1, (time - s.layAt) / 260);
        const px = s.x1 + (s.x2 - s.x1) * pour, py = s.y1 + (s.y2 - s.y1) * pour;
        const burnedOut = time > s.lightAt + (s.len / TRAIL_SPEED) * 1000 + TRAIL_BURN_MS;
        g.lineStyle(6, burnedOut ? 0x1a1410 : POWDER_DARK, burnedOut ? 0.35 : 0.85); g.lineBetween(s.x1, s.y1, px, py);
        if (!burnedOut) { g.lineStyle(1, POWDER_LIT, 0.5); g.lineBetween(s.x1, s.y1 - 1, px, py - 1); }
      }
    },
    drawAir(g, time) {
      for (const s of segs) {
        const burnt = Math.min(1, ((time - s.lightAt) / 1000) * TRAIL_SPEED / s.len);
        const endAt = s.lightAt + (s.len / TRAIL_SPEED) * 1000 + TRAIL_BURN_MS;
        if (burnt <= 0 || time > endAt) continue;
        const fade = Math.min(1, (endAt - time) / 500);
        const ex = s.x1 + (s.x2 - s.x1) * burnt, ey = s.y1 + (s.y2 - s.y1) * burnt;
        // A low wall of flame along the burnt stretch, tongues licking up.
        g.lineStyle(14, P.flame, 0.35 * fade); g.lineBetween(s.x1, s.y1, ex, ey);
        g.lineStyle(5, SPARK, 0.8 * fade); g.lineBetween(s.x1, s.y1, ex, ey);
        const n = Math.max(2, Math.floor((s.len * burnt) / 18));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const x = s.x1 + (ex - s.x1) * t, y = s.y1 + (ey - s.y1) * t;
          const h = 8 + Math.sin(time / 80 + i * 1.7 + s.x1) * 5;
          g.fillStyle(i % 2 ? SPARK : P.flame, 0.8 * fade);
          g.fillTriangle(x - 4, y, x + 4, y, x, y - h);
        }
        if (burnt < 1) drawSpark(g, ex, ey, time, 1.1);
      }
    },
    onPhaseEnd() { segs = []; },
  };
};

// ── Signature: Petards ───────────────────────────────────────────────
// Three brass petards — bells of powder bolted to oak boards — are slung around you. Each one ticks
// on its own fuse (they go off in turn) and spits iron shards in a ring when it blows. The ring
// spacing leaves lanes between the shards.

interface Petard { x: number; y: number; from: { x: number; y: number }; thrown: number; landAt: number; blowAt: number; done: boolean }

const petard = (tk: BossToolkit): SignatureMove => {
  let ps: Petard[] = [];
  const BLAST = 116;
  return {
    durationMs: 2400,
    windupMs: 600,
    tell: 'PETARDS',
    gesture: 'sweep',
    cast(time: number) {
      ps = [];
      const p = tk.player;
      const aim = tk.angleToPlayer();
      [0, 2.15, -2.15].forEach((off, i) => {
        const a = aim + off;
        const x = tk.clampX(p.x + Math.cos(a) * 124, 60), y = tk.clampY(p.y + Math.sin(a) * 124, 60);
        const thrown = time + i * 180;
        const landAt = thrown + 620;
        const blowAt = landAt + tk.warn(1500 + i * 520);
        const pt: Petard = { x, y, from: { x: tk.bossX, y: tk.bossY }, thrown, landAt, blowAt, done: false };
        ps.push(pt);
        tk.schedule(blowAt - time, () => {
          pt.done = true;
          tk.explode(pt.x, pt.y, BLAST, 24, P.flame);
          tk.sfx('explosion-medium');
          const shards = tk.hard ? 8 : 6;
          const rot = Math.random() * Math.PI;
          for (let k = 0; k < shards; k++) {
            const sa = rot + (k / shards) * Math.PI * 2;
            tk.spawnBullet({ x: pt.x, y: pt.y, angle: sa, speed: 225, damage: 8, r: 4, lifeMs: 2400, color: P.ironLit });
          }
        });
      });
      tk.sfx('grenade-throw');
    },
    drawGround(g, time) {
      for (const pt of ps) {
        if (pt.done || time < pt.landAt) continue;
        const k = 1 - (pt.blowAt - time) / (pt.blowAt - pt.landAt);
        g.fillStyle(P.flame, 0.05 + k * 0.12); g.fillCircle(pt.x, pt.y, BLAST);
        g.lineStyle(2, P.flame, 0.4 + k * 0.4); g.strokeCircle(pt.x, pt.y, BLAST);
        // The petard: an oak board with a brass bell bolted to it, mouth down.
        g.fillStyle(P.oakDark, 1); g.fillRect(pt.x - 14, pt.y - 4, 28, 9);
        g.fillStyle(P.oak, 1); g.fillRect(pt.x - 13, pt.y - 5, 26, 7);
        g.fillStyle(dim(P.brass, 0.3), 1); g.fillEllipse(pt.x, pt.y - 8, 20, 18);
        g.fillStyle(P.brass, 1); g.fillEllipse(pt.x, pt.y - 10, 16, 15);
        g.fillStyle(lit(P.brass, 0.5), 1); g.fillCircle(pt.x - 3, pt.y - 13, 2.5);
        // Countdown arc.
        g.lineStyle(3, SPARK, 0.85);
        g.beginPath(); g.arc(pt.x, pt.y - 8, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k), false); g.strokePath();
      }
    },
    drawAir(g, time) {
      for (const pt of ps) {
        if (pt.done) continue;
        if (time < pt.landAt && time >= pt.thrown) {
          const k = (time - pt.thrown) / (pt.landAt - pt.thrown);
          const x = pt.from.x + (pt.x - pt.from.x) * k;
          const y = pt.from.y + (pt.y - pt.from.y) * k - Math.sin(k * Math.PI) * 90;
          g.fillStyle(P.brass, 1); g.fillEllipse(x, y, 14, 13);
          g.fillStyle(P.oak, 1); g.fillRect(x - 9, y + 4, 18, 4);
        } else if (time >= pt.landAt) {
          drawSpark(g, pt.x + 2, pt.y - 22, time, 0.9);
        }
      }
    },
    onPhaseEnd() { ps = []; },
  };
};

// ── Signature: The Magazine (hard) ───────────────────────────────────
// Six stacks of kegs stand round the room, each with a fuse run back to Fuse's feet. He lights them
// all; the sparks crawl at different speeds, and the stacks go up in an order painted over them
// in chalk numerals. Read the numbers, not the sparks.

interface Stack { x: number; y: number; order: number; blowAt: number; done: boolean; ox: number; oy: number; lit: number }

const magazine = (tk: BossToolkit): SignatureMove => {
  let stacks: Stack[] = [];
  const BLAST = 128;
  return {
    durationMs: 4200,
    windupMs: 1000,
    tell: 'THE MAGAZINE',
    hold: 'brace',
    cast(time: number) {
      tk.sfx('sizzle');
      stacks = [];
      const cx = tk.W / 2, cy = FIELD_TOP + (tk.H - FIELD_TOP) * 0.52;
      const order = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = tk.clampX(cx + Math.cos(a) * tk.W * 0.36, 70);
        const y = tk.clampY(cy + Math.sin(a) * (tk.H - FIELD_TOP) * 0.36, 70);
        const blowAt = time + tk.warn(1700 + order[i] * 480);
        const st: Stack = { x, y, order: order[i] + 1, blowAt, done: false, ox: tk.bossX, oy: tk.bossY, lit: time };
        stacks.push(st);
        tk.schedule(blowAt - time, () => {
          st.done = true;
          tk.explode(st.x, st.y, BLAST, 24, P.flame);
          tk.spawnPool({ x: st.x, y: st.y, radius: 62, lifeMs: 2600, damage: 6 });
          tk.sfx('explosion-large');
        });
      }
    },
    drawGround(g, time) {
      for (const s of stacks) {
        if (s.done) continue;
        const k = Math.min(1, (time - s.lit) / (s.blowAt - s.lit));
        // Fuse cord from his feet to the stack, the burnt part grey.
        const sx = s.ox + (s.x - s.ox) * k, sy = s.oy + (s.y - s.oy) * k;
        g.lineStyle(2, 0x5a5048, 0.5); g.lineBetween(s.ox, s.oy, sx, sy);
        g.lineStyle(2.5, POWDER_DARK, 0.9); g.lineBetween(sx, sy, s.x, s.y);
        g.fillStyle(P.flame, 0.04 + k * 0.12); g.fillCircle(s.x, s.y, BLAST);
        g.lineStyle(2, P.flame, 0.3 + k * 0.5); g.strokeCircle(s.x, s.y, BLAST);
        // A pyramid of three kegs.
        drawKeg(g, s.x - 11, s.y, 9, 0, 0);
        drawKeg(g, s.x + 11, s.y, 9, 0, 0.6);
        drawKeg(g, s.x, s.y - 12, 9, 0, 1.2);
      }
    },
    drawAir(g, time) {
      for (const s of stacks) {
        if (s.done) continue;
        const k = Math.min(1, (time - s.lit) / (s.blowAt - s.lit));
        drawSpark(g, s.ox + (s.x - s.ox) * k, s.oy + (s.y - s.oy) * k, time, 0.9);
        // The chalk numeral, as a tally of pips over the stack.
        for (let i = 0; i < s.order; i++) {
          g.fillStyle(P.saltpetre, 0.9);
          g.fillRect(s.x - s.order * 4 + i * 8, s.y - 40, 5, 9);
        }
      }
    },
    onPhaseEnd() { stacks = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const FUSE_BOSS: WorldBossDef = {
  worldId: 'isle:fuse',
  name: 'Prince Fuse',
  title: 'Master of the Powder Court',
  color: POWDER,
  colorLit: POWDER_LIT,
  colorDark: POWDER_DARK,
  accent: SPARK,
  damageMult: 0.9,

  intro: [
    'Stand still. I am ranging you.',
    'Father gave me the guns because nobody else could be trusted not to love them. I love them anyway.',
  ],
  banter: [
    'Bracket, then fire for effect. You are the effect.',
    'Every household keeps a match lit for the King. I simply collect them all at once.',
    'Hear that? That is a twelve-pounder clearing its throat.',
    'You duck like a recruit. I could teach you. I will not.',
    'Smoke is just applause you can breathe.',
    'Father says I am wasteful with powder. Father has never heard a proper salvo.',
  ],
  defeatLine: 'THE GUNS FALL SILENT',

  phases: [
    {
      name: 'The Battery',
      line: 'Guns, by battery — commence!',
      hp: 330,
      cycle: ['sig:creeping', 'volley', 'sig:mortar', 'lanes', 'sig:grapeshot', 'barrage', 'sig:mortar', 'radial'],
      harass: ['h-snipe', 'h-flak', 'h-rune'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Last Stand',
      line: 'Spike the guns? Then I will carry the powder myself!',
      hp: 400,
      cycle: ['sig:trail', 'charge', 'sig:petard', 'slamchain', 'sig:grapeshot', 'sig:trail', 'stream', 'sig:petard', 'minefield'],
      harass: ['h-mines', 'h-lane', 'h-flak'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE MAGAZINE IS OPEN',
    extraPhase: {
      name: 'The Magazine',
      line: 'Every keg on the isle is under this floor. Shall we see how many I can light?',
      hp: 300,
      cycle: ['sig:magazine', 'quake', 'sig:creeping', 'sig:petard', 'sanctuary', 'sig:magazine', 'sig:trail', 'sig:mortar', 'homing'],
      harass: ['h-mines', 'h-orbs', 'h-snipe', 'h-lane'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  tuning: {
    barrage: { radius: 54 },
    lanes: { halfW: 30 },
  },

  signatures: { creeping, mortar, grapeshot, trail, petard, magazine },

  look: { crest: 'none', pattern: 'plates', aura: 'smoke', hands: 'gauntlet', torsoR: 34, eyes: 2, eyeColor: SPARK, mouth: 'grin' },

  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'rush', gimmick: 'none', tint: 'blood', look: { aura: 'sparks', pattern: 'cracks', mouth: 'maw' } },
    { movement: 'orbit', gimmick: 'tremor', tint: 'hot', look: { aura: 'flame', pattern: 'cracks', mouth: 'grate', eyes: 3 } },
  ],

  /**
   * The bicorne and the wick. A black gunner's hat with a brass cockade sits on the body; out of
   * its crown rises a braided slow-match whose length is his health in this phase. A bandolier of
   * cartridges crosses the body. In Last Stand the hat is gone and the wick is lit at both ends; in
   * The Magazine it has burnt down to a stub that throws sparks everywhere.
   */
  drawDecor(g, s) {
    const R = s.radius;
    // Bandolier across the chest, buckle and five cartridges.
    g.lineStyle(6, 0x3a2a1a, 1);
    g.lineBetween(s.x - R * 0.7, s.y - R * 0.55, s.x + R * 0.65, s.y + R * 0.6);
    for (let i = 0; i < 5; i++) {
      const t = 0.18 + i * 0.16;
      const x = s.x - R * 0.7 + R * 1.35 * t, y = s.y - R * 0.55 + R * 1.15 * t;
      g.fillStyle(P.brass, 1); g.fillRect(x - 2, y - 5, 4, 7);
      g.fillStyle(lit(P.brass, 0.4), 1); g.fillRect(x - 2, y - 5, 4, 2);
    }
    g.fillStyle(P.brass, 1); g.fillRect(s.x - 4, s.y - 3, 8, 7);

    const hatY = s.y - R * 0.88;
    let wickBase = { x: s.x, y: hatY - 10 };
    if (s.phaseIdx === 0) {
      // Bicorne: a wide black crescent worn athwart, with a brass cockade.
      g.fillStyle(0x0c0a09, 1);
      g.fillEllipse(s.x, hatY, R * 2.1, R * 0.5);
      g.fillTriangle(s.x - R * 1.05, hatY, s.x + R * 1.05, hatY, s.x, hatY - R * 0.62);
      g.lineStyle(2, P.brass, 0.9);
      g.lineBetween(s.x - R * 1.0, hatY + 1, s.x + R * 1.0, hatY + 1);
      g.fillStyle(P.redcoat, 1); g.fillCircle(s.x + R * 0.38, hatY - R * 0.15, 5);
      g.fillStyle(P.brass, 1); g.fillCircle(s.x + R * 0.38, hatY - R * 0.15, 2.4);
      wickBase = { x: s.x, y: hatY - R * 0.6 };
    } else {
      // Hat lost: a scorched scalp and the wick sprouting straight out of the crown.
      g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y - R * 0.8, R * 0.9, R * 0.35);
      wickBase = { x: s.x, y: s.y - R * 0.95 };
    }
    // The wick: braided slow-match, length = health left in the phase.
    const len = s.phaseIdx >= 2 ? 6 + s.hpRatio * 14 : 10 + s.hpRatio * 44;
    let px = wickBase.x, py = wickBase.y;
    const segs = 8;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const nx = wickBase.x + Math.sin(t * 3.2 + s.t / 400) * 7 * t;
      const ny = wickBase.y - len * t;
      g.lineStyle(4, 0x4a3a28, 1); g.lineBetween(px, py, nx, ny);
      g.lineStyle(1.5, 0x8a7350, 1); g.lineBetween(px - 1, py, nx - 1, ny);
      px = nx; py = ny;
    }
    drawSpark(g, px, py, s.t, s.phaseIdx >= 2 ? 1.6 : s.enraged ? 1.25 : 1);
    if (s.phaseIdx === 1) {
      // Lit at both ends in his Last Stand: a second spark crawling along the bandolier.
      const k = (s.t % 2400) / 2400;
      drawSpark(g, s.x - R * 0.7 + R * 1.35 * k, s.y - R * 0.55 + R * 1.15 * k, s.t, 0.7);
    }
    if (s.phaseIdx >= 2) {
      // Sparks thrown off in every direction.
      for (let i = 0; i < 8; i++) {
        const ph = ((s.t + i * 131) % 600) / 600;
        const a = i * 0.785 + s.t / 900;
        g.fillStyle(i % 2 ? SPARK : P.sparkHot, 1 - ph);
        g.fillCircle(px + Math.cos(a) * ph * 40, py + Math.sin(a) * ph * 30 + ph * ph * 30, 1.8);
      }
    }
    // Linstock smoke off the gauntlets while he is laying a gun.
    if (s.castGlow > 0.3) {
      for (const h of s.hands) drawPuff(g, h.x, h.y - 12 - (s.t % 700) / 30, 6, P.smoke, 0.35 * s.castGlow, Math.floor(h.x));
    }
  },

  /**
   * The gun deck inside the magazine-keep: tarred planks, iron traverse rails where the guns
   * swing, spilled powder, sandbagged walls, and the powder-trail brand on the deck — the
   * King's sigil poured in blackpowder, which Fuse keeps meaning to light.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xf05e);
    g.fillStyle(0x2a1d14, 1); g.fillRect(0, 0, W, H);
    // Planks running across the deck.
    for (let y = FIELD_TOP - 20; y < H; y += 26) {
      let x = -((y * 7) % 140);
      while (x < W) {
        const len = 120 + rng() * 140;
        g.fillStyle(rng() < 0.5 ? 0x3d2a1c : 0x45301f, 1); g.fillRect(x + 1, y + 1, len - 2, 24);
        g.fillStyle(0x5a3f28, 0.4); g.fillRect(x + 1, y + 1, len - 2, 2);
        g.fillStyle(0x15100b, 1); g.fillCircle(x + 6, y + 13, 1.4); g.fillCircle(x + len - 7, y + 13, 1.4);
        x += len;
      }
    }
    // Traverse rails: iron arcs where the guns pivot.
    for (const [cx, cy] of [[W * 0.22, H * 0.36], [W * 0.78, H * 0.36], [W * 0.22, H * 0.84], [W * 0.78, H * 0.84]]) {
      g.lineStyle(5, 0x1a1a1c, 0.8);
      g.beginPath(); g.arc(cx, cy, 70, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      g.lineStyle(2, 0x6c707a, 0.5);
      g.beginPath(); g.arc(cx, cy, 70, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      g.fillStyle(0x1a1a1c, 0.8); g.fillCircle(cx, cy, 8);
    }
    // Powder spills and scorch blooms.
    for (let i = 0; i < 26; i++) {
      const x = rng() * W, y = FIELD_TOP + rng() * (H - FIELD_TOP);
      g.fillStyle(0x0a0806, 0.25 + rng() * 0.3);
      g.fillEllipse(x, y, 20 + rng() * 60, 8 + rng() * 20);
    }
    // The brand, poured in powder.
    const cx = W / 2, cy = FIELD_TOP + (H - FIELD_TOP) * 0.52;
    g.fillStyle(0x000000, 0.25); g.fillCircle(cx, cy, 120);
    brandSigil(g, cx, cy, 84, 0x120e0b, 0.85);
    brandSigil(g, cx, cy - 2, 84, 0x3a322b, 0.25);
    // Sandbagged walls round the edge.
    for (let x = 10; x < W; x += 34) {
      for (const y of [FIELD_TOP + 4, H - 10]) {
        g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x, y + 2, 34, 15);
        g.fillStyle(dim(P.sandbag, 0.1), 1); g.fillEllipse(x, y, 31, 12);
      }
    }
    for (let y = FIELD_TOP + 20; y < H; y += 30) {
      for (const x of [8, W - 8]) {
        g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x, y + 2, 16, 30);
        g.fillStyle(dim(P.sandbag, 0.1), 1); g.fillEllipse(x, y, 14, 27);
      }
    }
  },
};
