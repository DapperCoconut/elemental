import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { chessPiece, playingCard, SUITS, rankLabel, spiralDisc, type Suit } from './art';
import { CARD_RED, GILT, GILT_DARK, GILT_LIT, IVORY, MIND, MIND_LIT, VELVET } from './palette';
import { alive, clamp, dist, newMotion, track, wrapAngle } from './util';

/**
 * The Mind Court's goods: Orsola Glass's four charms, Prince Gambit's ivory king, and the séance
 * well's two fish. Every charm turns one of the readers' tricks to your side — a monocle that
 * sees where your foe is going, a mesmerist's watch, a teacup that will not stay on its saucer,
 * a card-sharp's chip. Scripts are registered below under their item ids.
 */

const ISLE = 'fate';

export const CHARM_MONOCLE = 'mind-charm-monocle';
export const CHARM_WATCH = 'mind-charm-watch';
export const CHARM_TEACUP = 'mind-charm-teacup';
export const CHARM_CHIP = 'mind-charm-chip';
export const ART_GAMBIT = 'art-gambit';

export const FISH_TROUT = 'fish-thought-trout';
export const FISH_BASS = 'fish-mindbender-bass';
export const FISHERY = 'mind-well';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Second-Sight Monocle ─────────────────────────────────────────────
// Every 6s a ghost of your foe is marked where they will be in 1.2s (read off how they are
// walking). If they are still on it when the moment comes, they were foreseen.

const monocle: ItemScriptFactory = (ctx) => {
  const m = newMotion();
  let last = -1;
  let nextAt = 0;
  let mark: { x: number; y: number; at: number; due: number } | null = null;
  let popAt = -9999;
  return {
    update(time, dt) {
      if (!foeLive(ctx)) return;
      if (last !== time) { last = time; track(m, ctx.npc.x, ctx.npc.y, dt); }
      if (nextAt === 0) nextAt = time + 3000;
      if (!mark && time >= nextAt && live(ctx)) {
        const lead = 1.2;
        mark = { x: clamp(m.x + m.vx * lead, 40, ctx.W - 40), y: clamp(m.y + m.vy * lead, 110, ctx.H - 40), at: time, due: time + lead * 1000 };
      }
      if (mark && time >= mark.due) {
        if (dist(ctx.npc.x, ctx.npc.y, mark.x, mark.y) < 64) {
          ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
          ctx.stun(ctx.npc, 500);
          ctx.float(ctx.npc.x, ctx.npc.y - 54, 'FORESEEN', '#e2ccff');
          ctx.sfx('crystal-chime');
          popAt = time;
        }
        mark = null;
        nextAt = time + 6000;
      }
    },
    drawGround(g, time) {
      if (!mark) return;
      const k = clamp((time - mark.at) / (mark.due - mark.at), 0, 1);
      g.lineStyle(2, MIND, 0.3 + k * 0.5); g.strokeCircle(mark.x, mark.y, 64 - k * 20);
      g.fillStyle(MIND_LIT, 0.12 + k * 0.18); g.fillEllipse(mark.x, mark.y - 8, 26, 32); g.fillCircle(mark.x, mark.y - 30, 9);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 14, y = p.y - 30;
      g.lineStyle(1, GILT_DARK, 1); g.lineBetween(x, y + 6, x - 4, y + 18);
      g.lineStyle(2, GILT, 1); g.strokeCircle(x, y, 6);
      g.fillStyle(MIND_LIT, mark ? 0.6 + Math.sin(time / 90) * 0.3 : 0.3); g.fillCircle(x, y, 4.5);
      if (time - popAt < 400) { const k = (time - popAt) / 400; g.lineStyle(3, MIND_LIT, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 20 + k * 30); }
    },
  };
};

// ── Mesmer's Pocket Watch ────────────────────────────────────────────
// A watch swings at your side. Keep your aim on your foe (within about 20°, 380px) and its face
// fills; full, they are held for 0.7s and take 6. Then it must wind down for 9s.

const watch: ItemScriptFactory = (ctx) => {
  let fill = 0;
  let restUntil = 0;
  let firedAt = -9999;
  return {
    update(time, dt) {
      if (!live(ctx) || !foeLive(ctx)) { fill = 0; return; }
      if (time < restUntil) return;
      const p = ctx.player, n = ctx.npc;
      const on = dist(p.x, p.y, n.x, n.y) < 380 && Math.abs(wrapAngle(ctx.facing(p) - Math.atan2(n.y - p.y, n.x - p.x))) < 0.35;
      fill = clamp(fill + (on ? dt / 2.2 : -dt / 3), 0, 1);
      if (fill >= 1) {
        fill = 0;
        restUntil = time + 9000;
        firedAt = time;
        ctx.stun(n, 700);
        ctx.hit(n, 6, n.x, n.y);
        ctx.float(n.x, n.y - 52, 'YOU ARE GETTING SLEEPY', '#e2ccff');
        ctx.sfx('hush');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const sw = Math.sin(time / 260) * 0.5;
      const ax = p.x - 18, ay = p.y - 12;
      const wx = ax + Math.sin(sw) * 16, wy = ay + Math.cos(sw) * 16;
      g.lineStyle(1, GILT_DARK, 1); g.lineBetween(ax, ay, wx, wy);
      g.fillStyle(GILT, 1); g.fillCircle(wx, wy, 6.5);
      g.fillStyle(IVORY, 1); g.fillCircle(wx, wy, 5);
      if (time < restUntil) { g.fillStyle(0x000000, 0.25); g.fillCircle(wx, wy, 5); }
      else if (fill > 0) { g.lineStyle(2, MIND, 1); g.beginPath(); g.arc(wx, wy, 4, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2, false); g.strokePath(); }
      if (time - firedAt < 1200 && foeLive(ctx)) spiralDisc(g, ctx.npc.x, ctx.npc.y - 50, 9, -time / 100, 1 - (time - firedAt) / 1200);
    },
  };
};

// ── Levitas's Teacup ─────────────────────────────────────────────────
// A teacup circles you. Every 4.5s it flies off along your aim; if it passes close by your foe
// it cracks against them for 10 and knocks them back, then floats home.

const teacup: ItemScriptFactory = (ctx) => {
  let a = 0;
  let flight: { x: number; y: number; vx: number; vy: number; t: number; hit: boolean } | null = null;
  let nextAt = 0;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      a += dt * 2.4;
      if (nextAt === 0) nextAt = time + 2500;
      const p = ctx.player;
      if (!flight && time >= nextAt) {
        const f = ctx.facing(p);
        flight = { x: p.x + Math.cos(a) * 26, y: p.y - 20 + Math.sin(a) * 10, vx: Math.cos(f) * 520, vy: Math.sin(f) * 520, t: 0, hit: false };
        ctx.sfx('whoosh');
      }
      if (flight) {
        flight.t += dt;
        flight.x += flight.vx * dt; flight.y += flight.vy * dt;
        if (!flight.hit && foeLive(ctx) && dist(flight.x, flight.y, ctx.npc.x, ctx.npc.y - 10) < 34) {
          flight.hit = true;
          const d = Math.hypot(flight.vx, flight.vy) || 1;
          ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
          ctx.nudge(ctx.npc, (flight.vx / d) * 50, (flight.vy / d) * 50);
          ctx.sfx('crystal-shatter');
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'CRASH', '#f4dc8a');
        }
        if (flight.hit || flight.t > 1.1 || flight.x < 0 || flight.x > ctx.W || flight.y < 96 || flight.y > ctx.H) { flight = null; nextAt = time + 4500; }
      }
    },
    drawAir(g) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = flight ? flight.x : p.x + Math.cos(a) * 26, y = flight ? flight.y : p.y - 20 + Math.sin(a) * 10;
      if (!flight) { g.fillStyle(GILT, 0.8); g.fillEllipse(x, y + 4, 16, 4); }
      glow(g, x, y, 14, MIND, 0.05, 2);
      g.fillStyle(IVORY, 1); g.fillEllipse(x, y, 12, 9); g.fillRect(x - 6, y - 4, 12, 4);
      g.lineStyle(1.5, IVORY, 1); g.strokeCircle(x + 7, y - 1, 3);
      g.fillStyle(CARD_RED, 1); g.fillCircle(x - 2, y, 1.4);
      g.fillStyle(GILT, 1); g.fillRect(x - 6, y - 4, 12, 1.2);
    },
  };
};

// ── Bluffer's Chip ───────────────────────────────────────────────────
// Every 8s you are dealt a card. A high card (9 or better) is a call: your next hit within 8s
// deals 14 more. A low card is a bluff: the next hit you take within 8s is half healed back.

const chip: ItemScriptFactory = (ctx) => {
  let card: { rank: number; suit: Suit; until: number } | null = null;
  let nextAt = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (nextAt === 0) nextAt = time + 2000;
      if (card && time > card.until) card = null;
      if (time >= nextAt) {
        nextAt = time + 8000;
        card = { rank: 2 + Math.floor(ctx.rng() * 13), suit: SUITS[Math.floor(ctx.rng() * 4)], until: time + 8000 };
        ctx.sfx('dice');
      }
    },
    onHitDealt(amount) {
      if (!card || card.rank < 9 || amount < 1 || !foeLive(ctx)) return;
      ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 52, `CALLED - ${rankLabel(card.rank)}`, '#f4dc8a');
      ctx.sfx('jackpot');
      card = null;
    },
    onHitTaken(amount) {
      if (!card || card.rank >= 9 || amount < 1 || !live(ctx)) return;
      const back = Math.min(15, Math.round(amount * 0.5));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 52, 'BLUFFED', '#b8ffd0');
      ctx.sfx('heal');
      card = null;
    },
    drawAir(g, time) {
      if (!live(ctx) || !card) return;
      const p = ctx.player;
      const bob = Math.sin(time / 280) * 2;
      playingCard(g, p.x - 26, p.y - 50 + bob, 14, card.rank, card.suit);
      g.lineStyle(1, card.rank >= 9 ? GILT_LIT : VELVET, 0.8); g.strokeCircle(p.x - 26, p.y - 50 + bob, 15);
    },
  };
};

// ── Gambit's Ivory King ──────────────────────────────────────────────
// Every 5th hit you land puts your foe in check: a rook's cross lights through where they stand.
// Still on either line 0.9s later, they take 16. Once a fight, under 30% health, you sacrifice:
// heal 26 and hit 40% harder for 5s.

const ivoryKing: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let check: { x: number; y: number; at: number } | null = null;
  let sacrificed = false;
  let sacAt = -9999;
  return {
    update(time) {
      if (check && time - check.at >= 900) {
        if (foeLive(ctx) && (Math.abs(ctx.npc.x - check.x) < 30 || Math.abs(ctx.npc.y - check.y) < 30)) {
          ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
          ctx.float(ctx.npc.x, ctx.npc.y - 54, 'CHECK', '#f0e6cc');
          ctx.sfx('judgement');
        }
        check = null;
      }
      if (!sacrificed && live(ctx) && ctx.player.hp / ctx.player.maxHp < 0.3) {
        sacrificed = true;
        sacAt = time;
        ctx.heal(ctx.player, 26);
        ctx.boostDamage(1.4, 5000);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'SACRIFICE', '#c6b2ff');
        ctx.sfx('boss-phase');
      }
    },
    onHitDealt(amount) {
      if (amount < 1 || !foeLive(ctx)) return;
      hits++;
      if (hits % 5 === 0 && !check) { check = { x: ctx.npc.x, y: ctx.npc.y, at: ctx.scene.time.now }; ctx.sfx('clang'); }
    },
    drawGround(g, time) {
      if (!check) return;
      const k = clamp((time - check.at) / 900, 0, 1);
      g.fillStyle(IVORY, 0.08 + k * 0.16);
      g.fillRect(0, check.y - 30, ctx.W, 60); g.fillRect(check.x - 30, 96, 60, ctx.H - 96);
      g.lineStyle(2, GILT, 0.4 + k * 0.5); g.strokeRect(check.x - 30, check.y - 30, 60, 60);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (time - sacAt < 5000) glow(g, p.x, p.y - 10, 34, MIND, 0.06, 2);
      chessPiece(g, p.x + 24, p.y - 22, 'king', !sacrificed, 0.4);
    },
  };
};

export const MIND_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_MONOCLE, name: 'Second-Sight Monocle', emoji: '🧐', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A cracked violet lens on a gilt chain. Ouija\'s first, before she learnt to do it without. It still looks ahead.',
    script: CHARM_MONOCLE,
    scriptText: [
      'Every 6s a ghost of your foe is marked where they will be 1.2s later, read from how they move.',
      'If they are within reach of it when the moment comes: 12 damage and a 0.5s stun.',
    ],
  },
  {
    id: CHARM_WATCH, name: 'Mesmer\'s Pocket Watch', emoji: '⏱️', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'Swoon\'s understudy watch. It ticks a little slower than it should, and you find yourself agreeing with it.',
    effect: { statusDurMult: 1.05 },
    script: CHARM_WATCH,
    scriptText: [
      'Keep your aim on your foe (within about 20°, 380px) for 2.2s and the watch face fills.',
      'Full: they are held for 0.7s and take 6. Then the watch winds down for 9s.',
    ],
  },
  {
    id: CHARM_TEACUP, name: 'Levitas\'s Teacup', emoji: '🍵', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'Bone china with a red rose on the side. It has never once stayed on its saucer. Levitas gave up asking.',
    script: CHARM_TEACUP,
    scriptText: [
      'A teacup circles you. Every 4.5s it flies off along your aim.',
      'Passing close by your foe it cracks against them for 10 and knocks them back, then floats home.',
    ],
  },
  {
    id: CHARM_CHIP, name: 'Bluffer\'s Chip', emoji: '🎴', kind: 'charm', price: 980, isle: ISLE,
    flavor: 'A black chip with a white eye painted on it. Tell carried it twenty years. He never once looked at it.',
    effect: { dodgeChance: 0.03 },
    script: CHARM_CHIP,
    scriptText: [
      'Every 8s you are dealt a card. 9 or better is a call: your next hit within 8s deals 14 more.',
      'Lower is a bluff: half of the next hit you take within 8s is healed back (up to 15).',
    ],
  },
  {
    id: ART_GAMBIT, name: 'Gambit\'s Ivory King', emoji: '♔', kind: 'artifact', isle: ISLE,
    flavor: 'The white king from the Prince\'s own board. He never lost it. He never once used it to win, either.',
    effect: { maxHp: 18 },
    script: ART_GAMBIT,
    scriptText: [
      'Every 5th hit you land puts your foe in check: still on its rank or file 0.9s later, they take 16.',
      'Once a fight, dropping under 30% health, you sacrifice: heal 26 and deal 40% more for 5s.',
    ],
  },
  {
    id: FISH_TROUT, name: 'Thought Trout', emoji: '🐟', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'Speckled with faint violet, and it rises to a fly before you have decided to cast. The well is full of them.',
    effect: { cooldownMult: 0.98 },
  },
  {
    id: FISH_BASS, name: 'Mindbender Bass', emoji: '🐠', kind: 'fish', sell: 72, isle: ISLE,
    flavor: 'A heavy bass with a spiral on each flank. Look at one too long and you forget which hand holds the rod.',
    effect: { critChance: 0.03 },
  },
];

export const MIND_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_MONOCLE]: monocle,
  [CHARM_WATCH]: watch,
  [CHARM_TEACUP]: teacup,
  [CHARM_CHIP]: chip,
  [ART_GAMBIT]: ivoryKing,
};

export const MIND_SHOPS: ShopDef[] = [
  { id: 'mind-shop', name: 'The Gazing Glass', stock: [CHARM_MONOCLE, CHARM_WATCH, CHARM_TEACUP, CHARM_CHIP], buys: true },
];

export const MIND_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Séance Well', kind: 'quantum' }];

export const MIND_FISH: FishDef[] = [
  { id: FISH_TROUT, fisheries: [FISHERY], weight: 6, fight: 2, size: [18, 42] },
  { id: FISH_BASS, fisheries: [FISHERY], weight: 2, fight: 4, size: [32, 66] },
];
