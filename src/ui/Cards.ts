import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate } from './Theme';
import {
  ALL_CORNERS, fillNotchedGradient, fillSlantGradient, slantPoints, strokeNotched, strokeSlant,
  drawSheen, fillDiamond, fillStar, strokeStar,
} from './Shapes';
import { drawIcon, drawIconSocket, IconName } from './Icons';
import { ElementPortrait } from './ElementPortrait';
import { Sfx } from '../audio';

/**
 * The pieces that make a screen read like the element roster.
 *
 * The element-select grid earned its look from three things: a leaning plate, a *picture* of
 * the thing you are choosing, and a short dossier — rating, name, archetype, one line of
 * fantasy, and the prompt. Every other menu was a stack of text rows with an emoji nailed to
 * the front, which is why the shop in particular read as a wall of words.
 *
 * These are the same three ideas, generalised: `addFeatureCard` for anything that is a
 * destination or a purchase, `addStatTile` for a number worth looking at, and
 * `addElementCrest` for the live character header the shop columns wear.
 */

/** How far a leaning card's bottom edge sits right of its top edge. Matches the roster cards. */
export const CARD_SKEW = 11;

export type CardState = 'idle' | 'hover' | 'active';

export interface FeatureCardOptions {
  /** Centre of the card. */
  x: number;
  y: number;
  w: number;
  h: number;
  accent: number;
  /** The big drawn glyph in the card's well. */
  icon: IconName;
  title: string;
  /** Small all-caps line under the title — the "archetype" slot on a roster card. */
  kicker?: string;
  /** One or two lines of body copy. */
  blurb?: string;
  /** Prompt across the bottom edge. */
  status?: string;
  statusColor?: string;
  /** Right-aligned pill on the top edge — a price, a count, "OWNED". */
  badge?: string;
  badgeAccent?: number;
  /** 0–5 filled pips along the top, like the roster's complexity stars. */
  rating?: number;
  /** Dim everything and drop the glow. */
  locked?: boolean;
  skew?: number;
  depth?: number;
  onClick?: () => void;
}

export interface FeatureCardHandle {
  objects: Phaser.GameObjects.GameObject[];
  paint: (state: CardState) => void;
  /** The icon's own Graphics, so callers can tween it. */
  iconGfx: Phaser.GameObjects.Graphics;
}

/**
 * A leaning dossier plate: rating, title, archetype, a big drawn glyph in a lit well, a line
 * of copy, and the prompt.
 *
 * Deliberately the same silhouette as an element card. Two screens that both ask "pick one of
 * these" should look like the same question.
 */
export function addFeatureCard(scene: Phaser.Scene, opts: FeatureCardOptions): FeatureCardHandle {
  const { x: bx, y: by, w, h, accent: rawAccent } = opts;
  const skew = opts.skew ?? CARD_SKEW;
  const depth = opts.depth ?? DEPTH.panel;
  const locked = !!opts.locked;
  const accent = locked ? mix(rawAccent, C.steel, 0.68) : rawAccent;
  const hw = w / 2;
  const hh = h / 2;
  const out: Phaser.GameObjects.GameObject[] = [];

  /** Horizontal shift of the plate at `dy` px from its centre. */
  const sl = (dy: number): number => (dy / hh) * skew;

  // ── Plate ────────────────────────────────────────────────────────────
  const plate = scene.add.graphics().setDepth(depth);
  out.push(plate);

  const paintPlate = (state: CardState): void => {
    plate.clear();
    const lift = state === 'idle' ? 0 : state === 'hover' ? 0.12 : 0.2;
    const base = locked
      ? mix(C.plate, 0x000000, 0.42)
      : mix(mix(C.plate, accent, 0.16 + lift), 0x000000, 0.1);

    if (!locked && state !== 'idle') {
      for (let k = 5; k >= 1; k--) {
        strokeSlant(plate, bx, by, hw + k * 3, hh + k * 3, skew, accent, 0.06 * (6 - k), 2);
      }
    }

    fillSlantGradient(
      plate, bx, by, hw, hh, skew,
      mix(base, 0xffffff, 0.08 + lift * 0.3), mix(base, 0x000000, 0.55),
      locked ? 0.8 : 1,
    );
    // Accent light bleeding up out of the bottom edge.
    if (!locked) {
      fillSlantGradient(
        plate, bx + skew * 0.55, by + hh * 0.55, hw - 2, hh * 0.45, skew * 0.45,
        accent, accent, 0.06 + lift * 0.14, 10,
      );
    }
    // Sheen down the leading edge.
    const p = slantPoints(bx, by, hw, hh, skew);
    plate.fillStyle(mix(accent, 0xffffff, 0.75), locked ? 0.03 : 0.07);
    plate.fillPoints([
      p[0],
      new Phaser.Geom.Point(p[0].x + Math.min(34, w * 0.24), p[0].y),
      new Phaser.Geom.Point(p[3].x + 12, p[3].y),
      p[3],
    ], true, true);

    const edge = state === 'idle' ? accent : mix(accent, 0xffffff, state === 'active' ? 0.65 : 0.45);
    strokeSlant(plate, bx, by, hw, hh, skew, edge,
      locked ? 0.4 : state === 'idle' ? 0.8 : 1, state === 'idle' ? 2 : 3);
    strokeSlant(plate, bx, by, hw - 5, hh - 5, skew * 0.96, accent, locked ? 0.07 : 0.18 + lift, 1);
  };

  // ── Rating pips ──────────────────────────────────────────────────────
  if (opts.rating !== undefined) {
    const starsG = scene.add.graphics().setDepth(depth + 2);
    const dy = -hh + 15;
    for (let s = 0; s < 5; s++) {
      const sx = bx + sl(dy) + (s - 2) * 12;
      const earned = s < opts.rating;
      if (earned && !locked) {
        fillStar(starsG, sx, by + dy, 5.5, C.gold, 0.95);
        strokeStar(starsG, sx, by + dy, 5.5, mix(C.gold, 0xffffff, 0.55), 0.9, 1);
      } else {
        strokeStar(starsG, sx, by + dy, 5.5, locked ? 0x24243c : C.line, 0.8, 1);
      }
    }
    out.push(starsG);
  }

  // ── Title block ──────────────────────────────────────────────────────
  const titleDy = -hh + (opts.rating !== undefined ? 38 : 24);
  const titleColor = locked ? 0x3a3a55 : mix(accent, 0xffffff, 0.62);
  out.push(scene.add.text(bx + sl(titleDy), by + titleDy, opts.title.toUpperCase(), {
    fontSize: `${Math.max(12, Math.min(19, Math.round(w / 9)))}px`,
    fontFamily: FONT_DISPLAY,
    color: hex(titleColor), letterSpacing: 1,
    stroke: hex(mix(titleColor, 0x000000, 0.82)), strokeThickness: 3,
    align: 'center', wordWrap: { width: w - 20 },
  }).setOrigin(0.5).setDepth(depth + 2));

  let cursorDy = titleDy + 14;
  if (opts.kicker) {
    cursorDy += 6;
    out.push(scene.add.text(bx + sl(cursorDy), by + cursorDy, opts.kicker.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY,
      color: locked ? T.ghost : T.dim, letterSpacing: 2.5,
    }).setOrigin(0.5).setDepth(depth + 2));
    cursorDy += 8;
  }

  // ── Icon well ────────────────────────────────────────────────────────
  // The card's "portrait": a recessed pool of the accent with the glyph standing in it.
  const wellH = Math.min(h * 0.34, 82);
  const wellW = w - 22;
  const wellDy = cursorDy + wellH / 2 + 6;
  const wellX = bx + sl(wellDy);
  const wellY = by + wellDy;

  const well = scene.add.graphics().setDepth(depth + 1);
  fillSlantGradient(
    well, wellX, wellY, wellW / 2, wellH / 2, skew * 0.38,
    mix(C.void_, accent, locked ? 0.02 : 0.1), C.void_, 1, 12,
  );
  if (!locked) {
    for (let k = 6; k >= 1; k--) {
      well.fillStyle(accent, 0.04);
      well.fillCircle(wellX, wellY, 10 + k * 6);
    }
  }
  strokeSlant(well, wellX, wellY, wellW / 2, wellH / 2, skew * 0.38, accent, locked ? 0.15 : 0.35, 1);
  out.push(well);

  // Positioned at the well's centre and drawn in local coordinates, so the hover tween can
  // scale it in place — a Graphics scales about its own position, not about what it drew.
  const iconGfx = scene.add.graphics().setDepth(depth + 2).setPosition(wellX, wellY);
  const iconR = Math.min(wellH * 0.4, 30);
  const paintIcon = (state: CardState): void => {
    iconGfx.clear();
    const c = locked ? mix(accent, C.steel, 0.6) : state === 'idle' ? accent : mix(accent, 0xffffff, 0.3);
    drawIcon(iconGfx, opts.icon, 0, 0, iconR, c, locked ? 0.5 : 1);
  };
  out.push(iconGfx);

  // ── Blurb ────────────────────────────────────────────────────────────
  if (opts.blurb) {
    const blurbDy = wellDy + wellH / 2 + 9;
    out.push(scene.add.text(bx + sl(blurbDy + 16), by + blurbDy, opts.blurb, {
      fontSize: '10px', fontFamily: FONT_UI,
      color: locked ? T.ghost : T.normal,
      align: 'center', lineSpacing: 1,
      wordWrap: { width: w - 22 },
    }).setOrigin(0.5, 0).setDepth(depth + 2));
  }

  // ── Status prompt ────────────────────────────────────────────────────
  let statusText: Phaser.GameObjects.Text | null = null;
  const idleStatusColor = opts.statusColor ?? hex(mix(accent, 0xffffff, 0.5));
  if (opts.status) {
    const statusDy = hh - 12;
    statusText = scene.add.text(bx + sl(statusDy), by + statusDy, opts.status, {
      fontSize: '11px', fontFamily: FONT_DISPLAY,
      color: locked ? T.ghost : idleStatusColor, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(depth + 2);
    out.push(statusText);
  }

  // ── Badge ────────────────────────────────────────────────────────────
  if (opts.badge) {
    const bAccent = opts.badgeAccent ?? (locked ? C.steel : C.gold);
    const badgeDy = -hh + 15;
    const label = scene.add.text(0, 0, opts.badge, {
      fontSize: '9px', fontFamily: FONT_DISPLAY,
      color: hex(mix(bAccent, 0xffffff, 0.6)), letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(depth + 3);
    const bw = label.width + 14;
    const bx2 = bx + sl(badgeDy) + hw - 8;
    label.setPosition(bx2 - 7, by + badgeDy);
    const bg = scene.add.graphics().setDepth(depth + 2);
    fillNotchedGradient(bg, bx2 - bw, by + badgeDy - 8, bw, 16,
      tintPlate(bAccent, 0.4), mix(tintPlate(bAccent, 0.22), 0x000000, 0.4), 0.96, 5, ALL_CORNERS, 6);
    strokeNotched(bg, bx2 - bw, by + badgeDy - 8, bw, 16, bAccent, 0.8, 1, 5, ALL_CORNERS);
    out.push(bg, label);
  }

  const paint = (state: CardState): void => {
    paintPlate(state);
    paintIcon(state);
    if (statusText && !locked) {
      statusText.setColor(state === 'idle' ? idleStatusColor : '#ffffff');
    }
  };
  paint('idle');

  // ── Input ────────────────────────────────────────────────────────────
  // A rectangle over a leaning plate takes clicks in corners that are not on the card and
  // misses ones that are, so the zone carries the plate's own outline.
  if (opts.onClick && !locked) {
    const zoneW = w + skew * 2;
    const hit = scene.add.zone(bx, by, zoneW, h)
      .setDepth(depth + 4)
      .setInteractive({
        hitArea: new Phaser.Geom.Polygon([0, 0, w, 0, zoneW, h, skew * 2, h]),
        hitAreaCallback: Phaser.Geom.Polygon.Contains,
        useHandCursor: true,
      });
    hit.on('pointerover', () => {
      paint('hover');
      Sfx.hover();
      scene.tweens.add({ targets: iconGfx, scaleX: 1.12, scaleY: 1.12, duration: 150, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      paint('idle');
      scene.tweens.add({ targets: iconGfx, scaleX: 1, scaleY: 1, duration: 160 });
    });
    hit.on('pointerdown', () => {
      Sfx.click();
      paint('active');
      opts.onClick!();
    });
    out.push(hit);
  }

  return { objects: out, paint, iconGfx };
}

/**
 * A number worth looking at: icon socket, big value, caption.
 *
 * Used for currency rails and progress read-outs, where the old chrome was a line of text
 * with an emoji in front of it.
 */
export function addStatTile(scene: Phaser.Scene, opts: {
  x: number; y: number; w: number; h?: number;
  accent: number;
  icon: IconName;
  value: string;
  label: string;
  caption?: string;
  depth?: number;
}): { objects: Phaser.GameObjects.GameObject[]; setValue: (v: string) => void } {
  const h = opts.h ?? 52;
  const depth = opts.depth ?? DEPTH.panel;
  const { x, y, w, accent } = opts;
  const left = x - w / 2;

  const g = scene.add.graphics().setDepth(depth);
  fillNotchedGradient(g, left, y - h / 2, w, h,
    mix(tintPlate(accent, 0.16), 0xffffff, 0.05), mix(tintPlate(accent, 0.1), 0x000000, 0.45),
    1, 9, ALL_CORNERS, 12);
  strokeNotched(g, left, y - h / 2, w, h, accent, 0.6, 1.5, 9, ALL_CORNERS);
  drawSheen(g, left, y - h / 2, w, h, mix(accent, 0xffffff, 0.7), 0.3, 9);
  drawIconSocket(g, opts.icon, left + h * 0.5, y, h * 0.32, accent);

  const textX = left + h * 0.5 + h * 0.32 + 12;
  const value = scene.add.text(textX, y - (opts.caption ? 9 : 6), opts.value, {
    fontSize: '19px', fontFamily: FONT_DISPLAY,
    color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 1,
  }).setOrigin(0, 0.5).setDepth(depth + 1);

  const label = scene.add.text(textX, y + (opts.caption ? 6 : 10), opts.label.toUpperCase(), {
    fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
  }).setOrigin(0, 0.5).setDepth(depth + 1);

  const objects: Phaser.GameObjects.GameObject[] = [g, value, label];
  if (opts.caption) {
    objects.push(scene.add.text(textX, y + 19, opts.caption, {
      fontSize: '8px', fontFamily: FONT_UI, color: T.ghost,
    }).setOrigin(0, 0.5).setDepth(depth + 1));
  }

  return { objects, setValue: (v: string) => value.setText(v) };
}

/**
 * The live character header a shop column or loadout panel wears: a lit well with the
 * element's real fighter standing in it, its name, and its archetype line.
 *
 * Borrowed wholesale from the roster card — same portrait class, same reasoning. An element
 * identified by its own character is legible in a way that 🔥 versus 🌋 never was.
 */
export function addElementCrest(scene: Phaser.Scene, opts: {
  x: number; y: number; w: number; h: number;
  elementId: string;
  name: string;
  kicker?: string;
  accent: number;
  mastered?: boolean;
  muted?: boolean;
  depth?: number;
  /** Portrait zoom. The roster cards use 0.74 in a 118×82 box. */
  portraitScale?: number;
}): { objects: Phaser.GameObjects.GameObject[]; portrait: ElementPortrait } {
  const depth = opts.depth ?? DEPTH.panel;
  const { x, y, w, h, accent } = opts;
  const objects: Phaser.GameObjects.GameObject[] = [];

  const nameH = 30;
  const portraitH = h - nameH;
  const portraitY = y - h / 2 + portraitH / 2;

  const g = scene.add.graphics().setDepth(depth);
  // Well behind the character.
  fillNotchedGradient(g, x - w / 2, y - h / 2, w, portraitH,
    mix(C.void_, accent, opts.muted ? 0.02 : 0.12), C.void_, 1, 8, [true, true, false, false], 12);
  if (!opts.muted) {
    for (let k = 6; k >= 1; k--) {
      g.fillStyle(accent, 0.04);
      g.fillCircle(x, portraitY + 6, 10 + k * 6);
    }
  }
  // Name band beneath it.
  fillNotchedGradient(g, x - w / 2, y - h / 2 + portraitH, w, nameH,
    tintPlate(accent, 0.34), mix(tintPlate(accent, 0.18), 0x000000, 0.42), 1, 8, [false, false, true, true], 8);
  strokeNotched(g, x - w / 2, y - h / 2, w, h, accent, opts.muted ? 0.3 : 0.8, 1.5, 8, ALL_CORNERS);
  g.fillStyle(accent, opts.muted ? 0.3 : 0.9);
  g.fillRect(x - w / 2 + 8, y + h / 2 - 3, w - 16, 2.5);
  if (opts.mastered) {
    strokeNotched(g, x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, C.gold, 0.55, 1.5, 10, ALL_CORNERS);
  }
  objects.push(g);

  const portrait = new ElementPortrait(scene, {
    x, y: portraitY, w: w - 10, h: portraitH - 6,
    elementId: opts.elementId, mastered: !!opts.mastered, muted: opts.muted,
    depth: depth + 1, scale: opts.portraitScale ?? 0.62,
  });
  const handle = scene.add.zone(x, portraitY, 1, 1);
  handle.once('destroy', () => portrait.destroy());
  objects.push(handle);

  const nameY = y - h / 2 + portraitH + (opts.kicker ? 10 : nameH / 2);
  objects.push(scene.add.text(x, nameY, opts.name.toUpperCase(), {
    fontSize: '12px', fontFamily: FONT_DISPLAY,
    color: hex(mix(accent, 0xffffff, opts.muted ? 0.3 : 0.62)), letterSpacing: 1.5,
  }).setOrigin(0.5).setDepth(depth + 2));

  if (opts.kicker) {
    objects.push(scene.add.text(x, nameY + 13, opts.kicker.toUpperCase(), {
      fontSize: '7px', fontFamily: FONT_DISPLAY, color: opts.muted ? T.ghost : T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(depth + 2));
  }

  return { objects, portrait };
}

/**
 * A key cap — the LMB / E / R / F / Q plates the shop and loadout screens print.
 *
 * Drawn as a real moulded cap (bevel, lip, legend) rather than a letter in a box, so an
 * ability slot reads as a key on a board.
 */
export function drawKeyCap(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number, accent: number, alpha = 1,
): void {
  fillNotchedGradient(g, x, y, w, h,
    mix(accent, 0x000000, 0.42), mix(accent, 0x000000, 0.76), alpha, 3, ALL_CORNERS, 6);
  strokeNotched(g, x, y, w, h, accent, 0.65 * alpha, 1, 3, ALL_CORNERS);
  // The lip that makes it look pressable.
  g.lineStyle(1, mix(accent, 0xffffff, 0.6), 0.35 * alpha);
  g.beginPath(); g.moveTo(x + 3, y + 1.5); g.lineTo(x + w - 3, y + 1.5); g.strokePath();
  g.fillStyle(0x000000, 0.28 * alpha);
  g.fillRect(x + 2, y + h - 2, w - 4, 1.5);
}

/** Divider between sections of a list — a rule with a diamond and a label notch. */
export function drawSectionRule(
  g: Phaser.GameObjects.Graphics, cx: number, y: number, halfWidth: number,
  accent: number, alpha = 0.5,
): void {
  g.lineStyle(1, accent, alpha);
  g.beginPath(); g.moveTo(cx - halfWidth, y); g.lineTo(cx + halfWidth, y); g.strokePath();
  fillDiamond(g, cx, y, 3.5, mix(accent, 0xffffff, 0.4), alpha * 1.6);
  fillDiamond(g, cx - halfWidth, y, 2, accent, alpha);
  fillDiamond(g, cx + halfWidth, y, 2, accent, alpha);
}

/** Soft accent bloom behind a hero element, so a page has one place the eye lands. */
export function drawFocusBloom(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, accent: number, strength = 0.05,
): void {
  for (let i = 8; i >= 1; i--) {
    g.fillStyle(accent, strength * (i / 8) * 0.4);
    g.fillCircle(cx, cy, (r * i) / 8);
  }
}
