import Phaser from 'phaser';
import { WorldNode, getFightNodes } from '../data/Worlds';
import { getAbstractWorld, getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import {
  getCampaignFightDef, getCampaignReward, isCorruptWorld, DIFFICULTY_LABEL, ELEMENT_DISPLAY,
} from '../data/CampaignFights';
import { getMutationDef } from '../data/Mutations';
import { getItemsForElement } from '../data/Items';
import { getWorldBossDef } from '../boss/bosses';
import { drawCampaignBackground } from './CampaignBackground';
import { addInventoryButton } from './InventoryScene';
import { maybePlayStory } from './DialogueScene';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addChip, addWell, fillDiamond, fillHex, strokeHex,
} from '../ui';
import { Music } from '../audio';

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

  /** Bottom-of-screen strip that reads out whichever node the cursor is over. */
  private infoTitle!: Phaser.GameObjects.Text;
  private infoBody!: Phaser.GameObjects.Text;
  private infoDefault = '';

  constructor() {
    super({ key: 'CampaignWorldScene' });
  }

  init(data: { worldId: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    Music.play('campaign');
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = getAnyWorld(this.worldId);
    const mapMode: 'normal' | 'abstract' | 'corrupt' =
      isCorruptWorld(this.worldId) ? 'corrupt'
        : getAbstractWorld(this.worldId) ? 'abstract' : 'normal';
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

    this.add.text(cx, 26, `${world.emoji}   ${world.name.toUpperCase()}`, {
      fontSize: '28px', fontFamily: FONT_DISPLAY,
      color: hex(mix(world.color, 0xffffff, 0.55)),
      stroke: hex(mix(world.color, 0x000000, 0.82)), strokeThickness: 5,
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── Progress readout ────────────────────────────────────────────
    const fightNodes = getFightNodes(world);
    const cleared = fightNodes.filter((n) => CP.isFightCompleted(this.slotIdx, this.worldId, n.id)).length;
    const challengeDone = CP.isChallengeCompleted(this.slotIdx, this.worldId);
    const progress = challengeDone
      ? '★  WORLD CLEARED'
      : `${cleared} / ${fightNodes.length} FIGHTS CLEARED   ·   OPTIONAL CHALLENGE ${cleared === fightNodes.length ? 'OPEN' : 'LOCKED'}`;
    this.add.text(cx, 51, progress, {
      fontSize: '10px', fontFamily: FONT_DISPLAY,
      color: challengeDone ? T.gold : T.dim, letterSpacing: 2.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    addChip(this, {
      x: width - 14, y: 20, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`,
      accent: 0x2ee6c0, originX: 1, fontSize: 12, depth: DEPTH.content,
    });
    addChip(this, {
      x: width - 14, y: 46, icon: '🗝️', value: `${CP.getKeys(this.slotIdx)}`,
      accent: C.gold, originX: 1, fontSize: 12, depth: DEPTH.content,
    });

    const back = () => this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: mapMode });
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // ── Path between fight nodes ────────────────────────────────────
    const lineGfx = this.add.graphics().setDepth(DEPTH.panel);
    for (let i = 0; i < fightNodes.length - 1; i++) {
      const done = CP.isFightCompleted(this.slotIdx, this.worldId, fightNodes[i].id);
      this.drawPath(lineGfx, fightNodes[i], fightNodes[i + 1], done ? C.gold : world.color, done ? 0.85 : 0.5);
    }
    const lastFight = fightNodes[fightNodes.length - 1];
    const challengeNode = world.nodes.find((n) => n.kind === 'challenge');
    if (lastFight && challengeNode) {
      const open = CP.isChallengeUnlocked(this.slotIdx, this.worldId);
      this.drawPath(lineGfx, lastFight, challengeNode, open ? C.corrupt : C.line, open ? 0.85 : 0.4);
    }

    this.buildInfoStrip(cx, height, world.color);

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

  // ── Hover briefing ────────────────────────────────────────────────

  private buildInfoStrip(cx: number, height: number, worldColor: number): void {
    const y = height - 44;
    addWell(this, cx, y, 660, 52, worldColor, DEPTH.panel, 8);
    this.infoTitle = this.add.text(cx, y - 11, '', {
      fontSize: '13px', fontFamily: FONT_DISPLAY,
      color: hex(mix(worldColor, 0xffffff, 0.6)), letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.infoBody = this.add.text(cx, y + 10, '', {
      fontSize: '10.5px', fontFamily: FONT_UI, color: T.dim,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.infoDefault = 'Hover a node to scout it   ·   five fights opens the next worlds   ·   the Challenge is optional';
    this.setInfo('', this.infoDefault);

    // First visit: the Herald introduces the world.
    maybePlayStory(this, this.slotIdx, `world-enter:${this.worldId}`);
  }

  private setInfo(title: string, body: string): void {
    this.infoTitle?.setText(title);
    this.infoBody?.setText(body);
  }

  private clearInfo(): void {
    this.setInfo('', this.infoDefault);
  }

  /** The one-line scouting report shown while a node is hovered. */
  private infoForNode(node: WorldNode): { title: string; body: string } {
    if (node.kind === 'shop') {
      const stock = getItemsForElement(this.worldId);
      const cheapest = stock.reduce((m, i) => Math.min(m, i.priceSparks), Infinity);
      return {
        title: '🛒  WORLD SHOP',
        body: stock.length === 0
          ? 'Nothing stocked in this world.'
          : `${stock.length} items stocked   ·   from ⚡${cheapest}   ·   you hold ⚡${CP.getSparks(this.slotIdx)}`,
      };
    }
    if (node.kind === 'invasion') {
      return { title: '👾  INVASION', body: 'Endless husk waves. Pays 🔴 Corrupt Shards. Always open.' };
    }
    if (node.kind === 'gauntlet') {
      const done = CP.isGauntletCompleted(this.slotIdx, this.worldId);
      return {
        title: '🏆  GAUNTLET',
        body: done
          ? 'Already conquered — run it again for the practice.'
          : 'Five randomised bouts and a boss, back to back.',
      };
    }

    const def = getCampaignFightDef(node.id);
    if (!def) return { title: node.id.toUpperCase(), body: '' };

    const unlocked = node.kind === 'challenge'
      ? CP.isChallengeUnlocked(this.slotIdx, this.worldId)
      : CP.isFightUnlocked(this.slotIdx, this.worldId, node.id);
    if (!unlocked) {
      return {
        title: '🔒  LOCKED',
        body: node.kind === 'challenge'
          ? 'Clear every fight in this world first. Optional — the next worlds open without it.'
          : 'Win the fight before it first.',
      };
    }

    // A world with a Sovereign ends on a boss, not a mutation rematch.
    if (node.kind === 'challenge') {
      const boss = getWorldBossDef(this.worldId);
      if (boss) {
        const reward = getCampaignReward(this.worldId, node.id, true, false);
        return {
          title: `👑  ${boss.name.toUpperCase()}`,
          body: [
            boss.title,
            `${boss.phases.length} phases${boss.hard?.extraPhase ? ' (+1 on Hard)' : ''}`,
            `⚡${reward.sparks}  🗝️${reward.keys}`,
            'optional — keys open the Portal',
          ].join('   ·   '),
        };
      }
    }

    const elem = ELEMENT_DISPLAY[def.enemyElementId];
    const muts = (def.mutations ?? []).map((id) => {
      const m = getMutationDef(id);
      if (!m) return id;
      return `${def.starredMutations?.includes(id) ? '★' : ''}${m.emoji} ${m.name}`;
    });
    const reward = getCampaignReward(this.worldId, node.id, node.kind === 'challenge', false);
    const bits = [
      `vs ${elem ? `${elem.emoji} ${elem.name}` : def.enemyElementId}`,
      (DIFFICULTY_LABEL[def.difficulty] ?? String(def.difficulty)).toUpperCase(),
      muts.length > 0 ? muts.join(' + ') : 'no mutations',
      `⚡${reward.sparks}${reward.keys > 0 ? `  🗝️${reward.keys}` : ''}`,
    ];
    // Challenges are bonus content — say so, and say what the keys buy.
    if (node.kind === 'challenge') bits.push('optional — keys open the Portal');
    return { title: (def.name ?? node.id).toUpperCase(), body: bits.join('   ·   ') };
  }

  private drawNode(node: WorldNode, worldColor: number): void {
    const slot = this.slotIdx;
    const worldId = this.worldId;

    if (node.kind === 'fight') {
      const fightIndex = parseInt(node.id.split('-fight-')[1] ?? '1', 10);
      const unlocked = CP.isFightUnlocked(slot, worldId, node.id);
      const completed = CP.isFightCompleted(slot, worldId, node.id);

      this.buildNode({
        node,
        x: node.x, y: node.y, r: 29,
        accent: worldColor,
        glyph: `${fightIndex}`,
        glyphIsText: true,
        label: 'FIGHT',
        caption: unlocked ? getCampaignFightDef(node.id)?.name : undefined,
        unlocked, completed,
        onClick: () => this.openFightMenu(node.id, false),
      });
      return;
    }

    const style = NODE_STYLES[node.kind];
    if (!style) return;

    if (node.kind === 'shop') {
      this.buildNode({
        node,
        x: node.x, y: node.y, r: style.radius,
        accent: style.accent, glyph: style.glyph, label: style.label,
        unlocked: true, completed: false,
        onClick: () => this.openShopMenu(),
      });
      return;
    }

    if (node.kind === 'challenge') {
      const unlocked = CP.isChallengeUnlocked(slot, worldId);
      const boss = getWorldBossDef(worldId);
      this.buildNode({
        node,
        x: node.x, y: node.y, r: style.radius,
        accent: style.accent,
        glyph: boss ? '👑' : style.glyph,
        label: boss ? 'BOSS' : style.label,
        caption: unlocked ? (boss?.name ?? getCampaignFightDef(node.id)?.name) : undefined,
        unlocked,
        completed: CP.isChallengeCompleted(slot, worldId),
        onClick: () => this.openFightMenu(node.id, true),
      });
      return;
    }

    // Invasion and gauntlet nodes are always open.
    this.buildNode({
      node,
      x: node.x, y: node.y, r: style.radius,
      accent: style.accent, glyph: style.glyph, label: style.label,
      unlocked: true,
      completed: node.kind === 'gauntlet' && CP.isGauntletCompleted(slot, worldId),
      onClick: () => this.openFightMenu(node.id, false, node.kind),
    });
  }

  /**
   * Shared node chrome: hex plate, glyph, caption, and — once cleared — a gold
   * ring plus a crown of diamonds on the upper faces.
   */
  private buildNode(opts: {
    node: WorldNode;
    x: number; y: number; r: number; accent: number;
    glyph: string; glyphIsText?: boolean; label: string; caption?: string;
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

    // The bout's own name sits under the plate, so the path reads as a sequence of
    // named encounters rather than five numbered circles.
    if (opts.caption) {
      this.add.text(x, y + r + 11, opts.caption.toUpperCase(), {
        fontSize: '8.5px', fontFamily: FONT_DISPLAY,
        color: completed ? T.gold : T.faint, letterSpacing: 0.8,
        align: 'center', wordWrap: { width: 120 },
      }).setOrigin(0.5, 0).setDepth(DEPTH.content);
    }

    // Locked nodes still report themselves — knowing what is ahead is the point.
    const hit = this.add.circle(x, y, r, 0xffffff, 0)
      .setDepth(DEPTH.content + 1)
      .setInteractive({ useHandCursor: unlocked });
    hit.on('pointerover', () => {
      if (unlocked) { paint(true); label.setColor(T.bright); }
      const info = this.infoForNode(opts.node);
      this.setInfo(info.title, info.body);
    });
    hit.on('pointerout', () => {
      if (unlocked) { paint(false); label.setColor(hex(mix(accent, 0xffffff, 0.55))); }
      this.clearInfo();
    });
    if (unlocked) hit.on('pointerdown', opts.onClick);
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
