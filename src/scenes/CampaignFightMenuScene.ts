import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import {
  getCampaignFightDef, getCampaignReward, getWorldTier, isAbstractWorld,
  DIFFICULTY_LABEL, ELEMENT_DISPLAY,
} from '../data/CampaignFights';
import { MUTATIONS, getMutationDef } from '../data/Mutations';
import { consumedItemIds, getItem } from '../data/Items';
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

  /** Difficulty actually used, once Hard Mode is folded in. */
  private get effectiveDifficulty(): number {
    const base = getCampaignFightDef(this.nodeId)?.difficulty ?? (this.kind === 'fight' ? 1 : 2);
    return this.hardMode ? Math.min(5, base + 1) : base;
  }

  /** Mirrors CampaignElementSelectScene.invasionDifficultyId() for the briefing. */
  private invasionIntensityLabel(): string {
    if (this.hardMode) return 'Masochistic';
    if (getWorldTier(this.worldId) >= 2 || isAbstractWorld(this.worldId)) return 'Brutal';
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
    const def = getCampaignFightDef(this.nodeId);
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
      this.kind === 'challenge' ? `${world?.emoji ?? '⚔️'}  CHALLENGE` :
      `${world?.emoji ?? '⚔️'}  FIGHT ${fightNum ?? '?'}`;

    // The bespoke bout name is the headline; the stage number becomes the kicker.
    const title = def?.name ? def.name.toUpperCase() : stageLabel;
    const subtitle = def?.name
      ? `${stageLabel}   ·   ${(world?.name ?? '').toUpperCase()} WORLD${cleared ? '   ·   ✓ CLEARED' : ''}`
      : (world ? `${world.name.toUpperCase()} WORLD` : undefined);

    const panel = addModal(this, {
      w: PANEL_W, h: PANEL_H, accent, title, subtitle, glow: 0.5,
    });

    let y = panel.contentTop + 24;

    // ── Taunt ───────────────────────────────────────────────────────
    if (def?.taunt) {
      this.add.text(cx, y, `“${def.taunt}”`, {
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
      const enemyStr = elem ? `${elem.emoji}  ${elem.name}` : def.enemyElementId;
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

      // Mutation badges — starred ones flagged in gold.
      const active = MUTATIONS.filter((m) => def.mutations?.includes(m.id));
      if (active.length > 0) {
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
    if (def?.mutations?.length) {
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

    // ── Armed items ─────────────────────────────────────────────────
    const armed = [...consumedItemIds].map((id) => getItem(id)).filter(Boolean);
    this.add.text(cx - PANEL_W / 2 + 40, y, 'ARMED ITEMS', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
    this.add.text(cx - PANEL_W / 2 + 132, y,
      armed.length > 0
        ? armed.map((d) => `${d!.emoji} ${d!.name}`).join('   ')
        : 'none — open the 🎒 bag to use one before you start', {
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
      : '+1 difficulty  ·  every regular mutation starred  ·  ×1.75 Sparks';
    addToggle(this, {
      x: cx + 34, y: y + 8, value: this.hardMode, accent: C.blood,
      label: '🔥 HARD MODE', depth: DEPTH.modalContent,
      onChange: (v) => { this.hardMode = v; this.refreshDerived(); },
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
  }

  /** Repaint the two labels Hard Mode changes. */
  private refreshDerived(): void {
    const d = this.effectiveDifficulty;
    if (this.difficultyText?.active) {
      this.difficultyText
        .setText((DIFFICULTY_LABEL[d] ?? String(d)).toUpperCase())
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
    const def = getCampaignFightDef(this.nodeId);
    const enemyElementId = def?.enemyElementId ?? world?.parentId ?? world?.id ?? 'fire';
    const mutations = def?.mutations ?? [];

    // Hard Mode stars every *regular* mutation. Boss mutations are deliberately left
    // alone — they ship with no starred variant, so starring one changes nothing but
    // would misreport the fight in the briefing.
    const starredMutations = this.hardMode
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
    if (this.scene.isPaused('CampaignWorldScene')) {
      this.scene.stop();
      this.scene.resume('CampaignWorldScene');
    } else {
      this.scene.start('CampaignWorldScene', { worldId: this.worldId, slotIdx: this.slotIdx });
    }
  }
}
