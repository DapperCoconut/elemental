import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as CP from '../data/CampaignProgress';
import { SHARD_REWARDS } from '../data/Upgrades';
import { MUTATIONS } from '../data/Mutations';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addPanel, addTitle, fillDiamond,
} from '../ui';

type CampaignPayload = { slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean };

/** One line in the rewards ledger. */
type RewardLine = { icon: string; text: string; color: string; big?: boolean };

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: {
    playerWon: boolean;
    difficulty: number;
    rewardMult?: number;
    isGauntlet?: boolean;
    mode?: string;
    wavesCompleted?: number;
    corruptShardsEarned?: number;
    campaign?: CampaignPayload;
    isInfinityRun?: boolean;
    infinityFightsCleared?: number;
    infinityShards?: number;
    curseShardMult?: number;
    gauntletElement?: string;
    hardMode?: boolean;
    online?: boolean;
    onlineReason?: string;
  }): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    const isInvasion = data.mode === 'invasion';
    const isCampaign = !!data.campaign;
    const isInfinityRun = !!data.isInfinityRun;
    const isOnline = !!data.online;

    // Infinity run: award shards on loss and update best-fight record
    if (isInfinityRun && (data.infinityShards ?? 0) > 0) {
      PlayerData.addShards(data.infinityShards!);
    }
    if (isInfinityRun && (data.infinityFightsCleared ?? 0) > 0) {
      PlayerData.setInfinityBestFight(data.infinityFightsCleared!, data.hardMode ?? false);
    }

    const baseShard = (!isInvasion && !isCampaign && !isInfinityRun && !isOnline && data.playerWon) ? SHARD_REWARDS[data.difficulty - 1] : 0;
    const shardsEarned = Math.round(baseShard * (data.rewardMult ?? 1));
    if (shardsEarned > 0) {
      PlayerData.addShards(shardsEarned);
    }

    // Chance to unlock a random locked mutation on victory.
    // Mutations with unlockChance < 0.10 are "rare" and rolled independently first.
    let unlockedMutation: (typeof MUTATIONS)[number] | null = null;
    if (data.playerWon && !isInvasion && !isCampaign && !isOnline) {
      const lockedAll = MUTATIONS.filter((m) => !PlayerData.isMutationUnlocked(m.id));
      const rare = lockedAll.filter((m) => (m.unlockChance ?? 0.10) < 0.10);
      const normal = lockedAll.filter((m) => (m.unlockChance ?? 0.10) >= 0.10);
      for (const r of rare) {
        if (Math.random() < (r.unlockChance ?? 0.10)) {
          unlockedMutation = r;
          PlayerData.unlockMutation(r.id);
          break;
        }
      }
      if (!unlockedMutation && normal.length > 0 && Math.random() < 0.10) {
        unlockedMutation = normal[Math.floor(Math.random() * normal.length)];
        PlayerData.unlockMutation(unlockedMutation.id);
      }
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

    // ── Headline ────────────────────────────────────────────────────
    let title: string, subtitle: string, accent: number;
    if (isOnline && isInvasion) {
      [title, subtitle, accent] = ['TEAM DOWN', `Waves cleared together: ${data.wavesCompleted ?? 0}`, C.corrupt];
    } else if (isOnline) {
      [title, subtitle, accent] = data.playerWon
        ? ['VICTORY', data.onlineReason ?? 'You bested your rival! ⚔️', C.gold]
        : ['DEFEATED', data.onlineReason ?? 'Your rival takes this round…', C.frost];
    } else if (isInfinityRun) {
      const fightsCleared = data.infinityFightsCleared ?? 0;
      const bestFight = PlayerData.getInfinityBestFight(data.hardMode ?? false);
      const isNewBest = fightsCleared >= bestFight;
      title = 'RUN OVER';
      subtitle = `Fights cleared: ${fightsCleared}${isNewBest && fightsCleared > 0 ? '   ★ NEW BEST' : ''}`;
      accent = C.arcane;
    } else if (isInvasion) {
      [title, subtitle, accent] = ['YOU FELL', `Waves cleared: ${data.wavesCompleted ?? 0}`, C.corrupt];
    } else if (data.isGauntlet && !data.playerWon) {
      [title, subtitle, accent] = ['GAUNTLET FAILED', 'Your run has ended…', C.blood];
    } else {
      [title, subtitle, accent] = data.playerWon
        ? ['VICTORY', 'The flames triumph! 🔥', C.gold]
        : ['DEFEATED', 'Better luck next time…', C.frost];
    }

    addBackdrop(this, {
      accent,
      variant: data.playerWon ? 'rays' : 'void',
      motes: data.playerWon ? 34 : 12,
    });

    const titleY = 148;
    addTitle(this, {
      x: cx, y: titleY, text: title, accent,
      size: title.length > 10 ? 52 : 74,
      subtitle,
    });

    if (data.playerWon) this.burstSparks(cx, titleY, accent);

    // ── Rewards ledger ──────────────────────────────────────────────
    const lines: RewardLine[] = [];

    if (isInfinityRun && (data.infinityShards ?? 0) > 0) {
      lines.push({ icon: '💎', text: `+${data.infinityShards}  shards from run`, color: hex(mix(C.arcane, 0xffffff, 0.5)), big: true });
    }
    if (shardsEarned > 0) {
      const multLabel = (data.rewardMult ?? 1) > 1 ? `   ×${data.rewardMult!.toFixed(2)} bonus` : '';
      lines.push({ icon: '💎', text: `+${shardsEarned}  shards${multLabel}`, color: T.gold, big: true });
    }
    if (sparksEarned > 0) {
      lines.push({ icon: '⚡', text: `+${sparksEarned}  Spark`, color: '#7cf5d8' });
    }
    if (keysEarned > 0) {
      lines.push({ icon: '🗝️', text: `+${keysEarned}  Key`, color: T.gold });
    }
    if (isInvasion && (data.corruptShardsEarned ?? 0) > 0) {
      lines.push({ icon: '🩸', text: `+${data.corruptShardsEarned}  Corrupt Shards`, color: hex(mix(C.corrupt, 0xffffff, 0.4)) });
    }
    if (unlockedMutation) {
      lines.push({
        icon: unlockedMutation.emoji,
        text: `New mutation discovered — ${unlockedMutation.name}`,
        color: hex(mix(C.gold, 0xffffff, 0.3)),
      });
    }

    const btnY = height - 96;

    if (lines.length > 0) {
      const rowH = 30;
      const panelH = 44 + lines.length * rowH;
      const panelY = titleY + 118 + panelH / 2;
      const panel = addPanel(this, {
        x: cx, y: panelY, w: 470, h: panelH,
        accent, title: 'SPOILS', glow: 0.3,
      });

      lines.forEach((line, i) => {
        const ly = panel.contentTop + 22 + i * rowH;
        this.add.text(cx - 190, ly, line.icon, { fontSize: line.big ? '20px' : '16px' })
          .setOrigin(0.5).setDepth(DEPTH.content);
        this.add.text(cx - 168, ly, line.text, {
          fontSize: line.big ? '17px' : '14px',
          fontFamily: line.big ? FONT_DISPLAY : FONT_UI,
          color: line.color,
          letterSpacing: 0.5,
        }).setOrigin(0, 0.5).setDepth(DEPTH.content);

        // Ledger rule between rows.
        if (i < lines.length - 1) {
          const g = this.add.graphics().setDepth(DEPTH.content - 1);
          g.lineStyle(1, accent, 0.14);
          g.beginPath(); g.moveTo(cx - 200, ly + rowH / 2); g.lineTo(cx + 200, ly + rowH / 2); g.strokePath();
        }
      });
    } else {
      this.add.text(cx, titleY + 150, 'No spoils this time.', {
        fontSize: '14px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    }

    // ── Continue ────────────────────────────────────────────────────
    const goBack = () => {
      if (isOnline) {
        this.scene.start('OnlineLobbyScene');
      } else if (data.campaign) {
        this.scene.start('CampaignWorldScene', {
          worldId: data.campaign!.worldId,
          slotIdx: data.campaign!.slot,
        });
      } else {
        this.scene.start('TitleScene');
      }
    };

    const btnLabel = isOnline ? 'BACK TO LOBBY' : data.campaign ? 'BACK TO WORLD' : 'PLAY AGAIN';
    addButton(this, {
      x: cx, y: btnY, w: 280, h: 60,
      label: btnLabel, icon: '▶', variant: 'solid', accent, fontSize: 20,
      onClick: goBack,
    }).pulse();

    this.add.text(cx, btnY + 44, 'ESC', {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.input.keyboard!.on('keydown-ESC', goBack);
  }

  /** Diamond shards flung outward from the headline on a win. */
  private burstSparks(cx: number, cy: number, accent: number): void {
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.2;
      const g = this.add.graphics().setDepth(DEPTH.content - 1);
      fillDiamond(g, 0, 0, Phaser.Math.FloatBetween(2.5, 5), mix(accent, 0xffffff, Math.random() * 0.6), 1);
      g.setPosition(cx, cy);
      const dist = Phaser.Math.Between(150, 380);
      this.tweens.add({
        targets: g,
        x: cx + Math.cos(a) * dist,
        y: cy + Math.sin(a) * dist * 0.65,
        alpha: 0,
        scaleX: 0.3, scaleY: 0.3,
        duration: Phaser.Math.Between(700, 1500),
        ease: 'Cubic.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }
}
