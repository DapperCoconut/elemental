import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Vat — Sovereign of the Dissolution. Acid world's boss (world id `slime`,
 * which Acid kept): a walking industrial cauldron that regards everything as
 * pre-dissolved. Canon with the slime challenge, 'The Vat'.
 */

const ACID = 0x66cc44;
const ACID_LIT = 0xc8f56a;
const ACID_DARK = 0x1c3308;
const FUME = 0xe8ff9a;

// ── Signature: Overflow ──────────────────────────────────────────────
// The Vat tips toward you and pours: a widening cone of splash zones that
// leaves the whole spill as burning ground. Sidestep the cone early — the
// spill only ever gets wider.

const overflow = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3000,
  cast(time: number) {
    tk.sfx('acid-spray');
    const a = tk.angleToPlayer();
    for (let step = 1; step <= 4; step++) {
      const width = step * 0.22;
      const dist = 70 + step * 80;
      for (const off of step === 1 ? [0] : [-width, 0, width]) {
        tk.schedule(300 + step * 340, () => {
          tk.spawnZone({
            x: tk.bossX + Math.cos(a + off) * dist,
            y: tk.bossY + Math.sin(a + off) * dist,
            radius: 46, warnMs: 680, damage: 14,
            poolMs: 5600, poolDamage: 7,
          });
        });
      }
    }
    void time;
  },
});

// ── Signature: The Rising Bubbles ────────────────────────────────────
// Bubbles climb from the bottom of the hall. Each pops — at half height, or
// on contact — into a small spray. Individually trivial; the pattern is a
// slowly ascending fence you weave through.

const risingBubbles = (tk: BossToolkit): SignatureMove => {
  interface Bubble { x: number; y: number; popsAtY: number; r: number; done: boolean }
  let bubbles: Bubble[] = [];
  return {
    durationMs: 1600,
    cast(time: number) {
      tk.sfx('spore');
      bubbles = [];
      for (let i = 0; i < 6; i++) {
        bubbles.push({
          x: 80 + ((tk.W - 160) * i) / 5 + Phaser.Math.Between(-24, 24),
          y: tk.H - 30 + i * 18,
          popsAtY: Phaser.Math.Between(200, tk.H - 200),
          r: Phaser.Math.Between(9, 14),
          done: false,
        });
      }
      void time;
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const b of bubbles) {
        if (b.done) continue;
        b.y -= 85 * dt;
        b.x += Math.sin(time / 300 + b.popsAtY) * 18 * dt;
        const touched = p.active && Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < b.r + 16;
        if (touched || b.y <= b.popsAtY) {
          b.done = true;
          tk.boom(b.x, b.y, 22, ACID_LIT);
          if (touched) tk.hitPlayer(9, p.x, p.y);
          for (let k = 0; k < 5; k++) {
            const a = (Math.PI * 2 * k) / 5 + b.popsAtY;
            tk.spawnBullet({
              x: b.x, y: b.y, angle: a, speed: 170,
              damage: 8, color: ACID_LIT, lifeMs: 1600,
            });
          }
        }
      }
      bubbles = bubbles.filter((b) => !b.done && b.y > 120);
    },
    drawAir(g, time) {
      for (const b of bubbles) {
        const sheen = Math.sin(time / 200 + b.x) * 2;
        g.lineStyle(1.5, ACID_LIT, 0.8);
        g.strokeCircle(b.x, b.y, b.r);
        g.fillStyle(ACID, 0.2);
        g.fillCircle(b.x, b.y, b.r);
        g.fillStyle(FUME, 0.7);
        g.fillCircle(b.x - b.r * 0.3 + sheen, b.y - b.r * 0.3, 2);
      }
    },
    onPhaseEnd() { bubbles = []; },
  };
};

// ── Signature: Titration ─────────────────────────────────────────────
// Laboratory precision: two lines of measured drops fall in an X centred on
// the player. Each line is announced by its burette track; the safe wedges
// are the quarters of the X.

const titration = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('curse-cast');
    const p = tk.player;
    const cx = tk.clampX(p.x, 140);
    const cy = tk.clampY(p.y, 150);
    const baseA = Math.random() * Math.PI;
    for (const lineOff of [0, Math.PI / 2]) {
      const a = baseA + lineOff;
      for (let d = -3; d <= 3; d++) {
        tk.schedule(400 + (d + 3) * 210 + (lineOff > 0 ? 1100 : 0), () => {
          tk.spawnZone({
            x: tk.clampX(cx + Math.cos(a) * d * 68, 60),
            y: tk.clampY(cy + Math.sin(a) * d * 68, 100),
            radius: 40, warnMs: 700, damage: 13, fall: true,
            poolMs: 2600, poolDamage: 5,
          });
        });
      }
    }
    void time;
  },
});

export const ACID_BOSS: WorldBossDef = {
  worldId: 'slime',
  name: 'The Vat',
  title: 'Sovereign of the Dissolution',
  color: ACID,
  colorLit: ACID_LIT,
  colorDark: ACID_DARK,
  accent: FUME,
  bodyR: 32,

  intro: ["Dissolve. It's cleaner. Everyone who argued is filtrate now."],
  banter: [
    'pH is a ladder. You are standing on the bottom rung.',
    'The Voice asked what I could not dissolve. I am still compiling the list. It is short.',
    'Nothing washes out. That is not a threat, it is a safety notice.',
    'You would render down to about a cupful. Waste not.',
  ],
  defeatLine: 'THE VAT RUNS EMPTY',

  phases: [
    {
      name: 'The Solution',
      line: 'Step in. The solution takes everyone eventually.',
      hp: 440,
      cycle: [
        'sig:overflow', 'volley', 'sig:bubbles', 'lanes',
        'sig:titration', 'hazard', 'radial', 'slamchain',
      ],
      harass: ['h-rune', 'h-flak', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 45,
      holdDist: 270,
    },
    {
      name: 'Full Saturation',
      line: 'Saturation point. Everything after this precipitates.',
      hp: 490,
      cycle: [
        'sig:titration', 'sig:overflow', 'quake', 'sig:bubbles',
        'homing', 'barrage', 'spiral', 'hazard', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-flak', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 55,
      holdDist: 240,
    },
  ],

  hard: {
    introLine: 'NOTHING HERE WASHES OUT',
    extraPhase: {
      name: 'Aqua Regia',
      line: 'The mixture that dissolves kings. You brought fifteen references.',
      hp: 370,
      cycle: [
        'sig:overflow', 'sig:titration', 'sig:bubbles', 'sanctuary',
        'quake', 'hazard', 'spiral', 'homing',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-flak'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 65,
      holdDist: 220,
    },
  },

  signatures: {
    overflow,
    bubbles: risingBubbles,
    titration,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a1204, 0.5);
    g.fillRect(0, 0, W, H);
    // Etched floor stains and corroded pipework.
    const rnd = new Phaser.Math.RandomDataGenerator(['acid-boss-arena']);
    for (let i = 0; i < 7; i++) {
      g.fillStyle(ACID_DARK, 0.5);
      g.fillEllipse(rnd.integerInRange(60, W - 60), rnd.integerInRange(H * 0.4, H - 40),
        rnd.integerInRange(40, 90), rnd.integerInRange(12, 24));
    }
    g.lineStyle(5, 0x2a3a1a, 0.9);
    g.lineBetween(30, H - 90, W * 0.4, H - 90);
    g.lineBetween(W * 0.4, H - 90, W * 0.4, H - 30);
    g.fillStyle(ACID, 0.35);
    for (let i = 0; i < 3; i++) g.fillCircle(W * 0.4, H - 84 + i * 18, 2.5);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 104, 18);

    // Squat legs of riveted iron.
    for (const side of [-1, 1]) {
      g.lineStyle(7, 0x3a4030, 1);
      g.lineBetween(s.x + side * 20, s.y + 26, s.x + side * 26, s.y + 44);
    }

    // The vat body: a riveted drum, belly slightly bulged.
    g.fillStyle(0x2e3626, 1);
    g.fillEllipse(s.x, s.y + 4, 76, 62);
    g.fillStyle(0x3a4430, 1);
    g.fillEllipse(s.x - 4, s.y, 62, 50);
    // Rivets and a hazard chevron.
    g.fillStyle(0x1c2016, 1);
    for (let i = 0; i < 5; i++) g.fillCircle(s.x - 24 + i * 12, s.y + 20, 2);
    g.fillStyle(ACID_LIT, 0.5);
    g.fillTriangle(s.x - 8, s.y + 10, s.x + 8, s.y + 10, s.x, s.y - 2);

    // The rim and the sloshing surface — tilts toward the player when casting.
    const tilt = Math.cos(s.facing) * (2 + s.castGlow * 5);
    g.fillStyle(0x232a1c, 1);
    g.fillEllipse(s.x, s.y - 26, 70, 20);
    g.fillStyle(ACID, 0.95);
    g.fillEllipse(s.x + tilt, s.y - 26 + Math.sin(t / 240) * 1.5, 58, 14);
    g.fillStyle(ACID_LIT, 0.5);
    g.fillEllipse(s.x + tilt - 8, s.y - 28, 22, 5);
    // Boil bubbles on the surface — harder at low HP.
    const boil = 2 + Math.round((1 - s.hpRatio) * 3);
    for (let i = 0; i < boil; i++) {
      const bx = s.x + tilt + Math.sin(t / 170 + i * 2.6) * 20;
      g.lineStyle(1, FUME, 0.7);
      g.strokeCircle(bx, s.y - 27, 2 + (i % 2));
    }
    // Drips over the rim.
    const drip = (t % 900) / 900;
    g.fillStyle(ACID, 0.9);
    g.fillCircle(s.x + 30, s.y - 18 + drip * 30, 2.6);
    g.fillCircle(s.x - 32, s.y - 14 + ((t + 400) % 900) / 900 * 26, 2.2);

    // The periscope eye-stalk, craning toward the player.
    const ex = Math.cos(s.facing);
    const stalkX = s.x + ex * 18;
    g.lineStyle(5, 0x3a4430, 1);
    g.lineBetween(s.x + ex * 8, s.y - 30, stalkX, s.y - 52);
    g.fillStyle(0x2e3626, 1);
    g.fillCircle(stalkX, s.y - 54, 8);
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xd8ff4a : ACID_LIT;
    g.fillStyle(eye, 1);
    g.fillCircle(stalkX + ex * 3, s.y - 54, 4);
    g.fillStyle(ACID_DARK, 1);
    g.fillCircle(stalkX + ex * 4.5, s.y - 54, 1.8);

    // Fume wisps off the surface.
    for (let i = 0; i < 3; i++) {
      const ph = ((t + i * 500) % 1500) / 1500;
      g.fillStyle(FUME, (1 - ph) * 0.3);
      g.fillCircle(s.x + tilt - 14 + i * 14 + Math.sin(t / 260 + i) * 4, s.y - 32 - ph * 26, 3 + ph * 3);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
