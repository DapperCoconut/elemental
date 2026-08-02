import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Puppetmaster — Sovereign of the Hush. Silence world's boss: it hangs in
 * the rafters and works the strings, including — briefly, horribly — yours.
 * Canon with the silence challenge, 'The Puppetmaster' ("Your hands were
 * never yours.").
 */

const HUSH = 0x6a4a8a;
const HUSH_LIT = 0xcbb8e8;
const HUSH_DARK = 0x120a1c;
const STRING = 0xd84a6a;

// ── Signature: The Strings ───────────────────────────────────────────
// Four strings drop around you and draw taut — a shrinking square cage. The
// walls land in sequence; the door is whichever string has not tightened yet.

const theStrings = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('tentacle');
    const p = tk.player;
    const cx = tk.clampX(p.x, 150);
    const cy = tk.clampY(p.y, 160);
    const half = 110;
    const walls: { x: number; y: number; angle: number }[] = [
      { x: cx, y: cy - half, angle: 0 },
      { x: cx + half, y: cy, angle: Math.PI / 2 },
      { x: cx, y: cy + half, angle: 0 },
      { x: cx - half, y: cy, angle: Math.PI / 2 },
    ];
    Phaser.Utils.Array.Shuffle(walls).forEach((w, i) => {
      tk.schedule(400 + i * 520, () => {
        tk.spawnLane({ x: w.x, y: w.y, angle: w.angle, halfW: 16, warnMs: 700, damage: 15 });
      });
    });
    // And the puppet drop in the middle, once the cage has had its say.
    tk.schedule(2700, () => {
      tk.spawnZone({ x: cx, y: cy, radius: 84, warnMs: 600, damage: 18 });
    });
    void time;
  },
});

// ── Signature: The Understudy ────────────────────────────────────────
// A marionette effigy drops in and mirrors your every step, reflected through
// the Puppetmaster. It cannot be hurt. It can hurt. Six seconds of sharing
// the stage with yourself.

const PUPPET_MS = 6000;

const theUnderstudy = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  let px = 0;
  let py = 0;
  let lastHitAt = 0;
  return {
    durationMs: 1600,
    cast(time: number) {
      tk.sfx('ghost-wail');
      activeUntil = time + PUPPET_MS;
      lastHitAt = 0;
      tk.host.showFloatingText(tk.W / 2, 150, '🎭 THE UNDERSTUDY KNOWS YOUR PART', `#${HUSH_LIT.toString(16)}`);
    },
    update(time: number) {
      if (time >= activeUntil) return;
      const p = tk.player;
      if (!p.active) return;
      // The mirror: your position reflected through the Sovereign.
      px = Phaser.Math.Clamp(tk.bossX * 2 - p.x, 44, tk.W - 44);
      py = Phaser.Math.Clamp(tk.bossY * 2 - p.y, 96, tk.H - 44);
      if (Phaser.Math.Distance.Between(px, py, p.x, p.y) < 34 && time - lastHitAt > 900) {
        lastHitAt = time;
        tk.hitPlayer(16, p.x, p.y);
        tk.boom(px, py, 24, STRING);
      }
    },
    drawAir(g, time) {
      if (time >= activeUntil) return;
      // Its strings, up into the dark.
      for (const off of [-8, 0, 8]) {
        g.lineStyle(1, STRING, 0.5);
        g.lineBetween(px + off, py - 20, px + off * 2, 90);
      }
      // A jointed wooden double: crossbar, body, limp limbs.
      g.lineStyle(2.5, 0x8a6a4a, 1);
      g.lineBetween(px - 12, 96, px + 12, 96);
      g.fillStyle(0xb08a5a, 1);
      g.fillEllipse(px, py - 12, 12, 14); // head
      g.fillRoundedRect(px - 7, py - 4, 14, 18, 4); // torso
      for (const side of [-1, 1]) {
        const sway = Math.sin(time / 160 + side) * 4;
        g.lineStyle(2.5, 0xb08a5a, 1);
        g.lineBetween(px + side * 6, py, px + side * 12 + sway, py + 12);
        g.lineBetween(px + side * 4, py + 14, px + side * 8 - sway, py + 26);
      }
      // The painted face: your face, badly.
      g.fillStyle(HUSH_DARK, 1);
      g.fillCircle(px - 3, py - 13, 1.4);
      g.fillCircle(px + 3, py - 13, 1.4);
      g.lineStyle(1, STRING, 0.9);
      g.lineBetween(px - 3, py - 8, px + 3, py - 8);
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

// ── Signature: The Hush ──────────────────────────────────────────────
// A circle of perfect quiet drifts after you, dimming everything inside it
// and slowing your hands. When it finally closes its mouth — be elsewhere.

const HUSH_MS = 3600;

const theHush = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let snapsAt = 0;
  return {
    durationMs: HUSH_MS + 400,
    cast(time: number) {
      tk.sfx('dark-drain');
      active = true;
      cx = tk.player.x;
      cy = tk.player.y;
      snapsAt = time + HUSH_MS;
      tk.schedule(HUSH_MS, () => {
        active = false;
        const p = tk.player;
        tk.boom(cx, cy, 120, HUSH_LIT);
        if (p.active && Phaser.Math.Distance.Between(cx, cy, p.x, p.y) < 120) {
          tk.hitPlayer(24, p.x, p.y);
          tk.slowPlayer(0.4, 1200);
        }
      });
    },
    update(time: number, dt: number) {
      if (!active) return;
      const p = tk.player;
      if (!p.active) return;
      // The quiet follows at 145 px/s — escapable, never ignorable.
      const a = Math.atan2(p.y - cy, p.x - cx);
      const d = Math.min(Phaser.Math.Distance.Between(cx, cy, p.x, p.y), 145 * dt);
      cx += Math.cos(a) * d;
      cy += Math.sin(a) * d;
      if (Phaser.Math.Distance.Between(cx, cy, p.x, p.y) < 120) tk.slowPlayer(0.75, 120);
      void time;
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (snapsAt - time) / HUSH_MS, 0, 1);
      g.fillStyle(HUSH_DARK, 0.25 + t * 0.3);
      g.fillCircle(cx, cy, 120);
      g.lineStyle(2, HUSH_LIT, 0.3 + t * 0.5);
      g.strokeCircle(cx, cy, 120);
      // Sound dying at the rim: little cancelled notes.
      for (let i = 0; i < 5; i++) {
        const a = time / 700 + (Math.PI * 2 * i) / 5;
        const nx = cx + Math.cos(a) * 120;
        const ny = cy + Math.sin(a) * 120;
        g.lineStyle(1.5, HUSH_LIT, 0.5);
        g.lineBetween(nx - 4, ny - 4, nx + 4, ny + 4);
        g.lineBetween(nx - 4, ny + 4, nx + 4, ny - 4);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const SILENCE_BOSS: WorldBossDef = {
  worldId: 'silence',
  name: 'The Puppetmaster',
  title: 'Sovereign of the Hush',
  color: HUSH,
  colorLit: HUSH_LIT,
  colorDark: HUSH_DARK,
  accent: STRING,
  bodyR: 28,

  intro: ['Your hands were never yours. Watch them agree with me.'],
  banter: [
    '. . .',
    'The Voice talks and talks and talks. I find that... amateurish.',
    'Every fighter is a puppet. The good ones never check the wrists.',
    'Applause is forbidden here. Fortunately, so is screaming.',
  ],
  defeatLine: 'THE STRINGS GO SLACK',

  phases: [
    {
      name: 'The Rafters',
      line: 'The stage is set. It was set before you were cast.',
      hp: 450,
      cycle: [
        'sig:strings', 'volley', 'sig:understudy', 'lanes',
        'sig:hush', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 55,
      holdDist: 290,
    },
    {
      name: 'The Second Act',
      line: 'You have been off-script since the fire world. I kept your cues anyway.',
      hp: 500,
      cycle: [
        'sig:understudy', 'sig:strings', 'quake', 'sig:hush',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 70,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE WHOLE THEATRE IS STRINGS',
    extraPhase: {
      name: 'The Final Bow',
      line: 'Every show closes. This one closes on you.',
      hp: 380,
      cycle: [
        'sig:hush', 'sig:understudy', 'sig:strings', 'sanctuary',
        'quake', 'spiral', 'sig:hush', 'homing',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 85,
      holdDist: 240,
    },
  },

  signatures: {
    strings: theStrings,
    understudy: theUnderstudy,
    hush: theHush,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x060310, 0.6);
    g.fillRect(0, 0, W, H);
    // A stage: boards, footlights (dead), a proscenium of hanging strings.
    g.lineStyle(1, 0x241a30, 0.8);
    for (let x = 60; x < W - 40; x += 52) g.lineBetween(x, H * 0.4, x - 20, H - 30);
    for (let i = 0; i < 7; i++) {
      const x = 70 + ((W - 140) * i) / 6;
      g.fillStyle(HUSH_DARK, 1);
      g.fillEllipse(x, H - 24, 16, 7);
      g.fillStyle(i === 3 ? HUSH_LIT : 0x2a1e3a, i === 3 ? 0.4 : 0.8);
      g.fillCircle(x, H - 26, 2.5);
    }
    for (let i = 0; i < 9; i++) {
      const x = 50 + ((W - 100) * i) / 8;
      g.lineStyle(1, STRING, 0.14);
      g.lineBetween(x, 96, x + ((i * 13) % 10) - 5, 96 + 30 + ((i * 29) % 40));
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // Strings up into the dark — it is held, or it is holding. Unclear. Fine.
    for (const off of [-14, 0, 14]) {
      g.lineStyle(1, STRING, 0.45);
      g.lineBetween(s.x + off, s.y - 40, s.x + off * 2.5, 90);
    }

    // The crossbar it works from, tilting with intent.
    const tilt = Math.cos(s.facing) * 0.15 + Math.sin(t / 900) * 0.05;
    g.save();
    g.translateCanvas(s.x, s.y - 52);
    g.rotateCanvas(tilt);
    g.lineStyle(3.5, 0x4a3a2a, 1);
    g.lineBetween(-26, 0, 26, 0);
    g.lineBetween(0, -10, 0, 10);
    g.restore();

    // The hooded body: narrow, hanging, sleeves far too long.
    g.fillStyle(HUSH_DARK, 1);
    g.fillEllipse(s.x, s.y - 6, 34, 52);
    g.fillStyle(0x1c1228, 1);
    g.fillEllipse(s.x, s.y - 8, 26, 42);
    // The long fingers: four working strings each, always moving.
    const dirX = Math.cos(s.facing);
    for (const side of [-1, 1]) {
      const hx = s.x + side * 26 + dirX * 4;
      const hy = s.y + 4 + Math.sin(t / 380 + side) * 4;
      g.fillStyle(HUSH_DARK, 1);
      g.fillEllipse(hx, hy, 10, 8);
      for (let f = 0; f < 4; f++) {
        const fa = Math.PI / 2 + (f - 1.5) * 0.28 + Math.sin(t / 220 + f + side) * 0.12;
        g.lineStyle(1.5, HUSH_LIT, 0.85);
        g.lineBetween(hx, hy, hx + Math.cos(fa) * 14, hy + Math.sin(fa) * 14);
        // Working strings falling from the fingertips.
        g.lineStyle(0.8, STRING, 0.4 + s.castGlow * 0.4);
        g.lineBetween(
          hx + Math.cos(fa) * 14, hy + Math.sin(fa) * 14,
          hx + Math.cos(fa) * 14 + side * 4, hy + 44 + Math.sin(t / 300 + f) * 6,
        );
      }
    }

    // The mask: white, serene, wrong.
    const hy0 = s.y - 30;
    g.fillStyle(0xe8e2d8, 0.95);
    g.fillEllipse(s.x + dirX * 2, hy0, 20, 24);
    const eye = s.hurt ? 0xffffff : s.enraged ? STRING : HUSH_DARK;
    for (const side of [-1, 1]) {
      // Painted-on eyes: closed arcs, unless it is angry, in which case open.
      if (s.enraged || s.hurt) {
        g.fillStyle(eye, 1);
        g.fillEllipse(s.x + side * 5 + dirX * 2, hy0 - 2, 4, 5);
      } else {
        g.lineStyle(1.2, HUSH_DARK, 0.9);
        g.beginPath();
        g.arc(s.x + side * 5 + dirX * 2, hy0 - 2, 3, 0.3, Math.PI - 0.3, false);
        g.strokePath();
      }
    }
    // No mouth. Obviously.
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
