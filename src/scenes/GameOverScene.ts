import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { SHARD_REWARDS } from '../data/Upgrades';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { playerWon: boolean; difficulty: number; rewardMult?: number; isPvP?: boolean; isGauntlet?: boolean }): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);

    const baseShard = (!data.isPvP && data.playerWon) ? SHARD_REWARDS[data.difficulty - 1] : 0;
    const shardsEarned = Math.round(baseShard * (data.rewardMult ?? 1));
    if (shardsEarned > 0) {
      PlayerData.addShards(shardsEarned);
    }

    let title: string, subtitle: string, titleColor: string;
    if (data.isGauntlet && !data.playerWon) {
      [title, subtitle, titleColor] = ['GAUNTLET FAILED', 'Your run has ended...', '#ff4444'];
    } else if (data.isPvP) {
      [title, subtitle, titleColor] = data.playerWon
        ? ['PLAYER 1 WINS!', 'Great match!', '#ff8800']
        : ['PLAYER 2 WINS!', 'Great match!', '#44aaff'];
    } else {
      [title, subtitle, titleColor] = data.playerWon
        ? ['VICTORY!', 'The flames triumph! 🔥', '#ff8800']
        : ['DEFEATED', 'Better luck next time...', '#44aaff'];
    }

    this.add.text(cx, cy - 110, title, {
      fontSize: '80px',
      fontFamily: '"Arial Black", sans-serif',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, subtitle, {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    if (shardsEarned > 0) {
      const multLabel = (data.rewardMult ?? 1) > 1 ? ` ×${data.rewardMult!.toFixed(2)}` : '';
      this.add.text(cx, cy + 18, `+${shardsEarned} 💎${multLabel}`, {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffcc00',
      }).setOrigin(0.5);
    }

    // Play Again button
    const btnW = 240;
    const btnH = 64;
    const btnY = cy + 90;

    const btn = this.add
      .rectangle(cx, btnY, btnW, btnH, 0x222233)
      .setStrokeStyle(2, 0x666688)
      .setInteractive({ useHandCursor: true });

    const btnLabel = this.add.text(cx, btnY, 'PLAY AGAIN', {
      fontSize: '24px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn
      .on('pointerover', () => {
        btn.setFillStyle(0x333355);
        btn.setStrokeStyle(2, 0xaaaacc);
        btnLabel.setColor('#ffcc00');
      })
      .on('pointerout', () => {
        btn.setFillStyle(0x222233);
        btn.setStrokeStyle(2, 0x666688);
        btnLabel.setColor('#ffffff');
      })
      .on('pointerdown', () => {
        this.scene.start('TitleScene');
      });
  }
}
