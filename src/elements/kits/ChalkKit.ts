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
export type ChalkKind = 'ward' | 'boom' | 'perma' | 'shield' | 'green' | 'orange' | 'teal' | 'crimson';

/** The Masterpiece palette. Crimson is only ever in it with the Prodigy upgrade. */
type MpKind = 'green' | 'orange' | 'teal' | 'crimson';

/** The three sticks a Supreme Shield may be drawn with. */
type ShieldKind = 'shield' | 'boom' | 'perma';

const MP_KINDS: MpKind[] = ['green', 'orange', 'teal', 'crimson'];

function isMpKind(kind: ChalkKind): kind is MpKind {
  return kind === 'green' || kind === 'orange' || kind === 'teal' || kind === 'crimson';
}

const TONE: Record<ChalkKind, number> = {
  ward: CHK.white,
  boom: CHK.red,
  perma: CHK.blue,
  shield: CHK.white,
  green: CHK.green,
  orange: CHK.orange,
  teal: CHK.teal,
  crimson: CHK.crimson,
};

const LABEL: Record<ChalkKind, string> = {
  ward: 'WARD', boom: 'EXPLOSIVE', perma: 'PERMA', shield: 'SHIELD',
  green: 'GREEN — HEAL', orange: 'ORANGE — BURN', teal: 'TEAL — SPEED',
  crimson: 'CRIMSON — POWER',
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
/**
 * Counted from the moment the drawing window closes, not from each dab — the whole white run
 * goes up in one flash. That single sheet of white is the thing that tells Ward apart from
 * Explosive Chalk, which walks the same idea down the line one mark at a time.
 */
const WARD_FUSE_MS = 500;
const WARD_DAMAGE = 10;
/** Each further white mark covering the same body, so scribbling over their feet is worth it. */
const WARD_STACK_DAMAGE = 5;
const WARD_MAX_STACKS = 5;
const WARD_RADIUS = 34;
/** Bursts are thinned to this spacing — a hundred at once in one frame is a white screen. */
const WARD_BOOM_SPACING = 30;
const WARD_BOOM_MAX = 16;

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
const PERMA_DPS = 30;
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

// ── Chalk Debris (Click+) ────────────────────────────────────────────────────
/** Clouds left standing where a ward went up. Few and wide rather than one per mark. */
const DEBRIS_MAX = 4;
const DEBRIS_RADIUS = 56;
const DEBRIS_MS = 4000;
/** What breathing a lungful of it costs. */
const DEBRIS_SLOW = 0.62;
/** …and what it costs to be hit by any chalk at all while standing in one. */
const DEBRIS_AMP = 1.5;

// ── Explosive Release (E+) ───────────────────────────────────────────────────
const RELEASE_DAMAGE = 25;
/** How near the line has to come back to an earlier part of itself to have closed. */
const RELEASE_CLOSE_DIST = 34;
/** Marks that must lie between the two ends, so a stroke doubling back is not a loop. */
const RELEASE_MIN_SPAN = 8;
/** Enclosing less floor than this is an accident, not a plan. */
const RELEASE_MIN_AREA = 3500;

// ── Perma-Block (R+) ─────────────────────────────────────────────────────────
/** How close a shot must pass to the blue line to be rubbed out by it. */
const PERMA_BLOCK_R = 20;

// ── Supreme Shield (F+) ──────────────────────────────────────────────────────
const SHIELD_DRAW_SUPREME_MS = 2500;
/** A shield drawn entirely in blue, against one drawn entirely in white. */
const SUPREME_PERMA_HP_MULT = 2.5;
/** Payback for touching a shield drawn entirely in red, per hit it takes. */
const SUPREME_BOOM_DAMAGE = 14;

// ── Prodigy (Q+) ─────────────────────────────────────────────────────────────
/** Crimson under your feet, and crimson-enhanced Perma-Chalk under your feet. */
const PRODIGY_BOOST = 1.5;
/** What an orange-enhanced blue line adds to its burn. */
const PRODIGY_PERMA_DPS = 2;

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

/**
 * Chalk Debris — a cloud of dust hanging where a ward went up. It belongs to whoever drew the
 * ward, and does nothing at all to them.
 */
interface Cloud {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  seed: number;
}

/**
 * Explosive Release — the floor a closed red line drew a box around, waiting for the line to
 * finish running before it goes with it. The polygon is snapshotted at the moment the window
 * closes, because the marks that defined it are about to detonate and be deleted.
 */
interface AreaBlast {
  owner: Owner;
  poly: Phaser.Geom.Point[];
  at: number;
}

/** A live drawing window: the cursor is laying `kind` until `until`. */
interface Session {
  kind: ChalkKind;
  until: number;
  /** How long the window was opened for — the ability tray reads its own clock off this. */
  total: number;
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
  /** Which stick drew it. Always 'shield' without the Supreme Shield upgrade. */
  kind: ShieldKind;
}

interface Side {
  owner: Owner;
  session: Session | null;
  /** Stroke id of the blue line currently on the floor, or −1 when there is none. */
  permaStroke: number;
  shieldHp: number;
  /** What this shield started at — blue pieces raise it, so it is not a constant. */
  shieldMax: number;
  /** Fraction of the shield drawn in red, which is what payback is scaled by. */
  shieldBoom: number;
  shieldNodes: ShieldNode[];
  shieldSpin: number;
  shieldGrindAccum: number;
  savedAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;
  mpUntil: number;
  mpOn: boolean;
  mpChalk: MpKind;
  mpSavedInvincible: boolean;
  mpMarks: number;
  /** Prodigy: how much of each colour went into the Masterpiece being drawn. */
  mpTally: Record<MpKind, number>;
  /** Prodigy: what the last finished Masterpiece left the blue line doing. */
  permaEnhance: MpKind | null;
  healAccum: number;
  /** True this frame if the owner is standing on their own teal. */
  onTeal: boolean;
  onGreen: boolean;
  /** Prodigy — standing on your own crimson, or on a crimson-enhanced blue line. */
  onCrimson: boolean;
  /** True this frame if the owner is standing on their own blue line. */
  onPerma: boolean;
  /** The NPC's phantom cursor — it has no mouse, so one is drawn for it. */
  curAng: number;
  curX: number;
  curY: number;
  /** Pacing gate so the AI does not redraw its blue line every time it comes off cooldown. */
  nextPermaAt: number;
}

/** Shoelace area of a closed run of marks — how much floor a red loop actually shut in. */
function polyArea(poly: Phaser.Geom.Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    session: null,
    permaStroke: -1,
    shieldHp: 0,
    shieldMax: SHIELD_HP,
    shieldBoom: 0,
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
    mpTally: { green: 0, orange: 0, teal: 0, crimson: 0 },
    permaEnhance: null,
    healAccum: 0,
    onTeal: false,
    onGreen: false,
    onCrimson: false,
    onPerma: false,
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
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded chalk reproduces on this sim. */
  hasNpcUpgrade(slot: string): boolean;
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
  /** Chalk Debris — dust hanging where a ward went up. */
  private clouds: Cloud[] = [];
  /** Explosive Release — floor a closed red line has boxed in, waiting on the line. */
  private areaBlasts: AreaBlast[] = [];
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

  /**
   * Whether this side is drawing with the given shop upgrade equipped. The NPC only has any
   * online, where the slots come off the opponent's handshake.
   */
  private up(owner: Owner, slot: string): boolean {
    if (!this.isChalk(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /**
   * Everything that scales a point of chalk damage, in one place: what the caster is standing
   * on (Prodigy) and what the victim is standing in (Chalk Debris). Every damage source in the
   * element goes through here, so the two upgrades stack the same way whatever landed the hit.
   */
  private chalkDamageMult(owner: Owner, target: Fighter): number {
    return this.outgoingMult(owner) * this.debrisAmp(owner, target);
  }

  /** Prodigy — crimson under the artist's own feet, direct or by way of the blue line. */
  private outgoingMult(owner: Owner): number {
    const s = this.side(owner);
    return s.onCrimson ? PRODIGY_BOOST : 1;
  }

  /** Chalk Debris — a body standing in this side's dust takes chalk harder. */
  private debrisAmp(owner: Owner, target: Fighter): number {
    return this.inCloud(owner, target.x, target.y) ? DEBRIS_AMP : 1;
  }

  private inCloud(owner: Owner, x: number, y: number): boolean {
    return this.clouds.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, x, y) <= DEBRIS_RADIUS);
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
    this.clouds = [];
    this.areaBlasts = [];
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
      // Prodigy adds a fourth stick, and Q is the one key going spare while the work is up.
      if (this.up('player', 'q') && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
        this.pickChalk('player', 'crimson');
      }
      return;
    }

    // Supreme Shield: two and a half seconds is long enough to be worth changing stick
    // part-way through, so the shield window keeps the keyboard instead of swallowing it.
    if (s.session?.confined && this.up('player', 'f')) {
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.pickShieldChalk('player', 'boom');
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.pickShieldChalk('player', 'perma');
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.pickShieldChalk('player', 'shield');
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

  /**
   * Supreme Shield — change the stick mid-draw. The stroke id is deliberately kept: the whole
   * window is lifted off the floor by stroke when it closes, so a shield drawn in three
   * colours has to stay one run.
   */
  private pickShieldChalk(owner: Owner, kind: ShieldKind): void {
    const s = this.side(owner);
    if (!s.session || s.session.kind === kind) return;
    s.session.kind = kind;
    s.session.started = false;
    const f = this.fighter(owner);
    this.avatar(owner)?.setChalk(TONE[kind]);
    this.fx(owner).dust(f.x, f.y - 8, 5, 18, 420, TONE[kind]);
    this.api.showFloatingText(f.x, f.y - 46, `🛡️ ${LABEL[kind]}`, this.hex(TONE[kind]));
  }

  /** Swap the stick in hand mid-Masterpiece. Each swap starts a fresh run of chalk. */
  private pickChalk(owner: Owner, kind: MpKind): void {
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

  /** Click — Chalk Ward. A second of white, then all of it at once half a second later. */
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
    this.api.showFloatingText(f.x, f.y - 44, '💣 FUSE LAID', this.hex(CHK.red));
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
    const supreme = this.up(owner, 'f');
    if (s.shieldNodes.length) this.breakShield(owner, false);
    this.openSession(owner, 'shield', supreme ? SHIELD_DRAW_SUPREME_MS : SHIELD_DRAW_MS, true, false, STEP);
    s.shieldHp = SHIELD_HP;
    s.shieldMax = SHIELD_HP;
    s.shieldBoom = 0;
    s.shieldSpin = 0;
    s.shieldGrindAccum = 0;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 16, SHIELD_RANGE, CHK.white, 460);
    this.api.showFloatingText(f.x, f.y - 46,
      supreme ? '🛡️ DRAW IT — E/R/F' : '🛡️ DRAW YOUR SHIELD', this.hex(CHK.white));
  }

  /** Q — Masterpiece. Eight seconds where nothing can touch you and everything is a colour. */
  doMasterpiece(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.mpUntil = this.now + MP_MS;
    s.mpChalk = 'green';
    s.mpMarks = 0;
    // Prodigy — a new work starts a fresh count, and whatever the last one taught the blue
    // line is forgotten the moment this one begins rather than when it finishes.
    s.mpTally = { green: 0, orange: 0, teal: 0, crimson: 0 };
    s.permaEnhance = null;
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
      total: ms,
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
    this.updateClouds(time);
    this.updateFooting();
    this.updateFuses(time);
    this.updateAreaBlasts(time);
    this.updateGround(delta);
    this.updatePermaBlock();
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
    if (s.session?.confined) {
      radius = SHIELD_RANGE * 0.72;
    } else if (isMpKind(kind)) {
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
      // Chalk Shield's window closing is what actually builds the shield. `confined` rather
      // than the kind, because a Supreme Shield may have been finished in red or blue.
      if (sess.confined) this.raiseShield(owner, sess.stroke);
      // Explosive Release works out what the line boxed in now, while the marks that drew it
      // are all still on the floor — in a second they will have gone off and been deleted.
      else if (sess.kind === 'boom' && this.up(owner, 'e')) this.armEnclosure(owner, sess);
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

    const isMp = isMpKind(sess.kind);
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

    // A Supreme Shield drawn in red is a shield, not a minefield: chalk inside the ring is
    // about to be lifted off the floor, so nothing laid there is given a fuse.
    if (sess.confined) {
      /* no fuse — the whole run comes up when the window closes */
    } else if (sess.kind === 'ward') {
      // Every dab of the run shares one detonation time, so it all goes at once however long
      // ago it was laid — the first mark waits for the last.
      mark.fuseAt = sess.until + WARD_FUSE_MS;
    } else if (sess.kind === 'boom') {
      // Every mark in the run knows in advance when its turn comes, counted from the moment
      // the window closes — so the blast walks the line in the order it was drawn.
      const idx = this.marks.filter((m) => m.stroke === sess.stroke).length;
      mark.fuseAt = sess.until + BOOM_FUSE_MS + idx * BOOM_STAGGER_MS;
    }

    this.marks.push(mark);
    if (isMp) {
      s.mpMarks++;
      // Prodigy reads the finished work by counting what went into it, mark for mark.
      s.mpTally[sess.kind as MpKind]++;
    }
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
    if (gone && isMpKind(gone.kind)) {
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
      if (isMpKind(m.kind)) {
        const s = this.side(m.owner);
        s.mpMarks = Math.max(0, s.mpMarks - 1);
      }
      return false;
    });
    if (removed) this.staticDirty = true;
  }

  /** Chalk Debris settles on its own clock — nothing rubs a cloud out early. */
  private updateClouds(time: number): void {
    if (this.clouds.length) this.clouds = this.clouds.filter((c) => time < c.until);
  }

  // ── Detonation ─────────────────────────────────────────────────────────────

  private updateFuses(time: number): void {
    if (!this.marks.some((m) => m.fuseAt > 0 && time >= m.fuseAt)) return;
    const going = this.marks.filter((m) => m.fuseAt > 0 && time >= m.fuseAt);
    this.marks = this.marks.filter((m) => !(m.fuseAt > 0 && time >= m.fuseAt));

    // Explosive chalk runs the line a mark at a time, so each of its blasts is resolved on its
    // own. A ward is one sheet going up together, so the whole run is resolved as a single hit
    // — otherwise the blast gate would throw away every mark but the first.
    const salvos = new Map<number, Mark[]>();
    for (const m of going) {
      if (m.kind !== 'ward') { this.detonate(m, time); continue; }
      const run = salvos.get(m.stroke);
      if (run) run.push(m);
      else salvos.set(m.stroke, [m]);
    }
    for (const run of salvos.values()) this.detonateWard(run, time);
  }

  /** One link of a red line going up. Wards never come through here — see `detonateWard`. */
  private detonate(m: Mark, time: number): void {
    this.fx(m.owner).boom(m.x, m.y, BOOM_RADIUS, TONE[m.kind]);

    for (const t of this.targetsOf(m.owner)) {
      if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > BOOM_RADIUS) continue;
      // One blast per body per gate, however many marks overlap them.
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      t.takeDamage(Math.round(BOOM_DAMAGE * this.chalkDamageMult(m.owner, t)));
      this.api.spawnHitFlash(t.x, t.y, TONE[m.kind]);
    }
  }

  /**
   * One white run going off as a single blast. A body caught by it is hit once, for more the
   * deeper into the scribble it was standing — so Ward rewards drawing tightly over someone's
   * feet, where Explosive Chalk rewards drawing a long line across where they are headed.
   */
  private detonateWard(run: Mark[], time: number): void {
    const owner = run[0].owner;
    const fx = this.fx(owner);

    // Thin the bursts out rather than firing one per dab — the whole run flashes in one frame.
    const shown: Mark[] = [];
    for (const m of run) {
      if (shown.length >= WARD_BOOM_MAX) break;
      if (shown.some((s) => Phaser.Math.Distance.Between(s.x, s.y, m.x, m.y) < WARD_BOOM_SPACING)) continue;
      shown.push(m);
    }
    for (const m of shown) fx.boom(m.x, m.y, WARD_RADIUS, TONE.ward);

    for (const t of this.targetsOf(owner)) {
      let covered = 0;
      for (const m of run) {
        if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) <= WARD_RADIUS) covered++;
      }
      if (covered === 0) continue;
      if (time < (this.blastGate.get(t) ?? 0)) continue;
      this.blastGate.set(t, time + BLAST_GATE_MS);
      const stacks = Math.min(covered, WARD_MAX_STACKS);
      const base = WARD_DAMAGE + (stacks - 1) * WARD_STACK_DAMAGE;
      t.takeDamage(Math.round(base * this.chalkDamageMult(owner, t)));
      this.api.spawnHitFlash(t.x, t.y, TONE.ward);
      if (stacks > 1) {
        this.api.showFloatingText(t.x, t.y - 54, `💥 WARD ×${stacks}`, this.hex(CHK.white));
      }
    }

    // Chalk Debris — what the ward leaves behind after the flash.
    if (this.up(owner, 'click')) this.layDebris(owner, shown, time);
  }

  /**
   * Chalk Debris — the dust a ward throws up, hanging over the ground it just cleared. Seeded
   * from the thinned burst list so the clouds sit along the run rather than in a heap, and
   * spread across it rather than crowding its first few marks.
   */
  private layDebris(owner: Owner, shown: Mark[], time: number): void {
    if (!shown.length) return;
    const step = Math.max(1, Math.ceil(shown.length / DEBRIS_MAX));
    const fx = this.fx(owner);
    let laid = 0;
    for (let i = 0; i < shown.length && laid < DEBRIS_MAX; i += step) {
      const m = shown[i];
      this.clouds.push({ owner, x: m.x, y: m.y, until: time + DEBRIS_MS, seed: m.seed });
      fx.dust(m.x, m.y, 9, DEBRIS_RADIUS * 0.8, 900, CHK.dust);
      laid++;
    }
    const f = this.fighter(owner);
    if (f) this.api.showFloatingText(f.x, f.y - 52, `🌫️ DEBRIS ×${laid}`, this.hex(CHK.dust));
  }

  // ── Explosive Release ──────────────────────────────────────────────────────

  /**
   * Work out whether the red line came back to itself, and if it did, arm the ground it shut
   * in. Timed to land just after the last mark of the run goes off, so the shape is read as
   * the line's own conclusion rather than as a second, separate explosion.
   */
  private armEnclosure(owner: Owner, sess: Session): void {
    const run = this.marks.filter((m) => m.stroke === sess.stroke);
    if (run.length < RELEASE_MIN_SPAN + 2) return;

    // The biggest loop the line made, not the first — a scribble that closes twice should
    // blow up the whole shape, not the little knot it happened to tie first.
    let best: Phaser.Geom.Point[] | null = null;
    let bestArea = RELEASE_MIN_AREA;
    for (let j = run.length - 1; j >= RELEASE_MIN_SPAN; j--) {
      for (let i = 0; i <= j - RELEASE_MIN_SPAN; i++) {
        // Cheap test first: only pairs that actually meet are worth measuring.
        if (Phaser.Math.Distance.Between(run[i].x, run[i].y, run[j].x, run[j].y) > RELEASE_CLOSE_DIST) continue;
        const poly = run.slice(i, j + 1).map((m) => new Phaser.Geom.Point(m.x, m.y));
        const area = polyArea(poly);
        if (area > bestArea) { bestArea = area; best = poly; }
      }
    }
    if (!best) return;

    this.areaBlasts.push({
      owner,
      poly: best,
      at: sess.until + BOOM_FUSE_MS + run.length * BOOM_STAGGER_MS,
    });
    const f = this.fighter(owner);
    if (f) this.api.showFloatingText(f.x, f.y - 52, '⭕ CLOSED', this.hex(CHK.red));
  }

  private updateAreaBlasts(time: number): void {
    if (!this.areaBlasts.length) return;
    const going = this.areaBlasts.filter((a) => time >= a.at);
    if (!going.length) return;
    this.areaBlasts = this.areaBlasts.filter((a) => time < a.at);
    for (const a of going) this.fireEnclosure(a, time);
  }

  private fireEnclosure(blast: AreaBlast, time: number): void {
    const fx = this.fx(blast.owner);
    const poly = new Phaser.Geom.Polygon(blast.poly);

    // The shape goes up as itself: a burst on the outline, then the middle lifting.
    const stride = Math.max(1, Math.floor(blast.poly.length / 10));
    for (let i = 0; i < blast.poly.length; i += stride) {
      fx.boom(blast.poly[i].x, blast.poly[i].y, BOOM_RADIUS * 0.7, CHK.red, 380);
    }
    let cx = 0;
    let cy = 0;
    for (const p of blast.poly) { cx += p.x; cy += p.y; }
    cx /= blast.poly.length;
    cy /= blast.poly.length;
    fx.ring(cx, cy, 12, 120, CHK.redDeep, 520);
    fx.dust(cx, cy, 16, 130, 900, CHK.red);

    for (const t of this.targetsOf(blast.owner)) {
      if (!poly.contains(t.x, t.y)) continue;
      // Deliberately not gated: the line's own blasts fired moments ago, and the shape is one
      // hit by construction. It stamps the gate on the way out so nothing double-dips it.
      this.blastGate.set(t, time + BLAST_GATE_MS);
      t.takeDamage(Math.round(RELEASE_DAMAGE * this.chalkDamageMult(blast.owner, t)));
      this.api.spawnHitFlash(t.x, t.y, CHK.red);
      this.api.showFloatingText(t.x, t.y - 54, '⭕ ENCLOSED', this.hex(CHK.red));
    }
  }

  /**
   * What each artist is standing on. Runs before anything that deals damage, because Prodigy's
   * crimson boost multiplies chalk that goes off in the same frame — reading last frame's
   * footing would make a blast landing on the tick you stepped on quietly cheaper.
   *
   * Only the artist ever gets anything out of their own work; a blue line gives its owner
   * whatever the last Masterpiece taught it, and nothing at all before there was one.
   */
  private updateFooting(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      s.onGreen = false;
      s.onTeal = false;
      s.onCrimson = false;
      s.onPerma = false;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;

      for (const m of this.marks) {
        if (m.owner !== owner) continue;
        const under = m.kind === 'green' || m.kind === 'teal' || m.kind === 'crimson' || m.kind === 'perma';
        if (!under) continue;
        const r = m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R;
        if (Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) > r) continue;
        if (m.kind === 'perma') s.onPerma = true;
        const gives = m.kind === 'perma' ? s.permaEnhance : m.kind;
        if (gives === 'green') s.onGreen = true;
        else if (gives === 'teal') s.onTeal = true;
        else if (gives === 'crimson') s.onCrimson = true;
      }
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
    for (const m of this.marks) {
      if (m.kind === 'perma' || m.kind === 'orange') {
        const r = m.kind === 'perma' ? PERMA_RADIUS : MP_TOUCH_R;
        // Prodigy: an orange-taught blue line burns harder than an untaught one.
        const bonus = m.kind === 'perma' && this.side(m.owner).permaEnhance === 'orange'
          ? PRODIGY_PERMA_DPS : 0;
        const dps = (m.kind === 'perma' ? PERMA_DPS : MP_DAMAGE_DPS) + bonus;
        for (const t of this.targetsOf(m.owner)) {
          if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > r) continue;
          // Chalk Debris amplifies the burn as it does everything else, and the caster's own
          // crimson lifts it too — both fold in before the max, so the strongest mark wins.
          const scaled = dps * this.chalkDamageMult(m.owner, t);
          const cur = burn.get(t);
          if (!cur || scaled > cur.dps) burn.set(t, { dps: scaled, color: TONE[m.kind] });
        }
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

  // ── Perma-Block ────────────────────────────────────────────────────────────

  /**
   * Perma-Block — the blue line as a wall rather than a burn. A shot crossing it is rubbed
   * out where it touched; the line itself is not spent doing it, which is the whole appeal of
   * having drawn it somewhere useful.
   */
  private updatePermaBlock(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.up(owner, 'r')) continue;
      const line = this.marks.filter((m) => m.owner === owner && m.kind === 'perma');
      if (!line.length) continue;

      // Snapshotted for the same reason the shield's sweep is: destroy() splices the group.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        const hit = line.find((m) => Phaser.Math.Distance.Between(m.x, m.y, proj.x, proj.y) <= PERMA_BLOCK_R);
        if (!hit) continue;
        this.fx(owner).snap(proj.x, proj.y, CHK.blue);
        this.api.spawnHitFlash(proj.x, proj.y, CHK.blue);
        proj.destroy();
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
      // Anything that is not one of the three sticks was drawn as plain white.
      kind: (m.kind === 'boom' || m.kind === 'perma' ? m.kind : 'shield') as ShieldKind,
    }));

    // Supreme Shield — what it is made of decides how much of it there is, and what touching
    // it costs. Both are fractions of the whole rather than per-node, so a shield reads as one
    // object: half blue is half the bonus, however the halves are arranged around you.
    const permaFrac = s.shieldNodes.filter((n) => n.kind === 'perma').length / s.shieldNodes.length;
    s.shieldBoom = s.shieldNodes.filter((n) => n.kind === 'boom').length / s.shieldNodes.length;
    s.shieldMax = Math.round(SHIELD_HP * (1 + permaFrac * (SUPREME_PERMA_HP_MULT - 1)));
    s.shieldHp = s.shieldMax;

    this.installAbsorber(owner);
    this.fx(owner).ring(f.x, f.y, SHIELD_RANGE, SHIELD_RANGE * 0.72, CHK.white, 380);
    this.api.showFloatingText(f.x, f.y - 46, `🛡️ SHIELD ${s.shieldMax}`, this.hex(CHK.white));
    if (s.shieldBoom > 0) {
      this.api.showFloatingText(f.x, f.y - 64, '💥 ARMED', this.hex(CHK.red));
    }
  }

  /**
   * Supreme Shield — red pieces going off in the face of whoever just leaned on the shield.
   * The absorber never learns who hit it, so payback goes to the nearest body: at the range a
   * shield operates at, anything close enough to be picked is close enough to have done it.
   */
  private shieldPayback(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.shieldBoom <= 0) return;
    const f = this.fighter(owner);
    if (!f) return;

    let victim: Fighter | null = null;
    let best = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < best) { best = d; victim = t; }
    }
    if (!victim || best > SHIELD_RANGE + SHIELD_PUSH_PAD + 40) return;
    // Same gate as everything else that explodes, so a burst of shots cannot chain payback.
    if (time < (this.blastGate.get(victim) ?? 0)) return;
    this.blastGate.set(victim, time + BLAST_GATE_MS);

    const dmg = Math.max(1, Math.round(SUPREME_BOOM_DAMAGE * s.shieldBoom * this.chalkDamageMult(owner, victim)));
    victim.takeDamage(dmg);
    this.fx(owner).boom(victim.x, victim.y, BOOM_RADIUS * 0.8, CHK.red, 360);
    this.api.spawnHitFlash(victim.x, victim.y, CHK.red);
    this.api.showFloatingText(victim.x, victim.y - 54, '💥 PAYBACK', this.hex(CHK.red));
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
      this.shieldPayback(owner, this.now);
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
    const want = Math.max(1, Math.round((s.shieldNodes.length * Math.max(0, s.shieldHp)) / s.shieldMax));
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
    s.shieldBoom = 0;
    s.shieldMax = SHIELD_HP;
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
        this.fx(owner).snap(f.x + Math.cos(a) * hit.dist, f.y + Math.sin(a) * hit.dist, TONE[hit.kind]);
        this.api.spawnHitFlash(proj.x, proj.y, TONE[hit.kind]);
        proj.destroy();
        s.shieldHp -= SHIELD_PROJ_COST;
        this.shieldPayback(owner, this.now);
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
    if (s.session && isMpKind(s.session.kind)) {
      s.session = null;
    }
    if (f) {
      this.fx(owner).dust(f.x, f.y, 10, 40, 620, CHK.dust);
      this.api.showFloatingText(f.x, f.y - 48, '🖼️ FINISHED', this.hex(CHK.teal));
    }

    // Prodigy reads the finished work: whichever colour there is most of is what the artist
    // has been practising, and the blue line picks it up until the next Masterpiece.
    if (!this.up(owner, 'q')) return;
    let winner: MpKind | null = null;
    for (const k of MP_KINDS) {
      if (s.mpTally[k] > 0 && (!winner || s.mpTally[k] > s.mpTally[winner])) winner = k;
    }
    s.permaEnhance = winner;
    if (winner && f) {
      this.fx(owner).ring(f.x, f.y, 14, 90, TONE[winner], 620);
      this.api.showFloatingText(f.x, f.y - 66, `🔵 PERMA: ${LABEL[winner]}`, this.hex(TONE[winner]));
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

    this.paintEnclosures(g, time);
    this.paintClouds(g, time);
  }

  /**
   * Explosive Release — the shut-in floor, hatched while it waits. Drawn as chalk on chalk
   * rather than a coloured fill: what is dangerous here is the shape the player drew, and it
   * has to be obvious that the danger is *inside* it.
   */
  private paintEnclosures(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const blast of this.areaBlasts) {
      const tint = this.col(blast.owner);
      const left = blast.at - time;
      const heat = Phaser.Math.Clamp(1 - left / 1200, 0, 1);
      const pulse = 0.55 + 0.45 * Math.sin(this.vizT * (6 + heat * 22));

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of blast.poly) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      // Hatching, clipped to the shape by testing each span's midpoint — cheaper than a mask
      // and it keeps the ragged, drawn-by-hand edge the rest of the element has.
      const poly = new Phaser.Geom.Polygon(blast.poly);
      g.lineStyle(1.5, tint(CHK.red), 0.16 + heat * 0.3 * pulse);
      for (let y = minY; y <= maxY; y += 14) {
        for (let x = minX; x <= maxX; x += 22) {
          if (!poly.contains(x + 8, y)) continue;
          g.lineBetween(x, y + 6, x + 12, y - 6);
        }
      }
      g.fillStyle(tint(CHK.red), 0.05 + heat * 0.12);
      g.fillPoints(blast.poly, true);
    }
  }

  /** Chalk Debris — powder still hanging in the air where a ward went off. */
  private paintClouds(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const c of this.clouds) {
      const life = Phaser.Math.Clamp((c.until - time) / DEBRIS_MS, 0, 1);
      const tint = this.col(c.owner);
      // Puffs rather than a disc: a circle would read as a rune, and this is just dust.
      for (let i = 0; i < 9; i++) {
        const a = grain(c.seed, i) * Math.PI * 2 + this.vizT * 0.25;
        const d = DEBRIS_RADIUS * (0.25 + grain(c.seed, i + 40) * 0.7);
        const r = 7 + grain(c.seed, i + 80) * 11;
        const bob = Math.sin(this.vizT * 1.6 + i) * 3;
        chalkBlob(g, tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d + bob, r,
          CHK.dust, 0.1 + life * 0.16, c.seed + i * 5);
      }
      g.lineStyle(1, tint(CHK.dust), 0.1 + life * 0.14);
      g.strokeCircle(c.x, c.y, DEBRIS_RADIUS);
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
      const ratio = Phaser.Math.Clamp(s.shieldHp / s.shieldMax, 0, 1);
      let prevX = 0;
      let prevY = 0;
      s.shieldNodes.forEach((n, i) => {
        const a = n.ang + s.shieldSpin;
        const wob = 1 + Math.sin(this.vizT * 3 + n.seed) * 0.03;
        const nx = f.x + Math.cos(a) * n.dist * wob;
        const ny = f.y + Math.sin(a) * n.dist * wob;
        // A mixed shield is drawn in the colours it was drawn in — which piece is which is
        // the difference between leaning on it and being burned for leaning on it.
        const tone = TONE[n.kind];
        if (i > 0 && Phaser.Math.Distance.Between(prevX, prevY, nx, ny) < 74) {
          chalkLine(g, tint, prevX, prevY, nx, ny, 3, tone, 0.45 + ratio * 0.45, n.seed);
        }
        chalkBlob(g, tint, nx, ny, 3.4, tone, 0.55 + ratio * 0.45, n.seed);
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

    // The stick currently in hand, then the Masterpiece colours as a palette. Prodigy adds a
    // fourth stick to it, so the rack is only as wide as the palette actually is.
    chalkStick(g, this.pcol, x + 16, y + 13, -0.5, 26, held, 1);
    const palette: MpKind[] = this.up('player', 'q') ? MP_KINDS : ['green', 'orange', 'teal'];
    palette.forEach((k, i) => {
      const px = x + 118 + (i - (palette.length - 3)) * 18;
      const on = s.mpOn && s.mpChalk === k;
      chalkStick(g, this.pcol, px, y + 13, -1.2, on ? 22 : 15, TONE[k], s.mpOn ? (on ? 1 : 0.4) : 0.22);
    });

    // Shield board, only while there is one. Red pieces tint it, because a shield that hits
    // back is a different object to hide behind than one that only soaks.
    if (s.shieldNodes.length) {
      const w = 176;
      const by = y + 36;
      g.fillStyle(0x05070a, 0.85);
      g.fillRoundedRect(x - 4, by - 3, w, 12, 3);
      g.fillStyle(this.pcol(CHK.slate), 0.9);
      g.fillRect(x, by, w - 8, 6);
      g.fillStyle(this.pcol(s.shieldBoom > 0.5 ? CHK.red : CHK.white), 1);
      g.fillRect(x, by, (w - 8) * Phaser.Math.Clamp(s.shieldHp / s.shieldMax, 0, 1), 6);
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
    // What the blue line has been taught matters more than how many dabs of it there are.
    const permaLine = s.permaEnhance ? `PERMA ${LABEL[s.permaEnhance].split(' ')[0]}` : `PERMA ${perma}`;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      // Just the colour while the work is up — the palette rack sits where the long form of
      // the label would run into it, and the sticks say the rest anyway.
      s.mpOn ? `${LABEL[s.mpChalk].split(' ')[0]}\nHOLD LMB · ${this.up('player', 'q') ? 'E/R/F/Q' : 'E/R/F'}`
        : `${s.session ? LABEL[s.session.kind] : 'CHALK'}\n${permaLine}`,
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
      name: s.shieldBoom > 0 ? 'Armed Shield' : 'Chalk Shield',
      emoji: '🛡️', color: s.shieldBoom > 0.5 ? CHK.red : CHK.white,
      description: s.shieldBoom > 0
        ? 'A ring of chalk turning around you, with red in it. It eats shots and hits, and the red pieces go off in the face of whoever landed them.'
        : 'A ring of chalk turning around you. It eats shots, hits and anything that walks into it until its board runs out.',
      count: Math.max(0, Math.round(s.shieldHp)), suffix: ' HP', priority: 104,
    } : null);

    this.api.setStatusIndicator('chalk-crimson', playerIsChalk && s.onCrimson ? {
      name: 'Crimson Chalk', emoji: '🩸', color: CHK.crimson,
      description: `Standing on crimson — every kind of chalk you own hits ${PRODIGY_BOOST}× as hard while you stay on it.`,
      priority: 124,
    } : null);

    this.api.setStatusIndicator('chalk-perma-taught', playerIsChalk && s.permaEnhance ? {
      name: `Perma: ${LABEL[s.permaEnhance!].split(' ')[0].toLowerCase()}`,
      emoji: '🔵', color: TONE[s.permaEnhance!],
      description: 'Your last Masterpiece taught the blue line a colour. It keeps it until you start another one.',
      priority: 96,
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

    const p = this.api.player;
    this.api.setStatusIndicator('chalk-debris', this.inCloud('npc', p.x, p.y) ? {
      name: 'Chalk Debris', emoji: '🌫️', color: CHK.dust,
      description: `Dust in your lungs — ${Math.round((1 - DEBRIS_SLOW) * 100)}% slower, and every piece of their chalk hits you ${DEBRIS_AMP}× as hard. Get out of the cloud.`,
      priority: 14,
    } : null);

    void time;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Chalk's two movement effects, pulled by ArenaScene rather than pushed. Teal is the
   * artist's own; debris is done *to* whoever is standing in it, so it applies whether or not
   * that side is a chalk fighter at all.
   */
  private speedMultFor(owner: Owner): number {
    let mult = this.isChalk(owner) && this.side(owner).onTeal ? MP_SPEED_MULT : 1;
    const f = this.fighter(owner);
    const enemy: Owner = owner === 'player' ? 'npc' : 'player';
    if (f && this.inCloud(enemy, f.x, f.y)) mult *= DEBRIS_SLOW;
    return mult;
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
      // A Supreme Shield window may be holding any of three sticks, so the card it belongs to
      // is decided by `confined` rather than by what is in hand at the moment you look.
      const owns = sess.confined
        ? abilityId === 'chalk-shield'
        : (abilityId === 'chalk-ward' && sess.kind === 'ward')
          || (abilityId === 'chalk-explosive' && sess.kind === 'boom')
          || (abilityId === 'chalk-perma' && sess.kind === 'perma');
      if (owns) return Phaser.Math.Clamp((sess.until - time) / sess.total, 0, 1);
    }

    return p.getCooldownRatio(abilityId);
  }
}
