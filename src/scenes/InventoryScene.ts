import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import { ITEMS, getItem, consumedItemIds } from '../data/Items';

const PANEL_COLOR = 0x222233;
const PANEL_STROKE = 0x555566;
const ROW_H = 72;
const ROW_PAD = 8;
const VISIBLE_ROWS = 7;

export class InventoryScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private callerKey = 'CampaignWorldMapScene';

  private panelX = 0;
  private panelW = 0;

  private rowContainer!: Phaser.GameObjects.Container;
  private detailGroup!: Phaser.GameObjects.GameObject[];
  private listGroup!: Phaser.GameObjects.GameObject[];
  private scrollOffset = 0;
  private totalRows = 0;
  private maskGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; callerKey: string }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.callerKey = data?.callerKey ?? 'CampaignWorldMapScene';
  }

  create(): void {
    const { width, height } = this.scale;
    this.panelW = Math.floor(width * 0.5);
    this.panelX = width - this.panelW;
    this.scrollOffset = 0;

    // Dim left half
    this.add.rectangle(this.panelX / 2, height / 2, this.panelX, height, 0x000000, 0.45)
      .setDepth(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Panel background
    this.add.rectangle(this.panelX + this.panelW / 2, height / 2, this.panelW, height, PANEL_COLOR, 1)
      .setStrokeStyle(2, PANEL_STROKE)
      .setDepth(1);

    // Title
    this.add.text(this.panelX + this.panelW / 2, 24, '🎒  INVENTORY', {
      fontSize: '22px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ccccdd',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Spark counter
    const sparks = CP.getSparks(this.slotIdx);
    this.add.text(this.panelX + this.panelW - 12, 24, `⚡  ${sparks}`, {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#55ffcc',
    }).setOrigin(1, 0.5).setDepth(2);

    // Divider
    const divGfx = this.add.graphics().setDepth(2);
    divGfx.lineStyle(1, 0x444455, 1);
    divGfx.lineBetween(this.panelX + 8, 44, width - 8, 44);

    // Close / ESC
    this.input.keyboard!.on('keydown-ESC', () => this.close());

    // Scroll
    this.input.on('wheel', (_ptr: unknown, _objs: unknown, _dx: number, dy: number) => {
      if (this.detailGroup) return;
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset + dy * 0.5,
        0,
        Math.max(0, this.totalRows * ROW_H - VISIBLE_ROWS * ROW_H),
      );
      this.rebuildList();
    });

    this.buildList();
  }

  private buildList(): void {
    const { width, height } = this.scale;
    const listY = 52;
    const listH = height - listY - 8;

    if (this.rowContainer) this.rowContainer.destroy();
    this.rowContainer = this.add.container(0, 0).setDepth(3);

    const maskGfx = this.add.graphics();
    maskGfx.fillRect(this.panelX, listY, this.panelW, listH);
    this.rowContainer.setMask(maskGfx.createGeometryMask());

    const inventory = CP.getInventory(this.slotIdx);
    const ownedItems = ITEMS.filter((def) => (inventory[def.id] ?? 0) > 0);
    this.totalRows = ownedItems.length;

    if (ownedItems.length === 0) {
      const empty = this.add.text(this.panelX + this.panelW / 2, listY + 60, 'No items yet.\nBuy some in the World Shop!', {
        fontSize: '15px',
        fontFamily: 'Arial, sans-serif',
        color: '#555566',
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(3);
      this.rowContainer.add(empty);
      return;
    }

    ownedItems.forEach((def, i) => {
      const y = listY + i * (ROW_H + ROW_PAD) - this.scrollOffset;
      const count = inventory[def.id] ?? 0;
      const alreadyActive = consumedItemIds.has(def.id);

      const bg = this.add.rectangle(
        this.panelX + this.panelW / 2, y + ROW_H / 2,
        this.panelW - 16, ROW_H,
        0x1a1a2e, 1,
      ).setStrokeStyle(1, alreadyActive ? 0x4488aa : 0x333355)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x252540))
        .on('pointerout', () => bg.setFillStyle(0x1a1a2e))
        .on('pointerdown', () => this.openDetail(def.id));

      const emojiTxt = this.add.text(this.panelX + 20, y + ROW_H / 2, def.emoji, {
        fontSize: '28px',
      }).setOrigin(0, 0.5);

      const nameTxt = this.add.text(this.panelX + 58, y + ROW_H / 2 - 12, def.name, {
        fontSize: '14px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ccccdd',
      }).setOrigin(0, 0.5);

      const descTxt = this.add.text(this.panelX + 58, y + ROW_H / 2 + 10, def.shortDesc, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#888899',
      }).setOrigin(0, 0.5);

      const countTxt = this.add.text(
        this.panelX + this.panelW - 24, y + ROW_H / 2 - 8,
        `×${count}`,
        { fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44' },
      ).setOrigin(1, 0.5);

      const statusTxt = alreadyActive
        ? this.add.text(this.panelX + this.panelW - 24, y + ROW_H / 2 + 10, '✓ Active', {
            fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#55aacc',
          }).setOrigin(1, 0.5)
        : null;

      const objs: Phaser.GameObjects.GameObject[] = [bg, emojiTxt, nameTxt, descTxt, countTxt];
      if (statusTxt) objs.push(statusTxt);
      this.rowContainer.add(objs);
    });

    void width;
  }

  private rebuildList(): void {
    this.buildList();
  }

  private openDetail(itemId: string): void {
    const def = getItem(itemId);
    if (!def) return;
    const { width, height } = this.scale;
    const cx = this.panelX + this.panelW / 2;
    const midY = height / 2;

    if (this.rowContainer) this.rowContainer.setVisible(false);

    const alreadyActive = consumedItemIds.has(itemId);
    const count = CP.getInventory(this.slotIdx)[itemId] ?? 0;

    const emojiTxt = this.add.text(cx, midY - 100, def.emoji, { fontSize: '52px' }).setOrigin(0.5).setDepth(4);
    const nameTxt = this.add.text(cx, midY - 42, def.name, {
      fontSize: '22px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ccccdd',
    }).setOrigin(0.5).setDepth(4);
    const descTxt = this.add.text(cx, midY + 10, def.fullDesc, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      align: 'center',
      wordWrap: { width: this.panelW - 32 },
    }).setOrigin(0.5, 0).setDepth(4);

    const countTxt = this.add.text(cx, midY - 64, `Owned: ${count}`, {
      fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(4);

    let useBtnRect: Phaser.GameObjects.Rectangle;
    let useBtnLbl: Phaser.GameObjects.Text;
    if (alreadyActive) {
      useBtnRect = this.add.rectangle(cx, midY + 110, 160, 44, 0x333344)
        .setStrokeStyle(2, 0x555566).setDepth(4);
      useBtnLbl = this.add.text(cx, midY + 110, '✓ Active for next match', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#55aacc',
      }).setOrigin(0.5).setDepth(5);
    } else {
      useBtnRect = this.add.rectangle(cx, midY + 110, 140, 44, 0x441111)
        .setStrokeStyle(2, 0xcc2222).setDepth(4)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => useBtnRect.setFillStyle(0x662222))
        .on('pointerout', () => useBtnRect.setFillStyle(0x441111))
        .on('pointerdown', () => {
          if (CP.consumeItem(this.slotIdx, itemId)) {
            consumedItemIds.add(itemId);
            this.closeDetail();
          }
        });
      useBtnLbl = this.add.text(cx, midY + 110, 'USE', {
        fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#ff5555',
      }).setOrigin(0.5).setDepth(5);
    }

    const backBtn = this.add.rectangle(cx, midY + 165, 140, 36, 0x222233)
      .setStrokeStyle(1, 0x444455).setDepth(4)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setFillStyle(0x333355))
      .on('pointerout', () => backBtn.setFillStyle(0x222233))
      .on('pointerdown', () => this.closeDetail());
    const backLbl = this.add.text(cx, midY + 165, '← BACK', {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(5);

    this.detailGroup = [emojiTxt, nameTxt, descTxt, countTxt, useBtnRect, useBtnLbl, backBtn, backLbl];
    void width;
  }

  private closeDetail(): void {
    if (this.detailGroup) {
      for (const obj of this.detailGroup) obj.destroy();
      this.detailGroup = [];
    }
    if (this.rowContainer) this.rowContainer.setVisible(true);
    this.rebuildList();
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
  const x = width - 28;
  const y = height - 28;

  const btn = scene.add.rectangle(x, y, 44, 44, 0x333344, 1)
    .setStrokeStyle(1, 0x666677)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => btn.setFillStyle(0x4a4a5e))
    .on('pointerout', () => btn.setFillStyle(0x333344))
    .on('pointerdown', () => {
      scene.scene.pause();
      scene.scene.launch('InventoryScene', { slotIdx, callerKey: scene.scene.key });
    });

  scene.add.text(x, y, '🎒', { fontSize: '20px' }).setOrigin(0.5).setDepth(depth + 1);
}
