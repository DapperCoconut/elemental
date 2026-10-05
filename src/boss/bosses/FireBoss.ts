import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Archfiend — Sovereign of the First Flame. Fire world's boss, and the
 * reference implementation for the whole Sovereign line: two phases, a hard-mode
 * third, three bespoke signatures, and a horned, cracked, flame-mantled look
 * for the shared rig to wear.
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

// ── The def ──────────────────────────────────────────────────────────

export const FIRE_BOSS: WorldBossDef = {
  worldId: 'fire',
  name: 'The Archfiend',
  title: 'Sovereign of the First Flame',
  color: EMBER,
  colorLit: EMBER_LIT,
  colorDark: EMBER_DARK,
  accent: GOLD,
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

  look: { crest: 'horns', pattern: 'cracks', aura: 'flame', hands: 'gauntlet', torsoR: 36, mouth: 'grate' },

  /**
   * The crown of embers — the thing Hearthfall throws into the air. It rides
   * above the horns the rest of the time, and it is the one piece of the
   * Archfiend the shared look vocabulary has no word for.
   */
  drawDecor(g, s) {
    const crown = s.hard && s.phaseIdx >= 2 ? s.palette.lit : GOLD;
    const top = s.y - s.radius - 18;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.78 + (Math.PI * 0.56 * i) / 4;
      const fx = s.x + Math.cos(a) * (s.radius * 0.8);
      const fy = top + Math.sin(a) * 9;
      const h = (8 + Math.sin(s.t / 120 + i * 2.3) * 3.5) * (s.enraged ? 1.35 : 1);
      g.fillStyle(crown, 0.95);
      g.fillTriangle(fx - 3, fy, fx + 3, fy, fx, fy - h);
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(fx, fy - h * 0.45, 1.2);
    }
    // Embers shedding off the fists while it is winding something up.
    if (s.castGlow > 0.25) {
      for (const h of s.hands) {
        const ph = (s.t % 500) / 500;
        g.fillStyle(crown, (1 - ph) * s.castGlow);
        g.fillCircle(h.x + Math.sin(s.t / 90) * 4, h.y - ph * 22, 2.6);
      }
    }
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'shrink', tint: 'hot', look: { crest: 'mane' } },
    { movement: 'rush', gimmick: 'tremor', tint: 'cold', look: { crest: 'blades', aura: 'frost', hands: 'claw' } },
  ],
};
