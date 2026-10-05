import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Verdant Crown — Sovereign of the Green. Life world's boss: a crowned
 * treant that fights with roots, spores and a garden that grabs.
 * Canon with the life challenge, 'The Verdant Crown'.
 */

const LEAF = 0x44cc44;
const LEAF_LIT = 0x9df5a8;
const BARK_DARK = 0x241a10;
const BLOSSOM = 0xffe08a;

// ── Signature: Rootlash ──────────────────────────────────────────────
// Three rays of erupting roots walk outward from the Crown toward the player's
// side of the hall — each step telegraphs before it bursts, so the read is
// "step out of the ray", never "outrun the root".

const rootlash = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2600,
  cast(time: number) {
    tk.sfx('tentacle');
    const aim = tk.angleToPlayer();
    for (const spread of [-0.5, 0, 0.5]) {
      const a = aim + spread;
      for (let step = 1; step <= 5; step++) {
        tk.schedule(200 + step * 260, () => {
          const r = 70 + step * 68;
          tk.spawnZone({
            x: tk.bossX + Math.cos(a) * r, y: tk.bossY + Math.sin(a) * r,
            radius: 44, warnMs: 700, damage: 16,
            slowMult: 0.6, slowMs: 900,
          });
        });
      }
    }
    void time;
  },
});

// ── Signature: Spore Bloom ───────────────────────────────────────────
// Drifting spore clouds seed the player's half of the hall and linger — the
// Crown takes the ground away politely, a garden bed at a time.

const sporeBloom = (tk: BossToolkit): SignatureMove => ({
  durationMs: 1800,
  cast(time: number) {
    tk.sfx('spore');
    for (let i = 0; i < 5; i++) {
      tk.schedule(i * 280, () => {
        const p = tk.player;
        tk.spawnZone({
          x: p.x + Phaser.Math.Between(-170, 170),
          y: p.y + Phaser.Math.Between(-130, 130),
          radius: 52, warnMs: 1300, damage: 12, fall: true,
          poolMs: 7000, poolDamage: 7,
        });
      });
    }
    void time;
  },
});

// ── Signature: The Grasping Garden ───────────────────────────────────
// Vines snatch at where the player is *going* (velocity-led), and everything
// they catch is rooted for the volley that follows.

const graspingGarden = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2900,
  cast(time: number) {
    tk.sfx('tentacle');
    for (let i = 0; i < 4; i++) {
      tk.schedule(i * 380, () => {
        const p = tk.player;
        const body = p.body as Phaser.Physics.Arcade.Body | null;
        tk.spawnZone({
          x: p.x + (body?.velocity.x ?? 0) * 0.28,
          y: p.y + (body?.velocity.y ?? 0) * 0.28,
          radius: 50, warnMs: 560, damage: 14,
          slowMult: 0.3, slowMs: 1400,
        });
      });
    }
    // The volley the vines were holding you for.
    tk.schedule(2100, () => {
      const aim = tk.angleToPlayer();
      for (let i = 0; i < 9; i++) {
        const a = aim + (i - 4) * 0.16;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
          angle: a, speed: 250, damage: 10, color: LEAF_LIT,
        });
      }
    });
    void time;
  },
});

export const LIFE_BOSS: WorldBossDef = {
  worldId: 'life',
  name: 'The Verdant Crown',
  title: 'Sovereign of the Green',
  color: LEAF,
  colorLit: LEAF_LIT,
  colorDark: BARK_DARK,
  accent: BLOSSOM,
  damageMult: 0.9,

  intro: ['Everything green wants your place in the sun. I am everything green.'],
  banter: [
    'Bloom, or be mulch. There is no third register.',
    'The Voice offered me winter. I declined loudly.',
    'You would make adequate compost. High praise.',
    'Roots do not chase. Roots are already there.',
  ],
  defeatLine: 'THE GARDEN RESTS',

  phases: [
    {
      name: 'The Green Rises',
      line: 'This hall was a meadow once. Watch closely.',
      hp: 410,
      cycle: [
        'volley', 'sig:rootlash', 'summon', 'sig:spores',
        'lanes', 'slamchain', 'radial', 'sig:garden',
      ],
      harass: ['h-rune', 'h-snipe', 'h-flak'],
      restMs: 1120,
      harassMs: 3300,
    },
    {
      name: 'The Crown In Bloom',
      line: 'Petals now. You have earned the pretty part.',
      hp: 450,
      cycle: [
        'sig:garden', 'quake', 'sig:rootlash', 'homing',
        'sig:spores', 'barrage', 'summon', 'spiral', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe', 'h-flak'],
      restMs: 960,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'NOTHING HERE STOPS GROWING',
    extraPhase: {
      name: 'The Overgrowth',
      line: 'The garden ate the gardener. Now it is just appetite with roots.',
      hp: 330,
      cycle: [
        'sig:rootlash', 'sig:garden', 'summon', 'quake',
        'sig:spores', 'sanctuary', 'spiral', 'homing',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-flak'],
      restMs: 750,
      harassMs: 2300,
    },
  },

  signatures: {
    rootlash,
    spores: sporeBloom,
    garden: graspingGarden,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x061206, 0.45);
    g.fillRect(0, 0, W, H);
    // A ring of old hedgerow around the fighting ground.
    const cx = W / 2;
    const cy = H * 0.55;
    const R = Math.min(W, H) * 0.46;
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26;
      const x = cx + Math.cos(a) * (R + 8);
      const y = cy + Math.sin(a) * (R + 8);
      g.fillStyle(i % 3 === 0 ? LEAF : 0x2a5a1a, 0.5);
      g.fillCircle(x, y, 8 + (i % 4) * 3);
    }
    // Scattered petals.
    for (let i = 0; i < 14; i++) {
      g.fillStyle(BLOSSOM, 0.2);
      g.fillEllipse((W / 14) * i + 20, cy + Math.sin(i * 2.4) * R * 0.6, 7, 3);
    }
  },

  look: { crest: 'plume', pattern: 'weave', aura: 'leaves', hands: 'ball', torsoR: 35, mouth: 'grin' },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'stalkers', tint: 'sick', look: { crest: 'mane', aura: 'petals' } },
    { movement: 'rush', gimmick: 'shrink', tint: 'void', look: { crest: 'tendrils', hands: 'claw' } },
  ],
};
