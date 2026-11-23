import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry, type G } from '../../../../art/IsleArt';
import { campo, fireworkBurst, mask, noteGlyph, type MaskKind } from './art';
import {
  CANDLE, FACADE, FACADE_DARK, FACADE_LIT, GILT, GILT_DARK, GILT_LIT, ISTRIA, ISTRIA_LIT, LACQUER, LACQUER_LIT, MIRROR, MIRROR_DARK,
  MIRROR_LIT, PORCELAIN, SEQUINS, SEQ_GOLD, SILK_WHITE, TEAR, VELVET, VELVET_DARK, VELVET_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Facade — the Maestro's first chair of the Masquerade Court.
 *
 * He was born Amadeo Gesso, the mask-maker's boy, and he could not keep a thing off his face:
 * every joy and every sulk was out in the street for all to see. He laughed aloud at Vespers once,
 * at a dog, and the Maestro — passing — found it charming, and terrible. He gave the boy a
 * porcelain mask that never comes off and made him Prince of a court with no faces. Twenty-two
 * years on, Facade speaks of himself as "we", changes masks to change his mood, and cannot
 * remember what he looks like. He fights like a ball:
 *
 * • **Two Masks** (hovering): he swaps between Comedy — a spray of confetti that curls as it
 *   flies — and Tragedy — tear-drops falling from the dark that pool where they land — and skims
 *   his spare face at you, which loops out round you and back to his hand.
 * • **Masked Quartet** (orbiting, pale): he becomes four dancers in identical gowns and masks
 *   waltzing round you; only he casts a shadow, and the decoys burst when struck. He leads the
 *   Grand Promenade, a column of couples marching across the floor with one gap; and he snaps open
 *   a great fan whose feathers fly out and snap back.
 * • **Curtain Call** (hard, blinking, blood-red): the curtain falls across the whole floor and
 *   only the lit bow-spot is safe; and the house throws bouquets, which burst into thorny petals.
 */

const TOP = 96;

/** Shared by the moves and the decor: the phase, the face he is wearing, the quartet. */
let phase = 0;
let face: MaskKind = 'comedy';
let quartetOn = false;

/** The gown and mask of a Quartet dancer — him and every decoy, exactly alike. */
function quartetDancer(g: G, x: number, y: number, R: number, t: number): void {
  const sw = Math.sin(t / 220) * R * 0.12;
  g.fillStyle(FACADE_DARK, 1);
  g.fillTriangle(x - R * 1.25 + sw, y + R * 1.05, x + R * 1.25 + sw, y + R * 1.05, x, y - R * 0.9);
  g.fillEllipse(x + sw, y + R * 1.02, R * 2.5, R * 0.5);
  g.fillStyle(FACADE, 1);
  g.fillTriangle(x - R * 1.08 + sw * 0.8, y + R * 0.95, x + R * 1.08 + sw * 0.8, y + R * 0.95, x, y - R * 0.85);
  g.fillStyle(FACADE_LIT, 0.5); g.fillTriangle(x - R * 0.4, y + R * 0.9, x - R * 0.05, y + R * 0.9, x - R * 0.1, y - R * 0.6);
  for (let i = 0; i < 8; i++) {
    const a = i * 0.9 + t / 300;
    g.fillStyle(SEQUINS[i % 5], 0.5 + Math.sin(t / 90 + i) * 0.4);
    g.fillCircle(x + Math.cos(a) * R * 0.8 + sw * 0.6, y + R * 0.8 + Math.sin(a) * R * 0.12, 1.6);
  }
  g.fillStyle(LACQUER, 1); g.fillEllipse(x, y - R * 0.55, R * 1.3, R * 0.5);
  g.fillStyle(0x2a1a14, 1); g.fillCircle(x, y - R * 0.85, R * 0.45);
  mask(g, x, y - R * 0.85, R / 26, 'volto', PORCELAIN, GILT);
  // A tall bauta hood of black lace over it, and a single white plume.
  g.fillStyle(LACQUER, 0.85); g.fillTriangle(x - R * 0.55, y - R * 0.95, x + R * 0.55, y - R * 0.95, x, y - R * 1.55);
  g.lineStyle(2, SILK_WHITE, 1); g.lineBetween(x + R * 0.2, y - R * 1.4, x + R * 0.55, y - R * 2.05);
  g.fillStyle(SILK_WHITE, 0.9); g.fillEllipse(x + R * 0.5, y - R * 1.85, R * 0.22, R * 0.6);
}

// ── Signature: Comedy ────────────────────────────────────────────────
// He puts on the laughing mask and throws three handfuls of confetti in a fan. Each scrap curls
// as it flies — alternate ones to left and right — so the spray opens and closes like laughter.

interface Scrap { x: number; y: number; a: number; w: number; v: number; born: number; color: number; hit: boolean }

const comedy = (tk: BossToolkit): SignatureMove => {
  let scraps: Scrap[] = [];
  return {
    durationMs: 1500,
    windupMs: 650,
    gesture: 'sweep',
    hold: 'spray',
    tell: 'COMEDY',
    cast() {
      face = 'comedy';
      tk.sfx('sparkle');
      const n = tk.hard ? 10 : 9;
      // At the Curtain Call he laughs longer: a fourth handful.
      const waves = phase >= 2 ? 4 : 3;
      for (let wave = 0; wave < waves; wave++) {
        tk.schedule(wave * 380, () => {
          const base = tk.angleToPlayer();
          const now = tk.now;
          for (let i = 0; i < n; i++) {
            const off = (i / (n - 1) - 0.5) * 1.7;
            const curl = (i % 2 ? 1 : -1) * (1.3 + wave * 0.25);
            scraps.push({ x: tk.bossX, y: tk.bossY - 10, a: base + off, w: curl, v: 215, born: now, color: SEQUINS[(i + wave) % 5], hit: false });
          }
          tk.sfx('whoosh');
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of scraps) {
        s.a += s.w * dt;
        s.x += Math.cos(s.a) * s.v * dt;
        s.y += Math.sin(s.a) * s.v * dt;
        if (!s.hit && p.active && p.hp > 0 && dist(s.x, s.y, p.x, p.y) < 27) { s.hit = true; tk.hitPlayer(8, p.x, p.y); }
      }
      scraps = scraps.filter((s) => !s.hit && time - s.born < 3200 && s.x > -20 && s.x < tk.W + 20 && s.y > TOP - 20 && s.y < tk.H + 20);
    },
    drawAir(g, time) {
      for (const s of scraps) {
        const spin = (time - s.born) / 70;
        const c = Math.cos(spin) * 6, d = Math.sin(spin) * 3;
        g.fillStyle(s.color, 0.35); g.fillCircle(s.x - Math.cos(s.a) * 10, s.y - Math.sin(s.a) * 10, 2.4);
        g.fillStyle(s.color, 1);
        g.fillPoints([{ x: s.x - c, y: s.y - d - 3 }, { x: s.x + c, y: s.y + d - 3 }, { x: s.x + c, y: s.y + d + 3 }, { x: s.x - c, y: s.y - d + 3 }], true);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(s.x + c * 0.5, s.y + d * 0.5 - 2, 1);
      }
    },
    onPhaseEnd() { scraps = []; },
  };
};

// ── Signature: Tragedy ───────────────────────────────────────────────
// He turns the weeping face to you and the dark above the floor weeps with him: tear-drops fall
// on marked spots round you, one after another, and each leaves a pool that slows and stings.

interface Tear { x: number; y: number; at: number; landAt: number; done: boolean }
interface Pool { x: number; y: number; until: number; tick: number }

const tragedy = (tk: BossToolkit): SignatureMove => {
  let tears: Tear[] = [];
  let pools: Pool[] = [];
  return {
    durationMs: 1900,
    windupMs: 700,
    gesture: 'raise',
    tell: 'TRAGEDY',
    cast(time) {
      face = 'tragedy';
      tk.sfx('rain');
      const p = tk.player;
      const n = tk.hard ? 8 : 6;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const r = i === 0 ? 0 : 100 + (i % 2) * 90;
        const a = a0 + i * 2.1;
        tears.push({
          x: tk.clampX(p.x + Math.cos(a) * r), y: tk.clampY(p.y + Math.sin(a) * r * 0.8),
          at: time, landAt: time + tk.warn(1100) + i * 190, done: false,
        });
      }
    },
    update(time) {
      const p = tk.player;
      const up = p.active && p.hp > 0;
      for (const t of tears) {
        if (t.done || time < t.landAt) continue;
        t.done = true;
        tk.sfx('splash');
        if (up && dist(t.x, t.y, p.x, p.y) < 36) tk.hitPlayer(12, p.x, p.y);
        pools.push({ x: t.x, y: t.y, until: time + 5000, tick: 0 });
        if (pools.length > 10) pools.shift();
      }
      tears = tears.filter((t) => !t.done || time - t.landAt < 300);
      for (const pl of pools) {
        if (!up || dist(pl.x, pl.y, p.x, p.y) > 46) continue;
        tk.slowPlayer(0.62, 350);
        if (time > pl.tick) { pl.tick = time + 650; tk.hitPlayer(3, p.x, p.y); }
      }
      pools = pools.filter((pl) => time < pl.until);
    },
    drawGround(g, time) {
      for (const pl of pools) {
        const fade = clamp((pl.until - time) / 700, 0, 1);
        g.fillStyle(dim(TEAR, 0.35), 0.35 * fade); g.fillEllipse(pl.x, pl.y, 96, 40);
        g.fillStyle(TEAR, 0.25 * fade); g.fillEllipse(pl.x - 6, pl.y - 3, 70, 26);
        const ph = ((time / 900) + pl.x * 0.01) % 1;
        g.lineStyle(1.5, lit(TEAR, 0.4), 0.5 * (1 - ph) * fade); g.strokeEllipse(pl.x, pl.y, 30 + ph * 60, 12 + ph * 24);
      }
      for (const t of tears) {
        if (t.done) continue;
        const k = clamp((time - t.at) / Math.max(1, t.landAt - t.at), 0, 1);
        g.fillStyle(0x0a1830, 0.2 + k * 0.35); g.fillEllipse(t.x, t.y, 20 + k * 52, 8 + k * 20);
        g.lineStyle(1.5, TEAR, 0.4 + k * 0.5); g.strokeEllipse(t.x, t.y, 72, 30);
      }
    },
    drawAir(g, time) {
      for (const t of tears) {
        if (t.done) {
          const k = (time - t.landAt) / 300;
          for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; g.fillStyle(TEAR, 1 - k); g.fillCircle(t.x + Math.cos(a) * k * 30, t.y - 4 + Math.sin(a) * k * 22, 2.4); }
          continue;
        }
        const k = clamp((time - t.at) / Math.max(1, t.landAt - t.at), 0, 1);
        const y = TOP - 30 + (t.y - TOP + 30) * k * k;
        const s = 5 + k * 4;
        g.fillStyle(TEAR, 0.95); g.fillCircle(t.x, y, s);
        g.fillTriangle(t.x - s * 0.92, y - s * 0.3, t.x + s * 0.92, y - s * 0.3, t.x, y - s * 2.4);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(t.x - s * 0.35, y - s * 0.2, s * 0.3);
      }
    },
    onPhaseEnd() { tears = []; pools = []; },
  };
};

// ── Signature: The Spare Face ────────────────────────────────────────
// He skims his other mask at you like a plate. It loops out past you on a wide curve and comes
// back to his hand, spinning — the dotted loop is drawn first. On hard, both faces fly.

interface Loop { cx: number; cy: number; ax: number; ay: number; bx: number; by: number; at: number; kind: MaskKind; lastHit: number }

const maskToss = (tk: BossToolkit): SignatureMove => {
  let loops: Loop[] = [];
  const FLY = 1700;
  const pos = (l: Loop, k: number) => {
    const th = Math.PI + k * Math.PI * 2;
    return { x: l.cx + l.ax * Math.cos(th) + l.bx * Math.sin(th), y: l.cy + l.ay * Math.cos(th) + l.by * Math.sin(th) };
  };
  return {
    durationMs: 1800,
    windupMs: 650,
    gesture: 'punch',
    tell: 'THE SPARE FACE',
    cast(time) {
      const p = tk.player;
      const a = tk.angleToPlayer();
      const reach = clamp(dist(tk.bossX, tk.bossY, p.x, p.y) + 110, 220, 640);
      const half = reach / 2;
      const cx = tk.bossX + Math.cos(a) * half, cy = tk.bossY + Math.sin(a) * half;
      const sides = tk.hard ? [1, -1] : [Math.random() < 0.5 ? 1 : -1];
      loops = sides.map((sd) => ({
        cx, cy, ax: Math.cos(a) * half, ay: Math.sin(a) * half,
        bx: -Math.sin(a) * 110 * sd, by: Math.cos(a) * 110 * sd,
        at: time + 350, kind: (face === 'comedy' ? 'tragedy' : 'comedy') as MaskKind, lastHit: 0,
      }));
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const l of loops) {
        const k = (time - l.at) / FLY;
        if (k < 0 || k > 1) continue;
        const m = pos(l, k);
        if (p.active && p.hp > 0 && time - l.lastHit > 500 && dist(m.x, m.y, p.x, p.y) < 36) { l.lastHit = time; tk.hitPlayer(13, p.x, p.y); }
      }
      loops = loops.filter((l) => time - l.at < FLY + 100);
    },
    drawGround(g, time) {
      for (const l of loops) {
        const k0 = clamp((time - l.at) / FLY, 0, 1);
        for (let i = 0; i < 40; i++) {
          const k = i / 40;
          if (k < k0) continue;
          const m = pos(l, k);
          g.fillStyle(GILT, 0.25 + (1 - k0) * 0.3); g.fillCircle(m.x, m.y, 2.2);
        }
      }
    },
    drawAir(g, time) {
      for (const l of loops) {
        const k = (time - l.at) / FLY;
        if (k < 0 || k > 1) continue;
        const m = pos(l, k);
        const spin = Math.cos(time / 45);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(m.x, m.y + 26, 30, 8);
        // A spinning plate of porcelain: squash the mask with the spin.
        g.fillStyle(PORCELAIN, 0.3); g.fillEllipse(m.x, m.y, 44, 40);
        if (Math.abs(spin) > 0.3) mask(g, m.x, m.y, 0.9 * Math.abs(spin), l.kind, PORCELAIN, GILT);
        else { g.fillStyle(GILT_DARK, 1); g.fillRect(m.x - 3, m.y - 15, 6, 30); }
        for (let i = 1; i < 5; i++) { const t = pos(l, Math.max(0, k - i * 0.02)); g.fillStyle(PORCELAIN, 0.3 - i * 0.06); g.fillCircle(t.x, t.y, 12 - i * 2); }
      }
    },
    onPhaseEnd() { loops = []; },
  };
};

// ── Signature: Masked Quartet ────────────────────────────────────────
// He is four dancers in identical gowns and masks, waltzing round you at his distance. Only he
// casts a shadow. Every bar all four curtsey and loose a note at you. Strike a decoy and it bursts
// in glitter — badly, if you are standing on it. Strike HIM and the quartet falls apart.

interface Decoy { off: number; target: StrikeTarget | null; poppedAt: number; x: number; y: number }

const quartet = (tk: BossToolkit): SignatureMove => {
  let decoys: Decoy[] = [];
  let until = 0;
  let nextBar = 0;
  let foundAt = -9999;
  const BAR = 1700;
  const place = (d: Decoy) => {
    const p = tk.player;
    const a = Math.atan2(tk.bossY - p.y, tk.bossX - p.x) + d.off;
    const r = clamp(dist(tk.bossX, tk.bossY, p.x, p.y), 140, 280);
    d.x = tk.clampX(p.x + Math.cos(a) * r);
    d.y = tk.clampY(p.y + Math.sin(a) * r);
  };
  const end = (time: number) => {
    for (const d of decoys) {
      if (d.target) { d.target.remove(); d.target = null; tk.boom(d.x, d.y, 40, FACADE_LIT); }
    }
    decoys = [];
    until = 0;
    quartetOn = false;
    foundAt = time;
  };
  const pop = (d: Decoy) => {
    if (!d.target) return;
    d.target.remove();
    d.target = null;
    d.poppedAt = tk.now;
    tk.explode(d.x, d.y, 62, 11, SEQ_GOLD);
    tk.sfx('sparkle');
  };
  return {
    durationMs: 1300,
    windupMs: 800,
    gesture: 'clap',
    tell: 'MASKED QUARTET',
    cast(time) {
      if (until > time) return;
      until = time + (tk.hard ? 7000 : 6500);
      nextBar = time + BAR;
      quartetOn = true;
      decoys = [Math.PI / 2, Math.PI, Math.PI * 1.5].map((off) => ({ off, target: null, poppedAt: 0, x: tk.bossX, y: tk.bossY }));
      for (const d of decoys) {
        place(d);
        d.target = tk.spawnTarget({ x: d.x, y: d.y, r: 30, onStruck: () => pop(d) });
      }
      tk.sfx('holy-chord');
    },
    update(time) {
      if (!until) return;
      if (time > until) { end(time); return; }
      for (const d of decoys) { place(d); d.target?.moveTo(d.x, d.y); }
      if (time >= nextBar) {
        nextBar = time + BAR;
        const shooters = [{ x: tk.bossX, y: tk.bossY }, ...decoys.filter((d) => d.target)];
        for (const s of shooters) tk.spawnBullet({ x: s.x, y: s.y - 10, angle: tk.angleToPlayer(s.x, s.y), speed: 185, damage: 9, r: 6, lifeMs: 4000, color: GILT_LIT });
        tk.sfx('crystal-chime');
      }
    },
    onBossHurt() {
      if (!until) return;
      end(tk.now);
      tk.boom(tk.bossX, tk.bossY, 60, SEQ_GOLD);
    },
    drawGround(g) {
      if (!until) return;
      // Only the real one casts a shadow.
      g.fillStyle(0x000000, 0.4); g.fillEllipse(tk.bossX, tk.bossY + 36, 80, 20);
      // The waltz circle chalked round you.
      const p = tk.player;
      const r = clamp(dist(tk.bossX, tk.bossY, p.x, p.y), 140, 280);
      g.lineStyle(1.5, GILT, 0.25); g.strokeCircle(p.x, p.y, r);
    },
    drawAir(g, time) {
      for (const d of decoys) if (d.target) quartetDancer(g, d.x, d.y, 34, time + d.off * 300);
      for (const d of decoys) {
        if (d.target || time - d.poppedAt > 700) continue;
        fireworkBurst(g, d.x, d.y - 10, 70, (time - d.poppedAt) / 700, SEQ_GOLD, 18);
      }
      if (time - foundAt < 900) {
        const k = (time - foundAt) / 900;
        g.lineStyle(3, SEQ_GOLD, 1 - k); g.strokeCircle(tk.bossX, tk.bossY, 40 + k * 50);
      }
    },
    onPhaseEnd() { end(tk.now); foundAt = -9999; },
  };
};

// ── Signature: Grand Promenade ───────────────────────────────────────
// He leads a column of masked couples across the whole floor, two by two. The route is chalked in
// footprints first and the one gap in the column — where a couple has parted — glows gold.

interface Column { horiz: boolean; dir: number; gapC: number; at: number; startAt: number; lastHit: number }

const promenade = (tk: BossToolkit): SignatureMove => {
  let cols: Column[] = [];
  const HALF = 38, GAP = 62, SPEED = 175;
  const front = (c: Column, time: number) => {
    const span = c.horiz ? tk.H - TOP : tk.W;
    const k = (time - c.startAt) / 1000 * SPEED;
    const lo = c.horiz ? TOP : 0;
    return c.dir > 0 ? lo - HALF + k : lo + span + HALF - k;
  };
  return {
    durationMs: 1500,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'GRAND PROMENADE',
    cast(time) {
      const p = tk.player;
      // A column that runs across the floor (a vertical band marching left↔right, or a horizontal one marching up↔down).
      const horiz = Math.random() < 0.5;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const along = horiz ? p.x : p.y;
      const lo = horiz ? 90 : TOP + 70, hi = horiz ? tk.W - 90 : tk.H - 60;
      const gapC = clamp(along + (Math.random() - 0.5) * 300, lo, hi);
      cols = [{ horiz, dir, gapC, at: time, startAt: time + tk.warn(950), lastHit: 0 }];
      if (tk.hard) {
        const gap2 = clamp(along + (Math.random() - 0.5) * 300, lo, hi);
        cols.push({ horiz, dir: -dir, gapC: gap2, at: time, startAt: time + tk.warn(950) + 900, lastHit: 0 });
      }
      tk.sfx('drum-hit');
    },
    update(time) {
      const p = tk.player;
      for (const c of cols) {
        if (time < c.startAt) continue;
        const f = front(c, time);
        const pos = c.horiz ? p.y : p.x;
        const across = c.horiz ? p.x : p.y;
        if (Math.abs(pos - f) < HALF + 18 && Math.abs(across - c.gapC) > GAP - 14 && time - c.lastHit > 600 && p.active && p.hp > 0) {
          c.lastHit = time;
          tk.hitPlayer(12, p.x, p.y);
          tk.slowPlayer(0.6, 600);
        }
      }
      cols = cols.filter((c) => time < c.startAt + ((c.horiz ? tk.H - TOP : tk.W) + HALF * 4) / SPEED * 1000);
    },
    drawGround(g, time) {
      for (const c of cols) {
        if (time < c.startAt) {
          const k = clamp((time - c.at) / Math.max(1, c.startAt - c.at), 0, 1);
          // Chalked footprints of the route and the golden gap.
          const lenA = c.horiz ? tk.W : tk.H - TOP;
          for (let s = 0; s < lenA; s += 30) {
            if (Math.abs(s + (c.horiz ? 0 : TOP) - c.gapC) < GAP) continue;
            const px = c.horiz ? s : tk.W / 2 + (s % 60 ? 14 : -14), py = c.horiz ? (TOP + tk.H) / 2 + (s % 60 ? 12 : -12) : TOP + s;
            g.fillStyle(ISTRIA_LIT, 0.15 + k * 0.3); g.fillEllipse(px, py, 8, 5);
          }
          g.fillStyle(SEQ_GOLD, 0.12 + k * 0.2);
          if (c.horiz) g.fillRect(c.gapC - GAP, TOP, GAP * 2, tk.H - TOP); else g.fillRect(0, c.gapC - GAP, tk.W, GAP * 2);
          // The edge it will enter from.
          g.fillStyle(FACADE, 0.25 + k * 0.4);
          if (c.horiz) g.fillRect(0, c.dir > 0 ? TOP : tk.H - 12, tk.W, 12); else g.fillRect(c.dir > 0 ? 0 : tk.W - 12, TOP, 12, tk.H - TOP);
        }
      }
    },
    drawAir(g, time) {
      for (const c of cols) {
        if (time < c.startAt) continue;
        const f = front(c, time);
        const lenA = c.horiz ? tk.W : tk.H - TOP;
        const lo = c.horiz ? 0 : TOP;
        for (let s = 18; s < lenA; s += 44) {
          const across = lo + s;
          if (Math.abs(across - c.gapC) < GAP) continue;
          for (const k of [-1, 1]) {
            const x = c.horiz ? across + k * 6 : f + k * 18, y = c.horiz ? f + k * 18 : across + k * 6;
            const gown = (Math.floor(s / 44) + (k > 0 ? 1 : 0)) % 2 ? FACADE : VELVET;
            const step = Math.sin(time / 160 + s) * 3;
            g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 4, 22, 6);
            g.fillStyle(gown, 1); g.fillTriangle(x - 11, y + step * 0.3, x + 11, y + step * 0.3, x, y - 26);
            g.fillStyle(lit(gown, 0.3), 0.6); g.fillTriangle(x - 4, y, x + 1, y, x - 1, y - 22);
            mask(g, x, y - 32, 0.3, k > 0 ? 'bauta' : 'colombina', PORCELAIN, GILT);
          }
        }
      }
    },
    onPhaseEnd() { cols = []; },
  };
};

// ── Signature: The Fan ───────────────────────────────────────────────
// He snaps open a great feathered fan toward you: its feathers fly out along the ribs of a wide
// cone, hang for a beat at full spread, then snap back into his hand — they cut both ways.

interface Feather { a: number; lastHit: number }

const fan = (tk: BossToolkit): SignatureMove => {
  let feathers: Feather[] = [];
  let at = 0;
  let ox = 0, oy = 0;
  const WARN = 600, OUT = 520, HANG = 260, BACK = 480, REACH = 330;
  const reachAt = (time: number) => {
    const t = time - at - WARN;
    if (t < 0) return 0;
    if (t < OUT) return (t / OUT) * REACH;
    if (t < OUT + HANG) return REACH;
    if (t < OUT + HANG + BACK) return (1 - (t - OUT - HANG) / BACK) * REACH;
    return -1;
  };
  return {
    durationMs: 1900,
    windupMs: 500,
    gesture: 'flex',
    hold: 'brace',
    tell: 'THE FAN',
    cast(time) {
      at = time;
      ox = tk.bossX; oy = tk.bossY;
      const base = tk.angleToPlayer();
      const n = tk.hard ? 11 : 9;
      feathers = [];
      for (let i = 0; i < n; i++) feathers.push({ a: base + (i / (n - 1) - 0.5) * 2.3, lastHit: 0 });
      tk.sfx('wings');
    },
    update(time) {
      if (!feathers.length) return;
      const r = reachAt(time);
      if (r < 0) { feathers = []; return; }
      const p = tk.player;
      if (!(p.active && p.hp > 0)) return;
      for (const f of feathers) {
        const fx = ox + Math.cos(f.a) * r, fy = oy + Math.sin(f.a) * r;
        if (r > 20 && time - f.lastHit > 450 && segDist(p.x, p.y, ox + Math.cos(f.a) * Math.max(0, r - 40), oy + Math.sin(f.a) * Math.max(0, r - 40), fx, fy) < 24) {
          f.lastHit = time; tk.hitPlayer(10, p.x, p.y);
        }
      }
    },
    drawGround(g, time) {
      if (!feathers.length) return;
      if (time - at < WARN) {
        const k = (time - at) / WARN;
        for (const f of feathers) { g.lineStyle(2, FACADE_LIT, 0.2 + k * 0.5); g.lineBetween(ox, oy, ox + Math.cos(f.a) * REACH, oy + Math.sin(f.a) * REACH); }
        g.lineStyle(2, GILT, 0.3 + k * 0.4);
        g.beginPath(); g.arc(ox, oy, REACH, feathers[0].a, feathers[feathers.length - 1].a, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!feathers.length) return;
      const r = reachAt(time);
      if (r <= 0) return;
      // The gilt ribs back to his hand, the feathers at their tips.
      for (const f of feathers) {
        const fx = ox + Math.cos(f.a) * r, fy = oy + Math.sin(f.a) * r;
        g.lineStyle(1.5, GILT_DARK, 0.6); g.lineBetween(ox, oy, fx, fy);
        const ca = Math.cos(f.a), sa = Math.sin(f.a);
        g.fillStyle(FACADE_LIT, 1);
        g.fillTriangle(fx - ca * 40 - sa * 8, fy - sa * 40 + ca * 8, fx - ca * 40 + sa * 8, fy - sa * 40 - ca * 8, fx + ca * 6, fy + sa * 6);
        g.fillStyle(SILK_WHITE, 0.8); g.fillTriangle(fx - ca * 34 - sa * 3, fy - sa * 34 + ca * 3, fx - ca * 34 + sa * 3, fy - sa * 34 - ca * 3, fx + ca * 3, fy + sa * 3);
        g.fillStyle(GILT, 1); g.fillCircle(fx - ca * 20, fy - sa * 20, 2.4);
      }
    },
    onPhaseEnd() { feathers = []; },
  };
};

// ── Signature: Curtain Call (hard) ───────────────────────────────────
// A single bow-spot is lit on the boards, a little way from you. The great red curtain trembles
// at the top of the floor, then falls in one sweep to the bottom. Anyone not in the light when its
// hem passes over them is struck down.

const curtain = (tk: BossToolkit): SignatureMove => {
  let spot: { x: number; y: number } | null = null;
  let at = 0, dropAt = 0, dealt = false;
  const SPOT_R = 62, FALL = 820;
  const hemY = (time: number) => TOP + clamp((time - dropAt) / FALL, 0, 1) * (tk.H - TOP + 30);
  return {
    durationMs: 2700,
    windupMs: 900,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'CURTAIN CALL',
    cast(time) {
      const p = tk.player;
      const a = Math.random() * Math.PI * 2;
      spot = { x: tk.clampX(p.x + Math.cos(a) * 230, 90), y: tk.clampY(p.y + Math.sin(a) * 170, 90) };
      at = time;
      dropAt = time + tk.warn(2000);
      dealt = false;
      tk.sfx('boss-phase');
    },
    update(time) {
      if (!spot || time < dropAt) return;
      const p = tk.player;
      const hem = hemY(time);
      if (!dealt && hem >= p.y - 10) {
        dealt = true;
        if (p.active && p.hp > 0 && dist(p.x, p.y, spot.x, spot.y) > SPOT_R) { tk.hitPlayer(20, p.x, p.y); tk.sfx('explosion-medium'); }
        else tk.sfx('holy-chord');
      }
      if (time > dropAt + FALL + 500) spot = null;
    },
    drawGround(g, time) {
      if (!spot) return;
      const k = clamp((time - at) / Math.max(1, dropAt - at), 0, 1);
      glow(g, spot.x, spot.y, SPOT_R + 20, CANDLE, 0.05 + k * 0.06, 4);
      g.fillStyle(CANDLE, 0.2 + k * 0.25); g.fillEllipse(spot.x, spot.y, SPOT_R * 2, SPOT_R * 1.5);
      g.lineStyle(3, GILT_LIT, 0.6 + k * 0.4); g.strokeEllipse(spot.x, spot.y, SPOT_R * 2, SPOT_R * 1.5);
      // A gilt star on the boards: "stand here".
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        g.fillStyle(GILT, 0.7); g.fillTriangle(spot.x, spot.y, spot.x + Math.cos(a - 0.25) * 12, spot.y + Math.sin(a - 0.25) * 9, spot.x + Math.cos(a) * 26, spot.y + Math.sin(a) * 20);
      }
    },
    drawAir(g, time) {
      if (!spot) return;
      // The beam of the bow-light from above.
      g.fillStyle(CANDLE, 0.08); g.fillTriangle(spot.x - 18, TOP, spot.x + 18, TOP, spot.x - SPOT_R, spot.y);
      g.fillTriangle(spot.x + 18, TOP, spot.x + SPOT_R, spot.y, spot.x - SPOT_R, spot.y);
      // The curtain: trembling at the top during the warning, then the fall.
      const falling = time >= dropAt;
      const hem = falling ? hemY(time) : TOP + 22 + Math.sin(time / 60) * 3;
      const lift = falling && time > dropAt + FALL ? clamp((time - dropAt - FALL) / 500, 0, 1) : 0;
      const a = falling ? 0.62 * (1 - lift) : 0.95;
      g.fillStyle(VELVET_DARK, a); g.fillRect(0, TOP, tk.W, hem - TOP);
      for (let x = 0; x < tk.W; x += 48) {
        g.fillStyle(VELVET, a); g.fillRect(x + 6, TOP, 18, hem - TOP);
        g.fillStyle(VELVET_LIT, a * 0.5); g.fillRect(x + 10, TOP, 5, hem - TOP);
        g.fillStyle(VELVET, a); g.fillEllipse(x + 24, hem, 48, 14);
      }
      g.fillStyle(GILT, a); g.fillRect(0, hem - 2, tk.W, 4);
      for (let x = 6; x < tk.W; x += 14) { g.fillStyle(GILT_DARK, a); g.fillRect(x, hem + 2, 2, 8); }
      if (falling && !lift) { g.fillStyle(CANDLE, 0.25); g.fillEllipse(spot.x, Math.min(hem, spot.y), SPOT_R * 2, 40); }
    },
    onPhaseEnd() { spot = null; },
  };
};

// ── Signature: Bravo! (hard) ─────────────────────────────────────────
// The house throws flowers. Bouquets arc in from the edges of the floor to marked spots round you,
// land with a thump, and burst into a ring of thorny rose petals.

interface Bouquet { x: number; y: number; fromX: number; fromY: number; at: number; landAt: number; done: boolean; color: number }
interface Petal { x: number; y: number; a: number; born: number; hit: boolean }

const bravo = (tk: BossToolkit): SignatureMove => {
  let bouquets: Bouquet[] = [];
  let petals: Petal[] = [];
  return {
    durationMs: 1800,
    windupMs: 500,
    gesture: 'raise',
    tell: 'BRAVO!',
    cast(time) {
      const p = tk.player;
      tk.sfx('roar');
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = i === 0 ? 0 : 120 + Math.random() * 90;
        const edge = i % 2 ? 0 : tk.W;
        bouquets.push({
          x: tk.clampX(p.x + Math.cos(a) * r, 70), y: tk.clampY(p.y + Math.sin(a) * r, 70),
          fromX: edge, fromY: TOP + 40 + Math.random() * 300, at: time, landAt: time + tk.warn(1000) + i * 260, done: false,
          color: [VELVET_LIT, SEQUINS[0], SILK_WHITE, GILT][i],
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const b of bouquets) {
        if (b.done || time < b.landAt) continue;
        b.done = true;
        tk.explode(b.x, b.y, 40, 10, VELVET);
        for (let i = 0; i < 8; i++) petals.push({ x: b.x, y: b.y, a: (i / 8) * Math.PI * 2 + Math.random() * 0.2, born: time, hit: false });
      }
      bouquets = bouquets.filter((b) => !b.done);
      for (const pt of petals) {
        pt.x += Math.cos(pt.a) * 165 * dt; pt.y += Math.sin(pt.a) * 165 * dt;
        if (!pt.hit && p.active && p.hp > 0 && dist(pt.x, pt.y, p.x, p.y) < 25) { pt.hit = true; tk.hitPlayer(6, p.x, p.y); }
      }
      petals = petals.filter((pt) => !pt.hit && time - pt.born < 2600);
    },
    drawGround(g, time) {
      for (const b of bouquets) {
        const k = clamp((time - b.at) / Math.max(1, b.landAt - b.at), 0, 1);
        g.fillStyle(0x000000, 0.2 + k * 0.25); g.fillEllipse(b.x, b.y, 24 + k * 40, 8 + k * 14);
        g.lineStyle(1.5, VELVET_LIT, 0.4 + k * 0.5); g.strokeCircle(b.x, b.y, 40);
      }
    },
    drawAir(g, time) {
      for (const b of bouquets) {
        const k = clamp((time - b.at) / Math.max(1, b.landAt - b.at), 0, 1);
        const x = b.fromX + (b.x - b.fromX) * k, y = b.fromY + (b.y - b.fromY) * k - Math.sin(k * Math.PI) * 150;
        g.lineStyle(3, 0x3a7a3a, 1); g.lineBetween(x, y, x - 4, y + 14); g.lineBetween(x, y, x + 4, y + 14);
        g.fillStyle(b.color, 1); for (let i = 0; i < 5; i++) g.fillCircle(x + Math.cos(i * 1.26) * 6, y - 2 + Math.sin(i * 1.26) * 5, 4);
        g.fillStyle(GILT, 1); g.fillRect(x - 3, y + 6, 6, 3);
        g.lineStyle(1.5, SILK_WHITE, 1); g.lineBetween(x, y + 8, x + 8 + Math.sin(time / 80) * 3, y + 18);
      }
      for (const pt of petals) {
        const s = (time - pt.born) / 60;
        g.fillStyle(VELVET_LIT, 1); g.fillEllipse(pt.x, pt.y, 8 + Math.cos(s) * 3, 5);
        g.fillStyle(0x3a7a3a, 1); g.fillTriangle(pt.x - 2, pt.y, pt.x + 2, pt.y, pt.x - Math.cos(pt.a) * 6, pt.y - Math.sin(pt.a) * 6);
      }
    },
    onPhaseEnd() { bouquets = []; petals = []; },
  };
};

export const FACADE_BOSS: WorldBossDef = {
  worldId: 'isle:facade',
  name: 'Prince Facade',
  title: 'the Two-Faced',
  color: FACADE,
  colorLit: FACADE_LIT,
  colorDark: FACADE_DARK,
  accent: GILT,
  // Tier 3 of the ninth isle.
  damageMult: 1.4,

  intro: [
    'A face! Oh, how vulgar. Everyone, look — the stranger has brought its face to our ball.',
    'We do not have one. We have two. Shall we show you both? We think we shall.',
  ],
  banter: [
    'A choir has no faces, only Parts. We merely keep the choir tidy.',
    'Laugh! No? Then weep. We are not particular.',
    'Do you know how restful a mask is? Nobody can see you being sorry.',
    'The Maestro said our face was charming. Then he said it was too much. Both were true.',
    'Which of us is real? Strike and see. We always wonder.',
  ],
  defeatLine: 'THE MASK SLIPS',
  resumeLine: 'You again. Your face again. It is very persistent, your face.',

  phases: [
    {
      name: 'Two Masks',
      line: 'Comedy for you, and Tragedy for us. Or is it the other way? We forget.',
      hp: 570,
      cycle: [
        'sig:comedy', 'volley', 'sig:tragedy', 'sig:mask', 'radial',
        'sig:tragedy', 'sig:comedy', 'homing', 'sig:mask',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Masked Quartet',
      line: 'Let us dance. All four of us. Find us, if you can — we have not found ourselves in years.',
      hp: 660,
      cycle: [
        'sig:quartet', 'sig:promenade', 'sig:fan', 'lanes', 'sig:quartet',
        'spiral', 'sig:fan', 'sig:promenade', 'barrage',
      ],
      harass: ['h-orbs', 'h-lane'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE HOUSE IS FULL TONIGHT',
    extraPhase: {
      name: 'Curtain Call',
      line: 'Bring down the curtain! Bring it down! Only the one who bows may stand in the light.',
      hp: 490,
      cycle: [
        'sig:curtain', 'sig:bravo', 'sig:comedy', 'sig:curtain', 'sig:fan',
        'sig:bravo', 'sig:tragedy', 'sweep',
      ],
      harass: ['h-rune', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 6, speed: 220, spreadRad: 0.55 },
    radial: { count: 16, speed: 175 },
    spiral: { arms: 4, speed: 160 },
    lanes: { halfW: 26 },
  },

  signatures: {
    comedy,
    tragedy,
    mask: maskToss,
    quartet,
    promenade,
    fan,
    curtain,
    bravo,
  },

  look: {
    crest: 'plume', pattern: 'weave', aura: 'none', hands: 'ball',
    torsoR: 34, mouth: 'none', eyes: 2, eyeColor: GILT,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'pale', look: { crest: 'veil', pattern: 'smooth' } },
    { movement: 'blink', gimmick: 'none', tint: 'blood', look: { crest: 'crown', aura: 'sparks' } },
  ],

  /**
   * The Two-Faced's tells. A porcelain face over his own, with the Part painted in brass on the
   * brow; a black velvet tabarro cape round the shoulders with a gilt clasp; a tricorn under a
   * cascade of violet plumes; the other face held up on a gilt stick in his second hand, and a
   * folded fan in the first. In the Quartet he is a dancer in a violet gown under a black lace
   * hood — exactly as his decoys are. At the Curtain Call his mask has cracked down the middle
   * and he carries a sheaf of roses, and gilt sequins rain off him as he bows.
   */
  drawDecor(g, s) {
    phase = s.phaseIdx;
    if (s.phaseIdx !== 1) quartetOn = false;
    const R = s.radius;
    if (s.phaseIdx === 1 && quartetOn) { quartetDancer(g, s.x, s.y, R, s.t); return; }
    // The tabarro: a cape over the shoulders, gilt clasp at the throat.
    g.fillStyle(LACQUER, 0.95);
    g.fillTriangle(s.x - R * 1.15, s.y + R * 0.9, s.x + R * 1.15, s.y + R * 0.9, s.x, s.y - R * 0.3);
    g.fillEllipse(s.x, s.y - R * 0.1, R * 2.1, R * 0.7);
    g.fillStyle(FACADE, 0.9); g.fillEllipse(s.x, s.y + R * 0.05, R * 1.3, R * 0.28);
    g.fillStyle(GILT, 1); g.fillCircle(s.x, s.y + R * 0.1, 4);
    // The face.
    const kind: MaskKind = s.phaseIdx === 2 ? 'volto' : face;
    mask(g, s.x, s.y - R * 0.35, R / 24, kind, PORCELAIN, GILT, true);
    if (s.phaseIdx === 2) {
      // Cracked down the middle: one half still laughs, one weeps.
      g.lineStyle(2, FACADE_DARK, 1);
      g.lineBetween(s.x, s.y - R * 1.05, s.x - 3, s.y - R * 0.6); g.lineBetween(s.x - 3, s.y - R * 0.6, s.x + 2, s.y - R * 0.2); g.lineBetween(s.x + 2, s.y - R * 0.2, s.x - 1, s.y + R * 0.3);
      g.fillStyle(TEAR, 0.9); g.fillCircle(s.x + R * 0.28, s.y - R * 0.2 + ((s.t / 30) % 20), 2);
    }
    if (s.hurt) { g.fillStyle(0xffffff, 0.35); g.fillEllipse(s.x, s.y - R * 0.35, R * 1.1, R * 1.3); }
    // Tricorn and plumes.
    const hy = s.y - R * 1.05;
    g.fillStyle(LACQUER, 1); g.fillTriangle(s.x - R * 0.9, hy + 6, s.x + R * 0.9, hy + 6, s.x, hy - R * 0.45);
    g.fillStyle(LACQUER_LIT, 1); g.fillTriangle(s.x - R * 0.7, hy + 4, s.x - R * 0.1, hy + 4, s.x - R * 0.35, hy - R * 0.25);
    g.lineStyle(2, GILT, 1); g.lineBetween(s.x - R * 0.9, hy + 6, s.x + R * 0.9, hy + 6);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + 0.3 + i * 0.28 + Math.sin(s.t / 500 + i) * 0.05;
      const px = s.x + R * 0.2 + Math.cos(a) * R * 0.9, py = hy - R * 0.2 + Math.sin(a) * R * 0.9;
      g.fillStyle(i % 2 ? FACADE_LIT : FACADE, 1); g.fillEllipse(px, py, R * 0.32, R * 0.8);
      g.lineStyle(1, FACADE_DARK, 0.7); g.lineBetween(s.x + R * 0.2, hy - R * 0.2, px, py);
    }
    // Hands: the fan, and the other face on its stick (Curtain Call: roses).
    const h0 = s.hands[0], h1 = s.hands[1];
    if (h0) {
      const open = s.castGlow;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 - 0.5 + (i / 5) * (0.4 + open * 1.4);
        g.lineStyle(2, GILT_DARK, 1); g.lineBetween(h0.x, h0.y, h0.x + Math.cos(a) * 20, h0.y + Math.sin(a) * 20);
        g.fillStyle(i % 2 ? FACADE_LIT : SILK_WHITE, 1); g.fillEllipse(h0.x + Math.cos(a) * 22, h0.y + Math.sin(a) * 22, 6, 10);
      }
    }
    if (h1) {
      if (s.phaseIdx === 2) {
        for (let i = 0; i < 5; i++) { g.lineStyle(2, 0x3a7a3a, 1); g.lineBetween(h1.x, h1.y, h1.x - 6 + i * 3, h1.y - 22); g.fillStyle([VELVET_LIT, VELVET, SILK_WHITE][i % 3], 1); g.fillCircle(h1.x - 6 + i * 3, h1.y - 24, 3.5); }
      } else {
        g.lineStyle(2.5, GILT_DARK, 1); g.lineBetween(h1.x, h1.y + 4, h1.x + 2, h1.y - 20);
        mask(g, h1.x + 2, h1.y - 30, 0.42, face === 'comedy' ? 'tragedy' : 'comedy', PORCELAIN, GILT);
      }
    }
    if (s.phaseIdx === 2) {
      for (let i = 0; i < 5; i++) {
        const ph = (s.t / 1200 + i / 5) % 1;
        g.fillStyle(SEQUINS[i], 1 - ph); g.fillRect(s.x - R + i * R * 0.5, s.y + ph * R * 1.4, 3, 3);
      }
    }
    if (s.enraged) { g.lineStyle(1.5, GILT_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The ballroom of the Palazzo Facciata: a marquetry floor laid as a great starburst of light
   * and dark woods round an inlaid porcelain mask; the back wall (under the HUD) one long run of
   * gilt-framed mirrors throwing back the chandeliers; red curtains swagged down both sides;
   * pools of chandelier light on the boards and a frieze of gilt staves along the skirting.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xfacade);
    const cx = W / 2, cy = (H + TOP) / 2 + 10;
    // Marquetry: a starburst of alternating woods.
    g.fillStyle(0x5a3a26, 1); g.fillRect(0, 0, W, H);
    const rays = 32;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 1) / rays) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0x8a5a36 : 0xb88a5a, 1);
      g.fillTriangle(cx, cy, cx + Math.cos(a0) * 900, cy + Math.sin(a0) * 900, cx + Math.cos(a1) * 900, cy + Math.sin(a1) * 900);
    }
    for (let r = 120; r < 700; r += 90) { g.lineStyle(3, GILT_DARK, 0.5); g.strokeCircle(cx, cy, r); }
    // Chandelier light pools.
    for (const [lx, ly] of [[W * 0.22, cy - 60], [W * 0.78, cy - 60], [cx, cy + 140]] as [number, number][]) glow(g, lx, ly, 150, CANDLE, 0.025, 5);
    // The inlaid mask at the heart: porcelain and gilt, half laughing, half weeping.
    g.fillStyle(GILT_DARK, 1); g.fillCircle(cx, cy, 92);
    g.fillStyle(ISTRIA, 1); g.fillCircle(cx, cy, 86);
    mask(g, cx - 28, cy, 2.3, 'comedy', PORCELAIN, GILT);
    mask(g, cx + 28, cy, 2.3, 'tragedy', lit(PORCELAIN, 0.1), GILT);
    g.lineStyle(3, GILT, 0.9); g.strokeCircle(cx, cy, 92);
    // The mirrored back wall.
    g.fillStyle(FACADE_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let x = 10; x < W; x += 96) {
      g.fillStyle(GILT_DARK, 1); g.fillRect(x, 6, 80, 92);
      g.fillStyle(GILT, 1); g.fillRect(x + 3, 9, 74, 86);
      g.fillStyle(MIRROR_DARK, 1); g.fillRect(x + 7, 13, 66, 78);
      g.fillStyle(MIRROR, 0.6); g.fillRect(x + 7, 50, 66, 41);
      g.fillStyle(CANDLE, 0.7); g.fillCircle(x + 40, 34, 6 + rng() * 3);
      g.fillStyle(MIRROR_LIT, 0.4); g.fillTriangle(x + 9, 91, x + 20, 91, x + 70, 15);
    }
    g.fillStyle(GILT_DARK, 1); g.fillRect(0, 100, W, 8);
    for (let k = 0; k < 5; k++) { g.lineStyle(0.8, GILT, 0.8); g.lineBetween(0, 101 + k * 1.4, W, 101 + k * 1.4); }
    for (let x = 30; x < W; x += 60) noteGlyph(g, x, 104, 0.5, GILT_LIT);
    // Curtains down both sides.
    for (const side of [0, 1]) {
      const x0 = side ? W - 46 : 0;
      g.fillStyle(VELVET_DARK, 1); g.fillRect(x0, 108, 46, H - 108);
      for (let f = 0; f < 4; f++) { g.fillStyle(f % 2 ? VELVET : VELVET_LIT, 0.85); g.fillRect(x0 + 4 + f * 11, 108, 5, H - 108); }
      g.fillStyle(GILT, 1); g.fillRect(side ? x0 : x0 + 42, 108, 4, H - 108);
      for (let y = 200; y < H; y += 180) { g.fillStyle(GILT, 1); g.fillCircle(side ? x0 + 2 : x0 + 44, y, 5); }
    }
    // A scatter of sequins from a thousand balls.
    for (let i = 0; i < 120; i++) { g.fillStyle(SEQUINS[i % 5], 0.5 + rng() * 0.4); g.fillRect(60 + rng() * (W - 120), 120 + rng() * (H - 160), 2.5, 2.5); }
    // Leave a hint of the campo through the open garden doors at the bottom.
    campo(g, { x: cx - 140, y: H - 22, w: 280, h: 22 }, rng);
  },
};
