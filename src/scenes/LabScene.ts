import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findRecipe } from '../data/Recipes';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';
import { findPerkRecipe, findQuadPerkRecipe, findPentaPerkRecipe, findAbstractTriplePerkRecipe, PerkDef, ALL_PERKS } from '../data/Perks';

const BASE_ELEMENTS = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
];

const ALL_ABSTRACT_ELEMENTS = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

const SLOT_W = 100;
const SLOT_H = 100;

export class LabScene extends Phaser.Scene {
  private labMode: 'elements' | 'perks' | 'quad-perks' | 'penta-perks' = 'elements';

  private slot1Id: string | null = null;
  private slot2Id: string | null = null;
  private slot3Id: string | null = null;
  private slot4Id: string | null = null;
  private slot5Id: string | null = null;
  private slot1Visual: Phaser.GameObjects.Container | null = null;
  private slot2Visual: Phaser.GameObjects.Container | null = null;
  private slot3Visual: Phaser.GameObjects.Container | null = null;
  private slot4Visual: Phaser.GameObjects.Container | null = null;
  private slot5Visual: Phaser.GameObjects.Container | null = null;
  private nucleiText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private mergeBtnLabel!: Phaser.GameObjects.Text;
  private perkBookObjects: Phaser.GameObjects.GameObject[] = [];
  private perkBookScrollHandler: (...args: unknown[]) => void = () => {};

  // Slot positions (set in create)
  private slot1X = 0;
  private slot1Y = 0;
  private slot2X = 0;
  private slot2Y = 0;
  private slot3X = 0;
  private slot3Y = 0;
  private slot4X = 0;
  private slot4Y = 0;
  private slot5X = 0;
  private slot5Y = 0;

  constructor() {
    super({ key: 'LabScene' });
  }

  init(data: { labMode?: 'elements' | 'perks' | 'quad-perks' | 'penta-perks' }): void {
    this.labMode = data?.labMode ?? 'elements';
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

    // Perk book button
    const bookCircle = this.add.circle(width - 52, 60, 18, 0x221133).setStrokeStyle(2, 0x9944ff).setInteractive({ useHandCursor: true });
    this.add.text(width - 52, 60, '📖', { fontSize: '16px' }).setOrigin(0.5);
    bookCircle.on('pointerover', () => bookCircle.setFillStyle(0x440077));
    bookCircle.on('pointerout',  () => bookCircle.setFillStyle(0x221133));
    bookCircle.on('pointerdown', () => this.showPerkBook());

    // ── Mode toggle (ELEMENTS | PERKS | QUAD | PENTA) ──────────
    const canPerks = labLevel >= 2;
    const canQuad  = labLevel >= 3;
    const canPenta = labLevel >= 4;
    const tabY = 88;
    const tabW = 82;
    const tabH = 28;
    const tabGap = 4;

    const tabCx = [
      cx - tabW * 1.5 - tabGap * 1.5,
      cx - tabW * 0.5 - tabGap * 0.5,
      cx + tabW * 0.5 + tabGap * 0.5,
      cx + tabW * 1.5 + tabGap * 1.5,
    ];
    const tabLabels = [
      'ELEMENTS',
      canPerks ? 'PERKS' : 'PERKS 🔒',
      canQuad ? 'QUAD' : 'QUAD 🔒',
      canPenta ? 'PENTA' : 'PENTA 🔒',
    ];
    const tabModes: Array<'elements' | 'perks' | 'quad-perks' | 'penta-perks'> = [
      'elements', 'perks', 'quad-perks', 'penta-perks',
    ];

    tabCx.forEach((tx, idx) => {
      const active = this.labMode === tabModes[idx];
      const unlocked = idx === 0 || (idx === 1 && canPerks) || (idx === 2 && canQuad) || (idx === 3 && canPenta);
      const bg = this.add.rectangle(tx, tabY, tabW, tabH, active ? 0x330066 : 0x111122)
        .setStrokeStyle(1, unlocked ? 0x9944ff : 0x333344)
        .setInteractive({ useHandCursor: true });
      this.add.text(tx, tabY, tabLabels[idx], {
        fontSize: '9px', fontFamily: '"Arial Black", sans-serif',
        color: active ? '#cc88ff' : (unlocked ? '#666688' : '#333355'),
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        if (idx === 1 && !canPerks)  { this.showMessage('Requires Lab Level 2 (upgrade in Shop).', '#ff8888'); return; }
        if (idx === 2 && !canQuad)   { this.showMessage('Requires Lab Level 3 (upgrade in Shop).', '#ff8888'); return; }
        if (idx === 3 && !canPenta)  { this.showMessage('Requires Penta Synthesis (upgrade in Shop).', '#ff8888'); return; }
        if (this.labMode !== tabModes[idx]) this.scene.restart({ labMode: tabModes[idx] });
      });
    });

    // Instructions
    const instructionText =
      this.labMode === 'perks'      ? 'Drag 3 elements (base or abstract) into the slots, then FORGE PERK (2–4 ⚛️)' :
      this.labMode === 'quad-perks' ? 'Drag 4 elements (base or abstract) into the slots, then FORGE QUAD PERK (5 ⚛️)' :
      this.labMode === 'penta-perks'? 'Drag 5 elements (base or abstract) into the slots, then FORGE PENTA PERK (10 ⚛️)' :
                                         'Drag elements into the merge slots, then press MERGE';
    this.add.text(cx, tabY + 20, instructionText, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666688',
    }).setOrigin(0.5);

    // ── Base element circles (draggable) ──────────────────────────
    const circleY = 200;

    // Section label
    this.add.text(cx, 125, 'BASE ELEMENTS', {
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

    let slotY: number;

    if (this.labMode === 'elements') {
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
        slotY = 460;
      } else {
        slotY = 380;
      }

      // Two merge slots
      this.slot1X = cx - 90;
      this.slot1Y = slotY;
      this.slot2X = cx + 90;
      this.slot2Y = slotY;

      this.add.rectangle(this.slot1X, this.slot1Y, SLOT_W, SLOT_H, 0x220044, 1).setStrokeStyle(2, 0x9944ff);
      this.add.text(this.slot1X, this.slot1Y, 'Slot 1', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#664499',
      }).setOrigin(0.5).setDepth(1);

      this.add.rectangle(this.slot2X, this.slot2Y, SLOT_W, SLOT_H, 0x220044, 1).setStrokeStyle(2, 0x9944ff);
      this.add.text(this.slot2X, this.slot2Y, 'Slot 2', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#664499',
      }).setOrigin(0.5).setDepth(1);

      this.add.text(cx, slotY, '+', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#9944ff',
      }).setOrigin(0.5);

    } else if (this.labMode === 'perks') {
      // Perk mode: show abstract elements below base elements, then three slots
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;

        this.add.text(cx, circleY + 65, 'ABSTRACT ELEMENTS', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#9966cc',
        }).setOrigin(0.5);

        unlockedAbstract.forEach((el, i) => {
          const ox = absStartX + i * 120;
          const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, absY, true);
          this.makeCircleDraggable(container, el.id, ox, absY);
        });
        slotY = 450;
      } else {
        slotY = 360;
      }

      this.slot1X = cx - 160;
      this.slot1Y = slotY;
      this.slot2X = cx;
      this.slot2Y = slotY;
      this.slot3X = cx + 160;
      this.slot3Y = slotY;

      for (let i = 0; i < 3; i++) {
        const sx = [this.slot1X, this.slot2X, this.slot3X][i];
        this.add.rectangle(sx, slotY, SLOT_W, SLOT_H, 0x001122, 1).setStrokeStyle(2, 0x44aaff);
        this.add.text(sx, slotY, `Slot ${i + 1}`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#336688',
        }).setOrigin(0.5).setDepth(1);
      }
      this.add.text(cx - 80, slotY, '+', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#44aaff',
      }).setOrigin(0.5);
      this.add.text(cx + 80, slotY, '+', {
        fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#44aaff',
      }).setOrigin(0.5);

    } else if (this.labMode === 'quad-perks') {
      // Quad-perk mode: show abstract elements then four slots
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;
        this.add.text(cx, circleY + 65, 'ABSTRACT ELEMENTS', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#9966cc',
        }).setOrigin(0.5);
        unlockedAbstract.forEach((el, i) => {
          const ox = absStartX + i * 120;
          const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, absY, true);
          this.makeCircleDraggable(container, el.id, ox, absY);
        });
        slotY = 450;
      } else {
        slotY = 360;
      }

      this.slot1X = cx - 180;
      this.slot1Y = slotY;
      this.slot2X = cx - 60;
      this.slot2Y = slotY;
      this.slot3X = cx + 60;
      this.slot3Y = slotY;
      this.slot4X = cx + 180;
      this.slot4Y = slotY;

      for (let i = 0; i < 4; i++) {
        const sx = [this.slot1X, this.slot2X, this.slot3X, this.slot4X][i];
        this.add.rectangle(sx, slotY, SLOT_W, SLOT_H, 0x110022, 1).setStrokeStyle(2, 0xffaa44);
        this.add.text(sx, slotY, `Slot ${i + 1}`, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#887733',
        }).setOrigin(0.5).setDepth(1);
      }
      for (let i = 0; i < 3; i++) {
        const sx = [this.slot1X, this.slot2X, this.slot3X][i];
        this.add.text(sx + 60, slotY, '+', {
          fontSize: '22px', fontFamily: '"Arial Black", sans-serif', color: '#ffaa44',
        }).setOrigin(0.5);
      }

      this.add.text(cx, slotY + 68, 'Any 4 elements — base or abstract', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#887733',
      }).setOrigin(0.5);

    } else {
      // Penta-perk mode: show abstract elements then five slots (tighter spacing)
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;
        this.add.text(cx, circleY + 65, 'ABSTRACT ELEMENTS', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#9966cc',
        }).setOrigin(0.5);
        unlockedAbstract.forEach((el, i) => {
          const ox = absStartX + i * 120;
          const container = this.createElementCircle(el.id, el.name, el.emoji, el.color, ox, absY, true);
          this.makeCircleDraggable(container, el.id, ox, absY);
        });
        slotY = 450;
      } else {
        slotY = 360;
      }

      const pentaSpacing = 110;
      this.slot1X = cx - pentaSpacing * 2;
      this.slot2X = cx - pentaSpacing;
      this.slot3X = cx;
      this.slot4X = cx + pentaSpacing;
      this.slot5X = cx + pentaSpacing * 2;
      this.slot1Y = this.slot2Y = this.slot3Y = this.slot4Y = this.slot5Y = slotY;

      const pentaSlotXs = [this.slot1X, this.slot2X, this.slot3X, this.slot4X, this.slot5X];
      for (let i = 0; i < 5; i++) {
        this.add.rectangle(pentaSlotXs[i], slotY, 88, SLOT_H, 0x110011, 1).setStrokeStyle(2, 0xaa44ff);
        this.add.text(pentaSlotXs[i], slotY, `Slot ${i + 1}`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#774499',
        }).setOrigin(0.5).setDepth(1);
      }
      for (let i = 0; i < 4; i++) {
        this.add.text(pentaSlotXs[i] + pentaSpacing / 2, slotY, '+', {
          fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#aa44ff',
        }).setOrigin(0.5);
      }

      this.add.text(cx, slotY + 68, 'Any 5 elements — base or abstract', {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#774499',
      }).setOrigin(0.5);
    }

    // ── MERGE / FORGE button ──────────────────────────────────────
    const mergeY = slotY + (this.labMode === 'elements' ? 80 : 100);
    const btnLabel =
      this.labMode === 'penta-perks' ? '⚡ FORGE PENTA PERK  (10 ⚛️)' :
      this.labMode === 'quad-perks'  ? '⚡ FORGE QUAD PERK  (5 ⚛️)' :
      this.labMode === 'perks'       ? '⚡ FORGE PERK  (2–4 ⚛️)' :
                                      '⚛️  MERGE  (1 Nucleus)';
    const btnColor =
      this.labMode === 'penta-perks' ? 0x220033 :
      this.labMode === 'quad-perks'  ? 0x332200 :
      this.labMode === 'perks'       ? 0x003366 : 0x330066;
    const btnStroke =
      this.labMode === 'penta-perks' ? 0xaa44ff :
      this.labMode === 'quad-perks'  ? 0xffaa44 :
      this.labMode === 'perks'       ? 0x44aaff : 0x9944ff;
    const btnTextColor =
      this.labMode === 'penta-perks' ? '#cc88ff' :
      this.labMode === 'quad-perks'  ? '#ffaa44' :
      this.labMode === 'perks'       ? '#44ccff' : '#cc88ff';

    const mergeBtn = this.add.rectangle(cx, mergeY, 280, 48, btnColor, 1)
      .setStrokeStyle(2, btnStroke)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
    this.mergeBtnLabel = this.add.text(cx, mergeY, btnLabel, {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif',
      color: btnTextColor,
    }).setOrigin(0.5).setDepth(6);

    mergeBtn.on('pointerover', () => mergeBtn.setFillStyle(btnColor + 0x111111));
    mergeBtn.on('pointerout',  () => mergeBtn.setFillStyle(btnColor));
    mergeBtn.on('pointerdown', () => {
      if (this.labMode === 'penta-perks') this.attemptPentaPerkForge();
      else if (this.labMode === 'quad-perks') this.attemptQuadPerkForge();
      else if (this.labMode === 'perks') this.attemptPerkForge();
      else this.attemptMerge();
    });

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
      const inSlot3 = (this.labMode === 'perks' || this.labMode === 'quad-perks' || this.labMode === 'penta-perks') &&
        Math.abs(cx - this.slot3X) <= SLOT_W / 2 && Math.abs(cy - this.slot3Y) <= SLOT_H / 2;
      const inSlot4 = (this.labMode === 'quad-perks' || this.labMode === 'penta-perks') &&
        Math.abs(cx - this.slot4X) <= SLOT_W / 2 && Math.abs(cy - this.slot4Y) <= SLOT_H / 2;
      const inSlot5 = this.labMode === 'penta-perks' &&
        Math.abs(cx - this.slot5X) <= SLOT_W / 2 && Math.abs(cy - this.slot5Y) <= SLOT_H / 2;

      if (inSlot1) {
        this.setSlot(1, elementId);
      } else if (inSlot2) {
        this.setSlot(2, elementId);
      } else if (inSlot3) {
        this.setSlot(3, elementId);
      } else if (inSlot4) {
        this.setSlot(4, elementId);
      } else if (inSlot5) {
        this.setSlot(5, elementId);
      }
      container.setPosition(originX, originY);
    });

    void dragging;
  }

  private setSlot(slot: 1 | 2 | 3 | 4 | 5, elementId: string): void {

    const all = this.getAvailableElements();
    const el = all.find((e) => e.id === elementId)!;

    if (slot === 1) {
      this.slot1Id = elementId;
      if (this.slot1Visual) this.slot1Visual.destroy();
      this.slot1Visual = this.buildSlotVisual(el, this.slot1X, this.slot1Y, slot);
    } else if (slot === 2) {
      this.slot2Id = elementId;
      if (this.slot2Visual) this.slot2Visual.destroy();
      this.slot2Visual = this.buildSlotVisual(el, this.slot2X, this.slot2Y, slot);
    } else if (slot === 3) {
      this.slot3Id = elementId;
      if (this.slot3Visual) this.slot3Visual.destroy();
      this.slot3Visual = this.buildSlotVisual(el, this.slot3X, this.slot3Y, slot);
    } else if (slot === 4) {
      this.slot4Id = elementId;
      if (this.slot4Visual) this.slot4Visual.destroy();
      this.slot4Visual = this.buildSlotVisual(el, this.slot4X, this.slot4Y, slot);
    } else {
      this.slot5Id = elementId;
      if (this.slot5Visual) this.slot5Visual.destroy();
      this.slot5Visual = this.buildSlotVisual(el, this.slot5X, this.slot5Y, slot);
    }
    this.updateMergeButtonLabel();
  }

  private buildSlotVisual(
    el: { emoji: string; name: string; color: number },
    x: number, y: number,
    slot: 1 | 2 | 3 | 4 | 5,
  ): Phaser.GameObjects.Container {
    const isAbs = ABSTRACT_ELEMENT_IDS.includes((el as { id?: string }).id ?? '');
    const circle = this.add.circle(0, 0, 34, el.color, 0.9).setStrokeStyle(isAbs ? 3 : 2, isAbs ? 0xcc88ff : 0xffffff);
    const emoji = this.add.text(0, -5, el.emoji, { fontSize: '22px' }).setOrigin(0.5);
    const name = this.add.text(0, 18, el.name, { fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#ffffff' }).setOrigin(0.5);
    circle.setInteractive({ useHandCursor: true });
    const container = this.add.container(x, y, [circle, emoji, name]).setDepth(4);
    circle.on('pointerdown', () => {
      if (slot === 1) { this.slot1Id = null; if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; } }
      else if (slot === 2) { this.slot2Id = null; if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; } }
      else if (slot === 3) { this.slot3Id = null; if (this.slot3Visual) { this.slot3Visual.destroy(); this.slot3Visual = null; } }
      else if (slot === 4) { this.slot4Id = null; if (this.slot4Visual) { this.slot4Visual.destroy(); this.slot4Visual = null; } }
      else { this.slot5Id = null; if (this.slot5Visual) { this.slot5Visual.destroy(); this.slot5Visual = null; } }
      this.updateMergeButtonLabel();
    });
    return container;
  }

  private updateMergeButtonLabel(): void {
    if (!this.mergeBtnLabel) return;
    if (this.labMode === 'penta-perks') {
      this.mergeBtnLabel.setText('⚡ FORGE PENTA PERK  (10 ⚛️)');
      return;
    }
    if (this.labMode === 'quad-perks') {
      this.mergeBtnLabel.setText('⚡ FORGE QUAD PERK  (5 ⚛️)');
      return;
    }
    if (this.labMode === 'perks') {
      this.mergeBtnLabel.setText('⚡ FORGE PERK  (2–4 ⚛️)');
      return;
    }
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
      if (!PlayerData.spendNuclei(3)) {
        this.showMessage('Need 3 Elemental Nuclei for abstract fusion.', '#ff8888');
        return;
      }
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

  private attemptPerkForge(): void {
    this.messageText.setText('');

    if (!this.slot1Id || !this.slot2Id || !this.slot3Id) {
      this.showMessage('Place 3 elements in all slots first.', '#ff8888');
      return;
    }

    // Try base triple perk first (2 nuclei), then abstract triple perk (4 nuclei)
    const baseRecipe = findPerkRecipe(this.slot1Id, this.slot2Id, this.slot3Id);
    const absRecipe  = findAbstractTriplePerkRecipe(this.slot1Id, this.slot2Id, this.slot3Id);
    const recipe = baseRecipe ?? absRecipe;
    if (!recipe) {
      this.showMessage('No perk matches these elements.', '#ff8888');
      return;
    }

    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) {
      this.showMessage(`${recipe.emoji} ${recipe.name} already forged!`, '#ffcc44');
      return;
    }

    const cost = baseRecipe ? 2 : 4;
    if (!PlayerData.spendNuclei(cost)) {
      this.showMessage(`Need ${cost} Elemental Nuclei to forge this perk.`, '#ff8888');
      return;
    }

    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.refreshNuclei();
    this.showPerkDiscoveryPopup(recipe);
  }

  private attemptQuadPerkForge(): void {
    this.messageText.setText('');

    if (!this.slot1Id || !this.slot2Id || !this.slot3Id || !this.slot4Id) {
      this.showMessage('Place base elements in all 4 slots first.', '#ff8888');
      return;
    }

    const recipe = findQuadPerkRecipe(this.slot1Id, this.slot2Id, this.slot3Id, this.slot4Id);
    if (!recipe) {
      this.showMessage('No quad perk matches these elements.', '#ff8888');
      return;
    }

    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) {
      this.showMessage(`${recipe.emoji} ${recipe.name} already forged!`, '#ffcc44');
      return;
    }

    if (!PlayerData.spendNuclei(5)) {
      this.showMessage('Need 5 Elemental Nuclei to forge a quad perk.', '#ff8888');
      return;
    }

    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.refreshNuclei();
    this.showPerkDiscoveryPopup(recipe);
  }

  private attemptPentaPerkForge(): void {
    this.messageText.setText('');

    if (!this.slot1Id || !this.slot2Id || !this.slot3Id || !this.slot4Id || !this.slot5Id) {
      this.showMessage('Place base elements in all 5 slots first.', '#ff8888');
      return;
    }

    const recipe = findPentaPerkRecipe(this.slot1Id, this.slot2Id, this.slot3Id, this.slot4Id, this.slot5Id);
    if (!recipe) {
      this.showMessage('No penta perk matches these elements.', '#ff8888');
      return;
    }

    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) {
      this.showMessage(`${recipe.emoji} ${recipe.name} already forged!`, '#ffcc44');
      return;
    }

    if (!PlayerData.spendNuclei(10)) {
      this.showMessage('Need 10 Elemental Nuclei to forge a penta perk.', '#ff8888');
      return;
    }

    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.refreshNuclei();
    this.showPerkDiscoveryPopup(recipe);
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

  private showPerkDiscoveryPopup(perk: PerkDef): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const isPenta = perk.tier === 'penta';
    const isQuad = perk.tier === 'quad';
    const isAbstract = perk.tier === 'abstract-triple';
    const cardColor = isPenta ? 0x220033 : (isQuad ? 0x221100 : (isAbstract ? 0x1a0033 : 0x001133));
    const strokeColor = isPenta ? 0xcc44ff : (isQuad ? 0xffaa44 : (isAbstract ? 0xcc44ff : 0x44aaff));
    const titleColor = isPenta ? '#cc88ff' : (isQuad ? '#ffaa44' : (isAbstract ? '#cc66ff' : '#44ccff'));

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75).setDepth(50).setInteractive();
    const card = this.add.rectangle(cx, cy, 380, 240, cardColor, 1).setStrokeStyle(3, strokeColor).setDepth(51);
    const sparkle = this.add.text(cx, cy - 80, isPenta ? '🍄' : (isQuad ? '✦' : (isAbstract ? '✨' : '⚡')), { fontSize: '36px' }).setOrigin(0.5).setDepth(52);
    const title = this.add.text(cx, cy - 38, isPenta ? 'PENTA PERK FORGED!' : (isQuad ? 'QUAD PERK FORGED!' : (isAbstract ? 'ABSTRACT PERK FORGED!' : 'NEW PERK FORGED!')), {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: titleColor,
    }).setOrigin(0.5).setDepth(52);
    const emojiText = this.add.text(cx, cy + 8, `${perk.emoji}  ${perk.name.toUpperCase()}`, {
      fontSize: '26px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
    }).setOrigin(0.5).setDepth(52);
    const desc = this.add.text(cx, cy + 48, perk.description, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#aaccff',
      align: 'center', wordWrap: { width: 320 },
    }).setOrigin(0.5).setDepth(52);
    const hint = this.add.text(cx, cy + 78, `Equip on ${perk.elementId.toUpperCase()} in Element Select`, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#556688',
    }).setOrigin(0.5).setDepth(52);

    const continueBtn = this.add.rectangle(cx, cy + 104, 140, 36, isPenta ? 0x220033 : (isQuad ? 0x332200 : (isAbstract ? 0x1a0033 : 0x003366)), 1)
      .setStrokeStyle(2, strokeColor).setDepth(52).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(cx, cy + 104, 'CONTINUE', {
      fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: titleColor,
    }).setOrigin(0.5).setDepth(53);

    continueBtn.on('pointerdown', () => {
      [overlay, card, sparkle, title, emojiText, desc, hint, continueBtn, continueLbl].forEach((o) => o.destroy());
      this.slot1Id = null; this.slot2Id = null; this.slot3Id = null; this.slot4Id = null; this.slot5Id = null;
      if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; }
      if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; }
      if (this.slot3Visual) { this.slot3Visual.destroy(); this.slot3Visual = null; }
      if (this.slot4Visual) { this.slot4Visual.destroy(); this.slot4Visual = null; }
      if (this.slot5Visual) { this.slot5Visual.destroy(); this.slot5Visual = null; }
    });

    this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 600 });
  }

  private showPerkBook(): void {
    this.closePerkBook();
    const { width, height } = this.scale;
    const cx = width / 2;

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    const SCROLL_TOP = 104;
    const SCROLL_BOT = height - 52;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    // ── Fixed background + header ──
    const bg = this.add.rectangle(cx, height / 2, width, height, 0x05050f, 0.97)
      .setDepth(50).setInteractive();
    this.perkBookObjects.push(bg);

    const header = this.add.text(cx, 36, '📖  PERK DICTIONARY', {
      fontSize: '28px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      stroke: '#440088', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55);
    this.perkBookObjects.push(header);

    const subHdr = this.add.text(cx, 70, '— craft perks in the Lab to equip them on your element —', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(55);
    this.perkBookObjects.push(subHdr);

    const divider = this.add.graphics().setDepth(55);
    divider.lineStyle(1, 0x223355, 0.5);
    divider.lineBetween(40, 90, width - 40, 90);
    this.perkBookObjects.push(divider);

    // ── Scrollable container ──
    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.perkBookObjects.push(scrollContainer);

    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.perkBookObjects.push(maskGfx);

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

        // Create description first to measure its wrapped height
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

        // Add in back-to-front order (rowBg first so texts render over it)
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

    this.perkBookScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.input.on('wheel', this.perkBookScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(width - 12, SCROLL_BOT - 4, '▼ scroll', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(55);
      this.perkBookObjects.push(hint);
    }

    // ── Fixed back button ──
    const backBtn = this.add.rectangle(60, 30, 90, 32, 0x221133, 0.9)
      .setStrokeStyle(2, 0x9944ff, 0.8).setDepth(55).setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(60, 30, '◀  BACK', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(56);
    backBtn
      .on('pointerover', () => backBtn.setFillStyle(0x440077, 0.95))
      .on('pointerout',  () => backBtn.setFillStyle(0x221133, 0.9))
      .on('pointerdown', () => this.closePerkBook());
    this.perkBookObjects.push(backBtn, backLbl);
  }

  private closePerkBook(): void {
    this.input.off('wheel', this.perkBookScrollHandler);
    this.perkBookObjects.forEach((o) => o.destroy());
    this.perkBookObjects = [];
  }

  private refreshNuclei(): void {
    this.nucleiText.setText(`⚛️ ×${PlayerData.getNuclei()}`);
  }
}
