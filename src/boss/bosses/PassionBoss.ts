import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Heartbreaker — Sovereign of Passion, cast out for burning too hot to
 * govern and taking that as a compliment. Canon with the passion challenge,
 * 'The Heartbreaker' ("I will cherish the memory of this. You will not have
 * one.").
 *
 * The Jilted Court keeps a heartbeat, and so does the fight: the metronome
 * move is on a fixed beat you can learn, the tether wants closeness and is
 * beaten with distance, and the roses are the prettiest thing that will ever
 * try to kill you.
 */

const ROSE = 0xff5fa2;
const ROSE_LIT = 0xffc0dc;
const ROSE_DARK = 0x2e0a1c;
const GOLD = 0xffd98a;

// ── Signature: The Courtship ─────────────────────────────────────────
// Roses. They orbit, they are patient, and then all of them at once.

const courtship = (tk: BossToolkit): SignatureMove => {
  interface Bud { a: number; r: number; bornAt: number }
  let buds: Bud[] = [];
  let launchAt = 0;
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('petal-burst');
      buds = [];
      launchAt = time + 1900;
      for (let i = 0; i < 9; i++) {
        buds.push({ a: (Math.PI * 2 * i) / 9, r: 92, bornAt: time });
      }
      tk.schedule(1900, () => {
        tk.sfx('bloom');
        // Fired in two waves out of one ring, so the gaps stay walkable.
        buds.forEach((b, i) => {
          tk.schedule((i % 2) * 380, () => {
            const ang = tk.angleToPlayer(
              tk.bossX + Math.cos(b.a) * b.r, tk.bossY + Math.sin(b.a) * b.r,
            );
            tk.spawnBullet({
              x: tk.bossX + Math.cos(b.a) * b.r, y: tk.bossY + Math.sin(b.a) * b.r,
              angle: ang, speed: 235, damage: 13, r: 8, color: ROSE,
              turn: Math.PI / 2.6, lifeMs: 5200,
            });
          });
        });
        buds = [];
      });
    },
    drawAir(g, time) {
      for (const b of buds) {
        const spin = b.a + (time - b.bornAt) / 900;
        const t = Phaser.Math.Clamp(1 - (launchAt - time) / 1900, 0, 1);
        const x = tk.bossX + Math.cos(spin) * b.r;
        const y = tk.bossY + Math.sin(spin) * b.r;
        // A rose: layered petals opening as it decides to be a projectile.
        for (let p = 3; p >= 1; p--) {
          g.fillStyle(p === 3 ? ROSE_DARK : p === 2 ? ROSE : ROSE_LIT, 0.85);
          g.fillCircle(x, y, (3 + p * 2.4) * (0.6 + t * 0.6));
        }
        g.lineStyle(2, 0x3a6a3a, 0.8);
        g.lineBetween(x, y + 6, x - Math.cos(spin) * 16, y - Math.sin(spin) * 16 + 6);
      }
    },
    onPhaseEnd() { buds = []; },
  };
};

// ── Signature: The Metronome ─────────────────────────────────────────
// The court's heartbeat, made explicit. Four beats, always the same interval,
// the floor flushing on every one and erupting on every second.

const metronome = (tk: BossToolkit): SignatureMove => {
  let nextBeatAt = 0;
  let beats = 0;
  const BEAT_MS = 720;
  return {
    durationMs: BEAT_MS * 6 + 400,
    cast(time: number) {
      tk.sfx('heartbeat');
      beats = 0;
      nextBeatAt = time + BEAT_MS;
      const gap = tk.angleToPlayer() + Math.PI;
      for (let k = 0; k < 6; k++) {
        tk.schedule(k * BEAT_MS, () => {
          beats = k + 1;
          tk.sfx('heartbeat');
          nextBeatAt = tk.now + BEAT_MS;
          if (k % 2 === 1) {
            // Every second beat, the floor answers.
            tk.spawnRing({
              cx: tk.bossX, cy: tk.bossY, delayMs: 0, speed: 320,
              gapCentre: gap + k * 0.22, gapHalf: 0.5, band: 28, damage: 20,
            });
          } else {
            tk.spawnZone({
              x: tk.player.x, y: tk.player.y, radius: 62,
              warnMs: BEAT_MS, damage: 16,
            });
          }
        });
      }
    },
    drawGround(g, time) {
      if (beats === 0 || beats > 6) return;
      // The beat itself, drawn as a pulse in the floor around the boss.
      const since = Phaser.Math.Clamp(1 - (nextBeatAt - time) / BEAT_MS, 0, 1);
      const thump = Math.pow(1 - since, 3);
      g.fillStyle(ROSE, 0.05 + thump * 0.16);
      g.fillCircle(tk.bossX, tk.bossY, 90 + thump * 60);
      // Four pips, filling: the player can count the bar.
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i < beats ? GOLD : ROSE_DARK, i < beats ? 0.8 : 0.4);
        g.fillCircle(tk.bossX - 40 + i * 16, tk.bossY - 82, 4);
      }
    },
    onPhaseEnd() { beats = 0; },
  };
};

// ── Signature: The Attachment ────────────────────────────────────────
// It gives you its heart. The thread runs from its chest to yours and pulls
// tight; distance is what breaks it, and it will hurt exactly until it does.

const attachment = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let until = 0;
  let lastTick = 0;
  let brokeAt = 0;
  const BREAK_DIST = 380;
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('status-curse');
      active = true;
      until = time + 4600;
      brokeAt = 0;
      tk.host.showFloatingText(tk.player.x, tk.player.y - 48, 'ATTACHED', '#ffc0dc');
    },
    update(time: number) {
      if (!active) return;
      const p = tk.player;
      if (!p.active) { active = false; return; }
      const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
      if (d > BREAK_DIST) {
        active = false;
        brokeAt = time;
        tk.sfx('crystal-shatter');
        tk.host.showFloatingText(p.x, p.y - 44, 'BROKEN OFF', '#8affa0');
        return;
      }
      if (time > until) {
        // Held on too long. It takes what it is owed and calls that romance.
        active = false;
        tk.sfx('explosion-medium');
        tk.explode(p.x, p.y, 96, 34, ROSE);
        return;
      }
      if (time - lastTick > 600) {
        lastTick = time;
        // Closer is worse — the thread has a temper about proximity.
        tk.hitPlayer(d < 200 ? 9 : 5, p.x, p.y);
      }
    },
    drawAir(g, time) {
      if (!active) {
        if (brokeAt && time - brokeAt < 500) {
          const t = (time - brokeAt) / 500;
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6;
            g.fillStyle(ROSE, (1 - t) * 0.6);
            g.fillCircle(tk.player.x + Math.cos(a) * t * 50, tk.player.y + Math.sin(a) * t * 50, 3);
          }
        }
        return;
      }
      const p = tk.player;
      const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
      const strain = Phaser.Math.Clamp(d / BREAK_DIST, 0, 1);
      // The thread: slack and red up close, taut and pale as it nears breaking.
      const sag = (1 - strain) * 40;
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const t2 = i / steps;
        const x0 = tk.bossX + (p.x - tk.bossX) * t2;
        const y0 = tk.bossY + (p.y - tk.bossY) * t2 + Math.sin(t2 * Math.PI) * sag;
        const t3 = (i + 1) / steps;
        const x1 = tk.bossX + (p.x - tk.bossX) * t3;
        const y1 = tk.bossY + (p.y - tk.bossY) * t3 + Math.sin(t3 * Math.PI) * sag;
        g.lineStyle(2 + (1 - strain) * 2, strain > 0.8 ? ROSE_LIT : ROSE, 0.5 + strain * 0.45);
        g.lineBetween(x0, y0, x1, y1);
      }
      // A little heart travelling the thread, always toward the player.
      const ph = ((time % 1400) / 1400);
      const hx = tk.bossX + (p.x - tk.bossX) * ph;
      const hy = tk.bossY + (p.y - tk.bossY) * ph + Math.sin(ph * Math.PI) * sag;
      drawHeart(g, hx, hy, 6, ROSE_LIT, 0.9);
      // Strain marker at the player's end.
      g.lineStyle(2, strain > 0.8 ? GOLD : ROSE, 0.4 + strain * 0.5);
      g.strokeCircle(p.x, p.y, 26 + strain * 8);
    },
    onPhaseEnd() { active = false; },
  };
};

function drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x - r * 0.5, y - r * 0.35, r * 0.6);
  g.fillCircle(x + r * 0.5, y - r * 0.35, r * 0.6);
  g.fillTriangle(x - r, y - r * 0.1, x + r, y - r * 0.1, x, y + r);
}

export const PASSION_BOSS: WorldBossDef = {
  worldId: 'passion',
  name: 'The Heartbreaker',
  title: 'Sovereign of Passion, Sole Occupant of the Jilted Court',
  color: ROSE,
  colorLit: ROSE_LIT,
  colorDark: ROSE_DARK,
  accent: GOLD,
  bodyR: 28,

  intro: ['I will cherish the memory of this. You will not have one. Isn\'t that romantic?'],
  banter: [
    'They exiled me for burning too hot to govern. Governing is what you do when you have stopped feeling anything.',
    'Come closer. Everything I do is worse up close, and you will come anyway.',
    'The Voice does not love. It only keeps. There is a difference and I will die on it.',
    'You fight beautifully. I want you to know that I noticed.',
  ],
  defeatLine: 'AND I MEANT IT',

  phases: [
    {
      name: 'The Courtship',
      line: 'A dance first. I insist on the order of things.',
      hp: 430,
      cycle: [
        'sig:courtship', 'volley', 'sig:metronome', 'homing',
        'sig:attachment', 'lanes', 'spiral', 'slamchain',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune'],
      restMs: 1030,
      harassMs: 3050,
      moveSpeed: 66,
      holdDist: 280,
    },
    {
      name: 'The Quarrel',
      line: 'You have hurt me. Do you have ANY idea how rare that is?',
      hp: 490,
      cycle: [
        'sig:attachment', 'sig:courtship', 'barrage', 'sig:metronome',
        'stream', 'homing', 'sig:courtship', 'quake', 'lanes',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 880,
      harassMs: 2550,
      moveSpeed: 78,
      holdDist: 255,
    },
  ],

  hard: {
    introLine: 'THE COURT HAS BEEN WAITING AN AGE FOR THIS',
    extraPhase: {
      name: 'The Devotion',
      line: 'I will not be the one who leaves. Not again. NOT AGAIN.',
      hp: 400,
      cycle: [
        'sig:attachment', 'sig:metronome', 'sig:courtship', 'sanctuary',
        'sig:attachment', 'spiral', 'stream', 'barrage',
      ],
      harass: ['h-orbs', 'h-rune', 'h-flak', 'h-lane'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 88,
      holdDist: 235,
    },
  },

  signatures: {
    courtship,
    metronome,
    attachment,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x16060e, 0.55);
    g.fillRect(0, 0, W, H);
    // A ballroom set for two, one of whom did not come: laid tables, a dance
    // floor with a heart inlaid in it, and roses gone over long ago.
    g.fillStyle(ROSE_DARK, 0.6);
    g.fillEllipse(W / 2, H * 0.55, 420, 300);
    g.lineStyle(2, GOLD, 0.1);
    g.strokeEllipse(W / 2, H * 0.55, 420, 300);
    g.strokeEllipse(W / 2, H * 0.55, 340, 240);
    drawHeart(g, W / 2, H * 0.55, 70, ROSE, 0.05);
    for (const side of [0, 1]) {
      const x = side === 0 ? 60 : W - 60;
      for (let i = 0; i < 3; i++) {
        const y = 160 + i * 140;
        g.fillStyle(0x3a1424, 0.75);
        g.fillEllipse(x, y, 56, 34);
        g.fillStyle(GOLD, 0.12);
        g.fillRect(x - 3, y - 30, 6, 22);
        g.fillStyle(ROSE, 0.15);
        g.fillCircle(x, y - 34, 6);
      }
    }
    // Petals on the floor, from a night that ended badly.
    for (let i = 0; i < 26; i++) {
      g.fillStyle(i % 3 === 0 ? ROSE_LIT : ROSE, 0.07);
      g.fillEllipse(60 + ((i * 149) % (W - 120)), 130 + ((i * 211) % (H - 200)), 11, 6);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 46, 88, 16);

    const dirX = Math.cos(s.facing);
    // A pulse that runs through everything, on the court's own beat.
    const beat = Math.pow(Math.max(0, Math.sin(t / 360)), 6);

    // A gown that is mostly petals, moving as if there were a draught.
    for (let layer = 3; layer >= 1; layer--) {
      const w = 30 + layer * 12;
      g.fillStyle(layer === 3 ? ROSE_DARK : layer === 2 ? 0x8a1a4a : ROSE, 0.92);
      g.beginPath();
      g.moveTo(s.x - w * 0.4, s.y - 20);
      g.lineTo(s.x + w * 0.4, s.y - 20);
      g.lineTo(s.x + w, s.y + 46);
      g.lineTo(s.x - w, s.y + 46);
      g.closePath();
      g.fillPath();
      // Petal scallops along the hem.
      for (let i = 0; i < 6; i++) {
        g.fillCircle(s.x - w + (i * 2 * w) / 5, s.y + 46 + Math.sin(t / 300 + i + layer) * 3, w * 0.16);
      }
    }
    g.fillStyle(GOLD, 0.6);
    g.fillRect(s.x - 15, s.y - 20, 30, 4);

    // The chest cavity: open, and there is a heart in it that everyone can see.
    g.fillStyle(ROSE_DARK, 1);
    g.fillCircle(s.x, s.y - 2, 17);
    drawHeart(g, s.x, s.y - 2, 12 + beat * 3 + s.castGlow * 3, s.hurt ? 0xffffff : ROSE_LIT, 0.95);
    g.lineStyle(1.5, GOLD, 0.5);
    g.strokeCircle(s.x, s.y - 2, 18 + beat * 2);
    // Threads out of it, trailing to nobody in particular.
    for (let i = 0; i < 4; i++) {
      const a = t / 1100 + (i * Math.PI) / 2;
      g.lineStyle(1.5, ROSE, 0.35);
      g.lineBetween(s.x, s.y - 2, s.x + Math.cos(a) * 46, s.y - 2 + Math.sin(a) * 34);
      g.fillStyle(ROSE, 0.4);
      g.fillCircle(s.x + Math.cos(a) * 46, s.y - 2 + Math.sin(a) * 34, 2.5);
    }

    // Hands: one offered, palm up, always; one holding a rose by the thorns.
    const offer = Math.sin(t / 700) * 4;
    g.fillStyle(0xf0d0d8, 0.95);
    g.fillCircle(s.x + dirX * 36, s.y + 8 + offer - s.castGlow * 10, 7);
    const rx = s.x - dirX * 34;
    const ry = s.y + 4 - offer;
    g.fillStyle(0xf0d0d8, 0.95);
    g.fillCircle(rx, ry, 7);
    g.lineStyle(2, 0x3a6a3a, 0.9);
    g.lineBetween(rx, ry - 4, rx - dirX * 4, ry - 26);
    for (let p = 3; p >= 1; p--) {
      g.fillStyle(p === 3 ? ROSE_DARK : p === 2 ? ROSE : ROSE_LIT, 0.95);
      g.fillCircle(rx - dirX * 4, ry - 30, 2.5 + p * 2);
    }

    // Head: a fine, sharp face, and eyes that have been crying stylishly.
    const hy = s.y - 40;
    g.fillStyle(0xf0d0d8, 0.96);
    g.fillEllipse(s.x + dirX * 2, hy, 30, 34);
    // Hair, heavy, with a rose set in it.
    g.fillStyle(0x2a0812, 1);
    g.fillEllipse(s.x, hy - 12, 36, 22);
    g.fillEllipse(s.x - 18, hy + 6, 12, 30);
    g.fillEllipse(s.x + 18, hy + 6, 12, 30);
    g.fillStyle(ROSE, 0.95);
    g.fillCircle(s.x - 16, hy - 16, 6);
    g.fillStyle(ROSE_DARK, 0.9);
    g.fillCircle(s.x - 16, hy - 16, 3);
    const eye = s.hurt ? 0xffffff : ROSE_DARK;
    for (const side of [-1, 1]) {
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(s.x + side * 8 + dirX * 3, hy - 2, 10, 7);
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 8 + dirX * 5, hy - 2, 3.2);
      g.fillStyle(GOLD, 0.7);
      g.fillCircle(s.x + side * 8 + dirX * 5, hy - 3, 1.2);
      // A single, extremely well-judged tear.
      const ph = ((t + side * 900) % 2600) / 2600;
      if (ph < 0.5) {
        g.fillStyle(ROSE_LIT, (0.5 - ph) * 1.2);
        g.fillCircle(s.x + side * 8 + dirX * 4, hy + 4 + ph * 34, 1.8);
      }
    }
    g.fillStyle(ROSE, 0.9);
    g.fillEllipse(s.x + dirX * 3, hy + 14, 9, 5);
    if (s.enraged) {
      drawHeart(g, s.x, s.y, 70 + beat * 8, ROSE, 0.07);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 54);
    }
  },
};
