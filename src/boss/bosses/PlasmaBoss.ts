import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Unbound Star — Sovereign of the Fourth State. Plasma world's boss: it
 * stopped having a shape, and it wants you to stop having one too. Canon with
 * the plasma challenge, 'The Unbound Star' ("I stopped having a shape.").
 */

const PLASMA = 0xaa22ff;
const PLASMA_LIT = 0xe0a8ff;
const PLASMA_DARK = 0x2a0a44;
const PINCH = 0xff8ae8;

// ── Signature: Unbound ───────────────────────────────────────────────
// The star lets go of itself: the body wanders drunkenly while two phantom
// lobes split off and spray from their own positions. Which one is real
// stops being a useful question — the real one is the one you can hit.

const unbound = (tk: BossToolkit): SignatureMove => {
  interface Lobe { x: number; y: number; vx: number; vy: number; nextShotAt: number }
  let lobes: Lobe[] = [];
  let activeUntil = 0;
  return {
    durationMs: 4400,
    cast(time: number) {
      tk.sfx('roar');
      activeUntil = time + 4200;
      lobes = [0, 1].map((i) => ({
        x: tk.bossX, y: tk.bossY,
        vx: Math.cos(i * Math.PI + 0.8) * 120,
        vy: Math.sin(i * Math.PI + 0.8) * 90,
        nextShotAt: time + 900 + i * 400,
      }));
    },
    update(time: number, dt: number) {
      if (time >= activeUntil) { lobes = []; return; }
      for (const l of lobes) {
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        if (l.x < 90 || l.x > tk.W - 90) l.vx *= -1;
        if (l.y < 140 || l.y > tk.H - 100) l.vy *= -1;
        if (time >= l.nextShotAt) {
          l.nextShotAt = time + 620;
          const a = Math.atan2(tk.player.y - l.y, tk.player.x - l.x)
            + Phaser.Math.FloatBetween(-0.25, 0.25);
          tk.spawnBullet({
            x: l.x, y: l.y, angle: a, speed: 230, damage: 10, color: PLASMA_LIT,
          });
        }
      }
    },
    drawAir(g, time) {
      for (const l of lobes) {
        // A molten lobe, same idiom as the body so the shell game reads.
        for (let i = 0; i < 3; i++) {
          const a = time / 300 + i * 2.1;
          g.fillStyle(i === 0 ? PLASMA : PLASMA_DARK, 0.75 - i * 0.15);
          g.fillCircle(l.x + Math.cos(a) * 6, l.y + Math.sin(a) * 5, 15 - i * 3);
        }
        g.fillStyle(PINCH, 0.5);
        g.fillCircle(l.x, l.y, 5);
      }
    },
    onPhaseEnd() { lobes = []; },
  };
};

// ── Signature: Flare ─────────────────────────────────────────────────
// Arc discharge with no manners: five lashes at chaotic angles, each through
// a point near the player, each with its own short warning. Nothing here is
// a pattern. That is the pattern.

const flare = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2900,
  cast(time: number) {
    tk.sfx('curse-cast');
    for (let i = 0; i < 5; i++) {
      tk.schedule(i * 460, () => {
        const p = tk.player;
        tk.spawnLane({
          x: tk.clampX(p.x + Phaser.Math.Between(-90, 90), 60),
          y: tk.clampY(p.y + Phaser.Math.Between(-70, 70), 100),
          angle: Phaser.Math.FloatBetween(0, Math.PI),
          halfW: 17, warnMs: 780, damage: 15,
        });
      });
    }
    void time;
  },
});

// ── Signature: Corona Shed ───────────────────────────────────────────
// The star sheds its skin as a ring of blobs at scattered speeds — the slow
// ones make a second wall behind the first. Weave the speed gaps; there is
// no angular gap to find.

const coronaShed = (tk: BossToolkit): SignatureMove => ({
  durationMs: 1600,
  cast(time: number) {
    tk.sfx('explosion-large');
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18 + Phaser.Math.FloatBetween(-0.06, 0.06);
      tk.spawnBullet({
        x: tk.bossX + Math.cos(a) * 28, y: tk.bossY + Math.sin(a) * 28,
        angle: a, speed: Phaser.Math.Between(120, 260),
        damage: 11, r: Phaser.Math.Between(5, 8), color: i % 3 === 0 ? PINCH : PLASMA_LIT,
      });
    }
    void time;
  },
});

export const PLASMA_BOSS: WorldBossDef = {
  worldId: 'plasma',
  name: 'The Unbound Star',
  title: 'Sovereign of the Fourth State',
  color: PLASMA,
  colorLit: PLASMA_LIT,
  colorDark: PLASMA_DARK,
  accent: PINCH,
  bodyR: 30,

  intro: ['I stopped having a shape. It was holding me back. Yours is holding you back.'],
  banter: [
    'Solid, liquid, gas. Adorable. Baby states.',
    'The Voice tried to swallow me. I do not fit in mouths. I do not fit in ANYTHING.',
    'You keep aiming at where I am. Bold assumption, "am".',
    'Stars are just plasma with commitment issues resolved.',
  ],
  defeatLine: 'THE STAR COLLAPSES INWARD',

  phases: [
    {
      name: 'Ignition',
      line: 'This is not fire. This is what fire dreams of being.',
      hp: 450,
      cycle: [
        'sig:unbound', 'volley', 'sig:flare', 'spiral',
        'sig:corona', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 90,
      holdDist: 270,
    },
    {
      name: 'The Pinch',
      line: 'Compressed. Furious. Radiant. My three moods, simultaneously.',
      hp: 500,
      cycle: [
        'sig:flare', 'sig:unbound', 'quake', 'sig:corona',
        'spiral', 'barrage', 'homing', 'stream', 'radial',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-rune'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 105,
      holdDist: 240,
    },
  ],

  hard: {
    introLine: 'THE STAR HAS NO SURFACE LEFT',
    extraPhase: {
      name: 'Nova',
      line: 'Every star ends twice. Loudly, and then honestly. Pick which one you watch.',
      hp: 380,
      cycle: [
        'sig:corona', 'sig:unbound', 'sig:flare', 'sanctuary',
        'quake', 'spiral', 'sig:corona', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 120,
      holdDist: 220,
    },
  },

  signatures: {
    unbound,
    flare,
    corona: coronaShed,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0c0414, 0.55);
    g.fillRect(0, 0, W, H);
    // Scorch rings from previous outbursts, and containment stubs that failed.
    const rnd = new Phaser.Math.RandomDataGenerator(['plasma-boss-arena']);
    for (let i = 0; i < 4; i++) {
      const x = rnd.integerInRange(W * 0.2, W * 0.8);
      const y = rnd.integerInRange(H * 0.35, H * 0.85);
      g.lineStyle(2, PLASMA_DARK, 0.7);
      g.strokeCircle(x, y, rnd.integerInRange(18, 44));
    }
    for (let i = 0; i < 5; i++) {
      const x = 80 + ((W - 160) * i) / 4;
      g.fillStyle(0x3a3a44, 0.8);
      g.fillRect(x - 5, H - 44, 10, 14);
      g.lineStyle(1.5, PLASMA, 0.35);
      g.strokeCircle(x, H - 50, 4);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // No shadow, no ground. A lava-lamp of a body: lobes that never agree.
    const lobes = 5;
    for (let i = 0; i < lobes; i++) {
      const a = t / (500 + i * 90) + (Math.PI * 2 * i) / lobes;
      const r = 12 + ((i * 7) % 10) + Math.sin(t / 260 + i * 2.4) * 5;
      const dist = 12 + Math.sin(t / 340 + i * 1.7) * 8 + s.castGlow * 6;
      g.fillStyle(i % 2 === 0 ? PLASMA : PLASMA_DARK, 0.85);
      g.fillCircle(s.x + Math.cos(a) * dist, s.y + Math.sin(a) * dist * 0.8, r + 6);
    }
    // The bright core, off-centre and drifting.
    const coreA = t / 800;
    const cx = s.x + Math.cos(coreA) * 7;
    const cy = s.y + Math.sin(coreA) * 5;
    g.fillStyle(PLASMA_LIT, 0.95);
    g.fillCircle(cx, cy, 13 + s.castGlow * 4);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(cx - 3, cy - 3, 5);

    // Arc filaments crawling on the surface.
    const flick = Math.floor(t / 110);
    for (let i = 0; i < 3; i++) {
      const seed = flick * 13 + i * 71;
      const a0 = ((seed * 379) % 628) / 100;
      g.lineStyle(1.5, PINCH, 0.8);
      let lx = s.x + Math.cos(a0) * 24;
      let ly = s.y + Math.sin(a0) * 20;
      for (let k = 0; k < 3; k++) {
        const nx = lx + (((seed + k * 17) % 13) - 6) * 2.2;
        const ny = ly + (((seed + k * 29) % 11) - 5) * 2.2;
        g.lineBetween(lx, ly, nx, ny);
        lx = nx;
        ly = ny;
      }
    }

    // A face, when it remembers to have one: two drifting eye-motes.
    const remember = Math.sin(t / 1900) > -0.3;
    if (remember) {
      const ex = Math.cos(s.facing) * 6;
      const ey = Math.sin(s.facing) * 4;
      const eye = s.hurt ? 0xffffff : s.enraged ? PINCH : 0xffffff;
      for (const side of [-1, 1]) {
        g.fillStyle(eye, 0.9);
        g.fillCircle(s.x + side * 8 + ex + Math.sin(t / 400 + side) * 2, s.y - 4 + ey, 3);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
