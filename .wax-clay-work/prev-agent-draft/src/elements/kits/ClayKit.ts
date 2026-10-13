import Phaser from 'phaser';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { CustomStatus } from './StatusHudKit';

export type ClayOwner = 'player' | 'npc';
type WallSide = 'top' | 'right' | 'bottom' | 'left';

const CLAY = 0x9a5c32;
const CLAY_DARK = 0x57321f;
const CLAY_LIGHT = 0xc38352;
const CLAY_WET = 0x704128;
const GUIDE = 0x4e9cff;
const PAD = 30;

const GOLEM_SPEED = 285;
const GOLEM_RADIUS = 35;
const GOLEM_FOLLOW_EASE = 9;
const SLAM_RADIUS = 118;
const SLAM_DAMAGE = 20;
const SHARD_DAMAGE = 25;
const SHARD_SPEED = 475;
const SHARD_RADIUS = 11;
const SHARD_LIFE = 1800;
const CLOT_MS = 3000;
const CLOT_RADIUS = 148;
const CLOT_CLAY = 280;
const CLOT_STEP = 9;
const SHIELD_NODE_RADIUS = 13;
const SHIELD_DAMAGE_RADIUS = 24;
const SHIELD_SPIN = 0.62;
const SLINK_SPEED = 650;
const SLINK_LAUNCH_SPEED = 900;
const FUSE_SPEED_MULT = 1.35;
const FUSE_HITS = 8;
const FUSE_DASH_SPEED = 920;
const PUDDLE_RADIUS = 44;
const PUDDLE_MS = 5500;
const PUDDLE_SLOW = 0.55;
const ORBIT_MS = 6000;
const ORBIT_RADIUS = 62;
const GIVE_LIFE_ID = 'give-life';
const GIVE_LIFE_CD = 6000;
const LIFE_DRAW_MS = 3000;
const LIFE_RADIUS = 82;
const LIFE_CLAY = 190;
const LIFE_STEP = 8;
const CREATURE_MS = 12000;
const BEDROCK_RANGE = 175;

interface ClayGolem {
  x: number;
  y: number;
  hiddenUntil: number;
  wobble: number;
}

interface DrawSession {
  until: number;
  clayLeft: number;
  lastX: number;
  lastY: number;
  started: boolean;
  nodes: ShieldNode[];
}

interface ShieldNode {
  /** Local coordinates relative to the caster or golem when the line was drawn. */
  x: number;
  y: number;
  anchor: 'fighter' | 'golem';
}

interface OrbitShard {
  owner: ClayOwner;
  angle: number;
  until: number;
  x: number;
  y: number;
  reg: RegisteredProjectile | null;
}

interface LifeDraw {
  centerX: number;
  centerY: number;
  until: number;
  clayLeft: number;
  started: boolean;
  lastX: number;
  lastY: number;
  nodes: Array<{ x: number; y: number }>;
}

interface ClayCreature {
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
}

interface ClayShard {
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

interface ClayPuddle {
  owner: ClayOwner;
  x: number;
  y: number;
  until: number;
  seed: number;
}

interface Burst {
  x: number;
  y: number;
  started: number;
  until: number;
  radius: number;
  color: number;
}

interface ClaySide {
  golem: ClayGolem | null;
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
  savedAbsoluteAbsorber: Fighter['absoluteDamageAbsorber'];
  fuseAbsorber: Fighter['absoluteDamageAbsorber'];
  dashTarget: { x: number; y: number } | null;
  lastPuddleX: number;
  lastPuddleY: number;
  slipstreamCharges: number;
  slipstreamNextAt: number;
  lifeDrawing: LifeDraw | null;
  lastGiveLifeAt: number;
  leap: { fromX: number; fromY: number; toX: number; toY: number; started: number; until: number } | null;
}

function makeSide(): ClaySide {
  return {
    golem: null,
    drawing: null,
    shield: [],
    shieldAngle: 0,
    slink: 'none',
    wall: 'top',
    wallDir: 1,
    slinkBursts: 0,
    fused: false,
    fusing: false,
    hitsLeft: FUSE_HITS,
    savedAbsoluteAbsorber: null,
    fuseAbsorber: null,
    dashTarget: null,
    lastPuddleX: 0,
    lastPuddleY: 0,
    slipstreamCharges: 3,
    slipstreamNextAt: 0,
    lifeDrawing: null,
    lastGiveLifeAt: -GIVE_LIFE_CD,
    leap: null,
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
  get width(): number;
  get height(): number;
  get npcAutonomous(): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  purgeDebuffs(fighter: Fighter): number;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: 'e' | 'r' | 'f' | 'q'): string | null;
  npcMasteryBindFor(slot: 'e' | 'r' | 'f' | 'q'): string | null;
  recordMasteryStat(key: string, amount: number): void;
  broadcastMasteryCast(enhId: string): void;
}

/**
 * Clay is a two-body element. The fighter owns the keys; the cursor owns the larger, immortal
 * golem. Everything here is kept as lightweight records and painted through three Graphics
 * layers so custom shield drawings and dozens of piercing shards do not need physics bodies.
 */
export class ClayKit {
  private readonly api: ClayArenaApi;
  private sides: Record<ClayOwner, ClaySide> = { player: makeSide(), npc: makeSide() };
  private shards: ClayShard[] = [];
  private orbitShards: OrbitShard[] = [];
  private creatures: ClayCreature[] = [];
  private puddles: ClayPuddle[] = [];
  private bursts: Burst[] = [];
  private worldGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private aimX = 0;
  private aimY = 0;

  constructor(api: ClayArenaApi) {
    this.api = api;
  }

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: ClayOwner): ClaySide { return this.sides[owner]; }
  private fighter(owner: ClayOwner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private isClay(owner: ClayOwner): boolean {
    return owner === 'player' ? this.api.elementId === 'clay' : this.api.npcElementId === 'clay';
  }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private targets(owner: ClayOwner): Fighter[] {
    return (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter((f) => !!f && f.active && f.hp > 0);
  }
  private upgraded(owner: ClayOwner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }
  private mastered(owner: ClayOwner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }
  private masterySlot(owner: ClayOwner): 'e' | 'r' | 'f' | 'q' | null {
    for (const slot of ['e', 'r', 'f', 'q'] as const) {
      const id = owner === 'player' ? this.api.masteryBindFor(slot) : this.api.npcMasteryBindFor(slot);
      if (id === GIVE_LIFE_ID) return slot;
    }
    return null;
  }

  reset(): void {
    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (f) {
        if (s.fuseAbsorber && f.absoluteDamageAbsorber === s.fuseAbsorber) {
          f.absoluteDamageAbsorber = s.savedAbsoluteAbsorber;
        }
        f.effectsImmune = false;
        f.clayIncomingMult = 1;
        f.claySizeMult = 1;
        f.applySizeMult();
        f.setHealthBarVisible(true);
      }
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const shard of this.shards) if (shard.reg) this.api.projectileRegistry.remove(shard.reg);
    this.shards = [];
    for (const shard of this.orbitShards) if (shard.reg) this.api.projectileRegistry.remove(shard.reg);
    this.orbitShards = [];
    this.creatures = [];
    this.puddles = [];
    this.bursts = [];
    this.worldGfx?.destroy(); this.worldGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.aimX = 0;
    this.aimY = 0;
    this.clearStatuses();
  }

  handleInput(_time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'clay') return;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const s = this.side('player');
    const p = this.api.player;
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (s.lifeDrawing) {
      if (pointer.isDown) this.feedLifeDrawing('player', mouseX, mouseY);
      return;
    }

    if (s.drawing) {
      if (pointer.isDown) this.feedDrawing('player', mouseX, mouseY);
      return;
    }
    if (s.fusing) return;

    const giveLifeSlot = this.masterySlot('player');
    const giveLifePressed = (giveLifeSlot === 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey))
      || (giveLifeSlot === 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey))
      || (giveLifeSlot === 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey))
      || (giveLifeSlot === 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey));
    if (giveLifePressed) {
      this.tryGiveLife('player', mouseX, mouseY);
      return;
    }

    // Recasts deliberately bypass the cooldown stamped by the first cast: these presses end
    // a form rather than starting the ability a second time.
    if (s.fused && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      this.endFuse('player', true);
      return;
    }
    if (!s.fused && s.slink !== 'none' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      this.leaveWall('player');
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (clicked) p.castAbility('clay-slam', ctx);
    if (giveLifeSlot !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('clay-rupture', ctx);
    if (giveLifeSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('clay-clot', ctx);
    if (giveLifeSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('clay-slink', ctx);
    if (giveLifeSlot !== 'q' && !s.fused && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('clay-fuse', ctx);
  }

  doSlam(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    if (s.slink === 'wall' && !s.fused) {
      if (s.slinkBursts >= 3) return;
      s.slinkBursts++;
      const f = this.fighter(owner);
      const target = owner === 'player'
        ? { x: this.aimX, y: this.aimY }
        : this.targetPoint(owner);
      this.spawnBarrage(owner, f.x, f.y, target.x, target.y);
      this.api.showFloatingText(f.x, f.y - 45, `${3 - s.slinkBursts} barrages`, '#c38352');
      // A bot cannot issue the cooldown-bypassing form recast available to a real keyboard,
      // so peel it off the wall once it has spent the last useful click.
      if (owner === 'npc' && s.slinkBursts >= 3) this.leaveWall(owner);
      return;
    }

    const source = s.fused ? this.fighter(owner) : this.ensureGolem(owner);
    if (!source) return;
    this.slam(owner, source.x, source.y);
    if (this.upgraded(owner, 'click')) this.spawnRadial(owner, source.x, source.y, 3);
  }

  doRupture(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const source = s.fused ? this.fighter(owner) : this.ensureGolem(owner);
    if (!source) return;
    this.spawnRadial(owner, source.x, source.y, 8);
    if (this.upgraded(owner, 'e')) this.spawnOrbitShards(owner, 3);
    this.bursts.push({ x: source.x, y: source.y, started: this.now, until: this.now + 420, radius: 80, color: CLAY_LIGHT });
    if (!s.fused && s.golem) s.golem.hiddenUntil = this.now + 420;
  }

  doClot(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.shield = [];
    s.drawing = {
      until: this.now + CLOT_MS,
      clayLeft: CLOT_CLAY,
      lastX: f.x,
      lastY: f.y,
      started: false,
      nodes: [],
    };

    // A bot has no pointer. Give it a deliberately imperfect double crescent; it is still the
    // same dynamic node shield and wears away at the exact places shots touch it.
    if (owner === 'npc') {
      for (let i = 0; i < 42; i++) {
        const a = -Math.PI * 0.82 + (i / 41) * Math.PI * 1.64;
        const r = i % 2 ? 104 : 118;
        s.drawing.nodes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, anchor: 'fighter' });
      }
      if (this.upgraded(owner, 'r') && !s.fused) {
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI * 0.8 + (i / 25) * Math.PI * 1.6;
          s.drawing.nodes.push({ x: Math.cos(a) * 84, y: Math.sin(a) * 84, anchor: 'golem' });
        }
      }
      s.drawing.clayLeft = 0;
    }
  }

  doSlink(owner: ClayOwner, tx: number, ty: number): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    if (s.fused) {
      if (s.dashTarget) return;
      const f = this.fighter(owner);
      s.dashTarget = {
        x: Phaser.Math.Clamp(tx, PAD, this.api.width - PAD),
        y: Phaser.Math.Clamp(ty, PAD, this.api.height - PAD),
      };
      s.lastPuddleX = f.x;
      s.lastPuddleY = f.y;
      this.dropPuddle(owner, f.x, f.y);
      return;
    }
    if (s.slink !== 'none') {
      this.leaveWall(owner);
      return;
    }
    const f = this.fighter(owner);
    s.wall = this.nearestWall(f.x, f.y);
    s.wallDir = owner === 'player' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    s.slink = 'launch';
    s.slinkBursts = 0;
  }

  doFuse(owner: ClayOwner): void {
    if (!this.isClay(owner)) return;
    const s = this.side(owner);
    if (s.fused) {
      this.endFuse(owner, true);
      return;
    }
    if (s.fusing) return;
    this.leaveWall(owner);
    s.fusing = true;
    s.drawing = null;
    s.shield = [];
    this.api.showFloatingText(this.fighter(owner).x, this.fighter(owner).y - 46, 'FUSING', '#c38352');
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      if (!this.isClay(owner)) {
        if (this.side(owner).fused) this.endFuse(owner, false);
        this.fighter(owner).clayIncomingMult = 1;
        continue;
      }
      this.ensureGolem(owner);
      this.updateGolem(owner, dt);
      this.updateDrawing(owner, time);
      this.updateSlink(owner, dt);
      this.updateFuse(owner, dt);
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
    this.bursts = this.bursts.filter((b) => b.until > time);
    this.paint(time);
    this.updateStatuses();
  }

  private ensureGolem(owner: ClayOwner): ClayGolem {
    const s = this.side(owner);
    if (s.golem) return s.golem;
    const f = this.fighter(owner);
    s.golem = { x: f.x + (owner === 'player' ? 70 : -70), y: f.y, hiddenUntil: 0, wobble: Math.random() * 10 };
    return s.golem;
  }

  private targetPoint(owner: ClayOwner): { x: number; y: number } {
    if (owner === 'player') return { x: this.aimX || this.api.player.x, y: this.aimY || this.api.player.y };
    const t = this.api.getNearestEnemy(this.api.npc.x, this.api.npc.y);
    return { x: t.x, y: t.y };
  }

  private updateGolem(owner: ClayOwner, dt: number): void {
    const s = this.side(owner);
    const g = this.ensureGolem(owner);
    const f = this.fighter(owner);
    if (s.fused) { g.x = f.x; g.y = f.y; return; }
    const target = s.fusing ? { x: f.x, y: f.y } : this.targetPoint(owner);
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    const speed = s.fusing ? 650 : GOLEM_SPEED;
    if (dist > 1) {
      const step = Math.min(dist, speed * dt, dist * GOLEM_FOLLOW_EASE * dt);
      g.x += dx / dist * step;
      g.y += dy / dist * step;
    }
    g.x = Phaser.Math.Clamp(g.x, PAD, this.api.width - PAD);
    g.y = Phaser.Math.Clamp(g.y, PAD, this.api.height - PAD);
    g.wobble += dt * 5;
    if (s.fusing && dist < 22) this.enterFuse(owner);
  }

  private feedDrawing(owner: ClayOwner, x: number, y: number): void {
    const s = this.side(owner);
    const d = s.drawing;
    if (!d || d.clayLeft <= 0) return;
    const f = this.fighter(owner);
    const g = this.ensureGolem(owner);
    const fighterDist = Phaser.Math.Distance.Between(x, y, f.x, f.y);
    const golemDist = Phaser.Math.Distance.Between(x, y, g.x, g.y);
    const canUseGolem = this.upgraded(owner, 'r') && !this.side(owner).fused;
    const anchor: ShieldNode['anchor'] = canUseGolem && golemDist < fighterDist ? 'golem' : 'fighter';
    const cx = anchor === 'golem' ? g.x : f.x;
    const cy = anchor === 'golem' ? g.y : f.y;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.hypot(dx, dy) > CLOT_RADIUS) return;

    if (!d.started) {
      d.started = true;
      d.lastX = x;
      d.lastY = y;
      d.nodes.push({ x: dx, y: dy, anchor });
      d.clayLeft -= CLOT_STEP;
      return;
    }

    const travel = Phaser.Math.Distance.Between(d.lastX, d.lastY, x, y);
    if (travel < CLOT_STEP) return;
    const count = Math.min(Math.floor(travel / CLOT_STEP), Math.floor(d.clayLeft / CLOT_STEP));
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const px = Phaser.Math.Linear(d.lastX, x, t);
      const py = Phaser.Math.Linear(d.lastY, y, t);
      const lx = px - cx;
      const ly = py - cy;
      if (Math.hypot(lx, ly) <= CLOT_RADIUS) d.nodes.push({ x: lx, y: ly, anchor });
    }
    d.lastX = x;
    d.lastY = y;
    d.clayLeft = Math.max(0, d.clayLeft - count * CLOT_STEP);
  }

  private updateDrawing(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.drawing) return;
    if (time < s.drawing.until && s.drawing.clayLeft > 0) return;
    s.shield = s.drawing.nodes.slice(0, 96);
    s.shieldAngle = 0;
    s.drawing = null;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 50, s.shield.length ? 'CLAY SET' : 'NO CLAY DRAWN', s.shield.length ? '#70b7ff' : '#9a7b68');
  }

  private shieldWorld(owner: ClayOwner, n: ShieldNode): { x: number; y: number } {
    const f = this.fighter(owner);
    const g = this.ensureGolem(owner);
    const center = n.anchor === 'golem' && !this.side(owner).fused ? g : f;
    const a = this.side(owner).shieldAngle;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return { x: center.x + n.x * c - n.y * sn, y: center.y + n.x * sn + n.y * c };
  }

  private updateShieldHits(owner: ClayOwner): void {
    const s = this.side(owner);
    if (!s.shield.length) return;
    s.shieldAngle += SHIELD_SPIN / 60;
    const children = [...this.api.projectiles.getChildren()] as Projectile[];
    for (const proj of children) {
      if (!proj.active) continue;
      const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!hostile) continue;
      const hit = s.shield.findIndex((n) => {
        const p = this.shieldWorld(owner, n);
        return Phaser.Math.Distance.Between(p.x, p.y, proj.x, proj.y) <= SHIELD_NODE_RADIUS;
      });
      if (hit < 0) continue;
      const point = this.shieldWorld(owner, s.shield[hit]);
      s.shield = s.shield.filter((n) => {
        const p = this.shieldWorld(owner, n);
        return Phaser.Math.Distance.Between(p.x, p.y, point.x, point.y) > SHIELD_DAMAGE_RADIUS;
      });
      this.api.spawnHitFlash(proj.x, proj.y, CLAY_LIGHT);
      this.bursts.push({ x: proj.x, y: proj.y, started: this.now, until: this.now + 240, radius: 26, color: CLAY });
      this.onShieldHit(owner, point.x, point.y);
      proj.destroy();
    }

    // Newer kits keep some travelling shots outside Phaser's shared group. Sweep the common
    // registry too, so the drawing protects against the whole roster.
    const hostileOwner: ClayOwner = owner === 'player' ? 'npc' : 'player';
    let found = true;
    while (found && s.shield.length) {
      found = false;
      for (const n of s.shield) {
        const p = this.shieldWorld(owner, n);
        const shot = this.api.projectileRegistry.nearest(hostileOwner, p.x, p.y, SHIELD_NODE_RADIUS);
        if (!shot) continue;
        this.api.projectileRegistry.steal(shot);
        s.shield = s.shield.filter((part) => {
          const q = this.shieldWorld(owner, part);
          return Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) > SHIELD_DAMAGE_RADIUS;
        });
        this.api.spawnHitFlash(p.x, p.y, CLAY_LIGHT);
        this.bursts.push({ x: p.x, y: p.y, started: this.now, until: this.now + 240, radius: 26, color: CLAY });
        this.onShieldHit(owner, p.x, p.y);
        found = true;
        break;
      }
    }
  }

  private onShieldHit(owner: ClayOwner, x: number, y: number): void {
    if (owner === 'player') this.api.recordMasteryStat('clotBlocks', 1);
    if (this.upgraded(owner, 'r')) this.spawnRadial(owner, x, y, 3);
  }

  private updateGolemHits(owner: ClayOwner): void {
    const s = this.side(owner);
    const g = s.golem;
    if (!g || s.fused || g.hiddenUntil > this.now) return;
    for (const proj of [...this.api.projectiles.getChildren()] as Projectile[]) {
      if (!proj.active) continue;
      const hostile = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!hostile || Phaser.Math.Distance.Between(g.x, g.y, proj.x, proj.y) > GOLEM_RADIUS) continue;
      const damage = Math.max(0, Math.round(proj.damage ?? 0));
      if (owner === 'player') this.api.recordMasteryStat('golemAbsorbed', damage);
      this.api.spawnHitFlash(g.x, g.y, CLAY_LIGHT);
      this.api.showFloatingText(g.x, g.y - 42, damage > 0 ? `${damage}  ∞` : '∞', '#c38352');
      proj.destroy();
    }
    const hostileOwner: ClayOwner = owner === 'player' ? 'npc' : 'player';
    for (const shot of this.api.projectileRegistry.within(hostileOwner, g.x, g.y, GOLEM_RADIUS)) {
      const damage = Math.max(0, Math.round(shot.damage));
      if (owner === 'player') this.api.recordMasteryStat('golemAbsorbed', damage);
      this.api.spawnHitFlash(g.x, g.y, CLAY_LIGHT);
      this.api.showFloatingText(g.x, g.y - 42, damage > 0 ? `${damage}  ∞` : '∞', '#c38352');
      this.api.projectileRegistry.steal(shot);
    }
  }

  private slam(owner: ClayOwner, x: number, y: number, stunMs = 0): void {
    this.bursts.push({ x, y, started: this.now, until: this.now + 520, radius: SLAM_RADIUS, color: CLAY });
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > SLAM_RADIUS) continue;
      t.lastDamageOwner = owner;
      const wasAlive = t.hp > 0;
      t.takeDamage(SLAM_DAMAGE, { source: this, sourceX: x, sourceY: y, aoe: true });
      if (stunMs > 0 && t.hp > 0) {
        t.applyDisarm(stunMs);
        t.mobilityBlockedUntil = Math.max(t.mobilityBlockedUntil, this.now + stunMs);
      }
      this.trackFusionKill(owner, wasAlive, t);
      this.api.spawnHitFlash(t.x, t.y, CLAY_LIGHT);
      const b = this.body(t);
      const ang = Math.atan2(t.y - y, t.x - x);
      b.setVelocity(Math.cos(ang) * 250, Math.sin(ang) * 250);
    }
  }

  private trackFusionKill(owner: ClayOwner, wasAlive: boolean, target: Fighter): void {
    if (owner === 'player' && this.side(owner).fused && wasAlive && target.hp <= 0) {
      this.api.recordMasteryStat('fusionKills', 1);
    }
  }

  private spawnRadial(owner: ClayOwner, x: number, y: number, count: number): void {
    const offset = count === 8 ? Math.PI / 8 : 0;
    for (let i = 0; i < count; i++) {
      const a = offset + i / count * Math.PI * 2;
      this.spawnShard(owner, x, y, a);
    }
  }

  private spawnBarrage(owner: ClayOwner, x: number, y: number, tx: number, ty: number): void {
    const base = Math.atan2(ty - y, tx - x);
    for (let i = 0; i < 8; i++) this.spawnShard(owner, x, y, base + (i - 3.5) * 0.065);
  }

  private spawnShard(owner: ClayOwner, x: number, y: number, angle: number): void {
    const shard: ClayShard = {
      owner, x, y, angle,
      vx: Math.cos(angle) * SHARD_SPEED,
      vy: Math.sin(angle) * SHARD_SPEED,
      until: this.now + SHARD_LIFE,
      hits: new Set<Fighter>(),
      reg: null,
    };
    shard.reg = {
      owner,
      getX: () => shard.x,
      getY: () => shard.y,
      damage: SHARD_DAMAGE,
      steal: () => this.removeShard(shard),
    };
    this.shards.push(shard);
    this.api.projectileRegistry.add(shard.reg);
  }

  private removeShard(shard: ClayShard): void {
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
        this.removeShard(s);
        continue;
      }
      for (const t of this.targets(s.owner)) {
        if (s.hits.has(t) || Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > SHARD_RADIUS + 22) continue;
        s.hits.add(t);
        t.lastDamageOwner = s.owner;
        const wasAlive = t.hp > 0;
        t.takeDamage(SHARD_DAMAGE, { source: s, sourceX: s.x, sourceY: s.y, pierce: true });
        if (s.owner === 'player') this.api.recordMasteryStat('shardHits', 1);
        this.trackFusionKill(s.owner, wasAlive, t);
        this.api.spawnHitFlash(t.x, t.y, CLAY_LIGHT);
      }
    }
  }

  private spawnOrbitShards(owner: ClayOwner, count: number): void {
    for (const shard of [...this.orbitShards]) if (shard.owner === owner) this.removeOrbitShard(shard);
    for (let i = 0; i < count; i++) {
      const shard: OrbitShard = { owner, angle: i / count * Math.PI * 2, until: this.now + ORBIT_MS, x: 0, y: 0, reg: null };
      shard.reg = { owner, getX: () => shard.x, getY: () => shard.y, damage: SHARD_DAMAGE, steal: () => this.removeOrbitShard(shard) };
      this.orbitShards.push(shard);
      this.api.projectileRegistry.add(shard.reg);
    }
  }

  private removeOrbitShard(shard: OrbitShard): void {
    if (shard.reg) this.api.projectileRegistry.remove(shard.reg);
    const i = this.orbitShards.indexOf(shard);
    if (i >= 0) this.orbitShards.splice(i, 1);
  }

  private updateOrbitShards(dt: number, time: number): void {
    for (let i = this.orbitShards.length - 1; i >= 0; i--) {
      const shard = this.orbitShards[i];
      if (time >= shard.until || !this.isClay(shard.owner)) { this.removeOrbitShard(shard); continue; }
      const side = this.side(shard.owner);
      const center = side.fused ? this.fighter(shard.owner) : this.ensureGolem(shard.owner);
      shard.angle += dt * 3.1;
      shard.x = center.x + Math.cos(shard.angle) * ORBIT_RADIUS;
      shard.y = center.y + Math.sin(shard.angle) * ORBIT_RADIUS;
      const target = this.targets(shard.owner).find((t) => Phaser.Math.Distance.Between(shard.x, shard.y, t.x, t.y) <= SHARD_RADIUS + 22);
      if (!target) continue;
      const wasAlive = target.hp > 0;
      target.lastDamageOwner = shard.owner;
      target.takeDamage(SHARD_DAMAGE, { source: shard, sourceX: shard.x, sourceY: shard.y, pierce: true });
      if (shard.owner === 'player') this.api.recordMasteryStat('shardHits', 1);
      this.trackFusionKill(shard.owner, wasAlive, target);
      this.api.spawnHitFlash(target.x, target.y, CLAY_LIGHT);
      this.removeOrbitShard(shard);
    }
  }

  private nearestWall(x: number, y: number): WallSide {
    const options: Array<[WallSide, number]> = [
      ['left', x - PAD], ['right', this.api.width - PAD - x],
      ['top', y - PAD], ['bottom', this.api.height - PAD - y],
    ];
    options.sort((a, b) => a[1] - b[1]);
    return options[0][0];
  }

  private wallPoint(side: WallSide, f: Fighter): { x: number; y: number } {
    if (side === 'left') return { x: PAD, y: Phaser.Math.Clamp(f.y, PAD, this.api.height - PAD) };
    if (side === 'right') return { x: this.api.width - PAD, y: Phaser.Math.Clamp(f.y, PAD, this.api.height - PAD) };
    if (side === 'top') return { x: Phaser.Math.Clamp(f.x, PAD, this.api.width - PAD), y: PAD };
    return { x: Phaser.Math.Clamp(f.x, PAD, this.api.width - PAD), y: this.api.height - PAD };
  }

  private updateSlink(owner: ClayOwner, _dt: number): void {
    const s = this.side(owner);
    if (s.slink === 'none' || s.fused) return;
    const f = this.fighter(owner);
    const b = this.body(f);
    if (s.slink === 'launch') {
      const p = this.wallPoint(s.wall, f);
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d <= 14) {
        f.setPosition(p.x, p.y);
        s.slink = 'wall';
      } else {
        b.setVelocity(dx / d * SLINK_LAUNCH_SPEED, dy / d * SLINK_LAUNCH_SPEED);
      }
      return;
    }

    // Read the velocity ArenaScene produced from WASD, then project it onto the current edge.
    // This keeps ordinary controls but makes moving away from the wall physically impossible.
    if (owner === 'player') {
      const desired = (s.wall === 'top' || s.wall === 'bottom') ? b.velocity.x : b.velocity.y;
      if (Math.abs(desired) > 20) {
        if (s.wall === 'top') s.wallDir = desired > 0 ? 1 : -1;
        else if (s.wall === 'right') s.wallDir = desired > 0 ? 1 : -1;
        else if (s.wall === 'bottom') s.wallDir = desired < 0 ? 1 : -1;
        else s.wallDir = desired < 0 ? 1 : -1;
      }
    }

    const minX = PAD; const maxX = this.api.width - PAD;
    const minY = PAD; const maxY = this.api.height - PAD;
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
    s.slink = 'none';
    this.body(this.fighter(owner)).stop();
  }

  private enterFuse(owner: ClayOwner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.fusing = false;
    s.fused = true;
    s.hitsLeft = FUSE_HITS;
    s.dashTarget = null;
    s.savedAbsoluteAbsorber = f.absoluteDamageAbsorber;
    const absorber: Fighter['absoluteDamageAbsorber'] = () => {
      if (!s.fused) return false;
      s.hitsLeft = Math.max(0, s.hitsLeft - 1);
      this.applyFrenzyBody(owner);
      this.api.spawnHitFlash(f.x, f.y, CLAY_LIGHT);
      this.api.showFloatingText(f.x, f.y - 55, `${s.hitsLeft} layers`, '#c38352');
      if (s.hitsLeft <= 0) this.endFuse(owner, false);
      return true;
    };
    s.fuseAbsorber = absorber;
    f.absoluteDamageAbsorber = absorber;
    f.effectsImmune = true;
    f.claySizeMult = 1.42;
    f.applySizeMult();
    f.setHealthBarVisible(false);
    this.api.purgeDebuffs(f);
    this.bursts.push({ x: f.x, y: f.y, started: this.now, until: this.now + 520, radius: 92, color: CLAY_LIGHT });
  }

  private applyFrenzyBody(owner: ClayOwner): void {
    const s = this.side(owner);
    const lost = FUSE_HITS - s.hitsLeft;
    const f = this.fighter(owner);
    f.claySizeMult = this.upgraded(owner, 'q') ? 1.42 * Math.pow(0.92, lost) : 1.42;
    f.applySizeMult();
  }

  private updateFuse(owner: ClayOwner, _dt: number): void {
    const s = this.side(owner);
    if (!s.fused) return;
    const f = this.fighter(owner);
    f.effectsImmune = true;
    f.setHealthBarVisible(false);
    this.api.purgeDebuffs(f);

    // The NPC decision layer cannot bypass the ultimate's entry cooldown for a Q recast.
    // Split directly when its defensive body is nearly spent, mirroring that decision.
    if (owner === 'npc' && s.hitsLeft <= 2) {
      this.endFuse(owner, true);
      return;
    }

    if (!s.dashTarget) return;
    const dx = s.dashTarget.x - f.x;
    const dy = s.dashTarget.y - f.y;
    const d = Math.hypot(dx, dy);
    if (Phaser.Math.Distance.Between(s.lastPuddleX, s.lastPuddleY, f.x, f.y) >= 54) {
      this.dropPuddle(owner, f.x, f.y);
      s.lastPuddleX = f.x;
      s.lastPuddleY = f.y;
    }
    if (d <= 18) {
      f.setPosition(s.dashTarget.x, s.dashTarget.y);
      this.body(f).stop();
      s.dashTarget = null;
      this.dropPuddle(owner, f.x, f.y);
      this.slam(owner, f.x, f.y);
      return;
    }
    this.body(f).setVelocity(dx / d * FUSE_DASH_SPEED, dy / d * FUSE_DASH_SPEED);
  }

  private endFuse(owner: ClayOwner, burst: boolean): void {
    const s = this.side(owner);
    if (!s.fused && !s.fusing) return;
    const f = this.fighter(owner);
    const remaining = s.hitsLeft;
    s.fused = false;
    s.fusing = false;
    s.dashTarget = null;
    s.leap = null;
    if (s.fuseAbsorber && f.absoluteDamageAbsorber === s.fuseAbsorber) {
      f.absoluteDamageAbsorber = s.savedAbsoluteAbsorber;
    }
    s.fuseAbsorber = null;
    s.savedAbsoluteAbsorber = null;
    f.effectsImmune = false;
    f.claySizeMult = 1;
    f.applySizeMult();
    f.setHealthBarVisible(true);
    this.ensureGolem(owner).x = f.x + (owner === 'player' ? 52 : -52);
    this.ensureGolem(owner).y = f.y;
    if (burst && remaining > 0) this.spawnRadial(owner, f.x, f.y, remaining * 6);
    this.bursts.push({ x: f.x, y: f.y, started: this.now, until: this.now + 460, radius: 82, color: CLAY_LIGHT });
  }

  private dropPuddle(owner: ClayOwner, x: number, y: number): void {
    this.puddles.push({ owner, x, y, until: this.now + PUDDLE_MS, seed: Math.random() * 1000 });
  }

  private updateSlipstream(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!this.upgraded(owner, 'f')) {
      s.slipstreamCharges = 3;
      s.slipstreamNextAt = 0;
      return;
    }
    if (s.slipstreamCharges >= 3 || s.slipstreamNextAt <= 0 || time < s.slipstreamNextAt) return;
    s.slipstreamCharges++;
    s.slipstreamNextAt = s.slipstreamCharges < 3 ? time + 1000 * this.getDodgeCooldownMult(owner) : 0;
  }

  hasSlipstreamCharge(owner: ClayOwner = 'player'): boolean {
    return this.isClay(owner) && this.upgraded(owner, 'f') && this.side(owner).slipstreamCharges > 0;
  }

  consumeSlipstreamCharge(owner: ClayOwner = 'player'): boolean {
    const s = this.side(owner);
    if (!this.hasSlipstreamCharge(owner)) return false;
    s.slipstreamCharges--;
    if (s.slipstreamNextAt <= 0) s.slipstreamNextAt = this.now + 1000 * this.getDodgeCooldownMult(owner);
    return true;
  }

  getDodgeCooldownMult(owner: ClayOwner = 'player'): number {
    return this.mastered(owner) && this.side(owner).fused ? 3 : 1;
  }

  startBedrockLeap(owner: ClayOwner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    if (!this.mastered(owner) || !s.fused || s.leap) return false;
    const f = this.fighter(owner);
    s.leap = {
      fromX: f.x, fromY: f.y,
      toX: Phaser.Math.Clamp(tx, PAD, this.api.width - PAD),
      toY: Phaser.Math.Clamp(ty, PAD, this.api.height - PAD),
      started: this.now, until: this.now + 620,
    };
    this.body(f).stop();
    return true;
  }

  private updateLeap(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.leap) return;
    const f = this.fighter(owner);
    const leap = s.leap;
    const t = Phaser.Math.Clamp((time - leap.started) / (leap.until - leap.started), 0, 1);
    f.setPosition(Phaser.Math.Linear(leap.fromX, leap.toX, t), Phaser.Math.Linear(leap.fromY, leap.toY, t));
    this.body(f).stop();
    if (t < 1) return;
    s.leap = null;
    this.slam(owner, f.x, f.y, 2000);
    this.bursts.push({ x: f.x, y: f.y, started: time, until: time + 620, radius: 145, color: 0x22201f });
  }

  private updateBedrock(owner: ClayOwner): void {
    const f = this.fighter(owner);
    f.clayIncomingMult = 1;
    if (!this.mastered(owner)) return;
    const g = this.ensureGolem(owner);
    if (Phaser.Math.Distance.Between(f.x, f.y, g.x, g.y) <= BEDROCK_RANGE) f.clayIncomingMult = 0.8;
  }

  private tryGiveLife(owner: ClayOwner, tx: number, ty: number): void {
    const s = this.side(owner);
    if (!this.mastered(owner) || this.masterySlot(owner) === null || this.now < s.lastGiveLifeAt + GIVE_LIFE_CD || s.lifeDrawing) return;
    const f = this.fighter(owner);
    const wallNow = Date.now();
    if (wallNow < f.disarmedUntil || wallNow < f.silencedUntil || wallNow < f.chickenUntil) return;
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const cx = Phaser.Math.Clamp(f.x + Math.cos(angle) * 112, PAD + LIFE_RADIUS, this.api.width - PAD - LIFE_RADIUS);
    const cy = Phaser.Math.Clamp(f.y + Math.sin(angle) * 112, PAD + LIFE_RADIUS, this.api.height - PAD - LIFE_RADIUS);
    s.lastGiveLifeAt = this.now;
    s.lifeDrawing = { centerX: cx, centerY: cy, until: this.now + LIFE_DRAW_MS, clayLeft: LIFE_CLAY, started: false, lastX: cx, lastY: cy, nodes: [] };
    if (owner === 'player') this.api.broadcastMasteryCast(GIVE_LIFE_ID);
    else {
      // Bots draw a star-like creature: enough corners to hit hard without becoming immobile.
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2;
        const r = i % 4 === 0 ? 67 : 40;
        s.lifeDrawing.nodes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      s.lifeDrawing.clayLeft = 0;
    }
  }

  doNpcGiveLife(tx: number, ty: number): void { this.tryGiveLife('npc', tx, ty); }

  private feedLifeDrawing(owner: ClayOwner, x: number, y: number): void {
    const d = this.side(owner).lifeDrawing;
    if (!d || d.clayLeft <= 0 || Phaser.Math.Distance.Between(x, y, d.centerX, d.centerY) > LIFE_RADIUS) return;
    if (!d.started) {
      d.started = true; d.lastX = x; d.lastY = y;
      d.nodes.push({ x: x - d.centerX, y: y - d.centerY }); d.clayLeft -= LIFE_STEP;
      return;
    }
    const travel = Phaser.Math.Distance.Between(d.lastX, d.lastY, x, y);
    if (travel < LIFE_STEP) return;
    const count = Math.min(Math.floor(travel / LIFE_STEP), Math.floor(d.clayLeft / LIFE_STEP));
    for (let i = 1; i <= count; i++) {
      const px = Phaser.Math.Linear(d.lastX, x, i / count), py = Phaser.Math.Linear(d.lastY, y, i / count);
      if (Phaser.Math.Distance.Between(px, py, d.centerX, d.centerY) <= LIFE_RADIUS) d.nodes.push({ x: px - d.centerX, y: py - d.centerY });
    }
    d.lastX = x; d.lastY = y; d.clayLeft = Math.max(0, d.clayLeft - count * LIFE_STEP);
  }

  private updateLifeDrawing(owner: ClayOwner, time: number): void {
    const s = this.side(owner);
    if (!s.lifeDrawing) {
      if (owner === 'npc' && this.api.npcAutonomous && this.masterySlot(owner) && time >= s.lastGiveLifeAt + GIVE_LIFE_CD) {
        const target = this.targetPoint(owner); this.tryGiveLife(owner, target.x, target.y);
      }
      return;
    }
    if (time < s.lifeDrawing.until && s.lifeDrawing.clayLeft > 0) return;
    const d = s.lifeDrawing;
    s.lifeDrawing = null;
    if (d.nodes.length < 3) return;
    let turns = 0;
    for (let i = 2; i < d.nodes.length; i++) {
      const a = Math.atan2(d.nodes[i - 1].y - d.nodes[i - 2].y, d.nodes[i - 1].x - d.nodes[i - 2].x);
      const b = Math.atan2(d.nodes[i].y - d.nodes[i - 1].y, d.nodes[i].x - d.nodes[i - 1].x);
      turns += Math.abs(Phaser.Math.Angle.Wrap(b - a)) / Math.PI;
    }
    const sharpness = Phaser.Math.Clamp(turns / Math.max(1, d.nodes.length - 2) * 2.6, 0, 1);
    const radii = d.nodes.map((n) => Math.hypot(n.x, n.y));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((a, b) => a + (b - mean) ** 2, 0) / radii.length;
    const lastNode = d.nodes[d.nodes.length - 1];
    const closed = 1 - Phaser.Math.Clamp(Phaser.Math.Distance.Between(d.nodes[0].x, d.nodes[0].y, lastNode.x, lastNode.y) / (LIFE_RADIUS * 1.2), 0, 1);
    const roundness = Phaser.Math.Clamp((1 - Math.sqrt(variance) / Math.max(1, mean)) * closed, 0, 1);
    this.creatures.push({ owner, x: d.centerX, y: d.centerY, angle: 0, nodes: d.nodes.slice(0, 96), until: time + CREATURE_MS, damage: Math.round(7 + sharpness * 15), speed: Math.round(120 + roundness * 150), radius: Phaser.Math.Clamp(mean, 20, 72), nextHitAt: 0 });
    this.api.showFloatingText(d.centerX, d.centerY - 52, `ALIVE  ${Math.round(7 + sharpness * 15)} dmg`, '#70b7ff');
  }

  private updateCreatures(dt: number, time: number): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (time >= c.until || c.nodes.length < 3) { this.creatures.splice(i, 1); continue; }
      const targets = this.targets(c.owner);
      let target: Fighter | null = null, best = Infinity;
      for (const t of targets) { const d = Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y); if (d < best) { best = d; target = t; } }
      if (target) {
        c.angle = Math.atan2(target.y - c.y, target.x - c.x);
        if (best > c.radius + 22) { c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt; }
        else if (time >= c.nextHitAt) {
          const wasAlive = target.hp > 0;
          target.lastDamageOwner = c.owner;
          target.takeDamage(c.damage, { source: c, sourceX: c.x, sourceY: c.y });
          this.trackFusionKill(c.owner, wasAlive, target);
          c.nextHitAt = time + 700;
          this.api.spawnHitFlash(target.x, target.y, CLAY_LIGHT);
        }
      }
      this.erodeCreature(c);
    }
  }

  private erodeCreature(c: ClayCreature): void {
    const hostile: ClayOwner = c.owner === 'player' ? 'npc' : 'player';
    for (const proj of [...this.api.projectiles.getChildren()] as Projectile[]) {
      if (!proj.active || (c.owner === 'player' ? proj.isFromPlayer : !proj.isFromPlayer)) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, proj.x, proj.y) > c.radius + 12) continue;
      const sx = proj.x, sy = proj.y;
      proj.destroy();
      c.nodes = c.nodes.filter((n) => {
        const wx = c.x + n.x * Math.cos(c.angle) - n.y * Math.sin(c.angle);
        const wy = c.y + n.x * Math.sin(c.angle) + n.y * Math.cos(c.angle);
        return Phaser.Math.Distance.Between(wx, wy, sx, sy) > 19;
      });
      this.api.spawnHitFlash(sx, sy, CLAY_LIGHT);
      return;
    }
    const shot = this.api.projectileRegistry.within(hostile, c.x, c.y, c.radius + 12)[0];
    if (shot) {
      const sx = shot.getX(), sy = shot.getY(); this.api.projectileRegistry.steal(shot);
      c.nodes = c.nodes.filter((n) => {
        const wx = c.x + n.x * Math.cos(c.angle) - n.y * Math.sin(c.angle);
        const wy = c.y + n.x * Math.sin(c.angle) + n.y * Math.cos(c.angle);
        return Phaser.Math.Distance.Between(wx, wy, sx, sy) > 19;
      });
      this.api.spawnHitFlash(sx, sy, CLAY_LIGHT);
    }
  }

  getGiveLifeCooldownRatio(owner: ClayOwner = 'player'): number {
    return Phaser.Math.Clamp((this.now - this.side(owner).lastGiveLifeAt) / GIVE_LIFE_CD, 0, 1);
  }

  npcGiveLifeSlot(): string | null { return this.masterySlot('npc'); }

  getPlayerSpeedMult(): number {
    const s = this.side('player');
    const frenzy = s.fused && this.upgraded('player', 'q') ? 1 + (FUSE_HITS - s.hitsLeft) * 0.08 : 1;
    let mult = s.fused ? FUSE_SPEED_MULT * frenzy : 1;
    if (this.puddles.some((p) => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.api.player.x, this.api.player.y) <= PUDDLE_RADIUS)) mult *= PUDDLE_SLOW;
    return mult;
  }

  getNpcSpeedMult(): number {
    const s = this.side('npc');
    const frenzy = s.fused && this.upgraded('npc', 'q') ? 1 + (FUSE_HITS - s.hitsLeft) * 0.08 : 1;
    let mult = s.fused ? FUSE_SPEED_MULT * frenzy : 1;
    if (this.puddles.some((p) => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.api.npc.x, this.api.npc.y) <= PUDDLE_RADIUS)) mult *= PUDDLE_SLOW;
    return mult;
  }

  isFused(owner: ClayOwner): boolean { return this.side(owner).fused; }
  isFusing(owner: ClayOwner): boolean { return this.side(owner).fusing; }
  isSlinking(owner: ClayOwner): boolean { return this.side(owner).slink !== 'none'; }
  slinkBurstsLeft(owner: ClayOwner): number { return Math.max(0, 3 - this.side(owner).slinkBursts); }
  shieldPieces(owner: ClayOwner): number { return this.side(owner).shield.length; }
  fuseHitsLeft(owner: ClayOwner): number { return this.side(owner).hitsLeft; }
  isLeaping(owner: ClayOwner = 'player'): boolean { return !!this.side(owner).leap; }

  private ensureLayers(): void {
    if (!this.worldGfx?.active) this.worldGfx = this.api.scene.add.graphics().setDepth(3);
    if (!this.airGfx?.active) this.airGfx = this.api.scene.add.graphics().setDepth(8);
    if (!this.hudGfx?.active) this.hudGfx = this.api.scene.add.graphics().setDepth(16);
  }

  private paint(time: number): void {
    const world = this.worldGfx!;
    const air = this.airGfx!;
    const hud = this.hudGfx!;
    world.clear(); air.clear(); hud.clear();

    for (const p of this.puddles) {
      const fade = Phaser.Math.Clamp((p.until - time) / 900, 0, 1);
      world.fillStyle(CLAY_DARK, 0.18 + fade * 0.28);
      world.fillEllipse(p.x, p.y, PUDDLE_RADIUS * 2, PUDDLE_RADIUS * 1.15);
      world.lineStyle(2, CLAY_LIGHT, 0.28 * fade);
      world.strokeEllipse(p.x, p.y, PUDDLE_RADIUS * 1.8, PUDDLE_RADIUS);
    }

    for (const burst of this.bursts) {
      const t = Phaser.Math.Clamp((time - burst.started) / (burst.until - burst.started), 0, 1);
      const r = Phaser.Math.Easing.Cubic.Out(t) * burst.radius;
      world.lineStyle(9 * (1 - t) + 1, burst.color, 0.72 * (1 - t));
      world.strokeCircle(burst.x, burst.y, r);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + t;
        world.fillStyle(CLAY_LIGHT, (1 - t) * 0.7);
        world.fillCircle(burst.x + Math.cos(a) * r * 0.78, burst.y + Math.sin(a) * r * 0.78, 5 * (1 - t));
      }
    }

    for (const shard of this.shards) {
      air.save();
      air.translateCanvas(shard.x, shard.y);
      air.rotateCanvas(shard.angle);
      air.fillStyle(CLAY_DARK, 0.55);
      air.fillTriangle(-14, -7, 17, 0, -14, 7);
      air.fillStyle(CLAY_LIGHT, 1);
      air.fillTriangle(-12, -5, 15, 0, -12, 4);
      air.restore();
    }

    for (const shard of this.orbitShards) {
      air.save(); air.translateCanvas(shard.x, shard.y); air.rotateCanvas(shard.angle + Math.PI / 2);
      air.fillStyle(CLAY_DARK, 0.8); air.fillTriangle(-13, -7, 16, 0, -13, 7);
      air.fillStyle(CLAY_LIGHT, 1); air.fillTriangle(-10, -4, 13, 0, -10, 4); air.restore();
    }

    for (const c of this.creatures) {
      const fade = Phaser.Math.Clamp((c.until - time) / 900, 0, 1);
      air.save(); air.translateCanvas(c.x, c.y); air.rotateCanvas(c.angle);
      for (let i = 1; i < c.nodes.length; i++) {
        const a = c.nodes[i - 1], b = c.nodes[i];
        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > 25) continue;
        air.lineStyle(13, this.mastered(c.owner) ? 0x24201f : CLAY_DARK, 0.68 * fade); air.lineBetween(a.x, a.y, b.x, b.y);
        air.lineStyle(8, this.mastered(c.owner) ? 0x49413d : CLAY_LIGHT, 0.95 * fade); air.lineBetween(a.x, a.y, b.x, b.y);
      }
      air.fillStyle(0x70b7ff, fade); air.fillCircle(8, -5, 3.5); air.fillCircle(8, 5, 3.5); air.restore();
    }

    for (const owner of ['player', 'npc'] as ClayOwner[]) {
      if (!this.isClay(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const g = this.ensureGolem(owner);

      if (!s.fused && g.hiddenUntil <= time) {
        world.lineStyle(2, CLAY_DARK, 0.8);
        world.lineBetween(f.x, f.y, g.x, g.y);
        this.paintGolem(air, g.x, g.y, g.wobble, s.fusing ? 1.12 : 1, this.mastered(owner));
      }

      for (let i = 1; i < s.shield.length; i++) {
        const a = this.shieldWorld(owner, s.shield[i - 1]);
        const b = this.shieldWorld(owner, s.shield[i]);
        if (s.shield[i - 1].anchor !== s.shield[i].anchor) continue;
        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > 24) continue;
        air.lineStyle(12, CLAY_DARK, 0.72);
        air.lineBetween(a.x, a.y, b.x, b.y);
        air.lineStyle(7, CLAY_LIGHT, 0.95);
        air.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (const n of s.shield) {
        const p = this.shieldWorld(owner, n);
        air.fillStyle(CLAY_LIGHT, 0.95);
        air.fillCircle(p.x, p.y, 5.2);
      }

      if (s.drawing) {
        air.lineStyle(3, GUIDE, 0.72);
        air.strokeCircle(f.x, f.y, CLOT_RADIUS);
        if (this.upgraded(owner, 'r') && !s.fused) air.strokeCircle(g.x, g.y, CLOT_RADIUS);
        for (let i = 1; i < s.drawing.nodes.length; i++) {
          const a = s.drawing.nodes[i - 1]; const b = s.drawing.nodes[i];
          if (a.anchor !== b.anchor || Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > 24) continue;
          const center = a.anchor === 'golem' && !s.fused ? g : f;
          air.lineStyle(11, CLAY, 0.9);
          air.lineBetween(center.x + a.x, center.y + a.y, center.x + b.x, center.y + b.y);
        }
        const ratio = s.drawing.clayLeft / CLOT_CLAY;
        hud.fillStyle(0x111827, 0.9); hud.fillRoundedRect(f.x - 43, f.y - 61, 86, 9, 3);
        hud.fillStyle(CLAY_LIGHT, 1); hud.fillRoundedRect(f.x - 41, f.y - 59, 82 * ratio, 5, 2);
      }

      if (s.lifeDrawing) {
        const d = s.lifeDrawing;
        air.lineStyle(3, GUIDE, 0.8); air.strokeCircle(d.centerX, d.centerY, LIFE_RADIUS);
        for (let i = 1; i < d.nodes.length; i++) {
          const a = d.nodes[i - 1], b = d.nodes[i];
          if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > 24) continue;
          air.lineStyle(11, this.mastered(owner) ? 0x302a27 : CLAY, 0.92);
          air.lineBetween(d.centerX + a.x, d.centerY + a.y, d.centerX + b.x, d.centerY + b.y);
        }
        const ratio = d.clayLeft / LIFE_CLAY;
        hud.fillStyle(0x111827, 0.9); hud.fillRoundedRect(f.x - 43, f.y - 78, 86, 9, 3);
        hud.fillStyle(CLAY_LIGHT, 1); hud.fillRoundedRect(f.x - 41, f.y - 76, 82 * ratio, 5, 2);
      }

      if (s.fused) {
        air.fillStyle(this.mastered(owner) ? 0x111111 : CLAY_DARK, 0.78);
        air.fillCircle(f.x, f.y + 2, 38);
        air.fillStyle(this.mastered(owner) ? 0x282424 : CLAY, 0.92);
        air.fillCircle(f.x, f.y - 1, 33);
        air.fillStyle(CLAY_LIGHT, 0.7);
        air.fillEllipse(f.x - 8, f.y - 10, 23, 13);
        for (let i = 0; i < FUSE_HITS; i++) {
          hud.fillStyle(i < s.hitsLeft ? CLAY_LIGHT : 0x32231d, i < s.hitsLeft ? 1 : 0.55);
          hud.fillRoundedRect(f.x - 39 + i * 10, f.y - 58, 7, 10, 2);
        }
      }


      if (this.upgraded(owner, 'f')) {
        for (let i = 0; i < 3; i++) {
          hud.fillStyle(i < s.slipstreamCharges ? GUIDE : 0x233248, i < s.slipstreamCharges ? 1 : 0.55);
          hud.fillTriangle(f.x - 20 + i * 20, f.y - 78, f.x - 13 + i * 20, f.y - 88, f.x - 6 + i * 20, f.y - 78);
        }
      }

      if (s.leap) {
        const t = Phaser.Math.Clamp((time - s.leap.started) / (s.leap.until - s.leap.started), 0, 1);
        const lift = Math.sin(t * Math.PI) * 42;
        air.lineStyle(3, GUIDE, 0.7); air.lineBetween(s.leap.fromX, s.leap.fromY, s.leap.toX, s.leap.toY);
        air.fillStyle(0x111111, 0.42); air.fillEllipse(f.x, f.y + 16, 48 - lift * 0.35, 16 - lift * 0.12);
        air.fillStyle(0x302b29, 0.9); air.fillCircle(f.x, f.y - lift, 27);
      }
    }
  }

  private paintGolem(gfx: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, scale: number, bedrock: boolean): void {
    const bob = Math.sin(phase) * 2;
    gfx.fillStyle(CLAY_DARK, 0.5);
    gfx.fillEllipse(x, y + 31, 72 * scale, 20 * scale);
    gfx.fillStyle(bedrock ? 0x171515 : CLAY_WET, 1);
    gfx.fillCircle(x, y + bob, 34 * scale);
    gfx.fillCircle(x - 25 * scale, y + 10 + bob, 17 * scale);
    gfx.fillCircle(x + 25 * scale, y + 10 + bob, 17 * scale);
    gfx.fillStyle(bedrock ? 0x302b29 : CLAY, 1);
    gfx.fillCircle(x - 8 * scale, y - 10 + bob, 25 * scale);
    gfx.fillCircle(x + 13 * scale, y - 4 + bob, 24 * scale);
    gfx.fillStyle(0xf3d7ae, 1);
    gfx.fillCircle(x - 10 * scale, y - 12 + bob, 5 * scale);
    gfx.fillCircle(x + 12 * scale, y - 10 + bob, 5 * scale);
    gfx.fillStyle(0x24150e, 1);
    gfx.fillCircle(x - 9 * scale, y - 12 + bob, 2.3 * scale);
    gfx.fillCircle(x + 13 * scale, y - 10 + bob, 2.3 * scale);
    if (bedrock) {
      gfx.lineStyle(4, 0x5b514c, 0.9);
      gfx.lineBetween(x - 25 * scale, y + 8 + bob, x - 8 * scale, y + 2 + bob);
      gfx.lineBetween(x + 7 * scale, y + 15 + bob, x + 27 * scale, y + 5 + bob);
      gfx.fillStyle(0x0a0909, 0.85); gfx.fillTriangle(x - 30 * scale, y - 5 + bob, x - 18 * scale, y - 27 + bob, x - 8 * scale, y - 7 + bob);
      gfx.fillTriangle(x + 10 * scale, y - 18 + bob, x + 24 * scale, y - 31 + bob, x + 28 * scale, y - 7 + bob);
    }
  }

  private updateStatuses(): void {
    const active = this.api.elementId === 'clay';
    const s = this.side('player');
    this.api.setStatusIndicator('clay-golem', active && !s.fused ? {
      name: 'Gooey Golem', emoji: '🪹', color: CLAY,
      description: 'Your immortal golem follows the cursor, intercepts projectiles, and performs Slam and Rupture.',
    } : null);
    this.api.setStatusIndicator('clay-slink', active && s.slink !== 'none' ? {
      name: 'Slink', emoji: '🪱', color: CLAY_LIGHT,
      description: 'You are bound to the arena edge. Click fires an eight-shard barrage; F leaves the wall.',
      count: Math.max(0, 3 - s.slinkBursts), suffix: ' barrages',
    } : null);
    this.api.setStatusIndicator('clay-fuse', active && s.fused ? {
      name: 'Fused Golem', emoji: '🛡️', color: CLAY_LIGHT,
      description: 'Effects cannot take hold. Each attack removes one clay layer, regardless of damage. Q disconnects and turns every remaining layer into six shards.',
      count: s.hitsLeft, suffix: ' hits',
    } : null);
    this.api.setStatusIndicator('clay-shield', active && s.shield.length > 0 ? {
      name: 'Clay Clot', emoji: '🏺', color: GUIDE,
      description: 'Your exact drawing is orbiting you. A projectile destroys only the clay around its impact point.',
      count: s.shield.length, suffix: ' pieces',
    } : null);
    this.api.setStatusIndicator('clay-dashes', active && this.upgraded('player', 'f') ? {
      name: 'Slipstream', emoji: '💨', color: GUIDE,
      description: 'Stored Space-dash charges. Charges refill one at a time.',
      count: s.slipstreamCharges, suffix: ' dashes',
    } : null);
    const creatureCount = this.creatures.filter((c) => c.owner === 'player').length;
    this.api.setStatusIndicator('clay-life', active && creatureCount > 0 ? {
      name: 'Living Clay', emoji: '🗿', color: CLAY_LIGHT,
      description: 'Your drawn clay creatures are hunting enemies and erode where projectiles strike.',
      count: creatureCount, suffix: ' alive',
    } : null);
  }

  private clearStatuses(): void {
    for (const id of ['clay-golem', 'clay-slink', 'clay-fuse', 'clay-shield', 'clay-dashes', 'clay-life']) this.api.setStatusIndicator(id, null);
  }
}
