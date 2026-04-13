import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  GAUNTLET_GROUPS,
  GAUNTLET_ELEMENTS,
  GauntletState,
  GAUNTLET_DIFFICULTY,
} from '../data/GauntletData';
import { MUTATIONS } from '../data/Mutations';

export class GauntletSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GauntletSelectScene' });
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
    this.add.text(cx, 60, 'GAUNTLETS', {
      fontSize: '52px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00',
      stroke: '#884400',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 108, 'Survive 5 battles + a boss without dying', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    const completedGauntlets = PlayerData.getCompletedGauntlets();

    // Element cards
    const cardW = 148;
    const cardH = 200;
    const cardGap = 18;
    const totalW = GAUNTLET_ELEMENTS.length * cardW + (GAUNTLET_ELEMENTS.length - 1) * cardGap;
    const startX = cx - totalW / 2 + cardW / 2;

    GAUNTLET_ELEMENTS.forEach((el, i) => {
      const bx = startX + i * (cardW + cardGap);
      const by = cy + 20;
      const isCompleted = completedGauntlets.includes(el.id);

      const card = this.add
        .rectangle(bx, by, cardW, cardH, 0x111122, 0.9)
        .setStrokeStyle(2, el.color)
        .setInteractive({ useHandCursor: true });

      // Element emoji
      this.add.text(bx, by - 55, el.emoji, {
        fontSize: '48px',
      }).setOrigin(0.5);

      // Element name
      this.add.text(bx, by + 8, el.name.toUpperCase(), {
        fontSize: '18px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Enemy pool hint
      const pool = GAUNTLET_GROUPS[el.id];
      this.add.text(bx, by + 34, pool.map((e) => {
        const found = GAUNTLET_ELEMENTS.find((ge) => ge.id === e);
        return found?.emoji ?? e;
      }).join(' '), {
        fontSize: '16px',
      }).setOrigin(0.5);

      // Completion badge
      if (isCompleted) {
        const badge = this.add.text(bx, by - 80, '★ CLEARED', {
          fontSize: '13px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#ffcc00',
          stroke: '#664400',
          strokeThickness: 3,
        }).setOrigin(0.5);
        // Glow pulse
        this.tweens.add({
          targets: badge,
          alpha: 0.6,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      }

      // Hover
      card
        .on('pointerover', () => {
          card.setStrokeStyle(3, 0xffffff);
          card.setAlpha(1);
        })
        .on('pointerout', () => {
          card.setStrokeStyle(2, el.color);
          card.setAlpha(0.9);
        })
        .on('pointerdown', () => this.startGauntlet(el.id));
    });

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
      .on('pointerout', () => { backBtn.setStrokeStyle(1, 0x664422); })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    // Shard display
    this.add.text(width - 16, 16, `💎 ${PlayerData.getShards()}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc44',
    }).setOrigin(1, 0);
  }

  private startGauntlet(baseElement: string): void {
    const pool = GAUNTLET_GROUPS[baseElement];
    const mutationIds = MUTATIONS.map((m) => m.id);

    // Pre-generate 5 fight enemies (random from pool)
    const fightOrder = Array.from({ length: 5 }, () => pool[Math.floor(Math.random() * pool.length)]);
    // Pre-generate 5 mutations (random)
    const fightMutations = Array.from({ length: 5 }, () => mutationIds[Math.floor(Math.random() * mutationIds.length)]);

    const gauntlet: GauntletState = {
      gauntletElement: baseElement,
      currentFight: 1,
      boosts: [],
      fightOrder,
      fightMutations,
    };

    this.scene.start('ArenaScene', {
      elementId: baseElement,
      enemyElementId: fightOrder[0],
      difficulty: GAUNTLET_DIFFICULTY[0],
      mutations: [fightMutations[0]],
      gauntlet,
    });
  }
}
