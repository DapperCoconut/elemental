import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  CHK, ChalkAvatar, ChalkColorFn, ChalkFx, chalkBlob, chalkLine, chalkStick, grain,
} from './ChalkVisuals';

type Owner = 'player' | 'npc';

/**
 * Every kind of chalk in the game. The first four are the four drawing abilities; the last
 * three are the Masterpiece palette. A mark's kind decides everything about it — colour,
 * lifetime, whether it detonates and what it does to whoever is standing on it.
 */
export type ChalkKind = 'ward' | 'boom' | 'perma' | 'shield' | 'green' | 'orange' | 'teal';

const TONE: Record<ChalkKind, number> = {
  ward: CHK.white,
  boom: CHK.red,
  perma: CHK.blue,
  shield: CHK.white,
  green: CHK.green,
  orange: CHK.orange,
  teal: CHK.teal,
};

const LABEL: Record<ChalkKind, string> = {
  ward: 'WARD', boom: 'EXPLOSIVE', perma: 'PERMA', shield: 'SHIELD',
  green: 'GREEN — HEAL', orange: 'ORANGE — BURN', teal: 'TEAL — SPEED',
};

// ── Drawing ──────────────────────────────────────────────────────────────────
/** How far the cursor must travel before another mark is laid. Also the stroke's resolution. */
const STEP = 12;
/** Masterpiece runs for eight seconds, so it draws coarser or it would carpet the floor. */
const STEP_MP = 17;
/** Past this the cursor is treated as having been lifted, and the next mark starts a new run. */
const LIFT = 96;
/** Hard ceiling on chalk on the floor at once. The oldest expiring mark is rubbed out first. */
const MAX_MARKS = 460;

// ── Chalk Ward (Click) ───────────────────────────────────────────────────────
const WARD_DRAW_MS = 1000;
const WARD_FUSE_MS = 500;
const WARD_DAMAGE = 10;
const WARD_RADIUS = 34;

// ── Explosive Chalk (E) ──────────────────────────────────────────────────────
const BOOM_DRAW_MS = 2000;
/** The wait after the last mark is drawn, before the line starts going up. */
const BOOM_FUSE_MS = 1000;
const BOOM_DAMAGE = 10;
const BOOM_RADIUS = 40;
/** Gap between consecutive blasts, so the line runs rather than flashing all at once. */
const BOOM_STAGGER_MS = 55;

/**
 * The one thing keeping a dense scribble honest: however many blasts overlap a body, it can
 * only be hurt by one of them every this-many milliseconds.
 */
const BLAST_GATE_MS = 180;

// ── Perma-Chalk (R) ──────────────────────────────────────────────────────────
const PERMA_DRAW_MS = 500;
const PERMA_DPS = 15;
const PERMA_RADIUS = 24;

// ── Chalk Shield (F) ─────────────────────────────────────────────────────────
const SHIELD_DRAW_MS = 1000;
/** Radius of the visible ring the shield may be drawn inside. */
const SHIELD_RANGE = 118;
const SHIELD_MIN_DIST = 30;
const SHIELD_HP = 125;
/** Radians per second the finished shield turns at. */
const SHIELD_SPIN = 0.9;
const SHIELD_NODE_R = 15;
/** What one blocked shot costs the shield. */
const SHIELD_PROJ_COST = 8;
/** What leaning on it costs, per second. */
const SHIELD_PUSH_DPS = 12;
const SHIELD_PUSH_PAD = 14;

// ── Masterpiece (Q) ──────────────────────────────────────────────────────────
const MP_MS = 8000;
/** How long the finished work stays on the floor after the artist stops drawing. */
const MP_LIFE_MS = 30000;
const MP_HEAL_DPS = 9;
const MP_DAMAGE_DPS = 18;
const MP_SPEED_MULT = 1.45;
const MP_TOUCH_R = 26;
/** Masterpiece chalk is the only thing Chalk can put down in bulk — cap it per side. */
const MP_MAX_MARKS = 200;

const ARENA_PAD = 32;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * One dab of chalk. Marks are immutable once laid — they never move — which is what lets the
 * ground layer be repainted only when the set changes rather than every frame.
 */
interface Mark {
  owner: Owner;
  kind: ChalkKind;
  x: number;
  y: number;
  /** The previous point in the same run. Meaningless unless `linked`. */
  px: number;
  py: number;
  linked: boolean;
  bornAt: number;
  /** Expiry, or 0 for chalk that stays until something rubs it out. */
  until: number;
  /** Detonation time, or 0 for chalk that never goes off. */
  fuseAt: number;
  seed: number;
  stroke: number;
}

/** A live drawing window: the cursor is laying `kind` until `until`. */
interface Session {
  kind: ChalkKind;
  until: number;
  stroke: number;
  lastX: number;
  lastY: number;
  started: boolean;
  /** Chalk Shield: nothing may be drawn outside `SHIELD_RANGE` of the caster. */
  confined: boolean;
  /** Masterpiece: chalk only flows while the button is held. */
  requireHold: boolean;
  step: number;
}

/** One piece of the shield, held in polar coordinates about its owner. */
interface ShieldNode {
  ang: number;
  dist: number;
  seed: number;
}

interface Side {
  owner: Owner;
  session: Session | null;
  /** Stroke id of the blue line currently on the floor, or −1 when there is none. */
  permaStroke: number;
  shieldHp: number;
  shieldNodes: ShieldNode[];
  shieldSpin: number;
  shieldGrindAccum: number;
  savedAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;
  mpUntil: number;
  mpOn: boolean;
  mpChalk: 'green' | 'orange' | 'teal';
  mpSavedInvincible: boolean;
  mpMarks: number;
  healAccum: number;
  /** True this frame if the owner is standing on their own teal. */
  onTeal: boolean;
  onGreen: boolean;
  /** The NPC's phantom cursor — it has no mouse, so one is drawn for it. */
  curAng: number;
  curX: number;
  curY: number;
  /** Pacing gate so the AI does not redraw its blue line every time it comes off cooldown. */
  nextPermaAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    session: null,
    permaStroke: -1,
    shieldHp: 0,
    shieldNodes: [],
    shieldSpin: 0,
    shieldGrindAccum: 0,
    savedAbsorber: null,
    absorberInstalled: false,
    mpUntil: 0,
    mpOn: false,
    mpChalk: 'green',
    mpSavedInvincible: false,
    mpMarks: 0,
    healAccum: 0,
    onTeal: false,
    onGreen: false,
    curAng: 0,
    curX: 0,
    curY: 0,
    nextPermaAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface ChalkArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Chalk visual colour through that side's equipped skin. */
  chalkColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── ChalkKit ─────────────────────────────────────────────────────────────────

export class ChalkKit {
  private api: ChalkArenaApi;

  // ── Visuals ──
  private readonly pcol: ChalkColorFn;
  private readonly ncol: ChalkColorFn;
  private readonly pfx: ChalkFx;
  private readonly nfx: ChalkFx;
  private playerAvatar: ChalkAvatar | null = null;
  private npcAvatar: ChalkAvatar | null = null;
  /**
   * Chalk that just sits there. Repainted only when the mark set changes — with several
   * hundred grainy strokes on the floor, redrawing this every frame is the one thing that
   * would make the element expensive.
   */
  private staticGfx: Phaser.GameObjects.Graphics | null = null;
  private staticDirty = true;
  /** Chalk with a fuse burning. Few, short-lived, and has to pulse — so it is per-frame. */
  private liveGfx: Phaser.GameObjects.Graphics | null = null;
  /** Above the fighters: the shield and the drawing ring. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private marks: Mark[] = [];
  private nextStroke = 1;
  /** Per-victim blast immunity, so overlapping detonations cannot chain-delete anyone. */
  private blastGate = new Map<Fighter, number>();
  /** Fractional damage carried between frames for the ground-burn chalks. */
  private burnAccum = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  private holding = false;

  constructor(api: ChalkArenaApi) {
    this.api = api;
    this.pcol = (base) => api.chalkColor('player', base);
    this.ncol = (base) => api.chalkColor('npc', base);
    this.pfx = new ChalkFx(api.scene, this.pcol);
    this.nfx = new ChalkFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): ChalkFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): ChalkColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private isChalk(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'chalk' : this.api.npcElementId === 'chalk';
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /** Whoever this side is drawing *at*. Drives the NPC's phantom cursor. */
  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') {
      const p = this.api.player;
      return p && p.active && p.hp > 0 ? p : null;
    }
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return t && t.active && t.hp > 0 ? t : null;
  }

  private avatar(owner: Owner): ChalkAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The chalk this side is holding right now — the stick in the avatar's hand. */
  private heldChalk(owner: Owner): number {
    const s = this.side(owner);
    if (s.session) return TONE[s.session.kind];
    if (s.mpOn) return TONE[s.mpChalk];
    return CHK.white;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything held on a fighter has to be handed back, or the next match starts with a
    // permanently invincible player and an absorber pointing at a dead shield.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (f) {
        if (s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
        if (s.mpOn) f.isInvincible = s.mpSavedInvincible;
      }
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.marks = [];
    this.nextStroke = 1;
    this.blastGate.clear();
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.holding = false;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.staticGfx?.destroy(); this.staticGfx = null;
    this.liveGfx?.destroy(); this.liveGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.staticDirty = true;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'chalk') return;
    // Latched before anything else: the cursor is the element's whole weapon, and a frame
    // where an ability happened to early-out still has to feed the live stroke.
    this.aimX = mouseX;
    this.aimY = mouseY;
    this.holding = pointer.isDown;

    const p = this.api.player;
    const s = this.sides.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // While the Masterpiece is up, the whole keyboard belongs to the palette: the mouse
    // draws instead of casting, and E/R/F pick a colour instead of firing an ability.
    if (s.mpOn && s.mpUntil > time) {
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.pickChalk('player', 'green');
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.pickChalk('player', 'orange');
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.pickChalk('player', 'teal');
      return;
    }

    // One hand, one stick: a window that is already open swallows the input rather than
    // being thrown away half-drawn. Gated here rather than inside the `do*` methods because
    // by the time a `cast` runs its cooldown has already been stamped.
    if (s.session) return;

    if (clicked) p.castAbility('chalk-ward', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('chalk-explosive', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('chalk-perma', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('chalk-shield', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('chalk-masterpiece', ctx);
  }

  /** Swap the stick in hand mid-Masterpiece. Each swap starts a fresh run of chalk. */
  private pickChalk(owner: Owner, kind: 'green' | 'orange' | 'teal'): void {
    const s = this.side(owner);
    if (s.mpChalk === kind) return;
    s.mpChalk = kind;
    if (s.session) {
      s.session.kind = kind;
      s.session.stroke = this.nextStroke++;
      s.session.started = false;
    }
    const f = this.fighter(owner);
    this.avatar(owner)?.setChalk(TONE[kind]);
    this.fx(owner).dust(f.x, f.y - 8, 5, 18, 420, TONE[kind]);
    this.api.showFloatingText(f.x, f.y - 46, `🖍️ ${LABEL[kind]}`, this.hex(TONE[kind]));
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Chalk Ward. A second of white, each dab of it counting down half a second. */
  doWard(owner: Owner): void {
    this.openSession(owner, 'ward', WARD_DRAW_MS, false, false, STEP);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('punch');
    this.fx(owner).ring(f.x, f.y, 10, 40, CHK.white, 320);
  }

  /** E — Explosive Chalk. Two seconds of red, then the whole run goes off end to end. */
  doExplosive(owner: Owner): void {
    this.openSession(owner, 'boom', BOOM_DRAW_MS, false, false, STEP);
    const f = this.fighter(owner);
    this.avatar(owner)?.play('sweep');
    this.fx(owner).ring(f.x, f.y, 10, 46, CHK.red, 360);
    this.api.showFloatingText(f.x, f.y - 44, '🧨 FUSE LAID', this.hex(CHK.red));
  }

  /** R — Perma-Chalk. Half a second of blue that stays until it is drawn again. */
  doPerma(owner: Owner): void {
    const s = this.side(owner);
    // The old line is rubbed out the moment a new one is started — there is only ever one.
    if (s.permaStroke >= 0) this.eraseStroke(s.permaStroke, owner);
    this.openSession(owner, 'perma', PERMA_DRAW_MS, false, false, STEP);
    s.permaStroke = s.session!.stroke;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 10, 44, CHK.blue, 380);
    this.api.showFloatingText(f.x, f.y - 44, '🔵 PERMA-CHALK', this.hex(CHK.blue));
  }

  /** F — Chalk Shield. A second of white inside arm's reach, which then comes off the floor. */
  doShield(owner: Owner): void {
    const s = this.side(owner);
    if (s.shieldNodes.length) this.breakShield(owner, false);
    this.openSession(owner, 'shield', SHIELD_DRAW_MS, true, false, STEP);
    s.shieldHp = SHIELD_HP;
    s.shieldSpin = 0;
    s.shieldGrindAccum = 0;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 16, SHIELD_RANGE, CHK.white, 460);
    this.api.showFloatingText(f.x, f.y - 46, '🛡️ DRAW YOUR SHIELD', this.hex(CHK.white));
  }

  /** Q — Masterpiece. Eight seconds where nothing can touch you and everything is a colour. */
  doMasterpiece(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.mpUntil = this.now + MP_MS;
    s.mpChalk = 'green';
    s.mpMarks = 0;
    if (!s.mpOn) {
      s.mpOn = true;
      s.mpSavedInvincible = f.isInvincible;
      f.isInvincible = true;
    }
    // Held rather than tapped: eight seconds of unbroken chalk would be a solid slab.
    this.openSession(owner, 'green', MP_MS, false, true, STEP_MP);
    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.setChalk(CHK.green);
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 14, 96, CHK.green, 520);
    fx.ring(f.x, f.y, 14, 120, CHK.orange, 620);
    fx.ring(f.x, f.y, 14, 144, CHK.teal, 720);
    this.api.showFloatingText(f.x, f.y - 50, '🎨 MASTERPIECE', this.hex(CHK.teal));
  }

  private openSession(
    owner: Owner, kind: ChalkKind, ms: number, confined: boolean, requireHold: boolean, step: number,
  ): void {
    const s = this.side(owner);
    s.session = {
      kind,
      until: this.now + ms,
      stroke: this.nextStroke++,
      lastX: 0,
      lastY: 0,
      started: false,
      confined,
      requireHold,
      step,
    };
    this.avatar(owner)?.setChalk(TONE[kind]);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'chalk';
    const npcIs = this.api.npcElementId === 'chalk';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isChalk(owner)) continue;
      this.advanceCursor(owner, delta);
      this.feedSession(owner, time);
      this.updateMasterpiece(owner, time);
    }

    this.expireMarks(time);
    this.updateFuses(time);
    this.updateGround(delta);
    this.updateShields(delta);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintStatic();
    this.paintLive(time);
    this.paintAir(time);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.staticGfx) { this.staticGfx = scene.add.graphics().setDepth(2); this.staticDirty = true; }
    if (!this.liveGfx) this.liveGfx = scene.add.graphics().setDepth(3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /**
   * The NPC has no mouse, so it gets a phantom one. Where it circles is the AI's entire
   * "aim": ward and explosive chalk are scribbled over the target's feet, the blue line is
   * drawn across the ground between the two of them, and the shield is drawn around itself.
   */
  private advanceCursor(owner: Owner, delta: number): void {
    const s = this.side(owner);
    if (owner === 'player') {
      s.curX = this.aimX;
      s.curY = this.aimY;
      return;
    }

    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const target = this.enemyOf(owner);
    const kind = s.session?.kind ?? 'ward';

    let cx = f.x;
    let cy = f.y;
    let radius = 60;
    if (kind === 'shield') {
      radius = SHIELD_RANGE * 0.72;
    } else if (kind === 'green' || kind === 'orange' || kind === 'teal') {
      // Its own masterpiece is painted around its feet, where it will be standing.
      radius = kind === 'orange' && target ? 64 : 52;
      if (kind === 'orange' && target) { cx = target.x; cy = target.y; }
    } else if (kind === 'perma' && target) {
      cx = (f.x + target.x) / 2;
      cy = (f.y + target.y) / 2;
      radius = 72;
    } else if (target) {
      cx = target.x;
      cy = target.y;
      radius = 58;
    }

    s.curAng += (delta / 1000) * 2.6;
    s.curX = Phaser.Math.Clamp(cx + Math.cos(s.curAng) * radius, this.left, this.right);
    s.curY = Phaser.Math.Clamp(cy + Math.sin(s.curAng) * radius * 0.8, this.top, this.bottom);
  }

  /** Lay chalk under whichever cursor this side is driving. */
  private feedSession(owner: Owner, time: number): void {
    const s = this.side(owner);
    const sess = s.session;
    if (!sess) return;

    if (time >= sess.until) {
      s.session = null;
      // Chalk Shield's window closing is what actually builds the shield.
      if (sess.kind === 'shield') this.raiseShield(owner, sess.stroke);
      return;
    }

    // Masterpiece only flows while the button is down. The NPC has no button, so it draws
    // in bursts instead — otherwise it would lay one unbroken ring and nothing else.
    if (sess.requireHold) {
      const drawing = owner === 'player' ? this.holding : (Math.sin(s.curAng * 1.7) > -0.35);
      if (!drawing) { sess.started = false; return; }
    }

    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;

    let x = Phaser.Math.Clamp(s.curX, this.left, this.right);
    let y = Phaser.Math.Clamp(s.curY, this.top, this.bottom);

    // The shield can only be drawn within reach — the cursor is pinned to the ring's edge
    // rather than ignored, so a player sweeping wide still gets a shield out of it.
    if (sess.confined) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
      if (d > SHIELD_RANGE) {
        const a = Math.atan2(y - f.y, x - f.x);
        x = f.x + Math.cos(a) * SHIELD_RANGE;
        y = f.y + Math.sin(a) * SHIELD_RANGE;
      }
    }

    if (sess.started) {
      const moved = Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y);
      if (moved < sess.step) return;
    }

    const isMp = sess.kind === 'green' || sess.kind === 'orange' || sess.kind === 'teal';
    if (isMp && s.mpMarks >= MP_MAX_MARKS) return;

    const linked = sess.started
      && Phaser.Math.Distance.Between(sess.lastX, sess.lastY, x, y) <= LIFT;

    const mark: Mark = {
      owner,
      kind: sess.kind,
      x, y,
      px: sess.lastX,
      py: sess.lastY,
      linked,
      bornAt: time,
      until: isMp ? time + MP_LIFE_MS : 0,
      fuseAt: 0,
      seed: Math.random() * 1000,
      stroke: sess.stroke,
    };

    if (sess.kind === 'ward') {
      mark.fuseAt = time + WARD_FUSE_MS;
    } else if (sess.kind === 'boom') {
      // Every mark in the run knows in advance when its turn comes, counted from the moment
      // the window closes — so the blast walks the line in the order it was drawn.
      const idx = this.marks.filter((m) => m.stroke === sess.stroke).length;
      mark.fuseAt = sess.until + BOOM_FUSE_MS + idx * BOOM_STAGGER_MS;
    }

    this.marks.push(mark);
    if (isMp) s.mpMarks++;
    sess.lastX = x;
    sess.lastY = y;
    sess.started = true;

    if (mark.fuseAt === 0) this.staticDirty = true;
    if (linked) this.fx(owner).lay(mark.px, mark.py, mark.x, mark.y, TONE[mark.kind]);

    this.trimMarks();
  }

  /** Keeps the floor from filling up. The oldest thing that can expire goes first. */
  private trimMarks(): void {
    if (this.marks.length <= MAX_MARKS) return;
    const idx = this.marks.findIndex((m) => m.kind !== 'perma');
    const victim = idx >= 0 ? idx : 0;
    const [gone] = this.marks.splice(victim, 1);
    if (gone && gone.fuseAt === 0) this.staticDirty = true;
    if (gone && (gone.kind === 'green' || gone.kind === 'orange' || gone.kind === 'teal')) {
      this.side(gone.owner).mpMarks = Math.max(0, this.side(gone.owner).mpMarks - 1);
    }
  }

  /** Rubs out one run of chalk — used when Perma-Chalk is redrawn, and when a shield lifts. */
  private eraseStroke(stroke: number, owner: Owner): void {
    const doomed = this.marks.filter((m) => m.stroke === stroke);
    if (!doomed.length) return;
    const fx = this.fx(owner);
    // Only a scattering of puffs, not one per mark — a 40-dab line would be a smoke screen.
    for (let i = 0; i < doomed.length; i += 4) fx.dust(doomed[i].x, doomed[i].y, 2, 12, 420, TONE[doomed[i].kind]);
    this.marks = this.marks.filter((m) => m.stroke !== stroke);
    this.staticDirty = true;
  }

  private expireMarks(time: number): void {
    let removed = false;
    this.marks = this.marks.filter((m) => {
      if (m.until === 0 || time < m.until) return true;
      removed = true;
      if (m.kind === 'green' || m.kind === 'orange' || m.kind === 'teal') {
        const s = this.side(m.owner);
        s.mpMarks = Math.max(0, s.mpMarks - 1);
      }
      return false;
    });
    if (removed) this.staticDirty = true;
  }

  // ── Detonation ─────────────────────────────────────────────────────────────

  private updateFuses(time: number): void {
    if (!this.marks.some((m) => m.fuseAt > 0 && time >= m.fuseAt)) return;
    const going = this.marks.filter((m) => m.fuseAt > 0 && time >= m.fuseAt);
    this.marks = this.marks.filter((m) => !(m.fuseAt > 0 && time >= m.fuseAt));
    for (const m of going) this.detonate(m, time);
  }

  private detonate(m: Mark, time: number): void {
    const radius = m.kind === 'boom' ? BOOM_RADIUS : WARD_RADIUS;
    const damage = m.kind === 'boom' ? BOOM_DAMAGE : WARD_DAMAGE;
    this.fx(m.owner).boom(m.x, m.y, radius, TONE[m.kind]);

    for (const t of this.targetsOf(m.owner)) {
      if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > radius) continue;
      // One blast per body per gate, however many marks overlap them.
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      t.takeDamage(damage);
      this.api.spawnHitFlash(t.x, t.y, TONE[m.kind]);
    }
  }

  // ── Ground chalk (Perma + Masterpiece) ─────────────────────────────────────

  /**
   * Everything standing on chalk. Burn rates are taken as a *maximum* rather than a sum: a
   * dense scribble is a wider trap, not a stronger one, or a two-second doodle would delete
   * anyone who walked through it.
   */
  private updateGround(delta: number): void {
    const dt = delta / 1000;
    const burn = new Map<Fighter, { dps: number; color: number }>();
    this.sides.player.onGreen = false;
    this.sides.player.onTeal = false;
    this.sides.npc.onGreen = false;
    this.sides.npc.onTeal = false;

    for (const m of this.marks) {
      if (m.kind === 'perma' || m.kind === 'orange') {
        const r = m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R;
        const dps = m.kind === 'perma' ? PERMA_DPS : MP_DAMAGE_DPS;
        for (const t of this.targetsOf(m.owner)) {
          if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > r) continue;
          const cur = burn.get(t);
          if (!cur || dps > cur.dps) burn.set(t, { dps, color: TONE[m.kind] });
        }
      } else if (m.kind === 'green' || m.kind === 'teal') {
        // Only the artist gets anything out of their own work.
        const f = this.fighter(m.owner);
        if (!f || !f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) > MP_TOUCH_R) continue;
        if (m.kind === 'green') this.side(m.owner).onGreen = true;
        else this.side(m.owner).onTeal = true;
      }
    }

    for (const [t, b] of burn) {
      if (!t.active || t.hp <= 0) continue;
      const acc = (this.burnAccum.get(t) ?? 0) + b.dps * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        t.takeDamage(whole);
        if (Math.random() < 0.25) this.api.spawnHitFlash(t.x, t.y, b.color);
      }
    }
    // Anything not currently standing on chalk loses its part-tick rather than banking it.
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.onGreen) { s.healAccum = 0; continue; }
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      s.healAccum += MP_HEAL_DPS * dt;
      const whole = Math.floor(s.healAccum);
      if (whole > 0) {
        s.healAccum -= whole;
        f.heal(whole);
      }
    }
  }

  // ── Chalk Shield ───────────────────────────────────────────────────────────

  /** The drawing window has closed — peel that run off the floor and hang it around you. */
  private raiseShield(owner: Owner, stroke: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const drawn = this.marks.filter((m) => m.stroke === stroke);
    this.marks = this.marks.filter((m) => m.stroke !== stroke);
    this.staticDirty = true;

    if (!drawn.length || !f || !f.active) {
      s.shieldHp = 0;
      this.api.showFloatingText(f?.x ?? 0, (f?.y ?? 0) - 44, 'Nothing drawn', '#8a8a8a');
      return;
    }

    s.shieldNodes = drawn.map((m) => ({
      ang: Math.atan2(m.y - f.y, m.x - f.x),
      dist: Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y), SHIELD_MIN_DIST, SHIELD_RANGE),
      seed: m.seed,
    }));
    this.installAbsorber(owner);
    this.fx(owner).ring(f.x, f.y, SHIELD_RANGE, SHIELD_RANGE * 0.72, CHK.white, 380);
    this.api.showFloatingText(f.x, f.y - 46, `🛡️ SHIELD ${SHIELD_HP}`, this.hex(CHK.white));
  }

  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorberInstalled) return;
    s.savedAbsorber = f.damageAbsorber;
    s.absorberInstalled = true;
    // Looked up through `this.side` rather than captured, so a match restart that rebuilds
    // the side objects can never leave a live closure pointing at a dead shield.
    f.damageAbsorber = (amount: number) => {
      const st = this.side(owner);
      if (st.shieldHp <= 0 || !st.shieldNodes.length) return false;
      st.shieldHp -= amount;
      this.chipShield(owner);
      this.api.showFloatingText(f.x, f.y - 52, `🛡️ ${Math.max(0, Math.round(st.shieldHp))}`, this.hex(CHK.white));
      if (st.shieldHp <= 0) this.breakShield(owner, true);
      return true;
    };
  }

  /** Knock a piece off the shield — the visible cost of having absorbed something. */
  private chipShield(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.shieldNodes.length || !f) return;
    // Nodes go as the pool does, so a shield at 20% actually looks like one.
    const want = Math.max(1, Math.round((s.shieldNodes.length * Math.max(0, s.shieldHp)) / SHIELD_HP));
    while (s.shieldNodes.length > want) {
      const i = Math.floor(Math.random() * s.shieldNodes.length);
      const [n] = s.shieldNodes.splice(i, 1);
      const a = n.ang + s.shieldSpin;
      this.fx(owner).snap(f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, CHK.white);
    }
  }

  private breakShield(owner: Owner, announce: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (f && s.shieldNodes.length) {
      for (const n of s.shieldNodes) {
        const a = n.ang + s.shieldSpin;
        this.fx(owner).snap(f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, CHK.white);
      }
    }
    s.shieldNodes = [];
    s.shieldHp = 0;
    if (f && s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
    s.absorberInstalled = false;
    s.savedAbsorber = null;
    if (announce && f) this.api.showFloatingText(f.x, f.y - 48, '🛡️ SHIELD BROKEN', '#cfc9b8');
  }

  private updateShields(delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.shieldNodes.length) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) { this.breakShield(owner, false); continue; }

      s.shieldSpin += dt * SHIELD_SPIN;
      const reach = s.shieldNodes.reduce((m, n) => Math.max(m, n.dist), 0);

      // ── Shots die on it ──
      // Snapshotted: `destroy()` splices the group's live array, which would make a plain
      // walk skip whatever followed the shot that was just eaten.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, proj.x, proj.y) > reach + SHIELD_NODE_R) continue;
        const hit = s.shieldNodes.find((n) => {
          const a = n.ang + s.shieldSpin;
          return Phaser.Math.Distance.Between(
            f.x + Math.cos(a) * n.dist, f.y + Math.sin(a) * n.dist, proj.x, proj.y,
          ) <= SHIELD_NODE_R;
        });
        if (!hit) continue;
        const a = hit.ang + s.shieldSpin;
        this.fx(owner).snap(f.x + Math.cos(a) * hit.dist, f.y + Math.sin(a) * hit.dist, CHK.white);
        this.api.spawnHitFlash(proj.x, proj.y, CHK.white);
        proj.destroy();
        s.shieldHp -= SHIELD_PROJ_COST;
        this.chipShield(owner);
        if (s.shieldHp <= 0) { this.breakShield(owner, true); break; }
      }
      if (!s.shieldNodes.length) continue;

      // ── Bodies bounce off it ──
      const wall = reach + SHIELD_PUSH_PAD;
      let grinding = false;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d >= wall) continue;
        grinding = true;
        const a = Math.atan2(t.y - f.y, t.x - f.x);
        t.setPosition(f.x + Math.cos(a) * wall, f.y + Math.sin(a) * wall);
        this.body(t).stop();
      }
      if (grinding) {
        s.shieldGrindAccum += SHIELD_PUSH_DPS * dt;
        const whole = Math.floor(s.shieldGrindAccum);
        if (whole > 0) {
          s.shieldGrindAccum -= whole;
          s.shieldHp -= whole;
          this.chipShield(owner);
          if (s.shieldHp <= 0) this.breakShield(owner, true);
        }
      } else {
        s.shieldGrindAccum = 0;
      }
    }
  }

  // ── Masterpiece ────────────────────────────────────────────────────────────

  private updateMasterpiece(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!s.mpOn || time < s.mpUntil) return;
    s.mpOn = false;
    const f = this.fighter(owner);
    if (f) f.isInvincible = s.mpSavedInvincible;
    if (s.session && (s.session.kind === 'green' || s.session.kind === 'orange' || s.session.kind === 'teal')) {
      s.session = null;
    }
    if (f) {
      this.fx(owner).dust(f.x, f.y, 10, 40, 620, CHK.dust);
      this.api.showFloatingText(f.x, f.y - 48, '🖼️ FINISHED', this.hex(CHK.teal));
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      if (!this.playerAvatar) this.playerAvatar = new ChalkAvatar(scene, this.pcol);
      const s = this.sides.player;
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setChalk(this.heldChalk('player'));
      this.playerAvatar.setDrawing(!!s.session && (!s.session.requireHold || this.holding));
      this.playerAvatar.setIntensity(s.mpOn ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      if (!this.npcAvatar) this.npcAvatar = new ChalkAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(s.curY - f.y, s.curX - f.x));
      this.npcAvatar.setChalk(this.heldChalk('npc'));
      this.npcAvatar.setDrawing(!!s.session);
      this.npcAvatar.setIntensity(s.mpOn ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Chalk that is just lying there. Only redrawn when the set actually changes. */
  private paintStatic(): void {
    const g = this.staticGfx;
    if (!g || !this.staticDirty) return;
    this.staticDirty = false;
    g.clear();
    for (const m of this.marks) {
      if (m.fuseAt !== 0) continue;
      this.paintMark(g, m, 1);
    }
  }

  /** Chalk with a fuse burning — few, brief, and it has to be seen counting down. */
  private paintLive(time: number): void {
    const g = this.liveGfx;
    if (!g) return;
    g.clear();
    for (const m of this.marks) {
      if (m.fuseAt === 0) continue;
      // Brightens as its turn approaches, so a red line visibly runs hot from one end.
      const left = m.fuseAt - time;
      const near = Phaser.Math.Clamp(1 - left / (m.kind === 'boom' ? 900 : WARD_FUSE_MS), 0, 1);
      const pulse = 0.75 + 0.25 * Math.sin(this.vizT * 22 + m.seed);
      this.paintMark(g, m, 0.75 + near * 0.25);
      if (near > 0.45) {
        const gg = g;
        gg.fillStyle(this.col(m.owner)(CHK.spark), (near - 0.45) * 1.5 * pulse);
        gg.fillCircle(m.x, m.y, 2 + near * 3);
      }
    }
  }

  private paintMark(g: Phaser.GameObjects.Graphics, m: Mark, alpha: number): void {
    const tint = this.col(m.owner);
    const color = TONE[m.kind];
    // A run reads as one line; a lone dab reads as a dot. Both are chalk, neither is a shape.
    if (m.linked) chalkLine(g, tint, m.px, m.py, m.x, m.y, 3, color, alpha, m.seed);
    else chalkBlob(g, tint, m.x, m.y, 2.6, color, alpha, m.seed);
  }

  /** The shield in orbit, and the ring you are allowed to draw it inside. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isChalk(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const tint = this.col(owner);

      // Drawing area — a dashed hand-drawn ring, cheap enough to run every frame.
      if (s.session?.confined) {
        const fade = Phaser.Math.Clamp((s.session.until - time) / 260, 0, 1);
        const dashes = 22;
        for (let i = 0; i < dashes; i++) {
          if (grain(i * 3.3, 1) > 0.82) continue;
          const a0 = (i / dashes) * Math.PI * 2 + this.vizT * 0.5;
          const a1 = a0 + (Math.PI * 2 / dashes) * 0.62;
          g.lineStyle(2, tint(CHK.white), 0.5 * fade);
          g.lineBetween(
            f.x + Math.cos(a0) * SHIELD_RANGE, f.y + Math.sin(a0) * SHIELD_RANGE,
            f.x + Math.cos(a1) * SHIELD_RANGE, f.y + Math.sin(a1) * SHIELD_RANGE,
          );
        }
      }

      // The shield itself: every surviving node, joined into a ragged ring.
      if (!s.shieldNodes.length) continue;
      const ratio = Phaser.Math.Clamp(s.shieldHp / SHIELD_HP, 0, 1);
      let prevX = 0;
      let prevY = 0;
      s.shieldNodes.forEach((n, i) => {
        const a = n.ang + s.shieldSpin;
        const wob = 1 + Math.sin(this.vizT * 3 + n.seed) * 0.03;
        const nx = f.x + Math.cos(a) * n.dist * wob;
        const ny = f.y + Math.sin(a) * n.dist * wob;
        if (i > 0 && Phaser.Math.Distance.Between(prevX, prevY, nx, ny) < 74) {
          chalkLine(g, tint, prevX, prevY, nx, ny, 3, CHK.white, 0.45 + ratio * 0.45, n.seed);
        }
        chalkBlob(g, tint, nx, ny, 3.4, CHK.white, 0.55 + ratio * 0.45, n.seed);
        prevX = nx;
        prevY = ny;
      });
    }
  }

  /** Chalk in hand, what is on the floor, and the shield's remaining board. */
  private paintHud(playerIsChalk: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsChalk) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const x = this.left + 8;
    const y = this.top + 8;
    const held = this.heldChalk('player');

    g.fillStyle(0x05070a, 0.85);
    g.fillRoundedRect(x - 4, y - 4, 176, 34, 4);
    g.lineStyle(1.5, this.pcol(held), 0.7);
    g.strokeRoundedRect(x - 4, y - 4, 176, 34, 4);

    // The stick currently in hand, then the three Masterpiece colours as a palette.
    chalkStick(g, this.pcol, x + 16, y + 13, -0.5, 26, held, 1);
    const palette: ('green' | 'orange' | 'teal')[] = ['green', 'orange', 'teal'];
    palette.forEach((k, i) => {
      const px = x + 118 + i * 18;
      const on = s.mpOn && s.mpChalk === k;
      chalkStick(g, this.pcol, px, y + 13, -1.2, on ? 22 : 15, TONE[k], s.mpOn ? (on ? 1 : 0.4) : 0.22);
    });

    // Shield board, only while there is one.
    if (s.shieldNodes.length) {
      const w = 176;
      const by = y + 36;
      g.fillStyle(0x05070a, 0.85);
      g.fillRoundedRect(x - 4, by - 3, w, 12, 3);
      g.fillStyle(this.pcol(CHK.slate), 0.9);
      g.fillRect(x, by, w - 8, 6);
      g.fillStyle(this.pcol(CHK.white), 1);
      g.fillRect(x, by, (w - 8) * Phaser.Math.Clamp(s.shieldHp / SHIELD_HP, 0, 1), 6);
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x + 34, y + 6, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f4f1e6',
        stroke: '#05070a',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    const perma = this.marks.filter((m) => m.owner === 'player' && m.kind === 'perma').length;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      s.mpOn ? `${LABEL[s.mpChalk]}\nHOLD LMB · E/R/F` : `${s.session ? LABEL[s.session.kind] : 'CHALK'}\nPERMA ${perma}`,
    );
    this.hudLabel.setColor(this.hex(held));
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsChalk: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('chalk-drawing', playerIsChalk && s.session ? {
      name: `${LABEL[s.session.kind]} chalk`, emoji: '🖍️', color: TONE[s.session.kind],
      description: 'Your cursor is laying chalk. Where you move the mouse is where the chalk goes.',
      until: s.session.until, priority: 118,
    } : null);

    this.api.setStatusIndicator('chalk-masterpiece', playerIsChalk && s.mpOn ? {
      name: 'Masterpiece', emoji: '🎨', color: CHK.teal,
      description: 'Untouchable while it lasts. Hold the mouse to draw and press E, R or F to change chalk.',
      until: s.mpUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('chalk-shield', playerIsChalk && s.shieldNodes.length > 0 ? {
      name: 'Chalk Shield', emoji: '🛡️', color: CHK.white,
      description: 'A ring of chalk turning around you. It eats shots, hits and anything that walks into it until its board runs out.',
      count: Math.max(0, Math.round(s.shieldHp)), suffix: ' HP', priority: 104,
    } : null);

    this.api.setStatusIndicator('chalk-teal', playerIsChalk && s.onTeal ? {
      name: 'Teal Chalk', emoji: '💨', color: CHK.teal,
      description: `Standing on your own teal — ${Math.round((MP_SPEED_MULT - 1) * 100)}% faster while you stay on it.`,
      priority: 122,
    } : null);

    this.api.setStatusIndicator('chalk-green', playerIsChalk && s.onGreen ? {
      name: 'Green Chalk', emoji: '💚', color: CHK.green,
      description: `Standing on your own green — ${MP_HEAL_DPS} HP a second while you stay on it.`,
      priority: 123,
    } : null);

    // The victim side: whatever hostile chalk the local player is currently standing in.
    const burning = this.marks.some((m) => (m.kind === 'perma' || m.kind === 'orange')
      && m.owner === 'npc'
      && Phaser.Math.Distance.Between(m.x, m.y, this.api.player.x, this.api.player.y)
        <= (m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R));
    this.api.setStatusIndicator('chalk-burn', burning ? {
      name: 'On Their Chalk', emoji: '🔥', color: CHK.orange,
      description: 'You are standing on somebody else\'s chalk, and it is taking it out of you. Step off it.',
      priority: 16,
    } : null);

    void time;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** Teal chalk is the element's only movement effect. Pulled by ArenaScene, not pushed. */
  private speedMultFor(owner: Owner): number {
    return this.isChalk(owner) && this.side(owner).onTeal ? MP_SPEED_MULT : 1;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** True while a side has a drawing window open — the AI must not start a second one. */
  isDrawing(owner: Owner): boolean { return !!this.side(owner).session; }

  getShieldHp(owner: Owner): number { return this.side(owner).shieldHp; }

  isMasterpieceActive(owner: Owner): boolean { return this.side(owner).mpOn; }

  /** Whether this side has a blue line down, so the AI redraws rather than duplicates. */
  hasPerma(owner: Owner): boolean {
    const stroke = this.side(owner).permaStroke;
    return stroke >= 0 && this.marks.some((m) => m.stroke === stroke);
  }

  /** AI pacing gate — the blue line is not worth redrawing every time R comes back up. */
  mayRedrawPerma(owner: Owner, time: number): boolean {
    const s = this.side(owner);
    if (time < s.nextPermaAt) return false;
    s.nextPermaAt = time + 9000;
    return true;
  }

  /**
   * Ability tray fill. Chalk's cards spend most of their time showing something other than a
   * cooldown: a window counting down while it is being drawn, a shield's remaining board, or
   * the Masterpiece's own clock.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;

    if (abilityId === 'chalk-shield' && s.shieldNodes.length) {
      return Phaser.Math.Clamp(s.shieldHp / SHIELD_HP, 0, 1);
    }
    if (abilityId === 'chalk-masterpiece' && s.mpOn) {
      return Phaser.Math.Clamp((s.mpUntil - time) / MP_MS, 0, 1);
    }
    if (abilityId === 'chalk-perma' && this.hasPerma('player') && !s.session) return 1;

    const sess = s.session;
    if (sess) {
      const total = sess.kind === 'ward' ? WARD_DRAW_MS
        : sess.kind === 'boom' ? BOOM_DRAW_MS
          : sess.kind === 'perma' ? PERMA_DRAW_MS
            : sess.kind === 'shield' ? SHIELD_DRAW_MS : MP_MS;
      const owns = (abilityId === 'chalk-ward' && sess.kind === 'ward')
        || (abilityId === 'chalk-explosive' && sess.kind === 'boom')
        || (abilityId === 'chalk-perma' && sess.kind === 'perma')
        || (abilityId === 'chalk-shield' && sess.kind === 'shield');
      if (owns) return Phaser.Math.Clamp((sess.until - time) / total, 0, 1);
    }

    return p.getCooldownRatio(abilityId);
  }
}
