import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as CP from '../data/CampaignProgress';
import { SHARD_REWARDS } from '../data/Upgrades';

type CampaignPayload = { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean };

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { playerWon: boolean; difficulty: number; rewardMult?: number; isGauntlet?: boolean; mode?: string; wavesCompleted?: number; corruptShardsEarned?: number; campaign?: CampaignPayload }): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);

    const isInvasion = data.mode === 'invasion';
    const isCampaign = !!data.campaign;
    const baseShard = (!isInvasion && !isCampaign && data.playerWon) ? SHARD_REWARDS[data.difficulty - 1] : 0;
    const shardsEarned = Math.round(baseShard * (data.rewardMult ?? 1));
    if (shardsEarned > 0) {
      PlayerData.addShards(shardsEarned);
    }

    // Mark campaign progress on win and award currencies
    let keysEarned = 0;
    let sparksEarned = 0;
    if (isCampaign && data.playerWon && data.campaign) {
      if (data.campaign.isChallenge) {
        CP.markChallengeCompleted(data.campaign.slot, data.campaign.worldId);
        CP.addKeys(data.campaign.slot, 1);
        keysEarned = 1;
      } else {
        CP.markFightCompleted(data.campaign.slot, data.campaign.worldId, data.campaign.fightId);
      }
      CP.addSparks(data.campaign.slot, 1);
      sparksEarned = 1;
    }

    let title: string, subtitle: string, titleColor: string;
    if (isInvasion) {
      [title, subtitle, titleColor] = ['YOU FELL', `Waves cleared: ${data.wavesCompleted ?? 0}`, '#cc44ff'];
    } else if (data.isGauntlet && !data.playerWon) {
      [title, subtitle, titleColor] = ['GAUNTLET FAILED', 'Your run has ended...', '#ff4444'];
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

    if (sparksEarned > 0 || keysEarned > 0) {
      const parts: string[] = [];
      if (sparksEarned > 0) parts.push(`+${sparksEarned} ⚡ Spark`);
      if (keysEarned > 0) parts.push(`+${keysEarned} 🗝️ Key`);
      this.add.text(cx, cy + 18, parts.join('   '), {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#aaffdd',
      }).setOrigin(0.5);
    }

    if (isInvasion && (data.corruptShardsEarned ?? 0) > 0) {
      this.add.text(cx, cy + 18, `+${data.corruptShardsEarned} 🩸 Corrupt Shards`, {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#cc44ff',
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

    const btnText = data.campaign ? 'BACK TO WORLD' : 'PLAY AGAIN';
    const btnLabel = this.add.text(cx, btnY, btnText, {
      fontSize: '24px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const goBack = () => {
      if (data.campaign) {
        this.scene.start('CampaignWorldScene', {
          worldId: data.campaign!.worldId,
          slotIdx: data.campaign!.slot,
        });
      } else {
        this.scene.start('TitleScene');
      }
    };

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
      .on('pointerdown', goBack);
    this.input.keyboard!.on('keydown-ESC', goBack);
  }
}
