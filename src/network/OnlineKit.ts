import { Fighter, DamageOpts } from '../entities/Fighter';
import { CastContext } from '../elements/Ability';
import { Net, NetMsg, NetSilenceMsg, NetTechMsg } from './NetworkManager';
import { applyNetStatuses, collectNetStatuses } from './NetStatusSync';

/** Narrow surface the online sync kit needs from ArenaScene. */
export interface OnlineArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly worldW: number;
  buildNpcContext(tx: number, ty: number): CastContext;
  aim(): { x: number; y: number };
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  endOnlineMatch(playerWon: boolean, reason?: string): void;
  /** Silence: local player's invisibility/stealth to broadcast (false/0 for other elements). */
  isPlayerInvisible(): boolean;
  playerStealth(): number;
  /** Silence: apply the remote silence player's stealth meter to the local replica sim. */
  setRemoteStealth(value: number): void;
  /** Technology: remote tech event to replay on the local sim (steer already un-mirrored). */
  onTechMsg(msg: NetTechMsg): void;
  /** Silence upgrades: remote silence event (positions already un-mirrored). */
  onSilenceMsg(msg: NetSilenceMsg): void;
  /** Mastery: replay a bindable mastery ability the opponent cast (id not in element.abilities). */
  replayNpcMastery(enhId: string, tx: number, ty: number): void;
  /** Aggregate speed multiplier our sim is applying to the opponent replica (slows included). */
  npcSpeedMult(): number;
  /** Game clock (`scene.time.now`) for re-basing relayed effect timers. */
  gameNow(): number;
}

const STATE_SEND_INTERVAL_MS = 50;   // 20 Hz
// Charge abilities stamp their cooldown on press *and* release; this collapses that pair
// without swallowing a genuinely fast repeat (a 200 ms click attack must relay every shot).
const CAST_DEDUPE_MS = 120;
const EXTRAPOLATION_CAP_MS = 200;
const SNAP_DISTANCE = 240;
const FX_SEND_INTERVAL_MS = 100;     // 10 Hz status mirror
/** Below this the residual on the replica's velocity is interpolation noise, not a shove. */
const PUSH_THRESHOLD = 150;
const PUSH_SEND_INTERVAL_MS = 60;
/** How long a relayed shove owns the victim's body before WASD takes it back. */
const PUSH_APPLY_MS = 90;

interface RemoteState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  recvAt: number;
}

/**
 * Drives an online 1v1 match from inside ArenaScene.
 *
 * Model: each machine runs its own full simulation. The local player is the
 * ordinary `Player` (full kit, zero latency). The opponent is the NpcOpponent
 * fighter with AI disabled: its position is interpolated from the peer's 20 Hz
 * state stream and its ability casts are replayed through the NPC cast path.
 *
 * Damage is **attacker-authoritative**. Your own abilities resolve against the
 * replica on your machine — the same code path that works in single player, with
 * your upgrades, masteries and charge state intact — and the resulting hit is
 * relayed as a `dmg` message that the victim applies to itself. The victim's
 * replay of your cast is for visuals and behaviour only; its `takeDamage` is
 * closed to everything but relayed hits (`Fighter.netAuthoritativeDamage`), so a
 * hit is never counted twice and an ability whose npc-side replay is incomplete
 * still lands. The same reasoning drives the `fx` (status) and `push` (knockback)
 * mirrors: whatever your sim did to the replica is what the victim receives.
 *
 * All incoming coordinates are mirrored horizontally so that both players see
 * themselves starting on the left side of the arena.
 */
export class OnlineKit {
  private api: OnlineArenaApi;
  private remote: RemoteState | null = null;
  private castQueue: Array<{ id: string; tx: number; ty: number }> = [];
  private lastCastSent = new Map<string, number>();
  private lastStateSentAt = 0;
  private lastFxSentAt = 0;
  private lastPushSentAt = 0;
  /** Velocity `interpolateReplica` last wrote, so a kit's shove can be told apart from it. */
  private lastInterpVx = 0;
  private lastInterpVy = 0;
  /** Non-timer effects the opponent had on us last `fx` tick, so they can be undone. */
  private readonly mirroredStatusIds = new Set<string>();
  private matchEnded = false;
  private attached = false;
  private deathSent = false;

  private readonly msgHandler = (msg: NetMsg) => this.onMessage(msg);
  private readonly statusHandler = () => this.onStatusChange();
  private readonly onPlayerDamaged = (amount: number) => {
    if (amount > 0 && !this.matchEnded) Net.send({ t: 'hit', amount });
  };
  /**
   * Our sim resolved a hit on the replica. It never loses HP locally — the number is
   * relayed instead, and the peer applies it to the fighter that really owns that health.
   */
  private readonly onReplicaDamage = (amount: number, opts?: DamageOpts) => {
    if (amount <= 0 || this.matchEnded) return;
    const msg: { t: 'dmg'; a: number; p?: 1; f?: 1 } = { t: 'dmg', a: Math.round(amount) };
    if (opts?.pierce) msg.p = 1;
    if (opts?.fireDot) msg.f = 1;
    Net.send(msg);
  };
  private readonly onPlayerDefeated = () => this.sendDeath();
  private readonly onPlayerCast = (abilityId: string) => {
    if (this.matchEnded) return;
    const now = Date.now();
    if (now - (this.lastCastSent.get(abilityId) ?? 0) < CAST_DEDUPE_MS) return;
    this.lastCastSent.set(abilityId, now);
    const aim = this.api.aim();
    Net.send({ t: 'cast', id: abilityId, tx: aim.x, ty: aim.y });
  };

  constructor(api: OnlineArenaApi) {
    this.api = api;
  }

  /** (Re)initialise for a fresh match. Called from ArenaScene.create(). */
  reset(): void {
    this.detach();
    this.remote = null;
    this.castQueue = [];
    this.lastCastSent.clear();
    this.lastStateSentAt = 0;
    this.lastFxSentAt = 0;
    this.lastPushSentAt = 0;
    this.lastInterpVx = 0;
    this.lastInterpVy = 0;
    this.mirroredStatusIds.clear();
    this.matchEnded = false;
    this.deathSent = false;

    this.api.npc.netGhost = true;
    this.api.npc.onGhostDamage = this.onReplicaDamage;
    this.api.npc.netDefenseMult = 1;
    this.api.npc.netFlatReduction = 0;
    this.api.npc.netDamageCap = 0;
    this.api.player.netAuthoritativeDamage = true;
    this.api.player.netSpeedMult = 1;
    this.api.player.netCooldownMult = 1;
    this.api.player.netShoveUntil = 0;
    this.api.player.onCastStamp = this.onPlayerCast;
    this.api.player.on('damaged', this.onPlayerDamaged);
    this.api.player.once('defeated', this.onPlayerDefeated);
    Net.onMessage(this.msgHandler);
    Net.onStatus(this.statusHandler);
    this.attached = true;

    this.sendState(true);
  }

  /** Remove all listeners. Safe to call repeatedly; called on scene shutdown. */
  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    Net.offMessage(this.msgHandler);
    Net.offStatus(this.statusHandler);
    if (this.api.npc) this.api.npc.onGhostDamage = null;
    if (this.api.player) {
      this.api.player.netAuthoritativeDamage = false;
      this.api.player.netSpeedMult = 1;
      this.api.player.netCooldownMult = 1;
      this.api.player.netShoveUntil = 0;
      this.api.player.onCastStamp = null;
      this.api.player.off('damaged', this.onPlayerDamaged);
      this.api.player.off('defeated', this.onPlayerDefeated);
    }
  }

  /** Per-frame: broadcast own state and effects, then interpolate the opponent replica. */
  update(): void {
    if (this.matchEnded) return;
    this.sendState(false);
    this.sendEffects();
    this.relayReplicaShove();
    this.interpolateReplica();
  }

  /**
   * Replays at most one queued remote cast through the NPC cast path and
   * returns its ability id — ArenaScene feeds this into the same npcCastId
   * reaction block that AI casts go through.
   */
  consumeNpcCast(): string | null {
    if (this.matchEnded) return null;
    const cast = this.castQueue.shift();
    if (!cast) return null;
    const npc = this.api.npc;
    const ability = npc.element.abilities.find((a) => a.id === cast.id);
    if (!ability) {
      // Bindable mastery enhancement ids (Starfall, Heatwave, …) aren't in
      // element.abilities — route them to the kit's NPC-side mastery handler so
      // the effect resolves on this (victim) sim.
      this.api.replayNpcMastery(cast.id, cast.tx, cast.ty);
      return cast.id;
    }
    npc.startCooldown(cast.id);
    try {
      ability.cast(this.api.buildNpcContext(cast.tx, cast.ty));
    } catch (e) {
      console.error(`Online: failed to replay remote cast ${cast.id}`, e);
    }
    return cast.id;
  }

  /**
   * Broadcast a bindable mastery ability cast (Starfall, Heatwave, …). These are
   * cast through kit-specific timers rather than `castAbility`, so they don't flow
   * through `onCastStamp` — the owning kit calls this explicitly on cast.
   */
  sendMasteryCast(enhId: string): void {
    this.onPlayerCast(enhId);
  }

  /** Concede the match (ESC-ESC). Tells the peer we died, then ends locally. */
  forfeit(): void {
    if (this.matchEnded) return;
    this.sendDeath();
    this.api.endOnlineMatch(false, 'Forfeit');
  }

  /** Latest measured round-trip latency, for the HUD. */
  get latencyMs(): number {
    return Net.latencyMs;
  }

  // ── Internals ────────────────────────────────────────────────────

  private sendDeath(): void {
    if (this.deathSent) return;
    this.deathSent = true;
    Net.send({ t: 'death' });
  }

  private mirrorX(x: number): number {
    return this.api.worldW - x;
  }

  private sendState(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastStateSentAt < STATE_SEND_INTERVAL_MS) return;
    this.lastStateSentAt = now;
    const p = this.api.player;
    const body = p.body as Phaser.Physics.Arcade.Body | null;
    Net.send({
      t: 'state',
      x: p.x,
      y: p.y,
      vx: body?.velocity.x ?? 0,
      vy: body?.velocity.y ?? 0,
      hp: p.hp,
      maxHp: p.maxHp,
      shieldHp: p.shieldHp,
      shieldCharges: p.shieldCharges,
      inv: this.api.isPlayerInvisible(),
      fa: p.facingAngle,
      st: this.api.playerStealth(),
      // Our own damage reduction travels with us: the peer resolves their hits against
      // their replica, which has no copy of the armour buffs we granted ourselves.
      dm: Math.round(p.droneArmorMult * p.kineticShieldMult * p.steelShieldMult
        * p.potionArmorMult * p.smokeIncomingMult * p.cardDamageTakenMult * 1000) / 1000,
      fr: p.flatDamageReduction,
      dc: p.hardDamageCap,
    });
  }

  /**
   * Mirror every generic status our sim currently has on the replica, plus the two
   * aggregate channels (slow, cooldown drag) that live outside `Fighter`. Sent on a
   * fixed tick rather than on change so an effect wearing off always propagates.
   */
  private sendEffects(): void {
    const now = Date.now();
    if (now - this.lastFxSentAt < FX_SEND_INTERVAL_MS) return;
    this.lastFxSentAt = now;
    const npc = this.api.npc;
    if (!npc?.active) return;
    Net.send({
      t: 'fx',
      e: collectNetStatuses(npc, now, this.api.gameNow()),
      spd: Math.round(Math.min(1, this.api.npcSpeedMult()) * 1000) / 1000,
      cd: Math.round(Math.max(1, npc.cooldownMult) * 1000) / 1000,
    });
  }

  /**
   * Knockbacks, pulls and drags are written straight onto the replica's body by the kit
   * that fired them — and then overwritten by the next interpolation step, so they are
   * invisible on both machines. Any velocity that isn't the one interpolation last set is
   * therefore a shove, and gets relayed for the victim to apply to its own body.
   */
  private relayReplicaShove(): void {
    const npc = this.api.npc;
    const body = npc?.active ? (npc.body as Phaser.Physics.Arcade.Body | null) : null;
    if (!body) return;
    const dvx = body.velocity.x - this.lastInterpVx;
    const dvy = body.velocity.y - this.lastInterpVy;
    if (Math.hypot(dvx, dvy) < PUSH_THRESHOLD) return;
    // A shove is a large velocity, not the *absence* of one: a replica converging fast on
    // its target and then stopped dead by the world bounds leaves an equally large
    // residual, and relaying that would jitter the victim every time they hug a wall.
    if (Math.hypot(body.velocity.x, body.velocity.y) < PUSH_THRESHOLD) return;
    const now = Date.now();
    if (now - this.lastPushSentAt < PUSH_SEND_INTERVAL_MS) return;
    this.lastPushSentAt = now;
    // Mirrored like every other coordinate: x flips, y does not.
    Net.send({ t: 'push', vx: -dvx, vy: dvy, ms: PUSH_APPLY_MS });
  }

  private interpolateReplica(): void {
    const remote = this.remote;
    const npc = this.api.npc;
    if (!remote || !npc.active) return;
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Dead-reckon forward from the last received sample, capped.
    const ageS = Math.min(EXTRAPOLATION_CAP_MS, Date.now() - remote.recvAt) / 1000;
    const targetX = remote.x + remote.vx * ageS;
    const targetY = remote.y + remote.vy * ageS;
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;

    if (Math.hypot(dx, dy) > SNAP_DISTANCE) {
      body.reset(targetX, targetY);
      this.lastInterpVx = 0;
      this.lastInterpVy = 0;
      return;
    }
    // Converge on the target in ~100 ms; velocity-based so physics stays sane.
    this.lastInterpVx = dx * 10;
    this.lastInterpVy = dy * 10;
    body.setVelocity(this.lastInterpVx, this.lastInterpVy);
  }

  private onMessage(msg: NetMsg): void {
    if (this.matchEnded) return;
    switch (msg.t) {
      case 'state': {
        this.remote = {
          x: this.mirrorX(msg.x),
          y: msg.y,
          vx: -msg.vx,
          vy: msg.vy,
          recvAt: Date.now(),
        };
        const npc = this.api.npc;
        npc.netSyncVitals(msg.hp, msg.maxHp, msg.shieldHp, msg.shieldCharges);
        // Their defences, applied when our sim resolves a hit on them.
        npc.netDefenseMult = msg.dm ?? 1;
        npc.netFlatReduction = msg.fr ?? 0;
        npc.netDamageCap = msg.dc ?? 0;
        // Silence remaster: facing (mirrored like positions), invisibility, stealth.
        if (msg.fa !== undefined) npc.facingAngle = Math.atan2(Math.sin(msg.fa), -Math.cos(msg.fa));
        if (msg.inv !== undefined && npc.active) {
          npc.forceInvisible = msg.inv;
          npc.setAlpha(msg.inv ? 0 : 1);
          npc.setHealthBarVisible(!msg.inv);
        }
        if (msg.st !== undefined) this.api.setRemoteStealth(msg.st);
        break;
      }
      case 'cast':
        this.castQueue.push({ id: msg.id, tx: this.mirrorX(msg.tx), ty: msg.ty });
        break;
      case 'hit': {
        const npc = this.api.npc;
        if (npc.active) this.api.spawnDamageNumber(npc.x, npc.y - 34, msg.amount);
        break;
      }
      case 'dmg': {
        // The opponent's sim resolved this hit against us. Every multiplier already ran
        // there; our own absorb layers (invincibility, absorber, shields) still apply.
        const player = this.api.player;
        if (player?.active && player.hp > 0) {
          player.takeDamage(msg.a, { netApplied: true, pierce: !!msg.p, fireDot: !!msg.f });
        }
        break;
      }
      case 'fx': {
        const player = this.api.player;
        if (!player?.active) break;
        applyNetStatuses(player, msg.e, Date.now(), this.api.gameNow(), this.mirroredStatusIds);
        player.netSpeedMult = Math.min(1, msg.spd);
        player.netCooldownMult = Math.max(1, msg.cd);
        break;
      }
      case 'push': {
        const player = this.api.player;
        if (!player?.active) break;
        player.netShoveVx = msg.vx;
        player.netShoveVy = msg.vy;
        player.netShoveUntil = this.api.gameNow() + msg.ms;
        break;
      }
      case 'death':
        this.matchEnded = true;
        this.api.endOnlineMatch(true);
        break;
      case 'tech':
        // Positions are mirrored horizontally, so remote left/right steering flips.
        if (msg.k === 'steer' && (msg.d === 'left' || msg.d === 'right')) {
          this.api.onTechMsg({ t: 'tech', k: 'steer', d: msg.d === 'left' ? 'right' : 'left' });
        } else {
          this.api.onTechMsg(msg);
        }
        break;
      case 'sil':
        // Positions mirror like every other coordinate; a drive vector mirrors as a
        // sign flip on x, and an aim angle reflects about the vertical axis.
        if (msg.k === 'vulture-drop' || msg.k === 'doll') {
          this.api.onSilenceMsg({ ...msg, x: this.mirrorX(msg.x) });
        } else if (msg.k === 'puppet-move') {
          this.api.onSilenceMsg({
            ...msg,
            vx: -msg.vx,
            fa: Math.atan2(Math.sin(msg.fa), -Math.cos(msg.fa)),
          });
        } else {
          this.api.onSilenceMsg(msg);
        }
        break;
      default:
        break;
    }
  }

  private onStatusChange(): void {
    if (this.matchEnded) return;
    if (!Net.connected) {
      this.matchEnded = true;
      this.api.endOnlineMatch(true, 'Opponent disconnected');
    }
  }

  /** Called by ArenaScene when the match ends for any reason. */
  onMatchEnded(): void {
    this.matchEnded = true;
  }
}
