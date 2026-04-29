import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import { TOTAL_FIGHTS, TOTAL_CHALLENGES } from '../data/Worlds';

export class CampaignSlotSelectScene extends Phaser.Scene {
  private renameInput: HTMLInputElement | null = null;
  private renameSlotIdx: 0 | 1 | 2 | null = null;

  constructor() {
    super({ key: 'CampaignSlotSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.renameInput = null;
    this.renameSlotIdx = null;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 55, 'CAMPAIGN', {
      fontSize: '44px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa44',
      stroke: '#cc6600',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 100, 'Select a save slot', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // Back button
    const backRect = this.add
      .rectangle(52, 36, 88, 36, 0x222233)
      .setStrokeStyle(2, 0x555577)
      .setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(52, 36, '← BACK', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    backRect
      .on('pointerover', () => { backRect.setFillStyle(0x333355); backLbl.setColor('#ffffff'); })
      .on('pointerout', () => { backRect.setFillStyle(0x222233); backLbl.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    this.renderCards();
  }

  private renderCards(): void {
    // Clear previous card objects (all objects except background, grid, title, back btn)
    // Easiest: just restart the scene to re-render — but that's wasteful.
    // Instead, track card group objects.
    // For simplicity, restart scene on any mutation.
    const cardCenters = [160, 480, 800];
    const cardW = 240;
    const cardH = 340;
    const cy = 360;

    for (let i = 0; i < 3; i++) {
      const idx = i as 0 | 1 | 2;
      const cx = cardCenters[i];
      const slot = CP.getSlot(idx);
      this.drawSlotCard(cx, cy, cardW, cardH, idx, slot);
    }
  }

  private drawSlotCard(
    cx: number, cy: number, cardW: number, cardH: number,
    idx: 0 | 1 | 2, slot: CP.CampaignSlot | null,
  ): void {
    const summary = CP.getSlotSummary(idx);

    // Card border
    this.add.rectangle(cx, cy, cardW, cardH, 0x111122, 0.9)
      .setStrokeStyle(2, slot ? (CP.isCheated(idx) ? 0xaa44ff : 0xffaa44) : 0x333355);

    // Slot label
    this.add.text(cx, cy - cardH / 2 + 22, `SLOT ${idx + 1}`, {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    if (!slot) {
      // Empty slot
      this.add.text(cx, cy - 30, 'Empty', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#444466',
      }).setOrigin(0.5);

      const createBtn = this.add.rectangle(cx, cy + 60, 140, 40, 0x1a2a1a)
        .setStrokeStyle(2, 0x44cc44)
        .setInteractive({ useHandCursor: true });
      const createLbl = this.add.text(cx, cy + 60, 'CREATE', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#44cc44',
      }).setOrigin(0.5);
      createBtn
        .on('pointerover', () => { createBtn.setFillStyle(0x253525); createLbl.setColor('#aaffaa'); })
        .on('pointerout', () => { createBtn.setFillStyle(0x1a2a1a); createLbl.setColor('#44cc44'); })
        .on('pointerdown', () => this.startCreate(idx));
    } else {
      // Filled slot
      this.add.text(cx, cy - cardH / 2 + 52, slot.name, {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Progress
      this.add.text(cx, cy - 30, `⚔️ ${summary.fights} / ${TOTAL_FIGHTS} fights`, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
      }).setOrigin(0.5);
      this.add.text(cx, cy - 8, `🏆 ${summary.challenges} / ${TOTAL_CHALLENGES} challenges`, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
      }).setOrigin(0.5);

      // PLAY button
      const playBtn = this.add.rectangle(cx, cy + 55, 140, 40, 0x1a2a1a)
        .setStrokeStyle(2, 0x44cc44)
        .setInteractive({ useHandCursor: true });
      const playLbl = this.add.text(cx, cy + 55, 'PLAY', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#44cc44',
      }).setOrigin(0.5);
      playBtn
        .on('pointerover', () => { playBtn.setFillStyle(0x253525); playLbl.setColor('#aaffaa'); })
        .on('pointerout', () => { playBtn.setFillStyle(0x1a2a1a); playLbl.setColor('#44cc44'); })
        .on('pointerdown', () => {
          CP.setActiveSlot(idx);
          this.scene.start('CampaignWorldMapScene', { slotIdx: idx });
        });

      // RENAME button
      const renameBtn = this.add.rectangle(cx - 38, cy + 105, 68, 32, 0x1a1a2a)
        .setStrokeStyle(1, 0x4466aa)
        .setInteractive({ useHandCursor: true });
      const renameLbl = this.add.text(cx - 38, cy + 105, 'RENAME', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#4488cc',
      }).setOrigin(0.5);
      renameBtn
        .on('pointerover', () => { renameBtn.setFillStyle(0x22223a); renameLbl.setColor('#88ccff'); })
        .on('pointerout', () => { renameBtn.setFillStyle(0x1a1a2a); renameLbl.setColor('#4488cc'); })
        .on('pointerdown', () => this.startRename(idx, cx, cy));

      // DELETE button
      const deleteBtn = this.add.rectangle(cx + 42, cy + 105, 68, 32, 0x2a1a1a)
        .setStrokeStyle(1, 0xaa4444)
        .setInteractive({ useHandCursor: true });
      const deleteLbl = this.add.text(cx + 42, cy + 105, 'DELETE', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#cc4444',
      }).setOrigin(0.5);
      deleteBtn
        .on('pointerover', () => { deleteBtn.setFillStyle(0x3a2222); deleteLbl.setColor('#ff8888'); })
        .on('pointerout', () => { deleteBtn.setFillStyle(0x2a1a1a); deleteLbl.setColor('#cc4444'); })
        .on('pointerdown', () => this.confirmDelete(idx));
    }
  }

  private startCreate(idx: 0 | 1 | 2): void {
    this.openRenameInput(idx, `Save ${idx + 1}`, (name) => {
      CP.createSlot(idx, name);
      this.scene.restart();
    });
  }

  private startRename(idx: 0 | 1 | 2, _cx: number, _cy: number): void {
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

  private openRenameInput(idx: 0 | 1 | 2, initial: string, onCommit: (name: string) => void): void {
    this.cleanupInput();
    this.renameSlotIdx = idx;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.scale.width;
    const scaleY = rect.height / this.scale.height;

    const cardCenters = [160, 480, 800];
    const gameX = cardCenters[idx];
    const gameY = 360;

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.maxLength = 20;
    inputEl.value = initial;
    inputEl.style.position = 'fixed';
    inputEl.style.left = `${rect.left + (gameX - 70) * scaleX}px`;
    inputEl.style.top = `${rect.top + (gameY - 16) * scaleY}px`;
    inputEl.style.width = `${140 * scaleX}px`;
    inputEl.style.height = `${32 * scaleY}px`;
    inputEl.style.fontSize = `${16 * scaleX}px`;
    inputEl.style.background = '#1a1a33';
    inputEl.style.color = '#ffffff';
    inputEl.style.border = '2px solid #4488cc';
    inputEl.style.borderRadius = '4px';
    inputEl.style.textAlign = 'center';
    inputEl.style.outline = 'none';
    inputEl.style.zIndex = '9999';
    inputEl.style.fontFamily = '"Arial Black", sans-serif';

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
