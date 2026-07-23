import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';

// ── Shared Geyser type (exported so ArenaScene can import instead of redefining) ──

export interface Geyser {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

// ── Water Mastery constants ───────────────────────────────────────────────────

const SIPHON_COOLDOWN_MS = 5000;
const SIPHON_DURATION_MS = 3000;
const SIPHON_RANGE = 190;
const SIPHON_HALF_ANGLE = Math.PI / 5;     // 36° either side of the aim line
const SIPHON_DEHYDRATION_PER_SEC = 10;
const SLIPSTREAM_SPEED_MULT = 1.25;

/** The subset of an ArenaScene puddle the kit needs to test "am I standing in my own water?". */
export interface WaterPuddleLike {
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  kind?: string;
}

// ── Arena API interface ────────────────────────────────────────────────────────

export interface WaterArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly geysers: Geyser[];
  readonly puddles: WaterPuddleLike[];
  readonly nukeChanneling: boolean;
  /** True only when the player is water AND Water Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  isPlayerWater(): boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  lockCaster(ms: number): void;
  releaseCaster(): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  damagePlayerTargets(cx: number, cy: number, r: number, d: number, color: number): void;
  removeGeyser(g: Geyser): void;
  setPlayerGeyserBuffUntil(t: number): void;
  setNpcGeyserBuffUntil(t: number): void;
}

// ── WaterKit ──────────────────────────────────────────────────────────────────

export class WaterKit {
  // -- Dehydration --
  private dehydration = new Map<Fighter, number>();
  private dehydrationBars = new Map<Fighter, Phaser.GameObjects.Rectangle>();

  // -- Geyser depletion / shared global CD --
  private geyserCharges = new WeakMap<object, number>();
  private lastGeyserUseAt = -Infinity;
  private playerWasInGeyser = false;
  private npcWasInGeyser = false;

  // -- Boiling Geyser (R+ upgrade): per-enemy scald cooldown --
  private boilLastHitAt = new Map<Fighter, number>();
  private boilSteamAccum = 0;

  // -- Pressure Dagger --
  private daggerCharging = false;
  private daggerChargeStart = 0;
  private daggerVisual: Phaser.GameObjects.Arc | null = null;
  private daggerProjs = new Set<Projectile>();
  private daggerHitSets = new WeakMap<Projectile, Set<Fighter>>();
  private daggerLevels = new WeakMap<Projectile, 0 | 1 | 2>();
  private fKeyWasDown = false;

  // -- Laminar Laceration (F+) --
  private splitState: {
    ball1: Phaser.GameObjects.Arc;
    ball2: Phaser.GameObjects.Arc;
    until: number;
    lastHitAt: Map<Projectile, number>;
  } | null = null;

  // -- Water Mastery --
  private siphonLastCastAt = -Infinity;
  private siphonActiveUntil = 0;
  private siphonGfx: Phaser.GameObjects.Graphics | null = null;
  private siphonSeen = new Set<Fighter>();
  // Online mirror: the opponent's Siphon replayed on this victim sim (dehydrates the local player).
  private npcSiphonActiveUntil = 0;
  private npcSiphonGfx: Phaser.GameObjects.Graphics | null = null;
  private npcSiphonSeen = new Set<Fighter>();
  private slipstreamActive = false;

  // track time for methods called outside update()
  private lastTime = 0;
  // last known aim, captured in handleInput so update() can steer the siphon cone
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(private readonly arena: WaterArenaApi) {}

  reset(): void {
    for (const bar of this.dehydrationBars.values()) bar.destroy();
    this.dehydration.clear();
    this.dehydrationBars.clear();

    this.boilLastHitAt.clear();
    this.boilSteamAccum = 0;

    this.daggerCharging = false;
    if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
    for (const p of this.daggerProjs) {
      if (p.active) { p.setActive(false).setVisible(false); (p.body as Phaser.Physics.Arcade.Body).stop(); }
    }
    this.daggerProjs.clear();
    this.fKeyWasDown = false;

    this.clearSplit(false);

    this.lastGeyserUseAt = -Infinity;
    this.playerWasInGeyser = false;
    this.npcWasInGeyser = false;

    this.siphonLastCastAt = -Infinity;
    this.siphonActiveUntil = 0;
    if (this.siphonGfx) { this.siphonGfx.destroy(); this.siphonGfx = null; }
    this.siphonSeen.clear();
    this.npcSiphonActiveUntil = 0;
    if (this.npcSiphonGfx) { this.npcSiphonGfx.destroy(); this.npcSiphonGfx = null; }
    this.npcSiphonSeen.clear();
    this.slipstreamActive = false;
  }

  update(time: number, delta: number): void {
    this.lastTime = time;
    const { player, npc, geysers, scene, enemies } = this.arena;

    // -- Dehydration bars: update positions each frame --
    for (const [fighter, bar] of this.dehydrationBars) {
      if (!fighter.active) { bar.destroy(); this.dehydrationBars.delete(fighter); continue; }
      const pct = (this.dehydration.get(fighter) ?? 0) / 100;
      const barW = Math.max(0, pct * 44);
      bar.setPosition(fighter.x - 22 + barW / 2, fighter.y - 50);
      bar.setSize(barW, 4);
    }

    // -- Geyser logic (player side) --
    if (this.arena.isPlayerWater()) {
      let currentGeyser: Geyser | null = null;
      for (const g of geysers) {
        if (g.owner === 'player' && Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y) <= g.radius) {
          currentGeyser = g;
          break;
        }
      }
      const inGeyser = currentGeyser !== null;

      if (inGeyser) {
        this.arena.setPlayerGeyserBuffUntil(time + 2000);

        // Water Mastery — Pressure Rider counts each fresh step into your own geyser.
        if (!this.playerWasInGeyser) this.arena.recordMasteryStat('geyserBoosts', 1);

        // Entry event: player just stepped in AND global CD expired
        if (!this.playerWasInGeyser && time - this.lastGeyserUseAt >= 2000) {
          this.lastGeyserUseAt = time;
          this.consumeGeyserCharge(currentGeyser!, time);
          // Re-check geyser still exists after charge consumption
          const stillExists = geysers.includes(currentGeyser!);
          if (!stillExists) {
            this.playerWasInGeyser = false;
            return;
          }
        }

      }
      this.playerWasInGeyser = inGeyser;

      // -- Boiling Geyser (R+ upgrade): scald enemies standing in your geysers --
      if (this.arena.hasUpgrade('r')) {
        this.tickBoilingGeysers(time, delta, geysers, enemies);
      }

      // -- Water Mastery enhancements --
      if (this.arena.masteryActive) {
        this.tickSlipstream();
        this.tickSiphon(time, delta, 'player');
      }
    }

    // -- Geyser logic (NPC side): speed buff only, no charge depletion --
    {
      let npcInGeyser = false;
      for (const g of geysers) {
        if (g.owner === 'npc' && Phaser.Math.Distance.Between(g.x, g.y, npc.x, npc.y) <= g.radius) {
          npcInGeyser = true;
          this.arena.setNpcGeyserBuffUntil(time + 2000);
          break;
        }
      }
      this.npcWasInGeyser = npcInGeyser;
    }

    // -- Pressure dagger: out-of-bounds cleanup --
    const physWorld = (scene as unknown as { physics: { world: Phaser.Physics.Arcade.World } }).physics.world;
    const bounds = physWorld.bounds;
    for (const proj of this.daggerProjs) {
      if (!proj.active) { this.daggerProjs.delete(proj); continue; }
      if (
        proj.x < bounds.x - 60 || proj.x > bounds.right + 60 ||
        proj.y < bounds.y - 60 || proj.y > bounds.bottom + 60
      ) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.daggerProjs.delete(proj);
      }
    }

    // -- Laminar Laceration split --
    if (this.splitState) {
      if (time >= this.splitState.until || npc.hp <= 0) {
        this.clearSplit(npc.hp > 0 && npc.active);
      } else {
        const { ball1, ball2, lastHitAt } = this.splitState;
        for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
          if (!go.active || !go.isFromPlayer) continue;
          for (const ball of [ball1, ball2]) {
            const dist = Phaser.Math.Distance.Between(go.x, go.y, ball.x, ball.y);
            if (dist <= 26) {
              const lastHit = lastHitAt.get(go) ?? 0;
              if (time - lastHit < 50) continue;
              lastHitAt.set(go, time);
              const dmg = Math.round(go.damage * 1.5 * this.computeOutgoingMultiplier(npc, 'player'));
              npc.takeDamage(dmg);
              this.arena.spawnHitFlash(ball.x, ball.y, 0x0066cc);
              go.setActive(false).setVisible(false);
              (go.body as Phaser.Physics.Arcade.Body).stop();
              this.noteDamageDealtByPlayer(dmg);
            }
          }
        }
      }
    }
  }

  handleInput(time: number, _delta: number, mouseX: number, mouseY: number): void {
    if (!this.arena.isPlayerWater()) return;
    const { fKey, player, scene, projectiles } = this.arena;
    const fKeyDown = fKey.isDown;

    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;

    // Water Mastery — Siphon takes over whichever slot the player bound it onto.
    const siphonSlot = this.arena.masteryActive ? this.siphonSlot() : null;
    if (siphonSlot) {
      const siphonKey = siphonSlot === 'e' ? this.arena.eKey
        : siphonSlot === 'r' ? this.arena.rKey
        : siphonSlot === 'q' ? this.arena.qKey
        : fKey;
      if (Phaser.Input.Keyboard.JustDown(siphonKey) && !this.arena.nukeChanneling) {
        this.tryCastSiphon(time);
      }
    }

    // Bound over F, Siphon displaces Pressure Dagger's charge-and-release entirely.
    if (siphonSlot === 'f') {
      this.fKeyWasDown = fKeyDown;
      return;
    }

    // If nukeChanneling was cleared externally while charging, abort
    if (this.daggerCharging && !this.arena.nukeChanneling) {
      this.daggerCharging = false;
      if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
      player.chargeRatio = 0;
    }

    if (fKeyDown && !this.fKeyWasDown && !this.arena.nukeChanneling && this.arena.player.getCooldownRatio('pressure-dagger') >= 1) {
      // Begin charging
      this.daggerCharging = true;
      this.daggerChargeStart = time;
      this.arena.lockCaster(99999);
      this.daggerVisual = scene.add.circle(player.x, player.y, 10, 0x4488ff, 0.7).setDepth(15);
    }

    if (this.daggerCharging) {
      const held = time - this.daggerChargeStart;
      const chargeRatio = Math.min(1, held / 2000);
      player.chargeRatio = chargeRatio;

      if (this.daggerVisual) {
        this.daggerVisual.setPosition(player.x, player.y);
        const level = held >= 2000 ? 2 : held >= 1000 ? 1 : 0;
        const col = level === 2 ? 0x002266 : level === 1 ? 0x004488 : 0x4488ff;
        this.daggerVisual.setFillStyle(col, 0.7);
        this.daggerVisual.setRadius(10 + level * 4);
      }

      if (!fKeyDown && this.fKeyWasDown) {
        // Release — fire
        this.daggerCharging = false;
        player.chargeRatio = 0;
        if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
        this.arena.releaseCaster();

        const held2 = time - this.daggerChargeStart;
        const level = (held2 >= 2000 ? 2 : held2 >= 1000 ? 1 : 0) as 0 | 1 | 2;
        const mult = level === 2 ? 2 : level === 1 ? 1.5 : 1;
        const baseDmg = Math.round(16 * mult);

        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 700;
        const spawnDist = 32;

        const proj = new Projectile(
          scene,
          player.x + (dx / len) * spawnDist,
          player.y + (dy / len) * spawnDist,
          'proj-pressure-dagger',
          baseDmg,
          true,
        );

        const tintColor = level === 2 ? 0x002266 : level === 1 ? 0x0044aa : 0x4488ff;
        proj.setTint(tintColor);
        proj.setRotation(Math.atan2(dy, dx));
        (proj as any).pierceShield = true;
        (proj as any).baseDmg = baseDmg;

        projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);

        this.daggerProjs.add(proj);
        this.daggerHitSets.set(proj, new Set<Fighter>());
        this.daggerLevels.set(proj, level);

        player.triggerCooldown('pressure-dagger');
      }
    }

    this.fKeyWasDown = fKeyDown;
  }

  handleNpcCastId(_id: string | null, _time: number): void {
    // No NPC reactions needed for water currently
  }

  // Called from applyProjectileToNpc when proj-pressure-dagger (player-fired) hits NPC
  onDaggerHitNpc(proj: Projectile, target: Fighter): void {
    const hitSet = this.daggerHitSets.get(proj);
    if (!hitSet || hitSet.has(target)) return;
    hitSet.add(target);

    const baseDmg = ((proj as any).baseDmg as number) ?? proj.damage;
    const totalDmg = Math.round(baseDmg * this.computeOutgoingMultiplier(target, 'player'));
    target.takeDamage(totalDmg, { pierce: true });
    this.arena.spawnHitFlash(target.x, target.y, 0x002266);
    this.arena.showFloatingText(target.x, target.y - 30, '💧 PIERCE!', '#88ccff');
    this.noteDamageDealtByPlayer(totalDmg);

    const level = this.daggerLevels.get(proj) ?? 0;
    if (this.arena.hasUpgrade('f') && level === 2 && !this.splitState && target === this.arena.npc) {
      this.startSplit(target, this.lastTime);
    }
    // Projectile is NOT deactivated — kit's update() handles out-of-bounds cleanup
  }

  // Called from water-cut hit path in applyProjectileToNpc
  onWaterCutHit(target: Fighter, _attacker: 'player' | 'npc'): void {
    if (!this.arena.hasUpgrade('click')) return;
    this.applyDehydration(target, 2);
  }

  // Called from pain rain impact tick — returns true if boiling consumed the drop
  onPainRainDropImpact(_x: number, _y: number): boolean {
    return false;
  }

  onFighterDefeated(f: Fighter): void {
    const bar = this.dehydrationBars.get(f);
    if (bar) { bar.destroy(); this.dehydrationBars.delete(f); }
    this.dehydration.delete(f);
    this.boilLastHitAt.delete(f);

    if (this.splitState && f === this.arena.npc) {
      this.clearSplit(false);
    }
  }

  // Called after a new geyser is pushed to arena.geysers — registers 2 charges
  registerGeyser(g: Geyser): void {
    this.geyserCharges.set(g, 2);
  }

  // Called from water damage paths to track boiling extension
  noteDamageDealtByPlayer(_amount: number): void {
    // no-op: boiling system removed
  }

  // Dehydration damage bonus. Applies to whichever fighter is dehydrated — the player's
  // Siphon/Dehydration dries out the npc; online, the npc's does the same to us.
  computeOutgoingMultiplier(target: Fighter, _attacker: 'player' | 'npc'): number {
    const dehyd = this.dehydration.get(target) ?? 0;
    return Math.min(1.5, 1 + 0.05 * Math.floor(dehyd / 10));
  }

  isDaggerCharging(): boolean {
    return this.daggerCharging;
  }

  replenishGeyserCharges(time: number): void {
    for (const g of this.arena.geysers) {
      if (g.owner !== 'player') continue;
      const charges = (this.geyserCharges.get(g) as number) ?? 2;
      if (charges >= 2) continue;
      const newCharges = charges + 1;
      this.geyserCharges.set(g, newCharges);
      if (newCharges === 2) {
        this.arena.scene.tweens.killTweensOf(g.sprite);
        g.sprite.setScale(1);
        this.arena.scene.tweens.add({
          targets: g.sprite, scaleX: 1.1, scaleY: 1.1,
          yoyo: true, repeat: -1, duration: 800,
        });
        g.radius = Math.round(g.radius / 0.65);
      }
      this.arena.showFloatingText(g.x, g.y - 20, '+1 CHARGE', '#aaffff');
    }
    void time;
  }

  isNpcSplit(): boolean {
    return this.splitState !== null;
  }

  // ── Water Mastery ─────────────────────────────────────────────────────────

  /** Slipstream: 25% faster while standing in your own water. 1 when the passive isn't earning. */
  getPlayerSpeedMult(): number {
    return this.slipstreamActive ? SLIPSTREAM_SPEED_MULT : 1;
  }

  /** 0–1 cooldown fill for the Siphon HUD card. */
  getSiphonCooldownRatio(time: number): number {
    return Math.min(1, (time - this.siphonLastCastAt) / SIPHON_COOLDOWN_MS);
  }

  /** The ability slot Siphon is bound over this match, or null if it isn't bound anywhere. */
  private siphonSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'siphon') return slot;
    }
    return null;
  }

  private tryCastSiphon(time: number): void {
    if (time - this.siphonLastCastAt < SIPHON_COOLDOWN_MS) return;
    this.siphonLastCastAt = time;
    this.siphonActiveUntil = time + SIPHON_DURATION_MS;
    this.siphonSeen.clear();
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 28, '🌊 Siphon!', '#66ddff');
    this.arena.broadcastMasteryCast('siphon');
  }

  /**
   * Siphon: a cone anchored to the player that follows their aim for 3s. It deals no damage —
   * everything inside just dries out, feeding the dehydration damage bonus on the rest of the kit.
   */
  /** Online replay: the remote water player cast Siphon — open an npc cone that dehydrates us. */
  doNpcSiphon(_tx: number, _ty: number): void {
    this.npcSiphonActiveUntil = this.arena.scene.time.now + SIPHON_DURATION_MS;
    this.npcSiphonSeen.clear();
  }

  /** Online: opponent is water — advance their Siphon cone and keep our dehydration bar live. */
  updateNpc(time: number, delta: number): void {
    this.updateDehydrationBarPositions();
    this.tickSiphon(time, delta, 'npc');
  }

  private updateDehydrationBarPositions(): void {
    for (const [fighter, bar] of this.dehydrationBars) {
      if (!fighter.active) { bar.destroy(); this.dehydrationBars.delete(fighter); continue; }
      const pct = (this.dehydration.get(fighter) ?? 0) / 100;
      const barW = Math.max(0, pct * 44);
      bar.setPosition(fighter.x - 22 + barW / 2, fighter.y - 50);
      bar.setSize(barW, 4);
    }
  }

  private tickSiphon(time: number, delta: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const activeUntil = owner === 'player' ? this.siphonActiveUntil : this.npcSiphonActiveUntil;
    const seen = owner === 'player' ? this.siphonSeen : this.npcSiphonSeen;
    // 'npc' cones dehydrate the local player; 'player' cones dehydrate our enemies.
    const targets = owner === 'player' ? this.arena.enemies : [player];

    if (time >= activeUntil) {
      if (owner === 'player') { if (this.siphonGfx) { this.siphonGfx.destroy(); this.siphonGfx = null; } }
      else { if (this.npcSiphonGfx) { this.npcSiphonGfx.destroy(); this.npcSiphonGfx = null; } }
      return;
    }

    // Player cone follows the live cursor; npc cone auto-tracks its victim (the local player).
    const aimX = owner === 'player' ? this.lastMouseX : player.x;
    const aimY = owner === 'player' ? this.lastMouseY : player.y;
    const angle = Math.atan2(aimY - origin.y, aimX - origin.x);

    let gfx = owner === 'player' ? this.siphonGfx : this.npcSiphonGfx;
    if (!gfx) {
      gfx = scene.add.graphics().setDepth(4);
      if (owner === 'player') this.siphonGfx = gfx; else this.npcSiphonGfx = gfx;
    }
    gfx.clear();
    gfx.fillStyle(0x1188cc, 0.28);
    gfx.slice(origin.x, origin.y, SIPHON_RANGE, angle - SIPHON_HALF_ANGLE, angle + SIPHON_HALF_ANGLE, false);
    gfx.fillPath();
    gfx.lineStyle(2, 0x66ddff, 0.7);
    gfx.beginPath();
    gfx.arc(origin.x, origin.y, SIPHON_RANGE, angle - SIPHON_HALF_ANGLE, angle + SIPHON_HALF_ANGLE, false);
    gfx.strokePath();

    const gain = SIPHON_DEHYDRATION_PER_SEC * (delta / 1000);
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(origin.x, origin.y, t.x, t.y) > SIPHON_RANGE) continue;
      // Shortest signed angle between the cone's axis and the target keeps the wrap at ±π honest.
      const toTarget = Math.atan2(t.y - origin.y, t.x - origin.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toTarget - angle)) > SIPHON_HALF_ANGLE) continue;

      this.applyDehydration(t, gain);
      if (!seen.has(t)) {
        seen.add(t);
        this.arena.showFloatingText(t.x, t.y - 38, '🌊 SIPHONED!', '#66ddff');
      }
    }
  }

  /** Slipstream: recomputed each frame so the buff drops the instant the player leaves the water. */
  private tickSlipstream(): void {
    const { player } = this.arena;
    // Only plain water counts — perk stalagmites and foreign puddles (lava, toxic, abyss) don't.
    const wet = this.arena.puddles.some(
      (p) => p.owner === 'player' && (p.kind === undefined || p.kind === 'puddle')
        && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius,
    );
    if (wet && !this.slipstreamActive) {
      this.arena.showFloatingText(player.x, player.y - 30, '🌊 Slipstream', '#66ddff');
    }
    this.slipstreamActive = wet;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private applyDehydration(target: Fighter, amount: number): void {
    const curr = this.dehydration.get(target) ?? 0;
    const next = Math.min(100, curr + amount);
    this.dehydration.set(target, next);
    this.updateDehydrationBar(target, next);
  }

  private updateDehydrationBar(target: Fighter, pct: number): void {
    const scene = this.arena.scene;
    if (pct <= 0) {
      const bar = this.dehydrationBars.get(target);
      if (bar) { bar.destroy(); this.dehydrationBars.delete(target); }
      return;
    }
    let bar = this.dehydrationBars.get(target);
    if (!bar) {
      bar = scene.add.rectangle(target.x, target.y - 50, 1, 4, 0xffffff, 1).setDepth(20).setOrigin(0.5);
      this.dehydrationBars.set(target, bar);
    }
    const barW = Math.max(0, (pct / 100) * 44);
    bar.setPosition(target.x - 22 + barW / 2, target.y - 50);
    bar.setSize(barW, 4);
  }

  private consumeGeyserCharge(g: Geyser, time: number): void {
    const charges = ((this.geyserCharges.get(g) as number) ?? 2) - 1;
    this.geyserCharges.set(g, charges);

    if (charges === 1) {
      this.arena.scene.tweens.killTweensOf(g.sprite);
      g.sprite.setScale(0.65);
      this.arena.scene.tweens.add({
        targets: g.sprite, scaleX: 0.72, scaleY: 0.72,
        yoyo: true, repeat: -1, duration: 600,
      });
      g.radius = Math.round(g.radius * 0.65);
      this.arena.showFloatingText(g.x, g.y - 20, 'WEAK', '#55ccaa');
    } else if (charges <= 0) {
      this.arena.removeGeyser(g);
      this.arena.showFloatingText(g.x, g.y - 20, 'DEPLETED', '#55aaaa');
    }
    void time;
  }

  private tickBoilingGeysers(time: number, delta: number, geysers: Geyser[], enemies: Fighter[]): void {
    const playerGeysers = geysers.filter((g) => g.owner === 'player');
    if (playerGeysers.length === 0) return;

    // Steam wisps so a boiling geyser reads as hazardous
    this.boilSteamAccum += delta;
    const steam = this.boilSteamAccum >= 120;
    if (steam) this.boilSteamAccum = 0;

    for (const g of playerGeysers) {
      if (steam) {
        const ox = (Math.random() - 0.5) * g.radius * 1.5;
        const oy = (Math.random() - 0.5) * g.radius * 1.5;
        this.arena.spawnHitFlash(g.x + ox, g.y + oy, 0xffffff);
      }

      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > g.radius) continue;
        if (time - (this.boilLastHitAt.get(t) ?? -Infinity) < 1000) continue;

        this.boilLastHitAt.set(t, time);
        // The damage number is spawned by the target's own 'damaged' listener —
        // adding one here rendered a second number and read as a double tick.
        t.takeDamage(10, { source: g, sourceX: g.x, sourceY: g.y });
        this.arena.spawnHitFlash(t.x, t.y, 0xffffff);
        this.arena.showFloatingText(t.x, t.y - 44, '♨️ SCALDED!', '#ffddaa');
        this.noteDamageDealtByPlayer(10);
      }
    }
  }

  private startSplit(npc: Fighter, time: number): void {
    const scene = this.arena.scene;
    npc.setVisible(false);
    (npc.body as Phaser.Physics.Arcade.Body).enable = false;

    const ball1 = scene.add.circle(npc.x - 24, npc.y, 18, 0x0066cc, 0.9).setDepth(6);
    const ball2 = scene.add.circle(npc.x + 24, npc.y, 18, 0x0066cc, 0.9).setDepth(6);

    [ball1, ball2].forEach(b => {
      scene.tweens.add({ targets: b, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 400 });
    });

    this.splitState = { ball1, ball2, until: time + 2000, lastHitAt: new Map() };
    this.arena.showFloatingText(npc.x, npc.y - 36, '💧 SPLIT!', '#88ccff');
    this.arena.recordMasteryStat('daggerSplits', 1);
  }

  private clearSplit(restoreNpc: boolean): void {
    if (!this.splitState) return;
    this.splitState.ball1.destroy();
    this.splitState.ball2.destroy();
    this.splitState = null;

    if (restoreNpc) {
      const npc = this.arena.npc;
      npc.setVisible(true);
      (npc.body as Phaser.Physics.Arcade.Body).enable = true;
      this.arena.showFloatingText(npc.x, npc.y - 36, '💧 MERGED', '#88ccff');
    }
  }
}
