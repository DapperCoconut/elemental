import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { BREATH, CORK, breathBottle, breathMeter, weathervane, windStreak } from './art';

/**
 * The Lung's treasures: the King's own breath-meter (his artifact), and two charms found in the
 * palace — a corked bottle of somebody's breath off the bottling floor, and a fletching from one
 * of the gallery's weathervanes.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-aerion: The King's Breath-Meter ──────────────────────────────

/**
 * The meter off the King's own chest — the only one on Highspire that never read empty. Its needle
 * swings up and down the scale on its own, a full breath every 2.4s. Land a hit while the needle is
 * in the brass band at the top and you TAX the foe: 12 extra damage. Land one while it is in the red
 * at the bottom and you get a REBATE: 5 health back. Read it once, and it takes a breath (1s) before
 * it can be read again. Watch the needle; time the blow.
 */
const kingsMeter: ItemScriptFactory = (ctx) => {
  const CYCLE = 2400;
  const LOCK_MS = 1000;
  let lockedUntil = 0;
  let readAt = 0;
  let readKind: 'tax' | 'rebate' | null = null;
  let start = -1;
  const needle = (time: number): number => {
    if (start < 0) start = time;
    const ph = ((time - start) % CYCLE) / CYCLE;
    // A breath: rise, fall. Eased, so it lingers at the top and the bottom like real lungs do.
    const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    return 0.5 - Math.cos(tri * Math.PI) * 0.5;
  };
  return {
    update(time) { needle(time); },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now < lockedUntil || !alive(ctx, 'player')) return;
      const k = needle(now);
      if (k >= 0.8 && alive(ctx, 'npc')) {
        const n = ctx.npc;
        ctx.hit(n, 12, n.x, n.y);
        ctx.float(n.x, n.y - 58, 'TAXED', '#ffe08a');
        ctx.flash(n.x, n.y, 0xffe08a);
        ctx.sfx('money');
        readKind = 'tax';
      } else if (k <= 0.2) {
        ctx.heal(ctx.player, 5);
        ctx.float(ctx.player.x, ctx.player.y - 58, 'REBATE +5', '#9af0c8');
        ctx.sfx('heal');
        readKind = 'rebate';
      } else return;
      readAt = now;
      lockedUntil = now + LOCK_MS;
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const x = p.x + 26, y = p.y - 44;
      const locked = time < lockedUntil;
      // The brass band at the top of the scale, drawn bold so it can be read mid-fight.
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      g.lineStyle(4, 0xffe08a, locked ? 0.25 : 0.85);
      g.beginPath(); g.arc(x, y, 15, a0 + (a1 - a0) * 0.8, a1, false); g.strokePath();
      breathMeter(g, x, y, 11, needle(time), locked ? 0.55 : 1);
      if (time - readAt < 400 && readKind) {
        const k = (time - readAt) / 400;
        g.lineStyle(2, readKind === 'tax' ? 0xffe08a : 0x9af0c8, 1 - k);
        g.strokeCircle(x, y, 13 + k * 14);
      }
    },
  };
};

// ── charm-lung-corked-breath ─────────────────────────────────────────

/**
 * Somebody's breath, corked, off the bottling floor — tag torn, no name on it. It hangs at your
 * hip. When a hit leaves you under half health, the cork pops: you take a great gulp (+14) and run
 * on it (+30% speed for 2.5s). The bottle refills itself out of the air in 14s.
 */
const corkedBreath: ItemScriptFactory = (ctx) => {
  const RECHARGE = 14000;
  let readyAt = 0;
  let poppedAt = -9999;
  return {
    onHitTaken() {
      const p = ctx.player;
      const now = ctx.scene.time.now;
      if (!alive(ctx, 'player') || now < readyAt || p.hp >= p.maxHp * 0.5) return;
      readyAt = now + RECHARGE;
      poppedAt = now;
      ctx.heal(p, 14);
      ctx.boostSpeed(1.3, 2500);
      ctx.float(p.x, p.y - 60, 'UNCORKED +14', '#d8f4ff');
      ctx.sfx('gust');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      const fill = ready ? 1 : 1 - (readyAt - time) / RECHARGE;
      breathBottle(g, p.x - 24, p.y + 4, 0.5, time / 1000, ready ? 1 : 0.35 + fill * 0.4);
      if (!ready) {
        g.lineStyle(2, BREATH, 0.6);
        g.beginPath(); g.arc(p.x - 24, p.y - 2, 9, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2, false); g.strokePath();
      }
      const k = (time - poppedAt) / 700;
      if (k >= 0 && k < 1) {
        g.fillStyle(CORK, 1 - k); g.fillRect(p.x - 28 + k * 10, p.y - 20 - k * 40, 7, 5);
        for (let i = 0; i < 6; i++) windStreak(g, p.x - 24 + Math.cos(i) * k * 30, p.y - 10 - k * 30 + Math.sin(i) * 8, -Math.PI / 2 + (i - 2.5) * 0.3, 14, 0.8 * (1 - k));
      }
    },
  };
};

// ── charm-lung-vane-feather ──────────────────────────────────────────

/**
 * The iron fletching off one of the gallery's weathervanes. It turns to point at one of your
 * abilities (it says which as it turns). Cast that one and you are going WITH THE WIND: 1.2s back
 * on its cooldown and +10% damage for 2s — and the vane swings to another. If the wind is not taken
 * in 8s it changes on its own.
 */
const SLOTS = ['click', 'e', 'r', 'f', 'q'] as const;
const SLOT_NAME: Record<(typeof SLOTS)[number], string> = { click: 'CLICK', e: 'E', r: 'R', f: 'F', q: 'Q' };
const vaneFeather: ItemScriptFactory = (ctx) => {
  const HOLD_MS = 8000;
  let slot: (typeof SLOTS)[number] = 'e';
  let turnedAt = -1;
  let gotAt = -9999;
  let angle = 0;
  const turn = (time: number) => {
    const opts = SLOTS.filter((s) => s !== slot);
    slot = opts[Math.floor(ctx.rng() * opts.length)];
    turnedAt = time;
    if (alive(ctx, 'player')) ctx.float(ctx.player.x, ctx.player.y - 76, `WIND: ${SLOT_NAME[slot]}`, '#d8e8ff');
  };
  return {
    update(time, dt) {
      if (turnedAt < 0) turn(time);
      if (time - turnedAt > HOLD_MS) turn(time);
      const want = (SLOTS.indexOf(slot) / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
      const d = Math.atan2(Math.sin(want - angle), Math.cos(want - angle));
      angle += d * Math.min(1, dt * 8);
    },
    onCast(abilityId, s) {
      if (s !== slot || !alive(ctx, 'player')) return;
      const now = ctx.scene.time.now;
      ctx.refund(abilityId, 1200);
      ctx.boostDamage(1.1, 2000);
      ctx.float(ctx.player.x, ctx.player.y - 60, 'WITH THE WIND', '#ffe08a');
      ctx.sfx('wings');
      gotAt = now;
      turn(now);
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const x = p.x - 26, y = p.y - 46;
      // A dial of five ticks — click at the top, then E, R, F, Q round the clock — and the vane on it.
      g.fillStyle(0x0c1420, 0.6); g.fillCircle(x, y, 13);
      for (let i = 0; i < SLOTS.length; i++) {
        const a = (i / SLOTS.length) * Math.PI * 2 - Math.PI / 2;
        g.fillStyle(SLOTS[i] === slot ? 0xffe08a : 0x8a9ab8, 1); g.fillCircle(x + Math.cos(a) * 11, y + Math.sin(a) * 11, SLOTS[i] === slot ? 2.6 : 1.6);
      }
      weathervane(g, x, y, angle, 10, 1, 0xd8e4f0);
      const k = (time - gotAt) / 500;
      if (k >= 0 && k < 1) { g.lineStyle(2, 0xffe08a, 1 - k); g.strokeCircle(x, y, 14 + k * 12); }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const LUNG_ITEMS: IsleItemDef[] = [
  {
    id: 'art-aerion', name: "The King's Breath-Meter", emoji: '⏲️', kind: 'artifact', isle: 'air',
    flavor: 'Brass and violet enamel, off the King\'s own chest. The only meter on Highspire that never once read empty.',
    script: 'art-aerion', effect: { maxHp: 25 },
    scriptText: [
      'Its needle rises and falls on its own, a breath every 2.4s.',
      'Hit with the needle in the brass at the top: TAXED, +12 damage. In the red at the bottom: REBATE, +5 HP.',
      'Once read, it takes 1s before it can be read again.',
    ],
  },
  {
    id: 'charm-lung-corked-breath', name: 'Corked Breath', emoji: '🍾', kind: 'charm', isle: 'air', sell: 230,
    flavor: 'A bottle off the bottling floor, its debt-tag torn away. Whoever it belonged to, they would want it used.',
    script: 'charm-lung-corked-breath',
    scriptText: ['A hit leaves you under half health: the cork pops — +14 HP and +30% speed for 2.5s. Refills in 14s.'],
  },
  {
    id: 'charm-lung-vane-feather', name: 'Vane Fletching', emoji: '🪶', kind: 'charm', isle: 'air', sell: 250,
    flavor: 'Sheet iron cut like a feather, off the tail of a gallery weathervane. It still turns to the wind.',
    script: 'charm-lung-vane-feather', effect: { speedMult: 1.03 },
    scriptText: ['It points at one of your abilities. Cast that one: 1.2s refunded and +10% damage for 2s; then it turns. Turns on its own every 8s.'],
  },
];

export const LUNG_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-aerion': kingsMeter,
  'charm-lung-corked-breath': corkedBreath,
  'charm-lung-vane-feather': vaneFeather,
};
