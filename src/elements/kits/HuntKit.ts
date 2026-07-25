import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { CustomStatus } from './StatusHudKit';
import {
  BEAST_TONES, HUNT, HUNTER_TONES, HuntAura, HuntAvatar, HuntColorFn, HuntForm, HuntFx,
  HuntTones, MOON_TONES, NPC_TONES, SILVER_TONES, tonesFor,
} from './HuntVisuals';

/**
 * Hunt Mastery kit — and Hunt's whole visual layer.
 *
 * Hunt's *rules* are still implemented inline in ArenaScene. Its *art* is not: the character
 * rig, the palette and every effect painter live here (and in HuntVisuals.ts), and ArenaScene
 * calls into the `fx*` methods below at each cast site rather than building tweens of its own.
 * That keeps the scene file from carrying a second copy of the element's look, and it is why
 * this kit owns an avatar for both fighters even though it only simulates the mastery layer.
 */

// ── Arena API ────────────────────────────────────────────────────────────────

/** Structural mirror of ArenaScene's `HuntGrenade` — the kit only needs these fields. */
export interface HuntKitGrenade {
  sprite: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  explodeAt: number;
  owner: 'player' | 'npc';
  stopped: boolean;
  /** Hybrid-form Grenade Leap. The pup leaves these alone — they are the hunter's own ride. */
  isLeap?: boolean;
}

/** Structural mirror of ArenaScene's `HuntTrailCircle`. */
export interface HuntKitTrail {
  x: number; y: number;
  expiresAt: number;
}

export interface HuntArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  /** Cosmetics: maps a hunt visual color through the owner's color cosmetic. */
  huntColor(owner: 'player' | 'npc', base: number): number;
  // ── Inline hunt state the mastery reacts to ──
  get beastForm(): boolean;
  get hybridForm(): boolean;
  /** The NPC's own form, so its rig wears the right silhouette too. */
  get npcBeastForm(): boolean;
  get bloodMoonActive(): boolean;
  get npcBloodMoonActive(): boolean;
  /** Aim point the player's rig faces — ArenaScene already tracks the cursor. */
  get aimX(): number;
  get aimY(): number;
  get playerBleeding(): boolean;
  get playerGrenades(): HuntKitGrenade[];
  get npcGrenades(): HuntKitGrenade[];
  get playerTrailCircles(): HuntKitTrail[];
  get npcTrailCircles(): HuntKitTrail[];
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Apply Hunt's bleed (plus its aura) to an enemy for `durMs`. */
  applyBleedTo(target: Fighter, durMs: number): void;
  /** Apply Hunt's bleed to the local player for `durMs`. */
  applyPlayerBleed(durMs: number): void;
  // ── Mastery ──
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── Weak Points (passive) ────────────────────────────────────────────────────

/** Half-width of the wedge. 30° each way = a 60° slice, a sixth of the circle. */
const WEAK_HALF_ANGLE = Phaser.Math.DegToRad(30);
const WEAK_SPIN_RAD_PER_SEC = 0.9;   // ~7s per revolution — slow enough to line a shot up
/** The slice starts outside the fighter's own body so the whole wedge stays readable. */
const WEAK_INNER_R = 24;
const WEAK_OUTER_R = 54;
const WEAK_DMG_MULT = 2;

// ── Beastling (bindable) ─────────────────────────────────────────────────────

const BEASTLING_DURATION_MS = 15000;
const BEASTLING_COOLDOWN_MS = 30000;

const BITE_INTERVAL_MS = 2000;
const BITE_DMG = 5;
const BITE_RANGE = 34;
const BITE_BLEED_MULT = 2;
const BLEED_MS = 8000;

const PUP_SPEED = 210;
const PUP_TRAIL_SPEED_MULT = 1.5;
const PUP_FOLLOW_DIST = 46;
/**
 * How far the pup will break off from your heel to go for something. Deliberately shorter
 * than the arena: outside this it stays with you, which is what makes it read as a pet
 * rather than a second fighter roaming the map.
 */
const PUP_AGGRO_RANGE = 420;
const TRAIL_RADIUS = 30;

const MOON_SPEED_MULT = 1.35;
const MOON_DMG_MULT = 1.6;
const MOON_SCALE = 1.4;

const ROAR_SLOW_MULT = 0.8;   // 20% slow, stacks on top of Blood Hunt's own 50%
const ROAR_SLOW_MS = 5000;

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

interface Beastling {
  owner: 'player' | 'npc';
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  endsAt: number;
  nextBiteAt: number;
  /** Last movement heading, in radians — drives which way the pup faces. */
  heading: number;
  /** Gait phase; advances with distance travelled so the legs match the speed. */
  gait: number;
  tailPhase: number;
  earLag: number;
  blinkUntil: number;
  nextBlinkAt: number;
  /** Squash-and-stretch pulse played on a bite and on a roar. */
  lungeUntil: number;
  /** The grenade currently in its mouth, and the fuse time frozen when it grabbed it. */
  carrying: HuntKitGrenade | null;
  carryFuseLeftMs: number;
}

export class HuntKit {
  private api: HuntArenaApi;

  // ── Visuals ──
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: HuntColorFn;
  private readonly ncol: HuntColorFn;
  private readonly pfx: HuntFx;
  private readonly nfx: HuntFx;
  /** The hunt character rig (fists, eyes, ears that grow into a head) for each hunt fighter. */
  private playerAvatar: HuntAvatar | null = null;
  private npcAvatar: HuntAvatar | null = null;
  /** Blood Pact's persistent aura, one per side. */
  private pactAura: Record<'player' | 'npc', HuntAura | null> = { player: null, npc: null };
  private pactUntil: Record<'player' | 'npc', number> = { player: 0, npc: 0 };

  // ── Weak Points ──
  private weakAngle = 0;
  private weakGfx = new Map<Fighter, Phaser.GameObjects.Graphics>();
  /** The wedge drawn on the local player when the online opponent has this mastery. */
  private weakPlayerGfx: Phaser.GameObjects.Graphics | null = null;
  private lastWeakLabelAt = -1000;

  // ── Beastling ──
  private beastlings: Beastling[] = [];
  /**
   * Absolute timestamp of the last summon. Seeded a full cooldown in the past because
   * the kit's first match runs the constructor and NOT reset(), and readiness is measured
   * against `scene.time.now` — leaving this at 0 would lock the ability for 30s.
   */
  private pupLastCastAt = -BEASTLING_COOLDOWN_MS;
  /** Roar slow, one channel per victim so the two sides never share an expiry. */
  private npcRoarSlowUntil = 0;
  private playerRoarSlowUntil = 0;

  // ── Requirement tracking ──
  private trackedEnemies = new WeakSet<Fighter>();

  constructor(api: HuntArenaApi) {
    this.api = api;
    this.pcol = (base) => api.huntColor('player', base);
    this.ncol = (base) => api.huntColor('npc', base);
    this.pfx = new HuntFx(api.scene, this.pcol);
    this.nfx = new HuntFx(api.scene, this.ncol);
  }

  // ── Visual accessors, used from ArenaScene's hunt cast sites ─────────────

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): HuntColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  fx(owner: 'player' | 'npc'): HuntFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is hunt this match. */
  avatar(owner: 'player' | 'npc'): HuntAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Shades for whatever that side is currently wearing — human, beast or hybrid, reddened under
   * a Blood Moon. Every hunt effect takes its colours from here, so a form change recolours the
   * whole element at once instead of at thirty separate call sites.
   */
  tones(owner: 'player' | 'npc'): HuntTones {
    if (owner === 'player') {
      if (this.api.bloodMoonActive) return MOON_TONES;
      if (this.api.hybridForm) return SILVER_TONES;
      if (this.api.beastForm) return BEAST_TONES;
      return HUNTER_TONES;
    }
    if (this.api.npcBloodMoonActive) return MOON_TONES;
    if (this.api.npcBeastForm) return BEAST_TONES;
    return NPC_TONES;
  }

  private formOf(owner: 'player' | 'npc'): HuntForm {
    if (owner === 'player') return this.api.hybridForm ? 'hybrid' : this.api.beastForm ? 'beast' : 'human';
    return this.api.npcBeastForm ? 'beast' : 'human';
  }

  reset(): void {
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const o of ['player', 'npc'] as const) {
      this.pactAura[o]?.destroy();
      this.pactAura[o] = null;
      this.pactUntil[o] = 0;
    }
    for (const g of this.weakGfx.values()) g.destroy();
    this.weakGfx.clear();
    if (this.weakPlayerGfx) { this.weakPlayerGfx.destroy(); this.weakPlayerGfx = null; }
    this.weakAngle = 0;
    this.lastWeakLabelAt = -1000;
    // Carried grenades are deliberately not handed back here — reset() runs on match start,
    // after ArenaScene has already destroyed every grenade sprite.
    for (const b of this.beastlings) {
      b.carrying = null;
      b.gfx.destroy();
    }
    this.beastlings = [];
    this.pupLastCastAt = -BEASTLING_COOLDOWN_MS;
    this.npcRoarSlowUntil = 0;
    this.playerRoarSlowUntil = 0;
    this.trackedEnemies = new WeakSet<Fighter>();
    this.api.setStatusIndicator('beastling-roar', null);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /** The slot Beastling is bound over this match, or null when it isn't bound. */
  private pupSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.api.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === 'beastling') return s;
    }
    return null;
  }

  /**
   * True when the given normal-form slot is displaced by Beastling this match, so
   * ArenaScene's hunt input block must skip that slot's own ability.
   */
  isSlotBound(slot: 'e' | 'r' | 'f' | 'q'): boolean {
    return this.pupSlot() === slot;
  }

  handleInput(time: number): void {
    const slot = this.pupSlot();
    if (!slot) return;
    // The pup is whistled up as a human — no transforming with a hand in your mouth.
    if (this.api.beastForm || this.api.hybridForm) return;
    const key = slot === 'e' ? this.api.eKey
      : slot === 'r' ? this.api.rKey
        : slot === 'f' ? this.api.fKey : this.api.qKey;
    if (Phaser.Input.Keyboard.JustDown(key)) this.trySummon(time);
  }

  /** 0 = just summoned, 1 = ready. While a pup is out the bar counts down its 15s instead. */
  getBeastlingCooldownRatio(time: number): number {
    const mine = this.beastlings.find((b) => b.owner === 'player');
    if (mine) return Phaser.Math.Clamp((mine.endsAt - time) / BEASTLING_DURATION_MS, 0, 1);
    return Math.min(1, (time - this.pupLastCastAt) / BEASTLING_COOLDOWN_MS);
  }

  private trySummon(time: number): void {
    if (this.beastlings.some((b) => b.owner === 'player')) return;
    if (time - this.pupLastCastAt < BEASTLING_COOLDOWN_MS) return;
    this.pupLastCastAt = time;
    this.spawn('player', time);
    // Private timer, so this never flows through onCastStamp — broadcast it by hand.
    this.api.broadcastMasteryCast('beastling');
    const { player } = this.api;
    this.api.showFloatingText(player.x, player.y - 44, '🐕 Beastling!', '#d9a066');
  }

  /** Online replay: the remote Hunt player whistled up their own pup. */
  doNpcBeastling(): void {
    if (this.beastlings.some((b) => b.owner === 'npc')) return;
    this.spawn('npc', this.api.scene.time.now);
  }

  private spawn(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.api;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    const gfx = scene.add.graphics().setDepth(6);
    this.beastlings.push({
      owner,
      gfx,
      x: f.x - 28,
      y: f.y + 14,
      endsAt: time + BEASTLING_DURATION_MS,
      nextBiteAt: time + BITE_INTERVAL_MS,
      heading: 0,
      gait: 0,
      tailPhase: 0,
      earLag: 0,
      blinkUntil: 0,
      nextBlinkAt: time + 1800,
      lungeUntil: 0,
      carrying: null,
      carryFuseLeftMs: 0,
    });
    // Whistled up: a scatter of paw-scuffed dirt and the pup standing in it.
    const fx = this.fx(owner);
    fx.bloom(f.x - 28, f.y + 14, 22, 7, 5, this.tones(owner));
    fx.smoke(f.x - 28, f.y + 14, 3, 16, 4);
    this.avatar(owner)?.play('sweep');
  }

  // ── Character rig ──────────────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the fist-and-ears avatar for whichever fighters are hunt.
   * The player faces the cursor; the NPC faces whoever it is fighting. Blood Pact's aura lives
   * here too, at a lower depth than anything a cast raises, so the two stack into one
   * silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number): void {
    const { scene, player, npc } = this.api;

    if (this.api.elementId === 'hunt' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new HuntAvatar(scene, this.pcol, HUNTER_TONES);
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(this.api.aimY - player.y, this.api.aimX - player.x));
      av.setForm(this.formOf('player'));
      av.setMoon(this.api.bloodMoonActive);
      // Beast and Blood Moon are both "bigger, faster, angrier" — the rig says so.
      av.setIntensity(this.api.bloodMoonActive ? 1.45 : this.api.beastForm ? 1.3 : this.api.hybridForm ? 1.15 : 1);
      av.setMastered(this.api.masteryActive);
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.api.npcElementId === 'hunt' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new HuntAvatar(scene, this.ncol, NPC_TONES);
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setForm(this.formOf('npc'));
      av.setMoon(this.api.npcBloodMoonActive);
      av.setIntensity(this.api.npcBloodMoonActive ? 1.4 : this.api.npcBeastForm ? 1.25 : 1);
      av.setMastered(this.api.npcMasteryActive);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    // Blood Pact: a live blood aura for as long as the pact is up.
    const now = scene.time.now;
    for (const owner of ['player', 'npc'] as const) {
      const f = owner === 'player' ? player : npc;
      if (this.pactUntil[owner] > now && f?.active) {
        if (!this.pactAura[owner]) {
          this.pactAura[owner] = new HuntAura(scene, this.col(owner), BEAST_TONES, 34, 0.9, 4, 7);
        }
        this.pactAura[owner]!.setTones(this.tones(owner));
        this.pactAura[owner]!.update(delta, f.x, f.y, f.alpha);
      } else if (this.pactAura[owner]) {
        this.pactAura[owner]!.destroy();
        this.pactAura[owner] = null;
      }
    }
  }

  // ── Cast-site effects, called from ArenaScene's hunt blocks ────────────────

  /** Fire one of the rig's arm gestures for a side. Safe when that side isn't hunt. */
  gesture(owner: 'player' | 'npc', g: 'punch' | 'dash' | 'slam' | 'raise' | 'sweep' | 'clap' | 'flex', angle?: number): void {
    this.avatar(owner)?.play(g, angle);
  }

  /** Shotgun (or hybrid silver shot): recoil, muzzle sheet, and the arm that threw it. */
  fxShotgun(owner: 'player' | 'npc', x: number, y: number, angle: number, silver: boolean): void {
    this.gesture(owner, 'punch', angle);
    const tones = silver ? SILVER_TONES : this.tones(owner);
    this.fx(owner).muzzleBlast(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, angle, silver ? 1.2 : 1, 9, tones);
  }

  /** Grenade leaving the hand: an overhand throw plus a puff of powder at the release point. */
  fxGrenadeThrow(owner: 'player' | 'npc', x: number, y: number, angle: number): void {
    this.gesture(owner, 'slam', angle);
    this.fx(owner).smoke(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, 2, 10, 5);
  }

  /**
   * Grenade detonation. `heavy` scales the *content* — a Blood Moon frag throws more casing,
   * more smoke and holds longer, rather than simply drawing a wider circle.
   */
  fxGrenadeBoom(owner: 'player' | 'npc', x: number, y: number, radius: number, isHeal: boolean, heavy: boolean): void {
    const fx = this.fx(owner);
    if (isHeal) {
      // A field dressing rather than a frag: no casing, no crater, and it blooms inward.
      fx.bloom(x, y, radius * 0.5, 9, 6, { crust: 0x1f3a18, body: 0x2f8a2f, wound: 0x44cc44, lit: 0x88ff88, spark: HUNT.white });
      fx.ring(x, y, radius * 0.2, radius, 0x44cc44, 460, 4.5, 6);
      return;
    }
    fx.frag(x, y, radius * 0.72, {
      tones: this.tones(owner),
      shards: heavy ? 20 : 12,
      smoke: heavy ? 5 : 3,
      duration: heavy ? 620 : 460,
    });
    this.api.scene.cameras.main.shake(heavy ? 220 : 140, heavy ? 0.007 : 0.004);
  }

  /** Shriek-converted shrapnel: a hard silver burst rather than an orange one. */
  fxShrapnel(owner: 'player' | 'npc', x: number, y: number): void {
    const fx = this.fx(owner);
    fx.flash(x, y, 16, 9, SILVER_TONES);
    fx.shrapnel(x, y, 14, 90, 8, SILVER_TONES);
    fx.ring(x, y, 6, 60, HUNT.silver, 380, 3.5, 7);
    fx.smoke(x, y, 2, 16, 6);
  }

  /** Beast-form claw: the lunge smear, then a three-gash rake where the claw landed. */
  fxSlash(owner: 'player' | 'npc', fromX: number, fromY: number, x: number, y: number, angle: number): void {
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    this.gesture(owner, 'sweep', angle);
    fx.pounce(fromX, fromY, x, y, 5, tones);
    fx.rake(x, y, angle, 74, 3, 8, tones);
    fx.splatter(x, y, 7, { speed: 190, angle, spread: 1.1, size: 3, life: 480, depth: 8, tones: BEAST_TONES });
  }

  /** Hunter's Trail switching on: the scent catching, drawn as a rake of gouges underfoot. */
  fxTrailStart(owner: 'player' | 'npc', x: number, y: number): void {
    const fx = this.fx(owner);
    this.gesture(owner, 'flex');
    fx.bloom(x, y, 30, 8, 4, this.tones(owner));
    fx.ring(x, y, 10, 62, this.tones(owner).wound, 380, 3.5, 4);
  }

  /** Blood Pact opening — and the aura it leaves behind for its 5s. */
  fxBloodPact(owner: 'player' | 'npc', x: number, y: number, durationMs: number): void {
    this.pactUntil[owner] = this.api.scene.time.now + durationMs;
    this.gesture(owner, 'clap');
    const fx = this.fx(owner);
    fx.bloom(x, y, 36, 9, 5, BEAST_TONES);
    fx.splatter(x, y, 10, { speed: 120, size: 3, life: 560, depth: 6, tones: BEAST_TONES });
    fx.ring(x, y, 12, 70, HUNT.blood, 460, 4, 5);
  }

  /** Transform in or out. `toBeast` false runs the rips inward for the revert. */
  fxTransform(owner: 'player' | 'npc', x: number, y: number, toBeast: boolean, hybrid = false): void {
    this.gesture(owner, toBeast ? 'raise' : 'flex');
    const tones = hybrid ? SILVER_TONES : toBeast ? BEAST_TONES : this.tones(owner);
    this.fx(owner).transform(x, y, 44, tones, toBeast, 8);
    this.api.scene.cameras.main.shake(toBeast ? 260 : 150, toBeast ? 0.006 : 0.003);
  }

  /** A roar: Blood Hunt's, Beast Instinct's screech, or the pup joining in. */
  fxRoar(owner: 'player' | 'npc', x: number, y: number, radius = 150): void {
    this.gesture(owner, 'raise');
    const fx = this.fx(owner);
    fx.howl(x, y, radius, 720, 9, this.tones(owner));
    fx.splatter(x, y, 6, { speed: radius * 1.2, size: 2.6, life: 480, depth: 8, tones: BEAST_TONES });
    this.api.scene.cameras.main.shake(150, 0.004);
  }

  /** The 1s wind-up before an upgraded Blood Hunt teleport. */
  fxBloodHuntCharge(owner: 'player' | 'npc', durationMs: number): void {
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.avatar(owner)?.setHold('brace');
    this.fx(owner).channelHunger(f.x, f.y, 54, durationMs, () => ({ x: f.x, y: f.y }), 8, BEAST_TONES);
    this.api.scene.time.delayedCall(durationMs, () => this.avatar(owner)?.setHold(null));
  }

  /** Explosive Leap going invisible, and landing again. */
  fxLeap(owner: 'player' | 'npc', x: number, y: number, vanishing: boolean): void {
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    if (vanishing) {
      this.avatar(owner)?.play('dash');
      fx.bloom(x, y, 34, 8, 5, tones);
      fx.smoke(x, y, 4, 26, 6);
    } else {
      fx.frag(x, y, 82, { tones, shards: 14, smoke: 4, duration: 520 });
      this.api.scene.cameras.main.shake(200, 0.006);
    }
  }

  /** The forward shriek box hybrid form screams into. */
  fxShriek(owner: 'player' | 'npc', cx: number, cy: number, angle: number, halfLen: number, halfWide: number): void {
    this.gesture(owner, 'sweep', angle);
    const fx = this.fx(owner);
    fx.shriekBox(cx, cy, angle, halfLen, halfWide, 7, SILVER_TONES);
    const f = owner === 'player' ? this.api.player : this.api.npc;
    fx.howl(f.x, f.y, 70, 420, 9, SILVER_TONES);
  }

  /** Weak Points reward pip — a rake right on the seam that was hit. */
  fxWeakPoint(x: number, y: number, angle: number): void {
    this.pfx.rake(x, y, angle, 40, 3, 9, BEAST_TONES, 8);
    this.pfx.splatter(x, y, 5, { speed: 150, angle, spread: 1.2, size: 2.4, life: 380, depth: 9, tones: BEAST_TONES });
  }

  // ── Cross-ability hooks ────────────────────────────────────────────────────

  /**
   * Blood Hunt's roar. The caster's pup throws its head back and joins in, adding a
   * second, separate 20% slow on top of the ability's own — the two stack.
   */
  onBloodHunt(owner: 'player' | 'npc'): void {
    const pup = this.beastlings.find((b) => b.owner === owner);
    if (!pup) return;
    const time = this.api.scene.time.now;
    pup.lungeUntil = time + 260;
    if (owner === 'player') {
      this.npcRoarSlowUntil = Math.max(this.npcRoarSlowUntil, time + ROAR_SLOW_MS);
      this.api.showFloatingText(pup.x, pup.y - 26, '🐕 ROAR! −20%', '#ffaa66');
    } else {
      this.playerRoarSlowUntil = Math.max(this.playerRoarSlowUntil, time + ROAR_SLOW_MS);
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 46, '🐕 Roared! −20%', '#ffaa66');
    }
    this.spawnRoarRings(pup);
  }

  private spawnRoarRings(pup: Beastling): void {
    // A pup's howl is the same shape as its owner's, just smaller.
    const fx = this.fx(pup.owner);
    const tones = this.isMoonUp(pup) ? MOON_TONES : this.tones(pup.owner);
    fx.howl(pup.x, pup.y, 62, 620, 7, tones);
  }

  /** Extra speed multiplier the player's pup roar puts on the enemy. */
  getEnemySpeedMult(time: number): number {
    return time < this.npcRoarSlowUntil ? ROAR_SLOW_MULT : 1;
  }

  /** Extra speed multiplier the opponent's pup roar puts on the local player. */
  getPlayerSpeedMult(time: number): number {
    return time < this.playerRoarSlowUntil ? ROAR_SLOW_MULT : 1;
  }

  /** Grenade explosions that caught somebody — feeds the "Frag Out" requirement. */
  noteGrenadeHits(owner: 'player' | 'npc', hits: number): void {
    if (owner !== 'player' || hits <= 0) return;
    this.api.recordMasteryStat('grenadeHits', hits);
  }

  // ── Weak Points ────────────────────────────────────────────────────────────

  /**
   * Damage multiplier for a hit that landed at (hitX, hitY) on `target`: 2 inside the
   * sweeping wedge, 1 everywhere else. `attacker` picks which side's passive applies —
   * the player's own mastery for their shots, the opponent's for theirs.
   */
  weakPointMult(target: Fighter, hitX: number, hitY: number, attacker: 'player' | 'npc'): number {
    if (attacker === 'player' ? !this.api.masteryActive : !this.api.npcMasteryActive) return 1;
    const ang = Math.atan2(hitY - target.y, hitX - target.x);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - this.weakAngle));
    return diff <= WEAK_HALF_ANGLE ? WEAK_DMG_MULT : 1;
  }

  /**
   * Announce a weak-point hit. Kept separate from {@link weakPointMult} so callers that
   * only need the number can just take it, and self-throttled because a shotgun puts
   * several pellets into the wedge at once and one label per volley is plenty.
   */
  showWeakPointHit(x: number, y: number): void {
    const time = this.api.scene.time.now;
    if (time - this.lastWeakLabelAt < 350) return;
    this.lastWeakLabelAt = time;
    this.api.showFloatingText(x, y - 30, '🎯 WEAK POINT', '#ff5555');
    // The seam opens: a rake right on the wedge that was hit, thrown along the sweep.
    this.fxWeakPoint(x, y, this.weakAngle + Math.PI);
  }

  private drawWeakWedge(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, pulse: number): void {
    const a0 = this.weakAngle - WEAK_HALF_ANGLE;
    const a1 = this.weakAngle + WEAK_HALF_ANGLE;
    gfx.clear();
    gfx.setPosition(0, 0);

    // Body of the slice — a dark base with a hotter core wedge inside it.
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

    // Ticked outer rim — five short radial nicks along the crust.
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

    // On every enemy while the local player has the passive.
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

    // Mirrored onto the local player when the online opponent is the mastered hunter.
    if (this.api.npcMasteryActive) {
      if (!this.weakPlayerGfx) this.weakPlayerGfx = scene.add.graphics().setDepth(3);
      this.drawWeakWedge(this.weakPlayerGfx, this.api.player.x, this.api.player.y, pulse);
    } else if (this.weakPlayerGfx) {
      this.weakPlayerGfx.destroy();
      this.weakPlayerGfx = null;
    }
  }

  // ── Beastling simulation ───────────────────────────────────────────────────

  /** The pup's quarry: whoever its owner is hunting. */
  private targetOf(pup: Beastling): Fighter | null {
    if (pup.owner === 'npc') {
      const p = this.api.player;
      return p.active && p.hp > 0 ? p : null;
    }
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.api.enemies) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(pup.x, pup.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private isMoonUp(pup: Beastling): boolean {
    return pup.owner === 'player' ? this.api.bloodMoonActive : this.api.npcBloodMoonActive;
  }

  /** Trail circles belong to the hunter who laid them — the pup only speeds up on its own. */
  private onTrail(pup: Beastling, time: number): boolean {
    const circles = pup.owner === 'player' ? this.api.playerTrailCircles : this.api.npcTrailCircles;
    for (const c of circles) {
      if (time > c.expiresAt) continue;
      if (Phaser.Math.Distance.Between(pup.x, pup.y, c.x, c.y) <= TRAIL_RADIUS) return true;
    }
    return false;
  }

  /** A thrown grenade of the pup's owner that nobody has fetched yet. */
  private fetchableGrenade(pup: Beastling): HuntKitGrenade | null {
    const list = pup.owner === 'player' ? this.api.playerGrenades : this.api.npcGrenades;
    for (const g of list) {
      if (g.owner !== pup.owner || g.isLeap) continue;
      if (this.beastlings.some((b) => b.carrying === g)) continue;
      return g;
    }
    return null;
  }

  /** Hand a fetched grenade back to the normal fuse, wherever the pup is standing. */
  private releaseCarried(pup: Beastling, time: number): void {
    const g = pup.carrying;
    if (!g) return;
    g.x = pup.x;
    g.y = pup.y;
    g.sprite.setPosition(pup.x, pup.y).setVisible(true);
    g.explodeAt = time + pup.carryFuseLeftMs;
    pup.carrying = null;
    pup.carryFuseLeftMs = 0;
  }

  /** Set the fetched grenade off right here — ArenaScene's grenade loop does the boom. */
  private detonateCarried(pup: Beastling, time: number): void {
    const g = pup.carrying;
    if (!g) return;
    g.x = pup.x;
    g.y = pup.y;
    g.sprite.setPosition(pup.x, pup.y).setVisible(true);
    g.explodeAt = time;   // due now; the scene's own loop explodes it and counts the hits
    pup.carrying = null;
    pup.carryFuseLeftMs = 0;
    this.api.showFloatingText(pup.x, pup.y - 24, '🐕 Fetch!', '#ffaa44');
  }

  private bite(pup: Beastling, target: Fighter, time: number): void {
    const moon = this.isMoonUp(pup);
    const bleeding = pup.owner === 'npc' ? this.api.playerBleeding : target.bleeding;
    let dmg = BITE_DMG;
    if (bleeding) dmg *= BITE_BLEED_MULT;
    if (moon) dmg *= MOON_DMG_MULT;
    dmg = Math.round(dmg);

    target.takeDamage(dmg);
    this.api.spawnHitFlash(target.x, target.y, moon ? 0xcc2222 : 0xd9a066);
    pup.lungeUntil = time + 200;
    pup.nextBiteAt = time + BITE_INTERVAL_MS;

    // Under a Blood Moon the bites break the skin.
    if (moon) {
      if (pup.owner === 'npc') this.api.applyPlayerBleed(BLEED_MS);
      else this.api.applyBleedTo(target, BLEED_MS);
    }

    // Teeth going in: a small two-gash bite rather than a stretched oval.
    const ang = Math.atan2(target.y - pup.y, target.x - pup.x);
    const bx = pup.x + Math.cos(ang) * 16, by = pup.y + Math.sin(ang) * 16;
    const fx = this.fx(pup.owner);
    const tones = moon ? MOON_TONES : this.tones(pup.owner);
    fx.rake(bx, by, ang, 26, 2, 8, tones, 9);
    fx.splatter(bx, by, moon ? 6 : 3, {
      speed: 110, angle: ang, spread: 1.2, size: 2.2, life: 400, depth: 8, tones: BEAST_TONES,
    });
  }

  private updateBeastlings(time: number, dt: number): void {
    for (let i = this.beastlings.length - 1; i >= 0; i--) {
      const pup = this.beastlings[i];
      const owner = pup.owner === 'player' ? this.api.player : this.api.npc;
      const moon = this.isMoonUp(pup);

      if (time >= pup.endsAt || !owner.active) {
        this.releaseCarried(pup, time);
        // Called off: it scatters back into the dirt it came out of.
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
        const g = pup.carrying;
        if (g.explodeAt <= time) {
          // Something else forced it due (E+ pellet detonation) — let go and let it blow.
          g.sprite.setVisible(true);
          pup.carrying = null;
          pup.carryFuseLeftMs = 0;
        } else {
          // Frozen fuse: the grenade cannot come due while it is in the pup's mouth. Its own
          // sprite is hidden — the pup is drawn holding one in its jaws instead, and the real
          // one would otherwise sit on top of the whole animal.
          g.stopped = true;
          g.explodeAt = Infinity;
          g.x = pup.x;
          g.y = pup.y - 6;
          g.sprite.setPosition(g.x, g.y).setVisible(false);
        }
      } else {
        const loose = this.fetchableGrenade(pup);
        if (loose && Phaser.Math.Distance.Between(pup.x, pup.y, loose.x, loose.y) <= FETCH_PICKUP_R) {
          pup.carryFuseLeftMs = Math.max(200, loose.explodeAt - time);
          pup.carrying = loose;
          loose.stopped = true;
          loose.explodeAt = Infinity;
          loose.sprite.setVisible(false);
          this.api.showFloatingText(pup.x, pup.y - 24, '🐕 Got it!', '#ffcc66');
        }
      }

      // ── Where to run ────────────────────────────────────────────────
      const quarry = this.targetOf(pup);
      const loose = pup.carrying ? null : this.fetchableGrenade(pup);
      let destX: number;
      let destY: number;
      let arriveR = 6;

      if (pup.carrying && quarry) {
        // Carrying: sprint the grenade onto the enemy and set it off there.
        destX = quarry.x; destY = quarry.y;
        arriveR = FETCH_DELIVER_R;
        if (Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= FETCH_DELIVER_R) {
          this.detonateCarried(pup, time);
        }
      } else if (loose) {
        destX = loose.x; destY = loose.y;
        arriveR = FETCH_PICKUP_R * 0.5;
      } else if (quarry && Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= PUP_AGGRO_RANGE) {
        destX = quarry.x; destY = quarry.y;
        arriveR = BITE_RANGE - 8;
      } else {
        // Heel: trot to a spot just behind the owner rather than into them.
        const back = Math.atan2(pup.y - owner.y, pup.x - owner.x);
        destX = owner.x + Math.cos(back) * PUP_FOLLOW_DIST;
        destY = owner.y + Math.sin(back) * PUP_FOLLOW_DIST;
        arriveR = 12;
      }

      let speed = PUP_SPEED;
      if (this.onTrail(pup, time)) speed *= PUP_TRAIL_SPEED_MULT;
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
        // Idle fidget so a stopped pup never looks like a decal.
        pup.gait += dt * 1.6;
      }

      // ── Biting ──────────────────────────────────────────────────────
      if (!pup.carrying && quarry && time >= pup.nextBiteAt) {
        if (Phaser.Math.Distance.Between(pup.x, pup.y, quarry.x, quarry.y) <= BITE_RANGE) {
          this.bite(pup, quarry, time);
        }
      }

      // ── Animation state ─────────────────────────────────────────────
      // Tail wags hardest near the owner and while carrying a prize.
      const nearOwner = Phaser.Math.Distance.Between(pup.x, pup.y, owner.x, owner.y) < 90;
      const wagRate = pup.carrying ? 15 : nearOwner ? 11 : 6;
      pup.tailPhase += dt * wagRate;
      // Ears lag the turn, then flop back — the delay is what makes them read as floppy.
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
   * Status tray: the opponent's pup roaring at you is a real debuff on you. Runs outside
   * the pup loop because the slow outlives a pup that expired mid-roar.
   */
  private updateRoarIndicator(time: number): void {
    if (this.playerRoarSlowUntil > time) {
      this.api.setStatusIndicator('beastling-roar', {
        name: 'Beastling Roar',
        emoji: '🐕',
        color: 0xd9a066,
        description: '20% slower — a beastling roared at you.',
        until: this.playerRoarSlowUntil,
        count: 20,
        suffix: '%',
      });
    } else {
      this.api.setStatusIndicator('beastling-roar', null);
    }
  }

  // ── Beastling art ──────────────────────────────────────────────────────────

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
    // Trot bob — the whole body rises and falls twice per stride.
    const bob = Math.sin(pup.gait) * 1.4 * s;
    const cy = pup.y + bob;

    const coat = moon ? PUP_COAT_MOON : PUP_COAT;
    const belly = moon ? PUP_BELLY_MOON : PUP_BELLY;
    const ear = moon ? PUP_EAR_MOON : PUP_EAR;

    // Ground shadow — squashes as the body rises.
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(cx, pup.y + 13 * s, 26 * s - bob, 7 * s);

    // ── Tail: four tapering segments curling up off the rump, hinged clear of the body
    // so the wag actually shows instead of being buried under the barrel ──
    const wag = Math.sin(pup.tailPhase) * 0.5;
    let tx = cx - 13 * s * flip;
    let ty = cy - 4 * s;
    // Points away from the head, then curls up over the back — a short question-mark hook,
    // not a broom handle, so the wag stays legible at real game scale.
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
      tang += 0.62 * flip;   // sweeps up and back over the spine
    }
    // Pale tail tip
    g.fillStyle(PUP_MUZZLE, 1);
    g.fillCircle(tx, ty, 1.9 * s);

    // ── Legs: fore and hind pairs, offset half a stride apart ──
    const legPairs: Array<[number, number]> = [
      [-9 * s * flip, 0], [-6 * s * flip, Math.PI],
      [7 * s * flip, Math.PI], [10 * s * flip, 0],
    ];
    for (const [ox, phase] of legPairs) {
      const swing = Math.sin(pup.gait * 2 + phase);
      g.fillStyle(coat, 1);
      g.fillRoundedRect(cx + ox - 2 * s, cy + 4 * s, 4 * s, (7 + swing * 1.6) * s, 2 * s);
      // Paw
      g.fillStyle(PUP_MUZZLE, 1);
      g.fillEllipse(cx + ox, cy + (11.5 + swing * 1.6) * s, 5 * s, 3 * s);
    }

    // ── Body ──
    g.fillStyle(coat, 1);
    g.fillEllipse(cx, cy, 30 * s, 19 * s);
    g.fillStyle(belly, 1);
    g.fillEllipse(cx, cy + 4 * s, 22 * s, 9 * s);
    // A couple of darker back patches — pups are rarely one flat colour.
    g.fillStyle(ear, 0.55);
    g.fillEllipse(cx - 5 * s * flip, cy - 5 * s, 9 * s, 5 * s);
    g.fillEllipse(cx + 6 * s * flip, cy - 4 * s, 6 * s, 4 * s);

    // Collar with a hanging tag — the "it's yours" tell. Drawn on the neck before the head
    // goes down, and kept to a thin band rather than a stripe painted along the shoulder.
    const collarX = cx + 10 * s * flip;
    g.lineStyle(2.4 * s, 0xaa2233, 1);
    g.beginPath();
    g.arc(collarX, cy - 1 * s, 8 * s, flip > 0 ? -1.15 : Math.PI - 1.15, flip > 0 ? 1.15 : Math.PI + 1.15, false);
    g.strokePath();
    g.fillStyle(0xffcc44, 1);
    g.fillCircle(collarX + 2 * s * flip, cy + 7.5 * s, 2.2 * s);

    const hx = cx + 15 * s * flip;
    const hy = cy - 6 * s + Math.sin(pup.gait) * 0.8 * s;

    /**
     * One floppy ear: a rounded flap hinged at the top of the skull that hangs down past
     * the jaw. `swing` is the lag from the last turn — the delay is what sells "floppy".
     */
    const drawEar = (hingeDx: number, swing: number, shade: number, len: number, wide: number) => {
      const bx = hx + hingeDx * s * flip;
      const by = hy - 7 * s;
      const a = Math.PI / 2 + swing;             // straight down, plus the flop
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
      g.fillCircle(tipX, tipY, wide * 0.42 * s);   // rounds the hanging tip off
    };

    // Far ear behind the skull — only a sliver shows, which is what gives the head depth.
    drawEar(-1, pup.earLag * 0.6 - 0.22, 0x4e3018, 12, 7);

    // ── Head ──
    g.fillStyle(coat, 1);
    g.fillCircle(hx, hy, 10 * s);
    // Slightly domed forehead so the skull isn't a plain disc.
    g.fillStyle(belly, 0.35);
    g.fillEllipse(hx + 2 * s * flip, hy - 4 * s, 11 * s, 6 * s);

    // Muzzle + nose
    const mx = hx + 6 * s * flip;
    const my = hy + 3 * s;
    g.fillStyle(PUP_MUZZLE, 1);
    g.fillEllipse(mx, my, 12 * s, 8 * s);
    g.fillStyle(0x241a12, 1);
    g.fillEllipse(mx + 4 * s * flip, my - 1 * s, 4 * s, 3 * s);

    // Eyes — a cream sclera so they read against the brown coat, blinking shut to a line,
    // lit red under a Blood Moon.
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

    // Near ear, over the top of the head and hanging past the jaw.
    drawEar(-3.5, pup.earLag, ear, 15, 8.5);

    // ── Carried grenade, clamped in the jaws ──
    if (pup.carrying) {
      const gx = mx + 8 * s * flip;
      const gy = my + 3 * s;
      g.fillStyle(0x3c4a1f, 1);
      g.fillCircle(gx, gy, 6 * s);
      g.lineStyle(1.4 * s, 0xff8800, 1);
      g.strokeCircle(gx, gy, 6 * s);
      g.fillStyle(0x776655, 1);
      g.fillRect(gx - 1.2 * s, gy - 9 * s, 2.4 * s, 4 * s);
      // Spark on the fuse
      g.fillStyle(0xffdd44, 0.7 + 0.3 * Math.sin(time / 70));
      g.fillCircle(gx, gy - 9 * s, 2 * s);
    }

    // ── Blood Moon extras: aura ring and a couple of drips ──
    if (moon) {
      g.lineStyle(1.5, 0xcc2222, 0.35 + 0.2 * Math.sin(time / 220));
      g.strokeCircle(cx, cy, 24 * s);
      g.fillStyle(0xaa1111, 0.7);
      g.fillCircle(mx + 3 * s * flip, my + 6 * s + (time / 12 % 6), 1.6 * s);
      g.fillCircle(mx - 2 * s * flip, my + 5 * s + ((time / 15 + 3) % 6), 1.2 * s);
    }
  }

  // ── Requirement tracking ───────────────────────────────────────────────────

  /**
   * Kills are booked against whichever form was worn at the moment of death, so the
   * three form requirements can only be advanced by actually playing that form.
   */
  private trackKills(): void {
    for (const t of this.api.enemies) {
      if (!t.active || this.trackedEnemies.has(t)) continue;
      this.trackedEnemies.add(t);
      t.once('defeated', () => {
        if (this.api.hybridForm) this.api.recordMasteryStat('hybridKills', 1);
        else if (this.api.beastForm) this.api.recordMasteryStat('beastKills', 1);
        else this.api.recordMasteryStat('normalKills', 1);
      });
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateAvatars(delta);
    if (this.api.elementId === 'hunt') this.trackKills();
    this.updateWeakPoints(time, dt);
    if (this.beastlings.length) this.updateBeastlings(time, dt);
    this.updateRoarIndicator(time);
  }
}
