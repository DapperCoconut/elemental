import Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { brandSigil, glow } from '../../../../art/IsleArt';
import { EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE_GOLD, SOOT } from './palette';

/**
 * The Hearth Court's goods: Ottilie Grate's four charms, Prince Kindle's artifact, and the two
 * cistern fish. Every charm is made from something the tithe-men threw out, and each one plays
 * a piece of the court's own rules back in your favour — the tithe box, the sweep's brush, the
 * hearthstone, the brand-breaker's nail.
 */

const ISLE = 'fire';

/** Seconds since the last frame, from the scene time the script is handed. */
function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (time - last) / 1000));
    last = time;
    return dt;
  };
}

const live = (ctx: ItemScriptCtx) => ctx.player.active && ctx.player.hp > 0;
const foeLive = (ctx: ItemScriptCtx) => ctx.npc.active && ctx.npc.hp > 0;

// ── Tithe Box ────────────────────────────────────────────────────────
// A fifth of every hurt goes into the box. Your Q opens it: the hoard flies at the foe as
// damage, and a quarter of it comes back to you as heat.

const titheBox: ItemScriptFactory = (ctx) => {
  let hoard = 0;
  const CAP = 40;
  let flying: { at: number; amount: number } | null = null;
  return {
    onHitTaken(amount) { hoard = Math.min(CAP, hoard + amount * 0.2); },
    onCast(_id, slot) {
      if (slot !== 'q' || hoard < 4 || flying) return;
      flying = { at: ctx.scene.time.now, amount: Math.round(hoard) };
      hoard = 0;
      ctx.sfx('money');
    },
    update(time) {
      if (!flying || time - flying.at < 420) return;
      if (foeLive(ctx)) {
        ctx.hit(ctx.npc, flying.amount, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 40, `TITHE PAID ${flying.amount}`, '#ffd27a');
        ctx.flash(ctx.npc.x, ctx.npc.y, EMBER);
      }
      if (live(ctx)) ctx.heal(ctx.player, Math.round(flying.amount / 4));
      flying = null;
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!live(ctx)) return;
      // The box rides at your shoulder; its slot glows with what it holds.
      const bx = p.x + 26, by = p.y - 34 + Math.sin(time / 300) * 2;
      g.fillStyle(0x3b2a20, 1); g.fillRect(bx - 8, by - 6, 16, 12);
      g.fillStyle(IRON, 1); g.fillRect(bx - 9, by - 7, 18, 3);
      const k = hoard / CAP;
      g.fillStyle(k > 0.1 ? EMBER_LIT : SOOT, 0.4 + k * 0.6); g.fillRect(bx - 5, by - 3, 10, 2);
      if (k > 0.5) glow(g, bx, by, 10 + k * 8, GLOW, 0.06, 2);
      if (flying) {
        const t = Math.min(1, (time - flying.at) / 420);
        for (let i = 0; i < 6; i++) {
          const tt = Math.max(0, t - i * 0.05);
          const x = bx + (ctx.npc.x - bx) * tt;
          const y = by + (ctx.npc.y - by) * tt - Math.sin(tt * Math.PI) * 60;
          g.fillStyle(i % 2 ? EMBER : EMBER_LIT, 0.9); g.fillCircle(x + i * 3, y, 4);
        }
      }
    },
  };
};

// ── Flue Brush ───────────────────────────────────────────────────────
// Every third cast you sweep: a soot cloud is left where you stood and you scuttle off quick.
// The foe chokes in it while it hangs.

const flueBrush: ItemScriptFactory = (ctx) => {
  let casts = 0;
  const clouds: { x: number; y: number; at: number; lastTick: number }[] = [];
  return {
    onCast() {
      if (!live(ctx)) return;
      casts++;
      if (casts % 3 !== 0) return;
      const now = ctx.scene.time.now;
      clouds.push({ x: ctx.player.x, y: ctx.player.y, at: now, lastTick: 0 });
      ctx.boostSpeed(1.22, 1500);
      ctx.float(ctx.player.x, ctx.player.y - 40, 'SWEEP', '#d8d2c8');
      ctx.sfx('whoosh');
    },
    update(time) {
      for (const c of clouds) {
        if (!foeLive(ctx)) break;
        if (Phaser.Math.Distance.Between(c.x, c.y, ctx.npc.x, ctx.npc.y) < 70 && time - c.lastTick > 500) {
          c.lastTick = time;
          ctx.hit(ctx.npc, 3, ctx.npc.x, ctx.npc.y);
        }
      }
      for (let i = clouds.length - 1; i >= 0; i--) if (time - clouds[i].at > 3200) clouds.splice(i, 1);
    },
    drawAir(g, time) {
      for (const c of clouds) {
        const k = (time - c.at) / 3200;
        const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.7) / 0.3);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + time / 900;
          g.fillStyle(i % 2 ? 0x2b2725 : 0x3a3532, 0.45 * a);
          g.fillCircle(c.x + Math.cos(ang) * 28, c.y - 6 + Math.sin(ang) * 16, 26);
        }
        g.fillStyle(SOOT, 0.5 * a); g.fillCircle(c.x, c.y - 6, 30);
      }
    },
  };
};

// ── Hobstone ─────────────────────────────────────────────────────────
// Plant your feet and a hearth kindles under you: health back each second, and your blows land
// a fifth harder. Step off and it's out — a hearth is kept, not carried.

const hobstone: ItemScriptFactory = (ctx) => {
  const step = clock();
  let ax = 0, ay = 0;
  let kindle = 0;
  let healAcc = 0;
  let anchored = false;
  let boostUntil = 0;
  return {
    update(time) {
      const dt = step(time);
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!anchored || Phaser.Math.Distance.Between(ax, ay, p.x, p.y) > 24) {
        if (kindle >= 1) ctx.float(p.x, p.y - 30, 'hearth out', '#9a9590');
        ax = p.x; ay = p.y; kindle = 0; anchored = true; healAcc = 0;
        return;
      }
      const was = kindle;
      kindle = Math.min(1, kindle + dt / 1.2);
      if (was < 1 && kindle >= 1) { ctx.float(p.x, p.y - 30, 'KINDLED', '#ffc070'); ctx.sfx('flame-burst'); }
      if (kindle >= 1) {
        healAcc += dt * 3;
        if (healAcc >= 1) { ctx.heal(p, Math.floor(healAcc)); healAcc -= Math.floor(healAcc); }
        // One boost window at a time — the kit stacks overlapping boosts.
        if (time >= boostUntil) { ctx.boostDamage(1.2, 300); boostUntil = time + 300; }
      }
    },
    drawGround(g, time) {
      if (!live(ctx) || kindle <= 0) return;
      g.fillStyle(0x5d5853, 0.8 * kindle); g.fillEllipse(ax, ay + 16, 54, 18);
      g.lineStyle(3, kindle >= 1 ? EMBER_LIT : EMBER_DARK, 0.9);
      g.beginPath(); g.arc(ax, ay + 16, 30, -Math.PI / 2, -Math.PI / 2 + kindle * Math.PI * 2, false); g.strokePath();
      if (kindle >= 1) {
        for (let i = 0; i < 3; i++) {
          const h = 10 + Math.sin(time / 100 + i * 2) * 4;
          g.fillStyle(i === 1 ? EMBER_LIT : EMBER, 0.85);
          g.fillTriangle(ax - 22 + i * 22 - 4, ay + 18, ax - 22 + i * 22 + 4, ay + 18, ax - 22 + i * 22, ay + 18 - h);
        }
      }
    },
  };
};

// ── Brand-Breaker's Nail ─────────────────────────────────────────────
// Three hits inside four seconds and the nail pries the brand off you — you heal, and the brand
// goes off in the foe's face if they're close. A long breath before it can break another.

const brandBreaker: ItemScriptFactory = (ctx) => {
  let hits: number[] = [];
  let readyAt = 0;
  let fx: { x: number; y: number; at: number } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now < readyAt) return;
      hits = hits.filter((t) => now - t < 4000);
      hits.push(now);
      if (hits.length < 3) return;
      hits = [];
      readyAt = now + 6000;
      ctx.heal(ctx.player, 10);
      ctx.float(ctx.player.x, ctx.player.y - 44, 'BRAND BROKEN', '#ffd27a');
      ctx.sfx('anvil');
      if (foeLive(ctx) && Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 180) {
        ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y);
        fx = { x: ctx.npc.x, y: ctx.npc.y, at: now };
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const now = time;
      const n = hits.filter((t) => now - t < 4000).length;
      if (now >= readyAt) {
        for (let i = 0; i < 3; i++) {
          brandSigil(g, p.x - 12 + i * 12, p.y - 46, 4, i < n ? EMBER_LIT : 0x3a3633, i < n ? 1 : 0.5);
        }
      }
      if (fx && now - fx.at < 500) {
        const k = (now - fx.at) / 500;
        brandSigil(g, fx.x, fx.y, 16 + k * 26, KINDLE_GOLD, 1 - k);
      }
    },
  };
};

// ── Kindle's Kept Flame (artifact) ───────────────────────────────────
// Each cast from a slot you haven't used this round plants a little tithe hearth where you
// stand. When the fourth is lit, fire runs between them for five seconds, burning the foe each
// time they cross a line. Then the hearths go out and the round starts again.

const keptFlame: ItemScriptFactory = (ctx) => {
  const hearths: { x: number; y: number; at: number }[] = [];
  const used = new Set<string>();
  let chainUntil = 0;
  let lastHit = 0;
  const LIFE = 5000;
  const seg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  };
  const links = () => hearths.map((h, i) => [h, hearths[(i + 1) % hearths.length]] as const);
  const script: ItemScript = {
    onCast(_id, slot) {
      if (!live(ctx) || chainUntil) return;
      const key = slot ?? _id;
      if (used.has(key)) return;
      used.add(key);
      const now = ctx.scene.time.now;
      hearths.push({ x: ctx.player.x, y: ctx.player.y, at: now });
      ctx.sfx('flame-burst');
      if (hearths.length >= 4) {
        chainUntil = now + LIFE;
        ctx.float(ctx.player.x, ctx.player.y - 50, 'EVERY HEARTH ANSWERS', '#ffd27a');
        ctx.sfx('inferno');
      }
    },
    update(time) {
      if (!chainUntil) return;
      if (time >= chainUntil) {
        chainUntil = 0;
        hearths.length = 0;
        used.clear();
        return;
      }
      if (!foeLive(ctx) || time - lastHit < 600) return;
      for (const [a, b] of links()) {
        if (seg(ctx.npc.x, ctx.npc.y, a.x, a.y, b.x, b.y) < 24) {
          lastHit = time;
          ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (chainUntil) {
        for (const [a, b] of links()) {
          g.lineStyle(22, EMBER, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(7, EMBER_LIT, 0.9 + Math.sin(time / 70) * 0.1); g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      for (const h of hearths) {
        g.fillStyle(0x000000, 0.3); g.fillEllipse(h.x, h.y + 3, 30, 9);
        g.fillStyle(IRON, 1); g.fillRect(h.x - 10, h.y - 12, 20, 4);
        g.fillRect(h.x - 9, h.y - 9, 3, 9); g.fillRect(h.x + 6, h.y - 9, 3, 9);
        g.fillStyle(EMBER, 1); g.fillEllipse(h.x, h.y - 12, 16, 5);
        const fh = 8 + Math.sin(time / 90 + h.x) * 3;
        g.fillStyle(EMBER_LIT, 0.9); g.fillTriangle(h.x - 4, h.y - 13, h.x + 4, h.y - 13, h.x, h.y - 13 - fh);
      }
    },
  };
  return script;
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HEARTH_ITEMS: IsleItemDef[] = [
  {
    id: 'hearth-charm-tithe-box', name: 'Tithe Box', emoji: '🗃️', kind: 'charm', price: 180, isle: ISLE,
    flavor: 'A tithe-man\'s collection box with the lock filed off. It still takes its cut. It just pays you now.',
    script: 'hearth-charm-tithe-box',
    scriptText: ['20% of every hit you take is stored (up to 40).', 'Casting your Q hurls the hoard at the foe and heals you a quarter of it.'],
  },
  {
    id: 'hearth-charm-flue-brush', name: 'Flue Brush', emoji: '🧹', kind: 'charm', price: 140, isle: ISLE,
    flavor: 'A climbing boy\'s brush, bristles black as night. Pim says it\'s cursed. Pim says that about everything.',
    script: 'hearth-charm-flue-brush',
    scriptText: ['Every 3rd cast leaves a soot cloud where you stood (3s) and speeds you up 22% for 1.5s.', 'The foe chokes in the cloud: 3 damage every half second.'],
  },
  {
    id: 'hearth-charm-hobstone', name: 'Hobstone', emoji: '🪨', kind: 'charm', price: 260, isle: ISLE,
    flavor: 'A hearthstone from a house that went to the Kiln. It still remembers being warm.',
    script: 'hearth-charm-hobstone',
    scriptText: ['Stand still for 1.2s to kindle a hearth under your feet.', 'While kindled: +3 HP per second and +20% damage. Moving puts it out.'],
  },
  {
    id: 'hearth-charm-brand-breaker', name: 'Brand-Breaker\'s Nail', emoji: '🔩', kind: 'charm', price: 360, isle: ISLE,
    flavor: 'Hessa forged it from one of Ostra\'s irons. It does one thing: it pries.',
    script: 'hearth-charm-brand-breaker',
    effect: { damageTakenMult: 0.97 },
    scriptText: ['Taking 3 hits within 4s breaks the brand: heal 10, and 14 damage to the foe if within 180px.', '6s before it can break another.'],
  },
  {
    id: 'art-kindle', name: 'Kindle\'s Kept Flame', emoji: '🔥', kind: 'artifact', isle: ISLE,
    flavor: 'The flame from Prince Kindle\'s hat. He handed it over himself. "Keep it," he said, "for someone."',
    script: 'art-kindle',
    effect: { maxHp: 15 },
    scriptText: [
      'Each cast from a slot not yet used this round plants a tithe hearth where you stand.',
      'At four hearths, fire chains between them for 5s: 9 damage to the foe on each crossing.',
    ],
  },
  {
    id: 'fish-soot-crayfish', name: 'Soot Crayfish', emoji: '🦞', kind: 'fish', sell: 8, isle: ISLE,
    flavor: 'Black as the cistern floor. Tastes of smoke and pennies. Every house in the Hearth Court boils them.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'fish-tithe-perch', name: 'Tithe Perch', emoji: '🐟', kind: 'fish', sell: 16, isle: ISLE,
    flavor: 'A sullen grey perch with an orange stripe like a brand. It fights the hook on principle.',
    effect: { regenPerSecond: 0.6 },
  },
];

export const HEARTH_SCRIPTS: Record<string, ItemScriptFactory> = {
  'hearth-charm-tithe-box': titheBox,
  'hearth-charm-flue-brush': flueBrush,
  'hearth-charm-hobstone': hobstone,
  'hearth-charm-brand-breaker': brandBreaker,
  'art-kindle': keptFlame,
};

export const HEARTH_SHOPS: ShopDef[] = [
  {
    id: 'hearth-shop',
    name: 'Ottilie\'s Hearthwares',
    stock: ['hearth-charm-flue-brush', 'hearth-charm-tithe-box', 'hearth-charm-hobstone', 'hearth-charm-brand-breaker'],
    buys: true,
  },
];

export const HEARTH_FISHERIES: FisheryDef[] = [{ id: 'hearth-cistern', name: 'The Hearth Cistern', kind: 'pond' }];

export const HEARTH_FISH: FishDef[] = [
  { id: 'fish-soot-crayfish', fisheries: ['hearth-cistern'], weight: 6, fight: 1, size: [8, 18] },
  { id: 'fish-tithe-perch', fisheries: ['hearth-cistern'], weight: 3, fight: 2, size: [18, 36] },
];
