import Phaser from 'phaser';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { SummonPurgeTarget } from '../../combat/SummonPurge';
import { FormRevertTarget } from '../../combat/FormRevert';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  CLAY, ClayAvatar, ClayColorFn, ClayFx, clayShard, drawClayBar, drawClayPuddle, drawClayRope, drawCreature,
  drawGolem, drawGuide, drawSlipPips, drawTether, drawWallSmear,
} from './ClayVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { drawGoldenBear } from './skins/AnimatronicFx';

/**
 * Clay — the shaper's kit.
 *
 * Two bodies on one set of keys. The fighter owns the keys; the cursor owns the golem — an
 * immortal lump of clay the size of two fighters that walks where the mouse points, swallows
 * every shot that touches it, and does the hitting:
 * - **Click** the golem slams where it stands. **E** it bursts into eight piercing shards and
 *   re-forms. Fused, both come from you instead.
 * - **R** opens a blue circle round you and the clay you drag inside it becomes an orbiting
 *   shield, worn away only where shots strike it.
 * - **F** throws you to the nearest wall and you run the rim as a smear, firing shard
 *   barrages; F again drops you off.
 * - **Q** calls the golem in and fuses the two of you: eight hits of any size to live, immune
 *   to effects, faster, with a dash that leaves slowing slip behind it. Q again splits.
 *
 * Mastery: Bedrock (the golem turns to stone and shelters you; a fused Space becomes an aerial
 * crash) and Give Life (a drawn creature that hunts).
 *
 * Nothing here is a sprite. The golem, shards, ropes, puddles and creatures are records painted
 * every frame through the painters in ClayVisuals, so the codex can draw them the same way.
 */

export type ClayOwner = 'player' | 'npc';
type WallSide = 'top' | 'right' | 'bottom' | 'left';
type Slot = 'click' | 'e' | 'r' | 'f' | 'q';
type MasterySlot = 'e' | 'r' | 'f' | 'q';

const PAD = 32;
/** Where a fighter's body actually stops against the arena wall: the pad plus its 22px radius. */
const RAIL = PAD + 22;

const GOLEM_SPEED = 285;
const GOLEM_RUSH_SPEED = 650;
const GOLEM_RADIUS = 35;
const GOLEM_EASE = 9;
const SLAM_RADIUS = 118;
const SLAM_DAMAGE = 20;
const SLAM_SHOVE = 250;
const SHARD_DAMAGE = 25;
const SHARD_SPEED = 475;
const SHARD_HIT_R = 11;
const SHARD_LIFE_MS = 1800;
const RUPTURE_COUNT = 8;
const RUPTURE_HIDE_MS = 420;
const ORBIT_COUNT = 3;
const ORBIT_MS = 6000;
const ORBIT_RADIUS = 62;
const CLOT_MS = 3000;
const CLOT_RADIUS = 148;
const CLOT_BUDGET = 280;
const CLOT_STEP = 9;
const SHIELD_MAX_NODES = 96;
const SHIELD_NODE_R = 13;
const SHIELD_ERODE_R = 24;
const SHIELD_SPIN = 0.62;
const SLINK_SPEED = 650;
const SLINK_LAUNCH_SPEED = 900;
const SLINK_BURSTS = 3;
const FUSE_HITS = 8;
const FUSE_SPEED_MULT = 1.35;
const FUSE_SIZE = 1.42;
const FUSE_DASH_SPEED = 920;
const FRENZY_SIZE = 0.92;
const FRENZY_SPEED = 0.08;
const PUDDLE_RADIUS = 44;
const PUDDLE_MS = 5500;
const PUDDLE_SLOW = 0.55;
const PUDDLE_GAP = 54;
const BEDROCK_RANGE = 175;
const BEDROCK_RESIST = 0.8;
const LEAP_MS = 620;
const LEAP_STUN_MS = 2000;
const LEAP_CD_MULT = 3;
const GIVE_LIFE_ID = 'give-life';
const GIVE_LIFE_CD = 6000;
const LIFE_DRAW_MS = 3000;
const LIFE_RADIUS = 82;
const LIFE_REACH = 112;
const LIFE_BUDGET = 190;
const LIFE_STEP = 8;
const CREATURE_MS = 12000;
const CREATURE_HIT_MS = 700;
const CREATURE_MIN_NODES = 4;

interface Golem {
  x: number;
  y: number;
  hiddenUntil: number;
  seed: number;
  mood: 'idle' | 'rush' | 'slam';
  moodUntil: number;
}

interface ShieldNode { x: number; y: number; anchor: 'fighter' | 'golem' }

interface DrawSession {
  until: number;
  budget: number;
  lastX: number;
  lastY: number;
  started: boolean;
  nodes: ShieldNode[];
}

interface LifeDraw {
  cx: number;
  cy: number;
  until: number;
  budget: number;
  started: boolean;
  lastX: number;
  lastY: number;
  nodes: Array<{ x: number; y: number }>;
}

interface Creature {
  owner: ClayOwner;
  x: number;
  y: number;
  angle: number;
  nodes: Array<{ x: number; y: number }>;
  until: number;
  damage: number;
  speed: number;
  radius: number;
  nextHitAt: number;
  seed: number;
}

interface Shard {
  owner: ClayOwner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  until: number;
  hits: Set<Fighter>;
  reg: RegisteredProjectile | null;
}

interface OrbitShard {
  owner: ClayOwner;
  angle: number;
  until: number;
  x: number;
  y: number;
  reg: RegisteredProjectile | null;
}

interface Puddle { owner: ClayOwner; x: number; y: number; until: number; seed: number }

interface Leap { fromX: number; fromY: number; toX: number; toY: number; startedAt: number; until: number }

interface Side {
  golem: Golem | null;
  drawing: DrawSession | null;
  shield: ShieldNode[];
  shieldAngle: number;
  slink: 'none' | 'launch' | 'wall';
  wall: WallSide;
  wallDir: 1 | -1;
  slinkBursts: number;
  fused: boolean;
  fusing: boolean;
  hitsLeft: number;
  fuseAbsorber: Fighter['fuseHitAbsorber'];
  dashTarget: { x: number; y: number } | null;
  lastPuddleX: number;
  lastPuddleY: number;
  slipstreamCharges: number;
  slipstreamNextAt: number;
  lifeDrawing: LifeDraw | null;
  lastGiveLifeAt: number;
  leap: Leap | null;
}

function makeSide(): Side {
  return {
    golem: null, drawing: null, shield: [], shieldAngle: 0, slink: 'none', wall: 'top', wallDir: 1, slinkBursts: 0,
    fused: false, fusing: false, hitsLeft: FUSE_HITS, fuseAbsorber: null, dashTarget: null, lastPuddleX: 0, lastPuddleY: 0,
    slipstreamCharges: 3, slipstreamNextAt: 0, lifeDrawing: null, lastGiveLifeAt: -GIVE_LIFE_CD, leap: null,
  };
}

export interface ClayArenaApi {
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
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  /** The npc slot is a bot this kit may decide for, not a remote player or an ally. */
  get npcAutonomous(): boolean;
  get width(): number;
  get height(): number;
  /** `SkinsKit.clayColor` — one owner's skin, or the identity. */
  clayColor(owner: ClayOwner, base: number): number;
  /** The owner's equipped skin id, or null. */
  skinId(owner: ClayOwner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** The arena's generic cleanse — Fuse refuses every effect for as long as the body holds. */
  purgeDebuffs(fighter: Fighter): number;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: MasterySlot): string | null;
  npcMasteryBindFor(slot: MasterySlot): string | null;
  recordMasteryStat(key: string, amount: number): void;
  broadcastMasteryCast(enhId: string): void;
}

export class ClayKit implements SummonPurgeTarget, FormRevertTarget {
  private readonly pcol: ClayColorFn;
  private readonly ncol: ClayColorFn;
  private readonly pfx: ClayFx;
  private readonly nfx: ClayFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  private sides: Record<ClayOwner, Side> = { player: makeSide(), npc: makeSide() };
  private shards: Shard[] = [];
  private orbitShards: OrbitShard[] = [];
  private creatures: Creature[] = [];
  private puddles: Puddle[] = [];
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private golemGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private aimX = 0;
  private aimY = 0;
  private t = 0;

  constructor(private api: ClayArenaApi) {
    this.pcol = (base) => api.clayColor('player', base);
    this.ncol = (base) => api.clayColor('npc', base);
    this.pfx = new ClayFx(api.scene, this.pcol);
    this.nfx = new ClayFx(api.scene, this.ncol);
  }

  // ── Small helpers ─────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: ClayOwner): Side { return this.sides[owner]; }
  private fighter(owner: ClayOwner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: ClayOwner): ClayFx { return owner === 'player' ? this.pfx : this.nfx; }
  private tint(owner: ClayOwner): ClayColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: ClayOwner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isClay(owner: ClayOwner): boolean {
    return owner === 'player' ? this.api.elementId === 'clay' : this.api.npcElementId === 'clay';
  }
  private up(owner: ClayOwner, slot: Slot): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }
  private mastered(owner: ClayOwner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }
  private masterySlot(owner: ClayOwner): MasterySlot | null {
    for (const slot of ['e', 'r', 'f', 'q'] as const) {
      const id = owner === 'player' ? this.api.masteryBindFor(slot) : this.api.npcMasteryBindFor(slot);
      if (id === GIVE_LIFE_ID) return slot;
    }
    return null;
  }
  private targets(owner: ClayOwner): Fighter[] {
    return (owner === 'player' ? this.api.enemies : [this.api.player]).filter((f) => !!f && f.active && f.hp > 0);
  }
  private nearestTarget(owner: ClayOwner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targets(owner)) {
      const d = Phaser.Math.Distance.Squared(x, y, t.x, t.y);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
  /** Where the golem wants to be: the cursor for a player, the enemy for a bot. */
  private aimPoint(owner: ClayOwner): { x: number; y: number } {
    if (owner === 'player') return { x: this.aimX || this.api.player.x, y: this.aimY || this.api.player.y };
    const f = this.api.npc;
    const t = this.nearestTarget('npc', f.x, f.y);
    return t ? { x: t.x, y: t.y } : { x: f.x, y: f.y };
  }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, PAD, this.api.width - PAD); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, PAD, this.api.height - PAD); }

  /** The kit's own pop-up: ArenaScene's is a no-op, and these few are worth reading. */
  private announce(x: number, y: number, text: string, color: string, size = 11, ms = 1000): void {
    const scene = this.api.scene;
    const label = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color, stroke: '#1a0e08', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(16);
    scene.tweens.add({ targets: label, y: y - 24, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  /** Every point of damage the kit deals passes through here. */
  private hit(owner: ClayOwner, target: Fighter, damage: number, source: object, sx: number, sy: number, pierce = false, aoe = false): void {
    const attacker = this.fighter(owner);
    const wasAlive = target.hp > 0;
    target.lastDamageOwner = owner;
    target.setIncomingCritContext(attacker.critChance, attacker.critMult);
    const amount = Math.max(0, Math.round(damage * attacker.outgoingDamageMult * attacker.cardOutgoingDamageMult));
    target.takeDamage(amount, { source, sourceX: sx, sourceY: sy, pierce, aoe });
    if (owner === 'player' && this.side(owner).fused && wasAlive && target.hp <= 0) this.api.recordMasteryStat('fusionKills', 1);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      const f = this.fighter(owner);
      const s = this.side(owner);
      // On a rematch `reset()` runs before create() builds the new fighters, so these are the
      // previous match's destroyed bodies — a fresh Fighter starts at the defaults anyway.
      if (f && f.active && f.body) {
        if (s.fuseAbsorber && f.fuseHitAbsorber === s.fuseAbsorber) f.fuseHitAbsorber = null;
        f.clayIncomingMult = 1;
        f.claySizeMult = 1;
        f.applySizeMult();
        f.setHealthBarVisible(true);
      }
    }
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const s of this.shards) if (s.reg) this.api.projectileRegistry.remove(s.reg);
    for (const s of this.orbitShards) if (s.reg) this.api.projectileRegistry.remove(s.reg);
    this.shards = [];
    this.orbitShards = [];
    this.creatures = [];
    this.puddles = [];
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.golemGfx?.destroy(); this.golemGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.aimX = 0;
    this.aimY = 0;
    this.t = 0;
    this.clearHud();
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  handleInput(_time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'clay') return;
    this.aimX = mouseX;
    this.aimY = mouseY;
    const s = this.side('player');
    const p = this.api.player;
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // A drawing owns the mouse until it ends.
    if (s.lifeDrawing) { if (pointer.isDown) this.feedLifeDrawing('player', mouseX, mouseY); return; }
    if (s.drawing) { if (pointer.isDown) this.feedDrawing('player', mouseX, mouseY); return; }
    if (s.fusing || s.leap) return;

    const giveLifeSlot = this.mastered('player') ? this.masterySlot('player') : null;
    const keyOf = (slot: MasterySlot) => slot === 'e' ? this.api.eKey : slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
    if (giveLifeSlot && Phaser.Input.Keyboard.JustDown(keyOf(giveLifeSlot))) { this.tryGiveLife('player', mouseX, mouseY); return; }

    // Recasts end a form rather than starting the ability again, so they bypass the cooldown
    // the first press stamped.
    if (s.fused && giveLifeSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) { this.endFuse('player', true); return; }
    if (!s.fused && s.slink !== 'none' && giveLifeSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) { this.leaveWall('player'); return; }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (clicked) p.castAbility('clay-slam', ctx);
    if (giveLifeSlot !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('clay-rupture', ctx);
    if (giveLifeSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('clay-clot', ctx);
    if (giveLifeSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('clay-slink', ctx);
    if (giveLifeSlot !== 'q' && !s.fused && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('clay-fuse', ctx);
  }

  // ── Casts ─────────────────────────────────────────────────────────────────

  doSlam(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.slink === 'wall' && !s.fused) {
      // On the wall the click is the barrage.
      if (s.slinkBursts >= SLINK_BURSTS) return;
      s.slinkBursts++;
      const aim = this.aimPoint(owner);
      const base = Math.atan2(aim.y - f.y, aim.x - f.x);
      for (let i = 0; i < 8; i++) this.spawnShard(owner, f.x, f.y, base + (i - 3.5) * 0.065);
      this.fx(owner).clods(f.x, f.y, 5, 120, 380);
      this.announce(f.x, f.y - 40, `${SLINK_BURSTS - s.slinkBursts} BARRAGES LEFT`, '#c38352');
      Sfx.playAt('rock-throw', f.x, { rate: 1.2, volume: 0.6 });
      // A bot cannot press the form's recast; it drops off once the last barrage is spent.
      if (owner === 'npc' && s.slinkBursts >= SLINK_BURSTS) this.leaveWall(owner);
      return;
    }
    const g = this.golem(owner);
    const at = s.fused ? { x: f.x, y: f.y } : { x: g.x, y: g.y };
    this.slam(owner, at.x, at.y, 0);
    if (!s.fused) { g.mood = 'slam'; g.moodUntil = this.now + 300; }
    this.avatar(owner)?.play('slam', Math.atan2(at.y - f.y, at.x - f.x));
    if (this.up(owner, 'click')) this.spawnRadial(owner, at.x, at.y, 3, 0.3);
    Sfx.playAt('stone-slam', at.x, { rate: 0.82, volume: 0.8 });
  }

  doRupture(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    const g = this.golem(owner);
    const at = s.fused ? { x: f.x, y: f.y } : { x: g.x, y: g.y };
    this.spawnRadial(owner, at.x, at.y, RUPTURE_COUNT, Math.PI / 8);
    if (this.up(owner, 'e')) this.spawnOrbitShards(owner);
    if (!s.fused) g.hiddenUntil = this.now + RUPTURE_HIDE_MS;
    this.fx(owner).burst(at.x, at.y, 80, 14, this.mastered(owner));
    this.avatar(owner)?.play('flex');
    this.api.scene.cameras.main.shake(120, 0.004);
    Sfx.playAt('rock-throw', at.x, { rate: 1.12, volume: 0.8 });
  }

  doClot(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.shield = [];
    s.drawing = { until: this.now + CLOT_MS, budget: CLOT_BUDGET, lastX: f.x, lastY: f.y, started: false, nodes: [] };
    this.avatar(owner)?.setHold('sow', this.aimAngle(owner));
    this.fx(owner).guidePulse(f.x, f.y, CLOT_RADIUS);
    if (this.up(owner, 'r') && !s.fused) this.fx(owner).guidePulse(this.golem(owner).x, this.golem(owner).y, CLOT_RADIUS);
    Sfx.playAt('shield-up', f.x, { rate: 0.72, volume: 0.6 });
    if (owner === 'npc') {
      // A bot has no pointer. It draws a deliberately imperfect double crescent — still a rope
      // of nodes that wears away exactly where shots touch it.
      for (let i = 0; i < 42; i++) {
        const a = -Math.PI * 0.82 + (i / 41) * Math.PI * 1.64;
        const r = i % 2 ? 104 : 118;
        s.drawing.nodes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, anchor: 'fighter' });
      }
      if (this.up(owner, 'r') && !s.fused) {
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI * 0.8 + (i / 25) * Math.PI * 1.6;
          s.drawing.nodes.push({ x: Math.cos(a) * 84, y: Math.sin(a) * 84, anchor: 'golem' });
        }
      }
      s.drawing.budget = 0;
    }
  }

  doSlink(owner: ClayOwner, tx: number, ty: number): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.fused) {
      // Fused, F is the dash: to the cursor, slip behind, a slam on arrival.
      if (s.dashTarget) return;
      s.dashTarget = { x: this.clampX(tx), y: this.clampY(ty) };
      s.lastPuddleX = f.x;
      s.lastPuddleY = f.y;
      this.dropPuddle(owner, f.x, f.y);
      this.avatar(owner)?.play('dash', Math.atan2(ty - f.y, tx - f.x));
      Sfx.playAt('sand', f.x, { rate: 0.9, volume: 0.7 });
      return;
    }
    if (s.slink !== 'none') { this.leaveWall(owner); return; }
    s.wall = this.nearestWall(f.x, f.y);
    s.wallDir = owner === 'player' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    s.slink = 'launch';
    s.slinkBursts = 0;
    this.avatar(owner)?.play('dash');
    this.fx(owner).clods(f.x, f.y, 6, 110, 400);
    Sfx.playAt('sand', f.x, { rate: 0.7, volume: 0.7 });
  }

  doFuse(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    if (s.fused) { this.endFuse(owner, true); return; }
    if (s.fusing) return;
    this.leaveWall(owner);
    s.fusing = true;
    s.drawing = null;
    s.shield = [];
    const g = this.golem(owner);
    g.mood = 'rush';
    g.moodUntil = this.now + 5000;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('raise', undefined, 900);
    this.announce(f.x, f.y - 46, 'FUSING', '#c38352');
    Sfx.playAt('mutate', f.x, { rate: 0.78, volume: 0.7 });
  }

  /** Online replay and the bot's own cast path for Give Life. */
  doNpcGiveLife(tx: number, ty: number): void { this.tryGiveLife('npc', tx, ty); }

  // ── Per frame ─────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const live = this.isClay('player') || this.isClay('npc') || this.shards.length + this.orbitShards.length + this.creatures.length + this.puddles.length > 0;
    if (!live) { this.updateAvatars(time, delta); return; }
    this.ensureLayers();
    this.updateAvatars(time, delta);
    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      const f = this.fighter(owner);
      if (!this.isClay(owner)) {
        if (this.side(owner).fused || this.side(owner).fusing) this.endFuse(owner, false);
        if (f) f.clayIncomingMult = 1;
        continue;
      }
      this.updateGolem(owner, dt);
      this.updateDrawing(owner, time);
      this.updateSlink(owner);
      this.updateFuse(owner);
      this.updateSlipstream(owner, time);
      this.updateLeap(owner, time);
      this.updateLifeDrawing(owner, time);
      this.updateBedrock(owner);
      this.updateShieldHits(owner);
      this.updateGolemHits(owner);
    }
    this.updateShards(dt, time);
    this.updateOrbitShards(dt, time);
    this.updateCreatures(dt, time);
    this.puddles = this.puddles.filter((p) => p.until > time);
    this.paint(time);
    this.updateHud();
  }

  private aimAngle(owner: ClayOwner): number {
    const f = this.fighter(owner);
    const a = this.aimPoint(owner);
    return Math.atan2(a.y - f.y, a.x - f.x);
  }

  private makeAvatar(owner: ClayOwner, scene: Phaser.Scene): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), scene) ?? new ClayAvatar(scene, this.tint(owner));
  }

  /** The golem, or — under the Animatronic skin — the golden bear standing in for it. Visual only. */
  private paintGolem(owner: ClayOwner, g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, seed: number, scale: number, bed: boolean, mood: 'idle' | 'rush' | 'slam'): void {
    if (this.api.skinId(owner) === 'animatronic') drawGoldenBear(g, x, y, t, seed, scale, bed, mood);
    else drawGolem(g, this.tint(owner), x, y, t, seed, scale, bed, mood);
  }

  private updateAvatars(time: number, delta: number): void {
    void time;
    const { player, npc, scene } = this.api;
    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      const f = owner === 'player' ? player : npc;
      const have = owner === 'player' ? this.playerAvatar : this.npcAvatar;
      if (this.isClay(owner) && f?.active) {
        const av = have ?? this.makeAvatar(owner, scene);
        if (!have) { if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av; }
        const s = this.side(owner);
        av.setFacing(this.aimAngle(owner));
        av.setMastered(this.mastered(owner));
        (av as BaseAvatar & { setFused?(on: boolean, layers: number, max: number): void }).setFused?.(s.fused, s.hitsLeft, FUSE_HITS);
        av.setRigScale(f.claySizeMult);
        av.setIntensity(s.fused ? 1.2 : 1);
        if (s.slink === 'wall') av.setHold('ride', this.wallHeading(s));
        else if (!s.drawing && !s.lifeDrawing) av.setHold(null);
        // On the wall the smear *is* the body; the rig hides with the sprite.
        const alpha = f.forceInvisible || s.slink !== 'none' ? 0 : f.alpha;
        av.update(delta, f.x, f.y, alpha);
      } else if (have) {
        have.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
      }
    }
  }

  // ── The golem ─────────────────────────────────────────────────────────────

  private golem(owner: ClayOwner): Golem {
    const s = this.side(owner);
    if (s.golem) return s.golem;
    const f = this.fighter(owner);
    s.golem = { x: f.x + (owner === 'player' ? 70 : -70), y: f.y, hiddenUntil: 0, seed: Math.random() * 100, mood: 'idle', moodUntil: 0 };
    return s.golem;
  }

  private updateGolem(owner: ClayOwner, dt: number): void {
    const s = this.side(owner);
    const g = this.golem(owner);
    const f = this.fighter(owner);
    if (g.moodUntil && this.now >= g.moodUntil) { g.mood = s.fusing ? 'rush' : 'idle'; g.moodUntil = 0; }
    if (s.fused) { g.x = f.x; g.y = f.y; return; }
    const target = s.fusing ? { x: f.x, y: f.y } : this.aimPoint(owner);
    const dx = target.x - g.x, dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    const speed = s.fusing ? GOLEM_RUSH_SPEED : GOLEM_SPEED;
    if (dist > 1) {
      const step = Math.min(dist, speed * dt, dist * GOLEM_EASE * dt);
      g.x += (dx / dist) * step;
      g.y += (dy / dist) * step;
    }
    g.x = this.clampX(g.x);
    g.y = this.clampY(g.y);
    if (s.fusing && dist < 24) this.enterFuse(owner);
  }

  /** The golem is immortal: every hostile shot that touches it is simply eaten. */
  private updateGolemHits(owner: ClayOwner): void {
    const s = this.side(owner);
    const g = s.golem;
    if (!g || s.fused || s.fusing || g.hiddenUntil > this.now) return;
    for (const proj of [...this.api.projectiles.getChildren()] as Projectile[]) {
      if (!proj.active) continue;
      const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!hostile || Phaser.Math.Distance.Between(g.x, g.y, proj.x, proj.y) > GOLEM_RADIUS) continue;
      this.swallow(owner, proj.x, proj.y, Math.max(0, Math.round(proj.damage ?? 0)));
      proj.destroy();
    }
    const hostileOwner: ClayOwner = owner === 'player' ? 'npc' : 'player';
    for (const shot of this.api.projectileRegistry.within(hostileOwner, g.x, g.y, GOLEM_RADIUS)) {
      this.swallow(owner, shot.getX(), shot.getY(), Math.max(0, Math.round(shot.damage)));
      this.api.projectileRegistry.steal(shot);
    }
  }

  private swallow(owner: ClayOwner, x: number, y: number, damage: number): void {
    if (owner === 'player') this.api.recordMasteryStat('golemAbsorbed', damage);
    this.fx(owner).splat(x, y);
    this.api.spawnHitFlash(x, y, CLAY.light);
  }

  // ── Slam and shards ───────────────────────────────────────────────────────

  private slam(owner: ClayOwner, x: number, y: number, stunMs: number): void {
    this.fx(owner).slamShock(x, y, SLAM_RADIUS, 13, this.mastered(owner));
    this.api.scene.cameras.main.shake(140, 0.005);
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > SLAM_RADIUS) continue;
      this.hit(owner, t, SLAM_DAMAGE, this, x, y, false, true);
      if (stunMs > 0 && t.hp > 0) {
        t.applyDisarm(stunMs);
        t.mobilityBlockedUntil = Math.max(t.mobilityBlockedUntil, this.now + stunMs);
        this.announce(t.x, t.y - 44, '🗿 STUNNED', '#9fd0ff');
      }
      this.api.spawnHitFlash(t.x, t.y, CLAY.light);
      if (!t.knockbackImmune) {
        const a = Math.atan2(t.y - y, t.x - x);
        this.body(t).setVelocity(Math.cos(a) * SLAM_SHOVE, Math.sin(a) * SLAM_SHOVE);
      }
    }
  }

  private spawnRadial(owner: ClayOwner, x: number, y: number, count: number, offset: number): void {
    for (let i = 0; i < count; i++) this.spawnShard(owner, x, y, offset + (i / count) * Math.PI * 2);
  }

  private spawnShard(owner: ClayOwner, x: number, y: number, angle: number): void {
    const shard: Shard = { owner, x, y, angle, vx: Math.cos(angle) * SHARD_SPEED, vy: Math.sin(angle) * SHARD_SPEED, until: this.now + SHARD_LIFE_MS, hits: new Set(), reg: null };
    shard.reg = { owner, getX: () => shard.x, getY: () => shard.y, damage: SHARD_DAMAGE, steal: () => this.removeShard(shard) };
    this.shards.push(shard);
    this.api.projectileRegistry.add(shard.reg);
  }

  private removeShard(shard: Shard): void {
    if (shard.reg) this.api.projectileRegistry.remove(shard.reg);
    const i = this.shards.indexOf(shard);
    if (i >= 0) this.shards.splice(i, 1);
  }

  private updateShards(dt: number, time: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (time >= s.until || s.x < PAD || s.x > this.api.width - PAD || s.y < PAD || s.y > this.api.height - PAD) {
        this.fx(s.owner).clods(s.x, s.y, 3, 70, 300);
        this.removeShard(s);
        continue;
      }
      for (const t of this.targets(s.owner)) {
        if (s.hits.has(t) || Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > SHARD_HIT_R + 22) continue;
        s.hits.add(t);
        this.hit(s.owner, t, SHARD_DAMAGE, s, s.x, s.y, true);
        if (s.owner === 'player') this.api.recordMasteryStat('shardHits', 1);
        this.api.spawnHitFlash(t.x, t.y, CLAY.light);
        this.fx(s.owner).clods(t.x, t.y, 3, 90, 320);
      }
    }
  }

  private spawnOrbitShards(owner: ClayOwner): void {
    for (const sh of [...this.orbitShards]) if (sh.owner === owner) this.removeOrbitShard(sh);
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const sh: OrbitShard = { owner, angle: (i / ORBIT_COUNT) * Math.PI * 2, until: this.now + ORBIT_MS, x: 0, y: 0, reg: null };
      sh.reg = { owner, getX: () => sh.x, getY: () => sh.y, damage: SHARD_DAMAGE, steal: () => this.removeOrbitShard(sh) };
      this.orbitShards.push(sh);
      this.api.projectileRegistry.add(sh.reg);
    }
  }

  private removeOrbitShard(sh: OrbitShard): void {
    if (sh.reg) this.api.projectileRegistry.remove(sh.reg);
    const i = this.orbitShards.indexOf(sh);
    if (i >= 0) this.orbitShards.splice(i, 1);
  }

  private updateOrbitShards(dt: number, time: number): void {
    for (let i = this.orbitShards.length - 1; i >= 0; i--) {
      const sh = this.orbitShards[i];
      if (time >= sh.until || !this.isClay(sh.owner)) { this.removeOrbitShard(sh); continue; }
      const s = this.side(sh.owner);
      const centre = s.fused ? this.fighter(sh.owner) : this.golem(sh.owner);
      sh.angle += dt * 3.1;
      sh.x = centre.x + Math.cos(sh.angle) * ORBIT_RADIUS;
      sh.y = centre.y + Math.sin(sh.angle) * ORBIT_RADIUS * 0.8;
      const t = this.targets(sh.owner).find((f) => Phaser.Math.Distance.Between(sh.x, sh.y, f.x, f.y) <= SHARD_HIT_R + 22);
      if (!t) continue;
      this.hit(sh.owner, t, SHARD_DAMAGE, sh, sh.x, sh.y, true);
      if (sh.owner === 'player') this.api.recordMasteryStat('shardHits', 1);
      this.api.spawnHitFlash(t.x, t.y, CLAY.light);
      this.fx(sh.owner).clods(t.x, t.y, 3, 90, 320);
      this.removeOrbitShard(sh);
    }
  }

  // ── Clay Clot ─────────────────────────────────────────────────────────────

  private feedDrawing(owner: ClayOwner, x: number, y: number): void {
    const s = this.side(owner);
    const d = s.drawing;
    if (!d || d.budget <= 0) return;
    const f = this.fighter(owner);
    const g = this.golem(owner);
    const golemCanvas = this.up(owner, 'r') && !s.fused;
    const anchor: ShieldNode['anchor'] = golemCanvas && Phaser.Math.Distance.Between(x, y, g.x, g.y) < Phaser.Math.Distance.Between(x, y, f.x, f.y) ? 'golem' : 'fighter';
    const cx = anchor === 'golem' ? g.x : f.x, cy = anchor === 'golem' ? g.y : f.y;
    if (Phaser.Math.Distance.Between(x, y, cx, cy) > CLOT_RADIUS) return;
    if (!d.started) {
      d.started = true;
      d.lastX = x; d.lastY = y;
      d.nodes.push({ x: x - cx, y: y - cy, anchor });
      d.budget -= CLOT_STEP;
      return;
    }
    const travel = Phaser.Math.Distance.Between(d.lastX, d.lastY, x, y);
    if (travel < CLOT_STEP) return;
    const count = Math.min(Math.floor(travel / CLOT_STEP), Math.floor(d.budget / CLOT_STEP));
    // Beads are laid every 9px along the drag; the cursor's last bead, not the cursor, is where
    // the next segment starts, so a slow drag lays as many beads as a fast one.
    const ux = (x - d.lastX) / travel, uy = (y - d.lastY) / travel;
    for (let i = 1; i <= count; i++) {
      const px = d.lastX + ux * CLOT_STEP * i, py = d.lastY + uy * CLOT_STEP * i;
      if (Phaser.Math.Distance.Between(px, py, cx, cy) <= CLOT_RADIUS) d.nodes.push({ x: px - cx, y: py - cy, anchor });
    }
    d.lastX += ux * CLOT_STEP * count; d.lastY += uy * CLOT_STEP * count;
    d.budget = Math.max(0, d.budget - count * CLOT_STEP);
  }

  private updateDrawing(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.drawing) return;
    if (time < s.drawing.until && s.drawing.budget > 0) return;
    s.shield = s.drawing.nodes.slice(0, SHIELD_MAX_NODES);
    s.shieldAngle = 0;
    s.drawing = null;
    const f = this.fighter(owner);
    this.avatar(owner)?.setHold(null);
    if (s.shield.length) {
      this.announce(f.x, f.y - 50, `CLAY SET · ${s.shield.length}`, '#9fd0ff');
      for (const n of s.shield.filter((_, i) => i % 4 === 0)) { const p = this.shieldWorld(owner, n); this.fx(owner).clods(p.x, p.y, 1, 40, 260); }
    } else {
      this.announce(f.x, f.y - 50, 'NO CLAY DRAWN', '#9a7b68');
    }
  }

  private shieldWorld(owner: ClayOwner, n: ShieldNode): { x: number; y: number } {
    const s = this.side(owner);
    const centre = n.anchor === 'golem' && !s.fused ? this.golem(owner) : this.fighter(owner);
    const c = Math.cos(s.shieldAngle), sn = Math.sin(s.shieldAngle);
    return { x: centre.x + n.x * c - n.y * sn, y: centre.y + n.x * sn + n.y * c };
  }

  private updateShieldHits(owner: ClayOwner): void {
    const s = this.side(owner);
    if (!s.shield.length) return;
    s.shieldAngle += SHIELD_SPIN / 60;
    for (const proj of [...this.api.projectiles.getChildren()] as Projectile[]) {
      if (!proj.active) continue;
      const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!hostile) continue;
      const hitNode = s.shield.find((n) => { const p = this.shieldWorld(owner, n); return Phaser.Math.Distance.Between(p.x, p.y, proj.x, proj.y) <= SHIELD_NODE_R; });
      if (!hitNode) continue;
      const point = this.shieldWorld(owner, hitNode);
      this.erodeShield(owner, point.x, point.y);
      proj.destroy();
    }
    const hostileOwner: ClayOwner = owner === 'player' ? 'npc' : 'player';
    let guard = 0;
    while (s.shield.length && guard++ < 8) {
      let hitAt: { x: number; y: number; shot: RegisteredProjectile } | null = null;
      for (const n of s.shield) {
        const p = this.shieldWorld(owner, n);
        const shot = this.api.projectileRegistry.nearest(hostileOwner, p.x, p.y, SHIELD_NODE_R);
        if (shot) { hitAt = { x: p.x, y: p.y, shot }; break; }
      }
      if (!hitAt) break;
      this.api.projectileRegistry.steal(hitAt.shot);
      this.erodeShield(owner, hitAt.x, hitAt.y);
    }
  }

  private erodeShield(owner: ClayOwner, x: number, y: number): void {
    const s = this.side(owner);
    s.shield = s.shield.filter((n) => { const p = this.shieldWorld(owner, n); return Phaser.Math.Distance.Between(p.x, p.y, x, y) > SHIELD_ERODE_R; });
    this.fx(owner).splat(x, y);
    this.api.spawnHitFlash(x, y, CLAY.light);
    if (owner === 'player') this.api.recordMasteryStat('clotBlocks', 1);
    if (this.up(owner, 'r')) this.spawnRadial(owner, x, y, 3, Math.random() * Math.PI * 2);
  }

  // ── Slink ─────────────────────────────────────────────────────────────────

  private nearestWall(x: number, y: number): WallSide {
    const options: Array<[WallSide, number]> = [['left', x - RAIL], ['right', this.api.width - RAIL - x], ['top', y - RAIL], ['bottom', this.api.height - RAIL - y]];
    options.sort((a, b) => a[1] - b[1]);
    return options[0][0];
  }

  private wallPoint(side: WallSide, f: Fighter): { x: number; y: number } {
    const cx = Phaser.Math.Clamp(f.x, RAIL, this.api.width - RAIL), cy = Phaser.Math.Clamp(f.y, RAIL, this.api.height - RAIL);
    if (side === 'left') return { x: RAIL, y: cy };
    if (side === 'right') return { x: this.api.width - RAIL, y: cy };
    if (side === 'top') return { x: cx, y: RAIL };
    return { x: cx, y: this.api.height - RAIL };
  }

  /** Direction of travel along the current wall, clockwise positive. */
  private wallHeading(s: Side): number {
    const d = s.wallDir;
    if (s.wall === 'top') return d > 0 ? 0 : Math.PI;
    if (s.wall === 'right') return d > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (s.wall === 'bottom') return d > 0 ? Math.PI : 0;
    return d > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  private updateSlink(owner: ClayOwner): void {
    const s = this.side(owner);
    if (s.slink === 'none' || s.fused) return;
    const f = this.fighter(owner);
    const b = this.body(f);
    if (s.slink === 'launch') {
      const p = this.wallPoint(s.wall, f);
      const dx = p.x - f.x, dy = p.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d <= 14) {
        f.setPosition(p.x, p.y);
        s.slink = 'wall';
        this.fx(owner).wallSplat(p.x, p.y, this.wallHeading(s));
        this.api.scene.cameras.main.shake(90, 0.003);
      } else {
        b.setVelocity((dx / d) * SLINK_LAUNCH_SPEED, (dy / d) * SLINK_LAUNCH_SPEED);
      }
      return;
    }
    // Read the velocity the arena produced from WASD and project it onto the wall: ordinary
    // controls, but leaving the edge is physically impossible.
    if (owner === 'player') {
      const desired = s.wall === 'top' || s.wall === 'bottom' ? b.velocity.x : b.velocity.y;
      if (Math.abs(desired) > 20) {
        if (s.wall === 'top' || s.wall === 'right') s.wallDir = desired > 0 ? 1 : -1;
        else s.wallDir = desired < 0 ? 1 : -1;
      }
    }
    const minX = RAIL, maxX = this.api.width - RAIL, minY = RAIL, maxY = this.api.height - RAIL;
    if (s.wall === 'top') {
      f.y = minY; b.setVelocity(s.wallDir * SLINK_SPEED, 0);
      if ((s.wallDir > 0 && f.x >= maxX - 3) || (s.wallDir < 0 && f.x <= minX + 3)) s.wall = s.wallDir > 0 ? 'right' : 'left';
    } else if (s.wall === 'right') {
      f.x = maxX; b.setVelocity(0, s.wallDir * SLINK_SPEED);
      if ((s.wallDir > 0 && f.y >= maxY - 3) || (s.wallDir < 0 && f.y <= minY + 3)) s.wall = s.wallDir > 0 ? 'bottom' : 'top';
    } else if (s.wall === 'bottom') {
      f.y = maxY; b.setVelocity(-s.wallDir * SLINK_SPEED, 0);
      if ((s.wallDir > 0 && f.x <= minX + 3) || (s.wallDir < 0 && f.x >= maxX - 3)) s.wall = s.wallDir > 0 ? 'left' : 'right';
    } else {
      f.x = minX; b.setVelocity(0, -s.wallDir * SLINK_SPEED);
      if ((s.wallDir > 0 && f.y <= minY + 3) || (s.wallDir < 0 && f.y >= maxY - 3)) s.wall = s.wallDir > 0 ? 'top' : 'bottom';
    }
  }

  private leaveWall(owner: ClayOwner): void {
    const s = this.side(owner);
    if (s.slink === 'none') return;
    const f = this.fighter(owner);
    if (s.slink === 'wall') this.fx(owner).clods(f.x, f.y, 6, 120, 400);
    s.slink = 'none';
    this.body(f).stop();
    this.avatar(owner)?.setHold(null);
  }

  // ── Fuse ──────────────────────────────────────────────────────────────────

  private enterFuse(owner: ClayOwner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.fusing = false;
    s.fused = true;
    s.hitsLeft = FUSE_HITS;
    s.dashTarget = null;
    const absorber: Fighter['fuseHitAbsorber'] = () => {
      if (!s.fused) return false;
      s.hitsLeft = Math.max(0, s.hitsLeft - 1);
      this.applyFrenzy(owner);
      this.api.spawnHitFlash(f.x, f.y, CLAY.light);
      this.fx(owner).clods(f.x, f.y, 5, 120, 420);
      this.announce(f.x, f.y - 56, `${s.hitsLeft} LAYERS`, '#c38352', 11, 700);
      if (s.hitsLeft <= 0) this.endFuse(owner, false);
      return true;
    };
    s.fuseAbsorber = absorber;
    f.fuseHitAbsorber = absorber;
    f.knockbackImmune = true;
    f.claySizeMult = FUSE_SIZE;
    f.applySizeMult();
    f.setHealthBarVisible(false);
    this.api.purgeDebuffs(f);
    this.fx(owner).merge(f.x, f.y);
    this.api.scene.cameras.main.shake(200, 0.008);
    this.announce(f.x, f.y - 58, '🗿 FUSED · 8 LAYERS', '#f3d7ae', 13, 1300);
    Sfx.playAt('stone-slam', f.x, { rate: 0.7, volume: 0.9 });
  }

  private applyFrenzy(owner: ClayOwner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const lost = FUSE_HITS - s.hitsLeft;
    f.claySizeMult = this.up(owner, 'q') ? FUSE_SIZE * Math.pow(FRENZY_SIZE, lost) : FUSE_SIZE;
    f.applySizeMult();
  }

  private updateFuse(owner: ClayOwner): void {
    const s = this.side(owner);
    if (!s.fused) return;
    const f = this.fighter(owner);
    f.knockbackImmune = true;
    f.setHealthBarVisible(false);
    this.api.purgeDebuffs(f);
    // A bot cannot press the form's recast; it splits on its own once the body is nearly spent,
    // which is the moment a player would — six shards a layer are worth more than two hits.
    if (owner === 'npc' && this.api.npcAutonomous && s.hitsLeft <= 2) { this.endFuse(owner, true); return; }
    if (!s.dashTarget) return;
    const dx = s.dashTarget.x - f.x, dy = s.dashTarget.y - f.y;
    const d = Math.hypot(dx, dy);
    if (Phaser.Math.Distance.Between(s.lastPuddleX, s.lastPuddleY, f.x, f.y) >= PUDDLE_GAP) {
      this.dropPuddle(owner, f.x, f.y);
      s.lastPuddleX = f.x;
      s.lastPuddleY = f.y;
    }
    if (d <= 18) {
      f.setPosition(s.dashTarget.x, s.dashTarget.y);
      this.body(f).stop();
      s.dashTarget = null;
      this.dropPuddle(owner, f.x, f.y);
      this.slam(owner, f.x, f.y, 0);
      this.avatar(owner)?.play('slam');
      return;
    }
    this.body(f).setVelocity((dx / d) * FUSE_DASH_SPEED, (dy / d) * FUSE_DASH_SPEED);
  }

  private endFuse(owner: ClayOwner, split: boolean): void {
    const s = this.side(owner);
    if (!s.fused && !s.fusing) return;
    const f = this.fighter(owner);
    const remaining = s.fused ? s.hitsLeft : 0;
    s.fused = false;
    s.fusing = false;
    s.dashTarget = null;
    s.leap = null;
    if (s.fuseAbsorber && f.fuseHitAbsorber === s.fuseAbsorber) f.fuseHitAbsorber = null;
    s.fuseAbsorber = null;
    f.knockbackImmune = false;
    f.claySizeMult = 1;
    f.applySizeMult();
    f.setHealthBarVisible(true);
    const g = this.golem(owner);
    g.x = this.clampX(f.x + (owner === 'player' ? 52 : -52));
    g.y = f.y;
    g.mood = 'idle';
    g.moodUntil = 0;
    g.hiddenUntil = this.now + 200;
    if (split && remaining > 0) {
      this.spawnRadial(owner, f.x, f.y, remaining * 6, Math.random());
      this.announce(f.x, f.y - 58, `SPLIT · ${remaining * 6} SHARDS`, '#f3d7ae', 13, 1300);
      this.api.scene.cameras.main.shake(220, 0.009);
    }
    this.fx(owner).burst(f.x, f.y, 82, 14, this.mastered(owner));
    this.avatar(owner)?.play('clap');
    Sfx.playAt('rock-throw', f.x, { rate: 0.9, volume: 0.8 });
  }

  private dropPuddle(owner: ClayOwner, x: number, y: number): void {
    this.puddles.push({ owner, x, y, until: this.now + PUDDLE_MS, seed: Math.random() * 100 });
  }

  // ── Slipstream and the Bedrock leap ───────────────────────────────────────

  private updateSlipstream(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!this.up(owner, 'f')) { s.slipstreamCharges = 3; s.slipstreamNextAt = 0; return; }
    if (s.slipstreamCharges >= 3 || s.slipstreamNextAt <= 0 || time < s.slipstreamNextAt) return;
    s.slipstreamCharges++;
    s.slipstreamNextAt = s.slipstreamCharges < 3 ? time + 1000 * this.getDodgeCooldownMult(owner) : 0;
  }

  /** Slipstream (F+): the arena asks before a Space press whether a stored dash is available. */
  hasSlipstreamCharge(owner: ClayOwner = 'player'): boolean {
    return this.isClay(owner) && this.up(owner, 'f') && this.side(owner).slipstreamCharges > 0;
  }

  consumeSlipstreamCharge(owner: ClayOwner = 'player'): boolean {
    const s = this.side(owner);
    if (!this.hasSlipstreamCharge(owner)) return false;
    s.slipstreamCharges--;
    if (s.slipstreamNextAt <= 0) s.slipstreamNextAt = this.now + 1000 * this.getDodgeCooldownMult(owner);
    return true;
  }

  /** Bedrock: the fused crash recharges three times slower than an ordinary dash. */
  getDodgeCooldownMult(owner: ClayOwner = 'player'): number {
    return this.mastered(owner) && this.side(owner).fused ? LEAP_CD_MULT : 1;
  }

  /** Bedrock: a fused Space is a leap to the cursor ending in a stunning slam. Returns false to leave the ordinary dash. */
  startBedrockLeap(owner: ClayOwner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    if (!this.mastered(owner) || !s.fused || s.leap) return false;
    const f = this.fighter(owner);
    s.leap = { fromX: f.x, fromY: f.y, toX: this.clampX(tx), toY: this.clampY(ty), startedAt: this.now, until: this.now + LEAP_MS };
    this.body(f).stop();
    this.fx(owner).clods(f.x, f.y, 8, 140, 420, 14, true);
    this.avatar(owner)?.play('raise', undefined, LEAP_MS);
    return true;
  }

  isLeaping(owner: ClayOwner = 'player'): boolean { return !!this.side(owner).leap; }

  private updateLeap(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.leap) return;
    const f = this.fighter(owner);
    const l = s.leap;
    const t = Phaser.Math.Clamp((time - l.startedAt) / (l.until - l.startedAt), 0, 1);
    f.setPosition(Phaser.Math.Linear(l.fromX, l.toX, t), Phaser.Math.Linear(l.fromY, l.toY, t));
    this.body(f).stop();
    if (t < 1) return;
    s.leap = null;
    this.slam(owner, f.x, f.y, LEAP_STUN_MS);
    this.fx(owner).slamShock(f.x, f.y, 150, 13, true);
    this.api.scene.cameras.main.shake(260, 0.012);
    this.avatar(owner)?.play('slam');
  }

  private updateBedrock(owner: ClayOwner): void {
    const f = this.fighter(owner);
    f.clayIncomingMult = 1;
    if (!this.mastered(owner)) return;
    const g = this.golem(owner);
    if (Phaser.Math.Distance.Between(f.x, f.y, g.x, g.y) <= BEDROCK_RANGE) f.clayIncomingMult = BEDROCK_RESIST;
  }

  // ── Give Life ─────────────────────────────────────────────────────────────

  private tryGiveLife(owner: ClayOwner, tx: number, ty: number): void {
    const s = this.side(owner);
    if (!this.mastered(owner) || this.masterySlot(owner) === null || this.now < s.lastGiveLifeAt + GIVE_LIFE_CD || s.lifeDrawing) return;
    const f = this.fighter(owner);
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil) return;
    const a = Math.atan2(ty - f.y, tx - f.x);
    const cx = Phaser.Math.Clamp(f.x + Math.cos(a) * LIFE_REACH, PAD + LIFE_RADIUS, this.api.width - PAD - LIFE_RADIUS);
    const cy = Phaser.Math.Clamp(f.y + Math.sin(a) * LIFE_REACH, PAD + LIFE_RADIUS, this.api.height - PAD - LIFE_RADIUS);
    s.lastGiveLifeAt = this.now;
    s.lifeDrawing = { cx, cy, until: this.now + LIFE_DRAW_MS, budget: LIFE_BUDGET, started: false, lastX: cx, lastY: cy, nodes: [] };
    this.avatar(owner)?.setHold('sow', a);
    this.fx(owner).guidePulse(cx, cy, LIFE_RADIUS);
    Sfx.playAt('craft-complete', cx, { rate: 0.72, volume: 0.6 });
    if (owner === 'player') this.api.broadcastMasteryCast(GIVE_LIFE_ID);
    else {
      // A bot draws a six-pointed star: enough corners to bite hard without being too slow to catch anyone.
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const r = i % 4 === 0 ? 67 : 40;
        s.lifeDrawing.nodes.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      }
      s.lifeDrawing.budget = 0;
    }
  }

  private feedLifeDrawing(owner: ClayOwner, x: number, y: number): void {
    const d = this.side(owner).lifeDrawing;
    if (!d || d.budget <= 0 || Phaser.Math.Distance.Between(x, y, d.cx, d.cy) > LIFE_RADIUS) return;
    if (!d.started) {
      d.started = true; d.lastX = x; d.lastY = y;
      d.nodes.push({ x: x - d.cx, y: y - d.cy });
      d.budget -= LIFE_STEP;
      return;
    }
    const travel = Phaser.Math.Distance.Between(d.lastX, d.lastY, x, y);
    if (travel < LIFE_STEP) return;
    const count = Math.min(Math.floor(travel / LIFE_STEP), Math.floor(d.budget / LIFE_STEP));
    const ux = (x - d.lastX) / travel, uy = (y - d.lastY) / travel;
    for (let i = 1; i <= count; i++) {
      const px = d.lastX + ux * LIFE_STEP * i, py = d.lastY + uy * LIFE_STEP * i;
      if (Phaser.Math.Distance.Between(px, py, d.cx, d.cy) <= LIFE_RADIUS) d.nodes.push({ x: px - d.cx, y: py - d.cy });
    }
    d.lastX += ux * LIFE_STEP * count; d.lastY += uy * LIFE_STEP * count;
    d.budget = Math.max(0, d.budget - count * LIFE_STEP);
  }

  private updateLifeDrawing(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.lifeDrawing) {
      // The bot's cast path: enhancement ids are not in `element.abilities`, so the kit presses it.
      if (owner === 'npc' && this.api.npcAutonomous && this.mastered(owner) && this.masterySlot(owner) && time >= s.lastGiveLifeAt + GIVE_LIFE_CD) {
        const p = this.aimPoint(owner);
        this.tryGiveLife(owner, p.x, p.y);
      }
      return;
    }
    if (time < s.lifeDrawing.until && s.lifeDrawing.budget > 0) return;
    const d = s.lifeDrawing;
    s.lifeDrawing = null;
    this.avatar(owner)?.setHold(null);
    if (d.nodes.length < CREATURE_MIN_NODES) { this.announce(d.cx, d.cy - 30, 'TOO LITTLE CLAY', '#9a7b68'); return; }
    // Sharp means strong: the total turning of the stroke; round means fast: a closed, even loop.
    // Every closed loop turns through 2π in total, so what counts is how much of that turning
    // happens at *corners*: only bends sharper than 20° between beads add to the tally.
    let corners = 0;
    for (let i = 2; i < d.nodes.length; i++) {
      const a = Math.atan2(d.nodes[i - 1].y - d.nodes[i - 2].y, d.nodes[i - 1].x - d.nodes[i - 2].x);
      const b = Math.atan2(d.nodes[i].y - d.nodes[i - 1].y, d.nodes[i].x - d.nodes[i - 1].x);
      corners += Math.max(0, Math.abs(Phaser.Math.Angle.Wrap(b - a)) - 0.35);
    }
    const sharpness = Phaser.Math.Clamp(corners / 8, 0, 1);
    const radii = d.nodes.map((n) => Math.hypot(n.x, n.y));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((a, b) => a + (b - mean) ** 2, 0) / radii.length;
    const last = d.nodes[d.nodes.length - 1];
    const closed = 1 - Phaser.Math.Clamp(Phaser.Math.Distance.Between(d.nodes[0].x, d.nodes[0].y, last.x, last.y) / (LIFE_RADIUS * 1.2), 0, 1);
    const roundness = Phaser.Math.Clamp((1 - Math.sqrt(variance) / Math.max(1, mean)) * closed, 0, 1);
    const damage = Math.round(7 + sharpness * 15);
    const speed = Math.round(120 + roundness * 150);
    this.creatures.push({ owner, x: d.cx, y: d.cy, angle: 0, nodes: d.nodes.slice(0, SHIELD_MAX_NODES), until: time + CREATURE_MS, damage, speed, radius: Phaser.Math.Clamp(mean, 20, 72), nextHitAt: 0, seed: Math.random() * 100 });
    this.fx(owner).wake(d.cx, d.cy);
    this.announce(d.cx, d.cy - 50, `ALIVE · ${damage} DMG · ${speed}px/s`, '#9fd0ff', 11, 1300);
    Sfx.playAt('mutate', d.cx, { rate: 1.1, volume: 0.6 });
  }

  private updateCreatures(dt: number, time: number): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (time >= c.until || c.nodes.length < CREATURE_MIN_NODES) {
        this.fx(c.owner).clods(c.x, c.y, 8, 100, 420, 14, this.mastered(c.owner));
        this.creatures.splice(i, 1);
        continue;
      }
      const target = this.nearestTarget(c.owner, c.x, c.y);
      if (target) {
        const d = Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y);
        c.angle = Math.atan2(target.y - c.y, target.x - c.x);
        if (d > c.radius + 22) {
          c.x += Math.cos(c.angle) * c.speed * dt;
          c.y += Math.sin(c.angle) * c.speed * dt;
        } else if (time >= c.nextHitAt) {
          c.nextHitAt = time + CREATURE_HIT_MS;
          this.hit(c.owner, target, c.damage, c, c.x, c.y);
          this.api.spawnHitFlash(target.x, target.y, CLAY.light);
          this.fx(c.owner).clods(target.x, target.y, 3, 80, 300);
        }
      }
      this.erodeCreature(c);
    }
  }

  private erodeCreature(c: Creature): void {
    const hostile: ClayOwner = c.owner === 'player' ? 'npc' : 'player';
    const erodeAt = (sx: number, sy: number) => {
      c.nodes = c.nodes.filter((n) => {
        const wx = c.x + n.x * Math.cos(c.angle) - n.y * Math.sin(c.angle);
        const wy = c.y + n.x * Math.sin(c.angle) + n.y * Math.cos(c.angle);
        return Phaser.Math.Distance.Between(wx, wy, sx, sy) > 19;
      });
      this.fx(c.owner).splat(sx, sy);
    };
    for (const proj of [...this.api.projectiles.getChildren()] as Projectile[]) {
      if (!proj.active || (c.owner === 'player' ? proj.isFromPlayer : !proj.isFromPlayer)) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, proj.x, proj.y) > c.radius + 12) continue;
      erodeAt(proj.x, proj.y);
      proj.destroy();
      return;
    }
    const shot = this.api.projectileRegistry.within(hostile, c.x, c.y, c.radius + 12)[0];
    if (shot) { erodeAt(shot.getX(), shot.getY()); this.api.projectileRegistry.steal(shot); }
  }

  getGiveLifeCooldownRatio(owner: ClayOwner = 'player'): number {
    return Phaser.Math.Clamp((this.now - this.side(owner).lastGiveLifeAt) / GIVE_LIFE_CD, 0, 1);
  }

  // ── Speed, HUD, painting ─────────────────────────────────────────────────

  private speedMult(owner: ClayOwner): number {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const frenzy = s.fused && this.up(owner, 'q') ? 1 + (FUSE_HITS - s.hitsLeft) * FRENZY_SPEED : 1;
    let m = s.fused ? FUSE_SPEED_MULT * frenzy : 1;
    const other: ClayOwner = owner === 'player' ? 'npc' : 'player';
    if (this.puddles.some((p) => p.owner === other && Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= PUDDLE_RADIUS)) m *= PUDDLE_SLOW;
    return m;
  }
  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private ensureLayers(): void {
    if (!this.groundGfx?.active) this.groundGfx = this.api.scene.add.graphics().setDepth(3);
    if (!this.golemGfx?.active) this.golemGfx = this.api.scene.add.graphics().setDepth(4.6);
    if (!this.airGfx?.active) this.airGfx = this.api.scene.add.graphics().setDepth(8);
    if (!this.hudGfx?.active) this.hudGfx = this.api.scene.add.graphics().setDepth(16);
  }

  private paint(time: number): void {
    const ground = this.groundGfx!, golemG = this.golemGfx!, air = this.airGfx!, hud = this.hudGfx!;
    ground.clear(); golemG.clear(); air.clear(); hud.clear();
    const t = this.t;

    for (const p of this.puddles) drawClayPuddle(ground, this.tint(p.owner), p.x, p.y, PUDDLE_RADIUS, t, Phaser.Math.Clamp((p.until - time) / 900, 0, 1), p.seed);

    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      if (!this.isClay(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const g = this.golem(owner);
      const tint = this.tint(owner);
      const bed = this.mastered(owner);
      if (!s.fused && g.hiddenUntil <= time) {
        drawTether(ground, tint, f.x, f.y + 6, g.x, g.y + 20, t);
        this.paintGolem(owner, golemG, g.x, g.y, t + g.seed, g.seed, s.fusing ? 1.1 : 1, bed, g.mood);
        if (bed) {
          ground.lineStyle(1.5, tint(CLAY.seam), 0.25 + Math.sin(t * 2) * 0.08);
          ground.strokeCircle(g.x, g.y, BEDROCK_RANGE);
        }
      }
      // The shield rope.
      if (s.shield.length) {
        const groups: Record<'fighter' | 'golem', Array<{ x: number; y: number }>> = { fighter: [], golem: [] };
        for (const n of s.shield) groups[n.anchor].push(this.shieldWorld(owner, n));
        for (const pts of [groups.fighter, groups.golem]) if (pts.length) drawClayRope(air, tint, pts, 11, 1, bed);
      }
      if (s.drawing) {
        drawGuide(air, tint, f.x, f.y, CLOT_RADIUS, t);
        if (this.up(owner, 'r') && !s.fused) drawGuide(air, tint, g.x, g.y, CLOT_RADIUS, t);
        const groups: Record<'fighter' | 'golem', Array<{ x: number; y: number }>> = { fighter: [], golem: [] };
        for (const n of s.drawing.nodes) {
          const c = n.anchor === 'golem' && !s.fused ? g : f;
          groups[n.anchor].push({ x: c.x + n.x, y: c.y + n.y });
        }
        for (const pts of [groups.fighter, groups.golem]) if (pts.length) drawClayRope(air, tint, pts, 11, 0.95, bed);
        drawClayBar(hud, tint, f.x, f.y - 60, s.drawing.budget / CLOT_BUDGET, 1, t);
      }
      if (s.lifeDrawing) {
        const d = s.lifeDrawing;
        drawGuide(air, tint, d.cx, d.cy, LIFE_RADIUS, t);
        if (d.nodes.length) drawClayRope(air, tint, d.nodes.map((n) => ({ x: d.cx + n.x, y: d.cy + n.y })), 11, 0.95, bed);
        drawClayBar(hud, tint, f.x, f.y - 76, d.budget / LIFE_BUDGET, 1, t);
      }
      if (s.slink === 'wall') drawWallSmear(air, tint, f.x, f.y, this.wallHeading(s), t);
      if (this.up(owner, 'f') && owner === 'player') {
        drawSlipPips(hud, tint, f.x + 7, f.y - 86, s.slipstreamCharges, 3, t);
      }
      if (s.leap) {
        const l = s.leap;
        const p = Phaser.Math.Clamp((time - l.startedAt) / (l.until - l.startedAt), 0, 1);
        const lift = Math.sin(p * Math.PI) * 48;
        air.lineStyle(2, tint(CLAY.guideLit), 0.5);
        air.lineBetween(l.fromX, l.fromY, l.toX, l.toY);
        air.lineStyle(2, tint(CLAY.seam), 0.6 + p * 0.4);
        air.strokeCircle(l.toX, l.toY, 20 + p * 100);
        ground.fillStyle(tint(CLAY.wet), 0.4);
        ground.fillEllipse(f.x, f.y + 18, 50 - lift * 0.4, 16 - lift * 0.14);
        // The rig stays on the body; the body itself is drawn lifted.
        this.paintGolem(owner, air, f.x, f.y - lift, t, 7, 0.9, bed, 'rush');
      }
    }

    for (const sh of this.shards) clayShard(air, this.tint(sh.owner), sh.x, sh.y, sh.angle, 1, 1, this.mastered(sh.owner));
    for (const sh of this.orbitShards) clayShard(air, this.tint(sh.owner), sh.x, sh.y, sh.angle + Math.PI / 2, 1, 0.9, this.mastered(sh.owner));
    for (const c of this.creatures) drawCreature(air, this.tint(c.owner), c.x, c.y, c.angle, c.nodes, t + c.seed, Phaser.Math.Clamp((c.until - time) / 900, 0, 1), this.mastered(c.owner));
  }

  private updateHud(): void {
    const on = this.api.elementId === 'clay';
    const s = this.side('player');
    this.api.setStatusIndicator('clay-golem', on && !s.fused ? {
      name: 'Gooey Golem', emoji: '🗿', color: CLAY.body, priority: 150,
      description: 'Your immortal golem follows the cursor, swallows every shot that touches it, and does the slamming and the rupturing.',
    } : null);
    this.api.setStatusIndicator('clay-slink', on && s.slink !== 'none' ? {
      name: 'Slink', emoji: '🪱', color: CLAY.light, count: Math.max(0, SLINK_BURSTS - s.slinkBursts), suffix: ' barrages', priority: 112,
      description: 'Bound to the arena edge. Click fires an eight-shard barrage; F drops you off.',
    } : null);
    this.api.setStatusIndicator('clay-fuse', on && s.fused ? {
      name: 'Fused', emoji: '🗿', color: CLAY.light, count: s.hitsLeft, suffix: ' layers', priority: 113,
      description: 'Every hit takes one layer, whatever its size. No effect can take hold. Q splits: six shards a layer.',
    } : null);
    this.api.setStatusIndicator('clay-shield', on && s.shield.length > 0 ? {
      name: 'Clay Clot', emoji: '🏺', color: CLAY.guide, count: s.shield.length, suffix: ' clay', priority: 111,
      description: 'Your drawing orbits you. A shot destroys only the clay around where it lands.',
    } : null);
    this.api.setStatusIndicator('clay-dashes', on && this.up('player', 'f') ? {
      name: 'Slipstream', emoji: '💨', color: CLAY.guide, count: s.slipstreamCharges, suffix: ' dashes', priority: 110,
      description: 'Stored Space dashes. They refill one at a time.',
    } : null);
    const alive = this.creatures.filter((c) => c.owner === 'player').length;
    this.api.setStatusIndicator('clay-life', on && alive > 0 ? {
      name: 'Living Clay', emoji: '🗿', color: CLAY.guideLit, count: alive, suffix: ' alive', priority: 114,
      description: 'Your drawn creatures hunt. Shots wear away only the clay they strike.',
    } : null);
  }

  private clearHud(): void {
    for (const id of ['clay-golem', 'clay-slink', 'clay-fuse', 'clay-shield', 'clay-dashes', 'clay-life']) this.api.setStatusIndicator(id, null);
  }

  // ── Cross-cutting contracts ──────────────────────────────────────────────

  purgeSummons(x: number, y: number, radius: number, exceptOwner: ClayOwner, report?: (px: number, py: number) => void): number {
    let razed = 0;
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.owner === exceptOwner || Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      this.fx(c.owner).clods(c.x, c.y, 8, 120, 420);
      this.creatures.splice(i, 1);
      report?.(c.x, c.y);
      razed++;
    }
    return razed;
  }

  revertForms(f: Fighter): string[] {
    const owner: ClayOwner | null = f === this.api.player ? 'player' : f === this.api.npc ? 'npc' : null;
    if (!owner) return [];
    const out: string[] = [];
    const s = this.side(owner);
    if (s.fused || s.fusing) { this.endFuse(owner, false); out.push('Fuse'); }
    if (s.slink !== 'none') { this.leaveWall(owner); out.push('Slink'); }
    return out;
  }

  // ── Reads for the bot ────────────────────────────────────────────────────

  isFused(owner: ClayOwner): boolean { return this.side(owner).fused; }
  isFusing(owner: ClayOwner): boolean { return this.side(owner).fusing; }
  isSlinking(owner: ClayOwner): boolean { return this.side(owner).slink !== 'none'; }
  slinkBurstsLeft(owner: ClayOwner): number { return Math.max(0, SLINK_BURSTS - this.side(owner).slinkBursts); }
  shieldPieces(owner: ClayOwner): number { return this.side(owner).shield.length; }
  fuseHitsLeft(owner: ClayOwner): number { return this.side(owner).hitsLeft; }
  npcGiveLifeSlot(): MasterySlot | null { return this.mastered('npc') ? this.masterySlot('npc') : null; }
  /** The golem stands on the target: a Slam pressed now lands. */
  golemOnTarget(owner: ClayOwner): boolean {
    const g = this.side(owner).golem;
    if (!g || this.side(owner).fused) return false;
    const t = this.nearestTarget(owner, g.x, g.y);
    return !!t && Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) <= SLAM_RADIUS * 0.8;
  }
  /** Hostile shots close enough to the owner that a shield drawn now will meet them. */
  shotsIncoming(owner: ClayOwner): number {
    const f = this.fighter(owner);
    let n = 0;
    for (const proj of this.api.projectiles.getChildren() as Projectile[]) {
      if (!proj.active) continue;
      const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (hostile && Phaser.Math.Distance.Between(f.x, f.y, proj.x, proj.y) <= 260) n++;
    }
    n += this.api.projectileRegistry.within(owner === 'player' ? 'npc' : 'player', f.x, f.y, 260).length;
    return n;
  }
}
