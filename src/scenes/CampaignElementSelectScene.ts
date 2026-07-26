import Phaser from 'phaser';
import { getAnyWorld, ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import { WORLDS } from '../data/Worlds';
import * as PlayerData from '../data/PlayerData';
import { getPerksForElement, getPerkById } from '../data/Perks';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addCardPlate, addPagerButton, addTitle, addWell,
} from '../ui';
import {
  GauntletState,
  CampaignGauntletContext,
  GAUNTLET_DIFFICULTY,
  GAUNTLET_HARD_DIFFICULTY,
  emptyRunBoosts,
} from '../data/GauntletData';
import { MUTATIONS, getBossMutationIds } from '../data/Mutations';

const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid']);

interface ElementDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
}

const BASE_ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
];

const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',     name: 'Oil',      emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',  name: 'Shadow',   emoji: '🌑', color: 0x330044 },
  { id: 'ice',     name: 'Ice',      emoji: '🧊', color: 0x88ccff },
  { id: 'growth',  name: 'Growth',   emoji: '🦠', color: 0x88bb22 },
  { id: 'crystal', name: 'Crystal',  emoji: '💎', color: 0x88ccff },
  { id: 'soul',    name: 'Soul',     emoji: '👻', color: 0xccaaff },
  { id: 'hunt',    name: 'Hunt',     emoji: '🐺', color: 0xcc4400 },
  { id: 'sand',    name: 'Time',     emoji: '⏳', color: 0xffdd44 },
  { id: 'gravity', name: 'Gravity',  emoji: '🌌', color: 0x8844cc },
  { id: 'creation',name: 'Creation', emoji: '⚒️', color: 0xcc6622 },
];

const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire', slime: 'water', fate: 'life', sound: 'air', light: 'earth',
};

const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet',     name: 'Magnet',     emoji: '🧲', color: 0xcc2244 },
  { id: 'metal',      name: 'Metal',      emoji: '⚙️',  color: 0x8899aa },
  { id: 'plasma',     name: 'Plasma',     emoji: '🔮',  color: 0xaa22ff },
  { id: 'gunpowder', name: 'Gunpowder', emoji: '💀',  color: 0x440066 },
  { id: 'echo',       name: 'Echo',       emoji: '🦇',  color: 0xccccff },
  { id: 'rubber',     name: 'Rubber',     emoji: '🪀',  color: 0xff5577 },
  { id: 'magic',      name: 'Magic',      emoji: '📖',  color: 0x9944ff },
  { id: 'technology', name: 'Technology', emoji: '💻',  color: 0x44ccaa },
  { id: 'silence',    name: 'Silence',    emoji: '🫥',  color: 0x1a0022 },
  { id: 'quantum',    name: 'Quantum',    emoji: '⚛️',  color: 0xaa44ff },
];

export class CampaignElementSelectScene extends Phaser.Scene {
  private worldId = 'fire';
  private nodeId = 'fire-fight-1';
  private isChallenge = false;
  private kind = 'fight';
  private slotIdx: 0 | 1 | 2 = 0;
  private hardMode = false;
  private enemyElementId = 'fire';
  private difficulty = 1;
  private campaignMutations: string[] = [];
  private campaignStarredMutations: string[] = [];

  private elemPage = 0;
  private perkIndices: Record<string, number> = {};
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'CampaignElementSelectScene' });
  }

  init(data: {
    worldId: string; nodeId: string; isChallenge: boolean; kind: string;
    slotIdx: 0 | 1 | 2; hardMode: boolean; enemyElementId: string; difficulty: number;
    mutations?: string[]; starredMutations?: string[];
  }): void {
    this.worldId = data.worldId;
    this.nodeId = data.nodeId;
    this.isChallenge = data.isChallenge;
    this.kind = data.kind;
    this.slotIdx = data.slotIdx;
    this.hardMode = data.hardMode;
    this.enemyElementId = data.enemyElementId;
    this.difficulty = data.difficulty;
    this.campaignMutations = data.mutations ?? [];
    this.campaignStarredMutations = data.starredMutations ?? [];
    this.elemPage = 0;
    this.perkIndices = {};
    this.phaseObjects = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = getAnyWorld(this.worldId);

    const accent = world?.color ?? C.ember;
    addBackdrop(this, { accent, variant: 'lattice', motes: 18 });

    const enemyDef = this.findElement(this.enemyElementId);
    const worldName = (world?.name ?? '').toUpperCase();
    const vsLine = enemyDef
      ? `${worldName} WORLD   ·   VS  ${enemyDef.emoji} ${enemyDef.name.toUpperCase()}`
      : `${worldName} WORLD`;

    addTitle(this, {
      x: cx, y: 62, text: 'CHOOSE YOUR ELEMENT', accent, size: 34,
      subtitle: vsLine,
    });

    addBackButton(this, () => this.goBack());
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());

    this.renderElements(width, height, cx);
  }

  private findElement(id: string): ElementDef | undefined {
    return BASE_ELEMENTS.find((e) => e.id === id)
      ?? COMBINED_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_COMBINED_ELEMENTS.find((e) => e.id === id);
  }

  private renderElements(width: number, height: number, cx: number): void {
    for (const obj of this.phaseObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.phaseObjects = [];

    const completedGauntlets = PlayerData.getCompletedGauntlets();
    const unlockedCombined = COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    const unlockedAbstract = ABSTRACT_ELEMENTS.filter((e) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[e.id];
      return needed ? completedGauntlets.includes(needed) : false;
    });
    const unlockedAbstractCombined = ABSTRACT_COMBINED_ELEMENTS.filter((e) => PlayerData.isElementUnlocked(e.id));
    const unlockedExtra = [...unlockedCombined, ...unlockedAbstract, ...unlockedAbstractCombined];

    const PAGE_SIZE = 5;
    const extraPages = Math.max(1, Math.ceil(unlockedExtra.length / PAGE_SIZE));
    const maxPage = unlockedExtra.length > 0 ? extraPages : 0;
    const totalPages = 1 + maxPage;

    let currentElements: ElementDef[];
    if (this.elemPage === 0) {
      currentElements = BASE_ELEMENTS;
    } else {
      const start = (this.elemPage - 1) * PAGE_SIZE;
      currentElements = unlockedExtra.slice(start, start + PAGE_SIZE);
    }

    const pageLabel = this.add.text(cx, height / 2 + 158, `${this.elemPage + 1}  /  ${totalPages}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(pageLabel);

    if (this.elemPage > 0) {
      const leftBtn = addPagerButton(this, {
        x: 32, y: height / 2 + 20, dir: 'left', accent: C.arcane,
        onClick: () => { this.elemPage--; this.renderElements(width, height, cx); },
      });
      this.phaseObjects.push(leftBtn.container);
    }

    if (this.elemPage < totalPages - 1 && (this.elemPage > 0 || unlockedExtra.length > 0)) {
      const rightBtn = addPagerButton(this, {
        x: width - 32, y: height / 2 + 20, dir: 'right', accent: C.arcane,
        onClick: () => { this.elemPage++; this.renderElements(width, height, cx); },
      });
      this.phaseObjects.push(rightBtn.container);
    }

    if (this.elemPage > 0 && currentElements.length === 0) {
      const noElems = this.add.text(cx, height / 2 + 20, 'No extra elements discovered yet.\nVisit the LAB to unlock combined elements.', {
        fontSize: '14px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(noElems);
      return;
    }

    const cardW = 140;
    const cardH = 150;
    const gap = 16;
    const totalW = currentElements.length * cardW + (currentElements.length - 1) * gap;
    const startX = cx - totalW / 2;

    currentElements.forEach((el, i) => {
      const bx = startX + i * (cardW + gap) + cardW / 2;
      const by = height / 2 + 20;

      const plate = addCardPlate(this, {
        x: bx, y: by, w: cardW, h: cardH, accent: el.color, cut: 16,
      });

      const halo = this.add.graphics().setDepth(DEPTH.content - 1);
      for (let k = 5; k >= 1; k--) {
        halo.fillStyle(el.color, 0.05);
        halo.fillCircle(bx, by - 30, 18 + k * 6);
      }

      const emojiText = this.add.text(bx, by - 30, el.emoji, { fontSize: '44px' })
        .setOrigin(0.5).setDepth(DEPTH.content);
      const nameText = this.add.text(bx, by + 26, el.name.toUpperCase(), {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      const selectText = this.add.text(bx, by + 50, '▶  SELECT', {
        fontSize: '11px', fontFamily: FONT_DISPLAY,
        color: hex(mix(el.color, 0xffffff, 0.55)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const card = this.add.rectangle(bx, by, cardW, cardH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      card
        .on('pointerover', () => { plate.paint('hover'); selectText.setColor('#ffffff'); })
        .on('pointerout',  () => { plate.paint('idle'); selectText.setColor(hex(mix(el.color, 0xffffff, 0.55))); })
        .on('pointerdown', () => this.selectElement(el.id));

      this.phaseObjects.push(plate.g, halo, card, emojiText, nameText, selectText);

      // Perk strip
      const perks = getPerksForElement(el.id);
      const stripY = by + cardH / 2 + 22;

      if (perks.length === 0) {
        const noPerksLbl = this.add.text(bx, stripY + 6, 'NO PERKS', {
          fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.ghost, letterSpacing: 2,
        }).setOrigin(0.5).setDepth(DEPTH.content);
        this.phaseObjects.push(noPerksLbl);
        return;
      }

      if (!(el.id in this.perkIndices)) {
        const equippedId = PlayerData.getEquippedPerk(el.id);
        this.perkIndices[el.id] = equippedId ? perks.findIndex((p) => p.id === equippedId) : -1;
      }
      const currentIdx = this.perkIndices[el.id] ?? -1;

      const stripBg = addWell(this, bx, stripY + 6, cardW, 30, C.arcane, DEPTH.content);

      const leftArrow = this.add.text(bx - cardW / 2 + 10, stripY + 6, '◀', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(C.arcane, 0x000000, 0.2)),
      }).setOrigin(0.5).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
      leftArrow.on('pointerover', () => leftArrow.setColor(T.bright));
      leftArrow.on('pointerout',  () => leftArrow.setColor(hex(mix(C.arcane, 0x000000, 0.2))));
      leftArrow.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        let nextIdx = currentIdx - 1;
        if (nextIdx < -1) nextIdx = perks.length - 1;
        this.perkIndices[el.id] = nextIdx;
        if (nextIdx === -1) {
          PlayerData.equipPerk(el.id, null);
        } else {
          const p = perks[nextIdx];
          if (PlayerData.isPerkUnlocked(el.id, p.id)) PlayerData.equipPerk(el.id, p.id);
          else PlayerData.equipPerk(el.id, null);
        }
        this.renderElements(width, height, cx);
      });

      const rightArrow = this.add.text(bx + cardW / 2 - 10, stripY + 6, '▶', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(C.arcane, 0x000000, 0.2)),
      }).setOrigin(0.5).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
      rightArrow.on('pointerover', () => rightArrow.setColor(T.bright));
      rightArrow.on('pointerout',  () => rightArrow.setColor(hex(mix(C.arcane, 0x000000, 0.2))));
      rightArrow.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        let nextIdx = currentIdx + 1;
        if (nextIdx >= perks.length) nextIdx = -1;
        this.perkIndices[el.id] = nextIdx;
        if (nextIdx === -1) {
          PlayerData.equipPerk(el.id, null);
        } else {
          const p = perks[nextIdx];
          if (PlayerData.isPerkUnlocked(el.id, p.id)) PlayerData.equipPerk(el.id, p.id);
          else PlayerData.equipPerk(el.id, null);
        }
        this.renderElements(width, height, cx);
      });

      let centerText: string;
      let centerColor: string;
      if (currentIdx === -1) {
        centerText = '— none —';
        centerColor = T.ghost;
      } else {
        const perk = perks[currentIdx];
        const unlocked = PlayerData.isPerkUnlocked(el.id, perk.id);
        const isEquipped = PlayerData.getEquippedPerk(el.id) === perk.id;
        if (unlocked) {
          centerText = isEquipped ? `${perk.emoji} ${perk.name} ✓` : `${perk.emoji} ${perk.name}`;
          centerColor = isEquipped ? T.good : hex(mix(C.arcane, 0xffffff, 0.5));
        } else {
          const recipe = getPerkById(perk.id)?.ingredients.map((r) => {
            const em: Record<string, string> = { fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨' };
            return em[r] ?? r;
          }).join('+') ?? '';
          centerText = `🔒 ${perk.name}  ${recipe}`;
          centerColor = T.ghost;
        }
      }
      const centerLbl = this.add.text(bx, stripY + 6, centerText, {
        fontSize: '9px', fontFamily: FONT_UI, color: centerColor,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2);

      this.phaseObjects.push(stripBg, leftArrow, rightArrow, centerLbl);
    });
  }

  private selectElement(elementId: string): void {
    this.scene.stop('CampaignWorldScene');

    if (this.kind === 'gauntlet') {
      this.launchCampaignGauntlet(elementId);
      return;
    }

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId: this.enemyElementId,
      difficulty: this.difficulty,
      mutations: this.campaignMutations,
      starredMutations: this.campaignStarredMutations,
      playerPerk: PlayerData.getEquippedPerk(elementId),
      campaign: {
        slot: this.slotIdx,
        worldId: this.worldId,
        fightId: this.nodeId,
        isChallenge: this.isChallenge,
      },
    });
  }

  private launchCampaignGauntlet(elementId: string): void {
    const allElementIds = [...WORLDS, ...ABSTRACT_WORLDS].map((w) => w.id);
    const regularPool = allElementIds.filter((id) => id !== this.worldId);

    const allowedMutations = MUTATIONS
      .filter((m) => !GAUNTLET_EXCLUDED_MUTATIONS.has(m.id) && !m.bossOnly)
      .map((m) => m.id);

    const pickN = (n: number): string[] => {
      const bag = [...allowedMutations].sort(() => Math.random() - 0.5);
      return bag.slice(0, Math.min(n, bag.length));
    };

    const bossIds = getBossMutationIds();
    const bossId = bossIds[Math.floor(Math.random() * bossIds.length)];
    const fightCount = this.hardMode ? 7 : 5;

    const fightOrder = Array.from({ length: fightCount }, () =>
      regularPool[Math.floor(Math.random() * regularPool.length)],
    );
    const regularMutations = Array.from({ length: fightCount }, () => pickN(1));
    const bossSlot = [bossId, ...pickN(1)];
    const fightMutations = [...regularMutations, bossSlot];

    const difficulty0 = this.hardMode ? GAUNTLET_HARD_DIFFICULTY[0] : GAUNTLET_DIFFICULTY[0];
    const mutations0 = fightMutations[0];

    const campaignContext: CampaignGauntletContext = { slot: this.slotIdx, worldId: this.worldId };

    const gauntlet: GauntletState = {
      gauntletElement: this.worldId,
      playerElement: elementId,
      currentFight: 1,
      boosts: emptyRunBoosts(),
      fightOrder,
      fightMutations,
      hardMode: this.hardMode,
      infinityShards: 0,
      campaignContext,
    };

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId: fightOrder[0],
      difficulty: difficulty0,
      mutations: mutations0,
      starredMutations: this.hardMode ? mutations0 : [],
      gauntlet,
      playerPerk: PlayerData.getEquippedPerk(elementId),
      campaign: { slot: this.slotIdx, worldId: this.worldId, fightId: this.nodeId, isChallenge: false },
    });
  }

  private goBack(): void {
    this.scene.start('CampaignFightMenuScene', {
      worldId: this.worldId,
      nodeId: this.nodeId,
      isChallenge: this.isChallenge,
      kind: this.kind,
      slotIdx: this.slotIdx,
    });
  }
}
