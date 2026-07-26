import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { CastContext } from '../elements/Ability';
import { Net, NetMsg, NetHuskState } from '../network/NetworkManager';
import { Husk } from './Husk';
import { InvasionKit, InvasionDifficultyDef, INVASION_DIFFICULTIES, WAVE_LABEL_Y, formatWaveLabel, InvasionFx } from './InvasionKit';
import { huskVariantFromIndex, huskVariantIndex } from './HuskVariants';

/** Narrow surface the invasion co-op kit needs from ArenaScene. */
export interface InvasionCoopArenaApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** The parked 1v1 NPC slot, repurposed here as the ally replica. */
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  /** Host: the real wave/husk simulation. Guest: unused except onProjectileHitHusk. */
  readonly invasionKit: InvasionKit;
  addEnemy(h: Husk): void;
  removeEnemy(h: Husk): void;
  buildNpcContext(tx: number, ty: number): CastContext;
  aim(): { x: number; y: number };
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** End the co-op run and show the results screen. */
  endCoopRun(wavesCompleted: number, shardsEarned: number): void;
}

const STATE_SEND_INTERVAL_MS = 50;   // 20 Hz — ally position/vitals
const SNAP_SEND_INTERVAL_MS = 100;   // 10 Hz — husk batch (host → guest)
const CAST_DEDUPE_MS = 250;
const EXTRAPOLATION_CAP_MS = 200;
const SNAP_DISTANCE = 240;
const REVIVE_RADIUS = 70;
const REVIVE_DURATION_MS = 3000;
const REVIVE_HP_FRACTION = 0.4;

interface RemoteState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  recvAt: number;
}

interface HuskReplica {
  husk: Husk;
  targetX: number;
  targetY: number;
  /** Mirrors NetHuskState.p so the tint only changes when possession flips. */
  possessed: boolean;
}

/** A guest-side husk shot: purely cosmetic, the host owns the damage. */
interface GhostShot {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  expiresAt: number;
}

/**
 * Drives invasion co-op from inside ArenaScene: two players on one team vs.
 * husk waves. The host runs the real InvasionKit simulation (waves, husk AI,
 * HP); the guest renders lightweight husk replicas and forwards damage it
 * deals back to the host, which is the sole authority on husk HP and the run
 * lifecycle. Each side's own avatar is real and self-authoritative for its
 * own HP (same "victim computes its own damage" model as PvP OnlineKit); the
 * `npc` slot (unused in solo invasion) is repurposed here as the ally replica,
 * synced and cast-replayed exactly like OnlineKit's opponent — but never
 * mirrored, since both players share one arena instead of facing off.
 *
 * Downed/revive: hitting 0 HP doesn't end the run — the fighter goes "downed"
 * (frozen, ignored by husks) until the other player stands nearby for a few
 * seconds. The run only ends when both are downed simultaneously, decided
 * solely by the host (it knows both downed flags) via a `runEnd` broadcast.
 */
export class InvasionCoopKit {
  private isHost = false;
  private difficulty: InvasionDifficultyDef = INVASION_DIFFICULTIES[0];
  private remote: RemoteState | null = null;
  private castQueue: Array<{ id: string; tx: number; ty: number }> = [];
  private lastCastSent = new Map<string, number>();
  private lastStateSentAt = 0;
  private lastSnapSentAt = 0;
  private matchEnded = false;
  private runEndSent = false;
  private attached = false;

  private localDowned = false;
  private allyDowned = false;
  private reviveProgress = 0;

  private huskReplicas = new Map<number, HuskReplica>();
  private ghostShots: GhostShot[] = [];
  private wave = 0;
  private shards = 0;
  private remaining = 0;

  private downedBanner: Phaser.GameObjects.Text | null = null;
  private reviveHint: Phaser.GameObjects.Text | null = null;
  private waveLabel: Phaser.GameObjects.Text | null = null;
  private shardLabel: Phaser.GameObjects.Text | null = null;
  private leaveBtn: Phaser.GameObjects.Rectangle | null = null;
  private leaveLabel: Phaser.GameObjects.Text | null = null;

  private readonly msgHandler = (msg: NetMsg) => this.onMessage(msg);
  private readonly statusHandler = () => this.onStatusChange();
  private readonly onPlayerDamaged = (amount: number) => {
    if (amount > 0 && !this.matchEnded) Net.send({ t: 'hit', amount });
  };
  private readonly onLocalDefeated = () => {
    if (this.localDowned || this.matchEnded) return;
    this.localDowned = true;
    this.api.player.downed = true;
    this.reviveProgress = 0;
    this.downedBanner?.setVisible(true);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 50, 'DOWNED! Your ally must revive you', '#ff6666');
    this.sendState(true);
  };
  private readonly onPlayerCast = (abilityId: string) => {
    if (this.matchEnded) return;
    const now = Date.now();
    if (now - (this.lastCastSent.get(abilityId) ?? 0) < CAST_DEDUPE_MS) return;
    this.lastCastSent.set(abilityId, now);
    const aim = this.api.aim();
    Net.send({ t: 'cast', id: abilityId, tx: aim.x, ty: aim.y });
  };

  /** Host-only hooks wired into InvasionKit — see InvasionCoopHooks. */
  private readonly hostHooks = {
    spawnMultiplier: 2,
    extraTargets: (): Fighter[] => [this.api.npc],
    onAllyBite: (damage: number, x: number, y: number) => {
      Net.send({ t: 'allyBite', damage });
      this.api.spawnHitFlash(x, y, 0x88aa33);
    },
    onHuskDefeated: (husk: Husk, reward: number) => {
      Net.send({ t: 'huskDeath', id: husk.netId, reward, x: husk.x, y: husk.y });
    },
    onWaveCleared: (wave: number, bonus: number) => {
      Net.send({ t: 'waveClear', wave, bonus });
    },
    onFx: (fx: InvasionFx) => {
      Net.send({ t: 'huskFx', fx });
    },
    onBossSpawned: (name: string, color: string) => {
      Net.send({ t: 'boss', name, color });
    },
  };

  constructor(private api: InvasionCoopArenaApi) {}

  /** (Re)initialise for a fresh co-op run. Called from ArenaScene.create(). */
  reset(isHost: boolean, difficulty: InvasionDifficultyDef): void {
    this.detach();
    this.isHost = isHost;
    this.difficulty = difficulty;
    this.remote = null;
    this.castQueue = [];
    this.lastCastSent.clear();
    this.lastStateSentAt = 0;
    this.lastSnapSentAt = 0;
    this.matchEnded = false;
    this.runEndSent = false;
    this.localDowned = false;
    this.allyDowned = false;
    this.reviveProgress = 0;
    this.wave = 0;
    this.shards = 0;
    this.remaining = 0;

    for (const rep of this.huskReplicas.values()) { this.api.removeEnemy(rep.husk); rep.husk.destroy(); }
    this.huskReplicas.clear();
    for (const s of this.ghostShots) s.gfx.destroy();
    this.ghostShots = [];

    this.api.npc.netGhost = true;
    this.api.npc.downed = false;
    this.api.player.downed = false;
    // The ally sits in the npc slot and its casts are replayed locally, so every
    // npc-owned damage path aims at us. Block them for the run — only husk hits
    // (routed through Fighter.asNonAllyDamage) may touch the local player.
    this.api.player.allyDamageBlocked = true;
    this.api.player.onCastStamp = this.onPlayerCast;
    this.api.player.on('damaged', this.onPlayerDamaged);
    this.api.player.on('defeated', this.onLocalDefeated);
    Net.onMessage(this.msgHandler);
    Net.onStatus(this.statusHandler);
    this.attached = true;

    this.buildHud();

    if (isHost) {
      this.api.invasionKit.reset(difficulty, this.hostHooks);
    }

    this.sendState(true);
  }

  /** Remove all listeners and HUD. Safe to call repeatedly; called on scene shutdown. */
  detach(): void {
    if (this.attached) {
      this.attached = false;
      Net.offMessage(this.msgHandler);
      Net.offStatus(this.statusHandler);
      if (this.api.player) {
        this.api.player.allyDamageBlocked = false;
        this.api.player.onCastStamp = null;
        this.api.player.off('damaged', this.onPlayerDamaged);
        this.api.player.off('defeated', this.onLocalDefeated);
      }
    }
    this.destroyHud();
  }

  /** Per-frame update. */
  update(time: number, delta: number): void {
    if (this.matchEnded) return;
    this.sendState(false);
    this.interpolateAlly();

    if (this.isHost) {
      this.api.invasionKit.update(time, delta);
      this.sendHuskSnap();
      if (this.localDowned && this.allyDowned) this.finishCoopRun();
    } else {
      this.interpolateHuskReplicas();
      this.updateGhostShots(delta);
    }

    this.updateRevive(delta);
  }

  /** Replays at most one queued ally cast through the NPC cast path. */
  consumeNpcCast(): string | null {
    if (this.matchEnded) return null;
    const cast = this.castQueue.shift();
    if (!cast) return null;
    const npc = this.api.npc;
    const ability = npc.element.abilities.find((a) => a.id === cast.id);
    if (!ability) return null;
    npc.startCooldown(cast.id);
    try {
      ability.cast(this.api.buildNpcContext(cast.tx, cast.ty));
    } catch (e) {
      console.error(`Invasion co-op: failed to replay ally cast ${cast.id}`, e);
    }
    return cast.id;
  }

  /** Leave button (either side): end the run for both players where possible. */
  leaveRun(): void {
    if (this.matchEnded) return;
    if (this.isHost) {
      this.finishCoopRun();
    } else {
      this.matchEnded = true;
      Net.disconnect();
      this.api.endCoopRun(this.wave, this.shards);
    }
  }

  isPlayerDowned(): boolean {
    return this.localDowned;
  }

  /** Called by ArenaScene when the match ends for any reason. */
  onMatchEnded(): void {
    this.matchEnded = true;
  }

  // ── Internals ────────────────────────────────────────────────────

  private finishCoopRun(): void {
    if (this.runEndSent) return;
    this.runEndSent = true;
    this.matchEnded = true;
    const wavesCompleted = this.api.invasionKit.wavesCompleted;
    const shardsEarned = this.api.invasionKit.shardsEarned;
    Net.send({ t: 'runEnd', wavesCompleted, shardsEarned });
    this.api.endCoopRun(wavesCompleted, shardsEarned);
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
      downed: this.localDowned,
    });
  }

  private sendHuskSnap(): void {
    const now = Date.now();
    if (now - this.lastSnapSentAt < SNAP_SEND_INTERVAL_MS) return;
    this.lastSnapSentAt = now;
    const husks: NetHuskState[] = this.api.enemies
      .filter((e): e is Husk => e instanceof Husk)
      // A demon riding a husk is invisible and untouchable — omitting it drops
      // the guest's replica too, and it reappears when the demon is released.
      .filter((h) => !h.possessing)
      .map((h) => ({
        id: h.netId,
        x: h.x,
        y: h.y,
        hp: h.hp,
        maxHp: h.maxHp,
        v: huskVariantIndex(h.variant),
        p: !!h.possessedBy,
      }));
    Net.send({
      t: 'huskSnap',
      wave: this.api.invasionKit.currentWave,
      shards: this.api.invasionKit.shardsEarned,
      // Count husks still queued to spawn too, so the guest's counter matches
      // the host's instead of ticking up as the wave trickles in.
      remaining: this.api.invasionKit.remainingThisWave,
      husks,
    });
  }

  private interpolateAlly(): void {
    const remote = this.remote;
    const npc = this.api.npc;
    if (!remote || !npc.active) return;
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    const ageS = Math.min(EXTRAPOLATION_CAP_MS, Date.now() - remote.recvAt) / 1000;
    const targetX = remote.x + remote.vx * ageS;
    const targetY = remote.y + remote.vy * ageS;
    const dx = targetX - npc.x;
    const dy = targetY - npc.y;

    if (Math.hypot(dx, dy) > SNAP_DISTANCE) {
      body.reset(targetX, targetY);
      return;
    }
    body.setVelocity(dx * 10, dy * 10);
  }

  /**
   * Replay a host-side husk effect locally. Every branch here is cosmetic:
   * damage from explosions and shots is resolved on the host and arrives
   * separately as an 'allyBite'.
   */
  private playFx(fx: InvasionFx): void {
    const scene = this.api.scene;
    switch (fx.k) {
      case 'boom': {
        const ring = scene.add.circle(fx.x, fx.y, fx.r, 0xff5522, 0.45).setDepth(6).setScale(0.25);
        scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        scene.cameras.main.shake(160, 0.004);
        break;
      }
      case 'heal': {
        const ring = scene.add.circle(fx.x, fx.y, fx.r, 0x66ff88, 0.18).setDepth(3).setScale(0.4);
        scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        break;
      }
      case 'lane':
        this.api.invasionKit.drawLane(fx.x, fx.y, fx.x2, fx.y2, fx.c, fx.ms);
        break;
      case 'shot': {
        const gfx = scene.add.circle(fx.x, fx.y, 7, 0x9944cc, 1).setDepth(7).setStrokeStyle(2, 0x220022, 0.8);
        this.ghostShots.push({ gfx, vx: fx.vx, vy: fx.vy, expiresAt: Date.now() + fx.ms });
        break;
      }
      case 'possess': {
        const ring = scene.add.circle(fx.x, fx.y, 60, 0x880022, 0.45).setDepth(6).setScale(0.25);
        scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
        this.api.showFloatingText(fx.x, fx.y - 44, 'POSSESSED!', '#ff4466');
        break;
      }
    }
  }

  /** Drift the cosmetic husk shots the host told us about, and retire them. */
  private updateGhostShots(delta: number): void {
    if (this.ghostShots.length === 0) return;
    const dt = delta / 1000;
    const now = Date.now();
    for (let i = this.ghostShots.length - 1; i >= 0; i--) {
      const s = this.ghostShots[i];
      s.gfx.x += s.vx * dt;
      s.gfx.y += s.vy * dt;
      // Pop it on contact so the visual lands with the host's damage report,
      // rather than sailing on through whoever it just hit.
      const hit = [this.api.player, this.api.npc].some((f) =>
        f.active && f.hp > 0 && Phaser.Math.Distance.Between(s.gfx.x, s.gfx.y, f.x, f.y) <= 22 + 22 * f.sizeMult);
      if (hit || now >= s.expiresAt) {
        s.gfx.destroy();
        this.ghostShots.splice(i, 1);
      }
    }
  }

  /**
   * Guest → host: Silence Mastery is steering husk `id`. We drive our own replica so it
   * stays responsive under our hand, and stream the result for the host to mirror onto
   * the real husk. No-op as host or offline, where the husk is already ours to move.
   */
  sendHuskPuppet(id: number, on: boolean, x: number, y: number): void {
    if (this.isHost) return;
    Net.send({ t: 'huskPuppet', id, on, x, y });
  }

  private interpolateHuskReplicas(): void {
    const now = this.api.scene.time.now;
    for (const rep of this.huskReplicas.values()) {
      if (!rep.husk.active) continue;
      // A husk we are currently possessing is driven by SilenceKit, not by the snap
      // stream — lerping it back toward the host's stale position would fight the hand
      // that is steering it.
      if (rep.husk.puppetControlledUntil > now) continue;
      const body = rep.husk.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const dx = rep.targetX - rep.husk.x;
      const dy = rep.targetY - rep.husk.y;
      if (Math.hypot(dx, dy) > SNAP_DISTANCE) {
        body.reset(rep.targetX, rep.targetY);
      } else {
        body.setVelocity(dx * 8, dy * 8);
      }
    }
  }

  private updateRevive(delta: number): void {
    if (this.localDowned || !this.allyDowned) {
      this.reviveProgress = 0;
      this.reviveHint?.setText('');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    if (dist > REVIVE_RADIUS) {
      this.reviveProgress = 0;
      this.reviveHint?.setText('Stand by your downed ally to revive them');
      return;
    }
    this.reviveProgress += delta;
    const pct = Math.min(100, Math.round((this.reviveProgress / REVIVE_DURATION_MS) * 100));
    this.reviveHint?.setText(`REVIVING ALLY… ${pct}%`);
    if (this.reviveProgress >= REVIVE_DURATION_MS) {
      this.reviveProgress = 0;
      Net.send({ t: 'revived' });
      this.allyDowned = false;
      this.api.npc.downed = false;
      this.api.showFloatingText(this.api.npc.x, this.api.npc.y - 40, 'ALLY REVIVED!', '#66ff88');
    }
  }

  private onRevived(): void {
    if (!this.localDowned) return;
    this.localDowned = false;
    const p = this.api.player;
    p.downed = false;
    p.hp = Math.max(1, Math.round(p.maxHp * REVIVE_HP_FRACTION));
    this.downedBanner?.setVisible(false);
    this.api.showFloatingText(p.x, p.y - 50, 'REVIVED!', '#66ff88');
    this.sendState(true);
  }

  private applyHuskSnap(msg: Extract<NetMsg, { t: 'huskSnap' }>): void {
    this.wave = msg.wave;
    this.shards = msg.shards;
    this.remaining = msg.remaining;
    this.updateGuestHud();

    const seen = new Set<number>();
    for (const hs of msg.husks) {
      seen.add(hs.id);
      const rep = this.huskReplicas.get(hs.id);
      if (!rep) {
        const variant = huskVariantFromIndex(hs.v ?? 0);
        const husk = new Husk(this.api.scene, hs.x, hs.y, hs.maxHp, 0, 0, 950, variant);
        husk.netId = hs.id;
        husk.netGhost = true;
        husk.hp = hs.hp;
        if (hs.p) husk.setTint(0xaa1133);
        husk.onGhostDamage = (amount) => {
          Net.send({ t: 'huskDamage', id: hs.id, amount });
          this.api.spawnDamageNumber(husk.x, husk.y - 20, amount);
        };
        husk.onGhostStatus = (s) => Net.send({ t: 'huskStatus', id: hs.id, s });
        this.api.addEnemy(husk);
        this.huskReplicas.set(hs.id, { husk, targetX: hs.x, targetY: hs.y, possessed: !!hs.p });
      } else {
        rep.targetX = hs.x;
        rep.targetY = hs.y;
        rep.husk.netSyncVitals(hs.hp, hs.maxHp, 0, 0);
        // Possession can start or end mid-life; keep the tint in step.
        if (rep.possessed !== !!hs.p) {
          rep.possessed = !!hs.p;
          // The body colour lives in the texture, so un-possessing clears the
          // tint rather than re-applying the variant colour on top of itself.
          if (rep.possessed) rep.husk.setTint(0xaa1133); else rep.husk.clearTint();
        }
      }
    }
    for (const [id, rep] of [...this.huskReplicas]) {
      if (!seen.has(id)) { this.api.removeEnemy(rep.husk); rep.husk.destroy(); this.huskReplicas.delete(id); }
    }
  }

  private applyHuskDeath(id: number, reward: number, x: number, y: number): void {
    this.shards += reward;
    this.updateGuestHud();
    this.api.showFloatingText(x, y - 30, `+${reward} 🩸`, '#cc44ff');

    const rep = this.huskReplicas.get(id);
    if (!rep) return;
    this.huskReplicas.delete(id);
    const husk = rep.husk;
    husk.hideHealthBar();
    husk.setTint(0x334411);
    this.api.scene.tweens.add({
      targets: husk,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => { this.api.removeEnemy(husk); if (husk.scene) husk.destroy(); },
    });
  }

  private onMessage(msg: NetMsg): void {
    if (this.matchEnded) return;
    switch (msg.t) {
      case 'state': {
        this.remote = { x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, recvAt: Date.now() };
        this.api.npc.netSyncVitals(msg.hp, msg.maxHp, msg.shieldHp, msg.shieldCharges);
        this.allyDowned = msg.downed ?? false;
        this.api.npc.downed = this.allyDowned;
        break;
      }
      case 'cast':
        this.castQueue.push({ id: msg.id, tx: msg.tx, ty: msg.ty });
        break;
      case 'hit': {
        const npc = this.api.npc;
        if (npc.active) this.api.spawnDamageNumber(npc.x, npc.y - 34, msg.amount);
        break;
      }
      case 'huskSnap':
        if (!this.isHost) this.applyHuskSnap(msg);
        break;
      case 'huskDeath':
        if (!this.isHost) this.applyHuskDeath(msg.id, msg.reward, msg.x, msg.y);
        break;
      case 'waveClear':
        if (!this.isHost) {
          this.shards += msg.bonus;
          this.updateGuestHud();
          this.api.showFloatingText(this.api.player.x, this.api.player.y - 50, `WAVE ${msg.wave} CLEARED  +${msg.bonus} 🩸`, '#88ff44');
        }
        break;
      case 'huskDamage':
        if (this.isHost) this.api.invasionKit.applyNetworkDamage(msg.id, msg.amount);
        break;
      case 'huskStatus':
        if (this.isHost) this.api.invasionKit.applyNetworkStatus(msg.id, msg.s);
        break;
      case 'huskPuppet':
        if (this.isHost) this.api.invasionKit.applyNetworkPuppet(msg.id, msg.on, msg.x, msg.y);
        break;
      case 'huskFx':
        if (!this.isHost) this.playFx(msg.fx);
        break;
      case 'boss':
        if (!this.isHost) this.api.invasionKit.showBossBanner(msg.name, msg.color);
        break;
      case 'allyBite':
        // A husk on the host's sim bit us — hostile, so it goes through the block.
        Fighter.asNonAllyDamage(() => this.api.player.takeDamage(msg.damage));
        this.api.spawnHitFlash(this.api.player.x, this.api.player.y, 0x88aa33);
        break;
      case 'revived':
        this.onRevived();
        break;
      case 'runEnd':
        this.matchEnded = true;
        this.api.endCoopRun(msg.wavesCompleted, msg.shardsEarned);
        break;
      default:
        break;
    }
  }

  private onStatusChange(): void {
    if (this.matchEnded) return;
    if (!Net.connected) {
      if (this.isHost) {
        this.finishCoopRun();
      } else {
        this.matchEnded = true;
        this.api.endCoopRun(this.wave, this.shards);
      }
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────

  private buildHud(): void {
    this.destroyHud();
    const scene = this.api.scene;
    const { width } = scene.scale;

    this.downedBanner = scene.add.text(width / 2, 100, '⚠ DOWNED — your ally must revive you!', {
      fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ff6666', stroke: '#330000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30).setVisible(false);

    this.reviveHint = scene.add.text(width / 2, 128, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#66ff88',
    }).setOrigin(0.5).setDepth(30);

    if (!this.isHost) {
      this.waveLabel = scene.add.text(width / 2, WAVE_LABEL_Y, '', {
        fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aacc88',
        stroke: '#101c08', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25);
      this.shardLabel = scene.add.text(width - 16, 16, '🩸 0', {
        fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc44ff',
      }).setOrigin(1, 0).setDepth(25);
      this.leaveBtn = scene.add.rectangle(62, 30, 92, 30, 0x221111, 0.9)
        .setStrokeStyle(1, 0xcc4444).setDepth(25).setInteractive({ useHandCursor: true });
      this.leaveLabel = scene.add.text(62, 30, '🚪 LEAVE', {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc6666',
      }).setOrigin(0.5).setDepth(26);
      this.leaveBtn
        .on('pointerover', () => { this.leaveBtn!.setStrokeStyle(2, 0xff8888); this.leaveLabel!.setColor('#ffaaaa'); })
        .on('pointerout', () => { this.leaveBtn!.setStrokeStyle(1, 0xcc4444); this.leaveLabel!.setColor('#cc6666'); })
        .on('pointerdown', () => this.leaveRun());
    }
  }

  private updateGuestHud(): void {
    this.waveLabel?.setText(formatWaveLabel(this.wave, this.remaining));
    this.shardLabel?.setText(`🩸 ${this.shards}`);
  }

  private destroyHud(): void {
    this.downedBanner?.destroy(); this.downedBanner = null;
    this.reviveHint?.destroy(); this.reviveHint = null;
    this.waveLabel?.destroy(); this.waveLabel = null;
    this.shardLabel?.destroy(); this.shardLabel = null;
    this.leaveBtn?.destroy(); this.leaveBtn = null;
    this.leaveLabel?.destroy(); this.leaveLabel = null;
  }
}
