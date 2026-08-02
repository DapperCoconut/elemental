import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Dealer — Sovereign of the Table. Fate world's boss: the house, in
 * person. Canon with the fate challenge, 'The Dealer' ("The house does not
 * lose. It merely waits.").
 */

const FELT = 0x2a8a66;
const FELT_LIT = 0xd8fff0;
const FELT_DARK = 0x0c332a;
const GOLD = 0xffd27a;

// ── Signature: The Deal ──────────────────────────────────────────────
// Three giant cards land face-down around the player. On the flip, two erupt
// and one pays out a heal. The Dealer never says which — but the cards
// tremble, and the good one holds still.

const theDeal = (tk: BossToolkit): SignatureMove => {
  interface Card { x: number; y: number; good: boolean; flipsAt: number }
  let cards: Card[] = [];
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('curse-cast');
      const p = tk.player;
      const goodIdx = Math.floor(Math.random() * 3);
      const rot = Math.random() * Math.PI * 2;
      cards = [0, 1, 2].map((i) => ({
        x: tk.clampX(p.x + Math.cos(rot + (Math.PI * 2 * i) / 3) * 150, 90),
        y: tk.clampY(p.y + Math.sin(rot + (Math.PI * 2 * i) / 3) * 130, 130),
        good: i === goodIdx,
        flipsAt: time + 2200,
      }));
      tk.schedule(2200, () => {
        for (const c of cards) {
          if (c.good) {
            tk.spawnHealOrb(c.x, c.y, 12, 5000);
            tk.boom(c.x, c.y, 24, GOLD);
          } else {
            tk.explode(c.x, c.y, 88, 20, FELT_LIT);
          }
        }
        tk.schedule(300, () => { cards = []; });
      });
    },
    drawGround(g, time) {
      for (const c of cards) {
        if (time >= c.flipsAt) continue;
        // The tell: bad cards tremble.
        const shake = c.good ? 0 : Math.sin(time / 45 + c.x) * 1.6;
        g.fillStyle(FELT_DARK, 0.95);
        g.fillRoundedRect(c.x - 20 + shake, c.y - 28, 40, 56, 5);
        g.lineStyle(2, GOLD, 0.8);
        g.strokeRoundedRect(c.x - 20 + shake, c.y - 28, 40, 56, 5);
        // Card back filigree.
        g.lineStyle(1, GOLD, 0.4);
        g.strokeRoundedRect(c.x - 14 + shake, c.y - 22, 28, 44, 3);
        g.fillStyle(GOLD, 0.6);
        g.fillCircle(c.x + shake, c.y, 4);
      }
    },
    onPhaseEnd() { cards = []; },
  };
};

// ── Signature: The Wheel ─────────────────────────────────────────────
// A roulette of five wedges spins up around the player, then fires the odd
// wedges, then the even ones. The rotation is slow and visible — count your
// pocket and step between rounds.

const theWheel = (tk: BossToolkit): SignatureMove => {
  let cx = 0;
  let cy = 0;
  let bornAt = 0;
  let active = false;
  let rot = 0;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('black-hole');
      active = true;
      bornAt = time;
      const p = tk.player;
      cx = tk.clampX(p.x, 170);
      cy = tk.clampY(p.y, 160);
      rot = Math.random() * Math.PI * 2;
      for (const wave of [0, 1]) {
        tk.schedule(1600 + wave * 1100, () => {
          for (let i = wave; i < 5; i += 2) {
            const a = rot + (Math.PI * 2 * i) / 5 + Math.PI / 5;
            tk.spawnZone({
              x: cx + Math.cos(a) * 105, y: cy + Math.sin(a) * 105,
              radius: 62, warnMs: 620, damage: 16,
            });
          }
        });
      }
      tk.schedule(4200, () => { active = false; });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = (time - bornAt) / 1000;
      const spin = rot + t * 0.35;
      g.lineStyle(2, GOLD, 0.55);
      g.strokeCircle(cx, cy, 168);
      g.strokeCircle(cx, cy, 44);
      for (let i = 0; i < 5; i++) {
        const a = spin + (Math.PI * 2 * i) / 5;
        g.lineStyle(1.5, FELT_LIT, 0.4);
        g.lineBetween(
          cx + Math.cos(a) * 44, cy + Math.sin(a) * 44,
          cx + Math.cos(a) * 168, cy + Math.sin(a) * 168,
        );
      }
      // The ball, circling the rim opposite the spin.
      const ba = -spin * 2.4;
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(cx + Math.cos(ba) * 150, cy + Math.sin(ba) * 150, 5);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: All In ────────────────────────────────────────────────
// The whole hand, thrown — a fan of cards that flies past you, hangs for a
// beat, and comes back through. The return path is the same path. Remember it.

const allIn = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2800,
  cast(time: number) {
    tk.sfx('screech');
    const aim = tk.angleToPlayer();
    for (let i = 0; i < 7; i++) {
      const a = aim + (i - 3) * 0.16;
      tk.spawnBullet({
        x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
        angle: a, speed: 300, damage: 10, color: FELT_LIT, lifeMs: 1400,
      });
      // The return leg: same fan, fired back inward from where the cards died.
      const fx = tk.bossX + Math.cos(a) * 440;
      const fy = tk.bossY + Math.sin(a) * 440;
      tk.schedule(1800, () => {
        tk.spawnBullet({
          x: Phaser.Math.Clamp(fx, 30, tk.W - 30),
          y: Phaser.Math.Clamp(fy, 96, tk.H - 30),
          angle: a + Math.PI, speed: 300, damage: 10, color: GOLD, lifeMs: 1700,
        });
      });
    }
    void time;
  },
});

export const FATE_BOSS: WorldBossDef = {
  worldId: 'fate',
  name: 'The Dealer',
  title: 'Sovereign of the Table',
  color: FELT,
  colorLit: FELT_LIT,
  colorDark: FELT_DARK,
  accent: GOLD,
  bodyR: 28,

  intro: ['The house does not lose. It merely waits. Take a seat — the wait is over.'],
  banter: [
    'Your luck is not bad. It is collateral.',
    'The Voice bet the realms and lost them to me first. It is still paying.',
    'Card players call it a tell. I call it your entire personality.',
    'The odds are posted. Nobody reads the odds.',
  ],
  defeatLine: 'THE HOUSE FOLDS',

  phases: [
    {
      name: 'The Table',
      line: 'Ante up. You already did — you walked in.',
      hp: 440,
      cycle: [
        'sig:deal', 'volley', 'sig:wheel', 'lanes',
        'sig:allin', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-rune', 'h-orbs'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 60,
      holdDist: 290,
    },
    {
      name: 'The House Edge',
      line: 'This is the part of the night where the table starts winning.',
      hp: 490,
      cycle: [
        'sig:wheel', 'sig:allin', 'quake', 'sig:deal',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-rune', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 70,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE HOUSE HAS STOPPED WAITING',
    extraPhase: {
      name: 'Double Or Nothing',
      line: 'One last hand. Table stakes: everything either of us has ever been.',
      hp: 370,
      cycle: [
        'sig:deal', 'sig:wheel', 'sig:allin', 'sanctuary',
        'quake', 'spiral', 'sig:allin', 'homing',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 85,
      holdDist: 240,
    },
  },

  signatures: {
    deal: theDeal,
    wheel: theWheel,
    allin: allIn,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x061410, 0.55);
    g.fillRect(0, 0, W, H);
    // The great felt oval, chip stacks at the rim.
    g.lineStyle(3, GOLD, 0.25);
    g.strokeEllipse(W / 2, H * 0.56, W * 0.78, H * 0.62);
    g.lineStyle(1, FELT_LIT, 0.12);
    g.strokeEllipse(W / 2, H * 0.56, W * 0.7, H * 0.54);
    const rnd = new Phaser.Math.RandomDataGenerator(['fate-boss-arena']);
    for (let i = 0; i < 6; i++) {
      const x = 80 + ((W - 160) * i) / 5;
      const y = i % 2 === 0 ? H - 44 : 116;
      for (let c = 0; c < rnd.integerInRange(2, 4); c++) {
        g.fillStyle(rnd.pick([0xcc3a4a, 0x3a6acc, GOLD]), 0.5);
        g.fillEllipse(x, y - c * 4, 18, 6);
      }
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 44, 84, 15);

    // The tailcoat: sharp shoulders, tapering to nothing — the house has no legs.
    g.fillStyle(FELT_DARK, 1);
    g.fillTriangle(s.x - 30, s.y - 16, s.x + 30, s.y - 16, s.x, s.y + 42);
    g.fillStyle(0x114438, 1);
    g.fillTriangle(s.x - 22, s.y - 14, s.x + 22, s.y - 14, s.x, s.y + 32);
    // Shirt front and bowtie.
    g.fillStyle(0xf2ead6, 0.95);
    g.fillTriangle(s.x - 7, s.y - 14, s.x + 7, s.y - 14, s.x, s.y + 6);
    g.fillStyle(0xcc3a4a, 1);
    g.fillTriangle(s.x - 6, s.y - 15, s.x, s.y - 12, s.x - 1, s.y - 18);
    g.fillTriangle(s.x + 6, s.y - 15, s.x, s.y - 12, s.x + 1, s.y - 18);

    // The fan of cards, held out toward the player. Spreads with cast glow.
    const dirX = Math.cos(s.facing);
    const hx = s.x + dirX * 34;
    const hy = s.y + 2;
    const spread = 0.28 + s.castGlow * 0.3;
    for (let i = 0; i < 5; i++) {
      const a = s.facing + (i - 2) * spread;
      g.save();
      g.translateCanvas(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10);
      g.rotateCanvas(a + Math.PI / 2);
      g.fillStyle(0xf2ead6, 0.95);
      g.fillRoundedRect(-6, -18, 12, 22, 2);
      g.lineStyle(1, FELT_DARK, 0.8);
      g.strokeRoundedRect(-6, -18, 12, 22, 2);
      if (i === 2) {
        g.fillStyle(0xcc3a4a, 0.9);
        g.fillCircle(0, -8, 2.5);
      }
      g.restore();
    }
    // Other hand: a chip, flipped and caught on a loop.
    const flip = (t % 1300) / 1300;
    const chipY = s.y - 2 - Math.sin(flip * Math.PI) * 22;
    g.fillStyle(GOLD, 0.95);
    g.fillEllipse(s.x - dirX * 30, chipY, 11, 11 * Math.abs(Math.cos(flip * Math.PI * 2)) + 2);

    // Head: green visor over a face that is mostly smile.
    const hy0 = s.y - 32;
    g.fillStyle(0x1c1410, 1);
    g.fillEllipse(s.x, hy0, 26, 24);
    g.fillStyle(FELT, 0.9);
    g.fillEllipse(s.x, hy0 - 8, 28, 10); // visor
    g.lineStyle(1, FELT_LIT, 0.5);
    g.strokeEllipse(s.x, hy0 - 8, 28, 10);
    const eye = s.hurt ? 0xffffff : s.enraged ? GOLD : FELT_LIT;
    const ex = dirX * 3;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 6 + ex, hy0 - 1, 2.4);
    }
    // The smile: wider when enraged. The house is having a lovely night.
    g.lineStyle(1.5, FELT_LIT, 0.9);
    g.beginPath();
    g.arc(s.x + ex, hy0 + 4, s.enraged ? 8 : 6, 0.25, Math.PI - 0.25, false);
    g.strokePath();
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
