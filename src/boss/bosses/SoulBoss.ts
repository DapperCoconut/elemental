import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Ferryman — Sovereign of the Vigil. Soul world's boss: he poles his skiff
 * across a river only he can see, and everything in the hall pays the toll.
 * Canon with the soul challenge, 'The Ferryman' ("Everyone pays. Some pay twice.").
 */

const SHROUD = 0xccaaff;
const SHROUD_LIT = 0xe8dcff;
const SHROUD_DARK = 0x241a3a;
const LANTERN = 0x7cf5d8;

// ── Signature: The Crossing ──────────────────────────────────────────
// The river shows itself as a lane; the Ferryman poles down it, shedding wake
// spirits to both sides as he goes. The lane is his — do not share it.

const theCrossing = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let startsAt = 0;
  let endsAt = 0;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  let lastWakeAt = 0;
  let dealtAt = 0;
  return {
    durationMs: 4400,
    cast(time: number) {
      tk.sfx('ghost-wail');
      active = true;
      startsAt = time + 1100;
      endsAt = startsAt + 2800;
      // A crossing that passes near the player, edge to edge.
      const p = tk.player;
      const horizontal = Math.abs(p.y - tk.H / 2) < Math.abs(p.x - tk.W / 2);
      if (horizontal) {
        x0 = 40; x1 = tk.W - 40;
        y0 = y1 = tk.clampY(p.y, 130);
      } else {
        y0 = 110; y1 = tk.H - 60;
        x0 = x1 = tk.clampX(p.x, 90);
      }
      lastWakeAt = 0;
      dealtAt = 0;
    },
    update(time: number) {
      if (!active) return;
      if (time > endsAt) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / (endsAt - startsAt);
      const bx = x0 + (x1 - x0) * t;
      const by = y0 + (y1 - y0) * t;
      tk.host.setBossPos(bx, by);
      // Wake spirits shed to both sides.
      if (time - lastWakeAt > 420) {
        lastWakeAt = time;
        const a = Math.atan2(y1 - y0, x1 - x0);
        for (const side of [-1, 1]) {
          tk.spawnBullet({
            x: bx, y: by, angle: a + (Math.PI / 2) * side,
            speed: 150, damage: 9, color: SHROUD_LIT, lifeMs: 2600,
          });
        }
      }
      const p = tk.player;
      if (p.active && Phaser.Math.Distance.Between(bx, by, p.x, p.y) < 42 && time - dealtAt > 1000) {
        dealtAt = time;
        tk.hitPlayer(20, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const warming = time < startsAt;
      const alpha = warming ? 0.2 + ((time - (startsAt - 1100)) / 1100) * 0.35 : 0.45;
      // The river: a broad soft band with drifting motes.
      g.lineStyle(46, SHROUD_DARK, alpha);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(2, LANTERN, alpha + 0.2);
      g.lineBetween(x0, y0, x1, y1);
      for (let i = 0; i < 8; i++) {
        const t2 = ((time / 1400 + i / 8) % 1);
        g.fillStyle(SHROUD_LIT, 0.4 * (1 - t2) + 0.1);
        g.fillCircle(x0 + (x1 - x0) * t2, y0 + (y1 - y0) * t2 + Math.sin(time / 300 + i) * 8, 3);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Lanterns ──────────────────────────────────────────
// Three soul-lanterns drift toward the player. Each bursts — on touch or on
// its own patience — into a pair of steerable wisps.

const theLanterns = (tk: BossToolkit): SignatureMove => {
  interface Lantern { x: number; y: number; burstsAt: number; done: boolean }
  let lanterns: Lantern[] = [];
  return {
    durationMs: 1400,
    cast(time: number) {
      tk.sfx('curse-cast');
      lanterns = [];
      for (let i = 0; i < 3; i++) {
        const a = tk.angleToPlayer() + (i - 1) * 0.7;
        lanterns.push({
          x: tk.bossX + Math.cos(a) * 50,
          y: tk.bossY + Math.sin(a) * 40,
          burstsAt: time + 2600 + i * 500,
          done: false,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const l of lanterns) {
        if (l.done) continue;
        const a = Math.atan2(p.y - l.y, p.x - l.x);
        l.x += Math.cos(a) * 62 * dt;
        l.y += Math.sin(a) * 62 * dt;
        const touched = p.active && Phaser.Math.Distance.Between(l.x, l.y, p.x, p.y) < 26;
        if (touched || time >= l.burstsAt) {
          l.done = true;
          tk.boom(l.x, l.y, 26, LANTERN);
          if (touched) tk.hitPlayer(10, p.x, p.y);
          for (const off of [0.6, -0.6]) {
            tk.spawnBullet({
              x: l.x, y: l.y, angle: a + off, speed: 150,
              damage: 12, r: 8, turn: Math.PI / 1.8, lifeMs: 5000,
            });
          }
        }
      }
      lanterns = lanterns.filter((l) => !l.done);
    },
    drawAir(g, time) {
      for (const l of lanterns) {
        const sway = Math.sin(time / 260 + l.x) * 3;
        // Hanging lantern: cage, flame, glow.
        g.fillStyle(LANTERN, 0.15);
        g.fillCircle(l.x + sway, l.y, 16);
        g.lineStyle(1.5, SHROUD_DARK, 1);
        g.strokeRoundedRect(l.x + sway - 6, l.y - 8, 12, 16, 3);
        g.fillStyle(LANTERN, 0.95);
        g.fillCircle(l.x + sway, l.y, 4 + Math.sin(time / 150) * 1);
      }
    },
    onPhaseEnd() { lanterns = []; },
  };
};

// ── Signature: The Toll ──────────────────────────────────────────────
// The hall demands payment: a ring of spirit hands rises around the player
// with one quiet gap, then closes inward as a slow ring wave. Pay with the
// dash through the gap, or pay in HP.

const theToll = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2800,
  cast(time: number) {
    tk.sfx('torment');
    const p = tk.player;
    const cx = tk.clampX(p.x, 160);
    const cy = tk.clampY(p.y, 160);
    const gap = Math.random() * Math.PI * 2;
    // Hands mark the rim first.
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      if (Math.abs(Phaser.Math.Angle.Wrap(a - gap)) < 0.65) continue;
      tk.spawnZone({
        x: cx + Math.cos(a) * 180, y: cy + Math.sin(a) * 180,
        radius: 36, warnMs: 1000, damage: 12, slowMult: 0.6, slowMs: 900,
      });
    }
    // Then the ring closes — inward wave, same gap, slower than a sprint.
    tk.schedule(1200, () => {
      tk.spawnRing({
        cx, cy, delayMs: 0, speed: -170, startRadius: 200,
        gapCentre: gap, gapHalf: 0.6, band: 26, damage: 20,
      });
    });
    void time;
  },
});

export const SOUL_BOSS: WorldBossDef = {
  worldId: 'soul',
  name: 'The Ferryman',
  title: 'Sovereign of the Vigil',
  color: SHROUD,
  colorLit: SHROUD_LIT,
  colorDark: SHROUD_DARK,
  accent: LANTERN,
  bodyR: 28,

  intro: ['Everyone pays. Some pay twice. You look like a twice.'],
  banter: [
    'The dead here are not restless. They are queueing.',
    'The Voice tried to buy the river. The river does not make change.',
    'Your fare is being calculated. Keep struggling; it affects the total.',
    'I have poled worse than you across. Not many, though.',
  ],
  defeatLine: 'THE RIVER RUNS CLEAR',

  phases: [
    {
      name: 'The Near Bank',
      line: 'Stand clear of the water. It remembers everyone it carried.',
      hp: 420,
      cycle: [
        'volley', 'sig:crossing', 'sig:lanterns', 'lanes',
        'sig:toll', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-orbs', 'h-rune', 'h-snipe'],
      restMs: 1080,
      harassMs: 3200,
      moveSpeed: 60,
      holdDist: 280,
    },
    {
      name: 'The Far Bank',
      line: 'This side of the river is mine. So, increasingly, is that side.',
      hp: 460,
      cycle: [
        'sig:toll', 'quake', 'sig:crossing', 'spiral',
        'sig:lanterns', 'summon', 'barrage', 'homing', 'lanes',
      ],
      harass: ['h-orbs', 'h-rune', 'h-flak', 'h-snipe'],
      restMs: 930,
      harassMs: 2700,
      moveSpeed: 75,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'EVERYONE PAYS TWICE TONIGHT',
    extraPhase: {
      name: 'The Second Fare',
      line: 'You paid to cross. Now pay to have crossed.',
      hp: 350,
      cycle: [
        'sig:crossing', 'sig:toll', 'sig:lanterns', 'sanctuary',
        'summon', 'quake', 'spiral', 'homing',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 730,
      harassMs: 2250,
      moveSpeed: 90,
      holdDist: 230,
    },
  },

  signatures: {
    crossing: theCrossing,
    lanterns: theLanterns,
    toll: theToll,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0714, 0.5);
    g.fillRect(0, 0, W, H);
    // Mist banks and moored posts along an unseen shore.
    for (let i = 0; i < 6; i++) {
      g.fillStyle(SHROUD, 0.05);
      g.fillEllipse((W / 6) * i + 50, H - 50 - (i % 2) * 30, 160, 36);
    }
    for (let i = 0; i < 5; i++) {
      const x = 80 + ((W - 160) * i) / 4;
      g.lineStyle(4, SHROUD_DARK, 0.8);
      g.lineBetween(x, H - 30, x, H - 62);
      g.fillStyle(LANTERN, 0.25);
      g.fillCircle(x, H - 66, 3);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    const dirX = Math.cos(s.facing);
    const bob = Math.sin(t / 600) * 3;

    // The skiff beneath him — a sliver of dark hull.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 46, 96, 12);
    g.fillStyle(SHROUD_DARK, 1);
    g.fillEllipse(s.x, s.y + 38 + bob, 84, 12);
    g.lineStyle(2, SHROUD, 0.4);
    g.lineBetween(s.x - 40, s.y + 34 + bob, s.x + 40, s.y + 34 + bob);

    // The robe: a hooded column that frays to nothing above the hull.
    g.fillStyle(SHROUD_DARK, 1);
    g.fillTriangle(s.x - 24, s.y + 36 + bob, s.x + 24, s.y + 36 + bob, s.x, s.y - 34 + bob);
    g.fillStyle(0x18102a, 1);
    g.fillTriangle(s.x - 16, s.y + 32 + bob, s.x + 16, s.y + 32 + bob, s.x, s.y - 26 + bob);
    // Fraying hem wisps.
    for (let i = 0; i < 4; i++) {
      const wx = s.x - 18 + i * 12;
      const wob = Math.sin(t / 240 + i * 2.1) * 3;
      g.fillStyle(SHROUD, 0.25);
      g.fillCircle(wx + wob, s.y + 30 + bob + (i % 2) * 4, 4);
    }

    // The pole, held to one side, lantern swinging at its head.
    const px = s.x + dirX * 26;
    const sway = Math.sin(t / 500) * 5 + s.castGlow * 6;
    g.lineStyle(3, 0x4a3a5c, 1);
    g.lineBetween(px, s.y + 42 + bob, px - dirX * 10 + sway * 0.3, s.y - 52 + bob);
    const lx = px - dirX * 10 + sway;
    const ly = s.y - 46 + bob;
    g.lineStyle(1.5, SHROUD_DARK, 1);
    g.lineBetween(px - dirX * 10 + sway * 0.3, s.y - 52 + bob, lx, ly);
    g.fillStyle(LANTERN, 0.18);
    g.fillCircle(lx, ly + 8, 13);
    g.lineStyle(1.5, SHROUD_DARK, 1);
    g.strokeRoundedRect(lx - 5, ly + 2, 10, 13, 3);
    g.fillStyle(LANTERN, 0.55 + s.castGlow * 0.45);
    g.fillCircle(lx, ly + 8, 3.5 + s.castGlow * 1.5);

    // The hood: empty, save the fare-lights.
    const hy0 = s.y - 30 + bob;
    g.fillStyle(SHROUD_DARK, 1);
    g.fillEllipse(s.x, hy0, 28, 24);
    g.fillStyle(0x080512, 1);
    g.fillEllipse(s.x + dirX * 2, hy0 + 2, 19, 16);
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffd27a : LANTERN;
    const ex = Math.cos(s.facing) * 3;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 5 + ex, hy0 + 1, 2.6);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
