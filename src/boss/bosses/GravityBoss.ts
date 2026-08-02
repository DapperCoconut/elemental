import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Singularity — Sovereign of the Well. Gravity world's boss: a black sphere
 * with an accretion ring and no interest in letting anything leave.
 * Canon with the gravity challenge, 'Singularity' ("Nothing leaves.").
 */

const VOID = 0x8844cc;
const VOID_LIT = 0xc9a8ff;
const VOID_DARK = 0x120821;
const ACCRETION = 0xffd27a;

// ── Signature: Collapse ──────────────────────────────────────────────
// A point is marked; for two and a half seconds everything is dragged toward
// it (hard, but under sprint speed), then it detonates. Distance is the
// answer, and the drag is the tax on the answer.

const collapse = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let firesAt = 0;
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('black-hole');
      active = true;
      cx = tk.clampX(tk.player.x + Phaser.Math.Between(-80, 80), 140);
      cy = tk.clampY(tk.player.y + Phaser.Math.Between(-60, 60), 150);
      firesAt = time + 2500;
      tk.schedule(2500, () => {
        active = false;
        tk.explode(cx, cy, 150, 34, VOID_LIT);
        tk.scene.cameras.main.shake(300, 0.007);
      });
    },
    update(time: number) {
      if (!active || time >= firesAt) return;
      tk.pull(cx, cy, 118, 130);
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 2500, 0, 1);
      // Infalling rings.
      for (let i = 0; i < 3; i++) {
        const ph = ((time / 700 + i / 3) % 1);
        const r = 150 * (1 - ph) + 12;
        g.lineStyle(2, VOID, 0.5 * ph + 0.1);
        g.strokeCircle(cx, cy, r);
      }
      g.lineStyle(2.5, ACCRETION, 0.3 + t * 0.6);
      g.strokeCircle(cx, cy, 150);
      g.fillStyle(VOID_DARK, 0.5 + t * 0.4);
      g.fillCircle(cx, cy, 12 + t * 10);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Orbitals ──────────────────────────────────────────
// Three captured moons circle the sphere, then are let go one by one — heavy,
// slow, and faintly homing, the way debts are.

const theOrbitals = (tk: BossToolkit): SignatureMove => {
  interface Moon { angle: number; launched: boolean }
  let moons: Moon[] = [];
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('shield-up');
      moons = Array.from({ length: 3 }, (_, i) => ({
        angle: (Math.PI * 2 * i) / 3, launched: false,
      }));
      for (let i = 0; i < 3; i++) {
        tk.schedule(1000 + i * 750, () => {
          const m = moons[i];
          if (!m) return;
          m.launched = true;
          const a = tk.angleToPlayer();
          tk.spawnBullet({
            x: tk.bossX + Math.cos(m.angle + tk.now / 1100) * 52,
            y: tk.bossY + Math.sin(m.angle + tk.now / 1100) * 42,
            angle: a, speed: 165, damage: 18, r: 12,
            turn: Math.PI / 2.4, lifeMs: 6000,
          });
        });
      }
      tk.schedule(3600, () => { moons = []; });
    },
    drawAir(g, time) {
      const spin = time / 1100;
      for (const m of moons) {
        if (m.launched) continue;
        const x = tk.bossX + Math.cos(m.angle + spin) * 52;
        const y = tk.bossY + Math.sin(m.angle + spin) * 42;
        g.fillStyle(VOID_DARK, 1);
        g.fillCircle(x, y, 10);
        g.fillStyle(VOID_LIT, 0.5);
        g.fillCircle(x - 3, y - 3, 4);
        g.fillStyle(0x6a5a8a, 0.8);
        g.fillCircle(x + 3, y + 2, 2.5);
      }
    },
    onPhaseEnd() { moons = []; },
  };
};

// ── Signature: The Lean ──────────────────────────────────────────────
// Down changes its mind. For three seconds the whole hall leans one way and
// everything drifts with it — fight the slope or use it, but know it is there.

const LEAN_MS = 3200;
const LEAN_DRIFT = 72;

const theLean = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  let dirX = 0;
  let dirY = 1;
  return {
    durationMs: 1600,
    cast(time: number) {
      tk.sfx('dark-drain');
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      dirX = Math.cos(a);
      dirY = Math.sin(a);
      activeUntil = time + LEAN_MS;
      tk.host.showFloatingText(tk.W / 2, 150, '⬇ DOWN MOVED', `#${VOID_LIT.toString(16)}`);
    },
    update(time: number, dt: number) {
      if (time >= activeUntil) return;
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      p.x = Phaser.Math.Clamp(p.x + dirX * LEAN_DRIFT * dt, 44, tk.W - 44);
      p.y = Phaser.Math.Clamp(p.y + dirY * LEAN_DRIFT * dt, 96, tk.H - 44);
    },
    drawGround(g, time) {
      if (time >= activeUntil) return;
      // Drift streamers showing which way the world now falls.
      for (let i = 0; i < 8; i++) {
        const ph = ((time / 900 + i / 8) % 1);
        const x = ((i * 131) % (tk.W - 100)) + 50 + dirX * ph * 60;
        const y = 130 + ((i * 87) % (tk.H - 200)) + dirY * ph * 60;
        g.lineStyle(1.5, VOID_LIT, (1 - ph) * 0.4);
        g.lineBetween(x, y, x + dirX * 18, y + dirY * 18);
      }
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const GRAVITY_BOSS: WorldBossDef = {
  worldId: 'gravity',
  name: 'Singularity',
  title: 'Sovereign of the Well',
  color: VOID,
  colorLit: VOID_LIT,
  colorDark: VOID_DARK,
  accent: ACCRETION,
  bodyR: 30,

  intro: ['Nothing leaves. Attendance, at least, will be perfect.'],
  banter: [
    'Everything falls toward me eventually. You are just being punctual.',
    'The Voice pulls from below. I pull from everywhere. We do not get along.',
    'Escape velocity is a number. You do not have it.',
    'I have eaten light for breakfast. Literally. It was fine.',
  ],
  defeatLine: 'THE WELL LETS GO',

  phases: [
    {
      name: 'The Well',
      line: 'Come in. Coming in is the one thing everyone here is good at.',
      hp: 420,
      cycle: [
        'sig:collapse', 'volley', 'sig:orbitals', 'lanes',
        'sig:lean', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune'],
      restMs: 1080,
      harassMs: 3200,
      moveSpeed: 50,
      holdDist: 290,
    },
    {
      name: 'Event Horizon',
      line: 'Past this line, the arguments stop working.',
      hp: 460,
      cycle: [
        'sig:lean', 'sig:collapse', 'quake', 'spiral',
        'sig:orbitals', 'barrage', 'homing', 'stream', 'radial',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 930,
      harassMs: 2700,
      moveSpeed: 60,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'PAST THE HORIZON, EVEN ECHOES SINK',
    extraPhase: {
      name: 'Past The Horizon',
      line: 'This is the inside. Few reviews. None left.',
      hp: 350,
      cycle: [
        'sig:collapse', 'sig:lean', 'sanctuary', 'sig:orbitals',
        'quake', 'spiral', 'sig:collapse', 'stream',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 720,
      harassMs: 2200,
      moveSpeed: 75,
      holdDist: 240,
    },
  },

  signatures: {
    collapse,
    orbitals: theOrbitals,
    lean: theLean,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x060310, 0.55);
    g.fillRect(0, 0, W, H);
    // A starfield being combed toward the centre.
    const rnd = new Phaser.Math.RandomDataGenerator(['gravity-boss-arena']);
    const cx = W / 2;
    const cy = H * 0.45;
    for (let i = 0; i < 40; i++) {
      const x = rnd.integerInRange(20, W - 20);
      const y = rnd.integerInRange(96, H - 20);
      const a = Math.atan2(cy - y, cx - x);
      const streak = rnd.realInRange(2, 8);
      g.lineStyle(1, 0xffffff, rnd.realInRange(0.08, 0.3));
      g.lineBetween(x, y, x + Math.cos(a) * streak, y + Math.sin(a) * streak);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // Lensing arcs — light bending around the sphere.
    for (let i = 0; i < 3; i++) {
      const r = 40 + i * 10;
      g.lineStyle(1.5, VOID_LIT, 0.3 - i * 0.07);
      g.beginPath();
      g.arc(s.x, s.y, r, Math.PI * 0.9 + Math.sin(t / 900) * 0.2, Math.PI * 1.9, false);
      g.strokePath();
    }
    // The accretion ring: an ellipse of hot dust, back half behind the sphere.
    const ringTilt = 0.35;
    g.lineStyle(4, ACCRETION, 0.55 + s.castGlow * 0.35);
    g.strokeEllipse(s.x, s.y, 112, 112 * ringTilt);
    for (let i = 0; i < 7; i++) {
      const a = t / 500 + (Math.PI * 2 * i) / 7;
      g.fillStyle(i % 2 === 0 ? ACCRETION : 0xff9a4a, 0.8);
      g.fillCircle(s.x + Math.cos(a) * 56, s.y + Math.sin(a) * 56 * ringTilt, 2.2);
    }

    // The sphere: absolute dark with a thin photon rim.
    g.fillStyle(0x000000, 1);
    g.fillCircle(s.x, s.y, 27 + s.castGlow * 3);
    g.lineStyle(2, s.enraged ? 0xff8a5a : VOID_LIT, 0.9);
    g.strokeCircle(s.x, s.y, 27 + s.castGlow * 3);

    // Two pinprick "eyes": infalling stars, always sliding toward the middle.
    const ex = Math.cos(s.facing) * 6;
    const ey = Math.sin(s.facing) * 4;
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffb08a : 0xffffff;
    const drift = (t % 1000) / 1000;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.9 - drift * 0.3);
      g.fillCircle(s.x + ex + side * (9 - drift * 3), s.y + ey - 2, 1.8);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 48);
    }
  },
};
