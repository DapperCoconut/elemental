import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Kingpin — Sovereign of the Family. Subterfuge world's boss (world id
 * `subterfuge`, which the Family kept — ask no questions): the last abstract
 * throne, never corrupted, merely under new management. Canon with the
 * subterfuge challenge, 'The Kingpin' ("You were hired to lose.").
 */

const CRIME = 0xcc2233;
const CRIME_LIT = 0xff9aa2;
const CRIME_DARK = 0x2a0a10;
const MONEY = 0xd8b13d;

// ── Signature: The Hit ───────────────────────────────────────────────
// Two associates step out of nowhere, and a black car crosses the hall at
// your row — one long horn of a warning, then very fast indeed.

const theHit = (tk: BossToolkit): SignatureMove => {
  let carY = 0;
  let carWarnUntil = 0;
  let fromLeft = true;
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('curse-cast');
      for (const side of [-1, 1]) {
        tk.spawnAdd({
          x: tk.bossX + side * 130, y: tk.bossY + 30,
          hp: 70, speed: 125, damage: 20, maxAlive: 5,
        });
      }
      fromLeft = Math.random() < 0.5;
      carY = tk.clampY(tk.player.y, 130);
      carWarnUntil = time + 1500;
      tk.schedule(1500, () => {
        tk.spawnBullet({
          x: fromLeft ? 20 : tk.W - 20, y: carY,
          angle: fromLeft ? 0 : Math.PI, speed: 560,
          damage: 24, r: 16, color: 0x1a1a1e, lifeMs: 2400,
        });
        tk.sfx('roar');
      });
    },
    drawGround(g, time) {
      if (time >= carWarnUntil) return;
      const t = 1 - (carWarnUntil - time) / 1500;
      // Headlights down the lane.
      g.fillStyle(0xfff2c8, 0.08 + t * 0.2);
      const x0 = fromLeft ? 20 : tk.W - 20;
      const dir = fromLeft ? 1 : -1;
      g.fillTriangle(x0, carY - 6, x0, carY + 6, x0 + dir * 260, carY - 26);
      g.fillTriangle(x0, carY - 6, x0, carY + 6, x0 + dir * 260, carY + 26);
      g.lineStyle(2, CRIME_LIT, 0.3 + t * 0.5);
      g.lineBetween(30, carY, tk.W - 30, carY);
    },
    onPhaseEnd() { carWarnUntil = 0; },
  };
};

// ── Signature: The Bribe ─────────────────────────────────────────────
// Money is thrown at the problem — literally. Coins that miss lie where they
// fall. Picking one up heals a little… and marks the spot for a follow-up.
// Everything the Family gives you costs more later.

const theBribe = (tk: BossToolkit): SignatureMove => {
  interface Coin { x: number; y: number; dieAt: number }
  let coins: Coin[] = [];
  return {
    durationMs: 1800,
    cast(time: number) {
      tk.sfx('curse-cast');
      const aim = tk.angleToPlayer();
      for (let i = 0; i < 7; i++) {
        const a = aim + (i - 3) * 0.2;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
          angle: a, speed: 280, damage: 9, color: MONEY, lifeMs: 1500,
        });
        // Where each coin's arc ends, a tempting pickup lands.
        const dist = Phaser.Math.Between(180, 340);
        tk.schedule(900 + i * 80, () => {
          coins.push({
            x: tk.clampX(tk.bossX + Math.cos(a) * dist, 60),
            y: tk.clampY(tk.bossY + Math.sin(a) * dist, 110),
            dieAt: tk.now + 9000,
          });
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      if (p.active) {
        for (const c of coins) {
          if (Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) < 26) {
            c.dieAt = 0;
            p.heal(3);
            tk.host.showFloatingText(c.x, c.y - 20, '+3 💰', '#f5d576');
            // The invoice arrives shortly.
            const ix = c.x;
            const iy = c.y;
            tk.schedule(700, () => {
              tk.spawnZone({ x: ix, y: iy, radius: 52, warnMs: 420, damage: 14 });
            });
          }
        }
      }
      coins = coins.filter((c) => time < c.dieAt);
    },
    drawGround(g, time) {
      for (const c of coins) {
        const glint = Math.sin(time / 200 + c.x) * 0.3;
        g.fillStyle(MONEY, 0.75 + glint);
        g.fillEllipse(c.x, c.y, 12, 8);
        g.lineStyle(1, 0xf5d576, 0.8);
        g.strokeEllipse(c.x, c.y, 12, 8);
      }
    },
    onPhaseEnd() { coins = []; },
  };
};

// ── Signature: The Contract ──────────────────────────────────────────
// A seal follows you for two seconds — the paperwork finding its signatory —
// then the terms activate: a ring of clauses fires outward from the seal and
// the penalty lands in the middle.

const theContract = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let sealsAt = 0;
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('judgement');
      active = true;
      cx = tk.player.x;
      cy = tk.player.y;
      sealsAt = time + 2100;
      tk.schedule(2100, () => {
        active = false;
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12;
          tk.spawnBullet({
            x: cx + Math.cos(a) * 14, y: cy + Math.sin(a) * 14,
            angle: a, speed: 215, damage: 10, color: CRIME_LIT,
          });
        }
        tk.explode(cx, cy, 66, 18, MONEY);
      });
    },
    update(time: number, dt: number) {
      if (!active) return;
      const p = tk.player;
      if (!p.active) return;
      // The paperwork travels at 150 — outrunnable, tiring.
      const a = Math.atan2(p.y - cy, p.x - cx);
      const d = Math.min(Phaser.Math.Distance.Between(cx, cy, p.x, p.y), 150 * dt);
      cx += Math.cos(a) * d;
      cy += Math.sin(a) * d;
      void time;
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (sealsAt - time) / 2100, 0, 1);
      // A wax seal with a ribbon, closing on authority.
      g.lineStyle(2, CRIME, 0.4 + t * 0.5);
      g.strokeCircle(cx, cy, 40 - t * 12);
      g.fillStyle(CRIME, 0.25 + t * 0.4);
      g.fillCircle(cx, cy, 12 + t * 4);
      g.fillStyle(MONEY, 0.6 + t * 0.3);
      g.fillCircle(cx, cy, 5);
      g.fillStyle(CRIME, 0.6);
      g.fillTriangle(cx - 4, cy + 12, cx + 2, cy + 12, cx - 6, cy + 26);
      g.fillTriangle(cx + 4, cy + 12, cx - 2, cy + 12, cx + 6, cy + 26);
    },
    onPhaseEnd() { active = false; },
  };
};

export const SUBTERFUGE_BOSS: WorldBossDef = {
  worldId: 'subterfuge',
  name: 'The Kingpin',
  title: 'Sovereign of the Family',
  color: CRIME,
  colorLit: CRIME_LIT,
  colorDark: CRIME_DARK,
  accent: MONEY,
  bodyR: 30,

  intro: ['You were hired to lose. The cheque cleared this morning. Professional courtesy says: lie down.'],
  banter: [
    'Nothing personal. It is ALL business. Business is personal.',
    'The Voice offered me the realms. I countered. It is still reviewing the terms.',
    'You have cost me eleven good associates. I am invoicing your next of kin.',
    'Everyone works for the Family eventually. Some just skip the interview.',
  ],
  defeatLine: 'THE FAMILY SETTLES',

  phases: [
    {
      name: 'The Sit-Down',
      line: 'Sit. We talk. Then my associates talk. They are less articulate.',
      hp: 450,
      cycle: [
        'sig:hit', 'volley', 'sig:bribe', 'lanes',
        'sig:contract', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-orbs', 'h-snipe'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 50,
      holdDist: 290,
    },
    {
      name: 'The Escalation',
      line: 'You declined the settlement. The Family respects that. The Family also owns an armoury.',
      hp: 500,
      cycle: [
        'sig:contract', 'sig:hit', 'quake', 'sig:bribe',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 60,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE FAMILY HAS STOPPED BEING POLITE',
    extraPhase: {
      name: 'The Last Favour',
      line: 'I called in every favour I am owed. The realms owe me MANY favours.',
      hp: 380,
      cycle: [
        'sig:hit', 'sig:contract', 'sig:bribe', 'sanctuary',
        'quake', 'spiral', 'sig:hit', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 70,
      holdDist: 240,
    },
  },

  signatures: {
    hit: theHit,
    bribe: theBribe,
    contract: theContract,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0e0508, 0.55);
    g.fillRect(0, 0, W, H);
    // A back office: long table, hanging lamp cone, stacked ledgers.
    g.fillStyle(0xfff2c8, 0.05);
    g.fillTriangle(W / 2 - 8, 96, W / 2 + 8, 96, W / 2, H * 0.5);
    g.fillStyle(0x2a1a10, 0.9);
    g.fillRect(W / 2 - 120, H * 0.5 - 8, 240, 14);
    for (const side of [-1, 1]) {
      g.fillRect(W / 2 + side * 100 - 5, H * 0.5 + 6, 10, 26);
    }
    for (let i = 0; i < 4; i++) {
      const x = 70 + ((W - 140) * i) / 3;
      g.fillStyle(CRIME_DARK, 0.9);
      g.fillRect(x - 12, H - 42, 24, 5);
      g.fillRect(x - 10, H - 48, 20, 5);
      g.fillStyle(MONEY, 0.25);
      g.fillRect(x - 8, H - 53, 16, 4);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 100, 17);

    // The suit: shoulders like a doorframe.
    g.fillStyle(CRIME_DARK, 1);
    g.fillRoundedRect(s.x - 34, s.y - 24, 68, 64, 10);
    g.fillStyle(0x3a1218, 1);
    g.fillRoundedRect(s.x - 28, s.y - 20, 56, 56, 8);
    // Pinstripes.
    g.lineStyle(1, CRIME_LIT, 0.2);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(s.x - 24 + i * 10, s.y - 20, s.x - 26 + i * 10, s.y + 36);
    }
    // Shirt, tie, and the pocket square that has seen things.
    g.fillStyle(0xf2ead6, 0.95);
    g.fillTriangle(s.x - 8, s.y - 20, s.x + 8, s.y - 20, s.x, s.y + 4);
    g.fillStyle(CRIME, 1);
    g.fillTriangle(s.x - 3, s.y - 18, s.x + 3, s.y - 18, s.x, s.y + 2);
    g.fillStyle(MONEY, 0.9);
    g.fillTriangle(s.x - 22, s.y - 14, s.x - 14, s.y - 14, s.x - 18, s.y - 8);

    // Hands: one drums the ledger, one holds the cigar.
    const dirX = Math.cos(s.facing);
    const drum = Math.abs(Math.sin(t / 190)) * 3;
    g.fillStyle(0xd8b898, 1);
    g.fillCircle(s.x - dirX * 30, s.y + 22 - drum, 7);
    const cigX = s.x + dirX * 32;
    const cigY = s.y + 6 - s.castGlow * 10;
    g.fillCircle(cigX, cigY, 7);
    g.lineStyle(3, 0x4a2a14, 1);
    g.lineBetween(cigX, cigY - 2, cigX + dirX * 12, cigY - 6);
    g.fillStyle(0xff6a3a, 0.95);
    g.fillCircle(cigX + dirX * 13, cigY - 6, 2 + Math.sin(t / 150) * 0.8 + s.castGlow);
    // Smoke, curling up and away.
    for (let i = 0; i < 3; i++) {
      const ph = ((t + i * 500) % 1600) / 1600;
      g.fillStyle(0x8a8a92, (1 - ph) * 0.25);
      g.fillCircle(cigX + dirX * 14 + Math.sin(t / 300 + i) * 5, cigY - 10 - ph * 26, 2.5 + ph * 3.5);
    }
    // The pinky ring. Non-negotiable.
    g.fillStyle(MONEY, 1);
    g.fillCircle(s.x - dirX * 34, s.y + 22 - drum, 2);

    // Head: jaw, five o'clock shadow, and the fedora doing all the work.
    const hy0 = s.y - 34;
    g.fillStyle(0xd8b898, 0.95);
    g.fillEllipse(s.x, hy0, 24, 22);
    g.fillStyle(0xb89878, 0.5);
    g.fillEllipse(s.x, hy0 + 7, 20, 9);
    // The brim shadows everything above the jaw.
    g.fillStyle(CRIME_DARK, 1);
    g.fillEllipse(s.x + dirX * 2, hy0 - 4, 34, 10);
    g.fillStyle(0x1e0a0e, 1);
    g.fillRoundedRect(s.x - 13 + dirX * 2, hy0 - 22, 26, 16, 5);
    g.fillStyle(CRIME, 0.8);
    g.fillRect(s.x - 13 + dirX * 2, hy0 - 12, 26, 4);
    // Under the brim: one gold glint of an eye. Two, if you really upset him.
    const eye = s.hurt ? 0xffffff : MONEY;
    g.fillStyle(eye, 0.95);
    g.fillCircle(s.x + dirX * 6, hy0 - 1, 2);
    if (s.enraged || s.hurt) g.fillCircle(s.x - 6 + dirX * 4, hy0 - 1, 2);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 54);
    }
  },
};
