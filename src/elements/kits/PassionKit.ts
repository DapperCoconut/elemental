import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import {
  DEV, PassionAvatar, PassionColorFn, PassionFx, ascendBand, chariot, crashMark,
  crucifixAura, crucifixPost, faithBar, glory, halo, handGrenade, holyWaterPuddle, vial,
} from './PassionVisuals';
import { meterGain } from '../../combat/Meters';

/**
 * Devotion — the holy priest. (The element id is still `passion`, so the files and classes keep
 * the old name, exactly as Gold kept `fortune`.)
 *
 * Devotion deals no damage at all. Everything it does pours **faith** into the enemy, and the
 * moment their faith reaches the cap (200 in a duel) they are converted: killed on the spot by
 * the same pierce + netApplied execute the old love bar used, so no shield, armour, clotted pool
 * or absorber can save them. Nothing lowers faith.
 *
 * Faith also changes the believer on the way up:
 * - **25%** — it starts filling on its own, 2 a second.
 * - **50%** — their blows soften: the priest takes 20% less damage from them.
 * - **75%** — they are drawn, gently, toward the priest's nearest holy water, and every attack
 *   that lands faith on them lands 25% more.
 *
 * Faith lives on the victim (`Fighter.devotionFaith`) so the status tray and the online mirror
 * see it without help. Online, only the attacker's sim ever *adds* faith or converts — the
 * victim's copy is mirrored in and only drawn — while anything that moves a body (the 75% drag,
 * the crucifix's exclusion) runs on whichever sim owns that body.
 */

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

const ARENA_PAD = 32;

// ── Passive: faith ───────────────────────────────────────────────────────────
/** The cap in a duel. Husks and bosses scale it by their max HP against a duelist's 400. */
const FAITH_MAX = 200;
const FAITH_HP_REF = 400;
const FAITH_MIN_CAP = 30;
const STAGE_MARKS = [0.25, 0.5, 0.75];
const STAGE_LABEL = ['', '🕯️ KINDLED', '🙏 FAITHFUL', '✨ DEVOUT'];
/** 25%: faith fills itself. */
const KINDLED_PER_SEC = 2;
/** 50%: the believer's damage against the priest. */
const FAITHFUL_DAMAGE_MULT = 0.8;
/** 75%: how hard they are drawn toward the holy water, and how much more every attack lands. */
const DEVOUT_DRAG_SPEED = 55;
const DEVOUT_FAITH_MULT = 1.25;
const FAITH_BAR_W = 52;
const FAITH_BAR_H = 5;
/** Sits above the health bar (y-38) and above the charge bar that can appear over it. */
const FAITH_BAR_Y = -54;

// ── Sermon (Click) ───────────────────────────────────────────────────────────
const SERMON_MIN_LETTERS = 4;
const SERMON_MAX_LETTERS = 12;
const SERMON_MIN_FAITH = 3;
const SERMON_MAX_FAITH = 6;
const SERMON_CHARGE_MS = 1400;
/** A press shorter than this is a tap: the smallest sermon. */
const SERMON_TAP_MS = 160;
const LETTER_SPEED = 560;
const LETTER_LIFE_MS = 1100;
const LETTER_HIT_R = 14;
/** The letters leave one after another, not in a single clump. */
const LETTER_STAGGER_MS = 34;
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'ξ', 'π', 'σ', 'φ', 'χ', 'ψ', 'ω', 'Σ', 'Ω', 'Δ', 'Φ', 'Ψ'];

// ── Holy Water (E) ───────────────────────────────────────────────────────────
const WATER_CHARGES = 2;
const WATER_RECHARGE_MS = 7000;
const WATER_RANGE = 380;
const WATER_FLIGHT_MS = 520;
const PUDDLE_R = 72;
const PUDDLE_MS = 8000;
const PUDDLE_FAITH_PER_SEC = 9;
const PUDDLE_TEXT_MS = 900;

// ── Holy Hand Grenade (R) ────────────────────────────────────────────────────
const GRENADE_FUSE_MS = 3000;
const GRENADE_RANGE = 420;
/** How long the throw takes to reach the cursor; after that it is just bouncing. */
const GRENADE_TRAVEL_S = 0.55;
/** Ground drag on the roll, per second (exponential). */
const GRENADE_DRAG = 1.6;
const GRENADE_RESTITUTION = 0.78;
const GRENADE_R = 8;
/** The little hops it takes off the floor — purely a z-height for the art. */
const GRENADE_HOP_V = 210;
const GRENADE_GRAVITY = 900;
const BURST_R = 130;
const BURST_FAITH = 45;

// ── Mount Crucifix (F) ───────────────────────────────────────────────────────
const CRUCIFIX_RANGE = 440;
const AURA_R = 90;
const SHOT_FAITH = 1;

// ── Ascendance (Q) ───────────────────────────────────────────────────────────
const ASCEND_WARN_MS = 3000;
const BAND_HALF = 37;
const CHARIOT_SPEED = 1500;
const CHARIOT_FAITH = 60;
const RIDE_MS = 2000;
/** The crash's ground mark shows for the last stretch of the ride. */
const CRASH_MARK_MS = 700;
const CRASH_R = 120;
const CRASH_FAITH = 80;

// ── World objects ────────────────────────────────────────────────────────────

interface Letter {
  owner: Owner;
  glyph: string;
  /** Pending until this time: the barrage leaves one letter at a time. */
  launchAt: number;
  launched: boolean;
  ang: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  faith: number;
  seed: number;
  text: Phaser.GameObjects.Text | null;
  reg: RegisteredProjectile | null;
}

interface Bottle {
  owner: Owner;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  bornAt: number;
}

interface Puddle {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  diesAt: number;
  seed: number;
  /** Per-victim pop-up throttle. */
  nextText: Map<Fighter, number>;
}

interface Grenade {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Hop height above the floor, for the art. */
  z: number;
  vz: number;
  spin: number;
  explodeAt: number;
}

interface Crucifix {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  /** Lights up for a moment whenever something bounces off it. */
  flareUntil: number;
}

interface Side {
  owner: Owner;
  // Click — Sermon
  /** When the current press started, or 0 while the button is up. */
  chargeStartedAt: number;
  /**
   * The charge the next `doSermon` fires at; set just before the cast and spent by it. Online,
   * the peer's relayed charge lands here ahead of their cast.
   */
  pendingCharge: number;
  // E — Holy Water
  waterCharges: number;
  /** Refill times, oldest first. */
  waterRefills: number[];
  // F — the one standing crucifix (Crucifix lives in `crucifixes`)
  // Q — Ascendance
  lineY: number;
  lineDir: number;
  warnStartedAt: number;
  /** When the chariot sets off, or 0 when no line is up. */
  chariotAt: number;
  chariotX: number;
  chariotDone: boolean;
  /** The chariot has set off — the frame it does is the thunder. */
  chariotRolling: boolean;
  /** Everyone the chariot has already run over this pass. */
  struck: Fighter[];
  // The ride
  rideUntil: number;
  rideX: number;
  rideY: number;
  /** True if the kit, not something else, turned the caster's invincibility on. */
  rideOwnsInvincible: boolean;
  // Aim
  aimX: number;
  aimY: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    chargeStartedAt: 0, pendingCharge: 0,
    waterCharges: WATER_CHARGES, waterRefills: [],
    lineY: 0, lineDir: 1, warnStartedAt: 0, chariotAt: 0, chariotX: 0, chariotDone: true,
    chariotRolling: false, struck: [],
    rideUntil: 0, rideX: 0, rideY: 0, rideOwnsInvincible: false,
    aimX: 0, aimY: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PassionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** ArenaScene's shared physics group of `Projectile`s. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local travelling shots that registered themselves. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Online 1v1: the npc is a replica whose body and faith belong to the peer's sim. */
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** A boss fight: the boss drives its own body through set pieces, so nothing here moves it. */
  get bossFight(): boolean;
  isTargetable(f: Fighter): boolean;
  /** Invasion: husk shots inside a circle, with who fired them. Empty outside Invasion. */
  huskShotsNear(x: number, y: number, r: number): { key: object; from: Fighter | null }[];
  /** Skins: maps a Devotion visual colour through that side's equipped skin. */
  passionColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Pseudo-casts relayed to the peer: the sermon's charge and the chariot's crash point. */
  broadcastMasteryCast(enhId: string): void;
}

// ── PassionKit ───────────────────────────────────────────────────────────────

export class PassionKit implements SummonPurgeTarget {
  private api: PassionArenaApi;

  // ── Visuals ──
  private readonly pcol: PassionColorFn;
  private readonly ncol: PassionColorFn;
  private readonly pfx: PassionFx;
  private readonly nfx: PassionFx;
  private playerAvatar: PassionAvatar | null = null;
  private npcAvatar: PassionAvatar | null = null;
  /** Puddles, crucifix auras, the Ascendance band — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Crucifixes, bottles, grenades, the chariot — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Halos and the faith bars — above `HealthBar` (depth 10). */
  private faceGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  /** Each victim's cap, latched the first frame Devotion sees them. */
  private caps = new Map<Fighter, number>();
  /** How many thresholds have been announced per victim — mirrored faith announces too. */
  private stages = new Map<Fighter, number>();
  /** Bodies already converted, so the execute fires once. */
  private converted = new WeakSet<Fighter>();
  private letters: Letter[] = [];
  private bottles: Bottle[] = [];
  private puddles: Puddle[] = [];
  private grenades: Grenade[] = [];
  private crucifixes: Crucifix[] = [];
  /** Enemy shots that have already paid their faith to a crucifix. */
  private blessedShots = new WeakSet<object>();
  private nextPruneAt = 0;
  /** Victim → time of the last passive pop-up, so "+2" shows once a second rather than per frame. */
  private passiveTextAt = new Map<Fighter, number>();

  constructor(api: PassionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.passionColor('player', base);
    this.ncol = (base) => api.passionColor('npc', base);
    this.pfx = new PassionFx(api.scene, this.pcol);
    this.nfx = new PassionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PassionFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PassionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private avatar(owner: Owner): PassionAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  private isDevotion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'passion' : this.api.npcElementId === 'passion';
  }

  /**
   * Whether this sim decides faith for `owner`. Online, the opponent's faith-giving is resolved
   * on their machine and mirrored onto us through `devotionFaith`; adding it here as well would
   * count every sermon twice.
   */
  private authority(owner: Owner): boolean {
    return !(owner === 'npc' && this.api.isOnline);
  }

  /** Everything this side is allowed to convert. In Invasion the npc slot is never an enemy. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc') return this.api.isInvasion ? [] : [this.api.player].filter((f) => this.alive(f));
    return this.api.enemies.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /**
   * Whether this sim may move `t`'s body. Online the npc is a replica — its body belongs to the
   * peer's sim, which runs the same rule against it. Bosses drive their own bodies, and
   * Unbreakable/Unstoppable outrank every shove in the game.
   */
  private canMove(t: Fighter): boolean {
    if (this.api.isOnline && t === this.api.npc) return false;
    if (this.api.bossFight && t === this.api.npc) return false;
    return !t.knockbackImmune && !t.unstoppable;
  }

  // ── Faith ──────────────────────────────────────────────────────────────────

  /** The victim's cap, latched on first sight so a chipped husk is not cheaper than a fresh one. */
  private capOf(f: Fighter): number {
    let c = this.caps.get(f);
    if (c === undefined) {
      const duel = (f === this.api.player || f === this.api.npc) && !this.api.bossFight && !this.api.isInvasion;
      c = duel ? FAITH_MAX : Math.max(FAITH_MIN_CAP, Math.round(FAITH_MAX * (f.maxHp / FAITH_HP_REF)));
      this.caps.set(f, c);
    }
    return c;
  }

  /** 0–1 for anyone Devotion is working on. */
  faithRatio(f: Fighter | null | undefined): number {
    if (!f) return 0;
    return Phaser.Math.Clamp(f.devotionFaith / this.capOf(f), 0, 1);
  }

  private stageOf(ratio: number): number {
    let s = 0;
    for (const m of STAGE_MARKS) if (ratio >= m) s++;
    return s;
  }

  /**
   * The one way faith is ever added. Nothing anywhere takes it away.
   *
   * `passive` marks the 25% self-fill, which is not an attack and so does not get the 75%
   * stage's +25%. `icon` tags the pop-up; the number in it is what actually landed.
   */
  private addFaith(owner: Owner, victim: Fighter, amount: number, icon?: string, passive = false): void {
    if (amount <= 0 || !this.alive(victim) || !this.authority(owner)) return;
    if (this.converted.has(victim)) return;
    const cap = this.capOf(victim);
    let mult = 1;
    if (!passive && this.stageOf(victim.devotionFaith / cap) >= 3) mult = DEVOUT_FAITH_MULT;
    // Ruin's Combo Breaker halves every meter in the game, faith included. It is the priest's
    // meter even though it hangs over the victim, so it is the priest who is taxed.
    const applied = meterGain(this.fighter(owner), amount * mult);
    victim.devotionFaith = Math.min(cap, victim.devotionFaith + applied);

    if (icon) {
      this.api.showFloatingText(victim.x, victim.y - 34, `+${Math.round(applied)} ${icon}`,
        this.hex(mult > 1 ? DEV.white : DEV.holy));
    }
    if (victim.devotionFaith >= cap) this.convert(owner, victim);
  }

  /**
   * The bar filled. `pierce` + `netApplied` is the only combination in `takeDamage` that means
   * "exactly this number, no mitigation and no absorb layer", so a meter that cannot be lowered
   * cannot be shielded out of either. Online the hit lands on the replica and is relayed by the
   * ghost hook, so the victim dies on their own machine.
   */
  private convert(owner: Owner, victim: Fighter): void {
    if (this.converted.has(victim)) return;
    this.converted.add(victim);
    victim.devotionFaith = this.capOf(victim);
    this.fx(owner).convert(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 56, '✝️ CONVERTED', this.hex(DEV.white));
    this.api.spawnHitFlash(victim.x, victim.y, DEV.holy);
    Sfx.playAt('reward-big', victim.x, { volume: 0.9, rate: 0.8 });
    Sfx.playAt('crystal-chime', victim.x, { volume: 0.8, rate: 0.9 });
    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (f) {
        // Hand back everything this kit wrote onto a fighter.
        if (f.passionIncomingMult !== 1) f.passionIncomingMult = 1;
        if (s.rideOwnsInvincible) f.isInvincible = false;
        if (s.rideUntil > 0) { f.forceInvisible = false; if (f.active) f.setAlpha(1); }
        f.devotionFaith = 0;
      }
    }
    for (const l of this.letters) {
      l.text?.destroy();
      if (l.reg) this.api.projectileRegistry?.remove(l.reg);
    }
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.caps.clear();
    this.stages.clear();
    this.converted = new WeakSet();
    this.letters = [];
    this.bottles = [];
    this.puddles = [];
    this.grenades = [];
    this.crucifixes = [];
    this.blessedShots = new WeakSet();
    this.passiveTextAt.clear();
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.faceGfx?.destroy(); this.faceGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'passion') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    // Riding the chariot: nothing is castable, and the cursor is choosing where to land.
    if (s.rideUntil > 0) { s.chargeStartedAt = 0; return; }

    const p = this.api.player;
    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);

    // Click — Sermon. Press starts preaching, release looses the barrage. A press while the
    // sermon is still cooling down is simply ignored rather than charging into nothing.
    const pressed = pointer.isDown && !this.api.pointerWasDown;
    if (pressed && s.chargeStartedAt === 0 && p.getCooldownRatio('passion-sermon') >= 1) {
      s.chargeStartedAt = time;
    }
    if (!pointer.isDown && s.chargeStartedAt > 0) {
      const held = time - s.chargeStartedAt;
      s.chargeStartedAt = 0;
      const charge = held < SERMON_TAP_MS ? 0 : Phaser.Math.Clamp(held / SERMON_CHARGE_MS, 0, 1);
      s.pendingCharge = charge;
      // The charge rides ahead of the cast on the same ordered channel, so the peer's replay of
      // `passion-sermon` fires at the size we released, not at a tap.
      if (charge > 0) this.api.broadcastMasteryCast(`devotion-charge:${Math.round(charge * 100)}`);
      p.castAbility('passion-sermon', ctx());
    }

    // E — Holy Water spends a bottle; with none in hand the press is refused before the cast,
    // so it doesn't stamp a cooldown, play a sound or relay a phantom throw.
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (s.waterCharges > 0) p.castAbility('passion-holy-water', ctx());
      else this.api.showFloatingText(p.x, p.y - 44, '💧 NO HOLY WATER', this.hex(DEV.water));
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('passion-grenade', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('passion-crucifix', ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('passion-ascendance', ctx());
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Sermon. A staggered barrage of Greek letters, sized by how long it was preached. */
  doSermon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // The bot cannot hold a button; the kit decides how long it would have preached.
    const charge = owner === 'npc' && !this.api.isOnline ? this.npcSermonCharge() : s.pendingCharge;
    s.pendingCharge = 0;

    const n = Math.round(Phaser.Math.Linear(SERMON_MIN_LETTERS, SERMON_MAX_LETTERS, charge));
    const faith = Phaser.Math.Linear(SERMON_MIN_FAITH, SERMON_MAX_FAITH, charge);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    // One straight file along the aim: the stagger alone spaces the letters out.
    for (let i = 0; i < n; i++) {
      const a = ang;
      this.letters.push({
        owner, glyph: GREEK[Math.floor(Math.random() * GREEK.length)],
        launchAt: this.now + i * LETTER_STAGGER_MS, launched: false,
        ang: a, x: f.x, y: f.y, vx: 0, vy: 0, diesAt: 0, faith,
        seed: Math.random() * 99,
        text: null, reg: null,
      });
    }

    const av = this.avatar(owner);
    av?.play('punch', ang);
    const tip = av?.handTip();
    this.fx(owner).preach(tip?.x ?? f.x + Math.cos(ang) * 20, tip?.y ?? f.y + Math.sin(ang) * 20, ang, charge);
    if (charge >= 0.99) {
      this.api.showFloatingText(f.x, f.y - 50, '📖 GREAT SERMON', this.hex(DEV.white));
      Sfx.playAt('holy-chord', f.x, { volume: 0.6, rate: 1.1 });
    }
  }

  /** E — Holy Water. Lobs a vial that shatters into a boiling puddle where it lands. */
  doHolyWater(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    // A replay of the peer's throw is trusted: their sim already spent the bottle.
    if (this.authority(owner)) {
      if (s.waterCharges <= 0) return;
      s.waterCharges--;
      // Refills queue: the second bottle starts its 7s only once the first is back.
      const last = s.waterRefills[s.waterRefills.length - 1] ?? this.now;
      s.waterRefills.push(Math.max(this.now, last) + WATER_RECHARGE_MS);
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(WATER_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    this.bottles.push({
      owner, fromX: f.x, fromY: f.y,
      toX: this.clampX(f.x + Math.cos(ang) * d), toY: this.clampY(f.y + Math.sin(ang) * d),
      bornAt: this.now,
    });
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('whoosh', f.x, { volume: 0.5, rate: 1.3 });
  }

  /** R — Holy Hand Grenade. Thrown at the cursor; it arrives, then bounces about until the fuse. */
  doGrenade(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(GRENADE_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    // Exponential drag: pick the launch speed that covers exactly `d` in the travel time, so it
    // is at the cursor right as its first big bounce is spent.
    const v0 = (d * GRENADE_DRAG) / (1 - Math.exp(-GRENADE_DRAG * GRENADE_TRAVEL_S));
    this.grenades.push({
      owner, x: f.x + Math.cos(ang) * 16, y: f.y + Math.sin(ang) * 16,
      vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
      z: 4, vz: GRENADE_HOP_V * 1.3, spin: 0,
      explodeAt: this.now + GRENADE_FUSE_MS,
    });
    this.avatar(owner)?.play('slam', ang);
    this.api.showFloatingText(f.x, f.y - 50, '💣 HALLELUJAH', this.hex(DEV.gold));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 0.9 });
  }

  /** F — Mount Crucifix. Plants at the cursor; the old one comes down as the new one goes up. */
  doCrucifix(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(CRUCIFIX_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    const x = Phaser.Math.Clamp(f.x + Math.cos(ang) * d, this.left + 20, this.right - 20);
    const y = Phaser.Math.Clamp(f.y + Math.sin(ang) * d, this.top + 40, this.bottom - 10);

    const old = this.crucifixes.findIndex((c) => c.owner === owner);
    if (old >= 0) {
      const c = this.crucifixes[old];
      this.fx(owner).sparkle(c.x, c.y - 40, 8, 30, DEV.pale, 600);
      this.crucifixes.splice(old, 1);
    }
    this.crucifixes.push({ owner, x, y, bornAt: this.now, flareUntil: 0 });
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).plant(x, y, AURA_R);
    this.api.showFloatingText(x, y - 70, '✝️ CRUCIFIX', this.hex(DEV.holy));
    Sfx.playAt('stone-slam', x, { volume: 0.7, rate: 1.1 });
  }

  /** Q — Ascendance. Draws the line where the priest stands; the chariot comes three seconds on. */
  doAscendance(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    void ty;
    const s = this.side(owner);
    s.lineY = this.clampY(f.y);
    // It runs toward the side the priest is aiming at, coming in from the opposite wall.
    s.lineDir = tx >= f.x ? 1 : -1;
    s.warnStartedAt = this.now;
    s.chariotAt = this.now + ASCEND_WARN_MS;
    s.chariotX = s.lineDir > 0 ? this.left - 120 : this.right + 120;
    s.chariotDone = false;
    s.chariotRolling = false;
    s.struck = [];
    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 10, 90, DEV.fire, 700);
    this.api.showFloatingText(f.x, f.y - 56, '🔥 ASCENDANCE', this.hex(DEV.fire));
    Sfx.playAt('holy-chord', f.x, { volume: 0.8, rate: 0.85 });
  }

  /** Online: the peer told us how long their next sermon was preached. */
  setNpcSermonCharge(relayId: string): void {
    const pct = Number(relayId.split(':')[1] ?? 0);
    this.sides.npc.pendingCharge = Phaser.Math.Clamp((Number.isFinite(pct) ? pct : 0) / 100, 0, 1);
  }

  /** Online: the peer's priest came down off the chariot. Visual only — their sim paid the faith. */
  doNpcCrash(tx: number, ty: number): void {
    const s = this.sides.npc;
    s.rideUntil = 0;
    this.fx('npc').crash(tx, ty, CRASH_R);
    this.api.scene.cameras.main.shake(260, 0.008);
    Sfx.playAt('explosion-large', tx, { volume: 0.9, rate: 0.8 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.isDevotion('player');
    const npcIs = this.isDevotion('npc');
    // World objects outlive their caster's element only for as long as they would anyway — but a
    // match with no Devotion in it has none to tick.
    if (!playerIs && !npcIs && !this.letters.length && !this.puddles.length && !this.grenades.length
      && !this.crucifixes.length) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    const dt = delta / 1000;

    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      const targets = this.targetsOf(owner);
      for (const t of targets) this.capOf(t);
      this.updateRefills(owner, time);
      this.updatePassive(owner, targets, time, dt);
      this.updateDrag(owner, targets, dt);
      this.updateArmour(owner, targets);
      this.updateAscend(owner, time, delta);
      this.updateRide(owner, time);
    }

    this.updateLetters(time, dt);
    this.updateBottles(time);
    this.updatePuddles(time, dt);
    this.updateGrenades(time, dt);
    this.updateCrucifixes();
    this.updateStages();
    this.prune(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir(time);
    this.paintFaces();
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5 and their health bars at 10.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.faceGfx) this.faceGfx = scene.add.graphics().setDepth(11);
  }

  private updateRefills(owner: Owner, time: number): void {
    const s = this.side(owner);
    while (s.waterRefills.length && time >= s.waterRefills[0]) {
      s.waterRefills.shift();
      s.waterCharges = Math.min(WATER_CHARGES, s.waterCharges + 1);
    }
  }

  /** 25%: faith fills on its own. Announced once a second rather than every frame. */
  private updatePassive(owner: Owner, targets: Fighter[], time: number, dt: number): void {
    if (!this.authority(owner)) return;
    for (const t of targets) {
      if (this.stageOf(this.faithRatio(t)) < 1) continue;
      this.addFaith(owner, t, KINDLED_PER_SEC * dt, undefined, true);
      if (time >= (this.passiveTextAt.get(t) ?? 0)) {
        this.passiveTextAt.set(t, time + 1000);
        this.api.showFloatingText(t.x + 14, t.y - 30, `+${KINDLED_PER_SEC} 🕯️`, this.hex(DEV.pale));
      }
    }
  }

  /**
   * 75%: drawn toward the nearest holy water this priest has on the floor. Written as a position
   * nudge after movement, so it is a pull they can walk against but never ignore. Runs on
   * whichever sim owns the body, reading faith that may have been mirrored in.
   */
  private updateDrag(owner: Owner, targets: Fighter[], dt: number): void {
    const pools = this.puddles.filter((p) => p.owner === owner);
    if (!pools.length) return;
    for (const t of targets) {
      if (this.stageOf(this.faithRatio(t)) < 3 || !this.canMove(t)) continue;
      let best: Puddle | null = null;
      let bd = Infinity;
      for (const p of pools) {
        const d = Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (!best || bd < PUDDLE_R * 0.4) continue;
      const a = Math.atan2(best.y - t.y, best.x - t.x);
      const step = Math.min(bd, DEVOUT_DRAG_SPEED * dt);
      const nx = t.x + Math.cos(a) * step;
      const ny = t.y + Math.sin(a) * step;
      const b = this.body(t);
      t.setPosition(nx, ny);
      b?.reset(nx, ny);
    }
  }

  /**
   * 50%: the believer's blows soften against the priest. There is no outgoing-damage chokepoint
   * in the game, so — like the old rose — it is armour on the priest: a victim-side
   * `passionIncomingMult`, written every frame by this one writer. With several enemies (an
   * Invasion room) it follows the nearest of them, which is almost always the one swinging.
   *
   * Online, a remote priest's armour travels in their own `dm` field, so this sim leaves the
   * replica's multiplier alone rather than counting it twice.
   */
  private updateArmour(owner: Owner, targets: Fighter[]): void {
    const f = this.fighter(owner);
    if (!f || !this.authority(owner)) return;
    let nearest: Fighter | null = null;
    let nd = Infinity;
    for (const t of targets) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < nd) { nd = d; nearest = t; }
    }
    const mult = nearest && this.stageOf(this.faithRatio(nearest)) >= 2 ? FAITHFUL_DAMAGE_MULT : 1;
    if (f.passionIncomingMult !== mult) f.passionIncomingMult = mult;
  }

  // ── Ascendance ────────────────────────────────────────────────────────────

  private updateAscend(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    if (s.chariotDone || s.chariotAt <= 0) return;
    if (time < s.chariotAt) return;
    const f = this.fighter(owner);

    // The first frame of the run: the thunder.
    if (!s.chariotRolling) {
      s.chariotRolling = true;
      this.api.scene.cameras.main.shake(300, 0.004);
      Sfx.playAt('meteor', this.api.width / 2, { volume: 0.6, rate: 0.7 });
    }

    const prevX = s.chariotX;
    s.chariotX += s.lineDir * CHARIOT_SPEED * (delta / 1000);
    const lo = Math.min(prevX, s.chariotX);
    const hi = Math.max(prevX, s.chariotX);
    const inBand = (b: Fighter): boolean => Math.abs(b.y - s.lineY) <= BAND_HALF + 14;

    for (const t of this.targetsOf(owner)) {
      if (s.struck.includes(t) || t.x < lo - 20 || t.x > hi + 20 || !inBand(t)) continue;
      s.struck.push(t);
      this.api.spawnHitFlash(t.x, t.y, DEV.fire);
      this.fx(owner).sparkle(t.x, t.y, 10, 34, DEV.fireHot, 600);
      this.addFaith(owner, t, CHARIOT_FAITH, '🔥');
    }

    // Caught in it yourself: the chariot hauls you aboard. On the peer's replay this is only
    // drawn — their sim decides the ride and tells us where it came down.
    if (this.alive(f) && s.rideUntil === 0 && f.x >= lo - 20 && f.x <= hi + 20 && inBand(f)) {
      this.startRide(owner);
    }

    const off = s.lineDir > 0 ? s.chariotX > this.api.width + 200 : s.chariotX < -200;
    if (off) {
      s.chariotDone = true;
      s.chariotAt = 0;
    }
  }

  private startRide(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.rideUntil = this.now + RIDE_MS;
    s.rideX = f.x;
    s.rideY = f.y;
    this.fx(owner).liftOff(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 56, '🙌 TAKEN UP', this.hex(DEV.fireHot));
    if (owner === 'player' || !this.api.isOnline) {
      if (!f.isInvincible) { f.isInvincible = true; s.rideOwnsInvincible = true; }
    }
    f.forceInvisible = true;
    f.setAlpha(0);
  }

  /** The ride: held out of the fight, then dropped on the cursor (the bot drops on its target). */
  private updateRide(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.rideUntil <= 0) return;
    const f = this.fighter(owner);
    if (!f || !f.active) { this.endRide(owner); return; }

    // Held where it was taken, invisible: nothing aims at it and nothing walks it anywhere.
    if (!(owner === 'npc' && this.api.isOnline)) {
      f.setPosition(s.rideX, s.rideY);
      this.body(f)?.reset(s.rideX, s.rideY);
    }
    f.setAlpha(0);
    if (owner === 'npc') {
      const p = this.api.player;
      if (this.alive(p)) { s.aimX = p.x; s.aimY = p.y; }
    }
    if (time < s.rideUntil) return;

    // A remote priest lands where their sim says — `doNpcCrash` brings the news.
    if (owner === 'npc' && this.api.isOnline) {
      if (time > s.rideUntil + 1500) this.endRide(owner);
      return;
    }

    const x = this.clampX(s.aimX);
    const y = this.clampY(s.aimY);
    this.endRide(owner);
    f.setPosition(x, y);
    this.body(f)?.reset(x, y);
    if (owner === 'player') this.api.broadcastMasteryCast('devotion-crash');
    this.fx(owner).crash(x, y, CRASH_R);
    this.api.scene.cameras.main.shake(320, 0.009);
    Sfx.playAt('explosion-large', x, { volume: 1, rate: 0.75 });
    this.api.showFloatingText(x, y - 60, '☄️ DESCENT', this.hex(DEV.fire));
    // The burst lands with the comet, a beat after the body.
    this.api.scene.time.delayedCall(200, () => {
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > CRASH_R + 16) continue;
        this.addFaith(owner, t, CRASH_FAITH, '☄️');
      }
    });
  }

  private endRide(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.rideUntil = 0;
    if (!f) return;
    if (s.rideOwnsInvincible) { f.isInvincible = false; s.rideOwnsInvincible = false; }
    f.forceInvisible = false;
    if (f.active) f.setAlpha(1);
  }

  // ── Projectiles and world objects ─────────────────────────────────────────

  private updateLetters(time: number, dt: number): void {
    const reg = this.api.projectileRegistry;
    for (let i = this.letters.length - 1; i >= 0; i--) {
      const l = this.letters[i];
      if (!l.launched) {
        if (time < l.launchAt) continue;
        const f = this.fighter(l.owner);
        if (!this.alive(f) || !this.isDevotion(l.owner)) { this.letters.splice(i, 1); continue; }
        const av = this.avatar(l.owner);
        const tip = av?.handTip();
        l.x = tip && Number.isFinite(tip.x) ? tip.x : f.x + Math.cos(l.ang) * 18;
        l.y = tip && Number.isFinite(tip.y) ? tip.y : f.y + Math.sin(l.ang) * 18;
        const v = LETTER_SPEED;
        l.vx = Math.cos(l.ang) * v;
        l.vy = Math.sin(l.ang) * v;
        l.diesAt = time + LETTER_LIFE_MS;
        l.launched = true;
        l.text = this.api.scene.add.text(l.x, l.y, l.glyph, {
          fontSize: '17px', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'bold',
          color: this.hex(this.col(l.owner)(DEV.pale)),
          stroke: this.hex(this.col(l.owner)(DEV.umber)), strokeThickness: 3,
        }).setOrigin(0.5).setDepth(9.5);
        const entry: RegisteredProjectile = {
          owner: l.owner, damage: 0,
          getX: () => l.x, getY: () => l.y,
          steal: () => { l.diesAt = 0; l.faith = 0; },
        };
        l.reg = entry;
        reg?.add(entry);
      }

      const age = 1 - (l.diesAt - time) / LETTER_LIFE_MS;
      l.x += l.vx * dt;
      l.y += l.vy * dt;

      const gone = time >= l.diesAt || l.x < this.left - 40 || l.x > this.right + 40
        || l.y < this.top - 40 || l.y > this.bottom + 40;
      let hit: Fighter | null = null;
      if (!gone && l.faith > 0) {
        for (const t of this.targetsOf(l.owner)) {
          if (Phaser.Math.Distance.Between(l.x, l.y, t.x, t.y) <= LETTER_HIT_R + 16) { hit = t; break; }
        }
      }
      if (hit) {
        this.fx(l.owner).letterHit(hit.x, hit.y - 4, l.ang);
        this.addFaith(l.owner, hit, l.faith, '✝');
        Sfx.playAt('crystal-chime', hit.x, { volume: 0.25, rate: 1.6 + Math.random() * 0.3 });
      }
      if (gone || hit) {
        l.text?.destroy();
        if (l.reg) reg?.remove(l.reg);
        this.letters.splice(i, 1);
        continue;
      }
      l.text?.setPosition(l.x, l.y);
      l.text?.setAlpha(age > 0.85 ? (1 - age) / 0.15 : 1);
    }
  }

  private updateBottles(time: number): void {
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i];
      if (time - b.bornAt < WATER_FLIGHT_MS) continue;
      this.bottles.splice(i, 1);
      this.puddles.push({
        owner: b.owner, x: b.toX, y: b.toY, bornAt: time, diesAt: time + PUDDLE_MS,
        seed: Math.random() * 999, nextText: new Map(),
      });
      this.fx(b.owner).shatter(b.toX, b.toY, PUDDLE_R);
      Sfx.playAt('ice-shatter', b.toX, { volume: 0.6, rate: 1.2 });
      Sfx.playAt('bubble', b.toX, { volume: 0.6, rate: 0.7 });
    }
  }

  private updatePuddles(time: number, dt: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time >= p.diesAt) { this.puddles.splice(i, 1); continue; }
      if (!this.isDevotion(p.owner)) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) > PUDDLE_R) continue;
        this.addFaith(p.owner, t, PUDDLE_FAITH_PER_SEC * dt);
        if (time >= (p.nextText.get(t) ?? 0) && this.authority(p.owner)) {
          p.nextText.set(t, time + PUDDLE_TEXT_MS);
          this.api.showFloatingText(t.x - 14, t.y - 34, `+${PUDDLE_FAITH_PER_SEC} 💧`, this.hex(DEV.water));
        }
      }
    }
  }

  private updateGrenades(time: number, dt: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      // Roll, with drag.
      const keep = Math.exp(-GRENADE_DRAG * dt);
      gr.vx *= keep;
      gr.vy *= keep;
      gr.x += gr.vx * dt;
      gr.y += gr.vy * dt;
      gr.spin += Math.hypot(gr.vx, gr.vy) * dt * 0.08;
      // Hop off the floor — each landing a little lower, and every landing kicks it again so it
      // never quite settles before the fuse.
      gr.vz -= GRENADE_GRAVITY * dt;
      gr.z += gr.vz * dt;
      if (gr.z <= 0) {
        gr.z = 0;
        gr.vz = Math.max(GRENADE_HOP_V * 0.45, Math.abs(gr.vz) * 0.6);
        // A bounce off the floor kicks it off in a slightly new direction.
        const turn = (Math.random() - 0.5) * 0.9;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const sp = Math.max(Math.hypot(gr.vx, gr.vy), 70);
        const a = Math.atan2(gr.vy, gr.vx);
        gr.vx = Math.cos(a) * sp * c - Math.sin(a) * sp * s;
        gr.vy = Math.sin(a) * sp * c + Math.cos(a) * sp * s;
        Sfx.playAt('boing', gr.x, { volume: 0.15, rate: 1.6 });
      }
      // Walls.
      if (gr.x < this.left + GRENADE_R) { gr.x = this.left + GRENADE_R; gr.vx = Math.abs(gr.vx) * GRENADE_RESTITUTION; }
      if (gr.x > this.right - GRENADE_R) { gr.x = this.right - GRENADE_R; gr.vx = -Math.abs(gr.vx) * GRENADE_RESTITUTION; }
      if (gr.y < this.top + GRENADE_R) { gr.y = this.top + GRENADE_R; gr.vy = Math.abs(gr.vy) * GRENADE_RESTITUTION; }
      if (gr.y > this.bottom - GRENADE_R) { gr.y = this.bottom - GRENADE_R; gr.vy = -Math.abs(gr.vy) * GRENADE_RESTITUTION; }
      // Enemy bodies, and the rim of an *enemy* crucifix, are walls too. Its own crucifix lets
      // it through — so a grenade lobbed past your cross keeps rattling around the believer
      // who is pinned against its edge.
      for (const t of this.targetsOf(gr.owner)) this.bounceOff(gr, t.x, t.y, 22);
      for (const c of this.crucifixes) if (c.owner !== gr.owner) this.bounceOff(gr, c.x, c.y, AURA_R);

      if (time < gr.explodeAt) continue;
      this.grenades.splice(i, 1);
      this.fx(gr.owner).holyBurst(gr.x, gr.y, BURST_R);
      this.api.scene.cameras.main.shake(260, 0.007);
      Sfx.playAt('explosion-medium', gr.x, { volume: 0.9, rate: 1.05 });
      Sfx.playAt('holy-chord', gr.x, { volume: 0.6, rate: 1.3 });
      for (const t of this.targetsOf(gr.owner)) {
        if (Phaser.Math.Distance.Between(gr.x, gr.y, t.x, t.y) > BURST_R + 14) continue;
        this.addFaith(gr.owner, t, BURST_FAITH, '💥');
      }
    }
  }

  /** Reflects the grenade off a circle of radius `r` it has strayed inside. */
  private bounceOff(gr: Grenade, cx: number, cy: number, r: number): void {
    const d = Phaser.Math.Distance.Between(gr.x, gr.y, cx, cy);
    if (d >= r + GRENADE_R || d < 0.01) return;
    const nx = (gr.x - cx) / d;
    const ny = (gr.y - cy) / d;
    gr.x = cx + nx * (r + GRENADE_R);
    gr.y = cy + ny * (r + GRENADE_R);
    const dot = gr.vx * nx + gr.vy * ny;
    if (dot < 0) {
      gr.vx = (gr.vx - 2 * dot * nx) * GRENADE_RESTITUTION;
      gr.vy = (gr.vy - 2 * dot * ny) * GRENADE_RESTITUTION;
    }
  }

  /**
   * The crucifix's two rules. Enemies cannot set foot in the aura — anyone inside is set back on
   * its rim, on whichever sim owns their body — and every enemy shot that crosses into it pays
   * its shooter 1 faith, once per shot.
   */
  private updateCrucifixes(): void {
    for (const c of this.crucifixes) {
      if (!this.isDevotion(c.owner)) continue;
      for (const t of this.targetsOf(c.owner)) {
        const d = Phaser.Math.Distance.Between(t.x, t.y, c.x, c.y);
        if (d >= AURA_R || !this.canMove(t)) continue;
        const a = d < 0.5 ? Math.random() * Math.PI * 2 : Math.atan2(t.y - c.y, t.x - c.x);
        const rim = this.rimPoint(c, t, a);
        // No spot on the rim the body fits (the aura fills a corner): leave it be rather than
        // fighting the world bounds every frame.
        if (!rim) continue;
        const { x: nx, y: ny } = rim;
        // `reset` zeroes velocity. Hand back everything but the push into the aura, so a body
        // on the rim slides around it instead of sticking to it.
        const b = this.body(t);
        const vx = b?.velocity.x ?? 0;
        const vy = b?.velocity.y ?? 0;
        t.setPosition(nx, ny);
        b?.reset(nx, ny);
        if (b) {
          const ox = Math.cos(rim.ang);
          const oy = Math.sin(rim.ang);
          const out = vx * ox + vy * oy;
          b.setVelocity(out < 0 ? vx - out * ox : vx, out < 0 ? vy - out * oy : vy);
        }
        if (c.flareUntil < this.now) {
          this.fx(c.owner).blessShot(nx, ny);
          Sfx.playAt('ui-denied', nx, { volume: 0.25, rate: 1.4 });
        }
        c.flareUntil = this.now + 160;
      }
      this.blessShots(c);
    }
  }

  /**
   * Where on the aura's rim to set a body down: straight out along `ang` if it fits inside the
   * arena, otherwise the nearest rim angle that does. A crucifix planted near a wall has part of
   * its rim outside the world bounds, and a body pushed there is pushed straight back in by the
   * bounds every frame — that tug-of-war is what pinned players in place.
   */
  private rimPoint(c: Crucifix, t: Fighter, ang: number): { x: number; y: number; ang: number } | null {
    const wb = this.api.scene.physics.world.bounds;
    const b = this.body(t);
    const rx = (b?.halfWidth ?? 22) + 1;
    const ry = (b?.halfHeight ?? 22) + 1;
    const fits = (x: number, y: number): boolean =>
      x >= wb.left + rx && x <= wb.right - rx && y >= wb.top + ry && y <= wb.bottom - ry;
    const step = Math.PI / 36;
    for (let k = 0; k <= 36; k++) {
      for (const sign of k === 0 ? [1] : [1, -1]) {
        const a = ang + sign * k * step;
        const x = c.x + Math.cos(a) * AURA_R;
        const y = c.y + Math.sin(a) * AURA_R;
        if (fits(x, y)) return { x, y, ang: a };
      }
    }
    return null;
  }

  private blessShots(c: Crucifix): void {
    const enemySide: Owner = c.owner === 'player' ? 'npc' : 'player';
    // The shooter: in a duel the one fighter on the other side; in Invasion a shared-group shot
    // has no shooter to pay, so only husk shots (which carry one) count there.
    const duelShooter = this.api.isInvasion ? null : this.fighter(enemySide);
    const pay = (key: object, x: number, y: number, shooter: Fighter | null): void => {
      if (this.blessedShots.has(key)) return;
      this.blessedShots.add(key);
      this.fx(c.owner).blessShot(x, y);
      c.flareUntil = this.now + 160;
      if (shooter && this.alive(shooter) && this.targetsOf(c.owner).includes(shooter)) {
        this.addFaith(c.owner, shooter, SHOT_FAITH, '✝');
      }
    };

    const group = this.api.projectiles;
    if (group) {
      for (const obj of group.getChildren()) {
        if (!(obj instanceof Projectile) || !obj.active || obj.isHeal) continue;
        const fromPlayer = obj.isFromPlayer;
        if ((enemySide === 'player') !== fromPlayer) continue;
        if (Phaser.Math.Distance.Between(obj.x, obj.y, c.x, c.y) > AURA_R) continue;
        pay(obj, obj.x, obj.y, duelShooter);
      }
    }
    for (const p of this.api.projectileRegistry?.within(enemySide, c.x, c.y, AURA_R) ?? []) {
      pay(p, p.getX(), p.getY(), duelShooter);
    }
    if (this.api.isInvasion && c.owner === 'player') {
      for (const s of this.api.huskShotsNear(c.x, c.y, AURA_R)) pay(s.key, c.x, c.y, s.from);
    }
  }

  /** Stage announcements, for every victim — mirrored faith (online) announces as well. */
  private updateStages(): void {
    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const stage = this.stageOf(this.faithRatio(t));
        const shown = this.stages.get(t) ?? 0;
        if (stage <= shown) continue;
        this.stages.set(t, stage);
        this.api.showFloatingText(t.x, t.y - 52, STAGE_LABEL[stage], this.hex(DEV.white));
        this.fx(owner).sparkle(t.x, t.y - 20, 4 + stage * 3, 24 + stage * 6, DEV.holy, 700);
        Sfx.playAt('crystal-chime', t.x, { volume: 0.5 + stage * 0.1, rate: 0.8 + stage * 0.15 });
      }
    }
  }

  /** Drops the maps' references to anyone who is gone — an Invasion run retires husks by the hundred. */
  private prune(time: number): void {
    if (time < this.nextPruneAt) return;
    this.nextPruneAt = time + 3000;
    for (const f of [...this.caps.keys()]) if (!f.active) this.caps.delete(f);
    for (const f of [...this.stages.keys()]) if (!f.active) this.stages.delete(f);
    for (const f of [...this.passiveTextAt.keys()]) if (!f.active) this.passiveTextAt.delete(f);
    for (const p of this.puddles) for (const f of [...p.nextText.keys()]) if (!f.active) p.nextText.delete(f);
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    if (playerIs && !this.playerAvatar) this.playerAvatar = new PassionAvatar(scene, this.pcol);
    if (npcIs && !this.npcAvatar) this.npcAvatar = new PassionAvatar(scene, this.ncol);

    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f || !f.active || s.rideUntil > 0) { av.update(delta, f?.x ?? -999, f?.y ?? -999, 0); continue; }

      const target = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : { x: this.api.player.x, y: this.api.player.y };
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));
      const preach = s.chargeStartedAt > 0
        ? Phaser.Math.Clamp((this.now - s.chargeStartedAt) / SERMON_CHARGE_MS, 0, 1) : 0;
      av.setPreach(preach);
      av.setHold(s.chargeStartedAt > 0 ? 'brace' : null);
      av.setIntensity(1 + preach * 0.3);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    const now = this.now;

    for (const p of this.puddles) {
      const life = (now - p.bornAt) / (p.diesAt - p.bornAt);
      holyWaterPuddle(g, this.col(p.owner), p.x, p.y, PUDDLE_R, t, p.seed, life);
    }
    for (const c of this.crucifixes) {
      const rise = Phaser.Math.Clamp((now - c.bornAt) / 260, 0, 1);
      crucifixAura(g, this.col(c.owner), c.x, c.y, AURA_R * rise, t, 1, c.flareUntil > now ? 1 : 0);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.chariotAt <= 0 || s.chariotDone) continue;
      const progress = Phaser.Math.Clamp((now - s.warnStartedAt) / ASCEND_WARN_MS, 0, 1);
      ascendBand(g, this.col(owner), 0, this.api.width, s.lineY, BAND_HALF, progress, s.lineDir, t);
    }
  }

  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    // Glows under the letters (the glyphs themselves are Text objects).
    for (const l of this.letters) {
      if (!l.launched) continue;
      const tint = this.col(l.owner);
      g.fillStyle(tint(DEV.holy), 0.22);
      g.fillCircle(l.x, l.y, 11);
      g.fillStyle(tint(DEV.pale), 0.12);
      g.fillCircle(l.x - l.vx * 0.02, l.y - l.vy * 0.02, 8);
    }

    for (const b of this.bottles) {
      const k = Phaser.Math.Clamp((time - b.bornAt) / WATER_FLIGHT_MS, 0, 1);
      const x = Phaser.Math.Linear(b.fromX, b.toX, k);
      const y = Phaser.Math.Linear(b.fromY, b.toY, k) - Math.sin(k * Math.PI) * 60;
      const tint = this.col(b.owner);
      g.fillStyle(tint(DEV.ink), 0.25);
      g.fillEllipse(Phaser.Math.Linear(b.fromX, b.toX, k), Phaser.Math.Linear(b.fromY, b.toY, k) + 8, 12, 4);
      vial(g, tint, x, y, k * 9, 1);
    }

    for (const gr of this.grenades) {
      const tint = this.col(gr.owner);
      const fuse = Phaser.Math.Clamp(1 - (gr.explodeAt - time) / GRENADE_FUSE_MS, 0, 1);
      g.fillStyle(tint(DEV.ink), 0.3);
      g.fillEllipse(gr.x, gr.y + 7, 14 - gr.z * 0.05, 5);
      handGrenade(g, tint, gr.x, gr.y - gr.z, gr.spin, 1, fuse, t);
      // The last second: the count, sung.
      const left = gr.explodeAt - time;
      if (left < 1000) {
        g.lineStyle(1.6, tint(DEV.white), 0.5 + 0.5 * Math.sin(t * 30));
        g.strokeCircle(gr.x, gr.y, BURST_R * (left / 1000));
      }
    }

    for (const c of this.crucifixes) {
      const rise = Phaser.Math.Clamp((this.now - c.bornAt) / 260, 0, 1);
      crucifixPost(g, this.col(c.owner), c.x, c.y, 1, t, rise);
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      if (s.chariotAt > 0 && !s.chariotDone && time >= s.chariotAt) {
        chariot(g, tint, s.chariotX, s.lineY, s.lineDir, t, 1, s.rideUntil > 0);
      }
      // The ground mark where the priest will come down.
      if (s.rideUntil > 0 && !(owner === 'npc' && this.api.isOnline)) {
        const left = s.rideUntil - time;
        if (left < CRASH_MARK_MS) {
          crashMark(g, tint, this.clampX(s.aimX), this.clampY(s.aimY), CRASH_R, 1 - left / CRASH_MARK_MS, t);
        }
      }
    }
  }

  /**
   * The faith bar and the halo forming over every believer: dotted at a quarter, a solid ring at
   * half, a blazing glory at three quarters.
   */
  private paintFaces(): void {
    const g = this.faceGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      const tint = this.col(owner);
      for (const v of this.targetsOf(owner)) {
        const ratio = this.faithRatio(v);
        if (ratio <= 0) continue;
        const stage = this.stageOf(ratio);
        const a = v.alpha;
        faithBar(g, tint, v.x, v.y + FAITH_BAR_Y, FAITH_BAR_W, FAITH_BAR_H, ratio, t);
        const hy = v.y - 30;
        if (stage === 1) halo(g, tint, v.x, hy, 13, a * 0.9, 2.4, true, t);
        if (stage >= 2) halo(g, tint, v.x, hy, 13 + (stage - 2) * 2, a, 2.4);
        if (stage >= 3) {
          glory(g, tint, v.x, hy, 8, 9 + Math.sin(t * 4) * 2, 10, t * 0.6, a * 0.55, 1.6);
          g.fillStyle(tint(DEV.holy), a * 0.1);
          g.fillCircle(v.x, v.y, 30);
        }
      }
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsDevotion: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('passion-water', playerIsDevotion ? {
      name: 'Holy Water', emoji: '💧', color: DEV.water,
      description: `${s.waterCharges} of ${WATER_CHARGES} bottles in hand. One refills every `
        + `${WATER_RECHARGE_MS / 1000}s.`,
      count: s.waterCharges, priority: 60,
    } : null);

    this.api.setStatusIndicator('passion-sanctified',
      playerIsDevotion && p.passionIncomingMult < 1 ? {
        name: 'Sanctified', emoji: '🙏', color: DEV.holy,
        description: 'Your nearest enemy is at half faith or more. Their blows land 20% softer on you.',
        priority: 98,
      } : null);

    this.api.setStatusIndicator('passion-ride', playerIsDevotion && s.rideUntil > time ? {
      name: 'Taken Up', emoji: '🔥', color: DEV.fire,
      description: 'Riding the chariot. You cannot be hurt. Aim the cursor — you crash down there.',
      until: s.rideUntil, priority: 130,
    } : null);

    const c = playerIsDevotion ? this.crucifixes.find((x) => x.owner === 'player') : undefined;
    this.api.setStatusIndicator('passion-crucifix', c ? {
      name: 'Crucifix', emoji: '✝️', color: DEV.gold,
      description: `Standing. No enemy can enter its ${AURA_R}px aura, and every shot they fire into `
        + 'it gives them 1 faith. Plant another to move it.',
      priority: 58,
    } : null);
  }

  // ── SummonPurgeTarget ──────────────────────────────────────────────────────

  /** A crucifix is a thing somebody built. Puddles and grenades are not, and survive. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.crucifixes.length - 1; i >= 0; i--) {
      const c = this.crucifixes[i];
      if (c.owner === exceptOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      this.crucifixes.splice(i, 1);
      razed++;
      report?.(c.x, c.y);
      this.fx(c.owner).sparkle(c.x, c.y - 40, 10, 30, DEV.pale, 600);
    }
    return razed;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  isRiding(owner: Owner): boolean {
    return this.sides[owner].rideUntil > 0;
  }

  npcWaterCharges(): number {
    return this.sides.npc.waterCharges;
  }

  /**
   * How long the bot "held" its sermon. Long when the target is a sitting duck — standing in
   * the bot's holy water, pinned on its crucifix's rim, or already devout (where every letter is
   * worth 25% more) — and short otherwise.
   */
  private npcSermonCharge(): number {
    const p = this.api.player;
    if (!this.alive(p)) return 0;
    if (this.npcTargetPinned() || this.stageOf(this.faithRatio(p)) >= 3) return 1;
    return Math.random() * 0.5;
  }

  /** The player is standing in the bot's holy water, or pressed against its crucifix's rim. */
  private npcTargetPinned(): boolean {
    const p = this.api.player;
    if (!this.alive(p)) return false;
    if (this.puddles.some((w) => w.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, w.x, w.y) < PUDDLE_R)) return true;
    return this.crucifixes.some((c) => c.owner === 'npc'
      && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < AURA_R + 40);
  }

  /**
   * Bot synergies, computed owner-side and published to the AI. Every read is side-effect free.
   *
   * - **Holy water** goes where the player will be, unless a puddle is already there. At 75%
   *   faith any puddle drags them, so it is thrown even when they are not standing on it.
   * - **Crucifix** is a sanctuary up close (planted on the bot's own feet, so the player is shoved
   *   out to the rim) and a wall at range (planted between them, so every shot fired across it
   *   pays faith).
   * - **Grenade** is thrown at a player who cannot easily leave the blast: standing in holy
   *   water, pressed on the crucifix's rim, or at half faith where the burst finishes the job.
   * - **Ascendance** is cast when the player is level with the bot, so both are on the line —
   *   the chariot runs them over *and* carries the bot to crash down on them.
   */
  npcOpportunities(): {
    waterPoint?: { x: number; y: number };
    crucifixPoint?: { x: number; y: number };
    grenadePoint?: { x: number; y: number };
    ascendNow: boolean;
    holdLineY?: number;
  } {
    const npc = this.api.npc;
    const p = this.api.player;
    const out: ReturnType<PassionKit['npcOpportunities']> = { ascendNow: false };
    if (!this.isDevotion('npc') || !this.alive(npc) || !this.alive(p) || this.api.isOnline) return out;
    const s = this.sides.npc;
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y);
    const pb = this.body(p);
    const lead = { x: p.x + (pb?.velocity.x ?? 0) * 0.45, y: p.y + (pb?.velocity.y ?? 0) * 0.45 };

    if (s.waterCharges > 0 && dist < WATER_RANGE + 40
      && !this.puddles.some((w) => w.owner === 'npc' && Phaser.Math.Distance.Between(lead.x, lead.y, w.x, w.y) < PUDDLE_R * 0.8)) {
      out.waterPoint = lead;
    }

    const mine = this.crucifixes.find((c) => c.owner === 'npc');
    if (dist < 150) {
      if (!mine || Phaser.Math.Distance.Between(mine.x, mine.y, npc.x, npc.y) > AURA_R * 0.6) {
        out.crucifixPoint = { x: npc.x, y: npc.y };
      }
    } else if (!mine) {
      out.crucifixPoint = { x: Phaser.Math.Linear(npc.x, p.x, 0.45), y: Phaser.Math.Linear(npc.y, p.y, 0.45) };
    }

    if (dist < GRENADE_RANGE && (this.npcTargetPinned() || this.stageOf(this.faithRatio(p)) >= 2)) {
      out.grenadePoint = { x: p.x, y: p.y };
    }

    out.ascendNow = s.chariotAt <= 0 && Math.abs(p.y - npc.y) < 34 && dist < 700;
    // During the wind-up, stay on the line so the chariot picks the bot up.
    if (s.chariotAt > 0 && !s.chariotDone) out.holdLineY = s.lineY;
    return out;
  }

  /** HUD cards. */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === 'passion-sermon' && s.chargeStartedAt > 0) {
      return Phaser.Math.Clamp((time - s.chargeStartedAt) / SERMON_CHARGE_MS, 0, 1);
    }
    if (abilityId === 'passion-holy-water') {
      if (s.waterCharges >= WATER_CHARGES) return 1;
      const next = s.waterRefills[0] ?? time;
      const into = 1 - Phaser.Math.Clamp((next - time) / WATER_RECHARGE_MS, 0, 1);
      return Phaser.Math.Clamp((s.waterCharges + into) / WATER_CHARGES, 0, 1);
    }
    if (abilityId === 'passion-ascendance' && s.chariotAt > time) {
      return Phaser.Math.Clamp((s.chariotAt - time) / ASCEND_WARN_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
