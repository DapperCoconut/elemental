import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  INK, InkAvatar, InkColorFn, InkFx, anvil, bananaPeel, bananaShot, dizzyStars, dropShadow, foamWalls,
  glove, inkBullet, slipMarks, smokeGhost, studioDesk, studioLife,
} from './InkVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];

const ID = {
  click: 'ink-finger-guns',
  e: 'ink-banana',
  r: 'ink-skedaddle',
  f: 'ink-anvil',
  q: 'ink-foux-world',
} as const;

// ── Click: Finger Guns ───────────────────────────────────────────────────────
const GUN_DMG = 3;
const BULLET_SPEED = 640;
const BULLET_R = 3.5;
const BULLET_LIFE_MS = 950;
/** Under Foux World the camera pulls back to the whole set, so a shot carries across it. */
const FOUX_BULLET_LIFE_MS = 2600;
/** A bot "clicks" no faster than a quick human. */
const BOT_GUN_MS = 170;
// Click+ — every 50th shot launches the hand itself.
const HAND_EVERY = 50;
const HAND_SPEED = 520;
const HAND_DMG = 10;
const HAND_LIFE_MS = 1300;
const BARRAGE_N = 8;
const BARRAGE_DMG = 3;
const BARRAGE_SPEED = 520;
const HAND_REGROW_MS = 1000;
// F+ Doombringer — the banana gun.
const BANANA_SPEED = 470;
const BANANA_RANGE = 260;
const BANANA_DMG = 3;

// ── E: Oooo Banana ───────────────────────────────────────────────────────────
const PEEL_BEHIND = 30;
const PEEL_ARM_MS = 350;
const PEEL_R = 13;
const PEEL_CAP = 40;
const FLING_SPEED = 430;
const FLING_MS = 420;
const SLIP_STUN_MS = 1000;
const SLIP_MS = 5000;
/** How fast a slipping body's velocity turns toward where it is steered, per second. Low = icy. */
const SLIP_GRIP = 1.7;
// E+ Mimic.
const MIMIC_SPEED = 55;
const MIMIC_LEGS_MS = 280;

// ── R: Skedaddle ─────────────────────────────────────────────────────────────
const SKED_MAX_MS = 5000;
const SKED_MIN_MS = 400;
const SKED_SPEED = 560;
const SKED_DMG = 10;
const SKED_REHIT_MS = 500;
const SKED_HIT_PAD = 20;
const CORNER_MS = 120;
// R+ Vroom.
const SMOKE_MS = 3000;
const SMOKE_SHOT_MS = 500;

// ── F: Ol' 6 Ton ─────────────────────────────────────────────────────────────
const PULL_MS = 3000;
const HOLD_MS = 3000;
const ANVIL_RANGE = 380;
const ANVIL_FALL_MS = 420;
const CRUSH_FALL_MS = 220;
const ANVIL_R = 60;
const ANVIL_DMG = 30;
const FLAT_MS = 4000;
const CRUSH_FRAC = 0.25;
const CRUSH_FLAT_MS = 2000;
const PULL_SLOW = 0.6;
const HELD_SLOW = 0.75;
/** A replica's anvil is cleared if the owner's slam or crush never arrives. */
const REPLICA_HOLD_GRACE_MS = 1200;
// F+ Doombringer.
const DOOM_REST_MS = 3000;
const DOOM_REACH = 58;
const DOOM_PEELS = 5;
const DOOM_GET_MS = 2200;

// ── Q: Foux World ────────────────────────────────────────────────────────────
const FOUX_MS = 10000;
const FOUX_ZOOM = 0.5;
const FOAM_BAND = 34;
const FOAM_ENTER_DMG = 8;
const FOAM_TICK_MS = 250;
const FOAM_TICK_DMG = 4;
/** How far inside the walls a body is put back when the set closes. */
const YANK_MARGIN = 30;
// Q+ Fourth Wall.
const CARD_GAP_MS = 350;
const CARD_FLY_MS = 650;
const CARD_DMG = 8;
const CARD_R = 55;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_SLAM_AT_MS = 2500;

// ── Types ────────────────────────────────────────────────────────────────────

interface Bullet {
  owner: Owner;
  kind: 'shot' | 'hand' | 'banana';
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  dmg: number;
}

interface Peel {
  id: number;
  owner: Owner;
  x: number;
  y: number;
  born: number;
  rot: number;
  /** E+ Mimic: 0..1 legs grown, the walk cycle, and where its eyes are looking. */
  legs: number;
  walk: number;
  look: number;
}

interface FallingAnvil {
  owner: Owner;
  x: number;
  y: number;
  start: number;
  ms: number;
  /** The crush: it lands on its own maker. */
  self: boolean;
}

interface RestingAnvil {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  /** When the owner last walked up to it (the "it is hungry" line shows once per approach). */
  near: boolean;
  fed: boolean;
}

interface Smoke {
  owner: Owner;
  x: number;
  y: number;
  born: number;
  nextShot: number;
  aim: number;
}

interface Card {
  owner: Owner;
  key: string;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  start: number;
  spin: number;
  label: Phaser.GameObjects.Text | null;
}

interface Fling {
  vx: number;
  vy: number;
  until: number;
}

interface Bounce {
  vx: number;
  vy: number;
  until: number;
  hits: Map<Fighter, number>;
  lastFlipX: number;
  lastFlipY: number;
}

interface Side {
  aimX: number;
  aimY: number;
  /** Finger guns fired since the last hand (Click+), and the hand's return. */
  shots: number;
  handBackAt: number;
  lastBotShot: number;
  /** F+: the banana gun, for the rest of the match. */
  doombringer: boolean;
  /** Item-get pose: hands up, standing still, until this scene time. */
  getUntil: number;
  /** Skedaddle. `chargeStart` > 0 while running on the spot; `pending` is the charge a cast resolves at. */
  chargeStart: number;
  pending: number;
  /** Bot: the charge it means to let go at. */
  plan: number;
  bounce: Bounce | null;
  /** The anvil in hand: pulling it out, then holding it overhead. */
  anvil: 'pull' | 'held' | null;
  anvilAt: number;
  /** Foux World. */
  fouxUntil: number;
  /** Q+ Fourth Wall: cards still to throw, and when the next one goes. */
  cardsLeft: number;
  nextCardAt: number;
  /** Player input edges. */
  wasLeft: boolean;
  wasR: boolean;
  /** The next peel id this side hands out — the opponent's sim names them the same way. */
  peelSeq: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, shots: 0, handBackAt: 0, lastBotShot: 0, doombringer: false, getUntil: 0,
    chargeStart: 0, pending: -1, plan: 0, bounce: null, anvil: null, anvilAt: 0, fouxUntil: 0,
    cardsLeft: 0, nextCardAt: 0, wasLeft: false, wasR: false, peelSeq: 0,
  };
}

/** One ability card on the player's tray, as Fourth Wall needs it. */
export interface InkHudCard {
  objs: Phaser.GameObjects.GameObject[];
  x: number;
  y: number;
  w: number;
  h: number;
  key: string;
  abilityId: string;
  lbl?: Phaser.GameObjects.Text;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface InkArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  inkColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** The player's shop upgrade, or the opponent's (online handshake / Hard+ bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /**
   * Shuffle the local player's E/R/F/Q keys: `order[i]` is which physical key now drives the
   * i-th ability (0 E, 1 R, 2 F, 3 Q). Null puts them back.
   */
  setKeyShuffle(order: number[] | null): void;
  /** The player's ability tray, for Fourth Wall. */
  get hudCards(): InkHudCard[];
}

// ── InkKit ───────────────────────────────────────────────────────────────────

/**
 * Ink — the rubber-hose cartoon.
 *
 * - **Finger Guns** — a bullet per click, no cooldown. Click+ throws the whole hand every 50th
 *   shot, which bursts into a barrage on whatever it hits and grows back after a second.
 * - **Oooo Banana** — a peel behind you that lasts until stepped on: a random fling, a 1s stun,
 *   then 5s of slippery steering (`inkSlipUntil` on Fighter, applied here to every body). E+
 *   peels grow legs and creep up on enemies who are looking the other way.
 * - **Skedaddle** — held: run on the spot, then bounce round the arena like a DVD logo for as
 *   long as you charged. R+ leaves a smoke double behind that keeps shooting.
 * - **Ol' 6 Ton** — 3s to haul an anvil out of hammerspace, up to 3s to hold it; a click drops it
 *   on the cursor and flattens (`inkFlatUntil`: half speed and shuffled keys). Held too long, it
 *   lands on you. F+ leaves it on the floor, hungry: walk up with five peels out and it hands you
 *   the Doombringer.
 * - **Foux World** — the camera pulls back, the arena is a set on a desk, its walls are foam and
 *   anyone can leave through them (enemies are hurt doing it). Q+ throws the ability tray.
 *
 * Online, the owner's sim decides every hit; peels, slams, crushes and the item-get are relayed
 * as `ink-*` pseudo-casts, and the opponent's copy of them is drawn but never resolves.
 */
export class InkKit {
  private api: InkArenaApi;

  private readonly pcol: InkColorFn;
  private readonly ncol: InkColorFn;
  private readonly pfx: InkFx;
  private readonly nfx: InkFx;
  private playerAvatar: InkAvatar | null = null;
  private npcAvatar: InkAvatar | null = null;
  /** Peels, shadows and resting anvils — on the floor under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets, held and falling anvils, smoke, cards — over everything that walks. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Foux World's studio (static) and its moving bits and foam walls. */
  private studioGfx: Phaser.GameObjects.Graphics | null = null;
  private studioLifeGfx: Phaser.GameObjects.Graphics | null = null;
  /** Fourth Wall: the empty sockets drawn on the tray while the cards are away. */
  private trayGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private bullets: Bullet[] = [];
  private peels: Peel[] = [];
  private falling: FallingAnvil[] = [];
  private resting: RestingAnvil[] = [];
  private smokes: Smoke[] = [];
  private cards: Card[] = [];
  private flings = new Map<Fighter, Fling>();
  /** Bodies this kit stunned, held still until the wall-clock time. */
  private holds = new Map<Fighter, number>();
  /** A slipping body's carried velocity. */
  private slipVel = new Map<Fighter, { vx: number; vy: number }>();
  /** Bodies drawn squashed flat. */
  private squashed = new Set<Fighter>();
  /** Foux World: the set's walls and the studio round them while it is open. */
  private arenaRect: Phaser.Geom.Rectangle | null = null;
  private outerRect: Phaser.Geom.Rectangle | null = null;
  private inFoam = new Map<Fighter, number>();
  private camRef: Phaser.Cameras.Scene2D.Camera | null = null;
  private camZoomF = 1;
  /** The local player's key shuffle while flattened. */
  private keyShuffle = false;
  /** Fourth Wall: the tray's cards are hidden. */
  private trayHidden = false;
  private hungryText: Phaser.GameObjects.Text | null = null;

  constructor(api: InkArenaApi) {
    this.api = api;
    this.pcol = (base) => api.inkColor('player', base);
    this.ncol = (base) => api.inkColor('npc', base);
    this.pfx = new InkFx(api.scene, this.pcol);
    this.nfx = new InkFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): InkFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): InkColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): InkAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private get bounds(): Phaser.Geom.Rectangle { return this.api.scene.physics.world.bounds; }

  private isInk(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'ink' : this.api.npcElementId === 'ink';
  }

  /** An online opponent's body (or a co-op ally's): drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private up(owner: Owner, slot: string): boolean {
    return this.isInk(owner) && this.api.hasUpgrade(owner, slot);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private canAct(f: Fighter, click: boolean): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (!click && wall < f.silencedUntil) return false;
    return true;
  }

  /** The handful of labels worth reading. `showFloatingText` is a no-op in this codebase. */
  private announce(x: number, y: number, text: string, size = 12): void {
    const { scene } = this.api;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: '#111111', stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private hit(owner: Owner, t: Fighter, dmg: number, aoe = false): void {
    const f = this.fighter(owner);
    t.takeDamage(Math.round(dmg), { source: f, sourceX: f.x, sourceY: f.y, aoe });
  }

  private sfx(owner: Owner, name: string, x: number, rate = 1, volume = 0.75): void {
    void owner;
    Sfx.playAt(name, x, { rate, volume });
  }

  // ── Control effects ────────────────────────────────────────────────────────

  private stun(f: Fighter, ms: number): void {
    if (f.unstoppable || ms <= 0) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
    this.holds.set(f, Math.max(this.holds.get(f) ?? 0, Date.now() + ms));
  }

  /** Stepped on a peel (or hit by a Doombringer banana): flung, then stunned, then slippery. */
  private slip(owner: Owner, t: Fighter): void {
    this.fx(owner).slip(t.x, t.y);
    this.sfx(owner, 'boing', t.x, 0.9, 0.8);
    if (this.isReplica(owner) || t.unstoppable) return;
    const a = Math.random() * Math.PI * 2;
    this.flings.set(t, { vx: Math.cos(a) * FLING_SPEED, vy: Math.sin(a) * FLING_SPEED, until: Date.now() + FLING_MS });
    t.inkSlipUntil = Math.max(t.inkSlipUntil, Date.now() + FLING_MS + SLIP_STUN_MS + SLIP_MS);
    this.api.scene.time.delayedCall(FLING_MS, () => { if (this.alive(t)) this.stun(t, SLIP_STUN_MS); });
  }

  /** Flattened by an anvil: half speed and shuffled keys. A bot's casts are remapped. */
  private flatten(t: Fighter, ms: number): void {
    if (t.unstoppable) return;
    t.inkFlatUntil = Math.max(t.inkFlatUntil, Date.now() + ms);
    if (t !== this.api.player && !t.netGhost && t.element?.abilities?.length) {
      const ids = t.element.abilities.filter((ab) => ab.displayKey !== 'Click').map((ab) => ab.id);
      const shuffled = this.derange(ids.length).map((i) => ids[i]);
      t.inkSwap = Object.fromEntries(ids.map((id, i) => [id, shuffled[i]]));
    }
  }

  /** A random permutation of 0..n-1 that moves every index (n ≥ 2). */
  private derange(n: number): number[] {
    if (n < 2) return Array.from({ length: n }, (_, i) => i);
    for (;;) {
      const p = Phaser.Utils.Array.Shuffle(Array.from({ length: n }, (_, i) => i));
      if (p.every((v, i) => v !== i)) return p;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.closeWorld(false);
    this.restoreCamera();
    this.showTray(true);
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const c of this.cards) c.label?.destroy();
    this.bullets = [];
    this.peels = [];
    this.falling = [];
    this.resting = [];
    this.smokes = [];
    this.cards = [];
    this.flings.clear();
    this.holds.clear();
    this.slipVel.clear();
    this.inFoam.clear();
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const f of this.allFighters()) {
      f.inkSlipUntil = 0;
      f.inkFlatUntil = 0;
      f.inkSwap = null;
    }
    this.squashed.clear();
    // The keys are rebuilt by the arena every match, so the shuffle is simply forgotten.
    this.keyShuffle = false;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.airGfx, this.studioGfx, this.studioLifeGfx, this.trayGfx]) g?.destroy();
    this.groundGfx = this.airGfx = this.studioGfx = this.studioLifeGfx = this.trayGfx = null;
    this.hungryText?.destroy(); this.hungryText = null;
    for (const id of ['ink-hand', 'ink-sked', 'ink-anvil', 'ink-foux', 'ink-doom']) this.api.setStatusIndicator(id, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9.2);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isInk('player') && !this.playerAvatar) this.playerAvatar = new InkAvatar(scene, this.pcol);
    if (!this.isInk('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isInk('npc') && !this.npcAvatar) this.npcAvatar = new InkAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'ink') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const rDown = this.api.rKey.isDown;
    const clicked = left && !s.wasLeft;
    const rPressed = rDown && !s.wasR;
    const rReleased = !rDown && s.wasR;
    s.wasLeft = left;
    s.wasR = rDown;
    if (!this.alive(p)) { this.dropCharge('player'); return; }
    if (this.now < s.getUntil) return;

    if (s.chargeStart > 0 && !this.canAct(p, false)) this.dropCharge('player');

    // Click: a slam while the anvil is up, otherwise one shot per press. Holding does nothing.
    if (clicked) {
      if (s.anvil === 'held') {
        if (this.canAct(p, true)) this.slam('player', mouseX, mouseY);
      } else if (!s.anvil && s.chargeStart === 0 && !s.bounce) {
        p.castAbility(ID.click, this.api.buildPlayerContext(mouseX, mouseY));
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && !s.bounce && s.chargeStart === 0) {
      p.castAbility(ID.e, this.api.buildPlayerContext(mouseX, mouseY));
    }

    // R: run on the spot while held, go on the release (or at the 5s cap).
    if (rPressed && s.chargeStart === 0 && !s.bounce && !s.anvil
      && this.canAct(p, false) && p.getCooldownRatio(ID.r) >= 1) {
      this.startCharge('player');
    }
    if (s.chargeStart > 0 && (rReleased || this.now - s.chargeStart >= SKED_MAX_MS)) {
      this.releaseCharge('player', mouseX, mouseY);
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.fKey) && !s.anvil && !s.bounce && s.chargeStart === 0) {
      p.castAbility(ID.f, this.api.buildPlayerContext(mouseX, mouseY));
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      p.castAbility(ID.q, this.api.buildPlayerContext(mouseX, mouseY));
    }
  }

  private startCharge(owner: Owner): void {
    const s = this.side(owner);
    s.chargeStart = this.now;
    this.avatar(owner)?.setRunning(true);
    this.avatar(owner)?.setHold('ride');
    this.relay(owner, 'ink-hold');
  }

  private dropCharge(owner: Owner): void {
    const s = this.side(owner);
    if (s.chargeStart === 0) return;
    s.chargeStart = 0;
    this.avatar(owner)?.setRunning(false);
    this.avatar(owner)?.setHold(null);
    this.relay(owner, 'ink-drop');
  }

  /** Let go of R: the run becomes a bounce, as long as the charge. */
  private releaseCharge(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const ms = Phaser.Math.Clamp(this.now - s.chargeStart, SKED_MIN_MS, SKED_MAX_MS);
    s.chargeStart = 0;
    this.avatar(owner)?.setRunning(false);
    this.avatar(owner)?.setHold(null);
    s.pending = ms;
    if (owner === 'npc') {
      this.beginBounce(owner, this.takePending(owner), tx, ty);
      return;
    }
    // Ahead of the cast, so the opponent's replay bounces for as long as ours does.
    this.relay(owner, `ink-lvl:${Math.round(ms)}`);
    if (!this.fighter(owner).castAbility(ID.r, this.api.buildPlayerContext(tx, ty))) {
      s.pending = -1;
      this.relay(owner, 'ink-drop');
    }
  }

  private takePending(owner: Owner): number {
    const s = this.side(owner);
    const v = s.pending >= 0 ? s.pending : SKED_MIN_MS;
    s.pending = -1;
    return v;
  }

  /**
   * Online: what only the owner's sim decides. Gameplay was settled on their machine; this keeps
   * our picture of them honest (and our copy of their peels named the same as theirs).
   */
  replayNet(id: string): void {
    const s = this.sides.npc;
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const f = this.api.npc;
    this.ensureLayers();
    if (head === 'ink-lvl') {
      s.pending = n(1);
      s.chargeStart = 0;
      this.npcAvatar?.setRunning(false);
      this.npcAvatar?.setHold(null);
    } else if (head === 'ink-hold') {
      s.chargeStart = this.now;
      this.npcAvatar?.setRunning(true);
      this.npcAvatar?.setHold('ride');
    } else if (head === 'ink-drop') {
      s.chargeStart = 0;
      this.npcAvatar?.setRunning(false);
      this.npcAvatar?.setHold(null);
    } else if (head === 'ink-peel') {
      this.addPeel('npc', n(2), n(3), n(1));
    } else if (head === 'ink-pop') {
      const p = this.peels.find((q) => q.owner === 'npc' && q.id === n(1));
      if (p) {
        this.peels = this.peels.filter((q) => q !== p);
        this.nfx.slip(p.x, p.y);
      }
    } else if (head === 'ink-slam') {
      this.slam('npc', n(1), n(2));
    } else if (head === 'ink-crush') {
      this.crush('npc');
    } else if (head === 'ink-hand') {
      if (this.alive(f)) this.launchHand('npc', n(1), n(2));
    } else if (head === 'ink-doom') {
      this.itemGet('npc');
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Finger Guns (or the Doombringer). A bot holding the anvil slams instead. */
  doFingerGun(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (s.anvil === 'held' && owner === 'npc' && !this.isReplica(owner)) { this.slam(owner, tx, ty); return; }
    if (s.anvil || s.bounce || s.chargeStart > 0) return;
    if (owner === 'npc' && !this.isReplica(owner)) {
      if (this.now - s.lastBotShot < BOT_GUN_MS) return;
      s.lastBotShot = this.now;
    }
    if (this.now < s.handBackAt) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const hand = this.handPos(owner, ang);
    this.avatar(owner)?.shoot();
    if (s.doombringer) {
      this.bullets.push({
        owner, kind: 'banana', x: hand.x, y: hand.y,
        vx: Math.cos(ang) * BANANA_SPEED, vy: Math.sin(ang) * BANANA_SPEED,
        born: this.now, life: (BANANA_RANGE / BANANA_SPEED) * 1000, dmg: BANANA_DMG,
      });
      this.fx(owner).muzzle(hand.x, hand.y, ang);
      return;
    }
    this.bullets.push({
      owner, kind: 'shot', x: hand.x, y: hand.y, vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED,
      born: this.now, life: this.bulletLife(), dmg: GUN_DMG,
    });
    this.fx(owner).muzzle(hand.x, hand.y, ang);
    // Click+: every 50th shot, the hand goes too. The owner counts; the replica is told.
    if (this.up(owner, 'click') && !this.isReplica(owner)) {
      s.shots += 1;
      if (s.shots >= HAND_EVERY) {
        s.shots = 0;
        this.launchHand(owner, tx, ty);
        this.relay(owner, `ink-hand:${Math.round(tx)}:${Math.round(ty)}`);
      }
    }
  }

  private handPos(owner: Owner, ang: number): { x: number; y: number } {
    const f = this.fighter(owner);
    return { x: f.x + Math.cos(ang) * 34, y: f.y + Math.sin(ang) * 34 };
  }

  private launchHand(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const h = this.handPos(owner, ang);
    this.bullets.push({
      owner, kind: 'hand', x: h.x, y: h.y, vx: Math.cos(ang) * HAND_SPEED, vy: Math.sin(ang) * HAND_SPEED,
      born: this.now, life: HAND_LIFE_MS, dmg: HAND_DMG,
    });
    s.handBackAt = this.now + HAND_LIFE_MS + HAND_REGROW_MS;
    this.avatar(owner)?.setGunHand(false);
    this.fx(owner).word(h.x, h.y - 20, 'YOINK!', 12, 0);
  }

  /** E — Oooo Banana. Dropped behind: away from the aim for a player, behind the stride for a bot. */
  doBanana(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.pop();
    // The owner's sim places it and names it; the replica waits for `ink-peel`.
    if (this.isReplica(owner)) return;
    const back = owner === 'player' ? Math.atan2(ty - f.y, tx - f.x) + Math.PI : f.facingAngle + Math.PI;
    const x = f.x + Math.cos(back) * PEEL_BEHIND;
    const y = f.y + Math.sin(back) * PEEL_BEHIND;
    this.placePeel(owner, x, y);
  }

  private placePeel(owner: Owner, x: number, y: number): void {
    const b = this.bounds;
    const px = Phaser.Math.Clamp(x, b.x + 8, b.right - 8);
    const py = Phaser.Math.Clamp(y, b.y + 8, b.bottom - 8);
    const id = this.side(owner).peelSeq++;
    this.addPeel(owner, px, py, id);
    this.relay(owner, `ink-peel:${id}:${Math.round(px)}:${Math.round(py)}`);
  }

  private addPeel(owner: Owner, x: number, y: number, id: number): void {
    this.peels.push({ id, owner, x, y, born: this.now, rot: Math.random() * Math.PI * 2, legs: 0, walk: 0, look: 0 });
    this.fx(owner).peelDrop(x, y);
    // Forty on the floor at once: the oldest of this side's goes.
    const mine = this.peels.filter((p) => p.owner === owner);
    if (mine.length > PEEL_CAP) this.peels = this.peels.filter((p) => p !== mine[0]);
  }

  /** R — Skedaddle. A bot's cast starts the run; the kit lets go. */
  doSkedaddle(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (owner === 'npc' && !this.isReplica(owner) && s.pending < 0) {
      s.aimX = tx;
      s.aimY = ty;
      this.startCharge(owner);
      s.plan = this.botSkedPlan();
      return;
    }
    this.beginBounce(owner, this.takePending(owner), tx, ty);
  }

  private beginBounce(owner: Owner, ms: number, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.bounce = {
      vx: Math.cos(ang) * SKED_SPEED, vy: Math.sin(ang) * SKED_SPEED,
      until: this.now + ms, hits: new Map(), lastFlipX: -1e9, lastFlipY: -1e9,
    };
    this.fx(owner).word(f.x, f.y - 34, 'ZOOM!', 14, 22);
    this.fx(owner).dust(f.x, f.y + 14, 6, 26);
    this.avatar(owner)?.pop();
    // R+ Vroom: a smoke double stays where you were, still shooting.
    if (this.up(owner, 'r')) this.smokes.push({ owner, x: f.x, y: f.y, born: this.now, nextShot: this.now + SMOKE_SHOT_MS, aim: ang });
  }

  /** F — Ol' 6 Ton: start hauling the anvil out. */
  doAnvil(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (s.anvil) return;
    s.anvil = 'pull';
    s.anvilAt = this.now;
    this.avatar(owner)?.setGunHand(false);
    this.fx(owner).word(f.x, f.y - 40, 'HNNGH...', 11, 0);
  }

  /** Q — Foux World. */
  doFouxWorld(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.fouxUntil = this.now + FOUX_MS;
    this.openWorld();
    this.fx(owner).iris(f.x, f.y, false);
    this.fx(owner).word(f.x, f.y - 46, 'FOUX WORLD!', 16, 30);
    this.avatar(owner)?.play('raise');
    // Q+ Fourth Wall: five cards off the tray, one by one.
    if (this.up(owner, 'q')) {
      s.cardsLeft = 5;
      s.nextCardAt = this.now + 200;
      if (owner === 'player') this.showTray(false);
    }
  }

  // ── The anvil ──────────────────────────────────────────────────────────────

  /** A click with the anvil up: it goes down on the cursor (within reach). */
  private slam(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (s.anvil !== 'held' && !this.isReplica(owner)) return;
    s.anvil = null;
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    this.avatar(owner)?.setGunHand(true);
    const d = Phaser.Math.Distance.Between(f.x, f.y, tx, ty);
    const k = d > ANVIL_RANGE ? ANVIL_RANGE / d : 1;
    const x = f.x + (tx - f.x) * k;
    const y = f.y + (ty - f.y) * k;
    this.falling.push({ owner, x, y, start: this.now, ms: ANVIL_FALL_MS, self: false });
    this.relay(owner, `ink-slam:${Math.round(x)}:${Math.round(y)}`);
  }

  /** Held too long: it comes down on your own head. */
  private crush(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.anvil = null;
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.setGunHand(true);
    if (!this.alive(f)) return;
    this.falling.push({ owner, x: f.x, y: f.y, start: this.now, ms: CRUSH_FALL_MS, self: true });
    this.fx(owner).word(f.x, f.y - 60, 'UH OH', 13, 0);
    this.relay(owner, 'ink-crush');
  }

  private landAnvil(a: FallingAnvil): void {
    const fx = this.fx(a.owner);
    const f = this.fighter(a.owner);
    fx.anvilImpact(a.x, a.y, ANVIL_R);
    this.sfx(a.owner, 'stone-slam', a.x, 0.7, 0.95);
    if (a.self) {
      fx.word(a.x, a.y - 40, 'CLANG!', 16, 28);
      if (!this.isReplica(a.owner) && this.alive(f)) {
        Fighter.asNonAllyDamage(() => f.takeDamage(Math.round(f.maxHp * CRUSH_FRAC), { selfInflicted: true }));
        this.flatten(f, CRUSH_FLAT_MS);
      }
    } else {
      fx.word(a.x, a.y - 44, 'WHAM!', 18, 30);
      if (!this.isReplica(a.owner)) {
        for (const t of this.targetsOf(a.owner)) {
          if (Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y) > ANVIL_R + this.bodyR(t)) continue;
          this.hit(a.owner, t, ANVIL_DMG, true);
          if (this.alive(t)) this.flatten(t, FLAT_MS);
        }
      }
    }
    // F+ Doombringer: the anvil stays where it fell.
    if (this.up(a.owner, 'f')) this.resting.push({ owner: a.owner, x: a.x, y: a.y, until: this.now + DOOM_REST_MS, near: false, fed: false });
  }

  /** "Doombringer get!" — hands up, the item over your head, a fanfare. */
  private itemGet(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.doombringer = true;
    s.getUntil = this.now + DOOM_GET_MS;
    if (!this.alive(f)) return;
    this.avatar(owner)?.play('raise', undefined, DOOM_GET_MS);
    this.avatar(owner)?.setDoombringer(true);
    this.fx(owner).itemGet(f.x, f.y - 50, DOOM_GET_MS);
    this.sfx(owner, 'jackpot', f.x, 1, 0.9);
    const { scene } = this.api;
    const banner = scene.add.text(f.x, f.y - 92, 'DOOMBRINGER GET!', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#111111', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(18.6).setScale(0.2);
    scene.tweens.add({ targets: banner, scale: 1, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: banner, alpha: 0, y: banner.y - 16, delay: DOOM_GET_MS - 500, duration: 500, onComplete: () => banner.destroy() });
    if (owner === 'player') {
      const card = this.api.hudCards.find((c) => c.abilityId === ID.click);
      card?.lbl?.setText('Click  Doombringer');
    }
  }

  // ── Foux World ─────────────────────────────────────────────────────────────

  private worldOpen(): boolean { return this.arenaRect !== null; }

  private bulletLife(): number { return this.worldOpen() ? FOUX_BULLET_LIFE_MS : BULLET_LIFE_MS; }

  private openWorld(): void {
    if (this.arenaRect) return;
    const { scene } = this.api;
    const b = this.bounds;
    this.arenaRect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    // Twice the set in each direction, centred on it: all of it fits the zoomed-out view.
    const outer = new Phaser.Geom.Rectangle(b.centerX - b.width, b.centerY - b.height, b.width * 2, b.height * 2);
    this.outerRect = outer;
    scene.physics.world.setBounds(outer.x + 40, outer.y + 40, outer.width - 80, outer.height - 80);
    this.studioGfx = scene.add.graphics().setDepth(0.4);
    studioDesk(this.studioGfx, this.pcol, this.arenaRect, outer);
    this.studioLifeGfx = scene.add.graphics().setDepth(3.25);
    this.inFoam.clear();
  }

  /** The set closes: the walls come back and everyone outside is pulled back in. */
  private closeWorld(yank: boolean): void {
    const a = this.arenaRect;
    if (!a) return;
    const { scene } = this.api;
    scene.physics?.world?.setBounds(a.x, a.y, a.width, a.height);
    if (yank) {
      for (const f of this.allFighters()) {
        if (!f.active || f.netGhost) continue;
        const inside = f.x > a.x && f.x < a.right && f.y > a.y && f.y < a.bottom;
        if (inside) continue;
        const nx = Phaser.Math.Clamp(f.x, a.x + YANK_MARGIN, a.right - YANK_MARGIN);
        const ny = Phaser.Math.Clamp(f.y, a.y + YANK_MARGIN, a.bottom - YANK_MARGIN);
        this.pfx.yank(f.x, f.y, nx, ny);
        (f.body as Phaser.Physics.Arcade.Body | null)?.reset(nx, ny);
      }
      // Whatever was left out there goes too.
      const inA = (x: number, y: number) => x > a.x && x < a.right && y > a.y && y < a.bottom;
      this.peels = this.peels.filter((p) => inA(p.x, p.y));
      this.smokes = this.smokes.filter((sm) => inA(sm.x, sm.y));
      this.resting = this.resting.filter((r) => inA(r.x, r.y));
    }
    this.studioGfx?.destroy(); this.studioGfx = null;
    this.studioLifeGfx?.destroy(); this.studioLifeGfx = null;
    this.arenaRect = null;
    this.outerRect = null;
    this.inFoam.clear();
  }

  /** The zoom eases in and out, as a ratio on whatever else has the camera. */
  private updateCamera(delta: number): void {
    const cam = this.api.scene.cameras.main;
    if (!cam) return;
    if (this.camRef !== cam) { this.camRef = cam; this.camZoomF = 1; }
    const goal = this.worldOpen() ? FOUX_ZOOM : 1;
    if (this.camZoomF === goal) return;
    const k = 1 - Math.exp(-(delta / 1000) * 6);
    let zf = this.camZoomF + (goal - this.camZoomF) * k;
    if (Math.abs(goal - zf) < 0.002) zf = goal;
    cam.setZoom((cam.zoom / this.camZoomF) * zf);
    this.camZoomF = zf;
    // The pointer only re-projects on a mouse move; the aim must follow the zoom without one.
    this.api.scene.input.activePointer.updateWorldPoint(cam);
  }

  private restoreCamera(): void {
    const cam = this.api.scene.cameras?.main;
    if (cam && cam === this.camRef && this.camZoomF !== 1) cam.setZoom(cam.zoom / this.camZoomF);
    this.camZoomF = 1;
    this.camRef = null;
  }

  /** Enemies pushing through the foam: a hit going in, and a grind while inside. */
  private updateFoam(): void {
    const a = this.arenaRect;
    if (!a) return;
    const half = FOAM_BAND / 2;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.fouxUntil || this.isReplica(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const nearX = Math.min(Math.abs(t.x - a.x), Math.abs(t.x - a.right));
        const nearY = Math.min(Math.abs(t.y - a.y), Math.abs(t.y - a.bottom));
        const withinX = t.x > a.x - half && t.x < a.right + half;
        const withinY = t.y > a.y - half && t.y < a.bottom + half;
        const inBand = (nearX < half && withinY) || (nearY < half && withinX);
        const next = this.inFoam.get(t);
        if (!inBand) { this.inFoam.delete(t); continue; }
        if (next === undefined) {
          this.inFoam.set(t, this.now + FOAM_TICK_MS);
          this.hit(owner, t, FOAM_ENTER_DMG);
          this.fx(owner).word(t.x, t.y - 34, 'SQUISH!', 12, 0);
          this.sfx(owner, 'slime-splat', t.x, 1.1, 0.6);
        } else if (this.now >= next) {
          this.inFoam.set(t, next + FOAM_TICK_MS);
          this.hit(owner, t, FOAM_TICK_DMG);
        }
      }
    }
  }

  // ── Fourth Wall ────────────────────────────────────────────────────────────

  private showTray(on: boolean): void {
    if (this.trayHidden === !on) return;
    this.trayHidden = !on;
    for (const c of this.api.hudCards) {
      for (const o of c.objs) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible?.(on);
    }
    if (on) { this.trayGfx?.destroy(); this.trayGfx = null; }
  }

  private throwCard(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const idx = 5 - s.cardsLeft;
    s.cardsLeft -= 1;
    let x0: number;
    let y0: number;
    let key: string;
    const cam = this.api.scene.cameras.main;
    const cards = owner === 'player' ? this.api.hudCards : [];
    const card = cards[idx];
    if (card) {
      // A HUD card ignores the scroll but not the zoom, so the world point drawn on top of it is
      // simply its own position plus the scroll.
      x0 = card.x + cam.scrollX;
      y0 = card.y + cam.scrollY;
      key = card.key;
    } else {
      x0 = f.x + (idx - 2) * 30;
      y0 = f.y - 70;
      key = ['Click', 'E', 'R', 'F', 'Q'][idx] ?? '?';
    }
    const t = owner === 'player' ? { x: s.aimX, y: s.aimY } : (this.targetsOf(owner)[0] ?? { x: s.aimX, y: s.aimY });
    const label = this.api.scene.add.text(x0, y0, key === 'Click' ? 'LMB' : key, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#111111',
    }).setOrigin(0.5).setDepth(19.1);
    this.cards.push({ owner, key, x0, y0, tx: t.x, ty: t.y, start: this.now, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 4), label });
    this.sfx(owner, 'whoosh', x0, 1.3, 0.6);
  }

  private updateCards(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.cardsLeft > 0 && this.now >= s.nextCardAt) {
        s.nextCardAt = this.now + CARD_GAP_MS;
        this.throwCard(owner);
      }
    }
    const keep: Card[] = [];
    for (const c of this.cards) {
      const u = (this.now - c.start) / CARD_FLY_MS;
      if (u < 1) { keep.push(c); continue; }
      c.label?.destroy();
      this.fx(c.owner).cardBlast(c.tx, c.ty, CARD_R);
      this.fx(c.owner).word(c.tx, c.ty - 30, 'KA-BLAM!', 13, 0);
      this.sfx(c.owner, 'explosion-small', c.tx, 1.2, 0.7);
      if (!this.isReplica(c.owner)) {
        for (const t of this.targetsOf(c.owner)) {
          if (Phaser.Math.Distance.Between(c.tx, c.ty, t.x, t.y) <= CARD_R + this.bodyR(t)) this.hit(c.owner, t, CARD_DMG, true);
        }
      }
    }
    this.cards = keep;
  }

  private cardPos(c: Card): { x: number; y: number; rot: number; u: number } {
    const u = Phaser.Math.Clamp((this.now - c.start) / CARD_FLY_MS, 0, 1);
    const arc = Math.sin(u * Math.PI) * 60;
    return {
      x: c.x0 + (c.tx - c.x0) * u,
      y: c.y0 + (c.ty - c.y0) * u - arc,
      rot: c.spin * u,
      u,
    };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isInk('player');
    const npcIs = this.isInk('npc');
    const anyState = this.bullets.length || this.peels.length || this.falling.length || this.resting.length
      || this.smokes.length || this.cards.length || this.flings.size || this.holds.size || this.squashed.size
      || this.worldOpen() || this.camZoomF !== 1 || this.keyShuffle || this.trayHidden || this.playerAvatar
      || this.anySlipOrFlat();
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateSides(dt);
    this.updateBotCharge();
    this.updateBullets(dt);
    this.updatePeels(dt);
    this.updateAnvils();
    this.updateSmokes();
    this.updateCards();
    this.updateWorld();
    this.updateFoam();
    this.updateCamera(delta);
    this.updateBodies(dt);
    this.updateKeyShuffle();
    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  private anySlipOrFlat(): boolean {
    const wall = Date.now();
    return this.allFighters().some((f) => f.inkSlipUntil > wall || f.inkFlatUntil > wall);
  }

  /** Charging, bouncing, the anvil's clock, the hand growing back. */
  private updateSides(dt: number): void {
    void dt;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isInk(owner) || !this.alive(f)) {
        s.chargeStart = 0;
        s.bounce = null;
        s.anvil = null;
        continue;
      }
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      // Running on the spot, and the item-get pose: stood still. A replica's body is the network's.
      if (!this.isReplica(owner) && body && (s.chargeStart > 0 || this.now < s.getUntil)) body.setVelocity(0, 0);
      if (s.chargeStart > 0 && Math.random() < 0.35) this.fx(owner).runDust(f.x, f.y, Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // The bounce.
      const bo = s.bounce;
      if (bo) {
        if (this.now >= bo.until) {
          s.bounce = null;
          this.fx(owner).dust(f.x, f.y + 14, 5, 20);
          this.avatar(owner)?.pop();
        } else {
          this.updateBounce(owner, f, bo);
        }
      }
      // The anvil: pulled out over 3s, then held for up to 3s.
      if (s.anvil === 'pull' && this.now - s.anvilAt >= PULL_MS) {
        s.anvil = 'held';
        s.anvilAt = this.now;
        this.avatar(owner)?.setHold('brace');
        this.fx(owner).word(f.x, f.y - 74, 'TA-DA!', 12, 0);
      } else if (s.anvil === 'pull' && Math.random() < 0.06) {
        this.fx(owner).strain(f.x, f.y);
      }
      if (s.anvil === 'held') {
        const held = this.now - s.anvilAt;
        if (this.isReplica(owner)) {
          if (held >= HOLD_MS + REPLICA_HOLD_GRACE_MS) { s.anvil = null; this.avatar(owner)?.setHold(null); }
        } else if (held >= HOLD_MS) {
          this.crush(owner);
        } else if (owner === 'npc') {
          this.updateBotAnvil(held);
        }
      }
      if (s.handBackAt > 0 && this.now >= s.handBackAt) {
        s.handBackAt = 0;
        this.fx(owner).word(f.x, f.y - 30, 'POP!', 10, 0);
      }
      this.avatar(owner)?.setGunHand(this.now >= s.handBackAt && !s.anvil);
      if (s.fouxUntil > 0 && this.now >= s.fouxUntil) s.fouxUntil = 0;
    }
  }

  private updateBounce(owner: Owner, f: Fighter, bo: Bounce): void {
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    const b = this.bounds;
    const r = this.bodyR(f);
    this.avatar(owner)?.setSpin(0.35);
    if (!this.isReplica(owner) && body) {
      let flipped = false;
      if (f.x - r <= b.x + 2 && bo.vx < 0) { bo.vx = -bo.vx; bo.lastFlipX = this.now; flipped = true; this.fx(owner).wallBoing(f.x, f.y, -1, 0); }
      if (f.x + r >= b.right - 2 && bo.vx > 0) { bo.vx = -bo.vx; bo.lastFlipX = this.now; flipped = true; this.fx(owner).wallBoing(f.x, f.y, 1, 0); }
      if (f.y - r <= b.y + 2 && bo.vy < 0) { bo.vy = -bo.vy; bo.lastFlipY = this.now; flipped = true; this.fx(owner).wallBoing(f.x, f.y, 0, -1); }
      if (f.y + r >= b.bottom - 2 && bo.vy > 0) { bo.vy = -bo.vy; bo.lastFlipY = this.now; flipped = true; this.fx(owner).wallBoing(f.x, f.y, 0, 1); }
      if (flipped) {
        this.sfx(owner, 'boing', f.x, 1.2 + Math.random() * 0.3, 0.45);
        // The DVD logo's one moment of glory.
        if (Math.abs(bo.lastFlipX - bo.lastFlipY) < CORNER_MS) {
          this.fx(owner).word(f.x, f.y - 40, 'CORNER!', 16, 26);
          bo.lastFlipX = bo.lastFlipY = -1e9;
        }
      }
      body.setVelocity(bo.vx, bo.vy);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > r + this.bodyR(t) + SKED_HIT_PAD - 20) continue;
        if (this.now < (bo.hits.get(t) ?? 0)) continue;
        bo.hits.set(t, this.now + SKED_REHIT_MS);
        this.hit(owner, t, SKED_DMG);
        this.fx(owner).word((f.x + t.x) / 2, (f.y + t.y) / 2 - 20, 'BONK!', 13, 18);
        this.sfx(owner, 'hit-heavy', t.x, 1.3, 0.6);
      }
    }
  }

  /** A bot lets go of Skedaddle once it has run for as long as it planned. */
  private updateBotCharge(): void {
    const owner: Owner = 'npc';
    if (!this.isInk(owner) || this.isReplica(owner)) return;
    const s = this.side(owner);
    if (s.chargeStart === 0) return;
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.canAct(f, false)) { this.dropCharge(owner); return; }
    const t = this.targetsOf(owner)[0];
    if (t) { s.aimX = t.x; s.aimY = t.y; }
    if (this.now - s.chargeStart >= s.plan) this.releaseCharge(owner, s.aimX, s.aimY);
  }

  /** How long a bot runs on the spot. A flattened or slipping target cannot get away from a long one. */
  private botSkedPlan(): number {
    const t = this.targetsOf('npc')[0];
    const wall = Date.now();
    if (t && (t.inkFlatUntil > wall + 1500 || t.inkSlipUntil > wall + 2500)) return 3000 + Math.random() * 1200;
    return 1200 + Math.random() * 900;
  }

  /** A bot holding the anvil drops it on helpless targets at once, anyone in reach soon, and never holds it to the crush. */
  private updateBotAnvil(held: number): void {
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t) { if (held >= NPC_SLAM_AT_MS) this.slam('npc', f.x + 60, f.y); return; }
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    const wall = Date.now();
    const helpless = t.stunnedUntil > wall + ANVIL_FALL_MS || t.inkSlipUntil > wall || t.inkFlatUntil > wall;
    const inReach = d <= ANVIL_RANGE + 20;
    if ((helpless && inReach) || (inReach && held >= 1200) || held >= NPC_SLAM_AT_MS) {
      // Lead the target by the fall.
      const body = t.body as Phaser.Physics.Arcade.Body | null;
      const lead = ANVIL_FALL_MS / 1000;
      this.slam('npc', t.x + (body?.velocity.x ?? 0) * lead, t.y + (body?.velocity.y ?? 0) * lead);
    }
  }

  private updateBullets(dt: number): void {
    const keep: Bullet[] = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const age = this.now - b.born;
      const bnd = this.bounds;
      let gone = age > b.life || !Phaser.Geom.Rectangle.Contains(bnd, b.x, b.y);
      if (!gone) {
        const r = b.kind === 'hand' ? 12 : b.kind === 'banana' ? 10 : BULLET_R;
        for (const t of this.targetsOf(b.owner)) {
          if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > r + this.bodyR(t)) continue;
          this.bulletHit(b, t);
          gone = true;
          break;
        }
        if (gone) continue;
      }
      if (gone) {
        // A banana that ran out of range lands as a peel — the owner places it.
        if (b.kind === 'banana' && !this.isReplica(b.owner)) this.placePeel(b.owner, b.x, b.y);
        else if (b.kind === 'shot') this.fx(b.owner).splat(b.x, b.y, 4);
        continue;
      }
      keep.push(b);
    }
    this.bullets = keep;
  }

  private bulletHit(b: Bullet, t: Fighter): void {
    const auth = !this.isReplica(b.owner);
    if (b.kind === 'hand') {
      this.fx(b.owner).word(t.x, t.y - 36, 'BLAM BLAM BLAM!', 13, 26);
      this.fx(b.owner).splat(t.x, t.y, 10);
      if (auth) this.hit(b.owner, t, b.dmg);
      // The hand splits into a barrage, fanning on past the target.
      const ang = Math.atan2(b.vy, b.vx);
      for (let i = 0; i < BARRAGE_N; i++) {
        const a = ang + (i - (BARRAGE_N - 1) / 2) * 0.32 + Math.PI;
        this.bullets.push({
          owner: b.owner, kind: 'shot', x: t.x + Math.cos(a) * 30, y: t.y + Math.sin(a) * 30,
          vx: -Math.cos(a) * BARRAGE_SPEED, vy: -Math.sin(a) * BARRAGE_SPEED, born: this.now, life: 420, dmg: BARRAGE_DMG,
        });
      }
      this.sfx(b.owner, 'shotgun', t.x, 1.3, 0.7);
      return;
    }
    if (b.kind === 'banana') {
      if (auth) this.hit(b.owner, t, b.dmg);
      this.slip(b.owner, t);
      return;
    }
    this.fx(b.owner).splat(t.x - b.vx * 0.008, t.y - b.vy * 0.008, 6);
    if (auth) this.hit(b.owner, t, b.dmg);
  }

  /** Peels: armed after a beat, tripped by an enemy's feet, and (E+) creeping while unwatched. */
  private updatePeels(dt: number): void {
    const keep: Peel[] = [];
    for (const p of this.peels) {
      const armed = this.now - p.born >= PEEL_ARM_MS;
      let tripped: Fighter | null = null;
      const targets = this.targetsOf(p.owner);
      if (armed && !this.isReplica(p.owner)) {
        for (const t of targets) {
          if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > PEEL_R + this.bodyR(t) * 0.7) continue;
          tripped = t;
          break;
        }
      }
      if (tripped) {
        this.slip(p.owner, tripped);
        this.relay(p.owner, `ink-pop:${p.id}`);
        continue;
      }
      // E+ Mimic: legs out and walking while the nearest enemy faces away from it.
      if (this.up(p.owner, 'e') && targets.length) {
        let near = targets[0];
        let nd = Infinity;
        for (const t of targets) {
          const d = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
          if (d < nd) { nd = d; near = t; }
        }
        const toPeel = Math.atan2(p.y - near.y, p.x - near.x);
        const watched = Math.abs(Phaser.Math.Angle.Wrap(near.facingAngle - toPeel)) < Math.PI / 2;
        p.look = Math.atan2(near.y - p.y, near.x - p.x);
        const goal = watched ? 0 : 1;
        p.legs = Phaser.Math.Clamp(p.legs + (goal > p.legs ? 1 : -1) * (dt * 1000 / MIMIC_LEGS_MS), 0, 1);
        if (!watched && p.legs > 0.6 && nd > 6) {
          const step = MIMIC_SPEED * dt;
          p.x += Math.cos(p.look) * step;
          p.y += Math.sin(p.look) * step;
          p.walk += dt * 14;
        }
      } else {
        p.legs = Math.max(0, p.legs - dt * 1000 / MIMIC_LEGS_MS);
      }
      keep.push(p);
    }
    this.peels = keep;
  }

  private updateAnvils(): void {
    const keepF: FallingAnvil[] = [];
    for (const a of this.falling) {
      if (this.now - a.start >= a.ms) this.landAnvil(a);
      else keepF.push(a);
    }
    this.falling = keepF;
    // F+: a resting anvil — walk up to it. With five peels on the floor, it eats them.
    const keepR: RestingAnvil[] = [];
    for (const r of this.resting) {
      if (this.now >= r.until || r.fed) continue;
      const f = this.fighter(r.owner);
      const s = this.side(r.owner);
      const near = this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, r.x, r.y) <= DOOM_REACH + this.bodyR(f);
      if (near && !r.near && !s.doombringer) {
        if (r.owner === 'player') this.sayHungry(r.x, r.y);
        if (!this.isReplica(r.owner)) {
          const mine = this.peels.filter((p) => p.owner === r.owner);
          if (mine.length >= DOOM_PEELS) {
            r.fed = true;
            mine.sort((p, q) => Phaser.Math.Distance.Between(p.x, p.y, r.x, r.y) - Phaser.Math.Distance.Between(q.x, q.y, r.x, r.y));
            for (const p of mine.slice(0, DOOM_PEELS)) {
              this.peels = this.peels.filter((q) => q !== p);
              this.relay(r.owner, `ink-pop:${p.id}`);
              this.fx(r.owner).dust(p.x, p.y, 3, 10);
            }
            this.fx(r.owner).word(r.x, r.y - 30, 'CHOMP', 14, 22);
            this.itemGet(r.owner);
            this.relay(r.owner, 'ink-doom');
          }
        }
      }
      r.near = near;
      if (!r.fed) keepR.push(r);
    }
    this.resting = keepR;
  }

  private sayHungry(x: number, y: number): void {
    this.hungryText?.destroy();
    const { scene } = this.api;
    const t = scene.add.text(x, y - 44, 'it is hungry', {
      fontSize: '12px', fontFamily: 'Georgia', fontStyle: 'italic', color: '#111111', stroke: '#ffffff', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18).setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 1, duration: 400 });
    scene.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 600, onComplete: () => { t.destroy(); if (this.hungryText === t) this.hungryText = null; } });
    this.hungryText = t;
  }

  /** R+ Vroom: the smoke double shoots at the nearest enemy every half second. */
  private updateSmokes(): void {
    const keep: Smoke[] = [];
    for (const sm of this.smokes) {
      if (this.now - sm.born >= SMOKE_MS) {
        this.fx(sm.owner).dust(sm.x, sm.y, 5, 18);
        continue;
      }
      const t = this.nearestTarget(sm.owner, sm.x, sm.y);
      if (t) sm.aim = Math.atan2(t.y - sm.y, t.x - sm.x);
      if (this.now >= sm.nextShot) {
        sm.nextShot += SMOKE_SHOT_MS;
        if (t) {
          const hx = sm.x + Math.cos(sm.aim) * 30;
          const hy = sm.y + Math.sin(sm.aim) * 30;
          this.bullets.push({
            owner: sm.owner, kind: 'shot', x: hx, y: hy, vx: Math.cos(sm.aim) * BULLET_SPEED, vy: Math.sin(sm.aim) * BULLET_SPEED,
            born: this.now, life: this.bulletLife(), dmg: GUN_DMG,
          });
          this.fx(sm.owner).muzzle(hx, hy, sm.aim);
        }
      }
      keep.push(sm);
    }
    this.smokes = keep;
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  /** Foux World closes once neither side has it up. */
  private updateWorld(): void {
    if (!this.worldOpen()) {
      if (this.trayHidden && this.sides.player.cardsLeft === 0 && !this.cards.some((c) => c.owner === 'player')) this.showTray(true);
      return;
    }
    const open = BOTH.some((o) => this.now < this.side(o).fouxUntil);
    if (open) return;
    for (const o of BOTH) {
      const f = this.fighter(o);
      if (this.isInk(o) && this.alive(f)) this.fx(o).iris(f.x, f.y, true);
    }
    this.closeWorld(true);
  }

  /** Flings, stun holds, slippery steering and the pancake squash — on every body this sim moves. */
  private updateBodies(dt: number): void {
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f.active) continue;
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      const fl = this.flings.get(f);
      if (fl) {
        if (wall >= fl.until) this.flings.delete(f);
        else if (body) { body.setVelocity(fl.vx, fl.vy); this.slipVel.set(f, { vx: fl.vx, vy: fl.vy }); }
      }
      const held = this.holds.get(f);
      if (held !== undefined) {
        if (wall >= held) this.holds.delete(f);
        else if (body && !f.netGhost && !f.unstoppable && !fl) body.setVelocity(0, 0);
      }
      // Slippery: the velocity this frame's steering asked for is only reached slowly.
      if (f.inkSlipUntil > wall && body && !f.netGhost && !fl) {
        const want = { vx: body.velocity.x, vy: body.velocity.y };
        const prev = this.slipVel.get(f) ?? want;
        const k = 1 - Math.exp(-dt * SLIP_GRIP);
        const v = { vx: prev.vx + (want.vx - prev.vx) * k, vy: prev.vy + (want.vy - prev.vy) * k };
        body.setVelocity(v.vx, v.vy);
        this.slipVel.set(f, v);
      } else if (!fl) {
        this.slipVel.delete(f);
      }
      // Flattened: the body is drawn as a pancake. Bots drop their shuffle once it wears off.
      const flat = f.inkFlatUntil > wall;
      if (flat) {
        const sc = f.sizeMult * f.shapeSizeMult * f.oozeSizeMult * f.ruinSizeMult * f.claySizeMult;
        f.setScale(sc * 1.5, sc * 0.42);
        this.squashed.add(f);
      } else if (this.squashed.has(f)) {
        this.squashed.delete(f);
        f.applySizeMult();
        this.fx('player').word(f.x, f.y - 26, 'POP!', 11, 0);
      }
      if (!flat && f.inkSwap) f.inkSwap = null;
    }
  }

  /** The local player, flattened (by anyone, or by their own anvil): the keys are shuffled. */
  private updateKeyShuffle(): void {
    const p = this.api.player;
    const flat = !!p && p.active && p.inkFlatUntil > Date.now();
    if (flat && !this.keyShuffle) {
      this.keyShuffle = true;
      this.api.setKeyShuffle(this.derange(4));
    } else if (!flat && this.keyShuffle) {
      this.keyShuffle = false;
      this.api.setKeyShuffle(null);
    }
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const air = this.airGfx!;
    ground.clear();
    air.clear();
    const t = this.vizT;
    const wall = Date.now();
    // The studio's moving bits and the foam walls.
    if (this.studioLifeGfx && this.arenaRect && this.outerRect) {
      const g = this.studioLifeGfx;
      g.clear();
      studioLife(g, this.pcol, this.arenaRect, this.outerRect, t, 1);
      foamWalls(g, this.pcol, this.arenaRect, FOAM_BAND, t, 1);
    }
    // Peels.
    for (const p of this.peels) {
      const mimic = p.legs > 0.01 ? { legs: p.legs, walk: p.walk, look: p.look } : undefined;
      bananaPeel(ground, this.col(p.owner), p.x, p.y, p.rot, t + p.id, 1, mimic);
    }
    // Resting anvils (F+), hungry.
    for (const r of this.resting) {
      const left = r.until - this.now;
      const al = Phaser.Math.Clamp(left / 300, 0, 1);
      dropShadow(ground, this.col(r.owner), r.x, r.y + 16, 66, al);
      anvil(ground, this.col(r.owner), r.x, r.y, 1, al, Math.sin(t * 3) * 0.4);
    }
    // Smoke doubles (R+).
    for (const sm of this.smokes) {
      const u = (this.now - sm.born) / SMOKE_MS;
      smokeGhost(air, this.col(sm.owner), sm.x, sm.y, t + sm.born * 0.001, Phaser.Math.Clamp(1 - u * u, 0, 1) * 0.9, sm.aim);
    }
    // Bullets, hands, bananas.
    for (const b of this.bullets) {
      const ang = Math.atan2(b.vy, b.vx);
      if (b.kind === 'hand') glove(air, this.col(b.owner), b.x, b.y, ang, 'gun', 1.4, 1);
      else if (b.kind === 'banana') bananaShot(air, this.col(b.owner), b.x, b.y, (this.now - b.born) * 0.02, 1);
      else inkBullet(air, this.col(b.owner), b.x, b.y, ang, BULLET_R, 1);
    }
    // The anvil in hand: rising from behind the back while pulled, overhead while held.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!s.anvil || !this.alive(f)) continue;
      const tint = this.col(owner);
      if (s.anvil === 'pull') {
        const u = Phaser.Math.Clamp((this.now - s.anvilAt) / PULL_MS, 0, 1);
        const back = Math.atan2(s.aimY - f.y, s.aimX - f.x) + Math.PI;
        const e = u * u * (3 - 2 * u);
        const ax = f.x + Math.cos(back) * 26 * (1 - e);
        const ay = f.y + Math.sin(back) * 10 * (1 - e) - 52 * e + Math.sin(t * 40) * (1 - e) * 1.2;
        anvil(air, tint, ax, ay, 0.35 + 0.65 * e, 1);
      } else {
        const held = (this.now - s.anvilAt) / HOLD_MS;
        // The last second it starts to wobble — a warning.
        const wob = held > 0.66 ? Math.sin(t * 30) * (held - 0.66) * 6 : 0;
        anvil(air, tint, f.x + wob, f.y - 54, 1, 1, wob * 0.3);
        if (owner === 'player') {
          // The drop zone, under the cursor (clamped to reach).
          const d = Phaser.Math.Distance.Between(f.x, f.y, s.aimX, s.aimY);
          const k = d > ANVIL_RANGE ? ANVIL_RANGE / d : 1;
          const zx = f.x + (s.aimX - f.x) * k;
          const zy = f.y + (s.aimY - f.y) * k;
          ground.lineStyle(2, tint(INK.ink), 0.55);
          ground.strokeEllipse(zx, zy + 6, ANVIL_R * 2, ANVIL_R * 0.8);
          ground.fillStyle(tint(INK.ink), 0.12);
          ground.fillEllipse(zx, zy + 6, ANVIL_R * 2, ANVIL_R * 0.8);
        }
      }
    }
    // Falling anvils: a growing shadow and the anvil dropping onto it.
    for (const a of this.falling) {
      const u = Phaser.Math.Clamp((this.now - a.start) / a.ms, 0, 1);
      const tint = this.col(a.owner);
      dropShadow(ground, tint, a.x, a.y + 16, 30 + 50 * u, 0.4 + 0.6 * u);
      const h = (1 - u * u) * (a.self ? 54 : 420);
      anvil(air, tint, a.x, a.y - h, 1, 1);
    }
    // Slip marks and dizzy stars on bodies.
    for (const f of this.allFighters()) {
      if (!f.active) continue;
      if (f.inkSlipUntil > wall) slipMarks(air, this.pcol, f.x, f.y, t + f.x * 0.01, 0.9);
      if (f.inkFlatUntil > wall) dizzyStars(air, this.pcol, f.x, f.y - 6, t, 1);
    }
    // Fourth Wall cards in flight.
    for (const c of this.cards) {
      const p = this.cardPos(c);
      this.drawCard(air, this.col(c.owner), p.x, p.y, p.rot);
      c.label?.setPosition(p.x, p.y).setRotation(p.rot);
    }
    this.paintTray();
  }

  /** A card off the tray: a white plate with an ink frame, tumbling. */
  private drawCard(g: Phaser.GameObjects.Graphics, tint: InkColorFn, x: number, y: number, rot: number): void {
    const w = 46;
    const h = 30;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const P = (px: number, py: number) => new Phaser.Math.Vector2(x + px * c - py * s, y + px * s + py * c);
    const pts = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];
    g.fillStyle(tint(INK.ink), 0.3);
    g.fillPoints(pts.map((v) => new Phaser.Math.Vector2(v.x + 4, v.y + 5)), true);
    g.fillStyle(tint(INK.white), 1);
    g.fillPoints(pts, true);
    g.lineStyle(2.5, tint(INK.ink), 1);
    g.strokePoints(pts, true);
    g.lineStyle(1, tint(INK.gray), 1);
    g.strokePoints([P(-w / 2 + 4, -h / 2 + 4), P(w / 2 - 4, -h / 2 + 4), P(w / 2 - 4, h / 2 - 4), P(-w / 2 + 4, h / 2 - 4)], true);
  }

  /** The tray while its cards are away: empty sockets, scribbled round, a question mark in each. */
  private paintTray(): void {
    if (!this.trayHidden) return;
    if (!this.trayGfx) this.trayGfx = this.api.scene.add.graphics().setDepth(22.5).setScrollFactor(0);
    const g = this.trayGfx;
    g.clear();
    const s = this.sides.player;
    const thrown = 5 - s.cardsLeft;
    this.api.hudCards.forEach((c, i) => {
      if (i >= thrown) {
        // Not thrown yet: a ghost of the card still sitting there, rattling.
        const j = Math.sin(this.vizT * 50 + i) * 1.5;
        g.fillStyle(INK.white, 0.9);
        g.fillRect(c.x - c.w / 2 + j, c.y - c.h / 2, c.w, c.h);
        g.lineStyle(2, INK.ink, 1);
        g.strokeRect(c.x - c.w / 2 + j, c.y - c.h / 2, c.w, c.h);
        return;
      }
      g.fillStyle(INK.ink, 0.55);
      g.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      g.lineStyle(2, INK.white, 0.9);
      g.beginPath();
      const n = 18;
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const ex = c.x - c.w / 2 + u * c.w;
        const ey = c.y - c.h / 2 + Math.sin(u * 20 + this.vizT * 3 + i) * 2;
        if (k === 0) g.moveTo(ex, ey); else g.lineTo(ex, ey);
      }
      g.strokePath();
      g.lineStyle(2, INK.white, 0.8);
      g.strokeRect(c.x - c.w / 2 + 3, c.y - c.h / 2 + 3, c.w - 6, c.h - 6);
      // A hand-drawn "?".
      g.lineStyle(3, INK.white, 1);
      g.beginPath();
      g.arc(c.x, c.y - 4, 6, Math.PI * 1.1, Math.PI * 2.4);
      g.strokePath();
      g.lineBetween(c.x + 1, c.y + 2, c.x, c.y + 6);
      g.fillStyle(INK.white, 1);
      g.fillCircle(c.x, c.y + 11, 2);
    });
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0] ?? this.api.player;
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      if (s.anvil === 'held') av.setHold('brace');
      else if (s.anvil === 'pull') av.setHold('draw', Math.atan2(s.aimY - f.y, s.aimX - f.x) + Math.PI);
      else if (s.chargeStart > 0) av.setHold('ride');
      av.setDoombringer(s.doombringer);
      av.setMastered(false);
      // A flattened Ink is a pancake too: the rig squashes with the sprite.
      av.setRigScale(f.inkFlatUntil > Date.now() ? 0.7 : 1);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    set('ink-hand', playerIs && this.up('player', 'click') ? {
      name: 'Finger Guns', emoji: '👉', color: INK.grayLit, priority: 150,
      description: 'Every 50th shot throws the whole hand.',
      count: s.shots,
    } : null);
    set('ink-sked', playerIs && s.chargeStart > 0 ? {
      name: 'Skedaddle', emoji: '💨', color: INK.white, priority: 151,
      description: 'Running on the spot. Let go of R to bounce for as long as you have run (up to 5s).',
      count: Math.round(Math.min(SKED_MAX_MS, this.now - s.chargeStart) / 100) / 10,
    } : null);
    set('ink-anvil', playerIs && s.anvil === 'held' ? {
      name: 'Anvil overhead', emoji: '⚓', color: INK.gray, priority: 149,
      description: 'Click to drop it on the cursor. Hold it too long and it lands on you.',
      until: Date.now() + Math.max(0, HOLD_MS - (this.now - s.anvilAt)),
    } : null);
    set('ink-foux', playerIs && this.now < s.fouxUntil ? {
      name: 'Foux World', emoji: '🎬', color: INK.white, priority: 148,
      description: 'The walls are foam. Walk out into the studio — enemies who follow are hurt pushing through.',
      until: Date.now() + (s.fouxUntil - this.now),
    } : null);
    set('ink-doom', playerIs && s.doombringer ? {
      name: 'Doombringer', emoji: '🍌', color: INK.paper, priority: 152,
      description: 'Every shot is a banana. Every banana is a peel.',
    } : null);
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** Hauling the anvil out is slow going, and holding it up a little less so. */
  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isInk(owner)) return 1;
    const s = this.side(owner);
    if (s.anvil === 'pull') return PULL_SLOW;
    if (s.anvil === 'held') return HELD_SLOW;
    return 1;
  }

  /** The cards: Skedaddle shows its run, the anvil its pull and hold, Click+ its count to the hand. */
  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === ID.r && s.chargeStart > 0) return Math.min(1, (this.now - s.chargeStart) / SKED_MAX_MS);
    if (abilityId === ID.f && s.anvil === 'pull') return Math.min(1, (this.now - s.anvilAt) / PULL_MS);
    if (abilityId === ID.f && s.anvil === 'held') return Math.max(0, 1 - (this.now - s.anvilAt) / HOLD_MS);
    if (abilityId === ID.click) {
      if (this.now < s.handBackAt) return 0;
      if (this.up('player', 'click')) return s.shots / HAND_EVERY;
      return 1;
    }
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /** The bot's hands are full: running on the spot, bouncing, hauling or holding the anvil, or posing. */
  npcBusy(): boolean {
    const s = this.sides.npc;
    return s.chargeStart > 0 || !!s.bounce || !!s.anvil || this.now < s.getUntil;
  }

  /** The target can't get out of the way: slipping or flattened. Wind a long Skedaddle, or the anvil, on them. */
  npcTargetHelpless(): boolean {
    const t = this.targetsOf('npc')[0];
    const wall = Date.now();
    return !!t && (t.inkSlipUntil > wall + 2500 || t.inkFlatUntil > wall + 1500);
  }

  /** Dropping a peel now puts it in the target's path: the bot is running from them. */
  npcPeelLane(): boolean {
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || !this.alive(f)) return false;
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > 320) return false;
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return false;
    const sp = Math.hypot(body.velocity.x, body.velocity.y);
    if (sp < 30) return d < 140;
    const away = ((f.x - t.x) * body.velocity.x + (f.y - t.y) * body.velocity.y) / (d * sp);
    return away > 0.4;
  }

  /**
   * Where the bot wants to walk: (F+) to its resting anvil with five peels out; during its own
   * Foux World, out through the wall furthest from the target, so following hurts.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.isInk('npc') || this.isReplica('npc') || !this.alive(f)) return undefined;
    if (!s.doombringer) {
      const r = this.resting.find((q) => q.owner === 'npc' && !q.fed);
      if (r && this.peels.filter((p) => p.owner === 'npc').length >= DOOM_PEELS) return { x: r.x, y: r.y };
    }
    const a = this.arenaRect;
    const t = this.targetsOf('npc')[0];
    if (a && this.now < s.fouxUntil && t) {
      // Outside the set, on the far side from the target.
      const dx = f.x - t.x;
      const dy = f.y - t.y;
      if (Math.abs(dx) * a.height > Math.abs(dy) * a.width) {
        return { x: dx > 0 ? a.right + 90 : a.x - 90, y: f.y };
      }
      return { x: f.x, y: dy > 0 ? a.bottom + 90 : a.y - 90 };
    }
    return undefined;
  }

  /** Foux World is worth it: in the fight, and not already up. */
  npcFouxReady(): boolean {
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || !this.alive(f) || this.worldOpen()) return false;
    return Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 380;
  }

  /** The bot's next finger-gun "click" is due: a quick human's pace, and only with a hand to shoot with. */
  npcGunReady(): boolean {
    const s = this.sides.npc;
    return this.now - s.lastBotShot >= BOT_GUN_MS && this.now >= s.handBackAt;
  }
}
