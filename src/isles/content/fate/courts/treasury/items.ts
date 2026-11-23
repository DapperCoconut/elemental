import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { coin, coinFlat, ledgerCard, weight } from './art';
import { BRASS, BRASS_DARK, CARD_RED, GOLD, GOLD_DARK, GOLD_LIT, GOLD_PALE, INK_GREEN, IRON_DARK, MOLTEN } from './palette';
import { alive, clamp, dist, segDist, wrapAngle } from './util';

/**
 * The Treasury Court's goods: Ottilie Ledgerwhite's four charms, Prince Bullion's gilt plate, and
 * the gilded pool's three fish. Every charm is a piece of the mint that plays one of the court's
 * own rules in your favour — the toss of a coin, the compounding ledger, the toll token, the
 * assayer's weight. Scripts are registered below under their item ids.
 */

const ISLE = 'fate';

export const CHARM_PENNY = 'treasury-charm-lucky-penny';
export const CHARM_LEDGER = 'treasury-charm-compound-ledger';
export const CHARM_TOKEN = 'treasury-charm-toll-token';
export const CHARM_PLUMB = 'treasury-charm-plumb-weight';
export const ART_BULLION = 'art-bullion';

export const FISH_IDE = 'fish-ingot-ide';
export const FISH_SUNFISH = 'fish-sovereign-sunfish';
export const FISH_DACE = 'fish-ducat-dace';
export const FISHERY = 'treasury-pool';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Lucky Penny ──────────────────────────────────────────────────────
// A penny flips over your head every 5s and lands. Heads: your next blow lands 12 harder.
// Tails: half of the next blow you take is given back to you.

const penny: ItemScriptFactory = (ctx) => {
  const EVERY = 5000, FLIP = 700;
  let flipAt = -1;
  let face: 'head' | 'tail' | null = null;
  let firedAt = -9999;
  return {
    update(time) {
      if (flipAt < 0) flipAt = time + 1200;
      if (time >= flipAt + FLIP && face === null) {
        face = ctx.rng() < 0.5 ? 'head' : 'tail';
        ctx.sfx('dice');
      }
      if (time >= flipAt + EVERY) { flipAt = time; face = null; }
    },
    onHitDealt(amount) {
      if (face !== 'head' || amount < 1 || !foeLive(ctx)) return;
      face = null;
      firedAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y - 30);
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'HEADS', '#ffe27a');
      ctx.sfx('jackpot');
    },
    onHitTaken(amount) {
      if (face !== 'tail' || amount < 1 || !live(ctx)) return;
      face = null;
      firedAt = ctx.scene.time.now;
      ctx.heal(ctx.player, Math.min(16, Math.round(amount * 0.5)));
      ctx.float(ctx.player.x, ctx.player.y - 56, 'TAILS', '#d8ffb0');
      ctx.sfx('heal');
    },
    drawAir(g, time) {
      if (!live(ctx) || flipAt < 0) return;
      const p = ctx.player;
      const x = p.x + 22, base = p.y - 46;
      const k = clamp((time - flipAt) / FLIP, 0, 1);
      if (k < 1) {
        coin(g, x, base - Math.sin(k * Math.PI) * 30, 6, 'gold', Math.cos(time / 30), 'blank');
      } else if (face) {
        glow(g, x, base, 12, face === 'head' ? GOLD_LIT : 0xd8ffb0, 0.08, 2);
        coin(g, x, base, 6, 'gold', 1, face);
      }
      if (time - firedAt < 400) { const f = (time - firedAt) / 400; g.lineStyle(2 * (1 - f), GOLD_PALE, 1 - f); g.strokeCircle(x, base, 8 + f * 20); }
    },
  };
};

// ── Compound Ledger ──────────────────────────────────────────────────
// A quarter of every blow you land is also written in a ledger, and the ledger grows 6% a
// second. Every 8s it is called in: the lot lands on your foe as one blow.

const ledger: ItemScriptFactory = (ctx) => {
  const CALL = 8000, RATE = 0.06, CAP = 40;
  let owed = 0;
  let callAt = -1;
  let paidAt = -9999;
  let lastPaid = 0;
  return {
    update(time, dt) {
      if (callAt < 0) callAt = time + CALL;
      if (owed > 0) owed = Math.min(CAP, owed * (1 + RATE * dt));
      if (time >= callAt) {
        callAt = time + CALL;
        if (owed >= 1 && foeLive(ctx) && live(ctx)) {
          lastPaid = Math.round(owed);
          ctx.hit(ctx.npc, lastPaid, ctx.npc.x, ctx.npc.y - 30);
          ctx.float(ctx.npc.x, ctx.npc.y - 72, `INTEREST −${lastPaid}`, '#ffe27a');
          ctx.sfx('money');
          paidAt = time;
        }
        owed = 0;
      }
    },
    onHitDealt(amount) { if (amount > 0) owed = Math.min(CAP, owed + amount * 0.25); },
    drawAir(g, time) {
      if (!foeLive(ctx) || callAt < 0) return;
      const n = ctx.npc;
      const x = n.x + 18, y = n.y - 78;
      if (owed < 1 && time - paidAt > 600) return;
      ledgerCard(g, x, y, 34, 18);
      g.fillStyle(INK_GREEN, 0.9); g.fillRect(x + 10, y + 10, Math.max(1, (owed / CAP) * 22), 4);
      // The call clock.
      const k = clamp(1 - (callAt - time) / CALL, 0, 1);
      g.lineStyle(2, k > 0.85 ? CARD_RED : GOLD_DARK, 0.9);
      g.beginPath(); g.arc(x + 34, y, 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      if (time - paidAt < 600) { const f = (time - paidAt) / 600; g.lineStyle(2, GOLD_LIT, 1 - f); g.strokeRect(x - 3 * f, y - 3 * f, 34 + 6 * f, 18 + 6 * f); }
    },
  };
};

// ── Toll Token ───────────────────────────────────────────────────────
// Every 320px you walk, a brass token drops into your pocket (three at most). Each ability you
// cast spends one and takes 1.2s off that ability's cooldown.

const tollToken: ItemScriptFactory = (ctx) => {
  const STRIDE = 320, MAX = 3, REFUND = 1200;
  let walked = 0;
  let lx = NaN, ly = NaN;
  let tokens = 0;
  let spentAt = -9999;
  return {
    update() {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lx)) {
        const d = dist(lx, ly, p.x, p.y);
        // Teleports and knock-backs don't count as walking.
        if (d < 40) walked += d;
      }
      lx = p.x; ly = p.y;
      if (walked >= STRIDE) {
        walked -= STRIDE;
        if (tokens < MAX) { tokens++; ctx.sfx('sparkle'); }
      }
    },
    onCast(abilityId) {
      if (tokens <= 0) return;
      tokens--;
      spentAt = ctx.scene.time.now;
      ctx.refund(abilityId, REFUND);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < MAX; i++) {
        const x = p.x - 14 + i * 14, y = p.y + 26;
        if (i < tokens) {
          g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 1, 5);
          g.fillStyle(BRASS, 1); g.fillCircle(x, y, 5);
          g.fillStyle(IRON_DARK, 1); g.fillRect(x - 1.5, y - 1.5, 3, 3);
        } else {
          g.lineStyle(1, BRASS, 0.3); g.strokeCircle(x, y, 5);
        }
      }
      // The next token filling in, as a ring.
      const k = walked / STRIDE;
      if (tokens < MAX && k > 0) { g.lineStyle(1.5, BRASS, 0.7); g.beginPath(); g.arc(p.x - 14 + tokens * 14, p.y + 26, 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath(); }
      if (time - spentAt < 300) { const f = (time - spentAt) / 300; g.lineStyle(2, GOLD_LIT, 1 - f); g.strokeCircle(p.x, p.y, 24 + f * 20); }
    },
  };
};

// ── Plumb Weight ─────────────────────────────────────────────────────
// A brass assayer's weight swings on a chain at your side. Walk, then stop dead, and it carries
// on: it flies out 170px along your last heading, striking a foe in its path for 12 and shoving
// them on. It reels back in 2.2s.

const plumb: ItemScriptFactory = (ctx) => {
  const REACH = 170, COOLDOWN = 2200, MIN_RUN = 0.6;
  let lx = NaN, ly = NaN;
  let run = 0;
  let heading = 0;
  let readyAt = 0;
  let flung: { x0: number; y0: number; a: number; at: number; hit: boolean } | null = null;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lx)) {
        const vx = p.x - lx, vy = p.y - ly;
        const sp = Math.hypot(vx, vy) / Math.max(0.001, dt);
        if (sp > 60 && sp < 2000) { run += dt; heading = Math.atan2(vy, vx); }
        else if (sp <= 20) {
          if (run >= MIN_RUN && time >= readyAt) {
            flung = { x0: p.x, y0: p.y, a: heading, at: time, hit: false };
            readyAt = time + COOLDOWN;
            ctx.sfx('whip');
          }
          run = 0;
        }
      }
      lx = p.x; ly = p.y;
      if (flung && !flung.hit && foeLive(ctx)) {
        const k = clamp((time - flung.at) / 220, 0, 1);
        const ex = flung.x0 + Math.cos(flung.a) * REACH * k, ey = flung.y0 + Math.sin(flung.a) * REACH * k;
        if (segDist(ctx.npc.x, ctx.npc.y, flung.x0, flung.y0, ex, ey) < 30) {
          flung.hit = true;
          ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
          ctx.nudge(ctx.npc, Math.cos(flung.a) * 60, Math.sin(flung.a) * 60);
          ctx.sfx('hammer-forge');
        }
      }
      if (flung && time - flung.at > 700) flung = null;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      let wx: number, wy: number;
      if (flung) {
        const t = time - flung.at;
        const k = t < 220 ? t / 220 : Math.max(0, 1 - (t - 220) / 480);
        wx = flung.x0 + Math.cos(flung.a) * REACH * k + (p.x - flung.x0) * (t > 220 ? 1 - k : 0);
        wy = flung.y0 + Math.sin(flung.a) * REACH * k + (p.y - flung.y0) * (t > 220 ? 1 - k : 0);
      } else {
        // Swinging at the hip like a pendulum.
        const sw = Math.sin(time / 260) * 0.5;
        wx = p.x + 18 + Math.sin(sw) * 10; wy = p.y + 4 + Math.cos(sw) * 8;
      }
      g.lineStyle(1.5, BRASS_DARK, 0.9);
      const n = 6;
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; g.strokeEllipse(p.x + 10 + (wx - p.x - 10) * u, p.y - 6 + (wy - p.y + 6) * u, 3, 2); }
      weight(g, wx, wy + 8, 0.6);
      if (time < readyAt && !flung) { g.lineStyle(1, BRASS, 0.4); g.beginPath(); g.arc(wx, wy, 9, -Math.PI / 2, -Math.PI / 2 + (1 - (readyAt - time) / COOLDOWN) * Math.PI * 2, false); g.strokePath(); }
    },
  };
};

// ── Bullion's Gilt Plate ─────────────────────────────────────────────
// Gilt on your front: a blow you take while facing the foe gives back 40% of itself. Every 5th
// blow you land tosses a coin onto the foe — heads bursts for 12, tails leaves molten gold that
// burns them while they stand in it.

const giltPlate: ItemScriptFactory = (ctx) => {
  let hits = 0;
  const tosses: { x: number; y: number; at: number; landAt: number; heads: boolean; dealt: boolean; burnUntil: number; tick: number }[] = [];
  let clangAt = -9999;
  return {
    update(time) {
      for (let i = tosses.length - 1; i >= 0; i--) {
        const t = tosses[i];
        if (!t.dealt && time >= t.landAt) {
          t.dealt = true;
          if (t.heads) {
            if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, t.x, t.y) < 70) ctx.hit(ctx.npc, 12, t.x, t.y);
            ctx.flash(t.x, t.y, GOLD_LIT);
            ctx.sfx('jackpot');
          } else {
            t.burnUntil = time + 3000;
            ctx.sfx('sizzle');
          }
        }
        if (t.dealt && !t.heads && time < t.burnUntil && time >= t.tick) {
          t.tick = time + 500;
          if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, t.x, t.y) < 52) ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y);
        }
        if (t.dealt && time > Math.max(t.landAt + 500, t.burnUntil)) tosses.splice(i, 1);
      }
    },
    onHitDealt(amount) {
      if (amount < 1 || !foeLive(ctx)) return;
      hits++;
      if (hits % 5 !== 0) return;
      const now = ctx.scene.time.now;
      tosses.push({ x: ctx.npc.x, y: ctx.npc.y, at: now, landAt: now + 800, heads: ctx.rng() < 0.5, dealt: false, burnUntil: 0, tick: 0 });
      ctx.sfx('dice');
    },
    onHitTaken(amount) {
      if (amount < 1 || !live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player;
      const toFoe = Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x);
      if (Math.abs(wrapAngle(toFoe - ctx.facing(p))) > 1.2) return;
      ctx.heal(p, Math.min(10, Math.round(amount * 0.4)));
      clangAt = ctx.scene.time.now;
    },
    drawGround(g, time) {
      for (const t of tosses) {
        if (!t.dealt) {
          const k = clamp((time - t.at) / 800, 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.25); g.fillEllipse(t.x, t.y, 14 + k * 50, 7 + k * 24);
        } else if (!t.heads && time < t.burnUntil) {
          g.fillStyle(MOLTEN, 0.4); g.fillCircle(t.x, t.y, 50);
          g.fillStyle(GOLD_LIT, 0.3); g.fillCircle(t.x - 8, t.y - 6, 20);
          coinFlat(g, t.x, t.y, 6);
        }
      }
    },
    drawAir(g, time) {
      for (const t of tosses) {
        if (t.dealt) continue;
        const k = clamp((time - t.at) / 800, 0, 1);
        coin(g, t.x, t.y - Math.sin(k * Math.PI) * 120, 7, 'gold', k < 0.8 ? Math.cos(time / 30) : 1, k < 0.8 ? 'blank' : t.heads ? 'head' : 'tail');
      }
      if (!live(ctx)) return;
      // The plate: a little gilt crescent on your front.
      const p = ctx.player;
      const a = ctx.facing(p);
      const flash = time - clangAt < 250 ? 1 - (time - clangAt) / 250 : 0;
      g.lineStyle(4, GOLD, 0.55 + flash * 0.45);
      g.beginPath(); g.arc(p.x, p.y, 25, a - 0.8, a + 0.8, false); g.strokePath();
      g.lineStyle(1.5, GOLD_PALE, 0.5 + flash * 0.5);
      g.beginPath(); g.arc(p.x, p.y, 27, a - 0.6, a + 0.2, false); g.strokePath();
    },
  };
};

export const TREASURY_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_PENNY, name: 'Lucky Penny', emoji: '🪙', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'A bent copper penny struck the year the mint\'s third press cracked. Nell swears it has never come up the same way twice.',
    script: CHARM_PENNY,
    scriptText: [
      'A penny flips over your head every 5s.',
      'Heads: your next hit deals 12 extra. Tails: half of the next hit you take is healed back (up to 16).',
    ],
  },
  {
    id: CHARM_LEDGER, name: 'Compound Ledger', emoji: '📒', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A pocket ledger bound in green leather, Banker Compound\'s own pattern. The sums do themselves.',
    script: CHARM_LEDGER,
    scriptText: [
      'A quarter of every hit you land is also lent to your foe, growing 6% a second (up to 40).',
      'Every 8s the loan is called in: it lands on them as one blow.',
    ],
  },
  {
    id: CHARM_TOKEN, name: 'Toll Token', emoji: '🎫', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A brass token punched with a square hole, good for one crossing of the King\'s Bridge. This one is good for several.',
    effect: { speedMult: 1.03 },
    script: CHARM_TOKEN,
    scriptText: [
      'Every 320px you walk earns a token (up to 3).',
      'Each ability you cast spends one, taking 1.2s off that ability\'s cooldown.',
    ],
  },
  {
    id: CHARM_PLUMB, name: 'Assayer\'s Plumb', emoji: '⚖️', kind: 'charm', price: 1100, isle: ISLE,
    flavor: 'A brass bell-weight off the Scales of Tribute, honest to the grain. The only honest one, it turned out.',
    effect: { maxHp: 8 },
    script: CHARM_PLUMB,
    scriptText: [
      'A weight swings on a chain at your side. Move for a moment, then stop dead, and it flies on.',
      'It strikes a foe in its 170px path for 12 and shoves them on. Reels back in 2.2s.',
    ],
  },
  {
    id: ART_BULLION, name: 'Bullion\'s Gilt Plate', emoji: '🛡️', kind: 'artifact', isle: ISLE,
    flavor: 'One scale of the Prince\'s gilt, chiselled off on his own steps. He says it never kept anything out but other people.',
    effect: { maxHp: 15 },
    script: ART_BULLION,
    scriptText: [
      'Take a hit while facing your foe and the gilt gives back 40% of it as health (up to 10).',
      'Every 5th hit you land tosses a coin onto the foe: heads bursts for 12, tails leaves molten gold that burns.',
    ],
  },
  {
    id: FISH_DACE, name: 'Ducat Dace', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'A slim silver-gold dace that schools over the sunken coin and is mistaken, every day, for a dropped ducat.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_IDE, name: 'Ingot Ide', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'A heavy, square-headed ide that swallows the mint\'s spill. There is a flake of gold leaf in every belly.',
    effect: { shieldHp: 6 },
  },
  {
    id: FISH_SUNFISH, name: 'Sovereign Sunfish', emoji: '🐡', kind: 'fish', sell: 70, isle: ISLE,
    flavor: 'Round, flat and gilt from fin to fin, with a profile on its flank like the King\'s. Rare, and very vain.',
    effect: { damageMult: 1.04 },
  },
];

export const TREASURY_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_PENNY]: penny,
  [CHARM_LEDGER]: ledger,
  [CHARM_TOKEN]: tollToken,
  [CHARM_PLUMB]: plumb,
  [ART_BULLION]: giltPlate,
};

export const TREASURY_SHOPS: ShopDef[] = [
  { id: 'treasury-shop', name: 'Ledgerwhite\'s Exchange', stock: [CHARM_PENNY, CHARM_LEDGER, CHARM_TOKEN, CHARM_PLUMB], buys: true },
];

export const TREASURY_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Gilded Pool', kind: 'gilded' }];

export const TREASURY_FISH: FishDef[] = [
  { id: FISH_DACE, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 24] },
  { id: FISH_IDE, fisheries: [FISHERY], weight: 4, fight: 3, size: [24, 52] },
  { id: FISH_SUNFISH, fisheries: [FISHERY], weight: 1, fight: 5, size: [30, 64] },
];


