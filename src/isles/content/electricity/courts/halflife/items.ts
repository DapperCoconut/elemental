import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { core, glowcaps, trefoil } from './art';
import {
  AMBER, AMBER_DARK, AMBER_LIT, CAP, CHEREN_LIT, COPPER, COPPER_LIT, GLOW, GLOW_LIT, HAZARD_BLACK, LEAD, LEAD_DARK,
  LEAD_LIT,
} from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Halflife Court's goods: Ada Becquerel's four charms, Prince Isotope's split core, and the
 * cooling pond's three fish. Every charm is a pit-town thing that plays the court's own physics in
 * your favour — a dose that halves, a lead apron, a jar of glowcap, a clock that pays out in
 * halves. Scripts are registered below under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_BADGE = 'halflife-charm-dosimeter';
export const CHARM_APRON = 'halflife-charm-lead-apron';
export const CHARM_JAR = 'halflife-charm-spore-jar';
export const CHARM_FOB = 'halflife-charm-decay-fob';
export const ART_ISOTOPE = 'art-isotope';

export const FISH_GAR = 'fish-glow-gar';
export const FISH_KOI = 'fish-isotope-koi';
export const FISH_CARP = 'fish-halflife-carp';
export const FISHERY = 'halflife-pond';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Dosimeter Badge ──────────────────────────────────────────────────
// Every hit you land adds to the foe's dose. The dose halves every 4 s. Get it to 30 before it
// decays and the foe goes *acute*: for 3 s every blow lands 25% harder. Then the badge resets.

const badge: ItemScriptFactory = (ctx) => {
  const HALF = 4000, ACUTE = 30;
  let dose = 0;
  let nextHalf = 0;
  let acuteUntil = 0;
  let halvedAt = -9999;
  return {
    update(time) {
      if (nextHalf === 0) nextHalf = time + HALF;
      if (time >= nextHalf) { nextHalf = time + HALF; if (dose > 0.5) { dose /= 2; halvedAt = time; } else dose = 0; }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || !foeLive(ctx) || now < acuteUntil) return;
      dose += amount;
      if (dose >= ACUTE) {
        dose = 0;
        acuteUntil = now + 3000;
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'ACUTE DOSE', '#7dff5a');
        ctx.sfx('status-debuff');
      }
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      const x = n.x - 26, y = n.y - 36;
      const acute = time < acuteUntil;
      // A film badge clipped on: a strip that darkens with the dose.
      g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(x - 7, y - 9, 14, 18, 2);
      g.fillStyle(AMBER, 1); g.fillRect(x - 5, y - 7, 10, 4);
      const k = acute ? 1 : clamp(dose / ACUTE, 0, 1);
      g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 5, y - 1, 10, 8);
      g.fillStyle(acute ? GLOW_LIT : GLOW, 0.4 + k * 0.6); g.fillRect(x - 5, y + 7 - k * 8, 10, k * 8);
      if (acute) { glow(g, n.x, n.y - 6, 40, GLOW, 0.05, 2); g.lineStyle(2, GLOW_LIT, 0.4 + Math.sin(time / 80) * 0.3); g.strokeCircle(n.x, n.y - 4, 30); }
      if (time - halvedAt < 400) { const q = (time - halvedAt) / 400; g.lineStyle(2, AMBER_LIT, 1 - q); g.strokeRect(x - 7 - q * 6, y - 9 - q * 6, 14 + q * 12, 18 + q * 12); }
    },
  };
};

// ── Lead Apron ───────────────────────────────────────────────────────
// Every 9 s the apron is hung ready. The next hit you take while it is ready, the lead soaks half
// of it (healed straight back) — and that half is kept in the lead, to land on top of your next blow.

const apron: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  let stored = 0;
  let soakFx = -9999;
  let started = false;
  return {
    update(time) { if (!started) { started = true; readyAt = time + 2000; } },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 3 || now < readyAt || !live(ctx)) return;
      const half = Math.round(amount / 2);
      ctx.heal(ctx.player, half);
      stored += half;
      readyAt = now + 9000;
      soakFx = now;
      ctx.float(ctx.player.x, ctx.player.y - 48, 'LEAD', '#8a93a0');
      ctx.sfx('shield-block');
    },
    onHitDealt(amount) {
      if (amount < 1 || stored <= 0 || !foeLive(ctx)) return;
      const n = stored;
      stored = 0;
      ctx.hit(ctx.npc, n, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, `+${n} LEAD`, '#c0c8d0');
      ctx.sfx('anvil');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      // A little lead bib on the chest, with the trefoil: bright when hung ready, heavy when loaded.
      const x = p.x, y = p.y + 4;
      g.fillStyle(LEAD_DARK, 0.9); g.fillRoundedRect(x - 9, y - 8, 18, 16, 3);
      g.fillStyle(ready ? LEAD_LIT : LEAD, 0.9); g.fillRoundedRect(x - 7, y - 6, 14, 12, 2);
      trefoil(g, x, y, 4, ready ? AMBER : AMBER_DARK, undefined, 0.9);
      if (stored > 0) { g.fillStyle(LEAD_LIT, 0.8); for (let i = 0; i < Math.min(5, Math.ceil(stored / 3)); i++) g.fillCircle(x - 8 + i * 4, y + 12, 1.6); }
      if (time - soakFx < 400) { const k = (time - soakFx) / 400; g.lineStyle(3 * (1 - k), LEAD_LIT, 1 - k); g.strokeCircle(p.x, p.y, 24 + k * 16); }
    },
  };
};

// ── Glowcap Spore Jar ────────────────────────────────────────────────
// Every 5 s a glowcap sprouts where you stand (three at most, each lasting 9 s). Standing on one of
// your caps heals you 2 a second; a foe standing on one is burnt 3 a second.

const sporeJar: ItemScriptFactory = (ctx) => {
  const step = clock();
  const caps: { x: number; y: number; at: number }[] = [];
  let next = 0;
  let acc = 0;
  return {
    update(time) {
      const dt = step(time);
      if (next === 0) next = time + 2500;
      if (time >= next && live(ctx)) {
        next = time + 5000;
        caps.push({ x: ctx.player.x, y: ctx.player.y + 10, at: time });
        if (caps.length > 3) caps.shift();
      }
      for (let i = caps.length - 1; i >= 0; i--) if (time - caps[i].at > 9000) caps.splice(i, 1);
      acc += dt;
      if (acc < 1) return;
      acc = 0;
      if (live(ctx) && caps.some((c) => dist(c.x, c.y, ctx.player.x, ctx.player.y + 10) < 30)) ctx.heal(ctx.player, 2);
      if (foeLive(ctx) && caps.some((c) => dist(c.x, c.y, ctx.npc.x, ctx.npc.y + 10) < 30)) ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y);
    },
    drawGround(g, time) {
      for (const c of caps) {
        const k = clamp((time - c.at) / 400, 0, 1), fade = clamp((9000 - (time - c.at)) / 800, 0, 1);
        g.fillStyle(CAP, 0.12 * fade); g.fillCircle(c.x, c.y, 30 * k);
        g.lineStyle(1.5, CAP, 0.4 * fade); g.strokeCircle(c.x, c.y, 30 * k);
      }
    },
    drawAir(g, time) {
      for (const c of caps) {
        const k = clamp((time - c.at) / 400, 0, 1);
        if (k <= 0) continue;
        glowcaps(g, c.x, c.y + 4, 3, () => 0.5, 0.8 * k);
      }
    },
  };
};

// ── Decay Clock Fob ──────────────────────────────────────────────────
// A pocket decay clock. A third of every hit you land goes into the fob; every 3 s it ticks and
// pays half of what it holds out to the foe as a spark — keeping the rest, which never quite runs out.

const fob: ItemScriptFactory = (ctx) => {
  let store = 0;
  let next = 0;
  let sparkAt = -9999;
  let sparkFrom = { x: 0, y: 0 };
  return {
    update(time) {
      if (next === 0) next = time + 3000;
      if (time < next) return;
      next = time + 3000;
      if (store < 2 || !foeLive(ctx) || !live(ctx)) return;
      const pay = Math.floor(store / 2);
      store -= pay;
      ctx.hit(ctx.npc, pay, ctx.npc.x, ctx.npc.y - 10);
      sparkAt = time;
      sparkFrom = { x: ctx.player.x + 16, y: ctx.player.y + 4 };
      ctx.sfx('clock-tick');
    },
    onHitDealt(amount) { if (amount >= 1) store = Math.min(60, store + amount / 3); },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 16, y = p.y + 4;
      // The fob on its chain: a brass case, a face of halves, a hand creeping.
      g.lineStyle(1, COPPER_LIT, 0.8); g.lineBetween(p.x + 4, p.y - 4, x, y - 6);
      g.fillStyle(COPPER, 1); g.fillCircle(x, y, 7);
      g.fillStyle(AMBER_LIT, 1); g.fillCircle(x, y, 5.5);
      g.fillStyle(AMBER, 1); g.slice(x, y, 5.5, -Math.PI / 2, Math.PI / 2, false); g.fillPath();
      const k = clamp(1 - (next - time) / 3000, 0, 1);
      const a = -Math.PI / 2 + (1 - Math.pow(0.5, k * 4)) * Math.PI * 2;
      g.lineStyle(1.5, HAZARD_BLACK, 1); g.lineBetween(x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5);
      if (store >= 2) { g.fillStyle(GLOW, 0.3 + clamp(store / 40, 0, 0.6)); g.fillCircle(x, y + 10, 2 + store / 15); }
      if (time - sparkAt < 260 && foeLive(ctx)) {
        const q = (time - sparkAt) / 260;
        const n = ctx.npc;
        g.lineStyle(2, CHEREN_LIT, 1 - q);
        g.beginPath(); g.moveTo(sparkFrom.x, sparkFrom.y);
        for (let i = 1; i <= 6; i++) { const t = i / 6; g.lineTo(sparkFrom.x + (n.x - sparkFrom.x) * t + (i % 2 ? 6 : -6), sparkFrom.y + (n.y - 10 - sparkFrom.y) * t); }
        g.strokePath();
      }
    },
  };
};

// ── Isotope's Split Core (artifact) ──────────────────────────────────
// Every 4th hit you land splits a fragment off the core: it orbits you (two at most). Take a hit
// and a fragment bursts — healing back half the blow, and scorching the foe for 8 if near.

const splitCore: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let frags = 0;
  let burstFx: { x: number; y: number; at: number } | null = null;
  return {
    onHitDealt(amount) {
      if (amount < 1) return;
      hits++;
      if (hits >= 4) { hits = 0; if (frags < 2) { frags++; ctx.float(ctx.player.x, ctx.player.y - 50, 'SPLIT', '#d8ffb0'); ctx.sfx('crystal-chime'); } }
    },
    onHitTaken(amount) {
      if (amount < 3 || frags <= 0 || !live(ctx)) return;
      frags--;
      ctx.heal(ctx.player, Math.round(amount / 2));
      const now = ctx.scene.time.now;
      burstFx = { x: ctx.player.x, y: ctx.player.y, at: now };
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 260) ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y);
      ctx.sfx('explosion-small');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < frags; i++) {
        const a = time / 400 + i * Math.PI;
        core(g, p.x + Math.cos(a) * 30, p.y - 6 + Math.sin(a) * 14, 4, GLOW, 1);
      }
      if (burstFx && time - burstFx.at < 450) {
        const k = (time - burstFx.at) / 450;
        g.lineStyle(4 * (1 - k), GLOW_LIT, 1 - k); g.strokeCircle(burstFx.x, burstFx.y, 20 + k * 60);
      }
    },
  };
};

export const HALFLIFE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_BADGE, name: 'Dosimeter Badge', emoji: '📛', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A film badge in a lead clip, the kind Counter Click reads at the pit-head. This one reads whoever you hit.',
    script: CHARM_BADGE,
    scriptText: [
      'Every hit you land adds to your foe\'s dose; the dose halves every 4s.',
      'Reach 30 before it decays: the foe goes acute and takes +25% damage for 3s.',
    ],
  },
  {
    id: CHARM_APRON, name: 'Lead Apron', emoji: '🦺', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A child\'s lead bib from the Plumbery, cut down from a recalled roof. Heavy as a promise.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_APRON,
    scriptText: [
      'Every 9s the apron is hung ready: the next hit you take, it soaks half (healed back).',
      'The soaked half is kept in the lead and lands on top of your next hit.',
    ],
  },
  {
    id: CHARM_JAR, name: 'Glowcap Spore Jar', emoji: '🍄', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A jar of Botanist Glow\'s compost, lid punched. Whatever you stand on for long enough starts to grow.',
    effect: { maxHp: 6 },
    script: CHARM_JAR,
    scriptText: [
      'Every 5s a glowcap sprouts where you stand (3 at most, 9s each).',
      'On one of your caps you heal 2 a second; a foe on one burns for 3 a second.',
    ],
  },
  {
    id: CHARM_FOB, name: 'Decay Clock Fob', emoji: '⏱️', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'Mabel Halloway\'s own spare: a pocket decay clock. Each half takes as long as the whole. It never runs out.',
    script: CHARM_FOB,
    scriptText: [
      'A third of every hit you land goes into the fob.',
      'Every 3s it pays half of what it holds to your foe as a spark, and keeps the rest.',
    ],
  },
  {
    id: ART_ISOTOPE, name: 'Isotope\'s Split Core', emoji: '☢️', kind: 'artifact', isle: ISLE,
    flavor: 'A sliver of the Prince\'s own core, in a lead locket. It is warm. It will be warm for a thousand years.',
    effect: { maxHp: 15 },
    script: ART_ISOTOPE,
    scriptText: [
      'Every 4th hit you land splits a core fragment that orbits you (2 at most).',
      'Taking a hit bursts one: heal half the blow, and the foe takes 8 if within reach.',
    ],
  },
  {
    id: FISH_GAR, name: 'Glow Gar', emoji: '🐟', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'A long green-lit gar that drinks the glow out of the water. The Glow Ward packs them on the sick.',
    effect: { regenPerSecond: 0.6 },
  },
  {
    id: FISH_KOI, name: 'Isotope Koi', emoji: '🎏', kind: 'fish', sell: 58, isle: ISLE,
    flavor: 'Blue-white scales that blink like portholes. Bites like a live wire, Tobern says, and he would know.',
    effect: { damageMult: 1.04 },
  },
  {
    id: FISH_CARP, name: 'Halflife Carp', emoji: '🐠', kind: 'fish', sell: 96, isle: ISLE,
    flavor: 'Old as the dome and half as big as it was last year. Every year it is half as big again. It is still enormous.',
    effect: { cooldownMult: 0.96, maxHp: 4 },
  },
];

export const HALFLIFE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BADGE]: badge,
  [CHARM_APRON]: apron,
  [CHARM_JAR]: sporeJar,
  [CHARM_FOB]: fob,
  [ART_ISOTOPE]: splitCore,
};

export const HALFLIFE_SHOPS: ShopDef[] = [
  { id: 'halflife-shop', name: 'Becquerel\'s Lead & Luckpieces', stock: [CHARM_BADGE, CHARM_APRON, CHARM_JAR, CHARM_FOB], buys: true },
];

export const HALFLIFE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Cooling Pond', kind: 'coolant' }];

export const HALFLIFE_FISH: FishDef[] = [
  { id: FISH_GAR, fisheries: [FISHERY], weight: 6, fight: 2, size: [30, 90] },
  { id: FISH_KOI, fisheries: [FISHERY], weight: 3, fight: 3, size: [20, 52] },
  { id: FISH_CARP, fisheries: [FISHERY], weight: 1, fight: 5, size: [60, 140] },
];

