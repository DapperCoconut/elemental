import Phaser from 'phaser';
import { WORLDS, World } from '../data/Worlds';
import { ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { drawWorldMapBackground, drawAbstractWorldMapBackground } from './CampaignBackground';

export class CampaignWorldMapScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private mode: 'normal' | 'abstract' = 'normal';

  constructor() {
    super({ key: 'CampaignWorldMapScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; mode?: 'normal' | 'abstract' }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.mode = data?.mode ?? 'normal';
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const slot = this.slotIdx;
    const isAbstract = this.mode === 'abstract';
    const worlds = isAbstract ? ABSTRACT_WORLDS : WORLDS;

    // Background
    const bgFn = isAbstract ? drawAbstractWorldMapBackground : drawWorldMapBackground;
    bgFn(this, width, height).setDepth(-100);

    // Title
    this.add.text(cx, 28, isAbstract ? 'ABSTRACT WORLD MAP' : 'WORLD MAP', {
      fontSize: '26px',
      fontFamily: '"Arial Black", sans-serif',
      color: isAbstract ? '#cc88ff' : '#ffaa44',
      stroke: isAbstract ? '#5522aa' : '#cc6600',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Slot name
    const slotName = CP.getSlot(slot)?.name ?? `Slot ${slot + 1}`;
    this.add.text(cx, 54, slotName, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // Currency display — top right
    const keys = CP.getKeys(slot);
    const sparks = CP.getSparks(slot);
    this.add.text(width - 16, 22, `🗝️  ${keys}`, {
      fontSize: '15px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffdd55',
    }).setOrigin(1, 0.5);
    this.add.text(width - 16, 44, `⚡  ${sparks}`, {
      fontSize: '15px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#55ffcc',
    }).setOrigin(1, 0.5);

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
      .on('pointerdown', () => this.scene.start('CampaignSlotSelectScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('CampaignSlotSelectScene'));

    // SPACE: toggle between normal and abstract map (only if portal is unlocked)
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.scene.isPaused()) return;
      if (!CP.isPortalUnlocked(this.slotIdx)) return;
      this.scene.start('CampaignWorldMapScene', {
        slotIdx: this.slotIdx,
        mode: this.mode === 'normal' ? 'abstract' : 'normal',
      });
    });

    // Draw connector lines first (below circles)
    const lineGfx = this.add.graphics();
    for (const world of worlds) {
      if (!world.parentId) continue;
      const parent = worlds.find((w) => w.id === world.parentId);
      if (!parent) continue;
      const unlocked = CP.isWorldUnlocked(slot, world.id);
      lineGfx.lineStyle(2, unlocked ? 0x555555 : 0x2a2a2a, 1);
      lineGfx.lineBetween(parent.mapX, parent.mapY, world.mapX, world.mapY);
    }

    // Draw world circles
    for (const world of worlds) {
      this.drawWorldNode(world, slot);
    }

    // Portal button (normal map only)
    if (!isAbstract) {
      const portalUnlocked = CP.isPortalUnlocked(slot);
      const portalRect = this.add
        .rectangle(cx, 580, 200, 52, 0x1a1033)
        .setStrokeStyle(2, 0xaa44ff)
        .setInteractive({ useHandCursor: true });
      const portalLbl = this.add.text(cx, 580, '🌀 PORTAL', {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#cc88ff',
      }).setOrigin(0.5);
      portalRect
        .on('pointerover', () => { portalRect.setFillStyle(0x2a1055); portalLbl.setColor('#ffffff'); })
        .on('pointerout', () => { portalRect.setFillStyle(0x1a1033); portalLbl.setColor('#cc88ff'); })
        .on('pointerdown', () => {
          this.scene.pause();
          this.scene.launch('CampaignPortalScene', { slotIdx: this.slotIdx });
        });

      // Hint text beneath the portal button
      const hintText = portalUnlocked
        ? 'Press SPACE to travel to the Abstract realm'
        : 'Purchase the portal to travel realms';
      this.add.text(cx, 614, hintText, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#775599',
      }).setOrigin(0.5);
    }
  }

  private drawWorldNode(world: World, slot: 0 | 1 | 2): void {
    const unlocked = CP.isWorldUnlocked(slot, world.id);
    const allFightsDone = CP.isChallengeCompleted(slot, world.id);
    const alpha = unlocked ? 1 : 0.3;
    const r = 28;

    const circle = this.add.circle(world.mapX, world.mapY, r, world.color, unlocked ? 0.85 : 0.3)
      .setStrokeStyle(2, allFightsDone ? 0xffdd44 : (unlocked ? 0xffffff : 0x444444));

    const emojiText = this.add.text(world.mapX, world.mapY - 6, world.emoji, {
      fontSize: '18px',
    }).setOrigin(0.5).setAlpha(alpha);

    const nameText = this.add.text(world.mapX, world.mapY + 16, world.name, {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(alpha);

    if (!unlocked) {
      this.add.text(world.mapX, world.mapY + 4, '🔒', {
        fontSize: '14px',
      }).setOrigin(0.5).setAlpha(0.6);
      return;
    }

    circle.setInteractive({ useHandCursor: true });
    circle
      .on('pointerover', () => {
        circle.setStrokeStyle(3, 0xffffff);
        nameText.setColor('#ffcc44');
      })
      .on('pointerout', () => {
        circle.setStrokeStyle(2, allFightsDone ? 0xffdd44 : 0xffffff);
        nameText.setColor('#ffffff');
      })
      .on('pointerdown', () => {
        this.scene.start('CampaignWorldScene', { worldId: world.id, slotIdx: this.slotIdx, mode: this.mode });
      });

    // Completion badge
    if (allFightsDone) {
      this.add.text(world.mapX + r - 4, world.mapY - r + 4, '⭐', {
        fontSize: '12px',
      }).setOrigin(0.5);
    }

    void emojiText; // suppress unused warning
  }
}
