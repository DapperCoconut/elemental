import Phaser from 'phaser';
import { DIFFICULTY_PRESETS } from '../entities/NpcOpponent';
import { SHARD_REWARDS, getElementUpgrades } from '../data/Upgrades';
import { MUTATIONS, activeMutationIds, starredMutationIds, clearMutationSelection, getTotalRewardMult, STARRED_REWARD_MULT, getMutationDef } from '../data/Mutations';
import { clearConsumedItems } from '../data/Items';
import * as PlayerData from '../data/PlayerData';
import { applyKonamiCheat } from '../data/CheatSave';
import { getPerksForElement, getPerkById, ALL_PERKS } from '../data/Perks';
import { CosmeticSlot, COSMETIC_SLOTS, getCosmeticsForElement, isCosmeticUnlocked, cosmeticUnlockHint } from '../data/Cosmetics';
import { getAbilityVariants } from '../data/AbilityVariants';
import {
  getMasteryDef, isMasteryComplete, MasteryRequirement,
  getBindableEnhancements, getEnhancement, MASTERY_SLOTS, MasterySlot, MasteryEnhancement,
} from '../data/Mastery';
import { INVASION_DIFFICULTIES, InvasionDifficultyId } from '../invasion/InvasionKit';
import { FATE_CARD_DEFS } from '../elements/kits/FateKit';

import { Element } from '../elements/Element';
import { fireElement } from '../elements/fire';
import { waterElement } from '../elements/water';
import { lifeElement } from '../elements/life';
import { airElement } from '../elements/air';
import { earthElement } from '../elements/earth';
import { oilElement } from '../elements/oil';
import { shadowElement } from '../elements/shadow';
import { iceElement } from '../elements/ice';
import { growthElement } from '../elements/growth';
import { crystalElement } from '../elements/crystal';
import { soulElement } from '../elements/soul';
import { huntElement } from '../elements/hunt';
import { sandElement } from '../elements/sand';
import { gravityElement } from '../elements/gravity';
import { creationElement } from '../elements/creation';
import { electricityElement } from '../elements/electricity';
import { slimeElement } from '../elements/slime';
import { fateElement } from '../elements/fate';
import { soundElement } from '../elements/sound';
import { lightElement } from '../elements/light';
import { magnetElement } from '../elements/magnet';
import { metalElement } from '../elements/metal';
import { plasmaElement } from '../elements/plasma';
import { gunpowderElement } from '../elements/gunpowder';
import { rubberElement } from '../elements/rubber';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { echoElement } from '../elements/quantum';
import { quantumElement } from '../elements/quantum-element';
import { dummyElement } from '../elements/dummy';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addCardPlate, addIconButton, addOverlayChrome,
  addPagerButton, addRowPlate, addSectionLabel, addWell, addTitle, fillDiamond,
} from '../ui';

const ELEMENT_DATA_MAP: Record<string, Element> = {
  fire: fireElement, water: waterElement, life: lifeElement, air: airElement,
  earth: earthElement, oil: oilElement, shadow: shadowElement, ice: iceElement,
  growth: growthElement, crystal: crystalElement, soul: soulElement, hunt: huntElement,
  sand: sandElement, gravity: gravityElement, creation: creationElement,
  electricity: electricityElement,
  slime: slimeElement,
  fate: fateElement,
  sound: soundElement,
  light: lightElement,
  magnet: magnetElement,
  metal: metalElement,
  plasma: plasmaElement,
  gunpowder: gunpowderElement,
  rubber: rubberElement,
  magic: magicElement,
  technology: technologyElement,
  silence: silenceElement,
  echo: echoElement,
  quantum: quantumElement,
  dummy: dummyElement,
};

export interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  available: boolean;
}

export const ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400, available: true  },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff, available: true  },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44, available: true  },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff, available: true  },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755, available: true  },
];

export const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',    name: 'Oil',    emoji: '🛢️', color: 0x664400, available: true },
  { id: 'shadow', name: 'Shadow', emoji: '🌑', color: 0x330044, available: true },
  { id: 'ice',    name: 'Ice',    emoji: '🧊', color: 0x88ccff, available: true },
  { id: 'growth',  name: 'Growth',  emoji: '🦠', color: 0x88bb22, available: true },
  { id: 'crystal', name: 'Crystal', emoji: '💎', color: 0x88ccff, available: true },
  { id: 'soul',    name: 'Soul',    emoji: '👻', color: 0xccaaff, available: true },
  { id: 'hunt',    name: 'Hunt',    emoji: '🐺', color: 0xcc4400, available: true },
  { id: 'sand',    name: 'Time',    emoji: '⏳', color: 0xffdd44, available: true },
  { id: 'gravity', name: 'Gravity', emoji: '🌌', color: 0x8844cc, available: true },
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622, available: true },
];

/** Abstract elements unlocked by beating a gauntlet. Each entry maps to the gauntlet ID needed. */
export const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire',
  slime: 'water',
  fate: 'life',
  sound: 'air',
  light: 'earth',
};

export const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00, available: true },
  { id: 'slime', name: 'Acid', emoji: '🟢', color: 0x66cc44, available: true },
  { id: 'fate', name: 'Fate', emoji: '🃏', color: 0x88eecc, available: true },
  { id: 'sound', name: 'Sound', emoji: '🔊', color: 0xff66cc, available: true },
  { id: 'light', name: 'Light', emoji: '✨', color: 0xfff4a8, available: true },
];

/** Abstract combined elements — created by fusing two abstract elements in a Lvl 1+ Lab. */
export const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet', name: 'Magnet', emoji: '🧲', color: 0xcc2244, available: true },
  { id: 'metal',  name: 'Metal',  emoji: '⚙️',  color: 0x8899aa, available: true },
  { id: 'plasma', name: 'Plasma', emoji: '🔮',  color: 0xaa22ff, available: true },
  { id: 'gunpowder', name: 'Gunpowder', emoji: '💀',  color: 0x440066, available: true },
  { id: 'echo',   name: 'Echo',   emoji: '🦇',  color: 0xccccff, available: true },
  { id: 'rubber', name: 'Rubber', emoji: '🪀', color: 0xff5577, available: true },
  { id: 'magic', name: 'Magic', emoji: '📖', color: 0x9944ff, available: true },
  { id: 'technology', name: 'Technology', emoji: '💻', color: 0x44ccaa, available: true },
  { id: 'silence', name: 'Silence', emoji: '🫥', color: 0x1a0022, available: true },
  { id: 'quantum', name: 'Subterfuge', emoji: '🕴️', color: 0xcc2233, available: true },
];

const DIFF_COLORS = [0x22cc44, 0x88cc22, 0xddaa00, 0xee5500, 0xcc0022];

// WWSSADADBA (Konami-style, using WASD mapping: W=Up S=Down A=Left D=Right then B A)
const DUMMY_SEQUENCE = ['W','W','S','S','A','D','A','D','B','A'];

export class MenuScene extends Phaser.Scene {
  private selectionPhase: 'player' | 'enemy' | 'difficulty' = 'player';
  private playerChoice: string | null = null;
  private enemyChoice: string | null = null;
  private elemPage = 0;
  private isInvasion = false;
  private invasionDifficultyId: InvasionDifficultyId = 'normal';
  // Preserves scroll position across showCustomizeScreen rebuilds triggered by toggles/equips.
  private customizeScrollY = 0;

  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private infoOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private mutationOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private infoScrollHandler: (...args: unknown[]) => void = () => {};
  // In-flight mastery-ability drag (manual, so it survives the scroll container transform).
  private masteryDragMove: ((...args: unknown[]) => void) | null = null;
  private masteryDragUp: ((...args: unknown[]) => void) | null = null;
  private masteryDragGhost: Phaser.GameObjects.GameObject[] | null = null;
  // Preserves scroll position across showMasteryScreen rebuilds triggered by bind/clear actions.
  private masteryScrollY = 0;
  private mutationScrollHandler: (...args: unknown[]) => void = () => {};
  private elementInfoMode: 'base' | 'upgraded' | 'build' = 'base';
  private expandedVariants: Set<string> = new Set();
  private hoveredDifficulty = 1;
  private konamiBuffer: string[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(data?: { mode?: string }): void {
    this.isInvasion = data?.mode === 'invasion';
    this.invasionDifficultyId = 'normal';
    clearMutationSelection();
    clearConsumedItems();
    this.selectionPhase = 'player';
    this.playerChoice = null;
    this.enemyChoice = null;
    this.elemPage = 0;
    this.phaseObjects = [];

    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Persistent chrome ──────────────────────────────────────────
    const sceneAccent = this.isInvasion ? C.corrupt : C.ember;
    addBackdrop(this, { accent: sceneAccent, variant: 'lattice', motes: 20 });

    addTitle(this, { x: cx, y: 76, text: 'ELEMENTAL', accent: sceneAccent, size: 54, rule: true });

    // Footer: controls first, mission statement beneath it.
    const controlsHint = 'WASD MOVE     ·     LMB / E / R / F / Q ABILITIES     ·     SPACE DODGE';
    this.add.text(cx, height - 42, controlsHint, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.add.text(cx, height - 22, this.isInvasion ? 'Survive as long as you can.' : 'Defeat the enemy to win.', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.ghost,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    addBackButton(this, () => this.goBack());

    // Esc: close mutation info overlay, then element info overlay, then go back
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.mutationOverlayObjects.length > 0) {
        this.closeMutationInfo();
      } else if (this.infoOverlayObjects.length > 0) {
        this.closeElementInfo();
      } else {
        this.goBack();
      }
    });

    // Konami sequence listener (WWSSADADBA → unlock Dummy enemy)
    this.konamiBuffer = [];
    this.input.keyboard!.on('keydown', (evt: KeyboardEvent) => {
      this.konamiBuffer.push(evt.key.toUpperCase());
      if (this.konamiBuffer.length > DUMMY_SEQUENCE.length) this.konamiBuffer.shift();
      if (this.konamiBuffer.join('') === DUMMY_SEQUENCE.join('')) {
        // Shared with TitleScene so both entry points grant the same thing.
        applyKonamiCheat();
        this.renderPhase(width, height, cx);
      }
    });

    this.renderPhase(width, height, cx);
  }

  private findElement(id: string): ElementDef | undefined {
    if (id === 'dummy') return { id: 'dummy', name: 'Dummy', emoji: '🎯', color: 0x888888, available: true };
    return ELEMENTS.find((e) => e.id === id)
      ?? COMBINED_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_COMBINED_ELEMENTS.find((e) => e.id === id);
  }

  private renderPhase(width: number, height: number, cx: number): void {
    this.input.off('wheel', this.mutationScrollHandler);
    for (const obj of this.rewardsPanelDynObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.rewardsPanelDynObjects = [];
    for (const obj of this.phaseObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.phaseObjects = [];

    if (this.selectionPhase === 'difficulty' && this.isInvasion) {
      const playerEl = this.findElement(this.playerChoice ?? '');
      this.renderInvasionStartPhase(width, height, cx, playerEl);
    } else if (this.selectionPhase === 'difficulty') {
      this.renderDifficultyPhase(width, height, cx);
    } else {
      this.renderElementPhase(width, height, cx);
    }
  }

  private renderElementPhase(width: number, height: number, cx: number): void {
    const isPlayerPhase = this.selectionPhase === 'player';

    const subtitle = isPlayerPhase
      ? (this.isInvasion ? 'INVASION — pick your element' : 'Choose your element')
      : 'Choose enemy element';
    const subtitleObj = addSectionLabel(this, {
      x: cx, y: 152, text: subtitle.toUpperCase(),
      accent: isPlayerPhase ? C.verdant : C.blood, width: 560,
    });
    this.phaseObjects.push(subtitleObj);

    if (!isPlayerPhase && this.playerChoice) {
      const chosen = this.findElement(this.playerChoice);
      if (chosen) {
        // Reminder of the pick you already locked in, framed as a duel card.
        const g = this.add.graphics().setDepth(DEPTH.content - 1);
        fillDiamond(g, cx - 96, 190, 4, C.verdant, 0.7);
        fillDiamond(g, cx + 96, 190, 4, C.blood, 0.7);
        g.lineStyle(1, C.line, 0.6);
        g.beginPath(); g.moveTo(cx - 90, 190); g.lineTo(cx + 90, 190); g.strokePath();

        const indicator = this.add.text(cx, 190, `  ${chosen.emoji} ${chosen.name.toUpperCase()}   VS   ?  `, {
          fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1.5,
          backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
        }).setOrigin(0.5).setDepth(DEPTH.content);
        this.phaseObjects.push(g, indicator);
      }
    }

    // Determine which elements to show on this page
    const completedGauntlets = PlayerData.getCompletedGauntlets();
    const unlockedCombined = COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    const unlockedAbstract = ABSTRACT_ELEMENTS.filter((e) => {
      const neededGauntlet = ABSTRACT_ELEMENT_UNLOCK_MAP[e.id];
      return neededGauntlet ? completedGauntlets.includes(neededGauntlet) : false;
    });
    const unlockedAbstractCombined = ABSTRACT_COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    // Pool all non-base unlocked elements together for pagination
    const unlockedExtra = [...unlockedCombined, ...unlockedAbstract, ...unlockedAbstractCombined];
    const PAGE_SIZE = 5;
    const extraPages = Math.max(1, Math.ceil(unlockedExtra.length / PAGE_SIZE));
    const maxPage = unlockedExtra.length > 0 ? extraPages : 0; // 0 = no extra pages
    const totalPages = 1 + maxPage; // page 0 = base, pages 1..maxPage = combined/alt

    let currentElements: ElementDef[];
    if (this.elemPage === 0) {
      currentElements = ELEMENTS;
    } else {
      const start = (this.elemPage - 1) * PAGE_SIZE;
      currentElements = unlockedExtra.slice(start, start + PAGE_SIZE);
    }

    // Page indicator (pushed down to make room for perk strips)
    const pageLabel = this.add.text(cx, height / 2 + 158, `${this.elemPage + 1}  /  ${totalPages}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(pageLabel);

    // Page arrows
    if (this.elemPage > 0) {
      const leftBtn = addPagerButton(this, {
        x: 32, y: height / 2 + 20, dir: 'left', accent: C.arcane,
        onClick: () => { this.elemPage--; this.renderPhase(width, height, cx); },
      });
      this.phaseObjects.push(leftBtn.container);
    }

    if (this.elemPage < totalPages - 1 && (this.elemPage > 0 || unlockedExtra.length > 0)) {
      const rightBtn = addPagerButton(this, {
        x: width - 32, y: height / 2 + 20, dir: 'right', accent: C.arcane,
        onClick: () => { this.elemPage++; this.renderPhase(width, height, cx); },
      });
      this.phaseObjects.push(rightBtn.container);
    }

    // Element cards
    const cardW = 140;
    const cardH = 150;
    const gap = 16;
    const totalW = currentElements.length * cardW + (currentElements.length - 1) * gap;
    const startX = cx - totalW / 2;

    if (this.elemPage > 0 && currentElements.length === 0) {
      const noElems = this.add.text(cx, height / 2 + 20, 'No extra elements discovered yet.\nVisit the LAB to unlock combined elements,\nor clear Gauntlets to unlock Abstract Elements.', {
        fontSize: '14px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(noElems);
      return;
    }

    currentElements.forEach((el, i) => {
      const bx = startX + i * (cardW + gap) + cardW / 2;
      const by = height / 2 + 20;

      const clickable = el.available;
      const fillAlpha = clickable ? 0.8 : 0.3;
      const masteryDef = getMasteryDef(el.id);
      const masteryOn = clickable && PlayerData.isMasteryEnabled(el.id);
      const displayEmoji = masteryOn && masteryDef ? masteryDef.enhancedEmoji : el.emoji;
      const displayColor = masteryOn && masteryDef ? masteryDef.enhancedColor : el.color;
      const borderColor = clickable ? displayColor : 0x444444;

      void fillAlpha;
      const plate = addCardPlate(this, {
        x: bx, y: by, w: cardW, h: cardH,
        accent: clickable ? displayColor : C.steel,
        cut: 16, muted: !clickable,
      });

      // Colour pool behind the glyph — the element's signature at a glance.
      const halo = this.add.graphics().setDepth(DEPTH.content - 1);
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

      const emojiText = this.add.text(bx, by - 30, displayEmoji, { fontSize: '44px' })
        .setOrigin(0.5).setDepth(DEPTH.content).setAlpha(clickable ? 1 : 0.4);

      const nameText = this.add.text(bx, by + 26, el.name.toUpperCase(), {
        fontSize: '15px', fontFamily: FONT_DISPLAY,
        color: clickable ? T.bright : T.ghost, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const statusColor = hex(mix(displayColor, 0xffffff, 0.55));
      const statusText = this.add.text(bx, by + 50, clickable ? '▶  SELECT' : 'COMING SOON', {
        fontSize: clickable ? '11px' : '10px', fontFamily: FONT_DISPLAY,
        color: clickable ? statusColor : T.ghost, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      this.phaseObjects.push(plate.g, halo, emojiText, nameText, statusText);

      if (clickable) {
        const hit = this.add.rectangle(bx, by, cardW, cardH, 0xffffff, 0)
          .setDepth(DEPTH.content + 1)
          .setInteractive({ useHandCursor: true });
        hit
          .on('pointerover', () => { plate.paint('hover'); statusText.setColor('#ffffff'); })
          .on('pointerout', () => { plate.paint('idle'); statusText.setColor(statusColor); })
          .on('pointerdown', () => this.handleElementClick(el.id, width, height, cx));
        this.phaseObjects.push(hit);
      }

      // Corner affordances sit above the card's own hit area.
      const iBtn = addIconButton(this, {
        x: bx + cardW / 2 - 15, y: by - cardH / 2 + 15, r: 12,
        icon: 'ℹ', accent: C.frost, depth: DEPTH.content + 3,
        onClick: () => this.showElementInfo(el.id, width, height, cx),
      });
      const mBtn = addIconButton(this, {
        x: bx - cardW / 2 + 15, y: by - cardH / 2 + 15, r: 12,
        icon: 'M', accent: masteryOn ? C.gold : C.steel, depth: DEPTH.content + 3,
        onClick: () => { this.masteryScrollY = 0; this.showMasteryScreen(el.id, width, height, cx); },
      });
      this.phaseObjects.push(iBtn, mBtn);

      // ── Customize button (player phase only) — opens the element customization screen
      if (isPlayerPhase) {
        const stripY = by + cardH / 2 + 22;
        const custBtn = addButton(this, {
          x: bx, y: stripY + 6, w: cardW, h: 30,
          label: 'CUSTOMIZE', icon: '⚙', fontSize: 10,
          accent: C.arcane, variant: 'ghost', cut: 8,
          depth: DEPTH.content + 3,
          onClick: () => { this.customizeScrollY = 0; this.showCustomizeScreen(el.id, width, height, cx); },
        });
        this.phaseObjects.push(custBtn.container);
      }
    });

    // ── Perk Dictionary button (player phase only, top-right) ─────
    if (isPlayerPhase) {
      const { width: w } = this.scale;
      const dictBtn = addIconButton(this, {
        x: w - 40, y: 38, r: 19, icon: '📖', accent: C.arcane,
        depth: DEPTH.content + 5, tooltip: 'Perk dictionary',
        onClick: () => this.showPerkDictionary(w, this.scale.height, w / 2),
      });
      this.phaseObjects.push(dictBtn);
    }

    // Dummy enemy — shown only on enemy phase when unlocked via konami code
    if (!isPlayerPhase && PlayerData.isDummyUnlocked()) {
      const dBtn = addButton(this, {
        x: cx, y: height / 2 + 130, w: 200, h: 34,
        label: 'DUMMY MODE', icon: '🎯', fontSize: 13,
        accent: C.steel, variant: 'quiet', cut: 8,
        onClick: () => this.handleElementClick('dummy', width, height, cx),
      });
      this.phaseObjects.push(dBtn.container);
    }
  }

  private renderInvasionStartPhase(width: number, height: number, cx: number, playerEl: ElementDef | undefined): void {
    const subtitle = this.add.text(cx, 158, 'INVASION', {
      fontSize: '30px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.corrupt, 0xffffff, 0.5)),
      stroke: hex(mix(C.corrupt, 0x000000, 0.78)), strokeThickness: 5, letterSpacing: 8,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(subtitle);

    if (playerEl) {
      const indicator = this.add.text(cx, 214, `${playerEl.emoji}  ${playerEl.name.toUpperCase()}   ·   HOLD THE LINE`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(indicator);
    }

    // Mutations don't apply in Invasion mode — no selector shown here.

    // ── Difficulty selector ──────────────────────────────────────────
    const diffHeaderY = 260;
    const diffBtnY = 296;
    const diffDescY = 336;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: diffHeaderY, text: 'DIFFICULTY', accent: C.corrupt, width: 560,
    }));

    const descText = this.add.text(cx, diffDescY, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal,
      wordWrap: { width: 420 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(descText);

    const btnW = 152, btnH = 44, gap = 12;
    const totalW = INVASION_DIFFICULTIES.length * btnW + (INVASION_DIFFICULTIES.length - 1) * gap;
    const startX = cx - totalW / 2 + btnW / 2;

    // Selection is repaint-driven: each tile keeps a paint hook, and choosing
    // one re-lights every tile so exactly one reads as active.
    const tiles: Array<{ id: InvasionDifficultyId; paint: (s: 'idle' | 'hover' | 'active') => void; lbl: Phaser.GameObjects.Text; color: number }> = [];
    const updateSelection = () => {
      for (const t of tiles) {
        const selected = t.id === this.invasionDifficultyId;
        t.paint(selected ? 'active' : 'idle');
        t.lbl.setColor(selected ? '#ffffff' : hex(mix(t.color, 0xffffff, 0.4)));
      }
      descText.setText(INVASION_DIFFICULTIES.find((d) => d.id === this.invasionDifficultyId)!.description);
    };

    INVASION_DIFFICULTIES.forEach((def, i) => {
      const bx = startX + i * (btnW + gap);
      const plate = addCardPlate(this, {
        x: bx, y: diffBtnY, w: btnW, h: btnH, accent: def.color, cut: 10,
      });
      const lbl = this.add.text(bx, diffBtnY, def.label.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hit = this.add.rectangle(bx, diffBtnY, btnW, btnH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (def.id !== this.invasionDifficultyId) plate.paint('hover'); });
      hit.on('pointerout', () => { if (def.id !== this.invasionDifficultyId) plate.paint('idle'); });
      hit.on('pointerdown', () => { this.invasionDifficultyId = def.id; updateSelection(); });

      tiles.push({ id: def.id, paint: plate.paint, lbl, color: def.color });
      this.phaseObjects.push(plate.g, lbl, hit);
    });
    updateSelection();

    // START button
    const startBtn = addButton(this, {
      x: cx, y: height - 74, w: 300, h: 56,
      label: 'START INVASION', icon: '⚔',
      accent: C.corrupt, variant: 'solid', fontSize: 19,
      onClick: () => {
        this.scene.start('ArenaScene', {
          elementId: this.playerChoice,
          mode: 'invasion',
          invasionDifficulty: this.invasionDifficultyId,
          playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
        });
      },
    });
    startBtn.pulse();
    this.phaseObjects.push(startBtn.container);
  }

  private renderDifficultyPhase(width: number, height: number, cx: number): void {
    const playerEl = this.findElement(this.playerChoice ?? '');
    const enemyEl  = this.findElement(this.enemyChoice ?? '');

    const diffBtnY  = 228;
    const descY     = 292;
    const mutTitleY = 327;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: 152, text: 'CHOOSE DIFFICULTY', accent: C.gold, width: 560,
    }));

    if (playerEl && enemyEl) {
      // The matchup banner: your element, a struck VS, then the opponent.
      const g = this.add.graphics().setDepth(DEPTH.content - 1);
      g.lineStyle(1, C.line, 0.7);
      g.beginPath(); g.moveTo(cx - 220, 186); g.lineTo(cx - 26, 186); g.strokePath();
      g.beginPath(); g.moveTo(cx + 26, 186); g.lineTo(cx + 220, 186); g.strokePath();
      fillDiamond(g, cx - 220, 186, 3, C.verdant, 0.7);
      fillDiamond(g, cx + 220, 186, 3, C.blood, 0.7);

      const you = this.add.text(cx - 34, 186, `${playerEl.emoji}  ${playerEl.name.toUpperCase()}`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
        backgroundColor: hex(C.void_), padding: { x: 8, y: 3 },
      }).setOrigin(1, 0.5).setDepth(DEPTH.content);

      const vs = this.add.text(cx, 186, 'VS', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
        backgroundColor: hex(C.void_), padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const foe = this.add.text(cx + 34, 186, `${enemyEl.emoji}  ${enemyEl.name.toUpperCase()}`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
        backgroundColor: hex(C.void_), padding: { x: 8, y: 3 },
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);

      this.phaseObjects.push(g, you, vs, foe);
    }

    const btnW = 148;
    const btnH = 60;
    const btnGap = 10;
    const totalW = DIFFICULTY_PRESETS.length * btnW + (DIFFICULTY_PRESETS.length - 1) * btnGap;
    const startX = cx - totalW / 2;

    const descText = this.add.text(cx, descY, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(descText);

    const DIFF_DESCRIPTIONS = [
      'Misses a lot • Low HP • Rarely uses specials',
      'Occasional misses • Reduced HP • Some specials',
      'Accurate • Full HP • All abilities • Dodges nearby shots',
      'Very accurate • High HP • Active dodging',
      'Perfect aim • Maximum HP • Aggressive dodge • Top speed',
    ];

    DIFFICULTY_PRESETS.forEach((diff, i) => {
      const bx = startX + i * (btnW + btnGap) + btnW / 2;
      const color = DIFF_COLORS[i];
      const plate = addCardPlate(this, {
        x: bx, y: diffBtnY, w: btnW, h: btnH, accent: color, cut: 12,
      });

      // Threat pips — one lit diamond per difficulty level.
      const pips = this.add.graphics().setDepth(DEPTH.content);
      for (let k = 0; k < DIFFICULTY_PRESETS.length; k++) {
        fillDiamond(pips, bx - 22 + k * 11, diffBtnY - btnH / 2 + 9, k <= i ? 3 : 2,
          k <= i ? mix(color, 0xffffff, 0.45) : C.line, k <= i ? 1 : 0.6);
      }

      const labelText = this.add.text(bx, diffBtnY + 1, diff.label.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hpText = this.add.text(bx, diffBtnY + 19, `${diff.hp} HP   💎+${SHARD_REWARDS[i]}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY,
        color: hex(mix(color, 0xffffff, 0.5)), letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const btn = this.add.rectangle(bx, diffBtnY, btnW, btnH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      btn
        .on('pointerover', () => {
          plate.paint('hover'); descText.setText(DIFF_DESCRIPTIONS[i]);
          this.hoveredDifficulty = diff.level;
          this.refreshRewardsPanel(width);
        })
        .on('pointerout',  () => { plate.paint('idle'); descText.setText(''); })
        .on('pointerdown', () => {
          const npcPool = getPerksForElement(this.enemyChoice ?? '');
          const npcPerk: string | null = (diff.level >= 4 && npcPool.length > 0)
            ? npcPool[Math.floor(Math.random() * npcPool.length)].id
            : null;
          this.scene.start('ArenaScene', {
            elementId: this.playerChoice,
            enemyElementId: this.enemyChoice,
            difficulty: diff.level,
            mutations: [...activeMutationIds],
            starredMutations: [...starredMutationIds],
            playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
            npcPerk,
          });
        });

      this.phaseObjects.push(plate.g, pips, btn, labelText, hpText);
    });

    // ── New mutation panel (scrollable list + rewards sidebar) ────────
    this.renderMutationPanel(width, height, cx, mutTitleY);
  }

  // ── Mutation panel (scrollable list + rewards sidebar) ──────────────

  /** Persistent objects for the mutation list and rewards panel within phaseObjects. */
  private mutationListObjects: Phaser.GameObjects.GameObject[] = [];
  private rewardsPanelDynObjects: Phaser.GameObjects.GameObject[] = [];

  private renderMutationPanel(width: number, height: number, cx: number, titleY: number): void {
    // Detach any previous scroll handler
    this.input.off('wheel', this.mutationScrollHandler);

    const PANEL_TOP = titleY + 28;
    const PANEL_BOT = height - 70;
    const PANEL_H   = PANEL_BOT - PANEL_TOP;

    const LIST_X    = 32;
    const LIST_W    = 560;
    const RWD_X     = LIST_X + LIST_W + 16;
    const RWD_W     = width - RWD_X - 16;
    const RWD_CX    = RWD_X + RWD_W / 2;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: titleY, text: 'MUTATIONS', accent: C.arcane, width: 620,
    }));

    // ── Rewards panel (static background) ──
    const rPanelBg = addWell(this, RWD_CX, PANEL_TOP + PANEL_H / 2, RWD_W, PANEL_H, C.gold, 4);
    const rPanelTitle = this.add.text(RWD_CX, PANEL_TOP + 12, 'REWARDS PREVIEW', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(5);
    this.phaseObjects.push(rPanelBg, rPanelTitle);

    // ── Mutation list panel background ──
    const listPanelBg = addWell(this, LIST_X + LIST_W / 2, PANEL_TOP + PANEL_H / 2, LIST_W, PANEL_H, C.arcane, 4);
    this.phaseObjects.push(listPanelBg);

    // ── Mutation list mask + container ──
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(LIST_X, PANEL_TOP, LIST_W, PANEL_H);
    const mask = maskGfx.createGeometryMask();

    const scrollContainer = this.add.container(LIST_X, PANEL_TOP).setDepth(5);
    scrollContainer.setMask(mask);
    this.phaseObjects.push(maskGfx, scrollContainer);

    const ROW_H = 58;
    const ROW_W = LIST_W - 4;

    // Sort: unlocked first, locked last
    const sorted = [...MUTATIONS].sort((a, b) => {
      const uA = PlayerData.isMutationUnlocked(a.id) ? 0 : 1;
      const uB = PlayerData.isMutationUnlocked(b.id) ? 0 : 1;
      return uA - uB;
    });

    type InteractiveShape = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
    const rowInteractives: Array<{ localCenterY: number; shapes: InteractiveShape[] }> = [];
    let scrollY = 0;

    const updateInteractivity = () => {
      for (const row of rowInteractives) {
        const worldCenterY = (PANEL_TOP - scrollY) + row.localCenterY;
        const inView = worldCenterY + ROW_H / 2 > PANEL_TOP && worldCenterY - ROW_H / 2 < PANEL_BOT;
        for (const shape of row.shapes) {
          if (inView) {
            shape.setInteractive({ useHandCursor: true });
          } else {
            shape.disableInteractive();
          }
        }
      }
    };

    const buildRows = () => {
      // Destroy old row objects
      for (const obj of this.mutationListObjects) {
        if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      }
      this.mutationListObjects = [];
      rowInteractives.length = 0;

      let innerY = 4;
      for (const mut of sorted) {
        const unlocked = PlayerData.isMutationUnlocked(mut.id);
        const equipped = activeMutationIds.has(mut.id);
        const starred  = starredMutationIds.has(mut.id);

        const fillColor   = equipped ? 0x1a3a1a : (unlocked ? 0x252535 : 0x141420);
        const borderColor = equipped ? 0x55ee55 : (unlocked ? 0x6677aa : 0x333344);
        const alpha       = unlocked ? 1 : 0.45;

        const row = this.overlayRow(ROW_W / 2, innerY + ROW_H / 2, ROW_W, ROW_H - 4, borderColor, alpha < 1);
        void fillColor;
        scrollContainer.add(row.g);
        this.mutationListObjects.push(row.g);

        const rowShapes: InteractiveShape[] = [];

        if (unlocked) {
          const rowHit = this.overlayRowHit(ROW_W / 2, innerY + ROW_H / 2, ROW_W, ROW_H - 4);
          scrollContainer.add(rowHit);
          this.mutationListObjects.push(rowHit);
          rowHit
            .on('pointerover', () => row.paint(true))
            .on('pointerout',  () => row.paint(false))
            .on('pointerdown', () => {
              if (equipped) {
                activeMutationIds.delete(mut.id);
                starredMutationIds.delete(mut.id);
              } else {
                activeMutationIds.add(mut.id);
              }
              buildRows();
              this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
            });
          rowShapes.push(rowHit);
        }

        // Emoji + name
        const nameColor = unlocked ? '#ffffff' : '#555566';
        const prefix    = unlocked ? '' : '🔒 ';
        const nameText = this.add.text(10, innerY + 12, `${prefix}${mut.emoji} ${mut.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: nameColor,
        }).setAlpha(alpha);
        scrollContainer.add(nameText);
        this.mutationListObjects.push(nameText);

        // Short desc
        const descColor = unlocked ? '#999999' : '#444455';
        const descText = this.add.text(10, innerY + 32, mut.shortDesc, {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: descColor,
          wordWrap: { width: ROW_W - 60 },
        }).setAlpha(alpha);
        scrollContainer.add(descText);
        this.mutationListObjects.push(descText);

        // Star button (unlocked, non-boss-only mutations only)
        if (unlocked && !mut.bossOnly) {
          const starX = ROW_W - 52;
          const starCircle = this.add.circle(starX, innerY + ROW_H / 2 - 2, 14, starred ? 0x886600 : 0x333344, 1)
            .setStrokeStyle(1, starred ? 0xffcc44 : 0x555566, 1)
            .setDepth(6).setInteractive({ useHandCursor: true });
          const starLabel = this.add.text(starX, innerY + ROW_H / 2 - 2, '★', {
            fontSize: '14px', color: starred ? '#ffeebb' : '#7a7a8a',
          }).setOrigin(0.5).setDepth(7);
          starCircle
            .on('pointerover', () => starCircle.setFillStyle(starred ? 0xaa8800 : 0x555566, 1))
            .on('pointerout',  () => starCircle.setFillStyle(starred ? 0x886600 : 0x333344, 1))
            .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              ptr.event.stopPropagation();
              if (starred) {
                starredMutationIds.delete(mut.id);
              } else {
                starredMutationIds.add(mut.id);
                activeMutationIds.add(mut.id); // auto-equip when starring
              }
              buildRows();
              this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
            });
          scrollContainer.add([starCircle, starLabel]);
          this.mutationListObjects.push(starCircle, starLabel);
          rowShapes.push(starCircle);
        }

        // Info "i" button
        const iX = ROW_W - 22;
        const iCircle = this.add.circle(iX, innerY + ROW_H / 2 - 2, 11, 0x222244, 0.9)
          .setStrokeStyle(1, 0x8888cc, 0.9).setDepth(6).setInteractive({ useHandCursor: true });
        const iLabel = this.add.text(iX, innerY + ROW_H / 2 - 2, 'i', {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aaaaff',
        }).setOrigin(0.5).setDepth(7);
        iCircle
          .on('pointerover', () => iCircle.setFillStyle(0x4444aa, 0.95))
          .on('pointerout',  () => iCircle.setFillStyle(0x222244, 0.9))
          .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            ptr.event.stopPropagation();
            this.showMutationInfo(mut.id, width, height, cx);
          });
        scrollContainer.add([iCircle, iLabel]);
        this.mutationListObjects.push(iCircle, iLabel);
        rowShapes.push(iCircle);

        rowInteractives.push({ localCenterY: innerY + ROW_H / 2, shapes: rowShapes });
        innerY += ROW_H;
      }

      updateInteractivity();
      return innerY;
    };

    const totalH = buildRows();
    const maxScroll = Math.max(0, totalH - PANEL_H);

    this.mutationScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      scrollContainer.setY(PANEL_TOP - scrollY);
      updateInteractivity();
    };
    this.input.on('wheel', this.mutationScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(LIST_X + LIST_W - 4, PANEL_BOT - 2, '▼ scroll', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(6);
      this.phaseObjects.push(hint);
    }

    this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
  }

  private buildRewardsPanel(rwdCx: number, panelTop: number, panelH: number, panelW: number): void {
    for (const obj of this.rewardsPanelDynObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.rewardsPanelDynObjects = [];

    const equipped = [...activeMutationIds];
    const innerX = rwdCx;
    let innerY = panelTop + 30;

    if (equipped.length === 0) {
      const empty = this.add.text(innerX, panelTop + panelH / 2, 'No mutations\nequipped', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#666677', align: 'center',
      }).setOrigin(0.5).setDepth(6);
      this.rewardsPanelDynObjects.push(empty);
    } else {
      for (const id of equipped) {
        const def = getMutationDef(id);
        if (!def) continue;
        const isStarred = starredMutationIds.has(id);
        const mult = isStarred ? def.rewardMult * STARRED_REWARD_MULT : def.rewardMult;
        const label = `${def.emoji}${isStarred ? '★' : ''} ${def.name}`;
        const multStr = `×${mult.toFixed(2)}`;
        const rowColor = isStarred ? '#ffeebb' : '#ddddee';
        const lText = this.add.text(innerX, innerY, label, {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: rowColor,
        }).setOrigin(0.5).setDepth(6);
        const mText = this.add.text(innerX, innerY + 14, multStr, {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: rowColor,
        }).setOrigin(0.5).setDepth(6);
        this.rewardsPanelDynObjects.push(lText, mText);
        innerY += 32;
      }

      // Divider
      const divGfx = this.add.graphics().setDepth(6);
      divGfx.lineStyle(1, 0x555577, 0.7);
      divGfx.lineBetween(rwdCx - panelW / 2 + 8, innerY + 4, rwdCx + panelW / 2 - 8, innerY + 4);
      this.rewardsPanelDynObjects.push(divGfx);
      innerY += 14;

      const totalMult = getTotalRewardMult();
      const totalText = this.add.text(innerX, innerY, `Total  ×${totalMult.toFixed(2)}`, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc44',
      }).setOrigin(0.5).setDepth(6);
      this.rewardsPanelDynObjects.push(totalText);
      innerY += 22;

      const baseShard = SHARD_REWARDS[Math.max(0, this.hoveredDifficulty - 1)] ?? 0;
      if (baseShard > 0) {
        const shardsText = this.add.text(innerX, innerY, `💎 +${Math.round(baseShard * totalMult)} shards`, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#88ccff',
        }).setOrigin(0.5).setDepth(6);
        this.rewardsPanelDynObjects.push(shardsText);
      }
    }
  }

  private refreshRewardsPanel(width: number): void {
    const LIST_X = 32;
    const LIST_W = 560;
    const RWD_X  = LIST_X + LIST_W + 16;
    const RWD_W  = width - RWD_X - 16;
    const RWD_CX = RWD_X + RWD_W / 2;
    const height = this.scale.height;
    // Only ever called from the difficulty phase's hover handler — invasion mode has no mutation panel to size.
    const panelTop = 327 + 28;
    const panelH   = (height - 70) - panelTop;
    this.buildRewardsPanel(RWD_CX, panelTop, panelH, RWD_W);
  }

  private closeMutationInfo(): void {
    for (const obj of this.mutationOverlayObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.mutationOverlayObjects = [];
  }

  private showMutationInfo(id: string, width: number, height: number, cx: number): void {
    this.closeMutationInfo();
    const def = getMutationDef(id);
    if (!def) return;
    const unlocked = PlayerData.isMutationUnlocked(id);

    const chrome = addOverlayChrome(this, {
      title: `${def.emoji}  ${def.name.toUpperCase()}`,
      subtitle: unlocked ? '✓ UNLOCKED' : '🔒 LOCKED',
      accent: unlocked ? C.gold : C.steel,
      depth: 60,
      onBack: () => this.closeMutationInfo(),
    });
    this.mutationOverlayObjects.push(...chrome.objects);
    void cx; void height;

    const sections: Array<{ label: string; text: string; color: string; y: number }> = [
      { label: 'Effects', text: def.fullDesc, color: '#ddddee', y: 125 },
      ...(def.bossOnly ? [
        { label: 'BOSS ONLY — Unlocked by defeating a gauntlet boss', text: 'No starred version.', color: '#ffbb44', y: 260 },
      ] : [
        { label: 'Starred Effects ★', text: def.starredDesc, color: '#ffeebb', y: 260 },
      ]),
      { label: 'Rewards', text: def.bossOnly
        ? `×${def.rewardMult.toFixed(2)} base`
        : `×${def.rewardMult.toFixed(2)} base  (×${(def.rewardMult * STARRED_REWARD_MULT).toFixed(2)} starred)`,
        color: '#aaffaa', y: 400 },
    ];

    for (const s of sections) {
      const hdr = this.add.text(60, s.y, s.label.toUpperCase(), {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(C.frost, 0xffffff, 0.3)),
        letterSpacing: 2,
      }).setDepth(63);
      const rule = this.add.graphics().setDepth(63);
      rule.lineStyle(1, C.line, 0.7);
      rule.beginPath(); rule.moveTo(60, s.y + 16); rule.lineTo(width - 60, s.y + 16); rule.strokePath();
      const body = this.add.text(60, s.y + 26, s.text, {
        fontSize: '12px', fontFamily: FONT_UI, color: s.color,
        wordWrap: { width: width - 120 }, lineSpacing: 4,
      }).setDepth(63);
      this.mutationOverlayObjects.push(hdr, rule, body);
    }
  }

  /**
   * Row background shared by every overlay list in this scene. One notched
   * plate with an accent spine, so the info, mastery, customize and dictionary
   * screens all read as the same list.
   */
  private overlayRow(
    cx: number, y: number, w: number, h: number, accent: number, muted = false,
  ): { g: Phaser.GameObjects.Graphics; paint: (hover: boolean) => void } {
    return addRowPlate(this, { x: cx, y, w, h, accent, muted });
  }

  /**
   * Transparent hit plate for a scrolling row. Lives in the same container as
   * the row art, so it scrolls with it; the plate itself is a Graphics and
   * cannot take input.
   */
  private overlayRowHit(
    cx: number, y: number, w: number, h: number,
  ): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(cx, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
  }

  private closeElementInfo(): void {
    this.endMasteryDrag();
    this.input.off('wheel', this.infoScrollHandler);
    for (const obj of this.infoOverlayObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.infoOverlayObjects = [];
  }

  private showElementInfo(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    // Build Mode is a Creation-only tab; drop back to Base for anything else.
    if (this.elementInfoMode === 'build' && elementId !== 'creation') this.elementInfoMode = 'base';
    const upgrades = getElementUpgrades(elementId);
    const perks = getPerksForElement(elementId);
    const showUpgraded = this.elementInfoMode === 'upgraded';
    const showBuild = this.elementInfoMode === 'build';

    const SCROLL_TOP = 128;
    const SCROLL_BOT = height - 44;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;
    const elemColor = '#' + element.color.toString(16).padStart(6, '0');

    // Full-screen dark backdrop
    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50);
    bg.setInteractive(); // capture clicks so they don't fall through
    this.infoOverlayObjects.push(bg);

    // Header
    const header = this.add.text(cx, 34, `${element.emoji}  ${element.name.toUpperCase()}`, {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: elemColor,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    // ── Base / Upgraded (+ Build Mode for Creation) tabs ──
    const tabDefs: Array<{
      mode: 'base' | 'upgraded' | 'build'; label: string;
      selFill: number; selStroke: number; selText: string; unselText: string;
    }> = [
      { mode: 'base',     label: '⚔ BASE ABILITIES',  selFill: 0x224433, selStroke: 0x66ff99, selText: '#aaffcc', unselText: '#556655' },
      { mode: 'upgraded', label: '▲ UPGRADED EFFECTS', selFill: 0x332200, selStroke: 0xffcc44, selText: '#ffdd88', unselText: '#665533' },
    ];
    if (elementId === 'creation') {
      tabDefs.push({ mode: 'build', label: '🔨 BUILD MODE', selFill: 0x2a1804, selStroke: 0xcc6622, selText: '#ffbb88', unselText: '#665544' });
    }
    const toggleY = 66;
    const nTabs = tabDefs.length;
    const tabW = nTabs >= 3 ? 132 : 150;
    const tabH = 26;
    const tabGap = 6;
    const tabsTotalW = nTabs * tabW + (nTabs - 1) * tabGap;
    tabDefs.forEach((td, ti) => {
      const tx = cx - tabsTotalW / 2 + tabW / 2 + ti * (tabW + tabGap);
      const selected = this.elementInfoMode === td.mode;
      const plate = addCardPlate(this, {
        x: tx, y: toggleY, w: tabW, h: tabH, accent: td.selStroke, cut: 8,
        depth: 55, muted: !selected,
      });
      if (selected) plate.paint('active');
      const btn = this.add.rectangle(tx, toggleY, tabW, tabH, 0xffffff, 0)
        .setDepth(56).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => { if (!selected) plate.paint('hover'); });
      btn.on('pointerout', () => plate.paint(selected ? 'active' : 'idle'));
      const lbl = this.add.text(tx, toggleY, td.label, {
        fontSize: nTabs >= 3 ? '10px' : '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: selected ? td.selText : td.unselText,
      }).setOrigin(0.5).setDepth(57);
      this.infoOverlayObjects.push(plate.g);
      void td.selFill;
      btn.on('pointerdown', () => {
        if (this.elementInfoMode !== td.mode) { this.elementInfoMode = td.mode; this.showElementInfo(elementId, width, height, cx); }
      });
      this.infoOverlayObjects.push(btn, lbl);
    });

    // Divider
    const divLine = this.add.line(cx, SCROLL_TOP - 12, -width / 2 + 40, 0, width / 2 - 40, 0, C.arcane, 0.45).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // ── Scrollable content ──
    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    let innerY = 4;

    const sectionHdr = (text: string, color: string) => {
      const t = this.add.text(cx, innerY, text, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color,
      }).setOrigin(0.5);
      scrollContainer.add(t);
      innerY += 20;
    };

    if (showBuild) {
      innerY = this.renderCreationBuildInfo(scrollContainer, cx, COL_X, COL_W, innerY);
    } else {

    // Subterfuge-specific passives (shown above the abilities list)
    if (elementId === 'quantum') {
      sectionHdr('— PASSIVES —', '#ff5566');
      const passiveText =
        '💵 Dirty Money: three red money icons hover above you. You start each match with 2 money and earn 1 every 5 seconds (max 3). Money buys Spray reloads, Lackeys, and Bribes.\n\n' +
        '🔫 Kickbacks: every 10 damage you deal with daggers or Spray earns 3 bullets (up to 50).';
      const passiveDesc = this.add.text(COL_X + 14, innerY, passiveText, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#e09aa2',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });
      scrollContainer.add(passiveDesc);
      innerY += passiveDesc.height + 20;
    }

    sectionHdr('— ABILITIES —', '#7788cc');

    element.abilities.forEach((ab, idx) => {
      const upgrade = upgrades.find((u) => u.slot === ab.displayKey.toLowerCase());
      const owned = upgrade ? PlayerData.isUpgradeOwned(elementId, upgrade.slot) : false;
      const variantSet = getAbilityVariants(elementId, ab.displayKey);
      const variantKey = `${elementId}:${ab.displayKey.toLowerCase()}`;
      const variantsExpanded = this.expandedVariants.has(variantKey);

      let bodyText: string;
      if (!showUpgraded) {
        bodyText = ab.description;
      } else if (upgrade) {
        bodyText = `${ab.description}\n\n▲ ${upgrade.name}${owned ? ' (owned)' : ' (not yet purchased)'}: ${upgrade.description}`;
      } else {
        bodyText = `${ab.description}\n\n(This ability has no upgrade.)`;
      }

      const cdSec = ab.cooldown >= 1000 ? `   ${ab.cooldown / 1000}s CD` : '';

      const descText = this.add.text(COL_X + 14, innerY + 26, bodyText, {
        fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
        color: showUpgraded && upgrade ? '#ccbb88' : '#999aad',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 4,
      });

      let rowH = 26 + descText.height + 14;
      const rowObjs: Phaser.GameObjects.GameObject[] = [descText];

      // ── "See all possibilities" dropdown toggle ──
      if (variantSet) {
        const toggleY = innerY + rowH - 4;
        const toggleText = this.add.text(COL_X + 14, toggleY, variantsExpanded
          ? `▲ Hide ${variantSet.variants.length} possibilities`
          : `▼ See all ${variantSet.variants.length} possibilities`, {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#66ccff',
        }).setInteractive({ useHandCursor: true });
        toggleText.on('pointerover', () => toggleText.setColor('#aaeeff'));
        toggleText.on('pointerout', () => toggleText.setColor('#66ccff'));
        toggleText.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          ptr.event.stopPropagation();
          if (variantsExpanded) this.expandedVariants.delete(variantKey);
          else this.expandedVariants.add(variantKey);
          this.showElementInfo(elementId, width, height, cx);
        });
        rowObjs.push(toggleText);
        rowH += 18;

        if (variantsExpanded) {
          rowH += 6;
          const listX = COL_X + 24;
          const listW = COL_W - 52;
          variantSet.variants.forEach((v) => {
            const locked = (!!v.requiresUpgrade && !PlayerData.isUpgradeOwned(elementId, v.requiresUpgrade))
              || (!!v.requiresPerk && !PlayerData.isPerkUnlocked(elementId, v.requiresPerk));
            const vDesc = this.add.text(listX, innerY + rowH + 21, v.description, {
              fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
              color: locked ? '#555566' : '#8899aa',
              wordWrap: { width: listW - 10 }, lineSpacing: 2,
            }).setAlpha(locked ? 0.6 : 1);
            const vRowH = 21 + vDesc.height + 8;

            const vBg = this.add.rectangle(cx, innerY + rowH + vRowH / 2, listW, vRowH - 2,
              locked ? 0x0a0a12 : 0x10101f, 0.7).setStrokeStyle(1, locked ? 0x222233 : 0x2a2a44, 0.6);
            const vName = this.add.text(listX, innerY + rowH + 6, `${v.emoji ? v.emoji + ' ' : ''}${v.name}`, {
              fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
              color: locked ? '#666677' : '#cceeff',
            }).setAlpha(locked ? 0.6 : 1);
            rowObjs.push(vBg, vName, vDesc);

            if (locked) {
              const lockLabel = v.requiresUpgrade
                ? `${v.requiresUpgrade.toUpperCase()}+`
                : `${getPerkById(v.requiresPerk!)?.name ?? v.requiresPerk} perk`;
              const vLock = this.add.text(COL_X + COL_W - 24, innerY + rowH + 6, `🔒 ${lockLabel}`, {
                fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
              }).setOrigin(1, 0);
              rowObjs.push(vLock);
            }

            rowH += vRowH + 4;
          });
          rowH += 4;
        }
      }

      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6,
        showUpgraded && upgrade ? C.gold : C.frost, !(showUpgraded && upgrade)).g;

      const keyBadge = this.add.text(COL_X + 24, innerY + 13, `[${ab.displayKey}]`, {
        fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: elemColor,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);

      const abilityName = this.add.text(COL_X + 52, innerY + 13, `${ab.name}${cdSec}`, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ddddee',
      }).setOrigin(0, 0.5);

      scrollContainer.add([rowBg, keyBadge, abilityName, ...rowObjs]);

      if (showUpgraded && upgrade) {
        const badge = this.add.text(COL_X + COL_W - 14, innerY + 13, owned ? '✓ OWNED' : '🔒 LOCKED', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: owned ? '#88ff88' : '#665533',
        }).setOrigin(1, 0.5);
        scrollContainer.add(badge);
      }

      innerY += rowH + (idx < element.abilities.length - 1 ? 6 : 0);
    });

    innerY += 16;

    // Rubber-specific vulcanization mechanic
    if (elementId === 'rubber') {
      sectionHdr('— VULCANIZATION —', '#ff5577');
      const desc = this.add.text(COL_X + 14, innerY, 'Requires owning any rubber upgrade. Hold RIGHT-CLICK to vulcanize (5%/s, max 100%). Locks attacks while charging. Slows cooldowns up to 100% and darkens your player.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffaaaa',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });
      scrollContainer.add(desc);
      innerY += desc.height + 20;
    }

    // Echo-specific psychic eye controls (shown once E+ or Q+ is owned)
    if (elementId === 'echo' && (PlayerData.isUpgradeOwned('echo', 'e') || PlayerData.isUpgradeOwned('echo', 'q'))) {
      sectionHdr('👁  PSYCHIC EYE CONTROLS', '#aaddff');
      const desc = this.add.text(COL_X + 14, innerY, 'Space — Light Trail (consume 1 eye, 3s damage trail)\nRight click — Power-up next attack as direct (consume 1 eye)', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#88bbff', lineSpacing: 4,
      });
      scrollContainer.add(desc);
      innerY += desc.height + 20;
    }

    // Fate-specific card catalog — the 6-card hand is drawn at random from these.
    if (elementId === 'fate') {
      sectionHdr('— CARDS —', '#ffcc66');
      const intro = this.add.text(COL_X + 14, innerY, 'Your hand is drawn at random from the first ten cards (a new card is dealt every 5s). Click throws the highlighted card; number keys pick a card in hand. The last eight cards below are added to your pool by the "New Cards!" shop upgrade.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ccbb88',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });
      scrollContainer.add(intro);
      innerY += intro.height + 12;

      FATE_CARD_DEFS.forEach((card) => {
        const rowH = 30;
        const cardColor = '#' + card.color.toString(16).padStart(6, '0');
        const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 4, card.color).g;
        const nameText = this.add.text(COL_X + 16, innerY + rowH / 2, `${card.emoji}  ${card.name}`, {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: cardColor,
        }).setOrigin(0, 0.5);
        const blurbText = this.add.text(COL_X + 160, innerY + rowH / 2, card.blurb, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aaaabb',
        }).setOrigin(0, 0.5);
        scrollContainer.add([rowBg, nameText, blurbText]);
        innerY += rowH + 4;
      });
      innerY += 16;
    }

    // ── Perks section ──
    sectionHdr('— PERKS —', '#cc88ff');
    if (perks.length === 0) {
      const noPerks = this.add.text(cx, innerY + 6, 'No perks are craftable for this element yet.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444455',
      }).setOrigin(0.5);
      scrollContainer.add(noPerks);
      innerY += 26;
    } else {
      const equippedId = PlayerData.getEquippedPerk(elementId);
      const ELEM_EMOJI: Record<string, string> = {
        fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
        electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
      };
      perks.forEach((perk) => {
        const unlocked = PlayerData.isPerkUnlocked(elementId, perk.id);
        const equipped = equippedId === perk.id;
        const alpha = unlocked ? 1.0 : 0.4;

        const descText = this.add.text(COL_X + 14, innerY + 24, perk.description, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: unlocked ? '#bbaadd' : '#555566',
          wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
        }).setAlpha(alpha);

        const rowH = 24 + descText.height + 12;

        const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.arcane, !unlocked).g;

        const nameText = this.add.text(COL_X + 14, innerY + 12, `${perk.emoji} ${perk.name}`, {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: unlocked ? '#eecfff' : '#555566',
        }).setOrigin(0, 0.5).setAlpha(alpha);

        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join(' + ');
        const recipeText = this.add.text(COL_X + COL_W - 14, innerY + 12, recipeStr, {
          fontSize: '11px', color: unlocked ? '#886633' : '#332222',
        }).setOrigin(1, 0.5).setAlpha(alpha);

        scrollContainer.add([rowBg, nameText, recipeText, descText]);

        if (equipped) {
          const eqLbl = this.add.text(COL_X + 14 + nameText.width + 8, innerY + 12, '✓ EQUIPPED', {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#88ff88',
          }).setOrigin(0, 0.5);
          scrollContainer.add(eqLbl);
        } else if (!unlocked) {
          const lockLbl = this.add.text(COL_X + 14 + nameText.width + 8, innerY + 12, '🔒', {
            fontSize: '10px',
          }).setOrigin(0, 0.5);
          scrollContainer.add(lockLbl);
        }

        innerY += rowH + 6;
      });
    }

    // ── Mastery Enhancements section ──
    const masteryDef = getMasteryDef(elementId);
    if (masteryDef) {
      innerY += 16;
      sectionHdr('— MASTERY ENHANCEMENTS —', '#ffcc00');
      const masteryOn = PlayerData.isMasteryEnabled(elementId);
      masteryDef.enhancements.forEach((enh) => {
        const descText = this.add.text(COL_X + 14, innerY + 24, enh.description, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: masteryOn ? '#ffddaa' : '#555566',
          wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
        }).setAlpha(masteryOn ? 1 : 0.6);

        const rowH = 24 + descText.height + 12;
        const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.gold, !masteryOn).g;

        const infoBinds = PlayerData.getMasteryBinds(elementId);
        const infoSlot = enh.bindable
          ? Object.keys(infoBinds).find((s) => infoBinds[s] === enh.id)
          : undefined;
        const title = enh.bindable
          ? `${enh.name}  [${infoSlot ? infoSlot.toUpperCase() : 'unbound'}]`
          : `${enh.name}  [Passive]`;
        const nameText = this.add.text(COL_X + 14, innerY + 12, title, {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: masteryOn ? '#ffcc00' : '#555566',
        }).setOrigin(0, 0.5);

        const badge = this.add.text(COL_X + COL_W - 14, innerY + 12, masteryOn ? '✓ ACTIVE' : '🔒 LOCKED', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: masteryOn ? '#88ff88' : '#665533',
        }).setOrigin(1, 0.5);

        scrollContainer.add([rowBg, nameText, badge, descText]);
        innerY += rowH + 6;
      });
    }
    } // end standard (Base / Upgraded) content

    // ── Scroll logic ──
    const totalContentH = innerY;
    let scrollY = 0;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);

    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };

    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.input.on('wheel', this.infoScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT + 6, '▼ scroll for more', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 0).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

    // Back button
    this.infoOverlayObjects.push(addButton(this, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closeElementInfo(),
    }).container);
  }

  /** Renders Creation's Build Mode tab — the Nexus potion recipes. Returns the new innerY. */
  private renderCreationBuildInfo(
    container: Phaser.GameObjects.Container,
    cx: number, colX: number, colW: number, startY: number,
  ): number {
    let y = startY;

    const hdr = this.add.text(cx, y, '— BUILD MODE · NEXUS —', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffaa55',
    }).setOrigin(0.5);
    container.add(hdr);
    y += 22;

    const buildSet = getAbilityVariants('creation', 'e');
    const intro = this.add.text(colX + 14, y,
      'Charge bolts with E — tap = Copper, hold ~0.5s = Silver, ~1s = Gold — then load 2 into the Nexus on the ground. The pair you feed it decides which potion it brews; the bottle sits on the Nexus until you walk over and drink it:',
      { fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ccbb99', wordWrap: { width: colW - 28 }, lineSpacing: 3 });
    container.add(intro);
    y += intro.height + 14;

    for (const v of buildSet?.variants ?? []) {
      const descText = this.add.text(colX + 40, y + 22, v.description, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aab0c0',
        wordWrap: { width: colW - 54 }, lineSpacing: 3,
      });
      const rowH = 22 + descText.height + 12;
      const rowBg = this.overlayRow(cx, y + rowH / 2, colW, rowH - 6, C.ember).g;
      const nameText = this.add.text(colX + 14, y + 13, `${v.emoji ? v.emoji + ' ' : ''}${v.name}`, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc88',
      }).setOrigin(0, 0.5);
      container.add([rowBg, nameText, descText]);
      y += rowH + 6;
    }

    if (!buildSet || buildSet.variants.length === 0) {
      const none = this.add.text(cx, y + 6, 'No nexus recipes are defined yet.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444455',
      }).setOrigin(0.5);
      container.add(none);
      y += 26;
    }

    return y + 16;
  }

  private showMasteryScreen(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    const def = getMasteryDef(elementId);
    const elemColor = '#' + element.color.toString(16).padStart(6, '0');

    const SCROLL_TOP = 128;
    const SCROLL_BOT = height - 78;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50);
    bg.setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.add.text(cx, 34, `${element.emoji}  ${element.name.toUpperCase()} MASTERY`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc00',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    const divLine = this.add.line(cx, SCROLL_TOP - 12, -width / 2 + 40, 0, width / 2 - 40, 0, C.arcane, 0.45).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // Back button (declared early so early-return paths can still use it)
    this.infoOverlayObjects.push(addButton(this, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closeElementInfo(),
    }).container);

    if (!def) {
      const soon = this.add.text(cx, height / 2, 'Mastery for this element is coming soon.', {
        fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5).setDepth(51);
      this.infoOverlayObjects.push(soon);
      return;
    }

    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    let innerY = 4;

    const sectionHdr = (text: string, color: string) => {
      const t = this.add.text(cx, innerY, text, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color,
      }).setOrigin(0.5);
      scrollContainer.add(t);
      innerY += 20;
    };

    const complete = isMasteryComplete(elementId);

    sectionHdr('— CHALLENGES —', '#ffcc00');
    def.requirements.forEach((req: MasteryRequirement) => {
      const current = Math.min(req.target, PlayerData.getMasteryStat(elementId, req.key));
      const done = current >= req.target;

      const howToText = this.add.text(COL_X + 14, innerY + 24, req.howTo, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aaaacc',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });

      const barY = innerY + 24 + howToText.height + 14;
      const barW = COL_W - 28;
      const barBg = this.add.rectangle(COL_X + 14 + barW / 2, barY, barW, 10, 0x1a1a2a, 0.9).setStrokeStyle(1, 0x333355);
      const fillW = Math.max(2, (current / req.target) * barW);
      const barFill = this.add.rectangle(COL_X + 14, barY, fillW, 8, done ? 0x44ff88 : 0xffcc00, 0.9).setOrigin(0, 0.5);

      const rowH = 24 + howToText.height + 14 + 14;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6,
        done ? C.verdant : C.steel, !done).g;

      const nameText = this.add.text(COL_X + 14, innerY + 13, req.label, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ddddee',
      }).setOrigin(0, 0.5);

      const countLabel = req.isBest
        ? `best ${current}/${req.target} in one${done ? '  ✓' : ''}`
        : `${current}/${req.target}${done ? '  ✓' : ''}`;
      const countText = this.add.text(COL_X + COL_W - 14, innerY + 13, countLabel, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: done ? '#88ff88' : '#ccaa44',
      }).setOrigin(1, 0.5);

      scrollContainer.add([rowBg, nameText, countText, howToText, barBg, barFill]);
      innerY += rowH + 6;
    });

    innerY += 16;
    sectionHdr('— ENHANCEMENTS —', '#ff8844');
    def.enhancements.forEach((enh) => {
      const descText = this.add.text(COL_X + 14, innerY + 24, enh.description, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffccaa',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });
      const rowH = 24 + descText.height + 12;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.ember).g;
      const boundSlot = enh.bindable
        ? Object.keys(PlayerData.getMasteryBinds(elementId)).find((s) => PlayerData.getMasteryBinds(elementId)[s] === enh.id)
        : undefined;
      const title = enh.bindable
        ? `${enh.name}  [${boundSlot ? boundSlot.toUpperCase() : 'unbound'}]`
        : `${enh.name}  [Passive]`;
      const nameText = this.add.text(COL_X + 14, innerY + 13, title, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffaa66',
      }).setOrigin(0, 0.5);
      scrollContainer.add([rowBg, nameText, descText]);
      innerY += rowH + 6;
    });

    innerY += 16;
    sectionHdr('— UNLOCKED APPEARANCE —', '#ffcc00');
    const previewY = innerY + 40;
    const previewCard = this.add.rectangle(cx, previewY, 100, 108, def.enhancedColor, 0.8).setStrokeStyle(2, def.enhancedColor);
    const previewEmoji = this.add.text(cx, previewY - 20, def.enhancedEmoji, { fontSize: '34px' }).setOrigin(0.5);
    const previewLbl = this.add.text(cx, previewY + 34, `${element.name.toUpperCase()} MASTERED`, {
      fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    scrollContainer.add([previewCard, previewEmoji, previewLbl]);
    innerY = previewY + 70;

    // ── Loadout (last section, scrolls with the rest) ──
    innerY = this.buildMasteryLoadout({
      elementId, element, container: scrollContainer, cx, innerY,
      width, height, scrollTop: SCROLL_TOP, scrollBot: SCROLL_BOT,
      masteryOn: PlayerData.isMasteryEnabled(elementId), emoji: def.enhancedEmoji,
    });

    // ── Scroll logic ──
    // Restores the scroll offset from before this rebuild (e.g. binding/clearing a mastery
    // ability) so those actions don't jerk the view back to the top.
    const totalContentH = innerY;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);
    let scrollY = Phaser.Math.Clamp(this.masteryScrollY, 0, maxScroll);
    scrollContainer.setY(SCROLL_TOP - scrollY);
    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      this.masteryScrollY = scrollY;
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };
    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.input.on('wheel', this.infoScrollHandler);
    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT + 6, '▼ scroll for more', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 0).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

    // ── Enable / Disable button ──
    const enabled = PlayerData.isMasteryEnabled(elementId);
    const btnY = height - 40;
    const btnW = 320, btnH = 44;
    const enableBtn = addButton(this, {
      x: cx, y: btnY, w: btnW, h: btnH,
      label: !complete ? 'LOCKED'
        : enabled ? `${def.name.toUpperCase()} ENABLED`
        : `ENABLE ${def.name.toUpperCase()}`,
      sublabel: !complete ? 'Complete every challenge to unlock'
        : enabled ? 'Click to disable' : undefined,
      icon: !complete ? '🔒' : enabled ? '✓' : def.enhancedEmoji,
      accent: !complete ? C.steel : enabled ? C.verdant : C.gold,
      variant: !complete ? 'quiet' : 'solid',
      fontSize: 14,
      depth: 55,
      disabled: !complete,
      onClick: () => {
        PlayerData.setMasteryEnabled(elementId, !enabled);
        this.renderPhase(width, height, cx);
        this.showMasteryScreen(elementId, width, height, cx);
      },
    });
    this.infoOverlayObjects.push(enableBtn.container);
  }

  /**
   * Final section of the mastery scroll: drag a mastery ability chip onto one of the
   * element's E/R/F/Q slots to replace that ability with it. Click is not a valid target.
   *
   * Everything lives inside the scroll container, so drags are driven manually off scene
   * pointer events with a floating ghost rather than Phaser's `draggable` — container-local
   * drag coordinates would have to be unwound against the live scroll offset otherwise.
   * Returns the updated innerY so the caller can keep laying out below.
   */
  private buildMasteryLoadout(opts: {
    elementId: string; element: Element; container: Phaser.GameObjects.Container;
    cx: number; innerY: number; width: number; height: number;
    scrollTop: number; scrollBot: number; masteryOn: boolean; emoji: string;
  }): number {
    const { elementId, element, container, cx, width, height, scrollTop, scrollBot, masteryOn, emoji } = opts;
    let innerY = opts.innerY;

    const bindables = getBindableEnhancements(elementId);
    if (bindables.length === 0) return innerY;

    const unlocked = isMasteryComplete(elementId);
    const COL_X = 40;
    const COL_W = width - 80;

    innerY += 16;
    const hdr = this.add.text(cx, innerY, '— LOADOUT —', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: unlocked ? '#ffcc00' : '#555566',
    }).setOrigin(0.5);
    container.add(hdr);
    innerY += 20;

    const sub = this.add.text(cx, innerY, unlocked
      ? 'Drag a mastery ability onto a slot to replace that ability. Click cannot be replaced.'
      : 'Complete the challenges above to bind mastery abilities.', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: unlocked ? '#aaaacc' : '#555566',
    }).setOrigin(0.5);
    container.add(sub);
    innerY += 24;

    const panel = this.add.rectangle(cx, innerY + 54, COL_W, 116, 0x0b0b18, 0.85)
      .setStrokeStyle(1, unlocked ? 0x775522 : 0x222233, 0.7);
    container.add(panel);

    // ── Draggable mastery ability chips ──
    const chipY = innerY + 20;
    const chipW = 170, chipH = 24;
    const chipTotal = bindables.length * chipW + (bindables.length - 1) * 10;
    const chipFirstX = cx - chipTotal / 2 + chipW / 2;

    // ── Ability slots (drop targets) ──
    const binds = PlayerData.getMasteryBinds(elementId);
    const slotW = 150, slotGap = 8, slotH = 44;
    const slotY = innerY + 72;
    const baseAbilities = element.abilities.slice(0, 5);
    const totalW = baseAbilities.length * slotW + (baseAbilities.length - 1) * slotGap;
    const firstX = cx - totalW / 2 + slotW / 2;

    const dropTargets: { x: number; slot: MasterySlot }[] = [];

    baseAbilities.forEach((ab, i) => {
      const x = firstX + i * (slotW + slotGap);
      const key = ab.displayKey.toLowerCase();
      const slot = (MASTERY_SLOTS as string[]).includes(key) ? (key as MasterySlot) : null;
      const boundEnh = slot ? getEnhancement(elementId, binds[slot] ?? '') : undefined;

      const box = this.add.rectangle(x, slotY, slotW, slotH,
        boundEnh ? 0x2a1a00 : slot ? 0x14142a : 0x0d0d16, 0.95)
        .setStrokeStyle(2, boundEnh ? 0xffaa00 : slot ? 0x334466 : 0x22222e, 0.9);

      const keyLbl = this.add.text(x - slotW / 2 + 8, slotY - 12, `[${ab.displayKey}]`, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: slot ? '#8899cc' : '#444455',
      }).setOrigin(0, 0.5);

      const nameLbl = this.add.text(x, slotY + 8, boundEnh ? boundEnh.name : ab.name, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: boundEnh ? '#ffcc00' : slot ? '#ccccdd' : '#555566',
      }).setOrigin(0.5);

      container.add([box, keyLbl, nameLbl]);

      if (!slot) {
        const lock = this.add.text(x + slotW / 2 - 8, slotY - 12, '🔒', { fontSize: '10px' })
          .setOrigin(1, 0.5);
        container.add(lock);
        return;
      }

      dropTargets.push({ x, slot });

      if (boundEnh) {
        // ✕ unbinds, restoring the element's own ability to this slot.
        const clear = this.add.text(x + slotW / 2 - 8, slotY - 12, '✕', {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ff8866',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        clear.on('pointerdown', () => {
          // Ignore clicks on rows scrolled out of the visible window.
          if (!this.isInScrollWindow(container, slotY, scrollTop, scrollBot)) return;
          PlayerData.clearMasteryBind(elementId, slot);
          this.showMasteryScreen(elementId, width, height, cx);
        });
        container.add(clear);
      }
    });

    bindables.forEach((enh, i) => {
      const homeX = chipFirstX + i * (chipW + 10);
      const chip = this.add.rectangle(homeX, chipY, chipW, chipH, 0x552200, 0.95)
        .setStrokeStyle(2, 0xffaa00, 0.9);
      const chipLbl = this.add.text(homeX, chipY, `${emoji} ${enh.name}`, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc00',
      }).setOrigin(0.5);
      container.add([chip, chipLbl]);

      if (!unlocked) {
        chip.setAlpha(0.4);
        chipLbl.setAlpha(0.4);
        return;
      }

      chip.setInteractive({ useHandCursor: true });
      chip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isInScrollWindow(container, chipY, scrollTop, scrollBot)) return;
        this.beginMasteryDrag({
          enh, elementId, pointer, chip, chipLbl, emoji,
          // Some enhancements refuse particular slots (Creation's Mortar Command can't take E).
          dropTargets: dropTargets.filter((t) => !(enh.excludeSlots ?? []).includes(t.slot)),
          slotY, slotW, slotH, container,
          width, height, cx,
        });
      });
    });

    innerY += 116;

    if (unlocked && !masteryOn) {
      const note = this.add.text(cx, innerY + 4, 'Mastery is disabled — bindings apply once enabled.', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#775544',
      }).setOrigin(0.5);
      container.add(note);
      innerY += 18;
    }

    return innerY + 10;
  }

  /** True when a scroll-container row at local y is inside the visible (unmasked) window. */
  private isInScrollWindow(
    container: Phaser.GameObjects.Container, localY: number, top: number, bottom: number,
  ): boolean {
    const worldY = container.y + localY;
    return worldY >= top && worldY <= bottom;
  }

  /**
   * Manual drag: the chip stays put and a top-level ghost follows the pointer, so the drag
   * is unaffected by the scroll container's transform and mask.
   */
  private beginMasteryDrag(args: {
    enh: MasteryEnhancement; elementId: string; pointer: Phaser.Input.Pointer;
    chip: Phaser.GameObjects.Rectangle; chipLbl: Phaser.GameObjects.Text; emoji: string;
    dropTargets: { x: number; slot: MasterySlot }[];
    slotY: number; slotW: number; slotH: number;
    container: Phaser.GameObjects.Container;
    width: number; height: number; cx: number;
  }): void {
    const {
      enh, elementId, pointer, chip, chipLbl, emoji, dropTargets,
      slotY, slotW, slotH, container, width, height, cx,
    } = args;

    this.endMasteryDrag(); // never allow two drags at once

    chip.setAlpha(0.35);
    chipLbl.setAlpha(0.35);

    const ghost = this.add.rectangle(pointer.x, pointer.y, chip.width, chip.height, 0x552200, 0.95)
      .setStrokeStyle(2, 0xffcc44, 1).setDepth(70);
    const ghostLbl = this.add.text(pointer.x, pointer.y, `${emoji} ${enh.name}`, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffdd66',
    }).setOrigin(0.5).setDepth(71);
    this.masteryDragGhost = [ghost, ghostLbl];

    // Highlight whichever slot the pointer is currently over.
    const hitTest = (p: Phaser.Input.Pointer) => {
      const worldSlotY = container.y + slotY;
      return dropTargets.find((t) =>
        Math.abs(p.x - t.x) <= slotW / 2 && Math.abs(p.y - worldSlotY) <= slotH / 2) ?? null;
    };

    this.masteryDragMove = (...a: unknown[]) => {
      const p = a[0] as Phaser.Input.Pointer;
      ghost.setPosition(p.x, p.y);
      ghostLbl.setPosition(p.x, p.y);
      const over = hitTest(p);
      ghost.setStrokeStyle(2, over ? 0x66ff88 : 0xffcc44, 1);
    };

    this.masteryDragUp = (...a: unknown[]) => {
      const p = a[0] as Phaser.Input.Pointer;
      const hit = hitTest(p);
      this.endMasteryDrag();
      if (hit) {
        PlayerData.setMasteryBind(elementId, hit.slot, enh.id);
        this.showMasteryScreen(elementId, width, height, cx);
      } else {
        chip.setAlpha(1);
        chipLbl.setAlpha(1);
      }
    };

    this.input.on('pointermove', this.masteryDragMove);
    this.input.on('pointerup', this.masteryDragUp);
  }

  /** Tears down any in-flight mastery drag: removes handlers and destroys the ghost. */
  private endMasteryDrag(): void {
    if (this.masteryDragMove) {
      this.input.off('pointermove', this.masteryDragMove);
      this.masteryDragMove = null;
    }
    if (this.masteryDragUp) {
      this.input.off('pointerup', this.masteryDragUp);
      this.masteryDragUp = null;
    }
    if (this.masteryDragGhost) {
      for (const o of this.masteryDragGhost) o.destroy();
      this.masteryDragGhost = null;
    }
  }

  /**
   * Element customization screen — replaces the old per-card perk strip. One place to
   * toggle mastery, pick a perk, toggle owned upgrades on/off, and equip cosmetics.
   * Every action persists immediately via PlayerData and rebuilds the overlay in place
   * (scroll offset preserved via customizeScrollY, like the mastery screen does).
   */
  private showCustomizeScreen(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    const elemColor = '#' + element.color.toString(16).padStart(6, '0');

    const SCROLL_TOP = 96;
    const SCROLL_BOT = height - 44;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50);
    bg.setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.add.text(cx, 34, `⚙  ${element.name.toUpperCase()} CUSTOMIZATION`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: elemColor,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    const subHdr = this.add.text(cx, 62, '— mastery · perk · upgrades · cosmetics —', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(subHdr);

    const divLine = this.add.line(cx, SCROLL_TOP - 12, -width / 2 + 40, 0, width / 2 - 40, 0, C.arcane, 0.45).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // Back button — closing re-renders the phase so card emoji/mastery state refresh.
    this.infoOverlayObjects.push(addButton(this, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => { this.closeElementInfo(); this.renderPhase(width, height, cx); },
    }).container);

    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    scrollContainer.setMask(maskGfx.createGeometryMask());
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    let innerY = 4;

    const rebuild = () => this.showCustomizeScreen(elementId, width, height, cx);
    const inView = (localY: number) => this.isInScrollWindow(scrollContainer, localY, SCROLL_TOP, SCROLL_BOT);

    const sectionHdr = (text: string, color: string) => {
      const t = this.add.text(cx, innerY, text, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color,
      }).setOrigin(0.5);
      scrollContainer.add(t);
      innerY += 20;
    };

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    // ── MASTERY ─────────────────────────────────────────────────────
    sectionHdr('— MASTERY —', '#ffcc00');
    const masteryDef = getMasteryDef(elementId);
    if (!masteryDef) {
      const soon = this.add.text(cx, innerY + 8, 'Mastery for this element is coming soon.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(soon);
      innerY += 30;
    } else {
      const complete = isMasteryComplete(elementId);
      const enabled = PlayerData.isMasteryEnabled(elementId);
      const rowH = 44;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.gold, !enabled).g;
      const nameText = this.add.text(COL_X + 14, innerY + rowH / 2 - 3, `${masteryDef.enhancedEmoji} ${masteryDef.name}`, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: complete ? '#ffcc00' : '#777788',
      }).setOrigin(0, 0.5);
      scrollContainer.add([rowBg, nameText]);

      if (!complete) {
        const lockLbl = this.add.text(COL_X + COL_W - 14, innerY + rowH / 2 - 3, '🔒 Complete challenges to unlock', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
        }).setOrigin(1, 0.5);
        scrollContainer.add(lockLbl);
      } else {
        const rowLocalY = innerY + rowH / 2;
        const tglW = 110, tglH = 26;
        const tglX = COL_X + COL_W - 14 - tglW / 2;
        const tglBg = this.add.rectangle(tglX, rowLocalY - 3, tglW, tglH,
          enabled ? 0x225533 : 0x333344, 0.95)
          .setStrokeStyle(2, enabled ? 0x44cc66 : 0x555577, 0.9)
          .setInteractive({ useHandCursor: true });
        const tglLbl = this.add.text(tglX, rowLocalY - 3, enabled ? '✓ ENABLED' : 'DISABLED', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: enabled ? '#88ff88' : '#8888aa',
        }).setOrigin(0.5);
        tglBg
          .on('pointerover', () => tglBg.setStrokeStyle(2, 0xffffff, 1))
          .on('pointerout',  () => tglBg.setStrokeStyle(2, enabled ? 0x44cc66 : 0x555577, 0.9))
          .on('pointerdown', () => {
            if (!inView(rowLocalY)) return;
            PlayerData.setMasteryEnabled(elementId, !enabled);
            rebuild();
          });
        scrollContainer.add([tglBg, tglLbl]);
      }
      innerY += rowH;

      const link = this.add.text(COL_X + 14, innerY + 4, 'View challenges & mastery loadout ▸', {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#66ccff',
      }).setInteractive({ useHandCursor: true });
      const linkLocalY = innerY + 4;
      link.on('pointerover', () => link.setColor('#aaeeff'));
      link.on('pointerout',  () => link.setColor('#66ccff'));
      link.on('pointerdown', () => {
        if (!inView(linkLocalY)) return;
        this.masteryScrollY = 0;
        this.showMasteryScreen(elementId, width, height, cx);
      });
      scrollContainer.add(link);
      innerY += 26;
    }
    innerY += 12;

    // ── PERK ────────────────────────────────────────────────────────
    sectionHdr('— PERK —', '#cc88ff');
    const perks = getPerksForElement(elementId);
    if (perks.length === 0) {
      const noPerks = this.add.text(cx, innerY + 8, 'No perks are craftable for this element yet.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noPerks);
      innerY += 30;
    } else {
      const equippedId = PlayerData.getEquippedPerk(elementId);

      // "None" row
      {
        const rowH = 30;
        const isEquipped = equippedId === null;
        const rowLocalY = innerY + rowH / 2;
        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.steel, !isEquipped);
        const noneLbl = this.add.text(COL_X + 14, rowLocalY, isEquipped ? '— no perk —  ✓' : '— no perk —', {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: isEquipped ? '#88ff88' : '#777788',
        }).setOrigin(0, 0.5);
        const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
        rowHit
          .on('pointerover', () => row.paint(true))
          .on('pointerout',  () => row.paint(false))
          .on('pointerdown', () => {
            if (!inView(rowLocalY)) return;
            PlayerData.equipPerk(elementId, null);
            rebuild();
          });
        scrollContainer.add([row.g, noneLbl, rowHit]);
        innerY += rowH + 2;
      }

      for (const perk of perks) {
        const unlocked = PlayerData.isPerkUnlocked(elementId, perk.id);
        const isEquipped = equippedId === perk.id;
        const alpha = unlocked ? 1 : 0.45;
        const rowH = 30;
        const rowLocalY = innerY + rowH / 2;

        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.arcane, !unlocked);
        const nameLbl = this.add.text(COL_X + 14, rowLocalY,
          `${unlocked ? '' : '🔒 '}${perk.emoji} ${perk.name}${isEquipped ? '  ✓' : ''}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: isEquipped ? '#88ff88' : (unlocked ? '#eecfff' : '#555566'),
          }).setOrigin(0, 0.5).setAlpha(alpha);
        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join(' + ');
        const recipeLbl = this.add.text(COL_X + COL_W - 14, rowLocalY, recipeStr, {
          fontSize: '10px', color: unlocked ? '#886633' : '#332222',
        }).setOrigin(1, 0.5).setAlpha(alpha);
        scrollContainer.add([row.g, nameLbl, recipeLbl]);

        if (unlocked) {
          const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
          scrollContainer.add(rowHit);
          rowHit
            .on('pointerover', () => row.paint(true))
            .on('pointerout',  () => row.paint(false))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.equipPerk(elementId, isEquipped ? null : perk.id);
              rebuild();
            });
        }
        innerY += rowH + 2;
      }
    }
    innerY += 12;

    // ── UPGRADES ────────────────────────────────────────────────────
    sectionHdr('— UPGRADES —', '#66ccff');
    const upgrades = getElementUpgrades(elementId);
    if (upgrades.length === 0) {
      const noUpg = this.add.text(cx, innerY + 8, 'This element has no shop upgrades.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noUpg);
      innerY += 30;
    } else {
      const ownedSlots = upgrades.filter((u) => PlayerData.isUpgradeOwned(elementId, u.slot));

      // All ON / All OFF quick buttons (only useful once something is owned)
      if (ownedSlots.length > 0) {
        const btnLocalY = innerY + 12;
        const mk = (label: string, x: number, turnOn: boolean) => {
          const b = this.add.rectangle(x, btnLocalY, 84, 22, 0x222233, 0.95)
            .setStrokeStyle(1, 0x555577, 0.9).setInteractive({ useHandCursor: true });
          const l = this.add.text(x, btnLocalY, label, {
            fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aaaacc',
          }).setOrigin(0.5);
          b.on('pointerover', () => b.setStrokeStyle(2, 0xffffff, 1))
            .on('pointerout',  () => b.setStrokeStyle(1, 0x555577, 0.9))
            .on('pointerdown', () => {
              if (!inView(btnLocalY)) return;
              for (const u of ownedSlots) {
                if (PlayerData.isUpgradeActive(elementId, u.slot) !== turnOn) {
                  PlayerData.toggleUpgrade(elementId, u.slot);
                }
              }
              rebuild();
            });
          scrollContainer.add([b, l]);
        };
        mk('ALL ON', COL_X + COL_W - 150, true);
        mk('ALL OFF', COL_X + COL_W - 56, false);
        innerY += 28;
      }

      for (const upg of upgrades) {
        const owned = PlayerData.isUpgradeOwned(elementId, upg.slot);
        const active = owned && PlayerData.isUpgradeActive(elementId, upg.slot);
        const rowH = 34;
        const rowLocalY = innerY + rowH / 2;

        const rowBg = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          active ? C.verdant : C.steel, !owned).g;
        const keyLbl = this.add.text(COL_X + 14, rowLocalY, `[${upg.displayKey}+]`, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: owned ? elemColor : '#444455',
        }).setOrigin(0, 0.5);
        const nameLbl = this.add.text(COL_X + 78, rowLocalY, upg.name, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: owned ? '#ddddee' : '#555566',
        }).setOrigin(0, 0.5);
        scrollContainer.add([rowBg, keyLbl, nameLbl]);

        if (!owned) {
          const buyLbl = this.add.text(COL_X + COL_W - 14, rowLocalY, '🔒 Buy in Shop', {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
          }).setOrigin(1, 0.5);
          scrollContainer.add(buyLbl);
        } else {
          const tglW = 70, tglH = 22;
          const tglX = COL_X + COL_W - 14 - tglW / 2;
          const tglBg = this.add.rectangle(tglX, rowLocalY, tglW, tglH,
            active ? 0x225533 : 0x333344, 0.95)
            .setStrokeStyle(2, active ? 0x44cc66 : 0x555577, 0.9)
            .setInteractive({ useHandCursor: true });
          const tglLbl = this.add.text(tglX, rowLocalY, active ? 'ON' : 'OFF', {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: active ? '#88ff88' : '#8888aa',
          }).setOrigin(0.5);
          tglBg
            .on('pointerover', () => tglBg.setStrokeStyle(2, 0xffffff, 1))
            .on('pointerout',  () => tglBg.setStrokeStyle(2, active ? 0x44cc66 : 0x555577, 0.9))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.toggleUpgrade(elementId, upg.slot);
              rebuild();
            });
          scrollContainer.add([tglBg, tglLbl]);
        }
        innerY += rowH + 2;
      }
    }
    innerY += 12;

    // ── COSMETICS ───────────────────────────────────────────────────
    sectionHdr('— COSMETICS —', '#ff88cc');
    const allCosmetics = getCosmeticsForElement(elementId);
    if (allCosmetics.length === 0) {
      const noCos = this.add.text(cx, innerY + 8, 'No cosmetics for this element yet — earn them through achievements!', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noCos);
      innerY += 30;
    } else {
      const SLOT_LABELS: Record<CosmeticSlot, string> = { color: '🎨 Color Slot', sigil: '🚩 Sigil Slot' };
      for (const slot of COSMETIC_SLOTS) {
        const slotCosmetics = getCosmeticsForElement(elementId, slot);
        if (slotCosmetics.length === 0) continue;
        const equipped = PlayerData.getEquippedCosmetic(elementId, slot);

        const slotHdr = this.add.text(COL_X + 8, innerY + 6, SLOT_LABELS[slot], {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#dd99cc',
        });
        scrollContainer.add(slotHdr);
        innerY += 26;

        // "None" row
        {
          const rowH = 28;
          const isEquipped = equipped === null;
          const rowLocalY = innerY + rowH / 2;
          const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
            isEquipped ? C.verdant : C.steel, !isEquipped);
          const noneLbl = this.add.text(COL_X + 14, rowLocalY, isEquipped ? '— none —  ✓' : '— none —', {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: isEquipped ? '#88ff88' : '#777788',
          }).setOrigin(0, 0.5);
          const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
          rowHit
            .on('pointerover', () => row.paint(true))
            .on('pointerout',  () => row.paint(false))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.setEquippedCosmetic(elementId, slot, null);
              rebuild();
            });
          scrollContainer.add([row.g, noneLbl, rowHit]);
          innerY += rowH + 2;
        }

        for (const cos of slotCosmetics) {
          const unlocked = isCosmeticUnlocked(cos.id);
          const isEquipped = equipped === cos.id;
          const alpha = unlocked ? 1 : 0.45;

          const descText = this.add.text(COL_X + 14, innerY + 22, cos.description, {
            fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
            color: unlocked ? '#bbaacc' : '#555566',
            wordWrap: { width: COL_W - 28 },
          }).setAlpha(alpha);
          const rowH = 22 + descText.height + 10;
          const rowLocalY = innerY + rowH / 2;

          const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
            isEquipped ? C.verdant : C.arcane, !unlocked);
          const nameLbl = this.add.text(COL_X + 14, innerY + 11,
            `${unlocked ? '' : '🔒 '}${cos.name}${isEquipped ? '  ✓ EQUIPPED' : ''}`, {
              fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
              color: isEquipped ? '#88ff88' : (unlocked ? '#ffccee' : '#555566'),
            }).setOrigin(0, 0.5).setAlpha(alpha);
          scrollContainer.add([row.g, nameLbl, descText]);

          if (!unlocked) {
            const hintLbl = this.add.text(COL_X + COL_W - 14, innerY + 11, `🏆 ${cosmeticUnlockHint(cos.id)}`, {
              fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
            }).setOrigin(1, 0.5);
            scrollContainer.add(hintLbl);
          } else {
            const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
            scrollContainer.add(rowHit);
            rowHit
              .on('pointerover', () => row.paint(true))
              .on('pointerout',  () => row.paint(false))
              .on('pointerdown', () => {
                if (!inView(rowLocalY)) return;
                PlayerData.setEquippedCosmetic(elementId, slot, isEquipped ? null : cos.id);
                rebuild();
              });
          }
          innerY += rowH + 2;
        }
        innerY += 8;
      }
    }

    // ── Scroll logic (offset preserved across rebuilds) ─────────────
    const totalContentH = innerY;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);
    let scrollY = Phaser.Math.Clamp(this.customizeScrollY, 0, maxScroll);
    this.customizeScrollY = scrollY;
    scrollContainer.setY(SCROLL_TOP - scrollY);
    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      this.customizeScrollY = scrollY;
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };
    this.input.on('wheel', this.infoScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT + 6, '▼ scroll for more', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 0).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }
  }

  private showPerkDictionary(width: number, height: number, cx: number): void {
    this.closeElementInfo(); // reuse the same overlay list

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    const SCROLL_TOP = 104;
    const SCROLL_BOT = height - 52;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97)
      .setDepth(50).setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.add.text(cx, 36, '📖  PERK DICTIONARY', {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc88ff',
      stroke: '#440088', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(header);

    const subHdr = this.add.text(cx, 70, '— craft perks in the Lab to equip them on your element —', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(subHdr);

    const divider = this.add.graphics().setDepth(55);
    divider.lineStyle(2, C.arcane, 0.45);
    divider.beginPath(); divider.moveTo(40, 90); divider.lineTo(width - 40, 90); divider.strokePath();
    fillDiamond(divider, width / 2, 90, 4, mix(C.arcane, 0xffffff, 0.4), 0.9);
    this.infoOverlayObjects.push(divider);

    // ── Scrollable container ──
    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    const NAME_Y  = 10;
    const DESC_Y  = 28;
    const ROW_PAD = 10;
    let innerY = 8;

    const tiers: Array<'triple' | 'abstract-triple' | 'quad' | 'penta'> = ['triple', 'abstract-triple', 'quad', 'penta'];
    for (const tier of tiers) {
      const allTierPerks = ALL_PERKS.flatMap((ep) => ep.perks.filter((p) => p.tier === tier));
      if (allTierPerks.length === 0) continue;

      const tierLabel = tier === 'triple'
        ? '— TRIPLE PERKS  (Lab Level 2 · 2 ⚛️) —'
        : tier === 'abstract-triple'
          ? '— ABSTRACT PERKS  (Lab Level 2 · 4 ⚛️) —'
          : tier === 'quad'
            ? '— QUAD PERKS  (Lab Level 3 · 5 ⚛️)  ·  Perkaholic Mutation —'
            : '— PENTA PERKS  (Penta Synthesis · 10 ⚛️) —';
      const tierColor = tier === 'penta' ? '#cc88ff' : (tier === 'quad' ? '#ffaa44' : (tier === 'abstract-triple' ? '#cc66ff' : '#44aaff'));

      const tierHdr = this.add.text(cx, innerY, tierLabel, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: tierColor,
      }).setOrigin(0.5);
      scrollContainer.add(tierHdr);
      innerY += 20;

      for (const perk of allTierPerks) {
        const unlocked = PlayerData.isPerkUnlocked(perk.elementId, perk.id);
        const equipped  = PlayerData.getEquippedPerk(perk.elementId) === perk.id;
        const alpha = unlocked ? 1.0 : 0.35;

        const rowBgFill = 0;
        const rowBgStroke = tier === 'penta' ? C.corrupt
          : tier === 'quad' ? C.gold
          : tier === 'abstract-triple' ? C.arcane
          : C.frost;

        const descText = this.add.text(COL_X + 10, innerY + DESC_Y, perk.description, {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: unlocked ? '#888899' : '#444455',
          wordWrap: { width: COL_W - 20 },
        }).setAlpha(alpha);

        const rowH = DESC_Y + descText.height + ROW_PAD;

        const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 2, rowBgStroke, !unlocked).g;
        void rowBgFill;

        const nameText = this.add.text(COL_X + 10, innerY + NAME_Y, `${perk.emoji} ${perk.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: unlocked ? '#ffffff' : '#555566',
        }).setAlpha(alpha);

        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join(' + ');
        const recipeText = this.add.text(COL_X + COL_W - 8, innerY + NAME_Y, recipeStr, {
          fontSize: '11px', color: unlocked ? '#886633' : '#332222',
        }).setOrigin(1, 0).setAlpha(alpha);

        scrollContainer.add([rowBg, nameText, recipeText, descText]);

        if (equipped) {
          const eqLbl = this.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '✓', {
            fontSize: '11px', fontFamily: 'Arial', color: '#88ff88',
          });
          scrollContainer.add(eqLbl);
        } else if (!unlocked) {
          const lockLbl = this.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '🔒', {
            fontSize: '10px',
          });
          scrollContainer.add(lockLbl);
        }

        innerY += rowH + 3;
      }

      innerY += 14;
    }

    // ── Scroll logic ──
    const totalContentH = innerY;
    let scrollY = 0;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);

    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };

    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.input.on('wheel', this.infoScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT - 4, '▼ scroll', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

    // Back button
    this.infoOverlayObjects.push(addButton(this, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closeElementInfo(),
    }).container);
  }

  private goBack(): void {
    this.input.off('wheel', this.mutationScrollHandler);
    const { width, height } = this.scale;
    const cx = width / 2;
    if (this.selectionPhase === 'player') {
      this.scene.start('TitleScene');
    } else if (this.selectionPhase === 'enemy') {
      this.playerChoice = null;
      this.selectionPhase = 'player';
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    } else if (this.selectionPhase === 'difficulty') {
      if (this.isInvasion) {
        // invasion skips enemy phase, so go back to player selection
        this.playerChoice = null;
        this.selectionPhase = 'player';
      } else {
        this.enemyChoice = null;
        this.selectionPhase = 'enemy';
      }
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    }
  }

  private handleElementClick(elementId: string, width: number, height: number, cx: number): void {
    if (this.selectionPhase === 'player') {
      this.playerChoice = elementId;
      if (this.isInvasion) {
        this.selectionPhase = 'difficulty'; // jump straight to mutations
      } else {
        this.selectionPhase = 'enemy';
        this.elemPage = 0;
      }
    } else if (this.selectionPhase === 'enemy') {
      this.enemyChoice = elementId;
      this.selectionPhase = 'difficulty';
    }
    this.renderPhase(width, height, cx);
  }
}
