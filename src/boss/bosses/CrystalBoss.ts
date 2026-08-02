import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Prism Throne — Sovereign of the Lattice. Crystal world's boss: a seated
 * geometry that never moves and never needs to — the light does the work.
 * Canon with the crystal challenge, 'The Prism Throne'.
 */

const FACET = 0x88ccff;
const FACET_LIT = 0xffffff;
const FACET_DARK = 0x1a2a44;
const REFRACT = 0xffb8f0;

// ── Signature: Refraction ────────────────────────────────────────────
// Three beams lance out through the player; a beat later each re-casts from
// where it crossed the arena rim, bent 45 degrees — the second wave arrives
// from directions the first wave taught you to ignore.

const refraction = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3100,
  cast(time: number) {
    tk.sfx('judgement');
    const p = tk.player;
    const base = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
    for (const off of [-0.35, 0, 0.35]) {
      const a = base + off;
      tk.spawnLane({ x: tk.bossX, y: tk.bossY, angle: a, halfW: 20, warnMs: 950, damage: 18 });
      // The bounce: a mirror point out along the beam, re-firing bent.
      const mx = tk.clampX(tk.bossX + Math.cos(a) * 330, 60);
      const my = tk.clampY(tk.bossY + Math.sin(a) * 330, 100);
      tk.schedule(1250, () => {
        tk.spawnLane({ x: mx, y: my, angle: a + Math.PI / 4, halfW: 20, warnMs: 900, damage: 18 });
        tk.boom(mx, my, 18, REFRACT);
      });
    }
    void time;
  },
});

// ── Signature: The Orbit ─────────────────────────────────────────────
// Shards rise and circle the throne for the rest of the phase — a floor the
// player has to keep reading. Each cast adds three, up to nine.

const ORBIT_MAX = 9;
const ORBIT_DAMAGE = 12;

const theOrbit = (tk: BossToolkit): SignatureMove => {
  interface Shard { angle: number; radius: number; spin: number; lastHitAt: number }
  let shards: Shard[] = [];
  return {
    durationMs: 900,
    cast(time: number) {
      tk.sfx('shield-up');
      for (let i = 0; i < 3 && shards.length < ORBIT_MAX; i++) {
        shards.push({
          angle: Math.random() * Math.PI * 2,
          radius: 90 + shards.length * 14,
          spin: (shards.length % 2 === 0 ? 1 : -1) * (0.9 + Math.random() * 0.5),
          lastHitAt: 0,
        });
      }
      void time;
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const sh of shards) {
        sh.angle += sh.spin * dt;
        const x = tk.bossX + Math.cos(sh.angle) * sh.radius;
        const y = tk.bossY + Math.sin(sh.angle) * sh.radius * 0.8;
        if (p.active && Phaser.Math.Distance.Between(x, y, p.x, p.y) < 20
          && time - sh.lastHitAt > 800) {
          sh.lastHitAt = time;
          tk.hitPlayer(ORBIT_DAMAGE, p.x, p.y);
        }
      }
    },
    drawAir(g, time) {
      for (const sh of shards) {
        const x = tk.bossX + Math.cos(sh.angle) * sh.radius;
        const y = tk.bossY + Math.sin(sh.angle) * sh.radius * 0.8;
        const spin = time / 200 + sh.angle;
        g.fillStyle(FACET, 0.9);
        g.fillTriangle(
          x + Math.cos(spin) * 9, y + Math.sin(spin) * 9,
          x + Math.cos(spin + 2.4) * 7, y + Math.sin(spin + 2.4) * 7,
          x + Math.cos(spin + 4.2) * 7, y + Math.sin(spin + 4.2) * 7,
        );
        g.fillStyle(FACET_LIT, 0.5);
        g.fillCircle(x, y, 2);
      }
    },
    onPhaseEnd() { shards = []; },
  };
};

// ── Signature: Prism Lance ───────────────────────────────────────────
// Three beams, 120 degrees apart, sweep the whole hall at once off the
// throne. Slow enough to walk with — the discipline is not panicking when
// all three are moving.

const prismLance = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('screech');
    const start = tk.angleToPlayer() + Math.PI * 0.5;
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const a0 = start + (Math.PI * 2 * i) / 3;
      tk.spawnSweep({
        ox: tk.bossX, oy: tk.bossY,
        a0, a1: a0 + dir * Math.PI * 0.66,
        warnMs: 900, travelMs: 2400, halfW: 18, damage: 20,
      });
    }
    void time;
  },
});

export const CRYSTAL_BOSS: WorldBossDef = {
  worldId: 'crystal',
  name: 'The Prism Throne',
  title: 'Sovereign of the Lattice',
  color: FACET,
  colorLit: FACET_LIT,
  colorDark: FACET_DARK,
  accent: REFRACT,
  bodyR: 30,

  intro: ['Light bends for me. You will too — the knees, at least.'],
  banter: [
    'Every facet knows where you are. They compare notes.',
    'The Voice found nothing in me to hollow. I am already all surface.',
    'Symmetry is not beauty. Symmetry is aim.',
    'You scratch. I remember every scratch. Forever.',
  ],
  defeatLine: 'THE LATTICE GOES DARK',

  phases: [
    {
      name: 'The Facets',
      line: 'Sit anywhere. The light will find you.',
      hp: 430,
      cycle: [
        'sig:refraction', 'volley', 'sig:orbit', 'lanes',
        'sig:lance', 'minefield', 'radial', 'barrage',
      ],
      harass: ['h-lane', 'h-flak', 'h-snipe'],
      restMs: 1100,
      harassMs: 3300,
    },
    {
      name: 'The Throne Refracts',
      line: 'Now the room joins in. It has always wanted to.',
      hp: 470,
      cycle: [
        'sig:lance', 'sig:orbit', 'quake', 'sig:refraction',
        'homing', 'spiral', 'stream', 'lanes', 'minefield',
      ],
      harass: ['h-lane', 'h-orbs', 'h-flak', 'h-snipe'],
      restMs: 950,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE LATTICE REMEMBERS EVERYTHING',
    extraPhase: {
      name: 'White Light',
      line: 'All colours at once. All angles at once. All of it, at once.',
      hp: 360,
      cycle: [
        'sig:refraction', 'sig:lance', 'sanctuary', 'sig:orbit',
        'quake', 'spiral', 'sig:refraction', 'stream',
      ],
      harass: ['h-lane', 'h-orbs', 'h-rune', 'h-flak'],
      restMs: 750,
      harassMs: 2300,
    },
  },

  signatures: {
    refraction,
    orbit: theOrbit,
    lance: prismLance,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x060a14, 0.5);
    g.fillRect(0, 0, W, H);
    // A cathedral of standing crystals at the rim, thin light shafts between.
    const rnd = new Phaser.Math.RandomDataGenerator(['crystal-boss-arena']);
    for (let i = 0; i < 9; i++) {
      const x = 50 + ((W - 100) * i) / 8;
      const h = rnd.integerInRange(30, 70);
      const y = i % 2 === 0 ? H - 30 : 110;
      const dir = i % 2 === 0 ? -1 : 1;
      g.fillStyle(FACET_DARK, 0.9);
      g.fillTriangle(x - 10, y, x + 10, y, x, y + dir * h);
      g.lineStyle(1, FACET, 0.4);
      g.lineBetween(x - 4, y, x, y + dir * h * 0.8);
    }
    for (let i = 0; i < 4; i++) {
      const x = rnd.integerInRange(W * 0.2, W * 0.8);
      g.fillStyle(FACET, 0.04);
      g.fillTriangle(x - 6, 96, x + 6, 96, x + rnd.integerInRange(-24, 24), H * 0.75);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 50, 110, 18);

    // The throne: a fan of great shards behind the seated figure.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      const len = 56 - Math.abs(i - 2) * 10;
      const bx = s.x + Math.cos(a) * 14;
      const by = s.y + 16 + Math.sin(a) * 8;
      g.fillStyle(i % 2 === 0 ? FACET_DARK : 0x24385c, 1);
      g.fillTriangle(
        bx - 9, by, bx + 9, by,
        bx + Math.cos(a) * len, by + Math.sin(a) * len,
      );
      g.lineStyle(1, FACET, 0.5);
      g.lineBetween(bx, by, bx + Math.cos(a) * len * 0.9, by + Math.sin(a) * len * 0.9);
    }

    // The seated figure: a diamond torso over a plinth.
    g.fillStyle(FACET_DARK, 1);
    g.fillRect(s.x - 26, s.y + 30, 52, 16); // plinth
    g.fillStyle(FACET, 0.9);
    g.fillTriangle(s.x - 20, s.y + 18, s.x + 20, s.y + 18, s.x, s.y - 22);
    g.fillTriangle(s.x - 20, s.y + 18, s.x + 20, s.y + 18, s.x, s.y + 34);
    g.fillStyle(FACET_LIT, 0.35);
    g.fillTriangle(s.x - 12, s.y + 14, s.x, s.y + 14, s.x - 2, s.y - 10);
    // The heart-light in the torso — pink refraction when casting.
    g.fillStyle(s.castGlow > 0.2 ? REFRACT : FACET_LIT, 0.5 + s.castGlow * 0.5);
    g.fillCircle(s.x, s.y + 8, 6 + s.castGlow * 3);

    // Shard arms hovering unattached at the sides, angling at the player.
    for (const side of [-1, 1]) {
      const aa = s.facing + side * 0.75;
      const hx = s.x + Math.cos(aa) * (44 + s.castGlow * 10);
      const hy = s.y + Math.sin(aa) * 30;
      g.fillStyle(FACET, 0.95);
      g.fillTriangle(
        hx + Math.cos(s.facing) * 12, hy + Math.sin(s.facing) * 12,
        hx + Math.cos(s.facing + 2.5) * 7, hy + Math.sin(s.facing + 2.5) * 7,
        hx + Math.cos(s.facing - 2.5) * 7, hy + Math.sin(s.facing - 2.5) * 7,
      );
      g.fillStyle(FACET_LIT, 0.5);
      g.fillCircle(hx, hy, 2.5);
    }

    // Head: a floating prism above the torso, slowly turning.
    const hy0 = s.y - 40 + Math.sin(t / 700) * 3;
    const spin = t / 1100;
    g.fillStyle(FACET_DARK, 1);
    g.fillTriangle(
      s.x + Math.cos(spin) * 14, hy0 + Math.sin(spin) * 6,
      s.x + Math.cos(spin + 2.1) * 14, hy0 + Math.sin(spin + 2.1) * 6,
      s.x + Math.cos(spin + 4.2) * 14, hy0 + Math.sin(spin + 4.2) * 6,
    );
    g.fillStyle(FACET, 0.9);
    g.fillTriangle(
      s.x + Math.cos(spin) * 10, hy0 - 4 + Math.sin(spin) * 4,
      s.x + Math.cos(spin + 2.1) * 10, hy0 - 4 + Math.sin(spin + 2.1) * 4,
      s.x + Math.cos(spin + 4.2) * 10, hy0 - 4 + Math.sin(spin + 4.2) * 4,
    );
    // The single refracted eye.
    const eye = s.hurt ? 0xffffff : s.enraged ? REFRACT : FACET_LIT;
    g.fillStyle(eye, 1);
    g.fillCircle(s.x + Math.cos(s.facing) * 4, hy0 + Math.sin(s.facing) * 3, 4);
    // Glints thrown off the crown.
    for (let i = 0; i < 3; i++) {
      const ga = spin * 2 + (Math.PI * 2 * i) / 3;
      g.fillStyle(REFRACT, 0.6);
      g.fillCircle(s.x + Math.cos(ga) * 22, hy0 - 6 + Math.sin(ga) * 8, 1.5);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(s.x, s.y, 55);
    }
  },
};
