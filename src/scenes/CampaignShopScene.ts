import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { getItemsForElement, describeEffect, ItemDef } from '../data/Items';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addChip, addIconButton, addModal, addRowPlate, addWell, fillDiamond, showToast,
} from '../ui';

const ROW_H = 88;
const ROW_GAP = 10;
const PANEL_W = 620;

/**
 * The world shop. Each world stocks three items themed to its element; the mechanical
 * read-out under every name is generated from the item's own `ItemEffect`, so the shelf
 * can never describe something the item doesn't do.
 */
export class CampaignShopScene extends Phaser.Scene {
  private worldId = 'fire';
  private slotIdx: 0 | 1 | 2 = 0;

  private sparkChip!: { container: Phaser.GameObjects.Container; setValue: (v: string) => void };
  private ownedLabels = new Map<string, Phaser.GameObjects.Text>();
  private priceLabels = new Map<string, Phaser.GameObjects.Text>();
  private rowPlates = new Map<string, { paint: (hover: boolean) => void }>();

  constructor() {
    super({ key: 'CampaignShopScene' });
  }

  init(data: { worldId: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    const world = getAnyWorld(this.worldId);
    const slotIdx = this.slotIdx;
    const accent = C.gold;
    const worldTint = world?.color ?? accent;

    this.ownedLabels.clear();
    this.priceLabels.clear();
    this.rowPlates.clear();

    const items = getItemsForElement(this.worldId);
    const panelH = 132 + Math.max(1, items.length) * (ROW_H + ROW_GAP) + 44;

    const panel = addModal(this, {
      w: PANEL_W, h: panelH, accent,
      title: '🛒  WORLD SHOP',
      subtitle: world ? `${world.name.toUpperCase()}  ·  STOCKED BY THIS WORLD ALONE` : undefined,
      glow: 0.5,
    });
    const cx = (panel.left + panel.right) / 2;

    this.sparkChip = addChip(this, {
      x: cx + PANEL_W / 2 - 64, y: panel.top + 26, icon: '⚡',
      value: `${CP.getSparks(slotIdx)}`, accent: 0x2ee6c0, originX: 1,
      depth: DEPTH.modalContent,
    });

    addIconButton(this, {
      x: cx + PANEL_W / 2 - 32, y: panel.top + 26, r: 15, icon: '🎒', accent: 0x2ee6c0,
      depth: DEPTH.modalContent, tooltip: 'Inventory',
      onClick: () => {
        this.scene.pause();
        this.scene.launch('InventoryScene', { slotIdx, callerKey: this.scene.key });
      },
    });

    // A hairline in the world's own colour under the header, so each shop feels local.
    const rule = this.add.graphics().setDepth(DEPTH.modal + 2);
    rule.lineStyle(1, worldTint, 0.35);
    rule.beginPath();
    rule.moveTo(cx - PANEL_W / 2 + 30, panel.contentTop + 6);
    rule.lineTo(cx + PANEL_W / 2 - 30, panel.contentTop + 6);
    rule.strokePath();
    fillDiamond(rule, cx, panel.contentTop + 6, 3, mix(worldTint, 0xffffff, 0.5), 0.85);

    if (items.length === 0) {
      this.add.text(cx, panel.contentTop + 90, 'The shelves are bare in this world.', {
        fontSize: '14px', fontFamily: FONT_UI, color: T.faint,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    }

    const rowW = PANEL_W - 48;
    const rowStartY = panel.contentTop + 26 + ROW_H / 2;
    items.forEach((def, i) => this.buildRow(def, cx, rowStartY + i * (ROW_H + ROW_GAP), rowW, accent));

    addButton(this, {
      x: cx, y: panel.bottom - 34, w: 180, h: 40,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 14,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private buildRow(def: ItemDef, cx: number, rowY: number, rowW: number, accent: number): void {
    const slotIdx = this.slotIdx;
    const left = cx - rowW / 2;

    const row = addRowPlate(this, {
      x: cx, y: rowY, w: rowW, h: ROW_H, accent, depth: DEPTH.modal + 1,
    });
    this.rowPlates.set(def.id, row);

    // Emblem well keeps the glyph from floating loose on the plate.
    addWell(this, left + 44, rowY, 56, 56, accent, DEPTH.modal + 2, 8);
    this.add.text(left + 44, rowY, def.emoji, { fontSize: '30px' })
      .setOrigin(0.5).setDepth(DEPTH.modalContent);

    const textX = left + 84;
    const textW = rowW - 84 - 118;

    this.add.text(textX, rowY - 26, def.name, {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 0.5,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

    this.add.text(textX, rowY - 7, def.flavor, {
      fontSize: '10.5px', fontFamily: FONT_UI, color: T.faint,
      wordWrap: { width: textW },
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

    // The mechanical truth, generated straight from the effect object.
    this.add.text(textX, rowY + 22, describeEffect(def.effect).join('   ·   '), {
      fontSize: '11px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.45)), letterSpacing: 0.3,
      wordWrap: { width: textW },
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

    const priceLbl = this.add.text(left + rowW - 20, rowY - 14, `⚡ ${def.priceSparks}`, {
      fontSize: '16px', fontFamily: FONT_DISPLAY,
    }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
    this.priceLabels.set(def.id, priceLbl);

    const ownedLbl = this.add.text(left + rowW - 20, rowY + 8, '', {
      fontSize: '9.5px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
    this.ownedLabels.set(def.id, ownedLbl);

    this.add.text(left + rowW - 20, rowY + 26, 'CLICK TO BUY', {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 1.5,
    }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);

    const hit = this.add.rectangle(cx, rowY, rowW, ROW_H, 0xffffff, 0)
      .setDepth(DEPTH.modalContent + 1)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => row.paint(true));
    hit.on('pointerout', () => row.paint(false));
    hit.on('pointerdown', () => this.buy(def));

    this.refreshRow(def);
  }

  private buy(def: ItemDef): void {
    if (CP.spendSparks(this.slotIdx, def.priceSparks)) {
      CP.addItem(this.slotIdx, def.id);
      showToast(this, `${def.emoji}  ${def.name} purchased`, { accent: C.gold });
      this.refreshAll();
    } else {
      // Flash the wallet rather than the row — the shortfall is the point.
      this.sparkChip.container.setAlpha(1);
      this.tweens.add({
        targets: this.sparkChip.container, alpha: 0.25,
        duration: 110, yoyo: true, repeat: 2,
      });
      showToast(this, 'Not enough Sparks', { accent: C.blood });
    }
  }

  private refreshAll(): void {
    this.sparkChip.setValue(`${CP.getSparks(this.slotIdx)}`);
    for (const def of getItemsForElement(this.worldId)) this.refreshRow(def);
  }

  private refreshRow(def: ItemDef): void {
    const owned = CP.getInventory(this.slotIdx)[def.id] ?? 0;
    const affordable = CP.getSparks(this.slotIdx) >= def.priceSparks;
    this.priceLabels.get(def.id)?.setColor(affordable ? '#7cf5d8' : T.ghost);
    this.ownedLabels.get(def.id)?.setText(owned > 0 ? `IN BAG  ×${owned}` : 'NOT OWNED');
    this.ownedLabels.get(def.id)?.setColor(owned > 0 ? T.gold : T.ghost);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldScene');
  }
}
