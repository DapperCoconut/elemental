import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  BND, BindAvatar, BindColorFn, BindFx, chainLink, cosmicVeil, darkMark, faithRing,
  godBeam, hexWard, idolStatue, oblivionShard, patronEye,
} from './BindVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── The patron (passive) ─────────────────────────────────────────────────────
const ANGER_MAX = 100;
/** Per second. The only thing that ever lowers the bar. */
const ANGER_DECAY = 2;
const WRATH_MS = 5000;
/** Where the eye hangs. Near enough the top edge that its beams always come *down*. */
const EYE_Y = 54;

// ── Summon (Click) ───────────────────────────────────────────────────────────
/** Seconds of continuous fire to reach maximum heat, and to bleed it all off again. */
const HEAT_RISE_S = 3.2;
const HEAT_FALL_S = 4.5;
const BEAM_TICK_COLD_MS = 460;
const BEAM_TICK_HOT_MS = 120;
const BEAM_DAMAGE = 7;
const BEAM_HIT_R = 26;
const OVERHEAT_ANGER = 20;
/** How long one cast keeps the beam alive — long enough to bridge the click's own cooldown. */
const BEAM_HOLD_MS = 420;

// ── Shards of Oblivion (E) ───────────────────────────────────────────────────
const SHARD_COUNT = 25;
const SHARD_DAMAGE = 10;
const SHARD_SPEED = 720;
const SHARD_BLAST_R = 34;
/**
 * How far around the cursor the barrage lands. Twenty-five shards landing on one pixel would be
 * a 250-damage point blank rather than a barrage, so they are scattered across a footprint and a
 * body standing in the middle of it realistically eats five or six.
 */
const SHARD_SPREAD = 96;
const SHARD_STAGGER_MS = 26;
/** Each cast costs one of these, permanently, and the god picks. */
const TAX_STEP = 0.9;
const TAX_VULN_STEP = 1.1;

// ── Summon Idol (R) ──────────────────────────────────────────────────────────
const IDOL_R = 118;
const IDOL_FAITH_MAX = 10;
const IDOL_TICK_MS = 1000;
const IDOL_VOLLEY = 5;
const IDOL_SHARD_DAMAGE = 6;
const IDOL_STARVE_ANGER = 5;
/** How long an idol is allowed to sit empty before the patron takes it back. */
const IDOL_CRUMBLE_MS = 6000;

// ── Prophet's Protection (F) ─────────────────────────────────────────────────
const WARD_CHARGES = 3;
const WARD_ANGER_SHARE = 0.5;

// ── God of Treachery (Q) ─────────────────────────────────────────────────────
const AWAKE_MS = 15_000;
const AWAKE_VOLLEY_MS = 1200;
const AWAKE_VOLLEY_SHARDS = 7;
const AWAKE_SWIPE_MS = 2100;
const AWAKE_SWIPE_DAMAGE = 24;
const AWAKE_SWIPE_R = 96;
const AWAKE_LASER_MS = 620;
const AWAKE_LASER_DAMAGE = 8;
const AWAKE_LASER_HIT_R = 20;
const AWAKE_BLAST_MS = 3000;
const AWAKE_BLAST_TELL_MS = 900;
const AWAKE_BLAST_R = 122;
const AWAKE_BLAST_DAMAGE = 38;
/** A slot given up is gone for the match; this is simply longer than any match can be. */
const SACRIFICE_MS = 900_000;

const SACRIFICE_SLOTS: { id: string; key: string }[] = [
  { id: 'bind-summon', key: 'Click' },
  { id: 'bind-shards', key: 'E' },
  { id: 'bind-idol', key: 'R' },
  { id: 'bind-protection', key: 'F' },
];

// ── World objects ────────────────────────────────────────────────────────────

/** One shard in the air, on its way to the point it will burst at. */
interface Shard {
  owner: Owner;
  x: number;
  y: number;
  tx: number;
  ty: number;
  ang: number;
  damage: number;
  /** Game-clock time it is allowed to start moving — staggers a volley into a barrage. */
  liveAt: number;
  /** Wall on the flight, so a shard aimed at a corpse still burst somewhere. */
  diesAt: number;
  /** True while the patron is aiming this at the person who summoned it. */
  turned: boolean;
  seed: number;
}

interface Idol {
  owner: Owner;
  x: number;
  y: number;
  faith: number;
  nextTickAt: number;
  /** Game-clock time it first ran dry, or 0. Six seconds of this and it crumbles. */
  emptySince: number;
}

/** A patch of arena a dark-light beam is about to fall on. */
interface Mark {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
  turned: boolean;
}

/** One of the awakened god's spray lasers, alive for a couple of frames. */
interface Spray {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  until: number;
  turned: boolean;
}

interface Ward {
  charges: number;
  /** Whatever absorber the fighter was already wearing, handed back when the ward is spent. */
  prev: ((amount: number) => boolean) | null;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** 0–100. The whole element. */
  anger: number;
  /** Game-clock expiry of the five seconds in which the god is pointing the other way. */
  wrathUntil: number;

  heat: number;
  overheated: boolean;
  /** Game-clock time the beam stops, refreshed by every cast while the button is held. */
  firingUntil: number;
  nextBeamTickAt: number;
  /** Rate-limits the "it is not listening" refusal so a held button doesn't spam it. */
  lastRefusalAt: number;

  taxSpeed: number;
  taxVuln: number;
  taxWeak: number;

  ward: Ward | null;

  awakeUntil: number;
  nextVolleyAt: number;
  nextSwipeAt: number;
  nextLaserAt: number;
  nextBlastAt: number;

  /** Q has been paid for but not yet priced — the next slot pressed is the one that dies. */
  pendingSacrifice: boolean;
  /** Which slot was given up, for the HUD. */
  sacrificed: string | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, anger: 0, wrathUntil: 0,
    heat: 0, overheated: false, firingUntil: 0, nextBeamTickAt: 0, lastRefusalAt: 0,
    taxSpeed: 0, taxVuln: 0, taxWeak: 0, ward: null,
    awakeUntil: 0, nextVolleyAt: 0, nextSwipeAt: 0, nextLaserAt: 0, nextBlastAt: 0,
    pendingSacrifice: false, sacrificed: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface BindArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Bind visual colour through that side's equipped skin. */
  bindColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── BindKit ──────────────────────────────────────────────────────────────────

/**
 * Bind.
 *
 * There is only one system here and it is the **anger bar**. Every ability in the kit is a way of
 * asking the patron for something, and three of the five have a price that is paid in anger
 * rather than in cooldown: overheating the beam costs 20, an idol left to starve costs 5 a
 * second, and every hit the ward eats hands half of itself over. Anger falls at 2 a second and
 * nothing in the element lowers it faster, so the bar is a straight readout of how much of the
 * god's patience the player has spent — and at 100 the god spends five seconds using this exact
 * same kit, pointed the other way. The whole element is therefore a resource game in which the
 * resource is somebody else's mood.
 *
 * The second rule is that **nothing here is free and nothing here is refundable**. The barrage
 * charges a permanent debuff per cast and the god chooses which one. The idol is a gift that
 * starts billing the moment you walk away from it. The ultimate opens the sky for fifteen seconds
 * and takes one of the other four abilities away for the rest of the match. None of these can be
 * undone, which is what stops the element from being "press the good buttons" — every good button
 * makes the next minute worse, and the skill is in deciding how much worse you can afford.
 *
 * Mechanically the interesting piece is that the awakened god and the wrathful god are the *same
 * routine*: `runGod` fires volleys, swipes, laser sprays and dark-light beams, and a single
 * `turned` boolean decides whether it points at the enemy or at the person who summoned it.
 * That is not an economy — it is the reason the fantasy holds together at all.
 */
export class BindKit {
  private api: BindArenaApi;

  // ── Visuals ──
  private readonly pcol: BindColorFn;
  private readonly ncol: BindColorFn;
  private readonly pfx: BindFx;
  private readonly nfx: BindFx;
  private playerAvatar: BindAvatar | null = null;
  private npcAvatar: BindAvatar | null = null;
  /** Faith rings and the footprints of falling beams — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Idols, shards, wards and the heat bar — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The patron itself, its bar and every beam it fires — over everything. */
  private godGfx: Phaser.GameObjects.Graphics | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private idols: Record<Owner, Idol | null> = { player: null, npc: null };
  private shards: Shard[] = [];
  private marks: Mark[] = [];
  private sprays: Spray[] = [];
  /** Everything this kit has written an outgoing multiplier onto, and what it last wrote. */
  private appliedOut = new Map<Fighter, number>();
  /**
   * The mouse has been let go of at least once since the sacrifice prompt appeared. Without
   * this, casting Q while holding the beam down would give the Click slot away on the very next
   * frame, before the player had read a word of the prompt.
   */
  private sacrificeClickArmed = false;

  constructor(api: BindArenaApi) {
    this.api = api;
    this.pcol = (base) => api.bindColor('player', base);
    this.ncol = (base) => api.bindColor('npc', base);
    this.pfx = new BindFx(api.scene, this.pcol);
    this.nfx = new BindFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): BindFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): BindColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private get eyeX(): number { return this.api.width / 2; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isBind(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'bind' : this.api.npcElementId === 'bind';
  }

  private avatar(owner: Owner): BindAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** True during the five seconds the patron is pointed at the person who summoned it. */
  private turned(owner: Owner): boolean {
    return this.now < this.side(owner).wrathUntil;
  }

  /**
   * Who the god is actually hurting right now. Every attack it makes goes through this, which is
   * the entire implementation of "it uses all of its attacks against you instead".
   */
  private godVictims(owner: Owner, turned: boolean): Fighter[] {
    if (!turned) return this.targetsOf(owner);
    const f = this.fighter(owner);
    return this.alive(f) ? [f] : [];
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  /** Distance from a point to a segment — the beam and the spray lasers both need it. */
  private distToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return Phaser.Math.Distance.Between(px, py, x0, y0);
    const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x0 + dx * t, y0 + dy * t);
  }

  private addAnger(owner: Owner, amount: number, why?: string): void {
    const s = this.side(owner);
    if (this.turned(owner)) return;
    const before = s.anger;
    s.anger = Math.min(ANGER_MAX, s.anger + amount);
    if (why && amount >= 3 && s.anger > before) {
      const f = this.fighter(owner);
      if (this.alive(f)) {
        this.api.showFloatingText(f.x + (Math.random() - 0.5) * 20, f.y - 62,
          `+${Math.round(amount)} ANGER · ${why}`, this.hex(BND.wrath));
      }
    }
    if (s.anger >= ANGER_MAX) this.beginWrath(owner);
  }

  /**
   * Nudge a fighter's shared outgoing multiplier by dividing out whatever this kit last put
   * there — writing it straight in would delete anything else running on the same body.
   */
  private setOutgoing(f: Fighter, mult: number): void {
    const prev = this.appliedOut.get(f) ?? 1;
    if (Math.abs(prev - mult) < 0.0005) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / prev) * mult;
    if (Math.abs(mult - 1) < 0.0005) this.appliedOut.delete(f);
    else this.appliedOut.set(f, mult);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) this.dropWard(owner, false);
    for (const [f] of this.appliedOut) this.setOutgoing(f, 1);
    this.appliedOut.clear();
    for (const f of this.allFighters()) {
      if (f) f.bindIncomingMult = 1;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.idols = { player: null, npc: null };
    this.shards = [];
    this.marks = [];
    this.sprays = [];
    this.sacrificeClickArmed = false;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.godGfx?.destroy(); this.godGfx = null;
    this.prompt?.destroy(); this.prompt = null;

    this.api.setStatusIndicator('bind-anger', null);
    this.api.setStatusIndicator('bind-wrath', null);
    this.api.setStatusIndicator('bind-ward', null);
    this.api.setStatusIndicator('bind-awake', null);
    this.api.setStatusIndicator('bind-tithe', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. The ring goes under them, the relics just over, and the patron
    // above everything — it is standing outside the arena rather than in it.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
    if (!this.godGfx) this.godGfx = scene.add.graphics().setDepth(18);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isBind('player') && !this.playerAvatar) this.playerAvatar = new BindAvatar(scene, this.pcol);
    if (this.isBind('npc') && !this.npcAvatar) this.npcAvatar = new BindAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'bind') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;

    // The price of the ultimate is paid before anything else can happen: the next slot pressed
    // is the one that dies, and nothing casts until one of them has been.
    if (s.pendingSacrifice) {
      if (!pointer.isDown) this.sacrificeClickArmed = true;
      for (const slot of SACRIFICE_SLOTS) {
        const pressed = slot.key === 'Click'
          ? (pointer.isDown && this.sacrificeClickArmed)
          : Phaser.Input.Keyboard.JustDown(this.keyFor(slot.key));
        if (!pressed) continue;
        this.takeSacrifice('player', slot.id, slot.key);
        return;
      }
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility('bind-summon', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('bind-shards', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('bind-idol', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('bind-protection', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('bind-treachery', ctx);
  }

  private keyFor(displayKey: string): Phaser.Input.Keyboard.Key {
    switch (displayKey) {
      case 'E': return this.api.eKey;
      case 'R': return this.api.rKey;
      default: return this.api.fKey;
    }
  }

  /**
   * A cast the patron simply refuses. Used for the five seconds it is angry: the abilities are
   * all *its*, so while it is pointed at you none of them answers — and the cooldown is handed
   * back, because being ignored should not also cost you the button.
   */
  private refuse(owner: Owner, abilityId: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    const s = this.side(owner);
    if (this.now - s.lastRefusalAt < 900) return;
    s.lastRefusalAt = this.now;
    if (!this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 50, '⛓ IT IS NOT LISTENING', this.hex(BND.wrath));
    Sfx.playAt('ui-denied', f.x, { rate: 0.6, volume: 0.8 });
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — the beam.
   *
   * A cast only ever *renews* the beam; the damage is ticked by `updateBeam`, which is the only
   * place that knows about heat. Doing it this way means a held button and a bot spamming the
   * ability on its cooldown produce exactly the same beam, and neither of them can tick faster
   * than the heat says they may.
   */
  doSummon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-summon'); return; }
    if (this.turned(owner)) { this.refuse(owner, 'bind-summon'); return; }
    const s = this.side(owner);
    if (s.overheated) {
      // Refused, loudly and only once a second — the bar over the head is the real explanation.
      this.refund(f, 'bind-summon');
      if (this.now - s.lastRefusalAt >= 900) {
        s.lastRefusalAt = this.now;
        this.api.showFloatingText(f.x, f.y - 50, '🔥 OVERHEATED', this.hex(BND.heat));
        Sfx.playAt('ui-denied', f.x, { rate: 1.3, volume: 0.6 });
      }
      return;
    }
    this.ensureLayers();
    this.ensureAvatars();
    s.aimX = tx;
    s.aimY = ty;
    const opening = this.now >= s.firingUntil;
    s.firingUntil = this.now + BEAM_HOLD_MS;
    if (opening) {
      s.nextBeamTickAt = this.now;
      this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
      Sfx.playAt('beam-charge', f.x, { rate: 0.8, volume: 0.55 });
    }
  }

  /**
   * E — the barrage, and the tithe.
   *
   * The shards are staggered so twenty-five of them read as a downpour rather than a wall, and
   * the cost is rolled *here* rather than on impact: the god is charging for the favour, not for
   * the result, so a barrage that hits nothing costs exactly as much as one that kills.
   */
  doShards(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-shards'); return; }
    if (this.turned(owner)) { this.refuse(owner, 'bind-shards'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    this.throwVolley(owner, tx, ty, SHARD_COUNT, SHARD_DAMAGE, SHARD_SPREAD, false);
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('crystal-shatter', f.x, { rate: 0.85, volume: 0.9 });

    // The tithe. Three prices, chosen by the god, and none of them ever comes off again.
    const roll = Math.floor(Math.random() * 3);
    if (roll === 0) {
      s.taxSpeed++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: −10% SPEED', this.hex(BND.wrath));
    } else if (roll === 1) {
      s.taxVuln++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: +10% DAMAGE TAKEN', this.hex(BND.wrath));
    } else {
      s.taxWeak++;
      this.api.showFloatingText(f.x, f.y - 66, '⛓ TITHE: −10% DAMAGE DEALT', this.hex(BND.wrath));
    }
    Sfx.playAt('curse-cast', f.x, { rate: 0.75, volume: 0.7 });
  }

  /**
   * R — the idol.
   *
   * Deliberately not a turret. It is a contract: it pays out in shard volleys for exactly as long
   * as somebody keeps standing next to it, and the moment nobody does it starts charging 5 anger
   * a second until either they come back or it gives up. Re-casting moves it, which is the only
   * way to walk away from one without paying.
   */
  doIdol(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-idol'); return; }
    if (this.turned(owner)) { this.refuse(owner, 'bind-idol'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    this.idols[owner] = {
      owner,
      x: Phaser.Math.Clamp(tx, this.left + 40, this.right - 40),
      y: Phaser.Math.Clamp(ty, this.top + 40, this.bottom - 40),
      faith: 0,
      nextTickAt: this.now + IDOL_TICK_MS,
      emptySince: this.now,
    };
    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(tx, ty - 40, '⛓ IDOL RAISED · FEED IT', this.hex(BND.gold));
    Sfx.playAt('holy-chord', tx, { rate: 0.7, volume: 0.9 });
  }

  /**
   * F — the ward.
   *
   * Installed as a `damageAbsorber`, which is the one hook that sees a hit *before* any shield
   * layer decides what to do with it — so the ward really does eat the whole instance however
   * large it was, and the half it hands to the patron is measured off the same number.
   */
  doProtection(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-protection'); return; }
    if (this.turned(owner)) { this.refuse(owner, 'bind-protection'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    // A second cast replaces the first rather than stacking — three charges is the ability.
    this.dropWard(owner, false);
    const ward: Ward = { charges: WARD_CHARGES, prev: f.damageAbsorber };
    this.sides[owner].ward = ward;
    f.damageAbsorber = (amount: number) => {
      if (ward.charges <= 0) return false;
      ward.charges--;
      this.fx(owner).wardBlock(f.x, f.y);
      this.api.showFloatingText(f.x, f.y - 44, `✦ WARDED (${ward.charges})`, this.hex(BND.goldLit));
      Sfx.playAt('shield-block', f.x, { rate: 0.75, volume: 0.9 });
      this.addAnger(owner, amount * WARD_ANGER_SHARE, 'WARD');
      if (ward.charges <= 0) this.dropWard(owner, true);
      return true;
    };

    this.avatar(owner)?.play('flex');
    this.api.showFloatingText(f.x, f.y - 52, '✦ PROPHET\'S PROTECTION', this.hex(BND.gold));
    Sfx.playAt('incantation', f.x, { rate: 0.7, volume: 0.95 });
  }

  private dropWard(owner: Owner, announce: boolean): void {
    const s = this.sides[owner];
    const ward = s.ward;
    if (!ward) return;
    s.ward = null;
    const f = this.fighter(owner);
    if (f) f.damageAbsorber = ward.prev;
    if (!announce || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 44, '✦ WARD SPENT', this.hex(BND.goldDeep));
    Sfx.playAt('shield-break', f.x, { rate: 0.8, volume: 0.8 });
  }

  /**
   * Q — fifteen seconds of the sky being open, bought with an ability.
   *
   * The sacrifice is armed rather than taken: the player picks which of the other four dies by
   * pressing it, which makes the price a decision rather than a dice roll. A bot has nobody to
   * ask, so it gives up whichever of the four it has used least — see `takeSacrifice`.
   */
  doTreachery(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'bind-treachery'); return; }
    if (this.turned(owner)) { this.refuse(owner, 'bind-treachery'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);

    s.awakeUntil = this.now + AWAKE_MS;
    s.nextVolleyAt = this.now + 300;
    s.nextSwipeAt = this.now + 700;
    s.nextLaserAt = this.now + 200;
    s.nextBlastAt = this.now + 1200;

    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.setChannelling(true);
    this.fx(owner).wrath(this.eyeX, EYE_Y);
    this.api.scene.cameras.main.shake(700, 0.008);
    this.api.showFloatingText(f.x, f.y - 70, '⛓ THE GOD IS AWAKE', this.hex(BND.goldLit));
    Sfx.playAt('ghost-wail', f.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('judgement', f.x, { rate: 0.7, volume: 0.85 });

    if (owner === 'player') {
      s.pendingSacrifice = true;
      this.sacrificeClickArmed = false;
      this.showPrompt();
    } else {
      // The bot pays immediately and at random, so the ability costs it the same thing it
      // costs a player: one of the four, gone.
      const slot = SACRIFICE_SLOTS[Math.floor(Math.random() * SACRIFICE_SLOTS.length)];
      this.takeSacrifice('npc', slot.id, slot.key);
    }
  }

  private takeSacrifice(owner: Owner, abilityId: string, key: string): void {
    const s = this.side(owner);
    s.pendingSacrifice = false;
    s.sacrificed = key;
    this.hidePrompt();
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    f.lockAbility(abilityId, SACRIFICE_MS);
    this.fx(owner).shardBurst(f.x, f.y, true);
    this.api.showFloatingText(f.x, f.y - 56, `⛓ ${key} TAKEN`, this.hex(BND.wrath));
    Sfx.playAt('chain', f.x, { rate: 0.6, volume: 1 });
  }

  private showPrompt(): void {
    if (this.prompt) { this.prompt.setVisible(true); return; }
    const { width, height } = this.api.scene.scale;
    this.prompt = this.api.scene.add.text(width / 2, height - 96,
      'THE GOD TAKES A LIMB — press Click / E / R / F to give one up', {
        fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold',
        color: this.hex(BND.goldLit), backgroundColor: '#160a26', padding: { x: 12, y: 7 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
  }

  private hidePrompt(): void {
    this.prompt?.destroy();
    this.prompt = null;
  }

  // ── The patron ─────────────────────────────────────────────────────────────

  private beginWrath(owner: Owner): void {
    const s = this.side(owner);
    if (this.turned(owner)) return;
    s.anger = 0;
    s.wrathUntil = this.now + WRATH_MS;
    // The god picks up exactly where the ultimate would have: same routine, pointed inward.
    s.nextVolleyAt = this.now + 150;
    s.nextSwipeAt = this.now + 500;
    s.nextLaserAt = this.now;
    s.nextBlastAt = this.now + 800;
    // Everything it was doing on your behalf stops immediately.
    s.firingUntil = 0;
    this.fx(owner).wrath(this.eyeX, EYE_Y);
    this.api.scene.cameras.main.shake(900, 0.014);
    this.api.scene.cameras.main.flash(220, 190, 40, 30);
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 74, '⛓⛓ THE PATRON HAS TURNED ⛓⛓', this.hex(BND.wrath));
    }
    Sfx.playAt('ghost-wail', this.eyeX, { rate: 0.45, volume: 1 });
    Sfx.playAt('nightmare', this.eyeX, { rate: 0.7, volume: 0.9 });
  }

  private updatePatron(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!this.isBind(owner) && !s.anger && !s.wrathUntil) continue;
      if (this.turned(owner)) continue;
      s.anger = Math.max(0, s.anger - ANGER_DECAY * dt);
    }
  }

  /**
   * The god acting. `turned` is the only difference between the ultimate and the punishment,
   * which is deliberate — the player has already seen exactly what is about to happen to them.
   */
  private runGod(owner: Owner, turned: boolean): void {
    const s = this.side(owner);
    const victims = this.godVictims(owner, turned);
    if (!victims.length) return;
    const pick = () => victims[Math.floor(Math.random() * victims.length)];

    if (this.now >= s.nextVolleyAt) {
      s.nextVolleyAt = this.now + AWAKE_VOLLEY_MS;
      const v = pick();
      this.throwVolley(owner, v.x, v.y, AWAKE_VOLLEY_SHARDS, SHARD_DAMAGE, SHARD_SPREAD * 0.7, turned);
    }

    if (this.now >= s.nextSwipeAt) {
      s.nextSwipeAt = this.now + AWAKE_SWIPE_MS;
      const v = pick();
      const ang = Math.random() * TAU;
      this.fx(owner).swipe(v.x, v.y, ang, AWAKE_SWIPE_R, turned);
      Sfx.playAt('space-slash', v.x, { rate: 0.7, volume: 0.9 });
      for (const t of victims) {
        if (Phaser.Math.Distance.Between(v.x, v.y, t.x, t.y) > AWAKE_SWIPE_R) continue;
        this.hurt(owner, t, AWAKE_SWIPE_DAMAGE, turned, BND.goldLit);
      }
    }

    if (this.now >= s.nextLaserAt) {
      s.nextLaserAt = this.now + AWAKE_LASER_MS;
      // Three eyes, three lines, each aimed a little off so they sweep across rather than stack.
      for (let i = 0; i < 3; i++) {
        const v = pick();
        const off = (i - 1) * 46 + (Math.random() - 0.5) * 40;
        const x1 = Phaser.Math.Clamp(v.x + off, this.left, this.right);
        const y1 = v.y + (Math.random() - 0.5) * 30;
        const x0 = this.eyeX + (i - 1) * 34;
        this.sprays.push({ owner, x0, y0: EYE_Y + 20, x1, y1, until: this.now + 180, turned });
        for (const t of victims) {
          if (this.distToSegment(t.x, t.y, x0, EYE_Y + 20, x1, y1) > AWAKE_LASER_HIT_R) continue;
          this.hurt(owner, t, AWAKE_LASER_DAMAGE, turned, BND.gold);
        }
      }
      Sfx.playAt('beam-fire', this.eyeX, { rate: 1.25, volume: 0.45 });
    }

    if (this.now >= s.nextBlastAt) {
      s.nextBlastAt = this.now + AWAKE_BLAST_MS;
      const v = pick();
      this.marks.push({
        owner,
        x: Phaser.Math.Clamp(v.x + (Math.random() - 0.5) * 90, this.left + 30, this.right - 30),
        y: Phaser.Math.Clamp(v.y + (Math.random() - 0.5) * 90, this.top + 30, this.bottom - 30),
        landsAt: this.now + AWAKE_BLAST_TELL_MS,
        turned,
      });
      Sfx.playAt('beam-charge', v.x, { rate: 0.5, volume: 0.7 });
    }
  }

  /** One hit from the patron. Routed through here so a turned god can never be self-inflicted. */
  private hurt(owner: Owner, victim: Fighter, amount: number, turned: boolean, flash: number): void {
    if (!this.alive(victim)) return;
    // A turned god is somebody else's weapon pointed at you, so it goes through the normal
    // damage path rather than `applySelfDamage` — shields and wards are allowed to answer it.
    Fighter.asNonAllyDamage(() => victim.takeDamage(amount));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(turned ? BND.wrath : flash));
  }

  // ── Shards ─────────────────────────────────────────────────────────────────

  private throwVolley(
    owner: Owner, tx: number, ty: number,
    count: number, damage: number, spread: number, turned: boolean,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const d = Math.sqrt(Math.random()) * spread;
      const px = Phaser.Math.Clamp(tx + Math.cos(a) * d, this.left, this.right);
      const py = Phaser.Math.Clamp(ty + Math.sin(a) * d, this.top, this.bottom);
      // They all leave the eye, fanned across its width, so a volley reads as coming *down*.
      const ox = this.eyeX + (Math.random() - 0.5) * 150;
      const oy = EYE_Y + 14 + Math.random() * 20;
      this.shards.push({
        owner, x: ox, y: oy, tx: px, ty: py,
        ang: Math.atan2(py - oy, px - ox),
        damage,
        liveAt: this.now + i * SHARD_STAGGER_MS,
        diesAt: this.now + i * SHARD_STAGGER_MS + 2600,
        turned,
        seed: Math.random() * 999,
      });
    }
  }

  private updateShards(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      if (this.now < sh.liveAt) continue;
      const d = Phaser.Math.Distance.Between(sh.x, sh.y, sh.tx, sh.ty);
      if (d <= SHARD_SPEED * dt + 4 || this.now >= sh.diesAt) {
        this.shards.splice(i, 1);
        this.burstShard(sh);
        continue;
      }
      sh.ang = Math.atan2(sh.ty - sh.y, sh.tx - sh.x);
      sh.x += Math.cos(sh.ang) * SHARD_SPEED * dt;
      sh.y += Math.sin(sh.ang) * SHARD_SPEED * dt;
    }
  }

  private burstShard(sh: Shard): void {
    this.fx(sh.owner).shardBurst(sh.tx, sh.ty, sh.turned);
    for (const t of this.godVictims(sh.owner, sh.turned)) {
      if (Phaser.Math.Distance.Between(sh.tx, sh.ty, t.x, t.y) > SHARD_BLAST_R) continue;
      this.hurt(sh.owner, t, sh.damage, sh.turned, BND.gold);
    }
  }

  // ── The beam ───────────────────────────────────────────────────────────────

  private updateBeam(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      const firing = this.now < s.firingUntil && this.alive(f) && !s.overheated && !this.turned(owner);

      if (firing) {
        s.heat = Math.min(1, s.heat + dt / HEAT_RISE_S);
        if (s.heat >= 1) {
          // Topped out. Twenty anger, and nothing until the last of it has bled off.
          s.overheated = true;
          s.firingUntil = 0;
          this.addAnger(owner, OVERHEAT_ANGER, 'OVERHEAT');
          this.api.showFloatingText(f.x, f.y - 58, '🔥 OVERHEATED', this.hex(BND.heat));
          Sfx.playAt('error-popup', f.x, { rate: 0.7, volume: 0.9 });
          continue;
        }
        if (this.now >= s.nextBeamTickAt) {
          const gap = Phaser.Math.Linear(BEAM_TICK_COLD_MS, BEAM_TICK_HOT_MS, s.heat);
          s.nextBeamTickAt = this.now + gap;
          this.beamTick(owner);
        }
        continue;
      }

      s.heat = Math.max(0, s.heat - dt / HEAT_FALL_S);
      if (s.overheated && s.heat <= 0) {
        s.overheated = false;
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 50, '✦ COOL', this.hex(BND.gold));
          Sfx.playAt('ability-ready', f.x, { rate: 0.9, volume: 0.6 });
        }
      }
    }
  }

  private beamTick(owner: Owner): void {
    const s = this.side(owner);
    const x1 = Phaser.Math.Clamp(s.aimX, this.left, this.right);
    const y1 = Phaser.Math.Clamp(s.aimY, this.top, this.bottom);
    for (const t of this.targetsOf(owner)) {
      if (this.distToSegment(t.x, t.y, this.eyeX, EYE_Y + 22, x1, y1) > BEAM_HIT_R) continue;
      this.hurt(owner, t, BEAM_DAMAGE, false, s.heat > 0.7 ? BND.heat : BND.gold);
      this.fx(owner).scald(t.x, t.y, s.heat);
    }
    Sfx.playAt('beam-fire', x1, { rate: 0.9 + s.heat * 0.7, volume: 0.28 });
  }

  // ── The idol ───────────────────────────────────────────────────────────────

  private updateIdols(): void {
    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      if (this.now < idol.nextTickAt) continue;
      idol.nextTickAt += IDOL_TICK_MS;

      // Faith in, faith out. Anyone from the summoning side standing in the ring feeds it.
      const f = this.fighter(owner);
      const fed = this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, idol.x, idol.y) <= IDOL_R;
      if (fed) {
        idol.faith = Math.min(IDOL_FAITH_MAX, idol.faith + 1);
        this.fx(owner).offering(f.x, f.y);
      }
      idol.faith = Math.max(0, idol.faith - 1);

      if (idol.faith > 0) {
        idol.emptySince = 0;
        const turned = this.turned(owner);
        const victims = this.godVictims(owner, turned);
        if (victims.length) {
          const v = victims[Math.floor(Math.random() * victims.length)];
          this.throwVolley(owner, v.x, v.y, IDOL_VOLLEY, IDOL_SHARD_DAMAGE, SHARD_SPREAD * 0.6, turned);
        }
        continue;
      }

      // Empty. It starts billing, and it does not stop until it is fed or it gives up.
      if (!idol.emptySince) idol.emptySince = this.now;
      this.addAnger(owner, IDOL_STARVE_ANGER, 'STARVED IDOL');
      if (this.now - idol.emptySince < IDOL_CRUMBLE_MS) continue;
      this.idols[owner] = null;
      this.fx(owner).shardBurst(idol.x, idol.y, true);
      this.api.showFloatingText(idol.x, idol.y - 40, '⛓ IDOL CRUMBLED', this.hex(BND.wrathDeep));
      Sfx.playAt('crystal-shatter', idol.x, { rate: 0.6, volume: 0.9 });
    }
  }

  // ── Dark light ─────────────────────────────────────────────────────────────

  private updateMarks(): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      if (this.now < m.landsAt) continue;
      this.marks.splice(i, 1);
      this.fx(m.owner).darkBlast(m.x, m.y, AWAKE_BLAST_R);
      this.api.scene.cameras.main.shake(260, 0.009);
      Sfx.playAt('black-hole', m.x, { rate: 0.85, volume: 0.9 });
      for (const t of this.godVictims(m.owner, m.turned)) {
        if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > AWAKE_BLAST_R) continue;
        this.hurt(m.owner, t, AWAKE_BLAST_DAMAGE, m.turned, BND.iris);
      }
    }
    for (let i = this.sprays.length - 1; i >= 0; i--) {
      if (this.now >= this.sprays[i].until) this.sprays.splice(i, 1);
    }
  }

  // ── Tithes ─────────────────────────────────────────────────────────────────

  /**
   * The permanent taxes, rewritten from scratch onto the body every frame — the Justice pattern
   * for the vulnerability, and the divide-out pattern for the outgoing multiplier, which half a
   * dozen other systems also write to.
   */
  private updateTithes(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      if (!this.isBind(owner)) { f.bindIncomingMult = 1; this.setOutgoing(f, 1); continue; }
      f.bindIncomingMult = TAX_VULN_STEP ** s.taxVuln;
      this.setOutgoing(f, TAX_STEP ** s.taxWeak);
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isBind('player');
    const npcIs = this.isBind('npc');
    const anyState = this.shards.length || this.marks.length || this.sprays.length
      || this.idols.player || this.idols.npc || this.appliedOut.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updatePatron(delta);
    this.updateBeam(delta);
    this.updateIdols();
    this.updateShards(delta);
    this.updateMarks();
    this.updateTithes();

    for (const owner of BOTH) {
      const s = this.side(owner);
      const turned = this.turned(owner);
      if (turned) {
        this.runGod(owner, true);
      } else if (this.now < s.awakeUntil) {
        this.runGod(owner, false);
      } else if (s.awakeUntil) {
        s.awakeUntil = 0;
        this.avatar(owner)?.setChannelling(false);
      }
      if (!turned && s.wrathUntil && this.now >= s.wrathUntil) {
        s.wrathUntil = 0;
        const f = this.fighter(owner);
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 60, '⛓ IT IS CALM', this.hex(BND.gold));
        }
      }
    }

    this.paintGround();
    this.paintAir();
    this.paintGod();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      const hunger = idol.faith <= 0 ? 1 : 1 - idol.faith / IDOL_FAITH_MAX;
      faithRing(g, this.col(owner), idol.x, idol.y + 18, IDOL_R, 0.9, hunger, this.vizT);
    }

    for (const m of this.marks) {
      const k = Phaser.Math.Clamp(1 - (m.landsAt - this.now) / AWAKE_BLAST_TELL_MS, 0, 1);
      darkMark(g, this.col(m.owner), m.x, m.y, AWAKE_BLAST_R, 0.95, k, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const idol = this.idols[owner];
      if (!idol) continue;
      idolStatue(g, this.col(owner), idol.x, idol.y, 1, idol.faith, IDOL_FAITH_MAX, this.vizT);
    }

    for (const sh of this.shards) {
      if (this.now < sh.liveAt) continue;
      oblivionShard(g, this.col(sh.owner), sh.x, sh.y, sh.ang, 1,
        { scale: 1, eye: 1, turned: sh.turned });
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;

      if (s.ward) hexWard(g, this.col(owner), f.x, f.y, 34, 0.9, s.ward.charges, this.vizT);

      // The heat bar, sitting above the health bar. Only ever shown when there is heat in it.
      if (s.heat > 0.01 || s.overheated) {
        const tint = this.col(owner);
        const w = 42;
        const by = f.y - 46;
        g.fillStyle(tint(BND.void), 0.8);
        g.fillRect(f.x - w / 2 - 1, by - 1, w + 2, 6);
        g.fillStyle(tint(BND.cosmicDeep), 0.9);
        g.fillRect(f.x - w / 2, by, w, 4);
        const hot = s.overheated || s.heat > 0.75;
        g.fillStyle(tint(s.overheated ? BND.wrath : hot ? BND.heat : BND.gold),
          s.overheated ? 0.6 + 0.4 * Math.sin(this.vizT * 14) : 0.95);
        g.fillRect(f.x - w / 2, by, w * s.heat, 4);
        // A tick at the top of the scale, so "how close am I" is a position rather than a guess.
        g.fillStyle(tint(BND.wrath), 0.9);
        g.fillRect(f.x + w / 2 - 1.4, by - 1.6, 1.6, 7.2);
      }
    }
  }

  /** The patron, its bar, the beam and every spray laser — the whole top of the screen. */
  private paintGod(): void {
    const g = this.godGfx;
    if (!g) return;
    g.clear();

    // Exactly one patron is ever drawn, and the player's own outranks the opponent's: two eyes
    // hanging over the same arena would make it impossible to tell whose anger the bar belongs
    // to. When the *bot* is the one with a patron, drawing its bar is the whole tell for why it
    // is about to be attacked by its own god.
    const hudOwner: Owner | null = this.isBind('player') ? 'player'
      : this.isBind('npc') ? 'npc' : null;
    if (hudOwner) {
      const owner = hudOwner;
      const s = this.side(owner);
      const tint = this.col(owner);
      const anger = s.anger / ANGER_MAX;
      const wrath = this.turned(owner) ? 1 : 0;
      const awake = this.now < s.awakeUntil ? 1 : 0;

      cosmicVeil(g, tint, this.eyeX, EYE_Y - 6, 420, 150, 0.95, this.vizT);
      patronEye(g, tint, this.eyeX, EYE_Y, 46,
        0.28 + anger * 0.34 + awake * 0.38, 1,
        { wrath, drift: Math.sin(this.vizT * 0.7) + (wrath ? Math.sin(this.vizT * 11) : 0), t: this.vizT });

      // The anger bar, hung under the eye like a jaw.
      const w = 220;
      const by = EYE_Y + 44;
      g.fillStyle(tint(BND.void), 0.85);
      g.fillRect(this.eyeX - w / 2 - 3, by - 3, w + 6, 13);
      g.fillStyle(tint(BND.cosmicDeep), 0.95);
      g.fillRect(this.eyeX - w / 2, by, w, 7);
      const hotBar = anger > 0.7;
      g.fillStyle(tint(wrath ? BND.wrath : hotBar ? BND.heat : BND.gold),
        wrath ? 0.55 + 0.45 * Math.sin(this.vizT * 16) : 0.95);
      g.fillRect(this.eyeX - w / 2, by, w * (wrath ? 1 : anger), 7);
      g.lineStyle(1.4, tint(BND.goldDeep), 0.9);
      g.strokeRect(this.eyeX - w / 2, by, w, 7);
      // Quarter ticks, so 75 anger is a place rather than a number.
      for (let i = 1; i < 4; i++) {
        g.fillStyle(tint(BND.goldDeep), 0.8);
        g.fillRect(this.eyeX - w / 2 + (w * i) / 4, by, 1.2, 7);
      }

      // Chains hanging off the bar — the one place the element's own motif touches the HUD.
      for (let i = 0; i < 5; i++) {
        const cx = this.eyeX - w / 2 + (w * (i + 0.5)) / 5;
        const swing = Math.sin(this.vizT * 1.7 + i) * (2 + anger * 5);
        for (let k = 0; k < 3; k++) {
          chainLink(g, tint, cx + swing * (k + 1) * 0.35, by + 14 + k * 8,
            Math.PI / 2, 0.75, 0.9, anger);
        }
      }
    }

    // ── The beam ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.firingUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const x1 = Phaser.Math.Clamp(s.aimX, this.left, this.right);
      const y1 = Phaser.Math.Clamp(s.aimY, this.top, this.bottom);
      godBeam(g, this.col(owner), this.eyeX, EYE_Y + 22, x1, y1, 1, s.heat, this.vizT);
    }

    // ── Spray lasers ──
    for (const sp of this.sprays) {
      const a = Phaser.Math.Clamp((sp.until - this.now) / 180, 0, 1);
      const tint = this.col(sp.owner);
      g.lineStyle(9, tint(BND.cosmic), a * 0.25);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(3.4, tint(sp.turned ? BND.wrath : BND.gold), a * 0.9);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(1.2, tint(BND.goldLit), a);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.fillStyle(tint(sp.turned ? BND.wrath : BND.goldLit), a * 0.6);
      g.fillCircle(sp.x1, sp.y1, 9 * a + 2);
    }
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setStrain(this.turned(owner) ? 1 : s.anger / ANGER_MAX);
      av.setChannelling(this.now < s.awakeUntil || this.now < s.firingUntil || this.turned(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('bind-anger', playerIs ? {
      name: 'Patron', emoji: '👁️', color: s.anger > 70 ? BND.wrath : BND.gold, priority: 149,
      description: `How much of the god's patience you have spent. Overheating the beam costs 20, a starved idol costs 5 a second, and the ward hands over half of everything it eats. It falls at ${ANGER_DECAY} a second — and at ${ANGER_MAX} the god spends five seconds using this kit on you.`,
      count: Math.round(s.anger), suffix: `/${ANGER_MAX}`,
    } : null);

    this.api.setStatusIndicator('bind-wrath', playerIs && this.turned('player') ? {
      name: 'Forsaken', emoji: '⛓️', color: BND.wrath, priority: 1,
      description: 'The patron has turned. Every attack it normally makes on your behalf is being made on you instead, and nothing in the kit will answer until it calms down.',
      until: s.wrathUntil,
    } : null);

    this.api.setStatusIndicator('bind-ward', playerIs && s.ward ? {
      name: "Prophet's Protection", emoji: '✦', color: BND.goldLit, priority: 130,
      description: 'Hexes standing around you. The next instances of damage are eaten whole, however large — and half of everything they swallow goes to the patron as anger.',
      count: s.ward.charges,
    } : null);

    this.api.setStatusIndicator('bind-awake', playerIs && this.now < s.awakeUntil ? {
      name: 'God of Treachery', emoji: '🌌', color: BND.iris, priority: 131,
      description: 'The sky is open. Shard volleys, claw swipes, laser sprays and beams of dark light, all of them free, for as long as this lasts.',
      until: s.awakeUntil,
    } : null);

    const taxes = s.taxSpeed + s.taxVuln + s.taxWeak;
    this.api.setStatusIndicator('bind-tithe', playerIs && (taxes > 0 || s.sacrificed) ? {
      name: 'Tithe', emoji: '⛓️', color: BND.wrathDeep, priority: 4,
      description: `What the god has already taken: ${s.taxSpeed} × speed, ${s.taxVuln} × vulnerability, ${s.taxWeak} × damage${s.sacrificed ? `, and your ${s.sacrificed} slot` : ''}. None of it comes back.`,
      count: taxes,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** The barrage's speed tithe. Pulled by ArenaScene rather than pushed onto the body. */
  getPlayerSpeedMult(): number {
    return this.speedMult('player');
  }

  getNpcSpeedMult(): number {
    return this.speedMult('npc');
  }

  private speedMult(owner: Owner): number {
    if (!this.isBind(owner)) return 1;
    return TAX_STEP ** this.side(owner).taxSpeed;
  }

  /** 0–100. The bot's whole decision surface. */
  angerOf(owner: Owner): number {
    return Math.round(this.side(owner).anger);
  }

  /** True while the patron is pointed at that side — nothing it presses will answer. */
  isForsaken(owner: Owner): boolean {
    return this.turned(owner);
  }

  /** 0–1. The bot lets go before it tops out, which is the whole skill in the click. */
  heatOf(owner: Owner): number {
    return this.side(owner).heat;
  }

  isOverheated(owner: Owner): boolean {
    return this.side(owner).overheated;
  }

  /** Faith left in that side's idol, or -1 when it has none standing. */
  idolFaith(owner: Owner): number {
    const idol = this.idols[owner];
    return idol ? idol.faith : -1;
  }

  wardCharges(owner: Owner): number {
    return this.side(owner).ward?.charges ?? 0;
  }
}
