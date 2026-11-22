import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { blackFlame, moth } from './art';
import { CANDLE, CANDLE_LIT, CRESCENT, DUSK_LIT, IRON, MOON, MOON_DIM, STONE, STONE_DARK } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Umbral Court's goods: Mother Velvet's four charms, Prince Dusk's lantern, and the shadow
 * mere's three fish. Every charm is a piece of the court's dark turned to your use — a hung lamp,
 * a pinned shadow, a mirror's echo, a dial that only tells night. Scripts are registered below
 * under their item ids.
 */

const ISLE = 'slime';

export const CHARM_HOOK = 'umbral-charm-lamplighters-hook';
export const CHARM_PIN = 'umbral-charm-shadow-pin';
export const CHARM_LOCKET = 'umbral-charm-black-glass-locket';
export const CHARM_DIAL = 'umbral-charm-night-dial-ring';
export const ART_DUSK = 'art-dusk';

export const FISH_PERCH = 'fish-shade-perch';
export const FISH_PIKE = 'fish-umbra-pike';
export const FISH_EEL = 'fish-eclipse-eel';
export const FISHERY = 'umbral-mere';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Lamplighter's Hook ───────────────────────────────────────────────
// Every 7s you hang a little lamp where you stand (the old one gutters out). While your foe is in
// its light, your blows land 25% harder. Fight near your lamp — or bring them to it.

const hook: ItemScriptFactory = (ctx) => {
  const EVERY = 7000, LIGHT = 120;
  let lamp: { x: number; y: number; at: number } | null = null;
  let boostUntil = 0;
  const lit_ = () => !!lamp && foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, lamp.x, lamp.y) < LIGHT;
  return {
    update(time) {
      if (!live(ctx)) return;
      if (!lamp || time - lamp.at >= EVERY) {
        lamp = { x: ctx.player.x, y: ctx.player.y + 8, at: time };
        ctx.sfx('chain');
      }
      if (lit_() && time >= boostUntil) { ctx.boostDamage(1.25, 250); boostUntil = time + 250; }
    },
    drawGround(g, time) {
      if (!lamp) return;
      const left = clamp(1 - (time - lamp.at) / EVERY, 0, 1);
      const on = lit_();
      for (let k = 4; k >= 1; k--) { g.fillStyle(CANDLE, (on ? 0.05 : 0.03) * (0.4 + left * 0.6)); g.fillCircle(lamp.x, lamp.y, LIGHT * (0.4 + k * 0.15)); }
      g.lineStyle(on ? 2 : 1, CANDLE_LIT, on ? 0.6 : 0.25); g.strokeCircle(lamp.x, lamp.y, LIGHT);
    },
    drawAir(g, time) {
      if (!lamp) return;
      const left = clamp(1 - (time - lamp.at) / EVERY, 0, 1);
      const x = lamp.x, y = lamp.y - 8;
      g.lineStyle(2, IRON, 1); g.lineBetween(x - 6, y + 10, x - 6, y - 26);
      g.beginPath(); g.arc(x, y - 26, 6, Math.PI, 0, false); g.strokePath();
      g.lineStyle(1, IRON, 1); g.lineBetween(x + 6, y - 26, x + 6, y - 18);
      g.fillStyle(CANDLE, 0.8); g.fillRect(x + 2, y - 18, 8, 10);
      g.fillStyle(CANDLE_LIT, left); g.fillTriangle(x + 4, y - 9, x + 8, y - 9, x + 6, y - 16 - Math.sin(time / 80));
      glow(g, x + 6, y - 13, 14, CANDLE, 0.06 * left, 2);
    },
  };
};

// ── Shadow Pin ───────────────────────────────────────────────────────
// Your shadow lies long behind you, away from where you aim. A foe who stands on it for most of a
// second has their shadow pinned to it: stunned a moment, and bitten. At most every 7s.

const pin: ItemScriptFactory = (ctx) => {
  const LEN = 150, HOLD = 800, COOLDOWN = 7000;
  let onSince = -1;
  let lastPin = -9999;
  let pinFx = -9999;
  const shadowLine = () => {
    const a = ctx.facing(ctx.player) + Math.PI;
    return { x0: ctx.player.x, y0: ctx.player.y + 8, x1: ctx.player.x + Math.cos(a) * LEN, y1: ctx.player.y + 8 + Math.sin(a) * LEN };
  };
  const onIt = () => {
    if (!foeLive(ctx)) return false;
    const s = shadowLine();
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0;
    const t = clamp(((ctx.npc.x - s.x0) * dx + (ctx.npc.y - s.y0) * dy) / (dx * dx + dy * dy), 0, 1);
    return t > 0.25 && dist(ctx.npc.x, ctx.npc.y, s.x0 + dx * t, s.y0 + dy * t) < 30;
  };
  return {
    update(time) {
      if (!live(ctx) || time - lastPin < COOLDOWN) { onSince = -1; return; }
      if (!onIt()) { onSince = -1; return; }
      if (onSince < 0) onSince = time;
      if (time - onSince >= HOLD) {
        lastPin = time; pinFx = time; onSince = -1;
        ctx.stun(ctx.npc, 600);
        ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'PINNED', '#b0a0e8');
        ctx.sfx('stab');
      }
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const s = shadowLine();
      const ready = time - lastPin >= COOLDOWN;
      const a = Math.atan2(s.y1 - s.y0, s.x1 - s.x0), px = -Math.sin(a), py = Math.cos(a);
      g.fillStyle(0x030108, ready ? 0.38 : 0.18);
      g.fillTriangle(s.x0 + px * 10, s.y0 + py * 10, s.x0 - px * 10, s.y0 - py * 10, s.x1 + px * 16, s.y1 + py * 16);
      g.fillTriangle(s.x0 - px * 10, s.y0 - py * 10, s.x1 - px * 16, s.y1 - py * 16, s.x1 + px * 16, s.y1 + py * 16);
      g.fillStyle(0x030108, ready ? 0.42 : 0.2); g.fillCircle(s.x1, s.y1, 15);
      if (onSince >= 0) {
        const k = clamp((time - onSince) / HOLD, 0, 1);
        g.lineStyle(3, DUSK_LIT, 0.8); g.beginPath(); g.arc(ctx.npc.x, ctx.npc.y + 10, 20, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (time - pinFx < 600 && foeLive(ctx)) {
        // A silver pin through the shadow at their feet.
        const k = (time - pinFx) / 600;
        g.lineStyle(3, CRESCENT, 1 - k); g.lineBetween(ctx.npc.x, ctx.npc.y + 14, ctx.npc.x + 4, ctx.npc.y - 14 + k * 20);
      }
    },
  };
};

// ── Black-Glass Locket ───────────────────────────────────────────────
// A sliver of Twin's mirror. Every blow you land is struck again, a breath later, by the thing in
// the glass — at the spot your foe stood when you landed it. If they are still near it, they take
// a third of the blow again.

const locket: ItemScriptFactory = (ctx) => {
  const LAG = 1400, R = 100;
  let echoes: { x: number; y: number; at: number; amount: number; done: boolean }[] = [];
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || echoes.length > 8) return;
      echoes.push({ x: ctx.npc.x, y: ctx.npc.y, at: ctx.scene.time.now, amount, done: false });
    },
    update(time) {
      for (const e of echoes) {
        if (e.done || time - e.at < LAG) continue;
        e.done = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, e.x, e.y) < R) {
          ctx.hit(ctx.npc, Math.max(3, Math.round(e.amount / 3)), ctx.npc.x, ctx.npc.y);
          ctx.flash(ctx.npc.x, ctx.npc.y, DUSK_LIT);
        }
      }
      echoes = echoes.filter((e) => time - e.at < LAG + 400);
    },
    drawGround(g, time) {
      for (const e of echoes) {
        const k = clamp((time - e.at) / LAG, 0, 1);
        if (!e.done) {
          g.lineStyle(1.5, DUSK_LIT, 0.2 + k * 0.5); g.strokeCircle(e.x, e.y, R * (1.3 - k * 0.3));
          g.fillStyle(0x05030a, 0.25 + k * 0.4); g.fillEllipse(e.x, e.y, 26, 36);
        } else {
          const a = clamp(1 - (time - e.at - LAG) / 400, 0, 1);
          g.lineStyle(3, DUSK_LIT, a); g.strokeCircle(e.x, e.y, 30 + (1 - a) * 30);
        }
      }
    },
  };
};

// ── Night-Dial Ring ──────────────────────────────────────────────────
// A dial no wider than a fingernail, whose hand is a moon. Every 10 seconds it turns an hour, and
// when it does, 2 seconds come off the cooldown of every ability you have cast this fight.

const dialRing: ItemScriptFactory = (ctx) => {
  const HOUR = 10000, TAKE = 2000;
  const used = new Set<string>();
  let lastHour = -1;
  let turnFx = -9999;
  return {
    onCast(abilityId) { used.add(abilityId); },
    update(time) {
      if (!live(ctx)) return;
      const h = Math.floor(time / HOUR);
      if (lastHour < 0) { lastHour = h; return; }
      if (h !== lastHour) {
        lastHour = h;
        turnFx = time;
        if (used.size) {
          for (const id of used) ctx.refund(id, TAKE);
          ctx.float(ctx.player.x, ctx.player.y - 56, 'THE HOUR TURNS', '#c8d8ff');
          ctx.sfx('clock-tick');
        }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 36;
      const k = (time % HOUR) / HOUR;
      if (time - turnFx < 500) glow(g, x, y, 16, MOON, 0.08 * (1 - (time - turnFx) / 500), 2);
      g.fillStyle(STONE_DARK, 1); g.fillCircle(x, y, 8);
      g.fillStyle(STONE, 1); g.fillCircle(x, y, 6.5);
      g.lineStyle(1, MOON_DIM, 0.8); g.beginPath(); g.arc(x, y, 7.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      const a = -Math.PI / 2 + k * Math.PI * 2;
      g.fillStyle(MOON, 1); g.fillCircle(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.2);
    },
  };
};

// ── Dusk's Lantern (the Prince's artifact) ───────────────────────────
// The lantern Dusk carried through Nightfall, still warm. It hangs at your shoulder; every 9s it
// flares, and a foe close by is dazzled — stunned a moment and scorched. Once a fight, falling
// under 30% health, you step into the dark: you mend 24 over 3s and move 40% faster while you do.

const duskLantern: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, R = 170;
  let lastFlare = -1;
  let flareFx = -9999;
  let dark = false;
  let darkAt = -9999;
  let mended = 0;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      if (lastFlare < 0) lastFlare = time;
      if (time - lastFlare >= EVERY) {
        lastFlare = time;
        flareFx = time;
        ctx.sfx('light-beam');
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, ctx.player.x, ctx.player.y) < R) {
          ctx.stun(ctx.npc, 600);
          ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
          ctx.float(ctx.npc.x, ctx.npc.y - 50, 'DAZZLED', '#ffd27a');
        }
      }
      if (!dark && ctx.player.hp < ctx.player.maxHp * 0.3) {
        dark = true;
        darkAt = time;
        ctx.boostSpeed(1.4, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'INTO THE DARK', '#b0a0e8');
        ctx.sfx('hush');
      }
      if (dark && time - darkAt < 3000 && mended < 24) {
        const step = Math.min(24 - mended, 8 * Math.min(0.1, dt));
        mended += step;
        if (step > 0) ctx.heal(ctx.player, step);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 40 + Math.sin(time / 400) * 2;
      const f = time - flareFx < 400 ? 1 - (time - flareFx) / 400 : 0;
      if (f > 0) {
        g.lineStyle(3 * f, CANDLE_LIT, f); g.strokeCircle(p.x, p.y, R * (1 - f * 0.4));
        glow(g, x, y, 60 * f + 10, CANDLE, 0.1 * f, 3);
      }
      g.fillStyle(IRON, 1); g.fillTriangle(x - 6, y - 8, x + 6, y - 8, x, y - 14);
      g.fillStyle(CANDLE, 0.85); g.fillRect(x - 5, y - 8, 10, 12);
      g.lineStyle(1, IRON, 1); g.strokeRect(x - 5, y - 8, 10, 12);
      g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(x - 2, y + 2, x + 2, y + 2, x, y - 5);
      glow(g, x, y - 2, 12, CANDLE, 0.05, 2);
      // While in the dark: moths of your own, circling.
      if (dark && time - darkAt < 3000) {
        for (let i = 0; i < 3; i++) moth(g, p.x + Math.cos(time / 300 + i * 2.1) * 30, p.y - 10 + Math.sin(time / 300 + i * 2.1) * 18, 1, time / 1000 + i);
        blackFlame(g, p.x, p.y - 50, 0.5, time / 1000);
      }
    },
  };
};

export const UMBRAL_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_HOOK, name: 'Lamplighter\'s Hook', emoji: '🪝', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A little iron crook for hanging a lamp on, worn smooth by a lampwarden\'s hand. The lamp is yellow. Don\'t tell.',
    script: CHARM_HOOK,
    scriptText: [
      'Every 7s you hang a little lamp where you stand; the last one gutters out.',
      'While your foe stands in its light (120px), your hits deal +25%.',
    ],
  },
  {
    id: CHARM_PIN, name: 'Shadow Pin', emoji: '📌', kind: 'charm', price: 520, isle: ISLE,
    flavor: 'A long silver pin, like a hatpin. In Umbral they say you can pin a man by his shadow. Velvet says you can.',
    effect: { dodgeChance: 0.02 },
    script: CHARM_PIN,
    scriptText: [
      'Your shadow lies 150px behind you, away from where you aim.',
      'A foe standing on it for 0.8s is pinned: stunned 0.6s and hit for 6. At most every 7s.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Black-Glass Locket', emoji: '🪞', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A sliver of one of Twin\'s mirrors, set in a locket. Open it and something in it is always just turning away.',
    script: CHARM_LOCKET,
    scriptText: [
      'Every hit you land is struck again 1.4s later, at the spot your foe stood.',
      'If they are still within 100px of it, they take a third of the hit again (at least 3).',
    ],
  },
  {
    id: CHARM_DIAL, name: 'Night-Dial Ring', emoji: '💍', kind: 'charm', price: 1020, isle: ISLE,
    flavor: 'A ring set with a dial the size of a fingernail. Its hand is a moon. It has never once told the time of day.',
    effect: { maxHp: 6 },
    script: CHARM_DIAL,
    scriptText: [
      'Every 10s the dial turns an hour.',
      'When it does, 2s come off the cooldown of every ability you have cast this fight.',
    ],
  },
  {
    id: ART_DUSK, name: 'Dusk\'s Lantern', emoji: '🏮', kind: 'artifact', isle: ISLE,
    flavor: 'The only lantern the Prince ever carried. He gave it up without a word. The flame in it is yellow, and warm.',
    effect: { maxHp: 15 },
    script: ART_DUSK,
    scriptText: [
      'Every 9s the lantern flares: a foe within 170px is dazzled (stunned 0.6s) and takes 10.',
      'Once a fight, under 30% health, you step into the dark: heal 24 over 3s, +40% speed.',
    ],
  },
  {
    id: FISH_PERCH, name: 'Shade Perch', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'A perch the colour of the water, which is no colour. You find it by the shadow it does not cast.',
    effect: { regenPerSecond: 0.4 },
  },
  {
    id: FISH_PIKE, name: 'Umbra Pike', emoji: '🐊', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A long black pike that hunts by feel. Old Umbral wives say its liver slows the grey. They whisper it.',
    effect: { damageMult: 1.03 },
  },
  {
    id: FISH_EEL, name: 'Eclipse Eel', emoji: '🌑', kind: 'fish', sell: 52, isle: ISLE,
    flavor: 'Black with a ring of silver round each eye, like a moon going over a sun. It bites only in total dark.',
    effect: { cooldownMult: 0.96 },
  },
];

export const UMBRAL_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_HOOK]: hook,
  [CHARM_PIN]: pin,
  [CHARM_LOCKET]: locket,
  [CHARM_DIAL]: dialRing,
  [ART_DUSK]: duskLantern,
};

export const UMBRAL_SHOPS: ShopDef[] = [
  { id: 'umbral-shop', name: 'The Unlit Window', stock: [CHARM_HOOK, CHARM_PIN, CHARM_LOCKET, CHARM_DIAL], buys: true },
];

export const UMBRAL_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Shadow Mere', kind: 'blackwater' }];

export const UMBRAL_FISH: FishDef[] = [
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 6, fight: 2, size: [12, 26] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 3, fight: 4, size: [40, 96] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 1.4, fight: 5, size: [50, 120] },
];
