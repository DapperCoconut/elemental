import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ALL_UPGRADES, getElementUpgrades, UpgradeDef } from '../data/Upgrades';
import { GAUNTLET_COST, GAUNTLET_HARD_COST } from '../data/GauntletData';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP, ABSTRACT_MIX_ELEMENT_IDS } from '../data/AbstractElements';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate,
  addBackdrop, addBackButton, addButton, addChip, addHeaderBar, addModal, addPanel, addPagerButton,
  addSectionLabel, addCardPlate, addWell, fillDiamond, fillNotchedGradient, strokeNotched, ALL_CORNERS,
} from '../ui';

const ELEMENT_COLORS: Record<string, number> = {
  fire:        0xff4400,
  water:       0x0088ff,
  life:        0x44cc44,
  air:         0xaaddff,
  earth:       0x887755,
  oil:         0x664400,
  shadow:      0x330044,
  ice:         0x88ccff,
  growth:      0x88bb22,
  crystal:     0x88ccff,
  soul:        0xccaaff,
  hunt:        0xcc4400,
  sand:        0xffdd44,
  gravity:     0x8844cc,
  creation:    0xcc6622,
  electricity: 0xffee00,
  slime:       0x66cc44,
  fate:        0x88eecc,
  sound:       0x44bbff,
  light:       0xffffff,
  magnet:      0xcc2244,
  metal:       0xaabbcc,
  plasma:      0xdd66ff,
};

const ELEMENT_EMOJIS: Record<string, string> = {
  fire:        '🔥',
  water:       '💧',
  life:        '🌿',
  air:         '💨',
  earth:       '🪨',
  oil:         '🛢️',
  shadow:      '🌑',
  ice:         '🧊',
  growth:      '🦠',
  crystal:     '💎',
  soul:        '👻',
  hunt:        '🐺',
  sand:        '⏳',
  gravity:     '🌌',
  creation:    '⚒️',
  electricity: '⚡',
  slime:       '🟢',
  fate:        '🃏',
  sound:       '🔊',
  light:       '✨',
  magnet:      '🧲',
  metal:       '⚙️',
  plasma:      '🔮',
};

const BASE_ELEMENT_IDS = ['fire', 'water', 'life', 'air', 'earth'];
const LAB_UPGRADE_COST = 500;

const SLOT_KEYS = ['click', 'e', 'r', 'f', 'q'];
const SLOT_DISPLAY = ['LMB', 'E', 'R', 'F', 'Q'];
const SHARD_PRICES = [10, 20, 35, 50, 75];
const CORRUPT_PRICES = [100, 200, 350, 500, 750];

const LAB_UPGRADES: { level: number; name: string; description: string; cost?: number; corruptCost?: number }[] = [
  { level: 1, name: 'Abstract Fusion', description: 'Fuse two Abstract Elements together in the Lab (costs 3 nuclei). Mismatched fusions waste 1 nucleus.' },
  { level: 2, name: 'Resonant Core', description: 'Forge Perks — toggle the Lab to Perk Mode and combine 3 base elements into a per-element Perk (2 ⚛️ each). One Perk can be equipped per element on the select screen.' },
  { level: 3, name: 'Apex Synthesis', description: 'Unlocks the Quad Perk Forge in the Lab — combine all 4 other base elements into a powerful quad perk (5 ⚛️ each).' },
  { level: 4, name: 'Penta Synthesis', description: 'Unlocks the Penta Perk Forge — combine all 5 base elements into a legendary perk (10 ⚛️ each).', cost: 2500, corruptCost: 10000 },
];

/** Which currency a shop page trades in. */
type Currency = 'shards' | 'corrupt';

export class ShopScene extends Phaser.Scene {
  private currentPage = 0;
  private shardChip!: { setValue: (v: string) => void };
  private nucleiChip!: { setValue: (v: string) => void };
  /** Everything belonging to the open slot-detail card, torn down on close. */
  private detailObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data: { page?: number }): void {
    this.currentPage = data?.page ?? 0;
    this.detailObjects = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Page routing ─────────────────────────────────────────────
    const combinedIds = ALL_UPGRADES
      .map((e) => e.elementId)
      .filter((id) => !BASE_ELEMENT_IDS.includes(id) && !ABSTRACT_ELEMENT_IDS.includes(id) && !ABSTRACT_MIX_ELEMENT_IDS.includes(id) && PlayerData.isElementUnlocked(id));
    const COMBINED_PER_PAGE = 5;
    const totalCombinedPages = combinedIds.length > 0 ? Math.ceil(combinedIds.length / COMBINED_PER_PAGE) : 0;
    const abstractIds = ABSTRACT_ELEMENT_IDS.filter(
      (id) => PlayerData.getCompletedGauntlets().includes(ABSTRACT_ELEMENT_UNLOCK_MAP[id]) &&
               ALL_UPGRADES.some((e) => e.elementId === id),
    );
    const mixIds = ABSTRACT_MIX_ELEMENT_IDS.filter((id) => PlayerData.isElementUnlocked(id) && ALL_UPGRADES.some((e) => e.elementId === id));
    // Page 0 = base, 1..totalCombined = combined, ABSTRACT_PAGE = abstract, MIX_PAGE = abstract-mix, SPECIALS_PAGE = specials
    const ABSTRACT_PAGE = 1 + totalCombinedPages;
    const MIX_PAGE = ABSTRACT_PAGE + 1;
    const SPECIALS_PAGE = MIX_PAGE + 1;
    const totalPages = SPECIALS_PAGE + 1;

    // Each page carries its own accent, so where you are is legible at a glance.
    const pageInfo: { name: string; accent: number } =
      this.currentPage === 0 ? { name: 'BASE ELEMENTS', accent: C.frost } :
      this.currentPage === ABSTRACT_PAGE ? { name: 'ABSTRACT', accent: C.corrupt } :
      this.currentPage === MIX_PAGE ? { name: 'ABSTRACT MIX', accent: C.corrupt } :
      this.currentPage === SPECIALS_PAGE ? { name: 'SPECIALS', accent: C.gold } :
      { name: `COMBINED  ${this.currentPage} / ${totalCombinedPages}`, accent: C.arcane };

    addBackdrop(this, { accent: pageInfo.accent, variant: 'lattice', motes: 14 });

    const header = addHeaderBar(this, {
      title: 'SHOP',
      subtitle: pageInfo.name,
      accent: pageInfo.accent,
      height: 72,
    });

    // Currency rail, top right.
    this.shardChip = addChip(this, {
      x: width - 18, y: 22, icon: '💎', value: `${PlayerData.getShards()}`,
      accent: C.gold, originX: 1,
    });
    this.nucleiChip = addChip(this, {
      x: width - 18, y: 52, icon: '⚛️', value: `×${PlayerData.getNuclei()}`,
      accent: C.arcane, originX: 1, fontSize: 13,
    });
    addChip(this, {
      x: width - 130, y: 52, icon: '🩸', value: `${PlayerData.getCorruptShards()}`,
      accent: C.corrupt, originX: 1, fontSize: 13,
    });

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.detailObjects.length > 0) this.closeSlotDetail();
      else back();
    });

    if (this.currentPage > 0) {
      addPagerButton(this, {
        x: cx - 132, y: 36, dir: 'left', accent: pageInfo.accent,
        onClick: () => this.scene.restart({ page: this.currentPage - 1 }),
      });
    }
    if (this.currentPage < totalPages - 1) {
      addPagerButton(this, {
        x: cx + 132, y: 36, dir: 'right', accent: pageInfo.accent,
        onClick: () => this.scene.restart({ page: this.currentPage + 1 }),
      });
    }

    // Page pips, so the shop's depth is visible.
    const pips = this.add.graphics().setDepth(DEPTH.content);
    for (let i = 0; i < totalPages; i++) {
      const px = cx - ((totalPages - 1) * 11) / 2 + i * 11;
      fillDiamond(pips, px, header.bottom + 6, i === this.currentPage ? 4 : 2.5,
        i === this.currentPage ? mix(pageInfo.accent, 0xffffff, 0.5) : C.line, i === this.currentPage ? 1 : 0.7);
    }

    const contentTop = header.bottom + 18;

    // ── Page bodies ──────────────────────────────────────────────
    if (this.currentPage === SPECIALS_PAGE) {
      this.buildSpecialsPage(width, cx, contentTop);
      return;
    }

    // One shared hint beats repeating a description on all 25 tiles. Only
    // drawn once a page actually has columns to click.
    const columnsTop = header.bottom + 32;
    const showClickHint = () => {
      this.add.text(cx, header.bottom + 18, 'CLICK A SLOT TO SEE WHAT IT DOES', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    };

    if (this.currentPage === ABSTRACT_PAGE || this.currentPage === MIX_PAGE) {
      const ids = this.currentPage === ABSTRACT_PAGE ? abstractIds : mixIds;
      const emptyMsg = this.currentPage === ABSTRACT_PAGE
        ? 'Complete a Gauntlet to unlock Abstract Elements.\nTheir upgrades are bought with 🩸 corrupt shards.'
        : 'Fuse two Abstract Elements in the LAB to unlock Abstract-Mix.\nTheir upgrades are bought with 🩸 corrupt shards.';
      if (ids.length === 0) {
        this.buildEmptyState(cx, height / 2, emptyMsg, pageInfo.accent);
        return;
      }
      showClickHint();
      this.buildColumns(width, columnsTop, ALL_UPGRADES.filter((e) => ids.includes(e.elementId)).map((e) => e.elementId), 'corrupt');
      return;
    }

    let elementIds: string[];
    if (this.currentPage === 0) {
      elementIds = ALL_UPGRADES.filter((e) => BASE_ELEMENT_IDS.includes(e.elementId)).map((e) => e.elementId);
    } else {
      const startIdx = (this.currentPage - 1) * COMBINED_PER_PAGE;
      const pageIds = combinedIds.slice(startIdx, startIdx + COMBINED_PER_PAGE);
      elementIds = ALL_UPGRADES.filter((e) => pageIds.includes(e.elementId)).map((e) => e.elementId);
    }

    if (elementIds.length === 0) {
      this.buildEmptyState(cx, height / 2,
        'No unlocked elements on this page.\nDiscover combined elements in the LAB.', pageInfo.accent);
      return;
    }

    showClickHint();
    this.buildColumns(width, columnsTop, elementIds, 'shards');
  }

  private buildEmptyState(cx: number, cy: number, message: string, accent: number): void {
    const panel = addPanel(this, { x: cx, y: cy, w: 520, h: 150, accent, glow: 0.25 });
    this.add.text(cx, panel.top + 46, '⌀', {
      fontSize: '30px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0x000000, 0.3)),
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, panel.top + 96, message, {
      fontSize: '14px', fontFamily: FONT_UI, color: T.dim, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content);
  }

  /**
   * One column per element, five ability-slot plates beneath its crest.
   *
   * Shard and corrupt-shard pages differ only in price table and wallet, so
   * they share this builder rather than keeping two near-identical copies.
   */
  private buildColumns(width: number, top: number, elementIds: string[], currency: Currency): void {
    const colW = Math.floor(width / elementIds.length);
    const crestH = 46;
    const slotH = 80;
    const slotGap = 6;

    elementIds.forEach((elementId, colIdx) => {
      const colCX = colIdx * colW + colW / 2;
      const accent = ELEMENT_COLORS[elementId] ?? C.steel;
      const emoji = ELEMENT_EMOJIS[elementId] ?? '?';
      const upgrades = getElementUpgrades(elementId);

      // ── Element crest ────────────────────────────────────────
      const crestG = this.add.graphics().setDepth(DEPTH.panel);
      const cx0 = colCX - (colW - 10) / 2;
      fillNotchedGradient(crestG, cx0, top, colW - 10, crestH,
        tintPlate(accent, 0.4), mix(tintPlate(accent, 0.2), 0x000000, 0.4), 1, 10, ALL_CORNERS, 12);
      strokeNotched(crestG, cx0, top, colW - 10, crestH, accent, 0.85, 2, 10, ALL_CORNERS);
      crestG.fillStyle(accent, 0.9);
      crestG.fillRect(cx0 + 10, top + crestH - 3, colW - 30, 3);

      this.add.text(colCX, top + 15, emoji, { fontSize: '18px' }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(colCX, top + 34, elementId.toUpperCase(), {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      // ── Slots ────────────────────────────────────────────────
      const firstSlotY = top + crestH + 8;

      SLOT_KEYS.forEach((slot, slotIdx) => {
        const by = firstSlotY + slotIdx * (slotH + slotGap) + slotH / 2;
        const upgDef: UpgradeDef | undefined = upgrades.find((u) => u.slot === slot);
        const defaultPrice = currency === 'shards' ? SHARD_PRICES[slotIdx] : CORRUPT_PRICES[slotIdx];
        const price = upgDef?.price ?? defaultPrice;

        const owned = PlayerData.isUpgradeOwned(elementId, slot);
        const active = PlayerData.isUpgradeActive(elementId, slot);

        // State drives the whole plate: green when live, red when shelved,
        // element-coloured when purchasable, dead grey when unimplemented.
        const stateAccent = !upgDef ? C.steel
          : owned && active ? C.verdant
          : owned ? C.blood
          : accent;

        const plate = addCardPlate(this, {
          x: colCX, y: by, w: colW - 14, h: slotH,
          accent: stateAccent, cut: 10, depth: DEPTH.panel, muted: !upgDef,
        });

        const left = colCX - (colW - 14) / 2;

        // Key cap, top-left of the plate.
        const capG = this.add.graphics().setDepth(DEPTH.content);
        fillNotchedGradient(capG, left + 7, by - slotH / 2 + 6, 30, 15,
          mix(stateAccent, 0x000000, 0.55), mix(stateAccent, 0x000000, 0.78), 1, 4, ALL_CORNERS, 4);
        strokeNotched(capG, left + 7, by - slotH / 2 + 6, 30, 15, stateAccent, 0.6, 1, 4, ALL_CORNERS);
        this.add.text(left + 22, by - slotH / 2 + 14, SLOT_DISPLAY[slotIdx], {
          fontSize: '9px', fontFamily: FONT_DISPLAY,
          color: hex(mix(stateAccent, 0xffffff, 0.55)), letterSpacing: 1,
        }).setOrigin(0.5).setDepth(DEPTH.content + 1);

        if (!upgDef) {
          this.add.text(colCX, by + 4, 'COMING SOON', {
            fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 1.5,
          }).setOrigin(0.5).setDepth(DEPTH.content);
          return;
        }

        // Name only — what the upgrade *does* lives in the detail card, so a
        // full page of 25 slots stays scannable.
        this.add.text(colCX, by - 2, upgDef.name, {
          fontSize: '12px', fontFamily: FONT_DISPLAY,
          color: hex(mix(stateAccent, 0xffffff, 0.6)),
          wordWrap: { width: colW - 30 }, align: 'center', lineSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.content);

        const statusStr = owned
          ? (active ? '● ACTIVE' : '○ SHELVED')
          : `${currency === 'shards' ? '💎' : '🩸'} ${price}`;
        this.add.text(colCX, by + slotH / 2 - 11, statusStr, {
          fontSize: '10px', fontFamily: FONT_DISPLAY,
          color: owned
            ? (active ? T.good : T.bad)
            : hex(mix(currency === 'shards' ? C.gold : C.corrupt, 0xffffff, 0.3)),
          letterSpacing: 1,
        }).setOrigin(0.5).setDepth(DEPTH.content);

        const hit = this.add.rectangle(colCX, by, colW - 14, slotH, 0xffffff, 0)
          .setDepth(DEPTH.content + 2)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => plate.paint('hover'));
        hit.on('pointerout', () => plate.paint('idle'));
        hit.on('pointerdown', () => this.openSlotDetail({
          elementId, elementAccent: accent, emoji,
          slot, slotLabel: SLOT_DISPLAY[slotIdx],
          def: upgDef, price, currency,
        }));
      });

      // Column footer: how much of this element's kit you own.
      const ownedCount = SLOT_KEYS.filter((slot) => PlayerData.isUpgradeOwned(elementId, slot)).length;
      const definedCount = SLOT_KEYS.filter((slot) => upgrades.some((u) => u.slot === slot)).length;
      const footY = firstSlotY + SLOT_KEYS.length * (slotH + slotGap) + 8;
      this.add.text(colCX, footY, `${ownedCount} / ${definedCount} OWNED`, {
        fontSize: '9px', fontFamily: FONT_DISPLAY,
        color: ownedCount === definedCount && definedCount > 0 ? T.good : T.faint,
        letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    });
  }

  /**
   * Detail card for one ability slot: the full description plus the buy /
   * equip / shelve action.
   *
   * Purchases and toggles now live here rather than on the grid tile, which is
   * what lets the grid drop to name-and-price and stay readable.
   */
  private openSlotDetail(opts: {
    elementId: string;
    elementAccent: number;
    emoji: string;
    slot: string;
    slotLabel: string;
    def: UpgradeDef;
    price: number;
    currency: Currency;
  }): void {
    this.closeSlotDetail();

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const { elementId, slot, def, price, currency } = opts;

    const owned = PlayerData.isUpgradeOwned(elementId, slot);
    const active = PlayerData.isUpgradeActive(elementId, slot);
    const wallet = currency === 'shards' ? PlayerData.getShards() : PlayerData.getCorruptShards();
    const coin = currency === 'shards' ? '💎' : '🩸';
    const coinAccent = currency === 'shards' ? C.gold : C.corrupt;
    const canAfford = wallet >= price;

    const accent = owned ? (active ? C.verdant : C.blood) : opts.elementAccent;

    const modal = addModal(this, {
      w: 520, h: 330, accent, glow: 0.5,
      title: `${opts.emoji}  ${elementId.toUpperCase()}   ·   [ ${opts.slotLabel} ]`,
      onScrimClick: () => this.closeSlotDetail(),
    });
    this.detailObjects.push(modal.scrim, ...modal.objects);

    this.detailObjects.push(this.add.text(cx, modal.contentTop + 34, def.name, {
      fontSize: '24px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.65)), letterSpacing: 1,
      wordWrap: { width: 460 }, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    this.detailObjects.push(this.add.text(cx, modal.contentTop + 86, def.description, {
      fontSize: '15px', fontFamily: FONT_UI, color: T.normal,
      wordWrap: { width: 440 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));

    // Price / wallet ledger — only meaningful before you own the upgrade.
    const ledgerY = modal.bottom - 108;
    if (!owned) {
      this.detailObjects.push(addWell(this, cx, ledgerY, 320, 42, coinAccent, DEPTH.modal + 1, 6));
      this.detailObjects.push(this.add.text(cx - 140, ledgerY, 'COST', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx - 100, ledgerY, `${coin} ${price}`, {
        fontSize: '16px', fontFamily: FONT_DISPLAY, color: hex(mix(coinAccent, 0xffffff, 0.4)),
      }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx + 140, ledgerY, `YOU HAVE  ${coin} ${wallet}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: canAfford ? T.good : T.bad, letterSpacing: 0.5,
      }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent));
    } else {
      this.detailObjects.push(this.add.text(cx, ledgerY, active ? '● ACTIVE THIS MATCH' : '○ SHELVED', {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: active ? T.good : T.bad, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    }

    const commit = (fn: () => void) => {
      fn();
      this.scene.restart({ page: this.currentPage });
    };

    const actionY = modal.bottom - 46;
    if (!owned) {
      this.detailObjects.push(addButton(this, {
        x: cx - 78, y: actionY, w: 200, h: 48,
        label: 'BUY', icon: coin,
        sublabel: canAfford ? undefined : 'Not enough',
        accent: canAfford ? C.verdant : C.steel,
        variant: canAfford ? 'solid' : 'quiet',
        fontSize: 18, depth: DEPTH.modalContent,
        disabled: !canAfford,
        onClick: () => commit(() => {
          const paid = currency === 'shards'
            ? PlayerData.spendShards(price)
            : PlayerData.spendCorruptShards(price);
          if (paid) PlayerData.purchaseUpgrade(elementId, slot);
        }),
      }).container);
    } else {
      this.detailObjects.push(addButton(this, {
        x: cx - 78, y: actionY, w: 200, h: 48,
        label: active ? 'SHELVE' : 'EQUIP',
        icon: active ? '○' : '●',
        accent: active ? C.blood : C.verdant,
        variant: active ? 'danger' : 'solid',
        fontSize: 18, depth: DEPTH.modalContent,
        onClick: () => commit(() => PlayerData.toggleUpgrade(elementId, slot)),
      }).container);
    }

    this.detailObjects.push(addButton(this, {
      x: cx + 148, y: actionY, w: 150, h: 48,
      label: 'CLOSE', icon: '✕', accent: C.steel, variant: 'quiet',
      fontSize: 14, depth: DEPTH.modalContent,
      onClick: () => this.closeSlotDetail(),
    }).container);
  }

  private closeSlotDetail(): void {
    for (const obj of this.detailObjects) obj.destroy();
    this.detailObjects = [];
  }

  // ── Specials ───────────────────────────────────────────────────

  private buildSpecialsPage(width: number, cx: number, top: number): void {
    const labLevel = PlayerData.getLabLevel();
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const panelW = Math.min(660, width - 100);

    addSectionLabel(this, { x: cx, y: top + 8, text: '⚗  LAB UPGRADES', accent: C.arcane, width: panelW });

    let y = top + 34;
    const rowH = 62;

    LAB_UPGRADES.forEach((upg) => {
      const owned = labLevel >= upg.level;
      const available = labLevel >= upg.level - 1;
      const accent = owned ? C.verdant : available ? C.arcane : C.steel;

      const cost = upg.cost ?? LAB_UPGRADE_COST;
      const corruptCost = upg.corruptCost ?? 0;
      const statusText = owned ? 'OWNED'
        : available ? (corruptCost > 0 ? `💎 ${cost}  +  🩸 ${corruptCost}` : `💎 ${cost}`)
        : 'LOCKED';

      const canBuy = available && !owned;

      addButton(this, {
        x: cx, y: y + rowH / 2, w: panelW, h: rowH,
        label: `LV.${upg.level}  ${upg.name.toUpperCase()}`,
        sublabel: upg.description,
        icon: owned ? '✔' : available ? '⚗' : '🔒',
        trailing: statusText,
        trailingColor: owned ? T.good : available ? T.gold : T.ghost,
        accent,
        variant: owned ? 'ghost' : canBuy ? 'solid' : 'quiet',
        fontSize: 14,
        align: 'left',
        disabled: !canBuy,
        onClick: () => {
          if (corruptCost > 0) {
            if (PlayerData.getShards() >= cost && PlayerData.getCorruptShards() >= corruptCost) {
              PlayerData.spendShards(cost);
              PlayerData.spendCorruptShards(corruptCost);
              PlayerData.upgradelab();
              this.scene.restart({ page: this.currentPage });
            }
          } else if (PlayerData.spendShards(cost)) {
            PlayerData.upgradelab();
            this.scene.restart({ page: this.currentPage });
          }
        },
      });

      y += rowH + 8;
    });

    // ── Nucleus ──────────────────────────────────────────────────
    y += 12;
    addSectionLabel(this, { x: cx, y, text: '⚛  ELEMENTAL NUCLEUS', accent: C.arcane, width: panelW });
    y += 24;

    addButton(this, {
      x: cx, y: y + 24, w: 400, h: 48,
      label: 'BUY NUCLEUS', sublabel: 'Fuel for Lab fusions',
      icon: '⚛️', trailing: '💎 100',
      accent: C.arcane, variant: 'ghost', fontSize: 16, align: 'left',
      onClick: () => {
        if (PlayerData.spendShards(100)) {
          PlayerData.addNuclei(1);
          this.nucleiChip.setValue(`×${PlayerData.getNuclei()}`);
          this.shardChip.setValue(`${PlayerData.getShards()}`);
        }
      },
    });
    y += 60;

    // ── Gauntlets ────────────────────────────────────────────────
    y += 12;
    addSectionLabel(this, { x: cx, y, text: '🏆  GAUNTLETS', accent: C.gold, width: panelW });
    y += 24;

    const hardUnlocked = PlayerData.isGauntletHardUnlocked();

    if (!gauntletUnlocked) {
      addButton(this, {
        x: cx, y: y + 24, w: 400, h: 48,
        label: 'UNLOCK GAUNTLETS', sublabel: 'Six fights, one life',
        icon: '🏆', trailing: `💎 ${GAUNTLET_COST}`,
        accent: C.gold, variant: 'ghost', fontSize: 16, align: 'left',
        onClick: () => {
          if (PlayerData.spendShards(GAUNTLET_COST)) {
            PlayerData.unlockGauntlet();
            this.scene.restart({ page: this.currentPage });
          }
        },
      });
    } else if (!hardUnlocked) {
      addButton(this, {
        x: cx, y: y + 24, w: 400, h: 48,
        label: 'UNLOCK HARD MODE', sublabel: 'Deadlier foes, richer spoils',
        icon: '🔥', trailing: `💎 ${GAUNTLET_HARD_COST}`,
        accent: C.corrupt, variant: 'ghost', fontSize: 16, align: 'left',
        onClick: () => {
          if (PlayerData.spendShards(GAUNTLET_HARD_COST)) {
            PlayerData.unlockGauntletHard();
            this.scene.restart({ page: this.currentPage });
          }
        },
      });
    } else {
      addButton(this, {
        x: cx, y: y + 24, w: 400, h: 48,
        label: 'ALL UNLOCKED', sublabel: 'Gauntlets + Hard Mode',
        icon: '✔', accent: C.verdant, variant: 'ghost', fontSize: 16, align: 'left',
        disabled: true,
      });
    }
  }
}
