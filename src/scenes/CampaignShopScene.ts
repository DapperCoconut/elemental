import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { getItemsForElement } from '../data/Items';

export class CampaignShopScene extends Phaser.Scene {
  private worldId = 'fire';
  private slotIdx: 0 | 1 | 2 = 0;

  constructor() {
    super({ key: 'CampaignShopScene' });
  }

  init(data: { worldId: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const world = getAnyWorld(this.worldId);
    const panelW = 520;
    const panelH = 420;
    const slotIdx = this.slotIdx;

    // Dim overlay
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setDepth(0)
      .setInteractive();

    // Panel
    this.add.rectangle(cx, cy, panelW, panelH, 0x0d0d1a, 1)
      .setStrokeStyle(3, 0xffcc00)
      .setDepth(1);

    // Title
    this.add.text(cx, cy - 180, `🛒  WORLD SHOP`, {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cy - 144, world ? world.name.toUpperCase() + ' WORLD' : '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5).setDepth(2);

    // Currency display
    const sparksTxt = this.add.text(cx, cy - 118, `⚡  ${CP.getSparks(slotIdx)}`, {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#55ffcc',
    }).setOrigin(0.5).setDepth(2);

    // Item rows
    const items = getItemsForElement(this.worldId);
    const rowH = 64;
    const rowW = panelW - 32;
    const rowStartY = cy - 80;

    if (items.length === 0) {
      this.add.text(cx, cy, 'No items available in this shop.', {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#444444',
      }).setOrigin(0.5).setDepth(2);
    }

    items.forEach((def, i) => {
      const rowY = rowStartY + i * (rowH + 8);
      const inventory = CP.getInventory(slotIdx);
      const owned = inventory[def.id] ?? 0;

      const bg = this.add.rectangle(cx, rowY, rowW, rowH, 0x181828, 1)
        .setStrokeStyle(1, 0x333355).setDepth(2)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x232342))
        .on('pointerout', () => bg.setFillStyle(0x181828))
        .on('pointerdown', () => {
          if (CP.spendSparks(slotIdx, def.priceSparks)) {
            CP.addItem(slotIdx, def.id);
            this.scene.restart({ worldId: this.worldId, slotIdx });
          } else {
            // Flash spark counter red briefly
            sparksTxt.setColor('#ff4444');
            this.time.delayedCall(400, () => sparksTxt.setColor('#55ffcc'));
          }
        });

      this.add.text(cx - rowW / 2 + 18, rowY, def.emoji, { fontSize: '28px' })
        .setOrigin(0, 0.5).setDepth(3);

      this.add.text(cx - rowW / 2 + 58, rowY - 12, def.name, {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#ccccdd',
      }).setOrigin(0, 0.5).setDepth(3);

      this.add.text(cx - rowW / 2 + 58, rowY + 10, def.shortDesc, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888899',
      }).setOrigin(0, 0.5).setDepth(3);

      this.add.text(cx + rowW / 2 - 12, rowY - 10, `${def.priceSparks} ⚡`, {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: '#55ffcc',
      }).setOrigin(1, 0.5).setDepth(3);

      this.add.text(cx + rowW / 2 - 12, rowY + 12, `Owned: ${owned}`, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffcc44',
      }).setOrigin(1, 0.5).setDepth(3);
    });

    // Inventory button (header area, top-right of panel)
    const invBtn = this.add.rectangle(cx + panelW / 2 - 26, cy - 180, 40, 32, 0x333344)
      .setStrokeStyle(1, 0x666677).setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => invBtn.setFillStyle(0x4a4a5e))
      .on('pointerout', () => invBtn.setFillStyle(0x333344))
      .on('pointerdown', () => {
        this.scene.pause();
        this.scene.launch('InventoryScene', { slotIdx, callerKey: this.scene.key });
      });
    this.add.text(cx + panelW / 2 - 26, cy - 180, '🎒', { fontSize: '16px' })
      .setOrigin(0.5).setDepth(3);

    // Back button
    const backBtn = this.add.rectangle(cx, cy + 180, 160, 44, 0x222233)
      .setStrokeStyle(2, 0x555577)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(cx, cy + 180, '← BACK', {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(3);
    backBtn
      .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLbl.setColor('#ffffff'); })
      .on('pointerout', () => { backBtn.setFillStyle(0x222233); backLbl.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.close());

    this.input.keyboard!.on('keydown-ESC', () => this.close());

  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldScene');
  }
}
