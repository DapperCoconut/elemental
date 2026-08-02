import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Devouring Board — Sovereign of Gluttony, which met the Voice and
 * recognised a colleague. Canon with the gluttony challenge, 'The Devouring
 * Board' ("A feast is only a war you eat.").
 *
 * The only Sovereign that eats its way back up the health bar, so its fight
 * has an economy: plates land, and whoever gets there first keeps them. The
 * arena itself is on the menu — the board shrinks, course by course.
 */

const MEAT = 0xd8452f;
const MEAT_LIT = 0xffb07a;
const MEAT_DARK = 0x2a0d08;
const CHINA = 0xf0d9a8;

// ── Signature: The Feast ─────────────────────────────────────────────
// Five plates are served. The Board eats one every second and a half and
// takes health back for each. Standing on a plate is how you deny it.

const theFeast = (tk: BossToolkit): SignatureMove => {
  interface Plate { x: number; y: number; eaten: boolean }
  let plates: Plate[] = [];
  let tongue: { x: number; y: number; until: number } | null = null;
  return {
    durationMs: 2000,
    cast(time: number) {
      tk.sfx('bloom');
      plates = [];
      const p = tk.player;
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.6;
        plates.push({
          x: tk.clampX(p.x + Math.cos(a) * Phaser.Math.Between(150, 300), 70),
          y: tk.clampY(p.y + Math.sin(a) * Phaser.Math.Between(130, 250), 130),
          eaten: false,
        });
      }
      tk.host.showFloatingText(tk.bossX, tk.bossY - 60, 'SERVED', '#ffb07a');
      // Course by course. Slow enough that a runner beats it to two or three.
      for (let k = 0; k < 5; k++) {
        tk.schedule(1100 + k * 1500, () => {
          const next = plates.find((pl) => !pl.eaten);
          if (!next) return;
          next.eaten = true;
          tongue = { x: next.x, y: next.y, until: tk.now + 320 };
          tk.sfx('slime-splat');
          tk.healBoss(14);
          tk.explode(next.x, next.y, 54, 12, MEAT_LIT);
        });
      }
      void time;
    },
    update(time: number) {
      const p = tk.player;
      if (p.active) {
        for (const pl of plates) {
          if (pl.eaten) continue;
          if (Phaser.Math.Distance.Between(pl.x, pl.y, p.x, p.y) < 30) {
            pl.eaten = true;
            p.heal(6);
            tk.host.showFloatingText(pl.x, pl.y - 20, 'DENIED +6', '#8affa0');
            tk.sfx('heal');
          }
        }
      }
      if (tongue && time > tongue.until) tongue = null;
    },
    drawGround(g, time) {
      for (const pl of plates) {
        if (pl.eaten) continue;
        const pulse = Math.sin(time / 240 + pl.x) * 0.1;
        g.fillStyle(CHINA, 0.85);
        g.fillEllipse(pl.x, pl.y, 44, 30);
        g.lineStyle(2, MEAT, 0.5);
        g.strokeEllipse(pl.x, pl.y, 44, 30);
        g.strokeEllipse(pl.x, pl.y, 30, 20);
        // Something on it. Best not to look closely.
        g.fillStyle(MEAT, 0.8 + pulse);
        g.fillEllipse(pl.x, pl.y - 2, 20, 13);
        g.fillStyle(MEAT_DARK, 0.5);
        g.fillEllipse(pl.x - 4, pl.y - 4, 8, 5);
        // Steam, so an uneaten plate reads as fresh and worth running for.
        for (let i = 0; i < 2; i++) {
          const ph = ((time + i * 500) % 1200) / 1200;
          g.fillStyle(0xffffff, (1 - ph) * 0.16);
          g.fillCircle(pl.x + Math.sin(time / 260 + i) * 5, pl.y - 12 - ph * 18, 2 + ph * 3);
        }
      }
    },
    drawAir(g) {
      if (!tongue) return;
      // The reach: a tongue out of the body to whatever it just took.
      const a = Math.atan2(tongue.y - tk.bossY, tongue.x - tk.bossX);
      const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, tongue.x, tongue.y);
      g.fillStyle(0xff6a8a, 0.9);
      for (let i = 0; i <= 10; i++) {
        const t2 = i / 10;
        g.fillCircle(
          tk.bossX + Math.cos(a) * d * t2,
          tk.bossY + Math.sin(a) * d * t2 + Math.sin(t2 * Math.PI) * 12,
          9 - t2 * 4,
        );
      }
    },
    onPhaseEnd() { plates = []; tongue = null; },
  };
};

// ── Signature: The Maw ───────────────────────────────────────────────
// It opens, and the room leans in. Teeth close as a ring while the pull is on;
// the pull is 120 px/s against your 200, so it is a walk out, not a prayer.

const theMaw = (tk: BossToolkit): SignatureMove => {
  let openUntil = 0;
  let bitesAt = 0;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('roar');
      openUntil = time + 2600;
      bitesAt = time + 2600;
      tk.pull(tk.bossX, tk.bossY, 120, 2500);
      // The teeth, closing inward on the boss.
      tk.spawnRing({
        cx: tk.bossX, cy: tk.bossY, delayMs: 300, speed: -150,
        gapCentre: tk.angleToPlayer() + Math.PI, gapHalf: 0.6,
        band: 26, damage: 18, startRadius: 400,
      });
      tk.schedule(2600, () => {
        tk.sfx('explosion-medium');
        tk.explode(tk.bossX, tk.bossY, 150, 42, MEAT);
        tk.scene.cameras.main.shake(320, 0.006);
        // Anything it swallowed, it grows on.
        const p = tk.player;
        if (Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y) <= 150) tk.healBoss(20);
      });
    },
    drawGround(g, time) {
      if (time > openUntil + 200) return;
      const t = Phaser.Math.Clamp(1 - (bitesAt - time) / 2600, 0, 1);
      // The bite radius, shown from the first frame.
      g.fillStyle(MEAT_DARK, 0.2 + t * 0.35);
      g.fillCircle(tk.bossX, tk.bossY, 150);
      g.lineStyle(3, MEAT_LIT, 0.4 + t * 0.5);
      g.strokeCircle(tk.bossX, tk.bossY, 150);
      // The gullet, opening.
      g.fillStyle(0x1a0604, 0.6 + t * 0.35);
      g.fillEllipse(tk.bossX, tk.bossY, 110 * (0.4 + t * 0.6), 90 * (0.4 + t * 0.6));
      // Teeth around the rim, growing in as it opens.
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16 + time / 2000;
        const r = 150;
        const len = 14 + t * 12;
        g.fillStyle(CHINA, 0.75 + t * 0.25);
        g.fillTriangle(
          tk.bossX + Math.cos(a - 0.08) * r, tk.bossY + Math.sin(a - 0.08) * r,
          tk.bossX + Math.cos(a + 0.08) * r, tk.bossY + Math.sin(a + 0.08) * r,
          tk.bossX + Math.cos(a) * (r - len), tk.bossY + Math.sin(a) * (r - len),
        );
      }
    },
    onPhaseEnd() { openUntil = 0; },
  };
};

// ── Signature: The Courses ───────────────────────────────────────────
// It eats the board. Three bites are taken out of the floor and do not come
// back this phase — the hall gets smaller every time this move goes off.

const theCourses = (tk: BossToolkit): SignatureMove => {
  interface Bite { x: number; y: number; r: number; bornAt: number; lastTick: number }
  let bites: Bite[] = [];
  return {
    durationMs: 2600,
    cast(time: number) {
      tk.sfx('burrow');
      const p = tk.player;
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 700, () => {
          const a = Math.random() * Math.PI * 2;
          // Bitten well clear of where the player stands when the bite lands.
          const cur = tk.player;
          const x = tk.clampX(cur.x + Math.cos(a) * Phaser.Math.Between(230, 360), 90);
          const y = tk.clampY(cur.y + Math.sin(a) * Phaser.Math.Between(200, 320), 150);
          tk.sfx('slash');
          tk.explode(x, y, 92, 20, MEAT_DARK);
          bites.push({ x, y, r: 92, bornAt: tk.now, lastTick: 0 });
        });
      }
      void time;
      void p;
    },
    update(time: number) {
      const p = tk.player;
      for (const b of bites) {
        if (!p.active || time - b.lastTick < 600) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) < b.r) {
          b.lastTick = time;
          tk.hitPlayer(9, p.x, p.y);
          tk.slowPlayer(0.72, 700);
        }
      }
    },
    drawGround(g, time) {
      for (const b of bites) {
        const grow = Phaser.Math.Clamp((time - b.bornAt) / 400, 0, 1);
        const r = b.r * grow;
        // A hole where the floor was, with a scalloped bitten edge.
        g.fillStyle(0x000000, 0.62);
        g.fillCircle(b.x, b.y, r);
        g.lineStyle(3, MEAT_DARK, 0.9);
        g.strokeCircle(b.x, b.y, r);
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12;
          g.fillStyle(MEAT, 0.5);
          g.fillCircle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 8);
        }
        // Something moving down there.
        const eye = Math.sin(time / 400 + b.x) > 0.7;
        if (eye) {
          g.fillStyle(MEAT_LIT, 0.4);
          g.fillCircle(b.x + Math.sin(time / 700) * 10, b.y + Math.cos(time / 900) * 8, 4);
        }
      }
    },
    onPhaseEnd() { bites = []; },
  };
};

export const GLUTTONY_BOSS: WorldBossDef = {
  worldId: 'gluttony',
  name: 'The Devouring Board',
  title: 'Sovereign of Gluttony, Which Set Two Places',
  color: MEAT,
  colorLit: MEAT_LIT,
  colorDark: MEAT_DARK,
  accent: CHINA,
  bodyR: 35,

  intro: ['A feast is only a war you eat. Sit down. You are early, and you are also the starter.'],
  banter: [
    'The thing beneath asked to share. I said: bring your OWN realm.',
    'Take a plate. Go on. It costs me something when you do — that is the joke.',
    'They exiled me for hunger. Every single one of them ate on the way home.',
    'I have swallowed four courses of floor and I am still discussing the menu.',
  ],
  defeatLine: 'THE BOARD IS CLEARED',

  phases: [
    {
      name: 'The First Course',
      line: 'Plates are down. Whoever reaches one keeps it. I am rarely outrun. RARELY.',
      hp: 480,
      cycle: [
        'sig:feast', 'volley', 'sig:maw', 'hazard',
        'sig:courses', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-rune', 'h-snipe'],
      restMs: 1060,
      harassMs: 3100,
      moveSpeed: 42,
      holdDist: 290,
    },
    {
      name: 'The Table Itself',
      line: 'The plates were manners. I am done with manners. I am eating the ROOM.',
      hp: 540,
      cycle: [
        'sig:maw', 'sig:feast', 'barrage', 'sig:courses',
        'spiral', 'summon', 'quake', 'hazard', 'lanes',
      ],
      harass: ['h-flak', 'h-rune', 'h-mines', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 54,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE BOARD HAS ORDERED EVERYTHING',
    extraPhase: {
      name: 'Second Helpings',
      line: 'The thing beneath the worlds is a PICKY EATER. I am not. Come here.',
      hp: 430,
      cycle: [
        'sig:maw', 'sig:courses', 'sig:feast', 'sanctuary',
        'sig:maw', 'spiral', 'barrage', 'summon',
      ],
      harass: ['h-rune', 'h-flak', 'h-mines', 'h-orbs'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 64,
      holdDist: 245,
    },
  },

  signatures: {
    feast: theFeast,
    maw: theMaw,
    courses: theCourses,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x160705, 0.55);
    g.fillRect(0, 0, W, H);
    // A banquet hall gone wrong: a table the length of the room, a cloth that
    // is not entirely cloth, and cutlery big enough to be architecture.
    g.fillStyle(0x3a1a10, 0.8);
    g.fillRect(60, 150, W - 120, H - 250);
    g.fillStyle(0x8a6a4a, 0.25);
    g.fillRect(70, 160, W - 140, H - 270);
    for (let i = 0; i < 8; i++) {
      const x = 90 + i * ((W - 180) / 7);
      g.fillStyle(CHINA, 0.07);
      g.fillEllipse(x, 200, 48, 30);
      g.fillEllipse(x, H - 130, 48, 30);
    }
    // Cutlery, laid for something enormous.
    for (const side of [0, 1]) {
      const x = side === 0 ? 36 : W - 36;
      g.fillStyle(0xb8b2a4, 0.2);
      g.fillRect(x - 4, 130, 8, H - 200);
      if (side === 0) {
        for (let i = 0; i < 4; i++) g.fillRect(x - 12 + i * 6, 110, 4, 34);
      } else {
        g.fillEllipse(x, 126, 16, 34);
      }
    }
    // Grease on the floor, catching the light.
    for (let i = 0; i < 14; i++) {
      g.fillStyle(MEAT_LIT, 0.05);
      g.fillEllipse(80 + ((i * 137) % (W - 160)), 180 + ((i * 211) % (H - 300)), 30, 16);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(s.x, s.y + 52, 120, 20);

    const dirX = Math.cos(s.facing);
    // It is chewing. It is always chewing.
    const chew = Math.abs(Math.sin(t / 220)) * 6;
    const bulge = Math.sin(t / 700) * 3;

    // The body: a mound under a tablecloth that has given up being a cloth.
    g.fillStyle(MEAT_DARK, 1);
    g.fillEllipse(s.x, s.y + 12, 100 + bulge, 82 + bulge);
    g.fillStyle(MEAT, 1);
    g.fillEllipse(s.x, s.y + 14, 88 + bulge, 72 + bulge);
    // Cloth folds, and the stains that outrank them.
    g.fillStyle(CHINA, 0.16);
    g.fillEllipse(s.x, s.y + 34, 92, 40);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(MEAT_DARK, 0.3);
      g.fillEllipse(s.x - 34 + i * 17, s.y + 40 + Math.sin(i) * 5, 12, 7);
    }
    // The bib. Somebody tied it on optimistically, long ago.
    g.fillStyle(CHINA, 0.8);
    g.fillTriangle(s.x - 22, s.y - 16, s.x + 22, s.y - 16, s.x, s.y + 26);
    g.fillStyle(MEAT_DARK, 0.35);
    g.fillEllipse(s.x, s.y + 8, 22, 12);

    // The mouth: most of the front of it, hinged too far back.
    const my = s.y - 6;
    g.fillStyle(0x1a0604, 1);
    g.fillEllipse(s.x + dirX * 4, my + chew * 0.5, 66, 26 + chew * 2.2 + s.castGlow * 10);
    // Teeth, upper and lower, none of them matching.
    for (let i = 0; i < 9; i++) {
      const tx = s.x - 30 + i * 7.5 + dirX * 4;
      const h = 7 + ((i * 5) % 4);
      g.fillStyle(CHINA, 0.95);
      g.fillTriangle(tx - 3, my - 13 + chew * 0.5, tx + 3, my - 13 + chew * 0.5, tx, my - 13 + h + chew * 0.5);
      g.fillTriangle(tx - 3, my + 13 + chew * 1.7, tx + 3, my + 13 + chew * 1.7, tx, my + 13 - h + chew * 1.7);
    }
    // Tongue, restless.
    g.fillStyle(0xff6a8a, 0.9);
    g.fillEllipse(s.x + dirX * 8 + Math.sin(t / 300) * 6, my + 6 + chew, 30, 9);

    // Cutlery hands — a fork and a knife, held wrong, used constantly.
    const lift = s.castGlow * 14;
    const fx = s.x - dirX * 58;
    g.fillStyle(0xd8cfc0, 1);
    g.fillRect(fx - 3, s.y - 26 - lift, 6, 46);
    for (let i = 0; i < 4; i++) g.fillRect(fx - 9 + i * 5, s.y - 46 - lift, 3, 22);
    const kx = s.x + dirX * 58;
    g.fillStyle(0xd8cfc0, 1);
    g.fillRect(kx - 3, s.y - 20 - lift, 6, 40);
    g.fillTriangle(kx - 8, s.y - 20 - lift, kx + 8, s.y - 24 - lift, kx, s.y - 54 - lift);
    g.fillStyle(MEAT_LIT, 0.5);
    g.fillCircle(kx + 2, s.y - 46 - lift, 2);

    // Eyes: several, small, none of them on the same schedule.
    const eyes: [number, number, number][] = [[-38, -34, 6], [-16, -44, 5], [14, -42, 5], [36, -30, 6]];
    for (const [ox, oy, r] of eyes) {
      const blink = Math.sin(t / 500 + ox) > 0.92 ? 0.2 : 1;
      g.fillStyle(CHINA, 0.9 * blink);
      g.fillCircle(s.x + ox + dirX * 2, s.y + oy, r);
      g.fillStyle(s.hurt ? 0xffffff : MEAT_DARK, blink);
      g.fillCircle(s.x + ox + dirX * 4, s.y + oy, r * 0.5);
    }
    if (s.enraged) {
      // It has started drooling on the schedule rather than off it.
      for (let i = 0; i < 4; i++) {
        const ph = ((t + i * 380) % 1500) / 1500;
        g.fillStyle(MEAT_LIT, (1 - ph) * 0.3);
        g.fillCircle(s.x - 24 + i * 16 + dirX * 4, my + 20 + ph * 40, 3 - ph);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 68);
    }
  },
};
