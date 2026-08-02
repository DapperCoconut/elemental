import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import { TOTAL_FIGHTS, TOTAL_CHALLENGES } from '../data/AbstractWorlds';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addCardPlate, addTitle,
  drawMeter, fillDiamond, fillHex, strokeHex,
} from '../ui';
import { Music } from '../audio';

const CARD_CENTERS = [160, 480, 800];
const CARD_W = 250;
const CARD_H = 348;
const CARD_CY = 372;

export class CampaignSlotSelectScene extends Phaser.Scene {
  private renameInput: HTMLInputElement | null = null;
  private renameSlotIdx: 0 | 1 | 2 | null = null;

  constructor() {
    super({ key: 'CampaignSlotSelectScene' });
  }

  create(): void {
    Music.play('campaign');
    const { width } = this.scale;
    const cx = width / 2;

    this.renameInput = null;
    this.renameSlotIdx = null;

    addBackdrop(this, { accent: C.ember, variant: 'lattice', motes: 20 });

    addTitle(this, {
      x: cx, y: 76, text: 'CAMPAIGN', accent: C.ember, size: 46,
      subtitle: 'CHOOSE A SAVE SLOT',
    });

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    for (let i = 0; i < 3; i++) {
      const idx = i as 0 | 1 | 2;
      this.drawSlotCard(CARD_CENTERS[i], idx, CP.getSlot(idx));
    }
  }

  /**
   * One save slot as a wax-sealed dossier: crest at the top, progress meters in
   * the middle, actions at the foot. Empty slots show a hollow seal instead.
   */
  private drawSlotCard(cx: number, idx: 0 | 1 | 2, slot: CP.CampaignSlot | null): void {
    const summary = CP.getSlotSummary(idx);
    const cheated = CP.isCheated(idx);
    const accent = !slot ? C.steel : cheated ? C.arcane : C.ember;

    const card = addCardPlate(this, {
      x: cx, y: CARD_CY, w: CARD_W, h: CARD_H,
      accent, cut: 18, muted: !slot,
    });

    const top = CARD_CY - CARD_H / 2;

    // Slot number, engraved into the header strip.
    this.add.text(cx, top + 22, `SLOT ${idx + 1}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0x000000, 0.2)), letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // Crest — a hex seal holding either the campaign mark or a hollow slot.
    const crest = this.add.graphics().setDepth(DEPTH.content);
    const crestY = top + 76;
    if (slot) {
      for (let k = 5; k >= 1; k--) {
        crest.fillStyle(accent, 0.05);
        crest.fillCircle(cx, crestY, 22 + k * 5);
      }
      fillHex(crest, cx, crestY, 30, mix(C.plate, accent, 0.3), 1);
      strokeHex(crest, cx, crestY, 30, mix(accent, 0xffffff, 0.4), 1, 2);
      strokeHex(crest, cx, crestY, 24, accent, 0.35, 1);
      this.add.text(cx, crestY, cheated ? '🌀' : '🗺', { fontSize: '26px' })
        .setOrigin(0.5).setDepth(DEPTH.content + 1);
    } else {
      strokeHex(crest, cx, crestY, 30, C.steel, 0.3, 2);
      strokeHex(crest, cx, crestY, 24, C.steel, 0.15, 1);
      // Hollow slots get a dashed cross rather than a glyph.
      crest.lineStyle(1, C.steel, 0.25);
      crest.beginPath(); crest.moveTo(cx - 12, crestY - 12); crest.lineTo(cx + 12, crestY + 12); crest.strokePath();
      crest.beginPath(); crest.moveTo(cx + 12, crestY - 12); crest.lineTo(cx - 12, crestY + 12); crest.strokePath();
    }

    if (!slot) {
      this.add.text(cx, top + 148, 'EMPTY', {
        fontSize: '18px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 4,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(cx, top + 174, 'Begin a new journey', {
        fontSize: '11px', fontFamily: FONT_UI, color: T.ghost,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      addButton(this, {
        x: cx, y: CARD_CY + 88, w: 168, h: 46,
        label: 'CREATE', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 16,
        onHover: () => card.paint('hover'),
        onOut: () => card.paint('idle'),
        onClick: () => this.startCreate(idx),
      });
      return;
    }

    // ── Filled slot ───────────────────────────────────────────────
    this.add.text(cx, top + 132, slot.name, {
      fontSize: '21px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
      wordWrap: { width: CARD_W - 30 }, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (cheated) {
      this.add.text(cx, top + 156, 'CHEAT-FLAGGED', {
        fontSize: '9px', fontFamily: FONT_DISPLAY,
        color: hex(mix(C.arcane, 0xffffff, 0.4)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    }

    const meters = this.add.graphics().setDepth(DEPTH.content);
    const meterW = CARD_W - 56;
    const meterX = cx - meterW / 2;

    const rows: Array<{ label: string; value: number; total: number; color: number }> = [
      { label: '⚔  FIGHTS', value: summary.fights, total: TOTAL_FIGHTS, color: C.ember },
      { label: '🏆  CHALLENGES', value: summary.challenges, total: TOTAL_CHALLENGES, color: C.gold },
    ];

    rows.forEach((row, i) => {
      const ry = top + 186 + i * 44;
      this.add.text(meterX, ry, row.label, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1.5,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);
      this.add.text(meterX + meterW, ry, `${row.value} / ${row.total}`, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(row.color, 0xffffff, 0.4)),
      }).setOrigin(1, 0.5).setDepth(DEPTH.content);
      drawMeter(meters, meterX, ry + 10, meterW, 7, row.value / row.total, row.color);
    });

    // Ledger rule above the actions.
    const rule = this.add.graphics().setDepth(DEPTH.content);
    rule.lineStyle(1, accent, 0.2);
    rule.beginPath(); rule.moveTo(cx - meterW / 2, top + 274); rule.lineTo(cx + meterW / 2, top + 274); rule.strokePath();
    fillDiamond(rule, cx, top + 274, 3, accent, 0.5);

    addButton(this, {
      x: cx, y: CARD_CY + 62, w: 168, h: 44,
      label: 'PLAY', icon: '▶', accent: C.verdant, variant: 'solid', fontSize: 17,
      onHover: () => card.paint('hover'),
      onOut: () => card.paint('idle'),
      onClick: () => {
        CP.setActiveSlot(idx);
        this.scene.start('CampaignWorldMapScene', { slotIdx: idx });
      },
    });

    addButton(this, {
      x: cx - 44, y: CARD_CY + 118, w: 80, h: 32,
      label: 'RENAME', accent: C.frost, variant: 'quiet', fontSize: 10,
      onClick: () => this.startRename(idx),
    });

    addButton(this, {
      x: cx + 44, y: CARD_CY + 118, w: 80, h: 32,
      label: 'DELETE', accent: C.blood, variant: 'danger', fontSize: 10,
      onClick: () => this.confirmDelete(idx),
    });
  }

  private startCreate(idx: 0 | 1 | 2): void {
    this.openRenameInput(idx, `Save ${idx + 1}`, (name) => {
      CP.createSlot(idx, name);
      this.scene.restart();
    });
  }

  private startRename(idx: 0 | 1 | 2): void {
    const current = CP.getSlot(idx)?.name ?? '';
    this.openRenameInput(idx, current, (name) => {
      CP.renameSlot(idx, name);
      this.scene.restart();
    });
  }

  private confirmDelete(idx: 0 | 1 | 2): void {
    CP.deleteSlot(idx);
    this.scene.restart();
  }

  /**
   * Text entry rides on a real DOM input positioned over the canvas — Phaser has
   * no native text field, and this keeps IME and mobile keyboards working.
   */
  private openRenameInput(idx: 0 | 1 | 2, initial: string, onCommit: (name: string) => void): void {
    this.cleanupInput();
    this.renameSlotIdx = idx;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.scale.width;
    const scaleY = rect.height / this.scale.height;

    const gameX = CARD_CENTERS[idx];
    const gameY = CARD_CY;

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.maxLength = 20;
    inputEl.value = initial;
    inputEl.style.position = 'fixed';
    inputEl.style.left = `${rect.left + (gameX - 80) * scaleX}px`;
    inputEl.style.top = `${rect.top + (gameY - 18) * scaleY}px`;
    inputEl.style.width = `${160 * scaleX}px`;
    inputEl.style.height = `${36 * scaleY}px`;
    inputEl.style.fontSize = `${16 * scaleX}px`;
    inputEl.style.background = '#0d0d1c';
    inputEl.style.color = '#f2f2ff';
    inputEl.style.border = `2px solid ${hex(C.ember)}`;
    inputEl.style.borderRadius = '2px';
    inputEl.style.textAlign = 'center';
    inputEl.style.outline = 'none';
    inputEl.style.letterSpacing = '1px';
    inputEl.style.boxShadow = `0 0 18px ${hex(C.ember)}66`;
    inputEl.style.zIndex = '9999';
    inputEl.style.fontFamily = FONT_DISPLAY;

    const commit = () => {
      const name = inputEl.value.trim() || `Save ${idx + 1}`;
      this.cleanupInput();
      onCommit(name);
    };

    const cancel = () => {
      this.cleanupInput();
    };

    inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') cancel();
    });

    document.body.appendChild(inputEl);
    this.renameInput = inputEl;
    setTimeout(() => { inputEl.focus(); inputEl.select(); }, 0);
  }

  private cleanupInput(): void {
    if (this.renameInput) {
      this.renameInput.remove();
      this.renameInput = null;
    }
    this.renameSlotIdx = null;
  }

  shutdown(): void {
    this.cleanupInput();
  }
}
