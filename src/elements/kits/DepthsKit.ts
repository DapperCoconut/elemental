import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  DPT, DepthsAvatar, DepthsColorFn, DepthsFx, FISH_COLOR, FISH_EMOJI, FISH_LABEL,
  FISH_PROFILE, FishKind, algaeOrb, bubbleColumn, darkPuddle, fishBody,
  oxygenBar, piranha as drawPiranha, sharkBody,
} from './DepthsVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;

// ── Passive: the anglerfish lure ─────────────────────────────────────────────
/** How long you have to stand still before the water starts taking you. */
const LURE_DELAY_MS = 450;
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 220;
/** How far in front of you the fake orb hangs — far enough that a biter is *beside* you. */
const LURE_STANDOFF = 56;
const LURE_BITE_R = 44;
/** The reward for a bite, and the window it lasts. */
const BOOST_MULT = 1.5;
const BOOST_MS = 1000;
/** After a bite, the lure can't be re-armed instantly — otherwise one stand is infinite boost. */
const LURE_REARM_MS = 1600;

// ── Piranha (Click) ──────────────────────────────────────────────────────────
const PIRANHA_SPEED = 640;
const PIRANHA_LIFE_MS = 1700;
const PIRANHA_HIT_R = 24;
const LATCH_MS = 3000;
const LATCH_DPS = 3;
const MAX_LATCH = 5;

// ── Lungfish Strike (E) ──────────────────────────────────────────────────────
const DASH_SPEED = 720;
const DASH_MS = 170;
const SLASH_REACH = 96;
const SLASH_HALF_WIDTH = 44;
const SLASH_DAMAGE = 15;
const SLASH_DAMAGE_BOOSTED = 30;
/** Air in the lungs, then how hard the water starts pressing. */
const O2_DRAIN_MS = 5000;
const DROWN_DPS = 12;
const DROWN_TOTAL_MS = 12000;
const PUDDLE_R = 48;
/** A puddle any closer than this to the victim isn't a run, it's a step. */
const PUDDLE_MIN_DIST = 280;

// ── Eutrophication (R) ───────────────────────────────────────────────────────
const ALGAE_COUNT = 12;
const ALGAE_HEAL = 12;
const ALGAE_R = 28;
const ALGAE_LIFE_MS = 25000;

// ── Angler (F) ───────────────────────────────────────────────────────────────
const FISH_CATCH_MS = 3000;
/** Every hit taken while the line is out drags the catch back by a second. */
const FISH_DAMAGE_PENALTY_MS = 1000;
/** How long the NPC admires its catch before throwing it. */
const NPC_THROW_DELAY_MS = 600;

const ALL_FISH: FishKind[] = ['icefish', 'barracuda', 'pufferfish', 'bombfish', 'gulper'];

const ICEFISH_DAMAGE = 15;
const ICEFISH_SLOW_MULT = 0.8;
const ICEFISH_SLOW_MS = 5000;
const BARRACUDA_DAMAGE = 25;
const PUFFER_DAMAGE = 15;
const PUFFER_LIFE_MS = 6000;
const PUFFER_REHIT_MS = 700;
const BOMBFISH_DAMAGE = 20;
const BOMBFISH_R = 92;
const GULPER_DPS = 10;

/** Speed, hit radius and lifetime for each thrown fish. */
const FISH_STATS: Record<FishKind, { speed: number; r: number; life: number; len: number }> = {
  icefish: { speed: 620, r: 22, life: 2200, len: 34 },
  barracuda: { speed: 800, r: 20, life: 2000, len: 46 },
  pufferfish: { speed: 400, r: 30, life: PUFFER_LIFE_MS, len: 34 },
  bombfish: { speed: 540, r: 24, life: 2400, len: 32 },
  gulper: { speed: 460, r: 30, life: 5000, len: 52 },
};

// ── Megalodon (Q) ────────────────────────────────────────────────────────────
const SHARK_SPEED = 780;
const SHARK_LEN = 210;
/** How far behind the caster it surfaces, so it sweeps *through* where you are standing. */
const SHARK_SPAWN_BACK = 150;
const SHARK_MOUTH_R = 62;
const SHARK_HOLD_MS = 8000;
/** Nothing in its mouth: it still beaches itself, but only long enough to be seen leaving. */
const SHARK_EMPTY_HOLD_MS = 1400;
const SHARK_DPS = 8;

// ── World objects ────────────────────────────────────────────────────────────

/** A piranha still swimming toward somebody. */
interface Swimmer {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  wig: number;
}

/** A piranha that arrived, and is now chewing. */
interface Latch {
  owner: Owner;
  victim: Fighter;
  until: number;
  /** Where it sits on the orbit around the victim, and its own chew phase. */
  orbit: number;
  chew: number;
}

/** Somebody with no air, the puddle that would give it back, and the clock on both. */
interface Drown {
  owner: Owner;
  victim: Fighter;
  /** 1 = a full breath, 0 = the water wins. */
  o2: number;
  endsAt: number;
  px: number;
  py: number;
  seed: number;
  /** Milliseconds since the last devastating tick. */
  tick: number;
}

/**
 * A real healing orb. It feeds whoever gets there first, which is the whole ability — `owner`
 * is carried only so the bloom is painted through the right side's skin.
 */
interface Algae {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  seed: number;
}

/** A thrown fish. What it does on arrival is entirely a function of `kind`. */
interface FishProj {
  owner: Owner;
  kind: FishKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  wig: number;
  /** Last time each fighter was hit — pierce and bounce both need per-target memory. */
  hits: Map<Fighter, number>;
  /** Gulper eel only: who is inside it. */
  swallowed: Fighter | null;
  eatAccum: number;
}

interface Shark {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  phase: 'rush' | 'hold';
  until: number;
  swallowed: Fighter[];
  /** Milliseconds since the last chew tick. */
  tick: number;
  gape: number;
}

interface Side {
  owner: Owner;
  // Passive
  stillMs: number;
  /** 0–1 fade into the water. */
  hidden: number;
  /** True once the fade is deep enough for the lure to be worth looking at. */
  lureOn: boolean;
  lureX: number;
  lureY: number;
  lureSeed: number;
  lureArmedAt: number;
  boostUntil: number;
  /** Latched so the fighter's alpha is handed back exactly once. */
  alphaOwned: boolean;
  /** Same, for the health bar — a green bar floating over nothing gives the whole thing away. */
  barHidden: boolean;
  // E
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  // F
  fishing: boolean;
  fishRemain: number;
  fish: FishKind | null;
  /** `rawDamageTaken` as of the last frame — the poll behind the +1s penalty. */
  lastRaw: number;
  npcThrowAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    stillMs: 0, hidden: 0, lureOn: false, lureX: 0, lureY: 0, lureSeed: 0, lureArmedAt: 0,
    boostUntil: 0, alphaOwned: false, barHidden: false,
    dashUntil: 0, dashVx: 0, dashVy: 0,
    fishing: false, fishRemain: 0, fish: null, lastRaw: 0, npcThrowAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DepthsArenaApi {
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
  /** Skins: maps a Depths visual colour through that side's equipped skin. */
  depthsColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── DepthsKit ────────────────────────────────────────────────────────────────

export class DepthsKit {
  private api: DepthsArenaApi;

  // ── Visuals ──
  private readonly pcol: DepthsColorFn;
  private readonly ncol: DepthsColorFn;
  private readonly pfx: DepthsFx;
  private readonly nfx: DepthsFx;
  private playerAvatar: DepthsAvatar | null = null;
  private npcAvatar: DepthsAvatar | null = null;
  /** Puddles, blooms and lures: on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Everything swimming, plus the oxygen bars — over the fighters, because it obscures them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private swimmers: Swimmer[] = [];
  private latches: Latch[] = [];
  private latchAccum = new Map<Fighter, number>();
  /** Fractional chew damage carried between frames, per victim. */
  private chewCarry = new Map<Fighter, number>();
  private drowns: Drown[] = [];
  private algae: Algae[] = [];
  private fishes: FishProj[] = [];
  private sharks: Shark[] = [];
  /** Icefish chill: fighter → the timestamp it wears off. */
  private slowed = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  /** The NPC's aim, latched from its own casts. */
  private npcAimX = 0;
  private npcAimY = 0;

  constructor(api: DepthsArenaApi) {
    this.api = api;
    this.pcol = (base) => api.depthsColor('player', base);
    this.ncol = (base) => api.depthsColor('npc', base);
    this.pfx = new DepthsFx(api.scene, this.pcol);
    this.nfx = new DepthsFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DepthsFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DepthsColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

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

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  /** Every fighter in the match, for the effects that don't care whose side anybody is on. */
  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (this.alive(f) && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private avatar(owner: Owner): DepthsAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private isDepths(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'depths' : this.api.npcElementId === 'depths';
  }

  /** Whether a fighter's body currently belongs to something else — an eel, or a shark. */
  private isHeld(f: Fighter): boolean {
    return this.fishes.some((p) => p.swallowed === f) || this.sharks.some((s) => s.swallowed.includes(f));
  }

  private isStill(f: Fighter): boolean {
    const b = this.body(f);
    return Math.hypot(b.velocity.x, b.velocity.y) < 14;
  }

  /** Perpendicular distance from a point to the segment a→b — the Lungfish's slash test. */
  private distToSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Phaser.Math.Distance.Between(ax, ay, px, py);
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(ax + dx * t, ay + dy * t, px, py);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything written onto a fighter has to be handed back, or the next match starts with
    // somebody permanently transparent or permanently stuck in a shark.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      if (this.sides[owner].alphaOwned) f.setAlpha(1);
      if (this.sides[owner].barHidden && f.active && f.hp > 0) f.setHealthBarVisible(true);
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.swimmers = [];
    this.latches = [];
    this.latchAccum.clear();
    this.chewCarry.clear();
    this.drowns = [];
    this.algae = [];
    this.fishes = [];
    this.sharks = [];
    this.slowed.clear();
    this.aimX = 0;
    this.aimY = 0;
    this.npcAimX = 0;
    this.npcAimY = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'depths') return;
    void time;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('depths-piranha', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('depths-lungfish', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('depths-eutrophication', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      // The throw is a recast, not a second cast: a landed fish has already paid the
      // cooldown, and routing it back through `castAbility` would strand it in your mouth.
      if (this.sides.player.fish) this.throwFish('player', mouseX, mouseY);
      else p.castAbility('depths-angler', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('depths-megalodon', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Piranha. No impact damage at all; everything it is worth happens after it lands. */
  doPiranha(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const sx = f.x + Math.cos(ang) * 26;
    const sy = f.y + Math.sin(ang) * 26;
    this.swimmers.push({
      owner, x: sx, y: sy,
      vx: Math.cos(ang) * PIRANHA_SPEED, vy: Math.sin(ang) * PIRANHA_SPEED,
      diesAt: this.now + PIRANHA_LIFE_MS, wig: Math.random() * 6,
    });

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).bubbles(sx, sy, 4, 14, DPT.foam, 420, 7);
  }

  /**
   * E — Lungfish Strike. The dash and the slash are the small half; the drowning is the ability,
   * and the slash is what buys it — a whiff spends the sixteen seconds and starts nothing. The
   * drown lands on whoever the blade actually reached, nearest first, so a strike that catches
   * two bodies still only ever puts one oxygen bar on screen.
   */
  doLungfish(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const s = this.side(owner);
    const boosted = s.boostUntil > this.now;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    s.dashUntil = this.now + DASH_MS;
    s.dashVx = Math.cos(ang) * DASH_SPEED;
    s.dashVy = Math.sin(ang) * DASH_SPEED;

    const ex = f.x + Math.cos(ang) * SLASH_REACH;
    const ey = f.y + Math.sin(ang) * SLASH_REACH;
    const dmg = boosted ? SLASH_DAMAGE_BOOSTED : SLASH_DAMAGE;
    let victim: Fighter | null = null;
    let victimDist = Infinity;
    for (const t of this.targetsOf(owner)) {
      if (this.distToSegment(f.x, f.y, ex, ey, t.x, t.y) > SLASH_HALF_WIDTH) continue;
      t.takeDamage(dmg);
      this.api.spawnHitFlash(t.x, t.y, DPT.cyan);
      this.fx(owner).chomp(t.x, t.y, ang, 24, DPT.blood);
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < victimDist) { victimDist = d; victim = t; }
    }

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).slashArc(f.x, f.y, ang, SLASH_REACH * 0.8, boosted ? DPT.lure : DPT.cyan);
    if (boosted) this.api.showFloatingText(f.x, f.y - 50, '🔴 FED', this.hex(DPT.blood));

    if (victim) this.startDrown(owner, victim);
    else this.api.showFloatingText(f.x, f.y - 46, '💦 MISSED', this.hex(DPT.trench));
  }

  /** R — Eutrophication. The only ability in the kit that helps the person it is aimed at. */
  doEutrophication(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    const placed: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < ALGAE_COUNT; i++) {
      let x = 0;
      let y = 0;
      // Ten tries at a spot that isn't on top of one already down; the bloom should cover
      // the arena, not pile up in a corner.
      for (let attempt = 0; attempt < 10; attempt++) {
        x = Phaser.Math.Between(this.left + 40, this.right - 40);
        y = Phaser.Math.Between(this.top + 40, this.bottom - 40);
        if (placed.every((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) > 80)) break;
      }
      placed.push({ x, y });
      this.algae.push({ owner, x, y, until: this.now + ALGAE_LIFE_MS, seed: Math.random() * 999 });
    }

    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 20, 240, DPT.algae, 700);
    this.api.showFloatingText(f.x, f.y - 50, '🌿 EUTROPHICATION', this.hex(DPT.algae));
    Sfx.playAt('bloom', f.x, { volume: 0.8 });
  }

  /** F — Angler. Casting starts the wait; the recast throws whatever came up. */
  doAngler(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const s = this.side(owner);
    if (s.fish) { this.throwFish(owner, tx, ty); return; }
    if (s.fishing) return;

    s.fishing = true;
    s.fishRemain = FISH_CATCH_MS;
    s.lastRaw = f.rawDamageTaken;
    this.avatar(owner)?.play('sweep', Math.atan2(ty - f.y, tx - f.x));
    this.api.showFloatingText(f.x, f.y - 46, '🎣 CAST OUT', this.hex(DPT.foam));
    Sfx.playAt('splash', f.x, { volume: 0.5, rate: 1.3 });
  }

  /** Q — Megalodon. Surfaces behind you and takes the line you were pointing along with it. */
  doMegalodon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    // One shark per side. A second would only ever steal the first one's mouthful.
    if (this.sharks.some((s) => s.owner === owner)) return;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.sharks.push({
      owner,
      x: f.x - Math.cos(ang) * SHARK_SPAWN_BACK,
      y: f.y - Math.sin(ang) * SHARK_SPAWN_BACK,
      ang,
      vx: Math.cos(ang) * SHARK_SPEED,
      vy: Math.sin(ang) * SHARK_SPEED,
      phase: 'rush',
      until: 0,
      swallowed: [],
      tick: 0,
      gape: 1,
    });

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 20, 180, DPT.trench, 640);
    this.fx(owner).bubbles(f.x, f.y, 14, 70, DPT.foam, 800, 7);
    this.api.showFloatingText(f.x, f.y - 54, '🦈 MEGALODON', this.hex(DPT.shark));
    Sfx.playAt('roar', f.x, { volume: 0.95, rate: 0.55 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'depths';
    const npcIs = this.api.npcElementId === 'depths';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isDepths(owner)) continue;
      this.updateDash(owner, time);
      this.updateLure(owner, time, delta);
      this.updateFishing(owner, time, delta);
    }

    this.updateSwimmers(time, delta);
    this.updateLatches(time, delta);
    this.updateFishProjectiles(time, delta);
    this.updateSharks(time, delta);
    this.updateDrowns(time, delta);
    this.updateAlgae(time);
    this.updateSlows(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintAir(time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Everything on the floor goes under them; everything swimming
    // goes over, because a fish that passes behind a body reads as a decal.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Passive: the lure ──────────────────────────────────────────────────────

  /**
   * The whole passive. Standing still fades the body into the water and leaves an orb that is
   * indistinguishable from a real Eutrophication heal — deliberately, since the AI's rule for
   * both is the same and telling them apart is the opponent's problem.
   */
  private updateLure(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) {
      // A dead fighter has already had its bar hidden by the death path; only the alpha,
      // which nothing else owns, is worth handing back here.
      if (s.alphaOwned && f) { f.setAlpha(1); s.alphaOwned = false; }
      s.barHidden = false;
      s.hidden = 0;
      s.lureOn = false;
      s.stillMs = 0;
      return;
    }

    // Being carried is not standing still — an eel does the moving for you.
    const still = this.isStill(f) && !this.isHeld(f);
    if (still) s.stillMs += delta; else s.stillMs = 0;

    const want = s.stillMs > LURE_DELAY_MS && time >= s.lureArmedAt ? 1 : 0;
    const step = delta / (want ? FADE_IN_MS : FADE_OUT_MS);
    s.hidden = Phaser.Math.Clamp(s.hidden + (want ? step : -step), 0, 1);

    if (s.hidden > 0.02) {
      f.setAlpha(1 - s.hidden);
      s.alphaOwned = true;
    } else if (s.alphaOwned) {
      f.setAlpha(1);
      s.alphaOwned = false;
    }

    const wantBarHidden = s.hidden > 0.85;
    if (wantBarHidden !== s.barHidden) {
      s.barHidden = wantBarHidden;
      f.setHealthBarVisible(!wantBarHidden);
    }

    if (s.hidden < 0.3) { s.lureOn = false; return; }

    if (!s.lureOn) {
      s.lureOn = true;
      s.lureSeed = Math.random() * 999;
    }
    // The orb hangs between you and whoever is coming, so a biter ends up beside you rather
    // than on top of you — the difference between a free burst and a free trade.
    const e = this.enemyOf(owner);
    const ang = e ? Math.atan2(e.y - f.y, e.x - f.x) : -Math.PI / 2;
    s.lureX = Phaser.Math.Clamp(f.x + Math.cos(ang) * LURE_STANDOFF, this.left + 10, this.right - 10);
    s.lureY = Phaser.Math.Clamp(f.y + Math.sin(ang) * LURE_STANDOFF, this.top + 10, this.bottom - 10);

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, s.lureX, s.lureY) > LURE_BITE_R) continue;
      this.bite(owner, t);
      break;
    }
  }

  /** Something came to eat the light. */
  private bite(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.boostUntil = this.now + BOOST_MS;
    s.lureOn = false;
    s.hidden = 0;
    s.stillMs = 0;
    s.lureArmedAt = this.now + LURE_REARM_MS;
    if (s.alphaOwned && f) { f.setAlpha(1); s.alphaOwned = false; }

    const fx = this.fx(owner);
    fx.chomp(s.lureX, s.lureY, Math.atan2(f.y - victim.y, f.x - victim.x), 28, DPT.lure);
    fx.ring(f.x, f.y, 10, 90, DPT.lure, 420);
    this.api.showFloatingText(f.x, f.y - 50, '🎣 BITE!', this.hex(DPT.lure));
    this.api.showFloatingText(victim.x, victim.y - 40, '❗', this.hex(DPT.blood));
    Sfx.playAt('bubble', f.x, { volume: 0.9, rate: 0.8 });
  }

  /** The Lungfish dash. Applied post-movement, so WASD can't cancel it mid-flight. */
  private updateDash(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dashUntil = 0; return; }
    this.body(f).setVelocity(s.dashVx, s.dashVy);
  }

  // ── Piranha ────────────────────────────────────────────────────────────────

  private updateSwimmers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.swimmers.length - 1; i >= 0; i--) {
      const p = this.swimmers[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wig += dt * 16;

      let landed: Fighter | null = null;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= PIRANHA_HIT_R) { landed = t; break; }
      }

      if (landed) {
        this.swimmers.splice(i, 1);
        this.latchOn(p.owner, landed);
        continue;
      }
      if (time >= p.diesAt || p.x < this.left || p.x > this.right || p.y < this.top || p.y > this.bottom) {
        this.swimmers.splice(i, 1);
        this.fx(p.owner).bubbles(p.x, p.y, 3, 12, DPT.foam, 340, 7);
      }
    }
  }

  /** A piranha arrives. Past five on one body the newest one just shoulders the oldest aside. */
  private latchOn(owner: Owner, victim: Fighter): void {
    const mine = this.latches.filter((l) => l.victim === victim);
    if (mine.length >= MAX_LATCH) {
      const oldest = mine.reduce((a, b) => (a.until <= b.until ? a : b));
      oldest.until = this.now + LATCH_MS;
      oldest.owner = owner;
    } else {
      this.latches.push({
        owner, victim, until: this.now + LATCH_MS,
        orbit: Math.random() * Math.PI * 2, chew: Math.random() * 6,
      });
    }
    this.fx(owner).chomp(victim.x, victim.y, Math.random() * Math.PI * 2, 20, DPT.blood);
    this.api.spawnHitFlash(victim.x, victim.y, DPT.blood);
    Sfx.playAt('claw', victim.x, { volume: 0.5, rate: 1.4 });
  }

  private updateLatches(time: number, delta: number): void {
    for (let i = this.latches.length - 1; i >= 0; i--) {
      const l = this.latches[i];
      if (!this.alive(l.victim) || time >= l.until) { this.latches.splice(i, 1); continue; }
      l.orbit += (delta / 1000) * 1.6;
      l.chew += (delta / 1000) * 14;
    }

    // Chewing is billed per victim rather than per piranha, so five of them are one number
    // on the health bar instead of five racing accumulators.
    this.latchAccum.clear();
    for (const l of this.latches) {
      this.latchAccum.set(l.victim, (this.latchAccum.get(l.victim) ?? 0) + LATCH_DPS);
    }
    for (const [victim, dps] of this.latchAccum) {
      const carry = (this.chewCarry.get(victim) ?? 0) + dps * (delta / 1000);
      const whole = Math.floor(carry);
      this.chewCarry.set(victim, carry - whole);
      if (whole > 0) victim.takeDamage(whole);
    }
    // Anybody who stopped being chewed loses their part-tick rather than banking it.
    for (const f of [...this.chewCarry.keys()]) {
      if (!this.latchAccum.has(f)) this.chewCarry.delete(f);
    }
  }

  // ── Lungfish Strike: drowning ──────────────────────────────────────────────

  private startDrown(owner: Owner, victim: Fighter): void {
    // One drown per caster — a second would just be two bars on the same body.
    const existing = this.drowns.findIndex((d) => d.owner === owner);
    if (existing >= 0) this.drowns.splice(existing, 1);

    let px = this.api.width - victim.x;
    let py = this.api.height - victim.y;
    // A victim standing dead centre would have the puddle land on their feet, which is not
    // a run for air, so send it to the far corner instead.
    if (Phaser.Math.Distance.Between(px, py, victim.x, victim.y) < PUDDLE_MIN_DIST) {
      px = victim.x < this.api.width / 2 ? this.right - 70 : this.left + 70;
      py = victim.y < this.api.height / 2 ? this.bottom - 70 : this.top + 70;
    }
    px = Phaser.Math.Clamp(px, this.left + 60, this.right - 60);
    py = Phaser.Math.Clamp(py, this.top + 60, this.bottom - 60);

    this.drowns.push({
      owner, victim, o2: 1, endsAt: this.now + DROWN_TOTAL_MS,
      px, py, seed: Math.random() * 999, tick: 0,
    });

    this.fx(owner).ring(px, py, 14, PUDDLE_R * 1.6, DPT.cyan, 620);
    this.fx(owner).splash(victim.x, victim.y, 30, DPT.trench);
    this.api.showFloatingText(victim.x, victim.y - 48, '💦 NO AIR', this.hex(DPT.cyan));
    Sfx.playAt('bubble', victim.x, { volume: 0.85, rate: 0.7 });
  }

  private updateDrowns(time: number, delta: number): void {
    for (let i = this.drowns.length - 1; i >= 0; i--) {
      const d = this.drowns[i];
      if (!this.alive(d.victim) || time >= d.endsAt) {
        if (this.alive(d.victim)) {
          this.api.showFloatingText(d.victim.x, d.victim.y - 46, '💦 SURFACED', this.hex(DPT.foam));
          this.fx(d.owner).bubbles(d.px, d.py, 8, 40, DPT.foam, 520, 7);
        }
        this.drowns.splice(i, 1);
        continue;
      }

      // The puddle is the only answer, and touching it is a full breath rather than a trickle.
      if (Phaser.Math.Distance.Between(d.victim.x, d.victim.y, d.px, d.py) <= PUDDLE_R) {
        if (d.o2 < 0.999) {
          this.fx(d.owner).bubbles(d.victim.x, d.victim.y, 8, 30, DPT.foam, 500, 9);
          this.api.showFloatingText(d.victim.x, d.victim.y - 46, '💨 AIR', this.hex(DPT.foam));
          Sfx.playAt('bubble', d.victim.x, { volume: 0.7, rate: 1.3 });
        }
        d.o2 = 1;
        d.tick = 0;
        continue;
      }

      d.o2 = Math.max(0, d.o2 - delta / O2_DRAIN_MS);
      if (d.o2 > 0) continue;

      d.tick += delta;
      while (d.tick >= 1000) {
        d.tick -= 1000;
        d.victim.takeDamage(DROWN_DPS);
        this.api.spawnHitFlash(d.victim.x, d.victim.y, DPT.trench);
        this.fx(d.owner).bubbles(d.victim.x, d.victim.y - 10, 5, 18, DPT.cyan, 420, 9);
      }
    }
  }

  // ── Eutrophication ─────────────────────────────────────────────────────────

  private updateAlgae(time: number): void {
    for (let i = this.algae.length - 1; i >= 0; i--) {
      const a = this.algae[i];
      if (time >= a.until) { this.algae.splice(i, 1); continue; }

      for (const f of this.everyone()) {
        if (f.hp >= f.maxHp) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y) > ALGAE_R) continue;
        f.heal(ALGAE_HEAL);
        const fx = f === this.api.player ? this.pfx : this.nfx;
        fx.bubbles(a.x, a.y, 7, 26, DPT.algae, 520, 9);
        this.api.showFloatingText(f.x, f.y - 44, `+${ALGAE_HEAL}`, this.hex(DPT.algae));
        this.algae.splice(i, 1);
        break;
      }
    }
  }

  // ── Angler ─────────────────────────────────────────────────────────────────

  private updateFishing(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.fishing = false; s.fish = null; return; }

    if (s.fishing) {
      // The NPC has to be made to stand still, since its movement machine never would.
      if (owner === 'npc') this.body(f).setVelocity(0, 0);

      const raw = f.rawDamageTaken;
      if (raw > s.lastRaw + 0.01) {
        s.fishRemain += FISH_DAMAGE_PENALTY_MS;
        this.api.showFloatingText(f.x, f.y - 40, '🎣 +1s', this.hex(DPT.blood));
      }
      s.lastRaw = raw;

      if (this.isStill(f)) s.fishRemain -= delta;
      if (s.fishRemain <= 0) {
        s.fishing = false;
        s.fish = ALL_FISH[Math.floor(Math.random() * ALL_FISH.length)];
        s.npcThrowAt = time + NPC_THROW_DELAY_MS;
        this.fx(owner).splash(f.x, f.y - 20, 34, FISH_COLOR[s.fish]);
        this.api.showFloatingText(f.x, f.y - 54,
          `${FISH_EMOJI[s.fish]} ${FISH_LABEL[s.fish]}`, this.hex(FISH_COLOR[s.fish]));
        Sfx.playAt('splash', f.x, { volume: 0.9, rate: 0.9 });
      }
      return;
    }

    if (s.fish && owner === 'npc' && time >= s.npcThrowAt) {
      const e = this.enemyOf('npc');
      if (e) this.throwFish('npc', e.x, e.y);
    }
  }

  private throwFish(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const kind = s.fish;
    const f = this.fighter(owner);
    if (!kind || !this.alive(f)) return;
    s.fish = null;

    const stats = FISH_STATS[kind];
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.fishes.push({
      owner, kind,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * stats.speed,
      vy: Math.sin(ang) * stats.speed,
      diesAt: this.now + stats.life,
      wig: Math.random() * 6,
      hits: new Map<Fighter, number>(),
      swallowed: null,
      eatAccum: 0,
    });

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).bubbles(f.x, f.y, 5, 18, DPT.foam, 380, 7);
    this.api.showFloatingText(f.x, f.y - 46,
      `${FISH_EMOJI[kind]} THROWN`, this.hex(FISH_COLOR[kind]));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.15 });
  }

  private updateFishProjectiles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const p = this.fishes[i];
      const stats = FISH_STATS[p.kind];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wig += dt * 14;

      const hitWall = p.x <= this.left || p.x >= this.right || p.y <= this.top || p.y >= this.bottom;

      if (p.kind === 'pufferfish' && hitWall) {
        // Bouncy, and only bouncy — a pufferfish that expired on a wall would be a dud.
        if (p.x <= this.left || p.x >= this.right) p.vx *= -1;
        if (p.y <= this.top || p.y >= this.bottom) p.vy *= -1;
        p.x = Phaser.Math.Clamp(p.x, this.left + 1, this.right - 1);
        p.y = Phaser.Math.Clamp(p.y, this.top + 1, this.bottom - 1);
        this.fx(p.owner).bubbles(p.x, p.y, 4, 16, DPT.puffer, 340, 9);
        Sfx.playAt('boing', p.x, { volume: 0.45, rate: 1.2 });
      } else if (hitWall) {
        if (p.kind === 'bombfish') this.detonate(p);
        else if (p.kind === 'gulper') this.releaseGulper(p, true);
        else this.fx(p.owner).bubbles(p.x, p.y, 4, 14, FISH_COLOR[p.kind], 340, 9);
        this.fishes.splice(i, 1);
        continue;
      }

      if (time >= p.diesAt) {
        if (p.kind === 'gulper') this.releaseGulper(p, false);
        this.fx(p.owner).bubbles(p.x, p.y, 4, 16, FISH_COLOR[p.kind], 380, 9);
        this.fishes.splice(i, 1);
        continue;
      }

      // Gulper: whoever is inside comes along for the ride and is chewed on the way.
      if (p.swallowed) {
        if (!this.alive(p.swallowed)) {
          p.swallowed = null;
        } else {
          this.body(p.swallowed).reset(p.x, p.y);
          p.eatAccum += GULPER_DPS * dt;
          const whole = Math.floor(p.eatAccum);
          if (whole > 0) {
            p.eatAccum -= whole;
            p.swallowed.takeDamage(whole);
          }
        }
        continue;
      }

      let consumed = false;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > stats.r + 12) continue;
        const last = p.hits.get(t) ?? -99999;

        switch (p.kind) {
          case 'icefish': {
            t.takeDamage(ICEFISH_DAMAGE);
            this.slowed.set(t, time + ICEFISH_SLOW_MS);
            this.api.spawnHitFlash(t.x, t.y, DPT.ice);
            this.fx(p.owner).bubbles(t.x, t.y, 7, 26, DPT.ice, 520, 9);
            this.api.showFloatingText(t.x, t.y - 44, '❄️ CHILLED', this.hex(DPT.ice));
            consumed = true;
            break;
          }
          case 'barracuda': {
            if (time - last < 400) break;
            p.hits.set(t, time);
            t.takeDamage(BARRACUDA_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.barracuda);
            this.fx(p.owner).chomp(t.x, t.y, Math.atan2(p.vy, p.vx), 22, DPT.blood);
            // Pierces: it keeps going, and can take the next body on the same line.
            break;
          }
          case 'pufferfish': {
            if (time - last < PUFFER_REHIT_MS) break;
            p.hits.set(t, time);
            t.takeDamage(PUFFER_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.puffer);
            this.fx(p.owner).bubbles(t.x, t.y, 6, 24, DPT.puffer, 420, 9);
            // Bounce off the body too, or it sits inside them chewing on the re-hit timer.
            const away = Math.atan2(p.y - t.y, p.x - t.x);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(away) * sp;
            p.vy = Math.sin(away) * sp;
            break;
          }
          case 'bombfish': {
            this.detonate(p);
            consumed = true;
            break;
          }
          case 'gulper': {
            p.swallowed = t;
            this.fx(p.owner).chomp(t.x, t.y, Math.atan2(p.vy, p.vx), 34, DPT.gulper);
            this.api.showFloatingText(t.x, t.y - 48, '🐍 SWALLOWED', this.hex(DPT.gulper));
            Sfx.playAt('slime-splat', t.x, { volume: 0.8, rate: 0.75 });
            break;
          }
        }
        if (consumed || p.swallowed) break;
      }

      if (consumed) this.fishes.splice(i, 1);
    }
  }

  /** The bomb fish. The only fish that doesn't care whether it found a body or a wall. */
  private detonate(p: FishProj): void {
    this.fx(p.owner).blast(p.x, p.y, BOMBFISH_R, DPT.bomb);
    Sfx.playAt('explosion-medium', p.x, { volume: 0.85, rate: 0.95 });
    for (const t of this.targetsOf(p.owner)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > BOMBFISH_R) continue;
      t.takeDamage(BOMBFISH_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, DPT.bomb);
    }
  }

  /** Let go of whoever the eel is carrying. */
  private releaseGulper(p: FishProj, onWall: boolean): void {
    const v = p.swallowed;
    p.swallowed = null;
    this.fx(p.owner).splash(p.x, p.y, 34, DPT.gulper);
    if (!v || !this.alive(v)) return;
    this.body(v).reset(
      Phaser.Math.Clamp(p.x, this.left + 30, this.right - 30),
      Phaser.Math.Clamp(p.y, this.top + 30, this.bottom - 30),
    );
    this.api.showFloatingText(v.x, v.y - 46, onWall ? '🐍 SPAT AT THE WALL' : '🐍 RELEASED',
      this.hex(DPT.gulper));
  }

  // ── Megalodon ──────────────────────────────────────────────────────────────

  private updateSharks(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.sharks.length - 1; i >= 0; i--) {
      const s = this.sharks[i];

      if (s.phase === 'rush') {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.gape = 1;

        // The mouth leads the body, so the swallow point is out at the nose.
        const mx = s.x + Math.cos(s.ang) * SHARK_LEN * 0.42;
        const my = s.y + Math.sin(s.ang) * SHARK_LEN * 0.42;
        for (const t of this.targetsOf(s.owner)) {
          if (s.swallowed.includes(t)) continue;
          if (Phaser.Math.Distance.Between(mx, my, t.x, t.y) > SHARK_MOUTH_R) continue;
          s.swallowed.push(t);
          this.fx(s.owner).chomp(t.x, t.y, s.ang, 46, DPT.blood);
          this.api.showFloatingText(t.x, t.y - 50, '🦈 SWALLOWED', this.hex(DPT.shark));
          Sfx.playAt('beast-transform', t.x, { volume: 0.8, rate: 0.7 });
        }

        const past = mx < this.left || mx > this.right || my < this.top || my > this.bottom;
        if (!past) continue;

        s.phase = 'hold';
        s.x = Phaser.Math.Clamp(s.x, this.left + 40, this.right - 40);
        s.y = Phaser.Math.Clamp(s.y, this.top + 40, this.bottom - 40);
        // It turns to face the arena. Everything downstream reads the mouth off `ang`, so
        // reversing it here is what keeps a held fighter inside the walls rather than through
        // the one the shark just beached itself on.
        s.ang += Math.PI;
        s.until = time + (s.swallowed.length ? SHARK_HOLD_MS : SHARK_EMPTY_HOLD_MS);
        s.tick = 0;
        this.fx(s.owner).splash(mx, my, 60, DPT.trench);
        this.fx(s.owner).ring(s.x, s.y, 30, 140, DPT.foam, 620);
        continue;
      }

      // ── Holding against the wall ──
      s.gape = 0.15 + 0.15 * Math.sin(time / 90);
      s.swallowed = s.swallowed.filter((f) => this.alive(f));
      const mouthX = s.x + Math.cos(s.ang) * SHARK_LEN * 0.3;
      const mouthY = s.y + Math.sin(s.ang) * SHARK_LEN * 0.3;
      for (const f of s.swallowed) this.body(f).reset(mouthX, mouthY);

      s.tick += delta;
      while (s.tick >= 1000) {
        s.tick -= 1000;
        for (const f of s.swallowed) {
          f.takeDamage(SHARK_DPS);
          this.api.spawnHitFlash(f.x, f.y, DPT.blood);
        }
        if (s.swallowed.length) this.fx(s.owner).bubbles(mouthX, mouthY, 5, 26, DPT.blood, 480, 9);
      }

      if (time < s.until) continue;

      // ── The spit ──
      const cx = this.api.width / 2;
      const cy = this.api.height / 2;
      for (const f of s.swallowed) {
        const a = Math.random() * Math.PI * 2;
        this.body(f).reset(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        this.fx(s.owner).splash(f.x, f.y, 40, DPT.trench);
        this.api.showFloatingText(f.x, f.y - 46, '🦈 SPAT OUT', this.hex(DPT.foam));
      }
      this.fx(s.owner).ring(s.x, s.y, 20, 150, DPT.trench, 560);
      this.sharks.splice(i, 1);
    }
  }

  // ── Icefish chill ──────────────────────────────────────────────────────────

  private updateSlows(time: number): void {
    for (const [f, until] of [...this.slowed]) {
      if (time >= until || !this.alive(f)) this.slowed.delete(f);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      const s = this.sides.player;
      if (!this.playerAvatar) this.playerAvatar = new DepthsAvatar(scene, this.pcol);
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setIntensity(s.boostUntil > this.now ? 1.35 : 1);
      this.playerAvatar.setHidden(s.hidden);
      this.playerAvatar.setFish(s.fish);
      this.playerAvatar.setFishing(s.fishing ? 1 - s.fishRemain / FISH_CATCH_MS : 0);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // The rig is driven off the fade rather than the sprite's alpha, so the esca survives
      // the body going completely transparent.
      this.playerAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      const s = this.sides.npc;
      if (!this.npcAvatar) this.npcAvatar = new DepthsAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(this.npcAimY - f.y, this.npcAimX - f.x));
      this.npcAvatar.setIntensity(s.boostUntil > this.now ? 1.35 : 1);
      this.npcAvatar.setHidden(s.hidden);
      this.npcAvatar.setFish(s.fish);
      this.npcAvatar.setFishing(s.fishing ? 1 - s.fishRemain / FISH_CATCH_MS : 0);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Air pockets, blooms and lures — everything that lives on the floor. */
  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const d of this.drowns) {
      const fade = Phaser.Math.Clamp((d.endsAt - time) / 500, 0, 1);
      darkPuddle(g, this.col(d.owner), d.px, d.py, PUDDLE_R, this.vizT, fade, d.seed);
    }

    for (const a of this.algae) {
      const fade = Phaser.Math.Clamp((a.until - time) / 800, 0, 1);
      algaeOrb(g, this.col(a.owner), a.x, a.y, 8, this.vizT, fade, a.seed);
    }

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (!s.lureOn) continue;
      // Drawn at the fade's own strength: the deeper you are gone, the brighter the lie.
      algaeOrb(g, this.col(owner), s.lureX, s.lureY, 8, this.vizT, s.hidden, s.lureSeed);
      bubbleColumn(g, this.col(owner), s.lureX, s.lureY, this.vizT, 3, 5, 26, s.hidden * 0.6, s.lureSeed);
      // The line back to whoever is holding it — faint, and only visible up close.
      const f = this.fighter(owner);
      if (this.alive(f)) {
        g.lineStyle(1, this.col(owner)(DPT.lure), s.hidden * 0.16);
        g.lineBetween(s.lureX, s.lureY, f.x, f.y - 14);
      }
    }
  }

  /** Everything swimming, plus the oxygen bars. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Piranhas in flight ──
    for (const p of this.swimmers) {
      const ang = Math.atan2(p.vy, p.vx) + Math.sin(p.wig) * 0.32;
      drawPiranha(g, this.col(p.owner), p.x, p.y, ang, 9, 1, p.wig * 1.6);
    }

    // ── Piranhas chewing ──
    for (const l of this.latches) {
      const r = 26 * l.victim.sizeMult * l.victim.shapeSizeMult;
      const lx = l.victim.x + Math.cos(l.orbit) * r;
      const ly = l.victim.y + Math.sin(l.orbit) * r * 0.9;
      // Nose-in: a piranha on a body is pointed at the body.
      const fade = Phaser.Math.Clamp((l.until - time) / 400, 0, 1);
      drawPiranha(g, this.col(l.owner), lx, ly, l.orbit + Math.PI, 9, fade, l.chew);
    }

    // ── Thrown fish ──
    for (const p of this.fishes) {
      const stats = FISH_STATS[p.kind];
      const ang = Math.atan2(p.vy, p.vx) + Math.sin(p.wig) * 0.18;
      if (p.kind === 'gulper' && p.swallowed) {
        // A full eel is a bulge with somebody in it.
        g.fillStyle(this.col(p.owner)(DPT.gulper), 0.4);
        g.fillCircle(p.x, p.y, 30 + Math.sin(p.wig * 2) * 3);
      }
      fishBody(g, this.col(p.owner), p.x, p.y, ang, stats.len,
        FISH_COLOR[p.kind], 1, FISH_PROFILE[p.kind], p.wig);
      if (p.kind === 'icefish') {
        // A cold wake, so the slow is visible before it lands.
        g.fillStyle(this.col(p.owner)(DPT.ice), 0.18);
        g.fillCircle(p.x - p.vx * 0.02, p.y - p.vy * 0.02, 16);
      }
    }

    // ── Sharks ──
    for (const s of this.sharks) {
      sharkBody(g, this.col(s.owner), s.x, s.y, s.ang, SHARK_LEN, 1, s.gape, this.vizT);
      if (s.phase === 'hold' && s.swallowed.length) {
        bubbleColumn(g, this.col(s.owner), s.x + Math.cos(s.ang) * SHARK_LEN * 0.3,
          s.y + Math.sin(s.ang) * SHARK_LEN * 0.3, this.vizT, 5, 8, 34, 0.7, 3);
      }
    }

    // ── Oxygen bars ──
    for (const d of this.drowns) {
      if (!this.alive(d.victim)) continue;
      const fade = Phaser.Math.Clamp((d.endsAt - time) / 400, 0, 1);
      oxygenBar(g, this.col(d.owner), d.victim.x, d.victim.y - 46, 54, d.o2, this.vizT, fade);
      // A tether from the gasping fighter to the air they are supposed to be running for.
      g.lineStyle(1.6, this.col(d.owner)(d.o2 > 0 ? DPT.cyan : DPT.blood), 0.28 * fade);
      g.lineBetween(d.victim.x, d.victim.y, d.px, d.py);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsDepths: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('depths-lure', playerIsDepths && s.lureOn ? {
      name: 'Anglerfish', emoji: '🎣', color: DPT.lure,
      description: 'The water has taken you. Whatever comes to eat the orb you left behind gives you a burst of speed and a doubled Lungfish Strike.',
      priority: 118,
    } : null);

    this.api.setStatusIndicator('depths-frenzy', playerIsDepths && s.boostUntil > time ? {
      name: 'Feeding Frenzy', emoji: '🔴', color: DPT.blood,
      description: 'Something took the bait. +50% movement speed, and Lungfish Strike hits for 30 instead of 15.',
      until: s.boostUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('depths-fishing', playerIsDepths && s.fishing ? {
      name: 'On the Line', emoji: '🎣', color: DPT.foam,
      description: 'Stand still to bring the catch in. Moving stops the line, and every hit you take adds a second.',
      priority: 120,
    } : null);

    this.api.setStatusIndicator('depths-catch', playerIsDepths && s.fish ? {
      name: FISH_LABEL[s.fish].toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      emoji: FISH_EMOJI[s.fish], color: FISH_COLOR[s.fish],
      description: 'A fish is clamped in your jaw. Press F again to throw it.',
      priority: 108,
    } : null);

    // ── Victim side: everything below can be on the player whoever is playing Depths. ──
    const drown = this.drowns.find((d) => d.victim === p);
    this.api.setStatusIndicator('depths-drowning', drown ? {
      name: drown.o2 > 0 ? 'Drowning' : 'No Air', emoji: '💦', color: DPT.cyan,
      description: 'Your oxygen is running out. Reach the dark puddle to refill it — once the bar empties, the water takes 12 HP a second.',
      until: drown.endsAt, priority: 8,
    } : null);

    const chewed = this.latches.filter((l) => l.victim === p).length;
    this.api.setStatusIndicator('depths-chewed', chewed ? {
      name: 'Chewed', emoji: '🐟', color: DPT.blood,
      description: 'Piranhas are latched on, taking 3 HP a second each until they let go.',
      count: chewed, priority: 20,
    } : null);

    const chill = this.slowed.get(p);
    this.api.setStatusIndicator('depths-chilled', chill && chill > time ? {
      name: 'Chilled', emoji: '❄️', color: DPT.ice,
      description: 'An icefish caught you. 20% slower until it wears off.',
      until: chill, priority: 30,
    } : null);

    const held = this.isHeld(p);
    this.api.setStatusIndicator('depths-swallowed', held ? {
      name: 'Swallowed', emoji: '🦈', color: DPT.shark,
      description: 'You are inside something. You go where it goes, and it is eating.',
      priority: 6,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Movement multipliers. Pulled by ArenaScene rather than pushed from `update()`, which runs
   * after the frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number {
    let m = 1;
    if (this.sides.player.boostUntil > this.now) m *= BOOST_MULT;
    const chill = this.slowed.get(this.api.player);
    if (chill && chill > this.now) m *= ICEFISH_SLOW_MULT;
    return m;
  }

  getNpcSpeedMult(): number {
    let m = 1;
    if (this.sides.npc.boostUntil > this.now) m *= BOOST_MULT;
    const chill = this.slowed.get(this.api.npc);
    if (chill && chill > this.now) m *= ICEFISH_SLOW_MULT;
    return m;
  }

  /**
   * Where the NPC's feet should be going, or null to let its own state machine drive.
   *
   * Air first — nothing else matters to something that is drowning. Then a heal it can
   * actually use, then the lure, which it has no way of knowing is not a heal.
   */
  npcSeekPoint(): { x: number; y: number } | null {
    const npc = this.api.npc;
    if (!this.alive(npc)) return null;

    const drown = this.drowns.find((d) => d.victim === npc);
    if (drown) return { x: drown.px, y: drown.py };

    if (npc.hp < npc.maxHp * 0.9 && this.algae.length) {
      let best: Algae | null = null;
      let bestD = Infinity;
      for (const a of this.algae) {
        const d = Phaser.Math.Distance.Between(npc.x, npc.y, a.x, a.y);
        if (d < bestD) { bestD = d; best = a; }
      }
      if (best) return { x: best.x, y: best.y };
    }

    const lure = this.sides.player;
    if (this.api.elementId === 'depths' && lure.lureOn) {
      return { x: lure.lureX, y: lure.lureY };
    }
    return null;
  }

  /** True while the NPC is standing over its own line — the AI must not walk away from it. */
  isFishing(owner: Owner): boolean { return this.side(owner).fishing; }
  hasFish(owner: Owner): boolean { return this.side(owner).fish !== null; }
  isSharkOut(owner: Owner): boolean { return this.sharks.some((s) => s.owner === owner); }
  /** How many piranhas are already on a body, so the AI stops feeding a full one. */
  latchCount(f: Fighter): number { return this.latches.filter((l) => l.victim === f).length; }
  isDrowning(f: Fighter): boolean { return this.drowns.some((d) => d.victim === f); }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something that is
   * not a cooldown: the line coming in, the drowning clock, and the shark's own eight seconds.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    if (abilityId === 'depths-angler') {
      if (s.fish) return 1;
      if (s.fishing) return Phaser.Math.Clamp(1 - s.fishRemain / FISH_CATCH_MS, 0, 1);
    }
    if (abilityId === 'depths-lungfish') {
      const d = this.drowns.find((dr) => dr.owner === 'player');
      if (d) return Phaser.Math.Clamp((d.endsAt - time) / DROWN_TOTAL_MS, 0, 1);
    }
    if (abilityId === 'depths-megalodon') {
      const shark = this.sharks.find((sh) => sh.owner === 'player');
      if (shark) {
        if (shark.phase === 'rush') return 1;
        return Phaser.Math.Clamp((shark.until - time) / SHARK_HOLD_MS, 0, 1);
      }
    }
    return p.getCooldownRatio(abilityId);
  }
}
