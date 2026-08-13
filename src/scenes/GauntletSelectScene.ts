import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { GAUNTLET_GROUPS, GAUNTLET_ELEMENTS, INFINITY_GAUNTLET_ID } from '../data/GauntletData';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addBadge, addButton, addCardPlate, addChip, addTitle, addToggle,
  addElementCrest, fillDiamond,
} from '../ui';
import { Music } from '../audio';

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
    Music.play('gauntlet');
    const { width, height } = this.scale;
    const cx = width / 2;

    // Hard mode re-lights the entire screen — it should feel like a different
    // place, not a checkbox.
    const accent = this.hardMode ? C.corrupt : C.gold;
    addBackdrop(this, { accent, variant: this.hardMode ? 'void' : 'lattice', motes: this.hardMode ? 30 : 16 });

    addTitle(this, {
      x: cx, y: 68, text: 'GAUNTLETS', accent, size: 48,
      subtitle: 'FIVE BATTLES AND A BOSS — ONE LIFE',
    });

    addChip(this, {
      x: width - 18, y: 26, icon: '💎', value: `${PlayerData.getShards()}`,
      accent: C.gold, originX: 1,
    });

    const completedGauntlets = PlayerData.getCompletedGauntlets();
    const completedGauntletsHard = PlayerData.getCompletedGauntletsHard();
    const hardUnlocked = PlayerData.isGauntletHardUnlocked();

    // ── Element gauntlet cards ──────────────────────────────────────
    const cardW = 156;
    const cardH = 240;
    const cardGap = 18;
    const totalW = GAUNTLET_ELEMENTS.length * cardW + (GAUNTLET_ELEMENTS.length - 1) * cardGap;
    const startX = cx - totalW / 2 + cardW / 2;
    const cardCY = 306;

    GAUNTLET_ELEMENTS.forEach((el, i) => {
      const bx = startX + i * (cardW + cardGap);
      const isCompleted = completedGauntlets.includes(el.id);
      const isHardCompleted = completedGauntletsHard.includes(el.id);

      const card = addCardPlate(this, {
        x: bx, y: cardCY, w: cardW, h: cardH,
        accent: isCompleted ? C.gold : el.color, cut: 16,
      });

      const top = cardCY - cardH / 2;

      // The champion you are challenging, standing in his own light — the same live
      // portrait the roster cards use, in place of a 44px emoji.
      addElementCrest(this, {
        x: bx, y: top + 70, w: cardW - 18, h: 112,
        elementId: el.id, name: `${el.emoji}  ${el.name}`, accent: el.color,
        mastered: PlayerData.isMasteryEnabled(el.id),
        depth: DEPTH.panel + 1, portraitScale: 0.62,
      });

      // Opponent roster: a rule, a row of tinted gems, and the names beneath them.
      const rule = this.add.graphics().setDepth(DEPTH.content - 1);
      rule.lineStyle(1, el.color, 0.25);
      rule.beginPath(); rule.moveTo(bx - cardW / 2 + 18, top + 140); rule.lineTo(bx + cardW / 2 - 18, top + 140); rule.strokePath();
      fillDiamond(rule, bx, top + 140, 3, el.color, 0.6);

      this.add.text(bx, top + 154, 'FOES', {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const pool = GAUNTLET_GROUPS[el.id];
      // The foes as their own emoji, over a pool of each one's colour.
      const gems = this.add.graphics().setDepth(DEPTH.content - 1);
      pool.forEach((foeId, k) => {
        const foe = findElementDef(foeId);
        const gx = bx - ((pool.length - 1) * 24) / 2 + k * 24;
        for (let r = 3; r >= 1; r--) {
          gems.fillStyle(foe?.color ?? C.steel, 0.06);
          gems.fillCircle(gx, top + 176, 5 + r * 3);
        }
        this.add.text(gx, top + 176, foe?.emoji ?? '?', { fontSize: '16px' })
          .setOrigin(0.5).setDepth(DEPTH.content);
      });

      this.add.text(bx, top + 194, pool.map((e) => findElementDef(e)?.name ?? e).join('  ·  '), {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 0.5,
        wordWrap: { width: cardW - 22 }, align: 'center', lineSpacing: 3,
      }).setOrigin(0.5, 0).setDepth(DEPTH.content);

      if (isCompleted) {
        addBadge(this, {
          x: bx, y: top - 4,
          text: isHardCompleted ? '★ CLEARED  🔥' : '★ CLEARED',
          accent: isHardCompleted ? C.corrupt : C.gold,
          depth: DEPTH.content + 2,
          glow: true,
        });
      }

      const hit = this.add.rectangle(bx, cardCY, cardW, cardH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => card.paint('hover'));
      hit.on('pointerout', () => card.paint('idle'));
      hit.on('pointerdown', () =>
        this.scene.start('GauntletElementSelectScene', { gauntletId: el.id, hardMode: this.hardMode }));
    });

    // ── Infinity gauntlet ───────────────────────────────────────────
    const infinityUnlocked = completedGauntlets.length >= GAUNTLET_ELEMENTS.length;
    const infinityBest = PlayerData.getInfinityBestFight(this.hardMode);
    const cleared = completedGauntlets.length;

    addButton(this, {
      x: cx, y: 470, w: 400, h: 62,
      label: 'INFINITY GAUNTLET',
      sublabel: infinityUnlocked
        ? (infinityBest > 0 ? `Endless · best run reached fight ${infinityBest}` : 'Endless mode — how far can you go?')
        : `Clear all 5 base gauntlets to unlock  (${cleared}/5)`,
      icon: '∞',
      accent: C.arcane,
      variant: infinityUnlocked ? 'solid' : 'quiet',
      fontSize: 19,
      align: 'left',
      disabled: !infinityUnlocked,
      onClick: () =>
        this.scene.start('GauntletElementSelectScene', { gauntletId: INFINITY_GAUNTLET_ID, hardMode: this.hardMode }),
    });

    // ── Hard mode ───────────────────────────────────────────────────
    const toggleY = 552;
    if (!hardUnlocked) {
      this.add.text(cx, toggleY, '🔥  HARD MODE — purchase in the Shop for 💎 1500', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      addToggle(this, {
        x: cx + 40, y: toggleY, value: this.hardMode, accent: C.corrupt,
        label: '🔥 HARD MODE',
        onChange: (v) => {
          this.hardMode = v;
          this.scene.restart({ hardMode: v });
        },
      });
      this.add.text(cx, toggleY + 30, this.hardMode
        ? 'Foes hit harder, spoils run richer.'
        : 'Standard difficulty.', {
        fontSize: '10px', fontFamily: FONT_UI,
        color: this.hardMode ? hex(mix(C.corrupt, 0xffffff, 0.4)) : T.faint,
        letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    }

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);
  }
}
