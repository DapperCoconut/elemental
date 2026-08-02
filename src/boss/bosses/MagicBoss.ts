import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Archmage — Sovereign of the Archive Arcane. Magic world's boss: every
 * school, all at once, with the citations to prove it. Canon with the magic
 * challenge, 'The Archmage'.
 */

const ARCANE = 0x9944ff;
const ARCANE_LIT = 0xd8b8ff;
const ARCANE_DARK = 0x1c0a33;
const RUNE = 0x4ae8c8;

// School palettes, for the grimoires.
const FROST = 0x8ac8ff;
const FIRE = 0xff8a3a;
const STORM = 0xffe86a;

// ── Signature: The Grimoires ─────────────────────────────────────────
// Three orbiting spellbooks take their turns: frost rules a lane, fire calls
// a barrage, storm drops strikes. Three schools, one casting, full syllabus.

const theGrimoires = (tk: BossToolkit): SignatureMove => {
  let openBook = -1;
  let clearAt = 0;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('curse-cast');
      clearAt = time + 4200;
      // Frost: two crossed lanes through the player.
      tk.schedule(600, () => {
        openBook = 0;
        const p = tk.player;
        tk.spawnLane({ x: p.x, y: p.y, angle: 0, halfW: 20, warnMs: 850, damage: 15 });
        tk.spawnLane({ x: p.x, y: p.y, angle: Math.PI / 2, halfW: 20, warnMs: 850, damage: 15 });
      });
      // Fire: a tight barrage around them.
      tk.schedule(1900, () => {
        openBook = 1;
        const p = tk.player;
        for (let i = 0; i < 5; i++) {
          tk.spawnZone({
            x: p.x + Phaser.Math.Between(-120, 120),
            y: p.y + Phaser.Math.Between(-100, 100),
            radius: 50, warnMs: 800, damage: 15, fall: true,
            poolMs: 2200, poolDamage: 5,
          });
        }
      });
      // Storm: a fast fan from the book itself.
      tk.schedule(3200, () => {
        openBook = 2;
        const aim = tk.angleToPlayer();
        for (let i = 0; i < 9; i++) {
          const a = aim + (i - 4) * 0.14;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 40, y: tk.bossY + Math.sin(a) * 40,
            angle: a, speed: 300, damage: 10, color: STORM,
          });
        }
      });
      tk.schedule(4200, () => { openBook = -1; });
    },
    drawAir(g, time) {
      if (time >= clearAt) return;
      const colors = [FROST, FIRE, STORM];
      for (let i = 0; i < 3; i++) {
        const a = time / 1200 + (Math.PI * 2 * i) / 3;
        const bx = tk.bossX + Math.cos(a) * 52;
        const by = tk.bossY + Math.sin(a) * 42;
        const open = openBook === i;
        // A book: two covers, glowing pages when open.
        g.fillStyle(ARCANE_DARK, 1);
        g.fillRect(bx - 9, by - 6, 18, 12);
        g.fillStyle(open ? colors[i] : 0x3a2a55, open ? 0.9 : 0.8);
        g.fillRect(bx - 8, by - 5, 16, 10);
        g.lineStyle(1, colors[i], open ? 1 : 0.4);
        g.lineBetween(bx, by - 5, bx, by + 5);
        if (open) {
          g.fillStyle(colors[i], 0.3);
          g.fillCircle(bx, by, 14);
        }
      }
    },
    onPhaseEnd() { openBook = -1; clearAt = 0; },
  };
};

// ── Signature: The Rune Circle ───────────────────────────────────────
// A summoning circle inscribes itself under you: outer ring, inner ring,
// centre — each detonating in turn, outside-in. The dance is two hops.

const runeCircle = (tk: BossToolkit): SignatureMove => {
  let cx = 0;
  let cy = 0;
  let bornAt = 0;
  let active = false;
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('judgement');
      active = true;
      bornAt = time;
      const p = tk.player;
      cx = tk.clampX(p.x, 170);
      cy = tk.clampY(p.y, 160);
      // Outer band at 1.6s, inner band at 2.5s, centre at 3.4s.
      tk.schedule(1600, () => {
        const pl = tk.player;
        const d = Phaser.Math.Distance.Between(cx, cy, pl.x, pl.y);
        tk.boom(cx, cy, 160, ARCANE_LIT);
        if (pl.active && d > 100 && d < 165) tk.hitPlayer(18, pl.x, pl.y);
      });
      tk.schedule(2500, () => {
        const pl = tk.player;
        const d = Phaser.Math.Distance.Between(cx, cy, pl.x, pl.y);
        tk.boom(cx, cy, 100, ARCANE_LIT);
        if (pl.active && d > 40 && d < 100) tk.hitPlayer(18, pl.x, pl.y);
      });
      tk.schedule(3400, () => {
        active = false;
        tk.explode(cx, cy, 44, 22, RUNE);
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp((time - bornAt) / 1400, 0, 1);
      const spin = (time - bornAt) / 1300;
      // The circle inscribes itself: arcs sweep in as t grows.
      for (const [r, dir] of [[132, 1], [70, -1]] as const) {
        g.lineStyle(2.5, ARCANE_LIT, 0.35 + t * 0.4);
        g.beginPath();
        g.arc(cx, cy, r, spin * dir, spin * dir + Math.PI * 2 * t, false);
        g.strokePath();
        // Runes riding the band.
        const count = r > 100 ? 8 : 5;
        for (let i = 0; i < Math.floor(count * t); i++) {
          const a = spin * dir + (Math.PI * 2 * i) / count;
          const rx = cx + Math.cos(a) * r;
          const ry = cy + Math.sin(a) * r;
          g.lineStyle(1.2, RUNE, 0.8);
          g.lineBetween(rx - 3, ry - 3, rx + 3, ry + 3);
          g.lineBetween(rx + 3, ry - 3, rx - 1, ry + 1);
        }
      }
      g.lineStyle(1.5, RUNE, 0.5);
      g.strokeCircle(cx, cy, 44);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Hex ───────────────────────────────────────────────
// One fat, slow, patient bolt that follows you. It is not fast. It is not
// fair either — if it lands, your legs briefly forget several spells.

const theHex = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let hx = 0;
  let hy = 0;
  let dieAt = 0;
  return {
    durationMs: 1200,
    cast(time: number) {
      tk.sfx('ghost-wail');
      active = true;
      hx = tk.bossX;
      hy = tk.bossY;
      dieAt = time + 6500;
    },
    update(time: number, dt: number) {
      if (!active) return;
      if (time > dieAt) { active = false; return; }
      const p = tk.player;
      if (!p.active) return;
      const a = Math.atan2(p.y - hy, p.x - hx);
      hx += Math.cos(a) * 132 * dt;
      hy += Math.sin(a) * 132 * dt;
      if (Phaser.Math.Distance.Between(hx, hy, p.x, p.y) < 22) {
        active = false;
        tk.boom(hx, hy, 40, ARCANE);
        tk.hitPlayer(14, p.x, p.y);
        tk.slowPlayer(0.35, 1800);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const pulse = 1 + Math.sin(time / 110) * 0.15;
      g.fillStyle(ARCANE, 0.3);
      g.fillCircle(hx, hy, 20 * pulse);
      g.fillStyle(ARCANE_LIT, 0.95);
      g.fillCircle(hx, hy, 11);
      // The hex sigil turning inside it.
      const spin = time / 400;
      g.lineStyle(1.5, RUNE, 0.9);
      for (let i = 0; i < 3; i++) {
        const a = spin + (Math.PI * 2 * i) / 3;
        g.lineBetween(
          hx + Math.cos(a) * 7, hy + Math.sin(a) * 7,
          hx + Math.cos(a + 2.1) * 7, hy + Math.sin(a + 2.1) * 7,
        );
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const MAGIC_BOSS: WorldBossDef = {
  worldId: 'magic',
  name: 'The Archmage',
  title: 'Sovereign of the Archive Arcane',
  color: ARCANE,
  colorLit: ARCANE_LIT,
  colorDark: ARCANE_DARK,
  accent: RUNE,
  bodyR: 28,

  intro: ['Every school. All at once. Do keep notes — there will be an assessment.'],
  banter: [
    'Borrowed power is still power. I borrowed ALL of it. Renewals pending.',
    'The Voice cannot read. It eats libraries anyway. Barbarian.',
    'You cast from instinct. I cast from a nine-hundred-volume bibliography.',
    'That counterspell exists, you know. Aisle twelve. Too late now.',
  ],
  defeatLine: 'THE ARCHIVE CLOSES',

  phases: [
    {
      name: 'First Edition',
      line: 'Welcome to the Archive. Mind the syllabus — it bites.',
      hp: 450,
      cycle: [
        'sig:grimoires', 'volley', 'sig:circle', 'lanes',
        'sig:hex', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-orbs', 'h-rune', 'h-flak'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 55,
      holdDist: 290,
    },
    {
      name: 'The Restricted Section',
      line: 'These next spells are banned in eleven realms. We are in the twelfth.',
      hp: 500,
      cycle: [
        'sig:circle', 'sig:grimoires', 'quake', 'sig:hex',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 65,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'EVERY PAGE, READ ALOUD, AT ONCE',
    extraPhase: {
      name: 'The Unwritten Chapter',
      line: 'The last chapter has no words. I improvise it fresh for each guest.',
      hp: 380,
      cycle: [
        'sig:grimoires', 'sig:hex', 'sig:circle', 'sanctuary',
        'quake', 'spiral', 'sig:hex', 'stream',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 80,
      holdDist: 240,
    },
  },

  signatures: {
    grimoires: theGrimoires,
    circle: runeCircle,
    hex: theHex,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0614, 0.55);
    g.fillRect(0, 0, W, H);
    // Bookshelf silhouettes at the wings, drifting motes of torn pages.
    for (const side of [0, 1]) {
      const x0 = side === 0 ? 30 : W - 62;
      for (let shelf = 0; shelf < 4; shelf++) {
        const y = 130 + shelf * 110;
        g.fillStyle(0x1e1230, 0.9);
        g.fillRect(x0, y, 32, 80);
        for (let b = 0; b < 5; b++) {
          g.fillStyle([ARCANE, RUNE, 0x6a3aaa, 0x3a2a55, FIRE][b % 5], 0.35);
          g.fillRect(x0 + 3 + b * 5, y + 6 + (b % 2) * 3, 4, 68 - (b % 2) * 6);
        }
      }
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['magic-boss-arena']);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0xf2ead6, rnd.realInRange(0.06, 0.16));
      g.fillRect(rnd.integerInRange(100, W - 100), rnd.integerInRange(120, H - 60), 8, 10);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 44, 84, 15);

    // The robe: deep arcane, hem dissolving into drifting glyphs.
    g.fillStyle(ARCANE_DARK, 1);
    g.fillTriangle(s.x - 26, s.y + 42, s.x + 26, s.y + 42, s.x, s.y - 28);
    g.fillStyle(0x2e1450, 1);
    g.fillTriangle(s.x - 18, s.y + 38, s.x + 18, s.y + 38, s.x, s.y - 20);
    for (let i = 0; i < 3; i++) {
      const ph = ((t + i * 500) % 1500) / 1500;
      g.lineStyle(1.2, RUNE, (1 - ph) * 0.6);
      const gx = s.x - 14 + i * 14;
      const gy = s.y + 40 - ph * 24;
      g.lineBetween(gx - 3, gy, gx + 3, gy);
      g.lineBetween(gx, gy - 3, gx, gy + 3);
    }

    // The staff: taller than he is, orb burning with the cast.
    const dirX = Math.cos(s.facing);
    const sx = s.x + dirX * 24;
    g.lineStyle(3.5, 0x4a3018, 1);
    g.lineBetween(sx, s.y + 40, sx + dirX * 4, s.y - 52);
    g.lineStyle(2, ARCANE, 0.8);
    g.beginPath();
    g.arc(sx + dirX * 4, s.y - 58, 7, 0.6, Math.PI * 2 - 0.6, false);
    g.strokePath();
    g.fillStyle(s.castGlow > 0.2 ? RUNE : ARCANE_LIT, 0.6 + s.castGlow * 0.4);
    g.fillCircle(sx + dirX * 4, s.y - 58, 4 + s.castGlow * 2.5);

    // Off hand: an open palm with a page hovering over it.
    const px = s.x - dirX * 26;
    g.fillStyle(ARCANE_DARK, 1);
    g.fillCircle(px, s.y - 2, 6);
    g.fillStyle(0xf2ead6, 0.9);
    const flutter = Math.sin(t / 280) * 0.14;
    g.save();
    g.translateCanvas(px, s.y - 16 + Math.sin(t / 340) * 3);
    g.rotateCanvas(flutter);
    g.fillRect(-5, -7, 10, 14);
    g.restore();

    // The beard: a cascade of tiny stars.
    const hy0 = s.y - 32;
    for (let i = 0; i < 6; i++) {
      const bx = s.x - 6 + (i % 3) * 6;
      const by = hy0 + 12 + Math.floor(i / 3) * 7 + Math.sin(t / 420 + i) * 1.5;
      g.fillStyle(i % 2 === 0 ? ARCANE_LIT : 0xffffff, 0.8);
      g.fillCircle(bx, by, 1.6);
    }

    // Head + the hat: tall, bent at the tip, banded with runes.
    g.fillStyle(0xe8d6c8, 0.95);
    g.fillEllipse(s.x, hy0, 18, 16);
    const eye = s.hurt ? 0xffffff : s.enraged ? RUNE : ARCANE_DARK;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 4 + dirX * 2, hy0 - 1, 1.8);
    }
    g.fillStyle(ARCANE_DARK, 1);
    g.fillTriangle(s.x - 16, hy0 - 8, s.x + 16, hy0 - 8, s.x + 4, hy0 - 44);
    g.fillTriangle(s.x + 2, hy0 - 38, s.x + 6, hy0 - 44, s.x + 16, hy0 - 36);
    g.fillStyle(ARCANE, 1);
    g.fillRect(s.x - 15, hy0 - 12, 30, 4);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(RUNE, 0.7 + Math.sin(t / 300 + i * 2) * 0.3);
      g.fillCircle(s.x - 8 + i * 8, hy0 - 10, 1.4);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
