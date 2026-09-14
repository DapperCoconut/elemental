import Phaser from 'phaser';
import { getAnyWorld, ABSTRACT_WORLDS } from '../data/AbstractWorlds';
import { WORLDS } from '../data/Worlds';
import * as PlayerData from '../data/PlayerData';
import { ElementDef, findElementDef } from '../data/ElementRoster';
import {
  C, addBackdrop, addBackButton, addTitle, ElementPanels, openBondPicker, renderElementGrid,
} from '../ui';
import {
  GauntletState,
  CampaignGauntletContext,
  GAUNTLET_DIFFICULTY,
  GAUNTLET_HARD_DIFFICULTY,
  gauntletDifficulty,
  emptyRunBoosts,
} from '../data/GauntletData';
import { MUTATIONS, getBossMutationIds } from '../data/Mutations';
import { getWorldTier, isAbstractWorld, isCorruptWorld, ELEMENT_DISPLAY } from '../data/CampaignFights';
import { getEffectiveFightDef } from '../data/CampaignFightsHard';
import { CORRUPT_WORLDS } from '../data/CorruptWorlds';
import { TagTeamState, isPledgeFight, freshRealityTagTeam } from '../data/FightFormats';
import { allSelectableElements } from '../data/ElementRoster';
import { getWorldBossDef } from '../boss/bosses';
import { Music } from '../audio';

const GAUNTLET_EXCLUDED_MUTATIONS = new Set(['boss', 'raid', 'golf']);

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
  /**
   * Reality dungeon entry / chapel re-pick. When set, every campaign field in
   * the payload is furniture: the pick launches the dungeon or the boss.
   */
  private reality: { kind: 'trials' | 'boss' } | null = null;

  /** Accent for the pager, taken from the world this fight belongs to. */
  private accent = C.ember;
  private elemPage = 0;
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  /** The info / mastery / customize overlays, identical to the main menu's. */
  private panels!: ElementPanels;

  constructor() {
    super({ key: 'CampaignElementSelectScene' });
  }

  init(data: {
    worldId: string; nodeId: string; isChallenge: boolean; kind: string;
    slotIdx: 0 | 1 | 2; hardMode: boolean; enemyElementId: string; difficulty: number;
    mutations?: string[]; starredMutations?: string[]; tagTeam?: TagTeamState;
    reality?: { kind: 'trials' | 'boss' };
  }): void {
    this.reality = data.reality ?? null;
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
    this.phaseObjects = [];
  }

  create(): void {
    Music.play('campaign');
    const cx = this.scale.width / 2;
    const world = getAnyWorld(this.worldId);

    const accent = this.reality ? 0x2b4fd8 : (world?.color ?? C.ember);
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

    let title = pledge ? 'A SOVEREIGN ANSWERS' : (this.tagTeam ? 'TAG IN' : 'CHOOSE YOUR ELEMENT');
    if (this.reality) {
      // Past the crack, the campaign words stop fitting.
      title = this.tagTeam?.usedElements.length ? 'ANOTHER VESSEL' : 'CHOOSE YOUR VESSEL';
      vsLine = this.reality.kind === 'trials'
        ? 'THE CRACK IN THE WORLD   ·   FIVE TRIALS WAIT BELOW'
        : `◈ ${this.tagTeam?.pledgesLeft ?? 0} VESSELS IN RESERVE`
          + (this.tagTeam?.usedElements.length
            ? `   ·   LOST: ${this.tagTeam.usedElements
              .map((id) => this.findElement(id)?.emoji ?? id).join(' ')}`
            : '');
    }

    addTitle(this, {
      // The pledge picker is only ever reached by dying, so it never reads "choose".
      x: cx, y: 62, size: 34, accent,
      text: title,
      subtitle: vsLine,
    });

    this.panels = new ElementPanels(this, () => this.renderElements());

    const back = () => {
      if (this.panels.isOpen()) this.panels.closeElementInfo();
      else this.goBack();
    };
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    this.accent = accent;
    this.renderElements();
  }

  private findElement(id: string): ElementDef | undefined {
    const known = findElementDef(id);
    if (known) return known;
    // Corrupt-realm opponents (the cast-out elements) are display-only here.
    const display = ELEMENT_DISPLAY[id];
    return display
      ? { id, name: display.name, emoji: display.emoji, color: 0xc4392c, available: true }
      : undefined;
  }

  private renderElements(): void {
    for (const obj of this.phaseObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.phaseObjects = renderElementGrid(this, {
      y: this.scale.height / 2 + 52,
      page: this.elemPage,
      panels: this.panels,
      accent: this.accent,
      onPageChange: (pg) => { this.elemPage = pg; this.renderElements(); },
      onSelect: (id) => this.selectElement(id),
      // Tag team: elements burned by earlier deaths in this bout stay burned.
      lockedLabel: (el) => this.tagTeam?.usedElements.includes(el.id) ? '⟳ ALREADY FOUGHT' : null,
      onLockedSelect: () => this.cameras.main.shake(150, 0.004),
      emptyText: 'No extra elements unlocked yet.\nVisit the LAB to unlock combined elements.',
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

    // Reality: the pick either walks into the trials or takes the next life
    // in the chapel. Nothing campaign-shaped applies.
    if (this.reality) {
      if (this.reality.kind === 'trials') {
        // The fifth trial mirrors whatever has killed this save the most; the
        // roster test keeps a dead id from being asked to fight. No history
        // yet → any real element will do.
        const isRealBot = (id: string) =>
          id !== 'quantum' && findElementDef(id) !== undefined;
        const pool = allSelectableElements().filter((e) => isRealBot(e.id));
        const mirror = PlayerData.mostDiedToElement(isRealBot)
          ?? pool[Math.floor(Math.random() * pool.length)]?.id ?? 'fire';
        // The npc walks in as the inert `reality` element and only takes the
        // mirror's shape in the fifth room — otherwise an enemy like Fortune
        // stands its shop up over the whole dungeon. Difficulty 3 is Hard.
        this.scene.start('ArenaScene', {
          elementId,
          enemyElementId: 'reality',
          difficulty: 3,
          reality: { kind: 'trials', roomIdx: 0, mirrorId: mirror },
          playerPerk: PlayerData.getEquippedPerk(elementId),
        });
      } else {
        const tag = this.tagTeam ?? freshRealityTagTeam(allSelectableElements().length);
        this.scene.start('ArenaScene', {
          elementId,
          enemyElementId: 'reality',
          difficulty: 5,
          reality: { kind: 'boss' },
          tagTeam: tag,
          playerPerk: PlayerData.getEquippedPerk(elementId),
        });
      }
      return;
    }

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

    const difficulty0 = gauntletDifficulty(
      this.hardMode ? GAUNTLET_HARD_DIFFICULTY[0] : GAUNTLET_DIFFICULTY[0],
    );
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
    // The dungeon door is on the title screen, so back goes home.
    if (this.reality) {
      this.scene.start('TitleScene');
      return;
    }
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
