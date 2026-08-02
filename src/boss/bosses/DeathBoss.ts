import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Undertaker — Sovereign of Death, and the only Sovereign who kept working
 * after the fall, because somebody had to. Canon with the death challenge,
 * 'The Undertaker' ("I buried the Sovereigns myself. I kept the measurements.").
 *
 * The fight is a funeral run to schedule: it measures you, it processes past
 * you, and the bell counts anyone who lingers.
 */

const GRAVE = 0x4a4468;
const GRAVE_LIT = 0xb9a9e8;
const GRAVE_DARK = 0x14101f;
const BONE = 0xd8d2c0;

// ── Signature: The Measurements ──────────────────────────────────────
// A coffin outline follows you, slower than a run, and then closes. Inside
// when it seals is a lid; outside is a shrug and a note in the ledger.

const measurements = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let sealsAt = 0;
  const HALF_W = 34;
  const HALF_H = 62;
  return {
    durationMs: 2900,
    cast(time: number) {
      tk.sfx('bone');
      active = true;
      cx = tk.player.x;
      cy = tk.player.y;
      sealsAt = time + 1900;
      tk.host.showFloatingText(cx, cy - 46, 'MEASURING', '#b9a9e8');
      tk.schedule(1900, () => {
        active = false;
        const p = tk.player;
        const inside = Math.abs(p.x - cx) < HALF_W && Math.abs(p.y - cy) < HALF_H;
        tk.sfx('stone-slam');
        tk.boom(cx, cy, 74, GRAVE_LIT);
        if (inside && p.active) {
          tk.hitPlayer(38, p.x, p.y);
          tk.slowPlayer(0.5, 1500);
          tk.host.showFloatingText(p.x, p.y - 40, 'A PERFECT FIT', '#b9a9e8');
        }
        // Whether or not it caught anyone, the plot is dug — and it lingers.
        tk.spawnPool({ x: cx, y: cy, radius: 46, lifeMs: 4200, damage: 6, tickMs: 700 });
      });
    },
    update(time: number, dt: number) {
      if (!active) return;
      const p = tk.player;
      if (!p.active) return;
      // 140 px/s: it follows, it does not catch. Walking away is the answer.
      const a = Math.atan2(p.y - cy, p.x - cx);
      const step = Math.min(Phaser.Math.Distance.Between(cx, cy, p.x, p.y), 140 * dt);
      cx = tk.clampX(cx + Math.cos(a) * step, 40);
      cy = tk.clampY(cy + Math.sin(a) * step, 90);
      void time;
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (sealsAt - time) / 1900, 0, 1);
      // A six-sided plot, drawn as the shovel would cut it.
      const pts: [number, number][] = [
        [0, -HALF_H], [HALF_W, -HALF_H * 0.45], [HALF_W * 0.78, HALF_H],
        [-HALF_W * 0.78, HALF_H], [-HALF_W, -HALF_H * 0.45],
      ];
      g.fillStyle(GRAVE_DARK, 0.35 + t * 0.35);
      g.beginPath();
      g.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (const [ox, oy] of pts.slice(1)) g.lineTo(cx + ox, cy + oy);
      g.closePath();
      g.fillPath();
      g.lineStyle(2 + t * 2, GRAVE_LIT, 0.45 + t * 0.5);
      g.beginPath();
      g.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (const [ox, oy] of pts.slice(1)) g.lineTo(cx + ox, cy + oy);
      g.closePath();
      g.strokePath();
      // The lid closing in from both sides — the clock, made of wood.
      const gap = (1 - t) * HALF_W;
      g.fillStyle(0x3a2a1c, 0.5 + t * 0.4);
      g.fillRect(cx - HALF_W, cy - HALF_H, HALF_W - gap, HALF_H * 2);
      g.fillRect(cx + gap, cy - HALF_H, HALF_W - gap, HALF_H * 2);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Procession ────────────────────────────────────────
// A coffin crosses the hall on the shoulders of nobody at all, at walking
// pace, dropping the parish's soil behind it. Two mourners come along.

const procession = (tk: BossToolkit): SignatureMove => {
  interface Box { x: number; y: number; vx: number; vy: number; dieAt: number; lastHitAt: number }
  let boxes: Box[] = [];
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('bone');
      const fromLeft = Math.random() < 0.5;
      const y = tk.clampY(tk.player.y + Phaser.Math.Between(-90, 90), 150);
      const speed = 170;
      boxes.push({
        x: fromLeft ? -40 : tk.W + 40, y,
        vx: fromLeft ? speed : -speed, vy: 0,
        dieAt: time + 9000, lastHitAt: 0,
      });
      // Mourners, walking behind. They are not sad. They are hungry.
      for (const side of [-1, 1]) {
        tk.spawnAdd({
          x: tk.bossX + side * 110, y: tk.bossY + 40,
          hp: 70, speed: 120, damage: 18, maxAlive: 5,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const b of boxes) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Consecrated ground, laid one step at a time.
        if (Math.random() < dt * 5) {
          tk.spawnPool({ x: b.x, y: b.y, radius: 34, lifeMs: 3400, damage: 5, tickMs: 620 });
        }
        if (p.active && time - b.lastHitAt > 600
          && Math.abs(p.x - b.x) < 44 && Math.abs(p.y - b.y) < 30) {
          b.lastHitAt = time;
          tk.hitPlayer(24, p.x, p.y);
        }
      }
      boxes = boxes.filter((b) => time < b.dieAt && b.x > -80 && b.x < tk.W + 80);
    },
    drawAir(g, time) {
      for (const b of boxes) {
        const bob = Math.sin(time / 180 + b.x / 40) * 3;
        // The box: lid, brass, and a wreath that has seen several occupants.
        g.fillStyle(0x2a1c14, 1);
        g.fillRect(b.x - 42, b.y - 20 + bob, 84, 40);
        g.fillStyle(0x3e2a1c, 1);
        g.fillRect(b.x - 38, b.y - 16 + bob, 76, 32);
        g.lineStyle(2, BONE, 0.35);
        g.strokeRect(b.x - 42, b.y - 20 + bob, 84, 40);
        g.fillStyle(0xc9a94a, 0.9);
        g.fillCircle(b.x - 24, b.y + bob, 3);
        g.fillCircle(b.x + 24, b.y + bob, 3);
        g.lineStyle(3, 0x3a6a3a, 0.8);
        g.strokeCircle(b.x, b.y + bob, 12);
        // It is not quite shut.
        g.fillStyle(GRAVE_LIT, 0.3 + Math.sin(time / 220) * 0.15);
        g.fillRect(b.x - 30, b.y - 3 + bob, 60, 3);
      }
    },
    onPhaseEnd() { boxes = []; },
  };
};

// ── Signature: The Bell ──────────────────────────────────────────────
// It tolls three times. Each toll marks where you were standing when it rang,
// and a moment later something comes up through that mark. Lingering is the
// only mistake available.

const theBell = (tk: BossToolkit): SignatureMove => {
  interface Mark { x: number; y: number; erupts: number }
  let marks: Mark[] = [];
  let tolls = 0;
  return {
    durationMs: 3300,
    cast(time: number) {
      tolls = 0;
      for (let k = 0; k < 3; k++) {
        tk.schedule(k * 900, () => {
          tolls++;
          tk.sfx('bone');
          tk.scene.cameras.main.shake(180, 0.003);
          const p = tk.player;
          const x = p.x;
          const y = p.y;
          marks.push({ x, y, erupts: tk.now + 850 });
          tk.schedule(850, () => {
            tk.explode(x, y, 66, 26, GRAVE_LIT);
            tk.slowPlayer(0.6, 800);
          });
        });
      }
      void time;
    },
    update(time: number) {
      marks = marks.filter((m) => time < m.erupts + 260);
    },
    drawGround(g, time) {
      for (const m of marks) {
        const t = Phaser.Math.Clamp(1 - (m.erupts - time) / 850, 0, 1);
        g.lineStyle(2, GRAVE_LIT, 0.35 + t * 0.5);
        g.strokeCircle(m.x, m.y, 66 * (0.35 + t * 0.65));
        g.fillStyle(GRAVE_DARK, 0.3 + t * 0.3);
        g.fillCircle(m.x, m.y, 66 * t);
        // Hands, arriving early.
        if (t > 0.55) {
          const reach = (t - 0.55) / 0.45;
          for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5 + m.x * 0.01;
            const hx = m.x + Math.cos(a) * 34;
            const hy = m.y + Math.sin(a) * 30;
            g.fillStyle(BONE, 0.6 + reach * 0.3);
            g.fillCircle(hx, hy - reach * 10, 4);
            g.lineStyle(2, BONE, 0.5 + reach * 0.3);
            g.lineBetween(hx, hy, hx, hy - reach * 12);
          }
        }
      }
      // The bell's own count, over the boss.
      if (tolls > 0 && tolls < 4) {
        for (let i = 0; i < tolls; i++) {
          g.fillStyle(BONE, 0.5);
          g.fillCircle(tk.bossX - 16 + i * 16, tk.bossY - 74, 3);
        }
      }
    },
    onPhaseEnd() { marks = []; tolls = 0; },
  };
};

export const DEATH_BOSS: WorldBossDef = {
  worldId: 'death',
  name: 'The Undertaker',
  title: 'Sovereign of Death, Keeper of the Parish',
  color: GRAVE,
  colorLit: GRAVE_LIT,
  colorDark: GRAVE_DARK,
  accent: BONE,
  bodyR: 28,

  intro: ['I buried the Sovereigns myself. I kept the measurements. Yours took no time at all.'],
  banter: [
    'They exiled me for being inevitable. The courts found it RUDE.',
    'I do not hurry. I have never once needed to.',
    'The thing beneath did not eat me. It hired me.',
    'You are the fourteenth this season. The others were also in a hurry.',
  ],
  defeatLine: 'THE LEDGER CLOSES',

  phases: [
    {
      name: 'The Vigil',
      line: 'Sit with me a while. Everyone does, in the end, at exactly my pace.',
      hp: 440,
      cycle: [
        'sig:measure', 'volley', 'sig:bell', 'hazard',
        'sig:procession', 'homing', 'lanes', 'radial',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe'],
      restMs: 1080,
      harassMs: 3150,
      moveSpeed: 46,
      holdDist: 300,
    },
    {
      name: 'The Interment',
      line: 'The paperwork is done. Lie down; I will not ask twice, I will simply wait.',
      hp: 500,
      cycle: [
        'sig:bell', 'sig:measure', 'barrage', 'sig:procession',
        'summon', 'spiral', 'quake', 'hazard', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 920,
      harassMs: 2600,
      moveSpeed: 56,
      holdDist: 275,
    },
  ],

  hard: {
    introLine: 'THE PARISH IS TAKING NO MORE APPOINTMENTS',
    extraPhase: {
      name: 'The Last Rites',
      line: 'I buried every Sovereign in both realms. I have room. I have SO much room.',
      hp: 400,
      cycle: [
        'sig:bell', 'sig:measure', 'sig:procession', 'sanctuary',
        'summon', 'sig:bell', 'spiral', 'barrage',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-mines'],
      restMs: 720,
      harassMs: 2150,
      moveSpeed: 66,
      holdDist: 255,
    },
  },

  signatures: {
    measure: measurements,
    procession,
    bell: theBell,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x08060e, 0.6);
    g.fillRect(0, 0, W, H);
    // A parish yard: rows of stones, a low fog, a lychgate at the top.
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        const x = 70 + c * ((W - 140) / 8);
        const y = 150 + r * ((H - 240) / 3);
        if (Math.abs(x - W / 2) < 90 && Math.abs(y - H / 2) < 80) continue;
        g.fillStyle(GRAVE_DARK, 0.85);
        g.fillRoundedRect(x - 9, y - 16, 18, 24, 8);
        g.fillStyle(BONE, 0.08);
        g.fillRect(x - 6, y - 8, 12, 2);
      }
    }
    g.fillStyle(GRAVE, 0.06);
    g.fillRect(0, H - 130, W, 130);
    g.fillStyle(0x2a1c14, 0.9);
    g.fillRect(W / 2 - 70, 96, 10, 60);
    g.fillRect(W / 2 + 60, 96, 10, 60);
    g.fillRect(W / 2 - 82, 96, 164, 12);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 48, 86, 16);

    const dirX = Math.cos(s.facing);
    const sway = Math.sin(t / 900) * 2;

    // A very tall coat that reaches the ground and keeps going.
    g.fillStyle(GRAVE_DARK, 1);
    g.beginPath();
    g.moveTo(s.x - 22 + sway, s.y - 26);
    g.lineTo(s.x + 22 + sway, s.y - 26);
    g.lineTo(s.x + 32, s.y + 48);
    g.lineTo(s.x - 32, s.y + 48);
    g.closePath();
    g.fillPath();
    g.fillStyle(GRAVE, 0.55);
    g.beginPath();
    g.moveTo(s.x - 8 + sway, s.y - 26);
    g.lineTo(s.x + 8 + sway, s.y - 26);
    g.lineTo(s.x + 12, s.y + 46);
    g.lineTo(s.x - 12, s.y + 46);
    g.closePath();
    g.fillPath();
    // The hem never quite settles.
    for (let i = 0; i < 6; i++) {
      const ph = ((t + i * 300) % 1800) / 1800;
      g.fillStyle(GRAVE, (1 - ph) * 0.2);
      g.fillCircle(s.x - 30 + i * 12, s.y + 46 + ph * 8, 4);
    }

    // Hands: the shovel, and the lantern with the pale flame in it.
    const shx = s.x - dirX * 30;
    g.fillStyle(BONE, 0.95);
    g.fillCircle(shx, s.y + 8, 6);
    g.lineStyle(4, 0x4a3420, 1);
    g.lineBetween(shx, s.y + 2, shx - dirX * 6, s.y + 52);
    g.fillStyle(0x8a8f96, 1);
    g.fillTriangle(shx - dirX * 6 - 9, s.y + 46, shx - dirX * 6 + 9, s.y + 46, shx - dirX * 6, s.y + 62);

    const lx = s.x + dirX * 30;
    const ly = s.y + 4 - s.castGlow * 8;
    g.fillStyle(BONE, 0.95);
    g.fillCircle(lx, ly - 8, 6);
    g.lineStyle(2, 0x8a8f96, 1);
    g.lineBetween(lx, ly - 6, lx, ly + 6);
    g.fillStyle(0x2a2438, 1);
    g.fillRoundedRect(lx - 9, ly + 6, 18, 22, 4);
    const flame = 0.6 + Math.sin(t / 160) * 0.2 + s.castGlow * 0.4;
    g.fillStyle(GRAVE_LIT, flame);
    g.fillCircle(lx, ly + 17, 5 + s.castGlow * 3);
    g.fillStyle(0xffffff, flame * 0.5);
    g.fillCircle(lx, ly + 17, 2);

    // Head: a skull under a very old top hat, and the eyes are the lantern's.
    const hy = s.y - 44;
    g.fillStyle(BONE, 0.95);
    g.fillEllipse(s.x + sway, hy, 26, 28);
    g.fillStyle(0xb8b2a0, 0.8);
    g.fillEllipse(s.x + sway, hy + 10, 18, 10);
    // Jaw line.
    g.lineStyle(1.5, 0x9a9484, 0.9);
    g.lineBetween(s.x - 9 + sway, hy + 8, s.x + 9 + sway, hy + 8);
    // Sockets.
    const eye = s.hurt ? 0xffffff : GRAVE_LIT;
    for (const side of [-1, 1]) {
      g.fillStyle(GRAVE_DARK, 1);
      g.fillEllipse(s.x + side * 7 + sway, hy - 3, 9, 10);
      g.fillStyle(eye, 0.85 + s.castGlow * 0.15);
      g.fillCircle(s.x + side * 7 + dirX * 2 + sway, hy - 2, 2.6 + s.castGlow);
    }
    // The hat, with the mourning band.
    g.fillStyle(0x0e0a16, 1);
    g.fillEllipse(s.x + sway, hy - 15, 42, 9);
    g.fillRect(s.x - 14 + sway, hy - 44, 28, 30);
    g.fillStyle(GRAVE, 0.7);
    g.fillRect(s.x - 14 + sway, hy - 22, 28, 5);
    if (s.enraged) {
      // When it quickens, the parish arrives to watch.
      for (let i = 0; i < 3; i++) {
        const a = t / 800 + (i * Math.PI * 2) / 3;
        g.fillStyle(GRAVE_LIT, 0.25);
        g.fillCircle(s.x + Math.cos(a) * 52, s.y + Math.sin(a) * 20 - 10, 6);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
