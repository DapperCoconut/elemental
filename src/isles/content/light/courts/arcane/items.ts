import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { candle, rune } from './art';
import { CHALK, FONT, FONT_RIM, GOLD, MANA, MANA_LIT, SIDE_PLAYER, VIOLET_LIT } from './palette';
import { alive, clamp, polygon } from './util';

/**
 * The Arcane Court's goods: Bellamy Thrice's four charms, Prince Sigil's chalk, and the Mana
 * Font's three rune-fish. Every charm is a scrap of the Academy's own magic that plays one of the
 * court's rules in your favour — the counter-rune, the wild surge, the five candles, the brimming
 * font. Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_RETORT = 'arcane-charm-retort-rune';
export const CHARM_SURGE = 'arcane-charm-surge-pendant';
export const CHARM_PENTACLE = 'arcane-charm-pentacle-brooch';
export const CHARM_VIAL = 'arcane-charm-font-vial';
export const ART_SIGIL = 'art-sigil';

export const FISH_TROUT = 'fish-rune-trout';
export const FISH_EEL = 'fish-hex-eel';
export const FISH_WRASSE = 'fish-wyrd-wrasse';
export const FISHERY = 'arcane-font';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Retort Rune ──────────────────────────────────────────────────────
// Taking a hit etches a counter-rune over the foe (at most every 6s). Your next cast inside 2.5s
// detonates it: 6 plus 40% of the hit you took, up to 20.

const retort: ItemScriptFactory = (ctx) => {
  let litUntil = 0;
  let readyAt = 0;
  let stored = 0;
  let boomAt = -9999;
  let idx = 0;
  return {
    onHitTaken(amount) {
      const t = ctx.scene.time.now;
      if (amount < 3 || t < readyAt || !foeLive(ctx) || !live(ctx)) return;
      readyAt = t + 6000;
      litUntil = t + 2500;
      stored = Math.min(20, 6 + Math.round(amount * 0.4));
      idx = (idx + 3) % 8;
      ctx.sfx('curse-cast');
    },
    onCast() {
      const t = ctx.scene.time.now;
      if (t >= litUntil || !foeLive(ctx)) return;
      litUntil = 0;
      boomAt = t;
      ctx.hit(ctx.npc, stored, ctx.npc.x, ctx.npc.y - 40);
      ctx.float(ctx.npc.x, ctx.npc.y - 60, 'RETORT', '#cfe8ff');
      ctx.sfx('crystal-shatter');
    },
    drawAir(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      const x = n.x, y = n.y - 64;
      if (time < litUntil) {
        const k = clamp((litUntil - time) / 2500, 0, 1);
        glow(g, x, y, 18, MANA, 0.08, 3);
        g.lineStyle(2, SIDE_PLAYER, 0.9); g.strokeCircle(x, y, 13);
        rune(g, x, y, 8, idx, MANA_LIT, 1, 2);
        g.lineStyle(2, SIDE_PLAYER, 0.7); g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      const b = (time - boomAt) / 450;
      if (b >= 0 && b < 1) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineStyle(2.5 * (1 - b), MANA_LIT, 1 - b);
          g.lineBetween(x + Math.cos(a) * (8 + b * 20), y + Math.sin(a) * (8 + b * 20), x + Math.cos(a) * (14 + b * 34), y + Math.sin(a) * (14 + b * 34));
        }
      }
    },
  };
};

// ── Surge Pendant ────────────────────────────────────────────────────
// A wild spark rides your pendant, showing which surge is next (it changes every 3s). One cast in
// five surges: green gives the spell 3s back, gold heals 6, red strikes the foe for 9, violet
// blinks you 110px along your aim.

type Surge = 'refresh' | 'mend' | 'bolt' | 'blink';
const SURGE_COLOR: Record<Surge, number> = { refresh: 0x6ae88a, mend: 0xf0c850, bolt: 0xff5a4a, blink: 0xa878f8 };

const surgePendant: ItemScriptFactory = (ctx) => {
  const kinds: Surge[] = ['refresh', 'mend', 'bolt', 'blink'];
  let next: Surge = kinds[Math.floor(ctx.rng() * 4)];
  let changeAt = 0;
  let burstAt = -9999;
  return {
    update(time) {
      if (time >= changeAt) { changeAt = time + 3000; next = kinds[Math.floor(ctx.rng() * 4)]; }
    },
    onCast(abilityId) {
      if (!live(ctx) || ctx.rng() >= 0.2) return;
      const t = ctx.scene.time.now;
      burstAt = t;
      const p = ctx.player;
      if (next === 'refresh') { ctx.refund(abilityId, 3000); ctx.float(p.x, p.y - 50, 'SURGE: REFRESH', '#6ae88a'); }
      else if (next === 'mend') { ctx.heal(p, 6); ctx.float(p.x, p.y - 50, 'SURGE: MEND', '#f0c850'); }
      else if (next === 'bolt' && foeLive(ctx)) { ctx.hit(ctx.npc, 9, ctx.npc.x, ctx.npc.y); ctx.flash(ctx.npc.x, ctx.npc.y, 0xff5a4a); ctx.float(p.x, p.y - 50, 'SURGE: BOLT', '#ff8a7a'); }
      else if (next === 'blink') { const a = ctx.facing(p); ctx.nudge(p, Math.cos(a) * 110, Math.sin(a) * 110); ctx.float(p.x, p.y - 50, 'SURGE: BLINK', '#c8a8ff'); }
      ctx.sfx('sparkle');
      changeAt = t + 3000;
      next = kinds[Math.floor(ctx.rng() * 4)];
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 16, y = p.y - 16;
      const c = SURGE_COLOR[next];
      g.lineStyle(1, GOLD, 0.8); g.lineBetween(p.x + 6, p.y - 28, x, y - 4);
      glow(g, x, y, 9, c, 0.08, 2);
      g.fillStyle(c, 1); g.fillCircle(x, y, 4);
      g.fillStyle(lit(c, 0.6), 1); g.fillCircle(x - 1, y - 1, 1.5);
      if (changeAt - time < 400 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(1, 0xffffff, 0.8); g.strokeCircle(x, y, 6); }
      const b = (time - burstAt) / 400;
      if (b >= 0 && b < 1) { g.lineStyle(2 * (1 - b), c, 1 - b); g.strokeCircle(p.x, p.y - 10, 16 + b * 36); }
    },
  };
};

// ── Pentacle Brooch ──────────────────────────────────────────────────
// Each cast with a different key from your last lights one of five candles round you; casting the
// same key twice running snuffs one. Five lit: an imp streaks to the foe and bursts for 22.

const pentacle: ItemScriptFactory = (ctx) => {
  let litCount = 0;
  let lastSlot: string | null = null;
  let impAt = -9999;
  let impFrom = { x: 0, y: 0 };
  let dealt = true;
  return {
    onCast(_abilityId, slot) {
      if (!live(ctx)) return;
      if (slot && slot === lastSlot) litCount = Math.max(0, litCount - 1);
      else litCount++;
      lastSlot = slot;
      if (litCount >= 5 && foeLive(ctx)) {
        litCount = 0;
        impAt = ctx.scene.time.now;
        impFrom = { x: ctx.player.x, y: ctx.player.y - 30 };
        dealt = false;
        ctx.sfx('portal');
      } else ctx.sfx('flame-burst');
    },
    update(time) {
      if (dealt || time - impAt < 600) return;
      dealt = true;
      if (!foeLive(ctx)) return;
      ctx.hit(ctx.npc, 22, ctx.npc.x, ctx.npc.y);
      ctx.flash(ctx.npc.x, ctx.npc.y, 0x7ae0ff);
      ctx.float(ctx.npc.x, ctx.npc.y - 54, 'IMP!', '#9ae8ff');
      ctx.sfx('explosion-small');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const pts = polygon(p.x, p.y + 6, 30, 5);
      g.lineStyle(1, CHALK, 0.35);
      for (let i = 0; i < 5; i++) { const a = pts[i], b = pts[(i + 2) % 5]; g.lineBetween(a.x, a.y, b.x, b.y); }
      for (let i = 0; i < 5; i++) {
        const on = i < litCount;
        g.fillStyle(on ? 0x7ae0ff : 0x8a8a9a, on ? 0.9 : 0.4); g.fillCircle(pts[i].x, pts[i].y, on ? 3 + Math.sin(time / 80 + i) * 0.8 : 2);
      }
    },
    drawAir(g, time) {
      if (dealt || !foeLive(ctx)) return;
      const k = clamp((time - impAt) / 600, 0, 1);
      const n = ctx.npc;
      const x = impFrom.x + (n.x - impFrom.x) * k, y = impFrom.y + (n.y - 20 - impFrom.y) * k - Math.sin(k * Math.PI) * 60;
      glow(g, x, y, 14, 0x7ae0ff, 0.1, 2);
      g.fillStyle(0x3a8ad8, 1); g.fillCircle(x, y, 7);
      g.fillTriangle(x - 5, y - 4, x - 2, y - 5, x - 6, y - 12); g.fillTriangle(x + 5, y - 4, x + 2, y - 5, x + 6, y - 12);
      g.fillStyle(0x9ae8ff, 1); g.fillCircle(x - 2, y - 1, 1.3); g.fillCircle(x + 2, y - 1, 1.3);
      candle(g, impFrom.x, impFrom.y + 30, 0.5, 0, time);
    },
  };
};

// ── Font Vial ────────────────────────────────────────────────────────
// The vial fills with the damage you deal, to 70. Full, it pours over you: every ability 3s nearer
// ready and 8 health. A heavy blow (12+) slops a quarter of it out.

const fontVial: ItemScriptFactory = (ctx) => {
  const CAP = 70;
  let fill = 0;
  let pourAt = -9999;
  return {
    onHitDealt(amount) {
      if (!live(ctx) || amount <= 0) return;
      fill += amount;
      if (fill < CAP) return;
      fill = 0;
      pourAt = ctx.scene.time.now;
      for (const a of ctx.player.element?.abilities ?? []) ctx.refund(a.id, 3000);
      ctx.heal(ctx.player, 8);
      ctx.float(ctx.player.x, ctx.player.y - 54, 'BRIMMING', '#fff4c8');
      ctx.sfx('splash');
    },
    onHitTaken(amount) {
      if (amount >= 12 && fill > 0) { fill = Math.round(fill * 0.75); ctx.sfx('bubble'); }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 20, y = p.y - 4;
      const k = clamp(fill / CAP, 0, 1);
      g.fillStyle(0xd8f0f8, 0.35); g.fillRoundedRect(x - 4, y - 14, 8, 14, 3);
      g.fillStyle(k > 0.85 ? 0xffffff : FONT, 0.95); g.fillRect(x - 3, y - 1 - 12 * k, 6, 12 * k);
      g.lineStyle(1, FONT_RIM, 0.9); g.strokeRoundedRect(x - 4, y - 14, 8, 14, 3);
      g.fillStyle(0x8a6a48, 1); g.fillRect(x - 2, y - 17, 4, 3);
      const b = (time - pourAt) / 700;
      if (b >= 0 && b < 1) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(FONT, 1 - b); g.fillCircle(p.x + Math.cos(a) * 14, p.y - 40 + b * 50 + Math.sin(a) * 4, 2.5);
        }
      }
    },
  };
};

// ── Sigil's Chalk (artifact) ─────────────────────────────────────────
// Your casts chalk a sigil round the foe, one stroke a cast. Every third cast completes it, the
// sigils going round in order: a triangle bursts under them for 16, a circle heals you 12, a
// spiral stuns them for 0.7s.

const sigilChalk: ItemScriptFactory = (ctx) => {
  const shapes = ['triangle', 'circle', 'spiral'] as const;
  let shape = 0;
  let strokes = 0;
  let doneAt = -9999;
  let doneShape = 0;
  let doneAtX = 0, doneAtY = 0;
  return {
    onCast() {
      if (!live(ctx) || !foeLive(ctx)) return;
      strokes++;
      ctx.sfx('sparkle');
      if (strokes < 3) return;
      strokes = 0;
      const n = ctx.npc;
      doneAt = ctx.scene.time.now; doneShape = shape; doneAtX = n.x; doneAtY = n.y;
      const s = shapes[shape];
      if (s === 'triangle') { ctx.hit(n, 16, n.x, n.y); ctx.flash(n.x, n.y, 0xffb040); ctx.sfx('flame-burst'); }
      else if (s === 'circle') { ctx.heal(ctx.player, 12); ctx.sfx('holy-chord'); }
      else { ctx.stun(n, 700); ctx.sfx('time-warp'); }
      ctx.float(n.x, n.y - 58, s.toUpperCase(), '#e8dcff');
      shape = (shape + 1) % 3;
    },
    drawGround(g, time) {
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      const s = shapes[shape];
      const r = 34;
      g.lineStyle(2, CHALK, 0.75);
      // The strokes laid so far of the sigil in progress.
      if (s === 'triangle') {
        const pts = polygon(n.x, n.y + 4, r, 3);
        for (let i = 0; i < strokes; i++) g.lineBetween(pts[i].x, pts[i].y, pts[(i + 1) % 3].x, pts[(i + 1) % 3].y);
      } else if (s === 'circle') {
        if (strokes > 0) { g.beginPath(); g.arc(n.x, n.y + 4, r, 0, (strokes / 3) * Math.PI * 2, false); g.strokePath(); }
      } else {
        g.beginPath();
        const steps = Math.round(strokes * 14);
        for (let i = 0; i <= steps; i++) { const t = i / 42; const a = t * Math.PI * 5, rr = r * (1 - t * 0.8); const px = n.x + Math.cos(a) * rr, py = n.y + 4 + Math.sin(a) * rr * 0.6; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
        if (steps > 0) g.strokePath();
      }
      // The completed sigil flaring.
      const k = (time - doneAt) / 600;
      if (k >= 0 && k < 1) {
        const c = [0xffb040, 0xf0e6ff, VIOLET_LIT][doneShape];
        g.lineStyle(3 * (1 - k), c, 1 - k);
        if (doneShape === 0) { const pts = polygon(doneAtX, doneAtY + 4, r + k * 20, 3); g.strokeTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y); }
        else if (doneShape === 1) g.strokeCircle(ctx.player.x, ctx.player.y, r + k * 20);
        else g.strokeCircle(doneAtX, doneAtY, r * (1 - k * 0.6));
      }
    },
  };
};

export const ARCANE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_RETORT, name: 'Retort Rune', emoji: '🔣', kind: 'charm', price: 460, isle: ISLE,
    flavor: 'A slate chip the size of a thumbnail with a counter-rune cut in it. Abjurers wear them to lectures.',
    script: CHARM_RETORT,
    scriptText: [
      'Taking a hit etches a counter-rune over your foe for 2.5s (at most every 6s).',
      'Your next cast while it glows detonates it: 6 + 40% of the hit you took (up to 20).',
    ],
  },
  {
    id: CHARM_SURGE, name: 'Surge Pendant', emoji: '🧿', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A bead of wild magic in a gold cage, picked up off Fizzle\'s lawn. It changes colour when nobody looks.',
    script: CHARM_SURGE,
    scriptText: [
      'A spark on the pendant shows the next surge (it changes every 3s). One cast in five surges:',
      'green: that spell 3s nearer ready · gold: heal 6 · red: strike the foe for 9 · violet: blink 110px.',
    ],
  },
  {
    id: CHARM_PENTACLE, name: 'Pentacle Brooch', emoji: '⭐', kind: 'charm', price: 880, isle: ISLE,
    effect: { maxHp: 6 },
    flavor: 'Five tiny candle-cups round a silver star. Evoke\'s students are given one, and told never to fill it.',
    script: CHARM_PENTACLE,
    scriptText: [
      'Each cast on a different key from your last lights a candle; the same key twice snuffs one.',
      'Five lit: an imp streaks to your foe and bursts for 22. Then the candles start again.',
    ],
  },
  {
    id: CHARM_VIAL, name: 'Font Vial', emoji: '🧪', kind: 'charm', price: 1150, isle: ISLE,
    effect: { cooldownMult: 0.98 },
    flavor: 'A stoppered phial of liquid light from the Mana Font. Licensed, stamped, and quietly topped up.',
    script: CHARM_VIAL,
    scriptText: [
      'The vial fills with the damage you deal (70 to fill).',
      'Full, it pours: every ability 3s nearer ready, and heal 8. A blow of 12+ slops a quarter of it out.',
    ],
  },
  {
    id: ART_SIGIL, name: 'Sigil\'s Chalk', emoji: '🖍️', kind: 'artifact', isle: ISLE,
    effect: { maxHp: 18 },
    flavor: 'A stick of the Prince\'s own chalk, worn to a stub. It drew the circle that held the mirrors. It draws anything.',
    script: ART_SIGIL,
    scriptText: [
      'Your casts chalk a sigil round your foe, a stroke a cast; every 3rd cast completes it, in turn:',
      'triangle — bursts under them for 16 · circle — heals you 12 · spiral — stuns them 0.7s.',
    ],
  },
  {
    id: FISH_TROUT, name: 'Rune Trout', emoji: '🐟', kind: 'fish', sell: 36, isle: ISLE,
    flavor: 'A trout made of light, a single rune glowing down its flank. It means "quick". It is.',
    effect: { cooldownMult: 0.97 },
  },
  {
    id: FISH_EEL, name: 'Hex Eel', emoji: '🐍', kind: 'fish', sell: 58, isle: ISLE,
    flavor: 'A coil of runes that bites. Its ink is the only dark thing in the Font, and scribes pay for it.',
    effect: { critChance: 0.04 },
  },
  {
    id: FISH_WRASSE, name: 'Wyrd Wrasse', emoji: '🐠', kind: 'fish', sell: 92, isle: ISLE,
    flavor: 'Never the same colour twice and never in the same place. Fizzle swears it is the lawn\'s fault.',
    effect: { dodgeChance: 0.04 },
  },
];

export const ARCANE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_RETORT]: retort,
  [CHARM_SURGE]: surgePendant,
  [CHARM_PENTACLE]: pentacle,
  [CHARM_VIAL]: fontVial,
  [ART_SIGIL]: sigilChalk,
};

export const ARCANE_SHOPS: ShopDef[] = [
  { id: 'arcane-shop', name: 'Thrice\'s Wards & Wonders', stock: [CHARM_RETORT, CHARM_SURGE, CHARM_PENTACLE, CHARM_VIAL], buys: true },
];

export const ARCANE_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Mana Font', kind: 'mana' }];

export const ARCANE_FISH: FishDef[] = [
  { id: FISH_TROUT, fisheries: [FISHERY], weight: 6, fight: 2, size: [16, 38] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 4, fight: 3, size: [30, 84] },
  { id: FISH_WRASSE, fisheries: [FISHERY], weight: 1, fight: 5, size: [18, 44] },
];
