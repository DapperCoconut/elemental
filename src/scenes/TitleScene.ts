import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { GAUNTLET_COST } from '../data/GauntletData';

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

    // Buttons — 3×2 grid
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const buttons: Array<{ label: string; sub?: string; color: number; borderColor: number; action: (() => void) | null }> = [
      { label: 'PLAY',       color: 0x1a2a1a, borderColor: 0x44cc44, action: () => this.scene.start('MenuScene', { isPvP: false }) },
      { label: 'LOCAL PVP',  color: 0x2a1a1a, borderColor: 0xff4444, action: () => this.scene.start('MenuScene', { isPvP: true }) },
      { label: 'INVASION',   color: 0x1a0022, borderColor: 0x8800cc, action: () => this.scene.start('MenuScene', { mode: 'invasion' }) },
      { label: 'SHOP',       color: 0x1a1a2a, borderColor: 0x4466ff, action: () => this.scene.start('ShopScene') },
      { label: 'LAB',        color: 0x1a1a2a, borderColor: 0x9944ff, action: () => this.scene.start('LabScene') },
      {
        label: 'GAUNTLETS',
        sub: gauntletUnlocked ? undefined : `🔒 Unlock in Shop (💎${GAUNTLET_COST})`,
        color: 0x2a1a00,
        borderColor: 0xffaa00,
        action: gauntletUnlocked ? () => this.scene.start('GauntletSelectScene') : null,
      },
    ];

    const btnW = 220;
    const btnH = 72;
    const btnGap = 20;
    const cols = 3;
    const rows = 2;
    const gridW = cols * btnW + (cols - 1) * btnGap;
    const gridH = rows * btnH + (rows - 1) * btnGap;
    const gridStartX = cx - gridW / 2 + btnW / 2;
    const gridStartY = cy - gridH / 2 + btnH / 2 + 35;

    buttons.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = gridStartX + col * (btnW + btnGap);
      const by = gridStartY + row * (btnH + btnGap);
      const isLocked = b.action === null;
      const alpha = isLocked ? 0.35 : 0.8;

      const rect = this.add
        .rectangle(bx, by, btnW, btnH, b.color, alpha)
        .setStrokeStyle(2, b.borderColor);

      this.add.text(bx, by - (b.sub ? 8 : 0), b.label, {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: isLocked ? '#444444' : '#ffffff',
      }).setOrigin(0.5);

      if (b.sub) {
        this.add.text(bx, by + 16, b.sub, {
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
    this.add.text(cx, height - 24, 'Copyright © 2025 Isaac Butikofer. All rights reserved.', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);

    // Konami code: WWSSADADBA → 9999 shards + complete all gauntlets + unlock alt elements
    const KONAMI = ['W', 'W', 'S', 'S', 'A', 'D', 'A', 'D', 'B', 'A'];
    let konamiIdx = 0;

    let notificationText: Phaser.GameObjects.Text | null = null;
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();

      if (key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          PlayerData.addShards(9999);
          PlayerData.unlockGauntlet();
          for (const id of ['fire', 'water', 'life', 'air', 'earth']) {
            PlayerData.completeGauntlet(id);
          }
          if (notificationText) notificationText.destroy();
          notificationText = this.add.text(cx, height - 60, '🏆 All Gauntlets Complete! ✨ +9999 Shards!', {
            fontSize: '20px',
            fontFamily: '"Arial Black", sans-serif',
            color: '#ffee00',
            stroke: '#664400',
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({
            targets: notificationText, alpha: 0, y: height - 100,
            delay: 2500, duration: 1000,
            onComplete: () => { notificationText?.destroy(); notificationText = null; },
          });
        }
      } else {
        konamiIdx = key === KONAMI[0] ? 1 : 0;
      }
    });
  }
}
