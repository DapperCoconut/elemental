import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Fate renders: the card-sharp avatar (chip ball hands, a fan
 * of cards worn as a crown, eyes), the luck auras, and the one-shot effects every card fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes fate
 * fate: the card, the suits, the chips, and the effects built out of them.
 *
 * Structural colours must come from the FATE palette below. The one deliberate exception is a
 * card's *face* colour, which is gameplay data — `FATE_CARD_DEFS` gives each of the eighteen
 * cards its own hue so a hand is readable at a glance, and those hues are passed in by the
 * caller. Everything else (stock, ink, rim, gold, felt, sheen) is palette.
 *
 * Fate has no skin yet, but every call still routes through the owner's
 * `fateColor` mapper, so the day one lands it is a table edit in SkinsKit rather than a
 * sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.fateColor bound to one owner. */
export type FateColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const FATE = {
  /** The table everything is played on. */
  felt: 0x0d3b2e,
  shade: 0x061c15,
  /** The element's own mint. */
  mint: 0x88eecc,
  jade: 0x44bb99,
  teal: 0x2a8870,
  /** Card stock. */
  bone: 0xf2eddd,
  ivory: 0xfffdf4,
  /** Card edge and back. */
  ash: 0x191922,
  back: 0x2b2140,
  backLine: 0x6a4fa8,
  /** Gilding — rims, chips, the winning side of every roll. */
  gold: 0xffcc44,
  brass: 0xa07018,
  glint: 0xfff3c4,
  /** Suit inks. */
  ink: 0x14141c,
  blood: 0xcc2233,
  /** Enchant, great enchant (Tarot) and the curses that ride along with it. */
  enchant: 0xaa44ff,
  great: 0xff33cc,
  curse: 0x7733cc,
  white: 0xffffff,
} as const;

/** One coherent set of card-stock shades. */
export interface CardTones {
  /** Drop shadow under the card. */
  shadow: number;
  /** Cut edge / border of the card. */
  edge: number;
  /** Blank stock, when no face colour is given. */
  stock: number;
  /** Gilded rim inside the edge. */
  rim: number;
  /** Specular sweep across the face. */
  sheen: number;
}

/** The player deals crisp, gilt-edged cards. */
export const HOUSE_TONES: CardTones = {
  shadow: FATE.shade, edge: FATE.ash, stock: FATE.bone, rim: FATE.gold, sheen: FATE.ivory,
};
/** The NPC's deck is darker stock with a cold rim, so two fate fighters never blur together. */
export const NPC_TONES: CardTones = {
  shadow: 0x0a0a12, edge: 0x0d0d14, stock: 0x9fb0c8, rim: FATE.mint, sheen: 0xdff3ff,
};
/** Tarot: a greatly-enchanted card is visibly a different object, not a brighter one. */
export const TAROT_TONES: CardTones = {
  shadow: 0x1a0022, edge: 0x3a0a4a, stock: 0x2a1040, rim: FATE.great, sheen: 0xffb3ec,
};

export const tonesFor = (owner: 'player' | 'npc'): CardTones =>
  (owner === 'player' ? HOUSE_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

export interface Pt { x: number; y: number }

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export const SUITS: readonly Suit[] = ['spade', 'heart', 'diamond', 'club'] as const;
/** Hearts and diamonds are red; spades and clubs are black. Real decks, real rule. */
export const suitInk = (s: Suit): number => (s === 'heart' || s === 'diamond' ? FATE.blood : FATE.ink);

/**
 * The corner points of a card: a chamfered rectangle, rotated, and narrowed by `spin`.
 *
 * `spin` is the whole trick. It runs -1 → 1 and scales the card's *width* only, so a card
 * animating its spin from 1 through 0 to -1 turns edge-on and comes back showing its other face.
 * Without it a thrown card is a rectangle sliding across the screen; with it, it tumbles, and
 * that tumble is the entire identity of this element's projectiles.
 */
export function cardPoly(
  cx: number, cy: number, angle: number, w: number, h: number, spin = 1,
): Pt[] {
  const hw = (w / 2) * Math.abs(spin);
  const hh = h / 2;
  // Chamfer scales with the card so small pips don't lose their corners entirely.
  const c = Math.min(hw, hh) * 0.26;
  const local: Pt[] = [
    { x: -hw + c, y: -hh }, { x: hw - c, y: -hh },
    { x: hw, y: -hh + c }, { x: hw, y: hh - c },
    { x: hw - c, y: hh }, { x: -hw + c, y: hh },
    { x: -hw, y: hh - c }, { x: -hw, y: -hh + c },
  ];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return local.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

function fillPoly(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePoly(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

/** A suit glyph, drawn as a real shape rather than a text pip so it scales and rotates cleanly. */
export function suitGlyph(
  g: Phaser.GameObjects.Graphics, suit: Suit, cx: number, cy: number, size: number, angle = 0,
): void {
  const s = size;
  const at = (lx: number, ly: number): Pt => {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
  };
  const disc = (lx: number, ly: number, r: number) => {
    const p = at(lx, ly);
    g.fillCircle(p.x, p.y, r);
  };
  const tri = (a: Pt, b: Pt, c: Pt) => {
    g.beginPath();
    g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y);
    g.closePath(); g.fillPath();
  };

  switch (suit) {
    case 'diamond':
      tri(at(0, -s), at(s * 0.62, 0), at(0, s));
      tri(at(0, -s), at(-s * 0.62, 0), at(0, s));
      break;
    case 'heart':
      disc(-s * 0.34, -s * 0.26, s * 0.42);
      disc(s * 0.34, -s * 0.26, s * 0.42);
      tri(at(-s * 0.74, -s * 0.06), at(s * 0.74, -s * 0.06), at(0, s));
      break;
    case 'spade':
      // A heart stood on its head, plus a stem — which is exactly what a spade is.
      disc(-s * 0.34, s * 0.22, s * 0.42);
      disc(s * 0.34, s * 0.22, s * 0.42);
      tri(at(-s * 0.74, s * 0.04), at(s * 0.74, s * 0.04), at(0, -s));
      tri(at(-s * 0.3, s), at(s * 0.3, s), at(0, s * 0.34));
      break;
    case 'club':
      disc(0, -s * 0.38, s * 0.4);
      disc(-s * 0.42, s * 0.16, s * 0.4);
      disc(s * 0.42, s * 0.16, s * 0.4);
      tri(at(-s * 0.28, s), at(s * 0.28, s), at(0, s * 0.16));
      break;
  }
}

export interface CardLayerOpts {
  /** Face colour — the card's gameplay identity. Falls back to blank stock. */
  face?: number;
  /** Suit printed on the face. Omit for a blank/back card. */
  suit?: Suit;
  /** Draw the patterned back instead of a face. Used for cards turned edge-past-on. */
  faceDown?: boolean;
  /** Gilded rim. Default true. */
  rim?: boolean;
  /** Drop shadow beneath. Default true. */
  shadow?: boolean;
}

/**
 * A layered card: shadow, cut edge, face stock, gilded rim, suit pip, and a specular sweep.
 *
 * The sweep is what stops a card reading as a coloured tile. A real card is glossy, so the light
 * runs across it as it turns, and that highlight moving is most of what sells the tumble.
 */
export function fateCardLayered(
  g: Phaser.GameObjects.Graphics,
  tint: FateColorFn, tones: CardTones,
  cx: number, cy: number, angle: number, w: number, h: number, spin: number,
  alpha: number,
  opts: CardLayerOpts = {},
): void {
  const narrow = Math.abs(spin);
  if (narrow < 0.03) {
    // Dead edge-on: a bright sliver, which is all a real card shows at that angle.
    const pts = cardPoly(cx, cy, angle, Math.max(1.2, w * 0.06), h, 1);
    g.fillStyle(tint(tones.rim), alpha);
    fillPoly(g, pts);
    return;
  }

  if (opts.shadow !== false) {
    g.fillStyle(tint(tones.shadow), alpha * 0.35);
    fillPoly(g, cardPoly(cx + 2, cy + 3, angle, w, h, spin));
  }

  g.fillStyle(tint(tones.edge), alpha * 0.95);
  fillPoly(g, cardPoly(cx, cy, angle, w, h, spin));

  // Turned past edge-on we are looking at the back of the card, which is patterned, not blank.
  const showingBack = opts.faceDown ?? spin < 0;
  if (showingBack) {
    g.fillStyle(tint(FATE.back), alpha);
    fillPoly(g, cardPoly(cx, cy, angle, w * 0.86, h * 0.88, spin));
    g.lineStyle(1.1, tint(FATE.backLine), alpha * 0.85);
    strokePoly(g, cardPoly(cx, cy, angle, w * 0.62, h * 0.74, spin));
    strokePoly(g, cardPoly(cx, cy, angle, w * 0.34, h * 0.5, spin));
  } else {
    g.fillStyle(tint(opts.face ?? tones.stock), alpha);
    fillPoly(g, cardPoly(cx, cy, angle, w * 0.86, h * 0.88, spin));
    if (opts.rim !== false) {
      g.lineStyle(1.2, tint(tones.rim), alpha * 0.85);
      strokePoly(g, cardPoly(cx, cy, angle, w * 0.7, h * 0.78, spin));
    }
    if (opts.suit && narrow > 0.35) {
      g.fillStyle(tint(suitInk(opts.suit)), alpha * 0.95);
      suitGlyph(g, opts.suit, cx, cy, Math.min(w, h) * 0.24 * narrow, angle);
    }
  }

  // Specular sweep across the upper flank, riding the card's own rotation.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const hw = (w / 2) * narrow, hh = h / 2;
  const sheen: Pt[] = [
    { x: -hw * 0.7, y: -hh * 0.9 }, { x: hw * 0.15, y: -hh * 0.9 },
    { x: -hw * 0.35, y: hh * 0.9 }, { x: -hw * 0.85, y: hh * 0.9 },
  ].map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }));
  g.fillStyle(tint(tones.sheen), alpha * 0.22);
  fillPoly(g, sheen);
}

/** A casino chip: notched rim, inset face, centre pip. Fate's other unit of currency. */
export function fateChip(
  g: Phaser.GameObjects.Graphics, tint: FateColorFn,
  cx: number, cy: number, r: number, color: number, alpha: number, spin = 0,
): void {
  g.fillStyle(tint(FATE.shade), alpha * 0.35);
  g.fillCircle(cx + 1, cy + 2, r);
  g.fillStyle(tint(color), alpha);
  g.fillCircle(cx, cy, r);
  // Six notches around the rim — the read that says "chip" rather than "coin".
  for (let i = 0; i < 6; i++) {
    const a = spin + (i / 6) * TAU;
    g.fillStyle(tint(FATE.ivory), alpha * 0.9);
    g.fillCircle(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82, r * 0.19);
  }
  g.lineStyle(Math.max(0.8, r * 0.16), tint(FATE.ivory), alpha * 0.8);
  g.strokeCircle(cx, cy, r * 0.6);
  g.fillStyle(tint(FATE.ivory), alpha * 0.55);
  g.fillCircle(cx, cy, r * 0.34);
  g.fillStyle(tint(color), alpha);
  g.fillCircle(cx, cy, r * 0.24);
}

export interface CardBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  fall?: number;
  face?: number;
  tones?: CardTones;
}

export interface DealtHandOpts {
  /** Cards flung out of the blast. Defaults to radius/12. */
  cards?: number;
  /** Chips flung clear. Defaults to radius/16. */
  chips?: number;
  /** Leave scattered cards face-down on the floor. Default true. */
  litter?: boolean;
  depth?: number;
  duration?: number;
  face?: number;
  tones?: CardTones;
}

// ── FateFx ────────────────────────────────────────────────────────────────

/**
 * One-shot fate effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class FateFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: FateColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Blown-out core — the first two frames of any real impact. */
  // `color: number` is spelled out on every one of these: without it TypeScript infers the
  // literal type of the FATE default and refuses every other palette entry at the call site.
  flash(x: number, y: number, radius: number, depth = 7, color: number = FATE.glint): void {
    this.flashIn(x, y, radius, FATE.ivory, color, depth);
  }

  /**
   * Expanding front, drawn as a ring of card edges standing on end that rotates as it grows —
   * a dealt circle rather than a shockwave. Fate's fronts are *arranged*, because everything
   * this element does is a hand being laid out.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const cards = Phaser.Math.Clamp(Math.round(toR / 14), 8, 30);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      const spin = t * 1.2;
      for (let i = 0; i < cards; i++) {
        const a = spin + (i / cards) * TAU;
        const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
        g.fillStyle(c, 0.7 * fade);
        fillPoly(g, cardPoly(cx, cy, a + Math.PI / 2, Math.max(2, width * 1.1), width * 3.4, 1));
      }
      g.lineStyle(Math.max(0.5, width * 0.5 * (1 - t * 0.6)), c, 0.5 * fade);
      g.strokeCircle(x, y, r);
    });
  }

  /** Gold sparkles — the tell for luck, enchantment and anything that just paid out. */
  sparkle(x: number, y: number, count: number, radius: number, depth = 9, color: number = FATE.gold): void {
    const motes = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.6,
      oy: (Math.random() - 0.5) * radius * 1.3,
      drift: (Math.random() - 0.5) * 26,
      r: 1.6 + Math.random() * 2.4,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 900, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const cx = x + m.ox + m.drift * lt;
        const cy = y + m.oy - 22 * lt;
        const tw = Math.max(0, Math.sin(t * 13 + m.phase));
        if (tw <= 0.02) continue;
        // Four-point star: two crossed slivers, which is what a highlight actually looks like.
        g.fillStyle(this.tint(color), 0.9 * (1 - lt) * tw);
        fillPoly(g, cardPoly(cx, cy, 0, m.r * 5 * tw, m.r * 0.7, 1));
        fillPoly(g, cardPoly(cx, cy, Math.PI / 2, m.r * 5 * tw, m.r * 0.7, 1));
        g.fillStyle(this.tint(FATE.ivory), (1 - lt) * tw);
        g.fillCircle(cx, cy, m.r * 0.5);
      }
    });
  }

  /** Cards flung out of something, tumbling end over end and sinking as they go. */
  cards(x: number, y: number, count: number, opts: CardBurstOpts = {}): void {
    const tones = opts.tones ?? HOUSE_TONES;
    const speed = opts.speed ?? 170;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 9;
    const life = opts.life ?? 560;
    const fall = opts.fall ?? 46;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.45 + Math.random() * 0.9),
        s: size * (0.7 + Math.random() * 0.6),
        tumble: (Math.random() - 0.5) * 22,
        lean: Math.random() * TAU,
        suit: SUITS[i % SUITS.length],
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + fall * lt * lt;
        const fade = 1 - lt * lt;
        fateCardLayered(
          g, this.tint, tones, ex, ey, p.lean + p.tumble * lt * 0.4,
          p.s * 0.72, p.s, Math.cos(p.lean + p.tumble * lt), 0.92 * fade,
          { face: opts.face, suit: p.suit, shadow: false },
        );
      }
    });
  }

  /** Chips flung clear of a payout, bouncing once off the floor. */
  chips(x: number, y: number, count: number, radius: number, depth = 6, color: number = FATE.gold): void {
    const parts = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: radius * (1.1 + Math.random() * 1.4),
        r: 3 + Math.random() * 2.6,
        spin: (Math.random() - 0.5) * 14,
        delay: Math.random() * 0.2,
      };
    });
    this.anim(depth, 620, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt);
        // One bounce: the arc dips, kicks, and settles.
        const hop = Math.abs(Math.sin(lt * Math.PI * 1.6)) * (1 - lt) * 22;
        fateChip(g, this.tint, x + p.cos * d, y + p.sin * d * 0.7 + 26 * lt * lt - hop,
          p.r, color, 1 - lt * lt, p.spin * lt);
      }
    });
  }

  /** Cards left face-down on the floor where something happened, then swept away. */
  litter(x: number, y: number, radius: number, depth = 1, tones: CardTones = HOUSE_TONES): void {
    const bits = Array.from({ length: 9 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.85;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7,
        ang: Math.random() * TAU,
        s: radius * (0.13 + Math.random() * 0.1),
      };
    });
    this.anim(depth, 2000, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(FATE.shade), 0.28 * a);
      g.fillEllipse(x, y, radius * 1.5, radius * 0.9);
      for (const b of bits) {
        fateCardLayered(g, this.tint, tones, b.x, b.y, b.ang, b.s * 0.72, b.s, 1, 0.8 * a,
          { faceDown: true, shadow: false });
      }
    });
  }

  /**
   * The body of a payout: a rosette of cards fanning out of the point, holding, then flying
   * apart. Reads as a hand being thrown down rather than as a disc being scaled.
   */
  fan(x: number, y: number, radius: number, duration: number, depth = 6, tones: CardTones = HOUSE_TONES, face?: number): void {
    const leaves = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      len: 0.62 + (i % 3) * 0.14,
      suit: SUITS[i % SUITS.length],
      delay: (i % 4) * 0.05,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      for (const l of leaves) {
        const lt = Math.max(0, (t - l.delay) / (1 - l.delay));
        const d = radius * l.len * easeOut(Math.min(1, lt * 2.2));
        if (d < 2) continue;
        fateCardLayered(
          g, this.tint, tones,
          x + Math.cos(l.ang) * d, y + Math.sin(l.ang) * d,
          l.ang + Math.PI / 2, radius * 0.22, radius * 0.32,
          Math.cos(lt * 5 + l.ang), 0.92 * fade,
          { face, suit: l.suit, shadow: false },
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(FATE.ivory), (1 - t / 0.4) * 0.85);
        g.fillCircle(x, y, radius * 0.15);
      }
    });
  }

  /** White core + card fan + rings + flung cards + chips + litter. Fate's full detonation. */
  payout(x: number, y: number, radius: number, opts: DealtHandOpts = {}): void {
    const tones = opts.tones ?? HOUSE_TONES;
    const cardCount = opts.cards ?? Math.max(6, Math.round(radius / 12));
    const chipCount = opts.chips ?? Math.max(3, Math.round(radius / 16));
    const dur = opts.duration ?? Math.round(340 + radius * 1.2);
    const depth = opts.depth ?? 6;

    if (opts.litter !== false) this.litter(x, y, radius * 0.6, 1, tones);
    this.fan(x, y, radius * 0.75, dur, depth, tones, opts.face);
    this.flash(x, y, radius * 0.3, depth + 2, opts.face ?? FATE.gold);
    this.ring(x, y, radius * 0.2, radius * 1.05, opts.face ?? FATE.gold, Math.round(dur * 0.72), 4.5, depth);
    this.scene.time.delayedCall(80, () =>
      this.ring(x, y, radius * 0.15, radius * 1.3, FATE.mint, dur, 3, depth));
    this.cards(x, y, cardCount, {
      speed: radius * 2.1, size: 8 + radius / 26,
      life: Math.round(dur * 1.3), fall: radius * 0.6, depth, tones, face: opts.face,
    });
    this.chips(x, y, chipCount, radius * 0.9, depth, opts.face ?? FATE.gold);
    this.sparkle(x, y, Math.max(3, Math.round(radius / 18)), radius * 0.8, depth + 1);
  }

  /**
   * A dealt line: cards streaming from one point to another along the beam, each turning as it
   * flies. Used for hitscan cards and coin reflections, so a beam still looks dealt rather than
   * fired.
   */
  dealtBeam(
    x1: number, y1: number, x2: number, y2: number,
    color: number, depth = 9, tones: CardTones = HOUSE_TONES, width = 4,
  ): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Phaser.Math.Clamp(Math.round(dist / 34), 2, 26);
    this.anim(depth, 260, (g, t) => {
      const fade = 1 - easeIn(t);
      g.lineStyle(width * 2.2, this.tint(color), 0.18 * fade);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(width * 0.7, this.tint(FATE.ivory), 0.8 * fade);
      g.lineBetween(x1, y1, x2, y2);
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        // A wave of cards runs down the line from the caster to the target.
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.7 - f) * 3.2, 0, 1);
        if (local <= 0) continue;
        fateCardLayered(
          g, this.tint, tones, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f,
          ang, 12 * local, 16 * local, Math.cos(t * 16 + i), 0.9 * local,
          { face: color, suit: SUITS[i % SUITS.length], shadow: false },
        );
      }
    });
    this.sparkle(x2, y2, 5, 18, depth + 1, color);
  }

  /**
   * Recoil flourish at the throwing hand: the played card leading, two ghosts of it trailing,
   * all three tumbling. `suit` is the played card's own pip, so the thing that leaves your hand
   * is visibly the thing that was sitting in your hand.
   */
  flick(
    x: number, y: number, angle: number, color: number,
    scale = 1, depth = 8, tones: CardTones = HOUSE_TONES, suit: Suit = 'spade',
  ): void {
    this.anim(depth, 170, (g, t) => {
      const fade = 1 - t;
      for (const s of [-1, 1, 0]) {
        const a = angle + s * 0.4;
        // The real card flies furthest and fastest; the flanking pair are its wake.
        const lead = s === 0 ? 1.5 : 1;
        const d = 16 * scale * (0.4 + t * 1.3) * lead;
        fateCardLayered(
          g, this.tint, tones,
          x + Math.cos(a) * d, y + Math.sin(a) * d, a,
          11 * scale * lead, 15 * scale * lead, Math.cos(t * 9 + s),
          (s === 0 ? 0.95 : 0.5) * fade,
          { face: color, suit, shadow: false },
        );
      }
      g.fillStyle(this.tint(FATE.ivory), 0.75 * fade);
      g.fillCircle(x, y, 4 * scale * (1 - t * 0.4));
    });
  }

  /**
   * A riffle: the whole deck springing from one hand to the other in an arc. This is Reroll's
   * signature — nothing else in the game shuffles, so it only ever means "new hand".
   */
  riffle(x: number, y: number, radius = 46, depth = 10, tones: CardTones = HOUSE_TONES): void {
    const n = 16;
    this.anim(depth, 520, (g, t) => {
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      for (let i = 0; i < n; i++) {
        // Each card leaves on its own beat and arcs over the top.
        const lt = Phaser.Math.Clamp(t * 1.5 - (i / n) * 0.5, 0, 1);
        if (lt <= 0) continue;
        const a = Math.PI * (0.15 + lt * 0.7);
        const cx = x + Math.cos(Math.PI - a) * radius;
        const cy = y - Math.sin(a) * radius * 0.8 - 6;
        fateCardLayered(
          g, this.tint, tones, cx, cy, -a * 0.7 + 0.4, 13, 18,
          Math.cos(lt * 7 + i), 0.95 * fade,
          { suit: SUITS[i % SUITS.length], faceDown: i % 3 === 0, shadow: false },
        );
      }
    });
    this.sparkle(x, y - 24, 6, 34, depth + 1, FATE.mint);
  }

  /**
   * Inward-gathering wager: cards spiralling in toward a growing pot while a ring of chips
   * closes around it. `follow` lets it track a caster who can still move.
   */
  ante(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: CardTones = HOUSE_TONES,
  ): void {
    const feeds = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU,
      spin: 0.7 + (i % 3) * 0.3,
      phase: i / 10,
      suit: SUITS[i % SUITS.length],
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;

      for (const f of feeds) {
        const lt = (t * (1 + f.phase) + f.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = f.ang + t * f.spin * TAU;
        fateCardLayered(
          g, this.tint, tones, cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          a + Math.PI / 2, 11 * (1 - lt * 0.4), 15 * (1 - lt * 0.4),
          Math.cos(lt * 9), 0.85 * (1 - lt * 0.5),
          { suit: f.suit, shadow: false },
        );
      }

      // The pot in the middle, growing as the ante builds.
      const pot = radius * (0.1 + easeIn(t) * 0.28);
      for (let i = 0; i < 4; i++) {
        fateChip(g, this.tint, cx, cy - i * 3 * easeIn(t), pot * 0.6, FATE.gold, 0.95, t * 2 + i);
      }
      g.lineStyle(2.4, this.tint(FATE.mint), 0.4 + 0.45 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.5));
    });
  }

  /**
   * A slot machine cabinet: a gilt housing, three reels turning at different rates, a payline,
   * and a lever that kicks when the reels are close to stopping. Painted into a caller-owned
   * Graphics because the kit already drives its position and its damage meter.
   */
  static drawSlotMachine(
    g: Phaser.GameObjects.Graphics, tint: FateColorFn,
    x: number, y: number, t: number, fill: number, alpha = 1,
  ): void {
    const w = 44, h = 52;
    g.fillStyle(tint(FATE.shade), 0.35 * alpha);
    g.fillEllipse(x, y + h * 0.5, w * 1.2, 12);

    // Cabinet.
    g.fillStyle(tint(FATE.brass), alpha);
    fillPoly(g, cardPoly(x, y, 0, w, h, 1));
    g.fillStyle(tint(FATE.gold), alpha);
    fillPoly(g, cardPoly(x, y - 1, 0, w * 0.88, h * 0.9, 1));
    g.fillStyle(tint(FATE.ash), alpha);
    fillPoly(g, cardPoly(x, y - 4, 0, w * 0.74, h * 0.44, 1));

    // Three reels, each turning at its own rate so the machine never looks like one dial.
    const symbols: Suit[] = ['spade', 'heart', 'diamond', 'club'];
    for (let r = 0; r < 3; r++) {
      const rx = x + (r - 1) * (w * 0.24);
      const spin = t * (1.4 + r * 0.55);
      const idx = Math.floor(spin) % symbols.length;
      const frac = spin % 1;
      g.fillStyle(tint(FATE.bone), alpha);
      fillPoly(g, cardPoly(rx, y - 4, 0, w * 0.2, h * 0.38, 1));
      // Two symbols sliding through the window — the outgoing one and the incoming one.
      for (const [k, off] of [[idx, -frac], [(idx + 1) % symbols.length, 1 - frac]] as const) {
        const sy = y - 4 + off * h * 0.34;
        if (Math.abs(sy - (y - 4)) > h * 0.2) continue;
        g.fillStyle(tint(suitInk(symbols[k])), alpha * 0.95);
        suitGlyph(g, symbols[k], rx, sy, 4.4);
      }
    }
    // Payline.
    g.lineStyle(1.4, tint(FATE.blood), alpha * 0.9);
    g.lineBetween(x - w * 0.34, y - 4, x + w * 0.34, y - 4);

    // Damage meter along the base, and a lever that jerks as it approaches a roll.
    g.fillStyle(tint(FATE.ash), alpha * 0.9);
    g.fillRect(x - w * 0.36, y + h * 0.24, w * 0.72, 5);
    g.fillStyle(tint(fill >= 1 ? FATE.great : FATE.gold), alpha);
    g.fillRect(x - w * 0.36, y + h * 0.24, w * 0.72 * Phaser.Math.Clamp(fill, 0, 1), 5);

    const kick = fill > 0.75 ? Math.sin(t * 18) * 0.35 : 0;
    const lx = x + w * 0.56;
    g.lineStyle(3, tint(FATE.brass), alpha);
    g.lineBetween(lx, y + 6, lx + Math.sin(0.5 + kick) * 10, y + 6 - Math.cos(0.5 + kick) * 18);
    g.fillStyle(tint(FATE.blood), alpha);
    g.fillCircle(lx + Math.sin(0.5 + kick) * 10, y + 6 - Math.cos(0.5 + kick) * 18, 4);
  }

  /**
   * A coin hanging in the air, turning on its vertical axis. The perspective narrowing is what
   * makes it read as a coin at all — an un-turning gold disc is just a dot.
   */
  static drawCoin(
    g: Phaser.GameObjects.Graphics, tint: FateColorFn,
    x: number, y: number, r: number, t: number, alpha = 1, paired = false,
  ): void {
    const spin = Math.cos(t * 5);
    const narrow = Math.abs(spin);

    g.fillStyle(tint(FATE.shade), 0.3 * alpha);
    g.fillEllipse(x, y + r * 1.6, r * 1.6, r * 0.5);

    // Rim, then face, then the milled edge showing when it turns away.
    g.fillStyle(tint(FATE.brass), alpha);
    g.fillEllipse(x, y, r * 2 * Math.max(0.14, narrow), r * 2);
    g.fillStyle(tint(FATE.gold), alpha);
    g.fillEllipse(x, y, r * 1.62 * Math.max(0.1, narrow), r * 1.62);
    if (narrow > 0.4) {
      g.fillStyle(tint(spin > 0 ? FATE.blood : FATE.ink), alpha * 0.9);
      suitGlyph(g, spin > 0 ? 'heart' : 'spade', x, y, r * 0.5 * narrow);
    }
    g.fillStyle(tint(FATE.glint), alpha * 0.8);
    g.fillEllipse(x - r * 0.3 * narrow, y - r * 0.4, r * 0.4 * narrow, r * 0.7);

    if (paired) {
      // A paired coin is worth 4×, so it wears a ring of sparks to say so.
      for (let i = 0; i < 4; i++) {
        const a = t * 2.4 + (i / 4) * TAU;
        g.fillStyle(tint(FATE.mint), alpha * 0.85);
        g.fillCircle(x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1, 1.8);
      }
    }
  }

  /**
   * The All In wheel: a roulette head with alternating red/black pockets, a ball riding the rim
   * and a ring that tightens as the bet comes due. `armed` swaps the whole thing to the
   * Cocky-curse red, because that version is wagering the entire health bar.
   */
  static drawWheel(
    g: Phaser.GameObjects.Graphics, tint: FateColorFn,
    x: number, y: number, r: number, t: number, ready: number, cocky: boolean, alpha = 1,
  ): void {
    const spin = t * (1 + ready * 4);
    const pockets = 16;

    g.fillStyle(tint(FATE.shade), 0.4 * alpha);
    g.fillCircle(x, y, r);
    for (let i = 0; i < pockets; i++) {
      const a0 = spin + (i / pockets) * TAU;
      const a1 = spin + ((i + 1) / pockets) * TAU;
      g.fillStyle(tint(i % 2 === 0 ? FATE.blood : FATE.ink), 0.85 * alpha);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, r, a0, a1, false);
      g.closePath();
      g.fillPath();
    }
    // Hub and frets.
    g.fillStyle(tint(FATE.brass), alpha);
    g.fillCircle(x, y, r * 0.32);
    g.fillStyle(tint(FATE.gold), alpha);
    g.fillCircle(x, y, r * 0.2);
    g.lineStyle(2.4, tint(cocky ? FATE.blood : FATE.gold), 0.95 * alpha);
    g.strokeCircle(x, y, r);

    // The ball, running the rim faster the closer the wager is to resolving.
    const ba = -t * (4 + ready * 9);
    g.fillStyle(tint(FATE.ivory), alpha);
    g.fillCircle(x + Math.cos(ba) * r * 0.84, y + Math.sin(ba) * r * 0.84, r * 0.11);

    // Countdown ring closing in on the wheel.
    g.lineStyle(3, tint(cocky ? FATE.blood : FATE.mint), (0.35 + ready * 0.5) * alpha);
    g.beginPath();
    g.arc(x, y, r * 1.18, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(ready, 0, 1), false);
    g.strokePath();
  }

  /**
   * A tumbling card in flight — boomerangs, bombs and snowballs are all just cards with
   * different faces, which is exactly the read this element wants.
   */
  static drawFlyingCard(
    g: Phaser.GameObjects.Graphics, tint: FateColorFn, tones: CardTones,
    x: number, y: number, heading: number, size: number, t: number, face: number, suit: Suit, alpha = 1,
  ): void {
    g.fillStyle(tint(face), 0.18 * alpha);
    g.fillCircle(x, y, size * 1.5);
    fateCardLayered(g, tint, tones, x, y, heading, size * 0.74, size, Math.cos(t * 9), alpha,
      { face, suit });
  }

  /**
   * A curse bullet: a card sealed shut with a curse sigil, trailing violet smoke. Sealed, not
   * blank, because the whole point is that the player cannot see what is coming.
   */
  static drawCurseBullet(
    g: Phaser.GameObjects.Graphics, tint: FateColorFn,
    x: number, y: number, heading: number, t: number,
  ): void {
    g.fillStyle(tint(FATE.curse), 0.22);
    g.fillCircle(x, y, 13);
    fateCardLayered(g, tint, TAROT_TONES, x, y, heading, 9, 13, Math.cos(t * 7), 0.95,
      { faceDown: true, shadow: false });
    // Sigil: a slowly turning cross of slivers over the sealed back.
    for (let i = 0; i < 3; i++) {
      const a = t * 1.8 + (i / 3) * Math.PI;
      g.fillStyle(tint(FATE.great), 0.9);
      fillPoly(g, cardPoly(x, y, a, 11, 1.4, 1));
    }
  }
}

// ── FateAura ──────────────────────────────────────────────────────────────

export type FateAuraStyle =
  | 'buff'     // Buff card: suits orbiting on a rising spiral
  | 'lucky'    // Enchanted hand: gold sparks and a gilt ring
  | 'tarot'    // Greatly enchanted: the Tarot ring, magenta and unmistakable
  | 'poison';  // Infect: a sickly drip clinging to the victim

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The four styles differ in *shape*: buff climbs, lucky glitters, tarot rotates a sealed ring,
 * poison sags and drips. Two can be up at once, so they must stay distinguishable.
 */
export class FateAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;

  constructor(
    scene: Phaser.Scene,
    private tint: FateColorFn,
    private style: FateAuraStyle,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = this.intensity;
    const r = this.radius;

    switch (this.style) {
      case 'buff': {
        g.fillStyle(this.tint(FATE.enchant), 0.1 * k * alpha);
        g.fillCircle(x, y, r);
        // Suits climbing a spiral around the body — a buff that visibly lifts you.
        for (let i = 0; i < 6; i++) {
          const p = (this.t * 0.7 + i / 6) % 1;
          const a = this.t * 2 + (i / 6) * TAU;
          const lift = (p - 0.5) * r * 1.7;
          const wide = Math.cos(a) * r * 0.75;
          g.fillStyle(this.tint(i % 2 === 0 ? FATE.enchant : FATE.mint), 0.85 * alpha * (1 - Math.abs(p - 0.5) * 1.4));
          suitGlyph(g, SUITS[i % SUITS.length], x + wide, y - lift, 4.4 * k);
        }
        break;
      }
      case 'lucky': {
        // A gilt ring with chips seated on it — the tell that the next card is worth double.
        g.lineStyle(2, this.tint(FATE.gold), (0.4 + 0.25 * Math.sin(this.t * 5)) * alpha);
        g.strokeCircle(x, y, r * (0.96 + 0.04 * Math.sin(this.t * 4)));
        for (let i = 0; i < 5; i++) {
          const a = this.t * 1.4 + (i / 5) * TAU;
          fateChip(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 3.4, FATE.gold, 0.9 * alpha, a);
        }
        break;
      }
      case 'tarot': {
        // A sealed ring turning both ways at once: this card is loaded, and it will cost you.
        g.fillStyle(this.tint(FATE.great), 0.12 * alpha);
        g.fillCircle(x, y, r * 1.1);
        for (const [dir, col] of [[1, FATE.great], [-1, FATE.curse]] as const) {
          for (let i = 0; i < 6; i++) {
            const a = dir * this.t * 1.6 + (i / 6) * TAU;
            g.fillStyle(this.tint(col), 0.8 * alpha);
            fillPoly(g, cardPoly(
              x + Math.cos(a) * r * (dir > 0 ? 1 : 0.72),
              y + Math.sin(a) * r * (dir > 0 ? 1 : 0.72),
              a + Math.PI / 2, 4, 11, 1,
            ));
          }
        }
        break;
      }
      case 'poison': {
        // Sags and drips, so a poisoned fighter is readable between ticks rather than only on one.
        g.fillStyle(this.tint(0x55cc55), 0.18 * alpha);
        g.fillCircle(x, y, r * 0.9);
        for (let i = 0; i < 5; i++) {
          const p = (this.t * 0.9 + i / 5) % 1;
          const ox = Math.sin(i * 2.3) * r * 0.6;
          g.fillStyle(this.tint(0x77dd55), (1 - p) * 0.8 * alpha);
          g.fillEllipse(x + ox, y + r * 0.3 + p * r * 0.9, 3.4 * (1 - p * 0.5), 6 * (1 - p * 0.4));
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── FateAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one chip ball hand, outermost first. */
const FATE_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: FATE.teal, alpha: 0.28 },
    { r: 6.6, color: FATE.jade, alpha: 0.92 },
    { r: 3.6, color: FATE.mint, alpha: 1 },
    { r: 1.4, color: FATE.ivory, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: FATE.bone,
  eyePupil: FATE.ink,
  // A dealer's hands are quick and precise — a fast snap, not much smear.
  squash: { div: 15, x: 0.4, y: 0.2 },
};

/**
 * The fate character rig: two chip ball hands, a pair of eyes, and a fan of cards worn like a
 * crown, each one turning on its own beat. Hands, eyes and gestures come from BaseAvatar; what
 * fate adds is the felt underfoot and the hand held above the head.
 */
export class FateAvatar extends BaseAvatar {
  private fx: FateFx;
  private tones: CardTones;

  constructor(scene: Phaser.Scene, tint: FateColorFn, tones: CardTones = HOUSE_TONES, depth = 6) {
    super(scene, tint, depth, FATE_AVATAR);
    this.fx = new FateFx(scene, tint);
    this.tones = tones;
    if (tones !== HOUSE_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(0x5f7d9e), 0.92));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.stock), 1));
    }
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character, so a mastered fate user is
   * identifiable before they play a card: gold eyes, a gilded rim and wider glow on each hand,
   * a five-card crown instead of three, and chips orbiting the head. Shape changes, not just
   * brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? FATE.gold : FATE.bone);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 10);
      halo.setFillStyle(this.tint(on ? FATE.gold : FATE.teal), on ? 0.28 : 0.28);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.7, this.tint(FATE.gold), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed cards. */
  protected emitTrail(x: number, y: number): void {
    this.fx.cards(x, y, 1, { speed: 16, size: 7, life: 520, fall: 26, depth: 5, tones: this.tones });
  }

  /** Holding a hand of cards close to the chest, the way you would read one. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    return {
      ang: this.facing + side * 1.1,
      dist: 19 + Math.sin(this.t * 3 + side) * 2,
      scale: idle.scale * 1.1,
    };
  }

  /** The felt: a table-green pool with a betting ring marked on it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(FATE.felt), a * 0.3 * k);
    g.fillEllipse(x, y + 6, 56 * k, 26 * k);
    g.fillStyle(this.tint(FATE.teal), a * 0.18 * k);
    g.fillEllipse(x, y + 6, 38 * k, 17 * k);
    g.lineStyle(1.4, this.tint(FATE.gold), a * 0.4);
    g.strokeEllipse(x, y + 6, 44 * k, 20 * k);
    // Chips sitting on the felt around the caster's feet.
    for (let i = 0; i < 3; i++) {
      const ang = this.t * 0.4 + (i / 3) * TAU;
      fateChip(g, this.tint, x + Math.cos(ang) * 20 * k, y + 6 + Math.sin(ang) * 9 * k,
        3, i === 0 ? FATE.gold : FATE.mint, a * 0.75, ang);
    }
  }

  /**
   * The crown: a fan of cards held above the head, each turning on its own beat so the hand
   * always looks live. Rooted at y - 18 so the cards never cover the face, and drawn over the
   * sprite so their faces show instead of only their dark edges clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 16;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.3 : 1;
    const spread = 0.42;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const lean = side * spread + Math.sin(this.t * 1.6 + i) * 0.05;
      const lift = 15 * this.intensity * scale * (1 - Math.abs(side) * 0.16);
      const cx = x + Math.sin(lean) * lift * 1.15;
      const cy = rootY - Math.cos(lean) * lift;
      fateCardLayered(
        g, this.tint, this.tones, cx, cy, lean,
        13 * scale, 18 * scale,
        // Each card in the fan turns on its own phase — a static fan reads as a paper hat.
        Math.cos(this.t * 1.6 + i * 1.4), a * 0.95,
        { suit: SUITS[i % SUITS.length], shadow: false },
      );
    }

    // Mastery orbit: chips circling the head on a shallow ellipse.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.4 + (i / 3) * TAU;
        fateChip(
          g, this.tint,
          x + Math.cos(p) * 25, y - 32 + Math.sin(p) * 7,
          4.4, i === 1 ? FATE.great : FATE.gold, alpha * 0.95, p * 2,
        );
      }
    }
  }
}
