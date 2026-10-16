import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Ability, CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import type { CustomStatus } from './StatusHudKit';
import {
  MAGNET, MagnetAvatar, MagnetColorFn, MagnetFx, drawCoin, drawCoinShot, drawGatherPile, drawNail,
  drawOrbitRing, drawScrap, drawSpikeFlying, drawSpikeHover, drawSpikePlanted,
} from './MagnetVisuals';
import { MagnetMech, MechAttack } from './MagnetMech';

type Owner = 'player' | 'npc';
const BOTH: readonly Owner[] = ['player', 'npc'];

// ── Tunables ──────────────────────────────────────────────────────────────

const PAD = 32;

// Click — Coin Flip
const COIN_AIR_MS = 3000;
const COIN_PEAK = 120;
const COIN_MAX = 8;
/** A press held this long stops tossing and starts holding every coin in the air. */
const HOVER_DELAY_MS = 220;
const COIN_SHOT_SPEED = 820;
const COIN_SHOT_DAMAGE = 6;
const COIN_SHOT_MS = 1100;

// E — Repulse
const REPULSE_R = 170;
const REPULSE_HALF = Phaser.Math.DegToRad(70);
/** How far a nailed body can be from you and still be shoved — the nail is the handle, not the wave. */
const REPULSE_PUSH_RANGE = 340;
const REPULSE_PUSH_SPEED = 720;
const REPULSE_PUSH_MS = 260;
/** A returning nail this close is caught by the wave and re-fired. */
const NAIL_REFIRE_R = 150;

// R — Nail Implant
const NAIL_SPEED = 840;
const NAIL_RANGE = 620;
const NAIL_DAMAGE = 10;
const NAIL_RIP_DAMAGE = 15;
const NAIL_STUCK_MS = 12000;
const NAIL_RETURN_SPEED = 760;

// F — Steel Spike
const SPIKE_CAST_RANGE = 560;
const SPIKE_HOVER_MS = 2000;
const SPIKE_RADIUS = 95;
const SPIKE_DAMAGE = 22;
const SPIKE_KNOCK = 380;
const SPIKE_KNOCK_MS = 160;
const SPIKE_LIFE_MS = 15000;
/** The bot's hovering spike chases its target this fast; the player's sits on the cursor. */
const SPIKE_NPC_FOLLOW_SPEED = 260;
const ZIP_SPEED = 1100;
const ZIP_MAX_MS = 900;
const ROD_SPEED = 1050;
const ROD_DAMAGE = 30;
const ROD_KNOCK = 520;
const ROD_KNOCK_MS = 180;

// Scrap
const SCRAP_COUNT = 3;
const SCRAP_FLY_DAMAGE = 8;
const SCRAP_GROUND_MS = 20000;
const SCRAP_PICKUP_R = 56;
const ORBIT_R = 46;
const ORBIT_SPEED = 3;
const ORBIT_MAX = 6;
const ORBIT_HIT_DAMAGE = 12;
const SCRAP_DASH_SPEED = 900;
const SCRAP_DASH_MS = 260;

// Q — Mecha Massacre
const GATHER_MS = 3000;

// Perks
/** Blade: the spike is a sword — a launched one hits twice as hard and breaks into five. */
const BLADE_SCRAP_COUNT = 5;
/** Electromagnet: orbiting scrap is live. */
const ELECTRO_ZAP_RANGE = 96;
const ELECTRO_ZAP_DAMAGE = 6;
const ELECTRO_ZAP_GAP_MS = 700;
const ELECTRO_STUN_MS = 500;

// ── World objects ─────────────────────────────────────────────────────────

interface Coin {
  owner: Owner;
  sx: number; sy: number;
  lx: number; ly: number;
  /** Airtime so far. Stops advancing while the owner holds the coins. */
  air: number;
  x: number; y: number; z: number;
  spin: number; spinRate: number;
}

interface CoinShot { owner: Owner; x: number; y: number; vx: number; vy: number; until: number }

interface Nail {
  owner: Owner;
  state: 'fly' | 'stuck' | 'return';
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  victim: Fighter | null;
  /** Where on the victim it went in, relative to their centre. */
  offX: number; offY: number;
  angle: number;
  stuckUntil: number;
}

interface Spike {
  owner: Owner;
  state: 'hover' | 'planted' | 'flying';
  x: number; y: number;
  slamAt: number;
  until: number;
  zipped: boolean;
  vx: number; vy: number;
  hit: Set<Fighter>;
}

interface Scrap {
  owner: Owner;
  state: 'fly' | 'ground' | 'orbit';
  x: number; y: number;
  vx: number; vy: number;
  angle: number; spin: number;
  size: number; seed: number;
  until: number;
  hit: Set<Fighter>;
}

/** A shard streaming in from the screen edge during the Mecha Massacre wind-up. Visual only. */
interface GatherBit { owner: Owner; sx: number; sy: number; startAt: number; landAt: number; seed: number; size: number }

interface Motion { kind: 'zip' | 'dash'; vx: number; vy: number; until: number; tx: number; ty: number }

interface Side {
  aimX: number; aimY: number;
  hover: boolean;
  gatherUntil: number;
  nextBitAt: number;
  mech: MagnetMech | null;
  /** The pilot is inside the mech right now. */
  piloting: boolean;
  preHp: number;
  prevAbsorber: ((amount: number) => boolean) | null;
  /** Ejected by Self-Destruct, still in the air. */
  pod: { sx: number; sy: number; lx: number; ly: number; startAt: number; landAt: number } | null;
  motion: Motion | null;
  nextZapAt: number;
}

const makeSide = (): Side => ({
  aimX: 0, aimY: 0, hover: false, gatherUntil: 0, nextBitAt: 0, mech: null, piloting: false,
  preHp: 0, prevAbsorber: null, pod: null, motion: null, nextZapAt: 0,
});

/** Mech key per ability slot, in tray order. */
const MECH_KEYS: Record<string, Exclude<MechAttack, 'destruct'> | 'destruct'> = {
  'magnet-coin': 'smash',
  'magnet-repulse': 'rail',
  'magnet-nail': 'avalanche',
  'magnet-spike': 'cannon',
  'magnet-mecha': 'destruct',
};

const MECH_CARDS: Array<[string, string]> = [
  ['[Click] Hydraulic Smash', 'Fist slam: 20 dmg, 3 scrap falls'],
  ['[E] Mag Rail', 'Live rail down the arena: 15/1s'],
  ['[R] Scrap Avalanche', 'Junk wall pins them, 50 scrap rain'],
  ['[F] Visor Cannon', '4s beam + burning slag'],
  ['[Q] Self-Destruct', 'Eject: 20 blasts across arena'],
];

// ── Arena API ─────────────────────────────────────────────────────────────

export interface MagnetArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly width: number;
  readonly height: number;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly isOnline: boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  readonly isInvasion: boolean;
  readonly playerAbilities: Ability[];
  readonly abilityBars: Array<{ lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  isTargetable(f: Fighter): boolean;
  /** Invasion: take one husk shot within `r` of the point out of the air. False if none. */
  blockHuskShot(x: number, y: number, r: number): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay one of the kit's non-ability actions (`magnet-recall`, `mecha-smash`, …). */
  broadcast(id: string): void;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  magnetColor(owner: Owner, base: number): number;
}

// ── MagnetKit ─────────────────────────────────────────────────────────────

/**
 * Magnet — a scrap-metal magician. Everything it owns is metal lying around the arena, and every
 * key is a different way of throwing that metal or of throwing itself at it.
 *
 * - **Coin Flip** (Click) tosses a coin that arcs for 3s and vanishes when it lands. Holding the
 *   button freezes every coin in the air (and its timer) in a blue field.
 * - **Repulse** (E) is a short cone that fires whatever is inside it the way you are facing:
 *   coins become bullets, a planted spike becomes a javelin, a nail on its way home is re-fired at
 *   the cursor, and an orbiting shard throws *you*. Nailed enemies are shoved from much further.
 * - **Nail Implant** (R) sticks a nail in someone (10). Again rips every nail out (15 each) and
 *   sends them flying home — which is exactly when Repulse wants to meet them.
 * - **Steel Spike** (F) hangs a rod over the cursor for 2s, then drives it in (22 + shockwave).
 *   Again pulls you to it; Repulse launches it (30), and a launched spike that hits a wall breaks
 *   into three shards that orbit you once collected, block shots and chip whoever comes close.
 * - **Mecha Massacre** (Q) roots you for 3s while scrap streams in from the edges, then you are
 *   the mech for 15s (see MagnetMech — Earth's old Titan Form, rebuilt).
 *
 * Both sides can play it. In an online match the npc side is a replica: its casts are replayed
 * here for the picture, but its pushes, stuns and self-motion on our player are left to the relay.
 */
export class MagnetKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  private readonly pcol: MagnetColorFn;
  private readonly ncol: MagnetColorFn;
  private readonly pfx: MagnetFx;
  private readonly nfx: MagnetFx;
  private playerAvatar: MagnetAvatar | null = null;
  private npcAvatar: MagnetAvatar | null = null;
  /** Floor layer under the fighters: spikes, resting scrap, shadows. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Air layer over the fighters: coins, nails, shots, orbiting scrap. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ────────────────────────────────────────────────────────────────
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private coins: Coin[] = [];
  private coinShots: CoinShot[] = [];
  private nails: Nail[] = [];
  private spikes: Spike[] = [];
  private scraps: Scrap[] = [];
  private bits: GatherBit[] = [];
  private shoves = new Map<Fighter, { vx: number; vy: number; until: number }>();
  private stuns = new Map<Fighter, number>();
  private wasDown = false;
  private downAt = 0;
  private cardsSwapped = false;

  constructor(private arena: MagnetArenaApi) {
    this.pcol = (base) => arena.magnetColor('player', base);
    this.ncol = (base) => arena.magnetColor('npc', base);
    this.pfx = new MagnetFx(arena.scene, this.pcol);
    this.nfx = new MagnetFx(arena.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private fx(owner: Owner): MagnetFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MagnetColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private avatar(owner: Owner): MagnetAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private isMagnet(owner: Owner): boolean {
    return owner === 'player' ? this.arena.elementId === 'magnet' : this.arena.npcElementId === 'magnet';
  }
  /** An online opponent: drawn and replayed here, simulated (and moved) on their own machine. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.arena.isOnline; }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side, and a co-op ally's attacks resolve on
    // its own machine — here they touch nobody.
    if (owner === 'npc' && this.arena.isInvasion) return [];
    const list = owner === 'player' ? this.arena.enemies : [this.arena.player];
    return list.filter((f) => this.alive(f) && this.arena.isTargetable(f));
  }

  /** Everything the kit may have left a field or a shove on. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private get left(): number { return PAD; }
  private get right(): number { return this.arena.width - PAD; }
  private get top(): number { return PAD; }
  private get bottom(): number { return this.arena.height - PAD; }

  private hit(owner: Owner, t: Fighter, dmg: number, color: number = MAGNET.sky): void {
    t.takeDamage(dmg);
    this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(color));
  }

  /**
   * Hold `f` at a velocity for `ms`. Our own replica's pushes on the local player are skipped:
   * the attacker's machine relays the shove it saw, and applying ours as well would double it.
   */
  private shove(by: Owner, f: Fighter, vx: number, vy: number, ms: number): void {
    if (this.isReplica(by) && f === this.arena.player) return;
    this.shoves.set(f, { vx, vy, until: this.now + ms });
  }

  private stunned(f: Fighter): boolean { return this.now < (this.stuns.get(f) ?? 0); }

  /** The player and the bot are held by this kit's speed mults, husks by `earthStunnedUntil`. */
  private stun(by: Owner, f: Fighter, ms: number): void {
    if (this.isReplica(by) && f === this.arena.player) return;
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    if (f !== this.arena.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private announce(x: number, y: number, text: string, color: number): void {
    const { scene } = this.arena;
    const t = scene.add.text(x, y, text, {
      fontSize: '12px', fontFamily: 'Arial Black', color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#07090e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** Is `(x, y)` inside the Repulse cone cast from `f` toward `angle`? */
  private inCone(f: Fighter, angle: number, x: number, y: number, slack = 0): boolean {
    const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
    if (d > REPULSE_R + slack) return false;
    if (d < 24) return true;
    const a = Math.atan2(y - f.y, x - f.x);
    return Math.abs(Phaser.Math.Angle.Wrap(a - angle)) <= REPULSE_HALF;
  }

  private orbitOf(owner: Owner): Scrap[] { return this.scraps.filter((s) => s.owner === owner && s.state === 'orbit'); }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      // The scene rebuilds its fighters, so a pilot left hidden needs nothing restored.
      s.mech?.destroy();
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.coins = [];
    this.coinShots = [];
    this.nails = [];
    this.spikes = [];
    this.scraps = [];
    this.bits = [];
    this.shoves.clear();
    this.stuns.clear();
    this.wasDown = false;
    this.downAt = 0;
    this.cardsSwapped = false;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    for (const id of ['magnet-coins', 'magnet-scrap', 'magnet-nailed', 'magnet-mech']) this.arena.setStatusIndicator(id, null);
  }

  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) this.groundGfx = this.arena.scene.add.graphics().setDepth(4);
    return this.groundGfx;
  }

  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) this.airGfx = this.arena.scene.add.graphics().setDepth(9);
    return this.airGfx;
  }

  // ── Input ──────────────────────────────────────────────────────────────

  /**
   * Player input. A click tosses a coin; a click *held* past {@link HOVER_DELAY_MS} stops tossing
   * and holds every coin in the air until it is let go. R and F each have a second job that never
   * touches the cooldown — ripping nails out, riding to a spike — and in the mech every key is
   * one of the mech's.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const now = this.now;
    const down = pointer.isDown;
    const pressed = down && !this.wasDown;
    this.wasDown = down;
    if (pressed) this.downAt = now;

    if (s.piloting && s.mech?.active) {
      this.setHover('player', false);
      const keys: Array<[boolean, MechAttack]> = [
        [pressed, 'smash'],
        [Phaser.Input.Keyboard.JustDown(eKey), 'rail'],
        [Phaser.Input.Keyboard.JustDown(rKey), 'avalanche'],
        [Phaser.Input.Keyboard.JustDown(fKey), 'cannon'],
        [Phaser.Input.Keyboard.JustDown(qKey), 'destruct'],
      ];
      for (const [hit, a] of keys) if (hit) this.mechKey('player', a, mouseX, mouseY);
      return;
    }
    // Rooted and busy while the scrap gathers.
    if (s.gatherUntil > 0) return;

    const ctx = (): CastContext => this.arena.buildPlayerContext(mouseX, mouseY);
    if (pressed) player.castAbility('magnet-coin', ctx());
    this.setHover('player', down && now - this.downAt >= HOVER_DELAY_MS);

    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('magnet-repulse', ctx());

    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (this.nails.some((n) => n.owner === 'player' && n.state === 'stuck')) {
        this.doRecall('player');
        this.arena.broadcast('magnet-recall');
      } else {
        player.castAbility('magnet-nail', ctx());
      }
    }

    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (this.zipTarget('player', mouseX, mouseY)) {
        this.doZip('player', mouseX, mouseY);
        this.arena.broadcast('magnet-zip');
      } else {
        player.castAbility('magnet-spike', ctx());
      }
    }

    if (Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('magnet-mecha', ctx());
  }

  private setHover(owner: Owner, on: boolean): void {
    const s = this.sides[owner];
    if (s.hover === on) return;
    s.hover = on;
    if (owner === 'player') this.arena.broadcast(on ? 'magnet-hover-on' : 'magnet-hover-off');
    if (on) {
      const f = this.fighter(owner);
      Sfx.playAt('magnet-pull', f.x, { rate: 1.6, volume: 0.35 });
    }
  }

  private mechKey(owner: Owner, a: MechAttack, x: number, y: number): void {
    const s = this.sides[owner];
    const mech = s.mech;
    if (!mech?.active) return;
    if (!mech.use(a, this.now, x, y)) return;
    if (owner === 'player') this.arena.broadcast(`mecha-${a}`);
    if (a === 'destruct') this.ejectPilot(owner);
    Sfx.playAt(a === 'smash' ? 'stone-slam' : a === 'rail' ? 'electric-charge' : a === 'cannon' ? 'beam-charge' : 'explosion-large',
      this.arena.width / 2, { volume: 0.6 });
  }

  /**
   * Online: one of the opponent's non-ability actions, already un-mirrored. Their abilities come
   * through the normal cast relay; these are the presses that never touch a cooldown.
   */
  replayNet(id: string, tx: number, ty: number): void {
    const s = this.sides.npc;
    s.aimX = tx;
    s.aimY = ty;
    switch (id) {
      case 'magnet-hover-on': this.sides.npc.hover = true; break;
      case 'magnet-hover-off': this.sides.npc.hover = false; break;
      case 'magnet-recall': this.doRecall('npc'); break;
      case 'magnet-zip': this.doZip('npc', tx, ty); break;
      case 'magnet-spike-land': {
        // Their spike followed their cursor; put ours where theirs came down. It may still be
        // hovering here, or have just landed if their message lost the race with our timer.
        const now = this.now;
        const sp = this.spikes.find((k) => k.owner === 'npc' && k.state === 'hover')
          ?? this.spikes.find((k) => k.owner === 'npc' && k.state === 'planted' && now - (k.until - SPIKE_LIFE_MS) < 600);
        if (sp) Object.assign(sp, this.clampSpike('npc', tx, ty));
        break;
      }
      default:
        if (id.startsWith('mecha-')) {
          const a = id.slice(6) as MechAttack;
          if (s.mech?.active && s.mech.use(a, this.now, tx, ty) && a === 'destruct') this.ejectPilot('npc');
        }
    }
  }

  // ── Casts (from the CastContext) ────────────────────────────────────────

  /** Click — Coin Flip: straight up off your thumb, landing where you stood. */
  doCoin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const mine = this.coins.filter((c) => c.owner === owner);
    if (mine.length >= COIN_MAX) {
      // The oldest coin drops out of the air to make room.
      this.coins.splice(this.coins.indexOf(mine[0]), 1);
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.coins.push({
      owner, sx: f.x, sy: f.y, lx: f.x, ly: f.y, air: 0, x: f.x, y: f.y, z: 0,
      spin: Math.random() * Math.PI, spinRate: 14 + Math.random() * 6,
    });
    this.avatar(owner)?.play('punch', ang, 220);
    this.fx(owner).sparks(f.x, f.y - 10, 3, -Math.PI / 2, 10, MAGNET.goldHi);
  }

  /** E — Repulse. Fires everything in the cone toward the aim. */
  doRepulse(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.sides[owner];
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const fx = this.fx(owner);
    fx.repulse(f.x, f.y, ang, REPULSE_R, REPULSE_HALF, MAGNET.blue);
    this.avatar(owner)?.play('clap', ang, 300);

    // Coins: every one inside the cone is fired the way you face, from where it hangs.
    let fired = 0;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.owner !== owner) continue;
      const hy = c.y - c.z;
      if (!this.inCone(f, ang, c.x, hy, 12) && !this.inCone(f, ang, c.x, c.y, 12)) continue;
      this.coins.splice(i, 1);
      this.coinShots.push({ owner, x: c.x, y: hy, vx: cos * COIN_SHOT_SPEED, vy: sin * COIN_SHOT_SPEED, until: this.now + COIN_SHOT_MS });
      fired++;
    }
    if (fired > 0) Sfx.playAt('money', f.x, { rate: 1.5, volume: 0.4 });

    // Planted spikes in the cone become javelins.
    for (const sp of this.spikes) {
      if (sp.owner !== owner || sp.state !== 'planted') continue;
      if (!this.inCone(f, ang, sp.x, sp.y, 20)) continue;
      sp.state = 'flying';
      sp.vx = cos * ROD_SPEED;
      sp.vy = sin * ROD_SPEED;
      sp.hit = new Set();
      fx.sparks(sp.x, sp.y, 8, ang, 10, MAGNET.sky);
      Sfx.playAt('whoosh', sp.x, { rate: 0.8, volume: 0.6 });
    }

    // Nails on their way home are caught by the wave and re-fired at the aim.
    for (const n of this.nails) {
      if (n.owner !== owner || n.state !== 'return') continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, n.x, n.y) > NAIL_REFIRE_R) continue;
      const a = Math.atan2(ty - n.y, tx - n.x);
      n.state = 'fly';
      n.vx = Math.cos(a) * NAIL_SPEED;
      n.vy = Math.sin(a) * NAIL_SPEED;
      n.travelled = 0;
      n.angle = a;
      fx.sparks(n.x, n.y, 6, a, 10, MAGNET.sky);
      this.announce(n.x, n.y - 18, 'RE-FIRED', MAGNET.sky);
    }

    // One shard of your orbit in the cone throws you the way you face.
    const shard = this.orbitOf(owner)
      .filter((sc) => this.inCone(f, ang, sc.x, sc.y, 16))
      .sort((a, b) => Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(a.y - f.y, a.x - f.x) - ang))
        - Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(b.y - f.y, b.x - f.x) - ang)))[0];
    if (shard) {
      this.scraps.splice(this.scraps.indexOf(shard), 1);
      fx.shrapnel(shard.x, shard.y, 5, { angle: ang + Math.PI, spread: 0.6, speed: 260, size: 8, color: MAGNET.gunHi });
      if (!this.isReplica(owner)) {
        s.motion = { kind: 'dash', vx: cos * SCRAP_DASH_SPEED, vy: sin * SCRAP_DASH_SPEED, until: this.now + SCRAP_DASH_MS, tx: 0, ty: 0 };
      }
      Sfx.playAt('dash', f.x, { volume: 0.5 });
    }

    // Nailed bodies are shoved from much further away — the nail in them is the handle.
    for (const t of this.targetsOf(owner)) {
      if (!this.nails.some((n) => n.owner === owner && n.state === 'stuck' && n.victim === t)) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > REPULSE_PUSH_RANGE) continue;
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      const k = 1 - 0.4 * (d / REPULSE_PUSH_RANGE);
      this.shove(owner, t, Math.cos(a) * REPULSE_PUSH_SPEED * k, Math.sin(a) * REPULSE_PUSH_SPEED * k, REPULSE_PUSH_MS);
      fx.grasp(f.x, f.y, t.x, t.y, MAGNET.blue, 300);
      this.announce(t.x, t.y - 30, 'REPULSED', MAGNET.sky);
    }
  }

  /** R — Nail Implant: shoot one nail. (The rip-out is {@link doRecall}.) */
  doNail(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const a = Math.atan2(ty - f.y, tx - f.x);
    this.nails.push({
      owner, state: 'fly', x: f.x + Math.cos(a) * 18, y: f.y + Math.sin(a) * 18,
      vx: Math.cos(a) * NAIL_SPEED, vy: Math.sin(a) * NAIL_SPEED, travelled: 0,
      victim: null, offX: 0, offY: 0, angle: a, stuckUntil: 0,
    });
    this.avatar(owner)?.play('punch', a, 240);
  }

  /** R again: rip every nail out (15 each) and send them home. */
  doRecall(owner: Owner): void {
    const f = this.fighter(owner);
    let n = 0;
    for (const nail of this.nails) {
      if (nail.owner !== owner || nail.state !== 'stuck') continue;
      const v = nail.victim;
      if (v && this.alive(v) && this.targetsOf(owner).includes(v)) this.hit(owner, v, NAIL_RIP_DAMAGE, MAGNET.rose);
      nail.state = 'return';
      nail.victim = null;
      const a = Math.atan2(f.y - nail.y, f.x - nail.x);
      nail.vx = Math.cos(a) * NAIL_RETURN_SPEED;
      nail.vy = Math.sin(a) * NAIL_RETURN_SPEED;
      nail.angle = a;
      this.fx(owner).sparks(nail.x, nail.y, 7, a, 10, MAGNET.chrome);
      n++;
    }
    if (n > 0) {
      this.avatar(owner)?.play('punch', Math.atan2(this.sides[owner].aimY - f.y, this.sides[owner].aimX - f.x), 260);
      Sfx.playAt('nail', f.x, { rate: 0.8, volume: 0.6 });
    }
  }

  /** F — Steel Spike: hang a rod over the point; it drops in 2 seconds. */
  doSpike(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const a = Math.atan2(ty - f.y, tx - f.x);
    const { x, y } = this.clampSpike(owner, tx, ty);
    this.spikes.push({
      owner, state: 'hover', x, y, slamAt: this.now + SPIKE_HOVER_MS, until: 0, zipped: false,
      vx: 0, vy: 0, hit: new Set(),
    });
    this.avatar(owner)?.play('raise', a, 400);
  }

  /** Keep a hovering spike inside cast range of its owner and inside the arena. */
  private clampSpike(owner: Owner, x: number, y: number): { x: number; y: number } {
    const f = this.fighter(owner);
    let px = x, py = y;
    if (this.alive(f)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, x, y);
      if (d > SPIKE_CAST_RANGE) {
        const a = Math.atan2(y - f.y, x - f.x);
        px = f.x + Math.cos(a) * SPIKE_CAST_RANGE;
        py = f.y + Math.sin(a) * SPIKE_CAST_RANGE;
      }
    }
    return {
      x: Phaser.Math.Clamp(px, this.left + 20, this.right - 20),
      y: Phaser.Math.Clamp(py, this.top + 20, this.bottom - 20),
    };
  }

  /**
   * A hovering spike follows its owner's cursor until it drops. The player's tracks exactly; the
   * bot's chases its target at a capped speed so the shadow can still be outrun. A replica's is
   * left where it was cast — its real landing spot arrives as `magnet-spike-land`.
   */
  private steerSpike(sp: Spike, dt: number): void {
    if (this.isReplica(sp.owner)) return;
    const s = this.sides[sp.owner];
    const want = this.clampSpike(sp.owner, s.aimX, s.aimY);
    if (sp.owner === 'player') { sp.x = want.x; sp.y = want.y; return; }
    const d = Phaser.Math.Distance.Between(sp.x, sp.y, want.x, want.y);
    const step = SPIKE_NPC_FOLLOW_SPEED * dt;
    if (d <= step) { sp.x = want.x; sp.y = want.y; return; }
    const a = Math.atan2(want.y - sp.y, want.x - sp.x);
    sp.x += Math.cos(a) * step;
    sp.y += Math.sin(a) * step;
  }

  /** The spike F-again would ride to: the unridden planted one nearest the aim. */
  private zipTarget(owner: Owner, ax: number, ay: number): Spike | null {
    let best: Spike | null = null;
    let bestD = Infinity;
    for (const sp of this.spikes) {
      if (sp.owner !== owner || sp.state !== 'planted' || sp.zipped) continue;
      const d = Phaser.Math.Distance.Between(ax, ay, sp.x, sp.y);
      if (d < bestD) { bestD = d; best = sp; }
    }
    return best;
  }

  /** F again: magnetise yourself to the spike. */
  doZip(owner: Owner, ax: number, ay: number): void {
    const sp = this.zipTarget(owner, ax, ay);
    if (!sp) return;
    sp.zipped = true;
    const f = this.fighter(owner);
    const a = Math.atan2(sp.y - f.y, sp.x - f.x);
    this.fx(owner).grasp(sp.x, sp.y, f.x, f.y, MAGNET.blue, 380);
    this.avatar(owner)?.play('dash', a, 300);
    Sfx.playAt('magnet-pull', f.x, { rate: 0.9, volume: 0.55 });
    if (this.isReplica(owner)) return;
    this.sides[owner].motion = {
      kind: 'zip', vx: Math.cos(a) * ZIP_SPEED, vy: Math.sin(a) * ZIP_SPEED,
      until: this.now + ZIP_MAX_MS, tx: sp.x, ty: sp.y,
    };
  }

  /** Q — Mecha Massacre: stand still while the scrap comes in. */
  doMecha(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.gatherUntil > 0 || s.piloting) return;
    s.gatherUntil = this.now + GATHER_MS;
    s.nextBitAt = this.now;
    s.motion = null;
    this.setHover(owner, false);
    this.avatar(owner)?.play('raise', -Math.PI / 2, GATHER_MS);
    this.announce(f.x, f.y - 46, 'SCRAP INCOMING', MAGNET.neon);
    Sfx.playAt('electric-charge', f.x, { rate: 0.6, volume: 0.6 });
  }

  // ── Mech pilot ──────────────────────────────────────────────────────────

  private enterMech(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.gatherUntil = 0;
    s.mech?.destroy();
    s.mech = new MagnetMech({
      scene: this.arena.scene,
      width: this.arena.width,
      height: this.arena.height,
      tint: this.col(owner),
      fx: this.fx(owner),
      targets: () => this.targetsOf(owner),
      hit: (t, dmg) => this.hit(owner, t, dmg, MAGNET.neon),
      stun: (t, ms) => this.stun(owner, t, ms),
      push: (t, vx, vy, ms) => this.shove(owner, t, vx, vy, ms),
      carry: (t, x) => {
        // Same rule as shoves: a replica's mech never moves our own body — the relay does.
        if (this.isReplica(owner) && t === this.arena.player) return;
        t.setPosition(x, t.y);
      },
      announce: (x, y, text, color) => this.announce(x, y, text, color),
      shake: (ms, k) => this.arena.scene.cameras.main.shake(ms, k),
    }, owner === 'npc', this.now);
    s.piloting = true;
    s.preHp = f.hp;
    s.prevAbsorber = f.damageAbsorber;
    this.hidePilot(f);
    if (owner === 'player') this.swapCards(true);
  }

  /** The pilot is the mech now: hidden, rooted and untouchable — reasserted every frame. */
  private hidePilot(f: Fighter): void {
    f.forceInvisible = true;
    f.setAlpha(0);
    f.setHealthBarVisible(false);
    f.isInvincible = true;
    f.damageAbsorber = () => true;
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
  }

  /** Bring the pilot back. `landed` = after a Self-Destruct pod touches down. */
  private restorePilot(owner: Owner, flash: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.piloting = false;
    s.pod = null;
    if (!f) return;
    f.forceInvisible = false;
    f.setAlpha(1);
    f.setHealthBarVisible(true);
    f.isInvincible = false;
    f.damageAbsorber = s.prevAbsorber;
    s.prevAbsorber = null;
    // A detour, not a heal — but it never costs you anything either. The replica's health is
    // streamed from its own machine.
    if (!this.isReplica(owner) && f.active) f.hp = Math.max(1, Math.min(f.maxHp, s.preHp));
    if (owner === 'player') this.swapCards(false);
    if (flash && f.active) {
      this.fx(owner).boom(f.x, f.y, 70, { color: MAGNET.neon, depth: 7 });
      this.arena.scene.cameras.main.shake(320, 0.02);
    }
  }

  /** Self-Destruct: the cockpit spits the pilot out toward the middle of the arena. */
  private ejectPilot(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const { width: W, height: H } = this.arena;
    const from = owner === 'npc' ? { x: W / 2, y: H - 146 } : { x: W / 2, y: 146 };
    const lx = Phaser.Math.Clamp(W / 2 + Phaser.Math.Between(-140, 140), 60, W - 60);
    const ly = owner === 'npc'
      ? Phaser.Math.Clamp(H * 0.38 + Phaser.Math.Between(-60, 60), 60, H - 120)
      : Phaser.Math.Clamp(H * 0.62 + Phaser.Math.Between(-60, 60), 120, H - 60);
    if (!this.isReplica(owner)) {
      f.setPosition(lx, ly);
      (f.body as Phaser.Physics.Arcade.Body | null)?.reset(lx, ly);
    }
    s.pod = { sx: from.x, sy: from.y, lx: f.x, ly: f.y, startAt: this.now, landAt: this.now + 620 };
    if (owner === 'player') this.swapCards(false);
  }

  /** The ability tray takes on the mech's kit while it is up. */
  private swapCards(on: boolean): void {
    if (on === this.cardsSwapped) return;
    this.cardsSwapped = on;
    const original = this.arena.playerAbilities;
    this.arena.abilityBars.forEach((bar, idx) => {
      if (on) {
        if (idx >= MECH_CARDS.length) return;
        bar.lbl?.setText(MECH_CARDS[idx][0]);
        bar.desc?.setText(MECH_CARDS[idx][1]);
      } else {
        if (idx >= original.length) return;
        const ab = original[idx];
        bar.lbl?.setText(`[${ab.displayKey}] ${ab.name}`);
        bar.desc?.setText(ab.description);
      }
    });
  }

  /** Ruin (Second Skin): the mech is a body, so it can be torn off. */
  revertForms(f: Fighter): string[] {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (this.fighter(owner) !== f) continue;
      if (s.piloting && s.mech?.active) {
        s.mech.end(this.now, false);
        this.restorePilot(owner, true);
        return ['Mecha Massacre'];
      }
      if (s.gatherUntil > 0) {
        s.gatherUntil = 0;
        return ['Mecha Massacre'];
      }
    }
    return [];
  }

  // ── Per-frame ──────────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerMagnet = false, isNpcMagnet = false): void {
    void time;
    const dt = delta / 1000;
    this.vizT += dt;
    // The bot faces its target; the replica's aim comes from its relayed casts.
    const npc = this.arena.npc;
    if (!this.isReplica('npc') && this.alive(this.arena.player) && npc) {
      this.sides.npc.aimX = this.arena.player.x;
      this.sides.npc.aimY = this.arena.player.y;
    }
    this.updateGather();
    this.updateMechs(delta);
    this.updateCoins(delta);
    this.updateCoinShots(dt);
    this.updateNails(dt);
    this.updateSpikes(dt);
    this.updateScraps(dt);
    this.updateMotions();
    this.updateShoves();
    this.updateStuns();
    this.paint();
    this.updateAvatars(delta, isPlayerMagnet, isNpcMagnet);
    this.pushStatuses(isPlayerMagnet);
  }

  private updateGather(): void {
    const now = this.now;
    const { width: W, height: H } = this.arena;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (s.gatherUntil <= 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.gatherUntil = 0; continue; }
      if (!this.isReplica(owner)) (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      // Shards stream in from all four edges.
      while (now >= s.nextBitAt) {
        s.nextBitAt += 55;
        const edge = Math.floor(Math.random() * 4);
        const sx = edge === 0 ? -20 : edge === 1 ? W + 20 : Math.random() * W;
        const sy = edge === 2 ? -20 : edge === 3 ? H + 20 : Math.random() * H;
        this.bits.push({ owner, sx, sy, startAt: now, landAt: now + 520 + Math.random() * 260, seed: Math.floor(Math.random() * 50), size: 5 + Math.random() * 6 });
      }
      if (now >= s.gatherUntil) this.enterMech(owner);
    }
    this.bits = this.bits.filter((b) => now < b.landAt);
  }

  private updateMechs(delta: number): void {
    const now = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.mech) {
        // The bot pilots itself; a replica's keys arrive over the wire.
        if (owner === 'npc' && s.mech.active && !this.isReplica('npc')) this.npcPilot(s.mech);
        const aim = owner === 'npc' && this.isReplica('npc') && this.alive(this.arena.player)
          ? { x: this.arena.player.x, y: this.arena.player.y }
          : { x: s.aimX, y: s.aimY };
        s.mech.update(now, delta, aim.x, aim.y);
        if (s.piloting && !s.mech.active && !s.pod) this.restorePilot(owner, false);
        if (s.mech.done) { s.mech.destroy(); s.mech = null; }
      }
      if (s.piloting && f) {
        if (!f.active) { this.restorePilot(owner, false); continue; }
        this.hidePilot(f);
        if (s.pod && now >= s.pod.landAt) this.restorePilot(owner, true);
      }
    }
  }

  /** The bot's hands on the mech: smash where the player is going, everything else on cooldown. */
  private npcPilot(mech: MagnetMech): void {
    const p = this.arena.player;
    if (!this.alive(p)) return;
    const now = this.now;
    const v = (p.body as Phaser.Physics.Arcade.Body | null)?.velocity;
    const lead = { x: p.x + (v?.x ?? 0) * 0.31, y: p.y + (v?.y ?? 0) * 0.31 };
    if (mech.until - now < 1200) { mech.use('destruct', now, p.x, p.y); this.ejectPilot('npc'); return; }
    if (mech.ready('smash', now)) mech.use('smash', now, lead.x, lead.y);
    if (mech.ready('rail', now)) mech.use('rail', now, lead.x, lead.y);
    if (mech.ready('cannon', now)) mech.use('cannon', now, p.x, p.y);
    if (mech.ready('avalanche', now) && now > mech.until - 12000) mech.use('avalanche', now, p.x, p.y);
  }

  private updateCoins(delta: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const held = this.sides[c.owner].hover;
      if (!held) {
        c.air += delta;
        c.spin += c.spinRate * (delta / 1000);
      } else {
        c.spin += 1.5 * (delta / 1000);
      }
      const t = Phaser.Math.Clamp(c.air / COIN_AIR_MS, 0, 1);
      c.x = Phaser.Math.Linear(c.sx, c.lx, t);
      c.y = Phaser.Math.Linear(c.sy, c.ly, t);
      c.z = 4 * COIN_PEAK * t * (1 - t);
      if (t >= 1) {
        // It hits the floor and is gone.
        this.coins.splice(i, 1);
        this.fx(c.owner).sparks(c.x, c.y, 3, -Math.PI / 2, 5, MAGNET.gold);
      }
    }
  }

  private updateCoinShots(dt: number): void {
    const now = this.now;
    for (let i = this.coinShots.length - 1; i >= 0; i--) {
      const s = this.coinShots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let gone = now >= s.until || s.x < this.left || s.x > this.right || s.y < this.top || s.y > this.bottom;
      if (!gone) {
        for (const t of this.targetsOf(s.owner)) {
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + 8) continue;
          this.hit(s.owner, t, COIN_SHOT_DAMAGE, MAGNET.gold);
          this.fx(s.owner).sparks(s.x, s.y, 4, Math.atan2(s.vy, s.vx) + Math.PI, 10, MAGNET.goldHi);
          gone = true;
          break;
        }
      }
      if (gone) this.coinShots.splice(i, 1);
    }
  }

  private updateNails(dt: number): void {
    const now = this.now;
    for (let i = this.nails.length - 1; i >= 0; i--) {
      const n = this.nails[i];
      const owner = this.fighter(n.owner);
      if (n.state === 'fly') {
        const sx = n.vx * dt, sy = n.vy * dt;
        n.x += sx; n.y += sy;
        n.travelled += Math.hypot(sx, sy);
        if (n.travelled > NAIL_RANGE || n.x < this.left || n.x > this.right || n.y < this.top || n.y > this.bottom) {
          this.fx(n.owner).sparks(n.x, n.y, 3, n.angle + Math.PI, 8, MAGNET.steel);
          this.nails.splice(i, 1);
          continue;
        }
        for (const t of this.targetsOf(n.owner)) {
          if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > this.bodyR(t) + 6) continue;
          this.hit(n.owner, t, NAIL_DAMAGE, MAGNET.steel);
          n.state = 'stuck';
          n.victim = t;
          n.offX = (n.x - t.x) * 0.7;
          n.offY = (n.y - t.y) * 0.7;
          n.stuckUntil = now + NAIL_STUCK_MS;
          Sfx.playAt('nail', t.x, { volume: 0.5 });
          this.announce(t.x, t.y - 30, 'NAILED', MAGNET.rose);
          break;
        }
      } else if (n.state === 'stuck') {
        const v = n.victim;
        if (!v || !v.active || v.hp <= 0 || now >= n.stuckUntil) {
          this.fx(n.owner).sparks(n.x, n.y, 3, Math.PI / 2, 8, MAGNET.steel);
          this.nails.splice(i, 1);
          continue;
        }
        n.x = v.x + n.offX;
        n.y = v.y + n.offY;
      } else {
        // Homing back to its owner; caught on arrival.
        if (!this.alive(owner)) { this.nails.splice(i, 1); continue; }
        const a = Math.atan2(owner.y - n.y, owner.x - n.x);
        n.vx = Math.cos(a) * NAIL_RETURN_SPEED;
        n.vy = Math.sin(a) * NAIL_RETURN_SPEED;
        n.angle = a;
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (Phaser.Math.Distance.Between(n.x, n.y, owner.x, owner.y) < 22) this.nails.splice(i, 1);
      }
    }
  }

  private updateSpikes(dt: number): void {
    const now = this.now;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const sp = this.spikes[i];
      if (sp.state === 'hover') {
        this.steerSpike(sp, dt);
        if (now < sp.slamAt) continue;
        sp.state = 'planted';
        // The landing spot is wherever the cursor dragged it; tell the opponent's sim.
        if (sp.owner === 'player') this.arena.broadcast('magnet-spike-land');
        sp.until = now + SPIKE_LIFE_MS;
        this.fx(sp.owner).slam(sp.x, sp.y, SPIKE_RADIUS, MAGNET.sky);
        this.arena.scene.cameras.main.shake(180, 0.008);
        Sfx.playAt('stone-slam', sp.x, { rate: 1.3, volume: 0.6 });
        for (const t of this.targetsOf(sp.owner)) {
          const d = Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y);
          if (d > SPIKE_RADIUS + this.bodyR(t) * 0.5) continue;
          this.hit(sp.owner, t, SPIKE_DAMAGE);
          const a = Math.atan2(t.y - sp.y, t.x - sp.x);
          this.shove(sp.owner, t, Math.cos(a) * SPIKE_KNOCK, Math.sin(a) * SPIKE_KNOCK, SPIKE_KNOCK_MS);
        }
      } else if (sp.state === 'planted') {
        if (now >= sp.until) {
          this.fx(sp.owner).shrapnel(sp.x, sp.y - 20, 4, { speed: 90, size: 9, color: MAGNET.iron });
          this.spikes.splice(i, 1);
        }
      } else {
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const blade = this.arena.hasPerk(sp.owner, 'blade');
        for (const t of this.targetsOf(sp.owner)) {
          if (sp.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > this.bodyR(t) + 14) continue;
          sp.hit.add(t);
          this.hit(sp.owner, t, ROD_DAMAGE * (blade ? 2 : 1));
          const a = Math.atan2(sp.vy, sp.vx);
          this.shove(sp.owner, t, Math.cos(a) * ROD_KNOCK, Math.sin(a) * ROD_KNOCK, ROD_KNOCK_MS);
          this.announce(t.x, t.y - 32, blade ? 'RUN THROUGH' : 'SKEWERED', MAGNET.sky);
        }
        // A wall: the spike shatters into scrap thrown back into the arena.
        let nx = 0, ny = 0;
        if (sp.x <= this.left) nx = 1; else if (sp.x >= this.right) nx = -1;
        if (sp.y <= this.top) ny = 1; else if (sp.y >= this.bottom) ny = -1;
        if (nx !== 0 || ny !== 0) {
          const x = Phaser.Math.Clamp(sp.x, this.left, this.right);
          const y = Phaser.Math.Clamp(sp.y, this.top, this.bottom);
          this.shatter(sp.owner, x, y, Math.atan2(ny, nx), blade ? BLADE_SCRAP_COUNT : SCRAP_COUNT);
          this.spikes.splice(i, 1);
        }
      }
    }
  }

  private shatter(owner: Owner, x: number, y: number, inward: number, count: number): void {
    const fx = this.fx(owner);
    fx.flash(x, y, 30, 10, MAGNET.sky);
    fx.shrapnel(x, y, 8, { angle: inward, spread: 0.9, speed: 260, size: 10, color: MAGNET.iron });
    this.arena.scene.cameras.main.shake(160, 0.01);
    Sfx.playAt('clang', x, { volume: 0.6 });
    for (let k = 0; k < count; k++) {
      const a = inward + (count === 1 ? 0 : (k / (count - 1) - 0.5) * 1.4) + (Math.random() - 0.5) * 0.2;
      const v = 420 + Math.random() * 140;
      this.scraps.push({
        owner, state: 'fly', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        angle: Math.random() * Math.PI, spin: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6),
        size: 9 + Math.random() * 3, seed: Math.floor(Math.random() * 100), until: 0, hit: new Set(),
      });
    }
  }

  private updateScraps(dt: number): void {
    const now = this.now;
    // Orbit angles, evenly spaced per owner.
    const orbits: Record<Owner, Scrap[]> = { player: this.orbitOf('player'), npc: this.orbitOf('npc') };
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const s = this.scraps[i];
      const owner = this.fighter(s.owner);
      if (s.state === 'fly') {
        s.x += s.vx * dt; s.y += s.vy * dt;
        const drag = Math.pow(0.12, dt);
        s.vx *= drag; s.vy *= drag;
        s.angle += s.spin * dt;
        if (s.x < this.left || s.x > this.right) { s.vx = -s.vx; s.x = Phaser.Math.Clamp(s.x, this.left, this.right); }
        if (s.y < this.top || s.y > this.bottom) { s.vy = -s.vy; s.y = Phaser.Math.Clamp(s.y, this.top, this.bottom); }
        const speed = Math.hypot(s.vx, s.vy);
        if (speed > 120) {
          for (const t of this.targetsOf(s.owner)) {
            if (s.hit.has(t)) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + s.size) continue;
            s.hit.add(t);
            this.hit(s.owner, t, SCRAP_FLY_DAMAGE, MAGNET.iron);
          }
        } else {
          s.state = 'ground';
          s.until = now + SCRAP_GROUND_MS;
          s.vx = s.vy = 0;
        }
      } else if (s.state === 'ground') {
        if (now >= s.until) { this.scraps.splice(i, 1); continue; }
        if (this.alive(owner) && orbits[s.owner].length < ORBIT_MAX
          && Phaser.Math.Distance.Between(s.x, s.y, owner.x, owner.y) < SCRAP_PICKUP_R + this.bodyR(owner)) {
          s.state = 'orbit';
          orbits[s.owner].push(s);
          this.fx(s.owner).grasp(owner.x, owner.y, s.x, s.y, MAGNET.blue, 260);
          Sfx.playAt('magnet-pull', owner.x, { rate: 1.8, volume: 0.3 });
        }
      }
    }

    for (const o of BOTH) {
      const list = orbits[o];
      const f = this.fighter(o);
      if (list.length === 0) continue;
      if (!this.alive(f)) {
        for (const s of list) { s.state = 'ground'; s.until = now + SCRAP_GROUND_MS; }
        continue;
      }
      const base = this.vizT * ORBIT_SPEED;
      const electro = this.arena.hasPerk(o, 'electromagnet');
      for (let k = list.length - 1; k >= 0; k--) {
        const s = list[k];
        const a = base + (k / list.length) * Math.PI * 2;
        s.x = f.x + Math.cos(a) * ORBIT_R;
        s.y = f.y + Math.sin(a) * ORBIT_R;
        s.angle = a * 1.3;
        if (this.orbitBlocks(o, s) || this.orbitStrikes(o, s, electro)) {
          this.scraps.splice(this.scraps.indexOf(s), 1);
          list.splice(k, 1);
        }
      }
      // Electromagnet: the ring is live — one shard at a time arcs into whoever is close.
      if (electro && now >= this.sides[o].nextZapAt && list.length > 0) {
        const src = list[Math.floor(Math.random() * list.length)];
        const t = this.targetsOf(o).find((v) => Phaser.Math.Distance.Between(src.x, src.y, v.x, v.y) <= ELECTRO_ZAP_RANGE);
        if (t) {
          this.sides[o].nextZapAt = now + ELECTRO_ZAP_GAP_MS;
          this.hit(o, t, ELECTRO_ZAP_DAMAGE, MAGNET.live);
          this.fx(o).laser(src.x, src.y, t.x, t.y, MAGNET.live, 10, 2);
        }
      }
    }
  }

  /** An orbiting shard soaks one enemy shot and is spent doing it. */
  private orbitBlocks(owner: Owner, s: Scrap): boolean {
    const { projectiles } = this.arena;
    if (projectiles) {
      for (const go of projectiles.getChildren()) {
        const p = go as Projectile;
        if (!p.active) continue;
        // A shot is ours if it came from our side.
        if (p.isFromPlayer === (owner === 'player')) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) > 14) continue;
        p.setActive(false).setVisible(false);
        this.fx(owner).sparks(s.x, s.y, 5, Math.atan2(s.y - p.y, s.x - p.x), 10, MAGNET.sky);
        this.fx(owner).shrapnel(s.x, s.y, 3, { speed: 140, size: 7, color: MAGNET.gunHi });
        return true;
      }
    }
    if (owner === 'player' && this.arena.blockHuskShot(s.x, s.y, 14)) {
      this.fx(owner).sparks(s.x, s.y, 5, 0, 10, MAGNET.sky);
      return true;
    }
    return false;
  }

  /** An orbiting shard that touches an enemy hits them and is gone. */
  private orbitStrikes(owner: Owner, s: Scrap, electro: boolean): boolean {
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > this.bodyR(t) + 8) continue;
      this.hit(owner, t, ORBIT_HIT_DAMAGE, MAGNET.iron);
      if (electro) this.stun(owner, t, ELECTRO_STUN_MS);
      this.fx(owner).shrapnel(s.x, s.y, 4, { speed: 160, size: 8, color: MAGNET.gunHi });
      return true;
    }
    return false;
  }

  /** Zips and scrap dashes own the body's velocity while they last. */
  private updateMotions(): void {
    const now = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const m = s.motion;
      if (!m) continue;
      const f = this.fighter(owner);
      const body = f?.body as Phaser.Physics.Arcade.Body | null;
      if (!this.alive(f) || !body || now >= m.until || s.piloting || s.gatherUntil > 0) { s.motion = null; continue; }
      if (m.kind === 'zip') {
        const d = Phaser.Math.Distance.Between(f.x, f.y, m.tx, m.ty);
        if (d < 26) { body.setVelocity(0, 0); s.motion = null; continue; }
        const a = Math.atan2(m.ty - f.y, m.tx - f.x);
        body.setVelocity(Math.cos(a) * ZIP_SPEED, Math.sin(a) * ZIP_SPEED);
      } else {
        body.setVelocity(m.vx, m.vy);
      }
      if (Math.random() < 0.5) this.fx(owner).shrapnel(f.x, f.y, 1, { speed: 40, size: 6, life: 300, depth: 4, color: MAGNET.sky, fall: 10 });
    }
  }

  private updateShoves(): void {
    const now = this.now;
    for (const [f, sh] of this.shoves) {
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      if (now >= sh.until || !f.active || !body) { this.shoves.delete(f); continue; }
      body.setVelocity(sh.vx, sh.vy);
    }
  }

  private updateStuns(): void {
    for (const [f, until] of this.stuns) {
      if (this.now < until && f.active) {
        (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
        continue;
      }
      this.stuns.delete(f);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────

  private paint(): void {
    const idle = this.coins.length === 0 && this.coinShots.length === 0 && this.nails.length === 0
      && this.spikes.length === 0 && this.scraps.length === 0 && this.bits.length === 0
      && this.sides.player.gatherUntil <= 0 && this.sides.npc.gatherUntil <= 0
      && !this.sides.player.pod && !this.sides.npc.pod;
    if (idle && !this.groundGfx && !this.airGfx) return;
    const t = this.vizT;
    const now = this.now;
    const g = this.ground();
    g.clear();
    for (const sp of this.spikes) {
      if (sp.state !== 'planted') continue;
      drawSpikePlanted(g, this.col(sp.owner), sp.x, sp.y, t, !sp.zipped, (sp.until - now) / SPIKE_LIFE_MS);
    }
    for (const s of this.scraps) {
      if (s.state === 'ground') drawScrap(g, this.col(s.owner), s.x, s.y, s.angle, s.size, s.seed, 'ground', t);
    }
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.gatherUntil > 0 && this.alive(f)) {
        drawGatherPile(g, this.col(owner), f.x, f.y, 1 - (s.gatherUntil - now) / GATHER_MS, t);
      }
    }

    const a = this.air();
    a.clear();
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (this.orbitOf(owner).length > 0 && this.alive(f)) drawOrbitRing(a, this.col(owner), f.x, f.y, ORBIT_R, t);
    }
    for (const s of this.scraps) {
      if (s.state !== 'ground') drawScrap(a, this.col(s.owner), s.x, s.y, s.angle, s.size, s.seed, s.state, t);
    }
    for (const sp of this.spikes) {
      if (sp.state === 'hover') {
        drawSpikeHover(a, this.col(sp.owner), sp.x, sp.y, 1 - (sp.slamAt - now) / SPIKE_HOVER_MS, SPIKE_RADIUS, t);
      } else if (sp.state === 'flying') {
        drawSpikeFlying(a, this.col(sp.owner), sp.x, sp.y, Math.atan2(sp.vy, sp.vx));
      }
    }
    for (const c of this.coins) {
      drawCoin(a, this.col(c.owner), c.x, c.y, c.z, c.spin, this.sides[c.owner].hover, t);
    }
    for (const s of this.coinShots) drawCoinShot(a, this.col(s.owner), s.x, s.y, Math.atan2(s.vy, s.vx), t);
    for (const n of this.nails) {
      const o = this.fighter(n.owner);
      drawNail(a, this.col(n.owner), n.x, n.y, n.angle, n.state, o?.x ?? n.x, o?.y ?? n.y, t);
    }
    for (const b of this.bits) {
      const f = this.fighter(b.owner);
      if (!f) continue;
      const k = Phaser.Math.Clamp((now - b.startAt) / (b.landAt - b.startAt), 0, 1);
      const e = k * k;
      drawScrap(a, this.col(b.owner), Phaser.Math.Linear(b.sx, f.x, e), Phaser.Math.Linear(b.sy, f.y, e), k * 9, b.size, b.seed, 'fly', t);
    }
    for (const owner of BOTH) {
      const pod = this.sides[owner].pod;
      if (!pod) continue;
      const k = Phaser.Math.Clamp((now - pod.startAt) / (pod.landAt - pod.startAt), 0, 1);
      const x = Phaser.Math.Linear(pod.sx, pod.lx, k);
      const y = Phaser.Math.Linear(pod.sy, pod.ly, k) - Math.sin(k * Math.PI) * 160;
      a.fillStyle(this.col(owner)(MAGNET.shadow), 0.2 + 0.4 * k);
      a.fillEllipse(pod.lx, pod.ly, 20 + 20 * k, 8 + 8 * k);
      drawScrap(a, this.col(owner), x, y, k * 12, 16, 7, 'orbit', t);
    }
  }

  private updateAvatars(delta: number, isPlayerMagnet: boolean, isNpcMagnet: boolean): void {
    const { scene } = this.arena;
    for (const owner of BOTH) {
      const on = owner === 'player' ? isPlayerMagnet : isNpcMagnet;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!on || !f?.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new MagnetAvatar(scene, this.col(owner), owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setIntensity(s.gatherUntil > 0 ? 1.3 : this.orbitOf(owner).length > 0 ? 1.12 : 1);
      av.setMastered(false);
      // Single owner of setHold: a held toss braces both hands on the field; a zip or a dash
      // throws the arms out; the gather reaches up for the scrap.
      av.setHold(s.gatherUntil > 0 ? 'charge' : s.motion ? 'ride' : s.hover ? 'brace' : null);
      const hidden = f.forceInvisible || s.piloting;
      av.update(delta, f.x, f.y, hidden ? 0 : f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const coins = playerIs ? this.coins.filter((c) => c.owner === 'player').length : 0;
    const scrap = playerIs ? this.orbitOf('player').length : 0;
    this.arena.setStatusIndicator('magnet-coins', coins > 0 ? {
      name: 'Coins in the Air', emoji: '🪙', color: MAGNET.gold, priority: 150, count: coins,
      description: `Coins you have flipped. Each lands ${COIN_AIR_MS / 1000}s after it is tossed. Hold Click to freeze them; Repulse (E) fires every coin in its cone for ${COIN_SHOT_DAMAGE} each.`,
    } : null);
    this.arena.setStatusIndicator('magnet-scrap', scrap > 0 ? {
      name: 'Orbiting Scrap', emoji: '🔩', color: MAGNET.sky, priority: 151, count: scrap,
      description: `Each shard blocks one enemy shot, or hits an enemy that comes close for ${ORBIT_HIT_DAMAGE}. Repulse (E) a shard in front of you to dash that way.`,
    } : null);
    const p = this.arena.player;
    const nailed = this.nails.filter((n) => n.owner === 'npc' && n.state === 'stuck' && n.victim === p).length;
    this.arena.setStatusIndicator('magnet-nailed', nailed > 0 ? {
      name: 'Nailed', emoji: '📌', color: MAGNET.rose, priority: 60, count: nailed,
      description: `A magnet nail is in you. Their Repulse can shove you from ${REPULSE_PUSH_RANGE}px, and ripping it out deals ${NAIL_RIP_DAMAGE}. Falls out on its own after ${NAIL_STUCK_MS / 1000}s.`,
    } : null);
    const mech = this.sides.player.mech;
    this.arena.setStatusIndicator('magnet-mech', playerIs && this.sides.player.piloting && mech?.active ? {
      name: 'Mecha Massacre', emoji: '🤖', color: MAGNET.neon, priority: 149, until: mech.until,
      description: 'You are the mech: untouchable and rooted. Click smash, E rail, R avalanche, F cannon, Q self-destruct.',
    } : null);
  }

  // ── Read by ArenaScene ─────────────────────────────────────────────────

  private speedFor(owner: Owner): number {
    const s = this.sides[owner];
    if (s.gatherUntil > 0 || s.piloting) return 0;
    return 1;
  }

  /** Rooted while gathering or piloting; stopped while stunned. Pulled by ArenaScene. */
  getPlayerSpeedMult(): number {
    const p = this.arena.player;
    if (p && this.stunned(p)) return 0;
    return this.isMagnet('player') ? this.speedFor('player') : 1;
  }

  getNpcSpeedMult(): number {
    const n = this.arena.npc;
    if (n && this.stunned(n)) return 0;
    // An online replica's motion is streamed; rooting it here would freeze the picture.
    if (!this.isMagnet('npc') || this.arena.isOnline) return 1;
    return this.speedFor('npc');
  }

  /** Ability tray fill. In the mech the cards are the mech's keys; out of it, a free second job reads as ready. */
  getBarRatio(abilityId: string): number {
    const p = this.arena.player;
    const s = this.sides.player;
    if (s.piloting && s.mech?.active) {
      const k = MECH_KEYS[abilityId];
      if (!k) return 1;
      if (k === 'destruct') return Phaser.Math.Clamp((s.mech.until - this.now) / 15000, 0, 1);
      return s.mech.readyRatio(k, this.now);
    }
    if (abilityId === 'magnet-nail' && this.nails.some((n) => n.owner === 'player' && n.state === 'stuck')) return 1;
    if (abilityId === 'magnet-spike' && this.spikes.some((sp) => sp.owner === 'player' && sp.state === 'planted' && !sp.zipped)) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Bot opportunities (side-effect-free) ───────────────────────────────

  /** The bot is gathering or piloting and should leave its hands alone. */
  npcBusy(): boolean {
    const s = this.sides.npc;
    return s.gatherUntil > 0 || s.piloting;
  }

  /**
   * A Repulse at the player is worth casting now: coins hanging in front of the bot, a planted
   * spike to launch, a nail flying home to re-fire, a shard to dash on, or a nailed target close
   * enough to throw.
   */
  npcRepulseAt(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const ang = Math.atan2(p.y - n.y, p.x - n.x);
    const dist = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    let worth = 0;
    for (const c of this.coins) {
      if (c.owner === 'npc' && (this.inCone(n, ang, c.x, c.y - c.z, 12) || this.inCone(n, ang, c.x, c.y, 12))) worth += 1;
    }
    for (const sp of this.spikes) {
      if (sp.owner === 'npc' && sp.state === 'planted' && this.inCone(n, ang, sp.x, sp.y, 20)) worth += 3;
    }
    for (const nl of this.nails) {
      if (nl.owner === 'npc' && nl.state === 'return' && Phaser.Math.Distance.Between(n.x, n.y, nl.x, nl.y) <= NAIL_REFIRE_R) worth += 3;
    }
    if (dist > 280 && this.orbitOf('npc').some((sc) => this.inCone(n, ang, sc.x, sc.y, 16))) worth += 2;
    if (dist < 200 && this.nails.some((nl) => nl.owner === 'npc' && nl.state === 'stuck' && nl.victim === p)) worth += 2;
    return worth >= 2 ? { x: p.x, y: p.y } : undefined;
  }

  /** A nail has sat in the player for a beat — rip it out (and meet it with a Repulse). */
  npcRecallNow(): boolean {
    const p = this.arena.player;
    return this.nails.some((nl) => nl.owner === 'npc' && nl.state === 'stuck' && nl.victim === p
      && nl.stuckUntil - this.now < NAIL_STUCK_MS - 1200);
  }

  /** A planted spike that closes the gap to the player (or, hurt, opens it). */
  npcZipTo(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const dNow = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const hurt = n.hp / n.maxHp < 0.3;
    for (const sp of this.spikes) {
      if (sp.owner !== 'npc' || sp.state !== 'planted' || sp.zipped) continue;
      const dSpike = Phaser.Math.Distance.Between(sp.x, sp.y, p.x, p.y);
      if (!hurt && dNow > 340 && dSpike < dNow - 150) return { x: sp.x, y: sp.y };
      if (hurt && dNow < 200 && dSpike > dNow + 200) return { x: sp.x, y: sp.y };
    }
    return undefined;
  }

  /** Where to hang a spike: where the player will be when it drops, roughly. */
  npcSpikeAt(): { x: number; y: number } | undefined {
    const p = this.arena.player;
    if (!this.alive(p)) return undefined;
    const v = (p.body as Phaser.Physics.Arcade.Body | null)?.velocity;
    return {
      x: Phaser.Math.Clamp(p.x + (v?.x ?? 0) * 0.8, this.left + 20, this.right - 20),
      y: Phaser.Math.Clamp(p.y + (v?.y ?? 0) * 0.8, this.top + 20, this.bottom - 20),
    };
  }

  /** Coins go straight up where the bot stands, so this is only its facing for the toss. */
  npcCoinAim(): { x: number; y: number } | undefined {
    const n = this.arena.npc;
    const p = this.arena.player;
    if (!this.alive(n) || !this.alive(p)) return undefined;
    const a = Math.atan2(p.y - n.y, p.x - n.x);
    return { x: n.x + Math.cos(a) * 110, y: n.y + Math.sin(a) * 110 };
  }

  /** Hold the coins while a Repulse is nearly back and there are coins worth keeping up. */
  npcWantsHover(): boolean {
    const n = this.arena.npc;
    if (!this.alive(n)) return false;
    const up = this.coins.filter((c) => c.owner === 'npc' && c.air > 1200).length;
    return up >= 2 && n.getCooldownRatio('magnet-repulse') > 0.7;
  }

  /** The bot's own hover switch (CastContext `magnetHover`). */
  doHover(owner: Owner, on: boolean): void {
    if (owner === 'npc' && this.isReplica('npc')) return;
    this.setHover(owner, on);
  }
}
