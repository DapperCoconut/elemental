import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { dim } from '../../../../art/IsleArt';
import {
  CHALK, HEMP, HEMP_DARK, HEM_GOLD, QUEEN, RED_THREAD, STEEL, TAN_SAIL,
  chalkLine, dist, needle, polyline, rope, stitches,
} from './art';

/**
 * The Sailmaker's goods: the four charms Madam Selvedge sells, Prince Hem's artifact, and the
 * cove's two fish. Every charm and the artifact runs a bespoke script (registered below under its
 * own id); `scriptText` is what the inventory prints for it. The court has no bakery — its fish
 * go down to the Brine Oven in Brinehollow and the Low-Tide Larder in Tidewater.
 */

const ISLE = 'water';

// ── Ids ──────────────────────────────────────────────────────────────

export const CHARM_PALM = 'sailmaker-sailmakers-palm';
export const CHARM_FIST = 'sailmaker-monkeys-fist';
export const CHARM_TELLTALE = 'sailmaker-telltale-ribbon';
export const CHARM_NEEDLE = 'sailmaker-shroud-needle';
export const ART_HEM = 'art-hem';

export const FISH_BASS = 'fish-sailfin-bass';
export const FISH_GAR = 'fish-rope-gar';
export const FISHERY = 'sailmaker-cove';

// ── Item defs ────────────────────────────────────────────────────────

export const SAILMAKER_ITEMS: IsleItemDef[] = [
  // Charms.
  {
    id: CHARM_PALM, name: 'Sailmaker\'s Palm', emoji: '🧤', kind: 'charm', price: 190, isle: ISLE,
    flavor: 'A leather strap with an iron boss in the heel, for driving a needle through nine layers of canvas.',
    script: CHARM_PALM,
    scriptText: [
      'Hits you land within 1.2s of each other run a seam: one stitch each, up to 6.',
      'Stop for 1.2s and the seam pulls tight — 3 damage to the foe for every stitch in it.',
    ],
  },
  {
    id: CHARM_FIST, name: 'Monkey\'s Fist', emoji: '🪢', kind: 'charm', price: 280, isle: ISLE,
    flavor: 'A heaving-line knot wound round a lead ball. Deckhands throw them ashore. Deckhands are good at throwing.',
    script: CHARM_FIST,
    scriptText: [
      'Every 7s, if the foe is 150–460px away, you heave a line at where they stand.',
      'The knot lands 0.9s later (its mark shows): 12 damage if they are still under it.',
    ],
  },
  {
    id: CHARM_TELLTALE, name: 'Telltale Ribbon', emoji: '🎀', kind: 'charm', price: 380, isle: ISLE,
    flavor: 'A strip of red wool tied to a shroud to show the wind. Riggers swear by it. Riggers swear by everything.',
    effect: { speedMult: 1.03 },
    script: CHARM_TELLTALE,
    scriptText: [
      'Run one way for 0.6s, then turn hard about (more than 120°): you tack and catch the wind.',
      'A tack gives +22% speed for 1.4s, and the next ability you cast within 1.5s gets 1.2s back.',
      'Tacks at most once every 3s.',
    ],
  },
  {
    id: CHARM_NEEDLE, name: 'Shroud Needle', emoji: '🪡', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'The needle a sailmaker keeps for the last stitch of a burial. Nobody likes to be handed it.',
    script: CHARM_NEEDLE,
    scriptText: [
      'Every 10th hit you land is the Last Stitch:',
      'it deals bonus damage equal to 8% of the foe\'s missing health (at least 4).',
    ],
  },

  // Artifact.
  {
    id: ART_HEM, name: 'Hem\'s Selvedge', emoji: '🧵', kind: 'artifact', isle: ISLE,
    flavor: 'A strip of the Prince\'s own velvet, cut along the self-finished edge. Selvedge never frays. He did.',
    effect: { maxHp: 12 },
    script: ART_HEM,
    scriptText: [
      'Cut to Pattern: every 10s a chalk pattern is drawn round the foe; 1.8s later the shears close it —',
      '14 damage if they are still inside.',
      'Unravel: each hit you take loosens a thread (up to 5). At 5 you come unravelled into ribbons —',
      '+30% damage and +20% speed for 4s — and the threads reset.',
    ],
  },

  // Fish.
  {
    id: FISH_BASS, name: 'Sailfin Bass', emoji: '🐟', kind: 'fish', sell: 18, isle: ISLE,
    flavor: 'A cove bass whose dorsal fin stands up like a reefed sail. It runs before the wind, and so do you.',
    effect: { speedMult: 1.04 },
  },
  {
    id: FISH_GAR, name: 'Rope-Gar', emoji: '🐠', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A long thin gar with scales laid in a spiral like rope. Netmenders use its spine as a needle.',
    effect: { regenPerSecond: 0.35 },
  },
];

// ── Scripts ──────────────────────────────────────────────────────────

/** Sailmaker's Palm — a seam of hits that pulls tight when you pause. */
const palm: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let stitchesRun = 0;
  let lastHit = -9999;
  let pulledAt = -9999;
  let pulledCount = 0;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - lastHit > 1200) stitchesRun = 0;
      lastHit = now;
      stitchesRun = Math.min(6, stitchesRun + 1);
    },
    update(time) {
      if (stitchesRun > 0 && time - lastHit >= 1200) {
        const n = ctx.npc;
        if (n.active && n.hp > 0) {
          ctx.hit(n, stitchesRun * 3, n.x, n.y);
          ctx.float(n.x, n.y - 50, `SEAM ×${stitchesRun}`, '#ffd0a0');
          ctx.sfx('whip');
        }
        pulledAt = time; pulledCount = stitchesRun;
        stitchesRun = 0;
      }
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      // The seam as it is sewn: a dashed red line from you toward the foe, one dash per stitch.
      if (stitchesRun > 0) {
        const len = Math.min(dist(p.x, p.y, n.x, n.y), 26 + stitchesRun * 14);
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        stitches(g, p.x, p.y - 10, p.x + Math.cos(a) * len, p.y - 10 + Math.sin(a) * len, RED_THREAD, 2.2, 8, 6, 0.9);
        for (let i = 0; i < 6; i++) {
          g.fillStyle(i < stitchesRun ? RED_THREAD : 0x3a2a2a, i < stitchesRun ? 1 : 0.5);
          g.fillRect(p.x - 17 + i * 6, p.y - 48, 4, 4);
        }
      }
      // The pull: a taut red thread snapping between you, fading.
      const k = (time - pulledAt) / 400;
      if (k >= 0 && k < 1 && pulledCount > 0) {
        g.lineStyle(2 + pulledCount * 0.5, RED_THREAD, 0.9 * (1 - k)); g.lineBetween(p.x, p.y - 10, n.x, n.y - 10);
      }
    },
  };
};

/** Monkey's Fist — a heaving line lobbed at the foe on a clock. */
const monkeysFist: ItemScriptFactory = (ctx) => {
  interface Throw { sx: number; sy: number; tx: number; ty: number; at: number; landAt: number }
  let throws: Throw[] = [];
  let nextAt = 3000;
  let thudAt = -9999, thudX = 0, thudY = 0;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (time >= nextAt) {
        const d = dist(p.x, p.y, n.x, n.y);
        if (n.active && n.hp > 0 && d >= 150 && d <= 460) {
          throws.push({ sx: p.x, sy: p.y - 20, tx: n.x, ty: n.y + 10, at: time, landAt: time + 900 });
          ctx.sfx('whoosh');
          nextAt = time + 7000;
        } else {
          nextAt = time + 500;
        }
      }
      for (const th of throws) {
        if (time < th.landAt) continue;
        ctx.sfx('hit-medium');
        thudAt = time; thudX = th.tx; thudY = th.ty;
        if (n.active && n.hp > 0 && dist(th.tx, th.ty, n.x, n.y + 10) < 46) {
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 50, 'HEAVE!', '#e8c890');
        }
      }
      throws = throws.filter((th) => time < th.landAt);
    },
    drawGround(g, time) {
      for (const th of throws) {
        const k = (time - th.at) / (th.landAt - th.at);
        g.lineStyle(2, HEMP, 0.4 + 0.5 * k); g.strokeCircle(th.tx, th.ty, 46 * (1.2 - k * 0.2));
        g.fillStyle(0x000000, 0.1 + k * 0.2); g.fillEllipse(th.tx, th.ty, 30 * k + 8, 12 * k + 4);
      }
      const k = (time - thudAt) / 400;
      if (k >= 0 && k < 1) { g.lineStyle(3 * (1 - k), HEMP, 0.8 * (1 - k)); g.strokeCircle(thudX, thudY, 20 + k * 40); }
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (const th of throws) {
        const k = (time - th.at) / (th.landAt - th.at);
        const x = th.sx + (th.tx - th.sx) * k, y = th.sy + (th.ty - th.sy) * k - Math.sin(k * Math.PI) * 120;
        // The heaving line paying out behind the knot.
        const mid = { x: (p.x + x) / 2, y: (p.y + y) / 2 - Math.sin(k * Math.PI) * 50 };
        polyline(g, [{ x: p.x, y: p.y - 10 }, mid, { x, y }], 1.4, HEMP_DARK, 0.85);
        // The knot: a ball of turns.
        g.fillStyle(dim(HEMP, 0.4), 1); g.fillCircle(x + 1, y + 1, 7);
        g.fillStyle(HEMP, 1); g.fillCircle(x, y, 6.5);
        g.lineStyle(1, HEMP_DARK, 0.9);
        for (let i = 0; i < 3; i++) { const a = time / 80 + i * 1.05; g.lineBetween(x - Math.cos(a) * 6, y - Math.sin(a) * 6, x + Math.cos(a) * 6, y + Math.sin(a) * 6); }
      }
    },
  };
};

/** Telltale Ribbon — turning hard about catches the wind. */
const telltale: ItemScriptFactory = (ctx) => {
  let lastX = ctx.player.x, lastY = ctx.player.y;
  let heading = 0;
  let runFor = 0;
  let lockedUntil = 0;
  let armedUntil = 0;
  let tackAt = -9999;
  let ribbonA = 0;
  return {
    update(time, dt) {
      const p = ctx.player;
      const dx = p.x - lastX, dy = p.y - lastY;
      lastX = p.x; lastY = p.y;
      const sp = Math.hypot(dx, dy) / Math.max(0.001, dt);
      if (sp < 60) { runFor = Math.max(0, runFor - dt * 2); return; }
      const a = Math.atan2(dy, dx);
      const turn = Math.abs(Math.atan2(Math.sin(a - heading), Math.cos(a - heading)));
      if (turn > (120 * Math.PI) / 180 && runFor >= 0.6 && time >= lockedUntil) {
        lockedUntil = time + 3000;
        armedUntil = time + 1500;
        tackAt = time;
        ctx.boostSpeed(1.22, 1400);
        ctx.float(p.x, p.y - 50, 'TACK!', '#ff9a9a');
        ctx.sfx('gust');
        runFor = 0;
      } else if (turn < 0.5) {
        runFor += dt;
      } else {
        runFor = Math.max(0, runFor - dt);
      }
      heading = Math.atan2(Math.sin(heading) * 0.7 + Math.sin(a) * 0.3, Math.cos(heading) * 0.7 + Math.cos(a) * 0.3);
      // The ribbon streams behind you.
      ribbonA = Math.atan2(Math.sin(ribbonA) * 0.85 + Math.sin(a + Math.PI) * 0.15, Math.cos(ribbonA) * 0.85 + Math.cos(a + Math.PI) * 0.15);
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now >= armedUntil) return;
      armedUntil = 0;
      ctx.refund(abilityId, 1200);
      ctx.float(ctx.player.x, ctx.player.y - 60, 'FULL AND BY', '#ffd0a0');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const bx = p.x + 12, by = p.y - 34;
      const len = 18 + Math.min(1, runFor / 0.6) * 10;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const f = k / 6;
        pts.push({ x: bx + Math.cos(ribbonA) * len * f + Math.sin(time / 60 + k) * 2 * f, y: by + Math.sin(ribbonA) * len * f + Math.cos(time / 70 + k) * 2 * f });
      }
      polyline(g, pts, 3, RED_THREAD, 0.95);
      const k = (time - tackAt) / 500;
      if (k >= 0 && k < 1) { g.lineStyle(2, 0xffffff, 0.6 * (1 - k)); g.strokeCircle(p.x, p.y, 26 + k * 30); }
      if (time < armedUntil) { g.fillStyle(0xffd0a0, 0.6 + 0.3 * Math.sin(time / 60)); g.fillCircle(bx, by, 3); }
    },
  };
};

/** Shroud Needle — every tenth hit is the last stitch. */
const shroudNeedle: ItemScriptFactory = (ctx) => {
  let hits = 0;
  let stitchAt = -9999;
  return {
    onHitDealt() {
      hits++;
      if (hits % 10 !== 0) return;
      const n = ctx.npc;
      if (!n.active || n.hp <= 0) return;
      const bonus = Math.max(4, Math.round((n.maxHp - n.hp) * 0.08));
      ctx.hit(n, bonus, n.x, n.y);
      ctx.float(n.x, n.y - 56, `LAST STITCH ${bonus}`, '#f2efe4');
      ctx.sfx('stab');
      stitchAt = ctx.scene.time.now;
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      // Ten pips round a ring at your shoulder.
      const cx = p.x - 24, cy = p.y - 40;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        g.fillStyle(i < hits % 10 ? CHALK : 0x2a2a30, i < hits % 10 ? 0.95 : 0.5);
        g.fillCircle(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 1.6);
      }
      const k = (time - stitchAt) / 600;
      if (k >= 0 && k < 1) {
        needle(g, n.x + 4, n.y - 20 - (1 - k) * 30, Math.PI / 2 + 0.2, 34, 1 - k * 0.6);
        g.lineStyle(1.5, RED_THREAD, 1 - k); g.lineBetween(n.x + 4, n.y - 50 - (1 - k) * 30, n.x + 18, n.y - 80);
      }
    },
  };
};

/** Hem's Selvedge — a pattern cut round the foe on a clock; unravel after five hits taken. */
const selvedge: ItemScriptFactory = (ctx) => {
  let nextCut = 5000;
  let cut: { x: number; y: number; at: number; closeAt: number; rot: number } | null = null;
  let threads = 0;
  let unravelUntil = 0;
  let snipAt = -9999;
  return {
    update(time) {
      const n = ctx.npc;
      if (!cut && time >= nextCut && n.active && n.hp > 0) {
        cut = { x: n.x, y: n.y + 6, at: time, closeAt: time + 1800, rot: ctx.rng() * Math.PI };
        nextCut = time + 10000;
        ctx.sfx('trap-set');
      }
      if (cut && time >= cut.closeAt) {
        ctx.sfx('slash');
        snipAt = time;
        if (n.active && n.hp > 0 && dist(cut.x, cut.y, n.x, n.y + 6) < 70) {
          ctx.hit(n, 14, n.x, n.y);
          ctx.float(n.x, n.y - 54, 'CUT TO PATTERN', '#f2efe4');
        }
        cut = null;
      }
    },
    onHitTaken() {
      const now = ctx.scene.time.now;
      if (now < unravelUntil) return;
      threads++;
      if (threads >= 5) {
        threads = 0;
        unravelUntil = now + 4000;
        ctx.boostDamage(1.3, 4000);
        ctx.boostSpeed(1.2, 4000);
        ctx.float(ctx.player.x, ctx.player.y - 58, 'UNRAVELLED', '#e2b64a');
        ctx.sfx('wings');
      }
    },
    drawGround(g, time) {
      if (cut) {
        const k = (time - cut.at) / (cut.closeAt - cut.at);
        const sides = 7;
        for (let i = 0; i < sides; i++) {
          if (i / sides > k * 1.6) break;
          const a0 = cut.rot + (i / sides) * Math.PI * 2, a1 = cut.rot + ((i + 1) / sides) * Math.PI * 2;
          const r0 = 70 * (i % 2 ? 0.82 : 1), r1 = 70 * ((i + 1) % 2 ? 0.82 : 1);
          chalkLine(g, cut.x + Math.cos(a0) * r0, cut.y + Math.sin(a0) * r0 * 0.75, cut.x + Math.cos(a1) * r1, cut.y + Math.sin(a1) * r1 * 0.75, 0.85);
        }
        if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.5); g.strokeEllipse(cut.x, cut.y, 150, 110); }
      }
      const k = (time - snipAt) / 300;
      if (k >= 0 && k < 1) { g.lineStyle(3, STEEL, 1 - k); g.strokeEllipse(ctx.npc.x, ctx.npc.y + 6, 140 * (1 - k * 0.3), 100 * (1 - k * 0.3)); }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (time < unravelUntil) {
        const cols = [HEM_GOLD, RED_THREAD, QUEEN, TAN_SAIL];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 300;
          const pts = [];
          for (let k = 0; k <= 6; k++) {
            const r = 18 + k * 5;
            pts.push({ x: p.x + Math.cos(a + Math.sin(time / 90 + k) * 0.2) * r, y: p.y - 6 + Math.sin(a + Math.sin(time / 90 + k) * 0.2) * r * 0.7 });
          }
          polyline(g, pts, 3, cols[i % cols.length], 0.9);
        }
        return;
      }
      // Loose threads hanging off you, one per hit taken.
      for (let i = 0; i < threads; i++) {
        const sx = p.x - 12 + i * 6, sy = p.y + 4;
        rope(g, [{ x: sx, y: sy }, { x: sx + Math.sin(time / 200 + i) * 4, y: sy + 10 }, { x: sx + Math.sin(time / 160 + i * 2) * 6, y: sy + 18 }], 1.2, i % 2 ? RED_THREAD : HEM_GOLD, 0.9);
      }
    },
  };
};

export const SAILMAKER_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_PALM]: palm,
  [CHARM_FIST]: monkeysFist,
  [CHARM_TELLTALE]: telltale,
  [CHARM_NEEDLE]: shroudNeedle,
  [ART_HEM]: selvedge,
};

// ── Shop and fish ────────────────────────────────────────────────────

export const SAILMAKER_SHOPS: ShopDef[] = [{
  id: 'sailmaker-shop',
  name: 'Selvedge & Daughters, Haberdashers',
  stock: [CHARM_PALM, CHARM_FIST, CHARM_TELLTALE, CHARM_NEEDLE],
  buys: true,
}];

export const SAILMAKER_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'Lowstitch Cove', kind: 'sea' }];

export const SAILMAKER_FISH: FishDef[] = [
  { id: FISH_BASS, fisheries: [FISHERY], weight: 6, fight: 2, size: [24, 48] },
  { id: FISH_GAR, fisheries: [FISHERY], weight: 3, fight: 4, size: [60, 118] },
];
