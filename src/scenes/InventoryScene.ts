import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import { ITEMS, getItem, consumedItemIds } from '../data/Items';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addChip, addIconButton, addPanel, addRowPlate, addWell, addBody, fillDiamond,
} from '../ui';

const ACCENT = 0x2ee6c0;
const ROW_H = 74;
const ROW_PAD = 8;
const VISIBLE_ROWS = 7;

/**
 * Slide-over item drawer. Occupies the right half of the screen; the left half
 * is dimmed and click-to-close, so the campaign map stays visible behind it.
 */
export class InventoryScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private callerKey = 'CampaignWorldMapScene';

  private panelX = 0;
  private panelW = 0;

  private rowContainer!: Phaser.GameObjects.Container;
  private detailGroup: Phaser.GameObjects.GameObject[] = [];
  private scrollOffset = 0;
  private totalRows = 0;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; callerKey: string }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.callerKey = data?.callerKey ?? 'CampaignWorldMapScene';
  }

  create(): void {
    const { width, height } = this.scale;
    this.panelW = Math.floor(width * 0.52);
    this.panelX = width - this.panelW;
    this.scrollOffset = 0;
    this.detailGroup = [];

    // Dim + close on the exposed left side
    this.add.rectangle(this.panelX / 2, height / 2, this.panelX, height, 0x03030a, 0.6)
      .setDepth(DEPTH.overlay)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Drawer plate — square on the right edge so it reads as attached to it.
    addPanel(this, {
      x: this.panelX + this.panelW / 2, y: height / 2,
      w: this.panelW, h: height,
      accent: ACCENT,
      corners: [true, false, false, true],
      cut: 24,
      depth: DEPTH.overlay + 1,
      glow: 0.5,
      title: '🎒  INVENTORY',
      subtitle: 'ITEMS APPLY TO YOUR NEXT MATCH',
    });

    addChip(this, {
      x: width - 20, y: 30, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`,
      accent: ACCENT, originX: 1, depth: DEPTH.overlay + 3,
    });

    addIconButton(this, {
      x: this.panelX + 32, y: 30, r: 16, icon: '✕', accent: C.steel,
      depth: DEPTH.overlay + 3, tooltip: 'Close',
      onClick: () => this.close(),
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    this.input.on('wheel', (_ptr: unknown, _objs: unknown, _dx: number, dy: number) => {
      if (this.detailGroup.length > 0) return;
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset + dy * 0.5,
        0,
        Math.max(0, this.totalRows * (ROW_H + ROW_PAD) - VISIBLE_ROWS * (ROW_H + ROW_PAD)),
      );
      this.buildList();
    });

    this.buildList();
  }

  private get listY(): number { return 74; }

  private buildList(): void {
    const { height } = this.scale;
    const listY = this.listY;
    const listH = height - listY - 14;

    if (this.rowContainer) this.rowContainer.destroy();

    addWell(this, this.panelX + this.panelW / 2, listY + listH / 2, this.panelW - 20, listH, ACCENT, DEPTH.overlay + 2);

    this.rowContainer = this.add.container(0, 0).setDepth(DEPTH.overlay + 3);
    const maskGfx = this.make.graphics({}, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(this.panelX, listY, this.panelW, listH);
    this.rowContainer.setMask(maskGfx.createGeometryMask());

    const inventory = CP.getInventory(this.slotIdx);
    const ownedItems = ITEMS.filter((def) => (inventory[def.id] ?? 0) > 0);
    this.totalRows = ownedItems.length;

    if (ownedItems.length === 0) {
      const empty = this.add.text(this.panelX + this.panelW / 2, listY + 80,
        'Nothing in the bag.\n\nWorld Shops trade items for ⚡ Sparks.', {
          fontSize: '14px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 6,
        }).setOrigin(0.5, 0);
      this.rowContainer.add(empty);
      return;
    }

    ownedItems.forEach((def, i) => {
      const y = listY + 8 + i * (ROW_H + ROW_PAD) - this.scrollOffset;
      const count = inventory[def.id] ?? 0;
      const alreadyActive = consumedItemIds.has(def.id);
      const rowCx = this.panelX + this.panelW / 2;
      const rowW = this.panelW - 36;

      const row = addRowPlate(this, {
        x: rowCx, y: y + ROW_H / 2, w: rowW, h: ROW_H,
        accent: alreadyActive ? C.frost : ACCENT,
        depth: DEPTH.overlay + 3,
      });

      const hit = this.add.rectangle(rowCx, y + ROW_H / 2, rowW, ROW_H, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => row.paint(true))
        .on('pointerout', () => row.paint(false))
        .on('pointerdown', () => this.openDetail(def.id));

      const left = rowCx - rowW / 2;
      const objs: Phaser.GameObjects.GameObject[] = [
        row.g,
        this.add.text(left + 26, y + ROW_H / 2, def.emoji, { fontSize: '28px' }).setOrigin(0.5),
        this.add.text(left + 52, y + ROW_H / 2 - 13, def.name, {
          fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 0.5,
        }).setOrigin(0, 0.5),
        this.add.text(left + 52, y + ROW_H / 2 + 11, def.shortDesc, {
          fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
          wordWrap: { width: rowW - 140 },
        }).setOrigin(0, 0.5),
        this.add.text(left + rowW - 18, y + ROW_H / 2 - 11, `×${count}`, {
          fontSize: '17px', fontFamily: FONT_DISPLAY, color: T.gold,
        }).setOrigin(1, 0.5),
        hit,
      ];

      if (alreadyActive) {
        objs.push(this.add.text(left + rowW - 18, y + ROW_H / 2 + 12, '✓ ACTIVE', {
          fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(C.frost, 0xffffff, 0.3)), letterSpacing: 1,
        }).setOrigin(1, 0.5));
      }

      this.rowContainer.add(objs);
    });

    if (this.totalRows > VISIBLE_ROWS) {
      const hint = this.add.text(this.panelX + this.panelW - 20, this.scale.height - 20, 'scroll ▼', {
        fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
      }).setOrigin(1, 1);
      this.rowContainer.add(hint);
    }
  }

  /** Full-drawer detail view for one item, with the USE action. */
  private openDetail(itemId: string): void {
    const def = getItem(itemId);
    if (!def) return;
    const { height } = this.scale;
    const cx = this.panelX + this.panelW / 2;
    const midY = height / 2;

    this.rowContainer?.setVisible(false);

    const alreadyActive = consumedItemIds.has(itemId);
    const count = CP.getInventory(this.slotIdx)[itemId] ?? 0;
    const depth = DEPTH.overlay + 4;

    // Emblem: the item glyph set in a lit diamond.
    const emblem = this.add.graphics().setDepth(depth);
    for (let k = 6; k >= 1; k--) {
      emblem.fillStyle(ACCENT, 0.04);
      emblem.fillCircle(cx, midY - 118, 30 + k * 7);
    }
    fillDiamond(emblem, cx, midY - 118, 44, mix(C.plate, ACCENT, 0.2), 0.95);
    emblem.lineStyle(2, ACCENT, 0.7);
    emblem.strokeCircle(cx, midY - 118, 44);

    const objs: Phaser.GameObjects.GameObject[] = [
      emblem,
      this.add.text(cx, midY - 118, def.emoji, { fontSize: '44px' }).setOrigin(0.5).setDepth(depth + 1),
      this.add.text(cx, midY - 52, def.name, {
        fontSize: '23px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(depth + 1),
      this.add.text(cx, midY - 26, `OWNED  ×${count}`, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 1),
      addBody(this, {
        x: cx, y: midY + 4, text: def.fullDesc, size: 14, color: T.normal,
        wrap: this.panelW - 80, align: 'center', originX: 0.5, depth: depth + 1,
      }),
    ];

    if (alreadyActive) {
      objs.push(addButton(this, {
        x: cx, y: midY + 116, w: 220, h: 46,
        label: 'ALREADY ACTIVE', sublabel: 'Takes effect next match',
        accent: C.frost, variant: 'ghost', fontSize: 14, depth,
        disabled: true,
      }).container);
    } else {
      objs.push(addButton(this, {
        x: cx, y: midY + 116, w: 200, h: 52,
        label: 'USE', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 20, depth,
        onClick: () => {
          if (CP.consumeItem(this.slotIdx, itemId)) {
            consumedItemIds.add(itemId);
            this.closeDetail();
          }
        },
      }).container);
    }

    objs.push(addButton(this, {
      x: cx, y: midY + 176, w: 160, h: 38,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 13, depth,
      onClick: () => this.closeDetail(),
    }).container);

    this.detailGroup = objs;
  }

  private closeDetail(): void {
    for (const obj of this.detailGroup) obj.destroy();
    this.detailGroup = [];
    this.rowContainer?.setVisible(true);
    this.buildList();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(this.callerKey);
  }
}

/** Mount the bottom-right 🎒 inventory button on any campaign scene. */
export function addInventoryButton(
  scene: Phaser.Scene,
  slotIdx: 0 | 1 | 2,
  depth = 10,
): void {
  const { width, height } = scene.scale;
  addIconButton(scene, {
    x: width - 36, y: height - 36, r: 22, icon: '🎒', accent: ACCENT, depth,
    tooltip: 'Inventory',
    onClick: () => {
      scene.scene.pause();
      scene.scene.launch('InventoryScene', { slotIdx, callerKey: scene.scene.key });
    },
  });
}
