import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import { getCampaignFightDef, DIFFICULTY_LABEL, ELEMENT_DISPLAY } from '../data/CampaignFights';
import { MUTATIONS } from '../data/Mutations';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBadge, addButton, addModal, addToggle, addWell, fillDiamond,
} from '../ui';

export class CampaignFightMenuScene extends Phaser.Scene {
  private worldId = 'fire';
  private nodeId = 'fire-fight-1';
  private isChallenge = false;
  private kind = 'fight';
  private slotIdx: 0 | 1 | 2 = 0;
  private hardMode = false;

  constructor() {
    super({ key: 'CampaignFightMenuScene' });
  }

  init(data: { worldId: string; nodeId: string; isChallenge: boolean; kind?: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.nodeId = data?.nodeId ?? 'fire-fight-1';
    this.isChallenge = data?.isChallenge ?? false;
    this.kind = data?.kind ?? (this.isChallenge ? 'challenge' : 'fight');
    this.slotIdx = data?.slotIdx ?? 0;
    this.hardMode = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const world = getAnyWorld(this.worldId);

    const accent =
      this.kind === 'invasion' ? C.ember :
      this.kind === 'gauntlet' ? C.frost :
      this.kind === 'challenge' ? C.corrupt :
      (world?.color ?? C.arcane);

    const fightNum = this.nodeId.includes('fight-') ? this.nodeId.split('fight-')[1] : null;
    const titleText =
      this.kind === 'invasion'  ? '👾  INVASION' :
      this.kind === 'gauntlet'  ? '🏆  GAUNTLET' :
      this.kind === 'challenge' ? `${world?.emoji ?? '⚔️'}  CHALLENGE` :
      `${world?.emoji ?? '⚔️'}  FIGHT ${fightNum ?? '?'}`;

    const panel = addModal(this, {
      w: 540, h: 386, accent,
      title: titleText,
      subtitle: world ? `${world.name.toUpperCase()} WORLD` : undefined,
      glow: 0.5,
    });

    // ── Briefing ────────────────────────────────────────────────────
    const def = getCampaignFightDef(this.nodeId);
    const briefY = panel.contentTop + 62;
    addWell(this, cx, briefY, 460, 92, accent, DEPTH.modal + 1, 8);

    if (def) {
      const elem = ELEMENT_DISPLAY[def.enemyElementId];
      const enemyStr = elem ? `${elem.emoji}  ${elem.name}` : def.enemyElementId;
      const diffStr = DIFFICULTY_LABEL[def.difficulty] ?? String(def.difficulty);

      // Opponent and difficulty read as two labelled stats, not a run-on line.
      const statY = briefY - 22;
      this.add.text(cx - 200, statY - 9, 'OPPONENT', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(cx - 200, statY + 10, enemyStr, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 0.5,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

      this.add.text(cx + 200, statY - 9, 'DIFFICULTY', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(cx + 200, statY + 10, diffStr.toUpperCase(), {
        fontSize: '15px', fontFamily: FONT_DISPLAY,
        color: hex(mix(accent, 0xffffff, 0.55)), letterSpacing: 1,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);

      const divider = this.add.graphics().setDepth(DEPTH.modal + 2);
      divider.lineStyle(1, accent, 0.2);
      divider.beginPath(); divider.moveTo(cx - 200, briefY + 6); divider.lineTo(cx + 200, briefY + 6); divider.strokePath();
      fillDiamond(divider, cx, briefY + 6, 3, accent, 0.5);

      // Mutations become their own badge row — starred ones flagged.
      const active = MUTATIONS.filter((m) => def.mutations?.includes(m.id));
      if (active.length > 0) {
        this.add.text(cx - 200, briefY + 26, 'MUTATIONS', {
          fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
        }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

        let bx = cx - 108;
        for (const m of active) {
          const starred = def.starredMutations?.includes(m.id);
          const badge = addBadge(this, {
            x: bx, y: briefY + 26,
            text: `${starred ? '★ ' : ''}${m.emoji} ${m.name}`,
            accent: starred ? C.gold : C.steel,
            depth: DEPTH.modalContent,
            glow: starred,
          });
          // Badges pack left-to-right; nudge the cursor by the one just placed.
          badge.setX(bx + badge.width / 2);
          bx += badge.width + 8;
        }
      } else {
        this.add.text(cx, briefY + 26, 'NO MUTATIONS', {
          fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.modalContent);
      }
    }

    // ── Hard mode ───────────────────────────────────────────────────
    const toggleY = cy + 62;
    addToggle(this, {
      x: cx + 30, y: toggleY, value: this.hardMode, accent: C.blood,
      label: '🔥 HARD MODE', depth: DEPTH.modalContent,
      onChange: (v) => { this.hardMode = v; },
    });

    // ── Actions ─────────────────────────────────────────────────────
    addButton(this, {
      x: cx, y: cy + 132, w: 240, h: 56,
      label: 'START', icon: '⚔', accent: C.verdant, variant: 'solid', fontSize: 21,
      depth: DEPTH.modalContent,
      onClick: () => this.startFight(),
    }).pulse();

    addButton(this, {
      x: cx, y: cy + 190, w: 160, h: 34,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 12,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.add.text(cx, cy + 218, 'ESC to cancel', {
      fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private startFight(): void {
    const world = getAnyWorld(this.worldId);
    const def = getCampaignFightDef(this.nodeId);
    const enemyElementId = def?.enemyElementId ?? world?.parentId ?? world?.id ?? 'fire';
    const difficulty = def?.difficulty ?? (this.kind === 'fight' ? 1 : 2);
    const mutations = def?.mutations ?? [];
    const starredMutations = def?.starredMutations ?? [];

    this.scene.start('CampaignElementSelectScene', {
      worldId: this.worldId,
      nodeId: this.nodeId,
      isChallenge: this.isChallenge,
      kind: this.kind,
      slotIdx: this.slotIdx,
      hardMode: this.hardMode,
      enemyElementId,
      difficulty,
      mutations,
      starredMutations,
    });
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldScene');
  }
}
