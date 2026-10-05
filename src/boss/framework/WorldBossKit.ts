import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Sfx } from '../../audio';
import {
  BossBodyState, BossGimmick, BossMovement, BossPhaseStyle, BossResumeState, BossTint,
  HarassId, LibTuning, LibMoveId, MoveRef, SignatureMove, WorldBossDef, WorldBossPhase, hardKnobs,
} from './BossDefs';
import { BossPalette, BossToolkit, BossToolkitHost } from './BossToolkit';
import { HARASS_MOVES, LIB_MOVES, LIB_STYLE, LibStyle } from './AttackLibrary';
import { BossHold, BossLook, BossRig, mixColor, shade } from './BossRig';

/**
 * The engine every world Sovereign fights through.
 *
 * Modelled on DisgracedKingKit and using its load-bearing decision: the boss's
 * damageable body IS ArenaScene's npc, so all ~40 element kits hit it with no
 * per-kit work. What the King hand-rolls — the telegraphed move cycle with rest
 * beats, the independent harassment clock, the phase machine with a wreck
 * interlude and rotting heal orbs, the boss bar — lives here once, driven by a
 * WorldBossDef.
 *
 * Three things the first pass got wrong, fixed here:
 *
 * • **It looked like scenery.** The body is now the player's own rig at boss
 *   scale (`BossRig`) — a round body with floating hands that trail it, eyes
 *   that track you, a crest that grows as the phases do — posed by the same
 *   choreographer that fires the moves.
 * • **It stood still and machine-gunned you.** The body now walks a real
 *   movement profile per phase (hover, stalk, orbit, rush, blink), plants to
 *   cast, and takes a visible wind-up — hands charging, name over its head,
 *   a ring closing under its feet — before every single move.
 * • **Its attacks were cheap and constant.** Damage is multiplied once, at the
 *   toolkit chokepoint; warnings are stretched once, at the spawners; rest
 *   beats are stretched once, here. Sovereigns hit hard, rarely, and always
 *   after saying so.
 */

export interface WorldBossArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  /** The boss body — the npc slot, taken over for the duration. */
  get npc(): Fighter;
  get width(): number;
  get height(): number;
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  bossVictory(): void;
}

const INTRO_MS = 2600;
const INTERLUDE_MS = 2800;
const HARASS_GRACE_MS = 4200;
const HEAL_ORB_COUNT = 3;
const HEAL_ORB_AMOUNT = 15;
const ENRAGE_REST_FRAC = 0.62;
const BANTER_MIN_MS = 16000;
const BANTER_SPAN_MS = 9000;

/**
 * The three knobs behind "deadlier, better telegraphed, less often". They are
 * deliberately one number each, applied at one chokepoint each, so the whole
 * Sovereign line moves together and no individual def can drift out of the deal.
 */
const LETHALITY = 1.6;
const TELEGRAPH = 1.45;
const CADENCE = 1.55;
/** Beat before a move with no style of its own. */
const DEFAULT_WINDUP_MS = 820;

type FlowPhase = 'intro' | 'fight' | 'interlude' | 'done';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Phase tints, layered over the def's own colours. */
const TINTS: Record<BossTint, (c: number) => number> = {
  none: (c) => c,
  hot: (c) => mixColor(c, 0xff5a1e, 0.4),
  cold: (c) => mixColor(c, 0x5aa8ff, 0.42),
  pale: (c) => mixColor(c, 0xf2f6ff, 0.44),
  void: (c) => mixColor(c, 0x140b22, 0.5),
  sick: (c) => mixColor(c, 0x9dff5a, 0.36),
  gold: (c) => mixColor(c, 0xffd77a, 0.42),
  blood: (c) => mixColor(c, 0xc0142e, 0.44),
};

/** Movement profiles: preferred range, body speed, and how hard it plants to cast. */
const MOTION: Record<BossMovement, { range: number; speed: number; plant: number; churn: number }> = {
  // `anchor` holds a post rather than a range — see `driveBody`.
  anchor: { range: 0, speed: 58, plant: 0.05, churn: 0 },
  hover: { range: 250, speed: 78, plant: 0.15, churn: 0.5 },
  stalk: { range: 300, speed: 124, plant: 0.22, churn: 1 },
  orbit: { range: 250, speed: 178, plant: 0.62, churn: 1.5 },
  rush: { range: 155, speed: 214, plant: 0.5, churn: 1.1 },
  blink: { range: 280, speed: 0, plant: 0, churn: 0 },
};

interface Ward { a: number; alive: boolean }

export class WorldBossKit {
  private def!: WorldBossDef;
  private hard = false;

  private flow: FlowPhase = 'intro';
  private phaseIdx = 0;
  private phases: WorldBossPhase[] = [];

  // Choreographer
  private cycleIdx = 0;
  private busyUntil = 0;
  private nextMoveAt = 0;
  private harassIdx = 0;
  private harassNextAt = 0;
  private interludeEndsAt = 0;
  private nextBanterAt = 0;
  private banterIdx = 0;
  private enrageAnnounced = false;
  private hurtFlashUntil = 0;

  /** The move that has been announced and is waiting on its wind-up. */
  private pendingMove: MoveRef | null = null;
  private pendingStyle: LibStyle | null = null;
  private windupFrom = 0;
  private windupUntil = 0;
  /** Cleared when `busyUntil` passes — a held pose lasts exactly as long as its move. */
  private holdUntil = 0;
  /** Re-aimed every frame while it stands, so a channel tracks you as the body turns. */
  private activeHold: BossHold = null;
  /** A move driving the body itself; the movement AI stands down until this passes. */
  private motionLockUntil = 0;

  // Body
  private bx = 0;
  private by = 0;
  private vx = 0;
  private vy = 0;
  private strafeDir = 1;
  private nextMotionAt = 0;
  private motionPush = 1;
  private orbitA = 0;
  private blinkAt = 0;
  /** The post an `anchor` phase stands on. */
  private anchorX = 0;
  private anchorY = 0;

  // Phase style, resolved once per phase.
  private style: BossPhaseStyle = {};
  private look!: BossLook;
  private palette!: BossPalette;
  private basePalette!: BossPalette;

  // Gimmick state
  private gimmick: BossGimmick = 'none';
  private gimmickClock = 0;
  private shrinkR = 0;
  private shrinkHitAt = 0;
  private wards: Ward[] = [];
  private wardsRespawnAt = 0;
  private staggerUntil = 0;

  private rig = new BossRig();
  private tk: BossToolkit | null = null;
  private signatures = new Map<string, SignatureMove>();

  // Layers
  private arenaG: Phaser.GameObjects.Graphics | null = null;
  private groundG: Phaser.GameObjects.Graphics | null = null;
  private bodyG: Phaser.GameObjects.Graphics | null = null;
  private gloomG: Phaser.GameObjects.Graphics | null = null;
  private projG: Phaser.GameObjects.Graphics | null = null;
  private barG: Phaser.GameObjects.Graphics | null = null;
  private barLabel: Phaser.GameObjects.Text | null = null;
  private tellLabel: Phaser.GameObjects.Text | null = null;

  constructor(private arena: WorldBossArenaApi) {}

  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * @param resume Pledge fights: the body a fallen element left behind. The Sovereign
   *   picks up on that phase with that much HP rather than standing back up whole.
   */
  reset(def: WorldBossDef, hard: boolean, resume?: BossResumeState | null): void {
    this.clearWorld();
    const scene = this.arena.scene;
    const W = this.arena.width;
    const H = this.arena.height;
    const now = scene.time.now;

    this.def = def;
    this.hard = hard;
    this.phases = [...def.phases];
    if (hard && def.hard?.extraPhase) this.phases.push(def.hard.extraPhase);

    this.flow = 'intro';
    this.phaseIdx = resume
      ? Phaser.Math.Clamp(resume.phaseIdx, 0, this.phases.length - 1)
      : 0;
    this.cycleIdx = 0;
    this.harassIdx = 0;
    this.banterIdx = 0;
    this.busyUntil = 0;
    this.nextMoveAt = now + INTRO_MS;
    this.harassNextAt = now + INTRO_MS + HARASS_GRACE_MS;
    this.nextBanterAt = now + INTRO_MS + BANTER_MIN_MS;
    this.enrageAnnounced = false;
    this.hurtFlashUntil = 0;
    this.interludeEndsAt = 0;
    this.pendingMove = null;
    this.pendingStyle = null;
    this.holdUntil = 0;
    this.activeHold = null;
    this.motionLockUntil = 0;
    this.staggerUntil = 0;
    this.bx = W / 2;
    this.by = H * 0.38;
    this.vx = this.vy = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.nextMotionAt = now + 2200;
    this.motionPush = 1;
    this.orbitA = Math.random() * Math.PI * 2;
    this.blinkAt = now + 4000;
    this.rig.reset(this.bx, this.by);

    this.basePalette = {
      main: def.color, lit: def.colorLit, dark: def.colorDark, accent: def.accent,
    };
    this.palette = { ...this.basePalette };
    this.look = { ...def.look };

    const kit = this;
    const host: BossToolkitHost = {
      scene,
      get W() { return kit.arena.width; },
      get H() { return kit.arena.height; },
      player: () => this.arena.player,
      bossX: () => this.bx,
      bossY: () => this.by,
      setBossPos: (x, y) => { this.bx = x; this.by = y; },
      stopped: () => this.flow === 'done',
      addEnemy: (f) => this.arena.addEnemy(f),
      removeEnemy: (f) => this.arena.removeEnemy(f),
      healBoss: (amount) => {
        const npc = this.arena.npc;
        if (!npc.active || npc.hp <= 0) return;
        npc.hp = Math.min(npc.maxHp, npc.hp + amount);
        npc.emit('damaged', 0);
      },
      spawnHitFlash: (x, y, c) => this.arena.spawnHitFlash(x, y, c),
      showFloatingText: (x, y, t, c) => this.arena.showFloatingText(x, y, t, c),
    };
    this.tk = new BossToolkit(host, this.palette, hard);
    this.tk.damageScale = (def.damageMult ?? 1) * LETHALITY
      * (hard ? hardKnobs(def).damageMult : 1);
    this.tk.telegraphScale = TELEGRAPH * (hard ? 0.86 : 1);

    // Signatures are born once per fight, with the toolkit they act through.
    this.signatures.clear();
    for (const [id, factory] of Object.entries(def.signatures)) {
      this.signatures.set(id, factory(this.tk));
    }

    // ── Layers. Campaign already paints the world's backdrop at depth -100;
    // the arena dressing sits over it, telegraphs under the fighters (5),
    // the body just over them, the gloom over the room but under projectiles.
    this.arenaG = scene.add.graphics().setDepth(-50);
    this.groundG = scene.add.graphics().setDepth(3);
    this.bodyG = scene.add.graphics().setDepth(6);
    this.gloomG = scene.add.graphics().setDepth(15);
    this.projG = scene.add.graphics().setDepth(17);

    // ── The body: hidden outright, pinned, drawn per-frame by the rig.
    const npc = this.arena.npc;
    npc.bossWardIncomingMult = 1;
    npc.setMaxHp(this.phaseHp(this.phaseIdx));
    // A resumed body keeps its wounds — `setMaxHp` fills it, so cut it back down after.
    if (resume) npc.hp = Phaser.Math.Clamp(resume.hp, 1, npc.maxHp);
    npc.isInvincible = true; // dropped when the intro ends
    npc.setAlpha(0);
    npc.forceInvisible = true;
    npc.hideHealthBar();
    npc.setActive(true).setVisible(false);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCollideWorldBounds(false);
    body.setImmovable(true);
    body.moves = false;
    body.reset(this.bx, this.by);

    npc.on('damaged', (amount: number) => {
      if (amount > 0) this.hurtFlashUntil = scene.time.now + 120;
    });
    npc.on('defeated', () => this.onBodyDefeated());

    this.applyPhaseStyle(this.phaseIdx, now);
    this.paintArena();

    // ── HUD: the boss bar sits just above the ability tray, which owns the
    // bottom 52px of the screen (player HP owns y=18).
    this.barG = scene.add.graphics().setDepth(25);
    this.barLabel = scene.add.text(W / 2, H - 94, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: hex(def.colorLit), stroke: '#0a0510', strokeThickness: 4, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(26);
    // The move name, hung over the body for exactly as long as the wind-up runs.
    this.tellLabel = scene.add.text(0, 0, '', {
      fontSize: '15px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffffff', stroke: '#12060f', strokeThickness: 5, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(26).setVisible(false);

    // ── The introduction. A resumed body is mid-fight, not newly met: it gets the same
    // grace period (the intro is what keeps it invincible while the new element finds its
    // feet) but none of the ceremony, and it names the phase it is standing in.
    if (resume) {
      this.banner(`${def.name.toUpperCase()}  ·  ${this.currentPhase().name.toUpperCase()}`,
        hex(def.colorLit), 24);
      scene.time.delayedCall(1100, () => {
        if (this.flow === 'done') return;
        this.speak(def.resumeLine ?? 'Another one. Good. I was not finished.');
      });
      scene.cameras.main.shake(300, 0.003);
      return;
    }

    this.banner(`${def.name.toUpperCase()}`, hex(def.colorLit), 32);
    scene.time.delayedCall(1100, () => {
      if (this.flow === 'done') return;
      this.banner(def.title, hex(def.color), 18);
    });
    if (hard && def.hard?.introLine) {
      scene.time.delayedCall(2100, () => {
        if (this.flow === 'done') return;
        this.banner(def.hard!.introLine!, '#ffa0b2', 20);
      });
    }
    if (def.intro[0]) {
      scene.time.delayedCall(2000, () => {
        if (this.flow === 'done') return;
        this.speak(def.intro[0]);
      });
    }
    scene.cameras.main.shake(hard ? 650 : 480, hard ? 0.006 : 0.004);
  }

  /**
   * The body as it stands, for a pledge fight's next element to inherit. Null once the
   * Sovereign is down — nothing to hand on.
   */
  getResumeState(): BossResumeState | null {
    if (this.flow === 'done') return null;
    const npc = this.arena.npc;
    // Mid-interlude the current pool is spent and the next has not been dealt yet; hand on
    // the next phase at full, which is exactly where the fight would have picked up.
    if (this.flow === 'interlude') {
      const idx = Math.min(this.phaseIdx + 1, this.phases.length - 1);
      return { phaseIdx: idx, hp: this.phaseHp(idx) };
    }
    return { phaseIdx: this.phaseIdx, hp: Math.max(1, Math.round(npc.hp)) };
  }

  /**
   * Direct circle, never `applySizeMult` — that pair scales the radius twice
   * (sprite scale × body circle) and swallows the arena at boss sizes.
   */
  private setBodyRadius(r: number): void {
    const npc = this.arena.npc;
    npc.sizeMult = 1;
    npc.setScale(1);
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    body?.setCircle(r, 24 - r, 24 - r);
  }

  private phaseHp(idx: number): number {
    const base = this.phases[idx].hp;
    return Math.round(base * (this.hard ? hardKnobs(this.def).hpMult : 1));
  }

  private clearWorld(): void {
    for (const g of [this.arenaG, this.groundG, this.bodyG, this.gloomG, this.projG, this.barG]) g?.destroy();
    this.arenaG = this.groundG = this.bodyG = this.gloomG = this.projG = this.barG = null;
    this.barLabel?.destroy();
    this.barLabel = null;
    this.tellLabel?.destroy();
    this.tellLabel = null;
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();
    this.signatures.clear();
    this.tk?.destroy();
    this.tk = null;
    const npc = this.arena.npc;
    if (npc) npc.bossWardIncomingMult = 1;
  }

  // ── Phase styling ──────────────────────────────────────────────────

  /**
   * A phase that is not styled still has to feel like a new phase: the body
   * gets more aggressive, and the last one goes the colour of whatever ate it.
   */
  private defaultStyle(idx: number): BossPhaseStyle {
    if (idx === 0) return { movement: 'hover', gimmick: 'none' };
    if (idx === 1) return { movement: 'stalk', gimmick: 'none' };
    return { movement: 'rush', gimmick: 'tremor', tint: 'void' };
  }

  private applyPhaseStyle(idx: number, time: number): void {
    const phase = this.phases[idx];
    this.style = phase.style ?? this.def.phaseStyles?.[idx] ?? this.defaultStyle(idx);
    const tint = TINTS[this.style.tint ?? 'none'];
    this.palette = {
      main: tint(this.basePalette.main),
      lit: tint(this.basePalette.lit),
      dark: tint(this.basePalette.dark),
      accent: tint(this.basePalette.accent),
    };
    if (this.tk) this.tk.palette = this.palette;
    this.look = { ...this.def.look, ...(this.style.look ?? {}) };
    // What you can hit is exactly what you can see: the hitbox is the drawn body.
    this.setBodyRadius(phase.bodyR ?? this.look.torsoR ?? this.def.bodyR ?? 34);

    // Gimmick setup.
    this.anchorX = this.arena.width / 2;
    this.anchorY = this.arena.height * 0.34;
    this.gimmick = this.style.gimmick ?? 'none';
    this.gimmickClock = time + 2600;
    this.shrinkR = Math.hypot(this.arena.width, this.arena.height) * 0.52;
    this.shrinkHitAt = 0;
    this.wards = [];
    this.wardsRespawnAt = 0;
    this.arena.npc.bossWardIncomingMult = 1;
    if (this.gimmick === 'wards') this.raiseWards(time);
    this.gloomG?.clear();
  }

  // ── Frame ──────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.tk || this.flow === 'done') return;
    const dt = delta / 1000;

    if (this.flow === 'intro' && time >= this.nextMoveAt) {
      this.flow = 'fight';
      this.arena.npc.isInvincible = false;
      const p = this.currentPhase();
      if (p.line) this.speak(p.line);
      this.scheduleNext(time, 400);
    }

    if (this.flow === 'interlude' && time >= this.interludeEndsAt) {
      this.beginPhase(time, this.phaseIdx + 1);
    }

    if (this.flow === 'fight') {
      this.driveBody(time, dt);
      this.updateChoreography(time);
      this.updateHarass(time);
      this.updateBanter(time);
      this.updateEnrage();
      this.updateGimmick(time, dt);
    } else {
      this.decayMotion(dt);
    }

    // A held pose belongs to its move and nothing else, and it keeps tracking
    // the player for as long as it stands.
    if (this.holdUntil > 0 && time >= this.holdUntil) {
      this.holdUntil = 0;
      this.activeHold = null;
      this.rig.setHold(null);
    } else if (this.activeHold) {
      this.rig.setHold(this.activeHold, this.facingAngle());
    }

    this.tk.update(time, delta);
    for (const sig of this.signatures.values()) sig.update?.(time, dt);
    this.rig.update(delta, this.bx, this.by, this.facingAngle(), this.look, this.vx, this.vy);
    this.draw(time);
    this.drawBossBar();
    this.updateTell(time);
  }

  private facingAngle(): number {
    const p = this.arena.player;
    return Math.atan2(p.y - this.by, p.x - this.bx);
  }

  /** Folded into ArenaScene's per-frame speed rebuild — pulled, never pushed. */
  getPlayerSpeedMult(): number {
    return this.tk?.getPlayerSpeedMult() ?? 1;
  }

  // ── Choreography ───────────────────────────────────────────────────

  private currentPhase(): WorldBossPhase { return this.phases[this.phaseIdx]; }

  private updateChoreography(time: number): void {
    // Staggered: the wards came down and the Sovereign is open. It casts nothing.
    if (time < this.staggerUntil) {
      this.nextMoveAt = Math.max(this.nextMoveAt, this.staggerUntil + 300);
      if (this.pendingMove) {
        // Whatever it was about to throw is dropped, not banked.
        this.pendingMove = null;
        this.pendingStyle = null;
        this.activeHold = null;
        this.rig.setHold(null);
        this.rig.play('recoil', this.facingAngle(), 600);
      }
      return;
    }
    if (this.pendingMove) {
      if (time >= this.windupUntil) this.releaseMove(time);
      return;
    }
    if (time < this.nextMoveAt || time < this.busyUntil) return;
    const phase = this.currentPhase();
    const move = phase.cycle[this.cycleIdx % phase.cycle.length];
    this.cycleIdx++;
    this.beginWindup(time, move);
  }

  /** Look up how a move is performed — library style, or the signature's own. */
  private styleFor(move: MoveRef): LibStyle {
    if (move.startsWith('sig:')) {
      const sig = this.signatures.get(move.slice(4));
      const ms = sig?.durationMs ?? 1200;
      // A signature that says nothing about how it is thrown still should not
      // look like every other one: a long move is channelled, a short one is a
      // strike, and the middle is the two-handed heave.
      const fallbackHold = !sig?.gesture && ms >= 2600 ? 'conduct' as const : undefined;
      return {
        gesture: sig?.gesture ?? (ms < 1200 ? 'slam' : 'raise'),
        hold: sig?.hold ?? fallbackHold,
        windupMs: sig?.windupMs ?? (ms >= 2600 ? 1150 : 900),
        tell: sig?.tell ?? move.slice(4).replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(),
        locksBody: sig?.locksBody,
      };
    }
    return LIB_STYLE[move as LibMoveId] ?? { tell: String(move).toUpperCase() };
  }

  /**
   * The announcement. The Sovereign plants, its hands draw in to a charge, its
   * eyes narrow, its name for what is about to happen goes up over its head and
   * a ring closes under its feet. Nothing it throws skips this.
   */
  private beginWindup(time: number, move: MoveRef): void {
    const style = this.styleFor(move);
    const windup = (style.windupMs ?? DEFAULT_WINDUP_MS) * (this.hard ? 0.82 : 1)
      * (this.isEnraged() ? 0.88 : 1);
    this.pendingMove = move;
    this.pendingStyle = style;
    this.windupFrom = time;
    this.windupUntil = time + windup;
    this.activeHold = 'charge';
    this.rig.setHold('charge', this.facingAngle());
    this.holdUntil = 0;
    Sfx.playAt('shield-up', this.bx, { volume: 0.45 });
  }

  private releaseMove(time: number): void {
    const move = this.pendingMove;
    const style = this.pendingStyle;
    this.pendingMove = null;
    this.pendingStyle = null;
    if (!move || !this.tk) return;

    const aim = this.facingAngle();
    if (style?.hold) {
      this.activeHold = style.hold;
      this.rig.setHold(style.hold, aim);
    } else {
      this.activeHold = null;
      this.rig.setHold(null);
      this.rig.play(style?.gesture ?? 'punch', aim);
    }
    // Muzzle flare off the hand that threw it — the cast comes out of the rig,
    // not out of thin air over the body.
    const hand = this.rig.castHand();
    this.tk.boom(hand.x, hand.y, 22, this.palette.lit);

    const duration = this.castMove(time, move);
    if (style?.hold) this.holdUntil = time + duration;
    if (style?.locksBody) this.motionLockUntil = time + duration;
  }

  /** Fires the move and returns how long the Sovereign is busy with it. */
  private castMove(time: number, move: MoveRef): number {
    if (!this.tk) return 300;
    if (move.startsWith('sig:')) {
      const sig = this.signatures.get(move.slice(4));
      if (!sig) { this.scheduleNext(time, 300); return 300; }
      sig.cast(time);
      this.scheduleNext(time, sig.durationMs);
      return sig.durationMs;
    }
    const id = move as LibMoveId;
    const cast = LIB_MOVES[id];
    if (!cast) { this.scheduleNext(time, 300); return 300; }
    const duration = cast(this.tk, time, this.tuningFor(id));
    this.scheduleNext(time, duration);
    return duration;
  }

  private tuningFor(id: LibMoveId): LibTuning {
    return {
      ...(this.def.tuning?.[id] ?? {}),
      ...(this.hard ? this.def.hard?.tuning?.[id] ?? {} : {}),
    };
  }

  private scheduleNext(time: number, moveDurationMs: number): void {
    this.busyUntil = time + moveDurationMs;
    const phase = this.currentPhase();
    const rest = this.isEnraged()
      ? (phase.restEnragedMs ?? phase.restMs * ENRAGE_REST_FRAC)
      : phase.restMs;
    const restMult = (this.hard ? hardKnobs(this.def).restMult : 1) * CADENCE;
    this.nextMoveAt = this.busyUntil + rest * restMult;
  }

  private isEnraged(): boolean {
    const npc = this.arena.npc;
    return npc.maxHp > 0 && npc.hp / npc.maxHp <= 0.5;
  }

  private updateEnrage(): void {
    if (this.enrageAnnounced || !this.isEnraged()) return;
    this.enrageAnnounced = true;
    this.banner('IT QUICKENS', hex(this.palette.accent), 16);
    this.arena.scene.cameras.main.shake(280, 0.004);
  }

  private updateHarass(time: number): void {
    if (!this.tk || time < this.harassNextAt || time < this.staggerUntil) return;
    const phase = this.currentPhase();
    if (phase.harass.length === 0) { this.harassNextAt = time + 2000; return; }
    const move: HarassId = phase.harass[this.harassIdx % phase.harass.length];
    this.harassIdx++;
    HARASS_MOVES[move]?.(this.tk);
    const restMult = (this.hard ? hardKnobs(this.def).restMult : 1) * CADENCE;
    this.harassNextAt = time + phase.harassMs * (this.isEnraged() ? 0.78 : 1) * restMult;
  }

  private updateBanter(time: number): void {
    if (time < this.nextBanterAt || this.def.banter.length === 0) return;
    this.speak(this.def.banter[this.banterIdx % this.def.banter.length]);
    this.banterIdx++;
    this.nextBanterAt = time + BANTER_MIN_MS + Math.random() * BANTER_SPAN_MS;
  }

  // ── Body movement ──────────────────────────────────────────────────

  /**
   * The Sovereign walks the room the way a bot does: it has a preferred range,
   * it strafes rather than standing on one spot, it presses in when you give it
   * space, and it plants itself to cast. Velocity is integrated rather than
   * snapped so the rig's hands trail behind the body on the turn.
   */
  private driveBody(time: number, dt: number): void {
    if (time < this.motionLockUntil) {
      // A charge (or a signature that drives the body) owns the position this
      // frame; keep a velocity estimate alive so the rig still reads as moving,
      // and keep the hitbox under wherever the move has dragged the body to.
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.syncHitbox();
      return;
    }

    const phase = this.currentPhase();
    const styled = this.style.movement !== undefined;
    const kind: BossMovement = this.style.movement
      ?? (phase.moveSpeed ? 'stalk' : 'hover');
    const profile = MOTION[kind];
    const p = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;
    const casting = this.pendingMove !== null || time < this.busyUntil;
    const staggered = time < this.staggerUntil;

    if (kind === 'blink') {
      this.driveBlink(time);
      this.decayMotion(dt);
      return;
    }

    // The movement profile is authoritative; a phase's legacy drift numbers are
    // only consulted when it declared no profile of its own.
    const hold = styled ? profile.range : (phase.holdDist ?? profile.range);
    const speed = (styled ? profile.speed : (phase.moveSpeed ?? profile.speed))
      * (this.isEnraged() ? 1.18 : 1)
      * (casting ? profile.plant : 1)
      * (staggered ? 0 : 1);

    if (time >= this.nextMotionAt) {
      this.strafeDir *= -1;
      // A stalk or a rush leans in and out; a hover just changes which way it drifts.
      this.motionPush = kind === 'rush'
        ? (this.motionPush > 0.9 ? 0.62 : 1.55)
        : kind === 'stalk' ? (Math.random() < 0.4 ? 0.7 : 1.15) : 1;
      this.nextMotionAt = time + (kind === 'rush' ? 1500 : 2400) + Math.random() * 2200;
    }

    this.orbitA += this.strafeDir * (profile.churn * 0.55) * dt;
    const toBoss = Math.atan2(this.by - p.y, this.bx - p.x);
    // Blend the true bearing with the orbit accumulator so the circle is smooth
    // but still anchored to wherever the player actually is.
    const bearing = Phaser.Math.Angle.RotateTo(toBoss, toBoss + this.orbitA, profile.churn * dt * 1.4)
      + this.strafeDir * profile.churn * 0.35;
    const want = hold * this.motionPush;
    // An anchored Sovereign holds its post; everything else holds a range off you.
    const tx = kind === 'anchor' ? this.anchorX
      : Phaser.Math.Clamp(p.x + Math.cos(bearing) * want, 70, W - 70);
    const ty = kind === 'anchor' ? this.anchorY
      : Phaser.Math.Clamp(p.y + Math.sin(bearing) * want, 118, H - 80);

    const dx = tx - this.bx;
    const dy = ty - this.by;
    const d = Math.hypot(dx, dy);
    const desiredVx = d > 6 ? (dx / d) * speed : 0;
    const desiredVy = d > 6 ? (dy / d) * speed : 0;
    // Acceleration, not teleportation: a Sovereign has weight.
    const k = Math.min(1, dt * 3.4);
    this.vx += (desiredVx - this.vx) * k;
    this.vy += (desiredVy - this.vy) * k;
    this.bx = Phaser.Math.Clamp(this.bx + this.vx * dt, 60, W - 60);
    this.by = Phaser.Math.Clamp(this.by + this.vy * dt, 112, H - 74);
    this.containInShrink();

    this.syncHitbox();
  }

  /** A closing arena is a rule for both fighters — the Sovereign stays inside it. */
  private containInShrink(): void {
    if (this.gimmick !== 'shrink') return;
    const cx = this.arena.width / 2;
    const cy = this.arena.height * 0.55;
    const keep = Math.max(60, this.shrinkR - 46);
    const dx = this.bx - cx;
    const dy = this.by - cy;
    const d = Math.hypot(dx, dy);
    if (d <= keep) return;
    this.bx = cx + (dx / d) * keep;
    this.by = cy + (dy / d) * keep;
  }

  /** The blink profile: gone, then standing somewhere else entirely. */
  private driveBlink(time: number): void {
    if (time < this.blinkAt) { this.syncHitbox(); return; }
    if (this.pendingMove || time < this.busyUntil) { this.blinkAt = time + 600; return; }
    const p = this.arena.player;
    const tk = this.tk;
    tk?.boom(this.bx, this.by, 46, this.palette.dark);
    const a = Math.random() * Math.PI * 2;
    const d = 230 + Math.random() * 120;
    this.bx = Phaser.Math.Clamp(p.x + Math.cos(a) * d, 80, this.arena.width - 80);
    this.by = Phaser.Math.Clamp(p.y + Math.sin(a) * d, 125, this.arena.height - 85);
    this.containInShrink();
    this.rig.reset(this.bx, this.by);
    tk?.boom(this.bx, this.by, 52, this.palette.lit);
    Sfx.playAt('teleport', this.bx, { volume: 0.6 });
    this.blinkAt = time + 2400 + Math.random() * 1600;
    this.syncHitbox();
  }

  private decayMotion(dt: number): void {
    const k = Math.min(1, dt * 5);
    this.vx -= this.vx * k;
    this.vy -= this.vy * k;
    this.syncHitbox();
  }

  private syncHitbox(): void {
    (this.arena.npc.body as Phaser.Physics.Arcade.Body | null)?.reset(this.bx, this.by);
  }

  // ── Phase gimmicks ─────────────────────────────────────────────────

  private raiseWards(time: number): void {
    this.wards = [0, 1, 2].map((i) => ({ a: (Math.PI * 2 * i) / 3, alive: true }));
    this.wardsRespawnAt = 0;
    this.arena.npc.bossWardIncomingMult = 0.5;
    this.arena.showFloatingText(this.bx, this.by - 60, 'WARDED', hex(this.palette.accent));
    void time;
  }

  private updateGimmick(time: number, dt: number): void {
    const tk = this.tk;
    if (!tk) return;
    const p = this.arena.player;

    switch (this.gimmick) {
      case 'stalkers': {
        if (time < this.gimmickClock) break;
        this.gimmickClock = time + (this.hard ? 5200 : 6800);
        if (tk.addCount >= 3) break;
        const a = Math.random() * Math.PI * 2;
        tk.spawnAdd({
          x: p.x + Math.cos(a) * 330, y: p.y + Math.sin(a) * 300,
          hp: 70, speed: 118, damage: 22, maxAlive: 3,
        });
        break;
      }
      case 'tremor': {
        if (time < this.gimmickClock) break;
        this.gimmickClock = time + (this.hard ? 5000 : 6400);
        // A wave off one corner of the hall, with a gap you can be standing in.
        const cx = Math.random() < 0.5 ? 40 : this.arena.width - 40;
        const cy = Math.random() < 0.5 ? 110 : this.arena.height - 60;
        const gap = Math.atan2(p.y - cy, p.x - cx) + (Math.random() - 0.5) * 0.7;
        tk.sfx('explosion-large');
        this.arena.scene.cameras.main.shake(420, 0.005);
        for (let i = 0; i < 2; i++) {
          tk.spawnRing({
            cx, cy, delayMs: 900 + i * 700, speed: 300,
            gapCentre: gap + i * 0.25, gapHalf: 0.6, band: 30, damage: 20,
          });
        }
        break;
      }
      case 'shrink': {
        const min = Math.min(this.arena.width, this.arena.height) * 0.28;
        this.shrinkR = Math.max(min, this.shrinkR - 11 * dt);
        const cx = this.arena.width / 2;
        const cy = this.arena.height * 0.55;
        const d = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
        if (d > this.shrinkR && time - this.shrinkHitAt > 700) {
          this.shrinkHitAt = time;
          tk.hitPlayer(16, p.x, p.y);
          tk.slowPlayer(0.7, 600);
        }
        break;
      }
      case 'wards': {
        if (this.wards.length === 0) {
          if (this.wardsRespawnAt > 0 && time >= this.wardsRespawnAt) this.raiseWards(time);
          break;
        }
        const spin = time / 1100;
        let alive = 0;
        for (const w of this.wards) {
          if (!w.alive) continue;
          alive++;
          const wx = this.bx + Math.cos(w.a + spin) * 96;
          const wy = this.by + Math.sin(w.a + spin) * 78;
          if (Phaser.Math.Distance.Between(wx, wy, p.x, p.y) < 30) {
            w.alive = false;
            tk.boom(wx, wy, 40, this.palette.lit);
            Sfx.playAt('shield-break', wx);
            this.arena.showFloatingText(wx, wy, 'WARD DOWN', '#ffe9a8');
          }
        }
        if (alive === 0) {
          // All three popped: the Sovereign is wide open for a beat.
          this.wards = [];
          this.wardsRespawnAt = time + 11000;
          this.staggerUntil = time + 2600;
          this.arena.npc.bossWardIncomingMult = 1.75;
          this.banner('STAGGERED', '#ffe9a8', 20);
          this.arena.scene.cameras.main.shake(300, 0.005);
          this.arena.scene.time.delayedCall(2600, () => {
            if (this.flow !== 'fight') return;
            this.arena.npc.bossWardIncomingMult = 1;
          });
        }
        break;
      }
      case 'gloom':
      case 'none':
        break;
    }
  }

  private drawGimmick(g: Phaser.GameObjects.Graphics, time: number): void {
    const P = this.palette;
    if (this.gimmick === 'shrink') {
      const cx = this.arena.width / 2;
      const cy = this.arena.height * 0.55;
      g.lineStyle(26, P.dark, 0.32);
      g.strokeCircle(cx, cy, this.shrinkR + 13);
      g.lineStyle(3, P.lit, 0.8);
      g.strokeCircle(cx, cy, this.shrinkR);
      for (let i = 0; i < 22; i++) {
        const a = (Math.PI * 2 * i) / 22 + time / 2600;
        const lick = 8 + Math.sin(time / 120 + i * 1.7) * 6;
        g.lineStyle(2, P.accent, 0.55);
        g.lineBetween(
          cx + Math.cos(a) * this.shrinkR, cy + Math.sin(a) * this.shrinkR,
          cx + Math.cos(a) * (this.shrinkR - lick), cy + Math.sin(a) * (this.shrinkR - lick),
        );
      }
    }
    if (this.gimmick === 'wards') {
      const spin = time / 1100;
      for (const w of this.wards) {
        if (!w.alive) continue;
        const wx = this.bx + Math.cos(w.a + spin) * 96;
        const wy = this.by + Math.sin(w.a + spin) * 78;
        g.lineStyle(2, P.accent, 0.5);
        g.lineBetween(this.bx, this.by, wx, wy);
      }
    }
  }

  /** Wards and the gloom vignette paint over the room, not under it. */
  private drawGimmickAir(g: Phaser.GameObjects.Graphics, time: number): void {
    if (this.gimmick !== 'wards') return;
    const P = this.palette;
    const spin = time / 1100;
    for (const w of this.wards) {
      if (!w.alive) continue;
      const wx = this.bx + Math.cos(w.a + spin) * 96;
      const wy = this.by + Math.sin(w.a + spin) * 78;
      const pulse = 1 + Math.sin(time / 200 + w.a) * 0.1;
      g.fillStyle(P.dark, 0.85);
      g.fillCircle(wx, wy, 13 * pulse);
      g.fillStyle(P.accent, 0.95);
      g.fillCircle(wx, wy, 8 * pulse);
      g.lineStyle(2, 0xffffff, 0.55);
      g.strokeCircle(wx, wy, 15 * pulse);
    }
  }

  private drawGloom(time: number): void {
    const g = this.gloomG;
    if (!g) return;
    g.clear();
    if (this.gimmick !== 'gloom') return;
    const p = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;
    const R = 168 + Math.sin(time / 900) * 8;
    const dark = shade(this.palette.dark, -0.55);

    // Graphics cannot subtract alpha, so the lantern hole is built rather than
    // cut: four slabs blacken everything outside the player's bounding square,
    // one thick ring fills the corners the slabs leave, and a stack of rings
    // inside feathers the edge so the circle does not read as a cut-out.
    g.fillStyle(dark, 0.9);
    g.fillRect(0, 0, W, Math.max(0, p.y - R));
    g.fillRect(0, Math.min(H, p.y + R), W, Math.max(0, H - (p.y + R)));
    g.fillRect(0, Math.max(0, p.y - R), Math.max(0, p.x - R), R * 2);
    g.fillRect(Math.min(W, p.x + R), Math.max(0, p.y - R), Math.max(0, W - (p.x + R)), R * 2);
    // Corner fill: the square's diagonal reaches R·√2, so a band centred at
    // 1.21R and 0.46R wide covers exactly the gap the slabs cannot.
    for (let i = 0; i < 2; i++) {
      g.lineStyle(R * 0.46, dark, 0.9);
      g.strokeCircle(p.x, p.y, R * 1.21);
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      g.lineStyle(R * 0.08, dark, 0.9 * t * t);
      g.strokeCircle(p.x, p.y, R * (0.4 + 0.6 * t));
    }
    // A cold rim on the edge of what you can see.
    g.lineStyle(2, this.palette.lit, 0.22);
    g.strokeCircle(p.x, p.y, R);
  }

  // ── Phase flow ─────────────────────────────────────────────────────

  private onBodyDefeated(): void {
    const time = this.arena.scene.time.now;
    if (this.flow !== 'fight') return;
    if (this.phaseIdx + 1 < this.phases.length) {
      this.beginInterlude(time);
    } else {
      this.beginVictory(time);
    }
  }

  private beginInterlude(time: number): void {
    if (!this.tk) return;
    this.flow = 'interlude';
    this.interludeEndsAt = time + INTERLUDE_MS;
    const npc = this.arena.npc;
    npc.isInvincible = true;
    npc.bossWardIncomingMult = 1;

    this.pendingMove = null;
    this.pendingStyle = null;
    this.holdUntil = 0;
    this.activeHold = null;
    this.motionLockUntil = 0;
    this.staggerUntil = 0;
    this.rig.setHold(null);
    this.rig.play('recoil', this.facingAngle(), 700);
    this.tk.clearHazards();
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();

    const scene = this.arena.scene;
    scene.cameras.main.shake(500, 0.008);
    Sfx.playAt('explosion-large', this.bx);
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 130, () => {
        if (this.flow === 'done' || !this.tk) return;
        const a = Math.random() * Math.PI * 2;
        this.tk.boom(this.bx + Math.cos(a) * 40, this.by + Math.sin(a) * 34, 34, this.palette.lit);
      });
    }

    // Repair cells rot — standing off to regenerate between phases is not on
    // offer, and in hard mode they are not offered at all.
    if (!(this.hard && hardKnobs(this.def).noHeals)) {
      for (let i = 0; i < HEAL_ORB_COUNT; i++) {
        const a = Math.PI * 2 * (i / HEAL_ORB_COUNT) + Math.random() * 0.6;
        this.tk.spawnHealOrb(
          this.bx + Math.cos(a) * 150, this.by + Math.sin(a) * 120, HEAL_ORB_AMOUNT,
        );
      }
    }

    const next = this.phases[this.phaseIdx + 1];
    scene.time.delayedCall(900, () => {
      if (this.flow === 'done') return;
      this.banner(next.name.toUpperCase(), hex(this.palette.lit), 26);
      if (next.line) scene.time.delayedCall(900, () => {
        if (this.flow === 'done') return;
        this.speak(next.line!);
      });
    });
  }

  private beginPhase(time: number, idx: number): void {
    this.flow = 'fight';
    this.phaseIdx = idx;
    this.cycleIdx = 0;
    this.harassIdx = 0;
    this.enrageAnnounced = false;
    const npc = this.arena.npc;
    npc.setMaxHp(this.phaseHp(idx));
    npc.isInvincible = false;
    this.applyPhaseStyle(idx, time);
    // A new phase is a new stance: the rig drops whatever it was holding and
    // the body re-plants, so the change of movement profile reads immediately.
    this.activeHold = null;
    this.holdUntil = 0;
    this.rig.setHold(null);
    this.rig.play('flex', this.facingAngle(), 700);
    this.vx = this.vy = 0;
    this.nextMotionAt = time + 1400;
    this.blinkAt = time + 1800;
    this.scheduleNext(time, 500);
    this.harassNextAt = time + HARASS_GRACE_MS * 0.7;
    // Repaint the hall in the new phase's colours.
    this.paintArena();
    if (this.arenaG) {
      this.arenaG.setAlpha(0);
      this.arena.scene.tweens.add({ targets: this.arenaG, alpha: 1, duration: 600 });
    }
  }

  private beginVictory(time: number): void {
    if (!this.tk) return;
    this.flow = 'done';
    const scene = this.arena.scene;
    this.tk.clearHazards();
    this.arena.npc.bossWardIncomingMult = 1;
    this.gloomG?.clear();
    for (const sig of this.signatures.values()) sig.onPhaseEnd?.();

    this.banner(this.def.defeatLine, '#ffe9a8', 26);
    scene.cameras.main.flash(600, 255, 255, 255);
    scene.cameras.main.shake(700, 0.012);
    this.tk.boom(this.bx, this.by, 200, this.palette.lit);
    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 110, () => {
        const a = (i / 6) * Math.PI * 2;
        this.tk?.boom(this.bx + Math.cos(a) * 44, this.by - 30 + Math.sin(a) * 30, 28, this.palette.main);
      });
    }
    scene.time.delayedCall(1600, () => this.arena.bossVictory());
    void time;
  }

  // ── Presentation ───────────────────────────────────────────────────

  private banner(text: string, color: string, size: number): void {
    const scene = this.arena.scene;
    const t = scene.add.text(this.arena.width / 2, 132, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#0a0510', strokeThickness: 6, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 1, duration: 220 });
    scene.tweens.add({
      targets: t, alpha: 0, scaleX: 1.18, scaleY: 1.18, delay: 1500, duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  /** A Sovereign's line — smaller than a banner, hung under the headline slot. */
  private speak(text: string): void {
    const scene = this.arena.scene;
    const t = scene.add.text(this.arena.width / 2, 168, `“${text}”`, {
      fontSize: '14px', fontFamily: 'Georgia, serif', fontStyle: 'italic',
      color: hex(this.palette.lit), stroke: '#0a0510', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(27).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 0.95, duration: 300 });
    scene.tweens.add({
      targets: t, alpha: 0, y: 160, delay: 2400, duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  /** The name of the move that is coming, riding over the body while it charges. */
  private updateTell(time: number): void {
    const label = this.tellLabel;
    if (!label) return;
    if (!this.pendingMove || !this.pendingStyle) {
      if (label.visible) label.setVisible(false);
      return;
    }
    const t = Phaser.Math.Clamp((time - this.windupFrom) / Math.max(1, this.windupUntil - this.windupFrom), 0, 1);
    const r = this.look.torsoR ?? 34;
    label.setVisible(true);
    label.setText(this.pendingStyle.tell);
    label.setPosition(this.bx, this.by - r - 46 - t * 10);
    label.setColor(t > 0.75 && Math.floor(time / 80) % 2 === 0 ? '#ffffff' : hex(this.palette.accent));
    label.setAlpha(Math.min(1, t * 4));
    label.setScale(0.88 + t * 0.22);
  }

  /** The floor, in this phase's colours. A def's own hall wins where it has one. */
  private paintArena(): void {
    const g = this.arenaG;
    if (!g) return;
    g.clear();
    const W = this.arena.width;
    const H = this.arena.height;
    if (this.def.drawArena) this.def.drawArena(g, W, H);
    else this.drawDefaultArena(g, W, H, this.palette);
  }

  private drawDefaultArena(g: Phaser.GameObjects.Graphics, W: number, H: number, p: BossPalette): void {
    // A fighting circle, not a new room — the world's own backdrop stays.
    g.fillStyle(0x000000, 0.28);
    g.fillRect(0, 0, W, H);
    g.lineStyle(2, p.main, 0.22);
    g.strokeCircle(W / 2, H * 0.55, Math.min(W, H) * 0.42);
    g.lineStyle(1, p.accent, 0.14);
    g.strokeCircle(W / 2, H * 0.55, Math.min(W, H) * 0.34);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
      const r = Math.min(W, H) * 0.42;
      const x = W / 2 + Math.cos(a) * r;
      const y = H * 0.55 + Math.sin(a) * r;
      g.fillStyle(p.main, 0.3);
      g.fillCircle(x, y, 3);
    }
  }

  /** The ring that closes under the Sovereign's feet while it winds up. */
  private drawWindup(g: Phaser.GameObjects.Graphics, time: number): void {
    if (!this.pendingMove) return;
    const t = Phaser.Math.Clamp((time - this.windupFrom) / Math.max(1, this.windupUntil - this.windupFrom), 0, 1);
    const P = this.palette;
    const R = (this.look.torsoR ?? 34) * 3.1;
    const r = R * (1 - t) + 26;
    g.lineStyle(3, P.accent, 0.35 + t * 0.5);
    g.strokeCircle(this.bx, this.by, r);
    g.lineStyle(1.5, P.lit, 0.4);
    g.strokeCircle(this.bx, this.by, R);
    // Sigil spokes sweeping round as the charge fills.
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + t * 3.2;
      g.lineStyle(2.5, P.lit, 0.25 + t * 0.55);
      g.lineBetween(
        this.bx + Math.cos(a) * (r - 10), this.by + Math.sin(a) * (r - 10) * 0.8,
        this.bx + Math.cos(a) * (r + 8), this.by + Math.sin(a) * (r + 8) * 0.8,
      );
    }
    g.fillStyle(P.main, 0.08 + t * 0.14);
    g.fillCircle(this.bx, this.by, r);
  }

  private draw(time: number): void {
    if (!this.tk) return;
    const gG = this.groundG;
    const pG = this.projG;
    const bG = this.bodyG;
    if (!gG || !pG || !bG) return;

    gG.clear();
    this.drawGimmick(gG, time);
    this.drawWindup(gG, time);
    this.tk.drawGround(gG, time);
    for (const sig of this.signatures.values()) sig.drawGround?.(gG, time);

    pG.clear();
    this.tk.drawAir(pG, time);
    this.drawGimmickAir(pG, time);
    for (const sig of this.signatures.values()) sig.drawAir?.(pG, time);

    bG.clear();
    const npc = this.arena.npc;
    const alive = this.flow === 'fight' || this.flow === 'intro';
    const hpRatio = alive ? Phaser.Math.Clamp(npc.hp / Math.max(1, npc.maxHp), 0, 1)
      : this.flow === 'interlude' ? 0 : 1;
    const enraged = alive && this.isEnraged();
    const hurt = time < this.hurtFlashUntil;
    const castGlow = this.pendingMove
      ? Phaser.Math.Clamp((time - this.windupFrom) / Math.max(1, this.windupUntil - this.windupFrom), 0, 1)
      : Phaser.Math.Clamp((this.busyUntil - time) / 600, 0, 1) * 0.5;
    const facing = this.facingAngle();

    this.rig.draw(bG, {
      x: this.bx, y: this.by, t: time, facing,
      look: this.look, palette: this.palette,
      hpRatio, enraged, hurt, castGlow, phaseIdx: this.phaseIdx,
    });

    // Staggered: the body sags and a ring of broken light hangs over it.
    if (time < this.staggerUntil) {
      const r = this.look.torsoR ?? 34;
      for (let i = 0; i < 5; i++) {
        const a = time / 300 + (Math.PI * 2 * i) / 5;
        bG.fillStyle(0xffe9a8, 0.8);
        bG.fillCircle(this.bx + Math.cos(a) * (r + 14), this.by - r - 16 + Math.sin(a) * 6, 3.4);
      }
    }

    if (this.def.drawDecor) {
      const state: BossBodyState = {
        x: this.bx, y: this.by, t: time, hpRatio, enraged, hurt,
        phaseIdx: this.phaseIdx, hard: this.hard, facing, castGlow,
        radius: this.look.torsoR ?? 34,
        palette: this.palette,
        look: this.look,
        hands: [0, 1, 2, 3].slice(0, this.look.arms ?? 2).map((i) => this.rig.handAt(i)),
      };
      this.def.drawDecor(bG, state);
    }

    this.drawGloom(time);
  }

  private drawBossBar(): void {
    const g = this.barG;
    if (!g || !this.barLabel) return;
    const W = this.arena.width;
    const H = this.arena.height;
    const npc = this.arena.npc;
    const P = this.palette;
    g.clear();

    const barW = Math.min(560, W - 220);
    const barH = 13;
    const x = W / 2 - barW / 2;
    const y = H - 78;

    g.fillStyle(0x08060e, 0.85);
    g.fillRect(x - 3, y - 3, barW + 6, barH + 6);
    g.lineStyle(1, P.main, 0.7);
    g.strokeRect(x - 3, y - 3, barW + 6, barH + 6);

    const frac = this.flow === 'interlude' ? 0
      : Phaser.Math.Clamp(npc.hp / Math.max(1, npc.maxHp), 0, 1);
    g.fillStyle(P.dark, 1);
    g.fillRect(x, y, barW, barH);
    g.fillStyle(this.isEnraged() ? P.accent : P.main, 1);
    g.fillRect(x, y, barW * frac, barH);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x, y, barW * frac, 3);
    // Warded bodies read as plated; a staggered one reads as split open.
    if (this.gimmick === 'wards' && this.wards.some((w) => w.alive)) {
      for (let i = 0; i < 9; i++) {
        g.fillStyle(0x0b0814, 0.45);
        g.fillRect(x + (barW / 9) * i + 2, y, 3, barH);
      }
    }
    if (this.arena.scene.time.now < this.staggerUntil) {
      g.lineStyle(2, 0xffe9a8, 0.9);
      g.strokeRect(x - 4, y - 4, barW + 8, barH + 8);
    }

    // Phase pips — one diamond per remaining body.
    const remaining = this.phases.length - this.phaseIdx - (this.flow === 'interlude' ? 1 : 0);
    for (let i = 0; i < this.phases.length; i++) {
      const px = x + barW + 16 + i * 14;
      const lit = i < remaining;
      g.fillStyle(lit ? P.lit : 0x2a2434, lit ? 1 : 0.6);
      g.fillCircle(px, y + barH / 2, 4);
    }

    const phaseName = this.currentPhase()?.name ?? '';
    this.barLabel.setText(
      `${this.hard ? '☠ ' : ''}${this.def.name.toUpperCase()}  ·  ${phaseName.toUpperCase()}`,
    );
    this.barLabel.setColor(hex(P.lit));
  }
}
