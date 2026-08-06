import Phaser from 'phaser';
import { CastContext } from '../Ability';
import { Fighter } from '../../entities/Fighter';
import { AIR, AirAvatar, AirColorFn, AirDraft, AirFx, ArmGesture, ArmHold } from './AirVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

type Owner = 'player' | 'npc';

// ── Wind dodge ────────────────────────────────────────────────────────────────

/**
 * The dancer's whole defensive economy. Wind dodge is banked by landing dances and spent only
 * by dodges that actually saved a hit — never by a timer — so a fight where nothing touches you
 * keeps everything you earned, and a fight where everything does strips you in ten hits.
 */
const DODGE_PER_DODGE = 0.10;
/** Sky Grapple's landing payout. */
const GRAPPLE_DODGE = 0.25;
/** A returning Gale Glaive that catches someone, and E+'s clean two-hit pair. */
const GLAIVE_DODGE = 0.15;
const EXPERT_PAIR_DODGE = 0.15;
/** Q+ (Eye of the Storm): every attack that lands during the tornado. */
const EYE_DODGE = 0.10;
/** Winds of Change (mastery bindable). */
const WINDS_DODGE = 0.20;

// ── Wind Splice (Click) ───────────────────────────────────────────────────────

const SPLICE_CUT_RANGE = 100;
/** Half-angle of the near cut. Wide enough to be a dance step, narrow enough to be aimed. */
const SPLICE_CUT_HALF = 0.95;
const SPLICE_CUT_DAMAGE = 20;
const SHEAR_DAMAGE = 12;
const SHEAR_SPEED = 640;
const SHEAR_RANGE = 760;
const SHEAR_HIT_RADIUS = 28;
/** Click+ (Whirlwind): every Nth splice throws a free Spin Dance. */
const WHIRLWIND_EVERY = 3;

// ── Spin Dance (E) ────────────────────────────────────────────────────────────

const SPIN_COOLDOWN_MS = 6000;
const SPIN_RADIUS = 115;
const SPIN_DAMAGE = 20;
/** What one connecting Spin Dance takes off every other ability. */
const SPIN_CD_REFUND_MS = 2000;
/** E+ (Expert Dancer): a second charge, and the window that turns it into a flip. */
const FLIP_WINDOW_MS = 1800;
const FLIP_HALF_LEN = 135;
const FLIP_HALF_WID = 46;

// ── Gale Glaive (R) ───────────────────────────────────────────────────────────

const GLAIVE_SPEED = 940;
const GLAIVE_RADIUS = 30;
const GLAIVE_OUT_DAMAGE = 15;
const GLAIVE_BACK_DAMAGE = 20;
const GLAIVE_PARK_MS = 2000;
const GLAIVE_TICK_MS = 400;
const GLAIVE_TICK_DAMAGE = 10;
/** R+ (Gale Afterimage): how long the wooden phantoms stand, and what their ticks are worth. */
const AFTERIMAGE_MS = 5000;
const AFTERIMAGE_TICK_DAMAGE = 7;

// ── Sky Grapple (F) ───────────────────────────────────────────────────────────

const GRAPPLE_SPEED = 1400;
const GRAPPLE_MAX_MS = 420;
/** How near the hook line has to pass for F+ to count it as a ram. */
const RAM_RADIUS = 44;
/** F+ (Final Flight): the window of your own damage it cashes in, and the share it takes. */
const FINAL_FLIGHT_WINDOW_MS = 10000;
const FINAL_FLIGHT_SHARE = 0.5;
const FINAL_FLIGHT_KNOCKBACK = 620;

// ── Wind Breaker (Q) ──────────────────────────────────────────────────────────

const TORNADO_MS = 5000;
const TORNADO_RADIUS = 155;
/** Captives are held between these two radii — close enough to hurt, far enough to be visible. */
const TORNADO_ORBIT_MIN = 62;
const TORNADO_ORBIT_MAX = 140;
const TORNADO_ORBIT_SPEED = 3.4;
const TORNADO_TICK_MS = 500;
const TORNADO_TICK_DAMAGE = 12;
/** The dancer is a funnel, not a runner — she keeps her feet but loses her stride. */
const TORNADO_SPEED_MULT = 0.6;
/** The throw at the end: how fast, and what hitting the wall costs. */
const LAUNCH_SPEED = 1150;
const LAUNCH_WALL_DAMAGE = 25;
/** Storm perk (divine): the extra a lightning strike adds to each grind inside the funnel. */
const STORM_BOLT_DAMAGE = 10;

// ── Mastery ───────────────────────────────────────────────────────────────────

/** Dancer's Momentum: speed gained per second on her feet, and the ceiling on it. */
const MOMENTUM_PER_SEC = 0.05;
const MOMENTUM_MAX = 1.0;
/** What one hit taken knocks off the momentum. */
const MOMENTUM_HIT_LOSS = 0.10;
const WINDS_COOLDOWN_MS = 25000;
/** Wind dodge at which the Sharpshooter achievement (and the Sand skin) unlocks. */
const PERFECT_DODGE = 1.0;

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'wind-splice': 'punch',
  'spin-dance': 'sweep',
  'gale-glaive': 'punch',
  'sky-grapple': 'dash',
  'wind-breaker': 'raise',
};

// ── Arena API interface ────────────────────────────────────────────────────────

export interface AirArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  /** True when the local player's element is air. */
  readonly isPlayerAir: boolean;
  /** True when the opponent's element is air. */
  readonly isNpcAir: boolean;
  /** True only when the player is air AND Air Mastery is switched on. */
  readonly masteryActive: boolean;
  /** World-space cursor: the glaive parks on it and Wind Breaker throws along it. */
  readonly pointerX: number;
  readonly pointerY: number;
  readonly worldBounds: Phaser.Geom.Rectangle;
  /**
   * Sky Grapple places the player's body itself, so WASD has to stand down for the flight —
   * the same flag Hunt's pounce and Gunpowder's retreat use.
   */
  isDodging: boolean;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** Skins: maps an air visual color through the owner's skin. */
  airColor(owner: Owner, base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: Owner): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
}

// ── Internal world objects ─────────────────────────────────────────────────────

/** Wind Splice's far half: a sheet of sheared air travelling on its own. */
interface Shear {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  t: number;
  damage: number;
  hit: Set<Fighter>;
}

type GlaivePhase = 'out' | 'park' | 'back' | 'phantom';

/** The pair of fans thrown as one spindle, and the wooden memory R+ leaves in their place. */
interface Glaive {
  owner: Owner;
  x: number;
  y: number;
  parkX: number;
  parkY: number;
  phase: GlaivePhase;
  /** When the current phase ends — only meaningful for `park` and `phantom`. */
  until: number;
  spin: number;
  lastTickAt: number;
  /** Targets already caught on this leg; cleared when the glaive turns for home. */
  hit: Set<Fighter>;
}

/** An enemy thrown out of Wind Breaker, flying until a wall stops it. */
interface Launch {
  owner: Owner;
  target: Fighter;
  vx: number;
  vy: number;
  expireAt: number;
}

interface Hawk {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expireAt: number;
  t: number;
}

/** Everything one side of the dance owns. Mirrored so an air NPC plays the full kit. */
interface Side {
  owner: Owner;
  /** Wind dodge, mirrored onto `Fighter.windDodge` every frame for the status tray. */
  dodge: number;
  /** Sky Grapple's i-frames. */
  invulnUntil: number;
  /** Spin Dance charges, kept fractional so the ability card can drain smoothly. */
  spinCharges: number;
  lastSpinAt: number;
  /** E+: the first half of a pair connected, so a clean second half pays out. */
  spinPairArmed: boolean;
  spinPairHit: boolean;
  /** Click+ (Whirlwind) counter. */
  spliceCount: number;
  /** Wind Breaker. */
  tornadoUntil: number;
  tornadoLastTickAt: number;
  tornadoCaptives: Map<Fighter, { angle: number; dist: number }>;
  /** Rolling ledger of damage this side dealt, for F+ (Final Flight). */
  ledger: Array<{ at: number; amount: number }>;
  /** Mastery passive: the momentum bonus, 0–MOMENTUM_MAX. */
  momentum: number;
  /** Last seen `rawDamageTaken`, so a hit can be detected without an event subscription. */
  lastRawTaken: number;
  /** Winds of Change's own cooldown (mastery bindables never touch the ability table). */
  windsLastCastAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    dodge: 0,
    invulnUntil: 0,
    spinCharges: 1,
    lastSpinAt: -Infinity,
    spinPairArmed: false,
    spinPairHit: false,
    spliceCount: 0,
    tornadoUntil: 0,
    tornadoLastTickAt: 0,
    tornadoCaptives: new Map(),
    ledger: [],
    momentum: 0,
    lastRawTaken: 0,
    windsLastCastAt: -Infinity,
  };
}

// ── AirKit ────────────────────────────────────────────────────────────────────

/**
 * The wind dancer, whole: her character rig, her five abilities, her upgrades and her mastery.
 *
 * Two ideas hold the element together. The first is **wind dodge** — a dodge pool that is only
 * ever spent by dodges that saved a hit, so it is a resource you build and defend rather than a
 * buff that ticks away. Every ability in the kit either feeds it or spends the tempo it buys.
 * The second is **tempo**: Spin Dance pays back cooldown on contact, so the dancer who keeps
 * connecting keeps her whole kit up, and the one who whiffs is left with a click.
 *
 * Everything here runs for both sides — an air NPC (and an online air opponent, whose casts are
 * replayed through the same `do*` entry points) dances with the full kit, not a stub.
 */
export class AirKit {
  // ── Visuals ─────────────────────────────────────────────────────────────
  private readonly pcol: AirColorFn;
  private readonly ncol: AirColorFn;
  private readonly pfx: AirFx;
  private readonly nfx: AirFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Everything airborne — shears, glaives, the hawk. Over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The tornado funnel. Under the fighters, so a captive is visible inside it. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  /** Sustained rig pose and when it lapses. */
  private playerHold: ArmHold = null;
  private playerHoldUntil = 0;
  private playerHoldAngle = 0;

  /** The draft riding on a dancer with wind dodge banked, one per side. */
  private dodgeDraft: AirDraft | null = null;
  private npcDodgeDraft: AirDraft | null = null;
  /** Mastery momentum draft, player only. */
  private momentumDraft: AirDraft | null = null;

  // ── Sim ─────────────────────────────────────────────────────────────────
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shears: Shear[] = [];
  private glaives: Glaive[] = [];
  private launches: Launch[] = [];

  // -- Hawk perk (Air): F throws a bird instead of a hook --
  private hawks: Hawk[] = [];
  private hawkDragUntil = 0;
  private hawkDragX = 0;
  private hawkDragY = 0;

  /** Fighters we installed a damage absorber on, so `reset` can take them back off. */
  private absorbed = new Set<Fighter>();

  // last known aim, captured in handleInput so update() can steer the rig
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(private readonly arena: AirArenaApi) {
    this.pcol = (base) => arena.airColor('player', base);
    this.ncol = (base) => arena.airColor('npc', base);
    this.pfx = new AirFx(arena.scene, this.pcol);
    this.nfx = new AirFx(arena.scene, this.ncol);
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.dodgeDraft) { this.dodgeDraft.destroy(); this.dodgeDraft = null; }
    if (this.npcDodgeDraft) { this.npcDodgeDraft.destroy(); this.npcDodgeDraft = null; }
    if (this.momentumDraft) { this.momentumDraft.destroy(); this.momentumDraft = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    this.vizT = 0;

    this.playerHold = null;
    this.playerHoldUntil = 0;
    this.playerHoldAngle = 0;

    // Hand the absorbers back before the fighters are replaced, or a stale closure keeps
    // answering for a body that no longer exists.
    for (const f of this.absorbed) f.damageAbsorber = null;
    this.absorbed.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.shears = [];
    this.glaives = [];
    this.launches = [];

    for (const h of this.hawks) h.g.destroy();
    this.hawks = [];
    this.hawkDragUntil = 0;
    this.hawkDragX = 0;
    this.hawkDragY = 0;

    this.ledgerSeen.clear();
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  // ── Small helpers ────────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private fx(owner: Owner): AirFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): AirColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private avatar(owner: Owner): BaseAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc') return this.alive(this.arena.player) ? [this.arena.player] : [];
    return this.arena.enemies.filter((e) => this.alive(e));
  }

  private body(f: Fighter): Phaser.Physics.Arcade.Body {
    return f.body as Phaser.Physics.Arcade.Body;
  }

  private aimOf(owner: Owner, tx?: number, ty?: number): number {
    const f = this.fighter(owner);
    if (tx !== undefined && ty !== undefined) return Math.atan2(ty - f.y, tx - f.x);
    if (owner === 'player') return this.playerAim();
    const p = this.arena.player;
    return Math.atan2(p.y - f.y, p.x - f.x);
  }

  private playerAim(): number {
    const { player } = this.arena;
    const ax = this.lastMouseX || player.x + 1;
    const ay = this.lastMouseY || player.y;
    return Math.atan2(ay - player.y, ax - player.x);
  }

  // ── Wind dodge ───────────────────────────────────────────────────────────

  /**
   * Bank wind dodge. Uncapped on purpose — past 100% the roll simply cannot fail, and the
   * overflow is the buffer that keeps it from failing for the next several hits either.
   */
  private addDodge(owner: Owner, amount: number, label: string): void {
    const s = this.sides[owner];
    s.dodge += amount;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.arena.showFloatingText(
        f.x, f.y - 40,
        `🍃 ${label} +${Math.round(amount * 100)}% (${Math.round(s.dodge * 100)}%)`,
        '#ccddff',
      );
      this.fx(owner).featherPuff(f.x, f.y, 5);
    }
    if (owner === 'player' && s.dodge >= PERFECT_DODGE) this.arena.unlockAchievement('sharpshooter');
  }

  /**
   * The one gate every hit on an air dancer passes through. Installed as the fighter's
   * `damageAbsorber` so it covers melee, area and tick damage too — a dodge that only worked on
   * projectiles would miss most of what actually kills you.
   */
  private absorb(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    // Self-inflicted damage is not something you can dance out of the way of.
    if (f.damageWasSelfInflicted) return false;

    if (this.now < s.invulnUntil) {
      s.lastRawTaken = f.rawDamageTaken;
      this.arena.spawnDamageNumber(f.x, f.y - 34, -1); // DODGED
      this.fx(owner).motes(f.x, f.y, 6, { speed: 160, size: 2.4, life: 320, swirl: 2, depth: 7 });
      return true;
    }
    if (s.dodge <= 0) return false;
    if (Math.random() >= s.dodge) return false;

    s.dodge = Math.max(0, s.dodge - DODGE_PER_DODGE);
    // `rawDamageTaken` was already incremented upstream of the absorber, so the momentum poll
    // would read a dodge as a hit. Move its watermark past this one: nothing touched her.
    s.lastRawTaken = f.rawDamageTaken;
    this.arena.spawnDamageNumber(f.x, f.y - 34, -1); // DODGED
    this.fx(owner).featherPuff(f.x, f.y, 5);
    this.fx(owner).bloom(f.x, f.y, 44, 7, 6);
    if (owner === 'player') this.arena.recordMasteryStat('windDodges', 1);
    return true;
  }

  private installAbsorbers(): void {
    const wire = (owner: Owner, isAir: boolean) => {
      const f = this.fighter(owner);
      if (!f) return;
      if (isAir) {
        // Install once and leave it: rebuilding the closure every frame would churn, and
        // overwriting a foreign absorber would quietly break whoever else set one.
        if (this.absorbed.has(f)) return;
        if (f.damageAbsorber !== null) return;
        f.damageAbsorber = () => this.absorb(owner);
        this.absorbed.add(f);
      } else if (this.absorbed.has(f)) {
        f.damageAbsorber = null;
        this.absorbed.delete(f);
      }
    };
    wire('player', this.arena.isPlayerAir);
    wire('npc', this.arena.isNpcAir);
  }

  // ── Frame ────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (!this.arena.isPlayerAir || this.arena.nukeChanneling) return;
    const s = this.sides.player;
    const p = this.arena.player;
    if (!this.alive(p)) return;

    // Wind Breaker locks her into the funnel. Eye of the Storm is the whole upgrade: it hands
    // the keys back, and is the only thing that does.
    if (time < s.tornadoUntil && !this.arena.hasUpgrade('q')) return;

    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);

    if (pointer.isDown) p.castAbility('wind-splice', ctx);
    // Spin Dance runs on kit-owned charges, so it never goes through `castAbility` — the
    // ability's own cooldown would refuse the second charge the upgrade exists to grant.
    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey) && this.slotFree('e')) {
      this.trySpin(mouseX, mouseY);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey) && this.slotFree('r')) {
      p.castAbility('gale-glaive', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey) && this.slotFree('f')) {
      p.castAbility('sky-grapple', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey) && this.slotFree('q')) {
      p.castAbility('wind-breaker', ctx);
    }

    // Winds of Change, wherever the player bound it.
    const windsSlot = this.windsSlot();
    if (windsSlot) {
      const key = windsSlot === 'e' ? this.arena.eKey
        : windsSlot === 'r' ? this.arena.rKey
          : windsSlot === 'q' ? this.arena.qKey
            : this.arena.fKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryWindsOfChange(time);
    }
  }

  /** False when a mastery bindable has taken this slot over for the match. */
  private slotFree(slot: string): boolean {
    return this.arena.masteryBindFor(slot) !== 'winds-of-change';
  }

  private windsSlot(): string | null {
    if (!this.arena.masteryActive) return null;
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'winds-of-change') return slot;
    }
    return null;
  }

  /**
   * Runs after NPC AI and husk movement have written their velocities for the frame — the
   * tornado holds its captives by position, so anything short of the last word on where a body
   * is loses the tug of war.
   */
  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.vizT += dt;
    this.installAbsorbers();

    this.trackDamage(time);
    this.tickCharges(delta);
    this.tickMomentum(delta);
    this.updateShears(time, dt);
    this.updateGlaives(time, dt);
    this.updateTornado(time, dt);
    this.updateLaunches(time, dt);
    this.updateHawks(time, delta);

    // Mirror both pools onto the fighters so the status tray (and anything else generic) can
    // read them without knowing air exists.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f) f.windDodge = this.isAir(owner) ? this.sides[owner].dodge : 0;
    }

    this.updateAvatars(time, delta);
    this.updateDrafts(delta);
    this.paint();
  }

  private isAir(owner: Owner): boolean {
    return owner === 'player' ? this.arena.isPlayerAir : this.arena.isNpcAir;
  }

  // ── Damage ledger + momentum ─────────────────────────────────────────────

  /**
   * F+ needs "damage you dealt in the last 10 seconds" and the mastery passive needs "you just
   * got hit". Both are read off `rawDamageTaken` deltas rather than events: the field is
   * already the honest running total on every fighter, and polling it cannot be forgotten by an
   * ability that damages someone through a path the kit does not own.
   */
  private trackDamage(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isAir(owner)) continue;
      const s = this.sides[owner];

      // What we dealt: every enemy's raw intake since last frame.
      let dealt = 0;
      for (const t of this.targetsOf(owner)) {
        const prev = this.ledgerSeen.get(t) ?? t.rawDamageTaken;
        if (t.rawDamageTaken > prev) dealt += t.rawDamageTaken - prev;
        this.ledgerSeen.set(t, t.rawDamageTaken);
      }
      if (dealt > 0) s.ledger.push({ at: time, amount: dealt });
      while (s.ledger.length > 0 && time - s.ledger[0].at > FINAL_FLIGHT_WINDOW_MS) s.ledger.shift();

      // What we took: momentum is knocked back by any hit that got through.
      const f = this.fighter(owner);
      if (!f) continue;
      if (f.rawDamageTaken > s.lastRawTaken) {
        if (s.momentum > 0) {
          s.momentum = Math.max(0, s.momentum - MOMENTUM_HIT_LOSS);
          if (owner === 'player' && this.arena.masteryActive) {
            this.arena.showFloatingText(f.x, f.y - 30, '💨 STUMBLE', '#8899aa');
          }
        }
      }
      s.lastRawTaken = f.rawDamageTaken;
    }
  }

  /** Per-fighter watermark for the ledger poll above. */
  private ledgerSeen = new Map<Fighter, number>();

  private ledgerTotal(owner: Owner, time: number): number {
    let sum = 0;
    for (const e of this.sides[owner].ledger) {
      if (time - e.at <= FINAL_FLIGHT_WINDOW_MS) sum += e.amount;
    }
    return sum;
  }

  /** Dancer's Momentum: she winds up the longer she is left alone. */
  private tickMomentum(delta: number): void {
    const s = this.sides.player;
    if (!this.arena.masteryActive) { s.momentum = 0; return; }
    if (!this.alive(this.arena.player)) return;
    s.momentum = Math.min(MOMENTUM_MAX, s.momentum + MOMENTUM_PER_SEC * (delta / 1000));
  }

  private tickCharges(delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isAir(owner)) continue;
      const s = this.sides[owner];
      const max = this.maxSpinCharges(owner);
      if (s.spinCharges >= max) { s.spinCharges = max; continue; }
      s.spinCharges = Math.min(max, s.spinCharges + delta / SPIN_COOLDOWN_MS);
    }
  }

  private maxSpinCharges(owner: Owner): number {
    return owner === 'player' && this.arena.hasUpgrade('e') ? 2 : 1;
  }

  // ── Damage plumbing ──────────────────────────────────────────────────────

  /**
   * Q+ (Eye of the Storm): every attack hits for a fifth of the banked wind dodge on top of its
   * own number, so the dodge pool stops being purely defensive. Unlike the upgrade's dodge
   * payout this is not gated on the funnel being up — the tornado is five seconds in every
   * twenty-four, and an upgrade that only paid out inside it would barely exist.
   */
  private eyeBonus(owner: Owner): number {
    if (owner !== 'player' || !this.arena.hasUpgrade('q')) return 0;
    return Math.round(this.sides.player.dodge * 100 / 5);
  }

  /** One target taking one hit from this side, with the Eye bonus folded in. */
  // `color` is typed wide on purpose: `AIR` is an `as const` table, so an inferred default
  // would pin the parameter to that one literal and refuse every other palette key.
  private strike(owner: Owner, t: Fighter, base: number, color: number = AIR.frost): void {
    t.takeDamage(base + this.eyeBonus(owner));
    this.arena.spawnHitFlash(t.x, t.y, color);
    this.fx(owner).featherPuff(t.x, t.y, 4);
  }

  /**
   * Called once per attack that connected with at least one target — the hook Eye of the Storm
   * pays out on, and the one place "an attack landed" is defined.
   */
  private onAttackLanded(owner: Owner): void {
    if (owner !== 'player') return;
    if (!this.arena.hasUpgrade('q')) return;
    if (this.now >= this.sides.player.tornadoUntil) return;
    this.addDodge('player', EYE_DODGE, 'EYE');
  }

  // ── Click: Wind Splice ───────────────────────────────────────────────────

  /**
   * One motion, two ranges: the fan opens across the enemy in front of her, and the air it
   * displaces keeps going as a sheet. Close range is where the damage is; the shear is what
   * makes the click worth pressing from across the arena.
   */
  doSplice(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    const ang = this.aimOf(owner, tx, ty);
    const fx = this.fx(owner);

    this.avatar(owner)?.play('sweep', ang);
    this.setFanSpread(owner, 1);
    fx.fanCut(f.x, f.y, ang, SPLICE_CUT_RANGE, SPLICE_CUT_HALF);
    fx.muzzleGust(f.x + Math.cos(ang) * 20, f.y + Math.sin(ang) * 20, ang, 0.9);

    // Near cut: a wedge, so standing behind her is safe and standing in front is not.
    let landed = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > SPLICE_CUT_RANGE + 14) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > SPLICE_CUT_HALF) continue;
      this.strike(owner, t, SPLICE_CUT_DAMAGE, AIR.mist);
      landed = true;
    }
    if (landed) this.onAttackLanded(owner);

    // Far half: the sheet sheared off the cut, thrown along the same line.
    this.shears.push({
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * SHEAR_SPEED,
      vy: Math.sin(ang) * SHEAR_SPEED,
      travelled: 0,
      t: 0,
      damage: SHEAR_DAMAGE,
      hit: new Set(),
    });

    // Click+ (Whirlwind): every third splice carries a free turn with it.
    s.spliceCount++;
    if (owner === 'player' && this.arena.hasUpgrade('click') && s.spliceCount % WHIRLWIND_EVERY === 0) {
      this.arena.showFloatingText(f.x, f.y - 46, '🌀 WHIRLWIND!', '#aaddff');
      this.resolveSpin(owner, tx, ty, false);
    }
  }

  private updateShears(_time: number, dt: number): void {
    for (let i = this.shears.length - 1; i >= 0; i--) {
      const sh = this.shears[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.travelled += Math.hypot(sh.vx, sh.vy) * dt;
      sh.t += dt;

      let done = sh.travelled >= SHEAR_RANGE;
      if (sh.x < -40 || sh.x > this.arena.width + 40 || sh.y < -40 || sh.y > this.arena.height + 40) done = true;

      for (const t of this.targetsOf(sh.owner)) {
        if (sh.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > SHEAR_HIT_RADIUS + t.displayWidth * 0.25) continue;
        sh.hit.add(t);
        this.strike(sh.owner, t, sh.damage, AIR.sky);
        this.onAttackLanded(sh.owner);
        done = true;
        break;
      }

      if (done) {
        this.fx(sh.owner).motes(sh.x, sh.y, 5, { speed: 150, size: 2.4, life: 340, swirl: 1.8, depth: 6 });
        this.shears.splice(i, 1);
      }
    }
  }

  // ── E: Spin Dance ────────────────────────────────────────────────────────

  /** Player press: spends a charge, decides spin-or-flip, then resolves it. */
  private trySpin(mouseX: number, mouseY: number): void {
    const s = this.sides.player;
    if (s.spinCharges < 1) return;
    // Kit-owned charges skip `castAbility`, so the gates it would have applied are applied
    // here instead — otherwise Spin Dance would be the one ability a disarm could not stop.
    const p = this.arena.player;
    const wall = Date.now();
    if (wall < p.disarmedUntil || wall < p.silencedUntil || wall < p.chickenUntil) return;
    s.spinCharges -= 1;
    // Kit-owned charges still have to stamp the cast, or the sound, the online relay and the
    // Wrenched backfire all silently skip Spin Dance.
    p.triggerCooldown('spin-dance');
    this.resolveSpin('player', mouseX, mouseY, true);
  }

  /** NPC / online replay entry point. */
  doSpinDance(owner: Owner, tx: number, ty: number): void {
    if (owner === 'player') { this.resolveSpin('player', tx, ty, true); return; }
    this.sides.npc.spinCharges = Math.max(0, this.sides.npc.spinCharges - 1);
    this.resolveSpin('npc', tx, ty, true);
  }

  /**
   * The turn itself. `chargeCast` is false for the free Whirlwind copy, which must not arm the
   * E+ pair or the upgrade would pay out on clicks rather than on dancing.
   */
  private resolveSpin(owner: Owner, tx: number, ty: number, chargeCast: boolean): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    const fx = this.fx(owner);
    const ang = this.aimOf(owner, tx, ty);
    const time = this.now;

    // E+ (Expert Dancer): a second cast inside the window is a flip along the aim instead of
    // another circle — different shape, same payoff, so the pair reads as choreography.
    const isFlip = chargeCast
      && owner === 'player'
      && this.arena.hasUpgrade('e')
      && s.spinPairArmed
      && time - s.lastSpinAt <= FLIP_WINDOW_MS;

    this.setFanSpread(owner, 1);
    let landed = false;

    if (isFlip) {
      this.avatar(owner)?.play('dash', ang, 380);
      fx.flipCut(f.x, f.y, ang, FLIP_HALF_LEN, FLIP_HALF_WID);
      this.arena.showFloatingText(f.x, f.y - 46, '🤸 FLIP!', '#e4f2ff');
      // Rectangle centred on her, long side along the aim.
      const cos = Math.cos(ang), sin = Math.sin(ang);
      for (const t of this.targetsOf(owner)) {
        const dx = t.x - f.x, dy = t.y - f.y;
        const along = dx * cos + dy * sin;
        const across = -dx * sin + dy * cos;
        if (Math.abs(along) > FLIP_HALF_LEN || Math.abs(across) > FLIP_HALF_WID) continue;
        this.strike(owner, t, SPIN_DAMAGE, AIR.mist);
        landed = true;
      }
    } else {
      this.avatar(owner)?.play('sweep', ang, 420);
      fx.spinFlourish(f.x, f.y, SPIN_RADIUS);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SPIN_RADIUS + t.displayWidth * 0.25) continue;
        this.strike(owner, t, SPIN_DAMAGE, AIR.frost);
        landed = true;
      }
    }

    if (landed) {
      this.onAttackLanded(owner);
      // Contact is what buys tempo: a spin that hits hands the rest of the kit two seconds.
      const removed = f.reduceCooldowns(SPIN_CD_REFUND_MS, 'spin-dance');
      if (removed > 0) {
        this.arena.showFloatingText(f.x, f.y - 58, `⏩ -${(removed / 1000).toFixed(1)}s CD`, '#aaddff');
        if (owner === 'player') this.arena.recordMasteryStat('spinRefundSeconds', removed / 1000);
      }
      fx.ring(f.x, f.y, 10, SPIN_RADIUS * 0.8, AIR.cyan, 380, 4, 6);
    }

    if (chargeCast && owner === 'player' && this.arena.hasUpgrade('e')) {
      if (isFlip) {
        // Both halves clean — that is the upgrade's actual reward.
        if (s.spinPairHit && landed) this.addDodge('player', EXPERT_PAIR_DODGE, 'EXPERT');
        s.spinPairArmed = false;
        s.spinPairHit = false;
      } else {
        s.spinPairArmed = true;
        s.spinPairHit = landed;
      }
    }
    s.lastSpinAt = time;
  }

  // ── R: Gale Glaive ───────────────────────────────────────────────────────

  /** Both fans lock together and leave her hands. */
  doGaleGlaive(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = this.aimOf(owner, tx, ty);

    this.avatar(owner)?.play('punch', ang);
    // Her hands are empty until it comes home.
    this.setFanSpread(owner, 0.1);
    this.fx(owner).muzzleGust(f.x, f.y, ang, 1.2);

    this.glaives.push({
      owner,
      x: f.x, y: f.y,
      parkX: tx, parkY: ty,
      phase: 'out',
      until: 0,
      spin: 0,
      lastTickAt: 0,
      hit: new Set(),
    });
  }

  private updateGlaives(time: number, dt: number): void {
    for (let i = this.glaives.length - 1; i >= 0; i--) {
      const g = this.glaives[i];
      g.spin += dt * 22;
      const owner = g.owner;
      const caster = this.fighter(owner);

      if (g.phase === 'out') {
        const dx = g.parkX - g.x, dy = g.parkY - g.y;
        const d = Math.hypot(dx, dy);
        const step = GLAIVE_SPEED * dt;
        if (d <= step) {
          g.x = g.parkX; g.y = g.parkY;
          g.phase = 'park';
          g.until = time + GLAIVE_PARK_MS;
          g.lastTickAt = time;
          this.fx(owner).ring(g.x, g.y, 8, GLAIVE_RADIUS * 2.2, AIR.mist, 360, 4, 6);
        } else {
          g.x += (dx / d) * step;
          g.y += (dy / d) * step;
        }
        this.glaiveSweep(g, GLAIVE_OUT_DAMAGE, false);

      } else if (g.phase === 'park' || g.phase === 'phantom') {
        const tickDmg = g.phase === 'phantom' ? AFTERIMAGE_TICK_DAMAGE : GLAIVE_TICK_DAMAGE;
        if (time - g.lastTickAt >= GLAIVE_TICK_MS) {
          g.lastTickAt = time;
          let landed = false;
          for (const t of this.targetsOf(owner)) {
            if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > GLAIVE_RADIUS + t.displayWidth * 0.3) continue;
            this.strike(owner, t, tickDmg, AIR.cyan);
            landed = true;
          }
          if (landed) this.onAttackLanded(owner);
        }
        if (time >= g.until) {
          if (g.phase === 'phantom') {
            this.fx(owner).motes(g.x, g.y, 8, { speed: 110, size: 2.6, life: 520, swirl: 2, depth: 6 });
            this.glaives.splice(i, 1);
            continue;
          }
          // R+ (Gale Afterimage): the fans go home, but the memory of them stays parked.
          if (owner === 'player' && this.arena.hasUpgrade('r')) {
            this.glaives.push({
              owner,
              x: g.x, y: g.y, parkX: g.x, parkY: g.y,
              phase: 'phantom',
              until: time + AFTERIMAGE_MS,
              spin: g.spin,
              lastTickAt: time,
              hit: new Set(),
            });
            this.arena.showFloatingText(g.x, g.y - 32, '🌳 AFTERIMAGE', '#b4854a');
          }
          g.phase = 'back';
          g.hit.clear();
        }

      } else { // 'back'
        if (!this.alive(caster)) { this.glaives.splice(i, 1); continue; }
        const dx = caster.x - g.x, dy = caster.y - g.y;
        const d = Math.hypot(dx, dy);
        const step = GLAIVE_SPEED * dt;
        if (d <= step) {
          this.fx(owner).bloom(caster.x, caster.y, 46, 8, 6);
          this.setFanSpread(owner, 1);
          this.glaives.splice(i, 1);
          continue;
        }
        g.x += (dx / d) * step;
        g.y += (dy / d) * step;
        this.glaiveSweep(g, GLAIVE_BACK_DAMAGE, true);
      }
    }
  }

  /** Contact damage along a travelling leg; the homeward leg is the one that pays dodge. */
  private glaiveSweep(g: Glaive, damage: number, returning: boolean): void {
    for (const t of this.targetsOf(g.owner)) {
      if (g.hit.has(t)) continue;
      if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > GLAIVE_RADIUS + t.displayWidth * 0.3) continue;
      g.hit.add(t);
      this.strike(g.owner, t, damage, returning ? AIR.white : AIR.frost);
      this.onAttackLanded(g.owner);
      if (returning) {
        this.arena.showFloatingText(t.x, t.y - 34, '🌀 CAUGHT!', '#e4f2ff');
        this.addDodge(g.owner, GLAIVE_DODGE, 'GALE');
        if (g.owner === 'player') this.arena.recordMasteryStat('glaiveReturns', 1);
      }
    }
  }

  // ── F: Sky Grapple ───────────────────────────────────────────────────────

  /**
   * Hook, then haul. The flight itself is untouchable — the dancer is not there to be hit — and
   * landing pays out dodge whether or not the line caught anybody.
   */
  doSkyGrapple(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    // Hawk perk: F stops being a hook and becomes a bird that hauls *them* instead of her.
    if (owner === 'player' && this.arena.hasPerk('player', 'hawk')) {
      this.spawnHawk(tx, ty);
      return;
    }

    const s = this.sides[owner];
    const dx = tx - f.x, dy = ty - f.y;
    const len = Math.hypot(dx, dy) || 1;
    const flight = Math.min(GRAPPLE_MAX_MS, (len / GRAPPLE_SPEED) * 1000);
    const ang = Math.atan2(dy, dx);

    this.body(f).setVelocity((dx / len) * GRAPPLE_SPEED, (dy / len) * GRAPPLE_SPEED);
    s.invulnUntil = this.now + flight + 60;
    if (owner === 'player') this.arena.isDodging = true;

    const fx = this.fx(owner);
    fx.hookLine(f.x, f.y, tx, ty, Math.max(160, flight));
    fx.slipstream(f.x, f.y, tx, ty);
    this.avatar(owner)?.play('dash', ang);
    this.setFanSpread(owner, 0.3);

    // F+ (Final Flight): anything the line runs through is rammed on the way past, and paid
    // for out of the last ten seconds of your own work.
    if (owner === 'player' && this.arena.hasUpgrade('f')) this.finalFlight(f, dx, dy, len);

    this.arena.scene.time.delayedCall(flight, () => {
      if (!this.alive(f)) { if (owner === 'player') this.arena.isDodging = false; return; }
      this.body(f).setVelocity(0, 0);
      if (owner === 'player') this.arena.isDodging = false;
      fx.bloom(f.x, f.y, 64, 11, 5);
      fx.dustMark(f.x, f.y, 44);
      fx.featherPuff(f.x, f.y, 7);
      this.setFanSpread(owner, 1);
      this.addDodge(owner, GRAPPLE_DODGE, 'SKY');
    });
  }

  /** The ram half of F+: knockback, a share of your recent damage, and dodge equal to it. */
  private finalFlight(f: Fighter, dx: number, dy: number, len: number): void {
    const time = this.now;
    const banked = this.ledgerTotal('player', time);
    if (banked <= 0) return;

    for (const t of this.targetsOf('player')) {
      // Perpendicular distance from the target to the hook line.
      const proj = Phaser.Math.Clamp(((t.x - f.x) * dx + (t.y - f.y) * dy) / (len * len), 0, 1);
      const px = f.x + dx * proj, py = f.y + dy * proj;
      if (Phaser.Math.Distance.Between(t.x, t.y, px, py) > RAM_RADIUS) continue;

      const dmg = Math.round(banked * FINAL_FLIGHT_SHARE);
      if (dmg <= 0) continue;
      t.takeDamage(dmg);
      // A ram never banks itself. The ledger is polled from `rawDamageTaken` deltas, so
      // without moving the watermark past this hit the next frame would read the ram as
      // fresh damage dealt and refill the ledger it just spent — every grapple paying for
      // the next one, compounding as long as they keep landing.
      this.ledgerSeen.set(t, t.rawDamageTaken);
      this.arena.spawnHitFlash(t.x, t.y, AIR.white);
      this.pfx.gustBurst(t.x, t.y, 72, { duration: 420, dust: false });
      this.pfx.featherPuff(t.x, t.y, 8);
      this.arena.showFloatingText(t.x, t.y - 44, '🕊️ FINAL FLIGHT!', '#ffffff');

      if (!t.knockbackImmune) {
        const ka = Math.atan2(dy, dx);
        this.body(t).setVelocity(Math.cos(ka) * FINAL_FLIGHT_KNOCKBACK, Math.sin(ka) * FINAL_FLIGHT_KNOCKBACK);
      }
      // Dodge equal to the damage it did, read as a percentage — a 60-damage ram is +60%.
      this.addDodge('player', dmg / 100, 'FLIGHT');
      this.onAttackLanded('player');
      // The ledger is cashed in, not merely read: it cannot be spent twice on one dive.
      this.sides.player.ledger = [];
      break;
    }
  }

  // ── Q: Wind Breaker ──────────────────────────────────────────────────────

  /**
   * She stops being a dancer and becomes the weather: everything in reach is dragged into orbit
   * around her, ground down for five seconds, then thrown along the cursor until it finds a wall.
   */
  doWindBreaker(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    const fx = this.fx(owner);

    s.tornadoUntil = this.now + TORNADO_MS;
    s.tornadoLastTickAt = this.now;
    s.tornadoCaptives.clear();
    this.tornadoAim[owner] = { x: tx, y: ty };

    this.avatar(owner)?.play('raise');
    this.setFanSpread(owner, 1);
    fx.updraft(f.x, f.y, 36, 130, 5);
    fx.ring(f.x, f.y, 14, TORNADO_RADIUS * 1.2, AIR.mist, 520, 5, 5);
    fx.dustMark(f.x, f.y, TORNADO_RADIUS * 0.8);
    this.arena.showFloatingText(f.x, f.y - 52, '🌪️ WIND BREAKER!', '#c0c8d0');
    this.arena.scene.cameras.main.shake(240, 0.004);
  }

  /** Where each side's funnel will throw its catch — refreshed from the cursor while it runs. */
  private tornadoAim: Record<Owner, { x: number; y: number }> = {
    player: { x: 0, y: 0 },
    npc: { x: 0, y: 0 },
  };

  private updateTornado(time: number, dt: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (s.tornadoUntil === 0) continue;
      const f = this.fighter(owner);

      if (time >= s.tornadoUntil || !this.alive(f)) {
        if (s.tornadoUntil !== 0) this.burstTornado(owner);
        continue;
      }
      // The player keeps steering the throw right up to the moment it happens.
      if (owner === 'player') this.tornadoAim.player = { x: this.lastMouseX, y: this.lastMouseY };

      // Capture: anything that touches the funnel is taken for the rest of it.
      for (const t of this.targetsOf(owner)) {
        if (s.tornadoCaptives.has(t)) continue;
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d > TORNADO_RADIUS) continue;
        s.tornadoCaptives.set(t, {
          angle: Math.atan2(t.y - f.y, t.x - f.x),
          dist: Phaser.Math.Clamp(d, TORNADO_ORBIT_MIN, TORNADO_ORBIT_MAX),
        });
        this.arena.showFloatingText(t.x, t.y - 38, '🌪️ SWEPT UP!', '#c0c8d0');
        this.fx(owner).bloom(t.x, t.y, 54, 9, 5);
      }

      // Orbit: captives are placed, not pushed. Enemy AI rewrites its own velocity every frame,
      // so anything short of a position write loses the tug of war.
      const wb = this.arena.worldBounds;
      for (const [t, hold] of s.tornadoCaptives) {
        if (!this.alive(t)) { s.tornadoCaptives.delete(t); continue; }
        hold.angle += TORNADO_ORBIT_SPEED * dt;
        // Reeled slowly inward, so the ride visibly tightens rather than sitting at one radius.
        hold.dist = Math.max(TORNADO_ORBIT_MIN, hold.dist - 22 * dt);
        const b = this.body(t);
        b.setVelocity(0, 0);
        b.reset(
          Phaser.Math.Clamp(f.x + Math.cos(hold.angle) * hold.dist, wb.x + b.halfWidth, wb.right - b.halfWidth),
          Phaser.Math.Clamp(f.y + Math.sin(hold.angle) * hold.dist, wb.y + b.halfHeight, wb.bottom - b.halfHeight),
        );
      }

      // Grind. Storm (divine) turns the funnel into a thunderhead: every grind is a strike.
      if (time - s.tornadoLastTickAt >= TORNADO_TICK_MS) {
        s.tornadoLastTickAt = time;
        const storm = this.arena.hasPerk(owner, 'storm');
        for (const t of s.tornadoCaptives.keys()) {
          if (!this.alive(t)) continue;
          const before = t.hp;
          if (storm) this.fx(owner).staticSnap(t.x, t.y, 26);
          this.strike(owner, t, TORNADO_TICK_DAMAGE + (storm ? STORM_BOLT_DAMAGE : 0), storm ? AIR.charge : AIR.steel);
          if (owner === 'player' && before > 0 && t.hp <= 0) {
            this.arena.recordMasteryStat('tornadoKills', 1);
            this.arena.showFloatingText(t.x, t.y - 44, '🌪️ TORN APART!', '#ccddff');
          }
        }
      }
    }
  }

  /** The funnel opens: everything it was holding is thrown along the aim until a wall stops it. */
  private burstTornado(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const fx = this.fx(owner);
    const aim = this.tornadoAim[owner];
    const origin = this.alive(f) ? { x: f.x, y: f.y } : { x: aim.x, y: aim.y };
    const ang = Math.atan2(aim.y - origin.y, aim.x - origin.x);

    for (const t of s.tornadoCaptives.keys()) {
      if (!this.alive(t)) continue;
      this.launches.push({
        owner,
        target: t,
        vx: Math.cos(ang) * LAUNCH_SPEED,
        vy: Math.sin(ang) * LAUNCH_SPEED,
        // Safety net only — the wall is what actually ends the flight.
        expireAt: this.now + 2500,
      });
      this.arena.showFloatingText(t.x, t.y - 38, '💨 THROWN!', '#e4f2ff');
      fx.slipstream(t.x, t.y, t.x + Math.cos(ang) * 200, t.y + Math.sin(ang) * 200);
    }

    s.tornadoCaptives.clear();
    s.tornadoUntil = 0;
    if (this.alive(f)) {
      fx.gustBurst(f.x, f.y, TORNADO_RADIUS * 0.9, { curls: 24, haze: 5, duration: 560 });
      fx.updraft(f.x, f.y, 42, 160, 6);
      this.setFanSpread(owner, 1);
    }
    this.arena.scene.cameras.main.shake(220, 0.006);
  }

  private updateLaunches(time: number, dt: number): void {
    const wb = this.arena.worldBounds;
    for (let i = this.launches.length - 1; i >= 0; i--) {
      const l = this.launches[i];
      const t = l.target;
      if (!this.alive(t)) { this.launches.splice(i, 1); continue; }

      const b = this.body(t);
      b.setVelocity(l.vx, l.vy);
      const nx = t.x + l.vx * dt, ny = t.y + l.vy * dt;

      const hitWall = nx <= wb.x + b.halfWidth + 2 || nx >= wb.right - b.halfWidth - 2
        || ny <= wb.y + b.halfHeight + 2 || ny >= wb.bottom - b.halfHeight - 2;

      if (hitWall || time >= l.expireAt) {
        b.setVelocity(0, 0);
        if (hitWall) {
          this.strike(l.owner, t, LAUNCH_WALL_DAMAGE, AIR.white);
          this.arena.showFloatingText(t.x, t.y - 40, '🚧 SLAMMED!', '#ffffff');
          this.fx(l.owner).gustBurst(t.x, t.y, 70, { duration: 400 });
          this.arena.scene.cameras.main.shake(160, 0.005);
          if (l.owner === 'player') this.onAttackLanded('player');
        }
        this.launches.splice(i, 1);
      }
    }
  }

  // ── Mastery: Winds of Change ─────────────────────────────────────────────

  private tryWindsOfChange(time: number): void {
    const s = this.sides.player;
    if (time - s.windsLastCastAt < WINDS_COOLDOWN_MS) return;
    s.windsLastCastAt = time;
    this.doWindsOfChange('player');
    this.arena.broadcastMasteryCast('winds-of-change');
  }

  /** Blossom on the wind: everything comes back at once, and the dodge pool grows with it. */
  doWindsOfChange(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    f.clearAllCooldowns();
    this.sides[owner].spinCharges = this.maxSpinCharges(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).petalBurst(f.x, f.y, 90, 16);
    this.arena.showFloatingText(f.x, f.y - 56, '🌸 WINDS OF CHANGE!', '#ffd2e4');
    this.addDodge(owner, WINDS_DODGE, 'WINDS');
  }

  /** 0–1 cooldown fill for the Winds of Change HUD card. */
  getWindsCooldownRatio(time: number): number {
    return Math.min(1, (time - this.sides.player.windsLastCastAt) / WINDS_COOLDOWN_MS);
  }

  // ── Public accessors read by ArenaScene ──────────────────────────────────

  /** Dancer's Momentum, plus the stride the tornado costs her. */
  getPlayerSpeedMult(): number {
    const s = this.sides.player;
    let mult = this.arena.masteryActive ? 1 + s.momentum : 1;
    if (this.now < s.tornadoUntil) mult *= TORNADO_SPEED_MULT;
    return mult;
  }

  getNpcSpeedMult(): number {
    const s = this.sides.npc;
    return this.now < s.tornadoUntil ? TORNADO_SPEED_MULT : 1;
  }

  /** Wind Breaker is up on that side — ArenaScene reads it for the ability card. */
  isTornadoActive(owner: Owner): boolean {
    return this.now < this.sides[owner].tornadoUntil;
  }

  /**
   * 0–1 fill for the Spin Dance card. Charges, not a cooldown: the card is full the moment one
   * charge is banked and drains toward the next, so a second stored charge is invisible on the
   * bar — that is what `getSpinCharges` is for.
   */
  getSpinChargeRatio(): number {
    return Math.min(1, this.sides.player.spinCharges);
  }

  /** Whole charges banked, for the count drawn on the Spin Dance card. */
  getSpinCharges(): number {
    return Math.floor(this.sides.player.spinCharges);
  }

  /** Current wind dodge as a fraction — read by the NPC AI and the ability bar. */
  getWindDodge(owner: Owner = 'player'): number {
    return this.sides[owner].dodge;
  }

  /** The Hawk has a catch in the air — ArenaScene counts that as the NPC being locked. */
  isNpcHawkDragged(): boolean {
    return this.hawkDragUntil > 0;
  }

  /** Captives cannot act — ArenaScene counts an NPC in the funnel as locked. */
  isNpcSwept(): boolean {
    const npc = this.arena.npc;
    if (!npc) return false;
    return this.sides.player.tornadoCaptives.has(npc)
      || this.launches.some((l) => l.target === npc);
  }

  // ── Character rig ────────────────────────────────────────────────────────

  /** One-shot arm gesture on the player's rig, aimed at the cursor unless told otherwise. */
  playPlayerGesture(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.playerAvatar?.play(gesture, angle ?? this.playerAim(), duration);
  }

  /** Sustained pose for the length of a channel. Lapses on its own so nothing can strand it. */
  setPlayerHold(hold: ArmHold, durationMs = 0, angle?: number): void {
    this.playerHold = hold;
    this.playerHoldAngle = angle ?? this.playerAim();
    this.playerHoldUntil = hold ? this.arena.scene.time.now + durationMs : 0;
  }

  /** Fans open or shut. A skin's rig has no fans, so this is a no-op there rather than a crash. */
  private setFanSpread(owner: Owner, open: number): void {
    const av = this.avatar(owner);
    if (av instanceof AirAvatar) av.setFanSpread(open);
  }

  /**
   * The palette a side's funnel is painted in. With Storm equipped it darkens into a
   * thunderhead; everyone else gets air's own blues.
   */
  private weatherCol(owner: Owner): AirColorFn {
    const col = this.col(owner);
    if (!this.arena.hasPerk(owner, 'storm')) return col;
    return (base) => thunderhead(col(base));
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    const { scene } = this.arena;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new AirAvatar(scene, this.col(owner));
  }

  private updateAvatars(time: number, delta: number): void {
    const { player, npc, isPlayerAir, isNpcAir } = this.arena;

    if (isPlayerAir && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      this.playerAvatar.setFacing(this.playerAim());
      // Wind dodge swells the rig, so how untouchable she is reads off the character itself.
      const bank = Math.min(1, this.sides.player.dodge);
      this.playerAvatar.setIntensity(1 + bank * 0.4);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Arms thrown out wide for the whole of Wind Breaker — she is the funnel, and a rig
      // still jabbing at the cursor would not read as one.
      if (this.now < this.sides.player.tornadoUntil) this.setPlayerHold('ride', 400);
      if (this.playerHold && time >= this.playerHoldUntil) this.playerHold = null;
      this.playerAvatar.setHold(this.playerHold, this.playerHoldAngle);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcAir && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(1 + Math.min(1, this.sides.npc.dodge) * 0.4);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Mirrors the opponent's casts onto their rig. */
  handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = NPC_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
  }

  /**
   * The drafts that ride on a dancer: one per side scaled by banked wind dodge, and the mastery
   * momentum draft under the player's.
   */
  private updateDrafts(delta: number): void {
    const { scene } = this.arena;

    const wire = (
      owner: Owner,
      cur: AirDraft | null,
      on: boolean,
      make: () => AirDraft,
      intensity: number,
    ): AirDraft | null => {
      const f = this.fighter(owner);
      if (!on || !this.alive(f)) {
        if (cur) cur.destroy();
        return null;
      }
      const draft = cur ?? make();
      draft.setIntensity(intensity);
      draft.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
      return draft;
    };

    this.dodgeDraft = wire(
      'player', this.dodgeDraft,
      this.arena.isPlayerAir && this.sides.player.dodge > 0,
      () => new AirDraft(scene, this.pcol, 26, 1.1, 3, 7, AIR.frost),
      0.5 + Math.min(1.5, this.sides.player.dodge) * 0.8,
    );
    this.npcDodgeDraft = wire(
      'npc', this.npcDodgeDraft,
      this.arena.isNpcAir && this.sides.npc.dodge > 0,
      () => new AirDraft(scene, this.ncol, 26, 1.1, 3, 7, AIR.frost),
      0.5 + Math.min(1.5, this.sides.npc.dodge) * 0.8,
    );
    this.momentumDraft = wire(
      'player', this.momentumDraft,
      this.arena.isPlayerAir && this.arena.masteryActive && this.sides.player.momentum > 0,
      () => new AirDraft(scene, this.pcol, 32, 1, 2, 9, AIR.sky),
      0.55 + (this.sides.player.momentum / MOMENTUM_MAX) * 0.95,
    );
  }

  // ── Painting ─────────────────────────────────────────────────────────────

  private paint(): void {
    if (!this.airGfx || !this.airGfx.active) this.airGfx = this.arena.scene.add.graphics().setDepth(8);
    if (!this.groundGfx || !this.groundGfx.active) this.groundGfx = this.arena.scene.add.graphics().setDepth(4);
    const air = this.airGfx;
    const ground = this.groundGfx;
    air.clear();
    ground.clear();

    for (const sh of this.shears) {
      AirFx.drawShear(air, this.col(sh.owner), sh.x, sh.y, Math.atan2(sh.vy, sh.vx), sh.t);
    }
    for (const g of this.glaives) {
      AirFx.drawGlaive(air, this.col(g.owner), g.x, g.y, 26, g.spin, 1, g.phase === 'phantom');
    }

    // The funnel itself, under the fighters so a captive is visible turning inside it.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (this.now >= s.tornadoUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const left = s.tornadoUntil - this.now;
      const alpha = left < 400 ? Math.max(0, left / 400) : 1;
      AirFx.drawTornado(ground, this.weatherCol(owner), f.x, f.y, TORNADO_RADIUS * 0.72, this.vizT, alpha);
    }

    for (const h of this.hawks) {
      if (h.g.active) {
        h.g.clear();
        AirFx.drawHawk(h.g, this.pcol, h.x, h.y, Math.atan2(h.vy, h.vx), h.t);
      }
    }
  }

  // ── Hawk perk ────────────────────────────────────────────────────────────

  /** F becomes a bird: it flies at the cursor and hauls whatever it hits back to the mark. */
  private spawnHawk(targetX: number, targetY: number): void {
    const { player } = this.arena;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const len = Math.hypot(dx, dy) || 1;
    this.hawks.push({
      g: this.arena.scene.add.graphics().setDepth(8),
      x: player.x, y: player.y,
      vx: (dx / len) * 1200,
      vy: (dy / len) * 1200,
      expireAt: this.arena.scene.time.now + 1500,
      t: 0,
    });
    this.pfx.muzzleGust(player.x, player.y, Math.atan2(dy, dx), 1.3);
    this.playPlayerGesture('punch', Math.atan2(dy, dx));
    this.arena.showFloatingText(player.x, player.y - 30, '🦅 HAWK!', '#ffcc44');
  }

  private updateHawks(time: number, delta: number): void {
    const dt = delta / 1000;
    const target = this.arena.npc;

    for (let i = this.hawks.length - 1; i >= 0; i--) {
      const h = this.hawks[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.t += dt;

      if (this.alive(target) && Phaser.Math.Distance.Between(h.x, h.y, target.x, target.y) < 36) {
        const wb = this.arena.worldBounds;
        const eb = this.body(target);
        this.hawkDragX = Phaser.Math.Clamp(this.arena.pointerX, wb.x + eb.halfWidth, wb.right - eb.halfWidth);
        this.hawkDragY = Phaser.Math.Clamp(this.arena.pointerY, wb.y + eb.halfHeight, wb.bottom - eb.halfHeight);
        const elen = Phaser.Math.Distance.Between(target.x, target.y, this.hawkDragX, this.hawkDragY);
        this.hawkDragUntil = time + (elen / 1200) * 1000 + 250;
        this.arena.showFloatingText(target.x, target.y - 30, '🦅 SNATCHED!', '#ffcc44');
        this.arena.spawnHitFlash(h.x, h.y, AIR.charge);
        this.pfx.gustBurst(h.x, h.y, 64, { duration: 340, dust: false });
        h.g.destroy();
        this.hawks.splice(i, 1);
        continue;
      }

      if (time >= h.expireAt) {
        this.pfx.motes(h.x, h.y, 6, { speed: 90, size: 2.6, life: 420, swirl: 2, depth: 6 });
        h.g.destroy();
        this.hawks.splice(i, 1);
      }
    }

    this.updateHawkDrag(time, delta);
  }

  private updateHawkDrag(time: number, delta: number): void {
    if (this.hawkDragUntil <= 0) return;
    const target = this.arena.npc;
    if (!this.alive(target)) { this.hawkDragUntil = 0; return; }
    const eb = this.body(target);

    const dx = this.hawkDragX - target.x;
    const dy = this.hawkDragY - target.y;
    const dist = Math.hypot(dx, dy);
    const step = 1200 * (delta / 1000);

    if (dist <= step || time >= this.hawkDragUntil) {
      target.setPosition(this.hawkDragX, this.hawkDragY);
      eb.reset(this.hawkDragX, this.hawkDragY);
      this.hawkDragUntil = 0;
      this.pfx.bloom(this.hawkDragX, this.hawkDragY, 58, 10, 5);
      this.pfx.dustMark(this.hawkDragX, this.hawkDragY, 42);
      return;
    }
    eb.setVelocity((dx / dist) * 1200, (dy / dist) * 1200);
    if (Math.random() < 0.35) {
      this.pfx.motes(target.x, target.y, 1, {
        angle: Math.atan2(-dy, -dx), spread: 0.5, speed: 70, size: 2.4, life: 340, depth: 5,
      });
    }
  }
}

/**
 * Storm perk shading: drags a colour down into thunderhead territory — much darker, and what
 * light is left pushed blue, so a charged funnel reads as weather rather than as a dimmed one.
 */
function thunderhead(c: number): number {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return (Math.round(r * 0.40) << 16) | (Math.round(g * 0.46) << 8) | Math.round(b * 0.58 + 26);
}
