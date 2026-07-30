import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import { Sfx } from '../../audio';
import {
  DEA, DeathAvatar, DeathColorFn, DeathFx, clockFace, noose, shade,
  slashArc, slicedBullet, styxBrand,
} from './DeathVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Passive: Midnight ────────────────────────────────────────────────────────
/** One minute, and then somebody is dead. The whole element is arithmetic on this number. */
const MIDNIGHT_MS = 60_000;
/** Seconds at which the clock is allowed to announce itself. */
const TOLL_MARKS = [30, 10, 5, 4, 3, 2, 1];

// ── Styx Shot (Click) ────────────────────────────────────────────────────────
const STYX_SPEED = 780;
const STYX_LIFE_MS = 1500;
const STYX_HIT_R = 17;
const STYX_MS = 3000;
const STYX_MAX = 3;
/** Slow *and* damage cut, per stack. Hospice doubles it — see `stepFor`. */
const STYX_STEP = 0.15;

// ── Disarm (E) ───────────────────────────────────────────────────────────────
const DISARM_REACH = 126;
/** Half-angle of the arc. 1.05 rad ≈ 60° each side, so it is a cleave, not a poke. */
const DISARM_HALF = 1.05;
const DISARM_STUN_MS = 3000;
const DISARM_HASTE_MS = 5000;
const DISARM_HASTE = 1.30;
/** How long the yellow afterimage hangs in the air after the blade has gone. */
const DISARM_AFTER_MS = 700;

// ── Riposte (R) ──────────────────────────────────────────────────────────────
const RIPOSTE_MS = 3000;
/** The blade as a line segment: from this far in front of the body, out to this far. */
const RIPOSTE_NEAR = 14;
const RIPOSTE_FAR = 84;
/** How close a shot has to get to the steel. Generous — the ability is the whole cast. */
const RIPOSTE_R = 26;
/** Radians each half is thrown off the line it arrived on. Well past 45°, so neither can graze. */
const RIPOSTE_DEFLECT = 1.05;
const HALF_SPEED = 540;
const HALF_LIFE_MS = 760;

// ── Hospice (F) ──────────────────────────────────────────────────────────────
const HOSPICE_MS = 15_000;
/** Everything bad about being them, twice over. */
const HOSPICE_AMP = 2;

// ── Deal with Death (Q) ──────────────────────────────────────────────────────
const DEAL_APPROACH = 48;
const DEAL_SHAKE_MS = 640;
const DEAL_RETREAT = 340;
const DEAL_MS = 10_000;
const DEAL_HASTE = 1.33;
const DEAL_DODGE = 0.33;
/** Take this much in the ten seconds and the deal is off. */
const DEAL_TOLL = 50;
/** What honouring it is worth, taken straight off the clock. */
const DEAL_REWARD_MS = 10_000;

// ── HUD ──────────────────────────────────────────────────────────────────────
/**
 * The dial sits under the two rows of the status tray (`StatusHudKit`: origin y=60, two 34px
 * rows), hard against the same right margin — so it reads as the bottom of that corner stack
 * rather than as a thing floating in the middle of the screen. Invasion pushes the tray down a
 * row, and this follows it.
 */
const CLOCK_R = 40;
const CLOCK_MARGIN_X = 62;
const CLOCK_Y = 196;
const CLOCK_INVASION_DY = 38;
const CLOCK_DEPTH = 44;

// ── World objects ────────────────────────────────────────────────────────────

/** A draught of the river in flight. Carries no damage at all — only the brand. */
interface Shot {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  seed: number;
  diesAt: number;
  /** Registry handle, so a Technology goose (or another Death's Riposte) can take it. */
  reg: { owner: Owner; getX(): number; getY(): number; damage: number; steal(): void } | null;
}

/** One of the two pieces of a cut bullet. Purely a consequence — it can never hit anything. */
interface Half {
  /** The side that cut it, so a skinned Death's steel colours its own debris. */
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  spin: number;
  side: 1 | -1;
  seed: number;
  diesAt: number;
  color: number;
}

/** The yellow crescent Disarm leaves behind. */
interface Afterimage {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  bornAt: number;
  diesAt: number;
  seed: number;
}

/** The brand on a victim: stacks and one shared expiry, refreshed by every new shot. */
interface Mark {
  stacks: number;
  until: number;
}

/** A noose hanging over somebody, plus the snapshot that doubles what lands on them. */
interface Hospice {
  until: number;
  /** Expiries seen last frame — see `stretchNewEffects`. */
  snap: Map<string, number>;
  seed: number;
}

/**
 * Q's state machine. `shake` is the handshake by the enemy; `settled` is the ten seconds
 * afterwards during which the bill either comes due or it doesn't.
 */
interface Deal {
  phase: 'shake' | 'settled';
  victim: Fighter;
  shakeUntil: number;
  endsAt: number;
  /** `rawDamageTaken` at the moment the ten seconds started, so the tally is a subtraction. */
  rawAt0: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Milliseconds left before midnight. */
  clockMs: number;
  /** True once the clock has struck and taken somebody — it does not run twice. */
  clockSpent: boolean;
  /** Largest `TOLL_MARKS` entry already announced, so a warning fires exactly once. */
  lastToll: number;
  hasteUntil: number;
  guardUntil: number;
  deal: Deal | null;
  dodgeApplied: boolean;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, clockMs: MIDNIGHT_MS, clockSpent: false, lastToll: 999,
    hasteUntil: 0, guardUntil: 0, deal: null, dodgeApplied: false,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DeathArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything this player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. Riposte has to be able to see every shot in the game. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** ...and the other half of them, which never join a group. */
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
  /** Midnight and the Deal both behave differently when the npc slot is a co-op ally. */
  get isInvasion(): boolean;
  /** Q places the body itself at both ends of the teleport, so WASD has to stand down. */
  isDodging: boolean;
  /** Skins: maps a Death visual colour through that side's equipped skin. */
  deathColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── DeathKit ─────────────────────────────────────────────────────────────────

export class DeathKit {
  private api: DeathArenaApi;

  // ── Visuals ──
  private readonly pcol: DeathColorFn;
  private readonly ncol: DeathColorFn;
  private readonly pfx: DeathFx;
  private readonly nfx: DeathFx;
  private playerAvatar: DeathAvatar | null = null;
  private npcAvatar: DeathAvatar | null = null;
  /** The pool he stands in and the afterimages, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shots, cut bullets, brands, nooses and the held blade — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The doomsday dial. Its own layer because it lives in screen space, not the arena. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudTitle: Phaser.GameObjects.Text | null = null;
  private hudCount: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shots: Shot[] = [];
  private halves: Half[] = [];
  private afterimages: Afterimage[] = [];
  /** Brands, per the side that applied them. Both sides can be Death at once. */
  private marks: Record<Owner, Map<Fighter, Mark>> = { player: new Map(), npc: new Map() };
  private hospice: Record<Owner, Map<Fighter, Hospice>> = { player: new Map(), npc: new Map() };
  /** Disarm's stun, held here because nothing consumes `earthStunnedUntil` for a player. */
  private stunned = new Map<Fighter, number>();
  /** Everyone this kit has written `deathIncomingMult` onto. */
  private touched = new Set<Fighter>();
  /** True while *this* kit is the one holding the arena's dodge flag down. */
  private claimsDodge = false;

  constructor(api: DeathArenaApi) {
    this.api = api;
    this.pcol = (base) => api.deathColor('player', base);
    this.ncol = (base) => api.deathColor('npc', base);
    this.pfx = new DeathFx(api.scene, this.pcol);
    this.nfx = new DeathFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DeathFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DeathColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }

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

  private isDeath(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'death' : this.api.npcElementId === 'death';
  }

  private avatar(owner: Owner): DeathAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /**
   * The one body the clock is counting down for. In Invasion the npc slot is a co-op ally, so
   * "the enemy" is instead whichever husk is standing up best — and the clock restarts rather
   * than ending the match, since a wave is not one person.
   */
  private primaryVictim(owner: Owner): Fighter | null {
    if (this.api.isInvasion && owner === 'player') {
      let best: Fighter | null = null;
      for (const t of this.targetsOf(owner)) if (!best || t.hp > best.hp) best = t;
      return best;
    }
    const t = this.fighter(this.other(owner));
    return this.alive(t) ? t : null;
  }

  /** How much one Styx stack is worth against `victim` right now — doubled under a noose. */
  private stepFor(owner: Owner, victim: Fighter): number {
    const h = this.hospice[owner].get(victim);
    return h && this.now < h.until ? STYX_STEP * HOSPICE_AMP : STYX_STEP;
  }

  private markOn(owner: Owner, victim: Fighter): Mark | null {
    const m = this.marks[owner].get(victim);
    return m && this.now < m.until ? m : null;
  }

  /** Fraction of the minute already spent, for the avatar and the dial. */
  private doomOf(owner: Owner): number {
    return 1 - Phaser.Math.Clamp(this.sides[owner].clockMs / MIDNIGHT_MS, 0, 1);
  }

  private setDodgeClaim(on: boolean): void {
    this.claimsDodge = on;
    this.api.isDodging = on;
  }

  /**
   * Re-assert the claim every frame. A Space dodge taken mid-handshake owns the same flag and
   * hands it back when *it* finishes, which would give WASD the body back underneath a
   * teleport that has not landed yet.
   */
  private assertDodgeClaim(): void {
    if (this.claimsDodge) this.api.isDodging = true;
  }

  /** Distance from a point to the katana's line segment. */
  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Everything written onto a fighter is handed back here, or the next match opens with a
    // permanently discounted, permanently stunned, permanently lucky pair of bodies.
    for (const f of this.touched) f.deathIncomingMult = 1;
    this.touched.clear();
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.dodgeApplied && f?.active) f.dodgeChance = Math.max(0, f.dodgeChance - DEAL_DODGE);
    }
    this.stunned.clear();
    this.setDodgeClaim(false);

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.shots = [];
    this.halves = [];
    this.afterimages = [];
    this.marks = { player: new Map(), npc: new Map() };
    this.hospice = { player: new Map(), npc: new Map() };
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudTitle?.destroy(); this.hudTitle = null;
    this.hudCount?.destroy(); this.hudCount = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'death') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;
    // Mid-handshake the body is not his to drive and neither is the katana.
    if (s.deal?.phase === 'shake') return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown && !this.api.pointerWasDown) p.castAbility('death-styx', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('death-disarm', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('death-riposte', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('death-hospice', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('death-deal', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Styx Shot. Deals nothing. What it does is take fifteen percent of their legs and
   * fifteen percent of their teeth for three seconds, three times over, and that is the whole
   * reason the clock is allowed to be a guaranteed kill: the minute is only survivable if they
   * can reach you, and this is the ability that decides whether they can.
   */
  doStyxShot(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.deal?.phase === 'shake') { f.resetCooldown('death-styx'); return; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const shot: Shot = {
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * STYX_SPEED,
      vy: Math.sin(ang) * STYX_SPEED,
      seed: Math.random() * 999,
      diesAt: this.now + STYX_LIFE_MS,
      reg: null,
    };
    // Registered so the rest of the game can interact with it — including another Death's
    // Riposte, which is the only symmetry that would be strange to leave out.
    const reg = {
      owner,
      getX: () => shot.x,
      getY: () => shot.y,
      damage: 0,
      steal: () => {
        const i = this.shots.indexOf(shot);
        if (i >= 0) this.shots.splice(i, 1);
      },
    };
    shot.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.shots.push(shot);

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).soot(shot.x, shot.y, 3, 10, 320, 9);
    Sfx.playAt('dark-drain', f.x, { volume: 0.5, rate: 1.25 });
  }

  /**
   * E — Disarm. A cleave through everything in front of him that deals no damage at all and
   * instead takes three seconds off their life — three seconds in which the clock keeps running
   * and they cannot do anything about it. Landing it is also the only way he gets fast.
   */
  doDisarm(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.afterimages.push({
      owner, x: f.x, y: f.y, ang,
      bornAt: this.now, diesAt: this.now + DISARM_AFTER_MS,
      seed: Math.random() * 999,
    });

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).sweep(f.x, f.y, ang, DISARM_HALF, DISARM_REACH, 420, 10, DEA.after);
    Sfx.playAt('slash', f.x, { volume: 1, rate: 0.85 });

    let hits = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > DISARM_REACH + 14 * t.sizeMult) continue;
      const to = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(to - ang)) > DISARM_HALF) continue;
      this.stun(owner, t, DISARM_STUN_MS);
      this.api.spawnHitFlash(t.x, t.y, DEA.after);
      this.fx(owner).spark(t.x, t.y, ang);
      hits++;
    }

    if (hits === 0) {
      this.api.showFloatingText(f.x, f.y - 46, '🗡️ NOTHING THERE', this.hex(DEA.pale));
      return;
    }
    s.hasteUntil = this.now + DISARM_HASTE_MS;
    this.api.showFloatingText(f.x, f.y - 46, '🌀 QUICKENED +30%', this.hex(DEA.after));
    Sfx.playAt('status-haste', f.x, { volume: 0.7, rate: 0.9 });
  }

  /**
   * R — Riposte. Three seconds of holding the blade out along the cursor. Anything that reaches
   * the steel is cut in two and the two pieces leave at over sixty degrees off the line they
   * came in on, which is far enough that neither can come back around onto him.
   */
  doRiposte(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    s.guardUntil = this.now + RIPOSTE_MS;

    this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
    this.api.showFloatingText(f.x, f.y - 46, '🗡️ RIPOSTE', this.hex(DEA.blade));
    Sfx.playAt('clang', f.x, { volume: 0.7, rate: 0.7 });
  }

  /**
   * F — Hospice. Nothing happens when it lands; everything that happens afterwards is worth
   * double. Three Styx stacks under a noose is ninety percent of their speed and ninety percent
   * of their damage, and every debuff anybody else puts on them lasts twice as long.
   */
  doHospice(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    // One noose, one neck. In Invasion "the enemy" is whoever is closest rather than the whole
    // wave — hanging twenty of them would also mean twenty `stretchNewEffects` diffs a frame.
    const v = this.api.isInvasion && owner === 'player'
      ? this.api.getNearestEnemy(f.x, f.y)
      : this.primaryVictim(owner);
    if (!this.alive(v)) {
      f.resetCooldown('death-hospice');
      this.api.showFloatingText(f.x, f.y - 46, '⚱️ NOBODY TO SIT WITH', this.hex(DEA.pale));
      return;
    }
    const victim = v as Fighter;

    const snap = new Map<string, number>();
    // Seeded now, so only what lands *after* the noose goes up is stretched — otherwise a burn
    // already running would be doubled retroactively every time Hospice was cast.
    seedEffectSnapshot(victim, snap);
    this.hospice[owner].set(victim, { until: this.now + HOSPICE_MS, snap, seed: Math.random() * 999 });
    this.api.showFloatingText(victim.x, victim.y - 52, '⚱️ HOSPICE', this.hex(DEA.rope));
    this.api.showFloatingText(victim.x, victim.y - 34, 'DEBUFFS DOUBLED', this.hex(DEA.blood));
    this.fx(owner).soot(victim.x, victim.y - 30, 8, 22, 620, 10);

    this.avatar(owner)?.play('raise');
    this.fx(owner).toll(f.x, f.y, 20, 120, 620, 10, DEA.rope);
    Sfx.playAt('curse-cast', f.x, { volume: 0.9, rate: 0.7 });
  }

  /**
   * Q — Deal with Death. He appears next to them, shakes their hand, and leaves — and then has
   * ten seconds to prove he did not need to be there. Nothing about the ten seconds is
   * defensive by accident: the speed and the dodge exist to make surviving them possible, and
   * the reward is the only thing in the kit that moves the clock.
   */
  doDeal(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.deal) { f.resetCooldown('death-deal'); return; }

    const v = this.primaryVictim(owner) ?? this.api.getNearestEnemy(f.x, f.y);
    if (!this.alive(v)) {
      f.resetCooldown('death-deal');
      this.api.showFloatingText(f.x, f.y - 46, '🤝 NOBODY TO DEAL WITH', this.hex(DEA.pale));
      return;
    }
    const victim = v as Fighter;

    // ── Appear beside them ──
    const fx = this.fx(owner);
    fx.vanish(f.x, f.y, 30, 380, 10, false);
    const ang = Math.atan2(f.y - victim.y, f.x - victim.x);
    const ax = Phaser.Math.Clamp(victim.x + Math.cos(ang) * DEAL_APPROACH, this.left + 20, this.right - 20);
    const ay = Phaser.Math.Clamp(victim.y + Math.sin(ang) * DEAL_APPROACH, this.top + 20, this.bottom - 20);
    f.setPosition(ax, ay);
    this.body(f).reset(ax, ay);
    fx.vanish(ax, ay, 30, 380, 10, true);

    s.deal = {
      phase: 'shake',
      victim,
      shakeUntil: this.now + DEAL_SHAKE_MS,
      endsAt: 0,
      rawAt0: f.rawDamageTaken,
    };
    if (owner === 'player') this.setDodgeClaim(true);

    this.avatar(owner)?.play('punch', Math.atan2(victim.y - ay, victim.x - ax));
    this.api.showFloatingText(ax, ay - 50, '🤝 DEAL WITH DEATH', this.hex(DEA.gold));
    Sfx.playAt('judgement', ax, { volume: 0.9, rate: 0.7 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'death';
    const npcIs = this.api.npcElementId === 'death';
    // Not an optimisation — a safety catch. A fighter who stops being Death mid-handshake still
    // has a body the kit is holding still, and only this loop ever hands it back.
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateSides(time, delta, playerIs, npcIs);
    this.updateClocks(delta, playerIs, npcIs);
    this.updateShots(delta);
    this.updateHalves(delta);
    this.updateAfterimages();
    this.updateMarks();
    this.updateHospice();
    this.updateGuards();
    this.updateDeals();
    this.updateStuns();
    this.updateMirror();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintClock(playerIs, npcIs);
    this.pushStatuses(playerIs, npcIs);
  }

  /** Anything of this kit's still standing in the world, whoever is currently Death. */
  private hasLiveState(): boolean {
    return this.shots.length > 0 || this.halves.length > 0 || this.afterimages.length > 0
      || this.stunned.size > 0 || this.touched.size > 0
      || BOTH.some((o) => this.marks[o].size > 0 || this.hospice[o].size > 0
        || !!this.sides[o].deal || this.sides[o].dodgeApplied);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Everything he stands in goes under them; the blade, the shots and
    // the nooses go over, because a katana that passes behind a body stops being a threat.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  private updateSides(time: number, delta: number, playerIs: boolean, npcIs: boolean): void {
    void time;
    void delta;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      if (is) continue;
      // Stopped being Death mid-match (Magic borrowing the element, a fresh round sharing the
      // kit): everything he was holding open closes. A running deal is exempt — it has a body
      // parked somewhere and a dodge bonus to hand back, and `updateDeals` does that.
      s.guardUntil = 0;
      s.hasteUntil = 0;
      this.marks[owner].clear();
      this.hospice[owner].clear();
    }
    this.assertDodgeClaim();
  }

  // ── Midnight ───────────────────────────────────────────────────────────────

  /**
   * The passive. One minute of match time per side, counted down only while that side is alive
   * and actually Death — a reaper who has been killed has stopped being anybody's problem.
   */
  private updateClocks(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      if (!is) { s.clockMs = MIDNIGHT_MS; s.clockSpent = false; s.lastToll = 999; continue; }
      if (s.clockSpent) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;

      s.clockMs = Math.max(0, s.clockMs - delta);
      const secs = Math.ceil(s.clockMs / 1000);
      const mark = TOLL_MARKS.find((m) => m === secs);
      if (mark !== undefined && mark < s.lastToll) {
        s.lastToll = mark;
        const mine = owner === 'player';
        this.fx(owner).toll(f.x, f.y, 16, 70 + (30 - Math.min(30, mark)) * 2, 520, 10,
          mine ? DEA.gold : DEA.blood);
        this.api.showFloatingText(f.x, f.y - 58, `🕛 ${mark}`, this.hex(mine ? DEA.gold : DEA.blood));
        Sfx.playAt('clock-tick', f.x, { volume: 0.5 + (1 - mark / 30) * 0.4, rate: 0.7 + (1 - mark / 30) * 0.6 });
      }

      if (s.clockMs > 0) continue;
      this.strikeMidnight(owner);
    }
  }

  /** Twelve. Whoever this side is fighting stops existing. */
  private strikeMidnight(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const victim = this.primaryVictim(owner);
    if (!victim) {
      // Nobody standing there to collect from. Give it a second and ask again rather than
      // burning the passive on an empty arena.
      s.clockMs = 1000;
      return;
    }

    const fx = this.fx(owner);
    fx.reap(victim.x, victim.y, 120, 900, 12);
    fx.toll(f.x, f.y, 10, 220, 900, 11, DEA.blood);
    this.api.spawnHitFlash(victim.x, victim.y, DEA.blood);
    this.api.showFloatingText(victim.x, victim.y - 60, '🕛 MIDNIGHT', this.hex(DEA.blood));
    Sfx.playAt('judgement', victim.x, { volume: 1, rate: 0.55 });
    Sfx.playAt('death-npc', victim.x, { volume: 0.9, rate: 0.7 });

    // Pierce so no invincibility window can hold it off, `netApplied` so an online replica's
    // authoritative-damage gate lets it through and relays it — the same execute route
    // Passion's charm uses, and the only one that actually kills across the wire.
    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });

    // A wave is not one person: in Invasion the minute simply starts again.
    if (this.api.isInvasion && owner === 'player') {
      s.clockMs = MIDNIGHT_MS;
      s.lastToll = 999;
      return;
    }
    s.clockSpent = true;
  }

  // ── Styx Shot ──────────────────────────────────────────────────────────────

  private updateShots(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;

      let spent = false;
      for (const t of this.targetsOf(sh.owner)) {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > STYX_HIT_R + 12 * t.sizeMult) continue;
        this.brand(sh.owner, t);
        spent = true;
        break;
      }

      const gone = spent || this.now >= sh.diesAt
        || sh.x < this.left || sh.x > this.right || sh.y < this.top || sh.y > this.bottom;
      if (!gone) continue;
      if (!spent) this.fx(sh.owner).soot(sh.x, sh.y, 3, 12, 380, 9);
      if (sh.reg) this.api.projectileRegistry.remove(sh.reg);
      this.shots.splice(i, 1);
    }
  }

  private brand(owner: Owner, victim: Fighter): void {
    const cur = this.markOn(owner, victim);
    const stacks = Math.min(STYX_MAX, (cur?.stacks ?? 0) + 1);
    this.marks[owner].set(victim, { stacks, until: this.now + STYX_MS });

    const pct = Math.round(this.stepFor(owner, victim) * stacks * 100);
    this.fx(owner).brand(victim.x, victim.y, 24, 10);
    this.api.spawnHitFlash(victim.x, victim.y, DEA.styx);
    this.api.showFloatingText(victim.x, victim.y - 40, `🌊 STYX ×${stacks}`, this.hex(DEA.styx));
    this.api.showFloatingText(victim.x, victim.y - 24, `−${pct}% SPEED · −${pct}% DAMAGE`, this.hex(DEA.deep));
    Sfx.playAt('status-slow', victim.x, { volume: 0.6, rate: 1 + stacks * 0.12 });
  }

  private updateMarks(): void {
    for (const owner of BOTH) {
      for (const [victim, m] of [...this.marks[owner]]) {
        if (!this.alive(victim) || this.now >= m.until) this.marks[owner].delete(victim);
      }
    }
  }

  // ── Hospice ────────────────────────────────────────────────────────────────

  private updateHospice(): void {
    const wall = Date.now();
    for (const owner of BOTH) {
      for (const [victim, h] of [...this.hospice[owner]]) {
        if (!this.alive(victim) || this.now >= h.until) {
          this.hospice[owner].delete(victim);
          if (this.alive(victim)) {
            this.api.showFloatingText(victim.x, victim.y - 46, '⚱️ THE NOOSE LIFTS', this.hex(DEA.pale));
          }
          continue;
        }
        // Death's own magnitudes are doubled by `stepFor`. Everything owned by another element
        // is only reachable as a duration, so that is what gets doubled — filtered to debuffs,
        // or a noose would also be handing the dying man twice as much regeneration.
        stretchNewEffects(victim, wall, this.now, HOSPICE_AMP, h.snap, isDebuff);
      }
    }
  }

  private hospiceOn(victim: Fighter): number {
    let until = 0;
    for (const owner of BOTH) {
      const h = this.hospice[owner].get(victim);
      if (h && this.now < h.until) until = Math.max(until, h.until);
    }
    return until;
  }

  // ── Disarm's stun ──────────────────────────────────────────────────────────

  /**
   * `earthStunnedUntil` is what husk AI and ArenaScene's own npc override already read, but
   * nothing consumes it for the *player* — so the kit pins the velocity itself, exactly as
   * Hunt, Fate and Paper do. `applyDisarm` is what stops them casting out of it.
   */
  private stun(owner: Owner, t: Fighter, ms: number): void {
    if (t.unstoppable) return;
    // A stun is a negative effect like any other, so the noose doubles it.
    const dur = this.hospice[owner].get(t) && this.now < (this.hospice[owner].get(t)?.until ?? 0)
      ? ms * HOSPICE_AMP : ms;
    const until = this.now + dur;
    t.earthStunnedUntil = Math.max(t.earthStunnedUntil, until);
    t.applyDisarm(dur);
    this.stunned.set(t, Math.max(this.stunned.get(t) ?? 0, until));
    this.api.showFloatingText(t.x, t.y - 40, `💫 DISARMED ${(dur / 1000).toFixed(0)}s`, this.hex(DEA.after));
  }

  private updateStuns(): void {
    for (const [t, until] of [...this.stunned]) {
      if (!this.alive(t) || this.now >= until || t.unstoppable) { this.stunned.delete(t); continue; }
      this.body(t).setVelocity(0, 0);
    }
  }

  // ── Riposte ────────────────────────────────────────────────────────────────

  /** Where the blade is right now for a guarding side: base and tip, in world space. */
  private guardSegment(owner: Owner): { ax: number; ay: number; bx: number; by: number; ang: number } | null {
    const s = this.sides[owner];
    if (this.now >= s.guardUntil) return null;
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    const ang = owner === 'player'
      ? Math.atan2(s.aimY - f.y, s.aimX - f.x)
      : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
    return {
      ax: f.x + Math.cos(ang) * RIPOSTE_NEAR,
      ay: f.y + Math.sin(ang) * RIPOSTE_NEAR,
      bx: f.x + Math.cos(ang) * RIPOSTE_FAR,
      by: f.y + Math.sin(ang) * RIPOSTE_FAR,
      ang,
    };
  }

  private updateGuards(): void {
    for (const owner of BOTH) {
      const seg = this.guardSegment(owner);
      if (!seg) continue;
      const mineIsPlayer = owner === 'player';

      // The shared physics group. Copied first: destroying out of the live array mid-loop
      // steps over whatever slid into the gap.
      for (const obj of this.api.projectiles.getChildren().slice()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (this.distToSegment(p.x, p.y, seg.ax, seg.ay, seg.bx, seg.by) > RIPOSTE_R) continue;
        const b = p.body as Phaser.Physics.Arcade.Body | null;
        const inAng = b && (b.velocity.x || b.velocity.y)
          ? Math.atan2(b.velocity.y, b.velocity.x)
          : seg.ang + Math.PI;
        this.cleave(owner, p.x, p.y, inAng);
        p.destroy();
      }

      // ...and the half of the game's shots that never join a group.
      const theirs: Owner = this.other(owner);
      const midX = (seg.ax + seg.bx) / 2;
      const midY = (seg.ay + seg.by) / 2;
      const reach = (RIPOSTE_FAR - RIPOSTE_NEAR) / 2 + RIPOSTE_R;
      for (const rp of this.api.projectileRegistry.within(theirs, midX, midY, reach)) {
        const px = rp.getX();
        const py = rp.getY();
        if (this.distToSegment(px, py, seg.ax, seg.ay, seg.bx, seg.by) > RIPOSTE_R) continue;
        // No velocity handle out here, so the incoming line is taken from the geometry: it was
        // on its way to the blade, which is all the cleave needs to know.
        this.cleave(owner, px, py, Math.atan2(seg.ay - py, seg.ax - px));
        this.api.projectileRegistry.steal(rp);
      }
    }
  }

  /** One shot becomes two pieces of a shot, thrown wide to either side. */
  private cleave(owner: Owner, x: number, y: number, inAng: number): void {
    const f = this.fighter(owner);
    for (const side of [1, -1] as const) {
      const a = inAng + side * RIPOSTE_DEFLECT;
      this.halves.push({
        owner,
        // Offset onto its own side of the blade before it starts moving, so the two pieces are
        // visibly separating from the first frame rather than overlapping and then splitting.
        x: x + Math.cos(inAng + side * (Math.PI / 2)) * 5,
        y: y + Math.sin(inAng + side * (Math.PI / 2)) * 5,
        vx: Math.cos(a) * HALF_SPEED,
        vy: Math.sin(a) * HALF_SPEED,
        ang: a,
        spin: side * (3 + Math.random() * 4),
        side,
        seed: Math.random() * 999,
        diesAt: this.now + HALF_LIFE_MS,
        color: DEA.pale,
      });
    }
    this.fx(owner).spark(x, y, inAng);
    this.api.showFloatingText(x, y - 20, '🗡️ CUT', this.hex(DEA.blade));
    Sfx.playAt('clang', f.x, { volume: 0.55, rate: 1.35 });
  }

  private updateAfterimages(): void {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      if (this.now >= this.afterimages[i].diesAt) this.afterimages.splice(i, 1);
    }
  }

  private updateHalves(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.ang += h.spin * dt;
      if (this.now < h.diesAt) continue;
      this.halves.splice(i, 1);
    }
  }

  // ── Deal with Death ────────────────────────────────────────────────────────

  private updateDeals(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const d = s.deal;
      if (!d) continue;
      const f = this.fighter(owner);

      if (!this.alive(f)) { this.endDeal(owner, false, true); continue; }

      if (d.phase === 'shake') {
        // He is standing still with his hand out. The enemy is not held — the handshake is a
        // formality, not a grab, and taking their turn away would make Q a stun as well.
        this.body(f).setVelocity(0, 0);
        if (this.now < d.shakeUntil) continue;
        this.settleDeal(owner);
        continue;
      }

      // The dodge is a sustained 33%, not a charge: `rollDodge` spends 0.2 every time it saves
      // him, so it is topped back up each frame for as long as the deal is running.
      if (s.dodgeApplied && f.dodgeChance < DEAL_DODGE) f.dodgeChance = DEAL_DODGE;
      if (this.now < d.endsAt) continue;

      const taken = Math.max(0, f.rawDamageTaken - d.rawAt0);
      this.endDeal(owner, taken < DEAL_TOLL, false);
    }
  }

  /** The handshake is over: he leaves, and the ten seconds start. */
  private settleDeal(owner: Owner): void {
    const s = this.sides[owner];
    const d = s.deal;
    if (!d) return;
    const f = this.fighter(owner);
    const fx = this.fx(owner);

    const away = this.alive(d.victim)
      ? Math.atan2(f.y - d.victim.y, f.x - d.victim.x)
      : Math.random() * Math.PI * 2;
    const anchorX = this.alive(d.victim) ? d.victim.x : f.x;
    const anchorY = this.alive(d.victim) ? d.victim.y : f.y;
    const rx = Phaser.Math.Clamp(anchorX + Math.cos(away) * DEAL_RETREAT, this.left + 24, this.right - 24);
    const ry = Phaser.Math.Clamp(anchorY + Math.sin(away) * DEAL_RETREAT, this.top + 24, this.bottom - 24);

    fx.vanish(f.x, f.y, 30, 380, 10, false);
    f.setPosition(rx, ry);
    this.body(f).reset(rx, ry);
    fx.vanish(rx, ry, 30, 380, 10, true);

    d.phase = 'settled';
    d.endsAt = this.now + DEAL_MS;
    // The clock on the bargain starts when he lets go of their hand, not when he arrived —
    // damage taken during the handshake itself is not part of the deal.
    d.rawAt0 = f.rawDamageTaken;
    f.dodgeChance += DEAL_DODGE;
    s.dodgeApplied = true;
    if (owner === 'player') this.setDodgeClaim(false);

    this.avatar(owner)?.play('flex');
    this.api.showFloatingText(rx, ry - 50, '🤝 STRUCK', this.hex(DEA.gold));
    this.api.showFloatingText(rx, ry - 32, `+33% SPEED · +33% DODGE · <${DEAL_TOLL} DMG`, this.hex(DEA.bone));
    Sfx.playAt('teleport', rx, { volume: 0.85, rate: 0.75 });
  }

  private endDeal(owner: Owner, honoured: boolean, aborted: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.deal = null;
    if (owner === 'player') this.setDodgeClaim(false);
    if (s.dodgeApplied) {
      if (f?.active) f.dodgeChance = Math.max(0, f.dodgeChance - DEAL_DODGE);
      s.dodgeApplied = false;
    }
    if (aborted || !this.alive(f)) return;

    if (!honoured) {
      this.api.showFloatingText(f.x, f.y - 46, '☠️ DEAL BROKEN', this.hex(DEA.blood));
      this.fx(owner).soot(f.x, f.y, 10, 30, 620, 10);
      Sfx.playAt('status-expire', f.x, { volume: 0.8, rate: 0.7 });
      return;
    }

    s.clockMs = Math.max(0, s.clockMs - DEAL_REWARD_MS);
    s.lastToll = 999;
    this.fx(owner).toll(f.x, f.y, 14, 150, 720, 11, DEA.gold);
    this.api.showFloatingText(f.x, f.y - 50, '🕛 DEAL HONOURED', this.hex(DEA.gold));
    this.api.showFloatingText(f.x, f.y - 32, '−10s TO MIDNIGHT', this.hex(DEA.blood));
    Sfx.playAt('clock-tick', f.x, { volume: 0.95, rate: 0.5 });
  }

  // ── The damage mirror ──────────────────────────────────────────────────────

  /**
   * Styx Shot's "15% less damage" has no attacker reference to hang on — `takeDamage` never
   * learns who hit it — so it is worn from the other end, by the person the branded fighter is
   * shooting at. Same stand-in Subterfuge's Bribe and Shadow's Hopelessness use, rewritten from
   * scratch every frame onto a field of its own so it cannot stomp another kit's armour.
   */
  private updateMirror(): void {
    // Cleared outright rather than pruned on death: the set is the kit's only record of who
    // still needs handing back, and a set that never empties would keep `hasLiveState` true
    // (and this whole loop running) for the rest of the match after a single brand.
    for (const f of this.touched) f.deathIncomingMult = 1;
    this.touched.clear();
    for (const owner of BOTH) {
      if (!this.isDeath(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      let worst = 0;
      for (const [victim, m] of this.marks[owner]) {
        if (!this.alive(victim) || this.now >= m.until) continue;
        worst = Math.max(worst, this.stepFor(owner, victim) * m.stacks);
      }
      if (worst <= 0) continue;
      f.deathIncomingMult = Math.max(0.1, 1 - worst);
      this.touched.add(f);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        av?.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        continue;
      }
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (!av) {
        av = new DeathAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const guarding = this.now < s.guardUntil;
      const ang = owner === 'player'
        ? Math.atan2(s.aimY - f.y, s.aimX - f.x)
        : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
      av.setFacing(ang);
      av.setDoom(this.doomOf(owner));
      av.setGuard(guarding);
      // The two-handed guard is the only sustained pose in the kit, so it owns `setHold`
      // outright — resolved from state here rather than at the cast site, or a Disarm mid-guard
      // would drop the blade for good.
      av.setHold(guarding ? 'brace' : null, ang);
      av.setIntensity(this.now < s.hasteUntil || s.deal?.phase === 'settled' ? 1.35 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /**
   * The floor. Everything Death leaves on the ground is a stain rather than an object, so the
   * only thing down here is the trail a Styx shot drips as it crosses the arena.
   */
  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      for (let i = 1; i <= 4; i++) {
        const d = i * 22 + ((this.vizT * 60 + sh.seed) % 22);
        g.fillStyle(tint(DEA.deep), 0.16 - i * 0.03);
        g.fillEllipse(sh.x - Math.cos(ang) * d, sh.y - Math.sin(ang) * d + 12,
          9 - i * 1.4, 4 - i * 0.6);
      }
    }
  }

  /** Shots, cut bullets, brands, nooses and the held blade. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Disarm afterimages ──
    // Over the fighters on purpose: it fades but never moves, so for most of a second the arc
    // and the person standing stunned inside it are the same picture.
    for (const im of this.afterimages) {
      const k = Phaser.Math.Clamp((this.now - im.bornAt) / (im.diesAt - im.bornAt), 0, 1);
      slashArc(g, this.col(im.owner), im.x, im.y, im.ang, DISARM_HALF,
        DISARM_REACH * 0.42, DISARM_REACH, (1 - k) * 0.75,
        { color: DEA.after, seed: im.seed, lines: 3 });
    }

    // ── Styx shots ──
    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      // A thrown handful of river: a smear behind it and a heavy leading drop.
      g.fillStyle(shade(tint(DEA.deep), 1), 0.28);
      g.fillPoints([
        new Phaser.Geom.Point(sh.x - Math.cos(ang) * 30, sh.y - Math.sin(ang) * 30),
        new Phaser.Geom.Point(sh.x + Math.cos(ang + 1.9) * 7, sh.y + Math.sin(ang + 1.9) * 7),
        new Phaser.Geom.Point(sh.x + Math.cos(ang - 1.9) * 7, sh.y + Math.sin(ang - 1.9) * 7),
      ], true);
      g.fillStyle(tint(DEA.styx), 0.85);
      g.fillEllipse(sh.x, sh.y, 11, 13);
      g.fillStyle(tint(DEA.edge), 0.5);
      g.fillCircle(sh.x - 2, sh.y - 2, 2.2);
      for (let i = 0; i < 3; i++) {
        const d = 8 + i * 7 + ((this.vizT * 90 + sh.seed) % 8);
        g.fillStyle(tint(DEA.styx), 0.3 - i * 0.08);
        g.fillCircle(sh.x - Math.cos(ang) * d, sh.y - Math.sin(ang) * d + i, 3 - i * 0.6);
      }
    }

    // ── Cut bullets ──
    for (const h of this.halves) {
      const k = Phaser.Math.Clamp((h.diesAt - this.now) / HALF_LIFE_MS, 0, 1);
      slicedBullet(g, this.col(h.owner), h.x, h.y, h.ang, 13, k * 0.95,
        { seed: h.seed, side: h.side, color: h.color });
    }

    // ── Brands and nooses ──
    for (const owner of BOTH) {
      const tint = this.col(owner);
      for (const [victim, m] of this.marks[owner]) {
        if (!this.alive(victim) || this.now >= m.until) continue;
        const fade = Phaser.Math.Clamp((m.until - this.now) / 600, 0, 1);
        styxBrand(g, tint, victim.x, victim.y, 20 * victim.sizeMult, this.vizT, m.stacks, fade * 0.95);
      }
      for (const [victim, h] of this.hospice[owner]) {
        if (!this.alive(victim) || this.now >= h.until) continue;
        const fade = Phaser.Math.Clamp((h.until - this.now) / 900, 0, 1);
        noose(g, tint, victim.x, victim.y - 34 * victim.sizeMult, 74,
          Math.sin(this.vizT * 1.3 + h.seed) * 7, fade * 0.95);
      }
    }

    // ── The guard ──
    // The avatar already holds the blade, so what is drawn here is the thing the blade is
    // doing: a faint plane of steel along the segment that shots are actually tested against.
    for (const owner of BOTH) {
      const seg = this.guardSegment(owner);
      if (!seg) continue;
      const tint = this.col(owner);
      const s = this.sides[owner];
      const k = Phaser.Math.Clamp((s.guardUntil - this.now) / RIPOSTE_MS, 0, 1);
      const shimmer = 0.3 + 0.2 * Math.sin(this.vizT * 9);
      g.lineStyle(RIPOSTE_R * 1.4, tint(DEA.blade), 0.06 + k * 0.05);
      g.lineBetween(seg.ax, seg.ay, seg.bx, seg.by);
      g.lineStyle(1.6, tint(DEA.edge), (0.35 + shimmer) * k);
      g.lineBetween(seg.ax, seg.ay, seg.bx, seg.by);
      // Two motes riding the edge, so a held blade never looks like a static line.
      for (let i = 0; i < 2; i++) {
        const t = ((this.vizT * 0.9 + i * 0.5) % 1);
        g.fillStyle(tint(DEA.edge), (1 - t) * 0.6 * k);
        g.fillCircle(seg.ax + (seg.bx - seg.ax) * t, seg.ay + (seg.by - seg.ay) * t, 2.4);
      }
    }

    // ── The handshake ──
    for (const owner of BOTH) {
      const d = this.sides[owner].deal;
      if (!d || d.phase !== 'shake' || !this.alive(d.victim)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const mx = (f.x + d.victim.x) / 2;
      const my = (f.y + d.victim.y) / 2;
      const shake = Math.sin(this.vizT * 26) * 3;
      g.lineStyle(4, tint(DEA.void_), 0.8);
      g.lineBetween(f.x, f.y, mx, my + shake);
      g.lineBetween(d.victim.x, d.victim.y, mx, my + shake);
      g.fillStyle(tint(DEA.bone), 0.9);
      g.fillCircle(mx, my + shake, 7);
      g.fillStyle(tint(DEA.gold), 0.55 + 0.35 * Math.sin(this.vizT * 12));
      g.fillCircle(mx, my + shake, 3.4);
      // A shred of the contract fluttering off the grip.
      for (let i = 0; i < 3; i++) {
        const a = this.vizT * 2 + i * 2.1;
        g.fillStyle(tint(DEA.pale), 0.4);
        g.fillRect(mx + Math.cos(a) * 16, my + Math.sin(a) * 12 - 6 + shake, 5, 3);
      }
    }
  }

  // ── The dial ───────────────────────────────────────────────────────────────

  /**
   * The passive, in the corner. Drawn for a Death *npc* too, in blood rather than gold — a
   * minute you cannot see coming is not a mechanic, it is an ambush.
   */
  private paintClock(playerIs: boolean, npcIs: boolean): void {
    const owner: Owner | null = playerIs ? 'player' : npcIs ? 'npc' : null;
    if (!owner) {
      this.hudGfx?.setVisible(false);
      this.hudTitle?.setVisible(false);
      this.hudCount?.setVisible(false);
      return;
    }

    const { scene } = this.api;
    const cx = this.api.width - CLOCK_MARGIN_X;
    const cy = CLOCK_Y + (this.api.isInvasion ? CLOCK_INVASION_DY : 0);
    const mine = owner === 'player';
    const accent = mine ? DEA.gold : DEA.blood;

    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(CLOCK_DEPTH).setScrollFactor(0);
    if (!this.hudTitle) {
      this.hudTitle = scene.add.text(cx, cy - CLOCK_R - 13, 'MIDNIGHT', {
        fontSize: '11px', color: this.hex(accent), fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(CLOCK_DEPTH + 1).setScrollFactor(0);
    }
    if (!this.hudCount) {
      this.hudCount = scene.add.text(cx, cy + CLOCK_R + 6, '', {
        fontSize: '15px', color: '#e9e3d2', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(CLOCK_DEPTH + 1).setScrollFactor(0);
    }

    const s = this.sides[owner];
    const frac = Phaser.Math.Clamp(s.clockMs / MIDNIGHT_MS, 0, 1);
    const secs = s.clockSpent ? 0 : Math.ceil(s.clockMs / 1000);

    const g = this.hudGfx.setVisible(true);
    g.clear();
    // A shroud behind the dial so it never sits on bare arena, thrashing harder as it runs out.
    g.fillStyle(DEA.void_, 0.55);
    g.fillCircle(cx, cy, CLOCK_R + 9);
    clockFace(g, this.col(owner), cx, cy, CLOCK_R, frac, 1,
      { hostile: !mine || frac < 0.08, seed: 7 });

    this.hudTitle.setVisible(true).setPosition(cx, cy - CLOCK_R - 13)
      .setColor(this.hex(accent))
      .setText(mine ? 'MIDNIGHT' : 'YOUR MIDNIGHT');
    this.hudCount.setVisible(true).setPosition(cx, cy + CLOCK_R + 6)
      .setColor(this.hex(secs <= 10 ? DEA.blood : DEA.bone))
      .setText(s.clockSpent ? '—' : `${secs}s`);
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;
    const s = this.sides.player;
    const foe = this.sides.npc;

    // The minute, from both ends. Yours sits with the passives; theirs sits at the very top of
    // the tray, because there is nothing on the screen that matters more.
    this.api.setStatusIndicator('death-midnight', playerIs ? {
      name: 'Midnight', emoji: '🕛', color: DEA.gold,
      description: 'Your doomsday clock. When it reaches zero your enemy dies where they stand, with no catch. Honouring a Deal with Death takes 10 seconds off it.',
      count: Math.ceil(s.clockMs / 1000), suffix: 's', priority: 152,
    } : null);

    this.api.setStatusIndicator('death-doomed', npcIs && !foe.clockSpent ? {
      name: 'Doomed', emoji: '⏳', color: DEA.blood,
      description: 'Their clock is running. When it strikes midnight you die instantly — there is no save and no counterplay except killing them first.',
      count: Math.ceil(foe.clockMs / 1000), suffix: 's', priority: 0,
    } : null);

    // Branded — on you, by them.
    const onMe = this.markOn('npc', p);
    const myPct = onMe ? Math.round(this.stepFor('npc', p) * onMe.stacks * 100) : 0;
    this.api.setStatusIndicator('death-styx-on-me', onMe ? {
      name: 'Styx', emoji: '🌊', color: DEA.styx,
      description: `The river is in you: ${myPct}% slower and ${myPct}% less damage against whoever branded you. Three stacks, three seconds each, refreshed by every shot.`,
      until: onMe.until, count: onMe.stacks, priority: 8,
    } : null);

    // Branded — by you, on them. Worth a box of its own: it is the whole reason you survive.
    let theirs: { stacks: number; until: number; pct: number } | null = null;
    if (playerIs) {
      for (const [victim, m] of this.marks.player) {
        if (!this.alive(victim) || this.now >= m.until) continue;
        const pct = Math.round(this.stepFor('player', victim) * m.stacks * 100);
        if (!theirs || pct > theirs.pct) theirs = { stacks: m.stacks, until: m.until, pct };
      }
    }
    this.api.setStatusIndicator('death-styx-out', theirs ? {
      name: 'Branded', emoji: '⚰️', color: DEA.deep,
      description: `Your enemy is carrying ${theirs.stacks} Styx stack${theirs.stacks === 1 ? '' : 's'} — ${theirs.pct}% slower, and ${theirs.pct}% less damage against you.`,
      until: theirs.until, count: theirs.stacks, priority: 118,
    } : null);

    // Hospice, from both ends.
    const nooseOnMe = this.hospiceOn(p);
    this.api.setStatusIndicator('death-hospice-on-me', nooseOnMe > 0 ? {
      name: 'Hospice', emoji: '⚱️', color: DEA.rope,
      description: 'A noose is hanging over you. Every negative effect on you counts double — twice the slow, twice the damage cut, twice the duration on every debuff you pick up.',
      until: nooseOnMe, priority: 2,
    } : null);

    let nooseOut = 0;
    if (playerIs) for (const [victim, h] of this.hospice.player) {
      if (this.alive(victim)) nooseOut = Math.max(nooseOut, h.until);
    }
    this.api.setStatusIndicator('death-hospice-out', nooseOut > this.now ? {
      name: 'Hospice', emoji: '⚱️', color: DEA.rope,
      description: 'Your noose is up. Everything bad you put on them is worth double for as long as it hangs there.',
      until: nooseOut, priority: 120,
    } : null);

    this.api.setStatusIndicator('death-guard', playerIs && this.now < s.guardUntil ? {
      name: 'Riposte', emoji: '🗡️', color: DEA.blade,
      description: 'The katana is out along your cursor. Any shot that reaches it is cut in half and both pieces go wide.',
      until: s.guardUntil, priority: 116,
    } : null);

    this.api.setStatusIndicator('death-haste', playerIs && this.now < s.hasteUntil ? {
      name: 'Quickened', emoji: '🌀', color: DEA.after,
      description: 'A landed Disarm has you moving 30% faster.',
      until: s.hasteUntil, priority: 130,
    } : null);

    const deal = playerIs ? s.deal : null;
    const taken = deal && deal.phase === 'settled'
      ? Math.max(0, Math.round(this.api.player.rawDamageTaken - deal.rawAt0)) : 0;
    this.api.setStatusIndicator('death-deal', deal ? {
      name: deal.phase === 'shake' ? 'Shaking Hands' : 'Deal with Death', emoji: '🤝', color: DEA.gold,
      description: deal.phase === 'shake'
        ? 'You are shaking their hand. The bargain starts the moment you let go.'
        : `+33% speed and +33% dodge. Reach the end of the 10 seconds having taken under ${DEAL_TOLL} damage and the clock jumps 10 seconds closer to midnight. You have taken ${taken}.`,
      until: deal.phase === 'shake' ? deal.shakeUntil : deal.endsAt,
      count: deal.phase === 'settled' ? taken : undefined,
      suffix: deal.phase === 'settled' ? `/${DEAL_TOLL}` : undefined,
      priority: 112,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /**
   * Styx's slow (from the *other* side's brands) and Death's own two speed buffs, in one
   * number. Pulled by ArenaScene rather than pushed from `update()`, which runs after the
   * frame's movement has already resolved.
   */
  private speedMultFor(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 1;
    let mult = 1;

    const m = this.markOn(this.other(owner), f);
    if (m) mult *= Math.max(0.1, 1 - this.stepFor(this.other(owner), f) * m.stacks);

    if (this.isDeath(owner)) {
      const s = this.sides[owner];
      if (this.now < s.hasteUntil) mult *= DISARM_HASTE;
      if (s.deal?.phase === 'settled') mult *= DEAL_HASTE;
      // Stood still for the handshake — the body is the kit's for those frames.
      if (s.deal?.phase === 'shake') mult = 0;
    }
    return mult;
  }

  /** True while the handshake owns the caster's body — the npc must not try to walk. */
  isBusy(owner: Owner): boolean { return this.sides[owner].deal?.phase === 'shake'; }
  isGuarding(owner: Owner): boolean { return this.now < this.sides[owner].guardUntil; }
  isDealing(owner: Owner): boolean { return !!this.sides[owner].deal; }
  /** Stacks this side currently has on `f`, for the bot's "don't overcap" check. */
  markStacks(owner: Owner, f: Fighter): number { return this.markOn(owner, f)?.stacks ?? 0; }
  hasHospiceOut(owner: Owner): boolean {
    for (const [victim, h] of this.hospice[owner]) {
      if (this.alive(victim) && this.now < h.until) return true;
    }
    return false;
  }
  /** Seconds left on that side's doomsday clock. */
  clockSeconds(owner: Owner): number { return Math.ceil(this.sides[owner].clockMs / 1000); }

  /**
   * Ability tray fill. Three of the five spend most of their life showing a state rather than
   * a cooldown — the blade being held out, the noose hanging, and the ten seconds of a deal.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'death-riposte' && time < s.guardUntil) {
      return Phaser.Math.Clamp((s.guardUntil - time) / RIPOSTE_MS, 0, 1);
    }
    if (abilityId === 'death-hospice') {
      let until = 0;
      for (const [victim, h] of this.hospice.player) {
        if (this.alive(victim)) until = Math.max(until, h.until);
      }
      if (time < until) return Phaser.Math.Clamp((until - time) / HOSPICE_MS, 0, 1);
    }
    if (abilityId === 'death-deal' && s.deal) {
      if (s.deal.phase === 'shake') return 0.1;
      return 0.1 + 0.9 * Phaser.Math.Clamp((s.deal.endsAt - time) / DEAL_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
