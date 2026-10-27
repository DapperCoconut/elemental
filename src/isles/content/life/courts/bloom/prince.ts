import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { bigRose, flower, orangeTub, petal, thornStem } from './art';
import {
  BLOOM_GOLD, BLOOM_PINK, BLOOM_RED, BLOOM_VIOLET, BLOOM_WHITE, GLASS, IRON_SHADE, IRON_WHITE, LEAF, PETALIS,
  PETALIS_DARK, PETALIS_LIT, SOIL, SOIL_DARK, STAMEN, STEM, STONE, STONE_DARK, TERRA, TERRA_DARK, THORN, THORN_DARK,
  VERDIGRIS, WILT,
} from './palette';
import { clamp, dist, segDist, wrapAngle } from './util';

/**
 * Prince Petalis, the Ever-Blooming — Empress Verdigra's son, governor of the Bloom Court.
 *
 * Petalis cannot bear a fallen petal. His mother taught him that what falls is what did not try,
 * and he believed her; he deadheads his own orangery every morning so he never has to watch a
 * bloom go over, and he governs the court the same way. He fights the way a garden grows:
 *
 * • **Full Bloom** (hovering): he beds out the floor in stripes that burst one colour after
 *   another; plants a row of sunflowers whose heads turn to you and spit seed; and breathes a
 *   gale of petals down a cone that shoves you along it, blades of petal riding the wind.
 * • **Wilt** (stalking, the sick tint): the petals fall. Bare thorn canes spring from the walls
 *   and whip across the room in arcs; a briar grows from his feet and follows your footsteps;
 *   his beds now burst into thorn stubble that lingers.
 * • **Perennial** (hard, blinking): cut down, he crumbles to seed — three seeds scatter, two burst
 *   and he regrows from the third; and he blows dandelion clocks, rings of drifting seed that
 *   come down and pop where they land.
 */

const TOP = 96;

/** Phases ended so far, shared by the moves that change with the Wilt. */
let wiltPhase = 0;

// ── Signature: Bedding Out ───────────────────────────────────────────
// Three stripes of bed are laid across the floor, one through you, in three colours. They burst
// one colour after another. From the Wilt on, each burst leaves thorn stubble for a while.

interface Stripe { horiz: boolean; c: number; half: number; color: number; warnAt: number; fireAt: number; dealt: boolean; stubbleUntil: number }

const bedding = (tk: BossToolkit): SignatureMove => {
  let stripes: Stripe[] = [];
  let lastTick = 0;
  const HALF = 36;
  const inStripe = (s: Stripe, x: number, y: number) => Math.abs((s.horiz ? y : x) - s.c) < s.half;
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'sweep',
    tell: 'BEDDING OUT',
    cast(time) {
      const p = tk.player;
      const horiz = Math.random() < 0.5;
      const base = horiz ? p.y : p.x;
      const lo = horiz ? TOP + 50 : 60, hi = horiz ? tk.H - 40 : tk.W - 60;
      const colors = [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET];
      const order = Math.random() < 0.5 ? [0, 1, 2] : [2, 1, 0];
      stripes = [-1, 0, 1].map((k, i) => {
        const c = clamp(base + k * 150, lo, hi);
        const fireAt = time + tk.warn(1150) + order.indexOf(i) * 520;
        return { horiz, c, half: HALF, color: colors[i], warnAt: time, fireAt, dealt: false, stubbleUntil: 0 };
      });
      tk.sfx('spore');
    },
    update(time) {
      const p = tk.player;
      for (const s of stripes) {
        if (s.dealt || time < s.fireAt) continue;
        s.dealt = true;
        if (wiltPhase >= 1) s.stubbleUntil = time + 3500;
        tk.sfx('thorn');
        if (p.active && p.hp > 0 && inStripe(s, p.x, p.y)) { tk.hitPlayer(13, p.x, p.y); tk.slowPlayer(0.7, 500); }
      }
      // Stubble: a lingering scratch.
      if (time - lastTick > 600 && stripes.some((s) => time < s.stubbleUntil && inStripe(s, p.x, p.y))) {
        lastTick = time;
        tk.hitPlayer(3, p.x, p.y);
        tk.slowPlayer(0.7, 650);
      }
      stripes = stripes.filter((s) => !s.dealt || time < s.fireAt + 500 || time < s.stubbleUntil);
    },
    drawGround(g, time) {
      for (const s of stripes) {
        const x0 = s.horiz ? 0 : s.c - s.half, y0 = s.horiz ? s.c - s.half : TOP;
        const w = s.horiz ? tk.W : s.half * 2, h = s.horiz ? s.half * 2 : tk.H - TOP;
        if (time < s.stubbleUntil && s.dealt) {
          const fade = clamp((s.stubbleUntil - time) / 600, 0, 1);
          g.fillStyle(SOIL_DARK, 0.45 * fade); g.fillRect(x0, y0, w, h);
          for (let d = 10; d < (s.horiz ? w : h); d += 22) {
            const px = s.horiz ? x0 + d : s.c + ((d * 7) % 30) - 15, py = s.horiz ? s.c + ((d * 7) % 30) - 15 : y0 + d;
            g.lineStyle(2, THORN, fade); g.lineBetween(px, py + 5, px - 3, py - 6); g.lineBetween(px, py + 5, px + 4, py - 5);
          }
          continue;
        }
        if (s.dealt) {
          const k = clamp((time - s.fireAt) / 500, 0, 1);
          g.fillStyle(s.color, 0.5 * (1 - k)); g.fillRect(x0, y0, w, h);
          continue;
        }
        const k = clamp((time - s.warnAt) / Math.max(1, s.fireAt - s.warnAt), 0, 1);
        g.fillStyle(SOIL, 0.35 + k * 0.25); g.fillRect(x0, y0, w, h);
        g.lineStyle(2, s.color, 0.3 + k * 0.6); g.strokeRect(x0, y0, w, h);
        // Buds along the stripe, swelling with the warning.
        for (let d = 16; d < (s.horiz ? w : h); d += 32) {
          const px = s.horiz ? x0 + d : s.c + (((d / 32) | 0) % 2 ? 12 : -12), py = s.horiz ? s.c + (((d / 32) | 0) % 2 ? 12 : -12) : y0 + d;
          flower(g, px, py, 4 + k * 5, s.color, k > 0.7 ? 'daisy' : 'bud', k);
        }
      }
    },
    drawAir(g, time) {
      for (const s of stripes) {
        if (!s.dealt || time > s.fireAt + 600) continue;
        const k = clamp((time - s.fireAt) / 600, 0, 1);
        const len = s.horiz ? tk.W : tk.H - TOP;
        for (let d = 16; d < len; d += 40) {
          const px = s.horiz ? d : s.c, py = s.horiz ? s.c : TOP + d;
          for (let i = 0; i < 4; i++) petal(g, px + Math.cos(i * 1.6 + d) * k * 34, py - k * 30 + Math.sin(i * 1.6 + d) * k * 20, 1.6, i + time / 100, s.color, 1 - k);
        }
      }
    },
    onPhaseEnd() { stripes = []; },
  };
};

// ── Signature: Sunflower Row ─────────────────────────────────────────
// A row of sunflowers springs up across the room. Each head turns slowly to face you, a line
// showing where it looks; then, one after another, each spits a tight burst of seed.

interface Sunflower { x: number; y: number; growAt: number; fireAt: number; fired: boolean; seed: number }

const sunflowers = (tk: BossToolkit): SignatureMove => {
  let row: Sunflower[] = [];
  let dieAt = 0;
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'raise',
    tell: 'SUNFLOWER ROW',
    cast(time) {
      const p = tk.player;
      // Across the half of the room you are not in.
      const y = p.y > (TOP + tk.H) / 2 ? TOP + 70 : tk.H - 60;
      const n = tk.hard ? 6 : 5;
      row = [];
      for (let i = 0; i < n; i++) {
        const x = 90 + (i * (tk.W - 180)) / (n - 1);
        row.push({ x, y: y + (i % 2 ? 14 : -14), growAt: time, fireAt: time + tk.warn(1400) + i * 380, fired: false, seed: Math.random() * 6 });
      }
      dieAt = time + tk.warn(1400) + n * 380 + 1400;
      tk.sfx('stone-rise');
    },
    update(time) {
      for (const s of row) {
        if (s.fired || time < s.fireAt) continue;
        s.fired = true;
        const a = tk.angleToPlayer(s.x, s.y - 40);
        for (const k of [-1, 0, 1]) tk.spawnBullet({ x: s.x, y: s.y - 40, angle: a + k * 0.16, speed: 230, damage: 8, r: 5, lifeMs: 4000, color: 0x3a2a1a });
        tk.sfx('shotgun');
      }
      if (time > dieAt) row = [];
    },
    drawGround(g) {
      for (const s of row) { g.fillStyle(SOIL_DARK, 0.5); g.fillEllipse(s.x, s.y + 2, 30, 9); }
    },
    drawAir(g, time) {
      const p = tk.player;
      for (const s of row) {
        const grow = clamp((time - s.growAt) / 500, 0, 1);
        const h = 46 * grow;
        g.lineStyle(4, STEM, 1); g.lineBetween(s.x, s.y, s.x, s.y - h);
        g.fillStyle(LEAF, 1); g.fillEllipse(s.x - 8, s.y - h * 0.45, 14, 6); g.fillEllipse(s.x + 8, s.y - h * 0.65, 14, 6);
        if (grow < 1) continue;
        const a = Math.atan2(p.y - (s.y - h), p.x - s.x);
        const hx = s.x + Math.cos(a) * 3, hy = s.y - h + Math.sin(a) * 2;
        // The aim line, while it is still to fire.
        if (!s.fired) {
          const k = clamp(1 - (s.fireAt - time) / 700, 0, 1);
          if (k > 0) { g.lineStyle(1.5, BLOOM_GOLD, 0.25 + k * 0.5); g.lineBetween(hx, hy, hx + Math.cos(a) * 160, hy + Math.sin(a) * 160); }
        }
        for (let i = 0; i < 14; i++) {
          const b = (i / 14) * Math.PI * 2;
          g.fillStyle(i % 2 ? BLOOM_GOLD : lit(BLOOM_GOLD, 0.2), 1);
          g.fillEllipse(hx + Math.cos(b) * 11, hy + Math.sin(b) * 9, 9, 6);
        }
        g.fillStyle(0x4a2e14, 1); g.fillEllipse(hx, hy, 15, 13);
        g.fillStyle(0x2a1a0a, 1); for (let i = 0; i < 6; i++) g.fillCircle(hx + Math.cos(i + s.seed) * 3.5, hy + Math.sin(i + s.seed) * 3, 1.2);
        if (s.fired && time - s.fireAt < 200) { g.fillStyle(0xffffff, 0.5); g.fillCircle(hx, hy, 9); }
      }
    },
    onPhaseEnd() { row = []; },
  };
};

// ── Signature: Petal Storm ───────────────────────────────────────────
// He draws a breath and breathes a gale of petals down a cone. Inside the cone the wind shoves
// you along it, and blades of petal ride the gust. Step out of the cone sideways.

interface Blade { x: number; y: number; vx: number; vy: number; at: number; a: number; dealt: boolean }

const petalStorm = (tk: BossToolkit): SignatureMove => {
  const WARN = 900;
  const BLOW = 2200;
  const HALF_A = 0.48;
  let startAt = 0;
  let ang = 0;
  let ox = 0, oy = 0;
  let active = false;
  let blades: Blade[] = [];
  let lastSpawn = 0;
  const inCone = (x: number, y: number) => Math.abs(wrapAngle(Math.atan2(y - oy, x - ox) - ang)) < HALF_A && dist(x, y, ox, oy) < 760;
  return {
    durationMs: 3400,
    windupMs: 500,
    hold: 'spray',
    tell: 'PETAL STORM',
    cast(time) {
      active = true;
      startAt = time;
      ox = tk.bossX; oy = tk.bossY;
      ang = tk.angleToPlayer();
      blades = [];
      tk.sfx('gust');
    },
    update(time, dtRaw) {
      if (!active) return;
      const blowAt = startAt + tk.warn(WARN);
      const p = tk.player;
      if (time >= blowAt && time < blowAt + BLOW) {
        if (inCone(p.x, p.y)) tk.pull(ox + Math.cos(ang) * 1400, oy + Math.sin(ang) * 1400, 95, 120);
        if (time - lastSpawn > 140) {
          lastSpawn = time;
          for (let i = 0; i < 2; i++) {
            const a = ang + (Math.random() - 0.5) * HALF_A * 1.8;
            blades.push({ x: ox + Math.cos(a) * 30, y: oy + Math.sin(a) * 30, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, at: time, a: Math.random() * 6, dealt: false });
          }
        }
      }
      const dt = clamp(dtRaw, 0, 0.05);
      for (const b of blades) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += 0.3;
        if (!b.dealt && p.active && p.hp > 0 && dist(b.x, b.y, p.x, p.y) < 18) { b.dealt = true; tk.hitPlayer(5, p.x, p.y); }
      }
      blades = blades.filter((b) => !b.dealt && time - b.at < 2600 && b.x > -20 && b.x < tk.W + 20 && b.y > TOP - 20 && b.y < tk.H + 20);
      if (time > blowAt + BLOW + 2600) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const blowAt = startAt + tk.warn(WARN);
      const blowing = time >= blowAt && time < blowAt + BLOW;
      if (time > blowAt + BLOW) return;
      const k = blowing ? 1 : clamp((time - startAt) / (blowAt - startAt), 0, 1);
      g.fillStyle(PETALIS_LIT, (blowing ? 0.14 : 0.06 + k * 0.08));
      g.slice(ox, oy, 760, ang - HALF_A, ang + HALF_A, false); g.fillPath();
      g.lineStyle(2, PETALIS, 0.3 + k * 0.5);
      for (const s of [-1, 1]) g.lineBetween(ox, oy, ox + Math.cos(ang + s * HALF_A) * 760, oy + Math.sin(ang + s * HALF_A) * 760);
      if (blowing) {
        for (let i = 0; i < 14; i++) {
          const ph = ((time / 500) + i * 0.071) % 1;
          const a = ang + (((i * 37) % 20) / 20 - 0.5) * HALF_A * 1.8;
          const r = ph * 700;
          g.lineStyle(1.5, 0xffffff, 0.35 * Math.sin(ph * Math.PI));
          g.lineBetween(ox + Math.cos(a) * r, oy + Math.sin(a) * r, ox + Math.cos(a) * (r + 40), oy + Math.sin(a) * (r + 40));
        }
      }
    },
    drawAir(g, time) {
      for (const b of blades) petal(g, b.x, b.y, 2.6, b.a, PETALIS, 1);
      if (!active) return;
      const blowAt = startAt + tk.warn(WARN);
      if (time >= blowAt && time < blowAt + BLOW) {
        for (let i = 0; i < 20; i++) {
          const ph = ((time / 900) + i * 0.05) % 1;
          const a = ang + Math.sin(i * 2.3) * HALF_A * 0.9;
          petal(g, ox + Math.cos(a) * ph * 600, oy + Math.sin(a) * ph * 600, 1.8, i + time / 80, i % 2 ? PETALIS_LIT : BLOOM_PINK, 0.6 * (1 - ph));
        }
      }
    },
    onPhaseEnd() { active = false; blades = []; },
  };
};

// ── Signature: Thorn Whip ────────────────────────────────────────────
// Wilt. Bare canes spring from the walls, each curled at its root with a fan marking the arc it
// will swing. Then they whip across, one after another.

interface Cane { rx: number; ry: number; a0: number; a1: number; len: number; warnAt: number; swingAt: number; dealt: boolean }

const thornWhip = (tk: BossToolkit): SignatureMove => {
  let canes: Cane[] = [];
  const SWING = 650;
  const LEN = 540;
  const curAngle = (c: Cane, time: number) => {
    const k = clamp((time - c.swingAt) / SWING, 0, 1);
    const e = k * k * (3 - 2 * k);
    return c.a0 + (c.a1 - c.a0) * e;
  };
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'slam',
    tell: 'THORN WHIP',
    cast(time) {
      const n = tk.hard ? 3 : 2;
      canes = [];
      for (let i = 0; i < n; i++) {
        const side = Math.floor(Math.random() * 4);
        const rx = side === 0 ? 10 : side === 1 ? tk.W - 10 : 120 + Math.random() * (tk.W - 240);
        const ry = side === 2 ? TOP + 6 : side === 3 ? tk.H - 6 : TOP + 80 + Math.random() * (tk.H - TOP - 160);
        const inward = Math.atan2((TOP + tk.H) / 2 - ry, tk.W / 2 - rx);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const span = 0.95;
        const warnAt = time;
        canes.push({ rx, ry, a0: inward - dir * span, a1: inward + dir * span, len: LEN, warnAt, swingAt: time + tk.warn(1200) + i * 520, dealt: false });
      }
      tk.sfx('thorn');
    },
    update(time) {
      const p = tk.player;
      for (const c of canes) {
        if (c.dealt || time < c.swingAt || time > c.swingAt + SWING) continue;
        const a = curAngle(c, time);
        if (p.active && p.hp > 0 && segDist(p.x, p.y, c.rx, c.ry, c.rx + Math.cos(a) * c.len, c.ry + Math.sin(a) * c.len) < 20) {
          c.dealt = true;
          tk.hitPlayer(15, p.x, p.y);
          tk.sfx('whip');
        }
      }
      canes = canes.filter((c) => time < c.swingAt + SWING + 700);
    },
    drawGround(g, time) {
      for (const c of canes) {
        if (time >= c.swingAt) continue;
        const k = clamp((time - c.warnAt) / Math.max(1, c.swingAt - c.warnAt), 0, 1);
        g.fillStyle(THORN, 0.06 + k * 0.1);
        g.slice(c.rx, c.ry, c.len, Math.min(c.a0, c.a1), Math.max(c.a0, c.a1), false); g.fillPath();
        g.lineStyle(1.5, THORN_DARK, 0.3 + k * 0.4);
        g.beginPath(); g.arc(c.rx, c.ry, c.len, Math.min(c.a0, c.a1), Math.max(c.a0, c.a1), false); g.strokePath();
        // An arrow at the leading edge: which way it will come.
        const ea = c.a0 + (c.a1 - c.a0) * 0.12;
        g.fillStyle(WILT, 0.4 + k * 0.4);
        g.fillCircle(c.rx + Math.cos(ea) * c.len * 0.8, c.ry + Math.sin(ea) * c.len * 0.8, 5);
      }
    },
    drawAir(g, time) {
      for (const c of canes) {
        const a = time < c.swingAt ? c.a0 : curAngle(c, time);
        const out = time < c.swingAt ? 0.18 + clamp((time - c.warnAt) / 600, 0, 1) * 0.12 : time > c.swingAt + SWING ? 1 - clamp((time - c.swingAt - SWING) / 700, 0, 1) : 1;
        const len = c.len * out;
        const pts = [];
        const bend = (time < c.swingAt + SWING ? 0.25 : 0.05) * Math.sign(c.a1 - c.a0);
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          const aa = a - bend * t * t;
          pts.push({ x: c.rx + Math.cos(aa) * len * t, y: c.ry + Math.sin(aa) * len * t });
        }
        thornStem(g, pts, 5);
        g.fillStyle(THORN_DARK, 1); g.fillCircle(c.rx, c.ry, 9);
      }
    },
    onPhaseEnd() { canes = []; },
  };
};

// ── Signature: The Briar ─────────────────────────────────────────────
// Wilt. A briar grows out of his feet and follows your footsteps, a little slower than you
// walk. Its head bites; its length scratches and drags. Lead it round; it withers in a while.

const briar = (tk: BossToolkit): SignatureMove => {
  const GROW_MS = 3800;
  const LINGER = 4200;
  const SPEED = 165;
  let trail: { x: number; y: number }[] = [];
  let body: { x: number; y: number }[] = [];
  let startAt = 0;
  let active = false;
  let lastRec = 0;
  let headHitAt = 0;
  let bodyTick = 0;
  let travelled = 0;
  return {
    durationMs: 2200,
    windupMs: 600,
    gesture: 'point',
    tell: 'THE BRIAR',
    cast(time) {
      active = true;
      startAt = time;
      trail = [{ x: tk.bossX, y: tk.bossY }];
      body = [{ x: tk.bossX, y: tk.bossY + 10 }];
      travelled = 0;
      lastRec = 0;
      tk.sfx('thorn');
    },
    update(time, dt) {
      if (!active) return;
      const p = tk.player;
      const growing = time < startAt + GROW_MS;
      if (growing && time - lastRec > 110) { lastRec = time; trail.push({ x: p.x, y: p.y + 10 }); }
      if (growing && trail.length > 1) {
        // Advance the head along your recorded footsteps.
        let step = SPEED * clamp(dt, 0, 0.05);
        let head = body[body.length - 1];
        while (step > 0 && trail.length > 1) {
          const nx = trail[1];
          const d = dist(head.x, head.y, nx.x, nx.y);
          if (d <= step) { head = { x: nx.x, y: nx.y }; trail.shift(); step -= d; travelled += d; }
          else { head = { x: head.x + ((nx.x - head.x) / d) * step, y: head.y + ((nx.y - head.y) / d) * step }; travelled += step; step = 0; }
        }
        const last = body[body.length - 1];
        if (dist(last.x, last.y, head.x, head.y) > 14) body.push(head); else body[body.length - 1] = head;
      }
      if (p.active && p.hp > 0) {
        const head = body[body.length - 1];
        if (growing && time - headHitAt > 900 && dist(head.x, head.y, p.x, p.y + 10) < 22) { headHitAt = time; tk.hitPlayer(12, p.x, p.y); tk.slowPlayer(0.6, 600); tk.sfx('stab'); }
        if (time - bodyTick > 500) {
          for (let i = 0; i < body.length - 2; i++) {
            if (segDist(p.x, p.y + 10, body[i].x, body[i].y, body[i + 1].x, body[i + 1].y) < 14) { bodyTick = time; tk.hitPlayer(4, p.x, p.y); tk.slowPlayer(0.7, 500); break; }
          }
        }
      }
      if (time > startAt + GROW_MS + LINGER) { active = false; body = []; }
    },
    drawAir(g, time) {
      if (!active || body.length < 2) return;
      const fade = time > startAt + GROW_MS + LINGER - 700 ? clamp((startAt + GROW_MS + LINGER - time) / 700, 0, 1) : 1;
      thornStem(g, body, 4, fade);
      const head = body[body.length - 1];
      if (time < startAt + GROW_MS) {
        // The growing tip: a hooked bud, reaching.
        g.fillStyle(PETALIS_DARK, 1); g.fillCircle(head.x, head.y, 7);
        g.fillStyle(THORN_DARK, 1);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + time / 200; g.fillTriangle(head.x + Math.cos(a) * 6, head.y + Math.sin(a) * 6, head.x + Math.cos(a + 0.4) * 6, head.y + Math.sin(a + 0.4) * 6, head.x + Math.cos(a + 0.2) * 13, head.y + Math.sin(a + 0.2) * 13); }
      }
    },
    onPhaseEnd() { active = false; body = []; },
  };
};

// ── Signature: Perennial ─────────────────────────────────────────────
// Hard. He is cut down — and crumbles to seed. Three seeds scatter across the room; two of them
// are bursts waiting to happen (red), one is him (gold). The bursts go; he regrows at the third.

interface Seed { x: number; y: number; real: boolean }

const perennial = (tk: BossToolkit): SignatureMove => {
  let seeds: Seed[] = [];
  let startAt = 0;
  let fireAt = 0;
  let active = false;
  let done = false;
  let fromX = 0, fromY = 0;
  return {
    durationMs: 2600,
    windupMs: 500,
    locksBody: true,
    gesture: 'recoil',
    tell: 'PERENNIAL',
    cast(time) {
      active = true; done = false;
      startAt = time;
      fireAt = time + tk.warn(1500);
      fromX = tk.bossX; fromY = tk.bossY;
      const p = tk.player;
      seeds = [];
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3;
        seeds.push({ x: tk.clampX(p.x + Math.cos(a) * 200, 90), y: tk.clampY(p.y + Math.sin(a) * 170, 90), real: false });
      }
      // He comes up at the seed furthest from you.
      seeds.reduce((b, s) => (dist(s.x, s.y, p.x, p.y) > dist(b.x, b.y, p.x, p.y) ? s : b)).real = true;
      tk.sfx('spore');
    },
    update(time) {
      if (!active) return;
      if (!done && time >= fireAt) {
        done = true;
        for (const s of seeds) {
          if (s.real) { tk.host.setBossPos(s.x, s.y); tk.boom(s.x, s.y, 50, LEAF); }
          else tk.explode(s.x, s.y, 78, 14, PETALIS_DARK);
        }
        tk.sfx('stone-rise');
      }
      if (time > fireAt + 700) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const k = clamp((time - startAt) / Math.max(1, fireAt - startAt), 0, 1);
      // Where he fell: a little heap of petals.
      for (let i = 0; i < 8; i++) petal(g, fromX + Math.cos(i) * 16, fromY + 20 + Math.sin(i * 2) * 6, 2, i, WILT, 1 - (done ? clamp((time - fireAt) / 700, 0, 1) : 0));
      for (const s of seeds) {
        if (done) continue;
        const r = s.real ? 50 : 78;
        g.fillStyle(s.real ? BLOOM_GOLD : PETALIS_DARK, 0.1 + k * 0.18); g.fillCircle(s.x, s.y, r);
        g.lineStyle(2, s.real ? BLOOM_GOLD : BLOOM_RED, 0.5 + k * 0.4); g.strokeCircle(s.x, s.y, r);
        // The seed's flight from where he fell.
        const f = clamp((time - startAt) / 500, 0, 1);
        const sx = fromX + (s.x - fromX) * f, sy = fromY + (s.y - fromY) * f - Math.sin(f * Math.PI) * 60;
        g.fillStyle(s.real ? BLOOM_GOLD : 0x4a2e14, 1); g.fillEllipse(sx, sy, 8, 11);
        if (f >= 1 && k > 0.5) { g.lineStyle(2, STEM, 1); g.lineBetween(s.x, s.y, s.x + Math.sin(time / 100) * 2, s.y - 12 * k); }
      }
    },
    onPhaseEnd() { active = false; seeds = []; },
  };
};

// ── Signature: Dandelion Clock ───────────────────────────────────────
// Hard. He blows a seed-head: a ring of parachute seeds drifts out with one gap, wobbling. Each
// seed comes down where it chooses and pops a moment later — the landing ring shows first.

interface Fluff { x: number; y: number; vx: number; vy: number; landAt: number; popAt: number; popped: boolean; seed: number }

const dandelion = (tk: BossToolkit): SignatureMove => {
  let fluff: Fluff[] = [];
  const blow = (time: number, gapCentre: number) => {
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.abs(wrapAngle(a - gapCentre)) < 0.55) continue;
      const sp = 85 + Math.random() * 25;
      const landAt = time + 1600 + Math.random() * 1400;
      fluff.push({ x: tk.bossX, y: tk.bossY - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, landAt, popAt: landAt + tk.warn(800), popped: false, seed: Math.random() * 6 });
    }
  };
  return {
    durationMs: 2400,
    windupMs: 650,
    hold: 'draw',
    tell: 'DANDELION CLOCK',
    cast(time) {
      const g = tk.angleToPlayer();
      blow(time, g + (Math.random() < 0.5 ? 0.4 : -0.4));
      tk.schedule(1100, () => blow(tk.now, g + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1)));
      tk.sfx('gust');
    },
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.05);
      const p = tk.player;
      for (const f of fluff) {
        if (time < f.landAt) {
          f.x += (f.vx + Math.sin(time / 300 + f.seed) * 20) * dt;
          f.y += (f.vy + Math.cos(time / 340 + f.seed) * 14) * dt;
          f.x = tk.clampX(f.x, 30); f.y = tk.clampY(f.y, 30);
        } else if (!f.popped && time >= f.popAt) {
          f.popped = true;
          if (p.active && p.hp > 0 && dist(f.x, f.y, p.x, p.y) < 36) tk.hitPlayer(8, p.x, p.y);
          tk.boom(f.x, f.y, 36, BLOOM_WHITE);
        }
      }
      fluff = fluff.filter((f) => !f.popped || time < f.popAt + 300);
    },
    drawGround(g, time) {
      for (const f of fluff) {
        if (time < f.landAt || f.popped) continue;
        const k = clamp((time - f.landAt) / Math.max(1, f.popAt - f.landAt), 0, 1);
        g.fillStyle(BLOOM_WHITE, 0.1 + k * 0.2); g.fillCircle(f.x, f.y, 36);
        g.lineStyle(1.5, BLOOM_WHITE, 0.5 + k * 0.4); g.strokeCircle(f.x, f.y, 36);
      }
    },
    drawAir(g, time) {
      for (const f of fluff) {
        if (f.popped) continue;
        const aloft = time < f.landAt;
        const y = aloft ? f.y - 16 - Math.sin(time / 200 + f.seed) * 4 : f.y;
        // A parachute: a white starburst on a thread, the seed hanging under.
        g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(f.x, y, f.x, y + 9);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(f.x, y, f.x + Math.cos(a) * 7, y + Math.sin(a) * 4 - 2); }
        g.fillStyle(0x6a4a2a, 1); g.fillEllipse(f.x, y + 10, 2.5, 5);
      }
    },
    onPhaseEnd() { fluff = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const PETALIS_BOSS: WorldBossDef = {
  worldId: 'isle:petalis',
  name: 'Prince Petalis',
  title: 'the Ever-Blooming',
  color: PETALIS,
  colorLit: PETALIS_LIT,
  colorDark: PETALIS_DARK,
  accent: STAMEN,
  // Tier 1 of the third isle.
  damageMult: 0.95,

  intro: [
    'There is a petal on my floor. You brought it in on your boot.',
    'Mother says what falls is what did not try. I try very hard. Shall we see how hard you try?',
  ],
  banter: [
    'Nothing in my court goes over. I take the heads off first.',
    'The pruned are not punished. They are improved. Mother is very good at improving.',
    'Do you know how long a rose stays perfect? A day. I give them a day.',
    'A leggy stripe. A thin measure. A man who answers back. All the same kind of untidy.',
    'Stand still. Things grow better when they stand still.',
  ],
  defeatLine: 'THE PETALS FALL',
  resumeLine: 'Back again. You came up from the root. Mother would approve. I almost do.',

  phases: [
    {
      name: 'Full Bloom',
      line: 'Full bloom. Every bed in the court opens for me. Watch them open.',
      hp: 370,
      cycle: [
        'sig:bedding', 'volley', 'sig:sunflowers', 'hazard', 'sig:storm',
        'radial', 'sig:bedding', 'homing', 'sig:sunflowers', 'sig:storm',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1300,
      harassMs: 3600,
    },
    {
      name: 'Wilt',
      line: 'No. No, no, they are falling. Don\'t LOOK at them. Look at the thorns.',
      hp: 440,
      cycle: [
        'sig:whip', 'sig:briar', 'lanes', 'sig:bedding', 'sig:whip',
        'barrage', 'sig:briar', 'spiral', 'sig:storm',
      ],
      harass: ['h-flak', 'h-rune', 'h-lane'],
      restMs: 1150,
      harassMs: 3100,
    },
  ],

  hard: {
    introLine: 'WHAT IS CUT DOWN COMES BACK',
    extraPhase: {
      name: 'Perennial',
      line: 'Cut me down, then. I come back every spring. Mother made sure of that.',
      hp: 330,
      cycle: [
        'sig:perennial', 'sig:dandelion', 'sig:whip', 'homing',
        'sig:perennial', 'sig:briar', 'sig:dandelion', 'sweep',
      ],
      harass: ['h-orbs', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 210, spreadRad: 0.5 },
    radial: { count: 14, speed: 180 },
    hazard: { radius: 60 },
    spiral: { arms: 3, speed: 165 },
  },

  signatures: {
    bedding,
    sunflowers,
    storm: petalStorm,
    whip: thornWhip,
    briar,
    perennial,
    dandelion,
  },

  look: {
    crest: 'none', pattern: 'swirl', aura: 'petals', hands: 'ball',
    torsoR: 34, mouth: 'grin', eyes: 2, eyeColor: STAMEN,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'sick', look: { aura: 'leaves', mouth: 'stitch', hands: 'claw' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'dust', hands: 'wisp', mouth: 'line' } },
  ],

  /**
   * The Ever-Blooming's tells. His head is the flower: a ruff of great rose petals round his
   * face, a boss of gold stamens on his brow, a leaf collar and a green stem running down. He
   * carries one long-stemmed rose, perfect, in his second hand. In the Wilt the ruff browns and
   * droops and its petals drop as he is hurt, and bare thorn canes break out of his shoulders; in
   * Perennial he is a fresh green bud, sepals closed tight, a seedling's two leaves on his crown.
   */
  drawDecor(g, s) {
    // Reset the shared phase counter on a fresh fight.
    wiltPhase = s.phaseIdx;
    const R = s.radius;
    const wilt = s.phaseIdx === 1;
    const perennialPhase = s.hard && s.phaseIdx >= 2;
    // Leaf collar and stem.
    g.lineStyle(5, STEM, 1); g.lineBetween(s.x, s.y + R * 0.9, s.x + Math.sin(s.t / 600) * 3, s.y + R * 1.5);
    for (const k of [-1, 1]) {
      g.fillStyle(dim(LEAF, 0.2), 1);
      g.fillEllipse(s.x + k * R * 0.55, s.y + R * 0.95, R * 0.8, R * 0.32);
    }
    if (perennialPhase) {
      // A tight green bud: sepals cupping the face, two seedling leaves on top.
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62;
        g.fillStyle(i % 2 ? LEAF : dim(LEAF, 0.2), 0.95);
        g.fillTriangle(s.x + Math.cos(a - 0.3) * R * 0.85, s.y + Math.sin(a - 0.3) * R * 0.85, s.x + Math.cos(a + 0.3) * R * 0.85, s.y + Math.sin(a + 0.3) * R * 0.85, s.x + Math.cos(a) * R * 1.35, s.y + Math.sin(a) * R * 1.35);
      }
      g.lineStyle(3, STEM, 1); g.lineBetween(s.x, s.y - R * 1.2, s.x, s.y - R * 1.6);
      for (const k of [-1, 1]) { g.fillStyle(lit(LEAF, 0.15), 1); g.fillEllipse(s.x + k * 9, s.y - R * 1.65, 16, 7); }
      g.fillStyle(PETALIS, 0.9); g.fillEllipse(s.x, s.y - R * 1.15, 10, 8);
    } else {
      // The ruff of petals: full in Full Bloom; browned, drooping and thinning in the Wilt.
      const n = 12;
      const keep = wilt ? Math.max(3, Math.round(n * (0.25 + s.hpRatio * 0.75))) : n;
      for (let i = 0; i < n; i++) {
        if (i >= keep) continue;
        let a = (i / n) * Math.PI * 2 + Math.sin(s.t / 900) * 0.04;
        if (wilt) a += (Math.cos(a) * 0.35) * (a < Math.PI ? 0 : 1) + 0.25 * Math.sign(Math.cos(a)) * (Math.sin(a) < 0 ? 1 : 0);
        const px = s.x + Math.cos(a) * R * 1.05, py = s.y + Math.sin(a) * R * 1.05 + (wilt ? 6 : 0);
        const c = wilt ? (i % 2 ? WILT : dim(PETALIS, 0.35)) : i % 2 ? PETALIS : lit(PETALIS, 0.12);
        g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(px, py + 1, R * 0.62, R * 0.48);
        g.fillStyle(c, 1); g.fillEllipse(px, py, R * 0.56, R * 0.42);
        g.fillStyle(lit(c, 0.25), 0.6); g.fillEllipse(px - Math.cos(a) * 3, py - Math.sin(a) * 3, R * 0.2, R * 0.14);
      }
      if (wilt) {
        // Petals letting go, and canes breaking out of the shoulders.
        for (let i = 0; i < 3; i++) {
          const ph = (s.t / 1400 + i / 3) % 1;
          petal(g, s.x - R + i * R, s.y + R * 0.6 + ph * R * 1.6, 2.4, ph * 6 + i, WILT, 1 - ph);
        }
        for (const k of [-1, 1]) {
          thornStem(g, [
            { x: s.x + k * R * 0.7, y: s.y - R * 0.5 },
            { x: s.x + k * R * 1.2, y: s.y - R * 1.0 },
            { x: s.x + k * R * 1.35, y: s.y - R * 1.6 + Math.sin(s.t / 300 + k) * 3 },
          ], 3);
        }
      } else {
        // The stamen boss on his brow.
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i - 4) * 0.22;
          g.lineStyle(1.5, dim(STAMEN, 0.3), 1); g.lineBetween(s.x, s.y - R * 0.7, s.x + Math.cos(a) * R * 0.95, s.y + Math.sin(a) * R * 0.95 - R * 0.2);
          g.fillStyle(STAMEN, 1); g.fillCircle(s.x + Math.cos(a) * R * 0.95, s.y + Math.sin(a) * R * 0.95 - R * 0.2, 2.6);
        }
      }
    }
    // The one perfect rose in his second hand (gone to a hip in the Wilt).
    const hand = s.hands[1];
    if (hand) {
      const tx = hand.x + 4, ty = hand.y - 30 - s.castGlow * 6;
      g.lineStyle(2.5, STEM, 1); g.lineBetween(hand.x, hand.y + 6, tx, ty);
      g.fillStyle(LEAF, 1); g.fillEllipse(hand.x + 6, hand.y - 12, 9, 4);
      if (wilt) { g.fillStyle(0xb84a22, 1); g.fillEllipse(tx, ty, 8, 10); g.fillStyle(THORN_DARK, 1); g.fillRect(tx - 1, ty - 7, 2, 3); }
      else bigRose(g, tx, ty, 9 + s.castGlow * 2, perennialPhase ? PETALIS_LIT : BLOOM_RED, 1);
    }
    if (s.enraged) { g.lineStyle(1.5, PETALIS_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.45); }
  },

  /**
   * The orangery floor: chequered terracotta and cream under a glass roof whose iron lattice
   * throws long bars of shadow, white columns and tubbed orange trees down the long walls, a
   * round bed of the Prince's roses at the heart, and not a single petal on the tiles — yet.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x9e7a15);
    const T = 40;
    for (let y = 0; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + (y / T)) % 2;
        g.fillStyle(k ? TERRA : 0xe8dcc6, 1); g.fillRect(x, y, T, T);
        g.fillStyle(k ? TERRA_DARK : 0xcfc2a8, 0.25); g.fillRect(x, y + T - 3, T, 3);
      }
    }
    // Lattice shadows from the glass roof.
    for (let i = -6; i < 16; i++) {
      g.lineStyle(10, 0x000000, 0.06);
      g.lineBetween(i * 90, 100, i * 90 + 320, H);
    }
    for (let y = 150; y < H; y += 130) { g.lineStyle(8, 0x000000, 0.05); g.lineBetween(0, y, W, y + 40); }
    // The glazed back wall under the HUD: white iron bays, oranges behind the glass.
    g.fillStyle(dim(LEAF, 0.45), 1); g.fillRect(0, 0, W, 100);
    for (let i = 0; i < 30; i++) { g.fillStyle(dim(LEAF, 0.2), 1); g.fillCircle(rng() * W, 30 + rng() * 60, 16 + rng() * 10); }
    for (let i = 0; i < 40; i++) { g.fillStyle(0xf0902a, 0.9); g.fillCircle(rng() * W, 30 + rng() * 60, 3); }
    g.fillStyle(GLASS, 0.3); g.fillRect(0, 0, W, 100);
    for (let x = 0; x <= W; x += 80) {
      g.fillStyle(IRON_SHADE, 1); g.fillRect(x - 4, 0, 8, 104);
      g.fillStyle(IRON_WHITE, 1); g.fillRect(x - 2, 0, 4, 104);
    }
    g.fillStyle(STONE_DARK, 1); g.fillRect(0, 100, W, 10);
    g.fillStyle(STONE, 1); g.fillRect(0, 100, W, 6);
    // Orange tubs down both walls.
    for (let y = 200; y < H - 40; y += 150) { orangeTub(g, 30, y, 0.8, rng); orangeTub(g, W - 30, y + 60, 0.8, rng); }
    // The rose bed at the heart.
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(STONE_DARK, 1); g.fillCircle(cx, cy, 96);
    g.fillStyle(STONE, 1); g.fillCircle(cx, cy, 90);
    g.fillStyle(SOIL, 1); g.fillCircle(cx, cy, 80);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, d = rng() * 70;
      g.fillStyle(LEAF, 1); g.fillEllipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d + 3, 10, 6);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, d = i % 2 ? 58 : 34;
      bigRose(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 9, [PETALIS, BLOOM_RED, BLOOM_PINK][i % 3], 1);
    }
    bigRose(g, cx, cy, 14, PETALIS, 1);
    g.lineStyle(2, VERDIGRIS, 0.6); g.strokeCircle(cx, cy, 104);
    // A gilt inlay ring and four star points in the tiles.
    g.lineStyle(3, BLOOM_GOLD, 0.35); g.strokeCircle(cx, cy, 200);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      g.fillStyle(BLOOM_GOLD, 0.25);
      g.fillTriangle(cx + Math.cos(a - 0.1) * 110, cy + Math.sin(a - 0.1) * 110, cx + Math.cos(a + 0.1) * 110, cy + Math.sin(a + 0.1) * 110, cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
    }
    // Warm light at the edges, as under glass.
    for (let i = 0; i < 6; i++) { g.lineStyle(40, 0xfff2b0, 0.04); g.strokeRect(i * 18, i * 18, W - i * 36, H - i * 36); }
  },
};
