import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import {
  getCampaignFightDef, getCampaignReward, getWorldTier, isAbstractWorld, isCorruptWorld,
  DIFFICULTY_LABEL, ELEMENT_DISPLAY, CAMPAIGN_MAX_DIFFICULTY,
} from '../data/CampaignFights';
import { getEffectiveFightDef, hasHardRemix } from '../data/CampaignFightsHard';
import { MUTATIONS, getMutationDef } from '../data/Mutations';
import { getWorldBossDef } from '../boss/bosses';
import type { WorldBossDef } from '../boss/framework/BossDefs';
import { describeFormat } from '../data/FightFormats';
import { getWorldGimmick } from '../data/WorldGimmicks';
import { maybePlayStory } from './DialogueScene';
import { consumedItemIds, getItem } from '../data/Items';
import { armedArtifactIds, getArtifact } from '../data/Artifacts';
import * as CP from '../data/CampaignProgress';
import { drawCampaignBackground } from './CampaignBackground';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBadge, addButton, addModal, addToggle, addWell, fillDiamond,
} from '../ui';
import { Music } from '../audio';

const PANEL_W = 620;
const PANEL_H = 572;

/**
 * The briefing for a single campaign bout.
 *
 * Everything the player needs to commit is on this one card: who they are fighting and
 * how hard, which mutations are in play and what each one actually does, what the win
 * pays, and which shop items they have already armed. Hard Mode is a real modifier —
 * it raises the difficulty a step, stars every regular mutation, and pays accordingly.
 */
export class CampaignFightMenuScene extends Phaser.Scene {
  private worldId = 'fire';
  private nodeId = 'fire-fight-1';
  private isChallenge = false;
  private kind = 'fight';
  private slotIdx: 0 | 1 | 2 = 0;
  private hardMode = false;
  /** Set when this world's challenge node has a Sovereign — the briefing becomes a boss card. */
  private bossDef: WorldBossDef | undefined;

  // ── Labels re-painted whenever Hard Mode flips ────────────────────
  private rewardText: Phaser.GameObjects.Text | null = null;
  private difficultyText: Phaser.GameObjects.Text | null = null;
  private modeNoteText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'CampaignFightMenuScene' });
  }

  init(data: {
    worldId: string; nodeId: string; isChallenge: boolean; kind?: string;
    slotIdx: 0 | 1 | 2; hardMode?: boolean;
  }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.nodeId = data?.nodeId ?? 'fire-fight-1';
    this.isChallenge = data?.isChallenge ?? false;
    this.kind = data?.kind ?? (this.isChallenge ? 'challenge' : 'fight');
    this.slotIdx = data?.slotIdx ?? 0;
    // Preserved when the player backs out of element select, so the toggle
    // doesn't silently reset on the way to picking again.
    this.hardMode = data?.hardMode ?? false;
  }

  /**
   * Difficulty actually used, once Hard Mode is folded in. A Second Telling
   * remix carries its own difficulty; only un-remixed nodes get the +1 bump.
   * Either way the campaign's Expert ceiling holds.
   */
  private get effectiveDifficulty(): number {
    const base = getEffectiveFightDef(this.nodeId, this.hardMode)?.difficulty
      ?? (this.kind === 'fight' ? 1 : 2);
    return this.hardMode && !hasHardRemix(this.nodeId)
      ? Math.min(CAMPAIGN_MAX_DIFFICULTY, base + 1)
      : base;
  }

  /** Mirrors CampaignElementSelectScene.invasionDifficultyId() for the briefing. */
  private invasionIntensityLabel(): string {
    if (this.hardMode) return 'Masochistic';
    if (getWorldTier(this.worldId) >= 2 || isAbstractWorld(this.worldId) || isCorruptWorld(this.worldId)) return 'Brutal';
    return 'Normal';
  }

  create(): void {
    Music.play('campaign');
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = getAnyWorld(this.worldId);

    // Standalone (arrived via RETRY) there is no world scene behind the scrim — paint
    // the world's own backdrop so the briefing still sits somewhere.
    if (!this.scene.isPaused('CampaignWorldScene')) {
      drawCampaignBackground(this, this.worldId, width, height).setDepth(DEPTH.backdrop);
    }
    const def = getEffectiveFightDef(this.nodeId, this.hardMode);
    this.bossDef = this.kind === 'challenge' ? getWorldBossDef(this.worldId) : undefined;
    const cleared = this.isChallenge
      ? CP.isChallengeCompleted(this.slotIdx, this.worldId)
      : CP.isFightCompleted(this.slotIdx, this.worldId, this.nodeId);

    const accent =
      this.kind === 'invasion' ? C.ember :
      this.kind === 'gauntlet' ? C.frost :
      this.kind === 'challenge' ? C.corrupt :
      (world?.color ?? C.arcane);

    const fightNum = this.nodeId.includes('fight-') ? this.nodeId.split('fight-')[1] : null;
    const stageLabel =
      this.kind === 'invasion'  ? '👾  INVASION' :
      this.kind === 'gauntlet'  ? '🏆  GAUNTLET' :
      this.kind === 'challenge' ? (this.bossDef ? '👑  WORLD BOSS' : `${world?.emoji ?? '⚔️'}  CHALLENGE`) :
      `${world?.emoji ?? '⚔️'}  FIGHT ${fightNum ?? '?'}`;

    // The bespoke bout name is the headline; the stage number becomes the kicker.
    const title = this.bossDef ? this.bossDef.name.toUpperCase()
      : def?.name ? def.name.toUpperCase() : stageLabel;
    const subtitle = this.bossDef
      ? `${stageLabel}   ·   ${this.bossDef.title.toUpperCase()}${cleared ? '   ·   ✓ CLEARED' : ''}`
      : def?.name
        ? `${stageLabel}   ·   ${(world?.name ?? '').toUpperCase()} WORLD${cleared ? '   ·   ✓ CLEARED' : ''}`
        : (world ? `${world.name.toUpperCase()} WORLD` : undefined);

    const panel = addModal(this, {
      w: PANEL_W, h: PANEL_H, accent, title, subtitle, glow: 0.5,
    });

    let y = panel.contentTop + 24;

    // ── Taunt ───────────────────────────────────────────────────────
    const taunt = this.bossDef?.intro[0] ?? def?.taunt;
    if (taunt) {
      this.add.text(cx, y, `“${taunt}”`, {
        fontSize: '13px', fontFamily: FONT_UI, fontStyle: 'italic',
        color: hex(mix(accent, 0xffffff, 0.6)),
        wordWrap: { width: PANEL_W - 90 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent);
      y += 34;
    }

    // ── Opponent / difficulty ───────────────────────────────────────
    const briefH = def ? 78 : 56;
    y += briefH / 2;
    addWell(this, cx, y, PANEL_W - 72, briefH, accent, DEPTH.modal + 1, 8);

    if (def) {
      const elem = ELEMENT_DISPLAY[def.enemyElementId];
      const enemyStr = this.bossDef
        ? `👑  ${this.bossDef.name}`
        : elem ? `${elem.emoji}  ${elem.name}` : def.enemyElementId;
      const statY = y - 14;
      const inner = PANEL_W / 2 - 54;

      this.add.text(cx - inner, statY - 10, 'OPPONENT', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(cx - inner, statY + 11, enemyStr, {
        fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 0.5,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

      this.add.text(cx + inner, statY - 10, 'DIFFICULTY', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
      this.difficultyText = this.add.text(cx + inner, statY + 11, '', {
        fontSize: '16px', fontFamily: FONT_DISPLAY, letterSpacing: 1,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);

      const divider = this.add.graphics().setDepth(DEPTH.modal + 2);
      divider.lineStyle(1, accent, 0.2);
      divider.beginPath(); divider.moveTo(cx - inner, y + 8); divider.lineTo(cx + inner, y + 8); divider.strokePath();
      fillDiamond(divider, cx, y + 8, 3, accent, 0.5);

      // Sovereign duels have no mutations — the badges read out the phases instead.
      const active = this.bossDef ? [] : MUTATIONS.filter((m) => def.mutations?.includes(m.id));
      if (this.bossDef) {
        this.add.text(cx - inner, y + 26, 'PHASES', {
          fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
        }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
        let bx = cx - inner + 86;
        const phaseNames = this.bossDef.phases.map((p) => p.name);
        if (this.bossDef.hard?.extraPhase) phaseNames.push(`☠ ${this.bossDef.hard.extraPhase.name}`);
        phaseNames.forEach((name, i) => {
          const hardOnly = name.startsWith('☠');
          const badge = addBadge(this, {
            x: bx, y: y + 26,
            text: `${i + 1}. ${name.replace('☠ ', '')}${hardOnly ? ' (Hard)' : ''}`,
            accent: hardOnly ? C.blood : C.corrupt,
            depth: DEPTH.modalContent,
            glow: hardOnly,
          });
          badge.setX(bx + badge.width / 2);
          bx += badge.width + 8;
        });
      } else if (active.length > 0) {
        this.add.text(cx - inner, y + 26, 'MUTATIONS', {
          fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
        }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

        let bx = cx - inner + 86;
        for (const m of active) {
          const starred = def.starredMutations?.includes(m.id);
          const badge = addBadge(this, {
            x: bx, y: y + 26,
            text: `${starred ? '★ ' : ''}${m.emoji} ${m.name}${m.bossOnly ? ' ⓑ' : ''}`,
            accent: starred ? C.gold : (m.bossOnly ? C.corrupt : C.steel),
            depth: DEPTH.modalContent,
            glow: starred || !!m.bossOnly,
          });
          // Badges pack left-to-right; nudge the cursor by the one just placed.
          badge.setX(bx + badge.width / 2);
          bx += badge.width + 8;
        }
      } else {
        this.add.text(cx, y + 26, 'NO MUTATIONS', {
          fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.modalContent);
      }
      y += briefH / 2 + 12;
    } else {
      const blurb = this.kind === 'gauntlet'
        ? 'A randomised run — five bouts and a boss, back to back, no healing between them.'
        : 'Endless husk waves. Every tenth wave brings a boss. Pays 🩸 Corrupt Shards, not Sparks.';
      this.add.text(cx, y - 8, blurb, {
        fontSize: '12.5px', fontFamily: FONT_UI, color: T.dim,
        wordWrap: { width: PANEL_W - 110 }, align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);
      this.modeNoteText = this.add.text(cx, y + 20, '', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);
      y += briefH / 2 + 12;
    }

    // ── What each mutation does ─────────────────────────────────────
    if (this.bossDef) {
      const line = this.add.text(cx - PANEL_W / 2 + 40, y,
        '👑  A choreographed duel. Every attack is telegraphed — learn the cycle, and mind the harassment underneath it.', {
          fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
          wordWrap: { width: PANEL_W - 80 },
        }).setOrigin(0, 0).setDepth(DEPTH.modalContent);
      y += line.height + 9;
    } else if (def?.mutations?.length) {
      for (const id of def.mutations) {
        const m = getMutationDef(id);
        if (!m) continue;
        const starred = def.starredMutations?.includes(id);
        const line = this.add.text(cx - PANEL_W / 2 + 40, y, `${m.emoji}  ${m.shortDesc}`, {
          fontSize: '11px', fontFamily: FONT_UI,
          color: starred ? T.gold : T.dim,
          wordWrap: { width: PANEL_W - 80 },
        }).setOrigin(0, 0).setDepth(DEPTH.modalContent);
        y += line.height + 5;
      }
      y += 4;
    }

    // ── Fight format + the world's standing rule ────────────────────
    if (def?.format) {
      const line = this.add.text(cx - PANEL_W / 2 + 40, y, describeFormat(def.format), {
        fontSize: '11px', fontFamily: FONT_UI, color: T.gold,
        wordWrap: { width: PANEL_W - 80 },
      }).setOrigin(0, 0).setDepth(DEPTH.modalContent);
      y += line.height + 6;
    }
    const gimmick = getWorldGimmick(this.worldId);
    if (gimmick && this.kind !== 'invasion' && this.kind !== 'gauntlet') {
      const line = this.add.text(cx - PANEL_W / 2 + 40, y,
        `⚖ ${gimmick.name.toUpperCase()} — ${gimmick.blurb}`, {
          fontSize: '10.5px', fontFamily: FONT_UI, color: T.dim,
          wordWrap: { width: PANEL_W - 80 },
        }).setOrigin(0, 0).setDepth(DEPTH.modalContent);
      y += line.height + 8;
    }

    // ── Armed items + artifacts ─────────────────────────────────────
    // One line, both lists: what is riding on this fight is one fact, however it was armed.
    const armed = [
      ...[...consumedItemIds].map((id) => getItem(id)).filter(Boolean)
        .map((d) => `${d!.emoji} ${d!.name}`),
      ...[...armedArtifactIds].map((id) => getArtifact(id)).filter(Boolean)
        .map((a) => `✦ ${a!.emoji} ${a!.name}`),
    ];
    this.add.text(cx - PANEL_W / 2 + 40, y, 'ARMED', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
    this.add.text(cx - PANEL_W / 2 + 132, y,
      armed.length > 0
        ? armed.join('   ')
        : 'none — open the 🎒 bag to use an item or arm an artifact before you start', {
        fontSize: '11px', fontFamily: FONT_UI,
        color: armed.length > 0 ? T.good : T.ghost,
        wordWrap: { width: PANEL_W - 180 },
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
    y += 26;

    // ── Payout ──────────────────────────────────────────────────────
    // Only scripted bouts pay a fixed purse; invasion and gauntlet runs settle up
    // in their own currencies, so promising Sparks here would be a lie.
    if (def) {
      addWell(this, cx, y + 14, PANEL_W - 72, 34, C.gold, DEPTH.modal + 1, 6);
      this.add.text(cx - PANEL_W / 2 + 40, y + 14, 'VICTORY PAYS', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.rewardText = this.add.text(cx + PANEL_W / 2 - 40, y + 14, '', {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 0.5,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
      y += 46;
    }

    // ── Hard mode ───────────────────────────────────────────────────
    const hardNote =
      this.kind === 'invasion' ? 'sends the nastiest husk mix from the first wave'
      : this.kind === 'gauntlet' ? 'seven bouts instead of six, every mutation starred'
      : this.bossDef ? '+35% health  ·  faster cycles  ·  no heals  ·  an extra phase  ·  ×1.75 Sparks'
      : '+1 difficulty  ·  every regular mutation starred  ·  ×1.75 Sparks';
    addToggle(this, {
      x: cx + 34, y: y + 8, value: this.hardMode, accent: C.blood,
      label: '🔥 HARD MODE', depth: DEPTH.modalContent,
      onChange: (v) => {
        this.hardMode = v;
        // A Second Telling remix changes the whole card — opponent, name,
        // mutations — so the briefing has to be rebuilt, not repainted.
        if (hasHardRemix(this.nodeId)) {
          this.scene.restart({
            worldId: this.worldId, nodeId: this.nodeId, isChallenge: this.isChallenge,
            kind: this.kind, slotIdx: this.slotIdx, hardMode: v,
          });
          return;
        }
        this.refreshDerived();
      },
    });
    this.add.text(cx, y + 32, hardNote, {
      fontSize: '9.5px', fontFamily: FONT_UI, color: T.faint,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    // ── Actions ─────────────────────────────────────────────────────
    addButton(this, {
      x: cx, y: panel.bottom - 92, w: 250, h: 56,
      label: 'START', icon: '⚔', accent: C.verdant, variant: 'solid', fontSize: 21,
      depth: DEPTH.modalContent,
      onClick: () => this.startFight(),
    }).pulse();

    addButton(this, {
      x: cx, y: panel.bottom - 40, w: 160, h: 32,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 12,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.add.text(cx, panel.bottom - 18, 'ESC to cancel', {
      fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    this.input.keyboard!.on('keydown-ESC', () => this.close());

    this.refreshDerived();

    // First look at a Sovereign: the boss speaks before the briefing is read.
    if (this.bossDef) maybePlayStory(this, this.slotIdx, `boss-pre:${this.worldId}`);
  }

  /** Repaint the two labels Hard Mode changes. */
  private refreshDerived(): void {
    const d = this.effectiveDifficulty;
    if (this.difficultyText?.active) {
      this.difficultyText
        .setText(this.bossDef
          ? (this.hardMode ? '☠ SOVEREIGN' : 'SOVEREIGN')
          : (DIFFICULTY_LABEL[d] ?? String(d)).toUpperCase())
        .setColor(this.hardMode ? hex(mix(C.blood, 0xffffff, 0.4)) : T.bright);
    }
    if (this.rewardText?.active) {
      const r = getCampaignReward(this.worldId, this.nodeId, this.isChallenge, this.hardMode);
      const parts = [`⚡ ${r.sparks} Sparks`];
      if (r.keys > 0) parts.push(`🗝️ ${r.keys} Key${r.keys === 1 ? '' : 's'}`);
      this.rewardText.setText(parts.join('     '));
    }
    if (this.modeNoteText?.active) {
      this.modeNoteText.setText(this.kind === 'gauntlet'
        ? `RUN LENGTH  ·  ${this.hardMode ? 'SEVEN BOUTS' : 'SIX BOUTS'}`
        : `HUSK INTENSITY  ·  ${this.invasionIntensityLabel().toUpperCase()}`);
    }
  }

  private startFight(): void {
    const world = getAnyWorld(this.worldId);
    const def = getEffectiveFightDef(this.nodeId, this.hardMode);
    const enemyElementId = def?.enemyElementId ?? world?.parentId ?? world?.id ?? 'fire';
    const mutations = def?.mutations ?? [];

    // A Second Telling remix authors its own stars. On un-remixed nodes Hard
    // Mode stars every *regular* mutation; boss mutations are deliberately left
    // alone — they ship with no starred variant, so starring one changes nothing
    // but would misreport the fight in the briefing.
    const starredMutations = this.hardMode && hasHardRemix(this.nodeId)
      ? (def?.starredMutations ?? [])
      : this.hardMode
        ? mutations.filter((id) => !getMutationDef(id)?.bossOnly)
        : (def?.starredMutations ?? []);

    this.scene.start('CampaignElementSelectScene', {
      worldId: this.worldId,
      nodeId: this.nodeId,
      isChallenge: this.isChallenge,
      kind: this.kind,
      slotIdx: this.slotIdx,
      hardMode: this.hardMode,
      enemyElementId,
      difficulty: this.effectiveDifficulty,
      mutations,
      starredMutations,
    });
  }

  /**
   * Normally this scene is *launched* over a paused CampaignWorldScene, so closing means
   * resuming it. Reached via the results screen's RETRY it runs standalone — the world
   * scene was stopped when the match began — so there is nothing to resume and it has to
   * be started fresh instead.
   */
  private close(): void {
    // The Amalgam has no world scene behind it — it is opened straight off the
    // corrupt map, so that is where backing out belongs.
    if (this.worldId === 'amalgam') {
      this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: 'corrupt' });
      return;
    }
    if (this.scene.isPaused('CampaignWorldScene')) {
      this.scene.stop();
      this.scene.resume('CampaignWorldScene');
    } else {
      this.scene.start('CampaignWorldScene', { worldId: this.worldId, slotIdx: this.slotIdx });
    }
  }
}
