import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { catSit, crownGlyph, sealedBox, vial } from './art';
import {
  BOTH, BOTH_LIT, BRASS, BRASS_DARK, CAT, COPPER, COPPER_DARK, COPPER_LIT, STATE_A, STATE_A_LIT, STATE_B, STATE_B_LIT,
} from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The Superposition Court's goods: Ottilie Eigen's four charms, Prince Both's other self, and the
 * quantum well's three fish. Every charm plays one of the court's two-at-once rules in your
 * favour — the box that is both, the dial that cannot know both, the coin that lands both ways,
 * the slits that strike twice. Scripts are registered below under their item ids.
 */

const ISLE = 'electricity';

export const CHARM_LOCKET = 'superposition-charm-locket';
export const CHARM_DIAL = 'superposition-charm-dial';
export const CHARM_COIN = 'superposition-charm-coin';
export const CHARM_LENS = 'superposition-charm-lens';
export const ART_BOTH = 'art-both';

export const FISH_SPRAT = 'fish-schrodinger-sprat';
export const FISH_EEL = 'fish-entangled-eel';
export const FISH_PERCH = 'fish-probability-perch';
export const FISHERY = 'superposition-well';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Unopened Locket ──────────────────────────────────────────────────
// A hit you take goes in the locket (at most once every 5s) and sits there, both taken and not,
// for 1.5s. Then the locket opens: half the time the hit never happened and is healed back in full.

const locket: ItemScriptFactory = (ctx) => {
  let held: { amount: number; at: number } | null = null;
  let readyAt = 0;
  let result: { at: number; undone: boolean } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (held || now < readyAt || amount < 3 || !live(ctx)) return;
      held = { amount, at: now };
      readyAt = now + 5000;
    },
    update(time) {
      if (!held || time - held.at < 1500) return;
      const undone = Math.random() < 0.5;
      if (undone && live(ctx)) {
        ctx.heal(ctx.player, held.amount);
        ctx.float(ctx.player.x, ctx.player.y - 56, 'NEVER HAPPENED', '#ffd890');
        ctx.sfx('heal');
      } else {
        ctx.float(ctx.player.x, ctx.player.y - 56, 'it happened', '#a8ff7a');
        ctx.sfx('hit-light');
      }
      result = { at: time, undone };
      held = null;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 30;
      if (held) {
        const k = clamp((time - held.at) / 1500, 0, 1);
        sealedBox(g, x + Math.sin(time / 50) * 1.5, y + 8, 14, 5);
        g.lineStyle(2, BOTH_LIT, 0.9); g.beginPath(); g.arc(x + 2, y, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      } else if (result && time - result.at < 900) {
        const k = (time - result.at) / 900;
        if (result.undone) catSit(g, x, y + 6 - k * 10, 0.6, CAT, 1 - k);
        else vial(g, x, y + 6 - k * 10, 0.6, 1 - k);
      } else {
        // The locket itself, shut, swinging on its chain.
        const sw = Math.sin(time / 600) * 3;
        g.lineStyle(1, BRASS, 0.8); g.lineBetween(x - 6, y - 10, x + sw, y - 2);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + sw, y + 2, 5);
        g.fillStyle(ctx.scene.time.now < readyAt ? dim(BRASS, 0.4) : BRASS, 1); g.fillCircle(x + sw, y + 2, 4);
      }
    },
  };
};

// ── Heisenberg Dial ──────────────────────────────────────────────────
// You cannot be certain of both. Stand still for a moment and your position is certain: +25%
// damage while you stay put. Keep moving for a moment and your momentum is: +15% speed.

const dial: ItemScriptFactory = (ctx) => {
  const dt = clock();
  let lx = NaN, ly = NaN, speed = 0;
  let stillFor = 0, movingFor = 0;
  let boostAt = 0;
  return {
    update(time) {
      const step = dt(time);
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lx) && step > 0) speed += (dist(lx, ly, p.x, p.y) / step - speed) * Math.min(1, step * 8);
      lx = p.x; ly = p.y;
      if (speed < 25) { stillFor += step; movingFor = 0; } else { movingFor += step; stillFor = 0; }
      if (time < boostAt) return;
      if (stillFor > 0.6) { ctx.boostDamage(1.25, 260); boostAt = time + 250; }
      else if (movingFor > 1.2) { ctx.boostSpeed(1.15, 260); boostAt = time + 250; }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 34;
      const pos = stillFor > 0.6, mom = movingFor > 1.2;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 8);
      g.fillStyle(0xf0ead8, 1); g.fillCircle(x, y, 6.5);
      // Two needles: one for where you are, one for where you're going. Only one can be sharp.
      const a1 = -Math.PI / 2 - 0.8, a2 = -Math.PI / 2 + 0.8 + Math.sin(time / 90) * (pos ? 0.4 : 0);
      g.lineStyle(pos ? 2 : 1, STATE_A, pos ? 1 : 0.5); g.lineBetween(x, y, x + Math.cos(a1 + (mom ? Math.sin(time / 70) * 0.4 : 0)) * 6, y + Math.sin(a1) * 6);
      g.lineStyle(mom ? 2 : 1, STATE_B, mom ? 1 : 0.5); g.lineBetween(x, y, x + Math.cos(a2) * 6, y + Math.sin(a2) * 6);
      if (pos) { glow(g, x, y, 14, STATE_A, 0.07, 2); g.lineStyle(1.5, STATE_A_LIT, 0.5); g.strokeEllipse(p.x, p.y + 18, 46, 14); }
      if (mom) glow(g, x, y, 14, STATE_B, 0.07, 2);
    },
  };
};

// ── Both-Ways Coin ───────────────────────────────────────────────────
// Every cast flips the coin (at most once every 0.8s). Heads: 1.2s off that ability's cooldown.
// Tails: your blows land 20% harder for 1.5s.

const coin: ItemScriptFactory = (ctx) => {
  let flipAt = -9999;
  let heads = true;
  let readyAt = 0;
  return {
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now < readyAt || !live(ctx)) return;
      readyAt = now + 800;
      flipAt = now;
      heads = Math.random() < 0.5;
      if (heads) { ctx.refund(abilityId, 1200); ctx.float(ctx.player.x, ctx.player.y - 60, 'HEADS', '#ff9ae0'); }
      else { ctx.boostDamage(1.2, 1500); ctx.float(ctx.player.x, ctx.player.y - 60, 'TAILS', '#b4f6ff'); }
      ctx.sfx('dice');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const k = clamp((time - flipAt) / 600, 0, 1);
      const x = p.x, y = p.y - 46 - Math.sin(k * Math.PI) * 26;
      if (k >= 1 && time - flipAt > 1500) return;
      const w = k < 1 ? Math.abs(Math.cos(k * Math.PI * 6)) * 12 + 1 : 12;
      const face = k < 1 ? Math.cos(k * Math.PI * 6) > 0 : heads;
      g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, y + 1, w, 12);
      g.fillStyle(face ? COPPER_LIT : COPPER, 1); g.fillEllipse(x, y, w, 12);
      if (w > 8) crownGlyph(g, x, y + 3, 3.5, face ? STATE_A : STATE_B, 0.9);
    },
  };
};

// ── Two-Slit Lens ────────────────────────────────────────────────────
// Every 3rd hit you land goes through two slits: 0.6s later two echo strikes land where the foe
// was, 4 each — but only if they're still within 70px of it (moved, they stood in a dark fringe).

const lens: ItemScriptFactory = (ctx) => {
  let count = 0;
  let pending: { x: number; y: number; at: number } | null = null;
  let fx: { x: number; y: number; at: number; hit: boolean } | null = null;
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || pending) return;
      count++;
      if (count % 3 !== 0) return;
      pending = { x: ctx.npc.x, y: ctx.npc.y, at: ctx.scene.time.now };
    },
    update(time) {
      if (!pending || time - pending.at < 600) return;
      const hit = foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, pending.x, pending.y) < 70;
      if (hit) {
        ctx.hit(ctx.npc, 4, ctx.npc.x - 10, ctx.npc.y);
        ctx.hit(ctx.npc, 4, ctx.npc.x + 10, ctx.npc.y);
        ctx.sfx('prism');
      } else ctx.float(pending.x, pending.y - 30, 'dark fringe', '#9a6cff');
      fx = { x: pending.x, y: pending.y, at: time, hit };
      pending = null;
    },
    drawGround(g, time) {
      if (pending) {
        const k = clamp((time - pending.at) / 600, 0, 1);
        g.lineStyle(1.5, BOTH_LIT, 0.3 + k * 0.5); g.strokeCircle(pending.x, pending.y, 70);
        for (const s of [-1, 1]) { g.fillStyle(s < 0 ? STATE_A : STATE_B, 0.15 + k * 0.3); g.fillCircle(pending.x + s * 12, pending.y, 10 + k * 8); }
      }
    },
    drawAir(g, time) {
      if (!fx || time - fx.at > 500) return;
      const k = (time - fx.at) / 500;
      if (fx.hit) {
        for (const s of [-1, 1]) { g.lineStyle(3, s < 0 ? STATE_A_LIT : STATE_B_LIT, 1 - k); g.lineBetween(fx.x + s * 10, fx.y - 60, fx.x + s * 10, fx.y); }
      } else { g.lineStyle(2, BOTH, 1 - k); g.strokeCircle(fx.x, fx.y, 70 + k * 20); }
    },
  };
};

// ── Both's Other Self ────────────────────────────────────────────────
// A second you stands at your mirror point across the middle of the room. Every hit you land,
// your other self strikes too — 35% of it — if the foe is within 200px of them. And once a fight,
// dropping under 25% health, you collapse into whichever of you was healthier: heal 35.

const otherSelf: ItemScriptFactory = (ctx) => {
  let collapsed = false;
  let strikeFx = 0;
  const mirror = () => ({ x: ctx.W - ctx.player.x, y: 96 + ctx.H - ctx.player.y });
  return {
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx) || !live(ctx)) return;
      const m = mirror();
      if (dist(m.x, m.y, ctx.npc.x, ctx.npc.y) > 200) return;
      ctx.hit(ctx.npc, Math.max(2, Math.round(amount * 0.35)), ctx.npc.x, ctx.npc.y);
      strikeFx = ctx.scene.time.now;
    },
    update() {
      if (collapsed || !live(ctx)) return;
      if (ctx.player.hp < ctx.player.maxHp * 0.25) {
        collapsed = true;
        ctx.heal(ctx.player, 35);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'COLLAPSED INTO THE OTHER', '#d2c0ff');
        ctx.flash(ctx.player.x, ctx.player.y, BOTH_LIT);
        ctx.sfx('time-warp');
      }
    },
    drawGround(g) {
      if (!live(ctx)) return;
      const m = mirror();
      g.lineStyle(1, BOTH, 0.25); g.strokeCircle(m.x, m.y, 200);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const m = mirror();
      const near = foeLive(ctx) && dist(m.x, m.y, ctx.npc.x, ctx.npc.y) <= 200;
      const a = collapsed ? 0.18 : 0.42;
      glow(g, m.x, m.y, 30, BOTH, 0.04, 2);
      g.fillStyle(BOTH, a * 0.6); g.fillCircle(m.x, m.y, 18);
      g.lineStyle(1.5, near ? 0xffffff : BOTH_LIT, a + (near ? 0.3 : 0)); g.strokeCircle(m.x, m.y, 18);
      g.fillStyle(0xffffff, a); g.fillCircle(m.x - 5, m.y - 4, 2); g.fillCircle(m.x + 5, m.y - 4, 2);
      if (time - strikeFx < 300 && foeLive(ctx)) {
        const k = (time - strikeFx) / 300;
        g.lineStyle(3 * (1 - k), BOTH_LIT, 1 - k); g.lineBetween(m.x, m.y, ctx.npc.x, ctx.npc.y);
      }
    },
  };
};

export const SUPERPOSITION_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_LOCKET, name: 'Unopened Locket', emoji: '📦', kind: 'charm', price: 320, isle: ISLE,
    flavor: 'A brass locket that has never been opened. Whatever is inside it is both in there and not. Eigen swears it works.',
    script: CHARM_LOCKET,
    scriptText: [
      'A hit you take goes in the locket (at most every 5s) for 1.5s, both taken and not.',
      'Then it opens: half the time the hit never happened, and is healed back in full.',
    ],
  },
  {
    id: CHARM_DIAL, name: 'Heisenberg Dial', emoji: '🧭', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A pocket dial with two needles, one for where you are and one for where you are going. Only one is ever steady.',
    script: CHARM_DIAL,
    scriptText: [
      'Stand still 0.6s: your position is certain — +25% damage while you stay put.',
      'Keep moving 1.2s: your momentum is certain — +15% speed while you keep going.',
    ],
  },
  {
    id: CHARM_COIN, name: 'Both-Ways Coin', emoji: '🪙', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'Struck at the Superposition mint with the Prince\'s crown on one side and the Grid\'s coil on the same side.',
    effect: { cooldownMult: 0.98 },
    script: CHARM_COIN,
    scriptText: [
      'Every cast flips the coin (at most every 0.8s).',
      'Heads: 1.2s off that ability\'s cooldown. Tails: +20% damage for 1.5s.',
    ],
  },
  {
    id: CHARM_LENS, name: 'Two-Slit Lens', emoji: '🔍', kind: 'charm', price: 900, isle: ISLE,
    flavor: 'A monocle of smoked glass with two fine slits cut in a brass shutter. Experimenter Young grinds them. Badly, he says.',
    effect: { critChance: 0.03 },
    script: CHARM_LENS,
    scriptText: [
      'Every 3rd hit you land passes through two slits: 0.6s later, two echo strikes of 4 land on the foe —',
      'if they are still within 70px of where they were. Moved, they stood in a dark fringe.',
    ],
  },
  {
    id: ART_BOTH, name: 'Both\'s Other Self', emoji: '👥', kind: 'artifact', isle: ISLE,
    flavor: 'Prince Both, collapsed at last into one, gave you the one he was not. It follows you about at a polite distance.',
    effect: { maxHp: 15 },
    script: ART_BOTH,
    scriptText: [
      'A second you stands at your mirror point across the room. Each hit you land, it strikes for 35%',
      'if the foe is within 200px of it. Once a fight, under 25% health, you collapse into it: heal 35.',
    ],
  },
  {
    id: FISH_SPRAT, name: 'Schrödinger Sprat', emoji: '🐟', kind: 'fish', sell: 18, isle: ISLE,
    flavor: 'A little silver sprat that is alive and not until it is in the creel. In the creel it is very much alive.',
    effect: { dodgeChance: 0.03 },
  },
  {
    id: FISH_PERCH, name: 'Probability Perch', emoji: '🐠', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'A striped perch whose stripes are where they probably are. Bites most likely at dusk, or else not.',
    effect: { critChance: 0.04 },
  },
  {
    id: FISH_EEL, name: 'Entangled Eel', emoji: '🐍', kind: 'fish', sell: 40, isle: ISLE,
    flavor: 'Always caught in pairs, a mile apart. Somewhere a fisherman has just felt a tug on an empty line.',
    effect: { lifestealFrac: 0.03 },
  },
];

export const SUPERPOSITION_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_LOCKET]: locket,
  [CHARM_DIAL]: dial,
  [CHARM_COIN]: coin,
  [CHARM_LENS]: lens,
  [ART_BOTH]: otherSelf,
};

export const SUPERPOSITION_SHOPS: ShopDef[] = [
  { id: 'superposition-shop', name: 'Eigenstates & Sundries', stock: [CHARM_LOCKET, CHARM_DIAL, CHARM_COIN, CHARM_LENS], buys: true },
];

export const SUPERPOSITION_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Quantum Well', kind: 'quantum' }];

export const SUPERPOSITION_FISH: FishDef[] = [
  { id: FISH_SPRAT, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 16] },
  { id: FISH_PERCH, fisheries: [FISHERY], weight: 4, fight: 3, size: [14, 34] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 2, fight: 5, size: [40, 96] },
];

