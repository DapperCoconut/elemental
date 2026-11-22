import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { anvil, oreCart, railTrack } from './art';
import {
  ANVIL_CORE, BRONZE, BRONZE_DARK, BRONZE_LIT, HEAT_ORANGE, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, STEAM,
} from './palette';
import { alive, clamp, clock, dist, heatColor, segDist } from './util';

/**
 * The Forge Court's goods: Mags Clinker's four charms, Prince Anvil's hammerhead, and the quench
 * pond's two fish. Every charm is a piece of foundry kit that plays one of the court's own rules
 * in your favour — Tilda's rails, Cinder's bellows, Hild's quench, the Great Hammer's bell.
 * Scripts are registered below under their item ids.
 */

const ISLE = 'earth';

export const CHARM_SPIKE = 'forge-charm-rail-spike';
export const CHARM_BELLOWS = 'forge-charm-pocket-bellows';
export const CHARM_FLASK = 'forge-charm-quench-flask';
export const CHARM_BELL = 'forge-charm-anvil-bell';
export const ART_ANVIL = 'art-anvil';

export const FISH_PERCH = 'fish-ironscale-perch';
export const FISH_SUCKER = 'fish-slag-sucker';
export const FISHERY = 'forge-quench';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Railhand's Spike ─────────────────────────────────────────────────
// Every 7s a rail is laid across the arena through the foe, on the line from you; it glows for a
// second, then a cart runs it. Still on the rail when it comes through, they take 12.

const spike: ItemScriptFactory = (ctx) => {
  const EVERY = 7000, WARN = 1000, RUN = 600;
  let next = -1;
  let rail: { ax: number; ay: number; bx: number; by: number; at: number; dealt: boolean } | null = null;
  return {
    update(time) {
      if (next < 0) next = time + 3000;
      if (!live(ctx) || !foeLive(ctx)) return;
      if (!rail && time >= next) {
        next = time + EVERY;
        const p = ctx.player, n = ctx.npc;
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        const L = 1400;
        rail = { ax: n.x - Math.cos(a) * L, ay: n.y - Math.sin(a) * L, bx: n.x + Math.cos(a) * L, by: n.y + Math.sin(a) * L, at: time, dealt: false };
        ctx.sfx('trap-set');
      }
      if (rail && !rail.dealt && time >= rail.at + WARN) {
        rail.dealt = true;
        ctx.sfx('train-horn');
        const n = ctx.npc;
        if (segDist(n.x, n.y, rail.ax, rail.ay, rail.bx, rail.by) < 28) {
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'RUN DOWN', '#ffc23a');
        }
      }
      if (rail && time > rail.at + WARN + RUN) rail = null;
    },
    drawGround(g, time) {
      if (!rail) return;
      const k = clamp((time - rail.at) / WARN, 0, 1);
      railTrack(g, { x: rail.ax, y: rail.ay }, { x: rail.bx, y: rail.by }, 18);
      if (!rail.dealt) { g.lineStyle(10, HEAT_YELLOW, 0.1 + k * 0.25); g.lineBetween(rail.ax, rail.ay, rail.bx, rail.by); }
    },
    drawAir(g, time) {
      if (!rail || !rail.dealt) return;
      const k = clamp((time - rail.at - WARN) / RUN, 0, 1);
      const a = Math.atan2(rail.by - rail.ay, rail.bx - rail.ax);
      const mx = (rail.ax + rail.bx) / 2, my = (rail.ay + rail.by) / 2;
      const x = mx + Math.cos(a) * (k - 0.5) * 1100, y = my + Math.sin(a) * (k - 0.5) * 1100;
      oreCart(g, x, y, 1, a, 'ore');
      glow(g, x + Math.cos(a) * 24, y + Math.sin(a) * 24, 26, HEAT_YELLOW, 0.05, 2);
    },
  };
};

// ── Pocket Bellows ───────────────────────────────────────────────────
// Each hit you land puffs the bellows: one ember (up to 6) circles you. Cast any ability other
// than your basic attack and the bellows blow them all down a heat-lance at the foe: 3 per ember.

const pocketBellows: ItemScriptFactory = (ctx) => {
  let embers = 0;
  let lanceAt = -9999;
  let lance = { x1: 0, y1: 0, x2: 0, y2: 0, n: 0 };
  return {
    onHitDealt(amount) { if (amount >= 2) embers = Math.min(6, embers + 1); },
    onCast(_id, slot) {
      if (slot === 'click' || slot === null || embers < 2 || !live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (dist(p.x, p.y, n.x, n.y) > 380) return;
      ctx.hit(n, embers * 3, n.x, n.y);
      ctx.float(n.x, n.y - 50, 'BLOWN HOT', '#f06a1a');
      ctx.sfx('flame-burst');
      lance = { x1: p.x, y1: p.y - 10, x2: n.x, y2: n.y - 10, n: embers };
      lanceAt = ctx.scene.time.now;
      embers = 0;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      for (let i = 0; i < embers; i++) {
        const a = time / 500 + (i / 6) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 26, y = p.y - 8 + Math.sin(a) * 12;
        glow(g, x, y, 7, HEAT_ORANGE, 0.12, 2);
        g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_ORANGE, 1); g.fillCircle(x, y, 2.4);
      }
      const k = (time - lanceAt) / 350;
      if (k < 1) {
        g.lineStyle(10 * (1 - k) + lance.n, HEAT_ORANGE, 0.7 * (1 - k)); g.lineBetween(lance.x1, lance.y1, lance.x2, lance.y2);
        g.lineStyle(3, HEAT_WHITE, 0.9 * (1 - k)); g.lineBetween(lance.x1, lance.y1, lance.x2, lance.y2);
      }
    },
  };
};

// ── Quench Flask ─────────────────────────────────────────────────────
// Every hit you take heats you. At full heat the flask vents: a ring of steam scalds the foe for
// 14 if they are within 150px, and you are cooled and heal 8.

const quenchFlask: ItemScriptFactory = (ctx) => {
  let heat = 0;
  let ventAt = -9999;
  return {
    onHitTaken(amount) {
      if (amount <= 0 || !live(ctx)) return;
      heat = Math.min(100, heat + 18);
      if (heat < 100) return;
      heat = 0;
      ventAt = ctx.scene.time.now;
      const p = ctx.player, n = ctx.npc;
      ctx.sfx('geyser');
      ctx.heal(p, 8);
      if (foeLive(ctx) && dist(p.x, p.y, n.x, n.y) < 150) { ctx.hit(n, 14, n.x, n.y); ctx.float(n.x, n.y - 50, 'SCALDED', '#d8e2e8'); }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The flask at the hip: a little bottle filling with red.
      const x = p.x + 20, y = p.y + 4;
      g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 5, y - 10, 10, 14, 3);
      g.fillStyle(heatColor(heat / 100), 1); g.fillRect(x - 3, y + 2 - (heat / 100) * 10, 6, (heat / 100) * 10);
      g.fillStyle(IRON_LIT, 1); g.fillRect(x - 2, y - 13, 4, 3);
      if (heat > 60) glow(g, p.x, p.y - 6, 30, HEAT_ORANGE, 0.02 + (heat - 60) / 1000, 3);
      const k = (time - ventAt) / 700;
      if (k < 1) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(STEAM, 0.4 * (1 - k)); g.fillCircle(p.x + Math.cos(a) * 150 * k, p.y + Math.sin(a) * 110 * k, 10 + k * 14);
        }
      }
    },
  };
};

// ── Anvil Bell ───────────────────────────────────────────────────────
// Every 4th hit you land rings the bell: 1.2s comes off every ability you have cast this fight,
// and for 1.5s your blows land 25% harder.

const anvilBell: ItemScriptFactory = (ctx) => {
  const used = new Set<string>();
  let count = 0;
  let rungAt = -9999;
  return {
    onCast(id, slot) { if (slot) used.add(id); },
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx)) return;
      count++;
      if (count < 4) return;
      count = 0;
      rungAt = ctx.scene.time.now;
      for (const id of used) ctx.refund(id, 1200);
      ctx.boostDamage(1.25, 1500);
      ctx.sfx('anvil');
      ctx.float(ctx.player.x, ctx.player.y - 56, 'RING', '#e0ae62');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const swing = time - rungAt < 1500 ? Math.sin((time - rungAt) / 60) * 0.5 * (1 - (time - rungAt) / 1500) : 0;
      const x = p.x - 22, y = p.y - 40;
      g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x, y - 10, x + Math.sin(swing) * 3, y - 4);
      const bx = x + Math.sin(swing) * 6;
      g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(bx - 6, y + 6, bx + 6, y + 6, bx, y - 6);
      g.fillStyle(BRONZE, 1); g.fillCircle(bx, y - 2, 4);
      g.fillStyle(BRONZE_LIT, 1); g.fillRect(bx - 6, y + 5, 12, 1.5);
      // Pips: hits toward the next ring.
      for (let i = 0; i < 3; i++) { g.fillStyle(i < count ? BRONZE_LIT : 0x000000, i < count ? 1 : 0.4); g.fillCircle(x - 8 + i * 8, y + 14, 2); }
      const k = (time - rungAt) / 600;
      if (k < 1) { g.lineStyle(2, BRONZE_LIT, 0.7 * (1 - k)); g.strokeCircle(bx, y, 10 + k * 50); g.strokeCircle(bx, y, 6 + k * 30); }
    },
  };
};

// ── Anvil's Hammerhead (artifact) ────────────────────────────────────
// Every 5th hit you land calls the Prince's hammer down on the foe: a shadow under them, and 0.8s
// later the blow — 22 if they have not stepped out of it. Once a fight, falling under 30% health,
// you are quenched and tempered: heal 30 over 3s.

const hammerhead: ItemScriptFactory = (ctx) => {
  const tick = clock();
  let count = 0;
  let mark: { x: number; y: number; at: number; dealt: boolean } | null = null;
  let tempered = false;
  let temperLeft = 0;
  let temperAt = -9999;
  return {
    update(time) {
      const dt = tick(time);
      if (mark && !mark.dealt && time >= mark.at + 800) {
        mark.dealt = true;
        ctx.sfx('gravity-slam');
        const n = ctx.npc;
        if (foeLive(ctx) && dist(n.x, n.y, mark.x, mark.y) < 54) { ctx.hit(n, 22, n.x, n.y); ctx.float(n.x, n.y - 54, 'STRUCK', '#ff7a2a'); }
      }
      if (mark && time > mark.at + 1400) mark = null;
      if (!tempered && live(ctx) && ctx.player.hp < ctx.player.maxHp * 0.3) {
        tempered = true;
        temperLeft = 30;
        temperAt = time;
        ctx.sfx('sizzle');
        ctx.float(ctx.player.x, ctx.player.y - 56, 'TEMPERED', '#9ad0ff');
      }
      if (temperLeft > 0 && live(ctx)) {
        const n = Math.min(temperLeft, 10 * dt);
        temperLeft -= n;
        ctx.heal(ctx.player, n);
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      count++;
      if (count < 5 || mark) return;
      count = 0;
      mark = { x: ctx.npc.x, y: ctx.npc.y, at: ctx.scene.time.now, dealt: false };
      ctx.sfx('beam-charge');
    },
    drawGround(g, time) {
      if (!mark) return;
      if (!mark.dealt) {
        const k = clamp((time - mark.at) / 800, 0, 1);
        g.fillStyle(0x000000, 0.2 + k * 0.3); g.fillEllipse(mark.x, mark.y + 4, 60 + k * 50, 22 + k * 18);
        g.lineStyle(2, ANVIL_CORE, 0.3 + k * 0.6); g.strokeCircle(mark.x, mark.y, 54);
      } else {
        const k = clamp((time - mark.at - 800) / 600, 0, 1);
        g.lineStyle(4 * (1 - k), ANVIL_CORE, 1 - k); g.strokeEllipse(mark.x, mark.y, 60 + k * 160, 24 + k * 64);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(2, IRON_DARK, 1 - k); g.lineBetween(mark.x + Math.cos(a) * 14, mark.y + Math.sin(a) * 6, mark.x + Math.cos(a) * 40, mark.y + Math.sin(a) * 16); }
      }
    },
    drawAir(g, time) {
      if (mark && !mark.dealt) {
        // The hammer coming down out of the dark.
        const k = clamp((time - mark.at) / 800, 0, 1);
        const y = mark.y - 260 + k * k * 240;
        g.lineStyle(7, 0x3e2a1a, 1); g.lineBetween(mark.x + 30, y - 70, mark.x + 6, y - 6);
        g.fillStyle(IRON_DARK, 1); g.fillRect(mark.x - 28, y - 22, 56, 30);
        g.fillStyle(IRON, 1); g.fillRect(mark.x - 26, y - 20, 22, 26);
        g.fillStyle(ANVIL_CORE, 0.6 + k * 0.4); g.fillRect(mark.x - 28, y + 6, 56, 3);
      }
      if (live(ctx) && time - temperAt < 3000) {
        const p = ctx.player;
        g.lineStyle(2, 0x9ad0ff, 0.6 * (1 - (time - temperAt) / 3000)); g.strokeCircle(p.x, p.y - 6, 32);
        anvil(g, p.x, p.y - 44, 0.3, 0.6);
      }
    },
  };
};

export const FORGE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SPIKE, name: 'Railhand\'s Spike', emoji: '🛤️', kind: 'charm', price: 290, isle: ISLE,
    flavor: 'A rail spike with a cart wheel scratched on its head. Tilda\'s gang drive them for luck. This one wasn\'t driven.',
    script: CHARM_SPIKE,
    scriptText: [
      'Every 7s a rail is laid through your foe, on the line from you. 1s later a cart runs it.',
      'If they are still on the rail, it runs them down for 12.',
    ],
  },
  {
    id: CHARM_BELLOWS, name: 'Pocket Bellows', emoji: '🪗', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A bellows no bigger than a purse, for lighting a pipe off a forge. Fenwick\'s, from before his eyebrows went.',
    script: CHARM_BELLOWS,
    scriptText: [
      'Each hit you land puffs an ember round you (up to 6).',
      'Cast any ability but your basic attack with 2+ embers to blow them at the foe: 3 damage per ember (380px reach).',
    ],
  },
  {
    id: CHARM_FLASK, name: 'Quench Flask', emoji: '🧪', kind: 'charm', price: 610, isle: ISLE,
    flavor: 'A stoppered iron flask of quench water from Hild\'s pond. It is always warm. Nobody knows why.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_FLASK,
    scriptText: [
      'Every hit you take heats the flask. On the 6th, it vents: heal 8,',
      'and a ring of steam scalds your foe for 14 if they are within 150px.',
    ],
  },
  {
    id: CHARM_BELL, name: 'Anvil Bell', emoji: '🔔', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'A tiny bronze bell cast in the pit from a name-bell\'s off-cuts. Osric says it rings the Long Heat. It rings.',
    effect: { maxHp: 6 },
    script: CHARM_BELL,
    scriptText: [
      'Every 4th hit you land rings the bell: 1.2s off every ability you have cast this fight,',
      'and your blows land 25% harder for 1.5s.',
    ],
  },
  {
    id: ART_ANVIL, name: 'Anvil\'s Hammerhead', emoji: '🔨', kind: 'artifact', isle: ISLE,
    flavor: 'The head of the Prince\'s first hammer, the one he was made to forge as a boy. It still has his small handprints in the scale.',
    effect: { maxHp: 15 },
    script: ART_ANVIL,
    scriptText: [
      'Every 5th hit you land brings a hammer down on the foe: 22 damage 0.8s later if they stay in its shadow.',
      'Once a fight, dropping under 30% health, you are tempered: heal 30 over 3s.',
    ],
  },
  {
    id: FISH_PERCH, name: 'Ironscale Perch', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A dark perch whose scales take a blued sheen off the quench water. It likes the warm end, where the steam is.',
    effect: { damageTakenMult: 0.98 },
  },
  {
    id: FISH_SUCKER, name: 'Slag Sucker', emoji: '🐡', kind: 'fish', sell: 36, isle: ISLE,
    flavor: 'A heavy, whiskered bottom-feeder that lives on the scale at the bottom of the pond. It tastes faintly of iron.',
    effect: { maxHp: 5 },
  },
];

export const FORGE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SPIKE]: spike,
  [CHARM_BELLOWS]: pocketBellows,
  [CHARM_FLASK]: quenchFlask,
  [CHARM_BELL]: anvilBell,
  [ART_ANVIL]: hammerhead,
};

export const FORGE_SHOPS: ShopDef[] = [
  { id: 'forge-shop', name: 'Clinker & Daughter, Ironmongers', stock: [CHARM_SPIKE, CHARM_BELLOWS, CHARM_FLASK, CHARM_BELL], buys: true },
];

export const FORGE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Quench Pond', kind: 'steam' }];

export const FORGE_FISH: FishDef[] = [
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 28] },
  { id: FISH_SUCKER, fisheries: [FISHERY], weight: 2, fight: 4, size: [24, 62] },
];
