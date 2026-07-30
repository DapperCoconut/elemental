import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  AMB, AmberAvatar, AmberColorFn, AmberFx, amberChunk, bloodPuddle, meatShank,
  mosquito, raptor, triceratops, tyrannosaur,
} from './AmberVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Sling (Click) ────────────────────────────────────────────────────────────
const SLING_MIN_DAMAGE = 15;
const SLING_MAX_DAMAGE = 40;
/**
 * Charge is bought in radians of mouse travel, not in seconds — the ability only winds up if you
 * actually circle the character. 18 radians is a shade under three full revolutions, which is
 * about three seconds of brisk swinging and is the number the spec asks for.
 */
const CHARGE_RADIANS = 18;
const SLING_R = 46;
const SLING_CONTACT = 10;
const SLING_CONTACT_R = 17;
/** Per-victim immunity on the swinging stone, or standing next to it is a woodchipper. */
const SLING_GATE_MS = 620;
const ROCK_SPEED = 760;
const ROCK_LIFE_MS = 1500;
const ROCK_R = 14;

// ── Mosquito Drones (E) ──────────────────────────────────────────────────────
const MOZ_COUNT = 3;
const MOZ_HP = 20;
const MOZ_SPEED = 250;
const MOZ_RETURN_SPEED = 300;
const MOZ_STUCK_MS = 3000;
const MOZ_DPS = 5;
/** Three to a body. A fourth simply keeps circling until a slot opens. */
const MOZ_PER_VICTIM = 3;
const MOZ_HEAL = 15;
const PUDDLE_HEAL = 15;
const PUDDLE_MS = 14_000;
const PUDDLE_R = 20;
/** Below this much blood on board there is nothing to spill. */
const PUDDLE_MIN_FILL = 0.34;

// ── Begin the Hunt (R) ───────────────────────────────────────────────────────
const SHANK_FLIGHT_MS = 420;
const SHANK_WAIT_MS = 3000;
const FRENZY_MS = 3000;
const FRENZY_TOTAL = 35;
const FRENZY_TICK_MS = 150;
const FRENZY_R = 56;
/** How still an enemy has to be, in px/s, for the shank to stick to them. */
const SHANK_STICK_SPEED = 26;
const SHANK_STICK_R = 30;
const RAPTOR_COUNT = 5;

// ── Stampede (F) ─────────────────────────────────────────────────────────────
const STAMPEDE_TELL_MS = 2000;
const STAMPEDE_DAMAGE = 50;
const STAMPEDE_SPEED = 960;
/** Half the lane, as a fraction of arena height — a quarter of the screen, total. */
const LANE_HALF_FRAC = 0.125;
const TRIKE_HALF_W = 52;

// ── End the Hunt (Q) ─────────────────────────────────────────────────────────
const REX_MS = 12_000;
const REX_SPEED = 165;
const REX_SCALE = 1.15;
const REX_CLAW_REACH = 108;
const REX_CLAW_DAMAGE = 22;
const REX_BITE_REACH = 84;
const REX_BITE_DAMAGE = 38;
const REX_GRAB_REACH = 76;
const REX_THROW_DAMAGE = 60;
const REX_THROW_STUN_MS = 1600;
const REX_CARRY_MS = 1100;
/** Gap between the tyrannosaur choosing to do anything at all. */
const REX_ACTION_MS = 1400;
/** Nothing else dares appear — how long a grab has to wait before it can happen again. */
const REX_GRAB_COOLDOWN_MS = 4200;

// ── World objects ────────────────────────────────────────────────────────────

interface Rock {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  charge: number;
  spin: number;
  seed: number;
  diesAt: number;
  reg: RegisteredProjectile | null;
}

type MozState = 'hunt' | 'stuck' | 'return';

interface Mosquito {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  hp: number;
  state: MozState;
  target: Fighter | null;
  stuckUntil: number;
  /** Offset from the victim's centre while buried, so three of them don't stack. */
  ox: number;
  oy: number;
  /** 0–1 of a full belly. Anything over `PUDDLE_MIN_FILL` spills if it is killed. */
  fill: number;
  accum: number;
  beat: number;
  hurt: number;
  seed: number;
}

interface Puddle {
  x: number;
  y: number;
  diesAt: number;
  seed: number;
}

interface Shank {
  owner: Owner;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** 0–1 through the throw arc. */
  flight: number;
  landedAt: number;
  attached: Fighter | null;
  frenzyFrom: number;
  frenzyUntil: number;
  tick: number;
  seed: number;
  spin: number;
}

interface Stampede {
  owner: Owner;
  laneY: number;
  arrivesAt: number;
  x: number;
  running: boolean;
  hit: Set<Fighter>;
  seed: number;
  dustAccum: number;
}

type RexState = 'walk' | 'claw' | 'bite' | 'grab' | 'carry' | 'throw';

interface Rex {
  owner: Owner;
  x: number;
  y: number;
  face: 1 | -1;
  endsAt: number;
  state: RexState;
  stateUntil: number;
  nextActionAt: number;
  nextGrabAt: number;
  target: Fighter | null;
  carried: Fighter | null;
  /** Jaw hinge, 0 closed to 1 wide. */
  bite: number;
  rear: number;
  throwX: number;
  throwY: number;
  seed: number;
  stompAccum: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Sling: swinging, how wound up it is, and where the stone is on the circle. */
  swinging: boolean;
  swingStart: number;
  charge: number;
  stoneAng: number;
  lastAimAng: number;
  stoneGate: Map<Fighter, number>;
  stampede: Stampede | null;
  rex: Rex | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0,
    swinging: false, swingStart: 0, charge: 0, stoneAng: 0, lastAimAng: 0,
    stoneGate: new Map(), stampede: null, rex: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface AmberArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  /** The shared physics group — enemy shots are what kill mosquitoes. */
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
  get isInvasion(): boolean;
  /** Skins: maps an Amber visual colour through that side's equipped skin. */
  amberColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── AmberKit ─────────────────────────────────────────────────────────────────

export class AmberKit {
  private api: AmberArenaApi;

  // ── Visuals ──
  private readonly pcol: AmberColorFn;
  private readonly ncol: AmberColorFn;
  private readonly pfx: AmberFx;
  private readonly nfx: AmberFx;
  private playerAvatar: AmberAvatar | null = null;
  private npcAvatar: AmberAvatar | null = null;
  /** Puddles, shanks, dust and the stampede lane — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rocks, mosquitoes, raptors and the two big animals — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private rocks: Rock[] = [];
  private mosquitoes: Mosquito[] = [];
  private puddles: Puddle[] = [];
  private shanks: Shank[] = [];
  /** Everything this kit is currently holding still, and until when. */
  private stunned = new Map<Fighter, number>();

  constructor(api: AmberArenaApi) {
    this.api = api;
    this.pcol = (base) => api.amberColor('player', base);
    this.ncol = (base) => api.amberColor('npc', base);
    this.pfx = new AmberFx(api.scene, this.pcol);
    this.nfx = new AmberFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): AmberFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): AmberColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isAmber(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'amber' : this.api.npcElementId === 'amber';
  }

  private avatar(owner: Owner): AmberAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Where the sling stone currently is, in world space. */
  private stonePos(owner: Owner): { x: number; y: number } | null {
    const s = this.side(owner);
    if (!s.swinging) return null;
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    const r = SLING_R + s.charge * 14;
    return { x: f.x + Math.cos(s.stoneAng) * r, y: f.y + Math.sin(s.stoneAng) * r };
  }

  /** How much of the kit that side has alive right now, for the avatar's shard growth. */
  private packOf(owner: Owner): number {
    let n = 0;
    for (const m of this.mosquitoes) if (m.owner === owner) n += 0.18;
    for (const sh of this.shanks) if (sh.owner === owner) n += 0.25;
    if (this.sides[owner].stampede) n += 0.4;
    if (this.sides[owner].rex) n += 0.8;
    return Math.min(1, n);
  }

  private stunFor(f: Fighter, ms: number): void {
    this.stunned.set(f, Math.max(this.stunned.get(f) ?? 0, this.now + ms));
    // Speed is handled by this kit's own multiplier; casting is not, so the generic disarm
    // field carries that half — it is the one `castAbility` actually checks.
    f.disarmedUntil = Math.max(f.disarmedUntil, Date.now() + ms);
  }

  private isStunned(f: Fighter): boolean {
    return this.now < (this.stunned.get(f) ?? 0);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.stunned.clear();
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rocks = [];
    this.mosquitoes = [];
    this.puddles = [];
    this.shanks = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'amber') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p) || this.isStunned(p)) { s.swinging = false; return; }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // ── The sling ──
    // Press starts the swing; release throws. The cast is deliberately on the *release*, because
    // until the button comes up there is no way to know whether this was a tap or a wind-up.
    if (pointer.isDown && !this.api.pointerWasDown) this.beginSwing('player', mouseX, mouseY);
    if (s.swinging) this.advanceSwing('player', mouseX, mouseY);
    if (!pointer.isDown && this.api.pointerWasDown && s.swinging) {
      // Letting go always puts the sling away, even when the throw was refused by its own
      // cooldown — otherwise a click during the 420ms gate leaves the stone spinning forever.
      if (!p.castAbility('amber-sling', ctx)) { s.swinging = false; s.charge = 0; s.stoneGate.clear(); }
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('amber-mosquitoes', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('amber-hunt', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('amber-stampede', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('amber-trex', ctx);
  }

  private beginSwing(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    s.swinging = true;
    s.swingStart = this.now;
    s.charge = 0;
    s.stoneAng = Math.atan2(ty - f.y, tx - f.x);
    s.lastAimAng = s.stoneAng;
    s.stoneGate.clear();
  }

  /**
   * One frame of winding up. Charge is bought with *angular* mouse travel around the character,
   * so holding the button still buys nothing and waving it back and forth buys very little — you
   * have to actually describe circles, which is the whole feel of the ability.
   */
  private advanceSwing(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.swinging = false; return; }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const travel = Math.abs(Phaser.Math.Angle.Wrap(ang - s.lastAimAng));
    s.lastAimAng = ang;
    s.stoneAng = ang;
    if (s.charge < 1) s.charge = Math.min(1, s.charge + travel / CHARGE_RADIANS);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — throw the stone. A tap that never wound anything up is the floor of the ability, a
   * full three seconds of swinging is the ceiling, and everything between is a straight lerp.
   */
  doSling(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'amber-sling'); return; }
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const charge = s.swinging ? s.charge : 0;
    const damage = Math.round(SLING_MIN_DAMAGE + (SLING_MAX_DAMAGE - SLING_MIN_DAMAGE) * charge);
    const start = this.stonePos(owner) ?? { x: f.x, y: f.y };
    const ang = Math.atan2(ty - start.y, tx - start.x);

    s.swinging = false;
    s.charge = 0;
    s.stoneGate.clear();

    const rock: Rock = {
      owner,
      x: start.x, y: start.y,
      vx: Math.cos(ang) * ROCK_SPEED,
      vy: Math.sin(ang) * ROCK_SPEED,
      damage,
      charge,
      spin: 0,
      seed: Math.random() * 999,
      diesAt: this.now + ROCK_LIFE_MS,
      reg: null,
    };
    const reg: RegisteredProjectile = {
      owner,
      getX: () => rock.x,
      getY: () => rock.y,
      damage,
      steal: () => {
        const i = this.rocks.indexOf(rock);
        if (i >= 0) this.rocks.splice(i, 1);
      },
    };
    rock.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.rocks.push(rock);

    const av = this.avatar(owner);
    av?.setSling(0, null);
    av?.play('punch', ang);
    this.fx(owner).dust(start.x, start.y, 3, 10, 320, 8);
    Sfx.playAt('rock-throw', f.x, { volume: 0.55 + charge * 0.4, rate: 1.25 - charge * 0.4 });
    if (charge > 0.65) {
      this.api.showFloatingText(f.x, f.y - 48, `🪨 ${damage}`, this.hex(AMB.resinLit));
    }
  }

  /** E — three mosquitoes. */
  doMosquitoes(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'amber-mosquitoes'); return; }
    for (let i = 0; i < MOZ_COUNT; i++) {
      const a = (i / MOZ_COUNT) * Math.PI * 2 + Math.random();
      this.mosquitoes.push({
        owner,
        x: f.x + Math.cos(a) * 18,
        y: f.y + Math.sin(a) * 18,
        ang: a,
        hp: MOZ_HP,
        state: 'hunt',
        target: null,
        stuckUntil: 0,
        ox: 0, oy: 0,
        fill: 0,
        accum: 0,
        beat: Math.random() * 6,
        hurt: 0,
        seed: Math.random() * 999,
      });
    }
    this.avatar(owner)?.play('flex');
    this.api.showFloatingText(f.x, f.y - 46, '🦟 ×3', this.hex(AMB.resinLit));
    Sfx.playAt('drone-buzz', f.x, { volume: 0.8, rate: 1.4 });
  }

  /** R — throw the meat. Refuses while the tyrannosaur is out; nothing else gets a turn. */
  doBeginHunt(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'amber-hunt'); return; }
    if (this.side(owner).rex) { this.denyForRex(owner, 'amber-hunt'); return; }

    this.shanks.push({
      owner,
      x: f.x, y: f.y - 10,
      fromX: f.x, fromY: f.y - 10,
      toX: Phaser.Math.Clamp(tx, this.left + 16, this.right - 16),
      toY: Phaser.Math.Clamp(ty, this.top + 16, this.bottom - 16),
      flight: 0,
      landedAt: 0,
      attached: null,
      frenzyFrom: 0,
      frenzyUntil: 0,
      tick: 0,
      seed: Math.random() * 999,
      spin: 0,
    });
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('whoosh', f.x, { volume: 0.7, rate: 0.7 });
  }

  /** F — mark the lane. The lane is where you are *now*, which is the whole counterplay. */
  doStampede(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'amber-stampede'); return; }
    const s = this.side(owner);
    if (s.rex) { this.denyForRex(owner, 'amber-stampede'); return; }
    if (s.stampede) { this.refund(f, 'amber-stampede'); return; }

    s.stampede = {
      owner,
      laneY: f.y,
      arrivesAt: this.now + STAMPEDE_TELL_MS,
      x: this.left - 90,
      running: false,
      hit: new Set(),
      seed: Math.random() * 999,
      dustAccum: 0,
    };
    this.avatar(owner)?.play('slam');
    this.api.showFloatingText(f.x, f.y - 50, '🦏 STAMPEDE', this.hex(AMB.dust));
    Sfx.playAt('quake', f.x, { volume: 0.85, rate: 0.75 });
    this.api.scene.cameras.main.shake(STAMPEDE_TELL_MS, 0.004);
  }

  /** Q — the tyrannosaur. */
  doEndHunt(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'amber-trex'); return; }
    const s = this.side(owner);
    if (s.rex) { this.refund(f, 'amber-trex'); return; }

    const t = this.nearestTarget(owner, f.x, f.y);
    const sx = Phaser.Math.Clamp(t ? (t.x + f.x) / 2 : tx, this.left + 60, this.right - 60);
    const sy = Phaser.Math.Clamp(t ? (t.y + f.y) / 2 : ty, this.top + 60, this.bottom - 40);

    s.rex = {
      owner,
      x: sx, y: sy,
      face: t && t.x < sx ? -1 : 1,
      endsAt: this.now + REX_MS,
      state: 'walk',
      stateUntil: 0,
      nextActionAt: this.now + 900,
      nextGrabAt: this.now + 2400,
      target: t,
      carried: null,
      bite: 0,
      rear: 1,
      throwX: 0, throwY: 0,
      seed: Math.random() * 999,
      stompAccum: 0,
    };

    // Everything else goes home. Nothing else dares appear while it is here.
    s.stampede = null;
    for (let i = this.shanks.length - 1; i >= 0; i--) if (this.shanks[i].owner === owner) this.shanks.splice(i, 1);

    this.avatar(owner)?.play('raise');
    this.fx(owner).stomp(sx, sy + 26, 80);
    this.api.showFloatingText(f.x, f.y - 54, '🦖 END THE HUNT', this.hex(AMB.bloodLit));
    Sfx.playAt('roar', sx, { volume: 1, rate: 0.7 });
    Sfx.playAt('beast-transform', sx, { volume: 0.7, rate: 0.6 });
    this.api.scene.cameras.main.shake(500, 0.008);
  }

  private denyForRex(owner: Owner, abilityId: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, '🦖 NOTHING ELSE DARES', this.hex(AMB.hideLit));
    Sfx.playAt('ui-denied', f.x, { volume: 0.6 });
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'amber';
    const npcIs = this.api.npcElementId === 'amber';
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateNpcSwing(delta, npcIs);
    this.updateSwings(delta);
    this.updateRocks(delta);
    this.updateMosquitoes(delta);
    this.updatePuddles();
    this.updateShanks(delta);
    this.updateStampedes(delta);
    this.updateRexes(delta);
    this.updateStuns();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.pushStatuses(playerIs, npcIs);
    void time;
  }

  private hasLiveState(): boolean {
    return this.rocks.length > 0 || this.mosquitoes.length > 0 || this.puddles.length > 0
      || this.shanks.length > 0 || this.stunned.size > 0
      || BOTH.some((o) => !!this.sides[o].stampede || !!this.sides[o].rex || this.sides[o].swinging);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Puddles and carcasses are things you stand on; the animals are
    // things that stand over you, and the tyrannosaur especially has to be able to eclipse you.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  // ── Sling upkeep ───────────────────────────────────────────────────────────

  /**
   * The npc has no mouse, so it fakes one: a steady orbit while it decides to wind up.
   *
   * Opening the swing is the kit's job rather than the AI's, because the sling is a
   * press-and-hold and `doAI` only knows how to press keys. `doAmberAbilities` decides when to
   * *release* it — which is the half of the ability that actually has a decision in it.
   */
  private updateNpcSwing(delta: number, npcIs: boolean): void {
    const s = this.sides.npc;
    if (!npcIs) return;
    const f = this.api.npc;
    if (!this.alive(f) || this.isStunned(f)) { s.swinging = false; return; }
    if (!s.swinging) {
      // Only start winding when there is somebody to wind up at and the throw is off cooldown.
      // The tyrannosaur is no bar to this — it locks out the other *dinosaurs*, not his arm.
      if (f.getCooldownRatio('amber-sling') > 0) return;
      const t = this.nearestTarget('npc', f.x, f.y);
      if (!t || Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 520) return;
      this.beginSwing('npc', t.x, t.y);
      return;
    }
    const t = this.nearestTarget('npc', f.x, f.y);
    s.aimX = t?.x ?? s.aimX;
    s.aimY = t?.y ?? s.aimY;
    // 6 rad/s of phantom mouse: three seconds of this is one full charge, same as a player.
    const step = 6 * (delta / 1000);
    s.stoneAng += step;
    s.lastAimAng = s.stoneAng;
    if (s.charge < 1) s.charge = Math.min(1, s.charge + step / CHARGE_RADIANS);
  }

  /** The swinging stone hurts. Same for both sides. */
  private updateSwings(delta: number): void {
    void delta;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!s.swinging) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.isAmber(owner) || this.isStunned(f)) { s.swinging = false; continue; }
      const stone = this.stonePos(owner);
      if (!stone) continue;
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(stone.x, stone.y, t.x, t.y) > SLING_CONTACT_R + 10 * t.sizeMult) continue;
        const gate = s.stoneGate.get(t) ?? 0;
        if (this.now < gate) continue;
        s.stoneGate.set(t, this.now + SLING_GATE_MS);
        t.takeDamage(SLING_CONTACT);
        this.api.spawnHitFlash(t.x, t.y, AMB.resin);
        this.fx(owner).shatter(stone.x, stone.y, 16, 320);
        Sfx.playAt('hit-medium', t.x, { volume: 0.55, rate: 1.2 });
      }
    }
  }

  private updateRocks(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.spin += dt * (5 + r.charge * 9);

      let spent = false;
      for (const t of this.targetsOf(r.owner)) {
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > ROCK_R + 12 * t.sizeMult) continue;
        t.takeDamage(r.damage);
        this.api.spawnHitFlash(t.x, t.y, AMB.resinLit);
        this.fx(r.owner).shatter(t.x, t.y, 22 + r.charge * 18);
        Sfx.playAt(r.charge > 0.6 ? 'stone-slam' : 'hit-medium', t.x, { volume: 0.6 + r.charge * 0.35 });
        spent = true;
        break;
      }

      const gone = spent || this.now >= r.diesAt
        || r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom;
      if (!gone) continue;
      if (!spent) this.fx(r.owner).shatter(r.x, r.y, 16, 380);
      if (r.reg) this.api.projectileRegistry.remove(r.reg);
      this.rocks.splice(i, 1);
    }
  }

  // ── Mosquitoes ─────────────────────────────────────────────────────────────

  private updateMosquitoes(delta: number): void {
    const dt = delta / 1000;
    this.shootMosquitoes();

    for (let i = this.mosquitoes.length - 1; i >= 0; i--) {
      const m = this.mosquitoes[i];
      m.beat += dt * 46;
      m.hurt = Math.max(0, m.hurt - dt * 3);
      const home = this.fighter(m.owner);

      if (m.hp <= 0) { this.killMosquito(i); continue; }
      // The keeper is gone: so is the swarm.
      if (!this.alive(home) || !this.isAmber(m.owner)) { this.killMosquito(i); continue; }

      if (m.state === 'stuck') {
        const t = m.target;
        if (!this.alive(t)) { m.state = 'return'; m.target = null; continue; }
        m.x = t!.x + m.ox;
        m.y = t!.y + m.oy;
        m.ang = Math.atan2(t!.y - m.y, t!.x - m.x);
        m.accum += delta;
        m.fill = Math.min(1, m.fill + dt / (MOZ_STUCK_MS / 1000));
        if (m.accum >= 500) {
          m.accum -= 500;
          t!.takeDamage(MOZ_DPS * 0.5);
          this.api.spawnHitFlash(m.x, m.y, AMB.blood);
        }
        if (this.now >= m.stuckUntil) {
          m.state = 'return';
          this.fx(m.owner).spatter(m.x, m.y, 4, 16);
        }
        continue;
      }

      if (m.state === 'return') {
        const d = Phaser.Math.Distance.Between(m.x, m.y, home.x, home.y);
        m.ang = Math.atan2(home.y - m.y, home.x - m.x);
        m.x += Math.cos(m.ang) * MOZ_RETURN_SPEED * dt;
        m.y += Math.sin(m.ang) * MOZ_RETURN_SPEED * dt;
        if (d > 20) continue;
        // Home with a full belly: the owner drinks it, the mosquito is patched up and sent back.
        if (m.fill > 0.05) {
          home.heal(MOZ_HEAL);
          this.api.showFloatingText(home.x, home.y - 34, `🩸 +${MOZ_HEAL}`, this.hex(AMB.bloodLit));
          Sfx.playAt('heal', home.x, { volume: 0.5, rate: 1.3 });
        }
        m.fill = 0;
        m.hp = MOZ_HP;
        m.state = 'hunt';
        m.target = null;
        continue;
      }

      // ── hunt ──
      if (!this.alive(m.target)) m.target = this.nearestTarget(m.owner, m.x, m.y);
      const t = m.target;
      if (!t) {
        // Nothing to bite: loiter around the owner rather than piling into a corner.
        const orbit = this.vizT * 1.6 + m.seed;
        const tx = home.x + Math.cos(orbit) * 40;
        const ty = home.y + Math.sin(orbit) * 26;
        m.ang = Math.atan2(ty - m.y, tx - m.x);
        m.x += Math.cos(m.ang) * MOZ_SPEED * 0.5 * dt;
        m.y += Math.sin(m.ang) * MOZ_SPEED * 0.5 * dt;
        continue;
      }

      const want = Math.atan2(t.y - m.y, t.x - m.x);
      // A slight weave, so three of them do not fly the same line.
      m.ang = Phaser.Math.Angle.RotateTo(m.ang, want + Math.sin(this.vizT * 5 + m.seed) * 0.3, 7 * dt);
      m.x += Math.cos(m.ang) * MOZ_SPEED * dt;
      m.y += Math.sin(m.ang) * MOZ_SPEED * dt;

      if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > 16 + 10 * t.sizeMult) continue;
      const already = this.mosquitoes.filter((o) => o.state === 'stuck' && o.target === t).length;
      if (already >= MOZ_PER_VICTIM) {
        // Full up. Peel off and come round again rather than jittering on the spot.
        m.ang += 1.6;
        m.x += Math.cos(m.ang) * 26;
        m.y += Math.sin(m.ang) * 26;
        continue;
      }
      m.state = 'stuck';
      m.target = t;
      m.stuckUntil = this.now + MOZ_STUCK_MS;
      m.accum = 0;
      const a = Math.random() * Math.PI * 2;
      m.ox = Math.cos(a) * 12;
      m.oy = Math.sin(a) * 12;
      this.api.spawnHitFlash(t.x, t.y, AMB.blood);
      this.api.showFloatingText(t.x, t.y - 30, '🦟 LATCHED', this.hex(AMB.bloodLit));
      Sfx.playAt('stab', t.x, { volume: 0.5, rate: 1.6 });
    }
  }

  /**
   * The mosquitoes are killable, and this is the only thing in the kit that kills them: any shot
   * belonging to the other side that touches one. Buried mosquitoes are exempt — the spec makes
   * them untouchable while they are in, which is what makes the three seconds worth the risk.
   */
  private shootMosquitoes(): void {
    if (this.mosquitoes.length === 0) return;
    for (const m of this.mosquitoes) {
      if (m.state === 'stuck' || m.hp <= 0) continue;
      const theirs: Owner = this.other(m.owner);
      const mineIsPlayer = m.owner === 'player';

      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) > 14) continue;
        m.hp -= Math.max(5, p.damage ?? 10);
        m.hurt = 1;
        p.destroy();
        break;
      }
      if (m.hp <= 0) continue;
      for (const rp of this.api.projectileRegistry.within(theirs, m.x, m.y, 14)) {
        m.hp -= Math.max(5, rp.damage);
        m.hurt = 1;
        this.api.projectileRegistry.steal(rp);
        break;
      }
    }
  }

  private killMosquito(i: number): void {
    const m = this.mosquitoes[i];
    this.mosquitoes.splice(i, 1);
    this.fx(m.owner).spatter(m.x, m.y, 6, 22);
    Sfx.playAt('slime-splat', m.x, { volume: 0.45, rate: 1.5 });
    // A loaded mosquito spills what it was carrying, and either side can drink it.
    if (m.fill < PUDDLE_MIN_FILL) return;
    this.puddles.push({
      x: Phaser.Math.Clamp(m.x, this.left + 12, this.right - 12),
      y: Phaser.Math.Clamp(m.y, this.top + 12, this.bottom - 12),
      diesAt: this.now + PUDDLE_MS,
      seed: Math.random() * 999,
    });
  }

  /** Blood on the floor. Whoever steps in it first drinks it — there are no sides on a puddle. */
  private updatePuddles(): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (this.now >= p.diesAt) { this.puddles.splice(i, 1); continue; }
      const bodies: Fighter[] = [this.api.player, this.api.npc, ...this.api.enemies];
      for (const f of bodies) {
        if (!this.alive(f)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > PUDDLE_R + 8 * f.sizeMult) continue;
        f.heal(PUDDLE_HEAL);
        this.api.showFloatingText(f.x, f.y - 34, `🩸 +${PUDDLE_HEAL}`, this.hex(AMB.bloodLit));
        Sfx.playAt('heal', f.x, { volume: 0.6, rate: 0.95 });
        this.puddles.splice(i, 1);
        break;
      }
    }
  }

  // ── Begin the Hunt ─────────────────────────────────────────────────────────

  private updateShanks(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shanks.length - 1; i >= 0; i--) {
      const sh = this.shanks[i];
      sh.spin += dt * 6;

      // ── In flight ──
      if (sh.landedAt === 0) {
        sh.flight = Math.min(1, sh.flight + delta / SHANK_FLIGHT_MS);
        sh.x = sh.fromX + (sh.toX - sh.fromX) * sh.flight;
        sh.y = sh.fromY + (sh.toY - sh.fromY) * sh.flight - Math.sin(sh.flight * Math.PI) * 46;
        if (sh.flight < 1) continue;

        sh.landedAt = this.now;
        sh.frenzyFrom = this.now + SHANK_WAIT_MS;
        sh.frenzyUntil = sh.frenzyFrom + FRENZY_MS;
        // Landed on somebody who was standing still: from here it goes wherever they go.
        for (const t of this.targetsOf(sh.owner)) {
          if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > SHANK_STICK_R + 8 * t.sizeMult) continue;
          const b = t.body as Phaser.Physics.Arcade.Body | null;
          const speed = b ? Math.hypot(b.velocity.x, b.velocity.y) : 0;
          if (speed > SHANK_STICK_SPEED) continue;
          sh.attached = t;
          this.api.showFloatingText(t.x, t.y - 42, '🍖 MARKED', this.hex(AMB.blood));
          Sfx.playAt('status-mark', t.x, { volume: 0.8, rate: 0.8 });
          break;
        }
        this.fx(sh.owner).spatter(sh.x, sh.y, 8, 24);
        Sfx.playAt('slime-splat', sh.x, { volume: 0.6, rate: 0.7 });
        continue;
      }

      if (sh.attached && !this.alive(sh.attached)) sh.attached = null;
      if (sh.attached) { sh.x = sh.attached.x; sh.y = sh.attached.y + 6; }

      // ── The wait ──
      if (this.now < sh.frenzyFrom) {
        if (Math.random() < dt * 3) this.fx(sh.owner).dust(sh.x, sh.y + 8, 2, 14, 420, 4);
        continue;
      }

      // ── The frenzy ──
      if (this.now >= sh.frenzyUntil) {
        this.shanks.splice(i, 1);
        this.fx(sh.owner).dust(sh.x, sh.y, 10, 40, 700, 4);
        continue;
      }
      if (this.now - sh.landedAt < SHANK_WAIT_MS + 40) {
        Sfx.playAt('screech', sh.x, { volume: 0.85, rate: 1.15 });
      }

      sh.tick += delta;
      while (sh.tick >= FRENZY_TICK_MS) {
        sh.tick -= FRENZY_TICK_MS;
        const per = FRENZY_TOTAL / (FRENZY_MS / FRENZY_TICK_MS);
        for (const t of this.targetsOf(sh.owner)) {
          const attachedHere = sh.attached === t;
          if (!attachedHere && Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > FRENZY_R + 8 * t.sizeMult) continue;
          t.takeDamage(per);
          if (Math.random() < 0.45) {
            const a = Math.random() * Math.PI * 2;
            this.fx(sh.owner).rake(t.x, t.y, a, 26, 240, 11, 1, AMB.bone);
          }
        }
        if (Math.random() < 0.3) Sfx.playAt('claw', sh.x, { volume: 0.4, rate: 1.2 + Math.random() * 0.5 });
      }
    }
  }

  // ── Stampede ───────────────────────────────────────────────────────────────

  private updateStampedes(delta: number): void {
    const dt = delta / 1000;
    const half = this.api.height * LANE_HALF_FRAC;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const st = s.stampede;
      if (!st) continue;

      if (!st.running) {
        st.dustAccum += delta;
        if (st.dustAccum >= 180) {
          st.dustAccum = 0;
          const x = this.left + Math.random() * (this.right - this.left);
          this.fx(owner).rumble(x, st.laneY + (Math.random() - 0.5) * half * 1.4, 90, 520);
        }
        if (this.now < st.arrivesAt) continue;
        st.running = true;
        st.x = this.left - 100;
        Sfx.playAt('train-horn', this.left, { volume: 0.7, rate: 0.8 });
        Sfx.playAt('roar', this.left, { volume: 0.8, rate: 0.6 });
        this.api.scene.cameras.main.shake(900, 0.01);
        continue;
      }

      st.x += STAMPEDE_SPEED * dt;
      st.dustAccum += delta;
      if (st.dustAccum >= 70) {
        st.dustAccum = 0;
        this.fx(owner).dust(st.x - 40, st.laneY + half * 0.7, 5, 40, 620, 4);
      }

      for (const t of this.targetsOf(owner)) {
        if (st.hit.has(t)) continue;
        if (Math.abs(t.y - st.laneY) > half + 6 * t.sizeMult) continue;
        if (Math.abs(t.x - st.x) > TRIKE_HALF_W + 10 * t.sizeMult) continue;
        st.hit.add(t);
        t.takeDamage(STAMPEDE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, AMB.dust);
        this.fx(owner).stomp(t.x, t.y, 54);
        this.api.showFloatingText(t.x, t.y - 44, '🦏 TRAMPLED', this.hex(AMB.dust));
        Sfx.playAt('hit-heavy', t.x, { volume: 0.95 });
      }

      if (st.x > this.right + 140) s.stampede = null;
    }
  }

  // ── End the Hunt ───────────────────────────────────────────────────────────

  private updateRexes(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const r = s.rex;
      if (!r) continue;

      const keeper = this.fighter(owner);
      const expired = this.now >= r.endsAt || !this.alive(keeper) || !this.isAmber(owner);
      if (expired && r.state !== 'carry') { this.dismissRex(owner); continue; }

      r.rear = Math.max(0, r.rear - dt * 1.6);
      r.bite = Math.max(0, r.bite - dt * 3);
      if (!this.alive(r.target)) r.target = this.nearestTarget(owner, r.x, r.y);

      // Footfalls, so something this size is audible before it is on top of you.
      r.stompAccum += delta;
      if (r.stompAccum >= 620 && r.state === 'walk') {
        r.stompAccum = 0;
        this.fx(owner).dust(r.x - r.face * 20, r.y + 34 * REX_SCALE, 5, 26, 520, 4);
        Sfx.playAt('footstep', r.x, { volume: 0.55, rate: 0.5 });
      }

      switch (r.state) {
        case 'carry': this.rexCarry(r, dt, expired); break;
        case 'throw': if (this.now >= r.stateUntil) r.state = 'walk'; break;
        case 'claw':
        case 'bite':
        case 'grab':
          if (this.now >= r.stateUntil) r.state = 'walk';
          break;
        default: this.rexWalk(r, dt); break;
      }
    }
  }

  private rexWalk(r: Rex, dt: number): void {
    const t = r.target;
    if (t) {
      r.face = t.x < r.x ? -1 : 1;
      const d = Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y);
      if (d > 70) {
        const a = Math.atan2(t.y - r.y, t.x - r.x);
        r.x = Phaser.Math.Clamp(r.x + Math.cos(a) * REX_SPEED * dt, this.left + 30, this.right - 30);
        r.y = Phaser.Math.Clamp(r.y + Math.sin(a) * REX_SPEED * dt, this.top + 40, this.bottom - 20);
      }
    }
    if (this.now < r.nextActionAt || !t) return;

    const d = Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y);
    // Grab is the showpiece and it is on its own long timer; bite is the reward for being
    // close; the claw is what happens the rest of the time.
    if (d <= REX_GRAB_REACH && this.now >= r.nextGrabAt) { this.rexGrab(r, t); return; }
    if (d <= REX_BITE_REACH && Math.random() < 0.45) { this.rexBite(r, t); return; }
    if (d <= REX_CLAW_REACH) { this.rexClaw(r, t); return; }
  }

  private rexClaw(r: Rex, t: Fighter): void {
    r.state = 'claw';
    r.stateUntil = this.now + 420;
    r.nextActionAt = this.now + REX_ACTION_MS;
    const a = Math.atan2(t.y - r.y, t.x - r.x);
    for (const v of this.targetsOf(r.owner)) {
      if (Phaser.Math.Distance.Between(r.x, r.y, v.x, v.y) > REX_CLAW_REACH + 10 * v.sizeMult) continue;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(v.y - r.y, v.x - r.x) - a)) > 1.0) continue;
      v.takeDamage(REX_CLAW_DAMAGE);
      this.api.spawnHitFlash(v.x, v.y, AMB.bone);
      this.fx(r.owner).rake(v.x, v.y, a + Math.PI / 2, 44, 320, 11, 1, AMB.bone);
      this.api.showFloatingText(v.x, v.y - 38, '🦖 CLAW', this.hex(AMB.bone));
    }
    Sfx.playAt('claw', r.x, { volume: 0.85, rate: 0.75 });
  }

  private rexBite(r: Rex, t: Fighter): void {
    r.state = 'bite';
    r.stateUntil = this.now + 520;
    r.nextActionAt = this.now + REX_ACTION_MS;
    r.bite = 1;
    if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) <= REX_BITE_REACH + 10 * t.sizeMult) {
      t.takeDamage(REX_BITE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, AMB.blood);
      this.fx(r.owner).spatter(t.x, t.y, 9, 30);
      this.api.showFloatingText(t.x, t.y - 40, '🦖 BITE', this.hex(AMB.bloodLit));
    }
    Sfx.playAt('bone', r.x, { volume: 0.9, rate: 0.7 });
  }

  /** The set piece: pick somebody up, walk them to the nearest wall, and let go hard. */
  private rexGrab(r: Rex, t: Fighter): void {
    r.state = 'carry';
    r.carried = t;
    r.stateUntil = this.now + REX_CARRY_MS;
    r.nextActionAt = this.now + REX_ACTION_MS;
    r.nextGrabAt = this.now + REX_GRAB_COOLDOWN_MS;
    r.bite = 1;
    // Whichever wall is closest: the shortest carry is the most readable one.
    const dl = t.x - this.left;
    const dr = this.right - t.x;
    const dt2 = t.y - this.top;
    const db = this.bottom - t.y;
    const min = Math.min(dl, dr, dt2, db);
    r.throwX = min === dl ? this.left + 22 : min === dr ? this.right - 22 : t.x;
    r.throwY = min === dt2 ? this.top + 22 : min === db ? this.bottom - 22 : t.y;

    this.stunFor(t, REX_CARRY_MS + REX_THROW_STUN_MS);
    this.api.showFloatingText(t.x, t.y - 46, '🦖 SEIZED', this.hex(AMB.bloodLit));
    Sfx.playAt('grapple', r.x, { volume: 0.9, rate: 0.7 });
    Sfx.playAt('roar', r.x, { volume: 0.7, rate: 0.85 });
  }

  private rexCarry(r: Rex, dt: number, expired: boolean): void {
    const v = r.carried;
    if (!this.alive(v)) { r.carried = null; r.state = 'walk'; if (expired) this.dismissRex(r.owner); return; }

    // Walk toward the wall with the victim held in the jaws.
    r.face = r.throwX < r.x ? -1 : 1;
    const a = Math.atan2(r.throwY - r.y, r.throwX - r.x);
    const remain = Phaser.Math.Distance.Between(r.x, r.y, r.throwX, r.throwY);
    if (remain > 60) {
      r.x = Phaser.Math.Clamp(r.x + Math.cos(a) * REX_SPEED * 1.5 * dt, this.left + 30, this.right - 30);
      r.y = Phaser.Math.Clamp(r.y + Math.sin(a) * REX_SPEED * 1.5 * dt, this.top + 40, this.bottom - 20);
    }
    r.bite = 0.5;

    // The victim rides in the jaws. Position is written here rather than to the body's velocity
    // because this update runs *after* the frame's movement, so it is the last word.
    const jx = r.x + r.face * 42 * REX_SCALE;
    const jy = r.y - 18 * REX_SCALE;
    v!.setPosition(jx, jy);
    this.body(v!).reset(jx, jy);

    if (this.now < r.stateUntil && remain > 60) return;

    // ── Throw ──
    const tx = Phaser.Math.Clamp(r.throwX, this.left + 14, this.right - 14);
    const ty = Phaser.Math.Clamp(r.throwY, this.top + 14, this.bottom - 14);
    v!.setPosition(tx, ty);
    this.body(v!).reset(tx, ty);
    v!.takeDamage(REX_THROW_DAMAGE);
    this.api.spawnHitFlash(tx, ty, AMB.bloodLit);
    this.fx(r.owner).stomp(tx, ty, 66);
    this.fx(r.owner).spatter(tx, ty, 12, 40);
    this.api.showFloatingText(tx, ty - 46, '🦖 SLAMMED', this.hex(AMB.bloodLit));
    Sfx.playAt('stone-slam', tx, { volume: 1, rate: 0.65 });
    this.api.scene.cameras.main.shake(280, 0.012);

    r.carried = null;
    r.state = 'throw';
    r.stateUntil = this.now + 420;
    r.bite = 1;
    if (this.now >= r.endsAt) this.dismissRex(r.owner);
  }

  private dismissRex(owner: Owner): void {
    const s = this.side(owner);
    const r = s.rex;
    if (!r) return;
    s.rex = null;
    this.fx(owner).stomp(r.x, r.y + 30, 70);
    this.fx(owner).dust(r.x, r.y + 30, 14, 60, 900, 4);
    Sfx.playAt('roar', r.x, { volume: 0.7, rate: 0.55 });
  }

  private updateStuns(): void {
    for (const [f, until] of [...this.stunned]) {
      if (!this.alive(f) || this.now >= until) this.stunned.delete(f);
    }
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
        av = new AmberAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }

      const s = this.sides[owner];
      const aim = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.nearestTarget(owner, f.x, f.y) ?? { x: s.aimX, y: s.aimY });
      const face = Math.atan2(aim.y - f.y, aim.x - f.x);
      av.setFacing(face);
      av.setPack(this.packOf(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.setIntensity(s.rex ? 1.4 : 1);

      const stone = this.stonePos(owner);
      av.setSling(s.charge, stone);
      av.setHold(stone ? 'draw' : null, s.stoneAng);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const p of this.puddles) {
      const left = Phaser.Math.Clamp((p.diesAt - this.now) / 2000, 0, 1);
      bloodPuddle(g, this.pcol, p.x, p.y, PUDDLE_R, 0.35 + left * 0.6, { t: this.vizT, seed: p.seed });
    }

    // The stampede lane, telegraphed before the animal is anywhere near it.
    const half = this.api.height * LANE_HALF_FRAC;
    for (const owner of BOTH) {
      const st = this.sides[owner].stampede;
      if (!st) continue;
      const warn = st.running ? 0.35 : 1 - Phaser.Math.Clamp((st.arrivesAt - this.now) / STAMPEDE_TELL_MS, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(this.vizT * 12);
      g.fillStyle(this.col(owner)(AMB.dust), 0.06 + warn * 0.12 * pulse);
      g.fillRect(this.left, st.laneY - half, this.right - this.left, half * 2);
      g.lineStyle(2, this.col(owner)(AMB.earth), 0.3 + warn * 0.5 * pulse);
      g.lineBetween(this.left, st.laneY - half, this.right, st.laneY - half);
      g.lineBetween(this.left, st.laneY + half, this.right, st.laneY + half);
    }

    // The shank sits on the floor; the raptors that come for it do not.
    for (const sh of this.shanks) {
      const airborne = sh.landedAt === 0;
      g.fillStyle(this.col(sh.owner)(AMB.ink), airborne ? 0.2 : 0.4);
      g.fillEllipse(sh.x, airborne ? sh.toY + 8 : sh.y + 9, 26, 8);
      meatShank(g, this.col(sh.owner), sh.x, sh.y, airborne ? sh.spin : 0.25, 1,
        { seed: sh.seed, t: this.vizT });
      // A ring of gore once the pack has started on it.
      if (this.now >= sh.frenzyFrom && this.now < sh.frenzyUntil) {
        g.fillStyle(this.col(sh.owner)(AMB.blood), 0.16);
        g.fillEllipse(sh.x, sh.y + 6, FRENZY_R * 1.9, FRENZY_R * 0.9);
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const r of this.rocks) {
      amberChunk(g, this.col(r.owner), r.x, r.y, 7 + r.charge * 6, 1,
        { seed: r.seed, spin: r.spin, alive: r.charge > 0.7, hot: r.charge });
    }

    for (const m of this.mosquitoes) {
      mosquito(g, this.col(m.owner), m.x, m.y, m.ang, m.state === 'stuck' ? 0.95 : 1,
        { fill: m.fill, beat: m.beat, size: 1, hurt: m.hurt });
    }

    // The pack: raptors circling the carcass, drawn only while the frenzy is actually running.
    for (const sh of this.shanks) {
      if (this.now < sh.frenzyFrom || this.now >= sh.frenzyUntil) continue;
      for (let i = 0; i < RAPTOR_COUNT; i++) {
        const ph = this.vizT * 2.6 + (i / RAPTOR_COUNT) * Math.PI * 2 + sh.seed;
        const rr = FRENZY_R * (0.45 + 0.25 * Math.abs(Math.sin(ph * 1.7)));
        const rx = sh.x + Math.cos(ph) * rr;
        const ry = sh.y + Math.sin(ph) * rr * 0.55;
        raptor(g, this.col(sh.owner), rx, ry, Math.cos(ph) > 0 ? -1 : 1, 1,
          { t: this.vizT, size: 0.95, seed: i * 7 });
      }
    }

    for (const owner of BOTH) {
      const st = this.sides[owner].stampede;
      if (st?.running) {
        triceratops(g, this.col(owner), st.x, st.laneY, 1, 1.05, 1, { t: this.vizT });
      }
      const r = this.sides[owner].rex;
      if (r) {
        tyrannosaur(g, this.col(owner), r.x, r.y, r.face, REX_SCALE, 1,
          { t: this.vizT, bite: r.bite, rear: r.rear });
      }
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('amber-charge', playerIs && s.swinging ? {
      name: 'Sling', emoji: '🪨', color: AMB.resinLit,
      description: `Keep circling the mouse around yourself to wind up. Release to throw for ${Math.round(SLING_MIN_DAMAGE + (SLING_MAX_DAMAGE - SLING_MIN_DAMAGE) * s.charge)} damage — the stone also hits anything it passes through for ${SLING_CONTACT}.`,
      count: Math.round(s.charge * 100), suffix: '%', priority: 128,
    } : null);

    const mine = this.mosquitoes.filter((m) => m.owner === 'player').length;
    const loaded = this.mosquitoes.filter((m) => m.owner === 'player' && m.fill > PUDDLE_MIN_FILL).length;
    this.api.setStatusIndicator('amber-swarm', playerIs && mine > 0 ? {
      name: 'Mosquitoes', emoji: '🦟', color: AMB.bloodLit,
      description: `${mine} alive${loaded ? `, ${loaded} carrying blood` : ''}. Each has 20 HP, deals 5 a second while buried, and heals you 15 every time one makes it home. Shoot one down while it is loaded and the blood spills as a puddle either side can drink.`,
      count: mine, priority: 129,
    } : null);

    const onMe = this.mosquitoes.filter((m) => m.state === 'stuck' && m.target === p).length;
    this.api.setStatusIndicator('amber-bitten', onMe > 0 ? {
      name: 'Bitten', emoji: '🩸', color: AMB.blood,
      description: 'Mosquitoes are buried in you, draining 5 HP a second each. They cannot be hurt while they are in — but they have to fly home afterwards.',
      count: onMe, priority: 6,
    } : null);

    const myShank = this.shanks.find((sh) => sh.owner === 'player');
    this.api.setStatusIndicator('amber-shank', playerIs && myShank ? {
      name: myShank!.frenzyFrom > this.now ? 'Meat Down' : 'Feeding Frenzy', emoji: '🍖', color: AMB.blood,
      description: myShank!.attached
        ? 'The shank is stuck to them. The pack will follow it wherever they run.'
        : 'A shank is on the ground. Three seconds after it lands the raptors arrive and tear 35 damage out of everything at the carcass.',
      until: myShank!.frenzyFrom > this.now ? myShank!.frenzyFrom : myShank!.frenzyUntil,
      priority: 127,
    } : null);

    const st = s.stampede;
    this.api.setStatusIndicator('amber-stampede', playerIs && st ? {
      name: st!.running ? 'Stampede' : 'Rumbling', emoji: '🦏', color: AMB.dust,
      description: 'A triceratops is coming through the lane you were standing in when you cast, left to right, for 50 damage. It does not care where you are now.',
      until: st!.running ? undefined : st!.arrivesAt, priority: 126,
    } : null);

    // Their stampede is the one that matters most — it is the only unavoidable thing in the kit.
    const theirs = this.sides.npc.stampede;
    this.api.setStatusIndicator('amber-stampede-warn', npcIs && theirs && !theirs.running ? {
      name: 'Something Is Coming', emoji: '💨', color: AMB.earth,
      description: 'The ground is shaking in a lane across the arena. Whatever is about to come through it deals 50 damage — get out of the marked band.',
      until: theirs!.arrivesAt, priority: 1,
    } : null);

    const rex = s.rex;
    this.api.setStatusIndicator('amber-rex', playerIs && rex ? {
      name: 'End the Hunt', emoji: '🦖', color: AMB.hideLit,
      description: 'Your tyrannosaur is hunting. It claws, bites, and occasionally throws somebody into a wall. Nothing else you own will show up while it is here.',
      until: rex!.endsAt, priority: 111,
    } : null);

    const foeRex = this.sides.npc.rex;
    this.api.setStatusIndicator('amber-rex-warn', npcIs && foeRex ? {
      name: 'Tyrannosaur', emoji: '🦖', color: AMB.blood,
      description: 'There is a tyrannosaur in the arena for the next few seconds. Do not let it close the distance — being picked up is 60 damage and a stun.',
      until: foeRex!.endsAt, priority: 2,
    } : null);

    this.api.setStatusIndicator('amber-seized', this.isStunned(p) ? {
      name: 'In Its Jaws', emoji: '😱', color: AMB.bloodLit,
      description: 'You are being carried. You cannot move or cast until it decides where to put you down, and it is going to be a wall.',
      until: this.stunned.get(p) ?? 0, priority: 0,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /**
   * Zero while a body is in the tyrannosaur's mouth, and a drag while the sling is wound up —
   * a fully loaded sling is 25% slower, which is the only cost the wind-up has. Pulled by
   * ArenaScene rather than pushed, because `update()` runs after movement has resolved.
   */
  private speedMultFor(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 1;
    if (this.isStunned(f)) return 0;
    const s = this.sides[owner];
    if (this.isAmber(owner) && s.swinging) return 1 - 0.25 * s.charge;
    return 1;
  }

  /** True while the npc must not try to walk or cast — it is in something's mouth. */
  isHeld(owner: Owner): boolean {
    const f = this.fighter(owner);
    return !!f && this.isStunned(f);
  }

  /** The bot's read on its own sling: how wound up it is, and whether it is winding at all. */
  isSwinging(owner: Owner): boolean { return this.sides[owner].swinging; }
  swingCharge(owner: Owner): number { return this.sides[owner].charge; }
  hasRex(owner: Owner): boolean { return !!this.sides[owner].rex; }
  mosquitoCount(owner: Owner): number {
    return this.mosquitoes.filter((m) => m.owner === owner).length;
  }

  /** Ability tray fill — the three abilities that show a duration rather than a cooldown. */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'amber-sling' && s.swinging) return s.charge;
    if (abilityId === 'amber-trex' && s.rex) {
      return Phaser.Math.Clamp((s.rex.endsAt - time) / REX_MS, 0, 1);
    }
    if (abilityId === 'amber-stampede' && s.stampede && !s.stampede.running) {
      return Phaser.Math.Clamp((s.stampede.arrivesAt - time) / STAMPEDE_TELL_MS, 0, 1);
    }
    if (abilityId === 'amber-hunt') {
      const sh = this.shanks.find((x) => x.owner === 'player');
      if (sh) return Phaser.Math.Clamp((sh.frenzyUntil - time) / (SHANK_WAIT_MS + FRENZY_MS), 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
