import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as CP from '../data/CampaignProgress';
import { SHARD_REWARDS } from '../data/Upgrades';
import { MUTATIONS } from '../data/Mutations';
import { getCampaignReward, getCampaignFightDef } from '../data/CampaignFights';
import { getAnyWorld } from '../data/AbstractWorlds';
import { currentBountySeed } from '../data/Bounties';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addPanel, addTitle, fillDiamond,
} from '../ui';
import { Sfx } from '../audio';

type CampaignPayload = {
  slot: 0 | 1 | 2; worldId: string; fightId: string; isChallenge: boolean; hardMode?: boolean;
};

/** One line in the rewards ledger. */
type RewardLine = { icon: string; text: string; color: string; big?: boolean };

/** Killing the Disgraced King. The first clear is the one that pays properly. */
const BOSS_FIRST_CLEAR_SHARDS = 400;
const BOSS_REPEAT_SHARDS = 150;
/** And the thing behind him, which is the end of the game. */
const DEVOURER_FIRST_CLEAR_SHARDS = 1200;
const DEVOURER_REPEAT_SHARDS = 450;

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
    bounty?: { key: string; reward: number };
    isInfinityRun?: boolean;
    infinityFightsCleared?: number;
    infinityShards?: number;
    curseShardMult?: number;
    gauntletElement?: string;
    hardMode?: boolean;
    online?: boolean;
    onlineReason?: string;
    bossHard?: boolean;
    devourerChoice?: 'spare' | 'kill';
  }): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // No music here on purpose: ArenaScene's victory/defeat sting is still
    // ringing out, and a track starting under it would step on the moment.
    // The reward chime below lands into that silence.
    if (data.playerWon) this.time.delayedCall(900, () => Sfx.play('reward-big'));

    const isInvasion = data.mode === 'invasion';
    const isBoss = data.mode === 'boss';
    const isCampaign = !!data.campaign;
    const isInfinityRun = !!data.isInfinityRun;
    const isOnline = !!data.online;

    // ── The Disgraced King ──────────────────────────────────────────
    // The first kill is what opens his laboratory; every kill after that pays
    // in shards, so the door stays worth walking through.
    const isDevourer = isBoss && !!data.bossHard;
    let labUnlocked = false;
    let bossShards = 0;
    let devourerFirstClear = false;
    if (isBoss && data.playerWon) {
      labUnlocked = PlayerData.markKingDefeated();
      if (isDevourer) {
        // The element itself was already granted by the kit the moment the
        // player chose — this only records the clear and pays the shards.
        devourerFirstClear = PlayerData.markDevourerDefeated(data.devourerChoice ?? 'kill');
        bossShards = devourerFirstClear ? DEVOURER_FIRST_CLEAR_SHARDS : DEVOURER_REPEAT_SHARDS;
      } else {
        bossShards = labUnlocked ? BOSS_FIRST_CLEAR_SHARDS : BOSS_REPEAT_SHARDS;
      }
      PlayerData.addShards(bossShards);
    }

    // ── Bounty payout ───────────────────────────────────────────────
    // Marked against the live board's seed, so a contract cashed on an expired
    // board leaves nothing behind and cannot be claimed twice on this one.
    let divineEarned = 0;
    if (data.bounty && data.playerWon && !PlayerData.isBountyCompleted(data.bounty.key)) {
      divineEarned = data.bounty.reward;
      PlayerData.addDivineNuclei(divineEarned);
      PlayerData.markBountyCompleted(data.bounty.key, currentBountySeed());
    }

    // Infinity run: award shards on loss and update best-fight record
    if (isInfinityRun && (data.infinityShards ?? 0) > 0) {
      PlayerData.addShards(data.infinityShards!);
    }
    if (isInfinityRun && (data.infinityFightsCleared ?? 0) > 0) {
      PlayerData.setInfinityBestFight(data.infinityFightsCleared!, data.hardMode ?? false);
    }

    const baseShard = (!isInvasion && !isBoss && !isCampaign && !isInfinityRun && !isOnline && data.playerWon) ? SHARD_REWARDS[data.difficulty - 1] : 0;
    const shardsEarned = Math.round(baseShard * (data.rewardMult ?? 1));
    if (shardsEarned > 0) {
      PlayerData.addShards(shardsEarned);
    }

    // Chance to unlock a random locked mutation on victory.
    // Mutations with unlockChance < 0.10 are "rare" and rolled independently first.
    let unlockedMutation: (typeof MUTATIONS)[number] | null = null;
    if (data.playerWon && !isInvasion && !isBoss && !isCampaign && !isOnline) {
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

    // Mark campaign progress on win and award currencies. The payout is the same
    // figure the fight briefing promised — both sides call getCampaignReward().
    let keysEarned = 0;
    let sparksEarned = 0;
    let campaignHardMode = false;
    // Worlds opened by this win — the five fights are the gate, not the challenge.
    let worldsOpened: string[] = [];
    if (isCampaign && data.playerWon && data.campaign) {
      const c = data.campaign;
      campaignHardMode = !!c.hardMode;
      const reward = getCampaignReward(c.worldId, c.fightId, c.isChallenge, campaignHardMode);
      if (c.isChallenge) {
        CP.markChallengeCompleted(c.slot, c.worldId);
      } else {
        const wasAlreadyWon = CP.isFightCompleted(c.slot, c.worldId, c.fightId);
        CP.markFightCompleted(c.slot, c.worldId, c.fightId);
        if (!wasAlreadyWon && CP.areFightsCleared(c.slot, c.worldId)) {
          worldsOpened = CP.getUnlockedChildWorlds(c.slot, c.worldId)
            .flatMap((id) => { const w = getAnyWorld(id); return w ? [w.name] : []; });
        }
      }
      if (reward.keys > 0) {
        CP.addKeys(c.slot, reward.keys);
        keysEarned = reward.keys;
      }
      CP.addSparks(c.slot, reward.sparks);
      sparksEarned = reward.sparks;
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
    } else if (isDevourer) {
      [title, subtitle, accent] = data.playerWon
        ? data.devourerChoice === 'spare'
          ? ['YOU LET IT LIVE', 'It closed its eyes, and gave you what it was dreaming.', 0x9fb8ff]
          : ['THE DEVOURER IS DEAD', 'Every king it ate is accounted for.', 0xf0d68a]
        : ['IT IS STILL HUNGRY', 'The hole under the door has not moved.', C.blood];
    } else if (isBoss) {
      [title, subtitle, accent] = data.playerWon
        ? ['THE KING IS DEAD', 'The crown is spent. The hall is quiet.', C.corrupt]
        : ['THE KING REMAINS', 'The door is still open. Go back.', C.corrupt];
    } else if (data.isGauntlet && !data.playerWon) {
      [title, subtitle, accent] = ['GAUNTLET FAILED', 'Your run has ended…', C.blood];
    } else if (isCampaign && data.campaign) {
      // Campaign results name the bout that was won or lost, so a run reads as a story.
      const boutName = getCampaignFightDef(data.campaign.fightId)?.name;
      const hardTag = data.campaign.hardMode ? '  ·  HARD MODE' : '';
      [title, subtitle, accent] = data.playerWon
        ? ['VICTORY', boutName ? `${boutName} cleared${hardTag}` : 'The world bends a little further.', C.gold]
        : ['DEFEATED', boutName ? `${boutName} holds${hardTag}` : 'The world holds. Try again.', C.frost];
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
      const hardLabel = campaignHardMode ? '   ×1.75 HARD MODE' : '';
      lines.push({ icon: '⚡', text: `+${sparksEarned}  Sparks${hardLabel}`, color: '#7cf5d8', big: true });
    }
    if (keysEarned > 0) {
      lines.push({ icon: '🗝️', text: `+${keysEarned}  Key${keysEarned === 1 ? '' : 's'}`, color: T.gold });
    }
    if (isInvasion && (data.corruptShardsEarned ?? 0) > 0) {
      lines.push({ icon: '🩸', text: `+${data.corruptShardsEarned}  Corrupt Shards`, color: hex(mix(C.corrupt, 0xffffff, 0.4)) });
    }
    if (bossShards > 0) {
      lines.push({ icon: '💎', text: `+${bossShards}  shards`, color: T.gold, big: true });
    }
    if (labUnlocked) {
      lines.push({
        icon: '⚰',
        text: 'DISGRACED LABORATORY UNLOCKED — press SPACE in the Lab',
        color: hex(mix(C.corrupt, 0xffffff, 0.5)),
        big: true,
      });
    }
    if (isDevourer && data.playerWon && data.devourerChoice) {
      const spared = data.devourerChoice === 'spare';
      lines.push({
        icon: spared ? '🌙' : '⚖️',
        text: `${spared ? 'DREAM' : 'JUSTICE'} UNLOCKED — a new element, ${spared ? 'from what it was dreaming' : 'from what it owed'}`,
        color: spared ? '#9fb8ff' : '#f0d68a',
        big: true,
      });
      lines.push({
        icon: '🔒',
        text: 'Its abilities are not built yet — the element is yours, the kit comes later.',
        color: T.faint,
      });
      if (devourerFirstClear) {
        lines.push({
          icon: '☠',
          text: 'THE DEVOURER OF KINGS — first clear',
          color: hex(mix(C.blood, 0xffffff, 0.45)),
          big: true,
        });
      }
    }
    if (divineEarned > 0) {
      lines.push({
        icon: '💠',
        text: `+${divineEarned}  Divine Nucle${divineEarned === 1 ? 'us' : 'i'} — bounty claimed`,
        color: hex(mix(C.corrupt, 0xffffff, 0.55)),
        big: true,
      });
    }
    if (worldsOpened.length > 0) {
      lines.push({
        icon: '🗺️',
        text: `World${worldsOpened.length === 1 ? '' : 's'} opened — ${worldsOpened.join(', ')}`,
        color: hex(mix(C.gold, 0xffffff, 0.3)),
      });
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
      } else if (isBoss) {
        // Back to the door itself — 999 clamps to the last shop page.
        this.scene.start('ShopScene', { page: 999 });
      } else if (data.bounty) {
        this.scene.start('DisgracedLabScene', { tab: 1 });
      } else if (data.campaign) {
        this.scene.start('CampaignWorldScene', {
          worldId: data.campaign!.worldId,
          slotIdx: data.campaign!.slot,
        });
      } else {
        this.scene.start('TitleScene');
      }
    };

    // A lost campaign bout offers a one-click rematch — walking back through the
    // world map to retry the fight you just lost is pure friction.
    // Only scripted bouts can be retried in place — invasion and gauntlet runs are
    // re-entered from their own nodes.
    const canRetry = isCampaign && !data.playerWon && !!data.campaign && !data.isGauntlet && !isInvasion;
    const retry = () => {
      const c = data.campaign!;
      this.scene.start('CampaignFightMenuScene', {
        worldId: c.worldId,
        nodeId: c.fightId,
        isChallenge: c.isChallenge,
        kind: c.isChallenge ? 'challenge' : 'fight',
        slotIdx: c.slot,
        hardMode: !!c.hardMode,
      });
    };

    const btnLabel = isOnline ? 'BACK TO LOBBY'
      : isBoss ? 'BACK TO THE DOOR'
      : data.bounty ? 'BACK TO CONTRACTS'
      : data.campaign ? 'BACK TO WORLD'
      : 'PLAY AGAIN';
    const mainBtn = addButton(this, {
      x: canRetry ? cx - 150 : cx, y: btnY, w: canRetry ? 260 : 280, h: 60,
      label: btnLabel, icon: '▶', variant: canRetry ? 'ghost' : 'solid', accent, fontSize: canRetry ? 17 : 20,
      onClick: goBack,
    });
    if (!canRetry) mainBtn.pulse();

    if (canRetry) {
      addButton(this, {
        x: cx + 150, y: btnY, w: 260, h: 60,
        label: 'RETRY', icon: '⟳', variant: 'solid', accent: C.blood, fontSize: 20,
        onClick: retry,
      }).pulse();
    }

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
