import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Eye — Sovereign of the High Court. Air world's boss: a storm's calm
 * centre that never stops moving. Canon with the air challenge, 'The Eye'.
 */

const SKY = 0x6aa8d8;
const SKY_LIT = 0xd8f0ff;
const SKY_DARK = 0x22324d;
const GALE = 0xaaddff;

// ── Signature: Twin Cyclones ─────────────────────────────────────────
// Two tornado columns wander the hall for nine seconds, shoving and stinging.
// They drift slower than a walk — the demand is tracking, not fleeing.

const CYCLONE_LIFE_MS = 9000;
const CYCLONE_R = 46;

const twinCyclones = (tk: BossToolkit): SignatureMove => {
  interface Cy { x: number; y: number; vx: number; vy: number; lastHitAt: number }
  let cyclones: Cy[] = [];
  let bornAt = 0;
  return {
    durationMs: 1400,
    cast(time: number) {
      tk.sfx('screech');
      bornAt = time;
      cyclones = [0, 1].map((i) => ({
        x: tk.W * (0.3 + i * 0.4),
        y: tk.H * (i === 0 ? 0.35 : 0.7),
        vx: (i === 0 ? 1 : -1) * 60,
        vy: (i === 0 ? 1 : -1) * 38,
        lastHitAt: 0,
      }));
    },
    update(time: number, dt: number) {
      if (cyclones.length === 0) return;
      if (time > bornAt + CYCLONE_LIFE_MS) { cyclones = []; return; }
      const p = tk.player;
      for (const c of cyclones) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.x < 110 || c.x > tk.W - 110) c.vx *= -1;
        if (c.y < 150 || c.y > tk.H - 100) c.vy *= -1;
        if (p.active && Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) < CYCLONE_R && time - c.lastHitAt > 900) {
          c.lastHitAt = time;
          tk.hitPlayer(13, p.x, p.y);
          const a = Math.atan2(p.y - c.y, p.x - c.x);
          p.x = Phaser.Math.Clamp(p.x + Math.cos(a) * 60, 44, tk.W - 44);
          p.y = Phaser.Math.Clamp(p.y + Math.sin(a) * 60, 96, tk.H - 44);
        }
      }
    },
    drawGround(g, time) {
      for (const c of cyclones) {
        for (let i = 0; i < 4; i++) {
          const r = CYCLONE_R * (0.3 + i * 0.25);
          g.lineStyle(2.5 - i * 0.4, i % 2 === 0 ? SKY_LIT : GALE, 0.6 - i * 0.1);
          g.beginPath();
          g.arc(c.x + Math.sin(time / 90 + i) * 3, c.y, r, time / 140 + i * 1.4, time / 140 + i * 1.4 + Math.PI * 1.5, false);
          g.strokePath();
        }
        // Debris caught in the spin.
        for (let i = 0; i < 3; i++) {
          const a = time / 200 + (Math.PI * 2 * i) / 3;
          g.fillStyle(SKY_DARK, 0.8);
          g.fillCircle(c.x + Math.cos(a) * CYCLONE_R * 0.8, c.y + Math.sin(a) * CYCLONE_R * 0.5, 3);
        }
      }
    },
    onPhaseEnd() { cyclones = []; },
  };
};

// ── Signature: Zephyr Dance ──────────────────────────────────────────
// The Eye blinks around the hall, loosing a crescent from each perch. Four
// stops, each telegraphed by the wind gathering where it will arrive.

const zephyrDance = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('teleport');
    for (let hop = 0; hop < 4; hop++) {
      tk.schedule(400 + hop * 750, () => {
        const p = tk.player;
        const a = Math.random() * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 240, 110);
        const y = tk.clampY(p.y + Math.sin(a) * 200, 130);
        tk.host.setBossPos(x, y);
        tk.boom(x, y, 34, GALE);
        const aim = tk.angleToPlayer(x, y);
        for (let i = 0; i < 7; i++) {
          const ba = aim + (i - 3) * 0.14;
          tk.spawnBullet({
            x: x + Math.cos(ba) * 26, y: y + Math.sin(ba) * 26,
            angle: ba, speed: 265, damage: 9, color: SKY_LIT,
          });
        }
      });
    }
    void time;
  },
});

// ── Signature: The Stillness ─────────────────────────────────────────
// "There is no wind in here." A widening circle of dead air follows the Eye:
// inside it the player wades and is gently drawn in. Four seconds, then the
// storm exhales in a full ring.

const STILL_MS = 3800;

const stillness = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  return {
    durationMs: STILL_MS + 400,
    cast(time: number) {
      tk.sfx('dark-drain');
      activeUntil = time + STILL_MS;
      tk.schedule(STILL_MS, () => {
        tk.sfx('shield-up');
        for (let i = 0; i < 20; i++) {
          const a = (Math.PI * 2 * i) / 20;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 24, y: tk.bossY + Math.sin(a) * 24,
            angle: a, speed: 210, damage: 12, color: GALE,
          });
        }
      });
    },
    update(time: number) {
      if (time >= activeUntil) return;
      const p = tk.player;
      if (!p.active) return;
      const r = 90 + (1 - (activeUntil - time) / STILL_MS) * 120;
      if (Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y) < r) {
        tk.slowPlayer(0.62, 150);
        tk.pull(tk.bossX, tk.bossY, 62, 120);
      }
    },
    drawGround(g, time) {
      if (time >= activeUntil) return;
      const r = 90 + (1 - (activeUntil - time) / STILL_MS) * 120;
      g.lineStyle(2, SKY_LIT, 0.6);
      g.strokeCircle(tk.bossX, tk.bossY, r);
      g.lineStyle(1, GALE, 0.25);
      g.strokeCircle(tk.bossX, tk.bossY, r * 0.7);
      g.fillStyle(SKY, 0.06);
      g.fillCircle(tk.bossX, tk.bossY, r);
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const AIR_BOSS: WorldBossDef = {
  worldId: 'air',
  name: 'The Eye',
  title: 'Sovereign of the High Court',
  color: SKY,
  colorLit: SKY_LIT,
  colorDark: SKY_DARK,
  accent: GALE,
  bodyR: 26,
  damageMult: 0.9,

  intro: ['There is no wind in here. That should frighten you.'],
  banter: [
    'The storm is my hem. You are arguing with a hem.',
    'I carried every message the realms ever sent. I read them all.',
    'The Voice asked which way the wind blows. I stopped telling it.',
    'Breathe while you can. That air is on loan.',
  ],
  defeatLine: 'THE STORM UNCLENCHES',

  phases: [
    {
      name: 'The Outer Wall',
      line: 'You are inside the storm now. Mind the furniture.',
      hp: 390,
      cycle: [
        'volley', 'sig:cyclones', 'lanes', 'sig:dance',
        'stream', 'radial', 'sig:still', 'slamchain',
      ],
      harass: ['h-flak', 'h-snipe', 'h-lane'],
      restMs: 1080,
      harassMs: 3200,
      moveSpeed: 85,
      holdDist: 270,
    },
    {
      name: 'The Eye Narrows',
      line: 'Closer. The quiet part is for you.',
      hp: 440,
      cycle: [
        'sig:still', 'quake', 'sig:dance', 'spiral',
        'homing', 'sig:cyclones', 'barrage', 'radial', 'stream',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 930,
      harassMs: 2700,
      moveSpeed: 105,
      holdDist: 240,
    },
  ],

  hard: {
    introLine: 'THE HIGH COURT HOLDS ITS BREATH',
    extraPhase: {
      name: 'Dead Calm',
      line: 'This is the silence the storm keeps in the middle of itself.',
      hp: 320,
      cycle: [
        'sig:dance', 'sig:still', 'sanctuary', 'spiral',
        'sig:cyclones', 'quake', 'stream', 'homing',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 720,
      harassMs: 2200,
      moveSpeed: 125,
      holdDist: 220,
    },
  },

  signatures: {
    cyclones: twinCyclones,
    dance: zephyrDance,
    still: stillness,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a1220, 0.4);
    g.fillRect(0, 0, W, H);
    // Streaked cloud bands circling the hall.
    for (let i = 0; i < 5; i++) {
      const y = 130 + i * (H - 190) / 4;
      g.lineStyle(6 - i, SKY, 0.12);
      g.beginPath();
      for (let x = 0; x <= W; x += 30) {
        const wy = y + Math.sin(x * 0.02 + i * 1.6) * 14;
        if (x === 0) g.moveTo(x, wy);
        else g.lineTo(x, wy);
      }
      g.strokePath();
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // No shadow — the Eye does not touch the ground.
    // Swirling storm shell: three counter-rotating arcs.
    for (let i = 0; i < 3; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const r = 34 + i * 9;
      g.lineStyle(4 - i, i === 0 ? SKY_LIT : SKY, 0.7 - i * 0.15);
      g.beginPath();
      g.arc(s.x, s.y, r, (t / 400) * dir + i * 2, (t / 400) * dir + i * 2 + Math.PI * 1.4, false);
      g.strokePath();
    }
    // Feather wisps shed off the shell.
    for (let i = 0; i < 6; i++) {
      const a = t / 500 + (Math.PI * 2 * i) / 6;
      const r = 52 + Math.sin(t / 220 + i * 2) * 8;
      g.fillStyle(GALE, 0.4);
      g.fillEllipse(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 10, 3);
    }
    // The eye itself: a great iris that tracks the player.
    g.fillStyle(SKY_DARK, 1);
    g.fillEllipse(s.x, s.y, 42, 30);
    g.fillStyle(0x0a1220, 1);
    g.fillEllipse(s.x, s.y, 34, 23);
    const ex = Math.cos(s.facing) * 7;
    const ey = Math.sin(s.facing) * 5;
    const iris = s.hurt ? 0xffffff : s.enraged ? 0xffd27a : SKY_LIT;
    g.fillStyle(iris, 1);
    g.fillCircle(s.x + ex, s.y + ey, 10 + s.castGlow * 3);
    g.fillStyle(0x0a1220, 1);
    g.fillCircle(s.x + ex, s.y + ey, 4.5 - s.castGlow * 1.5);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(s.x + ex - 3, s.y + ey - 3, 1.8);
    // Lids narrow when enraged.
    if (s.enraged) {
      g.fillStyle(SKY_DARK, 1);
      g.fillEllipse(s.x, s.y - 13, 40, 8);
      g.fillEllipse(s.x, s.y + 13, 40, 8);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
