import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findRecipe } from '../data/Recipes';

const BASE_ELEMENTS = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
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

    // Back button
    const backBtn = this.add.rectangle(52, 36, 88, 36, 0x222233).setStrokeStyle(1, 0x555577).setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', { fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa' }).setOrigin(0.5);
    backBtn.on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); });
    backBtn.on('pointerout',  () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));

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

    // ── Element circles (draggable) ──────────────────────────
    const circleY = 210;
    const totalW = BASE_ELEMENTS.length * 100 + (BASE_ELEMENTS.length - 1) * 20;
    const startX = cx - totalW / 2 + 50;

    BASE_ELEMENTS.forEach((el, i) => {
      const ox = startX + i * 120;
      const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, circleY);
      this.makeCircleDraggable(container, el.id, ox, circleY);
    });

    // ── Merge slots ──────────────────────────────────────────
    const slotY = 400;
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
    const mergeBtn = this.add.rectangle(cx, mergeY, 220, 48, 0x330066, 1)
      .setStrokeStyle(2, 0x9944ff)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    this.add.text(cx, mergeY, '⚛️  MERGE  (1 Nucleus)', {
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

  private createElementCircle(
    id: string, name: string, emoji: string, color: number,
    x: number, y: number,
  ): Phaser.GameObjects.Container {
    const circle = this.add.circle(0, 0, 38, color, 0.85).setStrokeStyle(2, 0xffffff);
    const label = this.add.text(0, -6, emoji, { fontSize: '24px' }).setOrigin(0.5);
    const nameLbl = this.add.text(0, 20, name, { fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    const container = this.add.container(x, y, [circle, label, nameLbl]).setDepth(10);
    return container;
  }

  private makeCircleDraggable(
    container: Phaser.GameObjects.Container,
    elementId: string,
    originX: number,
    originY: number,
  ): void {
    // Make container interactive using its bounding area
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
      // Always snap original circle back to its home
      container.setPosition(originX, originY);
    });

    // Allow clicking to cancel (not needed since originals always snap back)
    void dragging;
  }

  private setSlot(slot: 1 | 2, elementId: string): void {
    const el = BASE_ELEMENTS.find((e) => e.id === elementId)!;
    if (slot === 1) {
      this.slot1Id = elementId;
      if (this.slot1Visual) this.slot1Visual.destroy();
      this.slot1Visual = this.buildSlotVisual(el, this.slot1X, this.slot1Y);
    } else {
      this.slot2Id = elementId;
      if (this.slot2Visual) this.slot2Visual.destroy();
      this.slot2Visual = this.buildSlotVisual(el, this.slot2X, this.slot2Y);
    }
  }

  private buildSlotVisual(el: { emoji: string; name: string; color: number }, x: number, y: number): Phaser.GameObjects.Container {
    const circle = this.add.circle(0, 0, 34, el.color, 0.9).setStrokeStyle(2, 0xffffff);
    const emoji = this.add.text(0, -5, el.emoji, { fontSize: '22px' }).setOrigin(0.5);
    const name = this.add.text(0, 18, el.name, { fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    // Click the slot visual to remove it
    circle.setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [circle, emoji, name]).setDepth(4);
    circle.on('pointerdown', () => {
      const whichSlot = (x === this.slot1X) ? 1 : 2;
      if (whichSlot === 1) { this.slot1Id = null; if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; } }
      else { this.slot2Id = null; if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; } }
    });
    return container;
  }

  private attemptMerge(): void {
    this.messageText.setText('');

    if (!this.slot1Id || !this.slot2Id) {
      this.showMessage('Place elements in both slots first.', '#ff8888');
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
    const hint = this.add.text(cx, cy + 56, 'Now available in Element Select & Shop!', {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(52);

    const continueBtn = this.add.rectangle(cx, cy + 90, 140, 36, 0x440088, 1)
      .setStrokeStyle(2, 0xcc88ff).setDepth(52).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(cx, cy + 90, 'CONTINUE', {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(53);

    continueBtn.on('pointerdown', () => {
      [overlay, card, sparkle, title, emojiText, hint, continueBtn, continueLbl].forEach((o) => o.destroy());
      // Clear slots
      this.slot1Id = null;
      this.slot2Id = null;
      if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; }
      if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; }
    });

    // Bounce animation on card
    this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 600 });
  }

  private refreshNuclei(): void {
    this.nucleiText.setText(`⚛️ ×${PlayerData.getNuclei()}`);
  }
}
