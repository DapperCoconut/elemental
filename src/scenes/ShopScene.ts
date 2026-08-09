import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ALL_UPGRADES, getElementUpgrades, UpgradeDef } from '../data/Upgrades';
import { UpgradeGate, isUpgradeUnlocked, upgradeGate } from '../data/UpgradeUnlocks';
import { GAUNTLET_COST, GAUNTLET_HARD_COST } from '../data/GauntletData';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP, ABSTRACT_MIX_ELEMENT_IDS } from '../data/AbstractElements';
import { allSelectableElements, findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate,
  addBackdrop, addBackButton, addButton, addChip, addHeaderBar, addModal, addPanel, addPagerButton,
  addSectionLabel, addCardPlate, addWell, fillDiamond, fillNotchedGradient, strokeNotched, ALL_CORNERS,
  drawGlow, drawOrnateRule,
} from '../ui';
import { Music, Sfx } from '../audio';

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
  passion:     0xff5fa2,
  chalk:       0xf4f1e6,
  illusion:    0xb45cff,
  depths:      0x0e8f9c,
  ruin:        0xc4392c,
  paper:       0xf2ead6,
  death:       0x4a4468,
  quantum:     0x7df9ff,
  gum:         0x46b93f,
  bind:        0xe0b743,
  radiation:   0x7cff3d,
  psychic:     0x9b4dff,
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
  passion:     '💘',
  chalk:       '🖍️',
  illusion:    '🎭',
  depths:      '🐟',
  ruin:        '🚧',
  paper:       '📄',
  death:       '⚰️',
  quantum:     '⚛️',
  gum:         '🫠',
  bind:        '⛓️',
  radiation:   '☢️',
  psychic:     '👁️',
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

/** Perks that must have been forged (across all elements) before the door opens. */
const DOOR_PERK_REQUIREMENT = 10;
/** The door's near-black violet — corrupt pushed most of the way to the void. */
const DOOR_ACCENT = mix(C.corrupt, 0x000000, 0.55);

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
    Music.play('shop');
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Page routing ─────────────────────────────────────────────
    // What the shop stocks is decided by the same roster the element-select screens use, not
    // by `PlayerData.isElementUnlocked` on its own. The two disagree: a cheat profile is
    // minted once and never topped up, so `unlockedFinaleElements()`/`TEST_ELEMENTS` hand out
    // Quantum, Slime, Bind and friends on the strength of the mode alone. Asking the save
    // directly left those elements playable but unshoppable — you could field a Quantum and
    // never find the plate that sells it Third State.
    const playable = new Set(allSelectableElements().map((e) => e.id));
    const combinedIds = ALL_UPGRADES
      .map((e) => e.elementId)
      .filter((id) => !BASE_ELEMENT_IDS.includes(id) && !ABSTRACT_ELEMENT_IDS.includes(id) && !ABSTRACT_MIX_ELEMENT_IDS.includes(id) && playable.has(id));
    const COMBINED_PER_PAGE = 5;
    const totalCombinedPages = combinedIds.length > 0 ? Math.ceil(combinedIds.length / COMBINED_PER_PAGE) : 0;
    const abstractIds = ABSTRACT_ELEMENT_IDS.filter(
      (id) => (playable.has(id) || PlayerData.getCompletedGauntlets().includes(ABSTRACT_ELEMENT_UNLOCK_MAP[id])) &&
               ALL_UPGRADES.some((e) => e.elementId === id),
    );
    const mixIds = ABSTRACT_MIX_ELEMENT_IDS.filter((id) => playable.has(id) && ALL_UPGRADES.some((e) => e.elementId === id));
    // Page 0 = base, 1..totalCombined = combined, ABSTRACT_PAGE = abstract, MIX_PAGE = abstract-mix,
    // SPECIALS_PAGE = specials, DOOR_PAGE = the room past the end of the shop.
    const ABSTRACT_PAGE = 1 + totalCombinedPages;
    const MIX_PAGE = ABSTRACT_PAGE + 1;
    const SPECIALS_PAGE = MIX_PAGE + 1;
    const DOOR_PAGE = SPECIALS_PAGE + 1;
    const totalPages = DOOR_PAGE + 1;
    // Callers that want "the last page" without knowing how many combined pages
    // the save has (backing out of the door, for one) just pass a big number.
    this.currentPage = Math.max(0, Math.min(this.currentPage, totalPages - 1));

    // Each page carries its own accent, so where you are is legible at a glance.
    const pageInfo: { name: string; accent: number } =
      this.currentPage === 0 ? { name: 'BASE ELEMENTS', accent: C.frost } :
      this.currentPage === ABSTRACT_PAGE ? { name: 'ABSTRACT', accent: C.corrupt } :
      this.currentPage === MIX_PAGE ? { name: 'ABSTRACT MIX', accent: C.corrupt } :
      this.currentPage === SPECIALS_PAGE ? { name: 'SPECIALS', accent: C.gold } :
      this.currentPage === DOOR_PAGE ? { name: '? ? ?', accent: DOOR_ACCENT } :
      { name: `COMBINED  ${this.currentPage} / ${totalCombinedPages}`, accent: C.arcane };

    // The door page drops the lattice for a near-empty void — the shop's
    // machined chrome stops at its threshold.
    const isDoorPage = this.currentPage === DOOR_PAGE;
    addBackdrop(this, {
      accent: pageInfo.accent,
      variant: isDoorPage ? 'void' : 'lattice',
      motes: isDoorPage ? 6 : 14,
    });

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

    // Something somebody left on the floor. Drawn before the page body so the
    // early-returning pages (the door, specials, empty states) get it too.
    this.maybeDrawScrewdriver(width, height, totalPages);

    const contentTop = header.bottom + 18;

    // ── Page bodies ──────────────────────────────────────────────
    if (isDoorPage) {
      this.buildDoorPage(width, height, cx);
      return;
    }

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

  // ── The screwdriver ────────────────────────────────────────────

  /**
   * A screwdriver lying along the bottom edge of exactly one shop page.
   *
   * Which page is drawn once per save and then never moves, so hunting it is a
   * matter of walking the shop rather than re-rolling a page until it appears.
   * It is deliberately quiet — no label, no glow, no hint text. The tell is the
   * four screws already visible on every difficulty plate in the fight menu;
   * this is the thing that turns them.
   */
  private maybeDrawScrewdriver(width: number, height: number, totalPages: number): void {
    if (PlayerData.isScrewdriverFound()) return;
    if (PlayerData.getScrewdriverPage(totalPages) !== this.currentPage) return;

    // Placement is fixed per page, not per visit — a tool does not wander.
    const rnd = new Phaser.Math.RandomDataGenerator([`screwdriver-${this.currentPage}`]);
    const x = rnd.integerInRange(140, Math.max(160, width - 140));
    const y = height - rnd.integerInRange(14, 26);
    const tilt = rnd.realInRange(-0.22, 0.22);

    const g = this.add.graphics().setDepth(DEPTH.content + 4);
    g.setPosition(x, y);
    g.setRotation(tilt);

    // Handle — a fat amber grip with two moulded ridges.
    g.fillStyle(mix(C.gold, 0x000000, 0.42), 1);
    g.fillRoundedRect(-34, -6, 26, 12, 5);
    g.fillStyle(mix(C.gold, 0x000000, 0.18), 1);
    g.fillRoundedRect(-33, -5, 24, 5, 2);
    g.lineStyle(1, mix(C.gold, 0x000000, 0.65), 0.9);
    g.beginPath(); g.moveTo(-26, -6); g.lineTo(-26, 6); g.strokePath();
    g.beginPath(); g.moveTo(-20, -6); g.lineTo(-20, 6); g.strokePath();

    // Ferrule, shaft, and a flat-head tip.
    g.fillStyle(mix(C.steel, 0xffffff, 0.35), 1);
    g.fillRect(-9, -3.5, 4, 7);
    g.fillStyle(mix(C.steel, 0xffffff, 0.5), 1);
    g.fillRect(-5, -2, 28, 4);
    g.fillStyle(mix(C.steel, 0xffffff, 0.75), 1);
    g.fillRect(-5, -2, 28, 1.4);
    g.fillStyle(mix(C.steel, 0xffffff, 0.6), 1);
    g.fillRect(23, -3, 6, 6);

    // Graphics take no input of their own — see the UI kit's hit-rect rule.
    const hit = this.add.rectangle(x, y, 78, 26, 0xffffff, 0)
      .setDepth(DEPTH.content + 5)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => g.setAlpha(0.75));
    hit.on('pointerout', () => g.setAlpha(1));
    hit.on('pointerdown', () => {
      PlayerData.findScrewdriver();
      Sfx.play('ui-purchase');
      g.destroy();
      hit.destroy();
      this.showScrewdriverFound();
    });
  }

  /** The one moment this thing announces itself. */
  private showScrewdriverFound(): void {
    this.closeSlotDetail();
    const { width, height } = this.scale;
    const cx = width / 2;

    const modal = addModal(this, {
      w: 520, h: 292, accent: C.gold, glow: 0.6,
      title: '🪛  YOU PICKED SOMETHING UP',
      onScrimClick: () => this.closeSlotDetail(),
    });
    this.detailObjects.push(modal.scrim, ...modal.objects);

    this.detailObjects.push(this.add.text(cx, modal.contentTop + 34, 'A SCREWDRIVER', {
      fontSize: '26px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.gold, 0xffffff, 0.6)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    this.detailObjects.push(this.add.text(cx, modal.contentTop + 78,
      'Somebody bolted the difficulty plates down.\n\n'
      + 'They did not bolt them down very well.', {
      fontSize: '15px', fontFamily: FONT_UI, color: T.normal,
      wordWrap: { width: 420 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));

    this.detailObjects.push(addButton(this, {
      x: cx, y: modal.bottom - 46, w: 220, h: 48,
      label: 'POCKET IT', icon: '🪛', accent: C.gold, variant: 'solid',
      fontSize: 17, depth: DEPTH.modalContent,
      onClick: () => this.closeSlotDetail(),
    }).container);
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
      // The two maps above win where they exist — a few shop crests deliberately differ from
      // the roster's (`sand` here is Time, not the Sand element). Anything they never got an
      // entry for falls back to the roster card rather than to a grey '?' plate.
      const rosterDef = findElementDef(elementId);
      const accent = ELEMENT_COLORS[elementId] ?? rosterDef?.color ?? C.steel;
      const emoji = ELEMENT_EMOJIS[elementId] ?? rosterDef?.emoji ?? '?';
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
        // The unstable ten buy their kit back one Corrupt bout at a time. An
        // owned slot is never re-locked — only the right to *buy* is gated.
        const gate = owned ? null : upgradeGate(elementId, slot);
        const gated = !!gate && !isUpgradeUnlocked(elementId, slot);

        // State drives the whole plate: green when live, red when shelved,
        // element-coloured when purchasable, dead grey when unimplemented or
        // still behind its world.
        const stateAccent = !upgDef ? C.steel
          : owned && active ? C.verdant
          : owned ? C.blood
          : gated ? C.steel
          : accent;

        const plate = addCardPlate(this, {
          x: colCX, y: by, w: colW - 14, h: slotH,
          accent: stateAccent, cut: 10, depth: DEPTH.panel, muted: !upgDef || gated,
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
        // full page of 25 slots stays scannable. A gated slot keeps its name so
        // the player can see what they are working toward.
        this.add.text(colCX, by - 2, upgDef.name, {
          fontSize: '12px', fontFamily: FONT_DISPLAY,
          color: hex(mix(stateAccent, 0xffffff, gated ? 0.35 : 0.6)),
          wordWrap: { width: colW - 30 }, align: 'center', lineSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.content);

        const statusStr = owned
          ? (active ? '● ACTIVE' : '○ SHELVED')
          : gated ? `🔒 ${gate!.stepLabel}`
          : `${currency === 'shards' ? '💎' : '🩸'} ${price}`;
        this.add.text(colCX, by + slotH / 2 - 11, statusStr, {
          fontSize: '10px', fontFamily: FONT_DISPLAY,
          color: owned
            ? (active ? T.good : T.bad)
            : gated ? T.faint
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
          def: upgDef, price, currency, gate: gated ? gate : null,
        }));
      });

      // Column footer: how much of this element's kit you own — and, for the
      // unstable ten, how much of it the Corrupt Realm has handed over at all.
      const ownedCount = SLOT_KEYS.filter((slot) => PlayerData.isUpgradeOwned(elementId, slot)).length;
      const definedCount = SLOT_KEYS.filter((slot) => upgrades.some((u) => u.slot === slot)).length;
      const earnedCount = SLOT_KEYS.filter((slot) => upgrades.some((u) => u.slot === slot)
        && isUpgradeUnlocked(elementId, slot)).length;
      const footY = firstSlotY + SLOT_KEYS.length * (slotH + slotGap) + 8;
      this.add.text(colCX, footY,
        earnedCount < definedCount
          ? `${ownedCount} / ${definedCount} OWNED   ·   ${definedCount - earnedCount} 🔒`
          : `${ownedCount} / ${definedCount} OWNED`, {
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
    /** Set when the Corrupt bout that pays this slot out is still standing. */
    gate?: UpgradeGate | null;
  }): void {
    this.closeSlotDetail();

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const { elementId, slot, def, price, currency } = opts;
    const gate = opts.gate ?? null;

    const owned = PlayerData.isUpgradeOwned(elementId, slot);
    const active = PlayerData.isUpgradeActive(elementId, slot);
    const wallet = currency === 'shards' ? PlayerData.getShards() : PlayerData.getCorruptShards();
    const coin = currency === 'shards' ? '💎' : '🩸';
    const coinAccent = currency === 'shards' ? C.gold : C.corrupt;
    const canAfford = wallet >= price;

    const accent = owned ? (active ? C.verdant : C.blood) : gate ? C.steel : opts.elementAccent;

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

    // Price / wallet ledger — only meaningful before you own the upgrade, and
    // only once the Corrupt Realm has actually handed the slot over.
    const ledgerY = modal.bottom - 108;
    if (gate) {
      this.detailObjects.push(addWell(this, cx, ledgerY, 400, 42, C.corrupt, DEPTH.modal + 1, 6));
      this.detailObjects.push(this.add.text(cx, ledgerY, `🔒  WIN  ${gate.stepLabel}  ·  ${gate.fightName}`, {
        fontSize: '14px', fontFamily: FONT_DISPLAY,
        color: hex(mix(C.corrupt, 0xffffff, 0.55)), letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx, ledgerY + 32,
        `in the Corrupt Realm's ${gate.worldId.toUpperCase()} world`, {
        fontSize: '11px', fontFamily: FONT_UI, color: T.faint,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    } else if (!owned) {
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
    if (gate) {
      this.detailObjects.push(addButton(this, {
        x: cx - 78, y: actionY, w: 200, h: 48,
        label: 'LOCKED', icon: '🔒', sublabel: 'Clear its world',
        accent: C.steel, variant: 'quiet', fontSize: 18,
        depth: DEPTH.modalContent, disabled: true,
        onClick: () => { /* nothing to buy yet */ },
      }).container);
    } else if (!owned) {
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
          Sfx.play(paid ? 'ui-purchase' : 'ui-denied');
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
        onClick: () => commit(() => {
          PlayerData.toggleUpgrade(elementId, slot);
          Sfx.play(active ? 'ui-toggle-off' : 'ui-equip');
        }),
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

  // ── The door ───────────────────────────────────────────────────

  /**
   * The room past the end of the shop.
   *
   * Nothing here is sold. The page holds one thing: a slab of a door set into
   * the far wall, sealed until enough perks have been forged to be worth what
   * is behind it. Locked, it is stone-dead and the counter is the only tell;
   * open, the seams light and the whole frame breathes.
   */
  private buildDoorPage(width: number, height: number, cx: number): void {
    const forged = PlayerData.getTotalForgedPerkCount();
    const open = forged >= DOOR_PERK_REQUIREMENT;
    const kingDown = PlayerData.isKingDefeated();
    const cy = height / 2 + 6;

    // Door metrics — a tall slab, narrow enough to feel like a doorway.
    const dw = 168;
    const dh = 268;
    const left = cx - dw / 2;
    const top = cy - dh / 2;

    const g = this.add.graphics().setDepth(DEPTH.panel);

    // ── Wall recess ──────────────────────────────────────────────
    // A stepped stone arch, so the door sits *in* something rather than
    // floating on the backdrop.
    for (let i = 3; i >= 1; i--) {
      const o = i * 13;
      fillNotchedGradient(g, left - o, top - o, dw + o * 2, dh + o,
        mix(C.plate, DOOR_ACCENT, 0.10 - i * 0.02), mix(C.void_, DOOR_ACCENT, 0.05),
        1, 16 + o, [true, true, false, false], 10);
      strokeNotched(g, left - o, top - o, dw + o * 2, dh + o,
        mix(C.line, DOOR_ACCENT, 0.35), 0.5, 1, 16 + o, [true, true, false, false]);
    }

    // ── Door slab ────────────────────────────────────────────────
    const slabTop = open ? mix(DOOR_ACCENT, 0x000000, 0.25) : mix(C.plate, 0x000000, 0.55);
    const slabBot = mix(C.void_, DOOR_ACCENT, open ? 0.12 : 0.03);
    fillNotchedGradient(g, left, top, dw, dh, slabTop, slabBot, 1, 16, [true, true, false, false], 22);
    strokeNotched(g, left, top, dw, dh,
      open ? mix(C.corrupt, 0xffffff, 0.25) : C.line, open ? 0.9 : 0.5, 2, 16, [true, true, false, false]);

    // Iron banding across the slab — three straps with rivets.
    for (const by of [top + 52, top + 134, top + 216]) {
      g.fillStyle(mix(C.void_, DOOR_ACCENT, open ? 0.22 : 0.06), 1);
      g.fillRect(left + 4, by, dw - 8, 13);
      g.lineStyle(1, open ? mix(C.corrupt, 0xffffff, 0.3) : C.line, open ? 0.6 : 0.35);
      g.strokeRect(left + 4, by, dw - 8, 13);
      for (const rx of [left + 16, left + dw - 16]) {
        fillDiamond(g, rx, by + 6.5, 3.5, open ? mix(C.corrupt, 0xffffff, 0.5) : C.line, open ? 0.9 : 0.5);
      }
    }

    // Centre seam — the two leaves of the door.
    g.lineStyle(1, open ? mix(C.corrupt, 0xffffff, 0.4) : C.lineSoft, open ? 0.55 : 0.4);
    g.beginPath(); g.moveTo(cx, top + 18); g.lineTo(cx, top + dh); g.strokePath();

    // Ring handle, low and heavy.
    g.lineStyle(4, open ? mix(C.corrupt, 0x000000, 0.2) : mix(C.line, 0x000000, 0.2), 1);
    g.strokeCircle(cx, top + 178, 17);
    g.lineStyle(2, open ? mix(C.corrupt, 0xffffff, 0.45) : C.line, open ? 0.85 : 0.45);
    g.strokeCircle(cx, top + 178, 17);

    // ── Sigil in the lintel ──────────────────────────────────────
    // A broken crown — the same motif the King wears.
    const sigilY = top + 24;
    const crownColor = open ? mix(C.corrupt, 0xffffff, 0.55) : mix(C.line, 0x000000, 0.15);
    g.lineStyle(2, crownColor, open ? 0.95 : 0.45);
    g.beginPath();
    g.moveTo(cx - 30, sigilY + 10);
    g.lineTo(cx - 30, sigilY - 4);
    g.lineTo(cx - 15, sigilY + 4);
    g.lineTo(cx, sigilY - 9);
    g.lineTo(cx + 15, sigilY + 4);
    g.lineTo(cx + 30, sigilY - 4);
    g.lineTo(cx + 30, sigilY + 10);
    g.strokePath();
    // The break: the right arm of the crown is snapped off and dropped.
    g.lineStyle(2, crownColor, open ? 0.6 : 0.3);
    g.beginPath(); g.moveTo(cx + 30, sigilY + 10); g.lineTo(cx + 20, sigilY + 14); g.strokePath();

    if (open) {
      // Seam light on its own layer, so only the escaping light breathes —
      // pulsing the slab itself would make the whole wall wobble.
      const lightG = this.add.graphics().setDepth(DEPTH.panel + 1);
      drawGlow(lightG, left, top, dw, dh, C.corrupt, 0.6, 6, 4, 16, [true, true, false, false]);
      for (let k = 5; k >= 1; k--) {
        lightG.fillStyle(C.corrupt, 0.05);
        lightG.fillCircle(cx, sigilY, 12 + k * 7);
      }
      // Under-door spill — light escaping across the threshold.
      for (let i = 0; i < 8; i++) {
        lightG.fillStyle(C.corrupt, 0.10 - i * 0.011);
        lightG.fillRect(left - i * 4, top + dh + i * 2, dw + i * 8, 3);
      }
      this.tweens.add({
        targets: lightG, alpha: { from: 0.55, to: 1 },
        duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Copy ─────────────────────────────────────────────────────
    const ruleG = this.add.graphics().setDepth(DEPTH.content);
    drawOrnateRule(ruleG, cx, cy - dh / 2 - 58, 190, open ? C.corrupt : C.line, open ? 0.7 : 0.4);

    this.add.text(cx, cy - dh / 2 - 84, open ? 'IT IS OPEN' : 'SOMETHING IS SEALED HERE', {
      fontSize: '13px', fontFamily: FONT_DISPLAY,
      color: open ? hex(mix(C.corrupt, 0xffffff, 0.55)) : T.faint, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const footY = cy + dh / 2 + 34;

    if (!open) {
      this.add.text(cx, footY, `${forged} / ${DOOR_PERK_REQUIREMENT}  PERKS FORGED`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(cx, footY + 24, 'Forge perks in the LAB. It will know when you are ready.', {
        fontSize: '11px', fontFamily: FONT_UI, color: T.ghost,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      return;
    }

    this.add.text(cx, footY, kingDown ? '👑  THE DISGRACED KING' : '👑  ? ? ?', {
      fontSize: '16px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.corrupt, 0xffffff, 0.6)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const enter = (hard: boolean) => {
      // A shudder before the scene turns over, so entering reads as the door
      // actually opening rather than a menu transition.
      this.cameras.main.shake(hard ? 420 : 260, hard ? 0.011 : 0.006);
      this.cameras.main.fade(320, 0, 0, 0);
      this.time.delayedCall(340, () => this.scene.start('MenuScene', { mode: 'boss', hard }));
    };

    // ── The second way through ───────────────────────────────────────
    // Once the King is down and thirty perks have been forged, there is a hole
    // under the door as well as a door. It is only ever offered here, and only
    // to a save that has met both halves of the gate.
    const devourerReady = PlayerData.isDevourerUnlocked();
    const devourerShown = kingDown;
    const hasHardRow = devourerShown;

    addButton(this, {
      x: cx, y: footY + (hasHardRow ? 34 : 40), w: 260, h: 46,
      label: 'ENTER', icon: '🚪',
      sublabel: kingDown ? 'He waits for you again' : 'You do not know what is inside',
      accent: C.corrupt, variant: 'solid', fontSize: 18, cut: 12,
      onClick: () => enter(false),
    }).pulse();

    if (devourerShown) {
      const forgedNow = PlayerData.getTotalForgedPerkCount();
      const need = PlayerData.DEVOURER_PERK_REQUIREMENT;
      const beaten = PlayerData.isDevourerDefeated();
      const hardBtn = addButton(this, {
        x: cx, y: footY + 90, w: 300, h: 46,
        label: devourerReady ? 'GO DOWN' : 'SOMETHING IS UNDER IT',
        icon: devourerReady ? '🕳' : '🔒',
        sublabel: devourerReady
          ? (beaten ? 'The Devourer of Kings — again' : 'The Devourer of Kings — no heals')
          : `${forgedNow} / ${need} perks forged`,
        accent: C.blood, variant: devourerReady ? 'solid' : 'quiet', fontSize: 17, cut: 12,
        onClick: () => { if (devourerReady) enter(true); },
      });
      if (devourerReady) hardBtn.pulse();
    }

    // The slab itself is clickable too — reaching for the door should work. It
    // always opens the ordinary fight; hard mode is a deliberate second click.
    this.add.rectangle(cx, cy, dw, dh, 0xffffff, 0)
      .setDepth(DEPTH.content + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => enter(false));
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
