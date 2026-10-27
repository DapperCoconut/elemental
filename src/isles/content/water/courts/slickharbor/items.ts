import type { IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import {
  CRUDE, FLAME, FLAME_LIT, GILT, GILT_DARK, LAMP_GOLD, LAMP_LIT, SAFETY_RED, SEA_LIT, STEEL, STEEL_DARK,
  clamp, dist, droplet, flameTongue, frameClock, sheenAt, slick, sootPuff, tithCrate,
} from './util';

/**
 * Slickharbor's wares: four charms from Old Sal's Slop Chest, Prince Crude's artifact, and the
 * three fish of the Slick. Every charm and the artifact carries a bespoke script.
 */

export const CHARM_SOLES = 'slickharbor-tarpaper-soles';
export const CHARM_BILGE = 'slickharbor-bilge-pump';
export const CHARM_TAPER = 'slickharbor-lamplighters-taper';
export const CHARM_HOOK = 'slickharbor-hoist-hook';
export const ART_CRUDE = 'art-crude';

const alive = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Scripts ──────────────────────────────────────────────────────────

/**
 * Tar-Paper Soles — every ability you cast leaves a slick at your feet (6s, three at most).
 * While the foe stands in one of your slicks your damage runs +15%; while you stand in one you
 * move 12% faster. Fight on your own oil.
 */
const tarpaperSoles: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  interface Mine { x: number; y: number; until: number; seed: number }
  const LIFE = 6000, R = 46;
  let mines: Mine[] = [];
  let seed = 1;
  let dmgUntil = 0, spdUntil = 0;
  const inOne = (x: number, y: number): boolean => mines.some((m) => {
    const dx = (x - m.x) / R, dy = (y - m.y) / (R * 0.62);
    return dx * dx + dy * dy < 1;
  });
  return {
    onCast() {
      const now = ctx.scene.time.now;
      mines.push({ x: ctx.player.x, y: ctx.player.y + 10, until: now + LIFE, seed: seed++ * 2.3 });
      if (mines.length > 3) mines.shift();
      ctx.sfx('oil-splash');
    },
    update(time) {
      mines = mines.filter((m) => time < m.until);
      // Damage and speed windows are refreshed, never stacked, so they hold steady.
      if (alive(ctx.npc) && inOne(ctx.npc.x, ctx.npc.y) && time >= dmgUntil) { dmgUntil = time + 400; ctx.boostDamage(1.15, 400); }
      if (alive(ctx.player) && inOne(ctx.player.x, ctx.player.y) && time >= spdUntil) { spdUntil = time + 400; ctx.boostSpeed(1.12, 400); }
    },
    drawGround(g, time) {
      for (const m of mines) {
        const a = clamp((m.until - time) / 900, 0, 1) * clamp((time - (m.until - LIFE)) / 250, 0.2, 1);
        slick(g, m.x, m.y, R, R * 0.62, m.seed, time / 1000 * 0.6 + m.seed, a);
      }
      if (alive(ctx.npc) && inOne(ctx.npc.x, ctx.npc.y)) {
        g.lineStyle(2, sheenAt(time / 300), 0.7); g.strokeEllipse(ctx.npc.x, ctx.npc.y + 14, 50, 18);
      }
    },
  };
};

/**
 * Bilge Pump — damage you take sloshes into the bilge (up to 40). Keep still for 0.8s and you
 * pump it out: 1 HP back for every 2 in the bilge, a stroke at a time, for as long as you hold
 * still. Move and the pump stops.
 */
const bilgePump: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const CAP = 40;
  let bilge = 0;
  let stillFor = 0;
  let px = ctx.player.x, py = ctx.player.y;
  let nextStroke = 0;
  let stroke = 0;
  const tick = frameClock();
  return {
    onHitTaken(amount) { bilge = Math.min(CAP, bilge + amount); },
    update(time) {
      const dt = tick(time);
      const moved = dist(ctx.player.x, ctx.player.y, px, py);
      px = ctx.player.x; py = ctx.player.y;
      stillFor = moved < 0.6 ? stillFor + dt : 0;
      if (stillFor >= 0.8 && bilge >= 2 && time >= nextStroke && alive(ctx.player)) {
        nextStroke = time + 160;
        bilge -= 2;
        stroke++;
        ctx.heal(ctx.player, 1);
        if (stroke % 6 === 0) ctx.sfx('splash');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      const x = p.x - 34, y = p.y - 36;
      const k = bilge / CAP;
      // A little riveted tank with the bilge level inside, and the pump handle on top.
      g.fillStyle(STEEL_DARK, 1); g.fillRoundedRect(x - 7, y - 16, 14, 26, 3);
      g.fillStyle(0x0e1a20, 1); g.fillRect(x - 5, y - 14, 10, 22);
      g.fillStyle(SEA_LIT, 0.9); g.fillRect(x - 5, y + 8 - 22 * k, 10, 22 * k);
      g.fillStyle(CRUDE, 0.8); g.fillRect(x - 5, y + 8 - 22 * k, 10, 2);
      const pumping = stillFor >= 0.8 && bilge >= 2;
      const h = pumping ? Math.sin(time / 80) * 6 : 0;
      g.lineStyle(2, STEEL, 1); g.lineBetween(x, y - 16, x + 8, y - 24 + h);
      g.fillStyle(SAFETY_RED, 1); g.fillCircle(x + 8, y - 24 + h, 2.5);
      if (pumping) {
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 400) + i / 3) % 1;
          g.fillStyle(SEA_LIT, 0.7 * (1 - ph)); g.fillCircle(x + 10 + ph * 10, y + 6 + ph * ph * 20, 2);
        }
      } else if (stillFor > 0.1 && bilge >= 2) {
        g.lineStyle(2, 0xbfe8ff, 0.7);
        g.beginPath(); g.arc(x, y - 2, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(stillFor / 0.8, 0, 1), false); g.strokePath();
      }
    },
  };
};

/**
 * Lamplighter's Taper — every 9s the taper catches. Your next landed hit sets the foe alight:
 * 4 damage a second for 4s. Land another hit while they burn and the flame runs on, +1s each
 * time (8s at most).
 */
const lamplightersTaper: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 9000;
  let litAt = ctx.scene.time.now + PERIOD;
  let lit = false;
  let burnUntil = 0, burnStart = 0, nextTick = 0;
  let self = false;
  return {
    update(time) {
      if (!lit && time >= litAt) { lit = true; ctx.sfx('fireball'); ctx.float(ctx.player.x, ctx.player.y - 58, 'TAPER LIT', '#ffd27a'); }
      if (time < burnUntil && time >= nextTick && alive(ctx.npc)) {
        nextTick = time + 1000;
        self = true;
        ctx.hit(ctx.npc, 4, ctx.npc.x, ctx.npc.y);
        self = false;
      }
    },
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      const now = ctx.scene.time.now;
      if (lit) {
        lit = false;
        litAt = now + PERIOD;
        burnStart = now;
        burnUntil = now + 4000;
        nextTick = now + 500;
        ctx.sfx('flame-burst');
        ctx.float(ctx.npc.x, ctx.npc.y - 46, 'ALIGHT', '#ff9a3a');
      } else if (now < burnUntil) {
        burnUntil = Math.min(burnStart + 8000, burnUntil + 1000);
      }
    },
    drawAir(g, time) {
      const ts = time / 1000;
      if (lit && alive(ctx.player)) {
        // The taper itself over your shoulder: a long wax spill with a bead of flame.
        const x = ctx.player.x + 24, y = ctx.player.y - 44;
        g.lineStyle(3, 0xe8dcc0, 1); g.lineBetween(x - 6, y + 14, x, y);
        flameTongue(g, x, y + 1, 11, ts, 3);
        g.fillStyle(LAMP_GOLD, 0.15); g.fillCircle(x, y - 3, 12);
      }
      if (time < burnUntil && alive(ctx.npc)) {
        const n = ctx.npc;
        for (let i = 0; i < 4; i++) flameTongue(g, n.x + (i - 1.5) * 9, n.y + 12, 16 + (i % 2) * 6, ts, i * 1.9);
        sootPuff(g, n.x, n.y - 18, (ts * 0.8) % 1, 9, 0.5);
        const k = (burnUntil - time) / 8000;
        g.lineStyle(2, FLAME_LIT, 0.8);
        g.beginPath(); g.arc(n.x, n.y - 60, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(k, 0, 1), false); g.strokePath();
      }
    },
  };
};

/**
 * Hoist Hook — every 7s a crane hook marks the foe from above: its shadow settles where they
 * stand, and 1.2s later a crate lands there for 16 if they are still within reach of the mark.
 * Anything that holds them in place — a slow, a root, a stun, a wall — makes it land.
 */
const hoistHook: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 7000, FALL = 1200, REACH = 50;
  let nextMark = ctx.scene.time.now + 4000;
  let mark: { x: number; y: number; at: number; landAt: number } | null = null;
  let landed: { x: number; y: number; at: number; hit: boolean } | null = null;
  return {
    update(time) {
      if (!mark && time >= nextMark && alive(ctx.npc)) {
        mark = { x: ctx.npc.x, y: ctx.npc.y, at: time, landAt: time + FALL };
        ctx.sfx('chain');
      }
      if (mark && time >= mark.landAt) {
        const hit = alive(ctx.npc) && dist(ctx.npc.x, ctx.npc.y, mark.x, mark.y) <= REACH;
        if (hit) { ctx.hit(ctx.npc, 16, mark.x, mark.y); ctx.float(mark.x, mark.y - 50, 'HOISTED', '#ffd79a'); }
        ctx.sfx(hit ? 'hit-heavy' : 'stone-slam');
        landed = { x: mark.x, y: mark.y, at: time, hit };
        mark = null;
        nextMark = time + PERIOD;
      }
      if (landed && time - landed.at > 900) landed = null;
    },
    drawGround(g, time) {
      if (mark) {
        const k = clamp((time - mark.at) / FALL, 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.32); g.fillEllipse(mark.x, mark.y + 10, 70 * (0.5 + k * 0.5), 26 * (0.5 + k * 0.5));
        g.lineStyle(2, LAMP_GOLD, 0.4 + k * 0.5); g.strokeCircle(mark.x, mark.y + 4, REACH);
      }
      if (landed) {
        const k = (time - landed.at) / 900;
        g.lineStyle(4 * (1 - k), landed.hit ? FLAME_LIT : 0xbab0a0, 0.7 * (1 - k)); g.strokeEllipse(landed.x, landed.y + 10, 70 + k * 60, 26 + k * 20);
      }
    },
    drawAir(g, time) {
      if (mark) {
        const k = clamp((time - mark.at) / FALL, 0, 1);
        const y = mark.y + 16 - (1 - k * k) * 300;
        g.lineStyle(2, 0x1a1a1a, 1); g.lineBetween(mark.x, y - 60, mark.x, y - 400);
        g.fillStyle(SAFETY_RED, 1); g.fillRect(mark.x - 6, y - 62, 12, 6);
        g.lineStyle(3, STEEL, 1); g.beginPath(); g.arc(mark.x, y - 50, 6, -0.2, Math.PI * 1.1, false); g.strokePath();
        g.lineStyle(1.2, 0x8a7450, 1); g.lineBetween(mark.x, y - 44, mark.x - 16, y - 32); g.lineBetween(mark.x, y - 44, mark.x + 16, y - 32);
        tithCrate(g, mark.x, y, 16, false);
      } else if (landed && landed.hit) {
        const k = (time - landed.at) / 900;
        tithCrate(g, landed.x, landed.y + 16, 16, false);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(0x9a7a52, 1 - k); g.fillRect(landed.x + Math.cos(a) * (14 + k * 50), landed.y + Math.sin(a) * (8 + k * 26), 6, 2);
        }
      }
    },
  };
};

/**
 * Crude's Lamp-Crown (artifact) — every hit you land oils the foe (+1, up to 10; a coat drips
 * off every 3s without a hit). At 10 they are drenched: your damage runs +12% while it lasts.
 * Cast your Q to put the Queen's lamp to them: 3 damage per coat at once and a 3s burn of 1 per
 * coat per second — and the oil is spent.
 */
const lampCrown: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const MAX = 10;
  let coats = 0;
  let lastHit = 0;
  let drenchUntil = 0;
  let burnUntil = 0, burnPer = 0, nextTick = 0;
  let flashAt = -9999;
  let self = false;
  return {
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      lastHit = ctx.scene.time.now;
      if (coats < MAX) {
        coats++;
        if (coats === MAX) { ctx.float(ctx.npc.x, ctx.npc.y - 50, 'DRENCHED', '#c8a8ff'); ctx.sfx('oil-splash'); }
      }
    },
    onCast(abilityId, slot) {
      const s = slot ?? ctx.slotOf(abilityId);
      if (s !== 'q' || coats <= 0 || !alive(ctx.npc)) return;
      const now = ctx.scene.time.now;
      self = true;
      ctx.hit(ctx.npc, coats * 3, ctx.npc.x, ctx.npc.y);
      self = false;
      burnPer = coats;
      burnUntil = now + 3000;
      nextTick = now + 1000;
      flashAt = now;
      ctx.float(ctx.npc.x, ctx.npc.y - 56, `LAMPLIT ×${coats}`, '#ffb050');
      ctx.flash(ctx.npc.x, ctx.npc.y, FLAME);
      ctx.sfx('flame-burst');
      coats = 0;
    },
    update(time) {
      if (coats > 0 && time - lastHit > 3000) { coats--; lastHit = time; }
      if (coats >= MAX && time >= drenchUntil) { drenchUntil = time + 400; ctx.boostDamage(1.12, 400); }
      if (time < burnUntil && time >= nextTick && alive(ctx.npc)) {
        nextTick = time + 1000;
        self = true;
        ctx.hit(ctx.npc, burnPer, ctx.npc.x, ctx.npc.y);
        self = false;
      }
    },
    drawAir(g, time) {
      const ts = time / 1000;
      const n = ctx.npc;
      if (alive(n) && coats > 0) {
        // Oil on the foe: drips and a sheen ring that thickens per coat.
        g.lineStyle(1.5 + coats * 0.3, sheenAt(ts + coats * 0.3), 0.3 + coats * 0.05); g.strokeCircle(n.x, n.y, 24);
        for (let i = 0; i < Math.ceil(coats / 2); i++) {
          const ph = ((time / 600) + i / 5) % 1;
          droplet(g, n.x - 16 + i * 8, n.y + 14 + ph * 16, 2.4, 1 - ph);
        }
        for (let i = 0; i < MAX; i++) {
          g.fillStyle(i < coats ? CRUDE : 0x3a3a3a, i < coats ? 1 : 0.4);
          g.fillCircle(n.x - 22 + i * 4.9, n.y - 64, 1.9);
        }
      }
      if (alive(n) && time < burnUntil) {
        for (let i = 0; i < 5; i++) flameTongue(g, n.x + (i - 2) * 9, n.y + 14, 18 + (i % 2) * 8, ts, i * 2.1 + 5);
      }
      if (time - flashAt < 400 && alive(n)) {
        const k = (time - flashAt) / 400;
        g.lineStyle(8 * (1 - k), FLAME_LIT, 0.8 * (1 - k)); g.strokeCircle(n.x, n.y, 20 + k * 70);
      }
      // The crown worn by you: a small lamp floating at your brow.
      const p = ctx.player;
      if (alive(p)) {
        const x = p.x, y = p.y - 50;
        g.fillStyle(GILT_DARK, 1); g.fillRect(x - 7, y + 4, 14, 4);
        g.fillStyle(GILT, 1); g.fillRect(x - 6, y + 4, 12, 2);
        g.fillStyle(0xe8f4ff, 0.25); g.fillEllipse(x, y - 2, 12, 12);
        const big = coats >= MAX ? 1.5 : 1;
        g.fillStyle(LAMP_GOLD, 0.9); g.fillTriangle(x - 3 * big, y + 3, x + 3 * big, y + 3, x, y - 8 * big);
        g.fillStyle(LAMP_LIT, 1); g.fillCircle(x, y + 1, 1.5);
      }
    },
  };
};

export const SLICKHARBOR_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_SOLES]: tarpaperSoles,
  [CHARM_BILGE]: bilgePump,
  [CHARM_TAPER]: lamplightersTaper,
  [CHARM_HOOK]: hoistHook,
  [ART_CRUDE]: lampCrown,
};

// ── Item defs ────────────────────────────────────────────────────────

export const SLICKHARBOR_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_SOLES, name: 'Tar-Paper Soles', emoji: '🥿', kind: 'charm', price: 190, isle: 'water',
    flavor: 'Mopper Gunnel\'s spare pair. Grips like a limpet on your own oil, slides like an eel on anyone else\'s.',
    script: CHARM_SOLES,
    scriptText: [
      'Every cast leaves a slick at your feet (6s, three at most).',
      'Foe in your slick: your damage +15%. You in your slick: +12% speed.',
    ],
  },
  {
    id: CHARM_BILGE, name: 'Bilge Pump', emoji: '🪣', kind: 'charm', price: 270, isle: 'water',
    flavor: 'Off a tithe-barge that sank anyway. Fenwick says the pump was the only honest thing aboard.',
    effect: { maxHp: 6 },
    script: CHARM_BILGE,
    scriptText: [
      'Damage you take fills the bilge (up to 40).',
      'Keep still 0.8s to pump it out: 1 HP back per 2 bilge, while you stay still.',
    ],
  },
  {
    id: CHARM_TAPER, name: 'Lamplighter\'s Taper', emoji: '🕯️', kind: 'charm', price: 390, isle: 'water',
    flavor: 'Lamp-Warden Dimmock\'s, before he gave up snuffing. Still lights first time, every time.',
    script: CHARM_TAPER,
    scriptText: [
      'Lights every 9s. Your next landed hit sets the foe alight: 4 damage a second for 4s.',
      'Hits while they burn run the flame on, +1s each (8s at most).',
    ],
  },
  {
    id: CHARM_HOOK, name: 'Hoist Hook', emoji: '🪝', kind: 'charm', price: 580, isle: 'water',
    flavor: 'A spare hook off Hoyle\'s crane. Wherever you go, a load you cannot see goes with you.',
    effect: { critChance: 0.02 },
    script: CHARM_HOOK,
    scriptText: [
      'Every 7s a hook marks where the foe stands; 1.2s later a crate lands there',
      'for 16 if they are still in reach. Hold them in place and it never misses.',
    ],
  },
  {
    id: ART_CRUDE, name: 'Crude\'s Lamp-Crown', emoji: '🪔', kind: 'artifact', isle: 'water',
    flavor: 'The Queen\'s own glass lamp, lifted off the Prince\'s head. It burns a little brighter on your anger.',
    script: ART_CRUDE,
    scriptText: [
      'Every hit oils the foe (+1, up to 10; one drips off per 3s without a hit).',
      'At 10 they are drenched: your damage +12%.',
      'Cast your Q to light them: 3 damage per coat, then 1 per coat per second for 3s.',
    ],
  },
  // The Slick's fish.
  {
    id: 'fish-tar-catfish', name: 'Tar Catfish', emoji: '🐟', kind: 'fish', sell: 20, isle: 'water',
    flavor: 'A whiskered bottom-feeder black as the harbour floor. Fries up in its own oil. Bessa swears by it.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'fish-slick-sculpin', name: 'Slick Sculpin', emoji: '🐡', kind: 'fish', sell: 32, isle: 'water',
    flavor: 'Spined, sullen and impossible to hold. It slides out of your hands twice before it reaches the bucket.',
    effect: { dodgeChance: 0.04 },
  },
  {
    id: 'fish-rainbow-shiner', name: 'Rainbow Shiner', emoji: '🐠', kind: 'fish', sell: 64, isle: 'water',
    flavor: 'Wears the slick\'s rainbow on its scales — but only in pure crude. In watered oil it comes up grey.',
    effect: { critChance: 0.05 },
  },
];
