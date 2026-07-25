import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { NetTechMsg } from '../../network/NetworkManager';
import { CustomStatus } from './StatusHudKit';

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
  state: 'traveling' | 'parked';
  x: number; y: number; vx: number; vy: number;
  parkX: number; parkY: number;
  expiresAt: number;
  head: Phaser.GameObjects.Arc;
  line: Phaser.GameObjects.Graphics;
}

interface AdBox {
  owner: Owner;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  x: number; y: number; w: number; h: number;
  expiresAt: number;
}

interface JailBox {
  graphics: Phaser.GameObjects.Graphics;
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
  sprite: Phaser.GameObjects.Text;
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
  sprite: Phaser.GameObjects.Arc;
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
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number; vx: number; vy: number;
  damage: number;
}

interface CoinProj {
  owner: Owner;
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number; vx: number; vy: number;
  reg: RegisteredProjectile;
}

interface TrojanState {
  victim: Fighter;
  until: number;
  dir: { x: number; y: number };
  wire: Phaser.GameObjects.Graphics;
}

interface BoxedHusk {
  f: Fighter;
  until: number;
  icon: Phaser.GameObjects.Text;
}

interface HuskVirus {
  f: Fighter;
  until: number;
  nextTickAt: number;
  icon: Phaser.GameObjects.Text;
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
  shell: Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Graphics;
  face: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
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
}

// ── TechnologyKit ─────────────────────────────────────────────────────────

export class TechnologyKit {
  // Addicting Cruncher
  private cruncherCd: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherDmg: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherSpeed: Record<Owner, number> = { player: 0, npc: 0 };
  private cruncherLastFireAt: Record<Owner, number> = { player: 0, npc: 0 };
  private crunchers: Array<{
    sprite: Phaser.GameObjects.Sprite;
    x: number; y: number; vx: number; vy: number;
    owner: Owner; damage: number; traveled: number; trailAccum: number;
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
  private virusIcon: Record<Owner, Phaser.GameObjects.Text | null> = { player: null, npc: null };
  private huskViruses: HuskVirus[] = [];
  private wasSheltered: Record<Owner, boolean> = { player: false, npc: false };

  // Palware (E+)
  private malware: Record<Owner, MalwareState | null> = { player: null, npc: null };
  private malwareCdUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private thrownBullets: ThrownBullet[] = [];

  // Upload
  private cords: Record<Owner, CordState | null> = { player: null, npc: null };
  private boxedUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private boxIcon: Record<Owner, Phaser.GameObjects.Text | null> = { player: null, npc: null };
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

  constructor(private arena: TechArenaApi) {}

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
    for (const c of this.crunchers) { c.sprite.destroy(); this.arena.projReg.remove(c.reg); }
    this.crunchers = [];
    this.cruncherCd = { player: 0, npc: 0 };
    this.cruncherDmg = { player: 0, npc: 0 };
    this.cruncherSpeed = { player: 0, npc: 0 };
    this.cruncherLastFireAt = { player: 0, npc: 0 };

    this.firewallInited = false;
    this.firewallCharges = { player: 0, npc: 0 };
    this.firewallRegenAt = { player: 0, npc: 0 };
    for (const o of this.firewallObjs) o.destroy();
    this.firewallObjs = [];
    this.firewallShownCharges = -1;

    for (const ad of this.ads) { ad.rect.destroy(); ad.label.destroy(); }
    this.ads = [];
    this.virusUntil = { player: 0, npc: 0 };
    this.virusNextTickAt = { player: 0, npc: 0 };
    for (const o of OWNERS) { this.virusIcon[o]?.destroy(); this.virusIcon[o] = null; }
    for (const v of this.huskViruses) v.icon.destroy();
    this.huskViruses = [];
    this.wasSheltered = { player: false, npc: false };
    this.arena.player.incomingDamageMultiplier = 1;
    this.arena.npc.incomingDamageMultiplier = 1;

    for (const o of OWNERS) this.destroyMalware(o);
    this.malwareCdUntil = { player: 0, npc: 0 };
    for (const b of this.thrownBullets) b.sprite.destroy();
    this.thrownBullets = [];

    this.destroyCord('player');
    this.destroyCord('npc');
    this.boxedUntil = { player: 0, npc: 0 };
    for (const o of OWNERS) {
      const f = o === 'player' ? this.arena.player : this.arena.npc;
      f.clearTint();
      this.boxIcon[o]?.destroy();
      this.boxIcon[o] = null;
    }
    for (const b of this.boxedHusks) b.icon.destroy();
    this.boxedHusks = [];
    for (const o of OWNERS) {
      this.trojan[o]?.wire.destroy();
      this.trojan[o] = null;
    }
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
    for (const c of this.coinProjs) { c.sprite.destroy(); this.arena.projReg.remove(c.reg); }
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
    for (const o of OWNERS) { this.jail[o]?.graphics.destroy(); this.jail[o] = null; }

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
    for (const b of this.byteBombs) this.destroyByteBomb(b);
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
  }

  /** Wheel of Fortune speed buff + the VPN mastery ramp — read in ArenaScene's speed-mult block. */
  getPlayerSpeedMult(): number {
    const wheel = this.arena.scene.time.now < this.wheelSpeedUntil ? 1.5 : 1;
    return wheel * (1 + this.vpnRamp * VPN_MAX_BONUS);
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
    const effectiveCd = Math.max(CRUNCHER_MIN_COOLDOWN, CRUNCHER_BASE_COOLDOWN * (1 - this.cruncherCd[owner] / 100));
    if (time - this.cruncherLastFireAt[owner] < effectiveCd) return;
    this.cruncherLastFireAt[owner] = time;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = CRUNCHER_BASE_SPEED * (1 + this.cruncherSpeed[owner] / 100);
    const mouseMult = 1 + this.gamingMouseStacks[owner] * 0.1;
    const buffMult = time < this.dmgBuffUntil[owner] ? 1.25 : 1;
    const damage = CRUNCHER_BASE_DAMAGE * (1 + this.cruncherDmg[owner] / 100) * mouseMult * buffMult;
    const sprite = this.arena.scene.add.sprite(caster.x, caster.y, 'proj-tech-cruncher').setRotation(angle).setDepth(14);
    const entry = {
      sprite, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      owner, damage, traveled: 0, trailAccum: 0,
      reg: null as unknown as RegisteredProjectile,
    };
    entry.reg = {
      owner,
      getX: () => entry.x,
      getY: () => entry.y,
      damage,
      steal: () => {
        entry.sprite.destroy();
        const idx = this.crunchers.indexOf(entry);
        if (idx >= 0) this.crunchers.splice(idx, 1);
      },
    };
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
  }

  private spawnBinaryTrail(x: number, y: number): void {
    const glyph = Math.random() < 0.5 ? '0' : '1';
    const text = this.arena.scene.add.text(x, y, glyph, { fontSize: '12px', color: '#33ff88', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(13);
    this.arena.scene.tweens.add({ targets: text, alpha: 0, y: y - 10, duration: 500, onComplete: () => text.destroy() });
  }

  private removeCruncher(i: number): void {
    const c = this.crunchers[i];
    this.arena.projReg.remove(c.reg);
    c.sprite.destroy();
    this.crunchers.splice(i, 1);
  }

  private updateCrunchers(time: number, delta: number): void {
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.crunchers.length - 1; i >= 0; i--) {
      const c = this.crunchers[i];
      c.x += c.vx * delta / 1000;
      c.y += c.vy * delta / 1000;
      c.sprite.setPosition(c.x, c.y);
      c.traveled += Math.hypot(c.vx, c.vy) * delta / 1000;

      // Gaming mouse (F+ Grub-Shop): RGB crunchers
      if (this.gamingMouseStacks[c.owner] > 0) {
        const hue = ((time / 4) + i * 40) % 360;
        c.sprite.setTint(Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color);
      }

      c.trailAccum += delta;
      if (c.trailAccum >= CRUNCHER_TRAIL_INTERVAL_MS) {
        c.trailAccum = 0;
        this.spawnBinaryTrail(c.x, c.y);
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
      const rect = this.arena.scene.add.rectangle(x, y, ADS_W, ADS_H, 0x2255aa, translucent ? 0.5 : 1)
        .setStrokeStyle(2, 0xffffff, translucent ? 0.5 : 0.9).setDepth(9);
      const label = this.arena.scene.add.text(x, y, '📢', { fontSize: '48px' }).setOrigin(0.5).setDepth(10).setAlpha(translucent ? 0.5 : 1);
      this.ads.push({ owner, rect, label, x, y, w: ADS_W, h: ADS_H, expiresAt: now + ADS_LIFETIME_MS });
    }

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
      if (!this.virusIcon[owner]) {
        this.virusIcon[owner] = this.arena.scene.add.text(fighter.x, fighter.y - 34, '🦠', { fontSize: '14px' }).setOrigin(0.5).setDepth(12);
      }
    } else {
      const existing = this.huskViruses.find((v) => v.f === fighter);
      if (existing) {
        existing.until = time + VIRUS_DURATION_MS;
      } else {
        this.huskViruses.push({
          f: fighter,
          until: time + VIRUS_DURATION_MS,
          nextTickAt: time + VIRUS_TICK_MS,
          icon: this.arena.scene.add.text(fighter.x, fighter.y - 34, '🦠', { fontSize: '14px' }).setOrigin(0.5).setDepth(12),
        });
      }
    }
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
        ad.rect.destroy(); ad.label.destroy();
        this.ads.splice(i, 1);
        continue;
      }
      const toucher = this.enemiesOf(ad.owner).find((f) => this.rectContains(ad, f.x, f.y));
      if (toucher) {
        const toucherOwner: Owner | null =
          toucher === this.arena.player ? 'player' : toucher === this.arena.npc ? 'npc' : null;
        this.applyVirus(toucher, toucherOwner, time);
        ad.rect.destroy(); ad.label.destroy();
        this.ads.splice(i, 1);
      }
    }

    for (const owner of OWNERS) {
      const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
      if (time < this.virusUntil[owner]) {
        this.virusIcon[owner]?.setPosition(fighter.x, fighter.y - 34);
        if (time >= this.virusNextTickAt[owner]) {
          this.virusNextTickAt[owner] = time + VIRUS_TICK_MS;
          this.virusTick(fighter);
        }
      } else if (this.virusIcon[owner]) {
        this.virusIcon[owner]!.destroy();
        this.virusIcon[owner] = null;
      }
    }

    for (let i = this.huskViruses.length - 1; i >= 0; i--) {
      const v = this.huskViruses[i];
      if (time >= v.until || !v.f.active || v.f.hp <= 0) {
        v.icon.destroy();
        this.huskViruses.splice(i, 1);
        continue;
      }
      v.icon.setPosition(v.f.x, v.f.y - 34);
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
      const sprite = scene.add.text(x, y, '🪿', { fontSize: '30px' }).setOrigin(0.5).setDepth(15);
      this.malware[owner] = {
        kind: 'goose', owner, expiresAt,
        sprite, x, y,
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
      sprite: this.arena.scene.add.circle(x, y, 8, 0xffffff).setStrokeStyle(2, 0xff4444, 0.9).setDepth(15),
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
      m.sprite.destroy();
      m.bulletIcon?.destroy();
    } else if (m.kind === 'clippy') {
      if (m.keyListener) window.removeEventListener('keydown', m.keyListener);
      for (const o of m.objs) o.destroy();
    } else {
      for (const b of m.balls) b.sprite.destroy();
    }
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
      g.sprite.setPosition(g.x, g.y);
      g.sprite.setFlipX(tx < g.x);
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
              sprite: scene.add.circle(g.x, g.y, 5, 0xffee66).setDepth(15),
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
      b.sprite.setPosition(b.x, b.y);
      const hit = this.enemiesOf(b.owner).find((f) => Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) <= 22);
      if (hit) {
        hit.takeDamage(b.damage);
        this.arena.spawnHitFlash(hit.x, hit.y, 0xffee66);
        b.sprite.destroy();
        this.thrownBullets.splice(i, 1);
      } else if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        b.sprite.destroy();
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
      b.sprite.setPosition(b.x, b.y);

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
    const head = this.arena.scene.add.circle(caster.x, caster.y, 8, 0xff3355).setStrokeStyle(2, 0xffffff, 0.9).setDepth(20);
    const line = this.arena.scene.add.graphics().setDepth(19);
    this.cords[owner] = {
      state: 'traveling', x: caster.x, y: caster.y,
      vx: Math.cos(angle) * UPLOAD_SPEED, vy: Math.sin(angle) * UPLOAD_SPEED,
      parkX: tx, parkY: ty, expiresAt: 0, head, line,
    };
  }

  private destroyCord(owner: Owner): void {
    const cord = this.cords[owner];
    if (!cord) return;
    cord.head.destroy();
    cord.line.destroy();
    this.cords[owner] = null;
  }

  private applyBoxed(victim: Fighter, casterOwner: Owner, time: number): void {
    if (casterOwner === 'player') this.arena.recordMasteryStat('cordHits', 1);
    const victimOwner: Owner | null =
      victim === this.arena.player ? 'player' : victim === this.arena.npc ? 'npc' : null;

    if (victimOwner) {
      this.boxedUntil[victimOwner] = time + UPLOAD_BOX_DURATION_MS;
      victim.setTint(0xcc8844);
      if (!this.boxIcon[victimOwner]) {
        this.boxIcon[victimOwner] = this.arena.scene.add.text(victim.x, victim.y - 34, '📦', { fontSize: '16px' }).setOrigin(0.5).setDepth(12);
      }
    } else {
      victim.setTint(0xcc8844);
      const existing = this.boxedHusks.find((b) => b.f === victim);
      if (existing) {
        existing.until = time + UPLOAD_BOX_DURATION_MS;
      } else {
        this.boxedHusks.push({
          f: victim,
          until: time + UPLOAD_BOX_DURATION_MS,
          icon: this.arena.scene.add.text(victim.x, victim.y - 34, '📦', { fontSize: '16px' }).setOrigin(0.5).setDepth(12),
        });
      }
    }
    this.arena.spawnFloatingText(victim.x, victim.y - 46, 'BOXED!', '#cc8844');

    // Trojan Takeover (R+): the caster stays wired in and steers the victim.
    if (this.arena.hasUpgrade(casterOwner, 'r')) {
      this.trojan[casterOwner]?.wire.destroy();
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
        wire: this.arena.scene.add.graphics().setDepth(19),
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

      cord.head.setPosition(cord.x, cord.y);
      cord.line.clear();
      cord.line.lineStyle(3, 0xff3355, 0.85);
      cord.line.lineBetween(caster.x, caster.y, cord.x, cord.y);
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
        this.boxIcon[owner]?.setPosition(fighter.x, fighter.y - 34);
      } else if (this.boxIcon[owner]) {
        fighter.clearTint();
        this.boxIcon[owner]!.destroy();
        this.boxIcon[owner] = null;
      }
    }

    for (let i = this.boxedHusks.length - 1; i >= 0; i--) {
      const b = this.boxedHusks[i];
      if (time >= b.until || !b.f.active || b.f.hp <= 0) {
        if (b.f.active) b.f.clearTint();
        b.icon.destroy();
        this.boxedHusks.splice(i, 1);
        continue;
      }
      const body = b.f.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(body.velocity.x) > 0.01 && Math.abs(body.velocity.y) > 0.01) {
        if (Math.abs(body.velocity.x) >= Math.abs(body.velocity.y)) body.setVelocityY(0);
        else body.setVelocityX(0);
      }
      b.icon.setPosition(b.f.x, b.f.y - 34);
    }
  }

  // ── Trojan Takeover (R+) ──────────────────────────────────────────────

  private updateTrojan(time: number): void {
    for (const casterOwner of OWNERS) {
      const t = this.trojan[casterOwner];
      if (!t) continue;
      if (time >= t.until || !t.victim.active || t.victim.hp <= 0) {
        t.wire.destroy();
        this.trojan[casterOwner] = null;
        continue;
      }
      const caster = casterOwner === 'player' ? this.arena.player : this.arena.npc;
      t.wire.clear();
      t.wire.lineStyle(2, 0x66eecc, 0.8);
      t.wire.lineBetween(caster.x, caster.y, t.victim.x, t.victim.y);

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
        ad.rect.setPosition(mouseX, mouseY);
        ad.label.setPosition(mouseX, mouseY);
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
        sprite: this.arena.scene.add.circle(x, y, 5, 0xffdd44).setStrokeStyle(1, 0xaa8822).setDepth(15),
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
          entry.sprite.destroy();
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
      c.sprite.setPosition(c.x, c.y);
      const hit = this.enemiesOf(c.owner).find((f) => Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= 22);
      const out = c.x < -20 || c.x > W + 20 || c.y < -20 || c.y > H + 20;
      if (hit) {
        hit.takeDamage(COIN_DMG);
        this.arena.spawnHitFlash(hit.x, hit.y, 0xffdd44);
      }
      if (hit || out) {
        this.arena.projReg.remove(c.reg);
        c.sprite.destroy();
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
    const gfx = this.arena.scene.add.graphics().setDepth(16);
    gfx.lineStyle(3, 0xff4444, 0.9);
    gfx.strokeRect(fighter.x - w / 2, fighter.y - h / 2, w, h);
    this.jail[targetOwner] = { graphics: gfx, x: fighter.x, y: fighter.y, w, h, lastDmgAt: 0, expiresAt: now + 5000 };
    this.arena.spawnFloatingText(fighter.x, fighter.y - 40, 'JAILED', '#ff4444');
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
    const color = r > 0.85 ? '#aaffff' : r > 0.5 ? '#66ffdd' : '#33ff88';
    for (let i = 0; i < columns; i++) {
      const spread = columns === 1 ? 0 : (i - (columns - 1) / 2) * (10 + 8 * r);
      const glyph = Math.random() < 0.5 ? '0' : '1';
      const text = scene.add.text(player.x + spread, player.y + Phaser.Math.Between(-6, 6), glyph, {
        fontSize: `${size}px`, color, fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(9).setAlpha(0.55 + 0.45 * r);
      scene.tweens.add({
        targets: text, alpha: 0, y: text.y + 14 + 20 * r, duration: life,
        onComplete: () => text.destroy(),
      });
    }
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
    const shadow = scene.add.graphics().setDepth(6);
    const shell = scene.add.circle(caster.x, caster.y, 16, 0x0d2740, 0.95)
      .setStrokeStyle(2, 0x33aaee, 0.95).setDepth(17);
    const face = scene.add.graphics().setDepth(18);
    const label = scene.add.text(caster.x, caster.y, '8.0', {
      fontSize: '13px', color: '#aaffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(19);
    this.byteBombs.push({
      owner,
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * BYTE_BOMB_TRAVEL_SPEED,
      vy: Math.sin(angle) * BYTE_BOMB_TRAVEL_SPEED,
      destX: tx, destY: ty,
      flying: true,
      fuse: BYTE_BOMB_FUSE_MS,
      shell, shadow, face, label,
    });
  }

  private destroyByteBomb(b: ByteBomb): void {
    b.shell.destroy();
    b.shadow.destroy();
    b.face.destroy();
    b.label.destroy();
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
      this.arena.scene.tweens.add({
        targets: [b.shell, b.label], scaleX: 1.25, scaleY: 1.25, duration: 70, yoyo: true,
      });
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

      const secs = Math.max(0, b.fuse / 1000);
      b.label.setText(secs.toFixed(1));
      b.shell.setPosition(b.x, b.y);
      b.label.setPosition(b.x, b.y);
      this.drawByteBombFace(b, time, secs);

      if (!b.flying && b.fuse <= 0) {
        this.detonateByteBomb(b, time);
        this.destroyByteBomb(b);
        this.byteBombs.splice(i, 1);
      }
    }
  }

  /**
   * The bomb is a fat surface-mount chip: soldered legs down both sides, a plated face with
   * a scanline sweeping across it, a status LED, and the fuse ring draining around the whole
   * package. Everything blinks harder the closer the countdown gets to zero.
   */
  private drawByteBombFace(b: ByteBomb, time: number, secs: number): void {
    const g = b.face;
    g.clear();
    const frac = Phaser.Math.Clamp(b.fuse / BYTE_BOMB_FUSE_MS, 0, 1);
    // Blink rate climbs under 3s, then goes frantic under 1s.
    const rate = secs > 3 ? 500 : secs > 1 ? 220 : 100;
    const hot = Math.floor(time / rate) % 2 === 0;
    const danger = secs <= 3;
    const ringColor = danger && hot ? 0xff5555 : 0x33aaee;

    // Ground shadow — squashed while the packet is still in the air.
    b.shadow.clear();
    b.shadow.fillStyle(0x000000, b.flying ? 0.18 : 0.32);
    b.shadow.fillEllipse(b.x, b.y + 20, b.flying ? 20 : 28, b.flying ? 5 : 8);

    // Chip legs: three solder pins down each side, long enough to clear the fuse ring.
    g.lineStyle(2, 0x99aabb, 0.85);
    for (let i = -1; i <= 1; i++) {
      const ly = b.y + i * 8;
      g.lineBetween(b.x - 15, ly, b.x - 28, ly);
      g.lineBetween(b.x + 15, ly, b.x + 28, ly);
    }

    // Face plating: etched traces, plus a bright scanline sweeping top to bottom.
    g.lineStyle(1, 0x66ddff, 0.45);
    g.lineBetween(b.x - 12, b.y - 8, b.x + 12, b.y - 8);
    g.lineBetween(b.x - 12, b.y + 8, b.x + 12, b.y + 8);
    g.lineBetween(b.x - 12, b.y - 8, b.x - 12, b.y + 8);
    const sweepY = b.y - 11 + ((time / 6) % 22);
    g.lineStyle(2, 0xaaffff, 0.55);
    g.lineBetween(b.x - 11, sweepY, b.x + 11, sweepY);

    // Status LED, tucked into the top-left corner of the package away from the countdown.
    g.fillStyle(hot ? (danger ? 0xff3322 : 0x33ff88) : 0x223344, hot ? 1 : 0.7);
    g.fillCircle(b.x - 9, b.y - 11, 3);

    // Fuse ring draining around the package.
    g.lineStyle(3, 0x112233, 0.55);
    g.strokeCircle(b.x, b.y, 21);
    g.lineStyle(3, ringColor, 0.95);
    g.beginPath();
    g.arc(b.x, b.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
    g.strokePath();

    // Danger pulse: a faint ring breathing outward once the countdown goes red.
    if (danger) {
      const pulse = 24 + 7 * (1 - ((time % rate) / rate));
      g.lineStyle(2, 0xff5555, 0.3);
      g.strokeCircle(b.x, b.y, pulse);
    }

    b.shell.setFillStyle(secs <= 1 && hot ? 0x442233 : 0x0d2740, 0.95);
    b.label.setColor(danger && hot ? '#ffdddd' : '#aaffff');
  }

  private detonateByteBomb(b: ByteBomb, time: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(b.x, b.y, BYTE_BOMB_BLAST_RADIUS * 0.35, 0x33aaee, 0.55)
      .setStrokeStyle(3, 0xaaffff, 0.9).setDepth(17);
    scene.tweens.add({
      targets: ring, scaleX: 2.9, scaleY: 2.9, alpha: 0, duration: 420,
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * BYTE_BOMB_BLAST_RADIUS;
      const glyph = scene.add.text(b.x, b.y, Math.random() < 0.5 ? '0' : '1', {
        fontSize: '15px', color: '#aaffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(18);
      scene.tweens.add({
        targets: glyph, x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, alpha: 0,
        duration: 480, onComplete: () => glyph.destroy(),
      });
    }
    scene.cameras.main.shake(180, 0.004);

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

    const scene = this.arena.scene;
    const trail = scene.add.graphics().setDepth(12);
    trail.lineStyle(2, 0x66ddff, 0.8);
    trail.lineBetween(f.x, f.y, target.x, target.y);
    scene.tweens.add({ targets: trail, alpha: 0, duration: 320, onComplete: () => trail.destroy() });

    const ghost = scene.add.circle(f.x, f.y, 14, 0x33aaee, 0.4).setDepth(11);
    scene.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });

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
        box.graphics.destroy();
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
}
