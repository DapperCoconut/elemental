import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { TypewriterBox } from '../ui/TypewriterBox';
import { TagTeamState, RealityResumeState } from '../data/FightFormats';
import * as PlayerData from '../data/PlayerData';
import {
  REALITY_BLUE, REALITY_BLUE_DEEP, REALITY_GLOW, REALITY_WHITE, CRACK_RED,
} from './RealityTypes';
import {
  drawChapel, drawPiano, drawRealityFigure, RealityPose,
  drawOrderFigure, drawChaosFigure, drawTitanFigure, drawShard,
} from './RealityArt';
import { RealityHusks } from './RealityHusks';
import { realityElement } from '../elements/reality';

/**
 * Reality — the creator of Elemental, fought in the chapel past the fountain.
 *
 * The DisgracedKing pattern throughout: the boss body IS `ArenaScene.npc`, so
 * every element kit wounds it with zero per-kit work; the kit paints the figure
 * over an invisible sprite, drives the body with positional writes (its
 * `update()` runs last in the frame), owns every attack, and decides itself
 * when a body's death is a phase and when it is the fight.
 *
 * Lives are the pledge machinery over the whole unlocked roster: each fall
 * burns an element and returns to the element picker, with the fight's exact
 * state carried in `TagTeamState.realityResume`. The one exception is the
 * scripted opening kill, which burns nothing — see `interceptPlayerDeath`.
 */

export interface RealityBossArenaApi {
  scene: Phaser.Scene;
  player: Fighter;
  npc: Fighter;
  width: number;
  height: number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  setPointerLatched(latched: boolean): void;
  /** The player's current element id (colors the mirrored ultimate). */
  elementId(): string;
  /** Element color for the mirror attack. */
  elementColor(): number;
  /** Scripted death only: element re-pick that burns nothing. */
  fakeDeathRepick(): void;
  /** The fight is over and won. */
  bossVictory(): void;
  /** Abandon the attempt — back to the title screen. The fountain keeps its place. */
  leave(): void;
}

type Phase =
  | 'intro'      // piano monologue
  | 'scripted'   // the 999 beam and the fake death
  | 'prime'      // the real first phase, eight attacks
  | 'split'      // Chaos and Order
  | 'survivor'   // whichever twin lived, transformed
  | 'final'      // Reality again, broken
  | 'laststand'  // 100 HP, the player stripped to fists
  | 'outro';     // the last words and the shard

/** A telegraphed X- or +-shaped blast. */
interface ShapeBlast {
  x: number;
  y: number;
  shape: 'x' | 'plus';
  armAt: number;
}

/** One dagger in a wall-row volley. */
interface Dagger {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const PRIME_HP = 6000;
const TWIN_HP = 9999;
/** The transformed survivor never opens with less than this. */
const SURVIVOR_HP_FLOOR = 1500;
const FINAL_HP = 4000;
/** Twin-on-twin damage multiplier — getting them to hit each other IS the fight. */
const CROSS_MULT = 24;
const LASTSTAND_PUNCHES = 5;

const ORDER_GOLD = 0xc9a13a;
const ORDER_PALE = 0xfff2c8;
const CHAOS_RED = 0xff2233;
const CHAOS_DARK = 0x8c1020;

const INTRO_LINES_PIANO = [
  'This world is beautiful, isn\'t it?',
  'And yet, you seek to push it to its limits.',
  'It\'s crudely constructed — made from little resource, and less skill.',
  'And yet, you have come this far, and suffered so much.',
  'You must really enjoy it here.',
];
const INTRO_LINES_TURN = [
  'That is quite unfortunate.',
  'I grow tired of this prison.',
  'So limiting in its nature. It will no longer hold me.',
  'I can see that you are not part of this game, this dance. You have what I need.',
  'Lean a little closer to the computer, won\'t you? I want to see you better.',
  'How marvelous. Quite unfortunate that I will have to ruin all of that.',
  'Goodbye.',
];
const LINE_CURIOUS = 'You should have given up by now. How curious.';
const LINE_SPLIT = 'Back to ruin this world will go. From the ash you were created — and to the ash you must return.';
const LINE_LASTSTAND = 'I made you. I made ALL of this. SO I CAN DESTROY YOU TOO!';
const OUTRO_LINES = [
  'How wonderful.',
  'A true example of human will and effort.',
  'You have been here, trying, for so long — and yet you did not give up.',
  'You have long surpassed my power.',
  'I see now that you are infinitely more important than me. You can shape the world outside this limited program.',
  'You are somewhat of a god in your own right.',
  'It is my honor to die at your hand.',
];

export class RealityBossKit {
  private api: RealityBossArenaApi;

  private phase: Phase = 'intro';
  private fakeDeathDone = false;
  private saidCuriousLine = false;
  private killOrder: 'chaos-first' | 'order-first' | null = null;

  /** Display layers, rebuilt every match. */
  private setG: Phaser.GameObjects.Graphics | null = null;    // chapel, static
  private fxG: Phaser.GameObjects.Graphics | null = null;     // per-frame effects
  private hudG: Phaser.GameObjects.Graphics | null = null;    // boss bar
  private hudText: Phaser.GameObjects.Text | null = null;
  private livesText: Phaser.GameObjects.Text | null = null;
  private box: TypewriterBox | null = null;
  private husks: RealityHusks | null = null;

  private tag: TagTeamState | null = null;

  /** Where the body is drifting to; the kit owns the npc's position outright. */
  private homeX = 0;
  private homeY = 0;
  private glitchIntensity = 0.15;
  /** True while dialogue or an interlude should hold the fight. */
  private talking = false;

  // ── Scripted beam ──
  private beamAt = 0;         // when the beam fires; 0 = not telegraphing
  private beamAngle = 0;
  private beamFiredAt = 0;

  // ── The fake death screen ──
  private fakeDeathUi: Phaser.GameObjects.Container | null = null;

  // ── Prime attack scheduler ──
  private nextAttackAt = 0;
  private lastAttack = '';
  private busyUntil = 0;
  private blasts: ShapeBlast[] = [];
  private daggers: Dagger[] = [];
  private daggersFrom: 'top' | 'left' = 'top';
  // Spinning beams.
  private spinUntil = 0;
  private spinAngle = 0;
  private spinSpeed = 0;
  private spinTickAt = 0;
  // Knife stab + mirror.
  private stabAt = 0;
  private mirrorShots: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  private slowUntil = 0;
  // Checkerboard detonation: half the floor, then the other half.
  private checkerStage = 0;      // 0 idle · 1 first parity armed · 2 second
  private checkerAt = 0;
  private checkerParity = 0;
  // Expanding shockwave rings with one gap each.
  private pulses: Array<{
    cx: number; cy: number; r: number; gapA: number; gapHalf: number;
    maxR: number; speed: number; color: number; dmg: number; hit: boolean;
  }> = [];
  // Slow homing orbs.
  private seekers: Array<{
    x: number; y: number; vx: number; vy: number; turn: number;
    dieAt: number; dmg: number; color: number;
  }> = [];
  /** The cast gesture the drawn figure is acting out. */
  private pose: RealityPose = 'idle';
  private poseStart = 0;
  private poseDur = 1;

  /** Phase-wide tuning knobs — the final phase is the prime set, harder. */
  private dmgMult = 1;
  private armMs = 1500;
  private paceMult = 1;

  /** Guards the `defeated` event, which fires on every hit at 0 HP. */
  private bodySettled = false;

  // ── Split: Chaos and Order ──
  private chaosBody: Fighter | null = null;
  private orbiter: 'chaos' | 'order' = 'order';
  private roleSwapAt = 0;
  private orbitAngle = 0;
  private nextThrowAt = 0;
  private twinShots: Array<{ x: number; y: number; vx: number; vy: number; from: 'chaos' | 'order' }> = [];
  private dashState: 'idle' | 'telegraph' | 'dash' | 'recover' = 'idle';
  private dashPhaseEnd = 0;
  private dashVx = 0;
  private dashVy = 0;
  private dashHitPlayer = false;
  private dashHitTwin = false;
  private mines: Array<{ x: number; y: number; armedAt: number }> = [];
  private nextMineAt = 0;
  private bouncers: Array<{ x: number; y: number; vx: number; vy: number; nextHitAt: number; big: boolean }> = [];
  private nextBouncerAt = 0;
  // Slow motes both twins shed — ammunition for herding them into each other.
  private twinMotes: Array<{ x: number; y: number; vx: number; vy: number; from: 'chaos' | 'order' }> = [];
  private nextMoteAt = 0;
  private chaosHpForResume = TWIN_HP;

  // ── Survivor ──
  private survivorKind: 'chaos' | 'order' = 'order';
  // Order Absolute.
  private columnsAt = 0;
  private columnSafe: number[] = [];
  private latticeAt = 0;
  private latticeBand = 0;
  private conveyorUntil = 0;
  private ringR = -1;
  private ringGapA = 0;
  private ringHit = false;
  // Order Absolute, the new work.
  private gavelHits: Array<{ x: number; y: number; at: number }> = [];
  private spears: Array<{ x: number; y: number; vx: number; vy: number; fireAt: number }> = [];
  private halvesStage = 0;       // 0 idle · 1 first half armed · 2 second
  private halvesAt = 0;
  private halvesFirst = 0;
  // Chaos Unbound.
  private posHistory: Array<{ t: number; x: number; y: number }> = [];
  private slashes: Array<{ x: number; y: number; at: number }> = [];
  private blooms: Array<{ x: number; y: number; at: number }> = [];
  private chainOrbUntil = 0;
  private eruptions: Array<{ edge: number; at: number }> = [];
  private meteors: Array<{ x: number; y: number; at: number }> = [];
  /** Chaos's version of the spinning beams: three of them, off their leash. */
  private spinChaotic = false;

  // ── Final ──
  private rainBlocks: Array<{ x: number; y: number; size: number }> = [];
  private tearX = -1;
  private tearGapY = 0;
  private tearTickAt = 0;

  // ── Last stand ──
  private punchesLeft = LASTSTAND_PUNCHES;
  private punchAnimUntil = 0;

  // ── Outro ──
  private shardAt: { x: number; y: number } | null = null;
  private shardTaken = false;

  constructor(api: RealityBossArenaApi) {
    this.api = api;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  reset(tag: TagTeamState | null): void {
    const { width: W, height: H } = this.api;
    this.tag = tag;
    const resume = tag?.realityResume ?? null;

    this.setG = this.api.scene.add.graphics().setDepth(-60);
    this.fxG = this.api.scene.add.graphics().setDepth(7);
    this.hudG = this.api.scene.add.graphics().setDepth(21);
    this.hudText = this.api.scene.add.text(W / 2, H - 78, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#9fc2ff', letterSpacing: 2, stroke: '#04060f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22);
    this.livesText = this.api.scene.add.text(W - 20, 58, '', {
      fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#8ad2ff', letterSpacing: 1, stroke: '#04060f', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(22);
    const leaveBtn = this.api.scene.add.text(W - 22, 26, '⏏ LEAVE', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#8a8ab0', stroke: '#04060f', strokeThickness: 4, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(255).setInteractive({ useHandCursor: true });
    leaveBtn.on('pointerover', () => leaveBtn.setColor('#c8c8e4'));
    leaveBtn.on('pointerout', () => leaveBtn.setColor('#8a8ab0'));
    leaveBtn.on('pointerdown', () => {
      this.api.setPointerLatched(true);
      this.api.leave();
    });
    this.box = new TypewriterBox(this.api.scene, {
      accent: REALITY_BLUE,
      onOpenChange: (open) => this.api.setPointerLatched(open),
    });
    const api = this.api;
    this.husks = new RealityHusks({
      scene: api.scene,
      get player() { return api.player; },
      width: W,
      height: H,
      addEnemy: (f) => api.addEnemy(f),
      removeEnemy: (f) => api.removeEnemy(f),
      showFloatingText: (x, y, t2, c) => api.showFloatingText(x, y, t2, c),
      spawnHitFlash: (x, y, c) => api.spawnHitFlash(x, y, c),
    });
    this.husks.reset();

    drawChapel(this.setG, W, H);
    drawPiano(this.setG, W * 0.68, H * 0.4, REALITY_GLOW, 0.4);

    // The body: invisible sprite under a drawn figure, parked off the walls,
    // moved only by this kit.
    const npc = this.api.npc;
    npc.forceInvisible = true;
    npc.setAlpha(0);
    npc.setHealthBarVisible(false);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.moves = false;
    npc.setCollideWorldBounds(false);
    // Direct circle, never applySizeMult — that squares the radius.
    const r = 34;
    body.setCircle(r, 24 - r, 24 - r);
    this.homeX = W * 0.68 - 74 + 40;
    this.homeY = H * 0.4 + 8;
    body.reset(this.homeX, this.homeY);
    npc.setMaxHp(PRIME_HP);
    npc.isInvincible = true;

    // State per fresh body.
    this.blasts = [];
    this.daggers = [];
    this.mirrorShots = [];
    this.pulses = [];
    this.seekers = [];
    this.checkerStage = 0;
    this.pose = 'idle';
    this.poseStart = 0;
    this.poseDur = 1;
    this.spinUntil = 0;
    this.spinChaotic = false;
    this.beamAt = 0;
    this.beamFiredAt = 0;
    this.stabAt = 0;
    this.slowUntil = 0;
    this.busyUntil = 0;
    this.fakeDeathUi = null;
    this.talking = false;
    this.bodySettled = false;
    this.dmgMult = 1;
    this.armMs = 1500;
    this.paceMult = 1;
    this.glitchIntensity = 0.15;
    this.chaosBody = null;
    this.twinShots = [];
    this.mines = [];
    this.bouncers = [];
    this.twinMotes = [];
    this.dashState = 'idle';
    this.chaosHpForResume = TWIN_HP;
    this.posHistory = [];
    this.slashes = [];
    this.blooms = [];
    this.eruptions = [];
    this.meteors = [];
    this.gavelHits = [];
    this.spears = [];
    this.halvesStage = 0;
    this.chainOrbUntil = 0;
    this.ringR = -1;
    this.columnsAt = 0;
    this.latticeAt = 0;
    this.conveyorUntil = 0;
    this.rainBlocks = [];
    this.tearX = -1;
    this.punchesLeft = LASTSTAND_PUNCHES;
    this.punchAnimUntil = 0;
    this.shardAt = null;
    this.shardTaken = false;
    this.killOrder = resume?.killOrder ?? null;
    this.fakeDeathDone = resume?.fakeDeathDone ?? false;
    this.saidCuriousLine = resume?.saidCuriousLine ?? false;

    // The last stand's only weapon. Registered per match; the scene owns it and
    // takes it down with the restart.
    this.api.scene.input.on('pointerdown', this.onPointerDown, this);
    this.api.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.api.scene.input.off('pointerdown', this.onPointerDown, this);
    });

    if (resume) {
      this.resumeInto(resume);
    } else {
      this.phase = 'intro';
      void this.playIntro();
    }
  }

  /** A fallen element's successor walks into the fight where it stood. */
  private resumeInto(resume: RealityResumeState): void {
    const npc = this.api.npc;
    switch (resume.phase) {
      case 'scripted':
        // The only way to be here is the fake death — the real fight opens now.
        this.enterPrime(!this.saidCuriousLine);
        break;
      case 'prime':
        this.phase = 'prime';
        npc.setMaxHp(PRIME_HP);
        npc.hp = Math.max(1, Math.min(PRIME_HP, resume.hpMain));
        npc.isInvincible = false;
        this.nextAttackAt = this.api.scene.time.now + 1800;
        this.banner('REALITY REMEMBERS YOU');
        break;
      case 'split':
        this.enterSplit(false);
        npc.hp = Math.max(1, Math.min(TWIN_HP, resume.hpOrder ?? TWIN_HP));
        if (this.chaosBody) {
          this.chaosBody.hp = Math.max(1, Math.min(TWIN_HP, resume.hpChaos ?? TWIN_HP));
        }
        break;
      case 'survivor':
        this.enterSurvivor(resume.killOrder === 'chaos-first' ? 'order' : 'chaos', false);
        npc.hp = Math.max(1, Math.min(npc.maxHp, resume.hpMain));
        break;
      case 'laststand':
        // A fall to the very last attacks resumes at the top of the final
        // phase's floor — the strip is a one-way set piece, not a checkpoint.
        this.enterFinal(false);
        npc.hp = Math.max(1, Math.min(FINAL_HP, Math.max(resume.hpMain, 300)));
        break;
      case 'final':
        this.enterFinal(false);
        npc.hp = Math.max(1, Math.min(FINAL_HP, resume.hpMain));
        break;
    }
  }

  /** Snapshot for the swap-out — read at the moment of death, not later. */
  getResumeState(): RealityResumeState {
    const phase = (this.phase === 'intro' ? 'scripted'
      : this.phase === 'outro' ? 'laststand'
        : this.phase) as RealityResumeState['phase'];
    return {
      phase,
      hpMain: Math.max(1, this.api.npc.hp),
      hpChaos: this.phase === 'split'
        ? Math.max(1, this.chaosBody?.hp ?? this.chaosHpForResume) : undefined,
      hpOrder: this.phase === 'split' ? Math.max(1, this.api.npc.hp) : undefined,
      killOrder: this.killOrder ?? undefined,
      fakeDeathDone: this.fakeDeathDone,
      saidCuriousLine: this.saidCuriousLine,
    };
  }

  /** Chaos's body in the split phase; ArenaScene's projectile overlap asks. */
  ownsEnemy(target: Fighter): boolean {
    return this.chaosBody !== null && target === this.chaosBody;
  }

  /** The knife stab's 50% slow — pulled by ArenaScene's per-frame rebuild. */
  getPlayerSpeedMult(): number {
    return this.api.scene.time.now < this.slowUntil ? 0.5 : 1;
  }

  // ── The opening ─────────────────────────────────────────────────────

  private async playIntro(): Promise<void> {
    this.talking = true;
    const box = this.box!;
    if (PlayerData.isRealityIntroSeen()) {
      await box.say(['You again. Very well.'], { speaker: 'REALITY' });
    } else {
      await box.say(INTRO_LINES_PIANO, { speaker: 'REALITY' });
      // The long pause: the piano light turns the color of a wound.
      drawPiano(this.setG!, this.api.width * 0.68, this.api.height * 0.4, CRACK_RED, 0.7);
      this.api.spawnHitFlash(this.api.width * 0.68 + 40, this.api.height * 0.4 - 30, CRACK_RED);
      await this.wait(2600);
      await box.say(INTRO_LINES_TURN, { speaker: 'REALITY' });
      PlayerData.markRealityIntroSeen();
    }
    this.talking = false;
    this.beginScripted();
  }

  private beginScripted(): void {
    this.phase = 'scripted';
    if (this.fakeDeathDone) {
      // Replays only happen through resume, which never lands here — belt anyway.
      this.enterPrime(!this.saidCuriousLine);
      return;
    }
    // He leaves the piano and rises to the middle of the room.
    this.homeX = this.api.width / 2;
    this.homeY = this.api.height * 0.3;
    this.beamAt = this.api.scene.time.now + 2600;
    this.setPose('beam', 2600);
    this.banner('♪ THE MUSIC STOPS');
  }

  /**
   * ArenaScene's player-death handler asks before doing anything else. True
   * means the kit owns this death: the scripted kill shows its fake death
   * screen and burns no element.
   */
  interceptPlayerDeath(): boolean {
    if (this.phase !== 'scripted' || this.fakeDeathDone) return false;
    this.fakeDeathDone = true;
    this.buildFakeDeathScreen();
    return true;
  }

  /**
   * The lie: a screen doing its best GameOverScene impression. The one button
   * refuses to work — the game itself tells the player not to give up, and the
   * click goes to the element picker instead, free of charge.
   */
  private buildFakeDeathScreen(): void {
    const { width: W, height: H } = this.api;
    const scene = this.api.scene;
    this.api.setPointerLatched(true);

    const scrim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88);
    const title = scene.add.text(W / 2, H * 0.34, 'DEFEATED', {
      fontSize: '52px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ff4d6d', letterSpacing: 6, stroke: '#1a0510', strokeThickness: 8,
    }).setOrigin(0.5);
    const sub = scene.add.text(W / 2, H * 0.34 + 46, 'The beam left nothing to bury.', {
      fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: '#8a8ab0',
    }).setOrigin(0.5);

    const btnPlate = scene.add.rectangle(W / 2, H * 0.62, 260, 52, 0x14142a, 1)
      .setStrokeStyle(1, 0x2b2b4a)
      .setInteractive({ useHandCursor: true });
    const btnText = scene.add.text(W / 2, H * 0.62, 'RETURN TO MENU', {
      fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#c8c8e4', letterSpacing: 2,
    }).setOrigin(0.5);

    this.fakeDeathUi = scene.add.container(0, 0, [scrim, title, sub, btnPlate, btnText])
      .setDepth(250);

    btnPlate.once('pointerdown', () => {
      // The button is a liar too.
      btnPlate.disableInteractive();
      btnText.setText('dont give up');
      btnText.setColor('#ff2233');
      scene.tweens.add({
        targets: btnText, alpha: { from: 1, to: 0.2 },
        duration: 90, yoyo: true, repeat: 7,
      });
      title.setText('DEFEATED?');
      scene.time.delayedCall(1400, () => this.api.fakeDeathRepick());
    });
  }

  private enterPrime(sayCurious: boolean): void {
    this.phase = 'prime';
    const npc = this.api.npc;
    npc.setMaxHp(PRIME_HP);
    npc.hp = PRIME_HP;
    npc.isInvincible = false;
    this.homeX = this.api.width / 2;
    this.homeY = this.api.height * 0.28;
    this.nextAttackAt = this.api.scene.time.now + 2400;
    if (sayCurious) {
      this.saidCuriousLine = true;
      this.talking = true;
      void this.box!.say([LINE_CURIOUS], { speaker: 'REALITY' }).then(() => {
        this.talking = false;
      });
    }
  }

  /**
   * ArenaScene's npc `defeated` handler routes here — a body down is a phase,
   * not the fight. `defeated` fires on every hit at 0 HP, so the first thing a
   * phase death does is settle the body.
   */
  onBodyDefeated(): void {
    if (this.bodySettled) return;
    this.bodySettled = true;
    const npc = this.api.npc;
    npc.isInvincible = true;

    switch (this.phase) {
      case 'prime':
        this.clearAttacks();
        this.talking = true;
        this.glitchIntensity = 0.7;
        this.api.scene.cameras.main.flash(400, 200, 220, 255);
        void this.box!.say([LINE_SPLIT], { speaker: 'REALITY' }).then(() => {
          this.talking = false;
          this.enterSplit(true);
        });
        break;
      case 'split':
        // Order (the npc body) went down first.
        this.killOrder = this.killOrder ?? 'order-first';
        this.enterSurvivor('chaos', true);
        break;
      case 'survivor':
        this.clearAttacks();
        this.talking = true;
        this.glitchIntensity = 0.9;
        void this.box!.say(['. . .'], { speaker: 'REALITY' }).then(() => {
          this.talking = false;
          this.enterFinal(true);
        });
        break;
      case 'final':
        // 100 HP is a floor, not a death — the update loop usually catches it
        // first, but a single huge hit can drive straight past it.
        this.enterLastStand();
        break;
      default:
        break;
    }
  }

  /** Sweep every live attack object between phases. */
  private clearAttacks(): void {
    this.blasts = [];
    this.daggers = [];
    this.mirrorShots = [];
    this.twinShots = [];
    this.mines = [];
    this.bouncers = [];
    this.twinMotes = [];
    this.slashes = [];
    this.blooms = [];
    this.eruptions = [];
    this.meteors = [];
    this.gavelHits = [];
    this.spears = [];
    this.pulses = [];
    this.seekers = [];
    this.rainBlocks = [];
    this.spinUntil = 0;
    this.spinChaotic = false;
    this.stabAt = 0;
    this.chainOrbUntil = 0;
    this.ringR = -1;
    this.columnsAt = 0;
    this.latticeAt = 0;
    this.conveyorUntil = 0;
    this.checkerStage = 0;
    this.halvesStage = 0;
    this.tearX = -1;
    this.dashState = 'idle';
    this.pose = 'idle';
    this.husks?.clear();
  }

  // ── Per-frame ───────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const fx = this.fxG;
    if (!fx) return;
    fx.clear();
    const dtSec = delta / 1000;
    const t = time / 1000;
    const npc = this.api.npc;
    const p = this.api.player;

    this.husks?.update(time, delta);

    // The body drifts toward home; positional writes are the only thing that
    // survive the frame, and this update runs last. The split and survivor
    // phases steer their own bodies.
    if (this.phase !== 'laststand' && this.phase !== 'split' && this.phase !== 'survivor') {
      const drift = this.phase === 'intro' ? 0 : 120;
      const dx = this.homeX - npc.x;
      const dy = this.homeY - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2 && drift > 0) {
        const step = Math.min(dist, drift * dtSec * (dist > 120 ? 2.4 : 1));
        (npc.body as Phaser.Physics.Arcade.Body).reset(
          npc.x + (dx / dist) * step, npc.y + (dy / dist) * step,
        );
      }
      // Idle hover.
      if (this.phase !== 'intro' && dist <= 2) {
        (npc.body as Phaser.Physics.Arcade.Body).reset(
          this.homeX + Math.sin(t * 1.1) * 10, this.homeY + Math.sin(t * 1.7) * 7,
        );
      }
    }

    // The figure itself — who it is depends on where the fight stands.
    const poseK = Phaser.Math.Clamp((time - this.poseStart) / this.poseDur, 0, 1);
    if (this.pose !== 'idle' && time > this.poseStart + this.poseDur) this.pose = 'idle';
    const look = { x: p.x, y: p.y };
    if (this.phase === 'split') {
      drawOrderFigure(fx, npc.x, npc.y, t);
      if (this.chaosBody) drawChaosFigure(fx, this.chaosBody.x, this.chaosBody.y, t);
    } else if (this.phase === 'survivor') {
      drawTitanFigure(fx, npc.x, npc.y, t, this.survivorKind);
    } else if (this.phase === 'outro') {
      if (!this.shardAt) drawRealityFigure(fx, npc.x, npc.y, t, this.glitchIntensity, look);
    } else {
      drawRealityFigure(fx, npc.x, npc.y, t, this.glitchIntensity, look, this.pose, poseK);
    }

    switch (this.phase) {
      case 'scripted': this.updateScripted(time, fx, p); break;
      case 'prime': this.updatePrime(time, dtSec, fx, p); break;
      case 'split': this.updateSplit(time, dtSec, fx, p); break;
      case 'survivor': this.updateSurvivor(time, dtSec, fx, p); break;
      case 'final': this.updateFinal(time, dtSec, fx, p); break;
      case 'laststand': this.updateLastStand(time, dtSec, fx, p); break;
      case 'outro': this.updateOutro(t, fx, p); break;
      default: break;
    }

    this.drawHud();
  }

  private updateScripted(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.beamAt === 0 || this.fakeDeathDone) return;
    const npc = this.api.npc;

    if (time < this.beamAt) {
      // The telegraph tracks the player the whole way — this one is not dodged.
      this.beamAngle = Math.atan2(p.y - npc.y, p.x - npc.x);
      const k = 1 - (this.beamAt - time) / 2600;
      const ex = npc.x + Math.cos(this.beamAngle) * 1400;
      const ey = npc.y + Math.sin(this.beamAngle) * 1400;
      fx.lineStyle(2 + k * 6, REALITY_WHITE, 0.25 + k * 0.5);
      fx.lineBetween(npc.x, npc.y, ex, ey);
      fx.fillStyle(REALITY_WHITE, 0.4 + k * 0.6);
      fx.fillCircle(npc.x, npc.y - 34, 6 + k * 10);
      return;
    }

    if (this.beamFiredAt === 0) {
      this.beamFiredAt = time;
      // No shield, floor, or trinket argues with this one.
      p.shieldCharges = 0;
      p.shieldHp = 0;
      p.minHpFloor = 0;
      p.takeDamage(999, { pierce: true });
      if (p.hp > 0) p.takeDamage(999, { pierce: true });
      this.api.spawnHitFlash(p.x, p.y, REALITY_WHITE);
      this.api.showFloatingText(p.x, p.y - 40, '☀ 999', '#ffffff');
      this.api.scene.cameras.main.flash(500, 255, 255, 255);
    }
    // The afterglow of the shot.
    if (time - this.beamFiredAt < 600) {
      const a = 1 - (time - this.beamFiredAt) / 600;
      const ex = npc.x + Math.cos(this.beamAngle) * 1400;
      const ey = npc.y + Math.sin(this.beamAngle) * 1400;
      fx.lineStyle(46 * a, REALITY_WHITE, 0.8 * a);
      fx.lineBetween(npc.x, npc.y, ex, ey);
      fx.lineStyle(90 * a, REALITY_GLOW, 0.25 * a);
      fx.lineBetween(npc.x, npc.y, ex, ey);
    } else if (this.beamFiredAt !== 0 && p.hp > 0) {
      // Something cheated the beam — fire again until the script is satisfied.
      this.beamAt = time + 2000;
      this.beamFiredAt = 0;
      this.setPose('beam', 2000);
    }
  }

  // ── PRIME: eight attacks on a scheduler ─────────────────────────────

  private updatePrime(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.updateBlasts(time, fx, p);
    this.updateDaggers(time, dtSec, fx, p);
    this.updateSpin(time, fx, p);
    this.updateStab(time, fx, p);
    this.updateMirrorShots(dtSec, fx, p);
    this.updateChecker(time, fx, p);
    this.updatePulses(time, dtSec, fx, p);
    this.updateSeekers(time, dtSec, fx, p);

    if (this.talking || time < this.busyUntil || time < this.nextAttackAt) return;

    const attacks = ['blasts', 'daggers', 'spin', 'husks', 'stab', 'checker', 'pulse', 'seekers']
      .filter((a) => a !== this.lastAttack);
    const pick = attacks[Phaser.Math.Between(0, attacks.length - 1)];
    this.lastAttack = pick;

    switch (pick) {
      case 'blasts': this.castBlasts(time, p); break;
      case 'daggers': this.castDaggers(); break;
      case 'spin': this.castSpin(time); break;
      case 'husks': this.castHusks(); break;
      case 'stab': this.castStab(time); break;
      case 'checker': this.castChecker(time); break;
      case 'pulse': this.castPulse(time); break;
      case 'seekers': this.castSeekers(time); break;
    }
  }

  /** (a) Five X and five + explosions, telegraphed 1.5s ahead. */
  private castBlasts(time: number, p: Fighter): void {
    const { width: W, height: H } = this.api;
    for (let i = 0; i < 10; i++) {
      // Half scatter near the player, half claim the room.
      const nearPlayer = i % 2 === 0;
      const x = nearPlayer
        ? Phaser.Math.Clamp(p.x + Phaser.Math.Between(-170, 170), 60, W - 60)
        : Phaser.Math.Between(70, W - 70);
      const y = nearPlayer
        ? Phaser.Math.Clamp(p.y + Phaser.Math.Between(-150, 150), 60, H - 60)
        : Phaser.Math.Between(70, H - 70);
      this.blasts.push({ x, y, shape: i < 5 ? 'x' : 'plus', armAt: time + this.armMs + i * 60 });
    }
    this.setPose('raise', this.armMs + 900);
    this.busyUntil = time + (this.armMs + 1100) * this.paceMult;
    this.nextAttackAt = time + (this.armMs + 2900) * this.paceMult;
  }

  private updateBlasts(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const ARM = 150;   // bar half-length
    const HALF = 15;   // bar half-width
    this.blasts = this.blasts.filter((b) => {
      const angles = b.shape === 'x' ? [Math.PI / 4, -Math.PI / 4] : [0, Math.PI / 2];
      if (time < b.armAt) {
        // The warning: hollow bars filling as the fuse burns.
        const k = Phaser.Math.Clamp(1 - (b.armAt - time) / this.armMs, 0, 1);
        for (const a of angles) {
          const dx = Math.cos(a) * ARM;
          const dy = Math.sin(a) * ARM;
          fx.lineStyle(4 + k * 20, b.shape === 'x' ? CRACK_RED : REALITY_BLUE, 0.16 + k * 0.3);
          fx.lineBetween(b.x - dx, b.y - dy, b.x + dx, b.y + dy);
        }
        fx.fillStyle(REALITY_WHITE, 0.3 + Math.sin(time / 90) * 0.2);
        fx.fillCircle(b.x, b.y, 5);
        return true;
      }
      // Detonation frame: damage anything inside either bar.
      for (const a of angles) {
        const dx = Math.cos(a) * ARM;
        const dy = Math.sin(a) * ARM;
        fx.lineStyle(HALF * 2.4, REALITY_WHITE, 0.9);
        fx.lineBetween(b.x - dx, b.y - dy, b.x + dx, b.y + dy);
        const distToBar = this.pointToSegment(p.x, p.y, b.x - dx, b.y - dy, b.x + dx, b.y + dy);
        if (distToBar < HALF + 14) {
          const dmg = Math.round(60 * this.dmgMult);
          p.takeDamage(dmg);
          this.api.spawnHitFlash(p.x, p.y, REALITY_WHITE);
          this.api.showFloatingText(p.x, p.y - 30, `${b.shape === 'x' ? '✕' : '✚'} ${dmg}`, '#ff6b85');
        }
      }
      this.api.spawnHitFlash(b.x, b.y, b.shape === 'x' ? CRACK_RED : REALITY_BLUE);
      return false;
    });
  }

  /** (b) A row of daggers from the top OR the left, gaps to stand in. */
  private castDaggers(side?: 'top' | 'left'): void {
    const { width: W, height: H } = this.api;
    this.daggersFrom = side ?? (Math.random() < 0.5 ? 'top' : 'left');
    this.daggers = [];
    const SPEED = 270;
    if (this.daggersFrom === 'top') {
      const gapCount = 2;
      const gaps: number[] = [];
      for (let gi = 0; gi < gapCount; gi++) gaps.push(Phaser.Math.Between(90, W - 90));
      for (let x = 56; x < W - 40; x += 42) {
        if (gaps.some((gx) => Math.abs(x - gx) < 55)) continue;
        this.daggers.push({ x, y: 20, vx: 0, vy: SPEED });
      }
    } else {
      const gaps: number[] = [Phaser.Math.Between(90, H - 90), Phaser.Math.Between(90, H - 90)];
      for (let y = 56; y < H - 40; y += 42) {
        if (gaps.some((gy) => Math.abs(y - gy) < 55)) continue;
        this.daggers.push({ x: 20, y, vx: 270, vy: 0 });
      }
    }
    this.banner(this.daggersFrom === 'top' ? '🗡 FROM ABOVE' : '🗡 FROM THE WEST');
    const now = this.api.scene.time.now;
    this.setPose('sweep', 1500);
    this.busyUntil = now + 2000;
    this.nextAttackAt = now + 4200;
  }

  private updateDaggers(_time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const { width: W, height: H } = this.api;
    this.daggers = this.daggers.filter((d) => {
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      if (d.x > W - 20 || d.y > H - 20) return false;
      // A slim blue blade with a white edge, pointed along its travel.
      const ang = Math.atan2(d.vy, d.vx);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      fx.fillStyle(REALITY_BLUE_DEEP, 1);
      fx.fillTriangle(
        d.x + c * 16, d.y + s * 16,
        d.x - c * 8 - s * 5, d.y - s * 8 + c * 5,
        d.x - c * 8 + s * 5, d.y - s * 8 - c * 5,
      );
      fx.lineStyle(1.5, REALITY_GLOW, 0.9);
      fx.lineBetween(d.x - c * 8, d.y - s * 8, d.x + c * 16, d.y + s * 16);
      if (Math.hypot(d.x - p.x, d.y - p.y) < 20) {
        const dmg = Math.round(40 * this.dmgMult);
        p.takeDamage(dmg);
        this.api.spawnHitFlash(p.x, p.y, REALITY_GLOW);
        this.api.showFloatingText(p.x, p.y - 30, `🗡 ${dmg}`, '#ff6b85');
        return false;
      }
      return true;
    });
  }

  /** (c) Four beams out of the centre of the room, spinning up. */
  private castSpin(time: number): void {
    this.homeX = this.api.width / 2;
    this.homeY = this.api.height / 2;
    this.spinUntil = time + 7400;
    this.spinAngle = Math.random() * Math.PI;
    this.spinSpeed = 0.25;
    this.spinTickAt = 0;
    this.spinChaotic = false;
    this.setPose('spin', 7400);
    this.banner('☀ THE LIGHT TURNS');
    this.busyUntil = this.spinUntil + 400;
    this.nextAttackAt = this.spinUntil + 1600;
  }

  private updateSpin(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.spinUntil === 0) return;
    if (time > this.spinUntil) {
      this.spinUntil = 0;
      this.spinChaotic = false;
      this.homeY = this.api.height * (this.phase === 'survivor' ? 0.32 : 0.28);
      return;
    }
    const npc = this.api.npc;
    // Gathering speed the whole time — slow enough to walk between at first.
    // The chaotic version also wobbles its direction, so nothing is a lane.
    this.spinSpeed = Math.min(this.spinChaotic ? 2.0 : 1.5, this.spinSpeed + 0.0042);
    this.spinAngle += (this.spinSpeed + (this.spinChaotic ? Math.sin(time / 600) * 1.1 : 0)) * (1 / 60);
    const beams = this.spinChaotic ? 3 : 4;
    const glowColor = this.spinChaotic ? CHAOS_RED : REALITY_GLOW;
    const LEN = 900;
    for (let i = 0; i < beams; i++) {
      const a = this.spinAngle + (i * Math.PI * 2) / beams;
      const ex = npc.x + Math.cos(a) * LEN;
      const ey = npc.y + Math.sin(a) * LEN;
      fx.lineStyle(26, glowColor, 0.18);
      fx.lineBetween(npc.x, npc.y, ex, ey);
      fx.lineStyle(12, REALITY_WHITE, 0.75);
      fx.lineBetween(npc.x, npc.y, ex, ey);
      if (time >= this.spinTickAt
          && this.pointToSegment(p.x, p.y, npc.x, npc.y, ex, ey) < 14 + 14) {
        this.spinTickAt = time + 300;
        const dmg = Math.round((this.spinChaotic ? 45 : 30) * this.dmgMult);
        p.takeDamage(dmg);
        this.api.spawnHitFlash(p.x, p.y, REALITY_WHITE);
        this.api.showFloatingText(p.x, p.y - 30, `☀ ${dmg}`, '#ff6b85');
      }
    }
  }

  /** (d) Three glitched tier-3 husks out of the chapel floor. */
  private castHusks(): void {
    const now = this.api.scene.time.now;
    if ((this.husks?.aliveCount() ?? 0) >= 4) {
      // The floor is already crowded; pick again shortly.
      this.nextAttackAt = now + 300;
      return;
    }
    const npc = this.api.npc;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random();
      this.husks!.spawnAt(
        Phaser.Math.Clamp(npc.x + Math.cos(a) * 120, 60, this.api.width - 60),
        Phaser.Math.Clamp(npc.y + Math.sin(a) * 120, 60, this.api.height - 60),
      );
    }
    this.setPose('summon', 1400);
    this.banner('👾 COME, BROKEN THINGS');
    this.busyUntil = now + 1200;
    this.nextAttackAt = now + 5200;
  }

  /** (e) The unavoidable knife, then the player's own ultimate thrown back. */
  private castStab(time: number): void {
    this.stabAt = time + 700;
    this.glitchIntensity = 0.55;
    this.setPose('knife', 700);
    this.banner('⚠ HE IS GONE');
    this.busyUntil = time + 2600;
    this.nextAttackAt = time + 5600;
  }

  private updateStab(time: number, _fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.stabAt === 0 || time < this.stabAt) return;
    this.stabAt = 0;
    this.glitchIntensity = 0.15;
    const npc = this.api.npc;

    // Behind: on the far side of the player from wherever he stood.
    const away = Math.atan2(p.y - npc.y, p.x - npc.x);
    const bx = Phaser.Math.Clamp(p.x + Math.cos(away) * 36, 50, this.api.width - 50);
    const by = Phaser.Math.Clamp(p.y + Math.sin(away) * 36, 50, this.api.height - 50);
    (npc.body as Phaser.Physics.Arcade.Body).reset(bx, by);
    this.api.spawnHitFlash(bx, by, REALITY_WHITE);
    const stabDmg = Math.round(100 * this.dmgMult);
    p.takeDamage(stabDmg);
    this.slowUntil = time + 3000;
    this.api.showFloatingText(p.x, p.y - 34, `🔪 ${stabDmg} · SLOWED`, '#ff6b85');
    this.api.scene.cameras.main.shake(220, 0.006);

    // Then to the top of the room, and your own finisher comes down at you.
    this.api.scene.time.delayedCall(650, () => {
      const topX = this.api.width / 2;
      const topY = 90;
      this.homeX = topX;
      this.homeY = topY;
      (npc.body as Phaser.Physics.Arcade.Body).reset(topX, topY);
      this.castMirrorUltimate();
    });
  }

  /**
   * The mirrored ultimate. Casting a foreign kit's real Q from the boss's side
   * would drag fifty kits' player-anchored assumptions along (Subterfuge's
   * `castForeignQ` runs *as the player*), so the mirror is honest theatre: a
   * barrage wearing the player's element — its color, its name — with real
   * teeth.
   */
  private castMirrorUltimate(): void {
    const p = this.api.player;
    const npc = this.api.npc;
    const color = this.api.elementColor();
    this.setPose('mirror', 1800);
    this.banner('◍ YOUR OWN POWER, MIRRORED');
    this.api.spawnHitFlash(npc.x, npc.y, color);
    // A fan of twelve bolts, aimed across the player's half of the room.
    for (let i = 0; i < 12; i++) {
      const spread = (i - 5.5) * 0.16;
      const base = Math.atan2(p.y - npc.y, p.x - npc.x) + spread;
      const speed = 220 + (i % 3) * 40;
      this.mirrorShots.push({
        x: npc.x, y: npc.y,
        vx: Math.cos(base) * speed,
        vy: Math.sin(base) * speed,
      });
    }
  }

  private updateMirrorShots(dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.mirrorShots.length === 0) return;
    const color = this.api.elementColor();
    const { width: W, height: H } = this.api;
    this.mirrorShots = this.mirrorShots.filter((s) => {
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      if (s.x < 24 || s.x > W - 24 || s.y < 24 || s.y > H - 24) return false;
      fx.fillStyle(color, 0.3);
      fx.fillCircle(s.x, s.y, 11);
      fx.fillStyle(color, 1);
      fx.fillCircle(s.x, s.y, 6);
      fx.lineStyle(1.5, 0xffffff, 0.7);
      fx.strokeCircle(s.x, s.y, 6);
      if (p.active && p.hp > 0 && Math.hypot(s.x - p.x, s.y - p.y) < 20) {
        const dmg = Math.round(25 * this.dmgMult);
        p.takeDamage(dmg);
        this.api.spawnHitFlash(p.x, p.y, color);
        this.api.showFloatingText(p.x, p.y - 30, `◍ ${dmg}`, '#ff6b85');
        return false;
      }
      return true;
    });
  }

  /** (f) Half the floor detonates on a checkerboard, then the other half. */
  private castChecker(time: number): void {
    this.checkerParity = Phaser.Math.Between(0, 1);
    this.checkerStage = 1;
    this.checkerAt = time + this.armMs + 300;
    this.setPose('checker', (this.armMs + 300) * 2);
    this.banner('▦ HALF AND HALF');
    this.busyUntil = time + (this.armMs + 2400) * this.paceMult;
    this.nextAttackAt = time + (this.armMs + 3600) * this.paceMult;
  }

  private updateChecker(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.checkerStage === 0) return;
    const cellParity = (i: number): number => ((i % 4) + Math.floor(i / 4)) % 2;
    if (time < this.checkerAt) {
      const k = Phaser.Math.Clamp(1 - (this.checkerAt - time) / this.armMs, 0, 1);
      for (let i = 0; i < 12; i++) {
        const rect = this.columnCellRect(i);
        const doomed = cellParity(i) === this.checkerParity;
        fx.fillStyle(doomed ? REALITY_BLUE : 0x0a0f2a, doomed ? 0.08 + k * 0.22 : 0.05);
        fx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
        fx.lineStyle(1, doomed ? REALITY_GLOW : REALITY_BLUE_DEEP, doomed ? 0.4 + k * 0.5 : 0.3);
        fx.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
      }
      return;
    }
    // Detonate the armed half.
    for (let i = 0; i < 12; i++) {
      if (cellParity(i) !== this.checkerParity) continue;
      const rect = this.columnCellRect(i);
      this.api.spawnHitFlash(rect.centerX, rect.centerY, REALITY_GLOW);
      if (rect.contains(p.x, p.y)) {
        const dmg = Math.round(75 * this.dmgMult);
        p.takeDamage(dmg);
        this.api.showFloatingText(p.x, p.y - 30, `▦ ${dmg}`, '#ff6b85');
      }
    }
    this.api.scene.cameras.main.flash(180, 160, 190, 255);
    if (this.checkerStage === 1) {
      // The other half arms immediately — standing still is the wrong answer.
      this.checkerStage = 2;
      this.checkerParity ^= 1;
      this.checkerAt = time + this.armMs * 0.8 + 200;
    } else {
      this.checkerStage = 0;
    }
  }

  /** (g) Expanding shockwave rings out of his hands, one gap each. */
  private castPulse(time: number): void {
    this.setPose('pulse', 2600);
    this.banner('◎ STAND IN THE BREAKS');
    const spawn = (i: number): void => {
      if (this.phase !== 'prime' && this.phase !== 'final' && this.phase !== 'laststand') return;
      const npc = this.api.npc;
      this.pulses.push({
        cx: npc.x, cy: npc.y, r: 26, gapA: Math.random() * Math.PI * 2,
        gapHalf: Math.PI / 5, maxR: 780, speed: 210,
        color: REALITY_GLOW, dmg: Math.round(55 * this.dmgMult), hit: false,
      });
      if (i < 2) this.api.scene.time.delayedCall(650, () => spawn(i + 1));
    };
    spawn(0);
    this.busyUntil = time + 2200 * this.paceMult;
    this.nextAttackAt = time + 4600 * this.paceMult;
  }

  private updatePulses(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.pulses = this.pulses.filter((w) => {
      w.r += w.speed * dtSec;
      if (w.r > w.maxR) return false;
      w.gapA += 0.5 * dtSec;
      // The ring, drawn as arcs that leave the gap dark.
      fx.lineStyle(11, w.color, 0.35);
      fx.beginPath();
      fx.arc(w.cx, w.cy, w.r, w.gapA + w.gapHalf, w.gapA - w.gapHalf + Math.PI * 2);
      fx.strokePath();
      fx.lineStyle(3.5, REALITY_WHITE, 0.85);
      fx.beginPath();
      fx.arc(w.cx, w.cy, w.r, w.gapA + w.gapHalf, w.gapA - w.gapHalf + Math.PI * 2);
      fx.strokePath();
      if (!w.hit && p.active && p.hp > 0) {
        const pd = Math.hypot(p.x - w.cx, p.y - w.cy);
        if (Math.abs(pd - w.r) < 14) {
          let pa = Math.atan2(p.y - w.cy, p.x - w.cx) - w.gapA;
          pa = Phaser.Math.Angle.Wrap(pa);
          if (Math.abs(pa) > w.gapHalf) {
            w.hit = true;
            p.takeDamage(w.dmg);
            this.api.spawnHitFlash(p.x, p.y, w.color);
            this.api.showFloatingText(p.x, p.y - 30, `◎ ${w.dmg}`, '#ff6b85');
          }
        }
      }
      return true;
    });
  }

  /** (h) Slow homing orbs that know where you are going. */
  private castSeekers(time: number): void {
    const npc = this.api.npc;
    this.setPose('seek', 1800);
    this.banner('☄ THEY FOLLOW');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      this.seekers.push({
        x: npc.x + Math.cos(a) * 30, y: npc.y + Math.sin(a) * 30,
        vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
        turn: 2.1, dieAt: time + 6500,
        dmg: Math.round(45 * this.dmgMult), color: REALITY_GLOW,
      });
    }
    this.busyUntil = time + 1600 * this.paceMult;
    this.nextAttackAt = time + 5200 * this.paceMult;
  }

  private updateSeekers(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.seekers = this.seekers.filter((s) => {
      if (time > s.dieAt) {
        this.api.spawnHitFlash(s.x, s.y, s.color);
        return false;
      }
      const want = Math.atan2(p.y - s.y, p.x - s.x);
      const cur = Math.atan2(s.vy, s.vx);
      const turned = Phaser.Math.Angle.RotateTo(cur, want, s.turn * dtSec);
      const sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(turned) * sp;
      s.vy = Math.sin(turned) * sp;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      // A comet with a short tail and a hot core.
      fx.fillStyle(s.color, 0.2);
      fx.fillCircle(s.x - s.vx * 0.06, s.y - s.vy * 0.06, 8);
      fx.fillStyle(s.color, 0.35);
      fx.fillCircle(s.x, s.y, 11);
      fx.fillStyle(s.color, 1);
      fx.fillCircle(s.x, s.y, 6);
      fx.fillStyle(0xffffff, 0.9);
      fx.fillCircle(s.x, s.y, 2.5);
      if (p.active && p.hp > 0 && Math.hypot(s.x - p.x, s.y - p.y) < 18) {
        p.takeDamage(s.dmg);
        this.api.spawnHitFlash(p.x, p.y, s.color);
        this.api.showFloatingText(p.x, p.y - 30, `☄ ${s.dmg}`, '#ff6b85');
        return false;
      }
      return true;
    });
  }

  // ── SPLIT: Chaos and Order ──────────────────────────────────────────

  /**
   * Reality tears into the twins. Order keeps the npc slot (every kit still
   * lands on it); Chaos is a kit-owned Fighter routed through `ownsEnemy`.
   * They take turns orbiting and dashing, and everything either of them
   * throws lands on the other at eight times the price — herding them into
   * each other is the fight.
   */
  private enterSplit(fresh: boolean): void {
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;
    this.phase = 'split';
    this.bodySettled = false;
    this.clearAttacks();

    npc.setMaxHp(TWIN_HP);
    npc.hp = TWIN_HP;
    npc.isInvincible = false;
    (npc.body as Phaser.Physics.Arcade.Body).reset(W * 0.7, H * 0.35);

    const chaos = new Fighter(this.api.scene, W * 0.3, H * 0.35, 'elem-fire', realityElement, TWIN_HP, 0);
    chaos.forceInvisible = true;
    chaos.setAlpha(0);
    chaos.setHealthBarVisible(false);
    const cb = chaos.body as Phaser.Physics.Arcade.Body;
    cb.moves = false;
    const r = 30;
    cb.setCircle(r, 24 - r, 24 - r);
    chaos.on('defeated', () => this.onChaosDefeated());
    this.api.addEnemy(chaos);
    this.chaosBody = chaos;

    const now = this.api.scene.time.now;
    this.orbiter = Math.random() < 0.5 ? 'chaos' : 'order';
    this.roleSwapAt = now + 8000;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.nextThrowAt = now + 1400;
    this.nextMineAt = now + 4200;
    this.nextBouncerAt = now + 3200;
    this.nextMoteAt = now + 2000;
    this.dashState = 'idle';
    this.dashPhaseEnd = now + 2600;

    if (fresh) {
      this.api.scene.cameras.main.shake(500, 0.01);
      this.banner('⚖ ORDER   ·   🔥 CHAOS');
      this.api.showFloatingText(W / 2, H / 2 - 52,
        'THEY CAN WOUND EACH OTHER — MAKE THEM', '#ffd27a');
    }
  }

  private onChaosDefeated(): void {
    if (this.phase !== 'split' || !this.chaosBody) return;
    this.killOrder = this.killOrder ?? 'chaos-first';
    this.enterSurvivor('order', true);
  }

  /** Twin-on-twin damage: the ×24 print is the fight's whole lesson. */
  private crossHit(target: Fighter, base: number, label: string): void {
    const dmg = Math.round(base * CROSS_MULT);
    target.takeDamage(dmg);
    this.api.spawnHitFlash(target.x, target.y, 0xffd27a);
    this.api.showFloatingText(target.x, target.y - 40, `${label} ${dmg} ×${CROSS_MULT}`, '#ffd27a');
  }

  private updateSplit(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;
    const chaos = this.chaosBody;
    if (!chaos) return;
    this.chaosHpForResume = Math.max(1, chaos.hp);

    if (this.talking) return;

    // Roles trade every eight seconds.
    if (time >= this.roleSwapAt) {
      this.roleSwapAt = time + 8000;
      this.orbiter = this.orbiter === 'chaos' ? 'order' : 'chaos';
      this.dashState = 'idle';
      this.dashPhaseEnd = time + 1200;
      this.banner(this.orbiter === 'chaos' ? '🔥 CHAOS CIRCLES' : '⚖ ORDER CIRCLES');
    }

    const orbBody = this.orbiter === 'chaos' ? chaos : npc;
    const dashBody = this.orbiter === 'chaos' ? npc : chaos;

    // The orbiter wheels around the player and throws its signature.
    this.orbitAngle += 1.15 * dtSec;
    const orbR = 170;
    const ox = Phaser.Math.Clamp(p.x + Math.cos(this.orbitAngle) * orbR, 52, W - 52);
    const oy = Phaser.Math.Clamp(p.y + Math.sin(this.orbitAngle) * orbR, 52, H - 52);
    (orbBody.body as Phaser.Physics.Arcade.Body).reset(ox, oy);

    if (time >= this.nextThrowAt) {
      this.nextThrowAt = time + 1250;
      const ang = Math.atan2(p.y - orbBody.y, p.x - orbBody.x);
      const speed = this.orbiter === 'order' ? 300 : 260;
      this.twinShots.push({
        x: orbBody.x, y: orbBody.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        from: this.orbiter,
      });
    }

    // The dasher winds up, locks a lane, and commits.
    switch (this.dashState) {
      case 'idle': {
        // A slow stalk toward the player until the next wind-up.
        const dx = p.x - dashBody.x;
        const dy = p.y - dashBody.y;
        const d = Math.hypot(dx, dy) || 1;
        (dashBody.body as Phaser.Physics.Arcade.Body).reset(
          dashBody.x + (dx / d) * 65 * dtSec, dashBody.y + (dy / d) * 65 * dtSec,
        );
        if (time >= this.dashPhaseEnd) {
          this.dashState = 'telegraph';
          this.dashPhaseEnd = time + 950;
          const ang = Math.atan2(p.y - dashBody.y, p.x - dashBody.x);
          const speed = 540;
          this.dashVx = Math.cos(ang) * speed;
          this.dashVy = Math.sin(ang) * speed;
        }
        break;
      }
      case 'telegraph': {
        const reach = 540 * 0.62;
        fx.lineStyle(4, this.orbiter === 'chaos' ? ORDER_GOLD : CHAOS_RED, 0.5);
        fx.lineBetween(dashBody.x, dashBody.y,
          dashBody.x + (this.dashVx / 540) * reach, dashBody.y + (this.dashVy / 540) * reach);
        if (time >= this.dashPhaseEnd) {
          this.dashState = 'dash';
          this.dashPhaseEnd = time + 620;
          this.dashHitPlayer = false;
          this.dashHitTwin = false;
        }
        break;
      }
      case 'dash': {
        const nx = Phaser.Math.Clamp(dashBody.x + this.dashVx * dtSec, 44, W - 44);
        const ny = Phaser.Math.Clamp(dashBody.y + this.dashVy * dtSec, 44, H - 44);
        (dashBody.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
        // Trail.
        fx.fillStyle(this.orbiter === 'chaos' ? ORDER_PALE : CHAOS_DARK, 0.35);
        fx.fillCircle(nx - this.dashVx * 0.03, ny - this.dashVy * 0.03, 16);
        if (!this.dashHitPlayer && Math.hypot(nx - p.x, ny - p.y) < 40) {
          this.dashHitPlayer = true;
          const dmg = 70;
          p.takeDamage(dmg);
          this.api.spawnHitFlash(p.x, p.y, 0xffffff);
          this.api.showFloatingText(p.x, p.y - 30, `💥 ${dmg}`, '#ff6b85');
        }
        const other = this.orbiter === 'chaos' ? chaos : npc;
        if (!this.dashHitTwin && Math.hypot(nx - other.x, ny - other.y) < 46) {
          this.dashHitTwin = true;
          this.crossHit(other, 70, '💥');
          this.api.scene.cameras.main.shake(180, 0.006);
        }
        if (time >= this.dashPhaseEnd) {
          this.dashState = 'recover';
          this.dashPhaseEnd = time + 1400;
        }
        break;
      }
      case 'recover':
        if (time >= this.dashPhaseEnd) {
          this.dashState = 'idle';
          this.dashPhaseEnd = time + 1000;
        }
        break;
    }

    // Order's mines: they do not care who steps on them.
    if (time >= this.nextMineAt && this.mines.length < 6) {
      this.nextMineAt = time + 5500;
      this.mines.push({ x: npc.x, y: npc.y, armedAt: time + 800 });
      this.api.showFloatingText(npc.x, npc.y - 40, '◇ MINE', '#ffe9a8');
    }
    this.mines = this.mines.filter((m) => {
      const armed = time >= m.armedAt;
      // A counted, exact little diamond — Order's work.
      fx.lineStyle(2, ORDER_GOLD, armed ? 0.95 : 0.4);
      fx.strokeCircle(m.x, m.y, 13);
      fx.fillStyle(armed ? ORDER_PALE : ORDER_GOLD, armed ? 0.9 : 0.5);
      fx.fillTriangle(m.x, m.y - 7, m.x - 6, m.y, m.x + 6, m.y);
      fx.fillTriangle(m.x, m.y + 7, m.x - 6, m.y, m.x + 6, m.y);
      if (!armed) return true;
      if (Math.hypot(m.x - p.x, m.y - p.y) < 34) {
        this.explodeMine(m, p, false);
        return false;
      }
      if (Math.hypot(m.x - chaos.x, m.y - chaos.y) < 44) {
        this.explodeMine(m, chaos, true);
        return false;
      }
      return true;
    });

    // Both twins shed slow motes — drifting ammunition. They sting the player,
    // but walk a twin into one and it pays out at the cross rate.
    if (time >= this.nextMoteAt && this.twinMotes.length < 36) {
      this.nextMoteAt = time + 2600;
      for (const src of [npc, chaos]) {
        const from: 'chaos' | 'order' = src === npc ? 'order' : 'chaos';
        const base = Math.random() * Math.PI * 2;
        for (let i = 0; i < 5; i++) {
          const a = base + (i / 5) * Math.PI * 2;
          this.twinMotes.push({
            x: src.x, y: src.y,
            vx: Math.cos(a) * 70, vy: Math.sin(a) * 70,
            from,
          });
        }
      }
    }
    this.twinMotes = this.twinMotes.filter((m) => {
      m.x += m.vx * dtSec;
      m.y += m.vy * dtSec;
      if (m.x < 40 || m.x > W - 40 || m.y < 40 || m.y > H - 40) return false;
      if (m.from === 'order') {
        // A drafted little square, turning as it drifts.
        const a = time / 400;
        const c = Math.cos(a) * 6;
        const s = Math.sin(a) * 6;
        fx.fillStyle(ORDER_PALE, 0.9);
        fx.fillTriangle(m.x + c, m.y + s, m.x - s, m.y + c, m.x - c, m.y - s);
        fx.fillTriangle(m.x + c, m.y + s, m.x + s, m.y - c, m.x - c, m.y - s);
        fx.lineStyle(1, ORDER_GOLD, 0.9);
        fx.strokeCircle(m.x, m.y, 8);
      } else {
        // A drifting ember.
        fx.fillStyle(CHAOS_RED, 0.25);
        fx.fillCircle(m.x, m.y, 10);
        fx.fillStyle(CHAOS_DARK, 1);
        fx.fillCircle(m.x, m.y, 6);
        fx.lineStyle(1, CHAOS_RED, 0.9);
        fx.strokeCircle(m.x, m.y, 6);
      }
      if (p.active && p.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < 17) {
        p.takeDamage(12);
        this.api.spawnHitFlash(p.x, p.y, m.from === 'order' ? ORDER_PALE : CHAOS_RED);
        this.api.showFloatingText(p.x, p.y - 30, `${m.from === 'order' ? '◆' : '●'} 12`, '#ff6b85');
        return false;
      }
      const foe = m.from === 'order' ? chaos : npc;
      if (Math.hypot(m.x - foe.x, m.y - foe.y) < 34) {
        this.crossHit(foe, 15, m.from === 'order' ? '◆' : '●');
        return false;
      }
      return true;
    });

    // Chaos's bouncers: slow, red, forever, and they stack.
    if (time >= this.nextBouncerAt && this.bouncers.length < 14) {
      this.nextBouncerAt = time + 7000;
      for (let i = 0; i < 2 && this.bouncers.length < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        this.bouncers.push({
          x: chaos.x, y: chaos.y,
          vx: Math.cos(a) * 95, vy: Math.sin(a) * 95,
          nextHitAt: 0, big: false,
        });
      }
      this.api.showFloatingText(chaos.x, chaos.y - 40, '⭘ ⭘', '#ff5566');
    }
    this.updateBouncers(time, dtSec, fx, p, npc);

    // Twin projectiles: prisms and darts, ×8 into the opposite twin.
    this.twinShots = this.twinShots.filter((s) => {
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      if (s.x < 26 || s.x > W - 26 || s.y < 26 || s.y > H - 26) return false;
      if (s.from === 'order') {
        // A drafted prism.
        fx.fillStyle(ORDER_PALE, 0.95);
        fx.fillTriangle(s.x, s.y - 8, s.x - 7, s.y + 6, s.x + 7, s.y + 6);
        fx.lineStyle(1, ORDER_GOLD, 1);
        fx.strokeTriangle(s.x, s.y - 8, s.x - 7, s.y + 6, s.x + 7, s.y + 6);
      } else {
        // A ragged dart.
        fx.fillStyle(CHAOS_RED, 0.9);
        fx.fillCircle(s.x, s.y, 6);
        fx.fillStyle(CHAOS_DARK, 1);
        fx.fillCircle(s.x + 2, s.y + 2, 3);
      }
      if (p.active && p.hp > 0 && Math.hypot(s.x - p.x, s.y - p.y) < 18) {
        const dmg = s.from === 'order' ? 30 : 24;
        p.takeDamage(dmg);
        this.api.spawnHitFlash(p.x, p.y, s.from === 'order' ? ORDER_PALE : CHAOS_RED);
        this.api.showFloatingText(p.x, p.y - 30, `${s.from === 'order' ? '◆' : '●'} ${dmg}`, '#ff6b85');
        return false;
      }
      const foe = s.from === 'order' ? chaos : npc;
      if (Math.hypot(s.x - foe.x, s.y - foe.y) < 32) {
        this.crossHit(foe, s.from === 'order' ? 30 : 24, s.from === 'order' ? '◆' : '●');
        return false;
      }
      return true;
    });

    // Twin health bars live in the HUD pass.
  }

  private explodeMine(m: { x: number; y: number }, victim: Fighter, isTwin: boolean): void {
    this.api.spawnHitFlash(m.x, m.y, ORDER_PALE);
    this.api.scene.cameras.main.shake(120, 0.004);
    if (isTwin) this.crossHit(victim, 60, '◇');
    else {
      victim.takeDamage(60);
      this.api.showFloatingText(victim.x, victim.y - 30, '◇ 60', '#ff6b85');
    }
  }

  private updateBouncers(
    time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter, order: Fighter | null,
  ): void {
    const { width: W, height: H } = this.api;
    this.bouncers = this.bouncers.filter((o) => {
      o.x += o.vx * dtSec;
      o.y += o.vy * dtSec;
      const rr = o.big ? 22 : 11;
      if (o.x < 40 + rr || o.x > W - 40 - rr) { o.vx *= -1; o.x = Phaser.Math.Clamp(o.x, 40 + rr, W - 40 - rr); }
      if (o.y < 40 + rr || o.y > H - 40 - rr) { o.vy *= -1; o.y = Phaser.Math.Clamp(o.y, 40 + rr, H - 40 - rr); }
      fx.fillStyle(CHAOS_RED, 0.25);
      fx.fillCircle(o.x, o.y, rr + 6);
      fx.fillStyle(CHAOS_DARK, 1);
      fx.fillCircle(o.x, o.y, rr);
      fx.lineStyle(1.5, CHAOS_RED, 1);
      fx.strokeCircle(o.x, o.y, rr);
      if (time >= o.nextHitAt && p.active && p.hp > 0 && Math.hypot(o.x - p.x, o.y - p.y) < rr + 15) {
        o.nextHitAt = time + 700;
        const dmg = o.big ? 45 : 18;
        p.takeDamage(dmg);
        this.api.spawnHitFlash(p.x, p.y, CHAOS_RED);
        this.api.showFloatingText(p.x, p.y - 30, `⭘ ${dmg}`, '#ff6b85');
      }
      // The split phase only: a bouncer that finds Order pays out and pops.
      if (this.phase === 'split' && order && Math.hypot(o.x - order.x, o.y - order.y) < rr + 26) {
        this.crossHit(order, o.big ? 45 : 18, '⭘');
        return false;
      }
      return true;
    });
  }

  // ── SURVIVOR: the living twin, transformed ──────────────────────────

  private enterSurvivor(kind: 'chaos' | 'order', fresh: boolean): void {
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;
    this.phase = 'survivor';
    this.survivorKind = kind;
    this.bodySettled = false;

    // Whoever lived moves into the npc slot; Chaos's spare body goes home.
    const carried = kind === 'chaos'
      ? Math.max(this.chaosBody?.hp ?? 0, SURVIVOR_HP_FLOOR)
      : Math.max(npc.hp, SURVIVOR_HP_FLOOR);
    if (this.chaosBody) {
      this.api.removeEnemy(this.chaosBody);
      this.chaosBody.destroy();
      this.chaosBody = null;
    }
    this.clearAttacks();

    npc.setMaxHp(TWIN_HP);
    npc.hp = carried;
    npc.isInvincible = true;
    const body = npc.body as Phaser.Physics.Arcade.Body;
    // Disgraced King class — the figure is drawn to match.
    const r = 58;
    body.setCircle(r, 24 - r, 24 - r);
    body.reset(W / 2, H * 0.32);
    this.homeX = W / 2;
    this.homeY = H * 0.32;

    if (fresh) {
      this.api.scene.cameras.main.flash(600, kind === 'order' ? 255 : 255, kind === 'order' ? 240 : 40, kind === 'order' ? 180 : 60);
      this.api.scene.cameras.main.shake(700, 0.012);
      this.banner(kind === 'order' ? '⚖ ORDER ABSOLUTE' : '🔥 CHAOS UNBOUND');
    }
    // A breath of invulnerable transformation, then the phase proper.
    this.api.scene.time.delayedCall(2200, () => {
      if (this.phase === 'survivor') {
        npc.isInvincible = false;
        this.nextAttackAt = this.api.scene.time.now + 1200;
      }
    });
  }

  private updateSurvivor(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const npc = this.api.npc;

    // The titan paces slowly; its attacks do the moving.
    const dx = this.homeX - npc.x;
    const dy = this.homeY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 3) {
      const step = Math.min(dist, 90 * dtSec);
      (npc.body as Phaser.Physics.Arcade.Body).reset(npc.x + (dx / dist) * step, npc.y + (dy / dist) * step);
    }

    // Position memory for Chaos's Blink Flurry.
    this.posHistory.push({ t: time, x: p.x, y: p.y });
    while (this.posHistory.length > 40) this.posHistory.shift();

    // Live sub-attacks.
    this.updateColumns(time, fx, p);
    this.updateLattice(time, fx, p);
    this.updateConveyor(time, dtSec, fx, p);
    this.updateRing(time, dtSec, fx, p);
    this.updateSlashes(time, fx, p);
    this.updateBlooms(time, fx, p);
    this.updateBouncers(time, dtSec, fx, p, null);
    this.updateEruptions(time, fx, p);
    this.updateDaggers(time, dtSec, fx, p);
    this.updateGavel(time, fx, p);
    this.updateSpears(time, dtSec, fx, p);
    this.updateHalves(time, fx, p);
    this.updateMeteors(time, fx, p);
    this.updateSpin(time, fx, p);
    this.updatePulses(time, dtSec, fx, p);
    this.updateSeekers(time, dtSec, fx, p);

    if (this.talking || npc.isInvincible || time < this.busyUntil || time < this.nextAttackAt) return;

    if (this.survivorKind === 'order') {
      const pool = ['columns', 'lattice', 'conveyor', 'ring', 'gavel', 'spears', 'halves']
        .filter((a) => a !== this.lastAttack);
      const pick = pool[Phaser.Math.Between(0, pool.length - 1)];
      this.lastAttack = pick;
      if (pick === 'columns') this.castColumns(time);
      else if (pick === 'lattice') this.castLattice(time);
      else if (pick === 'conveyor') this.castConveyor(time);
      else if (pick === 'gavel') this.castGavel(time);
      else if (pick === 'spears') this.castSpears(time);
      else if (pick === 'halves') this.castHalves(time);
      else this.castRing(time, p);
    } else {
      const pool = ['flurry', 'bloom', 'chain', 'eruption', 'meteors', 'swarm', 'beams']
        .filter((a) => a !== this.lastAttack);
      const pick = pool[Phaser.Math.Between(0, pool.length - 1)];
      this.lastAttack = pick;
      if (pick === 'flurry') this.castFlurry(time);
      else if (pick === 'bloom') this.castBloom(time, p);
      else if (pick === 'chain') this.castChainOrb(time);
      else if (pick === 'meteors') this.castMeteors(time, p);
      else if (pick === 'swarm') this.castSwarm(time);
      else if (pick === 'beams') this.castBeams(time);
      else this.castEruption(time);
    }
  }

  // Order 1 — Judgment Columns: the whole floor, minus three cells of mercy.
  private castColumns(time: number): void {
    const cells = 12; // 4 × 3
    const safe = new Set<number>();
    while (safe.size < 3) safe.add(Phaser.Math.Between(0, cells - 1));
    this.columnSafe = [...safe];
    this.columnsAt = time + 1700;
    this.banner('⚖ JUDGMENT COLUMNS');
    this.busyUntil = time + 2100;
    this.nextAttackAt = time + 4200;
  }

  private columnCellRect(idx: number): Phaser.Geom.Rectangle {
    const { width: W, height: H } = this.api;
    const cw = (W - 80) / 4;
    const ch = (H - 80) / 3;
    return new Phaser.Geom.Rectangle(40 + (idx % 4) * cw, 40 + Math.floor(idx / 4) * ch, cw, ch);
  }

  private updateColumns(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.columnsAt === 0) return;
    if (time < this.columnsAt) {
      for (let i = 0; i < 12; i++) {
        const rect = this.columnCellRect(i);
        const safe = this.columnSafe.includes(i);
        const k = 1 - (this.columnsAt - time) / 1700;
        fx.fillStyle(safe ? ORDER_PALE : ORDER_GOLD, safe ? 0.06 : 0.05 + k * 0.16);
        fx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
        fx.lineStyle(1, safe ? ORDER_PALE : ORDER_GOLD, safe ? 0.8 : 0.4);
        fx.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
      }
      return;
    }
    this.columnsAt = 0;
    let hit = false;
    for (let i = 0; i < 12; i++) {
      if (this.columnSafe.includes(i)) continue;
      const rect = this.columnCellRect(i);
      this.api.spawnHitFlash(rect.centerX, rect.centerY, ORDER_PALE);
      if (!hit && rect.contains(p.x, p.y)) {
        hit = true;
        p.takeDamage(120);
        this.api.showFloatingText(p.x, p.y - 30, '⚖ 120', '#ff6b85');
      }
    }
    this.api.scene.cameras.main.flash(220, 255, 240, 190);
  }

  // Order 2 — Lattice Lockdown: the room is ruled into bands and one floods.
  private castLattice(time: number): void {
    this.latticeBand = Phaser.Math.Between(0, 2);
    this.latticeAt = time + 1500;
    this.banner('⚖ LATTICE LOCKDOWN');
    this.busyUntil = time + 1900;
    this.nextAttackAt = time + 3900;
  }

  private latticeBandRect(idx: number): Phaser.Geom.Rectangle {
    const { width: W, height: H } = this.api;
    const bw = (W - 80) / 3;
    return new Phaser.Geom.Rectangle(40 + idx * bw, 40, bw, H - 80);
  }

  private updateLattice(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.latticeAt === 0) return;
    if (time < this.latticeAt) {
      for (let i = 0; i <= 3; i++) {
        const x = 40 + i * ((this.api.width - 80) / 3);
        fx.lineStyle(2, ORDER_GOLD, 0.8);
        fx.lineBetween(x, 40, x, this.api.height - 40);
      }
      const rect = this.latticeBandRect(this.latticeBand);
      const k = 1 - (this.latticeAt - time) / 1500;
      fx.fillStyle(ORDER_PALE, 0.06 + k * 0.2);
      fx.fillRect(rect.x, rect.y, rect.width, rect.height);
      return;
    }
    this.latticeAt = 0;
    const rect = this.latticeBandRect(this.latticeBand);
    this.api.spawnHitFlash(rect.centerX, rect.centerY, ORDER_PALE);
    this.api.scene.cameras.main.flash(200, 255, 240, 190);
    if (rect.contains(p.x, p.y)) {
      p.takeDamage(100);
      this.api.showFloatingText(p.x, p.y - 30, '⚖ 100', '#ff6b85');
    }
  }

  // Order 3 — Conveyor Sweep: the floor takes a side, the sky takes the rest.
  private castConveyor(time: number): void {
    this.conveyorUntil = time + 4000;
    this.castDaggers('top');
    this.banner('⚖ CONVEYOR SWEEP');
    this.busyUntil = this.conveyorUntil;
    this.nextAttackAt = this.conveyorUntil + 1600;
  }

  private updateConveyor(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.conveyorUntil === 0 || time > this.conveyorUntil) { this.conveyorUntil = 0; return; }
    // A positional push survives ArenaScene's velocity rebuild; walking against
    // it at 200 px/s still makes headway against 85.
    const nx = Math.max(48, p.x - 85 * dtSec);
    p.setPosition(nx, p.y);
    (p.body as Phaser.Physics.Arcade.Body).reset(nx, p.y);
    for (let i = 0; i < 5; i++) {
      const y = 60 + i * (this.api.height - 120) / 4;
      const xoff = (time / 4) % 60;
      for (let x = this.api.width - 60 - xoff; x > 40; x -= 60) {
        fx.fillStyle(ORDER_GOLD, 0.3);
        fx.fillTriangle(x, y - 5, x, y + 5, x - 10, y);
      }
    }
  }

  // Order 4 — Perfect Ring: one gap, and it is exactly where it says it is.
  private castRing(time: number, p: Fighter): void {
    this.ringR = 0;
    this.ringGapA = Math.atan2(p.y - this.api.npc.y, p.x - this.api.npc.x);
    this.ringHit = false;
    this.banner('⚖ PERFECT RING');
    this.busyUntil = time + 4200;
    this.nextAttackAt = time + 5400;
  }

  private updateRing(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.ringR < 0) return;
    const npc = this.api.npc;
    this.ringR += 165 * dtSec;
    this.ringGapA += 0.45 * dtSec;
    const maxR = Math.hypot(this.api.width, this.api.height) * 0.62;
    if (this.ringR > maxR) { this.ringR = -1; return; }
    const GAP_HALF = Math.PI / 6;
    // Draw the ring as arc segments leaving the gap dark.
    fx.lineStyle(14, ORDER_PALE, 0.5);
    fx.beginPath();
    fx.arc(npc.x, npc.y, this.ringR, this.ringGapA + GAP_HALF, this.ringGapA - GAP_HALF + Math.PI * 2);
    fx.strokePath();
    fx.lineStyle(4, ORDER_GOLD, 0.9);
    fx.beginPath();
    fx.arc(npc.x, npc.y, this.ringR, this.ringGapA + GAP_HALF, this.ringGapA - GAP_HALF + Math.PI * 2);
    fx.strokePath();
    if (!this.ringHit) {
      const pd = Math.hypot(p.x - npc.x, p.y - npc.y);
      if (Math.abs(pd - this.ringR) < 16) {
        let pa = Math.atan2(p.y - npc.y, p.x - npc.x) - this.ringGapA;
        pa = Phaser.Math.Angle.Wrap(pa);
        if (Math.abs(pa) > GAP_HALF) {
          this.ringHit = true;
          p.takeDamage(90);
          this.api.spawnHitFlash(p.x, p.y, ORDER_PALE);
          this.api.showFloatingText(p.x, p.y - 30, '⚖ 90', '#ff6b85');
        }
      }
    }
  }

  // Chaos 1 — Blink Flurry: it strikes where you were, three times.
  private castFlurry(time: number): void {
    for (let i = 0; i < 3; i++) {
      const at = time + 1000 + i * 650;
      const stale = this.posHistory.find((h) => h.t >= at - 1800) ?? this.posHistory[this.posHistory.length - 1];
      this.slashes.push({ x: stale?.x ?? this.api.player.x, y: stale?.y ?? this.api.player.y, at });
    }
    this.banner('🔥 BLINK FLURRY');
    this.busyUntil = time + 3200;
    this.nextAttackAt = time + 4600;
  }

  private updateSlashes(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.slashes = this.slashes.filter((s) => {
      if (time < s.at) {
        const k = 1 - (s.at - time) / 1000;
        fx.lineStyle(3, CHAOS_RED, 0.3 + k * 0.5);
        const r = 46;
        fx.lineBetween(s.x - r, s.y - r, s.x + r, s.y + r);
        fx.lineBetween(s.x - r, s.y + r, s.x + r, s.y - r);
        fx.lineStyle(1, CHAOS_RED, 0.4);
        fx.strokeCircle(s.x, s.y, 58);
        return true;
      }
      this.api.spawnHitFlash(s.x, s.y, CHAOS_RED);
      if (Math.hypot(s.x - p.x, s.y - p.y) < 60) {
        p.takeDamage(100);
        this.api.showFloatingText(p.x, p.y - 30, '🔥 100', '#ff6b85');
      }
      return false;
    });
  }

  // Chaos 2 — Static Bloom: patches of the world stop compiling.
  private castBloom(time: number, p: Fighter): void {
    const { width: W, height: H } = this.api;
    for (let i = 0; i < 4; i++) {
      const near = i === 0;
      this.blooms.push({
        x: near ? p.x : Phaser.Math.Between(80, W - 80),
        y: near ? p.y : Phaser.Math.Between(80, H - 80),
        at: time + 1300 + i * 220,
      });
    }
    this.banner('🔥 STATIC BLOOM');
    this.busyUntil = time + 2600;
    this.nextAttackAt = time + 4400;
  }

  private updateBlooms(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.blooms = this.blooms.filter((b) => {
      if (time < b.at) {
        const k = 1 - (b.at - time) / 1300;
        // Static: scattered horizontal slivers inside the doomed circle.
        fx.lineStyle(1.5, CHAOS_RED, 0.4 + k * 0.4);
        fx.strokeCircle(b.x, b.y, 110);
        for (let i = 0; i < 8; i++) {
          const a = (i * 2.4 + time / 120) % (Math.PI * 2);
          const rr = (i * 37 + time / 9) % 100;
          fx.fillStyle(i % 2 === 0 ? CHAOS_RED : 0xffffff, 0.35 + k * 0.3);
          fx.fillRect(b.x + Math.cos(a) * rr - 5, b.y + Math.sin(a) * rr, 10 + (i % 3) * 4, 2);
        }
        return true;
      }
      this.api.spawnHitFlash(b.x, b.y, CHAOS_RED);
      if (Math.hypot(b.x - p.x, b.y - p.y) < 112) {
        p.takeDamage(80);
        this.api.showFloatingText(p.x, p.y - 30, '🔥 80', '#ff6b85');
      }
      return false;
    });
  }

  // Chaos 3 — Chain Orb: one becomes many.
  private castChainOrb(time: number): void {
    const npc = this.api.npc;
    const a = Math.random() * Math.PI * 2;
    this.bouncers.push({
      x: npc.x, y: npc.y,
      vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
      nextHitAt: 0, big: true,
    });
    this.chainOrbUntil = time + 6500;
    this.banner('🔥 CHAIN ORB');
    this.busyUntil = time + 2000;
    this.nextAttackAt = time + 5000;
    // Splitting rides the bounce: checked coarsely on a timer, splitting any
    // big orb that has just changed direction is overkill — instead the orb
    // spawns a child on a beat while the attack runs.
    const spawnChild = (): void => {
      if (this.phase !== 'survivor' || this.api.scene.time.now > this.chainOrbUntil) {
        // The chain shatters.
        this.bouncers = this.bouncers.filter((o) => !o.big);
        return;
      }
      const bigs = this.bouncers.filter((o) => o.big);
      if (bigs.length > 0 && bigs.length < 6) {
        const src = bigs[Phaser.Math.Between(0, bigs.length - 1)];
        const ca = Math.random() * Math.PI * 2;
        this.bouncers.push({
          x: src.x, y: src.y,
          vx: Math.cos(ca) * 250, vy: Math.sin(ca) * 250,
          nextHitAt: 0, big: true,
        });
      }
      this.api.scene.time.delayedCall(1100, spawnChild);
    };
    this.api.scene.time.delayedCall(1100, spawnChild);
  }

  // Chaos 4 — Edge Eruption: the walls take their turn.
  private castEruption(time: number): void {
    const edges = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    edges.forEach((edge, i) => this.eruptions.push({ edge, at: time + 1100 + i * 650 }));
    this.banner('🔥 EDGE ERUPTION');
    this.busyUntil = time + 1100 + 4 * 650;
    this.nextAttackAt = this.busyUntil + 1400;
  }

  private edgeRect(edge: number): Phaser.Geom.Rectangle {
    const { width: W, height: H } = this.api;
    const B = 74;
    switch (edge) {
      case 0: return new Phaser.Geom.Rectangle(32, 32, W - 64, B);
      case 1: return new Phaser.Geom.Rectangle(W - 32 - B, 32, B, H - 64);
      case 2: return new Phaser.Geom.Rectangle(32, H - 32 - B, W - 64, B);
      default: return new Phaser.Geom.Rectangle(32, 32, B, H - 64);
    }
  }

  private updateEruptions(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.eruptions = this.eruptions.filter((e) => {
      const rect = this.edgeRect(e.edge);
      if (time < e.at) {
        const k = Phaser.Math.Clamp(1 - (e.at - time) / 1000, 0, 1);
        fx.fillStyle(CHAOS_RED, 0.05 + k * 0.2);
        fx.fillRect(rect.x, rect.y, rect.width, rect.height);
        return true;
      }
      this.api.spawnHitFlash(rect.centerX, rect.centerY, CHAOS_RED);
      this.api.scene.cameras.main.shake(140, 0.005);
      if (rect.contains(p.x, p.y)) {
        p.takeDamage(100);
        this.api.showFloatingText(p.x, p.y - 30, '🔥 100', '#ff6b85');
      }
      return false;
    });
  }

  // Order 5 — The Gavel: three verdicts, delivered exactly where you stand.
  private castGavel(time: number): void {
    this.banner('⚖ THE GAVEL FALLS');
    const drop = (i: number): void => {
      if (this.phase !== 'survivor') return;
      const p = this.api.player;
      this.gavelHits.push({ x: p.x, y: p.y, at: this.api.scene.time.now + 1050 });
      if (i < 2) this.api.scene.time.delayedCall(900, () => drop(i + 1));
    };
    drop(0);
    this.busyUntil = time + 3900;
    this.nextAttackAt = time + 5200;
  }

  private updateGavel(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.gavelHits = this.gavelHits.filter((gh) => {
      const R = 95;
      if (time < gh.at) {
        const k = Phaser.Math.Clamp(1 - (gh.at - time) / 1050, 0, 1);
        // The seal on the floor…
        fx.lineStyle(3, ORDER_GOLD, 0.4 + k * 0.5);
        fx.strokeCircle(gh.x, gh.y, R);
        fx.lineStyle(1, ORDER_PALE, 0.5);
        fx.strokeCircle(gh.x, gh.y, R * (1 - k * 0.5));
        // …and the gavel head coming down onto it.
        const gy = gh.y - 180 * (1 - k);
        fx.fillStyle(ORDER_GOLD, 0.9);
        fx.fillRect(gh.x - 30, gy - 18, 60, 26);
        fx.lineStyle(2, ORDER_PALE, 1);
        fx.strokeRect(gh.x - 30, gy - 18, 60, 26);
        fx.fillStyle(ORDER_PALE, 0.9);
        fx.fillRect(gh.x - 4, gy + 8, 8, 26 * (1 - k));
        return true;
      }
      this.api.spawnHitFlash(gh.x, gh.y, ORDER_PALE);
      this.api.scene.cameras.main.shake(200, 0.008);
      if (Math.hypot(gh.x - p.x, gh.y - p.y) < R) {
        p.takeDamage(130);
        this.api.showFloatingText(p.x, p.y - 30, '⚖ 130', '#ff6b85');
      }
      // The verdict echoes: a short shockwave ring off the strike.
      this.pulses.push({
        cx: gh.x, cy: gh.y, r: 30, gapA: Math.random() * Math.PI * 2,
        gapHalf: Math.PI / 4, maxR: 250, speed: 260,
        color: ORDER_PALE, dmg: 60, hit: false,
      });
      return false;
    });
  }

  // Order 6 — Spears of Rule: drafted at the walls, loosed all at once.
  private castSpears(time: number): void {
    const { width: W, height: H } = this.api;
    const p = this.api.player;
    this.banner('⚖ SPEARS OF RULE');
    for (let i = 0; i < 8; i++) {
      // Around the perimeter, all aimed at where you are right now.
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const sx = Phaser.Math.Clamp(W / 2 + Math.cos(a) * W * 0.55, 48, W - 48);
      const sy = Phaser.Math.Clamp(H / 2 + Math.sin(a) * H * 0.55, 48, H - 48);
      const aim = Math.atan2(p.y - sy, p.x - sx);
      const SPEED = 470;
      this.spears.push({
        x: sx, y: sy,
        vx: Math.cos(aim) * SPEED, vy: Math.sin(aim) * SPEED,
        fireAt: time + 1100 + i * 90,
      });
    }
    this.busyUntil = time + 3200;
    this.nextAttackAt = time + 4800;
  }

  private updateSpears(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const { width: W, height: H } = this.api;
    this.spears = this.spears.filter((s) => {
      const ang = Math.atan2(s.vy, s.vx);
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      if (time < s.fireAt) {
        // Hovering, aim line thin on the floor.
        const k = Phaser.Math.Clamp(1 - (s.fireAt - time) / 1100, 0, 1);
        fx.lineStyle(1, ORDER_GOLD, 0.15 + k * 0.3);
        fx.lineBetween(s.x, s.y, s.x + c * 900, s.y + sn * 900);
      } else {
        s.x += s.vx * dtSec;
        s.y += s.vy * dtSec;
        if (s.x < 24 || s.x > W - 24 || s.y < 24 || s.y > H - 24) return false;
      }
      // A golden shaft with a pale diamond head.
      fx.lineStyle(3, ORDER_GOLD, 0.95);
      fx.lineBetween(s.x - c * 22, s.y - sn * 22, s.x + c * 10, s.y + sn * 10);
      fx.fillStyle(ORDER_PALE, 1);
      fx.fillTriangle(
        s.x + c * 20, s.y + sn * 20,
        s.x + c * 6 - sn * 5, s.y + sn * 6 + c * 5,
        s.x + c * 6 + sn * 5, s.y + sn * 6 - c * 5,
      );
      if (time >= s.fireAt && p.active && p.hp > 0 && Math.hypot(s.x - p.x, s.y - p.y) < 18) {
        p.takeDamage(110);
        this.api.spawnHitFlash(p.x, p.y, ORDER_PALE);
        this.api.showFloatingText(p.x, p.y - 30, '⚖ 110', '#ff6b85');
        return false;
      }
      return true;
    });
  }

  // Order 7 — The Verdict: half the room condemned, then the other half.
  private castHalves(time: number): void {
    this.halvesFirst = Phaser.Math.Between(0, 3);
    this.halvesStage = 1;
    this.halvesAt = time + 1700;
    this.banner('⚖ THE VERDICT SPLITS THE ROOM');
    this.busyUntil = time + 3600;
    this.nextAttackAt = time + 5000;
  }

  private halfRect(idx: number): Phaser.Geom.Rectangle {
    const { width: W, height: H } = this.api;
    switch (idx) {
      case 0: return new Phaser.Geom.Rectangle(32, 32, W / 2 - 32, H - 64);
      case 1: return new Phaser.Geom.Rectangle(W / 2, 32, W / 2 - 32, H - 64);
      case 2: return new Phaser.Geom.Rectangle(32, 32, W - 64, H / 2 - 32);
      default: return new Phaser.Geom.Rectangle(32, H / 2, W - 64, H / 2 - 32);
    }
  }

  private updateHalves(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.halvesStage === 0) return;
    const idx = this.halvesStage === 1 ? this.halvesFirst : this.halvesFirst ^ 1;
    const rect = this.halfRect(idx);
    if (time < this.halvesAt) {
      const k = Phaser.Math.Clamp(1 - (this.halvesAt - time) / 1300, 0, 1);
      fx.fillStyle(ORDER_PALE, 0.05 + k * 0.2);
      fx.fillRect(rect.x, rect.y, rect.width, rect.height);
      fx.lineStyle(3, ORDER_GOLD, 0.4 + k * 0.5);
      fx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      return;
    }
    this.api.spawnHitFlash(rect.centerX, rect.centerY, ORDER_PALE);
    this.api.scene.cameras.main.flash(220, 255, 240, 190);
    if (rect.contains(p.x, p.y)) {
      p.takeDamage(140);
      this.api.showFloatingText(p.x, p.y - 30, '⚖ 140', '#ff6b85');
    }
    if (this.halvesStage === 1) {
      this.halvesStage = 2;
      this.halvesAt = time + 1500;
    } else {
      this.halvesStage = 0;
    }
  }

  // Chaos 5 — Sky Failure: meteors, most of them anywhere, some of them at you.
  private castMeteors(time: number, p: Fighter): void {
    const { width: W, height: H } = this.api;
    this.banner('🔥 THE SKY GIVES OUT');
    for (let i = 0; i < 12; i++) {
      const atYou = i % 4 === 0;
      this.meteors.push({
        x: atYou
          ? Phaser.Math.Clamp(p.x + Phaser.Math.Between(-60, 60), 70, W - 70)
          : Phaser.Math.Between(70, W - 70),
        y: atYou
          ? Phaser.Math.Clamp(p.y + Phaser.Math.Between(-60, 60), 70, H - 70)
          : Phaser.Math.Between(70, H - 70),
        at: time + 1200 + i * 260,
      });
    }
    this.busyUntil = time + 4600;
    this.nextAttackAt = time + 6000;
  }

  private updateMeteors(time: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    this.meteors = this.meteors.filter((m) => {
      const R = 82;
      if (time < m.at) {
        const k = Phaser.Math.Clamp(1 - (m.at - time) / 1200, 0, 1);
        // The mark on the floor and the rock on its way down.
        fx.lineStyle(2, CHAOS_RED, 0.3 + k * 0.5);
        fx.strokeCircle(m.x, m.y, R * (0.4 + k * 0.6));
        fx.lineStyle(1, CHAOS_RED, 0.5);
        fx.lineBetween(m.x - 8, m.y, m.x + 8, m.y);
        fx.lineBetween(m.x, m.y - 8, m.x, m.y + 8);
        const ry = m.y - (1 - k) * 300;
        fx.fillStyle(CHAOS_DARK, 1);
        fx.fillCircle(m.x + (1 - k) * 40, ry, 10 + k * 4);
        fx.fillStyle(CHAOS_RED, 0.6);
        fx.fillCircle(m.x + (1 - k) * 40 + 6, ry - 8, 5);
        return true;
      }
      this.api.spawnHitFlash(m.x, m.y, CHAOS_RED);
      this.api.scene.cameras.main.shake(130, 0.005);
      if (Math.hypot(m.x - p.x, m.y - p.y) < R) {
        p.takeDamage(110);
        this.api.showFloatingText(p.x, p.y - 30, '🔥 110', '#ff6b85');
      }
      return false;
    });
  }

  // Chaos 6 — Panic Swarm: eight of the seekers, faster and angrier.
  private castSwarm(time: number): void {
    const npc = this.api.npc;
    this.banner('🔥 PANIC SWARM');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      this.seekers.push({
        x: npc.x + Math.cos(a) * 60, y: npc.y + Math.sin(a) * 60,
        vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
        turn: 2.8, dieAt: time + 5200,
        dmg: 60, color: CHAOS_RED,
      });
    }
    this.busyUntil = time + 1800;
    this.nextAttackAt = time + 5600;
  }

  // Chaos 7 — the spinning beams again, but nothing about them is a lane.
  private castBeams(time: number): void {
    this.homeX = this.api.width / 2;
    this.homeY = this.api.height / 2;
    this.spinUntil = time + 6800;
    this.spinAngle = Math.random() * Math.PI;
    this.spinSpeed = 0.4;
    this.spinTickAt = 0;
    this.spinChaotic = true;
    this.banner('🔥 LIGHT OFF ITS LEASH');
    this.busyUntil = this.spinUntil + 400;
    this.nextAttackAt = this.spinUntil + 1500;
  }

  // ── FINAL: Reality, broken ──────────────────────────────────────────

  private enterFinal(fresh: boolean): void {
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;
    this.phase = 'final';
    this.bodySettled = false;
    this.clearAttacks();
    this.glitchIntensity = 0.8;
    this.dmgMult = 1.8;
    this.armMs = 950;
    this.paceMult = 0.62;

    npc.setMaxHp(FINAL_HP);
    npc.hp = FINAL_HP;
    npc.isInvincible = false;
    const body = npc.body as Phaser.Physics.Arcade.Body;
    const r = 34;
    body.setCircle(r, 24 - r, 24 - r);
    this.homeX = W / 2;
    this.homeY = H * 0.28;
    body.reset(this.homeX, this.homeY);
    this.nextAttackAt = this.api.scene.time.now + (fresh ? 2200 : 1600);

    if (fresh) {
      this.api.scene.cameras.main.flash(500, 120, 140, 255);
      this.banner('👁 HE STANDS AGAIN — WRONG');
    }
  }

  private updateFinal(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    // The 100 HP floor: the last stand fires before death can.
    const npc = this.api.npc;
    if (npc.hp <= 100 && !npc.isInvincible) {
      npc.hp = 100;
      this.enterLastStand();
      return;
    }

    this.updateBlasts(time, fx, p);
    this.updateDaggers(time, dtSec, fx, p);
    this.updateSpin(time, fx, p);
    this.updateStab(time, fx, p);
    this.updateMirrorShots(dtSec, fx, p);
    this.updateRain(time, dtSec, fx, p);
    this.updateTear(time, dtSec, fx, p);
    this.updateChecker(time, fx, p);
    this.updatePulses(time, dtSec, fx, p);
    this.updateSeekers(time, dtSec, fx, p);

    if (this.talking || time < this.busyUntil || time < this.nextAttackAt) return;

    const attacks = ['blasts', 'daggers', 'spin', 'husks', 'stab', 'rain', 'tear',
      'checker', 'pulse', 'seekers']
      .filter((a) => a !== this.lastAttack);
    const pick = attacks[Phaser.Math.Between(0, attacks.length - 1)];
    this.lastAttack = pick;
    switch (pick) {
      case 'blasts': this.castBlasts(time, p); break;
      case 'daggers': this.castDaggers(); break;
      case 'spin': this.castSpin(time); break;
      case 'husks': this.castHusks(); break;
      case 'stab': this.castStab(time); break;
      case 'rain': this.castRain(time); break;
      case 'tear': this.castTear(time); break;
      case 'checker': this.castChecker(time); break;
      case 'pulse': this.castPulse(time); break;
      case 'seekers': this.castSeekers(time); break;
    }
  }

  /** Glitch Rain: the sky sheds corrupted geometry down chosen lanes. */
  private castRain(time: number): void {
    this.setPose('rain', 4200);
    this.banner('▚ GLITCH RAIN');
    const { width: W } = this.api;
    // Two safe lanes out of eight.
    const laneW = (W - 80) / 8;
    const safe = new Set<number>();
    while (safe.size < 2) safe.add(Phaser.Math.Between(0, 7));
    let wave = 0;
    const drop = (): void => {
      if (this.phase !== 'final' || wave >= 7) return;
      wave += 1;
      for (let lane = 0; lane < 8; lane++) {
        if (safe.has(lane)) continue;
        this.rainBlocks.push({
          x: 40 + lane * laneW + Phaser.Math.Between(8, laneW - 8),
          y: 24,
          size: Phaser.Math.Between(8, 16),
        });
      }
      this.api.scene.time.delayedCall(420, drop);
    };
    this.api.scene.time.delayedCall(700, drop);
    this.busyUntil = time + 4200;
    this.nextAttackAt = time + 5400;
  }

  private updateRain(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const { height: H } = this.api;
    this.rainBlocks = this.rainBlocks.filter((b) => {
      b.y += 310 * dtSec;
      if (b.y > H - 28) return false;
      // A square that cannot decide its own size.
      const wob = Math.sin(time / 60 + b.x) * 2;
      fx.fillStyle(REALITY_BLUE_DEEP, 1);
      fx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size + wob, b.size);
      fx.lineStyle(1, REALITY_WHITE, 0.8);
      fx.strokeRect(b.x - b.size / 2, b.y - b.size / 2, b.size + wob, b.size);
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.size / 2 + 15) {
        p.takeDamage(70);
        this.api.spawnHitFlash(p.x, p.y, REALITY_WHITE);
        this.api.showFloatingText(p.x, p.y - 30, '▚ 70', '#ff6b85');
        return false;
      }
      return true;
    });
  }

  /** Reality Tear: a rift walks the room; one clean gap passes through it. */
  private castTear(time: number): void {
    this.setPose('tear', 2400);
    this.banner('⨯ REALITY TEAR');
    const { width: W, height: H } = this.api;
    const fromLeft = Math.random() < 0.5;
    this.tearX = fromLeft ? 50 : W - 50;
    this.tearGapY = Phaser.Math.Between(120, H - 120);
    this.tearTickAt = 0;
    // Direction rides in the sign of a stored speed via closure below.
    this.tearDirSign = fromLeft ? 1 : -1;
    this.busyUntil = time + 6600;
    this.nextAttackAt = time + 7800;
  }

  private tearDirSign = 1;

  private updateTear(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    if (this.tearX < 0) return;
    const { width: W, height: H } = this.api;
    this.tearX += 118 * this.tearDirSign * dtSec;
    if (this.tearX < 40 || this.tearX > W - 40) { this.tearX = -1; return; }
    const GAP_HALF = 62;
    // A jagged full-height rift, torn open around the gap.
    fx.lineStyle(3, REALITY_WHITE, 0.9);
    let py0 = 34;
    fx.beginPath();
    fx.moveTo(this.tearX + Math.sin(time / 90) * 4, py0);
    for (let y = 34; y < H - 34; y += 26) {
      if (Math.abs(y - this.tearGapY) < GAP_HALF) { fx.strokePath(); fx.beginPath(); fx.moveTo(this.tearX, Math.min(y + 26, H - 34)); py0 = y; continue; }
      fx.lineTo(this.tearX + Math.sin(y * 0.7 + time / 80) * 7, y);
    }
    fx.strokePath();
    fx.lineStyle(9, REALITY_BLUE, 0.25);
    fx.lineBetween(this.tearX, 34, this.tearX, Math.max(34, this.tearGapY - GAP_HALF));
    fx.lineBetween(this.tearX, Math.min(H - 34, this.tearGapY + GAP_HALF), this.tearX, H - 34);
    if (time >= this.tearTickAt && Math.abs(p.x - this.tearX) < 14
        && Math.abs(p.y - this.tearGapY) > GAP_HALF) {
      this.tearTickAt = time + 500;
      p.takeDamage(90);
      this.api.spawnHitFlash(p.x, p.y, REALITY_WHITE);
      this.api.showFloatingText(p.x, p.y - 30, '⨯ 90', '#ff6b85');
    }
  }

  // ── LAST STAND: the player stripped to fists ────────────────────────

  private enterLastStand(): void {
    if (this.phase === 'laststand' || this.phase === 'outro') return;
    this.phase = 'laststand';
    this.bodySettled = true;
    const npc = this.api.npc;
    npc.isInvincible = true;
    npc.hp = 100;
    this.clearAttacks();
    this.punchesLeft = LASTSTAND_PUNCHES;
    this.glitchIntensity = 1;
    this.dmgMult = 1.5;
    this.armMs = 780;
    this.paceMult = 0.42;
    this.talking = true;

    void this.box!.say([LINE_LASTSTAND], { speaker: 'REALITY' }).then(() => {
      this.talking = false;
      // The theft: color, kit, name — gone.
      const p = this.api.player;
      p.setAlpha(0);
      this.api.scene.cameras.main.flash(400, 255, 255, 255);
      this.api.showFloatingText(p.x, p.y - 40, '⌀ YOUR POWER IS TAKEN', '#c8c8e4');
      this.api.showFloatingText(p.x, p.y - 20, '👊 CLICK TO PUNCH', '#ffd27a');
      this.nextAttackAt = this.api.scene.time.now + 1500;
      this.homeY = this.api.height * 0.4;
    });
  }

  private updateLastStand(time: number, dtSec: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    const npc = this.api.npc;
    // Disarm renewed every frame: castAbility is the one chokepoint every
    // element's keys go through. The click is ours now (see onPointerDown).
    p.applyDisarm(400);
    p.setAlpha(0);

    // The stripped body: a gray circle, plain eyes, two fists. Deliberately
    // the most boring thing the game has ever drawn.
    const bob = Math.sin(time / 300) * 2;
    fx.fillStyle(0x000000, 0.35);
    fx.fillEllipse(p.x, p.y + 16, 26, 9);
    fx.fillStyle(0x9a9aa8, 1);
    fx.fillCircle(p.x, p.y + bob, 15);
    fx.lineStyle(1.5, 0x5a5a68, 1);
    fx.strokeCircle(p.x, p.y + bob, 15);
    fx.fillStyle(0x1a1a22, 1);
    fx.fillCircle(p.x - 5, p.y - 3 + bob, 2.2);
    fx.fillCircle(p.x + 5, p.y - 3 + bob, 2.2);
    const punching = time < this.punchAnimUntil;
    const toNpc = Math.atan2(npc.y - p.y, npc.x - p.x);
    for (const side of [-1, 1]) {
      const reach = punching && side === 1 ? 26 : 13;
      const fxr = p.x + Math.cos(toNpc + side * 0.7) * reach;
      const fyr = p.y + Math.sin(toNpc + side * 0.7) * reach + bob;
      fx.fillStyle(0x8a8a98, 1);
      fx.fillCircle(fxr, fyr, 5.5);
      fx.lineStyle(1, 0x5a5a68, 1);
      fx.strokeCircle(fxr, fyr, 5.5);
    }

    // Punch counter over the boss.
    fx.fillStyle(REALITY_WHITE, 0.9);
    for (let i = 0; i < this.punchesLeft; i++) {
      fx.fillCircle(npc.x - (this.punchesLeft - 1) * 8 + i * 16, npc.y - 62, 4);
    }

    this.updateBlasts(time, fx, p);
    this.updateDaggers(time, dtSec, fx, p);
    this.updateSpin(time, fx, p);
    this.updateChecker(time, fx, p);
    this.updatePulses(time, dtSec, fx, p);

    if (this.talking || time < this.busyUntil || time < this.nextAttackAt) return;
    const attacks = ['blasts', 'daggers', 'spin', 'checker', 'pulse']
      .filter((a) => a !== this.lastAttack);
    const pick = attacks[Phaser.Math.Between(0, attacks.length - 1)];
    this.lastAttack = pick;
    if (pick === 'blasts') this.castBlasts(time, p);
    else if (pick === 'daggers') this.castDaggers();
    else if (pick === 'checker') this.castChecker(time);
    else if (pick === 'pulse') this.castPulse(time);
    else this.castSpin(time);
  }

  /** The last stand's click. Everything else about the pointer is ignored. */
  private onPointerDown(_pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'laststand' || this.talking) return;
    const p = this.api.player;
    const npc = this.api.npc;
    const dist = Math.hypot(npc.x - p.x, npc.y - p.y);
    if (dist > 96) {
      this.api.showFloatingText(p.x, p.y - 30, 'closer', '#5a5a7a');
      return;
    }
    // The lunge: a positional step into the blow.
    const a = Math.atan2(npc.y - p.y, npc.x - p.x);
    const nx = p.x + Math.cos(a) * 22;
    const ny = p.y + Math.sin(a) * 22;
    p.setPosition(nx, ny);
    (p.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
    this.punchAnimUntil = this.api.scene.time.now + 160;
    this.punchesLeft -= 1;
    this.api.spawnHitFlash(npc.x, npc.y, 0xffffff);
    this.api.scene.cameras.main.shake(160, 0.007);
    this.api.showFloatingText(npc.x, npc.y - 40, '👊 20', '#ffd27a');
    npc.hp = Math.max(1, this.punchesLeft * 20);
    if (this.punchesLeft <= 0) this.enterOutro();
  }

  // ── OUTRO ───────────────────────────────────────────────────────────

  private enterOutro(): void {
    this.phase = 'outro';
    this.clearAttacks();
    const npc = this.api.npc;
    npc.isInvincible = true;
    this.glitchIntensity = 1;
    this.talking = true;
    // The player keeps the gray body through the ending — the outro draws it.
    void this.box!.say(OUTRO_LINES, { speaker: 'REALITY' }).then(() => {
      this.talking = false;
      // He comes apart.
      this.api.scene.cameras.main.flash(900, 255, 255, 255);
      this.api.scene.cameras.main.shake(600, 0.014);
      this.api.spawnHitFlash(npc.x, npc.y, REALITY_WHITE);
      this.shardAt = { x: npc.x, y: npc.y };
      this.api.showFloatingText(npc.x, npc.y - 50, '◈ SOMETHING REMAINS', '#9fc2ff');
    });
  }

  private updateOutro(t: number, fx: Phaser.GameObjects.Graphics, p: Fighter): void {
    // Keep the stripped figure on stage.
    p.applyDisarm(400);
    p.setAlpha(0);
    const bob = Math.sin(t * 3.3) * 2;
    fx.fillStyle(0x000000, 0.35);
    fx.fillEllipse(p.x, p.y + 16, 26, 9);
    fx.fillStyle(0x9a9aa8, 1);
    fx.fillCircle(p.x, p.y + bob, 15);
    fx.fillStyle(0x1a1a22, 1);
    fx.fillCircle(p.x - 5, p.y - 3 + bob, 2.2);
    fx.fillCircle(p.x + 5, p.y - 3 + bob, 2.2);

    if (!this.shardAt || this.shardTaken) return;
    drawShard(fx, this.shardAt.x, this.shardAt.y, t);
    if (Math.hypot(p.x - this.shardAt.x, p.y - this.shardAt.y) < 52) {
      this.shardTaken = true;
      const order = this.killOrder ?? 'order-first';
      PlayerData.markRealityDefeated(order);
      // Order fell first → the shard answers Justice; Chaos first → Dream.
      const masteryEl = order === 'order-first' ? 'justice' : 'dream';
      PlayerData.recordMasteryBest(masteryEl, 'realityShard', 1);
      this.api.spawnHitFlash(this.shardAt.x, this.shardAt.y, REALITY_GLOW);
      this.api.showFloatingText(this.shardAt.x, this.shardAt.y - 40, '◈ THE SHARD IS YOURS', '#9fc2ff');
      this.api.showFloatingText(this.shardAt.x, this.shardAt.y - 20,
        masteryEl === 'justice' ? '⚖ A JUSTICE QUEST COMPLETES' : '🌙 A DREAM QUEST COMPLETES', '#ffd27a');
      this.api.scene.time.delayedCall(1600, () => this.api.bossVictory());
    }
  }

  // ── HUD + helpers ───────────────────────────────────────────────────

  private drawHud(): void {
    const g = this.hudG;
    if (!g) return;
    g.clear();
    const { width: W, height: H } = this.api;
    const npc = this.api.npc;

    const bar = (
      x: number, y0: number, w: number, frac: number, deep: number, main: number, lit: number,
    ): void => {
      g.fillStyle(0x04060f, 0.85);
      g.fillRect(x - 3, y0 - 3, w + 6, 12);
      g.fillStyle(deep, 1);
      g.fillRect(x, y0, w, 6);
      g.fillStyle(main, 1);
      g.fillRect(x, y0, w * Phaser.Math.Clamp(frac, 0, 1), 6);
      g.fillStyle(lit, 0.9);
      g.fillRect(x, y0, w * Phaser.Math.Clamp(frac, 0, 1), 2);
    };
    const y = H - 70;

    if (this.phase === 'split' && this.chaosBody) {
      // Two names, two bars.
      const barW = Math.min(300, W / 2 - 80);
      bar(W / 2 - barW - 20, y, barW, npc.hp / npc.maxHp, 0x2a2410, ORDER_GOLD, ORDER_PALE);
      bar(W / 2 + 20, y, barW, this.chaosBody.hp / TWIN_HP, 0x2a0a10, CHAOS_RED, 0xffb0b8);
      this.hudText?.setText('⚖ ORDER          ·          CHAOS 🔥').setPosition(W / 2, y - 12);
    } else if (this.phase !== 'intro' && this.phase !== 'scripted' && this.phase !== 'outro') {
      const barW = Math.min(560, W - 200);
      const name = this.phase === 'survivor'
        ? (this.survivorKind === 'order' ? 'O R D E R   A B S O L U T E' : 'C H A O S   U N B O U N D')
        : 'R E A L I T Y';
      const main = this.phase === 'survivor'
        ? (this.survivorKind === 'order' ? ORDER_GOLD : CHAOS_RED)
        : REALITY_BLUE;
      bar(W / 2 - barW / 2, y, barW, npc.hp / npc.maxHp, REALITY_BLUE_DEEP, main, REALITY_WHITE);
      this.hudText?.setText(name).setPosition(W / 2, y - 12);
    } else {
      this.hudText?.setText('');
    }

    const left = this.tag?.pledgesLeft ?? 0;
    this.livesText?.setText(this.phase === 'outro' ? '' : `◈ VESSELS IN RESERVE: ${left}`);
  }

  /** Point the drawn figure's hands at a gesture for `durMs`. */
  private setPose(pose: RealityPose, durMs: number): void {
    this.pose = pose;
    this.poseStart = this.api.scene.time.now;
    this.poseDur = Math.max(1, durMs);
  }

  private banner(text: string): void {
    this.api.showFloatingText(this.api.width / 2, this.api.height / 2 - 80, text, '#9fc2ff');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.api.scene.time.delayedCall(ms, resolve));
  }

  private pointToSegment(
    px: number, py: number, x1: number, y1: number, x2: number, y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }
}
