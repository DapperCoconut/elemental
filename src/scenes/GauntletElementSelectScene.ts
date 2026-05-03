import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  GAUNTLET_GROUPS,
  GAUNTLET_ELEMENTS,
  GauntletState,
  GAUNTLET_DIFFICULTY,
  GAUNTLET_HARD_DIFFICULTY,
  INFINITY_GAUNTLET_ID,
  emptyRunBoosts,
} from '../data/GauntletData';
import { MUTATIONS, getBossMutationIds } from '../data/Mutations';
import { getPerksForElement, getPerkById } from '../data/Perks';

const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid']);

interface ElementDef { id: string; name: string; emoji: string; color: number; }

const BASE_ELEMENTS: ElementDef[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
];

const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',      name: 'Oil',      emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',   name: 'Shadow',   emoji: '🌑',  color: 0x330044 },
  { id: 'ice',      name: 'Ice',      emoji: '🧊',  color: 0x88ccff },
  { id: 'growth',   name: 'Growth',   emoji: '🦠',  color: 0x88bb22 },
  { id: 'crystal',  name: 'Crystal',  emoji: '💎',  color: 0x88ccff },
  { id: 'soul',     name: 'Soul',     emoji: '👻',  color: 0xccaaff },
  { id: 'hunt',     name: 'Hunt',     emoji: '🐺',  color: 0xcc4400 },
  { id: 'sand',     name: 'Time',     emoji: '⏳',  color: 0xffdd44 },
  { id: 'gravity',  name: 'Gravity',  emoji: '🌌',  color: 0x8844cc },
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622 },
];

const ABSTRACT_ELEMENT_UNLOCK_MAP: Record<string, string> = {
  electricity: 'fire', slime: 'water', fate: 'life', sound: 'air', light: 'earth',
};

const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Slime',       emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet',     name: 'Magnet',     emoji: '🧲', color: 0xcc2244 },
  { id: 'metal',      name: 'Metal',      emoji: '⚙️',  color: 0x8899aa },
  { id: 'plasma',     name: 'Plasma',     emoji: '🔮',  color: 0xaa22ff },
  { id: 'death',      name: 'Death',      emoji: '💀',  color: 0x440066 },
  { id: 'echo',       name: 'Echo',       emoji: '🦇',  color: 0xccccff },
  { id: 'rubber',     name: 'Rubber',     emoji: '🪀',  color: 0xff5577 },
  { id: 'magic',      name: 'Magic',      emoji: '📖',  color: 0x9944ff },
  { id: 'technology', name: 'Technology', emoji: '💻',  color: 0x44ccaa },
  { id: 'silence',    name: 'Silence',    emoji: '🫥',  color: 0x1a0022 },
  { id: 'quantum',    name: 'Quantum',    emoji: '⚛️',  color: 0xaa44ff },
];

export class GauntletElementSelectScene extends Phaser.Scene {
  private gauntletId = 'fire';
  private hardMode = false;
  private elemPage = 0;
  private perkIndices: Record<string, number> = {};
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GauntletElementSelectScene' });
  }

  init(data: { gauntletId: string; hardMode?: boolean }): void {
    this.gauntletId = data.gauntletId;
    this.hardMode = data.hardMode ?? false;
    this.elemPage = 0;
    this.perkIndices = {};
    this.phaseObjects = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    this.add.text(cx, 60, 'CHOOSE YOUR ELEMENT', {
      fontSize: '32px', fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00', stroke: '#884400', strokeThickness: 4,
    }).setOrigin(0.5);

    const gauntletEl = GAUNTLET_ELEMENTS.find((e) => e.id === this.gauntletId);
    const modeTag = this.hardMode ? '  🔥 HARD MODE' : '';
    const battleCount = this.hardMode ? '7' : '5';
    const isInfinity = this.gauntletId === INFINITY_GAUNTLET_ID;
    const label = isInfinity
      ? `♾️ INFINITY GAUNTLET${modeTag}  •  Endless — fight until you die`
      : gauntletEl
      ? `${gauntletEl.emoji} ${gauntletEl.name.toUpperCase()} GAUNTLET${modeTag}  •  Survive ${battleCount} battles + a boss`
      : 'GAUNTLET';
    this.add.text(cx, 100, label, {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5);

    const backBtn = this.add.rectangle(52, 36, 88, 36, 0x222233)
      .setStrokeStyle(1, 0x555577).setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);
    backBtn
      .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); })
      .on('pointerout',  () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.scene.start('GauntletSelectScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GauntletSelectScene'));

    this.renderElements(width, height, cx);
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

    const pageLabel = this.add.text(cx, height / 2 + 155, `${this.elemPage + 1} / ${totalPages}`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#555566',
    }).setOrigin(0.5);
    this.phaseObjects.push(pageLabel);

    if (this.elemPage > 0) {
      const leftBtn = this.add.rectangle(28, height / 2 + 20, 32, 64, 0x331100)
        .setStrokeStyle(1, 0xaa4400).setInteractive({ useHandCursor: true });
      const leftLbl = this.add.text(28, height / 2 + 20, '◀', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#ff8844',
      }).setOrigin(0.5).setDepth(1);
      leftBtn
        .on('pointerover', () => leftBtn.setFillStyle(0x552200))
        .on('pointerout',  () => leftBtn.setFillStyle(0x331100))
        .on('pointerdown', () => { this.elemPage--; this.renderElements(width, height, cx); });
      this.phaseObjects.push(leftBtn, leftLbl);
    }

    if (this.elemPage < totalPages - 1 && (this.elemPage > 0 || unlockedExtra.length > 0)) {
      const rightBtn = this.add.rectangle(width - 28, height / 2 + 20, 32, 64, 0x331100)
        .setStrokeStyle(1, 0xaa4400).setInteractive({ useHandCursor: true });
      const rightLbl = this.add.text(width - 28, height / 2 + 20, '▶', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#ff8844',
      }).setOrigin(0.5).setDepth(1);
      rightBtn
        .on('pointerover', () => rightBtn.setFillStyle(0x552200))
        .on('pointerout',  () => rightBtn.setFillStyle(0x331100))
        .on('pointerdown', () => { this.elemPage++; this.renderElements(width, height, cx); });
      this.phaseObjects.push(rightBtn, rightLbl);
    }

    if (this.elemPage > 0 && currentElements.length === 0) {
      const noElems = this.add.text(cx, height / 2 + 20,
        'No extra elements unlocked yet.\nVisit the LAB to unlock combined elements.', {
          fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#555577', align: 'center',
        }).setOrigin(0.5);
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

      const card = this.add
        .rectangle(bx, by, cardW, cardH, el.color, 0.8)
        .setStrokeStyle(2, el.color)
        .setInteractive({ useHandCursor: true });
      const emojiText = this.add.text(bx, by - 32, el.emoji, { fontSize: '44px' }).setOrigin(0.5);
      const nameText = this.add.text(bx, by + 26, el.name.toUpperCase(), {
        fontSize: '15px', fontFamily: '"Arial Black", sans-serif', color: '#ffffff',
      }).setOrigin(0.5);
      const selectText = this.add.text(bx, by + 52, '▶  SELECT', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffcc00',
      }).setOrigin(0.5);

      card
        .on('pointerover', () => { card.setAlpha(1); card.setStrokeStyle(3, 0xffffff); })
        .on('pointerout',  () => { card.setAlpha(0.8); card.setStrokeStyle(2, el.color); })
        .on('pointerdown', () => this.selectElement(el.id));

      this.phaseObjects.push(card, emojiText, nameText, selectText);

      // Perk strip
      const perks = getPerksForElement(el.id);
      const stripY = by + cardH / 2 + 22;

      if (perks.length === 0) {
        const noPerksLbl = this.add.text(bx, stripY + 6, 'no perks', {
          fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333344',
        }).setOrigin(0.5);
        this.phaseObjects.push(noPerksLbl);
        return;
      }

      if (!(el.id in this.perkIndices)) {
        const equippedId = PlayerData.getEquippedPerk(el.id);
        this.perkIndices[el.id] = equippedId ? perks.findIndex((p) => p.id === equippedId) : -1;
      }
      const currentIdx = this.perkIndices[el.id] ?? -1;

      const stripBg = this.add.rectangle(bx, stripY + 6, cardW, 30, 0x0d0d1a, 0.85)
        .setStrokeStyle(1, 0x333355);

      const leftArrow = this.add.text(bx - cardW / 2 + 10, stripY + 6, '◀', {
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#7766aa',
      }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
      leftArrow.on('pointerover', () => leftArrow.setColor('#cc88ff'));
      leftArrow.on('pointerout',  () => leftArrow.setColor('#7766aa'));
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
        fontSize: '12px', fontFamily: '"Arial Black", sans-serif', color: '#7766aa',
      }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
      rightArrow.on('pointerover', () => rightArrow.setColor('#cc88ff'));
      rightArrow.on('pointerout',  () => rightArrow.setColor('#7766aa'));
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
        centerColor = '#444455';
      } else {
        const perk = perks[currentIdx];
        const unlocked = PlayerData.isPerkUnlocked(el.id, perk.id);
        const isEquipped = PlayerData.getEquippedPerk(el.id) === perk.id;
        if (unlocked) {
          centerText = isEquipped ? `${perk.emoji} ${perk.name} ✓` : `${perk.emoji} ${perk.name}`;
          centerColor = isEquipped ? '#88ff88' : '#ccaaff';
        } else {
          const recipe = getPerkById(perk.id)?.ingredients.map((r) => {
            const em: Record<string, string> = { fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨' };
            return em[r] ?? r;
          }).join('+') ?? '';
          centerText = `🔒 ${perk.name}  ${recipe}`;
          centerColor = '#443344';
        }
      }
      const centerLbl = this.add.text(bx, stripY + 6, centerText, {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: centerColor,
      }).setOrigin(0.5).setDepth(2);

      this.phaseObjects.push(stripBg, leftArrow, rightArrow, centerLbl);
    });
  }

  private selectElement(elementId: string): void {
    if (this.gauntletId === INFINITY_GAUNTLET_ID) {
      // Infinity: first fight is generated by GauntletIntermediaryScene's launchInfinityFight.
      // We start with fight 0 "complete" so the intermediary scene generates fight 1.
      const gauntlet: GauntletState = {
        gauntletElement: INFINITY_GAUNTLET_ID,
        playerElement: elementId,
        currentFight: 0,
        boosts: emptyRunBoosts(),
        fightOrder: [],
        fightMutations: [],
        hardMode: this.hardMode,
        infinityShards: 0,
      };
      // Go straight to intermediary which will generate and launch fight 1
      this.scene.start('GauntletIntermediaryScene', { gauntlet });
      return;
    }

    const pool = GAUNTLET_GROUPS[this.gauntletId] ?? [];
    const allowedMutations = MUTATIONS
      .filter((m) => !GAUNTLET_EXCLUDED_MUTATIONS.has(m.id) && !m.bossOnly)
      .map((m) => m.id);

    const pickN = (n: number): string[] => {
      const bag = [...allowedMutations].sort(() => Math.random() - 0.5);
      return bag.slice(0, Math.min(n, bag.length));
    };

    const bossIds = getBossMutationIds();
    const bossId = bossIds[Math.floor(Math.random() * bossIds.length)];

    let fightOrder: string[];
    let fightMutations: string[][];
    let difficulty0: number;
    let mutations0: string[];

    if (this.hardMode) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      fightOrder = Array.from({ length: 7 }, (_, i) => shuffled[i % shuffled.length]);
      const regularMutations = Array.from({ length: 7 }, () => pickN(1));
      const bossSlot = [bossId, ...pickN(1)];
      fightMutations = [...regularMutations, bossSlot];
      difficulty0 = GAUNTLET_HARD_DIFFICULTY[0];
      mutations0 = fightMutations[0];
    } else {
      fightOrder = [...pool].sort(() => Math.random() - 0.5);
      const regularMutations = Array.from({ length: 5 }, () => pickN(1));
      fightMutations = [...regularMutations, [bossId]];
      difficulty0 = GAUNTLET_DIFFICULTY[0];
      mutations0 = fightMutations[0];
    }

    const gauntlet: GauntletState = {
      gauntletElement: this.gauntletId,
      playerElement: elementId,
      currentFight: 1,
      boosts: emptyRunBoosts(),
      fightOrder,
      fightMutations,
      hardMode: this.hardMode,
      infinityShards: 0,
    };

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId: fightOrder[0],
      difficulty: difficulty0,
      mutations: mutations0,
      gauntlet,
      playerPerk: PlayerData.getEquippedPerk(elementId),
    });
  }
}
