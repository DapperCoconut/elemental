import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findRecipe } from '../data/Recipes';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';

const BASE_ELEMENTS = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
];

const ALL_ABSTRACT_ELEMENTS = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Slime',       emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

const SLOT_W = 100;
const SLOT_H = 100;

export class LabScene extends Phaser.Scene {
  private slot1Id: string | null = null;
  private slot2Id: string | null = null;
  private slot1Visual: Phaser.GameObjects.Container | null = null;
  private slot2Visual: Phaser.GameObjects.Container | null = null;
  private nucleiText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private mergeBtnLabel!: Phaser.GameObjects.Text;

  // Slot positions (set in create)
  private slot1X = 0;
  private slot1Y = 0;
  private slot2X = 0;
  private slot2Y = 0;

  constructor() {
    super({ key: 'LabScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background + grid
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 36, '⚗️  LAB', {
      fontSize: '40px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff',
      stroke: '#440088',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Lab level indicator
    const labLevel = PlayerData.getLabLevel();
    const labLevelStr = labLevel === 0 ? 'Base Lab' : `Lab Level ${labLevel}`;
    this.add.text(cx, 62, labLevelStr, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#9966cc',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.rectangle(52, 36, 88, 36, 0x222233).setStrokeStyle(1, 0x555577).setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', { fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa' }).setOrigin(0.5);
    backBtn.on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); });
    backBtn.on('pointerout',  () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    // Nucleus counter (top right)
    this.nucleiText = this.add.text(width - 16, 12, '', {
      fontSize: '18px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff',
    }).setOrigin(1, 0);
    this.refreshNuclei();

    // Instructions
    this.add.text(cx, 88, 'Drag elements into the merge slots, then press MERGE', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#666688',
    }).setOrigin(0.5);

    // ── Base element circles (draggable) ──────────────────────────
    const circleY = 200;
    const allElements = this.getAvailableElements();
    const totalW = allElements.length * 100 + (allElements.length - 1) * 20;
    const startX = cx - totalW / 2 + 50;

    // Section label
    this.add.text(cx, 115, 'BASE ELEMENTS', {
      fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#555566',
    }).setOrigin(0.5);

    // Draw base elements
    const baseCount = BASE_ELEMENTS.length;
    const baseTotalW = baseCount * 100 + (baseCount - 1) * 20;
    const baseStartX = cx - baseTotalW / 2 + 50;
    BASE_ELEMENTS.forEach((el, i) => {
      const ox = baseStartX + i * 120;
      const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, circleY);
      this.makeCircleDraggable(container, el.id, ox, circleY);
    });

    // Draw abstract elements (if any are unlocked)
    const unlockedAbstract = this.getUnlockedAbstractElements();
    if (unlockedAbstract.length > 0) {
      const absY = circleY + 120;
      const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
      const absStartX = cx - absTotalW / 2 + 50;

      this.add.text(cx, circleY + 75, 'ABSTRACT ELEMENTS', {
        fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#9966cc',
      }).setOrigin(0.5);

      unlockedAbstract.forEach((el, i) => {
        const ox = absStartX + i * 120;
        const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, absY, true);
        this.makeCircleDraggable(container, el.id, ox, absY);
      });
    }

    void allElements; void totalW; void startX;

    // ── Merge slots ──────────────────────────────────────────
    const hasAbstract = unlockedAbstract.length > 0;
    const slotY = hasAbstract ? 460 : 400;
    this.slot1X = cx - 90;
    this.slot1Y = slotY;
    this.slot2X = cx + 90;
    this.slot2Y = slotY;

    // Slot backgrounds
    this.add.rectangle(this.slot1X, this.slot1Y, SLOT_W, SLOT_H, 0x220044, 1)
      .setStrokeStyle(2, 0x9944ff);
    this.add.text(this.slot1X, this.slot1Y, 'Slot 1', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#664499',
    }).setOrigin(0.5).setDepth(1);

    this.add.rectangle(this.slot2X, this.slot2Y, SLOT_W, SLOT_H, 0x220044, 1)
      .setStrokeStyle(2, 0x9944ff);
    this.add.text(this.slot2X, this.slot2Y, 'Slot 2', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#664499',
    }).setOrigin(0.5).setDepth(1);

    // Plus sign between slots
    this.add.text(cx, slotY, '+', {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#9944ff',
    }).setOrigin(0.5);

    // ── MERGE button ──────────────────────────────────────────
    const mergeY = slotY + 80;
    const mergeBtn = this.add.rectangle(cx, mergeY, 240, 48, 0x330066, 1)
      .setStrokeStyle(2, 0x9944ff)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    this.mergeBtnLabel = this.add.text(cx, mergeY, '⚛️  MERGE  (1 Nucleus)', {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(6);
    mergeBtn.on('pointerover', () => mergeBtn.setFillStyle(0x550099));
    mergeBtn.on('pointerout',  () => mergeBtn.setFillStyle(0x330066));
    mergeBtn.on('pointerdown', () => this.attemptMerge());

    // Message text (result / error feedback)
    this.messageText = this.add.text(cx, mergeY + 44, '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc44',
      align: 'center',
    }).setOrigin(0.5).setDepth(6);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private getAvailableElements(): Array<{ id: string; name: string; emoji: string; color: number }> {
    return [...BASE_ELEMENTS, ...this.getUnlockedAbstractElements()];
  }

  private getUnlockedAbstractElements(): Array<{ id: string; name: string; emoji: string; color: number }> {
    const completed = PlayerData.getCompletedGauntlets();
    return ALL_ABSTRACT_ELEMENTS.filter((el) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[el.id];
      return needed ? completed.includes(needed) : false;
    });
  }

  private createElementCircle(
    id: string, name: string, emoji: string, color: number,
    x: number, y: number, isAbstract = false,
  ): Phaser.GameObjects.Container {
    const circle = this.add.circle(0, 0, 38, color, 0.85).setStrokeStyle(isAbstract ? 3 : 2, isAbstract ? 0xcc88ff : 0xffffff);
    const label = this.add.text(0, -6, emoji, { fontSize: '24px' }).setOrigin(0.5);
    const nameLbl = this.add.text(0, 20, name, { fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    void id;
    const container = this.add.container(x, y, [circle, label, nameLbl]).setDepth(10);
    return container;
  }

  private makeCircleDraggable(
    container: Phaser.GameObjects.Container,
    elementId: string,
    originX: number,
    originY: number,
  ): void {
    container.setSize(80, 80);
    container.setInteractive({ useHandCursor: true });
    this.input.setDraggable(container);

    let dragging = false;

    container.on('dragstart', () => { dragging = true; container.setDepth(20); });

    container.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.setPosition(dragX, dragY);
    });

    container.on('dragend', () => {
      dragging = false;
      container.setDepth(10);
      const cx = container.x;
      const cy = container.y;

      const inSlot1 = Math.abs(cx - this.slot1X) <= SLOT_W / 2 && Math.abs(cy - this.slot1Y) <= SLOT_H / 2;
      const inSlot2 = Math.abs(cx - this.slot2X) <= SLOT_W / 2 && Math.abs(cy - this.slot2Y) <= SLOT_H / 2;

      if (inSlot1) {
        this.setSlot(1, elementId);
      } else if (inSlot2) {
        this.setSlot(2, elementId);
      }
      container.setPosition(originX, originY);
    });

    void dragging;
  }

  private setSlot(slot: 1 | 2, elementId: string): void {
    const all = this.getAvailableElements();
    const el = all.find((e) => e.id === elementId)!;
    if (slot === 1) {
      this.slot1Id = elementId;
      if (this.slot1Visual) this.slot1Visual.destroy();
      this.slot1Visual = this.buildSlotVisual(el, this.slot1X, this.slot1Y);
    } else {
      this.slot2Id = elementId;
      if (this.slot2Visual) this.slot2Visual.destroy();
      this.slot2Visual = this.buildSlotVisual(el, this.slot2X, this.slot2Y);
    }
    this.updateMergeButtonLabel();
  }

  private buildSlotVisual(el: { emoji: string; name: string; color: number }, x: number, y: number): Phaser.GameObjects.Container {
    const isAbs = ABSTRACT_ELEMENT_IDS.includes((el as { id?: string }).id ?? '');
    const circle = this.add.circle(0, 0, 34, el.color, 0.9).setStrokeStyle(isAbs ? 3 : 2, isAbs ? 0xcc88ff : 0xffffff);
    const emoji = this.add.text(0, -5, el.emoji, { fontSize: '22px' }).setOrigin(0.5);
    const name = this.add.text(0, 18, el.name, { fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    circle.setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [circle, emoji, name]).setDepth(4);
    circle.on('pointerdown', () => {
      const whichSlot = (x === this.slot1X) ? 1 : 2;
      if (whichSlot === 1) { this.slot1Id = null; if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; } }
      else { this.slot2Id = null; if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; } }
      this.updateMergeButtonLabel();
    });
    return container;
  }

  private updateMergeButtonLabel(): void {
    if (!this.mergeBtnLabel) return;
    const cost = this.getMergeCost();
    if (cost === null) {
      this.mergeBtnLabel.setText('⚛️  MERGE  (1 Nucleus)');
    } else {
      this.mergeBtnLabel.setText(`⚛️  MERGE  (${cost} Nucleus${cost > 1 ? 'i' : ''})`);
    }
  }

  private getMergeCost(): number | null {
    if (!this.slot1Id || !this.slot2Id) return null;
    const a1 = ABSTRACT_ELEMENT_IDS.includes(this.slot1Id);
    const a2 = ABSTRACT_ELEMENT_IDS.includes(this.slot2Id);
    if (a1 && a2) return 3;
    return 1;
  }

  private attemptMerge(): void {
    this.messageText.setText('');

    if (!this.slot1Id || !this.slot2Id) {
      this.showMessage('Place elements in both slots first.', '#ff8888');
      return;
    }

    const a1 = ABSTRACT_ELEMENT_IDS.includes(this.slot1Id);
    const a2 = ABSTRACT_ELEMENT_IDS.includes(this.slot2Id);

    // Mixed base + abstract: fails and wastes 1 nucleus
    if (a1 !== a2) {
      if (!PlayerData.spendNucleus()) {
        this.showMessage('Need an Elemental Nucleus (buy from Shop).', '#ff8888');
        return;
      }
      this.refreshNuclei();
      this.showMessage('⚡ Incompatible elements — 1 Nucleus wasted!', '#ff6644');
      return;
    }

    // Abstract + Abstract: requires Lab Level 1, costs 3 nuclei
    if (a1 && a2) {
      if (PlayerData.getLabLevel() < 1) {
        this.showMessage('Requires Lab Level 1 (upgrade in Shop).', '#ff8888');
        return;
      }
      const recipe = findRecipe(this.slot1Id, this.slot2Id);
      if (!recipe) {
        this.showMessage('No combination found for these elements.', '#ff8888');
        return;
      }
      if (PlayerData.isElementUnlocked(recipe.result)) {
        this.showMessage(`${recipe.resultEmoji} ${recipe.resultName} already discovered!`, '#ffcc44');
        return;
      }
      // Spend 3 nuclei
      if (PlayerData.getNuclei() < 3) {
        this.showMessage('Need 3 Elemental Nuclei for abstract fusion.', '#ff8888');
        return;
      }
      PlayerData.spendNucleus();
      PlayerData.spendNucleus();
      PlayerData.spendNucleus();
      PlayerData.unlockElement(recipe.result);
      this.refreshNuclei();
      this.showDiscoveryPopup(recipe.resultEmoji, recipe.resultName);
      return;
    }

    // Base + Base: 1 nucleus (normal)
    const recipe = findRecipe(this.slot1Id, this.slot2Id);
    if (!recipe) {
      this.showMessage('No combination found for these elements.', '#ff8888');
      return;
    }

    if (PlayerData.isElementUnlocked(recipe.result)) {
      this.showMessage(`${recipe.resultEmoji} ${recipe.resultName} already discovered!`, '#ffcc44');
      return;
    }

    if (!PlayerData.spendNucleus()) {
      this.showMessage('Need an Elemental Nucleus (buy from Shop).', '#ff8888');
      return;
    }

    PlayerData.unlockElement(recipe.result);
    this.refreshNuclei();
    this.showDiscoveryPopup(recipe.resultEmoji, recipe.resultName);
  }

  private showMessage(text: string, color: string): void {
    this.messageText.setText(text).setColor(color);
    this.time.delayedCall(3000, () => { if (this.messageText.active) this.messageText.setText(''); });
  }

  private showDiscoveryPopup(emoji: string, name: string): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75).setDepth(50).setInteractive();
    const card = this.add.rectangle(cx, cy, 360, 220, 0x110022, 1).setStrokeStyle(3, 0xcc88ff).setDepth(51);
    const sparkle = this.add.text(cx, cy - 70, '✨', { fontSize: '36px' }).setOrigin(0.5).setDepth(52);
    const title = this.add.text(cx, cy - 30, 'NEW ELEMENT DISCOVERED!', {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(52);
    const emojiText = this.add.text(cx, cy + 14, `${emoji}  ${name.toUpperCase()}`, {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(52);
    const hint = this.add.text(cx, cy + 56, 'Now available in Element Select!', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(52);

    const continueBtn = this.add.rectangle(cx, cy + 90, 140, 36, 0x440088, 1)
      .setStrokeStyle(2, 0xcc88ff).setDepth(52).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(cx, cy + 90, 'CONTINUE', {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(53);

    continueBtn.on('pointerdown', () => {
      [overlay, card, sparkle, title, emojiText, hint, continueBtn, continueLbl].forEach((o) => o.destroy());
      this.slot1Id = null;
      this.slot2Id = null;
      if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; }
      if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; }
    });

    this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 600 });
  }

  private refreshNuclei(): void {
    this.nucleiText.setText(`⚛️ ×${PlayerData.getNuclei()}`);
  }
}
