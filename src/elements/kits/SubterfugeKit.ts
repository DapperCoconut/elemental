import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import type { CustomStatus } from './StatusHudKit';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface SubterfugeArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get sceneWidth(): number;
  get sceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamage(owner: 'player' | 'npc', cx: number, cy: number, radius: number, damage: number): void;
  // ── Dark Treachery routing ──
  /** Cast the given element's Q through the owner's regular CastContext. Returns false if the element has no ultimate. */
  castForeignQ(elementId: string, owner: 'player' | 'npc'): boolean;
  earthGolem(owner: 'player' | 'npc'): void;
  oilTrain(owner: 'player' | 'npc'): void;
  iceFrozenSolidNoFrost(owner: 'player' | 'npc', tx: number, ty: number): void;
  timeAlwaysNoonForced(owner: 'player' | 'npc'): void;
  lightSpeedOLight(owner: 'player' | 'npc'): void;
  echoEclipseDirect(owner: 'player' | 'npc'): void;
  magicNecronomicon(owner: 'player' | 'npc'): void;
  crystalClonePositions(owner: 'player' | 'npc'): Array<{ x: number; y: number }>;
  // ── Mastery ──
  /** The local player is running Subterfuge with Element Mastery enabled. */
  get masteryActive(): boolean;
  /** Online only: the opponent is running Subterfuge with Element Mastery enabled. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBestStat(key: string, value: number): void;
  getMasteryStat(key: string): number;
  /** Every registered element id — the denominator for "steal 10 different ultimates". */
  allElementIds(): string[];
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface SubDagger {
  sprite: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
  color: 'red' | 'black';
  x: number;
  y: number;
  destX: number;
  destY: number;
  dirX: number;
  dirY: number;
  state: 'flying' | 'planted' | 'returning';
  hitSet: Set<Fighter>;
}

/** The four hires the Rolodex (R+) unlocks. Without R+ only 'lackey' is ever built. */
type RecruitType = 'lackey' | 'runner' | 'thug' | 'specialist';

interface Lackey {
  owner: 'player' | 'npc';
  type: RecruitType;
  sprite: Phaser.GameObjects.Arc;
  tie: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text | null;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  levelText: Phaser.GameObjects.Text | null;
  x: number;
  y: number;
  loyaltyMs: number;
  loyaltyMaxMs: number;
  bullets: number;
  reloadingUntil: number;
  nextShotAt: number;
  strafeDir: number;
  ignited: boolean;
  igniteAura: Phaser.GameObjects.Arc | null;
  // ── Hardened Criminals (F+) ──
  xp: number;
  level: number;
  xpDmgAccum: number;   // damage dealt since the last +1 XP
  xpSecAccum: number;   // ms since the last +1 XP tick
  inverted: boolean;    // level-V palette applied
  // ── Per-type scratch ──
  wanderX: number;      // runner: current destination
  wanderY: number;
  payoutAccum: number;  // runner (level V): ms since the last 1💵 stipend
}

/** Blade Dance (Click+): a returned dagger that stayed on as a bodyguard. */
interface OrbitDagger {
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Rectangle;
  color: 'red' | 'black';
  angle: number;
  endsAt: number;
  nextHitAt: number;
}

interface DiscoBall {
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Arc;
  shine: Phaser.GameObjects.Graphics;
  endsAt: number;
  nextShotAt: number;
}

/** Mastery — Smoke Break: the lit cigarette one side is currently nursing. */
interface Cigarette {
  owner: 'player' | 'npc';
  /** Burn time left in ms — drains in real time and loses a whole second per hit taken. */
  msLeft: number;
  sprite: Phaser.GameObjects.Rectangle;
  ember: Phaser.GameObjects.Arc;
  smokeAccumMs: number;
}

/** Mastery — Smoke Break: the cloud a flicked cigarette leaves behind. */
interface SmokeCloud {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  radius: number;
  endsAt: number;
  gfx: Phaser.GameObjects.Graphics;
  /** Per-puff drift so the blob roils instead of sitting as a flat disc. */
  puffs: Array<{ ox: number; oy: number; r: number; phase: number; speed: number }>;
  wispAccumMs: number;
}

/** Preserved Atom-Nhilego state (see note at the nhilego section below). */
interface NhilegoShadow {
  circle: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  fireAt: number;
  owner: 'player' | 'npc';
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONEY_MAX = 3;
const MONEY_MAX_MASTERY = 4;  // Mastery passive: Big Pockets
const MONEY_START = 2;
const MONEY_TICK_MS = 5000;

const DAGGER_SPEED = 900;
const DAGGER_THROW_DMG = 8;
const DAGGER_RETURN_DMG = 12;
const DAGGER_MAX = 3;
const DAGGER_ARRIVE_R = 12;
const DAGGER_FILL: Record<'red' | 'black', number> = { red: 0xdd2233, black: 0x1a1a1a };

const SPRAY_CONE_HALF = Phaser.Math.DegToRad(7.5); // 15° total cone
const SPRAY_DMG = 2;
const SPRAY_INTERVAL_MS = 80;
const SPRAY_RANGE = 520;
const BULLETS_MAX = 50;
const BULLETS_MAX_UPG = 75;           // E+ Steady Hands
const BULLETS_START = 25;
const BULLETS_RELOAD = 25;
const AMMO_PER_10_DMG = 3;

// E+ Steady Hands: sustained fire walks the cone down to nothing over 8s; a gap
// of half a second in the trigger loses the whole sight picture.
const SPRAY_FOCUS_FULL_MS = 8000;
const SPRAY_FOCUS_GAP_MS = 450;

const LACKEY_LOYALTY_MS = 20000;
const LACKEY_BRIBE_BONUS = 1.2; // bribe refills to 120% of base
const LACKEY_DMG = 1;
const LACKEY_MAG = 25;
const LACKEY_RELOAD_MS = 5000;
const LACKEY_SHOT_INTERVAL = 140;
const LACKEY_RANGE = 560;
const LACKEY_PROJ_HIT_LOSS_MS = 2000;
const LACKEY_IGNITE_EXTRA_PER_SEC = 2000; // Soul copy: +2s loyalty lost per second

// ── R+ The Rolodex ──────────────────────────────────────────────────────────
const RECRUIT_ORDER: RecruitType[] = ['lackey', 'runner', 'thug', 'specialist'];
const RECRUIT_COST: Record<RecruitType, number> = { lackey: 1, runner: 1, thug: 2, specialist: 3 };
const RECRUIT_LOYALTY_MS: Record<RecruitType, number> = { lackey: LACKEY_LOYALTY_MS, runner: 12000, thug: 35000, specialist: 20000 };
const RECRUIT_NAME: Record<RecruitType, string> = { lackey: 'Lackey', runner: 'Money Runner', thug: 'Thug', specialist: 'Specialist' };
const RECRUIT_EMOJI: Record<RecruitType, string> = { lackey: '🕴️', runner: '💸', thug: '🏏', specialist: '🛡️' };
const RECRUIT_RADIUS: Record<RecruitType, number> = { lackey: 14, runner: 11, thug: 16, specialist: 15 };
const RECRUIT_WEDGE_COLOR: Record<RecruitType, number> = { lackey: 0x552222, runner: 0x226633, thug: 0x772222, specialist: 0x444466 };

const RUNNER_SPEED = 280;
const RUNNER_QUIT_MONEY = 2;
const RUNNER_L5_STIPEND_MS = 15000;

const THUG_SPEED = 175;
const THUG_SWING_RANGE = 46;
const THUG_SWING_CD_MS = 1800;
const THUG_DMG = 12;
const THUG_STUN_MS = 2000;
const THUG_KNOCKBACK = 720;
const THUG_KNOCKBACK_MS = 260;

const SPEC_SPEED = 140;
const SPEC_RANGE = 230;
const SPEC_PELLETS = 5;
const SPEC_PELLETS_L5 = 7;
const SPEC_PELLET_DMG = 2;
const SPEC_SHOT_INTERVAL = 500;
const SPEC_MAG = 5;
const SPEC_CONE_HALF = Phaser.Math.DegToRad(11);

// ── F+ Hardened Criminals ───────────────────────────────────────────────────
const XP_PER_LEVEL = 50;
const XP_MAX_LEVEL = 5;
const XP_PER_BRIBE = 10;
const XP_DMG_PER_POINT = 25;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// ── Click+ Blade Dance ──────────────────────────────────────────────────────
const ORBIT_CHANCE = 0.15;
const ORBIT_MS = 10000;
const ORBIT_DMG = 12;
const ORBIT_HIT_CD_MS = 500;
const ORBIT_RADIUS = 48;
const ORBIT_RAD_PER_SEC = 2.6;

// ── Q+ On Retainer ──────────────────────────────────────────────────────────
const RETAINER_MS = 8000;
const RETAINER_COST = 2;

const BRIBE_MS = 8000;
const BRIBE_DMG_MULT = 0.75; // bribed enemy deals 25% less

const TREACHERY_DELAY_MS = 2000;

const DISCO_MS = 12000;
const DISCO_SHOT_INTERVAL = 3000;
const DISCO_DMG = 10;

const LINK_MS = 5000;                 // Life copy: lackey damage-link duration
const LINK_LOYALTY_MS_PER_DMG = 150;  // each split damage point costs a lackey 0.15s loyalty

// ── Mastery: Smoke Break ────────────────────────────────────────────────────
const SMOKE_COOLDOWN_MS = 20000;
const CIG_BURN_MS = 25000;
const CIG_HIT_COST_MS = 1000;         // every hit taken burns a second off the cigarette
const CIG_DAMAGE_MULT = 0.75;
const SMOKE_CLOUD_MS = 8000;
const SMOKE_CLOUD_RADIUS = 132;
const SMOKE_TOSS_SPEED = 900;
const SMOKE_EXPOSE_MS = 3000;         // attacking from inside the cloud gives you away
const SMOKE_LOYALTY_DRAIN_MULT = 0.4; // recruits in the cloud hold on far longer
const SMOKE_PUFF_COUNT = 11;
const SMOKE_DEPTH_OWN = 6;            // your own cloud sits under the fighters — a thin haze
const SMOKE_DEPTH_ENEMY = 24;         // theirs sits over everything and blinds you

const OVERCHARGE_MS = 5000;           // Electricity copy
const ACID_RAIN_MS = 8000;            // Acid copy: whole screen, ¼ damage (6 dmg/0.5s → 1.5)
const ACID_RAIN_TICK_MS = 500;
const ACID_RAIN_TICK_DMG = 1.5;

// ── Kit ──────────────────────────────────────────────────────────────────────

export class SubterfugeKit {
  private api: SubterfugeArenaApi;

  // ── Money ────────────────────────────────────────────────────────────────
  private money = MONEY_START;
  private npcMoney = MONEY_START;
  private moneyAccumMs = 0;
  private npcMoneyAccumMs = 0;
  private moneyIcons: Phaser.GameObjects.Text[] = [];
  private npcMoneyIcons: Phaser.GameObjects.Text[] = [];

  // ── Molecular Cutter daggers (Click — unchanged from Quantum) ────────────
  private playerDaggers: SubDagger[] = [];
  private npcDaggers: SubDagger[] = [];
  private npcDaggerNextThrowAt = 0;
  private pointerWasDown = false;
  private orbitDaggers: OrbitDagger[] = [];   // Click+ Blade Dance

  // ── Spray (E) ────────────────────────────────────────────────────────────
  private bullets = BULLETS_START;
  private npcBullets = BULLETS_START;
  private nextSprayShotAt = 0;
  private sprayHeld = false;
  private sprayDmgAccum = 0;
  private npcSprayDmgAccum = 0;
  private bulletCounterText: Phaser.GameObjects.Text | null = null;
  private lastSprayShotAt = 0;
  private npcLastSprayShotAt = 0;
  private sprayFocusMs = 0;             // E+ Steady Hands
  private npcSprayFocusMs = 0;

  // ── Lackeys (R) ──────────────────────────────────────────────────────────
  private lackeys: Lackey[] = [];

  // R+ hiring wheel (player only)
  private recruitMenuOpen = false;
  private recruitMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private recruitMenuLabels: Phaser.GameObjects.Text[] = [];
  private recruitSelectedIndex = 0;
  private recruitLastPick = 0;

  // Thug bat: this codebase's earthStunnedUntil is inert, so — like FateKit and
  // GunpowderKit — the stun/knockback is enforced here by driving velocity.
  private playerStunUntil = 0;
  private npcStunUntil = 0;
  private knocks = new Map<Fighter, { vx: number; vy: number; until: number }>();

  // ── Bribe (F) ────────────────────────────────────────────────────────────
  private npcBribedUntil = 0;      // player bribed the npc
  private playerBribedUntil = 0;   // npc bribed the player
  private npcCensorBar: Phaser.GameObjects.Rectangle | null = null;
  private playerCensorBar: Phaser.GameObjects.Rectangle | null = null;

  // ── Dark Treachery (Q) ───────────────────────────────────────────────────
  private treacheryFiresAt = 0;        // player channel
  private npcTreacheryFiresAt = 0;     // npc channel
  private treacheryFogNextAt = 0;
  private npcTreacheryFogNextAt = 0;

  // Q+ On Retainer — the contract stays open for 8s after a resolve
  private retainerElementId: string | null = null;
  private retainerUntil = 0;
  private npcRetainerElementId: string | null = null;
  private npcRetainerUntil = 0;
  private npcRetainerNextTryAt = 0;
  private retainerLabel: Phaser.GameObjects.Text | null = null;

  // Copied-Q states
  private discoBalls: DiscoBall[] = [];
  private linkUntil = 0;               // Life copy (player)
  private npcLinkUntil = 0;
  private overchargeUntil = 0;         // Electricity copy (player)
  private npcOverchargeUntil = 0;
  private overchargeAura: Phaser.GameObjects.Arc | null = null;
  private npcOverchargeAura: Phaser.GameObjects.Arc | null = null;
  private acidRainUntil = 0;           // Acid copy (player-owned rain)
  private npcAcidRainUntil = 0;
  private acidRainTickAccum = 0;
  private npcAcidRainTickAccum = 0;
  private acidRainDmgAccum = 0;
  private npcAcidRainDmgAccum = 0;
  private acidRainDropAccum = 0;

  // ── Mastery: Smoke Break ─────────────────────────────────────────────────
  // Absolute timestamps against scene.time.now, so they start at -COOLDOWN: the kit's
  // very first match runs the constructor and not reset(), and a plain 0 would lock the
  // ability out for the first 20 seconds of it.
  private smokeLastCastAt = -SMOKE_COOLDOWN_MS;
  private cigarettes: Cigarette[] = [];
  private smokeClouds: SmokeCloud[] = [];
  /** Flicked cigarette in flight, before it lands and blooms into a cloud. */
  private smokeTosses: Array<{ owner: 'player' | 'npc'; x: number; y: number; destX: number; destY: number; sprite: Phaser.GameObjects.Rectangle }> = [];
  /** Attacking from cover gives you away — invisibility is suppressed until this passes. */
  private smokeExposedUntil = { player: 0, npc: 0 };
  /** Whether *we* are the ones currently hiding this fighter, so we only ever unhide our own. */
  private smokeHidden = { player: false, npc: false };
  private smokeStatusShown = false;

  // ── Atom-Nhilego (preserved from Quantum — NOT currently bound to any input.
  //    Kept intact per request: it will return as a new ability soon. Call
  //    doPlayerAtomNhilego()/doNpcAtomNhilego() to activate. ────────────────
  private playerNhilegoActive = false;
  private playerNhilegoRadius = 70;
  private playerNhilegoSuccessCount = 0;
  private playerNhilegoShadow: NhilegoShadow | null = null;
  private npcNhilegoActive = false;
  private npcNhilegoRadius = 70;
  private npcNhilegoSuccessCount = 0;
  private npcNhilegoShadow: NhilegoShadow | null = null;

  constructor(api: SubterfugeArenaApi) {
    this.api = api;
  }

  // ── Public getters (NPC AI / ArenaScene) ─────────────────────────────────

  getNpcMoney(): number { return this.npcMoney; }
  getNpcBullets(): number { return this.npcBullets; }
  getNpcLackeyCount(): number { return this.lackeys.filter(l => l.owner === 'npc').length; }
  getPlayerMoney(): number { return this.money; }

  // ── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.money = MONEY_START;
    this.npcMoney = MONEY_START;
    this.moneyAccumMs = 0;
    this.npcMoneyAccumMs = 0;
    for (const t of this.moneyIcons) { if (t?.active) t.destroy(); }
    this.moneyIcons = [];
    for (const t of this.npcMoneyIcons) { if (t?.active) t.destroy(); }
    this.npcMoneyIcons = [];

    for (const d of this.playerDaggers) { if (d.sprite?.active) d.sprite.destroy(); }
    this.playerDaggers = [];
    for (const d of this.npcDaggers) { if (d.sprite?.active) d.sprite.destroy(); }
    this.npcDaggers = [];
    this.npcDaggerNextThrowAt = 0;
    this.pointerWasDown = false;
    for (const o of this.orbitDaggers) { if (o.sprite?.active) o.sprite.destroy(); }
    this.orbitDaggers = [];

    this.bullets = BULLETS_START;
    this.npcBullets = BULLETS_START;
    this.nextSprayShotAt = 0;
    this.sprayHeld = false;
    this.sprayDmgAccum = 0;
    this.npcSprayDmgAccum = 0;
    this.lastSprayShotAt = 0;
    this.npcLastSprayShotAt = 0;
    this.sprayFocusMs = 0;
    this.npcSprayFocusMs = 0;
    if (this.bulletCounterText?.active) this.bulletCounterText.destroy();
    this.bulletCounterText = null;

    for (const l of this.lackeys) this._destroyLackeyVisuals(l);
    this.lackeys = [];
    this._closeRecruitMenu();
    this.recruitSelectedIndex = 0;
    this.recruitLastPick = 0;
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;
    this.knocks.clear();

    this.npcBribedUntil = 0;
    this.playerBribedUntil = 0;
    if (this.npcCensorBar?.active) this.npcCensorBar.destroy();
    this.npcCensorBar = null;
    if (this.playerCensorBar?.active) this.playerCensorBar.destroy();
    this.playerCensorBar = null;
    this.api.player.bribeIncomingMult = 1;
    this.api.npc.bribeIncomingMult = 1;

    this.treacheryFiresAt = 0;
    this.npcTreacheryFiresAt = 0;
    this.treacheryFogNextAt = 0;
    this.npcTreacheryFogNextAt = 0;
    this.retainerElementId = null;
    this.retainerUntil = 0;
    this.npcRetainerElementId = null;
    this.npcRetainerUntil = 0;
    this.npcRetainerNextTryAt = 0;
    if (this.retainerLabel?.active) this.retainerLabel.destroy();
    this.retainerLabel = null;

    for (const b of this.discoBalls) {
      if (b.sprite?.active) b.sprite.destroy();
      if (b.shine?.active) b.shine.destroy();
    }
    this.discoBalls = [];
    this.linkUntil = 0;
    this.npcLinkUntil = 0;
    this.overchargeUntil = 0;
    this.npcOverchargeUntil = 0;
    if (this.overchargeAura?.active) this.overchargeAura.destroy();
    this.overchargeAura = null;
    if (this.npcOverchargeAura?.active) this.npcOverchargeAura.destroy();
    this.npcOverchargeAura = null;
    this.acidRainUntil = 0;
    this.npcAcidRainUntil = 0;
    this.acidRainTickAccum = 0;
    this.npcAcidRainTickAccum = 0;
    this.acidRainDmgAccum = 0;
    this.npcAcidRainDmgAccum = 0;
    this.acidRainDropAccum = 0;

    this.smokeLastCastAt = -SMOKE_COOLDOWN_MS;
    for (const c of this.cigarettes) this._destroyCigaretteVisuals(c);
    this.cigarettes = [];
    for (const c of this.smokeClouds) { if (c.gfx?.active) c.gfx.destroy(); }
    this.smokeClouds = [];
    for (const t of this.smokeTosses) { if (t.sprite?.active) t.sprite.destroy(); }
    this.smokeTosses = [];
    this.smokeExposedUntil = { player: 0, npc: 0 };
    this.smokeHidden = { player: false, npc: false };
    this.api.player.smokeIncomingMult = 1;
    this.api.npc.smokeIncomingMult = 1;
    if (this.smokeStatusShown) {
      this.api.setStatusIndicator('smoke-break', null);
      this.smokeStatusShown = false;
    }

    this.playerNhilegoActive = false;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    if (this.playerNhilegoShadow?.circle?.active) this.playerNhilegoShadow.circle.destroy();
    this.playerNhilegoShadow = null;
    this.npcNhilegoActive = false;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    if (this.npcNhilegoShadow?.circle?.active) this.npcNhilegoShadow.circle.destroy();
    this.npcNhilegoShadow = null;
  }

  // ── Upgrades ─────────────────────────────────────────────────────────────

  /** True if the given side (player/npc, Subterfuge) has the shop upgrade `slot`. */
  private _up(owner: 'player' | 'npc', slot: string): boolean {
    return owner === 'player'
      ? this.api.elementId === 'quantum' && this.api.hasUpgrade(slot)
      : this.api.hasNpcUpgrade(slot);
  }

  private _bulletsMax(owner: 'player' | 'npc'): number {
    return this._up(owner, 'e') ? BULLETS_MAX_UPG : BULLETS_MAX;
  }

  // ── Input (player only) ──────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer): void {
    const { api } = this;
    if (api.elementId !== 'quantum') return;
    if (api.nukeChanneling) return;

    const { player } = api;

    // ── R+ hiring wheel owns every input while it is open ────────────────
    if (this.recruitMenuOpen) {
      this._updateRecruitMenuHover(pointer);
      if (Phaser.Input.Keyboard.JustUp(api.rKey)) {
        const pick = this.recruitSelectedIndex;
        this.recruitLastPick = pick;
        this._closeRecruitMenu();
        this._tryHire('player', RECRUIT_ORDER[pick]);
      }
      this.pointerWasDown = pointer.isDown;
      return;
    }

    // ── Mastery: Smoke Break takes over whichever slot it is bound to ────
    const smokeSlot = this._smokeSlot();
    if (smokeSlot) {
      const key = smokeSlot === 'e' ? api.eKey : smokeSlot === 'r' ? api.rKey : smokeSlot === 'f' ? api.fKey : api.qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this._trySmokeBreak(time, pointer.worldX, pointer.worldY);
    }

    // ── E: Spray — hold to fire; press with 0 bullets to buy a reload ────
    if (smokeSlot !== 'e') {
      if (Phaser.Input.Keyboard.JustDown(api.eKey)) {
        if (this.bullets <= 0 && player.getCooldownRatio('sub-spray') >= 1) {
          if (this.money >= 1) {
            this._spendMoney('player', 1);
            this.bullets = Math.min(this._bulletsMax('player'), BULLETS_RELOAD);
            player.startCooldown('sub-spray');
            api.showFloatingText(player.x, player.y - 40, '💵 Reloaded!', '#ff5555');
          } else {
            api.showFloatingText(player.x, player.y - 40, 'No money!', '#888888');
          }
        }
      }
      if (api.eKey.isDown && this.bullets > 0) {
        if (!this.sprayHeld && player.getCooldownRatio('sub-spray') < 1) {
          // still cooling down from the previous burst
        } else {
          this.sprayHeld = true;
          if (time >= this.nextSprayShotAt) {
            this.nextSprayShotAt = time + SPRAY_INTERVAL_MS;
            this._fireSprayShot('player', pointer.worldX, pointer.worldY);
          }
        }
      } else if (this.sprayHeld) {
        this.sprayHeld = false;
        player.startCooldown('sub-spray');
      }
    }

    // ── R: Recruit — straight to a Lackey, or the Rolodex wheel with R+ ──
    if (smokeSlot !== 'r' && Phaser.Input.Keyboard.JustDown(api.rKey)) {
      if (player.getCooldownRatio('sub-recruit') >= 1) {
        if (this._up('player', 'r')) this._openRecruitMenu(this.recruitLastPick);
        else this._tryHire('player', 'lackey');
      }
    }

    // ── F: Bribe ─────────────────────────────────────────────────────────
    if (smokeSlot !== 'f' && Phaser.Input.Keyboard.JustDown(api.fKey)) {
      if (player.getCooldownRatio('sub-bribe') >= 1) {
        if (this.money >= 1) {
          if (this._doBribe('player', pointer.worldX, pointer.worldY, time)) {
            this._spendMoney('player', 1);
            player.startCooldown('sub-bribe');
          }
        } else {
          api.showFloatingText(player.x, player.y - 40, 'No money!', '#888888');
        }
      }
    }

    // ── Q: Dark Treachery — or a retainer recast while the contract is open ──
    if (smokeSlot !== 'q' && Phaser.Input.Keyboard.JustDown(api.qKey) && this.treacheryFiresAt === 0) {
      if (this.retainerElementId && time < this.retainerUntil) {
        if (this.money >= RETAINER_COST) {
          this._spendMoney('player', RETAINER_COST);
          api.showFloatingText(player.x, player.y - 44, '🤝 On Retainer!', '#ff5555');
          this._executeTreachery('player', time, this.retainerElementId);
        } else {
          api.showFloatingText(player.x, player.y - 40, `Need ${RETAINER_COST}💵!`, '#888888');
        }
      } else if (player.getCooldownRatio('sub-treachery') >= 1) {
        player.startCooldown('sub-treachery');
        this.treacheryFiresAt = time + TREACHERY_DELAY_MS;
        this.treacheryFogNextAt = time;
        api.showFloatingText(player.x, player.y - 44, '🌫️ Dark Treachery...', '#552255');
      }
    }

    // ── Click: Molecular Cutter — throw, or recall once the max are out ──
    const isDown = pointer.isDown;
    if (isDown && !this.pointerWasDown) {
      this._playerClickDaggers(pointer.worldX, pointer.worldY);
    }
    this.pointerWasDown = isDown;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { api } = this;
    const dt = delta / 1000;
    const isPlayerSub = api.elementId === 'quantum';
    const isNpcSub = api.npcElementId === 'quantum';

    if (isPlayerSub) {
      this._tickMoney('player', delta);
      this._renderMoneyHud('player');
      this._renderBulletCounter(time);
      this._tickTreacheryChannel('player', time);
      this._renderRetainerLabel(time);
      if (this.recruitMenuOpen) this._drawRecruitMenu(this.recruitSelectedIndex);
    }
    if (isNpcSub) {
      this._tickMoney('npc', delta);
      this._renderMoneyHud('npc');
      this._tickTreacheryChannel('npc', time);
      this._tickNpcRetainer(time);
    }

    this._updateSmokeBreak(time, delta, dt);

    this._updateDaggers(this.playerDaggers, 'player', dt);
    this._updateDaggers(this.npcDaggers, 'npc', dt);
    this._updateOrbitDaggers(time, dt);
    this._updateLackeys(time, delta);
    this._updateStunsAndKnocks(time);
    this._updateBribes(time);
    this._updateDiscoBalls(time);
    this._updateOvercharge(time);
    this._updateAcidRain(time, delta);
    this._updateLinks(time);

    if (this.playerNhilegoActive) this._tickNhilego(time, 'player');
    if (this.npcNhilegoActive) this._tickNhilego(time, 'npc');
  }

  // ── Money ────────────────────────────────────────────────────────────────

  /** Wallet size — Mastery's Big Pockets passive widens it from 3 to 4. */
  private _moneyMax(owner: 'player' | 'npc'): number {
    const mastered = owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
    return mastered ? MONEY_MAX_MASTERY : MONEY_MAX;
  }

  private _tickMoney(owner: 'player' | 'npc', delta: number): void {
    const cap = this._moneyMax(owner);
    if (owner === 'player') {
      if (this.money >= cap) { this.moneyAccumMs = 0; return; }
      this.moneyAccumMs += delta;
      if (this.moneyAccumMs >= MONEY_TICK_MS) {
        this.moneyAccumMs -= MONEY_TICK_MS;
        this.money = Math.min(cap, this.money + 1);
      }
    } else {
      if (this.npcMoney >= cap) { this.npcMoneyAccumMs = 0; return; }
      this.npcMoneyAccumMs += delta;
      if (this.npcMoneyAccumMs >= MONEY_TICK_MS) {
        this.npcMoneyAccumMs -= MONEY_TICK_MS;
        this.npcMoney = Math.min(cap, this.npcMoney + 1);
      }
    }
  }

  private _addMoney(owner: 'player' | 'npc', amount: number): void {
    const cap = this._moneyMax(owner);
    if (owner === 'player') this.money = Math.min(cap, this.money + amount);
    else this.npcMoney = Math.min(cap, this.npcMoney + amount);
  }

  /** Single chokepoint for money leaving a wallet, so the mastery "spend 50" stat can't drift. */
  private _spendMoney(owner: 'player' | 'npc', amount: number): void {
    if (owner === 'player') {
      this.money -= amount;
      this.api.recordMasteryStat('moneySpent', amount);
    } else {
      this.npcMoney -= amount;
    }
  }

  private _renderMoneyHud(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    const icons = owner === 'player' ? this.moneyIcons : this.npcMoneyIcons;
    const amount = owner === 'player' ? this.money : this.npcMoney;
    const cap = this._moneyMax(owner);
    // Big Pockets can widen the wallet mid-construction, so top the row up rather than
    // building it once — the icons are laid out from `cap` each frame anyway.
    while (icons.length < cap) {
      const t = this.api.scene.add.text(0, 0, '💵', { fontSize: '13px' })
        .setOrigin(0.5).setDepth(21).setTint(0xff4444) as Phaser.GameObjects.Text;
      icons.push(t);
    }
    for (let i = 0; i < icons.length; i++) {
      const t = icons[i];
      if (!t.active) continue;
      t.setVisible(i < cap);
      t.setPosition(fighter.x + (i - (cap - 1) / 2) * 16, fighter.y - 44);
      t.setAlpha(i < amount ? 1 : 0.15);
    }
  }

  // ── Spray ────────────────────────────────────────────────────────────────

  private _fireSprayShot(owner: 'player' | 'npc', tx: number, ty: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    if (owner === 'player') {
      if (this.bullets <= 0) return;
      this.bullets -= 1;
      this.api.recordMasteryStat('bulletsFired', 1);
    } else {
      if (this.npcBullets <= 0) return;
      this.npcBullets -= 1;
    }
    const now = this.api.scene.time.now;
    const cone = this._sprayCone(owner, now);
    if (owner === 'player') this.lastSprayShotAt = now;
    else this.npcLastSprayShotAt = now;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    this._hitscanBeam(owner, caster.x, caster.y, baseAngle + Phaser.Math.FloatBetween(-cone, cone), SPRAY_DMG, 0xff3333);

    // Crystal copy: active clones also shoot guns with E
    for (const pos of this.api.crystalClonePositions(owner)) {
      const cloneAngle = Math.atan2(ty - pos.y, tx - pos.x);
      this._hitscanBeam(owner, pos.x, pos.y, cloneAngle + Phaser.Math.FloatBetween(-cone, cone), SPRAY_DMG, 0xff8888);
    }
  }

  /**
   * Half-angle of the spray cone for this shot. E+ Steady Hands walks it down to
   * zero over 8s of continuous fire; a pause of SPRAY_FOCUS_GAP_MS resets it.
   */
  private _sprayCone(owner: 'player' | 'npc', now: number): number {
    if (!this._up(owner, 'e')) return SPRAY_CONE_HALF;
    const lastAt = owner === 'player' ? this.lastSprayShotAt : this.npcLastSprayShotAt;
    const gap = lastAt > 0 ? now - lastAt : Infinity;
    let focus = owner === 'player' ? this.sprayFocusMs : this.npcSprayFocusMs;
    focus = gap > SPRAY_FOCUS_GAP_MS ? 0 : Math.min(SPRAY_FOCUS_FULL_MS, focus + gap);
    if (owner === 'player') this.sprayFocusMs = focus;
    else this.npcSprayFocusMs = focus;
    return SPRAY_CONE_HALF * (1 - focus / SPRAY_FOCUS_FULL_MS);
  }

  /** Hitscan beam: damages the first enemy near the ray, draws a fading tracer. */
  private _hitscanBeam(owner: 'player' | 'npc', sx: number, sy: number, angle: number, dmg: number, color: number): void {
    const ex = sx + Math.cos(angle) * SPRAY_RANGE;
    const ey = sy + Math.sin(angle) * SPRAY_RANGE;
    const targets: Fighter[] = owner === 'player' ? [this.api.npc] : [this.api.player];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (this._pointToSegmentDist(t.x, t.y, sx, sy, ex, ey) <= 24) {
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, color);
        this._addSprayAmmoFromDamage(owner, dmg);
        this._noteSmokeAttack(owner);
      }
    }
    // A player's spray also stings enemy lackeys (NPC subterfuge mirror)
    const enemyLackeys = this.lackeys.filter(l => l.owner !== owner);
    for (const l of enemyLackeys) {
      if (this._pointToSegmentDist(l.x, l.y, sx, sy, ex, ey) <= 20) {
        // Specialists are armored — bullets rattle off without shaking their loyalty.
        if (l.type !== 'specialist') l.loyaltyMs -= 500;
        this.api.spawnHitFlash(l.x, l.y, color);
      }
    }
    const gfx = this.api.scene.add.graphics().setDepth(8);
    gfx.lineStyle(2, color, 0.9);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(ex, ey);
    gfx.strokePath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 120, onComplete: () => gfx.destroy() });
  }

  /** Every 10 damage dealt (daggers + spray) grants 3 bullets. */
  private _addSprayAmmoFromDamage(owner: 'player' | 'npc', dmg: number): void {
    const cap = this._bulletsMax(owner);
    if (owner === 'player') {
      this.sprayDmgAccum += dmg;
      while (this.sprayDmgAccum >= 10) {
        this.sprayDmgAccum -= 10;
        this.bullets = Math.min(cap, this.bullets + AMMO_PER_10_DMG);
      }
    } else {
      this.npcSprayDmgAccum += dmg;
      while (this.npcSprayDmgAccum >= 10) {
        this.npcSprayDmgAccum -= 10;
        this.npcBullets = Math.min(cap, this.npcBullets + AMMO_PER_10_DMG);
      }
    }
  }

  private _renderBulletCounter(time: number): void {
    const { player, scene } = this.api;
    const visible = this.api.eKey.isDown || time - this.lastSprayShotAt < 800;
    if (!this.bulletCounterText || !this.bulletCounterText.active) {
      this.bulletCounterText = scene.add.text(player.x, player.y - 58, '', {
        fontSize: '14px', fontFamily: '"Arial Black"', color: '#ff3333',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22);
    }
    this.bulletCounterText.setVisible(visible);
    if (visible) {
      this.bulletCounterText.setText(`${this.bullets}`).setPosition(player.x, player.y - 58);
    }
  }

  private _pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Lackeys ──────────────────────────────────────────────────────────────

  /** Pay for and place a recruit; falls through to a floating "No money!" when broke. */
  private _tryHire(owner: 'player' | 'npc', type: RecruitType): boolean {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    const cost = RECRUIT_COST[type];
    const purse = owner === 'player' ? this.money : this.npcMoney;
    if (purse < cost) {
      if (owner === 'player') {
        this.api.showFloatingText(fighter.x, fighter.y - 40, cost > 1 ? `Need ${cost}💵!` : 'No money!', '#888888');
      }
      return false;
    }
    this._spendMoney(owner, cost);
    this._spawnLackey(owner, type);
    fighter.startCooldown('sub-recruit');
    return true;
  }

  private _spawnLackey(owner: 'player' | 'npc', type: RecruitType = 'lackey'): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.random() * Math.PI * 2;
    const x = caster.x + Math.cos(angle) * 50;
    const y = caster.y + Math.sin(angle) * 50;
    const r = RECRUIT_RADIUS[type];
    const sprite = scene.add.circle(x, y, r, 0x222222, 1)
      .setStrokeStyle(2, owner === 'player' ? 0xdd2233 : 0x992222, 1).setDepth(7) as Phaser.GameObjects.Arc;
    const tie = scene.add.rectangle(x, y + 2, type === 'specialist' ? 12 : 4, 10, 0xdd2233).setDepth(8) as Phaser.GameObjects.Rectangle;
    const icon = type === 'lackey' ? null
      : scene.add.text(x, y - 1, RECRUIT_EMOJI[type], { fontSize: '11px' }).setOrigin(0.5).setDepth(9) as Phaser.GameObjects.Text;
    const barBg = scene.add.rectangle(x, y - 24, 32, 5, 0x333311, 0.8).setDepth(11) as Phaser.GameObjects.Rectangle;
    const barFill = scene.add.rectangle(x - 16, y - 24, 32, 5, 0xffdd33, 0.95).setOrigin(0, 0.5).setDepth(12) as Phaser.GameObjects.Rectangle;
    const levelText = this._up(owner, 'f')
      ? scene.add.text(x, y - 38, ROMAN[1], {
          fontSize: '17px', fontFamily: '"Arial Black"', color: '#ffdd33',
          stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(13) as Phaser.GameObjects.Text
      : null;
    const loyalty = RECRUIT_LOYALTY_MS[type];
    this.lackeys.push({
      owner, type, sprite, tie, icon, barBg, barFill, levelText, x, y,
      loyaltyMs: loyalty, loyaltyMaxMs: loyalty,
      bullets: type === 'specialist' ? SPEC_MAG : LACKEY_MAG, reloadingUntil: 0, nextShotAt: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      ignited: false, igniteAura: null,
      xp: 0, level: 1, xpDmgAccum: 0, xpSecAccum: 0, inverted: false,
      wanderX: x, wanderY: y, payoutAccum: 0,
    });
    this.api.showFloatingText(x, y - 34, `${RECRUIT_EMOJI[type]} ${RECRUIT_NAME[type]}!`, '#dd2233');
  }

  private _destroyLackeyVisuals(l: Lackey): void {
    if (l.sprite?.active) l.sprite.destroy();
    if (l.tie?.active) l.tie.destroy();
    if (l.icon?.active) l.icon.destroy();
    if (l.barBg?.active) l.barBg.destroy();
    if (l.barFill?.active) l.barFill.destroy();
    if (l.levelText?.active) l.levelText.destroy();
    if (l.igniteAura?.active) l.igniteAura.destroy();
  }

  // ── Hardened Criminals (F+) ──────────────────────────────────────────────

  /** Award XP and promote; returns silently when the owner lacks F+. */
  private _addRecruitXp(l: Lackey, amount: number): void {
    if (!l.levelText) return;
    l.xp = Math.min(l.xp + amount, (XP_MAX_LEVEL - 1) * XP_PER_LEVEL);
    const next = Math.min(XP_MAX_LEVEL, 1 + Math.floor(l.xp / XP_PER_LEVEL));
    if (next === l.level) return;
    l.level = next;
    if (l.owner === 'player') this.api.recordMasteryBestStat('recruitBestLevel', l.level);
    this.api.showFloatingText(l.x, l.y - 46, `⭐ ${ROMAN[l.level]}`, '#ffdd33');
    if (l.level >= XP_MAX_LEVEL && !l.inverted) {
      // Level V wears the palette inside out: red body, black trim.
      l.inverted = true;
      l.sprite.setFillStyle(0xdd2233, 1).setStrokeStyle(2, 0x111111, 1);
      l.tie.setFillStyle(0x111111);
    }
  }

  private _lvlSpeed(l: Lackey): number { return 1 + 0.10 * (l.level - 1); }
  private _lvlDrain(l: Lackey): number { return 1 - 0.08 * (l.level - 1); }
  /** Scaled, rounded damage for a recruit's hit (minimum 1). */
  private _lvlDmg(l: Lackey, base: number): number {
    return Math.max(1, Math.round(base * (1 + 0.15 * (l.level - 1))));
  }

  /** Books damage a recruit dealt toward its next XP point. */
  private _creditRecruitDamage(l: Lackey, dmg: number): void {
    if (!l.levelText) return;
    l.xpDmgAccum += dmg;
    while (l.xpDmgAccum >= XP_DMG_PER_POINT) {
      l.xpDmgAccum -= XP_DMG_PER_POINT;
      this._addRecruitXp(l, 1);
    }
  }

  // ── The Rolodex hiring wheel (R+) ────────────────────────────────────────

  private _openRecruitMenu(selectedIndex: number): void {
    this._closeRecruitMenu();
    this.recruitMenuGfx = this.api.scene.add.graphics().setDepth(31);
    for (let i = 0; i < RECRUIT_ORDER.length; i++) {
      this.recruitMenuLabels.push(
        this.api.scene.add.text(0, 0, '', {
          fontSize: '11px', color: '#ffffff', fontFamily: 'Arial', align: 'center',
          wordWrap: { width: 80 },
        }).setOrigin(0.5).setDepth(32),
      );
    }
    this.recruitMenuOpen = true;
    this.recruitSelectedIndex = selectedIndex;
    this._drawRecruitMenu(selectedIndex);
  }

  private _drawRecruitMenu(selectedIndex: number): void {
    const gfx = this.recruitMenuGfx;
    if (!gfx) return;
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 120;
    const count = RECRUIT_ORDER.length;
    const angleStep = (Math.PI * 2) / count;
    gfx.clear();
    for (let i = 0; i < count; i++) {
      const type = RECRUIT_ORDER[i];
      const affordable = this.money >= RECRUIT_COST[type];
      const startA = i * angleStep - Math.PI / 2 - angleStep / 2;
      const isSelected = i === selectedIndex;
      const rr = isSelected ? R + 10 : R;
      gfx.fillStyle(RECRUIT_WEDGE_COLOR[type], affordable ? (isSelected ? 0.92 : 0.6) : 0.3);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, rr, startA, startA + angleStep, false);
      gfx.closePath(); gfx.fillPath();
      gfx.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0xaaaaaa, isSelected ? 0.9 : 0.4);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, rr, startA, startA + angleStep, false);
      gfx.closePath(); gfx.strokePath();

      const lbl = this.recruitMenuLabels[i];
      if (!lbl?.active) continue;
      const midA = i * angleStep - Math.PI / 2;
      lbl.setPosition(cx + Math.cos(midA) * (rr * 0.66), cy + Math.sin(midA) * (rr * 0.66));
      lbl.setText(`${RECRUIT_EMOJI[type]} ${RECRUIT_NAME[type]}\n💵${RECRUIT_COST[type]}`);
      lbl.setColor(affordable ? '#ffffff' : '#777777');
    }
  }

  private _updateRecruitMenuHover(pointer: Phaser.Input.Pointer): void {
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, cx, cy) <= 24) return;
    const count = RECRUIT_ORDER.length;
    const angleStep = (Math.PI * 2) / count;
    const raw = Math.atan2(pointer.worldY - cy, pointer.worldX - cx);
    const normalized = (((raw + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const hoverIdx = Math.round(normalized / angleStep) % count;
    if (hoverIdx !== this.recruitSelectedIndex) {
      this.recruitSelectedIndex = hoverIdx;
      this._drawRecruitMenu(hoverIdx);
    }
  }

  private _closeRecruitMenu(): void {
    if (this.recruitMenuGfx?.active) this.recruitMenuGfx.destroy();
    this.recruitMenuGfx = null;
    for (const l of this.recruitMenuLabels) { if (l?.active) l.destroy(); }
    this.recruitMenuLabels = [];
    this.recruitMenuOpen = false;
  }

  private _updateLackeys(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;

    for (let i = this.lackeys.length - 1; i >= 0; i--) {
      const l = this.lackeys[i];
      const enemy = l.owner === 'player' ? this.api.npc : this.api.player;

      // Loyalty drain (Soul copy: ignited lackeys lose an extra 2s per second;
      // F+ levels make every recruit that bit harder to shake off; Mastery smoke
      // clouds give the ones standing in them somewhere pleasant to loiter)
      l.loyaltyMs -= delta * this._lvlDrain(l)
        * (l.ignited ? 1 + LACKEY_IGNITE_EXTRA_PER_SEC / 1000 : 1)
        * (this._inOwnSmoke(l.owner, l.x, l.y) ? SMOKE_LOYALTY_DRAIN_MULT : 1);

      // XP: +1 per second on the payroll, and the level-V money runner stipend
      if (l.levelText) {
        l.xpSecAccum += delta;
        while (l.xpSecAccum >= 1000) { l.xpSecAccum -= 1000; this._addRecruitXp(l, 1); }
        if (l.type === 'runner' && l.level >= XP_MAX_LEVEL) {
          l.payoutAccum += delta;
          while (l.payoutAccum >= RUNNER_L5_STIPEND_MS) {
            l.payoutAccum -= RUNNER_L5_STIPEND_MS;
            this._addMoney(l.owner, 1);
            this.api.showFloatingText(l.x, l.y - 34, '+1💵', '#66dd66');
          }
        }
      }

      // Enemy projectile hits: -2s loyalty each, projectile consumed.
      // Specialists are armored: the round still stops, the loyalty doesn't move.
      for (const go of [...this.api.projectiles.getChildren()]) {
        const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
        if (!p.active) continue;
        if ((l.owner === 'player') === (p.isFromPlayer === true)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, l.x, l.y) <= 18) {
          p.destroy();
          this.api.spawnHitFlash(l.x, l.y, 0xffdd33);
          if (l.type === 'specialist') {
            this.api.showFloatingText(l.x, l.y - 28, '🛡️ Armored', '#aaaacc');
          } else {
            l.loyaltyMs -= LACKEY_PROJ_HIT_LOSS_MS;
            this.api.showFloatingText(l.x, l.y - 28, '-2s', '#ffdd33');
          }
        }
      }

      if (l.loyaltyMs <= 0) {
        if (l.ignited) this._lackeyBurnout(l);
        else this.api.showFloatingText(l.x, l.y - 20, '👋 Quit', '#999999');
        // A money runner cashes out its float on the way out the door.
        if (l.type === 'runner') {
          this._addMoney(l.owner, RUNNER_QUIT_MONEY);
          this.api.showFloatingText(l.x, l.y - 36, `+${RUNNER_QUIT_MONEY}💵`, '#66dd66');
        }
        this._destroyLackeyVisuals(l);
        this.lackeys.splice(i, 1);
        continue;
      }

      this._moveRecruit(l, enemy, dt, W, H);
      this._fireRecruit(l, enemy, time);

      // Visuals
      l.sprite.setPosition(l.x, l.y);
      l.tie.setPosition(l.x, l.y + 2);
      l.icon?.setPosition(l.x, l.y - 1);
      l.barBg.setPosition(l.x, l.y - 24);
      const ratio = Phaser.Math.Clamp(l.loyaltyMs / l.loyaltyMaxMs, 0, 1);
      l.barFill.setPosition(l.x - 16, l.y - 24).setSize(32 * ratio, 5);
      l.levelText?.setPosition(l.x, l.y - 38).setText(ROMAN[l.level]);
      if (l.reloadingUntil > 0) l.sprite.setAlpha(0.6);
      else l.sprite.setAlpha(1);
      if (l.igniteAura?.active) l.igniteAura.setPosition(l.x, l.y);
    }
  }

  /** Per-type positioning: gunners hold mid range, runners bolt, muscle closes in. */
  private _moveRecruit(l: Lackey, enemy: Fighter, dt: number, W: number, H: number): void {
    const lvl = this._lvlSpeed(l);
    let mx = 0, my = 0, speed = 0;

    if (l.type === 'runner') {
      // Sprints between random points, picking a new one whenever it arrives.
      speed = RUNNER_SPEED * lvl;
      if (Phaser.Math.Distance.Between(l.x, l.y, l.wanderX, l.wanderY) <= 24) {
        l.wanderX = 40 + Math.random() * (W - 80);
        l.wanderY = 40 + Math.random() * (H - 80);
      }
      const dx = l.wanderX - l.x, dy = l.wanderY - l.y;
      const d = Math.hypot(dx, dy) || 1;
      mx = dx / d; my = dy / d;
    } else if (!enemy.active || enemy.hp <= 0) {
      return;
    } else {
      const dx = enemy.x - l.x, dy = enemy.y - l.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (l.type === 'thug') {
        speed = THUG_SPEED * lvl;
        mx = dx / dist; my = dy / dist;
      } else if (l.type === 'specialist') {
        speed = SPEC_SPEED * lvl;
        if (dist > SPEC_RANGE * 0.7) { mx = dx / dist; my = dy / dist; }
        else if (dist < SPEC_RANGE * 0.35) { mx = -dx / dist; my = -dy / dist; }
        else { mx = (-dy / dist) * 0.5 * l.strafeDir; my = (dx / dist) * 0.5 * l.strafeDir; }
      } else {
        speed = 150 * lvl;
        if (dist < 200) { mx = -dx / dist; my = -dy / dist; }
        else if (dist > 320) { mx = dx / dist; my = dy / dist; }
        else { mx = (-dy / dist) * 0.5 * l.strafeDir; my = (dx / dist) * 0.5 * l.strafeDir; }
      }
    }

    l.x = Phaser.Math.Clamp(l.x + mx * speed * dt, 20, W - 20);
    l.y = Phaser.Math.Clamp(l.y + my * speed * dt, 20, H - 20);
  }

  /** Per-type offence. Money runners never fight — they just run the money. */
  private _fireRecruit(l: Lackey, enemy: Fighter, time: number): void {
    if (l.type === 'runner') return;
    if (!enemy.active || enemy.hp <= 0) return;
    const dist = Phaser.Math.Distance.Between(l.x, l.y, enemy.x, enemy.y);

    if (l.type === 'thug') {
      if (time < l.nextShotAt || dist > THUG_SWING_RANGE) return;
      l.nextShotAt = time + THUG_SWING_CD_MS;
      this._thugSwing(l, enemy, time);
      return;
    }

    // Reload gate — level-V lackeys rack the next mag in half the time
    if (l.reloadingUntil > 0) {
      if (time < l.reloadingUntil) return;
      l.reloadingUntil = 0;
      l.bullets = l.type === 'specialist' ? SPEC_MAG : LACKEY_MAG;
    }
    if (l.bullets <= 0 || time < l.nextShotAt) return;

    if (l.type === 'specialist') {
      if (dist > SPEC_RANGE) return;
      l.nextShotAt = time + SPEC_SHOT_INTERVAL;
      l.bullets -= 1;
      const pellets = l.level >= XP_MAX_LEVEL ? SPEC_PELLETS_L5 : SPEC_PELLETS;
      const base = Math.atan2(enemy.y - l.y, enemy.x - l.x);
      for (let p = 0; p < pellets; p++) {
        const spread = (p / (pellets - 1) - 0.5) * 2 * SPEC_CONE_HALF;
        this._lackeyHitscan(l, base + spread, enemy, SPEC_PELLET_DMG, SPEC_RANGE, 0x8899dd);
      }
      if (l.bullets <= 0) l.reloadingUntil = time + LACKEY_RELOAD_MS;
      return;
    }

    // Plain lackey: 15° cone, 1 dmg pellets, 25-round mag then a 5s reload
    if (dist > LACKEY_RANGE) return;
    l.nextShotAt = time + LACKEY_SHOT_INTERVAL;
    l.bullets -= 1;
    const angle = Math.atan2(enemy.y - l.y, enemy.x - l.x) + Phaser.Math.FloatBetween(-SPRAY_CONE_HALF, SPRAY_CONE_HALF);
    this._lackeyHitscan(l, angle, enemy, LACKEY_DMG, LACKEY_RANGE, 0xdd6633);
    if (l.bullets <= 0) {
      l.reloadingUntil = time + LACKEY_RELOAD_MS * (l.level >= XP_MAX_LEVEL ? 0.5 : 1);
    }
  }

  /** Thug bat: damage, a stun, and a shove that hurts more at level V. */
  private _thugSwing(l: Lackey, enemy: Fighter, time: number): void {
    const dmg = this._lvlDmg(l, THUG_DMG);
    enemy.takeDamage(dmg);
    this._creditRecruitDamage(l, dmg);
    this.api.spawnHitFlash(enemy.x, enemy.y, 0xdd2233);

    const maxed = l.level >= XP_MAX_LEVEL;
    const stunMs = THUG_STUN_MS * (maxed ? 2 : 1);
    if (enemy === this.api.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + stunMs);
    else this.npcStunUntil = Math.max(this.npcStunUntil, time + stunMs);

    const ang = Math.atan2(enemy.y - l.y, enemy.x - l.x);
    const force = THUG_KNOCKBACK * (maxed ? 1.5 : 1);
    this.knocks.set(enemy, {
      vx: Math.cos(ang) * force, vy: Math.sin(ang) * force,
      until: time + THUG_KNOCKBACK_MS,
    });
    this.api.showFloatingText(enemy.x, enemy.y - 34, '🏏 CLOBBERED!', '#dd2233');

    // Bat arc
    const bat = this.api.scene.add.rectangle(l.x + Math.cos(ang) * 22, l.y + Math.sin(ang) * 22, 26, 5, 0x885522)
      .setRotation(ang).setDepth(9);
    this.api.scene.tweens.add({ targets: bat, alpha: 0, duration: 200, onComplete: () => bat.destroy() });
  }

  /** Enforces the thug's stun + knockback: this codebase drives those from update(). */
  private _updateStunsAndKnocks(time: number): void {
    if (time < this.playerStunUntil) (this.api.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (time < this.npcStunUntil) (this.api.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    for (const [target, k] of this.knocks) {
      if (time >= k.until) { this.knocks.delete(target); continue; }
      (target.body as Phaser.Physics.Arcade.Body).setVelocity(k.vx, k.vy);
    }
  }

  private _lackeyHitscan(l: Lackey, angle: number, enemy: Fighter, baseDmg: number, range: number, color: number): void {
    const sx = l.x, sy = l.y;
    const ex = sx + Math.cos(angle) * range;
    const ey = sy + Math.sin(angle) * range;
    if (enemy.active && enemy.hp > 0 && this._pointToSegmentDist(enemy.x, enemy.y, sx, sy, ex, ey) <= 24) {
      const dmg = this._lvlDmg(l, baseDmg);
      enemy.takeDamage(dmg);
      this._creditRecruitDamage(l, dmg);
      this.api.spawnHitFlash(enemy.x, enemy.y, color);
    }
    const gfx = this.api.scene.add.graphics().setDepth(7);
    gfx.lineStyle(1, color, 0.8);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(ex, ey);
    gfx.strokePath();
    this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 100, onComplete: () => gfx.destroy() });
  }

  /** Soul copy: an ignited lackey erupts in a burning AoE when it expires. */
  private _lackeyBurnout(l: Lackey): void {
    const { scene } = this.api;
    this.api.dealAoeDamage(l.owner, l.x, l.y, 90, 20);
    const ring = scene.add.circle(l.x, l.y, 14, 0xff5522, 0.75).setDepth(9);
    scene.tweens.add({ targets: ring, scaleX: 6.5, scaleY: 6.5, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
    this.api.showFloatingText(l.x, l.y - 24, '🔥 Burnout!', '#ff5522');
  }

  private _igniteLackeys(owner: 'player' | 'npc'): void {
    let any = false;
    for (const l of this.lackeys) {
      if (l.owner !== owner || l.ignited) continue;
      l.ignited = true;
      any = true;
      if (l.igniteAura?.active) l.igniteAura.destroy();
      l.igniteAura = this.api.scene.add.circle(l.x, l.y, 20, 0xff4400, 0.35)
        .setStrokeStyle(2, 0xff8844, 0.8).setDepth(6) as Phaser.GameObjects.Arc;
      this.api.scene.tweens.add({
        targets: l.igniteAura, scaleX: 1.25, scaleY: 1.25, yoyo: true, repeat: -1, duration: 320,
      });
    }
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(caster.x, caster.y - 40, any ? '🔥 Lackeys Ignited!' : 'No lackeys to ignite', '#ff5522');
  }

  // ── Bribe ────────────────────────────────────────────────────────────────

  /** Returns true if a target was bribed (money is only spent on success). */
  private _doBribe(owner: 'player' | 'npc', cursorX: number, cursorY: number, time: number): boolean {
    const enemy = owner === 'player' ? this.api.npc : this.api.player;
    const ownLackeys = this.lackeys.filter(l => l.owner === owner);

    // Direct cursor hits first, else nearest of enemy / own lackey to the cursor.
    let target: 'enemy' | Lackey | null = null;
    if (enemy.active && enemy.hp > 0 && Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) <= 36) {
      target = 'enemy';
    } else {
      const hovered = ownLackeys.find(l => Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y) <= 30);
      if (hovered) target = hovered;
    }
    if (!target) {
      let best: { kind: 'enemy' | Lackey; d: number } | null = null;
      if (enemy.active && enemy.hp > 0) best = { kind: 'enemy', d: Phaser.Math.Distance.Between(cursorX, cursorY, enemy.x, enemy.y) };
      for (const l of ownLackeys) {
        const d = Phaser.Math.Distance.Between(cursorX, cursorY, l.x, l.y);
        if (!best || d < best.d) best = { kind: l, d };
      }
      target = best ? best.kind : null;
    }
    if (!target) return false;

    if (target === 'enemy') {
      if (owner === 'player') this.npcBribedUntil = time + BRIBE_MS;
      else this.playerBribedUntil = time + BRIBE_MS;
      this.api.showFloatingText(enemy.x, enemy.y - 34, '💵 Bribed! -25% dmg', '#66dd66');
    } else {
      target.loyaltyMs = target.loyaltyMaxMs * LACKEY_BRIBE_BONUS;
      this.api.showFloatingText(target.x, target.y - 30, '💵 Loyalty +120%!', '#ffdd33');
      // F+ Hardened Criminals: nothing teaches like being paid.
      this._addRecruitXp(target, XP_PER_BRIBE);
    }
    return true;
  }

  private _updateBribes(time: number): void {
    // Bribed enemies deal 25% less damage — applied victim-side (1v1: identical outcome).
    const npcBribed = time < this.npcBribedUntil;
    const playerBribed = time < this.playerBribedUntil;
    this.api.player.bribeIncomingMult = npcBribed ? BRIBE_DMG_MULT : 1;
    this.api.npc.bribeIncomingMult = playerBribed ? BRIBE_DMG_MULT : 1;

    this.npcCensorBar = this._syncCensorBar(this.npcCensorBar, this.api.npc, npcBribed);
    this.playerCensorBar = this._syncCensorBar(this.playerCensorBar, this.api.player, playerBribed);
  }

  private _syncCensorBar(bar: Phaser.GameObjects.Rectangle | null, fighter: Fighter, active: boolean): Phaser.GameObjects.Rectangle | null {
    if (!active) {
      if (bar?.active) bar.destroy();
      return null;
    }
    if (!bar || !bar.active) {
      bar = this.api.scene.add.rectangle(fighter.x, fighter.y - 6, 30, 8, 0x000000, 0.95)
        .setStrokeStyle(1, 0x222222, 1).setDepth(15) as Phaser.GameObjects.Rectangle;
    }
    bar.setPosition(fighter.x, fighter.y - 6);
    return bar;
  }

  // ── Dark Treachery ───────────────────────────────────────────────────────

  private _tickTreacheryChannel(owner: 'player' | 'npc', time: number): void {
    const firesAt = owner === 'player' ? this.treacheryFiresAt : this.npcTreacheryFiresAt;
    if (firesAt === 0) return;
    const caster = owner === 'player' ? this.api.player : this.api.npc;

    // Black fog accumulating around the caster during the 2s channel
    const fogNextAt = owner === 'player' ? this.treacheryFogNextAt : this.npcTreacheryFogNextAt;
    if (time >= fogNextAt) {
      if (owner === 'player') this.treacheryFogNextAt = time + 130;
      else this.npcTreacheryFogNextAt = time + 130;
      const angle = Math.random() * Math.PI * 2;
      const r = 55 + Math.random() * 25;
      const fog = this.api.scene.add.circle(
        caster.x + Math.cos(angle) * r, caster.y + Math.sin(angle) * r,
        8 + Math.random() * 8, 0x110011, 0.55,
      ).setDepth(9);
      this.api.scene.tweens.add({
        targets: fog, x: caster.x, y: caster.y, alpha: 0, scaleX: 0.4, scaleY: 0.4,
        duration: 320, onComplete: () => fog.destroy(),
      });
    }

    if (time >= firesAt) {
      if (owner === 'player') this.treacheryFiresAt = 0;
      else this.npcTreacheryFiresAt = 0;
      this._executeTreachery(owner, time);
    }
  }

  /** NPC AI entry: begin the 2s channel. */
  doNpcTreachery(): void {
    if (this.npcTreacheryFiresAt > 0) return;
    const time = this.api.scene.time.now;
    this.npcTreacheryFiresAt = time + TREACHERY_DELAY_MS;
    this.npcTreacheryFogNextAt = time;
    this.api.showFloatingText(this.api.npc.x, this.api.npc.y - 44, '🌫️ Dark Treachery...', '#552255');
  }

  /**
   * Q+ for the NPC. The AI reaches Dark Treachery through castAbility, which is
   * still sitting on its 40s cooldown, so the retainer recast is driven here:
   * while the contract is open the NPC cashes it in as soon as it can afford to.
   */
  private _tickNpcRetainer(time: number): void {
    if (!this.npcRetainerElementId) return;
    if (time >= this.npcRetainerUntil) { this.npcRetainerElementId = null; return; }
    if (this.npcTreacheryFiresAt > 0) return;
    if (time < this.npcRetainerNextTryAt) return;
    if (this.npcMoney < RETAINER_COST) return;
    this._spendMoney('npc', RETAINER_COST);
    this.npcRetainerNextTryAt = time + 1500;
    this.api.showFloatingText(this.api.npc.x, this.api.npc.y - 44, '🤝 On Retainer!', '#ff5555');
    this._executeTreachery('npc', time, this.npcRetainerElementId);
  }

  /**
   * Steal and fire the enemy's ultimate. `forcedId` is the Q+ retainer recast —
   * it replays an already-stolen contract without re-opening the 8s window.
   */
  private _executeTreachery(owner: 'player' | 'npc', time: number, forcedId?: string): void {
    const { api } = this;
    const caster = owner === 'player' ? api.player : api.npc;
    const enemyId = forcedId ?? (owner === 'player' ? api.npcElementId : api.elementId);

    // Q+ On Retainer: a fresh theft puts the contract on the books for 8s.
    if (!forcedId && this._up(owner, 'q')) {
      if (owner === 'player') { this.retainerElementId = enemyId; this.retainerUntil = time + RETAINER_MS; }
      else { this.npcRetainerElementId = enemyId; this.npcRetainerUntil = time + RETAINER_MS; }
      api.showFloatingText(caster.x, caster.y - 58, `🤝 On Retainer — Q for ${RETAINER_COST}💵`, '#ff8888');
    }

    // Cleared by the branches that find nothing to steal, so an empty contract doesn't
    // count toward "steal 10 different ultimates".
    let stole = true;

    switch (enemyId) {
      // ── Fully custom copies ──
      case 'quantum': // mirror match: gain 3 money instantly
        this._addMoney(owner, 3);
        api.showFloatingText(caster.x, caster.y - 40, '💵💵💵 Insider Trading!', '#ff5555');
        break;
      case 'metal': // just gain an extra 50 shield health
        caster.shieldHp += 50;
        api.showFloatingText(caster.x, caster.y - 40, '🛡️ +50 Shield', '#aaaacc');
        break;
      case 'growth': // spawn 2 lackeys for free
        this._spawnLackey(owner);
        this._spawnLackey(owner);
        break;
      case 'soul': // ignite lackeys: extra loyalty drain + burning AoE on burnout
        this._igniteLackeys(owner);
        break;
      case 'life': // link to all lackeys: incoming damage split across them instead
        if (owner === 'player') this.linkUntil = time + LINK_MS;
        else this.npcLinkUntil = time + LINK_MS;
        this._armLinkAbsorber(owner);
        api.showFloatingText(caster.x, caster.y - 40, '🔗 Linked to Lackeys!', '#66ff66');
        break;
      case 'sound': // just the disco ball: 12s, shoots every 3s for 10
        this._spawnDiscoBall(owner);
        break;
      case 'electricity': // overcharge: die within 5s → respawn at 25% health
        if (owner === 'player') this.overchargeUntil = time + OVERCHARGE_MS;
        else this.npcOverchargeUntil = time + OVERCHARGE_MS;
        this._armOvercharge(owner);
        break;
      case 'slime': // acid pours over the entire screen at ¼ damage
        if (owner === 'player') { this.acidRainUntil = time + ACID_RAIN_MS; this.acidRainTickAccum = 0; }
        else { this.npcAcidRainUntil = time + ACID_RAIN_MS; this.npcAcidRainTickAccum = 0; }
        api.showFloatingText(api.sceneWidth / 2, 80, '☠️ Acid Downpour!', '#66ff33');
        break;

      // ── Kit-routed copies ──
      case 'earth': api.earthGolem(owner); break;
      case 'oil': api.oilTrain(owner); break;
      case 'ice': {
        const target = owner === 'player' ? api.npc : api.player;
        api.iceFrozenSolidNoFrost(owner, target.x, target.y);
        break;
      }
      case 'time': api.timeAlwaysNoonForced(owner); break;
      case 'light': api.lightSpeedOLight(owner); break;
      case 'echo': api.echoEclipseDirect(owner); break;
      case 'magic': api.magicNecronomicon(owner); break;

      // ── Not yet supported ──
      case 'gunpowder':
      case 'rubber':
        api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
        stole = false;
        break;

      // ── Everything else: cast the enemy's Q through the normal context ──
      default:
        if (!api.castForeignQ(enemyId, owner)) {
          api.showFloatingText(caster.x, caster.y - 40, '🚫 No Contract', '#888888');
          stole = false;
        }
        break;
    }

    if (stole && owner === 'player') this._noteStolenUltimate(enemyId);
  }

  /**
   * "Steal 10 different ultimates" is a set, not a counter, so each element gets its own
   * persisted flag and the requirement key is re-derived as their sum — monotonic, so it
   * rides the existing best-value ratchet (same shape as Gunpowder's weapon set).
   */
  private _noteStolenUltimate(elementId: string): void {
    this.api.recordMasteryBestStat(`subSteal_${elementId}`, 1);
    let distinct = 0;
    for (const id of this.api.allElementIds()) {
      if (this.api.getMasteryStat(`subSteal_${id}`) > 0) distinct++;
    }
    this.api.recordMasteryBestStat('stolenElements', distinct);
  }

  // ── Life copy: damage-link to lackeys ────────────────────────────────────

  private _armLinkAbsorber(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.linkUntil : this.npcLinkUntil;
      if (this.api.scene.time.now >= until) return false;
      const own = this.lackeys.filter(l => l.owner === owner);
      if (own.length === 0) return false;
      const share = amount / own.length;
      for (const l of own) {
        l.loyaltyMs -= share * LINK_LOYALTY_MS_PER_DMG;
        this.api.spawnHitFlash(l.x, l.y, 0x66ff66);
      }
      this.api.showFloatingText(fighter.x, fighter.y - 30, 'Linked!', '#66ff66');
      return true;
    };
  }

  private _updateLinks(time: number): void {
    if (this.linkUntil > 0 && time >= this.linkUntil) {
      this.linkUntil = 0;
      if (this.api.player.damageAbsorber) this.api.player.damageAbsorber = null;
    }
    if (this.npcLinkUntil > 0 && time >= this.npcLinkUntil) {
      this.npcLinkUntil = 0;
      if (this.api.npc.damageAbsorber) this.api.npc.damageAbsorber = null;
    }
  }

  // ── Electricity copy: overcharge revive ──────────────────────────────────

  private _armOvercharge(owner: 'player' | 'npc'): void {
    const fighter = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ OVERCHARGED', '#ffee00');
    const aura = this.api.scene.add.circle(fighter.x, fighter.y, 30, 0xffee00, 0.25)
      .setStrokeStyle(2, 0xffff88, 0.9).setDepth(8) as Phaser.GameObjects.Arc;
    this.api.scene.tweens.add({ targets: aura, scaleX: 1.2, scaleY: 1.2, yoyo: true, repeat: -1, duration: 300 });
    if (owner === 'player') {
      if (this.overchargeAura?.active) this.overchargeAura.destroy();
      this.overchargeAura = aura;
    } else {
      if (this.npcOverchargeAura?.active) this.npcOverchargeAura.destroy();
      this.npcOverchargeAura = aura;
    }
    fighter.damageAbsorber = (amount: number) => {
      const until = owner === 'player' ? this.overchargeUntil : this.npcOverchargeUntil;
      if (this.api.scene.time.now >= until) return false;
      if (fighter.hp - amount > 0) return false;
      // Lethal hit while overcharged → respawn at 25% health instead.
      fighter.hp = Math.ceil(fighter.maxHp * 0.25);
      if (owner === 'player') this.overchargeUntil = 0;
      else this.npcOverchargeUntil = 0;
      fighter.damageAbsorber = null;
      this.api.showFloatingText(fighter.x, fighter.y - 40, '⚡ RESTART!', '#ffee00');
      const flash = this.api.scene.add.circle(fighter.x, fighter.y, 20, 0xffee00, 0.9).setDepth(12);
      this.api.scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      return true;
    };
  }

  private _updateOvercharge(time: number): void {
    if (this.overchargeAura?.active) {
      if (time >= this.overchargeUntil) {
        this.overchargeAura.destroy();
        this.overchargeAura = null;
        if (this.api.player.damageAbsorber) this.api.player.damageAbsorber = null;
      } else {
        this.overchargeAura.setPosition(this.api.player.x, this.api.player.y);
      }
    }
    if (this.npcOverchargeAura?.active) {
      if (time >= this.npcOverchargeUntil) {
        this.npcOverchargeAura.destroy();
        this.npcOverchargeAura = null;
        if (this.api.npc.damageAbsorber) this.api.npc.damageAbsorber = null;
      } else {
        this.npcOverchargeAura.setPosition(this.api.npc.x, this.api.npc.y);
      }
    }
  }

  // ── Sound copy: disco ball ───────────────────────────────────────────────

  private _spawnDiscoBall(owner: 'player' | 'npc'): void {
    const { scene } = this.api;
    const time = scene.time.now;
    const x = this.api.sceneWidth / 2;
    const y = 90;
    const sprite = scene.add.circle(x, y, 22, 0xcccccc, 1)
      .setStrokeStyle(2, 0xffffff, 1).setDepth(10) as Phaser.GameObjects.Arc;
    const shine = scene.add.graphics().setDepth(9);
    this.discoBalls.push({ owner, sprite, shine, endsAt: time + DISCO_MS, nextShotAt: time + DISCO_SHOT_INTERVAL });
    this.api.showFloatingText(x, y - 36, '🪩 Disco!', '#ff66cc');
  }

  private _updateDiscoBalls(time: number): void {
    for (let i = this.discoBalls.length - 1; i >= 0; i--) {
      const b = this.discoBalls[i];
      if (time >= b.endsAt) {
        if (b.sprite?.active) b.sprite.destroy();
        if (b.shine?.active) b.shine.destroy();
        this.discoBalls.splice(i, 1);
        continue;
      }
      // sparkle
      b.shine.clear();
      const hue = (time * 0.15) % 360;
      const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.8, 0.6).color;
      b.shine.lineStyle(2, color, 0.6);
      for (let s = 0; s < 4; s++) {
        const a = (time * 0.002) + (s / 4) * Math.PI * 2;
        b.shine.lineBetween(b.sprite.x, b.sprite.y, b.sprite.x + Math.cos(a) * 34, b.sprite.y + Math.sin(a) * 34);
      }
      if (time >= b.nextShotAt) {
        b.nextShotAt = time + DISCO_SHOT_INTERVAL;
        const enemy = b.owner === 'player' ? this.api.npc : this.api.player;
        if (enemy.active && enemy.hp > 0) {
          enemy.takeDamage(DISCO_DMG);
          this.api.spawnHitFlash(enemy.x, enemy.y, color);
          const gfx = this.api.scene.add.graphics().setDepth(11);
          gfx.lineStyle(3, color, 0.9);
          gfx.lineBetween(b.sprite.x, b.sprite.y, enemy.x, enemy.y);
          this.api.scene.tweens.add({ targets: gfx, alpha: 0, duration: 250, onComplete: () => gfx.destroy() });
        }
      }
    }
  }

  // ── Acid copy: whole-screen rain at ¼ damage ─────────────────────────────

  private _updateAcidRain(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const until = owner === 'player' ? this.acidRainUntil : this.npcAcidRainUntil;
      if (time >= until) continue;
      const enemy = owner === 'player' ? this.api.npc : this.api.player;

      let tickAccum = (owner === 'player' ? this.acidRainTickAccum : this.npcAcidRainTickAccum) + delta;
      if (tickAccum >= ACID_RAIN_TICK_MS) {
        tickAccum -= ACID_RAIN_TICK_MS;
        if (enemy.active && enemy.hp > 0) {
          let dmgAccum = (owner === 'player' ? this.acidRainDmgAccum : this.npcAcidRainDmgAccum) + ACID_RAIN_TICK_DMG;
          const whole = Math.floor(dmgAccum);
          dmgAccum -= whole;
          if (whole > 0) {
            enemy.takeDamage(whole);
            this.api.spawnHitFlash(enemy.x, enemy.y, 0x66ff33);
          }
          if (owner === 'player') this.acidRainDmgAccum = dmgAccum;
          else this.npcAcidRainDmgAccum = dmgAccum;
        }
      }
      if (owner === 'player') this.acidRainTickAccum = tickAccum;
      else this.npcAcidRainTickAccum = tickAccum;

      // Falling drops across the whole screen
      this.acidRainDropAccum += delta;
      if (this.acidRainDropAccum >= 60) {
        this.acidRainDropAccum -= 60;
        const dx = Math.random() * this.api.sceneWidth;
        const dy = Math.random() * this.api.sceneHeight;
        const drop = this.api.scene.add.circle(dx, dy - 90, 3, 0x66ff33, 0.9).setDepth(6);
        this.api.scene.tweens.add({ targets: drop, y: dy, alpha: 0.2, duration: 300, onComplete: () => drop.destroy() });
      }
    }
  }

  // ── Molecular Cutter daggers (Click — behavior unchanged from Quantum) ───

  private _pickBalancedColor(owner: 'player' | 'npc'): 'red' | 'black' {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let r = 0, b = 0;
    for (const d of list) { if (d.state === 'returning') continue; if (d.color === 'red') r++; else b++; }
    return r <= b ? 'red' : 'black';
  }

  private _throwDagger(owner: 'player' | 'npc', tx: number, ty: number, color: 'red' | 'black', originX?: number, originY?: number): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const ox = originX ?? caster.x;
    const oy = originY ?? caster.y;
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy) || 1;
    const sprite = scene.add.rectangle(ox, oy, 16, 4, DAGGER_FILL[color])
      .setDepth(10).setRotation(Math.atan2(dy, dx)) as Phaser.GameObjects.Rectangle;
    sprite.setStrokeStyle(1, color === 'red' ? 0xffffff : 0xdd2233, 0.7);
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    list.push({
      sprite, owner, color,
      x: ox, y: oy,
      destX: tx, destY: ty, dirX: dx / d, dirY: dy / d,
      state: 'flying', hitSet: new Set<Fighter>(),
    });
  }

  private _recallDaggers(owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerDaggers : this.npcDaggers;
    let any = false;
    for (const d of list) { if (d.state !== 'returning') { d.state = 'returning'; d.hitSet.clear(); any = true; } }
    if (any) {
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      this.api.showFloatingText(caster.x, caster.y - 34, 'Recall!', '#ffaaaa');
    }
  }

  private _playerClickDaggers(tx: number, ty: number): void {
    const out = this.playerDaggers.filter(d => d.state !== 'returning').length;
    if (out >= DAGGER_MAX) { this._recallDaggers('player'); return; }
    this._throwDagger('player', tx, ty, this._pickBalancedColor('player'));
    // Crystal copy: active clones also throw daggers (extras beyond the 3-dagger cap)
    for (const pos of this.api.crystalClonePositions('player')) {
      this._throwDagger('player', tx, ty, this._pickBalancedColor('player'), pos.x, pos.y);
    }
  }

  private _updateDaggers(list: SubDagger[], owner: 'player' | 'npc', dt: number): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const enemies: Fighter[] = owner === 'player' ? [this.api.npc] : [this.api.player];
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (!d.sprite?.active) { list.splice(i, 1); continue; }
      if (d.state === 'flying') {
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        const remaining = (d.destX - d.x) * d.dirX + (d.destY - d.y) * d.dirY;
        if (remaining <= 0 || Phaser.Math.Distance.Between(d.x, d.y, d.destX, d.destY) <= DAGGER_ARRIVE_R) {
          d.x = d.destX; d.y = d.destY; d.state = 'planted';
        }
        this._daggerHit(d, enemies, DAGGER_THROW_DMG);
      } else if (d.state === 'returning') {
        const dx = caster.x - d.x, dy = caster.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        d.dirX = dx / dist; d.dirY = dy / dist;
        d.x += d.dirX * DAGGER_SPEED * dt;
        d.y += d.dirY * DAGGER_SPEED * dt;
        d.sprite.setRotation(Math.atan2(dy, dx));
        this._daggerHit(d, enemies, DAGGER_RETURN_DMG);
        if (dist <= DAGGER_ARRIVE_R + 6) {
          // Click+ Blade Dance: a blade that makes it home sometimes stays out.
          if (this._up(owner, 'click') && Math.random() < ORBIT_CHANCE) this._spawnOrbitDagger(owner, d.color);
          d.sprite.destroy(); list.splice(i, 1); continue;
        }
      }
      d.sprite.setPosition(d.x, d.y);
    }
  }

  private _daggerHit(d: SubDagger, enemies: Fighter[], dmg: number): void {
    for (const t of enemies) {
      if (!t.active || t.hp <= 0 || d.hitSet.has(t)) continue;
      if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) <= 20) {
        d.hitSet.add(t);
        t.takeDamage(dmg);
        this.api.spawnHitFlash(t.x, t.y, DAGGER_FILL[d.color]);
        this._addSprayAmmoFromDamage(d.owner, dmg);
        this._noteSmokeAttack(d.owner);
      }
    }
  }

  // ── Blade Dance orbit daggers (Click+) ───────────────────────────────────

  private _spawnOrbitDagger(owner: 'player' | 'npc', color: 'red' | 'black'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.random() * Math.PI * 2;
    const sprite = this.api.scene.add.rectangle(
      caster.x + Math.cos(angle) * ORBIT_RADIUS,
      caster.y + Math.sin(angle) * ORBIT_RADIUS,
      16, 4, DAGGER_FILL[color],
    ).setDepth(10) as Phaser.GameObjects.Rectangle;
    sprite.setStrokeStyle(1, color === 'red' ? 0xffffff : 0xdd2233, 0.7);
    this.orbitDaggers.push({
      owner, sprite, color, angle,
      endsAt: this.api.scene.time.now + ORBIT_MS,
      nextHitAt: 0,
    });
    this.api.showFloatingText(caster.x, caster.y - 50, '🗡️ Blade Dance!', '#dd2233');
  }

  private _updateOrbitDaggers(time: number, dt: number): void {
    for (let i = this.orbitDaggers.length - 1; i >= 0; i--) {
      const o = this.orbitDaggers[i];
      if (time >= o.endsAt || !o.sprite?.active) {
        if (o.sprite?.active) o.sprite.destroy();
        this.orbitDaggers.splice(i, 1);
        continue;
      }
      const caster = o.owner === 'player' ? this.api.player : this.api.npc;
      o.angle += ORBIT_RAD_PER_SEC * dt;
      const ox = caster.x + Math.cos(o.angle) * ORBIT_RADIUS;
      const oy = caster.y + Math.sin(o.angle) * ORBIT_RADIUS;
      o.sprite.setPosition(ox, oy).setRotation(o.angle + Math.PI / 2);
      // Fade out over the final second so its expiry reads
      o.sprite.setAlpha(Phaser.Math.Clamp((o.endsAt - time) / 1000, 0.25, 1));

      if (time < o.nextHitAt) continue;
      const enemy = o.owner === 'player' ? this.api.npc : this.api.player;
      if (!enemy.active || enemy.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 22) {
        o.nextHitAt = time + ORBIT_HIT_CD_MS;
        enemy.takeDamage(ORBIT_DMG);
        this.api.spawnHitFlash(enemy.x, enemy.y, DAGGER_FILL[o.color]);
        this._addSprayAmmoFromDamage(o.owner, ORBIT_DMG);
        this._noteSmokeAttack(o.owner);
      }
    }
  }

  // ── On Retainer HUD (Q+) ─────────────────────────────────────────────────

  private _renderRetainerLabel(time: number): void {
    const active = this.retainerElementId !== null && time < this.retainerUntil;
    if (!active) {
      if (this.retainerLabel?.active) this.retainerLabel.destroy();
      this.retainerLabel = null;
      if (this.retainerElementId !== null && time >= this.retainerUntil) this.retainerElementId = null;
      return;
    }
    if (!this.retainerLabel?.active) {
      this.retainerLabel = this.api.scene.add.text(0, 0, '', {
        fontSize: '12px', fontFamily: '"Arial Black"', color: '#ff8888',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(22);
    }
    const secs = Math.max(0, (this.retainerUntil - time) / 1000);
    this.retainerLabel
      .setPosition(this.api.player.x, this.api.player.y - 72)
      .setText(`🤝 Q ${RETAINER_COST}💵 · ${secs.toFixed(1)}s`);
  }

  // ── CastContext dispatchers ──────────────────────────────────────────────

  doPlayerCutter(tx: number, ty: number): void {
    if (this.api.elementId !== 'quantum') return;
    this._playerClickDaggers(tx, ty);
  }

  /** NPC Molecular Cutter — throws daggers on a cadence, recalling once the max are out. */
  doNpcCutter(tx: number, ty: number): void {
    const time = this.api.scene.time.now;
    if (time < this.npcDaggerNextThrowAt) return;
    const out = this.npcDaggers.filter(d => d.state !== 'returning').length;
    if (out >= DAGGER_MAX) {
      if (this.npcDaggers.some(d => d.state === 'planted')) this._recallDaggers('npc');
      this.npcDaggerNextThrowAt = time + 400;
      return;
    }
    this._throwDagger('npc', tx, ty, this._pickBalancedColor('npc'));
    this.npcDaggerNextThrowAt = time + 350;
  }

  /** NPC Spray — a short burst toward the target; buys a reload when dry. */
  doNpcSpray(tx: number, ty: number): void {
    const { scene, npc } = this.api;
    if (this.npcBullets <= 0) {
      if (this.npcMoney >= 1) {
        this._spendMoney('npc', 1);
        this.npcBullets = Math.min(this._bulletsMax('npc'), BULLETS_RELOAD);
        this.api.showFloatingText(npc.x, npc.y - 40, '💵 Reloaded!', '#ff5555');
      }
      return;
    }
    const shots = Math.min(8, this.npcBullets);
    for (let i = 0; i < shots; i++) {
      scene.time.delayedCall(i * 60, () => {
        if (!npc.active || npc.hp <= 0) return;
        this._fireSprayShot('npc', tx, ty);
      });
    }
  }

  doNpcRecruit(): void {
    // R+ opens the Rolodex for the NPC too: hire the best muscle it can afford,
    // with a bias toward the pricier options when the wallet allows.
    if (this._up('npc', 'r')) {
      const affordable = RECRUIT_ORDER.filter(t => RECRUIT_COST[t] <= this.npcMoney);
      if (affordable.length === 0) return;
      const pick = Math.random() < 0.6
        ? affordable[affordable.length - 1]
        : affordable[Math.floor(Math.random() * affordable.length)];
      this._tryHire('npc', pick);
      return;
    }
    this._tryHire('npc', 'lackey');
  }

  doNpcBribe(tx: number, ty: number): void {
    if (this.npcMoney < 1) return;
    if (this._doBribe('npc', tx, ty, this.api.scene.time.now)) this._spendMoney('npc', 1);
  }

  // ── Mastery: Smoke Break (bindable) ──────────────────────────────────────

  /** The slot Smoke Break is bound over this match, or null when it isn't bound anywhere. */
  private _smokeSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.api.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === 'smoke-break') return s;
    }
    return null;
  }

  private _cigaretteOf(owner: 'player' | 'npc'): Cigarette | undefined {
    return this.cigarettes.find(c => c.owner === owner);
  }

  /**
   * 0 = just cast, 1 = ready. While a cigarette is lit the bar shows what is left of it
   * instead — the burn time is the number that actually matters, and it shrinks with every
   * hit rather than on a clock.
   */
  getSmokeBreakCooldownRatio(time: number): number {
    const cig = this._cigaretteOf('player');
    if (cig) return Phaser.Math.Clamp(cig.msLeft / CIG_BURN_MS, 0, 1);
    return Math.min(1, (time - this.smokeLastCastAt) / SMOKE_COOLDOWN_MS);
  }

  /** Press: light up, or flick the one already in your mouth at the cursor. */
  private _trySmokeBreak(time: number, tx: number, ty: number): void {
    const { player } = this.api;
    if (this._cigaretteOf('player')) {
      this._tossCigarette('player', tx, ty);
      this.api.broadcastMasteryCast('smoke-break-toss');
      return;
    }
    if (time - this.smokeLastCastAt < SMOKE_COOLDOWN_MS) return;
    this.smokeLastCastAt = time;
    this._lightCigarette('player');
    // Private timer, so this cast never flows through onCastStamp — broadcast it by hand.
    this.api.broadcastMasteryCast('smoke-break');
    this.api.showFloatingText(player.x, player.y - 44, '🚬 Smoke Break', '#cccc99');
  }

  /** Online replay: the remote Subterfuge player lit up. */
  doNpcSmokeBreak(): void {
    if (this._cigaretteOf('npc')) return;
    this._lightCigarette('npc');
  }

  /** Online replay: the remote Subterfuge player flicked their cigarette at us. */
  doNpcSmokeToss(tx: number, ty: number): void {
    this._tossCigarette('npc', tx, ty);
  }

  private _lightCigarette(owner: 'player' | 'npc'): void {
    const { scene } = this.api;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    const sprite = scene.add.rectangle(f.x, f.y, 13, 4, 0xf2ece0)
      .setStrokeStyle(1, 0x998877, 1).setDepth(11) as Phaser.GameObjects.Rectangle;
    const ember = scene.add.circle(f.x, f.y, 2.4, 0xff5522, 1).setDepth(12) as Phaser.GameObjects.Arc;
    scene.tweens.add({ targets: ember, alpha: 0.45, yoyo: true, repeat: -1, duration: 620 });
    this.cigarettes.push({ owner, msLeft: CIG_BURN_MS, sprite, ember, smokeAccumMs: 0 });
  }

  private _tossCigarette(owner: 'player' | 'npc', tx: number, ty: number): void {
    const idx = this.cigarettes.findIndex(c => c.owner === owner);
    if (idx < 0) return;
    const cig = this.cigarettes[idx];
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this._destroyCigaretteVisuals(cig);
    this.cigarettes.splice(idx, 1);

    const sprite = this.api.scene.add.rectangle(f.x, f.y, 13, 4, 0xf2ece0)
      .setStrokeStyle(1, 0xff6633, 1)
      .setRotation(Math.atan2(ty - f.y, tx - f.x))
      .setDepth(11) as Phaser.GameObjects.Rectangle;
    this.smokeTosses.push({ owner, x: f.x, y: f.y, destX: tx, destY: ty, sprite });
    this.api.showFloatingText(f.x, f.y - 44, '🚬 Flick!', '#cccc99');
  }

  private _spawnSmokeCloud(owner: 'player' | 'npc', x: number, y: number): void {
    const own = owner === 'player';
    const gfx = this.api.scene.add.graphics().setDepth(own ? SMOKE_DEPTH_OWN : SMOKE_DEPTH_ENEMY);
    const puffs: SmokeCloud['puffs'] = [];
    for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
      // First puff sits dead centre so the middle never thins out.
      const a = (i / SMOKE_PUFF_COUNT) * Math.PI * 2 + Math.random();
      const d = i === 0 ? 0 : SMOKE_CLOUD_RADIUS * (0.25 + Math.random() * 0.42);
      puffs.push({
        ox: Math.cos(a) * d, oy: Math.sin(a) * d,
        r: SMOKE_CLOUD_RADIUS * (i === 0 ? 0.72 : 0.42 + Math.random() * 0.22),
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0009,
      });
    }
    this.smokeClouds.push({
      owner, x, y, radius: SMOKE_CLOUD_RADIUS,
      endsAt: this.api.scene.time.now + SMOKE_CLOUD_MS,
      gfx, puffs, wispAccumMs: 0,
    });
    this.api.showFloatingText(x, y - SMOKE_CLOUD_RADIUS * 0.6, '💨 Smoke Screen!', '#bbbbaa');
  }

  /** True while (x, y) sits inside a smoke cloud this owner laid down. */
  private _inOwnSmoke(owner: 'player' | 'npc', x: number, y: number): boolean {
    for (const c of this.smokeClouds) {
      if (c.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) <= c.radius) return true;
    }
    return false;
  }

  /** Landing a hit from inside your own cloud gives your position away for 3s. */
  private _noteSmokeAttack(owner: 'player' | 'npc'): void {
    if (this.smokeClouds.length === 0) return;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    if (!this._inOwnSmoke(owner, f.x, f.y)) return;
    const now = this.api.scene.time.now;
    if (this.smokeExposedUntil[owner] < now) {
      this.api.showFloatingText(f.x, f.y - 52, '👁️ Exposed!', '#ffcc66');
    }
    this.smokeExposedUntil[owner] = now + SMOKE_EXPOSE_MS;
  }

  /**
   * Every hit that lands costs the smoker a second of burn time. Wired from ArenaScene's
   * `damaged` listeners (the same route Metal, Time and Electricity use) — blocked hits
   * report 0 and are left alone.
   */
  onDamageReceived(owner: 'player' | 'npc', amount: number): void {
    if (amount <= 0) return;
    const cig = this._cigaretteOf(owner);
    if (!cig) return;
    cig.msLeft -= CIG_HIT_COST_MS;
    const f = owner === 'player' ? this.api.player : this.api.npc;
    this.api.showFloatingText(f.x + 18, f.y - 30, '🚬 -1s', '#998877');
  }

  private _destroyCigaretteVisuals(c: Cigarette): void {
    if (c.sprite?.active) c.sprite.destroy();
    if (c.ember?.active) c.ember.destroy();
  }

  private _updateSmokeBreak(time: number, delta: number, dt: number): void {
    this._updateCigarettes(time, delta);
    this._updateSmokeTosses(dt);
    this._updateSmokeClouds(time);
    this._updateSmokeStealth(time);
  }

  private _updateCigarettes(time: number, delta: number): void {
    const { scene } = this.api;
    // We are the only writer of smokeIncomingMult, so it is safe to rebuild it each frame.
    this.api.player.smokeIncomingMult = 1;
    this.api.npc.smokeIncomingMult = 1;

    for (let i = this.cigarettes.length - 1; i >= 0; i--) {
      const c = this.cigarettes[i];
      const f = c.owner === 'player' ? this.api.player : this.api.npc;
      c.msLeft -= delta;
      if (c.msLeft <= 0 || !f.active || f.hp <= 0) {
        this._destroyCigaretteVisuals(c);
        this.cigarettes.splice(i, 1);
        if (c.owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🚬 Burnt Out', '#888888');
        continue;
      }
      f.smokeIncomingMult = CIG_DAMAGE_MULT;

      // Held at the corner of the mouth, angled up, bobbing with the idle sway.
      const bob = Math.sin(time / 340) * 1.2;
      const cx = f.x + 13;
      const cy = f.y - 3 + bob;
      c.sprite.setPosition(cx, cy).setRotation(-0.32);
      c.ember.setPosition(cx + 6.2, cy - 2.1);

      // A wisp curling off the tip every so often — thicker as it burns down.
      c.smokeAccumMs += delta;
      const every = 240;
      if (c.smokeAccumMs >= every) {
        c.smokeAccumMs -= every;
        const puff = scene.add.circle(c.ember.x, c.ember.y, 2 + Math.random() * 2, 0xbbbbbb, 0.42).setDepth(10);
        scene.tweens.add({
          targets: puff,
          x: puff.x + Phaser.Math.Between(-14, 14),
          y: puff.y - 22 - Math.random() * 14,
          scaleX: 2.6, scaleY: 2.6, alpha: 0,
          duration: 900 + Math.random() * 400,
          onComplete: () => puff.destroy(),
        });
      }
    }
  }

  private _updateSmokeTosses(dt: number): void {
    for (let i = this.smokeTosses.length - 1; i >= 0; i--) {
      const t = this.smokeTosses[i];
      const dx = t.destX - t.x, dy = t.destY - t.y;
      const dist = Math.hypot(dx, dy);
      const step = SMOKE_TOSS_SPEED * dt;
      if (dist <= step || dist < 1) {
        this._spawnSmokeCloud(t.owner, t.destX, t.destY);
        if (t.sprite?.active) t.sprite.destroy();
        this.smokeTosses.splice(i, 1);
        continue;
      }
      t.x += (dx / dist) * step;
      t.y += (dy / dist) * step;
      t.sprite.setPosition(t.x, t.y).setRotation(t.sprite.rotation + 0.35);
    }
  }

  /**
   * Draws every live cloud. The camera is the local player's eye, so a cloud you laid down
   * renders as a thin haze under the fighters, while the enemy's renders as a solid bank of
   * smoke over the top of everything — the same object, opposite jobs.
   */
  private _updateSmokeClouds(time: number): void {
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const c = this.smokeClouds[i];
      if (time >= c.endsAt || !c.gfx?.active) {
        if (c.gfx?.active) c.gfx.destroy();
        this.smokeClouds.splice(i, 1);
        continue;
      }
      const own = c.owner === 'player';
      const age = SMOKE_CLOUD_MS - (c.endsAt - time);
      // Bloom out over the first 400ms, thin away over the last second.
      const grow = Phaser.Math.Clamp(age / 400, 0.35, 1);
      const fade = Phaser.Math.Clamp((c.endsAt - time) / 1000, 0, 1);
      const baseAlpha = (own ? 0.34 : 0.94) * fade;

      const gfx = c.gfx;
      gfx.clear();
      for (const p of c.puffs) {
        const drift = Math.sin(time * p.speed + p.phase);
        const px = c.x + p.ox + drift * 7;
        const py = c.y + p.oy + Math.cos(time * p.speed * 0.8 + p.phase) * 5;
        const pr = p.r * grow * (1 + 0.06 * drift);
        // Stacked rings from wide-and-faint to tight-and-solid: the overlap feathers the
        // edge into the next puff, so the bank reads as smoke rather than a pile of discs.
        // Each puff also sits a shade off its neighbours, which breaks up the silhouette.
        const tone = 0.86 + 0.28 * (0.5 + 0.5 * Math.sin(p.phase * 3.1));
        for (let ring = 0; ring < 6; ring++) {
          const t = ring / 5;
          const shade = own
            ? this._smokeShade(0x8e8e86, 0xd2d2c6, t * tone)
            : this._smokeShade(0x30302d, 0x76766d, t * tone);
          gfx.fillStyle(shade, baseAlpha * (0.16 + 0.16 * t));
          gfx.fillCircle(px, py, pr * (1 - 0.14 * ring));
        }
      }

      // Your own cover is thin enough to see through, so it also gets a soft rim: without
      // it you cannot tell where the cloud stops hiding you.
      if (own) {
        gfx.lineStyle(2, 0xd8d8cc, 0.28 * fade);
        gfx.strokeCircle(c.x, c.y, c.radius * grow);
      }

      // A wisp peeling off the edge now and then keeps the bank from looking painted on.
      c.wispAccumMs += this.api.scene.game.loop.delta;
      if (c.wispAccumMs >= 200) {
        c.wispAccumMs -= 200;
        const a = Math.random() * Math.PI * 2;
        const wx = c.x + Math.cos(a) * c.radius * 0.85;
        const wy = c.y + Math.sin(a) * c.radius * 0.85;
        const wisp = this.api.scene.add.circle(wx, wy, 5 + Math.random() * 7, own ? 0xc4c4b8 : 0x5e5e57, baseAlpha * 0.55)
          .setDepth(own ? SMOKE_DEPTH_OWN : SMOKE_DEPTH_ENEMY);
        this.api.scene.tweens.add({
          targets: wisp,
          x: wx + Math.cos(a) * 26, y: wy + Math.sin(a) * 26 - 12,
          scaleX: 2.2, scaleY: 2.2, alpha: 0,
          duration: 1100 + Math.random() * 500,
          onComplete: () => wisp.destroy(),
        });
      }
    }
  }

  /** Linear blend between two packed RGB colours — used for the smoke's inner gradient. */
  private _smokeShade(from: number, to: number, t: number): number {
    const k = Phaser.Math.Clamp(t, 0, 1);
    const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * k);
    const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * k);
    const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * k);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Invisibility while standing in your own cloud. The alpha is only touched on the frames
   * where this actually applies (and once on the way out), so nothing else that flashes a
   * fighter's alpha gets stomped when no cloud is up.
   */
  private _updateSmokeStealth(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const f = owner === 'player' ? this.api.player : this.api.npc;
      if (!f.active) continue;
      // Online replicas take their invisibility from the network, not from our sim.
      if (owner === 'npc' && f.netGhost) continue;

      const hidden = f.hp > 0
        && time >= this.smokeExposedUntil[owner]
        && this._inOwnSmoke(owner, f.x, f.y);
      // Only ever unhide a fighter we hid ourselves — the Stealthy mutation and Silence
      // both drive forceInvisible too, and clearing theirs would break them.
      if (!hidden && !this.smokeHidden[owner]) continue;
      this.smokeHidden[owner] = hidden;
      if (!hidden) {
        f.forceInvisible = false;
        f.setAlpha(1);
        if (owner === 'npc') f.setHealthBarVisible(true);
        continue;
      }
      f.forceInvisible = true;
      // You still see a ghost of yourself; the enemy sees nothing at all.
      f.setAlpha(owner === 'player' ? 0.35 : 0);
      if (owner === 'npc') f.setHealthBarVisible(false);
    }

    const cig = this._cigaretteOf('player');
    if (cig) {
      this.api.setStatusIndicator('smoke-break', {
        name: 'Smoke Break', emoji: '🚬', color: 0x998877,
        description: 'A lit cigarette: you take 25% less damage while it burns. Every hit you take costs it a second, and pressing the key again flicks it out as a smoke screen.',
        until: time + cig.msLeft, priority: 106,
      });
      this.smokeStatusShown = true;
    } else if (this.smokeStatusShown) {
      this.api.setStatusIndicator('smoke-break', null);
      this.smokeStatusShown = false;
    }
  }

  // ── Atom-Nhilego (preserved — will be rewired to a new ability soon) ─────

  doPlayerAtomNhilego(): void {
    if (this.playerNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.playerNhilegoActive = true;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('player', t);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 35, 'Atom-Nhilego!', '#8844cc');
  }

  doNpcAtomNhilego(): void {
    if (this.npcNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.npcNhilegoActive = true;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('npc', t);
  }

  private _tickNhilego(time: number, owner: 'player' | 'npc'): void {
    const shadow = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
    if (!shadow || !shadow.circle?.active) return;
    if (time < shadow.fireAt) return;
    this._nhilegoImpact(shadow, owner, time);
  }

  private _nhilegoImpact(shadow: NhilegoShadow, owner: 'player' | 'npc', time: number): void {
    const { api } = this;
    const { scene } = api;
    const { x, y, radius } = shadow;
    const caster = owner === 'player' ? api.player : api.npc;

    const flash = scene.add.circle(x, y, radius, 0xcc88ff, 0.8).setDepth(12) as Phaser.GameObjects.Arc;
    scene.time.delayedCall(300, () => { if (flash?.active) flash.destroy(); });
    api.dealAoeDamage(owner, x, y, radius, 25);

    const dist = Math.hypot(caster.x - x, caster.y - y);
    if (dist <= radius) {
      if (owner === 'player') {
        this.playerNhilegoRadius *= 1.1;
        this.playerNhilegoSuccessCount++;
      } else {
        this.npcNhilegoRadius *= 1.1;
        this.npcNhilegoSuccessCount++;
      }
      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      api.showFloatingText(x, y - 30, `Hit! (${successCount})`, '#cc88ff');
      shadow.circle.destroy();
      this._spawnNhilegoShadow(owner, time);
    } else {
      shadow.circle.destroy();
      if (owner === 'player') this.playerNhilegoShadow = null;
      else this.npcNhilegoShadow = null;

      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      if (owner === 'player') this.playerNhilegoActive = false;
      else this.npcNhilegoActive = false;

      const healAmt = successCount * 10;
      if (healAmt > 0) {
        caster.heal(healAmt);
        api.showFloatingText(caster.x, caster.y - 35, `+${healAmt}`, '#aaffaa');
      }
    }
  }

  private _spawnNhilegoShadow(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.api;
    const radius = owner === 'player' ? this.playerNhilegoRadius : this.npcNhilegoRadius;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    const pad = 100;
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);

    const circle = scene.add
      .circle(x, y, radius, 0x221144, 0.7)
      .setDepth(4) as Phaser.GameObjects.Arc;
    circle.setStrokeStyle(2, 0x8844cc, 0.8);

    scene.tweens.add({
      targets: circle,
      scaleX: 0.9, scaleY: 0.9,
      yoyo: true, repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });

    const shadowObj: NhilegoShadow = { circle, x, y, radius, fireAt: time + 3000, owner };
    if (owner === 'player') this.playerNhilegoShadow = shadowObj;
    else this.npcNhilegoShadow = shadowObj;
  }
}
