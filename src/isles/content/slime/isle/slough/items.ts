import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { BONE, SKIN, SKIN_LIT, VENOM, VENOM_LIT, draughtVial, hangingSkin } from './art';

/**
 * The Slough's treasures: the Matriarch's First Fang (her artifact), and two charms found in her
 * cast skin — a horn milking cup off the Sheds' racks, and a scrap of old skin from the Hollow.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-nyxa: The First Fang ─────────────────────────────────────────

/**
 * The fang she bit the first child of Fangmire with, worn loose in her jaw ever since. Your hits
 * Mark the foe — a venom stack each (one per 0.4s, up to 6), and every 2s the venom bites for 1 per
 * stack. Every 9s a ration vial is set down near you. Reach it and you *withhold* it: the foe's
 * stacks all burst at once (4 each) and you drink the dregs (+6). If the foe reaches it first, it
 * drinks: its stacks are cleared. Rationing works both ways.
 */
const firstFang: ItemScriptFactory = (ctx) => {
  const MAX = 6;
  const GAP = 400;
  const TICK = 2000;
  const VIAL_EVERY = 9000;
  const VIAL_LIFE = 6500;
  let stacks = 0;
  let lastStack = 0;
  let tickAt = 0;
  let vialAt = 0;
  let vial: { x: number; y: number; at: number } | null = null;
  let burstAt = -9999;
  return {
    update(time) {
      if (tickAt === 0) { tickAt = time + TICK; vialAt = time + VIAL_EVERY * 0.6; }
      const n = ctx.npc, p = ctx.player;
      if (time >= tickAt) {
        tickAt = time + TICK;
        if (stacks > 0 && alive(ctx, 'npc')) ctx.hit(n, stacks, n.x, n.y);
      }
      if (!vial && time >= vialAt && alive(ctx, 'player')) {
        const a = ctx.rng() * Math.PI * 2;
        vial = { x: Math.max(60, Math.min(ctx.W - 60, p.x + Math.cos(a) * 150)), y: Math.max(130, Math.min(ctx.H - 50, p.y + Math.sin(a) * 150)), at: time };
        ctx.sfx('bubble');
      }
      if (vial) {
        if (alive(ctx, 'player') && Math.hypot(p.x - vial.x, p.y - vial.y) < 32) {
          if (stacks > 0 && alive(ctx, 'npc')) {
            ctx.hit(n, stacks * 4, n.x, n.y);
            ctx.float(n.x, n.y - 60, `WITHHELD ×${stacks}`, '#c8f07a');
            ctx.flash(n.x, n.y, VENOM);
          }
          ctx.heal(p, 6);
          ctx.sfx('curse-cast');
          stacks = 0; burstAt = time; vial = null; vialAt = time + VIAL_EVERY;
        } else if (alive(ctx, 'npc') && Math.hypot(n.x - vial.x, n.y - vial.y) < 32) {
          ctx.float(n.x, n.y - 60, 'DRANK THE DRAUGHT', '#a8c8a0');
          stacks = 0; vial = null; vialAt = time + VIAL_EVERY;
        } else if (time - vial.at > VIAL_LIFE) {
          vial = null; vialAt = time + VIAL_EVERY;
        }
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - lastStack < GAP || stacks >= MAX) return;
      lastStack = now;
      stacks++;
    },
    drawGround(g, time) {
      if (!vial) return;
      const k = (time - vial.at) / VIAL_LIFE;
      g.lineStyle(2, VENOM, 0.3 + Math.sin(time / 120) * 0.15); g.strokeCircle(vial.x, vial.y, 32);
      g.fillStyle(VENOM, 0.08); g.fillCircle(vial.x, vial.y, 32);
      draughtVial(g, vial.x, vial.y, 1, 1 - k * 0.6);
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!alive(ctx, 'npc')) return;
      // The Mark on the foe: a fang-pip per stack in an arc over its head.
      for (let i = 0; i < stacks; i++) {
        const a = Math.PI * 1.15 + (i / (MAX - 1)) * Math.PI * 0.7;
        const x = n.x + Math.cos(a) * 34, y = n.y - 30 + Math.sin(a) * 20;
        g.fillStyle(BONE, 1); g.fillTriangle(x - 3, y - 4, x + 3, y - 4, x, y + 5);
        g.fillStyle(VENOM_LIT, 1); g.fillCircle(x, y + 5, 1.5);
      }
      if (time - burstAt < 400) {
        const f = (time - burstAt) / 400;
        g.lineStyle(4, VENOM_LIT, 1 - f); g.strokeCircle(n.x, n.y, 20 + f * 50);
      }
    },
  };
};

// ── charm-slough-milking-cup ─────────────────────────────────────────

/**
 * A horn cup off the Sheds' racks, stained green to the rim. Every hit you take drips a drop into it
 * (up to 4). Cast your F and it tips: the foe takes 5 a drop if it is within 320px.
 */
const milkingCup: ItemScriptFactory = (ctx) => {
  const MAX = 4;
  const RANGE = 320;
  let drops = 0;
  let tipAt = -9999;
  let tipTo = { x: 0, y: 0 };
  let tipN = 0;
  return {
    onHitTaken() { if (drops < MAX) drops++; },
    onCast(_id, slot) {
      if (slot !== 'f' || drops <= 0) return;
      const p = ctx.player, n = ctx.npc;
      if (!alive(ctx, 'npc') || Math.hypot(n.x - p.x, n.y - p.y) > RANGE) return;
      tipN = drops;
      ctx.hit(n, drops * 5, n.x, n.y);
      ctx.float(n.x, n.y - 56, `TIPPED ×${drops}`, '#c8f07a');
      ctx.sfx('slime-splat');
      drops = 0;
      tipAt = ctx.scene.time.now;
      tipTo = { x: n.x, y: n.y };
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      // The cup at the hip, filling.
      const cx = p.x + 22, cy = p.y + 4;
      g.fillStyle(0x3a2e1e, 1); g.fillTriangle(cx - 7, cy - 8, cx + 7, cy - 8, cx, cy + 6);
      g.fillStyle(0xd8c8a0, 1); g.fillEllipse(cx, cy - 8, 14, 4);
      if (drops > 0) { g.fillStyle(VENOM, 1); g.fillEllipse(cx, cy - 8, 3 + drops * 2.5, 2 + drops * 0.4); }
      if (time - tipAt < 420) {
        const f = (time - tipAt) / 420;
        const x = cx + (tipTo.x - cx) * f, y = cy + (tipTo.y - cy) * f - Math.sin(f * Math.PI) * 70;
        for (let i = 0; i < tipN + 2; i++) { g.fillStyle(VENOM_LIT, 1 - f * 0.5); g.fillCircle(x - i * 5 * (1 - f), y + i * 3, 4 - i * 0.5); }
      }
    },
  };
};

// ── charm-slough-cast-skin ───────────────────────────────────────────

/**
 * A scrap of an old cast skin from the Hollow, papery and still faintly warm. Stand still for 0.8s
 * and your own skin loosens. The next hit that lands on you while loose, you slip out of it: the hit
 * is healed back (up to 15) and you slide 70px away from the foe, leaving the empty skin behind;
 * 2s later it strikes, 9 to the foe if it is within 90px of it. Then 10s to grow a new one.
 */
const castSkin: ItemScriptFactory = (ctx) => {
  const SETTLE = 800;
  const REGROW = 10000;
  const STRIKE_MS = 2000;
  let lx = 0, ly = 0, stillSince = 0;
  let loose = false;
  let readyAt = 0;
  let husk: { x: number; y: number; at: number; struck: boolean } | null = null;
  return {
    update(time) {
      const p = ctx.player;
      if (!alive(ctx, 'player')) { loose = false; return; }
      if (Math.hypot(p.x - lx, p.y - ly) > 3) { lx = p.x; ly = p.y; stillSince = time; }
      if (!loose && time >= readyAt && time - stillSince >= SETTLE) { loose = true; ctx.sfx('whoosh'); }
      if (husk && !husk.struck && time - husk.at >= STRIKE_MS) {
        husk.struck = true;
        const n = ctx.npc;
        if (alive(ctx, 'npc') && Math.hypot(n.x - husk.x, n.y - husk.y) < 90) {
          ctx.hit(n, 9, n.x, n.y);
          ctx.float(n.x, n.y - 54, 'THE SKIN BITES', '#e8e2c0');
          ctx.sfx('stab');
        }
      }
      if (husk && time - husk.at > STRIKE_MS + 700) husk = null;
    },
    onHitTaken(amount) {
      if (!loose) return;
      const p = ctx.player, n = ctx.npc;
      const now = ctx.scene.time.now;
      loose = false;
      readyAt = now + REGROW;
      const back = Math.min(15, Math.round(amount));
      ctx.heal(p, back);
      husk = { x: p.x, y: p.y, at: now, struck: false };
      const a = Math.atan2(p.y - n.y, p.x - n.x);
      ctx.nudge(p, Math.cos(a) * 70, Math.sin(a) * 70);
      ctx.float(p.x, p.y - 60, `SLIPPED +${back}`, '#e8e2c0');
      ctx.sfx('dash');
    },
    drawGround(g, time) {
      if (!husk) return;
      const f = Math.min(1, (time - husk.at) / STRIKE_MS);
      g.lineStyle(1.5, SKIN_LIT, 0.2 + f * 0.4); g.strokeCircle(husk.x, husk.y, 90);
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (loose && alive(ctx, 'player')) {
        g.lineStyle(2, SKIN, 0.35 + Math.sin(time / 160) * 0.15); g.strokeEllipse(p.x, p.y - 8, 50, 62);
        g.lineStyle(1, SKIN_LIT, 0.3); g.strokeEllipse(p.x + 2, p.y - 6, 46, 58);
      }
      if (husk) {
        const f = Math.min(1, (time - husk.at) / STRIKE_MS);
        hangingSkin(g, husk.x, husk.y + 10, 20, time / 1000, f > 0.92 ? 1 : f * 0.3, husk.struck ? Math.max(0, 1 - (time - husk.at - STRIKE_MS) / 700) : 0.8);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const SLOUGH_ITEMS: IsleItemDef[] = [
  {
    id: 'art-nyxa', name: 'The First Fang', emoji: '🦷', kind: 'artifact', isle: 'slime',
    flavor: 'The fang she bit the first child of Fangmire with. Hollow, still sharp, and it still drips if you hold it point-down.',
    script: 'art-nyxa', effect: { maxHp: 22, statusDurMult: 1.1 },
    scriptText: [
      'Hits Mark the foe: a venom stack each (max 6); every 2s it takes 1 per stack.',
      'Every 9s a ration vial is set down near you. Reach it to burst every stack (4 each, +6 HP). If the foe drinks it, the stacks clear.',
    ],
  },
  {
    id: 'charm-slough-milking-cup', name: 'Horn Milking Cup', emoji: '🥛', kind: 'charm', isle: 'slime', sell: 260,
    flavor: 'Off the racks in the Milking Sheds. Forty years of venom have stained it green to the rim, and it will not wash out.',
    script: 'charm-slough-milking-cup',
    scriptText: ['Each hit you take drips a drop into the cup (max 4). Cast your F: the foe within 320px takes 5 per drop.'],
  },
  {
    id: 'charm-slough-cast-skin', name: 'Scrap of Cast Skin', emoji: '🐍', kind: 'charm', isle: 'slime', sell: 290,
    flavor: 'Torn off one of the old skins in the Moulting Hollow. It is papery, and faintly warm, and it moves when you are not looking.',
    script: 'charm-slough-cast-skin', effect: { dodgeChance: 0.03 },
    scriptText: ['Stand still 0.8s to loosen. The next hit is healed back (max 15) and you slip 70px away; the empty skin bites (9) 2s later.'],
  },
];

export const SLOUGH_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-nyxa': firstFang,
  'charm-slough-milking-cup': milkingCup,
  'charm-slough-cast-skin': castSkin,
};
