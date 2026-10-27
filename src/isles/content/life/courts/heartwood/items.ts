import type { FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { HW, alive, amberBlock, dist, leaf, makeClock, splinter, termite } from './palette';

/**
 * The Heartwood Court's goods: four charms from Tamsel Burl's knot-hole shop, Prince
 * Birchbark's artifact, and the three fish of the root pool. Every charm and the artifact runs a
 * script that changes how you fight — a year you store, a rhythm you keep, leaves you gather, a
 * colony you plant, roots you put down — not just how hard you hit.
 */

/**
 * A multiplier held for as long as you keep refreshing it. The kit stacks damage and speed
 * windows multiplicatively, so a script re-issues one only as the last expires.
 */
function heldWindow(push: (mult: number, ms: number) => void, ms = 500): (time: number, mult: number) => void {
  let until = 0;
  return (time, mult) => {
    if (time < until || Math.abs(mult - 1) < 0.001) return;
    until = time + ms;
    push(mult, ms);
  };
}

// ── Charm scripts ────────────────────────────────────────────────────

/**
 * Ring Locket — a slice of birch twig in a silver case. Every 7 seconds of fight lays down a
 * ring in it (five at most). Cast F to spend them all: every other ability you have used this
 * fight comes back 0.6s sooner for each ring spent.
 */
const ringLocket: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let rings = 0;
  let lastRing = -1;
  let now = 0;
  let spentAt = -9999, spentN = 0;
  const used = new Set<string>();
  return {
    update(time) {
      now = time;
      if (lastRing < 0) lastRing = time;
      if (rings < 5 && time - lastRing >= 7000) {
        rings++; lastRing = time;
        ctx.float(ctx.player.x, ctx.player.y - 46, rings === 5 ? 'FIVE RINGS' : '+ring', '#d9b27a');
      }
      if (rings >= 5) lastRing = time;
    },
    onCast(id, slot) {
      if (slot !== 'f') { used.add(id); return; }
      if (rings <= 0) return;
      for (const other of used) ctx.refund(other, rings * 600);
      ctx.float(ctx.player.x, ctx.player.y - 50, `${rings} YEARS BACK`, '#ffd76e');
      ctx.sfx('time-warp');
      spentAt = now; spentN = rings;
      rings = 0; lastRing = now;
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The locket's rings, as small concentric circles over your shoulder.
      const x = p.x + 22, y = p.y - 38;
      g.fillStyle(HW.sapwood, 0.9); g.fillCircle(x, y, 7);
      for (let i = 1; i <= rings; i++) { g.lineStyle(1, HW.heart, 0.9); g.strokeCircle(x, y, i * 1.3); }
      const k = (time - spentAt) / 500;
      if (k >= 0 && k < 1) {
        for (let i = 1; i <= spentN; i++) { g.lineStyle(2, HW.amberLit, 1 - k); g.strokeCircle(p.x, p.y, 20 + i * 12 * k + k * 30); }
      }
    },
  };
};

/**
 * Woodpecker's Beak — land hits in a steady rhythm (each 0.35–1.2s after the last) and the
 * beak keeps count. On the fourth beat in time it splits the foe for 14. Lose the beat and the
 * count starts again.
 */
const beak: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let count = 0;
  let lastHit = -9999;
  let now = 0;
  let burstAt = -9999;
  return {
    update(time) {
      now = time;
      if (count > 0 && time - lastHit > 1200) count = 0;
    },
    onHitDealt(amount) {
      if (amount <= 0) return;
      const gap = now - lastHit;
      lastHit = now;
      count = gap >= 350 && gap <= 1200 ? count + 1 : 1;
      if (count < 4) { ctx.sfx('drum-hit'); return; }
      count = 0;
      const n = ctx.npc;
      if (alive(n)) {
        ctx.hit(n, 14, n.x, n.y);
        ctx.float(n.x, n.y - 46, 'DRUMMED', '#f4f2ea');
      }
      ctx.sfx('explosion-small');
      burstAt = now;
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i < count ? (i === 3 ? 0xd8262a : HW.whitewash) : 0x3a3430, 0.9);
        g.fillCircle(p.x - 13 + i * 9, p.y - 48, i === 3 ? 3 : 2.3);
      }
      const k = (time - burstAt) / 400;
      if (k >= 0 && k < 1 && alive(n)) {
        for (let i = 0; i < 7; i++) splinter(g, n.x + Math.cos(i * 0.9) * 40 * k, n.y + Math.sin(i * 0.9) * 30 * k, i * 0.9, 12, 1 - k);
      }
    },
  };
};

/**
 * Leaf-Drift Cloak — while you go unhit, turned leaves gather on you, one every 1.2 seconds
 * (six at most). The next hit you take scatters them: you are healed 7% of that hit per leaf,
 * and if the foe is close the flying leaves buffet it for 2 each.
 */
const leafCloak: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let leaves = 0;
  let lastGain = 0;
  let lastHit = 0;
  let now = 0;
  let scatterAt = -9999, scatterN = 0;
  const COLORS = [HW.leafGold, HW.leafRust, HW.leafButter, HW.leafRed, HW.leafGreen, HW.leafGold];
  return {
    update(time) {
      now = time;
      if (leaves < 6 && time - Math.max(lastGain, lastHit) >= 1200) { leaves++; lastGain = time; }
    },
    onHitTaken(amount) {
      lastHit = now;
      if (leaves <= 0 || amount <= 0) return;
      ctx.heal(ctx.player, amount * 0.07 * leaves);
      const p = ctx.player, n = ctx.npc;
      if (alive(n) && dist(p.x, p.y, n.x, n.y) < 150) ctx.hit(n, 2 * leaves, n.x, n.y);
      ctx.float(p.x, p.y - 46, 'CUSHIONED', '#e9bc33');
      ctx.sfx('gust');
      scatterAt = now; scatterN = leaves;
      leaves = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const t = time / 1000;
      for (let i = 0; i < leaves; i++) {
        const a = Math.PI * 0.9 + i * 0.28;
        leaf(g, p.x + Math.cos(a) * 18, p.y - 4 + Math.sin(a) * 10 + Math.sin(t * 2 + i) * 1.5, a + Math.PI / 2, 9, COLORS[i], 0.95);
      }
      const k = (time - scatterAt) / 600;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < scatterN * 2; i++) {
          const a = i * 1.1;
          leaf(g, p.x + Math.cos(a) * 70 * k, p.y + Math.sin(a) * 50 * k, a + k * 8, 9, COLORS[i % 6], 1 - k);
        }
      }
    },
  };
};

/**
 * Termite Jar — a cork-stoppered jar of Mandible's termites. Each hit you land plants a bite
 * on the foe (five at most; they fade if you leave it alone for 5 seconds). Every bite chews 1
 * damage a second. Land a hit on a foe already carrying five and the colony brings it down
 * from the inside: 22 damage, and the bites are spent.
 */
const termiteJar: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let bites = 0;
  let lastBite = 0;
  let acc = 0;
  let now = 0;
  let collapseAt = -9999;
  return {
    update(time) {
      const dt = tick(time);
      now = time;
      const n = ctx.npc;
      if (bites > 0 && time - lastBite > 5000) bites = 0;
      if (bites > 0 && alive(n)) {
        acc += bites * dt;
        if (acc >= 1) { const d = Math.floor(acc); acc -= d; ctx.hit(n, d, n.x, n.y); }
      }
    },
    onHitDealt(amount) {
      if (amount <= 0) return;
      lastBite = now;
      const n = ctx.npc;
      if (bites >= 5) {
        bites = 0;
        if (alive(n)) { ctx.hit(n, 22, n.x, n.y); ctx.float(n.x, n.y - 46, 'EATEN THROUGH', '#c9a26a'); }
        ctx.sfx('stone-slam');
        collapseAt = now;
        return;
      }
      bites++;
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!alive(n)) return;
      for (let i = 0; i < bites; i++) {
        const a = time / 500 + i * 1.26;
        termite(g, n.x + Math.cos(a) * 20, n.y + Math.sin(a) * 14, a + Math.PI / 2, 5, 0.95);
      }
      const k = (time - collapseAt) / 450;
      if (k >= 0 && k < 1) { g.fillStyle(0xc9a26a, 0.5 * (1 - k)); g.fillCircle(n.x, n.y + 10, 20 + 30 * k); }
    },
  };
};

// ── Artifact script ──────────────────────────────────────────────────

/**
 * Birchbark's Heartwood — a fist of the Still Prince's own heart, red and warm. Stand still
 * for 0.8 seconds and you take root: while rooted your blows land 25% harder and you mend 3
 * health a second. Step off and the roots tear free in a ring of splinters, hitting a foe within
 * 130px for 12 (once every 4 seconds).
 */
const birchbarkHeart: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let lastX = NaN, lastY = NaN;
  let still = 0;
  let rooted = false;
  let rootedAt = 0;
  let lastTear = -9999;
  let tearAt = -9999, tearX = 0, tearY = 0;
  let healAcc = 0;
  const dmg = heldWindow((m, ms) => ctx.boostDamage(m, ms));
  return {
    update(time) {
      const dt = tick(time);
      const p = ctx.player;
      const moved = Number.isNaN(lastX) ? 0 : Math.hypot(p.x - lastX, p.y - lastY);
      lastX = p.x; lastY = p.y;
      if (moved < 0.6) still += dt; else still = 0;
      if (!rooted && still >= 0.8) { rooted = true; rootedAt = time; ctx.sfx('stone-rise'); ctx.float(p.x, p.y - 46, 'ROOTED', '#a9492a'); }
      if (rooted && moved >= 0.6) {
        rooted = false;
        if (time - lastTear >= 4000) {
          lastTear = time; tearAt = time; tearX = p.x; tearY = p.y;
          ctx.sfx('thorn');
          const n = ctx.npc;
          if (alive(n) && dist(p.x, p.y, n.x, n.y) < 130) { ctx.hit(n, 12, n.x, n.y); ctx.float(n.x, n.y - 46, 'TORN UP', '#d9b27a'); }
        }
      }
      if (rooted) {
        dmg(time, 1.25);
        healAcc += 3 * dt;
        if (healAcc >= 1) { const h = Math.floor(healAcc); healAcc -= h; ctx.heal(p, h); }
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      if (rooted) {
        const k = Math.min(1, (time - rootedAt) / 400);
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * (0.1 + i * 0.13);
          g.lineStyle(3, HW.barkShade, 0.9); g.lineBetween(p.x, p.y + 8, p.x + Math.cos(a) * 30 * k, p.y + 8 + Math.sin(a) * 14 * k);
          g.lineStyle(1.5, HW.bark, 0.9); g.lineBetween(p.x, p.y + 8, p.x + Math.cos(a) * 30 * k, p.y + 8 + Math.sin(a) * 14 * k);
        }
      }
      const k = (time - tearAt) / 450;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          splinter(g, tearX + Math.cos(a) * 110 * k, tearY + Math.sin(a) * 70 * k, a, 14, 1 - k);
        }
      }
    },
    drawAir(g, time) {
      if (!rooted) return;
      const p = ctx.player;
      g.fillStyle(HW.heart, 0.5 + 0.2 * Math.sin(time / 200)); g.fillCircle(p.x - 20, p.y - 30, 4);
      amberBlock(g, p.x - 20, p.y - 30, 6, 0.3, time / 1000);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HEARTWOOD_ITEMS: IsleItemDef[] = [
  {
    id: 'heartwood-ring-locket',
    name: 'Ring Locket',
    emoji: '🪵',
    kind: 'charm',
    price: 240,
    flavor: 'A slice of birch twig in a silver case. Dendro swears it is still growing. It is, slowly, if you hold it.',
    script: 'heartwood-ring-locket',
    scriptText: [
      'Every 7s of fight lays down a ring (max 5).',
      'Cast F to spend them: every other ability you have used comes back 0.6s sooner per ring.',
    ],
    isle: 'life',
  },
  {
    id: 'heartwood-beak',
    name: 'Woodpecker\'s Beak',
    emoji: '🪶',
    kind: 'charm',
    price: 380,
    flavor: 'A chisel of a bill, shed by one of Pike\'s drummers and set in brass. It taps in your pocket when you walk.',
    script: 'heartwood-beak',
    scriptText: [
      'Land hits in a steady beat (0.35–1.2s apart) to build a count.',
      'On the 4th beat in time the foe is split for 14. Miss the beat and the count resets.',
    ],
    effect: { critChance: 0.02 },
    isle: 'life',
  },
  {
    id: 'heartwood-leaf-cloak',
    name: 'Leaf-Drift Cloak',
    emoji: '🍂',
    kind: 'charm',
    price: 520,
    flavor: 'A cape Russet\'s wind won\'t lift. Leaves settle on it whether there are any falling or not.',
    script: 'heartwood-leaf-cloak',
    scriptText: [
      'While unhit, a leaf settles on you every 1.2s (max 6).',
      'The next hit scatters them: heal 7% of it per leaf, and a nearby foe is buffeted for 2 per leaf.',
    ],
    effect: { maxHp: 8 },
    isle: 'life',
  },
  {
    id: 'heartwood-termite-jar',
    name: 'Termite Jar',
    emoji: '🫙',
    kind: 'charm',
    price: 690,
    flavor: 'Mandible\'s termites in a corked jar. Do not uncork it near furniture. Or houses. Or the tree.',
    script: 'heartwood-termite-jar',
    scriptText: [
      'Each hit plants a bite on the foe (max 5, fade after 5s idle); each bite chews 1 damage a second.',
      'Hit a foe carrying 5 bites and it is eaten through: 22 damage, bites spent.',
    ],
    isle: 'life',
  },
  {
    id: 'art-birchbark',
    name: 'Birchbark\'s Heartwood',
    emoji: '🌳',
    kind: 'artifact',
    flavor: 'A fist of the Still Prince\'s own heart, red as a coal and as warm. It wants to put down roots.',
    effect: { maxHp: 25, damageTakenMult: 0.95 },
    script: 'art-birchbark',
    scriptText: [
      'Stand still 0.8s to take root: +25% damage and 3 health a second while rooted.',
      'Move and the roots tear free: a foe within 130px takes 12 (once every 4s).',
    ],
    isle: 'life',
  },
  {
    id: 'fish-sapling-trout',
    name: 'Sapling Trout',
    emoji: '🐟',
    kind: 'fish',
    sell: 45,
    flavor: 'A slim trout speckled gold like a birch leaf. The root-pool water makes it taste faintly of sap. Quickens the step.',
    effect: { speedMult: 1.04 },
    isle: 'life',
  },
  {
    id: 'fish-rootworm-chub',
    name: 'Rootworm Chub',
    emoji: '🐠',
    kind: 'fish',
    sell: 70,
    flavor: 'A fat chub that lives on the worms in the Heartwood\'s roots. Stodgy. You feel it mending you for an hour.',
    effect: { regenPerSecond: 0.6 },
    isle: 'life',
  },
  {
    id: 'fish-amber-carp',
    name: 'Amber Carp',
    emoji: '🐡',
    kind: 'fish',
    sell: 140,
    flavor: 'An old carp with scales gone hard and gold as amber. Weighs like amber too, which some weighers find convenient.',
    effect: { shieldHp: 14 },
    isle: 'life',
  },
];

export const HEARTWOOD_SCRIPTS: Record<string, ItemScriptFactory> = {
  'heartwood-ring-locket': ringLocket,
  'heartwood-beak': beak,
  'heartwood-leaf-cloak': leafCloak,
  'heartwood-termite-jar': termiteJar,
  'art-birchbark': birchbarkHeart,
};

export const HEARTWOOD_SHOPS: ShopDef[] = [
  {
    id: 'heartwood-shop',
    name: 'The Burl',
    stock: ['heartwood-ring-locket', 'heartwood-beak', 'heartwood-leaf-cloak', 'heartwood-termite-jar'],
    buys: true,
  },
];

export const HEARTWOOD_FISHERIES: FisheryDef[] = [
  { id: 'heartwood-pool', name: 'The Root Pool', kind: 'pond' },
];

export const HEARTWOOD_FISH: FishDef[] = [
  { id: 'fish-sapling-trout', fisheries: ['heartwood-pool'], weight: 50, fight: 2, size: [18, 40] },
  { id: 'fish-rootworm-chub', fisheries: ['heartwood-pool'], weight: 34, fight: 3, size: [25, 55] },
  { id: 'fish-amber-carp', fisheries: ['heartwood-pool'], weight: 16, fight: 4, size: [40, 90] },
];
