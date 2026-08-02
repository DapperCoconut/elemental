import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Archfiend — Sovereign of the First Flame. Fire world's boss, and the
 * reference implementation for the whole Sovereign line: two phases, a hard-mode
 * third, three bespoke signatures, and a body drawn from scratch.
 *
 * Canon: the fire challenge was always "The Archfiend's Hearth" — this is the
 * thing the hearth belonged to. In hard mode the corruption has finished with
 * it, and the fire runs cold and blue.
 */

// Palette — reads as the fire world (0xff4400) without being a flat orange.
const EMBER = 0xff5a1e;
const EMBER_LIT = 0xffb347;
const EMBER_DARK = 0x651b06;
const GOLD = 0xffe08a;
// The Cold Hearth (hard-mode phase three).
const COLD = 0x5aa8ff;
const COLD_LIT = 0xa8d4ff;

// ── Signature: Hearthfall ────────────────────────────────────────────
// The crown of embers is thrown up and comes down as meteors in a spiral
// around the player, each leaving burning ground. The spiral is the tell:
// read the turn and step against it.

const hearthfall = (tk: BossToolkit): SignatureMove => {
  let castingUntil = 0;
  return {
    durationMs: 2500,
    cast(time: number) {
      tk.sfx('explosion-large');
      castingUntil = time + 2500;
      const p = tk.player;
      const turn = Math.random() < 0.5 ? 1 : -1;
      const a0 = Math.random() * Math.PI * 2;
      for (let k = 0; k < 8; k++) {
        const a = a0 + turn * k * 0.8;
        const r = 46 + k * 30;
        tk.schedule(k * 150, () => {
          tk.spawnZone({
            x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r,
            radius: 55, warnMs: 1350, damage: 22, fall: true,
            poolMs: 5000, poolDamage: 8,
          });
        });
      }
    },
    drawAir(g, time) {
      if (time >= castingUntil) return;
      // Embers streaming up off the Archfiend while the crown is airborne.
      for (let i = 0; i < 9; i++) {
        const seed = i * 977;
        const ph = ((time + seed) % 900) / 900;
        const x = tk.bossX + Math.sin((time + seed) / 170) * (12 + i * 3);
        const y = tk.bossY - 20 - ph * 90;
        g.fillStyle(i % 2 === 0 ? EMBER_LIT : GOLD, (1 - ph) * 0.85);
        g.fillCircle(x, y, 2.5 + (1 - ph) * 1.5);
      }
    },
  };
};

// ── Signature: The Bellows ───────────────────────────────────────────
// An inhale that drags the room toward the mouth — capped well under walk
// speed — while three widening fans of flame come out of it. Fighting the
// pull head-on walks into the fans; drifting sideways solves both.

const bellows = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  return {
    durationMs: 2700,
    cast(time: number) {
      tk.sfx('roar');
      activeUntil = time + 2700;
      tk.pull(tk.bossX, tk.bossY, 105, 2600);
      for (let pulse = 0; pulse < 3; pulse++) {
        tk.schedule(500 + pulse * 700, () => {
          const aim = tk.angleToPlayer();
          const count = 7 + pulse * 2;
          const spread = 0.16 + pulse * 0.05;
          for (let i = 0; i < count; i++) {
            const a = aim + (i - (count - 1) / 2) * spread;
            tk.spawnBullet({
              x: tk.bossX + Math.cos(a) * 34, y: tk.bossY + Math.sin(a) * 34,
              angle: a, speed: 215 + pulse * 35, damage: 12, r: 6,
            });
          }
        });
      }
    },
    drawAir(g, time) {
      if (time >= activeUntil) return;
      // The inhale: streaks of hot air bending in toward the mouth.
      const p = tk.player;
      for (let i = 0; i < 7; i++) {
        const seed = i * 613;
        const ph = ((time * 1.4 + seed) % 700) / 700;
        const a = (Math.PI * 2 * i) / 7 + Math.sin(seed) * 0.9;
        const r = 190 * (1 - ph) + 30;
        const x = tk.bossX + Math.cos(a) * r;
        const y = tk.bossY + Math.sin(a) * r;
        g.lineStyle(1.5, EMBER_LIT, ph * 0.55);
        g.lineBetween(x, y, x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      }
      void p;
    },
  };
};

// ── Signature: Ring of the Pyre ──────────────────────────────────────
// The arena's rim catches fire and the fire walks inward, slowly, with two
// gaps that circle the ring. It closes far under player speed — the demand is
// awareness, not reflexes — and while it stands, the room keeps shrinking.

const RING_CLOSE_SPEED = 44;
const RING_MIN_R = 195;
const RING_LIFE_MS = 6500;
const RING_GAP_HALF = 0.5;
const RING_SPIN = 0.38;
const RING_BAND = 26;
const RING_DAMAGE = 18;
const RING_TICK_MS = 520;

const pyreRing = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0;
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let gapBase = 0;
  let lastHitAt = 0;
  return {
    durationMs: 1400,
    cast(time: number) {
      tk.sfx('judgement');
      active = true;
      bornAt = time;
      cx = tk.W / 2;
      cy = tk.H * 0.55;
      radius = Math.min(tk.W, tk.H) * 0.46 + 40;
      gapBase = tk.angleToPlayer(cx, cy);
      lastHitAt = 0;
    },
    update(time: number, dt: number) {
      if (!active) return;
      if (time > bornAt + RING_LIFE_MS) { active = false; return; }
      radius = Math.max(RING_MIN_R, radius - RING_CLOSE_SPEED * dt);
      const p = tk.player;
      const d = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
      if (Math.abs(d - radius) < RING_BAND && time - lastHitAt > RING_TICK_MS) {
        const a = Math.atan2(p.y - cy, p.x - cx);
        const spin = gapBase + (time - bornAt) / 1000 * RING_SPIN;
        const inGap = [spin, spin + Math.PI].some(
          (gc) => Math.abs(Phaser.Math.Angle.Wrap(a - gc)) < RING_GAP_HALF,
        );
        if (!inGap) {
          lastHitAt = time;
          tk.hitPlayer(RING_DAMAGE, p.x, p.y);
          tk.slowPlayer(0.7, 800);
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const spin = gapBase + (time - bornAt) / 1000 * RING_SPIN;
      const flicker = 1 + Math.sin(time / 90) * 0.06;
      for (const gc of [spin, spin + Math.PI]) {
        const from = gc + RING_GAP_HALF;
        const to = gc + Math.PI - RING_GAP_HALF;
        g.lineStyle(RING_BAND * flicker, EMBER, 0.4);
        g.beginPath();
        g.arc(cx, cy, radius, from, to, false);
        g.strokePath();
        g.lineStyle(3, EMBER_LIT, 0.9);
        g.beginPath();
        g.arc(cx, cy, radius, from, to, false);
        g.strokePath();
        // Tongues of flame licking inward off the wall.
        for (let i = 0; i < 8; i++) {
          const a = from + ((to - from) * (i + 0.5)) / 8;
          const lick = 10 + Math.sin(time / 110 + i * 2.1) * 7;
          g.lineStyle(2, GOLD, 0.7);
          g.lineBetween(
            cx + Math.cos(a) * radius, cy + Math.sin(a) * radius,
            cx + Math.cos(a) * (radius - lick), cy + Math.sin(a) * (radius - lick),
          );
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── The body ─────────────────────────────────────────────────────────

export const FIRE_BOSS: WorldBossDef = {
  worldId: 'fire',
  name: 'The Archfiend',
  title: 'Sovereign of the First Flame',
  color: EMBER,
  colorLit: EMBER_LIT,
  colorDark: EMBER_DARK,
  accent: GOLD,
  bodyR: 28,
  // Tier-0 boss: the first Sovereign anyone meets. Normal mode pulls its punch.
  damageMult: 0.85,

  intro: ['You brought kindling. How thoughtful.'],
  banter: [
    'The hearth remembers every hand it warmed.',
    'Burn properly. You embarrass the flame.',
    'The thing beneath the worlds asked for ash. I deliver.',
    'Even smoke was young once.',
  ],
  defeatLine: 'THE HEARTH STANDS COLD',

  phases: [
    {
      name: 'The Hearth',
      line: 'Come in. The fire is just catching.',
      hp: 360,
      cycle: [
        'volley', 'sig:hearthfall', 'lanes', 'slamchain',
        'stream', 'sig:bellows', 'radial', 'barrage',
      ],
      harass: ['h-flak', 'h-rune', 'h-snipe'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'The Pyre Ascendant',
      line: 'Enough warmth. Now the part that consumes.',
      hp: 430,
      cycle: [
        'sig:pyre', 'quake', 'sig:hearthfall', 'spiral',
        'charge', 'sig:bellows', 'homing', 'barrage', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-orbs', 'h-rune', 'h-snipe'],
      restMs: 980,
      harassMs: 2800,
      moveSpeed: 60,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE FLAME HAS GONE OVER',
    extraPhase: {
      name: 'The Cold Hearth',
      line: 'This is what fire dreams about, at the end.',
      hp: 300,
      cycle: [
        'sig:hearthfall', 'quake', 'sig:bellows', 'sanctuary',
        'spiral', 'sig:pyre', 'homing', 'stream', 'charge',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 760,
      harassMs: 2300,
      moveSpeed: 85,
      holdDist: 230,
    },
  },

  signatures: {
    hearthfall,
    bellows,
    pyre: pyreRing,
  },

  drawArena(g, W, H) {
    // The hearth-hall: a scorched fighting circle with cracked coals at the rim.
    g.fillStyle(0x0a0402, 0.4);
    g.fillRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H * 0.55;
    const R = Math.min(W, H) * 0.46;
    g.lineStyle(4, EMBER_DARK, 0.8);
    g.strokeCircle(cx, cy, R);
    g.lineStyle(1.5, EMBER, 0.3);
    g.strokeCircle(cx, cy, R - 8);
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      const x = cx + Math.cos(a) * (R + 12);
      const y = cy + Math.sin(a) * (R + 12);
      g.fillStyle(i % 3 === 0 ? EMBER : EMBER_DARK, 0.7);
      g.fillCircle(x, y, i % 3 === 0 ? 4 : 6);
    }
    // Cracks radiating from the centre, like a hearthstone that took a blow.
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + 0.4;
      g.lineStyle(1.5, EMBER_DARK, 0.5);
      let x = cx;
      let y = cy;
      let ca = a;
      for (let s = 0; s < 4; s++) {
        const nx = x + Math.cos(ca) * (26 + s * 14);
        const ny = y + Math.sin(ca) * (26 + s * 14);
        g.lineBetween(x, y, nx, ny);
        x = nx; y = ny;
        ca += (Math.random() - 0.5) * 0.9;
      }
    }
  },

  drawBody(g, s) {
    const cold = s.hard && s.phaseIdx >= 2;
    const main = cold ? COLD : EMBER;
    const lit = cold ? COLD_LIT : EMBER_LIT;
    const dark = cold ? 0x11253d : EMBER_DARK;
    const crown = cold ? COLD_LIT : GOLD;
    const t = s.t;
    const flare = s.enraged ? 1.25 : 1;

    // Ground shadow.
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 74, 16);

    // Mantle of flame — a skirt of licking triangles, always moving.
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (0.12 + (0.76 * i) / 9);
      const wob = Math.sin(t / 130 + i * 1.7) * 6;
      const len = (26 + (i % 3) * 9 + wob) * flare;
      const bx = s.x + Math.cos(a + Math.PI) * 34 * Math.sin(a);
      const by = s.y + 24;
      g.fillStyle(i % 2 === 0 ? main : dark, 0.85);
      g.fillTriangle(bx - 7, by, bx + 7, by, bx + wob * 0.4, by + len);
    }

    // Torso: a dark core seamed with ember cracks.
    g.fillStyle(dark, 1);
    g.fillCircle(s.x, s.y + 6, 30);
    g.fillStyle(0x1c0a04, 1);
    g.fillCircle(s.x, s.y + 4, 24);
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + i * 0.62;
      g.lineStyle(2, lit, 0.6 + Math.sin(t / 210 + i) * 0.3);
      g.lineBetween(
        s.x + Math.cos(a) * 8, s.y + 4 + Math.sin(a) * 8,
        s.x + Math.cos(a) * 21, s.y + 4 + Math.sin(a) * 21,
      );
    }

    // Arms: two ember fists, tracking the player. Cast glow heats them white.
    for (const side of [-1, 1]) {
      const reach = 40 + s.castGlow * 10;
      const aa = s.facing + side * 0.85;
      const hx = s.x + Math.cos(aa) * reach;
      const hy = s.y + 8 + Math.sin(aa) * reach * 0.7;
      g.fillStyle(dark, 1);
      g.fillCircle(hx, hy, 11);
      g.fillStyle(main, 0.5 + s.castGlow * 0.5);
      g.fillCircle(hx, hy, 8);
      if (s.castGlow > 0.3) {
        g.fillStyle(0xffffff, (s.castGlow - 0.3) * 0.9);
        g.fillCircle(hx, hy, 4);
      }
    }

    // Head: a horned skull-lantern.
    const hy0 = s.y - 26;
    g.fillStyle(dark, 1);
    g.fillEllipse(s.x, hy0, 34, 28);
    g.fillStyle(0x120602, 1);
    g.fillEllipse(s.x, hy0 + 1, 26, 21);
    // Horns — two swept crescents.
    for (const side of [-1, 1]) {
      g.lineStyle(5, dark, 1);
      g.beginPath();
      g.arc(s.x + side * 22, hy0 - 4, 16, side === 1 ? Math.PI * 1.15 : Math.PI * 1.55,
        side === 1 ? Math.PI * 1.85 : Math.PI * 0.25 + Math.PI * 2, false);
      g.strokePath();
      g.fillStyle(lit, 0.9);
      g.fillCircle(s.x + side * 30, hy0 - 17, 2.2);
    }
    // Eyes track the player. Hurt flashes them white.
    const ex = Math.cos(s.facing) * 3.5;
    const ey = Math.sin(s.facing) * 2.5;
    for (const side of [-1, 1]) {
      g.fillStyle(s.hurt ? 0xffffff : lit, 1);
      g.fillEllipse(s.x + side * 7 + ex, hy0 + ey, 6, s.enraged ? 8 : 5);
    }
    // The mouth: a grate of light.
    g.fillStyle(main, 0.8 + s.castGlow * 0.2);
    g.fillRect(s.x - 8, hy0 + 8, 16, 3);

    // The crown: five small flames riding above the horns.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.8 + (Math.PI * 0.6 * i) / 4;
      const fx = s.x + Math.cos(a) * 24;
      const fy = hy0 - 12 + Math.sin(a) * 8;
      const h = (7 + Math.sin(t / 120 + i * 2.3) * 3) * flare;
      g.fillStyle(crown, 0.95);
      g.fillTriangle(fx - 3, fy, fx + 3, fy, fx, fy - h);
    }

    // Hurt wash.
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.28);
      g.fillCircle(s.x, s.y, 44);
    }
  },
};
