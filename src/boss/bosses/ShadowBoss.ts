import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Thing In The Maze — Sovereign of the Dark Between Torches. Shadow
 * world's boss: it builds the maze around you, then stops being where you
 * looked. Canon with the shadow challenge ("Do not look for me. Just wait.").
 */

const MURK = 0x552277;
const MURK_LIT = 0xb98cff;
const MURK_DARK = 0x0a0512;
const WOUND = 0xff4a6a;

// ── Signature: The Maze ──────────────────────────────────────────────
// Walls of standing dark rise around the player's pocket of the hall and
// stay for six seconds. They are not lethal — they are the floor plan every
// other attack gets to use.

const WALL_LIFE_MS = 6000;
const WALL_HALF_W = 12;

const theMaze = (tk: BossToolkit): SignatureMove => {
  interface Wall { x1: number; y1: number; x2: number; y2: number; bornAt: number; lastHitAt: number }
  let walls: Wall[] = [];
  return {
    durationMs: 1600,
    cast(time: number) {
      tk.sfx('dark-drain');
      const p = tk.player;
      const cx = tk.clampX(p.x, 170);
      const cy = tk.clampY(p.y, 160);
      walls = [];
      // Three walls of a box — the fourth side is always left open.
      const openSide = Math.floor(Math.random() * 4);
      const half = 130;
      const sides: [number, number, number, number][] = [
        [cx - half, cy - half, cx + half, cy - half],
        [cx + half, cy - half, cx + half, cy + half],
        [cx - half, cy + half, cx + half, cy + half],
        [cx - half, cy - half, cx - half, cy + half],
      ];
      sides.forEach((sd, i) => {
        if (i === openSide) return;
        walls.push({ x1: sd[0], y1: sd[1], x2: sd[2], y2: sd[3], bornAt: time + 800, lastHitAt: 0 });
      });
    },
    update(time: number) {
      const p = tk.player;
      walls = walls.filter((w) => time - w.bornAt < WALL_LIFE_MS);
      if (!p.active) return;
      for (const w of walls) {
        if (time < w.bornAt) continue;
        const d = distToSegment(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
        if (d < WALL_HALF_W + 14 && time - w.lastHitAt > 700) {
          w.lastHitAt = time;
          tk.hitPlayer(9, p.x, p.y);
          // Shoved off the wall, back into the pocket.
          const nx = p.x - (w.x1 + w.x2) / 2;
          const ny = p.y - (w.y1 + w.y2) / 2;
          const n = Math.hypot(nx, ny) || 1;
          p.x = Phaser.Math.Clamp(p.x + (nx / n) * -26, 44, tk.W - 44);
          p.y = Phaser.Math.Clamp(p.y + (ny / n) * -26, 96, tk.H - 44);
        }
      }
    },
    drawGround(g, time) {
      for (const w of walls) {
        const rising = time < w.bornAt;
        const age = (time - w.bornAt) / WALL_LIFE_MS;
        const alpha = rising ? 0.25 : Math.min(0.8, 1 - age * 0.6);
        g.lineStyle(WALL_HALF_W * 2, MURK_DARK, alpha);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
        g.lineStyle(2, MURK_LIT, alpha * 0.7);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
        // Smoke curling off the top of the wall.
        for (let i = 0; i < 4; i++) {
          const t2 = (i + 0.5) / 4;
          const wx = w.x1 + (w.x2 - w.x1) * t2;
          const wy = w.y1 + (w.y2 - w.y1) * t2;
          g.fillStyle(MURK, alpha * 0.5);
          g.fillCircle(wx + Math.sin(time / 200 + i * 2) * 5, wy - 8, 4);
        }
      }
    },
    onPhaseEnd() { walls = []; },
  };
};

const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};

// ── Signature: Do Not Look For Me ────────────────────────────────────
// It goes somewhere else — twice — and each false step booms in the dark to
// sell the lie. Then the real lunge, from wherever it actually stood.

const doNotLook = (tk: BossToolkit): SignatureMove => {
  let shroudUntil = 0;
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('teleport');
      shroudUntil = time + 2600;
      for (let hop = 0; hop < 2; hop++) {
        tk.schedule(500 + hop * 800, () => {
          // The lie: a boom where it is NOT.
          const fx = Phaser.Math.Between(120, tk.W - 120);
          const fy = Phaser.Math.Between(150, tk.H - 110);
          tk.boom(fx, fy, 30, MURK);
          // The truth: it moved quietly, well off the player's aim.
          const a = tk.angleToPlayer() + Math.PI + Phaser.Math.FloatBetween(-0.8, 0.8);
          tk.host.setBossPos(
            tk.clampX(tk.player.x + Math.cos(a) * 260, 100),
            tk.clampY(tk.player.y + Math.sin(a) * 210, 130),
          );
        });
      }
      tk.schedule(2600, () => {
        const p = tk.player;
        tk.spawnCharge({
          toX: p.x, toY: p.y, warnMs: 520, travelMs: 230, halfW: 40, damage: 26,
        });
      });
    },
    drawAir(g, time) {
      if (time >= shroudUntil) return;
      // The shroud: the boss's position smeared into smoke rings.
      for (let i = 0; i < 3; i++) {
        const r = 26 + i * 12 + Math.sin(time / 160 + i) * 4;
        g.lineStyle(3 - i * 0.7, MURK, 0.5 - i * 0.12);
        g.strokeCircle(tk.bossX, tk.bossY, r);
      }
    },
    onPhaseEnd() { shroudUntil = 0; },
  };
};

// ── Signature: The Hands ─────────────────────────────────────────────
// Grasping dark from below, leading the player's run, each grab slowing —
// five reaches, and the last one is a snatch from every side at once.

const theHands = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3000,
  cast(time: number) {
    tk.sfx('tentacle');
    for (let i = 0; i < 4; i++) {
      tk.schedule(i * 420, () => {
        const p = tk.player;
        const body = p.body as Phaser.Physics.Arcade.Body | null;
        tk.spawnZone({
          x: p.x + (body?.velocity.x ?? 0) * 0.3,
          y: p.y + (body?.velocity.y ?? 0) * 0.3,
          radius: 46, warnMs: 540, damage: 13, slowMult: 0.45, slowMs: 1200,
        });
      });
    }
    tk.schedule(1900, () => {
      const p = tk.player;
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5;
        tk.spawnZone({
          x: p.x + Math.cos(a) * 90, y: p.y + Math.sin(a) * 90,
          radius: 42, warnMs: 700, damage: 12, slowMult: 0.5, slowMs: 900,
        });
      }
    });
    void time;
  },
});

export const SHADOW_BOSS: WorldBossDef = {
  worldId: 'shadow',
  name: 'The Thing In The Maze',
  title: 'Sovereign of the Dark Between',
  color: MURK,
  colorLit: MURK_LIT,
  colorDark: MURK_DARK,
  accent: WOUND,
  bodyR: 28,

  intro: ['Do not look for me. Just wait. I am better at both.'],
  banter: [
    'The dark was never empty. It was furnished.',
    'The Voice lives further down than I do. That took adjusting to.',
    'You keep watching where I was. Sentimental.',
    'Every torch you ever trusted, I stood just past it.',
  ],
  defeatLine: 'THE MAZE UNRAVELS',

  phases: [
    {
      name: 'The First Dark',
      line: 'Welcome. The walls are new. I made them for you.',
      hp: 410,
      cycle: [
        'sig:maze', 'sig:hands', 'volley', 'sig:vanish',
        'lanes', 'homing', 'stream', 'slamchain',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe'],
      restMs: 1060,
      harassMs: 3100,
      moveSpeed: 70,
      holdDist: 290,
    },
    {
      name: 'Deeper In',
      line: 'You are past the part of the maze with exits.',
      hp: 450,
      cycle: [
        'sig:vanish', 'sig:maze', 'quake', 'sig:hands',
        'spiral', 'homing', 'barrage', 'stream', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 910,
      harassMs: 2600,
      moveSpeed: 85,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE MAZE HAS NO OUTSIDE',
    extraPhase: {
      name: 'What Waits Inside',
      line: 'You found the centre. I am so sorry.',
      hp: 340,
      cycle: [
        'sig:vanish', 'sig:hands', 'sig:maze', 'sanctuary',
        'quake', 'spiral', 'sig:vanish', 'homing',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 710,
      harassMs: 2150,
      moveSpeed: 100,
      holdDist: 240,
    },
  },

  signatures: {
    maze: theMaze,
    vanish: doNotLook,
    hands: theHands,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x050308, 0.6);
    g.fillRect(0, 0, W, H);
    // Dead torches along the walls — one still guttering.
    for (let i = 0; i < 8; i++) {
      const x = 60 + ((W - 120) * i) / 7;
      const y = i % 2 === 0 ? 106 : H - 34;
      g.lineStyle(3, 0x1a1024, 1);
      g.lineBetween(x, y, x, y - 18);
      if (i === 3) {
        g.fillStyle(0xffa04a, 0.5);
        g.fillCircle(x, y - 22, 4);
        g.fillStyle(0xffd27a, 0.7);
        g.fillCircle(x, y - 22, 2);
      } else {
        g.fillStyle(MURK, 0.4);
        g.fillCircle(x, y - 21, 2.5);
      }
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // No hard shadow — it IS one. A pooled base instead.
    g.fillStyle(MURK_DARK, 0.8);
    g.fillEllipse(s.x, s.y + 42, 90, 16);

    // The column of it: layered smoke triangles, taller than a fighter,
    // constantly re-forming.
    for (let i = 0; i < 6; i++) {
      const wob = Math.sin(t / 210 + i * 1.7) * (4 + i);
      const w = 44 - i * 5;
      const yTop = s.y + 34 - i * 16;
      g.fillStyle(i % 2 === 0 ? MURK_DARK : 0x140a20, 0.92 - i * 0.06);
      g.fillTriangle(
        s.x - w / 2 + wob, yTop,
        s.x + w / 2 + wob, yTop,
        s.x + wob * 1.4, yTop - 22,
      );
    }

    // Long reaching arms — too long, ending in finger-wisps.
    for (const side of [-1, 1]) {
      const aa = s.facing + side * 0.7;
      const reach = 52 + s.castGlow * 16;
      const hx = s.x + Math.cos(aa) * reach;
      const hy = s.y - 6 + Math.sin(aa) * reach * 0.6;
      g.lineStyle(7, MURK_DARK, 0.9);
      g.lineBetween(s.x + side * 10, s.y - 14, hx, hy);
      for (let f = 0; f < 3; f++) {
        const fa = aa + (f - 1) * 0.4 + Math.sin(t / 180 + f) * 0.1;
        g.lineStyle(2.5, MURK_DARK, 0.85);
        g.lineBetween(hx, hy, hx + Math.cos(fa) * 14, hy + Math.sin(fa) * 14);
      }
    }

    // The face: nothing but eyes, hung at the wrong height.
    const hy0 = s.y - 44 + Math.sin(t / 500) * 3;
    const eye = s.hurt ? 0xffffff : s.enraged ? WOUND : MURK_LIT;
    const ex = Math.cos(s.facing) * 4;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.95);
      g.fillEllipse(s.x + side * 8 + ex, hy0 + side * 2, 7, s.enraged ? 9 : 5);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(s.x + side * 8 + ex - 1, hy0 + side * 2 - 1, 1.3);
    }
    // Motes bleeding off it.
    for (let i = 0; i < 5; i++) {
      const ph = ((t + i * 700) % 1600) / 1600;
      g.fillStyle(MURK, (1 - ph) * 0.5);
      g.fillCircle(
        s.x + Math.sin(i * 37) * 30, s.y + 20 - ph * 80, 2.5 + (1 - ph) * 2,
      );
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
