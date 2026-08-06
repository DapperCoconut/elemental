import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { NetTechMsg } from '../../network/NetworkManager';
import { CustomStatus } from './StatusHudKit';
import {
  ArmGesture, TECH, TechAuraStyle, TechColorFn, TechnologyAura, TechnologyAvatar, TechnologyFx,
  bitTileLayered, windowPane,
} from './TechnologyVisuals';

type Owner = 'player' | 'npc';
const OWNERS: Owner[] = ['player', 'npc'];
const opposite = (o: Owner): Owner => (o === 'player' ? 'npc' : 'player');

// ── Addicting Cruncher (Click) ──────────────────────────────────────────────
const CRUNCHER_BASE_COOLDOWN = 500;
const CRUNCHER_MIN_COOLDOWN = 150;
const CRUNCHER_BASE_DAMAGE = 7.5;
const CRUNCHER_BASE_SPEED = 420;
const CRUNCHER_HIT_RADIUS = 26;
const CRUNCHER_MAX_RANGE = 900;
const CRUNCHER_TRAIL_INTERVAL_MS = 55;

// Adrenaline perk: the hit streak doses you instead of only tuning the shot.
const ADRENALINE_MAX_STACKS = 5;
const ADRENALINE_SPEED_PER_STACK = 0.10;
const ADRENALINE_WINDOW_MS = 5000;
/** At a full dose the click stops waiting on you at all. */
const ADRENALINE_WIRED_CD_MULT = 0.5;

// ── Firewall (Click+) ───────────────────────────────────────────────────────
const FIREWALL_CHARGES = 3;
const FIREWALL_REGEN_MS = 20000;

// ── Overt Advertisement (E) ──────────────────────────────────────────────────
const ADS_COUNT = 12;
const ADS_LIFETIME_MS = 3000;
const ADS_W = 138;
const ADS_H = 96;
const ADS_SHELTER_DMG_MULT = 0.75;
const VIRUS_DURATION_MS = 5000;
const VIRUS_TICK_MS = 1000;
const VIRUS_BASE_DMG = 3;

// ── Palware (E+) ────────────────────────────────────────────────────────────
const MALWARE_LIFETIME_MS = 20000;
const MALWARE_COOLDOWN_MS = 20000;
const MALWARE_KINDS = ['goose', 'clippy', 'pong'] as const;
type MalwareKind = (typeof MALWARE_KINDS)[number];
const GOOSE_POKE_DMG = 12;
const GOOSE_WANDER_SPEED = 130;
const GOOSE_CHASE_SPEED = 190;
const GOOSE_STEAL_SCAN_RADIUS = 260;
const CLIPPY_QUIZ_INTERVAL_MS = 8000;
const CLIPPY_QUIZ_TIME_MS = 5000;
const CLIPPY_FAIL_DMG = 20;
const CLIPPY_AI_PASS_CHANCE = 0.75;
const PONG_DMG = 10;
const PONG_SPEED = 260;
const PONG_SPLIT_MS = 5000;
const PONG_MAX_BALLS = 16;
const PONG_HIT_CD_MS = 800;

// ── Upload (R) ────────────────────────────────────────────────────────────
const UPLOAD_SPEED = 620;
const UPLOAD_BOX_DURATION_MS = 6000;
const UPLOAD_PARK_DURATION_MS = 5000;
const UPLOAD_HIT_RADIUS = 22;

// ── Web Drag (F) ──────────────────────────────────────────────────────────
const WEBDRAG_DURATION_MS = 6000;
const WEBDRAG_GRAB_RADIUS = 42;

// ── Surf the web! (F+) ────────────────────────────────────────────────────
const SURF_POPUP_LIFETIME_MS = 6000;
const BROWSER_W = 470;
const BROWSER_H = 340;
const COIN_DMG = 1;
const COIN_SPEED = 330;
const BAGEL_COST = 10;
const MOUSE_COST = 20;
const FACTORY_COST = 35;
const WHEEL_SPIN_COST = 5;

// ── Admin Console (Q) ─────────────────────────────────────────────────────
const ADMIN_WINDOW_MS = 8000;
const ADMIN_STRING_LEN = 6;
const ADMIN_TIERS = [5, 10, 20, 35, 50] as const;

// ── Security Breach (Q+) ──────────────────────────────────────────────────
const BREACH_POINTS = 5;
const BREACH_TEXTS = ['Git Haxxed!', 'H4X0R3D', '0wn3d', 'sudo rm -rf you', 'pwned by admin', '1337'];

// ── Technology Mastery — VPN (passive) ────────────────────────────────────
/** Continuous movement time needed to reach the full speed boost. */
const VPN_RAMP_MS = 5000;
const VPN_MAX_BONUS = 0.5;
/** Per-frame distance under which the player counts as standing still. */
const VPN_MOVE_EPSILON = 0.35;
const VPN_TRAIL_MAX_MS = 120;
const VPN_TRAIL_MIN_MS = 34;

// ── Technology Mastery — Byte-Bomb (bindable) ─────────────────────────────
const BYTE_BOMB_COOLDOWN_MS = 15000;
const BYTE_BOMB_FUSE_MS = 8000;
const BYTE_BOMB_CLICK_CUT_MS = 500;
const BYTE_BOMB_TRAVEL_SPEED = 780;
const BYTE_BOMB_RADIUS = 26;
const BYTE_BOMB_BLAST_RADIUS = 120;
const BYTE_BOMB_DAMAGE = 10;

// ── Lag (Byte-Bomb debuff) ────────────────────────────────────────────────
const LAG_DURATION_MS = 10000;
/** How far back in time a rubber-band snaps you. */
const LAG_REWIND_MS = 1000;
const LAG_HISTORY_SAMPLE_MS = 100;
const LAG_FREEZE_MS = 1000;
const LAG_EVENT_MIN_GAP_MS = 1600;
const LAG_EVENT_MAX_GAP_MS = 2600;

function randomBinaryString(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.random() < 0.5 ? '0' : '1';
  return s;
}

interface CordState {
  owner: Owner;
  state: 'traveling' | 'parked';
  x: number; y: number; vx: number; vy: number;
  parkX: number; parkY: number;
  expiresAt: number;
}

interface AdBox {
  owner: Owner;
  x: number; y: number; w: number; h: number;
  bornAt: number;
  expiresAt: number;
}

interface JailBox {
  x: number; y: number; w: number; h: number;
  lastDmgAt: number;
  expiresAt: number;
}

interface AdminState {
  active: boolean;
  endAt: number;
  points: number;
  target: string;
  cursor: number;
  box: Phaser.GameObjects.Rectangle | null;
  text: Phaser.GameObjects.Text | null;
  keyListener: ((e: KeyboardEvent) => void) | null;
  nextTypeAt: number;
  typeRate: number;
}

function freshAdminState(): AdminState {
  return {
    active: false, endAt: 0, points: 0, target: '', cursor: 0,
    box: null, text: null, keyListener: null, nextTypeAt: 0, typeRate: 350,
  };
}

type DragGrab = { kind: 'fighter'; ref: Fighter } | { kind: 'cord'; ref: CordState } | { kind: 'ad'; ref: AdBox };

// ── Palware state ─────────────────────────────────────────────────────────

interface GooseState {
  kind: 'goose';
  facing: number;
  x: number; y: number;
  targetX: number; targetY: number;
  mode: 'wander' | 'poke' | 'carry' | 'steal' | 'throw';
  modeUntil: number;
  nextActionAt: number;
  carried: Fighter | null;
  stolenDamage: number;
  bulletIcon: Phaser.GameObjects.Text | null;
}

interface ClippyState {
  kind: 'clippy';
  objs: Phaser.GameObjects.GameObject[];
  qText: Phaser.GameObjects.Text;
  inputText: Phaser.GameObjects.Text;
  timerBar: Phaser.GameObjects.Rectangle;
  nextQuizAt: number;
  quiz: { answer: number; endsAt: number; input: string } | null;
  keyListener: ((e: KeyboardEvent) => void) | null;
}

interface PongBall {
  x: number; y: number; vx: number; vy: number;
  lastHitAt: Map<Fighter, number>;
}

interface PongState {
  kind: 'pong';
  balls: PongBall[];
  nextSplitAt: number;
}

type MalwareState = (GooseState | ClippyState | PongState) & { owner: Owner; expiresAt: number };

interface ThrownBullet {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  damage: number;
}

interface CoinProj {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  reg: RegisteredProjectile;
}

interface TrojanState {
  victim: Fighter;
  until: number;
  dir: { x: number; y: number };
}

interface BoxedHusk {
  f: Fighter;
  until: number;
}

interface HuskVirus {
  f: Fighter;
  until: number;
  nextTickAt: number;
}

// ── Technology Mastery state ──────────────────────────────────────────────

interface ByteBomb {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  /** Cursor point it is flying toward; once reached it parks and ticks down. */
  destX: number; destY: number;
  flying: boolean;
  /** Milliseconds left on the fuse. */
  fuse: number;
}

interface LagState {
  until: number;
  /** Recent positions, oldest first — the rubber-band rewind target comes from here. */
  history: Array<{ x: number; y: number; t: number }>;
  sampleAccum: number;
  nextEventAt: number;
  freezeUntil: number;
  cooldownFreezeUntil: number;
  spinner: Phaser.GameObjects.Graphics | null;
  spinnerAngle: number;
}

// ── TechArenaApi ──────────────────────────────────────────────────────────

export interface TechArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  /** Live enemies of the local player: [npc] in PvP, husks in invasion. */
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly isInvasion: boolean;
  readonly isOnline: boolean;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  /** ArenaScene's shared generic projectile physics group (steal targets for the goose). */
  readonly projGroup: Phaser.Physics.Arcade.Group;
  /** Shared registry of kit-local projectiles. */
  readonly projReg: ProjectileRegistry;
  hasUpgrade(owner: Owner, slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** Broadcast a tech event to the online peer. No-op offline. */
  sendTechMsg(msg: NetTechMsg): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is technology AND Technology Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Ratchet a "best single instance" mastery stat. */
  recordMasteryBest(key: string, value: number): void;
  /** Push a kit-owned effect into the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Owner's skin applied to one Technology palette value. */
  technologyColor(owner: Owner, base: number): number;
}

// ── TechnologyKit ─────────────────────────────────────────────────────────

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'tech-cruncher': 'punch',
  'tech-ads': 'sweep',
  'tech-upload': 'punch',
  'tech-webdrag': 'flex',
  'tech-admin': 'raise',
};

/** Depths for the kit's shared paint layers. */
const D_FLOOR = 6;    // grids, burn-ins, firewall border
const D_WORLD = 13;   // crunchers, cords, bombs, malware, coins
const D_UI = 19;      // popups and boxes that sit over the fighters

export class TechnologyKit {
  // ── Visuals ───────────────────────────────────────────────────────────────
  // One colour mapper and one effect painter per side, because the two fighters can have
  // different skins equipped.
  private readonly pcol: TechColorFn;
  private readonly ncol: TechColorFn;
  private readonly pfx: TechnologyFx;
  private readonly nfx: TechnologyFx;
  private playerAvatar: TechnologyAvatar | null = null;
  private npcAvatar: TechnologyAvatar | null = null;
  private auras = new Map<string, TechnologyAura>();
  /** Shared per-frame paint layers, one per depth band. Rebuilt lazily after a reset. */
  private layers = new Map<number, Phaser.GameObjects.Graphics>();

  // Addicting Cruncher
  private cruncherCd: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherDmg: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherSpeed: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherLastFireAt: Record<Owner, number> = { player: 0, npc: 0 };
  // Adrenaline perk
  private adrenalineStacks: Record<Owner, number> = { player: 0, npc: 0 };
  private adrenalineUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private adrenalineIndicatorShown = false;
  private crunchers: Array<{
    x: number; y: number; vx: number; vy: number;
    owner: Owner; damage: number; traveled: number; trailAccum: number;
    /** Gaming mouse (F+): an RGB cruncher cycles hue instead of wearing the element colour. */
    rgb: boolean;
    reg: RegisteredProjectile;
  }> = [];

  // Firewall (Click+)
  private firewallInited = false;
  private firewallCharges: Record<Owner, number> = { player: 0, npc: 0 };
  private firewallRegenAt: Record<Owner, number> = { player: 0, npc: 0 };
  private firewallObjs: Phaser.GameObjects.GameObject[] = [];
  private firewallShownCharges = -1;

  // Overt Advertisement
  private ads: AdBox[] = [];
  private virusUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private virusNextTickAt: Record<Owner, number> = { player: 0, npc: 0 };
  private huskViruses: HuskVirus[] = [];
  private wasSheltered: Record<Owner, boolean> = { player: false, npc: false };

  // Palware (E+)
  private malware: Record<Owner, MalwareState | null> = { player: null, npc: null };
  private malwareCdUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private thrownBullets: ThrownBullet[] = [];

  // Upload
  private cords: Record<Owner, CordState | null> = { player: null, npc: null };
  private boxedUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private boxedHusks: BoxedHusk[] = [];

  // Trojan Takeover (R+) — keyed by the CASTER owner
  private trojan: Record<Owner, TrojanState | null> = { player: null, npc: null };
  private arrowKeys: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key } | null = null;

  // Web Drag
  private dragActive: Record<Owner, boolean> = { player: false, npc: false };
  private dragExpiresAt: Record<Owner, number> = { player: 0, npc: 0 };
  private dragGrabbed: DragGrab | null = null;
  private dragCursorIcon: Phaser.GameObjects.Text | null = null;
  private dragPointerWasDown = false;

  // Surf the web! (F+) — caster-local UI, player only
  private surfPopupObjs: Phaser.GameObjects.GameObject[] = [];
  private surfPopupUntil = 0;
  private surfPopupBounds: { x: number; y: number; w: number; h: number } | null = null;
  private browserObjs: Phaser.GameObjects.GameObject[] = [];
  private browserContentObjs: Phaser.GameObjects.GameObject[] = [];
  private browserOpen = false;
  private browserCoins = 0;
  private browserFactory = false;
  private browserCoinAccum = 0;
  private browserCoinText: Phaser.GameObjects.Text | null = null;
  private wheelSpinning = false;
  private coinProjs: CoinProj[] = [];
  private gamingMouseStacks: Record<Owner, number> = { player: 0, npc: 0 };
  private dmgBuffUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wheelSpeedUntil = 0;

  // Admin Console
  private admin: Record<Owner, AdminState> = { player: freshAdminState(), npc: freshAdminState() };
  private adminInvisibleUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wasAdminInvisible: Record<Owner, boolean> = { player: false, npc: false };
  private jail: Record<Owner, JailBox | null> = { player: null, npc: null };
  private consoleLogTexts: Phaser.GameObjects.Text[] = [];

  // Security Breach (Q+)
  private breachTimes: Record<Owner, number[]> = { player: [], npc: [] };
  private adminJackpot: Record<Owner, boolean> = { player: false, npc: false };

  // Mastery requirement tracking
  private cruncherStreak = 0;

  // Technology Mastery — VPN (passive)
  private vpnRamp = 0;
  private vpnTrailAccum = 0;
  private vpnLastX = 0;
  private vpnLastY = 0;
  private vpnHasLastPos = false;
  private vpnIndicatorShown = false;

  // Technology Mastery — Byte-Bomb (bindable)
  // First match runs the constructor, not reset(), and readiness compares against the
  // absolute scene clock — so start fully off-cooldown rather than at 0.
  private byteBombLastCastAt = -BYTE_BOMB_COOLDOWN_MS;
  private byteBombs: ByteBomb[] = [];
  private byteBombPointerWasDown = false;

  // Lag (Byte-Bomb debuff)
  private lagged: Map<Fighter, LagState> = new Map();

  constructor(private arena: TechArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.technologyColor('player', base);
    this.ncol = (base) => arena.technologyColor('npc', base);
    this.pfx = new TechnologyFx(arena.scene, this.pcol);
    this.nfx = new TechnologyFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ────────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: Owner): TechnologyFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: Owner): TechColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Technology. */
  private avatarFor(owner: Owner): TechnologyAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: Owner, abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  /** A shared paint layer at one depth. Cleared and repainted every frame by paintWorld. */
  private layer(depth: number): Phaser.GameObjects.Graphics {
    let g = this.layers.get(depth);
    if (!g || !g.active) {
      g = this.arena.scene.add.graphics().setDepth(depth);
      this.layers.set(depth, g);
    }
    return g;
  }

  /**
   * A persistent aura on one fighter, keyed by id. Built on first use and torn down by
   * `dropAura` — a scene restart kills the Graphics, so both rebuild lazily.
   */
  private aura(id: string, style: TechAuraStyle, tint: TechColorFn, radius: number, depth: number): TechnologyAura {
    let a = this.auras.get(id);
    if (!a) {
      a = new TechnologyAura(this.arena.scene, tint, style, radius, depth);
      this.auras.set(id, a);
    }
    return a;
  }

  private dropAura(id: string): void {
    const a = this.auras.get(id);
    if (!a) return;
    a.destroy();
    this.auras.delete(id);
  }

  /** Destroy every GameObject the visuals own. Called from reset(); update() rebuilds. */
  private teardownVisuals(): void {
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of this.auras.values()) a.destroy();
    this.auras.clear();
    for (const g of this.layers.values()) g.destroy();
    this.layers.clear();
  }

  // ── Public accessors ──────────────────────────────────────────────────

  isPlayerSheltered(): boolean {
    if (this.browserOpen) return true;
    return this.ads.some((ad) => ad.owner === 'player' && this.rectContains(ad, this.arena.player.x, this.arena.player.y));
  }

  isNpcSheltered(): boolean {
    return this.ads.some((ad) => ad.owner === 'npc' && this.rectContains(ad, this.arena.npc.x, this.arena.npc.y));
  }

  isPlayerAdminInvisible(): boolean {
    return this.arena.scene.time.now < this.adminInvisibleUntil.player;
  }

  isNpcDragged(): boolean {
    return this.dragGrabbed?.kind === 'fighter' && this.dragGrabbed.ref === this.arena.npc;
  }

  /** Remote tech event from the online peer, routed via OnlineKit → ArenaScene. */
  handleNetMsg(msg: NetTechMsg): void {
    const now = this.arena.scene.time.now;
    switch (msg.k) {
      case 'malware':
        this.spawnMalware('npc', msg.kind);
        break;
      case 'steer': {
        const t = this.trojan.npc;
        if (t) t.dir = this.steerDir(msg.d);
        break;
      }
      case 'door':
        this.spawnCoinBurst('npc', this.arena.npc.x, this.arena.npc.y, msg.coins);
        break;
      case 'quiz': {
        const m = this.malware.player;
        if (m?.kind === 'clippy') {
          this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 40, msg.pass ? '📎 Quiz passed' : '📎 Quiz failed! -20', msg.pass ? '#aaaaff' : '#cc66ff');
        }
        break;
      }
      case 'mouse':
        this.gamingMouseStacks.npc = msg.stacks;
        break;
      case 'buff':
        this.dmgBuffUntil.npc = now + msg.ms;
        break;
      case 'jackpot':
        this.adminJackpot.npc = true;
        break;
      case 'bytefuse': {
        // The remote caster clicked their bomb — trim our replica's fuse to match.
        const bomb = this.byteBombs.find((b) => b.owner === 'npc');
        if (bomb) bomb.fuse = Math.max(0, bomb.fuse - BYTE_BOMB_CLICK_CUT_MS);
        break;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Live enemies of `owner`. Player-owned effects hit the npc/husks; npc-owned hit the player. */
  private enemiesOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.arena.enemies : [this.arena.player];
    return list.filter((f) => f.active && f.hp > 0);
  }

  private nearestEnemyOf(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const f of this.enemiesOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d < bestD) { best = f; bestD = d; }
    }
    return best;
  }

  private steerDir(d: 'up' | 'down' | 'left' | 'right'): { x: number; y: number } {
    switch (d) {
      case 'up': return { x: 0, y: -1 };
      case 'down': return { x: 0, y: 1 };
      case 'left': return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
    }
  }

  private rectContains(rect: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
    return x >= rect.x - rect.w / 2 && x <= rect.x + rect.w / 2 && y >= rect.y - rect.h / 2 && y <= rect.y + rect.h / 2;
  }

  // ── reset() ───────────────────────────────────────────────────────────

  reset(): void {
    for (const c of this.crunchers) this.arena.projReg.remove(c.reg);
    this.crunchers = [];
    this.teardownVisuals();
    this.cruncherCd = { player: 0, npc: 0 };
    this.cruncherDmg = { player: 0, npc: 0 };
    this.cruncherSpeed = { player: 0, npc: 0 };
    this.cruncherLastFireAt = { player: 0, npc: 0 };
    this.adrenalineStacks = { player: 0, npc: 0 };
    this.adrenalineUntil = { player: 0, npc: 0 };
    this.adrenalineIndicatorShown = false;
    this.arena.setStatusIndicator('adrenaline', null);

    this.firewallInited = false;
    this.firewallCharges = { player: 0, npc: 0 };
    this.firewallRegenAt = { player: 0, npc: 0 };
    for (const o of this.firewallObjs) o.destroy();
    this.firewallObjs = [];
    this.firewallShownCharges = -1;

    this.ads = [];
    this.virusUntil = { player: 0, npc: 0 };
    this.virusNextTickAt = { player: 0, npc: 0 };
    this.huskViruses = [];
    this.wasSheltered = { player: false, npc: false };
    this.arena.player.incomingDamageMultiplier = 1;
    this.arena.npc.incomingDamageMultiplier = 1;

    for (const o of OWNERS) this.destroyMalware(o);
    this.malwareCdUntil = { player: 0, npc: 0 };
    this.thrownBullets = [];

    this.destroyCord('player');
    this.destroyCord('npc');
    this.boxedUntil = { player: 0, npc: 0 };
    for (const o of OWNERS) {
      const f = o === 'player' ? this.arena.player : this.arena.npc;
      f.clearTint();
    }
    this.boxedHusks = [];
    for (const o of OWNERS) this.trojan[o] = null;
    this.dragActive = { player: false, npc: false };
    this.dragExpiresAt = { player: 0, npc: 0 };
    this.dragGrabbed = null;
    this.dragCursorIcon?.destroy();
    this.dragCursorIcon = null;
    this.dragPointerWasDown = false;

    this.closeSurfPopup();
    this.destroyBrowser();
    this.browserCoins = 0;
    this.browserFactory = false;
    this.browserCoinAccum = 0;
    this.wheelSpinning = false;
    for (const c of this.coinProjs) this.arena.projReg.remove(c.reg);
    this.coinProjs = [];
    this.gamingMouseStacks = { player: 0, npc: 0 };
    this.dmgBuffUntil = { player: 0, npc: 0 };
    this.wheelSpeedUntil = 0;

    for (const o of OWNERS) {
      const st = this.admin[o];
      if (st.keyListener) window.removeEventListener('keydown', st.keyListener);
      st.box?.destroy();
      st.text?.destroy();
      this.admin[o] = freshAdminState();
    }
    this.adminInvisibleUntil = { player: 0, npc: 0 };
    this.wasAdminInvisible = { player: false, npc: false };
    for (const o of OWNERS) this.jail[o] = null;

    for (const t of this.consoleLogTexts) t.destroy();
    this.consoleLogTexts = [];

    this.breachTimes = { player: [], npc: [] };
    this.adminJackpot = { player: false, npc: false };

    this.cruncherStreak = 0;

    this.vpnRamp = 0;
    this.vpnTrailAccum = 0;
    this.vpnHasLastPos = false;
    if (this.vpnIndicatorShown) {
      this.arena.setStatusIndicator('vpn', null);
      this.vpnIndicatorShown = false;
    }

    this.byteBombLastCastAt = -BYTE_BOMB_COOLDOWN_MS;
    this.byteBombs = [];
    this.byteBombPointerWasDown = false;

    for (const [f, st] of this.lagged) {
      st.spinner?.destroy();
      if (f.active) f.laggedUntil = 0;
    }
    this.lagged.clear();
  }

  // ── handleInput ────────────────────────────────────────────────────────

  handleInput(_time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const player = this.arena.player;
    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Technology Mastery — Byte-Bomb may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const bbSlot = this.arena.masteryActive ? this.byteBombSlot() : null;

    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      if (bbSlot === 'e') this.tryCastByteBomb(mouseX, mouseY);
      else player.castAbility('tech-ads', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (bbSlot === 'r') this.tryCastByteBomb(mouseX, mouseY);
      else player.castAbility('tech-upload', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (bbSlot === 'f') this.tryCastByteBomb(mouseX, mouseY);
      else player.castAbility('tech-webdrag', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (bbSlot === 'q') this.tryCastByteBomb(mouseX, mouseY);
      else player.castAbility('tech-admin', ctx);
    }

    this.handleTrojanSteering();

    if (this.dragActive.player) {
      this.handleWebDragPointer(pointer, mouseX, mouseY);
      this.byteBombPointerWasDown = pointer.leftButtonDown();
    } else {
      const disarmed = Date.now() < player.disarmedUntil;
      const overUi = this.browserOpen || this.isPointerOverSurfPopup(mouseX, mouseY);
      // A click that lands on your own Byte-Bomb trims its fuse instead of firing a cruncher.
      const trimmedFuse = !overUi && this.handleByteBombClick(pointer, mouseX, mouseY);
      if (!disarmed && !overUi && !trimmedFuse && pointer.leftButtonDown()) this.doTechCruncherFire('player', mouseX, mouseY);
    }
  }

  private handleTrojanSteering(): void {
    const t = this.trojan.player;
    if (!t) return;
    if (!this.arrowKeys) {
      const kb = this.arena.scene.input.keyboard;
      if (!kb) return;
      this.arrowKeys = {
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      };
    }
    const dirs: Array<['up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key]> = [
      ['up', this.arrowKeys.up], ['down', this.arrowKeys.down],
      ['left', this.arrowKeys.left], ['right', this.arrowKeys.right],
    ];
    for (const [name, key] of dirs) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        t.dir = this.steerDir(name);
        if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'steer', d: name });
      }
    }
  }

  private isPointerOverSurfPopup(x: number, y: number): boolean {
    const b = this.surfPopupBounds;
    return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  // ── update ────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateCrunchers(time, delta);
    this.updateAdrenalineHud(time);
    this.updateFirewall(time);
    this.updateAds(time);
    this.updateCords(time, delta);
    this.updateBoxed(time);
    this.updateTrojan(time);
    this.updateWebDrag(time);
    this.updateMalware(time, delta);
    this.updateThrownBullets(time, delta);
    this.updateBrowser(time, delta);
    this.updateCoinProjs(time, delta);
    this.updateAdmin(time);
    this.updateJail(time);
    this.updateVpn(time, delta);
    this.updateByteBombs(time, delta);
    this.updateLag(time, delta);

    if (this.arena.elementId === 'technology') this.updateShelter('player');
    if (this.arena.npcElementId === 'technology') this.updateShelter('npc');

    // Everything the kit owns is repainted from scratch here, after the sim has moved it.
    this.paintWorld(time);
    this.updateAuras(delta, time);
    this.updateAvatars(delta);
  }

  // ── Painting ──────────────────────────────────────────────────────────────
  //
  // Every world object this kit owns is plain data, drawn per frame into three shared Graphics
  // layers. That is what lets a cruncher chomp, a cable sag between its two ends and a bomb's
  // countdown tick down on its own face — none of which a static sprite can do.

  private paintWorld(time: number): void {
    const t = time / 1000;
    const floor = this.layer(D_FLOOR);
    const world = this.layer(D_WORLD);
    const ui = this.layer(D_UI);
    floor.clear();
    world.clear();
    ui.clear();

    this.paintFirewall(floor, t);
    this.paintCrunchers(world, time, t);
    this.paintCords(world, t);
    this.paintByteBombs(world, floor, time);
    this.paintMalware(world, t);
    this.paintAds(ui, time, t);
    this.paintBoxed(ui, t);
    this.paintLoose(world);
    this.paintJail(ui, time, t);
  }

  /** The odds and ends: stolen rounds the goose is throwing back, and loose browser coins. */
  private paintLoose(g: Phaser.GameObjects.Graphics): void {
    for (const b of this.thrownBullets) {
      const ang = Math.atan2(b.vy, b.vx);
      const tint = this.col(b.owner);
      // A stolen round, still wearing the trail it had when it was taken.
      g.fillStyle(tint(TECH.amber), 0.3);
      g.fillCircle(b.x - Math.cos(ang) * 7, b.y - Math.sin(ang) * 7, 4);
      g.fillStyle(tint(TECH.amber), 1);
      g.fillCircle(b.x, b.y, 5);
      g.fillStyle(tint(TECH.white), 0.85);
      g.fillCircle(b.x - 1.4, b.y - 1.6, 1.8);
    }
    for (const c of this.coinProjs) {
      const tint = this.col(c.owner);
      // Coins spin edge-on and back, so a scatter of them shimmers instead of sliding.
      const spin = Math.abs(Math.cos(c.x * 0.06 + c.y * 0.06));
      g.fillStyle(tint(TECH.gold), 1);
      g.fillEllipse(c.x, c.y, 10 * spin + 2, 10);
      g.lineStyle(1.2, tint(TECH.night), 0.7);
      g.strokeEllipse(c.x, c.y, 10 * spin + 2, 10);
    }
  }

  /** The colour a cruncher is wearing this frame. Gaming mice (F+) cycle hue; the rest don't. */
  private cruncherColor(c: { owner: Owner; rgb: boolean }, time: number, i: number): number {
    if (!c.rgb) return c.owner === 'player' ? TECH.phosphor : TECH.cyan;
    const hue = ((time / 4) + i * 40) % 360;
    return Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color;
  }

  private paintCrunchers(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (let i = 0; i < this.crunchers.length; i++) {
      const c = this.crunchers[i];
      TechnologyFx.drawCruncher(g, this.col(c.owner), c.x, c.y, Math.atan2(c.vy, c.vx), t,
        this.cruncherColor(c, time, i), 1);
    }
  }

  private paintCords(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const owner of OWNERS) {
      const cord = this.cords[owner];
      if (cord) {
        const caster = owner === 'player' ? this.arena.player : this.arena.npc;
        TechnologyFx.drawCord(g, this.col(owner), caster.x, caster.y, cord.x, cord.y, t, 1,
          cord.state === 'parked');
      }
      // R+ Trojan Takeover: the caster stays plugged into the body they boxed.
      const tr = this.trojan[owner];
      if (!tr || !tr.victim.active) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;
      TechnologyFx.drawCord(g, this.col(owner), caster.x, caster.y, tr.victim.x, tr.victim.y, t, 0.85, false);
    }
  }

  private paintByteBombs(
    world: Phaser.GameObjects.Graphics, floor: Phaser.GameObjects.Graphics, time: number,
  ): void {
    for (const b of this.byteBombs) this.drawByteBombFace(world, floor, b, time);
  }

  private paintMalware(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const owner of OWNERS) {
      const m = this.malware[owner];
      if (!m) continue;
      if (m.kind === 'goose') {
        TechnologyFx.drawGoose(g, this.col(owner), m.x, m.y, m.facing, t, 1);
      } else if (m.kind === 'pong') {
        // Pong balls: a bright square with a trail, because this is a 1972 video game.
        for (const b of m.balls) {
          const ang = Math.atan2(b.vy, b.vx);
          for (let i = 3; i >= 1; i--) {
            bitTileLayered(g, this.col(owner), b.x - Math.cos(ang) * i * 6, b.y - Math.sin(ang) * i * 6,
              0, 12 - i * 1.5, i % 2 === 0, TECH.white, 0.16 * (4 - i), false);
          }
          g.fillStyle(this.col(owner)(TECH.white), 1);
          g.fillRect(b.x - 6, b.y - 6, 12, 12);
          g.lineStyle(2, this.col(owner)(TECH.alert), 0.9);
          g.strokeRect(b.x - 6, b.y - 6, 12, 12);
        }
      }
    }
  }

  private paintAds(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const ad of this.ads) {
      // Yours is a see-through overlay; the enemy's is opaque and squarely in the way.
      const mine = ad.owner === 'player';
      const pop = Phaser.Math.Clamp((time - ad.bornAt) / 160, 0, 1);
      TechnologyFx.drawAd(g, this.col(ad.owner), ad.x, ad.y,
        ad.w * (0.4 + pop * 0.6), ad.h * (0.4 + pop * 0.6), t, mine ? 0.5 : 1, mine);
    }
  }

  private paintBoxed(g: Phaser.GameObjects.Graphics, t: number): void {
    const now = this.arena.scene.time.now;
    for (const owner of OWNERS) {
      if (now >= this.boxedUntil[owner]) continue;
      const f = owner === 'player' ? this.arena.player : this.arena.npc;
      if (!f.active) continue;
      TechnologyFx.drawBoxed(g, this.col(opposite(owner)), f.x, f.y, 16, t, 1);
    }
    for (const b of this.boxedHusks) {
      if (!b.f.active) continue;
      TechnologyFx.drawBoxed(g, this.pcol, b.f.x, b.f.y, 16, t, 1);
    }
  }

  /**
   * Click+ Firewall: the arena border becomes a live packet filter. Repainted every frame rather
   * than stamped once, so the wall visibly *scans* — which is what says it is still up.
   */
  private paintFirewall(g: Phaser.GameObjects.Graphics, t: number): void {
    const charges = this.firewallCharges.player;
    if (charges <= 0) return;
    const { width: W, height: H } = this.arena.scene.scale;
    const alpha = 0.3 + 0.14 * charges;
    g.lineStyle(5, this.pcol(TECH.rust), alpha);
    g.strokeRect(6, 6, W - 12, H - 12);
    g.lineStyle(1.4, this.pcol(TECH.gold), alpha * 0.6);
    g.strokeRect(12, 12, W - 24, H - 24);
    // Packets running the perimeter, one lap every few seconds.
    const per = 5 * charges;
    const peri = (W - 24) * 2 + (H - 24) * 2;
    for (let i = 0; i < per; i++) {
      let d = ((t * 0.16 + i / per) % 1) * peri;
      let x: number, y: number;
      if (d < W - 24) { x = 12 + d; y = 12; }
      else if ((d -= W - 24) < H - 24) { x = W - 12; y = 12 + d; }
      else if ((d -= H - 24) < W - 24) { x = W - 12 - d; y = H - 12; }
      else { x = 12; y = H - 12 - (d - (W - 24)); }
      bitTileLayered(g, this.pcol, x, y, 0, 9, i % 2 === 0, TECH.gold, alpha + 0.3, false);
    }
  }

  // ── Auras + rig ───────────────────────────────────────────────────────────

  /**
   * The persistent tells. Every one is keyed and dropped the frame its condition lapses, so
   * several can stack into one silhouette without leaking Graphics.
   */
  private updateAuras(delta: number, time: number): void {
    const live = new Set<string>();
    const run = (id: string, style: TechAuraStyle, f: Fighter, tint: TechColorFn,
      radius: number, depth: number, intensity: number, angle: number): void => {
      if (!f?.active || f.hp <= 0) return;
      live.add(id);
      const a = this.aura(id, style, tint, radius, depth);
      a.setIntensity(intensity);
      a.setAngle(angle);
      a.update(delta, f.x, f.y, f.forceInvisible ? 0 : Math.max(f.alpha, 0.25));
    };

    for (const owner of OWNERS) {
      const f = owner === 'player' ? this.arena.player : this.arena.npc;
      const foe = this.col(opposite(owner));
      if (time < this.virusUntil[owner]) run(`${owner}-virus`, 'virus', f, foe, 22, D_UI, 1, 0);
      if (time < this.boxedUntil[owner]) run(`${owner}-boxed`, 'boxed', f, foe, 22, D_FLOOR + 1, 1, 0);
      if (time < this.adminInvisibleUntil[owner]) {
        run(`${owner}-admin`, 'invincible', f, this.col(owner), 26, D_UI, 1, 0);
      }
      const sheltered = owner === 'player' ? this.isPlayerSheltered() : this.isNpcSheltered();
      if (sheltered) run(`${owner}-shelter`, 'shelter', f, this.col(owner), 22, D_UI, 1, 0);
    }
    for (const v of this.huskViruses) {
      run(`husk-virus-${v.until}`, 'virus', v.f, this.pcol, 20, D_UI, 1, 0);
    }
    for (const [f, st] of this.lagged) {
      if (time >= st.until) continue;
      run(`lag-${f === this.arena.player ? 'p' : 'n'}`, 'lag', f, this.pcol, 20, D_UI, 1, 0);
    }
    // Mastery — VPN: the ramp is only ever the local player's, and it streams behind them.
    if (this.arena.masteryActive && this.vpnRamp > 0.05) {
      const p = this.arena.player;
      const body = p.body as Phaser.Physics.Arcade.Body | null;
      const heading = body ? Math.atan2(body.velocity.y, body.velocity.x) : 0;
      run('player-vpn', 'vpn', p, this.pcol, 22, D_FLOOR + 2, this.vpnRamp, heading);
    }

    for (const id of [...this.auras.keys()]) if (!live.has(id)) this.dropAura(id);
  }

  /** Drive the rig for whichever sides are playing Technology. Built lazily; torn down otherwise. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.arena;
    const pointer = scene.input.activePointer;

    if (this.arena.elementId === 'technology' && player?.active && player.hp > 0) {
      if (!this.playerAvatar) this.playerAvatar = new TechnologyAvatar(scene, this.pcol, 'player');
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(pointer.worldY - player.y, pointer.worldX - player.x));
      av.setMastered(this.arena.masteryActive);
      av.setVpn(this.vpnRamp);
      // The admin console visibly swells the rig — you are inside the machine while it runs.
      av.setIntensity(this.admin.player.active ? 1.35 : 1);
      av.setHold(this.admin.player.active ? 'brace' : null);
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.arena.npcElementId === 'technology' && npc?.active && npc.hp > 0) {
      if (!this.npcAvatar) this.npcAvatar = new TechnologyAvatar(scene, this.ncol, 'npc');
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setIntensity(this.admin.npc.active ? 1.35 : 1);
      av.setHold(this.admin.npc.active ? 'brace' : null);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Wheel of Fortune speed buff + the VPN mastery ramp — read in ArenaScene's speed-mult block. */
  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    const wheel = time < this.wheelSpeedUntil ? 1.5 : 1;
    const adrenaline = 1 + this.adrenalineStacksFor('player', time) * ADRENALINE_SPEED_PER_STACK;
    return wheel * (1 + this.vpnRamp * VPN_MAX_BONUS) * adrenaline;
  }

  private updateShelter(owner: Owner): void {
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const sheltered = owner === 'player' ? this.isPlayerSheltered() : this.isNpcSheltered();
    fighter.incomingDamageMultiplier = sheltered ? ADS_SHELTER_DMG_MULT : 1;
    if (sheltered !== this.wasSheltered[owner]) {
      this.wasSheltered[owner] = sheltered;
      fighter.setAlpha(sheltered ? 0.3 : 1);
    }
  }

  // ── Addicting Cruncher (Click) ───────────────────────────────────────────

  doTechCruncherFire(owner: Owner, tx: number, ty: number): void {
    const time = this.arena.scene.time.now;
    // Wired (Adrenaline perk at full dose) cuts under the usual floor — that is the payoff.
    const wired = this.adrenalineStacksFor(owner, time) >= ADRENALINE_MAX_STACKS;
    const floor = wired ? CRUNCHER_MIN_COOLDOWN * ADRENALINE_WIRED_CD_MULT : CRUNCHER_MIN_COOLDOWN;
    const effectiveCd = Math.max(floor,
      CRUNCHER_BASE_COOLDOWN * (1 - this.cruncherCd[owner] / 100) * (wired ? ADRENALINE_WIRED_CD_MULT : 1));
    if (time - this.cruncherLastFireAt[owner] < effectiveCd) return;
    this.cruncherLastFireAt[owner] = time;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = CRUNCHER_BASE_SPEED * (1 + this.cruncherSpeed[owner] / 100);
    const mouseMult = 1 + this.gamingMouseStacks[owner] * 0.1;
    const buffMult = time < this.dmgBuffUntil[owner] ? 1.25 : 1;
    const damage = CRUNCHER_BASE_DAMAGE * (1 + this.cruncherDmg[owner] / 100) * mouseMult * buffMult;
    this.gesture(owner, 'tech-cruncher', angle);
    const entry = {
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      owner, damage, traveled: 0, trailAccum: 0,
      rgb: this.gamingMouseStacks[owner] > 0,
      reg: null as unknown as RegisteredProjectile,
    };
    entry.reg = {
      owner,
      getX: () => entry.x,
      getY: () => entry.y,
      damage,
      steal: () => {
        const idx = this.crunchers.indexOf(entry);
        if (idx >= 0) this.crunchers.splice(idx, 1);
      },
    };
    // Muzzle: a burst of bits out of the hand it was thrown from.
    this.fx(owner).bits(caster.x, caster.y, 3, {
      angle, spread: 0.6, speed: 120, size: 8, life: 320, depth: D_WORLD, drift: 0,
    });
    this.crunchers.push(entry);
    this.arena.projReg.add(entry.reg);
  }

  /**
   * Mastery: longest run of consecutive cruncher hits. Called on every resolved shot, including
   * the firewalled misses that skip `bumpCruncher` — a miss is a miss as far as the streak goes.
   */
  private noteCruncherResolved(owner: Owner, hit: boolean): void {
    if (owner !== 'player') return;
    if (hit) {
      this.cruncherStreak++;
      this.arena.recordMasteryBest('cruncherStreak', this.cruncherStreak);
    } else {
      this.cruncherStreak = 0;
    }
  }

  private bumpCruncher(owner: Owner, hit: boolean): void {
    if (hit) {
      this.cruncherCd[owner] = Math.min(100, this.cruncherCd[owner] + 5);
      this.cruncherDmg[owner] = Math.min(100, this.cruncherDmg[owner] + 5);
      this.cruncherSpeed[owner] = Math.min(100, this.cruncherSpeed[owner] + 5);
    } else {
      this.cruncherCd[owner] = Math.max(0, this.cruncherCd[owner] - 40);
      this.cruncherDmg[owner] = Math.max(0, this.cruncherDmg[owner] - 20);
      this.cruncherSpeed[owner] = Math.max(0, this.cruncherSpeed[owner] - 20);
    }
    this.bumpAdrenaline(owner, hit);
  }

  // ── Adrenaline (perk) ────────────────────────────────────────────────────

  /** A landed cruncher doses you; a miss burns one dose off the top. */
  private bumpAdrenaline(owner: Owner, hit: boolean): void {
    if (!this.arena.hasPerk(owner, 'adrenaline')) return;
    const time = this.arena.scene.time.now;
    const stacks = this.adrenalineStacksFor(owner, time);
    if (hit) {
      this.adrenalineStacks[owner] = Math.min(ADRENALINE_MAX_STACKS, stacks + 1);
      this.adrenalineUntil[owner] = time + ADRENALINE_WINDOW_MS;
      if (this.adrenalineStacks[owner] === ADRENALINE_MAX_STACKS && stacks < ADRENALINE_MAX_STACKS) {
        const f = owner === 'player' ? this.arena.player : this.arena.npc;
        this.arena.spawnFloatingText(f.x, f.y - 46, '💉 WIRED', '#55ffcc');
      }
    } else {
      this.adrenalineStacks[owner] = Math.max(0, stacks - 1);
      // A miss only trims the dose — the clock keeps running on what is left.
      if (this.adrenalineStacks[owner] === 0) this.adrenalineUntil[owner] = 0;
    }
  }

  /** Live stack count, lapsing the whole dose once the window since the last hit passes. */
  private adrenalineStacksFor(owner: Owner, time: number): number {
    if (time >= this.adrenalineUntil[owner]) {
      this.adrenalineStacks[owner] = 0;
      return 0;
    }
    return this.adrenalineStacks[owner];
  }

  private updateAdrenalineHud(time: number): void {
    const stacks = this.arena.hasPerk('player', 'adrenaline')
      ? this.adrenalineStacksFor('player', time) : 0;
    if (stacks > 0) {
      this.arena.setStatusIndicator('adrenaline', {
        name: 'Adrenaline', emoji: '💉', color: 0x44ccaa,
        description: 'Cruncher hits are dosing you: +10% move speed each. At 5 doses you are wired and the click fires twice as fast.',
        until: this.adrenalineUntil.player,
        count: stacks * 10, suffix: '%', priority: 118,
      });
      this.adrenalineIndicatorShown = true;
    } else if (this.adrenalineIndicatorShown) {
      this.arena.setStatusIndicator('adrenaline', null);
      this.adrenalineIndicatorShown = false;
    }
  }

  /** One bit shed out of the *back* of a cruncher, so the trail reads as exhaust. */
  private spawnBinaryTrail(owner: Owner, x: number, y: number, color: number): void {
    this.fx(owner).bit(x, y, color, D_WORLD - 1, 9, 520);
  }

  private removeCruncher(i: number): void {
    const c = this.crunchers[i];
    this.arena.projReg.remove(c.reg);
    this.crunchers.splice(i, 1);
  }

  private updateCrunchers(time: number, delta: number): void {
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.crunchers.length - 1; i >= 0; i--) {
      const c = this.crunchers[i];
      c.x += c.vx * delta / 1000;
      c.y += c.vy * delta / 1000;
      c.traveled += Math.hypot(c.vx, c.vy) * delta / 1000;

      c.trailAccum += delta;
      if (c.trailAccum >= CRUNCHER_TRAIL_INTERVAL_MS) {
        c.trailAccum = 0;
        // Emitted out of the back of the shot, not off its centre.
        const back = Math.atan2(-c.vy, -c.vx);
        this.spawnBinaryTrail(c.owner, c.x + Math.cos(back) * 12, c.y + Math.sin(back) * 12,
          this.cruncherColor(c, time, i));
      }

      let hitTarget: Fighter | null = null;
      for (const t of this.enemiesOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= CRUNCHER_HIT_RADIUS) { hitTarget = t; break; }
      }
      const outOfBounds = c.x < -20 || c.x > W + 20 || c.y < -20 || c.y > H + 20;

      if (hitTarget) {
        hitTarget.takeDamage(c.damage);
        this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, 0x33ff88);
        this.arena.spawnDamageNumber(hitTarget.x, hitTarget.y, c.damage);
        this.bumpCruncher(c.owner, true);
        this.noteCruncherResolved(c.owner, true);
        this.removeCruncher(i);
      } else if (outOfBounds || c.traveled >= CRUNCHER_MAX_RANGE) {
        // Firewall (Click+): the first N misses are absorbed at the arena edge — no penalty.
        if (this.firewallCharges[c.owner] > 0) {
          this.firewallCharges[c.owner]--;
          const fx = Phaser.Math.Clamp(c.x, 10, W - 10);
          const fy = Phaser.Math.Clamp(c.y, 10, H - 10);
          this.arena.spawnHitFlash(fx, fy, 0xff8822);
          if (c.owner === 'player') {
            this.arena.spawnFloatingText(fx, fy, '🧱 absorbed', '#ff9944');
          }
          if (this.firewallCharges[c.owner] === 0) {
            this.firewallRegenAt[c.owner] = time + FIREWALL_REGEN_MS;
          }
        } else {
          this.bumpCruncher(c.owner, false);
        }
        this.noteCruncherResolved(c.owner, false);
        this.removeCruncher(i);
      }
    }
  }

  // ── Firewall (Click+) ────────────────────────────────────────────────────

  private updateFirewall(time: number): void {
    // Lazy init: reset() is not called on the very first match, and upgrade
    // state isn't known until ArenaScene.create() has run.
    if (!this.firewallInited) {
      this.firewallInited = true;
      this.firewallCharges = {
        player: this.arena.hasUpgrade('player', 'click') ? FIREWALL_CHARGES : 0,
        npc: this.arena.hasUpgrade('npc', 'click') ? FIREWALL_CHARGES : 0,
      };
    }
    for (const o of OWNERS) {
      if (!this.arena.hasUpgrade(o, 'click')) continue;
      if (this.firewallCharges[o] === 0 && this.firewallRegenAt[o] > 0 && time >= this.firewallRegenAt[o]) {
        this.firewallCharges[o] = FIREWALL_CHARGES;
        this.firewallRegenAt[o] = 0;
        if (o === 'player') {
          this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 40, '🧱 Firewall restored', '#ff9944');
        }
      }
    }
    // Border visual for the local player's firewall only.
    const charges = this.firewallCharges.player;
    if (charges !== this.firewallShownCharges) {
      this.firewallShownCharges = charges;
      for (const obj of this.firewallObjs) obj.destroy();
      this.firewallObjs = [];
      if (charges > 0) {
        const { width: W, height: H } = this.arena.scene.scale;
        const alpha = 0.25 + 0.15 * charges;
        const gfx = this.arena.scene.add.graphics().setDepth(6);
        gfx.lineStyle(5, 0xff8822, alpha);
        gfx.strokeRect(6, 6, W - 12, H - 12);
        this.firewallObjs.push(gfx);
        for (let i = 0; i < 14; i++) {
          const edge = i % 4;
          const t = Math.random();
          const x = edge === 0 ? 14 : edge === 1 ? W - 14 : 20 + t * (W - 40);
          const y = edge < 2 ? 20 + t * (H - 40) : edge === 2 ? 14 : H - 14;
          this.firewallObjs.push(
            this.arena.scene.add.text(x, y, Math.random() < 0.5 ? '0' : '1', {
              fontSize: '11px', color: '#ffaa55', fontFamily: 'monospace',
            }).setOrigin(0.5).setDepth(6).setAlpha(alpha + 0.2),
          );
        }
        this.firewallObjs.push(
          this.arena.scene.add.text(12, this.arena.scene.scale.height - 12, `🧱 ${charges}/${FIREWALL_CHARGES}`, {
            fontSize: '13px', color: '#ff9944', fontFamily: 'monospace',
          }).setOrigin(0, 1).setDepth(50).setScrollFactor(0),
        );
      }
    }
  }

  // ── Overt Advertisement (E) ──────────────────────────────────────────────

  doTechAdsCast(owner: Owner): void {
    const { width: W, height: H } = this.arena.scene.scale;
    const now = this.arena.scene.time.now;
    const translucent = owner === 'player';
    for (let i = 0; i < ADS_COUNT; i++) {
      const x = Phaser.Math.Between(50, W - 50);
      const y = Phaser.Math.Between(50, H - 50);
      this.ads.push({ owner, x, y, w: ADS_W, h: ADS_H, bornAt: now, expiresAt: now + ADS_LIFETIME_MS });
    }
    void translucent;
    this.gesture(owner, 'tech-ads');

    // Palware (E+): caster also summons a malware. Only the local player rolls;
    // the remote sim mirrors it via the 'malware' net message.
    if (owner === 'player' && this.arena.hasUpgrade('player', 'e')
        && !this.malware.player && now >= this.malwareCdUntil.player) {
      const kind = MALWARE_KINDS[Phaser.Math.Between(0, MALWARE_KINDS.length - 1)];
      this.spawnMalware('player', kind);
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'malware', kind });
    }
  }

  private applyVirus(fighter: Fighter, owner: Owner | null, time: number): void {
    this.arena.spawnFloatingText(fighter.x, fighter.y - 40, 'VIRUS!', '#55dd55');
    if (owner) {
      this.virusUntil[owner] = time + VIRUS_DURATION_MS;
      this.virusNextTickAt[owner] = time + VIRUS_TICK_MS;
    } else {
      const existing = this.huskViruses.find((v) => v.f === fighter);
      if (existing) {
        existing.until = time + VIRUS_DURATION_MS;
      } else {
        this.huskViruses.push({
          f: fighter,
          until: time + VIRUS_DURATION_MS,
          nextTickAt: time + VIRUS_TICK_MS,
        });
      }
    }
    // Infection lands as a burst of corrupted cells and a tear across the victim.
    const fx = owner === 'npc' ? this.pfx : this.nfx;
    fx.bits(fighter.x, fighter.y, 8, { speed: 150, size: 9, life: 620, depth: D_UI, color: TECH.plague });
    fx.glitch(fighter.x, fighter.y, 60, 48, TECH.plague, 420, D_UI);
  }

  private virusTick(fighter: Fighter): number {
    const body = fighter.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const speedMult = Math.max(1, speed / (fighter.speed || 200));
    const dmg = Math.round(VIRUS_BASE_DMG * speedMult);
    fighter.takeDamage(dmg);
    this.arena.showFloatingText(fighter.x, fighter.y - 30, `🦠 -${dmg}`, '#55dd55');
    return dmg;
  }

  private updateAds(time: number): void {
    for (let i = this.ads.length - 1; i >= 0; i--) {
      const ad = this.ads[i];
      if (time >= ad.expiresAt) {
        // Popups do not fade — they close.
        this.fx(ad.owner).bits(ad.x, ad.y, 5, {
          speed: 130, size: 9, life: 380, depth: D_UI, color: TECH.white,
        });
        this.ads.splice(i, 1);
        continue;
      }
      const toucher = this.enemiesOf(ad.owner).find((f) => this.rectContains(ad, f.x, f.y));
      if (toucher) {
        const toucherOwner: Owner | null =
          toucher === this.arena.player ? 'player' : toucher === this.arena.npc ? 'npc' : null;
        this.applyVirus(toucher, toucherOwner, time);
        this.fx(ad.owner).crash(ad.x, ad.y, 46, {
          bits: 8, rings: 1, duration: 420, color: TECH.plague, mark: false,
        });
        this.ads.splice(i, 1);
      }
    }

    for (const owner of OWNERS) {
      const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
      // The crawling cells are the 'virus' aura's job; this is only the damage tick.
      if (time < this.virusUntil[owner] && time >= this.virusNextTickAt[owner]) {
        this.virusNextTickAt[owner] = time + VIRUS_TICK_MS;
        this.virusTick(fighter);
      }
    }

    for (let i = this.huskViruses.length - 1; i >= 0; i--) {
      const v = this.huskViruses[i];
      if (time >= v.until || !v.f.active || v.f.hp <= 0) {
        this.huskViruses.splice(i, 1);
        continue;
      }
      if (time >= v.nextTickAt) {
        v.nextTickAt = time + VIRUS_TICK_MS;
        this.virusTick(v.f);
      }
    }
  }

  // ── Palware (E+) ─────────────────────────────────────────────────────────

  private spawnMalware(owner: Owner, kind: MalwareKind): void {
    if (this.malware[owner]) return;
    const now = this.arena.scene.time.now;
    const scene = this.arena.scene;
    const { width: W, height: H } = scene.scale;
    const expiresAt = now + MALWARE_LIFETIME_MS;

    if (kind === 'goose') {
      const x = Phaser.Math.Between(80, W - 80);
      const y = Phaser.Math.Between(80, H - 80);
      this.malware[owner] = {
        kind: 'goose', owner, expiresAt,
        facing: 0, x, y,
        targetX: Phaser.Math.Between(60, W - 60), targetY: Phaser.Math.Between(60, H - 60),
        mode: 'wander', modeUntil: 0, nextActionAt: now + 2500,
        carried: null, stolenDamage: 0, bulletIcon: null,
      };
      this.arena.spawnFloatingText(x, y - 30, 'HONK!', '#eeeecc');
    } else if (kind === 'clippy') {
      const cx = W - 128, cy = 96;
      const objs: Phaser.GameObjects.GameObject[] = [];
      const box = scene.add.rectangle(cx, cy, 216, 118, 0x552277, 0.92).setStrokeStyle(2, 0xbb88ff).setDepth(44).setScrollFactor(0);
      const title = scene.add.text(cx - 100, cy - 48, '📎 Clippy', { fontSize: '13px', color: '#eeddff', fontFamily: 'monospace' }).setOrigin(0, 0.5).setDepth(45).setScrollFactor(0);
      const qText = scene.add.text(cx, cy - 14, 'Hi! I\'m Clippy!', { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(45).setScrollFactor(0);
      const inputText = scene.add.text(cx, cy + 12, '', { fontSize: '15px', color: '#ffff88', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(45).setScrollFactor(0);
      const timerBar = scene.add.rectangle(cx, cy + 44, 196, 7, 0xbb88ff, 0.9).setDepth(45).setScrollFactor(0);
      timerBar.setVisible(false);
      objs.push(box, title, qText, inputText, timerBar);
      this.malware[owner] = {
        kind: 'clippy', owner, expiresAt,
        objs, qText, inputText, timerBar,
        // First quiz after 3s, then every 8s — two quizzes fit in the 20s lifetime.
        nextQuizAt: now + 3000,
        quiz: null, keyListener: null,
      };
    } else {
      const ball = this.makePongBall(W / 2, H / 2, Math.random() * Math.PI * 2);
      this.malware[owner] = { kind: 'pong', owner, expiresAt, balls: [ball], nextSplitAt: now + PONG_SPLIT_MS };
      this.arena.spawnFloatingText(W / 2, H / 2 - 24, 'MAD PONG!', '#ffffff');
    }
  }

  private makePongBall(x: number, y: number, angle: number): PongBall {
    return {
      x, y,
      vx: Math.cos(angle) * PONG_SPEED,
      vy: Math.sin(angle) * PONG_SPEED,
      lastHitAt: new Map(),
    };
  }

  private destroyMalware(owner: Owner): void {
    const m = this.malware[owner];
    if (!m) return;
    if (m.kind === 'goose') {
      m.bulletIcon?.destroy();
    } else if (m.kind === 'clippy') {
      if (m.keyListener) window.removeEventListener('keydown', m.keyListener);
      for (const o of m.objs) o.destroy();
    }
    // Pong holds nothing but data — its balls are painted from `m.balls` each frame.
    this.malware[owner] = null;
  }

  private updateMalware(time: number, delta: number): void {
    for (const owner of OWNERS) {
      const m = this.malware[owner];
      if (!m) continue;
      if (time >= m.expiresAt) {
        if (owner === 'player') {
          this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 44, 'Malware expired', '#aaaacc');
        }
        this.destroyMalware(owner);
        this.malwareCdUntil[owner] = time + MALWARE_COOLDOWN_MS;
        continue;
      }
      if (m.kind === 'goose') this.updateGoose(m, time, delta);
      else if (m.kind === 'clippy') this.updateClippy(m, time);
      else this.updatePong(m, time, delta);
    }
  }

  // ── Goose ──

  private gooseMoveToward(g: GooseState, tx: number, ty: number, speed: number, delta: number): number {
    const d = Phaser.Math.Distance.Between(g.x, g.y, tx, ty);
    if (d > 1) {
      const step = Math.min(d, speed * delta / 1000);
      g.x += ((tx - g.x) / d) * step;
      g.y += ((ty - g.y) / d) * step;
      g.facing = Math.atan2(ty - g.y, tx - g.x);
    }
    return d;
  }

  private findStealableBullet(owner: Owner, x: number, y: number, radius: number):
      { x: number; y: number; damage: number; take: () => void } | null {
    const enemyOwner = opposite(owner);
    let best: { x: number; y: number; damage: number; take: () => void } | null = null;
    let bestD = radius;

    const regHit = this.arena.projReg.nearest(enemyOwner, x, y, radius);
    if (regHit) {
      const d = Math.hypot(regHit.getX() - x, regHit.getY() - y);
      if (d <= bestD) {
        bestD = d;
        best = { x: regHit.getX(), y: regHit.getY(), damage: regHit.damage, take: () => this.arena.projReg.steal(regHit) };
      }
    }

    const enemyIsPlayer = enemyOwner === 'player';
    for (const go of this.arena.projGroup.getChildren() as Projectile[]) {
      if (!go.active || go.isFromPlayer !== enemyIsPlayer || go.isHeal) continue;
      const d = Math.hypot(go.x - x, go.y - y);
      if (d <= bestD) {
        bestD = d;
        best = { x: go.x, y: go.y, damage: go.damage, take: () => go.destroy() };
      }
    }
    return best;
  }

  private updateGoose(g: GooseState & { owner: Owner }, time: number, delta: number): void {
    const scene = this.arena.scene;
    const { width: W, height: H } = scene.scale;
    const enemy = this.nearestEnemyOf(g.owner, g.x, g.y);

    switch (g.mode) {
      case 'wander': {
        const d = this.gooseMoveToward(g, g.targetX, g.targetY, GOOSE_WANDER_SPEED, delta);
        if (d < 8) {
          g.targetX = Phaser.Math.Between(60, W - 60);
          g.targetY = Phaser.Math.Between(60, H - 60);
        }
        if (time >= g.nextActionAt) {
          const actions: Array<GooseState['mode']> = [];
          if (enemy) actions.push('poke');
          if (enemy && !enemy.netGhost) actions.push('carry');
          if (this.findStealableBullet(g.owner, g.x, g.y, GOOSE_STEAL_SCAN_RADIUS)) actions.push('steal');
          if (actions.length > 0) {
            g.mode = actions[Phaser.Math.Between(0, actions.length - 1)];
            g.modeUntil = time + 4000;
          } else {
            g.nextActionAt = time + 1500;
          }
        }
        break;
      }
      case 'poke': {
        if (!enemy || time >= g.modeUntil) { this.gooseBackToWander(g, time); break; }
        const d = this.gooseMoveToward(g, enemy.x, enemy.y, GOOSE_CHASE_SPEED, delta);
        if (d < 34) {
          enemy.takeDamage(GOOSE_POKE_DMG);
          this.arena.spawnHitFlash(enemy.x, enemy.y, 0xeeeecc);
          this.arena.spawnFloatingText(enemy.x, enemy.y - 44, '🪿 HONK!', '#eeeecc');
          this.gooseBackToWander(g, time);
        }
        break;
      }
      case 'carry': {
        if (g.carried) {
          if (time >= g.modeUntil || !g.carried.active || g.carried.hp <= 0) {
            g.carried = null;
            this.gooseBackToWander(g, time);
            break;
          }
          const d = this.gooseMoveToward(g, g.targetX, g.targetY, GOOSE_WANDER_SPEED, delta);
          if (d < 8) {
            g.targetX = Phaser.Math.Between(60, W - 60);
            g.targetY = Phaser.Math.Between(60, H - 60);
          }
          g.carried.setPosition(g.x, g.y - 22);
          (g.carried.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        } else {
          if (!enemy || enemy.netGhost || time >= g.modeUntil) { this.gooseBackToWander(g, time); break; }
          const d = this.gooseMoveToward(g, enemy.x, enemy.y, GOOSE_CHASE_SPEED, delta);
          if (d < 34) {
            g.carried = enemy;
            g.modeUntil = time + Phaser.Math.Between(1500, 2000);
            g.targetX = Phaser.Math.Between(60, W - 60);
            g.targetY = Phaser.Math.Between(60, H - 60);
            this.arena.spawnFloatingText(enemy.x, enemy.y - 44, '🪿 grabbed!', '#eeeecc');
          }
        }
        break;
      }
      case 'steal': {
        const bullet = this.findStealableBullet(g.owner, g.x, g.y, GOOSE_STEAL_SCAN_RADIUS + 100);
        if (!bullet || time >= g.modeUntil) { this.gooseBackToWander(g, time); break; }
        const d = this.gooseMoveToward(g, bullet.x, bullet.y, GOOSE_CHASE_SPEED, delta);
        if (d < 30) {
          bullet.take();
          g.stolenDamage = bullet.damage;
          g.bulletIcon = scene.add.text(g.x, g.y - 24, '•', { fontSize: '20px', color: '#ffee66' }).setOrigin(0.5).setDepth(16);
          g.mode = 'throw';
          g.modeUntil = time + 1200;
          this.arena.spawnFloatingText(g.x, g.y - 40, '🪿 yoink!', '#ffee66');
        }
        break;
      }
      case 'throw': {
        const d = this.gooseMoveToward(g, g.targetX, g.targetY, GOOSE_WANDER_SPEED, delta);
        if (d < 8) {
          g.targetX = Phaser.Math.Between(60, W - 60);
          g.targetY = Phaser.Math.Between(60, H - 60);
        }
        g.bulletIcon?.setPosition(g.x, g.y - 24);
        if (time >= g.modeUntil) {
          const target = this.nearestEnemyOf(g.owner, g.x, g.y);
          if (target) {
            const angle = Math.atan2(target.y - g.y, target.x - g.x);
            this.thrownBullets.push({
              owner: g.owner,
              x: g.x, y: g.y,
              vx: Math.cos(angle) * 380, vy: Math.sin(angle) * 380,
              damage: Math.max(1, g.stolenDamage),
            });
          }
          g.bulletIcon?.destroy();
          g.bulletIcon = null;
          g.stolenDamage = 0;
          this.gooseBackToWander(g, time);
        }
        break;
      }
    }
  }

  private gooseBackToWander(g: GooseState, time: number): void {
    if (g.carried) g.carried = null;
    g.mode = 'wander';
    g.nextActionAt = time + Phaser.Math.Between(3000, 5000);
  }

  private updateThrownBullets(time: number, delta: number): void {
    void time;
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.thrownBullets.length - 1; i >= 0; i--) {
      const b = this.thrownBullets[i];
      b.x += b.vx * delta / 1000;
      b.y += b.vy * delta / 1000;
      const hit = this.enemiesOf(b.owner).find((f) => Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) <= 22);
      if (hit) {
        hit.takeDamage(b.damage);
        this.arena.spawnHitFlash(hit.x, hit.y, 0xffee66);
        this.thrownBullets.splice(i, 1);
      } else if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        this.thrownBullets.splice(i, 1);
      }
    }
  }

  // ── Clippy ──

  private updateClippy(m: ClippyState & { owner: Owner; expiresAt: number }, time: number): void {
    // The local human answers when they are the target (npc-owned malware);
    // AI targets (NPC opponent, husks) roll instead. A player-owned Clippy in an
    // online match is display-only — the victim's sim runs the real quiz.
    const interactive = m.owner === 'npc';
    const displayOnly = m.owner === 'player' && this.arena.isOnline;

    if (!m.quiz) {
      if (time >= m.nextQuizAt && time + CLIPPY_QUIZ_TIME_MS < m.expiresAt) {
        const a = Phaser.Math.Between(2, 9);
        const b = Phaser.Math.Between(2, 9);
        const useAdd = Math.random() < 0.6 || a < b;
        m.quiz = { answer: useAdd ? a + b : a - b, endsAt: time + CLIPPY_QUIZ_TIME_MS, input: '' };
        m.qText.setText(`${a} ${useAdd ? '+' : '-'} ${b} = ?`);
        m.inputText.setText(interactive ? '> _' : displayOnly ? '(enemy answering…)' : '(thinking…)');
        m.timerBar.setVisible(true);
        if (interactive && !m.keyListener) {
          const listener = (e: KeyboardEvent) => {
            const quiz = m.quiz;
            if (!quiz) return;
            if (/^[0-9]$/.test(e.key) && quiz.input.length < 3) quiz.input += e.key;
            else if (e.key === 'Backspace') quiz.input = quiz.input.slice(0, -1);
            else if (e.key === 'Enter') { this.resolveClippyQuiz(m, parseInt(quiz.input, 10) === quiz.answer); return; }
            m.inputText.setText(`> ${quiz.input}_`);
          };
          m.keyListener = listener;
          window.addEventListener('keydown', listener);
        }
      }
      return;
    }

    const remaining = Math.max(0, m.quiz.endsAt - time);
    m.timerBar.width = 196 * (remaining / CLIPPY_QUIZ_TIME_MS);
    if (remaining <= 0) {
      if (displayOnly) {
        this.clearClippyQuiz(m, time);
      } else if (interactive) {
        this.resolveClippyQuiz(m, parseInt(m.quiz.input, 10) === m.quiz.answer);
      } else {
        this.resolveClippyQuiz(m, Math.random() < CLIPPY_AI_PASS_CHANCE);
      }
    }
  }

  private resolveClippyQuiz(m: ClippyState & { owner: Owner }, pass: boolean): void {
    const time = this.arena.scene.time.now;
    if (!m.quiz) return;
    if (pass) {
      m.qText.setText('Correct! :)');
    } else {
      m.qText.setText('WRONG. >:(');
      for (const f of this.enemiesOf(m.owner)) {
        f.takeDamage(CLIPPY_FAIL_DMG);
        this.arena.spawnHitFlash(f.x, f.y, 0xbb88ff);
        this.arena.spawnFloatingText(f.x, f.y - 44, '📎 -20', '#cc66ff');
      }
    }
    if (m.owner === 'npc' && this.arena.isOnline) {
      this.arena.sendTechMsg({ t: 'tech', k: 'quiz', pass });
    }
    this.clearClippyQuiz(m, time);
  }

  private clearClippyQuiz(m: ClippyState, time: number): void {
    m.quiz = null;
    if (m.keyListener) { window.removeEventListener('keydown', m.keyListener); m.keyListener = null; }
    m.inputText.setText('');
    m.timerBar.setVisible(false);
    m.nextQuizAt = time + CLIPPY_QUIZ_INTERVAL_MS - CLIPPY_QUIZ_TIME_MS;
  }

  // ── Mad Pong ──

  private updatePong(m: PongState & { owner: Owner }, time: number, delta: number): void {
    const { width: W, height: H } = this.arena.scene.scale;

    if (time >= m.nextSplitAt) {
      m.nextSplitAt = time + PONG_SPLIT_MS;
      const existing = [...m.balls];
      for (const b of existing) {
        if (m.balls.length >= PONG_MAX_BALLS) break;
        const angle = Math.atan2(b.vy, b.vx) + Phaser.Math.FloatBetween(0.4, 0.9);
        m.balls.push(this.makePongBall(b.x, b.y, angle));
      }
    }

    const enemies = this.enemiesOf(m.owner);
    for (const b of m.balls) {
      b.x += b.vx * delta / 1000;
      b.y += b.vy * delta / 1000;
      if (b.x < 10 && b.vx < 0) b.vx = -b.vx;
      if (b.x > W - 10 && b.vx > 0) b.vx = -b.vx;
      if (b.y < 10 && b.vy < 0) b.vy = -b.vy;
      if (b.y > H - 10 && b.vy > 0) b.vy = -b.vy;

      for (const f of enemies) {
        if (Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) > 26) continue;
        const last = b.lastHitAt.get(f) ?? 0;
        if (time - last < PONG_HIT_CD_MS) continue;
        b.lastHitAt.set(f, time);
        f.takeDamage(PONG_DMG);
        this.arena.spawnHitFlash(f.x, f.y, 0xffffff);
        this.arena.spawnFloatingText(f.x, f.y - 44, '🏓 -10', '#ffffff');
      }
    }
  }

  // ── Upload (R) ────────────────────────────────────────────────────────

  doTechUploadCast(owner: Owner, tx: number, ty: number): void {
    if (this.cords[owner]) return;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    this.gesture(owner, 'tech-upload', angle);
    this.cords[owner] = {
      owner,
      state: 'traveling', x: caster.x, y: caster.y,
      vx: Math.cos(angle) * UPLOAD_SPEED, vy: Math.sin(angle) * UPLOAD_SPEED,
      parkX: tx, parkY: ty, expiresAt: 0,
    };
    this.fx(owner).bits(caster.x, caster.y, 4, {
      angle, spread: 0.5, speed: 140, size: 8, life: 300, depth: D_WORLD, drift: 0,
    });
  }

  private destroyCord(owner: Owner): void {
    const cord = this.cords[owner];
    if (!cord) return;
    // The plug is yanked and the connection drops.
    this.fx(owner).bits(cord.x, cord.y, 4, { speed: 110, size: 8, life: 300, depth: D_WORLD });
    this.cords[owner] = null;
  }

  private applyBoxed(victim: Fighter, casterOwner: Owner, time: number): void {
    if (casterOwner === 'player') this.arena.recordMasteryStat('cordHits', 1);
    const victimOwner: Owner | null =
      victim === this.arena.player ? 'player' : victim === this.arena.npc ? 'npc' : null;

    if (victimOwner) {
      this.boxedUntil[victimOwner] = time + UPLOAD_BOX_DURATION_MS;
      victim.setTint(0xcc8844);
    } else {
      victim.setTint(0xcc8844);
      const existing = this.boxedHusks.find((b) => b.f === victim);
      if (existing) {
        existing.until = time + UPLOAD_BOX_DURATION_MS;
      } else {
        this.boxedHusks.push({
          f: victim,
          until: time + UPLOAD_BOX_DURATION_MS,
        });
      }
    }
    // The crate slams shut round them and the grid snaps on underneath.
    const fx = this.fx(casterOwner);
    fx.crash(victim.x, victim.y, 54, { bits: 7, rings: 2, duration: 460, color: TECH.gold, mark: false });
    fx.ring(victim.x, victim.y, 60, 20, TECH.cyan, 320, D_UI, 2.4);
    this.arena.spawnFloatingText(victim.x, victim.y - 46, 'BOXED!', '#cc8844');

    // Trojan Takeover (R+): the caster stays wired in and steers the victim.
    if (this.arena.hasUpgrade(casterOwner, 'r')) {
      const body = victim.body as Phaser.Physics.Arcade.Body | null;
      const dir = body && Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 1
        ? (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)
          ? { x: Math.sign(body.velocity.x), y: 0 }
          : { x: 0, y: Math.sign(body.velocity.y) })
        : { x: casterOwner === 'player' ? 1 : -1, y: 0 };
      this.trojan[casterOwner] = {
        victim,
        until: time + UPLOAD_BOX_DURATION_MS,
        dir,
      };
      if (casterOwner === 'player') {
        this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 40, '🔌 TROJAN — arrow keys!', '#66eecc');
      }
    }
  }

  private updateCords(time: number, delta: number): void {
    for (const owner of OWNERS) {
      const cord = this.cords[owner];
      if (!cord) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;
      const hitTarget = (): Fighter | undefined =>
        this.enemiesOf(owner).find((f) => Phaser.Math.Distance.Between(cord.x, cord.y, f.x, f.y) <= UPLOAD_HIT_RADIUS);

      if (cord.state === 'traveling') {
        const prevX = cord.x, prevY = cord.y;
        cord.x += cord.vx * delta / 1000;
        cord.y += cord.vy * delta / 1000;
        const toParkPrev = (cord.parkX - prevX) * cord.vx + (cord.parkY - prevY) * cord.vy;
        const toParkNow = (cord.parkX - cord.x) * cord.vx + (cord.parkY - cord.y) * cord.vy;
        const reachedTarget = toParkPrev >= 0 && toParkNow < 0;
        const hit = hitTarget();
        if (hit) {
          this.applyBoxed(hit, owner, time);
          this.arena.spawnHitFlash(hit.x, hit.y, 0xff3355);
          this.destroyCord(owner);
          continue;
        }
        if (reachedTarget) {
          cord.x = cord.parkX; cord.y = cord.parkY;
          cord.state = 'parked';
          cord.expiresAt = time + UPLOAD_PARK_DURATION_MS;
        }
      } else {
        const hit = hitTarget();
        if (hit) {
          this.applyBoxed(hit, owner, time);
          this.arena.spawnHitFlash(hit.x, hit.y, 0xff3355);
          this.destroyCord(owner);
          continue;
        }
        if (time >= cord.expiresAt) {
          this.destroyCord(owner);
          continue;
        }
      }

      void caster;
    }
  }

  private updateBoxed(time: number): void {
    for (const owner of OWNERS) {
      const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
      if (time < this.boxedUntil[owner]) {
        const body = fighter.body as Phaser.Physics.Arcade.Body;
        if (Math.abs(body.velocity.x) > 0.01 && Math.abs(body.velocity.y) > 0.01) {
          if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) body.setVelocityY(0);
          else body.setVelocityX(0);
        }
      } else if (fighter.isTinted) {
        fighter.clearTint();
      }
    }

    for (let i = this.boxedHusks.length - 1; i >= 0; i--) {
      const b = this.boxedHusks[i];
      if (time >= b.until || !b.f.active || b.f.hp <= 0) {
        if (b.f.active) b.f.clearTint();
        this.boxedHusks.splice(i, 1);
        continue;
      }
      const body = b.f.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(body.velocity.x) > 0.01 && Math.abs(body.velocity.y) > 0.01) {
        if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) body.setVelocityY(0);
        else body.setVelocityX(0);
      }
    }
  }

  // ── Trojan Takeover (R+) ──────────────────────────────────────────────

  private updateTrojan(time: number): void {
    for (const casterOwner of OWNERS) {
      const t = this.trojan[casterOwner];
      if (!t) continue;
      if (time >= t.until || !t.victim.active || t.victim.hp <= 0) {
        this.trojan[casterOwner] = null;
        continue;
      }
      // The wire itself is painted by paintCords off this same state.

      // Force movement on the victim (their own sim is authoritative — a net
      // ghost keeps interpolating instead; the real steering happens peer-side).
      if (!t.victim.netGhost) {
        const body = t.victim.body as Phaser.Physics.Arcade.Body | null;
        const speed = t.victim.speed || 200;
        body?.setVelocity(t.dir.x * speed, t.dir.y * speed);
      }
    }
  }

  // ── Web Drag (F) ──────────────────────────────────────────────────────

  doTechWebDragCast(owner: Owner): void {
    const now = this.arena.scene.time.now;
    this.dragActive[owner] = true;
    this.dragExpiresAt[owner] = now + WEBDRAG_DURATION_MS;
    this.gesture(owner, 'tech-webdrag');
    // The cursor is being reassigned — a ring of bits reboots round the caster.
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.fx(owner).ring(caster.x, caster.y, 10, 52, TECH.mint, 420, D_WORLD, 2.6);
    this.fx(owner).bits(caster.x, caster.y, 6, {
      speed: 130, size: 8, life: 460, depth: D_WORLD, color: TECH.mint,
    });
    if (owner === 'player') {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, 'Drag mode!', '#66eecc');
      // Surf the web! (F+): also offer the browser (caster-local UI).
      if (this.arena.hasUpgrade('player', 'f') && !this.browserOpen && this.surfPopupObjs.length === 0) {
        this.showSurfPopup(now);
      }
    }
  }

  private handleWebDragPointer(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const isDown = pointer.leftButtonDown();
    const justDown = isDown && !this.dragPointerWasDown;
    const justUp = !isDown && this.dragPointerWasDown;
    this.dragPointerWasDown = isDown;

    if (justDown && !this.dragGrabbed && !this.browserOpen && !this.isPointerOverSurfPopup(mouseX, mouseY)) {
      if (Phaser.Math.Distance.Between(mouseX, mouseY, this.arena.npc.x, this.arena.npc.y) <= WEBDRAG_GRAB_RADIUS) {
        this.dragGrabbed = { kind: 'fighter', ref: this.arena.npc };
      } else if (this.cords.player && Phaser.Math.Distance.Between(mouseX, mouseY, this.cords.player.x, this.cords.player.y) <= WEBDRAG_GRAB_RADIUS) {
        this.dragGrabbed = { kind: 'cord', ref: this.cords.player };
      } else {
        const ad = this.ads.find((a) => Phaser.Math.Distance.Between(mouseX, mouseY, a.x, a.y) <= WEBDRAG_GRAB_RADIUS);
        if (ad) this.dragGrabbed = { kind: 'ad', ref: ad };
      }
    }

    if (isDown && this.dragGrabbed) {
      if (this.dragGrabbed.kind === 'fighter') {
        this.dragGrabbed.ref.setPosition(mouseX, mouseY);
        (this.dragGrabbed.ref.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (this.dragGrabbed.kind === 'cord') {
        this.dragGrabbed.ref.x = mouseX;
        this.dragGrabbed.ref.y = mouseY;
      } else {
        const ad = this.dragGrabbed.ref;
        ad.x = mouseX; ad.y = mouseY;
      }
    }

    if (justUp) this.dragGrabbed = null;

    if (!this.dragCursorIcon) {
      this.dragCursorIcon = this.arena.scene.add.text(mouseX, mouseY, '✋', { fontSize: '18px' }).setOrigin(0.5).setDepth(30);
    } else {
      this.dragCursorIcon.setPosition(mouseX, mouseY);
    }
  }

  private updateWebDrag(time: number): void {
    for (const owner of OWNERS) {
      if (this.dragActive[owner] && time >= this.dragExpiresAt[owner]) {
        this.dragActive[owner] = false;
        if (owner === 'player') {
          this.dragGrabbed = null;
          this.dragCursorIcon?.destroy();
          this.dragCursorIcon = null;
        }
      }
    }
    if (this.surfPopupObjs.length > 0 && time >= this.surfPopupUntil) this.closeSurfPopup();
  }

  // ── Surf the web! (F+) ────────────────────────────────────────────────

  private showSurfPopup(now: number): void {
    const scene = this.arena.scene;
    const { width: W } = scene.scale;
    const cx = W / 2, cy = 54;
    const w = 320, h = 76;
    this.surfPopupUntil = now + SURF_POPUP_LIFETIME_MS;
    this.surfPopupBounds = { x: cx - w / 2, y: cy - h / 2, w, h };

    const box = scene.add.rectangle(cx, cy, w, h, 0x223344, 0.95).setStrokeStyle(2, 0x66aadd).setDepth(44).setScrollFactor(0);
    const label = scene.add.text(cx, cy - 16, '🌐 Surf the web?', { fontSize: '16px', color: '#ddeeff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(45).setScrollFactor(0);
    const yes = scene.add.rectangle(cx - 60, cy + 18, 90, 26, 0x226644, 0.95).setStrokeStyle(1, 0x66ffaa).setDepth(45).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const yesLbl = scene.add.text(cx - 60, cy + 18, 'Yes!', { fontSize: '13px', color: '#aaffcc', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    const no = scene.add.rectangle(cx + 60, cy + 18, 90, 26, 0x663333, 0.95).setStrokeStyle(1, 0xff8888).setDepth(45).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const noLbl = scene.add.text(cx + 60, cy + 18, 'X', { fontSize: '13px', color: '#ffbbbb', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    yes.on('pointerdown', () => { this.closeSurfPopup(); this.openBrowser(); });
    no.on('pointerdown', () => this.closeSurfPopup());
    this.surfPopupObjs = [box, label, yes, yesLbl, no, noLbl];
  }

  private closeSurfPopup(): void {
    for (const o of this.surfPopupObjs) o.destroy();
    this.surfPopupObjs = [];
    this.surfPopupBounds = null;
    this.surfPopupUntil = 0;
  }

  private browserCenter(): { cx: number; cy: number } {
    const { width: W, height: H } = this.arena.scene.scale;
    return { cx: W / 2, cy: H / 2 - 10 };
  }

  private openBrowser(): void {
    if (this.browserOpen) return;
    this.browserOpen = true;
    this.browserCoins = 0;
    this.browserFactory = false;
    this.browserCoinAccum = 0;
    const scene = this.arena.scene;
    const { cx, cy } = this.browserCenter();

    const frame = scene.add.rectangle(cx, cy, BROWSER_W, BROWSER_H, 0x1a1a2a, 0.97).setStrokeStyle(3, 0x8899bb).setDepth(44).setScrollFactor(0);
    const titleBar = scene.add.rectangle(cx, cy - BROWSER_H / 2 + 14, BROWSER_W, 28, 0x2f2f4a, 1).setDepth(45).setScrollFactor(0);
    const title = scene.add.text(cx - BROWSER_W / 2 + 10, cy - BROWSER_H / 2 + 14, '🌐 NetScape Explorer', { fontSize: '13px', color: '#ccddee', fontFamily: 'monospace' }).setOrigin(0, 0.5).setDepth(46).setScrollFactor(0);
    const urlBar = scene.add.rectangle(cx, cy - BROWSER_H / 2 + 42, BROWSER_W - 24, 20, 0x0e0e18, 1).setStrokeStyle(1, 0x555577).setDepth(45).setScrollFactor(0);
    const url = scene.add.text(cx - BROWSER_W / 2 + 20, cy - BROWSER_H / 2 + 42, 'https://totally.legit.web', { fontSize: '11px', color: '#88aa88', fontFamily: 'monospace' }).setOrigin(0, 0.5).setDepth(46).setScrollFactor(0);
    this.browserCoinText = scene.add.text(cx + BROWSER_W / 2 - 12, cy - BROWSER_H / 2 + 14, '🪙 0', { fontSize: '13px', color: '#ffdd66', fontFamily: 'monospace' }).setOrigin(1, 0.5).setDepth(46).setScrollFactor(0);
    this.browserObjs = [frame, titleBar, title, urlBar, url, this.browserCoinText];
    this.showBrowserHome();
  }

  /** Full teardown of the window UI (does not fire the Door effect). */
  private destroyBrowser(): void {
    for (const o of this.browserContentObjs) o.destroy();
    this.browserContentObjs = [];
    for (const o of this.browserObjs) o.destroy();
    this.browserObjs = [];
    this.browserCoinText = null;
    this.browserOpen = false;
    this.wheelSpinning = false;
  }

  private clearBrowserContent(): void {
    for (const o of this.browserContentObjs) o.destroy();
    this.browserContentObjs = [];
    this.wheelSpinning = false;
  }

  private mkBrowserButton(x: number, y: number, w: number, h: number, label: string, color: number, cb: () => void): Phaser.GameObjects.GameObject[] {
    const scene = this.arena.scene;
    const rect = scene.add.rectangle(x, y, w, h, color, 0.9).setStrokeStyle(1, 0xffffff, 0.5).setDepth(45).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const lbl = scene.add.text(x, y, label, { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    rect.on('pointerdown', cb);
    rect.on('pointerover', () => rect.setAlpha(0.8));
    rect.on('pointerout', () => rect.setAlpha(1));
    return [rect, lbl];
  }

  private mkExitButton(): Phaser.GameObjects.GameObject[] {
    const { cx, cy } = this.browserCenter();
    return this.mkBrowserButton(cx - BROWSER_W / 2 + 44, cy + BROWSER_H / 2 - 24, 64, 22, '← back', 0x444466, () => this.showBrowserHome());
  }

  private updateBrowserCoinText(): void {
    this.browserCoinText?.setText(`🪙 ${this.browserCoins}`);
  }

  /** Every coin earned on the web — clicker, factory or wheel — counts toward the mastery. */
  private gainBrowserCoins(n: number): void {
    if (n <= 0) return;
    this.browserCoins += n;
    this.arena.recordMasteryStat('webCoins', n);
  }

  private showBrowserHome(): void {
    this.clearBrowserContent();
    const { cx, cy } = this.browserCenter();
    const bw = 190, bh = 54;
    this.browserContentObjs = [
      ...this.mkBrowserButton(cx - 105, cy - 24, bw, bh, '🪙 Coin clicker', 0x555522, () => this.showCoinClicker()),
      ...this.mkBrowserButton(cx + 105, cy - 24, bw, bh, '🥯 Grub-Shop', 0x225544, () => this.showGrubShop()),
      ...this.mkBrowserButton(cx - 105, cy + 44, bw, bh, '🎡 Wheel of fortune', 0x442266, () => this.showWheel()),
      ...this.mkBrowserButton(cx + 105, cy + 44, bw, bh, '🚪 Door', 0x662222, () => this.doorExit()),
    ];
  }

  private showCoinClicker(): void {
    this.clearBrowserContent();
    const scene = this.arena.scene;
    const { cx, cy } = this.browserCenter();
    const coin = scene.add.text(cx, cy + 14, '🪙', { fontSize: '84px' }).setOrigin(0.5).setDepth(46).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    coin.on('pointerdown', () => {
      this.gainBrowserCoins(1);
      this.updateBrowserCoinText();
      scene.tweens.add({ targets: coin, scaleX: 1.15, scaleY: 1.15, duration: 60, yoyo: true });
    });
    const hint = scene.add.text(cx, cy - 52, 'Click the coin!', { fontSize: '14px', color: '#ffdd66', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    this.browserContentObjs = [coin, hint, ...this.mkExitButton()];
  }

  private showGrubShop(): void {
    this.clearBrowserContent();
    const { cx, cy } = this.browserCenter();
    const items: Array<{ label: string; cost: number; buy: () => void }> = [
      {
        label: `💿 CD bagel — heal 25 (${BAGEL_COST}c)`,
        cost: BAGEL_COST,
        buy: () => {
          this.arena.player.heal(25);
          this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 40, '💿 +25', '#66ff88');
        },
      },
      {
        label: `🖱️ Gaming mouse — RGB +10% dmg (${MOUSE_COST}c)`,
        cost: MOUSE_COST,
        buy: () => {
          this.gamingMouseStacks.player++;
          if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'mouse', stacks: this.gamingMouseStacks.player });
          this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 40, `🖱️ RGB x${this.gamingMouseStacks.player}`, '#ff66ff');
        },
      },
      {
        label: `🏭 Coin factory — +1c/s (${FACTORY_COST}c)`,
        cost: FACTORY_COST,
        buy: () => { this.browserFactory = true; },
      },
    ];
    const objs: Phaser.GameObjects.GameObject[] = [];
    items.forEach((item, i) => {
      objs.push(...this.mkBrowserButton(cx, cy - 34 + i * 44, BROWSER_W - 60, 36, item.label, 0x225544, () => {
        if (this.browserCoins < item.cost) {
          this.flashBrowserMsg('Not enough coins!');
          return;
        }
        this.browserCoins -= item.cost;
        this.updateBrowserCoinText();
        item.buy();
        this.flashBrowserMsg('Purchased!');
      }));
    });
    this.browserContentObjs = [...objs, ...this.mkExitButton()];
  }

  private flashBrowserMsg(msg: string): void {
    const { cx, cy } = this.browserCenter();
    const t = this.arena.scene.add.text(cx, cy + BROWSER_H / 2 - 46, msg, { fontSize: '12px', color: '#ffff88', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(47).setScrollFactor(0);
    this.browserContentObjs.push(t);
    this.arena.scene.tweens.add({ targets: t, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  private showWheel(): void {
    this.clearBrowserContent();
    const scene = this.arena.scene;
    const { cx, cy } = this.browserCenter();
    const wheel = scene.add.text(cx, cy + 4, '🎡', { fontSize: '64px' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    const result = scene.add.text(cx, cy - 52, `Spin for ${WHEEL_SPIN_COST} coins!`, { fontSize: '14px', color: '#ddaaff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    const spinBtn = this.mkBrowserButton(cx + BROWSER_W / 2 - 70, cy + BROWSER_H / 2 - 24, 100, 22, `SPIN (${WHEEL_SPIN_COST}c)`, 0x663388, () => {
      if (this.wheelSpinning) return;
      if (this.browserCoins < WHEEL_SPIN_COST) { this.flashBrowserMsg('Not enough coins!'); return; }
      this.browserCoins -= WHEEL_SPIN_COST;
      this.updateBrowserCoinText();
      this.spinWheel(wheel, result);
    });
    this.browserContentObjs = [wheel, result, ...spinBtn, ...this.mkExitButton()];
  }

  private spinWheel(wheel: Phaser.GameObjects.Text, result: Phaser.GameObjects.Text): void {
    const scene = this.arena.scene;
    this.wheelSpinning = true;
    scene.tweens.add({ targets: wheel, angle: 720, duration: 1000, onComplete: () => wheel.setAngle(0) });
    const cycle = ['Win!', 'Lose', 'Heal!', 'Buff', 'Big Win!', 'Big Heal', '???'];
    let tick = 0;
    const cycler = scene.time.addEvent({
      repeat: 9,
      delay: 100,
      callback: () => { result.setText(cycle[tick++ % cycle.length]); },
    });
    scene.time.delayedCall(1050, () => {
      cycler.remove();
      this.wheelSpinning = false;
      if (!this.browserOpen || !result.active) return;
      this.applyWheelOutcome(result);
    });
  }

  private applyWheelOutcome(result: Phaser.GameObjects.Text): void {
    const now = this.arena.scene.time.now;
    const player = this.arena.player;
    if (Math.random() < 0.01) {
      this.adminJackpot.player = true;
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'jackpot' });
      result.setText('💥 JACKPOT! Admin = 999');
      result.setColor('#ffdd00');
      this.arena.scene.cameras.main.shake(300, 0.006);
      return;
    }
    result.setColor('#ddaaff');
    const roll = Phaser.Math.Between(0, 7);
    switch (roll) {
      case 0:
        this.gainBrowserCoins(10);
        result.setText('Win! +10 coins');
        break;
      case 1:
        this.gainBrowserCoins(25);
        result.setText('Big Win! +25 coins');
        break;
      case 2:
        this.browserCoins = Math.max(0, this.browserCoins - 10);
        result.setText('Lose… -10 coins');
        break;
      case 3:
        this.browserCoins = Math.max(0, this.browserCoins - 25);
        result.setText('Big Lose… -25 coins');
        break;
      case 4:
        player.heal(20);
        result.setText('Heal! +20 HP');
        break;
      case 5:
        player.heal(50);
        result.setText('Big Heal! +50 HP');
        break;
      case 6:
        this.wheelSpeedUntil = now + 5000;
        result.setText('Buff! +50% speed (5s)');
        break;
      case 7:
        this.wheelSpeedUntil = now + 12000;
        this.dmgBuffUntil.player = now + 12000;
        if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'buff', ms: 12000 });
        result.setText('Big Buff! speed+dmg (12s)');
        break;
    }
    this.updateBrowserCoinText();
  }

  private doorExit(): void {
    const coins = this.browserCoins;
    const { cx, cy } = this.browserCenter();
    this.destroyBrowser();
    this.browserCoins = 0;
    this.browserFactory = false;

    // Explosion flash where the window was.
    const burst = this.arena.scene.add.circle(cx, cy, 40, 0xffaa44, 0.8).setDepth(46).setScrollFactor(0);
    this.arena.scene.tweens.add({ targets: burst, scaleX: 4, scaleY: 4, alpha: 0, duration: 350, onComplete: () => burst.destroy() });
    this.arena.scene.cameras.main.shake(200, 0.005);

    this.spawnCoinBurst('player', this.arena.player.x, this.arena.player.y, coins);
    if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'door', coins });
  }

  private spawnCoinBurst(owner: Owner, x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = COIN_SPEED * Phaser.Math.FloatBetween(0.7, 1.3);
      const entry: CoinProj = {
        owner,
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        reg: null as unknown as RegisteredProjectile,
      };
      entry.reg = {
        owner,
        getX: () => entry.x,
        getY: () => entry.y,
        damage: COIN_DMG,
        steal: () => {
          const idx = this.coinProjs.indexOf(entry);
          if (idx >= 0) this.coinProjs.splice(idx, 1);
        },
      };
      this.coinProjs.push(entry);
      this.arena.projReg.add(entry.reg);
    }
    if (count > 0) this.arena.spawnFloatingText(x, y - 40, `💥 ${count} coins!`, '#ffdd44');
  }

  private updateCoinProjs(time: number, delta: number): void {
    void time;
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.coinProjs.length - 1; i >= 0; i--) {
      const c = this.coinProjs[i];
      c.x += c.vx * delta / 1000;
      c.y += c.vy * delta / 1000;
      const hit = this.enemiesOf(c.owner).find((f) => Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= 22);
      const out = c.x < -20 || c.x > W + 20 || c.y < -20 || c.y > H + 20;
      if (hit) {
        hit.takeDamage(COIN_DMG);
        this.arena.spawnHitFlash(hit.x, hit.y, 0xffdd44);
      }
      if (hit || out) {
        this.arena.projReg.remove(c.reg);
        this.coinProjs.splice(i, 1);
      }
    }
  }

  private updateBrowser(time: number, delta: number): void {
    void time;
    if (!this.browserOpen) return;
    if (this.browserFactory) {
      this.browserCoinAccum += delta;
      while (this.browserCoinAccum >= 1000) {
        this.browserCoinAccum -= 1000;
        this.gainBrowserCoins(1);
      }
      this.updateBrowserCoinText();
    }
  }

  // ── Admin Console (Q) ────────────────────────────────────────────────

  private renderAdminString(st: AdminState): string {
    const chars = st.target.split('').map((c, i) => (i === st.cursor ? `[${c}]` : c)).join('');
    return `${chars}  pts:${st.points}`;
  }

  doTechAdminCast(owner: Owner): void {
    const now = this.arena.scene.time.now;
    const st = this.admin[owner];
    this.gesture(owner, 'tech-admin');
    // Dropping to a console: the caster is visibly taken out of the simulation for 8s.
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.fx(owner).loading(caster.x, caster.y, 40, ADMIN_WINDOW_MS, {
      color: TECH.amber, depth: D_UI, follow: () => ({ x: caster.x, y: caster.y }),
    });
    this.fx(owner).glitch(caster.x, caster.y, 70, 60, TECH.amber, 520, D_UI);
    st.active = true;
    st.endAt = now + ADMIN_WINDOW_MS;
    st.points = this.adminJackpot[owner] ? 999 : 0;
    st.target = randomBinaryString(ADMIN_STRING_LEN);
    st.cursor = 0;
    st.nextTypeAt = now + Phaser.Math.Between(250, 450);
    st.typeRate = Phaser.Math.Between(250, 450);

    // Security Breach (Q+): schedule 3–4 glitches inside the console window.
    if (this.arena.hasUpgrade(owner, 'q')) {
      const count = Phaser.Math.Between(3, 4);
      const times: number[] = [];
      for (let i = 0; i < count; i++) times.push(now + Phaser.Math.Between(800, ADMIN_WINDOW_MS - 500));
      times.sort((a, b) => a - b);
      this.breachTimes[owner] = times;
    } else {
      this.breachTimes[owner] = [];
    }

    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    fighter.isInvincible = true;
    fighter.applyDisarm(ADMIN_WINDOW_MS);
    this.arena.scene.time.delayedCall(ADMIN_WINDOW_MS, () => { if (fighter.active) fighter.isInvincible = false; });

    const { width: SW, height: SH } = this.arena.scene.scale;
    st.box = this.arena.scene.add.rectangle(SW / 2, SH / 2, SW, SH, 0x220011, 0.85).setStrokeStyle(2, 0xff4444).setDepth(25).setScrollFactor(0);
    st.text = this.arena.scene.add.text(SW / 2, SH / 2, this.renderAdminString(st), {
      fontSize: '48px', color: '#ff6666', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(26).setScrollFactor(0);

    if (owner === 'player') {
      const listener = (e: KeyboardEvent) => {
        if (!st.active) return;
        if (e.key !== '0' && e.key !== '1') return;
        if (e.key === st.target[st.cursor]) {
          st.points++;
          st.cursor++;
          if (st.cursor >= st.target.length) { st.target = randomBinaryString(ADMIN_STRING_LEN); st.cursor = 0; }
        } else {
          st.points = Math.max(0, st.points - 1);
        }
        st.text?.setText(this.renderAdminString(st));
      };
      st.keyListener = listener;
      window.addEventListener('keydown', listener);
    }
  }

  private closeAdmin(owner: Owner): void {
    const st = this.admin[owner];
    st.active = false;
    if (st.keyListener) { window.removeEventListener('keydown', st.keyListener); st.keyListener = null; }
    st.box?.destroy(); st.box = null;
    st.text?.destroy(); st.text = null;
    this.breachTimes[owner] = [];
    this.applyAdminRewards(owner, st.points);
  }

  private applyJail(targetOwner: Owner, now: number): void {
    const fighter = targetOwner === 'player' ? this.arena.player : this.arena.npc;
    const w = 240, h = 240;
    this.jail[targetOwner] = { x: fighter.x, y: fighter.y, w, h, lastDmgAt: 0, expiresAt: now + 5000 };
    // A window slams open around them — the cell is a dialog box they cannot close.
    this.fx(opposite(targetOwner)).crash(fighter.x, fighter.y, 70, {
      bits: 10, rings: 2, duration: 520, color: TECH.alert, mark: false,
    });
    this.arena.spawnFloatingText(fighter.x, fighter.y - 40, 'JAILED', '#ff4444');
  }

  /**
   * The jail cell: a full-size error dialog with the victim inside it. Painted per frame so the
   * scanlines crawl and the walls flash on each contact — a static stroked rectangle read as
   * arena furniture rather than as something holding you.
   */
  private paintJail(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const owner of OWNERS) {
      const box = this.jail[owner];
      if (!box) continue;
      const hot = time - box.lastDmgAt < 220;
      windowPane(g, this.col(opposite(owner)), box.x, box.y, box.w, box.h, t,
        hot ? 0.55 : 0.32, {
          body: TECH.night, bar: TECH.alert, accent: hot ? TECH.white : TECH.alert, lines: 0,
        });
      // Bars across the opening, so it reads as a cell and not just a window.
      g.lineStyle(2.4, this.col(opposite(owner))(TECH.alert), hot ? 0.95 : 0.6);
      for (let i = 1; i < 7; i++) {
        const bx = box.x - box.w / 2 + (i / 7) * box.w;
        g.lineBetween(bx, box.y - box.h / 2 + 18, bx, box.y + box.h / 2);
      }
    }
  }

  private applyAdminRewards(owner: Owner, points: number): void {
    const now = this.arena.scene.time.now;
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const lines: string[] = [];

    if (points >= ADMIN_TIERS[0]) {
      fighter.isInvincible = true;
      this.arena.scene.time.delayedCall(5000, () => { if (fighter.active) fighter.isInvincible = false; });
      lines.push(';Invincible');
    }
    if (points >= ADMIN_TIERS[1]) {
      this.adminInvisibleUntil[owner] = now + 8000;
      fighter.setAlpha(0.2);
      this.arena.scene.time.delayedCall(8000, () => {
        if (fighter.active && this.adminInvisibleUntil[owner] <= this.arena.scene.time.now) fighter.setAlpha(1);
      });
      lines.push(';Invisible');
    }
    if (points >= ADMIN_TIERS[2]) {
      enemy.takeDamage(35);
      this.arena.spawnHitFlash(enemy.x, enemy.y, 0xff4444);
      this.arena.spawnDamageNumber(enemy.x, enemy.y, 35);
      lines.push(';kill');
    }
    if (points >= ADMIN_TIERS[3]) {
      this.applyJail(owner === 'player' ? 'npc' : 'player', now);
      lines.push(';Jail');
    }
    if (points >= ADMIN_TIERS[4]) {
      if (enemy.hp / enemy.maxHp < 0.15) enemy.takeDamage(9999, { pierce: true });
      if (owner === 'player') this.arena.recordMasteryStat('adminBans', 1);
      lines.push(';ban');
    }
    if (lines.length === 0) lines.push(';No admin privileges obtained');

    this.playConsoleLog(owner, lines);
  }

  private playConsoleLog(owner: Owner, lines: string[]): void {
    const prefix = owner === 'npc' ? 'enemy@admin:~$ ' : 'you@admin:~$ ';
    const { height: H } = this.arena.scene.scale;
    const baseX = 16;
    const baseY = H - 24 - lines.length * 16;
    lines.forEach((line, i) => {
      const text = this.arena.scene.add.text(baseX, baseY + i * 16, '', {
        fontSize: '12px', color: '#ff3333', fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setDepth(50).setScrollFactor(0);
      this.consoleLogTexts.push(text);
      this.arena.scene.time.delayedCall(i * 220, () => { if (text.active) text.setText(prefix + line); });
      this.arena.scene.time.delayedCall(i * 220 + 3200, () => {
        if (!text.active) return;
        this.arena.scene.tweens.add({ targets: text, alpha: 0, duration: 400, onComplete: () => text.destroy() });
      });
    });
  }

  // ── Security Breach (Q+) ──────────────────────────────────────────────

  private applyBreachGlitch(owner: Owner, st: AdminState): void {
    const scene = this.arena.scene;
    st.points += BREACH_POINTS;
    st.text?.setText(this.renderAdminString(st));
    scene.cameras.main.shake(160, 0.004);

    if (st.text) {
      const text = st.text;
      text.setColor('#00ffcc');
      scene.time.delayedCall(80, () => { if (text.active) text.setColor('#111111'); });
      scene.time.delayedCall(160, () => { if (text.active) text.setColor('#ff6666'); });
    }

    const { width: W, height: H } = scene.scale;
    const count = Phaser.Math.Between(3, 5);
    for (let i = 0; i < count; i++) {
      const msg = BREACH_TEXTS[Phaser.Math.Between(0, BREACH_TEXTS.length - 1)];
      const t = scene.add.text(Phaser.Math.Between(60, W - 60), Phaser.Math.Between(60, H - 60), msg, {
        fontSize: `${Phaser.Math.Between(16, 30)}px`, color: '#000000', fontFamily: 'monospace',
      }).setStroke('#33ff66', 3).setOrigin(0.5).setDepth(27).setScrollFactor(0)
        .setAngle(Phaser.Math.Between(-18, 18));
      scene.tweens.add({ targets: t, alpha: 0, duration: 1200, delay: 200, onComplete: () => t.destroy() });
    }
    if (owner === 'player') {
      this.arena.spawnFloatingText(this.arena.player.x, this.arena.player.y - 44, '⚡ +5 pts', '#33ff66');
    }
  }

  private updateAdmin(time: number): void {
    for (const owner of OWNERS) {
      const st = this.admin[owner];
      const fighter = owner === 'player' ? this.arena.player : this.arena.npc;

      if (st.active) {
        if (owner === 'npc' && time >= st.nextTypeAt) {
          st.nextTypeAt = time + st.typeRate;
          if (Math.random() < 0.82) {
            st.points++;
            st.cursor++;
            if (st.cursor >= st.target.length) { st.target = randomBinaryString(ADMIN_STRING_LEN); st.cursor = 0; }
          } else {
            st.points = Math.max(0, st.points - 1);
          }
        }

        const times = this.breachTimes[owner];
        while (times.length > 0 && time >= times[0]) {
          times.shift();
          this.applyBreachGlitch(owner, st);
        }

        if (time >= st.endAt) this.closeAdmin(owner);
      }

      if (this.adminInvisibleUntil[owner] > time) {
        if (!this.wasAdminInvisible[owner]) { this.wasAdminInvisible[owner] = true; fighter.setAlpha(0.2); }
      } else if (this.wasAdminInvisible[owner]) {
        this.wasAdminInvisible[owner] = false;
        fighter.setAlpha(1);
      }
    }
  }

  // ── Technology Mastery — VPN (passive) ────────────────────────────────

  /**
   * Ramps a movement speed bonus while the player keeps moving and drops it the instant
   * they stop. Caster-local: online opponents replicate by position, so there is nothing
   * to mirror on the victim sim.
   */
  private updateVpn(time: number, delta: number): void {
    void time;
    if (!this.arena.masteryActive) {
      if (this.vpnIndicatorShown) {
        this.arena.setStatusIndicator('vpn', null);
        this.vpnIndicatorShown = false;
      }
      this.vpnRamp = 0;
      this.vpnHasLastPos = false;
      return;
    }

    const player = this.arena.player;
    const moved = this.vpnHasLastPos
      ? Math.hypot(player.x - this.vpnLastX, player.y - this.vpnLastY)
      : 0;
    this.vpnLastX = player.x;
    this.vpnLastY = player.y;
    this.vpnHasLastPos = true;

    // Scale the epsilon by frame length so a slow frame isn't mistaken for movement.
    if (moved > VPN_MOVE_EPSILON * (delta / 16.67)) {
      this.vpnRamp = Math.min(1, this.vpnRamp + delta / VPN_RAMP_MS);
      this.spawnVpnTrail(delta);
    } else {
      this.vpnRamp = 0;
      this.vpnTrailAccum = 0;
    }

    const pct = Math.round(this.vpnRamp * VPN_MAX_BONUS * 100);
    if (pct > 0) {
      this.arena.setStatusIndicator('vpn', {
        name: 'VPN', emoji: '🌐', color: 0x2288cc,
        description: 'Private tunnel: your speed climbs the longer you keep moving. Stop and it resets to zero.',
        count: pct, suffix: '%', priority: 120,
      });
      this.vpnIndicatorShown = true;
    } else if (this.vpnIndicatorShown) {
      this.arena.setStatusIndicator('vpn', null);
      this.vpnIndicatorShown = false;
    }
  }

  /** Datastream behind the player — denser, larger, brighter and longer-lived as the ramp climbs. */
  private spawnVpnTrail(delta: number): void {
    const r = this.vpnRamp;
    this.vpnTrailAccum += delta;
    const interval = VPN_TRAIL_MAX_MS - (VPN_TRAIL_MAX_MS - VPN_TRAIL_MIN_MS) * r;
    if (this.vpnTrailAccum < interval) return;
    this.vpnTrailAccum = 0;

    const scene = this.arena.scene;
    const player = this.arena.player;
    // One column at rest, up to three side-by-side at full tunnel speed.
    const columns = 1 + Math.floor(r * 2.99);
    const life = 400 + 700 * r;
    const size = 11 + Math.round(5 * r);
    const color = r > 0.85 ? TECH.ice : r > 0.5 ? TECH.mint : TECH.phosphor;
    for (let i = 0; i < columns; i++) {
      const spread = columns === 1 ? 0 : (i - (columns - 1) / 2) * (10 + 8 * r);
      this.pfx.bit(player.x + spread, player.y + Phaser.Math.Between(-6, 6), color, 9, size, life);
    }
    void scene;
  }

  // ── Technology Mastery — Byte-Bomb (bindable) ─────────────────────────

  /** The slot Byte-Bomb is bound over this match, or null when it isn't bound anywhere. */
  private byteBombSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'byte-bomb') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Byte-Bomb is bound to a slot. */
  getByteBombCooldownRatio(time: number): number {
    return Math.min(1, (time - this.byteBombLastCastAt) / BYTE_BOMB_COOLDOWN_MS);
  }

  private tryCastByteBomb(tx: number, ty: number): void {
    const time = this.arena.scene.time.now;
    if (time - this.byteBombLastCastAt < BYTE_BOMB_COOLDOWN_MS) return;
    if (Date.now() < this.arena.player.disarmedUntil) return;
    this.byteBombLastCastAt = time;
    this.spawnByteBomb('player', tx, ty);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 34, '💣 BYTE-BOMB', '#66ddff');
    // Online: the opponent's sim owns their HP, so replay the bomb there too.
    this.arena.broadcastMasteryCast('byte-bomb');
  }

  /** Online replay: the remote technology player lobbed a Byte-Bomb — it must hurt the local player. */
  doNpcByteBomb(tx: number, ty: number): void {
    this.spawnByteBomb('npc', tx, ty);
  }

  private spawnByteBomb(owner: Owner, tx: number, ty: number): void {
    const scene = this.arena.scene;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    void scene;
    this.byteBombs.push({
      owner,
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * BYTE_BOMB_TRAVEL_SPEED,
      vy: Math.sin(angle) * BYTE_BOMB_TRAVEL_SPEED,
      destX: tx, destY: ty,
      flying: true,
      fuse: BYTE_BOMB_FUSE_MS,
    });
    this.fx(owner).bits(caster.x, caster.y, 4, {
      angle, spread: 0.5, speed: 150, size: 8, life: 320, depth: D_WORLD, drift: 0,
    });
  }

  /**
   * Rising-edge click on one of the player's own bombs — trims half a second off its fuse.
   * Returns true when the click was consumed so it doesn't also fire a cruncher.
   */
  private handleByteBombClick(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): boolean {
    const down = pointer.leftButtonDown();
    const rising = down && !this.byteBombPointerWasDown;
    this.byteBombPointerWasDown = down;
    if (!rising) return false;

    for (const b of this.byteBombs) {
      if (b.owner !== 'player') continue;
      if (Phaser.Math.Distance.Between(mouseX, mouseY, b.x, b.y) > BYTE_BOMB_RADIUS) continue;
      b.fuse = Math.max(0, b.fuse - BYTE_BOMB_CLICK_CUT_MS);
      this.arena.spawnFloatingText(b.x, b.y - 26, '-0.5s', '#66ddff');
      // Clicking the chip visibly knocks bits loose out of it.
      this.pfx.bits(b.x, b.y, 3, { speed: 90, size: 7, life: 260, depth: D_WORLD + 1, color: TECH.ice });
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'bytefuse' });
      return true;
    }
    return false;
  }

  private updateByteBombs(time: number, delta: number): void {
    for (let i = this.byteBombs.length - 1; i >= 0; i--) {
      const b = this.byteBombs[i];

      if (b.flying) {
        const prevX = b.x, prevY = b.y;
        b.x += b.vx * delta / 1000;
        b.y += b.vy * delta / 1000;
        // Overshoot test against the destination along the travel axis.
        const before = (b.destX - prevX) * b.vx + (b.destY - prevY) * b.vy;
        const after = (b.destX - b.x) * b.vx + (b.destY - b.y) * b.vy;
        if (before >= 0 && after < 0) {
          b.x = b.destX; b.y = b.destY;
          b.flying = false;
        }
      } else {
        b.fuse -= delta;
      }

      if (!b.flying && b.fuse <= 0) {
        this.detonateByteBomb(b, time);
        this.byteBombs.splice(i, 1);
      }
    }
  }

  /**
   * The bomb is a fat surface-mount chip: soldered legs down both sides, a plated face with
   * a scanline sweeping across it, a status LED, and the fuse ring draining around the whole
   * package. Everything blinks harder the closer the countdown gets to zero.
   */
  private drawByteBombFace(
    g: Phaser.GameObjects.Graphics, shadowG: Phaser.GameObjects.Graphics, b: ByteBomb, time: number,
  ): void {
    const tint = this.col(b.owner);
    const secs = Math.max(0, b.fuse / 1000);
    const frac = Phaser.Math.Clamp(b.fuse / BYTE_BOMB_FUSE_MS, 0, 1);
    // Blink rate climbs under 3s, then goes frantic under 1s.
    const rate = secs > 3 ? 500 : secs > 1 ? 220 : 100;
    const hot = Math.floor(time / rate) % 2 === 0;
    const danger = secs <= 3;
    const ringColor = tint(danger && hot ? TECH.alert : TECH.cyan);

    // Ground shadow — squashed while the packet is still in the air.
    shadowG.fillStyle(tint(TECH.night), b.flying ? 0.18 : 0.32);
    shadowG.fillEllipse(b.x, b.y + 20, b.flying ? 20 : 28, b.flying ? 5 : 8);

    // The package itself: a dark chip body under everything else.
    g.fillStyle(tint(secs <= 1 && hot ? TECH.plum : TECH.board), 0.95);
    g.fillCircle(b.x, b.y, 16);
    g.lineStyle(2, tint(TECH.cyan), 0.95);
    g.strokeCircle(b.x, b.y, 16);

    // Chip legs: three solder pins down each side, long enough to clear the fuse ring.
    g.lineStyle(2, tint(TECH.wire), 0.85);
    for (let i = -1; i <= 1; i++) {
      const ly = b.y + i * 8;
      g.lineBetween(b.x - 15, ly, b.x - 28, ly);
      g.lineBetween(b.x + 15, ly, b.x + 28, ly);
    }

    // Face plating: etched traces, plus a bright scanline sweeping top to bottom.
    g.lineStyle(1, tint(TECH.ice), 0.45);
    g.lineBetween(b.x - 12, b.y - 8, b.x + 12, b.y - 8);
    g.lineBetween(b.x - 12, b.y + 8, b.x + 12, b.y + 8);
    g.lineBetween(b.x - 12, b.y - 8, b.x - 12, b.y + 8);
    const sweepY = b.y - 11 + ((time / 6) % 22);
    g.lineStyle(2, tint(TECH.ice), 0.55);
    g.lineBetween(b.x - 11, sweepY, b.x + 11, sweepY);

    // Status LED, tucked into the top-left corner of the package away from the countdown.
    g.fillStyle(tint(hot ? (danger ? TECH.alert : TECH.phosphor) : TECH.steel), hot ? 1 : 0.7);
    g.fillCircle(b.x - 9, b.y - 11, 3);

    // The countdown, drawn as lit cells rather than typed — one per tenth still to run.
    const tenths = Math.min(10, Math.ceil(secs * 10) % 10 || (secs > 0 ? 10 : 0));
    g.fillStyle(tint(danger && hot ? TECH.alert : TECH.ice), 0.95);
    for (let d = 0; d < tenths; d++) {
      g.fillRect(b.x - 9 + (d % 5) * 4, b.y + (d < 5 ? 0 : 4.4), 2.6, 3);
    }
    // …and the whole seconds as bigger blocks above them.
    const whole = Math.min(8, Math.floor(secs));
    g.fillStyle(tint(danger && hot ? TECH.alert : TECH.phosphor), 0.95);
    for (let d = 0; d < whole; d++) {
      g.fillRect(b.x - 9 + (d % 4) * 5, b.y - 6 + (d < 4 ? 0 : 3), 3.4, 2.2);
    }

    // Fuse ring draining around the package.
    g.lineStyle(3, tint(TECH.night), 0.55);
    g.strokeCircle(b.x, b.y, 21);
    g.lineStyle(3, ringColor, 0.95);
    g.beginPath();
    g.arc(b.x, b.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
    g.strokePath();

    // Danger pulse: a faint ring breathing outward once the countdown goes red.
    if (danger) {
      const pulse = 24 + 7 * (1 - ((time % rate) / rate));
      g.lineStyle(2, tint(TECH.alert), 0.3);
      g.strokeCircle(b.x, b.y, pulse);
    }
  }

  private detonateByteBomb(b: ByteBomb, time: number): void {
    // A full crash: core, stepped shockwaves, the chip's own bits thrown clear, torn signal
    // and a burned-in rectangle where the package was.
    this.fx(b.owner).crash(b.x, b.y, BYTE_BOMB_BLAST_RADIUS, {
      bits: 16, rings: 3, duration: 620, color: TECH.cyan,
    });
    this.arena.scene.cameras.main.shake(180, 0.004);

    for (const target of this.enemiesOf(b.owner)) {
      if (Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) > BYTE_BOMB_BLAST_RADIUS) continue;
      target.takeDamage(BYTE_BOMB_DAMAGE, { source: b, sourceX: b.x, sourceY: b.y });
      this.arena.spawnHitFlash(target.x, target.y, 0x33aaee);
      this.applyLag(target, time);
    }
  }

  // ── Lag (Byte-Bomb debuff) ────────────────────────────────────────────

  private applyLag(target: Fighter, time: number): void {
    const until = time + LAG_DURATION_MS;
    target.laggedUntil = Math.max(target.laggedUntil, until);
    const existing = this.lagged.get(target);
    if (existing) {
      existing.until = Math.max(existing.until, until);
      return;
    }
    this.lagged.set(target, {
      until,
      history: [{ x: target.x, y: target.y, t: time }],
      sampleAccum: 0,
      nextEventAt: time + Phaser.Math.Between(600, 1400),
      freezeUntil: 0,
      cooldownFreezeUntil: 0,
      spinner: null,
      spinnerAngle: 0,
    });
    // Above the loading-circle band (y-58) so the two never stack on each other.
    this.arena.spawnFloatingText(target.x, target.y - 84, '📶 LAG', '#66ddff');
  }

  private updateLag(time: number, delta: number): void {
    if (this.lagged.size === 0) return;
    for (const [f, st] of this.lagged) {
      if (!f.active || f.hp <= 0 || time >= st.until) {
        st.spinner?.destroy();
        if (f.active) f.laggedUntil = 0;
        this.lagged.delete(f);
        continue;
      }
      f.laggedUntil = st.until;

      // Position history — the rubber-band rewinds to roughly a second ago.
      st.sampleAccum += delta;
      if (st.sampleAccum >= LAG_HISTORY_SAMPLE_MS) {
        st.sampleAccum = 0;
        st.history.push({ x: f.x, y: f.y, t: time });
        while (st.history.length > 0 && time - st.history[0].t > LAG_REWIND_MS * 1.5) st.history.shift();
      }

      if (time >= st.nextEventAt && time >= st.freezeUntil) {
        st.nextEventAt = time + Phaser.Math.Between(LAG_EVENT_MIN_GAP_MS, LAG_EVENT_MAX_GAP_MS);
        switch (Phaser.Math.Between(0, 2)) {
          case 0: this.lagRubberBand(f, st, time); break;
          case 1: this.lagFreeze(f, st, time); break;
          default: this.lagStallCooldowns(f, st, time); break;
        }
      }

      // Frozen: pinned in place under a spinning loading circle.
      if (time < st.freezeUntil) {
        if (!f.netGhost) (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
        st.spinnerAngle += delta * 0.009;
        this.drawLagSpinner(f, st);
      } else if (st.spinner) {
        st.spinner.destroy();
        st.spinner = null;
      }

      // Stalled cooldowns: push every stamp forward so nothing ticks down.
      if (time < st.cooldownFreezeUntil) f.shiftCooldowns(delta);
    }
  }

  private lagRubberBand(f: Fighter, st: LagState, time: number): void {
    if (f.netGhost) return; // remote replicas are interpolated; their own sim rewinds them
    let target = st.history[0];
    for (const h of st.history) {
      if (time - h.t >= LAG_REWIND_MS) target = h;
    }
    if (!target) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) < 12) return;

    // The rewind reads as packets travelling back up the wire to where you actually were.
    this.pfx.packet(f.x, f.y, target.x, target.y, { count: 5, duration: 320, depth: 12, color: TECH.ice });
    this.pfx.glitch(f.x, f.y, 44, 40, TECH.cyan, 300, 12);

    f.setPosition(target.x, target.y);
    st.history = [{ x: target.x, y: target.y, t: time }];
    this.arena.spawnFloatingText(f.x, f.y - 40, '⇤ rubber-band', '#66ddff');
  }

  private lagFreeze(f: Fighter, st: LagState, time: number): void {
    st.freezeUntil = time + LAG_FREEZE_MS;
    st.spinnerAngle = 0;
    // Below the fighter — the loading circle owns the space above their head.
    this.arena.spawnFloatingText(f.x, f.y + 36, '⏳ not responding', '#66ddff');
  }

  private lagStallCooldowns(f: Fighter, st: LagState, time: number): void {
    st.cooldownFreezeUntil = time + Phaser.Math.Between(3000, 4000);
    this.arena.spawnFloatingText(f.x, f.y - 40, '⌛ cooldowns stalled', '#66ddff');
  }

  /**
   * The classic buffering ring above the frozen fighter's head: a dark disc so it stays
   * readable over damage numbers, a track, and a bright arc chasing around it with a
   * fading tail behind the leading edge.
   */
  private drawLagSpinner(f: Fighter, st: LagState): void {
    if (!st.spinner) st.spinner = this.arena.scene.add.graphics().setDepth(24);
    const g = st.spinner;
    const cx = f.x;
    const cy = f.y - 58;
    const R = 13;
    g.clear();
    g.fillStyle(0x04121e, 0.75);
    g.fillCircle(cx, cy, R + 4);
    g.lineStyle(3, 0x1b4a6b, 0.9);
    g.strokeCircle(cx, cy, R);
    // Tail: three arc segments dimming away from the head of the sweep.
    for (let i = 0; i < 3; i++) {
      const a = st.spinnerAngle - i * 0.45;
      g.lineStyle(3, 0x66ddff, 0.9 - i * 0.28);
      g.beginPath();
      g.arc(cx, cy, R, a - 0.4, a, false);
      g.strokePath();
    }
    g.fillStyle(0xaaffff, 1);
    g.fillCircle(cx + Math.cos(st.spinnerAngle) * R, cy + Math.sin(st.spinnerAngle) * R, 2.6);
  }

  private updateJail(time: number): void {
    for (const owner of OWNERS) {
      const box = this.jail[owner];
      if (!box) continue;
      const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
      if (time >= box.expiresAt) {
        // The dialog closes and the bits go with it.
        this.fx(opposite(owner)).bits(box.x, box.y, 8, {
          speed: 200, size: 9, life: 420, depth: D_UI, color: TECH.alert,
        });
        this.jail[owner] = null;
        continue;
      }
      const minX = box.x - box.w / 2, maxX = box.x + box.w / 2;
      const minY = box.y - box.h / 2, maxY = box.y + box.h / 2;
      const outX = fighter.x < minX || fighter.x > maxX;
      const outY = fighter.y < minY || fighter.y > maxY;
      if (outX || outY) {
        fighter.setPosition(Phaser.Math.Clamp(fighter.x, minX, maxX), Phaser.Math.Clamp(fighter.y, minY, maxY));
        if (time - box.lastDmgAt >= 500) {
          fighter.takeDamage(5, { source: box, sourceX: box.x, sourceY: box.y });
          box.lastDmgAt = time;
        }
      }
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Ad boxes — pop-ups nailed to the floor, and the one thing Technology actually builds.
   * They are rectangles rather than points, so the circle is tested against the whole box.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.ads.length - 1; i >= 0; i--) {
      const ad = this.ads[i];
      if (ad.owner === exceptOwner) continue;
      const nx = Phaser.Math.Clamp(x, ad.x, ad.x + ad.w);
      const ny = Phaser.Math.Clamp(y, ad.y, ad.y + ad.h);
      if (Phaser.Math.Distance.Between(x, y, nx, ny) > radius) continue;
      // The box is a rectangle, so the corpse is reported at its middle rather than at the
      // clamped point, which would sit on whichever edge the ring happened to touch.
      report?.(ad.x + ad.w / 2, ad.y + ad.h / 2);
      this.ads.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
