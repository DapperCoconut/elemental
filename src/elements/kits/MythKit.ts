import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Ability, CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Sfx } from '../../audio';
import { FONT_UI } from '../../ui/Theme';
import { BanterLine, BanterSet, banterFor } from '../../data/MythBanter';
import {
  GunKind, MYTH, MythAvatar, MythColorFn, MythFx, beast as paintBeast, bubble as paintBubble, cloud as paintCloud,
  crowdFigure, jitter, pinpricks, portal as paintPortal, shard as paintShard, star, starMace, voidDisc, whip as paintWhip,
} from './MythVisuals';
import { MythView, VIEW_FOV, ViewEntity } from './MythView';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

// ── The Crowd (passive) ──────────────────────────────────────────────────────
const CROWD_WINDOW_MS = 4000;
/** Damage dealt inside the window that earns an Echo Shard… */
const CHEER_DEALT = 45;
/** …and damage taken inside it that gets you jeered. */
const BOO_TAKEN = 50;
const SHARD_MAX = 3;
const CHEER_MS = 2600;
const BOO_MS = 2600;
const CHEER_SLEEP_MS = 5000;
const BOO_SLEEP_MS = 6000;
const JEER_MS = 4000;

// ── Cosmic Whip (Click) ──────────────────────────────────────────────────────
const WHIP_LEN = 180;
const WHIP_HALF_W = 22;
const WHIP_DAMAGE = 12;
const TIP_LEN = 36;
const TIP_DAMAGE = 24;
const TIP_STUN_MS = 600;
const WHIP_ANIM_MS = 280;
const WHIP_PLUS_MS = 8000;
const MACE_LIFE_MS = 3000;
const MACE_ORBIT_R = 26;
const MACE_DAMAGE = 6;
const MACE_GATE_MS = 500;
const MACE_SPIN = 4.5;

// ── Truth Breaker (E) ────────────────────────────────────────────────────────
const TRUTH_R = 150;
const TRUTH_HALF = Math.PI / 4;
const TRUTH_DAMAGE = 22;
const TRUTH_WINDOW_MS = 3000;
const TRUTH_DASH = 240;
const TRUTH_DASH_MS = 220;
const TRUTH_DASH_DAMAGE = 32;
const TRUTH_DASH_HIT_R = 46;

// ── Determination (R) ────────────────────────────────────────────────────────
const DET_INVULN_MS = 1500;
const DET_IMMUNE_MS = 3000;
const DET_PLUS_MS = 5000;
const DET_PLUS_SPEED = 1.25;

// ── Beast of Myth (F) ────────────────────────────────────────────────────────
const BEAST_DELAY_MS = 450;
const BEAST_SPEED = 260;
const BEAST_HEAD_R = 30;
const BEAST_SEGMENTS = 9;
const BEAST_SEG_GAP = 15;
const BEAST_GRAB_R = 42;
const BEAST_TICK_MS = 500;
const BEAST_TICK_DAMAGE = 8;
const BEAST_PORTAL_BACK = 70;
const BEAST_FADE_MS = 420;
const FLIP_MS = 520;
const FLIP_SPEED = 1.2;
const FLIP_SPEED_MS = 4000;
const FLIP_GATE_MS = 900;

// ── Final Destiny (Q) ────────────────────────────────────────────────────────
const DESTINY_MS = 15000;
const TURN_RATE = 3.1;
const PISTOL_DAMAGE = 8;
const PISTOL_SPEED = 980;
const PISTOL_LIFE_MS = 1100;
const PISTOL_HIT_R = 20;
const VULN_PER_STACK = 0.05;
const VULN_MAX = 4;
const VULN_MS = 5000;
const SHOT_PELLETS = 7;
const SHOT_DAMAGE = 6;
const SHOT_RANGE = 200;
const SHOT_HALF = Phaser.Math.DegToRad(14);
const SHOT_RAY_W = 14;
const GREN_COUNT = 3;
const GREN_HALF = Phaser.Math.DegToRad(20);
const GREN_RANGE = 230;
const GREN_FLIGHT_MS = 700;
const GREN_R = 72;
const GREN_DAMAGE = 14;
const GREN_STACK = [1, 1.25, 1.5];
const RIFLE_DAMAGE = 26;
const RIFLE_RANGE = 900;
const RIFLE_HALF_W = 16;
const HEADSHOT_R = 9;
const HEADSHOT_MULT = 1.5;
const ROCKET_SPEED = 190;
const ROCKET_R = 150;
const ROCKET_DAMAGE = 30;
const ROCKET_DIRECT = 20;
const ROCKET_HIT_R = 22;
const CLOUD_R = 110;
const CLOUD_TICK_MS = 500;
const CLOUD_TICK_DAMAGE = 2.5;
const CLOUD_MS = 5000;

const FIGHTER_R = 20;

/** The ids the kit relays for presses that never touch a cooldown. */
export const MYTH_NET_IDS = ['myth-whip-plus', 'myth-truth-plus', 'myth-determination-plus', 'myth-beast-recall'] as const;

export interface MythArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  get isInvasion(): boolean;
  get playerAbilities(): Ability[];
  get abilityBars(): Array<{ abilityId: string; lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  /** Skins: maps a Myth visual colour through that side's equipped skin. */
  mythColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay a press that never touches a cooldown (see `MYTH_NET_IDS`). */
  broadcastMasteryCast(id: string): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

interface Tally { at: number; amount: number }

interface WhipSwing { x0: number; y0: number; x1: number; y1: number; start: number; seed: number }

interface Mace {
  owner: Owner;
  cx: number; cy: number;
  born: number; until: number;
  seed: number;
  hitAt: Map<Fighter, number>;
}

interface Beast {
  owner: Owner;
  portalX: number; portalY: number;
  ang: number;
  x: number; y: number;
  trail: { x: number; y: number }[];
  born: number;
  /** Set once the beast has cleared the portal and is on its way. */
  moving: boolean;
  returning: boolean;
  grabbed: Map<Fighter, number>;
  /** The moment it hit a wall or came home; it fades for `BEAST_FADE_MS` after. */
  doneAt: number;
  seed: number;
}

interface Bullet { owner: Owner; x: number; y: number; vx: number; vy: number; born: number; reg: RegisteredProjectile | null }
interface Grenade { owner: Owner; x0: number; y0: number; tx: number; ty: number; start: number; until: number; salvo: number }
interface Rocket { owner: Owner; x: number; y: number; vx: number; vy: number; reg: RegisteredProjectile | null; seed: number }
interface Cloud { owner: Owner; x: number; y: number; until: number; nextTickAt: number; seed: number }

interface Side {
  aimX: number; aimY: number;
  shards: number;
  dealt: Tally[];
  taken: Tally[];
  lastRawTaken: number;
  cheerSleepUntil: number;
  booSleepUntil: number;
  whip: WhipSwing | null;
  whipPlusUntil: number;
  truthWindowUntil: number;
  dashUntil: number; dashVx: number; dashVy: number; dashX0: number; dashY0: number; dashHit: Set<Fighter>;
  detInvulnUntil: number;
  detImmuneUntil: number;
  detPlus: boolean;
  detHadInvincible: boolean;
  detHadUnstoppable: boolean;
  detLive: boolean;
  flipUntil: number;
  flipSpeedUntil: number;
  flipGateUntil: number;
  /** Who this side stunned, held still until the clock runs out. */
  stunHeld: Map<Fighter, number>;
  destinyUntil: number;
  destinyLive: boolean;
  yaw: number;
  gun: GunKind;
  gunRecoil: number;
  bob: number;
  hurt: number;
  salvo: number;
  /** Bot only: the next moment it may spend a shard. */
  nextRecastAt: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, shards: 0, dealt: [], taken: [], lastRawTaken: NaN,
    cheerSleepUntil: 0, booSleepUntil: 0,
    whip: null, whipPlusUntil: 0,
    truthWindowUntil: 0, dashUntil: 0, dashVx: 0, dashVy: 0, dashX0: 0, dashY0: 0, dashHit: new Set(),
    detInvulnUntil: 0, detImmuneUntil: 0, detPlus: false, detHadInvincible: false, detHadUnstoppable: false, detLive: false,
    flipUntil: 0, flipSpeedUntil: 0, flipGateUntil: 0,
    stunHeld: new Map(),
    destinyUntil: 0, destinyLive: false, yaw: 0, gun: 'pistol', gunRecoil: 0, bob: 0, hurt: 0, salvo: 0,
    nextRecastAt: 0,
  };
}

interface Spectator { x: number; y: number; s: number; seed: number; lit: boolean }

interface Bubble { who: 'myth' | 'foe'; text: string; until: number }

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; k: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const k = l2 === 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return { d: Math.hypot(px - (ax + dx * k), py - (ay + dy * k)), k };
}

/**
 * Myth — the ultimate element. A test element, reachable only from a cheat-mode save for now.
 *
 * The kit is built around one resource and one rule. The resource is the **Echo Shard**: the
 * crowd ringing the arena throws one whenever a Myth deals 45 inside four seconds (and jeers
 * them, 10% more damage taken for 4s, when they *take* 50 inside four). The rule is that every
 * ability has a second act that costs a shard: the whip's phantom maces (right-click), Truth
 * Breaker's true-damage dash (E again), Determination's longer, faster immunity (R again) and the
 * beast's recall (F again) — each as many times as there are shards to spend. The ultimate is
 * Final Destiny: fifteen seconds in first person with five guns on the five keys, drawn by
 * `MythView` while the arena carries on in two dimensions underneath.
 *
 * Both sides are mirrored — the bot has a crowd, shards and guns too, and spends its shards
 * itself (`updateBotRecasts`), since a recast is a press that never touches a cooldown and so
 * never reaches `castAbility`. Every `cast` in `myth.ts` is a one-line delegate into the `do*`
 * methods here; every opportunity the bot acts on is published through the readers at the bottom.
 *
 * Myth also talks: three exchanges a match, written per opponent in `MythBanter.ts`, as speech
 * bubbles over the two heads.
 */
export class MythKit {
  private api: MythArenaApi;
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private maces: Mace[] = [];
  private beasts: Beast[] = [];
  private bullets: Bullet[] = [];
  private grenades: Grenade[] = [];
  private rockets: Rocket[] = [];
  private clouds: Cloud[] = [];
  private pointerWasDown = false;
  private rightWasDown = false;
  private vizT = 0;
  private matchT = 0;
  private cheerUntil = 0;
  private booUntil = 0;
  private spectators: Spectator[] = [];

  private pcol: MythColorFn;
  private ncol: MythColorFn;
  private pfx: MythFx;
  private nfx: MythFx;
  private playerAvatar: MythAvatar | null = null;
  private npcAvatar: MythAvatar | null = null;
  private crowdGfx: Phaser.GameObjects.Graphics | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private headGfx: Phaser.GameObjects.Graphics | null = null;
  private view: MythView | null = null;

  // Banter
  private banter: BanterSet | null = null;
  private banterStage = 0;
  private banterQueue: BanterLine[] = [];
  private banterNextAt = 0;
  private bubble: Bubble | null = null;
  private bubbleGfx: Phaser.GameObjects.Graphics | null = null;
  private bubbleText: Phaser.GameObjects.Text | null = null;

  constructor(api: MythArenaApi) {
    this.api = api;
    this.pcol = (base) => api.mythColor('player', base);
    this.ncol = (base) => api.mythColor('npc', base);
    this.pfx = new MythFx(api.scene, this.pcol);
    this.nfx = new MythFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MythFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MythColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): MythAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private is(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'myth' : this.api.npcElementId === 'myth';
  }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  /** Online: the npc is the opponent's replica. Its control effects on us arrive by relay, not from here. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.api.isOnline; }

  private foes(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  private deny(owner: Owner, abilityId: string | null, text: string): void {
    const f = this.fighter(owner);
    if (abilityId) this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(MYTH.haze));
    Sfx.playAt('ui-denied', f.x, { volume: 0.55 });
  }

  private text(owner: Owner, x: number, y: number, t: string, color = MYTH.haze): void {
    if (owner !== 'player') return;
    this.api.showFloatingText(x, y, t, this.hex(color));
  }

  private shake(ms: number, k: number): void { this.api.scene.cameras.main.shake(ms, k); }

  /** The one place this kit lands damage. Tallies it for the crowd. */
  private hit(owner: Owner, t: Fighter, dmg: number, o: { trueDamage?: boolean; aoe?: boolean } = {}): void {
    if (!this.alive(t) || dmg <= 0) return;
    t.takeDamage(Math.round(dmg), { pierce: o.trueDamage, trueDamage: o.trueDamage, aoe: o.aoe });
    this.side(owner).dealt.push({ at: this.now, amount: dmg });
  }

  /** A stun this kit owns. Skipped for a replica's effects on us — the relay carries them. */
  private stun(owner: Owner, t: Fighter, ms: number): void {
    if (!this.alive(t) || t.unstoppable) return;
    if (this.isReplica(owner) && t === this.api.player) return;
    const wall = Date.now() + ms;
    t.stunnedUntil = Math.max(t.stunnedUntil, wall);
    t.disarmedUntil = Math.max(t.disarmedUntil, wall);
    this.side(owner).stunHeld.set(t, Math.max(this.side(owner).stunHeld.get(t) ?? 0, this.now + ms));
  }

  /** Spend a shard, or say why not. */
  private spend(owner: Owner): boolean {
    const s = this.side(owner);
    if (s.shards <= 0) { this.deny(owner, null, 'NO ECHO SHARD'); return false; }
    s.shards -= 1;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).starSpray(f.x, f.y - 40, 6, 24, 380, 12, MYTH.shard);
      Sfx.playAt('shard-gain', f.x, { rate: 1.35, volume: 0.5 });
    }
    return true;
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player') this.api.broadcastMasteryCast(id);
  }

  /** The target's vulnerability from pistol stacks, 0–0.2. */
  private vulnOf(t: Fighter): number {
    return Date.now() < t.mythVulnUntil ? t.mythVulnStacks * VULN_PER_STACK : 0;
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const b of this.bullets) if (b.reg) this.api.projectileRegistry.remove(b.reg);
    for (const r of this.rockets) if (r.reg) this.api.projectileRegistry.remove(r.reg);
    this.maces = []; this.beasts = []; this.bullets = []; this.grenades = []; this.rockets = []; this.clouds = [];
    this.pointerWasDown = false; this.rightWasDown = false;
    this.vizT = 0; this.matchT = 0; this.cheerUntil = 0; this.booUntil = 0;
    this.spectators = [];
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.crowdGfx?.destroy(); this.crowdGfx = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.headGfx?.destroy(); this.headGfx = null;
    this.view?.destroy(); this.view = null;
    this.banter = null; this.banterStage = 0; this.banterQueue = []; this.banterNextAt = 0; this.bubble = null;
    this.bubbleGfx?.destroy(); this.bubbleGfx = null;
    this.bubbleText?.destroy(); this.bubbleText = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'myth') return;
    const s = this.sides.player;
    const p = this.api.player;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    const right = pointer.rightButtonDown();
    const down = pointer.isDown && !right;
    const rightClicked = right && !this.rightWasDown;
    this.pointerWasDown = down;
    this.rightWasDown = right;
    if (!this.alive(p)) return;

    if (s.destinyLive) {
      // First person: the cursor's x on the screen is the aim inside the field of view, and
      // the body turns toward wherever it is held. The five keys are the five guns.
      const W = this.api.width;
      const k = Phaser.Math.Clamp((mouseX - W / 2) / (W / 2), -1, 1);
      const aim = s.yaw + k * (VIEW_FOV / 2) * 0.92;
      s.aimX = p.x + Math.cos(aim) * 320;
      s.aimY = p.y + Math.sin(aim) * 320;
      const ctx = this.api.buildPlayerContext(s.aimX, s.aimY);
      if (down) p.castAbility('myth-pistol', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('myth-shotgun', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('myth-grenades', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('myth-rifle', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('myth-rocket', ctx);
      return;
    }

    s.aimX = mouseX;
    s.aimY = mouseY;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Held: the whip lashes every time it is off cooldown.
    if (down) p.castAbility('myth-whip', ctx);
    if (rightClicked) this.doWhipPlus('player');
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // A press inside the window with a shard is the dash; otherwise the slash (or nothing).
      if (this.now < s.truthWindowUntil && s.shards > 0) this.doTruthPlus('player', mouseX, mouseY);
      else p.castAbility('myth-truth', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      if (s.detLive && s.shards > 0 && !s.detPlus) this.doDeterminationPlus('player');
      else p.castAbility('myth-determination', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      const b = this.beastOf('player');
      if (b && !b.returning && s.shards > 0) this.doBeastRecall('player');
      else p.castAbility('myth-beast', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('myth-destiny', ctx);
  }

  /** First person: WASD walks relative to where you look. ArenaScene hands over the body while this is true. */
  ownsPlayerMovement(): boolean {
    return this.api.elementId === 'myth' && this.sides.player.destinyLive;
  }

  /** The velocity for this frame, given the fighter's speed already multiplied through. */
  playerVelocity(speed: number): { vx: number; vy: number } {
    const s = this.sides.player;
    let fwd = 0;
    let strafe = 0;
    if (this.api.wKey.isDown) fwd += 1;
    if (this.api.sKey.isDown) fwd -= 1;
    if (this.api.dKey.isDown) strafe += 1;
    if (this.api.aKey.isDown) strafe -= 1;
    if (fwd !== 0 && strafe !== 0) { fwd *= 0.7071; strafe *= 0.7071; }
    const ca = Math.cos(s.yaw);
    const sa = Math.sin(s.yaw);
    return { vx: (ca * fwd - sa * strafe) * speed, vy: (sa * fwd + ca * strafe) * speed };
  }

  // ── Click — Cosmic Whip ────────────────────────────────────────────────────

  doWhip(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-whip'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-whip'); return; }
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x0 = f.x + Math.cos(ang) * 14;
    const y0 = f.y + Math.sin(ang) * 14;
    const x1 = x0 + Math.cos(ang) * WHIP_LEN;
    const y1 = y0 + Math.sin(ang) * WHIP_LEN;
    s.whip = { x0, y0, x1, y1, start: this.now, seed: Math.random() * 999 };
    this.avatar(owner)?.play('sweep', ang, WHIP_ANIM_MS);

    let tipLanded = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const { d } = segDist(t.x, t.y, x0, y0, x1, y1);
      if (d > WHIP_HALF_W + r) continue;
      const tipD = Math.hypot(t.x - x1, t.y - y1);
      if (tipD <= TIP_LEN / 2 + r) {
        this.hit(owner, t, TIP_DAMAGE);
        this.stun(owner, t, TIP_STUN_MS);
        this.fx(owner).tipHit(t.x, t.y);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.mace));
        this.text(owner, t.x, t.y - 40, 'STAR MACE', MYTH.gold);
        tipLanded = true;
      } else {
        this.hit(owner, t, WHIP_DAMAGE);
        this.fx(owner).graze(t.x, t.y);
      }
    }
    if (tipLanded) { Sfx.playAt('hit-heavy', x1, { rate: 1.2, volume: 0.6 }); this.shake(90, 0.003); }
    if (this.now < s.whipPlusUntil) {
      this.maces.push({ owner, cx: x1, cy: y1, born: this.now, until: this.now + MACE_LIFE_MS, seed: Math.random() * 999, hitAt: new Map() });
    }
  }

  /** Right-click: a shard for eight seconds of phantom maces. */
  doWhipPlus(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.destinyLive) return;
    if (this.now < s.whipPlusUntil) { this.deny(owner, null, 'ALREADY ENHANCED'); return; }
    if (!this.spend(owner)) return;
    s.whipPlusUntil = this.now + WHIP_PLUS_MS;
    this.relay(owner, 'myth-whip-plus');
    this.fx(owner).ring(f.x, f.y, 10, 44, 420, MYTH.mace, 2.5, 10);
    this.text(owner, f.x, f.y - 50, 'PHANTOM MACES', MYTH.mace);
    Sfx.playAt('sparkle', f.x, { rate: 0.9, volume: 0.6 });
  }

  // ── E — Truth Breaker ──────────────────────────────────────────────────────

  doTruth(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-truth'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-truth'); return; }
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.setEye(true);
    av?.play('sweep', ang, 320);
    this.api.scene.time.delayedCall(700, () => { if (this.now >= this.side(owner).dashUntil) { av?.setBlade(false); av?.setEye(this.masteryOn(owner)); } });
    this.fx(owner).slash(f.x, f.y, ang, TRUTH_R, TRUTH_HALF);
    this.shake(80, 0.0025);
    let any = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d > TRUTH_R + r) continue;
      const da = Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang);
      if (Math.abs(da) > TRUTH_HALF + (r / Math.max(1, d))) continue;
      this.hit(owner, t, TRUTH_DAMAGE, { trueDamage: true });
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.gold));
      if (!any) this.text(owner, t.x, t.y - 44, 'TRUE', MYTH.gold);
      any = true;
    }
    s.truthWindowUntil = this.now + TRUTH_WINDOW_MS;
  }

  /** E again inside the window: a shard for a true-damage dash. */
  doTruthPlus(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.destinyLive) return;
    if (this.now >= s.truthWindowUntil) return;
    if (!this.spend(owner)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + TRUTH_DASH_MS;
    s.dashVx = Math.cos(ang) * (TRUTH_DASH / (TRUTH_DASH_MS / 1000));
    s.dashVy = Math.sin(ang) * (TRUTH_DASH / (TRUTH_DASH_MS / 1000));
    s.dashX0 = f.x; s.dashY0 = f.y;
    s.dashHit = new Set();
    // The window stays open past the dash: a second shard is a second dash.
    s.truthWindowUntil = this.now + TRUTH_DASH_MS + TRUTH_WINDOW_MS;
    this.relay(owner, 'myth-truth-plus');
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.setEye(true);
    av?.play('dash', ang, TRUTH_DASH_MS + 100);
    Sfx.playAt('slash', f.x, { rate: 0.8, volume: 0.8 });
  }

  // ── R — Determination ──────────────────────────────────────────────────────

  doDetermination(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-determination'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-determination'); return; }
    if (!s.detLive) {
      s.detHadInvincible = f.isInvincible;
      s.detHadUnstoppable = f.unstoppable;
    }
    s.detLive = true;
    s.detPlus = false;
    s.detInvulnUntil = this.now + DET_INVULN_MS;
    s.detImmuneUntil = s.detInvulnUntil + DET_IMMUNE_MS;
    f.isInvincible = true;
    f.unstoppable = true;
    this.avatar(owner)?.setDetermined(true);
    this.avatar(owner)?.play('flex', undefined, 600);
    this.fx(owner).determination(f.x, f.y);
    this.text(owner, f.x, f.y - 50, 'DETERMINED', MYTH.gold);
    Sfx.playAt('status-invincible', f.x, { volume: 0.8 });
  }

  /** R again while it runs: a shard for five more seconds of immunity and a 25% stride. */
  doDeterminationPlus(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || !s.detLive || s.detPlus) return;
    if (!this.spend(owner)) return;
    s.detPlus = true;
    s.detImmuneUntil += DET_PLUS_MS;
    this.relay(owner, 'myth-determination-plus');
    this.fx(owner).ring(f.x, f.y, 14, 60, 500, MYTH.gold, 3, 10);
    this.text(owner, f.x, f.y - 50, '+5s  +25% SPEED', MYTH.gold);
    Sfx.playAt('status-haste', f.x, { volume: 0.7 });
  }

  private endDetermination(owner: Owner): void {
    const s = this.side(owner);
    if (!s.detLive) return;
    s.detLive = false;
    s.detPlus = false;
    const f = this.fighter(owner);
    if (f && f.active) {
      f.isInvincible = s.detHadInvincible;
      f.unstoppable = s.detHadUnstoppable;
    }
    this.avatar(owner)?.setDetermined(false);
  }

  // ── F — Beast of Myth ──────────────────────────────────────────────────────

  private beastOf(owner: Owner): Beast | null {
    return this.beasts.find((b) => b.owner === owner && b.doneAt === 0) ?? null;
  }

  doBeast(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-beast'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-beast'); return; }
    if (this.beastOf(owner)) { this.deny(owner, 'myth-beast', 'BEAST ALREADY LOOSE'); return; }
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const b = this.api.bounds;
    const px = Phaser.Math.Clamp(f.x - Math.cos(ang) * BEAST_PORTAL_BACK, b.x + 20, b.right - 20);
    const py = Phaser.Math.Clamp(f.y - Math.sin(ang) * BEAST_PORTAL_BACK, b.y + 20, b.bottom - 20);
    this.beasts.push({
      owner, portalX: px, portalY: py, ang, x: px, y: py, trail: [], born: this.now,
      moving: false, returning: false, grabbed: new Map(), doneAt: 0, seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('raise', ang + Math.PI, 500);
    this.fx(owner).ring(px, py, 6, 50, 500, MYTH.iris, 3, 9);
    this.fx(owner).starSpray(px, py, 10, 40, 600, 9, MYTH.starBlue);
    Sfx.playAt('portal', px, { rate: 0.8, volume: 0.9 });
    this.shake(300, 0.003);
  }

  /** F again while the beast is loose: a shard to call it home, catch and all. */
  doBeastRecall(owner: Owner): void {
    const f = this.fighter(owner);
    const bst = this.beastOf(owner);
    if (!this.alive(f) || !bst || bst.returning) return;
    if (!this.spend(owner)) return;
    bst.returning = true;
    bst.moving = true;
    bst.ang = Math.atan2(bst.portalY - bst.y, bst.portalX - bst.x);
    this.relay(owner, 'myth-beast-recall');
    this.fx(owner).ring(bst.x, bst.y, 10, 60, 420, MYTH.haze, 2.5, 10);
    this.text(owner, bst.x, bst.y - 50, 'COME HOME', MYTH.haze);
    Sfx.playAt('roar', bst.x, { rate: 0.75, volume: 0.9 });
  }

  // ── Q — Final Destiny ──────────────────────────────────────────────────────

  doDestiny(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-destiny'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-destiny'); return; }
    s.destinyLive = true;
    s.destinyUntil = this.now + DESTINY_MS;
    s.yaw = Math.atan2(ty - f.y, tx - f.x);
    s.gun = 'pistol';
    s.gunRecoil = 0;
    s.bob = 0;
    s.hurt = 0;
    s.lastRawTaken = f.rawDamageTaken;
    // The beast, the window and the blade all step aside: five guns are the whole kit now.
    s.truthWindowUntil = 0;
    const av = this.avatar(owner);
    av?.setGun('pistol');
    av?.setHold('brace');
    av?.setBlade(false);
    this.fx(owner).ring(f.x, f.y, 10, 70, 600, MYTH.gold, 3, 10);
    this.fx(owner).starSpray(f.x, f.y, 14, 60, 700, 10);
    Sfx.playAt('reload', f.x, { rate: 0.9, volume: 1 });
    if (owner === 'player') {
      this.ensureView().show();
      this.relabelBars(true);
      this.text(owner, f.x, f.y - 50, 'FINAL DESTINY', MYTH.gold);
    }
  }

  private endDestiny(owner: Owner): void {
    const s = this.side(owner);
    if (!s.destinyLive) return;
    s.destinyLive = false;
    const av = this.avatar(owner);
    av?.setGun(null);
    av?.setHold(null);
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).ring(f.x, f.y, 10, 50, 500, MYTH.haze, 2.5, 10);
      Sfx.playAt('reload', f.x, { rate: 1.2, volume: 0.6 });
    }
    if (owner === 'player') {
      this.view?.hide();
      this.relabelBars(false);
    }
  }

  private gunReady(owner: Owner, kind: GunKind, abilityId: string): Fighter | null {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) { this.refund(f, abilityId); return null; }
    if (!s.destinyLive) { this.deny(owner, abilityId, 'ONLY IN FINAL DESTINY'); return null; }
    s.gun = kind;
    s.gunRecoil = 1;
    this.avatar(owner)?.setGun(kind);
    this.avatar(owner)?.recoil();
    return f;
  }

  private aimOf(owner: Owner, f: Fighter, tx: number, ty: number): number {
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    return Math.atan2(ty - f.y, tx - f.x);
  }

  doPistol(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'pistol', 'myth-pistol');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const b: Bullet = {
      owner, x: f.x + Math.cos(ang) * 22, y: f.y + Math.sin(ang) * 22,
      vx: Math.cos(ang) * PISTOL_SPEED, vy: Math.sin(ang) * PISTOL_SPEED, born: this.now, reg: null,
    };
    const reg: RegisteredProjectile = {
      owner, getX: () => b.x, getY: () => b.y, damage: PISTOL_DAMAGE,
      steal: () => { const i = this.bullets.indexOf(b); if (i >= 0) this.bullets.splice(i, 1); },
    };
    b.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.bullets.push(b);
    this.fx(owner).muzzle(f.x, f.y, ang, 8);
  }

  doShotgun(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'shotgun', 'myth-shotgun');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const totals = new Map<Fighter, number>();
    const fx = this.fx(owner);
    for (let i = 0; i < SHOT_PELLETS; i++) {
      const a = ang + (i / (SHOT_PELLETS - 1) - 0.5) * 2 * SHOT_HALF;
      const x1 = f.x + Math.cos(a) * SHOT_RANGE;
      const y1 = f.y + Math.sin(a) * SHOT_RANGE;
      let best: Fighter | null = null;
      let bestK = 2;
      for (const t of this.foes(owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        const { d, k } = segDist(t.x, t.y, f.x, f.y, x1, y1);
        if (d <= SHOT_RAY_W + r && k < bestK) { best = t; bestK = k; }
      }
      const ex = best ? f.x + (x1 - f.x) * bestK : x1;
      const ey = best ? f.y + (y1 - f.y) * bestK : y1;
      fx.tracer(f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20, ex, ey);
      if (best) totals.set(best, (totals.get(best) ?? 0) + SHOT_DAMAGE * (1 + 2 * this.vulnOf(best)));
    }
    for (const [t, dmg] of totals) {
      this.hit(owner, t, dmg);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.star));
      if (this.vulnOf(t) > 0) this.text(owner, t.x, t.y - 44, `VULNERABLE ×${(1 + 2 * this.vulnOf(t)).toFixed(2)}`, MYTH.red);
    }
    fx.muzzle(f.x, f.y, ang, 16);
    this.shake(120, 0.004);
    Sfx.playAt('shotgun', f.x, { volume: 1 });
  }

  doGrenades(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'launcher', 'myth-grenades');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const s = this.side(owner);
    s.salvo += 1;
    const b = this.api.bounds;
    for (let i = 0; i < GREN_COUNT; i++) {
      const a = ang + (i - (GREN_COUNT - 1) / 2) * GREN_HALF;
      const lx = Phaser.Math.Clamp(f.x + Math.cos(a) * GREN_RANGE, b.x + 10, b.right - 10);
      const ly = Phaser.Math.Clamp(f.y + Math.sin(a) * GREN_RANGE, b.y + 10, b.bottom - 10);
      this.grenades.push({ owner, x0: f.x, y0: f.y, tx: lx, ty: ly, start: this.now + i * 60, until: this.now + i * 60 + GREN_FLIGHT_MS, salvo: s.salvo });
    }
    this.fx(owner).muzzle(f.x, f.y, ang, 10);
    Sfx.playAt('grenade-throw', f.x, { volume: 0.9 });
  }

  doRifle(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'rifle', 'myth-rifle');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const x1 = f.x + Math.cos(ang) * RIFLE_RANGE;
    const y1 = f.y + Math.sin(ang) * RIFLE_RANGE;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const { d } = segDist(t.x, t.y, f.x, f.y, x1, y1);
      if (d > RIFLE_HALF_W + r) continue;
      const head = d <= HEADSHOT_R;
      this.hit(owner, t, head ? RIFLE_DAMAGE * HEADSHOT_MULT : RIFLE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(head ? MYTH.gold : MYTH.star));
      if (head) { this.fx(owner).headshot(t.x, t.y); this.text(owner, t.x, t.y - 46, 'HEADSHOT', MYTH.gold); }
    }
    this.fx(owner).tracer(f.x + Math.cos(ang) * 24, f.y + Math.sin(ang) * 24, x1, y1);
    this.fx(owner).muzzle(f.x, f.y, ang, 12);
    this.shake(100, 0.003);
    Sfx.playAt('air-snipe', f.x, { rate: 0.8, volume: 1 });
  }

  doRocket(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'rocket', 'myth-rocket');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const r: Rocket = {
      owner, x: f.x + Math.cos(ang) * 26, y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * ROCKET_SPEED, vy: Math.sin(ang) * ROCKET_SPEED, reg: null, seed: Math.random() * 999,
    };
    const reg: RegisteredProjectile = {
      owner, getX: () => r.x, getY: () => r.y, damage: ROCKET_DAMAGE,
      steal: () => { const i = this.rockets.indexOf(r); if (i >= 0) this.rockets.splice(i, 1); },
    };
    r.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.rockets.push(r);
    this.fx(owner).muzzle(f.x, f.y, ang, 18);
    this.shake(160, 0.004);
    Sfx.playAt('mortar-launch', f.x, { rate: 0.7, volume: 1 });
  }

  // ── Online replay ──────────────────────────────────────────────────────────

  /** The opponent pressed one of the shard recasts; the replica follows. */
  replayNet(id: string, tx: number, ty: number): void {
    // The replica's shards are its own tally and may lag; a relayed press is the truth.
    const s = this.sides.npc;
    if (s.shards <= 0) s.shards = 1;
    switch (id) {
      case 'myth-whip-plus': this.doWhipPlus('npc'); break;
      case 'myth-truth-plus': s.truthWindowUntil = Math.max(s.truthWindowUntil, this.now + 1); this.doTruthPlus('npc', tx, ty); break;
      case 'myth-determination-plus': this.doDeterminationPlus('npc'); break;
      case 'myth-beast-recall': this.doBeastRecall('npc'); break;
      default: break;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.is('player');
    const npcIs = this.is('npc');
    if (!playerIs && !npcIs && !this.hasLiveState()) return;
    this.vizT += delta / 1000;
    this.matchT += delta;
    this.ensureLayers();

    this.updateCrowd(delta);
    this.updateWhips();
    this.updateMaces(delta);
    this.updateDashes(delta);
    this.updateDetermination();
    this.updateBeasts(delta);
    this.updateFlips();
    this.updateStuns();
    this.updateBullets(delta);
    this.updateGrenades();
    this.updateRockets(delta);
    this.updateClouds();
    this.updateDestiny(delta);
    this.updateBotRecasts();
    this.updateAvatars(delta, playerIs, npcIs);
    this.updateBanter(delta, playerIs, npcIs);

    this.paintCrowd();
    this.paintGround();
    this.paintAir();
    this.paintHeads(playerIs, npcIs);
    this.paintView(delta);
    this.pushStatuses(playerIs);
  }

  private hasLiveState(): boolean {
    return this.maces.length > 0 || this.beasts.length > 0 || this.bullets.length > 0 || this.grenades.length > 0
      || this.rockets.length > 0 || this.clouds.length > 0 || this.bubble !== null
      || BOTH.some((o) => this.sides[o].detLive || this.sides[o].destinyLive || this.sides[o].stunHeld.size > 0);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // The crowd sits on the border under everything; fighters are depth 5; beasts and maces
    // ride just over them; shards and bubbles over the heads.
    if (!this.crowdGfx) this.crowdGfx = scene.add.graphics().setDepth(2);
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.headGfx) this.headGfx = scene.add.graphics().setDepth(12);
  }

  private ensureView(): MythView {
    if (!this.view) this.view = new MythView(this.api.scene, this.pcol, this.api.width, this.api.height);
    return this.view;
  }

  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  // ── The crowd ──────────────────────────────────────────────────────────────

  private updateCrowd(delta: number): void {
    void delta;
    const now = this.now;
    for (const owner of BOTH) {
      if (!this.is(owner)) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f || !f.active) continue;
      // Damage taken, read off the fighter's raw tally (pre-mitigation, like "aimed at you").
      if (Number.isNaN(s.lastRawTaken)) s.lastRawTaken = f.rawDamageTaken;
      const dTaken = f.rawDamageTaken - s.lastRawTaken;
      s.lastRawTaken = f.rawDamageTaken;
      if (dTaken > 0) { s.taken.push({ at: now, amount: dTaken }); s.hurt = 1; }
      s.dealt = s.dealt.filter((t) => now - t.at <= CROWD_WINDOW_MS);
      s.taken = s.taken.filter((t) => now - t.at <= CROWD_WINDOW_MS);
      const dealt = s.dealt.reduce((a, t) => a + t.amount, 0);
      const taken = s.taken.reduce((a, t) => a + t.amount, 0);
      if (dealt >= CHEER_DEALT && now >= s.cheerSleepUntil) {
        s.dealt = [];
        s.cheerSleepUntil = now + CHEER_SLEEP_MS;
        this.cheerUntil = now + CHEER_MS;
        if (s.shards < SHARD_MAX) {
          s.shards += 1;
          if (this.alive(f)) {
            this.fx(owner).shardGain(f.x, f.y);
            this.text(owner, f.x, f.y - 62, 'ECHO SHARD', MYTH.shard);
          }
        } else {
          this.text(owner, f.x, f.y - 62, 'SHARDS FULL', MYTH.shard);
        }
        Sfx.playAt('reward-big', f.x, { rate: 1.2, volume: owner === 'player' ? 0.7 : 0.4 });
      }
      if (taken >= BOO_TAKEN && now >= s.booSleepUntil) {
        s.taken = [];
        s.booSleepUntil = now + BOO_SLEEP_MS;
        this.booUntil = now + BOO_MS;
        f.mythJeeredUntil = Date.now() + JEER_MS;
        this.text(owner, f.x, f.y - 62, 'JEERED', MYTH.red);
        Sfx.playAt('status-debuff', f.x, { rate: 0.7, volume: 0.7 });
      }
    }
  }

  private ensureSpectators(): void {
    if (this.spectators.length > 0) return;
    const b = this.api.bounds;
    const W = this.api.width;
    const H = this.api.height;
    const seat = (x: number, y: number, i: number, s: number): void => {
      this.spectators.push({ x, y, s, seed: i, lit: jitter(17, i) > 0.55 });
    };
    let i = 0;
    // Two rows a side: an inner row of bigger figures and an outer row of smaller ones peering over.
    for (let x = b.x + 10; x < b.right - 6; x += 21) { seat(x + jitter(1, i) * 4, b.y - 9, i++, 7); seat(x + 10, b.y - 20, i++, 5.5); }
    for (let x = b.x + 10; x < b.right - 6; x += 21) { seat(x + jitter(2, i) * 4, b.bottom + 16, i++, 7); seat(x + 10, b.bottom + 26, i++, 5.5); }
    for (let y = b.y + 12; y < b.bottom - 8; y += 21) { seat(b.x - 12, y + jitter(3, i) * 4, i++, 6.5); seat(b.x - 24, y + 10, i++, 5); }
    for (let y = b.y + 12; y < b.bottom - 8; y += 21) { seat(b.right + 12, y + jitter(4, i) * 4, i++, 6.5); seat(b.right + 24, y + 10, i++, 5); }
    void W; void H;
  }

  private paintCrowd(): void {
    const g = this.crowdGfx;
    if (!g) return;
    g.clear();
    if (!this.is('player') && !this.is('npc')) return;
    this.ensureSpectators();
    const cheer = this.now < this.cheerUntil;
    const boo = this.now < this.booUntil;
    const t = this.vizT;
    for (const sp of this.spectators) {
      const j = jitter(23, sp.seed);
      let bounce = 0.08 + 0.06 * Math.sin(t * 1.3 + j * 6);
      let arms = 0;
      let x = sp.x;
      let color = sp.lit ? MYTH.crowdLit : MYTH.crowdDark;
      let lit = 0;
      if (cheer) {
        bounce = Math.max(0, Math.sin(t * 9 + j * 6.28)) * 1;
        arms = 1;
        lit = 0.5 + 0.5 * Math.sin(t * 12 + j * 9);
      } else if (boo) {
        x += Math.sin(t * 18 + j * 6) * 1.6;
        color = 0x4a1c2a;
        arms = 0.15;
      }
      crowdFigure(g, x, sp.y, sp.s, color, lit, bounce, arms, 0.95);
    }
    if (cheer) {
      // Confetti of stars thrown over the edge.
      for (let i = 0; i < 14; i++) {
        const k = (t * 0.9 + jitter(29, i)) % 1;
        const b = this.api.bounds;
        const side = i % 4;
        const u = jitter(31, i);
        const x = side < 2 ? b.x + u * b.width : (side === 2 ? b.x + 20 + k * 40 : b.right - 20 - k * 40);
        const y = side === 0 ? b.y + 10 + k * 50 : side === 1 ? b.bottom - 10 - k * 50 : b.y + u * b.height;
        star(g, x, y, 2.6, i % 3 === 0 ? MYTH.shard : MYTH.star, 1 - k, { points: 4, rot: k * 6 });
      }
    }
  }

  // ── Whip, maces ────────────────────────────────────────────────────────────

  private updateWhips(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.whip && this.now - s.whip.start > WHIP_ANIM_MS) s.whip = null;
    }
  }

  private updateMaces(delta: number): void {
    void delta;
    for (let i = this.maces.length - 1; i >= 0; i--) {
      const m = this.maces[i];
      if (this.now >= m.until) { this.maces.splice(i, 1); continue; }
      const age = (this.now - m.born) / 1000;
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      for (const t of this.foes(m.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - mx, t.y - my) > 11 + r) continue;
        if (this.now < (m.hitAt.get(t) ?? 0)) continue;
        m.hitAt.set(t, this.now + MACE_GATE_MS);
        this.hit(m.owner, t, MACE_DAMAGE);
        this.fx(m.owner).graze(t.x, t.y);
      }
    }
  }

  // ── Truth Breaker's dash ───────────────────────────────────────────────────

  private updateDashes(delta: number): void {
    void delta;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.dashUntil <= 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.dashUntil) {
        if (s.dashUntil > 0 && f && f.active) {
          this.fx(owner).dashTrail(s.dashX0, s.dashY0, f.x, f.y);
          this.body(f).setVelocity(0, 0);
          const av = this.avatar(owner);
          av?.setBlade(false);
          av?.setEye(this.masteryOn(owner));
        }
        s.dashUntil = 0;
        continue;
      }
      if (this.isReplica(owner)) {
        // The replica's own position comes down the wire; its dash is a drawing, not a move.
      } else if (this.now < f.highGravityUntil) {
        s.dashUntil = 0;
        continue;
      } else {
        this.body(f).setVelocity(s.dashVx, s.dashVy);
      }
      for (const t of this.foes(owner)) {
        if (s.dashHit.has(t)) continue;
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - f.x, t.y - f.y) > TRUTH_DASH_HIT_R + r) continue;
        s.dashHit.add(t);
        this.hit(owner, t, TRUTH_DASH_DAMAGE, { trueDamage: true });
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.gold));
        this.fx(owner).slash(t.x, t.y, Math.atan2(s.dashVy, s.dashVx), 60, Math.PI / 3, 10);
        this.text(owner, t.x, t.y - 44, 'TRUE', MYTH.gold);
        Sfx.playAt('slash', t.x, { rate: 1.1, volume: 0.8 });
      }
    }
  }

  // ── Determination ──────────────────────────────────────────────────────────

  private updateDetermination(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.detLive) continue;
      const f = this.fighter(owner);
      if (!f || !f.active) { s.detLive = false; continue; }
      if (this.now >= s.detInvulnUntil && f.isInvincible && !s.detHadInvincible) f.isInvincible = false;
      if (this.now >= s.detImmuneUntil) this.endDetermination(owner);
    }
  }

  // ── The beast ──────────────────────────────────────────────────────────────

  private updateBeasts(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const bst = this.beasts[i];
      if (bst.doneAt > 0) {
        if (this.now - bst.doneAt >= BEAST_FADE_MS) this.beasts.splice(i, 1);
        continue;
      }
      const owner = bst.owner;
      const f = this.fighter(owner);
      if (!f || !f.active) { this.finishBeast(bst); continue; }
      if (!bst.moving) {
        if (this.now - bst.born >= BEAST_DELAY_MS) {
          bst.moving = true;
          Sfx.playAt('roar', bst.x, { rate: 0.9, volume: 0.9 });
        }
        continue;
      }
      const vx = Math.cos(bst.ang) * BEAST_SPEED;
      const vy = Math.sin(bst.ang) * BEAST_SPEED;
      bst.x += vx * dt;
      bst.y += vy * dt;
      const last = bst.trail[0];
      if (!last || Math.hypot(last.x - bst.x, last.y - bst.y) >= BEAST_SEG_GAP) {
        bst.trail.unshift({ x: bst.x, y: bst.y });
        if (bst.trail.length > BEAST_SEGMENTS + 2) bst.trail.pop();
      }
      // The catch: anyone the head reaches is held in front of it and chewed every half second.
      for (const t of this.foes(owner)) {
        if (bst.grabbed.has(t)) continue;
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - bst.x, t.y - bst.y) > BEAST_GRAB_R + r) continue;
        if (t.knockbackImmune || t.unstoppable) continue;
        bst.grabbed.set(t, this.now + BEAST_TICK_MS);
        this.fx(owner).starSpray(t.x, t.y, 8, 30, 400, 10, MYTH.red);
        this.text(owner, t.x, t.y - 44, 'CAUGHT', MYTH.red);
        Sfx.playAt('claw', t.x, { volume: 0.8 });
      }
      for (const [t, tickAt] of bst.grabbed) {
        if (!this.alive(t) || t.unstoppable) { bst.grabbed.delete(t); continue; }
        if (!(this.isReplica(owner) && t === this.api.player)) {
          const vb = this.body(t);
          vb.reset(bst.x + Math.cos(bst.ang) * 26, bst.y + Math.sin(bst.ang) * 26);
          vb.setVelocity(vx, vy);
        }
        if (this.now >= tickAt) {
          bst.grabbed.set(t, this.now + BEAST_TICK_MS);
          this.hit(owner, t, BEAST_TICK_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.red));
        }
      }
      // The flip: the beast runs through its own master, who vaults it for a burst of speed.
      const s = this.side(owner);
      if (this.alive(f) && this.now >= s.flipGateUntil && Math.hypot(f.x - bst.x, f.y - bst.y) <= BEAST_GRAB_R + 8) {
        s.flipGateUntil = this.now + FLIP_GATE_MS;
        s.flipUntil = this.now + FLIP_MS;
        s.flipSpeedUntil = this.now + FLIP_SPEED_MS;
        this.avatar(owner)?.flip(FLIP_MS);
        this.fx(owner).flip(f.x, f.y);
        this.text(owner, f.x, f.y - 56, 'FLIP  +20% SPEED', MYTH.starBlue);
        Sfx.playAt('jump', f.x, { rate: 1.1, volume: 0.8 });
      }
      // Home, or a wall.
      if (bst.returning) {
        if (Math.hypot(bst.x - bst.portalX, bst.y - bst.portalY) <= 18) {
          this.finishBeast(bst);
          this.fx(owner).ring(bst.portalX, bst.portalY, 50, 6, 400, MYTH.iris, 3, 9);
        }
      } else if (bst.x <= b.x + BEAST_HEAD_R * 0.6 || bst.x >= b.right - BEAST_HEAD_R * 0.6 || bst.y <= b.y + BEAST_HEAD_R * 0.6 || bst.y >= b.bottom - BEAST_HEAD_R * 0.6) {
        this.finishBeast(bst);
        this.fx(owner).explosion(bst.x, bst.y, 60, 9);
        this.shake(200, 0.004);
      }
    }
  }

  private finishBeast(bst: Beast): void {
    if (bst.doneAt > 0) return;
    bst.doneAt = this.now;
    for (const t of bst.grabbed.keys()) {
      if (this.alive(t) && !(this.isReplica(bst.owner) && t === this.api.player)) this.body(t).setVelocity(0, 0);
    }
    bst.grabbed.clear();
    Sfx.playAt('ghost-wail', bst.x, { rate: 0.8, volume: 0.6 });
  }

  private updateFlips(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.flipUntil > 0 && this.now >= s.flipUntil) s.flipUntil = 0;
    }
  }

  /** Bodies this kit stunned stay put until the clock runs out (after movement, so it wins). */
  private updateStuns(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      for (const [t, until] of s.stunHeld) {
        if (!this.alive(t) || this.now >= until || t.unstoppable) { s.stunHeld.delete(t); continue; }
        this.body(t).setVelocity(0, 0);
      }
    }
  }

  // ── Guns ───────────────────────────────────────────────────────────────────

  private offArena(x: number, y: number): boolean {
    const b = this.api.bounds;
    return x < b.x || x > b.right || y < b.y || y > b.bottom;
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bl = this.bullets[i];
      bl.x += bl.vx * dt;
      bl.y += bl.vy * dt;
      let gone = this.now - bl.born > PISTOL_LIFE_MS || this.offArena(bl.x, bl.y);
      if (!gone) {
        for (const t of this.foes(bl.owner)) {
          const r = FIGHTER_R * (t.sizeMult || 1);
          if (Math.hypot(t.x - bl.x, t.y - bl.y) > PISTOL_HIT_R + r - 8) continue;
          this.hit(bl.owner, t, PISTOL_DAMAGE);
          if (!(t.unstoppable)) {
            const live = Date.now() < t.mythVulnUntil ? t.mythVulnStacks : 0;
            t.mythVulnStacks = Math.min(VULN_MAX, live + 1);
            t.mythVulnUntil = Date.now() + VULN_MS;
          }
          this.api.spawnHitFlash(t.x, t.y, this.col(bl.owner)(MYTH.star));
          this.fx(bl.owner).graze(bl.x, bl.y);
          gone = true;
          break;
        }
      }
      if (gone) {
        if (bl.reg) this.api.projectileRegistry.remove(bl.reg);
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateGrenades(): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      if (this.now < gr.until) continue;
      this.grenades.splice(i, 1);
      this.fx(gr.owner).explosion(gr.tx, gr.ty, GREN_R, 9);
      this.shake(90, 0.003);
      Sfx.playAt('explosion-small', gr.tx, { volume: 0.8 });
      for (const t of this.foes(gr.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - gr.tx, t.y - gr.ty) > GREN_R + r) continue;
        // The salvo counts its hits on each body: the second and third grenades hit harder.
        const key = `myth-salvo-${gr.salvo}`;
        const hits = (t.getData(key) as number | undefined) ?? 0;
        t.setData(key, hits + 1);
        const mult = GREN_STACK[Math.min(GREN_STACK.length - 1, hits)];
        this.hit(gr.owner, t, GREN_DAMAGE * mult, { aoe: true });
        if (hits > 0) this.text(gr.owner, t.x, t.y - 44, `×${mult.toFixed(2)}`, MYTH.gold);
      }
    }
  }

  private updateRockets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      let direct: Fighter | null = null;
      for (const t of this.foes(r.owner)) {
        const rr = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - r.x, t.y - r.y) <= ROCKET_HIT_R + rr - 6) { direct = t; break; }
      }
      const b = this.api.bounds;
      const wall = r.x < b.x + 6 || r.x > b.right - 6 || r.y < b.y + 6 || r.y > b.bottom - 6;
      if (!direct && !wall) continue;
      if (r.reg) this.api.projectileRegistry.remove(r.reg);
      this.rockets.splice(i, 1);
      const x = Phaser.Math.Clamp(r.x, b.x + 6, b.right - 6);
      const y = Phaser.Math.Clamp(r.y, b.y + 6, b.bottom - 6);
      this.fx(r.owner).explosion(x, y, ROCKET_R, 10);
      this.shake(320, 0.008);
      Sfx.playAt('explosion-large', x, { volume: 1 });
      for (const t of this.foes(r.owner)) {
        const rr = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - x, t.y - y) > ROCKET_R + rr) continue;
        const dmg = ROCKET_DAMAGE + (t === direct ? ROCKET_DIRECT : 0);
        this.hit(r.owner, t, dmg, { aoe: true });
        if (t === direct) this.text(r.owner, t.x, t.y - 48, 'DIRECT HIT', MYTH.gold);
      }
      this.clouds.push({ owner: r.owner, x, y, until: this.now + CLOUD_MS, nextTickAt: this.now + CLOUD_TICK_MS, seed: Math.random() * 999 });
    }
  }

  private updateClouds(): void {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      if (this.now >= c.until) { this.clouds.splice(i, 1); continue; }
      if (this.now < c.nextTickAt) continue;
      c.nextTickAt = this.now + CLOUD_TICK_MS;
      for (const t of this.foes(c.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - c.x, t.y - c.y) > CLOUD_R + r * 0.5) continue;
        if (t.airborne) continue;
        this.hit(c.owner, t, CLOUD_TICK_DAMAGE, { aoe: true });
      }
    }
  }

  // ── Final Destiny ──────────────────────────────────────────────────────────

  private updateDestiny(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.destinyLive) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.destinyUntil) { this.endDestiny(owner); continue; }
      s.gunRecoil = Math.max(0, s.gunRecoil - dt * 6);
      s.hurt = Math.max(0, s.hurt - dt * 2.5);
      if (owner === 'player') {
        // The turn: the cursor's distance from the centre of the screen is a turn rate,
        // cubed so the middle of the screen is still, and the edge is a real swing.
        const k = this.cursorK();
        s.yaw += Math.pow(k, 3) * TURN_RATE * dt;
        const v = this.body(f).velocity;
        const moving = Math.hypot(v.x, v.y) > 20;
        s.bob += dt * (moving ? 9 : 2.5);
      } else {
        // The bot looks straight at whoever it is shooting.
        const t = this.foes(owner)[0];
        if (t) s.yaw = Math.atan2(t.y - f.y, t.x - f.x);
      }
    }
  }

  /** The cursor, as `handleInput` last saw it (world == screen in the arena). */
  private lastMouseX = 0;
  private lastMouseY = 0;

  /** The cursor's screen offset, −1 at the left edge to +1 at the right. */
  private cursorK(): number {
    const W = this.api.width;
    return Phaser.Math.Clamp((this.lastMouseX - W / 2) / (W / 2), -1, 1);
  }

  private relabelBars(fps: boolean): void {
    const bars = this.api.abilityBars;
    if (fps) {
      const guns: [string, string][] = [
        ['Click  Pistol', '8 damage, stacks 5% vulnerability'],
        ['E  Shotgun', '7 × 6 close; doubles vulnerability'],
        ['R  Grenade Barrage', '3 × 14 in a cone, stack ×1.25 / ×1.5'],
        ['F  Hunter Rifle', '26 piercing; centre hit = 39'],
        ['Q  Shadow Rocket', '30 in 150px, +20 direct, cloud 5/s'],
      ];
      bars.forEach((bar, i) => {
        if (i >= guns.length) return;
        bar.lbl?.setText(guns[i][0]);
        bar.desc?.setText(guns[i][1]);
      });
      return;
    }
    const abs = this.api.playerAbilities;
    bars.forEach((bar, i) => {
      if (i >= abs.length || i >= 5) return;
      const ab = abs[i];
      bar.lbl?.setText(`${ab.displayKey}  ${ab.name}`);
      bar.desc?.setText(ab.description);
    });
  }

  private paintView(delta: number): void {
    const s = this.sides.player;
    if (!this.view || !this.view.isOpen()) return;
    const p = this.api.player;
    if (!s.destinyLive || !this.alive(p)) { this.view.hide(); return; }
    const entities: ViewEntity[] = [];
    const seen = new Set<Fighter>();
    const bodies = [this.api.npc, ...this.api.enemies];
    for (const f of bodies) {
      if (!f || seen.has(f) || f === p || !this.alive(f)) continue;
      seen.add(f);
      const size = 48 * (f.sizeMult || 1);
      entities.push({
        kind: 'sprite', x: f.x, y: f.y, texture: f.texture.key, height: size, width: size,
        hpRatio: f.hp / Math.max(1, f.maxHp), alpha: Math.max(0.35, f.alpha), label: f.element?.name,
      });
    }
    // Everyone's shots in the shared group.
    const group = this.api.projectiles;
    for (const child of group.getChildren()) {
      const pr = child as Phaser.Physics.Arcade.Image;
      if (!pr.active) continue;
      entities.push({ kind: 'sprite', x: pr.x, y: pr.y, texture: pr.texture.key, height: Math.max(10, pr.displayHeight), width: Math.max(10, pr.displayWidth) });
    }
    const tint = this.pcol;
    const t = this.vizT;
    for (const bl of this.bullets) {
      entities.push({ kind: 'draw', x: bl.x, y: bl.y, height: 8, draw: (g, sx, sy, sc) => star(g, sx, sy - 30 * sc, Math.max(2, 4 * sc), tint(MYTH.star), 1, { points: 4, rot: t * 9 }) });
    }
    for (const r of this.rockets) {
      entities.push({ kind: 'draw', x: r.x, y: r.y, height: 20, draw: (g, sx, sy, sc) => {
        voidDisc(g, tint, sx, sy - 26 * sc, Math.max(4, 11 * sc), 1, r.seed, t, 5);
        star(g, sx, sy - 26 * sc, Math.max(3, 6 * sc), tint(MYTH.red), 0.9, { points: 4, rot: t * 6 });
      } });
    }
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      const gx = gr.x0 + (gr.tx - gr.x0) * k;
      const gy = gr.y0 + (gr.ty - gr.y0) * k;
      const lift = Math.sin(k * Math.PI) * 60;
      entities.push({ kind: 'draw', x: gx, y: gy, height: 10, draw: (g, sx, sy, sc) => voidDisc(g, tint, sx, sy - lift * sc, Math.max(3, 6 * sc), 1, gr.salvo, t, 3) });
    }
    for (const c of this.clouds) {
      entities.push({ kind: 'draw', x: c.x, y: c.y, height: 60, draw: (g, sx, sy, sc) => paintCloud(g, tint, sx, sy - 30 * sc, Math.max(10, CLOUD_R * 0.55 * sc), t, c.seed, 0.55 * Phaser.Math.Clamp((c.until - this.now) / 800, 0, 1)) });
    }
    for (const m of this.maces) {
      const age = (this.now - m.born) / 1000;
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      entities.push({ kind: 'draw', x: mx, y: my, height: 20, draw: (g, sx, sy, sc) => starMace(g, tint, sx, sy - 20 * sc, Math.max(3, 9 * sc), 1, m.seed, age * 4) });
    }
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      entities.push({ kind: 'draw', x: bst.portalX, y: bst.portalY, height: 60, draw: (g, sx, sy, sc) => paintPortal(g, tint, sx, sy - 30 * sc, Math.PI / 2, Math.min(1, (this.now - bst.born) / 300) * fade, t, bst.seed, fade) });
      const pts = [{ x: bst.x, y: bst.y }, ...bst.trail].slice(0, BEAST_SEGMENTS);
      pts.forEach((pt, i) => {
        const r = i === 0 ? BEAST_HEAD_R : BEAST_HEAD_R * (0.35 + 0.55 * (1 - i / pts.length));
        entities.push({ kind: 'draw', x: pt.x, y: pt.y, height: r * 2, draw: (g, sx, sy, sc) => {
          voidDisc(g, tint, sx, sy - r * sc, Math.max(4, r * sc), fade, bst.seed + i, t, i === 0 ? 7 : 3);
          if (i === 0) {
            for (const side of [-1, 1]) star(g, sx + side * r * 0.45 * sc, sy - r * 1.15 * sc, Math.max(2, 5 * sc), tint(MYTH.gold), fade, { points: 4, rot: t });
          }
        } });
      });
    }
    this.view.render(delta, {
      x: p.x, y: p.y, yaw: s.yaw, bob: s.bob, bounds: this.api.bounds,
    }, entities, {
      gun: s.gun, recoil: s.gunRecoil, mouseX: this.lastMouseX, mouseY: this.lastMouseY,
      secondsLeft: Math.max(0, (s.destinyUntil - this.now) / 1000),
      crowdBounce: this.now < this.cheerUntil ? 1 : 0, crowdArms: this.now < this.cheerUntil ? 1 : 0, hurt: s.hurt,
    });
  }

  // ── Bot recasts ────────────────────────────────────────────────────────────

  /**
   * The bot spends its own shards. A recast is a press that never touches a cooldown, so it
   * never reaches `castAbility` and the AI routine cannot make it; the kit decides here, off
   * the same opportunities it publishes to the routine, on a human-ish beat.
   */
  private updateBotRecasts(): void {
    if (!this.is('npc') || this.api.isOnline) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f) || s.shards <= 0 || this.now < s.nextRecastAt) return;
    const t = this.foes('npc')[0];
    if (!t) return;
    const dist = Math.hypot(t.x - f.x, t.y - f.y);
    const decide = (): boolean => {
      // The dash: the window is open and they are inside its reach — a true-damage 32.
      if (this.now < s.truthWindowUntil && dist < TRUTH_DASH + 40 && s.dashUntil <= 0) { this.doTruthPlus('npc', t.x, t.y); return true; }
      // The recall: the beast has them and is carrying them away from the bot.
      const bst = this.beastOf('npc');
      if (bst && !bst.returning && bst.grabbed.size > 0 && Math.hypot(bst.x - f.x, bst.y - f.y) > 200) { this.doBeastRecall('npc'); return true; }
      // The longer immunity: hurt, with two shards to spare for it.
      if (s.detLive && !s.detPlus && (f.hp / f.maxHp < 0.5 || s.shards >= 2)) { this.doDeterminationPlus('npc'); return true; }
      // The maces: in whip range with a spare shard.
      if (this.now >= s.whipPlusUntil && dist < WHIP_LEN + 60 && s.shards >= 2 && !s.destinyLive) { this.doWhipPlus('npc'); return true; }
      return false;
    };
    if (decide()) s.nextRecastAt = this.now + 420;
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new MythAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
        av.setEye(this.masteryOn(owner));
      }
      const s = this.side(owner);
      const aim = owner === 'player' ? { x: s.aimX, y: s.aimY } : (this.foes(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(s.destinyLive && owner === 'player' ? s.yaw : Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setMastered(this.masteryOn(owner));
      const lift = av.flipLift();
      av.update(delta, f.x, f.y - lift, f.alpha);
    }
  }

  // ── Banter ─────────────────────────────────────────────────────────────────

  private banterSpeaker(who: 'myth' | 'foe', playerIs: boolean): Fighter | null {
    const mythOwner: Owner = playerIs ? 'player' : 'npc';
    const foeOwner: Owner = playerIs ? 'npc' : 'player';
    const f = this.fighter(who === 'myth' ? mythOwner : foeOwner);
    return f && f.active ? f : null;
  }

  private updateBanter(delta: number, playerIs: boolean, npcIs: boolean): void {
    void delta;
    if (!playerIs && !npcIs) return;
    if (this.api.isInvasion) return;
    const p = this.api.player;
    const n = this.api.npc;
    if (!p || !n || !p.active || !n.active) return;
    if (!this.banter) {
      const foeId = playerIs ? this.api.npcElementId : this.api.elementId;
      this.banter = banterFor(playerIs && npcIs ? 'myth' : foeId);
    }
    // The three beats.
    const both = this.alive(p) && this.alive(n);
    const lowest = Math.min(p.hp / Math.max(1, p.maxHp), n.hp / Math.max(1, n.maxHp));
    if (this.banterStage === 0 && this.matchT > 2500 && both) { this.banterQueue = [...this.banter.opener]; this.banterStage = 1; this.banterNextAt = this.now; }
    else if (this.banterStage === 1 && this.banterQueue.length === 0 && !this.bubble && this.matchT > 14000 && lowest < 0.68 && both) { this.banterQueue = [...this.banter.mid]; this.banterStage = 2; this.banterNextAt = this.now; }
    else if (this.banterStage === 2 && this.banterQueue.length === 0 && !this.bubble && lowest < 0.3 && both) { this.banterQueue = [...this.banter.closer]; this.banterStage = 3; this.banterNextAt = this.now; }

    if (this.bubble && this.now >= this.bubble.until) { this.bubble = null; this.banterNextAt = this.now + 350; }
    if (!this.bubble && this.banterQueue.length > 0 && this.now >= this.banterNextAt) {
      const line = this.banterQueue.shift()!;
      const speaker = this.banterSpeaker(line.who, playerIs);
      if (!speaker || speaker.hp <= 0) { this.banterQueue = []; return; }
      this.bubble = { who: line.who, text: line.text, until: this.now + Math.min(4600, 1500 + line.text.length * 42) };
      Sfx.playAt('ui-type', speaker.x, { rate: line.who === 'myth' ? 0.8 : 1.1, volume: 0.35 });
    }
    this.paintBubble(playerIs);
  }

  private paintBubble(playerIs: boolean): void {
    const { scene } = this.api;
    if (!this.bubble) {
      this.bubbleGfx?.clear();
      this.bubbleText?.setVisible(false);
      return;
    }
    if (!this.bubbleGfx) this.bubbleGfx = scene.add.graphics().setDepth(19.92);
    if (!this.bubbleText) {
      this.bubbleText = scene.add.text(0, 0, '', {
        fontSize: '11px', fontFamily: FONT_UI, color: '#fff6d5', wordWrap: { width: 212 }, align: 'center',
      }).setOrigin(0.5).setDepth(19.93);
    }
    const speaker = this.banterSpeaker(this.bubble.who, playerIs);
    if (!speaker) return;
    const txt = this.bubbleText;
    txt.setText(this.bubble.text).setVisible(true);
    const w = Math.min(228, txt.width + 18);
    const h = txt.height + 14;
    const W = this.api.width;
    const H = this.api.height;
    let bx: number;
    let by: number;
    let tx: number;
    let ty: number;
    if (this.sides.player.destinyLive) {
      // In first person the heads are not where the screen says they are: pin the bubbles.
      const mine = this.bubble.who === (playerIs ? 'myth' : 'foe');
      bx = mine ? 150 : W - 150;
      by = mine ? H - 150 : 110;
      tx = mine ? 150 : W - 150;
      ty = mine ? H - 150 + h / 2 + 10 : 110 - h / 2 - 10;
    } else {
      bx = Phaser.Math.Clamp(speaker.x, w / 2 + 8, W - w / 2 - 8);
      by = Math.max(h / 2 + 40, speaker.y - 62 - h / 2);
      tx = speaker.x;
      ty = speaker.y - 34;
    }
    const isMyth = this.bubble.who === 'myth';
    const fill = isMyth ? MYTH.deep : 0x1a1a24;
    const stroke = isMyth ? MYTH.iris : 0xb9b9cc;
    const g = this.bubbleGfx;
    g.clear();
    paintBubble(g, bx, by, w, h, tx, ty, fill, stroke, 1);
    if (isMyth) pinpricks(g, this.pcol, bx, by, w / 2.4, 41, 5, this.vizT, 0.5);
    txt.setPosition(bx, by);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const c of this.clouds) {
      const a = Phaser.Math.Clamp((c.until - this.now) / 800, 0, 1) * 0.85;
      paintCloud(g, this.col(c.owner), c.x, c.y, CLOUD_R, t, c.seed, a);
    }
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      const open = Math.min(1, (this.now - bst.born) / 300) * (bst.doneAt > 0 ? fade : 1);
      paintPortal(g, this.col(bst.owner), bst.portalX, bst.portalY, bst.ang, open, t, bst.seed, fade);
    }
    // The grenades' landing marks.
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      g.lineStyle(1.5, this.col(gr.owner)(MYTH.red), 0.3 + 0.5 * k);
      g.strokeCircle(gr.tx, gr.ty, GREN_R * (0.4 + 0.6 * k));
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      const pts = [{ x: bst.x, y: bst.y }, ...bst.trail].slice(0, BEAST_SEGMENTS);
      if (!bst.moving) {
        // Still in the doorway: just the head, pushing out.
        const k = Math.min(1, (this.now - bst.born) / BEAST_DELAY_MS);
        paintBeast(g, this.col(bst.owner), [{ x: bst.portalX + Math.cos(bst.ang) * 20 * k, y: bst.portalY + Math.sin(bst.ang) * 20 * k }], bst.ang, t, k, bst.seed, BEAST_HEAD_R * (0.5 + 0.5 * k));
      } else {
        paintBeast(g, this.col(bst.owner), pts, bst.ang, t, fade, bst.seed);
      }
    }
    for (const m of this.maces) {
      const age = (this.now - m.born) / 1000;
      const life = Phaser.Math.Clamp((m.until - this.now) / 500, 0, 1);
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      g.lineStyle(1, this.col(m.owner)(MYTH.haze), 0.3 * life);
      g.strokeCircle(m.cx, m.cy, MACE_ORBIT_R);
      starMace(g, this.col(m.owner), mx, my, 9, life, m.seed, age * 4);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.whip) {
        const k = Phaser.Math.Clamp((this.now - s.whip.start) / WHIP_ANIM_MS, 0, 1);
        const f = this.fighter(owner);
        const ang = Math.atan2(s.whip.y1 - s.whip.y0, s.whip.x1 - s.whip.x0);
        const x0 = f && f.active ? f.x + Math.cos(ang) * 14 : s.whip.x0;
        const y0 = f && f.active ? f.y + Math.sin(ang) * 14 : s.whip.y0;
        paintWhip(g, this.col(owner), x0, y0, s.whip.x1, s.whip.y1, k, s.whip.seed, 1 - k * 0.4);
      }
      if (s.dashUntil > 0) {
        const f = this.fighter(owner);
        if (f && f.active) {
          g.lineStyle(6, this.col(owner)(MYTH.iris), 0.35);
          g.lineBetween(s.dashX0, s.dashY0, f.x, f.y);
          g.lineStyle(2, this.col(owner)(MYTH.star), 0.8);
          g.lineBetween(s.dashX0, s.dashY0, f.x, f.y);
        }
      }
    }
    for (const bl of this.bullets) {
      const a = Math.atan2(bl.vy, bl.vx);
      g.lineStyle(2, this.col(bl.owner)(MYTH.star), 0.9);
      g.lineBetween(bl.x - Math.cos(a) * 12, bl.y - Math.sin(a) * 12, bl.x, bl.y);
      star(g, bl.x, bl.y, 4, this.col(bl.owner)(MYTH.star), 1, { points: 4, rot: t * 9 });
    }
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      const gx = gr.x0 + (gr.tx - gr.x0) * k;
      const gy = gr.y0 + (gr.ty - gr.y0) * k - Math.sin(k * Math.PI) * 60;
      voidDisc(g, this.col(gr.owner), gx, gy, 6, 1, gr.salvo + k, t, 3);
    }
    for (const r of this.rockets) {
      const a = Math.atan2(r.vy, r.vx);
      // A fat void shell with a red star nose and a trail of stars behind it.
      for (let i = 1; i <= 4; i++) {
        const k = i / 4;
        star(g, r.x - Math.cos(a) * 16 * i, r.y - Math.sin(a) * 16 * i, 4 * (1 - k) + 1, this.col(r.owner)(MYTH.haze), 0.8 - k * 0.6, { points: 4, rot: t * 5 + i });
      }
      voidDisc(g, this.col(r.owner), r.x, r.y, 11, 1, r.seed, t, 5);
      star(g, r.x + Math.cos(a) * 10, r.y + Math.sin(a) * 10, 6, this.col(r.owner)(MYTH.red), 0.95, { points: 4, rot: a });
    }
  }

  /** Shards over the heads, and the open window's hint. */
  private paintHeads(playerIs: boolean, npcIs: boolean): void {
    const g = this.headGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      if (!is || !this.alive(f)) continue;
      const s = this.side(owner);
      const lift = this.avatar(owner)?.flipLift() ?? 0;
      const y = f.y - 46 - lift;
      if (s.shards > 0) {
        // The crowd's gift, hung over the head as a little constellation: the full set of
        // sockets as faint star outlines, the shards held glowing in them, joined by threads
        // of starlight.
        const tint = this.col(owner);
        const slotX = (i: number) => f.x + (i - (SHARD_MAX - 1) / 2) * 15;
        const slotY = (i: number) => y + Math.sin(t * 3 + i) * 2 - (i === 1 ? 3 : 0);
        g.fillStyle(tint(MYTH.void), 0.45);
        g.fillEllipse(f.x, y - 1, SHARD_MAX * 15 + 14, 20);
        g.lineStyle(1, tint(MYTH.haze), 0.35);
        g.strokeEllipse(f.x, y - 1, SHARD_MAX * 15 + 14, 20);
        for (let i = 0; i < SHARD_MAX - 1; i++) {
          const lit = i + 1 < s.shards;
          g.lineStyle(1, tint(lit ? MYTH.shard : MYTH.violet), lit ? 0.7 : 0.4);
          g.lineBetween(slotX(i), slotY(i), slotX(i + 1), slotY(i + 1));
        }
        for (let i = 0; i < SHARD_MAX; i++) {
          if (i < s.shards) {
            paintShard(g, tint, slotX(i), slotY(i), 6, t * 2.4 + i * 1.2, 0.95);
          } else {
            star(g, slotX(i), slotY(i), 3, tint(MYTH.violet), 0.7, { points: 4, rot: t * 0.5 });
            g.fillStyle(tint(MYTH.void), 1);
            g.fillCircle(slotX(i), slotY(i), 1);
          }
        }
      }
      if (this.now < s.whipPlusUntil) {
        star(g, f.x + 18, y - 4, 4, this.col(owner)(MYTH.mace), 0.6 + 0.4 * Math.sin(t * 8), { points: 4, rot: t * 3 });
      }
      if (this.now < s.truthWindowUntil && s.shards > 0 && !s.destinyLive) {
        const k = (s.truthWindowUntil - this.now) / TRUTH_WINDOW_MS;
        const tint = this.col(owner);
        // A dim violet track, the window burning down round it in gold, rune-ticks on the
        // track and a little star riding the burning end.
        g.lineStyle(4, tint(MYTH.void), 0.5);
        g.strokeCircle(f.x, f.y, 30);
        g.lineStyle(1, tint(MYTH.violet), 0.7);
        g.strokeCircle(f.x, f.y, 30);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.lineStyle(1, tint(MYTH.haze), 0.45);
          g.lineBetween(f.x + Math.cos(a) * 27.5, f.y + Math.sin(a) * 27.5, f.x + Math.cos(a) * 32.5, f.y + Math.sin(a) * 32.5);
        }
        const end = -Math.PI / 2 + Math.PI * 2 * Math.min(1, k);
        g.lineStyle(4, tint(MYTH.gold), 0.25);
        g.beginPath();
        g.arc(f.x, f.y, 30, -Math.PI / 2, end, false);
        g.strokePath();
        g.lineStyle(2, tint(MYTH.gold), 0.85);
        g.beginPath();
        g.arc(f.x, f.y, 30, -Math.PI / 2, end, false);
        g.strokePath();
        star(g, f.x + Math.cos(end) * 30, f.y + Math.sin(end) * 30, 4.2, tint(MYTH.star), 0.95, { points: 4, rot: t * 4 });
      }
    }
  }

  // ── Statuses ───────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const set = (id: string, st: CustomStatus | null): void => this.api.setStatusIndicator(id, st);
    const s = this.sides.player;
    set('myth-shards', playerIs && s.shards > 0 ? {
      name: 'Echo Shards', emoji: '💠', color: MYTH.shard,
      description: `The crowd's gift. Right-click enhances the whip; E, R or F again recast that ability. ${SHARD_MAX} at most.`,
      count: s.shards, priority: 150,
    } : null);
    set('myth-whip-plus', playerIs && this.now < s.whipPlusUntil ? {
      name: 'Phantom Maces', emoji: '🔮', color: MYTH.mace,
      description: `Every lash leaves a mace circling where the tip landed: ${MACE_DAMAGE} per touch for 3s.`,
      until: s.whipPlusUntil,
    } : null);
    set('myth-truth-window', playerIs && this.now < s.truthWindowUntil && !s.destinyLive ? {
      name: 'Truth Breaker', emoji: '⚔️', color: MYTH.gold,
      description: `Press E again with an Echo Shard: a ${TRUTH_DASH}px dash for ${TRUTH_DASH_DAMAGE} true damage to everyone you pass.`,
      until: s.truthWindowUntil,
    } : null);
    set('myth-determined', playerIs && s.detLive ? {
      name: this.now < s.detInvulnUntil ? 'Determined — Invincible' : 'Determined — Unstoppable', emoji: '🛡️', color: MYTH.gold,
      description: this.now < s.detInvulnUntil
        ? 'Nothing can hurt you. Then three seconds immune to stuns and slows. R again with a shard: +5s and 25% speed.'
        : `Immune to stuns and slows${s.detPlus ? ', and 25% faster' : '. R again with a shard: +5s and 25% speed'}.`,
      until: this.now < s.detInvulnUntil ? s.detInvulnUntil : s.detImmuneUntil,
    } : null);
    set('myth-flip', playerIs && this.now < s.flipSpeedUntil ? {
      name: 'Vaulted the Beast', emoji: '🌠', color: MYTH.starBlue,
      description: '20% faster for flipping over your own beast.',
      until: s.flipSpeedUntil,
    } : null);
    const myBeast = playerIs ? this.beastOf('player') : null;
    set('myth-beast', myBeast ? {
      name: myBeast.returning ? 'Beast — Coming Home' : 'Beast of Myth', emoji: '🐉', color: MYTH.iris,
      description: myBeast.returning
        ? 'Dragging its catch back to the portal. Get in its way to flip again.'
        : `Grabs everyone in its path for ${BEAST_TICK_DAMAGE} every half second until it hits a wall. F again with a shard calls it back.`,
      count: myBeast.grabbed.size || undefined,
    } : null);
    set('myth-destiny', playerIs && s.destinyLive ? {
      name: 'Final Destiny', emoji: '🔫', color: MYTH.gold,
      description: 'First person. WASD walks where you look, the cursor turns you, and the five keys are five guns.',
      until: s.destinyUntil,
    } : null);
    // The player on the receiving end of a beast.
    const held = this.beasts.some((b) => b.doneAt === 0 && b.grabbed.has(this.api.player));
    set('myth-caught', held ? {
      name: 'Caught by the Beast', emoji: '🐉', color: MYTH.red,
      description: `In its jaws: ${BEAST_TICK_DAMAGE} every half second, dragged until it hits a wall or goes home.`,
      priority: 30,
    } : null);
  }

  // ── Readers for ArenaScene ─────────────────────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    const s = this.side(owner);
    let m = 1;
    if (this.now < s.flipSpeedUntil) m *= FLIP_SPEED;
    if (s.detLive && s.detPlus && this.now < s.detImmuneUntil) m *= DET_PLUS_SPEED;
    return m;
  }

  getBarRatio(abilityId: string, time: number): number {
    void time;
    const p = this.api.player;
    const s = this.sides.player;
    if (s.destinyLive) {
      const gun: Record<string, string> = {
        'myth-whip': 'myth-pistol', 'myth-truth': 'myth-shotgun', 'myth-determination': 'myth-grenades',
        'myth-beast': 'myth-rifle', 'myth-destiny': 'myth-rocket',
      };
      return p.getCooldownRatio(gun[abilityId] ?? abilityId);
    }
    if (abilityId === 'myth-truth' && this.now < s.truthWindowUntil && s.shards > 0) {
      return Phaser.Math.Clamp((s.truthWindowUntil - this.now) / TRUTH_WINDOW_MS, 0, 1);
    }
    if (abilityId === 'myth-beast' && this.beastOf('player')) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot ────────────────────────────────────────────────────

  shardsOf(owner: Owner): number { return this.side(owner).shards; }

  /** A foe this side's star mace has stunned, still stunned: the dash lands for certain. */
  tipStunLive(owner: Owner): boolean {
    const s = this.side(owner);
    return [...s.stunHeld.values()].some((u) => u > this.now);
  }

  truthWindowOpen(owner: Owner): boolean { return this.now < this.side(owner).truthWindowUntil; }
  determined(owner: Owner): boolean { return this.side(owner).detLive; }
  destinyLive(owner: Owner): boolean { return this.side(owner).destinyLive; }
  beastLive(owner: Owner): boolean { return this.beastOf(owner) !== null; }

  /** Damage taken by this side in the last 1.5s — the cue to press R. */
  takenRecent(owner: Owner): number {
    return this.side(owner).taken.filter((t) => this.now - t.at <= 1500).reduce((a, t) => a + t.amount, 0);
  }

  /** The crowd is close to cheering: a committed burst of damage now is a shard. */
  cheerClose(owner: Owner): boolean {
    const s = this.side(owner);
    if (this.now < s.cheerSleepUntil || s.shards >= SHARD_MAX) return false;
    return s.dealt.reduce((a, t) => a + t.amount, 0) >= CHEER_DEALT * 0.5;
  }

  /** Pistol stacks on this side's target, 0–4. */
  vulnStacksOn(t: Fighter): number { return Date.now() < t.mythVulnUntil ? t.mythVulnStacks : 0; }

  /**
   * Where the bot should stand to be run over by its own beast — the nearest point on the
   * beast's forward path, offered only while a flip is possible. Null otherwise.
   */
  flipPoint(owner: Owner): { x: number; y: number } | null {
    const bst = this.beastOf(owner);
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!bst || !bst.moving || !f || !f.active || this.now < s.flipGateUntil) return null;
    const ahead = 400;
    const ex = bst.x + Math.cos(bst.ang) * ahead;
    const ey = bst.y + Math.sin(bst.ang) * ahead;
    const { d, k } = segDist(f.x, f.y, bst.x, bst.y, ex, ey);
    if (d > 150 || k <= 0.05) return null;
    return { x: bst.x + (ex - bst.x) * Math.min(1, k + 0.1), y: bst.y + (ey - bst.y) * Math.min(1, k + 0.1) };
  }
}
