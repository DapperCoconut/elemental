import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, mulberry } from '../../../../art/IsleArt';
import { conscript, crater, drawBall, horse, lotToken, numberGlyph, palisade, summitWall, warBanner } from './art';
import {
  BANNERET, BANNERET_DARK, BANNERET_GILT, BANNERET_LIT, BRASS, GILT, GILT_DARK, GILT_LIT, INK, INK_LIT, IRON_LIT, IVORY,
  MARBLE, MUD, RED, RED_LIT, SAND, SAND_DARK, SAND_LIT, TIMBER_DARK,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Banneret, the Never-Drawn — the Croupier-King's youngest favourite, governor of the War
 * Court and marshal of every draftee on Lotterhaven.
 *
 * His Lot is No. 1, and No. 1 has never come out of the drum. He knows why. He has ridden at the
 * front of every muster since he was fourteen to prove he would have gone anyway — and the lads
 * who ride beside him are drawn for it, every time, and do not always come back. He fights like a
 * cavalry officer who has read every manual and never once lost a man of his own:
 *
 * • **Charge** (rushing): the banner goes up and he charges straight across the yard with riders
 *   in the lanes either side of him; and he draws for the front — flings a scatter of numbered Lots
 *   at your feet and calls numbers, and the called ones blow.
 * • **Muster** (anchored at his post, the blood tint): ranks of drafted pikemen march across the
 *   yard in lines, each with one gap; the guns put down a creeping barrage that walks the yard
 *   column by column.
 * • **Last Stand** (hard, stalking, the gold tint): he plants his own war banner. Inside its ring he
 *   cannot be shoved, hits a third harder and shrugs off blows, and it pulses rallying rings — so
 *   tear it down, and he staggers.
 */

const TOP = 96;

/** Until when the Prince's own charge is carrying his body — the Last Stand does not hold him then. */
let chargingUntil = 0;

// ── Signature: Charge ────────────────────────────────────────────────
// The banner goes up; he charges across the yard toward your row. Riders gallop down the lanes
// parallel to his, one lane spacing apart, so the safe ground is the strips between them.

interface RiderLane { sx: number; sy: number; ux: number; uy: number; len: number; goAt: number; travel: number; warnAt: number; hit: boolean; cloth: number }

const cavalry = (tk: BossToolkit): SignatureMove => {
  let lanes: RiderLane[] = [];
  const SP = 150;
  const HALF = 30;
  return {
    durationMs: 2600,
    windupMs: 800,
    gesture: 'point',
    tell: 'CHARGE!',
    cast(time) {
      const p = tk.player;
      const fromX = tk.bossX, fromY = tk.bossY;
      const toX = fromX < tk.W / 2 ? tk.W - 90 : 90;
      const toY = clamp(p.y, Math.max(TOP + 90, fromY - 220), Math.min(tk.H - 90, fromY + 220));
      const warn = tk.warn(1150), travel = 760;
      tk.spawnCharge({ toX, toY, warnMs: 1150, travelMs: travel, halfW: 36, damage: 20 });
      chargingUntil = time + warn + travel + 150;
      const dx = toX - fromX, dy = toY - fromY;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const offs = tk.hard ? [-2, -1, 1, 2] : [-1, 1];
      lanes = offs.map((k, i) => ({
        sx: fromX + nx * k * SP - ux * 220, sy: fromY + ny * k * SP - uy * 220, ux, uy, len: len + 440,
        warnAt: time, goAt: time + warn + Math.abs(k) * 90, travel: travel * 1.25, hit: false, cloth: i % 2 ? RED : INK,
      }));
      tk.sfx('train-horn');
    },
    update(time) {
      const p = tk.player;
      for (const l of lanes) {
        if (l.hit || time < l.goAt || time > l.goAt + l.travel) continue;
        const k = (time - l.goAt) / l.travel;
        const rx = l.sx + l.ux * l.len * k, ry = l.sy + l.uy * l.len * k;
        if (p.active && p.hp > 0 && Math.hypot(p.x - rx, p.y - ry) < 50 && segDist(p.x, p.y, l.sx, l.sy, l.sx + l.ux * l.len, l.sy + l.uy * l.len) < HALF + 12) {
          l.hit = true;
          tk.hitPlayer(15, p.x, p.y);
          tk.slowPlayer(0.6, 600);
          tk.sfx('hit-heavy');
        }
      }
      lanes = lanes.filter((l) => time < l.goAt + l.travel + 200);
    },
    drawGround(g, time) {
      for (const l of lanes) {
        if (time > l.goAt + l.travel) continue;
        const k = clamp((time - l.warnAt) / Math.max(1, l.goAt - l.warnAt), 0, 1);
        const ex = l.sx + l.ux * l.len, ey = l.sy + l.uy * l.len;
        g.lineStyle(HALF * 2, l.cloth === RED ? RED : INK_LIT, time < l.goAt ? 0.1 + k * 0.18 : 0.12);
        g.lineBetween(l.sx, l.sy, ex, ey);
        // Hoofprint chevrons streaming the way the riders will come.
        for (let d = 0; d < l.len; d += 70) {
          const o = ((time / 5) % 70);
          const cx = l.sx + l.ux * (d + o), cy = l.sy + l.uy * (d + o);
          g.lineStyle(2, IVORY, 0.15 + k * 0.3);
          g.lineBetween(cx - l.ux * 10 - l.uy * 10, cy - l.uy * 10 + l.ux * 10, cx, cy);
          g.lineBetween(cx - l.ux * 10 + l.uy * 10, cy - l.uy * 10 - l.ux * 10, cx, cy);
        }
      }
    },
    drawAir(g, time) {
      for (const l of lanes) {
        if (time < l.goAt || time > l.goAt + l.travel) continue;
        const k = (time - l.goAt) / l.travel;
        const rx = l.sx + l.ux * l.len * k, ry = l.sy + l.uy * l.len * k;
        horse(g, rx, ry + 18, 0.75, l.ux >= 0 ? 1 : -1, time / 60 + l.sx, l.cloth);
      }
    },
    onPhaseEnd() { lanes = []; },
  };
};

// ── Signature: Draw for the Front ────────────────────────────────────
// He flings a fistful of numbered Lots round you — 1s, 2s and 3s. Then he draws: a number goes
// up over his head, and every Lot with that number blows. Then another. Read the stamps.

interface Lot { fromX: number; fromY: number; x: number; y: number; n: number; landAt: number; blowAt: number; blown: boolean }

const drawForFront = (tk: BossToolkit): SignatureMove => {
  let lots: Lot[] = [];
  let calls: { n: number; at: number }[] = [];
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'raise',
    tell: 'DRAW FOR THE FRONT',
    cast(time) {
      const p = tk.player;
      const nums = [1, 1, 1, 2, 2, 2, 3, 3, 3];
      for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
      lots = [];
      for (const n of nums) {
        for (let tries = 0; tries < 14; tries++) {
          const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 210;
          const x = tk.clampX(p.x + Math.cos(a) * d, 60), y = tk.clampY(p.y + Math.sin(a) * d * 0.8, 50);
          if (lots.some((l) => dist(l.x, l.y, x, y) < 78) && tries < 13) continue;
          lots.push({ fromX: tk.bossX, fromY: tk.bossY - 30, x, y, n, landAt: time + 420 + lots.length * 45, blowAt: -1, blown: false });
          break;
        }
      }
      const first = 1 + Math.floor(Math.random() * 3);
      let second = 1 + Math.floor(Math.random() * 3);
      if (second === first) second = (second % 3) + 1;
      const gap = tk.hard ? 1150 : 1450;
      calls = [{ n: first, at: time + 1250 }, { n: second, at: time + 1250 + gap }];
      tk.sfx('dice');
    },
    update(time) {
      for (const c of calls) {
        if (c.at < 0 || time < c.at) continue;
        for (const l of lots) if (l.n === c.n && l.blowAt < 0) l.blowAt = time + tk.warn(950);
        tk.sfx('countdown-tick');
        c.at = -1;
      }
      for (const l of lots) {
        if (l.blown || l.blowAt < 0 || time < l.blowAt) continue;
        l.blown = true;
        tk.explode(l.x, l.y, 72, 15, RED);
        tk.sfx('explosion-small');
      }
      if (lots.length && calls.every((c) => c.at < 0) && lots.every((l) => l.blown || l.blowAt < 0) && time > (lots[0]?.landAt ?? 0) + 4500) lots = [];
    },
    drawGround(g, time) {
      for (const l of lots) {
        if (time < l.landAt || l.blown) continue;
        const live = l.blowAt >= 0;
        if (live) {
          const k = clamp(1 - (l.blowAt - time) / tk.warn(950), 0, 1);
          g.fillStyle(RED, 0.12 + k * 0.25); g.fillCircle(l.x, l.y, 72);
          g.lineStyle(2, RED_LIT, 0.5 + k * 0.5); g.strokeCircle(l.x, l.y, 72 * (1 - k * 0.15));
          g.beginPath(); g.arc(l.x, l.y, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else {
          g.lineStyle(1, GILT, 0.3); g.strokeCircle(l.x, l.y, 72);
        }
        lotToken(g, l.x, l.y, 14, l.n, false);
        numberGlyph(g, l.x, l.y, 13, l.n, live ? RED : INK);
      }
    },
    drawAir(g, time) {
      for (const l of lots) {
        if (time >= l.landAt) continue;
        const k = clamp(1 - (l.landAt - time) / 420, 0, 1);
        const x = l.fromX + (l.x - l.fromX) * k, y = l.fromY + (l.y - l.fromY) * k - Math.sin(k * Math.PI) * 90;
        lotToken(g, x, y, 7, l.n);
      }
      // The number he has drawn, held up over his head.
      const live = calls.length ? lots.filter((l) => l.blowAt >= 0 && !l.blown) : [];
      if (live.length) {
        const n = live[live.length - 1].n;
        const bx = tk.bossX, by = tk.bossY - 92 + Math.sin(time / 120) * 3;
        glow(g, bx, by, 26, GILT_LIT, 0.08, 3);
        drawBall(g, bx, by, 15, n, RED);
      }
    },
    onPhaseEnd() { lots = []; calls = []; },
  };
};

// ── Signature: Muster ────────────────────────────────────────────────
// Lots are drawn and ranks of pikemen march across the yard toward you, each rank one line of
// levelled pikes with a single gap in it, marked by two gilt flags. Walk through the gaps.

interface Rank { y0: number; dir: 1 | -1; gap: number; goAt: number; lastHit: number }

const muster = (tk: BossToolkit): SignatureMove => {
  let ranks: Rank[] = [];
  const SPEED = 108, GAP = 62, SPACING = 175;
  const rankY = (r: Rank, time: number) => r.y0 + r.dir * SPEED * Math.max(0, time - r.goAt) / 1000;
  return {
    durationMs: 2800,
    windupMs: 900,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'MUSTER!',
    cast(time) {
      const p = tk.player;
      const dir: 1 | -1 = p.y > (TOP + tk.H) / 2 ? 1 : -1;
      const n = tk.hard ? 4 : 3;
      const start = dir > 0 ? TOP + 10 : tk.H - 10;
      let gap = clamp(p.x + (Math.random() - 0.5) * 260, 110, tk.W - 110);
      ranks = [];
      for (let i = 0; i < n; i++) {
        ranks.push({ y0: start - dir * i * SPACING, dir, gap, goAt: time + tk.warn(1000), lastHit: -9999 });
        gap = clamp(gap + (Math.random() < 0.5 ? -1 : 1) * (130 + Math.random() * 110), 110, tk.W - 110);
      }
      tk.sfx('drum-hit');
    },
    update(time) {
      const p = tk.player;
      for (const r of ranks) {
        const y = rankY(r, time);
        if (time < r.goAt || time - r.lastHit < 800) continue;
        if (!(p.active && p.hp > 0)) continue;
        if (Math.abs(p.y - y) < 26 && Math.abs(p.x - r.gap) > GAP - 14) {
          r.lastHit = time;
          tk.hitPlayer(14, p.x, p.y);
          tk.pull(p.x, p.y + r.dir * 200, 120, 260);
          tk.sfx('stab');
        }
      }
      ranks = ranks.filter((r) => { const y = rankY(r, time); return r.dir > 0 ? y < tk.H + 60 : y > TOP - 60; });
    },
    drawGround(g, time) {
      for (const r of ranks) {
        const y = rankY(r, time);
        if (time < r.goAt) {
          // The gap's corridor, called ahead of the march.
          const k = clamp(1 - (r.goAt - time) / tk.warn(1000), 0, 1);
          g.fillStyle(GILT, 0.05 + k * 0.08); g.fillRect(r.gap - GAP, TOP, GAP * 2, tk.H - TOP);
        }
        if (y < TOP - 40 || y > tk.H + 40) continue;
        g.fillStyle(0x000000, 0.18); g.fillRect(0, y - 6, r.gap - GAP, 12); g.fillRect(r.gap + GAP, y - 6, tk.W - r.gap - GAP, 12);
      }
    },
    drawAir(g, time) {
      for (const r of ranks) {
        const y = rankY(r, time);
        if (y < TOP - 10 || y > tk.H + 50) continue;
        const step = time < r.goAt ? 0 : time / 110;
        for (let x = 22; x < tk.W; x += 40) {
          if (Math.abs(x - r.gap) < GAP) continue;
          conscript(g, x, y + 14, 0.62, r.dir > 0 ? 1 : -1, step + x * 0.1, (x / 40) % 2 ? BANNERET : dim(BANNERET, 0.25), 0.7, 0);
        }
        // Gilt flags either side of the gap.
        for (const k of [-1, 1]) {
          const fx = r.gap + k * GAP;
          g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(fx, y + 14, fx, y - 40);
          g.fillStyle(GILT, 1); g.fillTriangle(fx, y - 40, fx, y - 28, fx - k * 16, y - 34);
        }
      }
    },
    onPhaseEnd() { ranks = []; },
  };
};

// ── Signature: Creeping Barrage ──────────────────────────────────────
// He drops his sabre and the guns open: a column of shell bursts lands across the yard from his
// side, then the next column a pace further on, walking toward you. Each column has one gap.

interface Shell { x: number; y: number; landAt: number; scorchUntil: number }

const barrage = (tk: BossToolkit): SignatureMove => {
  let shells: Shell[] = [];
  return {
    durationMs: 2200,
    windupMs: 650,
    gesture: 'slam',
    tell: 'CREEPING BARRAGE',
    cast(time) {
      const p = tk.player;
      const dir = p.x >= tk.bossX ? 1 : -1;
      const startX = clamp(tk.bossX + dir * 90, 60, tk.W - 60);
      const rows: number[] = [];
      for (let y = TOP + 56; y < tk.H - 30; y += 100) rows.push(y);
      let gap = rows.reduce((bi, y, i) => (Math.abs(y - p.y) < Math.abs(rows[bi] - p.y) ? i : bi), 0);
      gap = clamp(gap + (Math.random() < 0.5 ? -1 : 1), 0, rows.length - 1);
      const steps = Math.ceil((dir > 0 ? tk.W - startX : startX) / 110) + 1;
      const warn = 900;
      shells = [];
      for (let s = 0; s < steps; s++) {
        const x = startX + dir * s * 110;
        if (x < 30 || x > tk.W - 30) break;
        if (s > 0 && s % 2 === 0) gap = clamp(gap + (Math.random() < 0.5 ? -1 : 1), 0, rows.length - 1);
        const g0 = gap;
        tk.schedule(s * 440, () => {
          const now = tk.now;
          rows.forEach((y, i) => {
            if (i === g0) return;
            tk.spawnZone({ x, y, radius: 48, warnMs: warn, damage: 14 });
            shells.push({ x, y, landAt: now + tk.warn(warn), scorchUntil: now + tk.warn(warn) + 3200 });
          });
          tk.sfx('mortar-launch');
        });
      }
      void time;
    },
    update(time) { shells = shells.filter((s) => time < s.scorchUntil); },
    drawGround(g, time) {
      for (const s of shells) {
        if (time < s.landAt) continue;
        const fade = clamp((s.scorchUntil - time) / 800, 0, 1);
        crater(g, s.x, s.y + 4, 20 * (0.4 + fade * 0.6), fade);
      }
    },
    drawAir(g, time) {
      for (const s of shells) {
        const k = 1 - (s.landAt - time) / 420;
        if (k < 0 || k > 1) continue;
        // The shell's last fall: a dark streak with a whistle-trail.
        const y = s.y - 260 * (1 - k);
        g.lineStyle(3, 0xffffff, 0.25 * k); g.lineBetween(s.x + 30 * (1 - k), y - 50, s.x, y);
        g.fillStyle(INK, 1); g.fillEllipse(s.x, y, 7, 12);
      }
    },
    onPhaseEnd() { shells = []; },
  };
};

// ── Signature: Last Stand ────────────────────────────────────────────
// He plants his war banner at his feet. Inside its ring he cannot be shoved, hits a third harder,
// takes a good deal less, and the banner pulses rallying rings. Strike the banner itself until it
// tears: then he staggers, open, for a few seconds.

const lastStand = (tk: BossToolkit): SignatureMove => {
  const R = 150;
  const MAX = 85;
  let banner: { x: number; y: number; hp: number; t: StrikeTarget; at: number; hurtAt: number } | null = null;
  let base = -1;
  let staggerUntil = 0;
  let nextPulse = 0;
  let lastX = 0, lastY = 0;
  const inRing = () => !!banner && dist(tk.bossX, tk.bossY, banner.x, banner.y) < R;
  const restore = () => { if (base > 0) tk.damageScale = base; };
  function tear(): void {
    if (!banner) return;
    tk.boom(banner.x, banner.y - 60, 80, GILT);
    banner.t.remove();
    banner = null;
    restore();
    staggerUntil = tk.now + 3500;
    tk.sfx('crystal-shatter');
    tk.host.showFloatingText(tk.bossX, tk.bossY - 70, 'THE BANNER IS TORN', '#f4d67e');
  }
  return {
    durationMs: 1400,
    windupMs: 800,
    gesture: 'slam',
    tell: 'LAST STAND',
    cast(time) {
      if (base < 0) base = tk.damageScale;
      const x = tk.clampX(tk.bossX, 90), y = tk.clampY(tk.bossY + 10, 90);
      if (banner) { banner.t.moveTo(x, y - 60); banner.x = x; banner.y = y; banner.hp = MAX; banner.at = time; }
      else {
        const b = {
          x, y, hp: MAX, at: time, hurtAt: -9999,
          t: tk.spawnTarget({
            x, y: y - 60, r: 26,
            onStruck: (by, amount) => {
              if (by !== 'player' || !banner) return;
              banner.hp -= Math.max(3, amount);
              banner.hurtAt = tk.now;
              if (banner.hp <= 0) tear();
            },
          }),
        };
        banner = b;
      }
      nextPulse = time + 900;
      lastX = tk.bossX; lastY = tk.bossY;
      tk.sfx('hammer-forge');
      tk.boom(x, y, R, GILT);
    },
    update(time) {
      if (!banner) { lastX = tk.bossX; lastY = tk.bossY; return; }
      const held = inRing();
      tk.damageScale = held ? base * 1.3 : base;
      // Not to be shoved: a jolt bigger than a stride, inside the ring, is undone.
      const moved = Math.hypot(tk.bossX - lastX, tk.bossY - lastY);
      if (held && moved > 12 && time > chargingUntil) tk.host.setBossPos(lastX, lastY);
      else { lastX = tk.bossX; lastY = tk.bossY; }
      if (time >= nextPulse) {
        nextPulse = time + (tk.hard ? 2400 : 2800);
        const a = tk.angleToPlayer(banner.x, banner.y) + (Math.random() - 0.5) * 1.6;
        tk.spawnRing({ cx: banner.x, cy: banner.y, delayMs: 550, speed: 240, gapCentre: a, gapHalf: 0.55, band: 16, damage: 11, startRadius: 30 });
        tk.sfx('sonic-pulse');
      }
    },
    takenMult() {
      if (banner && inRing()) return 0.6;
      return tk.now < staggerUntil ? 1.3 : 1;
    },
    drawGround(g, time) {
      if (!banner) return;
      const held = inRing();
      g.fillStyle(BANNERET, held ? 0.12 + Math.sin(time / 240) * 0.04 : 0.06); g.fillCircle(banner.x, banner.y, R);
      g.lineStyle(3, GILT, 0.7); g.strokeCircle(banner.x, banner.y, R);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        g.fillStyle(TIMBER_DARK, 1); g.fillCircle(banner.x + Math.cos(a) * R, banner.y + Math.sin(a) * R, 3.5);
        g.fillStyle(GILT, 1); g.fillCircle(banner.x + Math.cos(a) * R, banner.y + Math.sin(a) * R - 2, 1.6);
      }
    },
    drawAir(g, time) {
      if (!banner) {
        if (time < staggerUntil) {
          g.lineStyle(2, GILT_LIT, 0.4 + Math.sin(time / 80) * 0.3);
          g.strokeCircle(tk.bossX, tk.bossY - 60, 14);
        }
        return;
      }
      const k = banner.hp / MAX;
      const shake = time - banner.hurtAt < 180 ? Math.sin(time / 12) * 3 : 0;
      glow(g, banner.x, banner.y - 150, 50, GILT_LIT, 0.05, 3);
      warBanner(g, banner.x + shake, banner.y, 200, BANNERET, 'lot', time / 200, 1 - k);
      g.fillStyle(0x000000, 0.55); g.fillRect(banner.x - 30, banner.y + 10, 60, 6);
      g.fillStyle(GILT, 1); g.fillRect(banner.x - 30, banner.y + 10, 60 * clamp(k, 0, 1), 6);
    },
    onPhaseEnd() {
      if (banner) { banner.t.remove(); banner = null; }
      restore();
      staggerUntil = 0;
    },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const BANNERET_BOSS: WorldBossDef = {
  worldId: 'isle:banneret',
  name: 'Prince Banneret',
  title: 'the Never-Drawn',
  color: BANNERET,
  colorLit: BANNERET_LIT,
  colorDark: BANNERET_DARK,
  accent: BANNERET_GILT,
  // Tier 4 of the eighth isle.
  damageMult: 1.5,

  intro: [
    'Lot Number One. Look at it. Brass, like yours would be. It has gone into the drum every Sunday of my life.',
    'It has never come out. So I ride at the front. If chance will not send me, I will send myself. Mount up.',
  ],
  banter: [
    'Every lad beside me was drawn fair. Fairly drawn, fairly ridden, fairly buried.',
    'Father says the Wheel loves me. I have asked it, many times, to love me less.',
    'Ranks! Close up! Close UP, I said — the gaps are where the stranger lives.',
    'I have never lost a charge. I have lost a great many riders. The ledger only counts the charges.',
    'You want to be drawn? Stand still. I will draw you.',
  ],
  defeatLine: 'NUMBER ONE IS CALLED',
  resumeLine: 'You came back up the slope. Good. A soldier who comes back up the slope is worth ten in the drum.',

  phases: [
    {
      name: 'Charge',
      line: 'Banner up! Riders on my flanks! Lances — LEVEL!',
      hp: 590,
      cycle: [
        'sig:charge', 'volley', 'sig:lots', 'lanes', 'sig:charge',
        'sweep', 'sig:lots', 'homing', 'sig:charge', 'radial',
      ],
      harass: ['h-lane', 'h-snipe'],
      restMs: 1100,
      harassMs: 3000,
    },
    {
      name: 'Muster',
      line: 'Draw the lots. All of them. Every number on the hill — fall in!',
      hp: 690,
      cycle: [
        'sig:muster', 'sig:barrage', 'summon', 'sig:lots', 'radial',
        'sig:muster', 'barrage', 'sig:barrage', 'minefield', 'sig:charge',
      ],
      harass: ['h-flak', 'h-mines'],
      restMs: 1000,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE BANNER DOES NOT FALL',
    extraPhase: {
      name: 'Last Stand',
      line: 'Here. HERE. I plant it here, and here I stand, and nobody is drawn to stand beside me. Just me.',
      hp: 510,
      cycle: [
        'sig:laststand', 'sig:charge', 'sig:barrage', 'sig:muster', 'spiral',
        'sig:laststand', 'sig:lots', 'sweep', 'sig:barrage',
      ],
      harass: ['h-rune', 'h-orbs'],
      restMs: 900,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, speed: 230, spreadRad: 0.55 },
    radial: { count: 16, speed: 190 },
    lanes: { halfW: 26 },
    summon: { count: 3 },
  },

  signatures: {
    charge: cavalry,
    lots: drawForFront,
    muster,
    barrage,
    laststand: lastStand,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'dust', hands: 'gauntlet',
    torsoR: 36, mouth: 'line', eyes: 2, eyeColor: 0xffd890,
  },
  phaseStyles: [
    { movement: 'rush', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'blood', look: { aura: 'smoke', hands: 'ball' } },
    { movement: 'stalk', gimmick: 'none', tint: 'gold', look: { aura: 'sparks', mouth: 'grate', hands: 'gauntlet' } },
  ],

  /**
   * The Never-Drawn's tells. A tall black shako with a brass plate stamped "1" and a scarlet-and-
   * white plume; gilt epaulettes with heavy fringes; a black sash; Lot No. 1 on a chain at his
   * throat; a cavalry moustache. In Charge he holds a curved sabre aloft; in Muster a marshal's
   * baton capped with a numbered ball, and a brass drum of lots on his hip; in the Last Stand his
   * plume is shot away, his shako dented, and the broken pole of a banner is in his fist.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const stand = s.hard && s.phaseIdx >= 2;
    const mustering = s.phaseIdx === 1;
    // Sash across the breast.
    g.lineStyle(R * 0.22, INK, 1); g.lineBetween(s.x - R * 0.7, s.y - R * 0.45, s.x + R * 0.6, s.y + R * 0.7);
    g.lineStyle(R * 0.06, RED, 1); g.lineBetween(s.x - R * 0.7, s.y - R * 0.45, s.x + R * 0.6, s.y + R * 0.7);
    // Epaulettes.
    for (const k of [-1, 1]) {
      const ex = s.x + k * R * 0.82, ey = s.y - R * 0.5;
      g.fillStyle(GILT_DARK, 1); g.fillEllipse(ex, ey + 1, R * 0.5, R * 0.24);
      g.fillStyle(GILT, 1); g.fillEllipse(ex, ey, R * 0.46, R * 0.2);
      for (let i = 0; i < 6; i++) {
        const fx = ex - R * 0.2 + i * R * 0.08;
        g.lineStyle(1.5, GILT_LIT, 1); g.lineBetween(fx, ey + R * 0.08, fx + Math.sin(s.t / 200 + i) * 1.5, ey + R * 0.3);
      }
    }
    // Lot No. 1 on its chain.
    g.lineStyle(1, BRASS, 1); g.lineBetween(s.x - R * 0.25, s.y - R * 0.55, s.x, s.y - R * 0.2); g.lineBetween(s.x + R * 0.25, s.y - R * 0.55, s.x, s.y - R * 0.2);
    lotToken(g, s.x, s.y - R * 0.12, R * 0.2, 1);
    // Moustache.
    g.fillStyle(0x2a1a12, 1);
    g.fillEllipse(s.x - R * 0.14, s.y + R * 0.18, R * 0.3, R * 0.09);
    g.fillEllipse(s.x + R * 0.14, s.y + R * 0.18, R * 0.3, R * 0.09);
    // Shako: tall black cylinder, gilt band, brass plate with his number, plume.
    const sy = s.y - R * 0.82;
    const lean = stand ? 0.12 : 0;
    g.fillStyle(INK, 1);
    g.fillPoints([
      { x: s.x - R * 0.52, y: sy }, { x: s.x + R * 0.52, y: sy },
      { x: s.x + R * 0.44 + lean * R, y: sy - R * 0.95 }, { x: s.x - R * 0.44 + lean * R, y: sy - R * 0.95 - (stand ? R * 0.12 : 0) },
    ], true);
    g.fillStyle(INK_LIT, 1); g.fillRect(s.x - R * 0.56, sy - R * 0.08, R * 1.12, R * 0.12);
    g.fillStyle(GILT, 1); g.fillRect(s.x - R * 0.46 + lean * R, sy - R * 0.92, R * 0.9, R * 0.1);
    g.fillStyle(BRASS, 1); g.fillTriangle(s.x - R * 0.28, sy - R * 0.72, s.x + R * 0.28, sy - R * 0.72, s.x, sy - R * 0.2);
    numberGlyph(g, s.x, sy - R * 0.52, R * 0.24, 1, INK);
    // Chin chain.
    g.lineStyle(1.2, BRASS, 1); g.beginPath(); g.arc(s.x, s.y - R * 0.3, R * 0.6, 0.3, Math.PI - 0.3, false); g.strokePath();
    if (!stand) {
      // Plume: scarlet over white, nodding.
      const px = s.x + lean * R, py = sy - R * 0.95;
      const nod = Math.sin(s.t / 260) * 3;
      g.fillStyle(IVORY, 1); g.fillEllipse(px + nod * 0.5, py - R * 0.22, R * 0.24, R * 0.44);
      g.fillStyle(RED, 1); g.fillEllipse(px + nod, py - R * 0.5, R * 0.22, R * 0.5);
      g.fillStyle(RED_LIT, 0.6); g.fillEllipse(px + nod - 2, py - R * 0.58, R * 0.08, R * 0.3);
    } else {
      // Shot away: a stump of white quill and a dent.
      g.lineStyle(2, IVORY, 1); g.lineBetween(s.x + R * 0.1, sy - R * 1.05, s.x + R * 0.16, sy - R * 1.22);
      g.lineStyle(1.5, INK_LIT, 1); g.lineBetween(s.x - R * 0.3, sy - R * 0.6, s.x - R * 0.1, sy - R * 0.42);
    }
    // What is in his fist.
    const hand = s.hands[1];
    if (hand) {
      if (stand) {
        // The broken banner pole, a rag of scarlet still on it.
        g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(hand.x, hand.y + 10, hand.x + 4, hand.y - 58);
        g.fillStyle(BANNERET, 1); g.fillTriangle(hand.x + 4, hand.y - 56, hand.x + 30, hand.y - 50 + Math.sin(s.t / 160) * 3, hand.x + 4, hand.y - 36);
        g.fillStyle(GILT, 1); g.fillCircle(hand.x + 4, hand.y - 58, 3);
      } else if (mustering) {
        // Marshal's baton, capped with a numbered ball; a drum of lots on the hip.
        g.lineStyle(4, INK, 1); g.lineBetween(hand.x, hand.y + 6, hand.x + 6, hand.y - 28);
        g.fillStyle(GILT, 1); g.fillCircle(hand.x, hand.y + 6, 3);
        drawBall(g, hand.x + 7, hand.y - 32 - s.castGlow * 4, 7, 1, RED);
        g.fillStyle(BRASS, 1); g.fillRect(s.x + R * 0.55, s.y + R * 0.45, R * 0.4, R * 0.3);
        g.lineStyle(1, GILT_LIT, 1); for (let i = 0; i < 4; i++) g.lineBetween(s.x + R * 0.55 + i * R * 0.1, s.y + R * 0.45, s.x + R * 0.6 + i * R * 0.1, s.y + R * 0.75);
      } else {
        // The sabre, raised.
        const a = -Math.PI / 2 - 0.35 + Math.sin(s.t / 300) * 0.08 - s.castGlow * 0.4;
        const L = R * 1.6;
        g.fillStyle(GILT, 1); g.fillCircle(hand.x, hand.y, 5);
        g.lineStyle(2, GILT_LIT, 1); g.beginPath(); g.arc(hand.x, hand.y, 8, a + 1.2, a + 3.4, false); g.strokePath();
        g.lineStyle(4, IRON_LIT, 1);
        g.beginPath(); g.moveTo(hand.x, hand.y);
        for (let i = 1; i <= 6; i++) { const k = i / 6; g.lineTo(hand.x + Math.cos(a) * L * k + Math.cos(a + Math.PI / 2) * k * k * 10, hand.y + Math.sin(a) * L * k + Math.sin(a + Math.PI / 2) * k * k * 10); }
        g.strokePath();
        g.lineStyle(1.5, 0xffffff, 0.7); g.lineBetween(hand.x + Math.cos(a) * L * 0.2, hand.y + Math.sin(a) * L * 0.2, hand.x + Math.cos(a) * L * 0.7, hand.y + Math.sin(a) * L * 0.7);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, BANNERET_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The summit parade ground, under the House's wall: raked sand ruled in rank lines, a great
   * muster circle painted in the middle with forty numbered stations round its rim (the No. 1
   * station at the top, unpainted — nobody has ever stood on it), the House's marble wall and a
   * glimpse of its door under the HUD, flagpoles down both sides and the hoof-churned mud of the
   * cavalry lanes along the edges.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xba22e7);
    g.fillStyle(SAND, 1); g.fillRect(0, 0, W, H);
    for (let y = 100; y < H; y += 5) { g.lineStyle(1, SAND_DARK, 0.2 + ((y / 5) % 3 === 0 ? 0.1 : 0)); g.lineBetween(0, y, W, y); }
    for (let i = 0; i < 400; i++) { g.fillStyle(rng() < 0.5 ? SAND_DARK : SAND_LIT, 0.4); g.fillCircle(rng() * W, 100 + rng() * (H - 100), 1); }
    // Hoof-churned edges.
    for (const y0 of [110, H - 60]) {
      g.fillStyle(MUD, 0.7); g.fillRect(0, y0, W, 50);
      for (let i = 0; i < 70; i++) { g.fillStyle(0x3c2e20, 0.5); g.fillEllipse(rng() * W, y0 + rng() * 50, 7, 5); }
    }
    // The House's wall at the top.
    g.fillStyle(0x1c1a20, 1); g.fillRect(0, 0, W, 104);
    summitWall(g, 0, W, 104, 84);
    g.fillStyle(0x000000, 0.25); g.fillRect(W / 2 - 70, 30, 140, 74);
    g.fillStyle(INK, 1); g.fillRect(W / 2 - 60, 36, 120, 68);
    g.fillStyle(GILT, 1); g.fillRect(W / 2 - 64, 30, 128, 6);
    for (let i = 0; i < 8; i++) { g.fillStyle(GILT, 1); g.fillCircle(W / 2 - 45 + (i % 4) * 30, 54 + Math.floor(i / 4) * 26, 3); }
    // Rank lines.
    for (let k = 0; k < 5; k++) { g.lineStyle(2, IVORY, 0.4); g.lineBetween(60, 180 + k * 90, W - 60, 180 + k * 90); }
    // The muster circle.
    const cx = W / 2, cy = (H + 120) / 2, r = 190;
    g.lineStyle(26, MARBLE, 0.25); g.strokeCircle(cx, cy, r);
    for (let i = 0; i < 40; i++) {
      const a = -Math.PI / 2 + (i / 40) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82;
      g.fillStyle(i === 0 ? GILT : i % 2 ? RED : INK, i === 0 ? 0.55 : 0.6); g.fillRect(x - 9, y - 7, 18, 14);
      if (i === 0) { g.lineStyle(2, GILT_LIT, 0.8); g.strokeRect(x - 11, y - 9, 22, 18); }
      else numberGlyph(g, x, y, 7, i + 1, IVORY, 0.8);
    }
    g.lineStyle(2, GILT, 0.5); g.strokeEllipse(cx, cy, r * 1.6, r * 1.3);
    g.lineStyle(2, GILT, 0.3); g.strokeEllipse(cx, cy, r * 2.3, r * 1.95);
    // A swallowtail standard painted in the middle.
    g.fillStyle(BANNERET, 0.35); g.fillRect(cx - 60, cy - 30, 90, 60);
    g.fillTriangle(cx + 30, cy - 30, cx + 70, cy - 30, cx + 30, cy);
    g.fillTriangle(cx + 30, cy, cx + 70, cy + 30, cx + 30, cy + 30);
    lotToken(g, cx - 18, cy, 18, 1);
    // Flagpoles down both sides, a palisade stub behind each.
    for (let y = 200; y < H - 60; y += 130) {
      warBanner(g, 26, y, 80, RED, 'heart', y);
      warBanner(g, W - 54, y + 60, 80, INK, 'spade', y);
    }
    palisade(g, 0, 60, H - 4, 40, rng);
    palisade(g, W - 60, W, H - 4, 40, rng);
    // A dropped Lot or two in the sand.
    for (let i = 0; i < 10; i++) lotToken(g, 80 + rng() * (W - 160), 160 + rng() * (H - 240), 3, 0);
  },
};
