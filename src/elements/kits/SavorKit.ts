import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  BUFF_KINDS, BuffKind, CANDY_COLOR, CandyKind, SAVOR, SavorAvatar, SavorColorFn, SavorForm, SavorFx,
  candy, chocoBall, crashCrystal, rushScreen, saltShard, saltSpear, sugarBomb, sugarCloud, sugarGrain, timingBar,
} from './SavorVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

type Owner = 'player' | 'npc';
type Stacks = Record<BuffKind, number>;

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

export const SUGAR_IDS = ['savor-sugar-slam', 'savor-sweet-tooth', 'savor-sugar-diffusion', 'savor-caring-share', 'savor-sugar-rush'];
export const SALT_IDS = ['savor-salt-slice', 'savor-salt-shield', 'savor-salt-infusion', 'savor-salt-wounds', 'savor-salt-crash'];

// ── Candy buffs ──────────────────────────────────────────────────────────────
/** Per stack: Cinnamon +6% damage, Mint 6% resistance, Lemon +5% speed, Fruit Punch +4% dodge. */
const CINNAMON_PER = 0.06;
const MINT_PER = 0.06;
const LEMON_PER = 0.05;
const PUNCH_PER = 0.04;
const PUNCH_CAP = 0.45;
const STACK_CAP = 10;

// ── Sugar Slam (Click) ───────────────────────────────────────────────────────
const SLAM_SPEED = 560;
const SLAM_RANGE = 420;
const SLAM_R = 70;
const SLAM_DAMAGE = 22;
const TRAIL_STEP = 26;
const TRAIL_MS = 3000;
const TRAIL_R = 16;
const TRAIL_TICK = 2;
const CLOUD_MS = 2600;
const CLOUD_R = 56;
const CLOUD_TICK = 3;
const TICK_MS = 500;

// ── Sweet Tooth (E) ──────────────────────────────────────────────────────────
const BAG_CANDIES = 5;
const CANDY_MS = 14000;
const CANDY_PICK_R = 24;
const CANDY_FLIGHT_MS = 420;
const CANDY_MAX = 15;

// ── Sugar Diffusion (R) ──────────────────────────────────────────────────────
const DIFFUSION_MS = 5000;
const DIFFUSION_SPEED = 1.5;
const ORBIT_R = 280;
const MAX_CUBES = 3;
const CUBE_SLOW = 0.1;
const POSTCAST_MS = 1500;
const POSTCAST_SLOW = 0.6;
const DRAIN_EVERY_MS = 1250;
const REPEAT_MULT = 0.88;
const REPEAT_FLOOR = 0.6;
const REPEAT_FORGET_MS = 4000;

// ── Caring Share (F) ─────────────────────────────────────────────────────────
const CHOCO_SPEED = 560;
const CHOCO_MS = 900;
const CHOCO_R = 18;
const CHOCO_DAMAGE = 16;
const LOAN_MULT = 1.5;
const LOAN_MS = 5000;
const CRASH_MS = 5000;
const CRASH_DROPS = 3;

// ── Sugar Rush (Q) ───────────────────────────────────────────────────────────
const RUSH_MS = 12000;
const RUSH_SPEED = 3;
const RUSH_ZOOM = 0.88;

// ── Salt Slice (Click) ───────────────────────────────────────────────────────
const SLICE_SPEED = 950;
const SLICE_MS = 600;
const SLICE_R = 16;
const SLICE_DAMAGE = 12;
const SLICE_PCT = 0.03;

// ── Salt Shield (E) ──────────────────────────────────────────────────────────
const SHIELD_RATE0 = 2;
const SHIELD_RATE1 = 5;
/** Shield/s gained per second the crust has been growing. */
const SHIELD_RAMP = 1;
const SHIELD_CAP = 75;
const SHIELD_GRACE_MS = 300;

// ── Salt Infusion (R) ────────────────────────────────────────────────────────
const AIM_MS = 3000;
const BAR_PERIOD_MS = 1100;
const GREEN_HALF = 0.08;
const YELLOW_HALF = 0.22;
const INFUSE_GREEN = 48;
const INFUSE_YELLOW = 32;
const INFUSE_RED = 18;
const INFUSE_SPEED = 780;
const INFUSE_MS = 900;
const INFUSE_R = 22;
const CRYSTAL_MS = 12000;
const CRYSTAL_PICK_R = 26;

// ── Salt in the Wounds (F) ───────────────────────────────────────────────────
const WOUND_HALF = 0.62;
const WOUND_RANGE = 180;
const WOUND_WINDOW_MS = 2000;
const WOUND_SHARE = 0.5;
const WOUND_MIN = 4;

// ── Salt Crash (Q) ───────────────────────────────────────────────────────────
const CRASH_HIT = 30;
const CRASH_BONUS = 40;
const RACE_MS = 4500;
const RACE_LIVE = 2;
const SALTED_MS = 10000;
const SALTED_PER_STACK = 0.03;
const SALTED_FLOOR = 0.5;
const SCORE_WAIT_MS = 900;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_SHIFT_GAP_MS = 2600;
const NPC_DASH_MS = 200;
const NPC_DASH_SPEED = 520;
const NPC_CANDY_SEEK_R = 220;

// ── World objects ────────────────────────────────────────────────────────────

interface Bomb { owner: Owner; sx: number; sy: number; tx: number; ty: number; t: number; dur: number; lastX: number; lastY: number; visual: boolean }
interface Grain { owner: Owner; x: number; y: number; until: number; visual: boolean }
interface Cloud { owner: Owner; x: number; y: number; until: number; seed: number; visual: boolean }
interface Candy { owner: Owner; kind: CandyKind; x: number; y: number; fromX: number; fromY: number; landAt: number; until: number; seed: number }
interface Shot {
  owner: Owner; x: number; y: number; vx: number; vy: number; until: number; visual: boolean;
  hit: Set<Fighter>;
}
interface Spike extends Shot { damage: number; coat: Partial<Stacks> }
interface Crystal { owner: Owner; x: number; y: number; until: number; coat: Partial<Stacks> }
interface Loan { owner: Owner; stacks: Stacks; until: number; crashUntil: number; dropped: boolean }
interface Drained { owner: Owner; cubes: number; slowUntil: number; lastId: string; lastAt: number; repeats: number }
interface Race {
  owner: Owner;
  until: number;
  victims: Fighter[];
  /** The local player is playing this race (as the caster or as a victim). */
  localSide: 'caster' | 'victim' | null;
  casterScore: number;
  enemyScore: number;
  /** The bot's (or a husk pack's) press rate, presses per second. */
  botRate: number;
  botAcc: number;
  botSide: 'caster' | 'victim' | null;
  targets: { x: number; y: number; born: number }[];
  /** Online: waiting on the other machine's score. */
  awaitingUntil: number;
  remoteScore: number | null;
  resolved: boolean;
}

interface Side {
  form: SavorForm;
  stacks: Stacks;
  aimX: number;
  aimY: number;
  rushUntil: number;
  diffusionUntil: number;
  orbit: Map<Fighter, { last: number; sum: number }>;
  nextDrainAt: number;
  shieldOn: boolean;
  shieldStartedAt: number;
  aiming: { startedAt: number; ang: number } | null;
  saltedUntil: number;
  lastShiftAt: number;
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  sentStacks: string;
}

function zero(): Stacks { return { cinnamon: 0, mint: 0, lemon: 0, punch: 0 }; }

function makeSide(): Side {
  return {
    form: 'sugar', stacks: zero(), aimX: 0, aimY: 0,
    rushUntil: 0, diffusionUntil: 0, orbit: new Map(), nextDrainAt: 0,
    shieldOn: false, shieldStartedAt: 0, aiming: null, saltedUntil: 0,
    lastShiftAt: 0, dashUntil: 0, dashVx: 0, dashVy: 0, sentStacks: '0:0:0:0',
  };
}

const BUFF_NAME: Record<BuffKind, string> = {
  cinnamon: 'Cinnamon Spice', mint: 'Minty Fresh', lemon: 'Zippy Lemon', punch: 'Fruit Punch',
};
const CANDY_NAME: Record<CandyKind, string> = {
  ...BUFF_NAME, licorice: 'Black Licorice', rainbow: 'Rainbow Lollipop',
};

// ── Arena API ────────────────────────────────────────────────────────────────

export interface SavorArenaApi {
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
  /** Online PvP or co-op: the npc slot is a person whose own machine settles their hits. */
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** The bot's difficulty level, 1 (Easy) – 6 (True Nightmare). */
  get npcLevel(): number;
  isTargetable(f: Fighter): boolean;
  get width(): number;
  get height(): number;
  savorColor(owner: Owner, base: number): number;
  skinId(owner: Owner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** Swap the player's tray between the Sugar and Salt rows. */
  setHudForm(form: SavorForm): void;
  /** Memory's bar drain, reused: takes a bite out of whatever that side's element has built up. */
  drainBars(owner: Owner): string[];
}

// ── SavorKit ─────────────────────────────────────────────────────────────────

/**
 * Savor — Sugar and Salt on one body, and every dodge flips between them.
 *
 * The thread through the whole kit is the candy buffs: four permanent stacks (damage, resistance,
 * speed, dodge) that Sugar collects off the floor and Salt cashes in. Sweet Tooth (E) lays the
 * candies down; Caring Share (F) *lends* the enemy 150% of yours, then crashes them and drops
 * three more; and Salt Infusion's stalactite (Salt R), fired through a body still wearing the
 * loan, comes out coated in it — pick the crystal up and the loan is yours for good. Sugar Rush
 * doubles the lot; Salt Crash's race, if won, makes every stack cut cooldowns too.
 *
 * The buff numbers are applied through four generic Fighter fields written here every frame:
 * `savorArmorMult` (self-granted resistance — travels online in `dm`), `savorIncomingMult` (the
 * attacker's damage and a drained fighter's repetition penalty), `savorDodge` (rolled by the
 * victim) and `savorCooldownMult` (Salted). Speed goes through the arena's speed aggregate.
 *
 * Online, the owner's machine decides. Stacks, forms, candies, loans, drains, a stalactite's
 * release and the race score travel as `savor-*` pseudo-casts; replica-owned objects here are
 * pictures that touch nobody.
 */
export class SavorKit {
  private api: SavorArenaApi;

  private readonly pcol: SavorColorFn;
  private readonly ncol: SavorColorFn;
  private readonly pfx: SavorFx;
  private readonly nfx: SavorFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private screenGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private bombs: Bomb[] = [];
  private grains: Grain[] = [];
  private clouds: Cloud[] = [];
  private candies: Candy[] = [];
  private chocos: Shot[] = [];
  private slices: Shot[] = [];
  private spikes: Spike[] = [];
  private crystals: Crystal[] = [];
  private loans = new Map<Fighter, Loan>();
  private drained = new Map<Fighter, Drained>();
  private race: Race | null = null;
  /** Damage each body has taken, newest last — Salt in the Wounds reads the last two seconds. */
  private dealt = new Map<Fighter, { at: number; amt: number }[]>();
  private tickGate = new Map<string, number>();
  private listening = new Map<Fighter, { damaged: (n: number) => void; cast: (id: string) => void }>();
  /** Everything this kit has written a generic field onto, so `reset` can hand it all back. */
  private touched = new Set<Fighter>();
  private touchedWalk = new Set<Fighter>();
  private hudForm: SavorForm | null = null;
  private pointerWasDown = false;
  private camRef: Phaser.Cameras.Scene2D.Camera | null = null;
  private camZoomF = 1;
  private npcThinkAt = 0;

  constructor(api: SavorArenaApi) {
    this.api = api;
    this.pcol = (base) => api.savorColor('player', base);
    this.ncol = (base) => api.savorColor('npc', base);
    this.pfx = new SavorFx(api.scene, this.pcol);
    this.nfx = new SavorFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): SavorFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): SavorColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private savorAvatar(owner: Owner): SavorAvatar | null {
    const av = this.avatar(owner);
    return av instanceof SavorAvatar ? av : null;
  }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  private isSavor(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'gum' : this.api.npcElementId === 'gum';
  }

  /** An online opponent's body (or a co-op ally's): drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private simulates(owner: Owner): boolean { return !this.isReplica(owner); }

  private isReplicaBody(f: Fighter): boolean {
    return f === this.api.npc && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number, max = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = max;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  /** Who can hurt this body with candy-boosted hits — and whose repetition penalty protects it. */
  private opponentsOf(f: Fighter): Fighter[] {
    const { player, npc } = this.api;
    if (this.api.isInvasion) return f === player ? [] : [player];
    if (f === player) return npc ? [npc] : [];
    if (f === npc) return [player];
    return [player];
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline && !this.api.isInvasion) this.api.broadcast(id);
  }

  /** Online coordinates are mirrored left-to-right between the two machines. */
  private mx(x: number): number { return this.api.width - x; }

  private hurt(owner: Owner, victim: Fighter, amount: number, flash: number, aoe = false): void {
    if (!this.alive(victim) || amount <= 0) return;
    const src = this.fighter(owner);
    Fighter.asNonAllyDamage(() => victim.takeDamage(Math.max(1, Math.round(amount)),
      { source: src, sourceX: src?.x, sourceY: src?.y, aoe }));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(flash));
  }

  private clampToArena(x: number, y: number): { x: number; y: number } {
    return { x: Phaser.Math.Clamp(x, this.left + 10, this.right - 10), y: Phaser.Math.Clamp(y, this.top + 10, this.bottom - 10) };
  }

  private rushing(owner: Owner): boolean { return this.now < this.side(owner).rushUntil; }
  private diffusing(owner: Owner): boolean { return this.now < this.side(owner).diffusionUntil; }
  private salted(owner: Owner): boolean { return this.now < this.side(owner).saltedUntil; }

  /**
   * A buff as it is actually felt by this body: its own candies (doubled in a Sugar Rush), plus
   * a loan from Caring Share, minus the crash that follows it.
   */
  private eff(f: Fighter, kind: BuffKind): number {
    let n = 0;
    const own = this.ownerOf(f);
    if (own && this.isSavor(own)) n += this.side(own).stacks[kind] * (this.rushing(own) ? 2 : 1);
    const loan = this.loans.get(f);
    if (loan) {
      if (this.now < loan.until) n += loan.stacks[kind];
      else if (this.now < loan.crashUntil) n -= loan.stacks[kind];
    }
    return n;
  }

  private totalStacks(owner: Owner): number {
    const s = this.side(owner).stacks;
    return s.cinnamon + s.mint + s.lemon + s.punch;
  }

  private addStacks(owner: Owner, delta: Partial<Stacks>): void {
    const s = this.side(owner).stacks;
    for (const k of BUFF_KINDS) s[k] = Phaser.Math.Clamp(s[k] + (delta[k] ?? 0), 0, STACK_CAP);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const [f, fns] of this.listening) { f.off('damaged', fns.damaged); f.off('cast', fns.cast); }
    this.listening.clear();
    for (const f of this.touched) {
      if (!f || !f.active) continue;
      f.savorArmorMult = 1; f.savorIncomingMult = 1; f.savorDodge = 0; f.savorCooldownMult = 1; f.savorNoDodgeUntil = 0;
    }
    this.touched.clear();
    for (const f of this.touchedWalk) if (f && f.active) f.walkSpeedMult = 1;
    this.touchedWalk.clear();
    this.restoreCamera();

    this.sides = { player: makeSide(), npc: makeSide() };
    this.bombs = []; this.grains = []; this.clouds = []; this.candies = [];
    this.chocos = []; this.slices = []; this.spikes = []; this.crystals = [];
    this.loans.clear(); this.drained.clear(); this.dealt.clear(); this.tickGate.clear();
    this.race = null;
    this.hudForm = null;
    this.pointerWasDown = false;
    this.vizT = 0;
    this.npcThinkAt = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.screenGfx?.destroy(); this.screenGfx = null;

    for (const id of ['savor-form', 'savor-candy', 'savor-rush', 'savor-diffusion', 'savor-shield', 'savor-salted',
      'savor-loan', 'savor-crash', 'savor-drained', 'savor-lifted']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(60).setScrollFactor(0);
    if (!this.screenGfx) this.screenGfx = scene.add.graphics().setDepth(13.5).setScrollFactor(0);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new SavorAvatar(this.api.scene, this.col(owner));
  }

  private ensureAvatars(): void {
    if (this.isSavor('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (this.isSavor('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
  }

  /** Every body is listened to: the wounds log, and the casts a drained fighter is punished for. */
  private ensureListeners(): void {
    for (const f of this.allFighters()) {
      if (!f || this.listening.has(f)) continue;
      const damaged = (amount: number) => {
        if (amount <= 0) return;
        const log = this.dealt.get(f) ?? [];
        log.push({ at: this.now, amt: amount });
        while (log.length && this.now - log[0].at > WOUND_WINDOW_MS) log.shift();
        this.dealt.set(f, log);
      };
      const cast = (id: string) => this.onCast(f, id);
      f.on('damaged', damaged);
      f.on('cast', cast);
      this.listening.set(f, { damaged, cast });
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'gum') return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    if (!this.alive(p)) return;
    // Mid-race the clicks belong to the crystals.
    if (this.race && this.race.localSide) return;

    const ids = s.form === 'sugar' ? SUGAR_IDS : SALT_IDS;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility(ids[0], ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility(ids[1], ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // The recast: a stalactite already hanging is fired, not re-grown.
      if (s.form === 'salt' && s.aiming) this.fireSpike('player');
      else p.castAbility(ids[2], ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility(ids[3], ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility(ids[4], ctx);
  }

  /** Space: the dodge happens as normal, and the body flips to its other form on the way. */
  onDodge(owner: Owner): void {
    if (!this.isSavor(owner) || !this.simulates(owner)) return;
    this.shift(owner);
  }

  private shift(owner: Owner, to?: SavorForm): void {
    const s = this.side(owner);
    const next: SavorForm = to ?? (s.form === 'sugar' ? 'salt' : 'sugar');
    if (next === s.form) return;
    s.form = next;
    s.lastShiftAt = this.now;
    // A stalactite left hanging falls apart; the shield keeps what it has grown but stops growing.
    s.aiming = null;
    s.shieldOn = false;
    const f = this.fighter(owner);
    if (this.alive(f)) this.fx(owner).shift(f.x, f.y, next);
    Sfx.playAt(next === 'salt' ? 'ice-shatter' : 'bubble', f?.x ?? 0);
    this.relay(owner, `savor-form:${next === 'salt' ? 1 : 0}`);
  }

  // ── Sugar: Click — Sugar Slam ──────────────────────────────────────────────

  doSugarSlam(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const a = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(SLAM_RANGE, Math.hypot(tx - f.x, ty - f.y));
    const end = this.clampToArena(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d);
    const sx = f.x + Math.cos(a) * 18;
    const sy = f.y + Math.sin(a) * 18;
    const dur = Math.max(160, (Phaser.Math.Distance.Between(sx, sy, end.x, end.y) / SLAM_SPEED) * 1000);
    this.bombs.push({ owner, sx, sy, tx: end.x, ty: end.y, t: 0, dur, lastX: sx, lastY: sy, visual: this.isReplica(owner) });
    this.avatar(owner)?.play('punch', a);
    this.fx(owner).slamLaunch(sx, sy, a);
  }

  private updateBombs(delta: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += delta;
      const k = Math.min(1, b.t / b.dur);
      const x = b.sx + (b.tx - b.sx) * k;
      const y = b.sy + (b.ty - b.sy) * k;
      // The trail: a crumb every few pixels along the ground track.
      if (Phaser.Math.Distance.Between(b.lastX, b.lastY, x, y) >= TRAIL_STEP) {
        this.grains.push({ owner: b.owner, x, y, until: this.now + TRAIL_MS, visual: b.visual });
        b.lastX = x; b.lastY = y;
      }
      if (k < 1) continue;
      this.bombs.splice(i, 1);
      this.fx(b.owner).slamBurst(b.tx, b.ty, SLAM_R);
      Sfx.playAt('explosion-small', b.tx);
      this.clouds.push({ owner: b.owner, x: b.tx, y: b.ty, until: this.now + CLOUD_MS, seed: Math.random() * 99, visual: b.visual });
      if (b.visual) continue;
      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.tx, b.ty, t.x, t.y) <= SLAM_R + 16) this.hurt(b.owner, t, SLAM_DAMAGE, SAVOR.sugar, true);
      }
    }
  }

  /** The trail and the clouds sting on a beat — once per body per beat however many overlap. */
  private updateSugarHazards(): void {
    const now = this.now;
    this.grains = this.grains.filter((g) => now < g.until);
    this.clouds = this.clouds.filter((c) => now < c.until);
    for (const owner of BOTH) {
      if (!this.simulates(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const key = `${owner}:${this.tagOf(t)}`;
        if (now < (this.tickGate.get(key) ?? 0)) continue;
        let dmg = 0;
        if (this.clouds.some((c) => c.owner === owner && !c.visual && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= CLOUD_R)) dmg += CLOUD_TICK;
        if (this.grains.some((g) => g.owner === owner && !g.visual && Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) <= TRAIL_R + 14)) dmg += TRAIL_TICK;
        if (dmg <= 0) continue;
        this.tickGate.set(key, now + TICK_MS);
        this.hurt(owner, t, dmg, SAVOR.sparkle);
      }
    }
  }

  private tagSeq = 0;
  private tags = new WeakMap<Fighter, number>();
  private tagOf(f: Fighter): number {
    let n = this.tags.get(f);
    if (n === undefined) { n = ++this.tagSeq; this.tags.set(f, n); }
    return n;
  }

  // ── Sugar: E — Sweet Tooth ─────────────────────────────────────────────────

  private rollCandy(allowLicorice: boolean): CandyKind {
    const r = Math.random();
    if (allowLicorice && r < 0.12) return 'licorice';
    if (r < 0.2) return 'rainbow';
    return BUFF_KINDS[Math.floor(Math.random() * 4)];
  }

  doSweetTooth(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.avatar(owner)?.play('sweep');
    this.fx(owner).bagBurst(f.x, f.y - 6);
    // A replica's bag is opened on its own machine, which tells us where the sweets went.
    if (!this.simulates(owner)) return;
    const spawned: Candy[] = [];
    for (let i = 0; i < BAG_CANDIES; i++) {
      const a = (i / BAG_CANDIES) * TAU + Math.random() * 0.8;
      const d = 70 + Math.random() * 80;
      const at = this.clampToArena(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d);
      spawned.push(this.dropCandy(owner, this.rollCandy(true), f.x, f.y, at.x, at.y));
    }
    this.relayCandies(owner, spawned);
  }

  private dropCandy(owner: Owner, kind: CandyKind, fromX: number, fromY: number, x: number, y: number): Candy {
    const c: Candy = {
      owner, kind, x, y, fromX, fromY, landAt: this.now + CANDY_FLIGHT_MS, until: this.now + CANDY_MS, seed: Math.random() * 99,
    };
    this.candies.push(c);
    const mine = this.candies.filter((k) => k.owner === owner);
    if (mine.length > CANDY_MAX) this.candies.splice(this.candies.indexOf(mine[0]), 1);
    return c;
  }

  private relayCandies(owner: Owner, list: Candy[]): void {
    if (!list.length) return;
    const KIND_CODE: CandyKind[] = ['cinnamon', 'mint', 'lemon', 'punch', 'licorice', 'rainbow'];
    this.relay(owner, `savor-candies:${list.map((c) => `${KIND_CODE.indexOf(c.kind)},${Math.round(this.mx(c.x))},${Math.round(c.y)},${Math.round(this.mx(c.fromX))},${Math.round(c.fromY)}`).join(';')}`);
  }

  private eatCandy(owner: Owner, c: Candy): void {
    const f = this.fighter(owner);
    this.candies.splice(this.candies.indexOf(c), 1);
    this.fx(owner).pickup(c.x, c.y, c.kind);
    Sfx.playAt('sparkle', c.x);
    if (c.kind === 'licorice') this.addStacks(owner, { cinnamon: -1, mint: -1, lemon: -1, punch: -1 });
    else if (c.kind === 'rainbow') this.addStacks(owner, { cinnamon: 1, mint: 1, lemon: 1, punch: 1 });
    else this.addStacks(owner, { [c.kind]: 1 });
    const txt = c.kind === 'licorice' ? '−1 ALL' : c.kind === 'rainbow' ? '+1 ALL!' : `+${CANDY_NAME[c.kind].toUpperCase()}`;
    const color = c.kind === 'licorice' ? '#8a7a84' : c.kind === 'rainbow' ? '#d9b8ff' : `#${CANDY_COLOR[c.kind].toString(16).padStart(6, '0')}`;
    if (this.alive(f)) this.api.showFloatingText(f.x, f.y - 36, txt, color);
    this.relay(owner, `savor-eat:${Math.round(this.mx(c.x))}:${Math.round(c.y)}`);
  }

  private updateCandies(): void {
    const now = this.now;
    this.candies = this.candies.filter((c) => now < c.until);
    for (const owner of BOTH) {
      if (!this.isSavor(owner) || !this.simulates(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      for (const c of [...this.candies]) {
        if (c.owner !== owner || now < c.landAt) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= CANDY_PICK_R) this.eatCandy(owner, c);
      }
      for (const cr of [...this.crystals]) {
        if (cr.owner !== owner) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, cr.x, cr.y) <= CRYSTAL_PICK_R) this.eatCrystal(owner, cr);
      }
    }
    this.crystals = this.crystals.filter((c) => now < c.until);
  }

  // ── Sugar: R — Sugar Diffusion ─────────────────────────────────────────────

  doSugarDiffusion(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.diffusionUntil = this.now + DIFFUSION_MS;
    s.orbit.clear();
    s.nextDrainAt = this.now + DRAIN_EVERY_MS;
    this.avatar(owner)?.play('dash');
    this.fx(owner).shift(f.x, f.y, 'sugar');
  }

  /** Track the angle swept round every target in range; a full turn is a loop, and a cube. */
  private updateDiffusion(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!this.diffusing(owner)) { s.orbit.clear(); continue; }
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const sim = this.simulates(owner);
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        const o = s.orbit.get(t);
        if (d > ORBIT_R) { s.orbit.delete(t); continue; }
        const ang = Math.atan2(f.y - t.y, f.x - t.x);
        if (!o) { s.orbit.set(t, { last: ang, sum: 0 }); continue; }
        o.sum += Phaser.Math.Angle.Wrap(ang - o.last);
        o.last = ang;
        if (Math.abs(o.sum) >= TAU) {
          o.sum = 0;
          if (sim) this.drainBlood(owner, t);
        }
      }
      // The steady drain on every bar a target in range has built up.
      if (sim && this.now >= s.nextDrainAt) {
        s.nextDrainAt = this.now + DRAIN_EVERY_MS;
        for (const t of this.targetsOf(owner)) {
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > ORBIT_R) continue;
          const vo = this.ownerOf(t);
          if (!vo) continue;
          if (this.isReplicaBody(t)) { this.relay(owner, 'savor-drain'); continue; }
          const labels = this.api.drainBars(vo);
          if (labels.length) this.api.showFloatingText(t.x, t.y - 40, labels.join(' '), '#ffb8d4');
        }
      }
    }
  }

  /** A loop completed: the blood sugar comes out of them as a cube over the caster's head. */
  private drainBlood(owner: Owner, t: Fighter): void {
    const d = this.drained.get(t) ?? { owner, cubes: 0, slowUntil: 0, lastId: '', lastAt: 0, repeats: 0 };
    if (d.cubes >= MAX_CUBES) return;
    d.cubes++;
    d.owner = owner;
    this.drained.set(t, d);
    const f = this.fighter(owner);
    this.fx(owner).drain(t.x, t.y, f.x, f.y - 40);
    Sfx.playAt('sparkle', t.x);
    this.api.showFloatingText(t.x, t.y - 34, `🧊 BLOOD SUGAR ×${d.cubes}`, '#ffffff');
    if (this.isReplicaBody(t)) this.relay(owner, `savor-cube:${d.cubes}`);
  }

  private cubesOver(owner: Owner): number {
    let n = 0;
    for (const d of this.drained.values()) if (d.owner === owner) n += d.cubes;
    return Math.min(6, n);
  }

  /** A drained fighter used an ability: a sluggish beat with no dodge, and a repeat is weaker. */
  private onCast(f: Fighter, id: string): void {
    const d = this.drained.get(f);
    if (!d) return;
    d.slowUntil = this.now + POSTCAST_MS;
    f.savorNoDodgeUntil = Math.max(f.savorNoDodgeUntil, this.now + POSTCAST_MS);
    this.touched.add(f);
    if (id === d.lastId && this.now - d.lastAt < REPEAT_FORGET_MS) d.repeats++;
    else d.repeats = 0;
    d.lastId = id;
    d.lastAt = this.now;
  }

  private repetitionMult(f: Fighter): number {
    const d = this.drained.get(f);
    if (!d || d.repeats <= 0 || this.now - d.lastAt > REPEAT_FORGET_MS) return 1;
    return Math.max(REPEAT_FLOOR, Math.pow(REPEAT_MULT, d.repeats));
  }

  // ── Sugar: F — Caring Share ────────────────────────────────────────────────

  doCaringShare(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const a = Math.atan2(ty - f.y, tx - f.x);
    this.chocos.push({
      owner, x: f.x + Math.cos(a) * 20, y: f.y + Math.sin(a) * 20,
      vx: Math.cos(a) * CHOCO_SPEED, vy: Math.sin(a) * CHOCO_SPEED, until: this.now + CHOCO_MS,
      visual: this.isReplica(owner), hit: new Set(),
    });
    this.avatar(owner)?.play('punch', a);
  }

  private updateChocos(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.chocos.length - 1; i >= 0; i--) {
      const c = this.chocos[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      let done = this.now >= c.until || c.x < this.left || c.x > this.right || c.y < this.top || c.y > this.bottom;
      if (!done && !c.visual) {
        for (const t of this.targetsOf(c.owner)) {
          if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > CHOCO_R + 18) continue;
          this.hurt(c.owner, t, CHOCO_DAMAGE, SAVOR.choco);
          this.share(c.owner, t);
          done = true;
          break;
        }
      }
      if (done) {
        this.chocos.splice(i, 1);
        this.fx(c.owner).chocoSplat(c.x, c.y);
      }
    }
  }

  /** The loan: 150% of the caster's felt buffs, then the same back as a crash. */
  private share(owner: Owner, t: Fighter, net?: Stacks): void {
    const src = this.fighter(owner);
    const stacks = net ?? zero();
    if (!net) for (const k of BUFF_KINDS) stacks[k] = Math.max(0, Math.round(this.eff(src, k) * LOAN_MULT));
    this.loans.set(t, { owner, stacks, until: this.now + LOAN_MS, crashUntil: this.now + LOAN_MS + CRASH_MS, dropped: false });
    this.touched.add(t);
    const sum = stacks.cinnamon + stacks.mint + stacks.lemon + stacks.punch;
    this.api.showFloatingText(t.x, t.y - 38, sum > 0 ? `🍫 SHARED +${sum}` : '🍫 SHARED', '#e9c08a');
    if (!net && this.isReplicaBody(t)) {
      this.relay(owner, `savor-loan:${stacks.cinnamon}:${stacks.mint}:${stacks.lemon}:${stacks.punch}`);
    }
  }

  private updateLoans(): void {
    const now = this.now;
    for (const [f, l] of this.loans) {
      if (now >= l.crashUntil || !f.active) { this.loans.delete(f); continue; }
      if (now >= l.until && !l.dropped) {
        l.dropped = true;
        this.fx(l.owner).crash(f.x, f.y);
        this.api.showFloatingText(f.x, f.y - 38, '💤 SUGAR CRASH', '#9a8f9c');
        // The crash spills three sweets for the one who shared them. Decided on that machine.
        if (this.simulates(l.owner)) {
          const spawned: Candy[] = [];
          for (let i = 0; i < CRASH_DROPS; i++) {
            const a = Math.random() * TAU;
            const d = 40 + Math.random() * 70;
            const at = this.clampToArena(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d);
            spawned.push(this.dropCandy(l.owner, this.rollCandy(false), f.x, f.y, at.x, at.y));
          }
          this.relayCandies(l.owner, spawned);
        }
      }
    }
  }

  // ── Sugar: Q — Sugar Rush ──────────────────────────────────────────────────

  doSugarRush(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.side(owner).rushUntil = this.now + RUSH_MS;
    this.avatar(owner)?.play('raise');
    this.fx(owner).rushIgnite(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 44, 'SUGAR RUSH!', '#ff8fd0');
  }

  // ── Salt: Click — Salt Slice ───────────────────────────────────────────────

  doSaltSlice(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const a = Math.atan2(ty - f.y, tx - f.x);
    const x = f.x + Math.cos(a) * 20;
    const y = f.y + Math.sin(a) * 20;
    this.slices.push({
      owner, x, y, vx: Math.cos(a) * SLICE_SPEED, vy: Math.sin(a) * SLICE_SPEED, until: this.now + SLICE_MS,
      visual: this.isReplica(owner), hit: new Set(),
    });
    this.avatar(owner)?.play('punch', a);
    this.fx(owner).sliceLaunch(x, y, a);
  }

  private updateSlices(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.slices.length - 1; i >= 0; i--) {
      const s = this.slices[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const ang = Math.atan2(s.vy, s.vx);
      let done = false;
      if (this.now >= s.until || s.x < this.left || s.x > this.right || s.y < this.top || s.y > this.bottom) {
        done = true;
        this.fx(s.owner).shatter(s.x, s.y, ang);
      } else if (!s.visual) {
        for (const t of this.targetsOf(s.owner)) {
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > SLICE_R + 18) continue;
          this.hurt(s.owner, t, SLICE_DAMAGE + t.maxHp * SLICE_PCT, SAVOR.saltEdge);
          this.fx(s.owner).shatter(s.x, s.y, ang);
          done = true;
          break;
        }
      } else {
        // A replica's shard still breaks visibly on the body it reaches.
        const p = this.api.player;
        if (this.alive(p) && Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) <= SLICE_R + 18) {
          this.fx(s.owner).shatter(s.x, s.y, ang);
          done = true;
        }
      }
      if (done) this.slices.splice(i, 1);
    }
  }

  // ── Salt: E — Salt Shield ──────────────────────────────────────────────────

  doSaltShield(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.shieldOn = true;
    s.shieldStartedAt = this.now;
    this.avatar(owner)?.play('flex');
    this.fx(owner).shift(f.x, f.y, 'salt');
  }

  private updateShields(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.shieldOn) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.shieldOn = false; continue; }
      // A replica's shield is grown on its own machine and arrives through the vitals.
      if (!this.simulates(owner)) continue;
      const age = (this.now - s.shieldStartedAt) / 1000;
      if (age * 1000 > SHIELD_GRACE_MS && f.shieldHp <= 0) {
        s.shieldOn = false;
        this.fx(owner).shieldBreak(f.x, f.y);
        this.api.showFloatingText(f.x, f.y - 36, 'SHIELD BROKEN', '#aab7c2');
        continue;
      }
      const rate = Math.min(SHIELD_RATE1, SHIELD_RATE0 + age * SHIELD_RAMP);
      f.shieldHp = Math.min(SHIELD_CAP, f.shieldHp + rate * dt);
      if (f.shieldHp >= SHIELD_CAP) {
        s.shieldOn = false;
        this.api.showFloatingText(f.x, f.y - 36, `🧂 ${SHIELD_CAP} SHIELD`, '#e8eef2');
      }
    }
  }

  // ── Salt: R — Salt Infusion ────────────────────────────────────────────────

  doSaltInfusion(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aiming = { startedAt: this.now, ang: Math.atan2(ty - f.y, tx - f.x) };
    this.avatar(owner)?.setHold('charge', s.aiming.ang);
  }

  /** Where the timing marker is, 0..1, a triangle wave across the bar. */
  private barK(owner: Owner): number {
    const a = this.side(owner).aiming;
    if (!a) return 0;
    const ph = ((this.now - a.startedAt) % BAR_PERIOD_MS) / BAR_PERIOD_MS;
    return ph < 0.5 ? ph * 2 : 2 - ph * 2;
  }

  private zoneDamage(k: number): number {
    const off = Math.abs(k - 0.5);
    return off <= GREEN_HALF ? INFUSE_GREEN : off <= YELLOW_HALF ? INFUSE_YELLOW : INFUSE_RED;
  }

  private fireSpike(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.aiming || !this.alive(f)) return;
    const k = this.barK(owner);
    const damage = this.zoneDamage(k);
    const ang = s.aiming.ang;
    s.aiming = null;
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.play('punch', ang);
    this.launchSpike(owner, f.x + Math.cos(ang) * 26, f.y + Math.sin(ang) * 26, ang, damage, false);
    const zone = damage === INFUSE_GREEN ? 'PERFECT!' : damage === INFUSE_YELLOW ? 'GOOD' : 'WEAK';
    this.api.showFloatingText(f.x, f.y - 40, zone, damage === INFUSE_GREEN ? '#58e070' : damage === INFUSE_YELLOW ? '#ffd84a' : '#ff6a6a');
    this.relay(owner, `savor-fire:${Math.round(this.mx(f.x))}:${Math.round(f.y)}:${Math.round((Math.PI - ang) * 1000)}:${damage}`);
  }

  private launchSpike(owner: Owner, x: number, y: number, ang: number, damage: number, visual: boolean): void {
    this.spikes.push({
      owner, x, y, vx: Math.cos(ang) * INFUSE_SPEED, vy: Math.sin(ang) * INFUSE_SPEED, until: this.now + INFUSE_MS,
      visual: visual || this.isReplica(owner), hit: new Set(), damage, coat: {},
    });
    this.fx(owner).sliceLaunch(x, y, ang);
    Sfx.playAt('ice-shatter', x);
  }

  /**
   * What a body is wearing, in candy terms: its own sweets and any loan (straight across), and a
   * buff of any other kind mapped onto the nearest candy — a shield is Mint, dodge is Fruit
   * Punch, anything else timed is Cinnamon.
   */
  private buffsOn(t: Fighter): Partial<Stacks> {
    const out: Partial<Stacks> = {};
    for (const k of BUFF_KINDS) {
      const n = this.eff(t, k);
      if (n > 0) out[k] = Math.min(4, Math.ceil(n / 2));
    }
    if ((t.shieldHp > 0 || t.shieldCharges > 0) && !out.mint) out.mint = 1;
    if ((t.dodgeChance > 0 || t.windDodge > 0) && !out.punch) out.punch = 1;
    if (t.outgoingDamageMult > 1 && !out.cinnamon) out.cinnamon = 1;
    return out;
  }

  private updateSpikes(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const ang = Math.atan2(s.vy, s.vx);
      if (!s.visual) {
        for (const t of this.targetsOf(s.owner)) {
          if (s.hit.has(t) || Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > INFUSE_R + 18) continue;
          s.hit.add(t);
          this.hurt(s.owner, t, s.damage, SAVOR.saltEdge);
          const soaked = this.buffsOn(t);
          for (const k of BUFF_KINDS) if (soaked[k]) s.coat[k] = Math.max(s.coat[k] ?? 0, soaked[k] ?? 0);
          const cols = BUFF_KINDS.filter((k) => soaked[k]).map((k) => CANDY_COLOR[k]);
          if (cols.length) this.fx(s.owner).coatFlash(t.x, t.y, cols);
          this.fx(s.owner).shatter(t.x, t.y, ang);
        }
      }
      const out = s.x < this.left || s.x > this.right || s.y < this.top || s.y > this.bottom;
      if (!out && this.now < s.until) continue;
      this.spikes.splice(i, 1);
      const at = this.clampToArena(s.x, s.y);
      this.fx(s.owner).shatter(at.x, at.y, ang, true);
      if (s.visual) continue;
      if (BUFF_KINDS.some((k) => (s.coat[k] ?? 0) > 0)) {
        this.crystals.push({ owner: s.owner, x: at.x, y: at.y, until: this.now + CRYSTAL_MS, coat: { ...s.coat } });
        const c = s.coat;
        this.relay(s.owner, `savor-crystal:${Math.round(this.mx(at.x))}:${Math.round(at.y)}:${c.cinnamon ?? 0}:${c.mint ?? 0}:${c.lemon ?? 0}:${c.punch ?? 0}`);
      }
    }
  }

  private eatCrystal(owner: Owner, cr: Crystal): void {
    this.crystals.splice(this.crystals.indexOf(cr), 1);
    this.addStacks(owner, cr.coat);
    const sum = BUFF_KINDS.reduce((n, k) => n + (cr.coat[k] ?? 0), 0);
    this.fx(owner).coatFlash(cr.x, cr.y, BUFF_KINDS.filter((k) => cr.coat[k]).map((k) => CANDY_COLOR[k]));
    this.fx(owner).shatter(cr.x, cr.y, -Math.PI / 2, true);
    const f = this.fighter(owner);
    if (this.alive(f)) this.api.showFloatingText(f.x, f.y - 36, `🧂 +${sum} STACKS`, '#e8eef2');
    Sfx.playAt('sparkle', cr.x);
    this.relay(owner, `savor-eat:${Math.round(this.mx(cr.x))}:${Math.round(cr.y)}`);
  }

  private updateAiming(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.aiming) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || s.form !== 'salt') { s.aiming = null; this.avatar(owner)?.setHold(null); continue; }
      if (this.simulates(owner)) s.aiming.ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      this.avatar(owner)?.setHold('charge', s.aiming.ang);
      // A replica's release arrives as `savor-fire`; never decide it here.
      if (!this.simulates(owner)) {
        if (this.now - s.aiming.startedAt > AIM_MS + 1500) { s.aiming = null; this.avatar(owner)?.setHold(null); }
        continue;
      }
      // Waited too long: it fires itself, wherever the marker happens to be.
      if (this.now - s.aiming.startedAt >= AIM_MS) { this.fireSpike(owner); continue; }
      // The bot fires on a zone its difficulty can hit.
      if (owner === 'npc') {
        const off = Math.abs(this.barK('npc') - 0.5);
        const lvl = this.api.npcLevel;
        const want = lvl >= 5 ? GREEN_HALF : lvl >= 3 ? YELLOW_HALF : 1;
        if (off <= want && this.now - s.aiming.startedAt > 350) this.fireSpike('npc');
      }
    }
  }

  // ── Salt: F — Salt in the Wounds ───────────────────────────────────────────

  /** Half of what this body has taken in the last two seconds. */
  private woundOf(t: Fighter): number {
    const log = this.dealt.get(t);
    if (!log) return 0;
    let sum = 0;
    for (const e of log) if (this.now - e.at <= WOUND_WINDOW_MS) sum += e.amt;
    return sum * WOUND_SHARE;
  }

  doSaltWounds(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('sweep', ang);
    let best = 0;
    if (this.simulates(owner)) {
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d > WOUND_RANGE + 18) continue;
        const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
        if (da > WOUND_HALF && d > 30) continue;
        const dmg = Math.max(WOUND_MIN, this.woundOf(t));
        best = Math.max(best, dmg);
        this.hurt(owner, t, dmg, SAVOR.zoneRed);
        this.fx(owner).sting(t.x, t.y, Math.min(1, dmg / 40));
      }
    }
    this.fx(owner).woundSpray(f.x, f.y, ang, WOUND_HALF, WOUND_RANGE, Math.min(1, best / 40));
  }

  // ── Salt: Q — Salt Crash ───────────────────────────────────────────────────

  doSaltCrash(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.race) return;
    this.ensureLayers();
    this.ensureAvatars();
    const victims = this.targetsOf(owner);
    this.avatar(owner)?.play('slam');
    for (const t of victims) {
      this.fx(owner).spearsErupt(t.x, t.y);
      if (this.simulates(owner)) this.hurt(owner, t, CRASH_HIT, SAVOR.saltEdge, true);
    }
    const until = this.now + RACE_MS;
    // Neither side attacks while the race runs.
    for (const v of [f, ...victims]) { v.applyDisarm(RACE_MS); this.touched.add(v); }
    const duelVictim = victims.find((v) => v === this.api.player || v === this.api.npc) ?? null;
    let localSide: Race['localSide'] = null;
    if (owner === 'player') localSide = 'caster';
    else if (duelVictim === this.api.player) localSide = 'victim';
    // The other contestant: the bot if there is one, a husk pack's fixed pace, or (online) a person.
    let botSide: Race['botSide'] = null;
    let botRate = 0;
    if (owner === 'npc' && !this.isReplica('npc')) { botSide = 'caster'; botRate = this.botPressRate(); }
    else if (owner === 'player' && !this.api.isOnline) { botSide = 'victim'; botRate = duelVictim ? this.botPressRate() : 1.5; }
    else if (owner === 'player' && this.api.isInvasion) { botSide = 'victim'; botRate = 1.5; }
    this.race = {
      owner, until, victims, localSide, casterScore: 0, enemyScore: 0, botRate, botAcc: 0, botSide,
      targets: [], awaitingUntil: 0, remoteScore: null, resolved: false,
    };
    if (this.race.localSide) for (let i = 0; i < RACE_LIVE; i++) this.spawnRaceTarget();
    this.api.showFloatingText(this.api.width / 2, this.api.height * 0.22, 'SALT CRASH — PRESS THE CRYSTALS!', '#e8eef2');
  }

  private botPressRate(): number {
    return 0.6 + 0.4 * Math.min(6, Math.max(1, this.api.npcLevel));
  }

  private spawnRaceTarget(): void {
    const r = this.race;
    if (!r) return;
    const W = this.api.width;
    const H = this.api.height;
    r.targets.push({ x: 90 + Math.random() * (W - 180), y: 90 + Math.random() * (H - 220), born: this.now });
  }

  private updateRace(delta: number): void {
    const r = this.race;
    const pointer = this.api.scene.input.activePointer;
    const down = !!pointer?.isDown;
    const justDown = down && !this.pointerWasDown;
    this.pointerWasDown = down;
    if (!r) return;
    const dt = delta / 1000;
    // Hold everyone on their spears.
    for (const v of [this.fighter(r.owner), ...r.victims]) {
      if (!this.alive(v) || this.isReplicaBody(v)) continue;
      (v.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
    if (!r.resolved && this.now < r.until) {
      if (r.localSide && justDown && pointer) {
        const px = pointer.worldX;
        const py = pointer.worldY;
        const cam = this.api.scene.cameras.main;
        const sx = px - cam.scrollX;
        const sy = py - cam.scrollY;
        const hit = r.targets.findIndex((t) => Phaser.Math.Distance.Between(sx, sy, t.x, t.y) <= 30);
        if (hit >= 0) {
          const t = r.targets[hit];
          r.targets.splice(hit, 1);
          if (r.localSide === 'caster') r.casterScore++; else r.enemyScore++;
          this.fx(r.owner).shatter(t.x + cam.scrollX, t.y + cam.scrollY, -Math.PI / 2);
          Sfx.playAt('ice-shatter', t.x);
          this.spawnRaceTarget();
        }
      }
      if (r.botSide) {
        r.botAcc += dt * r.botRate * (0.75 + Math.random() * 0.5);
        while (r.botAcc >= 1) {
          r.botAcc -= 1;
          if (r.botSide === 'caster') r.casterScore++; else r.enemyScore++;
        }
      }
      return;
    }
    if (r.resolved) return;
    // Time: settle it. Online, the side that cast waits a beat for the other machine's score.
    r.targets = [];
    if (r.owner === 'player' && this.api.isOnline && !this.api.isInvasion && !r.botSide) {
      if (r.remoteScore === null) {
        if (!r.awaitingUntil) r.awaitingUntil = this.now + SCORE_WAIT_MS;
        if (this.now < r.awaitingUntil) return;
      }
      r.enemyScore = r.remoteScore ?? 0;
    }
    if (r.owner === 'npc' && this.isReplica('npc')) {
      // We were the victim: send our presses and wait to be told the result.
      if (!r.awaitingUntil) {
        r.awaitingUntil = this.now + SCORE_WAIT_MS * 3;
        this.api.broadcast(`savor-score:${r.enemyScore}`);
      }
      if (this.now >= r.awaitingUntil) this.race = null;
      return;
    }
    this.resolveRace(r.casterScore > r.enemyScore);
  }

  private resolveRace(won: boolean): void {
    const r = this.race;
    if (!r) return;
    r.resolved = true;
    const f = this.fighter(r.owner);
    if (won) {
      if (this.simulates(r.owner)) for (const v of r.victims) this.hurt(r.owner, v, CRASH_BONUS, SAVOR.saltEdge);
      this.side(r.owner).saltedUntil = this.now + SALTED_MS;
      if (this.alive(f)) { this.fx(r.owner).salted(f.x, f.y); this.api.showFloatingText(f.x, f.y - 44, '🧂 SALTED!', '#ffffff'); }
    } else if (this.alive(f)) {
      this.api.showFloatingText(f.x, f.y - 44, 'OUT-PRESSED', '#9aa6b2');
    }
    for (const v of r.victims) v.disarmedUntil = Math.min(v.disarmedUntil, Date.now());
    if (this.alive(f)) f.disarmedUntil = Math.min(f.disarmedUntil, Date.now());
    if (r.owner === 'player') this.relay('player', `savor-result:${won ? 1 : 0}`);
    this.race = null;
  }

  private lifted(f: Fighter): boolean {
    const r = this.race;
    if (!r) return false;
    return r.victims.includes(f) || this.fighter(r.owner) === f;
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /** The other Savor's machine decided something; mirror it (or apply it to our own body). */
  replayNet(id: string): void {
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    this.ensureLayers();
    this.ensureAvatars();
    const p = this.api.player;
    switch (head) {
      case 'savor-form': {
        const s = this.sides.npc;
        const to: SavorForm = n(1) === 1 ? 'salt' : 'sugar';
        if (s.form !== to) { s.form = to; s.aiming = null; s.shieldOn = false; if (this.alive(this.api.npc)) this.nfx.shift(this.api.npc.x, this.api.npc.y, to); }
        break;
      }
      case 'savor-stacks':
        this.sides.npc.stacks = { cinnamon: n(1), mint: n(2), lemon: n(3), punch: n(4) };
        break;
      case 'savor-candies': {
        const KIND_CODE: CandyKind[] = ['cinnamon', 'mint', 'lemon', 'punch', 'licorice', 'rainbow'];
        for (const chunk of (parts[1] ?? '').split(';')) {
          const v = chunk.split(',').map(Number);
          if (v.length < 5 || v.some((x) => !Number.isFinite(x))) continue;
          this.dropCandy('npc', KIND_CODE[v[0]] ?? 'cinnamon', this.mx(v[3]), v[4], this.mx(v[1]), v[2]);
        }
        break;
      }
      case 'savor-eat': {
        const x = this.mx(n(1));
        const y = n(2);
        const c = this.candies.find((k) => k.owner === 'npc' && Phaser.Math.Distance.Between(k.x, k.y, x, y) < 12);
        if (c) { this.candies.splice(this.candies.indexOf(c), 1); this.nfx.pickup(c.x, c.y, c.kind); }
        const cr = this.crystals.find((k) => k.owner === 'npc' && Phaser.Math.Distance.Between(k.x, k.y, x, y) < 12);
        if (cr) { this.crystals.splice(this.crystals.indexOf(cr), 1); this.nfx.shatter(cr.x, cr.y, -Math.PI / 2, true); }
        break;
      }
      case 'savor-crystal':
        this.crystals.push({
          owner: 'npc', x: this.mx(n(1)), y: n(2), until: this.now + CRYSTAL_MS,
          coat: { cinnamon: n(3), mint: n(4), lemon: n(5), punch: n(6) },
        });
        break;
      case 'savor-fire': {
        const s = this.sides.npc;
        s.aiming = null;
        this.npcAvatar?.setHold(null);
        const ang = n(3) / 1000;
        this.launchSpike('npc', this.mx(n(1)) + Math.cos(ang) * 26, n(2) + Math.sin(ang) * 26, ang, n(4), true);
        break;
      }
      case 'savor-loan':
        if (this.alive(p)) this.share('npc', p, { cinnamon: n(1), mint: n(2), lemon: n(3), punch: n(4) });
        break;
      case 'savor-cube':
        if (this.alive(p)) {
          const d = this.drained.get(p) ?? { owner: 'npc' as Owner, cubes: 0, slowUntil: 0, lastId: '', lastAt: 0, repeats: 0 };
          d.cubes = Math.min(MAX_CUBES, Math.max(d.cubes, n(1)));
          this.drained.set(p, d);
          this.nfx.drain(p.x, p.y, this.api.npc.x, this.api.npc.y - 40);
          this.api.showFloatingText(p.x, p.y - 34, `🧊 BLOOD SUGAR ×${d.cubes}`, '#ffffff');
        }
        break;
      case 'savor-drain':
        if (this.alive(p)) {
          const labels = this.api.drainBars('player');
          if (labels.length) this.api.showFloatingText(p.x, p.y - 40, labels.join(' '), '#ffb8d4');
        }
        break;
      case 'savor-score':
        if (this.race && this.race.owner === 'player') this.race.remoteScore = n(1);
        break;
      case 'savor-result':
        if (this.race && this.race.owner === 'npc') {
          if (n(1) === 1) this.sides.npc.saltedUntil = this.now + SALTED_MS;
          const f = this.api.npc;
          if (this.alive(f)) this.api.showFloatingText(f.x, f.y - 44, n(1) === 1 ? '🧂 SALTED!' : 'OUT-PRESSED', n(1) === 1 ? '#ffffff' : '#9aa6b2');
          if (this.alive(p)) p.disarmedUntil = Math.min(p.disarmedUntil, Date.now());
          this.race = null;
        }
        break;
      default:
        break;
    }
  }

  /** Our stacks travel whenever they change, so the other machine prices our hits right. */
  private syncStacks(): void {
    if (!this.isSavor('player') || !this.api.isOnline || this.api.isInvasion) return;
    const s = this.sides.player;
    const key = `${s.stacks.cinnamon}:${s.stacks.mint}:${s.stacks.lemon}:${s.stacks.punch}`;
    if (key === s.sentStacks) return;
    s.sentStacks = key;
    this.api.broadcast(`savor-stacks:${key}`);
  }

  /** Memory's Rebirth (and Sugar Diffusion's own drain) takes a stack off the biggest pile. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner).stacks;
    let best: BuffKind | null = null;
    for (const k of BUFF_KINDS) if (s[k] > 0 && (!best || s[k] > s[best])) best = k;
    if (!best) return null;
    s[best]--;
    return `−${BUFF_NAME[best].toUpperCase()}`;
  }

  // ── The generic fields ─────────────────────────────────────────────────────

  private outMult(f: Fighter): number {
    const c = this.eff(f, 'cinnamon');
    const m = c >= 0 ? 1 + CINNAMON_PER * c : 1 / (1 + CINNAMON_PER * -c);
    return m * this.repetitionMult(f);
  }

  private pushFields(): void {
    for (const f of this.allFighters()) {
      if (!f || !f.active) continue;
      const own = this.ownerOf(f);
      const savorBody = !!own && this.isSavor(own);
      const relevant = savorBody || this.loans.has(f) || this.drained.has(f) || this.touched.has(f)
        || this.opponentsOf(f).some((o) => this.loans.has(o) || this.drained.has(o) || (this.ownerOf(o) && this.isSavor(this.ownerOf(o) as Owner)));
      if (!relevant) continue;
      this.touched.add(f);
      let incoming = 1;
      for (const o of this.opponentsOf(f)) if (o && o.active) incoming *= this.outMult(o);
      f.savorIncomingMult = incoming;
      if (this.isReplicaBody(f)) {
        // Its own armour and dodge live on its own machine (armour travels back in `dm`).
        f.savorArmorMult = 1;
        f.savorDodge = 0;
        f.savorCooldownMult = 1;
        continue;
      }
      const mint = this.eff(f, 'mint');
      f.savorArmorMult = mint >= 0 ? 1 / (1 + MINT_PER * mint) : 1 + MINT_PER * -mint;
      let fumble = 0;
      for (const o of this.opponentsOf(f)) if (o && o.active) fumble += Math.max(0, -this.eff(o, 'punch'));
      f.savorDodge = Phaser.Math.Clamp(PUNCH_PER * (Math.max(0, this.eff(f, 'punch')) + fumble), 0, PUNCH_CAP);
      f.savorCooldownMult = own && this.isSavor(own) && this.salted(own)
        ? Math.max(SALTED_FLOOR, 1 - SALTED_PER_STACK * this.totalStacks(own)) : 1;
    }
  }

  /** Everything this element does to one body's movement, folded into a single factor. */
  private speedMultFor(f: Fighter | null | undefined): number {
    if (!f) return 1;
    if (this.isReplicaBody(f)) return 1;
    if (this.lifted(f)) return 0;
    let m = 1;
    const own = this.ownerOf(f);
    if (own && this.isSavor(own)) {
      if (this.diffusing(own)) m *= DIFFUSION_SPEED;
      if (this.rushing(own)) m *= RUSH_SPEED;
    }
    const lemon = this.eff(f, 'lemon');
    m *= lemon >= 0 ? 1 + LEMON_PER * lemon : Math.max(0.4, 1 - LEMON_PER * -lemon);
    const d = this.drained.get(f);
    if (d) {
      m *= Math.max(0.5, 1 - CUBE_SLOW * d.cubes);
      if (this.now < d.slowUntil) m *= POSTCAST_SLOW;
    }
    return m;
  }

  private pushWalkSpeeds(): void {
    const duelists = [this.api.player, this.api.npc];
    for (const f of this.allFighters()) {
      if (!f || duelists.includes(f)) continue;
      const m = this.speedMultFor(f);
      if (Math.abs(m - 1) > 0.001) {
        f.walkSpeedMult = m;
        this.touchedWalk.add(f);
      } else if (this.touchedWalk.has(f)) {
        f.walkSpeedMult = 1;
        this.touchedWalk.delete(f);
      }
    }
  }

  // ── The bot ────────────────────────────────────────────────────────────────

  private ready(f: Fighter, id: string): boolean {
    return f.getCooldownRatio(id) >= 1;
  }

  /**
   * The bot has no Space for a form change, so the kit flips it: towards Salt when a loan is
   * live on the target (the stalactite will come out coated) or there is a wound worth salting,
   * and otherwise towards whichever row has more ready.
   */
  private npcThink(): void {
    if (!this.isSavor('npc') || !this.simulates('npc') || this.race) return;
    const f = this.api.npc;
    if (!this.alive(f) || this.now < this.npcThinkAt) return;
    this.npcThinkAt = this.now + 380;
    const s = this.sides.npc;
    if (this.now - s.lastShiftAt < NPC_SHIFT_GAP_MS || s.aiming) return;
    const readyCount = (ids: string[]) => ids.slice(1, 4).filter((id) => this.ready(f, id)).length;
    let want: SavorForm = s.form;
    if (this.npcLoanLive() && this.ready(f, 'savor-salt-infusion')) want = 'salt';
    else if (this.npcWound() >= 20 && this.ready(f, 'savor-salt-wounds')) want = 'salt';
    else if (this.diffusing('npc') || this.rushing('npc')) want = 'sugar';
    else {
      const sugar = readyCount(SUGAR_IDS);
      const salt = readyCount(SALT_IDS);
      if (s.form === 'sugar' && sugar === 0 && salt > 0) want = 'salt';
      else if (s.form === 'salt' && salt === 0 && sugar > 0) want = 'sugar';
    }
    if (want === s.form) return;
    // The shift is a dodge, so it moves: a short dash across the target's line.
    const t = this.api.player;
    const a = this.alive(t) ? Math.atan2(t.y - f.y, t.x - f.x) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 : Math.random() * TAU;
    s.dashUntil = this.now + NPC_DASH_MS;
    s.dashVx = Math.cos(a) * NPC_DASH_SPEED;
    s.dashVy = Math.sin(a) * NPC_DASH_SPEED;
    this.shift('npc', want);
  }

  /** The bot's body, where the kit has a reason to drive it: a dash, a loop, a candy. */
  private npcSteer(): void {
    if (!this.isSavor('npc') || !this.simulates('npc')) return;
    const f = this.api.npc;
    if (!this.alive(f) || this.lifted(f)) return;
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const s = this.sides.npc;
    if (this.now < s.dashUntil) { body.setVelocity(s.dashVx, s.dashVy); return; }
    const t = this.api.player;
    const speed = Math.max(140, Math.hypot(body.velocity.x, body.velocity.y));
    // Sugar Diffusion: circle the target, tight enough to finish the loop.
    if (this.diffusing('npc') && this.alive(t) && !this.api.isInvasion) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      const ang = Math.atan2(f.y - t.y, f.x - t.x);
      const radial = Phaser.Math.Clamp((d - 140) / 80, -1, 1);
      const vx = -Math.sin(ang) * speed - Math.cos(ang) * radial * speed * 0.6;
      const vy = Math.cos(ang) * speed - Math.sin(ang) * radial * speed * 0.6;
      body.setVelocity(vx, vy);
      return;
    }
    // A good sweet within reach, and nobody on top of us: go and eat it. Never licorice.
    const c = this.npcCandyTarget();
    if (c) {
      const a = Math.atan2(c.y - f.y, c.x - f.x);
      body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    }
  }

  private npcCandyTarget(): { x: number; y: number } | null {
    const f = this.api.npc;
    const t = this.api.player;
    if (!this.alive(f)) return null;
    if (this.alive(t) && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 110) return null;
    let best: { x: number; y: number } | null = null;
    let bestD = NPC_CANDY_SEEK_R;
    for (const c of this.candies) {
      if (c.owner !== 'npc' || c.kind === 'licorice' || this.now < c.landAt) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    for (const c of this.crystals) {
      if (c.owner !== 'npc') continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y);
      if (d < bestD * 1.5) { bestD = d; best = c; }
    }
    return best;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isSavor('player');
    const npcIs = this.isSavor('npc');
    const anyState = this.bombs.length || this.grains.length || this.clouds.length || this.candies.length
      || this.chocos.length || this.slices.length || this.spikes.length || this.crystals.length
      || this.loans.size || this.drained.size || this.race || this.touched.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.ensureListeners();
    this.vizT += delta / 1000;

    if (playerIs && this.hudForm !== this.sides.player.form) {
      this.hudForm = this.sides.player.form;
      this.api.setHudForm(this.hudForm);
    }
    if (npcIs && this.simulates('npc')) {
      const t = this.api.player;
      if (this.alive(t)) { this.sides.npc.aimX = t.x; this.sides.npc.aimY = t.y; }
    }

    this.updateBombs(delta);
    this.updateSugarHazards();
    this.updateCandies();
    this.updateDiffusion();
    this.updateChocos(delta);
    this.updateLoans();
    this.updateSlices(delta);
    this.updateShields(delta);
    this.updateAiming();
    this.updateSpikes(delta);
    this.updateRace(delta);
    this.npcThink();
    this.npcSteer();
    this.pushFields();
    this.pushWalkSpeeds();
    this.syncStacks();
    this.updateAvatars(delta);
    this.updateCamera(delta, playerIs);

    this.paintGround();
    this.paintAir();
    this.paintHud();
    this.pushStatuses(playerIs);
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      const f = this.fighter(owner);
      if (!av) continue;
      if (!this.isSavor(owner) || !f?.active) {
        av.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        continue;
      }
      const s = this.side(owner);
      const sav = this.savorAvatar(owner);
      if (sav) {
        sav.setForm(s.form);
        sav.setCubes(this.cubesOver(owner));
        sav.setShield(s.shieldOn ? Math.min(1, f.shieldHp / SHIELD_CAP) : 0);
        sav.setRush(this.rushing(owner) ? 1 : 0);
      }
      const t = owner === 'player' ? null : this.api.player;
      const ang = owner === 'player' ? Math.atan2(s.aimY - f.y, s.aimX - f.x)
        : t ? Math.atan2(t.y - f.y, t.x - f.x) : 0;
      av.setFacing(ang);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  /** Sugar Rush pulls the camera back a touch (the "high FOV"), as a ratio on whatever else has it. */
  private updateCamera(delta: number, playerIs: boolean): void {
    const cam = this.api.scene.cameras.main;
    if (!cam) return;
    if (this.camRef !== cam) { this.camRef = cam; this.camZoomF = 1; }
    const goal = playerIs && this.rushing('player') ? RUSH_ZOOM : 1;
    if (this.camZoomF === goal) return;
    const k = 1 - Math.exp(-(delta / 1000) * 5);
    let zf = this.camZoomF + (goal - this.camZoomF) * k;
    if (Math.abs(goal - zf) < 0.002) zf = goal;
    cam.setZoom((cam.zoom / this.camZoomF) * zf);
    this.camZoomF = zf;
    this.api.scene.input.activePointer.updateWorldPoint(cam);
  }

  private restoreCamera(): void {
    const cam = this.api.scene.cameras?.main;
    if (cam && cam === this.camRef && this.camZoomF !== 1) cam.setZoom(cam.zoom / this.camZoomF);
    this.camZoomF = 1;
    this.camRef = null;
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const now = this.now;
    for (const gr of this.grains) {
      const life = Math.min(1, (gr.until - now) / 600);
      sugarGrain(g, this.col(gr.owner), gr.x, gr.y, 4, life * 0.9, this.vizT + gr.x * 0.01);
    }
    for (const c of this.clouds) {
      const life = Math.min(1, (c.until - now) / 500);
      sugarCloud(g, this.col(c.owner), c.x, c.y, CLOUD_R * 0.85, this.vizT, life * 0.75, c.seed);
    }
    for (const c of this.candies) {
      const tint = this.col(c.owner);
      if (now < c.landAt) continue;
      const blink = c.until - now < 2500 ? (Math.floor(now / 120) % 2 ? 0.45 : 1) : 1;
      const bob = Math.sin(this.vizT * 3 + c.seed) * 1.5;
      candy(g, tint, c.x, c.y + bob, c.kind, 1, this.vizT, blink, Math.sin(c.seed) * 0.4);
    }
    for (const cr of this.crystals) {
      const tint = this.col(cr.owner);
      const cols = BUFF_KINDS.filter((k) => cr.coat[k]).map((k) => CANDY_COLOR[k]);
      const blink = cr.until - now < 2500 ? (Math.floor(now / 120) % 2 ? 0.45 : 1) : 1;
      g.fillStyle(tint(SAVOR.ink), 0.3 * blink);
      g.fillEllipse(cr.x, cr.y + 8, 26, 7);
      saltShard(g, tint, cr.x, cr.y, -Math.PI / 2 + 0.3, 26, 7, blink, cols);
    }
    // Salt Crash: spears under everyone held up on them.
    const r = this.race;
    if (r) {
      const tint = this.col(r.owner);
      for (const v of r.victims) {
        if (!this.alive(v)) continue;
        for (let i = 0; i < 3; i++) saltSpear(g, tint, v.x + (i - 1) * 12, v.y + 22, 34 + (i === 1 ? 10 : 0), 1, 0.95, (1 - i) * 0.08);
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const now = this.now;
    for (const b of this.bombs) {
      const k = Math.min(1, b.t / b.dur);
      const x = b.sx + (b.tx - b.sx) * k;
      const y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 60;
      g.fillStyle(SAVOR.ink, 0.25);
      g.fillEllipse(b.sx + (b.tx - b.sx) * k, b.sy + (b.ty - b.sy) * k + 6, 16, 5);
      sugarBomb(g, this.col(b.owner), x, y, 9, this.vizT, 1);
    }
    for (const c of this.candies) {
      if (now >= c.landAt) continue;
      const k = 1 - (c.landAt - now) / CANDY_FLIGHT_MS;
      const x = c.fromX + (c.x - c.fromX) * k;
      const y = c.fromY + (c.y - c.fromY) * k - Math.sin(k * Math.PI) * 40;
      candy(g, this.col(c.owner), x, y, c.kind, 1, this.vizT, 1, k * 8);
    }
    for (const c of this.chocos) chocoBall(g, this.col(c.owner), c.x, c.y, 11, this.vizT, 1);
    for (const s of this.slices) saltShard(g, this.col(s.owner), s.x, s.y, Math.atan2(s.vy, s.vx), 22, 4.5, 1);
    for (const s of this.spikes) {
      const cols = BUFF_KINDS.filter((k) => s.coat[k]).map((k) => CANDY_COLOR[k]);
      saltShard(g, this.col(s.owner), s.x, s.y, Math.atan2(s.vy, s.vx), 44, 9, 1, cols);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      // The stalactite hanging in front of the salt user, and the timing bar underneath.
      if (s.aiming) {
        const grow = Math.min(1, (now - s.aiming.startedAt) / 300);
        const a = s.aiming.ang;
        saltShard(g, tint, f.x + Math.cos(a) * 34, f.y + Math.sin(a) * 34, a, 44 * grow, 9 * grow, 1);
        timingBar(g, tint, f.x, f.y + 38, 84, this.barK(owner), 1, GREEN_HALF, YELLOW_HALF);
      }
      // Diffusion: a sweet haze streaming off the body.
      if (this.diffusing(owner)) {
        for (let i = 0; i < 5; i++) {
          const ph = (this.vizT * 2 + i * 0.2) % 1;
          sugarGrain(g, tint, f.x - Math.cos(this.vizT * 3 + i) * 20 * ph, f.y + 10 - ph * 18, 3 * (1 - ph) + 0.5, 1 - ph, this.vizT);
        }
      }
    }
    // Borrowed buffs on whoever wears them: a golden ring, then a grey drip while they crash.
    for (const [f, l] of this.loans) {
      if (!this.alive(f)) continue;
      const tint = this.col(l.owner);
      if (now < l.until) {
        g.lineStyle(2, tint(SAVOR.lemon), 0.5 + 0.3 * Math.sin(this.vizT * 8));
        g.strokeCircle(f.x, f.y, 28);
        for (let i = 0; i < 4; i++) {
          const a = this.vizT * 2 + (i / 4) * TAU;
          candy(g, tint, f.x + Math.cos(a) * 30, f.y + Math.sin(a) * 30 - 6, BUFF_KINDS[i], 0.55, this.vizT, 0.9);
        }
      } else {
        g.fillStyle(tint(SAVOR.saltDark), 0.5);
        for (let i = 0; i < 3; i++) {
          const ph = (this.vizT * 0.8 + i / 3) % 1;
          g.fillCircle(f.x + (i - 1) * 10, f.y + 10 + ph * 16, 2.4 * (1 - ph) + 0.6);
        }
        g.lineStyle(1.5, tint(SAVOR.licoriceHi), 0.6);
        g.strokeEllipse(f.x, f.y + 22, 34, 8);
      }
    }
    // Drained bodies: a wilting sugar-grey halo.
    for (const [f, d] of this.drained) {
      if (!this.alive(f) || this.ownerOf(f) === d.owner) continue;
      const tint = this.col(d.owner);
      g.lineStyle(1.5, tint(SAVOR.sugarRim), 0.35 + (now < d.slowUntil ? 0.4 : 0));
      g.strokeCircle(f.x, f.y, 26 + Math.sin(this.vizT * 2) * 1.5);
    }
  }

  /** Fixed-to-screen layers: the Rush wash, and the Salt Crash race's crystals and score. */
  private paintHud(): void {
    const sg = this.screenGfx;
    if (sg) {
      sg.clear();
      if (this.isSavor('player') && this.rushing('player')) {
        const left = this.sides.player.rushUntil - this.now;
        const k = Math.min(1, left / 600, (RUSH_MS - left) / 300);
        rushScreen(sg, this.pcol, this.api.width, this.api.height, this.vizT, Math.max(0, k));
      }
    }
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    const r = this.race;
    if (!r || !r.localSide || r.resolved || this.now >= r.until) return;
    const tint = this.col(r.owner);
    g.fillStyle(SAVOR.ink, 0.25);
    g.fillRect(0, 0, this.api.width, this.api.height);
    for (const t of r.targets) crashCrystal(g, tint, t.x, t.y, 20, this.vizT + t.born, 1);
    // The tug-of-war bar: caster's presses against the enemy's.
    const W = this.api.width;
    const total = Math.max(1, r.casterScore + r.enemyScore);
    const k = r.casterScore / total;
    const bw = 300;
    const bx = W / 2 - bw / 2;
    g.fillStyle(SAVOR.ink, 0.85);
    g.fillRoundedRect(bx - 4, 64, bw + 8, 22, 6);
    g.fillStyle(SAVOR.salt, 1);
    g.fillRect(bx, 68, bw * k, 14);
    g.fillStyle(SAVOR.zoneRed, 1);
    g.fillRect(bx + bw * k, 68, bw * (1 - k), 14);
    const left = (r.until - this.now) / RACE_MS;
    g.fillStyle(SAVOR.white, 0.9);
    g.fillRect(bx, 90, bw * left, 3);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;
    this.api.setStatusIndicator('savor-form', playerIs ? {
      name: s.form === 'sugar' ? 'Sugar' : 'Salt', emoji: s.form === 'sugar' ? '🍬' : '🧂',
      color: s.form === 'sugar' ? SAVOR.punch : SAVOR.salt, priority: 140,
      description: s.form === 'sugar'
        ? 'Sugar form: candy bombs, sweets, the sugar loop and the chocolate loan. Dodge (Space) to turn to Salt.'
        : 'Salt form: shards, the crust, the stalactite and the stinging cone. Dodge (Space) to turn back to Sugar.',
    } : null);

    const st = s.stacks;
    const total = st.cinnamon + st.mint + st.lemon + st.punch;
    const dbl = this.rushing('player') ? 2 : 1;
    this.api.setStatusIndicator('savor-candy', playerIs && total > 0 ? {
      name: 'Candy Buffs', emoji: '🍭', color: SAVOR.punchLit, priority: 141,
      description: `Permanent for the match${dbl > 1 ? ' — doubled by Sugar Rush' : ''}. Cinnamon ×${st.cinnamon} (+${Math.round(st.cinnamon * dbl * CINNAMON_PER * 100)}% damage), Mint ×${st.mint} (resistance), Lemon ×${st.lemon} (+${Math.round(st.lemon * dbl * LEMON_PER * 100)}% speed), Fruit Punch ×${st.punch} (${Math.round(Math.min(PUNCH_CAP, st.punch * dbl * PUNCH_PER) * 100)}% dodge).`,
      count: total,
    } : null);

    this.api.setStatusIndicator('savor-rush', playerIs && this.rushing('player') ? {
      name: 'Sugar Rush!', emoji: '🌈', color: SAVOR.violet, priority: 130,
      description: 'Triple speed, and every candy buff counts double.', until: s.rushUntil,
    } : null);
    this.api.setStatusIndicator('savor-diffusion', playerIs && this.diffusing('player') ? {
      name: 'Sugar Diffusion', emoji: '🌀', color: SAVOR.sparkle, priority: 131,
      description: `+50% speed. Loop all the way round an enemy to drain a sugar cube out of them. Enemies within ${ORBIT_R}px have their bars drained as it lasts.`,
      until: s.diffusionUntil,
    } : null);
    this.api.setStatusIndicator('savor-shield', playerIs && s.shieldOn ? {
      name: 'Salt Shield', emoji: '🧂', color: SAVOR.salt, priority: 132,
      description: `Salt crusting over you, 2/s rising to 5/s. Stops at ${SHIELD_CAP} shield, or if the shield is knocked to nothing.`,
      count: Math.round(p?.shieldHp ?? 0), suffix: `/${SHIELD_CAP}`,
    } : null);
    this.api.setStatusIndicator('savor-salted', playerIs && this.salted('player') ? {
      name: 'Salted', emoji: '✨', color: SAVOR.saltEdge, priority: 133,
      description: `You won the Salt Crash: every candy stack also cuts your cooldowns by ${SALTED_PER_STACK * 100}% (down to half).`,
      until: s.saltedUntil,
    } : null);

    // Victim side.
    const loan = p ? this.loans.get(p) : undefined;
    const fromOther = loan && loan.owner === 'npc';
    this.api.setStatusIndicator('savor-loan', fromOther && this.now < loan.until ? {
      name: 'Sugar High', emoji: '🍫', color: SAVOR.lemon, priority: 5,
      description: 'Borrowed candy buffs from a chocolate ball. Enjoy them — the crash comes next.', until: loan.until,
    } : null);
    this.api.setStatusIndicator('savor-crash', fromOther && this.now >= loan.until ? {
      name: 'Sugar Crash', emoji: '💤', color: SAVOR.saltDark, priority: 3,
      description: 'Every buff you borrowed is now a penalty of the same size.', until: loan.crashUntil,
    } : null);
    const dr = p ? this.drained.get(p) : undefined;
    this.api.setStatusIndicator('savor-drained', dr && dr.owner === 'npc' ? {
      name: 'Low Blood Sugar', emoji: '🧊', color: SAVOR.sugarRim, priority: 4,
      description: `Drained ×${dr.cubes}: ${Math.round(CUBE_SLOW * dr.cubes * 100)}% slower for the match. After every ability you are sluggish and cannot dodge for a moment, and repeating the same attack makes it weaker.`,
      count: dr.cubes,
    } : null);
    const r = this.race;
    this.api.setStatusIndicator('savor-lifted', r && r.owner === 'npc' && p && r.victims.includes(p) ? {
      name: 'Salt Crash', emoji: '🧂', color: SAVOR.salt, priority: 1,
      description: 'Held up on salt spears. Press the crystals faster than they do — lose and you take 40 more.', until: r.until,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player); }
  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc); }

  /** The bot's current row. */
  npcForm(): SavorForm { return this.sides.npc.form; }

  /** A stalactite is hanging; the kit releases it, so the bot must not press R again. */
  npcAiming(): boolean { return !!this.sides.npc.aiming; }

  /** The race is on: nothing to press. */
  npcRacing(): boolean { return !!this.race; }

  /** Synergy: the target is wearing a Caring Share loan — a stalactite through them now comes out coated. */
  npcLoanLive(): boolean {
    const t = this.api.player;
    const l = t ? this.loans.get(t) : undefined;
    return !!l && l.owner === 'npc' && this.now < l.until - 400 && BUFF_KINDS.some((k) => l.stacks[k] > 0);
  }

  /** Synergy: what Salt in the Wounds would deal the target right now. */
  npcWound(): number {
    const t = this.api.player;
    return this.alive(t) ? this.woundOf(t) : 0;
  }

  /** Total candy stacks the bot holds — Sugar Rush and Caring Share are worth more with plenty. */
  npcStacks(): number { return this.totalStacks('npc'); }

  /** Sweets of the bot's own lying about, still worth eating. */
  npcCandiesOut(): number {
    return this.candies.filter((c) => c.owner === 'npc' && c.kind !== 'licorice').length;
  }

  /** The target has a full cube count already — another loop buys nothing. */
  npcTargetDrained(): boolean {
    const t = this.api.player;
    return !!t && (this.drained.get(t)?.cubes ?? 0) >= MAX_CUBES;
  }
}
