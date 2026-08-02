import Phaser from 'phaser';
import { getAnyWorld, ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import { WORLDS } from '../data/Worlds';
import * as PlayerData from '../data/PlayerData';
import { openBondPicker } from '../ui';
import { unlockedFinaleElements } from './MenuScene';
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
import { getWorldTier, isAbstractWorld, isCorruptWorld, ELEMENT_DISPLAY } from '../data/CampaignFights';
import { getEffectiveFightDef } from '../data/CampaignFightsHard';
import { CORRUPT_WORLDS } from '../data/CorruptWorlds';
import { TagTeamState, isPledgeFight } from '../data/FightFormats';
import { getWorldBossDef } from '../boss/bosses';
import { Music } from '../audio';

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
  { id: 'earth', name: 'Earth', emoji: '🗿', color: 0x887755 },
];

const COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'oil',     name: 'Oil',      emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',  name: 'Shadow',   emoji: '🌑', color: 0x330044 },
  { id: 'ice',     name: 'Ice',      emoji: '❄️', color: 0x88ccff },
  { id: 'growth',  name: 'Growth',   emoji: '🐛', color: 0x88bb22 },
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
  { id: 'slime',       name: 'Acid',        emoji: '💚', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

const ABSTRACT_COMBINED_ELEMENTS: ElementDef[] = [
  { id: 'magnet',     name: 'Magnet',     emoji: '🔗', color: 0xcc2244 },
  { id: 'metal',      name: 'Metal',      emoji: '⚙️',  color: 0x8899aa },
  { id: 'plasma',     name: 'Plasma',     emoji: '🔮',  color: 0xaa22ff },
  { id: 'gunpowder', name: 'Gunpowder', emoji: '💀',  color: 0x440066 },
  { id: 'echo',       name: 'Echo',       emoji: '🦇',  color: 0xccccff },
  { id: 'rubber',     name: 'Rubber',     emoji: '🎾',  color: 0xff5577 },
  { id: 'magic',      name: 'Magic',      emoji: '📖',  color: 0x9944ff },
  { id: 'technology', name: 'Technology', emoji: '💻',  color: 0x44ccaa },
  { id: 'silence',    name: 'Silence',    emoji: '😶',  color: 0x1a0022 },
  { id: 'subterfuge', name: 'Subterfuge', emoji: '🕴️', color: 0xcc2233 },
];

export class CampaignElementSelectScene extends Phaser.Scene {
  /** Set once the bond modal has answered, so re-entry does not reopen it. */
  private bondChosen = false;
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
  /** Mid-run tag-team state — set when re-picking after a death. */
  private tagTeam: TagTeamState | null = null;

  private elemPage = 0;
  private perkIndices: Record<string, number> = {};
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'CampaignElementSelectScene' });
  }

  init(data: {
    worldId: string; nodeId: string; isChallenge: boolean; kind: string;
    slotIdx: 0 | 1 | 2; hardMode: boolean; enemyElementId: string; difficulty: number;
    mutations?: string[]; starredMutations?: string[]; tagTeam?: TagTeamState;
  }): void {
    this.tagTeam = data.tagTeam ?? null;
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
    Music.play('campaign');
    const { width, height } = this.scale;
    const cx = width / 2;
    const world = getAnyWorld(this.worldId);

    const accent = world?.color ?? C.ember;
    addBackdrop(this, { accent, variant: 'lattice', motes: 18 });

    const enemyDef = this.findElement(this.enemyElementId);
    const worldName = (world?.name ?? '').toUpperCase();
    let vsLine = enemyDef
      ? `${worldName} WORLD   ·   VS  ${enemyDef.emoji} ${enemyDef.name.toUpperCase()}`
      : `${worldName} WORLD`;
    const pledge = isPledgeFight(this.tagTeam);
    if (this.tagTeam) {
      const burned = this.tagTeam.usedElements
        .map((id) => this.findElement(id)?.emoji ?? id)
        .join(' ');
      const left = this.tagTeam.pledgesLeft ?? 0;
      vsLine = (pledge
        ? `🛡 ${left} PLEDGE${left === 1 ? '' : 'S'} LEFT`
        : `FOE ${this.tagTeam.index + 1}/${this.tagTeam.enemies.length}`)
        + (burned ? `   ·   ${pledge ? 'FALLEN' : 'BURNED'}: ${burned}` : '');
    }

    addTitle(this, {
      // The pledge picker is only ever reached by dying, so it never reads "choose".
      x: cx, y: 62, size: 34, accent,
      text: pledge ? 'A SOVEREIGN ANSWERS' : (this.tagTeam ? 'TAG IN' : 'CHOOSE YOUR ELEMENT'),
      subtitle: vsLine,
    });

    addBackButton(this, () => this.goBack());
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());

    this.renderElements(width, height, cx);
  }

  private findElement(id: string): ElementDef | undefined {
    const known = BASE_ELEMENTS.find((e) => e.id === id)
      ?? COMBINED_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_ELEMENTS.find((e) => e.id === id)
      ?? ABSTRACT_COMBINED_ELEMENTS.find((e) => e.id === id);
    if (known) return known;
    // Corrupt-realm opponents (the cast-out elements) are display-only here.
    const display = ELEMENT_DISPLAY[id];
    return display ? { id, name: display.name, emoji: display.emoji, color: 0xc4392c } : undefined;
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
    // The campaign's own reward, so it belongs on the campaign's roster too.
    const unlockedFinale = unlockedFinaleElements();
    const unlockedExtra = [...unlockedCombined, ...unlockedAbstract, ...unlockedAbstractCombined, ...unlockedFinale];

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
            const em: Record<string, string> = { fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🗿' };
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
    // Quantum is two elements, and which two has to be settled before anything is launched.
    // The picker writes the choice to the save; ArenaScene reads it from there.
    if (elementId === 'quantum' && !this.bondChosen) {
      openBondPicker(this, (a, b) => {
        PlayerData.setQuantumBond(a, b);
        this.bondChosen = true;
        this.selectElement(elementId);
      });
      return;
    }

    this.scene.stop('CampaignWorldScene');

    if (this.kind === 'gauntlet') {
      this.launchCampaignGauntlet(elementId);
      return;
    }

    if (this.kind === 'invasion') {
      // Invasion is a survival mode, not a scripted bout — it needs the arena's
      // invasion mode rather than the fight def, and pays corrupt shards instead
      // of Sparks. The campaign payload is still passed so the results screen
      // returns to the world map rather than the title.
      this.scene.start('ArenaScene', {
        elementId,
        mode: 'invasion',
        invasionDifficulty: this.invasionDifficultyId(),
        playerPerk: PlayerData.getEquippedPerk(elementId),
        campaign: {
          slot: this.slotIdx,
          worldId: this.worldId,
          fightId: this.nodeId,
          isChallenge: false,
          hardMode: this.hardMode,
        },
      });
      return;
    }

    // A challenge node whose world has a Sovereign is a boss fight, not a
    // mutation duel — the def drives the whole encounter and mutations stay home.
    const bossDef = this.isChallenge ? getWorldBossDef(this.worldId) : undefined;

    // Tag-team: elements burned by earlier deaths in this bout stay burned.
    if (this.tagTeam?.usedElements.includes(elementId)) {
      this.cameras.main.shake(150, 0.004);
      return;
    }
    // A fresh bout on a tag-team fight def opens the chain at foe one.
    let tagTeam = this.tagTeam;
    let enemyElementId = this.enemyElementId;
    if (!tagTeam) {
      const format = getEffectiveFightDef(this.nodeId, this.hardMode)?.format;
      // Chains are duels only — the def drives a boss encounter, so a list of foes has
      // nothing to swap in. A pledge fight is the opposite: it exists *for* the boss,
      // giving the finale its lives without changing who is standing there.
      if (format?.kind === 'tagteam' && !bossDef) {
        tagTeam = { enemies: format.enemies, index: 0, enemyHp: null, usedElements: [] };
      } else if (format?.kind === 'pledge') {
        tagTeam = {
          enemies: [this.enemyElementId], index: 0, enemyHp: null, usedElements: [],
          pledgesLeft: format.pledges, bossResume: null,
        };
      }
    }
    if (tagTeam) enemyElementId = tagTeam.enemies[tagTeam.index];

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId,
      difficulty: this.difficulty,
      mode: bossDef ? 'worldboss' : undefined,
      bossId: bossDef ? this.worldId : undefined,
      mutations: bossDef ? [] : this.campaignMutations,
      starredMutations: bossDef ? [] : this.campaignStarredMutations,
      tagTeam: tagTeam ?? undefined,
      playerPerk: PlayerData.getEquippedPerk(elementId),
      campaign: {
        slot: this.slotIdx,
        worldId: this.worldId,
        fightId: this.nodeId,
        isChallenge: this.isChallenge,
        hardMode: this.hardMode,
      },
    });
  }

  /** Deeper worlds send tougher husks; Hard Mode sends the worst of them. */
  private invasionDifficultyId(): string {
    if (this.hardMode) return 'masochistic';
    if (getWorldTier(this.worldId) >= 2 || isAbstractWorld(this.worldId) || isCorruptWorld(this.worldId)) return 'brutal';
    return 'normal';
  }

  private launchCampaignGauntlet(elementId: string): void {
    // A corrupt world's gauntlet draws its bouts from the cast-out elements —
    // every one of them has NPC AI, and the realm should feel like itself.
    const allElementIds = (isCorruptWorld(this.worldId) ? CORRUPT_WORLDS : [...WORLDS, ...ABSTRACT_WORLDS])
      .map((w) => w.id);
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
      campaign: { slot: this.slotIdx, worldId: this.worldId, fightId: this.nodeId, isChallenge: false, hardMode: this.hardMode },
    });
  }

  private goBack(): void {
    this.scene.start('CampaignFightMenuScene', {
      worldId: this.worldId,
      nodeId: this.nodeId,
      isChallenge: this.isChallenge,
      kind: this.kind,
      slotIdx: this.slotIdx,
      hardMode: this.hardMode,
    });
  }
}
