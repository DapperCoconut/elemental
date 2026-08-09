import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  ColiseumRing, FlamePillar, JUS, JudgeRig, JusticeAvatar, JusticeColorFn, JusticeFx, SeraphForm,
  chainHead, chainRun, drawJudgeScene, judgeRig, padlock, spearShape, tranceBeams, wallSlab,
  willMeter,
} from './JusticeVisuals';

type Owner = 'player' | 'npc';
export type JusticeForm = 'ground' | 'flight';
type Edge = 'top' | 'bottom' | 'left' | 'right';

// ── Willpower ────────────────────────────────────────────────────────────────
const WILL_MAX = 100;
const WILL_REGEN_PER_SEC = 5;
/** Getting hit makes you more determined, not less — 20% faster regen for 2s. */
const WILL_HURT_REGEN_BONUS = 0.2;
const WILL_HURT_WINDOW_MS = 2000;
const WILL_DRAIN_SHEER = 10;
const WILL_DRAIN_FLIGHT = 2;

// ── Sheer Will ───────────────────────────────────────────────────────────────
const SHEER_SPEED_MULT = 1.2;
/** How long an attacker stays cowed after landing a hit on a willing Justice. */
const SHEER_RETALIATE_MS = 3000;
const SHEER_ATTACKER_MULT = 0.75;
const SHEER_NEXT_HIT_MULT = 1.33;

// ── Flight ───────────────────────────────────────────────────────────────────
const FLIGHT_SPEED_MULT = 1.33;
const FLIGHT_VULN_MULT = 1.2;

// ── Ground click ─────────────────────────────────────────────────────────────
const STAB_DAMAGE = 20;
const STAB_REACH = 76;
const STAB_ARC = Math.PI / 3;
const STAB_PROJ_DAMAGE = 15;
const STAB_PROJ_SPEED = 620;

// ── Coliseum ─────────────────────────────────────────────────────────────────
const COLISEUM_RADIUS = 152;
const COLISEUM_MS = 8000;
const COLISEUM_RISE_MS = 320;
const COLISEUM_FADE_MS = 400;

// ── Judgement Day ────────────────────────────────────────────────────────────
const JUDGE_SCENE_MS = 2600;
/** Damage the enemy has dealt you → how long they spend in chains. */
const JUDGE_TIERS = [
  { min: 300, label: 'DAMNED',     color: '#ff3344', bindMs: 10000, damned: true },
  { min: 200, label: 'GUILTY',     color: '#ffcc33', bindMs: 8000,  damned: false },
  { min: 100, label: 'GUILTY',     color: '#ffcc33', bindMs: 5000,  damned: false },
  { min: 0,   label: 'NOT GUILTY', color: '#88ffaa', bindMs: 0,     damned: false },
];
const DAMNED_VULN_MULT = 1.25;

// ── Flight click ─────────────────────────────────────────────────────────────
const SPEAR_SPEED = 800;
const SPEAR_DAMAGE = 20;
const SPEAR_BLAST_RADIUS = 64;

// ── Bind ─────────────────────────────────────────────────────────────────────
const CHAIN_SPEED = 1050;
const CHAIN_PIERCE_DAMAGE = 10;
/** An anchored chain rots off on its own if it is never used. */
const CHAIN_HOLD_MS = 7000;
const WALL_SPEED = 300;
const WALL_THICK = 26;
const WALL_MISSING_MS = 15000;
const WALL_IMPACT_DAMAGE = 20;
const WALL_IMPACT_STUN_MS = 2000;

// ── Pillar of Flame ──────────────────────────────────────────────────────────
const PILLAR_MS = 8000;
const PILLAR_HALF_W = 26;
const PILLAR_TICK_MS = 500;
const PILLAR_DAMAGE_PER_TICK = 6;
const PILLAR_SLOW_MULT = 0.75;

// ── Seraphim's Gaze ──────────────────────────────────────────────────────────
const SERAPH_FORM_MS = 3000;
const TRANCE_MS = 10000;

const ARENA_PAD = 32;

// ── World objects ────────────────────────────────────────────────────────────

interface Coliseum {
  owner: Owner;
  x: number; y: number;
  bornAt: number;
  until: number;
  ring: ColiseumRing;
  /** Which side of the wall each fighter was on when it went up. */
  inside: Map<Fighter, boolean>;
  /**
   * Which side of *this* ring each live projectile was on last frame. Per-ring rather
   * than per-kit, because with two rings up a shared map would have each one overwriting
   * the other's sample and neither would ever see a crossing.
   */
  projSide: WeakMap<Projectile, boolean>;
}

interface Chain {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  /** Where the chain is paid out from — redrawn to the caster each frame. */
  hit: Set<Fighter>;
}

interface Anchor {
  owner: Owner;
  edge: Edge;
  x: number; y: number;
  until: number;
}

interface FlyingWall {
  owner: Owner;
  edge: Edge;
  /** Distance travelled inward from its home edge. */
  travelled: number;
  span: number;
  hit: Set<Fighter>;
}

interface ThrownSpear {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  angle: number;
}

interface Pillar {
  owner: Owner;
  x: number;
  until: number;
  tickAccum: number;
  fx: FlamePillar;
}

interface JudgeScene {
  owner: Owner;
  victim: Fighter;
  until: number;
  /** Chosen at cast so the whole set piece animates toward its own ending. */
  tier: typeof JUDGE_TIERS[number];
  damage: number;
  announced: boolean;
}

interface Bind {
  until: number;
  damned: boolean;
  by: Owner;
}

// ── Per-side state ───────────────────────────────────────────────────────────

interface Side {
  owner: Owner;
  form: JusticeForm;
  will: number;
  sheerActive: boolean;
  /** `scene.time.now` until which regen runs hot after a hit. */
  hurtUntil: number;
  /** Last seen `rawDamageTaken`, so a hit can be detected without owning the callback. */
  lastRaw: number;
  /** Sheer Will: whoever hit us is cowed until this timestamp. */
  retaliateUntil: number;
  /** Sheer Will: the next hit we land is amplified. */
  nextHitBonus: boolean;
  /** Seraph set piece: `scene.time.now` the transformation ends. */
  seraphUntil: number;
  seraph: SeraphForm | null;
  /** Who we have entranced, and until when. */
  tranceUntil: number;
  tranceVictim: Fighter | null;
  /** Latch so dropping to zero Willpower announces itself once. */
  exhausted: boolean;
  /** NPC pacing — the AI is not allowed to spam stance changes. */
  nextStanceAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    form: 'ground',
    will: WILL_MAX,
    sheerActive: false,
    hurtUntil: 0,
    lastRaw: 0,
    retaliateUntil: 0,
    nextHitBonus: false,
    seraphUntil: 0,
    seraph: null,
    tranceUntil: 0,
    tranceVictim: null,
    exhausted: false,
    nextStanceAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface JusticeArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Justice visual colour through that side's equipped skin. */
  justiceColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(
    x: number, y: number, radius: number, damage: number, owner: Owner, except?: Fighter,
  ): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Swap the ability tray to the stance the local player is in. */
  setHudForm(form: JusticeForm): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── JusticeKit ───────────────────────────────────────────────────────────────

export class JusticeKit {
  private api: JusticeArenaApi;

  // ── Visuals ──
  private readonly pcol: JusticeColorFn;
  private readonly ncol: JusticeColorFn;
  private readonly pfx: JusticeFx;
  private readonly nfx: JusticeFx;
  private playerAvatar: JusticeAvatar | null = null;
  private npcAvatar: JusticeAvatar | null = null;
  /** Under the fighters: ripped walls, bind chains on the floor, arena border patches. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over them: thrown spears, live chains, trance beams. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The Judgement Day / Seraph set pieces, over everything but the HUD. */
  private sceneGfx: Phaser.GameObjects.Graphics | null = null;
  /** The Willpower meter. Depth 20 with the rest of the HUD. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private coliseums: Coliseum[] = [];
  private chains: Chain[] = [];
  private anchors: Anchor[] = [];
  private walls: FlyingWall[] = [];
  private spears: ThrownSpear[] = [];
  private pillars: Pillar[] = [];
  private judge: JudgeScene | null = null;
  private binds = new Map<Fighter, Bind>();
  /** `scene.time.now` each arena edge is rebuilt at. 0 = the wall is standing. */
  private missingEdges: Record<Edge, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  /** Last HUD stance pushed, so the tray is only swapped when it actually changes. */
  private hudForm: JusticeForm | null = null;
  private lastAimX = 0;
  private lastAimY = 0;

  constructor(api: JusticeArenaApi) {
    this.api = api;
    this.pcol = (base) => api.justiceColor('player', base);
    this.ncol = (base) => api.justiceColor('npc', base);
    this.pfx = new JusticeFx(api.scene, this.pcol);
    this.nfx = new JusticeFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): JusticeFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): JusticeColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isJustice(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'justice' : this.api.npcElementId === 'justice';
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /**
   * Consume Sheer Will's stored retaliation, if any. Every Justice damage number passes
   * through here so the bonus is spent exactly once, on whatever lands next.
   */
  private boosted(owner: Owner, amount: number): number {
    const s = this.side(owner);
    if (!s.nextHitBonus) return amount;
    s.nextHitBonus = false;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 44, '⚖️ RIGHTEOUS +33%', '#a8ccff');
    return Math.round(amount * SHEER_NEXT_HIT_MULT);
  }

  /** Hard control. Skips anyone the game has declared unstoppable. */
  private stun(target: Fighter, ms: number): void {
    if (target.unstoppable) return;
    target.earthStunnedUntil = Math.max(target.earthStunnedUntil, this.now + ms);
  }

  private isStunned(f: Fighter): boolean {
    return !f.unstoppable && f.earthStunnedUntil > this.now;
  }

  private clampToArena(f: Fighter): void {
    f.x = Phaser.Math.Clamp(f.x, this.left + 16, this.right - 16);
    f.y = Phaser.Math.Clamp(f.y, this.top + 16, this.bottom - 16);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    for (const c of this.coliseums) c.ring.destroy();
    this.coliseums = [];
    for (const p of this.pillars) p.fx.destroy();
    this.pillars = [];
    this.chains = [];
    this.anchors = [];
    this.walls = [];
    this.spears = [];
    this.judge = null;
    this.binds.clear();
    this.missingEdges = { top: 0, bottom: 0, left: 0, right: 0 };
    this.hudForm = null;
    this.vizT = 0;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      s.seraph?.destroy();
      s.seraph = null;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.sceneGfx?.destroy(); this.sceneGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;

    // Anything we were holding on a fighter has to be handed back, or a Justice match
    // would leak its multipliers into whatever element is picked next.
    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.justiceIncomingMult = 1;
      f.levitating = false;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'justice') return;
    const s = this.sides.player;
    const p = this.api.player;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // The set pieces take the controls entirely — Judgement Day and the Seraph are
    // both scenes, and a scene you can walk out of is not a scene.
    if (s.seraphUntil > time) return;
    if (this.judge && this.judge.owner === 'player' && this.judge.until > time) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (s.form === 'ground') {
      if (clicked) p.castAbility('justice-stab', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('justice-coliseum', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('justice-sheer-will', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('justice-flight', ctx);
      if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('justice-judgement-day', ctx);
      return;
    }

    if (clicked) p.castAbility('justice-spear-throw', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // A chain already hooked into a wall recasts for free — the cooldown bought the throw.
      if (this.anchors.some((a) => a.owner === 'player')) this.doBind(mouseX, mouseY, 'player');
      else p.castAbility('justice-bind', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('justice-pillar', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('justice-descend', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('justice-seraphim', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  doStab(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);

    fx.thrust(f.x, f.y, angle, STAB_REACH);
    this.avatar(owner)?.play('punch', angle);

    // The stab itself: a narrow wedge in front, not a circle around you.
    const dmg = this.boosted(owner, STAB_DAMAGE);
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > STAB_REACH + 20) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - angle));
      if (off > STAB_ARC / 2) continue;
      t.takeDamage(dmg);
      this.api.spawnHitFlash(t.x, t.y, JUS.bright);
      fx.shards(t.x, t.y, 6, 130);
    }

    // ...and the spear that keeps going.
    const proj = new Projectile(
      this.api.scene,
      f.x + Math.cos(angle) * 30, f.y + Math.sin(angle) * 30,
      'proj-justice-spear', this.boosted(owner, STAB_PROJ_DAMAGE), owner === 'player',
    );
    proj.setRotation(angle);
    this.api.projectiles.add(proj);
    proj.launch(Math.cos(angle) * STAB_PROJ_SPEED, Math.sin(angle) * STAB_PROJ_SPEED);
    fx.motes(f.x + Math.cos(angle) * 34, f.y + Math.sin(angle) * 34, 4, 12, 420);
  }

  doColiseum(owner: Owner): void {
    const f = this.fighter(owner);
    // One ring per side. Raising a second drops the first — two overlapping cages
    // would carve the arena into pockets nobody can leave.
    this.dropColiseums(owner);

    const inside = new Map<Fighter, boolean>();
    for (const t of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (!t || !t.active) continue;
      inside.set(t, Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= COLISEUM_RADIUS);
    }

    this.coliseums.push({
      owner,
      x: f.x, y: f.y,
      bornAt: this.now,
      until: this.now + COLISEUM_MS,
      ring: new ColiseumRing(this.api.scene, this.col(owner), COLISEUM_RADIUS),
      inside,
      projSide: new WeakMap(),
    });

    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 20, COLISEUM_RADIUS, JUS.gold, 480, 6, 5);
    this.fx(owner).rubble(f.x, f.y, 12, 30);
    this.api.showFloatingText(f.x, f.y - 40, '🏛️ COLISEUM', '#f0d68a');
  }

  doSheerWill(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.sheerActive) {
      s.sheerActive = false;
      this.api.showFloatingText(f.x, f.y - 40, 'Will released', '#a8ccff');
      return;
    }
    if (s.will < 5) {
      this.api.showFloatingText(f.x, f.y - 40, '💤 No willpower', '#7788aa');
      return;
    }
    s.sheerActive = true;
    s.exhausted = false;
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 10, 62, JUS.will, 420, 5, 6);
    this.api.showFloatingText(f.x, f.y - 40, '💙 SHEER WILL', '#2f7bff');
  }

  doFlight(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.form === 'flight') return;
    if (s.will < 5) {
      this.api.showFloatingText(f.x, f.y - 40, '💤 Too spent to fly', '#7788aa');
      return;
    }
    s.form = 'flight';
    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 12, 74, JUS.pale, 460, 5, 6);
    this.fx(owner).motes(f.x, f.y, 14, 40, 900);
    this.api.showFloatingText(f.x, f.y - 44, '🕊️ FLIGHT OF THE VALKYRIE', '#fff3cf');
    if (owner === 'player') this.pushHudForm();
  }

  doDescend(owner: Owner): void {
    const s = this.side(owner);
    if (s.form === 'ground') return;
    this.leaveFlight(owner, 'Descend');
  }

  doJudgementDay(owner: Owner): void {
    const f = this.fighter(owner);
    const victim = owner === 'player'
      ? this.api.getNearestEnemy(f.x, f.y)
      : this.api.player;
    if (!victim || !victim.active || victim.hp <= 0) {
      this.api.showFloatingText(f.x, f.y - 40, 'Nobody to try', '#998877');
      return;
    }

    // "How much damage has the enemy done to you" — the running pre-mitigation tally
    // the fighter already keeps. Mitigating a hit shouldn't pardon the one who threw it.
    const damage = Math.round(f.rawDamageTaken);
    const tier = JUDGE_TIERS.find((t) => damage >= t.min) ?? JUDGE_TIERS[JUDGE_TIERS.length - 1];

    this.judge = {
      owner, victim, tier, damage,
      until: this.now + JUDGE_SCENE_MS,
      announced: false,
    };
    this.avatar(owner)?.play('raise', undefined, JUDGE_SCENE_MS);
    this.fx(owner).verdictBeam(f.x, f.y, JUS.gold, this.api.height, 700, 11);
    this.api.showFloatingText(f.x, f.y - 52, '⚖️ JUDGEMENT DAY', '#f0d68a');
  }

  doSpearThrow(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.spears.push({
      owner,
      x: f.x + Math.cos(angle) * 26,
      y: f.y + Math.sin(angle) * 26,
      vx: Math.cos(angle) * SPEAR_SPEED,
      vy: Math.sin(angle) * SPEAR_SPEED,
      tx, ty, angle,
    });
    this.avatar(owner)?.play('punch', angle);
    this.fx(owner).motes(f.x + Math.cos(angle) * 30, f.y + Math.sin(angle) * 30, 5, 14, 400);
  }

  doBind(tx: number, ty: number, owner: Owner): void {
    // Recast with a chain already sunk into a wall: rip it out.
    const anchor = this.anchors.find((a) => a.owner === owner);
    if (anchor) {
      this.anchors = this.anchors.filter((a) => a !== anchor);
      this.ripWall(anchor, owner);
      return;
    }

    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.chains.push({
      owner,
      x: f.x + Math.cos(angle) * 24,
      y: f.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * CHAIN_SPEED,
      vy: Math.sin(angle) * CHAIN_SPEED,
      hit: new Set(),
    });
    this.avatar(owner)?.play('sweep', angle);
  }

  doPillar(tx: number, _ty: number, owner: Owner): void {
    const x = Phaser.Math.Clamp(tx, this.left + PILLAR_HALF_W, this.right - PILLAR_HALF_W);
    this.pillars.push({
      owner,
      x,
      until: this.now + PILLAR_MS,
      tickAccum: 0,
      fx: new FlamePillar(this.api.scene, this.col(owner), PILLAR_HALF_W, this.top, this.bottom),
    });
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam', Math.atan2(0, x - f.x));
    this.fx(owner).verdictBeam(x, this.bottom, JUS.flame, this.bottom - this.top, 600, 5);
    this.api.showFloatingText(x, this.top + 26, '🔥 PILLAR OF FLAME', '#ff7a1f');
  }

  doSeraphim(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;

    // Teleport to the middle — the whole point is that everyone has to look at you.
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    this.fx(owner).motes(f.x, f.y, 12, 34, 600);
    f.setPosition(cx, cy);
    this.body(f).reset(cx, cy);

    s.seraphUntil = this.now + SERAPH_FORM_MS;
    s.seraph?.destroy();
    s.seraph = new SeraphForm(this.api.scene, this.col(owner));
    if (victim && victim.active && victim.hp > 0) {
      s.tranceVictim = victim;
      // The trance starts when the form drops, not when it opens.
      s.tranceUntil = this.now + SERAPH_FORM_MS + TRANCE_MS;
    }
    this.fx(owner).flash(cx, cy, 90, 13);
    this.api.showFloatingText(cx, cy - 70, "👁️ SERAPHIM'S GAZE", '#ffffff');
  }

  // ── Stance plumbing ────────────────────────────────────────────────────────

  private avatar(owner: Owner): JusticeAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private leaveFlight(owner: Owner, why: string): void {
    const s = this.side(owner);
    if (s.form === 'ground') return;
    s.form = 'ground';
    const f = this.fighter(owner);
    f.levitating = false;
    // Anything the flight stance was holding comes down with you.
    this.anchors = this.anchors.filter((a) => a.owner !== owner);
    this.chains = this.chains.filter((c) => c.owner !== owner);
    this.fx(owner).rubble(f.x, f.y + 14, 6, 22);
    this.api.showFloatingText(f.x, f.y - 40, `🪶 ${why}`, '#e6e1d2');
    if (owner === 'player') this.pushHudForm();
  }

  private pushHudForm(): void {
    const form = this.sides.player.form;
    if (form === this.hudForm) return;
    this.hudForm = form;
    this.api.setHudForm(form);
  }

  private dropColiseums(owner: Owner): void {
    for (const c of this.coliseums) {
      if (c.owner !== owner) continue;
      // Fade it out rather than deleting it, so the columns sink instead of blinking away.
      c.until = Math.min(c.until, this.now + 120);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'justice';
    const npcIs = this.api.npcElementId === 'justice';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    if (playerIs) this.pushHudForm();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.isJustice(owner)) this.updateSide(owner, time, delta);
    }

    this.updateColiseums(time, delta);
    this.updateChains(time, delta);
    this.updateWalls(delta);
    this.updateSpears(delta);
    this.updatePillars(time, delta);
    this.updateJudgeScene(time);
    this.updateBinds(time);
    this.updateTrances(time);
    this.updateIncomingMults();
    this.updateAvatars(delta, playerIs, npcIs);
    this.paintWorld();
    this.paintScene(delta);
    this.paintHud(playerIs);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.sceneGfx) this.sceneGfx = scene.add.graphics().setDepth(12);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /** Willpower, stance upkeep, speed and the hit-detection that drives Sheer Will. */
  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const dt = delta / 1000;

    // ── Did we just get hit? ──
    // Read off the fighter's own running tally rather than claiming its damage callback,
    // which ArenaScene already owns.
    if (f.rawDamageTaken > s.lastRaw + 0.5) {
      s.hurtUntil = time + WILL_HURT_WINDOW_MS;
      if (s.sheerActive) {
        s.retaliateUntil = time + SHEER_RETALIATE_MS;
        s.nextHitBonus = true;
        this.fx(owner).ring(f.x, f.y, 14, 46, JUS.will, 340, 3, 6);
      }
    }
    s.lastRaw = f.rawDamageTaken;

    // ── Willpower ledger ──
    // Regen never stops — the drains are subtracted from it, so Sheer Will nets −5/s
    // while flight on its own is close to free.
    const regen = WILL_REGEN_PER_SEC * (s.hurtUntil > time ? 1 + WILL_HURT_REGEN_BONUS : 1);
    let drain = 0;
    if (s.sheerActive) drain += WILL_DRAIN_SHEER;
    if (s.form === 'flight') drain += WILL_DRAIN_FLIGHT;
    s.will = Phaser.Math.Clamp(s.will + (regen - drain) * dt, 0, WILL_MAX);

    if (s.will <= 0 && (s.sheerActive || s.form === 'flight')) {
      if (!s.exhausted) {
        s.exhausted = true;
        this.api.showFloatingText(f.x, f.y - 46, '💤 WILL SPENT', '#7788aa');
      }
      s.sheerActive = false;
      if (s.form === 'flight') this.leaveFlight(owner, 'Grounded');
    } else if (s.will > 5) {
      s.exhausted = false;
    }

    // ── Stance upkeep ──
    // Speed itself is *pulled* by ArenaScene — see `speedMultFor`.
    f.levitating = s.form === 'flight';

    // ── The seraph set piece holds you in place ──
    if (s.seraphUntil > time) {
      this.body(f).setVelocity(0, 0);
      f.isInvincible = true;
    } else if (s.seraph) {
      s.seraph.destroy();
      s.seraph = null;
      f.isInvincible = false;
      this.fx(owner).ring(f.x, f.y, 60, 150, JUS.white, 520, 5, 8);
      const v = s.tranceVictim;
      if (v && v.active && v.hp > 0) {
        this.api.showFloatingText(v.x, v.y - 44, '🌀 ENTRANCED', '#ffffff');
      }
    }

    // ── Hard control from our own effects still applies to us ──
    if (this.isStunned(f)) this.body(f).setVelocity(0, 0);

    // ── Status tray (player side only) ──
    if (owner === 'player') {
      this.api.setStatusIndicator('justice-sheer', s.sheerActive ? {
        name: 'Sheer Will', emoji: '💙', color: JUS.will,
        description: `+${Math.round((SHEER_SPEED_MULT - 1) * 100)}% speed. Attackers deal 25% less to you for 3s and eat +33% on your next hit. Burns ${WILL_DRAIN_SHEER} Willpower/s.`,
        count: Math.round(s.will), suffix: '', priority: 110,
      } : null);
      this.api.setStatusIndicator('justice-flight', s.form === 'flight' ? {
        name: 'Flight', emoji: '🕊️', color: JUS.pale,
        description: `+33% speed and you hover over ground hazards and your own walls — but you take 20% more damage and burn ${WILL_DRAIN_FLIGHT} Willpower/s.`,
        count: Math.round(s.will), suffix: '', priority: 111,
      } : null);
    }
  }

  /** The Coliseum: a wall that works in both directions, for everyone but its airborne owner. */
  private updateColiseums(time: number, delta: number): void {
    for (const c of this.coliseums) {
      const rise = Math.min(1, (time - c.bornAt) / COLISEUM_RISE_MS);
      const fade = c.until - time < COLISEUM_FADE_MS
        ? Math.min(1, (COLISEUM_FADE_MS - (c.until - time)) / COLISEUM_FADE_MS)
        : 0;
      c.ring.update(delta, c.x, c.y, rise, fade);
      if (rise < 0.6) continue;

      for (const [f, wasInside] of c.inside) {
        if (!f || !f.active || f.hp <= 0) continue;
        // Its owner flies over their own walls. Nobody else does.
        const ownerSide = this.side(c.owner);
        if (f === this.fighter(c.owner) && ownerSide.form === 'flight') continue;

        const d = Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y);
        const ang = Math.atan2(f.y - c.y, f.x - c.x);
        const pad = 18;
        if (wasInside && d > COLISEUM_RADIUS - pad) {
          f.setPosition(c.x + Math.cos(ang) * (COLISEUM_RADIUS - pad), c.y + Math.sin(ang) * (COLISEUM_RADIUS - pad));
          this.body(f).stop();
        } else if (!wasInside && d < COLISEUM_RADIUS + pad) {
          f.setPosition(c.x + Math.cos(ang) * (COLISEUM_RADIUS + pad), c.y + Math.sin(ang) * (COLISEUM_RADIUS + pad));
          this.body(f).stop();
        }
      }

      // Shots die on the wall. Tracked by which side of the ring they were on last
      // frame, so a fast projectile can't tunnel through between two samples.
      for (const child of this.api.projectiles.getChildren()) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const inside = Phaser.Math.Distance.Between(c.x, c.y, proj.x, proj.y) <= COLISEUM_RADIUS;
        const prev = c.projSide.get(proj);
        c.projSide.set(proj, inside);
        if (prev === undefined || prev === inside) continue;
        const ang = Math.atan2(proj.y - c.y, proj.x - c.x);
        const hx = c.x + Math.cos(ang) * COLISEUM_RADIUS;
        const hy = c.y + Math.sin(ang) * COLISEUM_RADIUS;
        this.fx(c.owner).shards(hx, hy, 4, 110, 380);
        this.api.spawnHitFlash(hx, hy, JUS.marble);
        proj.destroy();
      }
    }

    const dead = this.coliseums.filter((c) => time >= c.until);
    for (const c of dead) c.ring.destroy();
    if (dead.length) this.coliseums = this.coliseums.filter((c) => time < c.until);
  }

  /** The grappling chain, out to whichever wall it finds. */
  private updateChains(time: number, delta: number): void {
    const dt = delta / 1000;
    const keep: Chain[] = [];
    for (const c of this.chains) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Pierces anything in the way — it does not stop for bodies, only for walls.
      for (const t of this.targetsOf(c.owner)) {
        if (c.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > 26) continue;
        c.hit.add(t);
        t.takeDamage(this.boosted(c.owner, CHAIN_PIERCE_DAMAGE));
        this.api.spawnHitFlash(t.x, t.y, JUS.gold);
        this.fx(c.owner).shards(t.x, t.y, 5, 120, 360);
      }

      const edge = this.edgeAt(c.x, c.y);
      if (!edge) { keep.push(c); continue; }

      this.anchors = this.anchors.filter((a) => a.owner !== c.owner);
      this.anchors.push({
        owner: c.owner, edge,
        x: Phaser.Math.Clamp(c.x, this.left, this.right),
        y: Phaser.Math.Clamp(c.y, this.top, this.bottom),
        until: time + CHAIN_HOLD_MS,
      });
      this.fx(c.owner).shards(c.x, c.y, 7, 150, 420);
      this.api.spawnHitFlash(c.x, c.y, JUS.gold);
      const f = this.fighter(c.owner);
      this.api.showFloatingText(f.x, f.y - 44, '⛓️ HOOKED — press E', '#f0d68a');
    }
    this.chains = keep;
    this.anchors = this.anchors.filter((a) => time < a.until);
  }

  /** Which arena edge a point has reached, or null while it is still in play. */
  private edgeAt(x: number, y: number): Edge | null {
    if (x <= this.left) return 'left';
    if (x >= this.right) return 'right';
    if (y <= this.top) return 'top';
    if (y >= this.bottom) return 'bottom';
    return null;
  }

  private ripWall(anchor: Anchor, owner: Owner): void {
    const f = this.fighter(owner);
    // You cannot rip out a wall that is already lying somewhere else. The chain simply
    // passes through the gap and comes back with nothing.
    if (this.missingEdges[anchor.edge] > this.now) {
      this.api.showFloatingText(f.x, f.y - 44, '⛓️ Nothing there', '#998877');
      this.fx(owner).motes(anchor.x, anchor.y, 5, 20, 460);
      return;
    }

    this.missingEdges[anchor.edge] = this.now + WALL_MISSING_MS;
    const vertical = anchor.edge === 'left' || anchor.edge === 'right';
    this.walls.push({
      owner,
      edge: anchor.edge,
      travelled: 0,
      span: vertical ? this.bottom - this.top : this.right - this.left,
      hit: new Set(),
    });

    this.avatar(owner)?.play('dash', Math.atan2(anchor.y - f.y, anchor.x - f.x));
    this.fx(owner).rubble(anchor.x, anchor.y, 18, vertical ? 60 : 120);
    this.api.showFloatingText(f.x, f.y - 44, '⛓️ TEAR IT DOWN', '#c9a13a');
  }

  /** The ripped-out wall crossing the arena, and what it does to anyone in the way. */
  private updateWalls(delta: number): void {
    const dt = delta / 1000;
    const keep: FlyingWall[] = [];
    for (const w of this.walls) {
      w.travelled += WALL_SPEED * dt;
      const limit = (w.edge === 'left' || w.edge === 'right')
        ? this.right - this.left
        : this.bottom - this.top;

      const face = this.wallFace(w);
      for (const t of this.targetsOf(w.owner)) {
        if (!this.wallTouches(w, t)) continue;
        // Shoved along in front of it and unable to do anything about it.
        t.setPosition(
          face.nx !== 0 ? face.x + face.nx * (WALL_THICK / 2 + 20) : t.x,
          face.ny !== 0 ? face.y + face.ny * (WALL_THICK / 2 + 20) : t.y,
        );
        this.clampToArena(t);
        this.body(t).setVelocity(face.nx * WALL_SPEED, face.ny * WALL_SPEED);
        this.stun(t, 260);
      }

      if (w.travelled < limit) { keep.push(w); continue; }

      // It hits the far side and comes apart.
      const dmg = this.boosted(w.owner, WALL_IMPACT_DAMAGE);
      for (const t of this.targetsOf(w.owner)) {
        t.takeDamage(dmg);
        this.stun(t, WALL_IMPACT_STUN_MS);
        this.api.spawnHitFlash(t.x, t.y, JUS.stone);
      }
      const cx = face.nx !== 0 ? face.x : (this.left + this.right) / 2;
      const cy = face.ny !== 0 ? face.y : (this.top + this.bottom) / 2;
      this.fx(w.owner).rubble(cx, cy, 26, w.span * 0.6);
      this.fx(w.owner).flash(cx, cy, 70, 8);
      this.api.showFloatingText(cx, cy - 40, '💥 IMPACT', '#e6e1d2');
    }
    this.walls = keep;
  }

  /** The leading face of a flying wall, plus its inward normal. */
  private wallFace(w: FlyingWall): { x: number; y: number; nx: number; ny: number } {
    switch (w.edge) {
      case 'left':   return { x: this.left + w.travelled, y: 0, nx: 1, ny: 0 };
      case 'right':  return { x: this.right - w.travelled, y: 0, nx: -1, ny: 0 };
      case 'top':    return { x: 0, y: this.top + w.travelled, nx: 0, ny: 1 };
      default:       return { x: 0, y: this.bottom - w.travelled, nx: 0, ny: -1 };
    }
  }

  private wallTouches(w: FlyingWall, f: Fighter): boolean {
    const face = this.wallFace(w);
    if (face.nx !== 0) return Math.abs(f.x - face.x) <= WALL_THICK / 2 + 20;
    return Math.abs(f.y - face.y) <= WALL_THICK / 2 + 20;
  }

  private updateSpears(delta: number): void {
    const dt = delta / 1000;
    const keep: ThrownSpear[] = [];
    for (const s of this.spears) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const reached = Phaser.Math.Distance.Between(s.x, s.y, s.tx, s.ty) < 18;
      const struck = this.targetsOf(s.owner).find(
        (t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) < 24,
      );
      const outside = !!this.edgeAt(s.x, s.y);
      if (!reached && !struck && !outside) { keep.push(s); continue; }

      const fx = this.fx(s.owner);
      fx.flash(s.x, s.y, SPEAR_BLAST_RADIUS * 0.7, 8);
      fx.ring(s.x, s.y, 8, SPEAR_BLAST_RADIUS, JUS.bright, 400, 4, 6);
      fx.shards(s.x, s.y, 9, 190, 460);
      this.api.dealAoeDamageFromOwner(
        s.x, s.y, SPEAR_BLAST_RADIUS, this.boosted(s.owner, SPEAR_DAMAGE), s.owner,
      );
    }
    this.spears = keep;
  }

  private updatePillars(time: number, delta: number): void {
    for (const p of this.pillars) {
      p.fx.update(delta, p.x, p.until - time < 500 ? Math.max(0, (p.until - time) / 500) : 1);
      p.tickAccum += delta;
      const ticked = p.tickAccum >= PILLAR_TICK_MS;
      if (ticked) p.tickAccum -= PILLAR_TICK_MS;

      if (!ticked) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Math.abs(t.x - p.x) > PILLAR_HALF_W + 16) continue;
        t.takeDamage(this.boosted(p.owner, PILLAR_DAMAGE_PER_TICK));
        this.api.spawnHitFlash(t.x, t.y, JUS.flame);
      }
    }
    const dead = this.pillars.filter((p) => time >= p.until);
    for (const p of dead) p.fx.destroy();
    if (dead.length) this.pillars = this.pillars.filter((p) => time < p.until);
  }

  /** The courtroom: both parties frozen, the scales tipping, then the sentence. */
  private updateJudgeScene(time: number): void {
    const j = this.judge;
    if (!j) return;
    const caster = this.fighter(j.owner);
    const v = j.victim;

    if (time < j.until) {
      this.body(caster).setVelocity(0, 0);
      if (v.active && v.hp > 0) {
        // The victim is lifted into the pan — position is written directly, because
        // its own AI rebuilds velocity every frame.
        const pan = this.judgeRig(j, time).seat;
        v.setPosition(pan.x, pan.y);
        this.body(v).setVelocity(0, 0);
        this.stun(v, 120);
      }
      return;
    }

    if (!j.announced) {
      j.announced = true;
      const cx = (this.left + this.right) / 2;
      this.api.showFloatingText(cx, this.top + 90, `⚖️ ${j.tier.label}`, j.tier.color);
      this.api.showFloatingText(cx, this.top + 120, `${j.damage} damage on the record`, '#e6e1d2');
      if (j.tier.bindMs > 0 && v.active && v.hp > 0) {
        this.binds.set(v, { until: time + j.tier.bindMs, damned: j.tier.damned, by: j.owner });
        v.applyDisarm(j.tier.bindMs);
        this.fx(j.owner).verdictBeam(v.x, v.y, j.tier.damned ? JUS.damned : JUS.gold, this.api.height, 900, 11);
        this.api.showFloatingText(
          v.x, v.y - 46,
          j.tier.damned ? '⛓️ DAMNED' : '⛓️ SENTENCED',
          j.tier.color,
        );
      } else {
        this.fx(j.owner).motes(v.x, v.y, 10, 30, 800);
      }
    }
    this.judge = null;
  }

  /** The scale rig for the frame, from the shared geometry in JusticeVisuals. */
  private judgeRig(j: JudgeScene, time: number): JudgeRig {
    return judgeRig({
      cx: (this.left + this.right) / 2,
      bottom: this.bottom,
      t: Phaser.Math.Clamp(1 - (j.until - time) / JUDGE_SCENE_MS, 0, 1),
      guilt: Phaser.Math.Clamp(j.damage / 400, 0, 1),
    });
  }

  private updateBinds(time: number): void {
    for (const [f, b] of [...this.binds]) {
      if (!f.active || f.hp <= 0 || time >= b.until) {
        this.binds.delete(f);
        if (f.active && f.hp > 0) this.fx(b.by).chainBurst(f.x, f.y);
        continue;
      }
      // Keep the disarm renewed so nothing else can quietly clear it early.
      f.applyDisarm(80);
    }
  }

  /** The Seraph's trance: the victim walks a straight line to whoever opened its eyes. */
  private updateTrances(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const v = s.tranceVictim;
      if (!v) continue;
      if (time >= s.tranceUntil || !v.active || v.hp <= 0) {
        s.tranceVictim = null;
        s.tranceUntil = 0;
        continue;
      }
      // The form is still up — the trance has not started walking yet.
      if (s.seraphUntil > time) continue;
      if (v.unstoppable || this.isStunned(v)) continue;

      const f = this.fighter(owner);
      const ang = Math.atan2(f.y - v.y, f.x - v.x);
      const dist = Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y);
      // Straight at them, and only stopping once they are on top of you.
      const sp = dist > 34 ? v.speed : 0;
      this.body(v).setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
    }
  }

  /**
   * Every incoming-damage multiplier Justice owns, recomputed from scratch each frame.
   * Written to a dedicated `Fighter` field so it composes with (rather than stomps) the
   * armour and vulnerability other systems hold.
   */
  private updateIncomingMults(): void {
    const time = this.now;
    const seen = new Set<Fighter>();
    const apply = (f: Fighter) => {
      if (!f || seen.has(f)) return;
      seen.add(f);
      let m = 1;
      for (const owner of ['player', 'npc'] as Owner[]) {
        if (!this.isJustice(owner) || this.fighter(owner) !== f) continue;
        const s = this.side(owner);
        if (s.form === 'flight') m *= FLIGHT_VULN_MULT;
        if (s.retaliateUntil > time) m *= SHEER_ATTACKER_MULT;
      }
      const bind = this.binds.get(f);
      if (bind && bind.damned && bind.until > time) m *= DAMNED_VULN_MULT;
      f.justiceIncomingMult = m;
    };
    apply(this.api.player);
    apply(this.api.npc);
    for (const e of this.api.enemies) apply(e);
  }

  // ── Rig ────────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc, scene } = this.api;

    if (playerIs && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new JusticeAvatar(scene, this.pcol);
      const s = this.sides.player;
      const ax = this.lastAimX || player.x + 1;
      const ay = this.lastAimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(ay - player.y, ax - player.x));
      this.playerAvatar.setFlying(s.form === 'flight');
      this.playerAvatar.setWilling(s.sheerActive);
      this.playerAvatar.setIntensity(s.sheerActive ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // The seraph replaces the character outright for its three seconds.
      const hidden = s.seraphUntil > this.now;
      this.playerAvatar.update(delta, player.x, player.y, hidden || player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new JusticeAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setFlying(s.form === 'flight');
      this.npcAvatar.setWilling(s.sheerActive);
      this.npcAvatar.setIntensity(s.sheerActive ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      const hidden = s.seraphUntil > this.now;
      this.npcAvatar.update(delta, npc.x, npc.y, hidden || npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  private paintWorld(): void {
    const gg = this.groundGfx;
    const ag = this.airGfx;
    if (!gg || !ag) return;
    gg.clear();
    ag.clear();
    const time = this.now;

    // ── Missing arena walls ──
    // The border is drawn once by ArenaScene, so a hole is painted rather than erased:
    // a strip of void over the edge, with a torn lip at each end.
    for (const edge of ['top', 'bottom', 'left', 'right'] as Edge[]) {
      const until = this.missingEdges[edge];
      if (until <= time) continue;
      const back = Math.min(1, (until - time) / 700);
      const vertical = edge === 'left' || edge === 'right';
      const ex = edge === 'left' ? this.left : edge === 'right' ? this.right : (this.left + this.right) / 2;
      const ey = edge === 'top' ? this.top : edge === 'bottom' ? this.bottom : (this.top + this.bottom) / 2;
      const len = vertical ? this.bottom - this.top : this.right - this.left;
      gg.fillStyle(0x0d0d1a, 1);
      if (vertical) gg.fillRect(ex - 5, this.top - 2, 10, len + 4);
      else gg.fillRect(this.left - 2, ey - 5, len + 4, 10);
      // Torn stubs where the wall used to key in, so it reads as broken, not missing.
      gg.fillStyle(this.pcol(JUS.stoneDark), 0.9 * back);
      for (const s of [-1, 1]) {
        const tx = vertical ? ex : ex + (s * len) / 2;
        const ty = vertical ? ey + (s * len) / 2 : ey;
        gg.fillTriangle(
          tx, ty,
          tx - (vertical ? 6 : s * 16), ty - (vertical ? s * 16 : 6),
          tx + (vertical ? 6 : 0), ty + (vertical ? 0 : 6),
        );
      }
    }

    // ── Flying walls ──
    for (const w of this.walls) {
      const face = this.wallFace(w);
      const vertical = face.nx !== 0;
      wallSlab(gg, this.col(w.owner), {
        x: vertical ? face.x : (this.left + this.right) / 2,
        y: vertical ? (this.top + this.bottom) / 2 : face.y,
        vertical,
        span: w.span,
        thick: WALL_THICK,
        nx: face.nx, ny: face.ny,
        t: this.vizT,
      });
    }

    // ── Bind chains on the guilty ──
    for (const [f, b] of this.binds) {
      if (!f.active) continue;
      const tint = this.col(b.by);
      const wrap = 3;
      for (let i = 0; i < wrap; i++) {
        const yy = f.y - 12 + i * 12;
        const sway = Math.sin(this.vizT * 3 + i) * 3;
        chainRun(ag, tint, f.x - 20 + sway, yy, f.x + 20 + sway, yy, 0.95, 9, 2.1, 3);
      }
      padlock(ag, tint, f.x, f.y + 2, 7, 0.95);
      if (b.damned) {
        ag.lineStyle(2, this.pcol(JUS.damned), 0.4 + 0.2 * Math.sin(this.vizT * 7));
        ag.strokeCircle(f.x, f.y, 27);
      }
    }

    // ── Live chains, still flying ──
    for (const c of this.chains) {
      const f = this.fighter(c.owner);
      chainRun(ag, this.col(c.owner), f.x, f.y, c.x, c.y, 0.95, 11, 2.4, 6);
      chainHead(ag, this.col(c.owner), c.x, c.y, Math.atan2(c.vy, c.vx));
    }

    // ── Anchored chains, waiting on a recast ──
    for (const a of this.anchors) {
      const f = this.fighter(a.owner);
      const tug = Math.sin(this.vizT * 5) * 3;
      chainRun(ag, this.col(a.owner), f.x, f.y, a.x, a.y, 0.85, 11, 2.2, 10 + tug);
      const tint = this.col(a.owner);
      ag.fillStyle(tint(JUS.gold), 0.9);
      ag.fillCircle(a.x, a.y, 6);
      ag.lineStyle(2, tint(JUS.pale), 0.5 + 0.3 * Math.sin(this.vizT * 8));
      ag.strokeCircle(a.x, a.y, 11 + Math.sin(this.vizT * 8) * 2);
    }

    // ── Thrown spears ──
    for (const s of this.spears) {
      spearShape(ag, this.col(s.owner), s.x - Math.cos(s.angle) * 26, s.y - Math.sin(s.angle) * 26, s.angle, 34, 1, 1);
      ag.fillStyle(this.col(s.owner)(JUS.pale), 0.35);
      ag.fillCircle(s.x - Math.cos(s.angle) * 30, s.y - Math.sin(s.angle) * 30, 4);
    }

    // ── Trance beams ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const v = s.tranceVictim;
      if (!v || !v.active || s.tranceUntil <= time || s.seraphUntil > time) continue;
      const f = this.fighter(owner);
      tranceBeams(ag, this.col(owner), v.x, v.y, Math.atan2(f.y - v.y, f.x - v.x), this.vizT);
    }
  }

  /** The two set pieces, plus the seraph itself. */
  private paintScene(delta: number): void {
    const g = this.sceneGfx;
    if (!g) return;
    g.clear();
    const time = this.now;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.seraph) continue;
      const f = this.fighter(owner);
      const elapsed = SERAPH_FORM_MS - (s.seraphUntil - time);
      const grow = Phaser.Math.Clamp(elapsed / 420, 0, 1) * Phaser.Math.Clamp((s.seraphUntil - time) / 300, 0, 1);
      const v = s.tranceVictim;
      const look = v && v.active ? Math.atan2(v.y - f.y, v.x - f.x) : 0;
      s.seraph.update(delta, f.x, f.y, grow, look);
    }

    const j = this.judge;
    if (!j || time >= j.until) return;
    const r = this.judgeRig(j, time);
    const tint = this.col(j.owner);
    // The word on the placard is Text, dropped by showFloatingText when the sentence lands —
    // the plate the painter draws is the frame it appears in.
    drawJudgeScene(g, tint, r, {
      width: this.api.width,
      height: this.api.height,
      top: this.top,
      cx: (this.left + this.right) / 2,
      fade: r.t < 0.12 ? r.t / 0.12 : r.t > 0.9 ? (1 - r.t) / 0.1 : 1,
      placardColor: j.tier.damned ? this.pcol(JUS.damned) : tint(JUS.gold),
    });
  }

  /** The Willpower meter — the one number both stances spend. */
  private paintHud(playerIsJustice: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsJustice) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const w = 190, h = 12;
    const x = this.left + 8;
    const y = this.top + 8;
    const ratio = s.will / WILL_MAX;

    // Draining reads red-hot at the bottom of the bar; regen glows.
    const low = ratio < 0.25;
    willMeter(g, this.pcol, x, y, w, h, ratio);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y + h + 3, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#a8ccff',
        stroke: '#05070f',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    const regen = WILL_REGEN_PER_SEC * (s.hurtUntil > this.now ? 1 + WILL_HURT_REGEN_BONUS : 1);
    const net = regen
      - (s.sheerActive ? WILL_DRAIN_SHEER : 0)
      - (s.form === 'flight' ? WILL_DRAIN_FLIGHT : 0);
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      `WILLPOWER ${Math.round(s.will)}  ${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)}/s`,
    );
    this.hudLabel.setColor(low ? '#ff8899' : '#a8ccff');
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Everything Justice does to one fighter's movement, as a single factor.
   *
   * ArenaScene *pulls* this while it rebuilds the frame's speed multipliers, because that
   * block runs long before `update()` does — a push from here would be wiped before it was
   * ever read.
   */
  private speedMultFor(f: Fighter, owner: Owner): number {
    let m = 1;
    if (this.isJustice(owner) && this.fighter(owner) === f) {
      const s = this.side(owner);
      if (s.sheerActive) m *= SHEER_SPEED_MULT;
      if (s.form === 'flight') m *= FLIGHT_SPEED_MULT;
    }
    // Anything standing in a hostile wall of fire wades.
    for (const p of this.pillars) {
      if (p.owner === owner) continue;
      if (Math.abs(f.x - p.x) <= PILLAR_HALF_W + 16) { m *= PILLAR_SLOW_MULT; break; }
    }
    return m;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player, 'player'); }
  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc, 'npc'); }

  /** Which stance a side is in. */
  getForm(owner: Owner): JusticeForm { return this.side(owner).form; }

  getWill(owner: Owner): number { return this.side(owner).will; }

  isSheerWillActive(owner: Owner): boolean { return this.side(owner).sheerActive; }

  /** True while a set piece owns the caster — ArenaScene must not let it move or act. */
  isLocked(owner: Owner): boolean {
    const s = this.side(owner);
    if (s.seraphUntil > this.now) return true;
    return !!this.judge && this.judge.owner === owner && this.judge.until > this.now;
  }

  /** True while this fighter is being held in the scales. */
  isOnTrial(f: Fighter): boolean {
    return !!this.judge && this.judge.victim === f && this.judge.until > this.now;
  }

  /** X of the nearest hostile flame pillar to `f`, or null. Drives the NPC's avoidance. */
  getHostilePillarX(f: Fighter): number | null {
    let best: number | null = null;
    let bestD = Infinity;
    for (const p of this.pillars) {
      if (!this.targetsOf(p.owner).includes(f)) continue;
      const d = Math.abs(f.x - p.x);
      if (d < bestD) { bestD = d; best = p.x; }
    }
    return best;
  }

  /** Half-width of a pillar's danger band, including a body's worth of margin. */
  get pillarAvoidHalfWidth(): number { return PILLAR_HALF_W + 34; }

  /** Whether a chain is hooked and waiting on a recast — the NPC's cue to pull. */
  hasAnchor(owner: Owner): boolean { return this.anchors.some((a) => a.owner === owner); }

  /**
   * Ability tray fill. Sheer Will and Flight are toggles, so their cards read "on"
   * rather than counting down a cooldown nobody is waiting for.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;
    if (abilityId === 'justice-sheer-will' && s.sheerActive) return 1;
    if (abilityId === 'justice-flight' && s.form === 'flight') return 1;
    if (abilityId === 'justice-bind' && this.hasAnchor('player')) return 1;
    void time;
    return p.getCooldownRatio(abilityId);
  }
}
