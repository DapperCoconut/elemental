import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { card, chip, chipStack, die, fan, greenLamp, lotToken, pip, suitInlay } from './art';
import {
  ANTE, ANTE_DARK, ANTE_LIT, BAIZE, BAIZE_DARK, BAIZE_LIT, BELL, CARD_BLACK, CARD_RED, CHIP_BLUE, CHIP_RED, CHIP_WHITE,
  GILT, GILT_DARK, GILT_LIT, IVORY, LAMP_GLASS, LAMP_GLASS_LIT, LAMP_LIGHT, MAHOGANY, MAHOGANY_DARK,
  MOTLEY_GREEN, MOTLEY_PURPLE,
} from './palette';
import { clamp, dist, SUITS, type Suit } from './util';

/**
 * Prince Ante, the Opening Stake — the Croupier-King's first lucky child, governor of the Card Court.
 *
 * Ante was dealt the court at nine and has never lost a hand since. He thinks he is lucky. He has
 * never once wondered why the deck always loves him, and he is a little afraid of what he would
 * find out if it didn't. He plays the way a charming boy deals:
 *
 * • **The Deal** (orbiting the table): he deals fans of cards that fly out and stick upright in
 *   the floor, then flip — ♠ throw blades, ♥ heal him, ♦ go off, ♣ root you beside them (strike a
 *   card before it turns and it is knocked flat); and he riffles two streams of cards that bow in
 *   and cross where you stand.
 * • **High Roller** (stalking, gilt): giant dice roll at you down a marked path, land, and fire as
 *   many pips as they show; chip stacks rise round you, chip by chip, then topple and roll at you.
 * • **Wild Card** (hard, blinking, blood-red): he draws a joker that copies the last blow you hit
 *   him with and throws it back — a fan of cards if you hit him from afar, a burst round him if
 *   you were close.
 */

const TOP = 96;

interface Shot { x: number; y: number; vx: number; vy: number; ang: number; spin: number; omega: number; turnUntil: number; at: number; dmg: number; r: number; done: boolean; joker?: boolean; suit: Suit }

/** Move a list of card shots one step; hit the player once each. */
function stepShots(tk: BossToolkit, shots: Shot[], time: number, dt: number): void {
  const p = tk.player;
  for (const s of shots) {
    if (s.done) continue;
    if (time < s.turnUntil) {
      const c = Math.cos(s.omega * dt), sn = Math.sin(s.omega * dt);
      const vx = s.vx * c - s.vy * sn, vy = s.vx * sn + s.vy * c;
      s.vx = vx; s.vy = vy;
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.ang += s.spin * dt;
    if (p.active && p.hp > 0 && dist(s.x, s.y, p.x, p.y) < 20 + s.r) { s.done = true; tk.hitPlayer(s.dmg, s.x, s.y); }
    if (s.x < -40 || s.x > tk.W + 40 || s.y < TOP - 40 || s.y > tk.H + 40 || time - s.at > 5000) s.done = true;
  }
  for (let i = shots.length - 1; i >= 0; i--) if (shots[i].done) shots.splice(i, 1);
}

function drawShots(g: Phaser.GameObjects.Graphics, shots: Shot[]): void {
  for (const s of shots) {
    if (s.joker) card(g, s.x, s.y, 15, 21, s.ang, { face: true, joker: true, cheap: true });
    else card(g, s.x, s.y, 13, 18, s.ang, { face: true, suit: s.suit, rank: 1, cheap: true });
  }
}

const shot = (x: number, y: number, a: number, speed: number, dmg: number, at: number, suit: Suit, o: Partial<Shot> = {}): Shot => ({
  x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ang: a, spin: 10, omega: 0, turnUntil: 0, at, dmg, r: 8, done: false, suit, ...o,
});

// ── Signature: The Deal ──────────────────────────────────────────────
// A fan of cards flies out and sticks upright in the floor round you, backs showing. Then, one by
// one, they flip: ♠ throws three blades at you, ♥ heals him, ♦ goes off in a burst, ♣ roots you
// beside it. Strike a card before it flips and it is knocked flat — the hearts first, if you are wise.

interface Dealt {
  fx: number; fy: number; x: number; y: number; at: number; landAt: number; flipAt: number; actAt: number;
  suit: Suit; acted: boolean; flat: boolean; target: StrikeTarget | null;
}

const deal = (tk: BossToolkit): SignatureMove => {
  let cards: Dealt[] = [];
  const shots: Shot[] = [];
  let tether: { x: number; y: number; until: number } | null = null;
  const clear = () => { for (const c of cards) c.target?.remove(); cards = []; };
  return {
    durationMs: 2400,
    windupMs: 600,
    gesture: 'sweep',
    hold: 'draw',
    tell: 'THE DEAL',
    cast(time) {
      clear();
      const p = tk.player;
      const n = tk.hard ? 7 : 6;
      const base = tk.angleToPlayer();
      const d0 = dist(tk.bossX, tk.bossY, p.x, p.y);
      // Ensure every suit is in the hand; the rest by chance.
      const suits: Suit[] = [...SUITS];
      while (suits.length < n) suits.push(SUITS[Math.floor(Math.random() * 4)]);
      suits.sort(() => Math.random() - 0.5);
      for (let i = 0; i < n; i++) {
        const a = base + (i / (n - 1) - 0.5) * 1.5;
        const r = clamp(d0 + (i % 2 ? 60 : -40), 150, 380);
        const x = tk.clampX(tk.bossX + Math.cos(a) * r), y = tk.clampY(tk.bossY + Math.sin(a) * r);
        const landAt = time + 380 + i * 70;
        const flipAt = landAt + tk.warn(900) + i * 180;
        cards.push({ fx: tk.bossX, fy: tk.bossY, x, y, at: time, landAt, flipAt, actAt: flipAt + 380, suit: suits[i], acted: false, flat: false, target: null });
      }
      tk.sfx('whoosh');
    },
    update(time, dt) {
      const p = tk.player;
      for (const c of cards) {
        if (c.flat || c.acted) continue;
        if (time >= c.landAt && !c.target) {
          c.target = tk.spawnTarget({
            x: c.x, y: c.y - 14, r: 16,
            onStruck: (by) => {
              if (by !== 'player' || c.acted || c.flat) return;
              if (tk.now < c.actAt) { c.flat = true; c.target?.remove(); tk.sfx('snap-back'); }
            },
          });
          tk.sfx('stab');
        }
        if (time >= c.actAt) {
          c.acted = true;
          c.target?.remove();
          switch (c.suit) {
            case 'spade': {
              const a = Math.atan2(p.y - c.y, p.x - c.x);
              for (const k of [-1, 0, 1]) shots.push(shot(c.x, c.y - 14, a + k * 0.22, 250, 8, time, 'spade'));
              tk.sfx('slash');
              break;
            }
            case 'heart': tk.healBoss(tk.hard ? 9 : 7, c.x, c.y - 20); tk.sfx('heal'); break;
            case 'diamond': tk.explode(c.x, c.y, 70, 12, CARD_RED); tk.sfx('explosion-small'); break;
            case 'club':
              if (dist(p.x, p.y, c.x, c.y) < 110) {
                // Tethered to the card: rooted where you stand for a beat.
                tk.root(tk.hard ? 1100 : 900);
                tk.hitPlayer(4, p.x, p.y);
                tether = { x: c.x, y: c.y, until: time + 1000 };
                tk.sfx('chain');
              }
              break;
          }
        }
      }
      stepShots(tk, shots, time, dt);
      if (cards.length && cards.every((c) => c.acted || c.flat) && time > Math.max(...cards.map((c) => c.actAt)) + 900) clear();
      if (tether && time > tether.until) tether = null;
    },
    drawGround(g, time) {
      for (const c of cards) {
        if (time < c.landAt) { g.fillStyle(0x000000, 0.2); g.fillEllipse(c.x, c.y, 20, 7); continue; }
        if (c.flat) {
          const k = clamp((time - c.actAt) / 600, 0, 1);
          card(g, c.x, c.y, 18, 26, 1.3, { face: false, back: ANTE, alpha: 1 - k * 0.6 });
          continue;
        }
        // Warning rings by suit as the flip nears.
        const k = clamp((time - (c.flipAt - 500)) / 500, 0, 1);
        if (time >= c.flipAt && !c.acted) {
          const col = c.suit === 'diamond' ? CARD_RED : c.suit === 'club' ? 0x1b1b24 : c.suit === 'heart' ? ANTE_LIT : IVORY;
          const rr = c.suit === 'diamond' ? 70 : c.suit === 'club' ? 110 : 26;
          g.fillStyle(col, 0.14); g.fillCircle(c.x, c.y, rr);
          g.lineStyle(2, col, 0.7); g.strokeCircle(c.x, c.y, rr * clamp((time - c.flipAt) / 380, 0, 1));
        } else if (k > 0 && !c.acted) { g.lineStyle(1.5, GILT_LIT, 0.4 * k); g.strokeCircle(c.x, c.y, 22); }
        g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x + 3, c.y + 2, 22, 6);
      }
      if (tether) {
        const p = tk.player;
        g.lineStyle(3, 0x1b1b24, 0.8); g.lineBetween(p.x, p.y, tether.x, tether.y);
        for (let i = 1; i < 5; i++) pip(g, p.x + (tether.x - p.x) * (i / 5), p.y + (tether.y - p.y) * (i / 5), 4, 'club', 0x1b1b24, 0.8);
      }
    },
    drawAir(g, time) {
      for (const c of cards) {
        if (c.flat) continue;
        if (time < c.landAt) {
          const k = clamp((time - c.at) / Math.max(1, c.landAt - c.at), 0, 1);
          card(g, c.fx + (c.x - c.fx) * k, c.fy + (c.y - 14 - c.fy) * k - Math.sin(k * Math.PI) * 40, 16, 23, k * 14, { face: false, back: ANTE, cheap: true });
          continue;
        }
        if (c.acted && time > c.actAt + 400) continue;
        // Stuck upright in the floor; a flip shows the face edge-on halfway.
        const fk = clamp((time - c.flipAt) / 200, 0, 1);
        const sw = time < c.flipAt ? 1 : Math.abs(Math.cos(fk * Math.PI));
        const a = c.acted ? 1 - (time - c.actAt) / 400 : 1;
        if (fk >= 0.5 && c.suit === 'heart') glow(g, c.x, c.y - 16, 20, ANTE_LIT, 0.08, 2);
        card(g, c.x, c.y - 16, 22 * Math.max(0.1, sw), 32, 0, { face: fk >= 0.5, suit: c.suit, rank: c.suit === 'heart' ? 0 : 1, back: ANTE, alpha: a });
      }
      drawShots(g, shots);
    },
    onPhaseEnd() { clear(); shots.length = 0; tether = null; },
  };
};

// ── Signature: The Riffle ────────────────────────────────────────────
// He splits the deck between his hands and riffles it at you: two streams of cards bow out from
// either side and curve in to cross where you stand. Step out of the crossing, not back from it.

const riffle = (tk: BossToolkit): SignatureMove => {
  const shots: Shot[] = [];
  let queue: { at: number; side: number; base: number }[] = [];
  let aimX = 0, aimY = 0, aimAt = 0;
  return {
    durationMs: 1900,
    windupMs: 700,
    gesture: 'clap',
    hold: 'spray',
    tell: 'RIFFLE',
    cast(time) {
      const n = tk.hard ? 9 : 7;
      const base = tk.angleToPlayer();
      aimX = tk.player.x; aimY = tk.player.y; aimAt = time;
      queue = [];
      for (let i = 0; i < n; i++) for (const side of [-1, 1]) queue.push({ at: time + i * 110 + (side > 0 ? 55 : 0), side, base });
      tk.sfx('whoosh');
    },
    update(time, dt) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const q = queue[i];
        if (time < q.at) continue;
        queue.splice(i, 1);
        const d = dist(tk.bossX, tk.bossY, aimX, aimY);
        // Bow out 0.7 rad each side, curving back in so the streams cross at the aim point.
        const speed = 290;
        const tCross = Math.max(0.5, d / speed);
        const omega = (-q.side * 1.4) / tCross;
        shots.push(shot(tk.bossX + q.side * 18, tk.bossY, q.base + q.side * 0.7, speed, 7, time, q.side > 0 ? 'heart' : 'spade', { omega, turnUntil: time + tCross * 1000 * 1.1, spin: 16 }));
        tk.sfx('snap-back');
      }
      stepShots(tk, shots, time, dt);
    },
    drawGround(g, time) {
      // Where the streams will cross: a gilt cross marked on the floor for the riffle's length.
      if (time - aimAt < 1800 && (queue.length || shots.length)) {
        const k = clamp((time - aimAt) / 600, 0, 1);
        g.lineStyle(2, GILT_LIT, 0.5 * k);
        g.lineBetween(aimX - 18, aimY - 18, aimX + 18, aimY + 18); g.lineBetween(aimX - 18, aimY + 18, aimX + 18, aimY - 18);
        g.strokeCircle(aimX, aimY, 40);
      }
    },
    drawAir(g) { drawShots(g, shots); },
    onPhaseEnd() { shots.length = 0; queue = []; },
  };
};

// ── Signature: High Roller ───────────────────────────────────────────
// He rolls giant dice at you. Each die's path is chalked on the floor and its landing marked; it
// tumbles down the path (it hurts to be in the way), lands, settles on a face, its pips light one
// by one — and then it fires that many pips at you in a fan.

interface Rolling {
  sx: number; sy: number; tx: number; ty: number; at: number; rollAt: number; landAt: number; settleAt: number; fireAt: number;
  face: number; hit: boolean; fired: boolean; seed: number;
}

const highRoller = (tk: BossToolkit): SignatureMove => {
  let dice: Rolling[] = [];
  const R = 28;
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'punch',
    hold: 'charge',
    tell: 'HIGH ROLLER',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 3 : 2;
      const a = tk.angleToPlayer();
      dice = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 120;
        const tx = tk.clampX(p.x - Math.sin(a) * off + Math.cos(a) * 60), ty = tk.clampY(p.y + Math.cos(a) * off + Math.sin(a) * 60);
        const rollAt = time + tk.warn(850) + i * 160;
        const landAt = rollAt + 650;
        dice.push({
          sx: tk.bossX, sy: tk.bossY, tx, ty, at: time, rollAt, landAt, settleAt: landAt + 380, fireAt: landAt + 380 + tk.warn(600),
          face: tk.hard ? 3 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 5), hit: false, fired: false, seed: Math.random() * 6,
        });
      }
      tk.sfx('dice');
    },
    update(time) {
      const p = tk.player;
      for (const d of dice) {
        if (time >= d.rollAt && time < d.landAt && !d.hit) {
          const k = (time - d.rollAt) / (d.landAt - d.rollAt);
          const x = d.sx + (d.tx - d.sx) * k, y = d.sy + (d.ty - d.sy) * k;
          if (p.active && p.hp > 0 && dist(x, y, p.x, p.y) < R + 18) { d.hit = true; tk.hitPlayer(12, p.x, p.y); tk.sfx('hit-heavy'); }
        }
        if (!d.fired && time >= d.fireAt) {
          d.fired = true;
          const a = tk.angleToPlayer(d.tx, d.ty);
          for (let i = 0; i < d.face; i++) {
            const b = a + (i - (d.face - 1) / 2) * 0.2;
            tk.spawnBullet({ x: d.tx, y: d.ty - 6, angle: b, speed: 235, damage: 7, r: 6, lifeMs: 4000, color: IVORY });
          }
          tk.sfx('shotgun');
        }
      }
      dice = dice.filter((d) => time < d.fireAt + 900);
    },
    drawGround(g, time) {
      for (const d of dice) {
        if (time < d.landAt) {
          // The chalked path and the landing mark.
          const k = clamp((time - d.at) / Math.max(1, d.rollAt - d.at), 0, 1);
          const len = dist(d.sx, d.sy, d.tx, d.ty), ux = (d.tx - d.sx) / (len || 1), uy = (d.ty - d.sy) / (len || 1);
          for (let s = 0; s < len * k; s += 22) { g.fillStyle(IVORY, 0.4); g.fillCircle(d.sx + ux * s, d.sy + uy * s, 2); }
          g.lineStyle(1.5, IVORY, 0.25); g.lineBetween(d.sx - uy * (R + 18), d.sy + ux * (R + 18), d.tx - uy * (R + 18), d.ty + ux * (R + 18));
          g.lineBetween(d.sx + uy * (R + 18), d.sy - ux * (R + 18), d.tx + uy * (R + 18), d.ty - ux * (R + 18));
          g.lineStyle(2, GILT_LIT, 0.4 + k * 0.4); g.strokeRect(d.tx - R, d.ty - R * 0.7, R * 2, R * 1.4);
        } else if (!d.fired) {
          // The fan it will fire, shown as faint pip-lines once it has settled.
          if (time >= d.settleAt) {
            const a = tk.angleToPlayer(d.tx, d.ty);
            for (let i = 0; i < d.face; i++) {
              const b = a + (i - (d.face - 1) / 2) * 0.2;
              g.lineStyle(1.5, IVORY, 0.25); g.lineBetween(d.tx, d.ty, d.tx + Math.cos(b) * 120, d.ty + Math.sin(b) * 120);
            }
          }
        }
      }
    },
    drawAir(g, time) {
      for (const d of dice) {
        if (time < d.rollAt) {
          // Rattling in his fist.
          die(g, tk.bossX + Math.sin(time / 30 + d.seed) * 4, tk.bossY - 40, 10, 1 + (Math.floor(time / 60 + d.seed) % 6), Math.sin(time / 40) * 0.5);
          continue;
        }
        const fade = d.fired ? clamp(1 - (time - d.fireAt) / 900, 0, 1) : 1;
        if (time < d.landAt) {
          const k = (time - d.rollAt) / (d.landAt - d.rollAt);
          const x = d.sx + (d.tx - d.sx) * k, y = d.sy + (d.ty - d.sy) * k - Math.abs(Math.sin(k * Math.PI * 3)) * 16;
          die(g, x, y, R, 1 + (Math.floor(k * 12 + d.seed) % 6), k * 12);
        } else if (time < d.settleAt) {
          const k = (time - d.landAt) / (d.settleAt - d.landAt);
          die(g, d.tx, d.ty - Math.abs(Math.sin(k * Math.PI * 2)) * 6 * (1 - k), R, 1 + (Math.floor(time / 50) % 6), (1 - k) * 0.6);
        } else {
          die(g, d.tx, d.ty, R, d.face, 0, fade);
          // Pips lighting up one by one toward the volley.
          if (!d.fired) {
            const lit1 = Math.floor(clamp((time - d.settleAt) / Math.max(1, d.fireAt - d.settleAt), 0, 1) * d.face + 0.5);
            glow(g, d.tx, d.ty, R + 6 + lit1 * 2, GILT_LIT, 0.03 * lit1, 2);
          }
        }
      }
    },
    onPhaseEnd() { dice = []; },
  };
};

// ── Signature: Raise ─────────────────────────────────────────────────
// "I raise." Chip stacks rise round you, chip by chip. Each, when it is tall, aims (a line runs
// out from it) and then topples, and its chips roll along the line at you like coins off a table.

interface Stack { x: number; y: number; at: number; aimAt: number; fallAt: number; a: number; color: number; fallen: boolean }
interface Rollchip { x: number; y: number; vx: number; vy: number; at: number; color: number; done: boolean }

const raise = (tk: BossToolkit): SignatureMove => {
  let stacks: Stack[] = [];
  const rolls: Rollchip[] = [];
  return {
    durationMs: 2300,
    windupMs: 550,
    gesture: 'raise',
    tell: 'I RAISE',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 5 : 4;
      const a0 = Math.random() * Math.PI * 2;
      stacks = [];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 190), y = tk.clampY(p.y + Math.sin(a) * 160);
        const fallAt = time + tk.warn(1300) + i * 260;
        stacks.push({ x, y, at: time, aimAt: fallAt - tk.warn(500), fallAt, a: 0, color: [CHIP_RED, CHIP_BLUE, CHIP_WHITE, CARD_BLACK][i % 4], fallen: false });
      }
      tk.sfx('money');
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of stacks) {
        // The aim locks a half-second before it falls.
        if (time < s.aimAt) s.a = Math.atan2(p.y - s.y, p.x - s.x);
        if (!s.fallen && time >= s.fallAt) {
          s.fallen = true;
          for (let i = 0; i < 6; i++) {
            const sp = 380 + i * 22;
            rolls.push({ x: s.x, y: s.y, vx: Math.cos(s.a) * sp, vy: Math.sin(s.a) * sp, at: time + i * 50, color: s.color, done: false });
          }
          tk.sfx('jackpot');
        }
      }
      for (const r of rolls) {
        if (r.done || time < r.at) continue;
        r.x += r.vx * dt; r.y += r.vy * dt;
        if (p.active && p.hp > 0 && dist(r.x, r.y, p.x, p.y) < 20 + 11) { r.done = true; tk.hitPlayer(6, r.x, r.y); }
        if (r.x < -20 || r.x > tk.W + 20 || r.y < TOP - 20 || r.y > tk.H + 20 || time - r.at > 2000) r.done = true;
      }
      for (let i = rolls.length - 1; i >= 0; i--) if (rolls[i].done) rolls.splice(i, 1);
      stacks = stacks.filter((s) => !s.fallen || time < s.fallAt + 400);
    },
    drawGround(g, time) {
      for (const s of stacks) {
        if (s.fallen) continue;
        if (time >= s.aimAt) {
          const k = clamp((time - s.aimAt) / Math.max(1, s.fallAt - s.aimAt), 0, 1);
          g.lineStyle(10, s.color === CARD_BLACK ? 0x4a4a58 : s.color, 0.12 + k * 0.25);
          g.lineBetween(s.x, s.y, s.x + Math.cos(s.a) * 600, s.y + Math.sin(s.a) * 600);
          g.lineStyle(1.5, GILT_LIT, 0.4 + k * 0.4); g.lineBetween(s.x, s.y, s.x + Math.cos(s.a) * 600, s.y + Math.sin(s.a) * 600);
        }
      }
    },
    drawAir(g, time) {
      for (const s of stacks) {
        if (s.fallen) {
          const k = (time - s.fallAt) / 400;
          for (let i = 0; i < 5; i++) chip(g, s.x + Math.cos(s.a) * i * 8 * k, s.y + Math.sin(s.a) * i * 8 * k - (5 - i) * 4 * (1 - k), 8, s.color, 1 - k);
          continue;
        }
        const k = clamp((time - s.at) / Math.max(1, s.fallAt - s.at), 0, 1);
        const n = 1 + Math.floor(k * 11);
        const wob = time >= s.aimAt ? Math.sin(time / 30) * 2 : 0;
        chipStack(g, s.x + wob, s.y, n, 9, s.color);
      }
      for (const r of rolls) {
        if (r.done || time < r.at) continue;
        // A chip rolling on its edge: an ellipse that flickers as it turns.
        const w = 4 + Math.abs(Math.sin((time - r.at) / 30)) * 14;
        g.fillStyle(dim(r.color, 0.3), 1); g.fillEllipse(r.x, r.y + 2, w + 2, 20);
        g.fillStyle(r.color, 1); g.fillEllipse(r.x, r.y, w, 18);
        g.fillStyle(CHIP_WHITE, 0.8); g.fillRect(r.x - 1, r.y - 8, 2, 4); g.fillRect(r.x - 1, r.y + 4, 2, 4);
      }
    },
    onPhaseEnd() { stacks = []; rolls.length = 0; },
  };
};

// ── Signature: Wild Card ─────────────────────────────────────────────
// He draws a joker. It has watched the last blow you landed on him. Hit him from afar and it throws
// a fan of jokers back along your line; hit him up close and it bursts out round him in a ring —
// either way, as hard as you hit (within reason). It shows which, before it throws.

const wildCard = (tk: BossToolkit): SignatureMove => {
  let lastAmt = 0, lastFar = true, lastAt = -99999;
  let mode: 'far' | 'near' | null = null;
  let castAt = 0, fireAt = 0, fired = true, dmg = 0;
  let ringR = 0;
  const shots: Shot[] = [];
  return {
    durationMs: 1900,
    windupMs: 500,
    gesture: 'point',
    hold: 'draw',
    tell: 'WILD CARD',
    cast(time) {
      castAt = time;
      fireAt = time + tk.warn(850);
      fired = false;
      mode = lastFar ? 'far' : 'near';
      dmg = clamp(Math.round((time - lastAt < 15000 ? lastAmt : 8) * 0.8), 7, 18);
      tk.sfx('chaos');
    },
    update(time, dt) {
      if (!fired && time >= fireAt) {
        fired = true;
        if (mode === 'far') {
          const a = tk.angleToPlayer();
          for (let i = 0; i < 5; i++) shots.push(shot(tk.bossX, tk.bossY - 20, a + (i - 2) * 0.17, 300, dmg, time, 'heart', { joker: true, spin: 8 }));
          tk.sfx('whoosh');
        } else {
          tk.explode(tk.bossX, tk.bossY, 150, dmg, MOTLEY_PURPLE);
          ringR = 1;
          tk.sfx('explosion-medium');
        }
      }
      if (ringR > 0) { ringR += dt * 600; if (ringR > 170) ringR = 0; }
      stepShots(tk, shots, time, dt);
    },
    onBossHurt(amount) {
      // The joker watches every blow, and keeps the last.
      lastAmt = amount;
      lastAt = tk.now;
      lastFar = dist(tk.player.x, tk.player.y, tk.bossX, tk.bossY) > 170;
    },
    drawGround(g, time) {
      if (fired || !mode) return;
      const k = clamp((time - castAt) / Math.max(1, fireAt - castAt), 0, 1);
      if (mode === 'near') {
        g.fillStyle(MOTLEY_PURPLE, 0.1 + k * 0.15); g.fillCircle(tk.bossX, tk.bossY, 150);
        g.lineStyle(3, BELL, 0.4 + k * 0.5); g.strokeCircle(tk.bossX, tk.bossY, 150 * k);
      } else {
        const a = tk.angleToPlayer();
        for (let i = 0; i < 5; i++) {
          const b = a + (i - 2) * 0.17;
          g.lineStyle(2, BELL, 0.2 + k * 0.4); g.lineBetween(tk.bossX, tk.bossY, tk.bossX + Math.cos(b) * (120 + k * 300), tk.bossY + Math.sin(b) * (120 + k * 300));
        }
      }
    },
    drawAir(g, time) {
      if (!fired && mode) {
        // The joker held up over his head, grinning, with a ring of motley.
        const k = clamp((time - castAt) / 300, 0, 1);
        const y = tk.bossY - 70 - k * 10 + Math.sin(time / 120) * 3;
        glow(g, tk.bossX, y, 30, BELL, 0.08, 3);
        card(g, tk.bossX, y, 30, 42, Math.sin(time / 200) * 0.12, { face: true, joker: true });
      }
      if (ringR > 0) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + ringR / 80;
          card(g, tk.bossX + Math.cos(a) * ringR, tk.bossY + Math.sin(a) * ringR, 12, 17, a + ringR / 30, { face: true, joker: true, cheap: true, alpha: 1 - ringR / 170 });
        }
      }
      drawShots(g, shots);
    },
    onPhaseEnd() { shots.length = 0; mode = null; fired = true; ringR = 0; },
  };
};

export const ANTE_BOSS: WorldBossDef = {
  worldId: 'isle:ante',
  name: 'Prince Ante',
  title: 'the Opening Stake',
  color: ANTE,
  colorLit: ANTE_LIT,
  colorDark: ANTE_DARK,
  accent: GILT,
  // Tier 1 of the eighth isle.
  damageMult: 1.2,

  intro: [
    'Oh, a challenger! Sit, sit. Nobody sits at my table any more. They say I\'m too lucky.',
    'I am, rather. I\'ve never lost a hand. Father says the deck loves me. Shall we see if it loves you?',
  ],
  banter: [
    'Ante up! That\'s me. That\'s my name. I\'m the stake you put in before the cards are dealt.',
    'Every hand I\'ve ever played, I\'ve won. Every one. Isn\'t that marvellous? Isn\'t it?',
    'Don\'t look at the backs. Nobody looks at the backs. Why would you look at the backs?',
    'Father dealt me this court when I was nine. He said I was the luckiest card in the deck.',
    'The busted serve by number. It\'s kinder, really. A number can\'t be disappointed.',
  ],
  defeatLine: 'THE HOUSE FOLDS',
  resumeLine: 'Back at the table? Good. I won\'t lose twice. I\'ve never lost once. Not really. Sit.',

  phases: [
    {
      name: 'The Deal',
      line: 'Let me deal. I always deal. Watch the cards — no, watch me. Everybody watches me.',
      hp: 490,
      cycle: [
        'sig:deal', 'volley', 'sig:riffle', 'radial', 'sig:deal',
        'homing', 'sig:riffle', 'sig:deal', 'sweep',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1250,
      harassMs: 3400,
    },
    {
      name: 'High Roller',
      line: 'Cards are for children. Dice, now. Dice are honest. Mine are VERY honest. Roll with me.',
      hp: 570,
      cycle: [
        'sig:dice', 'sig:raise', 'barrage', 'sig:dice', 'lanes',
        'sig:raise', 'sig:dice', 'spiral',
      ],
      harass: ['h-orbs', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'THE JOKER WAS NEVER IN THE DECK',
    extraPhase: {
      name: 'Wild Card',
      line: 'I\'m losing? I don\'t lose. I don\'t KNOW how. Here — I keep a joker for this. I always keep a joker.',
      hp: 410,
      cycle: [
        'sig:joker', 'sig:deal', 'sig:joker', 'sig:dice', 'charge',
        'sig:joker', 'sig:riffle', 'minefield',
      ],
      harass: ['h-rune', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 16, speed: 185 },
    spiral: { arms: 4, speed: 170 },
    barrage: { count: 6 },
  },

  signatures: {
    deal,
    riffle,
    dice: highRoller,
    raise,
    joker: wildCard,
  },

  look: {
    crest: 'crown', pattern: 'grid', aura: 'none', hands: 'ball',
    torsoR: 34, mouth: 'grin', eyes: 2, eyeColor: GILT_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'gold', look: { aura: 'coins', pattern: 'rings', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'blood', look: { crest: 'none', aura: 'glitch', hands: 'blade', mouth: 'stitch' } },
  ],

  /**
   * The Opening Stake's tells. He is drawn as a court card come alive: a gilt diagonal splits his
   * body the way a king's card is split, a little upside-down crown at his feet to mirror the one
   * on his head; a dealer's green visor across his brow; a gold Lot on his chain (the only gold one
   * on the isle); and a ruff of fanned crimson cards behind his head like a peacock's tail. In
   * High Roller the ruff is gone to a halo of tumbling dice and he shakes two in his fist; in Wild
   * Card a jester's three-pointed cap bursts through his crown and a joker is in his hand.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const joker = s.hard && s.phaseIdx >= 2;
    const roller = s.phaseIdx === 1;
    // Behind the head: the ruff of cards, the dice halo, or the jester's cap.
    if (!roller && !joker) {
      fan(g, s.x, s.y - R * 0.3, 9, R * 0.5, 2.4, -Math.PI / 2, false);
      // A fan of face cards inside the backs.
      fan(g, s.x, s.y - R * 0.3, 5, R * 0.38, 1.4, -Math.PI / 2, true);
    } else if (roller) {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.42 + Math.sin(s.t / 700) * 0.05;
        die(g, s.x + Math.cos(a) * R * 1.25, s.y + Math.sin(a) * R * 1.15, R * 0.2, 1 + ((i + Math.floor(s.t / 400)) % 6), s.t / 500 + i);
      }
    } else {
      const pts: [number, number][] = [[-0.9, -1.4], [0, -1.7], [0.9, -1.4]];
      pts.forEach(([u, v], i) => {
        const sway = Math.sin(s.t / 300 + i) * 4;
        g.fillStyle(i === 1 ? MOTLEY_GREEN : MOTLEY_PURPLE, 1);
        g.fillTriangle(s.x + u * R * 0.35 - R * 0.28, s.y - R * 0.7, s.x + u * R * 0.35 + R * 0.28, s.y - R * 0.7, s.x + u * R + sway, s.y + v * R);
        g.fillStyle(BELL, 1); g.fillCircle(s.x + u * R + sway, s.y + v * R, R * 0.11);
      });
    }
    // The court-card split and the mirrored crown at his feet.
    g.lineStyle(2, GILT, 0.8); g.lineBetween(s.x - R * 0.85, s.y + R * 0.45, s.x + R * 0.85, s.y - R * 0.45);
    const cy = s.y + R * 0.95;
    g.fillStyle(GILT, 0.9); g.fillRect(s.x - R * 0.28, cy - R * 0.06, R * 0.56, R * 0.1);
    for (const k of [-1, 0, 1]) g.fillTriangle(s.x + k * R * 0.2 - R * 0.08, cy + R * 0.04, s.x + k * R * 0.2 + R * 0.08, cy + R * 0.04, s.x + k * R * 0.2, cy + R * 0.2);
    // The dealer's visor.
    g.fillStyle(LAMP_GLASS, 0.75); g.fillEllipse(s.x + Math.cos(s.facing) * 4, s.y - R * 0.42, R * 1.4, R * 0.32);
    g.fillStyle(LAMP_GLASS_LIT, 0.5); g.fillEllipse(s.x + Math.cos(s.facing) * 4 - R * 0.2, s.y - R * 0.46, R * 0.5, R * 0.1);
    g.lineStyle(1.5, dim(LAMP_GLASS, 0.4), 1); g.strokeEllipse(s.x + Math.cos(s.facing) * 4, s.y - R * 0.42, R * 1.4, R * 0.32);
    // The gold Lot on its chain.
    g.lineStyle(1.2, GILT_DARK, 1); g.beginPath(); g.arc(s.x, s.y + R * 0.05, R * 0.4, 0.5, Math.PI - 0.5, false); g.strokePath();
    g.fillStyle(GILT_DARK, 1); g.fillCircle(s.x, s.y + R * 0.42, R * 0.15);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(s.x, s.y + R * 0.4, R * 0.13);
    pip(g, s.x, s.y + R * 0.4, R * 0.07, 'diamond', CARD_RED);
    // In his hands: the deck, and a hand of three (dice in High Roller; a joker in Wild Card).
    const h0 = s.hands[0], h1 = s.hands[1];
    if (h0) {
      if (roller) {
        const sh = Math.sin(s.t / 40) * 3 * (0.5 + s.castGlow);
        die(g, h0.x - 5 + sh, h0.y - 8, 6, 1 + (Math.floor(s.t / 90) % 6), s.t / 80);
        die(g, h0.x + 6 - sh, h0.y - 4, 6, 1 + (Math.floor(s.t / 110 + 3) % 6), -s.t / 90);
      } else {
        for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? IVORY : 0xd9cdb0, 1); g.fillRect(h0.x - 8, h0.y - 6 - i * 1.6, 16, 2); }
        card(g, h0.x, h0.y - 15, 16, 11, 0, { face: false, back: ANTE, cheap: true });
      }
    }
    if (h1) {
      if (joker) card(g, h1.x + 2, h1.y - 14, 13, 18, 0.2 + Math.sin(s.t / 300) * 0.1, { face: true, joker: true, cheap: true });
      else fan(g, h1.x, h1.y - 4, 3, 10, 0.8, -Math.PI / 2, true);
    }
    if (s.enraged) { g.lineStyle(1.5, ANTE_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Dealing Hall floor: herringbone mahogany parquet, and inlaid in it a baize table-top the
   * size of the room — you fight ON the table — ringed by a padded crimson rail studded with gilt.
   * The dealer's half-moon is chalked at the top, betting boxes along the sides, the four suits
   * in gilt at the quarters. Under the HUD: the back wall's mahogany panels and a row of green
   * banker's lamps hung low, their light falling in cones across the felt. Chip racks and a
   * dealer's shoe at the corners.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xa47e);
    // Parquet.
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(0, 0, W, H);
    for (let y = 96; y < H; y += 16) {
      for (let x = ((y / 16) % 2) * 24 - 24; x < W; x += 48) {
        g.fillStyle(rng() < 0.5 ? MAHOGANY : lit(MAHOGANY, 0.06), 1);
        g.fillPoints([{ x, y }, { x: x + 24, y: y + 8 }, { x: x + 24, y: y + 16 }, { x, y: y + 8 }], true);
      }
    }
    // The table-top: baize inlaid in a great rounded rectangle, a padded rail round it.
    const tx = 54, ty = 132, tw = W - 108, th = H - 132 - 30;
    g.fillStyle(ANTE_DARK, 1); g.fillRoundedRect(tx - 18, ty - 18, tw + 36, th + 36, 120);
    g.fillStyle(ANTE, 1); g.fillRoundedRect(tx - 14, ty - 16, tw + 28, th + 30, 116);
    g.lineStyle(2, ANTE_LIT, 0.3); g.strokeRoundedRect(tx - 10, ty - 13, tw + 20, th + 24, 112);
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const px = tx - 16 + t * (tw + 32);
      g.fillStyle(GILT, 1); g.fillCircle(px, ty - 16, 2.2); g.fillCircle(px, ty + th + 14, 2.2);
    }
    g.fillStyle(BAIZE_DARK, 1); g.fillRoundedRect(tx, ty, tw, th, 104);
    g.fillStyle(BAIZE, 1); g.fillRoundedRect(tx + 3, ty + 2, tw - 6, th - 6, 100);
    for (let y = ty + 10; y < ty + th; y += 40) { g.fillStyle(BAIZE_LIT, 0.12); g.fillRect(tx + 30, y, tw - 60, 18); }
    // Chalk: the dealer's half-moon, betting boxes, the suits.
    g.lineStyle(2, IVORY, 0.22);
    g.beginPath(); g.arc(W / 2, ty, 150, 0, Math.PI, false); g.strokePath();
    g.beginPath(); g.arc(W / 2, ty, 110, 0, Math.PI, false); g.strokePath();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.175);
      g.strokeRect(W / 2 + Math.cos(a) * 250 - 22, ty + Math.sin(a) * 250 - 16, 44, 32);
    }
    SUITS.forEach((s, i) => suitInlay(g, W * (0.2 + i * 0.2), ty + th - 60, 12, s, 0.55));
    g.lineStyle(1.5, GILT, 0.3); g.strokeEllipse(W / 2, ty + th * 0.55, tw * 0.6, th * 0.5);
    // The back wall under the HUD: panels, and green lamps hung low.
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(0, 0, W, 100);
    for (let x = 0; x < W; x += 80) {
      g.fillStyle(MAHOGANY, 1); g.fillRect(x + 6, 10, 68, 80);
      g.lineStyle(1.5, GILT_DARK, 1); g.strokeRect(x + 10, 14, 60, 72);
    }
    g.fillStyle(GILT_DARK, 1); g.fillRect(0, 96, W, 6); g.fillStyle(GILT, 1); g.fillRect(0, 96, W, 3);
    for (let i = 0; i < 6; i++) {
      const lx = 80 + i * ((W - 160) / 5);
      g.fillStyle(LAMP_LIGHT, 0.045); g.fillTriangle(lx - 20, 94, lx + 20, 94, lx + (lx < W / 2 ? 30 : -30), H - 60);
      g.fillStyle(LAMP_LIGHT, 0.05); g.fillEllipse(lx + (lx < W / 2 ? 24 : -24), ty + 150, 160, 70);
      g.lineStyle(1.5, GILT, 1); g.lineBetween(lx, 0, lx, 80);
      g.fillStyle(dim(LAMP_GLASS, 0.25), 1); g.fillPoints([{ x: lx - 26, y: 96 }, { x: lx + 26, y: 96 }, { x: lx + 14, y: 80 }, { x: lx - 14, y: 80 }], true);
      g.fillStyle(LAMP_GLASS, 1); g.fillPoints([{ x: lx - 24, y: 94 }, { x: lx + 24, y: 94 }, { x: lx + 13, y: 82 }, { x: lx - 13, y: 82 }], true);
      g.fillStyle(LAMP_GLASS_LIT, 0.6); g.fillRect(lx - 12, 86, 6, 5);
      g.fillStyle(GILT, 1); g.fillRect(lx - 26, 94, 52, 3);
    }
    // Chip racks and a shoe in the corners; a stack of dice by the rail.
    chipStack(g, 38, H - 40, 6, 9, CHIP_RED); chipStack(g, 60, H - 30, 4, 9, CHIP_BLUE);
    chipStack(g, W - 40, H - 40, 8, 9, CHIP_WHITE); chipStack(g, W - 62, H - 28, 3, 9, CARD_BLACK);
    die(g, W - 40, 150, 10, 6, 0.3); die(g, W - 58, 162, 9, 1, -0.2);
    greenLamp(g, 24, 220, 0.8); greenLamp(g, W - 24, 220, 0.8);
    lotToken(g, 46, 150, 5);
  },
};
