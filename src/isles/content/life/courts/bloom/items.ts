import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { flower, topiary } from './art';
import { BLOOM_GOLD, BLOOM_RED, BRASS, BRASS_DARK, LEAF, PETALIS, PETALIS_LIT, SOIL_DARK, STEM, STONE_LIT, WILT } from './palette';
import { alive, clamp, clock, dist, wrapAngle } from './util';

/**
 * The Bloom Court's goods: Hesketh Dibble's four charms, Prince Petalis's seed, and the lily
 * pond's two fish. Every charm is a gardening thing that plays one of the court's own rules in
 * your favour — the deadhead's timing, the dial's turning hand, the grafter's vine, the topiary
 * that walks. Scripts are registered below under their item ids.
 */

const ISLE = 'life';

export const CHARM_SNIPS = 'bloom-charm-snips';
export const CHARM_BROOCH = 'bloom-charm-sundial-brooch';
export const CHARM_RING = 'bloom-charm-graftwood-ring';
export const CHARM_CUB = 'bloom-charm-topiary-cub';
export const ART_PETALIS = 'art-petalis';

export const FISH_PERCH = 'fish-lilypad-perch';
export const FISH_KOI = 'fish-petal-koi';
export const FISHERY = 'bloom-pond';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Gardener's Snips ─────────────────────────────────────────────────
// A bloom grows on the foe's shoulder: 6s from bud to full, then 2s of full bloom, then it goes
// over and starts again. Land a hit while it is in full bloom and you deadhead it.

const snips: ItemScriptFactory = (ctx) => {
  const GROW = 6000, FULL = 2000;
  let since = -1;
  let cutFx = 0;
  return {
    update(time) {
      if (since < 0) since = time;
      if (time - since > GROW + FULL) since = time;
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || since < 0 || !foeLive(ctx) || !live(ctx)) return;
      const age = now - since;
      if (age < GROW || age > GROW + FULL) return;
      since = now;
      cutFx = now;
      ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y - 30);
      ctx.heal(ctx.player, 6);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'DEADHEADED', '#ffb0c0');
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      if (!foeLive(ctx) || since < 0) return;
      const n = ctx.npc;
      const age = time - since;
      const x = n.x + 18, y = n.y - 34;
      g.lineStyle(2, STEM, 1); g.lineBetween(x - 4, y + 12, x, y);
      if (age < GROW) flower(g, x, y, 3 + (age / GROW) * 5, PETALIS, age < GROW * 0.6 ? 'bud' : 'daisy', age / GROW);
      else {
        const pulse = 0.5 + Math.sin(time / 90) * 0.5;
        glow(g, x, y, 16, PETALIS_LIT, 0.06 + pulse * 0.05, 2);
        flower(g, x, y, 9, PETALIS, 'daisy', 1);
        g.lineStyle(1.5, BLOOM_GOLD, 1); g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + (1 - (age - GROW) / FULL) * Math.PI * 2, false); g.strokePath();
      }
      if (time - cutFx < 500) {
        const k = (time - cutFx) / 500;
        for (let i = 0; i < 6; i++) { g.fillStyle(PETALIS, 1 - k); g.fillEllipse(x + Math.cos(i) * k * 24, y - k * 10 + k * k * 30, 4, 3); }
      }
    },
  };
};

// ── Sundial Brooch ───────────────────────────────────────────────────
// A tiny dial rides at your shoulder, its shadow-hand going round every 8s. While the hand
// points at your foe, your blows land 30% harder. Step round them to bring the hand to bear.

const brooch: ItemScriptFactory = (ctx) => {
  const PERIOD = 8000;
  let boostUntil = 0;
  const handA = (time: number) => -Math.PI / 2 + ((time % PERIOD) / PERIOD) * Math.PI * 2;
  const aligned = (time: number) => foeLive(ctx) && Math.abs(wrapAngle(Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x) - handA(time))) < 0.5;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (aligned(time) && time >= boostUntil) { ctx.boostDamage(1.3, 250); boostUntil = time + 250; }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 34;
      const on = aligned(time);
      if (on) glow(g, x, y, 14, 0xfff2b0, 0.08, 2);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
      g.fillStyle(STONE_LIT, 1); g.fillCircle(x, y, 6.5);
      const a = handA(time);
      g.lineStyle(2, 0x1a2a14, 1); g.lineBetween(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      // The hand's reach on the floor: a faint wedge, bright when it finds the foe.
      g.lineStyle(on ? 2 : 1, on ? 0xfff2b0 : BRASS, on ? 0.6 : 0.2);
      g.lineBetween(p.x, p.y + 10, p.x + Math.cos(a) * 90, p.y + 10 + Math.sin(a) * 90);
    },
  };
};

// ── Graftwood Ring ───────────────────────────────────────────────────
// Take a hit and a vine grafts you to the foe for 4s (8s between grafts). While it holds, every
// blow you land draws sap down it: you heal 3. If the foe pulls more than 300px away, it tears
// — and the tearing wounds them.

const ring: ItemScriptFactory = (ctx) => {
  let until = 0;
  let readyAt = 0;
  let tornFx: { x: number; y: number; at: number } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 3 || now < readyAt || !foeLive(ctx) || !live(ctx)) return;
      until = now + 4000;
      readyAt = now + 8000;
      ctx.float(ctx.player.x, ctx.player.y - 44, 'GRAFTED', '#a8f0a0');
      ctx.sfx('whip');
    },
    onHitDealt(amount) {
      if (amount < 2 || ctx.scene.time.now >= until || !live(ctx)) return;
      ctx.heal(ctx.player, 3);
    },
    update(time) {
      if (time >= until || !foeLive(ctx) || !live(ctx)) return;
      if (dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) > 300) {
        until = 0;
        ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 44, 'TORN', '#a8f0a0');
        ctx.sfx('snap-back');
        tornFx = { x: (ctx.player.x + ctx.npc.x) / 2, y: (ctx.player.y + ctx.npc.y) / 2, at: time };
      }
    },
    drawAir(g, time) {
      if (time < until && foeLive(ctx) && live(ctx)) {
        const p = ctx.player, n = ctx.npc;
        const d = dist(p.x, p.y, n.x, n.y);
        const sag = clamp(40 - d * 0.1, 4, 40);
        const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2 + sag;
        g.lineStyle(3, d > 240 ? 0xa04a3a : STEM, 1);
        g.beginPath(); g.moveTo(p.x, p.y - 6);
        for (let k = 1; k <= 12; k++) {
          const t = k / 12;
          g.lineTo((1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * mx + t * t * n.x, (1 - t) * (1 - t) * (p.y - 6) + 2 * (1 - t) * t * my + t * t * (n.y - 6));
        }
        g.strokePath();
        g.fillStyle(LEAF, 1); g.fillEllipse(mx, my - 4, 8, 4);
      }
      if (tornFx && time - tornFx.at < 500) {
        const k = (time - tornFx.at) / 500;
        for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? LEAF : WILT, 1 - k); g.fillEllipse(tornFx.x + Math.cos(i) * k * 30, tornFx.y + Math.sin(i) * k * 20, 5, 3); }
      }
    },
  };
};

// ── Topiary Cub ──────────────────────────────────────────────────────
// A little yew bear, clipped by Box himself, lumbers after the foe at an easy walk. It cannot
// catch anyone who keeps moving — but a foe who stands still to cast gets a swipe.

const cub: ItemScriptFactory = (ctx) => {
  const step = clock();
  let x = -1, y = -1;
  let lastSwipe = 0;
  let swipeFx = 0;
  return {
    update(time) {
      const dt = step(time);
      if (x < 0) { x = ctx.player.x - 40; y = ctx.player.y + 20; }
      if (!foeLive(ctx) || !live(ctx)) return;
      const n = ctx.npc;
      const d = dist(x, y, n.x, n.y + 12);
      if (d > 30) { x += ((n.x - x) / d) * 75 * dt; y += ((n.y + 12 - y) / d) * 75 * dt; }
      if (d < 38 && time - lastSwipe > 1400) {
        lastSwipe = time;
        swipeFx = time;
        ctx.hit(n, 5, n.x, n.y);
        ctx.sfx('hit-light');
      }
    },
    drawGround(g) {
      if (x < 0) return;
      g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 2, 34, 10);
    },
    drawAir(g, time) {
      if (x < 0) return;
      const bob = Math.sin(time / 180) * 1.5;
      topiary(g, x, y + bob, 'bear', 0.5, 0, false);
      if (time - swipeFx < 250) { g.lineStyle(2, LEAF, 1 - (time - swipeFx) / 250); g.strokeCircle(x + 10, y - 20, 14); }
    },
  };
};

// ── Petalis's Perennial Seed (artifact) ──────────────────────────────
// Every third blow you land beds out a bud under the foe; it bursts 1.2s later if they are still
// on it. And once a fight, falling under 30% health, you regrow: 30 health back over 3s.

const perennialSeed: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let buds: { x: number; y: number; at: number; done: boolean }[] = [];
  let regrowUntil = 0;
  let regrowAcc = 0;
  let spent = false;
  const step = clock();
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      hits++;
      if (hits % 3 !== 0) return;
      buds.push({ x: ctx.npc.x, y: ctx.npc.y + 12, at: ctx.scene.time.now, done: false });
      ctx.sfx('spore');
    },
    onHitTaken() {
      const p = ctx.player;
      if (spent || !live(ctx) || p.hp > p.maxHp * 0.3) return;
      spent = true;
      regrowUntil = ctx.scene.time.now + 3000;
      ctx.float(p.x, p.y - 50, 'PERENNIAL', '#ffb8cc');
      ctx.sfx('heal');
    },
    update(time) {
      const dt = step(time);
      for (const b of buds) {
        if (b.done || time - b.at < 1200) continue;
        b.done = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y + 12, b.x, b.y) < 60) {
          ctx.hit(ctx.npc, 11, b.x, b.y);
          ctx.flash(b.x, b.y, PETALIS);
        }
      }
      buds = buds.filter((b) => time - b.at < 1600);
      if (time < regrowUntil && live(ctx)) {
        regrowAcc += dt * 10;
        if (regrowAcc >= 1) { ctx.heal(ctx.player, Math.floor(regrowAcc)); regrowAcc -= Math.floor(regrowAcc); }
      }
    },
    drawGround(g, time) {
      for (const b of buds) {
        const k = clamp((time - b.at) / 1200, 0, 1);
        if (!b.done) {
          g.fillStyle(SOIL_DARK, 0.4); g.fillCircle(b.x, b.y, 60 * (0.4 + k * 0.6));
          g.lineStyle(2, PETALIS, 0.4 + k * 0.5); g.strokeCircle(b.x, b.y, 60);
          flower(g, b.x, b.y - 6, 4 + k * 6, BLOOM_RED, k > 0.7 ? 'rose' : 'bud', k);
        } else {
          const f = clamp((time - b.at - 1200) / 400, 0, 1);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(PETALIS, 1 - f); g.fillEllipse(b.x + Math.cos(a) * f * 60, b.y + Math.sin(a) * f * 40, 7, 4); }
        }
      }
    },
    drawAir(g, time) {
      if (time >= regrowUntil || !live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < 5; i++) {
        const ph = (time / 700 + i / 5) % 1;
        g.fillStyle(LEAF, 1 - ph); g.fillEllipse(p.x + Math.cos(i * 1.3) * 18, p.y + 10 - ph * 40, 7, 4);
      }
      g.lineStyle(2, BRASS, 0.5); g.strokeCircle(p.x, p.y, 26);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const BLOOM_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SNIPS, name: 'Gardener\'s Snips', emoji: '✂️', kind: 'charm', price: 260, isle: ISLE,
    flavor: 'A pair of bright little snips, oiled every morning. Sabine\'s crew carry them on a cord. This pair was dropped.',
    script: CHARM_SNIPS,
    scriptText: [
      'A bloom grows on your foe: 6s from bud to full, then 2s in full bloom.',
      'Land a hit in full bloom to deadhead it: 14 extra damage and heal 6. Then it grows again.',
    ],
  },
  {
    id: CHARM_BROOCH, name: 'Sundial Brooch', emoji: '🕰️', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'A brass dial no bigger than a coin, set for the Bloom Court. Its shadow turns whether or not there is sun.',
    script: CHARM_BROOCH,
    scriptText: [
      'A shadow-hand at your shoulder turns once every 8s.',
      'While it points at your foe (within about 30°), you deal +30% damage.',
    ],
  },
  {
    id: CHARM_RING, name: 'Graftwood Ring', emoji: '💍', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'Two woods grafted into one band, the join still green. Ives makes them for apprentices who stay.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_RING,
    scriptText: [
      'Taking a hit grafts you to the foe for 4s (at most every 8s). While grafted, each hit you land heals 3.',
      'If the foe gets more than 300px away, the graft tears and deals them 12.',
    ],
  },
  {
    id: CHARM_CUB, name: 'Topiary Cub', emoji: '🐻', kind: 'charm', price: 620, isle: ISLE,
    flavor: 'A yew bear the size of a cat, on a root-ball wrapped in hessian. Box clipped it for a child once. It follows.',
    effect: { maxHp: 6 },
    script: CHARM_CUB,
    scriptText: [
      'A little hedge bear lumbers after your foe at a slow walk.',
      'When it reaches them it swipes for 5, at most every 1.4s. Keep them still and it keeps swiping.',
    ],
  },
  {
    id: ART_PETALIS, name: 'Petalis\'s Perennial Seed', emoji: '🌱', kind: 'artifact', isle: ISLE,
    flavor: 'A seed from the heart of the Prince\'s own rose. Plant it anywhere. It will come up every spring, whatever you do.',
    effect: { maxHp: 15 },
    script: ART_PETALIS,
    scriptText: [
      'Every 3rd hit you land beds out a bud under the foe; it bursts 1.2s later for 11 if they are still on it.',
      'Once a fight, dropping under 30% health, you regrow: heal 30 over 3s.',
    ],
  },
  {
    id: FISH_PERCH, name: 'Lilypad Perch', emoji: '🐟', kind: 'fish', sell: 10, isle: ISLE,
    flavor: 'A striped little perch that hides under the lily pads and bites at anything that lands on one.',
    effect: { regenPerSecond: 0.4 },
  },
  {
    id: FISH_KOI, name: 'Petal Koi', emoji: '🎏', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'Pink and white as a fallen petal, and counted into the Tithe every season. This one was not counted.',
    effect: { damageMult: 1.03 },
  },
];

export const BLOOM_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SNIPS]: snips,
  [CHARM_BROOCH]: brooch,
  [CHARM_RING]: ring,
  [CHARM_CUB]: cub,
  [ART_PETALIS]: perennialSeed,
};

export const BLOOM_SHOPS: ShopDef[] = [
  { id: 'bloom-shop', name: 'Dibble\'s Seeds & Sundries', stock: [CHARM_SNIPS, CHARM_BROOCH, CHARM_RING, CHARM_CUB], buys: true },
];

export const BLOOM_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Lily Pond', kind: 'pond' }];

export const BLOOM_FISH: FishDef[] = [
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 6, fight: 1, size: [8, 20] },
  { id: FISH_KOI, fisheries: [FISHERY], weight: 2, fight: 3, size: [20, 46] },
];
