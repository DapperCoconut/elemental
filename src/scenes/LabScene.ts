import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { findRecipe } from '../data/Recipes';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';
import { findPerkRecipe, findQuadPerkRecipe, findPentaPerkRecipe, findAbstractTriplePerkRecipe, PerkDef, ALL_PERKS } from '../data/Perks';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate,
  addBackdrop, addBackButton, addButton, addChip, addHeaderBar, addIconButton, addSectionLabel,
  addTabs, addRowPlate, addWell, UiButton,
  ALL_CORNERS, fillHex, strokeHex, fillDiamond, fillNotchedGradient, strokeNotched, drawGlow,
} from '../ui';

/** Per-mode accent — the whole screen re-lights when you change forge mode. */
const MODE_ACCENT: Record<'elements' | 'perks' | 'quad-perks' | 'penta-perks', number> = {
  'elements': 0x9d5cff,
  'perks': 0x4fc3ff,
  'quad-perks': 0xffaa44,
  'penta-perks': 0xd946ef,
};

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
  private mergeButton: UiButton | null = null;
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
    const accent = MODE_ACCENT[this.labMode];

    const labLevel = PlayerData.getLabLevel();
    addBackdrop(this, { accent, variant: 'lattice', motes: 20 });

    addHeaderBar(this, {
      title: '⚗  LAB',
      subtitle: labLevel === 0 ? 'BASE LAB' : `LAB LEVEL ${labLevel}`,
      accent,
      height: 66,
    });

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // Nucleus counter (top right)
    this.nucleiText = this.add.text(width - 60, 26, '', {
      fontSize: '17px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.arcane, 0xffffff, 0.5)), letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content);
    this.refreshNuclei();

    addIconButton(this, {
      x: width - 32, y: 26, r: 17, icon: '📖', accent: C.arcane, tooltip: 'Perk dictionary',
      onClick: () => this.showPerkBook(),
    });

    // ── Mode toggle (ELEMENTS | PERKS | QUAD | PENTA) ──────────
    const canPerks = labLevel >= 2;
    const canQuad  = labLevel >= 3;
    const canPenta = labLevel >= 4;
    const tabY = 88;

    const tabModes: Array<'elements' | 'perks' | 'quad-perks' | 'penta-perks'> = [
      'elements', 'perks', 'quad-perks', 'penta-perks',
    ];
    const tabUnlocked = [true, canPerks, canQuad, canPenta];

    addTabs(this, {
      x: cx, y: tabY, tabW: 96, tabH: 30,
      active: tabModes.indexOf(this.labMode),
      tabs: tabModes.map((mode, idx) => ({
        label: ['ELEMENTS', 'PERKS', 'QUAD', 'PENTA'][idx],
        accent: MODE_ACCENT[mode],
        disabled: !tabUnlocked[idx],
        hint: tabUnlocked[idx] ? undefined : `LV.${idx + 1}`,
      })),
      onSelect: (idx) => {
        if (this.labMode !== tabModes[idx]) this.scene.restart({ labMode: tabModes[idx] });
      },
    });

    // Instructions
    const instructionText =
      this.labMode === 'perks'      ? 'Drag 3 elements (base or abstract) into the slots, then FORGE PERK (2–4 ⚛️)' :
      this.labMode === 'quad-perks' ? 'Drag 4 elements (base or abstract) into the slots, then FORGE QUAD PERK (5 ⚛️)' :
      this.labMode === 'penta-perks'? 'Drag 5 elements (base or abstract) into the slots, then FORGE PENTA PERK (10 ⚛️)' :
                                         'Drag elements into the merge slots, then press MERGE';
    this.add.text(cx, tabY + 30, instructionText, {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 0.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── Base element circles (draggable) ──────────────────────────
    const circleY = 200;

    addSectionLabel(this, { x: cx, y: 138, text: 'BASE ELEMENTS', accent, width: 560 });

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

        addSectionLabel(this, { x: cx, y: circleY + 75, text: 'ABSTRACT ELEMENTS', accent: C.corrupt, width: 560 });

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

      this.drawSlot(this.slot1X, this.slot1Y, SLOT_W, SLOT_H, accent, 1);
      this.drawSlot(this.slot2X, this.slot2Y, SLOT_W, SLOT_H, accent, 2);
      this.drawJoiner(cx, slotY, accent);

    } else if (this.labMode === 'perks') {
      // Perk mode: show abstract elements below base elements, then three slots
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;

        addSectionLabel(this, { x: cx, y: circleY + 65, text: 'ABSTRACT ELEMENTS', accent: C.corrupt, width: 560 });

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
        this.drawSlot(sx, slotY, SLOT_W, SLOT_H, accent, i + 1);
      }
      this.drawJoiner(cx - 80, slotY, accent);
      this.drawJoiner(cx + 80, slotY, accent);

    } else if (this.labMode === 'quad-perks') {
      // Quad-perk mode: show abstract elements then four slots
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;
        addSectionLabel(this, { x: cx, y: circleY + 65, text: 'ABSTRACT ELEMENTS', accent: C.corrupt, width: 560 });
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
        this.drawSlot(sx, slotY, SLOT_W, SLOT_H, accent, i + 1);
      }
      for (let i = 0; i < 3; i++) {
        const sx = [this.slot1X, this.slot2X, this.slot3X][i];
        this.drawJoiner(sx + 60, slotY, accent, 9);
      }

      this.add.text(cx, slotY + 72, 'ANY 4 ELEMENTS — BASE OR ABSTRACT', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

    } else {
      // Penta-perk mode: show abstract elements then five slots (tighter spacing)
      const unlockedAbstract = this.getUnlockedAbstractElements();
      if (unlockedAbstract.length > 0) {
        const absY = circleY + 110;
        const absTotalW = unlockedAbstract.length * 100 + (unlockedAbstract.length - 1) * 20;
        const absStartX = cx - absTotalW / 2 + 50;
        addSectionLabel(this, { x: cx, y: circleY + 65, text: 'ABSTRACT ELEMENTS', accent: C.corrupt, width: 560 });
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
        this.drawSlot(pentaSlotXs[i], slotY, 88, SLOT_H, accent, i + 1);
      }
      for (let i = 0; i < 4; i++) {
        this.drawJoiner(pentaSlotXs[i] + pentaSpacing / 2, slotY, accent, 8);
      }

      this.add.text(cx, slotY + 72, 'ANY 5 ELEMENTS — BASE OR ABSTRACT', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    }

    // ── MERGE / FORGE button ──────────────────────────────────────
    const mergeY = slotY + (this.labMode === 'elements' ? 84 : 104);
    const btnLabel =
      this.labMode === 'penta-perks' ? 'FORGE PENTA PERK' :
      this.labMode === 'quad-perks'  ? 'FORGE QUAD PERK' :
      this.labMode === 'perks'       ? 'FORGE PERK' :
                                       'MERGE';
    const btnCost =
      this.labMode === 'penta-perks' ? '10 ⚛️' :
      this.labMode === 'quad-perks'  ? '5 ⚛️' :
      this.labMode === 'perks'       ? '2–4 ⚛️' :
                                       '1 ⚛️';

    this.mergeButton = addButton(this, {
      x: cx, y: mergeY, w: 320, h: 54,
      label: btnLabel, icon: '⚡', trailing: btnCost,
      trailingColor: hex(mix(accent, 0xffffff, 0.4)),
      accent, variant: 'solid', fontSize: 17, align: 'left',
      onClick: () => {
        if (this.labMode === 'penta-perks') this.attemptPentaPerkForge();
        else if (this.labMode === 'quad-perks') this.attemptQuadPerkForge();
        else if (this.labMode === 'perks') this.attemptPerkForge();
        else this.attemptMerge();
      },
    });
    // Message text (result / error feedback)
    this.messageText = this.add.text(cx, mergeY + 48, '', {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold,
      align: 'center', letterSpacing: 0.5, lineSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content + 5);
  }

  // ── Slot chrome ──────────────────────────────────────────────

  /** Empty ingredient socket: a recessed notched plate with a hex ghost. */
  private drawSlot(x: number, y: number, w: number, h: number, accent: number, index: number): void {
    const g = this.add.graphics().setDepth(DEPTH.panel);
    const left = x - w / 2;
    const top = y - h / 2;

    fillNotchedGradient(g, left, top, w, h,
      mix(C.well, accent, 0.06), mix(C.void_, accent, 0.03), 1, 12, ALL_CORNERS, 12);
    strokeNotched(g, left, top, w, h, accent, 0.7, 2, 12, ALL_CORNERS);
    strokeNotched(g, left + 5, top + 5, w - 10, h - 10, accent, 0.16, 1, 8, ALL_CORNERS);

    // Ghost hexagon marking where a gem will land.
    strokeHex(g, x, y - 6, 22, accent, 0.22, 1);

    this.add.text(x, y + h / 2 - 13, `SLOT ${index}`, {
      fontSize: '9px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0x000000, 0.35)), letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(DEPTH.panel + 1);
  }

  /** The "+" between two sockets, drawn as an accent cross with a diamond. */
  private drawJoiner(x: number, y: number, accent: number, size = 11): void {
    const g = this.add.graphics().setDepth(DEPTH.panel + 1);
    g.lineStyle(3, accent, 0.75);
    g.beginPath(); g.moveTo(x - size, y); g.lineTo(x + size, y); g.strokePath();
    g.beginPath(); g.moveTo(x, y - size); g.lineTo(x, y + size); g.strokePath();
    fillDiamond(g, x, y, 3.5, mix(accent, 0xffffff, 0.6), 1);
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

  /**
   * A draggable element token: a cut gem in the element's own colour, with an
   * abstract variant that gets a second corrupt-violet ring.
   */
  private createElementCircle(
    id: string, name: string, emoji: string, color: number,
    x: number, y: number, isAbstract = false,
  ): Phaser.GameObjects.Container {
    void id;
    const g = this.add.graphics();

    for (let k = 5; k >= 1; k--) {
      g.fillStyle(color, 0.05);
      g.fillCircle(0, 0, 26 + k * 4);
    }
    fillHex(g, 0, 0, 34, mix(color, 0x000000, 0.55), 0.95);
    fillHex(g, 0, 0, 30, mix(color, 0x000000, 0.25), 0.95);
    strokeHex(g, 0, 0, 34, mix(color, 0xffffff, 0.35), 0.95, 2);
    strokeHex(g, 0, 0, 27, mix(color, 0xffffff, 0.6), 0.3, 1);
    if (isAbstract) strokeHex(g, 0, 0, 39, C.corrupt, 0.7, 2);

    const label = this.add.text(0, -5, emoji, { fontSize: '23px' }).setOrigin(0.5);
    const nameLbl = this.add.text(0, 19, name.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5);

    // Resting tokens sit just above the socket plates so a layout shift can
    // never bury one behind a socket.
    return this.add.container(x, y, [g, label, nameLbl]).setDepth(DEPTH.panel + 2);
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

    // A dragged token floats above everything, seated gems included.
    container.on('dragstart', () => { dragging = true; container.setDepth(DEPTH.content); });

    container.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.setPosition(dragX, dragY);
    });

    container.on('dragend', () => {
      dragging = false;
      container.setDepth(DEPTH.panel + 2);
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
    const g = this.add.graphics();
    drawGlow(g, -30, -30, 60, 60, el.color, 0.5, 4, 3, 14);
    fillHex(g, 0, 0, 31, mix(el.color, 0x000000, 0.5), 0.97);
    fillHex(g, 0, 0, 27, mix(el.color, 0x000000, 0.2), 0.97);
    strokeHex(g, 0, 0, 31, mix(el.color, 0xffffff, 0.45), 1, 2);
    if (isAbs) strokeHex(g, 0, 0, 36, C.corrupt, 0.8, 2);

    const emoji = this.add.text(0, -4, el.emoji, { fontSize: '21px' }).setOrigin(0.5);
    const name = this.add.text(0, 17, el.name.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5);

    // Click the seated gem to eject it.
    const hit = this.add.circle(0, 0, 32, 0xffffff, 0).setInteractive({ useHandCursor: true });
    // Above the socket plate (DEPTH.panel) and its caption, but below a token
    // being dragged (depth 20) so one can still be dropped over a filled slot.
    const container = this.add.container(x, y, [g, emoji, name, hit]).setDepth(DEPTH.panel + 5);
    hit.on('pointerdown', () => {
      if (slot === 1) { this.slot1Id = null; if (this.slot1Visual) { this.slot1Visual.destroy(); this.slot1Visual = null; } }
      else if (slot === 2) { this.slot2Id = null; if (this.slot2Visual) { this.slot2Visual.destroy(); this.slot2Visual = null; } }
      else if (slot === 3) { this.slot3Id = null; if (this.slot3Visual) { this.slot3Visual.destroy(); this.slot3Visual = null; } }
      else if (slot === 4) { this.slot4Id = null; if (this.slot4Visual) { this.slot4Visual.destroy(); this.slot4Visual = null; } }
      else { this.slot5Id = null; if (this.slot5Visual) { this.slot5Visual.destroy(); this.slot5Visual = null; } }
      this.updateMergeButtonLabel();
    });
    return container;
  }

  /**
   * Element mode is the only one whose price moves with the ingredients, so the
   * forge button's trailing cost is re-stamped whenever a socket changes.
   */
  private updateMergeButtonLabel(): void {
    if (!this.mergeButton || this.labMode !== 'elements') return;
    const cost = this.getMergeCost();
    this.mergeButton.setTrailing(`${cost ?? 1} ⚛️`);
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
      fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(52);
    const emojiText = this.add.text(cx, cy + 14, `${emoji}  ${name.toUpperCase()}`, {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(52);
    const hint = this.add.text(cx, cy + 56, 'Now available in Element Select!', {
      fontSize: '12px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(52);

    const continueBtn = this.add.rectangle(cx, cy + 90, 140, 36, 0x440088, 1)
      .setStrokeStyle(2, 0xcc88ff).setDepth(52).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(cx, cy + 90, 'CONTINUE', {
      fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc88ff',
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
      fontSize: '18px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: titleColor,
    }).setOrigin(0.5).setDepth(52);
    const emojiText = this.add.text(cx, cy + 8, `${perk.emoji}  ${perk.name.toUpperCase()}`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
    }).setOrigin(0.5).setDepth(52);
    const desc = this.add.text(cx, cy + 48, perk.description, {
      fontSize: '12px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aaccff',
      align: 'center', wordWrap: { width: 320 },
    }).setOrigin(0.5).setDepth(52);
    const hint = this.add.text(cx, cy + 78, `Equip on ${perk.elementId.toUpperCase()} in Element Select`, {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#556688',
    }).setOrigin(0.5).setDepth(52);

    const continueBtn = this.add.rectangle(cx, cy + 104, 140, 36, isPenta ? 0x220033 : (isQuad ? 0x332200 : (isAbstract ? 0x1a0033 : 0x003366)), 1)
      .setStrokeStyle(2, strokeColor).setDepth(52).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(cx, cy + 104, 'CONTINUE', {
      fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: titleColor,
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
    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97)
      .setDepth(50).setInteractive();
    this.perkBookObjects.push(bg);

    const headerBar = addHeaderBar(this, {
      title: '📖  PERK DICTIONARY',
      subtitle: 'CRAFT PERKS IN THE LAB TO EQUIP THEM ON AN ELEMENT',
      accent: C.arcane,
      height: 74,
      depth: 54,
    });
    this.perkBookObjects.push(headerBar.g, headerBar.titleText);
    if (headerBar.subtitleText) this.perkBookObjects.push(headerBar.subtitleText);

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
      const tierColor = tier === 'penta' ? hex(mix(C.corrupt, 0xffffff, 0.4))
        : tier === 'quad' ? T.gold
        : tier === 'abstract-triple' ? hex(mix(C.arcane, 0xffffff, 0.4))
        : hex(mix(C.frost, 0xffffff, 0.3));

      const tierHdr = this.add.text(cx, innerY, tierLabel, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: tierColor, letterSpacing: 2,
      }).setOrigin(0.5);
      scrollContainer.add(tierHdr);
      innerY += 20;

      for (const perk of allTierPerks) {
        const unlocked = PlayerData.isPerkUnlocked(perk.elementId, perk.id);
        const equipped  = PlayerData.getEquippedPerk(perk.elementId) === perk.id;
        const alpha = unlocked ? 1.0 : 0.35;

        const tierAccent = tier === 'penta' ? C.corrupt
          : tier === 'quad' ? C.gold
          : tier === 'abstract-triple' ? C.arcane
          : C.frost;

        // Create description first to measure its wrapped height
        const descText = this.add.text(COL_X + 12, innerY + DESC_Y, perk.description, {
          fontSize: '9px', fontFamily: FONT_UI,
          color: unlocked ? T.dim : T.ghost,
          wordWrap: { width: COL_W - 24 },
        }).setAlpha(alpha);

        const rowH = DESC_Y + descText.height + ROW_PAD;

        const row = addRowPlate(this, {
          x: cx, y: innerY + rowH / 2, w: COL_W, h: rowH - 2,
          accent: tierAccent, muted: !unlocked,
        });

        const nameText = this.add.text(COL_X + 12, innerY + NAME_Y, `${perk.emoji} ${perk.name}`, {
          fontSize: '13px', fontFamily: FONT_DISPLAY,
          color: unlocked ? T.bright : T.faint, letterSpacing: 0.5,
        }).setAlpha(alpha);

        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join('  +  ');
        const recipeText = this.add.text(COL_X + COL_W - 10, innerY + NAME_Y, recipeStr, {
          fontSize: '11px', color: unlocked ? T.normal : T.ghost,
        }).setOrigin(1, 0).setAlpha(alpha);

        // Add in back-to-front order (plate first so texts render over it)
        scrollContainer.add([row.g, nameText, recipeText, descText]);

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
      const hint = this.add.text(width - 16, SCROLL_BOT - 4, 'scroll ▼', {
        fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
      }).setOrigin(1, 1).setDepth(56);
      this.perkBookObjects.push(hint);
    }

    // ── Fixed back button ──
    const backBtn = addButton(this, {
      x: 66, y: 37, w: 100, h: 34,
      label: 'BACK', icon: '◄', fontSize: 13, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closePerkBook(),
    });
    this.perkBookObjects.push(backBtn.container);
  }

  private closePerkBook(): void {
    this.input.off('wheel', this.perkBookScrollHandler);
    this.perkBookObjects.forEach((o) => o.destroy());
    this.perkBookObjects = [];
  }

  private refreshNuclei(): void {
    this.nucleiText.setText(`⚛️  ×${PlayerData.getNuclei()}`);
  }
}
