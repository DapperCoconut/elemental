import Phaser from 'phaser';
import { WorldNode, getFightNodes } from '../data/Worlds';
import { getAbstractWorld, getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { drawCampaignBackground } from './CampaignBackground';

export class CampaignWorldScene extends Phaser.Scene {
  private worldId = 'fire';
  private slotIdx: 0 | 1 | 2 = 0;

  constructor() {
    super({ key: 'CampaignWorldScene' });
  }

  init(data: { worldId: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = getAnyWorld(this.worldId);
    const mapMode: 'normal' | 'abstract' = getAbstractWorld(this.worldId) ? 'abstract' : 'normal';
    if (!world) { this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: mapMode }); return; }

    // Background
    drawCampaignBackground(this, this.worldId, width, height).setDepth(-100);

    // World-color accent strip at top
    this.add.rectangle(cx, 0, width, 4, world.color, 0.7).setOrigin(0.5, 0);

    // Header
    this.add.text(cx, 36, `${world.emoji}  ${world.name.toUpperCase()}`, {
      fontSize: '32px',
      fontFamily: '"Arial Black", sans-serif',
      color: Phaser.Display.Color.IntegerToColor(world.color).lighten(20).rgba,
      stroke: '#000000',
      strokeThickness: 4,
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
      .on('pointerdown', () => this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: mapMode }));
    this.input.keyboard!.on('keydown-ESC', () =>
      this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: mapMode }),
    );

    // Draw connector lines between fight nodes
    const fightNodes = getFightNodes(world);
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(2, 0x333355, 1);
    for (let i = 0; i < fightNodes.length - 1; i++) {
      const a = fightNodes[i];
      const b = fightNodes[i + 1];
      lineGfx.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Line from last fight to challenge
    const lastFight = fightNodes[fightNodes.length - 1];
    const challengeNode = world.nodes.find((n) => n.kind === 'challenge');
    if (lastFight && challengeNode) {
      lineGfx.lineStyle(2, 0x550066, 1);
      lineGfx.lineBetween(lastFight.x, lastFight.y, challengeNode.x, challengeNode.y);
    }

    // Draw all nodes
    for (const node of world.nodes) {
      this.drawNode(node, world.color);
    }
  }

  private drawNode(node: WorldNode, worldColor: number): void {
    const slot = this.slotIdx;
    const worldId = this.worldId;

    if (node.kind === 'fight') {
      const fightIndex = parseInt(node.id.split('-fight-')[1] ?? '1', 10);
      const unlocked = CP.isFightUnlocked(slot, worldId, node.id);
      const completed = CP.isFightCompleted(slot, worldId, node.id);
      const r = 28;
      const color = completed ? worldColor : (unlocked ? worldColor : 0x222233);
      const alpha = unlocked ? 0.85 : 0.35;

      const circle = this.add.circle(node.x, node.y, r, color, alpha)
        .setStrokeStyle(2, completed ? 0xffdd44 : (unlocked ? 0xffffff : 0x333355));

      this.add.text(node.x, node.y - 8, `${fightIndex}`, {
        fontSize: '18px',
        fontFamily: '"Arial Black", sans-serif',
        color: unlocked ? '#ffffff' : '#444444',
      }).setOrigin(0.5);

      this.add.text(node.x, node.y + 12, 'FIGHT', {
        fontSize: '8px',
        fontFamily: 'Arial, sans-serif',
        color: unlocked ? '#cccccc' : '#444444',
      }).setOrigin(0.5);

      if (completed) {
        this.add.text(node.x + r - 4, node.y - r + 4, '✓', {
          fontSize: '12px', color: '#ffdd44',
        }).setOrigin(0.5);
      }

      if (!unlocked) return;

      circle.setInteractive({ useHandCursor: true });
      circle
        .on('pointerover', () => circle.setStrokeStyle(3, 0xffffff))
        .on('pointerout', () => circle.setStrokeStyle(2, completed ? 0xffdd44 : 0xffffff))
        .on('pointerdown', () => this.openFightMenu(node.id, false));

    } else if (node.kind === 'shop') {
      const r = 28;
      const circle = this.add.circle(node.x, node.y, r, 0xaa8800, 0.8)
        .setStrokeStyle(2, 0xffcc00)
        .setInteractive({ useHandCursor: true });

      this.add.text(node.x, node.y - 6, '🛒', { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(node.x, node.y + 14, 'SHOP', {
        fontSize: '8px', fontFamily: 'Arial, sans-serif', color: '#ffcc00',
      }).setOrigin(0.5);

      circle
        .on('pointerover', () => circle.setStrokeStyle(3, 0xffffff))
        .on('pointerout', () => circle.setStrokeStyle(2, 0xffcc00))
        .on('pointerdown', () => this.openShopMenu());

    } else if (node.kind === 'challenge') {
      const unlocked = CP.isChallengeUnlocked(slot, worldId);
      const completed = CP.isChallengeCompleted(slot, worldId);
      const r = 32;
      const alpha = unlocked ? 0.85 : 0.35;

      const circle = this.add.circle(node.x, node.y, r, 0x440066, alpha)
        .setStrokeStyle(2, completed ? 0xffdd44 : (unlocked ? 0xcc44ff : 0x440055));

      this.add.text(node.x, node.y - 8, '⚔️', { fontSize: '18px' }).setOrigin(0.5).setAlpha(alpha);
      this.add.text(node.x, node.y + 14, 'CHALLENGE', {
        fontSize: '8px', fontFamily: '"Arial Black", sans-serif', color: unlocked ? '#cc88ff' : '#553366',
      }).setOrigin(0.5);

      if (completed) {
        this.add.text(node.x + r - 4, node.y - r + 4, '✓', {
          fontSize: '12px', color: '#ffdd44',
        }).setOrigin(0.5);
      }

      if (!unlocked) {
        this.add.text(node.x, node.y + 4, '🔒', { fontSize: '14px' }).setOrigin(0.5).setAlpha(0.5);
        return;
      }

      circle.setInteractive({ useHandCursor: true });
      circle
        .on('pointerover', () => circle.setStrokeStyle(3, 0xee88ff))
        .on('pointerout', () => circle.setStrokeStyle(2, completed ? 0xffdd44 : 0xcc44ff))
        .on('pointerdown', () => this.openFightMenu(node.id, true));

    } else if (node.kind === 'invasion') {
      const r = 28;
      const circle = this.add.circle(node.x, node.y, r, 0x3a1000, 0.85)
        .setStrokeStyle(2, 0xff7722)
        .setInteractive({ useHandCursor: true });

      this.add.text(node.x, node.y - 8, '👾', { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(node.x, node.y + 13, 'INVASION', {
        fontSize: '7px', fontFamily: '"Arial Black", sans-serif', color: '#ff7722',
      }).setOrigin(0.5);

      circle
        .on('pointerover', () => circle.setStrokeStyle(3, 0xffaa66))
        .on('pointerout', () => circle.setStrokeStyle(2, 0xff7722))
        .on('pointerdown', () => this.openFightMenu(node.id, false, node.kind));

    } else if (node.kind === 'gauntlet') {
      const r = 28;
      const circle = this.add.circle(node.x, node.y, r, 0x050520, 0.85)
        .setStrokeStyle(2, 0x4488ff)
        .setInteractive({ useHandCursor: true });

      this.add.text(node.x, node.y - 8, '🏆', { fontSize: '18px' }).setOrigin(0.5);
      this.add.text(node.x, node.y + 13, 'GAUNTLET', {
        fontSize: '7px', fontFamily: '"Arial Black", sans-serif', color: '#4488ff',
      }).setOrigin(0.5);

      circle
        .on('pointerover', () => circle.setStrokeStyle(3, 0x88bbff))
        .on('pointerout', () => circle.setStrokeStyle(2, 0x4488ff))
        .on('pointerdown', () => this.openFightMenu(node.id, false, node.kind));
    }
  }

  private openFightMenu(nodeId: string, isChallenge: boolean, kind?: string): void {
    this.scene.pause();
    this.scene.launch('CampaignFightMenuScene', {
      worldId: this.worldId,
      nodeId,
      isChallenge,
      kind,
      slotIdx: this.slotIdx,
    });
  }

  private openShopMenu(): void {
    this.scene.pause();
    this.scene.launch('CampaignShopScene', {
      worldId: this.worldId,
      slotIdx: this.slotIdx,
    });
  }
}
