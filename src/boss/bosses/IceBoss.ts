import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Long Winter — Sovereign of the Frozen Court. Ice world's boss: a slow,
 * inevitable monarch whose whole kit is about taking your room to move.
 * Canon with the ice challenge, 'The Long Winter' ("Nothing thaws.").
 */

const ICE = 0x88ccff;
const ICE_LIT = 0xe8f6ff;
const ICE_DARK = 0x1c3a55;
const RIME = 0xbde8ff;

// ── Signature: The Glacier ───────────────────────────────────────────
// A wall of ice grinds across the hall — slower than the Leviathan's tide,
// but it leaves frozen ground behind it that stays slick and stinging.

const GLACIER_MS = 4200;
const GLACIER_HALF_W = 40;

const glacier = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let fromLeft = true;
  let startsAt = 0;
  let dealtAt = 0;
  return {
    durationMs: 1200 + GLACIER_MS,
    cast(time: number) {
      tk.sfx('shield-up');
      active = true;
      fromLeft = !fromLeft;
      startsAt = time + 1200;
      dealtAt = 0;
      // The frozen wake, laid down in stripes as the wall passes.
      for (let i = 0; i < 5; i++) {
        tk.schedule(1200 + (GLACIER_MS * (i + 0.5)) / 5, () => {
          const t = (i + 0.5) / 5;
          const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
          tk.spawnPool({ x, y: tk.H * 0.56, radius: 74, lifeMs: 5200, damage: 5, tickMs: 800 });
        });
      }
    },
    update(time: number) {
      if (!active) return;
      if (time > startsAt + GLACIER_MS) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / GLACIER_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      const p = tk.player;
      if (p.active && Math.abs(p.x - x) < GLACIER_HALF_W && time - dealtAt > 1200) {
        dealtAt = time;
        tk.hitPlayer(22, p.x, p.y);
        tk.slowPlayer(0.45, 1400);
        p.x = Phaser.Math.Clamp(p.x + (fromLeft ? 42 : -42), 44, tk.W - 44);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      if (time < startsAt) {
        const x = fromLeft ? 44 : tk.W - 44;
        g.lineStyle(5, ICE_LIT, 0.3 + ((time - (startsAt - 1200)) / 1200) * 0.5);
        g.lineBetween(x, 90, x, tk.H - 36);
        return;
      }
      const t = (time - startsAt) / GLACIER_MS;
      const x = fromLeft ? 40 + (tk.W - 80) * t : tk.W - 40 - (tk.W - 80) * t;
      g.fillStyle(ICE, 0.35);
      g.fillRect(x - GLACIER_HALF_W, 90, GLACIER_HALF_W * 2, tk.H - 126);
      // Jagged leading face.
      const lead = x + (fromLeft ? GLACIER_HALF_W : -GLACIER_HALF_W);
      for (let i = 0; i < 8; i++) {
        const y = 100 + ((tk.H - 150) * i) / 7;
        g.fillStyle(ICE_LIT, 0.85);
        g.fillTriangle(lead, y - 8, lead, y + 8, lead + (fromLeft ? 14 : -14), y);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Deep Freeze ───────────────────────────────────────────
// A circle closes on the player over two and a half seconds. Be outside it
// when it shuts, or be part of the exhibit for a while.

const FREEZE_MS = 2500;

const deepFreeze = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let closesAt = 0;
  return {
    durationMs: FREEZE_MS + 400,
    cast(time: number) {
      tk.sfx('curse-cast');
      active = true;
      cx = tk.player.x;
      cy = tk.player.y;
      closesAt = time + FREEZE_MS;
      tk.schedule(FREEZE_MS, () => {
        active = false;
        const p = tk.player;
        tk.boom(cx, cy, 96, ICE_LIT);
        if (p.active && Phaser.Math.Distance.Between(cx, cy, p.x, p.y) < 96) {
          tk.hitPlayer(20, p.x, p.y);
          tk.slowPlayer(0.18, 1500);
        }
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / FREEZE_MS, 0, 1);
      const r = 96 + (1 - t) * 150;
      g.lineStyle(3, ICE_LIT, 0.35 + t * 0.55);
      g.strokeCircle(cx, cy, r);
      g.lineStyle(1.5, RIME, 0.3);
      g.strokeCircle(cx, cy, 96);
      // Frost creeping inward from the rim.
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + t * 0.6;
        g.lineStyle(2, RIME, 0.4 + t * 0.3);
        g.lineBetween(
          cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          cx + Math.cos(a) * (r - 14 - t * 10), cy + Math.sin(a) * (r - 14 - t * 10),
        );
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Shatter ───────────────────────────────────────────
// Six icicles form around the crown, then launch one by one at the player —
// each with its own short tell. The rhythm is the read.

const theShatter = (tk: BossToolkit): SignatureMove => {
  interface Icicle { angle: number; launched: boolean }
  let icicles: Icicle[] = [];
  let bornAt = 0;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('screech');
      bornAt = time;
      icicles = Array.from({ length: 6 }, (_, i) => ({
        angle: (Math.PI * 2 * i) / 6, launched: false,
      }));
      for (let i = 0; i < 6; i++) {
        tk.schedule(800 + i * 380, () => {
          const ic = icicles[i];
          if (!ic) return;
          ic.launched = true;
          const a = tk.angleToPlayer();
          tk.spawnBullet({
            x: tk.bossX + Math.cos(ic.angle + tk.now / 900) * 44,
            y: tk.bossY + Math.sin(ic.angle + tk.now / 900) * 44,
            angle: a, speed: 330, damage: 13, r: 6, color: ICE_LIT, lifeMs: 3200,
          });
        });
      }
      tk.schedule(3400, () => { icicles = []; });
    },
    drawAir(g, time) {
      if (icicles.length === 0) return;
      const spin = time / 900;
      for (const ic of icicles) {
        if (ic.launched) continue;
        const x = tk.bossX + Math.cos(ic.angle + spin) * 44;
        const y = tk.bossY + Math.sin(ic.angle + spin) * 44;
        const grow = Math.min(1, (time - bornAt) / 700);
        g.fillStyle(ICE_LIT, 0.9);
        g.fillTriangle(x - 4 * grow, y - 6 * grow, x + 4 * grow, y - 6 * grow, x, y + 9 * grow);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(x - 1, y - 3, 1.5 * grow);
      }
    },
    onPhaseEnd() { icicles = []; },
  };
};

export const ICE_BOSS: WorldBossDef = {
  worldId: 'ice',
  name: 'The Long Winter',
  title: 'Sovereign of the Frozen Court',
  color: ICE,
  colorLit: ICE_LIT,
  colorDark: ICE_DARK,
  accent: RIME,
  bodyR: 28,

  intro: ['Nothing thaws. Nothing ever needed to.'],
  banter: [
    'Haste is a summer habit. You will grow out of it.',
    'The Voice offered me an ending. I offered it a very long wait.',
    'Every snowflake is unique. Every frostbite is identical.',
    'Stand still. It is easier, and the outcome is the same.',
  ],
  defeatLine: 'THE THAW BEGINS',

  phases: [
    {
      name: 'First Frost',
      line: 'The cold gets in eventually. I am eventually.',
      hp: 420,
      cycle: [
        'volley', 'sig:glacier', 'sig:freeze', 'lanes',
        'sig:shatter', 'slamchain', 'radial', 'minefield',
      ],
      harass: ['h-snipe', 'h-flak', 'h-rune'],
      restMs: 1100,
      harassMs: 3300,
      moveSpeed: 40,
      holdDist: 280,
    },
    {
      name: 'The Deep Cold',
      line: 'This is the winter the other winters tell stories about.',
      hp: 460,
      cycle: [
        'sig:freeze', 'quake', 'sig:glacier', 'homing',
        'sig:shatter', 'barrage', 'spiral', 'stream', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-rune', 'h-snipe'],
      restMs: 940,
      harassMs: 2800,
      moveSpeed: 55,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'THE COURT FROZE STANDING',
    extraPhase: {
      name: 'Absolute Zero',
      line: 'Below a certain temperature, even the Voice stops whispering.',
      hp: 350,
      cycle: [
        'sig:glacier', 'sig:freeze', 'sanctuary', 'sig:shatter',
        'quake', 'spiral', 'sig:freeze', 'homing',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 740,
      harassMs: 2300,
      moveSpeed: 70,
      holdDist: 230,
    },
  },

  signatures: {
    glacier,
    freeze: deepFreeze,
    shatter: theShatter,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x061018, 0.5);
    g.fillRect(0, 0, W, H);
    // Frozen floor sheen + drift banks at the rim.
    g.fillStyle(ICE, 0.05);
    g.fillEllipse(W / 2, H * 0.6, W * 0.8, H * 0.5);
    for (let i = 0; i < 8; i++) {
      const x = 50 + ((W - 100) * i) / 7;
      g.fillStyle(ICE_LIT, 0.14);
      g.fillEllipse(x, H - 34, 70, 18);
      g.fillEllipse(((i * 131) % W), 104, 50, 12);
    }
    // Long cracks in the sheet.
    g.lineStyle(1.5, RIME, 0.2);
    g.lineBetween(W * 0.2, H * 0.4, W * 0.45, H * 0.7);
    g.lineBetween(W * 0.45, H * 0.7, W * 0.6, H * 0.55);
    g.lineBetween(W * 0.7, H * 0.35, W * 0.62, H * 0.75);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 48, 90, 16);

    // The robe: a long angular sweep of ice, widening to the floor.
    g.fillStyle(ICE_DARK, 1);
    g.fillTriangle(s.x - 34, s.y + 46, s.x + 34, s.y + 46, s.x, s.y - 34);
    g.fillStyle(ICE, 0.85);
    g.fillTriangle(s.x - 24, s.y + 44, s.x + 24, s.y + 44, s.x, s.y - 26);
    // Facet lines.
    g.lineStyle(1.5, ICE_LIT, 0.5);
    g.lineBetween(s.x - 12, s.y + 40, s.x - 2, s.y - 10);
    g.lineBetween(s.x + 14, s.y + 42, s.x + 4, s.y - 4);

    // Arms: sleeves ending in claw-shards, tracking the player.
    for (const side of [-1, 1]) {
      const aa = s.facing + side * 0.8;
      const hx = s.x + Math.cos(aa) * (40 + s.castGlow * 8);
      const hy = s.y + 2 + Math.sin(aa) * 26;
      g.fillStyle(ICE_DARK, 1);
      g.fillTriangle(s.x + side * 12, s.y - 10, hx - 6, hy + 6, hx + 6, hy - 6);
      g.fillStyle(ICE_LIT, 0.9);
      for (let f = 0; f < 3; f++) {
        const fa = aa + (f - 1) * 0.3;
        g.fillTriangle(
          hx - 3, hy - 3, hx + 3, hy + 3,
          hx + Math.cos(fa) * (11 + s.castGlow * 5), hy + Math.sin(fa) * (11 + s.castGlow * 5),
        );
      }
    }

    // Head: a hooded hollow with cold light inside.
    const hy0 = s.y - 40;
    g.fillStyle(ICE_DARK, 1);
    g.fillEllipse(s.x, hy0, 30, 26);
    g.fillStyle(0x08141f, 1);
    g.fillEllipse(s.x, hy0 + 2, 22, 18);
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xa8d8ff : ICE_LIT;
    const ex = Math.cos(s.facing) * 3;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillEllipse(s.x + side * 6 + ex, hy0 + 1, 4.5, s.enraged ? 7 : 5);
    }
    // Breath mist, drifting.
    const mist = (t % 1400) / 1400;
    g.fillStyle(RIME, (1 - mist) * 0.35);
    g.fillCircle(s.x + ex * 3, hy0 + 12 + mist * 18, 5 + mist * 6);

    // The crown: five clear spires.
    for (let i = 0; i < 5; i++) {
      const px = s.x - 16 + i * 8;
      const ph = 12 + (i === 2 ? 8 : (i % 2) * 4);
      g.fillStyle(ICE_LIT, 0.9);
      g.fillTriangle(px - 3, hy0 - 12, px + 3, hy0 - 12, px, hy0 - 12 - ph);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(px, hy0 - 12 - ph + 3, 1.2);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
