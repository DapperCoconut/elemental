import type Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import {
  BAIZE, BAIZE_DEEP, BAIZE_LIT, CARD_BLACK, CARD_RED, CARD_RED_DEEP, GILT, GILT_DARK, GILT_LIT, IVORY, IVORY_SHADE,
  LAMP_GREEN, MAHOGANY, MAHOGANY_DEEP, MAHOGANY_LIT, POCKET_GREEN, type Suit, blackChip, chip, chipStack, die,
  lotToken, playingCard, rake, suitPip, wheelSeal,
} from './art';

/**
 * The Croupier-King Lucan, Dealer of the Draw — Lotterhaven's monarch, at the High Table under
 * the great Wheel. He says chance is the only fair ruler and he is merely its dealer. The fight
 * is a night at his table in four games, and then (on hard) the moment he stops pretending:
 *
 *   I   The Deal       — he sits at the table and deals you a hand of rules: face-up cards stand
 *                        along the edge of the room, each a rule that holds until it is struck off
 *                        (spades: his blows cut deeper; hearts: he heals; diamonds: you drag your
 *                        feet; clubs: he is hard to hurt). He riffles the deck through you, and
 *                        rakes the felt toward himself — stand in the one slot in the blade.
 *   II  Roulette       — the room is the wheel. It turns and carries you; the ball runs the rim
 *                        and drops on a number, and that whole wedge is struck. He lays inside
 *                        bets on the layout — straights, splits, streets, corners — and they pay;
 *                        he pushes towers of chips at you that topple into sprays.
 *   III Loaded Dice    — giant dice fall round you, their pips ticking down to a burst. Their
 *                        faces are his to choose, and he cheats: one turns itself over after it
 *                        lands (watch for the wobble). He throws snake-eyes off the walls, and
 *                        the two eyes glare down lanes; he plays the shell game with a live die.
 *   IV  All In         — he stakes his own health. A pot builds between you: every hit either of
 *                        you lands adds to it, and at the bell whoever landed more takes it out of
 *                        the other. He raises and raises again (the lanes double), and deals you
 *                        twenty-one until you bust.
 *   V   The House Always Wins (hard) — he cheats openly. The Wheel on the ceiling spins, and when
 *                        it stops he rewrites the last thing that happened: your last hit undone,
 *                        or dealt back at you. The rigged drum strikes every square but his
 *                        favourites'; a black chip ricochets and splits off every wall.
 */

// ── Palette ──────────────────────────────────────────────────────────

const L_MAIN = 0xc8a040;
const L_LIT = 0xffe8a8;
const L_DARK = 0x3a0e18;
const FT = 96;
const PLAYER_R = 20;
const TAU = Math.PI * 2;

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const norm = (a: number): number => ((a % TAU) + TAU) % TAU;
const float = (tk: BossToolkit, x: number, y: number, text: string, color: string): void => tk.host.showFloatingText(x, y, text, color);
const live = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;
const segDist = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : clampN(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
type Gfx = Phaser.GameObjects.Graphics;

/** A dotted line, for every path he lets you see before it is used. */
const dotted = (g: Gfx, x1: number, y1: number, x2: number, y2: number, color: number, a: number, step = 14): void => {
  const len = dist(x1, y1, x2, y2);
  for (let d = 0; d < len; d += step) {
    const f = d / len;
    g.fillStyle(color, a); g.fillCircle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 2);
  }
};

// ── I. The Deal ──────────────────────────────────────────────────────
// He deals you a hand of rules. Each card flies to a slot along the edge of the room and stands
// there face-up; while it stands, its rule holds. Three blows strike a card off.

const theDeal = (tk: BossToolkit): SignatureMove => {
  const SLOTS: Pt[] = [
    { x: 120, y: tk.H - 52 }, { x: 330, y: tk.H - 52 }, { x: 630, y: tk.H - 52 }, { x: 840, y: tk.H - 52 },
    { x: 46, y: 300 }, { x: tk.W - 46, y: 300 },
  ];
  const RULE: Record<Suit, string> = {
    spade: 'SPADES — HIS BLOWS CUT DEEPER', heart: 'HEARTS — HE HEALS', diamond: 'DIAMONDS — YOU DRAG YOUR FEET', club: 'CLUBS — HE IS HARD TO HURT',
  };
  interface Rule { suit: Suit; slot: number; x: number; y: number; born: number; lands: number; hp: number; t: StrikeTarget | null; offAt: number }
  let rules: Rule[] = [];
  let baseScale = 0;
  let healAt = 0;
  const liveRule = (s: Suit, time: number): boolean => rules.some((r) => r.suit === s && r.offAt === 0 && time >= r.lands);
  const dealOne = (time: number, delay: number) => {
    const free = [0, 1, 2, 3, 4, 5].filter((i) => !rules.some((r) => r.slot === i && r.offAt === 0));
    const suits = (['spade', 'heart', 'diamond', 'club'] as Suit[]).filter((s) => !rules.some((r) => r.suit === s && r.offAt === 0));
    if (!free.length || !suits.length) return;
    const slot = free[Math.floor(Math.random() * free.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const p = SLOTS[slot];
    const r: Rule = { suit, slot, x: p.x, y: p.y, born: time + delay, lands: time + delay + 600, hp: 3, t: null, offAt: 0 };
    rules.push(r);
    tk.schedule(delay + 600, () => {
      if (r.offAt) return;
      float(tk, r.x, r.y - 70, RULE[r.suit], r.suit === 'heart' || r.suit === 'diamond' ? '#ff8a8a' : '#e8e8f0');
      tk.sfx('snap-back');
      r.t = tk.spawnTarget({
        x: r.x, y: r.y - 20, r: 32,
        onStruck: () => {
          if (r.offAt) return;
          r.hp -= 1;
          tk.sfx('slash');
          if (r.hp <= 0) {
            r.offAt = tk.now;
            r.t?.remove(); r.t = null;
            float(tk, r.x, r.y - 70, 'STRUCK OFF', '#ffe08a');
            tk.sfx('crystal-shatter');
          }
        },
      });
    });
  };
  return {
    durationMs: 1700,
    windupMs: 900,
    gesture: 'point',
    tell: 'THE DEAL',
    cast(time) {
      const n = rules.filter((r) => r.offAt === 0).length;
      dealOne(time, 0);
      if (n < 2) dealOne(time, 260);
      tk.sfx('whoosh');
    },
    update(time) {
      if (baseScale === 0) baseScale = tk.damageScale;
      tk.damageScale = baseScale * (liveRule('spade', time) ? 1.3 : 1);
      if (liveRule('diamond', time)) tk.slowPlayer(0.72, 200);
      if (liveRule('heart', time) && time >= healAt) { healAt = time + 1000; tk.healBoss(4); }
      rules = rules.filter((r) => r.offAt === 0 || time - r.offAt < 700);
    },
    takenMult() { return liveRule('club', tk.now) ? 0.55 : 1; },
    drawGround(g, time) {
      for (const r of rules) {
        if (r.offAt || time < r.lands) continue;
        // A gilt thread from the card to the dealer: the rule binding the table.
        const c = r.suit === 'heart' || r.suit === 'diamond' ? CARD_RED : IVORY;
        g.lineStyle(2, c, 0.18 + Math.sin(time / 200 + r.slot) * 0.08);
        g.lineBetween(r.x, r.y - 30, tk.bossX, tk.bossY);
        g.fillStyle(c, 0.1); g.fillCircle(r.x, r.y - 20, 46);
      }
    },
    drawAir(g, time) {
      for (const r of rules) {
        if (time < r.born) continue;
        if (r.offAt) {
          // Struck off: it spins away and tears.
          const k = (time - r.offAt) / 700;
          playingCard(g, r.x + k * 40, r.y - 30 - k * 80, 54, 76, k * 6, { suit: r.suit, pips: 1 }, 1 - k);
          continue;
        }
        const k = clampN((time - r.born) / 600, 0, 1);
        const x = tk.bossX + (r.x - tk.bossX) * k, y = tk.bossY + (r.y - 30 - tk.bossY) * k - Math.sin(k * Math.PI) * 60;
        playingCard(g, x, y, 54, 76, (1 - k) * 8, k < 1 ? 'back' : { suit: r.suit, pips: 1 }, 1, k < 1 ? Math.cos(k * 8) : 1);
        if (k >= 1) {
          for (let i = 0; i < 3 - r.hp; i++) {
            g.lineStyle(2, CARD_BLACK, 0.8);
            g.lineBetween(x - 20 + i * 14, y - 30, x - 8 + i * 14, y + 30);
          }
        }
      }
    },
    onPhaseEnd() {
      for (const r of rules) r.t?.remove();
      rules = [];
      if (baseScale) tk.damageScale = baseScale;
    },
  };
};

// ── I. The Riffle ────────────────────────────────────────────────────
// He splits the deck and riffles the halves together through you: two streams of cards fly at
// each other along one line, interleaving where you stand. The line is drawn first. Three times,
// turning.

const riffle = (tk: BossToolkit): SignatureMove => {
  const SPEED = 540;
  const HALF = 330;
  interface Card { x: number; y: number; vx: number; vy: number; born: number; life: number; spin: number }
  interface Line { cx: number; cy: number; a: number; warnEnd: number; born: number; lastHit: number }
  let cards: Card[] = [];
  let lines: Line[] = [];
  const throwLine = (a: number) => {
    const p = tk.player;
    const l: Line = { cx: p.x, cy: p.y, a, born: tk.now, warnEnd: tk.now + tk.warn(760), lastHit: 0 };
    lines.push(l);
    tk.sfx('whoosh');
    for (let i = 0; i < 9; i++) {
      for (const side of [-1, 1]) {
        tk.schedule(tk.warn(760) + i * 62 + (side > 0 ? 31 : 0), () => {
          const ox = l.cx + Math.cos(l.a) * HALF * side, oy = l.cy + Math.sin(l.a) * HALF * side;
          cards.push({ x: ox, y: oy, vx: -Math.cos(l.a) * SPEED * side, vy: -Math.sin(l.a) * SPEED * side, born: tk.now, life: (HALF * 2) / SPEED * 1000, spin: Math.random() * TAU });
          if (i % 3 === 0) tk.sfx('snap-back');
        });
      }
    }
  };
  return {
    durationMs: 3000,
    windupMs: 800,
    gesture: 'clap',
    tell: 'THE RIFFLE',
    cast() {
      const a0 = Math.random() * Math.PI;
      throwLine(a0);
      tk.schedule(950, () => throwLine(a0 + Math.PI / 3));
      tk.schedule(1900, () => throwLine(a0 + (Math.PI * 2) / 3));
    },
    update(time, dt) {
      const p = tk.player;
      for (const c of cards) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 14;
        if (live(tk) && dist(c.x, c.y, p.x, p.y) < PLAYER_R + 9) {
          const l = lines[lines.length - 1];
          if (!l || time - l.lastHit > 450) {
            if (l) l.lastHit = time;
            tk.hitPlayer(10, p.x, p.y);
          }
          c.life = 0;
        }
      }
      cards = cards.filter((c) => time - c.born < c.life);
      lines = lines.filter((l) => time - l.born < tk.warn(760) + 1400);
    },
    drawGround(g, time) {
      for (const l of lines) {
        if (time > l.warnEnd + 700) continue;
        const k = clampN((time - l.born) / Math.max(1, l.warnEnd - l.born), 0, 1);
        const x1 = l.cx - Math.cos(l.a) * HALF, y1 = l.cy - Math.sin(l.a) * HALF;
        const x2 = l.cx + Math.cos(l.a) * HALF, y2 = l.cy + Math.sin(l.a) * HALF;
        g.lineStyle(26, CARD_RED, 0.06 + k * 0.1); g.lineBetween(x1, y1, x2, y2);
        dotted(g, x1, y1, x2, y2, IVORY, 0.3 + k * 0.4);
        // The bridge of the riffle: an arch of cards over the line, closing as it comes due.
        for (let i = 0; i <= 12; i++) {
          const f = i / 12;
          const h = Math.sin(f * Math.PI) * 50 * (1 - k * 0.7);
          const x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f - h;
          g.fillStyle(i % 2 ? CARD_RED_DEEP : IVORY, 0.3 + k * 0.3); g.fillRect(x - 3, y - 5, 6, 10);
        }
      }
    },
    drawAir(g) {
      for (const c of cards) playingCard(g, c.x, c.y, 16, 22, c.spin, 'back');
    },
    onPhaseEnd() { cards = []; lines = []; },
  };
};

// ── I. The Rake ──────────────────────────────────────────────────────
// His croupier's rake, the length of the room, drags across the felt toward him and draws you
// with it. The blade has one slot in it where the chips pass through — stand in the slot.

const theRake = (tk: BossToolkit): SignatureMove => {
  const SPEED = 240;
  const GAP_HALF = 64;
  let on = false;
  let y = 0, prevY = 0;
  let startAt = 0;
  let gapX = 0;
  let endY = 0;
  let hit = false;
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'sweep',
    hold: 'draw',
    tell: 'THE RAKE',
    cast(time) {
      on = true;
      hit = false;
      y = prevY = tk.H - 40;
      endY = tk.bossY + 60;
      const px = tk.player.x;
      gapX = clampN(px + (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 110), 90, tk.W - 90);
      startAt = time + tk.warn(950);
      tk.sfx('trap-set');
    },
    update(time, dt) {
      if (!on || time < startAt) return;
      if (time - startAt < 40) { tk.pull(tk.bossX, tk.bossY, 80, 1500); tk.sfx('whoosh'); }
      prevY = y;
      y -= SPEED * dt;
      const p = tk.player;
      if (!hit && live(tk) && p.y <= prevY + PLAYER_R && p.y >= y - PLAYER_R && Math.abs(p.x - gapX) > GAP_HALF - 14) {
        hit = true;
        tk.hitPlayer(17, p.x, p.y);
        float(tk, p.x, p.y - 44, 'RAKED IN', '#ffe08a');
      }
      if (y <= endY) on = false;
    },
    drawGround(g, time) {
      if (!on) return;
      const k = time < startAt ? clampN(1 - (startAt - time) / tk.warn(950), 0, 1) : 1;
      // Where the blade will pass: the felt darkens, except the slot.
      g.fillStyle(0x000000, 0.08 + k * 0.12); g.fillRect(0, endY, tk.W, y - endY);
      g.fillStyle(GILT_LIT, 0.08 + k * 0.12); g.fillRect(gapX - GAP_HALF, endY, GAP_HALF * 2, y - endY);
      g.lineStyle(2, GILT_LIT, 0.5); g.lineBetween(gapX - GAP_HALF, endY, gapX - GAP_HALF, y); g.lineBetween(gapX + GAP_HALF, endY, gapX + GAP_HALF, y);
    },
    drawAir(g, time) {
      if (!on) return;
      const shake = time < startAt ? 0 : Math.sin(time / 30) * 1.5;
      // The shaft runs back to his hand.
      rake(g, tk.bossX, tk.bossY, gapX, y - 8);
      for (const [x0, x1] of [[0, gapX - GAP_HALF], [gapX + GAP_HALF, tk.W]]) {
        g.fillStyle(0x000000, 0.3); g.fillRect(x0, y + 6, x1 - x0, 8);
        g.fillStyle(CARD_BLACK, 1); g.fillRect(x0, y - 8 + shake, x1 - x0, 14);
        g.fillStyle(GILT, 1); g.fillRect(x0, y + 4 + shake, x1 - x0, 3);
        g.fillStyle(lit(CARD_BLACK, 0.25), 1); g.fillRect(x0, y - 8 + shake, x1 - x0, 2);
      }
      // Chips skidding ahead of the blade.
      if (time >= startAt) {
        for (let i = 0; i < 14; i++) {
          const x = (i * 71 + 30) % tk.W;
          if (Math.abs(x - gapX) < GAP_HALF) continue;
          chip(g, x, y - 16 - (i % 3) * 4, 5, [CARD_RED, CARD_BLACK, GILT][i % 3]);
        }
      }
    },
    onPhaseEnd() { on = false; },
  };
};

// ── II. Roulette ─────────────────────────────────────────────────────
// The room is the wheel. Once he spins it, it keeps turning under you for the rest of the game
// and carries you round. Each spin the ball runs the rim, drops on a number, and that wedge —
// from the hub to the rim — is struck. The pocket lights before it bites.

const WHEEL_C = { x: 480, y: 368 };
const WHEEL_R = 300;
const WEDGES = 13;
const WSTEP = TAU / WEDGES;

const roulette = (tk: BossToolkit): SignatureMove => {
  const OMEGA = 0.32;
  let on = false;
  let phi = 0;
  interface Spin { born: number; dropAt: number; fireAt: number; a: number; v: number; pocket: number[]; fired: boolean }
  let spins: Spin[] = [];
  const wedgeAt = (x: number, y: number): number => Math.floor(norm(Math.atan2(y - WHEEL_C.y, x - WHEEL_C.x) - phi) / WSTEP) % WEDGES;
  const wedgeColor = (i: number): number => (i === 0 ? POCKET_GREEN : i % 2 ? CARD_RED : CARD_BLACK);
  return {
    durationMs: 3400,
    windupMs: 700,
    gesture: 'raise',
    tell: 'ROULETTE',
    cast(time) {
      if (!on) { on = true; tk.sfx('gear-turn'); }
      const p = tk.player;
      const mine = wedgeAt(p.x, p.y);
      const pick = (mine + (Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : WEDGES - 1)) % WEDGES;
      const pocket = [pick];
      if (tk.hard) pocket.push((pick + Math.floor(WEDGES / 2)) % WEDGES);
      spins.push({ born: time, dropAt: time + 2000, fireAt: time + 2000 + tk.warn(1000), a: Math.random() * TAU, v: -7, pocket, fired: false });
      tk.sfx('whoosh');
    },
    update(time, dt) {
      if (!on) return;
      phi += OMEGA * dt;
      // The turning floor carries you.
      const p = tk.player;
      const r = dist(p.x, p.y, WHEEL_C.x, WHEEL_C.y);
      if (live(tk) && r < WHEEL_R && r > 24) {
        const a = Math.atan2(p.y - WHEEL_C.y, p.x - WHEEL_C.x);
        const d = OMEGA * r * dt * 0.8;
        p.x = clampN(p.x - Math.sin(a) * d, 40, tk.W - 40);
        p.y = clampN(p.y + Math.cos(a) * d, FT + 20, tk.H - 40);
      }
      for (const s of spins) {
        if (time < s.dropAt) {
          s.a += s.v * dt;
          s.v *= Math.pow(0.55, dt);
          if (time + 16 >= s.dropAt) tk.sfx('dice');
        }
        if (!s.fired && time >= s.fireAt) {
          s.fired = true;
          tk.sfx('explosion-medium');
          if (live(tk) && dist(p.x, p.y, WHEEL_C.x, WHEEL_C.y) < WHEEL_R + PLAYER_R && s.pocket.includes(wedgeAt(p.x, p.y))) {
            tk.hitPlayer(22, p.x, p.y);
            float(tk, p.x, p.y - 44, 'YOUR NUMBER CAME UP', '#ffe08a');
          }
          for (const i of s.pocket) {
            for (let k = 1; k <= 4; k++) {
              const a = phi + (i + 0.5) * WSTEP;
              tk.boom(WHEEL_C.x + Math.cos(a) * k * 70, WHEEL_C.y + Math.sin(a) * k * 70, 40, GILT_LIT);
            }
          }
        }
      }
      spins = spins.filter((s) => time < s.fireAt + 600);
    },
    drawGround(g, time) {
      if (!on) return;
      for (let i = 0; i < WEDGES; i++) {
        const a0 = phi + i * WSTEP;
        let alpha = 0.2;
        let c = wedgeColor(i);
        for (const s of spins) {
          if (!s.pocket.includes(i) || time < s.dropAt) continue;
          const k = clampN((time - s.dropAt) / Math.max(1, s.fireAt - s.dropAt), 0, 1);
          alpha = 0.3 + k * 0.4;
          if (time < s.fireAt && Math.floor(time / 100) % 2 === 0) c = GILT_LIT;
          if (time >= s.fireAt) { c = GILT_LIT; alpha = 0.6 * (1 - (time - s.fireAt) / 600); }
        }
        g.fillStyle(c, alpha);
        g.slice(WHEEL_C.x, WHEEL_C.y, WHEEL_R, a0, a0 + WSTEP, false); g.fillPath();
        g.lineStyle(2, GILT, 0.35);
        g.lineBetween(WHEEL_C.x, WHEEL_C.y, WHEEL_C.x + Math.cos(a0) * WHEEL_R, WHEEL_C.y + Math.sin(a0) * WHEEL_R);
        // The numbers lighting, round the rim, as the ball passes them.
        const m = { x: WHEEL_C.x + Math.cos(a0 + WSTEP / 2) * (WHEEL_R - 26), y: WHEEL_C.y + Math.sin(a0 + WSTEP / 2) * (WHEEL_R - 26) };
        const passing = spins.some((s) => time < s.dropAt && Math.abs(Math.atan2(Math.sin(s.a - (a0 + WSTEP / 2)), Math.cos(s.a - (a0 + WSTEP / 2)))) < WSTEP);
        g.fillStyle(passing ? GILT_LIT : IVORY, passing ? 0.95 : 0.45); g.fillCircle(m.x, m.y, 8);
        g.fillStyle(wedgeColor(i), 0.9); g.fillCircle(m.x, m.y, 4);
      }
      g.lineStyle(4, GILT, 0.5); g.strokeCircle(WHEEL_C.x, WHEEL_C.y, WHEEL_R);
      g.lineStyle(2, GILT_DARK, 0.5); g.strokeCircle(WHEEL_C.x, WHEEL_C.y, WHEEL_R - 44);
      g.fillStyle(MAHOGANY, 0.7); g.fillCircle(WHEEL_C.x, WHEEL_C.y, 30);
      for (let k = 0; k < 4; k++) {
        const a = phi + (k / 4) * TAU;
        g.lineStyle(4, GILT, 0.8); g.lineBetween(WHEEL_C.x, WHEEL_C.y, WHEEL_C.x + Math.cos(a) * 28, WHEEL_C.y + Math.sin(a) * 28);
      }
    },
    drawAir(g, time) {
      for (const s of spins) {
        if (time >= s.fireAt) continue;
        const pocketA = phi + (s.pocket[0] + 0.5) * WSTEP;
        const a = time < s.dropAt ? s.a : pocketA;
        const r = time < s.dropAt ? WHEEL_R - 12 : WHEEL_R - 26;
        const x = WHEEL_C.x + Math.cos(a) * r, y = WHEEL_C.y + Math.sin(a) * r;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 3, y + 8, 24, 8);
        g.fillStyle(IVORY_SHADE, 1); g.fillCircle(x, y, 11);
        g.fillStyle(IVORY, 1); g.fillCircle(x - 1.5, y - 1.5, 9);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 4, y - 4, 3);
      }
    },
    onPhaseEnd() { on = false; spins = []; },
  };
};

// ── II. Inside Bets ──────────────────────────────────────────────────
// The felt becomes a betting layout — three rows of twelve numbers. He tosses his chips onto
// it: a straight, a split, a street, a corner, a six-line, each over the squares round you.
// Each bet pays in turn; every square it covers is struck.

const insideBets = (tk: BossToolkit): SignatureMove => {
  const X0 = 60, Y0 = 140, CW = 70, CH = 160, COLS = 12, ROWS = 3;
  interface Bet { cells: [number, number][]; name: string; chipAt: Pt; born: number; fireAt: number; fired: boolean }
  let bets: Bet[] = [];
  let layoutUntil = 0;
  const cellOf = (x: number, y: number): [number, number] => [clampN(Math.floor((x - X0) / CW), 0, COLS - 1), clampN(Math.floor((y - Y0) / CH), 0, ROWS - 1)];
  const shapes: { name: string; cells: [number, number][] }[] = [
    { name: 'STRAIGHT', cells: [[0, 0]] },
    { name: 'SPLIT', cells: [[0, 0], [1, 0]] },
    { name: 'STREET', cells: [[0, -1], [0, 0], [0, 1]] },
    { name: 'CORNER', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { name: 'SIX LINE', cells: [[0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]] },
  ];
  const place = (i: number) => {
    const p = tk.player;
    const [cx, cy] = cellOf(p.x, p.y);
    const s = shapes[(i * 2 + Math.floor(Math.random() * 3)) % shapes.length];
    const dx = Math.random() < 0.5 ? 0 : -1;
    const cells = s.cells
      .map(([a, b]): [number, number] => [clampN(cx + a + (s.cells.length > 1 ? dx : 0), 0, COLS - 1), clampN(cy + b, 0, ROWS - 1)])
      .filter((c, k, arr) => arr.findIndex((o) => o[0] === c[0] && o[1] === c[1]) === k);
    const mx = cells.reduce((a, c) => a + c[0], 0) / cells.length, my = cells.reduce((a, c) => a + c[1], 0) / cells.length;
    bets.push({ cells, name: s.name, chipAt: { x: X0 + (mx + 0.5) * CW, y: Y0 + (my + 0.5) * CH }, born: tk.now, fireAt: tk.now + tk.warn(1150), fired: false });
    tk.sfx('money');
  };
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'point',
    tell: 'INSIDE BETS',
    cast(time) {
      layoutUntil = time + 3600;
      place(0);
      tk.schedule(420, () => place(1));
      tk.schedule(840, () => place(2));
    },
    update(time) {
      const p = tk.player;
      for (const b of bets) {
        if (b.fired || time < b.fireAt) continue;
        b.fired = true;
        const [px, py] = cellOf(p.x, p.y);
        const inside = p.x >= X0 && p.x <= X0 + COLS * CW && p.y >= Y0 && p.y <= Y0 + ROWS * CH;
        if (live(tk) && inside && b.cells.some(([cx, cy]) => cx === px && cy === py)) {
          tk.hitPlayer(17, p.x, p.y);
          float(tk, p.x, p.y - 44, `${b.name} PAYS`, '#ffe08a');
        }
        for (const [cx, cy] of b.cells) tk.boom(X0 + (cx + 0.5) * CW, Y0 + (cy + 0.5) * CH, 46, GILT);
        tk.sfx('explosion-small');
      }
      bets = bets.filter((b) => time < b.fireAt + 500);
    },
    drawGround(g, time) {
      if (time < layoutUntil) {
        const k = clampN((layoutUntil - time) / 400, 0, 1);
        g.lineStyle(2, IVORY, 0.25 * k);
        for (let c = 0; c <= COLS; c++) g.lineBetween(X0 + c * CW, Y0, X0 + c * CW, Y0 + ROWS * CH);
        for (let r = 0; r <= ROWS; r++) g.lineBetween(X0, Y0 + r * CH, X0 + COLS * CW, Y0 + r * CH);
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            const red = (c * 3 + r) % 2 === 0;
            g.fillStyle(red ? CARD_RED : CARD_BLACK, 0.5 * k);
            g.fillPoints([
              { x: X0 + (c + 0.5) * CW, y: Y0 + (r + 0.5) * CH - 12 }, { x: X0 + (c + 0.5) * CW + 8, y: Y0 + (r + 0.5) * CH },
              { x: X0 + (c + 0.5) * CW, y: Y0 + (r + 0.5) * CH + 12 }, { x: X0 + (c + 0.5) * CW - 8, y: Y0 + (r + 0.5) * CH },
            ], true, true);
          }
        }
      }
      for (const b of bets) {
        const k = clampN((time - b.born) / Math.max(1, b.fireAt - b.born), 0, 1);
        for (const [cx, cy] of b.cells) {
          const x = X0 + cx * CW, y = Y0 + cy * CH;
          if (time >= b.fireAt) { g.fillStyle(GILT_LIT, 0.5 * (1 - (time - b.fireAt) / 500)); g.fillRect(x, y, CW, CH); continue; }
          g.fillStyle(GILT, 0.1 + k * 0.25); g.fillRect(x + 2, y + 2, CW - 4, CH - 4);
          g.fillStyle(GILT_LIT, 0.4); g.fillRect(x + 2, y + 2, (CW - 4), (CH - 4) * k * 0.08 + 2);
          g.lineStyle(2, k > 0.8 && Math.floor(time / 90) % 2 === 0 ? CARD_RED : GILT_LIT, 0.8); g.strokeRect(x + 2, y + 2, CW - 4, CH - 4);
        }
      }
    },
    drawAir(g, time) {
      for (const b of bets) {
        if (time >= b.fireAt) continue;
        // The chip flies from his hand to the bet and lands as a stack.
        const k = clampN((time - b.born) / 300, 0, 1);
        const x = tk.bossX + (b.chipAt.x - tk.bossX) * k, y = tk.bossY + (b.chipAt.y - tk.bossY) * k - Math.sin(k * Math.PI) * 50;
        if (k < 1) chip(g, x, y, 10, GILT);
        else chipStack(g, b.chipAt.x, b.chipAt.y + 8, 2 + b.cells.length, b.cells.length > 3 ? CARD_RED : GILT, 10);
      }
    },
    onPhaseEnd() { bets = []; layoutUntil = 0; },
  };
};

// ── II. Payout ───────────────────────────────────────────────────────
// He pays out, the way a croupier pushes winnings: three towers of chips slide across the felt at
// you in a fan, and where each stops it topples forward into a spray of loose chips.

const payout = (tk: BossToolkit): SignatureMove => {
  interface Tower { x: number; y: number; a: number; speed: number; startAt: number; stopAt: number; ox: number; oy: number; hit: boolean; toppled: boolean; color: number }
  interface Loose { x: number; y: number; vx: number; vy: number; born: number; color: number; spin: number }
  let towers: Tower[] = [];
  let loose: Loose[] = [];
  const TRAVEL = 440;
  return {
    durationMs: 3000,
    windupMs: 800,
    gesture: 'punch',
    tell: 'PAYOUT',
    cast(time) {
      const base = tk.angleToPlayer();
      [-0.38, 0, 0.38].forEach((d, i) => {
        const a = base + d;
        const startAt = time + tk.warn(760) + i * 120;
        towers.push({ x: tk.bossX, y: tk.bossY, ox: tk.bossX, oy: tk.bossY, a, speed: 330, startAt, stopAt: startAt + (TRAVEL / 330) * 1000, hit: false, toppled: false, color: [CARD_RED, GILT, CARD_BLACK][i] });
      });
      tk.sfx('money');
    },
    update(time, dt) {
      const p = tk.player;
      for (const t of towers) {
        if (time < t.startAt || t.toppled) continue;
        if (time < t.stopAt) {
          t.x = clampN(t.x + Math.cos(t.a) * t.speed * dt, 30, tk.W - 30);
          t.y = clampN(t.y + Math.sin(t.a) * t.speed * dt, FT + 20, tk.H - 30);
          if (!t.hit && live(tk) && dist(p.x, p.y, t.x, t.y) < PLAYER_R + 24) { t.hit = true; tk.hitPlayer(14, p.x, p.y); }
        } else {
          t.toppled = true;
          tk.sfx('clang');
          for (let k = -3; k <= 3; k++) {
            const a = t.a + k * 0.2;
            loose.push({ x: t.x, y: t.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, born: time, color: t.color, spin: k });
          }
        }
      }
      for (const c of loose) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (live(tk) && dist(c.x, c.y, p.x, p.y) < PLAYER_R + 7) { tk.hitPlayer(7, p.x, p.y); c.born = -9999; }
      }
      loose = loose.filter((c) => time - c.born < 1500 && c.x > -20 && c.x < tk.W + 20 && c.y > FT - 20 && c.y < tk.H + 20);
      towers = towers.filter((t) => !t.toppled || time < t.stopAt + 400);
    },
    drawGround(g, time) {
      for (const t of towers) {
        if (time >= t.startAt) continue;
        const k = clampN(1 - (t.startAt - time) / tk.warn(760), 0, 1);
        const ex = t.ox + Math.cos(t.a) * TRAVEL, ey = t.oy + Math.sin(t.a) * TRAVEL;
        g.lineStyle(48, t.color, 0.05 + k * 0.1); g.lineBetween(t.ox, t.oy, ex, ey);
        dotted(g, t.ox, t.oy, ex, ey, GILT_LIT, 0.3 + k * 0.5);
        // The fan it will topple into.
        g.fillStyle(t.color, 0.08 + k * 0.08); g.slice(ex, ey, 140, t.a - 0.62, t.a + 0.62, false); g.fillPath();
      }
    },
    drawAir(g, time) {
      for (const t of towers) {
        if (t.toppled) {
          const k = (time - t.stopAt) / 400;
          for (let i = 0; i < 6; i++) chip(g, t.x + Math.cos(t.a) * i * 9 * k, t.y + Math.sin(t.a) * i * 9 * k, 9, t.color, 1 - k);
          continue;
        }
        chipStack(g, t.x, t.y + 10, 9, t.color, 13);
      }
      for (const c of loose) chip(g, c.x, c.y, 7, c.color);
    },
    onPhaseEnd() { towers = []; loose = []; },
  };
};

// ── III. Loaded Dice ─────────────────────────────────────────────────
// Giant dice drop round you; each lands showing a face and its pips tick away one by one, and at
// none it bursts. Stand by the sixes and leave the twos. But the dice are his, and one of them
// turns itself over after it lands — it wobbles first. A six that turns over is a one.

const loadedDice = (tk: BossToolkit): SignatureMove => {
  const TICK = 560;
  const BLAST = 96;
  interface D { x: number; y: number; face: number; lands: number; nextTick: number; cheat: boolean; wobbleAt: number; turned: boolean; burstAt: number }
  let dice: D[] = [];
  return {
    durationMs: 4200,
    windupMs: 800,
    gesture: 'raise',
    tell: 'LOADED DICE',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      const a0 = Math.random() * TAU;
      const faces = [6, 5, 4, 3, 2, 6].slice(0, n).sort(() => Math.random() - 0.5);
      const highs = faces.map((f, i) => (f >= 5 ? i : -1)).filter((i) => i >= 0);
      const cheat = highs[Math.floor(Math.random() * highs.length)];
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * TAU;
        const r = 150 + (i % 2) * 40;
        const lands = time + tk.warn(900) + i * 90;
        dice.push({
          x: tk.clampX(p.x + Math.cos(a) * r, 50), y: tk.clampY(p.y + Math.sin(a) * r, 50), face: faces[i], lands, nextTick: lands + TICK,
          cheat: i === cheat, wobbleAt: lands + 700, turned: false, burstAt: 0,
        });
      }
      tk.sfx('dice');
    },
    update(time) {
      const p = tk.player;
      for (const d of dice) {
        if (d.burstAt || time < d.lands) continue;
        if (time - d.lands < 20) { tk.sfx('stone-slam'); if (live(tk) && dist(p.x, p.y, d.x, d.y) < PLAYER_R + 30) tk.hitPlayer(10, p.x, p.y); }
        if (d.cheat && !d.turned && time >= d.wobbleAt + tk.warn(560)) {
          d.turned = true;
          d.face = Math.max(1, 7 - d.face);
          d.nextTick = time + TICK;
          float(tk, d.x, d.y - 60, 'LOADED', '#ff8a8a');
          tk.sfx('dice');
        }
        if (time >= d.nextTick && !(d.cheat && !d.turned && time >= d.wobbleAt)) {
          d.face -= 1;
          d.nextTick = time + TICK;
          tk.sfx('clock-tick');
          if (d.face <= 0) {
            d.burstAt = time;
            tk.explode(d.x, d.y, BLAST, 18, IVORY);
          }
        }
      }
      dice = dice.filter((d) => !d.burstAt || time - d.burstAt < 400);
    },
    drawGround(g, time) {
      for (const d of dice) {
        if (d.burstAt) continue;
        if (time < d.lands) {
          const k = clampN(1 - (d.lands - time) / tk.warn(900), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(d.x, d.y + 8, 30 + k * 40, 12 + k * 14);
          continue;
        }
        // The burst ring tightens with every pip that goes.
        const urgent = d.face <= 2;
        g.lineStyle(2, urgent ? CARD_RED : IVORY, urgent ? 0.8 : 0.35); g.strokeCircle(d.x, d.y, BLAST);
        g.fillStyle(urgent ? CARD_RED : IVORY, urgent ? 0.18 : 0.05); g.fillCircle(d.x, d.y, BLAST);
        for (let i = 0; i < Math.max(0, d.face); i++) {
          const a = -Math.PI / 2 + (i / 6) * TAU;
          g.fillStyle(GILT_LIT, 0.8); g.fillCircle(d.x + Math.cos(a) * (BLAST - 8), d.y + Math.sin(a) * (BLAST - 8), 4);
        }
      }
    },
    drawAir(g, time) {
      for (const d of dice) {
        if (d.burstAt) {
          const k = (time - d.burstAt) / 400;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            g.fillStyle(IVORY, 1 - k); g.fillRect(d.x + Math.cos(a) * k * 80 - 4, d.y - 20 + Math.sin(a) * k * 60 - 4, 8, 8);
          }
          continue;
        }
        if (time < d.lands) {
          const k = clampN(1 - (d.lands - time) / tk.warn(900), 0, 1);
          die(g, d.x, d.y - 40 - (1 - k) * 360, 52, d.face, (1 - k) * 4, k, true);
          continue;
        }
        const wob = d.cheat && !d.turned && time >= d.wobbleAt ? Math.sin(time / 35) * 0.25 : 0;
        die(g, d.x, d.y - 26, 52, Math.max(1, d.face), wob, 1, true);
        if (wob) { g.lineStyle(2, GILT_LIT, 0.6 + Math.sin(time / 50) * 0.3); g.strokeCircle(d.x + 18, d.y - 52, 6); g.lineBetween(d.x + 12, d.y - 52, d.x + 24, d.y - 52); }
      }
    },
    onPhaseEnd() { dice = []; },
  };
};

// ── III. Snake Eyes ──────────────────────────────────────────────────
// He throws a pair off the walls: two huge dice tumble across the room along paths he shows you,
// bouncing twice, flattening what they cross. They stop on ones — snake eyes — and each eye
// glares a lane at you.

const snakeEyes = (tk: BossToolkit): SignatureMove => {
  const SPEED = 520;
  interface Th { pts: Pt[]; startAt: number; total: number; hit: boolean; at: Pt; done: boolean; doneAt: number }
  let throws: Th[] = [];
  const path = (x: number, y: number, a: number, len: number): Pt[] => {
    const pts: Pt[] = [{ x, y }];
    let left = len, vx = Math.cos(a), vy = Math.sin(a);
    for (let b = 0; b < 3 && left > 0; b++) {
      const tx = vx > 0 ? (tk.W - 40 - x) / vx : vx < 0 ? (40 - x) / vx : Infinity;
      const ty = vy > 0 ? (tk.H - 40 - y) / vy : vy < 0 ? (FT + 30 - y) / vy : Infinity;
      const t = Math.min(tx, ty, left);
      x += vx * t; y += vy * t; left -= t;
      pts.push({ x, y });
      if (t === tx) vx = -vx; else if (t === ty) vy = -vy;
    }
    return pts;
  };
  const along = (pts: Pt[], d: number): Pt => {
    for (let i = 1; i < pts.length; i++) {
      const l = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d <= l) { const f = l === 0 ? 0 : d / l; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f }; }
      d -= l;
    }
    return pts[pts.length - 1];
  };
  const lengthOf = (pts: Pt[]): number => pts.slice(1).reduce((a, p, i) => a + dist(pts[i].x, pts[i].y, p.x, p.y), 0);
  return {
    durationMs: 3800,
    windupMs: 800,
    gesture: 'sweep',
    tell: 'SNAKE EYES',
    cast(time) {
      const a = tk.angleToPlayer();
      for (const d of [-0.5, 0.5]) {
        const pts = path(tk.bossX, tk.bossY, a + d, 980);
        throws.push({ pts, startAt: time + tk.warn(750), total: lengthOf(pts), hit: false, at: pts[0], done: false, doneAt: 0 });
      }
      tk.sfx('dice');
    },
    update(time) {
      const p = tk.player;
      for (const t of throws) {
        if (time < t.startAt || t.done) continue;
        const d = ((time - t.startAt) / 1000) * SPEED;
        t.at = along(t.pts, Math.min(d, t.total));
        if (!t.hit && live(tk) && dist(p.x, p.y, t.at.x, t.at.y) < PLAYER_R + 30) { t.hit = true; tk.hitPlayer(14, p.x, p.y); }
        if (d >= t.total) {
          t.done = true;
          t.doneAt = time;
          tk.sfx('stone-slam');
          const ang = Math.atan2(p.y - t.at.y, p.x - t.at.x);
          tk.spawnLane({ x: t.at.x, y: t.at.y, angle: ang, halfW: 22, warnMs: tk.warn(820), damage: 16 });
        }
      }
      throws = throws.filter((t) => !t.done || time - t.doneAt < 1800);
    },
    drawGround(g, time) {
      for (const t of throws) {
        if (time >= t.startAt) continue;
        const k = clampN(1 - (t.startAt - time) / tk.warn(750), 0, 1);
        for (let i = 1; i < t.pts.length; i++) dotted(g, t.pts[i - 1].x, t.pts[i - 1].y, t.pts[i].x, t.pts[i].y, IVORY, 0.25 + k * 0.5, 18);
        for (let i = 1; i < t.pts.length - 1; i++) { g.lineStyle(2, GILT_LIT, 0.6); g.strokeCircle(t.pts[i].x, t.pts[i].y, 12); }
      }
    },
    drawAir(g, time) {
      for (const t of throws) {
        if (time < t.startAt) continue;
        if (!t.done) { die(g, t.at.x, t.at.y - 20, 58, 1 + (Math.floor(time / 80) % 6), time / 90, 1, true); continue; }
        const k = clampN((time - t.doneAt) / 1800, 0, 1);
        die(g, t.at.x, t.at.y - 20, 58, 1, 0, 1 - k * 0.6, true);
        // The eye in the pip opens.
        g.fillStyle(CARD_RED, 0.5 + Math.sin(time / 60) * 0.3); g.fillEllipse(t.at.x, t.at.y - 20, 16, 8);
        g.fillStyle(CARD_BLACK, 1); g.fillEllipse(t.at.x, t.at.y - 20, 4, 8);
      }
    },
    onPhaseEnd() { throws = []; },
  };
};

// ── III. The Shell Game ──────────────────────────────────────────────
// Three brass dice cups by you; he shows you which one has the live die under it, then shuffles
// them — swap, swap, swap. Follow it. When they lift, the die goes off.

const shellGame = (tk: BossToolkit): SignatureMove => {
  const SHOW = 900, SWAP = 400, SWAPS = 5;
  const BLAST = 118;
  let on = false;
  let start = 0;
  let slots: Pt[] = [];
  let cupAt: number[] = [0, 1, 2];  // cup i sits in slot cupAt[i]
  let live1 = 0;                    // the cup with the die
  let swaps: [number, number][] = [];
  let liftAt = 0, boomAt = 0, boomed = false;
  const cupPos = (i: number, time: number): Pt => {
    const s = Math.floor((time - start - SHOW) / SWAP);
    if (time < start + SHOW || s >= swaps.length) return slots[cupAt[i]];
    // Replay swaps up to s from the starting arrangement.
    const arr = [0, 1, 2];
    for (let k = 0; k < s; k++) { const [a, b] = swaps[k]; const ia = arr.indexOf(a), ib = arr.indexOf(b); arr[ia] = b; arr[ib] = a; }
    const [a, b] = swaps[s];
    const f = clampN((time - start - SHOW - s * SWAP) / SWAP, 0, 1);
    const e = f * f * (3 - 2 * f);
    const mySlot = arr[i];
    if (mySlot !== a && mySlot !== b) return slots[mySlot];
    const to = mySlot === a ? b : a;
    const p0 = slots[mySlot], p1 = slots[to];
    const lift = Math.sin(e * Math.PI) * (mySlot === a ? 46 : -46);
    return { x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e + lift };
  };
  const finalSlot = (i: number): number => {
    const arr = [0, 1, 2];
    for (const [a, b] of swaps) { const ia = arr.indexOf(a), ib = arr.indexOf(b); arr[ia] = b; arr[ib] = a; }
    return arr[i];
  };
  return {
    durationMs: 4000,
    windupMs: 700,
    gesture: 'clap',
    tell: 'THE SHELL GAME',
    cast(time) {
      const p = tk.player;
      const cy = tk.clampY(p.y, 80);
      const cx = clampN(p.x, 200, tk.W - 200);
      slots = [{ x: cx - 150, y: cy }, { x: cx, y: cy }, { x: cx + 150, y: cy }];
      cupAt = [0, 1, 2];
      live1 = Math.floor(Math.random() * 3);
      swaps = [];
      for (let k = 0; k < SWAPS; k++) { const a = Math.floor(Math.random() * 3); swaps.push([a, (a + 1 + Math.floor(Math.random() * 2)) % 3]); }
      start = time;
      liftAt = time + SHOW + SWAPS * SWAP + 150;
      boomAt = liftAt + tk.warn(560);
      boomed = false;
      on = true;
      tk.sfx('dice');
    },
    update(time) {
      if (!on) return;
      if (time >= start + SHOW && time < liftAt && Math.floor((time - start - SHOW) / SWAP) !== Math.floor((time - 16 - start - SHOW) / SWAP)) tk.sfx('whoosh');
      if (!boomed && time >= boomAt) {
        boomed = true;
        const s = slots[finalSlot(live1)];
        tk.explode(s.x, s.y, BLAST, 22, GILT_LIT);
        tk.sfx('explosion-large');
      }
      if (time > boomAt + 500) on = false;
    },
    drawGround(g, time) {
      if (!on) return;
      for (const s of slots) { g.fillStyle(0x000000, 0.2); g.fillEllipse(s.x, s.y + 10, 70, 20); }
      if (time >= liftAt && !boomed) {
        const s = slots[finalSlot(live1)];
        const k = clampN((time - liftAt) / Math.max(1, boomAt - liftAt), 0, 1);
        g.fillStyle(CARD_RED, 0.1 + k * 0.25); g.fillCircle(s.x, s.y, BLAST);
        g.lineStyle(3, CARD_RED, 0.6 + k * 0.4); g.strokeCircle(s.x, s.y, BLAST);
      }
    },
    drawAir(g, time) {
      if (!on || boomed) return;
      for (let i = 0; i < 3; i++) {
        const pos = time >= liftAt ? slots[finalSlot(i)] : cupPos(i, time);
        const showing = time < start + SHOW && i === live1;
        const lifted = time >= liftAt || showing;
        const up = lifted ? (showing ? Math.sin(clampN((time - start) / SHOW, 0, 1) * Math.PI) * 54 : clampN((time - liftAt) / 200, 0, 1) * 60) : 0;
        if (i === live1 && (showing || time >= liftAt)) {
          die(g, pos.x, pos.y - 12, 30, 6, 0, 1, true);
          g.fillStyle(CARD_RED, 0.3 + Math.sin(time / 60) * 0.2); g.fillCircle(pos.x, pos.y - 12, 26);
        }
        // A brass cup, upturned: flared rim, banded body, a little knob.
        const x = pos.x, y = pos.y - up;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, pos.y + 6, 60, 14);
        g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 30, y + 4, x + 30, y + 4, x, y - 70);
        g.fillStyle(GILT, 1); g.fillRect(x - 24, y - 48, 48, 50);
        g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y + 2, 64, 14);
        g.fillStyle(GILT_LIT, 1); g.fillRect(x - 24, y - 48, 48, 4); g.fillRect(x - 24, y - 20, 48, 3);
        g.fillStyle(lit(GILT, 0.3), 0.7); g.fillRect(x - 16, y - 44, 5, 40);
        g.fillStyle(GILT, 1); g.fillEllipse(x, y - 50, 50, 10);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y - 58, 6);
        wheelSeal(g, x, y - 30, 8, GILT_DARK, 0.9);
      }
    },
    onPhaseEnd() { on = false; },
  };
};

// ── IV. All In ───────────────────────────────────────────────────────
// He pushes his health into the middle. A pot builds between you; for seven seconds every hit you
// land on him and every hit he lands on you goes into it, tallied either side. At the bell the one
// who landed more takes it out of the other.

const allIn = (tk: BossToolkit): SignatureMove => {
  const RUN = 7000;
  let on = false;
  let endAt = 0;
  let yours = 0, his = 0;
  let lastHp = -1;
  let potX = 0, potY = 0;
  let winUntil = 0;
  let settleAt = 0;
  let settled: 'you' | 'him' | 'split' | null = null;
  return {
    durationMs: 1800,
    windupMs: 900,
    gesture: 'flex',
    tell: 'ALL IN',
    cast(time) {
      if (on) { endAt += 1500; float(tk, potX, potY - 60, 'RAISE', '#ffe08a'); return; }
      on = true;
      endAt = time + RUN;
      yours = 0; his = 0;
      lastHp = tk.player.hp;
      potX = (tk.bossX + tk.player.x) / 2; potY = (tk.bossY + tk.player.y) / 2;
      settled = null;
      tk.sfx('money');
    },
    update(time, dt) {
      const p = tk.player;
      if (lastHp >= 0 && on && p.hp < lastHp) his += lastHp - p.hp;
      lastHp = p.hp;
      if (!on) return;
      potX += ((tk.bossX + p.x) / 2 - potX) * Math.min(1, dt * 2);
      potY += ((tk.bossY + p.y) / 2 - potY) * Math.min(1, dt * 2);
      if (time >= endAt) {
        on = false;
        settleAt = time;
        const pot = Math.round(yours + his);
        if (yours > his) {
          settled = 'you';
          winUntil = time + 5000;
          float(tk, potX, potY - 60, `THE POT IS YOURS — ${pot}`, '#9affc8');
          tk.spawnHealOrb(potX - 30, potY, 12);
          tk.spawnHealOrb(potX + 30, potY, 12);
          tk.sfx('jackpot');
        } else if (his > yours) {
          settled = 'him';
          float(tk, potX, potY - 60, `THE HOUSE TAKES THE POT — ${pot}`, '#ff8a8a');
          const dmg = clampN(Math.round(8 + pot * 0.12), 10, 22);
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * TAU + Math.random();
            tk.spawnZone({ x: tk.clampX(p.x + Math.cos(a) * (k === 0 ? 0 : 90)), y: tk.clampY(p.y + Math.sin(a) * (k === 0 ? 0 : 90)), radius: 70, warnMs: tk.warn(900 + k * 120), damage: dmg, fall: true });
          }
          tk.sfx('money');
        } else {
          settled = 'split';
          float(tk, potX, potY - 60, 'SPLIT POT', '#f2e8d0');
        }
      }
    },
    onBossHurt(amount) { if (on) yours += amount; },
    takenMult() { return tk.now < winUntil ? 1.8 : 1; },
    drawGround(g, time) {
      if (!on && time - settleAt > 700) return;
      // The pot on the felt: a gilt dish, the chips piling higher as it grows.
      const pot = yours + his;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(potX, potY + 10, 90, 26);
      g.fillStyle(GILT_DARK, 1); g.fillEllipse(potX, potY + 4, 84, 24);
      g.fillStyle(GILT, 1); g.fillEllipse(potX, potY, 80, 20);
      g.lineStyle(2, tk.now < winUntil ? 0x9affc8 : GILT_LIT, 0.7); g.lineBetween(potX, potY, tk.bossX, tk.bossY); g.lineBetween(potX, potY, tk.player.x, tk.player.y);
      void time;
      const n = Math.min(14, 2 + Math.floor(pot / 10));
      for (let i = 0; i < n; i++) chipStack(g, potX - 26 + (i % 5) * 13, potY + 2 - Math.floor(i / 5) * 4, 2 + (i % 3), [CARD_RED, CARD_BLACK, GILT, IVORY][i % 4], 6);
    },
    drawAir(g, time) {
      if (!on) {
        if (settled === 'you' && time < winUntil) {
          // While he pays, coins fall on him.
          for (let i = 0; i < 6; i++) {
            const ph = ((time / 600) + i / 6) % 1;
            g.fillStyle(GILT_LIT, 1 - ph); g.fillEllipse(tk.bossX - 30 + i * 12, tk.bossY - 70 + ph * 60, 8, 5);
          }
        }
        return;
      }
      const k = clampN((endAt - time) / RUN, 0, 1);
      // Two tallies over the pot: yours (left, green) and his (right, red), and the bell's fuse.
      const total = Math.max(1, yours + his);
      const x0 = potX - 70, y0 = potY - 70;
      g.fillStyle(MAHOGANY_DEEP, 0.85); g.fillRoundedRect(x0 - 6, y0 - 8, 152, 26, 6);
      g.fillStyle(0x6ad89a, 1); g.fillRect(x0, y0, 140 * (yours / total), 10);
      g.fillStyle(CARD_RED, 1); g.fillRect(x0 + 140 * (yours / total), y0, 140 * (his / total), 10);
      g.fillStyle(GILT_LIT, 1); g.fillRect(x0, y0 + 12, 140 * k, 3);
      // The bell.
      const bx = potX, by = y0 - 22 + (k < 0.15 ? Math.sin(time / 30) * 2 : 0);
      g.fillStyle(GILT, 1); g.fillTriangle(bx - 10, by + 8, bx + 10, by + 8, bx, by - 10);
      g.fillStyle(GILT_LIT, 1); g.fillCircle(bx, by + 10, 3);
    },
    onPhaseEnd() { on = false; winUntil = 0; settled = null; },
  };
};

// ── IV. Raise ────────────────────────────────────────────────────────
// He raises, and raises again: one line of chips across the room through you, then two crossing,
// then four — the stake doubling each time. Each set is laid where you are standing.

const raise = (tk: BossToolkit): SignatureMove => {
  interface Mark { x: number; y: number; a: number; born: number; fireAt: number }
  let marks: Mark[] = [];
  const lay = (n: number) => {
    const p = tk.player;
    const a0 = Math.random() * Math.PI;
    const w = tk.warn(760);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI;
      tk.spawnLane({ x: p.x, y: p.y, angle: a, halfW: 20, warnMs: w, damage: 15 });
      marks.push({ x: p.x, y: p.y, a, born: tk.now, fireAt: tk.now + w });
    }
    float(tk, p.x, p.y - 56, n === 1 ? 'RAISE' : `RAISE ×${n}`, '#ffe08a');
    tk.sfx('money');
  };
  return {
    durationMs: 3000,
    windupMs: 700,
    gesture: 'raise',
    tell: 'RAISE',
    cast() {
      lay(1);
      tk.schedule(820, () => lay(2));
      tk.schedule(1640, () => lay(4));
    },
    update(time) { marks = marks.filter((m) => time < m.fireAt + 500); },
    drawGround(g, time) {
      for (const m of marks) {
        // Chips stacked where each line meets the edge of the felt.
        const k = clampN((time - m.born) / Math.max(1, m.fireAt - m.born), 0, 1);
        for (const s of [-1, 1]) {
          const r = 330;
          const x = clampN(m.x + Math.cos(m.a) * r * s, 30, tk.W - 30), y = clampN(m.y + Math.sin(m.a) * r * s, FT + 20, tk.H - 20);
          chipStack(g, x, y, 2 + Math.floor(k * 6), GILT, 9);
        }
      }
    },
    onPhaseEnd() { marks = []; },
  };
};

// ── IV. Twenty-One ───────────────────────────────────────────────────
// "Hit me," he says, for you. Cards come down where you stand, one after another, their values
// adding up over your head. Over twenty-one you bust, and the hand bursts outward in a ring —
// one gap in it, on your side. Twenty-one exactly is blackjack, and the House pays itself.

const twentyOne = (tk: BossToolkit): SignatureMove => {
  interface C { x: number; y: number; v: number; suit: Suit; born: number; lands: number }
  let cards: C[] = [];
  let total = 0;
  let showUntil = 0;
  let last: Pt = { x: 0, y: 0 };
  const deal = () => {
    const p = tk.player;
    const v = 2 + Math.floor(Math.random() * 10);
    const w = tk.warn(640);
    cards.push({ x: p.x, y: p.y, v, suit: (['spade', 'heart', 'club', 'diamond'] as Suit[])[Math.floor(Math.random() * 4)], born: tk.now, lands: tk.now + w });
    tk.spawnZone({ x: p.x, y: p.y, radius: 54, warnMs: w, damage: 10 });
    last = { x: p.x, y: p.y };
    tk.schedule(w, () => {
      total += v;
      showUntil = tk.now + 2200;
      tk.sfx('snap-back');
      if (total > 21) {
        float(tk, last.x, last.y - 70, `${total} — BUST`, '#ff8a8a');
        const pa = Math.atan2(tk.player.y - last.y, tk.player.x - last.x);
        tk.spawnRing({ cx: last.x, cy: last.y, delayMs: 500, speed: 320, gapCentre: pa, gapHalf: 0.5, band: 16, damage: 16, startRadius: 40 });
        tk.sfx('explosion-medium');
      } else if (total === 21) {
        float(tk, tk.bossX, tk.bossY - 70, 'BLACKJACK — THE HOUSE PAYS ITSELF', '#ffe08a');
        tk.healBoss(20);
        tk.sfx('jackpot');
      } else {
        float(tk, last.x, last.y - 70, `${total}`, '#f2e8d0');
        tk.schedule(160, () => deal());
      }
    });
  };
  return {
    durationMs: 4200,
    windupMs: 700,
    gesture: 'point',
    tell: 'TWENTY-ONE',
    cast() { total = 0; cards = []; deal(); },
    update(time) { cards = cards.filter((c) => time < c.lands + 2200); },
    drawAir(g, time) {
      for (const c of cards) {
        if (time < c.lands) {
          const k = clampN((time - c.born) / Math.max(1, c.lands - c.born), 0, 1);
          playingCard(g, c.x, c.y - 30 - (1 - k) * 320, 44, 62, (1 - k) * 5, k < 0.6 ? 'back' : { suit: c.suit, pips: Math.min(6, c.v) }, 1, k < 0.6 ? 1 : Math.abs(Math.cos((k - 0.6) * 4)));
        } else {
          const f = clampN((time - c.lands) / 2200, 0, 1);
          playingCard(g, c.x, c.y - 8, 44, 62, (c.v % 3 - 1) * 0.2, { suit: c.suit, pips: Math.min(6, c.v) }, 1 - f);
        }
      }
      if (time < showUntil) {
        // The running count as a row of gilt pips over his hand.
        const n = Math.min(26, total);
        for (let i = 0; i < n; i++) {
          g.fillStyle(i >= 21 ? CARD_RED : GILT_LIT, 1);
          g.fillCircle(tk.bossX - 50 + (i % 13) * 8, tk.bossY - 74 + Math.floor(i / 13) * 8, 3);
        }
      }
    },
    onPhaseEnd() { cards = []; total = 0; },
  };
};

// ── V. The House Always Wins (hard) ──────────────────────────────────
// The Wheel on the ceiling turns. When it stops he rewrites the last thing that happened: UNDO
// (your last hit on him is healed back) or DEAL BACK (it is thrown back at you, a gilt bolt —
// dodge it). Land a small hit just before it stops, and a small hit is all he gets.

const rewrite = (tk: BossToolkit): SignatureMove => {
  let seen = false;
  let spinUntil = 0;
  let spinStart = 0;
  let lastHit = 0;
  let outcome: 'undo' | 'back' | null = null;
  let outcomeAt = 0;
  let wheelA = 0;
  interface Bolt { x: number; y: number; a: number; dmg: number; born: number }
  let bolts: Bolt[] = [];
  const CX = 480, CY = FT + 44;
  return {
    durationMs: 2900,
    windupMs: 500,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'THE HOUSE ALWAYS WINS',
    cast(time) {
      seen = true;
      spinStart = time;
      spinUntil = time + tk.warn(2200);
      outcome = null;
      tk.sfx('gear-turn');
    },
    update(time, dt) {
      if (!seen) return;
      wheelA += dt * (time < spinUntil ? 7 * clampN((spinUntil - time) / 1200, 0.2, 1) : 0.3);
      if (spinUntil && time >= spinUntil && outcome === null) {
        outcome = Math.random() < 0.5 ? 'undo' : 'back';
        outcomeAt = time;
        spinUntil = 0;
        const amt = Math.round(Math.min(outcome === 'undo' ? 40 : 26, lastHit));
        if (amt <= 0) { float(tk, CX, CY + 60, 'NOTHING TO REWRITE', '#c8b890'); }
        else if (outcome === 'undo') {
          tk.healBoss(amt);
          float(tk, tk.bossX, tk.bossY - 70, `UNDONE — ${amt}`, '#ffe08a');
          tk.sfx('time-warp');
        } else {
          bolts.push({ x: tk.bossX, y: tk.bossY, a: tk.angleToPlayer(), dmg: Math.max(6, amt), born: time });
          float(tk, tk.bossX, tk.bossY - 70, `DEALT BACK — ${amt}`, '#ff8a8a');
          tk.sfx('judgement');
        }
        lastHit = 0;
      }
      const p = tk.player;
      for (const b of bolts) {
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        const d = Math.atan2(Math.sin(want - b.a), Math.cos(want - b.a));
        b.a += clampN(d, -1.1 * dt, 1.1 * dt);
        b.x += Math.cos(b.a) * 300 * dt; b.y += Math.sin(b.a) * 300 * dt;
        if (live(tk) && dist(b.x, b.y, p.x, p.y) < PLAYER_R + 12) { tk.hitPlayer(b.dmg, p.x, p.y); b.born = -99999; }
      }
      bolts = bolts.filter((b) => time - b.born < 3200 && b.x > -30 && b.x < tk.W + 30 && b.y > FT - 30 && b.y < tk.H + 30);
    },
    onBossHurt(amount) { lastHit = amount; },
    drawAir(g, time) {
      if (!seen) return;
      // The Wheel on the ceiling, hung over the table: half red UNDO, half black DEAL BACK.
      const r = 46;
      g.fillStyle(0x000000, 0.35); g.fillCircle(CX + 3, CY + 4, r + 6);
      g.fillStyle(MAHOGANY, 1); g.fillCircle(CX, CY, r + 6);
      for (let i = 0; i < 8; i++) {
        const a0 = wheelA + (i / 8) * TAU;
        g.fillStyle(i % 2 ? CARD_RED : CARD_BLACK, 1); g.slice(CX, CY, r, a0, a0 + TAU / 8, false); g.fillPath();
      }
      g.lineStyle(2, GILT, 1); g.strokeCircle(CX, CY, r); g.strokeCircle(CX, CY, r * 0.4);
      g.fillStyle(GILT_LIT, 1); g.fillCircle(CX, CY, 6);
      // The pointer, and what it is pointing at.
      g.fillStyle(GILT_LIT, 1); g.fillTriangle(CX - 8, CY - r - 12, CX + 8, CY - r - 12, CX, CY - r + 2);
      if (spinUntil && time < spinUntil && Math.floor(time / 120) % 2 === 0) { g.lineStyle(3, GILT_LIT, 0.7); g.strokeCircle(CX, CY, r + 10); }
      if (outcome && time - outcomeAt < 900) {
        const k = (time - outcomeAt) / 900;
        g.lineStyle(4, outcome === 'undo' ? CARD_RED : IVORY, 1 - k); g.strokeCircle(CX, CY, r + 10 + k * 40);
      }
      for (const b of bolts) {
        g.fillStyle(GILT, 0.3); g.fillCircle(b.x, b.y, 18);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(b.x, b.y, 9);
        for (let i = 1; i < 5; i++) { g.fillStyle(GILT, 0.4 / i); g.fillCircle(b.x - Math.cos(b.a) * i * 10, b.y - Math.sin(b.a) * i * 10, 8 - i); }
      }
    },
    onPhaseEnd() { seen = false; bolts = []; outcome = null; },
  };
};

// ── V. The Rigged Drum ───────────────────────────────────────────────
// The great drum spins and spits its Lots: the floor is a grid of numbers, and every number is
// called in three waves — every number but the favourites'. His favourites' squares are crowned.
// Stand on a crown.

const riggedDrum = (tk: BossToolkit): SignatureMove => {
  const COLS = 6, ROWS = 4;
  const X0 = 0, Y0 = FT + 8;
  const CW = tk.W / COLS, CH = (tk.H - Y0) / ROWS;
  interface Sq { c: number; r: number; wave: number; fireAt: number; fired: boolean }
  let squares: Sq[] = [];
  let crowns: number[] = [];
  let on = false;
  let born = 0;
  const idx = (c: number, r: number): number => r * COLS + c;
  return {
    durationMs: 3800,
    windupMs: 800,
    gesture: 'slam',
    tell: 'THE RIGGED DRUM',
    cast(time) {
      on = true;
      born = time;
      const p = tk.player;
      const pc = clampN(Math.floor((p.x - X0) / CW), 0, COLS - 1), pr = clampN(Math.floor((p.y - Y0) / CH), 0, ROWS - 1);
      // One favourite within reach of you; two elsewhere.
      const near = idx(clampN(pc + (Math.random() < 0.5 ? -1 : 1), 0, COLS - 1), clampN(pr + (Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1), 0, ROWS - 1));
      crowns = [near];
      while (crowns.length < 3) { const k = Math.floor(Math.random() * COLS * ROWS); if (!crowns.includes(k)) crowns.push(k); }
      squares = [];
      const rest: number[] = [];
      for (let k = 0; k < COLS * ROWS; k++) if (!crowns.includes(k)) rest.push(k);
      rest.sort(() => Math.random() - 0.5);
      rest.forEach((k, i) => {
        const wave = i % 3;
        squares.push({ c: k % COLS, r: Math.floor(k / COLS), wave, fireAt: time + tk.warn(1100) + wave * 650, fired: false });
      });
      tk.sfx('gear-turn');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      for (const s of squares) {
        if (s.fired || time < s.fireAt) continue;
        s.fired = true;
        const x = X0 + s.c * CW, y = Y0 + s.r * CH;
        if (live(tk) && p.x >= x && p.x < x + CW && p.y >= y && p.y < y + CH) { tk.hitPlayer(18, p.x, p.y); float(tk, p.x, p.y - 44, 'DRAWN', '#ff8a8a'); }
        if (s.c % 2 === s.r % 2) tk.sfx('clang');
      }
      if (squares.every((s) => s.fired) && time > born + 600) {
        if (squares.every((s) => time > s.fireAt + 400)) on = false;
      }
    },
    drawGround(g, time) {
      if (!on) return;
      for (let k = 0; k < COLS * ROWS; k++) {
        const c = k % COLS, r = Math.floor(k / COLS);
        const x = X0 + c * CW, y = Y0 + r * CH;
        if (crowns.includes(k)) {
          g.fillStyle(GILT, 0.18); g.fillRect(x + 4, y + 4, CW - 8, CH - 8);
          g.lineStyle(3, GILT_LIT, 0.8); g.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
          wheelSeal(g, x + CW / 2, y + CH / 2, 22, GILT_LIT, 0.9);
          continue;
        }
        const s = squares.find((q) => q.c === c && q.r === r);
        if (!s) continue;
        if (s.fired) { if (time - s.fireAt < 400) { g.fillStyle(CARD_RED, 0.5 * (1 - (time - s.fireAt) / 400)); g.fillRect(x, y, CW, CH); } continue; }
        const k2 = clampN(1 - (s.fireAt - time) / (tk.warn(1100) + s.wave * 650), 0, 1);
        g.fillStyle(CARD_RED, 0.05 + k2 * 0.22); g.fillRect(x + 4, y + 4, CW - 8, CH - 8);
        g.lineStyle(2, CARD_RED, 0.3 + k2 * 0.5); g.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
        // The Lot rolling in to claim it: a brass ball with its number.
        const bk = clampN((time - born) / 500, 0, 1);
        lotToken(g, x + CW / 2, y + CH / 2 - (1 - bk) * 60, 9 + s.wave * 2, 0.4 + k2 * 0.6);
      }
    },
    drawAir(g, time) {
      if (!on) return;
      // The drum by his hand: a brass cage turning, Lots tumbling in it.
      const x = tk.bossX + 54, y = tk.bossY - 30;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 30, 60, 12);
      g.lineStyle(3, GILT, 1); g.strokeCircle(x, y, 24);
      for (let k = 0; k < 6; k++) {
        const a = time / 160 + (k / 6) * TAU;
        g.lineStyle(2, GILT_DARK, 1); g.lineBetween(x + Math.cos(a) * 24, y + Math.sin(a) * 8, x - Math.cos(a) * 24, y - Math.sin(a) * 8);
        lotToken(g, x + Math.cos(a * 1.3) * 12, y + Math.sin(a * 1.7) * 10, 4);
      }
    },
    onPhaseEnd() { on = false; squares = []; crowns = []; },
  };
};

// ── V. The Black Chip ────────────────────────────────────────────────
// A busted croupier's black chip, flicked: it ricochets round the room and splits in two off every
// wall it strikes, until there are eight. Its first line is drawn.

const blackChipFlick = (tk: BossToolkit): SignatureMove => {
  interface Ch { x: number; y: number; vx: number; vy: number; born: number; gen: number; spin: number }
  let chips: Ch[] = [];
  let aims: { a: number; until: number }[] = [];
  const SPEED = 300;
  return {
    durationMs: 3200,
    windupMs: 600,
    gesture: 'punch',
    tell: 'THE BLACK CHIP',
    cast(time) {
      const base = tk.angleToPlayer();
      for (const d of [-0.25, 0.25]) {
        const a = base + d;
        const w = tk.warn(620);
        aims.push({ a, until: time + w });
        tk.schedule(w, () => chips.push({ x: tk.bossX, y: tk.bossY, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, born: tk.now, gen: 0, spin: 0 }));
      }
      tk.sfx('money');
    },
    update(time, dt) {
      const p = tk.player;
      const born: Ch[] = [];
      for (const c of chips) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 12;
        let bounced = false;
        if (c.x < 24 || c.x > tk.W - 24) { c.vx = -c.vx; c.x = clampN(c.x, 24, tk.W - 24); bounced = true; }
        if (c.y < FT + 14 || c.y > tk.H - 24) { c.vy = -c.vy; c.y = clampN(c.y, FT + 14, tk.H - 24); bounced = true; }
        if (bounced && chips.length + born.length < 8 && c.gen < 3) {
          c.gen += 1;
          const a = Math.atan2(c.vy, c.vx);
          c.vx = Math.cos(a - 0.3) * SPEED; c.vy = Math.sin(a - 0.3) * SPEED;
          born.push({ x: c.x, y: c.y, vx: Math.cos(a + 0.3) * SPEED, vy: Math.sin(a + 0.3) * SPEED, born: c.born, gen: c.gen, spin: 0 });
          tk.sfx('clang');
        }
        if (live(tk) && dist(c.x, c.y, p.x, p.y) < PLAYER_R + 10) { tk.hitPlayer(11, p.x, p.y); c.born = -99999; }
      }
      chips.push(...born);
      chips = chips.filter((c) => time - c.born < 5200);
      aims = aims.filter((a) => time < a.until);
    },
    drawGround(g, time) {
      for (const a of aims) {
        const k = clampN(1 - (a.until - time) / tk.warn(620), 0, 1);
        dotted(g, tk.bossX, tk.bossY, tk.bossX + Math.cos(a.a) * 600, tk.bossY + Math.sin(a.a) * 600, IVORY, 0.25 + k * 0.5, 16);
      }
    },
    drawAir(g) {
      for (const c of chips) {
        g.fillStyle(0x000000, 0.3); g.fillEllipse(c.x + 2, c.y + 8, 22, 7);
        g.fillStyle(CARD_BLACK, 0.25); g.fillCircle(c.x - c.vx * 0.04, c.y - c.vy * 0.04, 10);
        blackChip(g, c.x, c.y, 10);
        g.lineStyle(1.5, GILT_DARK, 0.9); g.lineBetween(c.x + Math.cos(c.spin) * 9, c.y + Math.sin(c.spin) * 9, c.x - Math.cos(c.spin) * 9, c.y - Math.sin(c.spin) * 9);
      }
    },
    onPhaseEnd() { chips = []; aims = []; },
  };
};

// ── The body ─────────────────────────────────────────────────────────

/**
 * Lucan over the rig: a dealer's green eyeshade under his crown, a black bow tie and a gilt-edged
 * waistcoat, his own Lot hung huge at his chest — the one that is never drawn — and white gloves.
 * What is in his hands changes with the game: a fan of cards, a spinning ball, dice walked over
 * the knuckles, a stack of chips; on hard, his visor cracks and a black chip hangs beside the Lot.
 */
function drawLucan(g: Gfx, s: BossBodyState): void {
  const { x, y, radius: r, t } = s;
  // Waistcoat front and gilt buttons.
  g.fillStyle(CARD_RED_DEEP, 0.85); g.fillTriangle(x - r * 0.5, y + r * 0.05, x + r * 0.5, y + r * 0.05, x, y + r * 0.85);
  for (let i = 0; i < 3; i++) { g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y + r * (0.3 + i * 0.16), 2.2); }
  // Bow tie.
  g.fillStyle(CARD_BLACK, 1);
  g.fillTriangle(x, y + r * 0.08, x - r * 0.28, y - r * 0.06, x - r * 0.28, y + r * 0.22);
  g.fillTriangle(x, y + r * 0.08, x + r * 0.28, y - r * 0.06, x + r * 0.28, y + r * 0.22);
  g.fillCircle(x, y + r * 0.08, 3);
  // The dealer's eyeshade, across the brow.
  g.fillStyle(LAMP_GREEN, 0.75); g.fillEllipse(x, y - r * 0.46, r * 1.5, r * 0.32);
  g.lineStyle(2, GILT, 1); g.strokeEllipse(x, y - r * 0.46, r * 1.5, r * 0.32);
  if (s.phaseIdx >= 4) {
    g.lineStyle(1.5, 0xffffff, 0.8); g.lineBetween(x - r * 0.2, y - r * 0.6, x - r * 0.05, y - r * 0.4); g.lineBetween(x - r * 0.05, y - r * 0.4, x + r * 0.15, y - r * 0.52);
    blackChip(g, x + r * 0.36, y + r * 0.6, 6);
  }
  // His Lot, the one that is never drawn.
  g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(x - r * 0.3, y + r * 0.2, x, y + r * 0.58); g.lineBetween(x + r * 0.3, y + r * 0.2, x, y + r * 0.58);
  lotToken(g, x, y + r * 0.62, 8);
  g.fillStyle(0xffffff, 0.6 + Math.sin(t / 300) * 0.3); g.fillCircle(x - 3, y + r * 0.58, 1.6);
  // White gloves.
  for (const h of s.hands) { g.fillStyle(0xf8f4ea, 0.85); g.fillCircle(h.x, h.y, 6); g.lineStyle(1, IVORY_SHADE, 1); g.strokeCircle(h.x, h.y, 6); }
  const [a, b] = [s.hands[0], s.hands[1] ?? s.hands[0]];
  switch (Math.min(s.phaseIdx, 4)) {
    case 0:
      for (let i = 0; i < 4; i++) playingCard(g, a.x + (i - 1.5) * 5, a.y - 10, 13, 18, -0.5 + i * 0.33, i === 3 ? { suit: 'spade', pips: 1 } : 'back');
      rake(g, b.x, b.y, b.x + Math.cos(s.facing) * 50, b.y + Math.sin(s.facing) * 50);
      break;
    case 1: {
      const a2 = t / 120;
      g.fillStyle(IVORY, 1); g.fillCircle(a.x + Math.cos(a2) * 10, a.y - 8 + Math.sin(a2) * 4, 4);
      chip(g, b.x, b.y - 6, 6, CARD_RED);
      break;
    }
    case 2:
      die(g, a.x + Math.sin(t / 200) * 6, a.y - 10, 12, 1 + (Math.floor(t / 400) % 6), Math.sin(t / 150), 1, true);
      die(g, b.x, b.y - 10, 12, 6, 0, 1, true);
      break;
    case 3:
      chipStack(g, a.x, a.y, 5, GILT, 6);
      chipStack(g, b.x, b.y, 5, CARD_RED, 6);
      break;
    default:
      suitPip(g, a.x, a.y - 12, 7, 'heart', CARD_RED);
      suitPip(g, b.x, b.y - 12, 7, 'spade', CARD_BLACK);
  }
}

/** The High Table: the whole arena is his felt, a mahogany rail round it, the Wheel's shadow above. */
function drawHighTable(g: Gfx, W: number, H: number): void {
  const rng = mulberry(0x1ca7);
  const top = FT;
  g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(0, top, W, H - top);
  g.fillStyle(MAHOGANY, 1); g.fillRoundedRect(8, top + 6, W - 16, H - top - 14, 34);
  g.fillStyle(MAHOGANY_LIT, 1); g.fillRoundedRect(12, top + 8, W - 24, 6, 3);
  g.fillStyle(BAIZE_DEEP, 1); g.fillRoundedRect(34, top + 30, W - 68, H - top - 62, 24);
  g.fillStyle(BAIZE, 1); g.fillRoundedRect(40, top + 36, W - 80, H - top - 74, 20);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle(rng() < 0.5 ? BAIZE_LIT : BAIZE_DEEP, 0.22);
    g.fillRect(42 + rng() * (W - 84), top + 38 + rng() * (H - top - 78), 2, 1);
  }
  g.lineStyle(3, GILT, 0.85); g.strokeRoundedRect(40, top + 36, W - 80, H - top - 74, 20);
  // Brass studs round the rail.
  for (let x = 40; x < W - 30; x += 40) { g.fillStyle(GILT_DARK, 1); g.fillCircle(x, top + 20, 3); g.fillCircle(x, H - 18, 3); }
  // The Wheel on the ceiling throws its shadow over the felt.
  const cx = W / 2, cy = (top + H) / 2;
  g.fillStyle(0x000000, 0.12); g.fillCircle(cx, cy, 250);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    g.lineStyle(10, 0x000000, 0.07); g.lineBetween(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
  }
  g.lineStyle(3, GILT, 0.25); g.strokeCircle(cx, cy, 250);
  wheelSeal(g, cx, cy, 70, GILT, 0.3);
  // His side of the table: the bank — towers of chips and a stacked shoe, facing the player's side.
  for (let i = 0; i < 9; i++) chipStack(g, 90 + i * 30, top + 70, 4 + (i * 5) % 6, [CARD_RED, CARD_BLACK, GILT, IVORY][i % 4], 9);
  for (let i = 0; i < 9; i++) chipStack(g, W - 330 + i * 30, top + 70, 4 + (i * 3) % 6, [GILT, IVORY, CARD_RED, CARD_BLACK][i % 4], 9);
  // The player's seat: an empty betting box, and the last stake left in it — a single brass Lot.
  g.lineStyle(2, IVORY, 0.3); g.strokeRect(cx - 40, H - 120, 80, 60);
  lotToken(g, cx, H - 90, 8, 0.8);
  // A few cards dropped on the felt from games gone by.
  for (let i = 0; i < 6; i++) {
    const x = 90 + rng() * (W - 180), y = top + 130 + rng() * (H - top - 260);
    if (dist(x, y, cx, cy) < 120) continue;
    playingCard(g, x, y, 26, 36, rng() * TAU, rng() < 0.5 ? 'back' : { suit: (['spade', 'heart', 'club', 'diamond'] as Suit[])[i % 4], pips: 1 + (i % 5) }, 0.55);
  }
  g.fillStyle(dim(BAIZE, 0.5), 0.2); g.fillRect(40, H - 70, W - 80, 30);
}

// ── Def ──────────────────────────────────────────────────────────────

export const LUCAN_BOSS: WorldBossDef = {
  worldId: 'isle:lucan',
  name: 'the Croupier-King Lucan',
  title: 'Dealer of the Draw, Sovereign of Lotterhaven',
  color: L_MAIN,
  colorLit: L_LIT,
  colorDark: L_DARK,
  accent: POCKET_GREEN,
  damageMult: 1.55,

  intro: [
    'Ah. A player. Do sit down. The High Table is always open, and you look like someone with something to lose.',
    'Six of my lucky children, sent home with empty pockets. My floor staff, all three. Quite a run of luck.',
    'Luck runs out. That is the only rule chance has. I am merely its dealer.',
  ],
  banter: [
    'I have never cheated in my life. I have only ever dealt.',
    'The drum is fair. Ask anyone whose number has not come up.',
    'Every Lot on the isle went into that drum. Mine is a keepsake. It does not count.',
    'You may buy a re-draw. Wager against the House. Go on. Somebody has to be first to win.',
    'The busted serve because they chose to play. Everyone chooses to play. Being born is a bet.',
    'Ante dealt too generously. Bullion counted too slowly. Gambit, though — Gambit saw you coming.',
    'Red or black? It does not matter. Green is mine.',
    'Chance is the only fair ruler. I simply hold its coat.',
  ],
  defeatLine: 'THE DRUM HAS A FALSE BOTTOM',
  resumeLine: 'Back for another hand? The table remembers. So do I. Shuffle up.',

  phases: [
    {
      name: 'The Deal',
      line: 'Your hand. Take a good look at it. Every card is a rule, and every rule is mine.',
      hp: 650,
      cycle: ['sig:deal', 'volley', 'sig:riffle', 'sig:rake', 'radial', 'sig:deal', 'sig:riffle', 'barrage', 'sig:rake'],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1100,
      harassMs: 3200,
    },
    {
      name: 'Roulette',
      line: 'Then let the wheel decide. It turns for everyone. It stops for whomever it likes.',
      hp: 700,
      cycle: ['sig:wheel', 'sig:bets', 'volley', 'sig:wheel', 'sig:payout', 'spiral', 'sig:bets', 'sig:wheel', 'sig:payout', 'lanes'],
      harass: ['h-orbs', 'h-rune'],
      restMs: 1000,
      harassMs: 3000,
    },
    {
      name: 'Loaded Dice',
      line: 'Dice, then. Honest ivory. I carved every face myself, and I chose every one.',
      hp: 750,
      cycle: ['sig:loaded', 'sig:snakeeyes', 'homing', 'sig:cups', 'sig:loaded', 'radial', 'sig:snakeeyes', 'sig:cups', 'barrage'],
      harass: ['h-snipe', 'h-mines'],
      restMs: 950,
      harassMs: 2800,
    },
    {
      name: 'All In',
      line: 'Very well. Everything I have, on the table. Everything you have, too. Let us see who blinks.',
      hp: 800,
      cycle: ['sig:allin', 'sig:raise', 'volley', 'sig:twentyone', 'sig:raise', 'charge', 'sig:allin', 'sig:twentyone', 'spiral'],
      harass: ['h-orbs', 'h-flak', 'h-lane'],
      restMs: 900,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE HOUSE ALWAYS WINS',
    extraPhase: {
      name: 'The House Always Wins',
      line: 'Enough of chance. I am the House. I do not need the wheel to tell me what happened.',
      hp: 640,
      cycle: ['sig:rewrite', 'sig:drum', 'volley', 'sig:blackchip', 'sig:rewrite', 'sig:drum', 'homing', 'sig:blackchip', 'sweep'],
      harass: ['h-rune', 'h-snipe'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.16 },
    radial: { count: 20 },
    lanes: { halfW: 28 },
  },

  signatures: {
    deal: theDeal,
    riffle,
    rake: theRake,
    wheel: roulette,
    bets: insideBets,
    payout,
    loaded: loadedDice,
    snakeeyes: snakeEyes,
    cups: shellGame,
    allin: allIn,
    raise,
    twentyone: twentyOne,
    rewrite,
    drum: riggedDrum,
    blackchip: blackChipFlick,
  },

  look: { crest: 'crown', pattern: 'grid', aura: 'coins', hands: 'ball', torsoR: 40, mouth: 'grin', eyes: 2, eyeColor: 0xffe8a8 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'gold', look: { pattern: 'rings', aura: 'coins' } },
    { movement: 'blink', gimmick: 'none', look: { pattern: 'facets', aura: 'sparks', hands: 'orb' } },
    { movement: 'rush', gimmick: 'none', tint: 'blood', look: { pattern: 'plates', aura: 'coins', mouth: 'maw' } },
    { movement: 'hover', gimmick: 'none', tint: 'void', look: { pattern: 'static', aura: 'glitch', eyes: 3, mouth: 'stitch' } },
  ],

  drawDecor: drawLucan,
  drawArena: drawHighTable,
};

