import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);

    // Grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 130, 'ELEMENTAL', {
      fontSize: '68px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ff8800',
      stroke: '#ff2200',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Buttons
    const buttons: Array<{ label: string; sub?: string; color: number; borderColor: number; action: (() => void) | null }> = [
      { label: 'PLAY',  color: 0x1a2a1a, borderColor: 0x44cc44, action: () => this.scene.start('MenuScene') },
      { label: 'SHOP',  color: 0x1a1a2a, borderColor: 0x4466ff, action: () => this.scene.start('ShopScene') },
      { label: 'LAB',   sub: 'COMING SOON', color: 0x1a1a1a, borderColor: 0x333333, action: null },
    ];

    const btnW = 220;
    const btnH = 72;
    const btnGap = 24;
    const totalH = buttons.length * btnH + (buttons.length - 1) * btnGap;
    const startY = cy - totalH / 2 + 40;

    buttons.forEach((b, i) => {
      const by = startY + i * (btnH + btnGap);
      const isLocked = b.action === null;
      const alpha = isLocked ? 0.35 : 0.8;

      const rect = this.add
        .rectangle(cx, by, btnW, btnH, b.color, alpha)
        .setStrokeStyle(2, b.borderColor);

      this.add.text(cx, by - (b.sub ? 8 : 0), b.label, {
        fontSize: '26px',
        fontFamily: '"Arial Black", sans-serif',
        color: isLocked ? '#444444' : '#ffffff',
      }).setOrigin(0.5);

      if (b.sub) {
        this.add.text(cx, by + 16, b.sub, {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#444444',
        }).setOrigin(0.5);
      }

      if (!isLocked && b.action) {
        const action = b.action;
        rect
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => { rect.setAlpha(1); rect.setStrokeStyle(3, 0xffffff); })
          .on('pointerout', () => { rect.setAlpha(alpha); rect.setStrokeStyle(2, b.borderColor); })
          .on('pointerdown', () => action());
      }
    });

    // Shard display
    this.add.text(width - 16, 16, `💎 ${PlayerData.getShards()}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc44',
    }).setOrigin(1, 0);

    // Footer hint
    this.add.text(cx, height - 24, 'Defeat the enemy to win!', {
      fontSize: '13px',
      color: '#444444',
    }).setOrigin(0.5);
  }
}
