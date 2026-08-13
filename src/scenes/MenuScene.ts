import Phaser from 'phaser';
import { DIFFICULTY_PRESETS } from '../entities/NpcOpponent';
import { SHARD_REWARDS } from '../data/Upgrades';
import { MUTATIONS, activeMutationIds, starredMutationIds, clearMutationSelection, getTotalRewardMult, STARRED_REWARD_MULT, getMutationDef } from '../data/Mutations';
import { clearConsumedItems } from '../data/Items';
import * as PlayerData from '../data/PlayerData';
import { applyKonamiCheat } from '../data/CheatSave';
import { getPerksForElement, getPerkById } from '../data/Perks';
import { buildNpcLoadout } from '../data/NpcLoadout';
import { INVASION_DIFFICULTIES, InvasionDifficultyId } from '../invasion/InvasionKit';
import { Bounty, difficultyLabel } from '../data/Bounties';
import { TagTeamState, freshKingTagTeam } from '../data/FightFormats';
import {
  SECRET_MODES, SCREWS_PER_PLATE, SecretModeDef, SecretModeId,
  secretModeForDifficulty, getSecretMode, freshSecretTag,
} from '../data/SecretModes';
import { SECRET_MAPS, SecretMapId } from '../data/SecretMaps';
import { setProgressLocked } from '../data/ProgressLock';
import { getUnstableRecipe } from '../data/UnstableRecipes';

import { ElementDef, findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addCardPlate, addOverlayChrome,
  addRowPlate, addSectionLabel, addWell, addTitle, fillDiamond,
  ElementPanels, renderElementGrid,
} from '../ui';
import { Music, Sfx } from '../audio';


const DIFF_COLORS = [0x22cc44, 0x88cc22, 0xddaa00, 0xee5500, 0xcc0022];

// WWSSADADBA (Konami-style, using WASD mapping: W=Up S=Down A=Left D=Right then B A)
const KONAMI_SEQUENCE = ['W','W','S','S','A','D','A','D','B','A'];

/** How many elements a Tag Team side fields. */
const TAG_TEAM_SIZE = 3;

/** The rung a stabilisation bout is fought at. Expert — see `DIFFICULTY_PRESETS`. */
const STABILISE_DIFFICULTY = 4;

export class MenuScene extends Phaser.Scene {
  private selectionPhase:
    | 'player' | 'enemy' | 'difficulty'
    // Secret-mode follow-ups, each entered from the difficulty screen.
    | 'duoEnemy' | 'teamPlayer' | 'teamEnemy' | 'mapSelect' = 'player';
  private playerChoice: string | null = null;
  private enemyChoice: string | null = null;
  private elemPage = 0;
  /** The secret mode being loaded out, while its extra picks are being made. */
  private pendingSecret: SecretModeId | null = null;
  /** Tag Team benches, built up over the two team phases. */
  private teamPlayer: string[] = [];
  private teamEnemy: string[] = [];
  private isInvasion = false;
  /**
   * The Disgraced content reuses this screen rather than carrying its own
   * element picker — masteries, skins, perks and the info panels all live here,
   * and a secret fight should still be loaded out like any other.
   */
  private isBoss = false;
  /** The Devourer of Kings — the hard mode behind the same door. */
  private isBossHard = false;
  /**
   * The King's tag-team run: three elements, two switches. Present from the
   * first pick onward, and handed back here by ArenaScene every time an element
   * falls — carrying the elements already burned and the body the King is on.
   */
  private bossTag: TagTeamState | null = null;
  private bounty: Bounty | null = null;
  /**
   * The unstable forge this visit is here to settle, read off the save rather
   * than passed in — the Disgraced Lab records it before it sends us here, so a
   * reload cannot lose track of a nucleus that has already been spent.
   */
  private stabilize: PlayerData.PendingUnstableForge | null = null;
  private invasionDifficultyId: InvasionDifficultyId = 'normal';

  /** The info / mastery / customize / dictionary overlays behind the element cards. */
  private panels!: ElementPanels;

  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private mutationOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private mutationScrollHandler: (...args: unknown[]) => void = () => {};
  private hoveredDifficulty = 1;
  private konamiBuffer: string[] = [];
  /**
   * Y of the MUTATIONS heading on the difficulty screen. The rewards sidebar is
   * rebuilt on hover without re-running the layout, so the one number both
   * passes need lives here rather than being hardcoded in two places.
   */
  private mutPanelTop = 327;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(data?: { mode?: string; bounty?: Bounty; hard?: boolean; tagTeam?: TagTeamState }): void {
    Music.play('menu');
    // Backing out of the practice range comes through here. Lowering the lock on
    // the way past means nothing can strand a profile with its progress frozen.
    setProgressLocked(false);
    this.isInvasion = data?.mode === 'invasion';
    this.isBoss = data?.mode === 'boss';
    // Guarded rather than trusted: the door is the only way in, but a stale
    // scene payload must never open hard mode for a save that has not earned it.
    this.isBossHard = this.isBoss && data?.hard === true && PlayerData.isDevourerUnlocked();
    // Absent on the way in through the door, present on every tag-in after a fall.
    this.bossTag = this.isBoss ? (data?.tagTeam ?? null) : null;
    this.bounty = data?.mode === 'bounty' ? (data.bounty ?? null) : null;
    this.stabilize = data?.mode === 'stabilize' ? PlayerData.getPendingUnstable() : null;
    this.invasionDifficultyId = 'normal';
    clearMutationSelection();
    clearConsumedItems();
    this.selectionPhase = 'player';
    this.playerChoice = null;
    this.enemyChoice = null;
    this.elemPage = 0;
    this.phaseObjects = [];
    this.pendingSecret = null;
    this.teamPlayer = [];
    this.teamEnemy = [];

    // A stabilisation walks straight into the bench picker: the far side is
    // already decided (it is the three things that came off the forge), so the
    // only question left is which three of yours go and hold them down.
    if (this.stabilize) {
      this.teamEnemy = [...this.stabilize.ingredients];
      this.selectionPhase = 'teamPlayer';
    }

    const { width, height } = this.scale;
    const cx = width / 2;

    // Rebuilt every entry: the overlays hold display-list handles, and a scene
    // restart has already destroyed the ones a previous visit was holding.
    this.panels = new ElementPanels(this, () => this.renderPhase(width, height, cx));

    // ── Persistent chrome ──────────────────────────────────────────
    const isDisgraced = this.isBoss || !!this.bounty;
    const stabiliseRecipe = this.stabilize ? getUnstableRecipe(this.stabilize.result) : null;
    const sceneAccent = this.isInvasion || this.isBoss ? C.corrupt
      : this.bounty ? C.gold
      : this.stabilize ? 0x7cc93d
      : C.ember;
    addBackdrop(this, {
      accent: sceneAccent,
      variant: this.isBoss ? 'void' : 'lattice',
      motes: this.isBoss ? 10 : 20,
    });

    addTitle(this, {
      x: cx, y: 76,
      text: this.isBossHard ? 'THE DOOR BEHIND THE DOOR'
        : this.isBoss ? 'THE SEALED DOOR'
        : this.stabilize ? 'STABILISATION' : isDisgraced ? 'BOUNTY CONTRACT' : 'ELEMENTAL',
      accent: sceneAccent, size: this.isBoss ? 46 : this.stabilize || isDisgraced ? 44 : 54, rule: true,
    });

    // Footer: controls first, mission statement beneath it.
    const controlsHint = 'WASD MOVE     ·     LMB / E / R / F / Q ABILITIES     ·     SPACE DODGE';
    this.add.text(cx, height - 42, controlsHint, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const mission = this.isInvasion ? 'Survive as long as you can.'
      : this.isBossHard ? 'Four phases. No heals. Three elements, two tags. One decision at the end of it.'
      : this.isBoss ? 'Two phases. Three elements, two tags. He keeps every wound.'
      : this.bounty ? 'Complete the contract to claim its Divine Nuclei.'
      : this.stabilize
        ? `Put down all three and ${stabiliseRecipe?.resultName ?? 'the forge'} is yours. Fall, and the Nucleus goes with it.`
      : 'Defeat the enemy to win.';
    this.add.text(cx, height - 22, mission, {
      fontSize: '12px', fontFamily: FONT_UI, color: T.ghost,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    addBackButton(this, () => this.goBack());

    // Esc: close mutation info overlay, then element info overlay, then go back
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.mutationOverlayObjects.length > 0) {
        this.closeMutationInfo();
      } else if (this.panels.isOpen()) {
        this.panels.closeElementInfo();
      } else {
        this.goBack();
      }
    });

    // Konami sequence listener (WWSSADADBA → currencies, gauntlets, mutations)
    this.konamiBuffer = [];
    this.input.keyboard!.on('keydown', (evt: KeyboardEvent) => {
      this.konamiBuffer.push(evt.key.toUpperCase());
      if (this.konamiBuffer.length > KONAMI_SEQUENCE.length) this.konamiBuffer.shift();
      if (this.konamiBuffer.join('') === KONAMI_SEQUENCE.join('')) {
        // Shared with TitleScene so both entry points grant the same thing.
        applyKonamiCheat();
        this.renderPhase(width, height, cx);
      }
    });

    this.renderPhase(width, height, cx);
  }

  private renderPhase(width: number, height: number, cx: number): void {
    this.input.off('wheel', this.mutationScrollHandler);
    for (const obj of this.rewardsPanelDynObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.rewardsPanelDynObjects = [];
    for (const obj of this.phaseObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.phaseObjects = [];

    if (this.selectionPhase === 'difficulty' && this.isInvasion) {
      const playerEl = findElementDef(this.playerChoice ?? '');
      this.renderInvasionStartPhase(width, height, cx, playerEl);
    } else if (this.selectionPhase === 'difficulty' && (this.isBoss || this.bounty)) {
      const playerEl = findElementDef(this.playerChoice ?? '');
      this.renderDisgracedStartPhase(width, height, cx, playerEl);
    } else if (this.selectionPhase === 'difficulty') {
      this.renderDifficultyPhase(width, height, cx);
    } else if (this.selectionPhase === 'mapSelect') {
      this.renderMapSelectPhase(width, height, cx);
    } else {
      this.renderElementPhase(width, height, cx);
    }
  }

  private renderElementPhase(width: number, height: number, cx: number): void {
    const isPlayerPhase = this.selectionPhase === 'player' || this.selectionPhase === 'teamPlayer';
    // Secret-mode phases pick several elements, so the grid's "already taken"
    // list and the heading both come from whichever bench is being filled.
    const secret = getSecretMode(this.pendingSecret);
    const bench = this.selectionPhase === 'teamPlayer' ? this.teamPlayer
      : this.selectionPhase === 'teamEnemy' ? this.teamEnemy
      : null;

    // Mid-run the door is a tag-in, not a start: say which it is, and how many
    // switches are left, before the player commits the next element.
    const tagsLeft = this.bossTag?.pledgesLeft ?? 0;
    const tagPips = this.bossTag
      ? `${'●'.repeat(tagsLeft)}${'○'.repeat(this.bossTag.usedElements.length)}`
      : '';
    const stabiliseRecipe = this.stabilize ? getUnstableRecipe(this.stabilize.result) : null;
    const subtitle = this.stabilize
      ? `⚗ ${(stabiliseRecipe?.resultName ?? this.stabilize.result).toUpperCase()} — YOUR BENCH  ${this.teamPlayer.length}/${TAG_TEAM_SIZE}`
      : bench
      ? `${secret?.icon ?? '🔁'} ${this.selectionPhase === 'teamPlayer' ? 'YOUR BENCH' : 'THEIR SIDE'}  —  ${bench.length}/${TAG_TEAM_SIZE} CHOSEN`
      : this.selectionPhase === 'duoEnemy'
        ? `${secret?.icon ?? '⚔️'} DUO — choose the second enemy element`
      : isPlayerPhase
      ? this.isInvasion ? 'INVASION — pick your element'
        : this.bossTag && this.bossTag.usedElements.length > 0
          ? `⟳ TAG IN  ${tagPips}  — he kept every wound`
        : this.isBoss ? '👑 THE DISGRACED KING — pick your element'
        : this.bounty ? `${this.bounty.emoji} ${this.bounty.name.toUpperCase()} CONTRACT — pick your element`
        : 'Choose your element'
      : 'Choose enemy element';
    const subtitleObj = addSectionLabel(this, {
      x: cx, y: 152, text: subtitle.toUpperCase(),
      accent: isPlayerPhase ? C.verdant : C.blood, width: 560,
    });
    this.phaseObjects.push(subtitleObj);

    // The bench so far, so a three-element choice can be made as a set.
    if (bench) {
      const slots = Array.from({ length: TAG_TEAM_SIZE }, (_, i) => {
        const el = bench[i] ? findElementDef(bench[i]) : null;
        return el ? `${el.emoji} ${el.name.toUpperCase()}` : '◇ ——';
      });
      const benchLine = this.add.text(cx, 190, slots.join('    ·    '), {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1.5,
        backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(benchLine);
    }

    // Stabilisation: the far side is fixed, so name it rather than making the
    // player remember which binder they picked at the forge.
    if (this.stabilize) {
      const foes = this.teamEnemy
        .map((id) => { const d = findElementDef(id); return d ? `${d.emoji} ${d.name.toUpperCase()}` : id; })
        .join('    ·    ');
      const foeLine = this.add.text(cx, 216, `FACING:  ${foes}    ·    EXPERT`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: hex(mix(C.blood, 0xffffff, 0.5)), letterSpacing: 1.5,
        backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(foeLine);
    }

    // Duo: remind them who is already on the far side of the arena.
    if (this.selectionPhase === 'duoEnemy' && this.enemyChoice) {
      const first = findElementDef(this.enemyChoice);
      if (first) {
        const line = this.add.text(cx, 190, `ALREADY FACING:  ${first.emoji} ${first.name.toUpperCase()}`, {
          fontSize: '14px', fontFamily: FONT_DISPLAY, color: hex(mix(C.blood, 0xffffff, 0.5)), letterSpacing: 1.5,
          backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
        }).setOrigin(0.5).setDepth(DEPTH.content);
        this.phaseObjects.push(line);
      }
    }

    if (this.selectionPhase === 'enemy' && this.playerChoice) {
      const chosen = findElementDef(this.playerChoice);
      if (chosen) {
        // Reminder of the pick you already locked in, framed as a duel card.
        const g = this.add.graphics().setDepth(DEPTH.content - 1);
        fillDiamond(g, cx - 96, 190, 4, C.verdant, 0.7);
        fillDiamond(g, cx + 96, 190, 4, C.blood, 0.7);
        g.lineStyle(1, C.line, 0.6);
        g.beginPath(); g.moveTo(cx - 90, 190); g.lineTo(cx + 90, 190); g.strokePath();

        const indicator = this.add.text(cx, 190, `  ${chosen.emoji} ${chosen.name.toUpperCase()}   VS   ?  `, {
          fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1.5,
          backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
        }).setOrigin(0.5).setDepth(DEPTH.content);
        this.phaseObjects.push(g, indicator);
      }
    }

    this.phaseObjects.push(...renderElementGrid(this, {
      y: this.scale.height / 2 + 52,
      page: this.elemPage,
      panels: this.panels,
      onPageChange: (pg) => { this.elemPage = pg; this.renderPhase(width, height, cx); },
      onSelect: (id) => this.handleElementClick(id, width, height, cx),
      // Tag team: an element fights the King at most once per run. Burned ones
      // stay on the board, greyed, so the roster you have left is legible.
      lockedLabel: (el) => {
        if (isPlayerPhase && this.bossTag?.usedElements.includes(el.id) === true) return '⟳ ALREADY FOUGHT';
        // A Tag Team side fields three *different* elements — one body cannot tag itself in.
        if (bench?.includes(el.id)) return '✔ ON THE BENCH';
        // Duo's two foes must be different, or "pick a second element" means nothing.
        if (this.selectionPhase === 'duoEnemy' && el.id === this.enemyChoice) return '✔ ALREADY FACING';
        return null;
      },
      // You load out the element you are about to play, not the one you are fighting.
      showCustomize: isPlayerPhase,
      showPerkDictionary: isPlayerPhase,
    }));

  }

  /**
   * Briefing + START for the two Disgraced fights. Both are fixed encounters —
   * there is no enemy or difficulty left to choose — so this phase exists purely
   * to state what you are walking into and let you back out to change loadout.
   */
  private renderDisgracedStartPhase(
    width: number, height: number, cx: number, playerEl: ElementDef | undefined,
  ): void {
    void width;
    const boss = this.isBoss;
    const hard = this.isBossHard;
    const b = this.bounty;
    const accent = hard ? C.blood : boss ? C.corrupt : C.gold;

    const heading = this.add.text(cx, 158,
      hard ? 'THE DEVOURER OF KINGS' : boss ? 'THE DISGRACED KING' : 'CONTRACT', {
      fontSize: boss ? '30px' : '28px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0xffffff, 0.5)),
      stroke: hex(mix(accent, 0x000000, 0.78)), strokeThickness: 5, letterSpacing: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(heading);

    if (playerEl) {
      const masteryOn = PlayerData.isMasteryEnabled(playerEl.id);
      const perkId = PlayerData.getEquippedPerk(playerEl.id);
      const perk = perkId ? getPerkById(perkId) : null;
      // Restates the loadout that is actually going into the fight, so the
      // mastery/perk toggles a step back are visibly in effect.
      const bits = [`${playerEl.emoji}  ${playerEl.name.toUpperCase()}`];
      if (masteryOn) bits.push('★ MASTERY ON');
      if (perk) bits.push(`${perk.emoji} ${perk.name.toUpperCase()}`);
      const indicator = this.add.text(cx, 206, bits.join('   ·   '), {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(indicator);
    }

    // Mid-run: what is left of the team, and what the King is still standing on.
    if (boss && this.bossTag && this.bossTag.usedElements.length > 0) {
      const left = this.bossTag.pledgesLeft ?? 0;
      const burned = this.bossTag.usedElements
        .map((id) => findElementDef(id)?.name.toUpperCase() ?? id.toUpperCase())
        .join('  ·  ');
      const tagLine = this.add.text(cx, 232,
        `⟳  ${'●'.repeat(left)}${'○'.repeat(this.bossTag.usedElements.length)}   SWITCHES LEFT      FALLEN:  ${burned}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(C.frost), letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(tagLine);
    }

    const bodyY = 262;

    if (boss) {
      this.phaseObjects.push(addSectionLabel(this, {
        x: cx, y: bodyY,
        text: hard ? 'WHAT WAS ALWAYS BEHIND HIM' : 'WHAT WAITS BEHIND THE DOOR',
        accent, width: 560,
      }));
      const lines = hard ? [
        'The same four bodies. Harder, faster, and worth more when they land.',
        'NO REPAIR CELLS.  Nothing in the hall will heal you.',
        '',
        'PHASE IV  ·  the crown splits, and something you have not met steps out.',
        '',
        'It will not die at the end. You will have to decide what to do about that.',
      ] : [
        'PHASE I  ·  a war-mech that barely fits the hall. Only its head can be hurt.',
        'PHASE II  ·  the King himself, and whatever he has left.',
        '',
        'He does not repeat himself by accident. Learn the order.',
      ];
      // The tag rules are the same in both modes, so they are stated once here
      // rather than folded into either briefing.
      lines.push('',
        'TAG TEAM  ·  three elements, two switches. Fall, and a fresh element',
        'takes the floor — he keeps the body and every wound you put in it.');
      const body = this.add.text(cx, bodyY + 44, lines.join('\n'), {
        fontSize: '13px', fontFamily: FONT_UI, color: T.normal,
        align: 'center', lineSpacing: 8,
      }).setOrigin(0.5, 0).setDepth(DEPTH.content);
      this.phaseObjects.push(body);
    } else if (b) {
      this.phaseObjects.push(addSectionLabel(this, {
        x: cx, y: bodyY, text: 'THE TARGET', accent, width: 560,
      }));

      const target = this.add.text(cx, bodyY + 44, `${b.emoji}  ${b.name.toUpperCase()}   ·   ${difficultyLabel(b.difficulty)}`, {
        fontSize: '20px', fontFamily: FONT_DISPLAY,
        color: hex(mix(b.color, 0xffffff, 0.55)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(target);

      const mods = b.mutationIds.length === 0
        ? '— no modifiers —'
        : b.mutationIds.map((id) => {
            const d = getMutationDef(id);
            return d ? `${d.emoji} ${d.name.toUpperCase()}` : id;
          }).join('     +     ');
      const modText = this.add.text(cx, bodyY + 82, mods, {
        fontSize: '13px', fontFamily: FONT_DISPLAY,
        color: b.mutationIds.length === 0 ? T.ghost : T.gold, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(modText);

      const claimed = PlayerData.isBountyCompleted(b.key);
      const payout = this.add.text(cx, bodyY + 126, claimed ? '✔  ALREADY CLAIMED' : `💠  ×${b.reward}  ON COMPLETION`, {
        fontSize: '17px', fontFamily: FONT_DISPLAY,
        color: claimed ? T.good : hex(mix(C.corrupt, 0xffffff, 0.55)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(payout);
    }

    const startBtn = addButton(this, {
      x: cx, y: height - 74, w: 320, h: 56,
      label: hard ? 'GO DOWN' : boss ? 'OPEN THE DOOR' : 'ACCEPT CONTRACT',
      icon: hard ? '🕳' : boss ? '🚪' : '⚔',
      accent, variant: 'solid', fontSize: 19,
      onClick: () => this.launchDisgracedFight(),
    });
    startBtn.pulse();
    this.phaseObjects.push(startBtn.container);
  }

  private launchDisgracedFight(): void {
    const elementId = this.playerChoice;
    if (!elementId) return;

    if (this.isBoss) {
      this.cameras.main.shake(this.isBossHard ? 420 : 240, this.isBossHard ? 0.010 : 0.006);
      this.scene.start('ArenaScene', {
        elementId,
        // The boss body sits in the npc slot, so it needs an element no kit
        // reacts to — every attack comes from DisgracedKingKit instead.
        enemyElementId: 'king',
        difficulty: 3,
        mode: 'boss',
        bossHard: this.isBossHard,
        playerPerk: PlayerData.getEquippedPerk(elementId),
        // Carried across a tag-in; minted here on the way in through the door.
        tagTeam: this.bossTag ?? freshKingTagTeam(),
      });
      return;
    }

    const b = this.bounty;
    if (!b) return;

    // A contract's modifiers count toward its shard payout the same way a
    // hand-picked mutation loadout does — ArenaScene reads getTotalRewardMult()
    // off this module-level set on a win. create() already cleared it.
    for (const id of b.mutationIds) activeMutationIds.add(id);

    this.scene.start('ArenaScene', {
      elementId,
      enemyElementId: b.elementId,
      difficulty: b.difficulty,
      mutations: b.mutationIds,
      playerPerk: PlayerData.getEquippedPerk(elementId),
      bounty: { key: b.key, reward: b.reward },
    });
  }

  private renderInvasionStartPhase(width: number, height: number, cx: number, playerEl: ElementDef | undefined): void {
    const subtitle = this.add.text(cx, 158, 'INVASION', {
      fontSize: '30px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.corrupt, 0xffffff, 0.5)),
      stroke: hex(mix(C.corrupt, 0x000000, 0.78)), strokeThickness: 5, letterSpacing: 8,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(subtitle);

    if (playerEl) {
      const indicator = this.add.text(cx, 214, `${playerEl.emoji}  ${playerEl.name.toUpperCase()}   ·   HOLD THE LINE`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.phaseObjects.push(indicator);
    }

    // Mutations don't apply in Invasion mode — no selector shown here.

    // ── Difficulty selector ──────────────────────────────────────────
    const diffHeaderY = 260;
    const diffBtnY = 296;
    const diffDescY = 336;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: diffHeaderY, text: 'DIFFICULTY', accent: C.corrupt, width: 560,
    }));

    const descText = this.add.text(cx, diffDescY, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal,
      wordWrap: { width: 420 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(descText);

    const btnW = 152, btnH = 44, gap = 12;
    const totalW = INVASION_DIFFICULTIES.length * btnW + (INVASION_DIFFICULTIES.length - 1) * gap;
    const startX = cx - totalW / 2 + btnW / 2;

    // Selection is repaint-driven: each tile keeps a paint hook, and choosing
    // one re-lights every tile so exactly one reads as active.
    const tiles: Array<{ id: InvasionDifficultyId; paint: (s: 'idle' | 'hover' | 'active') => void; lbl: Phaser.GameObjects.Text; color: number }> = [];
    const updateSelection = () => {
      for (const t of tiles) {
        const selected = t.id === this.invasionDifficultyId;
        t.paint(selected ? 'active' : 'idle');
        t.lbl.setColor(selected ? '#ffffff' : hex(mix(t.color, 0xffffff, 0.4)));
      }
      descText.setText(INVASION_DIFFICULTIES.find((d) => d.id === this.invasionDifficultyId)!.description);
    };

    INVASION_DIFFICULTIES.forEach((def, i) => {
      const bx = startX + i * (btnW + gap);
      const plate = addCardPlate(this, {
        x: bx, y: diffBtnY, w: btnW, h: btnH, accent: def.color, cut: 10,
      });
      const lbl = this.add.text(bx, diffBtnY, def.label.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hit = this.add.rectangle(bx, diffBtnY, btnW, btnH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (def.id !== this.invasionDifficultyId) plate.paint('hover'); });
      hit.on('pointerout', () => { if (def.id !== this.invasionDifficultyId) plate.paint('idle'); });
      hit.on('pointerdown', () => { this.invasionDifficultyId = def.id; updateSelection(); });

      tiles.push({ id: def.id, paint: plate.paint, lbl, color: def.color });
      this.phaseObjects.push(plate.g, lbl, hit);
    });
    updateSelection();

    // START button
    const startBtn = addButton(this, {
      x: cx, y: height - 74, w: 300, h: 56,
      label: 'START INVASION', icon: '⚔',
      accent: C.corrupt, variant: 'solid', fontSize: 19,
      onClick: () => {
        this.scene.start('ArenaScene', {
          elementId: this.playerChoice,
          mode: 'invasion',
          invasionDifficulty: this.invasionDifficultyId,
          playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
        });
      },
    });
    startBtn.pulse();
    this.phaseObjects.push(startBtn.container);
  }

  private renderDifficultyPhase(width: number, height: number, cx: number): void {
    const playerEl = findElementDef(this.playerChoice ?? '');
    const enemyEl  = findElementDef(this.enemyChoice ?? '');

    // A plate that has come off is a permanent second row, so the whole screen
    // is laid out around whether there is one — everything above it tightens up
    // and the difficulty plates lose a few pixels of height to make the room.
    const revealed = SECRET_MODES.filter((m) => PlayerData.isSecretModeUnlocked(m.id));
    const hasRow    = revealed.length > 0;
    const headingY  = hasRow ? 146 : 152;
    const bannerY   = hasRow ? 178 : 186;
    const diffBtnY  = hasRow ? 214 : 228;
    const btnH      = hasRow ? 52 : 60;
    const descY     = hasRow ? 252 : 292;
    const secretLabelY = 274;
    const secretRowY   = 304;
    const mutTitleY = hasRow ? 340 : 327;
    this.mutPanelTop = mutTitleY;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: headingY, text: 'CHOOSE DIFFICULTY', accent: C.gold, width: 560,
    }));

    if (playerEl && enemyEl) {
      // The matchup banner: your element, a struck VS, then the opponent.
      const g = this.add.graphics().setDepth(DEPTH.content - 1);
      g.lineStyle(1, C.line, 0.7);
      g.beginPath(); g.moveTo(cx - 220, bannerY); g.lineTo(cx - 26, bannerY); g.strokePath();
      g.beginPath(); g.moveTo(cx + 26, bannerY); g.lineTo(cx + 220, bannerY); g.strokePath();
      fillDiamond(g, cx - 220, bannerY, 3, C.verdant, 0.7);
      fillDiamond(g, cx + 220, bannerY, 3, C.blood, 0.7);

      const you = this.add.text(cx - 34, bannerY, `${playerEl.emoji}  ${playerEl.name.toUpperCase()}`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
        backgroundColor: hex(C.void_), padding: { x: 8, y: 3 },
      }).setOrigin(1, 0.5).setDepth(DEPTH.content);

      const vs = this.add.text(cx, bannerY, 'VS', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
        backgroundColor: hex(C.void_), padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const foe = this.add.text(cx + 34, bannerY, `${enemyEl.emoji}  ${enemyEl.name.toUpperCase()}`, {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
        backgroundColor: hex(C.void_), padding: { x: 8, y: 3 },
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);

      this.phaseObjects.push(g, you, vs, foe);
    }

    const btnW = 148;
    const btnGap = 10;
    const totalW = DIFFICULTY_PRESETS.length * btnW + (DIFFICULTY_PRESETS.length - 1) * btnGap;
    const startX = cx - totalW / 2;

    const descText = this.add.text(cx, descY, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(descText);

    // HP and the shard payout are already printed on the plate — these say only
    // what the plate cannot.
    const DIFF_DESCRIPTIONS = [
      'Misses often  ·  rarely casts',
      'Some misses  ·  some casts',
      'Accurate  ·  full kit  ·  dodges',
      'Very accurate  ·  dodges actively',
      'Perfect aim  ·  fastest  ·  never stops dodging',
    ];

    DIFFICULTY_PRESETS.forEach((diff, i) => {
      const bx = startX + i * (btnW + btnGap) + btnW / 2;
      const color = DIFF_COLORS[i];
      const plate = addCardPlate(this, {
        x: bx, y: diffBtnY, w: btnW, h: btnH, accent: color, cut: 12,
      });

      // Threat pips — one lit diamond per difficulty level.
      const pips = this.add.graphics().setDepth(DEPTH.content);
      for (let k = 0; k < DIFFICULTY_PRESETS.length; k++) {
        fillDiamond(pips, bx - 22 + k * 11, diffBtnY - btnH / 2 + 9, k <= i ? 3 : 2,
          k <= i ? mix(color, 0xffffff, 0.45) : C.line, k <= i ? 1 : 0.6);
      }

      const labelText = this.add.text(bx, diffBtnY + 1, diff.label.toUpperCase(), {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hpText = this.add.text(bx, diffBtnY + 19, `${diff.hp} HP   💎+${SHARD_REWARDS[i]}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY,
        color: hex(mix(color, 0xffffff, 0.5)), letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const btn = this.add.rectangle(bx, diffBtnY, btnW, btnH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      btn
        .on('pointerover', () => {
          plate.paint('hover'); descText.setText(DIFF_DESCRIPTIONS[i]);
          this.hoveredDifficulty = diff.level;
          this.refreshRewardsPanel(width);
        })
        .on('pointerout',  () => { plate.paint('idle'); descText.setText(''); })
        .on('pointerdown', () => {
          const npcPool = getPerksForElement(this.enemyChoice ?? '');
          const npcPerk: string | null = (diff.level >= 4 && npcPool.length > 0)
            ? npcPool[Math.floor(Math.random() * npcPool.length)].id
            : null;
          this.scene.start('ArenaScene', {
            elementId: this.playerChoice,
            enemyElementId: this.enemyChoice,
            difficulty: diff.level,
            mutations: [...activeMutationIds],
            starredMutations: [...starredMutationIds],
            playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
            npcPerk,
            // Hard+ bots fight upgraded; Nightmare bots fight mastered. Computed here
            // rather than in ArenaScene so only plain 1v1 launches carry a loadout.
            npcLoadout: buildNpcLoadout(this.enemyChoice ?? '', diff.level),
          });
        });

      this.phaseObjects.push(plate.g, pips, btn, labelText, hpText);

      // ── The four screws ──────────────────────────────────────────
      // Drawn on every plate from the very first visit, whether or not the
      // player owns anything that could turn them. They are the hint.
      this.renderPlateScrews(i, bx, diffBtnY, btnW, btnH, color, width, height, cx);
    });

    // ── Whatever has already come off the wall ────────────────────────
    if (hasRow) this.renderSecretRow(revealed, cx, secretLabelY, secretRowY, width, height);

    // ── New mutation panel (scrollable list + rewards sidebar) ────────
    this.renderMutationPanel(width, height, cx, mutTitleY);
  }

  // ── Screws, plates, and what is under them ──────────────────────────

  /**
   * The four corner screws on one difficulty plate.
   *
   * With no screwdriver they are decoration: still drawn, still shiny, entirely
   * inert. With one they come out a click at a time — persisted per corner, so
   * a half-opened plate stays half-opened between visits — and the fourth one
   * lifts the plate off for good.
   */
  private renderPlateScrews(
    index: number, bx: number, by: number, w: number, h: number, accent: number,
    width: number, height: number, cx: number,
  ): void {
    const mode = secretModeForDifficulty(index);
    if (!mode) return;
    // Once the plate is off there is nothing left to unscrew — the mode lives
    // in the row below and the corners go back to being plain rivets.
    const done = PlayerData.isSecretModeUnlocked(mode.id);
    const removed = new Set(done ? [] : PlayerData.getRemovedScrews(mode.id));
    const hasTool = PlayerData.isScrewdriverFound();

    const inset = 9;
    const corners: Array<{ x: number; y: number }> = [
      { x: bx - w / 2 + inset, y: by - h / 2 + inset },
      { x: bx + w / 2 - inset, y: by - h / 2 + inset },
      { x: bx + w / 2 - inset, y: by + h / 2 - inset },
      { x: bx - w / 2 + inset, y: by + h / 2 - inset },
    ];

    corners.forEach((pt, corner) => {
      const out = removed.has(corner);
      // Drawn at the origin and *moved* into place, so a hover scale grows the
      // screw rather than flinging it away from the canvas corner.
      const g = this.add.graphics().setDepth(DEPTH.content + 2).setPosition(pt.x, pt.y);
      this.phaseObjects.push(g);
      this.paintScrew(g, 0, 0, accent, out, done);

      // Inert without the tool, and never interactive once the plate is off —
      // the hit rect below would otherwise sit on top of the difficulty button.
      // (Phaser's input is top-only by default, so while it exists it does
      // consume the click, which is exactly what a screw should do.)
      if (!hasTool || out || done) return;

      const hit = this.add.circle(pt.x, pt.y, 9, 0xffffff, 0)
        .setDepth(DEPTH.content + 3)
        .setInteractive({ useHandCursor: true });
      this.phaseObjects.push(hit);
      hit.on('pointerover', () => g.setScale(1.3));
      hit.on('pointerout', () => g.setScale(1));
      hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        this.unscrew(mode, corner, pt.x, pt.y, width, height, cx);
      });
    });
  }

  /** One screw head, or the empty hole it left behind. */
  private paintScrew(
    g: Phaser.GameObjects.Graphics, x: number, y: number, accent: number,
    out: boolean, plateOff: boolean,
  ): void {
    if (out) {
      // An empty countersunk hole: dark well, thin lit rim on the low side.
      g.fillStyle(C.void_, 0.95);
      g.fillCircle(x, y, 4.2);
      g.lineStyle(1, mix(accent, 0x000000, 0.5), 0.8);
      g.strokeCircle(x, y, 4.2);
      return;
    }
    const head = plateOff ? mix(accent, 0x000000, 0.45) : mix(C.steel, 0xffffff, 0.35);
    g.fillStyle(mix(head, 0x000000, 0.55), 1);
    g.fillCircle(x, y + 0.8, 4.6);
    g.fillStyle(head, 1);
    g.fillCircle(x, y, 4.4);
    // Cross slot, tilted so the five plates do not read as a stamped pattern.
    g.lineStyle(1.4, mix(head, 0x000000, 0.7), 1);
    g.beginPath(); g.moveTo(x - 3, y - 1.2); g.lineTo(x + 3, y + 1.2); g.strokePath();
    g.beginPath(); g.moveTo(x - 1.2, y + 3); g.lineTo(x + 1.2, y - 3); g.strokePath();
    // Highlight — this is a metal thing under a light.
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x - 1.4, y - 1.6, 1.1);
  }

  /**
   * Take one screw out. The fourth one takes the whole plate with it.
   */
  private unscrew(
    mode: SecretModeDef, corner: number, sx: number, sy: number,
    width: number, height: number, cx: number,
  ): void {
    // The reveal holds the old plate on screen for a beat before repainting, so
    // the fourth screw's hit rect outlives its own click. Nothing to do twice.
    if (PlayerData.isSecretModeUnlocked(mode.id)) return;
    const count = PlayerData.removeScrew(mode.id, corner);
    Sfx.play('ui-toggle-off');

    // The screw itself, spinning off the plate.
    const spinner = this.add.graphics().setDepth(DEPTH.content + 6);
    this.paintScrew(spinner, 0, 0, mode.color, false, false);
    spinner.setPosition(sx, sy);
    this.tweens.add({
      targets: spinner,
      x: sx + Phaser.Math.Between(-40, 40), y: sy + 70,
      angle: 720, alpha: 0, duration: 620, ease: 'Quad.easeIn',
      onComplete: () => spinner.destroy(),
    });

    if (count < SCREWS_PER_PLATE) {
      const left = SCREWS_PER_PLATE - count;
      this.showLoosePlateHint(sx, sy - 22, `${left} LEFT`, mode.color);
      this.renderPhase(width, height, cx);
      return;
    }

    // ── The plate comes off ───────────────────────────────────────────
    PlayerData.unlockSecretMode(mode.id);
    Sfx.play('reward-big');
    this.cameras.main.shake(260, 0.006);
    this.cameras.main.flash(240, 255, 230, 170);

    const banner = this.add.text(cx, 196, `${mode.icon}  ${mode.name}`, {
      fontSize: '30px', fontFamily: FONT_DISPLAY,
      color: hex(mix(mode.color, 0xffffff, 0.6)),
      stroke: hex(mix(mode.color, 0x000000, 0.8)), strokeThickness: 6, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    const sub = this.add.text(cx, 232, mode.tagline.toUpperCase(), {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(80).setAlpha(0);
    this.tweens.add({ targets: [banner, sub], alpha: 1, duration: 260 });
    this.tweens.add({
      targets: [banner, sub], alpha: 0, delay: 1200, duration: 400,
      onComplete: () => { banner.destroy(); sub.destroy(); },
    });

    this.time.delayedCall(1100, () => {
      if (this.scene.isActive()) this.renderPhase(width, height, cx);
    });
  }

  private showLoosePlateHint(x: number, y: number, text: string, color: number): void {
    const t = this.add.text(x, y, text, {
      fontSize: '11px', fontFamily: FONT_DISPLAY,
      color: hex(mix(color, 0xffffff, 0.6)), letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({
      targets: t, y: y - 22, alpha: 0, duration: 900, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /**
   * The second row: every plate that has already come off, permanently.
   *
   * These are not difficulties — they are whole modes, and each one either
   * launches straight into a fight or steps sideways into the extra picks it
   * needs (a second foe, two benches, a map).
   */
  private renderSecretRow(
    modes: SecretModeDef[], cx: number, labelY: number, y: number, width: number, height: number,
  ): void {
    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: labelY, text: '🪛  UNDER THE PLATES', accent: C.gold, width: 620,
    }));

    const gap = 8;
    const btnW = Math.min(178, Math.floor((760 - gap * (modes.length - 1)) / modes.length));
    const totalW = modes.length * btnW + (modes.length - 1) * gap;
    let x = cx - totalW / 2 + btnW / 2;

    for (const mode of modes) {
      const btn = addButton(this, {
        x, y, w: btnW, h: 40,
        label: mode.name, icon: mode.icon, fontSize: 12,
        sublabel: mode.shardReward > 0 ? `💎 +${mode.shardReward}` : 'no reward',
        accent: mode.color, variant: 'ghost', cut: 8,
        onClick: () => this.startSecretMode(mode, width, height, cx),
      });
      this.phaseObjects.push(btn.container);
      x += btnW + gap;
    }
  }

  // ── Secret mode entry ───────────────────────────────────────────────

  /**
   * Clicking a secret mode. Two of them start the fight on the spot; the other
   * three need something more from the player first and step into their own
   * selection phase to get it.
   */
  private startSecretMode(mode: SecretModeDef, width: number, height: number, cx: number): void {
    Sfx.play('ui-equip');
    this.pendingSecret = mode.id;

    switch (mode.id) {
      case 'duo':
        this.selectionPhase = 'duoEnemy';
        this.elemPage = 0;
        this.renderPhase(width, height, cx);
        return;
      case 'tagteam':
        // The two picks already made are the first name on each bench — there is
        // no sense making the player choose them twice.
        this.teamPlayer = this.playerChoice ? [this.playerChoice] : [];
        this.teamEnemy = this.enemyChoice ? [this.enemyChoice] : [];
        this.selectionPhase = 'teamPlayer';
        this.elemPage = 0;
        this.renderPhase(width, height, cx);
        return;
      case 'worldshift':
        this.selectionPhase = 'mapSelect';
        this.renderPhase(width, height, cx);
        return;
      case 'dummy':
      case 'truenightmare':
        this.launchSecretFight(mode, {});
        return;
    }
  }

  /**
   * Every secret mode ends up here. The extras each one gathered ride along in
   * `extra`; everything shared — loadout, mutations, the mode's own difficulty
   * rung and its flat payout — is assembled once.
   */
  private launchSecretFight(mode: SecretModeDef, extra: Record<string, unknown>): void {
    const npcPool = getPerksForElement(this.enemyChoice ?? '');
    // Same rule as the ordinary plates: the top two rungs bring a perk along.
    const npcPerk: string | null = (mode.difficultyLevel >= 4 && npcPool.length > 0)
      ? npcPool[Math.floor(Math.random() * npcPool.length)].id
      : null;

    this.scene.start('ArenaScene', {
      elementId: this.playerChoice,
      enemyElementId: this.enemyChoice,
      difficulty: mode.difficultyLevel,
      mutations: [...activeMutationIds],
      starredMutations: [...starredMutationIds],
      playerPerk: PlayerData.getEquippedPerk(this.playerChoice ?? ''),
      npcPerk,
      // A secret mode is still a solo 1v1 off the plate wall, so its rung buys the same
      // loadout — except the practice dummy, which is a target, not an opponent.
      npcLoadout: mode.id === 'dummy' ? undefined : buildNpcLoadout(this.enemyChoice ?? '', mode.difficultyLevel),
      secretMode: mode.id,
      ...extra,
    });
  }

  /**
   * The stabilisation bout: your three against the three that came off the
   * forge, on Expert.
   *
   * Mechanically this is Secret Tag Team — same chain, same carried wounds —
   * but it is deliberately *not* launched as one: a secret mode pays a flat
   * purse and this fight's reward is the element. `stabilize` rides the boot
   * payload so ArenaScene hands it back to the results screen, which is where
   * the forge is actually settled.
   */
  private launchStabilisation(): void {
    const pending = this.stabilize;
    if (!pending) return;
    Sfx.play('ui-equip');

    this.scene.start('ArenaScene', {
      elementId: this.teamPlayer[0],
      enemyElementId: this.teamEnemy[0],
      difficulty: STABILISE_DIFFICULTY,
      mutations: [...activeMutationIds],
      starredMutations: [...starredMutationIds],
      playerPerk: PlayerData.getEquippedPerk(this.teamPlayer[0]),
      npcPerk: null,
      secretTag: freshSecretTag([...this.teamPlayer], [...this.teamEnemy]),
      stabilize: { result: pending.result },
    });
  }

  /** World Shift: the five grounds. */
  private renderMapSelectPhase(width: number, height: number, cx: number): void {
    const mode = getSecretMode('worldshift')!;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: 152, text: '🌍  CHOOSE YOUR GROUND', accent: mode.color, width: 600,
    }));

    const note = this.add.text(cx, 182,
      'Every hazard is impartial. It will kill whichever of you is standing in it.', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.ghost,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.phaseObjects.push(note);

    // Five cards across, with the rules for the hovered one printed underneath —
    // the maps differ enough that a one-line tagline would be a lie.
    const cardW = 168;
    const cardH = 132;
    const gap = 12;
    const totalW = SECRET_MAPS.length * cardW + (SECRET_MAPS.length - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;
    const cardY = 274;

    const rulesText = this.add.text(cx, cardY + cardH / 2 + 26, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal,
      align: 'center', lineSpacing: 5, wordWrap: { width: width - 120 },
    }).setOrigin(0.5, 0).setDepth(DEPTH.content);
    this.phaseObjects.push(rulesText);

    SECRET_MAPS.forEach((map, i) => {
      const mx = startX + i * (cardW + gap);
      const plate = addCardPlate(this, {
        x: mx, y: cardY, w: cardW, h: cardH, accent: map.accent, cut: 12,
      });

      const emoji = this.add.text(mx, cardY - 34, map.emoji, { fontSize: '34px' })
        .setOrigin(0.5).setDepth(DEPTH.content);
      const name = this.add.text(mx, cardY + 6, map.name, {
        fontSize: '13px', fontFamily: FONT_DISPLAY,
        color: hex(mix(map.accent, 0xffffff, 0.6)), letterSpacing: 1,
        align: 'center', wordWrap: { width: cardW - 18 },
      }).setOrigin(0.5).setDepth(DEPTH.content);
      const tag = this.add.text(mx, cardY + 40, map.tagline, {
        fontSize: '9px', fontFamily: FONT_UI, color: T.ghost,
        align: 'center', wordWrap: { width: cardW - 20 }, lineSpacing: 2,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hit = this.add.rectangle(mx, cardY, cardW, cardH, 0xffffff, 0)
        .setDepth(DEPTH.content + 1)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { plate.paint('hover'); rulesText.setText(map.rules.join('\n')); });
      hit.on('pointerout', () => { plate.paint('idle'); rulesText.setText(''); });
      hit.on('pointerdown', () => this.launchWorldShift(map.id));

      this.phaseObjects.push(plate.g, emoji, name, tag, hit);
    });
  }

  private launchWorldShift(mapId: SecretMapId): void {
    const mode = getSecretMode('worldshift');
    if (!mode) return;
    Sfx.play('ui-equip');
    this.launchSecretFight(mode, { secretMap: mapId });
  }

  // ── Mutation panel (scrollable list + rewards sidebar) ──────────────

  /** Persistent objects for the mutation list and rewards panel within phaseObjects. */
  private mutationListObjects: Phaser.GameObjects.GameObject[] = [];
  private rewardsPanelDynObjects: Phaser.GameObjects.GameObject[] = [];

  private renderMutationPanel(width: number, height: number, cx: number, titleY: number): void {
    // Detach any previous scroll handler
    this.input.off('wheel', this.mutationScrollHandler);

    const PANEL_TOP = titleY + 28;
    const PANEL_BOT = height - 70;
    const PANEL_H   = PANEL_BOT - PANEL_TOP;

    const LIST_X    = 32;
    const LIST_W    = 560;
    const RWD_X     = LIST_X + LIST_W + 16;
    const RWD_W     = width - RWD_X - 16;
    const RWD_CX    = RWD_X + RWD_W / 2;

    this.phaseObjects.push(addSectionLabel(this, {
      x: cx, y: titleY, text: 'MUTATIONS', accent: C.arcane, width: 620,
    }));

    // ── Rewards panel (static background) ──
    const rPanelBg = addWell(this, RWD_CX, PANEL_TOP + PANEL_H / 2, RWD_W, PANEL_H, C.gold, 4);
    const rPanelTitle = this.add.text(RWD_CX, PANEL_TOP + 12, 'REWARDS', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(5);
    this.phaseObjects.push(rPanelBg, rPanelTitle);

    // One shared line under the list instead of a paragraph glued to every row.
    // The rows carry a name and a multiplier; whatever you are pointing at
    // explains itself down here, and the ℹ button is still there for the rest.
    const hoverDesc = this.add.text(LIST_X + 4, PANEL_BOT + 12, '', {
      fontSize: '10px', fontFamily: FONT_UI, color: T.ghost,
      wordWrap: { width: LIST_W - 8 }, maxLines: 1,
    }).setOrigin(0, 0.5).setDepth(6);
    this.phaseObjects.push(hoverDesc);

    // ── Mutation list panel background ──
    const listPanelBg = addWell(this, LIST_X + LIST_W / 2, PANEL_TOP + PANEL_H / 2, LIST_W, PANEL_H, C.arcane, 4);
    this.phaseObjects.push(listPanelBg);

    // ── Mutation list mask + container ──
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(LIST_X, PANEL_TOP, LIST_W, PANEL_H);
    const mask = maskGfx.createGeometryMask();

    const scrollContainer = this.add.container(LIST_X, PANEL_TOP).setDepth(5);
    scrollContainer.setMask(mask);
    this.phaseObjects.push(maskGfx, scrollContainer);

    const ROW_H = 34;
    const ROW_W = LIST_W - 4;

    // Sort: unlocked first, locked last
    const sorted = [...MUTATIONS].sort((a, b) => {
      const uA = PlayerData.isMutationUnlocked(a.id) ? 0 : 1;
      const uB = PlayerData.isMutationUnlocked(b.id) ? 0 : 1;
      return uA - uB;
    });

    type InteractiveShape = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
    const rowInteractives: Array<{ localCenterY: number; shapes: InteractiveShape[] }> = [];
    let scrollY = 0;

    const updateInteractivity = () => {
      for (const row of rowInteractives) {
        const worldCenterY = (PANEL_TOP - scrollY) + row.localCenterY;
        const inView = worldCenterY + ROW_H / 2 > PANEL_TOP && worldCenterY - ROW_H / 2 < PANEL_BOT;
        for (const shape of row.shapes) {
          if (inView) {
            shape.setInteractive({ useHandCursor: true });
          } else {
            shape.disableInteractive();
          }
        }
      }
    };

    const buildRows = () => {
      // Destroy old row objects
      for (const obj of this.mutationListObjects) {
        if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      }
      this.mutationListObjects = [];
      rowInteractives.length = 0;

      let innerY = 4;
      for (const mut of sorted) {
        const unlocked = PlayerData.isMutationUnlocked(mut.id);
        const equipped = activeMutationIds.has(mut.id);
        const starred  = starredMutationIds.has(mut.id);

        const fillColor   = equipped ? 0x1a3a1a : (unlocked ? 0x252535 : 0x141420);
        const borderColor = equipped ? 0x55ee55 : (unlocked ? 0x6677aa : 0x333344);
        const alpha       = unlocked ? 1 : 0.45;

        const row = this.overlayRow(ROW_W / 2, innerY + ROW_H / 2, ROW_W, ROW_H - 4, borderColor, alpha < 1);
        void fillColor;
        scrollContainer.add(row.g);
        this.mutationListObjects.push(row.g);

        const rowShapes: InteractiveShape[] = [];

        if (unlocked) {
          const rowHit = this.overlayRowHit(ROW_W / 2, innerY + ROW_H / 2, ROW_W, ROW_H - 4);
          scrollContainer.add(rowHit);
          this.mutationListObjects.push(rowHit);
          rowHit
            .on('pointerover', () => { row.paint(true); hoverDesc.setText(mut.shortDesc); })
            .on('pointerout',  () => { row.paint(false); hoverDesc.setText(''); })
            .on('pointerdown', () => {
              if (equipped) {
                activeMutationIds.delete(mut.id);
                starredMutationIds.delete(mut.id);
              } else {
                activeMutationIds.add(mut.id);
              }
              buildRows();
              this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
            });
          rowShapes.push(rowHit);
        }

        // Emoji + name, on the row's centre line. The blurb that used to sit
        // under it is now the single hover line beneath the whole list.
        const nameColor = unlocked ? '#ffffff' : '#555566';
        const prefix    = unlocked ? '' : '🔒 ';
        const nameText = this.add.text(10, innerY + ROW_H / 2 - 2, `${prefix}${mut.emoji} ${mut.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: nameColor,
        }).setOrigin(0, 0.5).setAlpha(alpha);
        scrollContainer.add(nameText);
        this.mutationListObjects.push(nameText);

        // What it is worth, as a number rather than a sentence.
        const multText = this.add.text(ROW_W - 78, innerY + ROW_H / 2 - 2,
          `×${(starred ? mut.rewardMult * STARRED_REWARD_MULT : mut.rewardMult).toFixed(2)}`, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: starred ? '#ffeebb' : (unlocked ? '#8899bb' : '#444455'),
        }).setOrigin(1, 0.5).setAlpha(alpha);
        scrollContainer.add(multText);
        this.mutationListObjects.push(multText);

        // Star button (unlocked, non-boss-only mutations only)
        if (unlocked && !mut.bossOnly) {
          const starX = ROW_W - 52;
          const starCircle = this.add.circle(starX, innerY + ROW_H / 2 - 2, 12, starred ? 0x886600 : 0x333344, 1)
            .setStrokeStyle(1, starred ? 0xffcc44 : 0x555566, 1)
            .setDepth(6).setInteractive({ useHandCursor: true });
          const starLabel = this.add.text(starX, innerY + ROW_H / 2 - 2, '★', {
            fontSize: '14px', color: starred ? '#ffeebb' : '#7a7a8a',
          }).setOrigin(0.5).setDepth(7);
          starCircle
            .on('pointerover', () => starCircle.setFillStyle(starred ? 0xaa8800 : 0x555566, 1))
            .on('pointerout',  () => starCircle.setFillStyle(starred ? 0x886600 : 0x333344, 1))
            .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              ptr.event.stopPropagation();
              if (starred) {
                starredMutationIds.delete(mut.id);
              } else {
                starredMutationIds.add(mut.id);
                activeMutationIds.add(mut.id); // auto-equip when starring
              }
              buildRows();
              this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
            });
          scrollContainer.add([starCircle, starLabel]);
          this.mutationListObjects.push(starCircle, starLabel);
          rowShapes.push(starCircle);
        }

        // Info "i" button
        const iX = ROW_W - 22;
        const iCircle = this.add.circle(iX, innerY + ROW_H / 2 - 2, 10, 0x222244, 0.9)
          .setStrokeStyle(1, 0x8888cc, 0.9).setDepth(6).setInteractive({ useHandCursor: true });
        const iLabel = this.add.text(iX, innerY + ROW_H / 2 - 2, 'i', {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aaaaff',
        }).setOrigin(0.5).setDepth(7);
        iCircle
          .on('pointerover', () => iCircle.setFillStyle(0x4444aa, 0.95))
          .on('pointerout',  () => iCircle.setFillStyle(0x222244, 0.9))
          .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            ptr.event.stopPropagation();
            this.showMutationInfo(mut.id, width, height, cx);
          });
        scrollContainer.add([iCircle, iLabel]);
        this.mutationListObjects.push(iCircle, iLabel);
        rowShapes.push(iCircle);

        rowInteractives.push({ localCenterY: innerY + ROW_H / 2, shapes: rowShapes });
        innerY += ROW_H;
      }

      updateInteractivity();
      return innerY;
    };

    const totalH = buildRows();
    const maxScroll = Math.max(0, totalH - PANEL_H);

    this.mutationScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      scrollContainer.setY(PANEL_TOP - scrollY);
      updateInteractivity();
    };
    this.input.on('wheel', this.mutationScrollHandler);

    if (maxScroll > 0) {
      const hint = this.add.text(LIST_X + LIST_W - 4, PANEL_BOT - 2, '▼ scroll', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(6);
      this.phaseObjects.push(hint);
    }

    this.buildRewardsPanel(RWD_CX, PANEL_TOP, PANEL_H, RWD_W);
  }

  private buildRewardsPanel(rwdCx: number, panelTop: number, panelH: number, panelW: number): void {
    for (const obj of this.rewardsPanelDynObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.rewardsPanelDynObjects = [];

    const equipped = [...activeMutationIds];
    const innerX = rwdCx;
    let innerY = panelTop + 30;

    if (equipped.length === 0) {
      const empty = this.add.text(innerX, panelTop + panelH / 2, 'None equipped', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#666677', align: 'center',
      }).setOrigin(0.5).setDepth(6);
      this.rewardsPanelDynObjects.push(empty);
    } else {
      // Emoji and multiplier on one line: the names are already spelled out in
      // the list to the left, and repeating them here is what made this a wall.
      for (const id of equipped) {
        const def = getMutationDef(id);
        if (!def) continue;
        const isStarred = starredMutationIds.has(id);
        const mult = isStarred ? def.rewardMult * STARRED_REWARD_MULT : def.rewardMult;
        const rowColor = isStarred ? '#ffeebb' : '#ddddee';
        const lText = this.add.text(innerX, innerY, `${def.emoji}${isStarred ? '★' : ''}  ×${mult.toFixed(2)}`, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: rowColor,
        }).setOrigin(0.5).setDepth(6);
        this.rewardsPanelDynObjects.push(lText);
        innerY += 18;
      }

      // Divider
      const divGfx = this.add.graphics().setDepth(6);
      divGfx.lineStyle(1, 0x555577, 0.7);
      divGfx.lineBetween(rwdCx - panelW / 2 + 8, innerY + 4, rwdCx + panelW / 2 - 8, innerY + 4);
      this.rewardsPanelDynObjects.push(divGfx);
      innerY += 14;

      const totalMult = getTotalRewardMult();
      const totalText = this.add.text(innerX, innerY, `Total  ×${totalMult.toFixed(2)}`, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc44',
      }).setOrigin(0.5).setDepth(6);
      this.rewardsPanelDynObjects.push(totalText);
      innerY += 22;

      const baseShard = SHARD_REWARDS[Math.max(0, this.hoveredDifficulty - 1)] ?? 0;
      if (baseShard > 0) {
        const shardsText = this.add.text(innerX, innerY, `💎 +${Math.round(baseShard * totalMult)} shards`, {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#88ccff',
        }).setOrigin(0.5).setDepth(6);
        this.rewardsPanelDynObjects.push(shardsText);
      }
    }
  }

  private refreshRewardsPanel(width: number): void {
    const LIST_X = 32;
    const LIST_W = 560;
    const RWD_X  = LIST_X + LIST_W + 16;
    const RWD_W  = width - RWD_X - 16;
    const RWD_CX = RWD_X + RWD_W / 2;
    const height = this.scale.height;
    // Only ever called from the difficulty phase's hover handler — invasion mode has no mutation panel to size.
    const panelTop = this.mutPanelTop + 28;
    const panelH   = (height - 70) - panelTop;
    this.buildRewardsPanel(RWD_CX, panelTop, panelH, RWD_W);
  }

  private closeMutationInfo(): void {
    for (const obj of this.mutationOverlayObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.mutationOverlayObjects = [];
  }

  private showMutationInfo(id: string, width: number, height: number, cx: number): void {
    this.closeMutationInfo();
    const def = getMutationDef(id);
    if (!def) return;
    const unlocked = PlayerData.isMutationUnlocked(id);

    const chrome = addOverlayChrome(this, {
      title: `${def.emoji}  ${def.name.toUpperCase()}`,
      subtitle: unlocked ? '✓ UNLOCKED' : '🔒 LOCKED',
      accent: unlocked ? C.gold : C.steel,
      depth: 60,
      onBack: () => this.closeMutationInfo(),
    });
    this.mutationOverlayObjects.push(...chrome.objects);
    void cx; void height;

    const sections: Array<{ label: string; text: string; color: string; y: number }> = [
      { label: 'Effects', text: def.fullDesc, color: '#ddddee', y: 125 },
      ...(def.bossOnly ? [
        { label: 'BOSS ONLY — Unlocked by defeating a gauntlet boss', text: 'No starred version.', color: '#ffbb44', y: 260 },
      ] : [
        { label: 'Starred Effects ★', text: def.starredDesc, color: '#ffeebb', y: 260 },
      ]),
      { label: 'Rewards', text: def.bossOnly
        ? `×${def.rewardMult.toFixed(2)} base`
        : `×${def.rewardMult.toFixed(2)} base  (×${(def.rewardMult * STARRED_REWARD_MULT).toFixed(2)} starred)`,
        color: '#aaffaa', y: 400 },
    ];

    for (const s of sections) {
      const hdr = this.add.text(60, s.y, s.label.toUpperCase(), {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(C.frost, 0xffffff, 0.3)),
        letterSpacing: 2,
      }).setDepth(63);
      const rule = this.add.graphics().setDepth(63);
      rule.lineStyle(1, C.line, 0.7);
      rule.beginPath(); rule.moveTo(60, s.y + 16); rule.lineTo(width - 60, s.y + 16); rule.strokePath();
      const body = this.add.text(60, s.y + 26, s.text, {
        fontSize: '12px', fontFamily: FONT_UI, color: s.color,
        wordWrap: { width: width - 120 }, lineSpacing: 4,
      }).setDepth(63);
      this.mutationOverlayObjects.push(hdr, rule, body);
    }
  }

  /**
   * Row background shared by every overlay list in this scene. One notched
   * plate with an accent spine, so the info, mastery, customize and dictionary
   * screens all read as the same list.
   */
  private overlayRow(
    cx: number, y: number, w: number, h: number, accent: number, muted = false,
  ): { g: Phaser.GameObjects.Graphics; paint: (hover: boolean) => void } {
    return addRowPlate(this, { x: cx, y, w, h, accent, muted });
  }

  /**
   * Transparent hit plate for a scrolling row. Lives in the same container as
   * the row art, so it scrolls with it; the plate itself is a Graphics and
   * cannot take input.
   */
  private overlayRowHit(
    cx: number, y: number, w: number, h: number,
  ): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(cx, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
  }

  private goBack(): void {
    this.input.off('wheel', this.mutationScrollHandler);
    const { width, height } = this.scale;
    const cx = width / 2;
    if (this.selectionPhase === 'player') {
      // Each mode backs out to wherever it was entered from.
      if (this.isBoss) this.scene.start('ShopScene', { page: 999 });
      else if (this.bounty) this.scene.start('DisgracedLabScene', { tab: 'bounties' });
      else this.scene.start('TitleScene');
    } else if (this.selectionPhase === 'enemy') {
      this.playerChoice = null;
      this.selectionPhase = 'player';
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    } else if (this.selectionPhase === 'duoEnemy' || this.selectionPhase === 'mapSelect') {
      // Both are one step past the difficulty screen — back out to it.
      this.pendingSecret = null;
      this.selectionPhase = 'difficulty';
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    } else if (this.selectionPhase === 'teamPlayer' && this.stabilize) {
      // The forge is already paid for and stays pending — backing out here is a
      // pause, not a forfeit. The lab offers it again the moment you walk in.
      if (this.teamPlayer.length > 0) {
        this.teamPlayer.pop();
        this.elemPage = 0;
        this.renderPhase(width, height, cx);
      } else {
        this.scene.start('DisgracedLabScene', { tab: 'synthesis' });
      }
    } else if (this.selectionPhase === 'teamPlayer' || this.selectionPhase === 'teamEnemy') {
      // Backs a pick off the bench at a time; emptying your bench leaves the mode.
      const bench = this.selectionPhase === 'teamPlayer' ? this.teamPlayer : this.teamEnemy;
      if (bench.length > 1) {
        bench.pop();
      } else if (this.selectionPhase === 'teamEnemy') {
        this.teamEnemy = [];
        this.selectionPhase = 'teamPlayer';
        this.teamPlayer.pop();
      } else {
        this.pendingSecret = null;
        this.teamPlayer = [];
        this.selectionPhase = 'difficulty';
      }
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    } else if (this.selectionPhase === 'difficulty') {
      if (this.isInvasion || this.isBoss || this.bounty) {
        // These modes skip the enemy phase, so back up to element selection.
        this.playerChoice = null;
        this.selectionPhase = 'player';
      } else {
        this.enemyChoice = null;
        this.selectionPhase = 'enemy';
      }
      this.elemPage = 0;
      this.renderPhase(width, height, cx);
    }
  }

  /**
   * Whether an element can be picked as the half currently being chosen in the bond builder.
   *
   * Before a first half is picked this asks the looser question — "is this element in any
   * researched bond at all" — so the roster greys out everything the player could not
   * finish a pair with, rather than letting them pick a first half and hit a dead end.
   */
  private handleElementClick(elementId: string, width: number, height: number, cx: number): void {
    // Locking in a choice moves the whole screen on, so it gets the heavier
    // equip sound rather than the plain button click.
    Sfx.play('ui-equip');
    if (this.selectionPhase === 'player') {
      this.playerChoice = elementId;
      // Quantum walks into the fight carrying whatever bond its customization screen built —
      // the pair is loadout, like a perk or a skin, not a question asked at the door. A save
      // that has never opened that screen still owns the granted starter pair.
      if (elementId === 'quantum' && !PlayerData.getQuantumBond()) {
        PlayerData.setQuantumBond(PlayerData.STARTER_BOND[0], PlayerData.STARTER_BOND[1]);
      }
      if (this.isInvasion || this.isBoss || this.bounty) {
        // These modes have no enemy to pick — the fight is already decided.
        this.selectionPhase = 'difficulty';
      } else {
        this.selectionPhase = 'enemy';
        this.elemPage = 0;
      }
    } else if (this.selectionPhase === 'enemy') {
      this.enemyChoice = elementId;
      this.selectionPhase = 'difficulty';
    } else if (this.selectionPhase === 'duoEnemy') {
      // The second foe: nothing left to ask, so this click is the start button.
      const mode = getSecretMode('duo');
      if (mode) { this.launchSecretFight(mode, { duoEnemyElementId: elementId }); return; }
    } else if (this.selectionPhase === 'teamPlayer' && this.stabilize) {
      if (!this.teamPlayer.includes(elementId)) this.teamPlayer.push(elementId);
      if (this.teamPlayer.length >= TAG_TEAM_SIZE) {
        this.launchStabilisation();
        return;
      }
    } else if (this.selectionPhase === 'teamPlayer') {
      if (!this.teamPlayer.includes(elementId)) this.teamPlayer.push(elementId);
      if (this.teamPlayer.length >= TAG_TEAM_SIZE) {
        // Your bench is set — the element at the front of it is the one that
        // takes the floor, so it becomes the loadout the fight actually boots with.
        this.playerChoice = this.teamPlayer[0];
        this.selectionPhase = 'teamEnemy';
        this.elemPage = 0;
      }
    } else if (this.selectionPhase === 'teamEnemy') {
      if (!this.teamEnemy.includes(elementId)) this.teamEnemy.push(elementId);
      if (this.teamEnemy.length >= TAG_TEAM_SIZE) {
        const mode = getSecretMode('tagteam');
        if (mode) {
          this.enemyChoice = this.teamEnemy[0];
          this.launchSecretFight(mode, {
            secretTag: freshSecretTag([...this.teamPlayer], [...this.teamEnemy]),
          });
          return;
        }
      }
    }
    this.renderPhase(width, height, cx);
  }
}
