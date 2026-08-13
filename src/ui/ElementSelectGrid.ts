import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { getMasteryDef } from '../data/Mastery';
import { ElementDef, ELEMENTS, unlockedExtraElements } from '../data/ElementRoster';
import { getElementProfile } from '../data/ElementProfiles';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix } from './Theme';
import { addButton, addIconButton, addPagerButton } from './Button';
import { fillSlantGradient, fillStar, slantPoints, strokeSlant, strokeStar } from './Shapes';
import { ElementPanels } from './ElementPanels';
import { ElementPortrait } from './ElementPortrait';

/** Five cards a page, everywhere. Page 0 is the base five; the rest is the unlocked roster. */
export const ELEMENT_PAGE_SIZE = 5;

const CARD_W = 152;
const CARD_H = 270;
const CARD_GAP = 12;
/**
 * How far the bottom edge leans right of the top edge, in px. Every piece of content on the
 * card is shifted by the local slant at its own height (see `slantAt`), so the column of text
 * leans with the plate instead of sitting in it crooked.
 */
const SKEW = 13;

const PORTRAIT_W = 132;
const PORTRAIT_H = 90;
/** Portrait centre, measured from the card centre. */
const PORTRAIT_DY = -18;

export interface ElementGridOptions {
  /** Card-row centre. Every caller so far uses `height / 2 + 52`. */
  y: number;
  /** Which page is showing. The caller owns it so it survives its own re-renders. */
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (elementId: string) => void;
  /** Overlay host — the ℹ, M and CUSTOMIZE buttons open panels on it. */
  panels: ElementPanels;
  /** Pager tint. Defaults to the arcane accent the main menu uses. */
  accent?: number;
  /**
   * A card that may be seen but not picked, and the one-line reason printed where
   * "▶ SELECT" would go. Returning null (the default) means every card is pickable.
   */
  lockedLabel?: (el: ElementDef) => string | null;
  /** Clicking a locked card. Without this a locked card simply does not take input. */
  onLockedSelect?: (elementId: string) => void;
  /** Loadout belongs to the element you are about to play — enemy pickers pass false. */
  showCustomize?: boolean;
  /** Top-right 📖 button. Off by default; the main menu turns it on. */
  showPerkDictionary?: boolean;
  /** Shown instead of cards on an extras page with nothing on it. */
  emptyText?: string;
}

/** Horizontal shift of the leaning plate at `dy` px from the card centre. */
function slantAt(dy: number): number {
  return (dy / (CARD_H / 2)) * SKEW;
}

/**
 * Lighten a colour until it can carry text on the near-black plate.
 *
 * Silence is 0x1a0022 and Shadow is 0x330044 — printing either as-is makes the element's own
 * name the least readable thing on its card.
 */
function legible(color: number): number {
  let out = color;
  for (let i = 0; i < 8; i++) {
    const r = (out >> 16) & 255, g = (out >> 8) & 255, b = out & 255;
    if (0.299 * r + 0.587 * g + 0.114 * b >= 148) break;
    out = mix(out, 0xffffff, 0.28);
  }
  return out;
}

/**
 * The element card grid: pager, five cards, mastery state, and the three affordances
 * (info / mastery / customize) that hang off each card.
 *
 * Every screen that asks "which element" draws this — the main menu, the campaign and the
 * gauntlet. They used to each own a copy, and only the menu's copy was ever updated, so the
 * campaign and gauntlet rosters silently stopped at Subterfuge. One grid now, one roster.
 *
 * A card is a leaning plate carrying, top to bottom: a complexity rating in stars, the
 * element's name and archetype, a **live portrait of the character** — the real fighter body
 * with its real rig standing on it, mastered silhouette and equipped skin included — a line
 * of class fantasy, and the select prompt. No emoji anywhere: a roster of fifty needs fifty
 * distinguishable pictures, and 🔥 versus 🌋 is not one.
 *
 * Returns everything it created; the caller destroys the list on its next re-render. The
 * portraits are not GameObjects, so each one rides along on a Zone handle that tears it down
 * when the caller destroys the list.
 */
export function renderElementGrid(
  scene: Phaser.Scene, opts: ElementGridOptions,
): Phaser.GameObjects.GameObject[] {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const by = opts.y;
  const accent = opts.accent ?? C.arcane;
  const out: Phaser.GameObjects.GameObject[] = [];

  const unlockedExtra = unlockedExtraElements();
  const extraPages = Math.max(1, Math.ceil(unlockedExtra.length / ELEMENT_PAGE_SIZE));
  const maxPage = unlockedExtra.length > 0 ? extraPages : 0;
  const totalPages = 1 + maxPage;
  const page = Phaser.Math.Clamp(opts.page, 0, totalPages - 1);

  const currentElements: ElementDef[] = page === 0
    ? ELEMENTS
    : unlockedExtra.slice((page - 1) * ELEMENT_PAGE_SIZE, (page - 1) * ELEMENT_PAGE_SIZE + ELEMENT_PAGE_SIZE);

  const pageLabel = scene.add.text(cx, by + CARD_H / 2 + 52, `${page + 1}  /  ${totalPages}`, {
    fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
  }).setOrigin(0.5).setDepth(DEPTH.content);
  out.push(pageLabel);

  if (page > 0) {
    out.push(addPagerButton(scene, {
      x: 30, y: by, dir: 'left', accent,
      onClick: () => opts.onPageChange(page - 1),
    }).container);
  }
  if (page < totalPages - 1) {
    out.push(addPagerButton(scene, {
      x: width - 30, y: by, dir: 'right', accent,
      onClick: () => opts.onPageChange(page + 1),
    }).container);
  }

  if (page > 0 && currentElements.length === 0) {
    const empty = scene.add.text(cx, by, opts.emptyText
      ?? 'No extra elements discovered yet.\nVisit the LAB to unlock combined elements,\nor clear Gauntlets to unlock Abstract Elements.', {
      fontSize: '14px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    out.push(empty);
    return out;
  }

  const totalW = currentElements.length * CARD_W + (currentElements.length - 1) * CARD_GAP;
  const startX = cx - totalW / 2;

  currentElements.forEach((el, i) => {
    const bx = startX + i * (CARD_W + CARD_GAP) + CARD_W / 2;

    const locked = opts.lockedLabel?.(el) ?? null;
    const clickable = el.available && locked === null;
    const masteryDef = getMasteryDef(el.id);
    const masteryOn = clickable && PlayerData.isMasteryEnabled(el.id);
    // A mastered element is a different character with a different colour, and the card is
    // where that has to be legible — same rule the arena rig follows.
    const displayColor = masteryOn && masteryDef ? masteryDef.enhancedColor : el.color;
    const plateAccent = clickable
      ? (masteryOn ? mix(displayColor, C.gold, 0.45) : displayColor)
      : C.steel;
    const profile = getElementProfile(el.id);

    // ── Plate ──────────────────────────────────────────────────────────
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;
    const plate = scene.add.graphics().setDepth(DEPTH.panel);
    const paint = (state: 'idle' | 'hover'): void => {
      plate.clear();
      const lift = state === 'hover' ? 0.12 : 0;
      const base = clickable
        ? mix(mix(C.plate, plateAccent, 0.16 + lift), 0x000000, 0.1)
        : mix(C.plate, 0x000000, 0.42);

      if (clickable && state === 'hover') {
        for (let k = 5; k >= 1; k--) {
          strokeSlant(plate, bx, by, hw + k * 3, hh + k * 3, SKEW, plateAccent, 0.06 * (6 - k), 2);
        }
      }

      fillSlantGradient(
        plate, bx, by, hw, hh, SKEW,
        mix(base, 0xffffff, 0.08 + lift * 0.3), mix(base, 0x000000, 0.55),
        clickable ? 1 : 0.8,
      );
      // Accent light bleeding up out of the bottom edge.
      if (clickable) {
        fillSlantGradient(
          plate, bx + SKEW * 0.55, by + hh * 0.55, hw - 2, hh * 0.45, SKEW * 0.45,
          plateAccent, plateAccent, 0.06 + lift * 0.14, 10,
        );
      }
      // Sheen: a bright wedge down the leading (upper-left) edge.
      const p = slantPoints(bx, by, hw, hh, SKEW);
      plate.fillStyle(mix(plateAccent, 0xffffff, 0.75), clickable ? 0.07 : 0.03);
      plate.fillPoints([
        p[0],
        new Phaser.Geom.Point(p[0].x + 34, p[0].y),
        new Phaser.Geom.Point(p[3].x + 12, p[3].y),
        p[3],
      ], true, true);

      const edge = state === 'hover' ? mix(plateAccent, 0xffffff, 0.5) : plateAccent;
      strokeSlant(plate, bx, by, hw, hh, SKEW, edge, clickable ? (state === 'hover' ? 1 : 0.8) : 0.4,
        state === 'hover' ? 3 : 2);
      strokeSlant(plate, bx, by, hw - 5, hh - 5, SKEW * 0.96, plateAccent, clickable ? 0.18 + lift : 0.07, 1);
      // Mastery reads before the text does: a second gold rail outside the element's own edge.
      if (masteryOn) {
        strokeSlant(plate, bx, by, hw + 3, hh + 3, SKEW, C.gold, state === 'hover' ? 0.75 : 0.5, 1.5);
      }
    };
    paint('idle');
    out.push(plate);

    // ── Complexity stars ───────────────────────────────────────────────
    const starsG = scene.add.graphics().setDepth(DEPTH.content);
    const starDy = -hh + 18;
    const starY = by + starDy;
    for (let s = 0; s < 5; s++) {
      const sxp = bx + slantAt(starDy) + (s - 2) * 13;
      const earned = s < profile.complexity;
      if (earned && clickable) {
        fillStar(starsG, sxp, starY, 6, C.gold, 0.95);
        strokeStar(starsG, sxp, starY, 6, mix(C.gold, 0xffffff, 0.55), 0.9, 1);
      } else {
        strokeStar(starsG, sxp, starY, 6, clickable ? C.line : 0x24243c, earned ? 0.9 : 0.75, 1);
      }
    }
    out.push(starsG);

    // ── Name + archetype ───────────────────────────────────────────────
    const nameColor = clickable ? legible(displayColor) : 0x3a3a55;
    const nameDy = -hh + 42;
    const nameText = scene.add.text(bx + slantAt(nameDy), by + nameDy, el.name.toUpperCase(), {
      fontSize: '17px', fontFamily: FONT_DISPLAY, color: hex(nameColor), letterSpacing: 1,
      stroke: hex(mix(nameColor, 0x000000, 0.82)), strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const archDy = -hh + 60;
    const archText = scene.add.text(bx + slantAt(archDy), by + archDy, profile.archetype.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY,
      color: clickable ? T.dim : T.ghost, letterSpacing: 2.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    out.push(nameText, archText);

    // ── Portrait well + live character ─────────────────────────────────
    const portraitX = bx + slantAt(PORTRAIT_DY);
    const portraitY = by + PORTRAIT_DY;
    const well = scene.add.graphics().setDepth(DEPTH.panel + 1);
    fillSlantGradient(
      well, portraitX, portraitY, PORTRAIT_W / 2, PORTRAIT_H / 2, SKEW * 0.38,
      mix(C.void_, plateAccent, clickable ? 0.1 : 0.02), C.void_, 1, 12,
    );
    // A pool of the element's own colour behind the character.
    if (clickable) {
      for (let k = 6; k >= 1; k--) {
        well.fillStyle(displayColor, 0.045);
        well.fillCircle(portraitX, portraitY + 8, 12 + k * 7);
      }
    }
    strokeSlant(well, portraitX, portraitY, PORTRAIT_W / 2, PORTRAIT_H / 2, SKEW * 0.38,
      plateAccent, clickable ? 0.35 : 0.15, 1);
    out.push(well);

    // The mask is a rectangle and the well leans, so the box is inset far enough that the
    // character can never paint into the sliver of card outside the well's own outline.
    const portrait = new ElementPortrait(scene, {
      x: portraitX, y: portraitY, w: PORTRAIT_W - 14, h: PORTRAIT_H - 8,
      elementId: el.id, mastered: masteryOn, muted: !clickable,
      depth: DEPTH.panel + 2, scale: 0.74,
    });
    // The portrait owns a container, a mask and a scene UPDATE hook rather than being a
    // display object, so it rides out on a Zone the caller already knows how to destroy.
    const portraitHandle = scene.add.zone(portraitX, portraitY, 1, 1);
    portraitHandle.once('destroy', () => portrait.destroy());
    out.push(portraitHandle);

    // Mastery ribbon, sitting on the bottom edge of the portrait well.
    if (masteryOn) {
      const ribbonDy = PORTRAIT_DY + PORTRAIT_H / 2 - 1;
      const rx = bx + slantAt(ribbonDy);
      const ribbon = scene.add.graphics().setDepth(DEPTH.content + 1);
      ribbon.fillStyle(mix(C.gold, 0x000000, 0.55), 0.95);
      ribbon.fillPoints(slantPoints(rx, by + ribbonDy, 44, 7, SKEW * 0.2), true, true);
      const ribbonText = scene.add.text(rx, by + ribbonDy, 'MASTERED', {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2);
      out.push(ribbon, ribbonText);
    }

    // ── Blurb ──────────────────────────────────────────────────────────
    const blurbDy = PORTRAIT_DY + PORTRAIT_H / 2 + 12;
    const blurb = scene.add.text(bx + slantAt(blurbDy + 30), by + blurbDy, profile.blurb, {
      fontSize: '10px', fontFamily: FONT_UI,
      color: clickable ? T.normal : T.ghost,
      align: 'center', lineSpacing: 1,
      wordWrap: { width: CARD_W - 22 },
    }).setOrigin(0.5, 0).setDepth(DEPTH.content);
    out.push(blurb);

    // ── Select prompt ──────────────────────────────────────────────────
    const statusColor = hex(mix(legible(displayColor), 0xffffff, 0.4));
    const statusDy = hh - 13;
    const statusText = scene.add.text(bx + slantAt(statusDy), by + statusDy,
      clickable ? '▶  SELECT' : (locked ?? 'COMING SOON'), {
      fontSize: clickable ? '11px' : '10px', fontFamily: FONT_DISPLAY,
      color: clickable ? statusColor : T.ghost, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    out.push(statusText);

    // ── Input ──────────────────────────────────────────────────────────
    // A rectangle hit area over a leaning plate would take clicks in the corners that are not
    // on the card and miss the ones that are, so the zone carries the plate's own outline.
    const zoneW = CARD_W + SKEW * 2;
    const hitPoly = new Phaser.Geom.Polygon([
      0, 0, CARD_W, 0, zoneW, CARD_H, SKEW * 2, CARD_H,
    ]);
    if (clickable || opts.onLockedSelect) {
      const hit = scene.add.zone(bx, by, zoneW, CARD_H)
        .setDepth(DEPTH.content + 1)
        .setInteractive({
          hitArea: hitPoly, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true,
        });
      if (clickable) {
        hit
          .on('pointerover', () => {
            paint('hover');
            statusText.setColor('#ffffff');
            portrait.poke();
          })
          .on('pointerout', () => { paint('idle'); statusText.setColor(statusColor); })
          .on('pointerdown', () => opts.onSelect(el.id));
      } else {
        hit.on('pointerdown', () => opts.onLockedSelect!(el.id));
      }
      out.push(hit);
    }

    // Corner affordances sit above the card's own hit area.
    out.push(addIconButton(scene, {
      x: bx + slantAt(starDy) + CARD_W / 2 - 15, y: starY, r: 11,
      icon: 'ℹ', accent: C.frost, depth: DEPTH.content + 3,
      onClick: () => opts.panels.showElementInfo(el.id, width, height, cx),
    }));
    out.push(addIconButton(scene, {
      x: bx + slantAt(starDy) - CARD_W / 2 + 15, y: starY, r: 11,
      icon: 'M', accent: masteryOn ? C.gold : C.steel, depth: DEPTH.content + 3,
      onClick: () => opts.panels.openMastery(el.id, width, height, cx),
    }));

    if (opts.showCustomize !== false) {
      out.push(addButton(scene, {
        x: bx + SKEW, y: by + hh + 22, w: CARD_W, h: 28,
        label: 'CUSTOMIZE', fontSize: 10,
        accent: C.arcane, variant: 'ghost', cut: 8,
        depth: DEPTH.content + 3,
        onClick: () => opts.panels.openCustomize(el.id, width, height, cx),
      }).container);
    }
  });

  if (opts.showPerkDictionary) {
    out.push(addIconButton(scene, {
      x: width - 40, y: 38, r: 19, icon: '📖', accent: C.arcane,
      depth: DEPTH.content + 5, tooltip: 'Perk dictionary',
      onClick: () => opts.panels.showPerkDictionary(width, height, cx),
    }));
  }

  return out;
}
