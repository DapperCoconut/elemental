import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { NetTechMsg } from '../../network/NetworkManager';
import { CustomStatus } from './StatusHudKit';
import {
  AD_VARIANTS, ArmGesture, TECH, TechAuraStyle, TechColorFn, TechnologyAura, TechnologyAvatar, TechnologyFx,
  bitTileLayered, crtButton, crtWindow, windowPane,
} from './TechnologyVisuals';
import { FONT_MONO } from '../../ui/Theme';
import { meterGain } from '../../combat/Meters';

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
// Each popup touched lets `BUGS_PER_POPUP` critters loose on the victim. They are harmless while
// they incubate, then every one of them drains until it is squashed.
const BUGS_PER_POPUP = 2;
const BUG_INCUBATE_MS = 2500;
const BUG_TICK_MS = 1000;
const BUG_TICK_DMG = 2;
const BUG_MAX_PER_VICTIM = 14;
const BUG_UI_SPEED = 95;
const BUG_BODY_SPEED = 42;
const BUG_CLICK_RADIUS = 24;
/** A bot swats a critter this long after it lands. A human has to click. */
const BUG_BOT_CLEAR_MS: [number, number] = [4500, 7500];

// ── Ransomware (E+) ─────────────────────────────────────────────────────────
const RANSOM_POPUPS = 3;
const RANSOM_CLICKS = 2;
const RANSOM_UI_SPEED = 215;
const RANSOM_BODY_SPEED = 80;
const RANSOM_BOT_CLEAR_MS: [number, number] = [8500, 11500];

// ── Zip Bomb (R) ──────────────────────────────────────────────────────────
const ZIP_SPEED = 150;
const ZIP_LIFETIME_MS = 9000;
const ZIP_HIT_RADIUS = 30;
/** The file skips backwards along its own path every so often — it is lagging too. */
const ZIP_BAND_GAP_MS: [number, number] = [1100, 1900];
const ZIP_BAND_BACK_MS = 420;
/** How fast a bot hauls its own file at the target while its Web Drag is up. */
const ZIP_BOT_DRAG_SPEED = 400;
const ZIP_RESTART_STUN_MS = 3000;
/** R+: the hit swells the victim's hitbox for as long as the lag lasts. */
const ZIP_SWELL = 1.33;

// ── Web Drag (F) ──────────────────────────────────────────────────────────
const WEBDRAG_DURATION_MS = 6000;
const WEBDRAG_GRAB_RADIUS = 42;

// ── Surf the web! (F+) ────────────────────────────────────────────────────
const SURF_POPUP_LIFETIME_MS = 6000;
// The PainClicker window: one skull to click, four one-time upgrades down its side.
const PAIN_WIN_W = 300;
const PAIN_WIN_H = 196;
const PAIN_BAR_H = 22;
const PAIN_DIVIDER_DX = 152;
const PAIN_SKULL_DX = 78;
const PAIN_SKULL_DY = 112;
const PAIN_BTN_DX = 224;
const PAIN_BTN_DY0 = 50;
const PAIN_BTN_STEP = 38;
const PAIN_BTN_W = 132;
const PAIN_BTN_H = 32;
/** Each bought once. `perSec` is pain (coins AND damage) generated every second. */
const PAIN_UPGRADES = [
  { id: 'harder', name: 'Harder clicks', blurb: '2/click', cost: 50, perSec: 0 },
  { id: 'farm', name: 'Pain farm', blurb: '+1/s', cost: 100, perSec: 1 },
  { id: 'factory', name: 'Pain factory', blurb: '+3/s', cost: 250, perSec: 3 },
  { id: 'soulution', name: 'The Soulution', blurb: '+10/s', cost: 500, perSec: 10 },
] as const;
type PainUpgradeId = (typeof PAIN_UPGRADES)[number]['id'];

// ── Admin Console (Q) ─────────────────────────────────────────────────────
const ADMIN_ABUSE_MAX = 100;
/** Q+ Admin Abuse: what a point of abuse costs in health once the bar is spent. */
const ADMIN_HP_PER_ABUSE = 0.4;
const ADMIN_OVERUSE_STEP = 0.1;
const ADMIN_COMMANDS = [
  { id: 'fling', cost: 10 },
  { id: 'jail', cost: 20 },
  { id: 'fly', cost: 20 },
  { id: 'kill', cost: 25 },
  { id: 'invis', cost: 25 },
  { id: 'give', cost: 50 },
  { id: 'speed', cost: 50 },
  { id: 'invincible', cost: 100 },
  { id: 'ban', cost: 100 },
] as const;
export type AdminCmd = (typeof ADMIN_COMMANDS)[number]['id'];
const ADMIN_CHEAPEST = 10;
const ADMIN_WIN_W = 330;
const ADMIN_WIN_H = 226;
const ADMIN_BAR_H = 22;
const ADMIN_BTN_W = 98;
const ADMIN_BTN_H = 38;
const ADMIN_BTN_DX = [60, 165, 270];
const ADMIN_BTN_DY = [82, 126, 170];
const ADMIN_FLING_SPEED = 950;
const ADMIN_FLING_MS = 300;
const ADMIN_JAIL_SIZE = 150;
const ADMIN_JAIL_MS = 3000;
const ADMIN_FLY_MS = 5000;
const ADMIN_FLY_SPEED = 1.4;
const ADMIN_KILL_DMG = 20;
const ADMIN_INVIS_MS = 5000;
const ADMIN_GIVE_MS = 10000;
const ADMIN_GUN_SPEED = 1.6;
const ADMIN_GUN_DMG = 1.5;
const ADMIN_SPEED_MS = 10000;
const ADMIN_SPEED_BONUS = 1.33;
const ADMIN_INVINCIBLE_MS = 5000;
const ADMIN_BAN_HP = 0.15;
/** The fake source each command scrolls into the corner. */
const ADMIN_CODE: Record<AdminCmd, string[]> = {
  fling: [';fling enemy', 'hrp.Velocity = Vector3.new(9e4, 9e4, 0)', '-- 1 player flung'],
  jail: [';jail enemy', 'local cell = Instance.new("Part", workspace)', 'cell.Anchored = true -- 3s'],
  fly: [';fly me', 'bodyGyro.P = 9e4; bodyVel.MaxForce = INF', '-- gravity: off'],
  kill: [';kill enemy', 'humanoid:TakeDamage(20)', '-- smite.lua OK'],
  invis: [';invis me', 'for _, p in parts do p.Transparency = 1 end', '-- nameplate hidden'],
  give: [';give me phaser', 'tool.Parent = me.Backpack', '-- PacBlaster loaded, 10s'],
  speed: [';speed me 1.33', 'humanoid.WalkSpeed *= 1.33', 'cooldownScale = 0.75'],
  invincible: [';god me', 'humanoid.MaxHealth = math.huge', '-- 5s of god mode'],
  ban: [';ban enemy', 'DataStore:SetAsync(uid, { banned = true })', 'enemy:Kick("Banned by admin")'],
};

// ── Technology Mastery — VPN (passive) ────────────────────────────────────
/** Continuous movement time needed to reach the full speed boost. */
const VPN_RAMP_MS = 5000;
const VPN_MAX_BONUS = 0.5;
/** Per-frame distance under which the player counts as standing still. */
const VPN_MOVE_EPSILON = 0.35;
const VPN_TRAIL_MAX_MS = 120;
const VPN_TRAIL_MIN_MS = 34;

// ── Technology Mastery — Glitch Abuse (passive) ───────────────────────────
/** How long you have to grind against a wall before the collision gives up. */
const GLITCH_RUB_MS = 450;
const GLITCH_WINDUP_MS = 520;
const GLITCH_LAUNCH_SPEED = 1500;
const GLITCH_LAUNCH_MAX_MS = 1100;
const GLITCH_COOLDOWN_MS = 3500;
const GLITCH_DAMAGE = 15;
const GLITCH_HIT_RADIUS = 38;

// ── Lag (Zip Bomb debuff) ─────────────────────────────────────────────────
const LAG_DURATION_MS = 10000;
/** How far back in time a rubber-band snaps you. */
const LAG_REWIND_MS = 1000;
const LAG_HISTORY_SAMPLE_MS = 100;
const LAG_FREEZE_MS = 1000;
const LAG_EVENT_MIN_GAP_MS = 1600;
const LAG_EVENT_MAX_GAP_MS = 2600;

interface AdBox {
  id: number;
  owner: Owner;
  x: number; y: number; w: number; h: number;
  /** Which fake advert this window is running. */
  variant: number;
  bornAt: number;
  expiresAt: number;
}

/** A virus critter (or the Ransomware bug) loose on one fighter. */
interface Bug {
  id: number;
  victim: Fighter;
  /** Whose popup it came out of. */
  owner: Owner;
  kind: 'virus' | 'ransom';
  /** Screen position on the local human's HUD; an offset from the body on anyone else. */
  x: number; y: number;
  tx: number; ty: number;
  heading: number;
  pauseUntil: number;
  bornAt: number;
  clicksLeft: number;
  hitAt: number;
  /** Bots swat theirs on a timer; 0 means somebody has to click it. */
  autoClearAt: number;
  phase: number;
}

interface ZipBomb {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  bornAt: number;
  expiresAt: number;
  nextBandAt: number;
  history: Array<{ x: number; y: number; t: number }>;
  sampleAccum: number;
  /** When and where it last rubber-banded from, for the afterimage. */
  bandAt: number; bandX: number; bandY: number;
  /** Online: the remote caster's file — drawn here, resolved on their machine. */
  replica: boolean;
  syncAccum: number;
}

interface JailBox {
  f: Fighter;
  /** Who locked them up. */
  owner: Owner;
  x: number; y: number; w: number; h: number;
  lastDmgAt: number;
  expiresAt: number;
}

interface AdminState {
  open: boolean;
  abuse: number;
  /** Q+ Admin Abuse: commands paid for in health so far this console. */
  overuse: number;
  closeAt: number;
  nextBotCmdAt: number;
}

function freshAdminState(): AdminState {
  return { open: false, abuse: 0, overuse: 0, closeAt: 0, nextBotCmdAt: 0 };
}

/** A command's set-piece: the smite beam, the ban hammer. */
interface AdminStrike {
  kind: 'kill' | 'ban';
  owner: Owner;
  x: number; y: number;
  bornAt: number;
}

interface GlitchState {
  phase: 'idle' | 'glitch' | 'launch';
  rubMs: number;
  startedAt: number;
  readyAt: number;
  /** Inward normal of the wall being abused. */
  nx: number; ny: number;
  baseX: number; baseY: number;
  dx: number; dy: number;
  hit: Set<Fighter>;
}

function freshGlitchState(): GlitchState {
  return { phase: 'idle', rubMs: 0, startedAt: 0, readyAt: 0, nx: 0, ny: 0, baseX: 0, baseY: 0, dx: 0, dy: 0, hit: new Set() };
}

type DragGrab = { kind: 'fighter'; ref: Fighter } | { kind: 'zip'; ref: ZipBomb } | { kind: 'ad'; ref: AdBox }
  | { kind: 'window'; offX: number; offY: number } | { kind: 'console'; offX: number; offY: number };

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
  'tech-zip': 'punch',
  'tech-webdrag': 'flex',
  'tech-admin': 'raise',
};

/** Depths for the kit's shared paint layers. */
const D_FLOOR = 6;    // grids, burn-ins, firewall border
const D_WORLD = 13;   // crunchers, the zip file, the phaser
const D_UI = 19;      // popups, cells and critters that sit over the fighters
const D_HUD = 60;     // critters crawling the local player's HUD

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
    owner: Owner; damage: number; traveled: number; trailAccum: number; gun: boolean;
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
  private adSeq = 1;
  /** One headline and one button label per live popup; pooled, because a cast opens twelve. */
  private adTexts = new Map<AdBox, { head: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text }>();
  private adTextPool: Array<{ head: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text }> = [];
  private wasSheltered: Record<Owner, boolean> = { player: false, npc: false };

  // Virus critters + Ransomware (E / E+)
  private bugs: Bug[] = [];
  private bugSeq = 1;
  private popupsTouched = new Map<Fighter, number>();
  private bugDrainAt = new Map<Fighter, number>();
  private bugPointerWasDown = false;
  private bugGfx: Phaser.GameObjects.Graphics | null = null;
  private ransomNote: Phaser.GameObjects.Text | null = null;

  // Zip Bomb (R)
  private zips: ZipBomb[] = [];
  /** R+: fighters whose `hitboxMult` currently carries the swell, and until when. */
  private swollen = new Map<Fighter, number>();
  /** Fighters sitting out a restart, held still until this time. */
  private rebooting = new Map<Fighter, number>();
  private botRestartAt = new Map<Fighter, number>();
  private lagClearedAt = new Map<Fighter, number>();
  private restartPromptObjs: Phaser.GameObjects.GameObject[] = [];
  private restartPromptBounds: { x: number; y: number; w: number; h: number } | null = null;
  private rebootObjs: Phaser.GameObjects.GameObject[] = [];

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
  /** Texts and hit rects pinned to the window, re-placed whenever web drag moves it. */
  private browserAnchors: Array<{ o: Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle; dx: number; dy: number }> = [];
  private browserOpen = false;
  /** The window's top-left, screen space. */
  private browserX = 0;
  private browserY = 0;
  private painCoins = 0;
  private painOwned = new Set<PainUpgradeId>();
  private painAutoAccum = 0;
  private painCoinText: Phaser.GameObjects.Text | null = null;
  private painRateText: Phaser.GameObjects.Text | null = null;
  private painUpgradeLabels = new Map<PainUpgradeId, Phaser.GameObjects.Text>();
  private skullPunchAt = -9999;

  // Admin Console
  private admin: Record<Owner, AdminState> = { player: freshAdminState(), npc: freshAdminState() };
  private adminObjs: Phaser.GameObjects.GameObject[] = [];
  private adminAnchors: Array<{ o: Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle; dx: number; dy: number }> = [];
  private adminX = 0;
  private adminY = 0;
  private adminBtnLabels = new Map<AdminCmd, Phaser.GameObjects.Text>();
  private adminAbuseText: Phaser.GameObjects.Text | null = null;
  private adminRefreshAt = 0;
  private adminInvisibleUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wasAdminInvisible: Record<Owner, boolean> = { player: false, npc: false };
  private flyUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wasFlying: Record<Owner, boolean> = { player: false, npc: false };
  private gunUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private speedUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wasSped: Record<Owner, boolean> = { player: false, npc: false };
  private invincibleUntil: Record<Owner, number> = { player: 0, npc: 0 };
  private wasInvincible: Record<Owner, boolean> = { player: false, npc: false };
  private flings: Array<{ f: Fighter; vx: number; vy: number; until: number }> = [];
  private strikes: AdminStrike[] = [];
  private jails: JailBox[] = [];
  /** The fake source scrolling up the bottom-right corner, typed out a character at a time. */
  private consoleLines: Array<{ text: Phaser.GameObjects.Text; full: string; startAt: number }> = [];
  /** Terminal backing plate behind the admin console log, repainted per frame. */
  private consoleGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Screen-space HUD chrome — CRT windows, key-cap buttons, the firewall chip — repainted every
   * frame so scanlines crawl and buttons light on hover. Each Graphics also lives in the objs
   * array of the UI it belongs to, so the existing teardown destroys it; dead entries are
   * dropped here on the next paint.
   */
  private chrome: { g: Phaser.GameObjects.Graphics; draw: (g: Phaser.GameObjects.Graphics, t: number) => void }[] = [];

  // Mastery requirement tracking
  private cruncherStreak = 0;

  // Technology Mastery — VPN (passive)
  private vpnRamp = 0;
  private vpnTrailAccum = 0;
  private vpnLastX = 0;
  private vpnLastY = 0;
  private vpnHasLastPos = false;
  private vpnIndicatorShown = false;

  // Technology Mastery — Glitch Abuse (passive)
  private glitch = freshGlitchState();

  // Lag (Zip Bomb debuff)
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
    // The PainClicker window (F+) is no shelter at all — you keep fighting while it is open.
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

  /** Drag mode is on for the player: the left button grabs and drops, it does not fire. */
  isPlayerDragMode(): boolean {
    return this.dragActive.player;
  }

  /** Fly and Speed from the admin console — read in ArenaScene's npc speed chain. */
  getNpcSpeedMult(): number {
    return this.adminSpeedMult('npc', this.arena.scene.time.now);
  }

  // ── Bot reads (side-effect-free; see the bot synergy contract in CLAUDE.md) ──

  /** The bot's console is already up — a second Q would only burn the charge. */
  npcConsoleOpen(): boolean { return this.admin.npc.open; }

  /** The target is inside ban range: opening the console now ends the match. */
  npcBanLive(): boolean {
    const p = this.arena.player;
    return !this.admin.npc.open && p.active && p.hp > 0 && p.hp / p.maxHp < ADMIN_BAN_HP;
  }

  /** The bot's own file is crawling across the arena and nothing is hauling it: Web Drag will. */
  npcZipAdrift(): boolean {
    return !this.dragActive.npc && this.zips.some((z) => z.owner === 'npc' && !z.replica);
  }

  /** The target cannot walk away right now (caged, rebooting, frozen by lag): a slow file lands. */
  npcTargetPinned(): boolean {
    const p = this.arena.player;
    const time = this.arena.scene.time.now;
    if (this.jails.some((j) => j.f === p)) return true;
    if ((this.rebooting.get(p) ?? 0) > time) return true;
    return (this.lagged.get(p)?.freezeUntil ?? 0) > time;
  }

  /** Remote tech event from the online peer, routed via OnlineKit → ArenaScene (x already un-mirrored). */
  handleNetMsg(msg: NetTechMsg): void {
    const time = this.arena.scene.time.now;
    switch (msg.k) {
      case 'ads':
        // The remote caster's popups, where they actually are on their screen.
        for (let i = 0; i + 1 < msg.p.length; i += 2) this.spawnAd('npc', msg.p[i], msg.p[i + 1], time, msg.id0 + i / 2);
        break;
      case 'adx': {
        const i = this.ads.findIndex((a) => a.owner === 'npc' && a.id === msg.id);
        if (i >= 0) this.popAd(i, true);
        break;
      }
      case 'mv': {
        if (msg.o === 'zip') {
          const z = this.zips.find((q) => q.owner === 'npc');
          if (z) { z.x = msg.x; z.y = msg.y; }
        } else {
          const ad = this.ads.find((a) => a.owner === 'npc' && a.id === msg.id);
          if (ad) { ad.x = msg.x; ad.y = msg.y; }
        }
        break;
      }
      case 'bugs':
        // Their popup caught us: the critters crawl OUR screen, and only we can click them.
        for (const id of msg.ids) this.spawnBug(this.arena.player, 'npc', 'virus', time, id);
        if (msg.ransom >= 0) this.spawnBug(this.arena.player, 'npc', 'ransom', time, msg.ransom);
        break;
      case 'bugx': {
        // The remote victim clicked one of the critters we put on them.
        const i = this.bugs.findIndex((b) => b.owner === 'player' && b.id === msg.id);
        if (i >= 0) this.hitBug(i, time);
        break;
      }
      case 'zipx': {
        const i = this.zips.findIndex((z) => z.owner === 'npc');
        if (i >= 0) {
          const z = this.zips[i];
          this.zips.splice(i, 1);
          if (msg.hit) this.zipLand('npc', this.arena.player, z.x, z.y, time, msg.big);
          else this.nfx.bits(z.x, z.y, 5, { speed: 110, size: 8, life: 320, depth: D_WORLD });
        }
        break;
      }
      case 'restart':
        // The remote victim took the restart: their lag is gone on our replica too.
        this.clearLag(this.arena.npc, time);
        this.rebooting.set(this.arena.npc, time + ZIP_RESTART_STUN_MS);
        this.rebootFx(this.arena.npc);
        break;
      case 'cmd':
        this.runAdminCommand('npc', msg.c);
        break;
      case 'console':
        this.admin.npc.open = msg.open;
        break;
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

  private fighterOf(owner: Owner): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** 'player' / 'npc' for the two duellists, null for a husk. */
  private ownerOf(f: Fighter): Owner | null {
    return f === this.arena.player ? 'player' : f === this.arena.npc ? 'npc' : null;
  }

  /** A fighter driven by the AI on this machine — not the local human, not a remote one. */
  private isBot(f: Fighter): boolean {
    return f !== this.arena.player && !(this.arena.isOnline && f === this.arena.npc);
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
    this.releaseAdTexts(true);
    this.wasSheltered = { player: false, npc: false };
    this.arena.player.incomingDamageMultiplier = 1;
    this.arena.npc.incomingDamageMultiplier = 1;

    this.bugs = [];
    this.popupsTouched.clear();
    this.bugDrainAt.clear();
    this.bugPointerWasDown = false;
    if (this.bugGfx?.active) this.bugGfx.destroy();
    this.bugGfx = null;
    if (this.ransomNote?.active) this.ransomNote.destroy();
    this.ransomNote = null;

    this.zips = [];
    for (const f of this.swollen.keys()) {
      f.hitboxMult /= ZIP_SWELL;
      if (f.active && f.body) f.applySizeMult();
    }
    this.swollen.clear();
    this.rebooting.clear();
    this.botRestartAt.clear();
    this.lagClearedAt.clear();
    this.closeRestartPrompt();
    for (const o of this.rebootObjs) o.destroy();
    this.rebootObjs = [];
    this.dragActive = { player: false, npc: false };
    this.dragExpiresAt = { player: 0, npc: 0 };
    this.dragGrabbed = null;
    this.dragCursorIcon?.destroy();
    this.dragCursorIcon = null;
    this.dragPointerWasDown = false;

    this.closeSurfPopup();
    this.destroyBrowser();
    this.painCoins = 0;
    this.painOwned.clear();
    this.painAutoAccum = 0;

    this.destroyAdminWindow();
    for (const o of OWNERS) {
      this.admin[o] = freshAdminState();
      const f = this.fighterOf(o);
      if (this.wasInvincible[o]) f.isInvincible = false;
      if (this.wasFlying[o]) { f.airborne = false; f.levitating = false; }
      f.techCooldownMult = 1;
    }
    this.adminInvisibleUntil = { player: 0, npc: 0 };
    this.wasAdminInvisible = { player: false, npc: false };
    this.flyUntil = { player: 0, npc: 0 };
    this.wasFlying = { player: false, npc: false };
    this.gunUntil = { player: 0, npc: 0 };
    this.speedUntil = { player: 0, npc: 0 };
    this.wasSped = { player: false, npc: false };
    this.invincibleUntil = { player: 0, npc: 0 };
    this.wasInvincible = { player: false, npc: false };
    this.flings = [];
    this.strikes = [];
    this.jails = [];

    for (const l of this.consoleLines) l.text.destroy();
    this.consoleLines = [];
    if (this.consoleGfx?.active) this.consoleGfx.destroy();
    this.consoleGfx = null;
    for (const c of this.chrome) if (c.g.active) c.g.destroy();
    this.chrome = [];

    this.cruncherStreak = 0;

    this.vpnRamp = 0;
    this.vpnTrailAccum = 0;
    this.vpnHasLastPos = false;
    if (this.vpnIndicatorShown) {
      this.arena.setStatusIndicator('vpn', null);
      this.vpnIndicatorShown = false;
    }

    this.glitch = freshGlitchState();

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

    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) player.castAbility('tech-ads', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) player.castAbility('tech-zip', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) player.castAbility('tech-webdrag', ctx);
    // A console that is already up is not paid for twice.
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey) && !this.admin.player.open) player.castAbility('tech-admin', ctx);

    if (this.dragActive.player) {
      this.handleWebDragPointer(pointer, mouseX, mouseY);
    } else {
      const disarmed = Date.now() < player.disarmedUntil;
      // The windows are small and you keep fighting round them: only a click ON one stays out of
      // the arena. Same for a critter — squashing it is the click.
      const overUi = this.isPointerOverBrowser(mouseX, mouseY) || this.isPointerOverSurfPopup(mouseX, mouseY)
        || this.isPointerOverAdmin(mouseX, mouseY) || this.isPointerOverRestartPrompt(mouseX, mouseY)
        || this.uiBugAt(mouseX, mouseY) >= 0;
      if (!disarmed && !overUi && pointer.leftButtonDown()) this.doTechCruncherFire('player', mouseX, mouseY);
    }
  }

  private isPointerOverSurfPopup(x: number, y: number): boolean {
    const b = this.surfPopupBounds;
    return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  private isPointerOverRestartPrompt(x: number, y: number): boolean {
    const b = this.restartPromptBounds;
    return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  // ── update ────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateCrunchers(time, delta);
    this.updateAdrenalineHud(time);
    this.updateFirewall(time);
    this.updateAds(time, delta);
    this.updateBugs(time, delta);
    this.updateZips(time, delta);
    this.updateSwell(time);
    this.updateWebDrag(time);
    this.updateBrowser(delta);
    this.updateAdmin(time);
    this.updateJail(time);
    this.updateVpn(time, delta);
    this.updateLag(time, delta);
    this.updateRestart(time);
    this.updateGlitchAbuse(time, delta);
    this.paintChrome(time);

    if (this.arena.elementId === 'technology') this.updateShelter('player');
    if (this.arena.npcElementId === 'technology') this.updateShelter('npc');

    // Everything the kit owns is repainted from scratch here, after the sim has moved it.
    this.paintWorld(time);
    this.updateAuras(delta, time);
    this.updateAvatars(delta);
  }

  // ── HUD chrome ────────────────────────────────────────────────────────────

  /** Make a screen-space Graphics repainted every frame by `draw`. */
  private addChrome(depth: number, draw: (g: Phaser.GameObjects.Graphics, t: number) => void): Phaser.GameObjects.Graphics {
    const g = this.arena.scene.add.graphics().setDepth(depth).setScrollFactor(0);
    draw(g, this.arena.scene.time.now / 1000);
    this.chrome.push({ g, draw });
    return g;
  }

  /** A transparent hit rectangle for a chrome-painted button; tracks hover in its data. */
  private hitRect(x: number, y: number, w: number, h: number, depth = 45): Phaser.GameObjects.Rectangle {
    const r = this.arena.scene.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(depth).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    r.setData('hover', false);
    r.on('pointerover', () => r.setData('hover', true));
    r.on('pointerout', () => r.setData('hover', false));
    return r;
  }

  private paintChrome(time: number): void {
    const t = time / 1000;
    for (let i = this.chrome.length - 1; i >= 0; i--) {
      const c = this.chrome[i];
      if (!c.g.active) { this.chrome.splice(i, 1); continue; }
      c.g.clear();
      c.draw(c.g, t);
    }

    // Admin console log: a dark terminal plate behind whichever lines are still on screen.
    const now = this.arena.scene.time.now;
    for (let i = this.consoleLines.length - 1; i >= 0; i--) {
      const l = this.consoleLines[i];
      if (!l.text.active) { this.consoleLines.splice(i, 1); continue; }
      const age = now - l.startAt;
      // Typed, not printed: a character every 14ms, then it sits, then it scrolls out.
      const shown = Phaser.Math.Clamp(Math.floor(age / 14), 0, l.full.length);
      const typing = shown < l.full.length;
      l.text.setText(l.full.slice(0, shown) + (typing && shown > 0 ? '█' : ''));
      const done = age - l.full.length * 14;
      if (done > 4200) { l.text.destroy(); this.consoleLines.splice(i, 1); continue; }
      l.text.setAlpha(done > 3600 ? 1 - (done - 3600) / 600 : 1);
    }
    const live = this.consoleLines.map((l) => l.text).filter((tx) => tx.active && tx.text !== '');
    if (live.length > 0) {
      if (!this.consoleGfx || !this.consoleGfx.active) {
        this.consoleGfx = this.arena.scene.add.graphics().setDepth(49).setScrollFactor(0);
      }
      const g = this.consoleGfx;
      g.clear();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, al = 0;
      for (const tx of live) {
        const b = tx.getBounds();
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
        al = Math.max(al, tx.alpha);
      }
      const px = x0 - 8, py = y0 - 6, pw = Math.max(x1 - x0 + 16, 300), ph = y1 - y0 + 12;
      g.fillStyle(this.pcol(TECH.night), 0.82 * al);
      g.fillRoundedRect(px, py, pw, ph, 4);
      g.fillStyle(this.pcol(TECH.alert), 0.06 * al);
      g.fillRect(px + 2, py + 2, pw - 4, ph - 4);
      g.fillStyle(this.pcol(TECH.night), 0.35 * al);
      for (let ly = py + ((t * 18) % 3); ly < py + ph; ly += 3) g.fillRect(px, ly, pw, 1);
      g.lineStyle(1.2, this.pcol(TECH.alert), 0.6 * al);
      g.strokeRoundedRect(px, py, pw, ph, 4);
      g.fillStyle(this.pcol(TECH.alert), al * (Math.sin(t * 9) > 0 ? 0.9 : 0.2));
      g.fillRect(px + pw - 9, py + ph - 9, 5, 2);
    } else if (this.consoleGfx?.active) {
      this.consoleGfx.clear();
    }
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
    this.paintCrunchers(world, t);
    this.paintZips(world, floor, time, t);
    this.paintGuns(world, t);
    this.paintAds(ui, time, t);
    this.paintSwell(ui, t);
    this.paintJail(ui, time, t);
    this.paintStrikes(ui, time, t);
    this.paintBugs(ui, time, t);
  }

  /** The colour a cruncher wears. */
  private cruncherColor(owner: Owner): number {
    return owner === 'player' ? TECH.phosphor : TECH.cyan;
  }

  private paintCrunchers(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const c of this.crunchers) {
      const ang = Math.atan2(c.vy, c.vx);
      if (c.gun) TechnologyFx.drawPacman(g, this.col(c.owner), c.x, c.y, ang, t, 1);
      else TechnologyFx.drawCruncher(g, this.col(c.owner), c.x, c.y, ang, t, this.cruncherColor(c.owner), 1);
    }
  }

  /** ;give — the phaser sits in the caster's hand for as long as the command lasts. */
  private paintGuns(g: Phaser.GameObjects.Graphics, t: number): void {
    const time = this.arena.scene.time.now;
    for (const owner of OWNERS) {
      if (time >= this.gunUntil[owner]) continue;
      const f = this.fighterOf(owner);
      if (!f.active || f.hp <= 0 || f.forceInvisible) continue;
      const foe = this.nearestEnemyOf(owner, f.x, f.y);
      const p = this.arena.scene.input.activePointer;
      const ang = owner === 'player'
        ? Math.atan2(p.worldY - f.y, p.worldX - f.x)
        : foe ? Math.atan2(foe.y - f.y, foe.x - f.x) : 0;
      const kick = Phaser.Math.Clamp(1 - (time - this.cruncherLastFireAt[owner]) / 110, 0, 1);
      TechnologyFx.drawPhaser(g, this.col(owner), f.x, f.y, ang, t, kick, Math.max(f.alpha, 0.3));
    }
  }

  private paintZips(g: Phaser.GameObjects.Graphics, floor: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const z of this.zips) {
      const tint = this.col(z.owner);
      const grow = Phaser.Math.Clamp((time - z.bornAt) / 220, 0, 1);
      // A rubber-band leaves the file where it *was* for a moment, torn and fading.
      const band = 1 - Phaser.Math.Clamp((time - z.bandAt) / 320, 0, 1);
      if (band > 0) TechnologyFx.drawZip(g, tint, z.bandX, z.bandY, t, 0.45 * band, 1, true);
      floor.fillStyle(tint(TECH.night), 0.3);
      floor.fillEllipse(z.x, z.y + 24, 34 * grow, 9 * grow);
      const held = this.dragGrabbed?.kind === 'zip' && this.dragGrabbed.ref === z;
      TechnologyFx.drawZip(g, tint, z.x, z.y + Math.sin(t * 3 + z.bornAt) * 2.5, t, 1, grow * (held ? 1.12 : 1), band > 0.5);
    }
  }

  /** R+: the selection marquee round a fighter whose hitbox has been unzipped a third bigger. */
  private paintSwell(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const f of this.swollen.keys()) {
      if (!f.active || f.hp <= 0) continue;
      const tint = this.col(f === this.arena.player ? 'npc' : 'player');
      const r = 24 * ZIP_SWELL + 2 * Math.sin(t * 5);
      g.fillStyle(tint(TECH.gold), 0.08);
      g.fillRect(f.x - r, f.y - r, r * 2, r * 2);
      // marching ants
      const dash = 7, per = r * 8, off = (t * 26) % (dash * 2);
      g.fillStyle(tint(TECH.amber), 0.9);
      for (let d = -off; d < per; d += dash * 2) {
        for (let k = 0; k < dash; k += 2.5) {
          const q = d + k;
          if (q < 0 || q >= per) continue;
          const side = Math.floor(q / (r * 2)), u = q % (r * 2);
          const px = side === 0 ? f.x - r + u : side === 1 ? f.x + r : side === 2 ? f.x + r - u : f.x - r;
          const py = side === 0 ? f.y - r : side === 1 ? f.y - r + u : side === 2 ? f.y + r : f.y + r - u;
          g.fillRect(px - 1, py - 1, 2, 2);
        }
      }
      // the four resize handles
      for (const [hx, hy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        g.fillStyle(tint(TECH.white), 0.95);
        g.fillRect(f.x + hx * r - 3, f.y + hy * r - 3, 6, 6);
        g.lineStyle(1, tint(TECH.night), 0.9);
        g.strokeRect(f.x + hx * r - 3, f.y + hy * r - 3, 6, 6);
      }
    }
  }

  /** Popups are painted as windows; their two lines of copy are real text riding on top. */
  private paintAds(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const ad of this.ads) {
      // Yours is a see-through overlay; the enemy's is opaque and squarely in the way.
      const mine = ad.owner === 'player';
      const pop = Phaser.Math.Clamp((time - ad.bornAt) / 160, 0, 1);
      const k = 0.4 + pop * 0.6;
      const alpha = mine ? 0.5 : 1;
      const lay = TechnologyFx.drawAd(g, this.col(ad.owner), ad.x, ad.y, ad.w * k, ad.h * k, t, alpha, mine, ad.variant);
      const v = AD_VARIANTS[ad.variant % AD_VARIANTS.length];
      let tx = this.adTexts.get(ad);
      if (!tx) {
        tx = this.adTextPool.pop() ?? this.makeAdTexts();
        tx.head.setText(v.head + '\n' + v.sub).setColor(v.ink).setVisible(true);
        tx.btn.setText(v.btn).setVisible(true);
        this.adTexts.set(ad, tx);
      }
      tx.head.setPosition(lay.headX, lay.headY).setScale(k).setAlpha(alpha * pop);
      tx.btn.setPosition(lay.btnX, lay.btnY).setScale(k).setAlpha(alpha * pop);
    }
    this.releaseAdTexts(false);
  }

  private makeAdTexts(): { head: Phaser.GameObjects.Text; btn: Phaser.GameObjects.Text } {
    const scene = this.arena.scene;
    const head = scene.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'bold', align: 'center',
      color: '#111111', wordWrap: { width: 86 }, lineSpacing: -1,
    }).setOrigin(0.5).setDepth(D_UI + 0.2);
    const btn = scene.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(D_UI + 0.2);
    return { head, btn };
  }

  /** Hand back the copy of every popup that has closed (or all of it, for a reset). */
  private releaseAdTexts(all: boolean): void {
    for (const [ad, tx] of this.adTexts) {
      if (!all && this.ads.includes(ad)) continue;
      this.adTexts.delete(ad);
      if (all || !tx.head.active) { tx.head.destroy(); tx.btn.destroy(); continue; }
      tx.head.setVisible(false);
      tx.btn.setVisible(false);
      this.adTextPool.push(tx);
    }
    if (all) {
      for (const tx of this.adTextPool) { tx.head.destroy(); tx.btn.destroy(); }
      this.adTextPool = [];
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
      if (time < this.invincibleUntil[owner]) {
        run(`${owner}-admin`, 'invincible', f, this.col(owner), 26, D_UI, 1, 0);
      }
      const sheltered = owner === 'player' ? this.isPlayerSheltered() : this.isNpcSheltered();
      if (sheltered) run(`${owner}-shelter`, 'shelter', f, this.col(owner), 22, D_UI, 1, 0);
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
      // The console visibly swells the rig — you are inside the machine while it is open.
      av.setIntensity(this.admin.player.open ? 1.25 : 1);
      av.update(delta, player.x, player.y - this.flyLift('player'), player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.arena.npcElementId === 'technology' && npc?.active && npc.hp > 0) {
      if (!this.npcAvatar) this.npcAvatar = new TechnologyAvatar(scene, this.ncol, 'npc');
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setIntensity(this.admin.npc.open ? 1.25 : 1);
      av.update(delta, npc.x, npc.y - this.flyLift('npc'), npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** The VPN mastery ramp, the Adrenaline dose and the console's Fly / Speed — read in ArenaScene's speed-mult block. */
  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    const adrenaline = 1 + this.adrenalineStacksFor('player', time) * ADRENALINE_SPEED_PER_STACK;
    return (1 + this.vpnRamp * VPN_MAX_BONUS) * adrenaline * this.adminSpeedMult('player', time);
  }

  private adminSpeedMult(owner: Owner, time: number): number {
    return (time < this.flyUntil[owner] ? ADMIN_FLY_SPEED : 1) * (time < this.speedUntil[owner] ? ADMIN_SPEED_BONUS : 1);
  }

  /** How far off the floor ;fly is holding this side's rig. */
  private flyLift(owner: Owner): number {
    const time = this.arena.scene.time.now;
    const left = this.flyUntil[owner] - time;
    if (left <= 0) return 0;
    const ease = Math.min(1, left / 300, (ADMIN_FLY_MS - left) / 300);
    return (14 + 3 * Math.sin(time / 180)) * Math.max(0, ease);
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
      CRUNCHER_BASE_COOLDOWN * (1 - this.cruncherCd[owner] / 100) * (wired ? ADRENALINE_WIRED_CD_MULT : 1))
      // ;speed — a third more shots a second.
      / (time < this.speedUntil[owner] ? ADMIN_SPEED_BONUS : 1);
    if (time - this.cruncherLastFireAt[owner] < effectiveCd) return;
    this.cruncherLastFireAt[owner] = time;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.onKitCast?.('tech-cruncher');
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    // ;give — the phaser throws faster, angrier, harder-hitting red pac-men.
    const gun = time < this.gunUntil[owner];
    const speed = CRUNCHER_BASE_SPEED * (1 + this.cruncherSpeed[owner] / 100) * (gun ? ADMIN_GUN_SPEED : 1);
    const damage = CRUNCHER_BASE_DAMAGE * (1 + this.cruncherDmg[owner] / 100) * (gun ? ADMIN_GUN_DMG : 1);
    this.gesture(owner, 'tech-cruncher', angle);
    const entry = {
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      owner, damage, traveled: 0, trailAccum: 0, gun,
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
          c.gun ? TECH.alert : this.cruncherColor(c.owner));
      }

      let hitTarget: Fighter | null = null;
      for (const t of this.enemiesOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= CRUNCHER_HIT_RADIUS * t.hitboxMult) { hitTarget = t; break; }
      }
      const outOfBounds = c.x < -20 || c.x > W + 20 || c.y < -20 || c.y > H + 20;

      if (hitTarget) {
        hitTarget.takeDamage(c.damage);
        this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, this.col(c.owner)(0x33ff88));
        this.bumpCruncher(c.owner, true);
        this.noteCruncherResolved(c.owner, true);
        this.removeCruncher(i);
      } else if (outOfBounds || c.traveled >= CRUNCHER_MAX_RANGE) {
        // Firewall (Click+): the first N misses are absorbed at the arena edge — no penalty.
        if (this.firewallCharges[c.owner] > 0) {
          this.firewallCharges[c.owner]--;
          const fx = Phaser.Math.Clamp(c.x, 10, W - 10);
          const fy = Phaser.Math.Clamp(c.y, 10, H - 10);
          this.arena.spawnHitFlash(fx, fy, this.col(c.owner)(0xff8822));
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
        gfx.lineStyle(5, this.pcol(0xff8822), alpha);
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
        // The charges chip: a little amber terminal with one brick per charge.
        const SH = this.arena.scene.scale.height;
        this.firewallObjs.push(this.addChrome(49, (cg, ct) => {
          const x = 6, y = SH - 34, w = 112, h = 28;
          cg.fillStyle(this.pcol(TECH.night), 0.55);
          cg.fillRoundedRect(x + 2, y + 3, w, h, 5);
          cg.fillStyle(this.pcol(TECH.steel), 0.95);
          cg.fillRoundedRect(x, y, w, h, 5);
          cg.fillStyle(this.pcol(TECH.night), 0.95);
          cg.fillRect(x + 4, y + 4, w - 8, h - 8);
          cg.fillStyle(this.pcol(TECH.night), 0.4);
          for (let ly = y + 4 + ((ct * 18) % 3); ly < y + h - 4; ly += 3) cg.fillRect(x + 4, ly, w - 8, 1);
          for (let i = 0; i < FIREWALL_CHARGES; i++) {
            const on = i < charges;
            const bx = x + 58 + i * 16, by = y + 8;
            cg.fillStyle(this.pcol(on ? TECH.rust : TECH.slate), on ? 0.95 : 0.6);
            cg.fillRect(bx, by, 13, 5);
            cg.fillRect(bx + (i % 2 ? 0 : 3), by + 6, 10, 5);
            if (on) {
              cg.fillStyle(this.pcol(TECH.amber), 0.35 + 0.25 * Math.sin(ct * 6 + i));
              cg.fillRect(bx, by, 13, 1.5);
            }
          }
          cg.lineStyle(1.2, this.pcol(TECH.rust), 0.75);
          cg.strokeRoundedRect(x, y, w, h, 5);
        }));
        this.firewallObjs.push(
          this.arena.scene.add.text(14, SH - 20, `FW ${charges}/${FIREWALL_CHARGES}`, {
            fontSize: '12px', color: '#ffaa55', fontFamily: FONT_MONO, fontStyle: 'bold',
            stroke: '#0a1218', strokeThickness: 2,
          }).setOrigin(0, 0.5).setDepth(50).setScrollFactor(0),
        );
      }
    }
  }

  // ── Overt Advertisement (E) ──────────────────────────────────────────────

  doTechAdsCast(owner: Owner): void {
    this.gesture(owner, 'tech-ads');
    // Online, the remote caster's popups arrive by message with their real positions — rolling
    // them again here would put twelve windows where the other screen has none.
    if (owner === 'npc' && this.arena.isOnline) return;
    const { width: W, height: H } = this.arena.scene.scale;
    const now = this.arena.scene.time.now;
    const id0 = this.adSeq;
    const pts: number[] = [];
    for (let i = 0; i < ADS_COUNT; i++) {
      const x = Phaser.Math.Between(70, W - 70);
      const y = Phaser.Math.Between(60, H - 60);
      this.spawnAd(owner, x, y, now, this.adSeq++);
      pts.push(x, y);
    }
    if (owner === 'player' && this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'ads', id0, p: pts });
  }

  private spawnAd(owner: Owner, x: number, y: number, now: number, id: number): void {
    this.ads.push({
      id, owner, x, y, w: ADS_W, h: ADS_H, variant: id % AD_VARIANTS.length,
      bornAt: now, expiresAt: now + ADS_LIFETIME_MS,
    });
  }

  /** Close one popup. `caught` is the close that happens because somebody walked into it. */
  private popAd(i: number, caught: boolean): void {
    const ad = this.ads[i];
    this.ads.splice(i, 1);
    if (caught) {
      this.fx(ad.owner).crash(ad.x, ad.y, 46, { bits: 8, rings: 1, duration: 420, color: TECH.plague, mark: false });
    } else {
      // Popups do not fade — they close.
      this.fx(ad.owner).bits(ad.x, ad.y, 5, { speed: 130, size: 9, life: 380, depth: D_UI, color: TECH.white });
    }
  }

  private updateAds(time: number, _delta: number): void {
    for (let i = this.ads.length - 1; i >= 0; i--) {
      const ad = this.ads[i];
      if (time >= ad.expiresAt) { this.popAd(i, false); continue; }
      // Online, a remote caster's popup is resolved on their machine against their replica of us.
      if (ad.owner === 'npc' && this.arena.isOnline) continue;
      const toucher = this.enemiesOf(ad.owner).find((f) => this.rectContains(ad, f.x, f.y));
      if (!toucher) continue;
      this.infect(toucher, ad.owner, time);
      if (ad.owner === 'player' && this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'adx', id: ad.id });
      this.popAd(i, true);
    }
  }

  // ── Virus critters + Ransomware (E / E+) ─────────────────────────────────
  //
  // A touched popup lets critters loose. On the human at this keyboard they crawl the HUD and
  // have to be clicked; on a bot or a husk they crawl the body and get swatted on a timer; on a
  // remote human they crawl the replica until that player's own clicks come back over the wire.

  private bugOnUi(b: Bug): boolean { return b.victim === this.arena.player; }

  /** A popup was touched: a couple of critters, and with E+ every third popup a Ransomware bug. */
  private infect(victim: Fighter, casterOwner: Owner, time: number): void {
    const touched = (this.popupsTouched.get(victim) ?? 0) + 1;
    this.popupsTouched.set(victim, touched);
    const ids: number[] = [];
    for (let i = 0; i < BUGS_PER_POPUP; i++) {
      const b = this.spawnBug(victim, casterOwner, 'virus', time);
      if (b) ids.push(b.id);
    }
    let ransom = -1;
    if (this.arena.hasUpgrade(casterOwner, 'e') && touched % RANSOM_POPUPS === 0) {
      ransom = this.spawnBug(victim, casterOwner, 'ransom', time)?.id ?? -1;
    }
    if (this.arena.isOnline && casterOwner === 'player' && victim === this.arena.npc) {
      this.arena.sendTechMsg({ t: 'tech', k: 'bugs', ids, ransom });
    }
    // Infection lands as a burst of corrupted cells and a tear across the victim.
    const fx = this.fx(casterOwner);
    fx.bits(victim.x, victim.y, 8, { speed: 150, size: 9, life: 620, depth: D_UI, color: ransom >= 0 ? TECH.alert : TECH.plague });
    fx.glitch(victim.x, victim.y, 60, 48, ransom >= 0 ? TECH.alert : TECH.plague, 420, D_UI);
  }

  private spawnBug(victim: Fighter, casterOwner: Owner, kind: Bug['kind'], time: number, id?: number): Bug | null {
    if (kind === 'virus'
      && this.bugs.filter((b) => b.victim === victim && b.kind === 'virus').length >= BUG_MAX_PER_VICTIM) return null;
    const onUi = victim === this.arena.player;
    const { width: W, height: H } = this.arena.scene.scale;
    let x: number, y: number;
    if (onUi) {
      // They walk in off the edge of the monitor.
      const edge = Phaser.Math.Between(0, 3);
      x = edge === 0 ? -14 : edge === 1 ? W + 14 : Phaser.Math.Between(20, W - 20);
      y = edge === 2 ? -14 : edge === 3 ? H + 14 : Phaser.Math.Between(20, H - 20);
    } else {
      x = Phaser.Math.Between(-18, 18);
      y = Phaser.Math.Between(-18, 18);
    }
    const clear = kind === 'ransom' ? RANSOM_BOT_CLEAR_MS : BUG_BOT_CLEAR_MS;
    const bug: Bug = {
      id: id ?? this.bugSeq++, victim, owner: casterOwner, kind,
      x, y, tx: x, ty: y, heading: Math.random() * Math.PI * 2, pauseUntil: 0,
      bornAt: time, clicksLeft: kind === 'ransom' ? RANSOM_CLICKS : 1, hitAt: -9999,
      autoClearAt: this.isBot(victim) ? time + Phaser.Math.Between(clear[0], clear[1]) : 0,
      phase: Math.random() * 10,
    };
    this.pickBugWaypoint(bug);
    this.bugs.push(bug);
    return bug;
  }

  private pickBugWaypoint(b: Bug): void {
    if (!this.bugOnUi(b)) {
      const r = b.kind === 'ransom' ? 30 : 24;
      const a = Math.random() * Math.PI * 2, d = Math.random() * r;
      b.tx = Math.cos(a) * d;
      b.ty = Math.sin(a) * d;
      return;
    }
    const { width: W, height: H } = this.arena.scene.scale;
    const roll = Math.random();
    // The ordinary ones keep to the furniture — the ability tray, the bars along the top — which
    // is what makes them a nuisance to pick off. Ransomware goes wherever it likes.
    if (b.kind === 'ransom' || roll > 0.72) {
      b.tx = Phaser.Math.Between(30, W - 30);
      b.ty = Phaser.Math.Between(30, H - 30);
    } else if (roll < 0.45) {
      b.tx = Phaser.Math.Between(40, W - 40);
      b.ty = Phaser.Math.Between(H - 84, H - 14);
    } else {
      b.tx = Phaser.Math.Between(40, W - 40);
      b.ty = Phaser.Math.Between(12, 72);
    }
  }

  /** Index of the HUD critter under a screen point, or -1. Ransomware is checked first. */
  private uiBugAt(x: number, y: number): number {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < this.bugs.length; i++) {
      const b = this.bugs[i];
      if (!this.bugOnUi(b)) continue;
      const d = Phaser.Math.Distance.Between(x, y, b.x, b.y) - (b.kind === 'ransom' ? 12 : 0);
      if (d <= BUG_CLICK_RADIUS && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  /** One click (or one swat) on a critter. Ransomware takes two. */
  private hitBug(i: number, time: number): void {
    const b = this.bugs[i];
    b.clicksLeft--;
    b.hitAt = time;
    const onUi = this.bugOnUi(b);
    const wx = onUi ? b.x : b.victim.x + b.x;
    const wy = onUi ? b.y : b.victim.y + b.y;
    const color = b.kind === 'ransom' ? TECH.alert : TECH.plague;
    const fx = this.fx(b.owner);
    if (b.clicksLeft > 0) {
      // Cracked, not dead: it bolts.
      fx.bits(wx, wy, 3, { speed: 120, size: 7, life: 260, depth: onUi ? D_HUD : D_UI, color });
      this.pickBugWaypoint(b);
      b.pauseUntil = 0;
      return;
    }
    fx.bits(wx, wy, 7, { speed: 170, size: 8, life: 420, depth: onUi ? D_HUD : D_UI, color });
    fx.ring(wx, wy, 4, 22, color, 240, onUi ? D_HUD : D_UI, 2);
    this.bugs.splice(i, 1);
  }

  private updateBugs(time: number, delta: number): void {
    // Clicks are read here rather than in handleInput: the victim is usually NOT the Technology
    // player, and their kit's input never comes through this one.
    const pointer = this.arena.scene.input.activePointer;
    const down = pointer.leftButtonDown();
    const rising = down && !this.bugPointerWasDown;
    this.bugPointerWasDown = down;
    if (rising && this.bugs.length > 0) {
      const i = this.uiBugAt(pointer.worldX, pointer.worldY);
      if (i >= 0) {
        const b = this.bugs[i];
        if (this.arena.isOnline && b.owner === 'npc') this.arena.sendTechMsg({ t: 'tech', k: 'bugx', id: b.id });
        this.hitBug(i, time);
      }
    }

    const draining = new Map<Fighter, number>();
    const wall = Date.now();
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.victim.active || b.victim.hp <= 0) { this.bugs.splice(i, 1); continue; }
      if (b.autoClearAt > 0 && time >= b.autoClearAt) {
        // A bot's second swat at Ransomware comes a beat after the first.
        if (b.clicksLeft > 1) b.autoClearAt = time + 700;
        this.hitBug(i, time);
        continue;
      }

      const onUi = this.bugOnUi(b);
      const speed = b.kind === 'ransom'
        ? (onUi ? RANSOM_UI_SPEED : RANSOM_BODY_SPEED)
        : (onUi ? BUG_UI_SPEED : BUG_BODY_SPEED);
      if (time >= b.pauseUntil) {
        const dx = b.tx - b.x, dy = b.ty - b.y;
        const d = Math.hypot(dx, dy);
        if (d < 3) {
          this.pickBugWaypoint(b);
          // Scuttle, stop, scuttle — an insect, not a cursor.
          if (b.kind === 'virus') b.pauseUntil = time + Phaser.Math.Between(120, 700);
        } else {
          const want = Math.atan2(dy, dx) + Math.sin(time / 130 + b.phase) * 0.5;
          b.heading = Phaser.Math.Angle.RotateTo(b.heading, want, delta * 0.012);
          const step = Math.min(d, speed * delta / 1000);
          b.x += Math.cos(b.heading) * step;
          b.y += Math.sin(b.heading) * step;
        }
      }

      if (b.kind === 'ransom') {
        // Files encrypted: nothing but the click works while it lives.
        b.victim.silencedUntil = Math.max(b.victim.silencedUntil, wall + 250);
      } else if (time - b.bornAt >= BUG_INCUBATE_MS) {
        draining.set(b.victim, (draining.get(b.victim) ?? 0) + 1);
      }
    }

    // One bite a second for the whole swarm, so six critters are one number and not six.
    for (const [f, n] of draining) {
      const next = this.bugDrainAt.get(f);
      if (next === undefined) { this.bugDrainAt.set(f, time + BUG_TICK_MS); continue; }
      if (time < next) continue;
      this.bugDrainAt.set(f, time + BUG_TICK_MS);
      f.takeDamage(n * BUG_TICK_DMG);
    }
    for (const f of [...this.bugDrainAt.keys()]) if (!draining.has(f)) this.bugDrainAt.delete(f);
  }

  private paintBugs(world: Phaser.GameObjects.Graphics, time: number, t: number): void {
    const hasUi = this.bugs.some((b) => this.bugOnUi(b));
    if (hasUi && (!this.bugGfx || !this.bugGfx.active)) {
      this.bugGfx = this.arena.scene.add.graphics().setDepth(D_HUD).setScrollFactor(0);
    }
    const hud = this.bugGfx?.active ? this.bugGfx : null;
    hud?.clear();
    let ransomOnUi = false;
    for (const b of this.bugs) {
      const onUi = this.bugOnUi(b);
      const g = onUi ? hud : world;
      if (!g) continue;
      const x = onUi ? b.x : b.victim.x + b.x;
      const y = onUi ? b.y : b.victim.y + b.y;
      const hungry = b.kind === 'virus' && time - b.bornAt >= BUG_INCUBATE_MS;
      const flinch = Phaser.Math.Clamp(1 - (time - b.hitAt) / 160, 0, 1);
      const moving = time >= b.pauseUntil;
      const scale = (onUi ? 1 : 0.62) * (b.kind === 'ransom' ? 1.5 : 1) * (1 + 0.25 * flinch);
      TechnologyFx.drawBug(g, this.col(b.owner), x, y, b.heading, t + b.phase, scale,
        b.kind === 'ransom', hungry, moving, b.kind === 'ransom' && b.clicksLeft < RANSOM_CLICKS);
      if (onUi && b.kind === 'ransom') ransomOnUi = true;
    }

    // The ransom note: the one piece of text, because it is the instruction.
    if (ransomOnUi) {
      const { width: W, height: H } = this.arena.scene.scale;
      if (!this.ransomNote || !this.ransomNote.active) {
        this.ransomNote = this.arena.scene.add.text(W / 2, H - 118, '🔒 ABILITIES ENCRYPTED — click the red bug twice', {
          fontSize: '13px', color: '#ffd0d0', fontFamily: FONT_MONO, fontStyle: 'bold',
          stroke: '#1a0006', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(D_HUD + 1).setScrollFactor(0);
      }
      const b = this.ransomNote.getBounds();
      if (hud) {
        hud.fillStyle(0x1a0006, 0.82);
        hud.fillRoundedRect(b.x - 10, b.y - 5, b.width + 20, b.height + 10, 4);
        hud.lineStyle(1.5, TECH.alert, 0.6 + 0.35 * Math.sin(t * 7));
        hud.strokeRoundedRect(b.x - 10, b.y - 5, b.width + 20, b.height + 10, 4);
      }
    } else if (this.ransomNote) {
      this.ransomNote.destroy();
      this.ransomNote = null;
    }
  }

  // ── Zip Bomb (R) ──────────────────────────────────────────────────────

  doTechZipCast(owner: Owner, tx: number, ty: number): void {
    const caster = this.fighterOf(owner);
    const now = this.arena.scene.time.now;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    this.gesture(owner, 'tech-zip', angle);
    // One file per caster: a second cast replaces whatever is still crawling.
    this.zips = this.zips.filter((z) => z.owner !== owner);
    const x = caster.x + Math.cos(angle) * 24, y = caster.y + Math.sin(angle) * 24;
    this.zips.push({
      owner, x, y,
      vx: Math.cos(angle) * ZIP_SPEED, vy: Math.sin(angle) * ZIP_SPEED,
      bornAt: now, expiresAt: now + ZIP_LIFETIME_MS,
      nextBandAt: now + Phaser.Math.Between(ZIP_BAND_GAP_MS[0], ZIP_BAND_GAP_MS[1]),
      history: [], sampleAccum: 0,
      bandAt: -9999, bandX: x, bandY: y,
      replica: owner === 'npc' && this.arena.isOnline,
      syncAccum: 0,
    });
    this.fx(owner).bits(caster.x, caster.y, 4, {
      angle, spread: 0.5, speed: 140, size: 8, life: 300, depth: D_WORLD, drift: 0, color: TECH.amber,
    });
  }

  private updateZips(time: number, delta: number): void {
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.zips.length - 1; i >= 0; i--) {
      const z = this.zips[i];
      const held = this.dragGrabbed?.kind === 'zip' && this.dragGrabbed.ref === z;
      const gone = time >= z.expiresAt || z.x < -30 || z.x > W + 30 || z.y < -30 || z.y > H + 30;
      if (gone) {
        this.fx(z.owner).bits(z.x, z.y, 5, { speed: 110, size: 8, life: 320, depth: D_WORLD, color: TECH.amber });
        if (z.owner === 'player' && this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'zipx', hit: false, big: false });
        if (held) this.dragGrabbed = null;
        this.zips.splice(i, 1);
        continue;
      }

      // A bot with Web Drag up hauls its own file straight at the target — the same play a human
      // makes with the mouse.
      const hauled = !z.replica && z.owner === 'npc' && this.dragActive.npc;
      if (hauled) {
        const foe = this.nearestEnemyOf('npc', z.x, z.y);
        if (foe) {
          const a = Math.atan2(foe.y - z.y, foe.x - z.x);
          z.vx = Math.cos(a) * ZIP_SPEED;
          z.vy = Math.sin(a) * ZIP_SPEED;
          z.x += Math.cos(a) * ZIP_BOT_DRAG_SPEED * delta / 1000;
          z.y += Math.sin(a) * ZIP_BOT_DRAG_SPEED * delta / 1000;
        }
      } else if (!held) {
        z.x += z.vx * delta / 1000;
        z.y += z.vy * delta / 1000;
      }

      if (z.replica) continue;

      // The file is on a bad connection of its own: every so often it snaps back up its path.
      if (held || hauled) {
        z.history.length = 0;
        z.nextBandAt = Math.max(z.nextBandAt, time + 500);
      } else {
        z.sampleAccum += delta;
        if (z.sampleAccum >= 70) {
          z.sampleAccum = 0;
          z.history.push({ x: z.x, y: z.y, t: time });
          while (z.history.length > 0 && time - z.history[0].t > 1200) z.history.shift();
        }
        if (time >= z.nextBandAt) {
          z.nextBandAt = time + Phaser.Math.Between(ZIP_BAND_GAP_MS[0], ZIP_BAND_GAP_MS[1]);
          let back: { x: number; y: number; t: number } | null = null;
          for (const h of z.history) if (time - h.t >= ZIP_BAND_BACK_MS) back = h;
          if (back) {
            z.bandAt = time; z.bandX = z.x; z.bandY = z.y;
            this.fx(z.owner).glitch(z.x, z.y, 40, 36, TECH.amber, 260, D_WORLD);
            z.x = back.x; z.y = back.y;
            z.history.length = 0;
          }
        }
      }

      const hit = this.enemiesOf(z.owner).find((f) =>
        Phaser.Math.Distance.Between(z.x, z.y, f.x, f.y) <= ZIP_HIT_RADIUS * f.hitboxMult);
      if (hit) {
        if (z.owner === 'player') this.arena.recordMasteryStat('cordHits', 1);
        const big = this.arena.hasUpgrade(z.owner, 'r');
        if (z.owner === 'player' && this.arena.isOnline) {
          this.arena.sendTechMsg({ t: 'tech', k: 'zipx', hit: hit === this.arena.npc, big });
        }
        if (held) this.dragGrabbed = null;
        this.zips.splice(i, 1);
        this.zipLand(z.owner, hit, z.x, z.y, time, big);
        continue;
      }

      if (z.owner === 'player' && this.arena.isOnline) {
        z.syncAccum += delta;
        if (z.syncAccum >= 100) {
          z.syncAccum = 0;
          this.arena.sendTechMsg({ t: 'tech', k: 'mv', o: 'zip', id: 0, x: z.x, y: z.y });
        }
      }
    }
  }

  /** The archive opens on somebody: ten seconds of lag, the restart offer, and with R+ the swell. */
  private zipLand(casterOwner: Owner, target: Fighter, x: number, y: number, time: number, big: boolean): void {
    const fx = this.fx(casterOwner);
    // It decompresses: far more comes out than could ever have fitted in.
    fx.crash(target.x, target.y, 70, { bits: 18, rings: 2, duration: 520, color: TECH.amber, mark: false });
    fx.packet(x, y, target.x, target.y, { count: 6, duration: 220, depth: D_UI, color: TECH.gold });
    this.arena.spawnHitFlash(target.x, target.y, this.col(casterOwner)(TECH.amber));
    this.applyLag(target, time);
    if (big) this.swell(target, time + LAG_DURATION_MS);

    if (target === this.arena.player) {
      this.showRestartPrompt();
    } else if (target === this.arena.npc && this.isBot(target)) {
      // A bot weighs it up for a moment, and takes the restart about half the time.
      if (Math.random() < 0.5) this.botRestartAt.set(target, time + Phaser.Math.Between(1500, 3500));
    }
  }

  private swell(f: Fighter, until: number): void {
    const cur = this.swollen.get(f);
    if (cur === undefined) {
      f.hitboxMult *= ZIP_SWELL;
      f.applySizeMult();
    }
    this.swollen.set(f, Math.max(cur ?? 0, until));
  }

  private updateSwell(time: number): void {
    for (const [f, until] of this.swollen) {
      if (f.active && f.hp > 0 && time < until) continue;
      f.hitboxMult /= ZIP_SWELL;
      if (f.active && f.body) f.applySizeMult();
      this.swollen.delete(f);
    }
  }

  // ── "Restart your computer?" ─────────────────────────────────────────

  /** The dialog a lagging human gets. Yes is three seconds stunned with everything on cooldown. */
  private showRestartPrompt(): void {
    if (this.restartPromptObjs.length > 0) return;
    const scene = this.arena.scene;
    const { width: W } = scene.scale;
    const cx = W / 2, cy = 132;
    const w = 340, h = 92;
    this.restartPromptBounds = { x: cx - w / 2, y: cy - h / 2 - 6, w, h: h + 12 };
    const yes = this.hitRect(cx - 70, cy + 24, 116, 26, 62);
    const no = this.hitRect(cx + 70, cy + 24, 116, 26, 62);
    const box = this.addChrome(D_HUD + 1, (cg, ct) => {
      crtWindow(cg, this.ncol, cx - w / 2, cy - h / 2 - 6, w, h + 12, ct, {
        bezel: TECH.steel, bar: TECH.adBlue, screen: TECH.board, glow: TECH.cyan, barH: 16,
      });
      // the warning triangle
      const tx = cx - w / 2 + 34, ty = cy - 8;
      cg.fillStyle(TECH.amber, 1);
      cg.fillTriangle(tx, ty - 13, tx - 13, ty + 10, tx + 13, ty + 10);
      cg.fillStyle(TECH.night, 1);
      cg.fillRect(tx - 1.5, ty - 5, 3, 8);
      cg.fillRect(tx - 1.5, ty + 5, 3, 3);
      crtButton(cg, this.ncol, cx - 70, cy + 24, 116, 26, 0x226644, !!yes.getData('hover'), ct);
      crtButton(cg, this.ncol, cx + 70, cy + 24, 116, 26, 0x663333, !!no.getData('hover'), ct);
    });
    const style = { fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#0a1218', strokeThickness: 3 };
    const label = scene.add.text(cx + 18, cy - 10, 'System is not responding.\nRestart your computer?', {
      ...style, fontSize: '13px', color: '#ddeeff', align: 'center',
    }).setOrigin(0.5).setDepth(D_HUD + 2).setScrollFactor(0);
    const yesLbl = scene.add.text(cx - 70, cy + 24, 'Restart (3s)', { ...style, fontSize: '12px', color: '#ccffdd', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(D_HUD + 3).setScrollFactor(0);
    const noLbl = scene.add.text(cx + 70, cy + 24, 'Not now', { ...style, fontSize: '12px', color: '#ffcccc', strokeThickness: 2 })
      .setOrigin(0.5).setDepth(D_HUD + 3).setScrollFactor(0);
    yes.on('pointerdown', () => {
      this.closeRestartPrompt();
      this.restartComputer(this.arena.player, scene.time.now);
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'restart' });
    });
    no.on('pointerdown', () => this.closeRestartPrompt());
    this.restartPromptObjs = [box, label, yes, yesLbl, no, noLbl];
  }

  private closeRestartPrompt(): void {
    for (const o of this.restartPromptObjs) o.destroy();
    this.restartPromptObjs = [];
    this.restartPromptBounds = null;
  }

  /** Turn it off and on again: the lag is gone, and so are three seconds and every cooldown. */
  private restartComputer(f: Fighter, time: number): void {
    this.clearLag(f, time);
    f.restartCooldowns();
    f.applyDisarm(ZIP_RESTART_STUN_MS);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ZIP_RESTART_STUN_MS);
    if (f !== this.arena.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, time + ZIP_RESTART_STUN_MS);
    this.rebooting.set(f, time + ZIP_RESTART_STUN_MS);
    this.rebootFx(f);
    if (f === this.arena.player) this.showRebootScreen(time);
  }

  private rebootFx(f: Fighter): void {
    const fx = this.fx(f === this.arena.player ? 'npc' : 'player');
    fx.loading(f.x, f.y, 34, ZIP_RESTART_STUN_MS, { color: TECH.ice, depth: D_UI, follow: () => ({ x: f.x, y: f.y }) });
    fx.glitch(f.x, f.y, 60, 54, TECH.ice, 420, D_UI);
  }

  /** The local player's own monitor going down and coming back up. */
  private showRebootScreen(time: number): void {
    for (const o of this.rebootObjs) o.destroy();
    const scene = this.arena.scene;
    const { width: W, height: H } = scene.scale;
    const until = time + ZIP_RESTART_STUN_MS;
    const g = this.addChrome(D_HUD + 4, (cg, ct) => {
      const left = Phaser.Math.Clamp((until - scene.time.now) / ZIP_RESTART_STUN_MS, 0, 1);
      // A dimmed desktop rather than a black one: you still get to watch what happens to you.
      cg.fillStyle(0x061426, 0.62);
      cg.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 - 20;
      for (let i = 0; i < 8; i++) {
        const a = ct * 5 + (i / 8) * Math.PI * 2;
        cg.fillStyle(TECH.ice, 0.25 + 0.75 * (i / 8));
        cg.fillCircle(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 2.2 + 2.2 * (i / 8));
      }
      cg.fillStyle(TECH.night, 0.9);
      cg.fillRoundedRect(cx - 122, cy + 62, 244, 12, 3);
      cg.fillStyle(TECH.ice, 0.95);
      cg.fillRoundedRect(cx - 120, cy + 64, 240 * (1 - left), 8, 2);
    });
    const label = scene.add.text(W / 2, H / 2 + 22, 'Restarting…', {
      fontSize: '20px', color: '#ddeeff', fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#061426', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_HUD + 5).setScrollFactor(0);
    this.rebootObjs = [g, label];
  }

  private updateRestart(time: number): void {
    for (const [f, until] of this.rebooting) {
      if (!f.active || f.hp <= 0 || time >= until) {
        this.rebooting.delete(f);
        if (f === this.arena.player) {
          for (const o of this.rebootObjs) o.destroy();
          this.rebootObjs = [];
        }
        continue;
      }
      if (!f.netGhost) (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
    for (const [f, at] of this.botRestartAt) {
      if (!this.lagged.has(f)) { this.botRestartAt.delete(f); continue; }
      if (time < at) continue;
      this.botRestartAt.delete(f);
      this.restartComputer(f, time);
    }
    // The offer only stands while there is lag to get rid of.
    if (this.restartPromptObjs.length > 0 && !this.lagged.has(this.arena.player)) this.closeRestartPrompt();
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

    if (justDown && !this.dragGrabbed && this.isPointerOverAdminGrip(mouseX, mouseY)) {
      this.dragGrabbed = { kind: 'console', offX: mouseX - this.adminX, offY: mouseY - this.adminY };
    } else if (justDown && !this.dragGrabbed && this.isPointerOverBrowserGrip(mouseX, mouseY)) {
      // Surf the web! (F+): the PainClicker window is draggable by its title bar.
      this.dragGrabbed = { kind: 'window', offX: mouseX - this.browserX, offY: mouseY - this.browserY };
    } else if (justDown && !this.dragGrabbed && !this.isPointerOverBrowser(mouseX, mouseY)
        && !this.isPointerOverSurfPopup(mouseX, mouseY) && !this.isPointerOverAdmin(mouseX, mouseY)) {
      const zip = this.zips.find((z) => z.owner === 'player'
        && Phaser.Math.Distance.Between(mouseX, mouseY, z.x, z.y) <= WEBDRAG_GRAB_RADIUS);
      if (zip) {
        // The slow file is the best thing in the arena to pick up: carry it into somebody.
        this.dragGrabbed = { kind: 'zip', ref: zip };
      } else if (Phaser.Math.Distance.Between(mouseX, mouseY, this.arena.npc.x, this.arena.npc.y) <= WEBDRAG_GRAB_RADIUS) {
        this.dragGrabbed = { kind: 'fighter', ref: this.arena.npc };
      } else {
        const ad = this.ads.find((a) => Phaser.Math.Distance.Between(mouseX, mouseY, a.x, a.y) <= WEBDRAG_GRAB_RADIUS);
        if (ad) this.dragGrabbed = { kind: 'ad', ref: ad };
      }
    }

    if (isDown && this.dragGrabbed) {
      if (this.dragGrabbed.kind === 'fighter') {
        this.dragGrabbed.ref.setPosition(mouseX, mouseY);
        (this.dragGrabbed.ref.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (this.dragGrabbed.kind === 'window') {
        this.moveBrowser(mouseX - this.dragGrabbed.offX, mouseY - this.dragGrabbed.offY);
      } else if (this.dragGrabbed.kind === 'console') {
        this.moveAdminWindow(mouseX - this.dragGrabbed.offX, mouseY - this.dragGrabbed.offY);
      } else if (this.dragGrabbed.kind === 'zip') {
        this.dragGrabbed.ref.x = mouseX;
        this.dragGrabbed.ref.y = mouseY;
      } else {
        const ad = this.dragGrabbed.ref;
        ad.x = mouseX; ad.y = mouseY;
        if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'mv', o: 'ad', id: ad.id, x: ad.x, y: ad.y });
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

    const yes = this.hitRect(cx - 60, cy + 18, 90, 26);
    const no = this.hitRect(cx + 60, cy + 18, 90, 26);
    const box = this.addChrome(44, (cg, ct) => {
      // A slim dialog: chrome window with the two key-caps set into its screen.
      crtWindow(cg, this.pcol, cx - w / 2, cy - h / 2 - 6, w, h + 12, ct, {
        bezel: TECH.steel, bar: TECH.adBlue, screen: TECH.board, glow: TECH.cyan, barH: 14,
      });
      crtButton(cg, this.pcol, cx - 60, cy + 18, 90, 26, 0x226644, !!yes.getData('hover'), ct);
      crtButton(cg, this.pcol, cx + 60, cy + 18, 90, 26, 0x663333, !!no.getData('hover'), ct);
    });
    const label = scene.add.text(cx, cy - 12, '🌐 Surf the web?', { fontSize: '16px', color: '#ddeeff', fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#0a1218', strokeThickness: 3 }).setOrigin(0.5).setDepth(45).setScrollFactor(0);
    const yesLbl = scene.add.text(cx - 60, cy + 18, 'Yes!', { fontSize: '13px', color: '#ccffdd', fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#0a1218', strokeThickness: 2 }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
    const noLbl = scene.add.text(cx + 60, cy + 18, 'X', { fontSize: '13px', color: '#ffcccc', fontFamily: FONT_MONO, fontStyle: 'bold', stroke: '#0a1218', strokeThickness: 2 }).setOrigin(0.5).setDepth(46).setScrollFactor(0);
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

  // ── PainClicker — the Surf the web! (F+) window ─────────────────────

  private isPointerOverBrowser(x: number, y: number): boolean {
    return this.browserOpen
      && x >= this.browserX && x <= this.browserX + PAIN_WIN_W
      && y >= this.browserY && y <= this.browserY + PAIN_WIN_H;
  }

  /** The title bar is the grip web drag takes hold of (the close box excluded). */
  private isPointerOverBrowserGrip(x: number, y: number): boolean {
    return this.isPointerOverBrowser(x, y) && y <= this.browserY + PAIN_BAR_H + 2
      && x < this.browserX + PAIN_WIN_W - 24;
  }

  /** Pin a text or hit rect to the window at an offset from its top-left. */
  private anchorToBrowser<T extends Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle>(o: T, dx: number, dy: number): T {
    o.setPosition(this.browserX + dx, this.browserY + dy);
    this.browserAnchors.push({ o, dx, dy });
    this.browserObjs.push(o);
    return o;
  }

  private moveBrowser(x: number, y: number): void {
    const { width: W, height: H } = this.arena.scene.scale;
    this.browserX = Phaser.Math.Clamp(x, 0, W - PAIN_WIN_W);
    this.browserY = Phaser.Math.Clamp(y, 0, H - PAIN_WIN_H);
    for (const a of this.browserAnchors) a.o.setPosition(this.browserX + a.dx, this.browserY + a.dy);
  }

  private painPerSecond(): number {
    let n = 0;
    for (const u of PAIN_UPGRADES) if (this.painOwned.has(u.id)) n += u.perSec;
    return n;
  }

  private painPerClick(): number {
    return this.painOwned.has('harder') ? 2 : 1;
  }

  private openBrowser(): void {
    if (this.browserOpen) return;
    this.browserOpen = true;
    this.painCoins = 0;
    this.painOwned.clear();
    this.painAutoAccum = 0;
    this.skullPunchAt = -9999;
    const scene = this.arena.scene;
    const { width: W, height: H } = scene.scale;
    this.browserX = W - PAIN_WIN_W - 16;
    this.browserY = H / 2 - PAIN_WIN_H / 2 - 30;

    const close = this.anchorToBrowser(this.hitRect(0, 0, 18, 18, 47), PAIN_WIN_W - 13, 14);
    close.on('pointerdown', () => this.destroyBrowser());
    const skull = this.anchorToBrowser(this.hitRect(0, 0, 96, 100), PAIN_SKULL_DX, PAIN_SKULL_DY);
    skull.on('pointerdown', () => {
      this.skullPunchAt = scene.time.now;
      this.inflictPain(this.painPerClick(), true);
    });
    const buyRects = PAIN_UPGRADES.map((u, i) => {
      const r = this.anchorToBrowser(this.hitRect(0, 0, PAIN_BTN_W, PAIN_BTN_H), PAIN_BTN_DX, PAIN_BTN_DY0 + i * PAIN_BTN_STEP);
      r.on('pointerdown', () => this.buyPainUpgrade(u.id));
      return r;
    });

    // A grubby little CRT window: plum title bar, the skull on the left pane, the shop column on
    // the right. While web drag is live the title bar breathes mint — that is where you grab it.
    const frame = this.addChrome(44, (cg, ct) => {
      const x0 = this.browserX, y0 = this.browserY;
      crtWindow(cg, this.pcol, x0, y0, PAIN_WIN_W, PAIN_WIN_H, ct, {
        bezel: TECH.slate, bar: TECH.plum, screen: 0x12080e, glow: TECH.alert, barH: PAIN_BAR_H,
      });
      if (this.dragActive.player) {
        cg.lineStyle(1.6, this.pcol(TECH.mint), 0.5 + 0.35 * Math.sin(ct * 6));
        cg.strokeRoundedRect(x0 + 3, y0 + 3, PAIN_WIN_W - 6, PAIN_BAR_H, 3);
      }
      if (close.getData('hover')) {
        cg.lineStyle(1.5, this.pcol(TECH.white), 0.8);
        cg.strokeRect(x0 + PAIN_WIN_W - 22, y0 + 5, 18, 18);
      }
      // the pane divider
      cg.lineStyle(1, this.pcol(TECH.wire), 0.3);
      cg.lineBetween(x0 + PAIN_DIVIDER_DX, y0 + PAIN_BAR_H + 10, x0 + PAIN_DIVIDER_DX, y0 + PAIN_WIN_H - 12);
      PAIN_UPGRADES.forEach((u, i) => {
        const owned = this.painOwned.has(u.id);
        const color = owned ? 0x225533 : this.painCoins >= u.cost ? 0x7a2233 : 0x3a2a33;
        crtButton(cg, this.pcol, x0 + PAIN_BTN_DX, y0 + PAIN_BTN_DY0 + i * PAIN_BTN_STEP, PAIN_BTN_W, PAIN_BTN_H,
          color, !owned && !!buyRects[i].getData('hover'), ct);
      });
      const punch = Math.max(0, 1 - (scene.time.now - this.skullPunchAt) / 140);
      this.drawPainSkull(cg, x0 + PAIN_SKULL_DX, y0 + PAIN_SKULL_DY, 1 - 0.12 * punch, ct, !!skull.getData('hover'));
    });
    this.browserObjs.push(frame);

    const txt = (s: string, size: number, color: string): Phaser.GameObjects.Text =>
      scene.add.text(0, 0, s, { fontSize: `${size}px`, color, fontFamily: FONT_MONO, fontStyle: 'bold', align: 'center', stroke: '#0a1218', strokeThickness: 2 })
        .setDepth(46).setScrollFactor(0);
    this.anchorToBrowser(txt('💀 PainClicker.exe', 12, '#ffd6e0').setOrigin(0, 0.5), 10, 14);
    this.painCoinText = this.anchorToBrowser(txt('', 13, '#ff8899').setOrigin(0.5), PAIN_SKULL_DX, PAIN_BAR_H + 16);
    this.painRateText = this.anchorToBrowser(txt('', 10, '#bb8899').setOrigin(0.5), PAIN_SKULL_DX, PAIN_WIN_H - 18);
    this.painUpgradeLabels.clear();
    PAIN_UPGRADES.forEach((u, i) => {
      const lbl = this.anchorToBrowser(txt('', 10, '#ffffff').setOrigin(0.5), PAIN_BTN_DX, PAIN_BTN_DY0 + i * PAIN_BTN_STEP);
      this.painUpgradeLabels.set(u.id, lbl);
    });
    this.refreshPainTexts();
  }

  /** The skull: a bone cranium with a cracked crown, red-lit sockets, and a row of teeth. */
  private drawPainSkull(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, t: number, hover: boolean): void {
    const c = this.pcol;
    const bone = 0xe8dcc4, boneShade = 0xb8a88a, socket = 0x1a0a10;
    g.fillStyle(c(TECH.alert), (hover ? 0.16 : 0.09) + 0.04 * Math.sin(t * 3));
    g.fillCircle(cx, cy, 50 * s);
    // jaw under the cranium, then the cranium over its top edge
    g.fillStyle(c(boneShade), 1);
    g.fillRoundedRect(cx - 21 * s, cy + 6 * s, 42 * s, 26 * s, 7 * s);
    g.fillStyle(c(bone), 1);
    g.fillRoundedRect(cx - 19 * s, cy + 6 * s, 38 * s, 22 * s, 6 * s);
    g.fillCircle(cx, cy - 8 * s, 33 * s);
    g.fillStyle(c(boneShade), 0.55);
    g.fillEllipse(cx, cy + 10 * s, 52 * s, 12 * s);
    g.fillStyle(c(TECH.white), 0.35);
    g.fillEllipse(cx - 11 * s, cy - 26 * s, 20 * s, 9 * s);
    // eye sockets with their glow
    const glow = 0.65 + 0.35 * Math.sin(t * 5);
    for (const side of [-1, 1]) {
      const ex = cx + side * 13 * s, ey = cy - 5 * s;
      g.fillStyle(c(socket), 1);
      g.fillEllipse(ex, ey, 19 * s, 16 * s);
      g.fillStyle(c(TECH.alert), 0.3 * glow);
      g.fillCircle(ex, ey + 1 * s, 6 * s);
      g.fillStyle(c(TECH.alert), glow);
      g.fillCircle(ex, ey + 1 * s, 3 * s);
    }
    // nose, a notch of a triangle
    g.fillStyle(c(socket), 1);
    g.fillTriangle(cx, cy + 3 * s, cx - 4.5 * s, cy + 12 * s, cx + 4.5 * s, cy + 12 * s);
    // teeth
    g.lineStyle(1.2 * s, c(socket), 0.85);
    g.lineBetween(cx - 15 * s, cy + 19 * s, cx + 15 * s, cy + 19 * s);
    for (let k = -2; k <= 2; k++) g.lineBetween(cx + k * 6 * s, cy + 14 * s, cx + k * 6 * s, cy + 25 * s);
    // the crack down the crown
    g.lineStyle(1.4 * s, c(socket), 0.75);
    g.beginPath();
    g.moveTo(cx + 4 * s, cy - 40 * s);
    g.lineTo(cx + 9 * s, cy - 31 * s);
    g.lineTo(cx + 5 * s, cy - 25 * s);
    g.lineTo(cx + 11 * s, cy - 18 * s);
    g.strokePath();
    g.lineStyle(1.5, c(TECH.night), 0.8);
    g.strokeCircle(cx, cy - 8 * s, 33 * s);
  }

  /** One dose of pain: `n` coins in the wallet and `n` damage on the nearest enemy. */
  private inflictPain(n: number, fromClick: boolean): void {
    const player = this.arena.player;
    this.gainPainCoins(n);
    const target = this.nearestEnemyOf('player', player.x, player.y);
    if (target) {
      target.takeDamage(n);
      this.arena.spawnHitFlash(target.x, target.y, this.pcol(0xff3355));
    }
    const sx = this.browserX + PAIN_SKULL_DX + (fromClick ? Phaser.Math.Between(-24, 24) : 0);
    const sy = this.browserY + PAIN_SKULL_DY - 40;
    this.popBrowserText(sx, sy, `+${n} 💀`, fromClick ? '#ff8899' : '#ffbb66');
    this.refreshPainTexts();
  }

  private buyPainUpgrade(id: PainUpgradeId): void {
    const u = PAIN_UPGRADES.find((p) => p.id === id);
    if (!u || this.painOwned.has(id)) return;
    const bx = this.browserX + PAIN_BTN_DX;
    const by = this.browserY + PAIN_BTN_DY0 + PAIN_UPGRADES.indexOf(u) * PAIN_BTN_STEP;
    if (this.painCoins < u.cost) {
      this.popBrowserText(bx, by - 16, 'Not enough pain!', '#ff6666');
      return;
    }
    this.painCoins -= u.cost;
    this.painOwned.add(id);
    this.popBrowserText(bx, by - 16, `${u.name}!`, '#88ffaa');
    this.refreshPainTexts();
  }

  private refreshPainTexts(): void {
    this.painCoinText?.setText(`💀 ${this.painCoins}`);
    this.painRateText?.setText(`${this.painPerClick()}/click · ${this.painPerSecond()}/s`);
    for (const u of PAIN_UPGRADES) {
      const owned = this.painOwned.has(u.id);
      this.painUpgradeLabels.get(u.id)?.setText(owned ? `✔ ${u.name}` : `${u.name}\n${u.blurb} · ${u.cost}💀`);
    }
  }

  private popBrowserText(_x: number, _y: number, _msg: string, _color: string): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  /** Full teardown of the window. */
  private destroyBrowser(): void {
    for (const o of this.browserObjs) o.destroy();
    this.browserObjs = [];
    this.browserAnchors = [];
    this.painCoinText = null;
    this.painRateText = null;
    this.painUpgradeLabels.clear();
    this.browserOpen = false;
    if (this.dragGrabbed?.kind === 'window') this.dragGrabbed = null;
  }

  /** Every pain coin earned — clicked or farmed — counts toward the mastery. */
  private gainPainCoins(n: number): void {
    if (n <= 0) return;
    // Ruin's Combo Breaker halves every meter in the game — the pain wallet included.
    this.painCoins += meterGain(this.arena.player, n);
    this.arena.recordMasteryStat('webCoins', n);
  }

  private updateBrowser(delta: number): void {
    if (!this.browserOpen) return;
    const perSec = this.painPerSecond();
    if (perSec <= 0) return;
    this.painAutoAccum += delta;
    while (this.painAutoAccum >= 1000) {
      this.painAutoAccum -= 1000;
      this.inflictPain(perSec, false);
    }
  }

  // ── Admin Console (Q) ────────────────────────────────────────────────
  //
  // A small window of commands and a red abuse bar. Every command adds abuse; when the bar is
  // spent the console leaves. Q+ Admin Abuse keeps it open and takes the difference in health.

  doTechAdminCast(owner: Owner): void {
    const st = this.admin[owner];
    this.gesture(owner, 'tech-admin');
    const caster = this.fighterOf(owner);
    this.fx(owner).glitch(caster.x, caster.y, 70, 60, TECH.alert, 520, D_UI);
    this.fx(owner).ring(caster.x, caster.y, 12, 64, TECH.alert, 420, D_UI, 2.6);
    // A remote caster's console is theirs to drive: its commands arrive one message at a time.
    if (owner === 'npc' && this.arena.isOnline) { st.open = true; return; }
    st.open = true;
    st.abuse = 0;
    st.overuse = 0;
    st.closeAt = 0;
    st.nextBotCmdAt = this.arena.scene.time.now + Phaser.Math.Between(500, 900);
    this.logConsole(owner, ['-- admin console attached', 'require(script.Admin).elevate(me)']);
    if (owner === 'player') {
      this.openAdminWindow();
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'console', open: true });
    }
  }

  /** The one target a single-target command acts on. */
  private adminTarget(owner: Owner): Fighter | null {
    const c = this.fighterOf(owner);
    return this.nearestEnemyOf(owner, c.x, c.y);
  }

  /** What a command would be paid with right now — abuse, health (Q+), or nothing (cannot run). */
  private adminPrice(owner: Owner, cmd: AdminCmd): { pay: 'abuse' | 'hp'; hp: number } | null {
    const st = this.admin[owner];
    if (!st.open) return null;
    const def = ADMIN_COMMANDS.find((c) => c.id === cmd);
    if (!def) return null;
    if (cmd === 'ban') {
      const t = this.adminTarget(owner);
      if (!t || t.hp / t.maxHp >= ADMIN_BAN_HP) return null;
    }
    if (st.abuse + def.cost <= ADMIN_ABUSE_MAX) return { pay: 'abuse', hp: 0 };
    if (!this.arena.hasUpgrade(owner, 'q')) return null;
    const hp = Math.ceil(def.cost * ADMIN_HP_PER_ABUSE * (1 + ADMIN_OVERUSE_STEP * st.overuse));
    return this.fighterOf(owner).hp > hp ? { pay: 'hp', hp } : null;
  }

  /** Pay for a command and run it. The local player's clicks and the bot's picks both come here. */
  private useAdminCommand(owner: Owner, cmd: AdminCmd): boolean {
    const st = this.admin[owner];
    const price = this.adminPrice(owner, cmd);
    if (!price) return false;
    const def = ADMIN_COMMANDS.find((c) => c.id === cmd)!;
    if (price.pay === 'abuse') {
      st.abuse += def.cost;
    } else {
      st.overuse++;
      this.fighterOf(owner).applySelfDamage(price.hp);
    }
    this.runAdminCommand(owner, cmd);
    if (owner === 'player' && this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'cmd', c: cmd });
    // Bar spent and no Admin Abuse to lean on: the console leaves, a beat after its last line.
    if (!this.arena.hasUpgrade(owner, 'q') && ADMIN_ABUSE_MAX - st.abuse < ADMIN_CHEAPEST) {
      st.closeAt = this.arena.scene.time.now + 650;
    }
    if (owner === 'player') this.refreshAdminTexts();
    return true;
  }

  /** What a command does. Unpaid and unconditional — also the online replay of a remote command. */
  private runAdminCommand(owner: Owner, cmd: AdminCmd): void {
    const scene = this.arena.scene;
    const now = scene.time.now;
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    // A remote caster's hits are resolved on their own machine; here they are only shown.
    const remote = owner === 'npc' && this.arena.isOnline;
    const target = this.adminTarget(owner);
    this.logConsole(owner, ADMIN_CODE[cmd]);
    this.gesture(owner, 'tech-admin');

    switch (cmd) {
      case 'fling':
        for (const f of this.enemiesOf(owner)) {
          if (f !== target && Phaser.Math.Distance.Between(caster.x, caster.y, f.x, f.y) > 320) continue;
          const a = Math.atan2(f.y - caster.y, f.x - caster.x);
          if (!remote) {
            this.flings.push({ f, vx: Math.cos(a) * ADMIN_FLING_SPEED, vy: Math.sin(a) * ADMIN_FLING_SPEED, until: now + ADMIN_FLING_MS });
          }
          fx.ring(f.x, f.y, 10, 54, TECH.white, 300, D_UI, 3);
          fx.bits(f.x, f.y, 8, { angle: a, spread: 0.7, speed: 260, size: 9, life: 420, depth: D_UI, color: TECH.ice });
        }
        break;
      case 'jail':
        if (target) this.applyJail(target, owner, now);
        break;
      case 'fly':
        this.flyUntil[owner] = now + ADMIN_FLY_MS;
        fx.ring(caster.x, caster.y, 8, 46, TECH.ice, 360, D_UI, 2.4);
        fx.bits(caster.x, caster.y + 10, 8, { angle: Math.PI / 2, spread: 0.9, speed: 160, size: 8, life: 420, depth: D_WORLD, color: TECH.ice });
        break;
      case 'kill':
        if (!target) break;
        this.strikes.push({ kind: 'kill', owner, x: target.x, y: target.y, bornAt: now });
        fx.crash(target.x, target.y, 80, { bits: 16, rings: 3, duration: 560, color: TECH.alert });
        scene.cameras.main.shake(200, 0.006);
        if (!remote) {
          target.takeDamage(ADMIN_KILL_DMG, { sourceX: caster.x, sourceY: caster.y });
          this.arena.spawnHitFlash(target.x, target.y, this.col(owner)(TECH.alert));
        }
        break;
      case 'invis':
        this.adminInvisibleUntil[owner] = now + ADMIN_INVIS_MS;
        fx.glitch(caster.x, caster.y, 56, 56, TECH.wire, 360, D_UI);
        break;
      case 'give':
        this.gunUntil[owner] = now + ADMIN_GIVE_MS;
        fx.ring(caster.x, caster.y, 6, 40, TECH.alert, 320, D_UI, 2.4);
        fx.bits(caster.x, caster.y, 6, { speed: 150, size: 8, life: 380, depth: D_WORLD, color: TECH.alert });
        break;
      case 'speed':
        this.speedUntil[owner] = now + ADMIN_SPEED_MS;
        fx.ring(caster.x, caster.y, 6, 48, TECH.phosphor, 320, D_UI, 2.4);
        fx.bits(caster.x, caster.y, 8, { speed: 220, size: 8, life: 360, depth: D_WORLD, color: TECH.phosphor });
        break;
      case 'invincible':
        this.invincibleUntil[owner] = now + ADMIN_INVINCIBLE_MS;
        fx.ring(caster.x, caster.y, 10, 60, TECH.amber, 420, D_UI, 3);
        break;
      case 'ban':
        if (!target) break;
        this.strikes.push({ kind: 'ban', owner, x: target.x, y: target.y, bornAt: now });
        scene.cameras.main.shake(320, 0.01);
        fx.crash(target.x, target.y, 120, { bits: 24, rings: 4, duration: 760, color: TECH.alert });
        if (!remote && target.hp / target.maxHp < ADMIN_BAN_HP) {
          target.takeDamage(9999, { pierce: true });
          if (owner === 'player') this.arena.recordMasteryStat('adminBans', 1);
        }
        break;
    }
  }

  private applyJail(target: Fighter, owner: Owner, now: number): void {
    this.jails = this.jails.filter((j) => j.f !== target);
    this.jails.push({
      f: target, owner, x: target.x, y: target.y, w: ADMIN_JAIL_SIZE, h: ADMIN_JAIL_SIZE,
      lastDmgAt: 0, expiresAt: now + ADMIN_JAIL_MS,
    });
    // A window slams open around them — the cell is a dialog box they cannot close.
    this.fx(owner).crash(target.x, target.y, 70, { bits: 10, rings: 2, duration: 520, color: TECH.alert, mark: false });
  }

  /**
   * The jail cell: an error dialog with the victim inside it. Painted per frame so the
   * scanlines crawl and the walls flash on each contact — a static stroked rectangle read as
   * arena furniture rather than as something holding you.
   */
  private paintJail(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const box of this.jails) {
      const tint = this.col(box.owner);
      const hot = time - box.lastDmgAt < 220;
      windowPane(g, tint, box.x, box.y, box.w, box.h, t, hot ? 0.55 : 0.32, {
        body: TECH.night, bar: TECH.alert, accent: hot ? TECH.white : TECH.alert, lines: 0,
      });
      // Bars across the opening, so it reads as a cell and not just a window.
      g.lineStyle(2.4, tint(TECH.alert), hot ? 0.95 : 0.6);
      for (let i = 1; i < 6; i++) {
        const bx = box.x - box.w / 2 + (i / 6) * box.w;
        g.lineBetween(bx, box.y - box.h / 2 + 16, bx, box.y + box.h / 2);
      }
      // The sentence, draining along the sill.
      const left = Phaser.Math.Clamp((box.expiresAt - time) / ADMIN_JAIL_MS, 0, 1);
      g.fillStyle(tint(TECH.alert), 0.9);
      g.fillRect(box.x - box.w / 2, box.y + box.h / 2 - 3, box.w * left, 3);
    }
  }

  /** ;kill's smite and ;ban's hammer — short set-pieces drawn over everything in the arena. */
  private paintStrikes(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const sk = this.strikes[i];
      const life = sk.kind === 'ban' ? 900 : 520;
      const k = (time - sk.bornAt) / life;
      if (k >= 1) { this.strikes.splice(i, 1); continue; }
      const tint = this.col(sk.owner);
      if (sk.kind === 'kill') {
        // A column of red from the top of the screen, fat then gone, with a bright core.
        const w = 46 * (1 - k) * (0.8 + 0.2 * Math.sin(t * 60));
        g.fillStyle(tint(TECH.alert), 0.35 * (1 - k));
        g.fillRect(sk.x - w, -10, w * 2, sk.y + 10);
        g.fillStyle(tint(TECH.alert), 0.85 * (1 - k));
        g.fillRect(sk.x - w / 2, -10, w, sk.y + 10);
        g.fillStyle(tint(TECH.white), 0.95 * (1 - k));
        g.fillRect(sk.x - w / 6, -10, w / 3, sk.y + 10);
        // error boxes cascading off the impact
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 + sk.bornAt;
          const d = 20 + 90 * k;
          windowPane(g, tint, sk.x + Math.cos(a) * d, sk.y + Math.sin(a) * d * 0.7, 34, 22, t, 0.8 * (1 - k), {
            body: TECH.night, bar: TECH.alert, accent: TECH.alert, lines: 1, scan: false,
          });
        }
      } else {
        // The ban hammer: falls for the first third, sits in its crater for the rest.
        const fall = Math.min(1, k / 0.3);
        const hy = sk.y - 300 * (1 - fall * fall);
        const a = 1 - Math.max(0, (k - 0.7) / 0.3);
        g.fillStyle(tint(TECH.night), 0.4 * a * fall);
        g.fillEllipse(sk.x, sk.y + 20, 110 * fall, 26 * fall);
        // handle
        g.fillStyle(tint(TECH.steel), a);
        g.fillRect(sk.x - 6, hy - 96, 12, 80);
        g.lineStyle(1.5, tint(TECH.wire), a);
        g.strokeRect(sk.x - 6, hy - 96, 12, 80);
        // head
        g.fillStyle(tint(0x881122), a);
        g.fillRoundedRect(sk.x - 54, hy - 30, 108, 54, 6);
        g.fillStyle(tint(TECH.alert), a);
        g.fillRoundedRect(sk.x - 50, hy - 26, 100, 22, 4);
        g.lineStyle(2.5, tint(TECH.white), a * 0.9);
        g.strokeRoundedRect(sk.x - 54, hy - 30, 108, 54, 6);
        // the no-entry sign on its face
        g.lineStyle(4, tint(TECH.white), a);
        g.strokeCircle(sk.x, hy - 3, 15);
        g.lineBetween(sk.x - 10, hy - 13, sk.x + 10, hy + 7);
        if (fall >= 1) {
          const ring = (k - 0.3) / 0.7;
          g.lineStyle(5 * (1 - ring), tint(TECH.alert), 1 - ring);
          g.strokeEllipse(sk.x, sk.y + 18, 120 + 260 * ring, 30 + 70 * ring);
        }
      }
    }
  }

  /** Queue lines of fake source into the bottom-right corner, typed one after another. */
  private logConsole(owner: Owner, lines: string[]): void {
    const scene = this.arena.scene;
    const { width: W, height: H } = scene.scale;
    const now = scene.time.now;
    // Start after whatever is still being typed, so two commands never interleave.
    let at = now;
    for (const l of this.consoleLines) at = Math.max(at, l.startAt + l.full.length * 14 + 60);
    lines.forEach((line, i) => {
      const full = i === 0 ? `${owner === 'npc' ? 'enemy' : 'you'}@admin> ${line}` : `  ${line}`;
      const text = scene.add.text(W - 306, 0, '', {
        fontSize: '11px', color: owner === 'npc' ? '#ff9a4a' : '#ff4a4a', fontFamily: FONT_MONO, fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(50).setScrollFactor(0);
      this.consoleLines.push({ text, full, startAt: at });
      at += full.length * 14 + 60;
    });
    while (this.consoleLines.length > 9) this.consoleLines.shift()!.text.destroy();
    // Newest line sits on the bottom edge; everything older scrolls up a row.
    const n = this.consoleLines.length;
    this.consoleLines.forEach((l, i) => l.text.setY(H - 96 - (n - 1 - i) * 14));
  }

  // ── The console window (local player only) ───────────────────────────

  private isPointerOverAdmin(x: number, y: number): boolean {
    return this.adminObjs.length > 0
      && x >= this.adminX && x <= this.adminX + ADMIN_WIN_W
      && y >= this.adminY && y <= this.adminY + ADMIN_WIN_H;
  }

  private isPointerOverAdminGrip(x: number, y: number): boolean {
    return this.isPointerOverAdmin(x, y) && y <= this.adminY + ADMIN_BAR_H + 2 && x < this.adminX + ADMIN_WIN_W - 24;
  }

  private anchorToAdmin<T extends Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle>(o: T, dx: number, dy: number): T {
    o.setPosition(this.adminX + dx, this.adminY + dy);
    this.adminAnchors.push({ o, dx, dy });
    this.adminObjs.push(o);
    return o;
  }

  private moveAdminWindow(x: number, y: number): void {
    const { width: W, height: H } = this.arena.scene.scale;
    this.adminX = Phaser.Math.Clamp(x, 0, W - ADMIN_WIN_W);
    this.adminY = Phaser.Math.Clamp(y, 0, H - ADMIN_WIN_H);
    for (const a of this.adminAnchors) a.o.setPosition(this.adminX + a.dx, this.adminY + a.dy);
  }

  private openAdminWindow(): void {
    this.destroyAdminWindow();
    const scene = this.arena.scene;
    const { height: H } = scene.scale;
    this.adminX = 16;
    this.adminY = H / 2 - ADMIN_WIN_H / 2 - 30;
    const st = this.admin.player;

    const close = this.anchorToAdmin(this.hitRect(0, 0, 18, 18, 47), ADMIN_WIN_W - 13, 14);
    close.on('pointerdown', () => this.closeAdmin('player'));
    const rects = ADMIN_COMMANDS.map((c, i) => {
      const r = this.anchorToAdmin(this.hitRect(0, 0, ADMIN_BTN_W, ADMIN_BTN_H), ADMIN_BTN_DX[i % 3], ADMIN_BTN_DY[Math.floor(i / 3)]);
      r.on('pointerdown', () => { this.useAdminCommand('player', c.id); });
      return r;
    });

    const frame = this.addChrome(44, (cg, ct) => {
      const x0 = this.adminX, y0 = this.adminY;
      crtWindow(cg, this.pcol, x0, y0, ADMIN_WIN_W, ADMIN_WIN_H, ct, {
        bezel: 0x3a0a14, bar: 0x881122, screen: 0x140006, glow: TECH.alert, barH: ADMIN_BAR_H,
      });
      if (this.dragActive.player) {
        cg.lineStyle(1.6, this.pcol(TECH.mint), 0.5 + 0.35 * Math.sin(ct * 6));
        cg.strokeRoundedRect(x0 + 3, y0 + 3, ADMIN_WIN_W - 6, ADMIN_BAR_H, 3);
      }
      if (close.getData('hover')) {
        cg.lineStyle(1.5, this.pcol(TECH.white), 0.8);
        cg.strokeRect(x0 + ADMIN_WIN_W - 22, y0 + 5, 18, 18);
      }
      // The abuse bar: ten notches, filling red, throbbing once it is nearly spent.
      const bx = x0 + 14, by = y0 + ADMIN_BAR_H + 12, bw = ADMIN_WIN_W - 28, bh = 14;
      const frac = Phaser.Math.Clamp(st.abuse / ADMIN_ABUSE_MAX, 0, 1);
      cg.fillStyle(this.pcol(TECH.night), 0.95);
      cg.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      cg.fillStyle(this.pcol(0x441018), 1);
      cg.fillRect(bx, by, bw, bh);
      cg.fillStyle(this.pcol(TECH.alert), frac > 0.8 ? 0.75 + 0.25 * Math.sin(ct * 12) : 0.95);
      cg.fillRect(bx, by, bw * frac, bh);
      cg.fillStyle(this.pcol(TECH.white), 0.22);
      cg.fillRect(bx, by, bw * frac, bh / 2.4);
      cg.lineStyle(1, this.pcol(TECH.night), 0.7);
      for (let k = 1; k < 10; k++) cg.lineBetween(bx + (bw * k) / 10, by, bx + (bw * k) / 10, by + bh);
      cg.lineStyle(1.2, this.pcol(TECH.alert), 0.8);
      cg.strokeRect(bx, by, bw, bh);

      ADMIN_COMMANDS.forEach((c, i) => {
        const price = this.adminPrice('player', c.id);
        const color = !price ? 0x2e2228 : price.pay === 'hp' ? 0x6a1f6a : 0x8a1f2e;
        crtButton(cg, this.pcol, x0 + ADMIN_BTN_DX[i % 3], y0 + ADMIN_BTN_DY[Math.floor(i / 3)], ADMIN_BTN_W, ADMIN_BTN_H,
          color, !!price && !!rects[i].getData('hover'), ct);
      });
      // prompt line along the bottom of the screen
      if (Math.sin(ct * 8) > 0) {
        cg.fillStyle(this.pcol(TECH.alert), 0.9);
        cg.fillRect(x0 + 14, y0 + ADMIN_WIN_H - 22, 7, 11);
      }
    });
    this.adminObjs.push(frame);

    const txt = (str: string, size: number, color: string): Phaser.GameObjects.Text =>
      scene.add.text(0, 0, str, { fontSize: `${size}px`, color, fontFamily: FONT_MONO, fontStyle: 'bold', align: 'center', stroke: '#140006', strokeThickness: 2 })
        .setDepth(46).setScrollFactor(0);
    this.anchorToAdmin(txt('⌨ admin_console.exe', 12, '#ffd6d6').setOrigin(0, 0.5), 10, 14);
    this.adminAbuseText = this.anchorToAdmin(txt('', 10, '#ffffff').setOrigin(0.5), ADMIN_WIN_W / 2, ADMIN_BAR_H + 19);
    this.anchorToAdmin(txt(this.arena.hasUpgrade('player', 'q') ? 'ADMIN ABUSE: past the bar it costs HP' : 'console closes when the bar is spent', 10, '#cc8888').setOrigin(0, 0.5), 26, ADMIN_WIN_H - 16);
    this.adminBtnLabels.clear();
    ADMIN_COMMANDS.forEach((c, i) => {
      const lbl = this.anchorToAdmin(txt('', 11, '#ffffff').setOrigin(0.5), ADMIN_BTN_DX[i % 3], ADMIN_BTN_DY[Math.floor(i / 3)]);
      this.adminBtnLabels.set(c.id, lbl);
    });
    this.refreshAdminTexts();
  }

  private refreshAdminTexts(): void {
    const st = this.admin.player;
    this.adminAbuseText?.setText(`ABUSE ${Math.min(st.abuse, ADMIN_ABUSE_MAX)} / ${ADMIN_ABUSE_MAX}`);
    for (const c of ADMIN_COMMANDS) {
      const lbl = this.adminBtnLabels.get(c.id);
      if (!lbl) continue;
      const price = this.adminPrice('player', c.id);
      const cost = price?.pay === 'hp' ? `-${price.hp} HP` : `${c.cost} abuse`;
      lbl.setText(`;${c.id}\n${cost}`).setAlpha(price ? 1 : 0.4);
    }
  }

  private destroyAdminWindow(): void {
    for (const o of this.adminObjs) o.destroy();
    this.adminObjs = [];
    this.adminAnchors = [];
    this.adminBtnLabels.clear();
    this.adminAbuseText = null;
    if (this.dragGrabbed?.kind === 'console') this.dragGrabbed = null;
  }

  private closeAdmin(owner: Owner): void {
    const st = this.admin[owner];
    if (!st.open) return;
    st.open = false;
    st.closeAt = 0;
    this.logConsole(owner, ['exit', '-- session closed']);
    if (owner === 'player') {
      this.destroyAdminWindow();
      if (this.arena.isOnline) this.arena.sendTechMsg({ t: 'tech', k: 'console', open: false });
    }
  }

  /** The bot at its own console: the best command it can afford, a little under one a second. */
  private botAdminPick(time: number): void {
    const st = this.admin.npc;
    st.nextBotCmdAt = time + Phaser.Math.Between(650, 1100);
    const npc = this.arena.npc;
    const target = this.adminTarget('npc');
    if (!target) return;
    const can = (c: AdminCmd): boolean => !!this.adminPrice('npc', c);
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, target.x, target.y);
    const caged = this.jails.some((j) => j.f === target);
    const order: AdminCmd[] = [];
    if (can('ban')) order.push('ban');
    // Cornered and fresh at the console: the whole bar on five seconds of god mode.
    if (npc.hp / npc.maxHp < 0.3 && st.abuse === 0) order.push('invincible');
    if (dist < 130) order.push('fling');
    if (time >= this.gunUntil.npc && st.abuse <= 50) order.push('give');
    // Cage first, then smite what cannot dodge.
    if (!caged) order.push('jail');
    order.push('kill');
    if (time >= this.speedUntil.npc) order.push('speed');
    if (npc.hp / npc.maxHp < 0.5 && time >= this.adminInvisibleUntil.npc) order.push('invis');
    order.push('fling', 'fly');
    for (const c of order) if (can(c) && this.useAdminCommand('npc', c)) return;
    // Nothing left it can pay for.
    this.closeAdmin('npc');
  }

  private updateAdmin(time: number): void {
    for (const owner of OWNERS) {
      const st = this.admin[owner];
      const fighter = this.fighterOf(owner);
      const remote = owner === 'npc' && this.arena.isOnline;

      if (st.open && !remote) {
        if (!fighter.active || fighter.hp <= 0 || (st.closeAt > 0 && time >= st.closeAt)) this.closeAdmin(owner);
        else if (owner === 'npc' && st.closeAt === 0 && time >= st.nextBotCmdAt) this.botAdminPick(time);
      }

      if (this.adminInvisibleUntil[owner] > time) {
        if (!this.wasAdminInvisible[owner]) { this.wasAdminInvisible[owner] = true; fighter.setAlpha(0.2); }
      } else if (this.wasAdminInvisible[owner]) {
        this.wasAdminInvisible[owner] = false;
        fighter.setAlpha(1);
      }

      // ;fly — off the floor: melee and ground hazards pass underneath.
      const flying = time < this.flyUntil[owner];
      if (flying) { fighter.airborne = true; fighter.levitating = true; }
      else if (this.wasFlying[owner]) { fighter.airborne = false; fighter.levitating = false; }
      this.wasFlying[owner] = flying;

      const sped = time < this.speedUntil[owner];
      if (sped) fighter.techCooldownMult = 1 / ADMIN_SPEED_BONUS;
      else if (this.wasSped[owner]) fighter.techCooldownMult = 1;
      this.wasSped[owner] = sped;

      const god = time < this.invincibleUntil[owner];
      if (god) fighter.isInvincible = true;
      else if (this.wasInvincible[owner]) fighter.isInvincible = false;
      this.wasInvincible[owner] = god;
    }

    if (this.adminObjs.length > 0 && time >= this.adminRefreshAt) {
      // Prices move with your health and the enemy's: keep the buttons honest.
      this.adminRefreshAt = time + 200;
      this.refreshAdminTexts();
    }

    // ;fling — the launch is held for a few frames, after movement, so it actually carries.
    for (let i = this.flings.length - 1; i >= 0; i--) {
      const fl = this.flings[i];
      if (time >= fl.until || !fl.f.active || fl.f.hp <= 0) { this.flings.splice(i, 1); continue; }
      (fl.f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(fl.vx, fl.vy);
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

  // ── Technology Mastery — Glitch Abuse (passive) ───────────────────────

  /**
   * Grind against a wall and the collision gives up: you flicker in and out of it, then get
   * spat across the arena toward the cursor, clipping through anybody in the way. Caster-local
   * — online the opponent just sees the position do it.
   */
  private updateGlitchAbuse(time: number, delta: number): void {
    const g = this.glitch;
    const p = this.arena.player;
    const body = p?.body as Phaser.Physics.Arcade.Body | null;
    if (!this.arena.masteryActive || !p?.active || p.hp <= 0 || !body) {
      if (g.phase !== 'idle' || g.rubMs > 0) this.glitch = freshGlitchState();
      return;
    }
    const wb = this.arena.scene.physics.world.bounds;

    if (g.phase === 'launch') {
      body.setVelocity(g.dx * GLITCH_LAUNCH_SPEED, g.dy * GLITCH_LAUNCH_SPEED);
      this.pfx.bit(p.x + Phaser.Math.Between(-10, 10), p.y + Phaser.Math.Between(-10, 10), TECH.ice, D_WORLD - 1, 12, 420);
      if (Math.random() < 0.35) this.pfx.glitch(p.x, p.y, 50, 40, TECH.cyan, 200, D_WORLD);
      for (const f of this.enemiesOf('player')) {
        if (g.hit.has(f)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > GLITCH_HIT_RADIUS * f.hitboxMult) continue;
        g.hit.add(f);
        f.takeDamage(GLITCH_DAMAGE, { sourceX: p.x, sourceY: p.y });
        this.arena.spawnHitFlash(f.x, f.y, this.pcol(TECH.ice));
        this.pfx.crash(f.x, f.y, 50, { bits: 8, rings: 1, duration: 320, color: TECH.ice, mark: false });
      }
      const age = time - g.startedAt;
      const landed = age > 90 && (
        (g.dx < -0.2 && body.x <= wb.x + 2) || (g.dx > 0.2 && body.right >= wb.right - 2)
        || (g.dy < -0.2 && body.y <= wb.y + 2) || (g.dy > 0.2 && body.bottom >= wb.bottom - 2));
      if (landed || age > GLITCH_LAUNCH_MAX_MS) {
        body.setVelocity(0, 0);
        this.pfx.crash(p.x, p.y, 60, { bits: 10, rings: 2, duration: 380, color: TECH.cyan, mark: false });
        this.arena.scene.cameras.main.shake(120, 0.004);
        this.glitch = freshGlitchState();
        this.glitch.readyAt = time + GLITCH_COOLDOWN_MS;
      }
      return;
    }

    if (g.phase === 'glitch') {
      body.setVelocity(0, 0);
      // In and out of the wall, on a ragged clock: the physics step drags the body back inside
      // every frame, which is exactly the flicker a real clip looks like.
      const tick = Math.floor(time / 46);
      const into = tick % 2 === 0 ? 20 + (tick * 7) % 9 : -8 + (tick * 5) % 7;
      const slide = ((tick * 13) % 11) - 5;
      p.setPosition(g.baseX - g.nx * into - g.ny * slide, g.baseY - g.ny * into + g.nx * slide);
      if (tick % 2 === 0) this.pfx.glitch(g.baseX, g.baseY, 54, 48, tick % 4 === 0 ? TECH.cyan : TECH.alert, 90, D_UI);
      if (time - g.startedAt >= GLITCH_WINDUP_MS) {
        p.setPosition(g.baseX, g.baseY);
        const ptr = this.arena.scene.input.activePointer;
        let dx = ptr.worldX - p.x, dy = ptr.worldY - p.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        // Aimed into the wall you are stuck in? Then straight out of it, which is across the arena.
        if (dx * g.nx + dy * g.ny < 0.15) { dx = g.nx; dy = g.ny; }
        g.dx = dx; g.dy = dy;
        g.phase = 'launch';
        g.startedAt = time;
        g.hit.clear();
        this.pfx.ring(p.x, p.y, 10, 70, TECH.ice, 300, D_UI, 3);
      }
      return;
    }

    // idle — is the player leaning on a wall?
    let nx = 0, ny = 0;
    if (time >= g.readyAt && Date.now() >= p.stunnedUntil && !this.rebooting.has(p)) {
      const v = body.velocity;
      if (body.x <= wb.x + 3 && v.x < -20) nx = 1;
      else if (body.right >= wb.right - 3 && v.x > 20) nx = -1;
      else if (body.y <= wb.y + 3 && v.y < -20) ny = 1;
      else if (body.bottom >= wb.bottom - 3 && v.y > 20) ny = -1;
    }
    if (nx === 0 && ny === 0) { g.rubMs = Math.max(0, g.rubMs - delta * 2); return; }
    g.rubMs += delta;
    // Sparks off the wall while the rub builds, so it reads as "something is about to give".
    if (Math.random() < 0.3) this.pfx.bit(p.x - nx * 18, p.y - ny * 18, TECH.cyan, D_WORLD, 8, 260);
    if (g.rubMs < GLITCH_RUB_MS) return;
    g.phase = 'glitch';
    g.startedAt = time;
    g.nx = nx; g.ny = ny;
    g.baseX = p.x; g.baseY = p.y;
    g.rubMs = 0;
  }


  // ── Lag (Zip Bomb debuff) ─────────────────────────────────────────────

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

  /** Drop a fighter's lag outright (the restart). */
  private clearLag(f: Fighter, time: number): void {
    const st = this.lagged.get(f);
    st?.spinner?.destroy();
    this.lagged.delete(f);
    if (f.active) f.laggedUntil = 0;
    this.lagClearedAt.set(f, time);
  }

  private updateLag(time: number, delta: number): void {
    // Online the opponent's status mirror can hand the timer back for a tick or two after a
    // restart cleared it; hold it at zero until their side has caught up.
    for (const [f, at] of this.lagClearedAt) {
      if (time - at > 1500) { this.lagClearedAt.delete(f); continue; }
      if (f.active && !this.lagged.has(f)) f.laggedUntil = 0;
    }
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
    g.lineStyle(3, this.col(f === this.arena.player ? 'npc' : 'player')(0x1b4a6b), 0.9);
    g.strokeCircle(cx, cy, R);
    // Tail: three arc segments dimming away from the head of the sweep.
    for (let i = 0; i < 3; i++) {
      const a = st.spinnerAngle - i * 0.45;
      g.lineStyle(3, this.col(f === this.arena.player ? 'npc' : 'player')(0x66ddff), 0.9 - i * 0.28);
      g.beginPath();
      g.arc(cx, cy, R, a - 0.4, a, false);
      g.strokePath();
    }
    g.fillStyle(this.col(f === this.arena.player ? 'npc' : 'player')(0xaaffff), 1);
    g.fillCircle(cx + Math.cos(st.spinnerAngle) * R, cy + Math.sin(st.spinnerAngle) * R, 2.6);
  }

  private updateJail(time: number): void {
    for (let i = this.jails.length - 1; i >= 0; i--) {
      const box = this.jails[i];
      const fighter = box.f;
      if (time >= box.expiresAt || !fighter.active || fighter.hp <= 0) {
        // The dialog closes and the bits go with it.
        this.fx(box.owner).bits(box.x, box.y, 8, { speed: 200, size: 9, life: 420, depth: D_UI, color: TECH.alert });
        this.jails.splice(i, 1);
        continue;
      }
      // A replica is placed by its own machine, which is running this same cell.
      if (fighter.netGhost) continue;
      const minX = box.x - box.w / 2 + 14, maxX = box.x + box.w / 2 - 14;
      const minY = box.y - box.h / 2 + 22, maxY = box.y + box.h / 2 - 14;
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
