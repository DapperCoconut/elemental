import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Endless Minute — Sovereign of the Hourglass. Time world's boss (world id
 * `sand`): it has already fought you, and it brought the recording.
 * Canon with the sand challenge, 'The Endless Minute'.
 */

const SAND = 0xd8b13d;
const SAND_LIT = 0xfff0a8;
const SAND_DARK = 0x3a2f0a;
const CLOCK = 0x9adfe8;

// ── Signature: The Replay ────────────────────────────────────────────
// It records where you have been for the last few seconds — visibly — then
// detonates the recording point by point. Your own past is the minefield.

const TRAIL_SPACING_MS = 300;
const TRAIL_LEN = 9;

const theReplay = (tk: BossToolkit): SignatureMove => {
  interface Crumb { x: number; y: number }
  const trail: Crumb[] = [];
  let lastCrumbAt = 0;
  let replaying = false;
  return {
    durationMs: 2800,
    cast(time: number) {
      tk.sfx('curse-cast');
      replaying = true;
      const snapshot = [...trail];
      snapshot.forEach((c, i) => {
        tk.schedule(500 + i * 220, () => {
          tk.spawnZone({ x: c.x, y: c.y, radius: 48, warnMs: 620, damage: 14 });
        });
      });
      tk.schedule(500 + snapshot.length * 220 + 700, () => { replaying = false; });
      void time;
    },
    update(time: number) {
      // Always recording — that is the unsettling part.
      if (time - lastCrumbAt < TRAIL_SPACING_MS) return;
      lastCrumbAt = time;
      const p = tk.player;
      if (!p.active) return;
      trail.push({ x: p.x, y: p.y });
      if (trail.length > TRAIL_LEN) trail.shift();
    },
    drawGround(g, time) {
      // The recording, faintly visible at all times; bright while replaying.
      const alpha = replaying ? 0.5 : 0.14 + Math.sin(time / 600) * 0.04;
      trail.forEach((c, i) => {
        g.lineStyle(1.5, CLOCK, alpha * ((i + 1) / trail.length));
        g.strokeCircle(c.x, c.y, 10);
      });
    },
    onPhaseEnd() { trail.length = 0; replaying = false; },
  };
};

// ── Signature: The Hourglass ─────────────────────────────────────────
// Two walls of falling sand sweep in from both edges at once and meet in the
// middle — the pinch is the puzzle: cross one early, or hold the centre gap
// where they stop just short of touching.

const HOURGLASS_MS = 3400;
const WALL_HALF_W = 30;

const theHourglass = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let startsAt = 0;
  let dealtAt = 0;
  return {
    durationMs: 1200 + HOURGLASS_MS,
    cast(time: number) {
      tk.sfx('judgement');
      active = true;
      startsAt = time + 1200;
      dealtAt = 0;
    },
    update(time: number) {
      if (!active) return;
      if (time > startsAt + HOURGLASS_MS) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / HOURGLASS_MS;
      // Each wall crosses 42% of the hall — a centre corridor always survives.
      const travel = (tk.W / 2 - 70) * t;
      const xs = [40 + travel, tk.W - 40 - travel];
      const p = tk.player;
      if (!p.active || time - dealtAt < 1100) return;
      for (const [i, x] of xs.entries()) {
        if (Math.abs(p.x - x) < WALL_HALF_W) {
          dealtAt = time;
          tk.hitPlayer(20, p.x, p.y);
          p.x = Phaser.Math.Clamp(p.x + (i === 0 ? 40 : -40), 44, tk.W - 44);
          tk.slowPlayer(0.6, 800);
        }
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const warming = time < startsAt;
      const t = warming ? 0 : (time - startsAt) / HOURGLASS_MS;
      const travel = (tk.W / 2 - 70) * t;
      for (const [i, x] of [40 + travel, tk.W - 40 - travel].entries()) {
        if (warming) {
          g.lineStyle(4, SAND_LIT, 0.25 + ((time - (startsAt - 1200)) / 1200) * 0.5);
          g.lineBetween(i === 0 ? 44 : tk.W - 44, 90, i === 0 ? 44 : tk.W - 44, tk.H - 36);
          continue;
        }
        g.fillStyle(SAND, 0.35);
        g.fillRect(x - WALL_HALF_W, 90, WALL_HALF_W * 2, tk.H - 126);
        // Falling grain streaks inside the wall.
        for (let k = 0; k < 6; k++) {
          const gy = 100 + (((time / 3 + k * 97) % (tk.H - 150)));
          g.fillStyle(SAND_LIT, 0.7);
          g.fillCircle(x + ((k * 37) % (WALL_HALF_W * 2)) - WALL_HALF_W, gy, 1.8);
        }
        g.lineStyle(2, SAND_LIT, 0.8);
        g.lineBetween(x + (i === 0 ? WALL_HALF_W : -WALL_HALF_W), 90, x + (i === 0 ? WALL_HALF_W : -WALL_HALF_W), tk.H - 36);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Stutter ───────────────────────────────────────────
// The second hand catches. The player wades through syrup for a breath while
// three quick pulses ring off the Sovereign — walk the gaps, don't sprint.

const theStutter = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  return {
    durationMs: 2600,
    cast(time: number) {
      tk.sfx('dark-drain');
      activeUntil = time + 2200;
      const gap = tk.angleToPlayer();
      for (let i = 0; i < 3; i++) {
        tk.spawnRing({
          cx: tk.bossX, cy: tk.bossY, delayMs: 400 + i * 550,
          speed: 300, gapCentre: gap + i * 0.3, gapHalf: 0.55,
          band: 26, damage: 16,
        });
      }
    },
    update(time: number) {
      if (time < activeUntil) tk.slowPlayer(0.55, 120);
    },
    drawAir(g, time) {
      if (time >= activeUntil) return;
      // The caught second hand, trembling over the boss.
      const a = -Math.PI / 2 + Math.sin(time / 60) * 0.05;
      g.lineStyle(2.5, CLOCK, 0.8);
      g.lineBetween(tk.bossX, tk.bossY - 54, tk.bossX + Math.cos(a) * 20, tk.bossY - 54 + Math.sin(a) * 20);
      g.lineStyle(1.5, CLOCK, 0.5);
      g.strokeCircle(tk.bossX, tk.bossY - 54, 12);
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const TIME_BOSS: WorldBossDef = {
  worldId: 'sand',
  name: 'The Endless Minute',
  title: 'Sovereign of the Hourglass',
  color: SAND,
  colorLit: SAND_LIT,
  colorDark: SAND_DARK,
  accent: CLOCK,
  bodyR: 28,

  intro: ['I will outlast you by definition. Comfortable? This takes a minute. The same one, repeatedly.'],
  banter: [
    'You are seven seconds behind. You have always been seven seconds behind.',
    'The Voice thinks it is patient. I have watched it think that forever.',
    'That dodge was good. I know. I watched it four times.',
    'Tick. The tock is scheduled.',
  ],
  defeatLine: 'THE MINUTE ENDS',

  phases: [
    {
      name: 'The First Pass',
      line: 'We have done this before. You were marvellous. Try to keep up with yourself.',
      hp: 420,
      cycle: [
        'sig:replay', 'volley', 'sig:hourglass', 'lanes',
        'sig:stutter', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-rune', 'h-flak', 'h-snipe'],
      restMs: 1080,
      harassMs: 3200,
      moveSpeed: 55,
      holdDist: 280,
    },
    {
      name: 'The Second Pass',
      line: 'Now the version where I stop being polite about causality.',
      hp: 460,
      cycle: [
        'sig:stutter', 'sig:replay', 'quake', 'sig:hourglass',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-flak', 'h-snipe'],
      restMs: 930,
      harassMs: 2700,
      moveSpeed: 65,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'THE MINUTE HAS BEEN RUNNING SINCE YOU WERE BORN',
    extraPhase: {
      name: 'The Minute That Never Ends',
      line: 'This is the sixtieth second. I have decided it does not finish.',
      hp: 350,
      cycle: [
        'sig:replay', 'sig:hourglass', 'sig:stutter', 'sanctuary',
        'quake', 'spiral', 'sig:replay', 'homing',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-flak'],
      restMs: 720,
      harassMs: 2200,
      moveSpeed: 80,
      holdDist: 230,
    },
  },

  signatures: {
    replay: theReplay,
    hourglass: theHourglass,
    stutter: theStutter,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x120e04, 0.5);
    g.fillRect(0, 0, W, H);
    // Dunes and half-buried clock faces.
    for (let i = 0; i < 4; i++) {
      g.fillStyle(SAND_DARK, 0.5);
      g.fillEllipse((W / 4) * i + 90, H - 40 - (i % 2) * 24, 190, 34);
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['time-boss-arena']);
    for (let i = 0; i < 3; i++) {
      const x = rnd.integerInRange(W * 0.15, W * 0.85);
      const y = rnd.integerInRange(H * 0.5, H * 0.8);
      g.lineStyle(2, CLOCK, 0.18);
      g.strokeCircle(x, y, 22);
      g.lineBetween(x, y, x + 10, y - 6);
      g.lineBetween(x, y, x - 3, y - 14);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 46, 88, 16);

    // The robed base — a drift of sand it stands in, or is.
    g.fillStyle(SAND_DARK, 1);
    g.fillTriangle(s.x - 30, s.y + 44, s.x + 30, s.y + 44, s.x, s.y + 2);
    g.fillStyle(SAND, 0.7);
    g.fillTriangle(s.x - 20, s.y + 42, s.x + 20, s.y + 42, s.x, s.y + 10);

    // The hourglass torso: two glass bulbs, sand pouring between.
    const pour = (t % 1200) / 1200;
    // Frame.
    g.lineStyle(3, SAND_DARK, 1);
    g.lineBetween(s.x - 20, s.y - 34, s.x + 20, s.y - 34);
    g.lineBetween(s.x - 20, s.y + 6, s.x + 20, s.y + 6);
    g.lineBetween(s.x - 18, s.y - 34, s.x - 4, s.y - 14);
    g.lineBetween(s.x + 18, s.y - 34, s.x + 4, s.y - 14);
    g.lineBetween(s.x - 4, s.y - 14, s.x - 18, s.y + 6);
    g.lineBetween(s.x + 4, s.y - 14, s.x + 18, s.y + 6);
    // Glass sheen.
    g.fillStyle(CLOCK, 0.1);
    g.fillTriangle(s.x - 16, s.y - 32, s.x + 16, s.y - 32, s.x, s.y - 14);
    g.fillTriangle(s.x - 16, s.y + 4, s.x + 16, s.y + 4, s.x, s.y - 14);
    // Sand: upper reservoir shrinks with hp, stream, lower pile.
    const upper = 4 + s.hpRatio * 8;
    g.fillStyle(SAND_LIT, 0.9);
    g.fillTriangle(s.x - upper, s.y - 32, s.x + upper, s.y - 32, s.x, s.y - 32 + upper * 1.4);
    g.lineStyle(1.5, SAND_LIT, 0.9);
    g.lineBetween(s.x, s.y - 14, s.x, s.y - 14 + pour * 16);
    g.fillStyle(SAND_LIT, 0.9);
    g.fillTriangle(s.x - 10, s.y + 4, s.x + 10, s.y + 4, s.x, s.y - 4);

    // Arms: thin brass hands — literal clock hands — tracking the player.
    for (const side of [-1, 1]) {
      const aa = s.facing + side * 0.7 + s.castGlow * side * 0.2;
      g.lineStyle(3, SAND_DARK, 1);
      g.lineBetween(s.x + side * 14, s.y - 16, s.x + Math.cos(aa) * 44, s.y - 10 + Math.sin(aa) * 30);
      g.fillStyle(CLOCK, 0.9);
      g.fillTriangle(
        s.x + Math.cos(aa) * 44 - 3, s.y - 10 + Math.sin(aa) * 30 - 3,
        s.x + Math.cos(aa) * 44 + 3, s.y - 10 + Math.sin(aa) * 30 - 3,
        s.x + Math.cos(aa) * 50, s.y - 10 + Math.sin(aa) * 34,
      );
    }

    // The head: a clock face with hands that run wrong.
    const hy0 = s.y - 48;
    g.fillStyle(SAND_DARK, 1);
    g.fillCircle(s.x, hy0, 16);
    g.fillStyle(0xf2ead0, 0.95);
    g.fillCircle(s.x, hy0, 13);
    for (let i = 0; i < 12; i += 3) {
      const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
      g.fillStyle(SAND_DARK, 0.9);
      g.fillCircle(s.x + Math.cos(a) * 10, hy0 + Math.sin(a) * 10, 1);
    }
    // Hands: the minute hand spins backwards; the hour hand points at YOU.
    const minA = -t / 400;
    g.lineStyle(2, SAND_DARK, 1);
    g.lineBetween(s.x, hy0, s.x + Math.cos(minA) * 10, hy0 + Math.sin(minA) * 10);
    const eye = s.hurt ? 0xff4030 : s.enraged ? 0xcc3020 : SAND_DARK;
    g.lineStyle(2.5, eye, 1);
    g.lineBetween(s.x, hy0, s.x + Math.cos(s.facing) * 7, hy0 + Math.sin(s.facing) * 7);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
