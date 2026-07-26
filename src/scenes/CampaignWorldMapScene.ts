import Phaser from 'phaser';
import { WORLDS, World } from '../data/Worlds';
import { ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { drawWorldMapBackground, drawAbstractWorldMapBackground } from './CampaignBackground';
import { addInventoryButton } from './InventoryScene';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addChip, fillDiamond, fillHex, strokeHex,
} from '../ui';

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
    const accent = isAbstract ? C.arcane : C.ember;

    // The painted map art stays — only the chrome over it is restyled.
    const bgFn = isAbstract ? drawAbstractWorldMapBackground : drawWorldMapBackground;
    bgFn(this, width, height).setDepth(DEPTH.backdrop);

    // ── Title plaque ────────────────────────────────────────────────
    // A floating banner rather than a full header bar, so the map art below it
    // stays visible.
    const plaque = this.add.graphics().setDepth(DEPTH.panel);
    plaque.fillStyle(0x04040c, 0.55);
    plaque.fillRect(0, 0, width, 62);
    plaque.lineStyle(2, accent, 0.5);
    plaque.beginPath(); plaque.moveTo(60, 62); plaque.lineTo(width - 60, 62); plaque.strokePath();
    fillDiamond(plaque, cx, 62, 5, mix(accent, 0xffffff, 0.4), 0.95);

    this.add.text(cx, 24, isAbstract ? 'ABSTRACT REALM' : 'WORLD MAP', {
      fontSize: '24px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.6)),
      stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 4,
      letterSpacing: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const slotName = CP.getSlot(slot)?.name ?? `Slot ${slot + 1}`;
    this.add.text(cx, 46, slotName.toUpperCase(), {
      fontSize: '10px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    addChip(this, {
      x: width - 16, y: 20, icon: '🗝️', value: `${CP.getKeys(slot)}`,
      accent: C.gold, originX: 1, fontSize: 13,
    });
    addChip(this, {
      x: width - 16, y: 48, icon: '⚡', value: `${CP.getSparks(slot)}`,
      accent: 0x2ee6c0, originX: 1, fontSize: 13,
    });

    const back = () => this.scene.start('CampaignSlotSelectScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // SPACE: toggle between normal and abstract map (only if portal is unlocked)
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.scene.isPaused()) return;
      if (!CP.isPortalUnlocked(this.slotIdx)) return;
      this.scene.start('CampaignWorldMapScene', {
        slotIdx: this.slotIdx,
        mode: this.mode === 'normal' ? 'abstract' : 'normal',
      });
    });

    // ── Connector lines (below the nodes) ───────────────────────────
    const lineGfx = this.add.graphics().setDepth(DEPTH.panel);
    for (const world of worlds) {
      if (!world.parentId) continue;
      const parent = worlds.find((w) => w.id === world.parentId);
      if (!parent) continue;
      const unlocked = CP.isWorldUnlocked(slot, world.id);

      // Twin-stroke path: a dark casing with a lit core, so routes read as
      // channels rather than pencil lines.
      lineGfx.lineStyle(6, 0x04040c, unlocked ? 0.75 : 0.5);
      lineGfx.beginPath(); lineGfx.moveTo(parent.mapX, parent.mapY); lineGfx.lineTo(world.mapX, world.mapY); lineGfx.strokePath();
      lineGfx.lineStyle(2, unlocked ? mix(accent, 0xffffff, 0.25) : C.line, unlocked ? 0.8 : 0.35);
      lineGfx.beginPath(); lineGfx.moveTo(parent.mapX, parent.mapY); lineGfx.lineTo(world.mapX, world.mapY); lineGfx.strokePath();

      // Waypoint pip at the midpoint of an open route.
      if (unlocked) {
        fillDiamond(lineGfx, (parent.mapX + world.mapX) / 2, (parent.mapY + world.mapY) / 2, 3, mix(accent, 0xffffff, 0.5), 0.8);
      }
    }

    for (const world of worlds) {
      this.drawWorldNode(world, slot, accent);
    }

    addInventoryButton(this, this.slotIdx, DEPTH.content + 5);

    // ── Portal (normal map only) ────────────────────────────────────
    if (!isAbstract) {
      const portalUnlocked = CP.isPortalUnlocked(slot);
      addButton(this, {
        x: cx, y: 578, w: 230, h: 52,
        label: 'PORTAL', icon: '🌀',
        sublabel: portalUnlocked ? 'SPACE to cross realms' : 'Purchase to cross realms',
        accent: C.arcane, variant: portalUnlocked ? 'solid' : 'ghost',
        fontSize: 19, align: 'left',
        onClick: () => {
          this.scene.pause();
          this.scene.launch('CampaignPortalScene', { slotIdx: this.slotIdx });
        },
      });
    }
  }

  /**
   * A world as a hex node: element-coloured plate, glyph, and a ring that turns
   * gold once the world's challenge is cleared.
   */
  private drawWorldNode(world: World, slot: 0 | 1 | 2, accent: number): void {
    const unlocked = CP.isWorldUnlocked(slot, world.id);
    const allFightsDone = CP.isChallengeCompleted(slot, world.id);
    const r = 30;
    const ringColor = allFightsDone ? C.gold : (unlocked ? mix(world.color, 0xffffff, 0.4) : C.line);

    const g = this.add.graphics().setDepth(DEPTH.panel + 1);

    const paint = (hot: boolean): void => {
      g.clear();
      if (unlocked) {
        for (let k = 4; k >= 1; k--) {
          g.fillStyle(world.color, hot ? 0.07 : 0.04);
          g.fillCircle(world.mapX, world.mapY, r + k * 5);
        }
      }
      fillHex(g, world.mapX, world.mapY, r,
        unlocked ? mix(world.color, 0x000000, hot ? 0.28 : 0.45) : mix(C.plate, 0x000000, 0.45),
        unlocked ? 0.96 : 0.7);
      strokeHex(g, world.mapX, world.mapY, r, hot ? 0xffffff : ringColor, unlocked ? 1 : 0.5, hot ? 3 : 2);
      strokeHex(g, world.mapX, world.mapY, r - 5, world.color, unlocked ? 0.35 : 0.12, 1);
      if (allFightsDone) {
        // Cleared worlds wear a crown of diamonds on the upper hex faces.
        for (const a of [-Math.PI / 2, -Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05]) {
          fillDiamond(g, world.mapX + Math.cos(a) * (r + 6), world.mapY + Math.sin(a) * (r + 6), 3, C.gold, 0.9);
        }
      }
    };
    paint(false);

    const emoji = this.add.text(world.mapX, world.mapY - 7, unlocked ? world.emoji : '🔒', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(DEPTH.content).setAlpha(unlocked ? 1 : 0.55);
    void emoji;

    const nameText = this.add.text(world.mapX, world.mapY + 15, world.name.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY,
      color: unlocked ? T.bright : T.ghost, letterSpacing: 0.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (!unlocked) return;

    const hit = this.add.circle(world.mapX, world.mapY, r, 0xffffff, 0)
      .setDepth(DEPTH.content + 1)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(true); nameText.setColor(hex(mix(accent, 0xffffff, 0.6))); });
    hit.on('pointerout', () => { paint(false); nameText.setColor(T.bright); });
    hit.on('pointerdown', () => {
      this.scene.start('CampaignWorldScene', { worldId: world.id, slotIdx: this.slotIdx, mode: this.mode });
    });
  }
}
