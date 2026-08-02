import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Broker of Ruin — Sovereign of Fortune, which wagered that the realm
 * would fall and then collected. Canon with the fortune challenge, 'The Broker
 * of Ruin' ("The house always wins. I bought the house.").
 *
 * A fight with an economy in it: the jackpot ring pays out to whoever is
 * standing in it, the coin toss tells you which move is coming while it is
 * still in the air, and the house takes its cut off the edges of the room.
 */

const COIN = 0xd8a531;
const COIN_LIT = 0xffe08a;
const COIN_DARK = 0x2a1c06;
const FELT = 0x1a4a32;

// ── Signature: The Jackpot ───────────────────────────────────────────
// A paying ring wanders the floor. Whoever is inside when it rings, collects.
// It is the only heal in the fight and it is contested.

const jackpot = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let paysAt = 0;
  const R = 92;
  return {
    durationMs: 2200,
    cast(time: number) {
      tk.sfx('dice');
      active = true;
      const a = Math.random() * Math.PI * 2;
      x = tk.clampX(tk.W / 2 + Math.cos(a) * 200, 120);
      y = tk.clampY(tk.H / 2 + Math.sin(a) * 150, 170);
      const dir = Math.random() * Math.PI * 2;
      vx = Math.cos(dir) * 110;
      vy = Math.sin(dir) * 110;
      paysAt = time + 3800;
      tk.host.showFloatingText(x, y - R - 14, 'JACKPOT', '#ffe08a');
      tk.schedule(3800, () => {
        active = false;
        tk.sfx('jackpot');
        const p = tk.player;
        const playerIn = p.active && Phaser.Math.Distance.Between(x, y, p.x, p.y) < R;
        const bossIn = Phaser.Math.Distance.Between(x, y, tk.bossX, tk.bossY) < R;
        tk.boom(x, y, R, COIN_LIT);
        if (playerIn) {
          p.heal(26);
          tk.host.showFloatingText(p.x, p.y - 40, 'PAID OUT +26', '#8affa0');
        } else if (bossIn) {
          tk.healBoss(26);
        } else {
          // Unclaimed money does not simply sit there. It goes to the house.
          tk.healBoss(12);
          tk.host.showFloatingText(x, y - 20, 'HOUSE TAKES IT', '#ffe08a');
        }
      });
    },
    update(time: number, dt: number) {
      if (!active) return;
      x += vx * dt;
      y += vy * dt;
      if (x < 120 || x > tk.W - 120) vx = -vx;
      if (y < 170 || y > tk.H - 90) vy = -vy;
      x = tk.clampX(x, 120);
      y = tk.clampY(y, 170);
      void time;
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (paysAt - time) / 3800, 0, 1);
      g.fillStyle(COIN, 0.07 + t * 0.14);
      g.fillCircle(x, y, R);
      g.lineStyle(3, COIN_LIT, 0.4 + t * 0.5);
      g.strokeCircle(x, y, R);
      // A payout dial closing round the rim.
      g.lineStyle(6, COIN_LIT, 0.7);
      g.beginPath();
      g.arc(x, y, R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t, false);
      g.strokePath();
      // Coins tumbling inside it.
      for (let i = 0; i < 7; i++) {
        const a = time / 500 + i;
        const rr = (R - 20) * (0.3 + ((i * 13) % 7) / 10);
        g.fillStyle(COIN_LIT, 0.55);
        g.fillEllipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8, 9, 6);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Double or Nothing ─────────────────────────────────────
// It tosses a coin and the coin decides what happens to you. It spins in the
// air long enough to be read, and it lands face up for a full second first.

const doubleOrNothing = (tk: BossToolkit): SignatureMove => {
  let tossAt = 0;
  let landsAt = 0;
  let heads = false;
  return {
    durationMs: 4200,
    cast(time: number) {
      tk.sfx('money');
      tossAt = time;
      landsAt = time + 1800;
      heads = Math.random() < 0.5;
      tk.schedule(1800, () => {
        tk.sfx(heads ? 'anvil' : 'card-shuffle');
        tk.host.showFloatingText(tk.bossX, tk.bossY - 70, heads ? 'HEADS' : 'TAILS', '#ffe08a');
      });
      tk.schedule(2900, () => {
        if (heads) {
          // Heads: one enormous stake, on the longest fuse in the realm.
          tk.spawnZone({
            x: tk.player.x, y: tk.player.y, radius: 190, warnMs: 1500, damage: 55,
          });
        } else {
          // Tails: the small money — lots of it, spaced to walk through.
          for (let k = 0; k < 5; k++) {
            tk.schedule(k * 220, () => {
              const aim = tk.angleToPlayer();
              for (let i = -3; i <= 3; i++) {
                tk.spawnBullet({
                  x: tk.bossX, y: tk.bossY, angle: aim + i * 0.21,
                  speed: 250, damage: 8, r: 6, color: COIN,
                });
              }
            });
          }
        }
      });
    },
    drawAir(g, time) {
      if (time > landsAt + 1400) return;
      const flying = time < landsAt;
      const t = Phaser.Math.Clamp((time - tossAt) / 1800, 0, 1);
      const cx = tk.bossX;
      const cy = tk.bossY - (flying ? Math.sin(t * Math.PI) * 150 + 40 : 44);
      // The coin, edge-on as it spins, face-on once it has decided.
      const spin = flying ? Math.abs(Math.cos(time / 70)) : 1;
      g.fillStyle(COIN, 0.95);
      g.fillEllipse(cx, cy, 34 * spin + 4, 34);
      g.lineStyle(2, COIN_LIT, 0.9);
      g.strokeEllipse(cx, cy, 34 * spin + 4, 34);
      if (spin > 0.7) {
        // The face: a crown for heads, a broken tower for tails.
        g.fillStyle(COIN_DARK, 0.8);
        if (heads || flying) {
          g.fillRect(cx - 9, cy - 2, 18, 5);
          for (let i = 0; i < 3; i++) g.fillTriangle(cx - 9 + i * 8, cy - 2, cx - 3 + i * 8, cy - 2, cx - 6 + i * 8, cy - 12);
        } else {
          g.fillTriangle(cx - 8, cy + 10, cx + 8, cy + 10, cx + 2, cy - 12);
        }
      }
      if (!flying) {
        g.lineStyle(3, heads ? 0xff6a4a : COIN_LIT, 0.5 + Math.sin(time / 100) * 0.3);
        g.strokeCircle(cx, cy, 26);
      }
    },
    onPhaseEnd() { landsAt = 0; },
  };
};

// ── Signature: The House Edge ────────────────────────────────────────
// The house takes its cut off the outside of the room, in three steps, and
// gives none of it back until the move is done.

const houseEdge = (tk: BossToolkit): SignatureMove => {
  let inset = 0;
  let target = 0;
  let until = 0;
  let lastTick = 0;
  return {
    durationMs: 4600,
    cast(time: number) {
      tk.sfx('ui-purchase');
      inset = 0;
      target = 0;
      until = time + 5200;
      for (let k = 1; k <= 3; k++) {
        tk.schedule(k * 1100, () => {
          target = k * 62;
          tk.sfx('money');
          tk.host.showFloatingText(tk.W / 2, 130, `THE HOUSE TAKES ${k * 12}%`, '#ffe08a');
        });
      }
      tk.schedule(5200, () => { target = 0; });
    },
    update(time: number, dt: number) {
      inset += (target - inset) * Math.min(1, dt * 3.4);
      if (time > until && inset < 2) return;
      const p = tk.player;
      if (!p.active || time - lastTick < 520 || inset < 6) return;
      const outside = p.x < 30 + inset || p.x > tk.W - 30 - inset
        || p.y < 110 + inset || p.y > tk.H - 30 - inset;
      if (!outside) return;
      lastTick = time;
      tk.hitPlayer(13, p.x, p.y);
      tk.slowPlayer(0.7, 600);
    },
    drawGround(g, time) {
      if (inset < 2) return;
      const pulse = 0.16 + Math.sin(time / 180) * 0.05;
      g.fillStyle(COIN_DARK, pulse + 0.25);
      // The claimed band, drawn as four rectangles around the live table.
      g.fillRect(0, 96, tk.W, 14 + inset);
      g.fillRect(0, tk.H - 30 - inset, tk.W, 30 + inset);
      g.fillRect(0, 96, 30 + inset, tk.H - 96);
      g.fillRect(tk.W - 30 - inset, 96, 30 + inset, tk.H - 96);
      g.lineStyle(2, COIN_LIT, 0.5);
      g.strokeRect(30 + inset, 110 + inset, tk.W - 60 - inset * 2, tk.H - 140 - inset * 2);
      // Chips stacked along the new boundary.
      for (let i = 0; i < 10; i++) {
        const x = 40 + inset + i * ((tk.W - 80 - inset * 2) / 9);
        g.fillStyle(COIN, 0.35);
        g.fillEllipse(x, 110 + inset + 6, 12, 6);
        g.fillEllipse(x, tk.H - 30 - inset - 6, 12, 6);
      }
    },
    onPhaseEnd() { inset = 0; target = 0; },
  };
};

export const FORTUNE_BOSS: WorldBossDef = {
  worldId: 'fortune',
  name: 'The Broker of Ruin',
  title: 'Sovereign of Fortune, Who Shorted the Realm',
  color: COIN,
  colorLit: COIN_LIT,
  colorDark: COIN_DARK,
  accent: FELT,
  bodyR: 29,

  intro: ['The house always wins. I bought the house. Then I bought the street. Sit down and lose politely.'],
  banter: [
    'I wagered the realm would fall. Nobody would take the other side. That should have told them something.',
    'The Voice pays in kind and I only accept coin. We have an understanding.',
    'Everything you have picked up today, I priced this morning.',
    'You are on a run. Runs end. That is the entire product.',
  ],
  defeatLine: 'THE HOUSE FOLDS',

  phases: [
    {
      name: 'The Counting House',
      line: 'Small stakes first. I like to see how you bet when it does not matter.',
      hp: 440,
      cycle: [
        'sig:jackpot', 'volley', 'sig:coin', 'lanes',
        'sig:house', 'homing', 'spiral', 'slamchain',
      ],
      harass: ['h-flak', 'h-rune', 'h-orbs'],
      restMs: 1040,
      harassMs: 3100,
      moveSpeed: 52,
      holdDist: 290,
    },
    {
      name: 'The Margin Call',
      line: 'Your credit is withdrawn. Everything you are standing on is mine.',
      hp: 500,
      cycle: [
        'sig:house', 'sig:jackpot', 'barrage', 'sig:coin',
        'spiral', 'minefield', 'homing', 'quake', 'lanes',
      ],
      harass: ['h-flak', 'h-rune', 'h-mines', 'h-orbs'],
      restMs: 890,
      harassMs: 2600,
      moveSpeed: 62,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE BROKER HAS LEVERAGED THE WHOLE FLOOR',
    extraPhase: {
      name: 'Total Exposure',
      line: 'I have bet everything I own on this one hand. That should worry you far more than it worries me.',
      hp: 410,
      cycle: [
        'sig:house', 'sig:coin', 'sig:jackpot', 'sanctuary',
        'sig:coin', 'spiral', 'minefield', 'barrage',
      ],
      harass: ['h-mines', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 72,
      holdDist: 245,
    },
  },

  signatures: {
    jackpot,
    coin: doubleOrNothing,
    house: houseEdge,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0f0a, 0.6);
    g.fillRect(0, 0, W, H);
    // A counting house floor: green felt, a betting grid, chip racks, and a
    // ledger wall that has been written on for a very long time.
    g.fillStyle(FELT, 0.55);
    g.fillRect(50, 130, W - 100, H - 180);
    g.lineStyle(2, COIN, 0.1);
    g.strokeRect(50, 130, W - 100, H - 180);
    for (let c = 1; c < 6; c++) g.lineBetween(50 + c * ((W - 100) / 6), 130, 50 + c * ((W - 100) / 6), H - 50);
    for (let r = 1; r < 4; r++) g.lineBetween(50, 130 + r * ((H - 180) / 4), W - 50, 130 + r * ((H - 180) / 4));
    for (const side of [0, 1]) {
      const x = side === 0 ? 26 : W - 26;
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i % 2 === 0 ? COIN : 0xc4392c, 0.3);
        g.fillEllipse(x, 150 + i * 46, 22, 9);
        g.fillEllipse(x, 145 + i * 46, 22, 9);
      }
    }
    g.fillStyle(COIN, 0.05);
    for (let i = 0; i < 12; i++) g.fillRect(70 + i * ((W - 140) / 11), 104, 3, 18);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 92, 17);

    const dirX = Math.cos(s.facing);
    // A clerk's frame under a very expensive coat.
    g.fillStyle(COIN_DARK, 1);
    g.fillRoundedRect(s.x - 30, s.y - 24, 60, 68, 10);
    g.fillStyle(0x4a3a12, 1);
    g.fillRoundedRect(s.x - 25, s.y - 20, 50, 60, 8);
    // Waistcoat, in the house colours, with a watch chain across it.
    g.fillStyle(FELT, 0.95);
    g.fillRect(s.x - 13, s.y - 18, 26, 48);
    g.lineStyle(2, COIN_LIT, 0.9);
    g.beginPath();
    g.arc(s.x, s.y - 2, 14, 0.3, Math.PI - 0.3, false);
    g.strokePath();
    g.fillStyle(COIN_LIT, 1);
    g.fillCircle(s.x + 12, s.y - 4, 4);
    // Coins stacked on its shoulders like epaulettes, because of course.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i % 2 === 0 ? COIN : COIN_LIT, 0.9);
        g.fillEllipse(s.x + side * 30, s.y - 22 - i * 5, 20, 8);
      }
    }

    // Hands: one riffling a stack, one holding the ledger open at your page.
    const riffle = Math.abs(Math.sin(t / 130)) * 5;
    g.fillStyle(0xd8b898, 1);
    g.fillCircle(s.x + dirX * 34, s.y + 8 - s.castGlow * 10, 7);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(COIN, 0.9);
      g.fillEllipse(s.x + dirX * 34, s.y + 18 - i * 4 - (i === 4 ? riffle : 0), 17, 6);
    }
    g.fillStyle(0xd8b898, 1);
    g.fillCircle(s.x - dirX * 34, s.y + 12, 7);
    g.fillStyle(0x6a1a12, 1);
    g.fillRect(s.x - dirX * 34 - 16, s.y + 14, 32, 22);
    g.fillStyle(0xf2ead6, 0.9);
    g.fillRect(s.x - dirX * 34 - 13, s.y + 17, 26, 16);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(1, COIN_DARK, 0.6);
      g.lineBetween(s.x - dirX * 34 - 10, s.y + 21 + i * 4, s.x - dirX * 34 + 8, s.y + 21 + i * 4);
    }

    // Head: a green eyeshade, a monocle, and an expression of pure arithmetic.
    const hy = s.y - 44;
    g.fillStyle(0xd8b898, 0.97);
    g.fillEllipse(s.x + dirX * 2, hy, 28, 30);
    g.fillStyle(0x2a2418, 1);
    g.fillEllipse(s.x, hy - 20, 30, 12);
    g.fillStyle(FELT, 0.95);
    g.beginPath();
    g.arc(s.x + dirX * 2, hy - 8, 18, Math.PI, 0, false);
    g.fillPath();
    g.fillStyle(FELT, 0.8);
    g.fillRect(s.x - 18 + dirX * 2, hy - 10, 36, 6);
    const eye = s.hurt ? 0xffffff : COIN_DARK;
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(s.x - 8 + dirX * 3, hy - 1, 9, 7);
    g.fillStyle(eye, 1);
    g.fillCircle(s.x - 8 + dirX * 5, hy - 1, 3);
    // The monocle: gold rim, chain, and a glint that arrives on its own clock.
    g.lineStyle(2.5, COIN_LIT, 0.95);
    g.strokeCircle(s.x + 9 + dirX * 3, hy - 1, 9);
    g.fillStyle(0xffffff, 0.22 + Math.max(0, Math.sin(t / 900)) * 0.4);
    g.fillCircle(s.x + 9 + dirX * 3, hy - 1, 8);
    g.fillStyle(eye, 1);
    g.fillCircle(s.x + 9 + dirX * 5, hy - 1, 3);
    g.lineStyle(1, COIN_LIT, 0.6);
    g.lineBetween(s.x + 18 + dirX * 3, hy + 2, s.x + 22, hy + 22);
    g.lineStyle(2, COIN_DARK, 0.6);
    g.lineBetween(s.x - 6 + dirX * 2, hy + 14, s.x + 6 + dirX * 2, hy + 12);
    // Coins orbiting, counted and re-counted.
    for (let i = 0; i < 4; i++) {
      const a = t / 950 + (i * Math.PI) / 2;
      g.fillStyle(COIN_LIT, 0.45 + Math.sin(t / 200 + i) * 0.15);
      g.fillEllipse(s.x + Math.cos(a) * 56, s.y - 16 + Math.sin(a) * 24, 11, 7);
    }
    if (s.enraged) {
      for (let i = 0; i < 6; i++) {
        const ph = ((t + i * 260) % 1600) / 1600;
        g.fillStyle(COIN, (1 - ph) * 0.4);
        g.fillEllipse(s.x - 40 + i * 16, s.y - 60 - ph * 40, 9, 5);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 54);
    }
  },
};
