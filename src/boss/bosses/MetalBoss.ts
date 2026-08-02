import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Iron Legion — Sovereign of the Foundry. Metal world's boss: one soldier
 * who is also an army, given time and a forge. Canon with the metal challenge,
 * 'The Iron Legion' ("One of me was always enough. Now count.").
 */

const STEEL = 0x8899aa;
const STEEL_LIT = 0xd8e0e8;
const STEEL_DARK = 0x2a3038;
const BRASS = 0xffcf6a;

// ── Signature: The Phalanx ───────────────────────────────────────────
// A shield wall marches across the hall — a moving line with a single door
// where one soldier is missing from the rank. Find the gap; the wall finds you.

const PHALANX_MS = 3800;
const PHALANX_HALF_W = 26;

const phalanx = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let fromLeft = true;
  let startsAt = 0;
  let gapY = 0;
  let dealtAt = 0;
  return {
    durationMs: 1200 + PHALANX_MS,
    cast(time: number) {
      tk.sfx('shield-up');
      active = true;
      fromLeft = !fromLeft;
      startsAt = time + 1200;
      gapY = Phaser.Math.Between(180, tk.H - 140);
      dealtAt = 0;
    },
    update(time: number) {
      if (!active) return;
      if (time > startsAt + PHALANX_MS) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / PHALANX_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      const p = tk.player;
      if (!p.active || time - dealtAt < 1100) return;
      if (Math.abs(p.x - x) < PHALANX_HALF_W && Math.abs(p.y - gapY) > 62) {
        dealtAt = time;
        tk.hitPlayer(22, p.x, p.y);
        p.x = Phaser.Math.Clamp(p.x + (fromLeft ? 44 : -44), 44, tk.W - 44);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const warming = time < startsAt;
      const t = warming ? 0 : (time - startsAt) / PHALANX_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      if (warming) {
        const a = 0.25 + ((time - (startsAt - 1200)) / 1200) * 0.5;
        g.lineStyle(4, STEEL_LIT, a);
        g.lineBetween(fromLeft ? 44 : tk.W - 44, 96, fromLeft ? 44 : tk.W - 44, tk.H - 36);
        return;
      }
      // The rank: tower shields stacked down the line, minus one at the door.
      for (let y = 110; y < tk.H - 40; y += 34) {
        if (Math.abs(y - gapY) < 48) continue;
        g.fillStyle(STEEL_DARK, 0.95);
        g.fillRoundedRect(x - 10, y - 14, 20, 28, 4);
        g.lineStyle(1.5, STEEL_LIT, 0.8);
        g.strokeRoundedRect(x - 10, y - 14, 20, 28, 4);
        g.fillStyle(BRASS, 0.7);
        g.fillCircle(x, y, 3);
      }
      // Spear tips bristling ahead of the wall.
      const ahead = fromLeft ? 16 : -16;
      for (let y = 122; y < tk.H - 50; y += 68) {
        if (Math.abs(y - gapY) < 48) continue;
        g.lineStyle(2, STEEL_LIT, 0.8);
        g.lineBetween(x, y, x + ahead, y);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Sabres ────────────────────────────────────────────────
// Four blades rise and orbit at guard, then lunge one at a time — each
// telegraphing its line with a glint down the edge before it flies.

const sabres = (tk: BossToolkit): SignatureMove => {
  interface Blade { angle: number; launched: boolean; aimA: number; aimAt: number }
  let blades: Blade[] = [];
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('curse-cast');
      blades = Array.from({ length: 4 }, (_, i) => ({
        angle: (Math.PI * 2 * i) / 4, launched: false, aimA: 0, aimAt: 0,
      }));
      for (let i = 0; i < 4; i++) {
        tk.schedule(900 + i * 620, () => {
          const b = blades[i];
          if (!b) return;
          b.aimA = tk.angleToPlayer();
          b.aimAt = tk.now;
          tk.schedule(340, () => {
            b.launched = true;
            tk.spawnBullet({
              x: tk.bossX + Math.cos(b.angle + tk.now / 800) * 48,
              y: tk.bossY + Math.sin(b.angle + tk.now / 800) * 48,
              angle: b.aimA, speed: 380, damage: 15, r: 6, color: STEEL_LIT, lifeMs: 2600,
            });
          });
        });
      }
      tk.schedule(3800, () => { blades = []; });
    },
    drawAir(g, time) {
      const spin = time / 800;
      for (const b of blades) {
        if (b.launched) continue;
        const x = tk.bossX + Math.cos(b.angle + spin) * 48;
        const y = tk.bossY + Math.sin(b.angle + spin) * 48;
        const aiming = b.aimAt > 0 && time - b.aimAt < 340;
        const a = aiming ? b.aimA : b.angle + spin + Math.PI / 2;
        // The blade.
        g.fillStyle(STEEL_LIT, 0.95);
        g.fillTriangle(
          x - Math.cos(a) * 5 - Math.sin(a) * 3, y - Math.sin(a) * 5 + Math.cos(a) * 3,
          x - Math.cos(a) * 5 + Math.sin(a) * 3, y - Math.sin(a) * 5 - Math.cos(a) * 3,
          x + Math.cos(a) * 14, y + Math.sin(a) * 14,
        );
        g.fillStyle(BRASS, 0.9);
        g.fillCircle(x - Math.cos(a) * 7, y - Math.sin(a) * 7, 2.5);
        if (aiming) {
          g.lineStyle(1, STEEL_LIT, 0.4);
          g.lineBetween(x, y, x + Math.cos(a) * 300, y + Math.sin(a) * 300);
        }
      }
    },
    onPhaseEnd() { blades = []; },
  };
};

// ── Signature: Iron Rain ─────────────────────────────────────────────
// The armoury upends itself: rows of falling swords march toward the player,
// rank by rank. Walk perpendicular to the advance.

const ironRain = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3200,
  cast(time: number) {
    tk.sfx('judgement');
    const p = tk.player;
    const a = tk.angleToPlayer();
    // Ranks fall starting behind the player and marching through them.
    for (let rank = 0; rank < 4; rank++) {
      tk.schedule(400 + rank * 560, () => {
        const cx = p.x + Math.cos(a) * (rank - 1) * 90;
        const cy = p.y + Math.sin(a) * (rank - 1) * 90;
        for (let i = -1; i <= 1; i++) {
          tk.spawnZone({
            x: tk.clampX(cx + Math.cos(a + Math.PI / 2) * i * 85, 60),
            y: tk.clampY(cy + Math.sin(a + Math.PI / 2) * i * 85, 100),
            radius: 44, warnMs: 700, damage: 15, fall: true,
          });
        }
      });
    }
    void time;
  },
});

export const METAL_BOSS: WorldBossDef = {
  worldId: 'metal',
  name: 'The Iron Legion',
  title: 'Sovereign of the Foundry',
  color: STEEL,
  colorLit: STEEL_LIT,
  colorDark: STEEL_DARK,
  accent: BRASS,
  bodyR: 30,

  intro: ['One of me was always enough. Now count.'],
  banter: [
    'Discipline is just violence that arrives on time.',
    'The Voice wanted my army. It misunderstood: I am not IN the legion. I AM the legion.',
    'Your stance is poor. The forge could fix that. Permanently.',
    'Rust is desertion. We do not desert.',
  ],
  defeatLine: 'THE LEGION STANDS DOWN',

  phases: [
    {
      name: 'The Muster',
      line: 'Fall in. You are about to be outnumbered by one soldier.',
      hp: 450,
      cycle: [
        'sig:phalanx', 'volley', 'sig:sabres', 'summon',
        'sig:rain', 'lanes', 'radial', 'slamchain',
      ],
      harass: ['h-snipe', 'h-flak', 'h-mines'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 45,
      holdDist: 270,
    },
    {
      name: 'The March',
      line: 'The legion advances. It has never once done anything else.',
      hp: 500,
      cycle: [
        'sig:sabres', 'sig:phalanx', 'quake', 'sig:rain',
        'summon', 'barrage', 'sweep', 'stream', 'lanes',
      ],
      harass: ['h-snipe', 'h-flak', 'h-mines', 'h-lane'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 55,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'EVERY SOLDIER IT EVER WAS, AT ONCE',
    extraPhase: {
      name: 'The Last Cohort',
      line: 'The forge is out of iron. What is left is the part that never needed it.',
      hp: 380,
      cycle: [
        'sig:phalanx', 'sig:rain', 'sig:sabres', 'sanctuary',
        'summon', 'quake', 'sweep', 'stream',
      ],
      harass: ['h-mines', 'h-flak', 'h-snipe', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 70,
      holdDist: 230,
    },
  },

  signatures: {
    phalanx,
    sabres,
    rain: ironRain,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0c10, 0.5);
    g.fillRect(0, 0, W, H);
    // Racked arms along the walls, forge glow at one end.
    g.fillStyle(0xff8a3a, 0.06);
    g.fillEllipse(W - 60, H * 0.5, 140, 300);
    for (let i = 0; i < 7; i++) {
      const x = 60 + ((W - 200) * i) / 6;
      g.lineStyle(2, STEEL_DARK, 1);
      g.lineBetween(x, 100, x, 128);
      g.fillStyle(STEEL, 0.7);
      g.fillTriangle(x - 3, 100, x + 3, 100, x, 92);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 48, 96, 17);

    // The legion behind: two echo silhouettes, out of step on purpose.
    for (const [off, alpha] of [[18, 0.35], [34, 0.18]] as const) {
      const sway = Math.sin(t / 700 + off) * 2;
      g.fillStyle(STEEL_DARK, alpha);
      g.fillEllipse(s.x - off + sway, s.y + 6 - off * 0.3, 44, 54);
      g.fillEllipse(s.x - off + sway, s.y - 30 - off * 0.3, 22, 20);
    }

    const dirX = Math.cos(s.facing);
    // Tower shield on the off side — most of the silhouette.
    const shX = s.x - dirX * 24;
    g.fillStyle(STEEL_DARK, 1);
    g.fillRoundedRect(shX - 14, s.y - 34, 28, 76, 8);
    g.fillStyle(STEEL, 1);
    g.fillRoundedRect(shX - 10, s.y - 30, 20, 68, 6);
    g.fillStyle(BRASS, 0.85);
    g.fillCircle(shX, s.y + 2, 5);
    g.lineStyle(1.5, STEEL_LIT, 0.6);
    g.lineBetween(shX - 10, s.y - 14, shX + 10, s.y - 14);
    g.lineBetween(shX - 10, s.y + 18, shX + 10, s.y + 18);

    // Cuirass torso.
    g.fillStyle(STEEL_DARK, 1);
    g.fillEllipse(s.x + dirX * 4, s.y + 2, 46, 52);
    g.fillStyle(STEEL, 1);
    g.fillEllipse(s.x + dirX * 2, s.y - 2, 36, 40);
    g.fillStyle(STEEL_LIT, 0.4);
    g.fillEllipse(s.x - 4, s.y - 12, 20, 14);

    // Sword arm: a great sabre, raised with the cast.
    const lift = s.castGlow * 30;
    const swX = s.x + dirX * 30;
    const swY = s.y - 6 - lift * 0.4;
    g.lineStyle(5, STEEL_DARK, 1);
    g.lineBetween(s.x + dirX * 12, s.y - 6, swX, swY);
    g.lineStyle(4, STEEL_LIT, 1);
    g.lineBetween(swX, swY, swX + dirX * 26, swY - 22 - lift);
    g.lineStyle(2, 0xffffff, 0.6);
    g.lineBetween(swX + dirX * 4, swY - 4, swX + dirX * 24, swY - 20 - lift);
    g.fillStyle(BRASS, 1);
    g.fillRect(swX - 4, swY - 4, 8, 8);

    // Great helm with a brass plume.
    const hy0 = s.y - 36;
    g.fillStyle(STEEL_DARK, 1);
    g.fillEllipse(s.x + dirX * 2, hy0, 26, 24);
    g.fillStyle(STEEL, 1);
    g.fillEllipse(s.x + dirX * 2, hy0 - 2, 20, 17);
    // Visor slit.
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xff7a4a : BRASS;
    g.fillStyle(eye, 0.95);
    g.fillRect(s.x + dirX * 2 - 8, hy0 - 1, 16, 3);
    // Plume, streaming with movement.
    for (let i = 0; i < 4; i++) {
      const wob = Math.sin(t / 200 + i) * 3;
      g.fillStyle(i % 2 === 0 ? 0xcc3a3a : 0xa82a2a, 0.9);
      g.fillEllipse(s.x - dirX * (6 + i * 7) + wob, hy0 - 16 - i * 2, 10, 6);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 54);
    }
  },
};
