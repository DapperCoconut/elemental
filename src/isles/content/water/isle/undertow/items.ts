import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { FOAM, GOLD, maresaSigil } from './art';

/**
 * The Undertow's treasures: the Queen's own crown (her artifact), and two charms found in the
 * palace chests — an eel-wrangler's gloves from the current hall and a drowned courtier's
 * locket from the gallery.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-maresa: The Tide-Crown ───────────────────────────────────────

/**
 * The crown keeps the tide. Six seconds of flood, six of ebb. While the tide floods, 40% of
 * every hit you take is drawn into the crown (it does not stop the hit — it remembers it).
 * When the tide turns to ebb, everything the crown drank goes out at once: 60% of it breaks on
 * the foe as a wave, 40% washes back into you, and the ebb carries you 10% faster.
 */
const tideCrown: ItemScriptFactory = (ctx) => {
  const HALF = 6000;
  const CAP = 60;
  let start = 0;
  let flooding = true;
  let bank = 0;
  let wave: { fx: number; fy: number; at: number; amount: number } | null = null;
  return {
    update(time) {
      if (start === 0) start = time;
      const nowFlood = Math.floor((time - start) / HALF) % 2 === 0;
      if (nowFlood === flooding) {
        if (wave && time - wave.at > 520) {
          if (alive(ctx, 'npc')) {
            ctx.hit(ctx.npc, Math.round(wave.amount * 0.6), ctx.npc.x, ctx.npc.y);
            ctx.flash(ctx.npc.x, ctx.npc.y, 0x7ae8e0);
            ctx.sfx('splash');
          }
          wave = null;
        }
        return;
      }
      flooding = nowFlood;
      if (flooding) {
        ctx.float(ctx.player.x, ctx.player.y - 56, 'THE TIDE FLOODS', '#7ae8e0');
        return;
      }
      ctx.boostSpeed(1.1, HALF);
      if (bank < 1) { ctx.float(ctx.player.x, ctx.player.y - 56, 'THE TIDE EBBS', '#c8f4ee'); return; }
      const amount = bank;
      bank = 0;
      ctx.heal(ctx.player, Math.round(amount * 0.4));
      ctx.float(ctx.player.x, ctx.player.y - 56, `THE TIDE GOES OUT — ${Math.round(amount)}`, '#c8f4ee');
      ctx.sfx('water-jet');
      wave = { fx: ctx.player.x, fy: ctx.player.y, at: time, amount };
    },
    onHitTaken(amount) {
      if (!flooding) return;
      bank = Math.min(CAP, bank + amount * 0.4);
    },
    drawGround(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const ph = start === 0 ? 0 : ((time - start) % HALF) / HALF;
      // A tide-ring at your feet: it fills while the sea comes in, empties as it goes out.
      g.lineStyle(2, 0x2a6a7a, 0.6); g.strokeEllipse(p.x, p.y + 14, 52, 18);
      const k = flooding ? ph : 1 - ph;
      g.fillStyle(flooding ? 0x2a8ab8 : 0xc8f4ee, 0.18 + (bank / CAP) * 0.3);
      g.fillEllipse(p.x, p.y + 14, 52 * k, 18 * k);
    },
    drawAir(g, time) {
      if (!wave) return;
      const k = Math.min(1, (time - wave.at) / 520);
      const x = wave.fx + (ctx.npc.x - wave.fx) * k, y = wave.fy + (ctx.npc.y - wave.fy) * k;
      const a = Math.atan2(ctx.npc.y - wave.fy, ctx.npc.x - wave.fx);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const w = 18 + Math.min(1, wave.amount / CAP) * 22;
      g.lineStyle(10, 0x2a8ab8, 0.7); g.lineBetween(x + nx * w, y + ny * w, x - nx * w, y - ny * w);
      g.lineStyle(4, FOAM, 0.95); g.lineBetween(x + nx * w + Math.cos(a) * 5, y + ny * w + Math.sin(a) * 5, x - nx * w + Math.cos(a) * 5, y - ny * w + Math.sin(a) * 5);
      maresaSigil(g, x - Math.cos(a) * 12, y - Math.sin(a) * 12, 6, GOLD, 0.7);
    },
  };
};

// ── charm-eelskin-gloves ─────────────────────────────────────────────

/**
 * Gloves cut from a shed eelskin; they hold a charge. One builds every 5s, up to three. Each E
 * or R you cast spends one and arcs it to the foe if they are within 320px, for 9 damage.
 */
const eelskinGloves: ItemScriptFactory = (ctx) => {
  const EVERY = 5000;
  const MAX = 3;
  let charges = 1;
  let nextAt = 0;
  let arcs: { x: number; y: number; at: number }[] = [];
  return {
    update(time) {
      if (nextAt === 0) nextAt = time + EVERY;
      if (time >= nextAt) {
        nextAt = time + EVERY;
        if (charges < MAX) { charges++; ctx.sfx('electric-charge'); }
      }
      arcs = arcs.filter((a) => time - a.at < 260);
    },
    onCast(_id, slot) {
      if ((slot !== 'e' && slot !== 'r') || charges <= 0 || !alive(ctx, 'npc')) return;
      const p = ctx.player, n = ctx.npc;
      if (Math.hypot(n.x - p.x, n.y - p.y) > 320) return;
      charges--;
      ctx.hit(n, 9, n.x, n.y);
      ctx.flash(n.x, n.y, 0xd8f070);
      ctx.sfx('zap');
      arcs.push({ x: p.x, y: p.y, at: ctx.scene.time.now });
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < MAX; i++) {
        g.fillStyle(i < charges ? 0xd8f070 : 0x2a3a2a, 0.9);
        g.fillCircle(p.x - 10 + i * 10, p.y + 32, 3);
      }
      for (const a of arcs) {
        const k = 1 - (time - a.at) / 260;
        const n = ctx.npc;
        g.lineStyle(3, 0xf0ff9a, k);
        let px = a.x, py = a.y;
        for (let s = 1; s <= 5; s++) {
          const t = s / 5;
          const x = a.x + (n.x - a.x) * t + (s < 5 ? Math.sin(time / 20 + s) * 12 : 0);
          const y = a.y + (n.y - a.y) * t + (s < 5 ? Math.cos(time / 25 + s) * 12 : 0);
          g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
      }
    },
  };
};

// ── charm-courtiers-locket ───────────────────────────────────────────

/**
 * A drowned courtier's locket, a lock of someone's hair inside, still wet. Once a fight, the
 * first time you fall under 30% health you hold your breath: for 3s, every hit you take is
 * given back in full 0.8s later.
 */
const courtiersLocket: ItemScriptFactory = (ctx) => {
  const WINDOW = 3000;
  const DELAY = 800;
  let used = false;
  let until = 0;
  let owed: { amount: number; at: number }[] = [];
  return {
    update(time) {
      const p = ctx.player;
      if (!used && alive(ctx, 'player') && p.hp / p.maxHp < 0.3) {
        used = true;
        until = time + WINDOW;
        ctx.float(p.x, p.y - 56, 'HOLD YOUR BREATH', '#c8f4ee');
        ctx.sfx('bubble');
      }
      const due = owed.filter((o) => time >= o.at);
      if (due.length && alive(ctx, 'player')) {
        const sum = due.reduce((n, o) => n + o.amount, 0);
        ctx.heal(p, sum);
        ctx.float(p.x, p.y - 44, `+${Math.round(sum)}`, '#9ae8ff');
      }
      owed = owed.filter((o) => time < o.at);
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (now < until) owed.push({ amount, at: now + DELAY });
    },
    drawAir(g, time) {
      if (time >= until || !alive(ctx, 'player')) return;
      const p = ctx.player;
      // The held breath: a bubble round you, wobbling, a thread of air escaping the top.
      const wob = 1 + Math.sin(time / 90) * 0.04;
      g.fillStyle(0x9ae8f0, 0.1); g.fillEllipse(p.x, p.y - 4, 70 * wob, 70 / wob);
      g.lineStyle(2, 0xc8f8ff, 0.55); g.strokeEllipse(p.x, p.y - 4, 70 * wob, 70 / wob);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(p.x - 16, p.y - 22, 12, 6);
      for (let i = 0; i < 3; i++) {
        const ph = ((time / 600) + i / 3) % 1;
        g.fillStyle(0xc8f8ff, (1 - ph) * 0.7); g.fillCircle(p.x + Math.sin(time / 150 + i) * 4, p.y - 40 - ph * 30, 2 + ph * 2);
      }
      const k = (until - time) / WINDOW;
      g.lineStyle(3, 0xc8f4ee, 0.8);
      g.beginPath(); g.arc(p.x, p.y, 40, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const UNDERTOW_ITEMS: IsleItemDef[] = [
  {
    id: 'art-maresa', name: 'The Tide-Crown', emoji: '👑', kind: 'artifact', isle: 'water',
    flavor: 'White coral and pearl, and a whirlpool at the brow that never stops turning. It still thinks it owns the sea.',
    script: 'art-maresa', effect: { maxHp: 18 },
    scriptText: [
      'The tide turns every 6s. While it floods, 40% of each hit you take is drawn into the crown.',
      'When it ebbs, it all goes out: 60% breaks on the foe as a wave, 40% heals you, +10% speed.',
    ],
  },
  {
    id: 'charm-eelskin-gloves', name: 'Eelskin Gloves', emoji: '🧤', kind: 'charm', isle: 'water', sell: 140,
    flavor: 'Cut from a skin the Great Eel shed. They crackle when you clap, and you will clap exactly once.',
    script: 'charm-eelskin-gloves',
    scriptText: ['A charge builds every 5s (max 3). Each E or R spends one to arc 9 damage to a foe within 320px.'],
  },
  {
    id: 'charm-courtiers-locket', name: "Courtier's Locket", emoji: '🫧', kind: 'charm', isle: 'water', sell: 160,
    flavor: 'Taken from a niche in the drowned gallery. There is a lock of hair in it, and it is still wet.',
    script: 'charm-courtiers-locket', effect: { regenPerSecond: 0.3 },
    scriptText: ['Once a fight, below 30% HP: for 3s, every hit you take is healed back in full 0.8s later.'],
  },
];

export const UNDERTOW_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-maresa': tideCrown,
  'charm-eelskin-gloves': eelskinGloves,
  'charm-courtiers-locket': courtiersLocket,
};
