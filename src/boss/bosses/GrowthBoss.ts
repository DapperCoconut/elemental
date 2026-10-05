import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Patient Zero — Sovereign of the Culture. Growth world's boss: a colony that
 * fights epidemiologically — you are the vector, the ground is the medium.
 * Canon with the growth challenge, 'Patient Zero'.
 */

const CELL = 0x88bb22;
const CELL_LIT = 0xd8f56a;
const CELL_DARK = 0x24400a;
const PLAGUE = 0xff6ab8;

// ── Signature: Budding ───────────────────────────────────────────────
// Four spore sacs swell at fixed points around the player and pop into radial
// bursts. The sacs are loud about it — the bursts are the exam.

const budding = (tk: BossToolkit): SignatureMove => {
  interface Sac { x: number; y: number; popsAt: number }
  let sacs: Sac[] = [];
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('spore');
      const p = tk.player;
      sacs = [];
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + Math.random() * 0.6;
        const sac: Sac = {
          x: tk.clampX(p.x + Math.cos(a) * 190, 90),
          y: tk.clampY(p.y + Math.sin(a) * 160, 130),
          popsAt: time + 1400 + i * 420,
        };
        sacs.push(sac);
        tk.schedule(1400 + i * 420, () => {
          tk.boom(sac.x, sac.y, 30, CELL_LIT);
          for (let b = 0; b < 6; b++) {
            const ba = (Math.PI * 2 * b) / 6 + i * 0.5;
            tk.spawnBullet({
              x: sac.x, y: sac.y, angle: ba, speed: 195,
              damage: 10, color: CELL_LIT, lifeMs: 2800,
            });
          }
        });
      }
      tk.schedule(3200, () => { sacs = []; });
    },
    drawGround(g, time) {
      for (const sac of sacs) {
        if (time >= sac.popsAt) continue;
        const grow = Phaser.Math.Clamp(1 - (sac.popsAt - time) / 1600, 0.2, 1);
        const wob = 1 + Math.sin(time / 90) * 0.06 * grow;
        g.fillStyle(CELL_DARK, 0.85);
        g.fillEllipse(sac.x, sac.y, 26 * grow * wob, 30 * grow);
        g.fillStyle(CELL, 0.9);
        g.fillEllipse(sac.x, sac.y - 2, 18 * grow * wob, 22 * grow);
        g.fillStyle(CELL_LIT, 0.5 + grow * 0.4);
        g.fillCircle(sac.x, sac.y - 4, 6 * grow);
      }
    },
    onPhaseEnd() { sacs = []; },
  };
};

// ── Signature: The Vector ────────────────────────────────────────────
// "You are the carrier now." For four seconds, everywhere the player walks
// blooms behind them. The cure is standing ground you are willing to lose.

const theVector = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  let nextDropAt = 0;
  return {
    durationMs: 4400,
    cast(time: number) {
      tk.sfx('spore');
      activeUntil = time + 4200;
      nextDropAt = time + 500;
      tk.host.showFloatingText(tk.player.x, tk.player.y - 50, '🐛 YOU ARE THE VECTOR', `#${PLAGUE.toString(16)}`);
    },
    update(time: number) {
      if (time >= activeUntil || time < nextDropAt) return;
      nextDropAt = time + 450;
      const p = tk.player;
      if (!p.active) return;
      tk.spawnPool({ x: p.x, y: p.y, radius: 46, lifeMs: 5200, damage: 7, tickMs: 650 });
    },
    drawAir(g, time) {
      if (time >= activeUntil) return;
      // The infection halo riding the player.
      const p = tk.player;
      const pulse = 1 + Math.sin(time / 140) * 0.12;
      g.lineStyle(2, PLAGUE, 0.7);
      g.strokeCircle(p.x, p.y, 30 * pulse);
      for (let i = 0; i < 5; i++) {
        const a = time / 300 + (Math.PI * 2 * i) / 5;
        g.fillStyle(PLAGUE, 0.6);
        g.fillCircle(p.x + Math.cos(a) * 30 * pulse, p.y + Math.sin(a) * 30 * pulse, 2.5);
      }
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

// ── Signature: Quarantine ────────────────────────────────────────────
// Four lanes box the player's position — the walls of a ward going up. The
// warning is long enough to walk out; staying inside means sharing the ward
// with a volley.

const quarantine = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2800,
  cast(time: number) {
    tk.sfx('judgement');
    const p = tk.player;
    const cx = tk.clampX(p.x, 140);
    const cy = tk.clampY(p.y, 150);
    const half = 120;
    tk.spawnLane({ x: cx, y: cy - half, angle: 0, halfW: 26, warnMs: 1250, damage: 22 });
    tk.spawnLane({ x: cx, y: cy + half, angle: 0, halfW: 26, warnMs: 1250, damage: 22 });
    tk.spawnLane({ x: cx - half, y: cy, angle: Math.PI / 2, halfW: 26, warnMs: 1250, damage: 22 });
    tk.spawnLane({ x: cx + half, y: cy, angle: Math.PI / 2, halfW: 26, warnMs: 1250, damage: 22 });
    // The inspection: a burst into the ward once the walls land.
    tk.schedule(1500, () => {
      const aim = Math.atan2(cy - tk.bossY, cx - tk.bossX);
      for (let i = 0; i < 7; i++) {
        const a = aim + (i - 3) * 0.12;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 28, y: tk.bossY + Math.sin(a) * 28,
          angle: a, speed: 250, damage: 10, color: CELL_LIT,
        });
      }
    });
    void time;
  },
});

export const GROWTH_BOSS: WorldBossDef = {
  worldId: 'growth',
  name: 'Patient Zero',
  title: 'Sovereign of the Culture',
  color: CELL,
  colorLit: CELL_LIT,
  colorDark: CELL_DARK,
  accent: PLAGUE,

  intro: ['You will be the next colony. Try to be a hospitable one.'],
  banter: [
    'Multiply or die. I found a third option: both, constantly.',
    'The Voice tried to consume me. I am still culturing what it left behind.',
    'Sterile little thing. We can fix that.',
    'Every cure I have ever met became a lesson.',
  ],
  defeatLine: 'THE CULTURE GOES DORMANT',

  phases: [
    {
      name: 'The Culture',
      line: 'The dish is the world. You are the contaminant.',
      hp: 420,
      cycle: [
        'volley', 'sig:budding', 'sig:vector', 'lanes',
        'summon', 'sig:quarantine', 'slamchain', 'radial',
      ],
      harass: ['h-rune', 'h-flak', 'h-snipe'],
      restMs: 1080,
      harassMs: 3200,
    },
    {
      name: 'Full Bloom',
      line: 'Generation two hundred. You taught us so much.',
      hp: 460,
      cycle: [
        'sig:vector', 'sig:budding', 'quake', 'homing',
        'sig:quarantine', 'summon', 'barrage', 'spiral', 'hazard',
      ],
      harass: ['h-rune', 'h-orbs', 'h-flak', 'h-snipe'],
      restMs: 930,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'THE CULTURE NEVER STOPPED GROWING',
    extraPhase: {
      name: 'Pandemic',
      line: 'Patient Zero implies a Patient One. Volunteer accepted.',
      hp: 350,
      cycle: [
        'sig:vector', 'sig:quarantine', 'sig:budding', 'sanctuary',
        'summon', 'quake', 'hazard', 'spiral',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-flak'],
      restMs: 730,
      harassMs: 2250,
    },
  },

  signatures: {
    budding,
    vector: theVector,
    quarantine,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a1204, 0.5);
    g.fillRect(0, 0, W, H);
    // The dish: a great ringed circle, colonies dotted along the agar.
    const cx = W / 2;
    const cy = H * 0.55;
    const R = Math.min(W, H) * 0.47;
    g.lineStyle(3, CELL_DARK, 0.8);
    g.strokeCircle(cx, cy, R);
    g.lineStyle(1, CELL, 0.25);
    g.strokeCircle(cx, cy, R - 10);
    const rnd = new Phaser.Math.RandomDataGenerator(['growth-boss-arena']);
    for (let i = 0; i < 22; i++) {
      const a = rnd.realInRange(0, Math.PI * 2);
      const r = rnd.realInRange(R * 0.3, R * 0.95);
      g.fillStyle(rnd.pick([CELL, CELL_DARK, 0x5a8a1a]), rnd.realInRange(0.12, 0.3));
      g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rnd.realInRange(4, 14));
    }
  },

  look: { crest: 'tendrils', pattern: 'scales', aura: 'petals', hands: 'claw', torsoR: 35, mouth: 'maw' },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'stalkers', tint: 'sick' },
    { movement: 'rush', gimmick: 'gloom', tint: 'sick', look: { crest: 'mane', arms: 4 } },
  ],
};
