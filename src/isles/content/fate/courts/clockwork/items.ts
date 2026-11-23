import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { cuckooBird, dial, hand, hourglass } from './art';
import { BLUED, BLUED_LIT, BRASS, BRASS_DARK, BRASS_LIT, GILT, PAID_GREY, SAND, SAND_LIT } from './palette';
import { alive, clamp, dist, wrapAngle } from './util';

/**
 * The Clockwork Court's goods: Mendel Plumb's four charms, Prince Tock's mainspring, and the oil
 * sump's three fish. Every charm is a piece of a clock that keeps one of the court's own rules on
 * your side — the second hand's sweep, the cuckoo on the hour, the key that winds back a blow,
 * the hourglass that pours what you paid onto someone else. Scripts are registered below.
 */

const ISLE = 'fate';

export const CHARM_FOB = 'clockwork-charm-second-hand-fob';
export const CHARM_WHISTLE = 'clockwork-charm-cuckoo-whistle';
export const CHARM_KEY = 'clockwork-charm-rewinding-key';
export const CHARM_PENDANT = 'clockwork-charm-paid-hour-pendant';
export const ART_TOCK = 'art-tock';

export const FISH_COD = 'fish-cog-cod';
export const FISH_EEL = 'fish-escapement-eel';
export const FISH_MINNOW = 'fish-minute-minnow';
export const FISHERY = 'clockwork-sump';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Second-Hand Fob ──────────────────────────────────────────────────
// A blued second hand circles you once every 6s. Cast while it points at your foe and that
// ability's cooldown is wound back 1.5s.

const fob: ItemScriptFactory = (ctx) => {
  const PERIOD = 6000;
  let lastRefund = -9999;
  let fx = -9999;
  const handA = (time: number) => -Math.PI / 2 + ((time % PERIOD) / PERIOD) * Math.PI * 2;
  const aligned = (time: number) => foeLive(ctx) && Math.abs(wrapAngle(Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x) - handA(time))) < 0.52;
  return {
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (!live(ctx) || !aligned(now) || now - lastRefund < 1000) return;
      lastRefund = now; fx = now;
      ctx.refund(abilityId, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 52, 'ON THE SECOND', '#8aa4f0');
      ctx.sfx('clock-tick');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const a = handA(time);
      const on = aligned(time);
      g.lineStyle(on ? 2.5 : 1.5, on ? BLUED_LIT : BLUED, on ? 0.7 : 0.35);
      g.lineBetween(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, p.x + Math.cos(a) * 64, p.y + Math.sin(a) * 64);
      g.fillStyle(on ? BLUED_LIT : BLUED, on ? 0.7 : 0.35); g.fillCircle(p.x + Math.cos(a) * 64, p.y + Math.sin(a) * 64, 3);
      if (time - fx < 400) { const k = (time - fx) / 400; g.lineStyle(3 * (1 - k), BLUED_LIT, 1 - k); g.strokeCircle(p.x, p.y, 26 + k * 40); }
    },
  };
};

// ── Cuckoo Whistle ───────────────────────────────────────────────────
// Every 9s a little cuckoo flies from your shoulder at your foe (if they are within 340px) and
// pecks for 7. If you were hit in the last 2s, it is cross, and pecks twice.

const whistle: ItemScriptFactory = (ctx) => {
  const EVERY = 9000;
  let next = -1;
  let hurtAt = -9999;
  let flight: { at: number; x: number; y: number; pecks: number } | null = null;
  const FLY = 420;
  return {
    update(time) {
      if (next < 0) next = time + EVERY;
      if (!live(ctx)) return;
      if (!flight && time >= next) {
        next = time + EVERY;
        if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 340) {
          flight = { at: time, x: ctx.player.x, y: ctx.player.y - 30, pecks: time - hurtAt < 2000 ? 2 : 1 };
          ctx.sfx('wings');
        }
      }
      if (flight && time - flight.at >= FLY) {
        if (foeLive(ctx)) {
          ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y - 20);
          ctx.float(ctx.npc.x, ctx.npc.y - 50, flight.pecks > 1 ? 'CUCKOO! CUCKOO!' : 'CUCKOO!', '#f2e2c0');
          ctx.sfx('stab');
          if (flight.pecks > 1) { flight = { ...flight, at: time - FLY + 260, pecks: 1 }; return; }
        }
        flight = null;
      }
    },
    onHitTaken() { hurtAt = ctx.scene.time.now; },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!flight) {
        // Perched on the shoulder, bobbing.
        cuckooBird(g, p.x + 20, p.y - 34 + Math.sin(time / 300) * 1.5, 0.45, 0, 0, 1);
        return;
      }
      const k = clamp((time - flight.at) / FLY, 0, 1);
      const n = ctx.npc;
      const x = flight.x + (n.x - flight.x) * k, y = flight.y + (n.y - 20 - flight.y) * k - Math.sin(k * Math.PI) * 40;
      cuckooBird(g, x, y, 0.7, Math.atan2(n.y - flight.y, n.x - flight.x), time / 25, 1);
    },
  };
};

// ── Rewinding Key ────────────────────────────────────────────────────
// After a hit of 4 or more, a little key starts turning backwards. Take no other hit for 2.5s and
// half that blow is wound back off you. At most once every 4s.

const rewindKey: ItemScriptFactory = (ctx) => {
  let winding: { at: number; amount: number } | null = null;
  let lastDone = -9999;
  let fx = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (winding) { winding = null; ctx.float(ctx.player.x, ctx.player.y - 50, 'KEY SLIPS', '#a8a8a0'); return; }
      if (amount >= 4 && now - lastDone > 4000) winding = { at: now, amount };
    },
    update(time) {
      if (!winding || !live(ctx)) return;
      if (time - winding.at >= 2500) {
        const back = Math.round(winding.amount * 0.5);
        ctx.heal(ctx.player, back);
        ctx.float(ctx.player.x, ctx.player.y - 52, `REWOUND +${back}`, '#f0d58a');
        ctx.sfx('snap-back');
        lastDone = time; fx = time;
        winding = null;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 40;
      if (winding) {
        const k = clamp((time - winding.at) / 2500, 0, 1);
        const a = -time / 90;
        g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x, y + 6, x, y - 4);
        g.fillStyle(BRASS, 1); g.fillEllipse(x + Math.cos(a) * 6, y - 8, 9 * Math.max(0.3, Math.abs(Math.cos(a))), 7);
        g.fillEllipse(x - Math.cos(a) * 6, y - 8, 9 * Math.max(0.3, Math.abs(Math.cos(a))), 7);
        g.lineStyle(2, GILT, 0.9); g.beginPath(); g.arc(x, y - 2, 12, -Math.PI / 2, -Math.PI / 2 - k * Math.PI * 2, true); g.strokePath();
      }
      if (time - fx < 500) { const k = (time - fx) / 500; glow(g, p.x, p.y, 30 + k * 20, BRASS_LIT, 0.08 * (1 - k), 3); }
    },
  };
};

// ── Paid-Hour Pendant ────────────────────────────────────────────────
// Everything you are hurt by runs into a little hourglass at your throat. Every 8s it turns and
// pours a quarter of what you took in that time onto your foe (up to 30 at a pour).

const pendant: ItemScriptFactory = (ctx) => {
  const EVERY = 8000;
  let next = -1;
  let held = 0;
  let pourFx = -9999;
  return {
    onHitTaken(amount) { held += Math.max(0, amount); },
    update(time) {
      if (next < 0) next = time + EVERY;
      if (time < next) return;
      next = time + EVERY;
      const pour = Math.min(30, Math.round(held * 0.25));
      held = 0;
      if (pour >= 1 && foeLive(ctx) && live(ctx)) {
        ctx.hit(ctx.npc, pour, ctx.npc.x, ctx.npc.y - 24);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, `PAID BACK ${pour}`, '#e6c88a');
        ctx.sfx('time-warp');
        pourFx = time;
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const fill = clamp(held / 120, 0, 1);
      hourglass(g, p.x + 22, p.y - 22, 20, 1 - fill, held > 0, time / 1000, BRASS_DARK);
      if (time - pourFx < 600 && foeLive(ctx)) {
        const k = (time - pourFx) / 600;
        for (let i = 0; i < 10; i++) {
          const kk = clamp(k * 1.4 - i * 0.04, 0, 1);
          g.fillStyle(i % 2 ? SAND : SAND_LIT, 1 - k);
          g.fillCircle(ctx.npc.x - 10 + i * 2, ctx.npc.y - 80 + kk * 60, 2);
        }
      }
    },
  };
};

// ── Tock's Mainspring (artifact) ─────────────────────────────────────
// Every cast winds the spring a tooth. At eight it lets go: for 2.5s you move 40% faster and hit
// 25% harder. Once a fight, falling under 30% health, you stop your foe's clock: stunned 1.4s.

const mainspring: ItemScriptFactory = (ctx) => {
  let teeth = 0;
  let releasedAt = -9999;
  let stopped = false;
  let stopAt = -9999;
  return {
    onCast() {
      if (!live(ctx)) return;
      teeth++;
      ctx.sfx('gear-turn');
      if (teeth >= 8) {
        teeth = 0;
        releasedAt = ctx.scene.time.now;
        ctx.boostSpeed(1.4, 2500);
        ctx.boostDamage(1.25, 2500);
        ctx.float(ctx.player.x, ctx.player.y - 54, 'UNWOUND', '#fff0b8');
        ctx.sfx('snap-back');
      }
    },
    update(time) {
      if (stopped || !live(ctx) || !foeLive(ctx)) return;
      if (ctx.player.hp / Math.max(1, ctx.player.maxHp) < 0.3) {
        stopped = true; stopAt = time;
        ctx.stun(ctx.npc, 1400);
        ctx.float(ctx.npc.x, ctx.npc.y - 54, 'TIME STOPS', '#a8a8a0');
        ctx.sfx('time-warp');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y + 30;
      // The coil at your feet, tighter with each tooth.
      g.lineStyle(1.5, time - releasedAt < 2500 ? BRASS_LIT : BRASS, 0.75);
      g.beginPath();
      const turns = 1 + teeth * 0.4;
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * turns * Math.PI * 2;
        const rr = 3 + (k / 40) * 14;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.4;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      for (let i = 0; i < 8; i++) { g.fillStyle(i < teeth ? GILT : dim(BRASS, 0.5), 0.9); g.fillCircle(x - 14 + i * 4, y + 10, 1.4); }
      if (time - releasedAt < 2500) glow(g, p.x, p.y, 34, BRASS_LIT, 0.05, 3);
      if (time - stopAt < 1400 && foeLive(ctx)) {
        g.fillStyle(PAID_GREY, 0.25); g.fillCircle(ctx.npc.x, ctx.npc.y, 36);
        dial(g, ctx.npc.x, ctx.npc.y - 56, 10, 2.6, 0.9, 0xd8d8d0, 0x8a8a84);
        hand(g, ctx.npc.x, ctx.npc.y - 56, -Math.PI / 2, 8, 1.5, BLUED);
      }
    },
  };
};

export const CLOCKWORK_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_FOB, name: 'Second-Hand Fob', emoji: '⏱️', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A blued second hand on a watch-chain, the watch long since pawned. It still goes round. Nobody knows how.',
    script: CHARM_FOB,
    scriptText: [
      'A second hand circles you once every 6s.',
      'Cast while it points at your foe (within about 30°) and that ability\'s cooldown winds back 1.5s.',
    ],
  },
  {
    id: CHARM_WHISTLE, name: 'Cuckoo Whistle', emoji: '🐦', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'Chirp\'s apprentice carves them for the Row\'s children. Blow it and a little bird comes. It is not a nice bird.',
    script: CHARM_WHISTLE,
    scriptText: [
      'Every 9s a cuckoo flies from your shoulder at your foe (within 340px) and pecks for 7.',
      'If you were hit in the last 2s, it pecks twice.',
    ],
  },
  {
    id: CHARM_KEY, name: 'Rewinding Key', emoji: '🗝️', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A clock key filed to turn the wrong way. Plumb swears it only works on watches. It works on people.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_KEY,
    scriptText: [
      'After a hit of 4 or more, the key winds backwards. Take no other hit for 2.5s and heal half of it.',
      'Another hit in that time slips the key. At most once every 4s.',
    ],
  },
  {
    id: CHARM_PENDANT, name: 'Paid-Hour Pendant', emoji: '⏳', kind: 'charm', price: 980, isle: ISLE,
    flavor: 'A thumb-sized hourglass of grey sand: someone\'s afternoon, bought back from the Hour Office for a fortune.',
    effect: { maxHp: 6 },
    script: CHARM_PENDANT,
    scriptText: [
      'Damage you take fills a little hourglass. Every 8s it turns and pours a quarter of it onto your foe.',
      'At most 30 damage a pour.',
    ],
  },
  {
    id: ART_TOCK, name: 'Tock\'s Mainspring', emoji: '🌀', kind: 'artifact', isle: ISLE,
    flavor: 'The spring from the Prince\'s own heart-clock, still warm, still wound with eighty years of other people\'s hours.',
    effect: { cooldownMult: 0.96 },
    script: ART_TOCK,
    scriptText: [
      'Every cast winds the spring a tooth. At 8 it lets go: +40% speed and +25% damage for 2.5s.',
      'Once a fight, falling under 30% health, you stop your foe\'s clock: stunned for 1.4s.',
    ],
  },
  {
    id: FISH_MINNOW, name: 'Minute Minnow', emoji: '🐟', kind: 'fish', sell: 22, isle: ISLE,
    flavor: 'A tiny silver fish that darts exactly sixty times a minute. The sump-hands set their watches by the shoals.',
    effect: { speedMult: 1.02 },
  },
  {
    id: FISH_COD, name: 'Cog Cod', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'A heavy, slick cod with a frill of fin as regular as gear teeth. Tastes of oil, mostly, and a little of brass.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_EEL, name: 'Escapement Eel', emoji: '🐍', kind: 'fish', sell: 80, isle: ISLE,
    flavor: 'It swims in jerks, tick by tick, and its oil is the finest clock oil there is. The Oil Office counts every one.',
    effect: { cooldownMult: 0.97 },
  },
];

export const CLOCKWORK_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_FOB]: fob,
  [CHARM_WHISTLE]: whistle,
  [CHARM_KEY]: rewindKey,
  [CHARM_PENDANT]: pendant,
  [ART_TOCK]: mainspring,
};

export const CLOCKWORK_SHOPS: ShopDef[] = [
  { id: 'clockwork-shop', name: 'Plumb\'s Watches & Repairs', stock: [CHARM_FOB, CHARM_WHISTLE, CHARM_KEY, CHARM_PENDANT], buys: true },
];

export const CLOCKWORK_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Oil Sump', kind: 'oil' }];

export const CLOCKWORK_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 7, fight: 2, size: [4, 9] },
  { id: FISH_COD, fisheries: [FISHERY], weight: 5, fight: 3, size: [30, 70] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 2, fight: 5, size: [50, 120] },
];
