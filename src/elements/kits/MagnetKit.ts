import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Ability, CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import type { CustomStatus } from './StatusHudKit';
import {
  MAGNET, MagnetAvatar, MagnetColorFn, MagnetFx, drawChargedAura, drawCoin, drawCoinFragment, drawCoinShot,
  drawCrackle, drawFieldFlick, drawGatherPile, drawLockLine, drawMagTrack, drawMagnetHalo, drawMagneticField, drawMagnetized,
  drawNail, drawOrbitRing, drawScrap, drawSpikeFlying, drawSpikeHover, drawSpikePlanted, megaMechTint,
} from './MagnetVisuals';
import { MagnetMech, MechAttack, MechBuild } from './MagnetMech';
import { SalvoCrates, SalvoPart, SalvoPicker, applyPick, defaultBuild, drawMechCore, randomBuild } from './MagnetSalvo';
import { getEnhancement } from '../../data/Mastery';

type Owner = 'player' | 'npc';
const BOTH: readonly Owner[] = ['player', 'npc'];

// ── Tunables ──────────────────────────────────────────────────────────────

const PAD = 32;

// Click — Coin Flip
const COIN_AIR_MS = 3000;
const COIN_PEAK = 120;
const COIN_MAX = 8;
/** A press held this long stops tossing and starts holding every coin in the air. */
const HOVER_DELAY_MS = 220;
const COIN_SHOT_SPEED = 820;
const COIN_SHOT_DAMAGE = 6;
const COIN_SHOT_MS = 1100;

// E — Repulse
const REPULSE_R = 170;
const REPULSE_HALF = Phaser.Math.DegToRad(70);
/** How far a nailed body can be from you and still be shoved — the nail is the handle, not the wave. */
const REPULSE_PUSH_RANGE = 340;
const REPULSE_PUSH_SPEED = 720;
const REPULSE_PUSH_MS = 260;
/** A returning nail this close is caught by the wave and re-fired. */
const NAIL_REFIRE_R = 150;

// R — Nail Implant
const NAIL_SPEED = 840;
const NAIL_RANGE = 620;
const NAIL_DAMAGE = 10;
const NAIL_RIP_DAMAGE = 15;
const NAIL_STUCK_MS = 12000;
const NAIL_RETURN_SPEED = 760;

// F — Steel Spike
const SPIKE_CAST_RANGE = 560;
const SPIKE_HOVER_MS = 2000;
const SPIKE_RADIUS = 95;
const SPIKE_DAMAGE = 22;
const SPIKE_KNOCK = 380;
const SPIKE_KNOCK_MS = 160;
const SPIKE_LIFE_MS = 15000;
/** The bot's hovering spike chases its target this fast; the player's sits on the cursor. */
const SPIKE_NPC_FOLLOW_SPEED = 260;
const ZIP_SPEED = 1100;
const ZIP_MAX_MS = 900;
const ROD_SPEED = 1050;
const ROD_DAMAGE = 30;
const ROD_KNOCK = 520;
const ROD_KNOCK_MS = 180;

// Scrap
const SCRAP_COUNT = 3;
const SCRAP_FLY_DAMAGE = 8;
const SCRAP_GROUND_MS = 20000;
const SCRAP_PICKUP_R = 56;
const ORBIT_R = 46;
const ORBIT_SPEED = 3;
const ORBIT_MAX = 6;
const ORBIT_HIT_DAMAGE = 12;
const SCRAP_DASH_SPEED = 900;
const SCRAP_DASH_MS = 260;

// Q — Mecha Massacre
const GATHER_MS = 7500;
/** Every point of damage the mech's core takes costs the mech this much of its life. */
const CORE_MS_PER_DAMAGE = 50;

// Perks
/** Blade: the spike is a sword — a launched one hits twice as hard and breaks into five. */
const BLADE_SCRAP_COUNT = 5;
/** Electromagnet: orbiting scrap is live. */
const ELECTRO_ZAP_RANGE = 96;
const ELECTRO_ZAP_DAMAGE = 6;
const ELECTRO_ZAP_GAP_MS = 700;
const ELECTRO_STUN_MS = 500;

// Shop upgrades
/** Click+ Shatter Shot: a fired coin that reaches the wall bursts into this many fragments. */
const SHATTER_FRAGMENTS = 6;
const FRAGMENT_SPEED = 640;
const FRAGMENT_DAMAGE = 3;
const FRAGMENT_MS = 900;
/** Fan the fragments spread over when nobody is magnetised (radians either side of the aim). */
const FRAGMENT_SPREAD = 0.45;
/** E+ Magnetize: how long a body stays magnetised after Repulse touches it. */
const MAGNETIZE_MS = 5000;
/** A magnetised shot locks onto a magnetised body this far away — the "two magnets" rule. */
const LOCK_RANGE = 720;
/** A magnetised body pulls any of the magnet's shots that pass this close. */
const ATTRACT_R = 110;
const ATTRACT_RATE = 5;
/** The "basic" homing of a magnetised shot with no magnetised body to lock onto. */
const HOMING_RANGE = 360;
const HOMING_RATE = 2.6;
const SPIKE_HOMING_RATE = 1.4;
/** Scrap off a repulsed spike flies straight home at this speed. */
const SCRAP_HOME_SPEED = 620;
/** R+ Nailstorm: three golden nails a shot, fanned this far apart. */
const NAILSTORM_COUNT = 3;
const NAILSTORM_SPREAD = 0.06;
/** Every other nail in the same body adds this to each nail's rip-out. */
const NAILSTORM_RIP_BONUS = 4;
/** Repulse shoving a nailed body: this much damage per nail in them, and 20% more push per extra nail. */
const NAILSTORM_SHOVE_DAMAGE = 4;
const NAILSTORM_SHOVE_PER_NAIL = 0.2;
/** …and each nail keeps the body magnetised a second longer. */
const NAILSTORM_MAGNETIZE_PER_NAIL = 1000;
/** F+ Electromagnet: a planted live spike arcs into everyone close. */
const SPIKE_ZAP_R = 120;
const SPIKE_ZAP_DAMAGE = 5;
const SPIKE_ZAP_GAP_MS = 900;
/** Riding a live spike leaves you charged. */
const CHARGE_MS = 4000;
const CHARGE_SPEED_MULT = 1.35;
const CHARGE_AURA_R = 105;
const CHARGE_AURA_DAMAGE = 5;
const CHARGE_AURA_GAP_MS = 600;
/** Live orbiting scrap shoots enemy shots out of the air this close to you, now and then. */
const SHIELD_ZAP_R = 140;
const SHIELD_ZAP_GAP_MS = 1100;

// Mastery
/** Magnetic Field (passive): enemy shots entering this circle are bent once, away from the body. */
const FIELD_R = 72;
const FIELD_DEFLECT = Phaser.Math.DegToRad(2);
const FLICK_MS = 260;
/** Mag-Lev (bindable): a steerable track of magnetised floor. */
const MAGLEV_ID = 'mag-lev';
const MAGLEV_COOLDOWN_MS = 14000;
const MAGLEV_PATCHES = 16;
const MAGLEV_STEP_MS = 60;
const MAGLEV_SPACING = 34;
const MAGLEV_PATCH_R = 30;
const MAGLEV_LIFE_MS = 10000;
/** Riding your own track. */
const MAGLEV_SPEED_MULT = 1.5;
/** A magnetised (or nailed) foe on your track. */
const MAGLEV_SLOW_MULT = 0.5;
/** Repulsing the track throws you backward. */
const MAGLEV_KICK_SPEED = 980;
const MAGLEV_KICK_MS = 320;
/** The bot's reasons: a marked target this close, or this hurt and this close for the kick. */
const NPC_MAGLEV_MARKED_RANGE = 440;
const NPC_MAGLEV_KICK_HP = 0.35;
const NPC_MAGLEV_KICK_RANGE = 240;

// ── World objects ─────────────────────────────────────────────────────────

interface Coin {
  owner: Owner;
  sx: number; sy: number;
  lx: number; ly: number;
  /** Airtime so far. Stops advancing while the owner holds the coins. */
  air: number;
  x: number; y: number; z: number;
  spin: number; spinRate: number;
  /** Mastery: hanging over its owner's maglev ground, and not coming down until it goes dead. */
  magHeld: boolean;
}

/** Mag-Lev: one stretch of magnetised floor. */
interface MagPatch { x: number; y: number; bornAt: number; seed: number }

/** Mag-Lev: one cast's track, laid a patch at a time toward wherever its owner is aiming. */
interface MagTrack {
  owner: Owner;
  patches: MagPatch[];
  /** Patches still to lay. A replica's arrive one message at a time instead. */
  pending: number;
  nextAt: number;
  lastX: number; lastY: number;
  /** The cast's aim, for the first patch (before the cursor has moved). */
  seedX: number; seedY: number;
}

/** A shot the Magnetic Field just turned aside. Visual only. */
interface Flick { owner: Owner; x: number; y: number; angle: number; at: number }

interface CoinShot {
  owner: Owner; x: number; y: number; vx: number; vy: number; until: number;
  /** E+ Magnetize: every fired coin was repulsed, so it is magnetised. */
  mag: boolean;
  /** The magnetised body this shot is perfectly locked onto, for the lock line. */
  lock: Fighter | null;
}

/** Click+ Shatter Shot: a piece of a coin that burst on the wall. */
interface Fragment {
  owner: Owner; x: number; y: number; vx: number; vy: number; until: number;
  bounces: number; seed: number; lock: Fighter | null;
}

interface Nail {
  owner: Owner;
  state: 'fly' | 'stuck' | 'return';
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  victim: Fighter | null;
  /** Where on the victim it went in, relative to their centre. */
  offX: number; offY: number;
  angle: number;
  stuckUntil: number;
  /** R+ Nailstorm. */
  golden: boolean;
  /** E+ Magnetize: re-fired by Repulse. */
  mag: boolean;
  lock: Fighter | null;
}

interface Spike {
  owner: Owner;
  state: 'hover' | 'planted' | 'flying';
  x: number; y: number;
  slamAt: number;
  until: number;
  zipped: boolean;
  vx: number; vy: number;
  hit: Set<Fighter>;
  /** F+ Electromagnet: this spike carries current. */
  live: boolean;
  nextZapAt: number;
  lock: Fighter | null;
}

interface Scrap {
  owner: Owner;
  state: 'fly' | 'ground' | 'orbit';
  x: number; y: number;
  vx: number; vy: number;
  angle: number; spin: number;
  size: number; seed: number;
  until: number;
  hit: Set<Fighter>;
  /** F+ Electromagnet: broken off a live spike. */
  live: boolean;
  /** E+ Magnetize: broken off a repulsed spike — flies straight home. */
  home: boolean;
}

/** A shard streaming in from the screen edge during the Mecha Massacre wind-up. Visual only. */
interface GatherBit { owner: Owner; sx: number; sy: number; startAt: number; landAt: number; seed: number; size: number }

interface Motion { kind: 'zip' | 'dash'; vx: number; vy: number; until: number; tx: number; ty: number }

interface Side {
  aimX: number; aimY: number;
  hover: boolean;
  gatherUntil: number;
  nextBitAt: number;
  mech: MagnetMech | null;
  /** The pilot is inside the mech right now. */
  piloting: boolean;
  preHp: number;
  prevAbsorber: ((amount: number) => boolean) | null;
  /** Ejected by Self-Destruct, still in the air. */
  pod: { sx: number; sy: number; lx: number; ly: number; startAt: number; landAt: number } | null;
  motion: Motion | null;
  nextZapAt: number;
  /** F+ Electromagnet: rode a live spike — faster, with a zapping aura, until this time. */
  chargedUntil: number;
  nextAuraZapAt: number;
  nextShieldZapAt: number;
  /** Q+ Salvage Salvo: the parts picked for the next mech (kept between mechs). */
  build: MechBuild;
  /** The mech body was up last frame — catches it falling on its own (timeout or a drained core). */
  mechLive: boolean;
  /** Core hits not yet shown as a floating number, and when the last one was shown. */
  coreDrainPending: number;
  coreShownAt: number;
  coreFlashUntil: number;
  /** The pilot's damage absorber while the core can be hurt. Built once per mech. */
  coreAbsorber: ((amount: number) => boolean) | null;
  /** Mastery — the last Mag-Lev (scene time). Starts a cooldown in the past so it is ready. */
  maglevAt: number;
  /** Standing on our own maglev ground this frame: we wrote `levitating`, so we take it back. */
  floating: boolean;
}

const makeSide = (): Side => ({
  aimX: 0, aimY: 0, hover: false, gatherUntil: 0, nextBitAt: 0, mech: null, piloting: false,
  preHp: 0, prevAbsorber: null, pod: null, motion: null, nextZapAt: 0,
  chargedUntil: 0, nextAuraZapAt: 0, nextShieldZapAt: 0, maglevAt: -MAGLEV_COOLDOWN_MS, floating: false,
  build: defaultBuild(), mechLive: false, coreDrainPending: 0, coreShownAt: 0, coreFlashUntil: 0, coreAbsorber: null,
});

/** Mech key per ability slot, in tray order. */
const MECH_KEYS: Record<string, Exclude<MechAttack, 'destruct'> | 'destruct'> = {
  'magnet-coin': 'smash',
  'magnet-repulse': 'rail',
  'magnet-nail': 'avalanche',
  'magnet-spike': 'cannon',
  'magnet-mecha': 'destruct',
};

const MECH_CARDS: Array<[string, string]> = [
  ['[Click] Hydraulic Smash', 'Fist slam: 20 dmg, 3 scrap falls'],
  ['[E] Mag Rail', 'Live rail down the arena: 15/1s'],
  ['[R] Scrap Avalanche', 'Junk wall pins them, 50 scrap rain'],
  ['[F] Visor Cannon', '4s beam + burning slag'],
  ['[Q] Self-Destruct', 'Eject: 20 blasts across arena'],
];

// ── Arena API ─────────────────────────────────────────────────────────────

export interface MagnetArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly width: number;
  readonly height: number;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly isOnline: boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  readonly isInvasion: boolean;
  readonly playerAbilities: Ability[];
  readonly abilityBars: Array<{ lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  isTargetable(f: Fighter): boolean;
  /** Invasion: take one husk shot within `r` of the point out of the air. False if none. */
  blockHuskShot(x: number, y: number, r: number): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** The owner's shop upgrade in `slot` — our own purchases, or the bot's/remote's loadout. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay one of the kit's non-ability actions (`magnet-recall`, `mecha-smash`, …). */
  broadcast(id: string): void;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  magnetColor(owner: Owner, base: number): number;
  /** Invasion: bend each husk shot entering the circle once by `rad`. Returns how many. */
  deflectHuskShots(x: number, y: number, r: number, rad: number, seen: WeakSet<object>): number;
  // ── Mastery ──
  readonly masteryActive: boolean;
  readonly npcMasteryActive: boolean;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
}

// ── MagnetKit ─────────────────────────────────────────────────────────────

/**
 * Magnet — a scrap-metal magician. Everything it owns is metal lying around the arena, and every
 * key is a different way of throwing that metal or of throwing itself at it.
 *
 * - **Coin Flip** (Click) tosses a coin that arcs for 3s and vanishes when it lands. Holding the
 *   button freezes every coin in the air (and its timer) in a blue field.
 * - **Repulse** (E) is a short cone that fires whatever is inside it the way you are facing:
 *   coins become bullets, a planted spike becomes a javelin, a nail on its way home is re-fired at
 *   the cursor, and an orbiting shard throws *you*. Nailed enemies are shoved from much further.
 * - **Nail Implant** (R) sticks a nail in someone (10). Again rips every nail out (15 each) and
 *   sends them flying home — which is exactly when Repulse wants to meet them.
 * - **Steel Spike** (F) hangs a rod over the cursor for 2s, then drives it in (22 + shockwave).
 *   Again pulls you to it; Repulse launches it (30), and a launched spike that hits a wall breaks
 *   into three shards that orbit you once collected, block shots and chip whoever comes close.
 * - **Mecha Massacre** (Q) roots you for 3s while scrap streams in from the edges, then you are
 *   the mech for 15s (see MagnetMech — Earth's old Titan Form, rebuilt).
 *
 * Both sides can play it. In an online match the npc side is a replica: its casts are replayed
 * here for the picture, but its pushes, stuns and self-motion on our player are left to the relay.
 */
export class MagnetKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  private readonly pcol: MagnetColorFn;
  private readonly ncol: MagnetColorFn;
  private readonly pfx: MagnetFx;
  private readonly nfx: MagnetFx;
  private playerAvatar: MagnetAvatar | null = null;
  private npcAvatar: MagnetAvatar | null = null;
  /** Floor layer under the fighters: spikes, resting scrap, shadows. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Air layer over the fighters: coins, nails, shots, orbiting scrap. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ────────────────────────────────────────────────────────────────
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private coins: Coin[] = [];
  private coinShots: CoinShot[] = [];
  private nails: Nail[] = [];
  private spikes: Spike[] = [];
  private scraps: Scrap[] = [];
  private bits: GatherBit[] = [];
  private fragments: Fragment[] = [];
  /** E+ Magnetize: who is magnetised, by which side, until when. */
  private magnetized = new Map<Fighter, { by: Owner; until: number }>();
  /** Q+ Salvage Salvo (Furnace head): each side's Fx in the red mech palette, built on first use. */
  private megaFx: Partial<Record<Owner, MagnetFx>> = {};
  /** Q+ Salvage Salvo: the part menus round the gathering player, and the Junkyard's TNT. */
  private picker: SalvoPicker | null = null;
  private crates: SalvoCrates;
  private salvoSeq = 0;
  private shoves = new Map<Fighter, { vx: number; vy: number; until: number }>();
  private stuns = new Map<Fighter, number>();
  /** Mastery — Mag-Lev tracks, both sides. */
  private tracks: MagTrack[] = [];
  /** Mastery — shots the Magnetic Field has already bent (each is bent once). */
  private fieldSeen = new WeakSet<object>();
  private flicks: Flick[] = [];
  /** Who is held back on whose track this frame — the duel pair's speed mults read it. */
  private maglevSlowed = new Set<Fighter>();
  private wasDown = false;
  private downAt = 0;
  private cardsSwapped = false;

  constructor(private arena: MagnetArenaApi) {
    this.pcol = (base) => arena.magnetColor('player', base);
    this.ncol = (base) => arena.magnetColor('npc', base);
    this.pfx = new MagnetFx(arena.scene, this.pcol);
    this.nfx = new MagnetFx(arena.scene, this.ncol);
    this.crates = new SalvoCrates({
      get scene() { return arena.scene; },
      get width() { return arena.width; },
      get height() { return arena.height; },
      targets: (owner) => this.targetsOf(owner),
      hit: (owner, t, dmg) => this.hit(owner, t, dmg, MAGNET.amber),
      fx: (owner) => this.fx(owner),
      col: (owner) => this.col(owner),
      bodyR: (f) => this.bodyR(f),
      announce: (x, y, text, color) => this.announce(x, y, text, color),
    });
  }

  // ── Small helpers ──────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private fx(owner: Owner): MagnetFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MagnetColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private avatar(owner: Owner): MagnetAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private isMagnet(owner: Owner): boolean {
    return owner === 'player' ? this.arena.elementId === 'magnet' : this.arena.npcElementId === 'magnet';
  }
  /** The owner's shop upgrade in `slot`, and only while that owner is actually playing Magnet. */
  private up(owner: Owner, slot: string): boolean {
    return this.isMagnet(owner) && this.arena.hasUpgrade(owner, slot);
  }
  /** An online opponent: drawn and replayed here, simulated (and moved) on their own machine. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.arena.isOnline; }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side, and a co-op ally's attacks resolve on
    // its own machine — here they touch nobody.
    if (owner === 'npc' && this.arena.isInvasion) return [];
    const list = owner === 'player' ? this.arena.enemies : [this.arena.player];
    return list.filter((f) => this.alive(f) && this.arena.isTargetable(f));
  }

  /** Everything the kit may have left a field or a shove on. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private get left(): number { return PAD; }
  private get right(): number { return this.arena.width - PAD; }
  private get top(): number { return PAD; }
  private get bottom(): number { return this.arena.height - PAD; }

  private hit(owner: Owner, t: Fighter, dmg: number, color: number = MAGNET.sky): void {
    t.takeDamage(dmg);
    this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(color));
  }

  /**
   * Hold `f` at a velocity for `ms`. Our own replica's pushes on the local player are skipped:
   * the attacker's machine relays the shove it saw, and applying ours as well would double it.
   */
  private shove(by: Owner, f: Fighter, vx: number, vy: number, ms: number): void {
    if (this.isReplica(by) && f === this.arena.player) return;
    this.shoves.set(f, { vx, vy, until: this.now + ms });
  }

  private stunned(f: Fighter): boolean { return this.now < (this.stuns.get(f) ?? 0); }

  /** The player and the bot are held by this kit's speed mults, husks by `earthStunnedUntil`. */
  private stun(by: Owner, f: Fighter, ms: number): void {
    if (this.isReplica(by) && f === this.arena.player) return;
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    if (f !== this.arena.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private announce(x: number, y: number, text: string, color: number): void {
    const { scene } = this.arena;
    const t = scene.add.text(x, y, text, {
      fontSize: '12px', fontFamily: 'Arial Black', color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#07090e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Is `(x, y)` inside the Repulse cone cast from `f` toward `angle`? */
  private inCone(f: Fighter, angle: number, x: number, y: number, slack = 0): boolean {
    const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
    if (d > REPULSE_R + slack) return false;
    if (d < 24) return true;
    const a = Math.atan2(y - f.y, x - f.x);
    return Math.abs(Phaser.Math.Angle.Wrap(a - angle)) <= REPULSE_HALF;
  }

  private orbitOf(owner: Owner): Scrap[] { return this.scraps.filter((s) => s.owner === owner && s.state === 'orbit'); }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      // The scene rebuilds its fighters, so a pilot left hidden needs nothing restored.
      s.mech?.destroy();
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.picker?.destroy(); this.picker = null;
    this.crates.reset();
    this.coins = [];
    this.coinShots = [];
    this.nails = [];
    this.spikes = [];
    this.scraps = [];
    this.bits = [];
    this.fragments = [];
    this.magnetized.clear();
    this.shoves.clear();
    this.stuns.clear();
    this.tracks = [];
    this.fieldSeen = new WeakSet();
    this.flicks = [];
    this.maglevSlowed.clear();
    this.wasDown = false;
    this.downAt = 0;
    this.cardsSwapped = false;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    for (const id of ['magnet-coins', 'magnet-scrap', 'magnet-nailed', 'magnet-mech', 'magnet-magnetized', 'magnet-charged', 'magnet-maglev', 'magnet-maglev-slow']) {
      this.arena.setStatusIndicator(id, null);
    }
  }

  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) this.groundGfx = this.arena.scene.add.graphics().setDepth(4);
    return this.groundGfx;
  }

  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) this.airGfx = this.arena.scene.add.graphics().setDepth(9);
    return this.airGfx;
  }

  // ── Input ──────────────────────────────────────────────────────────────

  /**
   * Player input. A click tosses a coin; a click *held* past {@link HOVER_DELAY_MS} stops tossing
   * and holds every coin in the air until it is let go. R and F each have a second job that never
   * touches the cooldown — ripping nails out, riding to a spike — and in the mech every key is
   * one of the mech's.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const now = this.now;
    const down = pointer.isDown;
    const pressed = down && !this.wasDown;
    this.wasDown = down;
    if (pressed) this.downAt = now;

    if (s.piloting && s.mech?.active) {
      this.setHover('player', false);
      const keys: Array<[boolean, MechAttack]> = [
        [pressed, 'smash'],
        [Phaser.Input.Keyboard.JustDown(eKey), 'rail'],
        [Phaser.Input.Keyboard.JustDown(rKey), 'avalanche'],
        [Phaser.Input.Keyboard.JustDown(fKey), 'cannon'],
        [Phaser.Input.Keyboard.JustDown(qKey), 'destruct'],
      ];
      for (const [hit, a] of keys) if (hit) this.mechKey('player', a, mouseX, mouseY);
      return;
    }
    // Rooted and busy while the scrap gathers — Q+ Salvage Salvo picks its parts meanwhile.
    if (s.gatherUntil > 0) {
      const pick = pressed && this.picker ? this.picker.click(mouseX, mouseY) : null;
      if (pick) {
        applyPick(s.build, pick.part, pick.idx);
        Sfx.playAt('ui-click', player.x, { volume: 0.5 });
        // A sequence number keeps two quick identical picks from being deduped as one cast.
        this.arena.broadcast(`salvo-pick:${++this.salvoSeq}:${pick.part}:${pick.idx}`);
      }
      return;
    }

    const ctx = (): CastContext => this.arena.buildPlayerContext(mouseX, mouseY);
    if (pressed) player.castAbility('magnet-coin', ctx());
    this.setHover('player', down && now - this.downAt >= HOVER_DELAY_MS);

    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('magnet-repulse', ctx());

    // Mastery: whichever of R/F/Q Mag-Lev was dropped on stops being its own ability — second
    // jobs (the rip-out, the zip) included.
    const bound = this.magLevSlot('player');
    for (const [k, key] of [['r', rKey], ['f', fKey], ['q', qKey]] as const) {
      if (bound === k && Phaser.Input.Keyboard.JustDown(key)) this.tryMagLev('player', mouseX, mouseY);
    }

    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (this.nails.some((n) => n.owner === 'player' && n.state === 'stuck')) {
        this.doRecall('player');
        this.arena.broadcast('magnet-recall');
      } else {
        player.castAbility('magnet-nail', ctx());
      }
    }

    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      if (this.zipTarget('player', mouseX, mouseY)) {
        this.doZip('player', mouseX, mouseY);
        this.arena.broadcast('magnet-zip');
      } else {
        player.castAbility('magnet-spike', ctx());
      }
    }

    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('magnet-mecha', ctx());
  }

  private setHover(owner: Owner, on: boolean): void {
    const s = this.sides[owner];
    if (s.hover === on) return;
    s.hover = on;
    if (owner === 'player') this.arena.broadcast(on ? 'magnet-hover-on' : 'magnet-hover-off');
    if (on) {
      const f = this.fighter(owner);
      Sfx.playAt('magnet-pull', f.x, { rate: 1.6, volume: 0.35 });
    }
  }

  private mechKey(owner: Owner, a: MechAttack, x: number, y: number): void {
    const s = this.sides[owner];
    const mech = s.mech;
    if (!mech?.active) return;
    if (!mech.use(a, this.now, x, y)) return;
    if (owner === 'player') this.arena.broadcast(`mecha-${a}`);
    if (a === 'destruct') this.ejectPilot(owner);
    Sfx.playAt(a === 'smash' ? 'stone-slam' : a === 'rail' ? 'electric-charge' : a === 'cannon' ? 'beam-charge' : 'explosion-large',
      this.arena.width / 2, { volume: 0.6 });
  }

  /**
   * Online: one of the opponent's non-ability actions, already un-mirrored. Their abilities come
   * through the normal cast relay; these are the presses that never touch a cooldown.
   */
  replayNet(id: string, tx: number, ty: number): void {
    const s = this.sides.npc;
    s.aimX = tx;
    s.aimY = ty;
    switch (id) {
      case 'magnet-hover-on': this.sides.npc.hover = true; break;
      case 'magnet-hover-off': this.sides.npc.hover = false; break;
      case 'magnet-recall': this.doRecall('npc'); break;
      case 'magnet-zip': this.doZip('npc', tx, ty); break;
      case 'magnet-spike-land': {
        // Their spike followed their cursor; put ours where theirs came down. It may still be
        // hovering here, or have just landed if their message lost the race with our timer.
        const now = this.now;
        const sp = this.spikes.find((k) => k.owner === 'npc' && k.state === 'hover')
          ?? this.spikes.find((k) => k.owner === 'npc' && k.state === 'planted' && now - (k.until - SPIKE_LIFE_MS) < 600);
        if (sp) Object.assign(sp, this.clampSpike('npc', tx, ty));
        break;
      }
      case MAGLEV_ID: this.tryMagLev('npc', tx, ty); break;
      default:
        // Mag-Lev: each patch of their track, laid toward where their cursor was at that moment.
        if (id.startsWith('maglev-step:')) {
          const tr = this.tracks.filter((k) => k.owner === 'npc').pop();
          if (tr && tr.pending > 0) this.growTrack(tr, tx, ty);
        }
        if (id.startsWith('salvo-pick:')) {
          // salvo-pick:<seq>:<part>:<idx>
          const [, , part, idx] = id.split(':');
          applyPick(s.build, part as SalvoPart, Number(idx));
        }
        if (id === 'mecha-end') {
          // Their mech ran out (or its core was drained) on their machine.
          if (s.mech?.active) s.mech.end(this.now, false);
        } else if (id.startsWith('mecha-')) {
          const a = id.slice(6) as MechAttack;
          if (s.mech?.active && s.mech.use(a, this.now, tx, ty) && a === 'destruct') this.ejectPilot('npc');
        }
    }
  }

  // ── Casts (from the CastContext) ────────────────────────────────────────

  /** Click — Coin Flip: straight up off your thumb, landing where you stood. */
  doCoin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const mine = this.coins.filter((c) => c.owner === owner);
    if (mine.length >= COIN_MAX) {
      // The oldest coin drops out of the air to make room.
      this.coins.splice(this.coins.indexOf(mine[0]), 1);
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.coins.push({
      owner, sx: f.x, sy: f.y, lx: f.x, ly: f.y, air: 0, x: f.x, y: f.y, z: 0,
      spin: Math.random() * Math.PI, spinRate: 14 + Math.random() * 6, magHeld: false,
    });
    this.avatar(owner)?.play('punch', ang, 220);
    this.fx(owner).sparks(f.x, f.y - 10, 3, -Math.PI / 2, 10, MAGNET.goldHi);
  }

  /** E — Repulse. Fires everything in the cone toward the aim. */
  doRepulse(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const fx = this.fx(owner);
    fx.repulse(f.x, f.y, ang, REPULSE_R, REPULSE_HALF, MAGNET.blue);
    this.avatar(owner)?.play('clap', ang, 300);

    // Coins: every one inside the cone is fired the way you face, from where it hangs.
    let fired = 0;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.owner !== owner) continue;
      const hy = c.y - c.z;
      if (!this.inCone(f, ang, c.x, hy, 12) && !this.inCone(f, ang, c.x, c.y, 12)) continue;
      this.coins.splice(i, 1);
      this.coinShots.push({
        owner, x: c.x, y: hy, vx: cos * COIN_SHOT_SPEED, vy: sin * COIN_SHOT_SPEED, until: this.now + COIN_SHOT_MS,
        mag: this.up(owner, 'e'), lock: null,
      });
      fired++;
    }
    if (fired > 0) Sfx.playAt('money', f.x, { rate: 1.5, volume: 0.4 });

    // Q+ Salvage Salvo: Junkyard TNT crates in the cone are thrown.
    if (this.crates.repulse(owner, (x, y) => this.inCone(f, ang, x, y, 18), ang) > 0) {
      this.announce(f.x, f.y - 40, 'TNT AWAY!', MAGNET.amber);
      Sfx.playAt('whoosh', f.x, { rate: 0.7, volume: 0.6 });
    }

    // Planted spikes in the cone become javelins.
    for (const sp of this.spikes) {
      if (sp.owner !== owner || sp.state !== 'planted') continue;
      if (!this.inCone(f, ang, sp.x, sp.y, 20)) continue;
      sp.state = 'flying';
      sp.vx = cos * ROD_SPEED;
      sp.vy = sin * ROD_SPEED;
      sp.hit = new Set();
      fx.sparks(sp.x, sp.y, 8, ang, 10, MAGNET.sky);
      Sfx.playAt('whoosh', sp.x, { rate: 0.8, volume: 0.6 });
    }

    // Nails on their way home are caught by the wave and re-fired at the aim.
    for (const n of this.nails) {
      if (n.owner !== owner || n.state !== 'return') continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, n.x, n.y) > NAIL_REFIRE_R) continue;
      const a = Math.atan2(ty - n.y, tx - n.x);
      n.state = 'fly';
      n.vx = Math.cos(a) * NAIL_SPEED;
      n.vy = Math.sin(a) * NAIL_SPEED;
      n.travelled = 0;
      n.angle = a;
      n.mag = this.up(owner, 'e');
      fx.sparks(n.x, n.y, 6, a, 10, MAGNET.sky);
      this.announce(n.x, n.y - 18, 'RE-FIRED', MAGNET.sky);
    }

    // One shard of your orbit in the cone throws you the way you face.
    const shard = this.orbitOf(owner)
      .filter((sc) => this.inCone(f, ang, sc.x, sc.y, 16))
      .sort((a, b) => Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(a.y - f.y, a.x - f.x) - ang))
        - Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(b.y - f.y, b.x - f.x) - ang)))[0];
    if (shard) {
      this.scraps.splice(this.scraps.indexOf(shard), 1);
      fx.shrapnel(shard.x, shard.y, 5, { angle: ang + Math.PI, spread: 0.6, speed: 260, size: 8, color: MAGNET.gunHi });
      if (!this.isReplica(owner)) {
        s.motion = { kind: 'dash', vx: cos * SCRAP_DASH_SPEED, vy: sin * SCRAP_DASH_SPEED, until: this.now + SCRAP_DASH_MS, tx: 0, ty: 0 };
      }
      Sfx.playAt('dash', f.x, { volume: 0.5 });
    }

    // Mastery — Mag-Lev: the wave hits your own maglev ground and the ground pushes back.
    if (this.trackInCone(owner, f, ang)) {
      if (!this.isReplica(owner)) {
        s.motion = { kind: 'dash', vx: -cos * MAGLEV_KICK_SPEED, vy: -sin * MAGLEV_KICK_SPEED, until: this.now + MAGLEV_KICK_MS, tx: 0, ty: 0 };
      }
      fx.sparks(f.x, f.y, 10, ang + Math.PI, 14, MAGNET.rose);
      this.announce(f.x, f.y - 40, 'MAG KICK', MAGNET.rose);
      Sfx.playAt('whoosh', f.x, { rate: 1.3, volume: 0.6 });
    }

    // Nailed bodies are shoved from much further away — the nail in them is the handle.
    const storm = this.up(owner, 'r');
    const magnetize = this.up(owner, 'e');
    for (const t of this.targetsOf(owner)) {
      const nailed = this.nailsIn(owner, t);
      const touched = this.inCone(f, ang, t.x, t.y, this.bodyR(t));
      if (nailed > 0) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d > REPULSE_PUSH_RANGE) continue;
        const a = Math.atan2(t.y - f.y, t.x - f.x);
        // R+ Nailstorm: every nail in them is another handle to throw them by — and it hurts.
        const k = (1 - 0.4 * (d / REPULSE_PUSH_RANGE)) * (storm ? 1 + NAILSTORM_SHOVE_PER_NAIL * (nailed - 1) : 1);
        this.shove(owner, t, Math.cos(a) * REPULSE_PUSH_SPEED * k, Math.sin(a) * REPULSE_PUSH_SPEED * k, REPULSE_PUSH_MS);
        fx.grasp(f.x, f.y, t.x, t.y, MAGNET.blue, 300);
        if (storm) this.hit(owner, t, NAILSTORM_SHOVE_DAMAGE * nailed, MAGNET.gold);
        this.announce(t.x, t.y - 30, storm && nailed > 1 ? `REPULSED ×${nailed}` : 'REPULSED', MAGNET.sky);
        this.record(owner, 'nailedRepulses');
        if (magnetize) this.magnetize(owner, t, MAGNETIZE_MS + (storm ? NAILSTORM_MAGNETIZE_PER_NAIL * nailed : 0));
      } else if (magnetize && touched) {
        // E+ Magnetize: the wave itself leaves a charge in anyone it washes over.
        this.magnetize(owner, t, MAGNETIZE_MS);
      }
    }
  }

  /** How many of `owner`'s nails are stuck in `t`. */
  private nailsIn(owner: Owner, t: Fighter): number {
    let n = 0;
    for (const nl of this.nails) if (nl.owner === owner && nl.state === 'stuck' && nl.victim === t) n++;
    return n;
  }

  // ── E+ Magnetize ───────────────────────────────────────────────────────

  private isMagnetized(by: Owner, f: Fighter): boolean {
    const m = this.magnetized.get(f);
    return !!m && m.by === by && this.now < m.until;
  }

  private magnetize(by: Owner, f: Fighter, ms: number): void {
    const fresh = !this.isMagnetized(by, f);
    const until = Math.max(fresh ? 0 : this.magnetized.get(f)!.until, this.now + ms);
    this.magnetized.set(f, { by, until });
    if (fresh) {
      this.announce(f.x, f.y - 44, 'MAGNETIZED', MAGNET.rose);
      this.fx(by).sparks(f.x, f.y, 8, -Math.PI / 2, 10, MAGNET.sky);
    }
  }

  /**
   * Where one of `owner`'s shots should bend, under E+ Magnetize. In order:
   * 1. a magnetised shot and a magnetised body: a perfect lock (`rate` Infinity);
   * 2. any shot passing close to a magnetised body is pulled toward it;
   * 3. a magnetised shot with nothing magnetised about drifts toward the nearest body.
   * `skip` leaves out bodies the shot has already gone through.
   */
  private homing(
    owner: Owner, x: number, y: number, mag: boolean, basicRate: number, skip?: Set<Fighter>,
  ): { t: Fighter; rate: number; lock: boolean } | null {
    if (!this.up(owner, 'e')) return null;
    const foes = this.targetsOf(owner).filter((t) => !skip?.has(t));
    const nearest = (pick: (t: Fighter, d: number) => boolean): Fighter | null => {
      let best: Fighter | null = null;
      let bestD = Infinity;
      for (const t of foes) {
        const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
        if (d < bestD && pick(t, d)) { best = t; bestD = d; }
      }
      return best;
    };
    if (mag) {
      const t = nearest((v, d) => d <= LOCK_RANGE && this.isMagnetized(owner, v));
      if (t) return { t, rate: Infinity, lock: true };
    }
    const pull = nearest((v, d) => d <= ATTRACT_R + this.bodyR(v) && this.isMagnetized(owner, v));
    if (pull) return { t: pull, rate: ATTRACT_RATE, lock: false };
    if (mag) {
      const t = nearest((_, d) => d <= HOMING_RANGE);
      if (t) return { t, rate: basicRate, lock: false };
    }
    return null;
  }

  /** Turn a velocity toward a point by at most `rate` rad/s, keeping its speed. */
  private steer(vx: number, vy: number, x: number, y: number, tx: number, ty: number, rate: number, dt: number): { vx: number; vy: number } {
    const speed = Math.hypot(vx, vy);
    const cur = Math.atan2(vy, vx);
    const want = Math.atan2(ty - y, tx - x);
    const diff = Phaser.Math.Angle.Wrap(want - cur);
    // A perfect lock simply points at the target (Infinity × a 0ms frame would be NaN).
    const a = rate === Infinity || Math.abs(diff) <= rate * dt ? want : cur + Math.sign(diff) * rate * dt;
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  }

  /** R — Nail Implant: shoot one nail. (The rip-out is {@link doRecall}.) */
  doNail(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const a = Math.atan2(ty - f.y, tx - f.x);
    // R+ Nailstorm: a tight fan of three golden nails — close enough that all three can bite one body.
    const storm = this.up(owner, 'r');
    const count = storm ? NAILSTORM_COUNT : 1;
    for (let k = 0; k < count; k++) {
      const na = a + (count === 1 ? 0 : (k - (count - 1) / 2) * NAILSTORM_SPREAD);
      this.nails.push({
        owner, state: 'fly', x: f.x + Math.cos(na) * 18, y: f.y + Math.sin(na) * 18,
        vx: Math.cos(na) * NAIL_SPEED, vy: Math.sin(na) * NAIL_SPEED, travelled: 0,
        victim: null, offX: 0, offY: 0, angle: na, stuckUntil: 0, golden: storm, mag: false, lock: null,
      });
    }
    if (storm) this.fx(owner).sparks(f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20, 6, a, 10, MAGNET.goldHi);
    this.avatar(owner)?.play('punch', a, 240);
  }

  /** R again: rip every nail out (15 each) and send them home. */
  doRecall(owner: Owner): void {
    const f = this.fighter(owner);
    // R+ Nailstorm: the more nails a body carries, the harder each one tears coming out.
    const storm = this.up(owner, 'r');
    const counts = new Map<Fighter, number>();
    for (const nail of this.nails) {
      if (nail.owner === owner && nail.state === 'stuck' && nail.victim) counts.set(nail.victim, (counts.get(nail.victim) ?? 0) + 1);
    }
    let n = 0;
    for (const nail of this.nails) {
      if (nail.owner !== owner || nail.state !== 'stuck') continue;
      const v = nail.victim;
      if (v && this.alive(v) && this.targetsOf(owner).includes(v)) {
        const bonus = storm ? NAILSTORM_RIP_BONUS * ((counts.get(v) ?? 1) - 1) : 0;
        this.hit(owner, v, NAIL_RIP_DAMAGE + bonus, storm ? MAGNET.gold : MAGNET.rose);
      }
      nail.state = 'return';
      nail.victim = null;
      const a = Math.atan2(f.y - nail.y, f.x - nail.x);
      nail.vx = Math.cos(a) * NAIL_RETURN_SPEED;
      nail.vy = Math.sin(a) * NAIL_RETURN_SPEED;
      nail.angle = a;
      this.fx(owner).sparks(nail.x, nail.y, 7, a, 10, MAGNET.chrome);
      n++;
    }
    if (n > 0) {
      this.avatar(owner)?.play('punch', Math.atan2(this.sides[owner].aimY - f.y, this.sides[owner].aimX - f.x), 260);
      Sfx.playAt('nail', f.x, { rate: 0.8, volume: 0.6 });
    }
  }

  /** F — Steel Spike: hang a rod over the point; it drops in 2 seconds. */
  doSpike(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const a = Math.atan2(ty - f.y, tx - f.x);
    const { x, y } = this.clampSpike(owner, tx, ty);
    this.spikes.push({
      owner, state: 'hover', x, y, slamAt: this.now + SPIKE_HOVER_MS, until: 0, zipped: false,
      vx: 0, vy: 0, hit: new Set(), live: this.up(owner, 'f'), nextZapAt: 0, lock: null,
    });
    this.avatar(owner)?.play('raise', a, 400);
  }

  /** Keep a hovering spike inside cast range of its owner and inside the arena. */
  private clampSpike(owner: Owner, x: number, y: number): { x: number; y: number } {
    const f = this.fighter(owner);
    let px = x, py = y;
    if (this.alive(f)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
      if (d > SPIKE_CAST_RANGE) {
        const a = Math.atan2(y - f.y, x - f.x);
        px = f.x + Math.cos(a) * SPIKE_CAST_RANGE;
        py = f.y + Math.sin(a) * SPIKE_CAST_RANGE;
      }
    }
    return {
      x: Phaser.Math.Clamp(px, this.left + 20, this.right - 20),
      y: Phaser.Math.Clamp(py, this.top + 20, this.bottom - 20),
    };
  }

  /**
   * A hovering spike follows its owner's cursor until it drops. The player's tracks exactly; the
   * bot's chases its target at a capped speed so the shadow can still be outrun. A replica's is
   * left where it was cast — its real landing spot arrives as `magnet-spike-land`.
   */
  private steerSpike(sp: Spike, dt: number): void {
    if (this.isReplica(sp.owner)) return;
    const s = this.sides[sp.owner];
    const want = this.clampSpike(sp.owner, s.aimX, s.aimY);
    if (sp.owner === 'player') { sp.x = want.x; sp.y = want.y; return; }
    const d = Phaser.Math.Distance.Between(sp.x, sp.y, want.x, want.y);
    const step = SPIKE_NPC_FOLLOW_SPEED * dt;
    if (d <= step) { sp.x = want.x; sp.y = want.y; return; }
    const a = Math.atan2(want.y - sp.y, want.x - sp.x);
    sp.x += Math.cos(a) * step;
    sp.y += Math.sin(a) * step;
  }

  /** The spike F-again would ride to: the unridden planted one nearest the aim. */
  private zipTarget(owner: Owner, ax: number, ay: number): Spike | null {
    let best: Spike | null = null;
    let bestD = Infinity;
    for (const sp of this.spikes) {
      if (sp.owner !== owner || sp.state !== 'planted' || sp.zipped) continue;
      const d = Phaser.Math.Distance.Between(ax, ay, sp.x, sp.y);
      if (d < bestD) { bestD = d; best = sp; }
    }
    return best;
  }

  /** F again: magnetise yourself to the spike. */
  doZip(owner: Owner, ax: number, ay: number): void {
    const sp = this.zipTarget(owner, ax, ay);
    if (!sp) return;
    sp.zipped = true;
    const f = this.fighter(owner);
    const a = Math.atan2(sp.y - f.y, sp.x - f.x);
    this.fx(owner).grasp(sp.x, sp.y, f.x, f.y, MAGNET.blue, 380);
    this.avatar(owner)?.play('dash', a, 300);
    Sfx.playAt('magnet-pull', f.x, { rate: 0.9, volume: 0.55 });
    // F+ Electromagnet: magnetising yourself to a live spike leaves its current in you.
    if (sp.live) {
      const s = this.sides[owner];
      if (this.now >= s.chargedUntil) this.announce(f.x, f.y - 44, 'CHARGED', MAGNET.live);
      s.chargedUntil = this.now + CHARGE_MS;
      this.fx(owner).zap(sp.x, sp.y - 40, f.x, f.y);
      Sfx.playAt('electric-charge', f.x, { rate: 1.4, volume: 0.45 });
    }
    if (this.isReplica(owner)) return;
    this.sides[owner].motion = {
      kind: 'zip', vx: Math.cos(a) * ZIP_SPEED, vy: Math.sin(a) * ZIP_SPEED,
      until: this.now + ZIP_MAX_MS, tx: sp.x, ty: sp.y,
    };
  }

  /** Q — Mecha Massacre: stand still while the scrap comes in. */
  doMecha(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.gatherUntil > 0 || s.piloting) return;
    s.gatherUntil = this.now + GATHER_MS;
    s.nextBitAt = this.now;
    s.motion = null;
    // Q+ Salvage Salvo: the bot bolts on whatever it fancies; a replica's picks come over the wire.
    if (owner === 'npc' && this.up('npc', 'q') && !this.isReplica('npc')) s.build = randomBuild();
    this.setHover(owner, false);
    this.avatar(owner)?.play('raise', -Math.PI / 2, GATHER_MS);
    this.announce(f.x, f.y - 46, 'SCRAP INCOMING', MAGNET.neon);
    Sfx.playAt('electric-charge', f.x, { rate: 0.6, volume: 0.6 });
  }

  // ── Mech pilot ──────────────────────────────────────────────────────────

  private enterMech(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.gatherUntil = 0;
    s.mech?.destroy();
    if (owner === 'player') { this.picker?.destroy(); this.picker = null; }
    // Q+ Salvage Salvo: the picked parts. A Furnace head is the red mech — its own palette, its
    // own (bigger) numbers.
    const build: MechBuild | null = this.up(owner, 'q') ? { ...s.build } : null;
    const mega = build?.head === 'furnace';
    const red = megaMechTint((c) => c);
    s.mech = new MagnetMech({
      scene: this.arena.scene,
      width: this.arena.width,
      height: this.arena.height,
      tint: mega ? megaMechTint(this.col(owner)) : this.col(owner),
      fx: mega ? this.megaFxOf(owner) : this.fx(owner),
      targets: () => this.targetsOf(owner),
      hit: (t, dmg) => {
        const was = t.active && t.hp > 0;
        this.hit(owner, t, dmg, mega ? red(MAGNET.neon) : MAGNET.neon);
        // Mastery progress: a foe the mech finished off.
        if (was && t.hp <= 0) this.record(owner, 'mechKills');
      },
      stun: (t, ms) => this.stun(owner, t, ms),
      push: (t, vx, vy, ms) => this.shove(owner, t, vx, vy, ms),
      carry: (t, x) => {
        // Same rule as shoves: a replica's mech never moves our own body — the relay does.
        if (this.isReplica(owner) && t === this.arena.player) return;
        t.setPosition(x, t.y);
      },
      announce: (x, y, text, color) => this.announce(x, y, text, mega ? red(color) : color),
      shake: (ms, k) => this.arena.scene.cameras.main.shake(ms, k),
    }, owner === 'npc', this.now, build);
    s.piloting = true;
    s.mechLive = true;
    s.preHp = f.hp;
    s.prevAbsorber = f.damageAbsorber;
    s.coreDrainPending = 0;
    s.coreAbsorber = s.mech.coreHurtable ? (amount) => { this.coreHit(owner, amount); return true; } : null;
    this.hidePilot(owner, f);
    if (owner === 'player') this.swapCards(true);
  }

  private megaFxOf(owner: Owner): MagnetFx {
    return (this.megaFx[owner] ??= new MagnetFx(this.arena.scene, megaMechTint(this.col(owner))));
  }

  /**
   * The pilot is the mech now: hidden and rooted — reasserted every frame. Their body is the mech's
   * core: hits on it cost the mech time instead of health (unless a Salvage Salvo Base core makes
   * it untouchable).
   */
  private hidePilot(owner: Owner, f: Fighter): void {
    const s = this.sides[owner];
    f.forceInvisible = true;
    f.setAlpha(0);
    f.setHealthBarVisible(false);
    f.isInvincible = !s.coreAbsorber;
    f.damageAbsorber = s.coreAbsorber ?? (() => true);
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
  }

  /** A hit on the mech's core: the mech loses time, shown as one floating number every so often. */
  private coreHit(owner: Owner, amount: number): void {
    const s = this.sides[owner];
    if (!s.mech?.active || amount <= 0) return;
    s.mech.drain(amount * CORE_MS_PER_DAMAGE);
    s.coreDrainPending += amount * CORE_MS_PER_DAMAGE;
    s.coreFlashUntil = this.now + 160;
  }

  /** Floating text for the core's drained time, batched so a beam reads as a few numbers. */
  private showCoreDrain(owner: Owner, f: Fighter): void {
    const s = this.sides[owner];
    if (s.coreDrainPending <= 0 || this.now - s.coreShownAt < 260) return;
    this.announce(f.x, f.y - 34, `CORE HIT −${(s.coreDrainPending / 1000).toFixed(1)}s`, MAGNET.rose);
    s.coreDrainPending = 0;
    s.coreShownAt = this.now;
  }

  /** Bring the pilot back. `landed` = after a Self-Destruct pod touches down. */
  private restorePilot(owner: Owner, flash: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.piloting = false;
    s.pod = null;
    if (!f) return;
    f.forceInvisible = false;
    f.setAlpha(1);
    f.setHealthBarVisible(true);
    f.isInvincible = false;
    f.damageAbsorber = s.prevAbsorber;
    s.prevAbsorber = null;
    s.coreAbsorber = null;
    // A detour, not a heal — but it never costs you anything either. The replica's health is
    // streamed from its own machine.
    if (!this.isReplica(owner) && f.active) f.hp = Math.max(1, Math.min(f.maxHp, s.preHp));
    if (owner === 'player') this.swapCards(false);
    if (flash && f.active) {
      this.fx(owner).boom(f.x, f.y, 70, { color: MAGNET.neon, depth: 7 });
      this.arena.scene.cameras.main.shake(320, 0.02);
    }
  }

  /** Self-Destruct: the cockpit spits the pilot out toward the middle of the arena. */
  private ejectPilot(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const { width: W, height: H } = this.arena;
    const from = owner === 'npc' ? { x: W / 2, y: H - 146 } : { x: W / 2, y: 146 };
    const lx = Phaser.Math.Clamp(W / 2 + Phaser.Math.Between(-140, 140), 60, W - 60);
    const ly = owner === 'npc'
      ? Phaser.Math.Clamp(H * 0.38 + Phaser.Math.Between(-60, 60), 60, H - 120)
      : Phaser.Math.Clamp(H * 0.62 + Phaser.Math.Between(-60, 60), 120, H - 60);
    if (!this.isReplica(owner)) {
      f.setPosition(lx, ly);
      (f.body as Phaser.Physics.Arcade.Body | null)?.reset(lx, ly);
    }
    s.pod = { sx: from.x, sy: from.y, lx: f.x, ly: f.y, startAt: this.now, landAt: this.now + 620 };
    s.mechLive = false;
    // Q+ Salvage Salvo, Junkyard Scrapper: the wreck leaves its TNT behind.
    if (s.mech?.build?.head === 'junkyard') this.crates.drop(owner);
    if (owner === 'player') this.swapCards(false);
  }

  /** The ability tray takes on the mech's kit while it is up. */
  private swapCards(on: boolean): void {
    if (on === this.cardsSwapped) return;
    this.cardsSwapped = on;
    const original = this.arena.playerAbilities;
    this.arena.abilityBars.forEach((bar, idx) => {
      if (on) {
        if (idx >= MECH_CARDS.length) return;
        bar.lbl?.setText(MECH_CARDS[idx][0]);
        bar.desc?.setText(MECH_CARDS[idx][1]);
      } else {
        if (idx >= original.length) return;
        const ab = original[idx];
        // A slot Mag-Lev was bound over goes back to being Mag-Lev's card.
        const enh = this.magLevSlot('player') === ab.displayKey.toLowerCase() ? getEnhancement('magnet', MAGLEV_ID) : undefined;
        bar.lbl?.setText(`[${ab.displayKey}] ${enh ? enh.name : ab.name}`);
        bar.desc?.setText(enh ? enh.hudDescription ?? enh.description : ab.description);
      }
    });
  }

  /** Ruin (Second Skin): the mech is a body, so it can be torn off. */
  revertForms(f: Fighter): string[] {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (this.fighter(owner) !== f) continue;
      if (s.piloting && s.mech?.active) {
        s.mech.end(this.now, false);
        this.restorePilot(owner, true);
        return ['Mecha Massacre'];
      }
      if (s.gatherUntil > 0) {
        s.gatherUntil = 0;
        return ['Mecha Massacre'];
      }
    }
    return [];
  }

  // ── Per-frame ──────────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerMagnet = false, isNpcMagnet = false): void {
    void time;
    const dt = delta / 1000;
    this.vizT += dt;
    // The bot faces its target; the replica's aim comes from its relayed casts.
    const npc = this.arena.npc;
    if (!this.isReplica('npc') && this.alive(this.arena.player) && npc) {
      this.sides.npc.aimX = this.arena.player.x;
      this.sides.npc.aimY = this.arena.player.y;
    }
    this.updateGather();
    this.updateMechs(delta);
    this.crates.update(dt);
    this.updateCoins(delta);
    this.updateCoinShots(dt);
    this.updateFragments(dt);
    this.updateNails(dt);
    this.updateSpikes(dt);
    this.updateScraps(dt);
    this.updateCharge();
    this.updateMagLev();
    this.updateField();
    this.updateNpcMastery();
    this.updateMagnetized();
    this.updateMotions();
    this.updateShoves();
    this.updateStuns();
    this.paint();
    this.updateAvatars(delta, isPlayerMagnet, isNpcMagnet);
    this.pushStatuses(isPlayerMagnet);
  }

  private updateGather(): void {
    const now = this.now;
    const { width: W, height: H } = this.arena;
    // Q+ Salvage Salvo: the part menus hang round the player for as long as the gather runs.
    const ps = this.sides.player;
    const picking = ps.gatherUntil > 0 && this.up('player', 'q') && this.alive(this.arena.player);
    if (picking) {
      this.picker ??= new SalvoPicker(this.arena.scene, W, H);
      this.picker.update(this.arena.player.x, this.arena.player.y, ps.aimX, ps.aimY, ps.build, ps.gatherUntil - now);
    } else if (this.picker) {
      this.picker.destroy();
      this.picker = null;
    }
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (s.gatherUntil <= 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.gatherUntil = 0; continue; }
      if (!this.isReplica(owner)) (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      // Shards stream in from all four edges.
      while (now >= s.nextBitAt) {
        s.nextBitAt += 55;
        const edge = Math.floor(Math.random() * 4);
        const sx = edge === 0 ? -20 : edge === 1 ? W + 20 : Math.random() * W;
        const sy = edge === 2 ? -20 : edge === 3 ? H + 20 : Math.random() * H;
        this.bits.push({ owner, sx, sy, startAt: now, landAt: now + 520 + Math.random() * 260, seed: Math.floor(Math.random() * 50), size: 5 + Math.random() * 6 });
      }
      if (now >= s.gatherUntil) this.enterMech(owner);
    }
    this.bits = this.bits.filter((b) => now < b.landAt);
  }

  private updateMechs(delta: number): void {
    const now = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.mech) {
        // The bot pilots itself; a replica's keys arrive over the wire.
        if (owner === 'npc' && s.mech.active && !this.isReplica('npc')) this.npcPilot(s.mech);
        const aim = owner === 'npc' && this.isReplica('npc') && this.alive(this.arena.player)
          ? { x: this.arena.player.x, y: this.arena.player.y }
          : { x: s.aimX, y: s.aimY };
        s.mech.update(now, delta, aim.x, aim.y);
        if (s.mechLive && !s.mech.active) {
          s.mechLive = false;
          // Ran out (or its core was drained) on our machine — the replica's own clock may disagree.
          if (owner === 'player') this.arena.broadcast('mecha-end');
        }
        if (s.piloting && !s.mech.active && !s.pod) this.restorePilot(owner, false);
        if (s.mech.done) { s.mech.destroy(); s.mech = null; }
      }
      if (s.piloting && f) {
        if (!f.active) { this.restorePilot(owner, false); continue; }
        this.hidePilot(owner, f);
        this.showCoreDrain(owner, f);
        if (s.pod && now >= s.pod.landAt) this.restorePilot(owner, true);
      }
    }
  }

  /** The bot's hands on the mech: smash where the player is going, everything else on cooldown. */
  private npcPilot(mech: MagnetMech): void {
    const p = this.arena.player;
    if (!this.alive(p)) return;
    const now = this.now;
    const v = (p.body as Phaser.Physics.Arcade.Body | null)?.velocity;
    const lead = { x: p.x + (v?.x ?? 0) * 0.31, y: p.y + (v?.y ?? 0) * 0.31 };
    if (mech.until - now < 1200) { mech.use('destruct', now, p.x, p.y); this.ejectPilot('npc'); return; }
    if (mech.ready('smash', now)) mech.use('smash', now, lead.x, lead.y);
    if (mech.ready('rail', now)) mech.use('rail', now, lead.x, lead.y);
    if (mech.ready('cannon', now)) mech.use('cannon', now, p.x, p.y);
    if (mech.ready('avalanche', now) && now > mech.until - 12000) mech.use('avalanche', now, p.x, p.y);
  }

  private updateCoins(delta: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      // Mastery — Mag-Lev: a coin over its owner's track rises to its peak and stays up there (or,
      // already falling when the track arrived, stays where it was) until the ground goes dead.
      c.magHeld = c.air >= COIN_AIR_MS * 0.5 && this.onTrack(c.owner, c.x, c.y);
      const held = this.sides[c.owner].hover || c.magHeld;
      if (!held) {
        c.air += delta;
        c.spin += c.spinRate * (delta / 1000);
      } else {
        c.spin += 1.5 * (delta / 1000);
      }
      const t = Phaser.Math.Clamp(c.air / COIN_AIR_MS, 0, 1);
      c.x = Phaser.Math.Linear(c.sx, c.lx, t);
      c.y = Phaser.Math.Linear(c.sy, c.ly, t);
      c.z = 4 * COIN_PEAK * t * (1 - t);
      if (t >= 1) {
        // It hits the floor and is gone.
        this.coins.splice(i, 1);
        this.fx(c.owner).sparks(c.x, c.y, 3, -Math.PI / 2, 5, MAGNET.gold);
      }
    }
  }

  private updateCoinShots(dt: number): void {
    const now = this.now;
    for (let i = this.coinShots.length - 1; i >= 0; i--) {
      const s = this.coinShots[i];
      const h = this.homing(s.owner, s.x, s.y, s.mag, HOMING_RATE);
      s.lock = h?.lock ? h.t : null;
      if (h) Object.assign(s, this.steer(s.vx, s.vy, s.x, s.y, h.t.x, h.t.y, h.rate, dt));
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const wall = s.x < this.left || s.x > this.right || s.y < this.top || s.y > this.bottom;
      let gone = now >= s.until || wall;
      // Click+ Shatter Shot: the coin bursts on the wall and the pieces come back into the arena.
      if (wall && now < s.until && this.up(s.owner, 'click')) {
        let nx = 0, ny = 0;
        if (s.x < this.left) nx = 1; else if (s.x > this.right) nx = -1;
        if (s.y < this.top) ny = 1; else if (s.y > this.bottom) ny = -1;
        this.shatterCoin(s.owner, Phaser.Math.Clamp(s.x, this.left, this.right), Phaser.Math.Clamp(s.y, this.top, this.bottom), Math.atan2(ny, nx));
      }
      if (!gone) {
        for (const t of this.targetsOf(s.owner)) {
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + 8) continue;
          this.hit(s.owner, t, COIN_SHOT_DAMAGE, MAGNET.gold);
          this.record(s.owner, 'coinHits');
          this.fx(s.owner).sparks(s.x, s.y, 4, Math.atan2(s.vy, s.vx) + Math.PI, 10, MAGNET.goldHi);
          gone = true;
          break;
        }
      }
      if (gone) this.coinShots.splice(i, 1);
    }
  }

  /**
   * Click+ Shatter Shot. The fragments fan out at the nearest enemy — or, if anyone is
   * magnetised, every one of them goes straight at that body and stays locked on.
   */
  private shatterCoin(owner: Owner, x: number, y: number, inward: number): void {
    const foes = this.targetsOf(owner);
    const byDist = (a: Fighter, b: Fighter): number =>
      Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y);
    const mag = foes.filter((t) => this.isMagnetized(owner, t)).sort(byDist)[0] ?? null;
    const near = mag ?? foes.slice().sort(byDist)[0] ?? null;
    const aim = near ? Math.atan2(near.y - y, near.x - x) : inward;
    const spread = mag ? 0.04 : FRAGMENT_SPREAD;
    for (let k = 0; k < SHATTER_FRAGMENTS; k++) {
      const a = aim + (k / (SHATTER_FRAGMENTS - 1) - 0.5) * 2 * spread + (Math.random() - 0.5) * 0.08;
      const v = FRAGMENT_SPEED * (0.9 + Math.random() * 0.2);
      this.fragments.push({
        owner, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, until: this.now + FRAGMENT_MS,
        bounces: 1, seed: Math.floor(Math.random() * 100), lock: mag,
      });
    }
    const fx = this.fx(owner);
    fx.flash(x, y, 18, 10, MAGNET.goldHi);
    fx.sparks(x, y, 7, inward, 10, MAGNET.gold);
    Sfx.playAt('clang', x, { rate: 1.8, volume: 0.35 });
  }

  private updateFragments(dt: number): void {
    const now = this.now;
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const fr = this.fragments[i];
      // A magnetised body is where every fragment goes, no matter how it left the wall.
      let lock: Fighter | null = null;
      let bestD = Infinity;
      for (const t of this.targetsOf(fr.owner)) {
        if (!this.isMagnetized(fr.owner, t)) continue;
        const d = Phaser.Math.Distance.Between(fr.x, fr.y, t.x, t.y);
        if (d < bestD) { bestD = d; lock = t; }
      }
      fr.lock = lock;
      if (lock) Object.assign(fr, this.steer(fr.vx, fr.vy, fr.x, fr.y, lock.x, lock.y, Infinity, dt));
      fr.x += fr.vx * dt;
      fr.y += fr.vy * dt;
      let gone = now >= fr.until;
      if (!gone && (fr.x < this.left || fr.x > this.right)) {
        if (fr.bounces-- > 0) { fr.vx = -fr.vx; fr.x = Phaser.Math.Clamp(fr.x, this.left, this.right); } else gone = true;
      }
      if (!gone && (fr.y < this.top || fr.y > this.bottom)) {
        if (fr.bounces-- > 0) { fr.vy = -fr.vy; fr.y = Phaser.Math.Clamp(fr.y, this.top, this.bottom); } else gone = true;
      }
      if (!gone) {
        for (const t of this.targetsOf(fr.owner)) {
          if (Phaser.Math.Distance.Between(fr.x, fr.y, t.x, t.y) > this.bodyR(t) + 5) continue;
          this.hit(fr.owner, t, FRAGMENT_DAMAGE, MAGNET.gold);
          this.record(fr.owner, 'coinHits');
          this.fx(fr.owner).sparks(fr.x, fr.y, 2, Math.atan2(fr.vy, fr.vx) + Math.PI, 10, MAGNET.goldHi);
          gone = true;
          break;
        }
      }
      if (gone) this.fragments.splice(i, 1);
    }
  }

  private updateNails(dt: number): void {
    const now = this.now;
    for (let i = this.nails.length - 1; i >= 0; i--) {
      const n = this.nails[i];
      const owner = this.fighter(n.owner);
      if (n.state === 'fly') {
        const h = this.homing(n.owner, n.x, n.y, n.mag, HOMING_RATE);
        n.lock = h?.lock ? h.t : null;
        if (h) {
          Object.assign(n, this.steer(n.vx, n.vy, n.x, n.y, h.t.x, h.t.y, h.rate, dt));
          n.angle = Math.atan2(n.vy, n.vx);
        }
        const sx = n.vx * dt, sy = n.vy * dt;
        n.x += sx; n.y += sy;
        n.travelled += Math.hypot(sx, sy);
        if (n.travelled > NAIL_RANGE || n.x < this.left || n.x > this.right || n.y < this.top || n.y > this.bottom) {
          this.fx(n.owner).sparks(n.x, n.y, 3, n.angle + Math.PI, 8, MAGNET.steel);
          this.nails.splice(i, 1);
          continue;
        }
        for (const t of this.targetsOf(n.owner)) {
          if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > this.bodyR(t) + 6) continue;
          this.hit(n.owner, t, NAIL_DAMAGE, MAGNET.steel);
          n.state = 'stuck';
          n.lock = null;
          n.victim = t;
          n.offX = (n.x - t.x) * 0.7;
          n.offY = (n.y - t.y) * 0.7;
          n.stuckUntil = now + NAIL_STUCK_MS;
          Sfx.playAt('nail', t.x, { volume: 0.5 });
          this.announce(t.x, t.y - 30, 'NAILED', MAGNET.rose);
          break;
        }
      } else if (n.state === 'stuck') {
        const v = n.victim;
        if (!v || !v.active || v.hp <= 0 || now >= n.stuckUntil) {
          this.fx(n.owner).sparks(n.x, n.y, 3, Math.PI / 2, 8, MAGNET.steel);
          this.nails.splice(i, 1);
          continue;
        }
        n.x = v.x + n.offX;
        n.y = v.y + n.offY;
      } else {
        // Homing back to its owner; caught on arrival.
        if (!this.alive(owner)) { this.nails.splice(i, 1); continue; }
        const a = Math.atan2(owner.y - n.y, owner.x - n.x);
        n.vx = Math.cos(a) * NAIL_RETURN_SPEED;
        n.vy = Math.sin(a) * NAIL_RETURN_SPEED;
        n.angle = a;
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (Phaser.Math.Distance.Between(n.x, n.y, owner.x, owner.y) < 22) this.nails.splice(i, 1);
      }
    }
  }

  private updateSpikes(dt: number): void {
    const now = this.now;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const sp = this.spikes[i];
      if (sp.state === 'hover') {
        this.steerSpike(sp, dt);
        if (now < sp.slamAt) continue;
        sp.state = 'planted';
        // The landing spot is wherever the cursor dragged it; tell the opponent's sim.
        if (sp.owner === 'player') this.arena.broadcast('magnet-spike-land');
        sp.until = now + SPIKE_LIFE_MS;
        this.fx(sp.owner).slam(sp.x, sp.y, SPIKE_RADIUS, MAGNET.sky);
        this.arena.scene.cameras.main.shake(180, 0.008);
        Sfx.playAt('stone-slam', sp.x, { rate: 1.3, volume: 0.6 });
        for (const t of this.targetsOf(sp.owner)) {
          const d = Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y);
          if (d > SPIKE_RADIUS + this.bodyR(t) * 0.5) continue;
          this.hit(sp.owner, t, SPIKE_DAMAGE);
          const a = Math.atan2(t.y - sp.y, t.x - sp.x);
          this.shove(sp.owner, t, Math.cos(a) * SPIKE_KNOCK, Math.sin(a) * SPIKE_KNOCK, SPIKE_KNOCK_MS);
        }
      } else if (sp.state === 'planted') {
        if (now >= sp.until) {
          this.fx(sp.owner).shrapnel(sp.x, sp.y - 20, 4, { speed: 90, size: 9, color: MAGNET.iron });
          this.spikes.splice(i, 1);
          continue;
        }
        // F+ Electromagnet: a live spike arcs into everyone standing close to it.
        if (sp.live && now >= sp.nextZapAt) {
          const near = this.targetsOf(sp.owner).filter((t) => Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) <= SPIKE_ZAP_R + this.bodyR(t));
          if (near.length > 0) {
            sp.nextZapAt = now + SPIKE_ZAP_GAP_MS;
            for (const t of near) {
              this.hit(sp.owner, t, SPIKE_ZAP_DAMAGE, MAGNET.live);
              this.fx(sp.owner).zap(sp.x, sp.y - 46, t.x, t.y);
            }
            Sfx.playAt('electric-charge', sp.x, { rate: 2, volume: 0.25 });
          }
        }
      } else {
        // E+ Magnetize: a repulsed spike is magnetised — it drifts toward a body, and locks onto a magnetised one.
        const h = this.homing(sp.owner, sp.x, sp.y, true, SPIKE_HOMING_RATE, sp.hit);
        sp.lock = h?.lock ? h.t : null;
        if (h) Object.assign(sp, this.steer(sp.vx, sp.vy, sp.x, sp.y, h.t.x, h.t.y, h.rate, dt));
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const blade = this.arena.hasPerk(sp.owner, 'blade');
        for (const t of this.targetsOf(sp.owner)) {
          if (sp.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > this.bodyR(t) + 14) continue;
          sp.hit.add(t);
          this.hit(sp.owner, t, ROD_DAMAGE * (blade ? 2 : 1));
          const a = Math.atan2(sp.vy, sp.vx);
          this.shove(sp.owner, t, Math.cos(a) * ROD_KNOCK, Math.sin(a) * ROD_KNOCK, ROD_KNOCK_MS);
          this.announce(t.x, t.y - 32, blade ? 'RUN THROUGH' : 'SKEWERED', MAGNET.sky);
        }
        // A wall: the spike shatters into scrap thrown back into the arena.
        let nx = 0, ny = 0;
        if (sp.x <= this.left) nx = 1; else if (sp.x >= this.right) nx = -1;
        if (sp.y <= this.top) ny = 1; else if (sp.y >= this.bottom) ny = -1;
        if (nx !== 0 || ny !== 0) {
          const x = Phaser.Math.Clamp(sp.x, this.left, this.right);
          const y = Phaser.Math.Clamp(sp.y, this.top, this.bottom);
          this.shatter(sp.owner, x, y, Math.atan2(ny, nx), blade ? BLADE_SCRAP_COUNT : SCRAP_COUNT, sp.live, this.up(sp.owner, 'e'));
          this.spikes.splice(i, 1);
        }
      }
    }
  }

  private shatter(owner: Owner, x: number, y: number, inward: number, count: number, live = false, home = false): void {
    const fx = this.fx(owner);
    fx.flash(x, y, 30, 10, MAGNET.sky);
    fx.shrapnel(x, y, 8, { angle: inward, spread: 0.9, speed: 260, size: 10, color: MAGNET.iron });
    this.arena.scene.cameras.main.shake(160, 0.01);
    Sfx.playAt('clang', x, { volume: 0.6 });
    for (let k = 0; k < count; k++) {
      const a = inward + (count === 1 ? 0 : (k / (count - 1) - 0.5) * 1.4) + (Math.random() - 0.5) * 0.2;
      const v = 420 + Math.random() * 140;
      this.scraps.push({
        owner, state: 'fly', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        angle: Math.random() * Math.PI, spin: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6),
        size: 9 + Math.random() * 3, seed: Math.floor(Math.random() * 100), until: 0, hit: new Set(), live, home,
      });
    }
  }

  private updateScraps(dt: number): void {
    const now = this.now;
    // Orbit angles, evenly spaced per owner.
    const orbits: Record<Owner, Scrap[]> = { player: this.orbitOf('player'), npc: this.orbitOf('npc') };
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const s = this.scraps[i];
      const owner = this.fighter(s.owner);
      if (s.state === 'fly' && s.home && this.alive(owner)) {
        // E+ Magnetize: scrap off a repulsed spike comes straight back to the hand that threw it,
        // cutting through anyone on the way.
        const a = Math.atan2(owner.y - s.y, owner.x - s.x);
        s.vx = Math.cos(a) * SCRAP_HOME_SPEED;
        s.vy = Math.sin(a) * SCRAP_HOME_SPEED;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.angle += s.spin * dt;
        for (const t of this.targetsOf(s.owner)) {
          if (s.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + s.size) continue;
          s.hit.add(t);
          this.hit(s.owner, t, SCRAP_FLY_DAMAGE, MAGNET.iron);
        }
        if (Phaser.Math.Distance.Between(s.x, s.y, owner.x, owner.y) <= SCRAP_PICKUP_R * 0.5 + this.bodyR(owner)) {
          s.home = false;
          s.vx = s.vy = 0;
          if (orbits[s.owner].length < ORBIT_MAX) {
            s.state = 'orbit';
            orbits[s.owner].push(s);
            this.fx(s.owner).grasp(owner.x, owner.y, s.x, s.y, MAGNET.blue, 260);
            Sfx.playAt('magnet-pull', owner.x, { rate: 1.8, volume: 0.3 });
          } else {
            s.state = 'ground';
            s.until = now + SCRAP_GROUND_MS;
          }
        }
      } else if (s.state === 'fly') {
        s.home = false;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const drag = Math.pow(0.12, dt);
        s.vx *= drag; s.vy *= drag;
        s.angle += s.spin * dt;
        if (s.x < this.left || s.x > this.right) { s.vx = -s.vx; s.x = Phaser.Math.Clamp(s.x, this.left, this.right); }
        if (s.y < this.top || s.y > this.bottom) { s.vy = -s.vy; s.y = Phaser.Math.Clamp(s.y, this.top, this.bottom); }
        const speed = Math.hypot(s.vx, s.vy);
        if (speed > 120) {
          for (const t of this.targetsOf(s.owner)) {
            if (s.hit.has(t)) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + s.size) continue;
            s.hit.add(t);
            this.hit(s.owner, t, SCRAP_FLY_DAMAGE, MAGNET.iron);
          }
        } else {
          s.state = 'ground';
          s.until = now + SCRAP_GROUND_MS;
          s.vx = s.vy = 0;
        }
      } else if (s.state === 'ground') {
        if (now >= s.until) { this.scraps.splice(i, 1); continue; }
        if (this.alive(owner) && orbits[s.owner].length < ORBIT_MAX
          && Phaser.Math.Distance.Between(s.x, s.y, owner.x, owner.y) < SCRAP_PICKUP_R + this.bodyR(owner)) {
          s.state = 'orbit';
          orbits[s.owner].push(s);
          this.fx(s.owner).grasp(owner.x, owner.y, s.x, s.y, MAGNET.blue, 260);
          Sfx.playAt('magnet-pull', owner.x, { rate: 1.8, volume: 0.3 });
        }
      }
    }

    for (const o of BOTH) {
      const list = orbits[o];
      const f = this.fighter(o);
      if (list.length === 0) continue;
      if (!this.alive(f)) {
        for (const s of list) { s.state = 'ground'; s.until = now + SCRAP_GROUND_MS; }
        continue;
      }
      const base = this.vizT * ORBIT_SPEED;
      const electro = this.arena.hasPerk(o, 'electromagnet');
      for (let k = list.length - 1; k >= 0; k--) {
        const s = list[k];
        const a = base + (k / list.length) * Math.PI * 2;
        s.x = f.x + Math.cos(a) * ORBIT_R;
        s.y = f.y + Math.sin(a) * ORBIT_R;
        s.angle = a * 1.3;
        if (this.orbitBlocks(o, s) || this.orbitStrikes(o, s, electro)) {
          this.scraps.splice(this.scraps.indexOf(s), 1);
          list.splice(k, 1);
        }
      }
      // F+ Electromagnet: live shards in the ring now and then shoot an incoming shot out of the air.
      if (now >= this.sides[o].nextShieldZapAt) {
        const live = list.filter((sc) => sc.live);
        if (live.length > 0 && this.shieldZap(o, f, live[Math.floor(Math.random() * live.length)])) {
          this.sides[o].nextShieldZapAt = now + SHIELD_ZAP_GAP_MS;
        }
      }
      // Electromagnet: the ring is live — one shard at a time arcs into whoever is close.
      if (electro && now >= this.sides[o].nextZapAt && list.length > 0) {
        const src = list[Math.floor(Math.random() * list.length)];
        const t = this.targetsOf(o).find((v) => Phaser.Math.Distance.Between(src.x, src.y, v.x, v.y) <= ELECTRO_ZAP_RANGE);
        if (t) {
          this.sides[o].nextZapAt = now + ELECTRO_ZAP_GAP_MS;
          this.hit(o, t, ELECTRO_ZAP_DAMAGE, MAGNET.live);
          this.fx(o).laser(src.x, src.y, t.x, t.y, MAGNET.live, 10, 2);
        }
      }
    }
  }

  /** F+ Electromagnet: the nearest enemy shot inside {@link SHIELD_ZAP_R} is burnt out of the air. The shard survives. */
  private shieldZap(owner: Owner, f: Fighter, src: Scrap): boolean {
    const { projectiles } = this.arena;
    let best: Projectile | null = null;
    let bestD = SHIELD_ZAP_R;
    if (projectiles) {
      for (const go of projectiles.getChildren()) {
        const p = go as Projectile;
        if (!p.active || p.isFromPlayer === (owner === 'player')) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y);
        if (d < bestD) { bestD = d; best = p; }
      }
    }
    if (best) {
      this.fx(owner).zap(src.x, src.y, best.x, best.y);
      best.setActive(false).setVisible(false);
      this.record(owner, 'scrapBlocks');
      return true;
    }
    if (owner === 'player' && this.arena.blockHuskShot(f.x, f.y, SHIELD_ZAP_R)) {
      const a = Math.atan2(src.y - f.y, src.x - f.x);
      this.fx(owner).zap(src.x, src.y, src.x + Math.cos(a) * 70, src.y + Math.sin(a) * 70);
      this.record(owner, 'scrapBlocks');
      return true;
    }
    return false;
  }

  /** F+ Electromagnet: the charge left in you by a live spike zaps everyone close. */
  private updateCharge(): void {
    const now = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (now >= s.chargedUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || s.piloting) { s.chargedUntil = 0; continue; }
      if (now < s.nextAuraZapAt) continue;
      const near = this.targetsOf(owner).filter((t) => Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= CHARGE_AURA_R + this.bodyR(t));
      if (near.length === 0) continue;
      s.nextAuraZapAt = now + CHARGE_AURA_GAP_MS;
      for (const t of near) {
        this.hit(owner, t, CHARGE_AURA_DAMAGE, MAGNET.live);
        this.fx(owner).zap(f.x, f.y, t.x, t.y);
      }
    }
  }

  private updateMagnetized(): void {
    const now = this.now;
    for (const [f, m] of this.magnetized) {
      if (now >= m.until || !f.active || f.hp <= 0) this.magnetized.delete(f);
    }
  }

  /** An orbiting shard soaks one enemy shot and is spent doing it. */
  private orbitBlocks(owner: Owner, s: Scrap): boolean {
    const { projectiles } = this.arena;
    if (projectiles) {
      for (const go of projectiles.getChildren()) {
        const p = go as Projectile;
        if (!p.active) continue;
        // A shot is ours if it came from our side.
        if (p.isFromPlayer === (owner === 'player')) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) > 14) continue;
        p.setActive(false).setVisible(false);
        this.fx(owner).sparks(s.x, s.y, 5, Math.atan2(s.y - p.y, s.x - p.x), 10, MAGNET.sky);
        this.fx(owner).shrapnel(s.x, s.y, 3, { speed: 140, size: 7, color: MAGNET.gunHi });
        this.record(owner, 'scrapBlocks');
        return true;
      }
    }
    if (owner === 'player' && this.arena.blockHuskShot(s.x, s.y, 14)) {
      this.fx(owner).sparks(s.x, s.y, 5, 0, 10, MAGNET.sky);
      this.record(owner, 'scrapBlocks');
      return true;
    }
    return false;
  }

  /** An orbiting shard that touches an enemy hits them and is gone. */
  private orbitStrikes(owner: Owner, s: Scrap, electro: boolean): boolean {
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + 8) continue;
      this.hit(owner, t, ORBIT_HIT_DAMAGE, MAGNET.iron);
      if (electro) this.stun(owner, t, ELECTRO_STUN_MS);
      this.fx(owner).shrapnel(s.x, s.y, 4, { speed: 160, size: 8, color: MAGNET.gunHi });
      return true;
    }
    return false;
  }

  /** Zips and scrap dashes own the body's velocity while they last. */
  private updateMotions(): void {
    const now = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const m = s.motion;
      if (!m) continue;
      const f = this.fighter(owner);
      const body = f?.body as Phaser.Physics.Arcade.Body | null;
      if (!this.alive(f) || !body || now >= m.until || s.piloting || s.gatherUntil > 0) { s.motion = null; continue; }
      if (m.kind === 'zip') {
        const d = Phaser.Math.Distance.Between(f.x, f.y, m.tx, m.ty);
        if (d < 26) { body.setVelocity(0, 0); s.motion = null; continue; }
        const a = Math.atan2(m.ty - f.y, m.tx - f.x);
        body.setVelocity(Math.cos(a) * ZIP_SPEED, Math.sin(a) * ZIP_SPEED);
      } else {
        body.setVelocity(m.vx, m.vy);
      }
      if (Math.random() < 0.5) this.fx(owner).shrapnel(f.x, f.y, 1, { speed: 40, size: 6, life: 300, depth: 4, color: MAGNET.sky, fall: 10 });
    }
  }

  private updateShoves(): void {
    const now = this.now;
    for (const [f, sh] of this.shoves) {
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      if (now >= sh.until || !f.active || !body) { this.shoves.delete(f); continue; }
      body.setVelocity(sh.vx, sh.vy);
    }
  }

  private updateStuns(): void {
    for (const [f, until] of this.stuns) {
      if (this.now < until && f.active) {
        (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
        continue;
      }
      this.stuns.delete(f);
    }
  }

  // ── Mastery ────────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are the magnet. */
  private masteryOn(owner: Owner): boolean {
    return this.isMagnet(owner) && (owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
  }

  /** Which slot Mag-Lev was dropped on, or null. */
  private magLevSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const k of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.arena.masteryBindFor(k) : this.arena.npcMasteryBindFor(k);
      if (bind === MAGLEV_ID) return k;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.isMagnet('player')) this.arena.recordMasteryStat(key, amount);
  }

  /**
   * Mag-Lev, from the bound key, the bot, or an online peer's replay. It never goes through
   * `castAbility` (the enhancement is not in the element's ability list), so the refusals that
   * gate every other key are repeated here. A replica's track is laid by its relayed steps.
   */
  private tryMagLev(owner: Owner, tx: number, ty: number): boolean {
    const f = this.fighter(owner);
    const s = this.sides[owner];
    if (!this.alive(f)) return false;
    if (!this.isReplica(owner)) {
      const wall = Date.now();
      if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil || wall < f.stunnedUntil) return false;
      if (this.now - s.maglevAt < MAGLEV_COOLDOWN_MS) return false;
      if (s.gatherUntil > 0 || s.piloting) return false;
    }
    s.maglevAt = this.now;
    this.tracks.push({
      owner, patches: [], pending: MAGLEV_PATCHES, nextAt: this.now,
      lastX: f.x, lastY: f.y, seedX: tx, seedY: ty,
    });
    const a = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('slam', a, 360);
    this.fx(owner).flash(f.x, f.y, 34, 10, MAGNET.rose);
    this.fx(owner).sparks(f.x, f.y, 10, a, 18, MAGNET.rose);
    this.announce(f.x, f.y - 46, '🚄 MAG-LEV', MAGNET.rose);
    Sfx.playAt('electric-charge', f.x, { rate: 0.8, volume: 0.55 });
    if (owner === 'player') this.arena.broadcast(MAGLEV_ID);
    return true;
  }

  /**
   * Lay the next patch of a track, one step from the last toward `(ax, ay)` — the owner's cursor
   * right now, so the track follows it like Shadow's tentacle wall. The very first patch goes
   * toward the cast's aim, and a cursor sitting on the end keeps the track going straight.
   */
  private growTrack(tr: MagTrack, ax: number, ay: number): void {
    if (tr.patches.length === 0) { ax = tr.seedX; ay = tr.seedY; }
    const dx = ax - tr.lastX, dy = ay - tr.lastY;
    const n = tr.patches.length;
    const ang = dx * dx + dy * dy < 16
      ? (n > 1 ? Math.atan2(tr.lastY - tr.patches[n - 2].y, tr.lastX - tr.patches[n - 2].x) : 0)
      : Math.atan2(dy, dx);
    const step = n === 0 ? 0 : MAGLEV_SPACING;
    const x = Phaser.Math.Clamp(tr.lastX + Math.cos(ang) * step, this.left, this.right);
    const y = Phaser.Math.Clamp(tr.lastY + Math.sin(ang) * step, this.top, this.bottom);
    tr.patches.push({ x, y, bornAt: this.now, seed: Math.random() * 10 });
    tr.lastX = x;
    tr.lastY = y;
    tr.pending--;
    tr.nextAt = this.now + MAGLEV_STEP_MS;
    this.fx(tr.owner).sparks(x, y, 3, -Math.PI / 2, 10, MAGNET.rose);
  }

  /** Is `(x, y)` on a live patch of `owner`'s maglev ground? */
  private onTrack(owner: Owner, x: number, y: number, slack = 0): boolean {
    const r = MAGLEV_PATCH_R + slack;
    for (const tr of this.tracks) {
      if (tr.owner !== owner) continue;
      for (const p of tr.patches) {
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy <= r * r) return true;
      }
    }
    return false;
  }

  /** Does a Repulse from `f` toward `angle` wash over any of `owner`'s maglev ground? */
  private trackInCone(owner: Owner, f: Fighter, angle: number): boolean {
    for (const tr of this.tracks) {
      if (tr.owner !== owner) continue;
      for (const p of tr.patches) if (this.inCone(f, angle, p.x, p.y, MAGLEV_PATCH_R * 0.6)) return true;
    }
    return false;
  }

  /**
   * Lay the tracks, let old ground go dead, and work out who is on whose: an owner on their own
   * ground floats (the `levitating` flag — Magic's Levitate) and is sped up through `speedFor`; a
   * magnetised or nailed foe on it is held back — husks through `magnetSlowMult`, the duel pair
   * through the speed mults.
   */
  private updateMagLev(): void {
    const now = this.now;
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      if (!this.isReplica(tr.owner)) {
        const s = this.sides[tr.owner];
        while (tr.pending > 0 && now >= tr.nextAt) {
          this.growTrack(tr, s.aimX, s.aimY);
          if (tr.owner === 'player') this.arena.broadcast(`maglev-step:${MAGLEV_PATCHES - tr.pending}`);
        }
      }
      tr.patches = tr.patches.filter((p) => now - p.bornAt < MAGLEV_LIFE_MS);
      // A replica's track that never got its steps is dropped once it would have gone dead anyway.
      if (tr.patches.length === 0 && (tr.pending <= 0 || now - tr.nextAt > MAGLEV_LIFE_MS)) this.tracks.splice(i, 1);
    }

    this.maglevSlowed.clear();
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const s = this.sides[owner];
      const riding = this.alive(f) && !s.piloting && this.onTrack(owner, f.x, f.y);
      if (riding) {
        f.levitating = true;
        s.floating = true;
      } else if (s.floating) {
        if (f) f.levitating = false;
        s.floating = false;
      }
      if (this.tracks.length === 0) continue;
      for (const t of this.targetsOf(owner)) {
        if (!this.onTrack(owner, t.x, t.y)) continue;
        if (this.isMagnetized(owner, t) || this.nailsIn(owner, t) > 0) this.maglevSlowed.add(t);
      }
    }
    for (const f of this.allFighters()) {
      f.magnetSlowMult = this.maglevSlowed.has(f) ? MAGLEV_SLOW_MULT : 1;
    }
  }

  /**
   * Magnetic Field: every enemy shot that crosses into the field is turned 2° — once — away from
   * the body. Deterministic (away from the centre, never a coin flip), so an online opponent's
   * sim bends it the same way ours does.
   */
  private updateField(): void {
    const now = this.now;
    this.flicks = this.flicks.filter((k) => now - k.at < FLICK_MS);
    for (const owner of BOTH) {
      if (!this.masteryOn(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.sides[owner].piloting || f.forceInvisible) continue;
      const { projectiles } = this.arena;
      if (projectiles) {
        for (const go of projectiles.getChildren()) {
          const p = go as Projectile;
          if (!p.active || p.isFromPlayer === (owner === 'player') || this.fieldSeen.has(p)) continue;
          const dx = f.x - p.x, dy = f.y - p.y;
          if (dx * dx + dy * dy > FIELD_R * FIELD_R) continue;
          this.fieldSeen.add(p);
          const body = p.body as Phaser.Physics.Arcade.Body | null;
          if (!body) continue;
          const vx = body.velocity.x, vy = body.velocity.y;
          if (vx === 0 && vy === 0) continue;
          const rel = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - Math.atan2(vy, vx));
          const turn = rel > 0 ? -FIELD_DEFLECT : FIELD_DEFLECT;
          const c = Math.cos(turn), sn = Math.sin(turn);
          body.setVelocity(vx * c - vy * sn, vx * sn + vy * c);
          p.setRotation(p.rotation + turn);
          this.flicks.push({ owner, x: p.x, y: p.y, angle: Math.atan2(body.velocity.y, body.velocity.x), at: now });
        }
      }
      if (owner === 'player' && this.arena.isInvasion) this.arena.deflectHuskShots(f.x, f.y, FIELD_R, FIELD_DEFLECT, this.fieldSeen);
    }
  }

  /**
   * The bot's half of Mag-Lev, fired here rather than from `NpcOpponent` (the rotation only has to
   * leave the bound key alone). The synergy it is cast for: a target the bot has already
   * magnetised or nailed — the track is laid at them (its aim is the target), and on it they crawl
   * at half speed while the bot rides it in at +50%. Hurt and cornered, it lays one to kick off
   * (see {@link npcRepulseAt}).
   */
  private updateNpcMastery(): void {
    if (this.arena.isOnline || this.arena.isInvasion || !this.magLevSlot('npc')) return;
    const n = this.arena.npc;
    const p = this.arena.player;
    const s = this.sides.npc;
    if (!this.alive(n) || !this.alive(p) || this.npcBusy()) return;
    if (this.now - s.maglevAt < MAGLEV_COOLDOWN_MS) return;
    if (this.tracks.some((tr) => tr.owner === 'npc')) return;
    const dist = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const marked = this.isMagnetized('npc', p) || this.nailsIn('npc', p) > 0;
    const cornered = n.hp / Math.max(1, n.maxHp) < NPC_MAGLEV_KICK_HP && dist < NPC_MAGLEV_KICK_RANGE
      && n.getCooldownRatio('magnet-repulse') >= 1;
    if ((marked && dist < NPC_MAGLEV_MARKED_RANGE) || cornered) this.tryMagLev('npc', p.x, p.y);
  }

  /** The mastery card. */
  getMagLevCooldownRatio(): number {
    return Phaser.Math.Clamp((this.now - this.sides.player.maglevAt) / MAGLEV_COOLDOWN_MS, 0, 1);
  }

  /** Which slot the bot gave up for Mag-Lev, so its rotation leaves that key alone. */
  npcMagLevSlot(): 'r' | 'f' | 'q' | undefined {
    return this.magLevSlot('npc') ?? undefined;
  }

  // ── Painting ───────────────────────────────────────────────────────────

  private paint(): void {
    const now0 = this.now;
    const idle = this.coins.length === 0 && this.coinShots.length === 0 && this.nails.length === 0
      && this.spikes.length === 0 && this.scraps.length === 0 && this.bits.length === 0
      && this.fragments.length === 0 && this.magnetized.size === 0
      && this.sides.player.chargedUntil <= now0 && this.sides.npc.chargedUntil <= now0
      && this.sides.player.gatherUntil <= 0 && this.sides.npc.gatherUntil <= 0
      && !this.sides.player.pod && !this.sides.npc.pod
      && this.tracks.length === 0 && this.flicks.length === 0 && !this.masteryOn('player') && !this.masteryOn('npc')
      && this.crates.idle && !this.sides.player.piloting && !this.sides.npc.piloting;
    if (idle && !this.groundGfx && !this.airGfx) return;
    const t = this.vizT;
    const now = this.now;
    const g = this.ground();
    g.clear();
    // Mastery — Mag-Lev tracks, under everything else on the floor.
    for (const tr of this.tracks) {
      const pts = tr.patches.map((p) => ({ x: p.x, y: p.y, seed: p.seed, life: 1 - (now - p.bornAt) / MAGLEV_LIFE_MS }));
      drawMagTrack(g, this.col(tr.owner), pts, MAGLEV_PATCH_R, t);
    }
    // Mastery — the Magnetic Field, and a shadow under a body floating on its track.
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.alive(f) || f.forceInvisible || this.sides[owner].piloting) continue;
      if (this.masteryOn(owner)) drawMagneticField(g, this.col(owner), f.x, f.y, FIELD_R, t);
      if (this.sides[owner].floating) {
        g.fillStyle(this.col(owner)(MAGNET.shadow), 0.35);
        g.fillEllipse(f.x, f.y + 20, 30, 9);
      }
    }
    for (const sp of this.spikes) {
      if (sp.state !== 'planted') continue;
      drawSpikePlanted(g, this.col(sp.owner), sp.x, sp.y, t, !sp.zipped, (sp.until - now) / SPIKE_LIFE_MS);
    }
    for (const s of this.scraps) {
      if (s.state === 'ground') drawScrap(g, this.col(s.owner), s.x, s.y, s.angle, s.size, s.seed, 'ground', t);
    }
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.gatherUntil > 0 && this.alive(f)) {
        // Q+ Salvage Salvo, Furnace head: the pile is already red.
        const tint = this.up(owner, 'q') && s.build.head === 'furnace' ? megaMechTint(this.col(owner)) : this.col(owner);
        drawGatherPile(g, tint, f.x, f.y, 1 - (s.gatherUntil - now) / GATHER_MS, t);
      }
      // The mech's core, sitting where its pilot gathered it.
      if (s.piloting && s.mech?.active && !s.pod && f?.active) {
        drawMechCore(g, this.col(owner), f.x, f.y, s.mech.build?.core ?? null, s.mech.coreHurtable, now < s.coreFlashUntil, t);
      }
      // F+ Electromagnet: the charge from a live spike.
      if (now < s.chargedUntil && this.alive(f) && !s.piloting && !f.forceInvisible) {
        drawChargedAura(g, this.col(owner), f.x, f.y, CHARGE_AURA_R, t, (s.chargedUntil - now) / CHARGE_MS);
      }
    }

    const a = this.air();
    a.clear();
    this.crates.paint(g, a, t);
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (this.orbitOf(owner).length > 0 && this.alive(f)) drawOrbitRing(a, this.col(owner), f.x, f.y, ORBIT_R, t);
    }
    // E+ Magnetize, on a body.
    for (const [f, m] of this.magnetized) {
      if (!f.active || f.forceInvisible || now >= m.until) continue;
      drawMagnetized(a, this.col(m.by), f.x, f.y, this.bodyR(f), t, (m.until - now) / MAGNETIZE_MS);
    }
    for (const s of this.scraps) {
      if (s.state !== 'ground') drawScrap(a, this.col(s.owner), s.x, s.y, s.angle, s.size, s.seed, s.state, t);
      if (s.live) drawCrackle(a, this.col(s.owner), s.x, s.y, s.size * 1.1, t, s.state === 'ground' ? 0.5 : 0.9, 2);
    }
    for (const sp of this.spikes) {
      if (sp.state === 'hover') {
        drawSpikeHover(a, this.col(sp.owner), sp.x, sp.y, 1 - (sp.slamAt - now) / SPIKE_HOVER_MS, SPIKE_RADIUS, t);
      } else if (sp.state === 'flying') {
        if (sp.lock) drawLockLine(a, this.col(sp.owner), sp.x, sp.y, sp.lock.x, sp.lock.y, t);
        drawSpikeFlying(a, this.col(sp.owner), sp.x, sp.y, Math.atan2(sp.vy, sp.vx));
        if (sp.live) drawCrackle(a, this.col(sp.owner), sp.x, sp.y, 20, t);
      }
    }
    // A live planted spike's current plays round its head (painted in the air so it reads over bodies).
    for (const sp of this.spikes) {
      if (sp.state === 'planted' && sp.live) drawCrackle(a, this.col(sp.owner), sp.x, sp.y - 44, 16, t, 0.85);
    }
    for (const c of this.coins) {
      // Held by the track: a slow bob in the field instead of a dead stop.
      const z = c.magHeld ? c.z + 4 + Math.sin(t * 3 + c.spinRate) * 3 : c.z;
      drawCoin(a, this.col(c.owner), c.x, c.y, z, c.spin, this.sides[c.owner].hover || c.magHeld, t);
    }
    for (const k of this.flicks) {
      drawFieldFlick(a, this.col(k.owner), k.x, k.y, k.angle, (now - k.at) / FLICK_MS);
    }
    for (const s of this.coinShots) {
      if (s.lock) drawLockLine(a, this.col(s.owner), s.x, s.y, s.lock.x, s.lock.y, t);
      if (s.mag) drawMagnetHalo(a, this.col(s.owner), s.x, s.y, 9, t);
      drawCoinShot(a, this.col(s.owner), s.x, s.y, Math.atan2(s.vy, s.vx), t);
    }
    for (const fr of this.fragments) {
      if (fr.lock) drawLockLine(a, this.col(fr.owner), fr.x, fr.y, fr.lock.x, fr.lock.y, t, 0.6);
      drawCoinFragment(a, this.col(fr.owner), fr.x, fr.y, Math.atan2(fr.vy, fr.vx), fr.seed);
    }
    for (const n of this.nails) {
      const o = this.fighter(n.owner);
      if (n.lock) drawLockLine(a, this.col(n.owner), n.x, n.y, n.lock.x, n.lock.y, t);
      if (n.mag && n.state === 'fly') drawMagnetHalo(a, this.col(n.owner), n.x, n.y, 11, t);
      drawNail(a, this.col(n.owner), n.x, n.y, n.angle, n.state, o?.x ?? n.x, o?.y ?? n.y, t, 1, n.golden);
    }
    for (const b of this.bits) {
      const f = this.fighter(b.owner);
      if (!f) continue;
      const k = Phaser.Math.Clamp((now - b.startAt) / (b.landAt - b.startAt), 0, 1);
      const e = k * k;
      drawScrap(a, this.col(b.owner), Phaser.Math.Linear(b.sx, f.x, e), Phaser.Math.Linear(b.sy, f.y, e), k * 9, b.size, b.seed, 'fly', t);
    }
    for (const owner of BOTH) {
      const pod = this.sides[owner].pod;
      if (!pod) continue;
      const k = Phaser.Math.Clamp((now - pod.startAt) / (pod.landAt - pod.startAt), 0, 1);
      const x = Phaser.Math.Linear(pod.sx, pod.lx, k);
      const y = Phaser.Math.Linear(pod.sy, pod.ly, k) - Math.sin(k * Math.PI) * 160;
      a.fillStyle(this.col(owner)(MAGNET.shadow), 0.2 + 0.4 * k);
      a.fillEllipse(pod.lx, pod.ly, 20 + 20 * k, 8 + 8 * k);
      drawScrap(a, this.col(owner), x, y, k * 12, 16, 7, 'orbit', t);
    }
  }

  private updateAvatars(delta: number, isPlayerMagnet: boolean, isNpcMagnet: boolean): void {
    const { scene } = this.arena;
    for (const owner of BOTH) {
      const on = owner === 'player' ? isPlayerMagnet : isNpcMagnet;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!on || !f?.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new MagnetAvatar(scene, this.col(owner), owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setIntensity(s.gatherUntil > 0 ? 1.3 : this.orbitOf(owner).length > 0 ? 1.12 : 1);
      av.setMastered(this.masteryOn(owner));
      // Single owner of setHold: a held toss braces both hands on the field; a zip or a dash
      // throws the arms out; the gather reaches up for the scrap.
      av.setHold(s.gatherUntil > 0 ? 'charge' : s.motion ? 'ride' : s.hover ? 'brace' : null);
      const hidden = f.forceInvisible || s.piloting;
      // Floating on a maglev track: the rig rides a little off the floor, bobbing.
      const lift = s.floating ? 6 + Math.sin(this.vizT * 4) * 2 : 0;
      av.update(delta, f.x, f.y - lift, hidden ? 0 : f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const coins = playerIs ? this.coins.filter((c) => c.owner === 'player').length : 0;
    const scrap = playerIs ? this.orbitOf('player').length : 0;
    this.arena.setStatusIndicator('magnet-coins', coins > 0 ? {
      name: 'Coins in the Air', emoji: '🪙', color: MAGNET.gold, priority: 150, count: coins,
      description: `Coins you have flipped. Each lands ${COIN_AIR_MS / 1000}s after it is tossed. Hold Click to freeze them; Repulse (E) fires every coin in its cone for ${COIN_SHOT_DAMAGE} each.`,
    } : null);
    this.arena.setStatusIndicator('magnet-scrap', scrap > 0 ? {
      name: 'Orbiting Scrap', emoji: '🔩', color: MAGNET.sky, priority: 151, count: scrap,
      description: `Each shard blocks one enemy shot, or hits an enemy that comes close for ${ORBIT_HIT_DAMAGE}. Repulse (E) a shard in front of you to dash that way.`,
    } : null);
    const p = this.arena.player;
    const nailed = this.nails.filter((n) => n.owner === 'npc' && n.state === 'stuck' && n.victim === p).length;
    this.arena.setStatusIndicator('magnet-nailed', nailed > 0 ? {
      name: 'Nailed', emoji: '📌', color: MAGNET.rose, priority: 60, count: nailed,
      description: `A magnet nail is in you. Their Repulse can shove you from ${REPULSE_PUSH_RANGE}px, and ripping it out deals ${NAIL_RIP_DAMAGE}. Falls out on its own after ${NAIL_STUCK_MS / 1000}s.`,
    } : null);
    const mech = this.sides.player.mech;
    const core = mech?.coreHurtable
      ? `Your body is the mech's core: every hit on it costs the mech ${CORE_MS_PER_DAMAGE / 1000}s per point of damage.`
      : 'Its Base core cannot be hurt.';
    this.arena.setStatusIndicator('magnet-mech', playerIs && this.sides.player.piloting && mech?.active ? {
      name: mech.build ? 'Salvage Salvo' : 'Mecha Massacre', emoji: '🤖', color: mech.furnace ? 0xff4f5e : MAGNET.neon,
      priority: 149, until: mech.until,
      description: mech.build
        ? `You are the mech you built (${mech.build.head ?? 'plain'} head, ${mech.build.core} core, ${mech.build.left} left arm, ${mech.build.right} right arm). Rooted. Click alternates arms, E rail, R avalanche, F cannon, Q self-destruct. ${core}`
        : `You are the mech: rooted. Click smash, E rail, R avalanche, F cannon, Q self-destruct. ${core}`,
    } : null);
    const mag = this.magnetized.get(p);
    this.arena.setStatusIndicator('magnet-magnetized', mag && mag.by === 'npc' && this.now < mag.until ? {
      name: 'Magnetized', emoji: '🧲', color: MAGNET.rose, priority: 61, until: mag.until,
      description: 'Their Repulse left a charge in you. Their coins, nails and spikes lock straight onto you, any of their shots passing close bends into you, and their coin fragments all fly at you.',
    } : null);
    const riding = playerIs && this.sides.player.floating;
    this.arena.setStatusIndicator('magnet-maglev', riding ? {
      name: 'Mag-Lev', emoji: '🚄', color: MAGNET.rose, priority: 153,
      description: `Magnet Mastery: you are floating on your own maglev ground — ${Math.round((MAGLEV_SPEED_MULT - 1) * 100)}% faster, and the floor's own hazards cannot touch you. Repulse (E) the track to fly backward.`,
    } : null);
    this.arena.setStatusIndicator('magnet-maglev-slow', p && this.maglevSlowed.has(p) ? {
      name: 'Held on the Track', emoji: '🧲', color: MAGNET.red, priority: 62,
      description: `You are magnetised and standing on their maglev ground: ${Math.round((1 - MAGLEV_SLOW_MULT) * 100)}% slower until you step off it.`,
    } : null);
    const ch = this.sides.player.chargedUntil;
    this.arena.setStatusIndicator('magnet-charged', playerIs && this.now < ch ? {
      name: 'Charged', emoji: '⚡', color: MAGNET.live, priority: 152, until: ch,
      description: `You rode a live spike: ${Math.round((CHARGE_SPEED_MULT - 1) * 100)}% faster, and your aura zaps everyone within ${CHARGE_AURA_R}px for ${CHARGE_AURA_DAMAGE} every ${CHARGE_AURA_GAP_MS / 1000}s.`,
    } : null);
  }

  // ── Read by ArenaScene ─────────────────────────────────────────────────

  private speedFor(owner: Owner): number {
    const s = this.sides[owner];
    if (s.gatherUntil > 0 || s.piloting) return 0;
    return (this.now < s.chargedUntil ? CHARGE_SPEED_MULT : 1) * (s.floating ? MAGLEV_SPEED_MULT : 1);
  }

  /**
   * Rooted while gathering or piloting; stopped while stunned; held back on the other side's
   * maglev ground. Pulled by ArenaScene. Online the slow is worked out here, on the victim's sim.
   */
  getPlayerSpeedMult(): number {
    const p = this.arena.player;
    if (p && this.stunned(p)) return 0;
    const slow = p && this.maglevSlowed.has(p) ? MAGLEV_SLOW_MULT : 1;
    return slow * (this.isMagnet('player') ? this.speedFor('player') : 1);
  }

  getNpcSpeedMult(): number {
    const n = this.arena.npc;
    if (n && this.stunned(n)) return 0;
    // An online replica's motion is streamed; rooting it here would freeze the picture.
    if (this.arena.isOnline) return 1;
    const slow = n && this.maglevSlowed.has(n) ? MAGLEV_SLOW_MULT : 1;
    return slow * (this.isMagnet('npc') ? this.speedFor('npc') : 1);
  }

  /** Ability tray fill. In the mech the cards are the mech's keys; out of it, a free second job reads as ready. */
  getBarRatio(abilityId: string): number {
    const p = this.arena.player;
    const s = this.sides.player;
    if (s.piloting && s.mech?.active) {
      const k = MECH_KEYS[abilityId];
      if (!k) return 1;
      if (k === 'destruct') return Phaser.Math.Clamp((s.mech.until - this.now) / s.mech.duration, 0, 1);
      return s.mech.readyRatio(k, this.now);
    }
    if (abilityId === 'magnet-nail' && this.nails.some((n) => n.owner === 'player' && n.state === 'stuck')) return 1;
    if (abilityId === 'magnet-spike' && this.spikes.some((sp) => sp.owner === 'player' && sp.state === 'planted' && !sp.zipped)) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Bot opportunities (side-effect-free) ───────────────────────────────

  /** The bot is gathering or piloting and should leave its hands alone. */
  npcBusy(): boolean {
    const s = this.sides.npc;
    return s.gatherUntil > 0 || s.piloting;
  }

  /**
   * A Repulse at the player is worth casting now: coins hanging in front of the bot, a planted
   * spike to launch, a nail flying home to re-fire, a shard to dash on, or a nailed target close
   * enough to throw.
   */
  npcRepulseAt(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const ang = Math.atan2(p.y - n.y, p.x - n.x);
    const dist = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    let worth = 0;
    for (const c of this.coins) {
      if (c.owner === 'npc' && (this.inCone(n, ang, c.x, c.y - c.z, 12) || this.inCone(n, ang, c.x, c.y, 12))) worth += 1;
    }
    // Q+ Salvage Salvo: Junkyard TNT in front of the bot is the best thing to throw.
    worth += 3 * this.crates.countIn('npc', (x, y) => this.inCone(n, ang, x, y, 18));
    for (const sp of this.spikes) {
      if (sp.owner === 'npc' && sp.state === 'planted' && this.inCone(n, ang, sp.x, sp.y, 20)) worth += 3;
    }
    for (const nl of this.nails) {
      if (nl.owner === 'npc' && nl.state === 'return' && Phaser.Math.Distance.Between(n.x, n.y, nl.x, nl.y) <= NAIL_REFIRE_R) worth += 3;
    }
    if (dist > 280 && this.orbitOf('npc').some((sc) => this.inCone(n, ang, sc.x, sc.y, 16))) worth += 2;
    if (dist < 200 && this.nails.some((nl) => nl.owner === 'npc' && nl.state === 'stuck' && nl.victim === p)) worth += 2;
    // E+ Magnetize: catching the target in the wave is half the cast — everything it fires, and
    // everything already in the air, then locks onto them.
    if (this.up('npc', 'e') && !this.isMagnetized('npc', p) && this.inCone(n, ang, p.x, p.y, this.bodyR(p))) {
      worth += 1;
      if (this.coinShots.some((c) => c.owner === 'npc') || this.nails.some((nl) => nl.owner === 'npc' && nl.state === 'fly')
        || this.spikes.some((sp) => sp.owner === 'npc' && sp.state === 'flying')) worth += 1;
    }
    // R+ Nailstorm: every nail in them is another handle — and 4 more damage on the shove.
    if (this.up('npc', 'r') && dist < REPULSE_PUSH_RANGE && this.nailsIn('npc', p) >= 2) worth += 2;
    // Mastery — Mag-Lev: hurt and close, a Repulse into its own maglev ground throws the bot
    // backward, away from the target it is aiming at.
    if (n.hp / Math.max(1, n.maxHp) < NPC_MAGLEV_KICK_HP && dist < NPC_MAGLEV_KICK_RANGE && this.trackInCone('npc', n, ang)) worth += 3;
    return worth >= 2 ? { x: p.x, y: p.y } : undefined;
  }

  /** A nail has sat in the player for a beat — rip it out (and meet it with a Repulse). */
  npcRecallNow(): boolean {
    const p = this.arena.player;
    // R+ Nailstorm: a full set of three tears hardest — rip the moment they are all in.
    if (this.up('npc', 'r') && this.nailsIn('npc', p) >= NAILSTORM_COUNT) return true;
    return this.nails.some((nl) => nl.owner === 'npc' && nl.state === 'stuck' && nl.victim === p
      && nl.stuckUntil - this.now < NAIL_STUCK_MS - 1200);
  }

  /** A planted spike that closes the gap to the player (or, hurt, opens it). */
  npcZipTo(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const dNow = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const hurt = n.hp / n.maxHp < 0.3;
    for (const sp of this.spikes) {
      if (sp.owner !== 'npc' || sp.state !== 'planted' || sp.zipped) continue;
      const dSpike = Phaser.Math.Distance.Between(sp.x, sp.y, p.x, p.y);
      // F+ Electromagnet: riding a live spike planted next to them lands the charged aura on them.
      if (sp.live && !hurt && dSpike < CHARGE_AURA_R + 40 && dNow > 160) return { x: sp.x, y: sp.y };
      if (!hurt && dNow > 340 && dSpike < dNow - 150) return { x: sp.x, y: sp.y };
      if (hurt && dNow < 200 && dSpike > dNow + 200) return { x: sp.x, y: sp.y };
    }
    return undefined;
  }

  /** Where to hang a spike: where the player will be when it drops, roughly. */
  npcSpikeAt(): { x: number; y: number } | undefined {
    const p = this.arena.player;
    if (!this.alive(p)) return undefined;
    const v = (p.body as Phaser.Physics.Arcade.Body | null)?.velocity;
    return {
      x: Phaser.Math.Clamp(p.x + (v?.x ?? 0) * 0.8, this.left + 20, this.right - 20),
      y: Phaser.Math.Clamp(p.y + (v?.y ?? 0) * 0.8, this.top + 20, this.bottom - 20),
    };
  }

  /** Coins go straight up where the bot stands, so this is only its facing for the toss. */
  npcCoinAim(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const a = Math.atan2(p.y - n.y, p.x - n.x);
    return { x: n.x + Math.cos(a) * 110, y: n.y + Math.sin(a) * 110 };
  }

  /** Hold the coins while a Repulse is nearly back and there are coins worth keeping up. */
  npcWantsHover(): boolean {
    const n = this.arena.npc;
    if (!this.alive(n)) return false;
    const up = this.coins.filter((c) => c.owner === 'npc' && c.air > 1200).length;
    return up >= 2 && n.getCooldownRatio('magnet-repulse') > 0.7;
  }

  /** The bot's own hover switch (CastContext `magnetHover`). */
  doHover(owner: Owner, on: boolean): void {
    if (owner === 'npc' && this.isReplica('npc')) return;
    this.setHover(owner, on);
  }
}
