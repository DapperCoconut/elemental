import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ALL_UPGRADES, getElementUpgrades } from '../data/Upgrades';
import { isUpgradeUnlocked, upgradeGate } from '../data/UpgradeUnlocks';
import { GAUNTLET_COST, GAUNTLET_HARD_COST } from '../data/GauntletData';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP, ABSTRACT_MIX_ELEMENT_IDS } from '../data/AbstractElements';
import { allSelectableElements, findElementDef, VAULT_ELEMENTS } from '../data/ElementRoster';
import { getElementProfile } from '../data/ElementProfiles';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addChip, addModal, addWell, fillDiamond, fillNotchedGradient, strokeNotched,
  drawGlow, drawOrnateRule, drawKeyCap, addElementCrest, addBackButton,
} from '../ui';
import { drawItem, itemKindFor, ItemKind } from '../ui/ItemArt';
import { addHangingSign, drawPlank, drawShelf, drawPriceTag, WOOD } from '../ui/Woodwork';
import { SpeechBubble, addHoverLabel } from '../ui/SpeechBubble';
import { Shopkeeper } from '../ui/characters/Shopkeeper';
import { Music, Sfx } from '../audio';

const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff4400, water: 0x0088ff, life: 0x44cc44, air: 0xaaddff, earth: 0x887755,
  oil: 0x664400, shadow: 0x330044, ice: 0x88ccff, growth: 0x88bb22, crystal: 0x88ccff,
  soul: 0xccaaff, hunt: 0xcc4400, sand: 0xffdd44, gravity: 0x8844cc, creation: 0xcc6622,
  electricity: 0xffee00, slime: 0x66cc44, fate: 0x88eecc, sound: 0x44bbff, light: 0xffffff,
  magnet: 0xcc2244, metal: 0xaabbcc, plasma: 0xdd66ff, passion: 0xf5e08a, chalk: 0xe0457b,
  wax: 0xf2c85b, clay: 0x9a5c32, illusion: 0xb45cff, depths: 0x0e8f9c, ruin: 0xc4392c,
  paper: 0xf2ead6, death: 0x4a4468, quantum: 0x7df9ff, gum: 0x46b93f, bind: 0xe0b743,
  radiation: 0x7cff3d, psychic: 0xe8e4d8,
};

const BASE_ELEMENT_IDS = ['fire', 'water', 'life', 'air', 'earth'];
const LAB_UPGRADE_COST = 500;

const SLOT_KEYS = ['click', 'e', 'r', 'f', 'q'];
const SLOT_DISPLAY = ['LMB', 'E', 'R', 'F', 'Q'];
const SHARD_PRICES = [10, 20, 35, 50, 75];
const CORRUPT_PRICES = [100, 200, 350, 500, 750];

const LAB_UPGRADES: { level: number; name: string; description: string; kind: ItemKind; cost?: number; corruptCost?: number }[] = [
  { level: 1, name: 'Abstract Fusion', kind: 'beaker', description: 'Fuse two Abstract Elements together in the Lab (costs 3 nuclei). Mismatched fusions waste 1 nucleus.' },
  { level: 2, name: 'Resonant Core', kind: 'retort', description: 'Forge Perks — toggle the Lab to Perk Mode and combine 3 base elements into a per-element Perk (2 ⚛️ each). One Perk can be equipped per element on the select screen.' },
  { level: 3, name: 'Apex Synthesis', kind: 'alembic', description: 'Unlocks the Quad Perk Forge in the Lab — combine all 4 other base elements into a powerful quad perk (5 ⚛️ each).' },
  { level: 4, name: 'Penta Synthesis', kind: 'crucible', description: 'Unlocks the Penta Perk Forge — combine all 5 base elements into a legendary perk (10 ⚛️ each).', cost: 2500, corruptCost: 10000 },
];

/** Which currency a shelf trades in. */
type Currency = 'shards' | 'corrupt';

/** Perks that must have been forged (across all elements) before the door opens. */
const DOOR_PERK_REQUIREMENT = 10;
/** The door's near-black violet — corrupt pushed most of the way to the void. */
const DOOR_ACCENT = mix(C.corrupt, 0x000000, 0.55);

/** One thing standing on a shelf. */
interface ShopItem {
  name: string;
  description: string;
  kind: ItemKind;
  color: number;
  price: number;
  currency: Currency;
  /** Penta Synthesis is paid in both currencies. */
  extraCorrupt?: number;
  status: 'buy' | 'active' | 'shelved' | 'owned' | 'locked' | 'soon';
  /** Short, on the tag; long, in the card. */
  lockLabel?: string;
  lockHint?: string;
  elementId?: string;
  slot?: string;
  slotLabel?: string;
  /** Still on the shelf after you buy it (the nucleus). */
  repeatable?: boolean;
  /** Take the money and hand it over. Returns whether it was paid for. */
  onBuy?: () => boolean;
  /** Equip or shelve an owned upgrade. */
  onToggle?: () => void;
}

interface Shelf {
  /** Headed by an element's live portrait, or by a plain plaque. */
  elementId?: string;
  plaque?: string;
  accent: number;
  items: ShopItem[];
}

interface ShopPage {
  name: string;
  accent: number;
  shelves: Shelf[];
}

/** Scene data: which page, whether we are down in the vent, and a line the goblin should open with. */
interface ShopInit { page?: number; vent?: boolean; say?: string[] }

const FLOOR_Y = 500;
const SHELF_X = 58;
const SHELF_W = 556;
const SHELF_YS = [236, 384];
const ITEM_XS = [226, 322, 418, 514, 610];
const ITEM_S = 24;

export class ShopScene extends Phaser.Scene {
  private currentPage = 0;
  private inVent = false;
  private openingLine: string[] | null = null;
  private pages: ShopPage[] = [];
  private shardChip!: { setValue: (v: string) => void };
  private nucleiChip!: { setValue: (v: string) => void };
  private corruptChip!: { setValue: (v: string) => void };
  private keeper: Shopkeeper | null = null;
  private bubble: SpeechBubble | null = null;
  /** Everything belonging to the open detail card, torn down on close. */
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  /** Live wares, repainted every frame so the orbs swirl and the flasks bubble. */
  private wares: { paint: (t: number) => void }[] = [];
  private elapsed = 0;

  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data: ShopInit): void {
    this.currentPage = data?.page ?? 0;
    this.inVent = !!data?.vent;
    this.openingLine = data?.say ?? null;
    this.detailObjects = [];
    this.wares = [];
    this.keeper = null;
    this.bubble = null;
    this.elapsed = 0;
  }

  create(): void {
    Music.play('shop');
    const { width, height } = this.scale;

    this.pages = this.buildPages();
    this.currentPage = Math.max(0, Math.min(this.currentPage, this.pages.length - 1));

    const back = () => this.scene.start('TitleScene');
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.detailObjects.length > 0) this.closeDetail();
      else if (this.inVent) this.climbOut();
      else back();
    });

    if (this.inVent) {
      this.buildVentPage(width, height);
      return;
    }

    const page = this.pages[this.currentPage];
    this.paintInterior(width, height);
    this.buildCounter(width);
    this.buildSigns(width, page);
    addBackButton(this, back);

    // Currency rail, top right.
    this.shardChip = addChip(this, { x: width - 18, y: 22, icon: '💎', value: `${PlayerData.getShards()}`, accent: C.gold, originX: 1 });
    this.nucleiChip = addChip(this, { x: width - 18, y: 52, icon: '⚛️', value: `×${PlayerData.getNuclei()}`, accent: C.arcane, originX: 1, fontSize: 13 });
    this.corruptChip = addChip(this, { x: width - 130, y: 52, icon: '🩸', value: `${PlayerData.getCorruptShards()}`, accent: C.corrupt, originX: 1, fontSize: 13 });

    page.shelves.forEach((shelf, i) => this.buildShelf(shelf, SHELF_YS[i], i));

    this.buildVent();
    this.maybeDrawScrewdriver();

    // The keeper, and his opening line — a quote on whatever just happened, or the stock.
    // The bubble hangs over his head in the right-wall column (x ≥ 735), which nothing else
    // uses: the shelves end at 640, the purchase card stops at 720, the chips sit above 70.
    const m = this.keeper!.mouth();
    this.bubble = new SpeechBubble(this, {
      anchorX: m.x + 40, anchorY: m.y - 58, side: 'left', width: 210, offsetX: 162, accent: C.gold,
      depth: DEPTH.modalContent + 5, onTalk: (on) => this.keeper?.setTalking(on),
    });
    const opener = this.openingLine ?? [this.stockLine(page)];
    this.time.delayedCall(350, () => this.bubble?.say(opener, { silent: true }));
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta / 1000;
    for (const w of this.wares) w.paint(this.elapsed);
  }

  // ── Stock ──────────────────────────────────────────────────────────

  /**
   * Every page of the shop. What it stocks is decided by the same roster the element-select
   * screens use, not by `PlayerData.isElementUnlocked` on its own — a cheat profile hands out
   * elements on the strength of the mode alone, and asking the save directly left them
   * playable but unshoppable. Two elements to a page, five wares each.
   */
  private buildPages(): ShopPage[] {
    const playable = new Set(allSelectableElements().map((e) => e.id));
    // The Vault elements' upgrades come out of Vault chests, one per chest — not sold here.
    const vaultIds = new Set(VAULT_ELEMENTS.map((e) => e.id));
    const withUpgrades = ALL_UPGRADES.map((e) => e.elementId);
    const baseIds = withUpgrades.filter((id) => BASE_ELEMENT_IDS.includes(id));
    const combinedIds = withUpgrades.filter((id) =>
      !BASE_ELEMENT_IDS.includes(id) && !ABSTRACT_ELEMENT_IDS.includes(id) && !ABSTRACT_MIX_ELEMENT_IDS.includes(id)
      && !vaultIds.has(id) && playable.has(id));
    const abstractIds = ABSTRACT_ELEMENT_IDS.filter((id) =>
      (playable.has(id) || PlayerData.getCompletedGauntlets().includes(ABSTRACT_ELEMENT_UNLOCK_MAP[id])) && withUpgrades.includes(id));
    const mixIds = ABSTRACT_MIX_ELEMENT_IDS.filter((id) => playable.has(id) && withUpgrades.includes(id));

    const pages: ShopPage[] = [this.buildCounterPage()];
    const chunk = (ids: string[], name: string, accent: number, currency: Currency): void => {
      const n = Math.ceil(ids.length / 2);
      for (let i = 0; i < n; i++) {
        const pair = ids.slice(i * 2, i * 2 + 2);
        pages.push({
          name: n > 1 ? `${name}  ${i + 1}/${n}` : name,
          accent,
          shelves: pair.map((id) => this.buildElementShelf(id, currency)),
        });
      }
    };
    chunk(baseIds, 'BASE ELEMENTS', C.frost, 'shards');
    chunk(combinedIds, 'COMBINED', C.arcane, 'shards');
    chunk(abstractIds, 'ABSTRACT', C.corrupt, 'corrupt');
    chunk(mixIds, 'ABSTRACT MIX', C.corrupt, 'corrupt');
    return pages;
  }

  /** Page one: keys, fuel and lab gear — the things that are not an element's upgrade. */
  private buildCounterPage(): ShopPage {
    const labLevel = PlayerData.getLabLevel();
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const hardUnlocked = PlayerData.isGauntletHardUnlocked();

    const keys: ShopItem[] = [
      {
        name: 'Gauntlet Key', kind: 'key', color: C.gold, price: GAUNTLET_COST, currency: 'shards',
        description: 'Opens the Gauntlets: six fights on one life, each a different foe. Beat one to unlock an Abstract Element.',
        status: gauntletUnlocked ? 'owned' : 'buy',
        onBuy: () => { if (!PlayerData.spendShards(GAUNTLET_COST)) return false; PlayerData.unlockGauntlet(); return true; },
      },
      {
        name: 'Hard Mode Key', kind: 'keyDark', color: C.blood, price: GAUNTLET_HARD_COST, currency: 'shards',
        description: 'Opens Hard Mode for every Gauntlet: deadlier foes, richer spoils.',
        status: hardUnlocked ? 'owned' : gauntletUnlocked ? 'buy' : 'locked',
        lockLabel: 'NEEDS KEY', lockHint: 'Buy the Gauntlet Key first.',
        onBuy: () => { if (!PlayerData.spendShards(GAUNTLET_HARD_COST)) return false; PlayerData.unlockGauntletHard(); return true; },
      },
      {
        name: 'Elemental Nucleus', kind: 'nucleus', color: C.arcane, price: 100, currency: 'shards',
        description: 'Fuel for the Lab. One nucleus fuses two base elements; abstract fusions and perks take more.',
        status: 'buy', repeatable: true,
        onBuy: () => { if (!PlayerData.spendShards(100)) return false; PlayerData.addNuclei(1); return true; },
      },
    ];

    const gear: ShopItem[] = LAB_UPGRADES.map((upg) => {
      const owned = labLevel >= upg.level;
      const available = labLevel >= upg.level - 1;
      const cost = upg.cost ?? LAB_UPGRADE_COST;
      return {
        name: `${upg.name}`, kind: upg.kind, color: C.arcane, price: cost, currency: 'shards',
        extraCorrupt: upg.corruptCost,
        description: `Lab level ${upg.level}. ${upg.description}`,
        status: owned ? 'owned' : available ? 'buy' : 'locked',
        lockLabel: `LAB LV.${upg.level - 1}`, lockHint: `Buy the level ${upg.level - 1} gear first.`,
        onBuy: () => {
          if (upg.corruptCost) {
            if (PlayerData.getShards() < cost || PlayerData.getCorruptShards() < upg.corruptCost) return false;
            PlayerData.spendShards(cost);
            PlayerData.spendCorruptShards(upg.corruptCost);
          } else if (!PlayerData.spendShards(cost)) {
            return false;
          }
          PlayerData.upgradelab();
          return true;
        },
      };
    });

    return {
      name: 'FRONT COUNTER', accent: C.gold,
      shelves: [
        { plaque: 'KEYS & FUEL', accent: C.gold, items: keys },
        { plaque: 'LAB GEAR', accent: C.arcane, items: gear },
      ],
    };
  }

  /** One element's five upgrades, as five objects. */
  private buildElementShelf(elementId: string, currency: Currency): Shelf {
    const rosterDef = findElementDef(elementId);
    const accent = ELEMENT_COLORS[elementId] ?? rosterDef?.color ?? C.steel;
    const upgrades = getElementUpgrades(elementId);
    const items: ShopItem[] = SLOT_KEYS.map((slot, slotIdx) => {
      const def = upgrades.find((u) => u.slot === slot);
      const price = def?.price ?? (currency === 'shards' ? SHARD_PRICES[slotIdx] : CORRUPT_PRICES[slotIdx]);
      if (!def) {
        return {
          name: 'Coming soon', description: 'Nothing on this shelf yet.', kind: 'dust', color: accent,
          price, currency, status: 'soon', elementId, slot, slotLabel: SLOT_DISPLAY[slotIdx],
        };
      }
      const owned = PlayerData.isUpgradeOwned(elementId, slot);
      const active = PlayerData.isUpgradeActive(elementId, slot);
      // The unstable ten buy their kit back one Corrupt bout at a time. An owned slot is
      // never re-locked — only the right to *buy* is gated.
      const gate = owned ? null : upgradeGate(elementId, slot);
      const gated = !!gate && !isUpgradeUnlocked(elementId, slot);
      return {
        name: def.name, description: def.description, kind: itemKindFor(slot, def.name), color: accent,
        price, currency,
        status: owned ? (active ? 'active' : 'shelved') : gated ? 'locked' : 'buy',
        lockLabel: gated ? `🔒 ${gate!.stepLabel}` : undefined,
        lockHint: gated ? `Win ${gate!.stepLabel} · ${gate!.fightName} in the Corrupt Realm's ${gate!.worldId.toUpperCase()} world.` : undefined,
        elementId, slot, slotLabel: SLOT_DISPLAY[slotIdx],
        onBuy: () => {
          const paid = currency === 'shards' ? PlayerData.spendShards(price) : PlayerData.spendCorruptShards(price);
          if (paid) PlayerData.purchaseUpgrade(elementId, slot);
          return paid;
        },
        onToggle: () => PlayerData.toggleUpgrade(elementId, slot),
      };
    });
    return { elementId, accent, items };
  }

  // ── The room ───────────────────────────────────────────────────────

  /** Plank walls, a board floor, a rail, and a lantern over the counter. */
  private paintInterior(width: number, height: number): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    // Wall: vertical planks in uneven widths, darker toward the top.
    g.fillStyle(0x15100c, 1);
    g.fillRect(0, 0, width, height);
    let x = 0;
    let i = 0;
    while (x < width) {
      const w = 34 + ((i * 7) % 5) * 6;
      drawPlank(g, x, -4, w - 2, FLOOR_Y + 4, { seed: i * 3.1, vertical: true, lit: -0.35 });
      x += w;
      i++;
    }
    for (let k = 0; k < 10; k++) {
      g.fillStyle(0x000000, 0.06);
      g.fillRect(0, k * 12, width, 12);
    }
    // Dado rail along the wall above the floor.
    drawPlank(g, 0, FLOOR_Y - 28, width, 9, { seed: 7, lit: 0.1 });
    // Floor: boards running across, darkening toward the front.
    for (let y = FLOOR_Y, r = 0; y < height; y += 22, r++) {
      drawPlank(g, -2, y, width + 4, 21, { seed: r * 1.7 + 20, lit: -0.45 - r * 0.03 });
      // Staggered board ends.
      g.fillStyle(0x000000, 0.45);
      for (let bx = (r % 2) * 90 + 40; bx < width; bx += 180) g.fillRect(bx, y, 1.5, 21);
    }
    // Vignette.
    for (let k = 0; k < 18; k++) {
      g.fillStyle(0x000000, 0.045 * (1 - k / 18));
      g.fillRect(0, k * 5, width, 5);
      g.fillRect(k * 5, 0, 5, height);
      g.fillRect(width - k * 5 - 5, 0, 5, height);
      g.fillRect(0, height - k * 5 - 5, width, 5);
    }
    // Lantern on a chain over the counter, with its warm pool of light.
    const lx = 690;
    const ly = 112;
    const light = this.add.graphics().setDepth(DEPTH.backdrop + 1);
    for (let k = 10; k >= 1; k--) {
      light.fillStyle(0xffb347, 0.028);
      light.fillCircle(lx, ly + 30, k * 34);
    }
    this.tweens.add({ targets: light, alpha: { from: 0.8, to: 1 }, duration: 1900 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const lg = this.add.graphics().setDepth(DEPTH.panel);
    lg.lineStyle(2, WOOD.iron, 1);
    for (let yy = 0; yy < ly - 18; yy += 7) { lg.strokeEllipse(lx, yy + 3, 4, 7); }
    lg.fillStyle(WOOD.iron, 1); lg.fillRect(lx - 9, ly - 18, 18, 4);
    lg.fillStyle(0x15100c, 1); lg.fillRect(lx - 11, ly - 14, 22, 30);
    lg.fillStyle(0xffd27a, 0.85); lg.fillRect(lx - 8, ly - 11, 16, 24);
    lg.fillStyle(0xfff2c0, 1); lg.fillEllipse(lx, ly + 2, 6, 11);
    lg.fillStyle(0xffffff, 0.9); lg.fillEllipse(lx, ly + 4, 2.5, 5);
    lg.lineStyle(1.5, WOOD.iron, 1); lg.strokeRect(lx - 11, ly - 14, 22, 30);
    lg.lineBetween(lx, ly - 14, lx, ly + 16);
    lg.fillStyle(WOOD.iron, 1); lg.fillRect(lx - 7, ly + 16, 14, 3);
  }

  /** The goblin's counter at the right, and the goblin behind it. */
  private buildCounter(width: number): void {
    const left = 628;
    const top = FLOOR_Y - 2;
    const g = this.add.graphics().setDepth(DEPTH.panel + 3);
    // Front panel with two recessed panels, then the top.
    drawPlank(g, left, top + 14, width - left + 4, 160, { seed: 3, lit: -0.1 });
    g.fillStyle(0x000000, 0.28);
    for (const px of [left + 24, left + 176]) {
      g.fillRoundedRect(px, top + 36, 120, 80, 3);
      g.lineStyle(1, WOOD.lit, 0.3);
      g.strokeRoundedRect(px + 4, top + 40, 112, 72, 2);
    }
    drawPlank(g, left - 10, top, width - left + 14, 16, { seed: 11, lit: 0.18, nails: true });
    g.fillStyle(WOOD.dark, 1);
    g.fillRect(left - 10, top + 16, width - left + 14, 3);
    // A coin purse and a ledger on the counter, for the look of trade.
    g.fillStyle(0x5a3a22, 1); g.fillEllipse(left + 40, top - 6, 26, 18);
    g.fillStyle(0x7a5232, 1); g.fillEllipse(left + 40, top - 12, 22, 10);
    g.lineStyle(1.5, 0x9a7b4a, 1); g.lineBetween(left + 30, top - 12, left + 50, top - 12);
    g.fillStyle(0xffd27a, 1); g.fillCircle(left + 60, top - 3, 3.5); g.fillCircle(left + 66, top - 2, 3.5);
    g.fillStyle(0x2a1a44, 1); g.fillRect(left + 262, top - 8, 46, 9);
    g.fillStyle(0xe6d7b0, 1); g.fillRect(left + 264, top - 10, 44, 3);
    g.lineStyle(1, 0x9d5cff, 0.8); g.strokeRect(left + 262, top - 8, 46, 9);

    // His hands rest on the counter top, so his origin sits a touch above the plank's edge.
    this.keeper = new Shopkeeper(this, 806, top - 5, { scale: 0.92, flip: true, depth: DEPTH.panel + 2 });
  }

  /** The hanging signs: page back, the page's name, page forward. */
  private buildSigns(width: number, page: ShopPage): void {
    const cx = width / 2 - 40;
    const total = this.pages.length;
    addHangingSign(this, {
      x: cx - 230, y: 10, w: 140, h: 36, label: 'PREV', arrow: 'left', drop: 30,
      disabled: this.currentPage === 0,
      onClick: () => this.flipTo(this.currentPage - 1),
    });
    addHangingSign(this, {
      x: cx + 230, y: 10, w: 140, h: 36, label: 'NEXT', arrow: 'right', drop: 30,
      disabled: this.currentPage >= total - 1,
      onClick: () => this.flipTo(this.currentPage + 1),
    });
    addHangingSign(this, {
      x: cx, y: 8, w: 300, h: 44, label: page.name, drop: 28, fontSize: 14,
      accent: mix(page.accent, WOOD.paint, 0.45),
    });
    // Page pips under the title sign, so the shop's depth is visible.
    const pips = this.add.graphics().setDepth(DEPTH.content);
    const span = Math.min(total, 40);
    for (let i = 0; i < total; i++) {
      const px = cx - ((span - 1) * 9) / 2 + (i % span) * 9;
      const py = 92 + Math.floor(i / span) * 8;
      fillDiamond(pips, px, py, i === this.currentPage ? 3.4 : 2, i === this.currentPage ? mix(page.accent, 0xffffff, 0.5) : WOOD.rope, i === this.currentPage ? 1 : 0.55);
    }
  }

  private flipTo(page: number): void {
    const target = Math.max(0, Math.min(page, this.pages.length - 1));
    if (target === this.currentPage) return;
    this.scene.restart({ page: target } as ShopInit);
  }

  /** The keeper's opening quote for a page: what shelf this is and what it trades in. */
  private stockLine(page: ShopPage): string {
    if (this.currentPage === 0) return `Keys, nuclei and lab gear. Click a ware and I'll quote it.`;
    const corrupt = page.shelves.some((s) => s.items.some((i) => i.currency === 'corrupt'));
    const names = page.shelves.map((s) => findElementDef(s.elementId ?? '')?.name ?? s.elementId).join(' and ');
    return `${names}. ${corrupt ? 'Corrupt shards only on this shelf.' : 'Shards.'} Click a ware for its price.`;
  }

  // ── Shelves and wares ──────────────────────────────────────────────

  private buildShelf(shelf: Shelf, shelfY: number, idx: number): void {
    const g = this.add.graphics().setDepth(DEPTH.panel);
    drawShelf(g, SHELF_X, shelfY, SHELF_W, idx * 5 + 2);

    // The shelf's head: the element's live fighter, or a brass plaque.
    const headX = SHELF_X + 66;
    if (shelf.elementId) {
      const rosterDef = findElementDef(shelf.elementId);
      const profile = getElementProfile(shelf.elementId);
      addElementCrest(this, {
        x: headX, y: shelfY - 48, w: 112, h: 92,
        elementId: shelf.elementId,
        name: rosterDef?.name ?? shelf.elementId,
        kicker: profile.archetype,
        accent: shelf.accent,
        mastered: PlayerData.isMasteryEnabled(shelf.elementId),
        depth: DEPTH.panel + 1,
        portraitScale: 0.52,
      });
    } else {
      const pg = this.add.graphics().setDepth(DEPTH.panel + 1);
      pg.fillStyle(0x000000, 0.4); pg.fillRoundedRect(headX - 58, shelfY - 36, 120, 28, 3);
      pg.fillStyle(mix(0xc89a3c, shelf.accent, 0.2), 1); pg.fillRoundedRect(headX - 60, shelfY - 40, 120, 28, 3);
      pg.lineStyle(1, 0x7a5a16, 1); pg.strokeRoundedRect(headX - 56, shelfY - 36, 112, 20, 2);
      for (const [nx, ny] of [[headX - 54, shelfY - 34], [headX + 52, shelfY - 34], [headX - 54, shelfY - 18], [headX + 52, shelfY - 18]]) {
        pg.fillStyle(0x3b3a44, 1); pg.fillCircle(nx, ny, 1.6);
      }
      this.add.text(headX - 1, shelfY - 26, shelf.plaque ?? '', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#2a1a08', letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.panel + 2);
    }

    shelf.items.forEach((item, i) => this.buildWare(item, ITEM_XS[i], shelfY));
  }

  /** One object on the shelf with its tag; click it for the card. */
  private buildWare(item: ShopItem, x: number, shelfY: number): void {
    const cy = shelfY - 3 - ITEM_S;
    const muted = item.status === 'soon' || item.status === 'locked';
    const g = this.add.graphics().setDepth(DEPTH.content);
    let lit = 0;
    let litTarget = 0;
    const paint = (t: number): void => {
      lit += (litTarget - lit) * 0.25;
      g.clear();
      // Owned wares glow their state: green live, red shelved.
      if (item.status === 'active' || item.status === 'shelved') {
        const c = item.status === 'active' ? C.verdant : C.blood;
        for (let k = 3; k >= 1; k--) { g.fillStyle(c, 0.05); g.fillCircle(x, cy + 4, ITEM_S * (0.8 + k * 0.28)); }
      }
      drawItem(g, item.kind, x, cy - lit * 5, ITEM_S, item.color, { lit, muted, t });
      if (item.status === 'locked') {
        // A small padlock hung on the thing.
        const px = x + ITEM_S * 0.7;
        const py = cy + ITEM_S * 0.5;
        g.fillStyle(0x15121a, 1); g.fillRoundedRect(px - 6, py - 4, 12, 10, 2);
        g.fillStyle(0x8a8ab0, 1); g.fillRoundedRect(px - 5, py - 3, 10, 8, 2);
        g.lineStyle(2, 0x8a8ab0, 1); g.beginPath(); g.arc(px, py - 4, 3.5, Math.PI, 0); g.strokePath();
        g.fillStyle(0x15121a, 1); g.fillCircle(px, py + 1, 1.3);
      }
    };
    paint(0);
    this.wares.push({ paint });

    // The tag on its string from the shelf lip.
    const tg = this.add.graphics().setDepth(DEPTH.content);
    const coin = item.currency === 'shards' ? '💎' : '🩸';
    const tagLabel = item.status === 'active' ? '● ACTIVE'
      : item.status === 'shelved' ? '○ SHELVED'
      : item.status === 'owned' ? '✔ OWNED'
      : item.status === 'soon' ? 'SOON'
      : item.status === 'locked' ? (item.lockLabel ?? '🔒')
      : item.extraCorrupt ? `${coin} ${item.price} + 🩸` : `${coin} ${item.price}`;
    const tagW = Math.max(46, tagLabel.length * 6.2 + 14);
    const pos = drawPriceTag(tg, x, shelfY + 14, tagW, item.color, { muted });
    this.add.text(pos.textX, pos.textY, tagLabel, {
      fontSize: '9px', fontFamily: FONT_DISPLAY, letterSpacing: 0.5,
      color: item.status === 'active' ? '#1f6b3a' : item.status === 'shelved' ? '#8a2436' : muted ? '#2a2622' : '#2a1a08',
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);

    // Hit area over the object. Graphics take no input of their own.
    const hit = this.add.rectangle(x, cy, ITEM_S * 2.4, ITEM_S * 2.6, 0xffffff, 0)
      .setDepth(DEPTH.content + 2)
      .setInteractive({ useHandCursor: true });
    let label: Phaser.GameObjects.Container | null = null;
    hit.on('pointerover', () => {
      litTarget = 1;
      Sfx.play('ui-hover');
      label?.destroy();
      label = addHoverLabel(this, x, cy - ITEM_S - 16, item.name, muted ? C.steel : item.color);
    });
    hit.on('pointerout', () => { litTarget = 0; label?.destroy(); label = null; });
    hit.on('pointerdown', () => {
      label?.destroy(); label = null;
      Sfx.play('ui-click');
      this.keeper?.lookAt(x, cy);
      this.openDetail(item);
    });
  }

  // ── The card ───────────────────────────────────────────────────────

  /**
   * The card for one ware: the thing itself, what it does, and the buy / equip / shelve
   * action. The keeper quotes it out loud and asks.
   */
  private openDetail(item: ShopItem): void {
    this.closeDetail();
    const { width } = this.scale;
    // The card's centre, not the screen's — see the modal below.
    const cx = width / 2 - 40;

    const owned = item.status === 'active' || item.status === 'shelved' || item.status === 'owned';
    const locked = item.status === 'locked';
    const soon = item.status === 'soon';
    const wallet = item.currency === 'shards' ? PlayerData.getShards() : PlayerData.getCorruptShards();
    const coin = item.currency === 'shards' ? '💎' : '🩸';
    const coinAccent = item.currency === 'shards' ? C.gold : C.corrupt;
    const canAfford = wallet >= item.price && (!item.extraCorrupt || PlayerData.getCorruptShards() >= item.extraCorrupt);
    const accent = item.status === 'active' ? C.verdant : item.status === 'shelved' ? C.blood : locked || soon ? C.steel : item.color;
    const elName = item.elementId ? (findElementDef(item.elementId)?.name ?? item.elementId) : null;

    // Sat left of centre so the keeper's bubble (over his head, x ≥ 735) never covers the card.
    const modal = addModal(this, {
      x: cx - 40, w: 560, h: 380, accent, glow: 0.5,
      title: elName ? `${elName.toUpperCase()}   ·   [ ${item.slotLabel} ]` : item.name.toUpperCase(),
      onScrimClick: () => this.closeDetail(),
    });
    this.detailObjects.push(modal.scrim, ...modal.objects);

    // ── Left: the ware on a plinth, big, with its key cap ──
    const ax = modal.left + 80;
    const ay = modal.contentTop + 78;
    const art = this.add.graphics().setDepth(DEPTH.modalContent);
    const paintArt = (t: number): void => {
      art.clear();
      for (let k = 5; k >= 1; k--) { art.fillStyle(item.color, 0.05); art.fillCircle(ax, ay, 18 + k * 9); }
      drawPlank(art, ax - 54, ay + 50, 108, 10, { seed: 41, lit: 0.1 });
      drawItem(art, item.kind, ax, ay, 44, item.color, { t, muted: locked || soon, lit: 0.2 });
    };
    paintArt(0);
    const ware = { paint: paintArt };
    this.wares.push(ware);
    // The card's art leaves the live list with the card, or it would paint a dead Graphics.
    art.once('destroy', () => { this.wares = this.wares.filter((w) => w !== ware); });
    this.detailObjects.push(art);
    if (item.slotLabel) {
      const capG = this.add.graphics().setDepth(DEPTH.modalContent);
      drawKeyCap(capG, ax - 32, ay + 70, 64, 24, accent);
      this.detailObjects.push(capG);
      this.detailObjects.push(this.add.text(ax, ay + 82, item.slotLabel, {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent + 1));
    }

    // ── Right: name, rule, what it does ──
    const textL = modal.left + 170;
    const textW = modal.right - textL - 26;
    this.detailObjects.push(this.add.text(textL, modal.contentTop + 26, item.name, {
      fontSize: '23px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.65)), letterSpacing: 1, wordWrap: { width: textW },
    }).setOrigin(0, 0).setDepth(DEPTH.modalContent));
    const ruleG = this.add.graphics().setDepth(DEPTH.modalContent);
    ruleG.lineStyle(1, accent, 0.4);
    ruleG.beginPath(); ruleG.moveTo(textL, modal.contentTop + 60); ruleG.lineTo(textL + textW, modal.contentTop + 60); ruleG.strokePath();
    fillDiamond(ruleG, textL, modal.contentTop + 60, 3, accent, 0.8);
    this.detailObjects.push(ruleG);
    // Long descriptions clamp rather than walking into the ledger; the codex has the full text.
    this.detailObjects.push(this.add.text(textL, modal.contentTop + 74, item.description, {
      fontSize: '14px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: textW }, lineSpacing: 6, maxLines: 6,
    }).setOrigin(0, 0).setDepth(DEPTH.modalContent));

    // ── Ledger ──
    const ledgerY = modal.bottom - 112;
    if (locked) {
      this.detailObjects.push(addWell(this, cx, ledgerY, 440, 46, C.steel, DEPTH.modal + 1, 6));
      this.detailObjects.push(this.add.text(cx, ledgerY, `🔒  ${item.lockHint ?? 'Not for sale yet.'}`, {
        fontSize: '12px', fontFamily: FONT_UI, color: T.dim, wordWrap: { width: 420 }, align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    } else if (!owned && !soon) {
      this.detailObjects.push(addWell(this, cx, ledgerY, 400, 46, coinAccent, DEPTH.modal + 1, 6));
      const costStr = item.extraCorrupt ? `${coin} ${item.price}  +  🩸 ${item.extraCorrupt}` : `${coin} ${item.price}`;
      this.detailObjects.push(this.add.text(cx - 180, ledgerY - 9, 'COST', { fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2 }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx - 180, ledgerY + 8, costStr, { fontSize: '17px', fontFamily: FONT_DISPLAY, color: hex(mix(coinAccent, 0xffffff, 0.4)) }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx + 180, ledgerY - 9, 'IN POCKET', { fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2 }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent));
      this.detailObjects.push(this.add.text(cx + 180, ledgerY + 8, `${coin} ${wallet}`, { fontSize: '17px', fontFamily: FONT_DISPLAY, color: canAfford ? T.good : T.bad }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent));
    } else if (owned) {
      const line = item.status === 'active' ? '● ACTIVE THIS MATCH' : item.status === 'shelved' ? '○ SHELVED' : '✔ YOURS';
      this.detailObjects.push(this.add.text(cx, ledgerY, line, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: item.status === 'shelved' ? T.bad : T.good, letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    }

    // The keeper quotes it and asks.
    this.quote(item, canAfford, wallet);

    // ── Actions ──
    const actionY = modal.bottom - 46;
    const commit = (say: string[]) => this.scene.restart({ page: this.currentPage, say } as ShopInit);
    if (!owned && !locked && !soon) {
      this.detailObjects.push(addButton(this, {
        x: cx - 78, y: actionY, w: 200, h: 48,
        label: 'BUY', icon: coin, sublabel: canAfford ? undefined : 'Not enough',
        accent: canAfford ? C.verdant : C.steel, variant: canAfford ? 'solid' : 'quiet',
        fontSize: 18, depth: DEPTH.modalContent, disabled: !canAfford,
        onClick: () => {
          const paid = item.onBuy?.() ?? false;
          Sfx.play(paid ? 'ui-purchase' : 'ui-denied');
          if (!paid) { this.bubble?.say([`That's ${item.price}. You have ${wallet}. No.`]); return; }
          const left = item.currency === 'shards' ? PlayerData.getShards() : PlayerData.getCorruptShards();
          if (item.repeatable) {
            // The nucleus stays on the shelf: no page flip, just the chips and the quote.
            this.shardChip.setValue(`${PlayerData.getShards()}`);
            this.nucleiChip.setValue(`×${PlayerData.getNuclei()}`);
            this.corruptChip.setValue(`${PlayerData.getCorruptShards()}`);
            this.closeDetail();
            this.keeper?.setMood('greedy', 1600);
            this.bubble?.say([`Sold. ${PlayerData.getNuclei()} nuclei on you, ${left} shards left. Another?`]);
            return;
          }
          commit([`Sold. ${item.name} is yours. ${left} ${item.currency === 'shards' ? 'shards' : 'corrupt shards'} left.`]);
        },
      }).container);
    } else if (item.onToggle && (item.status === 'active' || item.status === 'shelved')) {
      const active = item.status === 'active';
      this.detailObjects.push(addButton(this, {
        x: cx - 78, y: actionY, w: 200, h: 48,
        label: active ? 'SHELVE' : 'EQUIP', icon: active ? '○' : '●',
        accent: active ? C.blood : C.verdant, variant: active ? 'danger' : 'solid',
        fontSize: 18, depth: DEPTH.modalContent,
        onClick: () => {
          item.onToggle?.();
          Sfx.play(active ? 'ui-toggle-off' : 'ui-equip');
          commit([active ? `${item.name} shelved. It won't be in your next match.` : `${item.name} equipped. It's live next match.`]);
        },
      }).container);
    }
    this.detailObjects.push(addButton(this, {
      x: cx + 148, y: actionY, w: 150, h: 48,
      label: 'CLOSE', icon: '✕', accent: C.steel, variant: 'quiet', fontSize: 14, depth: DEPTH.modalContent,
      onClick: () => this.closeDetail(),
    }).container);
  }

  /** What the keeper says when a ware is picked up: its price, and whether you want it. */
  private quote(item: ShopItem, canAfford: boolean, wallet: number): void {
    const coin = item.currency === 'shards' ? 'shards' : 'corrupt shards';
    switch (item.status) {
      case 'buy': {
        const cost = item.extraCorrupt ? `${item.price} shards and ${item.extraCorrupt} corrupt shards` : `${item.price} ${coin}`;
        this.keeper?.setMood(canAfford ? 'greedy' : 'grumpy', 2000);
        this.bubble?.say([canAfford ? `${item.name}. ${cost}. Buying?` : `${item.name}. ${cost}. You have ${wallet}. Come back with more.`]);
        return;
      }
      case 'active': this.bubble?.say([`${item.name}. Already yours, and equipped. Shelve it?`]); return;
      case 'shelved': this.bubble?.say([`${item.name}. Already yours, on the shelf. Equip it?`]); return;
      case 'owned': this.bubble?.say([`${item.name}. You already have it.`]); return;
      case 'locked': this.keeper?.setMood('grumpy', 1800); this.bubble?.say([`${item.name}. Not for sale yet. ${item.lockHint ?? ''}`.trim()]); return;
      case 'soon': this.bubble?.say([`Nothing on that spot yet.`]); return;
    }
  }

  private closeDetail(): void {
    for (const obj of this.detailObjects) obj.destroy();
    this.detailObjects = [];
  }

  // ── The screwdriver ────────────────────────────────────────────────

  /**
   * A screwdriver lying on the floor of exactly one shop page.
   *
   * Which page is drawn once per save and then never moves, so hunting it is a matter of
   * walking the shop rather than re-rolling a page until it appears. It is deliberately
   * quiet — no label, no glow, no hint text. The tell is the four screws already visible on
   * every difficulty plate in the fight menu; this is the thing that turns them.
   */
  private maybeDrawScrewdriver(): void {
    if (PlayerData.isScrewdriverFound()) return;
    if (PlayerData.getScrewdriverPage(this.pages.length) !== this.currentPage) return;

    // Placement is fixed per page, not per visit — a tool does not wander.
    const rnd = new Phaser.Math.RandomDataGenerator([`screwdriver-${this.currentPage}`]);
    const x = rnd.integerInRange(260, 560);
    const y = rnd.integerInRange(548, 612);
    const tilt = rnd.realInRange(-0.3, 0.3);

    const g = this.add.graphics().setDepth(DEPTH.content + 4);
    g.setPosition(x, y);
    g.setRotation(tilt);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(0, 5, 70, 8);
    // Handle — a fat amber grip with two moulded ridges.
    g.fillStyle(mix(C.gold, 0x000000, 0.42), 1);
    g.fillRoundedRect(-34, -6, 26, 12, 5);
    g.fillStyle(mix(C.gold, 0x000000, 0.18), 1);
    g.fillRoundedRect(-33, -5, 24, 5, 2);
    g.lineStyle(1, mix(C.gold, 0x000000, 0.65), 0.9);
    g.beginPath(); g.moveTo(-26, -6); g.lineTo(-26, 6); g.strokePath();
    g.beginPath(); g.moveTo(-20, -6); g.lineTo(-20, 6); g.strokePath();
    // Ferrule, shaft, and a flat-head tip.
    g.fillStyle(mix(C.steel, 0xffffff, 0.35), 1); g.fillRect(-9, -3.5, 4, 7);
    g.fillStyle(mix(C.steel, 0xffffff, 0.5), 1); g.fillRect(-5, -2, 28, 4);
    g.fillStyle(mix(C.steel, 0xffffff, 0.75), 1); g.fillRect(-5, -2, 28, 1.4);
    g.fillStyle(mix(C.steel, 0xffffff, 0.6), 1); g.fillRect(23, -3, 6, 6);

    const hit = this.add.rectangle(x, y, 78, 26, 0xffffff, 0).setDepth(DEPTH.content + 5).setInteractive({ useHandCursor: true });
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
    this.closeDetail();
    const { width } = this.scale;
    const cx = width / 2 - 40;
    const modal = addModal(this, {
      x: cx, w: 520, h: 316, accent: C.gold, glow: 0.6, title: '🪛  YOU PICKED SOMETHING UP',
      onScrimClick: () => this.closeDetail(),
    });
    this.detailObjects.push(modal.scrim, ...modal.objects);
    this.detailObjects.push(this.add.text(cx, modal.contentTop + 44, '🪛', { fontSize: '44px' }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    this.detailObjects.push(this.add.text(cx, modal.contentTop + 88, 'A SCREWDRIVER', {
      fontSize: '26px', fontFamily: FONT_DISPLAY, color: hex(mix(C.gold, 0xffffff, 0.6)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    this.detailObjects.push(this.add.text(cx, modal.contentTop + 128,
      'Somebody bolted the difficulty plates down.\n\nThey did not bolt them down very well.', {
      fontSize: '15px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: 420 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));
    this.detailObjects.push(addButton(this, {
      x: cx, y: modal.bottom - 46, w: 220, h: 48, label: 'POCKET IT', icon: '🪛', accent: C.gold, variant: 'solid',
      fontSize: 17, depth: DEPTH.modalContent, onClick: () => this.closeDetail(),
    }).container);
    this.bubble?.say(['Not stock. Not for sale. Keep it.']);
  }

  // ── The vent ───────────────────────────────────────────────────────

  /**
   * An iron grate in the floorboards at the far left. Nothing marks it. It opens onto the
   * crawlspace under the shop, and the door down there.
   */
  private buildVent(): void {
    const x = 128;
    const y = 598;
    const open = PlayerData.getTotalForgedPerkCount() >= DOOR_PERK_REQUIREMENT;
    const g = this.add.graphics().setDepth(DEPTH.panel + 1);
    const paint = (lit: boolean): void => {
      g.clear();
      g.fillStyle(0x000000, 0.5); g.fillRect(x - 44, y - 14, 88, 30);
      // Light through the slats, if the door below is lit.
      if (open) {
        g.fillStyle(C.corrupt, lit ? 0.5 : 0.28 + 0.1 * Math.sin(this.elapsed * 3));
        g.fillRect(x - 40, y - 11, 80, 24);
      }
      g.fillStyle(lit ? 0x565566 : 0x3b3a44, 1);
      g.fillRect(x - 44, y - 14, 88, 4); g.fillRect(x - 44, y + 12, 88, 4);
      g.fillRect(x - 44, y - 14, 4, 30); g.fillRect(x + 40, y - 14, 4, 30);
      for (let i = 0; i < 7; i++) g.fillRect(x - 36 + i * 11, y - 10, 4, 22);
      g.fillStyle(0x7a7a8c, 0.8);
      g.fillRect(x - 44, y - 14, 88, 1);
      for (const [sx, sy] of [[x - 40, y - 10], [x + 40, y - 10], [x - 40, y + 12], [x + 40, y + 12]]) {
        g.fillStyle(0x7a7a8c, 1); g.fillCircle(sx, sy, 1.6);
      }
    };
    paint(false);
    if (open) this.wares.push({ paint: () => paint(false) });
    const hit = this.add.rectangle(x, y, 88, 30, 0xffffff, 0).setDepth(DEPTH.content + 3).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => paint(true));
    hit.on('pointerout', () => paint(false));
    hit.on('pointerdown', () => {
      Sfx.play('ui-open');
      this.bubble?.hide();
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.restart({ page: this.currentPage, vent: true } as ShopInit));
    });
  }

  private climbOut(): void {
    this.cameras.main.fade(220, 0, 0, 0);
    this.time.delayedCall(240, () => this.scene.restart({ page: this.currentPage } as ShopInit));
  }

  /**
   * The crawlspace under the shop.
   *
   * Nothing here is sold. The page holds one thing: a slab of a door set into the far wall,
   * sealed until enough perks have been forged to be worth what is behind it. Locked, it is
   * stone-dead and the counter is the only tell; open, the seams light and the whole frame
   * breathes.
   */
  private buildVentPage(width: number, height: number): void {
    const cx = width / 2;
    const forged = PlayerData.getTotalForgedPerkCount();
    const open = forged >= DOOR_PERK_REQUIREMENT;
    const kingDown = PlayerData.isKingDefeated();
    const cy = height / 2 + 6;

    // Underfloor: joists overhead, dirt, the void past the door.
    const bg = this.add.graphics().setDepth(DEPTH.backdrop);
    bg.fillStyle(0x07050a, 1); bg.fillRect(0, 0, width, height);
    for (let i = 0; i < 9; i++) drawPlank(bg, i * 112 - 20, -6, 26, 70, { seed: i, vertical: true, lit: -0.5 });
    drawPlank(bg, -4, 58, width + 8, 12, { seed: 9, lit: -0.4 });
    for (let i = 0; i < 40; i++) {
      const h = Math.sin(i * 127.1) * 43758.5453;
      const px = (h - Math.floor(h)) * width;
      bg.fillStyle(0x2a2320, 0.6); bg.fillEllipse(px, height - 20 - (i % 5) * 6, 14 + (i % 4) * 6, 4);
    }
    for (let k = 0; k < 22; k++) { bg.fillStyle(0x000000, 0.05); bg.fillRect(0, k * 6, width, 6); bg.fillRect(0, 0, k * 6, height); bg.fillRect(width - k * 6, 0, k * 6, height); }
    this.cameras.main.fadeIn(360, 0, 0, 0);

    const dw = 168;
    const dh = 268;
    const left = cx - dw / 2;
    const top = cy - dh / 2;
    const g = this.add.graphics().setDepth(DEPTH.panel);

    // Stepped stone arch, so the door sits *in* something.
    for (let i = 3; i >= 1; i--) {
      const o = i * 13;
      fillNotchedGradient(g, left - o, top - o, dw + o * 2, dh + o,
        mix(C.plate, DOOR_ACCENT, 0.10 - i * 0.02), mix(C.void_, DOOR_ACCENT, 0.05), 1, 16 + o, [true, true, false, false], 10);
      strokeNotched(g, left - o, top - o, dw + o * 2, dh + o, mix(C.line, DOOR_ACCENT, 0.35), 0.5, 1, 16 + o, [true, true, false, false]);
    }
    const slabTop = open ? mix(DOOR_ACCENT, 0x000000, 0.25) : mix(C.plate, 0x000000, 0.55);
    const slabBot = mix(C.void_, DOOR_ACCENT, open ? 0.12 : 0.03);
    fillNotchedGradient(g, left, top, dw, dh, slabTop, slabBot, 1, 16, [true, true, false, false], 22);
    strokeNotched(g, left, top, dw, dh, open ? mix(C.corrupt, 0xffffff, 0.25) : C.line, open ? 0.9 : 0.5, 2, 16, [true, true, false, false]);
    for (const by of [top + 52, top + 134, top + 216]) {
      g.fillStyle(mix(C.void_, DOOR_ACCENT, open ? 0.22 : 0.06), 1); g.fillRect(left + 4, by, dw - 8, 13);
      g.lineStyle(1, open ? mix(C.corrupt, 0xffffff, 0.3) : C.line, open ? 0.6 : 0.35); g.strokeRect(left + 4, by, dw - 8, 13);
      for (const rx of [left + 16, left + dw - 16]) fillDiamond(g, rx, by + 6.5, 3.5, open ? mix(C.corrupt, 0xffffff, 0.5) : C.line, open ? 0.9 : 0.5);
    }
    g.lineStyle(1, open ? mix(C.corrupt, 0xffffff, 0.4) : C.lineSoft, open ? 0.55 : 0.4);
    g.beginPath(); g.moveTo(cx, top + 18); g.lineTo(cx, top + dh); g.strokePath();
    g.lineStyle(4, open ? mix(C.corrupt, 0x000000, 0.2) : mix(C.line, 0x000000, 0.2), 1); g.strokeCircle(cx, top + 178, 17);
    g.lineStyle(2, open ? mix(C.corrupt, 0xffffff, 0.45) : C.line, open ? 0.85 : 0.45); g.strokeCircle(cx, top + 178, 17);
    // The broken crown in the lintel — the same motif the King wears.
    const sigilY = top + 24;
    const crownColor = open ? mix(C.corrupt, 0xffffff, 0.55) : mix(C.line, 0x000000, 0.15);
    g.lineStyle(2, crownColor, open ? 0.95 : 0.45);
    g.beginPath();
    g.moveTo(cx - 30, sigilY + 10); g.lineTo(cx - 30, sigilY - 4); g.lineTo(cx - 15, sigilY + 4); g.lineTo(cx, sigilY - 9);
    g.lineTo(cx + 15, sigilY + 4); g.lineTo(cx + 30, sigilY - 4); g.lineTo(cx + 30, sigilY + 10);
    g.strokePath();
    g.lineStyle(2, crownColor, open ? 0.6 : 0.3);
    g.beginPath(); g.moveTo(cx + 30, sigilY + 10); g.lineTo(cx + 20, sigilY + 14); g.strokePath();

    if (open) {
      const lightG = this.add.graphics().setDepth(DEPTH.panel + 1);
      drawGlow(lightG, left, top, dw, dh, C.corrupt, 0.6, 6, 4, 16, [true, true, false, false]);
      for (let k = 5; k >= 1; k--) { lightG.fillStyle(C.corrupt, 0.05); lightG.fillCircle(cx, sigilY, 12 + k * 7); }
      for (let i = 0; i < 8; i++) { lightG.fillStyle(C.corrupt, 0.10 - i * 0.011); lightG.fillRect(left - i * 4, top + dh + i * 2, dw + i * 8, 3); }
      this.tweens.add({ targets: lightG, alpha: { from: 0.55, to: 1 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const ruleG = this.add.graphics().setDepth(DEPTH.content);
    drawOrnateRule(ruleG, cx, cy - dh / 2 - 58, 190, open ? C.corrupt : C.line, open ? 0.7 : 0.4);
    this.add.text(cx, cy - dh / 2 - 84, open ? 'IT IS OPEN' : 'SOMETHING IS SEALED HERE', {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: open ? hex(mix(C.corrupt, 0xffffff, 0.55)) : T.faint, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    addButton(this, {
      x: 90, y: 36, w: 130, h: 34, label: 'CLIMB OUT', icon: '▲', accent: C.steel, variant: 'quiet', fontSize: 12, cut: 8,
      onClick: () => this.climbOut(),
    });

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
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0xffffff, 0.6)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const enter = (hard: boolean) => {
      this.cameras.main.shake(hard ? 420 : 260, hard ? 0.011 : 0.006);
      this.cameras.main.fade(320, 0, 0, 0);
      this.time.delayedCall(340, () => this.scene.start('MenuScene', { mode: 'boss', hard }));
    };

    // The second way through: once the King is down and thirty perks have been forged,
    // there is a hole under the door as well as a door.
    const devourerReady = PlayerData.isDevourerUnlocked();
    const devourerShown = kingDown;
    addButton(this, {
      x: cx, y: footY + (devourerShown ? 34 : 40), w: 260, h: 46, label: 'ENTER', icon: '🚪',
      sublabel: kingDown ? 'He waits for you again' : 'You do not know what is inside',
      accent: C.corrupt, variant: 'solid', fontSize: 18, cut: 12, onClick: () => enter(false),
    }).pulse();
    if (devourerShown) {
      const forgedNow = PlayerData.getTotalForgedPerkCount();
      const need = PlayerData.DEVOURER_PERK_REQUIREMENT;
      const beaten = PlayerData.isDevourerDefeated();
      const hardBtn = addButton(this, {
        x: cx, y: footY + 90, w: 300, h: 46,
        label: devourerReady ? 'GO DOWN' : 'SOMETHING IS UNDER IT', icon: devourerReady ? '🕳' : '🔒',
        sublabel: devourerReady ? (beaten ? 'The Devourer of Kings — again' : 'The Devourer of Kings — no heals') : `${forgedNow} / ${need} perks forged`,
        accent: C.blood, variant: devourerReady ? 'solid' : 'quiet', fontSize: 17, cut: 12,
        onClick: () => { if (devourerReady) enter(true); },
      });
      if (devourerReady) hardBtn.pulse();
    }
    this.add.rectangle(cx, cy, dw, dh, 0xffffff, 0).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true }).on('pointerdown', () => enter(false));
  }
}
