import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Solar Court — Sovereign of the Bright. Light world's boss: a small sun
 * holding session, entirely convinced the arena is its sky. Canon with the
 * light challenge, 'Solar Court' ("Look up. That was your mistake.").
 */

const SUN = 0xffc84a;
const SUN_LIT = 0xffffff;
const SUN_DARK = 0x4a3a0a;
const CORONA = 0xffb84a;

// ── Signature: Look Up ───────────────────────────────────────────────
// A column of daylight tracks the player for two seconds, then locks and
// falls. The lock is loud; the last sidestep is the whole exam.

const lookUp = (tk: BossToolkit): SignatureMove => {
  let tracking = false;
  let locked = false;
  let cx = 0;
  let cy = 0;
  let firesAt = 0;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('judgement');
      tracking = true;
      locked = false;
      cx = tk.player.x;
      cy = tk.player.y;
      firesAt = time + 2700;
      tk.schedule(2000, () => {
        locked = true;
        tk.sfx('shield-up');
      });
      tk.schedule(2700, () => {
        tracking = false;
        tk.explode(cx, cy, 110, 30, SUN_LIT);
        tk.scene.cameras.main.flash(200, 255, 240, 180);
      });
    },
    update(time: number, dt: number) {
      if (!tracking || locked) return;
      const p = tk.player;
      if (!p.active) return;
      // The beam drifts after the player — slower than they walk (150 vs 200).
      const a = Math.atan2(p.y - cy, p.x - cx);
      const d = Math.min(Phaser.Math.Distance.Between(cx, cy, p.x, p.y), 150 * dt);
      cx += Math.cos(a) * d;
      cy += Math.sin(a) * d;
      void time;
    },
    drawGround(g, time) {
      if (!tracking) return;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 2700, 0, 1);
      const color = locked ? 0xff8a4a : SUN;
      g.lineStyle(2.5, color, 0.4 + t * 0.5);
      g.strokeCircle(cx, cy, 110);
      g.fillStyle(color, 0.08 + t * 0.18);
      g.fillCircle(cx, cy, 110);
      // The shaft from above, narrowing to the mark.
      g.fillStyle(SUN_LIT, 0.1 + t * 0.2);
      g.fillTriangle(cx - 60, 90, cx + 60, 90, cx, cy);
      if (locked) {
        g.lineStyle(2, 0xff8a4a, 0.9);
        g.lineBetween(cx - 16, cy, cx + 16, cy);
        g.lineBetween(cx, cy - 16, cx, cy + 16);
      }
    },
    onPhaseEnd() { tracking = false; },
  };
};

// ── Signature: Daybreak ──────────────────────────────────────────────
// Dawn takes half the hall; then, immediately, the other half. The safe move
// is a full crossing, timed through the seam — day always follows day here.

const daybreak = (tk: BossToolkit): SignatureMove => {
  let phase: 0 | 1 | 2 = 2;
  let firstLeft = true;
  let switchAt = 0;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('judgement');
      firstLeft = tk.player.x > tk.W / 2; // dawn rises where you are NOT... then follows
      phase = 0;
      switchAt = time + 1700;
      const halfHit = (left: boolean): void => {
        const p = tk.player;
        const inHalf = left ? p.x < tk.W / 2 : p.x >= tk.W / 2;
        tk.scene.cameras.main.flash(160, 255, 240, 200);
        if (p.active && inHalf) tk.hitPlayer(24, p.x, p.y);
      };
      tk.schedule(1700, () => {
        halfHit(firstLeft);
        phase = 1;
        switchAt = tk.now + 1700;
      });
      tk.schedule(3400, () => {
        halfHit(!firstLeft);
        phase = 2;
      });
    },
    drawGround(g, time) {
      if (phase === 2) return;
      const left = phase === 0 ? firstLeft : !firstLeft;
      const t = Phaser.Math.Clamp(1 - (switchAt - time) / 1700, 0, 1);
      const x0 = left ? 0 : tk.W / 2;
      g.fillStyle(SUN, 0.08 + t * 0.22);
      g.fillRect(x0, 90, tk.W / 2, tk.H - 90);
      g.lineStyle(3, SUN_LIT, 0.4 + t * 0.5);
      g.lineBetween(tk.W / 2, 90, tk.W / 2, tk.H - 30);
      // Rays leaning out of the lit half.
      for (let i = 0; i < 4; i++) {
        const y = 140 + ((tk.H - 200) * i) / 3;
        g.lineStyle(1.5, SUN_LIT, 0.25 + t * 0.3);
        g.lineBetween(x0 + 20, y, x0 + tk.W / 2 - 20, y + (left ? 14 : -14));
      }
    },
    onPhaseEnd() { phase = 2; },
  };
};

// ── Signature: Prominence ────────────────────────────────────────────
// Solar arcs lob off the corona and come down across the player's ground —
// slow, high, and generous with the shadows they cast on the way.

const prominence = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3000,
  cast(time: number) {
    tk.sfx('explosion-large');
    for (let i = 0; i < 6; i++) {
      tk.schedule(i * 300, () => {
        const p = tk.player;
        tk.spawnZone({
          x: p.x + Phaser.Math.Between(-180, 180),
          y: p.y + Phaser.Math.Between(-140, 140),
          radius: 58, warnMs: 1500, damage: 17, fall: true,
          poolMs: 2400, poolDamage: 6,
        });
      });
    }
    void time;
  },
});

export const LIGHT_BOSS: WorldBossDef = {
  worldId: 'light',
  name: 'The Solar Court',
  title: 'Sovereign of the Bright',
  color: SUN,
  colorLit: SUN_LIT,
  colorDark: SUN_DARK,
  accent: CORONA,
  bodyR: 30,

  intro: ['Look up. That was your mistake. It is also the entire proceeding.'],
  banter: [
    'Shade is contraband in this court.',
    'The Voice lives in the dark. Objection sustained, permanently.',
    'You blink so much. Guilt, presumably.',
    'Every shadow you have ever cast was borrowed from me.',
  ],
  defeatLine: 'THE COURT IS ADJOURNED',

  phases: [
    {
      name: 'Morning Session',
      line: 'The court will come to order. The order is: burn.',
      hp: 440,
      cycle: [
        'sig:lookup', 'volley', 'sig:daybreak', 'lanes',
        'sig:prominence', 'stream', 'radial', 'homing',
      ],
      harass: ['h-lane', 'h-flak', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 65,
      holdDist: 290,
    },
    {
      name: 'High Noon',
      line: 'No shadows now. Nowhere to file them.',
      hp: 490,
      cycle: [
        'sig:daybreak', 'sig:lookup', 'quake', 'spiral',
        'sig:prominence', 'barrage', 'sweep', 'stream', 'lanes',
      ],
      harass: ['h-lane', 'h-flak', 'h-orbs', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 80,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE SUN HAS OPINIONS ABOUT YOU',
    extraPhase: {
      name: 'The Eclipse Verdict',
      line: 'For the sentencing, the court will now block out itself.',
      hp: 370,
      cycle: [
        'sig:lookup', 'sig:daybreak', 'sanctuary', 'sig:prominence',
        'quake', 'sweep', 'spiral', 'stream',
      ],
      harass: ['h-lane', 'h-orbs', 'h-flak', 'h-rune'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 95,
      holdDist: 240,
    },
  },

  signatures: {
    lookup: lookUp,
    daybreak,
    prominence,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x141004, 0.45);
    g.fillRect(0, 0, W, H);
    // Long courtroom benches, all facing the light; a sundial centre mark.
    for (let i = 0; i < 4; i++) {
      const y = H - 60 - i * 40;
      g.fillStyle(SUN_DARK, 0.7);
      g.fillRect(70 + i * 30, y, W - 140 - i * 60, 7);
    }
    const cx = W / 2;
    const cy = H * 0.52;
    g.lineStyle(1.5, SUN, 0.25);
    g.strokeCircle(cx, cy, 60);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      g.lineBetween(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
    }
    g.lineStyle(2, SUN, 0.3);
    g.lineBetween(cx, cy, cx + 24, cy - 30);
  },

  drawBody(g, s) {
    const t = s.t;
    // No shadow. Obviously.
    // Corona spikes, breathing; longer when enraged.
    const spikes = 12;
    for (let i = 0; i < spikes; i++) {
      const a = (Math.PI * 2 * i) / spikes + t / 3200;
      const len = (i % 2 === 0 ? 22 : 13) * (s.enraged ? 1.35 : 1) + Math.sin(t / 240 + i) * 3 + s.castGlow * 8;
      g.fillStyle(i % 2 === 0 ? CORONA : SUN, 0.8);
      g.fillTriangle(
        s.x + Math.cos(a - 0.12) * 30, s.y + Math.sin(a - 0.12) * 30,
        s.x + Math.cos(a + 0.12) * 30, s.y + Math.sin(a + 0.12) * 30,
        s.x + Math.cos(a) * (30 + len), s.y + Math.sin(a) * (30 + len),
      );
    }
    // Prominence loop: one arc of fire leaping off the limb.
    const loopA = t / 1800;
    g.lineStyle(2.5, CORONA, 0.7);
    g.beginPath();
    g.arc(s.x + Math.cos(loopA) * 30, s.y + Math.sin(loopA) * 30, 12, loopA - 1.2, loopA + 1.9, false);
    g.strokePath();

    // The disc: layered heat.
    g.fillStyle(SUN, 1);
    g.fillCircle(s.x, s.y, 30);
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(s.x - 3, s.y - 3, 24);
    g.fillStyle(SUN_LIT, 0.9);
    g.fillCircle(s.x - 5, s.y - 5, 14);
    // Sunspot face: two spots and a judicial line of a mouth.
    const ex = Math.cos(s.facing) * 5;
    const ey = Math.sin(s.facing) * 4;
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xcc3a10 : SUN_DARK;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.95);
      g.fillEllipse(s.x + side * 9 + ex, s.y - 4 + ey, 6, s.enraged ? 7 : 5);
    }
    g.lineStyle(2, SUN_DARK, 0.8);
    g.lineBetween(s.x - 6 + ex, s.y + 9 + ey, s.x + 6 + ex, s.y + 9 + ey);
    // Heat shimmer ring.
    g.lineStyle(1, SUN_LIT, 0.25 + Math.sin(t / 180) * 0.1);
    g.strokeCircle(s.x, s.y, 36 + Math.sin(t / 300) * 2);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(s.x, s.y, 44);
    }
  },
};
