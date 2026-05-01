import Phaser from 'phaser';
import { DIFFICULTY_PRESETS } from '../entities/NpcOpponent';
import { SHARD_REWARDS, getElementUpgrades } from '../data/Upgrades';
import { MUTATIONS, activeMutationIds, starredMutationIds, clearMutationSelection, getTotalRewardMult, STARRED_REWARD_MULT, getMutationDef } from '../data/Mutations';
import * as PlayerData from '../data/PlayerData';
import { getPerksForElement, getPerkById, ALL_PERKS } from '../data/Perks';

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
import { rubberElement } from '../elements/rubber';
import { magicElement } from '../elements/magic';
import { technologyElement } from '../elements/technology';
import { silenceElement } from '../elements/silence';
import { echoElement } from '../elements/quantum';
import { quantumElement } from '../elements/quantum-element';
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
  rubber: rubberElement,
  magic: magicElement,
  technology: technologyElement,
  silence: silenceElement,
  echo: echoElement,
  quantum: quantumElement,
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
  { id: 'echo',   name: 'Echo',   emoji: '🦇',  color: 0xccccff, available: true },
  { id: 'rubber', name: 'Rubber', emoji: '🪀', color: 0xff5577, available: true },
  { id: 'magic', name: 'Magic', emoji: '📖', color: 0x9944ff, available: true },
  { id: 'technology', name: 'Technology', emoji: '💻', color: 0x44ccaa, available: true },
  { id: 'silence', name: 'Silence', emoji: '🫥', color: 0x1a0022, available: true },
  { id: 'quantum', name: 'Quantum', emoji: '⚛️', color: 0xaa44ff, available: true },
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
  // Tracks displayed perk strip index per element (-1 = none). Persists across re-renders.
  private perkIndices: Record<string, number> = {};

  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private infoOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private mutationOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private perkDictScrollHandler: (...args: unknown[]) => void = () => {};
  private mutationScrollHandler: (...args: unknown[]) => void = () => {};
  private hoveredDifficulty = 1;
  private konamiBuffer: string[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(data?: { mode?: string }): void {
    this.isInvasion = data?.mode === 'invasion';
    clearMutationSelection();
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

    this.add.text(cx, height - 24, this.isInvasion ? 'Survive as long as you can!' : 'Defeat the enemy to win!', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);

    const controlsHint = 'WASD — move   •   Click / E / R / F / Q — abilities   •   SPACE — Dodge';
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

    // Page indicator (pushed down to make room for perk strips)
    const pageLabel = this.add.text(cx, height / 2 + 155, `${this.elemPage + 1} / ${totalPages}`, {
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

      // ── Perk strip (player phase only) ─────────────────────────
      if (isPlayerPhase) {
        const perks = getPerksForElement(el.id);
        const stripY = by + cardH / 2 + 22;

        if (perks.length === 0) {
          const noPerksLbl = this.add.text(bx, stripY + 6, 'no perks', {
            fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333344',
          }).setOrigin(0.5);
          this.phaseObjects.push(noPerksLbl);
        } else {
          // Sync perkIndices with saved equipped perk on first encounter
          if (!(el.id in this.perkIndices)) {
            const equippedId = PlayerData.getEquippedPerk(el.id);
            this.perkIndices[el.id] = equippedId ? perks.findIndex((p) => p.id === equippedId) : -1;
          }
          const currentIdx = this.perkIndices[el.id] ?? -1;
          const totalSlots = perks.length + 1; // +1 for "none" at index -1

          // Strip background
          const stripBg = this.add.rectangle(bx, stripY + 6, cardW, 30, 0x0d0d1a, 0.85)
            .setStrokeStyle(1, 0x333355);

          // Left arrow
          const canLeft = totalSlots > 1;
          const leftArrow = this.add.text(bx - cardW / 2 + 10, stripY + 6, '◀', {
            fontSize: '12px', fontFamily: '"Arial Black", sans-serif',
            color: canLeft ? '#7766aa' : '#222233',
          }).setOrigin(0.5).setDepth(2);
          if (canLeft) {
            leftArrow.setInteractive({ useHandCursor: true });
            leftArrow.on('pointerover', () => leftArrow.setColor('#cc88ff'));
            leftArrow.on('pointerout',  () => leftArrow.setColor('#7766aa'));
            leftArrow.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              ptr.event.stopPropagation();
              let nextIdx = currentIdx - 1;
              if (nextIdx < -1) nextIdx = perks.length - 1;
              this.perkIndices[el.id] = nextIdx;
              if (nextIdx === -1) {
                PlayerData.equipPerk(el.id, null);
              } else {
                const p = perks[nextIdx];
                if (PlayerData.isPerkUnlocked(el.id, p.id)) PlayerData.equipPerk(el.id, p.id);
                else PlayerData.equipPerk(el.id, null);
              }
              this.renderPhase(width, height, cx);
            });
          }

          // Right arrow
          const rightArrow = this.add.text(bx + cardW / 2 - 10, stripY + 6, '▶', {
            fontSize: '12px', fontFamily: '"Arial Black", sans-serif',
            color: canLeft ? '#7766aa' : '#222233',
          }).setOrigin(0.5).setDepth(2);
          if (canLeft) {
            rightArrow.setInteractive({ useHandCursor: true });
            rightArrow.on('pointerover', () => rightArrow.setColor('#cc88ff'));
            rightArrow.on('pointerout',  () => rightArrow.setColor('#7766aa'));
            rightArrow.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              ptr.event.stopPropagation();
              let nextIdx = currentIdx + 1;
              if (nextIdx >= perks.length) nextIdx = -1;
              this.perkIndices[el.id] = nextIdx;
              if (nextIdx === -1) {
                PlayerData.equipPerk(el.id, null);
              } else {
                const p = perks[nextIdx];
                if (PlayerData.isPerkUnlocked(el.id, p.id)) PlayerData.equipPerk(el.id, p.id);
                else PlayerData.equipPerk(el.id, null);
              }
              this.renderPhase(width, height, cx);
            });
          }

          // Center label
          let centerText: string;
          let centerColor: string;
          if (currentIdx === -1) {
            centerText = '— none —';
            centerColor = '#444455';
          } else {
            const perk = perks[currentIdx];
            const unlocked = PlayerData.isPerkUnlocked(el.id, perk.id);
            const isEquipped = PlayerData.getEquippedPerk(el.id) === perk.id;
            if (unlocked) {
              centerText = isEquipped ? `${perk.emoji} ${perk.name} ✓` : `${perk.emoji} ${perk.name}`;
              centerColor = isEquipped ? '#88ff88' : '#ccaaff';
            } else {
              const recipe = getPerkById(perk.id)?.ingredients.map((r) => {
                const em: Record<string, string> = { fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨' };
                return em[r] ?? r;
              }).join('+') ?? '';
              centerText = `🔒 ${perk.name}  ${recipe}`;
              centerColor = '#443344';
            }
          }
          const centerLbl = this.add.text(bx, stripY + 6, centerText, {
            fontSize: '9px', fontFamily: 'Arial, sans-serif', color: centerColor,
          }).setOrigin(0.5).setDepth(2);

          this.phaseObjects.push(stripBg, leftArrow, rightArrow, centerLbl);
        }
      }
    });

    // ── Perk Dictionary button (player phase only, top-right) ─────
    if (isPlayerPhase) {
      const { width: w } = this.scale;
      const dictCircle = this.add.circle(w - 40, 36, 18, 0x221133, 0.9)
        .setStrokeStyle(2, 0x9944ff, 0.9).setDepth(5).setInteractive({ useHandCursor: true });
      const dictLbl = this.add.text(w - 40, 36, '📖', { fontSize: '16px' }).setOrigin(0.5).setDepth(6);
      dictCircle
        .on('pointerover', () => dictCircle.setFillStyle(0x440077, 0.95))
        .on('pointerout',  () => dictCircle.setFillStyle(0x221133, 0.9))
        .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          ptr.event.stopPropagation();
          this.showPerkDictionary(w, this.scale.height, w / 2);
        });
      this.phaseObjects.push(dictCircle, dictLbl);
    }

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
    const mutTitleY = 215;

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

    this.renderMutationPanel(width, height, cx, mutTitleY);

    // START button
    const startY = height - 55;
    const startBtn = this.add.rectangle(cx, startY, 280, 50, 0x330055)
      .setStrokeStyle(3, 0x8800cc).setInteractive({ useHandCursor: true });
    const startLbl = this.add.text(cx, startY, '⚔  START INVASION', {
      fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#cc44ff',
    }).setOrigin(0.5);
    startBtn
      .on('pointerover', () => { startBtn.setFillStyle(0x550088); startBtn.setStrokeStyle(3, 0xcc44ff); startLbl.setColor('#ffffff'); })
      .on('pointerout',  () => { startBtn.setFillStyle(0x330055); startBtn.setStrokeStyle(3, 0x8800cc); startLbl.setColor('#cc44ff'); })
      .on('pointerdown', () => {
        this.scene.start('ArenaScene', {
          elementId: this.playerChoice,
          mutations: [...activeMutationIds],
          starredMutations: [...starredMutationIds],
          mode: 'invasion',
          playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
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
        .on('pointerover', () => {
          btn.setAlpha(1); btn.setStrokeStyle(3, 0xffffff); descText.setText(DIFF_DESCRIPTIONS[i]);
          this.hoveredDifficulty = diff.level;
          this.refreshRewardsPanel(width);
        })
        .on('pointerout',  () => { btn.setAlpha(0.75); btn.setStrokeStyle(2, color); descText.setText(''); })
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

      this.phaseObjects.push(btn, labelText, hpText);
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

    const mutTitle = this.add.text(cx, titleY, '— MUTATIONS —', {
      fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.phaseObjects.push(mutTitle);

    // ── Rewards panel (static background) ──
    const rPanelBg = this.add.rectangle(RWD_CX, PANEL_TOP + PANEL_H / 2, RWD_W, PANEL_H, 0x10101a, 0.7)
      .setStrokeStyle(1, 0x3a3a55, 1);
    const rPanelTitle = this.add.text(RWD_CX, PANEL_TOP + 12, 'REWARDS PREVIEW', {
      fontSize: '9px', fontFamily: '"Arial Black", sans-serif', color: '#777799',
    }).setOrigin(0.5);
    this.phaseObjects.push(rPanelBg, rPanelTitle);

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

    const buildRows = () => {
      // Destroy old row objects
      for (const obj of this.mutationListObjects) {
        if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      }
      this.mutationListObjects = [];

      let innerY = 4;
      for (const mut of sorted) {
        const unlocked = PlayerData.isMutationUnlocked(mut.id);
        const equipped = activeMutationIds.has(mut.id);
        const starred  = starredMutationIds.has(mut.id);

        const fillColor   = equipped ? 0x1a3a1a : (unlocked ? 0x252535 : 0x141420);
        const borderColor = equipped ? 0x55ee55 : (unlocked ? 0x6677aa : 0x333344);
        const alpha       = unlocked ? 1 : 0.45;

        const rowBg = this.add.rectangle(ROW_W / 2, innerY + ROW_H / 2, ROW_W, ROW_H - 4, fillColor, 1)
          .setStrokeStyle(1, borderColor, 1).setAlpha(alpha);
        scrollContainer.add(rowBg);
        this.mutationListObjects.push(rowBg);

        if (unlocked) {
          rowBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => rowBg.setStrokeStyle(2, 0xffffff, 1))
            .on('pointerout',  () => rowBg.setStrokeStyle(1, borderColor, 1))
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
        }

        // Emoji + name
        const nameColor = unlocked ? '#ffffff' : '#555566';
        const prefix    = unlocked ? '' : '🔒 ';
        const nameText = this.add.text(10, innerY + 12, `${prefix}${mut.emoji} ${mut.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: nameColor,
        }).setAlpha(alpha);
        scrollContainer.add(nameText);
        this.mutationListObjects.push(nameText);

        // Short desc
        const descColor = unlocked ? '#999999' : '#444455';
        const descText = this.add.text(10, innerY + 32, mut.shortDesc, {
          fontSize: '9px', fontFamily: 'Arial, sans-serif', color: descColor,
          wordWrap: { width: ROW_W - 60 },
        }).setAlpha(alpha);
        scrollContainer.add(descText);
        this.mutationListObjects.push(descText);

        // Star button (unlocked only)
        if (unlocked) {
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
        }

        // Info "i" button
        const iX = ROW_W - 22;
        const iCircle = this.add.circle(iX, innerY + ROW_H / 2 - 2, 11, 0x222244, 0.9)
          .setStrokeStyle(1, 0x8888cc, 0.9).setDepth(6).setInteractive({ useHandCursor: true });
        const iLabel = this.add.text(iX, innerY + ROW_H / 2 - 2, 'i', {
          fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaff',
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

        innerY += ROW_H;
      }

      return innerY;
    };

    const totalH = buildRows();
    let scrollY = 0;
    const maxScroll = Math.max(0, totalH - PANEL_H);

    this.mutationScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      scrollContainer.setY(PANEL_TOP - scrollY);
    };
    this.input.on('wheel', this.mutationScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(LIST_X + LIST_W - 4, PANEL_BOT - 2, '▼ scroll', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#444466',
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
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666677', align: 'center',
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
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: rowColor,
        }).setOrigin(0.5).setDepth(6);
        const mText = this.add.text(innerX, innerY + 14, multStr, {
          fontSize: '9px', fontFamily: 'Arial, sans-serif', color: rowColor,
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
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
      }).setOrigin(0.5).setDepth(6);
      this.rewardsPanelDynObjects.push(totalText);
      innerY += 22;

      const baseShard = SHARD_REWARDS[Math.max(0, this.hoveredDifficulty - 1)] ?? 0;
      if (baseShard > 0) {
        const shardsText = this.add.text(innerX, innerY, `💎 +${Math.round(baseShard * totalMult)} shards`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#88ccff',
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
    // Approximate panel bounds (may differ slightly for invasion vs difficulty, acceptable)
    const titleY = this.isInvasion ? 215 : 327;
    const panelTop = titleY + 28;
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

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x05050f, 0.97).setDepth(60);
    bg.setInteractive();
    this.mutationOverlayObjects.push(bg);

    const header = this.add.text(cx, 48, `${def.emoji}  ${def.name.toUpperCase()}`, {
      fontSize: '32px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(61);
    this.mutationOverlayObjects.push(header);

    const statusLabel = this.add.text(cx, 84, unlocked ? '✓ UNLOCKED' : '🔒 LOCKED', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif',
      color: unlocked ? '#44ff88' : '#ff4444',
    }).setOrigin(0.5).setDepth(61);
    this.mutationOverlayObjects.push(statusLabel);

    const divLine = this.add.graphics().setDepth(61);
    divLine.lineStyle(1, 0x223355, 0.6);
    divLine.lineBetween(40, 102, width - 40, 102);
    this.mutationOverlayObjects.push(divLine);

    const sections: Array<{ label: string; text: string; color: string; y: number }> = [
      { label: 'Effects', text: def.fullDesc,    color: '#ddddee', y: 125 },
      { label: 'Starred Effects ★', text: def.starredDesc, color: '#ffeebb', y: 260 },
      { label: 'Rewards', text: `×${def.rewardMult.toFixed(2)} base  (×${(def.rewardMult * STARRED_REWARD_MULT).toFixed(2)} starred)`, color: '#aaffaa', y: 400 },
    ];

    for (const s of sections) {
      const hdr = this.add.text(60, s.y, s.label, {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#8888cc',
      }).setDepth(61);
      const body = this.add.text(60, s.y + 22, s.text, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: s.color,
        wordWrap: { width: width - 120 },
      }).setDepth(61);
      this.mutationOverlayObjects.push(hdr, body);
    }

    const backBtn = this.add.rectangle(60, 30, 90, 32, 0x221133, 0.9)
      .setStrokeStyle(2, 0x9944ff, 0.8).setDepth(65).setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(60, 30, '◀  BACK', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(66);
    backBtn
      .on('pointerover', () => backBtn.setFillStyle(0x440077, 0.95))
      .on('pointerout',  () => backBtn.setFillStyle(0x221133, 0.9))
      .on('pointerdown', () => this.closeMutationInfo());
    this.mutationOverlayObjects.push(backBtn, backLbl);
  }

  private closeElementInfo(): void {
    this.input.off('wheel', this.perkDictScrollHandler);
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
      const halfW = Math.floor(width / 2) - 100;
      const abilityDesc = this.add.text(180, rowY + rowH * 0.55, ab.description, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888899',
        wordWrap: { width: halfW },
      }).setOrigin(0, 0.5).setDepth(52);
      this.infoOverlayObjects.push(abilityDesc);

      // Upgrade info
      if (upgrade) {
        const upgradeLabel = this.add.text(width - 60, rowY + rowH * 0.28, `${upgrade.displayKey}+  ${upgrade.name}`, {
          fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
          stroke: '#553300', strokeThickness: 2,
        }).setOrigin(1, 0.5).setDepth(52);
        this.infoOverlayObjects.push(upgradeLabel);

        const upgradeDesc = this.add.text(width - 60, rowY + rowH * 0.70, upgrade.description, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#aa8833',
          wordWrap: { width: halfW }, align: 'right',
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

    // Rubber-specific vulcanization description block
    if (elementId === 'rubber') {
      const ctrlY = height - 58;
      const vulcHdr = this.add.text(cx, ctrlY, '— VULCANIZATION —', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#ff5577',
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(vulcHdr);
      const vulcReq = this.add.text(cx, ctrlY + 16, 'Requires owning any rubber upgrade', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffaaaa',
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(vulcReq);
      const vulcDesc = this.add.text(cx, ctrlY + 32, 'Hold RIGHT-CLICK to vulcanize (5%/s, max 100%). Locks attacks while charging. Slows cooldowns up to 100% and darkens your player.', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffcccc', align: 'center',
        wordWrap: { width: width - 80 },
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(vulcDesc);
    }

    // Echo-specific psychic eye controls block (shown when E+ or Q+ is owned)
    if (elementId === 'echo' && (PlayerData.isUpgradeOwned('echo', 'e') || PlayerData.isUpgradeOwned('echo', 'q'))) {
      const ctrlY = height - 54;
      const ctrlHdr = this.add.text(cx, ctrlY, '👁  PSYCHIC EYE CONTROLS', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaddff',
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(ctrlHdr);

      const ctrl1 = this.add.text(cx, ctrlY + 18, 'Space — Light Trail (consume 1 eye, 3s damage trail)', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#88bbff',
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(ctrl1);

      const ctrl2 = this.add.text(cx, ctrlY + 32, 'Right click — Power-up next attack as direct (consume 1 eye)', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#88bbff',
      }).setOrigin(0.5).setDepth(52);
      this.infoOverlayObjects.push(ctrl2);
    }

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

  private showPerkDictionary(width: number, height: number, cx: number): void {
    this.closeElementInfo(); // reuse the same overlay list

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    const SCROLL_TOP = 104;
    const SCROLL_BOT = height - 52;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x05050f, 0.97)
      .setDepth(50).setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.add.text(cx, 36, '📖  PERK DICTIONARY', {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      stroke: '#440088', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(header);

    const subHdr = this.add.text(cx, 70, '— craft perks in the Lab to equip them on your element —', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(subHdr);

    const divider = this.add.graphics().setDepth(55);
    divider.lineStyle(1, 0x223355, 0.5);
    divider.lineBetween(40, 90, width - 40, 90);
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
        fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: tierColor,
      }).setOrigin(0.5);
      scrollContainer.add(tierHdr);
      innerY += 20;

      for (const perk of allTierPerks) {
        const unlocked = PlayerData.isPerkUnlocked(perk.elementId, perk.id);
        const equipped  = PlayerData.getEquippedPerk(perk.elementId) === perk.id;
        const alpha = unlocked ? 1.0 : 0.35;

        const rowBgFill   = unlocked ? (tier === 'penta' ? 0x1a0022 : (tier === 'quad' ? 0x1a0d00 : (tier === 'abstract-triple' ? 0x150022 : 0x0d0d1a))) : 0x080808;
        const rowBgStroke = unlocked ? (tier === 'penta' ? 0x441155 : (tier === 'quad' ? 0x443322 : (tier === 'abstract-triple' ? 0x441144 : 0x222244))) : 0x111111;

        const descText = this.add.text(COL_X + 10, innerY + DESC_Y, perk.description, {
          fontSize: '9px', fontFamily: 'Arial, sans-serif',
          color: unlocked ? '#888899' : '#444455',
          wordWrap: { width: COL_W - 20 },
        }).setAlpha(alpha);

        const rowH = DESC_Y + descText.height + ROW_PAD;

        const rowBg = this.add.rectangle(cx, innerY + rowH / 2, COL_W, rowH - 2,
          rowBgFill, unlocked ? 0.8 : 0.5)
          .setStrokeStyle(1, rowBgStroke, 0.8);

        const nameText = this.add.text(COL_X + 10, innerY + NAME_Y, `${perk.emoji} ${perk.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", sans-serif',
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

    this.perkDictScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.input.on('wheel', this.perkDictScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT - 4, '▼ scroll', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

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
