import Phaser from 'phaser';
import { DIFFICULTY_PRESETS } from '../entities/NpcOpponent';
import { SHARD_REWARDS, getElementUpgrades } from '../data/Upgrades';
import { MUTATIONS, activeMutationIds } from '../data/Mutations';
import * as PlayerData from '../data/PlayerData';

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
import { deathElement } from '../elements/death';
import { voidElement } from '../elements/void';
import { adrenalineElement } from '../elements/adrenaline';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { magmaElement } from '../elements/magma';
import { dummyElement } from '../elements/dummy';

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
  death: deathElement,
  void: voidElement,
  adrenaline: adrenalineElement,
  magic: magicElement,
  technology: technologyElement,
  silence: silenceElement,
  magma: magmaElement,
  dummy: dummyElement,
};

interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  available: boolean;
}

const ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400, available: true  },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff, available: true  },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44, available: true  },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff, available: true  },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755, available: true  },
];

const COMBINED_ELEMENTS: ElementDef[] = [
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
const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire',
  slime: 'water',
  fate: 'life',
  sound: 'air',
  light: 'earth',
};

const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00, available: true },
  { id: 'slime', name: 'Slime', emoji: '🟢', color: 0x66cc44, available: true },
  { id: 'fate', name: 'Fate', emoji: '🃏', color: 0x88eecc, available: true },
  { id: 'sound', name: 'Sound', emoji: '🔊', color: 0xff66cc, available: true },
  { id: 'light', name: 'Light', emoji: '✨', color: 0xfff4a8, available: true },
];

/** Abstract combined elements — created by fusing two abstract elements in a Lvl 1+ Lab. */
const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet', name: 'Magnet', emoji: '🧲', color: 0xcc2244, available: true },
  { id: 'metal',  name: 'Metal',  emoji: '⚙️',  color: 0x8899aa, available: true },
  { id: 'plasma', name: 'Plasma', emoji: '🔮',  color: 0xaa22ff, available: true },
  { id: 'death',  name: 'Death',  emoji: '💀',  color: 0x440066, available: true },
  { id: 'void',   name: 'Void',   emoji: '🌑',  color: 0x220033, available: true },
  { id: 'adrenaline', name: 'Adrenaline', emoji: '⚡️', color: 0xffbb22, available: true },
  { id: 'magic', name: 'Magic', emoji: '📖', color: 0x9944ff, available: true },
  { id: 'technology', name: 'Technology', emoji: '💻', color: 0x44ccaa, available: true },
  { id: 'silence', name: 'Silence', emoji: '🫥', color: 0x1a0022, available: true },
  { id: 'magma', name: 'Magma', emoji: '🌋', color: 0xff4500, available: true },
];

const DIFF_COLORS = [0x22cc44, 0x88cc22, 0xddaa00, 0xee5500, 0xcc0022];

// WWSSADADBA (Konami-style, using WASD mapping: W=Up S=Down A=Left D=Right then B A)
const DUMMY_SEQUENCE = ['W','W','S','S','A','D','A','D','B','A'];

export class MenuScene extends Phaser.Scene {
  private selectionPhase: 'player' | 'enemy' | 'difficulty' = 'player';
  private playerChoice: string | null = null;
  private enemyChoice: string | null = null;
  private elemPage = 0;
  private isPvP = false;
  private isInvasion = false;

  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private infoOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private konamiBuffer: string[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(data?: { isPvP?: boolean; mode?: string }): void {
    this.isPvP = data?.isPvP ?? false;
    this.isInvasion = data?.mode === 'invasion';
    activeMutationIds.clear();
    this.selectionPhase = 'player';
    this.playerChoice = null;
    this.enemyChoice = null;
    this.elemPage = 0;
    this.phaseObjects = [];

    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Persistent chrome ──────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    this.add.text(cx, 90, 'ELEMENTAL', {
      fontSize: '68px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ff8800',
      stroke: '#ff2200',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, height - 24, this.isInvasion ? 'Survive as long as you can!' : this.isPvP ? 'Two players, one keyboard!' : 'Defeat the enemy to win!', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);

    const controlsHint = this.isPvP
      ? 'P1: WASD+Mouse  •  P2: Arrows+IJKL(aim)+U/O/P/;/\'(abilities)+/(dodge)'
      : 'WASD — move   •   Click / E / R / F / Q — abilities   •   SPACE — Dodge';
    this.add.text(cx, height - 48, controlsHint, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.rectangle(52, 36, 88, 36, 0x222233).setStrokeStyle(1, 0x555577).setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', { fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa' }).setOrigin(0.5);
    backBtn.on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); });
    backBtn.on('pointerout',  () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); });
    backBtn.on('pointerdown', () => this.goBack());

    // Esc: close info overlay if open, else go back one phase
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.infoOverlayObjects.length > 0) {
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
        if (!PlayerData.isDummyUnlocked()) {
          PlayerData.unlockDummy();
          this.renderPhase(width, height, cx);
        }
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
      ? (this.isInvasion ? 'INVASION — pick your element' : this.isPvP ? 'Player 1: Choose your element' : 'Choose your element')
      : (this.isPvP ? 'Player 2: Choose your element' : 'Choose enemy element');
    const subtitleObj = this.add.text(cx, 158, subtitle, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.phaseObjects.push(subtitleObj);

    if (!isPlayerPhase && this.playerChoice) {
      const chosen = this.findElement(this.playerChoice);
      if (chosen) {
        const indicator = this.add.text(cx, 196, `YOU:  ${chosen.emoji} ${chosen.name}`, {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc44',
        }).setOrigin(0.5);
        this.phaseObjects.push(indicator);
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

    // Page indicator
    const pageLabel = this.add.text(cx, height / 2 + 110, `${this.elemPage + 1} / ${totalPages}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555566',
    }).setOrigin(0.5);
    this.phaseObjects.push(pageLabel);

    // Page arrows
    if (this.elemPage > 0) {
      const leftBtn = this.add.rectangle(28, height / 2 + 20, 32, 64, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      const leftLbl = this.add.text(28, height / 2 + 20, '◀', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      leftBtn
        .on('pointerover', () => leftBtn.setFillStyle(0x550099))
        .on('pointerout',  () => leftBtn.setFillStyle(0x330066))
        .on('pointerdown', () => {
          this.elemPage--;
          this.renderPhase(width, height, cx);
        });
      this.phaseObjects.push(leftBtn, leftLbl);
    }

    if (this.elemPage < totalPages - 1 && (this.elemPage > 0 || unlockedExtra.length > 0)) {
      const rightBtn = this.add.rectangle(width - 28, height / 2 + 20, 32, 64, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      const rightLbl = this.add.text(width - 28, height / 2 + 20, '▶', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      rightBtn
        .on('pointerover', () => rightBtn.setFillStyle(0x550099))
        .on('pointerout',  () => rightBtn.setFillStyle(0x330066))
        .on('pointerdown', () => {
          this.elemPage++;
          this.renderPhase(width, height, cx);
        });
      this.phaseObjects.push(rightBtn, rightLbl);
    }

    // Element cards
    const cardW = 140;
    const cardH = 150;
    const gap = 16;
    const totalW = currentElements.length * cardW + (currentElements.length - 1) * gap;
    const startX = cx - totalW / 2;

    if (this.elemPage > 0 && currentElements.length === 0) {
      const noElems = this.add.text(cx, height / 2 + 20, 'No extra elements discovered yet.\nVisit the LAB to unlock combined elements,\nor complete Gauntlets to unlock Abstract Elements.', {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#555577', align: 'center',
      }).setOrigin(0.5);
      this.phaseObjects.push(noElems);
      return;
    }

    currentElements.forEach((el, i) => {
      const bx = startX + i * (cardW + gap) + cardW / 2;
      const by = height / 2 + 20;

      const clickable = el.available;
      const fillAlpha = clickable ? 0.8 : 0.3;
      const borderColor = clickable ? el.color : 0x444444;

      const card = this.add
        .rectangle(bx, by, cardW, cardH, clickable ? el.color : 0x222233, fillAlpha)
        .setStrokeStyle(2, borderColor);

      const emojiText = this.add.text(bx, by - 32, el.emoji, { fontSize: '44px' }).setOrigin(0.5);

      const nameText = this.add.text(bx, by + 26, el.name.toUpperCase(), {
        fontSize: '15px',
        fontFamily: '"Arial Black", sans-serif',
        color: clickable ? '#ffffff' : '#555555',
      }).setOrigin(0.5);

      let statusText: Phaser.GameObjects.Text;
      if (clickable) {
        statusText = this.add.text(bx, by + 52, '▶  SELECT', {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc00',
        }).setOrigin(0.5);

        card
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => { card.setAlpha(1); card.setStrokeStyle(3, 0xffffff); })
          .on('pointerout', () => { card.setAlpha(fillAlpha); card.setStrokeStyle(2, borderColor); })
          .on('pointerdown', () => this.handleElementClick(el.id, width, height, cx));
      } else {
        statusText = this.add.text(bx, by + 52, 'coming soon', {
          fontSize: '11px', color: '#444444',
        }).setOrigin(0.5);
      }

      // "i" info button — top-right corner of card
      const iBtnX = bx + cardW / 2 - 14;
      const iBtnY = by - cardH / 2 + 14;
      const iCircle = this.add.circle(iBtnX, iBtnY, 11, 0x222244, 0.9)
        .setStrokeStyle(1, 0x8888cc, 0.9).setDepth(3).setInteractive({ useHandCursor: true });
      const iLabel = this.add.text(iBtnX, iBtnY, 'i', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaff',
      }).setOrigin(0.5).setDepth(4);
      iCircle
        .on('pointerover', () => iCircle.setFillStyle(0x4444aa, 0.95))
        .on('pointerout',  () => iCircle.setFillStyle(0x222244, 0.9))
        .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          ptr.event.stopPropagation();
          this.showElementInfo(el.id, width, height, cx);
        });

      this.phaseObjects.push(card, emojiText, nameText, statusText, iCircle, iLabel);
    });

    // Dummy enemy — shown only on enemy phase when unlocked via konami code
    if (!isPlayerPhase && PlayerData.isDummyUnlocked()) {
      const dy = height / 2 + 130;
      const dBtn = this.add.rectangle(cx, dy, 180, 32, 0x333333)
        .setStrokeStyle(2, 0xaaaaaa).setInteractive({ useHandCursor: true });
      const dLbl = this.add.text(cx, dy, '🎯  DUMMY MODE', {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#bbbbbb',
      }).setOrigin(0.5).setDepth(1);
      dBtn
        .on('pointerover', () => dBtn.setFillStyle(0x555555))
        .on('pointerout',  () => dBtn.setFillStyle(0x333333))
        .on('pointerdown', () => this.handleElementClick('dummy', width, height, cx));
      this.phaseObjects.push(dBtn, dLbl);
    }
  }

  private renderInvasionStartPhase(width: number, height: number, cx: number, playerEl: ElementDef | undefined): void {
    const mutTitleY = 230;
    const mutRow0Y  = 268;
    const mutRow1Y  = 318;
    const mutRow2Y  = 368;

    const subtitle = this.add.text(cx, 155, 'INVASION', {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#cc44ff',
      stroke: '#330055', strokeThickness: 4,
    }).setOrigin(0.5);
    this.phaseObjects.push(subtitle);

    if (playerEl) {
      const indicator = this.add.text(cx, 186, `${playerEl.emoji} ${playerEl.name}  —  Defend against the waves`, {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffcc44',
      }).setOrigin(0.5);
      this.phaseObjects.push(indicator);
    }

    const mutTitle = this.add.text(cx, mutTitleY, '— MUTATIONS —', {
      fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.phaseObjects.push(mutTitle);

    const togW = 172; const togH = 40; const togGapX = 10; const mutCols = 4;
    const totalTogW = mutCols * togW + (mutCols - 1) * togGapX;
    const togStartX = cx - totalTogW / 2;
    const rowY = [mutRow0Y, mutRow1Y, mutRow2Y];

    MUTATIONS.forEach((mut, idx) => {
      const col = idx % mutCols;
      const row = Math.floor(idx / mutCols);
      const tx = togStartX + col * (togW + togGapX) + togW / 2;
      const ty = rowY[row];

      const isOn = () => activeMutationIds.has(mut.id);
      const getColor  = () => isOn() ? 0x1a3a1a : 0x252535;
      const getBorder = () => isOn() ? 0x55ee55 : 0x9999bb;

      const tog = this.add.rectangle(tx, ty, togW, togH, getColor(), 1)
        .setStrokeStyle(2, getBorder()).setInteractive({ useHandCursor: true });
      const togLabel = this.add.text(tx, ty - 7, `${mut.emoji} ${mut.name}`, {
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: isOn() ? '#88ff88' : '#cccccc',
      }).setOrigin(0.5);
      const togDesc = this.add.text(tx, ty + 9, mut.description, {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: isOn() ? '#66dd66' : '#999999',
      }).setOrigin(0.5);

      const refresh = () => {
        tog.setFillStyle(getColor(), 1);
        tog.setStrokeStyle(2, getBorder());
        togLabel.setColor(isOn() ? '#88ff88' : '#cccccc');
        togDesc.setColor(isOn() ? '#66dd66' : '#999999');
      };
      tog
        .on('pointerover', () => tog.setStrokeStyle(3, 0xffffff))
        .on('pointerout',  () => tog.setStrokeStyle(2, getBorder()))
        .on('pointerdown', () => { if (isOn()) activeMutationIds.delete(mut.id); else activeMutationIds.add(mut.id); refresh(); });
      this.phaseObjects.push(tog, togLabel, togDesc);
    });

    // START button
    const startY = height - 90;
    const startBtn = this.add.rectangle(cx, startY, 280, 60, 0x330055)
      .setStrokeStyle(3, 0x8800cc).setInteractive({ useHandCursor: true });
    const startLbl = this.add.text(cx, startY, '⚔  START INVASION', {
      fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#cc44ff',
    }).setOrigin(0.5);
    startBtn
      .on('pointerover', () => { startBtn.setFillStyle(0x550088); startBtn.setStrokeStyle(3, 0xcc44ff); startLbl.setColor('#ffffff'); })
      .on('pointerout',  () => { startBtn.setFillStyle(0x330055); startBtn.setStrokeStyle(3, 0x8800cc); startLbl.setColor('#cc44ff'); })
      .on('pointerdown', () => {
        this.scene.start('ArenaScene', {
          elementId: this.playerChoice,
          mutations: [...activeMutationIds],
          mode: 'invasion',
        });
      });
    this.phaseObjects.push(startBtn, startLbl);
  }

  private renderDifficultyPhase(width: number, height: number, cx: number): void {
    const playerEl = this.findElement(this.playerChoice ?? '');
    const enemyEl  = this.findElement(this.enemyChoice ?? '');

    const diffBtnY  = 228;
    const descY     = 292;
    const mutTitleY = 327;
    const mutRow0Y  = 364;
    const mutRow1Y  = 415;
    const mutRow2Y  = 466;

    const subtitle = this.add.text(cx, 155, 'Choose difficulty', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.phaseObjects.push(subtitle);

    if (playerEl && enemyEl) {
      const indicator = this.add.text(
        cx, 186,
        `${playerEl.emoji} ${playerEl.name}   vs   ${enemyEl.emoji} ${enemyEl.name}`,
        { fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffcc44' },
      ).setOrigin(0.5);
      this.phaseObjects.push(indicator);
    }

    const btnW = 148;
    const btnH = 60;
    const btnGap = 10;
    const totalW = DIFFICULTY_PRESETS.length * btnW + (DIFFICULTY_PRESETS.length - 1) * btnGap;
    const startX = cx - totalW / 2;

    const descText = this.add.text(cx, descY, '', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5);
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
      const btn = this.add
        .rectangle(bx, diffBtnY, btnW, btnH, color, 0.75)
        .setStrokeStyle(2, color)
        .setInteractive({ useHandCursor: true });

      const labelText = this.add.text(bx, diffBtnY - 8, diff.label.toUpperCase(), {
        fontSize: '13px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      const hpText = this.add.text(bx, diffBtnY + 8, `HP: ${diff.hp}  💎+${SHARD_REWARDS[i]}`, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#eeeeee',
      }).setOrigin(0.5);

      btn
        .on('pointerover', () => { btn.setAlpha(1); btn.setStrokeStyle(3, 0xffffff); descText.setText(DIFF_DESCRIPTIONS[i]); })
        .on('pointerout',  () => { btn.setAlpha(0.75); btn.setStrokeStyle(2, color); descText.setText(''); })
        .on('pointerdown', () => {
          this.scene.start('ArenaScene', {
            elementId: this.playerChoice,
            enemyElementId: this.enemyChoice,
            difficulty: diff.level,
            mutations: [...activeMutationIds],
          });
        });

      this.phaseObjects.push(btn, labelText, hpText);
    });

    // ── Mutation toggles (3 rows × 4 cols) ──────────────────────────
    const mutTitle = this.add.text(cx, mutTitleY, '— MUTATIONS —', {
      fontSize: '11px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.phaseObjects.push(mutTitle);

    const togW = 172;
    const togH = 40;
    const togGapX = 10;
    const mutCols = 4;
    const totalTogW = mutCols * togW + (mutCols - 1) * togGapX;
    const togStartX = cx - totalTogW / 2;
    const rowY = [mutRow0Y, mutRow1Y, mutRow2Y];

    MUTATIONS.forEach((mut, idx) => {
      const col = idx % mutCols;
      const row = Math.floor(idx / mutCols);
      const tx = togStartX + col * (togW + togGapX) + togW / 2;
      const ty = rowY[row];

      const isOn = () => activeMutationIds.has(mut.id);
      const getColor  = () => isOn() ? 0x1a3a1a : 0x252535;
      const getBorder = () => isOn() ? 0x55ee55 : 0x9999bb;

      const tog = this.add
        .rectangle(tx, ty, togW, togH, getColor(), 1)
        .setStrokeStyle(2, getBorder())
        .setInteractive({ useHandCursor: true });

      const togLabel = this.add.text(tx, ty - 7, `${mut.emoji} ${mut.name}`, {
        fontSize: '12px',
        fontFamily: '"Arial Black", sans-serif',
        color: isOn() ? '#88ff88' : '#cccccc',
      }).setOrigin(0.5);

      const togDesc = this.add.text(tx, ty + 9, mut.description, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: isOn() ? '#66dd66' : '#999999',
      }).setOrigin(0.5);

      const refresh = () => {
        tog.setFillStyle(getColor(), 1);
        tog.setStrokeStyle(2, getBorder());
        togLabel.setColor(isOn() ? '#88ff88' : '#cccccc');
        togDesc.setColor(isOn() ? '#66dd66' : '#999999');
      };

      tog
        .on('pointerover', () => tog.setStrokeStyle(3, 0xffffff))
        .on('pointerout',  () => tog.setStrokeStyle(2, getBorder()))
        .on('pointerdown', () => {
          if (isOn()) activeMutationIds.delete(mut.id);
          else activeMutationIds.add(mut.id);
          refresh();
        });

      this.phaseObjects.push(tog, togLabel, togDesc);
    });
  }

  private closeElementInfo(): void {
    for (const obj of this.infoOverlayObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.infoOverlayObjects = [];
  }

  private showElementInfo(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    const upgrades = getElementUpgrades(elementId);

    // Full-screen dark backdrop
    const bg = this.add.rectangle(cx, height / 2, width, height, 0x05050f, 0.97).setDepth(50);
    bg.setInteractive(); // capture clicks so they don't fall through
    this.infoOverlayObjects.push(bg);

    // Header
    const header = this.add.text(cx, 45, `${element.emoji}  ${element.name.toUpperCase()}`, {
      fontSize: '32px', fontFamily: '"Arial Black", sans-serif', color: '#' + element.color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    const subHdr = this.add.text(cx, 80, '— ABILITIES & UPGRADES —', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(subHdr);

    // Divider
    const divLine = this.add.line(cx, 97, -width / 2 + 40, 0, width / 2 - 40, 0, 0x223355, 0.5).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // List each ability + its upgrade
    const startY = 115;
    const rowH = (height - startY - 60) / element.abilities.length;
    element.abilities.forEach((ab, idx) => {
      const rowY = startY + idx * rowH;
      const upgrade = upgrades.find((u) => u.slot === ab.displayKey.toLowerCase());

      // Ability row background
      const rowBg = this.add.rectangle(cx, rowY + rowH / 2 - 4, width - 80, rowH - 8, 0x0d0d22, 0.7)
        .setStrokeStyle(1, 0x222244, 0.5).setDepth(51);
      this.infoOverlayObjects.push(rowBg);

      // Key badge
      const keyColor = '#' + element.color.toString(16).padStart(6, '0');
      const keyBadge = this.add.text(120, rowY + rowH * 0.28, `[${ab.displayKey}]`, {
        fontSize: '15px', fontFamily: '"Arial Black", sans-serif', color: keyColor,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(keyBadge);

      // Ability name
      const cdSec = ab.cooldown >= 1000 ? `  ${ab.cooldown / 1000}s CD` : '';
      const abilityName = this.add.text(180, rowY + rowH * 0.28, `${ab.name}${cdSec}`, {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#ddddee',
      }).setOrigin(0, 0.5).setDepth(52);
      this.infoOverlayObjects.push(abilityName);

      // Ability description
      const abilityDesc = this.add.text(180, rowY + rowH * 0.55, ab.description, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888899',
        wordWrap: { width: width - 260 },
      }).setOrigin(0, 0.5).setDepth(52);
      this.infoOverlayObjects.push(abilityDesc);

      // Upgrade info
      if (upgrade) {
        const upgradeLabel = this.add.text(width - 60, rowY + rowH * 0.28, `${upgrade.displayKey}+  ${upgrade.name}`, {
          fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
          stroke: '#553300', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(52);
        this.infoOverlayObjects.push(upgradeLabel);

        const upgradeDesc = this.add.text(width - 60, rowY + rowH * 0.62, upgrade.description, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#aa8833',
          wordWrap: { width: 320 }, align: 'right',
        }).setOrigin(1, 0.5).setDepth(52);
        this.infoOverlayObjects.push(upgradeDesc);
      } else {
        const noUpgrade = this.add.text(width - 60, rowY + rowH * 0.45, 'No upgrade yet', {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#444455',
        }).setOrigin(1, 0.5).setDepth(52);
        this.infoOverlayObjects.push(noUpgrade);
      }

      // Row divider
      if (idx < element.abilities.length - 1) {
        const rl = this.add.line(cx, rowY + rowH - 4, -width / 2 + 40, 0, width / 2 - 40, 0, 0x1a1a33, 0.4).setDepth(51).setLineWidth(1);
        this.infoOverlayObjects.push(rl);
      }
    });

    // Back button
    const backBtn = this.add.rectangle(60, 30, 90, 32, 0x221133, 0.9)
      .setStrokeStyle(2, 0x9944ff, 0.8).setDepth(55).setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(60, 30, '◀  BACK', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(56);
    backBtn
      .on('pointerover', () => backBtn.setFillStyle(0x440077, 0.95))
      .on('pointerout',  () => backBtn.setFillStyle(0x221133, 0.9))
      .on('pointerdown', () => this.closeElementInfo());
    this.infoOverlayObjects.push(backBtn, backLbl);
  }

  private goBack(): void {
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
      if (this.isPvP) {
        this.scene.start('ArenaScene', {
          elementId: this.playerChoice,
          enemyElementId: this.enemyChoice,
          isPvP: true,
        });
        return;
      }
      this.selectionPhase = 'difficulty';
    }
    this.renderPhase(width, height, cx);
  }
}
