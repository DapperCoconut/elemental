import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  DRM, DreamAvatar, DreamColorFn, DreamFx, DreamPortal, OasisView, TrancePendulum,
  dreamOrb, dreamcatcherShape, ekgTrace, sleepMeter, sleepyZ, star,
} from './DreamVisuals';

type Owner = 'player' | 'npc';

// ── Sleepiness ───────────────────────────────────────────────────────────────
const SLEEP_MAX = 100;
/** Drowsiness bleeds off whenever nobody is swinging a pendulum at you. */
const SLEEP_DECAY_PER_SEC = 6;
const SLEEP_MS = 8000;

// ── The cursor passive ───────────────────────────────────────────────────────
const CURSOR_DAMAGE = 5;
/** A body's worth of hitbox. The cursor has to leave this and come back to score again. */
const CURSOR_HITBOX = 24;

// ── Rest (the second passive) ────────────────────────────────────────────────
/**
 * The pendulum's opposite number: standing perfectly still hands health back. Trance wants
 * you pacing and Rest wants you planted, so the element is always asking which one you need.
 */
const REST_HEAL = 5;
const REST_TICK_MS = 1000;
/** Body speed (px/s) below which a fighter counts as standing still. */
const REST_STILL_SPEED = 6;

// ── Trance (Click) ───────────────────────────────────────────────────────────
const PEND_LEN = 68;
const PEND_G = 1600;
const PEND_DAMP = 0.7;
/** Anchor acceleration is a second derivative of a position sampled once a frame — cap it. */
const PEND_MAX_DRIVE = 5200;
/** Tip speed (px/s) at which the drowsy field is at full strength. */
const TRANCE_MAX_TIP = 380;
const TRANCE_R_MIN = 92;
const TRANCE_R_MAX = 176;
/** Sleepiness per second at a full-strength swing. */
const TRANCE_GAIN = 34;
/** Below this the pendulum is just hanging there, and hanging is not hypnotism. */
const TRANCE_MIN_SWING = 0.06;
/**
 * The AI cannot feather WASD to pump a pendulum, so its swing is topped up directly. Small
 * enough that an NPC standing still still takes a couple of seconds to get going.
 */
const NPC_PUMP = 2.4;

// ── Pillow Fight (E) ─────────────────────────────────────────────────────────
const PILLOW_DAMAGE = 10;
/** Added on top at full sleepiness — a pillow to a sleeping head is the whole element. */
const PILLOW_SLEEP_BONUS = 60;
const PILLOW_REACH = 84;
const PILLOW_ARC = Math.PI / 2.1;
const PILLOW_SLEEP_MULT = 1.25;

// ── Dreamcatcher (R) ─────────────────────────────────────────────────────────
const CATCHER_MS = 12000;
const CATCHER_MAX = 3;
const CATCHER_RADIUS = 22;
const DRAIN_MS = 2000;
const DREAM_CAP = 5;
const DREAM_HEAL = 10;
/** Every dream torn out of a sleeper pushes all of their cooldowns back by this much. */
const DREAM_COOLDOWN_PENALTY = 2000;
const PICKUP_RADIUS = 32;

// ── Nightmare (F) ────────────────────────────────────────────────────────────
const NIGHTMARE_MS = 10000;
const NIGHTMARE_TICK_MS = 1000;
const NIGHTMARE_TICK_DAMAGE = 5;
/** The jolt: whatever wakes a nightmare-ridden sleeper lands twice. */
const NIGHTMARE_WAKE_MULT = 2;

// ── Oasis (Q) ────────────────────────────────────────────────────────────────
const OASIS_MS = 15000;
const OASIS_HEAL = 10;
const OASIS_HEAL_TICK_MS = 1000;
const PORTAL_LIFE_MS = 12000;
const PORTAL_RX = 46;
const PORTAL_RY = 58;
/** How far behind the caster the doorway opens. */
const PORTAL_BACK = 78;
const PORTAL_ENTER_R = 40;
/** How often the waterfall bed is retriggered. Shorter than the sound, so it never gaps. */
const FALLS_LOOP_MS = 1500;

const ARENA_PAD = 32;

// ── World objects ────────────────────────────────────────────────────────────

interface Dreamcatcher {
  owner: Owner;
  x: number; y: number;
  bornAt: number;
  until: number;
  /** Dreams currently held, waiting to be walked over. */
  dreams: number;
  drainAccum: number;
  /** Who it is currently pulling from, for the thread — recomputed each frame. */
  draining: Fighter | null;
}

/**
 * Everything Dream is doing *to* one fighter. Held per-victim rather than per-caster because
 * sleepiness, sleep and a nightmare all belong to the body they are happening in — in a
 * Dream-versus-Dream match both sides write into the same three records.
 */
interface SleepState {
  drowsy: number;
  /** `scene.time.now` this fighter wakes up on its own. 0 = awake. */
  asleepUntil: number;
  by: Owner;
  nightmareUntil: number;
  nightmareAccum: number;
  nightmareBy: Owner;
  /**
   * Last seen `rawDamageTaken`. Waking is "you were damaged", and this is how that is
   * detected without claiming the fighter's damage callback, which ArenaScene already owns.
   */
  lastRaw: number;
}

function makeSleep(): SleepState {
  return {
    drowsy: 0, asleepUntil: 0, by: 'player',
    nightmareUntil: 0, nightmareAccum: 0, nightmareBy: 'player',
    lastRaw: 0,
  };
}

// ── Per-side state ───────────────────────────────────────────────────────────

interface Side {
  owner: Owner;

  // ── Trance ──
  tranceOn: boolean;
  /** Radians from straight down, positive toward +x. */
  theta: number;
  omega: number;
  prevX: number; prevY: number;
  prevVx: number; prevVy: number;
  smoothAx: number; smoothAy: number;
  pendulum: TrancePendulum | null;

  // ── Oasis ──
  portalX: number; portalY: number;
  /** `scene.time.now` the unentered doorway closes on its own. 0 = no portal standing. */
  portalUntil: number;
  portalOpen: number;
  portal: DreamPortal | null;
  /** `scene.time.now` the rest ends. 0 = not inside. */
  oasisUntil: number;
  oasisHealAccum: number;
  /** HP the place has actually given back this stay. Gates the "healed up" early exit. */
  oasisHealed: number;
  /** Eased 0→1 so the oasis opens and collapses instead of blinking. */
  oasisGrow: number;
  oasis: OasisView | null;
  /** What the fighter's own flags were before the oasis took them, to hand back on exit. */
  savedInvincible: boolean;
  savedInvisible: boolean;

  // ── Rest passive ──
  /** Time held still since the last heal tick. Reset to 0 the moment the body moves. */
  restAccum: number;
  /** `scene.time.now` this stillness began. 0 = moving, which is also the HUD's tell. */
  restSince: number;

  // ── Cursor passive ──
  /** Who the cursor is currently resting on — a hit scores on entry, never while inside. */
  cursorInside: Set<Fighter>;
  /** The NPC's stand-in for a mouse: a drifting eye that pokes at whatever it is chasing. */
  ghostX: number; ghostY: number;
  ghostVx: number; ghostVy: number;

  /** NPC pacing, so the AI does not re-place a dreamcatcher the instant one expires. */
  nextCatcherAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    tranceOn: false,
    theta: 0.0001, omega: 0,
    prevX: 0, prevY: 0, prevVx: 0, prevVy: 0,
    smoothAx: 0, smoothAy: 0,
    pendulum: null,
    portalX: 0, portalY: 0, portalUntil: 0, portalOpen: 0, portal: null,
    oasisUntil: 0, oasisHealAccum: 0, oasisHealed: 0, oasisGrow: 0, oasis: null,
    savedInvincible: false, savedInvisible: false,
    restAccum: 0, restSince: 0,
    cursorInside: new Set(),
    ghostX: 0, ghostY: 0, ghostVx: 0, ghostVy: 0,
    nextCatcherAt: 0,
  };
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
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Dream visual colour through that side's equipped skin. */
  dreamColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── DreamKit ─────────────────────────────────────────────────────────────────

export class DreamKit {
  private api: DreamArenaApi;

  // ── Visuals ──
  private readonly pcol: DreamColorFn;
  private readonly ncol: DreamColorFn;
  private readonly pfx: DreamFx;
  private readonly nfx: DreamFx;
  private playerAvatar: DreamAvatar | null = null;
  private npcAvatar: DreamAvatar | null = null;
  /** Under the fighters: dreamcatchers on the floor. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over them: dream threads and the NPC's phantom cursor. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sleep meters and heart traces, over everything in the world. */
  private overheadGfx: Phaser.GameObjects.Graphics | null = null;
  /** The NPC's dream pocket — its private version of the oasis. */
  private sceneGfx: Phaser.GameObjects.Graphics | null = null;
  /** The cosmic cursor. Above the oasis, because it never stops being yours. */
  private cursorGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private cursorHidden = false;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private sleep = new Map<Fighter, SleepState>();
  private catchers: Dreamcatcher[] = [];
  /**
   * Drowsiness handed out this frame, so a target being swung at gains instead of decaying.
   * Rebuilt every frame — a target that drops out of every field simply stops appearing.
   */
  private gained = new Map<Fighter, number>();
  private lastAimX = 0;
  private lastAimY = 0;
  /** Time since the waterfall bed was last retriggered, while the player is resting. */
  private fallsAccum = 0;
  /** Latched swing strength per side, for the HUD and the avatar. */
  private swing: Record<Owner, number> = { player: 0, npc: 0 };

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
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DreamFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DreamColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isDream(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'dream' : this.api.npcElementId === 'dream';
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

  private state(f: Fighter): SleepState {
    let st = this.sleep.get(f);
    if (!st) {
      st = makeSleep();
      // Seed from the fighter's running tally, or every existing point of damage would
      // read as one enormous hit on the first frame it is tracked.
      st.lastRaw = f.rawDamageTaken;
      this.sleep.set(f, st);
    }
    return st;
  }

  private avatar(owner: Owner): DreamAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The pendulum hangs off the caster's hands, not their feet. */
  private anchorOf(f: Fighter): { x: number; y: number } {
    return { x: f.x, y: f.y + 4 };
  }

  private releaseCursor(): void {
    if (!this.cursorHidden) return;
    this.cursorHidden = false;
    this.api.scene.input.setDefaultCursor('default');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      s.pendulum?.destroy();
      s.portal?.destroy();
      s.oasis?.destroy();
    }
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.sleep.clear();
    this.gained.clear();
    this.catchers = [];
    this.swing = { player: 0, npc: 0 };
    this.vizT = 0;
    this.fallsAccum = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.overheadGfx?.destroy(); this.overheadGfx = null;
    this.sceneGfx?.destroy(); this.sceneGfx = null;
    this.cursorGfx?.destroy(); this.cursorGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.releaseCursor();

    // Anything the oasis was holding on a fighter has to be handed back, or a Dream match
    // would leave the next element permanently invincible.
    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.isInvincible = false;
      f.forceInvisible = false;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'dream') return;
    // Tracked before every early-out: the cursor is a passive, and a passive that switches
    // off because you are busy is not a passive.
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    const s = this.sides.player;
    const p = this.api.player;
    // Asleep or resting — either way the controls are not yours.
    if (s.oasisUntil > time) return;
    if (this.isAsleep(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('dream-trance', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('dream-pillow-fight', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('dream-dreamcatcher', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dream-nightmare', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('dream-oasis', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Trance. A toggle: the pendulum stays up until it is put away. */
  doTrance(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.tranceOn) {
      s.tranceOn = false;
      s.pendulum?.destroy();
      s.pendulum = null;
      this.api.showFloatingText(f.x, f.y - 40, 'Pendulum stilled', '#9fb8ff');
      return;
    }
    s.tranceOn = true;
    s.theta = 0.55;
    s.omega = 0;
    const a = this.anchorOf(f);
    s.prevX = f.x; s.prevY = f.y;
    s.prevVx = 0; s.prevVy = 0;
    s.smoothAx = 0; s.smoothAy = 0;
    s.pendulum = new TrancePendulum(this.api.scene, this.col(owner));
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(a.x, a.y, 12, TRANCE_R_MIN, DRM.violet, 480, 5, 6);
    this.fx(owner).stardust(a.x, a.y, 10, 30, 800);
    this.api.showFloatingText(f.x, f.y - 42, '🌀 TRANCE', '#8b5cf6');
  }

  /** E — Pillow Fight. A wedge in front of you that hits like a truck on a sleeper. */
  doPillowFight(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);

    this.avatar(owner)?.play('sweep', angle);
    fx.pillowSwing(f.x, f.y, angle, PILLOW_REACH);

    let connected = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > PILLOW_REACH + 20) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - angle));
      if (off > PILLOW_ARC / 2) continue;
      connected = true;

      const st = this.state(t);
      // A sleeping target counts as fully drowsy — they are, by definition, all the way there.
      const ratio = st.asleepUntil > this.now ? 1 : Phaser.Math.Clamp(st.drowsy / SLEEP_MAX, 0, 1);
      const dmg = Math.round(PILLOW_DAMAGE + PILLOW_SLEEP_BONUS * ratio);
      t.takeDamage(dmg);
      // Resolved immediately rather than on the next frame's sweep, so the wake-up jolt is
      // part of this hit and the sleepiness multiplier below sees the post-wake number.
      this.syncDamage(t);

      st.drowsy = Math.min(SLEEP_MAX, st.drowsy * PILLOW_SLEEP_MULT);
      st.by = owner;
      this.checkSleepThreshold(t, st, owner);

      this.api.spawnHitFlash(t.x, t.y, DRM.pillow);
      fx.feathers(t.x, t.y, 10, angle);
      if (ratio > 0.35) {
        this.api.showFloatingText(t.x, t.y - 46, `🛏️ ${dmg} — SWEET DREAMS`, '#bfd0ff');
      }
    }

    if (!connected) fx.feathers(f.x + Math.cos(angle) * 50, f.y + Math.sin(angle) * 50, 4, angle);
  }

  /** R — Dreamcatcher. Three on the floor at once; the oldest is cut loose for a fourth. */
  doDreamcatcher(owner: Owner): void {
    const f = this.fighter(owner);
    const mine = this.catchers.filter((c) => c.owner === owner);
    if (mine.length >= CATCHER_MAX) {
      // Fade the oldest rather than deleting it, so it sinks instead of blinking away.
      const oldest = mine.reduce((a, b) => (a.bornAt <= b.bornAt ? a : b));
      oldest.until = Math.min(oldest.until, this.now + 140);
    }

    const x = Phaser.Math.Clamp(f.x, this.left + 20, this.right - 20);
    const y = Phaser.Math.Clamp(f.y + 10, this.top + 20, this.bottom - 20);
    this.catchers.push({
      owner, x, y,
      bornAt: this.now,
      until: this.now + CATCHER_MS,
      dreams: 0,
      drainAccum: 0,
      draining: null,
    });

    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(x, y, 8, CATCHER_RADIUS * 2.2, DRM.web, 460, 4, 5);
    this.fx(owner).stardust(x, y, 8, 26, 700, 5);
    this.api.showFloatingText(f.x, f.y - 42, '🪶 DREAMCATCHER', '#e8ecff');
  }

  /** F — Nightmare. Ten seconds of something only they can see. */
  doNightmare(owner: Owner): void {
    const f = this.fighter(owner);
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;
    if (!victim || !victim.active || victim.hp <= 0) {
      this.api.showFloatingText(f.x, f.y - 40, 'Nobody to haunt', '#6b6b88');
      return;
    }

    const st = this.state(victim);
    st.nightmareUntil = this.now + NIGHTMARE_MS;
    st.nightmareAccum = 0;
    st.nightmareBy = owner;

    this.avatar(owner)?.play('punch', Math.atan2(victim.y - f.y, victim.x - f.x));
    const fx = this.fx(owner);
    fx.ring(victim.x, victim.y, 10, 60, DRM.dread, 520, 5, 7);
    fx.stardust(victim.x, victim.y, 9, 30, 760, 7);
    this.api.showFloatingText(victim.x, victim.y - 48, '💔 NIGHTMARE', '#ff3b6b');
  }

  /** Q — Oasis. Opens the doorway; walking into it is what actually takes you through. */
  doOasis(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // Behind you, relative to where you are pointing — the whole idea is to break away.
    const aim = owner === 'player'
      ? Math.atan2(this.lastAimY - f.y, this.lastAimX - f.x)
      : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
    const bx = Phaser.Math.Clamp(f.x - Math.cos(aim) * PORTAL_BACK, this.left + PORTAL_RX, this.right - PORTAL_RX);
    const by = Phaser.Math.Clamp(f.y - Math.sin(aim) * PORTAL_BACK, this.top + PORTAL_RY, this.bottom - PORTAL_RY);

    s.portal?.destroy();
    s.portal = new DreamPortal(this.api.scene, this.col(owner));
    s.portalX = bx;
    s.portalY = by;
    s.portalUntil = this.now + PORTAL_LIFE_MS;
    s.portalOpen = 0;

    this.avatar(owner)?.play('raise');
    this.fx(owner).tear(bx, by, PORTAL_RX, PORTAL_RY, false);
    this.api.showFloatingText(bx, by - PORTAL_RY - 14, '🌌 OASIS — step through', '#8b5cf6');
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'dream';
    const npcIs = this.api.npcElementId === 'dream';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    this.gained.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.isDream(owner)) this.updateSide(owner, time, delta);
    }

    this.updateCatchers(time, delta);
    this.updateSleepers(time, delta);
    this.updateAvatars(delta, playerIs, npcIs);
    this.paintWorld(delta);
    this.paintOverhead(playerIs);
    this.paintCursor(playerIs, delta);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.sceneGfx) this.sceneGfx = scene.add.graphics().setDepth(14);
    if (!this.overheadGfx) this.overheadGfx = scene.add.graphics().setDepth(16);
    if (!this.cursorGfx) this.cursorGfx = scene.add.graphics().setDepth(30);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /** Pendulum physics, the drowsy field, the portal and the oasis, for one side. */
  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const dt = Math.min(0.05, delta / 1000);
    if (dt <= 0) return;

    this.updatePendulum(s, f, owner, dt);
    this.updateRest(s, f, owner, delta);
    this.updateOasis(s, f, owner, time, delta);
  }

  /**
   * Rest: 5 HP a second for standing perfectly still, paid one whole second at a time so a
   * step-stop-step shuffle never collects. Not while asleep (that is a debuff, not a rest)
   * and not in the oasis, which is already handing out twice as much.
   */
  private updateRest(s: Side, f: Fighter, owner: Owner, delta: number): void {
    const body = this.body(f);
    const speed = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    if (speed > REST_STILL_SPEED || f.hp <= 0 || s.oasisUntil > this.now || this.isAsleep(f)) {
      s.restAccum = 0;
      s.restSince = 0;
      return;
    }

    if (s.restSince === 0) s.restSince = this.now;
    s.restAccum += delta;
    while (s.restAccum >= REST_TICK_MS) {
      s.restAccum -= REST_TICK_MS;
      const before = f.hp;
      f.heal(REST_HEAL);
      const got = Math.round(f.hp - before);
      if (got > 0) {
        this.api.showFloatingText(f.x, f.y - 30, `💤 +${got}`, '#3fc7d6');
        this.fx(owner).stardust(f.x, f.y - 4, 4, 20, 620, 6);
      }
    }
  }

  /**
   * A driven pendulum with its pivot on the caster.
   *
   * θ is measured from straight down, positive toward +x, so with the pivot accelerating at
   * (Ax, Ay) the equation of motion is θ'' = −[sinθ·(g − Ay) + Ax·cosθ]/L − damping·θ'.
   * Walking left and right at the right cadence pumps it; standing still lets it die.
   */
  private updatePendulum(s: Side, f: Fighter, owner: Owner, dt: number): void {
    if (!s.tranceOn) {
      this.swing[owner] = 0;
      return;
    }

    const vx = (f.x - s.prevX) / dt;
    const vy = (f.y - s.prevY) / dt;
    const rawAx = Phaser.Math.Clamp((vx - s.prevVx) / dt, -PEND_MAX_DRIVE, PEND_MAX_DRIVE);
    const rawAy = Phaser.Math.Clamp((vy - s.prevVy) / dt, -PEND_MAX_DRIVE, PEND_MAX_DRIVE);
    s.prevX = f.x; s.prevY = f.y;
    s.prevVx = vx; s.prevVy = vy;
    // Position sampled once a frame differentiated twice is noisy; smooth before driving.
    s.smoothAx += (rawAx - s.smoothAx) * 0.3;
    s.smoothAy += (rawAy - s.smoothAy) * 0.3;

    const acc = -(Math.sin(s.theta) * (PEND_G - s.smoothAy) + s.smoothAx * Math.cos(s.theta)) / PEND_LEN
      - PEND_DAMP * s.omega;
    s.omega += acc * dt;
    s.theta = Phaser.Math.Angle.Wrap(s.theta + s.omega * dt);

    // The AI has no hands on a keyboard, so it is allowed to swing the thing deliberately.
    if (owner === 'npc' && Math.abs(s.omega) * PEND_LEN < TRANCE_MAX_TIP) {
      s.omega += Math.sign(s.omega || 1) * NPC_PUMP * dt;
    }

    const tip = Math.abs(s.omega) * PEND_LEN;
    const heat = Phaser.Math.Clamp(tip / TRANCE_MAX_TIP, 0, 1);
    this.swing[owner] = heat;

    if (heat < TRANCE_MIN_SWING) return;
    const radius = TRANCE_R_MIN + (TRANCE_R_MAX - TRANCE_R_MIN) * heat;
    // Faster than linear, so a lazy swing is a nuisance and a hard one is a threat.
    const gain = TRANCE_GAIN * Math.pow(heat, 1.25) * dt;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > radius) continue;
      this.gained.set(t, (this.gained.get(t) ?? 0) + gain);
      this.state(t).by = owner;
    }
  }

  /** The standing doorway, walking into it, and the rest on the other side. */
  private updateOasis(s: Side, f: Fighter, owner: Owner, time: number, delta: number): void {
    // ── Inside ──
    if (s.oasisUntil > time) {
      this.body(f).setVelocity(0, 0);
      f.setPosition(s.portalX, s.portalY);
      f.isInvincible = true;
      f.forceInvisible = true;
      s.oasisGrow = Math.min(1, s.oasisGrow + delta / 420);

      // The falls, on a loop. Only for the side that is actually looking at the meadow.
      if (owner === 'player') {
        this.fallsAccum += delta;
        if (this.fallsAccum >= FALLS_LOOP_MS) {
          this.fallsAccum = 0;
          Sfx.play('meadow-falls');
        }
      }

      s.oasisHealAccum += delta;
      while (s.oasisHealAccum >= OASIS_HEAL_TICK_MS) {
        s.oasisHealAccum -= OASIS_HEAL_TICK_MS;
        const before = f.hp;
        f.heal(OASIS_HEAL);
        const got = Math.round(f.hp - before);
        if (got > 0) {
          s.oasisHealed += got;
          this.api.showFloatingText(f.x, f.y - 30, `+${got}`, '#3fc7d6');
        }
      }
      // Topped up ends it early — but only once the place has actually given something back.
      // Stepping through on full HP is an escape, not a wasted ultimate, so it does not throw
      // you straight out again. Clotted HP holds part of the pool, so "full" is hp + clot.
      if (s.oasisHealed > 0 && f.hp + f.clottedHp >= f.maxHp) this.exitOasis(s, f, owner, 'RESTED');
      return;
    }
    if (s.oasisUntil !== 0) this.exitOasis(s, f, owner, 'AWAKE');

    s.oasisGrow = Math.max(0, s.oasisGrow - delta / 380);
    if (s.oasisGrow <= 0.02 && s.oasis) { s.oasis.destroy(); s.oasis = null; }

    // ── The doorway, waiting ──
    if (s.portalUntil <= 0) return;
    if (time >= s.portalUntil) {
      s.portalOpen = Math.max(0, s.portalOpen - delta / 320);
      if (s.portalOpen <= 0.02) {
        s.portal?.destroy();
        s.portal = null;
        s.portalUntil = 0;
      }
      return;
    }
    s.portalOpen = Math.min(1, s.portalOpen + delta / 300);
    if (s.portalOpen > 0.6
      && Phaser.Math.Distance.Between(f.x, f.y, s.portalX, s.portalY) < PORTAL_ENTER_R) {
      this.enterOasis(s, f, owner);
    }
  }

  private enterOasis(s: Side, f: Fighter, owner: Owner): void {
    s.oasisUntil = this.now + OASIS_MS;
    s.oasisHealAccum = 0;
    s.oasisHealed = 0;
    s.savedInvincible = f.isInvincible;
    s.savedInvisible = f.forceInvisible;
    // The door shuts behind you — nothing else was ever getting through it anyway.
    s.portalUntil = 0;
    s.portalOpen = 0;
    s.portal?.destroy();
    s.portal = null;
    f.setPosition(s.portalX, s.portalY);
    this.body(f).reset(s.portalX, s.portalY);

    if (owner === 'player') {
      s.oasis?.destroy();
      s.oasis = new OasisView(this.api.scene, this.pcol, this.api.width, this.api.height);
      // Due on the first frame on the other side, so the falls are already running.
      this.fallsAccum = FALLS_LOOP_MS;
    }
    this.fx(owner).tear(s.portalX, s.portalY, PORTAL_RX, PORTAL_RY, true);
    this.api.showFloatingText(s.portalX, s.portalY - 40, '🏞️ OASIS', '#74d18c');
  }

  private exitOasis(s: Side, f: Fighter, owner: Owner, why: string): void {
    s.oasisUntil = 0;
    // Hand the flags back as they were found, so a Stealthy mutation survives the trip.
    f.isInvincible = s.savedInvincible;
    f.forceInvisible = s.savedInvisible;
    this.fx(owner).tear(f.x, f.y, PORTAL_RX, PORTAL_RY, false);
    this.fx(owner).stardust(f.x, f.y, 14, 40, 900, 7);
    this.api.showFloatingText(f.x, f.y - 44, `🌅 ${why}`, '#ffd98a');
  }

  /** Dreamcatchers: draining a sleeper, filling up, and being walked over. */
  private updateCatchers(time: number, delta: number): void {
    for (const c of this.catchers) {
      c.draining = null;

      // Any sleeper this side put under is fair game, wherever they are lying.
      if (c.dreams < DREAM_CAP) {
        const sleeper = this.targetsOf(c.owner).find((t) => this.isAsleep(t));
        if (sleeper) {
          c.draining = sleeper;
          c.drainAccum += delta;
          if (c.drainAccum >= DRAIN_MS) {
            c.drainAccum -= DRAIN_MS;
            c.dreams++;
            // Every dream torn out costs them time on everything they know how to do.
            for (const ab of sleeper.element.abilities) {
              sleeper.reduceCooldown(ab.id, -DREAM_COOLDOWN_PENALTY);
            }
            this.fx(c.owner).stardust(sleeper.x, sleeper.y, 5, 20, 620, 7);
            this.api.showFloatingText(sleeper.x, sleeper.y - 52, '💤 DREAM TAKEN  +2s CD', '#8b5cf6');
          }
        } else {
          c.drainAccum = 0;
        }
      }

      // Walking over it collects everything it is holding.
      const holder = this.fighter(c.owner);
      if (c.dreams > 0 && holder && holder.active && holder.hp > 0
        && Phaser.Math.Distance.Between(holder.x, holder.y, c.x, c.y) < PICKUP_RADIUS) {
        const healed = c.dreams * DREAM_HEAL;
        c.dreams = 0;
        holder.heal(healed);
        this.fx(c.owner).ring(c.x, c.y, 6, 46, DRM.water, 420, 4, 6);
        this.fx(c.owner).stardust(holder.x, holder.y, 8, 24, 700, 7);
        this.api.showFloatingText(holder.x, holder.y - 44, `🌙 +${healed} HP`, '#3fc7d6');
      }
    }

    const dead = this.catchers.filter((c) => time >= c.until);
    for (const c of dead) this.fx(c.owner).stardust(c.x, c.y, 6, 22, 620, 5);
    if (dead.length) this.catchers = this.catchers.filter((c) => time < c.until);
  }

  /**
   * Everything that happens *to* a body: waking, nightmares ticking, sleep expiring and
   * drowsiness rising or bleeding away. Runs over every fighter Dream has ever touched, so
   * an effect still resolves after the caster has stopped paying attention to it.
   */
  private updateSleepers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const [f, st] of [...this.sleep]) {
      if (!f.active || f.hp <= 0) { this.sleep.delete(f); continue; }

      // ── Woken by damage? (before the nightmare tick, so a real hit is never swallowed) ──
      this.syncDamage(f);

      // ── Nightmare ──
      if (st.nightmareUntil > time) {
        st.nightmareAccum += delta;
        while (st.nightmareAccum >= NIGHTMARE_TICK_MS) {
          st.nightmareAccum -= NIGHTMARE_TICK_MS;
          f.takeDamage(NIGHTMARE_TICK_DAMAGE);
          // A nightmare is not an alarm clock: its own damage must not wake its host, so the
          // tally is re-synced right here rather than left for the next frame to notice.
          st.lastRaw = f.rawDamageTaken;
        }
      } else if (st.nightmareUntil !== 0) {
        st.nightmareUntil = 0;
        st.nightmareAccum = 0;
      }

      // ── Sleep upkeep ──
      if (st.asleepUntil > time) {
        this.body(f).setVelocity(0, 0);
        f.earthStunnedUntil = Math.max(f.earthStunnedUntil, time + 140);
        f.applyDisarm(160);
        continue;
      }
      if (st.asleepUntil !== 0) this.wake(f, st, 0, 'natural');

      // ── Drowsiness ──
      const gain = this.gained.get(f) ?? 0;
      if (gain > 0) {
        st.drowsy = Math.min(SLEEP_MAX, st.drowsy + gain);
        this.checkSleepThreshold(f, st, st.by);
      } else if (st.drowsy > 0) {
        st.drowsy = Math.max(0, st.drowsy - SLEEP_DECAY_PER_SEC * dt);
      }
    }
  }

  /**
   * Compare a fighter's damage tally against the last one we saw. Any increase while they
   * are asleep is what wakes them — and, if they were dreaming badly, what hits them twice.
   */
  private syncDamage(f: Fighter): void {
    const st = this.state(f);
    const delta = f.rawDamageTaken - st.lastRaw;
    st.lastRaw = f.rawDamageTaken;
    if (delta <= 0.5) return;
    if (st.asleepUntil <= this.now) return;
    this.wake(f, st, delta, 'damage');
  }

  private wake(f: Fighter, st: SleepState, jolt: number, why: 'damage' | 'natural'): void {
    const by = st.by;
    st.asleepUntil = 0;
    st.drowsy = 0;
    // Only lift the stun if it is the one sleep was renewing — something else may have a
    // longer hold on this body, and waking up is not a reason to break it.
    if (f.earthStunnedUntil <= this.now + 200) f.earthStunnedUntil = this.now;

    const hadNightmare = st.nightmareUntil > this.now;
    if (hadNightmare) {
      st.nightmareUntil = 0;
      st.nightmareAccum = 0;
    }

    if (why === 'damage' && hadNightmare && jolt > 0.5) {
      // The jolt: the hit that tore them out of it lands a second time. Applied as its own
      // strike rather than by pre-multiplying, because the first one has already resolved.
      const extra = Math.round(jolt * (NIGHTMARE_WAKE_MULT - 1));
      f.takeDamage(extra);
      st.lastRaw = f.rawDamageTaken;
      this.fx(by).ring(f.x, f.y, 8, 56, DRM.dread, 460, 5, 8);
      this.api.spawnHitFlash(f.x, f.y, DRM.dread);
      this.api.showFloatingText(f.x, f.y - 54, `💔 NIGHT TERROR ×${NIGHTMARE_WAKE_MULT}`, '#ff3b6b');
    }

    this.fx(by).stardust(f.x, f.y, 7, 26, 640, 7);
    this.api.showFloatingText(f.x, f.y - 40, why === 'damage' ? '⏰ AWAKE!' : '🥱 Woke up', '#d8e2ff');
  }

  /** Tips a fighter over into sleep once the meter is full. */
  private checkSleepThreshold(f: Fighter, st: SleepState, by: Owner): void {
    if (st.asleepUntil > this.now) return;
    if (st.drowsy < SLEEP_MAX) return;
    if (f.unstoppable) {
      // Nothing that ignores stuns is going to lie down for a pendulum either.
      st.drowsy = SLEEP_MAX * 0.99;
      this.api.showFloatingText(f.x, f.y - 44, '☕ WIDE AWAKE', '#ffd98a');
      return;
    }
    st.asleepUntil = this.now + SLEEP_MS;
    st.by = by;
    this.body(f).setVelocity(0, 0);
    this.fx(by).zzzPuff(f.x, f.y);
    this.fx(by).ring(f.x, f.y, 10, 70, DRM.purple, 620, 5, 7);
    this.api.showFloatingText(f.x, f.y - 48, '😴 ASLEEP', '#8b5cf6');
  }

  // ── Rig ────────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc, scene } = this.api;

    if (playerIs && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new DreamAvatar(scene, this.pcol);
      const s = this.sides.player;
      const ax = this.lastAimX || player.x + 1;
      const ay = this.lastAimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(ay - player.y, ax - player.x));
      this.playerAvatar.setSwing(this.swing.player);
      this.playerAvatar.setDrowsy(this.drowsyRatio(player));
      this.playerAvatar.setIntensity(s.tranceOn ? 1.2 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // Away in the oasis: the rig goes with the body, and neither is on this screen.
      const gone = s.oasisUntil > this.now;
      this.playerAvatar.update(delta, player.x, player.y, gone ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new DreamAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setSwing(this.swing.npc);
      this.npcAvatar.setDrowsy(this.drowsyRatio(npc));
      this.npcAvatar.setIntensity(s.tranceOn ? 1.2 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      const gone = s.oasisUntil > this.now;
      this.npcAvatar.update(delta, npc.x, npc.y, gone || npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  private drowsyRatio(f: Fighter): number {
    const st = this.sleep.get(f);
    if (!st) return 0;
    if (st.asleepUntil > this.now) return 1;
    return Phaser.Math.Clamp(st.drowsy / SLEEP_MAX, 0, 1);
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  private paintWorld(delta: number): void {
    const gg = this.groundGfx;
    const ag = this.airGfx;
    const sg = this.sceneGfx;
    if (!gg || !ag || !sg) return;
    gg.clear();
    ag.clear();
    sg.clear();
    const time = this.now;

    // ── Dreamcatchers ──
    for (const c of this.catchers) {
      const rise = Math.min(1, (time - c.bornAt) / 260);
      const fade = Math.min(1, (c.until - time) / 400);
      const a = Math.max(0, Math.min(rise, fade));
      if (a <= 0.02) continue;
      dreamcatcherShape(gg, this.col(c.owner), c.x, c.y, CATCHER_RADIUS * rise, this.vizT, c.dreams, a);
      // A full catcher pulses, because a full one is worth walking to.
      if (c.dreams >= DREAM_CAP) {
        gg.lineStyle(2, this.col(c.owner)(DRM.water), a * (0.35 + 0.3 * Math.sin(this.vizT * 6)));
        gg.strokeCircle(c.x, c.y, CATCHER_RADIUS + 8 + Math.sin(this.vizT * 6) * 3);
      }

      // ── The thread, while it is pulling ──
      const src = c.draining;
      if (!src || !src.active) continue;
      const tint = this.col(c.owner);
      ag.lineStyle(1.4, tint(DRM.pale), 0.55);
      ag.beginPath();
      ag.moveTo(src.x, src.y);
      const segs = 10;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const wob = Math.sin(this.vizT * 5 + f * 7) * 9 * Math.sin(f * Math.PI);
        const nx = -(c.y - src.y), ny = c.x - src.x;
        const len = Math.hypot(nx, ny) || 1;
        ag.lineTo(
          src.x + (c.x - src.x) * f + (nx / len) * wob,
          src.y + (c.y - src.y) * f + (ny / len) * wob,
        );
      }
      ag.strokePath();
      // A bead of dream travelling down the thread.
      const p = (this.vizT * 0.55) % 1;
      dreamOrb(ag, tint, src.x + (c.x - src.x) * p, src.y + (c.y - src.y) * p, 2.4, 0.9, this.vizT);
    }

    // ── The NPC's dream pocket ──
    // It gets no full-screen meadow (that is the local player's view of their own rest), so
    // its version is a bubble of somewhere else standing where the portal was: a scrap of
    // grass, a pool, and the falls coming down into it.
    const ns = this.sides.npc;
    if (ns.oasisGrow > 0.02) {
      const tint = this.ncol;
      const g = ns.oasisGrow;
      const r = 62 * g;
      const cx = ns.portalX, cy = ns.portalY;
      sg.fillStyle(tint(DRM.night), 0.85 * g);
      sg.fillCircle(cx, cy, r);
      sg.fillStyle(tint(DRM.grassDark), 0.85 * g);
      sg.fillEllipse(cx, cy + r * 0.62, r * 1.8, r * 0.75);
      sg.fillStyle(tint(DRM.waterDeep), 0.85 * g);
      sg.fillEllipse(cx, cy + r * 0.38, r * 1.15, r * 0.42);
      // The falls: a sheet with one bright strand running down it.
      sg.fillStyle(tint(DRM.water), 0.8 * g);
      sg.fillRect(cx - r * 0.16, cy - r * 0.62, r * 0.32, r * 1.02);
      const p = (this.vizT * 1.1) % 1;
      sg.fillStyle(tint(DRM.foam), 0.75 * g * (1 - p));
      sg.fillEllipse(cx, cy - r * 0.62 + r * p, r * 0.12, r * 0.3);
      sg.fillStyle(tint(DRM.foam), 0.7 * g);
      sg.fillEllipse(cx, cy - r * 0.6, r * 0.34, r * 0.1);
      sg.fillEllipse(cx, cy + r * 0.36, r * 0.5, r * 0.12);
      for (let i = 0; i < 7; i++) {
        const a = this.vizT * 0.7 + (i / 7) * Math.PI * 2;
        star(sg, tint, cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.55,
          2.4, 0.8 * g, DRM.star, a);
      }
      sg.lineStyle(3, tint(DRM.violet), 0.8 * g);
      sg.strokeCircle(cx, cy, r);
    }

    // ── Pendulums, portals and the rest halo ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (this.isDream(owner)) this.paintRest(gg, ag, s, f, owner);
      if (s.pendulum) {
        const hidden = !this.isDream(owner) || !f?.active || s.oasisUntil > time;
        if (hidden) {
          s.pendulum.update(delta, f?.x ?? 0, f?.y ?? 0, f?.x ?? 0, f?.y ?? 0, TRANCE_R_MIN, 0, 0);
        } else {
          const a = this.anchorOf(f);
          const heat = this.swing[owner];
          const radius = TRANCE_R_MIN + (TRANCE_R_MAX - TRANCE_R_MIN) * heat;
          s.pendulum.update(
            delta, a.x, a.y,
            a.x + Math.sin(s.theta) * PEND_LEN, a.y + Math.cos(s.theta) * PEND_LEN,
            radius, heat, 1,
          );
        }
      }
      if (s.portal) {
        const standing = f && Phaser.Math.Distance.Between(f.x, f.y, s.portalX, s.portalY) < PORTAL_ENTER_R * 1.6;
        s.portal.update(delta, s.portalX, s.portalY, PORTAL_RX, PORTAL_RY, s.portalOpen, standing ? 1 : 0);
      }
    }

    // ── The local oasis ──
    const ps = this.sides.player;
    if (ps.oasis) {
      const inside = ps.oasisUntil > time;
      const pulse = inside ? Math.max(0, 1 - (ps.oasisHealAccum / OASIS_HEAL_TICK_MS)) : 0;
      ps.oasis.update(delta, ps.oasisGrow, this.api.width * 0.38, this.bottom - 74, pulse);
    }
  }

  /**
   * Rest, seen from outside: a slow breathing ring around the feet and three zs climbing off
   * the head. Fades in over the first half second so a momentary pause does not flash it on.
   */
  private paintRest(
    gg: Phaser.GameObjects.Graphics,
    ag: Phaser.GameObjects.Graphics,
    s: Side, f: Fighter, owner: Owner,
  ): void {
    if (s.restSince === 0 || !f?.active || f.hp <= 0) return;
    const tint = this.col(owner);
    const a = Phaser.Math.Clamp((this.now - s.restSince) / 500, 0, 1);
    // Breathing, and timed off the heal accumulator so the ring swells into every tick.
    const breathe = 0.5 - 0.5 * Math.cos((s.restAccum / REST_TICK_MS) * Math.PI * 2);
    const rx = 40 + breathe * 9;
    const ry = 14 + breathe * 3.5;

    gg.fillStyle(tint(DRM.water), a * 0.1);
    gg.fillEllipse(f.x, f.y + 20, rx * 2, ry * 2);
    gg.lineStyle(2, tint(DRM.water), a * (0.28 + 0.34 * breathe));
    gg.strokeEllipse(f.x, f.y + 20, rx * 2, ry * 2);
    gg.lineStyle(1, tint(DRM.foam), a * 0.35 * (1 - breathe));
    gg.strokeEllipse(f.x, f.y + 20, rx * 2.5, ry * 2.5);
    for (let i = 0; i < 5; i++) {
      const ang = this.vizT * 0.5 + (i / 5) * Math.PI * 2;
      star(ag, tint, f.x + Math.cos(ang) * rx, f.y + 20 + Math.sin(ang) * ry,
        2, a * 0.55, DRM.star, ang);
    }

    // Three zs on a slow climb, each a third of a cycle behind the one above it.
    for (let i = 0; i < 3; i++) {
      const p = (this.vizT * 0.45 + i / 3) % 1;
      sleepyZ(ag, tint,
        f.x + 17 + Math.sin(p * 3.2 + i) * 7,
        f.y - 32 - p * 28,
        4.5 + p * 3.5,
        a * (1 - p) * 0.95,
        -0.18 + Math.sin(p * 2 + i) * 0.12);
    }
  }

  /** Sleep meters and heart traces, over the heads of everyone Dream is working on. */
  private paintOverhead(playerIsDream: boolean): void {
    const g = this.overheadGfx;
    if (!g) return;
    g.clear();
    const time = this.now;
    // The oasis covers the arena; the fight it is covering must not poke through it.
    if (playerIsDream && this.sides.player.oasisUntil > time) return;

    for (const [f, st] of this.sleep) {
      if (!f.active || f.hp <= 0) continue;
      const asleep = st.asleepUntil > time;
      const ratio = asleep ? 1 : st.drowsy / SLEEP_MAX;
      const tint = this.col(st.by);

      if (ratio > 0.005 || asleep) {
        sleepMeter(g, tint, f.x, f.y - 60, ratio, this.vizT, asleep, 1);
      }
      if (st.nightmareUntil > time) {
        // Sits above the sleep meter, so a fighter carrying both reads top-to-bottom.
        ekgTrace(g, this.col(st.nightmareBy), f.x, f.y - (ratio > 0.005 || asleep ? 78 : 62),
          46, 14, this.vizT * 0.55, 1);
      }
    }
  }

  /**
   * The cosmic cursor. Hides the system pointer and draws a piece of sky in its place —
   * and, on the frame it crosses into a body, takes five off them.
   */
  private paintCursor(playerIsDream: boolean, delta: number): void {
    const g = this.cursorGfx;
    if (!g) return;
    g.clear();

    if (!playerIsDream) {
      this.releaseCursor();
    } else if (!this.cursorHidden) {
      this.cursorHidden = true;
      this.api.scene.input.setDefaultCursor('none');
    }

    // ── The NPC's phantom, when the AI is the one dreaming ──
    if (this.api.npcElementId === 'dream') this.updateGhostCursor(delta);

    if (!playerIsDream) return;
    const s = this.sides.player;
    const busy = s.oasisUntil > this.now || this.isAsleep(this.api.player);
    const cx = this.lastAimX;
    const cy = this.lastAimY;
    let struck = false;
    if (!busy) struck = this.resolveCursorHits(s, cx, cy, 'player');
    else s.cursorInside.clear();

    // Nebula head with a starfield in it, and a pointer tail so it still reads as a cursor.
    const t = this.vizT;
    g.fillStyle(this.pcol(DRM.violet), 0.22);
    g.fillCircle(cx, cy, 15 + (struck ? 7 : 0));
    g.fillStyle(this.pcol(DRM.deep), 0.55);
    g.fillCircle(cx, cy, 9);
    g.fillStyle(this.pcol(DRM.blue), 0.5);
    g.fillCircle(cx - 2, cy - 2, 6);
    for (let i = 0; i < 4; i++) {
      const a = t * 1.6 + (i / 4) * Math.PI * 2;
      star(g, this.pcol, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 1.6, 0.85, DRM.white, a * 2);
    }
    // Arrowhead: a slim wedge pointing up-left out of the head, the way a pointer does.
    g.fillStyle(this.pcol(DRM.pale), 0.95);
    g.fillTriangle(cx, cy, cx + 1, cy + 17, cx + 11, cy + 11);
    g.fillStyle(this.pcol(DRM.purple), 0.9);
    g.fillTriangle(cx + 1, cy + 2, cx + 2, cy + 14, cx + 8.5, cy + 9.5);
    star(g, this.pcol, cx, cy, 6.5, 0.95, DRM.star, t * 2.2);

    // The ready-ring: solid while the cursor is clear of everything, hollow while it is
    // parked inside a body and can no longer score.
    const parked = s.cursorInside.size > 0;
    g.lineStyle(1.6, this.pcol(parked ? DRM.dread : DRM.pale), parked ? 0.75 : 0.5);
    g.strokeCircle(cx, cy, parked ? 13 + Math.sin(t * 9) : 11);
  }

  /**
   * The enter-and-leave rule, shared by the player's mouse and the NPC's phantom: a body is
   * only ever hit on the frame the pointer crosses into it, so damage comes from flicking on
   * and off a target rather than from resting on one.
   */
  private resolveCursorHits(s: Side, cx: number, cy: number, owner: Owner): boolean {
    const still = new Set<Fighter>();
    let struck = false;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(cx, cy, t.x, t.y) > CURSOR_HITBOX) continue;
      still.add(t);
      if (s.cursorInside.has(t)) continue;
      t.takeDamage(CURSOR_DAMAGE);
      this.syncDamage(t);
      struck = true;
      this.api.spawnHitFlash(t.x, t.y, DRM.pale);
      this.fx(owner).stardust(t.x, t.y, 4, 16, 420, 8);
      this.api.showFloatingText(t.x, t.y - 34, `✨ ${CURSOR_DAMAGE}`, '#d8e2ff');
    }
    s.cursorInside = still;
    return struck;
  }

  /**
   * The AI has no mouse, so its passive is a drifting eye that hunts the player and shoves
   * itself back out again the moment it lands — which is exactly the in-and-out motion the
   * passive rewards a human for doing by hand.
   */
  private updateGhostCursor(delta: number): void {
    const s = this.sides.npc;
    const npc = this.api.npc;
    const target = this.api.player;
    if (!npc?.active || !target?.active || target.hp <= 0) return;
    if (s.oasisUntil > this.now || this.isAsleep(npc)) { s.cursorInside.clear(); return; }
    if (s.ghostX === 0 && s.ghostY === 0) { s.ghostX = npc.x; s.ghostY = npc.y; }

    const dt = Math.min(0.05, delta / 1000);
    const d = Phaser.Math.Distance.Between(s.ghostX, s.ghostY, target.x, target.y);
    const ang = Math.atan2(target.y - s.ghostY, target.x - s.ghostX);
    // Attracted from outside, repelled from within: the eye orbits in and out on its own.
    const pull = d < CURSOR_HITBOX ? -1500 : 900;
    s.ghostVx += Math.cos(ang) * pull * dt;
    s.ghostVy += Math.sin(ang) * pull * dt;
    s.ghostVx *= 0.93;
    s.ghostVy *= 0.93;
    s.ghostX += s.ghostVx * dt;
    s.ghostY += s.ghostVy * dt;

    const struck = this.resolveCursorHits(s, s.ghostX, s.ghostY, 'npc');
    const ag = this.airGfx;
    if (!ag) return;
    const t = this.vizT;
    ag.fillStyle(this.ncol(DRM.violet), 0.24);
    ag.fillCircle(s.ghostX, s.ghostY, 14 + (struck ? 6 : 0));
    ag.fillStyle(this.ncol(DRM.deep), 0.7);
    ag.fillEllipse(s.ghostX, s.ghostY, 20, 12);
    ag.fillStyle(this.ncol(DRM.pale), 0.95);
    ag.fillCircle(s.ghostX, s.ghostY, 5);
    ag.fillStyle(this.ncol(DRM.night), 1);
    ag.fillCircle(s.ghostX + Math.cos(t * 2) * 1.6, s.ghostY + Math.sin(t * 2) * 1.6, 2.4);
    star(ag, this.ncol, s.ghostX, s.ghostY, 8, 0.6, DRM.star, t * 2);
  }

  /** The swing gauge and the dreams currently hanging in your catchers. */
  private paintHud(playerIsDream: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsDream) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const w = 190, h = 12;
    const x = this.left + 8;
    const y = this.top + 8;
    const heat = this.swing.player;

    g.fillStyle(0x05040f, 0.85);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    g.lineStyle(1.5, this.pcol(DRM.violet), 0.7);
    g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    g.fillStyle(this.pcol(DRM.deep), 0.9);
    g.fillRect(x, y, w, h);
    g.fillStyle(this.pcol(s.tranceOn ? DRM.purple : DRM.night), 1);
    g.fillRect(x, y, w * heat, h);
    g.fillStyle(this.pcol(DRM.pale), 0.5);
    g.fillRect(x, y, w * heat, h * 0.36);
    g.lineStyle(1, 0x05040f, 0.7);
    for (let i = 1; i < 4; i++) g.lineBetween(x + (w * i) / 4, y, x + (w * i) / 4, y + h);

    // Dream pips: one per dream sitting in a catcher, waiting to be walked over.
    const held = this.catchers
      .filter((c) => c.owner === 'player')
      .reduce((n, c) => n + c.dreams, 0);
    for (let i = 0; i < DREAM_CAP * CATCHER_MAX; i++) {
      const px = x + 5 + i * 12;
      const py = y + h + 16;
      if (i < held) dreamOrb(g, this.pcol, px, py, 2.6, 1, this.vizT + i);
      else {
        g.lineStyle(1, this.pcol(DRM.deep), 0.7);
        g.strokeCircle(px, py, 3);
      }
    }

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y + h + 24, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#d8e2ff',
        stroke: '#05040f',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      s.tranceOn
        ? `SWING ${Math.round(heat * 100)}%   DREAMS ${held}`
        : `PENDULUM DOWN   DREAMS ${held}`,
    );
    this.hudLabel.setColor(s.tranceOn && heat > 0.6 ? '#8b5cf6' : '#d8e2ff');
  }

  /** Everything Dream is doing to the local player, for the top-right tray. */
  private pushStatuses(playerIsDream: boolean): void {
    const time = this.now;
    const p = this.api.player;
    const s = this.sides.player;
    const st = this.sleep.get(p);

    this.api.setStatusIndicator('dream-trance', playerIsDream && s.tranceOn ? {
      name: 'Trance', emoji: '🌀', color: DRM.purple,
      description: 'A pendulum is swinging from your hand. Anything caught in its arc gets sleepy — the faster you swing it, the faster they go under.',
      count: Math.round(this.swing.player * 100), suffix: '%', priority: 110,
    } : null);

    this.api.setStatusIndicator('dream-rest', playerIsDream && s.restSince > 0 ? {
      name: 'Rest', emoji: '💤', color: DRM.water,
      description: `Standing still. ${REST_HEAL} HP every second you stay put — the first step you take ends it and starts the count again.`,
      count: REST_HEAL, suffix: '/s', priority: 108,
    } : null);

    this.api.setStatusIndicator('dream-oasis', playerIsDream && s.oasisUntil > time ? {
      name: 'Oasis', emoji: '🏞️', color: DRM.water,
      description: `Asleep in a meadow under a waterfall. ${OASIS_HEAL} HP a second, untouchable, and out of sight until you are healed or the place collapses.`,
      until: s.oasisUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('dream-asleep', st && st.asleepUntil > time ? {
      name: 'Asleep', emoji: '😴', color: DRM.violet,
      description: 'Out cold — no moving, no casting. Any damage at all wakes you up instantly.',
      until: st.asleepUntil, priority: 12,
    } : null);

    this.api.setStatusIndicator('dream-drowsy', st && st.asleepUntil <= time && st.drowsy > 0.5 ? {
      name: 'Drowsy', emoji: '🥱', color: DRM.blue,
      description: 'Sleepiness is stacking up. At 100% you fall asleep for 8 seconds. Get out of the pendulum\'s reach and it wears off.',
      count: Math.round(st!.drowsy), suffix: '%', priority: 13,
    } : null);

    this.api.setStatusIndicator('dream-nightmare', st && st.nightmareUntil > time ? {
      name: 'Nightmare', emoji: '💔', color: DRM.dread,
      description: `${NIGHTMARE_TICK_DAMAGE} damage a second, and it will not wake you. Whatever does wake you while it lasts hits ${NIGHTMARE_WAKE_MULT}× as hard.`,
      until: st.nightmareUntil, priority: 14,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while this fighter is out cold. */
  isAsleep(f: Fighter): boolean {
    const st = this.sleep.get(f);
    return !!st && st.asleepUntil > this.now;
  }

  /** True while the local player is asleep or away in the oasis — WASD is not part of either. */
  isPlayerLocked(): boolean {
    return this.isAsleep(this.api.player) || this.sides.player.oasisUntil > this.now;
  }

  /** True while a side is resting. Its own AI must not act, and nothing can reach it. */
  isInOasis(owner: Owner): boolean { return this.side(owner).oasisUntil > this.now; }

  /** 0–100 sleepiness on a fighter. */
  getDrowsy(f: Fighter): number {
    const st = this.sleep.get(f);
    if (!st) return 0;
    return st.asleepUntil > this.now ? SLEEP_MAX : st.drowsy;
  }

  isTranceOn(owner: Owner): boolean { return this.side(owner).tranceOn; }

  getCatcherCount(owner: Owner): number {
    return this.catchers.filter((c) => c.owner === owner).length;
  }

  /** NPC pacing gate — the AI is not allowed to carpet the floor with dreamcatchers. */
  canPlaceCatcher(owner: Owner, time: number): boolean {
    const s = this.side(owner);
    if (time < s.nextCatcherAt) return false;
    s.nextCatcherAt = time + 2500;
    return true;
  }

  /**
   * Ability tray fill. Trance is a toggle, so its card reads "on" rather than counting down
   * a cooldown nobody is waiting for.
   */
  getBarRatio(abilityId: string, time: number): number {
    void time;
    if (abilityId === 'dream-trance' && this.sides.player.tranceOn) return 1;
    return this.api.player.getCooldownRatio(abilityId);
  }
}
