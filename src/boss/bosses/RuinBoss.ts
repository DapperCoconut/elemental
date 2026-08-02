import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Wrecking Crown — Sovereign of Ruin, and the first thing the Voice ever
 * ate. Root of the Corrupt Realm. Canon with the ruin challenge, 'The Wrecking
 * Crown' ("Every wall I ever raised, I was also aiming.").
 *
 * Ruin's whole gift is ending things, so the fight is architecture used as a
 * weapon: pillars raised in order to be dropped, a ball on a chain, and a
 * ceiling that gives up one fissure at a time.
 */

const RUIN = 0xc4392c;
const RUIN_LIT = 0xff8a6a;
const RUIN_DARK = 0x2a0f0c;
const MORTAR = 0xd9c9a8;

// ── Signature: Condemned ─────────────────────────────────────────────
// Three pillars shove up out of the floor, stand just long enough to be read,
// then topple one at a time along the line between themselves and you.

const condemned = (tk: BossToolkit): SignatureMove => {
  interface Pillar { x: number; y: number; risenAt: number; fallsAt: number; angle: number; fell: boolean }
  let pillars: Pillar[] = [];
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('explosion-large');
      const p = tk.player;
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(210, 330);
        const px = tk.clampX(p.x + Math.cos(a) * d, 70);
        const py = tk.clampY(p.y + Math.sin(a) * d, 120);
        const fallsAt = time + 1150 + i * 640;
        pillars.push({ x: px, y: py, risenAt: time, fallsAt, angle: 0, fell: false });
      }
    },
    update(time: number) {
      for (const pl of pillars) {
        if (pl.fell) continue;
        // The lean is decided at the last moment — aimed, not predestined.
        if (time > pl.fallsAt - 420) {
          if (pl.angle === 0) pl.angle = tk.angleToPlayer(pl.x, pl.y);
        }
        if (time >= pl.fallsAt) {
          pl.fell = true;
          tk.sfx('stone-slam');
          tk.spawnLane({
            x: pl.x, y: pl.y, angle: pl.angle,
            halfW: 36, warnMs: 0, fireMs: 460, damage: 30,
          });
          tk.boom(pl.x, pl.y, 44, MORTAR);
        }
      }
      pillars = pillars.filter((pl) => time < pl.fallsAt + 700);
    },
    drawGround(g, time) {
      for (const pl of pillars) {
        if (pl.fell) continue;
        const rise = Phaser.Math.Clamp((time - pl.risenAt) / 320, 0, 1);
        const lean = pl.angle !== 0 ? Phaser.Math.Clamp(1 - (pl.fallsAt - time) / 420, 0, 1) : 0;
        // Rubble skirt where it broke through the floor.
        g.fillStyle(RUIN_DARK, 0.7 * rise);
        g.fillEllipse(pl.x, pl.y, 56 * rise, 22 * rise);
        // The fall line, once it has picked a direction.
        if (lean > 0) {
          g.fillStyle(RUIN_LIT, 0.1 + lean * 0.28);
          const ca = Math.cos(pl.angle);
          const sa = Math.sin(pl.angle);
          const len = Math.hypot(tk.W, tk.H);
          g.beginPath();
          g.moveTo(pl.x - sa * 34, pl.y + ca * 34);
          g.lineTo(pl.x + sa * 34, pl.y - ca * 34);
          g.lineTo(pl.x + ca * len + sa * 34, pl.y + sa * len - ca * 34);
          g.lineTo(pl.x + ca * len - sa * 34, pl.y + sa * len + ca * 34);
          g.closePath();
          g.fillPath();
        }
      }
    },
    drawAir(g, time) {
      for (const pl of pillars) {
        if (pl.fell) continue;
        const rise = Phaser.Math.Clamp((time - pl.risenAt) / 320, 0, 1);
        const lean = pl.angle !== 0 ? Phaser.Math.Clamp(1 - (pl.fallsAt - time) / 420, 0, 1) : 0;
        // A column drawn as a stack of blocks, tipping over as it goes.
        const tilt = lean * 0.5;
        const dirX = Math.cos(pl.angle || 0) * tilt;
        for (let b = 0; b < 5; b++) {
          const h = (b + 1) / 5;
          if (h > rise) break;
          const oy = -b * 17 - 8;
          const ox = dirX * (b * 14);
          g.fillStyle(b % 2 === 0 ? RUIN : 0xa32d24, 0.95);
          g.fillRect(pl.x - 17 + ox, pl.y + oy, 34, 16);
          g.lineStyle(1, MORTAR, 0.35);
          g.strokeRect(pl.x - 17 + ox, pl.y + oy, 34, 16);
        }
        // Grit shaking loose as it decides.
        if (lean > 0.2) {
          for (let i = 0; i < 4; i++) {
            g.fillStyle(MORTAR, 0.4);
            g.fillCircle(
              pl.x + Phaser.Math.Between(-20, 20),
              pl.y - Phaser.Math.Between(0, 70),
              1.5,
            );
          }
        }
      }
    },
    onPhaseEnd() { pillars = []; },
  };
};

// ── Signature: The Crown Swings ──────────────────────────────────────
// The ball on the end of the chain. It winds up on a long, obvious arc, then
// takes two full passes around the boss — inside is safe, outside is safe, the
// ring it sweeps is not.

const crownSwing = (tk: BossToolkit): SignatureMove => {
  let startAt = 0;
  let endAt = 0;
  let a0 = 0;
  let dir = 1;
  let lastHitAt = 0;
  const WIND_MS = 950;
  const SWING_MS = 2200;
  const R = 190;
  const BALL_R = 30;
  const angleAt = (time: number): number => {
    const t = Phaser.Math.Clamp((time - startAt) / SWING_MS, 0, 1);
    return a0 + dir * t * Math.PI * 2.6;
  };
  return {
    durationMs: WIND_MS + SWING_MS + 250,
    cast(time: number) {
      tk.sfx('chain');
      a0 = tk.angleToPlayer() + Math.PI;
      dir = Math.random() < 0.5 ? 1 : -1;
      startAt = time + WIND_MS;
      endAt = startAt + SWING_MS;
    },
    update(time: number) {
      if (time < startAt || time > endAt) return;
      const a = angleAt(time);
      const bx = tk.bossX + Math.cos(a) * R;
      const by = tk.bossY + Math.sin(a) * R;
      const p = tk.player;
      if (!p.active) return;
      if (Phaser.Math.Distance.Between(bx, by, p.x, p.y) < BALL_R + 18 && time - lastHitAt > 500) {
        lastHitAt = time;
        tk.hitPlayer(26, p.x, p.y);
        tk.slowPlayer(0.62, 900);
        tk.boom(bx, by, 40, RUIN_LIT);
      }
    },
    drawGround(g, time) {
      if (time > endAt) return;
      // The swept ring, shown before anything enters it.
      const wind = time < startAt ? Phaser.Math.Clamp(1 - (startAt - time) / WIND_MS, 0, 1) : 1;
      g.lineStyle(BALL_R * 2, RUIN, 0.06 + wind * 0.1);
      g.strokeCircle(tk.bossX, tk.bossY, R);
      g.lineStyle(2, RUIN_LIT, 0.25 + wind * 0.4);
      g.strokeCircle(tk.bossX, tk.bossY, R);
    },
    drawAir(g, time) {
      if (time > endAt) return;
      const wind = time < startAt ? Phaser.Math.Clamp(1 - (startAt - time) / WIND_MS, 0, 1) : 1;
      // Winding up: the chain hauls back before it goes anywhere.
      const a = time < startAt ? a0 - dir * (1 - wind) * 1.1 : angleAt(time);
      const reach = time < startAt ? R * (0.4 + wind * 0.6) : R;
      const bx = tk.bossX + Math.cos(a) * reach;
      const by = tk.bossY + Math.sin(a) * reach;
      // Chain: links from body to ball.
      const links = 9;
      for (let i = 1; i < links; i++) {
        const t = i / links;
        g.fillStyle(0x8a7f74, 0.9);
        g.fillCircle(tk.bossX + (bx - tk.bossX) * t, tk.bossY + (by - tk.bossY) * t, 3.5);
      }
      // The ball: iron, with the crown's own bricks embedded in it.
      g.fillStyle(0x3a332e, 1);
      g.fillCircle(bx, by, BALL_R);
      g.fillStyle(0x5a504a, 1);
      g.fillCircle(bx - 6, by - 7, BALL_R * 0.55);
      g.fillStyle(RUIN, 0.9);
      for (let i = 0; i < 4; i++) {
        const ba = a + i * 1.6;
        g.fillRect(bx + Math.cos(ba) * 16 - 5, by + Math.sin(ba) * 16 - 4, 10, 8);
      }
      g.lineStyle(2, RUIN_LIT, 0.5 + Math.sin(time / 90) * 0.2);
      g.strokeCircle(bx, by, BALL_R);
    },
    onPhaseEnd() { endAt = 0; },
  };
};

// ── Signature: The Ceiling ───────────────────────────────────────────
// A fissure walks across the hall from one edge to the other, and everything
// it passes under comes down behind it. The crack is the warning; the crack
// travels slower than you do.

const theCeiling = (tk: BossToolkit): SignatureMove => {
  interface Crack { x: number; y: number }
  let crack: Crack[] = [];
  let running = false;
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('stone-slam');
      running = true;
      crack = [];
      const p = tk.player;
      // From one edge, through where the player stands, to the far side.
      const a = Math.atan2(p.y - tk.H / 2, p.x - tk.W / 2) + Math.PI;
      const sx = tk.clampX(tk.W / 2 + Math.cos(a) * 520, 20);
      const sy = tk.clampY(tk.H / 2 + Math.sin(a) * 420, 100);
      const ea = Math.atan2(p.y - sy, p.x - sx);
      const STEPS = 9;
      for (let i = 0; i < STEPS; i++) {
        const d = 90 + i * 88;
        const wobble = Math.sin(i * 1.7) * 46;
        const x = tk.clampX(sx + Math.cos(ea) * d - Math.sin(ea) * wobble, 50);
        const y = tk.clampY(sy + Math.sin(ea) * d + Math.cos(ea) * wobble, 110);
        crack.push({ x, y });
        tk.schedule(220 + i * 200, () => {
          tk.spawnZone({ x, y, radius: 62, warnMs: 1050, damage: 24, fall: true });
        });
      }
      tk.schedule(3400, () => { running = false; });
      void time;
    },
    drawGround(g, time) {
      if (!running || crack.length < 2) return;
      const pulse = 0.35 + Math.sin(time / 120) * 0.15;
      g.lineStyle(3, MORTAR, pulse);
      g.beginPath();
      g.moveTo(crack[0].x, crack[0].y);
      for (const c of crack.slice(1)) g.lineTo(c.x, c.y);
      g.strokePath();
      // Splinters off the main line, so it reads as stone and not a laser.
      for (let i = 0; i < crack.length; i += 2) {
        const c = crack[i];
        g.lineStyle(1.5, MORTAR, pulse * 0.7);
        g.lineBetween(c.x, c.y, c.x + Math.sin(i * 2.3) * 26, c.y + Math.cos(i * 1.9) * 22);
      }
    },
    onPhaseEnd() { running = false; crack = []; },
  };
};

export const RUIN_BOSS: WorldBossDef = {
  worldId: 'ruin',
  name: 'The Wrecking Crown',
  title: 'Sovereign of Ruin, First Eaten',
  color: RUIN,
  colorLit: RUIN_LIT,
  colorDark: RUIN_DARK,
  accent: MORTAR,
  bodyR: 31,

  intro: ['Every wall I ever raised, I was also aiming. You are standing in the last room with a roof.'],
  banter: [
    'I was exiled for ENDING things. Look what the ones who exiled me have ended up as.',
    'The Voice came first to me. I opened. I am an element of opening.',
    'Nothing is built that is not already scheduled.',
    'You keep repairing your stance. Stop. It is undignified.',
  ],
  defeatLine: 'CONDEMNED, THEN',

  phases: [
    {
      name: 'The Standing Ruin',
      line: 'Stand where you like. I will note it down and see it demolished.',
      hp: 470,
      cycle: [
        'sig:condemned', 'volley', 'sig:swing', 'barrage',
        'quake', 'sig:ceiling', 'slamchain', 'lanes',
      ],
      harass: ['h-snipe', 'h-flak', 'h-mines'],
      restMs: 1060,
      harassMs: 3100,
      moveSpeed: 44,
      holdDist: 300,
    },
    {
      name: 'Nothing Left Standing',
      line: 'Enough architecture. Let us discuss the ground.',
      hp: 530,
      cycle: [
        'sig:swing', 'sig:condemned', 'minefield', 'sig:ceiling',
        'quake', 'barrage', 'homing', 'lanes', 'slamchain',
      ],
      harass: ['h-snipe', 'h-mines', 'h-lane', 'h-flak'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 56,
      holdDist: 270,
    },
  ],

  hard: {
    introLine: 'THE CROWN HAS SCHEDULED THE FLOOR',
    extraPhase: {
      name: 'The Last Wall Falls',
      line: 'There is one wall left in all the realms and I am WEARING it.',
      hp: 410,
      cycle: [
        'sig:swing', 'sig:ceiling', 'sig:condemned', 'sanctuary',
        'quake', 'sig:swing', 'barrage', 'spiral',
      ],
      harass: ['h-mines', 'h-snipe', 'h-lane', 'h-rune'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 66,
      holdDist: 250,
    },
  },

  signatures: {
    condemned,
    swing: crownSwing,
    ceiling: theCeiling,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0d0605, 0.55);
    g.fillRect(0, 0, W, H);
    // A hall that lost its roof: broken arcade down both walls, rubble drifts.
    for (const side of [0, 1]) {
      const x = side === 0 ? 34 : W - 34;
      for (let i = 0; i < 4; i++) {
        const y = 140 + i * 110;
        g.fillStyle(RUIN_DARK, 0.85);
        g.fillRect(x - 16, y, 32, 84);
        g.fillStyle(0x1a0908, 0.9);
        g.fillCircle(x, y, 16);
        g.fillStyle(0x0d0605, 1);
        g.fillCircle(x, y + 6, 11);
      }
    }
    g.fillStyle(RUIN_DARK, 0.5);
    for (let i = 0; i < 26; i++) {
      const x = 60 + ((W - 120) * ((i * 37) % 100)) / 100;
      const y = 120 + ((H - 200) * ((i * 61) % 100)) / 100;
      g.fillRect(x, y, 14 + (i % 3) * 6, 9);
    }
    // The dust line where the ceiling used to be.
    g.fillStyle(MORTAR, 0.05);
    g.fillRect(0, 96, W, 26);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 48, 108, 19);

    const shake = s.hurt ? Phaser.Math.Between(-2, 2) : 0;
    const bx = s.x + shake;

    // The body: a heap of masonry that decided to stand up. Blocks stacked
    // slightly wrong, mortar bleeding light where the Voice got in.
    const blocks: [number, number, number, number][] = [
      [-36, 14, 72, 26], [-30, -10, 60, 24], [-24, -32, 48, 22],
    ];
    for (let i = 0; i < blocks.length; i++) {
      const [ox, oy, w, h] = blocks[i];
      const drift = Math.sin(t / 700 + i) * 2;
      g.fillStyle(i % 2 === 0 ? RUIN : 0xa32d24, 1);
      g.fillRect(bx + ox + drift, s.y + oy, w, h);
      g.lineStyle(1.5, RUIN_DARK, 0.9);
      g.strokeRect(bx + ox + drift, s.y + oy, w, h);
      g.lineStyle(1, MORTAR, 0.25);
      g.lineBetween(bx + ox + drift, s.y + oy + h / 2, bx + ox + drift + w, s.y + oy + h / 2);
    }
    // Mortar seams glowing from underneath — the Voice's residue.
    const glow = 0.25 + s.castGlow * 0.5 + (s.enraged ? 0.2 : 0);
    g.lineStyle(2, RUIN_LIT, glow);
    g.lineBetween(bx - 30, s.y + 12, bx + 30, s.y + 12);
    g.lineBetween(bx - 24, s.y - 12, bx + 24, s.y - 12);

    // Arms: two hanging chains with hooks, always faintly swinging.
    const dirX = Math.cos(s.facing);
    for (const side of [-1, 1]) {
      const ax = bx + side * 40;
      const sway = Math.sin(t / 420 + side) * 5;
      for (let i = 1; i <= 5; i++) {
        g.fillStyle(0x8a7f74, 0.85);
        g.fillCircle(ax + sway * (i / 5), s.y - 6 + i * 9, 3);
      }
      g.fillStyle(0x5a504a, 1);
      g.fillCircle(ax + sway, s.y + 42, 6);
    }

    // The crown: a ring of broken bricks that never sat straight.
    const cy = s.y - 46;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (Math.PI * i) / 6;
      const wob = Math.sin(t / 500 + i * 1.3) * 1.5;
      const px = bx + Math.cos(a) * 30;
      const py = cy + Math.sin(a) * 12 + wob;
      g.fillStyle(MORTAR, 0.85);
      g.fillRect(px - 5, py - 12, 10, 14);
      g.lineStyle(1, RUIN_DARK, 0.7);
      g.strokeRect(px - 5, py - 12, 10, 14);
    }
    g.lineStyle(3, MORTAR, 0.7);
    g.strokeEllipse(bx, cy + 2, 62, 22);

    // The face: a gap in the stonework with two coals set back inside it.
    g.fillStyle(0x120504, 1);
    g.fillRoundedRect(bx - 20, s.y - 30, 40, 18, 5);
    const eyeGlow = s.hurt ? 0xffffff : RUIN_LIT;
    for (const side of [-1, 1]) {
      const ex = bx + side * 9 + dirX * 3;
      g.fillStyle(eyeGlow, 0.9);
      g.fillCircle(ex, s.y - 21, 3.4 + s.castGlow * 1.6);
      g.fillStyle(0xffe0c0, 0.5);
      g.fillCircle(ex, s.y - 21, 1.5);
    }
    // Dust falling off it, permanently.
    for (let i = 0; i < 5; i++) {
      const ph = ((t + i * 420) % 1500) / 1500;
      g.fillStyle(MORTAR, (1 - ph) * 0.3);
      g.fillCircle(bx - 30 + i * 15 + Math.sin(t / 300 + i) * 4, s.y - 40 + ph * 80, 1.6);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 58);
    }
  },
};
