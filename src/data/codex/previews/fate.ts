import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  FATE, FateAvatar, FateFx, HOUSE_TONES, TAROT_TONES, fateCardLayered, fateChip,
} from '../../../elements/kits/FateVisuals';

/**
 * Fate's showcases.
 *
 * The thing that must be in frame in every single loop is **the hand**. Fate's click does not
 * have an effect of its own — it has whichever card is highlighted — so a preview that shows a
 * laser without showing the card it came off documents a laser element. Every script here draws
 * the fan along the bottom, highlights a card, and then throws that card.
 *
 * Fate puts no sprite in the world: cards, chips, the roulette wheel and every card effect are
 * Graphics repainted per frame out of `FateVisuals`, so `ctx.fly` is useless throughout.
 *
 * Containment: `ctx.at` and `ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `FateFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const BASE_HAND_SIZE = 6;
const UPGRADED_HAND_SIZE = 8;
const DRAW_INTERVAL_MS = 5000;
const GREAT_ENCHANT_MULT = 4;
const TAROT_COOLDOWN_MS = 20000;
const CYCLE_BIN_TARGET = 3;
const CYCLE_DRAW_COUNT = 2;

const ALL_IN_WAGER = 50;
const ALL_IN_ORBIT_MS = 3000;
const ALL_IN_ORBIT_PLUS_MS = 5000;
const ALL_IN_ORBIT_R = 100;
const ALL_IN_RADIUS = 50;

/** The eighteen cards, exactly as `FATE_CARD_DEFS` lists them. */
interface CardDef { type: string; name: string; emoji: string; color: number; blurb: string; dmg: number; nu: boolean }
const CARDS: CardDef[] = [
  { type: 'laser', name: 'Laser', emoji: '🔴', color: 0xff3333, blurb: '15 dmg hitscan laser', dmg: 15, nu: false },
  { type: 'burst', name: 'Burst', emoji: '💥', color: 0xff8800, blurb: '5× 5 dmg cone blast', dmg: 5, nu: false },
  { type: 'barrier', name: 'Barrier', emoji: '🛡️', color: 0x4488ff, blurb: '15× 3 dmg bullet ring', dmg: 3, nu: false },
  { type: 'explosion', name: 'Explosion', emoji: '💣', color: 0xcc2222, blurb: '20 dmg AoE bomb', dmg: 20, nu: false },
  { type: 'infect', name: 'Infect', emoji: '☠️', color: 0x55cc55, blurb: '3× 5 dmg + poison', dmg: 5, nu: false },
  { type: 'coin', name: 'Coin', emoji: '🪙', color: 0xffcc00, blurb: 'Reflects bullets ×2 dmg', dmg: 0, nu: false },
  { type: 'heal', name: 'Heal', emoji: '💚', color: 0x44dd88, blurb: '12 orbs, 8 HP each', dmg: 8, nu: false },
  { type: 'buff', name: 'Buff', emoji: '💪', color: 0xdd88ff, blurb: '+10% spd/dmg/DR (8s)', dmg: 0, nu: false },
  { type: 'lightning', name: 'Lightning', emoji: '⚡', color: 0xffee44, blurb: '20 dmg + 2s stun', dmg: 20, nu: false },
  { type: 'slots', name: 'Slots', emoji: '🎰', color: 0xff66cc, blurb: 'Summon a slot machine', dmg: 0, nu: false },
  { type: 'boomerang', name: 'Boomerang', emoji: '🪃', color: 0xb87333, blurb: 'Orbits you 3s, 15 dmg', dmg: 15, nu: true },
  { type: 'slash', name: 'Slash', emoji: '⚔️', color: 0x8b0000, blurb: 'Close red slash, 15 dmg', dmg: 15, nu: true },
  { type: 'phase', name: 'Phase', emoji: '💨', color: 0x00c2c7, blurb: 'Dash at cursor, 10 dmg', dmg: 10, nu: true },
  { type: 'striker', name: 'Striker', emoji: '⚫', color: 0x333344, blurb: 'Very slow shot, 35 dmg', dmg: 35, nu: true },
  { type: 'pulse', name: 'Pulse', emoji: '🌀', color: 0x00a3ff, blurb: '10 dmg AoE + knockback', dmg: 10, nu: true },
  { type: 'chill', name: 'Chill', emoji: '❄️', color: 0xa8e6ff, blurb: '5 dmg + big 50% slow', dmg: 5, nu: true },
  { type: 'chain', name: 'Chain', emoji: '🔗', color: 0x7b2ff7, blurb: '10 dmg chaining lightning', dmg: 10, nu: true },
  { type: 'emperor', name: 'Emperor', emoji: '👑', color: 0xffffff, blurb: '12× 3 dmg volley (rare)', dmg: 3, nu: true },
];

const CURSES = [
  { emoji: '🩹', name: 'Painful' }, { emoji: '🔥', name: 'Immolating' },
  { emoji: '🦠', name: 'Weakening' }, { emoji: '🌀', name: 'Confusing' },
  { emoji: '🦴', name: 'Vulnerable' }, { emoji: '💀', name: 'Cursed' },
  { emoji: '⭐', name: 'Stunning' }, { emoji: '😈', name: 'Cocky' },
  { emoji: '✨', name: 'Purging' },
];

interface Mark { x: number; y: number }

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ── Shared staging ────────────────────────────────────────────────────

interface Stage { fx: FateFx; av: BaseAvatar; at: Mark }

function stageIt(ctx: PreviewCtx): Stage {
  const fx = ctx.capture(() => new FateFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new FateAvatar(ctx.scene, ctx.tint, HOUSE_TONES));
  av.setFacing(ctx.aim);
  return { fx, av, at: { x: ctx.cx, y: ctx.cy } };
}

function drivenCaster(ctx: PreviewCtx, at: Mark): Stage {
  const fx = ctx.capture(() => new FateFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  if (ctx.scene.textures.exists('elem-fate')) {
    const body = ctx.adopt(ctx.scene.add.image(at.x, at.y, 'elem-fate').setDepth(5));
    ctx.onFrame(() => body.setPosition(at.x, at.y));
  }
  const av = ctx.useAvatar(() => new FateAvatar(ctx.scene, ctx.tint, HOUSE_TONES));
  av.setFacing(ctx.aim);
  ctx.onFrame((dt) => av.update(dt, at.x, at.y, 1));
  return { fx, av, at };
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#04150f', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(22));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 760) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 760, 0, 1));
  });
}

function label(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), align: 'center',
  }).setOrigin(0.5).setDepth(21));
}

function dummy(ctx: PreviewCtx, at: Mark): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(at.x, at.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(at.x, at.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(at.x - 5, at.y - 4, 3.2);
    g.fillCircle(at.x + 5, at.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(at.x - 5.6, at.y - 4, 1.6);
    g.fillCircle(at.x + 4.4, at.y - 4, 1.6);
  });
}

/**
 * The fan of cards along the bottom of the screen, exactly as the arena draws it — face, emoji,
 * blurb, the gold rim of a Preserve, the purple of an Enchant, the magenta of a Tarot, and the
 * highlight on whichever one the click will throw.
 */
interface HandCard { def: CardDef; preserved: boolean; enchanted: boolean; great: boolean; curse: number }

function hand(
  ctx: PreviewCtx,
  read: () => { cards: HandCard[]; selected: number; hovered?: number },
): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(18));
  const texts: Phaser.GameObjects.Text[] = [];
  const y = ctx.h - 26;
  for (let i = 0; i < UPGRADED_HAND_SIZE; i++) {
    texts.push(ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(19)));
  }
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const st = read();
    g.clear();
    for (const tx of texts) tx.setVisible(false);
    const n = st.cards.length;
    const w = 24;
    const step = Math.min(30, (ctx.w - 24) / Math.max(1, n));
    for (let i = 0; i < n; i++) {
      const c = st.cards[i];
      const x = ctx.w / 2 + (i - (n - 1) / 2) * step;
      const sel = i === st.selected;
      const hov = st.hovered === i;
      const tones = c.great ? TAROT_TONES : HOUSE_TONES;
      fateCardLayered(g, ctx.tint, tones, x, y - (sel ? 6 : 0), 0, w, 34, 1, sel ? 1 : 0.82, {
        face: c.def.color,
      });
      // The three coats: gold for preserved, purple for enchanted, magenta for a Tarot card.
      if (c.preserved) {
        g.lineStyle(1.6, ctx.tint(FATE.gold), 0.5 + 0.4 * Math.sin(t * 5 + i));
        g.strokeRect(x - w / 2 - 2, y - 19 - (sel ? 6 : 0), w + 4, 38);
      }
      if (c.enchanted || c.great) {
        g.lineStyle(1.4, ctx.tint(c.great ? FATE.great : FATE.enchant), 0.55 + 0.4 * Math.sin(t * 7 + i));
        g.strokeRect(x - w / 2 - 4, y - 21 - (sel ? 6 : 0), w + 8, 42);
      }
      if (hov) {
        g.lineStyle(1, ctx.tint(FATE.mint), 0.9);
        g.strokeRect(x - w / 2 - 6, y - 23 - (sel ? 6 : 0), w + 12, 46);
      }
      const tx = texts[i];
      tx.setVisible(true).setPosition(x, y - (sel ? 6 : 0));
      tx.setText(c.curse >= 0 ? `${c.def.emoji}\n${CURSES[c.curse].emoji}` : c.def.emoji);
    }
  });
}

function randomCard(pool: CardDef[] = CARDS.filter((c) => !c.nu)): HandCard {
  return { def: pool[Math.floor(Math.random() * pool.length)], preserved: false, enchanted: false, great: false, curse: -1 };
}

/** The one card effect every loop reuses — the throw, drawn as the card's own colour. */
function throwCard(ctx: PreviewCtx, s: Stage, from: Mark, foe: Mark, c: HandCard): void {
  const mult = c.great ? GREAT_ENCHANT_MULT : c.enchanted ? 2 : 1;
  const dmg = c.def.dmg * mult;
  s.av.play('punch', Math.atan2(foe.y - from.y, foe.x - from.x));
  s.fx.flick(from.x, from.y, Math.atan2(foe.y - from.y, foe.x - from.x), c.def.color, 1, 8,
    c.great ? TAROT_TONES : HOUSE_TONES);
  ctx.at(160, () => {
    s.fx.ring(foe.x, foe.y, 6, 40, c.def.color, 380, 4, 6);
    s.fx.cards(foe.x, foe.y, 5, { face: c.def.color, tones: HOUSE_TONES, depth: 9 });
    tick(ctx, foe.x, foe.y - 16, dmg > 0 ? `${dmg}` : c.def.blurb,
      c.great ? FATE.great : c.enchanted ? FATE.enchant : c.def.color);
    tick(ctx, foe.x, foe.y - 34, `${c.def.emoji} ${c.def.name}${mult > 1 ? ` ×${mult}` : ''}`,
      c.def.color);
  });
}

// ── Click — Card Throw ────────────────────────────────────────────────

function throwLoop(ctx: PreviewCtx, opts: { newCards: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.76, y: ctx.h * 0.34 };
  dummy(ctx, foe);

  const pool = opts.newCards ? CARDS : CARDS.filter((c) => !c.nu);
  const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard(pool));
  let selected = 0;
  hand(ctx, () => ({ cards, selected }));

  // Four throws, each highlighting a different card, so the "one key, eighteen abilities" reads.
  for (let i = 0; i < 4; i++) {
    ctx.at(500 + i * 1300, () => {
      selected = i % cards.length;
      const c = cards[selected];
      throwCard(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, c);
      // Spent, and the empty slot refills on the deck's own five-second clock.
      cards.splice(selected, 1);
      if (selected >= cards.length) selected = Math.max(0, cards.length - 1);
    });
  }
  ctx.at(5600, () => {
    cards.push(randomCard(pool));
    s.fx.fan(ctx.cx, ctx.cy - 10, 34, 420, 6, HOUSE_TONES);
    tick(ctx, ctx.cx, ctx.cy - 40, `🂠 DEALT · every ${DRAW_INTERVAL_MS / 1000}s`, FATE.mint);
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.newCards ? `18 card types in the pool · Emperor is 10× rarer than any of them`
      : `10 card types · one draw every ${DRAW_INTERVAL_MS / 1000}s · 0.35s between throws`,
    FATE.mint);
}

export const cardThrow: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Click — whatever the highlighted card is. The key has no effect of its own',
  run(ctx) { throwLoop(ctx, { newCards: false }); },
};

export const cardThrowUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'New Cards! — eight more types in the pool, including the 35-damage Striker and the Emperor',
  run(ctx) { throwLoop(ctx, { newCards: true }); },
};

// ── E — Reroll ────────────────────────────────────────────────────────

function rerollLoop(ctx: PreviewCtx, opts: { face: boolean }): void {
  const s = stageIt(ctx);
  // Force the Hand of Fate: Ace is laser / coin / infect / striker.
  const acePool = CARDS.filter((c) => ['laser', 'coin', 'infect', 'striker'].includes(c.type));
  const pool = opts.face ? acePool : CARDS.filter((c) => !c.nu);
  let cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard(pool));
  let selected = 0;
  hand(ctx, () => ({ cards, selected }));

  if (opts.face) {
    label(ctx, ctx.w * 0.5, 12, '♠️ ACE — laser · coin · infect · striker', 0xd0d0e0);
    label(ctx, ctx.w * 0.5, 26, 'chosen once, at the start of the match', FATE.mint);
  }

  // Enchant one, then throw the hand away — the buff goes with it.
  ctx.at(700, () => {
    cards[1].enchanted = true;
    selected = 1;
    s.fx.ring(ctx.cx, ctx.cy, 52, 18, FATE.enchant, 400, 4, 5);
    tick(ctx, ctx.cx, ctx.cy - 34, '🔮 ENCHANTED', FATE.enchant);
  });
  for (let i = 0; i < 3; i++) {
    ctx.at(2000 + i * 1900, () => {
      s.av.play('clap');
      s.fx.riffle(ctx.cx, ctx.cy - 6, 46, 10, HOUSE_TONES);
      s.fx.ring(ctx.cx, ctx.cy, 8, 48, FATE.mint, 340, 3, 5);
      cards = Array.from({ length: BASE_HAND_SIZE }, () => randomCard(pool));
      selected = 0;
      tick(ctx, ctx.cx, ctx.cy - 34, '🔄 REROLL!', FATE.mint);
      if (i === 0) tick(ctx, ctx.cx, ctx.cy - 52, 'the enchantment went with it', FATE.ash);
    });
  }

  label(ctx, ctx.w * 0.5, ctx.h - 52,
    opts.face ? 'four types instead of eighteen — the element\'s only answer to its own randomness'
      : 'a whole new hand, and everything on the old one is discarded with it',
    FATE.teal);
}

export const reroll: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'E — throw the hand away and deal six fresh. Enchantments and preservations go too',
  run(ctx) { rerollLoop(ctx, { face: false }); },
};

export const rerollUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Force the Hand of Fate — pick a face card at match start and the deck may only give you those',
  run(ctx) { rerollLoop(ctx, { face: true }); },
};

// ── R — Preserve ──────────────────────────────────────────────────────

function preserveLoop(ctx: PreviewCtx, opts: { wonder: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.32 };
  dummy(ctx, foe);

  const size = opts.wonder ? UPGRADED_HAND_SIZE : BASE_HAND_SIZE;
  const cards: HandCard[] = Array.from({ length: size }, () => randomCard());
  // A card worth keeping, so the ability has a point.
  cards[2] = { def: CARDS.find((c) => c.type === 'lightning')!, preserved: false, enchanted: false, great: false, curse: -1 };
  let selected = 2;
  hand(ctx, () => ({ cards, selected }));

  ctx.at(600, () => {
    cards[2].enchanted = true;
    s.av.play('flex');
    s.fx.ring(ctx.cx, ctx.cy, 52, 18, FATE.enchant, 400, 4, 5);
    s.fx.sparkle(ctx.cx, ctx.cy - 10, 9, 30, 10, FATE.enchant);
    tick(ctx, ctx.cx, ctx.cy - 34, '🔮 ENCHANTED · ×2', FATE.enchant);
  });
  ctx.at(1700, () => {
    cards[2].preserved = true;
    // Without Wonder Preserve, gilding a card strips the purple straight back off it.
    if (!opts.wonder) {
      cards[2].enchanted = false;
      tick(ctx, ctx.cx, ctx.cy - 52, 'the enchantment is stripped', FATE.ash);
    } else {
      tick(ctx, ctx.cx, ctx.cy - 52, 'and it keeps the enchantment', FATE.great);
    }
    s.av.play('flex');
    s.fx.ring(ctx.cx, ctx.cy, 50, 16, FATE.gold, 400, 4, 5);
    s.fx.sparkle(ctx.cx, ctx.cy - 10, 9, 30, 10, FATE.gold);
    tick(ctx, ctx.cx, ctx.cy - 34, '✨ PRESERVED', FATE.gold);
  });
  // Thrown once — and it comes back.
  ctx.at(3200, () => {
    throwCard(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, cards[2]);
    cards[2].preserved = false;
    ctx.at(500, () => {
      s.fx.sparkle(ctx.cx, ctx.cy - 10, 6, 24, 10, FATE.gold);
      tick(ctx, ctx.cx, ctx.cy - 34, '✨ AND IT STAYED', FATE.gold);
    });
  });
  // …and thrown again, this time for real.
  ctx.at(5200, () => {
    throwCard(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, cards[2]);
    cards.splice(2, 1);
    selected = 0;
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.wonder ? `hand of ${UPGRADED_HAND_SIZE} · gold and purple stack`
      : `hand of ${BASE_HAND_SIZE} · gold replaces purple`, FATE.gold);
}

export const preserve: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'R — the highlighted card turns gold and survives its next throw',
  run(ctx) { preserveLoop(ctx, { wonder: false }); },
};

export const preserveUpgraded: PreviewScript = {
  duration: 7000,
  scale: 0.9,
  caption: 'Wonder Preserve — gold and purple stack now, and the hand is eight cards wide',
  run(ctx) { preserveLoop(ctx, { wonder: true }); },
};

// ── F — Enchant ───────────────────────────────────────────────────────

function enchantLoop(ctx: PreviewCtx, opts: { wonder: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.32 };
  dummy(ctx, foe);

  const barrier = CARDS.find((c) => c.type === 'barrier')!;
  const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
  cards[3] = { def: barrier, preserved: false, enchanted: false, great: false, curse: -1 };
  let selected = 3;
  hand(ctx, () => ({ cards, selected }));

  // The ring of bullets Barrier makes, so the ×2 and the Wonder Enchant slowdown are visible.
  interface Bullet { a: number; r: number; speed: number }
  const bullets: Bullet[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt) => {
    const step = dt / 1000;
    g.clear();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.r += b.speed * step;
      if (b.r > Math.max(ctx.w, ctx.h)) { bullets.splice(i, 1); continue; }
      const x = ctx.cx + Math.cos(b.a) * b.r;
      const y = ctx.cy + Math.sin(b.a) * b.r;
      g.fillStyle(ctx.tint(barrier.color), 0.95);
      g.fillCircle(x, y, 3.4);
      g.fillStyle(ctx.tint(FATE.white), 0.5);
      g.fillCircle(x - 1, y - 1, 1.3);
    }
  });

  const cast = (at: number, enchanted: boolean): void => {
    ctx.at(at, () => {
      const count = enchanted ? 30 : 15;
      // Wonder Enchant doubles the count and slows them 300% into a wall you stand inside.
      const speed = enchanted && opts.wonder ? 70 : 260;
      for (let i = 0; i < count; i++) bullets.push({ a: (i / count) * Math.PI * 2, r: 14, speed });
      s.av.play('punch', 0);
      s.fx.ring(ctx.cx, ctx.cy, 8, 44, barrier.color, 360, 4, 6);
      tick(ctx, ctx.cx, ctx.cy - 40,
        `🛡️ ${count} × ${3 * (enchanted ? 2 : 1)}`, enchanted ? FATE.enchant : barrier.color);
      if (enchanted && opts.wonder) tick(ctx, ctx.cx, ctx.cy - 58, '300% SLOWER — A WALL', FATE.enchant);
    });
  };

  cast(600, false);
  ctx.at(2600, () => {
    cards[3].enchanted = true;
    s.av.play('flex');
    s.fx.ring(ctx.cx, ctx.cy, 52, 18, FATE.enchant, 400, 4, 5);
    s.fx.sparkle(ctx.cx, ctx.cy - 10, 9, 30, 10, FATE.enchant);
    tick(ctx, ctx.cx, ctx.cy - 34, '🔮 ENCHANTED', FATE.enchant);
  });
  cast(3400, true);

  label(ctx, ctx.w * 0.5, 12,
    opts.wonder ? 'Wonder Enchant — every card has its own second gift on top of the doubling'
      : '×2 on everything the card does, count as well as damage', FATE.enchant);
}

export const enchant: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'F — the card turns purple and its next use is worth double, count and all',
  run(ctx) { enchantLoop(ctx, { wonder: false }); },
};

export const enchantUpgraded: PreviewScript = {
  duration: 6600,
  scale: 0.9,
  caption: 'Wonder Enchant — and Barrier\'s 30 bullets are 300% slower, which is a wall you stand in',
  run(ctx) { enchantLoop(ctx, { wonder: true }); },
};

// ── Q — All In! ───────────────────────────────────────────────────────

function allInLoop(ctx: PreviewCtx, opts: { roulette: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
  hand(ctx, () => ({ cards, selected: 0 }));

  const wager = opts.roulette ? 90 : ALL_IN_WAGER;
  const orbitMs = opts.roulette ? ALL_IN_ORBIT_PLUS_MS : ALL_IN_ORBIT_MS;
  let spinFrom = -1;
  const wheel: Mark = { x: ctx.cx + ALL_IN_ORBIT_R * 0.5, y: ctx.cy };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

  // The health bar, with the gamble marker on it — the upgrade's whole interface.
  const bar = ctx.adopt(ctx.scene.add.graphics().setDepth(19));
  ctx.onFrame(() => {
    bar.clear();
    if (!opts.roulette) return;
    const w = 90;
    const x = ctx.cx - w / 2;
    const y = ctx.cy - 40;
    bar.fillStyle(ctx.tint(FATE.shade), 0.9);
    bar.fillRect(x - 1, y - 1, w + 2, 7);
    bar.fillStyle(0x44dd66, 1);
    bar.fillRect(x, y, w, 5);
    // The gambled portion turns yellow.
    bar.fillStyle(ctx.tint(FATE.gold), 1);
    bar.fillRect(x + w - (w * wager) / 200, y, (w * wager) / 200, 5);
    bar.fillStyle(ctx.tint(FATE.glint), 1);
    bar.fillRect(x + w - (w * wager) / 200 - 1, y - 3, 2, 11);
  });

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (spinFrom < 0) return;
    // The wheel orbits at 100px and follows the cursor for the whole spin.
    const a = Math.sin((elapsed - spinFrom) / 700) * 1.1 - 0.4;
    wheel.x = ctx.cx + Math.cos(a) * ALL_IN_ORBIT_R * 0.55;
    wheel.y = ctx.cy + Math.sin(a) * ALL_IN_ORBIT_R * 0.55;
    const ready = Phaser.Math.Clamp((elapsed - spinFrom) / orbitMs, 0, 1);
    FateFx.drawWheel(g, ctx.tint, wheel.x, wheel.y, ALL_IN_RADIUS * 0.55, t, ready, false, 1);
  });

  ctx.at(500, () => {
    spinFrom = 500;
    s.av.play('raise', -Math.PI / 2, 900);
    s.fx.ante(ctx.cx, ctx.cy, 52, Math.min(1200, orbitMs), () => ({ x: ctx.cx, y: ctx.cy }), 5, HOUSE_TONES);
    s.fx.ring(ctx.cx, ctx.cy, 10, 96, FATE.gold, 480, 5, 5);
    tick(ctx, ctx.cx, ctx.cy - 34, `🎰 ALL IN! (${wager} HP)`, FATE.gold);
  });
  ctx.at(500 + orbitMs, () => {
    spinFrom = -1;
    const hit = Phaser.Math.Distance.Between(wheel.x, wheel.y, foe.x, foe.y) <= ALL_IN_RADIUS * 0.55;
    if (hit) {
      s.fx.payout(wheel.x, wheel.y, ALL_IN_RADIUS, { cards: 14, chips: 12, depth: 9, face: FATE.gold, tones: HOUSE_TONES });
      s.fx.dealtBeam(wheel.x, wheel.y, foe.x, foe.y, FATE.gold, 10, HOUSE_TONES, 6);
      ctx.scene.cameras.main.shake(180, 0.005);
      tick(ctx, foe.x, foe.y - 16, `${wager}`, FATE.gold);
      tick(ctx, ctx.cx, ctx.cy - 44, `🎰 HIT! ${wager}`, 0xffee44);
      return;
    }
    s.fx.cards(wheel.x, wheel.y, 9, { speed: 130, size: 11, life: 700, fall: 90, depth: 8, face: FATE.ash, tones: HOUSE_TONES });
    s.fx.litter(wheel.x, wheel.y, ALL_IN_RADIUS, 1, HOUSE_TONES);
    tick(ctx, ctx.cx, ctx.cy - 44, `🎰 MISS! -${wager} HP`, 0xff8888);
  });
  // The chip stack that says what is on the table.
  const chips = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.onFrame((_dt, elapsed) => {
    chips.clear();
    if (spinFrom < 0) return;
    for (let i = 0; i < 4; i++) {
      fateChip(chips, ctx.tint, ctx.cx - 22, ctx.cy + 20 - i * 3, 6, FATE.gold, 0.9, elapsed / 400 + i);
    }
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.roulette ? `${ALL_IN_ORBIT_PLUS_MS / 1000}s of orbit, and the marker sets the stake anywhere on your bar`
      : `${ALL_IN_ORBIT_MS / 1000}s of orbit at ${ALL_IN_ORBIT_R}px · ${ALL_IN_WAGER} either way`,
    FATE.gold);
}

export const allIn: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  caption: 'Q — 50 HP on a wheel you steer with the cursor. Land it or eat it',
  run(ctx) { allInLoop(ctx, { roulette: false }); },
};

export const allInUpgraded: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Roulette Expert — drag a marker on your own health bar to size the bet, and two more seconds to aim',
  run(ctx) { allInLoop(ctx, { roulette: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theHand: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Six cards, dealt at random, one back every five seconds — and one of them is highlighted',
  run(ctx) {
    const s = stageIt(ctx);
    const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
    let selected = 0;
    hand(ctx, () => ({ cards, selected }));

    // The number keys walking along the fan.
    const keys = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, ctx.h - 52, '', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(FATE.mint),
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => keys.setText(`press ${selected + 1}  ·  ${cards[selected]?.def.blurb ?? ''}`));

    for (let i = 0; i < 6; i++) {
      ctx.at(400 + i * 700, () => {
        selected = i % Math.max(1, cards.length);
        s.fx.sparkle(ctx.cx, ctx.cy - 10, 4, 18, 10, FATE.mint);
      });
    }
    // A card spent, and the deck dealing one back on its own clock.
    ctx.at(4800, () => {
      const c = cards[selected];
      s.fx.flick(ctx.cx, ctx.cy, 0, c.def.color, 1, 8, HOUSE_TONES);
      cards.splice(selected, 1);
      selected = 0;
      tick(ctx, ctx.cx, ctx.cy - 34, `${c.def.emoji} THROWN — SPENT`, c.def.color);
    });
    ctx.at(4800 + DRAW_INTERVAL_MS * 0.7, () => {
      cards.push(randomCard());
      s.fx.fan(ctx.cx, ctx.cy - 10, 34, 420, 6, HOUSE_TONES);
      tick(ctx, ctx.cx, ctx.cy - 34, '🂠 DEALT', FATE.mint);
    });

    label(ctx, ctx.w * 0.5, 12,
      'the click throws whatever is raised — that is the whole element', FATE.teal);
  },
};

export const theDeck: PreviewScript = {
  duration: 11000,
  scale: 0.83,
  caption: 'Eighteen card types in one pool, and the Emperor is ten times rarer than any of them',
  run(ctx) {
    stageIt(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const texts = CARDS.map(() => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(9)));

    // Every card in the pool, laid out — base ten on the top row, New Cards! below.
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      CARDS.forEach((c, i) => {
        const row = c.nu ? 1 : 0;
        const col = c.nu ? i - 10 : i;
        const per = c.nu ? 8 : 10;
        const x = ctx.w * 0.5 + (col - (per - 1) / 2) * (ctx.w * 0.09);
        const y = ctx.h * (row === 0 ? 0.4 : 0.74);
        const lit = Math.floor(elapsed / 550) % CARDS.length === i;
        fateCardLayered(g, ctx.tint, HOUSE_TONES, x, y - (lit ? 4 : 0), 0, 22, 32, 1,
          lit ? 1 : 0.7, { face: c.color });
        if (c.type === 'emperor') {
          g.lineStyle(1.4, ctx.tint(FATE.gold), 0.5 + 0.4 * Math.sin(t * 5));
          g.strokeRect(x - 13, y - 18, 26, 36);
        }
        texts[i].setPosition(x, y - (lit ? 4 : 0)).setText(c.emoji);
      });
    });

    label(ctx, ctx.w * 0.5, ctx.h * 0.4 - 30, 'the base ten — always drawable', FATE.mint);
    label(ctx, ctx.w * 0.5, ctx.h * 0.74 - 30, 'New Cards! — only with the Click upgrade', FATE.gold);
    label(ctx, ctx.w * 0.5, ctx.h - 10,
      '👑 Emperor is 10× rarer than anything else · 🪙 🪃 💚 💪 🎰 deal no damage at all', FATE.teal);
  },
};

// ── Perk — Paper ──────────────────────────────────────────────────────

export const perkPaper: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Right-click fires five cards at once, worth whatever poker hand they make',
  run(ctx) {
    const s = stageIt(ctx);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.3 };
    dummy(ctx, foe);
    const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
    hand(ctx, () => ({ cards, selected: 0 }));

    const HANDS = [
      { name: 'HIGH CARD', per: 1 },
      { name: 'PAIR', per: 2 },
      { name: 'THREE OF A KIND', per: 6 },
      { name: 'FOUR OF A KIND', per: 20 },
    ];
    HANDS.forEach((h, i) => {
      ctx.at(500 + i * 1800, () => {
        s.av.play('sweep', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
        const base = Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx);
        for (let k = 0; k < 5; k++) {
          const a = base + (k / 4 - 0.5) * 0.5;
          s.fx.flick(ctx.cx, ctx.cy, a, CARDS[(i * 3 + k) % CARDS.length].color, 1, 8, HOUSE_TONES);
        }
        ctx.at(200, () => {
          s.fx.cards(foe.x, foe.y, 7, { face: FATE.gold, tones: HOUSE_TONES, depth: 9 });
          tick(ctx, foe.x, foe.y - 16, `5 × ${h.per} = ${h.per * 5}`, FATE.gold);
          tick(ctx, foe.x, foe.y - 34, h.name, FATE.glint);
        });
      });
    });

    label(ctx, ctx.w * 0.5, 12,
      'high card 1 · pair 2 · two pair 4 · trips 6 · straight 8 · flush 10 · full house 14 · quads 20 · straight flush 30 · royal 40',
      FATE.gold);
    label(ctx, ctx.w * 0.5, ctx.h - 52,
      'a narrowed draw pool makes pairs and better far more likely', FATE.teal);
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryCycle: PreviewScript = {
  duration: 8000,
  scale: 0.9,
  caption: 'Right-click to bin a card. Every third one binned deals you two fresh ones at once',
  run(ctx) {
    const s = stageIt(ctx);
    const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
    let selected = 0;
    let binned = 0;
    hand(ctx, () => ({ cards, selected }));

    const counter = ctx.adopt(ctx.scene.add.text(ctx.w * 0.5, 14, '', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: hex(FATE.mint),
    }).setOrigin(0.5).setDepth(21));
    ctx.onFrame(() => counter.setText(`binned ${binned % CYCLE_BIN_TARGET} / ${CYCLE_BIN_TARGET}`));

    for (let i = 0; i < 6; i++) {
      ctx.at(600 + i * 1100, () => {
        if (!cards.length) return;
        selected = 0;
        const c = cards.shift()!;
        binned++;
        s.fx.cards(ctx.cx, ctx.cy - 6, 3, { face: FATE.ash, tones: HOUSE_TONES, depth: 8, fall: 120, life: 620 });
        tick(ctx, ctx.cx, ctx.cy - 30, `🗑 ${c.def.emoji} BINNED`, FATE.ash);
        if (binned % CYCLE_BIN_TARGET !== 0) return;
        // Three thrown away, two dealt straight back — a net loss of one, bought instantly.
        for (let k = 0; k < CYCLE_DRAW_COUNT; k++) cards.push(randomCard());
        s.fx.fan(ctx.cx, ctx.cy - 10, 38, 460, 6, HOUSE_TONES);
        s.fx.ring(ctx.cx, ctx.cy, 8, 46, FATE.mint, 340, 3, 5);
        tick(ctx, ctx.cx, ctx.cy - 48, `🂠 +${CYCLE_DRAW_COUNT} DEALT`, FATE.mint);
      });
    }

    label(ctx, ctx.w * 0.5, ctx.h - 52,
      `3 binned for 2 dealt — a net loss of one card, bought instantly instead of over ${DRAW_INTERVAL_MS * 3 / 1000}s`,
      FATE.teal);
  },
};

export const masteryTarotOfFate: PreviewScript = {
  duration: 10000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'The hovered card becomes ×4 — and picks up a curse that fires the moment you play it',
  run(ctx) {
    const home: Mark = { x: ctx.cx, y: ctx.cy };
    const s = drivenCaster(ctx, home);
    const foe: Mark = { x: ctx.w * 0.78, y: ctx.h * 0.3 };
    dummy(ctx, foe);

    const striker = CARDS.find((c) => c.type === 'striker')!;
    const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
    cards[2] = { def: striker, preserved: false, enchanted: false, great: false, curse: -1 };
    let selected = 2;
    let hovered = 2;
    hand(ctx, () => ({ cards, selected, hovered }));

    // The curse is drawn on the card before you commit — this is a decision, not a punishment.
    const curseIdx = 5; // 💀 Cursed
    ctx.at(700, () => {
      cards[2].great = true;
      cards[2].curse = curseIdx;
      s.av.play('flex');
      s.fx.ring(home.x, home.y, 54, 18, FATE.great, 460, 5, 5);
      s.fx.sparkle(home.x, home.y - 10, 12, 34, 10, FATE.great);
      tick(ctx, home.x, home.y - 34, '🔮 GREATLY ENCHANTED', FATE.great);
      tick(ctx, home.x, home.y - 52, `×${GREAT_ENCHANT_MULT} · ${CURSES[curseIdx].emoji} ${CURSES[curseIdx].name.toUpperCase()}`, FATE.curse);
    });
    ctx.at(2400, () => {
      // A plain Enchant is refused outright rather than combining.
      tick(ctx, home.x, home.y - 34, '🔮 ALREADY GREATLY ENCHANTED', FATE.enchant);
    });

    ctx.at(4000, () => {
      selected = 2;
      throwCard(ctx, s, home, foe, cards[2]);
      cards.splice(2, 1);
      selected = 0;
      hovered = -1;
    });
    // …and the curse fires on the play, not on the enchant.
    ctx.at(4400, () => {
      tick(ctx, home.x, home.y - 34, `${CURSES[curseIdx].emoji} CURSED`, FATE.curse);
      const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
      interface B { x: number; y: number; vx: number; vy: number; dead: boolean }
      const bullets: B[] = [];
      for (let i = 0; i < 15; i++) {
        const left = i % 2 === 0;
        const y = 20 + (i / 15) * (ctx.h - 40);
        const a = Math.atan2(home.y - y, (left ? home.x : home.x) - (left ? 0 : ctx.w));
        bullets.push({ x: left ? 0 : ctx.w, y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dead: false });
      }
      ctx.onFrame((dt, elapsed) => {
        const step = dt / 1000;
        g.clear();
        for (const b of bullets) {
          if (b.dead) continue;
          b.x += b.vx * step;
          b.y += b.vy * step;
          if (Phaser.Math.Distance.Between(b.x, b.y, home.x, home.y) <= 20) {
            b.dead = true;
            tick(ctx, home.x + (Math.random() - 0.5) * 20, home.y - 12, '3', FATE.curse);
            continue;
          }
          if (b.x < -20 || b.x > ctx.w + 20) { b.dead = true; continue; }
          FateFx.drawCurseBullet(g, ctx.tint, b.x, b.y, Math.atan2(b.vy, b.vx), elapsed / 1000);
        }
      });
    });

    label(ctx, ctx.w * 0.5, 12,
      `×${GREAT_ENCHANT_MULT} — a ${striker.dmg} Striker becomes ${striker.dmg * GREAT_ENCHANT_MULT}`, FATE.great);
    label(ctx, ctx.w * 0.5, 26,
      `${TAROT_COOLDOWN_MS / 1000}s cooldown · nine curses, and the card shows you which`, FATE.curse);
  },
};
