import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  BEAST_TONES, HELL_TONES, HUNT, HUNTER_TONES, HuntAura, HuntAvatar, HuntColorFn, HuntForm,
  HuntFx, HuntTones, MOON_TONES, NPC_TONES, SILVER_TONES,
} from './HuntVisuals';

/**
 * Hunt — the whole element: three forms, their fifteen abilities, every world object they
 * leave behind, and the mastery layer on top.
 *
 * Nothing here uses a Phaser sprite. Bolts, grenades, trail marks, searing gashes and the
 * hook chain are all plain data repainted into two Graphics layers every frame, which is what
 * lets a bolt stay buried in a moving enemy and a grenade tumble while its fuse burns down.
 *
 * The one thing Hunt does that no other element does is take the controls away from you. The
 * beast comes out on a timer whether you want it or not, and in hybrid form its spirit seizes
 * the body every ten seconds. Both are enforced here, in `update`, after ArenaScene has already
 * resolved WASD for the frame — so the override always wins.
 */

// ── Human form ───────────────────────────────────────────────────────────────

const CROSSBOW_DMG = 30;
const CROSSBOW_SPEED = 780;
/** How many bolts can be buried in one body at once. The fourth simply doesn't stick. */
const MAX_STUCK = 3;

const BLAST_DMG = 15;
const BLAST_RANGE = 168;
const BLAST_HALF_ANGLE = Phaser.Math.DegToRad(25);
const BLAST_KNOCKBACK = 620;
const BLAST_MAX_CHARGES = 2;
const BLAST_RECHARGE_MS = 6000;
/** E+ Mine Blast: hold time that reaches full power, and what full power is worth. */
const MINE_MAX_CHARGE_MS = 3000;
const MINE_MAX_DMG = 35;
const MINE_STUN_MS = 3000;

const GRENADE_SPEED = 500;
const GRENADE_THROW_RANGE = 145;
const GRENADE_FUSE_MS = 3000;
const GRENADE_DMG = 35;
const GRENADE_RADIUS = 130;
/** R+ Grenade Combo: a bolt that eats a grenade carries the blast to whatever it hits. */
const BOMB_BOLT_DMG = 35;
const BOMB_BOLT_RADIUS = 92;

const TRAIL_DURATION_MS = 8000;
const TRAIL_MARK_LIFE_MS = 4000;
const TRAIL_MARK_INTERVAL_MS = 150;
const TRAIL_RADIUS = 30;
const TRAIL_SPEED_MULT = 1.5;
/** F+ Enhanced Scent. */
const SCENT_BEAST_SPEED_MULT = 1.25;
const SCENT_SLOW_MULT = 0.8;
const SCENT_SLOW_MS = 3000;

/** Click+ Tracking Arrows: ping period by how many bolts are buried, index 1..3. */
const TRACK_PERIOD_MS = [0, 9000, 6000, 3000];
const TRACK_SPEED_MULT = 1.25;
const TRACK_SPEED_MS = 2000;

/** Release the Beast: it is a clock, not a button. */
const BEAST_FIRST_DELAY_MS = 30000;
const BEAST_DURATION_MS = 12000;
const BEAST_RECHARGE_MS = 50000;
const MOON_BEAST_BONUS_MS = 5000;

// ── Beast form ───────────────────────────────────────────────────────────────

const SLASH_DMG = 5;
const SLASH_BOLT_DMG = 15;
const SLASH_STUNNED_BONUS = 5;
const SLASH_RANGE = 80;

const POUNCE_DIST = 215;
const POUNCE_MS = 220;
const POUNCE_DMG = 25;
const POUNCE_RADIUS = 88;
const SEAR_DMG = 4;
const SEAR_TICK_MS = 500;
const SEAR_LIFE_MS = 6000;
const SEAR_RADIUS = 26;

const ROAR_HALF_ANGLE = Phaser.Math.DegToRad(15);   // 30° cone
const ROAR_SLOW_MULT = 0.75;
const ROAR_SLOW_MS = 5000;
const ROAR_DR_MULT = 0.67;
const ROAR_DR_MS = 5000;
const PRIMAL_FEAR_MS = 3000;

const GRAPPLE_DIST = 250;
const GRAPPLE_MS = 240;
const GRAPPLE_HOLD_MS = 1000;
const GRAPPLE_FLING_SPEED = 780;
const WALL_SLAM_DMG = 20;
const WALL_SLAM_STUN_MS = 2000;

const BLOOD_SCENT_MS = 8000;
const BLOOD_SCENT_SPEED = 1.2;
const BLOOD_SCENT_HASTE = 0.8;          // cooldownMult while it holds
const BLOOD_SCENT_HP_RATIO = 0.3;
const BLOOD_SCENT_HP_RATIO_MOON = 0.5;
const BLOOD_MOON_MS = 20000;

// ── Hell (divine perk) ───────────────────────────────────────────────────────
// The released beast is a hellhound: a smaller, faster, meaner thing that has traded its hide
// for teeth. Every number here rides the existing beast-form paths, so nothing else changes.
const HELL_DR_MULT = 1.25;        // takes 25% more
const HELL_OUTGOING_MULT = 1.3;   // deals 30% more
const HELL_CD_MULT = 1 / 1.2;     // 20% faster attacks
const HELL_SPEED_MULT = 1.3;      // on top of beast form's own 1.5
/** Scale + body radius in place of the beast's 1.2 / 26 — visibly the smaller silhouette. */
const HELL_SCALE = 0.85;
const HELL_BODY_RADIUS = 18;

// ── Hybrid form ──────────────────────────────────────────────────────────────

const PUMP_MS = 500;
const PUMP_BONUS_DMG = 5;
const PUMP_SAFE_MAX = 3;
const OVERLOAD_DMG = 35;
const OVERLOAD_SELF_DMG = 10;
const OVERLOAD_RADIUS = 96;

const ROLL_DIST = 215;
const ROLL_MS = 300;

const HOOK_SPEED = 800;
const HOOK_RANGE = 340;
const HOOK_HIT_R = 20;
const HOOK_PULL_SPEED = 640;
/** R+ Scrape: damage per 100px dragged. A long pull hurts; a short one barely registers. */
const SCRAPE_DMG_PER_100 = 12;

const ADRENALINE_MS = 8000;
const ADRENALINE_BOOST = 1.33;
const CRASH_MS = 5000;
const CRASH_MULT = 0.75;
const CRASH_DELAY_HP = 20;

const SPIRIT_INTERVAL_MS = 10000;
const SPIRIT_MS = 3000;

const ALPHA_DR_MULT = 0.67;
const ALPHA_CD_MULT = 0.8;

// ── Mastery: Weak Points (passive) ───────────────────────────────────────────

const WEAK_HALF_ANGLE = Phaser.Math.DegToRad(30);
const WEAK_SPIN_RAD_PER_SEC = 0.9;
const WEAK_INNER_R = 24;
const WEAK_OUTER_R = 54;
const WEAK_DMG_MULT = 2;

// ── Mastery: Beastling (bindable) ────────────────────────────────────────────

const BEASTLING_DURATION_MS = 15000;
const BEASTLING_COOLDOWN_MS = 30000;
const BITE_INTERVAL_MS = 2000;
const BITE_DMG = 5;
const BITE_BOLT_MULT = 2;
const BITE_RANGE = 34;
const PUP_SPEED = 210;
const PUP_TRAIL_SPEED_MULT = 1.5;
const PUP_FOLLOW_DIST = 46;
const PUP_AGGRO_RANGE = 420;
const MOON_SPEED_MULT = 1.35;
const MOON_DMG_MULT = 1.6;
const MOON_SCALE = 1.4;
const PUP_ROAR_SLOW_MULT = 0.8;
const PUP_ROAR_SLOW_MS = 5000;
const FETCH_PICKUP_R = 22;
const FETCH_DELIVER_R = 44;

/** Palette — a warm, friendly brown pup, reddened under a Blood Moon. */
const PUP_COAT = 0x8b5a2b;
const PUP_COAT_MOON = 0xa4442c;
const PUP_BELLY = 0xc99a63;
const PUP_BELLY_MOON = 0xd07a5e;
const PUP_MUZZLE = 0xe8cba6;
const PUP_EAR = 0x6b4423;
const PUP_EAR_MOON = 0x7d2e22;

/** Alpha's coat: the beast that came out on purpose is ash-grey, not blood-red. */
const ALPHA_TONES: HuntTones = {
  crust: 0x2a2c30, body: 0x6d7278, wound: 0x9aa0a8, lit: 0xd6dae0, spark: HUNT.white,
};

// ── World objects ────────────────────────────────────────────────────────────

type Owner = 'player' | 'npc';

interface Bolt {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  /** R+ Grenade Combo: this bolt swallowed a grenade and detonates where it lands. */
  bomb: boolean;
  bornAt: number;
}

interface StuckBolt {
  owner: Owner;
  victim: Fighter;
  /** Offset from the victim's centre, so the bolt rides the body instead of a fixed spot. */
  offX: number; offY: number;
  angle: number;
  stuckAt: number;
}

interface Grenade {
  owner: Owner;
  x: number; y: number;
  startX: number; startY: number;
  vx: number; vy: number;
  explodeAt: number;
  stopped: boolean;
  /** Tumble angle, frozen once it lands. */
  spin: number;
  /** A pup has this in its jaws: hidden, fuse frozen. */
  carried: boolean;
}

interface TrailMark {
  owner: Owner;
  x: number; y: number;
  expiresAt: number;
  durationMs: number;
  angle: number;
}

interface SearPatch {
  owner: Owner;
  x: number; y: number;
  angle: number;
  len: number;
  expiresAt: number;
  durationMs: number;
  nextTickAt: number;
}

interface Hook {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  startX: number; startY: number;
  latched: Fighter | null;
  /** Set once the owner recasts R — the chain is winching them in. */
  reeling: boolean;
  /** Distance already dragged, for R+ Scrape. */
  dragged: number;
  bornAt: number;
}

interface Fling {
  owner: Owner;
  victim: Fighter;
  vx: number; vy: number;
  until: number;
  slammed: boolean;
}

interface Beastling {
  owner: Owner;
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  endsAt: number;
  nextBiteAt: number;
  heading: number;
  gait: number;
  tailPhase: number;
  earLag: number;
  blinkUntil: number;
  nextBlinkAt: number;
  lungeUntil: number;
  carrying: Grenade | null;
  carryFuseLeftMs: number;
}

/** Everything one hunter is currently doing. Both sides carry the whole record. */
interface Side {
  owner: Owner;
  form: HuntForm;
  // Human
  blastCharges: number;
  blastRechargeAt: number;
  charging: boolean;
  chargeStartedAt: number;
  trailUntil: number;
  trailAccum: number;
  // The beast clock
  nextBeastAt: number;
  beastUntil: number;
  permanentBeast: boolean;
  alpha: boolean;
  // Beast
  roarDrUntil: number;
  scentUntil: number;
  moonUntil: number;
  /** Any lunge that is currently driving the body (pounce, grapple, roll). */
  dashUntil: number;
  /** Only Grapple catches — a pounce that runs through someone must not grab them. */
  grappleUntil: number;
  grabbed: Fighter | null;
  grabUntil: number;
  // Hybrid
  pumps: number;
  pumpingUntil: number;
  overloaded: boolean;
  rollUntil: number;
  rollInvincible: boolean;
  spiritUntil: number;
  nextSpiritAt: number;
  spiritSlashAt: number;
  adrenalineUntil: number;
  crashUntil: number;
  crashDelays: number;
  // Debuffs this side is inflicting on the other
  slowUntil: number;
  slowMult: number;
  fearUntil: number;
  // Click+ Tracking Arrows
  trackSpeedUntil: number;
  nextTrackPingAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    form: 'human',
    blastCharges: BLAST_MAX_CHARGES,
    blastRechargeAt: 0,
    charging: false,
    chargeStartedAt: 0,
    trailUntil: 0,
    trailAccum: 0,
    nextBeastAt: 0,
    beastUntil: 0,
    permanentBeast: false,
    alpha: false,
    roarDrUntil: 0,
    scentUntil: 0,
    moonUntil: 0,
    dashUntil: 0,
    grappleUntil: 0,
    grabbed: null,
    grabUntil: 0,
    pumps: 0,
    pumpingUntil: 0,
    overloaded: false,
    rollUntil: 0,
    rollInvincible: false,
    spiritUntil: 0,
    nextSpiritAt: 0,
    spiritSlashAt: 0,
    adrenalineUntil: 0,
    crashUntil: 0,
    crashDelays: 0,
    slowUntil: 0,
    slowMult: 1,
    fearUntil: 0,
    trackSpeedUntil: 0,
    nextTrackPingAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface HuntArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  /** Player-only: skips WASD movement while true, so a lunge isn't overwritten same-frame. */
  isDodging: boolean;
  get aimX(): number;
  get aimY(): number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** Skins: maps a hunt visual colour through the owner's skin. */
  huntColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(
    x: number, y: number, radius: number, damage: number, owner: Owner, except?: Fighter,
  ): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Swap the ability tray to the form the local player is wearing. */
  setHudForm(form: HuntForm): void;
  // ── Mastery ──
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

export class HuntKit {
  private api: HuntArenaApi;

  // ── Visuals ──
  private readonly pcol: HuntColorFn;
  private readonly ncol: HuntColorFn;
  private readonly pfx: HuntFx;
  private readonly nfx: HuntFx;
  private playerAvatar: HuntAvatar | null = null;
  private npcAvatar: HuntAvatar | null = null;
  /** Blood Scent's aura, one per side. */
  private scentAura: Record<Owner, HuntAura | null> = { player: null, npc: null };
  /** Under the fighters: trail marks, searing gashes, grenade shadows. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over them: bolts, grenades, chains. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over the arena but under the HUD (which starts at depth 20): the Blood Moon sky. */
  private skyGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter here. */
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private bolts: Bolt[] = [];
  private stuck: StuckBolt[] = [];
  private grenades: Grenade[] = [];
  private trails: TrailMark[] = [];
  private sears: SearPatch[] = [];
  private hooks: Hook[] = [];
  private flings: Fling[] = [];
  /** Set on the first frame of a match so the beast clock starts from the bell. */
  private started = false;
  /**
   * Whether Hunt currently owns each shared Fighter stat. Hunt writes these every frame while
   * it has something to say and exactly once more to clear them, so a neutral hunt frame never
   * stomps a value another system (Rebirth's cooldownMult, a Lust payload) is holding.
   */
  private wroteDr: Record<Owner, boolean> = { player: false, npc: false };
  private wroteCd: Record<Owner, boolean> = { player: false, npc: false };
  private wroteOut: Record<Owner, boolean> = { player: false, npc: false };
  /** Latch for the hybrid possession, so the controls are handed back exactly once. */
  private possessing: Record<Owner, boolean> = { player: false, npc: false };
  /** Latch for the Mine Blast charge bar, so releasing clears it exactly once. */
  private chargedLastFrame = false;

  // ── Mastery: Weak Points ──
  private weakAngle = 0;
  private weakGfx = new Map<Fighter, Phaser.GameObjects.Graphics>();
  private weakPlayerGfx: Phaser.GameObjects.Graphics | null = null;
  private lastWeakLabelAt = -1000;

  // ── Mastery: Beastling ──
  private beastlings: Beastling[] = [];
  /**
   * Absolute timestamp of the last summon. Seeded a full cooldown in the past because the
   * kit's first match runs the constructor and NOT reset(), and readiness is measured against
   * `scene.time.now` — leaving this at 0 would lock the ability for 30s.
   */
  private pupLastCastAt = -BEASTLING_COOLDOWN_MS;
  private npcRoarSlowUntil = 0;
  private playerRoarSlowUntil = 0;

  private trackedEnemies = new WeakSet<Fighter>();

  constructor(api: HuntArenaApi) {
    this.api = api;
    this.pcol = (base) => api.huntColor('player', base);
    this.ncol = (base) => api.huntColor('npc', base);
    this.pfx = new HuntFx(api.scene, this.pcol);
    this.nfx = new HuntFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private col(owner: Owner): HuntColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  fx(owner: Owner): HuntFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is hunt this match. */
  avatar(owner: Owner): HuntAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Which way that side is looking: the player at the cursor, the NPC at the player. Effects
   * that have a front — the head that comes out of a transform, the spine that comes out of the
   * back — need it, and neither one gets an aim vector handed to it.
   */
  private leanOf(owner: Owner): number {
    const f = this.fighter(owner);
    if (owner === 'player') return Math.atan2(this.api.aimY - f.y, this.api.aimX - f.x);
    const p = this.api.player;
    return p ? Math.atan2(p.y - f.y, p.x - f.x) : -Math.PI / 2;
  }

  /** Is this side hunt at all this match? Every ability entry point checks it. */
  private isHunt(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'hunt' : this.api.npcElementId === 'hunt';
  }

  /** Upgrades only ever belong to the local player. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' && this.api.hasUpgrade(slot);
  }

  /** Everything `owner` may hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'player') return this.api.enemies.filter((t) => t.active && t.hp > 0);
    const p = this.api.player;
    return p.active && p.hp > 0 ? [p] : [];
  }

  /** Whoever this side is hunting right now. */
  private quarryOf(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    const list = this.targetsOf(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of list) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private hit(target: Fighter, dmg: number, owner: Owner, color = 0xff4400): void {
    if (dmg <= 0) return;
    target.takeDamage(dmg);
    this.api.spawnHitFlash(target.x, target.y, color);
  }

  private knock(target: Fighter, fromX: number, fromY: number, speed: number): void {
    if (target.knockbackImmune || target.unstoppable) return;
    const dx = target.x - fromX, dy = target.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.body(target).setVelocity((dx / d) * speed, (dy / d) * speed);
  }

  /**
   * Hunt's stun. `earthStunnedUntil` is set so husk AI and ArenaScene's own npc override
   * respect it, but the kit also zeroes velocity itself every frame — that field is not
   * consumed for the player, and Hunt can stun either side.
   */
  private stun(target: Fighter, ms: number, owner: Owner): void {
    if (target.unstoppable) return;
    const until = this.now + ms;
    target.earthStunnedUntil = Math.max(target.earthStunnedUntil, until);
    void owner;
    this.api.showFloatingText(target.x, target.y - 34, '💫 Stunned!', '#ffdd66');
  }

  private isStunned(f: Fighter): boolean {
    return !f.unstoppable && f.earthStunnedUntil > this.now;
  }

  /** Apply a slow the other side has to live with. One channel per attacking side. */
  private slowVictim(owner: Owner, mult: number, ms: number): void {
    const s = this.side(owner);
    s.slowUntil = Math.max(s.slowUntil, this.now + ms);
    s.slowMult = Math.min(s.slowMult === 1 ? mult : s.slowMult, mult);
  }

  private arenaW(): number { return this.api.scene.scale.width; }
  private arenaH(): number { return this.api.scene.scale.height; }

  /**
   * Shades for whatever that side is currently wearing. Every hunt effect takes its colours
   * from here, so a form change recolours the whole element at once.
   */
  tones(owner: Owner): HuntTones {
    const s = this.side(owner);
    if (s.moonUntil > this.now) return MOON_TONES;
    if (s.form === 'beast') {
      if (this.isHellhound(owner)) return HELL_TONES;
      return s.alpha ? ALPHA_TONES : BEAST_TONES;
    }
    if (s.form === 'hybrid') return SILVER_TONES;
    return owner === 'player' ? HUNTER_TONES : NPC_TONES;
  }

  private moonUp(owner: Owner): boolean { return this.side(owner).moonUntil > this.now; }

  // ── Public form queries, read by ArenaScene ────────────────────────────────

  /**
   * Hell (divine perk): true while this side is *currently* the hellhound. Asked per frame
   * rather than latched at transform time, so equipping/clearing the perk between matches can
   * never leave a half-hellhound behind.
   */
  isHellhound(owner: Owner): boolean {
    return this.side(owner).form === 'beast' && this.api.hasPerk(owner, 'hell');
  }

  isBeastForm(owner: Owner): boolean { return this.side(owner).form === 'beast'; }
  isHybridForm(owner: Owner): boolean { return this.side(owner).form === 'hybrid'; }
  isBloodMoonActive(owner: Owner): boolean { return this.moonUp(owner); }
  /** NPC AI: don't re-lay a trail that is still being laid. */
  isTrailActive(owner: Owner): boolean { return this.side(owner).trailUntil > this.now; }
  /** NPC AI: Blast is charge-gated, and its ability cooldown says nothing about that. */
  getBlastCharges(owner: Owner): number { return this.side(owner).blastCharges; }
  /** True while the beast's spirit is driving — ArenaScene must not read WASD. */
  isPossessed(): boolean { return this.sides.player.spiritUntil > this.now; }
  /** Rage perk: the meter only fills while the player is standing in the quarry's tracks. */
  isPlayerOnOwnTrail(): boolean { return this.onOwnTrail('player'); }

  /** Rage perk: 100 rage drags the beast out early, cooldown or not. */
  forceBeast(owner: Owner): void {
    if (this.side(owner).form !== 'human') return;
    this.enterBeast(owner, false);
  }

  reset(): void {
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const o of ['player', 'npc'] as const) {
      this.scentAura[o]?.destroy();
      this.scentAura[o] = null;
    }
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.skyGfx?.destroy(); this.skyGfx = null;
    this.vizT = 0;

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.bolts = [];
    this.stuck = [];
    this.grenades = [];
    this.trails = [];
    this.sears = [];
    this.hooks = [];
    this.flings = [];
    this.started = false;
    this.wroteDr = { player: false, npc: false };
    this.wroteCd = { player: false, npc: false };
    this.wroteOut = { player: false, npc: false };
    this.possessing = { player: false, npc: false };
    this.chargedLastFrame = false;
    this.rightWasDown = false;

    for (const g of this.weakGfx.values()) g.destroy();
    this.weakGfx.clear();
    if (this.weakPlayerGfx) { this.weakPlayerGfx.destroy(); this.weakPlayerGfx = null; }
    this.weakAngle = 0;
    this.lastWeakLabelAt = -1000;

    for (const b of this.beastlings) { b.carrying = null; b.gfx.destroy(); }
    this.beastlings = [];
    this.pupLastCastAt = -BEASTLING_COOLDOWN_MS;
    this.npcRoarSlowUntil = 0;
    this.playerRoarSlowUntil = 0;
    this.trackedEnemies = new WeakSet<Fighter>();
    this.api.setStatusIndicator('beastling-roar', null);
    this.api.setStatusIndicator('hunt-adrenaline', null);
    this.api.setStatusIndicator('hunt-crash', null);
    this.api.setStatusIndicator('hunt-fear', null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Human form
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crossbow Shot. The reload is the interesting part: every *other* ability in the kit
   * clears it, so the rhythm of human form is "bolt, ability, bolt, ability" rather than
   * standing still and plinking.
   */
  doCrossbow(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.bolts.push({
      owner,
      x: f.x + Math.cos(angle) * 22,
      y: f.y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * CROSSBOW_SPEED,
      vy: Math.sin(angle) * CROSSBOW_SPEED,
      bomb: false,
      bornAt: this.now,
    });
    const av = this.avatar(owner);
    av?.play('punch', angle);
    // The string is gone forward and the stock has jumped — both read off the same shot.
    av?.setLoad(0);
    av?.kick(0.7);
    this.fx(owner).boltRelease(f.x + Math.cos(angle) * 26, f.y + Math.sin(angle) * 26, angle, 8, this.tones(owner));
  }

  /** Clears the crossbow reload. Called from every non-Click cast on that side. */
  private reloadCrossbow(owner: Owner): void {
    if (this.side(owner).form !== 'human') return;
    this.fighter(owner).resetCooldown('hunt-crossbow');
  }

  /**
   * Blast (and its charged E+ form). A hitscan cone rather than a spray of pellets: the
   * knockback is the point, and twenty separate bodies arriving at slightly different times
   * made it read as mush.
   */
  doBlast(tx: number, ty: number, chargeMs: number, owner: Owner): void {
    const s = this.side(owner);
    if (s.blastCharges <= 0) return;
    s.blastCharges--;
    if (s.blastRechargeAt <= this.now) s.blastRechargeAt = this.now + BLAST_RECHARGE_MS;

    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const charged = this.up(owner, 'e');
    const k = charged ? Phaser.Math.Clamp(chargeMs / MINE_MAX_CHARGE_MS, 0, 1) : 0;
    const dmg = Math.round(BLAST_DMG + (MINE_MAX_DMG - BLAST_DMG) * k);
    const full = charged && k >= 0.999;

    const av = this.avatar(owner);
    av?.play('punch', angle);
    // Human form walks around with the crossbow up; Blast is the shotgun coming off his back.
    av?.flashWeapon('shotgun', 1100);
    av?.kick(1 + k * 0.4);
    av?.rack();
    const tones = this.tones(owner);
    // The pattern is the ability: BLAST_RANGE and BLAST_HALF_ANGLE are exactly what the shot
    // covers, so what you see the pellets reach is what actually got hit.
    this.fx(owner).shotgunBlast(f.x + Math.cos(angle) * 20, f.y + Math.sin(angle) * 20, angle, {
      range: BLAST_RANGE, halfAngle: BLAST_HALF_ANGLE, pellets: 18 + Math.round(k * 12),
      scale: 1 + k * 0.5, tones, shell: true, depth: 9,
    });
    this.api.scene.cameras.main.shake(full ? 200 : 90, full ? 0.006 : 0.0022);

    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BLAST_RANGE) continue;
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > BLAST_HALF_ANGLE) continue;
      let dealt = dmg;
      const weak = this.weakPointMult(t, f.x, f.y, owner);
      if (weak > 1) { dealt = Math.round(dealt * weak); this.showWeakPointHit(t.x, t.y); }
      this.hit(t, dealt, owner, 0xff7722);
      this.onDamageDealt(owner, t);
      this.knock(t, f.x, f.y, BLAST_KNOCKBACK);
      if (full) this.stun(t, MINE_STUN_MS, owner);
    }
    if (full) this.api.showFloatingText(f.x, f.y - 34, '💣 MINE BLAST', '#ffaa44');
  }

  /** Grenade. Flies a fixed distance, then sits and ticks. */
  doGrenade(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.grenades.push({
      owner,
      x: f.x, y: f.y, startX: f.x, startY: f.y,
      vx: Math.cos(angle) * GRENADE_SPEED,
      vy: Math.sin(angle) * GRENADE_SPEED,
      explodeAt: this.now + GRENADE_FUSE_MS,
      stopped: false,
      spin: angle,
      carried: false,
    });
    this.avatar(owner)?.play('slam', angle);
    this.fx(owner).smoke(f.x + Math.cos(angle) * 16, f.y + Math.sin(angle) * 16, 2, 10, 5);
  }

  /** Hunter's Trail — the quarry starts leaving prints, and they are yours to run on. */
  doTrail(owner: Owner): void {
    const s = this.side(owner);
    s.trailUntil = this.now + TRAIL_DURATION_MS;
    s.trailAccum = 0;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('flex');
    const tones = this.tones(owner);
    this.fx(owner).bloom(f.x, f.y, 30, 8, 4, tones);
    this.fx(owner).ring(f.x, f.y, 10, 62, tones.wound, 380, 3.5, 4);
    this.api.showFloatingText(f.x, f.y - 30, '🐾 On the scent', '#ff8844');
  }

  /** The Q slot in human form is a clock, not a button — but the AI may still poke it. */
  doReleaseBeast(owner: Owner): void {
    if (this.side(owner).form !== 'human') return;
    this.enterBeast(owner, false);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Beast form
  // ═══════════════════════════════════════════════════════════════════════════

  doSlash(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const tones = this.tones(owner);
    const av = this.avatar(owner);
    av?.play('sweep', angle);
    av?.snap(0.8);
    const hx = f.x + Math.cos(angle) * 44;
    const hy = f.y + Math.sin(angle) * 44;
    this.fx(owner).rake(hx, hy, angle, 62, 3, 8, tones);

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SLASH_RANGE) continue;
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > Math.PI / 2) continue;

      // A bolt in the body is a handle. The claw goes for it, tears it out, and the wound
      // it leaves is worth three times a clean swipe.
      const pulled = this.pullOneBolt(t);
      let dmg = pulled ? SLASH_BOLT_DMG : SLASH_DMG;
      if (this.up(owner, 'click') && this.isStunned(t)) dmg += SLASH_STUNNED_BONUS;
      const weak = this.weakPointMult(t, f.x, f.y, owner);
      if (weak > 1) { dmg = Math.round(dmg * weak); this.showWeakPointHit(t.x, t.y); }
      this.hit(t, dmg, owner, pulled ? 0xff2200 : 0xcc4422);
      this.onDamageDealt(owner, t);
      if (pulled) {
        this.api.showFloatingText(t.x, t.y - 30, '🔴 Bolt ripped out!', '#ff4444');
        this.fx(owner).splatter(t.x, t.y, 7, { speed: 190, angle, spread: 1.1, size: 3, life: 480, depth: 8, tones: BEAST_TONES });
      }
    }
  }

  doPounce(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const s = this.side(owner);
    const fromX = f.x, fromY = f.y;
    s.dashUntil = this.now + POUNCE_MS;
    if (owner === 'player') this.api.isDodging = true;
    this.body(f).setVelocity(Math.cos(angle) * (POUNCE_DIST / (POUNCE_MS / 1000)), Math.sin(angle) * (POUNCE_DIST / (POUNCE_MS / 1000)));
    this.avatar(owner)?.play('dash', angle);
    this.avatar(owner)?.snap(1);

    this.api.scene.time.delayedCall(POUNCE_MS, () => {
      if (!f.active) return;
      const tones = this.tones(owner);
      this.fx(owner).pounce(fromX, fromY, f.x, f.y, 5, tones);
      this.fx(owner).rake(f.x, f.y, angle, 110, 4, 8, tones, 18);
      this.api.scene.cameras.main.shake(140, 0.004);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > POUNCE_RADIUS) continue;
        let dmg = POUNCE_DMG;
        const weak = this.weakPointMult(t, fromX, fromY, owner);
        if (weak > 1) { dmg = Math.round(dmg * weak); this.showWeakPointHit(t.x, t.y); }
        this.hit(t, dmg, owner, 0xff3311);
        this.onDamageDealt(owner, t);
      }
      // E+ Searing Slash: the gashes stay in the floor, still hot.
      if (this.up(owner, 'e')) {
        for (let i = -1; i <= 1; i++) {
          const a = angle + i * 0.5;
          this.sears.push({
            owner,
            x: f.x + Math.cos(a) * 34,
            y: f.y + Math.sin(a) * 34,
            angle: a + Math.PI / 2,
            len: 52,
            expiresAt: this.now + SEAR_LIFE_MS,
            durationMs: SEAR_LIFE_MS,
            nextTickAt: 0,
          });
        }
        this.api.showFloatingText(f.x, f.y - 34, '🔥 Searing!', '#ff8833');
      }
    });
  }

  /**
   * Roar. The cone runs to the far corner of the arena, so at range this is a control tool
   * and up close it is a panic button — hitting anything at all buys five seconds of armour.
   */
  doRoar(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const len = Math.hypot(this.arenaW(), this.arenaH());
    const s = this.side(owner);
    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.snap(1);
    this.fx(owner).roarCone(f.x, f.y, angle, ROAR_HALF_ANGLE, len, 9, this.tones(owner));
    this.fx(owner).howl(f.x, f.y, 90, 520, 9, this.tones(owner));
    this.api.scene.cameras.main.shake(220, 0.005);

    let hitAny = false;
    for (const t of this.targetsOf(owner)) {
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > ROAR_HALF_ANGLE) continue;
      hitAny = true;
      this.api.showFloatingText(t.x, t.y - 30, '🔊 −25% speed', '#ffaa66');
      if (this.up(owner, 'r')) {
        // R+ Primal Fear: they turn their back and run. Enforced in update().
        s.fearUntil = this.now + PRIMAL_FEAR_MS;
        this.api.showFloatingText(t.x, t.y - 46, '😱 PRIMAL FEAR', '#ff6644');
      }
    }
    if (hitAny) {
      this.slowVictim(owner, ROAR_SLOW_MULT, ROAR_SLOW_MS);
      s.roarDrUntil = this.now + ROAR_DR_MS;
      this.api.showFloatingText(f.x, f.y - 40, '🛡️ −33% damage taken', '#ffcc88');
    }
    this.onBeastlingRoar(owner);
  }

  doGrapple(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const s = this.side(owner);
    s.dashUntil = this.now + GRAPPLE_MS;
    s.grappleUntil = s.dashUntil;
    if (owner === 'player') this.api.isDodging = true;
    this.body(f).setVelocity(
      Math.cos(angle) * (GRAPPLE_DIST / (GRAPPLE_MS / 1000)),
      Math.sin(angle) * (GRAPPLE_DIST / (GRAPPLE_MS / 1000)),
    );
    this.avatar(owner)?.play('dash', angle);
    this.avatar(owner)?.snap(1);
    this.fx(owner).pounce(f.x, f.y, f.x + Math.cos(angle) * GRAPPLE_DIST, f.y + Math.sin(angle) * GRAPPLE_DIST, 5, this.tones(owner));
    // The catch itself is resolved in update() over the whole lunge, not just at the end.
  }

  doBloodScent(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // Q+ Blood Moon: the sky turns first, and it is the moon that widens the scent.
    if (this.up(owner, 'q')) {
      s.moonUntil = this.now + BLOOD_MOON_MS;
      s.beastUntil = s.permanentBeast ? s.beastUntil : s.beastUntil + MOON_BEAST_BONUS_MS;
      this.api.scene.cameras.main.shake(420, 0.005);
      this.fx(owner).transformBeast(f.x, f.y, 78, MOON_TONES, this.leanOf(owner), 8);
      this.api.showFloatingText(f.x, f.y - 46, '🌕 BLOOD MOON', '#ff4444');
    }
    const ratio = this.moonUp(owner) ? BLOOD_SCENT_HP_RATIO_MOON : BLOOD_SCENT_HP_RATIO;
    const wounded = this.targetsOf(owner).some((t) => t.hp / Math.max(1, t.maxHp) <= ratio);
    if (!wounded) {
      this.api.showFloatingText(f.x, f.y - 30, 'No blood in the air…', '#886666');
      return;
    }
    s.scentUntil = this.now + BLOOD_SCENT_MS;
    this.avatar(owner)?.play('flex');
    this.fx(owner).bloom(f.x, f.y, 40, 10, 6, MOON_TONES);
    this.api.showFloatingText(f.x, f.y - 32, '🔴 BLOOD SCENT', '#ff2244');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Hybrid form
  // ═══════════════════════════════════════════════════════════════════════════

  doHybridShotgun(tx: number, ty: number, owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);

    // Click+ Shotgun Pump: the fourth shell is one too many and it lets go in your hands.
    if (s.overloaded) {
      s.overloaded = false;
      s.pumps = 0;
      const bx = f.x + Math.cos(angle) * 46;
      const by = f.y + Math.sin(angle) * 46;
      this.fx(owner).frag(bx, by, OVERLOAD_RADIUS, { tones: SILVER_TONES, shards: 22, smoke: 5, duration: 620 });
      this.api.scene.cameras.main.shake(300, 0.009);
      this.api.dealAoeDamageFromOwner(bx, by, OVERLOAD_RADIUS, OVERLOAD_DMG, owner);
      f.applySelfDamage(OVERLOAD_SELF_DMG);
      this.api.showFloatingText(f.x, f.y - 40, '💥 IT BLEW UP!', '#ff5533');
      return;
    }

    const dmg = BLAST_DMG + Math.min(s.pumps, PUMP_SAFE_MAX) * PUMP_BONUS_DMG;
    const pumped = s.pumps;
    s.pumps = 0;
    const av = this.avatar(owner);
    av?.play('punch', angle);
    av?.kick(1 + pumped * 0.15);
    av?.rack();
    this.fx(owner).shotgunBlast(f.x + Math.cos(angle) * 20, f.y + Math.sin(angle) * 20, angle, {
      range: BLAST_RANGE, halfAngle: BLAST_HALF_ANGLE, pellets: 16 + pumped * 6,
      scale: 1 + pumped * 0.16, tones: SILVER_TONES, shell: true, depth: 9,
    });
    this.api.scene.cameras.main.shake(90 + pumped * 30, 0.002 + pumped * 0.001);

    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BLAST_RANGE) continue;
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > BLAST_HALF_ANGLE) continue;
      let dealt = dmg;
      const weak = this.weakPointMult(t, f.x, f.y, owner);
      if (weak > 1) { dealt = Math.round(dealt * weak); this.showWeakPointHit(t.x, t.y); }
      this.hit(t, dealt, owner, 0xdddde6);
      this.onDamageDealt(owner, t);
      this.knock(t, f.x, f.y, BLAST_KNOCKBACK * 0.7);
    }
  }

  doRoll(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    s.rollUntil = this.now + ROLL_MS;
    s.dashUntil = s.rollUntil;
    if (owner === 'player') this.api.isDodging = true;
    this.body(f).setVelocity(
      Math.cos(angle) * (ROLL_DIST / (ROLL_MS / 1000)),
      Math.sin(angle) * (ROLL_DIST / (ROLL_MS / 1000)),
    );
    this.avatar(owner)?.play('dash', angle);
    this.fx(owner).smoke(f.x, f.y, 3, 18, 5);
    // E+: nothing lands on you while you are tumbling.
    if (this.up(owner, 'e')) {
      s.rollInvincible = true;
      f.isInvincible = true;
      this.api.showFloatingText(f.x, f.y - 30, '🌀 Untouchable', '#aaddff');
    }
  }

  doHook(tx: number, ty: number, owner: Owner): void {
    const existing = this.hooks.find((h) => h.owner === owner);
    if (existing) {
      // Recast: reel whatever is on the end of the chain.
      if (existing.latched) existing.reeling = true;
      return;
    }
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.hooks.push({
      owner,
      x: f.x, y: f.y, startX: f.x, startY: f.y,
      vx: Math.cos(angle) * HOOK_SPEED,
      vy: Math.sin(angle) * HOOK_SPEED,
      latched: null,
      reeling: false,
      dragged: 0,
      bornAt: this.now,
    });
    this.avatar(owner)?.play('slam', angle);
  }

  doAdrenaline(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // F+ Adrenaline Junkie: recasting before the crash lands pushes it back — and the bill
    // grows every time you do it.
    const delaying = s.adrenalineUntil > this.now || s.crashUntil > this.now;
    if (delaying && this.up(owner, 'f')) {
      s.crashDelays++;
      s.crashUntil = 0;
      this.api.showFloatingText(f.x, f.y - 42, `⏳ Delay ×${s.crashDelays}`, '#ffdd66');
    }
    s.adrenalineUntil = this.now + ADRENALINE_MS;
    s.crashUntil = 0;
    // F+ halves the cooldown. The cast has already stamped, so shift the stamp back rather
    // than trying to teach the ability table about upgrades.
    if (this.up(owner, 'f')) f.reduceCooldown('hunt-adrenaline', 6000);
    this.avatar(owner)?.play('clap');
    this.fx(owner).syringeJab(f.x, f.y - 6, 9);
    this.fx(owner).bloom(f.x, f.y, 34, 8, 5, this.tones(owner));
    this.api.showFloatingText(f.x, f.y - 30, '💉 ADRENALINE', '#66ff99');
  }

  doGiveIn(owner: Owner): void {
    if (this.side(owner).form !== 'hybrid') return;
    this.enterBeast(owner, true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Form transitions
  // ═══════════════════════════════════════════════════════════════════════════

  /** `permanent` marks a Give In transform, which also brings Alpha with it. */
  private enterBeast(owner: Owner, permanent: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.form = 'beast';
    s.permanentBeast = permanent;
    s.alpha = permanent && this.up(owner, 'q');
    s.beastUntil = permanent ? Infinity : this.now + BEAST_DURATION_MS + (this.moonUp(owner) ? MOON_BEAST_BONUS_MS : 0);
    s.pumps = 0;
    s.overloaded = false;
    s.spiritUntil = 0;
    s.charging = false;
    // Hell: a hellhound is the small one. It comes out under the beast's own scale, not over it.
    const hell = this.api.hasPerk(owner, 'hell');
    if (hell) {
      f.setScale(HELL_SCALE);
      const off = (48 - HELL_BODY_RADIUS * 2) / 2;
      this.body(f).setCircle(HELL_BODY_RADIUS, off, off);
    } else {
      f.setScale(1.2);
      this.body(f).setCircle(26, 3, 3);
    }
    // Give In comes out of hybrid form, which was wearing the silver sprite. The beast gets a
    // sprite of its own — a matted fur skull rather than the hunter's hide.
    f.setTexture('elem-hunt-beast');
    if (hell) {
      // Charred over the fur sprite, so the hound reads as burnt rather than bloody.
      f.setTint(0x883322);
    } else if (s.alpha) {
      f.setTint(0xb9bfc6);
      f.cooldownMult = ALPHA_CD_MULT;
    } else {
      f.clearTint();
    }
    const av = this.avatar(owner);
    av?.play('raise');
    av?.snap(1);
    this.fx(owner).transformBeast(
      f.x, f.y, hell ? 44 : 52, hell ? HELL_TONES : s.alpha ? ALPHA_TONES : BEAST_TONES,
      this.leanOf(owner), 8,
    );
    this.api.scene.cameras.main.shake(360, 0.009);
    this.api.showFloatingText(f.x, f.y - 44,
      hell ? '🐕 HELLHOUND' : s.alpha ? '🐺 ALPHA' : permanent ? '🐺 GIVE IN' : '🐺 RELEASE THE BEAST',
      hell ? '#ff6600' : s.alpha ? '#ccd4dd' : '#ff3322');
    if (owner === 'player') this.api.setHudForm('beast');
  }

  private leaveBeast(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.form = 'human';
    s.alpha = false;
    s.charging = false;
    s.permanentBeast = false;
    s.beastUntil = 0;
    s.scentUntil = 0;
    s.nextBeastAt = this.now + BEAST_RECHARGE_MS;
    f.setScale(1);
    this.body(f).setCircle(22, 2, 2);
    f.setTexture('elem-hunt');
    f.clearTint();
    this.fx(owner).transformRevert(f.x, f.y, 44, this.tones(owner), 8);
    this.api.showFloatingText(f.x, f.y - 40, 'The beast lets go…', '#cc9977');
    if (owner === 'player') this.api.setHudForm('human');
  }

  private enterHybrid(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.form = 'hybrid';
    s.nextSpiritAt = this.now + SPIRIT_INTERVAL_MS;
    s.charging = false;
    s.pumps = 0;
    s.overloaded = false;
    f.setScale(1.1);
    this.body(f).setCircle(24, 2, 2);
    f.clearTint();
    f.setTexture('elem-hunt-hybrid');
    const av = this.avatar(owner);
    av?.play('raise');
    av?.snap(0.7);
    this.fx(owner).transformBeast(f.x, f.y, 46, SILVER_TONES, this.leanOf(owner), 8);
    this.api.scene.cameras.main.shake(240, 0.006);
    this.api.showFloatingText(f.x, f.y - 44, '🐺 HYBRID FORM', '#ddddee');
    if (owner === 'player') this.api.setHudForm('hybrid');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bolts
  // ═══════════════════════════════════════════════════════════════════════════

  /** How many of `owner`'s bolts are buried in `victim`. */
  private stuckCount(victim: Fighter, owner?: Owner): number {
    let n = 0;
    for (const b of this.stuck) {
      if (b.victim === victim && (!owner || b.owner === owner)) n++;
    }
    return n;
  }

  /** Rip the newest bolt out of a body. Returns true if there was one. */
  private pullOneBolt(victim: Fighter): boolean {
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      if (this.stuck[i].victim === victim) { this.stuck.splice(i, 1); return true; }
    }
    return false;
  }

  private updateBolts(dt: number): void {
    const time = this.now;
    const W = this.arenaW(), H = this.arenaH();

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      const px = b.x, py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // R+ Grenade Combo: a bolt through your own grenade picks the blast up and carries it.
      if (!b.bomb && this.up(b.owner, 'r')) {
        for (let gi = this.grenades.length - 1; gi >= 0; gi--) {
          const g = this.grenades[gi];
          if (g.owner !== b.owner || g.carried) continue;
          if (Phaser.Math.Distance.Between(b.x, b.y, g.x, g.y) > 22) continue;
          this.grenades.splice(gi, 1);
          b.bomb = true;
          this.fx(b.owner).flash(g.x, g.y, 16, 9, this.tones(b.owner));
          this.fx(b.owner).smoke(g.x, g.y, 2, 14, 6);
          this.api.showFloatingText(g.x, g.y - 24, '💣 BOMB BOLT', '#ffaa33');
          break;
        }
      }

      let consumed = false;
      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > 24) continue;
        const angle = Math.atan2(b.vy, b.vx);
        let dmg = b.bomb ? BOMB_BOLT_DMG : CROSSBOW_DMG;
        const weak = this.weakPointMult(t, px, py, b.owner);
        if (weak > 1) { dmg = Math.round(dmg * weak); this.showWeakPointHit(t.x, t.y); }
        this.hit(t, dmg, b.owner, b.bomb ? 0xff7722 : 0xcc4400);
        this.onDamageDealt(b.owner, t);
        this.fx(b.owner).boltBite(b.x, b.y, angle, 9, this.tones(b.owner));

        if (b.bomb) {
          this.fx(b.owner).frag(b.x, b.y, BOMB_BOLT_RADIUS, { tones: this.tones(b.owner), shards: 16, smoke: 4 });
          this.api.dealAoeDamageFromOwner(b.x, b.y, BOMB_BOLT_RADIUS, BOMB_BOLT_DMG, b.owner, t);
          this.api.scene.cameras.main.shake(200, 0.006);
          this.noteGrenadeHits(b.owner, 1);
        } else if (this.stuckCount(t) < MAX_STUCK) {
          // It stays in. This is the whole point of the weapon.
          this.stuck.push({
            owner: b.owner, victim: t,
            offX: b.x - t.x, offY: b.y - t.y,
            angle, stuckAt: time,
          });
          if (this.stuckCount(t) === 1) this.side(b.owner).nextTrackPingAt = time + TRACK_PERIOD_MS[1];
        }
        consumed = true;
        break;
      }

      if (consumed || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20 || time - b.bornAt > 3000) {
        if (!consumed && b.bomb) {
          this.fx(b.owner).frag(b.x, b.y, BOMB_BOLT_RADIUS * 0.7, { tones: this.tones(b.owner), shards: 10, smoke: 3 });
        }
        this.bolts.splice(i, 1);
      }
    }

    // Buried bolts ride the body, and fall out of a corpse.
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      const s = this.stuck[i];
      if (!s.victim.active || s.victim.hp <= 0) this.stuck.splice(i, 1);
    }
  }

  /**
   * Click+ Tracking Arrows. Every buried bolt is a transmitter; the more of them are in there,
   * the more often they call home. The speed only lands in beast or hybrid form — as a human
   * you are getting the information, not the legs to use it.
   */
  private updateTracking(): void {
    const time = this.now;
    for (const owner of ['player', 'npc'] as const) {
      if (!this.isHunt(owner) || !this.up(owner, 'click')) continue;
      const s = this.side(owner);
      // Count against the most-studded victim — three bolts in one body, not one each in three.
      let best = 0;
      let bestVictim: Fighter | null = null;
      for (const t of this.targetsOf(owner)) {
        const n = this.stuckCount(t, owner);
        if (n > best) { best = n; bestVictim = t; }
      }
      if (best <= 0 || !bestVictim) { s.nextTrackPingAt = 0; continue; }
      const period = TRACK_PERIOD_MS[Math.min(best, 3)];
      if (s.nextTrackPingAt === 0) s.nextTrackPingAt = time + period;
      if (time < s.nextTrackPingAt) continue;
      s.nextTrackPingAt = time + period;
      this.fx(owner).boltPing(bestVictim.x, bestVictim.y, 74, 4, this.tones(owner));
      if (s.form === 'beast' || s.form === 'hybrid') {
        s.trackSpeedUntil = time + TRACK_SPEED_MS;
        const f = this.fighter(owner);
        this.api.showFloatingText(f.x, f.y - 36, '📡 +25% speed', '#ffcc66');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Grenades, trail, sears, hooks, flings
  // ═══════════════════════════════════════════════════════════════════════════

  private explodeGrenade(g: Grenade): void {
    const heavy = this.moonUp(g.owner);
    this.fx(g.owner).frag(g.x, g.y, GRENADE_RADIUS * 0.72, {
      tones: this.tones(g.owner),
      shards: heavy ? 20 : 12,
      smoke: heavy ? 5 : 3,
      duration: heavy ? 620 : 460,
    });
    this.api.scene.cameras.main.shake(heavy ? 220 : 140, heavy ? 0.007 : 0.004);
    let hits = 0;
    for (const t of this.targetsOf(g.owner)) {
      if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > GRENADE_RADIUS) continue;
      this.hit(t, GRENADE_DMG, g.owner, 0xff6600);
      this.onDamageDealt(g.owner, t);
      hits++;
    }
    this.noteGrenadeHits(g.owner, hits);
  }

  private updateGrenades(dt: number): void {
    const time = this.now;
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      if (g.carried) continue;
      if (!g.stopped) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.spin += dt * 11;
        if (Phaser.Math.Distance.Between(g.startX, g.startY, g.x, g.y) >= GRENADE_THROW_RANGE) g.stopped = true;
      }
      if (time >= g.explodeAt) {
        this.explodeGrenade(g);
        this.grenades.splice(i, 1);
      }
    }
  }

  private updateTrails(delta: number): void {
    const time = this.now;
    for (const owner of ['player', 'npc'] as const) {
      const s = this.side(owner);
      if (s.trailUntil <= time) continue;
      s.trailAccum += delta;
      if (s.trailAccum < TRAIL_MARK_INTERVAL_MS) continue;
      s.trailAccum -= TRAIL_MARK_INTERVAL_MS;
      const f = this.fighter(owner);
      const quarry = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;
      if (!quarry?.active) continue;
      const qb = this.body(quarry);
      // Rage perk holds the marks in the ground longer.
      const life = this.api.hasPerk(owner, 'rage') ? TRAIL_MARK_LIFE_MS + 2000 : TRAIL_MARK_LIFE_MS;
      this.trails.push({
        owner, x: quarry.x, y: quarry.y,
        expiresAt: time + life, durationMs: life,
        angle: Math.atan2(qb.velocity.y, qb.velocity.x),
      });
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      if (time > this.trails[i].expiresAt) this.trails.splice(i, 1);
    }
  }

  /** True while that side is standing on one of its own trail marks. */
  private onOwnTrail(owner: Owner): boolean {
    const f = this.fighter(owner);
    const time = this.now;
    for (const c of this.trails) {
      if (c.owner !== owner || time > c.expiresAt) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= TRAIL_RADIUS) return true;
    }
    return false;
  }

  private updateSears(): void {
    const time = this.now;
    for (let i = this.sears.length - 1; i >= 0; i--) {
      const p = this.sears[i];
      if (time > p.expiresAt) { this.sears.splice(i, 1); continue; }
      if (time < p.nextTickAt) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > SEAR_RADIUS) continue;
        p.nextTickAt = time + SEAR_TICK_MS;
        this.hit(t, SEAR_DMG, p.owner, 0xff8833);
      }
    }
  }

  private updateHooks(dt: number): void {
    const time = this.now;
    for (let i = this.hooks.length - 1; i >= 0; i--) {
      const h = this.hooks[i];
      const f = this.fighter(h.owner);
      if (!f.active) { this.hooks.splice(i, 1); continue; }

      if (!h.latched) {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        for (const t of this.targetsOf(h.owner)) {
          if (Phaser.Math.Distance.Between(h.x, h.y, t.x, t.y) > HOOK_HIT_R + 14) continue;
          h.latched = t;
          this.api.showFloatingText(t.x, t.y - 34, '⚓ Hooked! (R to reel)', '#ccddee');
          this.fx(h.owner).flash(h.x, h.y, 12, 9, SILVER_TONES);
          break;
        }
        const flown = Phaser.Math.Distance.Between(h.startX, h.startY, h.x, h.y);
        if (!h.latched && (flown > HOOK_RANGE || time - h.bornAt > 1400)) { this.hooks.splice(i, 1); continue; }
      } else {
        const t = h.latched;
        if (!t.active || t.hp <= 0) { this.hooks.splice(i, 1); continue; }
        h.x = t.x; h.y = t.y;
        if (h.reeling) {
          const dx = f.x - t.x, dy = f.y - t.y;
          const d = Math.hypot(dx, dy) || 1;
          const step = Math.min(HOOK_PULL_SPEED * dt, d);
          if (!t.knockbackImmune && !t.unstoppable) {
            this.body(t).setVelocity((dx / d) * HOOK_PULL_SPEED, (dy / d) * HOOK_PULL_SPEED);
            h.dragged += step;
          }
          // R+ Scrape: the chain takes the skin off on the way in.
          if (this.up(h.owner, 'r') && h.dragged >= 100) {
            const chunks = Math.floor(h.dragged / 100);
            h.dragged -= chunks * 100;
            this.hit(t, SCRAPE_DMG_PER_100 * chunks, h.owner, 0xbbccdd);
            this.onDamageDealt(h.owner, t);
          }
          if (d < 56 || time - h.bornAt > 4000) {
            this.body(t).setVelocity(0, 0);
            this.hooks.splice(i, 1);
            continue;
          }
        }
        if (time - h.bornAt > 6000) { this.hooks.splice(i, 1); continue; }
      }
    }
  }

  /** Grapple's catch window, and the throw that ends it. */
  private updateGrapple(): void {
    const time = this.now;
    for (const owner of ['player', 'npc'] as const) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f.active) continue;

      // Still lunging: grab the first thing we run through.
      if (!s.grabbed && s.grappleUntil > time) {
        for (const t of this.targetsOf(owner)) {
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 46) continue;
          s.grabbed = t;
          s.grabUntil = time + GRAPPLE_HOLD_MS;
          s.dashUntil = 0;
          s.grappleUntil = 0;
          this.body(f).setVelocity(0, 0);
          if (owner === 'player') this.api.isDodging = false;
          this.api.showFloatingText(t.x, t.y - 34, '🤜 Caught!', '#ffaa66');
          this.fx(owner).rake(t.x, t.y, Math.atan2(t.y - f.y, t.x - f.x), 50, 3, 8, this.tones(owner));
          break;
        }
      }

      if (!s.grabbed) continue;
      const v = s.grabbed;
      if (!v.active || v.hp <= 0) { s.grabbed = null; continue; }

      if (time < s.grabUntil) {
        // Held off the ground beside the beast — they cannot move, and neither can it.
        const a = Math.atan2(v.y - f.y, v.x - f.x);
        v.setPosition(f.x + Math.cos(a) * 40, f.y + Math.sin(a) * 40);
        this.body(v).setVelocity(0, 0);
        v.earthStunnedUntil = Math.max(v.earthStunnedUntil, s.grabUntil);
        continue;
      }

      // Time's up: hurl them at the cursor (or at open ground, for the npc).
      const aimX = owner === 'player' ? this.api.aimX : this.arenaW() - f.x;
      const aimY = owner === 'player' ? this.api.aimY : this.arenaH() - f.y;
      const a = Math.atan2(aimY - f.y, aimX - f.x);
      this.flings.push({
        owner, victim: v,
        vx: Math.cos(a) * GRAPPLE_FLING_SPEED,
        vy: Math.sin(a) * GRAPPLE_FLING_SPEED,
        until: time + 700,
        slammed: false,
      });
      this.avatar(owner)?.play('slam', a);
      this.fx(owner).pounce(f.x, f.y, f.x + Math.cos(a) * 90, f.y + Math.sin(a) * 90, 6, this.tones(owner));
      this.api.showFloatingText(v.x, v.y - 30, '🌀 Thrown!', '#ffcc88');
      s.grabbed = null;
    }
  }

  /** Flung bodies, and the wall they may find. */
  private updateFlings(): void {
    const time = this.now;
    const W = this.arenaW(), H = this.arenaH();
    const PAD = 34;
    for (let i = this.flings.length - 1; i >= 0; i--) {
      const fl = this.flings[i];
      const v = fl.victim;
      if (!v.active || v.hp <= 0 || time > fl.until) { this.flings.splice(i, 1); continue; }
      if (!v.knockbackImmune && !v.unstoppable) this.body(v).setVelocity(fl.vx, fl.vy);
      // F+ Wall Slam.
      if (!fl.slammed && this.up(fl.owner, 'f')
        && (v.x <= PAD || v.x >= W - PAD || v.y <= PAD || v.y >= H - PAD)) {
        fl.slammed = true;
        this.hit(v, WALL_SLAM_DMG, fl.owner, 0xff3311);
        this.onDamageDealt(fl.owner, v);
        this.stun(v, WALL_SLAM_STUN_MS, fl.owner);
        this.fx(fl.owner).frag(v.x, v.y, 62, { tones: BEAST_TONES, shards: 10, smoke: 2, crater: false });
        this.api.scene.cameras.main.shake(260, 0.008);
        this.api.showFloatingText(v.x, v.y - 40, '🚧 WALL SLAM', '#ff5533');
        this.flings.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-ability hooks
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * F+ Enhanced Scent: hits landed while you are standing in the quarry's own tracks leave
   * them slower. Routed through one place so every damage source in the kit gets it.
   */
  private onDamageDealt(owner: Owner, victim: Fighter): void {
    if (!this.up(owner, 'f') || !this.onOwnTrail(owner)) return;
    this.slowVictim(owner, SCENT_SLOW_MULT, SCENT_SLOW_MS);
    this.api.showFloatingText(victim.x, victim.y - 22, '🐾 −20%', '#ffbb77');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Input (player only)
  // ═══════════════════════════════════════════════════════════════════════════

  /** The slot Beastling is bound over this match, or null when it isn't bound. */
  private pupSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.api.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === 'beastling') return s;
    }
    return null;
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'hunt') return;
    const s = this.sides.player;
    const p = this.api.player;

    // Mastery: Beastling takes over whichever human-form slot it is bound to. Runs first —
    // JustDown() clears the flag, so testing the bind afterwards would swallow the keypress.
    const pup = this.pupSlot();
    if (pup && s.form === 'human') {
      const key = pup === 'e' ? this.api.eKey : pup === 'r' ? this.api.rKey
        : pup === 'f' ? this.api.fKey : this.api.qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.trySummonPup(time);
    }

    // The spirit has the wheel. Nothing you press matters for three seconds.
    if (s.spiritUntil > time) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;
    const rightClicked = pointer.rightButtonDown() && !this.rightWasDown;
    this.rightWasDown = pointer.rightButtonDown();

    if (s.form === 'human') {
      if (clicked) p.castAbility('hunt-crossbow', ctx);

      // E: Blast. Plain tap without E+, hold-and-release with it.
      if (this.up('player', 'e')) {
        if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && s.blastCharges > 0 && pup !== 'e') {
          s.charging = true;
          s.chargeStartedAt = time;
        }
        if (s.charging && !this.api.eKey.isDown) {
          const held = time - s.chargeStartedAt;
          s.charging = false;
          if (p.getCooldownRatio('hunt-blast') >= 1) {
            p.triggerCooldown('hunt-blast');
            this.doBlast(mouseX, mouseY, held, 'player');
            this.reloadCrossbow('player');
          }
        }
      } else if (pup !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
        if (s.blastCharges > 0 && p.castAbility('hunt-blast', ctx)) this.reloadCrossbow('player');
      }

      if (pup !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
        if (p.castAbility('hunt-grenade', ctx)) this.reloadCrossbow('player');
      }
      if (pup !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
        if (p.castAbility('hunt-trail', ctx)) this.reloadCrossbow('player');
      }
      // Q is the beast's clock — unless Q+ is owned, in which case it is the door to hybrid.
      if (pup !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey) && this.api.hasUpgrade('q')) {
        this.enterHybrid('player');
      }
      return;
    }

    if (s.form === 'beast') {
      if (clicked) p.castAbility('hunt-slash', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('hunt-pounce', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('hunt-roar', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('hunt-grapple', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('hunt-blood-scent', ctx);
      return;
    }

    // Hybrid.
    if (clicked && s.pumpingUntil <= time) p.castAbility('hunt-hybrid-shotgun', ctx);
    // Click+ Shotgun Pump: right-click racks another shell in.
    if (rightClicked && this.api.hasUpgrade('click') && s.pumpingUntil <= time) {
      s.pumpingUntil = time + PUMP_MS;
      this.api.scene.time.delayedCall(PUMP_MS, () => {
        if (this.sides.player.form !== 'hybrid') return;
        const st = this.sides.player;
        st.pumps++;
        if (st.pumps > PUMP_SAFE_MAX) {
          st.overloaded = true;
          st.pumps = PUMP_SAFE_MAX + 1;
          this.api.showFloatingText(p.x, p.y - 40, '⚠️ OVERPACKED', '#ff4433');
        } else {
          this.api.showFloatingText(p.x, p.y - 34, `🔧 Pump ×${st.pumps}`, '#ffdd99');
        }
        this.pfx.smoke(p.x, p.y - 6, 1, 8, 7);
      });
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('hunt-roll', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // A hook in the air recasts to reel; only a fresh throw pays the cooldown.
      if (this.hooks.some((h) => h.owner === 'player')) this.doHook(mouseX, mouseY, 'player');
      else p.castAbility('hunt-hook', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('hunt-adrenaline', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('hunt-give-in', ctx);
  }

  private rightWasDown = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // Per-side simulation
  // ═══════════════════════════════════════════════════════════════════════════

  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.isHunt(owner) || !f.active) return;

    // Blast charges tick back up one at a time.
    if (s.blastCharges < BLAST_MAX_CHARGES && time >= s.blastRechargeAt) {
      s.blastCharges++;
      if (s.blastCharges < BLAST_MAX_CHARGES) s.blastRechargeAt = time + BLAST_RECHARGE_MS;
    }

    // The beast clock. It runs in human form only; hybrid form has locked the door.
    if (s.form === 'human') {
      if (s.nextBeastAt === 0) s.nextBeastAt = time + BEAST_FIRST_DELAY_MS;
      if (time >= s.nextBeastAt) this.enterBeast(owner, false);
    } else if (s.form === 'beast' && !s.permanentBeast && time >= s.beastUntil) {
      this.leaveBeast(owner);
    }

    // Blood Moon fading out.
    if (s.moonUntil > 0 && time > s.moonUntil) s.moonUntil = 0;
    // The slow channel keeps only the strongest live slow, so it has to be released.
    if (s.slowUntil <= time) s.slowMult = 1;

    // Alpha and Roar keep their own armour; recomputed from scratch each frame so nothing
    // sticks after the effect ends. `write` only touches the fighter while hunt has an
    // opinion, so a neutral frame leaves whatever else set the field (Rebirth, Lust) alone.
    const hell = this.isHellhound(owner);
    let dr = 1;
    if (s.alpha) dr *= ALPHA_DR_MULT;
    if (s.roarDrUntil > time) dr *= ROAR_DR_MULT;
    if (this.api.hasPerk(owner, 'rage') && s.form === 'beast') dr *= 0.5;
    if (hell) dr *= HELL_DR_MULT;
    if (dr !== 1 || this.wroteDr[owner]) { f.incomingDamageMultiplier = dr; this.wroteDr[owner] = dr !== 1; }

    // Attack speed: Blood Scent and Alpha both shorten cooldowns; they multiply.
    let cd = 1;
    if (s.alpha) cd *= ALPHA_CD_MULT;
    if (s.scentUntil > time) cd *= BLOOD_SCENT_HASTE;
    if (hell) cd *= HELL_CD_MULT;
    if (cd !== 1 || this.wroteCd[owner]) { f.cooldownMult = cd; this.wroteCd[owner] = cd !== 1; }

    // Adrenaline and the crash it books in.
    let outgoing = 1;
    if (s.adrenalineUntil > time) {
      outgoing *= ADRENALINE_BOOST;
    } else if (s.adrenalineUntil > 0) {
      // The buff just ran out: the crash starts now (unless it was pushed back by F+).
      s.adrenalineUntil = 0;
      s.crashUntil = time + CRASH_MS;
      const owed = s.crashDelays * CRASH_DELAY_HP;
      s.crashDelays = 0;
      this.api.showFloatingText(f.x, f.y - 36, '💤 Crash', '#8899aa');
      if (owed > 0) {
        f.applySelfDamage(owed);
        this.api.showFloatingText(f.x, f.y - 52, `💔 −${owed} (the bill)`, '#ff4466');
      }
    }
    if (s.crashUntil > time) outgoing *= CRASH_MULT;
    if (hell) outgoing *= HELL_OUTGOING_MULT;
    if (outgoing !== 1 || this.wroteOut[owner]) { f.outgoingDamageMult = outgoing; this.wroteOut[owner] = outgoing !== 1; }

    // Roll invincibility drops the moment the tumble ends.
    if (s.rollInvincible && s.rollUntil <= time) {
      s.rollInvincible = false;
      f.isInvincible = false;
    }

    // Dash windows: hand movement back when they close.
    if (s.dashUntil > 0 && time >= s.dashUntil) {
      s.dashUntil = 0;
      if (!s.grabbed) this.body(f).setVelocity(0, 0);
      if (owner === 'player') this.api.isDodging = false;
    }

    // Hybrid passive: the beast's spirit takes the controls every ten seconds.
    if (s.form === 'hybrid' && s.spiritUntil <= time && time >= (s.nextSpiritAt || time + 1)) {
      s.spiritUntil = time + SPIRIT_MS;
      s.nextSpiritAt = time + SPIRIT_INTERVAL_MS + SPIRIT_MS;
      s.spiritSlashAt = 0;
      this.fx(owner).howl(f.x, f.y, 80, 520, 9, BEAST_TONES);
      this.api.showFloatingText(f.x, f.y - 44, '👹 THE BEAST TAKES OVER', '#ff5533');
    }
    if (s.form === 'hybrid' && s.nextSpiritAt === 0) s.nextSpiritAt = time + SPIRIT_INTERVAL_MS;
    // The latch is checked outside the form test as well, so a Give In mid-possession still
    // hands the controls back instead of leaving the player pinned by a stale isDodging.
    if (s.spiritUntil > time && s.form === 'hybrid') {
      this.possessing[owner] = true;
      this.drivePossessed(owner, time);
    } else if (this.possessing[owner]) {
      this.possessing[owner] = false;
      s.spiritUntil = 0;
      if (owner === 'player') this.api.isDodging = false;
      this.api.showFloatingText(f.x, f.y - 40, 'You have it back.', '#aab4c0');
    }
    void delta;
  }

  /**
   * The three seconds the spirit owns. It runs straight at whatever is nearest and swings —
   * no abilities, no steering. Velocity is set here, after ArenaScene resolved WASD, so this
   * always wins the frame.
   */
  private drivePossessed(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const quarry = this.quarryOf(owner);
    if (owner === 'player') this.api.isDodging = true;
    if (!quarry) { this.body(f).setVelocity(0, 0); return; }
    const dx = quarry.x - f.x, dy = quarry.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    const rush = f.speed * 1.35;
    if (d > SLASH_RANGE * 0.7) this.body(f).setVelocity((dx / d) * rush, (dy / d) * rush);
    else this.body(f).setVelocity(0, 0);
    if (time >= s.spiritSlashAt && d <= SLASH_RANGE) {
      s.spiritSlashAt = time + 380;
      this.doSlash(quarry.x, quarry.y, owner);
    }
  }

  /** Primal Fear and the Hunt stun, both enforced by taking the body over. */
  private updateControl(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const s = this.side(owner);
      if (!this.isHunt(owner)) continue;
      const f = this.fighter(owner);
      for (const v of this.targetsOf(owner)) {
        if (this.isStunned(v)) { this.body(v).setVelocity(0, 0); continue; }
        if (s.fearUntil > time && !v.unstoppable) {
          // Backs turned and running. Not a slow — they lose the wheel entirely.
          const a = Math.atan2(v.y - f.y, v.x - f.x);
          this.body(v).setVelocity(Math.cos(a) * v.speed * 1.1, Math.sin(a) * v.speed * 1.1);
          v.facingAngle = a + Math.PI;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Speed multipliers — pulled by ArenaScene before movement resolves
  // ═══════════════════════════════════════════════════════════════════════════

  /** Every hunt contribution to the local player's speed, in one number. */
  getPlayerSpeedMult(time: number): number {
    let m = 1;
    if (this.api.elementId === 'hunt') {
      const s = this.sides.player;
      if (s.form === 'beast') m *= this.isHellhound('player') ? 1.5 * HELL_SPEED_MULT : 1.5;
      else if (s.form === 'hybrid') m *= 1.25;
      if (this.onOwnTrail('player')) {
        m *= TRAIL_SPEED_MULT;
        if (this.api.hasUpgrade('f') && s.form === 'beast') m *= SCENT_BEAST_SPEED_MULT;
      }
      if (s.trackSpeedUntil > time) m *= TRACK_SPEED_MULT;
      if (s.scentUntil > time) m *= BLOOD_SCENT_SPEED;
      if (s.adrenalineUntil > time) m *= ADRENALINE_BOOST;
      if (s.crashUntil > time) m *= CRASH_MULT;
      if (s.spiritUntil > time) m = 0;   // the spirit drives the body itself
    }
    // Debuffs the opposing hunter has put on us.
    const foe = this.sides.npc;
    if (this.api.npcElementId === 'hunt' && foe.slowUntil > time) m *= foe.slowMult;
    if (time < this.playerRoarSlowUntil) m *= PUP_ROAR_SLOW_MULT;
    return m;
  }

  /** Every hunt contribution to the npc's speed. */
  getNpcSpeedMult(time: number): number {
    let m = 1;
    if (this.api.npcElementId === 'hunt') {
      const s = this.sides.npc;
      if (s.form === 'beast') m *= this.isHellhound('npc') ? 1.5 * HELL_SPEED_MULT : 1.5;
      if (this.onOwnTrail('npc')) m *= TRAIL_SPEED_MULT;
      if (s.scentUntil > time) m *= BLOOD_SCENT_SPEED;
    }
    const mine = this.sides.player;
    if (this.api.elementId === 'hunt' && mine.slowUntil > time) m *= mine.slowMult;
    if (time < this.npcRoarSlowUntil) m *= PUP_ROAR_SLOW_MULT;
    return m;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cooldown-bar fill for any hunt slot. Most are plain ability cooldowns; Blast shows its
   * two charges as a part-filled bar, and Q shows whichever half of the beast cycle is running.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;
    if (abilityId === 'hunt-blast') {
      const partial = s.blastCharges < BLAST_MAX_CHARGES
        ? Phaser.Math.Clamp(1 - (s.blastRechargeAt - time) / BLAST_RECHARGE_MS, 0, 1)
        : 0;
      return Phaser.Math.Clamp((s.blastCharges + partial) / BLAST_MAX_CHARGES, 0, 1);
    }
    if (abilityId === 'hunt-release-beast') {
      if (s.form === 'beast' && !s.permanentBeast) {
        return Phaser.Math.Clamp((s.beastUntil - time) / BEAST_DURATION_MS, 0, 1);
      }
      if (s.form !== 'human') return 1;
      const span = s.nextBeastAt > time + BEAST_FIRST_DELAY_MS ? BEAST_RECHARGE_MS : BEAST_FIRST_DELAY_MS;
      return Phaser.Math.Clamp(1 - (s.nextBeastAt - time) / span, 0, 1);
    }
    if (abilityId === 'hunt-give-in') return 1;
    return p.getCooldownRatio(abilityId);
  }

  /** Status-tray entries Hunt owns on the local player. */
  private updateIndicators(time: number): void {
    const s = this.sides.player;
    if (this.api.elementId === 'hunt' && s.adrenalineUntil > time) {
      this.api.setStatusIndicator('hunt-adrenaline', {
        name: 'Adrenaline', emoji: '💉', color: 0x66ff99,
        description: '+33% speed and damage. The crash is coming.',
        until: s.adrenalineUntil, count: s.crashDelays > 0 ? s.crashDelays : undefined,
        suffix: s.crashDelays > 0 ? ' delays' : undefined,
      });
    } else {
      this.api.setStatusIndicator('hunt-adrenaline', null);
    }
    if (this.api.elementId === 'hunt' && s.crashUntil > time) {
      this.api.setStatusIndicator('hunt-crash', {
        name: 'Crash', emoji: '💤', color: 0x8899aa,
        description: '−25% speed and damage while the adrenaline wears off.',
        until: s.crashUntil,
      });
    } else {
      this.api.setStatusIndicator('hunt-crash', null);
    }
    // The opponent's roar on us.
    const foe = this.sides.npc;
    if (this.api.npcElementId === 'hunt' && foe.fearUntil > time) {
      this.api.setStatusIndicator('hunt-fear', {
        name: 'Primal Fear', emoji: '😱', color: 0xff6644,
        description: 'You are running from it and you cannot stop.',
        until: foe.fearUntil,
      });
    } else {
      this.api.setStatusIndicator('hunt-fear', null);
    }
    if (this.playerRoarSlowUntil > time) {
      this.api.setStatusIndicator('beastling-roar', {
        name: 'Beastling Roar', emoji: '🐕', color: 0xd9a066,
        description: '20% slower — a beastling roared at you.',
        until: this.playerRoarSlowUntil, count: 20, suffix: '%',
      });
    } else {
      this.api.setStatusIndicator('beastling-roar', null);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Painting
  // ═══════════════════════════════════════════════════════════════════════════

  private ensureLayers(): void {
    const scene = this.api.scene;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
    if (!this.skyGfx) this.skyGfx = scene.add.graphics().setDepth(18).setScrollFactor(0);
  }

  private paintWorld(): void {
    this.ensureLayers();
    const g = this.groundGfx!;
    const a = this.airGfx!;
    const sky = this.skyGfx!;
    const t = this.vizT;
    const time = this.now;
    g.clear(); a.clear(); sky.clear();

    // ── Ground ──
    for (const c of this.trails) {
      HuntFx.drawTrail(g, this.col(c.owner), this.tones(c.owner), c.x, c.y, TRAIL_RADIUS, c.angle,
        t, (c.expiresAt - time) / c.durationMs);
    }
    for (const p of this.sears) {
      HuntFx.drawSear(g, this.col(p.owner), this.tones(p.owner), p.x, p.y, p.angle, p.len,
        t, (p.expiresAt - time) / p.durationMs);
    }

    // ── Air ──
    for (const h of this.hooks) {
      const f = this.fighter(h.owner);
      HuntFx.drawHookChain(a, this.col(h.owner), this.tones(h.owner), f.x, f.y, h.x, h.y, t, !!h.latched);
    }
    for (const gr of this.grenades) {
      if (gr.carried) continue;
      HuntFx.drawGrenade(a, this.col(gr.owner), this.tones(gr.owner), gr.x, gr.y, t,
        gr.explodeAt - time, false, gr.spin, gr.stopped);
    }
    for (const b of this.bolts) {
      HuntFx.drawBolt(a, this.col(b.owner), this.tones(b.owner), b.x, b.y,
        Math.atan2(b.vy, b.vx), 1, 0, b.bomb);
    }
    for (const s of this.stuck) {
      const bite = Phaser.Math.Clamp((time - s.stuckAt) / 200, 0, 1);
      HuntFx.drawBolt(a, this.col(s.owner), this.tones(s.owner),
        s.victim.x + s.offX, s.victim.y + s.offY, s.angle, 0.85, bite, false);
    }
    // Hybrid pump gauge, over the local player's shoulder.
    const ps = this.sides.player;
    if (this.api.elementId === 'hunt' && ps.form === 'hybrid' && this.api.hasUpgrade('click')) {
      HuntFx.drawPumpGauge(a, this.pcol, this.api.player.x, this.api.player.y - 46,
        Math.min(ps.pumps, 4), ps.overloaded, t);
    }
    // Mine Blast winding up: a ring closing on the barrel that snaps white at full charge.
    if (ps.charging) {
      const p = this.api.player;
      const k = Phaser.Math.Clamp((time - ps.chargeStartedAt) / MINE_MAX_CHARGE_MS, 0, 1);
      const ang = Math.atan2(this.api.aimY - p.y, this.api.aimX - p.x);
      const mx = p.x + Math.cos(ang) * 26;
      const my = p.y + Math.sin(ang) * 26;
      const tones = this.tones('player');
      a.lineStyle(2 + k * 2, this.pcol(k >= 1 ? HUNT.white : tones.wound), 0.4 + k * 0.5);
      a.strokeCircle(mx, my, 30 - k * 18 + (k >= 1 ? Math.sin(t * 22) * 2 : 0));
      a.fillStyle(this.pcol(tones.lit), 0.25 + k * 0.6);
      a.fillCircle(mx, my, 3 + k * 7);
      // Powder building in the barrel — four packing ticks around the ring.
      for (let i = 0; i < 4; i++) {
        const ta = (i / 4) * Math.PI * 2 + t * 2;
        const tr = 30 - k * 18;
        a.fillStyle(this.pcol(tones.spark), 0.35 + k * 0.5);
        a.fillCircle(mx + Math.cos(ta) * tr, my + Math.sin(ta) * tr, 1.2 + k * 1.6);
      }
      // The generic yellow charge bar under the HP bar reads the same number.
      this.api.player.chargeRatio = k;
    } else if (this.api.elementId === 'hunt' && this.api.player.chargeRatio > 0 && this.chargedLastFrame) {
      this.api.player.chargeRatio = 0;
    }
    this.chargedLastFrame = ps.charging;

    // ── Sky ──
    const moon = Math.max(
      this.sides.player.moonUntil > time ? 1 : 0,
      this.sides.npc.moonUntil > time ? 0.8 : 0,
    );
    if (moon > 0) {
      HuntFx.drawBloodMoonSky(sky, this.pcol, this.arenaW(), this.arenaH(), t, moon);
    }
  }

  // ── Character rig ──────────────────────────────────────────────────────────

  /**
   * Hands the character its kit for the frame: which weapon, how far the crossbow is spanned,
   * and how many shells are still in the stock loops.
   *
   * The crossbow's span is the ability's own cooldown, so the string visibly hauls back over
   * the reload and the bolt slides into the groove as it finishes — which makes "any other
   * ability reloads it instantly" something you can *watch* happen rather than read in a
   * tooltip. Beast form carries nothing; it has claws.
   */
  private driveWeapon(owner: Owner, av: HuntAvatar): void {
    const s = this.side(owner);
    if (s.form === 'beast') { av.setWeapon(null); return; }
    if (s.form === 'hybrid') {
      av.setWeapon('shotgun');
      av.setShells(s.overloaded ? 4 : s.pumps);
      return;
    }
    av.setWeapon('crossbow');
    av.setLoad(this.fighter(owner).getCooldownRatio('hunt-crossbow'));
  }

  private updateAvatars(delta: number): void {
    const { scene, player, npc } = this.api;
    const time = this.now;

    if (this.api.elementId === 'hunt' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new HuntAvatar(scene, this.pcol, HUNTER_TONES);
      const s = this.sides.player;
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(this.api.aimY - player.y, this.api.aimX - player.x));
      av.setForm(s.form);
      av.setHell(this.isHellhound('player'));
      av.setMoon(this.moonUp('player'));
      // A hellhound doesn't bulk up — it is the small, quick shape, so it skips beast form's swell.
      av.setIntensity(this.moonUp('player') ? 1.45
        : this.isHellhound('player') ? 1
        : s.form === 'beast' ? 1.3 : s.form === 'hybrid' ? 1.15 : 1);
      av.setMastered(this.api.masteryActive);
      this.driveWeapon('player', av);
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.api.npcElementId === 'hunt' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new HuntAvatar(scene, this.ncol, NPC_TONES);
      const s = this.sides.npc;
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setForm(s.form);
      av.setHell(this.isHellhound('npc'));
      av.setMoon(this.moonUp('npc'));
      av.setIntensity(this.moonUp('npc') ? 1.4
        : this.isHellhound('npc') ? 1
        : s.form === 'beast' ? 1.25 : 1);
      av.setMastered(this.api.npcMasteryActive);
      this.driveWeapon('npc', av);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    // Blood Scent clings to whoever caught it.
    for (const owner of ['player', 'npc'] as const) {
      const f = this.fighter(owner);
      if (this.side(owner).scentUntil > time && f?.active) {
        if (!this.scentAura[owner]) {
          this.scentAura[owner] = new HuntAura(scene, this.col(owner), BEAST_TONES, 34, 0.9, 4, 7);
        }
        this.scentAura[owner]!.setTones(this.tones(owner));
        this.scentAura[owner]!.update(delta, f.x, f.y, f.alpha);
      } else if (this.scentAura[owner]) {
        this.scentAura[owner]!.destroy();
        this.scentAura[owner] = null;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mastery — Weak Points
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Damage multiplier for a hit that came in from (hitX, hitY) against `target`: 2 inside the
   * sweeping wedge, 1 everywhere else.
   */
  weakPointMult(target: Fighter, hitX: number, hitY: number, attacker: Owner): number {
    if (attacker === 'player' ? !this.api.masteryActive : !this.api.npcMasteryActive) return 1;
    const ang = Math.atan2(hitY - target.y, hitX - target.x);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - this.weakAngle));
    return diff <= WEAK_HALF_ANGLE ? WEAK_DMG_MULT : 1;
  }

  /** Announce a weak-point hit. Self-throttled — a cone puts several hits in at once. */
  showWeakPointHit(x: number, y: number): void {
    const time = this.now;
    if (time - this.lastWeakLabelAt < 350) return;
    this.lastWeakLabelAt = time;
    this.api.showFloatingText(x, y - 30, '🎯 WEAK POINT', '#ff5555');
    this.fxWeakPoint(x, y, this.weakAngle + Math.PI);
  }

  /** Weak Points reward pip — a rake right on the seam that was hit. */
  fxWeakPoint(x: number, y: number, angle: number): void {
    this.pfx.rake(x, y, angle, 40, 3, 9, BEAST_TONES, 8);
    this.pfx.splatter(x, y, 5, { speed: 150, angle, spread: 1.2, size: 2.4, life: 380, depth: 9, tones: BEAST_TONES });
  }

  private drawWeakWedge(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, pulse: number): void {
    const a0 = this.weakAngle - WEAK_HALF_ANGLE;
    const a1 = this.weakAngle + WEAK_HALF_ANGLE;
    gfx.clear();
    gfx.setPosition(0, 0);

    gfx.fillStyle(0x8b0000, 0.26 + pulse * 0.08);
    gfx.beginPath();
    gfx.arc(cx, cy, WEAK_OUTER_R, a0, a1, false);
    gfx.arc(cx, cy, WEAK_INNER_R, a1, a0, true);
    gfx.closePath();
    gfx.fillPath();

    gfx.fillStyle(0xff2222, 0.14 + pulse * 0.10);
    gfx.beginPath();
    gfx.arc(cx, cy, WEAK_OUTER_R - 8, a0 + 0.12, a1 - 0.12, false);
    gfx.arc(cx, cy, WEAK_INNER_R + 3, a1 - 0.12, a0 + 0.12, true);
    gfx.closePath();
    gfx.fillPath();

    // The two crust edges, leading one brighter so the sweep direction reads.
    gfx.lineStyle(2, 0xff6655, 0.85);
    gfx.beginPath();
    gfx.moveTo(cx + Math.cos(a1) * WEAK_INNER_R, cy + Math.sin(a1) * WEAK_INNER_R);
    gfx.lineTo(cx + Math.cos(a1) * WEAK_OUTER_R, cy + Math.sin(a1) * WEAK_OUTER_R);
    gfx.strokePath();
    gfx.lineStyle(1, 0xaa2222, 0.55);
    gfx.beginPath();
    gfx.moveTo(cx + Math.cos(a0) * WEAK_INNER_R, cy + Math.sin(a0) * WEAK_INNER_R);
    gfx.lineTo(cx + Math.cos(a0) * WEAK_OUTER_R, cy + Math.sin(a0) * WEAK_OUTER_R);
    gfx.strokePath();

    gfx.lineStyle(1, 0xff8877, 0.5);
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (a1 - a0);
      gfx.beginPath();
      gfx.moveTo(cx + Math.cos(a) * (WEAK_OUTER_R - 6), cy + Math.sin(a) * (WEAK_OUTER_R - 6));
      gfx.lineTo(cx + Math.cos(a) * WEAK_OUTER_R, cy + Math.sin(a) * WEAK_OUTER_R);
      gfx.strokePath();
    }

    // Crosshair pip riding the middle of the slice — the thing you actually aim at.
    const px = cx + Math.cos(this.weakAngle) * (WEAK_OUTER_R + 5);
    const py = cy + Math.sin(this.weakAngle) * (WEAK_OUTER_R + 5);
    gfx.lineStyle(1.5, 0xff4444, 0.75 + pulse * 0.25);
    gfx.strokeCircle(px, py, 3.5);
    gfx.beginPath();
    gfx.moveTo(px - 6, py); gfx.lineTo(px - 2, py);
    gfx.moveTo(px + 2, py); gfx.lineTo(px + 6, py);
    gfx.moveTo(px, py - 6); gfx.lineTo(px, py - 2);
    gfx.moveTo(px, py + 2); gfx.lineTo(px, py + 6);
    gfx.strokePath();
  }

  private updateWeakPoints(time: number, dt: number): void {
    const { scene } = this.api;
    this.weakAngle = Phaser.Math.Angle.Wrap(this.weakAngle + WEAK_SPIN_RAD_PER_SEC * dt);
    const pulse = 0.5 + 0.5 * Math.sin(time / 260);

    if (this.api.masteryActive) {
      for (const t of this.api.enemies) {
        if (!t.active || t.hp <= 0) {
          const dead = this.weakGfx.get(t);
          if (dead) { dead.destroy(); this.weakGfx.delete(t); }
          continue;
        }
        let g = this.weakGfx.get(t);
        if (!g) { g = scene.add.graphics().setDepth(3); this.weakGfx.set(t, g); }
        this.drawWeakWedge(g, t.x, t.y, pulse);
      }
      for (const [t, g] of this.weakGfx) {
        if (!t.active || t.hp <= 0) { g.destroy(); this.weakGfx.delete(t); }
      }
    } else if (this.weakGfx.size) {
      for (const g of this.weakGfx.values()) g.destroy();
      this.weakGfx.clear();
    }

    if (this.api.npcMasteryActive) {
      if (!this.weakPlayerGfx) this.weakPlayerGfx = scene.add.graphics().setDepth(3);
      this.drawWeakWedge(this.weakPlayerGfx, this.api.player.x, this.api.player.y, pulse);
    } else if (this.weakPlayerGfx) {
      this.weakPlayerGfx.destroy();
      this.weakPlayerGfx = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mastery — Beastling
  // ═══════════════════════════════════════════════════════════════════════════

  /** 0 = just summoned, 1 = ready. While a pup is out the bar counts down its 15s instead. */
  getBeastlingCooldownRatio(time: number): number {
    const mine = this.beastlings.find((b) => b.owner === 'player');
    if (mine) return Phaser.Math.Clamp((mine.endsAt - time) / BEASTLING_DURATION_MS, 0, 1);
    return Math.min(1, (time - this.pupLastCastAt) / BEASTLING_COOLDOWN_MS);
  }

  private trySummonPup(time: number): void {
    if (this.beastlings.some((b) => b.owner === 'player')) return;
    if (time - this.pupLastCastAt < BEASTLING_COOLDOWN_MS) return;
    this.pupLastCastAt = time;
    this.spawnPup('player', time);
    // Private timer, so this never flows through onCastStamp — broadcast it by hand.
    this.api.broadcastMasteryCast('beastling');
    const { player } = this.api;
    this.api.showFloatingText(player.x, player.y - 44, '🐕 Beastling!', '#d9a066');
  }

  /** Online replay: the remote Hunt player whistled up their own pup. */
  doNpcBeastling(): void {
    if (this.beastlings.some((b) => b.owner === 'npc')) return;
    this.spawnPup('npc', this.now);
  }

  private spawnPup(owner: Owner, time: number): void {
    const { scene } = this.api;
    const f = this.fighter(owner);
    const gfx = scene.add.graphics().setDepth(6);
    this.beastlings.push({
      owner, gfx,
      x: f.x - 28, y: f.y + 14,
      endsAt: time + BEASTLING_DURATION_MS,
      nextBiteAt: time + BITE_INTERVAL_MS,
      heading: 0, gait: 0, tailPhase: 0, earLag: 0,
      blinkUntil: 0, nextBlinkAt: time + 1800,
      lungeUntil: 0, carrying: null, carryFuseLeftMs: 0,
    });
    const fx = this.fx(owner);
    fx.bloom(f.x - 28, f.y + 14, 22, 7, 5, this.tones(owner));
    fx.smoke(f.x - 28, f.y + 14, 3, 16, 4);
    this.avatar(owner)?.play('sweep');
  }

  /** A roar makes the caster's pup throw its head back and join in. */
  private onBeastlingRoar(owner: Owner): void {
    const pup = this.beastlings.find((b) => b.owner === owner);
    if (!pup) return;
    const time = this.now;
    pup.lungeUntil = time + 260;
    if (owner === 'player') {
      this.npcRoarSlowUntil = Math.max(this.npcRoarSlowUntil, time + PUP_ROAR_SLOW_MS);
      this.api.showFloatingText(pup.x, pup.y - 26, '🐕 ROAR! −20%', '#ffaa66');
    } else {
      this.playerRoarSlowUntil = Math.max(this.playerRoarSlowUntil, time + PUP_ROAR_SLOW_MS);
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 46, '🐕 Roared! −20%', '#ffaa66');
    }
    this.fx(pup.owner).howl(pup.x, pup.y, 62, 620, 7, this.moonUp(pup.owner) ? MOON_TONES : this.tones(pup.owner));
  }

  /** Grenade explosions that caught somebody — feeds the "Frag Out" requirement. */
  noteGrenadeHits(owner: Owner, hits: number): void {
    if (owner !== 'player' || hits <= 0) return;
    this.api.recordMasteryStat('grenadeHits', hits);
  }

  private targetOfPup(pup: Beastling): Fighter | null {
    const list = this.targetsOf(pup.owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of list) {
      const d = Phaser.Math.Distance.Between(pup.x, pup.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private pupOnTrail(pup: Beastling, time: number): boolean {
    for (const c of this.trails) {
      if (c.owner !== pup.owner || time > c.expiresAt) continue;
      if (Phaser.Math.Distance.Between(pup.x, pup.y, c.x, c.y) <= TRAIL_RADIUS) return true;
    }
    return false;
  }

  private fetchableGrenade(pup: Beastling): Grenade | null {
    for (const g of this.grenades) {
      if (g.owner !== pup.owner || g.carried) continue;
      return g;
    }
    return null;
  }

  private releaseCarried(pup: Beastling, time: number): void {
    const g = pup.carrying;
    if (!g) return;
    g.x = pup.x; g.y = pup.y;
    g.carried = false;
    g.explodeAt = time + pup.carryFuseLeftMs;
    pup.carrying = null;
    pup.carryFuseLeftMs = 0;
  }

  private detonateCarried(pup: Beastling): void {
    const g = pup.carrying;
    if (!g) return;
    g.x = pup.x; g.y = pup.y;
    g.carried = false;
    const idx = this.grenades.indexOf(g);
    if (idx >= 0) this.grenades.splice(idx, 1);
    this.explodeGrenade(g);
    pup.carrying = null;
    pup.carryFuseLeftMs = 0;
    this.api.showFloatingText(pup.x, pup.y - 24, '🐕 Fetch!', '#ffaa44');
  }

  private bite(pup: Beastling, target: Fighter, time: number): void {
    const moon = this.moonUp(pup.owner);
    let dmg = BITE_DMG;
    // A pup goes for the bolt already sticking out of them.
    if (this.stuckCount(target) > 0) dmg *= BITE_BOLT_MULT;
    if (moon) dmg *= MOON_DMG_MULT;
    dmg = Math.round(dmg);

    this.hit(target, dmg, pup.owner, moon ? 0xcc2222 : 0xd9a066);
    pup.lungeUntil = time + 200;
    pup.nextBiteAt = time + BITE_INTERVAL_MS;

    const ang = Math.atan2(target.y - pup.y, target.x - pup.x);
    const bx = pup.x + Math.cos(ang) * 16, by = pup.y + Math.sin(ang) * 16;
    const fx = this.fx(pup.owner);
    fx.rake(bx, by, ang, 26, 2, 8, moon ? MOON_TONES : this.tones(pup.owner), 9);
    fx.splatter(bx, by, moon ? 6 : 3, {
      speed: 110, angle: ang, spread: 1.2, size: 2.2, life: 400, depth: 8, tones: BEAST_TONES,
    });
  }

  private updateBeastlings(time: number, dt: number): void {
    for (let i = this.beastlings.length - 1; i >= 0; i--) {
      const pup = this.beastlings[i];
      const owner = this.fighter(pup.owner);
      const moon = this.moonUp(pup.owner);

      if (time >= pup.endsAt || !owner.active) {
        this.releaseCarried(pup, time);
        this.fx(pup.owner).smoke(pup.x, pup.y, 3, 18, 5);
        this.fx(pup.owner).splatter(pup.x, pup.y, 4, {
          speed: 60, size: 2.2, life: 480, depth: 5, tones: this.tones(pup.owner),
        });
        pup.gfx.destroy();
        this.beastlings.splice(i, 1);
        continue;
      }

      // ── Fetching ────────────────────────────────────────────────────
      if (pup.carrying) {
        // Frozen fuse: it cannot come due while it is in the pup's mouth.
        pup.carrying.x = pup.x;
        pup.carrying.y = pup.y - 6;
        pup.carrying.explodeAt = Infinity;
      } else {
        const loose = this.fetchableGrenade(pup);
        if (loose && Phaser.Math.Distance.Between(pup.x, pup.y, loose.x, loose.y) <= FETCH_PICKUP_R) {
          pup.carryFuseLeftMs = Math.max(200, loose.explodeAt - time);
          pup.carrying = loose;
          loose.stopped = true;
          loose.carried = true;
          this.api.showFloatingText(pup.x, pup.y - 24, '🐕 Got it!', '#ffcc66');
        }
      }

      // ── Where to run ────────────────────────────────────────────────
      const quarry = this.targetOfPup(pup);
      const loose = pup.carrying ? null : this.fetchableGrenade(pup);
      let destX: number, destY: number;
      let arriveR = 6;

      if (pup.carrying && quarry) {
        destX = quarry.x; destY = quarry.y;
        arriveR = FETCH_DELIVER_R;
        if (Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= FETCH_DELIVER_R) {
          this.detonateCarried(pup);
        }
      } else if (loose) {
        destX = loose.x; destY = loose.y;
        arriveR = FETCH_PICKUP_R * 0.5;
      } else if (quarry && Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= PUP_AGGRO_RANGE) {
        destX = quarry.x; destY = quarry.y;
        arriveR = BITE_RANGE - 8;
      } else {
        const back = Math.atan2(pup.y - owner.y, pup.x - owner.x);
        destX = owner.x + Math.cos(back) * PUP_FOLLOW_DIST;
        destY = owner.y + Math.sin(back) * PUP_FOLLOW_DIST;
        arriveR = 12;
      }

      let speed = PUP_SPEED;
      if (this.pupOnTrail(pup, time)) speed *= PUP_TRAIL_SPEED_MULT;
      if (moon) speed *= MOON_SPEED_MULT;

      const dx = destX - pup.x;
      const dy = destY - pup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > arriveR) {
        const step = Math.min(speed * dt, dist - arriveR);
        pup.x += (dx / dist) * step;
        pup.y += (dy / dist) * step;
        pup.heading = Math.atan2(dy, dx);
        pup.gait += step / 7;
      } else {
        pup.gait += dt * 1.6;
      }

      if (!pup.carrying && quarry && time >= pup.nextBiteAt) {
        if (Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= BITE_RANGE) {
          this.bite(pup, quarry, time);
        }
      }

      const nearOwner = Phaser.Math.Distance.Between(pup.x, pup.y, owner.x, owner.y) < 90;
      const wagRate = pup.carrying ? 15 : nearOwner ? 11 : 6;
      pup.tailPhase += dt * wagRate;
      const wantLag = Math.sin(pup.gait * 0.5) * 0.25;
      pup.earLag += (wantLag - pup.earLag) * Math.min(1, dt * 6);
      if (time >= pup.nextBlinkAt) {
        pup.blinkUntil = time + 110;
        pup.nextBlinkAt = time + 1600 + Math.random() * 2200;
      }

      this.drawPup(pup, time, moon);
    }
  }

  /**
   * The pup, drawn from scratch every frame: gait-bobbed legs, floppy ears that lag the
   * turn, a wagging tail, a blinking face, and a Blood Moon variant that is bigger,
   * redder, and dripping.
   */
  private drawPup(pup: Beastling, time: number, moon: boolean): void {
    const g = pup.gfx;
    g.clear();

    const s = (moon ? MOON_SCALE : 1) * (time < pup.lungeUntil ? 1.12 : 1);
    const flip = Math.cos(pup.heading) < 0 ? -1 : 1;
    const cx = pup.x;
    const bob = Math.sin(pup.gait) * 1.4 * s;
    const cy = pup.y + bob;

    const coat = moon ? PUP_COAT_MOON : PUP_COAT;
    const belly = moon ? PUP_BELLY_MOON : PUP_BELLY;
    const ear = moon ? PUP_EAR_MOON : PUP_EAR;

    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(cx, pup.y + 13 * s, 26 * s - bob, 7 * s);

    // Tail: four tapering segments curling up off the rump.
    const wag = Math.sin(pup.tailPhase) * 0.5;
    let tx = cx - 13 * s * flip;
    let ty = cy - 4 * s;
    let tang = (flip > 0 ? Math.PI : 0) - 0.35 * flip + wag;
    for (let seg = 0; seg < 4; seg++) {
      const len = (5.2 - seg * 0.8) * s;
      const nx = tx + Math.cos(tang) * len;
      const ny = ty + Math.sin(tang) * len;
      g.lineStyle((5.2 - seg * 0.95) * s, coat, 1);
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(nx, ny);
      g.strokePath();
      tx = nx; ty = ny;
      tang += 0.62 * flip;
    }
    g.fillStyle(PUP_MUZZLE, 1);
    g.fillCircle(tx, ty, 1.9 * s);

    const legPairs: Array<[number, number]> = [
      [-9 * s * flip, 0], [-6 * s * flip, Math.PI],
      [7 * s * flip, Math.PI], [10 * s * flip, 0],
    ];
    for (const [ox, phase] of legPairs) {
      const swing = Math.sin(pup.gait * 2 + phase);
      g.fillStyle(coat, 1);
      g.fillRoundedRect(cx + ox - 2 * s, cy + 4 * s, 4 * s, (7 + swing * 1.6) * s, 2 * s);
      g.fillStyle(PUP_MUZZLE, 1);
      g.fillEllipse(cx + ox, cy + (11.5 + swing * 1.6) * s, 5 * s, 3 * s);
    }

    g.fillStyle(coat, 1);
    g.fillEllipse(cx, cy, 30 * s, 19 * s);
    g.fillStyle(belly, 1);
    g.fillEllipse(cx, cy + 4 * s, 22 * s, 9 * s);
    g.fillStyle(ear, 0.55);
    g.fillEllipse(cx - 5 * s * flip, cy - 5 * s, 9 * s, 5 * s);
    g.fillEllipse(cx + 6 * s * flip, cy - 4 * s, 6 * s, 4 * s);

    const collarX = cx + 10 * s * flip;
    g.lineStyle(2.4 * s, 0xaa2233, 1);
    g.beginPath();
    g.arc(collarX, cy - 1 * s, 8 * s, flip > 0 ? -1.15 : Math.PI - 1.15, flip > 0 ? 1.15 : Math.PI + 1.15, false);
    g.strokePath();
    g.fillStyle(0xffcc44, 1);
    g.fillCircle(collarX + 2 * s * flip, cy + 7.5 * s, 2.2 * s);

    const hx = cx + 15 * s * flip;
    const hy = cy - 6 * s + Math.sin(pup.gait) * 0.8 * s;

    const drawEar = (hingeDx: number, swing: number, shade: number, len: number, wide: number) => {
      const bx = hx + hingeDx * s * flip;
      const by = hy - 7 * s;
      const a = Math.PI / 2 + swing;
      const midX = bx + Math.cos(a) * len * 0.55 * s * flip - wide * 0.3 * s * flip;
      const midY = by + Math.sin(a) * len * 0.55 * s;
      const tipX = bx + Math.cos(a) * len * s * flip;
      const tipY = by + Math.sin(a) * len * s;
      g.fillStyle(shade, 1);
      g.beginPath();
      g.moveTo(bx - wide * 0.5 * s, by);
      g.lineTo(bx + wide * 0.5 * s, by + 1 * s);
      g.lineTo(midX + wide * 0.45 * s, midY);
      g.lineTo(tipX, tipY);
      g.lineTo(midX - wide * 0.5 * s, midY);
      g.closePath();
      g.fillPath();
      g.fillCircle(tipX, tipY, wide * 0.42 * s);
    };

    drawEar(-1, pup.earLag * 0.6 - 0.22, 0x4e3018, 12, 7);

    g.fillStyle(coat, 1);
    g.fillCircle(hx, hy, 10 * s);
    g.fillStyle(belly, 0.35);
    g.fillEllipse(hx + 2 * s * flip, hy - 4 * s, 11 * s, 6 * s);

    const mx = hx + 6 * s * flip;
    const my = hy + 3 * s;
    g.fillStyle(PUP_MUZZLE, 1);
    g.fillEllipse(mx, my, 12 * s, 8 * s);
    g.fillStyle(0x241a12, 1);
    g.fillEllipse(mx + 4 * s * flip, my - 1 * s, 4 * s, 3 * s);

    const eyeY = hy - 1.5 * s;
    for (const side of [-1, 1]) {
      const ex = hx + (side === 1 ? 4.5 : -1.5) * s * flip;
      if (time < pup.blinkUntil) {
        g.lineStyle(1.4 * s, 0x241a12, 1);
        g.beginPath();
        g.moveTo(ex - 2.2 * s, eyeY); g.lineTo(ex + 2.2 * s, eyeY);
        g.strokePath();
        continue;
      }
      if (moon) {
        g.fillStyle(0xff3322, 0.35);
        g.fillCircle(ex, eyeY, 4.4 * s);
      }
      g.fillStyle(moon ? 0x3a0e08 : 0xfdf3e0, 1);
      g.fillCircle(ex, eyeY, 3 * s);
      g.fillStyle(moon ? 0xff4433 : 0x241a12, 1);
      g.fillCircle(ex + 0.5 * s * flip, eyeY, 2 * s);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(ex + 1.1 * s * flip, eyeY - 1 * s, 0.9 * s);
    }

    drawEar(-3.5, pup.earLag, ear, 15, 8.5);

    // Carried grenade, clamped in the jaws.
    if (pup.carrying) {
      const gx = mx + 8 * s * flip;
      const gy = my + 3 * s;
      g.fillStyle(0x3c4a1f, 1);
      g.fillCircle(gx, gy, 6 * s);
      g.lineStyle(1.4 * s, 0xff8800, 1);
      g.strokeCircle(gx, gy, 6 * s);
      g.fillStyle(0x776655, 1);
      g.fillRect(gx - 1.2 * s, gy - 9 * s, 2.4 * s, 4 * s);
      g.fillStyle(0xffdd44, 0.7 + 0.3 * Math.sin(time / 70));
      g.fillCircle(gx, gy - 9 * s, 2 * s);
    }

    if (moon) {
      g.lineStyle(1.5, 0xcc2222, 0.35 + 0.2 * Math.sin(time / 220));
      g.strokeCircle(cx, cy, 24 * s);
      g.fillStyle(0xaa1111, 0.7);
      g.fillCircle(mx + 3 * s * flip, my + 6 * s + (time / 12 % 6), 1.6 * s);
      g.fillCircle(mx - 2 * s * flip, my + 5 * s + ((time / 15 + 3) % 6), 1.2 * s);
    }
  }

  // ── Requirement tracking ───────────────────────────────────────────────────

  /** Kills are booked against whichever form was worn at the moment of death. */
  private trackKills(): void {
    for (const t of this.api.enemies) {
      if (!t.active || this.trackedEnemies.has(t)) continue;
      this.trackedEnemies.add(t);
      t.once('defeated', () => {
        const form = this.sides.player.form;
        if (form === 'hybrid') this.api.recordMasteryStat('hybridKills', 1);
        else if (form === 'beast') this.api.recordMasteryStat('beastKills', 1);
        else this.api.recordMasteryStat('normalKills', 1);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Per-frame
  // ═══════════════════════════════════════════════════════════════════════════

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.vizT += dt;

    if (!this.started) {
      this.started = true;
      for (const o of ['player', 'npc'] as const) this.sides[o].nextBeastAt = time + BEAST_FIRST_DELAY_MS;
    }

    this.updateAvatars(delta);
    if (this.api.elementId === 'hunt') this.trackKills();
    this.updateWeakPoints(time, dt);

    this.updateSide('player', time, delta);
    this.updateSide('npc', time, delta);
    this.updateBolts(dt);
    this.updateTracking();
    this.updateGrenades(dt);
    this.updateTrails(delta);
    this.updateSears();
    this.updateHooks(dt);
    this.updateGrapple();
    this.updateFlings();
    this.updateControl(time);

    if (this.beastlings.length) this.updateBeastlings(time, dt);
    this.updateIndicators(time);
    this.paintWorld();
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * The beastling pup. Anything it happens to be carrying goes with it, the same as when
   * its own timer runs out.
   */
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number {
    const near = (px: number, py: number): boolean => Phaser.Math.Distance.Between(x, y, px, py) <= radius;
    let razed = 0;
    for (let i = this.beastlings.length - 1; i >= 0; i--) {
      const b = this.beastlings[i];
      if (b.owner === exceptOwner || !near(b.x, b.y)) continue;
      b.gfx.destroy();
      this.beastlings.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
