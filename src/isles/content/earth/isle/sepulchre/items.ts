import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { BRASS, BRASS_DARK, CHAIN, DUST, DUST_DEEP, IRON, STONE, STONE_LIT, ashlar } from './art';

/**
 * The Sepulchre's treasures: the Regent's own grave-spade (his artifact), and two charms found
 * in the hold — a tithe-weight from the shaft landing, and the Turnkey's ring of keys from the
 * cell at the foot of the galleries.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-gravane: The Burier's Spade ──────────────────────────────────

/**
 * The spade he buried the old capital with, a blade of black iron worn bright at the edge.
 * Every 8s it is ready; your next cast digs a grave at the foe's feet. A second later the earth
 * goes back in: if they are still standing in it they are buried — 16 damage and +20% taken
 * for 3s. If they got out, the earth is yours: you heal 6. Dig, then pin them in it.
 */
const buriersSpade: ItemScriptFactory = (ctx) => {
  const EVERY = 8000;
  const FILL_MS = 1050;
  const GRAVE_R = 46;
  let readyAt = 0;
  let grave: { x: number; y: number; at: number; done: boolean; buried: boolean } | null = null;
  return {
    update(time) {
      if (readyAt === 0) readyAt = time + EVERY * 0.5;
      if (!grave || grave.done || time < grave.at + FILL_MS) return;
      grave.done = true;
      const n = ctx.npc;
      if (alive(ctx, 'npc') && Math.hypot(n.x - grave.x, n.y - grave.y) <= GRAVE_R + 8) {
        grave.buried = true;
        ctx.hit(n, 16, n.x, n.y);
        ctx.boostDamage(1.2, 3000);
        ctx.float(n.x, n.y - 56, 'BURIED', '#e8d8b8');
        ctx.sfx('quake');
      } else if (alive(ctx, 'player')) {
        ctx.heal(ctx.player, 6);
        ctx.float(ctx.player.x, ctx.player.y - 50, 'THE EARTH IS YOURS +6', '#c8d8a8');
        ctx.sfx('heal');
      }
    },
    onCast() {
      const now = ctx.scene.time.now;
      if (now < readyAt || !alive(ctx, 'npc')) return;
      readyAt = now + EVERY;
      grave = { x: ctx.npc.x, y: ctx.npc.y + 6, at: now, done: false, buried: false };
      ctx.sfx('stone-rise');
    },
    drawGround(g, time) {
      if (!grave || time > grave.at + FILL_MS + 900) return;
      const k = Math.min(1, (time - grave.at) / FILL_MS);
      const x = grave.x, y = grave.y;
      if (!grave.done) {
        // The grave opening: a dark oblong with the spoil heaped at its head, filling as it closes.
        g.fillStyle(DUST_DEEP, 0.9); g.fillEllipse(x, y - GRAVE_R + 4, GRAVE_R * 1.6, 16);
        g.fillStyle(0x0a0806, 0.85); g.fillEllipse(x, y, GRAVE_R * 2, GRAVE_R * 1.1);
        g.fillStyle(DUST, 0.7); g.fillEllipse(x, y, GRAVE_R * 2 * k, GRAVE_R * 1.1 * k);
        g.lineStyle(2, k > 0.75 && Math.floor(time / 90) % 2 === 0 ? 0xff9a7a : DUST, 0.9); g.strokeEllipse(x, y, GRAVE_R * 2, GRAVE_R * 1.1);
      } else {
        const f = Math.min(1, (time - grave.at - FILL_MS) / 900);
        g.fillStyle(grave.buried ? DUST : DUST_DEEP, 0.8 * (1 - f)); g.fillEllipse(x, y - 4, GRAVE_R * 1.9, GRAVE_R * 0.8);
        if (grave.buried) { g.fillStyle(STONE, 1 - f); g.fillRect(x - 6, y - 40, 12, 30); g.fillRect(x - 14, y - 32, 28, 7); }
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      // The spade over your shoulder: blade bright when it is ready to dig.
      const bx = p.x + 20, by = p.y - 46;
      g.lineStyle(3, 0x4a3624, 1); g.lineBetween(bx - 8, by - 18, bx + 6, by + 12);
      g.fillStyle(IRON, ready ? 1 : 0.6);
      g.fillPoints([{ x: bx + 2, y: by + 10 }, { x: bx + 14, y: by + 6 }, { x: bx + 20, y: by + 22 }, { x: bx + 10, y: by + 30 }], true, true);
      if (ready) { g.lineStyle(1.5, STONE_LIT, 0.6 + Math.sin(time / 150) * 0.3); g.lineBetween(bx + 20, by + 22, bx + 10, by + 30); }
    },
  };
};

// ── charm-tithe-weight ───────────────────────────────────────────────

/**
 * A cut tithe-weight on a strap, from the shaft landing. Every hit that lands on you drops a
 * tithe-stone into it (up to 4; each slows you 4%). Your next hit dealt hurls the lot back:
 * +5 damage per stone. Pay the tithe forward.
 */
const titheWeight: ItemScriptFactory = (ctx) => {
  const MAX = 4;
  let stones = 0;
  let threwAt = -9999;
  let thrown = 0;
  let nextPush = 0;
  return {
    update(time) {
      // Speed windows stack, so lay one short window end to end rather than one per frame.
      if (stones > 0 && time >= nextPush) { ctx.boostSpeed(1 - stones * 0.04, 125); nextPush = time + 120; }
    },
    onHitTaken() {
      if (stones >= MAX) return;
      stones++;
      ctx.float(ctx.player.x, ctx.player.y - 50, `TITHE ${stones}/${MAX}`, '#d8c0a0');
    },
    onHitDealt() {
      if (stones === 0 || !alive(ctx, 'npc')) return;
      const n = ctx.npc;
      thrown = stones;
      ctx.hit(n, stones * 5, n.x, n.y);
      ctx.float(n.x, n.y - 56, `TITHE PAID ×${stones}`, '#ffd27a');
      ctx.sfx('rock-throw');
      threwAt = ctx.scene.time.now;
      stones = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (stones > 0 && alive(ctx, 'player')) {
        g.lineStyle(1.5, CHAIN, 0.9); g.lineBetween(p.x - 16, p.y - 20, p.x - 22, p.y - 2);
        for (let k = 0; k < stones; k++) ashlar(g, p.x - 24 + (k % 2) * 9, p.y + 4 - Math.floor(k / 2) * 8, 0.32, 1 + k);
      }
      if (time - threwAt < 400 && alive(ctx, 'npc')) {
        const k = (time - threwAt) / 400;
        const n = ctx.npc;
        for (let i = 0; i < thrown; i++) {
          const x = p.x + (n.x - p.x) * k + (i - thrown / 2) * 10, y = p.y + (n.y - p.y) * k - Math.sin(k * Math.PI) * 60;
          ashlar(g, x, y, 0.4, 1 + i, 1 - k * 0.5);
        }
      }
    },
  };
};

// ── charm-turnkey-ring ───────────────────────────────────────────────

/**
 * The Turnkey's ring, six keys and a seventh no lock in the hold fits. Every 10s it is ready:
 * the next hit that lands on you is locked away — healed straight back (up to 15) — and 3s
 * later the cell opens and the same hurt is let out on the foe.
 */
const turnkeyRing: ItemScriptFactory = (ctx) => {
  const EVERY = 10000;
  const HOLD_MS = 3000;
  let readyAt = 0;
  let held = 0;
  let releaseAt = 0;
  let lockedAt = -9999;
  return {
    update(time) {
      if (readyAt === 0) readyAt = time + 2000;
      if (held > 0 && time >= releaseAt) {
        if (alive(ctx, 'npc')) {
          const n = ctx.npc;
          ctx.hit(n, held, n.x, n.y);
          ctx.float(n.x, n.y - 56, `RELEASED ${held}`, '#ffd27a');
          ctx.flash(n.x, n.y, BRASS);
          ctx.sfx('clang');
        }
        held = 0;
      }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (now < readyAt || held > 0) return;
      readyAt = now + EVERY;
      const back = Math.min(15, Math.round(amount));
      if (back <= 0) return;
      ctx.heal(ctx.player, back);
      held = back;
      releaseAt = now + HOLD_MS;
      lockedAt = now;
      ctx.float(ctx.player.x, ctx.player.y - 56, `LOCKED AWAY ${back}`, '#e8d8a8');
      ctx.sfx('chain');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const ready = time >= readyAt && held === 0;
      const x = p.x - 22, y = p.y - 34;
      g.lineStyle(2, ready ? BRASS : BRASS_DARK, 1); g.strokeCircle(x, y, 7);
      for (let k = 0; k < 4; k++) {
        const a = Math.PI * 0.4 + k * 0.45 + Math.sin(time / 300 + k) * 0.08;
        const kx = x + Math.cos(a) * 9, ky = y + Math.sin(a) * 9;
        g.lineStyle(2, ready ? BRASS : BRASS_DARK, 1); g.lineBetween(kx, ky, kx + Math.cos(a) * 9, ky + Math.sin(a) * 9);
      }
      if (held > 0) {
        // A little cell door over you, bulging with what is kept in it.
        const k = Math.min(1, (time - lockedAt) / 300);
        const f = (releaseAt - time) / HOLD_MS;
        g.fillStyle(STONE, 0.85 * k); g.fillRect(p.x + 14, p.y - 70, 22, 28);
        g.fillStyle(0x0a0806, 0.9 * k); g.fillRect(p.x + 18, p.y - 64, 14, 5);
        g.fillStyle(DUST, 0.9 * k); g.fillRect(p.x + 14, p.y - 40, 22 * Math.max(0, f), 3);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const SEPULCHRE_ITEMS: IsleItemDef[] = [
  {
    id: 'art-gravane', name: 'The Burier\'s Spade', emoji: '⚱️', kind: 'artifact', isle: 'earth',
    flavor: 'Black iron, the edge worn bright. He buried a capital with it, a library and a king who was not there.',
    script: 'art-gravane', effect: { maxHp: 20 },
    scriptText: [
      'Every 8s your next cast digs a grave at the foe\'s feet. 1s later it fills.',
      'Still in it: buried — 16 damage, +20% taken for 3s. Got out: the earth is yours, heal 6.',
    ],
  },
  {
    id: 'charm-tithe-weight', name: 'Tithe Weight', emoji: '🪨', kind: 'charm', isle: 'earth', sell: 260,
    flavor: 'A cut weight on a leather strap, from the shaft landing. It has measured a great many households short.',
    script: 'charm-tithe-weight',
    scriptText: ['Each hit taken drops a stone in (max 4, −4% speed each). Your next hit throws them all: +5 damage per stone.'],
  },
  {
    id: 'charm-turnkey-ring', name: 'The Turnkey\'s Ring', emoji: '🗝️', kind: 'charm', isle: 'earth', sell: 280,
    flavor: 'Six keys, worn smooth, and a seventh that fits no lock in the hold. Agathe never said what it was for.',
    script: 'charm-turnkey-ring', effect: { shieldHp: 6 },
    scriptText: ['Every 10s, the next hit on you is locked away (healed back, max 15) and released on the foe 3s later.'],
  },
];

export const SEPULCHRE_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-gravane': buriersSpade,
  'charm-tithe-weight': titheWeight,
  'charm-turnkey-ring': turnkeyRing,
};
