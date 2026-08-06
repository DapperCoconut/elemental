import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { getMasteryDef } from '../data/Mastery';
import { ElementDef, ELEMENTS, unlockedExtraElements } from '../data/ElementRoster';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix } from './Theme';
import { addButton, addIconButton, addPagerButton } from './Button';
import { addCardPlate } from './Panel';
import { fillDiamond } from './Shapes';
import { ElementPanels } from './ElementPanels';

/** Five cards a page, everywhere. Page 0 is the base five; the rest is the unlocked roster. */
export const ELEMENT_PAGE_SIZE = 5;

const CARD_W = 140;
const CARD_H = 150;
const CARD_GAP = 16;

export interface ElementGridOptions {
  /** Card-row centre. Every caller so far uses `height / 2 + 20`. */
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

/**
 * The element card grid: pager, five cards, mastery state, and the three affordances
 * (info / mastery / customize) that hang off each card.
 *
 * Every screen that asks "which element" draws this — the main menu, the campaign and the
 * gauntlet. They used to each own a copy, and only the menu's copy was ever updated, so the
 * campaign and gauntlet rosters silently stopped at Subterfuge. One grid now, one roster.
 *
 * Returns everything it created; the caller destroys the list on its next re-render.
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

  const pageLabel = scene.add.text(cx, by + 138, `${page + 1}  /  ${totalPages}`, {
    fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
  }).setOrigin(0.5).setDepth(DEPTH.content);
  out.push(pageLabel);

  if (page > 0) {
    out.push(addPagerButton(scene, {
      x: 32, y: by, dir: 'left', accent,
      onClick: () => opts.onPageChange(page - 1),
    }).container);
  }
  if (page < totalPages - 1) {
    out.push(addPagerButton(scene, {
      x: width - 32, y: by, dir: 'right', accent,
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
    const displayEmoji = masteryOn && masteryDef ? masteryDef.enhancedEmoji : el.emoji;
    const displayColor = masteryOn && masteryDef ? masteryDef.enhancedColor : el.color;

    const plate = addCardPlate(scene, {
      x: bx, y: by, w: CARD_W, h: CARD_H,
      accent: clickable ? displayColor : C.steel,
      cut: 16, muted: !clickable,
    });

    // Colour pool behind the glyph — the element's signature at a glance.
    const halo = scene.add.graphics().setDepth(DEPTH.content - 1);
    if (clickable) {
      for (let k = 5; k >= 1; k--) {
        halo.fillStyle(displayColor, 0.05);
        halo.fillCircle(bx, by - 30, 18 + k * 6);
      }
    }
    // A mastered element gets a crown of diamonds over its glyph.
    if (masteryOn) {
      for (const a of [-2.36, -1.57, -0.79]) {
        fillDiamond(halo, bx + Math.cos(a) * 44, by - 30 + Math.sin(a) * 44, 3.5, C.gold, 0.9);
      }
    }

    const emojiText = scene.add.text(bx, by - 30, displayEmoji, { fontSize: '44px' })
      .setOrigin(0.5).setDepth(DEPTH.content).setAlpha(clickable ? 1 : 0.4);

    const nameText = scene.add.text(bx, by + 26, el.name.toUpperCase(), {
      fontSize: '15px', fontFamily: FONT_DISPLAY,
      color: clickable ? T.bright : T.ghost, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const statusColor = hex(mix(displayColor, 0xffffff, 0.55));
    const statusText = scene.add.text(bx, by + 50, clickable ? '▶  SELECT' : (locked ?? 'COMING SOON'), {
      fontSize: clickable ? '11px' : '10px', fontFamily: FONT_DISPLAY,
      color: clickable ? statusColor : T.ghost, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    out.push(plate.g, halo, emojiText, nameText, statusText);

    if (clickable) {
      const hit = scene.add.rectangle(bx, by, CARD_W, CARD_H, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit
        .on('pointerover', () => { plate.paint('hover'); statusText.setColor('#ffffff'); })
        .on('pointerout', () => { plate.paint('idle'); statusText.setColor(statusColor); })
        .on('pointerdown', () => opts.onSelect(el.id));
      out.push(hit);
    } else if (opts.onLockedSelect) {
      const hit = scene.add.rectangle(bx, by, CARD_W, CARD_H, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => opts.onLockedSelect!(el.id));
      out.push(hit);
    }

    // Corner affordances sit above the card's own hit area.
    out.push(addIconButton(scene, {
      x: bx + CARD_W / 2 - 15, y: by - CARD_H / 2 + 15, r: 12,
      icon: 'ℹ', accent: C.frost, depth: DEPTH.content + 3,
      onClick: () => opts.panels.showElementInfo(el.id, width, height, cx),
    }));
    out.push(addIconButton(scene, {
      x: bx - CARD_W / 2 + 15, y: by - CARD_H / 2 + 15, r: 12,
      icon: 'M', accent: masteryOn ? C.gold : C.steel, depth: DEPTH.content + 3,
      onClick: () => opts.panels.openMastery(el.id, width, height, cx),
    }));

    if (opts.showCustomize !== false) {
      out.push(addButton(scene, {
        x: bx, y: by + CARD_H / 2 + 28, w: CARD_W, h: 30,
        label: 'CUSTOMIZE', icon: '⚙', fontSize: 10,
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
