import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';

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
    const panelH = 380;

    // Dim overlay
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setDepth(0)
      .setInteractive();

    // Panel
    this.add.rectangle(cx, cy, panelW, panelH, 0x0d0d1a, 1)
      .setStrokeStyle(3, 0xffcc00)
      .setDepth(1);

    // Title
    this.add.text(cx, cy - 150, `🛒  WORLD SHOP`, {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cy - 114, world ? world.name.toUpperCase() + ' WORLD' : '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5).setDepth(2);

    // Currency display
    const keys = CP.getKeys(this.slotIdx);
    const sparks = CP.getSparks(this.slotIdx);
    this.add.text(cx - 70, cy - 82, `🗝️  ${keys}`, {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffdd55',
    }).setOrigin(0.5).setDepth(2);
    this.add.text(cx + 70, cy - 82, `⚡  ${sparks}`, {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#55ffcc',
    }).setOrigin(0.5).setDepth(2);

    // Placeholder
    this.add.text(cx, cy, '[ Shop items coming soon ]', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#444444',
    }).setOrigin(0.5).setDepth(2);

    // Back button
    const backBtn = this.add.rectangle(cx, cy + 155, 160, 44, 0x222233)
      .setStrokeStyle(2, 0x555577)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(cx, cy + 155, '← BACK', {
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
