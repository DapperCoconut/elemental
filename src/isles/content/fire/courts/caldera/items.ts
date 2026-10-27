import type { FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';
import { CAL, dist, hexPts, makeClock } from './palette';

/**
 * The Caldera Court's goods: four charms from Mother Scoria's commissary, Prince Basalt's
 * artifact, and the three fish of the lava lake. Every charm and the artifact carries a
 * script that changes how you fight, not just how hard.
 */

// ── Charm scripts ────────────────────────────────────────────────────

/**
 * Crustplate Brooch — stand still and you skin over. Every 0.7s planted adds a layer of crust
 * (three at most); each hit you take breaks one layer and gives back 45% of that hit.
 * Moving does not shed layers: you bank them while you plant, and spend them when it hurts.
 */
const crustplate: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let lx = ctx.player.x, ly = ctx.player.y;
  let still = 0;
  let layers = 0;
  return {
    update(time) {
      const dt = tick(time);
      const p = ctx.player;
      const moved = dist(lx, ly, p.x, p.y);
      lx = p.x; ly = p.y;
      if (moved > 1.5) { still = 0; return; }
      still += dt;
      if (still >= 0.7 && layers < 3) {
        still = 0;
        layers++;
        ctx.float(p.x, p.y - 40, layers === 3 ? 'CRUSTED' : '+crust', '#d8a070');
        ctx.sfx('stone-rise');
      }
    },
    onHitTaken(amount) {
      if (layers <= 0 || amount <= 0) return;
      layers--;
      ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.45)));
      ctx.flash(ctx.player.x, ctx.player.y, CAL.crustLit);
      ctx.sfx('shield-break');
    },
    drawGround(g) {
      if (layers <= 0) return;
      const p = ctx.player;
      for (let i = 0; i < layers; i++) {
        const r = 24 + i * 6;
        g.lineStyle(4, mixC(CAL.crust, CAL.crustLit, i / 3), 0.85);
        g.beginPath(); g.arc(p.x, p.y + 10, r, Math.PI * 0.1, Math.PI * 0.9, false); g.strokePath();
        g.lineStyle(1, CAL.lavaLit, 0.5);
        g.beginPath(); g.arc(p.x, p.y + 10, r + 2, Math.PI * 0.3, Math.PI * 0.4, false); g.strokePath();
      }
    },
  };
};

/**
 * Sulphur Whistle — your R and F casts each plant a sulphur vent at your feet (two at most).
 * A beat later the vent goes off: anything of the foe's within reach of it is scalded. Fight
 * over your own vents, or knock the foe onto them.
 */
const sulphurWhistle: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const vents: { x: number; y: number; at: number; blown: number }[] = [];
  let now = 0;
  return {
    update(time) {
      now = time;
      for (let i = vents.length - 1; i >= 0; i--) {
        const v = vents[i];
        if (!v.blown && time >= v.at) {
          v.blown = time;
          ctx.sfx('geyser');
          ctx.flash(v.x, v.y, CAL.sulphur);
          const n = ctx.npc;
          if (n.active && n.hp > 0 && dist(v.x, v.y, n.x, n.y) < 88) {
            ctx.hit(n, 16, n.x, n.y);
            ctx.float(n.x, n.y - 40, 'SCALDED', '#e4d94a');
          }
        }
        if (v.blown && time - v.blown > 700) vents.splice(i, 1);
      }
    },
    onCast(_id, slot) {
      if (slot !== 'r' && slot !== 'f') return;
      if (vents.filter((v) => !v.blown).length >= 2) return;
      vents.push({ x: ctx.player.x, y: ctx.player.y + 8, at: now + 1300, blown: 0 });
      ctx.sfx('trap-set');
    },
    drawGround(g, time) {
      for (const v of vents) {
        if (v.blown) continue;
        const k = 1 - Math.max(0, (v.at - time) / 1300);
        g.fillStyle(CAL.sulphurDark, 0.7); g.fillEllipse(v.x, v.y, 40, 18);
        g.fillStyle(CAL.sulphur, 0.6 + k * 0.4); g.fillEllipse(v.x, v.y - 1, 24, 10);
        g.lineStyle(2, CAL.sulphur, 0.3 + k * 0.5); g.strokeEllipse(v.x, v.y, 176, 88);
      }
    },
    drawAir(g, time) {
      for (const v of vents) {
        if (!v.blown) {
          const ph = (time / 500) % 1;
          g.fillStyle(CAL.sulphur, 0.3 * (1 - ph)); g.fillCircle(v.x + Math.sin(time / 150) * 4, v.y - 10 - ph * 22, 4 + ph * 4);
          continue;
        }
        const k = (time - v.blown) / 700;
        g.fillStyle(CAL.sulphur, 0.6 * (1 - k)); g.fillEllipse(v.x, v.y - 50 * k - 20, 30 + k * 30, 70 * (1 - k * 0.5));
        g.fillStyle(0xffffff, 0.4 * (1 - k)); g.fillEllipse(v.x, v.y - 40 * k - 20, 12, 40 * (1 - k * 0.5));
      }
    },
  };
};

/**
 * Slag Ring — damage you deal is smelted: every 90 forges a glowing slag pellet that orbits
 * you (three at most). When the foe comes within reach, the pellets fling themselves at it one
 * after another. Pressing in close is rewarded; kiting away wastes nothing, the ring waits.
 */
const slagRing: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let smelt = 0;
  let pellets = 0;
  let fireAt = 0;
  const shots: { x: number; y: number; t: number }[] = [];
  return {
    update(time) {
      const dt = tick(time);
      const p = ctx.player, n = ctx.npc;
      if (pellets > 0 && time >= fireAt && n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) < 150) {
        pellets--;
        fireAt = time + 260;
        const a = time / 300 + pellets * 2.1;
        shots.push({ x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30 - 10, t: 0 });
        ctx.sfx('sizzle');
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt;
        const d = dist(s.x, s.y, n.x, n.y);
        const step = 520 * dt;
        if (d <= step + 14 || s.t > 0.8) {
          if (d <= step + 14 && n.active && n.hp > 0) ctx.hit(n, 9, n.x, n.y);
          shots.splice(i, 1);
          continue;
        }
        s.x += ((n.x - s.x) / d) * step; s.y += ((n.y - s.y) / d) * step;
      }
    },
    onHitDealt(amount) {
      smelt += amount;
      while (smelt >= 90) {
        smelt -= 90;
        if (pellets < 3) { pellets++; ctx.float(ctx.player.x, ctx.player.y - 44, 'slag forged', '#ffa133'); }
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < pellets; i++) {
        const a = time / 300 + i * 2.1;
        const x = p.x + Math.cos(a) * 30, y = p.y + Math.sin(a) * 30 * 0.6 - 10;
        g.fillStyle(CAL.crust, 1); g.fillCircle(x, y, 5.5);
        g.fillStyle(CAL.lavaLit, 0.9); g.fillCircle(x - 1, y - 1, 3);
      }
      for (const s of shots) {
        g.fillStyle(CAL.lavaHot, 1); g.fillCircle(s.x, s.y, 4.5);
        g.fillStyle(CAL.lava, 0.4); g.fillCircle(s.x, s.y, 8);
      }
    },
  };
};

/**
 * Quota Pick — a miner's tally pick. Every sixth basic attack is a quarry strike: it splits
 * the ground under the foe if it is near (12 damage) and knocks 1.5s off your E. The six
 * notches over your head count the quota.
 */
const quotaPick: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let count = 0;
  let eId: string | null = null;
  let strikeAt = 0;
  let sx = 0, sy = 0;
  let now = 0;
  return {
    update(time) { now = time; },
    onCast(id, slot) {
      if (slot === 'e') eId = id;
      if (slot !== 'click') return;
      count++;
      if (count < 6) return;
      count = 0;
      const p = ctx.player, n = ctx.npc;
      strikeAt = now; sx = n.x; sy = n.y;
      if (n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) < 220) {
        ctx.hit(n, 12, n.x, n.y);
        ctx.float(n.x, n.y - 44, 'QUOTA MET', '#d8cfc0');
      } else {
        sx = p.x; sy = p.y;
      }
      ctx.sfx('anvil');
      if (eId) ctx.refund(eId, 1500);
    },
    drawGround(g, time) {
      const k = (time - strikeAt) / 500;
      if (k < 0 || k > 1) return;
      g.lineStyle(3, CAL.lavaLit, 1 - k);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26;
        g.lineBetween(sx, sy, sx + Math.cos(a) * 40 * (0.4 + k), sy + Math.sin(a) * 20 * (0.4 + k));
      }
    },
    drawAir(g) {
      const p = ctx.player;
      for (let i = 0; i < 6; i++) {
        const x = p.x - 15 + i * 6, y = p.y - 52;
        g.fillStyle(i < count ? 0xe8dcc8 : 0x2a2624, i < count ? 0.95 : 0.5);
        g.fillRect(x, y, 3, 8);
      }
    },
  };
};

// ── Artifact script ──────────────────────────────────────────────────

/**
 * Heart of Bedrock — Basalt's own heart, cooled. Damage you take is pressure in it (the heart
 * over your head cracks as it fills). At 70 it erupts out of *you*: four lava gouts are marked
 * round the foe and land a moment later, and you heal a fifth of what the heart held.
 */
const heartOfBedrock: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const CAP = 70;
  let pressure = 0;
  const gouts: { x: number; y: number; at: number; done: boolean }[] = [];
  let now = 0;
  return {
    update(time) {
      now = time;
      for (let i = gouts.length - 1; i >= 0; i--) {
        const gt = gouts[i];
        if (!gt.done && time >= gt.at) {
          gt.done = true;
          ctx.flash(gt.x, gt.y, CAL.lavaLit);
          const n = ctx.npc;
          if (n.active && n.hp > 0 && dist(gt.x, gt.y, n.x, n.y) < 50) ctx.hit(n, 14, n.x, n.y);
        }
        if (gt.done && time - gt.at > 500) gouts.splice(i, 1);
      }
    },
    onHitTaken(amount) {
      pressure += amount;
      if (pressure < CAP) return;
      const n = ctx.npc;
      ctx.float(ctx.player.x, ctx.player.y - 50, 'THE HEART ERUPTS', '#ff8a3a');
      ctx.sfx('explosion-medium');
      ctx.heal(ctx.player, Math.round(CAP * 0.2));
      for (let i = 0; i < 4; i++) {
        const a = ctx.rng() * Math.PI * 2;
        const d = i === 0 ? 0 : 30 + ctx.rng() * 50;
        gouts.push({ x: n.x + Math.cos(a) * d, y: n.y + Math.sin(a) * d, at: now + 750 + i * 140, done: false });
      }
      pressure = 0;
    },
    drawGround(g, time) {
      for (const gt of gouts) {
        if (gt.done) {
          const k = (time - gt.at) / 500;
          g.fillStyle(CAL.lavaHot, 0.7 * (1 - k)); g.fillCircle(gt.x, gt.y, 50 * (0.5 + k * 0.5));
          continue;
        }
        const k = 1 - Math.max(0, (gt.at - time) / 750);
        g.fillStyle(CAL.lava, 0.15 + k * 0.25); g.fillCircle(gt.x, gt.y, 50);
        g.lineStyle(2, CAL.lavaLit, 0.5 + k * 0.5); g.strokeCircle(gt.x, gt.y, 50);
      }
    },
    drawAir(g) {
      if (pressure <= 0) return;
      const p = ctx.player;
      const k = Math.min(1, pressure / CAP);
      const x = p.x + 26, y = p.y - 46;
      g.fillStyle(CAL.basaltDark, 0.9); g.fillPoints(hexPts(x, y, 8, 0, 1), true, true);
      g.lineStyle(1.5, mixC(CAL.seam, CAL.lavaHot, k), 0.6 + k * 0.4);
      g.lineBetween(x, y - 6 * k, x, y + 6 * k);
      if (k > 0.4) g.lineBetween(x, y, x - 5 * k, y + 4);
      if (k > 0.7) g.lineBetween(x, y, x + 5 * k, y - 3);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const CALDERA_ITEMS: IsleItemDef[] = [
  {
    id: 'caldera-crustplate',
    name: 'Crustplate Brooch',
    emoji: '🪨',
    kind: 'charm',
    price: 280,
    flavor: 'A disc of cooled crust on a pin. The miners wear them for luck. Luck is mostly standing still.',
    script: 'caldera-crustplate',
    scriptText: [
      'Every 0.7s standing still adds a layer of crust (max 3).',
      'Each hit you take breaks a layer and heals you for 45% of that hit.',
    ],
    isle: 'fire',
  },
  {
    id: 'caldera-sulphur-whistle',
    name: 'Sulphur Whistle',
    emoji: '🌋',
    kind: 'charm',
    price: 340,
    flavor: 'Blow it near a vent and the vent answers. Blow it anywhere else and, oddly, so does the ground.',
    script: 'caldera-sulphur-whistle',
    scriptText: [
      'R and F casts plant a sulphur vent at your feet (max 2 waiting).',
      'Each vent erupts 1.3s later, scalding the foe for 16 if it is close.',
    ],
    isle: 'fire',
  },
  {
    id: 'caldera-slag-ring',
    name: 'Slag Ring',
    emoji: '💍',
    kind: 'charm',
    price: 460,
    flavor: 'Cast from the drippings under the Kiln sluice. Warm to the touch, and getting warmer.',
    script: 'caldera-slag-ring',
    scriptText: [
      'Every 90 damage you deal forges a slag pellet that orbits you (max 3).',
      'When the foe comes close, the pellets fling themselves at it for 9 each.',
    ],
    effect: { statusDmgMult: 1.05 },
    isle: 'fire',
  },
  {
    id: 'caldera-quota-pick',
    name: 'Quota Pick',
    emoji: '⛏️',
    kind: 'charm',
    price: 160,
    flavor: 'Six notches cut in the haft. A miner who fills them all eats tonight.',
    script: 'caldera-quota-pick',
    scriptText: [
      'Every 6th basic attack is a quarry strike: 12 damage to a nearby foe.',
      'Each quarry strike knocks 1.5s off your E.',
    ],
    isle: 'fire',
  },
  {
    id: 'art-basalt',
    name: 'Heart of Bedrock',
    emoji: '🖤',
    kind: 'artifact',
    flavor: 'Prince Basalt\'s heart, cooled to a hexagon of black stone. Something still moves inside it.',
    effect: { maxHp: 25, damageTakenMult: 0.94 },
    script: 'art-basalt',
    scriptText: [
      'Damage you take builds pressure in the heart.',
      'At 70 it erupts: four lava gouts land round the foe (14 each) and you heal 14.',
    ],
    isle: 'fire',
  },
  {
    id: 'fish-magma-carp',
    name: 'Magma Carp',
    emoji: '🐠',
    kind: 'fish',
    sell: 48,
    flavor: 'Scales like cooling crust, gills that glow. Eaten raw it warms you from the inside for an hour.',
    effect: { regenPerSecond: 0.6 },
    isle: 'fire',
  },
  {
    id: 'fish-obsidian-gar',
    name: 'Obsidian Gar',
    emoji: '🐟',
    kind: 'fish',
    sell: 90,
    flavor: 'A long black fish with a glass-sharp snout. Its hide turns a knife, and then a stomach.',
    effect: { shieldHp: 14 },
    isle: 'fire',
  },
  {
    id: 'fish-slag-loach',
    name: 'Slag Loach',
    emoji: '🐡',
    kind: 'fish',
    sell: 30,
    flavor: 'A lumpy bottom-feeder that eats what the lake will not. Gritty, but it puts a spring in you.',
    effect: { speedMult: 1.04 },
    isle: 'fire',
  },
];

export const CALDERA_SCRIPTS: Record<string, ItemScriptFactory> = {
  'caldera-crustplate': crustplate,
  'caldera-sulphur-whistle': sulphurWhistle,
  'caldera-slag-ring': slagRing,
  'caldera-quota-pick': quotaPick,
  'art-basalt': heartOfBedrock,
};

export const CALDERA_SHOPS: ShopDef[] = [
  {
    id: 'caldera-shop',
    name: "Mother Scoria's Commissary",
    stock: ['caldera-quota-pick', 'caldera-crustplate', 'caldera-sulphur-whistle', 'caldera-slag-ring'],
    buys: true,
  },
];

export const CALDERA_FISHERIES: FisheryDef[] = [
  { id: 'caldera-lava', name: 'The Caldera Lake', kind: 'lava' },
];

export const CALDERA_FISH: FishDef[] = [
  { id: 'fish-magma-carp', fisheries: ['caldera-lava'], weight: 50, fight: 3, size: [30, 62], rod: 'rod-obsidian' },
  { id: 'fish-slag-loach', fisheries: ['caldera-lava'], weight: 36, fight: 2, size: [14, 34], rod: 'rod-obsidian' },
  { id: 'fish-obsidian-gar', fisheries: ['caldera-lava'], weight: 16, fight: 5, size: [70, 140], rod: 'rod-obsidian' },
];
