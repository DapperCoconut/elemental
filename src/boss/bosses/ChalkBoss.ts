import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Draughtsman — Sovereign of Chalk, who was never allowed to make anything
 * real and out here has stopped asking. Canon with the chalk challenge, 'The
 * Draughtsman' ("You are a rough sketch. I am the fair copy.").
 *
 * Everything it fights with is drawn in front of you first: the sketch takes a
 * second and a half to become a thing, the hopscotch grid shows its numbers,
 * and the duster is the slowest hazard in the realm. Chalk is honest. Chalk is
 * simply faster at drawing than you are at reading.
 */

const CHALK = 0xf4f1e6;
const CHALK_LIT = 0xffffff;
const BOARD = 0x14201c;
const BLUE = 0x8ecfff;
const ROSE = 0xff9ec4;

// ── Signature: The Sketch ────────────────────────────────────────────
// It draws something, badly and quickly, and then the something notices you.

const theSketch = (tk: BossToolkit): SignatureMove => {
  interface Draw { x: number; y: number; bornAt: number; liveAt: number; dieAt: number; ang: number; sped: number; lastHitAt: number; kind: number }
  let draws: Draw[] = [];
  const DRAW_MS = 1500;
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('ui-type');
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const p = tk.player;
        const x = tk.clampX(p.x + Math.cos(a) * Phaser.Math.Between(230, 340), 70);
        const y = tk.clampY(p.y + Math.sin(a) * Phaser.Math.Between(200, 300), 140);
        draws.push({
          x, y, bornAt: time + i * 200, liveAt: time + i * 200 + DRAW_MS,
          dieAt: time + i * 200 + DRAW_MS + 4200,
          ang: 0, sped: 165, lastHitAt: 0, kind: i % 3,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const d of draws) {
        if (time < d.liveAt) continue;
        if (d.ang === 0) {
          tk.sfx('chaos');
          d.ang = Math.atan2(p.y - d.y, p.x - d.x);
        }
        // Once alive it commits to a heading and only lazily corrects — a
        // drawing has no real interest in where you went.
        const want = Math.atan2(p.y - d.y, p.x - d.x);
        d.ang = Phaser.Math.Angle.RotateTo(d.ang, want, 1.1 * dt);
        d.x += Math.cos(d.ang) * d.sped * dt;
        d.y += Math.sin(d.ang) * d.sped * dt;
        if (p.active && time - d.lastHitAt > 700
          && Phaser.Math.Distance.Between(d.x, d.y, p.x, p.y) < 34) {
          d.lastHitAt = time;
          tk.hitPlayer(20, p.x, p.y);
          d.dieAt = 0;
          tk.boom(d.x, d.y, 34, CHALK);
        }
      }
      draws = draws.filter((d) => time < d.dieAt);
    },
    drawAir(g, time) {
      for (const d of draws) {
        const prog = Phaser.Math.Clamp((time - d.bornAt) / DRAW_MS, 0, 1);
        const alive = time >= d.liveAt;
        const col = d.kind === 0 ? CHALK : d.kind === 1 ? BLUE : ROSE;
        const alpha = alive ? 0.95 : 0.5 + prog * 0.4;
        g.lineStyle(3, col, alpha);
        // The outline is drawn stroke by stroke, in order, as it is completed.
        const strokes: [number, number, number, number][] = d.kind === 0
          // A dog. Probably a dog.
          ? [[-24, 8, 24, 8], [-24, 8, -24, 24], [24, 8, 24, 24],
            [-24, 8, -30, -8], [-30, -8, -14, -12], [-14, -12, -8, 4], [24, 8, 30, -6]]
          : d.kind === 1
            // A house that got up.
            ? [[-20, 20, 20, 20], [-20, 20, -20, -6], [20, 20, 20, -6],
              [-20, -6, 0, -24], [0, -24, 20, -6], [-8, 20, -8, 4], [-8, 4, 4, 4]]
            // A sun with a face and intentions.
            : [[-16, 0, 16, 0], [0, -16, 0, 16], [-12, -12, 12, 12], [12, -12, -12, 12],
              [-6, -4, -4, -4], [4, -4, 6, -4], [-6, 6, 6, 6]];
        const shown = Math.ceil(strokes.length * prog);
        for (let i = 0; i < shown; i++) {
          const [ax, ay, bxp, byp] = strokes[i];
          const jitter = alive ? Math.sin(time / 70 + i) * 1.5 : 0;
          g.lineBetween(d.x + ax + jitter, d.y + ay, d.x + bxp, d.y + byp + jitter);
        }
        if (!alive) {
          // Chalk dust falling off the line being drawn.
          g.fillStyle(col, 0.4);
          g.fillCircle(d.x + Phaser.Math.Between(-20, 20), d.y + Phaser.Math.Between(-16, 22), 1.5);
        }
      }
    },
    onPhaseEnd() { draws = []; },
  };
};

// ── Signature: The Duster ────────────────────────────────────────────
// The board wipes. It is enormous, it is slow, and for a second and a half
// afterward the wiped strip is unreadable — which is where the next thing goes.

const theDuster = (tk: BossToolkit): SignatureMove => {
  let x = 0;
  let vx = 0;
  let running = false;
  let lastHitAt = 0;
  const HALF = 62;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('whoosh');
      const fromLeft = tk.player.x > tk.W / 2;
      x = fromLeft ? -HALF : tk.W + HALF;
      vx = (fromLeft ? 1 : -1) * 205;
      running = false;
      tk.schedule(1100, () => { running = true; });
      tk.schedule(4200, () => { running = false; });
      // What it wipes toward, it also un-draws — dust clouds behind the sweep.
      for (let i = 0; i < 5; i++) {
        tk.schedule(1400 + i * 620, () => {
          tk.spawnZone({
            x: x, y: tk.clampY(tk.player.y + Phaser.Math.Between(-160, 160), 140),
            radius: 56, warnMs: 800, damage: 14,
          });
        });
      }
      void time;
    },
    update(time: number, dt: number) {
      if (!running) return;
      x += vx * dt;
      const p = tk.player;
      if (!p.active) return;
      if (Math.abs(p.x - x) < HALF && time - lastHitAt > 650) {
        lastHitAt = time;
        tk.hitPlayer(20, p.x, p.y);
        tk.slowPlayer(0.6, 800);
      }
    },
    drawAir(g, time) {
      if (!running) {
        // Parked at the edge, pointed at the board. Impossible to misread.
        g.fillStyle(0x6a5a3a, 0.5 + Math.sin(time / 140) * 0.15);
        g.fillRect(vx > 0 ? 0 : tk.W - 24, 96, 24, tk.H - 96);
        return;
      }
      // The felt: a great block, with a wooden back and a comet of dust.
      g.fillStyle(0x6a5a3a, 0.95);
      g.fillRect(x - HALF, 96, HALF * 2, tk.H - 96);
      g.fillStyle(0x3a3226, 0.95);
      g.fillRect(x - HALF, 96, 16, tk.H - 96);
      g.fillStyle(CHALK, 0.16);
      g.fillRect(x - HALF - (vx > 0 ? 40 : -HALF * 2), 96, 40, tk.H - 96);
      for (let i = 0; i < 22; i++) {
        const ph = ((time + i * 130) % 900) / 900;
        g.fillStyle(CHALK, (1 - ph) * 0.4);
        g.fillCircle(
          x - Math.sign(vx) * (HALF + ph * 60),
          120 + ((i * 71) % (tk.H - 160)),
          1.5 + ph * 3,
        );
      }
      // The clean strip it leaves behind — briefly the only blank board here.
      g.fillStyle(BOARD, 0.35);
      g.fillRect(x - Math.sign(vx) * (HALF + 130), 96, 130, tk.H - 96);
    },
    onPhaseEnd() { running = false; },
  };
};

// ── Signature: Hopscotch ─────────────────────────────────────────────
// A numbered grid, chalked on the floor. The numbers go off in order. The
// order is written on the floor. There is no trick; there is only reading.

const hopscotch = (tk: BossToolkit): SignatureMove => {
  interface Cell { x: number; y: number; n: number; firesAt: number; fired: boolean }
  let cells: Cell[] = [];
  const SIZE = 96;
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('ui-type');
      const cols = 5;
      const rows = 3;
      const ox = (tk.W - cols * SIZE) / 2 + SIZE / 2;
      const oy = 150 + SIZE / 2;
      const order: number[] = [];
      for (let i = 0; i < cols * rows; i++) order.push(i);
      // Fire two thirds of the board, in a shuffled order, one every 260ms.
      order.sort(() => Math.random() - 0.5);
      const used = order.slice(0, Math.floor(order.length * 0.66));
      used.forEach((idx, n) => {
        cells.push({
          x: ox + (idx % cols) * SIZE,
          y: oy + Math.floor(idx / cols) * SIZE,
          n: n + 1,
          firesAt: time + 1500 + n * 260,
          fired: false,
        });
      });
    },
    update(time: number) {
      for (const c of cells) {
        if (c.fired || time < c.firesAt) continue;
        c.fired = true;
        tk.sfx('crystal-chime');
        const p = tk.player;
        if (p.active && Math.abs(p.x - c.x) < SIZE / 2 && Math.abs(p.y - c.y) < SIZE / 2) {
          tk.hitPlayer(20, p.x, p.y);
        }
        tk.boom(c.x, c.y, SIZE * 0.5, CHALK);
      }
      cells = cells.filter((c) => time < c.firesAt + 500);
    },
    drawGround(g, time) {
      for (const c of cells) {
        if (c.fired) {
          g.fillStyle(CHALK, 0.1);
          g.fillRect(c.x - SIZE / 2, c.y - SIZE / 2, SIZE, SIZE);
          continue;
        }
        const soon = Phaser.Math.Clamp(1 - (c.firesAt - time) / 900, 0, 1);
        g.lineStyle(2, CHALK, 0.35 + soon * 0.5);
        g.strokeRect(c.x - SIZE / 2 + 5, c.y - SIZE / 2 + 5, SIZE - 10, SIZE - 10);
        g.fillStyle(CHALK, 0.06 + soon * 0.24);
        g.fillRect(c.x - SIZE / 2 + 5, c.y - SIZE / 2 + 5, SIZE - 10, SIZE - 10);
        // The number, drawn in strokes rather than text so it stays chalk.
        drawDigit(g, c.x, c.y, c.n, 0.45 + soon * 0.5);
      }
    },
    onPhaseEnd() { cells = []; },
  };
};

/** Seven-segment digits, chalked. Two digits side by side above nine. */
function drawDigit(g: Phaser.GameObjects.Graphics, cx: number, cy: number, n: number, alpha: number): void {
  const digits = String(n).split('').map(Number);
  const w = 14;
  const h = 24;
  const total = digits.length * (w + 6) - 6;
  digits.forEach((d, i) => {
    const x = cx - total / 2 + i * (w + 6);
    const y = cy - h / 2;
    const seg: Record<number, number[]> = {
      0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 6, 2, 3],
      4: [5, 6, 1, 2], 5: [0, 5, 6, 2, 3], 6: [0, 5, 4, 3, 2, 6], 7: [0, 1, 2],
      8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 5, 6, 2, 3],
    };
    const lines: [number, number, number, number][] = [
      [0, 0, w, 0], [w, 0, w, h / 2], [w, h / 2, w, h], [0, h, w, h],
      [0, h / 2, 0, h], [0, 0, 0, h / 2], [0, h / 2, w, h / 2],
    ];
    g.lineStyle(3, CHALK_LIT, alpha);
    for (const s of seg[d] ?? []) {
      const [ax, ay, bx, by] = lines[s];
      g.lineBetween(x + ax, y + ay, x + bx, y + by);
    }
  });
}

export const CHALK_BOSS: WorldBossDef = {
  worldId: 'chalk',
  name: 'The Draughtsman',
  title: 'Sovereign of Chalk, Who Was Never Given Permission',
  color: CHALK,
  colorLit: CHALK_LIT,
  colorDark: BOARD,
  accent: BLUE,
  bodyR: 27,

  intro: ['You are a rough sketch. I am the fair copy. Hold the pose; this will not take long.'],
  banter: [
    'They let me draw worlds and never once let me MAKE one. Out here nobody is checking.',
    'Everything I have made today, I made in front of you. That is more warning than the Voice gave me.',
    'You keep smudging. It is the only thing about you I admire.',
    'When I have finished, I will rub this out and draw it better.',
  ],
  defeatLine: 'ERASED',

  phases: [
    {
      name: 'Rough Work',
      line: 'Line first. Detail later. Detail is where it starts hurting.',
      hp: 420,
      cycle: [
        'sig:sketch', 'volley', 'sig:hopscotch', 'lanes',
        'sig:duster', 'homing', 'spiral', 'slamchain',
      ],
      harass: ['h-flak', 'h-snipe', 'h-orbs'],
      restMs: 1030,
      harassMs: 3050,
      moveSpeed: 60,
      holdDist: 290,
    },
    {
      name: 'The Fair Copy',
      line: 'Now that I know what you look like, I can improve on it.',
      hp: 480,
      cycle: [
        'sig:duster', 'sig:sketch', 'sig:hopscotch', 'barrage',
        'sig:sketch', 'spiral', 'stream', 'lanes', 'quake',
      ],
      harass: ['h-flak', 'h-snipe', 'h-lane', 'h-rune'],
      restMs: 880,
      harassMs: 2550,
      moveSpeed: 72,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE BOARD HAS BEEN CLEARED FOR SOMETHING LARGER',
    extraPhase: {
      name: 'The Mural',
      line: 'I have been drawing this one for an age. It only needs a figure. THERE you are.',
      hp: 390,
      cycle: [
        'sig:sketch', 'sig:duster', 'sig:hopscotch', 'sanctuary',
        'sig:sketch', 'spiral', 'barrage', 'stream',
      ],
      harass: ['h-flak', 'h-rune', 'h-snipe', 'h-lane'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 82,
      holdDist: 245,
    },
  },

  signatures: {
    sketch: theSketch,
    duster: theDuster,
    hopscotch,
  },

  drawArena(g, W, H) {
    g.fillStyle(BOARD, 0.75);
    g.fillRect(0, 0, W, H);
    // A blackboard the size of a world: old chalk ghosts, a frame, a ledge.
    g.fillStyle(0x6a5a3a, 0.9);
    g.fillRect(0, 88, W, 12);
    g.fillRect(0, H - 26, W, 26);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 === 0 ? CHALK : BLUE, 0.5);
      g.fillRect(60 + i * 44, H - 20, 26, 8);
    }
    // Half-erased earlier lessons: arcs, a diagram, some very old sums.
    g.lineStyle(2, CHALK, 0.06);
    g.strokeCircle(W * 0.28, H * 0.4, 90);
    g.strokeCircle(W * 0.28, H * 0.4, 54);
    g.lineBetween(W * 0.55, 160, W * 0.85, 300);
    g.lineBetween(W * 0.55, 300, W * 0.85, 160);
    for (let i = 0; i < 6; i++) {
      g.lineStyle(2, CHALK, 0.05);
      g.lineBetween(W * 0.62, 380 + i * 22, W * 0.62 + 90 - i * 9, 380 + i * 22);
    }
    // Smears where somebody used a sleeve.
    for (let i = 0; i < 5; i++) {
      g.fillStyle(CHALK, 0.03);
      g.fillEllipse(140 + i * ((W - 280) / 4), 200 + ((i * 137) % 260), 120, 44);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(s.x, s.y + 44, 76, 13);

    const dirX = Math.cos(s.facing);
    // Everything about it is drawn, and the drawing is never quite still.
    const j = () => Math.sin(t / 60 + Math.random() * 6) * 1.2;

    // Body: an outline figure, filled with nothing at all.
    g.lineStyle(3.5, CHALK, 0.95);
    g.strokeRoundedRect(s.x - 22 + j(), s.y - 24, 44, 66, 10);
    g.fillStyle(BOARD, 0.5);
    g.fillRoundedRect(s.x - 20, s.y - 22, 40, 62, 9);
    // Cross-hatching where a shadow would be, in the wrong direction.
    g.lineStyle(1.5, CHALK, 0.3);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(s.x - 18, s.y - 16 + i * 10, s.x - 4, s.y - 26 + i * 10);
    }
    // A smock, in coloured chalk, because it is fond of colour.
    g.lineStyle(3, BLUE, 0.8);
    g.lineBetween(s.x - 20, s.y - 8, s.x + 20, s.y - 8);
    g.lineStyle(3, ROSE, 0.7);
    g.lineBetween(s.x - 18, s.y + 16, s.x + 18, s.y + 16);

    // Hands: a stick of chalk held like a chisel, and one permanently dusty.
    const cx2 = s.x + dirX * 32;
    const cy2 = s.y + 2 - s.castGlow * 12;
    g.lineStyle(3, CHALK, 0.95);
    g.strokeCircle(cx2, cy2, 6);
    g.lineStyle(6, s.castGlow > 0.3 ? ROSE : CHALK_LIT, 0.95);
    g.lineBetween(cx2 + dirX * 4, cy2 + 2, cx2 + dirX * 20, cy2 + 14);
    for (let i = 0; i < 4; i++) {
      const ph = ((t + i * 300) % 1000) / 1000;
      g.fillStyle(CHALK, (1 - ph) * 0.35);
      g.fillCircle(cx2 + dirX * 22, cy2 + 16 + ph * 20, 1.4);
    }
    g.lineStyle(3, CHALK, 0.95);
    g.strokeCircle(s.x - dirX * 32, s.y + 16, 6);

    // Head: a circle, two dots, and a mouth that is redrawn every few seconds.
    const hy = s.y - 42;
    g.lineStyle(3.5, CHALK, 0.95);
    g.strokeCircle(s.x + j() * 0.5, hy, 20);
    g.fillStyle(BOARD, 0.55);
    g.fillCircle(s.x, hy, 18);
    const eye = s.hurt ? ROSE : CHALK_LIT;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.95);
      g.fillCircle(s.x + side * 7 + dirX * 3, hy - 4, 2.8 + s.castGlow);
    }
    g.lineStyle(2.5, CHALK_LIT, 0.9);
    const mood = Math.floor(t / 2000) % 3;
    if (mood === 0) g.lineBetween(s.x - 7, hy + 8, s.x + 7, hy + 8);
    else if (mood === 1) {
      g.beginPath();
      g.arc(s.x, hy + 4, 8, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    } else {
      g.beginPath();
      g.arc(s.x, hy + 14, 8, Math.PI + 0.2, -0.2, false);
      g.strokePath();
    }
    // A halo of colour sticks it keeps within reach.
    for (let i = 0; i < 4; i++) {
      const a = t / 800 + (i * Math.PI) / 2;
      const col = [CHALK, BLUE, ROSE, 0xfff3a0][i];
      const ox = s.x + Math.cos(a) * 50;
      const oy = s.y - 20 + Math.sin(a) * 20;
      g.lineStyle(5, col, 0.5);
      g.lineBetween(ox - 5, oy - 4, ox + 5, oy + 4);
    }
    if (s.enraged) {
      g.lineStyle(2, ROSE, 0.3 + Math.sin(t / 120) * 0.15);
      g.strokeCircle(s.x, s.y, 62);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
