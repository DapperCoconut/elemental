import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';

type Owner = 'player' | 'npc';

const WAX = 0xf2c85b;
const WAX_LIGHT = 0xffefad;
const WAX_DARK = 0x8d641c;
const HONEY = 0xd99518;
const BEE_DARK = 0x2b2115;
const POISON = 0x83cf42;
const ARENA_PAD = 32;

const STINGER_COUNT = 6;
const STINGER_DAMAGE = 5;
const STINGER_FINAL_DAMAGE = 10;
const STINGER_RANGE = 190;
const STINGER_HALF_WIDTH = 19;
const STINGER_GAP_MS = 70;
const STINGER_FINAL_DELAY_MS = 110;
const STINGER_OFFSETS = [-7.5, -5, -2.5, 2.5, 5, 7.5].map(Phaser.Math.DegToRad);

const DART_COUNT = 5;
const DART_DAMAGE = 3;
const DART_SPEED = 650;
const DART_LIFE_MS = 1200;
const DART_HIT_R = 24;
const DART_OFFSETS = [-5, -2.5, 0, 2.5, 5].map(Phaser.Math.DegToRad);
const GRAPPLE_DAMAGE = 12;
const GRAPPLE_SPEED = 760;
const GRAPPLE_LIFE_MS = 1100;
const GRAPPLE_HIT_R = 30;
const GRAPPLE_PULL_RANGE = 92;
const GRAPPLE_PULL_SPEED = 720;
const GRAPPLE_PULL_MS = 750;

const POISON_MS = 8000;
const POISON_TICK_MS = 1000;
const POISON_DAMAGE = 1;

const SWARM_COUNT = 15;
const SWARM_HALF_ANGLE = Phaser.Math.DegToRad(24);
const BEE_SPEED = 350;
const BEE_HIT_R = 24;
const BEE_BASE_MS = 3000;
const BEE_TICK_MS = 1000;
const BEE_DAMAGE = 2;
const ELITE_BEE_COUNT = 3;
const ELITE_BEE_DAMAGE = 3;
const ELITE_BEE_MS = 5000;

const CANDLE_RADIUS = 125;
const CANDLE_MS = 12000;
const CANDLE_EXPLODE_BUFF_MS = 15000;
const CANDLE_RESIST = 0.85;
const CANDLE_BEE_BONUS_MS = 2000;
const MELTING_ARMOR_PER_HIT = 0.02;
const MELTING_ARMOR_MS = 5000;
const HOT_WAX_R = 44;
const HOT_WAX_MS = 6000;
const HOT_WAX_TICK_MS = 1000;
const HOT_WAX_DAMAGE = 3;

const HIVE_R = 29;
const HIVE_REDEEM_R = 92;
const HIVE_BUFF_MS = 12000;
const HIVE_CELLS = 5;
const HONEY_MAX = 50;
const HONEY_BASE_PER_SEC = 0.35;
const HONEY_PER_BEE_PER_SEC = 0.23;
const HONEY_PUDDLE_R = 34;
const HONEY_PUDDLE_MS = 10000;
const HONEY_HEAL_PER_TICK = 3;

const BOMB_COUNT = 10;
const BOMB_HALF_ANGLE = Phaser.Math.DegToRad(27);
const BOMB_SPEED = 315;
const BOMB_HIT_R = 24;
const BOMB_MS = 20000;
const BOMB_DAMAGE = 20;
const BOMB_PER_STACK = 0.15;
const BOMB_HOLD_MS = 2000;
const SELF_BOMB_VULN = 0.25;
const SELF_BOMB_DAMAGE_SHARE = 0.33;
const SELF_BOMB_RADIUS = 165;
const SELF_BOMB_ARM_MS = 650;
const SHOVE_MS = 260;

interface StingerBarrage {
  owner: Owner;
  angle: number;
  nextAt: number;
  index: number;
  hits: Map<Fighter, number>;
  finalAt: number;
  finalTargets: Fighter[];
}

interface DartVolley {
  hits: Map<Fighter, number>;
  grappled: Set<Fighter>;
}

interface StingerDart {
  owner: Owner;
  kind: 'stinger' | 'grapple';
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  volley: DartVolley | null;
}

interface PoisonState {
  owner: Owner;
  target: Fighter;
  until: number;
  tickAt: number;
  vulnStacks: number;
}

interface Bee {
  owner: Owner;
  state: 'flying' | 'orbit' | 'attached';
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  attachMs: number;
  target: Fighter | null;
  offsetX: number;
  offsetY: number;
  tickAt: number;
  orbitIndex: number;
  orbitTotal: number;
  orbitRadius: number;
  seed: number;
  elite: boolean;
}

interface Candle {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  until: number;
  seed: number;
  nextMeltAt: number;
}

interface Hive {
  owner: Owner;
  x: number;
  y: number;
  cells: number;
  seed: number;
  honey: number;
}

interface StickyBomb {
  owner: Owner;
  state: 'flying' | 'attached' | 'self';
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  target: Fighter | null;
  offsetX: number;
  offsetY: number;
  seed: number;
  orbitIndex: number;
  armedAt: number;
}

interface TimedShield {
  until: number;
  beesPerHit: number;
}

interface SideState {
  candleBuffs: number[];
  shields: TimedShield[];
  meltingArmor: number[];
}

interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

interface GrapplePull {
  owner: Owner;
  target: Fighter;
  until: number;
}

interface WaxPuddle {
  owner: Owner;
  kind: 'hot' | 'honey';
  x: number;
  y: number;
  radius: number;
  until: number;
  tickAt: number;
}

interface Flash {
  kind: 'thrust' | 'burst';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bornAt: number;
  until: number;
  color: number;
  width: number;
}

export interface WaxArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get npcAutonomous(): boolean;
  get width(): number;
  get height(): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  broadcastSpecialCast(id: string): void;
}

function makeSide(): SideState {
  return { candleBuffs: [], shields: [], meltingArmor: [] };
}

function segmentDistanceSq(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby || 1;
  const t = Phaser.Math.Clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  const dx = px - (ax + abx * t);
  const dy = py - (ay + aby * t);
  return dx * dx + dy * dy;
}

/** The complete Wax base-and-upgrade simulation. Mastery deliberately has no hooks yet. */
export class WaxKit {
  private sides: Record<Owner, SideState> = { player: makeSide(), npc: makeSide() };
  private barrages: StingerBarrage[] = [];
  private darts: StingerDart[] = [];
  private poisons: PoisonState[] = [];
  private bees: Bee[] = [];
  private candles: Candle[] = [];
  private hives: Hive[] = [];
  private puddles: WaxPuddle[] = [];
  private bombs: StickyBomb[] = [];
  private shoves: Shove[] = [];
  private pulls: GrapplePull[] = [];
  private flashes: Flash[] = [];
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private objectGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hooked = new Map<Owner, { fighter: Fighter; listener: (amount: number) => void }>();
  private vizT = 0;
  private qHolding = false;
  private qHoldStart = 0;
  private qHoldFired = false;

  constructor(private api: WaxArenaApi) {}

  private get now(): number { return this.api.scene.time.now; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private side(owner: Owner): SideState { return this.sides[owner]; }
  private isWax(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'wax' : this.api.npcElementId === 'wax';
  }
  private upgraded(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, ARENA_PAD, this.api.width - ARENA_PAD); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, ARENA_PAD, this.api.height - ARENA_PAD); }

  reset(): void {
    for (const { fighter, listener } of this.hooked.values()) fighter.off('damaged', listener);
    this.hooked.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f) f.waxIncomingMult = 1;
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.barrages = [];
    this.darts = [];
    this.poisons = [];
    this.bees = [];
    this.candles = [];
    this.hives = [];
    this.puddles = [];
    this.bombs = [];
    this.shoves = [];
    this.pulls = [];
    this.flashes = [];
    this.vizT = 0;
    this.qHolding = false;
    this.qHoldStart = 0;
    this.qHoldFired = false;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.objectGfx?.destroy(); this.objectGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.api.setStatusIndicator('wax-candles', null);
    this.api.setStatusIndicator('wax-shield', null);
    this.api.setStatusIndicator('wax-melting-point', null);
    this.api.setStatusIndicator('wax-beetanica', null);
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'wax') return;
    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown && !this.api.pointerWasDown) p.castAbility('wax-stinger-strikes', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('wax-swarm', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('wax-candle-mount', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      const nearby = this.nearestRedeemableHive('player');
      if (nearby) this.redeemHive(nearby, false);
      else p.castAbility('wax-hive-hearth', ctx);
    }
    if (this.upgraded('player', 'q')) {
      if (this.api.qKey.isDown) {
        if (!this.qHolding) {
          this.qHolding = true;
          this.qHoldStart = time;
          this.qHoldFired = false;
        } else if (!this.qHoldFired && time - this.qHoldStart >= BOMB_HOLD_MS
            && this.ownedBombCount('player') === 0
            && p.getCooldownRatio('wax-sticky-bombs') >= 1) {
          this.qHoldFired = true;
          this.strapBombs('player');
          p.startCooldown('wax-sticky-bombs');
          this.api.broadcastSpecialCast('wax-rule-beetanica');
        }
      } else if (this.qHolding) {
        if (!this.qHoldFired) this.tapStickyBombs('player', ctx);
        this.qHolding = false;
        this.qHoldFired = false;
      }
    } else if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      this.tapStickyBombs('player', ctx);
    }
  }

  private tapStickyBombs(owner: Owner, ctx: CastContext): void {
    if (this.selfBombCount(owner) > 0) {
      if (owner === 'player') this.api.broadcastSpecialCast('wax-detonate-self');
      this.detonateSelfBombs(owner);
    } else if (this.attachedBombCount(owner) > 0) {
      if (owner === 'player') this.api.broadcastSpecialCast('wax-detonate-sticky');
      this.detonateBombs(owner);
    } else {
      this.fighter(owner).castAbility('wax-sticky-bombs', ctx);
    }
  }

  doStingerStrikes(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f?.active) return;
    const next = this.nearestTarget(owner, f.x, f.y);
    if (this.upgraded(owner, 'click')
        && (!next || Phaser.Math.Distance.Between(f.x, f.y, next.x, next.y) > STINGER_RANGE)) {
      this.launchStingerDarts(owner, tx, ty);
      return;
    }
    this.barrages.push({
      owner, angle: Math.atan2(ty - f.y, tx - f.x), nextAt: this.now,
      index: 0, hits: new Map(), finalAt: 0, finalTargets: [],
    });
    Sfx.playAt('spear-throw', f.x, { rate: 1.35, volume: 0.65 });
  }

  doSwarm(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f?.active) return;
    const base = Math.atan2(ty - f.y, tx - f.x);
    for (let i = 0; i < SWARM_COUNT; i++) {
      const lane = i / (SWARM_COUNT - 1) - 0.5;
      const a = base + lane * SWARM_HALF_ANGLE * 2 + Phaser.Math.FloatBetween(-0.018, 0.018);
      const elite = this.upgraded(owner, 'e')
        && i % Math.floor(SWARM_COUNT / ELITE_BEE_COUNT) === 2;
      this.spawnFlyingBee(owner, f.x + Math.cos(a) * 27, f.y + Math.sin(a) * 27, a, elite);
    }
    this.api.showFloatingText(f.x, f.y - 48, '🐝 SWARM', '#ffd34f');
    Sfx.playAt('whoosh', f.x, { rate: 1.65, volume: 0.7 });
  }

  doCandleMount(owner: Owner, tx: number, ty: number): void {
    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.candles.push({
      owner, x, y, bornAt: this.now, until: this.now + CANDLE_MS, seed: Math.random() * 1000,
      nextMeltAt: this.now + Phaser.Math.Between(3000, 4000),
    });
    this.flashes.push({ kind: 'burst', x1: x, y1: y, x2: x, y2: y, bornAt: this.now, until: this.now + 520, color: WAX_LIGHT, width: CANDLE_RADIUS });
    this.api.showFloatingText(x, y - 54, '🕯️ CANDLE MOUNT', '#ffdf7e');
    Sfx.playAt('holy-chord', x, { rate: 1.5, volume: 0.55 });
  }

  doHiveHearth(owner: Owner, tx: number, ty: number): void {
    const near = this.nearestRedeemableHive(owner);
    if (near) { this.redeemHive(near, false); return; }
    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.hives.push({ owner, x, y, cells: 0, seed: Math.random() * 1000, honey: 0 });
    this.flashes.push({ kind: 'burst', x1: x, y1: y, x2: x, y2: y, bornAt: this.now, until: this.now + 520, color: HONEY, width: 62 });
    this.api.showFloatingText(x, y - 58, '🍯 HIVE HEARTH', '#ffc62d');
    Sfx.playAt('stone-rise', x, { rate: 1.35, volume: 0.65 });
  }

  doStickyBombs(owner: Owner, tx: number, ty: number): void {
    if (this.selfBombCount(owner) > 0) { this.detonateSelfBombs(owner); return; }
    if (this.attachedBombCount(owner) > 0) { this.detonateBombs(owner); return; }
    const f = this.fighter(owner);
    if (!f?.active) return;
    if (owner === 'npc' && this.api.npcAutonomous && this.upgraded(owner, 'q')) {
      this.strapBombs(owner);
      return;
    }
    const base = Math.atan2(ty - f.y, tx - f.x);
    for (let i = 0; i < BOMB_COUNT; i++) {
      const lane = i / (BOMB_COUNT - 1) - 0.5;
      const a = base + lane * BOMB_HALF_ANGLE * 2;
      this.bombs.push({
        owner, state: 'flying', x: f.x + Math.cos(a) * 28, y: f.y + Math.sin(a) * 28,
        vx: Math.cos(a) * BOMB_SPEED, vy: Math.sin(a) * BOMB_SPEED,
        until: this.now + BOMB_MS, target: null, offsetX: 0, offsetY: 0, seed: Math.random() * 1000,
        orbitIndex: i, armedAt: 0,
      });
    }
    this.api.showFloatingText(f.x, f.y - 48, '🍯 STICKY BOMBS', '#ffd34f');
    Sfx.playAt('grenade-launch', f.x, { rate: 1.25, volume: 0.7 });
  }

  update(time: number, delta: number): void {
    const active = this.api.elementId === 'wax' || this.api.npcElementId === 'wax'
      || this.barrages.length > 0 || this.darts.length > 0 || this.poisons.length > 0
      || this.bees.length > 0 || this.candles.length > 0 || this.hives.length > 0
      || this.puddles.length > 0 || this.bombs.length > 0
      || this.shoves.length > 0 || this.pulls.length > 0 || this.flashes.length > 0
      || this.sides.player.candleBuffs.length > 0 || this.sides.npc.candleBuffs.length > 0
      || this.sides.player.shields.length > 0 || this.sides.npc.shields.length > 0
      || this.sides.player.meltingArmor.length > 0 || this.sides.npc.meltingArmor.length > 0;
    if (!active) return;
    const dt = Math.min(delta, 80) / 1000;
    this.vizT += dt;
    this.ensureLayers();
    this.ensureDamageHooks();
    this.updateBarrages(time);
    this.updateDarts(time, dt);
    this.updatePoisons(time);
    this.updateCandles(time);
    this.updateHives(dt);
    this.updateBees(time, dt);
    this.updatePuddles(time);
    this.updateBombs(time, dt);
    this.updateShoves(time, dt);
    this.updatePulls(time, dt);
    this.updateMultipliers(time);
    this.updateHud(time);
    this.draw(time);
  }

  private ensureDamageHooks(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const fighter = this.fighter(owner);
      const old = this.hooked.get(owner);
      if (old?.fighter === fighter) continue;
      if (old) old.fighter.off('damaged', old.listener);
      const listener = (amount: number) => {
        if (amount <= 0 || !this.isWax(owner)) return;
        if (this.upgraded(owner, 'r') && this.candleStacks(owner) > 0) {
          this.side(owner).meltingArmor.push(this.now + MELTING_ARMOR_MS);
          this.spawnPuddle(owner, 'hot', fighter.x, fighter.y);
          this.api.showFloatingText(fighter.x, fighter.y - 52, '+2% MELTING ARMOR', '#ffbd3b');
        }
        const count = this.side(owner).shields
          .filter((s) => s.until > this.now)
          .reduce((sum, s) => sum + s.beesPerHit, 0);
        if (count <= 0) return;
        const target = this.nearestTarget(owner, fighter.x, fighter.y);
        if (!target) return;
        for (let i = 0; i < count; i++) this.attachBee(owner, target, i, count);
        this.api.showFloatingText(fighter.x, fighter.y - 54, `🐝 SHIELD ×${count}`, '#ffd34f');
      };
      fighter.on('damaged', listener);
      this.hooked.set(owner, { fighter, listener });
    }
  }

  private updateBarrages(time: number): void {
    for (let i = this.barrages.length - 1; i >= 0; i--) {
      const b = this.barrages[i];
      const f = this.fighter(b.owner);
      if (!f?.active || f.hp <= 0) { this.barrages.splice(i, 1); continue; }
      if (b.index < STINGER_COUNT && time >= b.nextAt) {
        const a = b.angle + STINGER_OFFSETS[b.index];
        this.doThrust(b, f, a, false);
        b.index++;
        b.nextAt += STINGER_GAP_MS;
        if (b.index === STINGER_COUNT) {
          b.finalTargets = [...b.hits.entries()]
            .filter(([, hits]) => hits === STINGER_COUNT)
            .map(([target]) => target);
          b.finalAt = time + STINGER_FINAL_DELAY_MS;
        }
      }
      if (b.index === STINGER_COUNT && time >= b.finalAt) {
        if (b.finalTargets.length > 0) this.doFinalStinger(b, f);
        this.barrages.splice(i, 1);
      }
    }
  }

  private doThrust(b: StingerBarrage, f: Fighter, angle: number, final: boolean): void {
    const range = final ? STINGER_RANGE + 28 : STINGER_RANGE;
    const ex = f.x + Math.cos(angle) * range;
    const ey = f.y + Math.sin(angle) * range;
    this.flashes.push({
      kind: 'thrust', x1: f.x, y1: f.y, x2: ex, y2: ey,
      bornAt: this.now, until: this.now + (final ? 230 : 145),
      color: final ? WAX_LIGHT : WAX, width: final ? 8 : 4,
    });
    for (const target of this.targetsOf(b.owner)) {
      const width = STINGER_HALF_WIDTH + 22 * Math.max(0, target.sizeMult - 1);
      if (segmentDistanceSq(target.x, target.y, f.x, f.y, ex, ey) > width * width) continue;
      this.hit(b.owner, target, final ? STINGER_FINAL_DAMAGE : STINGER_DAMAGE, b);
      this.api.spawnHitFlash(target.x, target.y, final ? WAX_LIGHT : WAX);
      if (!final) b.hits.set(target, (b.hits.get(target) ?? 0) + 1);
    }
  }

  private doFinalStinger(b: StingerBarrage, f: Fighter): void {
    const ex = f.x + Math.cos(b.angle) * (STINGER_RANGE + 28);
    const ey = f.y + Math.sin(b.angle) * (STINGER_RANGE + 28);
    this.flashes.push({
      kind: 'thrust', x1: f.x, y1: f.y, x2: ex, y2: ey,
      bornAt: this.now, until: this.now + 260, color: WAX_LIGHT, width: 10,
    });
    for (const target of b.finalTargets) {
      if (!target.active || target.hp <= 0) continue;
      if (segmentDistanceSq(target.x, target.y, f.x, f.y, ex, ey) > (STINGER_HALF_WIDTH + 9) ** 2) continue;
      this.hit(b.owner, target, STINGER_FINAL_DAMAGE, b);
      this.applyPoison(b.owner, target);
      this.shoves.push({
        target, vx: Math.cos(b.angle) * 285, vy: Math.sin(b.angle) * 285,
        until: this.now + SHOVE_MS,
      });
      this.api.spawnHitFlash(target.x, target.y, WAX_LIGHT);
      this.api.showFloatingText(target.x, target.y - 48, '🐝 STUNG + POISONED', '#b6e85c');
    }
    Sfx.playAt('spear-hit', f.x, { rate: 1.15, volume: 0.8 });
  }

  private launchStingerDarts(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const base = Math.atan2(ty - f.y, tx - f.x);
    const volley: DartVolley = { hits: new Map(), grappled: new Set() };
    for (let i = 0; i < DART_COUNT; i++) {
      const a = base + DART_OFFSETS[i];
      this.darts.push({
        owner, kind: 'stinger', x: f.x + Math.cos(a) * 28, y: f.y + Math.sin(a) * 28,
        vx: Math.cos(a) * DART_SPEED, vy: Math.sin(a) * DART_SPEED,
        until: this.now + DART_LIFE_MS, volley,
      });
    }
    this.api.showFloatingText(f.x, f.y - 48, '🦂 STINGER DARTS', '#e6b83e');
    Sfx.playAt('spear-throw', f.x, { rate: 1.65, volume: 0.65 });
  }

  private launchGrappleDart(owner: Owner, target: Fighter): void {
    const f = this.fighter(owner);
    const a = Math.atan2(target.y - f.y, target.x - f.x);
    this.darts.push({
      owner, kind: 'grapple', x: f.x + Math.cos(a) * 30, y: f.y + Math.sin(a) * 30,
      vx: Math.cos(a) * GRAPPLE_SPEED, vy: Math.sin(a) * GRAPPLE_SPEED,
      until: this.now + GRAPPLE_LIFE_MS, volley: null,
    });
    this.api.showFloatingText(f.x, f.y - 50, '🪝 PERFECT VOLLEY', '#2b2115');
    Sfx.playAt('spear-throw', f.x, { rate: 0.82, volume: 0.75 });
  }

  private updateDarts(time: number, dt: number): void {
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const dart = this.darts[i];
      if (time >= dart.until) { this.darts.splice(i, 1); continue; }
      dart.x += dart.vx * dt;
      dart.y += dart.vy * dt;
      const hitR = dart.kind === 'grapple' ? GRAPPLE_HIT_R : DART_HIT_R;
      const target = this.targetsOf(dart.owner)
        .find((t) => Phaser.Math.Distance.Between(dart.x, dart.y, t.x, t.y) <= hitR);
      if (target) {
        if (dart.kind === 'grapple') {
          this.hit(dart.owner, target, GRAPPLE_DAMAGE, dart);
          this.pulls.push({ owner: dart.owner, target, until: time + GRAPPLE_PULL_MS });
          this.api.showFloatingText(target.x, target.y - 48, '🪝 GRAPPLED', '#2b2115');
          Sfx.playAt('spear-hit', target.x, { rate: 0.82, volume: 0.8 });
        } else {
          this.hit(dart.owner, target, DART_DAMAGE, dart);
          const volley = dart.volley!;
          const hits = (volley.hits.get(target) ?? 0) + 1;
          volley.hits.set(target, hits);
          if (hits === DART_COUNT && !volley.grappled.has(target)) {
            volley.grappled.add(target);
            this.launchGrappleDart(dart.owner, target);
          }
        }
        this.api.spawnHitFlash(target.x, target.y, dart.kind === 'grapple' ? BEE_DARK : WAX_DARK);
        this.darts.splice(i, 1);
        continue;
      }
      if (dart.x < -30 || dart.x > this.api.width + 30 || dart.y < 60 || dart.y > this.api.height + 30) {
        this.darts.splice(i, 1);
      }
    }
  }

  private applyPoison(owner: Owner, target: Fighter): void {
    const existing = this.poisons.find((p) => p.owner === owner && p.target === target);
    if (existing) {
      existing.until = this.now + POISON_MS;
      existing.tickAt = Math.min(existing.tickAt, this.now + POISON_TICK_MS);
      return;
    }
    this.poisons.push({
      owner, target, until: this.now + POISON_MS,
      tickAt: this.now, vulnStacks: 0,
    });
  }

  private updatePoisons(time: number): void {
    for (let i = this.poisons.length - 1; i >= 0; i--) {
      const p = this.poisons[i];
      if (!p.target.active || p.target.hp <= 0 || time >= p.until) {
        this.poisons.splice(i, 1);
        continue;
      }
      while (time >= p.tickAt && p.tickAt < p.until) {
        p.tickAt += POISON_TICK_MS;
        p.vulnStacks = Math.min(8, p.vulnStacks + 1);
        this.hit(p.owner, p.target, POISON_DAMAGE, p, true);
        this.api.spawnHitFlash(p.target.x, p.target.y, POISON);
      }
    }
  }

  private updateCandles(time: number): void {
    for (const candle of this.candles) {
      if (!this.upgraded(candle.owner, 'r')) continue;
      while (time >= candle.nextMeltAt && candle.nextMeltAt < candle.until) {
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(18, 48);
        this.spawnPuddle(
          candle.owner, 'hot',
          this.clampX(candle.x + Math.cos(a) * d),
          this.clampY(candle.y + Math.sin(a) * d),
        );
        candle.nextMeltAt += Phaser.Math.Between(3000, 4000);
      }
    }
    this.candles = this.candles.filter((c) => c.until > time);
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      s.candleBuffs = s.candleBuffs.filter((until) => until > time);
      s.shields = s.shields.filter((shield) => shield.until > time);
      s.meltingArmor = s.meltingArmor.filter((until) => until > time);
    }
  }

  private updateHives(dt: number): void {
    for (const hive of this.hives) {
      if (!this.upgraded(hive.owner, 'f') || hive.honey >= HONEY_MAX) continue;
      hive.honey = Math.min(
        HONEY_MAX,
        hive.honey + (HONEY_BASE_PER_SEC + hive.cells * HONEY_PER_BEE_PER_SEC) * dt,
      );
    }
  }

  private spawnPuddle(owner: Owner, kind: 'hot' | 'honey', x: number, y: number): void {
    this.puddles.push({
      owner, kind, x, y,
      radius: kind === 'hot' ? HOT_WAX_R : HONEY_PUDDLE_R,
      until: this.now + (kind === 'hot' ? HOT_WAX_MS : HONEY_PUDDLE_MS),
      tickAt: this.now,
    });
  }

  private updatePuddles(time: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const puddle = this.puddles[i];
      if (time >= puddle.until) { this.puddles.splice(i, 1); continue; }
      while (time >= puddle.tickAt && puddle.tickAt < puddle.until) {
        puddle.tickAt += puddle.kind === 'hot' ? HOT_WAX_TICK_MS : 1000;
        if (puddle.kind === 'honey') {
          const f = this.fighter(puddle.owner);
          if (f.active && f.hp > 0
              && Phaser.Math.Distance.Between(f.x, f.y, puddle.x, puddle.y) <= puddle.radius) {
            f.heal(HONEY_HEAL_PER_TICK);
          }
        } else {
          for (const target of this.targetsOf(puddle.owner)) {
            if (Phaser.Math.Distance.Between(target.x, target.y, puddle.x, puddle.y) <= puddle.radius) {
              this.hit(puddle.owner, target, HOT_WAX_DAMAGE, puddle, true);
              this.api.spawnHitFlash(target.x, target.y, 0xff8b24);
            }
          }
        }
      }
    }
  }

  private candleStacks(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f?.active) return 0;
    const placed = this.candles.filter((c) => c.owner === owner
      && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= CANDLE_RADIUS).length;
    return placed + this.side(owner).candleBuffs.length;
  }

  private spawnFlyingBee(owner: Owner, x: number, y: number, angle: number, elite = false): void {
    this.bees.push({
      owner, state: 'flying', x, y,
      vx: Math.cos(angle) * BEE_SPEED, vy: Math.sin(angle) * BEE_SPEED,
      until: this.now + 2600,
      attachMs: (elite ? ELITE_BEE_MS : BEE_BASE_MS) + this.candleStacks(owner) * CANDLE_BEE_BONUS_MS,
      target: null, offsetX: 0, offsetY: 0, tickAt: 0,
      orbitIndex: 0, orbitTotal: 1, orbitRadius: 0, seed: Math.random() * 1000,
      elite,
    });
  }

  private spawnOrbitBees(owner: Owner, count: number): void {
    const f = this.fighter(owner);
    for (let i = 0; i < count; i++) {
      this.bees.push({
        owner, state: 'orbit', x: f.x, y: f.y, vx: 0, vy: 0,
        until: this.now + HIVE_BUFF_MS,
        attachMs: BEE_BASE_MS + this.candleStacks(owner) * CANDLE_BEE_BONUS_MS,
        target: null, offsetX: 0, offsetY: 0, tickAt: 0,
        orbitIndex: i, orbitTotal: count, orbitRadius: 48 + (i % 3) * 13,
        seed: Math.random() * 1000,
        elite: false,
      });
    }
  }

  private spawnEdgeBees(owner: Owner, count: number, x: number, y: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.bees.push({
        owner, state: 'flying', x, y,
        vx: Math.cos(a) * BEE_SPEED, vy: Math.sin(a) * BEE_SPEED,
        until: this.now + 4000,
        attachMs: BEE_BASE_MS + this.candleStacks(owner) * CANDLE_BEE_BONUS_MS,
        target: null, offsetX: 0, offsetY: 0, tickAt: 0,
        orbitIndex: 0, orbitTotal: 1, orbitRadius: 0, seed: Math.random() * 1000,
        elite: false,
      });
    }
  }

  private attachBee(owner: Owner, target: Fighter, index = 0, total = 1): void {
    const a = total <= 1 ? Math.random() * Math.PI * 2 : index / total * Math.PI * 2;
    const r = 14 + (index % 3) * 7;
    this.bees.push({
      owner, state: 'attached', x: target.x, y: target.y, vx: 0, vy: 0,
      until: this.now + BEE_BASE_MS + this.candleStacks(owner) * CANDLE_BEE_BONUS_MS,
      attachMs: BEE_BASE_MS, target,
      offsetX: Math.cos(a) * r, offsetY: Math.sin(a) * r,
      tickAt: this.now,
      orbitIndex: 0, orbitTotal: 1, orbitRadius: 0, seed: Math.random() * 1000,
      elite: false,
    });
  }

  private latchBee(bee: Bee, target: Fighter): void {
    const a = Math.random() * Math.PI * 2;
    const r = Phaser.Math.Between(12, 31);
    bee.state = 'attached';
    bee.target = target;
    bee.offsetX = Math.cos(a) * r;
    bee.offsetY = Math.sin(a) * r;
    bee.until = this.now + bee.attachMs;
    bee.tickAt = this.now;
    bee.vx = 0;
    bee.vy = 0;
    if (bee.elite) {
      this.applyPoison(bee.owner, target);
      this.api.showFloatingText(target.x, target.y - 46, '🔴 ELITE POISON', '#ef4b45');
    }
    this.api.spawnHitFlash(target.x, target.y, HONEY);
  }

  private updateBees(time: number, dt: number): void {
    for (let i = this.bees.length - 1; i >= 0; i--) {
      const bee = this.bees[i];
      if (time >= bee.until) { this.bees.splice(i, 1); continue; }
      if (bee.state === 'attached') {
        const target = bee.target;
        if (!target?.active || target.hp <= 0) { this.bees.splice(i, 1); continue; }
        bee.x = target.x + bee.offsetX;
        bee.y = target.y + bee.offsetY;
        while (time >= bee.tickAt && bee.tickAt < bee.until) {
          bee.tickAt += BEE_TICK_MS;
          const poisoned = this.poisons.some((p) => p.target === target && p.until > time);
          const baseDamage = bee.elite ? ELITE_BEE_DAMAGE : BEE_DAMAGE;
          this.hit(bee.owner, target, baseDamage + (poisoned ? 1 : 0), bee, true);
          this.api.spawnHitFlash(bee.x, bee.y, HONEY);
        }
        continue;
      }

      if (bee.state === 'orbit') {
        const f = this.fighter(bee.owner);
        if (!f?.active || f.hp <= 0) { this.bees.splice(i, 1); continue; }
        const a = time / 310 + bee.orbitIndex / Math.max(1, bee.orbitTotal) * Math.PI * 2;
        bee.x = f.x + Math.cos(a) * bee.orbitRadius;
        bee.y = f.y + Math.sin(a) * bee.orbitRadius * 0.62;
      } else {
        bee.x += bee.vx * dt;
        bee.y += bee.vy * dt;
        const hive = this.hives.find((h) => h.owner === bee.owner && h.cells < HIVE_CELLS
          && Phaser.Math.Distance.Between(bee.x, bee.y, h.x, h.y) <= HIVE_R + 7);
        if (hive) {
          hive.cells++;
          this.bees.splice(i, 1);
          this.api.showFloatingText(hive.x, hive.y - 48, `🐝 ${hive.cells}/${HIVE_CELLS}`, '#ffd34f');
          Sfx.playAt('pickup', hive.x, { rate: 1.2 + hive.cells * 0.06, volume: 0.45 });
          continue;
        }
      }

      const target = this.targetsOf(bee.owner)
        .find((t) => Phaser.Math.Distance.Between(bee.x, bee.y, t.x, t.y) <= BEE_HIT_R);
      if (target) { this.latchBee(bee, target); continue; }
      if (bee.x < -20 || bee.x > this.api.width + 20 || bee.y < 70 || bee.y > this.api.height + 20) {
        this.bees.splice(i, 1);
      }
    }

    // The bot cannot physically press F outside its normal cooldown loop. Cash out a full hive
    // when it has deliberately walked back into range, preserving the player-facing interaction.
    const npc = this.fighter('npc');
    const fullNpcHive = this.hives.find((h) => h.owner === 'npc' && h.cells === HIVE_CELLS
      && (!this.upgraded('npc', 'f') || h.honey >= 10)
      && Phaser.Math.Distance.Between(npc.x, npc.y, h.x, h.y) <= HIVE_REDEEM_R);
    if (fullNpcHive) this.redeemHive(fullNpcHive, false);
  }

  private nearestRedeemableHive(owner: Owner): Hive | null {
    const f = this.fighter(owner);
    let best: Hive | null = null;
    let bestD = HIVE_REDEEM_R;
    for (const h of this.hives) {
      if (h.owner !== owner) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, h.x, h.y);
      if (d <= bestD) { best = h; bestD = d; }
    }
    return best;
  }

  private redeemHive(hive: Hive, exploded: boolean): void {
    const idx = this.hives.indexOf(hive);
    if (idx < 0) return;
    this.hives.splice(idx, 1);
    const orbitCount = Math.max(1, hive.cells) * 5;
    const shield = hive.cells <= 0 ? 0 : hive.cells <= 2 ? 1 : hive.cells <= 4 ? 2 : 3;
    this.spawnOrbitBees(hive.owner, orbitCount);
    if (shield > 0) {
      this.side(hive.owner).shields.push({ until: this.now + HIVE_BUFF_MS, beesPerHit: shield });
    }
    const honey = this.upgraded(hive.owner, 'f') ? Math.floor(hive.honey) : 0;
    if (honey > 0) {
      this.fighter(hive.owner).heal(honey);
      this.spawnHoneyPuddles(hive, Math.floor(honey / 10));
    }
    if (exploded && hive.cells > 0) this.spawnEdgeBees(hive.owner, 25 * hive.cells, hive.x, hive.y);
    this.flashes.push({
      kind: 'burst', x1: hive.x, y1: hive.y, x2: hive.x, y2: hive.y,
      bornAt: this.now, until: this.now + 650, color: HONEY, width: exploded ? 120 : 76,
    });
    this.api.showFloatingText(
      hive.x, hive.y - 56,
      `🐝 HIVE ×${orbitCount}${shield ? `  🛡${shield}` : ''}${honey ? `  +${honey} HP` : ''}`,
      '#ffd34f',
    );
    Sfx.playAt(exploded ? 'explosion-small' : 'holy-chord', hive.x, { rate: 1.2, volume: 0.75 });
  }

  private spawnHoneyPuddles(hive: Hive, count: number): void {
    const placed: Array<{ x: number; y: number }> = this.puddles
      .filter((p) => p.kind === 'honey')
      .map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < count; i++) {
      let spot: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 32; attempt++) {
        const ring = Math.floor(attempt / 8);
        const a = i / Math.max(1, count) * Math.PI * 2 + attempt * 2.39996;
        const d = 72 + ring * 72;
        const x = this.clampX(hive.x + Math.cos(a) * d);
        const y = this.clampY(hive.y + Math.sin(a) * d);
        if (placed.every((p) => Phaser.Math.Distance.Between(x, y, p.x, p.y)
            >= HONEY_PUDDLE_R * 2 + 4)) {
          spot = { x, y };
          break;
        }
      }
      if (!spot) continue;
      placed.push(spot);
      this.spawnPuddle(hive.owner, 'honey', spot.x, spot.y);
    }
  }

  private updateBombs(time: number, dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      if (time >= bomb.until) { this.bombs.splice(i, 1); continue; }
      if (bomb.state === 'self') {
        const f = this.fighter(bomb.owner);
        if (!f.active || f.hp <= 0) { this.bombs.splice(i, 1); continue; }
        const a = time / 280 + bomb.orbitIndex / BOMB_COUNT * Math.PI * 2;
        bomb.x = f.x + Math.cos(a) * (27 + (bomb.orbitIndex % 2) * 9);
        bomb.y = f.y + Math.sin(a) * (19 + (bomb.orbitIndex % 2) * 7);
        continue;
      }
      if (bomb.state === 'attached') {
        const target = bomb.target;
        if (!target?.active || target.hp <= 0) { this.bombs.splice(i, 1); continue; }
        bomb.x = target.x + bomb.offsetX;
        bomb.y = target.y + bomb.offsetY;
        continue;
      }

      bomb.x += bomb.vx * dt;
      bomb.y += bomb.vy * dt;
      const candle = this.candles.find((c) => c.owner === bomb.owner
        && Phaser.Math.Distance.Between(bomb.x, bomb.y, c.x, c.y) <= 24);
      if (candle) {
        this.explodeCandle(candle, bomb.owner);
        this.bombs.splice(i, 1);
        continue;
      }
      const hive = this.hives.find((h) => h.owner === bomb.owner
        && Phaser.Math.Distance.Between(bomb.x, bomb.y, h.x, h.y) <= HIVE_R + 8);
      if (hive) {
        this.redeemHive(hive, true);
        this.bombs.splice(i, 1);
        continue;
      }
      const target = this.targetsOf(bomb.owner)
        .find((t) => Phaser.Math.Distance.Between(bomb.x, bomb.y, t.x, t.y) <= BOMB_HIT_R);
      if (target) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.Between(12, 30);
        bomb.state = 'attached';
        bomb.target = target;
        bomb.offsetX = Math.cos(a) * r;
        bomb.offsetY = Math.sin(a) * r;
        bomb.until = time + BOMB_MS;
        bomb.vx = 0;
        bomb.vy = 0;
        this.api.spawnHitFlash(target.x, target.y, WAX);
        continue;
      }
      if (bomb.x < -20 || bomb.x > this.api.width + 20 || bomb.y < 70 || bomb.y > this.api.height + 20) {
        this.bombs.splice(i, 1);
      }
    }
    // A bot has no second physical Q press. Once its cone has finished travelling, resolve the
    // same recast a player would make; waiting for the last projectile preserves stack damage.
    const npcFlying = this.bombs.some((b) => b.owner === 'npc' && b.state === 'flying');
    if (this.api.npcAutonomous && !npcFlying && this.attachedBombCount('npc') > 0) {
      this.detonateBombs('npc');
    }
    const npcSelf = this.bombs.find((b) => b.owner === 'npc' && b.state === 'self');
    const npcTarget = this.nearestTarget('npc', this.api.npc.x, this.api.npc.y);
    if (this.api.npcAutonomous && npcSelf && time >= npcSelf.armedAt && npcTarget
        && Phaser.Math.Distance.Between(this.api.npc.x, this.api.npc.y, npcTarget.x, npcTarget.y)
          <= SELF_BOMB_RADIUS) {
      this.detonateSelfBombs('npc');
    }
  }

  private strapBombs(owner: Owner): void {
    if (this.ownedBombCount(owner) > 0) return;
    const f = this.fighter(owner);
    for (let i = 0; i < BOMB_COUNT; i++) {
      this.bombs.push({
        owner, state: 'self', x: f.x, y: f.y, vx: 0, vy: 0,
        until: this.now + BOMB_MS, target: f, offsetX: 0, offsetY: 0,
        seed: Math.random() * 1000, orbitIndex: i, armedAt: this.now + SELF_BOMB_ARM_MS,
      });
    }
    this.api.showFloatingText(f.x, f.y - 56, '🐝 RULE BEETANICA', '#ffdf7e');
    Sfx.playAt('grenade-launch', f.x, { rate: 0.75, volume: 0.8 });
  }

  /** Online replay for Q+'s held branch. The preceding ordinary Q stamp may have produced the
   * tap branch for one frame; replace those replica-only bombs with the authoritative payload. */
  doNpcRuleBeetanica(): void {
    this.bombs = this.bombs.filter((b) => b.owner !== 'npc');
    this.strapBombs('npc');
  }

  doNpcStickyDetonation(self: boolean): void {
    if (self) this.detonateSelfBombs('npc');
    else this.detonateBombs('npc');
  }

  private explodeCandle(candle: Candle, owner: Owner): void {
    const idx = this.candles.indexOf(candle);
    if (idx < 0) return;
    this.candles.splice(idx, 1);
    this.side(owner).candleBuffs.push(this.now + CANDLE_EXPLODE_BUFF_MS);
    this.flashes.push({
      kind: 'burst', x1: candle.x, y1: candle.y, x2: candle.x, y2: candle.y,
      bornAt: this.now, until: this.now + 620, color: WAX_LIGHT, width: CANDLE_RADIUS,
    });
    this.api.showFloatingText(candle.x, candle.y - 50, '🕯️ AURA BANKED — 15s', '#ffdf7e');
    Sfx.playAt('explosion-small', candle.x, { rate: 1.45, volume: 0.65 });
  }

  private attachedBombCount(owner: Owner): number {
    return this.bombs.filter((b) => b.owner === owner && b.state === 'attached').length;
  }

  private selfBombCount(owner: Owner): number {
    return this.bombs.filter((b) => b.owner === owner && b.state === 'self').length;
  }

  private ownedBombCount(owner: Owner): number {
    return this.bombs.filter((b) => b.owner === owner).length;
  }

  private detonateSelfBombs(owner: Owner): void {
    const count = this.selfBombCount(owner);
    if (count <= 0) return;
    const f = this.fighter(owner);
    const damage = Math.round(BOMB_DAMAGE * count * (1 + BOMB_PER_STACK * count));
    this.bombs = this.bombs.filter((b) => b.owner !== owner || b.state !== 'self');
    // Removing the strapped bombs first ensures their +25% incoming-damage penalty does not
    // inflate the explicitly one-third self share of their own explosion.
    this.updateMultipliers(this.now);
    for (const target of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) <= SELF_BOMB_RADIUS) {
        this.hit(owner, target, damage, { x: f.x, y: f.y });
      }
    }
    for (const candle of [...this.candles]) {
      if (candle.owner === owner
          && Phaser.Math.Distance.Between(f.x, f.y, candle.x, candle.y) <= SELF_BOMB_RADIUS) {
        this.explodeCandle(candle, owner);
      }
    }
    for (const hive of [...this.hives]) {
      if (hive.owner === owner
          && Phaser.Math.Distance.Between(f.x, f.y, hive.x, hive.y) <= SELF_BOMB_RADIUS) {
        this.redeemHive(hive, true);
      }
    }
    // A remote replica never reports this back as fresh damage: the owning player's sim has
    // already paid the one-third share. Solo bots and the local player still pay normally.
    if (owner === 'player' || this.api.npcAutonomous) {
      Fighter.asNonAllyDamage(() => f.takeDamage(
        Math.round(damage * SELF_BOMB_DAMAGE_SHARE),
        { source: this, sourceX: f.x, sourceY: f.y, selfInflicted: true },
      ));
    }
    this.flashes.push({
      kind: 'burst', x1: f.x, y1: f.y, x2: f.x, y2: f.y,
      bornAt: this.now, until: this.now + 850, color: WAX_LIGHT, width: SELF_BOMB_RADIUS,
    });
    this.api.showFloatingText(f.x, f.y - 62, `💥 ${damage} / SELF ${Math.round(damage * SELF_BOMB_DAMAGE_SHARE)}`, '#ffdf7e');
    Sfx.playAt('explosion-large', f.x, { rate: 0.82, volume: 0.95 });
  }

  private detonateBombs(owner: Owner): void {
    const grouped = new Map<Fighter, StickyBomb[]>();
    for (const bomb of this.bombs) {
      if (bomb.owner !== owner || bomb.state !== 'attached' || !bomb.target) continue;
      const list = grouped.get(bomb.target) ?? [];
      list.push(bomb);
      grouped.set(bomb.target, list);
    }
    for (const [target, bombs] of grouped) {
      const damage = Math.round(BOMB_DAMAGE * bombs.length * (1 + BOMB_PER_STACK * bombs.length));
      this.hit(owner, target, damage, bombs[0]);
      this.flashes.push({
        kind: 'burst', x1: target.x, y1: target.y, x2: target.x, y2: target.y,
        bornAt: this.now, until: this.now + 620, color: WAX_LIGHT, width: 48 + bombs.length * 5,
      });
      this.api.showFloatingText(target.x, target.y - 54, `🍯 ×${bombs.length}  ${damage}`, '#ffdf7e');
      this.api.spawnHitFlash(target.x, target.y, WAX_LIGHT);
    }
    if (grouped.size > 0) {
      Sfx.playAt('explosion-large', this.fighter(owner).x, { rate: 1.25, volume: 0.8 });
    }
    this.bombs = this.bombs.filter((b) => b.owner !== owner || b.state !== 'attached');
  }

  private updateShoves(time: number, dt: number): void {
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const s = this.shoves[i];
      if (time >= s.until || !s.target.active) { this.shoves.splice(i, 1); continue; }
      if (s.target.knockbackImmune) continue;
      s.target.setPosition(
        this.clampX(s.target.x + s.vx * dt),
        this.clampY(s.target.y + s.vy * dt),
      );
      const drag = Math.pow(0.05, dt / (SHOVE_MS / 1000));
      s.vx *= drag;
      s.vy *= drag;
    }
  }

  private updatePulls(time: number, dt: number): void {
    for (let i = this.pulls.length - 1; i >= 0; i--) {
      const pull = this.pulls[i];
      const caster = this.fighter(pull.owner);
      const target = pull.target;
      if (time >= pull.until || !caster.active || !target.active || target.hp <= 0) {
        this.pulls.splice(i, 1);
        continue;
      }
      const distance = Phaser.Math.Distance.Between(target.x, target.y, caster.x, caster.y);
      if (distance <= GRAPPLE_PULL_RANGE) { this.pulls.splice(i, 1); continue; }
      if (target.knockbackImmune) continue;
      const a = Math.atan2(caster.y - target.y, caster.x - target.x);
      const step = Math.min(GRAPPLE_PULL_SPEED * dt, distance - GRAPPLE_PULL_RANGE);
      target.setPosition(
        this.clampX(target.x + Math.cos(a) * step),
        this.clampY(target.y + Math.sin(a) * step),
      );
    }
  }

  private updateMultipliers(time: number): void {
    const fighters = new Set<Fighter>([this.api.player, this.api.npc, ...this.api.enemies]);
    for (const f of fighters) {
      if (!f) continue;
      let vuln = 0;
      vuln += this.bees.filter((b) => b.state === 'attached' && b.target === f && b.until > time).length * 0.01;
      if (this.bombs.some((b) => b.state === 'attached' && b.target === f && b.until > time)) vuln += 0.10;
      vuln += this.poisons
        .filter((p) => p.target === f && p.until > time)
        .reduce((sum, p) => sum + p.vulnStacks * 0.01, 0);
      let resist = 1;
      if (f === this.api.player && this.api.elementId === 'wax') {
        resist = Math.max(0, 1 - (1 - CANDLE_RESIST) * this.candleStacks('player')
          - this.side('player').meltingArmor.filter((until) => until > time).length * MELTING_ARMOR_PER_HIT);
        if (this.selfBombCount('player') > 0) vuln += SELF_BOMB_VULN;
      }
      if (f === this.api.npc && this.api.npcElementId === 'wax') {
        resist = Math.max(0, 1 - (1 - CANDLE_RESIST) * this.candleStacks('npc')
          - this.side('npc').meltingArmor.filter((until) => until > time).length * MELTING_ARMOR_PER_HIT);
        if (this.selfBombCount('npc') > 0) vuln += SELF_BOMB_VULN;
      }
      f.waxIncomingMult = resist * (1 + vuln);
    }
  }

  private updateHud(time: number): void {
    if (this.api.elementId !== 'wax') {
      this.api.setStatusIndicator('wax-candles', null);
      this.api.setStatusIndicator('wax-shield', null);
      this.api.setStatusIndicator('wax-melting-point', null);
      this.api.setStatusIndicator('wax-beetanica', null);
      return;
    }
    const candles = this.candleStacks('player');
    const shields = this.side('player').shields.filter((s) => s.until > time);
    this.api.setStatusIndicator('wax-candles', candles > 0 ? {
      name: 'Candle Aura', emoji: '🕯️', color: WAX,
      description: `${Math.round(Math.min(1, (1 - CANDLE_RESIST) * candles) * 100)}% damage resistance; summoned bees latch for ${candles * 2}s longer.`,
      count: candles, priority: 112,
    } : null);
    const beeRetaliation = shields.reduce((sum, s) => sum + s.beesPerHit, 0);
    this.api.setStatusIndicator('wax-shield', beeRetaliation > 0 ? {
      name: 'Bee Shield', emoji: '🐝', color: HONEY,
      description: `Taking damage applies ${beeRetaliation} ${beeRetaliation === 1 ? 'bee' : 'bees'} to the nearest attacker.`,
      until: Math.max(...shields.map((s) => s.until)), count: beeRetaliation, priority: 113,
    } : null);
    const melting = this.side('player').meltingArmor.filter((until) => until > time);
    this.api.setStatusIndicator('wax-melting-point', melting.length > 0 ? {
      name: 'Melting Point', emoji: '♨️', color: 0xff8b24,
      description: `${melting.length * 2}% additional damage resistance from recent hits.`,
      until: Math.max(...melting), count: melting.length, priority: 114,
    } : null);
    const strapped = this.selfBombCount('player');
    const charge = this.qHolding && !this.qHoldFired
      ? Phaser.Math.Clamp((time - this.qHoldStart) / BOMB_HOLD_MS, 0, 1)
      : 0;
    this.api.setStatusIndicator('wax-beetanica', strapped > 0 ? {
      name: 'Rule Beetanica', emoji: '💣', color: WAX_LIGHT,
      description: `${strapped} bombs strapped on; +25% incoming damage. Tap Q to detonate.`,
      count: strapped, priority: 115,
    } : charge > 0 ? {
      name: 'Strapping Bombs', emoji: '⏳', color: WAX,
      description: `Hold Q: ${Math.round(charge * 100)}%`,
      count: Math.max(1, Math.ceil(charge * 10)), priority: 115,
    } : null);
  }

  private hit(owner: Owner, target: Fighter, damage: number, source: object, status = false): void {
    const attacker = this.fighter(owner);
    target.lastDamageOwner = owner;
    target.setIncomingCritContext(attacker.critChance, attacker.critMult);
    const point = source as { x?: unknown; y?: unknown };
    target.takeDamage(
      Math.max(0, Math.round(damage * attacker.outgoingDamageMult * attacker.cardOutgoingDamageMult
        * (status ? target.statusDmgMult : 1))),
      {
        source,
        sourceX: typeof point.x === 'number' ? point.x : attacker.x,
        sourceY: typeof point.y === 'number' ? point.y : attacker.y,
      },
    );
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const target of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Squared(x, y, target.x, target.y);
      if (d < bestD) { best = target; bestD = d; }
    }
    return best;
  }

  private ensureLayers(): void {
    if (!this.groundGfx?.active) this.groundGfx = this.api.scene.add.graphics().setDepth(3);
    if (!this.objectGfx?.active) this.objectGfx = this.api.scene.add.graphics().setDepth(8);
    if (!this.airGfx?.active) this.airGfx = this.api.scene.add.graphics().setDepth(15);
  }

  private draw(time: number): void {
    const ground = this.groundGfx;
    const obj = this.objectGfx;
    const air = this.airGfx;
    if (!ground || !obj || !air) return;
    ground.clear();
    obj.clear();
    air.clear();

    for (const puddle of this.puddles) {
      const life = Phaser.Math.Clamp((puddle.until - time)
        / (puddle.kind === 'hot' ? HOT_WAX_MS : HONEY_PUDDLE_MS), 0, 1);
      const pulse = 0.86 + Math.sin(time / 170 + puddle.x) * 0.08;
      const color = puddle.kind === 'hot' ? 0xff8b24 : HONEY;
      ground.fillStyle(color, (puddle.kind === 'hot' ? 0.28 : 0.22) * life);
      ground.fillEllipse(puddle.x, puddle.y, puddle.radius * 2 * pulse, puddle.radius * 1.42 * pulse);
      ground.lineStyle(2, puddle.kind === 'hot' ? WAX_LIGHT : WAX_DARK, 0.5 * life);
      ground.strokeEllipse(puddle.x, puddle.y, puddle.radius * 2 * pulse, puddle.radius * 1.42 * pulse);
      if (puddle.kind === 'hot') {
        for (let i = 0; i < 3; i++) {
          const a = time / 240 + i * Math.PI * 2 / 3;
          ground.fillStyle(WAX_LIGHT, 0.55 * life);
          ground.fillCircle(puddle.x + Math.cos(a) * 19, puddle.y + Math.sin(a) * 11, 3);
        }
      }
    }

    for (const candle of this.candles) {
      const left = Phaser.Math.Clamp((candle.until - time) / CANDLE_MS, 0, 1);
      const flicker = 0.8 + Math.sin(this.vizT * 13 + candle.seed) * 0.16;
      ground.fillStyle(WAX, 0.055 + left * 0.045);
      ground.fillCircle(candle.x, candle.y, CANDLE_RADIUS);
      ground.lineStyle(2, WAX, 0.18 + flicker * 0.12);
      ground.strokeCircle(candle.x, candle.y, CANDLE_RADIUS);
      const h = 46 * left + 7;
      obj.fillStyle(WAX_DARK, 0.25);
      obj.fillEllipse(candle.x, candle.y + 8, 30, 11);
      obj.fillStyle(WAX, 0.96);
      obj.fillRoundedRect(candle.x - 10, candle.y - h, 20, h, 5);
      obj.fillStyle(WAX_LIGHT, 0.75);
      obj.fillRect(candle.x - 6, candle.y - h + 5, 4, Math.max(3, h - 10));
      obj.lineStyle(2, BEE_DARK, 0.85);
      obj.lineBetween(candle.x, candle.y - h, candle.x, candle.y - h - 6);
      obj.fillStyle(0xff8b24, 0.92);
      obj.fillEllipse(candle.x, candle.y - h - 11, 9 * flicker, 17 * flicker);
      obj.fillStyle(0xfff1a6, 0.9);
      obj.fillEllipse(candle.x, candle.y - h - 10, 4, 9);
    }

    for (const hive of this.hives) {
      obj.fillStyle(BEE_DARK, 0.28);
      obj.fillEllipse(hive.x, hive.y + 25, 58, 15);
      obj.fillStyle(HONEY, 0.96);
      obj.fillEllipse(hive.x, hive.y, 54, 49);
      obj.fillStyle(WAX_LIGHT, 0.72);
      for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
          obj.fillCircle(hive.x + col * 11 + (row & 1) * 5, hive.y + row * 11, 5);
        }
      }
      obj.fillStyle(BEE_DARK, 0.9);
      obj.fillEllipse(hive.x, hive.y + 8, 15, 9);
      const bx = hive.x - 31;
      const by = hive.y - 42;
      obj.fillStyle(0x17130d, 0.9);
      obj.fillRoundedRect(bx - 2, by - 2, 66, 12, 3);
      for (let i = 0; i < HIVE_CELLS; i++) {
        obj.fillStyle(i < hive.cells ? 0xffd42a : 0x4c4127, 1);
        obj.fillRoundedRect(bx + i * 13, by, 11, 8, 2);
      }
      if (this.upgraded(hive.owner, 'f')) {
        obj.fillStyle(0x17130d, 0.9);
        obj.fillRoundedRect(bx - 2, by + 13, 66, 8, 3);
        obj.fillStyle(0xffbd27, 0.96);
        obj.fillRoundedRect(bx, by + 15, 62 * (hive.honey / HONEY_MAX), 4, 2);
      }
    }

    for (const dart of this.darts) {
      const a = Math.atan2(dart.vy, dart.vx);
      if (dart.kind === 'grapple') {
        const f = this.fighter(dart.owner);
        air.lineStyle(3, BEE_DARK, 0.92);
        air.lineBetween(f.x, f.y, dart.x, dart.y);
        air.fillStyle(0x080706, 1);
        air.fillTriangle(
          dart.x + Math.cos(a) * 15, dart.y + Math.sin(a) * 15,
          dart.x + Math.cos(a + 2.45) * 10, dart.y + Math.sin(a + 2.45) * 10,
          dart.x + Math.cos(a - 2.45) * 10, dart.y + Math.sin(a - 2.45) * 10,
        );
      } else {
        air.lineStyle(4, WAX_DARK, 1);
        air.lineBetween(dart.x - Math.cos(a) * 13, dart.y - Math.sin(a) * 13, dart.x + Math.cos(a) * 9, dart.y + Math.sin(a) * 9);
        air.fillStyle(WAX_LIGHT, 0.95);
        air.fillCircle(dart.x + Math.cos(a) * 10, dart.y + Math.sin(a) * 10, 3);
      }
    }

    for (const bee of this.bees) this.drawBee(air, bee.x, bee.y, bee.seed, time, bee.elite);
    for (const bomb of this.bombs) {
      const pulse = 1 + Math.sin(time / 90 + bomb.seed) * 0.12;
      air.fillStyle(WAX_DARK, 0.95);
      air.fillCircle(bomb.x, bomb.y, 7 * pulse);
      air.fillStyle(WAX_LIGHT, 0.95);
      air.fillCircle(bomb.x - 1.5, bomb.y - 1.5, 4.5 * pulse);
      air.lineStyle(2, BEE_DARK, 0.9);
      air.strokeCircle(bomb.x, bomb.y, 8 * pulse);
      air.lineStyle(2, 0xff8b24, 0.9);
      air.lineBetween(bomb.x + 4, bomb.y - 5, bomb.x + 8, bomb.y - 10);
    }

    if (this.qHolding && !this.qHoldFired && this.api.elementId === 'wax') {
      const p = this.api.player;
      const ratio = Phaser.Math.Clamp((time - this.qHoldStart) / BOMB_HOLD_MS, 0, 1);
      air.lineStyle(5, ratio >= 1 ? WAX_LIGHT : WAX, 0.9);
      air.beginPath();
      air.arc(p.x, p.y, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      air.strokePath();
    }

    for (const poison of this.poisons) {
      const target = poison.target;
      if (!target.active) continue;
      air.lineStyle(2, POISON, 0.55 + Math.sin(time / 130) * 0.16);
      air.strokeCircle(target.x, target.y, 29 + Math.sin(time / 180) * 3);
      for (let i = 0; i < 4; i++) {
        const a = time / 500 + i * Math.PI / 2;
        air.fillStyle(POISON, 0.65);
        air.fillCircle(target.x + Math.cos(a) * 31, target.y + Math.sin(a) * 18, 3);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fx = this.flashes[i];
      if (time >= fx.until) { this.flashes.splice(i, 1); continue; }
      const p = Phaser.Math.Clamp((time - fx.bornAt) / (fx.until - fx.bornAt), 0, 1);
      if (fx.kind === 'thrust') {
        air.lineStyle(fx.width * (1 - p * 0.65), fx.color, 0.95 * (1 - p));
        const head = Math.min(1, p * 2.4);
        air.lineBetween(
          fx.x1, fx.y1,
          Phaser.Math.Linear(fx.x1, fx.x2, head),
          Phaser.Math.Linear(fx.y1, fx.y2, head),
        );
      } else {
        air.lineStyle(7 * (1 - p) + 1, fx.color, 0.82 * (1 - p));
        air.strokeCircle(fx.x1, fx.y1, 8 + fx.width * Phaser.Math.Easing.Cubic.Out(p));
      }
    }
  }

  private drawBee(
    g: Phaser.GameObjects.Graphics, x: number, y: number, seed: number, time: number, elite = false,
  ): void {
    const flap = 4 + Math.sin(time / 42 + seed) * 2;
    g.fillStyle(0xf7f3df, 0.72);
    g.fillEllipse(x - 3, y - flap, 9, 6);
    g.fillEllipse(x + 3, y - flap, 9, 6);
    g.fillStyle(elite ? 0xe83f36 : HONEY, 1);
    g.fillEllipse(x, y, 13, 8);
    g.lineStyle(2, BEE_DARK, 0.95);
    g.lineBetween(x - 2, y - 4, x - 2, y + 4);
    g.lineBetween(x + 3, y - 3, x + 3, y + 3);
    g.fillStyle(elite ? 0x66110d : BEE_DARK, 1);
    g.fillCircle(x + 6, y, 3);
  }

  // Compact AI state exposed to NpcOpponent.
  candleCount(owner: Owner): number {
    return this.candles.filter((c) => c.owner === owner).length;
  }

  hiveCount(owner: Owner): number {
    return this.hives.filter((h) => h.owner === owner).length;
  }

  attachedBombs(owner: Owner): number {
    return this.attachedBombCount(owner) + this.selfBombCount(owner);
  }

  hasStrappedBombs(owner: Owner): boolean {
    return this.selfBombCount(owner) > 0;
  }

  nearestHivePoint(owner: Owner): { x: number; y: number } | null {
    const f = this.fighter(owner);
    const mine = this.hives.filter((h) => h.owner === owner).sort((a, b) => (
      Phaser.Math.Distance.Squared(f.x, f.y, a.x, a.y)
      - Phaser.Math.Distance.Squared(f.x, f.y, b.x, b.y)
    ));
    return mine[0] ? { x: mine[0].x, y: mine[0].y } : null;
  }
}
