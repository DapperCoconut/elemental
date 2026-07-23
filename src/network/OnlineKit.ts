import { Fighter } from '../entities/Fighter';
import { CastContext } from '../elements/Ability';
import { Net, NetMsg, NetSilenceMsg, NetTechMsg } from './NetworkManager';

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
}

const STATE_SEND_INTERVAL_MS = 50;   // 20 Hz
const CAST_DEDUPE_MS = 250;          // charge abilities stamp cooldowns twice; collapse repeats
const EXTRAPOLATION_CAP_MS = 200;
const SNAP_DISTANCE = 240;

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
 * Each machine is authoritative for its OWN fighter's HP — damage you take is
 * computed locally from the replayed enemy effects, then broadcast. The replica
 * is a "net ghost": local hits on it show feedback but never change its HP.
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
  private matchEnded = false;
  private attached = false;
  private deathSent = false;

  private readonly msgHandler = (msg: NetMsg) => this.onMessage(msg);
  private readonly statusHandler = () => this.onStatusChange();
  private readonly onPlayerDamaged = (amount: number) => {
    if (amount > 0 && !this.matchEnded) Net.send({ t: 'hit', amount });
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
    this.matchEnded = false;
    this.deathSent = false;

    this.api.npc.netGhost = true;
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
    if (this.api.player) {
      this.api.player.onCastStamp = null;
      this.api.player.off('damaged', this.onPlayerDamaged);
      this.api.player.off('defeated', this.onPlayerDefeated);
    }
  }

  /** Per-frame: broadcast own state and interpolate the opponent replica. */
  update(): void {
    if (this.matchEnded) return;
    this.sendState(false);
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
    });
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
      return;
    }
    // Converge on the target in ~100 ms; velocity-based so physics stays sane.
    body.setVelocity(dx * 10, dy * 10);
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
        if (msg.k === 'vulture-drop') {
          this.api.onSilenceMsg({ ...msg, x: this.mirrorX(msg.x) });
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
