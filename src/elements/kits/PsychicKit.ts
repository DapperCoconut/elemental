import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetPsychicMsg } from '../../network/NetworkManager';
import {
  PSY, PsychicAvatar, PsychicColorFn, PsychicFx, comaSwirl, destinyGhost, foresightPath,
  keyChip, mindSigil, psiWhip, stressCracks, thirdEye,
} from './PsychicVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Opened Eyes (passive) ────────────────────────────────────────────────────
/**
 * How far ahead the psychic sees, and — because the two have to be the same number for any of
 * this to be honest — how long every ability cast at him is held before it resolves.
 */
const FORESIGHT_MS = 2000;
/** Chips shown over an enemy's head. The spec asks for three; the queue itself is unbounded. */
const CHIPS_SHOWN = 3;
/** Steps in the projected route. 20 over two seconds is a marker every 100 ms. */
const PATH_STEPS = 20;
/** Online: how often the victim's own sim tells the psychic what is sitting in its queue. */
const QUEUE_RELAY_MS = 160;

// ── Stress ───────────────────────────────────────────────────────────────────
const STRESS_HOLD_MS = 10_000;
/** What counts as "a lot" for the size of the crack art and the burst. Not a cap. */
const STRESS_FULL = 80;

// ── Headache (Click) ─────────────────────────────────────────────────────────
const WHIP_DAMAGE = 12;
const WHIP_STRESS = 5;
const WHIP_TIP_BONUS = 5;
const WHIP_LEN = 196;
const WHIP_HIT_R = 22;
/** Past this far along the lash counts as the tip. The last ~45 px of a 196 px whip. */
const WHIP_TIP_FRAC = 0.77;
const WHIP_ANIM_MS = 260;
/** Where in the animation the lash is at full extension — also when the hit is resolved. */
const WHIP_CRACK_T = 0.55;

// ── Dodge Destiny (R) ────────────────────────────────────────────────────────
const DODGE_MS = 1250;

// ── Migraine (F) ─────────────────────────────────────────────────────────────
const MIGRAINE_MS = 3000;
const MIGRAINE_STRESS_PER_S = 10;

// ── Coma (Q) ─────────────────────────────────────────────────────────────────
const COMA_MULT = 1.5;
/** Every this many points of detonated stress buys one second face down. */
const COMA_PER_STRESS = 20;
/** How much of a hit lands as damage while they are under; the rest is banked as stress. */
const COMA_SPLIT = 0.5;

// ── World objects ────────────────────────────────────────────────────────────

/** One ability sitting in a victim's delayed-cast queue. */
interface Queued {
  id: string;
  /** Legend on the chip — 'Click', 'E', 'R', 'F', 'Q'. */
  key: string;
  /** Ultimates get a gold chip and are worth spending Mind Control on. */
  big: boolean;
  /** Game-clock time at which it resolves. */
  at: number;
  fire: () => void;
}

interface Stress {
  amount: number;
  /** Game-clock time the pool goes off on its own. Every new point pushes it back. */
  releaseAt: number;
  by: Owner;
  seed: number;
}

interface Coma {
  until: number;
  by: Owner;
  /** Last seen `rawDamageTaken`, so the half of every hit we eat can be banked back. */
  lastRaw: number;
}

interface Migraine {
  until: number;
  by: Owner;
  nextTickAt: number;
}

/**
 * The whip, mid-crack. The hit is resolved the instant it is cast, so the origin is pinned
 * here rather than tracked to the moving hand — otherwise the line that was drawn and the line
 * that was tested would drift apart over the 260 ms the animation runs for.
 */
interface Lash {
  ox: number;
  oy: number;
  ang: number;
  start: number;
  tip: boolean;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  lash: Lash | null;
  /** Game-clock expiry of Dodge Destiny. */
  dodgeUntil: number;
}

function makeSide(owner: Owner): Side {
  return { owner, aimX: 0, aimY: 0, lash: null, dodgeUntil: 0 };
}

/** What `NpcOpponent` exposes about its locomotion, for the route projection. */
interface MovementPlan {
  closing: boolean;
  range: number;
  strafe: number;
  speed: number;
  frozen: boolean;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PsychicArenaApi {
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
  /** Online PvP: the opponent is a real person, delaying their own casts on their own machine. */
  get isOnline(): boolean;
  /** Skins: maps a Psychic visual colour through that side's equipped skin. */
  psychicColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: the queue mirror, and the three things the psychic does to a body it doesn't own. */
  sendPsychicMsg(msg: NetPsychicMsg): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── PsychicKit ───────────────────────────────────────────────────────────────

/**
 * Psychic.
 *
 * The element is one mechanism with four consequences. The mechanism is `castDelayMs`: while a
 * psychic is on the field, every ability aimed at him is **queued rather than resolved** — the
 * cooldown is paid at the press, the effect lands two seconds later, and this kit owns the gap.
 * Everything the player sees above an enemy's head is that queue, drawn; everything the player
 * sees on the floor is the same two seconds applied to their feet. Mind Control reaches into the
 * queue and takes something out of it. Dodge Destiny is exactly as long as a telegraph.
 *
 * The other half of the kit is **stress**, which is a second health bar that only exists in the
 * future. It is added by everything, it never ticks, and it does nothing at all until it goes off
 * — either on its own ten seconds after the last point landed, or on the Q, multiplied. Because
 * it releases as pierce damage it is the only thing in the element that armour cannot answer,
 * which is what makes a psychic worth being afraid of rather than merely annoying.
 *
 * The online story is the same story with the machines swapped. A remote opponent delays their
 * *own* casts on their *own* sim — they can see `npcElementId === 'psychic'` just as easily as
 * we can — and relays the resulting queue back for us to draw. Nothing about the foreknowledge
 * is computed on the psychic's machine, which is the only arrangement in which their shots
 * really do come out two seconds late rather than merely looking like they do.
 */
export class PsychicKit {
  private api: PsychicArenaApi;

  // ── Visuals ──
  private readonly pcol: PsychicColorFn;
  private readonly ncol: PsychicColorFn;
  private readonly pfx: PsychicFx;
  private readonly nfx: PsychicFx;
  private playerAvatar: PsychicAvatar | null = null;
  private npcAvatar: PsychicAvatar | null = null;
  /** Routes, coma mandalas and meditation rings — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The whip, stress cracks, the prediction bar and the destiny ghost — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Pooled legends for the prediction chips and the stress readouts. Pooled rather than made
   * per-enemy because both appear and vanish several times a second, and `setStyle` rebuilds a
   * Text's canvas texture — `setText` on an unchanged string does not.
   */
  private labels: Phaser.GameObjects.Text[] = [];
  private labelsUsed = 0;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  /** Every fighter whose casts this kit is currently holding, and what it is holding. */
  private queues = new Map<Fighter, Queued[]>();
  /** Everyone whose `castDelayMs`/`queueDelayedCast` this kit installed, so it can take them back. */
  private foreseen = new Set<Fighter>();
  private stress = new Map<Fighter, Stress>();
  private comas = new Map<Fighter, Coma>();
  private migraines = new Map<Fighter, Migraine>();
  /** Online: the opponent's own report of what is in their queue, next one last. */
  private netQueueKeys: string[] = [];
  private netQueueAt = 0;
  private lastQueueRelayAt = 0;
  private lastQueueSentAt = 0;
  private lastRelayedQueue = '';

  constructor(api: PsychicArenaApi) {
    this.api = api;
    this.pcol = (base) => api.psychicColor('player', base);
    this.ncol = (base) => api.psychicColor('npc', base);
    this.pfx = new PsychicFx(api.scene, this.pcol);
    this.nfx = new PsychicFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PsychicFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PsychicColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isPsychic(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'psychic' : this.api.npcElementId === 'psychic';
  }

  private avatar(owner: Owner): PsychicAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Everything this kit ever writes a field on, so a stale multiplier can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /**
   * True for a body this machine is only rendering. Their sim owns what that fighter aims and
   * how it moves, so anything we apply to it here would be applied twice — see `doMigraine`.
   */
  private isNetReplica(f: Fighter): boolean {
    return this.api.isOnline && f === this.api.npc;
  }

  /** True when a status we just applied belongs to a person on another machine. */
  private shouldRelay(owner: Owner, victim: Fighter): boolean {
    return owner === 'player' && this.api.isOnline && victim === this.api.npc;
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Hand every borrowed cast back before dropping the queues, or an ability paid for on the
    // last frame of a match would simply vanish along with the kit's state.
    for (const f of [...this.foreseen]) this.releaseForesight(f, false);
    this.foreseen.clear();
    this.queues.clear();
    this.stress.clear();
    this.comas.clear();
    this.migraines.clear();
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.netQueueKeys = [];
    this.netQueueAt = 0;
    this.lastQueueRelayAt = 0;
    this.lastQueueSentAt = 0;
    this.lastRelayedQueue = '';
    this.vizT = 0;

    for (const f of this.allFighters()) {
      if (!f) continue;
      f.psychicIncomingMult = 1;
      f.aimScatterUntil = 0;
      f.castDelayMs = 0;
      f.queueDelayedCast = null;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    for (const t of this.labels) t.destroy();
    this.labels = [];
    this.labelsUsed = 0;

    this.api.setStatusIndicator('psychic-stress', null);
    this.api.setStatusIndicator('psychic-coma', null);
    this.api.setStatusIndicator('psychic-foresight', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5, so the route goes just under them and everything the player has
    // to read at a glance goes well over them.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isPsychic('player') && !this.playerAvatar) {
      this.playerAvatar = new PsychicAvatar(scene, this.pcol);
    }
    if (this.isPsychic('npc') && !this.npcAvatar) {
      this.npcAvatar = new PsychicAvatar(scene, this.ncol);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'psychic') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p) || this.comas.has(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // Held rather than clicked: the whip is a 700 ms rhythm and its own cooldown is the gate.
    if (pointer.isDown) p.castAbility('psychic-headache', ctx);

    // Mind Control is refused before `castAbility` rather than inside the do-method, because a
    // cast that reaches `cast()` has already stamped (and voiced) its cooldown — reaching into
    // an empty queue would cost five seconds for nothing.
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (this.seizableFrom('player')) {
        p.castAbility('psychic-mind-control', ctx);
      } else if (p.getCooldownRatio('psychic-mind-control') >= 1) {
        this.api.showFloatingText(p.x, p.y - 46, 'NOTHING TO SEIZE', this.hex(PSY.violetLit));
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('psychic-dodge-destiny', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('psychic-migraine', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('psychic-coma', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — the whip. The lash is resolved the instant it is cast, against the shape it will be
   * drawn in at the crack, so what hits and what the player sees hit are the same geometry. The
   * tip is worth double the stress and is about 45 px of a 196 px lash, which is the whole skill
   * in the ability: standing at exactly the wrong distance is how you get the most out of it.
   */
  doHeadache(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-headache'); return; }
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const av = this.avatar(owner);
    const hand = av ? this.handOf(av, f) : { x: f.x, y: f.y };
    const pts = this.lashPoints(hand.x, hand.y, ang, WHIP_CRACK_T);

    const hit = new Map<Fighter, boolean>();   // victim → was it the tip
    for (const t of this.targetsOf(owner)) {
      for (let i = 1; i < pts.length; i++) {
        if (Phaser.Math.Distance.Between(pts[i].x, pts[i].y, t.x, t.y) > WHIP_HIT_R) continue;
        const isTip = i / (pts.length - 1) >= WHIP_TIP_FRAC;
        hit.set(t, (hit.get(t) ?? false) || isTip);
      }
    }

    let anyTip = false;
    for (const [t, tip] of hit) {
      anyTip = anyTip || tip;
      t.takeDamage(WHIP_DAMAGE);
      this.addStress(t, WHIP_STRESS + (tip ? WHIP_TIP_BONUS : 0), owner);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(tip ? PSY.stress : PSY.violetLit));
      this.fx(owner).crack(t.x, t.y, ang, tip);
      if (tip) this.api.showFloatingText(t.x, t.y - 62, '⚡ TIP!', this.hex(PSY.gold));
    }
    if (!hit.size) {
      // Nothing there — crack it in the air anyway, at the tip, so the reach is legible.
      const end = pts[pts.length - 1];
      this.fx(owner).crack(end.x, end.y, ang, false);
    }

    s.lash = { ox: hand.x, oy: hand.y, ang, start: this.now, tip: anyTip };
    av?.play('sweep', ang);
  }

  /**
   * E — reach into the queue over their head and take the front card off it. The ability never
   * happens and it goes back on a full cooldown from this moment, so a stolen ultimate is worth
   * far more than a stolen click.
   */
  doMindControl(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-mind-control'); return; }
    this.ensureLayers();

    const victim = this.seizableFrom(owner);
    if (!victim) { this.refund(f, 'psychic-mind-control'); return; }

    this.avatar(owner)?.play('clap', Math.atan2(victim.y - f.y, victim.x - f.x));
    this.fx(owner).seize(victim.x, victim.y, f.x, f.y);

    if (this.isNetReplica(victim)) {
      // Their queue lives on their machine. All we have here is the mirror, which their next
      // relay will correct — so take the head off it optimistically and tell them to do the same.
      const key = this.netQueueKeys.length ? this.netQueueKeys[this.netQueueKeys.length - 1] : '?';
      this.netQueueKeys.pop();
      this.api.sendPsychicMsg({ t: 'psy', k: 'cancel' });
      this.api.showFloatingText(victim.x, victim.y - 70, `🚫 ${key} SEIZED`, this.hex(PSY.gold));
      return;
    }

    const q = this.queues.get(victim);
    if (!q || !q.length) { this.refund(f, 'psychic-mind-control'); return; }
    const taken = q.shift() as Queued;
    if (!q.length) this.queues.delete(victim);
    victim.restampCooldown(taken.id);
    this.api.showFloatingText(victim.x, victim.y - 70, `🚫 ${taken.key} SEIZED`, this.hex(PSY.gold));
  }

  /**
   * R — 1.25 seconds of nothing being able to touch you. Re-asserted every frame rather than set
   * once, because a dash anywhere else in the game clears `isInvincible` on a timer of its own
   * and would otherwise cut this short.
   */
  doDodgeDestiny(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-dodge-destiny'); return; }
    this.ensureLayers();
    const s = this.side(owner);
    s.dodgeUntil = this.now + DODGE_MS;
    f.isInvincible = true;
    this.avatar(owner)?.setBlind(true);
    this.avatar(owner)?.play('flex');
    this.fx(owner).veil(f.x, f.y, DODGE_MS);
    this.api.showFloatingText(f.x, f.y - 50, '👁️ DESTINY DODGED', this.hex(PSY.gold));
  }

  /**
   * F — three seconds in which most of what they aim goes somewhere else, plus ten stress a
   * second for the privilege. The aim half is a single generic field on the victim, read where
   * every ability in the game gets its target point, so it works on anything they might be.
   */
  doMigraine(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-migraine'); return; }
    this.ensureLayers();
    this.avatar(owner)?.play('slam');

    const victims = this.targetsOf(owner);
    if (!victims.length) { this.refund(f, 'psychic-migraine'); return; }

    for (const v of victims) {
      // A replica's shots are fired on the machine that owns it, so scattering the copy here
      // would bend an angle that has already been bent once. Relay it and let them do it.
      if (!this.isNetReplica(v)) {
        v.aimScatterUntil = Math.max(v.aimScatterUntil, Date.now() + MIGRAINE_MS);
      }
      this.migraines.set(v, { until: this.now + MIGRAINE_MS, by: owner, nextTickAt: this.now + 1000 });
      this.fx(owner).throb(v.x, v.y);
      this.api.showFloatingText(v.x, v.y - 54, '🤯 MIGRAINE', this.hex(PSY.stress));
      if (this.shouldRelay(owner, v)) {
        this.api.sendPsychicMsg({ t: 'psy', k: 'scatter', ms: MIGRAINE_MS });
      }
    }
  }

  /**
   * Q — cash the whole pool in at 1.5x and put them under for a second per twenty points. The
   * coma is the second half of the ability and the better half: while it runs, everything the
   * psychic lands is halved and the missing half goes straight back into a fresh pool, so a Q
   * that lands on 80 stress hands you four seconds in which to build the next 80.
   */
  doComa(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-coma'); return; }
    this.ensureLayers();
    this.avatar(owner)?.play('raise');

    let landed = false;
    for (const v of this.targetsOf(owner)) {
      const st = this.stress.get(v);
      if (!st || st.amount < 1) continue;
      landed = true;
      const total = Math.round(st.amount * COMA_MULT);
      this.stress.delete(v);
      this.api.showFloatingText(v.x, v.y - 74, `×${COMA_MULT} → ${total}`, this.hex(PSY.stress));
      this.detonate(v, total, owner);

      const secs = Math.floor(total / COMA_PER_STRESS);
      if (secs > 0) this.beginComa(owner, v, secs * 1000);
    }
    // No pool anywhere means the ultimate was spent on nothing at all — hand it back rather
    // than eating a thirty-second cooldown for a light show.
    if (!landed) {
      this.refund(f, 'psychic-coma');
      this.api.showFloatingText(f.x, f.y - 50, 'NO STRESS TO CASH', this.hex(PSY.violetLit));
    }
  }

  // ── Stress ─────────────────────────────────────────────────────────────────

  /**
   * Add to a victim's pool and push the fuse back out to a full ten seconds.
   *
   * `quiet` is for the coma's banking, which lands on every single tick of every burn, poison
   * and bleed the victim is wearing — a pop-up per tick would bury the arena. The readout over
   * their head is already live, so the number is never actually hidden.
   */
  private addStress(victim: Fighter, amount: number, by: Owner, quiet = false): void {
    if (amount <= 0 || !this.alive(victim)) return;
    const cur = this.stress.get(victim);
    this.stress.set(victim, {
      amount: (cur?.amount ?? 0) + amount,
      releaseAt: this.now + STRESS_HOLD_MS,
      by,
      seed: cur?.seed ?? Math.random() * 999,
    });
    if (quiet) return;
    this.api.showFloatingText(
      victim.x + (Math.random() - 0.5) * 22, victim.y - 34,
      `+${Math.round(amount)}`, this.hex(PSY.stress),
    );
  }

  /**
   * Let a pool go. Pierce, because "stress damage pierces through damage resistance" — which in
   * this codebase means it skips the whole mitigation product *and* every absorb layer under it.
   * A comatose victim is re-baselined straight afterwards, or the half of this hit the coma eats
   * would come back as stress and the two would feed each other forever.
   */
  private detonate(victim: Fighter, amount: number, by: Owner): void {
    if (amount <= 0) return;
    this.fx(by).burst(victim.x, victim.y, Math.min(1, amount / STRESS_FULL));
    victim.takeDamage(amount, { pierce: true });
    const c = this.comas.get(victim);
    if (c) c.lastRaw = victim.rawDamageTaken;
  }

  private updateStress(): void {
    for (const [v, st] of [...this.stress]) {
      if (!this.alive(v)) { this.stress.delete(v); continue; }
      if (this.now < st.releaseAt) continue;
      this.stress.delete(v);
      this.api.showFloatingText(v.x, v.y - 60, `💥 ${Math.round(st.amount)} STRESS`, this.hex(PSY.stress));
      this.detonate(v, Math.round(st.amount), st.by);
    }
  }

  // ── Coma ───────────────────────────────────────────────────────────────────

  private beginComa(owner: Owner, victim: Fighter, ms: number): void {
    this.comas.set(victim, { until: this.now + ms, by: owner, lastRaw: victim.rawDamageTaken });
    this.fx(owner).sleep(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 58, `💤 COMA ${(ms / 1000).toFixed(0)}s`, this.hex(PSY.violetLit));
    if (this.shouldRelay(owner, victim)) this.api.sendPsychicMsg({ t: 'psy', k: 'coma', ms });
  }

  /**
   * The armour multiplier is rewritten from scratch onto every body each frame — the Justice
   * pattern — so a coma that ends between two ticks can never leave a stale 0.5 behind.
   */
  private updateComas(): void {
    for (const f of this.allFighters()) {
      if (f) f.psychicIncomingMult = 1;
    }
    for (const [v, c] of [...this.comas]) {
      if (!this.alive(v) || this.now >= c.until) {
        this.comas.delete(v);
        continue;
      }
      v.psychicIncomingMult = COMA_SPLIT;
      // Casting is a generic field; being held still is this kit's own speed multiplier, since
      // a comatose fighter still has to be pushable by everything else in the game.
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 150);
      if (!this.isNetReplica(v)) this.body(v).setVelocity(0, 0);

      // Whatever the armour just ate, banked back as stress. `rawDamageTaken` is tallied before
      // any multiplier runs, so the difference is the *full* hit and half of it is what landed.
      const raw = v.rawDamageTaken;
      const dealt = raw - c.lastRaw;
      c.lastRaw = raw;
      if (dealt > 0.5) this.addStress(v, dealt * COMA_SPLIT, c.by, true);
    }
  }

  private updateMigraines(): void {
    for (const [v, m] of [...this.migraines]) {
      if (!this.alive(v) || this.now >= m.until) { this.migraines.delete(v); continue; }
      if (this.now < m.nextTickAt) continue;
      m.nextTickAt += 1000;
      this.addStress(v, MIGRAINE_STRESS_PER_S, m.by);
    }
  }

  // ── Opened Eyes: the queue ─────────────────────────────────────────────────

  /**
   * Install or remove the delayed-cast hook on everyone who should be under it.
   *
   * Online is the interesting case. The psychic never touches the replica: the person behind it
   * can see they are fighting a psychic just as well as we can, so they delay their own casts on
   * their own machine and send the queue back. Delaying the copy here as well would put their
   * shots four seconds late instead of two.
   */
  private updateForesight(): void {
    const want = new Set<Fighter>();
    if (this.isPsychic('npc') && this.alive(this.api.npc)) want.add(this.api.player);
    if (this.isPsychic('player') && this.alive(this.api.player) && !this.api.isOnline) {
      for (const f of this.targetsOf('player')) want.add(f);
    }

    for (const f of [...this.foreseen]) {
      if (!want.has(f)) this.releaseForesight(f, true);
    }
    for (const f of want) {
      if (this.foreseen.has(f)) continue;
      f.castDelayMs = FORESIGHT_MS;
      f.queueDelayedCast = (id, ms, fire) => this.enqueue(f, id, ms, fire);
      this.foreseen.add(f);
    }
  }

  /**
   * Give a fighter its casts back. Anything still queued fires immediately rather than being
   * dropped: it was paid for at the press, and a psychic dying mid-telegraph should read as the
   * held-back second going off all at once, not as free cooldowns for whoever killed him.
   */
  private releaseForesight(f: Fighter, fire: boolean): void {
    f.castDelayMs = 0;
    f.queueDelayedCast = null;
    this.foreseen.delete(f);
    const q = this.queues.get(f);
    this.queues.delete(f);
    if (!fire || !q || !this.alive(f)) return;
    for (const e of q) e.fire();
  }

  private enqueue(f: Fighter, abilityId: string, ms: number, fire: () => void): boolean {
    if (!this.alive(f)) return false;
    const ability = f.element.abilities.find((a) => a.id === abilityId);
    const q = this.queues.get(f) ?? [];
    q.push({
      id: abilityId,
      key: ability?.displayKey ?? '?',
      big: !!(ability as { isUltimate?: boolean } | undefined)?.isUltimate,
      at: this.now + ms,
      fire,
    });
    q.sort((a, b) => a.at - b.at);
    this.queues.set(f, q);
    return true;
  }

  private updateQueues(): void {
    for (const [f, q] of [...this.queues]) {
      if (!this.alive(f)) { this.queues.delete(f); continue; }
      while (q.length && q[0].at <= this.now) {
        const e = q.shift() as Queued;
        e.fire();
      }
      if (!q.length) this.queues.delete(f);
    }
  }

  /** The nearest enemy with something in their queue worth stealing, or null. */
  private seizableFrom(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const has = this.isNetReplica(t)
        ? this.netQueueKeys.length > 0 && this.now - this.netQueueAt < 1200
        : (this.queues.get(t)?.length ?? 0) > 0;
      if (!has) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** What is queued on a body, as chip legends with the next one *last* (i.e. rightmost). */
  private chipsFor(f: Fighter): { key: string; big: boolean; heat: number }[] {
    if (this.isNetReplica(f)) {
      if (this.now - this.netQueueAt > 1200) return [];
      return this.netQueueKeys.slice(-CHIPS_SHOWN).map((key, i, arr) => ({
        key, big: key === 'Q', heat: i === arr.length - 1 ? 0.85 : 0.3,
      }));
    }
    const q = this.queues.get(f);
    if (!q || !q.length) return [];
    // The queue is soonest-first; the bar reads next-on-the-right, so it is drawn reversed.
    return q.slice(0, CHIPS_SHOWN).reverse().map((e) => ({
      key: e.key,
      big: e.big,
      heat: Phaser.Math.Clamp(1 - (e.at - this.now) / FORESIGHT_MS, 0, 1),
    }));
  }

  /**
   * Online: tell the psychic what our own sim is holding. This is the only piece of the passive
   * that cannot be worked out locally on their machine, and it is three short strings at 6 Hz.
   */
  private relayQueue(): void {
    if (!this.api.isOnline || !this.isPsychic('npc')) return;
    if (this.now - this.lastQueueRelayAt < QUEUE_RELAY_MS) return;
    this.lastQueueRelayAt = this.now;
    const q = this.queues.get(this.api.player) ?? [];
    // Soonest-first locally; sent next-last so the receiver can draw it straight out.
    const keys = q.slice(0, CHIPS_SHOWN).reverse().map((e) => e.key);
    const sig = keys.join(',');
    // Resent on a heartbeat as well as on change: the receiver treats a mirror older than
    // 1.2 s as gone, so a queue that happens to sit unchanged must not go quiet.
    if (sig === this.lastRelayedQueue && this.now - this.lastQueueSentAt < 700) return;
    this.lastRelayedQueue = sig;
    this.lastQueueSentAt = this.now;
    this.api.sendPsychicMsg({ t: 'psy', k: 'queue', keys });
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /** Everything the opponent's sim decided that ours has no way to work out for itself. */
  handleNetMsg(msg: NetPsychicMsg): void {
    const p = this.api.player;
    switch (msg.k) {
      case 'queue':
        this.netQueueKeys = msg.keys.slice(0, CHIPS_SHOWN);
        this.netQueueAt = this.now;
        break;
      case 'cancel': {
        const q = this.queues.get(p);
        if (!q || !q.length) break;
        const taken = q.shift() as Queued;
        if (!q.length) this.queues.delete(p);
        p.restampCooldown(taken.id);
        this.ensureLayers();
        this.nfx.seize(p.x, p.y, p.x, p.y - 60);
        this.api.showFloatingText(p.x, p.y - 70, `🚫 ${taken.key} SEIZED`, this.hex(PSY.gold));
        break;
      }
      case 'scatter':
        if (!this.alive(p)) break;
        p.aimScatterUntil = Math.max(p.aimScatterUntil, Date.now() + msg.ms);
        this.migraines.set(p, { until: this.now + msg.ms, by: 'npc', nextTickAt: Infinity });
        this.ensureLayers();
        this.nfx.throb(p.x, p.y);
        this.api.showFloatingText(p.x, p.y - 54, '🤯 MIGRAINE', this.hex(PSY.stress));
        break;
      case 'coma':
        if (!this.alive(p)) break;
        // Applied without a relay of its own — the psychic's sim already has its own copy
        // running on the replica, which is where their half-damage banking is computed.
        this.comas.set(p, { until: this.now + msg.ms, by: 'npc', lastRaw: p.rawDamageTaken });
        this.ensureLayers();
        this.nfx.sleep(p.x, p.y);
        this.api.showFloatingText(p.x, p.y - 58, `💤 COMA ${(msg.ms / 1000).toFixed(0)}s`, this.hex(PSY.violetLit));
        break;
      default:
        break;
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isPsychic('player');
    const npcIs = this.isPsychic('npc');
    const anyState = this.queues.size || this.stress.size || this.comas.size
      || this.migraines.size || this.foreseen.size;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updateForesight();
    this.updateQueues();
    this.updateMigraines();
    this.updateStress();
    this.updateComas();
    this.updateDodges();
    this.relayQueue();

    this.paintGround();
    this.paintAir();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs, npcIs);
  }

  private updateDodges(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.dodgeUntil) continue;
      const f = this.fighter(owner);
      if (this.now < s.dodgeUntil) {
        // Re-asserted every frame: `dashCaster` and half a dozen kits clear `isInvincible` on
        // timers of their own, and this window has to outlast all of them.
        if (this.alive(f)) f.isInvincible = true;
        continue;
      }
      s.dodgeUntil = 0;
      if (this.alive(f)) f.isInvincible = false;
      this.avatar(owner)?.setBlind(false);
    }
  }

  // ── Projection ─────────────────────────────────────────────────────────────

  /**
   * The next two seconds of a body's movement, as a polyline.
   *
   * For a bot this is not a guess: `NpcOpponent.movementPlan` hands over the exact locomotion
   * rule it is following this tick — close to `range`, then strafe at 60% speed in `strafe` —
   * and this replays that rule forward against the player's current position. It stops being
   * true the moment the player moves, which is the point: the thread is a promise the psychic
   * can walk out from under.
   *
   * A body with no plan to read (an online replica, a husk) falls back to dead reckoning off
   * its current velocity, lightly damped.
   */
  private projectPath(f: Fighter): { x: number; y: number }[] {
    const dt = FORESIGHT_MS / 1000 / PATH_STEPS;
    const pts: { x: number; y: number }[] = [{ x: f.x, y: f.y }];
    const plan = (f as unknown as { movementPlan?: MovementPlan }).movementPlan;
    const px = this.api.player.x;
    const py = this.api.player.y;
    let x = f.x;
    let y = f.y;

    if (plan) {
      if (plan.frozen) return pts;
      for (let i = 0; i < PATH_STEPS; i++) {
        const d = Phaser.Math.Distance.Between(x, y, px, py);
        const toward = Math.atan2(py - y, px - x);
        const closing = d > plan.range;
        const a = closing ? toward : toward + plan.strafe * (Math.PI / 2);
        const sp = plan.speed * (closing ? 1 : 0.6);
        x = Phaser.Math.Clamp(x + Math.cos(a) * sp * dt, this.left, this.right);
        y = Phaser.Math.Clamp(y + Math.sin(a) * sp * dt, this.top, this.bottom);
        pts.push({ x, y });
      }
      return pts;
    }

    const b = this.body(f);
    let vx = b.velocity.x;
    let vy = b.velocity.y;
    if (Math.hypot(vx, vy) < 8) return pts;
    for (let i = 0; i < PATH_STEPS; i++) {
      x = Phaser.Math.Clamp(x + vx * dt, this.left, this.right);
      y = Phaser.Math.Clamp(y + vy * dt, this.top, this.bottom);
      vx *= 0.97;
      vy *= 0.97;
      pts.push({ x, y });
    }
    return pts;
  }

  /** The whip's cord: a snaking walk out from the hand, with a wave travelling down it. */
  private lashPoints(x: number, y: number, ang: number, t: number): { x: number; y: number }[] {
    const N = 18;
    const reach = WHIP_LEN * Math.min(1, 0.2 + t * 1.7);
    const step = reach / N;
    const pts: { x: number; y: number }[] = [{ x, y }];
    let px = x;
    let py = y;
    for (let i = 0; i < N; i++) {
      const u = (i + 1) / N;
      // Amplitude grows toward the tip and dies as the crack completes, so the lash is straight
      // at exactly the moment it lands and coiled either side of it.
      const wave = Math.sin(u * Math.PI * 1.4 - t * 7.2) * (0.62 - t * 0.46) * u;
      const a = ang + wave;
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      pts.push({ x: px, y: py });
    }
    return pts;
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // The passive, on the floor: one thread per enemy, only for the side that can see.
    for (const owner of BOTH) {
      if (!this.isPsychic(owner) || !this.alive(this.fighter(owner))) continue;
      // The npc's foreknowledge is real but private — drawing it would hand the player the
      // bot's routing for free. Only the local player's copy is ever painted.
      if (owner !== 'player') continue;
      const tint = this.col(owner);
      for (const t of this.targetsOf(owner)) {
        const pts = this.projectPath(t);
        if (pts.length < 3) continue;
        foresightPath(g, tint, pts, 0.95, this.vizT);
      }
    }

    // Meditation rings under a psychic who is holding someone's future.
    for (const owner of BOTH) {
      if (!this.isPsychic(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const held = this.heldCount(owner);
      if (!held) continue;
      const tint = this.col(owner);
      for (let i = 0; i < 2; i++) {
        const r = 26 + i * 9 + Math.sin(this.vizT * 2 + i) * 2;
        g.lineStyle(1.2 - i * 0.4, tint(PSY.violet), 0.4 - i * 0.12);
        g.strokeEllipse(f.x, f.y + 14, r * 2, r * 0.7);
      }
    }

    // Coma mandalas, under the body so they never cover a draining health bar.
    for (const [v, c] of this.comas) {
      if (!this.alive(v)) continue;
      comaSwirl(g, this.col(c.by), v.x, v.y, 26, 0.9, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    this.labelsUsed = 0;

    // ── The whip ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.lash) continue;
      const t = (this.now - s.lash.start) / WHIP_ANIM_MS;
      if (t >= 1) { s.lash = null; continue; }
      if (!this.alive(this.fighter(owner))) { s.lash = null; continue; }
      const pts = this.lashPoints(s.lash.ox, s.lash.oy, s.lash.ang, t);
      // Fades out over the back half, so the crack is the brightest frame.
      const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      psiWhip(g, this.col(owner), pts, alpha, {
        tipHot: s.lash.tip ? Phaser.Math.Clamp(1 - Math.abs(t - WHIP_CRACK_T) * 4, 0, 1) : 0,
      });
    }

    // ── Stress, on whoever is carrying it ──
    for (const [v, st] of this.stress) {
      if (!this.alive(v)) continue;
      const load = Math.min(1, st.amount / STRESS_FULL);
      const tint = this.col(st.by);
      stressCracks(g, tint, v.x, v.y - 4, load, 0.85, st.seed, this.vizT * 7);

      // The readout, and under it the ten-second fuse as a bar that empties. Both sit above
      // the prediction chips, which is the order the spec asks for.
      const fuse = Phaser.Math.Clamp((st.releaseAt - this.now) / STRESS_HOLD_MS, 0, 1);
      const bx = v.x;
      const by = v.y - 84;
      g.fillStyle(tint(PSY.stressDeep), 0.5);
      g.fillRect(bx - 20, by + 9, 40, 2.6);
      g.fillStyle(tint(PSY.stress), 0.95);
      g.fillRect(bx - 20, by + 9, 40 * fuse, 2.6);
      this.label(`${Math.round(st.amount)}`, bx, by, 15, this.hex(PSY.stress), true);
    }

    // ── The prediction bar ──
    // Only the local player ever sees one, and only over things they are fighting.
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const tint = this.pcol;
      for (const t of this.targetsOf('player')) {
        const chips = this.chipsFor(t);
        if (!chips.length) continue;
        const w = 26;
        const gap = 4;
        const total = chips.length * w + (chips.length - 1) * gap;
        const y = t.y - 62;
        for (let i = 0; i < chips.length; i++) {
          const c = chips[i];
          const x = t.x - total / 2 + w / 2 + i * (w + gap);
          keyChip(g, tint, x, y, w, 18, 0.95, c.heat);
          if (c.big) {
            mindSigil(g, tint, x, y, 12, 0.35 * c.heat, { phase: this.vizT * 2, sides: 5, eye: false });
          }
          this.label(c.key, x, y, c.key.length > 2 ? 8 : 11,
            this.hex(c.big ? PSY.gold : PSY.aether), true);
        }
        // An eye at the right-hand end, pointing at the one that is about to happen.
        thirdEye(g, tint, t.x + total / 2 + 11, y, 5.5, 0.6 + 0.4 * Math.sin(this.vizT * 4), 0.9,
          { glow: 0.5, lash: false });
      }
    }

    // ── Where they will be ──
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      for (const t of this.targetsOf('player')) {
        const pts = this.projectPath(t);
        if (pts.length < 3) continue;
        const end = pts[pts.length - 1];
        if (Phaser.Math.Distance.Between(end.x, end.y, t.x, t.y) < 24) continue;
        destinyGhost(g, this.pcol, end.x, end.y, 0.8, this.vizT);
      }
    }

    for (let i = this.labelsUsed; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }

  /**
   * A pooled label. `setText`/`setPosition` are cheap on an unchanged value; `setStyle` is not,
   * so size and colour are only written when they actually differ from what the slot is wearing.
   */
  private label(text: string, x: number, y: number, size: number, color: string, bold: boolean): void {
    let t = this.labels[this.labelsUsed];
    if (!t) {
      t = this.api.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: `${size}px`, color,
        fontStyle: bold ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(17);
      this.labels.push(t);
    }
    this.labelsUsed++;
    const style = t.style as unknown as { fontSize: string; color: string };
    if (style.fontSize !== `${size}px` || style.color !== color) {
      t.setStyle({ fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' });
    }
    t.setText(text);
    t.setPosition(x, y);
    t.setVisible(true);
  }

  /** How many abilities this side is currently holding out of the world. */
  private heldCount(owner: Owner): number {
    if (owner === 'player' && this.isNetReplica(this.api.npc)) {
      return this.now - this.netQueueAt < 1200 ? this.netQueueKeys.length : 0;
    }
    let n = 0;
    for (const t of this.targetsOf(owner)) n += this.queues.get(t)?.length ?? 0;
    return n;
  }

  private handOf(av: PsychicAvatar, f: Fighter): { x: number; y: number } {
    const h = av.castHand();
    return Number.isFinite(h.x) && (h.x || h.y) ? h : { x: f.x, y: f.y };
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      const target = this.nearestTarget(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // Focus is "how much of the future am I holding right now" — the queue, plus whatever
      // pressure is sitting on the person I am holding it for.
      const load = target ? (this.stress.get(target)?.amount ?? 0) / STRESS_FULL : 0;
      av.setFocus(Math.min(1, 0.2 + this.heldCount(owner) * 0.24 + load * 0.45));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;

    const st = this.stress.get(p);
    this.api.setStatusIndicator('psychic-stress', st ? {
      name: 'Stress', emoji: '🩸', color: PSY.stress, priority: 6,
      description: 'A pool of psychic pressure. It does nothing until it goes off, then lands all at once and straight through every scrap of armour you own. Every new point puts the fuse back to 10 seconds.',
      until: st.releaseAt, count: Math.round(st.amount),
    } : null);

    const coma = this.comas.get(p);
    this.api.setStatusIndicator('psychic-coma', coma ? {
      name: 'Coma', emoji: '💤', color: PSY.violet, priority: 2,
      description: 'Face down. Held still and unable to cast — and half of every hit you take is being banked straight back as stress.',
      until: coma.until,
    } : null);

    // The passive, shown to both sides for opposite reasons: the psychic is told how much he is
    // holding, and his opponent is told that everything they press is two seconds late.
    const held = playerIs ? this.heldCount('player') : 0;
    this.api.setStatusIndicator('psychic-foresight', playerIs && held > 0 ? {
      name: 'Opened Eyes', emoji: '👁️', color: PSY.gold, priority: 152,
      description: 'You are two seconds ahead. Everything they press is sitting in the queue over their head until it catches up with them.',
      count: held,
    } : (npcIs && p.castDelayMs > 0 ? {
      name: 'Foreseen', emoji: '👁️', color: PSY.violet, priority: 8,
      description: 'Something is reading you. Everything you cast is paid for on the press and only happens two seconds later — and they can see it coming the whole way.',
      count: this.queues.get(p)?.length ?? 0,
    } : null));
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** Held still while comatose. Pulled by ArenaScene rather than pushed onto the body. */
  getPlayerSpeedMult(): number {
    return this.comas.has(this.api.player) ? 0 : 1;
  }

  getNpcSpeedMult(): number {
    return this.comas.has(this.api.npc) ? 0 : 1;
  }

  /** How many of the player's abilities the npc psychic is currently holding. */
  queueCount(owner: Owner): number {
    return this.heldCount(owner);
  }

  /** True when the thing at the front of that side's stolen queue is an ultimate. */
  queueHasUltimate(owner: Owner): boolean {
    for (const t of this.targetsOf(owner)) {
      for (const e of this.queues.get(t) ?? []) if (e.big) return true;
    }
    return false;
  }

  /** Stress currently sitting on that side's nearest enemy — the bot's cue for the Q. */
  stressOnTarget(owner: Owner): number {
    const t = this.nearestTarget(owner);
    return t ? Math.round(this.stress.get(t)?.amount ?? 0) : 0;
  }
}
