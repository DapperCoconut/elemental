import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { crystalPoint, cutGem, piezoPlate } from './art';
import { AMETHYST_LIT, BRASS, BRASS_DARK, FACET_LIT, FLAW, QUARTZ_LIT, SPECTRUM } from './palette';
import { alive, clamp, dist, segDist, wrapAngle } from './util';

/**
 * The Geode Court's goods: Opaline Grist's four charms, Prince Facet's table stone, and the
 * crystal pool's two fish. Every charm is a lapidary's tool that plays one of the court's own
 * rules in your favour — the loupe that finds a flaw, the prism that splits a cast, the fork that
 * rings when struck, the tourmaline that sparks when squeezed. Scripts are registered below
 * under their item ids.
 */

const ISLE = 'earth';

export const CHARM_LOUPE = 'geode-charm-loupe';
export const CHARM_PRISM = 'geode-charm-pocket-prism';
export const CHARM_FORK = 'geode-charm-tuning-fork';
export const CHARM_ANKLET = 'geode-charm-piezo-anklet';
export const ART_FACET = 'art-facet';

export const FISH_TETRA = 'fish-amethyst-tetra';
export const FISH_PIKE = 'fish-quartz-pike';
export const FISHERY = 'geode-pool';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Jeweller's Loupe ─────────────────────────────────────────────────
// Every few seconds the loupe finds a flaw on your foe: a glint at one point round their edge.
// Land a hit while you stand on that side of them (within ~40°) and you crack it.

const loupe: ItemScriptFactory = (ctx) => {
  const LIFE = 4000, GAP = 1800;
  let flawA = 0, flawUntil = 0, nextAt = -1, crackFx = 0;
  const bearing = () => Math.atan2(ctx.player.y - ctx.npc.y, ctx.player.x - ctx.npc.x);
  return {
    update(time) {
      if (nextAt < 0) nextAt = time + 1500;
      if (time >= nextAt && time >= flawUntil) {
        flawA = ctx.rng() * Math.PI * 2;
        flawUntil = time + LIFE;
        nextAt = time + LIFE + GAP;
      }
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || now >= flawUntil || !foeLive(ctx) || !live(ctx)) return;
      if (Math.abs(wrapAngle(bearing() - flawA)) > 0.7) return;
      flawUntil = 0;
      crackFx = now;
      ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'FLAW FOUND', '#ffd070');
      ctx.sfx('crystal-shatter');
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      if (time < flawUntil) {
        const fx = n.x + Math.cos(flawA) * 30, fy = n.y - 10 + Math.sin(flawA) * 24;
        const on = live(ctx) && Math.abs(wrapAngle(bearing() - flawA)) <= 0.7;
        const tw = 0.6 + Math.sin(time / 80) * 0.4;
        glow(g, fx, fy, 12, FLAW, 0.06 + (on ? 0.08 : 0), 2);
        g.lineStyle(on ? 2.5 : 1.5, FLAW, tw);
        g.lineBetween(fx - 6, fy - 5, fx + 1, fy); g.lineBetween(fx + 1, fy, fx - 2, fy + 6); g.lineBetween(fx + 1, fy, fx + 6, fy - 2);
        // The side to strike from: a faint wedge on the floor.
        g.lineStyle(1, FLAW, on ? 0.45 : 0.18);
        for (const k of [-0.7, 0.7]) g.lineBetween(n.x + Math.cos(flawA + k) * 40, n.y + Math.sin(flawA + k) * 30, n.x + Math.cos(flawA + k) * 120, n.y + Math.sin(flawA + k) * 90);
      }
      if (time - crackFx < 500) {
        const k = (time - crackFx) / 500;
        for (let i = 0; i < 7; i++) crystalPoint(g, n.x + Math.cos(i * 0.9) * k * 40, n.y - 20 + Math.sin(i * 0.9) * k * 30, 3, 8, i * 0.9 + Math.PI / 2, FLAW, 1 - k);
      }
    },
  };
};

// ── Pocket Prism ─────────────────────────────────────────────────────
// Every 4th ability you cast is split: three coloured rays fan out from you toward the foe. Each
// ray that finds them burns for 6. Close in, and the fan is narrow enough for all three to land.

const prism: ItemScriptFactory = (ctx) => {
  const EVERY = 4, SPREAD = 0.24, RANGE = 560;
  let casts = 0;
  let fx: { at: number; x: number; y: number; a: number; hits: boolean[] } | null = null;
  return {
    onCast() {
      if (!live(ctx) || !foeLive(ctx)) return;
      casts++;
      if (casts % EVERY) return;
      const p = ctx.player, n = ctx.npc;
      const a = Math.atan2(n.y - p.y, n.x - p.x);
      const hits = [-1, 0, 1].map((k) => {
        const b = a + k * SPREAD;
        const ex = p.x + Math.cos(b) * RANGE, ey = p.y + Math.sin(b) * RANGE;
        return segDist(n.x, n.y, p.x, p.y, ex, ey) < 34;
      });
      hits.forEach((h) => { if (h) ctx.hit(n, 6, n.x, n.y - 10); });
      fx = { at: ctx.scene.time.now, x: p.x, y: p.y, a, hits };
      ctx.sfx('prism');
    },
    drawAir(g, time) {
      // A pip per cast toward the split, by your shoulder.
      if (live(ctx)) {
        const p = ctx.player;
        for (let i = 0; i < EVERY - 1; i++) {
          g.fillStyle(i < casts % EVERY ? SPECTRUM[i * 2] : 0x000000, i < casts % EVERY ? 0.9 : 0.3);
          g.fillTriangle(p.x + 22 + i * 7, p.y - 40, p.x + 25 + i * 7, p.y - 46, p.x + 28 + i * 7, p.y - 40);
        }
      }
      if (!fx || time - fx.at > 380) return;
      const k = (time - fx.at) / 380;
      [-1, 0, 1].forEach((m, i) => {
        const b = fx!.a + m * SPREAD;
        const c = SPECTRUM[[0, 3, 5][i]];
        g.lineStyle(fx!.hits[i] ? 6 : 3, c, (1 - k) * 0.8);
        g.lineBetween(fx!.x, fx!.y - 10, fx!.x + Math.cos(b) * RANGE, fx!.y - 10 + Math.sin(b) * RANGE);
      });
    },
  };
};

// ── Tuner's Fork ─────────────────────────────────────────────────────
// Each blow you take strikes a note on the fork (three at most). With three, the fork rings out
// the moment your foe comes within reach: 18 to them, 8 back to you, and the notes are spent.

const fork: ItemScriptFactory = (ctx) => {
  const REACH = 150;
  let notes = 0, ringFx = 0, lastNote = 0;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || notes >= 3 || now - lastNote < 400) return;
      notes++;
      lastNote = now;
      ctx.sfx('crystal-chime');
    },
    update(time) {
      if (notes < 3 || !live(ctx) || !foeLive(ctx)) return;
      if (dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) > REACH) return;
      notes = 0;
      ringFx = time;
      ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y - 20);
      ctx.heal(ctx.player, 8);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'THE FORK RINGS', '#e8f0ff');
      ctx.sfx('sonic-pulse');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (notes >= 3) { g.lineStyle(1.5, QUARTZ_LIT, 0.25 + Math.sin(time / 120) * 0.12); g.strokeCircle(p.x, p.y, REACH); }
      if (time - ringFx < 600) {
        const k = (time - ringFx) / 600;
        for (let i = 0; i < 3; i++) { g.lineStyle(3 * (1 - k), QUARTZ_LIT, 1 - k); g.strokeCircle(p.x, p.y, REACH * (0.3 + k * 0.8) + i * 14); }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 28, y = p.y - 36;
      const wob = notes >= 3 ? Math.sin(time / 25) * 1.2 : 0;
      g.lineStyle(2.5, BRASS, 1);
      g.lineBetween(x, y + 10, x, y); g.lineBetween(x + wob, y, x - 4 + wob, y - 12); g.lineBetween(x - wob, y, x + 4 - wob, y - 12);
      for (let i = 0; i < 3; i++) { g.fillStyle(i < notes ? QUARTZ_LIT : BRASS_DARK, i < notes ? 1 : 0.5); g.fillCircle(x + 8, y - 8 + i * 6, 2); }
    },
  };
};

// ── Piezo Anklet ─────────────────────────────────────────────────────
// A band of tourmaline at your ankle: every stride squeezes it. Each 700px you walk stores a
// spark (three at most); each hit you land spends one in an arc for 8 more.

const anklet: ItemScriptFactory = (ctx) => {
  const STRIDE = 700;
  let walked = 0, sparks = 0, lastX = NaN, lastY = NaN, arcFx = 0, boostAt = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!Number.isNaN(lastX)) {
        const d = Math.min(30, dist(lastX, lastY, p.x, p.y));
        if (sparks < 3) { walked += d; if (walked >= STRIDE) { walked -= STRIDE; sparks++; ctx.sfx('electric-charge'); } }
      }
      lastX = p.x; lastY = p.y;
      if (sparks >= 3 && time >= boostAt) { ctx.boostSpeed(1.08, 300); boostAt = time + 300; }
    },
    onHitDealt(amount) {
      if (amount < 2 || sparks <= 0 || !foeLive(ctx)) return;
      sparks--;
      arcFx = ctx.scene.time.now;
      ctx.hit(ctx.npc, 8, ctx.npc.x, ctx.npc.y - 20);
      ctx.sfx('zap');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      piezoPlate(g, p.x, p.y + 14, 9, sparks / 3, time / 1000);
      g.lineStyle(2, 0xbff4ff, 0.6);
      g.beginPath(); g.arc(p.x, p.y + 14, 13, -Math.PI / 2, -Math.PI / 2 + (sparks >= 3 ? 1 : walked / STRIDE) * Math.PI * 2, false); g.strokePath();
    },
    drawAir(g, time) {
      if (!live(ctx) || !foeLive(ctx) || time - arcFx > 200) return;
      const p = ctx.player, n = ctx.npc;
      const pts = [{ x: p.x, y: p.y + 10 }];
      for (let i = 1; i < 6; i++) pts.push({ x: p.x + (n.x - p.x) * (i / 6) + Math.sin(time / 15 + i) * 9, y: p.y + 10 + (n.y - 20 - p.y - 10) * (i / 6) + Math.cos(time / 19 + i) * 9 });
      pts.push({ x: n.x, y: n.y - 20 });
      g.lineStyle(5, 0x7fe0ff, 0.35); g.strokePoints(pts, false);
      g.lineStyle(2, 0xffffff, 0.9); g.strokePoints(pts, false);
    },
  };
};

// ── Facet's Table ────────────────────────────────────────────────────
// The table facet of the Prince's own crown stone. Once every 9s, the first blow you take is
// caught on it and thrown back as a beam (60% of the blow, at least 8) and you take half of it
// back as health. Go 6s unhit and the table polishes: your next hit lands 12 harder.

const table: ItemScriptFactory = (ctx) => {
  const GUARD_MS = 9000, POLISH_MS = 6000;
  let readyAt = 0, lastHurt = 0, beamFx = 0, beamFrom = { x: 0, y: 0 };
  const polished = (now: number) => now - lastHurt >= POLISH_MS;
  return {
    update(time) {
      if (lastHurt === 0) lastHurt = time;
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      lastHurt = now;
      if (amount < 1 || now < readyAt || !foeLive(ctx) || !live(ctx)) return;
      readyAt = now + GUARD_MS;
      ctx.hit(ctx.npc, Math.max(8, Math.round(amount * 0.6)), ctx.npc.x, ctx.npc.y - 20);
      ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.5)));
      beamFx = now; beamFrom = { x: ctx.player.x, y: ctx.player.y };
      ctx.float(ctx.player.x, ctx.player.y - 56, 'CAUGHT ON THE TABLE', '#e8e0ff');
      ctx.sfx('light-beam');
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || !polished(now) || !foeLive(ctx)) return;
      lastHurt = now - POLISH_MS + 1500;
      ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'POLISHED', '#e8e0ff');
      ctx.sfx('sparkle');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      const x = p.x + 26, y = p.y - 38;
      if (polished(time)) glow(g, x, y, 16, FACET_LIT, 0.06 + Math.sin(time / 140) * 0.03, 2);
      cutGem(g, x, y, 7, ready ? FACET_LIT : 0x6a6a80, ready ? 1 : 0.6);
      if (!ready) {
        const k = clamp(1 - (readyAt - time) / GUARD_MS, 0, 1);
        g.lineStyle(1.5, AMETHYST_LIT, 0.7); g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      if (foeLive(ctx) && time - beamFx < 300) {
        const k = (time - beamFx) / 300;
        g.lineStyle(10 * (1 - k), FACET_LIT, 0.5 * (1 - k)); g.lineBetween(beamFrom.x, beamFrom.y - 20, ctx.npc.x, ctx.npc.y - 20);
        g.lineStyle(3 * (1 - k), 0xffffff, 1 - k); g.lineBetween(beamFrom.x, beamFrom.y - 20, ctx.npc.x, ctx.npc.y - 20);
      }
    },
  };
};

export const GEODE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_LOUPE, name: 'Jeweller\'s Loupe', emoji: '🔍', kind: 'charm', price: 340, isle: ISLE,
    flavor: 'A ten-power loupe in a horn barrel, polished by a thumb for sixty years. It finds what is wrong with anything.',
    script: CHARM_LOUPE,
    scriptText: [
      'Every few seconds a flaw glints on one side of your foe for 4s.',
      'Land a hit from that side (within about 40°) to crack it: 16 extra damage.',
    ],
  },
  {
    id: CHARM_PRISM, name: 'Pocket Prism', emoji: '🔺', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A thumb-long prism off a lapidary\'s offcut tray. Hold it up to the crack at noon and the floor goes rainbow.',
    script: CHARM_PRISM,
    scriptText: [
      'Every 4th ability you cast splits into three coloured rays fanned at your foe.',
      'Each ray that touches them burns for 6 — up close, all three land.',
    ],
  },
  {
    id: CHARM_FORK, name: 'Tuner\'s Fork', emoji: '🎼', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A brass fork tuned to the Chime Garden\'s lowest rod. Strike it on your knee and the teeth ache.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_FORK,
    scriptText: [
      'Each hit you take strikes a note on the fork (up to 3).',
      'With 3 notes, it rings when your foe comes within 150px: 18 damage to them, heal 8.',
    ],
  },
  {
    id: CHARM_ANKLET, name: 'Piezo Anklet', emoji: '⚡', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'A ring of watermelon tourmaline on a copper band. The plate-stampers wear them on long shifts. They tingle.',
    effect: { speedMult: 1.03 },
    script: CHARM_ANKLET,
    scriptText: [
      'Every 700px you walk stores a spark (up to 3); with all 3 stored you move 8% faster.',
      'Each hit you land spends a spark in an arc for 8 extra damage.',
    ],
  },
  {
    id: ART_FACET, name: 'Facet\'s Table', emoji: '💎', kind: 'artifact', isle: ISLE,
    flavor: 'The flat top facet of the Prince\'s crown stone, cut free. It has a hairline crack. He never let anyone see.',
    effect: { maxHp: 14 },
    script: ART_FACET,
    scriptText: [
      'Once every 9s, the first hit you take is caught on the table and thrown back:',
      'the foe takes 60% of it (at least 8), and you heal half of it.',
      'Go 6s without being hit and the table polishes: your next hit deals 12 extra.',
    ],
  },
  {
    id: FISH_TETRA, name: 'Amethyst Tetra', emoji: '🐟', kind: 'fish', sell: 14, isle: ISLE,
    flavor: 'A finger-long fish that glows faint violet in the dark. Households with no lamp oil keep one in a jar.',
    effect: { cooldownMult: 0.98 },
  },
  {
    id: FISH_PIKE, name: 'Quartz Pike', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'Clear as the pool it hunts in — you see its bones, and its last meal. It lies still among the points.',
    effect: { critChance: 0.03 },
  },
];

export const GEODE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_LOUPE]: loupe,
  [CHARM_PRISM]: prism,
  [CHARM_FORK]: fork,
  [CHARM_ANKLET]: anklet,
  [ART_FACET]: table,
};

export const GEODE_SHOPS: ShopDef[] = [
  { id: 'geode-shop', name: 'Grist\'s Settings & Sundries', stock: [CHARM_LOUPE, CHARM_PRISM, CHARM_FORK, CHARM_ANKLET], buys: true },
];

export const GEODE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Crystal Pool', kind: 'pond' }];

export const GEODE_FISH: FishDef[] = [
  { id: FISH_TETRA, fisheries: [FISHERY], weight: 6, fight: 2, size: [4, 11] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 2, fight: 4, size: [30, 72] },
];
