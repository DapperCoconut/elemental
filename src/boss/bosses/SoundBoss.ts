import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Crescendo — Sovereign of the Concert Hall. Sound world's boss: a
 * conductor whose programme ends with you. Canon with the sound challenge,
 * 'The Crescendo' ("Everything ends on a note.").
 */

const ROSE = 0xff66cc;
const ROSE_LIT = 0xffc8ec;
const ROSE_DARK = 0x330a26;
const CHIME = 0x9adfe8;

// ── Signature: Crescendo ─────────────────────────────────────────────
// Four rings, each faster and heavier than the last, sharing one drifting
// safe lane. The build is audible in the spacing: pianissimo to fortissimo.

const crescendo = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3600,
  cast(time: number) {
    tk.sfx('screech');
    const gap0 = tk.angleToPlayer();
    const drift = 0.32 * (Math.random() < 0.5 ? 1 : -1);
    for (let i = 0; i < 4; i++) {
      tk.spawnRing({
        cx: tk.bossX, cy: tk.bossY,
        delayMs: i * (760 - i * 90),
        speed: 270 + i * 45,
        gapCentre: gap0 + drift * i,
        gapHalf: 0.55,
        band: 24 + i * 4,
        damage: 12 + i * 4,
      });
    }
    void time;
  },
});

// ── Signature: The Staff ─────────────────────────────────────────────
// Five staff lines rule the hall; two of them light up, and running notes
// travel down the lit lines. Sheet music you stand inside — pick a rest.

const theStaff = (tk: BossToolkit): SignatureMove => {
  let lines: number[] = [];
  let hot: number[] = [];
  let showUntil = 0;
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('curse-cast');
      const top = 150;
      const gap = (tk.H - 220) / 4;
      lines = [0, 1, 2, 3, 4].map((i) => top + i * gap);
      hot = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4]).slice(0, 2);
      showUntil = time + 3600;
      for (const li of hot) {
        for (let n = 0; n < 5; n++) {
          tk.schedule(1300 + n * 340, () => {
            tk.spawnBullet({
              x: 30, y: lines[li] + Phaser.Math.Between(-4, 4),
              angle: 0, speed: 330, damage: 11, r: 6, color: ROSE_LIT, lifeMs: 3400,
            });
          });
        }
      }
      tk.schedule(3800, () => { lines = []; hot = []; });
    },
    drawGround(g, time) {
      if (lines.length === 0 || time >= showUntil) return;
      lines.forEach((y, i) => {
        const isHot = hot.includes(i);
        g.lineStyle(isHot ? 2.5 : 1, isHot ? ROSE : CHIME, isHot ? 0.7 : 0.25);
        g.lineBetween(30, y, tk.W - 30, y);
      });
      // A treble clef at the left margin, because standards matter.
      g.lineStyle(2, CHIME, 0.5);
      g.strokeCircle(48, lines[2] ?? tk.H / 2, 9);
      g.lineBetween(48, (lines[0] ?? 150) - 10, 48, (lines[4] ?? tk.H - 80) + 10);
    },
    onPhaseEnd() { lines = []; hot = []; },
  };
};

// ── Signature: Fermata ───────────────────────────────────────────────
// The held note. A pressure sphere swells around the Crescendo, shoving
// everything outward while a slow spiral plays underneath it. Held exactly
// as long as the audience can bear. Slightly longer, actually.

const FERMATA_MS = 3600;

const fermata = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  return {
    durationMs: FERMATA_MS + 300,
    cast(time: number) {
      tk.sfx('torment');
      activeUntil = time + FERMATA_MS;
      for (let k = 0; k < 10; k++) {
        tk.schedule(300 + k * 320, () => {
          const base = tk.now / 600;
          for (let arm = 0; arm < 2; arm++) {
            const a = base + arm * Math.PI;
            tk.spawnBullet({
              x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
              angle: a, speed: 185, damage: 10, color: ROSE_LIT,
            });
          }
        });
      }
    },
    update(time: number, dt: number) {
      if (time >= activeUntil) return;
      const p = tk.player;
      if (!p.active) return;
      const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
      if (d < 240 && d > 8) {
        const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
        const push = 95 * (1 - d / 240);
        p.x = Phaser.Math.Clamp(p.x + Math.cos(a) * push * dt, 44, tk.W - 44);
        p.y = Phaser.Math.Clamp(p.y + Math.sin(a) * push * dt, 96, tk.H - 44);
      }
    },
    drawAir(g, time) {
      if (time >= activeUntil) return;
      for (let i = 0; i < 3; i++) {
        const ph = ((time / 800 + i / 3) % 1);
        g.lineStyle(2.5 - i * 0.5, ROSE, (1 - ph) * 0.5);
        g.strokeCircle(tk.bossX, tk.bossY, 40 + ph * 200);
      }
      // The fermata symbol overhead: an arc and its dot.
      g.lineStyle(2.5, CHIME, 0.85);
      g.beginPath();
      g.arc(tk.bossX, tk.bossY - 58, 14, Math.PI, Math.PI * 2, false);
      g.strokePath();
      g.fillStyle(CHIME, 0.9);
      g.fillCircle(tk.bossX, tk.bossY - 62, 2.5);
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const SOUND_BOSS: WorldBossDef = {
  worldId: 'sound',
  name: 'The Crescendo',
  title: 'Sovereign of the Concert Hall',
  color: ROSE,
  colorLit: ROSE_LIT,
  colorDark: ROSE_DARK,
  accent: CHIME,
  bodyR: 28,

  intro: ['Everything ends on a note. Yours is in this programme. Near the back.'],
  banter: [
    'You are rushing. Everyone rushes the ending.',
    'The Voice hums one note, forever. I have heard better from plumbing.',
    'The hall was built for ten thousand. Tonight: one. Intimate.',
    'Da capo. From the top. I decide when the piece ends.',
  ],
  defeatLine: 'THE FINAL NOTE FADES',

  phases: [
    {
      name: 'The Overture',
      line: 'We open quietly. Savour it — nothing after this is quiet.',
      hp: 440,
      cycle: [
        'sig:crescendo', 'volley', 'sig:staff', 'lanes',
        'sig:fermata', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-lane', 'h-orbs'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 60,
      holdDist: 280,
    },
    {
      name: 'The Movement',
      line: 'Second movement. Allegro. Furioso. Directed at you personally.',
      hp: 490,
      cycle: [
        'sig:staff', 'sig:crescendo', 'quake', 'spiral',
        'sig:fermata', 'barrage', 'stream', 'homing', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 75,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'TONIGHT THE HALL PLAYS THE AUDIENCE',
    extraPhase: {
      name: 'The Finale',
      line: 'The last page. Every instrument at once, and the conductor is furious.',
      hp: 370,
      cycle: [
        'sig:crescendo', 'sig:fermata', 'sig:staff', 'sanctuary',
        'quake', 'spiral', 'sig:crescendo', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 90,
      holdDist: 230,
    },
  },

  signatures: {
    crescendo,
    staff: theStaff,
    fermata,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x10040c, 0.55);
    g.fillRect(0, 0, W, H);
    // Empty seats rising at both wings; a proscenium arch glow.
    for (let row = 0; row < 3; row++) {
      for (let seat = 0; seat < 5; seat++) {
        for (const side of [0, 1]) {
          const x = side === 0 ? 34 + row * 16 : W - 34 - row * 16;
          const y = 160 + seat * 90 + row * 12;
          g.fillStyle(ROSE_DARK, 0.8);
          g.fillRoundedRect(x - 6, y - 5, 12, 10, 2);
        }
      }
    }
    g.fillStyle(ROSE, 0.05);
    g.fillEllipse(W / 2, 96, W * 0.9, 70);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 44, 84, 15);

    // The coat: long tails, flaring with the tempo.
    const flare = Math.sin(t / 340) * 3 + s.castGlow * 6;
    g.fillStyle(ROSE_DARK, 1);
    g.fillTriangle(s.x - 24 - flare, s.y + 42, s.x + 24 + flare, s.y + 42, s.x, s.y - 26);
    g.fillStyle(0x4a1038, 1);
    g.fillTriangle(s.x - 16, s.y + 36, s.x + 16, s.y + 36, s.x, s.y - 20);
    // Shirt and buttons.
    g.fillStyle(0xf2ead6, 0.95);
    g.fillTriangle(s.x - 6, s.y - 18, s.x + 6, s.y - 18, s.x, s.y + 4);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(ROSE_DARK, 1);
      g.fillCircle(s.x, s.y - 12 + i * 7, 1.3);
    }

    // Sound-wave arcs rolling off the shoulders, keyed to the beat.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const ph = ((t / 700 + i / 2) % 1);
        g.lineStyle(1.5, CHIME, (1 - ph) * 0.5);
        g.beginPath();
        g.arc(s.x + side * 24, s.y - 12, 10 + ph * 22, side === 1 ? -0.8 : Math.PI - 0.8, side === 1 ? 0.8 : Math.PI + 0.8, false);
        g.strokePath();
      }
    }

    // Arms: the baton hand rises with the cast; the off hand shapes the phrase.
    const dirX = Math.cos(s.facing);
    const batonLift = s.castGlow * 26 + Math.sin(t / 260) * 3;
    const bx = s.x + dirX * 28;
    const by = s.y - 16 - batonLift;
    g.lineStyle(4, ROSE_DARK, 1);
    g.lineBetween(s.x + dirX * 10, s.y - 12, bx, by);
    g.lineStyle(2, 0xf2ead6, 1);
    g.lineBetween(bx, by, bx + dirX * 16, by - 10);
    g.fillStyle(ROSE_LIT, 0.9);
    g.fillCircle(bx + dirX * 16, by - 10, 2);
    // Off hand, palm up.
    g.fillStyle(ROSE_DARK, 1);
    g.fillCircle(s.x - dirX * 26, s.y - 4 + Math.sin(t / 400) * 4, 6);

    // Head: swept hair, closed eyes — it conducts by ear.
    const hy0 = s.y - 36;
    g.fillStyle(0xe8d6c8, 0.95);
    g.fillEllipse(s.x, hy0, 22, 20);
    g.fillStyle(ROSE_DARK, 1);
    g.fillEllipse(s.x - dirX * 3, hy0 - 7, 24, 10);
    g.fillTriangle(s.x - dirX * 12, hy0 - 8, s.x - dirX * 4, hy0 - 12, s.x - dirX * 16, hy0 + 4);
    const eye = s.hurt ? 0xffffff : s.enraged ? ROSE : ROSE_DARK;
    const ex = dirX * 2;
    for (const side of [-1, 1]) {
      if (s.enraged || s.hurt) {
        g.fillStyle(eye, 1);
        g.fillCircle(s.x + side * 5 + ex, hy0, 2.2);
      } else {
        g.lineStyle(1.5, ROSE_DARK, 0.9);
        g.lineBetween(s.x + side * 7 + ex, hy0, s.x + side * 3 + ex, hy0 + 1);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
