import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { GAUNTLET_GROUPS, GAUNTLET_ELEMENTS } from '../data/GauntletData';

export class GauntletSelectScene extends Phaser.Scene {
  private hardMode = false;

  constructor() {
    super({ key: 'GauntletSelectScene' });
  }

  init(data?: { hardMode?: boolean }): void {
    if (data?.hardMode !== undefined) {
      this.hardMode = data.hardMode;
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 52, 'GAUNTLETS', {
      fontSize: '52px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00',
      stroke: '#884400',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 100, 'Survive 5 battles + a boss without dying', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    const completedGauntlets = PlayerData.getCompletedGauntlets();
    const completedGauntletsHard = PlayerData.getCompletedGauntletsHard();
    const hardUnlocked = PlayerData.isGauntletHardUnlocked();

    // Gauntlet cards (5 base elements)
    const cardW = 148;
    const cardH = 200;
    const cardGap = 18;
    const totalW = GAUNTLET_ELEMENTS.length * cardW + (GAUNTLET_ELEMENTS.length - 1) * cardGap;
    const startX = cx - totalW / 2 + cardW / 2;

    GAUNTLET_ELEMENTS.forEach((el, i) => {
      const bx = startX + i * (cardW + cardGap);
      const by = cy + 20;
      const isCompleted = completedGauntlets.includes(el.id);
      const isHardCompleted = completedGauntletsHard.includes(el.id);

      const card = this.add
        .rectangle(bx, by, cardW, cardH, 0x111122, 0.9)
        .setStrokeStyle(2, el.color)
        .setInteractive({ useHandCursor: true });

      this.add.text(bx, by - 55, el.emoji, { fontSize: '48px' }).setOrigin(0.5);
      this.add.text(bx, by + 8, el.name.toUpperCase(), {
        fontSize: '18px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
        wordWrap: { width: cardW - 8 },
      }).setOrigin(0.5);

      const pool = GAUNTLET_GROUPS[el.id];
      this.add.text(bx, by + 34, pool.map((e) => {
        const found = GAUNTLET_ELEMENTS.find((ge) => ge.id === e);
        return found?.emoji ?? e;
      }).join(' '), { fontSize: '16px', wordWrap: { width: cardW - 8 } }).setOrigin(0.5);

      if (isCompleted) {
        const badgeColor = isHardCompleted ? '#cc66ff' : '#ffcc00';
        const strokeColor = isHardCompleted ? '#440066' : '#664400';
        const badgeText = isHardCompleted ? '★ CLEARED  🔥' : '★ CLEARED';
        const badge = this.add.text(bx, by - 80, badgeText, {
          fontSize: '13px',
          fontFamily: '"Arial Black", sans-serif',
          color: badgeColor,
          stroke: strokeColor,
          strokeThickness: 3,
        }).setOrigin(0.5);
        this.tweens.add({ targets: badge, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
      }

      card
        .on('pointerover', () => { card.setStrokeStyle(3, 0xffffff); card.setAlpha(1); })
        .on('pointerout',  () => { card.setStrokeStyle(2, el.color);  card.setAlpha(0.9); })
        .on('pointerdown', () => this.scene.start('GauntletElementSelectScene', { gauntletId: el.id, hardMode: this.hardMode }));
    });

    // Hard-mode toggle (below the cards)
    const toggleY = cy + 148;

    if (!hardUnlocked) {
      this.add.text(cx, toggleY, '🔥 HARD MODE  —  purchase in Shop for 1500 💎', {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#444455',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx - 120, toggleY, '🔥 HARD MODE', {
        fontSize: '15px', fontFamily: '"Arial Black", sans-serif', color: '#dd88ff',
      }).setOrigin(0.5);

      const trackW = 52;
      const trackH = 24;
      const knobR = 10;
      const trackX = cx + 50;

      const track = this.add.rectangle(trackX, toggleY, trackW, trackH, this.hardMode ? 0x882299 : 0x333344, 1)
        .setStrokeStyle(1, this.hardMode ? 0xdd44ff : 0x666677)
        .setInteractive({ useHandCursor: true });

      const knobOffX = trackX - trackW / 2 + knobR + 2;
      const knobOnX  = trackX + trackW / 2 - knobR - 2;
      const knob = this.add.circle(this.hardMode ? knobOnX : knobOffX, toggleY, knobR, this.hardMode ? 0xff88ff : 0x888899);

      track.on('pointerdown', () => {
        this.hardMode = !this.hardMode;
        this.scene.restart({ hardMode: this.hardMode });
      });
      knob.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.hardMode = !this.hardMode;
        this.scene.restart({ hardMode: this.hardMode });
      });

      const modeLabel = this.add.text(cx + 90, toggleY, this.hardMode ? 'ON' : 'OFF', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif',
        color: this.hardMode ? '#ff88ff' : '#555566',
      }).setOrigin(0, 0.5);
      void modeLabel;
    }

    // Back button
    const backBtn = this.add
      .rectangle(60, 32, 100, 36, 0x221100, 0.85)
      .setStrokeStyle(1, 0x664422)
      .setInteractive({ useHandCursor: true });
    this.add.text(60, 32, '← BACK', {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    backBtn
      .on('pointerover', () => { backBtn.setStrokeStyle(2, 0xffffff); })
      .on('pointerout',  () => { backBtn.setStrokeStyle(1, 0x664422); })
      .on('pointerdown', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    this.add.text(width - 16, 16, `💎 ${PlayerData.getShards()}`, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffcc44',
    }).setOrigin(1, 0);
  }

}
