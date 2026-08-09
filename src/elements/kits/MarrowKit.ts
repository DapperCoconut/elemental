import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  CELL_TINT, CellKind, MRW, MarrowAvatar, MarrowColorFn, MarrowFx, antibody, bcell, boneShaft,
  cellGlyph, cytokine, dendrite, killerT, macrophage, mastCell, netWeb, neutrophil, tcell,
} from './MarrowVisuals';

type Owner = 'player' | 'npc';

/** What can actually stand in a socket. The B-cell is a cell but never a summon; mast never is. */
type SummonKind = Exclude<CellKind, 'mast' | 'bcell'>;

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── The bone bar ─────────────────────────────────────────────────────────────
/** Five sockets, and that is the whole element. Mast cells are deliberately exempt. */
const MAX_SUMMONS = 5;

// ── Inflammation ─────────────────────────────────────────────────────────────
const INFLAM_MAX = 100;
/** Per second, always, with no exceptions — inflammation is a fever, not a bank. */
const INFLAM_DRAIN = 2;
/** Every 20 damage the host takes is worth 5. Counted off `rawDamageTaken`, so mitigation
 *  does not also erase the fact that you were hit that hard. */
const INFLAM_PER_HIT_STEP = 20;
const INFLAM_PER_HIT = 5;
/** Each live macrophage, per second. Two of them is a fever all on its own. */
const INFLAM_PER_MACRO = 2;
const INFLAM_PER_MAST = 20;
/** At a full bar: HP a second on the host, HP a second on each cell, and +30% move speed. */
const INFLAM_HOST_REGEN = 4;
const INFLAM_CELL_REGEN = 3;
const INFLAM_SPEED = 0.3;

// ── Anti-Body Blast (Click) ──────────────────────────────────────────────────
const ANTI_DAMAGE = 12;
const ANTI_SPEED = 720;
const ANTI_LIFE_MS = 1400;
const ANTI_R = 9;
/** Ten to a body, and they never come off. */
const ANTI_PER_VICTIM = 10;
/** What the coat is *for*: every antibody you have on a body makes each of your cells' bites on
 *  it 10% harder, so a full ring is double damage from the whole board. */
const ANTI_BITE_BONUS = 0.1;
/** And a macrophage biting a coated body takes 2 more HP for itself and its host per antibody. */
const ANTI_HEAL_BONUS = 2;

// ── Macrosma (E) ─────────────────────────────────────────────────────────────
const MACRO_HP = 85;
const MACRO_SPEED = 76;
const MACRO_REACH = 30;
const MACRO_BITE_MS = 1100;
const MACRO_BITE_DAMAGE = 15;
const MACRO_BITE_HEAL = 5;
/** What eating somebody else's board is worth, per object, to the cell and to the host. */
const MACRO_DEVOUR_HEAL = 25;
const MACRO_DEVOUR_R = 46;
const MACRO_DEVOUR_MS = 500;

// ── Neutralize (R) ───────────────────────────────────────────────────────────
const NEUT_HP = 30;
const NEUT_SPEED = 168;
const NEUT_REACH = 26;
const NEUT_ATTACK_MS = 1500;
const NEUT_DAMAGE = 25;
/** The web it dies into. */
const NET_R = 130;
const NET_MS = 6000;
const NET_DPS = 5;
const NET_TICK_MS = 250;
const NET_SLOW = 0.55;

// ── Dendricles (F) ───────────────────────────────────────────────────────────
const DEND_COUNT = 5;
const DEND_RANGE = 150;
const DEND_DAMAGE = 5;
const DEND_TIP_R = 26;
/** Every tentacle goes at the cursor — this is only how far apart their tips sit across the aim,
 *  so five of them read as five and not as one line drawn five times. It is a flat distance, not
 *  an angle, so the bundle is exactly as tight at 150px as it is in somebody's face. */
const DEND_OFFSET = 11;
const DEND_LASH_MS = 260;
/** The fan is whipped one tentacle at a time, edge to edge, never all at once. */
const DEND_STEP_MS = 90;
/** Four of the five on one body transforms the ability. */
const DEND_TRANSFORM_HITS = 4;

// ── The T-cell that transform summons ────────────────────────────────────────
const TCELL_HP = 50;
const TCELL_SPEED = 122;
const TCELL_REACH = 34;
const TCELL_HELP_MS = 1600;
const TCELL_SPEED_BUFF = 1.25;
const TCELL_DAMAGE_BUFF = 1.5;
const TCELL_HEAL = 25;
/** Each top-up on the same cell is worth 60% of the last. Floored so it never reads as zero. */
const TCELL_HEAL_FALLOFF = 0.6;
const TCELL_HEAL_FLOOR = 3;

// ── Mastacre (Q) ─────────────────────────────────────────────────────────────
const MAST_COUNT = 5;
const MAST_HP = 50;
const MAST_SPEED = 108;
const MAST_FUSE_MS = 5000;
const MAST_DAMAGE = 25;
const MAST_BLAST_R = 120;

// ── B-Cascade (Click+) ───────────────────────────────────────────────────────
/**
 * With a T-cell on the field the click stops being a click. Everything below is deliberately
 * priced like a small summon rather than like a shot: one every five seconds, and it is a body
 * on the floor that can be shot down — but it takes no socket, which is the whole point.
 */
const BCELL_HP = 45;
const BCELL_SPEED = 46;
const BCELL_LIFE_MS = 14000;
const BCELL_COOLDOWN_MS = 5000;
const BCELL_DAMAGE = 25;
const BCELL_R = 12;
const BCELL_SALVO_MS = 3000;
const BCELL_SALVO = 2;
/** How long before a salvo the cell visibly winds up. */
const BCELL_TELL_MS = 700;

// ── Cell Janitor (E+) ────────────────────────────────────────────────────────
const JANITOR_MAX = 5;
const JANITOR_SIZE = 0.09;
const JANITOR_DAMAGE = 0.12;
const JANITOR_HEAL = 2;
const JANITOR_REACH = 3;

// ── Cytokine Storm (R+) ──────────────────────────────────────────────────────
const CYTO_EVERY_MS = 2600;
const CYTO_COUNT = 7;
/** Total width of the cone. Seven pellets across 46° is a spray, not a volley. */
const CYTO_SPREAD = 0.8;
const CYTO_SPEED = 250;
const CYTO_LIFE_MS = 620;
const CYTO_DAMAGE = 4;
const CYTO_R = 9;
const CYTO_VULN_PER = 0.1;
const CYTO_VULN_STACKS = 5;
const CYTO_VULN_MS = 4000;

// ── Killer T (F+) ────────────────────────────────────────────────────────────
/** How long F stays handed back after a T-cell lands. Press it again inside this and it turns. */
const KILLER_WINDOW_MS = 2500;
const KILLER_HP = 125;
const KILLER_SPEED = 138;
const KILLER_REACH = 62;
const KILLER_ATTACK_MS = 1250;
const KILLER_DAMAGE = 28;
const KILLER_DASH_MS = 5000;
const KILLER_DASH_DIST = 190;
const KILLER_DASH_DAMAGE = 22;
const KILLER_DASH_R = 30;

// ── Autoimmunity (Q+) ────────────────────────────────────────────────────────
/** The bar the five detonations would have to reach on a meter that stops at 100. */
const AUTO_THRESHOLD = 150;
const AUTO_MS = 10000;
const AUTO_DAMAGE = 2;
const AUTO_SPEED = 1.3;
/** Attack intervals are scaled by this, so everything swings faster as well as harder. */
const AUTO_RATE = 0.7;
/** What a red cell's strike does to your own body and your own cells standing in it. */
const AUTO_SPLASH = 0.5;

// ── World objects ────────────────────────────────────────────────────────────

interface AntiShot {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  seed: number;
  diesAt: number;
  /** B-Cascade only: the body this one is steering itself into. */
  homing: Fighter | null;
  reg: RegisteredProjectile | null;
}

/** Click+ — a B-cell. Not a summon: it takes no socket and nothing can raze it off the board. */
interface BCell {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  hp: number;
  seed: number;
  hurt: number;
  diesAt: number;
  nextSalvoAt: number;
}

/** R+ — one pellet of a neutrophil's shotgun. */
interface Cyto {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  seed: number;
  diesAt: number;
}

/** R+ — the mark the pellets leave. One record per body, refreshed rather than stacked in time. */
interface Vuln {
  victim: Fighter;
  stacks: number;
  until: number;
}

/** An antibody that has already landed. There is no expiry field on purpose. */
interface Stuck {
  owner: Owner;
  victim: Fighter;
  /** Slot index on the victim, so ten of them ring the body instead of stacking. */
  slot: number;
  seed: number;
}

interface Summon {
  owner: Owner;
  kind: SummonKind;
  x: number;
  y: number;
  ang: number;
  hp: number;
  maxHp: number;
  seed: number;
  hurt: number;
  /** 0–1 attack animation: the macrophage's feeding cup, the neutrophil's lunge. */
  anim: number;
  nextActionAt: number;
  target: Fighter | null;
  /** T-cell only: who it is currently walking to help, and how far the tentacle is out. */
  help: Summon | null;
  reach: number;
  /** Written by a T-cell. Each is applied exactly once. */
  buffed: boolean;
  spdMult: number;
  dmgMult: number;
  /** How many top-ups this cell has already had, for the falloff. */
  heals: number;
  nextDevourAt: number;
  /** E+ — how many funerals this macrophage has cleaned up after, 0–5. */
  janitor: number;
  /** R+ — when this neutrophil next sprays. */
  nextCytoAt: number;
  /** F+ — when this killer T next lunges, and how far through the lunge animation it is. */
  nextDashAt: number;
  dash: number;
}

interface Mast {
  owner: Owner;
  x: number;
  y: number;
  hp: number;
  seed: number;
  hurt: number;
  explodeAt: number;
}

interface Net {
  owner: Owner;
  x: number;
  y: number;
  diesAt: number;
  tick: number;
  seed: number;
}

interface Lash {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  diesAt: number;
  seed: number;
  hit: boolean;
}

/** A cast of Dendricles that is still playing out. One tentacle leaves per frame at most. */
interface Volley {
  owner: Owner;
  /** Where the cast was aimed. The player's own fan re-reads the live cursor as it sweeps. */
  tx: number;
  ty: number;
  track: boolean;
  fired: number;
  nextAt: number;
  /** Landed tentacles per body so far — four on one arms the T-cell once the fan ends. */
  hits: Map<Fighter, number>;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  inflammation: number;
  /** Last seen `rawDamageTaken`, so the bar can be fed off the difference. -1 = not synced yet. */
  lastRaw: number;
  hitAccum: number;
  regenAccum: number;
  /** Dendricles has landed four on one body: the next cast is a T-cell. */
  tcellArmed: boolean;
  /** Click+ — when the next B-cell may be released. */
  bcellReadyAt: number;
  /** F+ — until when a second press of F turns `killerTarget` into a killer, and which cell. */
  killerWindowUntil: number;
  killerTarget: Summon | null;
  /** Q+ — when the autoimmune response ends. */
  autoUntil: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0,
    inflammation: 0, lastRaw: -1, hitAccum: 0, regenAccum: 0, tcellArmed: false,
    bcellReadyAt: 0, killerWindowUntil: 0, killerTarget: null, autoUntil: 0,
  };
}

const KIND_NAME: Record<SummonKind, string> = {
  macrophage: 'Macrophage',
  neutrophil: 'Neutrophil',
  tcell: 'T-Cell',
  killer: 'Killer T',
};

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MarrowArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  /** The shared physics group — enemy shots are what kill cells. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Marrow visual colour through that side's equipped skin. */
  marrowColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /**
   * Ruin's razing helper, borrowed. A macrophage eating "any summons from the enemy" is exactly
   * the cross-cutting board wipe `SummonPurgeTarget` already exists for — every kit that puts a
   * thing on the floor answers it, so the cell can eat a Conquest keep or a Life sapling without
   * this kit knowing either of them exists.
   */
  purgeSummons(x: number, y: number, radius: number, exceptOwner: Owner): number;
  /** Shop upgrades, per side — the npc half is the online opponent's loadout. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── MarrowKit ────────────────────────────────────────────────────────────────

export class MarrowKit implements SummonPurgeTarget {
  private api: MarrowArenaApi;

  // ── Visuals ──
  private readonly pcol: MarrowColorFn;
  private readonly ncol: MarrowColorFn;
  private readonly pfx: MarrowFx;
  private readonly nfx: MarrowFx;
  private playerAvatar: MarrowAvatar | null = null;
  private npcAvatar: MarrowAvatar | null = null;
  /** NETs and cell shadows — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Cells, antibodies and tentacles — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The bone bar and the inflammation bar. Screen space. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shots: AntiShot[] = [];
  private stuck: Stuck[] = [];
  private summons: Summon[] = [];
  private masts: Mast[] = [];
  private nets: Net[] = [];
  private lashes: Lash[] = [];
  private volleys: Volley[] = [];
  private bcells: BCell[] = [];
  private cytos: Cyto[] = [];
  private vulns: Vuln[] = [];

  constructor(api: MarrowArenaApi) {
    this.api = api;
    this.pcol = (base) => api.marrowColor('player', base);
    this.ncol = (base) => api.marrowColor('npc', base);
    this.pfx = new MarrowFx(api.scene, this.pcol);
    this.nfx = new MarrowFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MarrowFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MarrowColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isMarrow(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'marrow' : this.api.npcElementId === 'marrow';
  }

  /** A shop upgrade, but only for a side that is actually playing Marrow. */
  private up(owner: Owner, slot: string): boolean {
    return this.isMarrow(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** Q+ — this side's cells are currently red, doubled, and indiscriminate. */
  private isAuto(owner: Owner): boolean {
    return this.now < this.sides[owner].autoUntil;
  }

  /** How red to paint this side's board: 1 under Autoimmunity, 0 otherwise. */
  private redOf(owner: Owner): number {
    return this.isAuto(owner) ? 1 : 0;
  }

  /** Click+ — the click is only a B-cell while there is a T-cell of some kind on the field. */
  private bcascade(owner: Owner): boolean {
    return this.up(owner, 'click')
      && this.mine(owner).some((c) => c.kind === 'tcell' || c.kind === 'killer');
  }

  private avatar(owner: Owner): MarrowAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private mine(owner: Owner): Summon[] {
    return this.summons.filter((s) => s.owner === owner);
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /** A cast that cannot happen: hand the cooldown back and say why, once, out loud. */
  private deny(owner: Owner, abilityId: string, text: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(MRW.boneShade));
    Sfx.playAt('ui-denied', f.x, { volume: 0.55 });
  }

  // ── Inflammation ───────────────────────────────────────────────────────────

  private addInflammation(owner: Owner, amount: number): void {
    const s = this.side(owner);
    const before = s.inflammation;
    s.inflammation = Phaser.Math.Clamp(s.inflammation + amount, 0, INFLAM_MAX);
    const gained = s.inflammation - before;
    if (gained < 4) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.fx(owner).inflame(f.x, f.y, 28);
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 52, `🔥 +${Math.round(gained)}`, this.hex(MRW.inflameLit));
    }
  }

  /** 0–1 of the bar, which is what every consumer of inflammation actually wants. */
  private heat(owner: Owner): number {
    return this.sides[owner].inflammation / INFLAM_MAX;
  }

  /**
   * The passive, once per frame per side: drain, the damage tally, the macrophage upkeep, and
   * the regeneration it pays out to the host and to every cell it owns.
   */
  private updateInflammation(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (!this.isMarrow(owner) || !this.alive(f)) {
        s.inflammation = 0;
        s.lastRaw = -1;
        s.autoUntil = 0;
        continue;
      }

      // Q+ — while the response is running the bar is not a bar. It is stuck at the top, so the
      // drain, the tally and the macrophage upkeep are all beside the point until it passes.
      if (this.isAuto(owner)) {
        s.lastRaw = f.rawDamageTaken;
        s.inflammation = INFLAM_MAX;
        this.payInflammation(owner, dt);
        continue;
      }

      // Damage taken. `rawDamageTaken` is a running total, so the bar is fed the difference.
      if (s.lastRaw < 0) s.lastRaw = f.rawDamageTaken;
      const took = Math.max(0, f.rawDamageTaken - s.lastRaw);
      s.lastRaw = f.rawDamageTaken;
      s.hitAccum += took;
      while (s.hitAccum >= INFLAM_PER_HIT_STEP) {
        s.hitAccum -= INFLAM_PER_HIT_STEP;
        this.addInflammation(owner, INFLAM_PER_HIT);
      }

      // Macrophages keep the fever going all by themselves.
      const macros = this.mine(owner).filter((c) => c.kind === 'macrophage').length;
      const net = macros * INFLAM_PER_MACRO - INFLAM_DRAIN;
      s.inflammation = Phaser.Math.Clamp(s.inflammation + net * dt, 0, INFLAM_MAX);

      this.payInflammation(owner, dt);
    }
  }

  /** What the bar buys, wherever it came from: regeneration on the host and on every cell. */
  private payInflammation(owner: Owner, dt: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const k = this.heat(owner);
    if (k <= 0) { s.regenAccum = 0; return; }
    s.regenAccum += INFLAM_HOST_REGEN * k * dt;
    if (s.regenAccum >= 1) {
      const whole = Math.floor(s.regenAccum);
      s.regenAccum -= whole;
      if (f.hp < f.maxHp) {
        f.heal(whole);
        if (Math.random() < 0.25) this.fx(owner).serum(f.x, f.y + 6, 2, 12, 460);
      }
    }
    for (const c of this.mine(owner)) {
      c.hp = Math.min(c.maxHp, c.hp + INFLAM_CELL_REGEN * k * dt);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    for (const s of this.shots) if (s.reg) this.api.projectileRegistry.remove(s.reg);
    this.shots = [];
    this.stuck = [];
    this.summons = [];
    this.masts = [];
    this.nets = [];
    this.lashes = [];
    this.volleys = [];
    this.bcells = [];
    this.cytos = [];
    // The cytokine mark is written onto the bodies themselves, so it has to be handed back.
    for (const v of this.vulns) if (v.victim?.active) v.victim.marrowIncomingMult = 1;
    this.vulns = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'marrow') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // The click auto-fires on a held button. Its own 440ms cooldown is the rate limiter, so
    // there is nothing here for a `pointerWasDown` edge to add. The B-Cascade's five seconds
    // are checked *here* rather than inside the cast: a refusal down there would still have
    // been announced, so a held button would voice the click sixty times a second.
    if (pointer.isDown && (!this.bcascade('player') || this.now >= s.bcellReadyAt)) {
      p.castAbility('marrow-antibody', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('marrow-macrosma', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('marrow-neutralize', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('marrow-dendricles', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('marrow-mastacre', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — one antibody, thrown at the cursor. Or, with a T-cell out and Click+, a B-cell. */
  doAntibody(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'marrow-antibody'); return; }
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    if (this.bcascade(owner)) {
      if (this.now < s.bcellReadyAt) { this.refund(f, 'marrow-antibody'); return; }
      this.spawnBCell(owner, tx, ty);
      return;
    }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.throwAntibody(owner, f.x + Math.cos(ang) * 20, f.y + Math.sin(ang) * 20, ang, null);
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('nail', f.x, { volume: 0.42, rate: 1.5 });
  }

  /**
   * One antibody in the air. The host throws them straight; a B-cell's come out of the same
   * function with a body to steer into, so a homing antibody is the same 12 damage and the same
   * permanent latch as one you threw yourself — there is only one kind of antibody.
   */
  private throwAntibody(owner: Owner, x: number, y: number, ang: number, homing: Fighter | null): void {
    const shot: AntiShot = {
      owner, x, y,
      vx: Math.cos(ang) * ANTI_SPEED,
      vy: Math.sin(ang) * ANTI_SPEED,
      spin: ang,
      seed: Math.random() * 999,
      diesAt: this.now + ANTI_LIFE_MS,
      homing,
      reg: null,
    };
    const reg: RegisteredProjectile = {
      owner,
      getX: () => shot.x,
      getY: () => shot.y,
      damage: ANTI_DAMAGE,
      steal: () => {
        const i = this.shots.indexOf(shot);
        if (i >= 0) this.shots.splice(i, 1);
      },
    };
    shot.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.shots.push(shot);
  }

  /**
   * Click+ — a B-cell, released toward the cursor. It is not a summon and never takes a socket:
   * it crawls, it dies to anything, and what it is for is the two homing antibodies it throws
   * every three seconds at whoever is nearest.
   */
  private spawnBCell(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.bcellReadyAt = this.now + BCELL_COOLDOWN_MS;
    this.bcells.push({
      owner,
      x: f.x + Math.cos(ang) * 22,
      y: f.y + Math.sin(ang) * 22,
      ang,
      hp: BCELL_HP,
      seed: Math.random() * 999,
      hurt: 0,
      diesAt: this.now + BCELL_LIFE_MS,
      nextSalvoAt: this.now + BCELL_SALVO_MS,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).serum(f.x, f.y, 5, 20, 520);
    this.api.showFloatingText(f.x, f.y - 46, '🟡 B-CELL', this.hex(MRW.bcellLit));
    Sfx.playAt('bubble', f.x, { volume: 0.6, rate: 1.15 });
  }

  /** E — a macrophage. */
  doMacrosma(owner: Owner): void {
    if (!this.spawnCell(owner, 'macrophage', 'marrow-macrosma')) return;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 46, '🦠 MACROPHAGE', this.hex(MRW.macroLit));
    Sfx.playAt('slime-splat', f.x, { volume: 0.6, rate: 0.7 });
  }

  /** R — a neutrophil. */
  doNeutralize(owner: Owner): void {
    if (!this.spawnCell(owner, 'neutrophil', 'marrow-neutralize')) return;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 46, '🧫 NEUTROPHIL', this.hex(MRW.neutLit));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.5 });
  }

  /**
   * F — five tentacles, unless four of them landed on the same body last time, in which case
   * this cast is a T-cell instead and the arming is spent.
   */
  doDendricles(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'marrow-dendricles'); return; }
    const s = this.side(owner);

    // F+ — the recast window. The T-cell that just landed is still standing there and this
    // press is the one that turns it, so it happens before anything else F can mean.
    if (this.now < s.killerWindowUntil && s.killerTarget) {
      this.makeKiller(owner, s.killerTarget);
      s.killerWindowUntil = 0;
      s.killerTarget = null;
      return;
    }

    if (s.tcellArmed) {
      if (!this.spawnCell(owner, 'tcell', 'marrow-dendricles')) return;
      s.tcellArmed = false;
      this.api.showFloatingText(f.x, f.y - 46, '🛡️ T-CELL', this.hex(MRW.tcellLit));
      Sfx.playAt('status-buff', f.x, { volume: 0.75, rate: 1.15 });
      this.openKillerWindow(owner);
      return;
    }

    // The fan is not thrown, it is whipped: `updateVolleys` lets one tentacle out at a time.
    this.volleys.push({
      owner, tx, ty,
      track: owner === 'player' && this.api.elementId === 'marrow',
      fired: 0,
      nextAt: this.now,
      hits: new Map<Fighter, number>(),
    });
  }

  /**
   * F+ — hand F straight back for 2.5 seconds so the recast is physically possible.
   *
   * The cooldown is *reset*, not merely ignored, so the second press goes through `castAbility`
   * like any other cast — which is what keeps the conversion on the online relay. If the window
   * lapses unspent, `updateKillerWindow` puts the cooldown back where it would have been, so
   * declining the offer is never cheaper than never being offered it.
   */
  private openKillerWindow(owner: Owner): void {
    if (!this.up(owner, 'f')) return;
    const s = this.side(owner);
    const own = this.mine(owner);
    const cell = own[own.length - 1];
    if (!cell || cell.kind !== 'tcell') return;
    s.killerWindowUntil = this.now + KILLER_WINDOW_MS;
    s.killerTarget = cell;
    this.fighter(owner).resetCooldown('marrow-dendricles');
    if (owner !== 'player') return;
    this.api.showFloatingText(cell.x, cell.y - 30, '⚔️ F AGAIN — KILLER T', this.hex(MRW.killerLit));
  }

  /** The offer expires: put the cooldown back, dated from the cast that made the T-cell. */
  private updateKillerWindow(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!s.killerWindowUntil) continue;
      // The cell can also be eaten out from under the offer — a razed T-cell never reaches
      // `killCell`, so membership is re-checked here rather than trusted.
      if (s.killerTarget && !this.summons.includes(s.killerTarget)) s.killerTarget = null;
      if (s.killerTarget && this.now < s.killerWindowUntil) continue;
      s.killerWindowUntil = 0;
      s.killerTarget = null;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      f.restampCooldown('marrow-dendricles');
      f.reduceCooldown('marrow-dendricles', KILLER_WINDOW_MS);
    }
  }

  /** The turn itself. Same cell, same socket — a great deal more of it. */
  private makeKiller(owner: Owner, cell: Summon): void {
    if (!this.summons.includes(cell)) return;
    cell.kind = 'killer';
    cell.maxHp = KILLER_HP;
    cell.hp = KILLER_HP;
    cell.help = null;
    cell.reach = 0;
    cell.heals = 0;
    cell.nextActionAt = this.now + 400;
    cell.nextDashAt = this.now + KILLER_DASH_MS;
    this.fx(owner).lyse(cell.x, cell.y, MRW.killerLit, 18);
    this.fx(owner).serum(cell.x, cell.y, 8, 26, 620);
    this.api.showFloatingText(cell.x, cell.y - 30, '⚔️ KILLER T', this.hex(MRW.killerLit));
    Sfx.playAt('status-buff', cell.x, { volume: 0.85, rate: 0.75 });
    Sfx.playAt('bone', cell.x, { volume: 0.6, rate: 0.7 });
  }

  /** At most one tentacle a frame, so the fan always reads as a sweep and never as a burst. */
  private updateVolleys(): void {
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i];
      // The caster died mid-sweep: the rest of the fan never happens.
      if (!this.alive(this.fighter(v.owner))) { this.volleys.splice(i, 1); continue; }
      if (this.now < v.nextAt) continue;

      this.whipDendricle(v);
      v.fired++;
      v.nextAt = this.now + DEND_STEP_MS;
      if (v.fired >= DEND_COUNT) { this.endVolley(v); this.volleys.splice(i, 1); }
    }
  }

  /** One tentacle of a fan, aimed and hit-tested where the caster is standing right now. */
  private whipDendricle(v: Volley): void {
    const f = this.fighter(v.owner);
    const s = this.side(v.owner);
    if (v.track) { v.tx = s.aimX; v.ty = s.aimY; }

    const aim = Math.atan2(v.ty - f.y, v.tx - f.x);
    const range = Math.min(DEND_RANGE, Math.max(52, Phaser.Math.Distance.Between(f.x, f.y, v.tx, v.ty)));
    // All five go at the cursor. They are only pushed sideways off the aim line so the bundle
    // reads as five tentacles — never fanned into a cone that misses at range.
    const off = (v.fired - (DEND_COUNT - 1) / 2) * DEND_OFFSET;
    const ex = Phaser.Math.Clamp(f.x + Math.cos(aim) * range - Math.sin(aim) * off, this.left, this.right);
    const ey = Phaser.Math.Clamp(f.y + Math.sin(aim) * range + Math.cos(aim) * off, this.top, this.bottom);
    const a = Math.atan2(ey - f.y, ex - f.x);

    let struck = false;
    for (const t of this.targetsOf(v.owner)) {
      if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) > DEND_TIP_R + 8 * t.sizeMult) continue;
      t.takeDamage(DEND_DAMAGE);
      v.hits.set(t, (v.hits.get(t) ?? 0) + 1);
      struck = true;
      this.api.spawnHitFlash(t.x, t.y, MRW.marrowLit);
    }

    this.lashes.push({
      owner: v.owner, x0: f.x, y0: f.y, x1: ex, y1: ey,
      diesAt: this.now + DEND_LASH_MS, seed: Math.random() * 999, hit: struck,
    });

    this.avatar(v.owner)?.play('sweep', a);
    Sfx.playAt('whip', f.x, { volume: 0.5, rate: 1.1 + v.fired * 0.08 });
  }

  /** The sweep is over. Four on one body and the next cast is a summon instead. */
  private endVolley(v: Volley): void {
    let best = 0;
    for (const n of v.hits.values()) best = Math.max(best, n);
    if (best < DEND_TRANSFORM_HITS) return;

    const f = this.fighter(v.owner);
    this.side(v.owner).tcellArmed = true;
    this.fx(v.owner).serum(f.x, f.y - 10, 8, 26, 700);
    if (v.owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 58, `🧬 ${best}/5 — T-CELL READY`, this.hex(MRW.tcellLit));
    }
    Sfx.playAt('status-buff', f.x, { volume: 0.8, rate: 0.95 });
  }

  /** Q — five mast cells, which do not take slots and do not last. */
  doMastacre(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'marrow-mastacre'); return; }
    for (let i = 0; i < MAST_COUNT; i++) {
      const a = (i / MAST_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      this.masts.push({
        owner,
        x: f.x + Math.cos(a) * 26,
        y: f.y + Math.sin(a) * 26,
        hp: MAST_HP,
        seed: Math.random() * 999,
        hurt: 0,
        explodeAt: this.now + MAST_FUSE_MS,
      });
    }
    this.avatar(owner)?.play('raise');
    this.fx(owner).serum(f.x, f.y, 12, 40, 800);
    this.api.showFloatingText(f.x, f.y - 54, '💥 MASTACRE', this.hex(MRW.mastLit));
    Sfx.playAt('bubble', f.x, { volume: 0.85, rate: 0.8 });
    Sfx.playAt('status-buff', f.x, { volume: 0.6, rate: 0.7 });

    // Q+ — the overflow. Five detonations are worth 100, so the response is armed exactly when
    // the bar could not have held what this cast was about to pay it.
    const s = this.side(owner);
    if (this.up(owner, 'q') && s.inflammation + INFLAM_PER_MAST * MAST_COUNT >= AUTO_THRESHOLD) {
      this.beginAutoimmunity(owner);
    }
  }

  /**
   * Q+ — ten seconds of a fever that has stopped telling the difference between things. Every
   * cell reddens, doubles, and splashes half of every strike onto anything of yours standing in
   * it; the bar is pinned at a hundred until it passes.
   */
  private beginAutoimmunity(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.autoUntil = this.now + AUTO_MS;
    s.inflammation = INFLAM_MAX;
    this.fx(owner).inflame(f.x, f.y, 46);
    this.fx(owner).degranulate(f.x, f.y, 90);
    this.api.showFloatingText(f.x, f.y - 66, '🩸 AUTOIMMUNITY', this.hex(MRW.inflame));
    this.api.scene.cameras.main.shake(320, 0.006);
    Sfx.playAt('status-debuff', f.x, { volume: 0.9, rate: 0.6 });
    Sfx.playAt('explosion-medium', f.x, { volume: 0.5, rate: 0.5 });
  }

  /** The one place a slot is claimed. Returns false (and refunds) when the bar is full. */
  private spawnCell(owner: Owner, kind: SummonKind, abilityId: string): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, abilityId); return false; }
    if (this.mine(owner).length >= MAX_SUMMONS) {
      this.deny(owner, abilityId, '🦴 BONE BAR FULL');
      return false;
    }

    const maxHp = kind === 'macrophage' ? MACRO_HP
      : kind === 'neutrophil' ? NEUT_HP
        : kind === 'killer' ? KILLER_HP : TCELL_HP;
    const a = Math.random() * Math.PI * 2;
    this.summons.push({
      owner, kind,
      x: f.x + Math.cos(a) * 24,
      y: f.y + Math.sin(a) * 24,
      ang: a,
      hp: maxHp,
      maxHp,
      seed: Math.random() * 999,
      hurt: 0,
      anim: 0,
      nextActionAt: this.now + 400,
      target: null,
      help: null,
      reach: 0,
      buffed: false,
      spdMult: 1,
      dmgMult: 1,
      heals: 0,
      nextDevourAt: 0,
      janitor: 0,
      nextCytoAt: this.now + CYTO_EVERY_MS,
      nextDashAt: this.now + KILLER_DASH_MS,
      dash: 0,
    });
    this.avatar(owner)?.play('flex');
    this.fx(owner).serum(f.x, f.y, 5, 20, 520);
    return true;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'marrow';
    const npcIs = this.api.npcElementId === 'marrow';
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateInflammation(delta);
    this.updateShots(delta);
    this.updateStuck();
    this.shootCells();
    this.updateSummons(delta);
    this.updateBCells(delta);
    this.updateCytos(delta);
    this.updateVulns();
    this.updateMasts(delta);
    this.updateNets(delta);
    this.updateVolleys();
    this.updateKillerWindow();
    this.updateLashes();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintHud(playerIs);
    this.pushStatuses(playerIs, npcIs);
    void time;
  }

  private hasLiveState(): boolean {
    return this.shots.length > 0 || this.stuck.length > 0 || this.summons.length > 0
      || this.masts.length > 0 || this.nets.length > 0 || this.lashes.length > 0
      || this.volleys.length > 0 || this.bcells.length > 0 || this.cytos.length > 0
      || this.vulns.length > 0;
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. NETs are floor, cells are things that walk over you.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  // ── Antibodies ─────────────────────────────────────────────────────────────

  private updateShots(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      // A B-cell's antibodies steer. Turn rate rather than snap-to, so a body that is already
      // past them still gets away — they are guided, not guaranteed.
      if (s.homing && this.alive(s.homing)) {
        const want = Math.atan2(s.homing.y - s.y, s.homing.x - s.x);
        s.spin = Phaser.Math.Angle.RotateTo(s.spin, want, 5 * dt);
        s.vx = Math.cos(s.spin) * ANTI_SPEED;
        s.vy = Math.sin(s.spin) * ANTI_SPEED;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      let landed = false;
      for (const t of this.targetsOf(s.owner)) {
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > ANTI_R + 12 * t.sizeMult) continue;
        t.takeDamage(ANTI_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, MRW.bone);
        this.attachAntibody(s.owner, t);
        landed = true;
        break;
      }

      const gone = landed || this.now >= s.diesAt
        || s.x < this.left || s.x > this.right || s.y < this.top || s.y > this.bottom;
      if (!gone) continue;
      if (s.reg) this.api.projectileRegistry.remove(s.reg);
      this.shots.splice(i, 1);
    }
  }

  /** Ten to a body. Number eleven is simply the 12 damage and nothing else. */
  private attachAntibody(owner: Owner, victim: Fighter): void {
    const on = this.stuck.filter((a) => a.victim === victim && a.owner === owner);
    if (on.length >= ANTI_PER_VICTIM) return;
    const taken = new Set(on.map((a) => a.slot));
    let slot = 0;
    while (taken.has(slot) && slot < ANTI_PER_VICTIM) slot++;
    this.stuck.push({ owner, victim, slot, seed: Math.random() * 999 });
    this.fx(owner).latch(victim.x, victim.y);
    Sfx.playAt('stab', victim.x, { volume: 0.4, rate: 1.7 });
    if (on.length + 1 === ANTI_PER_VICTIM) {
      this.api.showFloatingText(victim.x, victim.y - 40, '🦴 COATED ×10', this.hex(MRW.bone));
    }
  }

  /** The only thing that ever removes one: the body it was stuck to being gone. */
  private updateStuck(): void {
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      if (!this.alive(this.stuck[i].victim)) this.stuck.splice(i, 1);
    }
  }

  private antibodiesOn(victim: Fighter): number {
    return this.stuck.reduce((n, a) => n + (a.victim === victim ? 1 : 0), 0);
  }

  /**
   * The count that actually buffs a bite. Only the antibodies *this* side stuck on the body
   * count — in a Marrow mirror both hosts end up coated, and neither should be feeding the
   * other's cells.
   */
  private antibodiesFrom(owner: Owner, victim: Fighter): number {
    return this.stuck.reduce((n, a) => n + (a.victim === victim && a.owner === owner ? 1 : 0), 0);
  }

  // ── Cells take fire ────────────────────────────────────────────────────────

  /**
   * Cells are killable, and this is the only thing in the kit that kills them: any shot
   * belonging to the other side that touches one. Both shot systems have to be checked — the
   * physics group every element fires into, and the registry the kits with hand-drawn
   * projectiles use.
   */
  private shootCells(): void {
    if (this.summons.length === 0 && this.masts.length === 0 && this.bcells.length === 0) return;
    const bodies: { owner: Owner; x: number; y: number; r: number; hit: (dmg: number) => void }[] = [];
    for (const c of this.summons) {
      bodies.push({
        owner: c.owner, x: c.x, y: c.y, r: this.cellRadius(c),
        hit: (d) => { c.hp -= d; c.hurt = 1; },
      });
    }
    for (const m of this.masts) {
      bodies.push({ owner: m.owner, x: m.x, y: m.y, r: 15, hit: (d) => { m.hp -= d; m.hurt = 1; } });
    }
    for (const b of this.bcells) {
      bodies.push({
        owner: b.owner, x: b.x, y: b.y, r: BCELL_R,
        hit: (d) => { b.hp -= d; b.hurt = 1; },
      });
    }

    for (const b of bodies) {
      const mineIsPlayer = b.owner === 'player';
      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) > b.r) continue;
        b.hit(Math.max(5, p.damage ?? 10));
        p.destroy();
        break;
      }
      for (const rp of this.api.projectileRegistry.within(this.other(b.owner), b.x, b.y, b.r)) {
        b.hit(Math.max(5, rp.damage));
        this.api.projectileRegistry.steal(rp);
        break;
      }
    }
  }

  // ── Cells ──────────────────────────────────────────────────────────────────

  private updateSummons(delta: number): void {
    const dt = delta / 1000;
    // A macrophage's devour splices out of `this.summons` mid-loop (it can eat the enemy's
    // cells), so this walks a snapshot and re-checks membership rather than an index.
    for (const c of [...this.summons]) {
      if (!this.summons.includes(c)) continue;
      c.hurt = Math.max(0, c.hurt - dt * 3);
      c.anim = Math.max(0, c.anim - dt * 2.6);
      const home = this.fighter(c.owner);

      if (c.hp <= 0 || !this.alive(home) || !this.isMarrow(c.owner)) { this.killCell(c); continue; }

      c.dash = Math.max(0, c.dash - dt * 3);
      const auto = this.isAuto(c.owner);
      const base = c.kind === 'macrophage' ? MACRO_SPEED
        : c.kind === 'neutrophil' ? NEUT_SPEED
          : c.kind === 'killer' ? KILLER_SPEED : TCELL_SPEED;
      const speed = base * c.spdMult * (1 + INFLAM_SPEED * this.heat(c.owner)) * (auto ? AUTO_SPEED : 1);

      // A T-cell nurses the board — unless the fever has turned, in which case nobody nurses:
      // it drops whoever it was propping up and goes to bite something like everything else.
      if (c.kind === 'tcell') {
        if (!auto) { this.updateTcell(c, dt, speed); continue; }
        c.help = null;
        c.reach = 0;
      }

      // ── Everything else: walk at whatever it is willing to bite, and bite it. ──
      if (!this.alive(c.target)) c.target = this.cellTarget(c);
      const t = c.target;
      if (!t) {
        // Nothing to fight: drift around the host rather than piling into a corner.
        const orbit = this.vizT * 0.9 + c.seed;
        this.stepToward(c, home.x + Math.cos(orbit) * 46, home.y + Math.sin(orbit) * 30, speed * 0.6, dt);
      } else {
        const reach = this.cellReach(c);
        const d = Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y);
        if (d > reach + 8 * t.sizeMult) this.stepToward(c, t.x, t.y, speed, dt);
        else if (this.now >= c.nextActionAt) this.cellAttack(c, t);
        if (c.kind === 'killer' && this.now >= c.nextDashAt) this.killerDash(c, t);
      }

      if (c.kind === 'macrophage' && this.now >= c.nextDevourAt) this.devour(c);
      if (c.kind === 'neutrophil' && this.up(c.owner, 'r') && this.now >= c.nextCytoAt) {
        this.cytokineBlast(c);
      }
    }
  }

  /**
   * Who a cell is walking at. Ordinarily the nearest enemy — but a red cell with nothing left to
   * fight turns around, which is the whole warning label on Autoimmunity.
   */
  private cellTarget(c: Summon): Fighter | null {
    const enemy = this.nearestTarget(c.owner, c.x, c.y);
    if (enemy) return enemy;
    if (!this.isAuto(c.owner)) return null;
    const home = this.fighter(c.owner);
    return this.alive(home) ? home : null;
  }

  private cellReach(c: Summon): number {
    if (c.kind === 'killer') return KILLER_REACH;
    if (c.kind === 'neutrophil') return NEUT_REACH;
    if (c.kind === 'tcell') return TCELL_REACH;
    return MACRO_REACH + JANITOR_REACH * c.janitor;
  }

  /** Drawn size, and therefore the size that gets shot at. Only the janitor ever changes it. */
  private cellSize(c: Summon): number {
    return c.kind === 'macrophage' ? 1 + JANITOR_SIZE * c.janitor : 1;
  }

  private cellRadius(c: Summon): number {
    if (c.kind === 'macrophage') return 17 * this.cellSize(c);
    return c.kind === 'killer' ? 15 : 12;
  }

  private stepToward(c: Summon, tx: number, ty: number, speed: number, dt: number): void {
    const want = Math.atan2(ty - c.y, tx - c.x);
    c.ang = Phaser.Math.Angle.RotateTo(c.ang, want, 6 * dt);
    c.x = Phaser.Math.Clamp(c.x + Math.cos(c.ang) * speed * dt, this.left, this.right);
    c.y = Phaser.Math.Clamp(c.y + Math.sin(c.ang) * speed * dt, this.top, this.bottom);
  }

  private cellAttack(c: Summon, t: Fighter): void {
    c.ang = Math.atan2(t.y - c.y, t.x - c.x);
    c.anim = 1;
    const home = this.fighter(c.owner);
    const auto = this.isAuto(c.owner);
    const rate = auto ? AUTO_RATE : 1;
    const power = c.dmgMult * (auto ? AUTO_DAMAGE : 1);

    // The coat is what the click was for: it is a damage multiplier every cell on the board
    // reads off the body it is biting, and a bigger meal for a macrophage on top of that.
    const coat = this.antibodiesFrom(c.owner, t);
    const coatMult = 1 + ANTI_BITE_BONUS * coat;

    if (c.kind === 'macrophage') {
      c.nextActionAt = this.now + MACRO_BITE_MS * rate;
      // E+ — every funeral this one has cleaned up after is worth another 12% of the bite.
      const grown = 1 + JANITOR_DAMAGE * c.janitor;
      const dmg = MACRO_BITE_DAMAGE * power * coatMult * grown;
      this.strike(c, t, dmg);
      const feed = MACRO_BITE_HEAL + ANTI_HEAL_BONUS * coat + JANITOR_HEAL * c.janitor;
      c.hp = Math.min(c.maxHp, c.hp + feed);
      if (this.alive(home) && home !== t) {
        home.heal(feed);
        // Silent at 5 — that is the baseline. Once the coat is paying, it says so.
        if (coat > 0 || c.janitor > 0) {
          this.api.showFloatingText(home.x, home.y - 44, `💉 +${feed}`, this.hex(MRW.serum));
        }
      }
      this.api.spawnHitFlash(t.x, t.y, MRW.macroLit);
      this.fx(c.owner).bite(t.x, t.y, c.ang, 22 * this.cellSize(c));
      Sfx.playAt('bone', t.x, { volume: 0.5, rate: 0.85 });
      return;
    }

    if (c.kind === 'killer') {
      c.nextActionAt = this.now + KILLER_ATTACK_MS * rate;
      this.strike(c, t, KILLER_DAMAGE * power * coatMult);
      this.api.spawnHitFlash(t.x, t.y, MRW.killerLit);
      this.fx(c.owner).spray(t.x, t.y, MRW.killerLit, 8, 26);
      Sfx.playAt('stab', t.x, { volume: 0.7, rate: 0.85 });
      return;
    }

    c.nextActionAt = this.now + NEUT_ATTACK_MS * rate;
    this.strike(c, t, NEUT_DAMAGE * power * coatMult);
    this.api.spawnHitFlash(t.x, t.y, MRW.neutLit);
    this.fx(c.owner).spray(t.x, t.y, MRW.neut, 7, 24);
    Sfx.playAt('stab', t.x, { volume: 0.6, rate: 1.25 });
  }

  /**
   * A cell landing a hit. Ordinarily this is one line; under Autoimmunity it is the reason the
   * upgrade is dangerous — half of every strike splashes onto the host and onto any of your own
   * cells standing inside the same reach, and a strike aimed at your own body is self-inflicted
   * damage rather than something an ally shield should catch.
   */
  private strike(c: Summon, t: Fighter, amount: number): void {
    const home = this.fighter(c.owner);
    t.takeDamage(amount, t === home ? { selfInflicted: true } : undefined);
    if (!this.isAuto(c.owner)) return;

    const splash = amount * AUTO_SPLASH;
    const r = this.cellReach(c) + 12;
    if (this.alive(home) && home !== t
        && Phaser.Math.Distance.Between(c.x, c.y, home.x, home.y) <= r + 8 * home.sizeMult) {
      home.takeDamage(splash, { selfInflicted: true });
      this.api.spawnHitFlash(home.x, home.y, MRW.inflame);
    }
    for (const o of [...this.summons]) {
      if (o === c || o.owner !== c.owner) continue;
      if (Phaser.Math.Distance.Between(c.x, c.y, o.x, o.y) > r) continue;
      o.hp -= splash;
      o.hurt = 1;
      if (o.hp <= 0) this.killCell(o);
    }
  }

  /**
   * F+ — the lunge. Resolved as a line rather than as a movement over frames: the cell ends up
   * on the far side, everything it went through takes the hit exactly once, and `fx.lunge` draws
   * the rip it left. A dash into a wall is simply a shorter dash.
   */
  private killerDash(c: Summon, t: Fighter): void {
    c.nextDashAt = this.now + KILLER_DASH_MS;
    c.dash = 1;
    const a = Math.atan2(t.y - c.y, t.x - c.x);
    const x0 = c.x;
    const y0 = c.y;
    c.x = Phaser.Math.Clamp(c.x + Math.cos(a) * KILLER_DASH_DIST, this.left, this.right);
    c.y = Phaser.Math.Clamp(c.y + Math.sin(a) * KILLER_DASH_DIST, this.top, this.bottom);
    c.ang = a;

    const seg = new Phaser.Geom.Line(x0, y0, c.x, c.y);
    const dmg = KILLER_DASH_DAMAGE * c.dmgMult * (this.isAuto(c.owner) ? AUTO_DAMAGE : 1);
    const caught = this.isAuto(c.owner) && !this.targetsOf(c.owner).length
      ? [this.fighter(c.owner)] : this.targetsOf(c.owner);
    for (const v of caught) {
      if (!this.alive(v)) continue;
      const near = Phaser.Geom.Line.GetNearestPoint(seg, new Phaser.Geom.Point(v.x, v.y));
      if (Phaser.Math.Distance.Between(near.x, near.y, v.x, v.y) > KILLER_DASH_R + 8 * v.sizeMult) continue;
      v.takeDamage(dmg, v === this.fighter(c.owner) ? { selfInflicted: true } : undefined);
      this.api.spawnHitFlash(v.x, v.y, MRW.killerLit);
    }
    this.fx(c.owner).lunge(x0, y0, c.x, c.y);
    Sfx.playAt('whoosh', c.x, { volume: 0.7, rate: 0.9 });
  }

  /**
   * R+ — the shotgun. Seven pellets out along the cell's own facing, which means a neutrophil
   * standing off at range sprays past you and one in your face empties all seven into you.
   */
  private cytokineBlast(c: Summon): void {
    c.nextCytoAt = this.now + CYTO_EVERY_MS;
    c.anim = 1;
    for (let i = 0; i < CYTO_COUNT; i++) {
      const a = c.ang + ((i / (CYTO_COUNT - 1)) - 0.5) * CYTO_SPREAD + (Math.random() - 0.5) * 0.06;
      const speed = CYTO_SPEED * (0.85 + Math.random() * 0.3);
      this.cytos.push({
        owner: c.owner,
        x: c.x + Math.cos(a) * 10,
        y: c.y + Math.sin(a) * 10,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        seed: Math.random() * 999,
        diesAt: this.now + CYTO_LIFE_MS,
      });
    }
    this.fx(c.owner).cytoBlast(c.x, c.y, c.ang);
    Sfx.playAt('whoosh', c.x, { volume: 0.4, rate: 1.7 });
  }

  /**
   * Macrosma's second half: anything the *other* side has put on the floor inside 46px is eaten
   * outright, whoever built it. `purgeSummons` is the game's existing contract for that, so a
   * Conquest keep and a Life sapling are eaten by the same four lines that eat a rival T-cell.
   */
  private devour(c: Summon): void {
    c.nextDevourAt = this.now + MACRO_DEVOUR_MS;
    const eaten = this.api.purgeSummons(c.x, c.y, MACRO_DEVOUR_R, c.owner);
    if (eaten <= 0) return;
    const heal = MACRO_DEVOUR_HEAL * eaten;
    c.hp = Math.min(c.maxHp, c.hp + heal);
    c.anim = 1;
    const home = this.fighter(c.owner);
    if (this.alive(home)) {
      home.heal(heal);
      this.fx(c.owner).serum(home.x, home.y, 6, 22, 560);
    }
    this.fx(c.owner).bite(c.x, c.y, c.ang, 30);
    this.api.showFloatingText(c.x, c.y - 26, `🍽️ +${heal}`, this.hex(MRW.macroLit));
    Sfx.playAt('bone', c.x, { volume: 0.8, rate: 0.6 });
  }

  /**
   * The T-cell never fights. It walks to whichever of its own side's cells most needs it —
   * anything unbuffed first, then anything hurt — extends a tentacle, and hands over the buff
   * (once) and a top-up (as often as it likes, for less every time).
   */
  private updateTcell(c: Summon, dt: number, speed: number): void {
    if (c.help && (!this.summons.includes(c.help) || c.help.hp <= 0)) c.help = null;
    if (!c.help || this.now >= c.nextActionAt) c.help = this.pickPatient(c);

    const home = this.fighter(c.owner);
    if (!c.help) {
      c.reach = Math.max(0, c.reach - dt * 3);
      const orbit = this.vizT * 0.7 + c.seed;
      this.stepToward(c, home.x + Math.cos(orbit) * 40, home.y + Math.sin(orbit) * 26, speed * 0.6, dt);
      return;
    }

    const p = c.help;
    const d = Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y);
    if (d > TCELL_REACH) {
      c.reach = Math.max(0, c.reach - dt * 3);
      this.stepToward(c, p.x, p.y, speed, dt);
      return;
    }

    c.ang = Math.atan2(p.y - c.y, p.x - c.x);
    c.reach = Math.min(1, c.reach + dt * 4);
    if (c.reach < 1 || this.now < c.nextActionAt) return;

    // ── The hand-off ──
    c.nextActionAt = this.now + TCELL_HELP_MS;
    let did = false;
    if (!p.buffed) {
      p.buffed = true;
      p.spdMult = TCELL_SPEED_BUFF;
      p.dmgMult = TCELL_DAMAGE_BUFF;
      did = true;
      this.api.showFloatingText(p.x, p.y - 26, '🧬 +25% SPD  +50% DMG', this.hex(MRW.tcellLit));
    }
    if (p.hp < p.maxHp) {
      const amount = Math.max(TCELL_HEAL_FLOOR, Math.round(TCELL_HEAL * TCELL_HEAL_FALLOFF ** p.heals));
      p.heals++;
      p.hp = Math.min(p.maxHp, p.hp + amount);
      did = true;
      this.api.showFloatingText(p.x, p.y - 16, `💚 +${amount}`, this.hex(MRW.serum));
    }
    if (!did) { c.help = null; return; }
    this.fx(c.owner).serum(p.x, p.y, 6, 20, 520);
    Sfx.playAt('heal', p.x, { volume: 0.45, rate: 1.35 });
  }

  /** Unbuffed first, then whoever is furthest from full. Never itself. */
  private pickPatient(c: Summon): Summon | null {
    let best: Summon | null = null;
    let bestScore = -Infinity;
    for (const o of this.summons) {
      if (o === c || o.owner !== c.owner || o.hp <= 0) continue;
      const missing = 1 - o.hp / o.maxHp;
      const score = (o.buffed ? 0 : 100) + missing * 40
        - Phaser.Math.Distance.Between(c.x, c.y, o.x, o.y) / 60;
      if (score > bestScore) { bestScore = score; best = o; }
    }
    return best;
  }

  private killCell(c: Summon): void {
    const i = this.summons.indexOf(c);
    if (i < 0) return;
    this.summons.splice(i, 1);
    this.fx(c.owner).lyse(c.x, c.y, CELL_TINT[c.kind], c.kind === 'macrophage' ? 20 : 14);
    Sfx.playAt('slime-splat', c.x, { volume: 0.5, rate: 1.2 });
    this.janitorTidy(c.owner);
    // A dead T-cell takes the offer with it. Expired rather than cleared, so the next frame's
    // `updateKillerWindow` still puts the cooldown it handed back where it belongs.
    const s = this.side(c.owner);
    if (s.killerTarget === c) { s.killerTarget = null; s.killerWindowUntil = this.now; }

    // A neutrophil is meant to die. This is what it was for.
    if (c.kind !== 'neutrophil') return;
    this.nets.push({
      owner: c.owner,
      x: Phaser.Math.Clamp(c.x, this.left, this.right),
      y: Phaser.Math.Clamp(c.y, this.top, this.bottom),
      diesAt: this.now + NET_MS,
      tick: 0,
      seed: Math.random() * 999,
    });
    this.fx(c.owner).netSnap(c.x, c.y, NET_R);
    Sfx.playAt('trap-set', c.x, { volume: 0.8, rate: 0.8 });
    if (c.owner === 'player') {
      this.api.showFloatingText(c.x, c.y - 24, '🕸️ NET', this.hex(MRW.net));
    }
  }

  /**
   * E+ — the Cell Janitor. Anything of yours dying is a mess, and the macrophages clean it: a
   * full heal each and one more size, permanently, to a maximum of five. It is called from every
   * route a cell can leave the field by — its own death, a mast detonating, a Ruin spike razing
   * the board — because "when other summons die" has to mean all of them or the upgrade reads as
   * broken the first time somebody wipes your cells for you.
   */
  private janitorTidy(owner: Owner): void {
    if (!this.up(owner, 'e')) return;
    let grew = 0;
    for (const m of this.summons) {
      if (m.owner !== owner || m.kind !== 'macrophage') continue;
      m.hp = m.maxHp;
      if (m.janitor < JANITOR_MAX) { m.janitor++; grew++; }
      this.fx(owner).serum(m.x, m.y, 4, 16, 460);
    }
    if (grew <= 0 || owner !== 'player') return;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 40, '🧹 CELL JANITOR', this.hex(MRW.inflameLit));
    Sfx.playAt('heal', f.x, { volume: 0.4, rate: 0.8 });
  }

  // ── B-cells (Click+) ───────────────────────────────────────────────────────

  private updateBCells(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bcells.length - 1; i >= 0; i--) {
      const b = this.bcells[i];
      b.hurt = Math.max(0, b.hurt - dt * 3);
      const home = this.fighter(b.owner);
      if (!this.alive(home) || !this.isMarrow(b.owner)) { this.bcells.splice(i, 1); continue; }
      if (b.hp <= 0 || this.now >= b.diesAt) { this.bcells.splice(i, 1); this.popBCell(b); continue; }

      // It crawls at the cursor and keeps crawling once it gets there, which is what makes it a
      // thrown thing rather than a pet: you point, and it goes, and it does not come back.
      const s = this.side(b.owner);
      const goal = b.owner === 'player' && this.api.elementId === 'marrow'
        ? { x: s.aimX, y: s.aimY }
        : (this.nearestTarget(b.owner, b.x, b.y) ?? { x: s.aimX, y: s.aimY });
      if (Phaser.Math.Distance.Between(b.x, b.y, goal.x, goal.y) > 24) {
        const want = Math.atan2(goal.y - b.y, goal.x - b.x);
        b.ang = Phaser.Math.Angle.RotateTo(b.ang, want, 2.6 * dt);
      }
      const speed = BCELL_SPEED * (1 + INFLAM_SPEED * this.heat(b.owner));
      b.x = Phaser.Math.Clamp(b.x + Math.cos(b.ang) * speed * dt, this.left, this.right);
      b.y = Phaser.Math.Clamp(b.y + Math.sin(b.ang) * speed * dt, this.top, this.bottom);

      // The 25: it is a projectile in the end, and it spends itself on the first body it reaches.
      let spent = false;
      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BCELL_R + 12 * t.sizeMult) continue;
        t.takeDamage(BCELL_DAMAGE * (this.isAuto(b.owner) ? AUTO_DAMAGE : 1));
        this.api.spawnHitFlash(t.x, t.y, MRW.bcellLit);
        spent = true;
        break;
      }
      if (spent) { this.bcells.splice(i, 1); this.popBCell(b); continue; }

      if (this.now < b.nextSalvoAt) continue;
      b.nextSalvoAt = this.now + BCELL_SALVO_MS;
      const mark = this.nearestTarget(b.owner, b.x, b.y);
      if (!mark) continue;
      for (let k = 0; k < BCELL_SALVO; k++) {
        const a = Math.atan2(mark.y - b.y, mark.x - b.x) + (k - (BCELL_SALVO - 1) / 2) * 0.4;
        this.throwAntibody(b.owner, b.x + Math.cos(a) * 12, b.y + Math.sin(a) * 12, a, mark);
      }
      this.fx(b.owner).latch(b.x, b.y);
      Sfx.playAt('nail', b.x, { volume: 0.4, rate: 1.9 });
    }
  }

  private popBCell(b: BCell): void {
    this.fx(b.owner).lyse(b.x, b.y, MRW.bcell, 14);
    Sfx.playAt('slime-splat', b.x, { volume: 0.45, rate: 1.35 });
  }

  // ── Cytokines (R+) ─────────────────────────────────────────────────────────

  private updateCytos(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.cytos.length - 1; i >= 0; i--) {
      const p = this.cytos[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let hit = false;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > CYTO_R + 10 * t.sizeMult) continue;
        t.takeDamage(CYTO_DAMAGE * (this.isAuto(p.owner) ? AUTO_DAMAGE : 1));
        this.markVuln(t);
        this.api.spawnHitFlash(t.x, t.y, MRW.neutLit);
        hit = true;
        break;
      }

      const gone = hit || this.now >= p.diesAt
        || p.x < this.left || p.x > this.right || p.y < this.top || p.y > this.bottom;
      if (gone) this.cytos.splice(i, 1);
    }
  }

  /** One pellet's worth of mark. The clock is refreshed by every pellet; the stack is capped. */
  private markVuln(victim: Fighter): void {
    let v = this.vulns.find((x) => x.victim === victim);
    if (!v) {
      v = { victim, stacks: 0, until: 0 };
      this.vulns.push(v);
    }
    const before = v.stacks;
    v.stacks = Math.min(CYTO_VULN_STACKS, v.stacks + 1);
    v.until = this.now + CYTO_VULN_MS;
    if (v.stacks !== before && v.stacks === CYTO_VULN_STACKS) {
      this.api.showFloatingText(victim.x, victim.y - 34, '🧪 +50% DAMAGE TAKEN', this.hex(MRW.neutLit));
    }
  }

  /**
   * The single writer of `marrowIncomingMult`. Rewritten from scratch every frame off the stack
   * table rather than added to on hit, so an expiry can never leave a body permanently soft.
   */
  private updateVulns(): void {
    for (let i = this.vulns.length - 1; i >= 0; i--) {
      const v = this.vulns[i];
      if (this.alive(v.victim) && this.now < v.until) {
        v.victim.marrowIncomingMult = 1 + CYTO_VULN_PER * v.stacks;
        continue;
      }
      if (v.victim?.active) v.victim.marrowIncomingMult = 1;
      this.vulns.splice(i, 1);
    }
  }

  private vulnStacks(f: Fighter): number {
    return this.vulns.find((v) => v.victim === f && this.now < v.until)?.stacks ?? 0;
  }

  // ── Mast cells ─────────────────────────────────────────────────────────────

  private updateMasts(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.masts.length - 1; i >= 0; i--) {
      const m = this.masts[i];
      m.hurt = Math.max(0, m.hurt - dt * 3);
      const home = this.fighter(m.owner);
      if (!this.alive(home) || !this.isMarrow(m.owner)) { this.masts.splice(i, 1); continue; }

      if (m.hp <= 0 || this.now >= m.explodeAt) { this.masts.splice(i, 1); this.detonate(m); continue; }

      const t = this.nearestTarget(m.owner, m.x, m.y);
      if (!t) continue;
      const speed = MAST_SPEED * (1 + INFLAM_SPEED * this.heat(m.owner));
      const a = Math.atan2(t.y - m.y, t.x - m.x);
      m.x = Phaser.Math.Clamp(m.x + Math.cos(a) * speed * dt, this.left, this.right);
      m.y = Phaser.Math.Clamp(m.y + Math.sin(a) * speed * dt, this.top, this.bottom);
    }
  }

  private detonate(m: Mast): void {
    const auto = this.isAuto(m.owner);
    const dmg = MAST_DAMAGE * (auto ? AUTO_DAMAGE : 1);
    for (const t of this.targetsOf(m.owner)) {
      if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > MAST_BLAST_R + 8 * t.sizeMult) continue;
      t.takeDamage(dmg);
      this.api.spawnHitFlash(t.x, t.y, MRW.mastLit);
    }
    // Q+ — a red mast cell does not check whose blast radius it is standing in.
    if (auto) {
      const home = this.fighter(m.owner);
      if (this.alive(home)
          && Phaser.Math.Distance.Between(m.x, m.y, home.x, home.y) <= MAST_BLAST_R + 8 * home.sizeMult) {
        home.takeDamage(dmg * AUTO_SPLASH, { selfInflicted: true });
        this.api.spawnHitFlash(home.x, home.y, MRW.inflame);
      }
      for (const c of [...this.summons]) {
        if (c.owner !== m.owner) continue;
        if (Phaser.Math.Distance.Between(m.x, m.y, c.x, c.y) > MAST_BLAST_R) continue;
        c.hp -= dmg * AUTO_SPLASH;
        c.hurt = 1;
        if (c.hp <= 0) this.killCell(c);
      }
    }
    this.janitorTidy(m.owner);
    this.addInflammation(m.owner, INFLAM_PER_MAST);
    this.fx(m.owner).degranulate(m.x, m.y, MAST_BLAST_R);
    Sfx.playAt('explosion-medium', m.x, { volume: 0.7, rate: 1.3 });
    this.api.scene.cameras.main.shake(140, 0.004);
  }

  // ── NETs ───────────────────────────────────────────────────────────────────

  private updateNets(delta: number): void {
    for (let i = this.nets.length - 1; i >= 0; i--) {
      const n = this.nets[i];
      if (this.now >= n.diesAt) { this.nets.splice(i, 1); continue; }
      n.tick += delta;
      while (n.tick >= NET_TICK_MS) {
        n.tick -= NET_TICK_MS;
        for (const t of this.targetsOf(n.owner)) {
          if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > NET_R + 8 * t.sizeMult) continue;
          t.takeDamage(NET_DPS * (NET_TICK_MS / 1000));
        }
      }
    }
  }

  /** True while this body is standing in a web belonging to the other side. */
  private inHostileNet(f: Fighter): boolean {
    if (!this.alive(f)) return false;
    const mine: Owner = f === this.api.player ? 'player' : 'npc';
    return this.nets.some((n) => n.owner !== mine
      && Phaser.Math.Distance.Between(n.x, n.y, f.x, f.y) <= NET_R + 8 * f.sizeMult);
  }

  private updateLashes(): void {
    for (let i = this.lashes.length - 1; i >= 0; i--) {
      if (this.now >= this.lashes[i].diesAt) this.lashes.splice(i, 1);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      let av = this.avatar(owner);

      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new MarrowAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }

      const s = this.sides[owner];
      const aim = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.nearestTarget(owner, f.x, f.y) ?? { x: s.aimX, y: s.aimY });
      av.setFacing(Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setInflammation(this.heat(owner));
      av.setBrood(this.mine(owner).length / MAX_SUMMONS);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.setIntensity(this.heat(owner) > 0.6 ? 1.3 : 1);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const n of this.nets) {
      const left = Phaser.Math.Clamp((n.diesAt - this.now) / 900, 0, 1);
      netWeb(g, this.col(n.owner), n.x, n.y, NET_R, 0.35 + left * 0.5, { t: this.vizT, seed: n.seed });
    }

    // Contact shadows, so a cell reads as standing on the floor rather than floating over it.
    for (const c of this.summons) {
      const big = c.kind === 'macrophage';
      const k = this.cellSize(c);
      g.fillStyle(this.col(c.owner)(MRW.ink), 0.3);
      g.fillEllipse(c.x, c.y + (big ? 15 * k : 11), (big ? 26 * k : 18), 7);
    }
    for (const m of this.masts) {
      g.fillStyle(this.col(m.owner)(MRW.ink), 0.28);
      g.fillEllipse(m.x, m.y + 14, 22, 6);
    }
    for (const b of this.bcells) {
      g.fillStyle(this.col(b.owner)(MRW.ink), 0.28);
      g.fillEllipse(b.x, b.y + 12, 20, 6);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const l of this.lashes) {
      const k = Phaser.Math.Clamp((l.diesAt - this.now) / DEND_LASH_MS, 0, 1);
      dendrite(g, this.col(l.owner), l.x0, l.y0, l.x1, l.y1, 0.3 + k * 0.7,
        { seed: l.seed, grip: 0.5 + k * 0.5, hit: l.hit });
    }

    for (const s of this.shots) {
      antibody(g, this.col(s.owner), s.x, s.y, s.spin, 1, { size: 1.15, seed: s.seed, hot: 0.5 });
    }

    // Antibodies riding their victims. Ten of them ring the body at fixed slots.
    for (const a of this.stuck) {
      const ang = (a.slot / ANTI_PER_VICTIM) * Math.PI * 2 + this.vizT * 0.35;
      const r = 15 + (a.slot % 3) * 3.5;
      const bx = a.victim.x + Math.cos(ang) * r;
      const by = a.victim.y + Math.sin(ang) * r * 0.85;
      antibody(g, this.col(a.owner), bx, by, ang, 0.95, { size: 0.85, seed: a.seed });
    }

    for (const m of this.masts) {
      const fuse = Phaser.Math.Clamp((m.explodeAt - this.now) / MAST_FUSE_MS, 0, 1);
      mastCell(g, this.col(m.owner), m.x, m.y, 1,
        { t: this.vizT, seed: m.seed, fuse, hurt: m.hurt, red: this.redOf(m.owner) });
      this.cellHealth(g, m.owner, m.x, m.y - 20, m.hp / MAST_HP, MRW.mast);
    }

    for (const b of this.bcells) {
      const charge = Phaser.Math.Clamp(1 - (b.nextSalvoAt - this.now) / BCELL_TELL_MS, 0, 1);
      bcell(g, this.col(b.owner), b.x, b.y, b.ang, 1, {
        t: this.vizT, seed: b.seed, charge, hurt: b.hurt, red: this.redOf(b.owner),
      });
      this.cellHealth(g, b.owner, b.x, b.y - 20, b.hp / BCELL_HP, MRW.bcell);
    }

    for (const p of this.cytos) {
      cytokine(g, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), 1,
        { seed: p.seed, t: this.vizT });
    }

    for (const c of this.summons) {
      const tint = this.col(c.owner);
      // E+ macrophages are red all the time; Autoimmunity reddens everything for its ten
      // seconds. One flag, so a janitor under a fever does not turn red twice.
      const janitor = c.kind === 'macrophage' && this.up(c.owner, 'e');
      const red = Math.max(this.redOf(c.owner), janitor ? 1 : 0);
      if (c.kind === 'macrophage') {
        macrophage(g, tint, c.x, c.y, c.ang, 1, {
          t: this.vizT, seed: c.seed, chew: c.anim, hurt: c.hurt, red, size: this.cellSize(c),
        });
      } else if (c.kind === 'neutrophil') {
        neutrophil(g, tint, c.x, c.y, c.ang, 1,
          { t: this.vizT, seed: c.seed, dash: 0.4 + c.anim * 0.6, hurt: c.hurt, red });
      } else if (c.kind === 'killer') {
        killerT(g, tint, c.x, c.y, c.ang, 1, {
          t: this.vizT, seed: c.seed, strike: c.anim, dash: c.dash, hurt: c.hurt, red,
        });
      } else {
        tcell(g, tint, c.x, c.y, c.ang, 1, {
          t: this.vizT, seed: c.seed, reach: c.reach, hurt: c.hurt, red,
          to: c.help ? { x: c.help.x, y: c.help.y } : null,
        });
      }
      // A buffed cell wears a thin cyan collar, so the T-cell's work is visible from across
      // the arena rather than only in the numbers.
      if (c.buffed) {
        g.lineStyle(1.6, tint(MRW.tcellLit), 0.6 + 0.25 * Math.sin(this.vizT * 4 + c.seed));
        g.strokeCircle(c.x, c.y, c.kind === 'macrophage' ? 20 * this.cellSize(c) : 14);
      }
      this.cellHealth(g, c.owner, c.x, c.y - (c.kind === 'macrophage' ? 24 * this.cellSize(c) : 18),
        c.hp / c.maxHp, CELL_TINT[c.kind]);
    }
  }

  /** A two-pixel bar over a cell. Hidden at full, because five full bars is just noise. */
  private cellHealth(
    g: Phaser.GameObjects.Graphics, owner: Owner, x: number, y: number, ratio: number, color: number,
  ): void {
    if (ratio >= 0.999) return;
    const w = 20;
    g.fillStyle(this.col(owner)(MRW.ink), 0.7);
    g.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
    g.fillStyle(this.col(owner)(color), 0.95);
    g.fillRect(x - w / 2, y, w * Phaser.Math.Clamp(ratio, 0, 1), 2);
  }

  // ── The bone bar ───────────────────────────────────────────────────────────

  /**
   * Two bars, top-left, and between them they are the whole element: five sockets cut into a
   * length of bone saying what you have out, and the fever underneath saying how well it is all
   * working. Screen space, small, and deliberately clear of the ability tray and the status
   * boxes on the other side.
   */
  private paintHud(playerIs: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIs) { this.hudLabel?.setVisible(false); return; }

    const x = this.left + 8;
    const y = this.top + 4;
    const W = 206;
    const H = 22;

    boneShaft(g, this.pcol, x, y, W, H, 1);

    const cells = this.mine('player');
    for (let i = 0; i < MAX_SUMMONS; i++) {
      const sx = x + 21 + i * ((W - 42) / (MAX_SUMMONS - 1));
      const sy = y + H / 2;
      const c = cells[i];
      // The socket: a hollow drilled into the bone.
      g.fillStyle(this.pcol(MRW.boneDeep), 0.95);
      g.fillCircle(sx, sy, 9.5);
      g.fillStyle(this.pcol(MRW.deep), 1);
      g.fillCircle(sx, sy, 8);
      if (!c) {
        g.lineStyle(1, this.pcol(MRW.boneShade), 0.5);
        g.strokeCircle(sx, sy, 5.5);
        continue;
      }
      const red = Math.max(this.redOf('player'),
        c.kind === 'macrophage' && this.up('player', 'e') ? 1 : 0);
      cellGlyph(g, this.pcol, c.kind, sx, sy, 6.4, 1, { t: this.vizT + i, red });
      // The cell's own health, as a ring around its socket.
      const ratio = Phaser.Math.Clamp(c.hp / c.maxHp, 0, 1);
      g.lineStyle(2, this.pcol(CELL_TINT[c.kind]), 0.9);
      g.beginPath();
      g.arc(sx, sy, 9.5, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2, false);
      g.strokePath();
      if (c.buffed) {
        g.lineStyle(1, this.pcol(MRW.tcellLit), 0.85);
        g.strokeCircle(sx, sy, 11.5);
      }
    }

    // ── Inflammation ──
    const s = this.sides.player;
    const k = this.heat('player');
    const by = y + H + 8;
    const bh = 10;
    g.fillStyle(this.pcol(MRW.ink), 0.85);
    g.fillRoundedRect(x - 3, by - 3, W + 6, bh + 6, 4);
    g.lineStyle(1.4, this.pcol(k > 0.66 ? MRW.inflame : MRW.marrowDeep), 0.75);
    g.strokeRoundedRect(x - 3, by - 3, W + 6, bh + 6, 4);
    g.fillStyle(this.pcol(MRW.deep), 1);
    g.fillRect(x, by, W, bh);
    g.fillStyle(this.pcol(MRW.marrow), 1);
    g.fillRect(x, by, W * k, bh);
    g.fillStyle(this.pcol(MRW.inflame), 0.55 + 0.35 * Math.sin(this.vizT * 6) * k);
    g.fillRect(x, by, W * k, bh * 0.45);
    g.lineStyle(1, this.pcol(MRW.ink), 0.6);
    for (let i = 1; i < 4; i++) g.lineBetween(x + (W * i) / 4, by, x + (W * i) / 4, by + bh);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, by + bh + 5, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f1e7d0',
        stroke: '#14090e',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    const auto = this.isAuto('player');
    const killerLeft = Math.max(0, s.killerWindowUntil - this.now);
    const bcellLeft = this.bcascade('player') ? Math.max(0, s.bcellReadyAt - this.now) : 0;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(
      (auto ? `🩸 AUTOIMMUNE ${((s.autoUntil - this.now) / 1000).toFixed(1)}s   ·   ` : '')
      + `INFLAMMATION ${Math.round(s.inflammation)}/${INFLAM_MAX}`
      + `   ·   +${(INFLAM_HOST_REGEN * k).toFixed(1)} HP/s   ·   SPD ×${(1 + INFLAM_SPEED * k).toFixed(2)}`
      + (s.tcellArmed ? '   ·   F: T-CELL READY' : '')
      + (killerLeft > 0 ? `   ·   ⚔️ F AGAIN: KILLER T (${(killerLeft / 1000).toFixed(1)}s)` : '')
      + (this.bcascade('player')
        ? `   ·   🟡 B-CELL ${bcellLeft > 0 ? `${(bcellLeft / 1000).toFixed(1)}s` : 'READY'}` : ''),
    );
    this.hudLabel.setColor(auto ? '#ff3b3b' : k > 0.66 ? '#ff8a6b' : '#f1e7d0');
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;
    const s = this.sides.player;
    const k = this.heat('player');

    this.api.setStatusIndicator('marrow-inflammation', playerIs && s.inflammation > 0 ? {
      name: 'Inflammation', emoji: '🔥', color: MRW.inflame,
      description: `A fever at ${Math.round(s.inflammation)} of ${INFLAM_MAX}. It regenerates you `
        + `${(INFLAM_HOST_REGEN * k).toFixed(1)} HP a second, every cell you own ${(INFLAM_CELL_REGEN * k).toFixed(1)} `
        + `a second, and moves all of you ${Math.round(INFLAM_SPEED * k * 100)}% faster. It drains `
        + `${INFLAM_DRAIN} a second — taking 20 damage is worth 5, and each macrophage pays 2 a second.`,
      count: Math.round(s.inflammation), priority: 128,
    } : null);

    const cells = this.mine('player');
    this.api.setStatusIndicator('marrow-cells', playerIs && cells.length > 0 ? {
      name: 'Bone Bar', emoji: '🦴', color: MRW.bone,
      description: `${cells.length} of ${MAX_SUMMONS} sockets filled — `
        + `${cells.map((c) => KIND_NAME[c.kind]).join(', ')}. A sixth cell is refused rather than `
        + 'queued, so the last slot is a decision.',
      count: cells.length, suffix: `/${MAX_SUMMONS}`, priority: 129,
    } : null);

    this.api.setStatusIndicator('marrow-tcell', playerIs && s.tcellArmed ? {
      name: 'T-Cell Ready', emoji: '🧬', color: MRW.tcell,
      description: 'Four dendricles landed on one body, so F is a summon until you spend it: a '
        + '50 HP T-cell that buffs your other cells by 25% speed and 50% damage once each, and '
        + 'tops them up by 25 HP with diminishing returns.',
      priority: 126,
    } : null);

    const mine = this.masts.filter((m) => m.owner === 'player');
    this.api.setStatusIndicator('marrow-mast', playerIs && mine.length > 0 ? {
      name: 'Mast Cells', emoji: '💥', color: MRW.mast,
      description: `${mine.length} out. They do not take sockets. Each detonates for ${MAST_DAMAGE} `
        + `inside ${MAST_BLAST_R}px and hands you ${INFLAM_PER_MAST} inflammation — killing one `
        + 'early just sets it off where it stands.',
      count: mine.length, until: Math.min(...mine.map((m) => m.explodeAt)), priority: 127,
    } : null);

    const coat = this.antibodiesOn(p);
    this.api.setStatusIndicator('marrow-coated', coat > 0 ? {
      name: 'Antibody Coat', emoji: '🦴', color: MRW.bone,
      description: `${coat} antibodies are stuck to you, out of a maximum of ${ANTI_PER_VICTIM}. `
        + `Every immune cell bites you ${Math.round(ANTI_BITE_BONUS * coat * 100)}% harder because of `
        + `them, and each macrophage bite feeds its owner ${ANTI_HEAL_BONUS * coat} extra HP. They do `
        + 'not fade and there is no way to shake them off.',
      count: coat, priority: 7,
    } : null);

    // The other half of the same fact, from the caster's side: what your own coat is buying.
    const marked = Math.max(0, ...this.targetsOf('player').map((t) => this.antibodiesFrom('player', t)));
    this.api.setStatusIndicator('marrow-marked', playerIs && marked > 0 ? {
      name: 'Marked Prey', emoji: '🎯', color: MRW.bone,
      description: `${marked} of your antibodies are stuck to the enemy. Every bite your cells land `
        + `on them does ${Math.round(ANTI_BITE_BONUS * marked * 100)}% more damage, and a macrophage `
        + `bite heals it and you ${MACRO_BITE_HEAL + ANTI_HEAL_BONUS * marked} instead of `
        + `${MACRO_BITE_HEAL}. Ten of them is double damage from the whole board.`,
      count: marked, suffix: `/${ANTI_PER_VICTIM}`, priority: 125,
    } : null);

    // ── The upgrades ──
    this.api.setStatusIndicator('marrow-auto', playerIs && this.isAuto('player') ? {
      name: 'Autoimmunity', emoji: '🩸', color: MRW.inflame,
      description: `Every cell you own is red: ${AUTO_DAMAGE}× damage, ${Math.round((AUTO_SPEED - 1) * 100)}% `
        + `faster and swinging ${Math.round((1 - AUTO_RATE) * 100)}% sooner — and half of every strike `
        + 'splashes onto you and onto any of your own cells inside the same reach. Your inflammation '
        + 'is pinned at 100 until it passes. With nothing left alive to fight they will come for you.',
      until: s.autoUntil, priority: 131,
    } : null);

    const bcells = this.bcells.filter((b) => b.owner === 'player');
    this.api.setStatusIndicator('marrow-bcells', playerIs && bcells.length > 0 ? {
      name: 'B-Cells', emoji: '🟡', color: MRW.bcell,
      description: `${bcells.length} crawling. They take no socket and nothing can raze them off `
        + `the board. Each is ${BCELL_DAMAGE} damage to the first body it reaches, and throws `
        + `${BCELL_SALVO} homing antibodies at the nearest enemy every ${BCELL_SALVO_MS / 1000} `
        + `seconds until it is spent — ${BCELL_HP} HP, and ${BCELL_LIFE_MS / 1000} seconds of life.`,
      count: bcells.length, priority: 124,
    } : null);

    this.api.setStatusIndicator('marrow-killer-window', playerIs && s.killerWindowUntil > this.now ? {
      name: 'Killer T Offered', emoji: '⚔️', color: MRW.killer,
      description: `F has been handed straight back. Press it again before the window closes and the `
        + `T-cell you just made turns killer: ${KILLER_HP} HP, ${KILLER_DAMAGE} a strike at `
        + `${KILLER_REACH}px, and a lunge clean through them every ${KILLER_DASH_MS / 1000} seconds. `
        + 'Let it lapse and the cooldown goes back where it was.',
      until: s.killerWindowUntil, priority: 130,
    } : null);

    const cytoStacks = this.vulnStacks(p);
    this.api.setStatusIndicator('marrow-cytokines', cytoStacks > 0 ? {
      name: 'Cytokines', emoji: '🧪', color: MRW.neut,
      description: `${cytoStacks} pellets of inflammatory protein are stuck to you. You take `
        + `${Math.round(CYTO_VULN_PER * cytoStacks * 100)}% more damage from everything while they last, `
        + `up to ${Math.round(CYTO_VULN_PER * CYTO_VULN_STACKS * 100)}%. Every fresh pellet restarts `
        + `the ${CYTO_VULN_MS / 1000} seconds.`,
      count: cytoStacks, suffix: `/${CYTO_VULN_STACKS}`, priority: 6,
    } : null);

    this.api.setStatusIndicator('marrow-netted', this.inHostileNet(p) ? {
      name: 'Netted', emoji: '🕸️', color: MRW.net,
      description: `A web of spiked protein from a dead neutrophil. ${NET_DPS} damage a second `
        + `and ${Math.round((1 - NET_SLOW) * 100)}% slower for as long as you stand in it.`,
      priority: 5,
    } : null);

    const theirs = this.mine('npc').length + this.masts.filter((m) => m.owner === 'npc').length;
    this.api.setStatusIndicator('marrow-swarm-warn', npcIs && theirs > 0 ? {
      name: 'Cells Inbound', emoji: '🦠', color: MRW.macro,
      description: `${theirs} immune cells are walking at you. They can be shot down — every one `
        + 'of them takes damage from anything you fire, and a neutrophil leaves a web when it dies.',
      count: theirs, priority: 4,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player, 'player'); }
  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc, 'npc'); }

  /**
   * Two things at once, and both have to be pulled by ArenaScene rather than pushed onto the
   * body: the fever's own haste on a Marrow host, and the NET slow on whoever is standing in
   * one — which applies to anybody, Marrow or not.
   */
  private speedMultFor(f: Fighter, owner: Owner): number {
    if (!f) return 1;
    let mult = 1;
    if (this.isMarrow(owner)) mult *= 1 + INFLAM_SPEED * this.heat(owner);
    if (this.inHostileNet(f)) mult *= NET_SLOW;
    return mult;
  }

  /** The bot's read on its own board. */
  summonCount(owner: Owner): number { return this.mine(owner).length; }
  mastCount(owner: Owner): number { return this.masts.filter((m) => m.owner === owner).length; }
  inflammationOf(owner: Owner): number { return this.sides[owner].inflammation; }
  isTcellArmed(owner: Owner): boolean { return this.sides[owner].tcellArmed; }

  /** Ability tray fill — the two cards that show something other than their own cooldown. */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    // Armed, F is a summon rather than a strike: show it as ready even mid-cooldown so the
    // transform is visible on the card and not only in the tray.
    if (abilityId === 'marrow-dendricles' && (s.tcellArmed || s.killerWindowUntil > time)) return 0;
    // Click+ — while the click is a B-cell it is on the B-cell's five seconds, not its own 440ms,
    // and the card has to say so or it reads as ready five seconds early.
    if (abilityId === 'marrow-antibody' && this.bcascade('player')) {
      return Phaser.Math.Clamp((s.bcellReadyAt - time) / BCELL_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'marrow-mastacre') {
      const mine = this.masts.filter((m) => m.owner === 'player');
      if (mine.length) {
        return Phaser.Math.Clamp((Math.min(...mine.map((m) => m.explodeAt)) - time) / MAST_FUSE_MS, 0, 1);
      }
    }
    return p.getCooldownRatio(abilityId);
  }

  // ── SummonPurgeTarget ──────────────────────────────────────────────────────

  /**
   * Cells and mast cells are things somebody summoned, so both go. NETs are not — they are the
   * floor decal a dead cell left behind, in the same class as a puddle, and the contract says
   * those survive. Antibodies ride a fighter and are never touched.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      razed++;
      report?.(px, py);
      return true;
    };

    for (let i = this.summons.length - 1; i >= 0; i--) {
      const c = this.summons[i];
      if (c.owner === exceptOwner) continue;
      if (!near(c.x, c.y)) continue;
      this.summons.splice(i, 1);
      // Deliberately not `killCell`: a razed neutrophil does not get to leave a web behind.
      this.fx(c.owner).lyse(c.x, c.y, CELL_TINT[c.kind], c.kind === 'macrophage' ? 20 : 14);
    }
    for (let i = this.masts.length - 1; i >= 0; i--) {
      const m = this.masts[i];
      if (m.owner === exceptOwner) continue;
      if (!near(m.x, m.y)) continue;
      this.masts.splice(i, 1);
      this.fx(m.owner).lyse(m.x, m.y, MRW.mast, 16);
    }

    // Any T-cell that was walking to a patient that just went is now walking to a corpse.
    for (const c of this.summons) if (c.help && !this.summons.includes(c.help)) c.help = null;
    // A razed board is still a board that died: the janitors clean up after it too.
    if (razed > 0) this.janitorTidy(this.other(exceptOwner));
    return razed;
  }
}
