import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';

export class CampaignPortalScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;

  constructor() {
    super({ key: 'CampaignPortalScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2 }): void {
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const panelW = 520;
    const panelH = 360;
    const purchased = CP.isPortalUnlocked(this.slotIdx);
    const keys = CP.getKeys(this.slotIdx);
    const canAfford = keys >= 10;

    // Dim overlay
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setDepth(0)
      .setInteractive();

    // Panel
    this.add.rectangle(cx, cy, panelW, panelH, 0x0d0d1a, 1)
      .setStrokeStyle(3, 0xaa44ff)
      .setDepth(1);

    // Header
    const headerText = purchased ? '🌀 Portal Active' : '🌀 Open the Portal';
    this.add.text(cx, cy - 148, headerText, {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff',
      stroke: '#330066',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    if (purchased) {
      // Active state
      this.add.text(cx, cy - 30, 'Press SPACE on the world map\nto travel between realms.', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaacc',
        align: 'center',
      }).setOrigin(0.5).setDepth(2);

      const closeBtn = this.add.rectangle(cx, cy + 130, 160, 44, 0x222233)
        .setStrokeStyle(2, 0x555577)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const closeLbl = this.add.text(cx, cy + 130, 'CLOSE', {
        fontSize: '16px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(3);
      closeBtn
        .on('pointerover', () => { closeBtn.setFillStyle(0x333355); closeLbl.setColor('#ffffff'); })
        .on('pointerout', () => { closeBtn.setFillStyle(0x222233); closeLbl.setColor('#aaaaaa'); })
        .on('pointerdown', () => this.close());
    } else {
      // Purchase state
      this.add.text(cx, cy - 80, 'Travel between realms.\nThe Abstract awaits beyond.', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaacc',
        align: 'center',
      }).setOrigin(0.5).setDepth(2);

      this.add.text(cx, cy - 20, 'Cost: 🗝️ 10', {
        fontSize: '16px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffdd55',
      }).setOrigin(0.5).setDepth(2);

      this.add.text(cx, cy + 10, `You have: 🗝️ ${keys}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: canAfford ? '#88ffaa' : '#ff7777',
      }).setOrigin(0.5).setDepth(2);

      if (canAfford) {
        const buyBtn = this.add.rectangle(cx, cy + 80, 200, 52, 0x1a3a1a)
          .setStrokeStyle(2, 0x44cc44)
          .setDepth(2)
          .setInteractive({ useHandCursor: true });
        const buyLbl = this.add.text(cx, cy + 80, 'PURCHASE', {
          fontSize: '20px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#aaffaa',
        }).setOrigin(0.5).setDepth(3);
        buyBtn
          .on('pointerover', () => { buyBtn.setFillStyle(0x253525); buyLbl.setColor('#ffffff'); })
          .on('pointerout', () => { buyBtn.setFillStyle(0x1a3a1a); buyLbl.setColor('#aaffaa'); })
          .on('pointerdown', () => {
            if (CP.purchasePortal(this.slotIdx)) this.scene.restart();
          });
      } else {
        this.add.rectangle(cx, cy + 80, 200, 52, 0x222233)
          .setStrokeStyle(2, 0x444455)
          .setDepth(2);
        this.add.text(cx, cy + 80, 'PURCHASE', {
          fontSize: '20px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#555566',
        }).setOrigin(0.5).setDepth(3);
        this.add.text(cx, cy + 115, 'Not enough keys', {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#774455',
        }).setOrigin(0.5).setDepth(3);
      }

      const backBtn = this.add.rectangle(cx, cy + 148, 140, 36, 0x1a1a2a)
        .setStrokeStyle(2, 0x444455)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const backLbl = this.add.text(cx, cy + 148, '← BACK', {
        fontSize: '14px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#888888',
      }).setOrigin(0.5).setDepth(3);
      backBtn
        .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLbl.setColor('#ffffff'); })
        .on('pointerout', () => { backBtn.setFillStyle(0x1a1a2a); backLbl.setColor('#888888'); })
        .on('pointerdown', () => this.close());
    }

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldMapScene');
  }
}
