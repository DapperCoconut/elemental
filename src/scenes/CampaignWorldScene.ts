import Phaser from 'phaser';
import { WorldNode, getFightNodes } from '../data/Worlds';
import { getAbstractWorld, getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { drawCampaignBackground } from './CampaignBackground';
import { addInventoryButton } from './InventoryScene';
import {
  C, T, DEPTH, FONT_DISPLAY, hex, mix,
  addBackButton, fillDiamond, fillHex, strokeHex,
} from '../ui';

/** Visual spec for each node kind on a world's path. */
const NODE_STYLES: Record<string, { accent: number; glyph: string; label: string; radius: number }> = {
  shop:     { accent: C.gold,    glyph: '🛒', label: 'SHOP',      radius: 28 },
  challenge:{ accent: C.corrupt, glyph: '⚔️', label: 'CHALLENGE', radius: 34 },
  invasion: { accent: C.ember,   glyph: '👾', label: 'INVASION',  radius: 28 },
  gauntlet: { accent: C.frost,   glyph: '🏆', label: 'GAUNTLET',  radius: 28 },
};

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

    drawCampaignBackground(this, this.worldId, width, height).setDepth(DEPTH.backdrop);

    // ── World banner ────────────────────────────────────────────────
    const banner = this.add.graphics().setDepth(DEPTH.panel);
    banner.fillStyle(0x04040c, 0.5);
    banner.fillRect(0, 0, width, 68);
    // The world's own colour becomes the rule under its name.
    banner.lineStyle(3, world.color, 0.75);
    banner.beginPath(); banner.moveTo(50, 68); banner.lineTo(width - 50, 68); banner.strokePath();
    banner.lineStyle(1, mix(world.color, 0xffffff, 0.5), 0.3);
    banner.beginPath(); banner.moveTo(50, 72); banner.lineTo(width - 50, 72); banner.strokePath();
    fillDiamond(banner, cx, 68, 6, mix(world.color, 0xffffff, 0.5), 1);

    this.add.text(cx, 32, `${world.emoji}   ${world.name.toUpperCase()}`, {
      fontSize: '30px', fontFamily: FONT_DISPLAY,
      color: hex(mix(world.color, 0xffffff, 0.55)),
      stroke: hex(mix(world.color, 0x000000, 0.82)), strokeThickness: 5,
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const back = () => this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: mapMode });
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // ── Path between fight nodes ────────────────────────────────────
    const fightNodes = getFightNodes(world);
    const lineGfx = this.add.graphics().setDepth(DEPTH.panel);
    for (let i = 0; i < fightNodes.length - 1; i++) {
      this.drawPath(lineGfx, fightNodes[i], fightNodes[i + 1], world.color, 0.6);
    }
    const lastFight = fightNodes[fightNodes.length - 1];
    const challengeNode = world.nodes.find((n) => n.kind === 'challenge');
    if (lastFight && challengeNode) {
      this.drawPath(lineGfx, lastFight, challengeNode, C.corrupt, 0.7);
    }

    for (const node of world.nodes) {
      this.drawNode(node, world.color);
    }

    addInventoryButton(this, this.slotIdx, DEPTH.content + 5);
  }

  /** Twin-stroke route with a waypoint diamond, matching the world map. */
  private drawPath(
    g: Phaser.GameObjects.Graphics,
    a: { x: number; y: number }, b: { x: number; y: number },
    color: number, alpha: number,
  ): void {
    g.lineStyle(7, 0x04040c, 0.6);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
    g.lineStyle(2, mix(color, 0xffffff, 0.3), alpha);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
    fillDiamond(g, (a.x + b.x) / 2, (a.y + b.y) / 2, 3, mix(color, 0xffffff, 0.5), alpha);
  }

  private drawNode(node: WorldNode, worldColor: number): void {
    const slot = this.slotIdx;
    const worldId = this.worldId;

    if (node.kind === 'fight') {
      const fightIndex = parseInt(node.id.split('-fight-')[1] ?? '1', 10);
      const unlocked = CP.isFightUnlocked(slot, worldId, node.id);
      const completed = CP.isFightCompleted(slot, worldId, node.id);

      this.buildNode({
        x: node.x, y: node.y, r: 29,
        accent: worldColor,
        glyph: `${fightIndex}`,
        glyphIsText: true,
        label: 'FIGHT',
        unlocked, completed,
        onClick: () => this.openFightMenu(node.id, false),
      });
      return;
    }

    const style = NODE_STYLES[node.kind];
    if (!style) return;

    if (node.kind === 'shop') {
      this.buildNode({
        x: node.x, y: node.y, r: style.radius,
        accent: style.accent, glyph: style.glyph, label: style.label,
        unlocked: true, completed: false,
        onClick: () => this.openShopMenu(),
      });
      return;
    }

    if (node.kind === 'challenge') {
      this.buildNode({
        x: node.x, y: node.y, r: style.radius,
        accent: style.accent, glyph: style.glyph, label: style.label,
        unlocked: CP.isChallengeUnlocked(slot, worldId),
        completed: CP.isChallengeCompleted(slot, worldId),
        onClick: () => this.openFightMenu(node.id, true),
      });
      return;
    }

    // Invasion and gauntlet nodes are always open.
    this.buildNode({
      x: node.x, y: node.y, r: style.radius,
      accent: style.accent, glyph: style.glyph, label: style.label,
      unlocked: true,
      completed: node.kind === 'gauntlet' && CP.isGauntletCompleted(slot, worldId),
      onClick: () => this.openFightMenu(node.id, false, node.kind),
    });
  }

  /**
   * Shared node chrome: hex plate, glyph, caption, and — once cleared — a gold
   * ring plus a check mark on the upper-right face.
   */
  private buildNode(opts: {
    x: number; y: number; r: number; accent: number;
    glyph: string; glyphIsText?: boolean; label: string;
    unlocked: boolean; completed: boolean;
    onClick: () => void;
  }): void {
    const { x, y, r, accent, unlocked, completed } = opts;
    const g = this.add.graphics().setDepth(DEPTH.panel + 1);
    const ring = completed ? C.gold : unlocked ? mix(accent, 0xffffff, 0.4) : C.line;

    const paint = (hot: boolean): void => {
      g.clear();
      if (unlocked) {
        for (let k = 4; k >= 1; k--) {
          g.fillStyle(accent, hot ? 0.08 : 0.04);
          g.fillCircle(x, y, r + k * 5);
        }
      }
      fillHex(g, x, y, r,
        unlocked ? mix(accent, 0x000000, hot ? 0.3 : 0.48) : mix(C.plate, 0x000000, 0.5),
        unlocked ? 0.96 : 0.7);
      strokeHex(g, x, y, r, hot ? 0xffffff : ring, unlocked ? 1 : 0.45, hot ? 3 : 2);
      strokeHex(g, x, y, r - 5, accent, unlocked ? 0.32 : 0.1, 1);
      if (completed) {
        for (const a of [-Math.PI / 2, -Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05]) {
          fillDiamond(g, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), 3, C.gold, 0.9);
        }
      }
    };
    paint(false);

    if (opts.glyphIsText) {
      this.add.text(x, y - 6, opts.glyph, {
        fontSize: '19px', fontFamily: FONT_DISPLAY,
        color: unlocked ? T.bright : T.ghost, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      this.add.text(x, y - 6, unlocked ? opts.glyph : '🔒', { fontSize: '18px' })
        .setOrigin(0.5).setDepth(DEPTH.content).setAlpha(unlocked ? 1 : 0.55);
    }

    const label = this.add.text(x, y + 14, opts.label, {
      fontSize: '7.5px', fontFamily: FONT_DISPLAY,
      color: unlocked ? hex(mix(accent, 0xffffff, 0.55)) : T.ghost, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (!unlocked) return;

    const hit = this.add.circle(x, y, r, 0xffffff, 0)
      .setDepth(DEPTH.content + 1)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(true); label.setColor(T.bright); });
    hit.on('pointerout', () => { paint(false); label.setColor(hex(mix(accent, 0xffffff, 0.55))); });
    hit.on('pointerdown', opts.onClick);
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
