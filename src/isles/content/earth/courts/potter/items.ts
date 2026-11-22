import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { lathe, pot, saggar } from './art';
import {
  BISQUE, BISQUE_LIT, GLAZE, GLAZE_DARK, GLAZE_LIT, GOLD, GOLD_LIT, IRON, IRON_LIT, SAGGAR, SAGGAR_DARK, SLIP,
  SLIP_DARK, SLIP_LIT, TERRA, TERRA_LIT,
} from './palette';
import { alive, clamp } from './util';

/**
 * The Potter's Court's goods: Mabyn Tregear's four charms, Prince Glaze's mended bowl, and the
 * slip pond's three fish. Every charm is a potter's tool or a piece of the kiln, and each plays a
 * piece of the craft in your favour — grog that tempers, a saggar that takes the flame, a wheel
 * that throws true, a stylus that scratches verses. Scripts are registered below under their ids.
 */

const ISLE = 'earth';

export const CHARM_GROG = 'potter-charm-grog-pouch';
export const CHARM_SAGGAR = 'potter-charm-saggar-box';
export const CHARM_WHEEL = 'potter-charm-wheel-head';
export const CHARM_STYLUS = 'potter-charm-sgraffito-stylus';
export const ART_GLAZE = 'art-glaze';

export const FISH_LOACH = 'fish-clay-loach';
export const FISH_CATFISH = 'fish-kiln-catfish';
export const FISH_TENCH = 'fish-glazed-tench';
export const FISHERY = 'potter-slip';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Grog Pouch ───────────────────────────────────────────────────────
// Grog is fired clay ground fine and wedged back into fresh clay to temper it. Every blow you
// take puts a grain in the pouch (up to 6); the next blow you land spends them all, +3 each.

const grogPouch: ItemScriptFactory = (ctx) => {
  const MAX = 6;
  let grains = 0;
  let spentAt = -9999;
  let spent = 0;
  let gainAt = -9999;
  return {
    onHitTaken(amount) {
      if (amount < 2 || !live(ctx)) return;
      if (grains < MAX) { grains++; gainAt = ctx.scene.time.now; }
    },
    onHitDealt(amount) {
      if (amount < 2 || grains === 0 || !foeLive(ctx)) return;
      spent = grains;
      grains = 0;
      spentAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, spent * 3, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, `TEMPERED +${spent * 3}`, '#e08d5c');
      ctx.sfx('rock-throw');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The pouch at the hip, its grains in a little ring.
      const x = p.x + 20, y = p.y - 6;
      g.fillStyle(0x6a4a30, 1); g.fillEllipse(x, y, 12, 13);
      g.fillStyle(0x8a6a48, 1); g.fillEllipse(x - 1, y - 1, 9, 10);
      g.lineStyle(1, 0x3a2a1a, 1); g.lineBetween(x - 4, y - 5, x + 4, y - 5);
      for (let i = 0; i < grains; i++) {
        const a = (i / MAX) * Math.PI * 2 + time / 900;
        g.fillStyle(i % 2 ? TERRA : TERRA_LIT, 1); g.fillRect(x + Math.cos(a) * 11 - 1.5, y + Math.sin(a) * 11 - 1.5, 3, 3);
      }
      if (time - gainAt < 300) { g.lineStyle(1.5, TERRA_LIT, 1 - (time - gainAt) / 300); g.strokeCircle(x, y, 14); }
      // Spending: the grains fly to the foe.
      const k = (time - spentAt) / 260;
      if (k >= 0 && k < 1 && foeLive(ctx)) {
        const n = ctx.npc;
        for (let i = 0; i < spent; i++) {
          const fx = x + (n.x - x) * k + Math.sin(i * 2 + k * 6) * 6, fy = y + (n.y - 20 - y) * k + Math.cos(i * 2) * 6;
          g.fillStyle(TERRA_LIT, 1 - k * 0.5); g.fillRect(fx - 2, fy - 2, 4, 4);
        }
      }
    },
  };
};

// ── Saggar Box ───────────────────────────────────────────────────────
// A saggar shields the ware from the flame. Every 10s a ghost saggar closes round you; the next
// blow you take while it is sealed, the saggar takes: you are given back 70% of it, and it opens.

const saggarBox: ItemScriptFactory = (ctx) => {
  const RESEAL = 10000;
  let sealedAt = -1;
  let breakAt = -9999;
  return {
    update(time) {
      if (sealedAt < 0 && time - breakAt >= RESEAL) sealedAt = time;
    },
    onHitTaken(amount) {
      if (sealedAt < 0 || amount < 2 || !live(ctx)) return;
      const back = Math.max(1, Math.round(amount * 0.7));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 54, `SAGGAR +${back}`, '#d2b28a');
      ctx.sfx('shield-break');
      sealedAt = -1;
      breakAt = ctx.scene.time.now;
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (sealedAt >= 0) {
        const k = clamp((time - sealedAt) / 500, 0, 1);
        g.fillStyle(SAGGAR_DARK, 0.25 * k); g.fillEllipse(p.x, p.y + 8, 56, 18);
        g.lineStyle(3, SAGGAR, 0.6 * k); g.strokeEllipse(p.x, p.y + 8, 56, 18);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (sealedAt >= 0) {
        // The saggar's walls: a pale fireclay cylinder round the legs.
        const k = clamp((time - sealedAt) / 500, 0, 1);
        g.lineStyle(2, SAGGAR, 0.35 * k); g.strokeEllipse(p.x, p.y + 8 - 18 * k, 56, 18);
        g.lineStyle(1, SAGGAR, 0.25 * k); g.lineBetween(p.x - 28, p.y + 8, p.x - 28, p.y + 8 - 18 * k); g.lineBetween(p.x + 28, p.y + 8, p.x + 28, p.y + 8 - 18 * k);
      } else {
        // Recharging: a tiny saggar at the shoulder, filling.
        const k = clamp((time - breakAt) / RESEAL, 0, 1);
        saggar(g, p.x - 24, p.y - 30, 5, k < 1 ? SAGGAR_DARK : SAGGAR);
        g.lineStyle(1.5, SAGGAR, 0.8); g.beginPath(); g.arc(p.x - 24, p.y - 33, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - breakAt < 400) {
        const k = (time - breakAt) / 400;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(SAGGAR, 1 - k); g.fillRect(p.x + Math.cos(a) * (28 + k * 30), p.y + Math.sin(a) * (10 + k * 14), 4, 3); }
      }
    },
  };
};

// ── Wheel-Head ───────────────────────────────────────────────────────
// A little wheel-head at your side that spins up as you move and runs down as you stand. Spun
// full, the next ability you cast is thrown true: it comes back 2s sooner.

const wheelHead: ItemScriptFactory = (ctx) => {
  const FULL = 700;
  let charge = 0;
  let lx = NaN, ly = NaN;
  let still = 0;
  let angle = 0;
  let firedAt = -9999;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lx)) {
        const d = Math.hypot(p.x - lx, p.y - ly);
        if (d < 60 && d > 0.3) { charge = Math.min(FULL, charge + d); still = 0; }
        else { still += dt; if (still > 1.2) charge = Math.max(0, charge - 300 * dt); }
      }
      lx = p.x; ly = p.y;
      angle += (0.5 + (charge / FULL) * 14) * dt;
      void time;
    },
    onCast(abilityId, slot) {
      if (charge < FULL || slot === null || !live(ctx)) return;
      charge = 0;
      firedAt = ctx.scene.time.now;
      ctx.refund(abilityId, 2000);
      ctx.float(ctx.player.x, ctx.player.y - 54, 'THROWN TRUE', '#dcb48e');
      ctx.sfx('gear-turn');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 22, y = p.y + 6;
      const full = charge >= FULL;
      if (full) glow(g, x, y - 4, 16, SLIP_LIT, 0.06 + Math.sin(time / 80) * 0.03, 2);
      g.fillStyle(IRON, 1); g.fillEllipse(x, y, 20, 7);
      g.fillStyle(IRON_LIT, 1); g.fillEllipse(x, y - 1, 18, 5.5);
      for (let i = 0; i < 3; i++) {
        const a = angle + (i / 3) * Math.PI * 2;
        g.fillStyle(SLIP_DARK, 1); g.fillCircle(x + Math.cos(a) * 6, y - 1 + Math.sin(a) * 1.8, 1.4);
      }
      lathe(g, x, y - 2, 4 + (charge / FULL) * 7, (v) => 3.2 + Math.sin(v * Math.PI) * 1.6 - v * 0.8, SLIP, { step: 1 });
      if (time - firedAt < 400) { g.lineStyle(2, SLIP_LIT, 1 - (time - firedAt) / 400); g.strokeEllipse(x, y, 30 + (time - firedAt) / 10, 10); }
    },
  };
};

// ── Sgraffito Stylus ─────────────────────────────────────────────────
// Each ability you cast scratches a line of a verse round a little jar at your shoulder. Three
// different keys in a row within 6s finish the verse: 16 to your foe and 6 back to you. Repeat
// a key and the verse breaks off and starts again with it.

const stylus: ItemScriptFactory = (ctx) => {
  const WINDOW = 6000;
  let verse: string[] = [];
  let startedAt = 0;
  let sungAt = -9999;
  return {
    update(time) {
      if (verse.length && time - startedAt > WINDOW) verse = [];
    },
    onCast(_abilityId, slot) {
      if (!slot || !live(ctx)) return;
      const now = ctx.scene.time.now;
      if (verse.includes(slot)) verse = [];
      if (!verse.length) startedAt = now;
      verse.push(slot);
      if (verse.length >= 3) {
        verse = [];
        sungAt = now;
        if (foeLive(ctx)) ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y - 20);
        ctx.heal(ctx.player, 6);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'A VERSE', '#c4ecd6');
        ctx.sfx('holy-chord');
      } else ctx.sfx('clock-tick');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 30;
      pot(g, x, y + 10, 14, 'jar', SLIP_DARK);
      // The lines scratched so far, pale through the dark slip.
      for (let i = 0; i < verse.length; i++) {
        g.lineStyle(1, BISQUE_LIT, 1);
        for (let k = 0; k < 4; k++) g.lineBetween(x - 4 + k * 2.4, y + 4 - i * 3, x - 3 + k * 2.4, y + 3 - i * 3);
      }
      const left = verse.length ? clamp(1 - (time - startedAt) / WINDOW, 0, 1) : 0;
      if (left > 0) { g.lineStyle(1, BISQUE, 0.7); g.beginPath(); g.arc(x, y + 2, 11, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath(); }
      // The sung verse: lines lifting off the jar like notes.
      const k = (time - sungAt) / 800;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 5; i++) {
          const nx = x + Math.sin(i * 1.7 + k * 4) * 10, ny = y - k * 50 - i * 6;
          g.lineStyle(1.5, BISQUE_LIT, 1 - k); g.lineBetween(nx - 4, ny, nx + 4, ny - 1);
        }
      }
    },
  };
};

// ── Glaze's Kintsugi Bowl ────────────────────────────────────────────
// A celadon bowl, broken and mended in gold. Every blow you take cracks it (up to 5). Every 6s the
// cracks are mended: heal 3 for each, and for 3s your blows land 6% harder for each.

const kintsugiBowl: ItemScriptFactory = (ctx) => {
  const MAX = 5;
  const PERIOD = 6000;
  let cracks = 0;
  let lastMend = -1;
  let mendedAt = -9999;
  let mended = 0;
  return {
    update(time) {
      if (lastMend < 0) lastMend = time;
      if (time - lastMend >= PERIOD) {
        lastMend = time;
        if (cracks > 0 && live(ctx)) {
          mended = cracks;
          ctx.heal(ctx.player, cracks * 3);
          ctx.boostDamage(1 + cracks * 0.06, 3000);
          ctx.float(ctx.player.x, ctx.player.y - 58, `MENDED ×${cracks}`, '#ffe08a');
          ctx.sfx('jackpot');
          mendedAt = time;
          cracks = 0;
        }
      }
    },
    onHitTaken(amount) {
      if (amount >= 3 && cracks < MAX) cracks++;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 62;
      // The bowl, hovering.
      g.fillStyle(GLAZE_DARK, 1); g.fillEllipse(x, y + 4, 26, 14);
      g.fillStyle(GLAZE, 1); g.fillEllipse(x, y + 2, 24, 11);
      g.fillStyle(GLAZE_LIT, 1); g.fillEllipse(x, y - 2, 24, 6);
      g.fillStyle(GLAZE_DARK, 1); g.fillEllipse(x, y - 2, 20, 4);
      // Open cracks (dark) waiting for gold; the moment of mending (gold).
      const shown = time - mendedAt < 3000 ? mended : cracks;
      const gold = time - mendedAt < 3000;
      for (let i = 0; i < shown; i++) {
        const cx = x - 9 + i * 4.5;
        g.lineStyle(1.3, gold ? GOLD : 0x1a2a26, 1);
        g.lineBetween(cx, y - 1, cx + 1.5, y + 3); g.lineBetween(cx + 1.5, y + 3, cx - 0.5, y + 7);
      }
      if (gold) {
        const k = (time - mendedAt) / 3000;
        glow(g, x, y + 2, 18, GOLD_LIT, 0.06 * (1 - k), 2);
      }
      // The mending clock.
      const k = clamp((time - lastMend) / PERIOD, 0, 1);
      g.lineStyle(1, GOLD, 0.5); g.beginPath(); g.arc(x, y + 2, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    },
  };
};

export const POTTER_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_GROG, name: 'Grog Pouch', emoji: '👝', kind: 'charm', price: 280, isle: ISLE,
    flavor: 'A leather pouch of old fired clay, ground fine. Wedge it into new clay and the pot stands the kiln.',
    script: CHARM_GROG,
    scriptText: [
      'Every blow you take puts a grain of grog in the pouch (up to 6).',
      'Your next blow spends them all: +3 damage per grain.',
    ],
  },
  {
    id: CHARM_SAGGAR, name: 'Saggar Box', emoji: '📦', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A fireclay saggar no bigger than a snuffbox. Kiln boys carry one for luck. The lucky ones carry two.',
    effect: { damageTakenMult: 0.98 },
    script: CHARM_SAGGAR,
    scriptText: [
      'Every 10s a saggar seals round you.',
      'The next blow you take while it is sealed, it takes: 70% of that blow is given back to you.',
    ],
  },
  {
    id: CHARM_WHEEL, name: 'Wheel-Head', emoji: '🛞', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A child\'s wheel-head on a spindle, iron, the size of a saucer. It spins whenever its owner walks.',
    effect: { speedMult: 1.02 },
    script: CHARM_WHEEL,
    scriptText: [
      'A wheel-head spins up as you move (about 700px of walking) and runs down while you stand.',
      'Spun full, the next ability you cast comes back 2s sooner.',
    ],
  },
  {
    id: CHARM_STYLUS, name: 'Sgraffito Stylus', emoji: '🖋️', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'A bone-handled scratching tool, its point worn to a hair. Granny Sgraffito\'s second-best. She lent it.',
    script: CHARM_STYLUS,
    scriptText: [
      'Each ability you cast scratches a line of a verse. Three different keys in a row within 6s finish it.',
      'A finished verse deals 16 to your foe and heals you 6. Repeating a key starts the verse again.',
    ],
  },
  {
    id: ART_GLAZE, name: 'Glaze\'s Kintsugi Bowl', emoji: '🥣', kind: 'artifact', isle: ISLE,
    flavor: 'The first pot the Prince ever threw, which his father broke on the Ruck. He dug it out and mended it in gold.',
    effect: { maxHp: 12 },
    script: ART_GLAZE,
    scriptText: [
      'Every blow you take cracks the bowl (up to 5 cracks).',
      'Every 6s the cracks are mended in gold: heal 3 per crack, and +6% damage per crack for 3s.',
    ],
  },
  {
    id: FISH_LOACH, name: 'Clay Loach', emoji: '🐟', kind: 'fish', sell: 12, isle: ISLE,
    flavor: 'A slick brown loach that lives on the bottom of the slip pond and tastes faintly of the pit it came from.',
    effect: { damageTakenMult: 0.98 },
  },
  {
    id: FISH_CATFISH, name: 'Kiln Catfish', emoji: '🐡', kind: 'fish', sell: 24, isle: ISLE,
    flavor: 'A whiskered catfish that lies in the warm outfall from the kilns, half-baked in its own skin.',
    effect: { damageMult: 1.03 },
  },
  {
    id: FISH_TENCH, name: 'Glazed Tench', emoji: '🐠', kind: 'fish', sell: 50, isle: ISLE,
    flavor: 'A tench whose scales have taken a celadon sheen off the glaze-house washings. Elwin says it\'s a sign.',
    effect: { shieldCharges: 1 },
  },
];

export const POTTER_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_GROG]: grogPouch,
  [CHARM_SAGGAR]: saggarBox,
  [CHARM_WHEEL]: wheelHead,
  [CHARM_STYLUS]: stylus,
  [ART_GLAZE]: kintsugiBowl,
};

export const POTTER_SHOPS: ShopDef[] = [
  { id: 'potter-shop', name: 'Wheel & Wedge', stock: [CHARM_GROG, CHARM_SAGGAR, CHARM_WHEEL, CHARM_STYLUS], buys: true },
];

export const POTTER_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Slip Pond', kind: 'bog' }];

export const POTTER_FISH: FishDef[] = [
  { id: FISH_LOACH, fisheries: [FISHERY], weight: 7, fight: 2, size: [10, 24] },
  { id: FISH_CATFISH, fisheries: [FISHERY], weight: 3, fight: 3, size: [24, 60] },
  { id: FISH_TENCH, fisheries: [FISHERY], weight: 1, fight: 4, size: [22, 48] },
];

