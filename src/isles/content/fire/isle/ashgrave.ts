import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import type Phaser from 'phaser';
import { brandSigil } from '../../../art/IsleArt';

/**
 * King Ashgrave, the Brand-King — Brandmark's monarch and the isle's finale.
 *
 * He has sat on the iron throne at the top of the Kiln since the first of his children fell,
 * and the fight is the story of him getting up. Four phases on normal, five on hard:
 *
 *   I   The Tithe     — seated, anchored to the throne. Ember tithes roll in to feed him
 *                       (stamp them out), hearths are counted and lit, branded vassals kneel up.
 *   II  The Brand     — he steps down with the great branding iron: a 250px sweep that sears
 *                       its arc, and the leaping Brand of Ownership whose hollow is the only
 *                       safe ground inside it.
 *   III The Kiln      — the throne room itself heats. A heat gauge climbs over your head; only
 *                       the open cooling vent brings it down, and the vents move. Slag pours
 *                       from the crucibles in the ceiling; firebricks fall and shatter.
 *   IV  The Ash Crown — he burns himself to ash. The crown's tines become spears that cross
 *                       through you, he leaves ash effigies that collapse in rings, and he calls
 *                       one last tithe.
 *   V   The Last Ember (hard) — a guttering coal in the dark, heartbeat rings, and embers you
 *                       must snuff before they fly home and rekindle him.
 *
 * Every signature is bespoke and none of them look like the Archfiend's.
 */

// ── Palette ──────────────────────────────────────────────────────────

const BRAND = 0xd8481a;
const BRAND_LIT = 0xffb347;
const BRAND_DARK = 0x3a0e06;
const GOLD = 0xffc65a;
const CRIMSON = 0x7a0e0a;
const ASH = 0x9a908a;
const ASH_DARK = 0x4a4440;
const WHITE_HOT = 0xfff0c8;
const COOL = 0x9ad8ff;

/** The throne the King sits on in phase I — painted into the arena, his anchor post sits on it. */
const THRONE = { x: 480, y: 214 };
/** The three cooling vents of the throne room (phase III). Painted into the floor from the start. */
const VENTS = [{ x: 190, y: 430 }, { x: 480, y: 566 }, { x: 770, y: 430 }];
const FIELD_TOP = 96;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void =>
  tk.host.showFloatingText(x, y, text, color);

// ── I. Ember Tithe ───────────────────────────────────────────────────
// Glowing tithe-coins roll in from the rim of the hall toward the throne. Each one that
// reaches the King feeds him; walk over one to stamp it out. You cannot catch them all —
// choose the ones nearest him.

const tithe = (tk: BossToolkit): SignatureMove => {
  interface Ember { x: number; y: number; born: number; done: boolean }
  let embers: Ember[] = [];
  const SPEED = 60;
  const SNUFF_R = 30;
  const REACH_R = 44;
  return {
    durationMs: 2600,
    windupMs: 1000,
    gesture: 'raise',
    tell: 'EMBER TITHE',
    cast(time) {
      tk.sfx('money');
      const n = tk.hard ? 7 : 6;
      const cx = tk.W / 2, cy = tk.H * 0.55;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.04 + (0.92 * i) / (n - 1));
        embers.push({
          x: clampN(cx + Math.cos(a) * tk.W * 0.45, 50, tk.W - 50),
          y: clampN(cy + Math.sin(a) * tk.H * 0.4, FIELD_TOP + 30, tk.H - 40),
          born: time + i * 140, done: false,
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const e of embers) {
        if (e.done || time < e.born) continue;
        const dx = tk.bossX - e.x, dy = tk.bossY - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < REACH_R) {
          e.done = true;
          tk.boom(e.x, e.y, 34, BRAND_LIT);
          tk.sfx('jackpot');
          tk.healBoss(9);
          continue;
        }
        e.x += (dx / d) * SPEED * dt;
        e.y += (dy / d) * SPEED * dt;
        if (p.active && dist(p.x, p.y, e.x, e.y) < SNUFF_R) {
          e.done = true;
          tk.boom(e.x, e.y, 24, ASH_DARK);
          tk.sfx('hush');
          float(tk, e.x, e.y - 20, 'SNUFFED', '#d8d0c8');
        }
      }
      embers = embers.filter((e) => !e.done);
    },
    drawGround(g, time) {
      for (const e of embers) {
        const a = time < e.born ? 0.15 : 0.35;
        // The road it rolls: a dotted line of soot to the King's feet.
        const d = dist(e.x, e.y, tk.bossX, tk.bossY);
        const n = Math.floor(d / 18);
        for (let k = 1; k < n; k++) {
          const t = k / n;
          g.fillStyle(BRAND, a * (1 - t * 0.6));
          g.fillCircle(e.x + (tk.bossX - e.x) * t, e.y + (tk.bossY - e.y) * t, 1.8);
        }
        g.fillStyle(BRAND, 0.14); g.fillCircle(e.x, e.y, 26);
      }
    },
    drawAir(g, time) {
      for (const e of embers) {
        if (time < e.born) continue;
        const spin = Math.abs(Math.cos(time / 160 + e.born));
        const pulse = 1 + Math.sin(time / 110 + e.born) * 0.12;
        g.fillStyle(BRAND_DARK, 1); g.fillEllipse(e.x, e.y, (16 * spin + 4) * pulse, 18 * pulse);
        g.fillStyle(BRAND_LIT, 1); g.fillEllipse(e.x, e.y, (13 * spin + 3) * pulse, 15 * pulse);
        if (spin > 0.45) brandSigil(g, e.x, e.y, 4.5 * spin, BRAND_DARK, 0.9);
      }
    },
    onPhaseEnd() { embers = []; },
  };
};

// ── I. Hearth Count ──────────────────────────────────────────────────
// The King counts his hearths. Four iron braziers kindle round the hall one by one and
// each lobs a slow fireball at you on its own clock. Kick one over — walk into it — and it
// goes cold. The faster you put them out, the quieter the room.

const hearthCount = (tk: BossToolkit): SignatureMove => {
  interface Hearth { x: number; y: number; litAt: number; dieAt: number; nextShot: number; cold: boolean; coldAt: number }
  let hearths: Hearth[] = [];
  const SPOTS = [[0.18, 0.4], [0.82, 0.4], [0.24, 0.84], [0.76, 0.84]];
  return {
    durationMs: 1900,
    windupMs: 900,
    gesture: 'point',
    tell: 'THE HEARTH COUNT',
    cast(time) {
      tk.sfx('flame-burst');
      hearths = SPOTS.map(([fx, fy], i) => {
        const litAt = time + tk.warn(700) + i * 380;
        return { x: tk.W * fx, y: tk.H * fy, litAt, dieAt: litAt + 7000, nextShot: litAt + 600, cold: false, coldAt: 0 };
      });
    },
    update(time) {
      const p = tk.player;
      for (const h of hearths) {
        if (h.cold || time < h.litAt) continue;
        if (time > h.dieAt) { h.cold = true; h.coldAt = time; continue; }
        if (p.active && dist(p.x, p.y, h.x, h.y) < 34) {
          h.cold = true;
          h.coldAt = time;
          tk.sfx('hush');
          float(tk, h.x, h.y - 30, 'COLD HEARTH', '#c8c0b8');
          continue;
        }
        if (time >= h.nextShot) {
          h.nextShot = time + 1450;
          const a = Math.atan2(p.y - h.y, p.x - h.x);
          tk.spawnBullet({ x: h.x + Math.cos(a) * 16, y: h.y - 14 + Math.sin(a) * 16, angle: a, speed: 160, damage: 10, r: 7, color: BRAND_LIT });
          tk.sfx('fireball');
        }
      }
      hearths = hearths.filter((h) => !h.cold || time - h.coldAt < 1200);
    },
    drawGround(g, time) {
      for (const h of hearths) {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(h.x, h.y + 10, 46, 14);
        if (time < h.litAt) {
          const k = clampN(1 - (h.litAt - time) / 1200, 0, 1);
          g.lineStyle(2, BRAND_LIT, 0.3 + k * 0.5);
          g.strokeCircle(h.x, h.y, 34);
        }
        // Three iron legs and a bowl.
        g.lineStyle(3, 0x1a1414, 1);
        g.lineBetween(h.x - 12, h.y + 8, h.x - 6, h.y - 8); g.lineBetween(h.x + 12, h.y + 8, h.x + 6, h.y - 8);
        g.fillStyle(0x1a1414, 1); g.fillEllipse(h.x, h.y - 10, 36, 14);
        g.fillStyle(h.cold ? 0x3a3432 : 0x7a2a12, 1); g.fillEllipse(h.x, h.y - 12, 28, 8);
      }
    },
    drawAir(g, time) {
      for (const h of hearths) {
        if (h.cold) {
          const k = (time - h.coldAt) / 1200;
          for (let i = 0; i < 4; i++) {
            g.fillStyle(0x8a8480, (1 - k) * 0.4);
            g.fillCircle(h.x + Math.sin(i * 2 + time / 200) * 8, h.y - 20 - k * 40 - i * 8, 6 + k * 8);
          }
          continue;
        }
        if (time < h.litAt) continue;
        const charge = 1 - Math.max(0, h.nextShot - time) / 1450;
        for (let i = 0; i < 4; i++) {
          const ph = (time / 500 + i / 4) % 1;
          g.fillStyle(i % 2 ? BRAND_LIT : BRAND, (1 - ph) * 0.9);
          g.fillCircle(h.x + Math.sin(time / 90 + i) * 5, h.y - 16 - ph * 24, (1 - ph) * 8 + 2 + charge * 2);
        }
        if (charge > 0.75) { g.lineStyle(2, WHITE_HOT, (charge - 0.75) * 3); g.strokeCircle(h.x, h.y - 18, 14); }
      }
    },
    onPhaseEnd() { hearths = []; },
  };
};

// ── I. Call the Vassals ──────────────────────────────────────────────
// Three brand sigils burn into the floor around you; each flares and a branded vassal kneels
// up out of it. Don't be standing on a sigil when it opens.

const vassals = (tk: BossToolkit): SignatureMove => {
  let sigils: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 2200,
    windupMs: 950,
    hold: 'conduct',
    tell: 'KNEEL, VASSALS',
    cast(time) {
      tk.sfx('curse-cast');
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3;
        const r = 170 + Math.random() * 50;
        const x = clampN(p.x + Math.cos(a) * r, 80, tk.W - 80);
        const y = clampN(p.y + Math.sin(a) * r, FIELD_TOP + 60, tk.H - 70);
        const warn = tk.warn(1300);
        sigils.push({ x, y, at: time + warn });
        tk.spawnZone({ x, y, radius: 46, warnMs: 1300, damage: 12 });
        tk.schedule(warn, () => {
          tk.spawnAdd({ x, y, hp: 28, speed: 72, damage: 8, ranged: i === 2, maxAlive: 5 });
        });
      }
    },
    drawGround(g, time) {
      for (const s of sigils) {
        const k = clampN(1 - (s.at - time) / 1300, 0, 1);
        brandSigil(g, s.x, s.y, 14 + k * 18, BRAND, 0.3 + k * 0.6);
      }
      sigils = sigils.filter((s) => time < s.at + 400);
    },
    onPhaseEnd() { sigils = []; },
  };
};

// ── II. The Great Iron ───────────────────────────────────────────────
// He swings the great branding iron round himself through two-thirds of a circle. The shaft
// burns anything it passes; the sigil at its head brands the floor along the arc. Get behind
// him, or get out past the head.

const greatIron = (tk: BossToolkit): SignatureMove => {
  const LEN = 250;
  const TRAVEL = 1300;
  let ox = 0, oy = 0, a0 = 0, a1 = 0, warnFrom = 0, start = 0;
  return {
    durationMs: 2700,
    windupMs: 1000,
    gesture: 'sweep',
    locksBody: true,
    tell: 'THE GREAT IRON',
    cast(time) {
      tk.sfx('whoosh');
      ox = tk.bossX; oy = tk.bossY;
      const aim = tk.angleToPlayer();
      const dir = Math.random() < 0.5 ? 1 : -1;
      a0 = aim - dir * 2.2;
      a1 = aim + dir * 2.2;
      const warn = tk.warn(900);
      warnFrom = time;
      start = time + warn;
      tk.spawnSweep({ ox, oy, a0, a1, warnMs: 900, travelMs: TRAVEL, halfW: 18, damage: 20, length: LEN });
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const a = a0 + (a1 - a0) * t;
        tk.schedule(warn + TRAVEL * t, () => {
          tk.spawnPool({ x: ox + Math.cos(a) * LEN * 0.88, y: oy + Math.sin(a) * LEN * 0.88, radius: 30, lifeMs: 3800, damage: 6 });
          if (k % 2 === 0) tk.sfx('sizzle');
        });
      }
    },
    drawGround(g, time) {
      if (time < warnFrom || time > start + TRAVEL) return;
      if (time < start) {
        // The arc it will cover, and an arrow for which way it swings.
        const k = (time - warnFrom) / Math.max(1, start - warnFrom);
        const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
        g.fillStyle(BRAND, 0.06 + k * 0.12);
        g.slice(ox, oy, LEN, lo, hi, false); g.fillPath();
        g.lineStyle(2, BRAND_LIT, 0.4 + k * 0.4);
        g.beginPath(); g.arc(ox, oy, LEN, lo, hi, false); g.strokePath();
        const am = a0 + (a1 - a0) * 0.15;
        const ad = Math.sign(a1 - a0);
        const ax = ox + Math.cos(am) * LEN * 0.7, ay = oy + Math.sin(am) * LEN * 0.7;
        g.fillStyle(WHITE_HOT, 0.4 + k * 0.4);
        g.fillTriangle(
          ax + Math.cos(am + ad * Math.PI / 2) * 14, ay + Math.sin(am + ad * Math.PI / 2) * 14,
          ax + Math.cos(am) * 8, ay + Math.sin(am) * 8,
          ax - Math.cos(am) * 8, ay - Math.sin(am) * 8,
        );
      }
    },
    drawAir(g, time) {
      if (time < start || time > start + TRAVEL) return;
      const t = (time - start) / TRAVEL;
      const a = a0 + (a1 - a0) * t;
      const hx = ox + Math.cos(a) * LEN, hy = oy + Math.sin(a) * LEN;
      // Motion blur of the shaft.
      for (let k = 1; k <= 4; k++) {
        const ab = a - (a1 - a0) * 0.025 * k;
        g.lineStyle(10, BRAND, 0.12);
        g.lineBetween(ox, oy, ox + Math.cos(ab) * LEN, oy + Math.sin(ab) * LEN);
      }
      g.lineStyle(9, 0x1a1210, 1); g.lineBetween(ox, oy, hx, hy);
      g.lineStyle(3, 0x5a4a42, 1); g.lineBetween(ox, oy, hx, hy);
      g.fillStyle(BRAND_LIT, 0.25); g.fillCircle(hx, hy, 30);
      brandSigil(g, hx, hy, 18, WHITE_HOT, 1);
    },
  };
};

// ── II. Brand of Ownership ───────────────────────────────────────────
// He leaps and lands on you, twice, and his landing burns his sigil into the floor: a broken
// ring around a flame. The ring and the flame burn; the hollow between them does not, and
// neither does the gap at the ring's top. Stand in the hollow, or be outside.

const brandStamp = (tk: BossToolkit): SignatureMove => {
  const RING_R = 92;
  const RING_HIT = 24;
  const CORE_HIT = 40;
  const GAP_C = -Math.PI / 2;
  const GAP_HALF = 0.47;
  const LEAP_MS = 520;
  const BURN_MS = 4600;
  interface Stamp { x: number; y: number; fromX: number; fromY: number; born: number; landAt: number; dealt: boolean; lastTick: number }
  let stamps: Stamp[] = [];

  const onBrand = (s: Stamp, px: number, py: number): boolean => {
    const d = dist(px, py, s.x, s.y);
    if (d < CORE_HIT) return true;
    if (Math.abs(d - RING_R) >= RING_HIT) return false;
    return Math.abs(wrap(Math.atan2(py - s.y, px - s.x) - GAP_C)) > GAP_HALF;
  };

  const plan = (time: number) => {
    const p = tk.player;
    stamps.push({
      x: clampN(p.x, 120, tk.W - 120), y: clampN(p.y, FIELD_TOP + 110, tk.H - 104),
      fromX: tk.bossX, fromY: tk.bossY, born: time, landAt: time + tk.warn(1400), dealt: false, lastTick: 0,
    });
  };

  return {
    durationMs: 4600,
    windupMs: 900,
    gesture: 'slam',
    locksBody: true,
    tell: 'BRAND OF OWNERSHIP',
    cast(time) {
      tk.sfx('beam-charge');
      plan(time);
      tk.schedule(2100, () => plan(tk.now));
    },
    update(time) {
      const p = tk.player;
      for (const s of stamps) {
        if (!s.dealt && time >= s.landAt - LEAP_MS && time < s.landAt) {
          // The leap: an arc from where he stood to the mark.
          const k = (time - (s.landAt - LEAP_MS)) / LEAP_MS;
          if (k < 0.05) { s.fromX = tk.bossX; s.fromY = tk.bossY; }
          tk.host.setBossPos(s.fromX + (s.x - s.fromX) * k, s.fromY + (s.y - s.fromY) * k - Math.sin(k * Math.PI) * 70);
        }
        if (!s.dealt && time >= s.landAt) {
          s.dealt = true;
          tk.host.setBossPos(s.x, s.y);
          tk.scene.cameras.main.shake(240, 0.007);
          tk.sfx('hammer-forge');
          tk.boom(s.x, s.y, RING_R + 20, BRAND);
          if (p.active && onBrand(s, p.x, p.y)) tk.hitPlayer(20, p.x, p.y);
          s.lastTick = time;
          continue;
        }
        if (s.dealt && time - s.lastTick > 500 && time < s.landAt + BURN_MS && p.active && onBrand(s, p.x, p.y)) {
          s.lastTick = time;
          tk.hitPlayer(7, p.x, p.y);
        }
      }
      stamps = stamps.filter((s) => time < s.landAt + BURN_MS);
    },
    drawGround(g, time) {
      for (const s of stamps) {
        if (!s.dealt) {
          const k = clampN((time - s.born) / Math.max(1, s.landAt - s.born), 0, 1);
          // The hollow, darkened so it reads as the safe floor.
          g.fillStyle(0x000000, 0.18 + k * 0.12); g.fillCircle(s.x, s.y, RING_R - RING_HIT);
          g.lineStyle(RING_HIT * 2, BRAND, 0.1 + k * 0.22);
          g.beginPath(); g.arc(s.x, s.y, RING_R, GAP_C + GAP_HALF, GAP_C - GAP_HALF + Math.PI * 2, false); g.strokePath();
          g.fillStyle(BRAND, 0.15 + k * 0.3); g.fillCircle(s.x, s.y, CORE_HIT);
          g.lineStyle(2, BRAND_LIT, 0.5 + k * 0.5);
          g.beginPath(); g.arc(s.x, s.y, RING_R + RING_HIT, GAP_C + GAP_HALF, GAP_C - GAP_HALF + Math.PI * 2, false); g.strokePath();
          g.beginPath(); g.arc(s.x, s.y, RING_R - RING_HIT, GAP_C + GAP_HALF, GAP_C - GAP_HALF + Math.PI * 2, false); g.strokePath();
          g.strokeCircle(s.x, s.y, CORE_HIT);
          // His shadow, growing as he comes down.
          g.fillStyle(0x000000, 0.2 + k * 0.3); g.fillEllipse(s.x, s.y + 8, 50 * k + 10, 18 * k + 4);
          if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(4, WHITE_HOT, 0.6); g.strokeCircle(s.x, s.y, RING_R + RING_HIT + 4); }
          continue;
        }
        const left = (s.landAt + BURN_MS - time) / BURN_MS;
        const fl = 0.75 + Math.sin(time / 70 + s.x) * 0.25;
        g.lineStyle(RING_HIT * 1.6, BRAND, 0.45 * left * fl);
        g.beginPath(); g.arc(s.x, s.y, RING_R, GAP_C + GAP_HALF, GAP_C - GAP_HALF + Math.PI * 2, false); g.strokePath();
        g.lineStyle(4, BRAND_LIT, 0.8 * left);
        g.beginPath(); g.arc(s.x, s.y, RING_R, GAP_C + GAP_HALF, GAP_C - GAP_HALF + Math.PI * 2, false); g.strokePath();
        brandSigil(g, s.x, s.y + 4, CORE_HIT * 0.95, BRAND_LIT, 0.5 * left * fl);
        // Tongues of flame licking up off the ring.
        for (let i = 0; i < 10; i++) {
          const a = GAP_C + GAP_HALF + ((Math.PI * 2 - GAP_HALF * 2) * (i + 0.5)) / 10;
          const lick = 8 + Math.sin(time / 90 + i * 1.7) * 6;
          g.lineStyle(2, GOLD, 0.7 * left);
          g.lineBetween(s.x + Math.cos(a) * RING_R, s.y + Math.sin(a) * RING_R, s.x + Math.cos(a) * RING_R, s.y + Math.sin(a) * RING_R - lick);
        }
      }
    },
    onPhaseEnd() { stamps = []; },
  };
};

// ── III. Stoke the Kiln ──────────────────────────────────────────────
// The throne room becomes the furnace. A heat gauge climbs over your head; at the top it
// sears you and drops back. One of three cooling vents in the floor is open at a time and
// standing in it pulls the heat down fast — but the vents rotate, sputtering a warning
// first. Every time he stokes again, the heat jumps and the vent moves at once.

const kilnHeat = (tk: BossToolkit): SignatureMove => {
  const VENT_R = 62;
  const SWAP_MS = 5200;
  const WARN_MS = 1400;
  let active = false;
  let heat = 0;
  let vent = 0;
  let nextVent = 1;
  let swapAt = 0;
  let stokedAt = 0;

  const pickNext = (from: number) => (from + 1 + Math.floor(Math.random() * 2)) % VENTS.length;

  return {
    durationMs: 1400,
    windupMs: 950,
    gesture: 'raise',
    tell: 'STOKE THE KILN',
    cast(time) {
      tk.sfx('inferno');
      stokedAt = time;
      tk.scene.cameras.main.flash(180, 255, 140, 60);
      if (!active) {
        active = true;
        heat = 15;
        // The first open vent is the one furthest from you — go.
        const p = tk.player;
        vent = VENTS.reduce((bi, v, i) => (dist(v.x, v.y, p.x, p.y) > dist(VENTS[bi].x, VENTS[bi].y, p.x, p.y) ? i : bi), 0);
        float(tk, tk.W / 2, FIELD_TOP + 40, 'THE KILN HEATS', '#ffb347');
      } else {
        heat = Math.min(92, heat + 20);
        vent = nextVent;
        float(tk, tk.W / 2, FIELD_TOP + 40, 'STOKED!', '#ffb347');
      }
      nextVent = pickNext(vent);
      swapAt = time + SWAP_MS;
    },
    update(time, dt) {
      if (!active) return;
      if (time >= swapAt) {
        vent = nextVent;
        nextVent = pickNext(vent);
        swapAt = time + SWAP_MS;
        tk.sfx('geyser');
      }
      const p = tk.player;
      if (!p.active) return;
      const v = VENTS[vent];
      const cooling = dist(p.x, p.y, v.x, v.y) < VENT_R;
      heat = clampN(heat + (cooling ? -50 : tk.hard ? 13 : 10.5) * dt, 0, 100);
      if (heat >= 100) {
        heat = 55;
        tk.hitPlayer(16, p.x, p.y);
        tk.sfx('status-burn');
        float(tk, p.x, p.y - 56, 'OVERHEATED', '#ff7a2f');
      }
    },
    drawGround(g, time) {
      if (!active) return;
      // The room glows hotter with the gauge: a vignette of furnace light.
      const k = heat / 100;
      g.fillStyle(BRAND, 0.05 + k * 0.12);
      g.fillRect(0, FIELD_TOP, tk.W, 26); g.fillRect(0, tk.H - 26, tk.W, 26);
      g.fillRect(0, FIELD_TOP, 26, tk.H - FIELD_TOP); g.fillRect(tk.W - 26, FIELD_TOP, 26, tk.H - FIELD_TOP);
      VENTS.forEach((v, i) => {
        if (i === vent) {
          const pulse = 1 + Math.sin(time / 160) * 0.05;
          g.fillStyle(COOL, 0.18); g.fillCircle(v.x, v.y, VENT_R * pulse);
          g.lineStyle(3, COOL, 0.75); g.strokeCircle(v.x, v.y, VENT_R * pulse);
        } else if (i === nextVent && swapAt - time < WARN_MS) {
          const w = 1 - (swapAt - time) / WARN_MS;
          g.lineStyle(2, COOL, 0.25 + w * 0.5);
          g.strokeCircle(v.x, v.y, VENT_R * (0.4 + w * 0.6));
        }
      });
      if (time - stokedAt < 700) {
        const s = (time - stokedAt) / 700;
        g.lineStyle(6, BRAND_LIT, 0.5 * (1 - s));
        g.strokeCircle(tk.bossX, tk.bossY, 40 + s * 500);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      VENTS.forEach((v, i) => {
        // Cold air rising out of the open vent; sputters from the next one.
        const open = i === vent;
        const sputter = i === nextVent && swapAt - time < WARN_MS;
        if (!open && !sputter) return;
        const n = open ? 7 : 3;
        for (let j = 0; j < n; j++) {
          const ph = ((time / (open ? 700 : 400)) + j / n) % 1;
          g.fillStyle(0xe8f6ff, (1 - ph) * (open ? 0.35 : 0.25));
          g.fillCircle(v.x + Math.sin(j * 2.3 + time / 300) * 22, v.y - ph * 60, 6 + ph * 10);
        }
      });
      // The heat gauge over the player.
      const p = tk.player;
      const x = p.x - 24, y = p.y - 64;
      g.fillStyle(0x1a0e08, 0.85); g.fillRoundedRect(x - 2, y - 2, 52, 9, 3);
      const col = heat > 80 ? (Math.floor(time / 100) % 2 ? WHITE_HOT : BRAND) : heat > 50 ? BRAND_LIT : GOLD;
      g.fillStyle(col, 1); g.fillRoundedRect(x, y, 48 * (heat / 100), 5, 2);
    },
    onPhaseEnd() { active = false; heat = 0; },
  };
};

// ── III. Firebrick Fall ──────────────────────────────────────────────
// The kiln's lining gives way. Rectangles of shadow mark where firebricks will land, in three
// waves around you; each brick that lands shatters into two shards that skid away along its
// long side. Read the bricks' orientation — the shards go where they point.

const firebricks = (tk: BossToolkit): SignatureMove => {
  interface Brick { x: number; y: number; w: number; h: number; born: number; landAt: number; dealt: boolean }
  let bricks: Brick[] = [];
  return {
    durationMs: 2600,
    windupMs: 900,
    gesture: 'raise',
    tell: 'FIREBRICK FALL',
    cast() {
      tk.sfx('quake');
      for (let wave = 0; wave < 3; wave++) {
        tk.schedule(wave * 650, () => {
          const p = tk.player;
          const now = tk.now;
          for (let i = 0; i < 5; i++) {
            const on = i === 0;
            const flat = (i + wave) % 2 === 0;
            const x = on ? p.x : p.x + (Math.random() - 0.5) * 340;
            const y = on ? p.y : p.y + (Math.random() - 0.5) * 260;
            bricks.push({
              x: clampN(x, 50, tk.W - 50), y: clampN(y, FIELD_TOP + 30, tk.H - 40),
              w: flat ? 66 : 34, h: flat ? 34 : 66, born: now, landAt: now + tk.warn(1150), dealt: false,
            });
          }
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const b of bricks) {
        if (b.dealt || time < b.landAt) continue;
        b.dealt = true;
        tk.boom(b.x, b.y, 30, BRAND_DARK);
        tk.sfx('stone-slam');
        if (p.active && Math.abs(p.x - b.x) < b.w / 2 + 14 && Math.abs(p.y - b.y) < b.h / 2 + 14) tk.hitPlayer(16, p.x, p.y);
        const angs = b.w > b.h ? [0, Math.PI] : [Math.PI / 2, -Math.PI / 2];
        for (const a of angs) {
          tk.spawnBullet({ x: b.x + Math.cos(a) * 20, y: b.y + Math.sin(a) * 20, angle: a, speed: 205, damage: 8, r: 5, color: BRAND_LIT, lifeMs: 2200 });
        }
      }
      bricks = bricks.filter((b) => time < b.landAt + 3200);
    },
    drawGround(g, time) {
      for (const b of bricks) {
        if (!b.dealt) {
          const k = clampN((time - b.born) / Math.max(1, b.landAt - b.born), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.3);
          g.fillRect(b.x - (b.w / 2) * k, b.y - (b.h / 2) * k, b.w * k, b.h * k);
          g.lineStyle(2, BRAND_LIT, 0.4 + k * 0.5);
          g.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
          // Arrows for where the shards will skid.
          const horiz = b.w > b.h;
          g.lineStyle(2, BRAND_LIT, 0.25 + k * 0.4);
          for (const s of [-1, 1]) {
            const ex = horiz ? b.x + s * (b.w / 2 + 18) : b.x, ey = horiz ? b.y : b.y + s * (b.h / 2 + 18);
            g.lineBetween(horiz ? b.x + s * b.w / 2 : b.x, horiz ? b.y : b.y + s * b.h / 2, ex, ey);
          }
          continue;
        }
        // Rubble cooling where it fell.
        const left = 1 - (time - b.landAt) / 3200;
        g.fillStyle(0x5a2418, 0.8 * left);
        g.fillRect(b.x - b.w / 2 + 4, b.y - b.h / 2 + 6, b.w * 0.4, b.h * 0.35);
        g.fillRect(b.x + 2, b.y - 2, b.w * 0.35, b.h * 0.4);
        g.fillStyle(BRAND, 0.4 * left); g.fillRect(b.x - 6, b.y - 4, 10, 6);
      }
    },
    drawAir(g, time) {
      for (const b of bricks) {
        if (b.dealt || b.landAt - time > 480) continue;
        const k = 1 - (b.landAt - time) / 480;
        const y = b.y - (1 - k * k) * 320;
        g.fillStyle(0x3a120a, 1); g.fillRect(b.x - b.w / 2, y - b.h / 2, b.w, b.h);
        g.fillStyle(0x8a3a22, 1); g.fillRect(b.x - b.w / 2 + 2, y - b.h / 2 + 2, b.w - 4, b.h - 6);
        g.fillStyle(0xb85a32, 1); g.fillRect(b.x - b.w / 2 + 2, y - b.h / 2 + 2, b.w - 4, 3);
      }
    },
    onPhaseEnd() { bricks = []; },
  };
};

// ── III. Slag Pour ───────────────────────────────────────────────────
// Crucibles tip over the lip of the ceiling and slag runs straight down the hall in three
// streams, leaving a molten channel behind each head. The heads come at you; the channels stay.
// The streams are spaced so there is always a dry corridor between them.

const slagPour = (tk: BossToolkit): SignatureMove => {
  const HALF = 24;
  const SPEED = 165;
  interface Stream { x: number; born: number; startAt: number; headY: number; headHit: boolean; lastTick: number; dieAt: number }
  let streams: Stream[] = [];
  return {
    durationMs: 2600,
    windupMs: 950,
    gesture: 'point',
    tell: 'SLAG POUR',
    cast(time) {
      tk.sfx('oil-splash');
      const p = tk.player;
      const offs = [0, -230, 230].sort(() => Math.random() - 0.5);
      const warn = tk.warn(1000);
      offs.forEach((o, i) => {
        let x = p.x + o;
        if (x < 60) x += 460;
        if (x > tk.W - 60) x -= 460;
        x = clampN(x, 60, tk.W - 60);
        const startAt = time + warn + i * 260;
        streams.push({ x, born: time, startAt, headY: FIELD_TOP, headHit: false, lastTick: 0, dieAt: startAt + ((tk.H - FIELD_TOP) / SPEED) * 1000 + 3600 });
      });
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of streams) {
        if (time < s.startAt) continue;
        s.headY = Math.min(tk.H, s.headY + SPEED * dt);
        if (!p.active || Math.abs(p.x - s.x) > HALF + 14 || p.y < FIELD_TOP || p.y > s.headY + 10) continue;
        if (!s.headHit && Math.abs(p.y - s.headY) < 34) {
          s.headHit = true;
          s.lastTick = time;
          tk.hitPlayer(16, p.x, p.y);
          continue;
        }
        if (time - s.lastTick > 450 && time < s.dieAt - 600) {
          s.lastTick = time;
          tk.hitPlayer(8, p.x, p.y);
        }
      }
      streams = streams.filter((s) => time < s.dieAt);
    },
    drawGround(g, time) {
      for (const s of streams) {
        if (time < s.startAt) {
          const k = clampN((time - s.born) / Math.max(1, s.startAt - s.born), 0, 1);
          g.fillStyle(BRAND, 0.05 + k * 0.1); g.fillRect(s.x - HALF, FIELD_TOP, HALF * 2, tk.H - FIELD_TOP);
          g.lineStyle(2, BRAND_LIT, 0.3 + k * 0.5);
          g.lineBetween(s.x - HALF, FIELD_TOP, s.x - HALF, tk.H); g.lineBetween(s.x + HALF, FIELD_TOP, s.x + HALF, tk.H);
          continue;
        }
        const fade = clampN((s.dieAt - time) / 1200, 0, 1);
        g.fillStyle(0x2a0a04, 0.9 * fade); g.fillRect(s.x - HALF - 3, FIELD_TOP, HALF * 2 + 6, s.headY - FIELD_TOP);
        g.fillStyle(BRAND, 0.85 * fade); g.fillRect(s.x - HALF, FIELD_TOP, HALF * 2, s.headY - FIELD_TOP);
        // Crust plates drifting down the channel.
        for (let y = FIELD_TOP + ((time / 12) % 40); y < s.headY; y += 40) {
          g.fillStyle(BRAND_DARK, 0.6 * fade); g.fillEllipse(s.x + Math.sin(y) * 8, y, 20, 8);
        }
        g.fillStyle(WHITE_HOT, 0.8 * fade); g.fillEllipse(s.x, s.headY, HALF * 2 + 8, 20);
      }
    },
    drawAir(g, time) {
      for (const s of streams) {
        if (time > s.startAt + 1600) continue;
        // The crucible at the lip of the ceiling, tipping.
        const tip = clampN((time - s.born) / Math.max(1, s.startAt - s.born), 0, 1);
        const cx = s.x, cy = FIELD_TOP - 6;
        const a = tip * 0.9;
        const pts = [[-20, -18], [20, -18], [14, 12], [-14, 12]].map(([px, py]) => ({
          x: cx + px * Math.cos(a) - py * Math.sin(a), y: cy + px * Math.sin(a) + py * Math.cos(a),
        }));
        g.fillStyle(0x2a2420, 1);
        g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        g.fillTriangle(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
        g.fillStyle(BRAND_LIT, 0.9); g.fillCircle(pts[1].x, pts[1].y, 5);
      }
    },
    onPhaseEnd() { streams = []; },
  };
};

// ── IV. Crown of Ash ─────────────────────────────────────────────────
// The tines of his crown come off as ash spears and hang in a ring around you, each aimed
// through your heart. They cross through the centre and out the other side. Between any two
// spear-lines there is a wedge of clear floor — then a second ring, turned half a step, and
// your wedge is now a line.

const crownOfAsh = (tk: BossToolkit): SignatureMove => {
  const RING = 210;
  const SPEED = 640;
  const HIT_R = 24;
  interface Blade { sx: number; sy: number; ex: number; ey: number; born: number; launchAt: number; travelMs: number; hit: boolean }
  let blades: Blade[] = [];

  const volley = (time: number, rot: number) => {
    const p = tk.player;
    const cx = clampN(p.x, 70, tk.W - 70), cy = clampN(p.y, FIELD_TOP + 50, tk.H - 50);
    const skip = Math.floor(Math.random() * 6);
    const launchAt = time + tk.warn(1150);
    for (let k = 0; k < 6; k++) {
      if (k === skip) continue;
      const a = rot + (k * Math.PI) / 3;
      const sx = cx + Math.cos(a) * RING, sy = cy + Math.sin(a) * RING;
      const ex = cx - Math.cos(a) * (RING + 60), ey = cy - Math.sin(a) * (RING + 60);
      blades.push({ sx, sy, ex, ey, born: time, launchAt: launchAt + k * 40, travelMs: (dist(sx, sy, ex, ey) / SPEED) * 1000, hit: false });
    }
  };

  return {
    durationMs: 3000,
    windupMs: 950,
    gesture: 'raise',
    tell: 'CROWN OF ASH',
    cast(time) {
      tk.sfx('crystal-shatter');
      const rot = Math.random() * Math.PI;
      volley(time, rot);
      tk.schedule(1000, () => volley(tk.now, rot + Math.PI / 6));
    },
    update(time) {
      const p = tk.player;
      for (const b of blades) {
        if (b.hit || time < b.launchAt) continue;
        const k = (time - b.launchAt) / b.travelMs;
        if (k > 1) continue;
        const x = b.sx + (b.ex - b.sx) * k, y = b.sy + (b.ey - b.sy) * k;
        if (p.active && dist(p.x, p.y, x, y) < HIT_R) {
          b.hit = true;
          tk.hitPlayer(17, p.x, p.y);
          tk.sfx('stab');
        }
      }
      blades = blades.filter((b) => time < b.launchAt + b.travelMs + 100);
    },
    drawGround(g, time) {
      for (const b of blades) {
        if (time >= b.launchAt) continue;
        const k = clampN((time - b.born) / Math.max(1, b.launchAt - b.born), 0, 1);
        g.lineStyle(3, ASH, 0.2 + k * 0.45);
        g.lineBetween(b.sx, b.sy, b.ex, b.ey);
        if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(6, BRAND, 0.35); g.lineBetween(b.sx, b.sy, b.ex, b.ey); }
      }
    },
    drawAir(g, time) {
      for (const b of blades) {
        let x = b.sx, y = b.sy;
        if (time >= b.launchAt) {
          const k = (time - b.launchAt) / b.travelMs;
          if (k > 1) continue;
          x = b.sx + (b.ex - b.sx) * k; y = b.sy + (b.ey - b.sy) * k;
        } else {
          y += Math.sin(time / 120 + b.sx) * 3;
        }
        const a = Math.atan2(b.ey - b.sy, b.ex - b.sx);
        const tipX = x + Math.cos(a) * 22, tipY = y + Math.sin(a) * 22;
        const bx = x - Math.cos(a) * 16, by = y - Math.sin(a) * 16;
        const nx = -Math.sin(a) * 7, ny = Math.cos(a) * 7;
        g.fillStyle(ASH_DARK, 1); g.fillTriangle(tipX, tipY, bx + nx, by + ny, bx - nx, by - ny);
        g.fillStyle(ASH, 1); g.fillTriangle(tipX, tipY, bx + nx * 0.5, by + ny * 0.5, bx - nx * 0.5, by - ny * 0.5);
        g.fillStyle(BRAND_LIT, 0.9); g.fillCircle(bx, by, 3);
        if (time >= b.launchAt) {
          for (let i = 1; i < 4; i++) {
            g.fillStyle(ASH, 0.3 / i);
            g.fillCircle(x - Math.cos(a) * i * 14, y - Math.sin(a) * i * 14, 4);
          }
        }
      }
    },
    onPhaseEnd() { blades = []; },
  };
};

// ── IV. Cinder Effigies ──────────────────────────────────────────────
// He crumbles where he stands and reforms elsewhere, leaving three ash statues of himself.
// They collapse one by one, each throwing out a ring of cinders. Every ring's gap faces the
// King — run toward him through the gap.

const cinderEffigies = (tk: BossToolkit): SignatureMove => {
  interface Effigy { x: number; y: number; born: number; collapseAt: number; done: boolean; gap: number }
  let effigies: Effigy[] = [];
  let kx = 0, ky = 0;
  return {
    durationMs: 3900,
    windupMs: 900,
    gesture: 'recoil',
    locksBody: true,
    tell: 'CINDER EFFIGIES',
    cast(time) {
      tk.sfx('smoke');
      const spots: { x: number; y: number }[] = [{ x: tk.bossX, y: tk.bossY }];
      for (let i = 0; i < 3; i++) {
        let best = { x: tk.W / 2, y: tk.H / 2 };
        let bestScore = -Infinity;
        for (let t = 0; t < 12; t++) {
          const c = { x: 100 + Math.random() * (tk.W - 200), y: FIELD_TOP + 80 + Math.random() * (tk.H - FIELD_TOP - 160) };
          const score = Math.min(...spots.map((s) => dist(s.x, s.y, c.x, c.y)));
          if (score > bestScore) { bestScore = score; best = c; }
        }
        spots.push(best);
      }
      // The last spot is where he reforms; the other three stand as effigies.
      const home = spots.pop() as { x: number; y: number };
      kx = home.x; ky = home.y;
      tk.boom(tk.bossX, tk.bossY, 50, ASH_DARK);
      tk.host.setBossPos(kx, ky);
      tk.boom(kx, ky, 40, ASH);
      const warn = tk.warn(1100);
      effigies = spots.map((s, i) => ({
        x: s.x, y: s.y, born: time, collapseAt: time + warn + i * 950, done: false,
        gap: Math.atan2(ky - s.y, kx - s.x),
      }));
    },
    update(time) {
      for (const e of effigies) {
        if (e.done || time < e.collapseAt) continue;
        e.done = true;
        tk.sfx('quake');
        tk.boom(e.x, e.y, 46, ASH);
        tk.spawnRing({ cx: e.x, cy: e.y, delayMs: 0, speed: 300, gapCentre: e.gap, gapHalf: 0.62, band: 16, damage: 14 });
      }
      effigies = effigies.filter((e) => time < e.collapseAt + 700);
    },
    drawGround(g, time) {
      for (const e of effigies) {
        if (e.done) continue;
        const k = clampN((time - e.born) / Math.max(1, e.collapseAt - e.born), 0, 1);
        g.lineStyle(3, ASH, 0.3 + k * 0.4);
        g.beginPath(); g.arc(e.x, e.y, 48, e.gap + 0.62, e.gap - 0.62 + Math.PI * 2, false); g.strokePath();
        // The gap: a bright wedge, pointing at the King.
        g.fillStyle(WHITE_HOT, 0.12 + k * 0.2);
        g.slice(e.x, e.y, 120, e.gap - 0.62, e.gap + 0.62, false); g.fillPath();
        g.lineStyle(1.5, WHITE_HOT, 0.25 + k * 0.3);
        g.lineBetween(e.x, e.y, e.x + Math.cos(e.gap) * 150, e.y + Math.sin(e.gap) * 150);
      }
    },
    drawAir(g, time) {
      for (const e of effigies) {
        if (e.done) {
          // Collapse: the statue sloughing into a heap.
          const k = (time - e.collapseAt) / 700;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            g.fillStyle(i % 3 ? ASH : BRAND_LIT, 1 - k);
            g.fillCircle(e.x + Math.cos(a) * 30 * k, e.y - 20 + Math.sin(a) * 18 * k + k * 26, 4 - k * 2);
          }
          continue;
        }
        const quiver = e.collapseAt - time < 500 ? Math.sin(time / 25) * 2 : 0;
        const x = e.x + quiver, y = e.y - 18;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(e.x, e.y + 14, 50, 14);
        g.fillStyle(ASH_DARK, 1); g.fillCircle(x, y, 32);
        g.fillStyle(ASH, 1); g.fillCircle(x - 2, y - 2, 29);
        for (let i = 0; i < 6; i++) { g.fillStyle(ASH_DARK, 0.6); g.fillCircle(x - 16 + ((i * 13) % 30), y - 10 + ((i * 7) % 22), 2); }
        for (let i = 0; i < 5; i++) {
          const tx = x - 20 + i * 10;
          g.fillStyle(ASH_DARK, 1); g.fillTriangle(tx - 4, y - 28, tx + 4, y - 28, tx, y - 42 - (i % 2) * 6);
        }
        g.fillStyle(BRAND_LIT, 0.8); g.fillCircle(x - 9, y - 4, 2.5); g.fillCircle(x + 9, y - 4, 2.5);
      }
    },
    onPhaseEnd() { effigies = []; },
  };
};

// ── V (hard). The Last Ember ─────────────────────────────────────────
// A heartbeat. He gutters to a single coal and every beat throws a ring of heat off it. The
// rings share one gap, shown as a bright wedge before the first beat, and it drifts a little
// with each pulse — walk with it.

const lastEmber = (tk: BossToolkit): SignatureMove => {
  const BEATS = 5;
  const GAP_HALF = 0.6;
  let base = 0, drift = 0, from = 0, firstAt = 0, beats = 0, cx = 0, cy = 0;
  let active = false;
  return {
    durationMs: 4200,
    windupMs: 900,
    hold: 'brace',
    locksBody: true,
    tell: 'THE LAST EMBER',
    cast(time) {
      active = true;
      cx = tk.bossX; cy = tk.bossY;
      base = tk.angleToPlayer(cx, cy) + (Math.random() < 0.5 ? 1 : -1) * 0.9;
      drift = (Math.random() < 0.5 ? 1 : -1) * 0.22;
      from = time;
      firstAt = time + tk.warn(800);
      beats = 0;
      for (let i = 0; i < BEATS; i++) {
        tk.schedule(firstAt - time + i * 640, () => {
          tk.spawnRing({ cx, cy, delayMs: 0, speed: 310, gapCentre: base + drift * i, gapHalf: GAP_HALF, band: 16, damage: 13 });
          tk.sfx('heartbeat');
          beats = i + 1;
        });
      }
    },
    update(time) { if (active && time > firstAt + BEATS * 640 + 400) active = false; },
    drawAir(g, time) {
      if (!active) return;
      // The gap of the next beat, as a wedge of white light.
      const gap = base + drift * Math.min(beats, BEATS - 1);
      const k = time < firstAt ? (time - from) / Math.max(1, firstAt - from) : 1;
      if (beats < BEATS) {
        g.fillStyle(WHITE_HOT, 0.08 + k * 0.12);
        g.slice(cx, cy, 260, gap - GAP_HALF, gap + GAP_HALF, false); g.fillPath();
        g.lineStyle(2, WHITE_HOT, 0.3 + k * 0.3);
        g.lineBetween(cx, cy, cx + Math.cos(gap) * 300, cy + Math.sin(gap) * 300);
      }
      // The heartbeat on the coal itself.
      const ph = ((time - firstAt) % 640) / 640;
      const beat = time >= firstAt ? Math.max(0, 1 - ph * 3) : 0;
      g.fillStyle(BRAND_LIT, 0.2 + beat * 0.5); g.fillCircle(cx, cy, 30 + beat * 20);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── V (hard). Rekindle ───────────────────────────────────────────────
// He spits the last of himself across the room as five embers. Stamp them out. Whatever is
// still burning when the count runs down flies home: it heals him, and every ember that made
// it home makes the nova that follows hotter. Stamp them all and the nova never comes.

const rekindle = (tk: BossToolkit): SignatureMove => {
  const LIFE = 6000;
  const FLY = 650;
  interface Spark { fx: number; fy: number; x: number; y: number; landAt: number; snuffed: boolean }
  let sparks: Spark[] = [];
  let resolveAt = 0;
  let returning: { x: number; y: number; at: number }[] = [];
  return {
    durationMs: 1800,
    windupMs: 900,
    gesture: 'clap',
    tell: 'REKINDLE',
    cast(time) {
      tk.sfx('sparkle');
      const n = 5;
      const a0 = Math.random() * Math.PI * 2;
      sparks = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const r = 190 + Math.random() * 120;
        sparks.push({
          fx: tk.bossX, fy: tk.bossY,
          x: clampN(tk.W / 2 + Math.cos(a) * r * 1.3, 60, tk.W - 60),
          y: clampN(tk.H * 0.58 + Math.sin(a) * r * 0.8, FIELD_TOP + 40, tk.H - 50),
          landAt: time + FLY, snuffed: false,
        });
      }
      resolveAt = time + FLY + LIFE;
    },
    update(time) {
      const p = tk.player;
      for (const s of sparks) {
        if (s.snuffed || time < s.landAt) continue;
        if (p.active && dist(p.x, p.y, s.x, s.y) < 30) {
          s.snuffed = true;
          tk.sfx('hush');
          tk.boom(s.x, s.y, 22, ASH_DARK);
          float(tk, s.x, s.y - 20, 'SNUFFED', '#d8d0c8');
        }
      }
      if (resolveAt && time >= resolveAt) {
        resolveAt = 0;
        const left = sparks.filter((s) => !s.snuffed);
        if (left.length === 0) {
          float(tk, tk.bossX, tk.bossY - 60, 'THE EMBERS ARE OUT', '#c8c0b8');
          tk.sfx('hush');
        } else {
          returning = left.map((s) => ({ x: s.x, y: s.y, at: time }));
          tk.healBoss(8 * left.length);
          float(tk, tk.bossX, tk.bossY - 60, `REKINDLED ×${left.length}`, '#ffb347');
          tk.spawnSanctuary({ warnMs: 1900, damage: 10 + left.length * 5, safeR: 96 });
          tk.sfx('inferno');
        }
        sparks = [];
      }
      returning = returning.filter((r) => time - r.at < 600);
    },
    drawAir(g, time) {
      for (const s of sparks) {
        if (s.snuffed) continue;
        let x = s.x, y = s.y;
        if (time < s.landAt) {
          const k = (time - (s.landAt - FLY)) / FLY;
          x = s.fx + (s.x - s.fx) * k;
          y = s.fy + (s.y - s.fy) * k - Math.sin(k * Math.PI) * 90;
        }
        const pulse = 1 + Math.sin(time / 90 + s.x) * 0.15;
        g.fillStyle(BRAND, 0.18); g.fillCircle(x, y, 24 * pulse);
        g.fillStyle(BRAND_LIT, 1); g.fillCircle(x, y, 7 * pulse);
        g.fillStyle(WHITE_HOT, 1); g.fillCircle(x, y, 3);
        if (time >= s.landAt && resolveAt) {
          const left = clampN((resolveAt - time) / LIFE, 0, 1);
          g.lineStyle(2, BRAND_LIT, 0.8);
          g.beginPath(); g.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        }
      }
      for (const r of returning) {
        const k = (time - r.at) / 600;
        const x = r.x + (tk.bossX - r.x) * k, y = r.y + (tk.bossY - r.y) * k;
        g.lineStyle(3, BRAND_LIT, 1 - k);
        g.lineBetween(x, y, x - (tk.bossX - r.x) * 0.1, y - (tk.bossY - r.y) * 0.1);
        g.fillStyle(WHITE_HOT, 1 - k); g.fillCircle(x, y, 4);
      }
    },
    onPhaseEnd() { sparks = []; returning = []; resolveAt = 0; },
  };
};

// ── Body decor ───────────────────────────────────────────────────────

/**
 * The crown, the great iron and the cloak of embers. All three change with the phase: the
 * crown goes from gold to red-hot to crumbling ash to a single tine; the iron rests across his
 * lap on the throne, rises in his fist, and is gone by the last ember; the cloak hangs crimson,
 * flares and streams, runs white-hot at the hem, tatters to ash, and finally burns away.
 */
function drawAshgrave(g: Phaser.GameObjects.Graphics, s: BossBodyState): void {
  const r = s.radius;
  const t = s.t;
  const ph = s.phaseIdx;

  // ── Cloak of embers (a mantle hugging the lower body) ──
  if (ph <= 3) {
    const flare = ph === 1 ? 6 + Math.sin(t / 140) * 3 : ph === 2 ? 3 : 0;
    const cloak = ph === 3 ? ASH_DARK : CRIMSON;
    const hem = ph === 0 ? GOLD : ph === 1 ? BRAND_LIT : ph === 2 ? WHITE_HOT : ASH;
    const from = Math.PI * 0.08, to = Math.PI * 0.92;
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      if (ph === 3 && i % 3 === 1) continue; // tattered
      const a = from + ((to - from) * (i + 0.5)) / segs;
      const wave = Math.sin(t / 160 + i * 0.9) * (ph === 1 ? 4 : 1.5);
      const rr = r + 4 + flare + wave;
      g.fillStyle(cloak, 0.95);
      g.fillCircle(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr, 9 + (ph === 1 ? 2 : 0));
    }
    g.lineStyle(3, hem, ph === 2 ? 0.6 + Math.sin(t / 80) * 0.3 : 0.85);
    g.beginPath(); g.arc(s.x, s.y, r + 12 + flare, from, to, false); g.strokePath();
    // Embers coming off the cloak — few on the throne, a stream when he stands, ash flakes after.
    const n = ph === 0 ? 3 : ph === 1 ? 8 : ph === 2 ? 6 : 7;
    for (let i = 0; i < n; i++) {
      const p = ((t / (ph === 3 ? 1400 : 900)) + i / n) % 1;
      const a = from + (to - from) * ((i * 0.37) % 1);
      const bx = s.x + Math.cos(a) * (r + 12);
      const by = s.y + Math.sin(a) * (r + 12);
      const sideways = ph === 1 ? Math.cos(s.facing + Math.PI) * p * 40 : Math.sin(t / 300 + i) * 8;
      g.fillStyle(ph === 3 ? ASH : i % 2 ? BRAND_LIT : GOLD, (1 - p) * 0.85);
      g.fillCircle(bx + sideways, by - p * (ph === 3 ? 70 : 40), ph === 3 ? 2.6 : 1.8);
    }
  } else {
    // The last ember: three coals circling what is left of him.
    for (let i = 0; i < 3; i++) {
      const a = t / 400 + (i * Math.PI * 2) / 3;
      g.fillStyle(BRAND_LIT, 0.9); g.fillCircle(s.x + Math.cos(a) * (r + 14), s.y + Math.sin(a) * (r + 10), 3.5);
      g.fillStyle(WHITE_HOT, 0.9); g.fillCircle(s.x + Math.cos(a) * (r + 14), s.y + Math.sin(a) * (r + 10), 1.5);
    }
  }

  // ── The great branding iron ──
  if (ph === 0) {
    // Across his lap on the throne.
    const y = s.y + r * 0.45;
    g.lineStyle(6, 0x1a1210, 1); g.lineBetween(s.x - r * 1.3, y, s.x + r * 1.1, y - 4);
    g.lineStyle(2, 0x5a4a42, 1); g.lineBetween(s.x - r * 1.3, y, s.x + r * 1.1, y - 4);
    g.fillStyle(BRAND, 0.2 + s.castGlow * 0.3); g.fillCircle(s.x - r * 1.35, y, 14);
    brandSigil(g, s.x - r * 1.35, y, 9, s.castGlow > 0.3 ? WHITE_HOT : BRAND, 1);
  } else if (ph <= 3 && s.hands[0]) {
    const h = s.hands[0];
    const a = s.facing;
    const len = r * 2.1;
    const hx = h.x + Math.cos(a) * len, hy = h.y + Math.sin(a) * len;
    const shaft = ph === 3 ? ASH_DARK : 0x1a1210;
    g.lineStyle(7, shaft, 1); g.lineBetween(h.x - Math.cos(a) * 10, h.y - Math.sin(a) * 10, hx, hy);
    g.lineStyle(2, ph === 3 ? ASH : 0x5a4a42, 1); g.lineBetween(h.x, h.y, hx, hy);
    const head = ph === 3 ? BRAND_LIT : s.castGlow > 0.3 || ph === 2 ? WHITE_HOT : BRAND_LIT;
    g.fillStyle(head, 0.18 + s.castGlow * 0.25); g.fillCircle(hx, hy, 18);
    brandSigil(g, hx, hy, 11, head, 1);
  }

  // ── The crown ──
  const top = s.y - r - 2;
  if (ph <= 3) {
    const band = ph === 3 ? ASH_DARK : ph === 2 ? 0xd88a3a : GOLD;
    const tine = ph === 3 ? ASH : ph === 2 ? BRAND_LIT : GOLD;
    const jewel = ph === 2 ? WHITE_HOT : ph === 3 ? BRAND_LIT : BRAND;
    const w = r * 1.15;
    g.fillStyle(0x1a0e08, 1); g.fillRect(s.x - w / 2 - 2, top - 10, w + 4, 12);
    g.fillStyle(band, 1); g.fillRect(s.x - w / 2, top - 9, w, 9);
    const tines = 5;
    for (let i = 0; i < tines; i++) {
      if (ph === 3 && (i === 1 || i === 4)) continue; // crumbled away
      const tx = s.x - w / 2 + 4 + (i * (w - 8)) / (tines - 1);
      const th = (i === 2 ? 22 : i % 2 ? 14 : 18) + (s.enraged ? 3 : 0);
      g.fillStyle(0x1a0e08, 1); g.fillTriangle(tx - 5, top - 8, tx + 5, top - 8, tx, top - 10 - th);
      g.fillStyle(tine, 1); g.fillTriangle(tx - 3.5, top - 9, tx + 3.5, top - 9, tx, top - 8 - th);
      g.fillStyle(jewel, 1); g.fillCircle(tx, top - 12 - th * 0.35, 2.2);
    }
    if (ph === 3) {
      // Flakes falling off the crown.
      for (let i = 0; i < 4; i++) {
        const p = ((t / 1100) + i / 4) % 1;
        g.fillStyle(ASH, 1 - p); g.fillRect(s.x - w / 2 + ((i * 17) % w), top + p * 30, 3, 2);
      }
    }
    if (ph === 2) { g.fillStyle(BRAND_LIT, 0.12 + Math.sin(t / 100) * 0.06); g.fillCircle(s.x, top - 10, w * 0.7); }
  } else {
    // One last tine, burning.
    g.fillStyle(BRAND_LIT, 1); g.fillTriangle(s.x - 3, top - 4, s.x + 3, top - 4, s.x, top - 18);
    g.fillStyle(WHITE_HOT, 0.8); g.fillCircle(s.x, top - 9, 2);
  }

  // The brand on his own wrist — he wore it first.
  const off = s.hands[1];
  if (off && ph <= 3) brandSigil(g, off.x, off.y, 4.5, ph === 3 ? ASH : GOLD, 0.9);
}

// ── Arena ────────────────────────────────────────────────────────────

/**
 * The throne room at the top of the Kiln: basalt flagstones, a crimson runner from the doors
 * to the dais, the sigil laid in gold, crucibles along the ceiling lip, three cooling-vent
 * grates in the floor, and the iron throne itself at the head of the hall.
 */
function drawThroneRoom(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  g.fillStyle(0x0c0606, 1); g.fillRect(0, 0, W, H);
  // Flagstones.
  const S = 48;
  for (let y = FIELD_TOP; y < H; y += S) {
    const shift = ((y - FIELD_TOP) / S) % 2 ? S / 2 : 0;
    for (let x = -shift; x < W; x += S) {
      const v = ((x * 7 + y * 13) % 5) * 0x020101;
      g.fillStyle(0x221614 + v, 1); g.fillRect(x + 2, y + 2, S - 4, S - 4);
    }
  }
  // Ceiling lip with the crucibles' chains.
  g.fillStyle(0x140a08, 1); g.fillRect(0, FIELD_TOP, W, 28);
  g.fillStyle(0x3a1a12, 1); g.fillRect(0, FIELD_TOP + 24, W, 4);
  for (let x = 40; x < W; x += 80) {
    g.lineStyle(2, 0x2a2420, 1);
    for (let k = 0; k < 3; k++) g.strokeEllipse(x, FIELD_TOP + 4 + k * 7, 4, 7);
  }
  // Crimson runner.
  g.fillStyle(0x3a0606, 1); g.fillRect(W / 2 - 46, THRONE.y, 92, H - THRONE.y);
  g.fillStyle(CRIMSON, 1); g.fillRect(W / 2 - 40, THRONE.y, 80, H - THRONE.y);
  g.lineStyle(2, GOLD, 0.55);
  g.lineBetween(W / 2 - 36, THRONE.y, W / 2 - 36, H); g.lineBetween(W / 2 + 36, THRONE.y, W / 2 + 36, H);
  // The sigil in gold mosaic, centre of the hall.
  const cy = H * 0.6;
  g.fillStyle(0x1a0a06, 0.6); g.fillCircle(W / 2, cy, 120);
  brandSigil(g, W / 2, cy, 104, 0x6a4a1a, 0.9);
  brandSigil(g, W / 2, cy, 98, GOLD, 0.25);
  // Pillars along the side walls, banners between.
  for (const x of [34, W - 34]) {
    for (let y = FIELD_TOP + 70; y < H; y += 150) {
      g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 26, 54, 16);
      g.fillStyle(0x1a1210, 1); g.fillRect(x - 20, y - 50, 40, 76);
      g.fillStyle(0x3a2a24, 1); g.fillRect(x - 16, y - 50, 32, 76);
      g.fillStyle(0x4a3a32, 1); g.fillRect(x - 22, y - 56, 44, 8);
    }
    for (let y = FIELD_TOP + 145; y < H - 40; y += 150) {
      g.fillStyle(CRIMSON, 0.9); g.fillRect(x - 14, y - 20, 28, 46);
      g.fillTriangle(x - 14, y + 26, x + 14, y + 26, x, y + 38);
      brandSigil(g, x, y, 8, GOLD, 0.8);
    }
  }
  // Cooling vents: iron grates with a hint of blue below.
  for (const v of VENTS) {
    g.fillStyle(0x000000, 0.6); g.fillCircle(v.x, v.y, 54);
    g.fillStyle(0x0a1a22, 1); g.fillCircle(v.x, v.y, 48);
    g.fillStyle(COOL, 0.08); g.fillCircle(v.x, v.y, 40);
    g.lineStyle(4, 0x2a2420, 1);
    for (let k = -3; k <= 3; k++) g.lineBetween(v.x + k * 13, v.y - 44, v.x + k * 13, v.y + 44);
    g.lineStyle(5, 0x3a302c, 1); g.strokeCircle(v.x, v.y, 50);
  }
  // The dais and the iron throne.
  g.fillStyle(0x000000, 0.5); g.fillEllipse(THRONE.x, THRONE.y + 40, 240, 50);
  g.fillStyle(0x1a1210, 1); g.fillRect(THRONE.x - 120, THRONE.y + 10, 240, 34);
  g.fillStyle(0x2e2220, 1); g.fillRect(THRONE.x - 114, THRONE.y + 12, 228, 26);
  g.fillStyle(0x0c0606, 1); g.fillRect(THRONE.x - 58, THRONE.y - 100, 116, 120);
  g.fillStyle(0x2a1612, 1); g.fillRect(THRONE.x - 50, THRONE.y - 92, 100, 110);
  for (let k = 0; k < 9; k++) {
    const sx = THRONE.x - 56 + k * 14;
    const h = 22 + (k % 2) * 12 + (k === 4 ? 16 : 0);
    g.fillStyle(0x0c0606, 1); g.fillTriangle(sx - 6, THRONE.y - 98, sx + 6, THRONE.y - 98, sx, THRONE.y - 98 - h);
    g.fillStyle(GOLD, 0.5); g.fillCircle(sx, THRONE.y - 98 - h * 0.5, 1.8);
  }
  brandSigil(g, THRONE.x, THRONE.y - 60, 22, GOLD, 0.7);
  // Armrests.
  g.fillStyle(0x0c0606, 1); g.fillRect(THRONE.x - 76, THRONE.y - 30, 22, 50); g.fillRect(THRONE.x + 54, THRONE.y - 30, 22, 50);
  g.fillStyle(BRAND, 0.8); g.fillCircle(THRONE.x - 65, THRONE.y - 32, 5); g.fillCircle(THRONE.x + 65, THRONE.y - 32, 5);
  // Braziers flanking the dais.
  for (const bx of [THRONE.x - 180, THRONE.x + 180]) {
    g.fillStyle(0x000000, 0.4); g.fillEllipse(bx, THRONE.y + 36, 50, 14);
    g.lineStyle(4, 0x1a1210, 1); g.lineBetween(bx - 12, THRONE.y + 34, bx, THRONE.y); g.lineBetween(bx + 12, THRONE.y + 34, bx, THRONE.y);
    g.fillStyle(0x1a1210, 1); g.fillEllipse(bx, THRONE.y - 4, 44, 16);
    g.fillStyle(BRAND_LIT, 0.85); g.fillEllipse(bx, THRONE.y - 8, 34, 10);
    g.fillStyle(BRAND, 0.1); g.fillCircle(bx, THRONE.y - 14, 60);
  }
  // Soot vignette.
  g.fillStyle(0x000000, 0.35); g.fillRect(0, FIELD_TOP, 14, H - FIELD_TOP); g.fillRect(W - 14, FIELD_TOP, 14, H - FIELD_TOP);
}

// ── The def ──────────────────────────────────────────────────────────

export const ASHGRAVE_BOSS: WorldBossDef = {
  worldId: 'isle:ashgrave',
  name: 'King Ashgrave',
  title: 'the Brand-King of Brandmark',
  color: BRAND,
  colorLit: BRAND_LIT,
  colorDark: BRAND_DARK,
  accent: GOLD,
  damageMult: 1.15,

  intro: [
    'Kneel. Every soul on my isle has knelt. You will not be the first to refuse me.',
    'Six children I raised to keep my fires. You put out every one.',
    'So come and be counted.',
  ],
  banter: [
    'Every hearth on Brandmark burns because I said so.',
    'A cold hearth is a cold heart. I have warmed ten thousand.',
    'You think the brand is cruelty. It is a receipt.',
    'Kindle cried at his first branding. I made him do it again.',
    'The Kiln has eaten better than you.',
    'I am not fire. I am the reason fire is kept.',
    'Burn. Burn for your King. Everyone does, in the end.',
  ],
  defeatLine: 'THE BRAND-KING IS ASH',
  resumeLine: 'Back again. The Kiln never runs out of patience. Neither do I.',

  phases: [
    {
      name: 'The Tithe',
      line: 'Pay what you owe. Every ember of it.',
      hp: 420,
      cycle: ['sig:tithe', 'volley', 'sig:hearths', 'radial', 'sig:vassals', 'barrage', 'sig:tithe', 'lanes'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'The Brand',
      line: 'Enough sitting. Hold still — this is how I mark what is mine.',
      hp: 460,
      cycle: ['sig:iron', 'slamchain', 'sig:brand', 'volley', 'charge', 'sig:iron', 'barrage', 'sig:brand', 'stream'],
      harass: ['h-rune', 'h-flak', 'h-snipe'],
      restMs: 1100,
      harassMs: 3000,
    },
    {
      name: 'The Kiln',
      line: 'You came into my furnace. Let it do what furnaces do.',
      hp: 480,
      cycle: ['sig:kiln', 'sig:slag', 'radial', 'sig:bricks', 'spiral', 'sig:kiln', 'sig:slag', 'homing', 'sig:bricks', 'quake'],
      harass: ['h-lane', 'h-orbs', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
    {
      name: 'The Ash Crown',
      line: 'Then I will burn the last of it myself. A King pays his own tithe.',
      hp: 520,
      cycle: ['sig:crown', 'sig:cinder', 'charge', 'sig:tithe', 'sig:crown', 'spiral', 'sig:cinder', 'sanctuary', 'slamchain'],
      harass: ['h-orbs', 'h-flak', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE KILN NEVER GOES OUT',
    extraPhase: {
      name: 'The Last Ember',
      line: 'One coal. That is all a fire needs. One.',
      hp: 380,
      cycle: ['sig:ember', 'sig:rekindle', 'sig:crown', 'quake', 'sig:ember', 'sig:cinder', 'sig:rekindle', 'spiral'],
      harass: ['h-orbs', 'h-rune', 'h-lane'],
      restMs: 820,
      harassMs: 2300,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.15 },
    barrage: { radius: 58 },
  },

  signatures: {
    tithe,
    hearths: hearthCount,
    vassals,
    iron: greatIron,
    brand: brandStamp,
    kiln: kilnHeat,
    bricks: firebricks,
    slag: slagPour,
    crown: crownOfAsh,
    cinder: cinderEffigies,
    ember: lastEmber,
    rekindle,
  },

  look: { crest: 'none', pattern: 'plates', aura: 'flame', hands: 'gauntlet', torsoR: 40, mouth: 'grate', eyes: 2, eyeColor: GOLD },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { aura: 'sparks' } },
    { movement: 'hover', gimmick: 'none', tint: 'blood', look: { pattern: 'cracks', aura: 'flame' } },
    { movement: 'rush', gimmick: 'none', tint: 'pale', look: { pattern: 'drip', aura: 'smoke', hands: 'wisp', mouth: 'line' } },
    { movement: 'blink', gimmick: 'gloom', tint: 'void', look: { torsoR: 26, pattern: 'cracks', aura: 'sparks', hands: 'orb', eyes: 1 } },
  ],

  drawDecor: drawAshgrave,
  drawArena: drawThroneRoom,
};
