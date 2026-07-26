import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';
import * as CP from '../data/CampaignProgress';
import { getItemsForElement } from '../data/Items';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addChip, addIconButton, addModal, addRowPlate,
} from '../ui';

export class CampaignShopScene extends Phaser.Scene {
  private worldId = 'fire';
  private slotIdx: 0 | 1 | 2 = 0;

  constructor() {
    super({ key: 'CampaignShopScene' });
  }

  init(data: { worldId: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.slotIdx = data?.slotIdx ?? 0;
  }

  create(): void {
    const { height } = this.scale;
    const world = getAnyWorld(this.worldId);
    const slotIdx = this.slotIdx;
    const accent = C.gold;
    const panelW = 560;

    const panel = addModal(this, {
      w: panelW, h: 442, accent,
      title: '🛒  WORLD SHOP',
      subtitle: world ? `${world.name.toUpperCase()} WORLD` : undefined,
      glow: 0.5,
    });
    const cx = (panel.left + panel.right) / 2;

    const sparkChip = addChip(this, {
      x: cx + panelW / 2 - 62, y: panel.top + 26, icon: '⚡',
      value: `${CP.getSparks(slotIdx)}`, accent: 0x2ee6c0, originX: 1,
      depth: DEPTH.modalContent,
    });

    addIconButton(this, {
      x: cx + panelW / 2 - 30, y: panel.top + 26, r: 15, icon: '🎒', accent: 0x2ee6c0,
      depth: DEPTH.modalContent, tooltip: 'Inventory',
      onClick: () => {
        this.scene.pause();
        this.scene.launch('InventoryScene', { slotIdx, callerKey: this.scene.key });
      },
    });

    // ── Stock ───────────────────────────────────────────────────────
    const items = getItemsForElement(this.worldId);
    const rowH = 62;
    const rowW = panelW - 44;
    const rowStartY = panel.contentTop + 22 + rowH / 2;

    if (items.length === 0) {
      this.add.text(cx, height / 2, 'The shelves are bare in this world.', {
        fontSize: '14px', fontFamily: FONT_UI, color: T.faint,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    }

    items.forEach((def, i) => {
      const rowY = rowStartY + i * (rowH + 8);
      const inventory = CP.getInventory(slotIdx);
      const owned = inventory[def.id] ?? 0;
      const affordable = CP.getSparks(slotIdx) >= def.priceSparks;

      const row = addRowPlate(this, {
        x: cx, y: rowY, w: rowW, h: rowH,
        accent: affordable ? accent : C.steel,
        muted: !affordable,
        depth: DEPTH.modal + 1,
      });

      const left = cx - rowW / 2;
      this.add.text(left + 26, rowY, def.emoji, { fontSize: '26px' })
        .setOrigin(0.5).setDepth(DEPTH.modalContent);
      this.add.text(left + 52, rowY - 11, def.name, {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 0.5,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(left + 52, rowY + 11, def.shortDesc, {
        fontSize: '11px', fontFamily: FONT_UI, color: T.dim,
        wordWrap: { width: rowW - 180 },
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

      this.add.text(left + rowW - 18, rowY - 10, `⚡ ${def.priceSparks}`, {
        fontSize: '14px', fontFamily: FONT_DISPLAY,
        color: affordable ? '#7cf5d8' : T.ghost,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
      this.add.text(left + rowW - 18, rowY + 11, `OWNED ${owned}`, {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);

      const hit = this.add.rectangle(cx, rowY, rowW, rowH, 0xffffff, 0)
        .setDepth(DEPTH.modalContent + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => row.paint(true));
      hit.on('pointerout', () => row.paint(false));
      hit.on('pointerdown', () => {
        if (CP.spendSparks(slotIdx, def.priceSparks)) {
          CP.addItem(slotIdx, def.id);
          this.scene.restart({ worldId: this.worldId, slotIdx });
        } else {
          // Flash the wallet rather than the row — the shortfall is the point.
          sparkChip.container.setAlpha(1);
          this.tweens.add({
            targets: sparkChip.container, alpha: 0.25,
            duration: 110, yoyo: true, repeat: 2,
          });
        }
      });
    });

    addButton(this, {
      x: cx, y: panel.bottom - 34, w: 180, h: 40,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 14,
      depth: DEPTH.modalContent,
      onClick: () => this.close(),
    });

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldScene');
  }
}
