import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { automaton, segText, valve } from './art';
import { BYTE, BYTE_LIT, CARD, CARD_DARK, DIODE, FAULT, FILAMENT, NIXIE, PULSE } from './palette';
import { alive, clamp, dist } from './util';

/**
 * The Circuit Court's goods: Ferrule Pennywhistle's four charms, Prince Byte's clock crystal, and
 * the Coolant Sump's three fish. Every charm is a component that plays the court's own logic in
 * your favour — a card read when fully punched, a clockwork sentry wound by walking, a ferrite
 * ring that remembers a blow, a gate that rewards doing one thing at a time. Scripts are registered
 * below under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_CARD = 'circuit-charm-punch-card';
export const CHARM_SENTRY = 'circuit-charm-wind-up-sentry';
export const CHARM_CORE = 'circuit-charm-ferrite-core';
export const CHARM_XOR = 'circuit-charm-xor-locket';
export const ART_BYTE = 'art-byte';

export const FISH_SMELT = 'fish-solder-smelt';
export const FISH_DART = 'fish-diode-dart';
export const FISH_RAY = 'fish-relay-ray';
export const FISHERY = 'circuit-sump';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);
const SLOTS = ['click', 'e', 'r', 'f', 'q'] as const;

// ── Hollerith Card ───────────────────────────────────────────────────
// Five columns, one per ability slot. Casting from a slot punches its hole. With all five punched
// the card is read: every ability you punched it with is refunded 1.5s and you hit 25% harder for
// 3s. Then a blank card feeds in.

const punchCard: ItemScriptFactory = (ctx) => {
  const punched = new Map<string, string>();
  let readAt = -9999;
  let boostUntil = 0;
  return {
    onCast(abilityId, slot) {
      if (!slot || !live(ctx)) return;
      punched.set(slot, abilityId);
      if (SLOTS.every((s) => punched.has(s))) {
        for (const id of punched.values()) ctx.refund(id, 1500);
        punched.clear();
        const now = ctx.scene.time.now;
        readAt = now;
        boostUntil = now + 3000;
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'CARD READ', '#ffd890');
        ctx.sfx('jackpot');
      } else ctx.sfx('reload');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 40, y = p.y - 52;
      const read = time - readAt < 500;
      g.fillStyle(CARD_DARK, 1); g.fillRect(x - 1, y + 1, 32, 15);
      g.fillStyle(read ? 0xffffff : CARD, 1); g.fillRect(x, y, 31, 14);
      g.fillStyle(0x0e2a1c, 1); g.fillTriangle(x, y, x + 4, y, x, y + 4);
      SLOTS.forEach((s, i) => {
        const hx = x + 3 + i * 6;
        if (punched.has(s)) { g.fillStyle(0x1a1410, 1); g.fillRect(hx, y + 4, 3, 6); }
        else { g.lineStyle(0.8, 0xb85a4a, 0.6); g.strokeRect(hx, y + 4, 3, 6); }
      });
      if (time < boostUntil) { g.lineStyle(1.5, FILAMENT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeRect(x - 3, y - 3, 37, 20); }
    },
  };
};

// ── Wind-Up Sentry ───────────────────────────────────────────────────
// A clockwork soldier at your heel, wound by your walking. Every 900px you cover winds it full:
// it steps off and marches at the foe, and reaching them it swings for 12. Then back to your heel.

const sentry: ItemScriptFactory = (ctx) => {
  const WIND_PX = 900;
  let wound = 0;
  let lastX = NaN, lastY = NaN;
  let march: { x: number; y: number; step: number; swungAt: number } | null = null;
  let heel = { x: 0, y: 0, step: 0 };
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lastX) && !march) wound = Math.min(WIND_PX, wound + Math.min(40, Math.hypot(p.x - lastX, p.y - lastY)));
      lastX = p.x; lastY = p.y;
      // At heel: trail a little behind.
      const hx = p.x - 34, hy = p.y + 6;
      heel = { x: heel.x + (hx - heel.x) * Math.min(1, dt * 8), y: heel.y + (hy - heel.y) * Math.min(1, dt * 8), step: heel.step + dt * 6 };
      if (!march && wound >= WIND_PX && foeLive(ctx)) {
        march = { x: heel.x, y: heel.y, step: 0, swungAt: 0 };
        wound = 0;
        ctx.sfx('gear-turn');
      }
      if (march) {
        const n = ctx.npc;
        if (march.swungAt) {
          if (time - march.swungAt > 900) march = null;
          return;
        }
        if (!foeLive(ctx)) { march = null; return; }
        const d = dist(march.x, march.y, n.x, n.y);
        const sp = 115 * dt;
        march.x += ((n.x - march.x) / Math.max(1, d)) * Math.min(sp, d);
        march.y += ((n.y - march.y) / Math.max(1, d)) * Math.min(sp, d);
        march.step += dt * 10;
        if (d < 30) {
          march.swungAt = time;
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 44, 'CLANK', '#ffd890');
          ctx.sfx('clang');
        }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      if (march) automaton(g, march.x, march.y, 0.6, march.step, 1 - clamp((time - (march.swungAt || time)) / 900, 0, 1), PULSE);
      else automaton(g, heel.x, heel.y, 0.5, heel.step, wound / WIND_PX, wound >= WIND_PX * 0.8 ? FILAMENT : PULSE);
    },
  };
};

// ── Ferrite Core ─────────────────────────────────────────────────────
// A ring of ferrite that remembers. Take a blow of 4 or more and it is held in the core; if you go
// 2.5s without being struck again, the core replays it at the foe — 70% of it, up to 20. Struck
// again, the core forgets and holds the new blow instead.

const ferrite: ItemScriptFactory = (ctx) => {
  let held = 0;
  let heldAt = 0;
  let firedAt = -9999;
  let from = { x: 0, y: 0 };
  return {
    onHitTaken(amount) {
      if (amount < 4) return;
      held = amount;
      heldAt = ctx.scene.time.now;
    },
    update(time) {
      if (!held || !live(ctx)) return;
      if (time - heldAt >= 2500 && foeLive(ctx)) {
        const dmg = Math.min(20, Math.round(held * 0.7));
        held = 0;
        firedAt = time;
        from = { x: ctx.player.x, y: ctx.player.y };
        ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 44, 'REPLAYED', '#e0a0ff');
        ctx.sfx('time-warp');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 30, y = p.y - 40;
      const k = held ? clamp((time - heldAt) / 2500, 0, 1) : 0;
      g.lineStyle(3.5, held ? 0x9a6a4a : 0x3a2a24, 1); g.strokeCircle(x, y, 6);
      if (held) {
        g.lineStyle(1.5, 0xc87aff, 0.9);
        g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        glow(g, x, y, 12, 0xc87aff, 0.05, 2);
      }
      if (time - firedAt < 300 && foeLive(ctx)) {
        const f = 1 - (time - firedAt) / 300;
        g.lineStyle(4 * f, 0xc87aff, f); g.lineBetween(from.x, from.y - 10, ctx.npc.x, ctx.npc.y - 10);
      }
    },
  };
};

// ── XOR Locket ───────────────────────────────────────────────────────
// Two inputs: you landed a hit in the last 2s; you took one in the last 2s. Exactly one true, the
// locket lights: dealing without taking, you run 15% faster; taking without dealing, your next hit
// ripostes for 10 more and heals you 5. Both or neither and it sits dark.

const xorLocket: ItemScriptFactory = (ctx) => {
  let dealtAt = -9999, takenAt = -9999;
  let speedUntil = 0;
  let state: 'off' | 'a' | 'b' = 'off';
  return {
    onHitTaken() { takenAt = ctx.scene.time.now; },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (state === 'b' && amount >= 1 && foeLive(ctx)) {
        ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y);
        ctx.heal(ctx.player, 5);
        ctx.float(ctx.npc.x, ctx.npc.y - 44, 'RIPOSTE', '#9af6ff');
        ctx.sfx('stab');
        takenAt = -9999;
      }
      dealtAt = now;
    },
    update(time) {
      if (!live(ctx)) return;
      const a = time - dealtAt < 2000, b = time - takenAt < 2000;
      state = a !== b ? (a ? 'a' : 'b') : 'off';
      if (state === 'a' && time >= speedUntil) { ctx.boostSpeed(1.15, 250); speedUntil = time + 250; }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 60;
      const c = state === 'a' ? DIODE : state === 'b' ? PULSE : 0x3a3a42;
      g.fillStyle(0x1a1a20, 0.9); g.fillRoundedRect(x - 10, y - 7, 20, 14, 4);
      // The XOR symbol: an OR with a second curve behind it.
      g.lineStyle(1.5, c, 1);
      g.beginPath(); g.arc(x - 10, y, 7, -0.8, 0.8, false); g.strokePath();
      g.beginPath(); g.arc(x - 6, y, 7, -0.8, 0.8, false); g.strokePath();
      g.lineBetween(x - 2, y - 5, x + 6, y); g.lineBetween(x - 2, y + 5, x + 6, y);
      if (state !== 'off') glow(g, x, y, 14 + Math.sin(time / 90) * 2, c, 0.04, 2);
    },
  };
};

// ── Byte's Clock Crystal ─────────────────────────────────────────────
// Overclock: each cast within 2.5s of the last raises the clock a notch (to 5). Each notch is +4%
// damage and +3% speed. At the fifth notch the core dumps — 16 to a foe within 260px, heal 6 — and
// the clock resets. Let it lapse and it resets too.

const clockCrystal: ItemScriptFactory = (ctx) => {
  let notch = 0;
  let lastCast = -9999;
  let windowUntil = 0;
  let dumpAt = -9999;
  return {
    onCast() {
      const now = ctx.scene.time.now;
      notch = now - lastCast < 2500 ? notch + 1 : 1;
      lastCast = now;
      if (notch >= 5) {
        notch = 0;
        dumpAt = now;
        ctx.heal(ctx.player, 6);
        if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 260) ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'CORE DUMP', '#a0ffcc');
        ctx.sfx('plasma-arc');
      } else ctx.sfx('clock-tick');
    },
    update(time) {
      if (!live(ctx)) return;
      if (notch && time - lastCast > 2500) notch = 0;
      if (notch && time >= windowUntil) {
        ctx.boostDamage(1 + notch * 0.04, 250);
        ctx.boostSpeed(1 + notch * 0.03, 250);
        windowUntil = time + 250;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 28, y = p.y - 46;
      valve(g, x, y + 10, 0.55, 0.3 + notch * 0.14, false);
      segText(g, x - 8, y - 18, 'X' + notch, 8, notch >= 4 ? FAULT : NIXIE, 0.95);
      if (time - dumpAt < 600 && foeLive(ctx)) {
        const k = (time - dumpAt) / 600;
        g.lineStyle(3 * (1 - k), BYTE_LIT, 1 - k); g.strokeCircle(p.x, p.y, 30 + k * 230);
        g.lineStyle(2 * (1 - k), BYTE, (1 - k) * 0.6); g.strokeCircle(p.x, p.y, 20 + k * 200);
      }
    },
  };
};

export const CIRCUIT_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_CARD, name: 'Hollerith Card', emoji: '🗂️', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A blank card from the mills, five columns ruled in red. Ferrule sells them to people who want to be counted properly.',
    script: CHARM_CARD,
    scriptText: [
      'Five holes, one per ability slot: casting from a slot punches its hole.',
      'All five punched, the card is read: each ability is refunded 1.5s and you deal +25% damage for 3s.',
    ],
  },
  {
    id: CHARM_SENTRY, name: 'Wind-Up Sentry', emoji: '🤖', kind: 'charm', price: 520, isle: ISLE,
    flavor: 'A brass soldier the height of a boot, from Gearlock\'s seconds bin. Its key turns as you walk.',
    effect: { maxHp: 5 },
    script: CHARM_SENTRY,
    scriptText: [
      'A clockwork sentry follows at your heel, wound by your walking: every 900px fills it.',
      'Fully wound, it marches on your foe and swings for 12, then comes back to be wound again.',
    ],
  },
  {
    id: CHARM_CORE, name: 'Ferrite Core', emoji: '⭕', kind: 'charm', price: 700, isle: ISLE,
    flavor: 'One ring out of Rom\'s store, still threaded with a hair of copper. It holds one thing at a time.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_CORE,
    scriptText: [
      'A blow of 4 or more is held in the core. Go 2.5s without being struck again and it replays at your foe.',
      'The replay deals 70% of the blow (up to 20). A new blow overwrites the old one.',
    ],
  },
  {
    id: CHARM_XOR, name: 'XOR Locket', emoji: '🔀', kind: 'charm', price: 900, isle: ISLE,
    flavor: 'Nand\'s apprentices are given one when they pass. "One or the other, never both," it says inside.',
    script: CHARM_XOR,
    scriptText: [
      'Inputs: you hit in the last 2s; you were hit in the last 2s. It lights when exactly one is true.',
      'Hitting but unhurt: +15% speed. Hurt but not hitting: your next hit ripostes for 10 and heals 5.',
    ],
  },
  {
    id: ART_BYTE, name: 'Byte\'s Clock Crystal', emoji: '⏱️', kind: 'artifact', isle: ISLE,
    flavor: 'The quartz that set the Tabulator\'s time, and the Prince\'s. It still hums at thirty-two thousand to the second.',
    effect: { maxHp: 10, cooldownMult: 0.95 },
    script: ART_BYTE,
    scriptText: [
      'Each cast within 2.5s of the last raises the clock a notch (to 5): +4% damage and +3% speed each.',
      'At the fifth notch the core dumps: 16 to a foe within 260px and heal 6. The clock resets.',
    ],
  },
  {
    id: FISH_SMELT, name: 'Solder Smelt', emoji: '🐟', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'A slim silver fish that lives on the solder drips under the Tabulator\'s outflow. Tastes of tin.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_DART, name: 'Diode Dart', emoji: '🐠', kind: 'fish', sell: 36, isle: ISLE,
    flavor: 'Swims one way only, and glows green doing it. People eat them for the spark. The Grid calls that theft.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_RAY, name: 'Relay Ray', emoji: '🐡', kind: 'fish', sell: 75, isle: ISLE,
    flavor: 'A flat black ray that clicks when it turns. Old operators swear it switches the sump from one side to the other.',
    effect: { cooldownMult: 0.97 },
  },
];

export const CIRCUIT_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_CARD]: punchCard,
  [CHARM_SENTRY]: sentry,
  [CHARM_CORE]: ferrite,
  [CHARM_XOR]: xorLocket,
  [ART_BYTE]: clockCrystal,
};

export const CIRCUIT_SHOPS: ShopDef[] = [
  { id: 'circuit-shop', name: 'Pennywhistle\'s Components', stock: [CHARM_CARD, CHARM_SENTRY, CHARM_CORE, CHARM_XOR], buys: true },
];

export const CIRCUIT_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Coolant Sump', kind: 'oil' }];

export const CIRCUIT_FISH: FishDef[] = [
  { id: FISH_SMELT, fisheries: [FISHERY], weight: 6, fight: 2, size: [9, 22] },
  { id: FISH_DART, fisheries: [FISHERY], weight: 3, fight: 3, size: [12, 30] },
  { id: FISH_RAY, fisheries: [FISHERY], weight: 1, fight: 5, size: [30, 80] },
];

