import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  CHERRY, CHOCOLATE, FLOSS, GLASS, ICING, LEMON, MINT, PINK, PINK_PALE, SUGAR, SWEETS, SYRUP, SYRUP_DEEP, SYRUP_LIT,
  VERDIGRA, candyCane, canePath, dist, drips, floss, gardenerMark, gumdrop, lollipop, piping, rosette, sugarCube,
  sugarLoaf, twist, wrappedSweet,
} from './art';

/**
 * Prince Saccharo — His Sweetness, Governor of the Confection Court, the Empress's youngest.
 *
 * Saccharo keeps the Sweet-Tax: a sugar loaf a head every season, weighed in Sugarloaf Square,
 * and a household that comes up short goes up the hill to his mother's Glasshouse. He has never
 * been short of anything. He eats the icing off every cake the town bakes him and sends the rest
 * down; he keeps a glass likeness of every child he sends up the hill, to remember them sweetly.
 *
 * Phase one, *Spun Sugar*: a dandy under a towering beehive wig of candy floss, floating on his
 * own sweetness — floss clouds that spin you in, boiled sweets that ricochet, a candy cane thrown
 * like a boomerang. Phase two, *Melt*: the heat of the fight gets to him and he runs — a syrup
 * flood across the ballroom with only sugar-cube islands to stand on, gumdrops that bounce toward
 * you, sugar loaves dropped from the ceiling. Hard mode, *Cavity*: the sugar rots. He sits in the
 * middle of the ruin as the room closes in, cavities bore through the floor round you, sour drops
 * rain, and every sweet in the room turns on him — and you are in the way.
 */

const SACC = 0xf27aa8;
const SACC_LIT = 0xffd6ea;
const SACC_DARK = 0x6a1a3a;
const ACCENT = LEMON;
const ROT = 0x7a8a4a;
const ROT_DARK = 0x3a3a1e;
const SOUR = 0xc8f04a;

const PLAYER_R = 20;
const TOP = 96;

// ── Signature: Candy Floss ───────────────────────────────────────────
// Three clouds of floss spin up round you, then drift after you. Inside one you are slowed and
// the floss winds on; stay in too long and you are spun into a cocoon. Walk out of them.

const CF_GROW_MS = 900;
const CF_LIVE_MS = 4600;
const CF_R = 70;
const CF_DRIFT = 42;
const CF_SPIN_MS = 1400;
const CF_DAMAGE = 14;

const candyFloss = (tk: BossToolkit): SignatureMove => {
  interface Cloud { x: number; y: number; bornAt: number; endAt: number; seed: number }
  let clouds: Cloud[] = [];
  let spun = 0;
  let lastAt = 0;
  let cocoonAt = -9999;
  return {
    durationMs: 1400,
    windupMs: 600,
    gesture: 'raise',
    tell: 'CANDY FLOSS',
    cast() {
      const p = tk.player;
      const n = tk.hard ? 4 : 3;
      const base = Math.random() * Math.PI * 2;
      const now = tk.now;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        const r = 100 + Math.random() * 50;
        clouds.push({ x: tk.clampX(p.x + Math.cos(a) * r, 80), y: tk.clampY(p.y + Math.sin(a) * r, 80), bornAt: now, endAt: now + tk.warn(CF_GROW_MS) + CF_LIVE_MS, seed: Math.random() * 10 });
      }
      tk.sfx('gust');
    },
    update(time, dt) {
      const p = tk.player;
      let inside = false;
      for (const c of clouds) {
        const grown = time - c.bornAt >= tk.warn(CF_GROW_MS);
        if (!grown) continue;
        const d = dist(c.x, c.y, p.x, p.y);
        if (d > 1 && time < c.endAt - 600) { c.x += ((p.x - c.x) / d) * CF_DRIFT * dt; c.y += ((p.y - c.y) / d) * CF_DRIFT * dt; }
        if (d < CF_R && time < c.endAt) inside = true;
      }
      if (inside) {
        tk.slowPlayer(0.55, 150);
        spun += time - lastAt;
        if (spun >= CF_SPIN_MS) {
          spun = 0; cocoonAt = time;
          tk.hitPlayer(CF_DAMAGE, p.x, p.y);
          tk.slowPlayer(0.3, 700);
          tk.host.showFloatingText(p.x, p.y - 50, 'SPUN IN', '#ffb8de');
          tk.sfx('status-slow');
        }
      } else spun = Math.max(0, spun - (time - lastAt) * 2);
      lastAt = time;
      clouds = clouds.filter((c) => time < c.endAt);
    },
    drawGround(g, time) {
      for (const c of clouds) {
        const k = Math.min(1, (time - c.bornAt) / tk.warn(CF_GROW_MS));
        g.fillStyle(FLOSS, 0.08 + 0.12 * k); g.fillCircle(c.x, c.y, CF_R * (0.4 + 0.6 * k));
        if (k < 1) { g.lineStyle(2, FLOSS, 0.5); g.strokeCircle(c.x, c.y, CF_R); }
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const c of clouds) {
        const k = Math.min(1, (time - c.bornAt) / tk.warn(CF_GROW_MS));
        const fade = Math.min(1, (c.endAt - time) / 600);
        if (k < 1) {
          // Wisps spinning in from the rim.
          for (let i = 0; i < 6; i++) {
            const a = c.seed + i + t * 4;
            const r = CF_R * (1.2 - k);
            g.lineStyle(2, FLOSS, 0.7); g.beginPath(); g.arc(c.x, c.y, r, a, a + 0.8, false); g.strokePath();
          }
        }
        floss(g, c.x, c.y - 10, CF_R * 0.62 * k, 0.75 * fade, FLOSS, t + c.seed);
      }
      const p = tk.player;
      if (spun > 0) {
        // Floss winding on round you.
        const s = spun / CF_SPIN_MS;
        for (let i = 0; i < Math.ceil(s * 6); i++) { g.lineStyle(2, FLOSS, 0.8); g.strokeEllipse(p.x, p.y - 4 - i * 4, 34 - i * 2, 10); }
      }
      const ck = (time - cocoonAt) / 700;
      if (ck >= 0 && ck < 1) { g.fillStyle(FLOSS, 0.7 * (1 - ck)); g.fillEllipse(p.x, p.y - 8, 54, 64); }
    },
    onPhaseEnd() { clouds = []; spun = 0; },
  };
};

// ── Signature: Hard Candy ────────────────────────────────────────────
// A fan of boiled sweets flicked off his fingers. Each one ricochets once off the walls of the
// ballroom before it shatters — the aim lines show where they go, the bounce does not.

const HC_WARN_MS = 650;
const HC_SPEED = 310;
const HC_DAMAGE = 9;
const HC_R = 9;

const hardCandy = (tk: BossToolkit): SignatureMove => {
  interface Sweet { x: number; y: number; vx: number; vy: number; bounces: number; color: number; spin: number; dieAt: number }
  interface Aim { a: number; at: number; fireAt: number; fx: number; fy: number }
  let sweets: Sweet[] = [];
  let aims: Aim[] = [];
  const shatter: { x: number; y: number; at: number; color: number }[] = [];
  return {
    durationMs: 1500,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'HARD CANDY',
    cast() {
      const n = tk.hard ? 7 : 5;
      const a0 = tk.angleToPlayer();
      const now = tk.now;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.24;
        aims.push({ a, at: now, fireAt: now + tk.warn(HC_WARN_MS) + i * 60, fx: tk.bossX, fy: tk.bossY });
      }
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      for (const a of [...aims]) {
        if (time < a.fireAt) continue;
        aims = aims.filter((q) => q !== a);
        sweets.push({ x: a.fx, y: a.fy, vx: Math.cos(a.a) * HC_SPEED, vy: Math.sin(a.a) * HC_SPEED, bounces: 1, color: SWEETS[Math.floor(Math.random() * SWEETS.length)], spin: 0, dieAt: time + 4500 });
        tk.sfx('dice');
      }
      const p = tk.player;
      for (const s of [...sweets]) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.spin += dt * 12;
        const out = s.x < 20 || s.x > tk.W - 20 || s.y < TOP || s.y > tk.H - 20;
        if (out) {
          if (s.bounces > 0) {
            s.bounces--;
            if (s.x < 20 || s.x > tk.W - 20) s.vx = -s.vx;
            if (s.y < TOP || s.y > tk.H - 20) s.vy = -s.vy;
            s.x = Phaser.Math.Clamp(s.x, 21, tk.W - 21); s.y = Phaser.Math.Clamp(s.y, TOP + 1, tk.H - 21);
            tk.sfx('hit-light');
          } else { sweets = sweets.filter((q) => q !== s); shatter.push({ x: s.x, y: s.y, at: time, color: s.color }); continue; }
        }
        if (dist(s.x, s.y, p.x, p.y) < PLAYER_R + HC_R) {
          tk.hitPlayer(HC_DAMAGE, s.x, s.y);
          sweets = sweets.filter((q) => q !== s);
          shatter.push({ x: s.x, y: s.y, at: time, color: s.color });
          tk.sfx('crystal-shatter');
        } else if (time > s.dieAt) sweets = sweets.filter((q) => q !== s);
      }
      while (shatter.length && time - shatter[0].at > 400) shatter.shift();
    },
    drawGround(g, time) {
      for (const a of aims) {
        const k = Math.min(1, (time - a.at) / Math.max(1, a.fireAt - a.at));
        g.lineStyle(2, SACC_LIT, 0.2 + 0.4 * k);
        const L = 900;
        for (let d = 30; d < L; d += 22) g.lineBetween(a.fx + Math.cos(a.a) * d, a.fy + Math.sin(a.a) * d, a.fx + Math.cos(a.a) * (d + 10), a.fy + Math.sin(a.a) * (d + 10));
      }
    },
    drawAir(g, time) {
      for (const s of sweets) {
        g.fillStyle(0x000000, 0.2); g.fillEllipse(s.x, s.y + 12, 16, 5);
        wrappedSweet(g, s.x, s.y, HC_R, s.color, s.spin, 1);
        if (s.bounces > 0) { g.fillStyle(0xffffff, 0.4); g.fillCircle(s.x, s.y, 2); }
      }
      for (const sh of shatter) {
        const k = (time - sh.at) / 400;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05;
          g.fillStyle(sh.color, 1 - k);
          g.fillTriangle(sh.x + Math.cos(a) * k * 22, sh.y + Math.sin(a) * k * 22, sh.x + Math.cos(a + 0.3) * (k * 22 + 5), sh.y + Math.sin(a + 0.3) * (k * 22 + 5), sh.x + Math.cos(a) * (k * 22 + 8), sh.y + Math.sin(a) * (k * 22 + 8));
        }
      }
    },
    onPhaseEnd() { sweets = []; aims = []; },
  };
};

// ── Signature: Candy Cane ────────────────────────────────────────────
// He hurls a candy cane as tall as he is. It spins out along a marked loop toward where you stand
// and comes back to his hand along the other side of it.

const CC_WARN_MS = 750;
const CC_LEG_MS = 900;
const CC_DAMAGE = 13;
const CC_HIT_R = 30;

const candyCaneThrow = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0;
  let launchAt = 0;
  let from: Pt = { x: 0, y: 0 };
  let to: Pt = { x: 0, y: 0 };
  let side = 1;
  let hitLeg = -1;
  const loopPos = (k: number): Pt => {
    // An ellipse from `from` round through `to` and back; k 0..1 is the whole flight.
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    const ax = (to.x - from.x) / 2, ay = (to.y - from.y) / 2;
    const len = Math.hypot(ax, ay) || 1;
    const nx = (-ay / len) * 110 * side, ny = (ax / len) * 110 * side;
    const th = Math.PI + k * Math.PI * 2;
    return { x: mx + ax * Math.cos(th) + nx * Math.sin(th), y: my + ay * Math.cos(th) + ny * Math.sin(th) };
  };
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'punch',
    tell: 'CANDY CANE',
    cast() {
      active = true;
      bornAt = tk.now;
      launchAt = bornAt + tk.warn(CC_WARN_MS);
      from = { x: tk.bossX, y: tk.bossY };
      const p = tk.player;
      const a = Math.atan2(p.y - from.y, p.x - from.x);
      const d = Math.max(260, Math.min(560, dist(from.x, from.y, p.x, p.y) + 80));
      to = { x: tk.clampX(from.x + Math.cos(a) * d), y: tk.clampY(from.y + Math.sin(a) * d) };
      side = Math.random() < 0.5 ? 1 : -1;
      hitLeg = -1;
      tk.schedule(launchAt - bornAt, () => tk.sfx('whoosh'));
    },
    update(time) {
      if (!active) return;
      if (time < launchAt) return;
      const k = (time - launchAt) / (CC_LEG_MS * 2);
      if (k >= 1) { active = false; return; }
      const leg = k < 0.5 ? 0 : 1;
      const c = loopPos(k);
      const p = tk.player;
      if (hitLeg !== leg && dist(c.x, c.y, p.x, p.y) < CC_HIT_R + PLAYER_R * 0.6) {
        hitLeg = leg;
        tk.hitPlayer(CC_DAMAGE, c.x, c.y);
        tk.sfx('hit-medium');
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const k = Math.min(1, (time - bornAt) / Math.max(1, launchAt - bornAt));
      // The loop it will fly, striped in dashes.
      for (let i = 0; i < 40; i++) {
        const a = loopPos(i / 40), b = loopPos((i + 0.5) / 40);
        g.lineStyle(i % 2 ? 4 : 3, i % 2 ? CHERRY : ICING, 0.25 + 0.35 * k);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      if (time < launchAt) {
        // Held up, ready to throw.
        twist(g, canePath(tk.bossX + 30, tk.bossY + 10, 70, 1, 7), 7, ICING, CHERRY, 1, 10);
        return;
      }
      const k = (time - launchAt) / (CC_LEG_MS * 2);
      const c = loopPos(k);
      const spin = time / 70;
      const pts = canePath(0, 30, 70, 1, 7).map((q) => ({
        x: c.x + q.x * Math.cos(spin) - (q.y - 0) * Math.sin(spin),
        y: c.y + q.x * Math.sin(spin) + (q.y - 0) * Math.cos(spin) - 20,
      }));
      twist(g, pts, 7, ICING, CHERRY, 1, 10);
      g.fillStyle(0x000000, 0.18); g.fillEllipse(c.x, c.y + 18, 40, 10);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Melt ──────────────────────────────────────────────
// Syrup floods the ballroom from one wall. Sugar cubes the size of tables stand up out of it —
// one always within reach of you. On a cube you are dry; in the syrup you wade and it scalds.

const SF_WARN_MS = 900;
const SF_FILL_MS = 1500;
const SF_HOLD_MS = 2600;
const SF_DRAIN_MS = 800;
const SF_ISLAND_R = 56;
const SF_TICK_MS = 500;
const SF_DAMAGE = 5;

const syrupFlood = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0;
  let dir = 1;
  let islands: Pt[] = [];
  let lastTick = 0;
  const phase = (time: number): { fill: number; warn: boolean } => {
    const w = tk.warn(SF_WARN_MS);
    const t = time - bornAt;
    if (t < w) return { fill: 0, warn: true };
    if (t < w + SF_FILL_MS) return { fill: (t - w) / SF_FILL_MS, warn: false };
    if (t < w + SF_FILL_MS + SF_HOLD_MS) return { fill: 1, warn: false };
    return { fill: Math.max(0, 1 - (t - w - SF_FILL_MS - SF_HOLD_MS) / SF_DRAIN_MS), warn: false };
  };
  const wet = (x: number, time: number): boolean => {
    const { fill } = phase(time);
    if (fill <= 0) return false;
    const front = dir > 0 ? fill * tk.W : tk.W - fill * tk.W;
    return dir > 0 ? x < front : x > front;
  };
  const onIsland = (x: number, y: number): boolean => islands.some((i) => dist(i.x, i.y, x, y + 10) < SF_ISLAND_R);
  return {
    durationMs: 3200,
    windupMs: 700,
    gesture: 'slam',
    tell: 'THE MELT',
    cast() {
      active = true;
      bornAt = tk.now;
      lastTick = 0;
      dir = tk.bossX < tk.W / 2 ? 1 : -1;
      const p = tk.player;
      // One island close to you (always reachable), two more spread out.
      const a = Math.random() * Math.PI * 2;
      islands = [{ x: tk.clampX(p.x + Math.cos(a) * 130, 90), y: tk.clampY(p.y + Math.sin(a) * 100, 90) }];
      for (let i = 0; i < (tk.hard ? 2 : 3); i++) islands.push({ x: 140 + Math.random() * (tk.W - 280), y: TOP + 80 + Math.random() * (tk.H - TOP - 160) });
      tk.sfx('splash');
    },
    update(time) {
      if (!active) return;
      const t = time - bornAt;
      if (t > tk.warn(SF_WARN_MS) + SF_FILL_MS + SF_HOLD_MS + SF_DRAIN_MS) { active = false; return; }
      const p = tk.player;
      if (wet(p.x, time) && !onIsland(p.x, p.y)) {
        tk.slowPlayer(0.5, 150);
        if (time - lastTick > SF_TICK_MS) { lastTick = time; tk.hitPlayer(SF_DAMAGE, p.x, p.y); }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const { fill, warn } = phase(time);
      const k = Math.min(1, (time - bornAt) / tk.warn(SF_WARN_MS));
      if (warn) {
        // Syrup seeping under the wall it will come from.
        const x0 = dir > 0 ? 0 : tk.W - 40;
        g.fillStyle(SYRUP, 0.3 + 0.4 * k); g.fillRect(x0, TOP, 40 * k + 6, tk.H - TOP);
        for (let y = TOP + 20; y < tk.H; y += 40) { g.fillStyle(SYRUP_LIT, 0.6); g.fillCircle(dir > 0 ? 10 + k * 20 : tk.W - 10 - k * 20, y + Math.sin(time / 200 + y) * 6, 4); }
      } else {
        const w = fill * tk.W;
        const x0 = dir > 0 ? 0 : tk.W - w;
        g.fillStyle(SYRUP_DEEP, 0.85); g.fillRect(x0, TOP, w, tk.H - TOP);
        g.fillStyle(SYRUP, 0.75); g.fillRect(x0 + 6, TOP, Math.max(0, w - 12), tk.H - TOP);
        for (let b = 0; b < 10; b++) {
          const by = TOP + 30 + ((b * 71) % (tk.H - TOP - 60));
          const bx = x0 + ((b * 113 + time * 0.05) % Math.max(1, w));
          g.fillStyle(SYRUP_LIT, 0.35); g.fillEllipse(bx, by, 50, 8);
        }
        // The advancing lip.
        const fx = dir > 0 ? w : tk.W - w;
        g.fillStyle(SYRUP_LIT, 0.8); g.fillRect(fx - 4, TOP, 8, tk.H - TOP);
      }
      // Islands: telegraphed rings first, sugar cubes once the syrup is in.
      for (const i of islands) {
        g.lineStyle(3, SUGAR, 0.5 + 0.4 * k); g.strokeCircle(i.x, i.y, SF_ISLAND_R);
        if (!warn) { g.fillStyle(SUGAR, 0.9); g.fillEllipse(i.x, i.y, SF_ISLAND_R * 2, SF_ISLAND_R * 1.3); }
      }
    },
    drawAir(g) {
      if (!active) return;
      for (const i of islands) sugarCube(g, i.x + SF_ISLAND_R * 0.6, i.y + 10, 9, 0.9);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Gumdrops ──────────────────────────────────────────────
// He lobs gumdrops that bounce. Every landing is marked and numbered — two small hops walking
// toward you, then a third that goes off.

const GD_HOP_MS = 520;
const GD_HOPS = 3;
const GD_HOP_DAMAGE = 6;
const GD_HOP_R = 34;
const GD_BOOM_R = 82;
const GD_DAMAGE = 16;

const gumdrops = (tk: BossToolkit): SignatureMove => {
  interface Drop { pts: Pt[]; bornAt: number; firstAt: number; color: number; dealt: number }
  let drops: Drop[] = [];
  const booms: { x: number; y: number; at: number; color: number }[] = [];
  return {
    durationMs: 1900,
    windupMs: 550,
    gesture: 'clap',
    tell: 'GUMDROPS',
    cast() {
      const n = tk.hard ? 4 : 3;
      const p = tk.player;
      const now = tk.now;
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) + (i - (n - 1) / 2) * 0.5;
        const d = dist(tk.bossX, tk.bossY, p.x, p.y);
        const pts: Pt[] = [];
        for (let h = 1; h <= GD_HOPS; h++) {
          const r = (d / GD_HOPS) * h + (h === GD_HOPS ? 30 : 0);
          pts.push({ x: tk.clampX(tk.bossX + Math.cos(a) * r), y: tk.clampY(tk.bossY + Math.sin(a) * r) });
        }
        drops.push({ pts, bornAt: now, firstAt: now + tk.warn(600) + i * 120, color: [PINK, MINT, LEMON, 0x9a6ad0][i % 4], dealt: 0 });
      }
      tk.sfx('grenade-throw');
    },
    update(time) {
      const p = tk.player;
      for (const d of [...drops]) {
        const hop = Math.floor((time - d.firstAt) / GD_HOP_MS);
        while (d.dealt <= hop && d.dealt < GD_HOPS) {
          const at = d.pts[d.dealt];
          if (d.dealt === GD_HOPS - 1) {
            tk.explode(at.x, at.y, GD_BOOM_R, GD_DAMAGE, d.color);
            booms.push({ x: at.x, y: at.y, at: time, color: d.color });
            tk.sfx('slime-splat');
          } else {
            if (dist(at.x, at.y, p.x, p.y) < GD_HOP_R + PLAYER_R * 0.5) tk.hitPlayer(GD_HOP_DAMAGE, p.x, p.y);
            tk.sfx('boing');
          }
          d.dealt++;
        }
        if (d.dealt >= GD_HOPS) drops = drops.filter((q) => q !== d);
      }
      while (booms.length && time - booms[0].at > 500) booms.shift();
    },
    drawGround(g, time) {
      for (const d of drops) {
        d.pts.forEach((pt, i) => {
          if (i < d.dealt) return;
          const last = i === GD_HOPS - 1;
          const r = last ? GD_BOOM_R : GD_HOP_R;
          const due = d.firstAt + i * GD_HOP_MS;
          const k = Phaser.Math.Clamp(1 - (due - time) / 1200, 0, 1);
          g.fillStyle(d.color, 0.08 + 0.14 * k); g.fillCircle(pt.x, pt.y, r);
          g.lineStyle(2, d.color, 0.5 + 0.4 * k); g.strokeCircle(pt.x, pt.y, r);
          // Pips: one per hop, so you can count it in.
          for (let j = 0; j <= i; j++) { g.fillStyle(ICING, 0.9); g.fillCircle(pt.x - i * 5 + j * 10, pt.y, 3); }
        });
      }
      for (const b of booms) {
        const k = (time - b.at) / 500;
        g.fillStyle(b.color, 0.4 * (1 - k)); g.fillCircle(b.x, b.y, GD_BOOM_R * (0.6 + 0.4 * k));
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        // Where is it: between the boss/last landing and the next landing, on an arc.
        const since = time - d.firstAt;
        let a: Pt, b: Pt, k: number;
        if (since < 0) {
          a = { x: tk.bossX, y: tk.bossY }; b = d.pts[0];
          k = 1 + since / Math.max(1, d.firstAt - d.bornAt);
        } else {
          const hop = Math.min(GD_HOPS - 1, Math.floor(since / GD_HOP_MS));
          a = d.pts[hop]; b = d.pts[Math.min(GD_HOPS - 1, hop + 1)];
          k = (since - hop * GD_HOP_MS) / GD_HOP_MS;
        }
        k = Phaser.Math.Clamp(k, 0, 1);
        const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 70;
        g.fillStyle(0x000000, 0.2); g.fillEllipse(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 22, 7);
        const squash = 1 - Math.max(0, 0.3 - k) * 1.5;
        gumdrop(g, x, y, 11 * squash, d.color);
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Signature: Sugarloaf ─────────────────────────────────────────────
// Three tithe loaves dropped from the ceiling one after another, each at where you stand; they
// shatter into syrup that stays a while. Their shadows tell you where.

const SL_WARN_MS = 900;
const SL_GAP_MS = 480;
const SL_R = 70;
const SL_DAMAGE = 15;

const sugarloafDrop = (tk: BossToolkit): SignatureMove => {
  interface Loaf { x: number; y: number; bornAt: number; landAt: number; dealt: boolean }
  let loaves: Loaf[] = [];
  return {
    durationMs: 2200,
    windupMs: 500,
    gesture: 'raise',
    tell: 'SUGARLOAF',
    cast() {
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * SL_GAP_MS, () => {
          const p = tk.player;
          const now = tk.now;
          loaves.push({ x: tk.clampX(p.x, 70), y: tk.clampY(p.y + 10, 70), bornAt: now, landAt: now + tk.warn(SL_WARN_MS), dealt: false });
          tk.sfx('countdown-tick');
        });
      }
    },
    update(time) {
      for (const l of loaves) {
        if (l.dealt || time < l.landAt) continue;
        l.dealt = true;
        tk.explode(l.x, l.y, SL_R, SL_DAMAGE, SUGAR);
        tk.spawnPool({ x: l.x, y: l.y, radius: 56, lifeMs: 4000, damage: 4, tickMs: 650 });
        tk.sfx('stone-slam');
        tk.scene.cameras.main.shake(110, 0.004);
      }
      loaves = loaves.filter((l) => time < l.landAt + 500);
    },
    drawGround(g, time) {
      for (const l of loaves) {
        if (time >= l.landAt) {
          const k = (time - l.landAt) / 500;
          g.fillStyle(SYRUP, 0.6 * (1 - k * 0.5)); g.fillEllipse(l.x, l.y, SL_R * 1.6, SL_R);
          continue;
        }
        const k = (time - l.bornAt) / Math.max(1, l.landAt - l.bornAt);
        g.fillStyle(0x000000, 0.15 + 0.25 * k); g.fillEllipse(l.x, l.y, SL_R * 2 * (0.4 + 0.6 * k), SL_R * 1.1 * (0.4 + 0.6 * k));
        g.lineStyle(2, 0x3a5ab0, 0.6); g.strokeEllipse(l.x, l.y, SL_R * 2, SL_R * 1.1);
      }
    },
    drawAir(g, time) {
      for (const l of loaves) {
        if (time >= l.landAt) {
          const k = (time - l.landAt) / 500;
          for (let i = 0; i < 8; i++) {
            const a = i * 0.8;
            g.fillStyle(SUGAR, 1 - k);
            g.fillTriangle(l.x + Math.cos(a) * k * 50, l.y - 10 + Math.sin(a) * k * 30, l.x + Math.cos(a + 0.4) * (k * 50 + 8), l.y - 10 + Math.sin(a + 0.4) * (k * 30 + 8), l.x + Math.cos(a) * (k * 50 + 12), l.y - 10 + Math.sin(a) * (k * 30 + 4));
          }
          continue;
        }
        const k = (time - l.bornAt) / Math.max(1, l.landAt - l.bornAt);
        sugarLoaf(g, l.x, l.y - (1 - k * k) * 420, 80);
      }
    },
    onPhaseEnd() { loaves = []; },
  };
};

// ── Signature: Cavities ──────────────────────────────────────────────
// The rot bores through the floor: black holes drilled in a broken ring round you and one right
// under your feet. Each spins as it drills, and caves in. The ring always leaves a gap.

const CV_WARN_MS = 1150;
const CV_R = 50;
const CV_RING = 150;
const CV_DAMAGE = 14;

const cavities = (tk: BossToolkit): SignatureMove => {
  interface Hole { x: number; y: number; bornAt: number; at: number; dealt: boolean }
  let holes: Hole[] = [];
  return {
    durationMs: 1900,
    windupMs: 600,
    gesture: 'slam',
    tell: 'CAVITIES',
    cast() {
      const p = tk.player;
      const now = tk.now;
      const n = tk.hard ? 6 : 5;
      const gap = Math.random() * Math.PI * 2;
      for (let i = 0; i < n + 1; i++) {
        if (i === 0) { holes.push({ x: tk.clampX(p.x), y: tk.clampY(p.y + 10), bornAt: now, at: now + tk.warn(CV_WARN_MS), dealt: false }); continue; }
        // Spread round the ring, skipping one slot for the way out.
        const a = gap + (i / (n + 1)) * Math.PI * 2;
        holes.push({ x: tk.clampX(p.x + Math.cos(a) * CV_RING), y: tk.clampY(p.y + 10 + Math.sin(a) * CV_RING * 0.8), bornAt: now, at: now + tk.warn(CV_WARN_MS) + i * 70, dealt: false });
      }
      tk.sfx('quake');
    },
    update(time) {
      for (const h of holes) {
        if (h.dealt || time < h.at) continue;
        h.dealt = true;
        tk.explode(h.x, h.y, CV_R, CV_DAMAGE, ROT_DARK);
        tk.spawnPool({ x: h.x, y: h.y, radius: 38, lifeMs: 3200, damage: 4, tickMs: 700 });
        tk.sfx('stone-rise');
      }
      holes = holes.filter((h) => time < h.at + 600);
    },
    drawGround(g, time) {
      for (const h of holes) {
        if (time >= h.at) {
          const k = (time - h.at) / 600;
          g.fillStyle(0x0a0a06, 0.9 - k * 0.4); g.fillEllipse(h.x, h.y, CV_R * 1.8, CV_R * 1.1);
          continue;
        }
        const k = (time - h.bornAt) / Math.max(1, h.at - h.bornAt);
        g.fillStyle(ROT_DARK, 0.15 + 0.35 * k); g.fillEllipse(h.x, h.y, CV_R * 2, CV_R * 1.2);
        // The drill: a spiral winding tighter.
        g.lineStyle(2, ROT, 0.8);
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const s = i / 24;
          const a = time / 80 + s * Math.PI * 4;
          const r = CV_R * (1 - s) * (1 - k * 0.3);
          const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r * 0.6;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        g.lineStyle(2, SOUR, 0.4 + 0.4 * k); g.strokeEllipse(h.x, h.y, CV_R * 2, CV_R * 1.2);
      }
    },
    onPhaseEnd() { holes = []; },
  };
};

// ── Signature: Sweet Revenge ─────────────────────────────────────────
// Every sweet left on the floor rots and turns on him: they twitch round the walls, a line runs
// from each to his body, and then they all fly at him at once. You are only hurt if you stand on
// a line. When they hit him, a tooth comes loose — and it is good to eat.

const SR_WARN_MS = 1100;
const SR_SPEED = 360;
const SR_DAMAGE = 10;

const sweetRevenge = (tk: BossToolkit): SignatureMove => {
  interface Rot { x: number; y: number; vx: number; vy: number; color: number; spin: number; done: boolean }
  let rots: Rot[] = [];
  let bornAt = 0;
  let flyAt = 0;
  let target: Pt = { x: 0, y: 0 };
  let toothed = false;
  return {
    durationMs: 2600,
    windupMs: 500,
    gesture: 'flex',
    tell: 'SWEET REVENGE',
    locksBody: true,
    cast() {
      bornAt = tk.now;
      flyAt = bornAt + tk.warn(SR_WARN_MS);
      target = { x: tk.bossX, y: tk.bossY };
      toothed = false;
      const n = tk.hard ? 14 : 12;
      rots = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const x = Phaser.Math.Clamp(target.x + Math.cos(a) * 1000, 30, tk.W - 30);
        const y = Phaser.Math.Clamp(target.y + Math.sin(a) * 1000, TOP + 10, tk.H - 30);
        const d = dist(x, y, target.x, target.y) || 1;
        rots.push({ x, y, vx: ((target.x - x) / d) * SR_SPEED, vy: ((target.y - y) / d) * SR_SPEED, color: mixC(SWEETS[i % SWEETS.length], ROT, 0.5), spin: Math.random() * 6, done: false });
      }
      tk.sfx('curse-cast');
    },
    update(time, dt) {
      if (time < flyAt) return;
      const p = tk.player;
      let flying = 0;
      for (const r of rots) {
        if (r.done) continue;
        flying++;
        r.x += r.vx * dt; r.y += r.vy * dt; r.spin += dt * 10;
        if (dist(r.x, r.y, p.x, p.y) < PLAYER_R + 8) { r.done = true; tk.hitPlayer(SR_DAMAGE, r.x, r.y); tk.sfx('hit-light'); continue; }
        if (dist(r.x, r.y, target.x, target.y) < 30) { r.done = true; tk.boom(target.x, target.y, 26, ROT); }
      }
      if (!flying && !toothed && rots.length) {
        toothed = true;
        tk.host.showFloatingText(target.x, target.y - 60, 'IT ROTS HIM TOO', '#c8f04a');
        tk.spawnHealOrb(target.x + (Math.random() < 0.5 ? -90 : 90), target.y + 40, 8, 6000);
        tk.sfx('crystal-shatter');
      }
    },
    drawGround(g, time) {
      if (!rots.length) return;
      if (time < flyAt) {
        const k = (time - bornAt) / Math.max(1, flyAt - bornAt);
        for (const r of rots) {
          g.lineStyle(10, SOUR, 0.05 + 0.08 * k); g.lineBetween(r.x, r.y, target.x, target.y);
          g.lineStyle(1.5, SOUR, 0.3 + 0.5 * k); g.lineBetween(r.x, r.y, target.x, target.y);
        }
      }
    },
    drawAir(g, time) {
      for (const r of rots) {
        if (r.done) continue;
        const tw = time < flyAt ? Math.sin(time / 40 + r.spin) * 2 : 0;
        wrappedSweet(g, r.x + tw, r.y, 7, r.color, r.spin, 1);
        g.fillStyle(ROT_DARK, 0.8); g.fillCircle(r.x + tw + 2, r.y - 1, 2.2);
      }
    },
    onPhaseEnd() { rots = []; },
  };
};

// ── Signature: Sour Drops ────────────────────────────────────────────
// Sour rain: columns of fizzing green drops fall across the room in three waves, each wave
// stepping across the floor. Read the columns and stand between them.

const SD_WARN_MS = 850;
const SD_HALF = 34;
const SD_DAMAGE = 11;

const sourDrops = (tk: BossToolkit): SignatureMove => {
  interface Col { x: number; bornAt: number; at: number }
  let cols: Col[] = [];
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'raise',
    tell: 'SOUR DROPS',
    cast() {
      const waves = 3;
      const offset = Math.random() * 120;
      for (let w = 0; w < waves; w++) {
        tk.schedule(w * 520, () => {
          const now = tk.now;
          // Columns every 200px, the whole set nudged a little each wave — gaps stay 130px wide.
          for (let x = 60 + offset + w * 60; x < tk.W - 40; x += 200) {
            tk.spawnLane({ x, y: tk.H / 2, angle: Math.PI / 2, halfW: SD_HALF, warnMs: SD_WARN_MS, fireMs: 320, damage: SD_DAMAGE });
            cols.push({ x, bornAt: now, at: now + tk.warn(SD_WARN_MS) });
          }
          tk.sfx('rain');
        });
      }
    },
    update(time) { cols = cols.filter((c) => time < c.at + 500); },
    drawAir(g, time) {
      for (const c of cols) {
        const pre = time < c.at;
        const k = pre ? (time - c.bornAt) / Math.max(1, c.at - c.bornAt) : 1;
        // Drops falling down the column: sparse while it warns, a sheet when it lands.
        const n = pre ? Math.floor(3 + k * 6) : 16;
        for (let i = 0; i < n; i++) {
          const y = TOP + ((i * 47 + time * (pre ? 0.4 : 1.4)) % (tk.H - TOP));
          const x = c.x + ((i * 13) % (SD_HALF * 2)) - SD_HALF;
          g.fillStyle(SOUR, pre ? 0.5 : 0.9); g.fillEllipse(x, y, 4, 9);
        }
        if (!pre) {
          const f = (time - c.at) / 500;
          g.fillStyle(SOUR, 0.25 * (1 - f)); g.fillRect(c.x - SD_HALF, TOP, SD_HALF * 2, tk.H - TOP);
        }
      }
    },
    onPhaseEnd() { cols = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const SACCHARO_BOSS: WorldBossDef = {
  worldId: 'isle:saccharo',
  name: 'Prince Saccharo',
  title: 'His Sweetness, Keeper of the Sweet-Tax',
  color: SACC,
  colorLit: SACC_LIT,
  colorDark: SACC_DARK,
  accent: ACCENT,
  damageMult: 1.05,

  intro: [
    'A visitor! Have you been weighed?',
    'Everyone in Confection is weighed. Most of them come up a little short.',
    'Mother prunes. I merely sweeten. Open wide.',
  ],
  banter: [
    'Fourteen ounces. Fifteen at a push. Never sixteen. Never.',
    'I keep a little glass child for every one I send up the hill. You would look lovely in sugar-glass.',
    'Do you know what I eat? The icing. Only the icing. Somebody else can have the cake.',
    'The salt-folk keep asking for wages. I pay them in the privilege of holding up something sweet.',
    'Every cube in this town has my name on it. Every cube. Every tooth.',
    'Smile! Everyone in my court smiles. It is in the tax.',
  ],
  defeatLine: 'HIS SWEETNESS MELTS AWAY',
  resumeLine: 'Back for seconds? I knew you had a sweet tooth.',

  phases: [
    {
      name: 'Spun Sugar',
      line: 'Hold still. I shall spin you something pretty.',
      hp: 400,
      cycle: [
        'sig:candyFloss', 'volley', 'sig:hardCandy', 'sig:candyCane', 'radial',
        'sig:candyFloss', 'homing', 'sig:hardCandy', 'sig:candyCane', 'barrage',
      ],
      harass: ['h-flak', 'h-orbs', 'h-snipe'],
      restMs: 1080,
      harassMs: 3000,
    },
    {
      name: 'Melt',
      line: 'It is so HOT in here. Look what you have done to my wig. LOOK AT IT.',
      hp: 480,
      cycle: [
        'sig:syrupFlood', 'sig:gumdrops', 'lanes', 'sig:sugarloaf', 'spiral',
        'sig:gumdrops', 'charge', 'sig:syrupFlood', 'sig:sugarloaf', 'hazard',
      ],
      harass: ['h-mines', 'h-flak', 'h-rune', 'h-snipe'],
      restMs: 940,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'SWEETNESS ROTS',
    extraPhase: {
      name: 'Cavity',
      line: 'Something is wrong. It tastes — sour. It all tastes SOUR.',
      hp: 350,
      cycle: [
        'sig:cavities', 'sig:sourDrops', 'sig:sweetRevenge', 'sig:hardCandy',
        'sig:cavities', 'sweep', 'sig:sourDrops', 'sig:sweetRevenge', 'minefield',
      ],
      harass: ['h-rune', 'h-mines', 'h-lane'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.85 },
    radial: { count: 16 },
    lanes: { halfW: 28 },
    hazard: { radius: 60 },
  },

  signatures: {
    candyFloss,
    hardCandy,
    candyCane: candyCaneThrow,
    syrupFlood,
    gumdrops,
    sugarloaf: sugarloafDrop,
    cavities,
    sweetRevenge,
    sourDrops,
  },

  look: { crest: 'none', pattern: 'swirl', aura: 'none', hands: 'ball', torsoR: 34, mouth: 'grin', eyes: 2 },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'hot', look: { pattern: 'drip', mouth: 'maw', aura: 'bubbles', torsoR: 36 } },
    { movement: 'anchor', gimmick: 'shrink', tint: 'sick', look: { pattern: 'cracks', mouth: 'grate', aura: 'smoke', hands: 'claw', torsoR: 38 } },
  ],

  /**
   * Phase one is the dandy: a towering beehive wig of pink candy floss with a glacé cherry on top,
   * a piped-icing ruff, a sugar-glass monocle, and a lollipop sceptre in his hand. Phase two he is
   * melting — the wig slumps sideways and drips, syrup runs off him and pools under him. Cavity
   * rots him: the wig gone grey-green with mould, black cavities pitting his body, and a single
   * gold-capped tooth in a mouth full of rot.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const R = s.radius;
    if (s.phaseIdx === 0) {
      // Ruff of piped icing.
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * 0.1 + (i / 10) * Math.PI * 0.8;
        rosette(g, s.x + Math.cos(a) * R * 0.7, s.y + R * 0.3 + Math.sin(a) * R * 0.22, 6, i % 2 ? ICING : PINK_PALE);
      }
      // Beehive wig: stacked floss lobes swaying, cherry on top.
      const sway = Math.sin(t * 1.4) * 3;
      for (let k = 0; k < 4; k++) {
        floss(g, s.x + sway * (k / 3), s.y - R * (0.95 + k * 0.42), R * (0.78 - k * 0.12), 1, FLOSS, t + k);
      }
      const cy = s.y - R * 2.6;
      g.fillStyle(dim(CHERRY, 0.3), 1); g.fillCircle(s.x + sway + 1, cy + 1, 6);
      g.fillStyle(CHERRY, 1); g.fillCircle(s.x + sway, cy, 5.5);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(s.x + sway - 2, cy - 2, 1.6);
      g.lineStyle(1.2, 0x2a6a2a, 1); g.lineBetween(s.x + sway, cy - 5, s.x + sway + 4, cy - 12);
      // Monocle of sugar glass on a pink ribbon.
      g.lineStyle(2, ICING, 1); g.strokeCircle(s.x + R * 0.32, s.y - R * 0.22, 7);
      g.fillStyle(GLASS, 0.35); g.fillCircle(s.x + R * 0.32, s.y - R * 0.22, 6);
      g.lineStyle(1, PINK, 1); g.lineBetween(s.x + R * 0.38, s.y - R * 0.12, s.x + R * 0.55, s.y + R * 0.4);
      // Lollipop sceptre in the first hand.
      const h = s.hands[0];
      if (h) lollipop(g, h.x, h.y + 14, 9, 22, PINK, ICING, t * 2);
      // The Empress's green sash.
      g.lineStyle(4, VERDIGRA, 0.95); g.lineBetween(s.x - R * 0.7, s.y - R * 0.1, s.x + R * 0.6, s.y + R * 0.6);
      gardenerMark(g, s.x + R * 0.1, s.y + R * 0.28, 5, LEMON, 1);
    } else if (s.phaseIdx === 1) {
      // The wig slumped sideways and dripping.
      for (let k = 0; k < 3; k++) floss(g, s.x - R * 0.3 - k * R * 0.25, s.y - R * (0.85 + k * 0.28), R * (0.7 - k * 0.12), 0.9, mixC(FLOSS, SYRUP_LIT, 0.35), t + k);
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.8 + i / 6) % 1;
        g.fillStyle(SYRUP_LIT, 0.9 * (1 - ph)); g.fillCircle(s.x - R * 0.9 + i * R * 0.35, s.y + R * 0.6 + ph * 22, 3 - ph * 1.5);
      }
      // Syrup runnels down his body and the pool under him.
      g.fillStyle(SYRUP, 0.5); g.fillEllipse(s.x, s.y + R * 1.05, R * 2.4, R * 0.55);
      for (let i = 0; i < 5; i++) {
        const x = s.x - R * 0.6 + i * R * 0.3;
        g.lineStyle(4, SYRUP_LIT, 0.8); g.lineBetween(x, s.y + R * 0.1, x + Math.sin(t * 2 + i) * 2, s.y + R * (0.7 + (i % 2) * 0.2));
      }
      // The sceptre half melted.
      const h = s.hands[0];
      if (h) { g.lineStyle(2, ICING, 1); g.lineBetween(h.x, h.y, h.x, h.y - 18); g.fillStyle(PINK, 1); g.fillEllipse(h.x + 3, h.y - 24, 18, 12); }
    } else {
      // Rot: mouldy wig, pitted body, one gold tooth.
      for (let k = 0; k < 3; k++) floss(g, s.x + Math.sin(t + k) * 2, s.y - R * (0.9 + k * 0.32), R * (0.66 - k * 0.12), 0.9, ROT, t * 0.3 + k);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.1;
        const rr = R * (0.2 + (i % 3) * 0.22);
        g.fillStyle(0x0a0a06, 0.85); g.fillEllipse(s.x + Math.cos(a) * rr, s.y + R * 0.15 + Math.sin(a) * rr * 0.7, 7 - (i % 3), 5);
      }
      g.fillStyle(LEMON, 1); g.fillRoundedRect(s.x - 4, s.y + R * 0.32, 8, 9, 2);
      g.fillStyle(lit(LEMON, 0.5), 1); g.fillRect(s.x - 3, s.y + R * 0.32, 2, 4);
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.4 + i / 4) % 1;
        g.fillStyle(SOUR, 0.5 * (1 - ph)); g.fillCircle(s.x - R + i * R * 0.6, s.y - R * 0.3 - ph * 40, 3 + ph * 4);
      }
    }
    if (s.hurt) {
      // Sugar sparkle knocked off him.
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        g.fillStyle(s.phaseIdx === 2 ? ROT : SUGAR, 0.9);
        g.fillRect(s.x + Math.cos(a) * (R + 6) - 1.5, s.y + Math.sin(a) * (R + 6) - 1.5, 3, 3);
      }
    }
  },

  /**
   * The ballroom of the Bonbonnière: the floor is the top of a great cake seen from above — a
   * disc of pink fondant quilted in diamonds with a silver dragée at every crossing, rings of
   * piped icing round it, rosettes and glacé cherries round the rim, and the chocolate parquet of
   * the hall showing at the corners. In the middle, iced in green, his mother's rose.
   */
  drawArena(g, W, H) {
    g.fillStyle(dim(CHOCOLATE, 0.3), 1); g.fillRect(0, 0, W, H);
    // Chocolate parquet.
    for (let y = TOP - 10, r = 0; y < H; y += 40, r++) {
      for (let x = (r % 2) * 20 - 20; x < W; x += 40) {
        g.fillStyle(r % 2 ? CHOCOLATE : lit(CHOCOLATE, 0.08), 1); g.fillRect(x + 1, y + 1, 38, 18);
        g.fillStyle(r % 2 ? lit(CHOCOLATE, 0.08) : CHOCOLATE, 1); g.fillRect(x + 1, y + 21, 38, 18);
      }
    }
    const cx = W / 2, cy = (H + TOP) / 2;
    const rx = W * 0.5 - 10, ry = (H - TOP) * 0.5 + 10;
    // The cake top.
    g.fillStyle(dim(PINK_PALE, 0.3), 1); g.fillEllipse(cx, cy + 8, rx * 2 + 10, ry * 2 + 10);
    g.fillStyle(PINK_PALE, 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
    // Quilting: a diamond lattice clipped to the ellipse, with dragées.
    const inside = (x: number, y: number): boolean => Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) < 0.92;
    g.lineStyle(1.5, dim(PINK_PALE, 0.12), 0.9);
    for (let d = -W; d < W * 2; d += 44) {
      for (let s = 0; s < 1; s += 0.02) {
        const x0 = d + s * H, y0 = TOP + s * H, x1 = d + (s + 0.02) * H, y1 = TOP + (s + 0.02) * H;
        if (inside(x0, y0) && inside(x1, y1)) g.lineBetween(x0, y0, x1, y1);
        const u0 = d - s * H, u1 = d - (s + 0.02) * H;
        if (inside(u0, y0) && inside(u1, y1)) g.lineBetween(u0, y0, u1, y1);
      }
    }
    for (let x = 0; x < W; x += 22) for (let y = TOP; y < H; y += 22) {
      if ((Math.round(x / 22) + Math.round(y / 22)) % 2 !== 0 || !inside(x, y)) continue;
      g.fillStyle(0xd8dee6, 0.9); g.fillCircle(x, y, 2); g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 0.6, y - 0.6, 0.8);
    }
    // Rings of piped icing.
    for (const f of [0.98, 0.62, 0.3]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * rx * f, y: cy + Math.sin(a) * ry * f }); }
      piping(g, pts, f > 0.9 ? 4 : 2.5, ICING, 0.95);
    }
    // Rosettes and cherries round the rim.
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * 0.9, y = cy + Math.sin(a) * ry * 0.9;
      if (i % 2) rosette(g, x, y, 7, ICING);
      else { g.fillStyle(dim(CHERRY, 0.3), 1); g.fillCircle(x + 1, y + 1, 6); g.fillStyle(CHERRY, 1); g.fillCircle(x, y, 5.5); g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 2, y - 2, 1.5); }
    }
    // The Gardener's rose in green icing at the centre.
    gardenerMark(g, cx, cy, 34, VERDIGRA, 0.75);
    // Drips over the edge at the bottom of the cake, and candy canes leaning in the corners.
    drips(g, cx - rx * 0.6, cx + rx * 0.6, cy + ry * 0.98, 14, () => 0.5, ICING, 0.9);
    candyCane(g, 40, H - 20, 110, 1, CHERRY, 8);
    candyCane(g, W - 40, H - 20, 110, -1, MINT, 8);
  },
};
