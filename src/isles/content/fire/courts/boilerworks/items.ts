import type { IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { BRASS, BRASS_DARK, HOT, REDLINE, STEAM, clamp, dial, dist, frameClock, steamPuff } from './util';

/**
 * The Boilerworks' wares: four charms from the Company Store, Prince Gauge's artifact, and the
 * three fish of the cooling pond. Every charm and the artifact carries a bespoke script.
 */

export const CHARM_SAFETY_VALVE = 'boilerworks-safety-valve';
export const CHARM_SHIFT_BELL = 'boilerworks-shift-bell';
export const CHARM_CONVEYOR_COG = 'boilerworks-conveyor-cog';
export const CHARM_PIPE_WRENCH = 'boilerworks-pipe-wrench';
export const ART_GAUGE = 'art-gauge';

// ── Scripts ──────────────────────────────────────────────────────────

/**
 * Safety Valve — damage you take fills a little brass valve. At 60 it blows: a scalding ring
 * that burns the foe if they are close, and a breath of healing for you.
 */
const safetyValve: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const CAP = 60;
  let fill = 0;
  let ventUntil = 0;
  return {
    onHitTaken(amount) {
      fill += amount;
      if (fill < CAP) return;
      fill = 0;
      const now = ctx.scene.time.now;
      ventUntil = now + 600;
      ctx.sfx('geyser');
      ctx.flash(ctx.player.x, ctx.player.y, 0xffffff);
      ctx.heal(ctx.player, 10);
      ctx.float(ctx.player.x, ctx.player.y - 44, 'SAFETY VALVE', '#bfe8ff');
      if (ctx.npc.active && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 170) {
        ctx.hit(ctx.npc, 22, ctx.npc.x, ctx.npc.y);
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      const k = fill / CAP;
      g.lineStyle(3, 0x000000, 0.25); g.strokeCircle(p.x, p.y + 4, 30);
      g.lineStyle(3, k > 0.8 ? REDLINE : BRASS, 0.7);
      g.beginPath(); g.arc(p.x, p.y + 4, 30, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * 2 * k, false); g.strokePath();
      if (time < ventUntil) {
        const t = 1 - (ventUntil - time) / 600;
        g.lineStyle(10 * (1 - t), STEAM, 0.7 * (1 - t)); g.strokeCircle(p.x, p.y, 40 + t * 130);
      }
    },
  };
};

/**
 * Shift Bell — every 12 seconds the works bell rings. The first ability you cast within 2.5s of
 * the ring comes back 2 seconds sooner and your damage runs 20% hot for 3 seconds.
 */
const shiftBell: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 12000;
  const WINDOW = 2500;
  let nextRing = ctx.scene.time.now + PERIOD;
  let windowUntil = 0;
  return {
    update(time) {
      if (time >= nextRing) {
        nextRing = time + PERIOD;
        windowUntil = time + WINDOW;
        ctx.sfx('clang');
        ctx.float(ctx.player.x, ctx.player.y - 56, 'SHIFT BELL', '#ffe08a');
      }
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now >= windowUntil) return;
      windowUntil = 0;
      ctx.refund(abilityId, 2000);
      ctx.boostDamage(1.2, 3000);
      ctx.sfx('status-buff');
      ctx.float(ctx.player.x, ctx.player.y - 56, 'ON THE BELL', '#ffd27a');
    },
    drawAir(g, time) {
      if (time >= windowUntil) return;
      const p = ctx.player;
      const swing = Math.sin(time / 90) * 0.5;
      const bx = p.x + Math.sin(swing) * 6, by = p.y - 62;
      g.fillStyle(BRASS_DARK, 1); g.fillTriangle(bx - 10, by + 8, bx + 10, by + 8, bx, by - 10);
      g.fillStyle(BRASS, 1); g.fillTriangle(bx - 8, by + 6, bx + 8, by + 6, bx, by - 8);
      g.fillStyle(BRASS, 1); g.fillRect(bx - 11, by + 6, 22, 3);
      g.fillStyle(0x4a3a1a, 1); g.fillCircle(bx + Math.sin(swing) * 4, by + 10, 2.5);
      const k = (windowUntil - time) / WINDOW;
      g.lineStyle(2, BRASS, 0.8);
      g.beginPath(); g.arc(p.x, by, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
    },
  };
};

/**
 * Conveyor Cog — chain casts across different slots to turn the cog: each new slot in a row
 * adds a tooth and 5% speed for 4s. Five teeth spins it out — +25% damage for 4s — and the
 * chain starts over. Repeating a slot already in the chain, or idling 4s, slips the cog.
 */
const conveyorCog: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let chain: string[] = [];
  let lastAt = 0;
  let spinUntil = 0;
  let rot = 0;
  const tick = frameClock();
  return {
    update(time) {
      const dt = tick(time);
      rot += dt * (time < spinUntil ? 9 : 0.6 + chain.length * 0.6);
      if (chain.length && time - lastAt > 4000) chain = [];
    },
    onCast(abilityId, slot) {
      const key = slot ?? ctx.slotOf(abilityId) ?? abilityId;
      const now = ctx.scene.time.now;
      lastAt = now;
      if (chain.includes(key)) {
        if (chain.length > 1) ctx.float(ctx.player.x, ctx.player.y - 44, 'COG SLIPS', '#a0a0a0');
        chain = [key];
        return;
      }
      chain.push(key);
      ctx.boostSpeed(1.05, 4000);
      if (chain.length >= 5) {
        chain = [];
        spinUntil = now + 4000;
        ctx.boostDamage(1.25, 4000);
        ctx.sfx('gear-turn');
        ctx.float(ctx.player.x, ctx.player.y - 50, 'COG SPUN OUT', '#ffe08a');
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      const teeth = time < spinUntil ? 5 : chain.length;
      const R = 24;
      for (let i = 0; i < 10; i++) {
        const a = rot + (i / 10) * Math.PI * 2;
        const on = i < teeth * 2;
        g.fillStyle(on ? (time < spinUntil ? HOT : BRASS) : 0x3a3a3a, on ? 0.75 : 0.35);
        g.fillCircle(p.x + Math.cos(a) * R, p.y + 10 + Math.sin(a) * R * 0.45, 3.2);
      }
    },
  };
};

/**
 * Pipe Wrench — every third hit you land torques down: a 6-damage clank on the foe, and 0.8s
 * shaved off whichever ability you cast last.
 */
const pipeWrench: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let count = 0;
  let lastCast: string | null = null;
  let clanking = false;
  let flashUntil = 0;
  return {
    onCast(abilityId) { lastCast = abilityId; },
    onHitDealt(amount) {
      if (clanking || amount <= 0) return;
      count++;
      if (count < 3) return;
      count = 0;
      clanking = true;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      clanking = false;
      if (lastCast) ctx.refund(lastCast, 800);
      ctx.sfx('clang');
      ctx.float(ctx.npc.x, ctx.npc.y - 40, 'CLANK', '#d8dee6');
      flashUntil = ctx.scene.time.now + 300;
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!n.active) return;
      // Three bolt-heads over the foe: one tightens per hit.
      for (let i = 0; i < 3; i++) {
        const x = n.x - 12 + i * 12, y = n.y - 58;
        const on = i < count || time < flashUntil;
        g.fillStyle(on ? 0xd8dee6 : 0x3a3a3a, on ? 0.9 : 0.4);
        g.fillRect(x - 3.5, y - 3.5, 7, 7);
      }
    },
  };
};

/**
 * Redline Dial (Gauge's artifact) — a needle climbs on its own and with every hit you land.
 * Push it into the red for +35% damage over 5s. Above 80 it is brittle: a hit you take bursts
 * the dial for 8 and drops it to 20. Cast your Q at 50 or more to vent it on purpose — a
 * scald burst of 18 + needle/4 around you — and zero the needle.
 */
const redlineDial: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let needle = 0;
  let hotUntil = 0;
  let selfHit = false;
  let ventUntil = 0;
  const tick = frameClock();
  return {
    update(time) {
      const dt = tick(time);
      if (time < hotUntil) return;
      needle = clamp(needle + dt * 4, 0, 100);
      if (needle >= 100) {
        needle = 0;
        hotUntil = time + 5000;
        ctx.boostDamage(1.35, 5000);
        ctx.sfx('engine');
        ctx.float(ctx.player.x, ctx.player.y - 56, 'REDLINE', '#ff4a3a');
      }
    },
    onHitDealt(amount) {
      if (amount > 0 && ctx.scene.time.now >= hotUntil) needle = clamp(needle + 3, 0, 100);
    },
    onHitTaken() {
      if (selfHit || needle <= 80) return;
      selfHit = true;
      ctx.hit(ctx.player, 8, ctx.player.x, ctx.player.y);
      selfHit = false;
      needle = 20;
      ctx.sfx('shield-break');
      ctx.float(ctx.player.x, ctx.player.y - 50, 'DIAL BURST', '#ff8a6a');
    },
    onCast(abilityId, slot) {
      const s = slot ?? ctx.slotOf(abilityId);
      if (s !== 'q' || needle < 50) return;
      const dmg = 18 + needle / 4;
      needle = 0;
      ventUntil = ctx.scene.time.now + 600;
      ctx.sfx('geyser');
      if (ctx.npc.active && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 160) {
        ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
      }
      ctx.float(ctx.player.x, ctx.player.y - 50, 'VENTED', '#bfe8ff');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const frac = time < hotUntil ? 1.02 + Math.sin(time / 30) * 0.02 : needle / 100;
      dial(g, p.x + 26, p.y - 40, 8, frac);
      if (time < ventUntil) {
        const k = 1 - (ventUntil - time) / 600;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          steamPuff(g, p.x + Math.cos(a) * (30 + k * 110), p.y + Math.sin(a) * (20 + k * 80), k, 16, 0.7);
        }
      }
      if (time < hotUntil) {
        g.lineStyle(2, REDLINE, 0.4 + 0.3 * Math.sin(time / 80)); g.strokeCircle(p.x, p.y, 30);
      }
    },
  };
};

export const BOILERWORKS_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SAFETY_VALVE]: safetyValve,
  [CHARM_SHIFT_BELL]: shiftBell,
  [CHARM_CONVEYOR_COG]: conveyorCog,
  [CHARM_PIPE_WRENCH]: pipeWrench,
  [ART_GAUGE]: redlineDial,
};

// ── Item defs ────────────────────────────────────────────────────────

export const BOILERWORKS_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SAFETY_VALVE, name: 'Safety Valve', emoji: '🧯', kind: 'charm', price: 180, isle: 'fire',
    flavor: 'Prised off a boiler that did not blow. The only one on the yard that was ever allowed to work.',
    effect: { maxHp: 8 },
    script: CHARM_SAFETY_VALVE,
    scriptText: [
      'Damage you take fills the valve. At 60 it blows:',
      'heal 10, and 22 damage to the foe if they are within reach.',
    ],
  },
  {
    id: CHARM_SHIFT_BELL, name: 'Shift Bell', emoji: '🔔', kind: 'charm', price: 260, isle: 'fire',
    flavor: 'A hand-bell from the bunkhouse. The night shift rings it when they mean to be heard.',
    script: CHARM_SHIFT_BELL,
    scriptText: [
      'Rings every 12s. The first ability cast within 2.5s of the ring',
      'is refunded 2s and your damage runs +20% for 3s.',
    ],
  },
  {
    id: CHARM_CONVEYOR_COG, name: 'Conveyor Cog', emoji: '⚙️', kind: 'charm', price: 340, isle: 'fire',
    flavor: 'A drive cog from Belt Four. Brindle still swears he will find who took it.',
    script: CHARM_CONVEYOR_COG,
    scriptText: [
      'Cast from a different slot each time: +5% speed per tooth.',
      'Five in a row spins it out: +25% damage for 4s. Repeat a slot and it slips.',
    ],
  },
  {
    id: CHARM_PIPE_WRENCH, name: 'Pipe Wrench', emoji: '🔧', kind: 'charm', price: 420, isle: 'fire',
    flavor: 'Heavier than it needs to be. Wendel says that is the point.',
    effect: { critChance: 0.03 },
    script: CHARM_PIPE_WRENCH,
    scriptText: [
      'Every third hit you land clanks for 6 more',
      'and shaves 0.8s off the ability you cast last.',
    ],
  },
  {
    id: ART_GAUGE, name: "Gauge's Redline Dial", emoji: '⏲️', kind: 'artifact', isle: 'fire',
    flavor: "Unbolted from the Prince's back. The needle still twitches toward the red when you are angry.",
    script: ART_GAUGE,
    scriptText: [
      'A needle climbs over time and +3 per hit. At the top: +35% damage for 5s.',
      'Above 80, a hit you take bursts it (8 to you, needle to 20).',
      'Cast your Q at 50+ to vent it: 18 + needle/4 damage around you.',
    ],
  },
  // Cooling-pond fish.
  {
    id: 'fish-boiled-bream', name: 'Boiled Bream', emoji: '🐟', kind: 'fish', sell: 14, isle: 'fire',
    flavor: 'Comes out of the cooling pond already cooked. Nobody asks how it lives in there.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: 'fish-pipe-eel', name: 'Pipe Eel', emoji: '🐍', kind: 'fish', sell: 26, isle: 'fire',
    flavor: 'Lives in the outflow mains. Slips through a valve faster than a rumour.',
    effect: { speedMult: 1.05 },
  },
  {
    id: 'fish-gauge-goby', name: 'Gauge Goby', emoji: '🐠', kind: 'fish', sell: 48, isle: 'fire',
    flavor: 'A dial-faced little fish whose spots shift with the pressure. Old stokers swear it reads truer than brass.',
    effect: { critChance: 0.04 },
  },
];

