import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ALL_UPGRADES, getElementUpgrades, getUpgradePrice, UpgradeDef } from '../data/Upgrades';

const ELEMENT_COLORS: Record<string, number> = {
  fire:  0xff4400,
  water: 0x0088ff,
  life:  0x44cc44,
  air:   0xaaddff,
  earth: 0x887755,
};

const ELEMENT_EMOJIS: Record<string, string> = {
  fire:  '🔥',
  water: '💧',
  life:  '🌿',
  air:   '💨',
  earth: '🪨',
};

export class ShopScene extends Phaser.Scene {
  private shardText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Header
    this.add.text(cx, 36, 'SHOP', {
      fontSize: '40px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
      stroke: '#333333',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Shard counter
    this.shardText = this.add.text(width - 16, 12, '', {
      fontSize: '18px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44',
    }).setOrigin(1, 0);
    this.refreshShardDisplay();

    // Back button
    const backBtn = this.add
      .rectangle(52, 36, 88, 36, 0x222233)
      .setStrokeStyle(1, 0x555577)
      .setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    backBtn
      .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); })
      .on('pointerout', () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    // Element columns
    const elements = ALL_UPGRADES;
    const colW = Math.floor(width / elements.length);
    const colStartY = 80;

    elements.forEach((elemUpgrades, colIdx) => {
      const elementId = elemUpgrades.elementId;
      const colCX = colIdx * colW + colW / 2;
      const color = ELEMENT_COLORS[elementId] ?? 0x888888;
      const emoji = ELEMENT_EMOJIS[elementId] ?? '?';
      const upgrades = getElementUpgrades(elementId);

      // Element header card
      this.add.rectangle(colCX, colStartY + 28, colW - 8, 50, color, 0.2)
        .setStrokeStyle(1, color);
      this.add.text(colCX, colStartY + 18, `${emoji} ${elementId.toUpperCase()}`, {
        fontSize: '13px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Slot buttons
      const SLOT_KEYS = ['click', 'e', 'r', 'f', 'q'];
      const SLOT_DISPLAY = ['Click', 'E', 'R', 'F', 'Q'];
      const SLOT_PRICES = [10, 20, 35, 50, 75];

      const btnW = colW - 16;
      const btnH = 82;
      const btnGap = 6;
      const firstBtnY = colStartY + 60;

      SLOT_KEYS.forEach((slot, slotIdx) => {
        const bx = colCX;
        const by = firstBtnY + slotIdx * (btnH + btnGap) + btnH / 2;
        const upgDef: UpgradeDef | undefined = upgrades.find((u) => u.slot === slot);
        const price = upgDef?.price ?? SLOT_PRICES[slotIdx];

        const owned = PlayerData.isUpgradeOwned(elementId, slot);
        const active = PlayerData.isUpgradeActive(elementId, slot);
        const hasUpgradeDef = upgDef !== undefined;

        // Determine button color
        let fillColor = 0x1a1a1a;
        let borderColor = 0x333333;
        let labelColor = '#555555';

        if (owned && active) {
          fillColor = 0x0d2b0d;
          borderColor = 0x33aa33;
          labelColor = '#44ff44';
        } else if (owned && !active) {
          fillColor = 0x2b0d0d;
          borderColor = 0xaa3333;
          labelColor = '#ff4444';
        } else if (hasUpgradeDef) {
          fillColor = 0x1a1a2b;
          borderColor = 0x444466;
          labelColor = '#aaaaaa';
        }

        const btn = this.add
          .rectangle(bx, by, btnW, btnH, fillColor)
          .setStrokeStyle(1, borderColor);

        // Slot key label
        this.add.text(bx, by - 26, `[${SLOT_DISPLAY[slotIdx]}]`, {
          fontSize: '10px',
          fontFamily: 'Arial, sans-serif',
          color: '#666666',
        }).setOrigin(0.5);

        if (hasUpgradeDef && upgDef) {
          // Name
          this.add.text(bx, by - 12, upgDef.name, {
            fontSize: '11px',
            fontFamily: '"Arial Black", sans-serif',
            color: labelColor,
          }).setOrigin(0.5);

          // Description (word-wrap)
          this.add.text(bx, by + 6, upgDef.description, {
            fontSize: '9px',
            fontFamily: 'Arial, sans-serif',
            color: '#777777',
            wordWrap: { width: btnW - 8 },
            align: 'center',
          }).setOrigin(0.5);

          // Status / price
          const statusStr = owned
            ? (active ? 'ACTIVE — click to disable' : 'OWNED — click to enable')
            : `💎 ${price} shards`;
          this.add.text(bx, by + 32, statusStr, {
            fontSize: '9px',
            fontFamily: 'Arial, sans-serif',
            color: owned ? (active ? '#33aa33' : '#aa3333') : '#ffcc44',
          }).setOrigin(0.5);

          // Interactivity
          btn.setInteractive({ useHandCursor: true });

          btn.on('pointerover', () => {
            btn.setStrokeStyle(2, 0xffffff);
          });
          btn.on('pointerout', () => {
            btn.setStrokeStyle(1, borderColor);
          });
          btn.on('pointerdown', () => {
            if (!PlayerData.isUpgradeOwned(elementId, slot)) {
              // Purchase
              if (PlayerData.spendShards(price)) {
                PlayerData.purchaseUpgrade(elementId, slot);
                this.scene.restart();
              }
            } else {
              // Toggle
              PlayerData.toggleUpgrade(elementId, slot);
              this.scene.restart();
            }
          });
        } else {
          // No upgrade defined for this slot yet
          this.add.text(bx, by, 'Coming Soon', {
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
          }).setOrigin(0.5);
        }
      });
    });
  }

  private refreshShardDisplay(): void {
    this.shardText.setText(`💎 ${PlayerData.getShards()}`);
  }
}
