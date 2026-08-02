import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Leviathan — Sovereign of the Drowned Court. Water world's boss.
 * A sea-serpent that never stops swimming: tides that cross the whole hall,
 * a wandering whirlpool, and a ring of spouts that closes like a jaw.
 */

const SEA = 0x1e6ed8;
const SEA_LIT = 0x7ab8ff;
const SEA_DARK = 0x0a2a55;
const FOAM = 0x9adfe8;

// ── Signature: Tidal Wall ────────────────────────────────────────────
// A wall of sea sweeps the arena, alternating sides. It hits once and shoves;
// the tell is a bright edge, and it travels slower than a sprint — cross it
// early or ride ahead of it, never race it to the far wall.

const WAVE_MS = 2900;
const WAVE_HALF_W = 44;
const WAVE_DAMAGE = 24;

const tidalWall = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let fromLeft = true;
  let startsAt = 0;
  let endsAt = 0;
  let dealtAt = 0;
  return {
    durationMs: 1000 + WAVE_MS,
    cast(time: number) {
      tk.sfx('judgement');
      active = true;
      fromLeft = !fromLeft;
      startsAt = time + 1000;
      endsAt = startsAt + WAVE_MS;
      dealtAt = 0;
    },
    update(time: number) {
      if (!active) return;
      if (time > endsAt) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / WAVE_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      const p = tk.player;
      if (p.active && Math.abs(p.x - x) < WAVE_HALF_W && time - dealtAt > 1100) {
        dealtAt = time;
        tk.hitPlayer(WAVE_DAMAGE, p.x, p.y);
        p.x = Phaser.Math.Clamp(p.x + (fromLeft ? 46 : -46), 44, tk.W - 44);
        tk.slowPlayer(0.7, 900);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      if (time < startsAt) {
        const x = fromLeft ? 44 : tk.W - 44;
        g.lineStyle(4, SEA_LIT, 0.3 + ((time - (startsAt - 1000)) / 1000) * 0.55);
        g.lineBetween(x, 90, x, tk.H - 36);
        return;
      }
      const t = (time - startsAt) / WAVE_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      g.fillStyle(SEA, 0.4);
      g.fillRect(x - WAVE_HALF_W, 90, WAVE_HALF_W * 2, tk.H - 126);
      g.lineStyle(3, FOAM, 0.9);
      g.lineBetween(x + (fromLeft ? WAVE_HALF_W : -WAVE_HALF_W), 90, x + (fromLeft ? WAVE_HALF_W : -WAVE_HALF_W), tk.H - 36);
      // Foam curl along the leading edge.
      for (let i = 0; i < 9; i++) {
        const y = 110 + ((tk.H - 160) * i) / 8 + Math.sin(time / 120 + i * 2) * 6;
        g.fillStyle(FOAM, 0.8);
        g.fillCircle(x + (fromLeft ? WAVE_HALF_W : -WAVE_HALF_W), y, 4 + (i % 3));
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Whirlpool ─────────────────────────────────────────
// A vortex wanders the floor for eight seconds, dragging gently the whole
// while (well under walk speed) and biting anything that touches the eye.

const POOL_LIFE_MS = 8000;
const POOL_R = 120;
const EYE_R = 34;
const EYE_DAMAGE = 14;

const whirlpool = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let lastBiteAt = 0;
  return {
    durationMs: 1200,
    cast(time: number) {
      tk.sfx('black-hole');
      active = true;
      bornAt = time;
      x = tk.clampX(tk.player.x + Phaser.Math.Between(-120, 120), 120);
      y = tk.clampY(tk.player.y + Phaser.Math.Between(-90, 90), 120);
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a) * 46;
      vy = Math.sin(a) * 46;
      lastBiteAt = 0;
    },
    update(time: number, dt: number) {
      if (!active) return;
      if (time > bornAt + POOL_LIFE_MS) { active = false; return; }
      x += vx * dt;
      y += vy * dt;
      if (x < 120 || x > tk.W - 120) vx *= -1;
      if (y < 150 || y > tk.H - 110) vy *= -1;
      tk.pull(x, y, 88, 120);
      const p = tk.player;
      if (p.active && Phaser.Math.Distance.Between(x, y, p.x, p.y) < EYE_R && time - lastBiteAt > 600) {
        lastBiteAt = time;
        tk.hitPlayer(EYE_DAMAGE, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      for (let ring = 0; ring < 4; ring++) {
        const ph = ((time / 900 + ring / 4) % 1);
        const r = POOL_R * (1 - ph);
        g.lineStyle(2.5, ring % 2 === 0 ? SEA_LIT : SEA, 0.5 * ph + 0.15);
        g.beginPath();
        g.arc(x, y, r, time / 300 + ring, time / 300 + ring + Math.PI * 1.6, false);
        g.strokePath();
      }
      g.fillStyle(SEA_DARK, 0.85);
      g.fillCircle(x, y, EYE_R);
      g.lineStyle(2, FOAM, 0.8);
      g.strokeCircle(x, y, EYE_R);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Closing Maw ───────────────────────────────────────
// Spouts erupt in a ring around the player, then the ring shrinks twice —
// each collapse leaves a wider gap than the spout spacing, so the escape is
// always there, just never where it was last time.

const closingMaw = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3600,
  cast(time: number) {
    tk.sfx('roar');
    const p = tk.player;
    const cx = tk.clampX(p.x, 150);
    const cy = tk.clampY(p.y, 150);
    const gapAt = Math.random() * Math.PI * 2;
    for (let wave = 0; wave < 3; wave++) {
      const r = 190 - wave * 55;
      const count = 8 - wave;
      const gap = gapAt + wave * 0.9;
      tk.schedule(400 + wave * 950, () => {
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + gap + 0.55; // hole left at `gap`
          if (Math.abs(Phaser.Math.Angle.Wrap(a - gap)) < 0.62) continue;
          tk.spawnZone({
            x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
            radius: 46, warnMs: 850, damage: 18, fall: true,
          });
        }
      });
    }
    void time;
  },
});

// ── The def ──────────────────────────────────────────────────────────

export const WATER_BOSS: WorldBossDef = {
  worldId: 'water',
  name: 'The Leviathan',
  title: 'Sovereign of the Drowned Court',
  color: SEA,
  colorLit: SEA_LIT,
  colorDark: SEA_DARK,
  accent: FOAM,
  bodyR: 30,
  damageMult: 0.9,

  intro: ['The deep has been waiting a long time. It is done waiting.'],
  banter: [
    'Every court drowns eventually. Mine simply started there.',
    'The tide is not angry. The tide is thorough.',
    'The Voice asked for the sea. I am negotiating.',
    'You swim like a landlord.',
  ],
  defeatLine: 'THE TIDE WITHDRAWS',

  phases: [
    {
      name: 'The Rising Tide',
      line: 'Shore is a rumour now. Swim.',
      hp: 400,
      cycle: [
        'volley', 'sig:tide', 'homing', 'lanes',
        'sig:pool', 'barrage', 'radial', 'slamchain',
      ],
      harass: ['h-snipe', 'h-flak', 'h-orbs'],
      restMs: 1100,
      harassMs: 3200,
      moveSpeed: 55,
      holdDist: 270,
    },
    {
      name: 'The Deep Breaks',
      line: 'You have seen the surface of me. Regret the rest.',
      hp: 460,
      cycle: [
        'sig:maw', 'quake', 'sig:tide', 'spiral',
        'stream', 'sig:pool', 'radial', 'homing', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-rune', 'h-snipe'],
      restMs: 950,
      harassMs: 2800,
      moveSpeed: 75,
      holdDist: 240,
    },
  ],

  hard: {
    introLine: 'THE COURT NEVER SURFACED',
    extraPhase: {
      name: 'The Drowned Court',
      line: 'Everyone who ever sank is on my side of this.',
      hp: 340,
      cycle: [
        'sig:tide', 'sig:maw', 'summon', 'spiral',
        'sig:pool', 'sanctuary', 'quake', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 740,
      harassMs: 2300,
      moveSpeed: 95,
      holdDist: 220,
    },
  },

  signatures: {
    tide: tidalWall,
    pool: whirlpool,
    maw: closingMaw,
  },

  drawArena(g, W, H) {
    // A flooded hall: waterline scum along the walls, sunken tiles.
    g.fillStyle(0x03101f, 0.45);
    g.fillRect(0, 0, W, H);
    g.lineStyle(2, SEA, 0.25);
    for (let i = 0; i < 3; i++) {
      const y = 120 + i * 26;
      g.beginPath();
      for (let x = 0; x <= W; x += 40) {
        const wy = y + Math.sin(x * 0.03 + i * 2) * 6;
        if (x === 0) g.moveTo(x, wy);
        else g.lineTo(x, wy);
      }
      g.strokePath();
    }
    for (let i = 0; i < 10; i++) {
      const x = (W / 10) * i + 30;
      g.fillStyle(SEA_DARK, 0.4);
      g.fillEllipse(x, H - 40 - (i % 3) * 60, 40, 12);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // The serpent: a head at (x, y) with a body coiling behind it along a
    // living sine, always facing the player.
    const dirX = Math.cos(s.facing);
    const dirY = Math.sin(s.facing);
    // Ground shadow under the coil.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x - dirX * 30, s.y + 44, 120, 16);

    // Body segments, tail-first so the head draws on top.
    for (let i = 7; i >= 1; i--) {
      const back = i * 26;
      const sway = Math.sin(t / 260 - i * 0.9) * (10 + i * 2);
      const bx = s.x - dirX * back - dirY * sway;
      const by = s.y - dirY * back + dirX * sway * 0.6 + Math.sin(t / 300 + i) * 3;
      const r = 20 - i * 1.7;
      g.fillStyle(i % 2 === 0 ? SEA : SEA_DARK, 1);
      g.fillCircle(bx, by, r);
      g.fillStyle(SEA_LIT, 0.35);
      g.fillCircle(bx, by - r * 0.4, r * 0.5);
      // Dorsal fin ridge.
      if (i % 2 === 1 && i < 6) {
        g.fillStyle(FOAM, 0.8);
        g.fillTriangle(bx - 4, by - r, bx + 4, by - r, bx, by - r - 9 - Math.sin(t / 200 + i) * 2);
      }
    }

    // Head.
    g.fillStyle(SEA_DARK, 1);
    g.fillEllipse(s.x, s.y, 44, 34);
    g.fillStyle(SEA, 1);
    g.fillEllipse(s.x + dirX * 4, s.y + dirY * 4 - 3, 34, 24);
    // Jaw — opens with cast glow.
    const jaw = 4 + s.castGlow * 10;
    g.fillStyle(SEA_DARK, 1);
    g.fillTriangle(
      s.x + dirX * 16, s.y + dirY * 16,
      s.x + dirX * 30 - dirY * 6, s.y + dirY * 30 + dirX * 6 + jaw,
      s.x + dirX * 30 + dirY * 6, s.y + dirY * 30 - dirX * 6 + jaw,
    );
    if (s.castGlow > 0.3) {
      g.fillStyle(FOAM, (s.castGlow - 0.3) * 0.9);
      g.fillCircle(s.x + dirX * 24, s.y + dirY * 24, 6);
    }
    // Fins swept back off the skull.
    for (const side of [-1, 1]) {
      g.fillStyle(SEA, 0.9);
      g.fillTriangle(
        s.x - dirY * side * 14, s.y + dirX * side * 10,
        s.x - dirX * 18 - dirY * side * 30, s.y - dirY * 14 + dirX * side * 22,
        s.x - dirX * 26 - dirY * side * 12, s.y - dirY * 20 + dirX * side * 9,
      );
    }
    // Eyes — hot foam-white, red-tinged when enraged.
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffb0a0 : FOAM;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillEllipse(s.x + dirX * 8 - dirY * side * 9, s.y + dirY * 8 + dirX * side * 7, 6, 4.5);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(s.x, s.y, 46);
    }
  },
};
