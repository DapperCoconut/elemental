import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Mountain King — Sovereign of the Deep Court. Earth world's boss: rooted,
 * enormous, and entirely willing to bring the ceiling with him.
 * Canon with the earth challenge, 'The Mountain King'.
 */

const STONE = 0x887755;
const STONE_LIT = 0xd8c090;
const STONE_DARK = 0x3a2f22;
const GOLDVEIN = 0xffcf6a;

// ── Signature: The Pillar Field ──────────────────────────────────────
// Stone erupts in offset rows across the player's half of the hall, leaving
// rubble that stays. The offset rows always leave a diagonal corridor.

const pillarField = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3000,
  cast(time: number) {
    tk.sfx('explosion-large');
    const p = tk.player;
    const originX = tk.clampX(p.x, 170);
    const originY = tk.clampY(p.y, 150);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        // Offset rows: the corridor between pillars survives every wave.
        const x = originX + (col - 1.5) * 120 + (row % 2) * 60;
        const y = originY + (row - 1) * 110;
        tk.schedule(300 + row * 600, () => {
          tk.spawnZone({
            x, y, radius: 46, warnMs: 900, damage: 20,
            poolMs: 3600, poolDamage: 6,
          });
        });
      }
    }
    void time;
  },
});

// ── Signature: Avalanche ─────────────────────────────────────────────
// Boulders roll down the hall from the top edge in reading columns — big,
// slow, and absolutely not to be argued with.

const avalanche = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2800,
  cast(time: number) {
    tk.sfx('roar');
    const px = tk.player.x;
    for (let i = 0; i < 7; i++) {
      tk.schedule(i * 320, () => {
        const x = tk.clampX(
          i % 2 === 0 ? px + Phaser.Math.Between(-140, 140) : Phaser.Math.Between(90, tk.W - 90),
          70,
        );
        tk.spawnBullet({
          x, y: 84, angle: Math.PI / 2, speed: 235,
          damage: 20, r: 15, color: STONE, lifeMs: 4200,
        });
      });
    }
    void time;
  },
});

// ── Signature: Seismic Clap ──────────────────────────────────────────
// Both fists come down and two quake sets ring out, half a beat apart, from
// two centres — the safe wedge of one is only briefly the safe wedge of both.

const seismicClap = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3200,
  cast(time: number) {
    tk.sfx('explosion-large');
    const gap0 = tk.angleToPlayer();
    for (const side of [-1, 1]) {
      const cx = tk.bossX + side * 70;
      const cy = tk.bossY + 30;
      for (let ring = 0; ring < 2; ring++) {
        tk.spawnRing({
          cx, cy,
          delayMs: (side === -1 ? 0 : 320) + ring * 640,
          speed: 320,
          gapCentre: gap0 + ring * 0.3 * side,
          gapHalf: 0.55,
          band: 28,
          damage: 22,
        });
      }
    }
    void time;
  },
});

export const EARTH_BOSS: WorldBossDef = {
  worldId: 'earth',
  name: 'The Mountain King',
  title: 'Sovereign of the Deep Court',
  color: STONE,
  colorLit: STONE_LIT,
  colorDark: STONE_DARK,
  accent: GOLDVEIN,
  bodyR: 36,
  damageMult: 0.9,

  intro: ['Mountains do not negotiate. Sit down.'],
  banter: [
    'I was a hill once. I applied myself.',
    'The Voice tunnels. I have opinions about things that tunnel.',
    'Every wall you have ever trusted was one of mine.',
    'Erosion takes millennia. I am the abridged version.',
  ],
  defeatLine: 'THE MOUNTAIN BOWS',

  phases: [
    {
      name: 'The Foothills',
      line: 'You may approach. Gravity insists.',
      hp: 430,
      cycle: [
        'slamchain', 'sig:pillars', 'volley', 'sig:avalanche',
        'minefield', 'lanes', 'sig:clap', 'radial',
      ],
      harass: ['h-snipe', 'h-mines', 'h-rune'],
      restMs: 1150,
      harassMs: 3400,
    },
    {
      name: 'The Summit Wakes',
      line: 'Enough courtesy. Meet the bedrock.',
      hp: 480,
      cycle: [
        'sig:clap', 'sig:avalanche', 'quake', 'barrage',
        'sig:pillars', 'summon', 'slamchain', 'minefield', 'sweep',
      ],
      harass: ['h-snipe', 'h-mines', 'h-rune', 'h-flak'],
      restMs: 990,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'THE DEEP COURT IS AWAKE',
    extraPhase: {
      name: 'The Roots of the World',
      line: 'You have reached the part of the mountain that holds the realms up.',
      hp: 360,
      cycle: [
        'sig:avalanche', 'sig:clap', 'sanctuary', 'quake',
        'sig:pillars', 'summon', 'barrage', 'sweep',
      ],
      harass: ['h-mines', 'h-rune', 'h-snipe', 'h-lane'],
      restMs: 780,
      harassMs: 2400,
    },
  },

  signatures: {
    pillars: pillarField,
    avalanche,
    clap: seismicClap,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0c0a06, 0.45);
    g.fillRect(0, 0, W, H);
    // A quarry floor: strata lines and standing stones at the rim.
    for (let i = 0; i < 4; i++) {
      g.lineStyle(2, STONE_DARK, 0.5);
      const y = H * 0.35 + i * 60;
      g.lineBetween(30, y, W - 30, y + (i % 2 === 0 ? 14 : -10));
    }
    for (let i = 0; i < 7; i++) {
      const x = 70 + ((W - 140) * i) / 6;
      const h = 26 + (i % 3) * 14;
      g.fillStyle(STONE_DARK, 0.8);
      g.fillRect(x - 9, H - 34 - h, 18, h);
      g.fillStyle(STONE, 0.5);
      g.fillRect(x - 9, H - 34 - h, 18, 5);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // Ground shadow — he has considerable ground to shadow.
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(s.x, s.y + 52, 130, 22);

    // Fists first, so the torso overlaps their inner edge.
    for (const side of [-1, 1]) {
      const raise = s.castGlow * 26;
      const fx = s.x + side * (58 + s.castGlow * 8);
      const fy = s.y + 30 - raise + Math.sin(t / 700 + side) * 3;
      g.fillStyle(STONE_DARK, 1);
      g.fillCircle(fx, fy, 22);
      g.fillStyle(STONE, 1);
      g.fillCircle(fx - side * 3, fy - 4, 17);
      g.lineStyle(2, STONE_DARK, 0.9);
      g.lineBetween(fx - 10, fy - 2, fx + 10, fy - 5);
      if (s.castGlow > 0.4) {
        g.fillStyle(GOLDVEIN, (s.castGlow - 0.4) * 0.8);
        g.fillCircle(fx, fy, 8);
      }
    }

    // Torso: a stacked cairn of slabs.
    g.fillStyle(STONE_DARK, 1);
    g.fillEllipse(s.x, s.y + 18, 96, 62);
    g.fillStyle(STONE, 1);
    g.fillEllipse(s.x - 4, s.y + 12, 80, 50);
    g.fillStyle(STONE_LIT, 0.35);
    g.fillEllipse(s.x - 12, s.y + 2, 44, 22);
    // Gold veins — brighter as he loses ground.
    const veinGlow = 0.35 + (1 - s.hpRatio) * 0.5;
    g.lineStyle(2, GOLDVEIN, veinGlow);
    g.lineBetween(s.x - 26, s.y + 30, s.x - 10, s.y + 6);
    g.lineBetween(s.x - 10, s.y + 6, s.x - 18, s.y - 8);
    g.lineBetween(s.x + 14, s.y + 28, s.x + 24, s.y + 2);

    // Head: a small crag with a heavy brow, dwarfed by the shoulders.
    const hy0 = s.y - 30;
    g.fillStyle(STONE_DARK, 1);
    g.fillEllipse(s.x, hy0, 40, 30);
    g.fillStyle(STONE, 1);
    g.fillEllipse(s.x, hy0 + 2, 32, 22);
    g.fillStyle(STONE_DARK, 1);
    g.fillRect(s.x - 17, hy0 - 8, 34, 7); // brow
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffa04a : GOLDVEIN;
    const ex = Math.cos(s.facing) * 3;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillRect(s.x + side * 8 + ex - 3, hy0 - 1, 6, 3.5);
    }
    // The crown: jagged peaks with snowcaps.
    for (let i = 0; i < 5; i++) {
      const px = s.x - 20 + i * 10;
      const ph = 10 + (i % 2 === 0 ? 6 : 0) + (i === 2 ? 5 : 0);
      g.fillStyle(STONE_DARK, 1);
      g.fillTriangle(px - 5, hy0 - 12, px + 5, hy0 - 12, px, hy0 - 12 - ph);
      g.fillStyle(0xf0ede6, 0.9);
      g.fillTriangle(px - 2, hy0 - 12 - ph + 4, px + 2, hy0 - 12 - ph + 4, px, hy0 - 12 - ph);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 62);
    }
  },
};
