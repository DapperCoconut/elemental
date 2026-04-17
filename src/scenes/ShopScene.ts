import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ALL_UPGRADES, getElementUpgrades, UpgradeDef } from '../data/Upgrades';
import { GAUNTLET_COST } from '../data/GauntletData';

const ELEMENT_COLORS: Record<string, number> = {
  fire:     0xff4400,
  water:    0x0088ff,
  life:     0x44cc44,
  air:      0xaaddff,
  earth:    0x887755,
  oil:      0x664400,
  shadow:   0x330044,
  ice:      0x88ccff,
  growth:   0x88bb22,
  crystal:  0x88ccff,
  soul:     0xccaaff,
  hunt:     0xcc4400,
  sand:     0xffdd44,
  gravity:  0x8844cc,
  creation: 0xcc6622,
};

const ELEMENT_EMOJIS: Record<string, string> = {
  fire:     '🔥',
  water:    '💧',
  life:     '🌿',
  air:      '💨',
  earth:    '🪨',
  oil:      '🛢️',
  shadow:   '🌑',
  ice:      '🧊',
  growth:   '🦠',
  crystal:  '💎',
  soul:     '👻',
  hunt:     '🐺',
  sand:     '⏳',
  gravity:  '🌌',
  creation: '⚒️',
};

const BASE_ELEMENT_IDS = ['fire', 'water', 'life', 'air', 'earth'];
const LAB_UPGRADE_COST = 500;

const LAB_UPGRADES = [
  { level: 1, name: 'Abstract Fusion', description: 'Fuse two Abstract Elements together in the Lab (costs 3 nuclei). Mismatched fusions waste 1 nucleus.' },
  { level: 2, name: 'Resonant Core', description: 'Coming soon — further Lab enhancements.' },
  { level: 3, name: 'Apex Synthesis', description: 'Coming soon — master-level Lab upgrades.' },
];

export class ShopScene extends Phaser.Scene {
  private shardText!: Phaser.GameObjects.Text;
  private nucleiText!: Phaser.GameObjects.Text;
  private currentPage = 0;

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data: { page?: number }): void {
    this.currentPage = data?.page ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Header
    this.add.text(cx, 36, 'SHOP', {
      fontSize: '40px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
      stroke: '#333333',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Shard counter
    this.shardText = this.add.text(width - 16, 12, '', {
      fontSize: '18px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44',
    }).setOrigin(1, 0);
    this.refreshShardDisplay();

    // Nucleus counter
    this.nucleiText = this.add.text(width - 16, 38, `⚛️ ×${PlayerData.getNuclei()}`, {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff',
    }).setOrigin(1, 0);

    // Corrupt shard counter
    this.add.text(width - 16, 60, `🩸 ${PlayerData.getCorruptShards()}`, {
      fontSize: '14px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc44ff',
    }).setOrigin(1, 0);

    // Back button
    const backBtn = this.add
      .rectangle(52, 36, 88, 36, 0x222233)
      .setStrokeStyle(1, 0x555577)
      .setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    backBtn
      .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); })
      .on('pointerout', () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    // ── Page navigation ──────────────────────────────────────────
    const combinedIds = ALL_UPGRADES
      .map((e) => e.elementId)
      .filter((id) => !BASE_ELEMENT_IDS.includes(id) && PlayerData.isElementUnlocked(id));
    const COMBINED_PER_PAGE = 5;
    const totalCombinedPages = combinedIds.length > 0 ? Math.ceil(combinedIds.length / COMBINED_PER_PAGE) : 0;
    // Page 0 = base elements, pages 1..totalCombinedPages = combined, last page = specials
    const SPECIALS_PAGE = 1 + totalCombinedPages;
    const totalPages = SPECIALS_PAGE + 1;
    const hasNextPage = this.currentPage < totalPages - 1;
    const hasPrevPage = this.currentPage > 0;

    if (hasPrevPage) {
      const leftBtn = this.add.rectangle(cx - 90, 36, 28, 28, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      this.add.text(cx - 90, 36, '◀', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      leftBtn
        .on('pointerover', () => leftBtn.setFillStyle(0x550099))
        .on('pointerout',  () => leftBtn.setFillStyle(0x330066))
        .on('pointerdown', () => this.scene.restart({ page: this.currentPage - 1 }));
    }

    if (hasNextPage) {
      const rightBtn = this.add.rectangle(cx + 90, 36, 28, 28, 0x330066)
        .setStrokeStyle(1, 0x9944ff).setInteractive({ useHandCursor: true });
      this.add.text(cx + 90, 36, '▶', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
      }).setOrigin(0.5).setDepth(1);
      rightBtn
        .on('pointerover', () => rightBtn.setFillStyle(0x550099))
        .on('pointerout',  () => rightBtn.setFillStyle(0x330066))
        .on('pointerdown', () => this.scene.restart({ page: this.currentPage + 1 }));
    }

    // Page indicator for specials
    if (this.currentPage === SPECIALS_PAGE) {
      this.add.text(cx, 36, '⚙️ SPECIALS', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc44',
      }).setOrigin(0.5);
    }

    // ── Specials page ──────────────────────────────────────────────
    if (this.currentPage === SPECIALS_PAGE) {
      this.buildSpecialsPage(width, height, cx);
      return;
    }

    // ── Element columns ──────────────────────────────────────────
    let elements;
    if (this.currentPage === 0) {
      elements = ALL_UPGRADES.filter((e) => BASE_ELEMENT_IDS.includes(e.elementId));
    } else {
      const startIdx = (this.currentPage - 1) * COMBINED_PER_PAGE;
      const pageIds = combinedIds.slice(startIdx, startIdx + COMBINED_PER_PAGE);
      elements = ALL_UPGRADES.filter((e) => pageIds.includes(e.elementId));
    }

    const colW = elements.length > 0 ? Math.floor(width / elements.length) : width;
    const colStartY = 80;

    if (elements.length === 0) {
      this.add.text(cx, height / 2, 'No unlocked elements on this page.\nDiscover combined elements in the LAB.', {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#555577', align: 'center',
      }).setOrigin(0.5);
    }

    elements.forEach((elemUpgrades, colIdx) => {
      const elementId = elemUpgrades.elementId;
      const colCX = colIdx * colW + colW / 2;
      const color = ELEMENT_COLORS[elementId] ?? 0x888888;
      const emoji = ELEMENT_EMOJIS[elementId] ?? '?';
      const upgrades = getElementUpgrades(elementId);

      // Element header card
      this.add.rectangle(colCX, colStartY + 28, colW - 8, 50, color, 0.2)
        .setStrokeStyle(1, color);
      this.add.text(colCX, colStartY + 18, `${emoji} ${elementId.toUpperCase()}`, {
        fontSize: '13px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Slot buttons
      const SLOT_KEYS    = ['click', 'e', 'r', 'f', 'q'];
      const SLOT_DISPLAY = ['Click', 'E', 'R', 'F', 'Q'];
      const SLOT_PRICES  = [10, 20, 35, 50, 75];

      const btnW = colW - 16;
      const btnH = 82;
      const btnGap = 6;
      const firstBtnY = colStartY + 60;

      SLOT_KEYS.forEach((slot, slotIdx) => {
        const bx = colCX;
        const by = firstBtnY + slotIdx * (btnH + btnGap) + btnH / 2;
        const upgDef: UpgradeDef | undefined = upgrades.find((u) => u.slot === slot);
        const price = upgDef?.price ?? SLOT_PRICES[slotIdx];

        const owned         = PlayerData.isUpgradeOwned(elementId, slot);
        const active        = PlayerData.isUpgradeActive(elementId, slot);
        const hasUpgradeDef = upgDef !== undefined;

        let fillColor   = 0x1a1a1a;
        let borderColor = 0x333333;
        let labelColor  = '#555555';

        if (owned && active) {
          fillColor = 0x0d2b0d; borderColor = 0x33aa33; labelColor = '#44ff44';
        } else if (owned && !active) {
          fillColor = 0x2b0d0d; borderColor = 0xaa3333; labelColor = '#ff4444';
        } else if (hasUpgradeDef) {
          fillColor = 0x1a1a2b; borderColor = 0x444466; labelColor = '#aaaaaa';
        }

        const btn = this.add
          .rectangle(bx, by, btnW, btnH, fillColor)
          .setStrokeStyle(1, borderColor);

        this.add.text(bx, by - 26, `[${SLOT_DISPLAY[slotIdx]}]`, {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#666666',
        }).setOrigin(0.5);

        if (hasUpgradeDef && upgDef) {
          this.add.text(bx, by - 12, upgDef.name, {
            fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: labelColor,
          }).setOrigin(0.5);

          this.add.text(bx, by + 6, upgDef.description, {
            fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#777777',
            wordWrap: { width: btnW - 8 }, align: 'center',
          }).setOrigin(0.5);

          const statusStr = owned
            ? (active ? 'ACTIVE — click to disable' : 'OWNED — click to enable')
            : `💎 ${price} shards`;
          this.add.text(bx, by + 32, statusStr, {
            fontSize: '9px', fontFamily: 'Arial, sans-serif',
            color: owned ? (active ? '#33aa33' : '#aa3333') : '#ffcc44',
          }).setOrigin(0.5);

          btn.setInteractive({ useHandCursor: true });
          btn
            .on('pointerover', () => btn.setStrokeStyle(2, 0xffffff))
            .on('pointerout',  () => btn.setStrokeStyle(1, borderColor))
            .on('pointerdown', () => {
              if (!PlayerData.isUpgradeOwned(elementId, slot)) {
                if (PlayerData.spendShards(price)) {
                  PlayerData.purchaseUpgrade(elementId, slot);
                  this.scene.restart({ page: this.currentPage });
                }
              } else {
                PlayerData.toggleUpgrade(elementId, slot);
                this.scene.restart({ page: this.currentPage });
              }
            });
        } else {
          this.add.text(bx, by, 'Coming Soon', {
            fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#333333',
          }).setOrigin(0.5);
        }
      });
    });
  }

  private buildSpecialsPage(width: number, height: number, cx: number): void {
    const labLevel = PlayerData.getLabLevel();
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();

    let y = 90;

    // ── Lab Upgrades section ──────────────────────────────────────
    this.add.text(cx, y, '⚗️  LAB UPGRADES', {
      fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5);
    y += 32;

    LAB_UPGRADES.forEach((upg) => {
      const owned = labLevel >= upg.level;
      const available = labLevel >= upg.level - 1;
      const fillColor = owned ? 0x1a2b1a : (available ? 0x1a1a2b : 0x111111);
      const borderColor = owned ? 0x33aa33 : (available ? 0x9944ff : 0x333333);
      const labelColor = owned ? '#44ff44' : (available ? '#cc88ff' : '#444444');

      const btnH = 64;
      const btnW = Math.min(600, width - 80);
      const btn = this.add.rectangle(cx, y + btnH / 2, btnW, btnH, fillColor)
        .setStrokeStyle(2, borderColor);

      this.add.text(cx - btnW / 2 + 16, y + 14, `⚗️ Lab Level ${upg.level}: ${upg.name}`, {
        fontSize: '14px', fontFamily: '"Arial Black", sans-serif', color: labelColor,
      }).setOrigin(0, 0.5);

      this.add.text(cx - btnW / 2 + 16, y + 38, upg.description, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#777799',
        wordWrap: { width: btnW - 140 },
      }).setOrigin(0, 0.5);

      const statusText = owned
        ? 'OWNED'
        : (available ? `💎 ${LAB_UPGRADE_COST} shards` : 'Requires previous level');
      this.add.text(cx + btnW / 2 - 16, y + btnH / 2, statusText, {
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif',
        color: owned ? '#33aa33' : (available ? '#ffcc44' : '#555555'),
      }).setOrigin(1, 0.5);

      if (available && !owned) {
        btn.setInteractive({ useHandCursor: true });
        btn
          .on('pointerover', () => btn.setStrokeStyle(2, 0xffffff))
          .on('pointerout',  () => btn.setStrokeStyle(2, borderColor))
          .on('pointerdown', () => {
            if (PlayerData.spendShards(LAB_UPGRADE_COST)) {
              PlayerData.upgradelab();
              this.scene.restart({ page: this.currentPage });
            }
          });
      }

      y += btnH + 10;
    });

    y += 20;

    // ── Nucleus purchase ──────────────────────────────────────────
    this.add.text(cx, y, '⚛️  ELEMENTAL NUCLEUS', {
      fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5);
    y += 28;

    const nucBtnH = 52;
    const nucBtnW = 340;
    const nucBtn = this.add.rectangle(cx, y + nucBtnH / 2, nucBtnW, nucBtnH, 0x220044)
      .setStrokeStyle(2, 0x9944ff).setInteractive({ useHandCursor: true });
    this.add.text(cx, y + nucBtnH / 2, '⚛️  Buy Elemental Nucleus  —  💎 100 shards', {
      fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#cc88ff',
    }).setOrigin(0.5);
    nucBtn
      .on('pointerover', () => nucBtn.setFillStyle(0x440088))
      .on('pointerout',  () => nucBtn.setFillStyle(0x220044))
      .on('pointerdown', () => {
        if (PlayerData.spendShards(100)) {
          PlayerData.addNuclei(1);
          this.nucleiText.setText(`⚛️ ×${PlayerData.getNuclei()}`);
          this.refreshShardDisplay();
        }
      });

    y += nucBtnH + 20;

    // ── Gauntlet unlock ───────────────────────────────────────────
    this.add.text(cx, y, '🏆  GAUNTLETS', {
      fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc66',
    }).setOrigin(0.5);
    y += 28;

    const gauntBtnH = 52;
    const gauntBtnW = 340;
    if (gauntletUnlocked) {
      const gauntOwned = this.add.rectangle(cx, y + gauntBtnH / 2, gauntBtnW, gauntBtnH, 0x1a2b0d)
        .setStrokeStyle(2, 0x33aa33);
      void gauntOwned;
      this.add.text(cx, y + gauntBtnH / 2, '✅  Gauntlets Unlocked', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#44ff44',
      }).setOrigin(0.5);
    } else {
      const gauntBtn = this.add.rectangle(cx, y + gauntBtnH / 2, gauntBtnW, gauntBtnH, 0x221100)
        .setStrokeStyle(2, 0xffaa00).setInteractive({ useHandCursor: true });
      this.add.text(cx, y + gauntBtnH / 2, `🏆  Unlock Gauntlets  —  💎 ${GAUNTLET_COST} shards`, {
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc66',
      }).setOrigin(0.5);
      gauntBtn
        .on('pointerover', () => gauntBtn.setFillStyle(0x442200))
        .on('pointerout',  () => gauntBtn.setFillStyle(0x221100))
        .on('pointerdown', () => {
          if (PlayerData.spendShards(GAUNTLET_COST)) {
            PlayerData.unlockGauntlet();
            this.scene.restart({ page: this.currentPage });
          }
        });
    }
  }

  private refreshShardDisplay(): void {
    this.shardText.setText(`💎 ${PlayerData.getShards()}`);
  }
}
