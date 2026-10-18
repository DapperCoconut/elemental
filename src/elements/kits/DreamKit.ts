import Phaser from 'phaser';
import { FONT_DISPLAY } from '../../ui/Theme';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  DRM, DREAM_WORLDS, DreamAvatar, DreamColorFn, DreamFx, DreamWorldView,
  dreamLeech, nightmareBeast, nightmareDarkness, sleepDagger, sleepMeter, sleepyZ, star,
} from './DreamVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';

// ── Tuning ───────────────────────────────────────────────────────────────────

// Drowsiness
const DROWSY_MAX = 100;
/** What a sleeper burns, every second, until it runs out and they wake. */
const SLEEP_BURN_PER_SEC = 5;
/** Awake, drowsiness only wears off once nothing has added to it for this long… */
const DROWSY_IDLE_MS = 4000;
/** …and then at this rate. */
const DROWSY_DECAY_PER_SEC = 3;
/** Online: a report from the dreamer's sim this soon after a wake-up here is stale. */
const NET_WAKE_GRACE_MS = 600;

// Click — Sandmen
const SANDMEN_MAG = 30;
const SANDMEN_RELOAD_MS = 5000;
const SANDMEN_GAP_MS = 125;
const SANDMEN_DAMAGE = 4;
/** Hitscan: a round flies to the cursor and a little past it, never further. */
const SANDMEN_OVERSHOOT = 30;
const SANDMEN_MIN_RANGE = 90;
const SANDMEN_KICK = 9;
const SANDMEN_KICK_MAX = 180;
// Click (dreaming) — dream pistols
const PISTOL_MAG = 2;
const PISTOL_RELOAD_MS = 1500;
const PISTOL_GAP_MS = 240;
const PISTOL_DAMAGE = 30;
const PISTOL_BLAST_R = 54;
const PISTOL_KICK = 66;
const PISTOL_KICK_MAX = 260;
/** The crosshair only starts finding its way home once the trigger has been off this long. */
const RECOIL_SETTLE_MS = 220;
/** Exponential recovery rate once settled, per second. */
const RECOIL_RECOVER = 5;
/** The bot fights its own recoil all the time, at this rate, and kicks less to begin with. */
const NPC_RECOIL_TAME = 8;
const NPC_RECOIL_SHARE = 0.5;
const HIT_R = 22;

// E — Delve
const DELVE_RANGE = 170;
const DREAM_SPEED_MULT = 1.35;
const DREAM_COOLDOWN_MULT = 0.6;

// R — Pillow Fight / (dreaming) Claw Swipe
const PILLOW_REACH = 90;
const PILLOW_HALF_ARC = Math.PI / 3;
const PILLOW_DAMAGE = 6;
const PILLOW_DROWSY = 20;
const PILLOW_FRESH_AT = 10;
const PILLOW_FRESH_DROWSY = 34;
const CLAW_REACH = 100;
const CLAW_HALF_ARC = (55 * Math.PI) / 180;
const CLAW_DAMAGE = 30;
const CLAW_SLOW_MS = 2500;
const CLAW_SLOW_MULT = 0.55;

// F — Sleep Tight / (dreaming) Living Leech
const DAGGER_SPEED = 1150;
const DAGGER_RANGE = 640;
const DAGGER_R = 6;
const DAGGER_DAMAGE = 8;
const DAGGER_DROWSY = 16;
/** Extra drowsiness at a full meter, scaled down linearly to none at an empty one. */
const DAGGER_DROWSY_BONUS = 14;
const LEECH_SPEED = 640;
const LEECH_RANGE = 560;
const LEECH_R = 10;
const LEECH_DAMAGE = 22;
const LEECH_DRAIN = 3;
const LEECH_DRAIN_MS = 1000;
const LEECH_LIFE_MS = 8000;
const LEECH_PICKUP_R = 52;
/** Share of F's remaining cooldown a pulled leech gives back — more off a fed one. */
const LEECH_REFUND_FED = 0.6;
const LEECH_REFUND_DRY = 0.4;

// Q — Nightmare
const NIGHTMARE_MIN_DROWSY = 50;
const NIGHTMARE_RANGE = 520;
const NIGHTMARE_MS = 3000;
const NIGHTMARE_TICK_MS = 250;
const NIGHTMARE_TICK_DAMAGE = 5;
const NIGHTMARE_VULN = 1.25;
const NIGHTMARE_DROWSY_COST = 15;
const NIGHTMARE_SIGHT = 110;
const NIGHTMARE_PANIC_DEG = 40;
// Q (dreaming) — the nightmare that walks
const BEAST_STEP_EVERY_MS = 420;
const BEAST_STEP_MS = 150;
const BEAST_STEP_LEN = 38;
const BEAST_JITTER = 0.6;
const BEAST_CATCH_R = 30;
const BEAST_LIFE_MS = 10000;

/** The tray's second set of names, for while the local dreamer is inside somebody's dream. */
const DREAM_CARDS: Record<string, { name: string; desc: string }> = {
  'dream-sandmen': { name: 'Dream Pistols', desc: '30 explosive a shot, perfect aim. 2 rounds, then reload — and brutal kick.' },
  'dream-delve': { name: 'Surface', desc: 'Back out to the waking world. They stay asleep; top them up and come back.' },
  'dream-pillow-fight': { name: 'Claw Swipe', desc: '30 damage in a wide rake, and a 2.5s slow.' },
  'dream-sleep-tight': { name: 'Living Leech', desc: 'Bites for 22 and keeps feeding. Walk up and pull it out to heal for all of it.' },
  'dream-nightmare': { name: 'Nightmare', desc: 'The nightmare, and a second one that stalks them on foot.' },
};

// ── State ────────────────────────────────────────────────────────────────────

/**
 * The bookkeeping the kit keeps on a body it is working on. The drowsiness and the sleep
 * themselves are Fighter fields (`dreamDrowsy` / `dreamAsleep`) so the tray and the online
 * mirror can read them; this is what sits around them.
 */
interface SleepRec {
  /** Last seen `rawDamageTaken` — waking is "you were hurt", detected without owning the callback. */
  lastRaw: number;
  lastGainAt: number;
  /** `scene.time.now` of the last wake-up, for the online staleness guard. */
  wokeAt: number;
  /** Whose sleep this is — colours the meter and owns the stun it renews. */
  by: Owner;
  nightmareBy: Owner;
  nightmareAccum: number;
  /** True while this kit holds the nightmare's vulnerability on the body. */
  vulnHeld: boolean;
}

/** One side's guns. */
interface Guns {
  mag: number;
  reloadUntil: number;
  pistolMag: number;
  pistolReloadUntil: number;
  nextShotAt: number;
  /** Which hand fires next: they take turns, so the rounds never line up. */
  side: 0 | 1;
  /** How far the recoil has walked the aim off the mouse, in world px. */
  recoilX: number;
  recoilY: number;
  lastShotAt: number;
}

function makeGuns(): Guns {
  return {
    mag: SANDMEN_MAG, reloadUntil: 0, pistolMag: PISTOL_MAG, pistolReloadUntil: 0,
    nextShotAt: 0, side: 0, recoilX: 0, recoilY: 0, lastShotAt: -1e9,
  };
}

/** A dreamer inside somebody's dream. One per side at most. */
interface Realm {
  owner: Owner;
  victim: Fighter;
  world: number;
  casterHome: { x: number; y: number };
  victimHome: { x: number; y: number };
  startedAt: number;
}

interface Dagger {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
}

interface Leech {
  owner: Owner;
  state: 'flying' | 'stuck' | 'ground';
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  victim: Fighter | null;
  /** Where on the victim it is biting, relative to their centre. */
  ox: number; oy: number;
  ang: number;
  dealt: number;
  drainAccum: number;
  until: number;
}

interface Beast {
  owner: Owner;
  victim: Fighter;
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  stepAt: number;
  nextStepAt: number;
  facing: number;
  until: number;
}

/** What the bot reads off the kit each frame. Built side-effect free — see `npcAiInfo`. */
export interface DreamNpcInfo {
  inDream: boolean;
  targetDrowsy: number;
  targetAsleep: boolean;
  /** Sandmen (or the pistols) can fire right now. */
  canFire: boolean;
  /** A sleeper is in Delve range. */
  delveReady: boolean;
  /** In a dream with too little drowsiness left to be worth staying: surface and top up. */
  shouldSurface: boolean;
  /** The target has the 50 drowsiness Nightmare needs. */
  nightmareReady: boolean;
  /** At 10 or less, so the pillow pays its bigger dose. */
  pillowFresh: boolean;
  /** A leech of the bot's is out (stuck or lying about). */
  leechOut: boolean;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DreamArenaApi {
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
  get width(): number;
  get height(): number;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op ally, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  /** Skins: maps a Dream visual colour through that side's equipped skin. */
  dreamColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay a press that never touches a cooldown (surfacing, a pulled leech). */
  broadcast(id: string): void;
  /** Rename one tray card — the dream turns every key but E into something else. */
  relabelCard(abilityId: string, name: string, desc: string): void;
}

// ── DreamKit ─────────────────────────────────────────────────────────────────

/**
 * Dream — the sandman with two little guns.
 *
 * - **Sandmen** (Click): a held barrage of hitscan rounds, turn about from two guns, with a
 *   kick that walks the crosshair off target. In a dream they become two dream pistols.
 * - **Delve** (E): step into a sleeper's dream — a full-screen world of its own, framed in
 *   purple mist, where they are awake and fighting but cannot be woken, and you are faster.
 * - **Pillow Fight** (R): the gentle way to put somebody under. In a dream, a claw.
 * - **Sleep Tight** (F): a quick dagger that puts them under faster the sleepier they are. In a
 *   dream, a leech you pull back out to heal.
 * - **Nightmare** (Q): darkness, panic and damage for anyone at 50 drowsiness. In a dream it
 *   also lets something loose to stalk them.
 *
 * Sleep is victim-side (`Fighter.dreamDrowsy` / `dreamAsleep`), so a Dream-versus-Dream match
 * has both sides writing the same two numbers. Waking is detected by polling `rawDamageTaken`.
 */
export class DreamKit {
  private api: DreamArenaApi;

  // ── Visuals ──
  private readonly pcol: DreamColorFn;
  private readonly ncol: DreamColorFn;
  private readonly pfx: DreamFx;
  private readonly nfx: DreamFx;
  private playerAvatar: DreamAvatar | null = null;
  private npcAvatar: DreamAvatar | null = null;
  /** Daggers, leeches and the walking nightmare. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sleep meters over heads. */
  private overheadGfx: Phaser.GameObjects.Graphics | null = null;
  /** The darkness a nightmare drops over the local player. Screen space. */
  private darkGfx: Phaser.GameObjects.Graphics | null = null;
  /** The crosshair the recoil kicks around. */
  private cursorGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  /** The dream on this screen, if the local player is in one (as dreamer or as dreamt). */
  private view: DreamWorldView | null = null;
  /** Dreams still fading out after they ended. */
  private fading: DreamWorldView[] = [];
  private cursorHidden = false;
  private vizT = 0;

  // ── Sim ──
  private recs = new Map<Fighter, SleepRec>();
  private guns: Record<Owner, Guns> = { player: makeGuns(), npc: makeGuns() };
  private realms: Partial<Record<Owner, Realm>> = {};
  private daggers: Dagger[] = [];
  private leeches: Leech[] = [];
  private beasts: Beast[] = [];
  private delveCount = 0;
  private lastAimX = 0;
  private lastAimY = 0;
  /** Latched so the tray is only renamed when the dream actually starts or ends. */
  private cardsDreaming = false;
  /** Throttle for the "why didn't that work" labels. */
  private deniedAt = 0;

  constructor(api: DreamArenaApi) {
    this.api = api;
    this.pcol = (base) => api.dreamColor('player', base);
    this.ncol = (base) => api.dreamColor('npc', base);
    this.pfx = new DreamFx(api.scene, this.pcol);
    this.nfx = new DreamFx(api.scene, this.ncol);
    // Leaving the arena with the system cursor still hidden would follow the player all the
    // way back to the menu, so the scene's own teardown hands it back.
    api.scene.events.on('shutdown', () => this.releaseCursor());
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DreamFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DreamColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isDream(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'dream' : this.api.npcElementId === 'dream';
  }
  /** A cast from the online opponent: already validated on their sim, so it is trusted here. */
  private remote(owner: Owner): boolean { return owner === 'npc' && this.api.isOnline; }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private avatar(owner: Owner): DreamAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }

  private rec(f: Fighter): SleepRec {
    let r = this.recs.get(f);
    if (!r) {
      // Seeded from the running tally, or every existing point of damage would read as one
      // enormous hit on the first frame this body is tracked.
      r = { lastRaw: f.rawDamageTaken, lastGainAt: 0, wokeAt: -1e9, by: 'player', nightmareBy: 'player', nightmareAccum: 0, vulnHeld: false };
      this.recs.set(f, r);
    }
    return r;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'player') return this.api.enemies.filter((f) => this.alive(f) && this.api.isTargetable(f));
    return this.api.isInvasion ? [] : [this.api.player].filter((f) => this.alive(f));
  }

  /** Every body the kit has to look after this frame. */
  private tracked(): Fighter[] {
    const out = new Set<Fighter>();
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) if (this.alive(f)) out.add(f);
    return [...out];
  }

  private bounds(): Phaser.Geom.Rectangle { return this.api.scene.physics.world.bounds; }

  /** Kit-made label — the arena's own floating text is switched off, so the ones that matter are ours. */
  private announce(x: number, y: number, text: string, color: string, size = 12): void {
    const t = this.api.scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0b0620', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19);
    this.api.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private deny(text: string): void {
    if (this.now - this.deniedAt < 700) return;
    this.deniedAt = this.now;
    const p = this.api.player;
    this.announce(p.x, p.y - 44, text, '#c9b8ff', 11);
  }

  private releaseCursor(): void {
    if (!this.cursorHidden) return;
    this.cursorHidden = false;
    this.api.scene.input.setDefaultCursor('default');
  }

  /** Dream's damage, with the waking world's rule attached: hurting a sleeper wakes them. */
  private strike(t: Fighter, amount: number): void {
    t.takeDamage(amount);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The dream holds positions, a cooldown share and the arena's backdrop — hand all of it
    // back before the state is thrown away.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.realms[owner]) this.exitRealm(owner, 'reset');
    }
    this.view?.destroy(); this.view = null;
    for (const v of this.fading) v.destroy();
    this.fading = [];
    this.realms = {};
    this.recs.clear();
    this.guns = { player: makeGuns(), npc: makeGuns() };
    this.daggers = [];
    this.leeches = [];
    this.beasts = [];
    this.delveCount = 0;
    this.cardsDreaming = false;
    this.deniedAt = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.overheadGfx?.destroy(); this.overheadGfx = null;
    this.darkGfx?.destroy(); this.darkGfx = null;
    this.cursorGfx?.destroy(); this.cursorGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.releaseCursor();

    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.dreamDrowsy = 0;
      f.dreamAsleep = false;
      f.dreamNetDrowsy = 0;
      f.dreamNetAsleep = false;
      f.dreamNightmareUntil = 0;
      f.dreamClawedUntil = 0;
      f.dreamIncomingMult = 1;
      f.dreamCooldownMult = 1;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'dream') return;
    void time;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;
    const p = this.api.player;
    if (!this.alive(p)) return;
    // Asleep in the waking world: the controls are not yours.
    if (p.dreamAsleep && !this.isDreaming(p)) return;

    const aim = this.aimFor('player');
    const ctx = this.api.buildPlayerContext(aim.x, aim.y);
    const realm = this.realms.player;

    if (pointer.isDown && this.canFire('player')) p.castAbility('dream-sandmen', ctx);

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (realm) {
        this.surfaceByHand('player');
      } else if (this.delveCandidate('player')) {
        p.castAbility('dream-delve', ctx);
      } else {
        this.deny('💤 NOBODY ASLEEP NEARBY');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('dream-pillow-fight', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dream-sleep-tight', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (this.nightmareTarget('player')) p.castAbility('dream-nightmare', ctx);
      else if (p.getCooldownRatio('dream-nightmare') >= 1) this.deny(`👁️ NEEDS ${NIGHTMARE_MIN_DROWSY}% DROWSY`);
    }
  }

  /** Where this side is really pointing: the mouse (or the bot's aim) plus the recoil. */
  private aimFor(owner: Owner): { x: number; y: number } {
    const g = this.guns[owner];
    if (owner === 'player') {
      const p = this.api.player;
      const mx = this.lastAimX || p.x + 1;
      const my = this.lastAimY || p.y;
      return { x: mx + g.recoilX, y: my + g.recoilY };
    }
    const npc = this.api.npc;
    const t = this.targetsOf('npc')[0];
    return { x: (t?.x ?? npc.x + 1) + g.recoilX, y: (t?.y ?? npc.y) + g.recoilY };
  }

  // ── Click: Sandmen / dream pistols ─────────────────────────────────────────

  /** Side-effect free: whether this side's guns would go off right now. */
  canFire(owner: Owner): boolean {
    const g = this.guns[owner];
    const t = this.now;
    if (t < g.nextShotAt) return false;
    if (this.realms[owner]) return t >= g.pistolReloadUntil && g.pistolMag > 0;
    return t >= g.reloadUntil && g.mag > 0;
  }

  doSandmen(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    // A trusted replay fires whatever its own magazine says; the bot and the player are gated.
    if (!this.remote(owner) && !this.canFire(owner)) return;
    if (this.realms[owner]) this.firePistol(owner, f, tx, ty);
    else this.fireSandman(owner, f, tx, ty);
  }

  /** The bot's aim carries its own recoil, the player's already has it from `aimFor`. */
  private botAim(owner: Owner, tx: number, ty: number): { x: number; y: number } {
    if (owner !== 'npc' || this.remote(owner)) return { x: tx, y: ty };
    const g = this.guns.npc;
    return { x: tx + g.recoilX, y: ty + g.recoilY };
  }

  private muzzleOf(owner: Owner, f: Fighter, side: 0 | 1, aimX: number, aimY: number): { x: number; y: number } {
    const av = this.avatar(owner);
    // A rig built this frame still has its hands springing in from the origin; until they
    // arrive, shoot from where the hand will be rather than from the corner of the arena.
    const m = av?.muzzle(side);
    if (m && Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) < 70) return m;
    const a = Math.atan2(aimY - f.y, aimX - f.x);
    const s = side === 0 ? -1 : 1;
    return { x: f.x + Math.cos(a) * 26 - Math.sin(a) * 10 * s, y: f.y + Math.sin(a) * 26 + Math.cos(a) * 10 * s };
  }

  /** First body a ray from (x1,y1) toward (x2,y2) runs into, and where. */
  private rayHit(owner: Owner, x1: number, y1: number, x2: number, y2: number): { t: Fighter | null; x: number; y: number } {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let best: Fighter | null = null;
    let bestU = 1;
    for (const t of this.targetsOf(owner)) {
      const r = HIT_R * (t.scaleX || 1);
      const u = Phaser.Math.Clamp(((t.x - x1) * dx + (t.y - y1) * dy) / len2, 0, 1);
      const px = x1 + dx * u, py = y1 + dy * u;
      if ((t.x - px) ** 2 + (t.y - py) ** 2 > r * r) continue;
      // Step back to where the ray first enters the body, so the tracer stops on its skin.
      const back = Math.sqrt(Math.max(0, r * r - ((t.x - px) ** 2 + (t.y - py) ** 2))) / Math.sqrt(len2);
      const enter = Math.max(0, u - back);
      if (enter < bestU) { bestU = enter; best = t; }
    }
    return { t: best, x: x1 + dx * bestU, y: y1 + dy * bestU };
  }

  private kickRecoil(owner: Owner, kick: number, cap: number, spread: number): void {
    const g = this.guns[owner];
    const share = owner === 'npc' ? NPC_RECOIL_SHARE : 1;
    // Mostly up, wandering side to side, and each hand pulls its own way.
    const bias = g.side === 0 ? -0.35 : 0.35;
    const a = -Math.PI / 2 + bias + (Math.random() * 2 - 1) * spread;
    g.recoilX += Math.cos(a) * kick * share;
    g.recoilY += Math.sin(a) * kick * share;
    const m = Math.hypot(g.recoilX, g.recoilY);
    if (m > cap) { g.recoilX *= cap / m; g.recoilY *= cap / m; }
  }

  private fireSandman(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const g = this.guns[owner];
    const aim = this.botAim(owner, tx, ty);
    const side = g.side;
    const mz = this.muzzleOf(owner, f, side, aim.x, aim.y);
    const ang = Math.atan2(aim.y - mz.y, aim.x - mz.x);
    const reach = Math.max(SANDMEN_MIN_RANGE, Phaser.Math.Distance.Between(mz.x, mz.y, aim.x, aim.y) + SANDMEN_OVERSHOOT);
    const ex = mz.x + Math.cos(ang) * reach, ey = mz.y + Math.sin(ang) * reach;
    const hit = this.rayHit(owner, mz.x, mz.y, ex, ey);
    if (hit.t) {
      this.strike(hit.t, SANDMEN_DAMAGE);
      this.syncDamage(hit.t);
    }
    this.fx(owner).sandShot(mz.x, mz.y, hit.x, hit.y, !!hit.t);
    this.avatar(owner)?.kick(side, 0.7);

    g.side = side === 0 ? 1 : 0;
    g.nextShotAt = this.now + SANDMEN_GAP_MS * f.dreamCooldownMult;
    g.lastShotAt = this.now;
    this.kickRecoil(owner, SANDMEN_KICK, SANDMEN_KICK_MAX, 0.95);
    g.mag--;
    if (g.mag <= 0) {
      g.reloadUntil = this.now + SANDMEN_RELOAD_MS;
      g.mag = SANDMEN_MAG;
      Sfx.playAt('reload', f.x, { rate: 0.8, volume: 0.6 });
      if (owner === 'player') this.announce(f.x, f.y - 46, '⌛ RELOADING', '#f0d48a', 10);
    }
  }

  private firePistol(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const g = this.guns[owner];
    const aim = this.botAim(owner, tx, ty);
    const side = g.side;
    const mz = this.muzzleOf(owner, f, side, aim.x, aim.y);
    // Perfect accuracy: the round goes exactly where the crosshair is (or into whoever is
    // standing in the way first), and it is the *kick afterwards* that is the problem.
    const hit = this.rayHit(owner, mz.x, mz.y, aim.x, aim.y);
    this.fx(owner).pistolShot(mz.x, mz.y, hit.x, hit.y);
    this.fx(owner).starBurst(hit.x, hit.y, PISTOL_BLAST_R);
    Sfx.playAt('explosion-small', hit.x, { rate: 1.3, volume: 0.55 });
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, hit.x, hit.y) > PISTOL_BLAST_R + HIT_R * 0.5) continue;
      this.strike(t, PISTOL_DAMAGE);
      this.syncDamage(t);
      this.api.spawnHitFlash(t.x, t.y, DRM.pistol);
    }
    this.avatar(owner)?.kick(side, 1.4);
    this.api.scene.cameras.main.shake(70, 0.002);

    g.side = side === 0 ? 1 : 0;
    g.nextShotAt = this.now + PISTOL_GAP_MS;
    g.lastShotAt = this.now;
    this.kickRecoil(owner, PISTOL_KICK, PISTOL_KICK_MAX, 0.6);
    g.pistolMag--;
    if (g.pistolMag <= 0) {
      g.pistolReloadUntil = this.now + PISTOL_RELOAD_MS * f.dreamCooldownMult;
      g.pistolMag = PISTOL_MAG;
      Sfx.playAt('reload', f.x, { rate: 0.6, volume: 0.7 });
    }
  }

  private updateRecoil(owner: Owner, dt: number): void {
    const g = this.guns[owner];
    const rate = owner === 'npc' ? NPC_RECOIL_TAME : (this.now - g.lastShotAt > RECOIL_SETTLE_MS ? RECOIL_RECOVER : 0);
    if (rate <= 0) return;
    const k = Math.exp(-rate * dt);
    g.recoilX *= k;
    g.recoilY *= k;
  }

  // ── E: Delve ───────────────────────────────────────────────────────────────

  /** Whether this body is inside somebody's dream right now (awake in there, asleep out here). */
  isDreaming(f: Fighter): boolean {
    return this.realms.player?.victim === f || this.realms.npc?.victim === f;
  }

  /** The nearest sleeper this side could step into. Side-effect free. */
  private delveCandidate(owner: Owner): Fighter | null {
    if (this.realms[owner]) return null;
    const f = this.fighter(owner);
    if (!this.alive(f) || f.dreamAsleep) return null;
    let best: Fighter | null = null;
    let bestD = DELVE_RANGE;
    for (const t of this.targetsOf(owner)) {
      if (!t.dreamAsleep || this.isDreaming(t)) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d <= bestD) { bestD = d; best = t; }
    }
    return best;
  }

  doDelve(owner: Owner): void {
    if (this.realms[owner]) {
      // A bot presses E to come back out; a replay never toggles (surfacing has its own relay).
      if (!this.remote(owner)) this.exitRealm(owner, 'surface');
      return;
    }
    const victim = this.remote(owner) ? this.api.player : this.delveCandidate(owner);
    if (!this.alive(victim)) return;
    this.enterRealm(owner, victim);
  }

  /** The player surfacing: off the cooldown's books, so it is restamped and relayed by hand. */
  private surfaceByHand(owner: Owner): void {
    const f = this.fighter(owner);
    if (f.getCooldownRatio('dream-delve') < 1) return;
    f.restampCooldown('dream-delve');
    this.exitRealm(owner, 'surface');
    if (owner === 'player' && this.api.isOnline) this.api.broadcast('dream-surface');
  }

  /** Online: the opponent's own presses that never touch a cooldown. */
  replayNet(id: string): void {
    if (id === 'dream-surface') {
      if (this.realms.npc) this.exitRealm('npc', 'surface');
    } else if (id === 'dream-leech-off') {
      this.leeches = this.leeches.filter((l) => l.owner !== 'npc');
    }
  }

  private enterRealm(owner: Owner, victim: Fighter): void {
    const f = this.fighter(owner);
    // Online, both sims have to dream the same place, and both see every delve in order.
    const world = this.api.isOnline
      ? this.delveCount % DREAM_WORLDS.length
      : (this.delveCount + Math.floor(Math.random() * DREAM_WORLDS.length)) % DREAM_WORLDS.length;
    this.delveCount++;
    const realm: Realm = {
      owner, victim, world,
      casterHome: { x: f.x, y: f.y },
      victimHome: { x: victim.x, y: victim.y },
      startedAt: this.now,
    };
    this.realms[owner] = realm;
    // Their sleep is still running out here — it is only the body that is up and about now.
    if (victim.earthStunnedUntil <= this.now + 200) victim.earthStunnedUntil = this.now;
    this.daggers = this.daggers.filter((d) => d.owner !== owner);
    this.fx(owner).delveSwirl(victim.x, victim.y, false);
    this.fx(owner).delveSwirl(f.x, f.y, false);
    Sfx.playAt('dream-chime', victim.x, { rate: 0.7, volume: 0.9 });

    const local = this.api.player;
    if (f === local || victim === local) {
      this.view?.destroy();
      this.view = new DreamWorldView(this.api.scene, this.col(owner), world, this.api.width, this.api.height, this.api.isInvasion);
      const w = DREAM_WORLDS[world];
      const banner = this.api.scene.add.text(this.api.width / 2, 92, `💭 ${w.name.toUpperCase()}`, {
        fontSize: '22px', fontFamily: FONT_DISPLAY, color: w.color, stroke: '#0b0620', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(24).setScrollFactor(0).setAlpha(0);
      this.api.scene.tweens.add({
        targets: banner, alpha: 1, y: 82, duration: 380, yoyo: true, hold: 900,
        onComplete: () => banner.destroy(),
      });
    }
  }

  private exitRealm(owner: Owner, why: 'surface' | 'woke' | 'reset' | 'ended'): void {
    const realm = this.realms[owner];
    if (!realm) return;
    delete this.realms[owner];
    const f = this.fighter(owner);
    const v = realm.victim;

    if (why !== 'reset') {
      // Back to where the bodies were lying. Online each sim only moves its own fighter —
      // the other one arrives on the position stream. Husks stay where the dream left them.
      const mayMove = (x: Fighter): boolean => (!this.api.isOnline || x === this.api.player)
        && (x === this.api.player || x === this.api.npc);
      if (this.alive(f) && mayMove(f)) {
        f.setPosition(realm.casterHome.x, realm.casterHome.y);
        this.body(f)?.setVelocity(0, 0);
      }
      if (this.alive(v) && mayMove(v)) {
        v.setPosition(realm.victimHome.x, realm.victimHome.y);
        this.body(v)?.setVelocity(0, 0);
      }
      this.fx(owner).delveSwirl(f.x, f.y, true);
    }
    f.dreamCooldownMult = 1;
    // Whatever was dreamt stays in the dream.
    this.leeches = this.leeches.filter((l) => l.owner !== owner);
    this.beasts = this.beasts.filter((b) => b.owner !== owner);

    if (this.view && (f === this.api.player || v === this.api.player)) {
      this.view.close();
      this.fading.push(this.view);
      this.view = null;
    }
    if (why === 'woke' && this.alive(v)) {
      this.announce(v.x, v.y - 50, '⏰ THE DREAM ENDS', '#d8e2ff');
    }
  }

  // ── R: Pillow Fight / Claw Swipe ───────────────────────────────────────────

  doPillowFight(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    if (this.realms[owner]) {
      this.doClaw(owner, f, ang);
      return;
    }
    this.fx(owner).pillowSwing(f.x, f.y, ang, PILLOW_REACH);
    this.avatar(owner)?.play('sweep', ang);
    for (const t of this.inArc(owner, f, ang, PILLOW_REACH, PILLOW_HALF_ARC)) {
      this.fx(owner).feathers(t.x, t.y, 9, ang);
      if (t.dreamAsleep) {
        // A sleeper gets tucked in, not hit: no damage, so nothing wakes them.
        this.addDrowsy(t, PILLOW_DROWSY, owner);
        continue;
      }
      const fresh = t.dreamDrowsy <= PILLOW_FRESH_AT;
      this.strike(t, PILLOW_DAMAGE);
      this.addDrowsy(t, fresh ? PILLOW_FRESH_DROWSY : PILLOW_DROWSY, owner);
      if (fresh) this.announce(t.x, t.y - 46, '🥱 YAWN', '#bfd0ff', 10);
    }
  }

  private doClaw(owner: Owner, f: Fighter, ang: number): void {
    this.fx(owner).clawSwipe(f.x, f.y, ang, CLAW_REACH);
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('claw', f.x, { rate: 0.9, volume: 0.8 });
    for (const t of this.inArc(owner, f, ang, CLAW_REACH, CLAW_HALF_ARC)) {
      this.strike(t, CLAW_DAMAGE);
      this.syncDamage(t);
      t.dreamClawedUntil = Math.max(t.dreamClawedUntil, this.now + CLAW_SLOW_MS);
      this.api.spawnHitFlash(t.x, t.y, DRM.claw);
    }
  }

  private inArc(owner: Owner, f: Fighter, ang: number, reach: number, half: number): Fighter[] {
    return this.targetsOf(owner).filter((t) => {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > reach + HIT_R) return false;
      if (d < HIT_R) return true;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      return diff <= half;
    });
  }

  // ── F: Sleep Tight / Living Leech ──────────────────────────────────────────

  doSleepTight(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('punch', ang);
    const sx = f.x + Math.cos(ang) * 20, sy = f.y + Math.sin(ang) * 20;
    if (this.realms[owner]) {
      this.leeches.push({
        owner, state: 'flying', x: sx, y: sy,
        vx: Math.cos(ang) * LEECH_SPEED, vy: Math.sin(ang) * LEECH_SPEED, travelled: 0,
        victim: null, ox: 0, oy: 0, ang, dealt: 0, drainAccum: 0, until: 0,
      });
      Sfx.playAt('whoosh', f.x, { rate: 0.6, volume: 0.6 });
      return;
    }
    this.daggers.push({ owner, x: sx, y: sy, vx: Math.cos(ang) * DAGGER_SPEED, vy: Math.sin(ang) * DAGGER_SPEED, travelled: 0 });
  }

  private updateDaggers(dt: number): void {
    const b = this.bounds();
    for (let i = this.daggers.length - 1; i >= 0; i--) {
      const d = this.daggers[i];
      const steps = 3;
      let done = false;
      for (let s = 0; s < steps && !done; s++) {
        d.x += (d.vx * dt) / steps;
        d.y += (d.vy * dt) / steps;
        d.travelled += (DAGGER_SPEED * dt) / steps;
        for (const t of this.targetsOf(d.owner)) {
          if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > HIT_R + DAGGER_R) continue;
          this.daggerHit(d, t);
          done = true;
          break;
        }
      }
      if (done || d.travelled > DAGGER_RANGE || !b.contains(d.x, d.y)) this.daggers.splice(i, 1);
    }
  }

  private daggerHit(d: Dagger, t: Fighter): void {
    const f = this.fighter(d.owner);
    const sleepy = Phaser.Math.Clamp(t.dreamDrowsy / DROWSY_MAX, 0, 1);
    // A sleeper is not stabbed — only sung to.
    if (!t.dreamAsleep) this.strike(t, DAGGER_DAMAGE);
    this.addDrowsy(t, DAGGER_DROWSY + DAGGER_DROWSY_BONUS * sleepy, d.owner);
    this.fx(d.owner).stardust(t.x, t.y, 6, 20, 520, 8);
    this.api.spawnHitFlash(t.x, t.y, DRM.blade);
    if (this.alive(f)) {
      const cd = (f.element.abilities.find((a) => a.id === 'dream-sleep-tight')?.cooldown ?? 6000) * f.dreamCooldownMult;
      f.reduceCooldown('dream-sleep-tight', cd * 0.5);
    }
  }

  private updateLeeches(dt: number, delta: number): void {
    const b = this.bounds();
    for (let i = this.leeches.length - 1; i >= 0; i--) {
      const l = this.leeches[i];
      const caster = this.fighter(l.owner);
      if (l.state === 'flying') {
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.travelled += LEECH_SPEED * dt;
        const t = this.targetsOf(l.owner).find((x) => Phaser.Math.Distance.Between(l.x, l.y, x.x, x.y) <= HIT_R + LEECH_R);
        if (t) {
          l.state = 'stuck';
          l.victim = t;
          l.ox = (l.x - t.x) * 0.7;
          l.oy = (l.y - t.y) * 0.7;
          l.until = this.now + LEECH_LIFE_MS;
          this.strike(t, LEECH_DAMAGE);
          this.syncDamage(t);
          l.dealt += LEECH_DAMAGE;
          this.api.spawnHitFlash(t.x, t.y, DRM.leechBelly);
          this.announce(t.x, t.y - 44, '🪱 LATCHED ON', '#ff7ab0', 10);
        } else if (l.travelled > LEECH_RANGE || !b.contains(l.x, l.y)) {
          l.state = 'ground';
          l.until = this.now + LEECH_LIFE_MS;
        }
      } else if (l.state === 'stuck') {
        const v = l.victim;
        if (!this.alive(v)) { l.state = 'ground'; l.victim = null; continue; }
        l.x = v.x + l.ox;
        l.y = v.y + l.oy;
        l.ang = Math.atan2(-l.oy, -l.ox);
        l.drainAccum += delta;
        while (l.drainAccum >= LEECH_DRAIN_MS) {
          l.drainAccum -= LEECH_DRAIN_MS;
          this.strike(v, LEECH_DRAIN);
          l.dealt += LEECH_DRAIN;
        }
      }
      if (l.state !== 'flying' && this.now >= l.until) {
        if (l.state === 'stuck') l.state = 'ground';
        this.leeches.splice(i, 1);
        continue;
      }
      // Pulling it back out: walk up to wherever it is.
      if (l.state !== 'flying' && this.alive(caster) && !this.remote(l.owner)
        && Phaser.Math.Distance.Between(caster.x, caster.y, l.x, l.y) <= LEECH_PICKUP_R) {
        this.pullLeech(l, caster);
        this.leeches.splice(i, 1);
      }
    }
  }

  private pullLeech(l: Leech, caster: Fighter): void {
    const fed = l.dealt > 0;
    if (fed) caster.heal(l.dealt);
    const ratio = caster.getCooldownRatio('dream-sleep-tight');
    const cd = (caster.element.abilities.find((a) => a.id === 'dream-sleep-tight')?.cooldown ?? 6000) * caster.dreamCooldownMult;
    caster.reduceCooldown('dream-sleep-tight', (1 - ratio) * cd * (fed ? LEECH_REFUND_FED : LEECH_REFUND_DRY));
    this.fx(l.owner).stardust(l.x, l.y, 8, 24, 600, 8);
    this.announce(caster.x, caster.y - 44, fed ? `🩸 +${Math.round(l.dealt)}` : '🪱 PULLED', '#ff9cc8', 11);
    if (l.owner === 'player' && this.api.isOnline) this.api.broadcast('dream-leech-off');
  }

  // ── Q: Nightmare ───────────────────────────────────────────────────────────

  /** Who a Nightmare from this side would land on. Side-effect free. */
  private nightmareTarget(owner: Owner): Fighter | null {
    const realm = this.realms[owner];
    if (realm) return this.alive(realm.victim) && realm.victim.dreamDrowsy >= NIGHTMARE_MIN_DROWSY ? realm.victim : null;
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    let best: Fighter | null = null;
    let bestD = NIGHTMARE_RANGE;
    for (const t of this.targetsOf(owner)) {
      if (t.dreamDrowsy < NIGHTMARE_MIN_DROWSY) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d <= bestD) { bestD = d; best = t; }
    }
    return best;
  }

  doNightmare(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const realm = this.realms[owner];
    const t = this.remote(owner) ? (realm?.victim ?? this.api.player) : this.nightmareTarget(owner);
    if (!this.alive(t)) return;
    this.avatar(owner)?.play('raise');
    this.applyNightmare(t, owner);
    t.dreamDrowsy = Math.max(0, t.dreamDrowsy - NIGHTMARE_DROWSY_COST);
    if (t.dreamAsleep && t.dreamDrowsy <= 0) this.wake(t, 'natural');
    if (realm) {
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      const bx = f.x + Math.cos(a) * 30, by = f.y + Math.sin(a) * 30;
      this.beasts.push({
        owner, victim: t, x: bx, y: by, fromX: bx, fromY: by, toX: bx, toY: by,
        stepAt: this.now, nextStepAt: this.now + BEAST_STEP_EVERY_MS, facing: a, until: this.now + BEAST_LIFE_MS,
      });
      this.fx(owner).ring(bx, by, 6, 46, DRM.dread, 420, 4, 8);
    }
  }

  private applyNightmare(t: Fighter, owner: Owner): void {
    const r = this.rec(t);
    t.dreamNightmareUntil = this.now + NIGHTMARE_MS;
    r.nightmareBy = owner;
    r.nightmareAccum = 0;
    this.fx(owner).ring(t.x, t.y, 10, 70, DRM.dread, 520, 5, 8);
    this.api.spawnHitFlash(t.x, t.y, DRM.dread);
    this.announce(t.x, t.y - 52, '👁️ NIGHTMARE', '#ff3b6b', 13);
    // Panic: the local victim's whole screen shudders.
    if (t === this.api.player) this.api.scene.cameras.main.shake(260, 0.006);
  }

  private updateBeasts(): void {
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      const v = b.victim;
      if (!this.alive(v) || this.now >= b.until || !this.realms[b.owner]) {
        this.fx(b.owner).stardust(b.x, b.y, 6, 26, 600, 7);
        this.beasts.splice(i, 1);
        continue;
      }
      // Lurch, freeze, lurch: a jittery step toward them, never a walk.
      if (this.now >= b.nextStepAt) {
        const a = Math.atan2(v.y - b.y, v.x - b.x) + (Math.random() * 2 - 1) * BEAST_JITTER;
        b.fromX = b.x; b.fromY = b.y;
        b.toX = b.x + Math.cos(a) * BEAST_STEP_LEN;
        b.toY = b.y + Math.sin(a) * BEAST_STEP_LEN;
        b.facing = a;
        b.stepAt = this.now;
        b.nextStepAt = this.now + BEAST_STEP_EVERY_MS * (0.7 + Math.random() * 0.6);
      }
      const u = Phaser.Math.Clamp((this.now - b.stepAt) / BEAST_STEP_MS, 0, 1);
      b.x = b.fromX + (b.toX - b.fromX) * u;
      b.y = b.fromY + (b.toY - b.fromY) * u;
      if (Phaser.Math.Distance.Between(b.x, b.y, v.x, v.y) <= BEAST_CATCH_R) {
        this.applyNightmare(v, b.owner);
        this.fx(b.owner).ring(b.x, b.y, 6, 60, DRM.dreadDeep, 480, 6, 8);
        this.beasts.splice(i, 1);
      }
    }
  }

  // ── Drowsiness ─────────────────────────────────────────────────────────────

  private addDrowsy(t: Fighter, amount: number, by: Owner): void {
    // A body that is off dreaming cannot be made any sleepier — it is not here.
    if (this.isDreaming(t)) return;
    const r = this.rec(t);
    t.dreamDrowsy = Math.min(DROWSY_MAX, t.dreamDrowsy + meterGain(this.fighter(by), amount));
    r.lastGainAt = this.now;
    if (!t.dreamAsleep && t.dreamDrowsy >= DROWSY_MAX) this.fallAsleep(t, by);
    else if (t.dreamAsleep) r.by = by;
  }

  private fallAsleep(t: Fighter, by: Owner): void {
    if (t.unstoppable) {
      // Nothing that ignores stuns is going to lie down for a pillow either.
      t.dreamDrowsy = DROWSY_MAX * 0.99;
      this.announce(t.x, t.y - 46, '☕ WIDE AWAKE', '#ffd98a');
      return;
    }
    const r = this.rec(t);
    t.dreamAsleep = true;
    t.dreamDrowsy = Math.max(t.dreamDrowsy, 1);
    r.by = by;
    r.lastRaw = t.rawDamageTaken;
    this.body(t)?.setVelocity(0, 0);
    this.fx(by).zzzPuff(t.x, t.y);
    this.fx(by).ring(t.x, t.y, 10, 70, DRM.purple, 620, 5, 7);
    this.announce(t.x, t.y - 50, '😴 ASLEEP', '#a78bfa', 13);
    Sfx.playAt('dream-chime', t.x, { rate: 0.85, volume: 0.8 });
  }

  private wake(t: Fighter, why: 'damage' | 'natural'): void {
    const r = this.rec(t);
    t.dreamAsleep = false;
    t.dreamDrowsy = 0;
    r.wokeAt = this.now;
    // Only lift the stun if it is the one sleep was renewing.
    if (t.earthStunnedUntil <= this.now + 200) t.earthStunnedUntil = this.now;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.realms[owner]?.victim === t) this.exitRealm(owner, 'woke');
    }
    this.fx(r.by).stardust(t.x, t.y, 7, 26, 640, 7);
    this.announce(t.x, t.y - 44, why === 'damage' ? '⏰ AWAKE!' : '🥱 Woke up', '#d8e2ff', 11);
  }

  /** Compare a body's damage tally with the last one seen. Any hit to a sleeper out here wakes it. */
  private syncDamage(t: Fighter): void {
    const r = this.rec(t);
    const d = t.rawDamageTaken - r.lastRaw;
    r.lastRaw = t.rawDamageTaken;
    if (d <= 0.5 || !t.dreamAsleep) return;
    // In a dream they are awake already, and nothing that happens in there reaches the body.
    if (this.isDreaming(t)) return;
    this.wake(t, 'damage');
  }

  private updateSleepers(delta: number): void {
    const dt = delta / 1000;
    const now = this.now;
    for (const f of this.tracked()) {
      const r = this.rec(f);

      // Online: fold in what the dreamer's sim says about our own body.
      if (this.api.isOnline && f === this.api.player && this.api.npcElementId === 'dream'
        && now - r.wokeAt > NET_WAKE_GRACE_MS) {
        if (f.dreamNetDrowsy > f.dreamDrowsy && !this.isDreaming(f)) f.dreamDrowsy = Math.min(DROWSY_MAX, f.dreamNetDrowsy);
        if (f.dreamNetAsleep && !f.dreamAsleep) this.fallAsleep(f, 'npc');
      }

      // Woken by damage? Checked before the nightmare ticks so a real hit is never swallowed.
      this.syncDamage(f);

      // ── Nightmare ──
      if (f.dreamNightmareUntil > now) {
        r.nightmareAccum += delta;
        while (r.nightmareAccum >= NIGHTMARE_TICK_MS) {
          r.nightmareAccum -= NIGHTMARE_TICK_MS;
          this.strike(f, NIGHTMARE_TICK_DAMAGE);
          // A nightmare is not an alarm clock: its own damage must not wake its host.
          r.lastRaw = f.rawDamageTaken;
        }
        f.dreamIncomingMult = NIGHTMARE_VULN;
        r.vulnHeld = true;
        // Panic, for anything that aims with a hand that can shake.
        if (f !== this.api.player) {
          f.aimOffsetBonusDeg = Math.max(now < f.aimOffsetBonusUntil ? f.aimOffsetBonusDeg : 0, NIGHTMARE_PANIC_DEG);
          f.aimOffsetBonusUntil = Math.max(f.aimOffsetBonusUntil, now + 150);
        }
      } else if (r.vulnHeld) {
        r.vulnHeld = false;
        f.dreamIncomingMult = 1;
        r.nightmareAccum = 0;
      }

      // ── Sleep ──
      if (f.dreamAsleep) {
        f.dreamDrowsy -= SLEEP_BURN_PER_SEC * dt;
        if (f.dreamDrowsy <= 0) { this.wake(f, 'natural'); continue; }
        if (this.isDreaming(f)) continue;
        this.body(f)?.setVelocity(0, 0);
        f.earthStunnedUntil = Math.max(f.earthStunnedUntil, now + 140);
        f.applyDisarm(160);
        continue;
      }
      if (f.dreamDrowsy > 0 && now - r.lastGainAt > DROWSY_IDLE_MS) {
        f.dreamDrowsy = Math.max(0, f.dreamDrowsy - DROWSY_DECAY_PER_SEC * dt);
      }
    }
  }

  // ── Per frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isDream('player');
    const npcIs = this.isDream('npc');
    this.vizT += delta / 1000;
    const dt = Math.min(0.05, delta / 1000);
    this.ensureLayers();

    // Dreams end when either of the two in them does.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const realm = this.realms[owner];
      if (!realm) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(realm.victim) || !this.isDream(owner)) this.exitRealm(owner, 'ended');
      else if (f.dreamAsleep) this.exitRealm(owner, 'ended');
      else f.dreamCooldownMult = DREAM_COOLDOWN_MULT;
    }

    if (playerIs) this.updateRecoil('player', dt);
    if (npcIs) this.updateRecoil('npc', dt);
    this.updateDaggers(dt);
    this.updateLeeches(dt, delta);
    this.updateBeasts();
    this.updateSleepers(delta);
    this.updateCards(playerIs);

    this.view?.update(delta);
    this.fading = this.fading.filter((v) => {
      if (v.update(delta)) return true;
      v.destroy();
      return false;
    });

    this.updateAvatars(delta, playerIs, npcIs);
    this.paintAir();
    this.paintOverhead();
    this.paintDarkness();
    this.paintCursor(playerIs);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7.5);
    if (!this.overheadGfx) this.overheadGfx = scene.add.graphics().setDepth(16);
    if (!this.darkGfx) this.darkGfx = scene.add.graphics().setDepth(13.6).setScrollFactor(0);
    if (!this.cursorGfx) this.cursorGfx = scene.add.graphics().setDepth(30);
  }

  /** Rename the tray for the dream, and back again, only on the frames it changes. */
  private updateCards(playerIs: boolean): void {
    const dreaming = playerIs && !!this.realms.player;
    if (dreaming === this.cardsDreaming) return;
    this.cardsDreaming = dreaming;
    const el = this.api.player.element;
    for (const ab of el.abilities) {
      const alt = DREAM_CARDS[ab.id];
      if (!alt) continue;
      if (dreaming) this.api.relabelCard(ab.id, alt.name, alt.desc);
      else this.api.relabelCard(ab.id, ab.name, ab.description);
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc, scene } = this.api;
    const drive = (owner: Owner, f: Fighter, on: boolean): void => {
      let av = this.avatar(owner);
      if (!on || !f?.active) {
        av?.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        return;
      }
      if (!av) {
        av = new DreamAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const aim = this.aimFor(owner);
      const ang = Math.atan2(aim.y - f.y, aim.x - f.x);
      av.setFacing(ang);
      const realm = this.realms[owner];
      av.setGuns(realm ? 'pistols' : 'sandmen');
      av.setSwing(realm ? 1 : 0);
      av.setIntensity(realm ? 1.2 : 1);
      av.setDrowsy(f.dreamAsleep ? 1 : Phaser.Math.Clamp(f.dreamDrowsy / DROWSY_MAX, 0, 1));
      const firing = this.now - this.guns[owner].lastShotAt < 200;
      av.setHold(firing ? 'spray' : null, ang);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    };
    drive('player', player, playerIs);
    drive('npc', npc, npcIs);
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const d of this.daggers) {
      const a = Math.atan2(d.vy, d.vx);
      g.lineStyle(2, this.col(d.owner)(DRM.pale), 0.35);
      g.lineBetween(d.x - Math.cos(a) * 26, d.y - Math.sin(a) * 26, d.x, d.y);
      sleepDagger(g, this.col(d.owner), d.x, d.y, a, 1);
    }
    for (const l of this.leeches) {
      const a = l.state === 'flying' ? Math.atan2(l.vy, l.vx) : l.ang;
      const fat = l.state === 'stuck' ? Math.min(1, l.dealt / 60) : 0;
      const fade = l.state === 'ground' ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
      dreamLeech(g, this.col(l.owner), l.x, l.y, a, t, fade, l.state === 'stuck', fat);
      // The cue to come and get it: a soft ring when it is worth pulling.
      if (l.state !== 'flying' && l.owner === 'player') {
        g.lineStyle(1.5, this.pcol(DRM.leechBelly), 0.35 + 0.2 * Math.sin(t * 5));
        g.strokeCircle(l.x, l.y, LEECH_PICKUP_R * 0.6);
      }
    }
    for (const b of this.beasts) {
      const step = Phaser.Math.Clamp((this.now - b.stepAt) / BEAST_STEP_MS, 0, 1);
      const left = (b.until - this.now) / BEAST_LIFE_MS;
      nightmareBeast(g, this.col(b.owner), b.x, b.y, b.facing, t, Math.min(1, left * 4), step);
    }
  }

  private paintOverhead(): void {
    const g = this.overheadGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const f of this.tracked()) {
      if (f.dreamDrowsy <= 0.5 && !f.dreamAsleep) continue;
      if (f.forceInvisible) continue;
      const r = this.rec(f);
      const tint = this.col(r.by);
      const ratio = Phaser.Math.Clamp(f.dreamDrowsy / DROWSY_MAX, 0, 1);
      sleepMeter(g, tint, f.x, f.y - 60, ratio, t, f.dreamAsleep, 1);
      if (f.dreamAsleep && !this.isDreaming(f)) {
        for (let i = 0; i < 3; i++) {
          const p = (t * 0.45 + i / 3) % 1;
          sleepyZ(g, tint, f.x + 17 + Math.sin(p * 3.2 + i) * 7, f.y - 32 - p * 28, 5 + p * 3, (1 - p) * 0.9, -0.2);
        }
      }
      if (this.isDreaming(f)) {
        // A thought bubble: they are somewhere else, and this is how long they have left there.
        g.fillStyle(tint(DRM.pale), 0.8);
        g.fillCircle(f.x + 24, f.y - 34, 3);
        g.fillCircle(f.x + 30, f.y - 42, 4.5);
        star(g, tint, f.x + 38, f.y - 50, 6, 0.9, DRM.star, t);
      }
    }
  }

  /** The darkness over the local player while a nightmare has them. Screen space. */
  private paintDarkness(): void {
    const g = this.darkGfx;
    if (!g) return;
    g.clear();
    const p = this.api.player;
    if (!this.alive(p) || p.dreamNightmareUntil <= this.now) return;
    const cam = this.api.scene.cameras.main;
    const left = p.dreamNightmareUntil - this.now;
    const fadeIn = Phaser.Math.Clamp((NIGHTMARE_MS - left) / 200, 0, 1);
    const fadeOut = Phaser.Math.Clamp(left / 300, 0, 1);
    const by = this.rec(p).nightmareBy;
    nightmareDarkness(g, this.col(by), p.x - cam.scrollX, p.y - cam.scrollY, NIGHTMARE_SIGHT,
      Math.max(this.api.width, this.api.height), this.vizT, Math.min(fadeIn, fadeOut));
  }

  /**
   * The crosshair. The system pointer is hidden for a Dream player, because the whole point of
   * the recoil is that the crosshair is *not* where the mouse is.
   */
  private paintCursor(playerIs: boolean): void {
    const g = this.cursorGfx;
    if (!g) return;
    g.clear();
    if (!playerIs || !this.alive(this.api.player)) {
      this.releaseCursor();
      return;
    }
    if (!this.cursorHidden) {
      this.cursorHidden = true;
      this.api.scene.input.setDefaultCursor('none');
    }
    const { x, y } = this.aimFor('player');
    const gun = this.guns.player;
    const dreaming = !!this.realms.player;
    const c = (k: number) => this.pcol(k);
    const r = dreaming ? 13 : 10;
    const main = dreaming ? DRM.pistol : DRM.sand;
    g.lineStyle(3, c(DRM.night), 0.8);
    g.strokeCircle(x, y, r);
    g.lineStyle(1.6, c(main), 1);
    g.strokeCircle(x, y, r);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3), x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8));
    }
    g.fillStyle(c(DRM.white), 1);
    g.fillCircle(x, y, 1.6);
    // Where the mouse really is, faintly — the thing you are dragging against the kick.
    if (Math.hypot(gun.recoilX, gun.recoilY) > 6) {
      g.lineStyle(1, c(DRM.pale), 0.25);
      g.strokeCircle(this.lastAimX, this.lastAimY, 4);
    }
    // Ammo: pips around the ring, or a reload sweep.
    const reloading = dreaming ? this.now < gun.pistolReloadUntil : this.now < gun.reloadUntil;
    if (reloading) {
      const until = dreaming ? gun.pistolReloadUntil : gun.reloadUntil;
      const total = dreaming ? PISTOL_RELOAD_MS * this.api.player.dreamCooldownMult : SANDMEN_RELOAD_MS;
      const k = 1 - Phaser.Math.Clamp((until - this.now) / total, 0, 1);
      g.lineStyle(3, c(DRM.sandDeep), 0.9);
      g.beginPath();
      g.arc(x, y, r + 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
      g.strokePath();
    } else {
      const n = dreaming ? gun.pistolMag : gun.mag;
      const max = dreaming ? PISTOL_MAG : SANDMEN_MAG;
      const R = r + 12;
      for (let i = 0; i < max; i++) {
        const a = -Math.PI / 2 + (i / max) * Math.PI * 2;
        g.fillStyle(c(i < n ? (dreaming ? DRM.star : DRM.sand) : DRM.deep), i < n ? 1 : 0.5);
        g.fillCircle(x + Math.cos(a) * R, y + Math.sin(a) * R, dreaming ? 3 : 1.4);
      }
    }
  }

  private paintHud(playerIs: boolean): void {
    const realm = this.realms.player;
    if (!playerIs || !realm) {
      this.hudLabel?.setVisible(false);
      return;
    }
    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(this.api.width / 2, 48, '', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: '#e9ddff', stroke: '#0b0620', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
    }
    const left = Math.max(0, realm.victim.dreamDrowsy / SLEEP_BURN_PER_SEC);
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(`💭 ${DREAM_WORLDS[realm.world].name.toUpperCase()} — ${left.toFixed(1)}s OF DREAM LEFT   ·   E TO SURFACE`);
    this.hudLabel.setColor(left < 4 ? '#ff9cc8' : '#e9ddff');
  }

  /** The dreamer's own buff, for the top-right tray. The victim's effects are Fighter descriptors. */
  private pushStatuses(playerIs: boolean): void {
    const realm = this.realms.player;
    this.api.setStatusIndicator('dream-dreamwalking', playerIs && realm ? {
      name: 'Dreamwalking', emoji: '💭', color: DRM.purple,
      description: `Inside their dream: ${Math.round((DREAM_SPEED_MULT - 1) * 100)}% faster, cooldowns ${Math.round((1 - DREAM_COOLDOWN_MULT) * 100)}% shorter, and every key but E is its dream version. Nothing you do in here wakes their body. It ends when their drowsiness runs out — or when you press E.`,
      count: Math.ceil(Math.max(0, realm.victim.dreamDrowsy / SLEEP_BURN_PER_SEC)), suffix: 's', priority: 112,
    } : null);
    const gun = this.guns.player;
    this.api.setStatusIndicator('dream-reload', playerIs && !realm && this.now < gun.reloadUntil ? {
      name: 'Reloading', emoji: '⌛', color: DRM.sandDeep,
      description: `Both Sandmen are being refilled — ${SANDMEN_MAG} rounds, ${SANDMEN_RELOAD_MS / 1000} seconds.`,
      until: gun.reloadUntil, priority: 111,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * The dream's haste and the claw's slow, pulled by ArenaScene rather than pushed — this kit's
   * update runs after the frame's movement has already resolved.
   */
  private speedMultFor(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 1;
    let mult = 1;
    if (this.realms[owner]) mult *= DREAM_SPEED_MULT;
    // Online the slow on our own body already arrives as the opponent's speed relay.
    const relayed = owner === 'player' && this.api.isOnline;
    if (!relayed && f.dreamClawedUntil > this.now) mult *= CLAW_SLOW_MULT;
    return mult;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** Asleep out here and not dreaming — the npc's AI stands down. */
  locksNpcAi(): boolean {
    const npc = this.api.npc;
    return !!npc && npc.dreamAsleep && !this.isDreaming(npc);
  }

  isAsleep(f: Fighter): boolean { return !!f && f.dreamAsleep && !this.isDreaming(f); }

  /** True while the local player is asleep in the waking world. */
  isPlayerLocked(): boolean { return this.isAsleep(this.api.player); }

  /**
   * Everything the Dream bot needs to play its kit's synergies, computed owner-side. Reads only —
   * nothing here changes state, so ArenaScene can build it every frame.
   */
  npcAiInfo(): DreamNpcInfo | undefined {
    if (!this.isDream('npc')) return undefined;
    const realm = this.realms.npc;
    const t = realm?.victim ?? this.targetsOf('npc')[0];
    const drowsy = t?.dreamDrowsy ?? 0;
    return {
      inDream: !!realm,
      targetDrowsy: drowsy,
      targetAsleep: !!t?.dreamAsleep,
      canFire: this.canFire('npc'),
      delveReady: !!this.delveCandidate('npc'),
      shouldSurface: !!realm && drowsy < 22,
      nightmareReady: !!this.nightmareTarget('npc'),
      pillowFresh: !realm && drowsy <= PILLOW_FRESH_AT,
      leechOut: this.leeches.some((l) => l.owner === 'npc'),
    };
  }

  /**
   * Where the bot should be walking for one of its own plays: up to a sleeper to step into its
   * dream, or over to a leech to pull it. Undefined when the fight should steer.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    if (!this.isDream('npc')) return undefined;
    const npc = this.api.npc;
    if (!this.alive(npc)) return undefined;
    const realm = this.realms.npc;
    if (realm) {
      const l = this.leeches.find((x) => x.owner === 'npc' && x.state !== 'flying');
      return l ? { x: l.x, y: l.y } : undefined;
    }
    const t = this.targetsOf('npc')[0];
    // Only once there is enough sleep left to make the trip worth it.
    if (t?.dreamAsleep && t.dreamDrowsy >= 45
      && Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y) > DELVE_RANGE * 0.7) {
      return { x: t.x, y: t.y };
    }
    return undefined;
  }

  /**
   * Ability tray fill. Click reads the magazine (or the reload), so it is never a cooldown
   * nobody is waiting on.
   */
  getBarRatio(abilityId: string, time: number): number {
    void time;
    if (abilityId === 'dream-sandmen') {
      const g = this.guns.player;
      if (this.realms.player) {
        if (this.now < g.pistolReloadUntil) return 1 - (g.pistolReloadUntil - this.now) / (PISTOL_RELOAD_MS * this.api.player.dreamCooldownMult);
        return g.pistolMag / PISTOL_MAG;
      }
      if (this.now < g.reloadUntil) return 1 - (g.reloadUntil - this.now) / SANDMEN_RELOAD_MS;
      return g.mag / SANDMEN_MAG;
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
