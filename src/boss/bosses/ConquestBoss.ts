import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Warmaster — Sovereign of Conquest, who took exile as territory. Canon
 * with the conquest challenge, 'The Warmaster' ("I lost one war in my life. I
 * am wearing what won.").
 *
 * Conquest plays the board, not the duel: it takes ground and makes you stand
 * somewhere worse. Banners claim the floor, the siege line walks it, and the
 * levy marches in ranks that have to be gone around rather than through.
 */

const WAR = 0xc23a2e;
const WAR_LIT = 0xff9a6a;
const WAR_DARK = 0x2a0c08;
const GOLD = 0xe8d48a;

// ── Signature: The Banners ───────────────────────────────────────────
// Three standards go into the floor and start claiming. Claimed ground burns
// whoever is not the Warmaster. It is not a trap — it is a map, growing.

const banners = (tk: BossToolkit): SignatureMove => {
  interface Banner { x: number; y: number; bornAt: number; dieAt: number; lastTick: number }
  let flags: Banner[] = [];
  const GROW_MS = 2600;
  const MAX_R = 118;
  const radiusOf = (b: Banner, time: number): number =>
    MAX_R * Phaser.Math.Clamp((time - b.bornAt) / GROW_MS, 0.12, 1);
  return {
    durationMs: 1500,
    cast(time: number) {
      tk.sfx('stone-rise');
      const p = tk.player;
      // Planted around the player at a distance that leaves lanes open —
      // three circles of 118 cannot seal a hall this size.
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = base + (Math.PI * 2 * i) / 3;
        flags.push({
          x: tk.clampX(p.x + Math.cos(a) * 185, 70),
          y: tk.clampY(p.y + Math.sin(a) * 165, 130),
          bornAt: time, dieAt: time + 9500, lastTick: 0,
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      for (const b of flags) {
        if (!p.active || time - b.lastTick < 620) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < radiusOf(b, time)) {
          b.lastTick = time;
          tk.hitPlayer(7, p.x, p.y);
          tk.slowPlayer(0.8, 700);
        }
      }
      flags = flags.filter((b) => time < b.dieAt);
    },
    drawGround(g, time) {
      for (const b of flags) {
        const r = radiusOf(b, time);
        const fade = Phaser.Math.Clamp((b.dieAt - time) / 900, 0, 1);
        g.fillStyle(WAR, 0.13 * fade);
        g.fillCircle(b.x, b.y, r);
        g.lineStyle(2, WAR_LIT, 0.45 * fade);
        g.strokeCircle(b.x, b.y, r);
        // Territory hatching, so claimed ground reads as owned, not merely lit.
        g.lineStyle(1, GOLD, 0.14 * fade);
        for (let i = -3; i <= 3; i++) {
          const off = i * (r / 3.5);
          const h = Math.sqrt(Math.max(0, r * r - off * off));
          g.lineBetween(b.x + off, b.y - h, b.x + off, b.y + h);
        }
      }
    },
    drawAir(g, time) {
      for (const b of flags) {
        const fade = Phaser.Math.Clamp((b.dieAt - time) / 900, 0, 1);
        // Pole, pennant, spear finial.
        g.lineStyle(3, 0x6a4a2a, fade);
        g.lineBetween(b.x, b.y, b.x, b.y - 54);
        g.fillStyle(GOLD, fade);
        g.fillTriangle(b.x - 3, b.y - 54, b.x + 3, b.y - 54, b.x, b.y - 64);
        const wave = Math.sin(time / 180 + b.x) * 4;
        g.fillStyle(WAR, 0.9 * fade);
        g.beginPath();
        g.moveTo(b.x, b.y - 52);
        g.lineTo(b.x + 34, b.y - 46 + wave);
        g.lineTo(b.x + 26, b.y - 34);
        g.lineTo(b.x + 34, b.y - 22 + wave);
        g.lineTo(b.x, b.y - 26);
        g.closePath();
        g.fillPath();
        g.fillStyle(GOLD, 0.8 * fade);
        g.fillCircle(b.x + 14, b.y - 39 + wave * 0.6, 4);
      }
    },
    onPhaseEnd() { flags = []; },
  };
};

// ── Signature: The Siege Line ────────────────────────────────────────
// Mortars walk a line of craters straight across the hall, then the ram comes
// down the lane the craters just drew. The second half is the point.

const siegeLine = (tk: BossToolkit): SignatureMove => {
  let laneA = 0;
  let laneX = 0;
  let laneY = 0;
  let showUntil = 0;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('mortar-launch');
      const p = tk.player;
      laneX = p.x;
      laneY = p.y;
      laneA = tk.angleToPlayer();
      showUntil = time + 4000;
      // Eight craters marching along the lane, from behind the player forward.
      for (let i = 0; i < 8; i++) {
        tk.schedule(i * 210, () => {
          const d = -260 + i * 90;
          tk.sfx('mortar-launch');
          tk.spawnZone({
            x: laneX + Math.cos(laneA) * d,
            y: laneY + Math.sin(laneA) * d,
            radius: 60, warnMs: 1200, damage: 22, fall: true,
          });
        });
      }
      // Then the ram, down the same line, telegraphed the whole way.
      tk.schedule(2500, () => {
        tk.sfx('stone-slam');
        tk.spawnLane({
          x: laneX, y: laneY, angle: laneA,
          halfW: 52, warnMs: 1100, fireMs: 520, damage: 34,
        });
      });
    },
    drawGround(g, time) {
      if (time > showUntil) return;
      const a = 0.18 + Math.sin(time / 150) * 0.06;
      const ca = Math.cos(laneA);
      const sa = Math.sin(laneA);
      const len = Math.hypot(tk.W, tk.H);
      g.lineStyle(2, GOLD, a);
      g.lineBetween(laneX - ca * len, laneY - sa * len, laneX + ca * len, laneY + sa * len);
      // Range marks along the line — a gunner's ranging, drawn in chalk.
      for (let i = -4; i <= 4; i++) {
        const mx = laneX + ca * i * 90;
        const my = laneY + sa * i * 90;
        g.lineStyle(1.5, GOLD, a * 1.4);
        g.lineBetween(mx - sa * 12, my + ca * 12, mx + sa * 12, my - ca * 12);
      }
    },
    onPhaseEnd() { showUntil = 0; },
  };
};

// ── Signature: The Levy ──────────────────────────────────────────────
// A rank forms at the top of the hall and walks down in step behind a shield
// wall. The wall has exactly one gap, and it is where the rank is thinnest.

const theLevy = (tk: BossToolkit): SignatureMove => {
  let wallY = 0;
  let gapX = 0;
  let running = false;
  let lastHitAt = 0;
  const GAP_HALF = 84;
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('drum-hit');
      wallY = 110;
      gapX = tk.clampX(tk.player.x < tk.W / 2 ? tk.W * 0.72 : tk.W * 0.28, 120);
      running = true;
      // Soldiers with the wall — a levy, not a wall alone.
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 300, () => {
          tk.spawnAdd({
            x: 140 + i * ((tk.W - 280) / 2), y: 150,
            hp: 65, speed: 128, damage: 18, ranged: i === 1, maxAlive: 6,
          });
        });
      }
      tk.schedule(4800, () => { running = false; });
      void time;
    },
    update(time: number, dt: number) {
      if (!running) return;
      wallY += 120 * dt;
      if (wallY > tk.H + 40) { running = false; return; }
      const p = tk.player;
      if (!p.active) return;
      if (Math.abs(p.y - wallY) < 24 && Math.abs(p.x - gapX) > GAP_HALF && time - lastHitAt > 700) {
        lastHitAt = time;
        tk.hitPlayer(26, p.x, p.y);
        tk.slowPlayer(0.6, 800);
      }
    },
    drawAir(g, time) {
      if (!running) return;
      // Shields, overlapping, with the gap where the rank never filled in.
      for (let x = 40; x < tk.W - 20; x += 46) {
        if (Math.abs(x + 23 - gapX) < GAP_HALF) continue;
        const step = Math.sin(time / 200 + x / 60) * 2;
        g.fillStyle(0x6a4a2a, 1);
        g.fillRoundedRect(x, wallY - 22 + step, 44, 44, 6);
        g.fillStyle(WAR, 0.9);
        g.fillRoundedRect(x + 4, wallY - 18 + step, 36, 36, 5);
        g.fillStyle(GOLD, 0.85);
        g.fillCircle(x + 22, wallY + step, 6);
        g.lineStyle(1.5, GOLD, 0.5);
        g.strokeRoundedRect(x, wallY - 22 + step, 44, 44, 6);
        // Spears over the top.
        g.lineStyle(2, 0x8a7a5a, 0.8);
        g.lineBetween(x + 34, wallY - 22 + step, x + 40, wallY - 54 + step);
      }
      // The gap, marked in the colour of the way out.
      g.fillStyle(GOLD, 0.1 + Math.sin(time / 160) * 0.05);
      g.fillRect(gapX - GAP_HALF, wallY - 26, GAP_HALF * 2, 52);
      g.lineStyle(2, GOLD, 0.5);
      g.lineBetween(gapX - GAP_HALF, wallY - 26, gapX - GAP_HALF, wallY + 26);
      g.lineBetween(gapX + GAP_HALF, wallY - 26, gapX + GAP_HALF, wallY + 26);
    },
    onPhaseEnd() { running = false; },
  };
};

export const CONQUEST_BOSS: WorldBossDef = {
  worldId: 'conquest',
  name: 'The Warmaster',
  title: 'Sovereign of Conquest, Who Annexed Its Own Exile',
  color: WAR,
  colorLit: WAR_LIT,
  colorDark: WAR_DARK,
  accent: GOLD,
  bodyR: 33,

  intro: ['I lost one war in my life. I am wearing what won. Shall we discuss terms, or ground?'],
  banter: [
    'You have taken no territory this entire engagement. I have counted.',
    'They exiled me for wanting everything. I have since revised the figure upward.',
    'The Voice offered me a realm. A REALM. I already had a map of it.',
    'Stand still and I will name the spot after you. Posthumously. Briefly.',
  ],
  defeatLine: 'GROUND CEDED',

  phases: [
    {
      name: 'The Annexation',
      line: 'Every step you take, I have already taxed.',
      hp: 470,
      cycle: [
        'sig:banners', 'volley', 'sig:siege', 'summon',
        'sig:levy', 'lanes', 'radial', 'slamchain',
      ],
      harass: ['h-lane', 'h-flak', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 48,
      holdDist: 300,
    },
    {
      name: 'Total War',
      line: 'Terms withdrawn. There is only the map now, and you are on the wrong part of it.',
      hp: 540,
      cycle: [
        'sig:siege', 'sig:banners', 'sig:levy', 'barrage',
        'quake', 'summon', 'spiral', 'lanes', 'charge',
      ],
      harass: ['h-lane', 'h-snipe', 'h-flak', 'h-mines'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 60,
      holdDist: 270,
    },
  ],

  hard: {
    introLine: 'THE WARMASTER HAS CALLED THE FULL LEVY',
    extraPhase: {
      name: 'The Last Campaign',
      line: 'I have conquered seventeen worlds since breakfast. You are the afternoon.',
      hp: 420,
      cycle: [
        'sig:banners', 'sig:levy', 'sig:siege', 'sanctuary',
        'summon', 'sig:banners', 'quake', 'charge',
      ],
      harass: ['h-lane', 'h-mines', 'h-snipe', 'h-flak'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 70,
      holdDist: 250,
    },
  },

  signatures: {
    banners,
    siege: siegeLine,
    levy: theLevy,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x120705, 0.55);
    g.fillRect(0, 0, W, H);
    // A campaign map burnt into the floor: contours, a river, claimed hatching.
    g.lineStyle(1.5, GOLD, 0.07);
    for (let i = 0; i < 6; i++) {
      g.strokeEllipse(W * 0.34, H * 0.55, 90 + i * 46, 60 + i * 30);
    }
    g.lineStyle(6, 0x2a4a6a, 0.14);
    g.beginPath();
    g.moveTo(0, H * 0.34);
    g.lineTo(W * 0.3, H * 0.44);
    g.lineTo(W * 0.55, H * 0.3);
    g.lineTo(W, H * 0.4);
    g.strokePath();
    // Field defences down the flanks: stakes and a low earthwork.
    for (const side of [0, 1]) {
      const x = side === 0 ? 26 : W - 26;
      g.fillStyle(WAR_DARK, 0.85);
      g.fillRect(x - 12, 96, 24, H - 96);
      for (let i = 0; i < 9; i++) {
        g.fillStyle(0x6a4a2a, 0.7);
        g.fillTriangle(x - 8, 130 + i * 60, x + 8, 130 + i * 60, x, 108 + i * 60);
      }
    }
    // Trophies: the standards of somewhere that used to have its own.
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * ((W - 240) / 4);
      g.lineStyle(2, 0x4a3420, 0.5);
      g.lineBetween(x, 96, x, 150);
      g.fillStyle(WAR, 0.16);
      g.fillTriangle(x, 104, x + 22, 116, x, 130);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.42);
    g.fillEllipse(s.x, s.y + 50, 106, 18);

    const dirX = Math.cos(s.facing);
    const breathe = Math.sin(t / 620) * 1.5;

    // Plate: pauldrons wider than the wearer, a tabard, a war-belt.
    g.fillStyle(0x4a4038, 1);
    g.fillRoundedRect(s.x - 40, s.y - 26 + breathe, 80, 70, 12);
    g.fillStyle(0x5e5248, 1);
    g.fillRoundedRect(s.x - 33, s.y - 20 + breathe, 66, 58, 10);
    for (const side of [-1, 1]) {
      g.fillStyle(0x6a5c50, 1);
      g.fillEllipse(s.x + side * 42, s.y - 14 + breathe, 30, 26);
      g.fillStyle(GOLD, 0.5);
      g.fillEllipse(s.x + side * 42, s.y - 20 + breathe, 22, 10);
    }
    // Tabard, in the colour it took from somebody.
    g.fillStyle(WAR, 0.95);
    g.fillRect(s.x - 13, s.y - 18 + breathe, 26, 60);
    g.fillStyle(GOLD, 0.85);
    g.fillCircle(s.x, s.y + 4 + breathe, 9);
    g.fillStyle(WAR_DARK, 0.9);
    g.fillCircle(s.x, s.y + 4 + breathe, 4);
    g.fillStyle(0x3a2a1c, 1);
    g.fillRect(s.x - 34, s.y + 30 + breathe, 68, 10);
    g.fillStyle(GOLD, 0.8);
    g.fillRect(s.x - 8, s.y + 29 + breathe, 16, 12);

    // Hands: the standard in one, the sword grounded in the other.
    const bx = s.x - dirX * 44;
    g.lineStyle(4, 0x6a4a2a, 1);
    g.lineBetween(bx, s.y + 40, bx - 4, s.y - 70);
    g.fillStyle(GOLD, 1);
    g.fillTriangle(bx - 8, s.y - 70, bx, s.y - 70, bx - 4, s.y - 84);
    const wave = Math.sin(t / 200) * 5;
    g.fillStyle(WAR, 0.95);
    g.beginPath();
    g.moveTo(bx - 4, s.y - 66);
    g.lineTo(bx + 40, s.y - 58 + wave);
    g.lineTo(bx + 30, s.y - 42);
    g.lineTo(bx + 40, s.y - 26 + wave);
    g.lineTo(bx - 4, s.y - 32);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x8a7a68, 1);
    g.fillCircle(bx, s.y + 22, 8);

    const sx = s.x + dirX * 44;
    g.fillStyle(0x8a7a68, 1);
    g.fillCircle(sx, s.y + 10 - s.castGlow * 12, 8);
    g.lineStyle(6, 0xb8b2a4, 1);
    g.lineBetween(sx, s.y + 14 - s.castGlow * 12, sx + dirX * 8, s.y + 54);
    g.lineStyle(2, GOLD, 0.6 + s.castGlow * 0.4);
    g.lineBetween(sx, s.y + 14 - s.castGlow * 12, sx + dirX * 8, s.y + 54);

    // Helm: a full visor with a crest, and two coals behind the slit.
    const hy = s.y - 48 + breathe;
    g.fillStyle(0x5e5248, 1);
    g.fillRoundedRect(s.x - 17, hy - 20, 34, 40, 9);
    g.fillStyle(0x3a332c, 1);
    g.fillRect(s.x - 17, hy - 4, 34, 8);
    const eye = s.hurt ? 0xffffff : WAR_LIT;
    g.fillStyle(eye, 0.9 + s.castGlow * 0.1);
    g.fillCircle(s.x - 7 + dirX * 3, hy, 2.6 + s.castGlow);
    g.fillCircle(s.x + 7 + dirX * 3, hy, 2.6 + s.castGlow);
    // Breath through the visor slots when it is angry.
    if (s.enraged) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t + i * 400) % 1200) / 1200;
        g.fillStyle(WAR_LIT, (1 - ph) * 0.18);
        g.fillCircle(s.x + dirX * (16 + ph * 26), hy + 8, 3 + ph * 5);
      }
    }
    // The crest: horsehair, taken from a horse that also lost.
    g.fillStyle(WAR, 0.95);
    for (let i = 0; i < 9; i++) {
      const h = 20 - Math.abs(i - 4) * 2.5;
      g.fillRect(s.x - 2, hy - 22 - h, 4, h);
    }
    g.fillStyle(GOLD, 0.9);
    g.fillRect(s.x - 3, hy - 24, 6, 5);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 60);
    }
  },
};
