import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  FATE, FateAvatar, FateFx, HOUSE_TONES, TAROT_TONES, fateCardLayered, fateChip, fatePlayingCard, suitInk,
} from '../../../elements/kits/FateVisuals';
import {
  ALL_IN_PER_CARD, ALL_IN_PER_USE, BASE_HAND_SIZE, CARD_RANKS, CARD_SUITS, CARD_USES, DRAW_INTERVAL_MS,
  FateCardType, SHUFFLE_DIST, UPGRADED_HAND_SIZE,
} from '../../../elements/kits/FateKit';

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

const GREAT_ENCHANT_MULT = 4;
const TAROT_COOLDOWN_MS = 20000;
const CYCLE_BIN_TARGET = 3;
const CYCLE_DRAW_COUNT = 2;

const ALL_IN_ORBIT_MS = 3000;
const ALL_IN_ORBIT_PLUS_MS = 5000;
const ALL_IN_ORBIT_R = 100;
const ALL_IN_RADIUS = 50;

/** The seventeen cards, exactly as `FATE_CARD_DEFS` lists them. */
interface CardDef { type: string; name: string; emoji: string; color: number; blurb: string; dmg: number; nu: boolean }
const CARDS: CardDef[] = [
  { type: 'laser', name: 'Laser', emoji: '🔴', color: 0xff3333, blurb: '15 dmg hitscan laser', dmg: 15, nu: false },
  { type: 'burst', name: 'Burst', emoji: '💥', color: 0xff8800, blurb: '5× 7 dmg cone blast', dmg: 7, nu: false },
  { type: 'barrier', name: 'Barrier', emoji: '🛡️', color: 0x4488ff, blurb: '18× 5 dmg ring + 1 shield', dmg: 5, nu: false },
  { type: 'explosion', name: 'Explosion', emoji: '💣', color: 0xcc2222, blurb: '20 dmg AoE bomb', dmg: 20, nu: false },
  { type: 'infect', name: 'Infect', emoji: '☠️', color: 0x55cc55, blurb: '3× 6 dmg + poison', dmg: 6, nu: false },
  { type: 'coin', name: 'Coin', emoji: '🪙', color: 0xffcc00, blurb: 'Reflects bullets ×2 dmg', dmg: 0, nu: false },
  { type: 'heal', name: 'Heal', emoji: '💚', color: 0x44dd88, blurb: '12 orbs, 10 HP each', dmg: 10, nu: false },
  { type: 'buff', name: 'Buff', emoji: '💪', color: 0xdd88ff, blurb: '+20% spd/dmg/DR (8s)', dmg: 0, nu: false },
  { type: 'lightning', name: 'Lightning', emoji: '⚡', color: 0xffee44, blurb: '20 dmg + 2s stun', dmg: 20, nu: false },
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
 * blurb, the gold rim of a wager, the purple of a glyph, the magenta of a Tarot, and the
 * highlight on whichever one the click will throw.
 */
interface HandCard {
  def: CardDef; enchanted: boolean; great: boolean; curse: number;
  uses: number; wear: number; seed: number;
}

/** The fan's cards are the arena HUD's own playing cards, shrunk to fit the stage. */
const PREVIEW_CARD_SCALE = 0.62;

function hand(
  ctx: PreviewCtx,
  read: () => { cards: HandCard[]; selected: number; hovered?: number; wagered?: Set<number> },
): void {
  const papers: Phaser.GameObjects.Graphics[] = [];
  const texts: Phaser.GameObjects.Text[] = [];
  const ranks: Phaser.GameObjects.Text[] = [];
  const y = ctx.h - 28;
  for (let i = 0; i < UPGRADED_HAND_SIZE; i++) {
    papers.push(ctx.adopt(ctx.scene.add.graphics().setDepth(18).setScale(PREVIEW_CARD_SCALE)));
    texts.push(ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(19)));
    ranks.push(ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '7px', fontFamily: 'Georgia, serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(19)));
  }
  const cw = 46, ch = 64;
  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    const st = read();
    for (let i = 0; i < UPGRADED_HAND_SIZE; i++) {
      papers[i].clear().setVisible(false);
      texts[i].setVisible(false);
      ranks[i].setVisible(false);
    }
    const n = st.cards.length;
    const step = Math.min(32, (ctx.w - 24) / Math.max(1, n));
    for (let i = 0; i < n; i++) {
      const c = st.cards[i];
      const x = ctx.w / 2 + (i - (n - 1) / 2) * step;
      const sel = i === st.selected;
      const bet = !!st.wagered?.has(i);
      const cy = y - (bet ? 10 : sel ? 6 : 0);
      const suit = CARD_SUITS[c.def.type as FateCardType];
      // The three coats: gold for wagered, purple for a glyph, magenta for a Tarot card.
      const pulse = 0.5 + 0.5 * Math.sin(t * 6 + i);
      const border = bet ? FATE.gold : c.great ? FATE.great : c.enchanted ? FATE.enchant : FATE.ash;
      const p = papers[i].setVisible(true).setPosition(x, cy);
      const dmg = fatePlayingCard(p, {
        w: cw, h: ch, suit, face: c.def.color, border,
        borderWidth: (bet || c.great || c.enchanted) ? 2 + pulse : 1.4,
        wear: c.wear, seed: c.seed, selected: sel, uses: c.uses,
      });
      if (st.hovered === i) {
        p.lineStyle(1.5, ctx.tint(FATE.mint), 0.9);
        p.strokeRect(-cw / 2 - 5, -ch / 2 - 5, cw + 10, ch + 10);
      }
      texts[i].setVisible(true).setPosition(x, cy)
        .setText(c.curse >= 0 ? `${c.def.emoji}\n${CURSES[c.curse].emoji}` : c.def.emoji);
      if (!dmg.topLeftGone) {
        ranks[i].setVisible(true)
          .setPosition(x + (-cw / 2 + 7) * PREVIEW_CARD_SCALE, cy + (-ch / 2 + 9) * PREVIEW_CARD_SCALE)
          .setText(CARD_RANKS[c.def.type as FateCardType])
          .setColor(suitInk(suit) === FATE.blood ? '#cc2233' : '#14141c');
      }
    }
  });
}

function randomCard(pool: CardDef[] = CARDS.filter((c) => !c.nu)): HandCard {
  return fresh(pool[Math.floor(Math.random() * pool.length)]);
}

function fresh(def: CardDef): HandCard {
  return {
    def, enchanted: false, great: false, curse: -1,
    uses: CARD_USES, wear: 0, seed: Math.floor(Math.random() * 0x7fffffff),
  };
}

/** Spends one of a card's uses, tearing it; on its last one it is shredded out of the hand. */
function wearCard(ctx: PreviewCtx, s: Stage, cards: HandCard[], i: number): boolean {
  const c = cards[i];
  c.uses -= 1;
  c.wear += 1;
  if (c.uses > 0) return false;
  cards.splice(i, 1);
  s.fx.cards(ctx.cx, ctx.cy - 8, 7, { size: 5, speed: 90, life: 700, fall: 30, face: c.def.color });
  tick(ctx, ctx.cx, ctx.cy - 52, `💔 ${c.def.name.toUpperCase()} SHREDDED`, 0xff9a7a);
  return true;
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

  // One card thrown until it tears apart, then another — each throw rips it a little further.
  for (let i = 0; i < 4; i++) {
    ctx.at(500 + i * 1300, () => {
      selected = 0;
      const c = cards[selected];
      throwCard(ctx, s, { x: ctx.cx, y: ctx.cy }, foe, c);
      // Its last use shreds it, and the empty slot refills on the deck's own five-second clock.
      wearCard(ctx, s, cards, selected);
    });
  }
  ctx.at(5600, () => {
    cards.push(randomCard(pool));
    s.fx.fan(ctx.cx, ctx.cy - 10, 34, 420, 6, HOUSE_TONES);
    tick(ctx, ctx.cx, ctx.cy - 40, `🂠 DEALT · every ${DRAW_INTERVAL_MS / 1000}s`, FATE.mint);
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.newCards ? `17 card types in the pool · Emperor is 10× rarer than any of them`
      : `9 card types · one draw every ${DRAW_INTERVAL_MS / 1000}s · 0.35s between throws`,
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

// ── E — Side Shuffle ──────────────────────────────────────────────────

function shuffleLoop(ctx: PreviewCtx, opts: { face: boolean }): void {
  const home: Mark = { x: ctx.w * 0.36, y: ctx.h * 0.36 };
  const s = drivenCaster(ctx, home);
  const foe: Mark = { x: ctx.w * 0.82, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  // Force the Hand of Fate: Ace is laser / coin / infect / striker — the decoys draw from it too.
  const acePool = CARDS.filter((c) => ['laser', 'coin', 'infect', 'striker'].includes(c.type));
  const pool = opts.face ? acePool : CARDS.filter((c) => !c.nu);
  const cards: HandCard[] = [randomCard(pool)];
  hand(ctx, () => ({ cards, selected: 0 }));
  if (opts.face) {
    label(ctx, ctx.w * 0.5, 12, '♠️ ACE — laser · coin · infect · striker', 0xd0d0e0);
    label(ctx, ctx.w * 0.5, 26, 'every card the decoys draw comes from the chosen face', FATE.mint);
  }

  interface Decoy { x: number; y: number; a: number; born: number; dead: boolean }
  interface Shot { x: number; y: number; vx: number; vy: number; dead: boolean }
  const decoys: Decoy[] = [];
  const shots: Shot[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const air = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  let dashUntil = -1, dashVy = 0;
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    if (elapsed < dashUntil) home.y += dashVy * step;
    g.clear(); air.clear();
    for (const d of decoys) {
      if (d.dead) continue;
      const drop = Phaser.Math.Clamp((elapsed - d.born) / 140, 0, 1);
      fateCardLayered(g, ctx.tint, HOUSE_TONES, d.x, d.y - (1 - drop) * 14, d.a, 13, 18, 1, 0.9 * drop, { faceDown: true });
      g.lineStyle(1.2, ctx.tint(FATE.mint), 0.35);
      g.strokeCircle(d.x, d.y, 18);
    }
    for (const b of shots) {
      if (b.dead) continue;
      b.x += b.vx * step; b.y += b.vy * step;
      const hitDecoy = decoys.find((d) => !d.dead && Phaser.Math.Distance.Between(b.x, b.y, d.x, d.y) <= 18);
      if (hitDecoy) {
        b.dead = true; hitDecoy.dead = true;
        s.fx.flash(hitDecoy.x, hitDecoy.y, 18, 8, FATE.mint);
        s.fx.sparkle(home.x, home.y - 10, 6, 22, 9, FATE.mint);
        if (cards.length < BASE_HAND_SIZE) cards.push(randomCard(pool));
        tick(ctx, hitDecoy.x, hitDecoy.y - 18, '🂠 DODGED · +1 CARD', FATE.mint);
        continue;
      }
      if (b.x < home.x - 60) { b.dead = true; continue; }
      air.fillStyle(ctx.tint(0xff5566), 0.95);
      air.fillCircle(b.x, b.y, 5);
    }
  });

  const shuffle = (at: number) => ctx.at(at, () => {
    // Aiming right at the foe, so "right of the aim" is straight down the screen.
    dashUntil = at + 190; dashVy = SHUFFLE_DIST * 0.55 / 0.19;
    s.av.play('dash', Math.PI / 2);
    s.fx.ring(home.x, home.y, 10, 34, FATE.mint, 260, 3, 5);
    for (let i = 0; i < 5; i++) {
      ctx.at(i * 38, () => decoys.push({ x: home.x, y: home.y, a: Math.PI / 2 + (Math.random() - 0.5) * 0.9, born: at + i * 38, dead: false }));
    }
  });
  const fire = (at: number, aimY: () => number) => ctx.at(at, () => {
    const a = Math.atan2(aimY() - foe.y, home.x - foe.x);
    shots.push({ x: foe.x, y: foe.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dead: false });
  });
  // The foe shoots where you were standing; you shuffle out and the decoys eat it.
  fire(600, () => home.y);
  shuffle(1050);
  fire(3000, () => home.y);
  ctx.at(3300, () => { home.y = ctx.h * 0.36; decoys.length = 0; });
  shuffle(3450);

  label(ctx, ctx.w * 0.5, ctx.h - 52,
    'a sidestep right of your aim, five decoy cards left behind · a decoy that is shot draws you a card',
    FATE.teal);
}

export const sideShuffle: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'E — sidestep, and leave decoy cards where you stood. Every one that gets shot is a free draw',
  run(ctx) { shuffleLoop(ctx, { face: false }); },
};

export const sideShuffleUpgraded: PreviewScript = {
  duration: 6000,
  scale: 0.9,
  bodyTexture: '',
  caption: 'Force the Hand of Fate — pick a face card at match start and the deck may only give you those',
  run(ctx) { shuffleLoop(ctx, { face: true }); },
};

// ── R — Dice of Doom ──────────────────────────────────────────────────

/** A die floating above the caster, rolling first and then holding its face. */
function heldDie(ctx: PreviewCtx, read: () => { face: number; rolledAt: number; at: Mark } | null): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(11));
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const d = read();
    if (!d) return;
    const t = elapsed / 1000;
    const rollT = Phaser.Math.Clamp((elapsed - d.rolledAt) / 520, 0, 1);
    const rolling = rollT < 1;
    const y = d.at.y - 50 + Math.sin(t * 4) * 2 - (rolling ? Math.sin(rollT * Math.PI) * 14 : 0);
    if (!rolling) {
      g.fillStyle(ctx.tint(FATE.gold), 0.18);
      g.fillCircle(d.at.x, y, 18);
    }
    FateFx.drawDie(g, ctx.tint, d.at.x, y, 17, rolling ? 1 + Math.floor((t * 22) % 6) : d.face,
      rolling ? rollT * 9 : 0, { tumble: rolling ? (rollT * 4) % 1 : 0, rim: rolling ? undefined : FATE.gold, shadow: false });
  });
}

function diceLoop(ctx: PreviewCtx, opts: { wonder: boolean }): void {
  const s = stageIt(ctx);
  const home: Mark = { x: ctx.cx, y: ctx.cy + 10 };
  const foe: Mark = { x: ctx.w * 0.8, y: ctx.h * 0.3 };
  dummy(ctx, foe);
  const barrier = CARDS.find((c) => c.type === 'barrier')!;
  const size = opts.wonder ? UPGRADED_HAND_SIZE : BASE_HAND_SIZE;
  const cards: HandCard[] = Array.from({ length: size }, () => randomCard());
  cards[1] = fresh(barrier);
  cards[0].uses = 1; cards[0].wear = 2;
  let selected = 1;
  hand(ctx, () => ({ cards, selected }));

  let die: { face: number; rolledAt: number; at: Mark } | null = null;
  heldDie(ctx, () => die);
  const roll = (at: number, face: number) => ctx.at(at, () => {
    die = { face, rolledAt: at, at: home };
    s.av.play('raise', -Math.PI / 2, 500);
  });

  // 1 — clicked: glyph the highlighted card.
  roll(300, 1);
  ctx.at(1300, () => {
    die = null;
    cards[1].enchanted = true;
    s.fx.chips(home.x, home.y - 50, 6, 26, 9, FATE.gold);
    s.fx.sparkle(home.x, home.y, 8, 30, 9, FATE.enchant);
    tick(ctx, home.x, home.y - 70, 'CLICK 1 · GLYPH: ×2', FATE.enchant);
  });
  // The glyphed Barrier — and with Wonder Glyphs, its 36 slow bullets.
  interface Bullet { a: number; r: number; speed: number }
  const bullets: Bullet[] = [];
  const bg = ctx.adopt(ctx.scene.add.graphics().setDepth(9));
  ctx.onFrame((dt) => {
    bg.clear();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.r += b.speed * dt / 1000;
      if (b.r > Math.max(ctx.w, ctx.h)) { bullets.splice(i, 1); continue; }
      bg.fillStyle(ctx.tint(barrier.color), 0.95);
      bg.fillCircle(home.x + Math.cos(b.a) * b.r, home.y + Math.sin(b.a) * b.r, 3.2);
    }
  });
  ctx.at(1900, () => {
    const count = opts.wonder ? 36 : 18;
    const speed = opts.wonder ? 70 : 260;
    for (let i = 0; i < count; i++) bullets.push({ a: (i / count) * Math.PI * 2, r: 14, speed });
    s.av.play('flex');
    s.fx.ring(home.x, home.y, 8, 44, barrier.color, 360, 4, 6);
    tick(ctx, home.x, home.y - 40, `🛡️ ${count} × 10 + 2 SHIELDS`, FATE.enchant);
    wearCard(ctx, s, cards, 1);
  });
  // 2 — clicked: repair the worn card.
  roll(2900, 2);
  ctx.at(3700, () => {
    die = null; selected = 0;
    cards[0].uses = CARD_USES; cards[0].wear = 0;
    s.fx.chips(home.x, home.y - 50, 6, 26, 9, FATE.gold);
    tick(ctx, home.x, home.y - 70, 'CLICK 2 · REPAIRED', FATE.gold);
  });
  // 6 — dragged: a very slow, very heavy die.
  roll(4400, 6);
  const shotG = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  let shot: { x: number; y: number; t0: number } | null = null;
  ctx.onFrame((_dt, elapsed) => {
    shotG.clear();
    if (!shot) return;
    const k = Phaser.Math.Clamp((elapsed - shot.t0) / 1600, 0, 1);
    const x = home.x + (foe.x - home.x) * k;
    const y = home.y - 50 + (foe.y - home.y + 50) * k;
    FateFx.drawDie(shotG, ctx.tint, x, y, 24, 6, elapsed / 300, { shadow: false });
    if (k >= 1) {
      shot = null;
      s.fx.payout(foe.x, foe.y, 56, { cards: 8, chips: 6, litter: false, depth: 9, face: FATE.gold, tones: HOUSE_TONES });
      tick(ctx, foe.x, foe.y - 16, '55', FATE.gold);
    }
  });
  ctx.at(5200, () => {
    die = null;
    shot = { x: home.x, y: home.y, t0: 5200 };
    s.av.play('punch', Math.atan2(foe.y - home.y, foe.x - home.x));
    tick(ctx, home.x, home.y - 70, 'DRAG 6 · 55 DAMAGE, VERY SLOW', FATE.gold);
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.wonder ? 'Wonder Glyphs — a glyphed card gets its own second gift · the hand is four wide'
      : 'click it, drag it, or keep it held — six faces, three uses each', FATE.gold);
}

export const diceOfDoom: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'R — roll a die over your head: click it for a boost, drag it to throw it, or hold it for a passive',
  run(ctx) { diceLoop(ctx, { wonder: false }); },
};

export const diceOfDoomUpgraded: PreviewScript = {
  duration: 7600,
  scale: 0.9,
  caption: 'Wonder Glyphs — glyphed cards gain a second gift (Barrier: 36 bullets, 300% slower) and a 4th card slot',
  run(ctx) { diceLoop(ctx, { wonder: true }); },
};

// ── F — Cursed Talisman ───────────────────────────────────────────────

function talismanLoop(ctx: PreviewCtx, opts: { hex: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.74, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  const burst = CARDS.find((c) => c.type === 'burst')!;
  const cards: HandCard[] = [fresh(burst), randomCard(), randomCard()];
  hand(ctx, () => ({ cards, selected: 0 }));
  const pullR = (opts.hex ? 170 : 110) * 0.55;
  const hp = opts.hex ? 66 : 33;

  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));
  let flyFrom = -1;
  let stuckAt = -1;
  let ang = Math.PI;
  const tal: Mark = { x: ctx.cx, y: ctx.cy };
  interface Shot { x: number; y: number; vx: number; vy: number; caught: number; spin: number; dead: boolean }
  const shots: Shot[] = [];
  ctx.onFrame((dt, elapsed) => {
    const step = dt / 1000;
    const t = elapsed / 1000;
    g.clear();
    if (flyFrom >= 0 && stuckAt < 0) {
      const k = Phaser.Math.Clamp((elapsed - flyFrom) / 420, 0, 1);
      tal.x = ctx.cx + (foe.x - ctx.cx) * k;
      tal.y = ctx.cy + (foe.y - ctx.cy) * k;
      FateFx.drawTalisman(g, ctx.tint, tal.x, tal.y, Math.PI, t);
      if (k >= 1) {
        stuckAt = elapsed;
        s.fx.ring(foe.x, foe.y, 10, 44, FATE.curse, 380, 4, 8);
        tick(ctx, foe.x, foe.y - 16, '12', FATE.curse);
        tick(ctx, foe.x, foe.y - 34, `🧧 CURSED · ${opts.hex ? 25 : 15}% CRITS`, FATE.great);
      }
    }
    if (stuckAt >= 0) {
      ang += step * 2.4;
      tal.x = foe.x + Math.cos(ang) * 24;
      tal.y = foe.y + Math.sin(ang) * 24;
      g.lineStyle(1, ctx.tint(FATE.great), 0.18);
      g.strokeCircle(tal.x, tal.y, pullR);
      FateFx.drawTalisman(g, ctx.tint, tal.x, tal.y, ang + Math.PI / 2, t, 0);
    }
    for (const b of shots) {
      if (b.dead) continue;
      if (b.caught < 0 && stuckAt >= 0 && Phaser.Math.Distance.Between(b.x, b.y, tal.x, tal.y) <= pullR) {
        b.caught = elapsed; b.spin = Math.atan2(b.y - tal.y, b.x - tal.x);
      }
      if (b.caught >= 0) {
        if (elapsed - b.caught < 340) {
          b.spin += 0.32;
          b.x = tal.x + Math.cos(b.spin) * 11; b.y = tal.y + Math.sin(b.spin) * 11;
        } else {
          b.dead = true;
          const crit = Math.random() < (opts.hex ? 0.25 : 0.15) * 2.5;
          tick(ctx, foe.x + (Math.random() - 0.5) * 20, foe.y - 14, crit ? '14 CRIT' : '7', crit ? FATE.great : burst.color);
          s.fx.cards(foe.x, foe.y, 2, { face: burst.color, tones: HOUSE_TONES, depth: 9 });
          continue;
        }
      } else {
        b.x += b.vx * step; b.y += b.vy * step;
        if (b.x > ctx.w + 10 || b.y < -10 || b.y > ctx.h + 10) { b.dead = true; continue; }
      }
      g.fillStyle(ctx.tint(burst.color), 0.95);
      g.fillCircle(b.x, b.y, 3.4);
    }
  });

  ctx.at(500, () => {
    flyFrom = 500;
    s.av.play('punch', Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx));
    s.fx.flick(ctx.cx, ctx.cy, Math.atan2(foe.y - ctx.cy, foe.x - ctx.cx), FATE.curse, 1, 9, TAROT_TONES);
  });
  // A Burst thrown wide of the foe — the talisman drags the pellets back in.
  for (let n = 0; n < 2; n++) {
    ctx.at(1800 + n * 1500, () => {
      const base = Math.atan2(foe.y - 40 - ctx.cy, foe.x - ctx.cx) - 0.18;
      for (const deg of [-24, -12, 0, 12, 24]) {
        const a = base + deg * Math.PI / 180;
        shots.push({ x: ctx.cx, y: ctx.cy, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, caught: -1, spin: 0, dead: false });
      }
      s.av.play('sweep', base);
      wearCard(ctx, s, cards, 0);
    });
  }

  label(ctx, ctx.w * 0.5, 12,
    `the curse orbits them · your shots within ${opts.hex ? 170 : 110}px are dragged in · ${hp} HP — they can shoot it off`,
    FATE.great);
}

export const cursedTalisman: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'F — a talisman sticks to the foe: 15% crits, and your near-misses are dragged in to hit',
  run(ctx) { talismanLoop(ctx, { hex: false }); },
};

export const cursedTalismanUpgraded: PreviewScript = {
  duration: 6200,
  scale: 0.9,
  caption: 'Hex Talisman — 66 HP, 25% crits, and it grabs your shots from 170px away',
  run(ctx) { talismanLoop(ctx, { hex: true }); },
};

// ── Q — All In! ───────────────────────────────────────────────────────

function allInLoop(ctx: PreviewCtx, opts: { roulette: boolean }): void {
  const s = stageIt(ctx);
  const foe: Mark = { x: ctx.w * 0.72, y: ctx.h * 0.36 };
  dummy(ctx, foe);
  const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
  cards[2].uses = 1; cards[2].wear = 2;
  const picked = new Set<number>();
  hand(ctx, () => ({ cards, selected: -1, wagered: picked }));

  const stakeHp = opts.roulette ? 40 : 0;
  const cardWorth = (c: HandCard) => (ALL_IN_PER_CARD + ALL_IN_PER_USE * c.uses) * (c.enchanted ? 2 : 1);
  let wager = 0;
  const orbitMs = opts.roulette ? ALL_IN_ORBIT_PLUS_MS : ALL_IN_ORBIT_MS;
  let spinFrom = -1;
  const wheel: Mark = { x: ctx.cx + ALL_IN_ORBIT_R * 0.5, y: ctx.cy };
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(10));

  // The health bar with the stake marker on it — the upgrade's whole interface.
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
    bar.fillStyle(ctx.tint(FATE.gold), 1);
    bar.fillRect(x + w - (w * stakeHp) / 200, y, (w * stakeHp) / 200, 5);
    bar.fillStyle(ctx.tint(FATE.glint), 1);
    bar.fillRect(x + w - (w * stakeHp) / 200 - 1, y - 3, 2, 11);
  });

  ctx.onFrame((_dt, elapsed) => {
    const t = elapsed / 1000;
    g.clear();
    if (spinFrom < 0) return;
    const a = Math.sin((elapsed - spinFrom) / 700) * 1.1 - 0.4;
    wheel.x = ctx.cx + Math.cos(a) * ALL_IN_ORBIT_R * 0.55;
    wheel.y = ctx.cy + Math.sin(a) * ALL_IN_ORBIT_R * 0.55;
    const ready = Phaser.Math.Clamp((elapsed - spinFrom) / orbitMs, 0, 1);
    FateFx.drawWheel(g, ctx.tint, wheel.x, wheel.y, ALL_IN_RADIUS * 0.55, t, ready, false, 1);
  });

  // Q opens the table, the cards are clicked onto it one by one, Q again bets them.
  ctx.at(300, () => { s.fx.ring(ctx.cx, ctx.cy, 70, 30, FATE.gold, 360, 3, 5); tick(ctx, ctx.cx, ctx.cy - 34, 'Q · PICK THE WAGER', FATE.gold); });
  [0, 1].forEach((i, k) => ctx.at(800 + k * 450, () => { picked.add(i); s.fx.sparkle(ctx.cx, ctx.cy - 10, 4, 16, 10, FATE.gold); }));
  const spinAt = 1900;
  ctx.at(spinAt, () => {
    const bet = [...picked].map((i) => cards[i]);
    wager = bet.reduce((n, c) => n + cardWorth(c), 0) + stakeHp;
    for (const i of [...picked].sort((a, b) => b - a)) cards.splice(i, 1);
    picked.clear();
    spinFrom = spinAt;
    s.av.play('raise', -Math.PI / 2, 900);
    s.fx.ante(ctx.cx, ctx.cy, 52, Math.min(1200, orbitMs), () => ({ x: ctx.cx, y: ctx.cy }), 5, HOUSE_TONES);
    s.fx.ring(ctx.cx, ctx.cy, 10, 96, FATE.gold, 480, 5, 5);
    tick(ctx, ctx.cx, ctx.cy - 34, `🎰 ALL IN! 2 CARDS${stakeHp ? ` + ${stakeHp} HP` : ''} = ${wager}`, FATE.gold);
  });
  ctx.at(spinAt + orbitMs, () => {
    spinFrom = -1;
    s.fx.payout(wheel.x, wheel.y, ALL_IN_RADIUS, { cards: 14, chips: 12, depth: 9, face: FATE.gold, tones: HOUSE_TONES });
    s.fx.dealtBeam(wheel.x, wheel.y, foe.x, foe.y, FATE.gold, 10, HOUSE_TONES, 6);
    ctx.scene.cameras.main.shake(180, 0.005);
    tick(ctx, foe.x, foe.y - 16, `${wager}`, FATE.gold);
  });

  label(ctx, ctx.w * 0.5, 12,
    opts.roulette ? `${ALL_IN_ORBIT_PLUS_MS / 1000}s of orbit, and HP staked on top of the cards — lost on a miss`
      : `each card is worth ${ALL_IN_PER_CARD} + ${ALL_IN_PER_USE} per use left · a miss throws them away`,
    FATE.gold);
}

export const allIn: PreviewScript = {
  duration: 6400,
  scale: 0.9,
  caption: 'Q — pick cards to wager and steer the wheel onto them. Land it for their worth, miss and they are gone',
  run(ctx) { allInLoop(ctx, { roulette: false }); },
};

export const allInUpgraded: PreviewScript = {
  duration: 8400,
  scale: 0.9,
  caption: 'Roulette Expert — stake HP on top of the cards with a marker on your bar, and two more seconds to aim',
  run(ctx) { allInLoop(ctx, { roulette: true }); },
};

// ── Passives ──────────────────────────────────────────────────────────

export const theHand: PreviewScript = {
  duration: 9000,
  scale: 0.9,
  caption: 'Three cards, dealt at random, one back every 2.5 seconds — and one of them is highlighted',
  run(ctx) {
    const s = stageIt(ctx);
    const cards: HandCard[] = Array.from({ length: BASE_HAND_SIZE }, () => randomCard());
    // The card thrown at the end is already on its last use, torn from the two before it.
    cards[2].uses = 1;
    cards[2].wear = CARD_USES - 1;
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
        selected = (i % 3) % Math.max(1, cards.length);
        s.fx.sparkle(ctx.cx, ctx.cy - 10, 4, 18, 10, FATE.mint);
      });
    }
    // A card spent, and the deck dealing one back on its own clock.
    ctx.at(4800, () => {
      const c = cards[selected];
      s.fx.flick(ctx.cx, ctx.cy, 0, c.def.color, 1, 8, HOUSE_TONES);
      wearCard(ctx, s, cards, selected);
      selected = 0;
      tick(ctx, ctx.cx, ctx.cy - 34, `${c.def.emoji} THROWN — LAST USE`, c.def.color);
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
  caption: 'Seventeen card types in one pool, and the Emperor is ten times rarer than any of them',
  run(ctx) {
    stageIt(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const texts = CARDS.map(() => ctx.adopt(ctx.scene.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setDepth(9)));

    // Every card in the pool, laid out — base nine on the top row, New Cards! below.
    ctx.onFrame((_dt, elapsed) => {
      const t = elapsed / 1000;
      g.clear();
      CARDS.forEach((c, i) => {
        const row = c.nu ? 1 : 0;
        const col = c.nu ? i - 9 : i;
        const per = c.nu ? 8 : 9;
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

    label(ctx, ctx.w * 0.5, ctx.h * 0.4 - 30, 'the base nine — always drawable', FATE.mint);
    label(ctx, ctx.w * 0.5, ctx.h * 0.74 - 30, 'New Cards! — only with the Click upgrade', FATE.gold);
    label(ctx, ctx.w * 0.5, ctx.h - 10,
      '👑 Emperor is 10× rarer than anything else · 🪙 💚 💪 deal no damage at all', FATE.teal);
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
    cards[2] = fresh(striker);
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
      // A second Tarot is refused outright rather than stacking.
      tick(ctx, home.x, home.y - 34, '🔮 ALREADY GREATLY ENCHANTED', FATE.enchant);
    });

    ctx.at(4000, () => {
      selected = 2;
      throwCard(ctx, s, home, foe, cards[2]);
      cards[2].great = false;
      cards[2].curse = -1;
      wearCard(ctx, s, cards, 2);
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
