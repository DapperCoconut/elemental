import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { ArmGesture, WaterAvatar, WaterColorFn, WaterFx, WaterSurf, WATER, waterRibbon, waterRibbonLayered } from './WaterVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

// ── Shared Geyser type (exported so ArenaScene can import instead of redefining) ──

export interface Geyser {
  /** Lifecycle handle owned by ArenaScene; WaterKit repaints it as a living spring. */
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
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
/** Enemies held at 100% dehydration at once to earn The Great Drought (→ the Coral skin). */
const DROUGHT_TARGETS = 5;

// ── Sulphur (divine perk) constants ──────────────────────────────────────────

/** Pressure a capped geyser builds per second, and the ceiling it builds to. */
const SULPHUR_PRESSURE_PER_SEC = 5;
const SULPHUR_PRESSURE_MAX = 100;
/** How long the eruption's speed boost holds. */
const SULPHUR_BOOST_MS = 8000;

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'water-cut': 'punch',
  'splash': 'sweep',
  'geyser': 'slam',
  'pressure-dagger': 'punch',
  'pain-rain': 'raise',
};

/** An ArenaScene puddle. Structurally identical to ArenaScene's own `Puddle`. */
export interface WaterPuddleLike {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
  kind?: 'puddle' | 'stalagmite' | 'poison' | 'lava' | 'abyss' | 'toxic';
  lavaFinal?: boolean;
}

/** A puddle this kit painted — its Graphics is repainted every frame until ArenaScene kills it. */
interface PaintedPool {
  p: WaterPuddleLike;
  g: Phaser.GameObjects.Graphics;
  seed: number;
  owner: 'player' | 'npc';
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
  /** Aim error of the current difficulty — the NPC's Splash scatters by this much. */
  readonly npcAimOffsetDeg: number;
  /** True only when the player is water AND Water Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  isPlayerWater(): boolean;
  isNpcWater(): boolean;
  /** Skins: maps a water visual color through the owner's skin. */
  waterColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  lockCaster(ms: number): void;
  releaseCaster(): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  removeGeyser(g: Geyser): void;
  setPlayerGeyserBuffUntil(t: number): void;
  setNpcGeyserBuffUntil(t: number): void;
}

// ── WaterKit ──────────────────────────────────────────────────────────────────

export class WaterKit {
  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future skin recolours one side. */
  private readonly pcol: WaterColorFn;
  private readonly ncol: WaterColorFn;
  private readonly pfx: WaterFx;
  private readonly nfx: WaterFx;
  /**
   * The character rig for each water fighter — water's own living-water avatar, or the
   * equipped skin's replacement (Coral's reef colony).
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Seconds since reset — drives every surface that ripples rather than tweens. */
  private worldT = 0;
  private projTrailAccum = 0;
  private paintedPools: PaintedPool[] = [];
  private slipstreamSurf: WaterSurf | null = null;
  private geyserSurf: WaterSurf | null = null;
  private daggerGfx: Phaser.GameObjects.Graphics | null = null;
  private splitGfx: Phaser.GameObjects.Graphics | null = null;
  private siphonPullAccum = 0;

  // -- Dehydration --
  private dehydration = new Map<Fighter, number>();
  private dehydrationBars = new Map<Fighter, Phaser.GameObjects.Graphics>();

  // -- Splash (E) — the 2s window during which puddles rain down at the cursor --
  private splashActiveUntil = 0;
  private splashDropAccum = 0;
  private splashDropCount = 0;
  private npcSplashActiveUntil = 0;
  private npcSplashDropAccum = 0;

  // -- Geyser depletion / shared global CD --
  private geyserCharges = new WeakMap<object, number>();
  private lastGeyserUseAt = -Infinity;
  private playerWasInGeyser = false;
  private npcWasInGeyser = false;
  private playerInGeyser = false;

  // -- Sulphur (divine perk) --
  /**
   * Pressure held by each capped geyser, keyed by the geyser object. A WeakMap for the same
   * reason `geyserCharges` is one: ArenaScene owns the geyser's lifecycle, and a removed
   * spring must take its pressure with it.
   */
  private sulphurPressure = new WeakMap<object, number>();
  /** The live eruption boost per side: `until` is a `scene.time.now` stamp, `mult` is 1 + pressure/100. */
  private sulphurBoost: Record<'player' | 'npc', { until: number; mult: number }> = {
    player: { until: 0, mult: 1 },
    npc: { until: 0, mult: 1 },
  };

  // -- The Great Drought achievement (unlocks the Coral skin) --
  private droughtUnlocked = false;

  // -- Boiling Geyser (R+ upgrade): per-enemy scald cooldown --
  private boilLastHitAt = new Map<Fighter, number>();
  private boilSteamAccum = 0;

  // -- Pressure Dagger --
  private daggerCharging = false;
  private daggerChargeStart = 0;
  private daggerLevelShown: 0 | 1 | 2 = 0;
  private daggerProjs = new Set<Projectile>();
  private daggerHitSets = new WeakMap<Projectile, Set<Fighter>>();
  private daggerLevels = new WeakMap<Projectile, 0 | 1 | 2>();
  private fKeyWasDown = false;

  // -- Laminar Laceration (F+) --
  private splitState: {
    x1: number; y1: number;
    x2: number; y2: number;
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
  // last known aim, captured in handleInput so update() can steer the siphon cone and the rig
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(private readonly arena: WaterArenaApi) {
    this.pcol = (base) => arena.waterColor('player', base);
    this.ncol = (base) => arena.waterColor('npc', base);
    this.pfx = new WaterFx(arena.scene, this.pcol);
    this.nfx = new WaterFx(arena.scene, this.ncol);
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.slipstreamSurf) { this.slipstreamSurf.destroy(); this.slipstreamSurf = null; }
    if (this.geyserSurf) { this.geyserSurf.destroy(); this.geyserSurf = null; }
    if (this.daggerGfx) { this.daggerGfx.destroy(); this.daggerGfx = null; }
    if (this.splitGfx) { this.splitGfx.destroy(); this.splitGfx = null; }
    this.paintedPools = [];
    this.worldT = 0;
    this.projTrailAccum = 0;
    this.siphonPullAccum = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    for (const bar of this.dehydrationBars.values()) bar.destroy();
    this.dehydration.clear();
    this.dehydrationBars.clear();

    this.splashActiveUntil = 0;
    this.splashDropAccum = 0;
    this.splashDropCount = 0;
    this.npcSplashActiveUntil = 0;
    this.npcSplashDropAccum = 0;

    this.boilLastHitAt.clear();
    this.boilSteamAccum = 0;

    this.daggerCharging = false;
    this.daggerLevelShown = 0;
    for (const p of this.daggerProjs) {
      if (p.active) { p.setActive(false).setVisible(false); (p.body as Phaser.Physics.Arcade.Body).stop(); }
    }
    this.daggerProjs.clear();
    this.fKeyWasDown = false;

    this.clearSplit(false);

    this.lastGeyserUseAt = -Infinity;
    this.playerWasInGeyser = false;
    this.npcWasInGeyser = false;
    this.playerInGeyser = false;
    this.sulphurPressure = new WeakMap<object, number>();
    this.sulphurBoost = { player: { until: 0, mult: 1 }, npc: { until: 0, mult: 1 } };
    this.droughtUnlocked = false;

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
    this.worldT += delta / 1000;
    const { player, npc, geysers, scene, enemies } = this.arena;
    const isPlayerWater = this.arena.isPlayerWater();
    const isNpcWater = this.arena.isNpcWater();

    this.updateAvatars(time, delta, isPlayerWater, isNpcWater);
    this.updateProjectileTrails(delta);
    this.updatePools();
    this.updateGeyserArt();
    this.updateDaggerCharge(time);
    this.updateDehydrationBars();

    // -- Player side --
    if (isPlayerWater) {
      this.updatePlayerSplash(time, delta);
      this.checkGreatDrought();

      let currentGeyser: Geyser | null = null;
      for (const g of geysers) {
        if (g.owner === 'player' && Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y) <= g.radius) {
          currentGeyser = g;
          break;
        }
      }
      const inGeyser = currentGeyser !== null;
      this.playerInGeyser = inGeyser;

      // Sulphur: a capped spring is a bomb, not a boost pad — standing on it sets it off, and
      // the spring is gone afterwards, so none of the buff/charge bookkeeping below applies.
      if (inGeyser && this.hasSulphur('player')) {
        if (!this.playerWasInGeyser) this.eruptSulphur(time, currentGeyser!, 'player');
        this.playerWasInGeyser = geysers.includes(currentGeyser!);
        this.playerInGeyser = this.playerWasInGeyser;
      } else {
        if (inGeyser) {
          this.arena.setPlayerGeyserBuffUntil(time + 2000);

          // Water Mastery — Pressure Rider counts each fresh step into your own geyser.
          if (!this.playerWasInGeyser) {
            this.arena.recordMasteryStat('geyserBoosts', 1);
            // The spring catches you and throws you forward.
            this.pfx.crown(player.x, player.y, 54, 11, 4);
            this.pfx.spray(player.x, player.y, 10, { speed: 200, size: 3, life: 480, fall: 60, depth: 5 });
          }

          // Entry event: player just stepped in AND global CD expired
          if (!this.playerWasInGeyser && time - this.lastGeyserUseAt >= 2000) {
            this.lastGeyserUseAt = time;
            this.consumeGeyserCharge(currentGeyser!);
            // Re-check geyser still exists after charge consumption
            if (!geysers.includes(currentGeyser!)) {
              this.playerWasInGeyser = false;
              this.playerInGeyser = false;
              return;
            }
          }
        }
        this.playerWasInGeyser = inGeyser;
      }

      // -- Boiling Geyser (R+ upgrade): scald enemies standing in your geysers --
      if (this.arena.hasUpgrade('r')) {
        this.tickBoilingGeysers(time, delta, geysers, enemies);
      }

      // -- Water Mastery enhancements --
      if (this.arena.masteryActive) {
        this.tickSlipstream();
        this.tickSiphon(time, delta, 'player');
      }
      this.updateSlipstreamSurf(delta);
    }

    // -- NPC side --
    if (isNpcWater) {
      this.updateNpcSplash(time, delta);
      // Online: advance the opponent's Siphon cone so their dehydration lands on us.
      this.tickSiphon(time, delta, 'npc');
    }

    // -- Geyser logic (NPC side): speed buff only, no charge depletion --
    {
      const npcSulphur = this.hasSulphur('npc');
      let npcInGeyser = false;
      for (const g of geysers) {
        if (g.owner === 'npc' && Phaser.Math.Distance.Between(g.x, g.y, npc.x, npc.y) <= g.radius) {
          npcInGeyser = true;
          if (npcSulphur) {
            if (!this.npcWasInGeyser) this.eruptSulphur(time, g, 'npc');
            npcInGeyser = geysers.includes(g);
          } else {
            this.arena.setNpcGeyserBuffUntil(time + 2000);
          }
          break;
        }
      }
      this.npcWasInGeyser = npcInGeyser;
    }

    this.tickSulphurPressure(time, delta);

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
    this.updateSplit(time);
  }

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (!this.arena.isPlayerWater()) return;
    const { fKey, eKey, rKey, qKey, player, scene, projectiles } = this.arena;
    const fKeyDown = fKey.isDown;

    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    const aim = Math.atan2(mouseY - player.y, mouseX - player.x);

    // Water Mastery — Siphon takes over whichever slot the player bound it onto.
    const siphonSlot = this.arena.masteryActive ? this.siphonSlot() : null;

    if (!this.arena.nukeChanneling) {
      const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

      // ── Click: Water Cut ─────────────────────────────────────────
      if (pointer.isDown) {
        if (player.castAbility('water-cut', playerCtx)) {
          this.playerAvatar?.play('punch', aim);
          if (this.arena.hasUpgrade('click')) {
            // Tint the just-created proj-water white for the Dehydration visual.
            const children = projectiles.getChildren() as Projectile[];
            for (let ci = children.length - 1; ci >= 0; ci--) {
              if (children[ci].isFromPlayer && children[ci].texture.key === 'proj-water') {
                children[ci].setTint(this.pcol(WATER.pale));
                break;
              }
            }
          }
        }
      }

      // A slot bound to Siphon casts Siphon instead of the slot's normal ability. The bind
      // check must come first: JustDown() clears the flag, so testing the ability first would
      // swallow the keypress before the Siphon branch ever saw it.
      const eDown = Phaser.Input.Keyboard.JustDown(eKey);
      const rDown = Phaser.Input.Keyboard.JustDown(rKey);
      const qDown = Phaser.Input.Keyboard.JustDown(qKey);
      const fDown = fKeyDown && !this.fKeyWasDown;

      if (siphonSlot === 'e' ? eDown : siphonSlot === 'r' ? rDown
        : siphonSlot === 'q' ? qDown : siphonSlot === 'f' ? fDown : false) {
        this.tryCastSiphon(time, aim);
      }

      if (siphonSlot !== 'e' && eDown) {
        if (player.castAbility('splash', playerCtx)) {
          this.splashActiveUntil = time + 2000;
          this.splashDropAccum = 0;
          this.splashDropCount = 0;
          this.playerAvatar?.play('sweep', aim);
        }
      }
      if (siphonSlot !== 'r' && rDown) {
        if (player.castAbility('geyser', playerCtx)) this.playerAvatar?.play('slam', aim);
      }
      if (siphonSlot !== 'q' && qDown) {
        if (player.castAbility('pain-rain', playerCtx)) {
          this.playerAvatar?.play('raise', aim, 1200);
          this.replenishGeyserCharges();
        }
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
      player.chargeRatio = 0;
    }

    if (fKeyDown && !this.fKeyWasDown && !this.arena.nukeChanneling && player.getCooldownRatio('pressure-dagger') >= 1) {
      // Begin charging: water spirals in and compresses against the caster's hands.
      this.daggerCharging = true;
      this.daggerChargeStart = time;
      this.daggerLevelShown = 0;
      this.arena.lockCaster(99999);
      this.playerAvatar?.setHold('charge');
      this.pfx.channelVortex(player.x, player.y, 74, 2000, () => (player.active ? { x: player.x, y: player.y } : null), 5);
    }

    if (this.daggerCharging) {
      const held = time - this.daggerChargeStart;
      player.chargeRatio = Math.min(1, held / 2000);

      // Each pressure tier lands with its own snap so the two thresholds are audible-by-eye.
      const level = (held >= 2000 ? 2 : held >= 1000 ? 1 : 0) as 0 | 1 | 2;
      if (level > this.daggerLevelShown) {
        this.daggerLevelShown = level;
        this.pfx.ring(player.x, player.y, 16, 40 + level * 22, level === 2 ? WATER.white : WATER.foam, 320, 4, 6);
        this.pfx.spray(player.x, player.y, 4 + level * 4, { speed: 120, size: 2.6, life: 380, fall: 40, depth: 6 });
        this.arena.showFloatingText(
          player.x, player.y - 34,
          level === 2 ? '💧 MAX PRESSURE' : '💧 Pressurised',
          level === 2 ? '#ddf6ff' : '#88ddff',
        );
      }

      if (!fKeyDown && this.fKeyWasDown) {
        // Release — fire
        this.daggerCharging = false;
        player.chargeRatio = 0;
        this.arena.releaseCaster();
        this.playerAvatar?.setHold(null);
        this.playerAvatar?.play('punch', aim);

        const held2 = time - this.daggerChargeStart;
        const lvl = (held2 >= 2000 ? 2 : held2 >= 1000 ? 1 : 0) as 0 | 1 | 2;
        const mult = lvl === 2 ? 2 : lvl === 1 ? 1.5 : 1;
        const baseDmg = Math.round(16 * mult);

        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 700;
        const spawnDist = 32;
        const sx = player.x + (dx / len) * spawnDist;
        const sy = player.y + (dy / len) * spawnDist;

        const proj = new Projectile(scene, sx, sy, 'proj-pressure-dagger', baseDmg, true);

        // Tint multiplies the (already dark) lance texture, so a higher tier has to *lift*
        // it toward white — dimming a near-black sprite just made it vanish on the arena floor.
        const tintColor = lvl === 2 ? this.pcol(WATER.white) : lvl === 1 ? this.pcol(WATER.foam) : this.pcol(WATER.sky);
        proj.setTint(tintColor);
        proj.setRotation(Math.atan2(dy, dx));
        (proj as any).pierceShield = true;
        (proj as any).baseDmg = baseDmg;

        projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);

        this.daggerProjs.add(proj);
        this.daggerHitSets.set(proj, new Set<Fighter>());
        this.daggerLevels.set(proj, lvl);

        // Release burst scales with the tier: more water, more recoil, more shake.
        this.pfx.muzzleSpray(sx, sy, Math.atan2(dy, dx), 1 + lvl * 0.5);
        this.pfx.spray(sx, sy, 4 + lvl * 5, {
          angle: Math.atan2(dy, dx) + Math.PI, spread: 0.9,
          speed: 130 + lvl * 60, size: 2.6 + lvl * 0.6, life: 420, fall: 46, depth: 6,
        });
        if (lvl > 0) {
          this.pfx.ring(sx, sy, 8, 44 + lvl * 26, WATER.pale, 300, 4, 6);
          scene.cameras.main.shake(90 + lvl * 60, 0.002 + lvl * 0.0018);
        }

        player.triggerCooldown('pressure-dagger');
      }
    }

    this.fKeyWasDown = fKeyDown;
  }

  handleNpcCastId(id: string | null, time: number): void {
    if (!id) return;
    const { npc, player } = this.arena;

    if (id === 'splash') {
      this.npcSplashActiveUntil = time + 2000;
      this.npcSplashDropAccum = 0;
    }

    const gesture = NPC_GESTURES[id];
    if (gesture) {
      this.npcAvatar?.play(
        gesture,
        Math.atan2(player.y - npc.y, player.x - npc.x),
        id === 'pain-rain' ? 1200 : undefined,
      );
    }
  }

  // ── Character rig ────────────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the liquid-hand avatar for whichever fighters are
   * water. The player faces the cursor; the NPC faces whoever it is fighting.
   */
  /**
   * That side's rig: the skin's if one is equipped, water's living water otherwise. Built
   * lazily in `updateAvatars` and torn down in `reset`, so changing skin between matches
   * swaps the character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new WaterAvatar(scene, col);
  }

  private updateAvatars(time: number, delta: number, isPlayerWater: boolean, isNpcWater: boolean): void {
    const { player, npc } = this.arena;

    if (isPlayerWater && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      const aimX = this.lastMouseX || player.x + 1;
      const aimY = this.lastMouseY || player.y;
      const aim = Math.atan2(aimY - player.y, aimX - player.x);
      this.playerAvatar.setFacing(aim);
      // Slipstream and a live geyser both visibly swell the rig, so the buff is readable
      // from the character alone without hunting for the aura underneath it.
      this.playerAvatar.setIntensity(this.slipstreamActive || this.playerInGeyser ? 1.35 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Hold priority: a charging dagger beats a Siphon cone beats a running Splash.
      if (this.daggerCharging) this.playerAvatar.setHold('charge');
      else if (time < this.siphonActiveUntil) this.playerAvatar.setHold('draw', aim);
      else if (time < this.splashActiveUntil) this.playerAvatar.setHold('spray', aim);
      else this.playerAvatar.setHold(null);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcWater && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(aim);
      this.npcAvatar.setIntensity(this.npcWasInGeyser ? 1.35 : 1);
      if (time < this.npcSiphonActiveUntil) this.npcAvatar.setHold('draw', aim);
      else if (time < this.npcSplashActiveUntil) this.npcAvatar.setHold('spray', aim);
      else this.npcAvatar.setHold(null);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Every live water shot drags a shrinking tail of droplets out of its back end. */
  private updateProjectileTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const key = proj.texture?.key;
      const dagger = key === 'proj-pressure-dagger';
      if (key !== 'proj-water' && !dagger) continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.spray(proj.x, proj.y, dagger ? 3 : 2, {
        angle: back, spread: dagger ? 0.3 : 0.5,
        speed: dagger ? 55 : 40, size: dagger ? 2.4 : 2.8,
        life: 280, fall: 14, depth: 4,
      });
    }
  }

  // ── Living water surfaces ────────────────────────────────────────────────

  /** Track a puddle this kit created so its Graphics gets repainted every frame. */
  private trackPool(p: WaterPuddleLike, g: Phaser.GameObjects.Graphics, owner: 'player' | 'npc'): void {
    this.paintedPools.push({ p, g, seed: Math.random() * 10, owner });
  }

  /**
   * Repaints every puddle this kit owns as a live pool. ArenaScene owns the puddle lifecycle
   * and destroys the Graphics on expiry, so a dead Graphics is the signal to stop tracking.
   */
  private updatePools(): void {
    for (let i = this.paintedPools.length - 1; i >= 0; i--) {
      const pool = this.paintedPools[i];
      if (!pool.g.active) { this.paintedPools.splice(i, 1); continue; }
      const tint = pool.owner === 'player' ? this.pcol : this.ncol;
      // Shallow puddles fade out over their last 400ms rather than blinking away.
      const left = pool.p.expiresAt - this.lastTime;
      const alpha = left < 400 ? Math.max(0, left / 400) : 1;
      pool.g.clear();
      WaterFx.drawPool(pool.g, tint, pool.p.x, pool.p.y, pool.p.radius, this.worldT, alpha, pool.seed);
    }
  }

  /**
   * The Great Drought: five enemies wrung out to 100% dehydration at the same time, which
   * unlocks the Coral skin. Self-gating to Invasion — a duel only ever has the one opponent —
   * and dehydration never decays, so this is about spreading Siphon and white shots across a
   * whole wave instead of drying out one husk at a time.
   */
  private checkGreatDrought(): void {
    if (this.droughtUnlocked) return;
    let parched = 0;
    for (const [fighter, pct] of this.dehydration) {
      if (pct >= 100 && fighter.active && fighter.hp > 0) parched++;
    }
    if (parched < DROUGHT_TARGETS) return;
    this.droughtUnlocked = true;
    this.arena.unlockAchievement('great-drought');
  }

  // ── Sulphur (divine perk) ────────────────────────────────────────────────

  /** True while that side is playing water with Sulphur equipped. */
  private hasSulphur(owner: 'player' | 'npc'): boolean {
    const isWater = owner === 'player' ? this.arena.isPlayerWater() : this.arena.isNpcWater();
    return isWater && this.arena.hasPerk(owner, 'sulphur');
  }

  /** Pressure held by a geyser right now, 0–100. Zero for anything that isn't building any. */
  private pressureOf(g: Geyser): number {
    return (this.sulphurPressure.get(g) as number) ?? 0;
  }

  /**
   * Capped geysers build sulphurous pressure while they stand. Run for both sides every frame
   * so an online opponent's springs charge on our sim too — the eruption is read off this.
   */
  private tickSulphurPressure(_time: number, delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as const) {
      if (!this.hasSulphur(owner)) continue;
      for (const g of this.arena.geysers) {
        if (g.owner !== owner) continue;
        this.sulphurPressure.set(g,
          Math.min(SULPHUR_PRESSURE_MAX, this.pressureOf(g) + SULPHUR_PRESSURE_PER_SEC * dt));
      }
    }
  }

  /**
   * The eruption: everything the spring had been holding goes into whoever stepped on it, as a
   * speed boost worth its stored pressure for 8s. The geyser is spent — this is the whole
   * trade, a slow-charging launch pad you have to build in advance and can only cash once.
   */
  private eruptSulphur(time: number, g: Geyser, owner: 'player' | 'npc'): void {
    const pressure = Math.round(this.pressureOf(g));
    const f = owner === 'player' ? this.arena.player : this.arena.npc;
    const fx = owner === 'player' ? this.pfx : this.nfx;

    this.sulphurBoost[owner] = { until: time + SULPHUR_BOOST_MS, mult: 1 + pressure / 100 };
    this.sulphurPressure.delete(g);
    this.arena.removeGeyser(g);

    // The blowout: a tall crown out of the vent, spray flung wide, and a ring off the rim.
    fx.crown(g.x, g.y, g.radius * 1.5, 16, 5);
    fx.spray(g.x, g.y, 20, { speed: 320, size: 3.4, life: 620, fall: -40, depth: 6 });
    this.arena.scene.cameras.main.shake(200, 0.006);
    this.arena.showFloatingText(f.x, f.y - 40, `💛 SULPHUR +${pressure}%`,
      pressure >= 80 ? '#ffee44' : '#ddcc66');
  }

  /**
   * Repaints every geyser as a spring: a churning pool with a fountain standing in it. The
   * fountain's height tracks the geyser's remaining charges, so "this one is nearly spent"
   * is legible from across the arena instead of only from a shrunken sprite.
   */
  private updateGeyserArt(): void {
    const boiling = this.arena.isPlayerWater() && this.arena.hasUpgrade('r');
    for (const gey of this.arena.geysers) {
      const g = gey.sprite as Phaser.GameObjects.Graphics;
      if (typeof g.clear !== 'function' || !g.active) continue;
      const tint = gey.owner === 'player' ? this.pcol : this.ncol;
      const hot = boiling && gey.owner === 'player';
      const charges = (this.geyserCharges.get(gey) as number) ?? 2;
      // Sulphur: the spring is capped and loading. Its jets grow with the pressure instead of
      // shrinking with its charges, so "this one is nearly ready" is the thing you can see.
      const sulphur = this.hasSulphur(gey.owner);
      const pressure = sulphur ? this.pressureOf(gey) / SULPHUR_PRESSURE_MAX : 0;
      g.clear();

      WaterFx.drawPool(g, tint, gey.x, gey.y, gey.radius, this.worldT * 1.6, 0.9, gey.x * 0.01);

      if (sulphur) {
        // A brimstone crust over the pool, brightening as it loads, and a bubble ring on top.
        g.fillStyle(0xccaa33, 0.2 + 0.35 * pressure);
        g.fillCircle(gey.x, gey.y, gey.radius * 0.86);
        g.lineStyle(2 + 2 * pressure, 0xffee44, 0.35 + 0.5 * pressure);
        g.strokeCircle(gey.x, gey.y, gey.radius * (0.92 + Math.sin(this.worldT * 4) * 0.03));
        const bubbles = 3 + Math.round(pressure * 6);
        for (let i = 0; i < bubbles; i++) {
          const a = this.worldT * 1.4 + (i / bubbles) * Math.PI * 2;
          const rr = gey.radius * (0.25 + 0.5 * ((this.worldT * 0.5 + i / bubbles) % 1));
          g.fillStyle(0xffff99, 0.5 * (1 - rr / gey.radius));
          g.fillCircle(gey.x + Math.cos(a) * rr, gey.y + Math.sin(a) * rr * 0.6,
            1.6 + 1.8 * pressure);
        }
      }

      // Fountain: four jets rising out of the middle, swaying out of phase. Height tracks the
      // remaining charges, so a spent spring is visibly guttering before it disappears.
      const power = sulphur ? 0.35 + 0.95 * pressure : charges >= 2 ? 1 : 0.6;
      for (let i = 0; i < 4; i++) {
        const p = this.worldT * 3.2 + i * 1.6;
        const ox = (i - 1.5) * gey.radius * 0.3;
        const h = gey.radius * (1.35 + Math.sin(p) * 0.35) * power;
        waterRibbonLayered(
          g, tint, gey.x + ox, gey.y + gey.radius * 0.2,
          -Math.PI / 2, h, gey.radius * 0.19 * power, Math.sin(p * 0.8) * 9, 1,
        );
      }
      // Boiling geysers steam and glow pale rather than just ticking damage invisibly.
      if (hot) {
        g.fillStyle(tint(WATER.pale), 0.18 + Math.sin(this.worldT * 5) * 0.06);
        g.fillCircle(gey.x, gey.y, gey.radius * 0.8);
        g.lineStyle(2, tint(WATER.white), 0.5);
        g.strokeCircle(gey.x, gey.y, gey.radius * (0.9 + Math.sin(this.worldT * 3) * 0.04));
      }
    }
  }

  /** Slipstream: a surge of water dragged along with the player while they run on their own water. */
  private updateSlipstreamSurf(delta: number): void {
    const { player, scene } = this.arena;
    if (this.slipstreamActive) {
      // Depth 2 keeps it beneath the geyser surge, so the two stack into one silhouette.
      if (!this.slipstreamSurf) this.slipstreamSurf = new WaterSurf(scene, this.pcol, 38, 0.8, 2, 9);
      this.slipstreamSurf.update(delta, player.x, player.y, player.alpha);
    } else if (this.slipstreamSurf) {
      this.slipstreamSurf.destroy();
      this.slipstreamSurf = null;
    }

    if (this.playerInGeyser) {
      if (!this.geyserSurf) this.geyserSurf = new WaterSurf(scene, this.pcol, 46, 1.15, 3, 11);
      this.geyserSurf.update(delta, player.x, player.y, player.alpha);
    } else if (this.geyserSurf) {
      this.geyserSurf.destroy();
      this.geyserSurf = null;
    }
  }

  // ── Splash (E) ───────────────────────────────────────────────────────────

  /**
   * Splash rains water down at the cursor for 2s, dropping a fresh pool every 150ms. With the
   * Tidal Pool upgrade the last drop of the sequence lands far bigger and sticks for 5s.
   */
  private updatePlayerSplash(time: number, delta: number): void {
    if (time >= this.splashActiveUntil) return;
    this.splashDropAccum += delta;
    if (this.splashDropAccum < 150) return;
    this.splashDropAccum -= 150;
    this.splashDropCount++;

    const { scene, player } = this.arena;
    const mx = this.lastMouseX, my = this.lastMouseY;
    const isFinal = this.arena.hasUpgrade('e') && (time + 150 >= this.splashActiveUntil);

    if (this.arena.hasPerk('player', 'stalagmite')) {
      this.spawnStalagmite(time, mx, my, isFinal, 'player');
      return;
    }

    const radius = isFinal ? 54 : 36;
    const duration = isFinal ? 5000 : 1000;
    const g = scene.add.graphics().setDepth(2);
    const p: WaterPuddleLike = {
      sprite: g, expiresAt: time + duration,
      x: mx, y: my, radius, tickAccum: 0, owner: 'player', kind: 'puddle',
    };
    this.arena.puddles.push(p);
    this.trackPool(p, g, 'player');

    // The water arrives from above — a crown thrown up out of the impact, not a disc fading in.
    this.pfx.crown(mx, my, radius * (isFinal ? 1.15 : 0.85), isFinal ? 14 : 9, 3);
    this.pfx.spray(mx, my, isFinal ? 14 : 6, {
      speed: isFinal ? 180 : 110, size: isFinal ? 3.4 : 2.6,
      life: 460, fall: radius, depth: 5,
    });
    if (isFinal) {
      this.pfx.ring(mx, my, 12, radius * 1.9, WATER.pale, 460, 5, 4);
      this.pfx.mist(mx, my, 3, radius * 0.8, 3);
      this.arena.showFloatingText(mx, my - 26, '🌊 TIDAL POOL', '#bbeeff');
      this.arena.scene.cameras.main.shake(110, 0.003);
    }
    // A wet ribbon connecting caster to cursor sells that the player threw the water there.
    this.pfx.waterJet(player.x, player.y, Math.atan2(my - player.y, mx - player.x),
      Math.min(150, Phaser.Math.Distance.Between(player.x, player.y, mx, my)), 4);
  }

  private updateNpcSplash(time: number, delta: number): void {
    if (time >= this.npcSplashActiveUntil) return;
    this.npcSplashDropAccum += delta;
    if (this.npcSplashDropAccum < 150) return;
    this.npcSplashDropAccum -= 150;

    const { scene, player, npc } = this.arena;
    const miss = this.arena.npcAimOffsetDeg * 2.2; // ~0 on Nightmare, ~110 on Easy
    const sx = player.x + Phaser.Math.Between(-miss, miss);
    const sy = player.y + Phaser.Math.Between(-miss, miss);

    const g = scene.add.graphics().setDepth(2);
    const p: WaterPuddleLike = {
      sprite: g, expiresAt: time + 1000,
      x: sx, y: sy, radius: 36, tickAccum: 0, owner: 'npc', kind: 'puddle',
    };
    this.arena.puddles.push(p);
    this.trackPool(p, g, 'npc');

    this.nfx.crown(sx, sy, 31, 9, 3);
    this.nfx.spray(sx, sy, 6, { speed: 110, size: 2.6, life: 460, fall: 36, depth: 5 });
    this.nfx.waterJet(npc.x, npc.y, Math.atan2(sy - npc.y, sx - npc.x),
      Math.min(150, Phaser.Math.Distance.Between(npc.x, npc.y, sx, sy)), 4);
  }

  /** Stalagmite perk: Splash drops spikes instead of pools, the last one molten. */
  private spawnStalagmite(time: number, x: number, y: number, isLava: boolean, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const radius = isLava ? 54 : 36;
    const color = isLava ? 0xff6600 : this.pcol(WATER.cyan);
    const g = scene.add.graphics().setDepth(3);
    // Wet base first so the spike looks driven up through standing water.
    g.fillStyle(isLava ? 0x662200 : this.pcol(WATER.deep), 0.45);
    g.fillEllipse(x, y + radius * 0.3, radius * 1.5, radius * 0.5);
    g.fillStyle(color, isLava ? 0.85 : 0.8);
    g.fillTriangle(x, y - radius * 0.9, x - radius * 0.45, y + radius * 0.4, x + radius * 0.45, y + radius * 0.4);
    g.fillStyle(isLava ? 0xffcc44 : this.pcol(WATER.foam), 0.9);
    g.fillTriangle(x - radius * 0.06, y - radius * 0.8, x - radius * 0.2, y + radius * 0.2, x + radius * 0.08, y + radius * 0.2);

    this.arena.puddles.push({
      sprite: g, expiresAt: time + (isLava ? 8000 : 3000),
      x, y, radius, tickAccum: 0, owner, kind: 'stalagmite', lavaFinal: isLava,
    });

    // One-time AOE hit on spawn
    const impact = isLava ? 7 : 4;
    for (const enemy of this.arena.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius * 0.8) {
        enemy.takeDamage(impact);
        this.arena.spawnHitFlash(enemy.x, enemy.y, color);
      }
    }
    this.pfx.crown(x, y, radius * 0.8, 8, 3);
    this.arena.showFloatingText(x, y - 20, isLava ? '🌋 STALAGMITE' : '⛰️ STALAGMITE', isLava ? '#ff6600' : '#55ddff');
  }

  // ── Pain Rain (Q) ────────────────────────────────────────────────────────

  /** Ground marker a falling Pain Rain drop leaves while it is still in the air. */
  createRainMarker(x: number, y: number, radius: number, owner: 'player' | 'npc'): Phaser.GameObjects.Graphics {
    const g = this.arena.scene.add.graphics().setDepth(7);
    WaterFx.drawRainMarker(g, owner === 'player' ? this.pcol : this.ncol, x, y, radius);
    return g;
  }

  /** A single Pain Rain drop landing. Deliberately one cheap animation — 200 of these fire. */
  rainImpact(x: number, y: number, radius: number, owner: 'player' | 'npc'): void {
    (owner === 'player' ? this.pfx : this.nfx).dropImpact(x, y, radius);
  }

  /** Squall Splashes (Q+): a drop that lands hard enough to leave a 5s tidal pool behind. */
  spawnSquallPool(x: number, y: number): void {
    const g = this.arena.scene.add.graphics().setDepth(2);
    const p: WaterPuddleLike = {
      sprite: g, expiresAt: this.arena.scene.time.now + 5000,
      x, y, radius: 54, tickAccum: 0, owner: 'player', kind: 'puddle',
    };
    this.arena.puddles.push(p);
    this.trackPool(p, g, 'player');
    this.pfx.crown(x, y, 58, 12, 3);
    this.pfx.ring(x, y, 10, 92, WATER.foam, 420, 4, 4);
  }

  // ── Pressure Dagger visuals ──────────────────────────────────────────────

  /**
   * The blade taking shape while F is held: water dragged in from around the caster and
   * compressed into a lance that lengthens and darkens with each pressure tier.
   */
  private updateDaggerCharge(time: number): void {
    const { player, scene } = this.arena;
    if (!this.daggerCharging) {
      if (this.daggerGfx) { this.daggerGfx.destroy(); this.daggerGfx = null; }
      return;
    }
    if (!this.daggerGfx) this.daggerGfx = scene.add.graphics().setDepth(7);
    const g = this.daggerGfx;
    g.clear();

    const held = time - this.daggerChargeStart;
    const ratio = Math.min(1, held / 2000);
    const level = held >= 2000 ? 2 : held >= 1000 ? 1 : 0;
    const aim = Math.atan2(this.lastMouseY - player.y, this.lastMouseX - player.x);
    const hx = player.x + Math.cos(aim) * 26;
    const hy = player.y + Math.sin(aim) * 26;

    // Water still being hauled in from the caster's flanks.
    for (let i = 0; i < 5; i++) {
      const a = aim + Math.PI + (i - 2) * 0.5 + Math.sin(this.worldT * 3 + i) * 0.15;
      const d = 42 - ratio * 16;
      g.fillStyle(this.pcol(WATER.cyan), 0.55);
      waterRibbon(g, player.x + Math.cos(a) * d, player.y + Math.sin(a) * d, aim, d * 0.55, 2.4);
    }

    // The lance itself — longer and denser as the pressure climbs.
    const bladeLen = 22 + ratio * 26 + level * 8;
    const bladeW = 5 + ratio * 3.5;
    g.fillStyle(this.pcol(level === 2 ? WATER.abyss : WATER.deep), 0.9);
    waterRibbon(g, hx, hy, aim, bladeLen, bladeW);
    g.fillStyle(this.pcol(level >= 1 ? WATER.bright : WATER.blue), 0.9);
    waterRibbon(g, hx, hy, aim, bladeLen * 0.88, bladeW * 0.6);
    g.fillStyle(this.pcol(WATER.white), 0.75 + Math.sin(this.worldT * 14) * 0.2);
    waterRibbon(g, hx + Math.cos(aim) * bladeLen * 0.3, hy + Math.sin(aim) * bladeLen * 0.3, aim, bladeLen * 0.4, bladeW * 0.24);

    // Pressure collar clamping down on the blade's root at max charge.
    if (level === 2) {
      g.lineStyle(2.5, this.pcol(WATER.white), 0.55 + Math.sin(this.worldT * 16) * 0.3);
      g.strokeCircle(hx, hy, 11 + Math.sin(this.worldT * 16) * 1.6);
    }
  }

  // ── Laminar Laceration split (F+) ────────────────────────────────────────

  private updateSplit(time: number): void {
    const { npc, scene } = this.arena;
    if (!this.splitState) return;
    if (time >= this.splitState.until || npc.hp <= 0) {
      this.clearSplit(npc.hp > 0 && npc.active);
      return;
    }

    if (!this.splitGfx) this.splitGfx = scene.add.graphics().setDepth(6);
    const g = this.splitGfx;
    g.clear();
    const s = this.splitState;
    // The two halves wobble out of phase and trail a thin filament between them, so the
    // target reads as one body pulled apart rather than as two unrelated blobs.
    for (const [i, pt] of [[0, { x: s.x1, y: s.y1 }], [1, { x: s.x2, y: s.y2 }]] as [number, { x: number; y: number }][]) {
      const wob = Math.sin(this.worldT * 5 + i * 2.1);
      const r = 18 + wob * 2.2;
      g.fillStyle(this.pcol(WATER.deep), 0.65);
      g.fillCircle(pt.x, pt.y, r * 1.08);
      g.fillStyle(this.pcol(WATER.ocean), 0.9);
      g.fillCircle(pt.x, pt.y, r);
      g.fillStyle(this.pcol(WATER.bright), 0.7);
      g.fillCircle(pt.x - r * 0.2, pt.y - r * 0.25, r * 0.5);
      g.fillStyle(this.pcol(WATER.white), 0.85);
      g.fillCircle(pt.x - r * 0.35, pt.y - r * 0.4, r * 0.18);
      g.lineStyle(2, this.pcol(WATER.foam), 0.6);
      g.strokeCircle(pt.x, pt.y, r * 1.02);
    }
    const midY = (s.y1 + s.y2) / 2 + Math.sin(this.worldT * 4) * 3;
    g.lineStyle(3, this.pcol(WATER.cyan), 0.5);
    g.beginPath();
    g.moveTo(s.x1, s.y1);
    g.lineTo((s.x1 + s.x2) / 2, midY);
    g.lineTo(s.x2, s.y2);
    g.strokePath();

    // Player shots passing through either half hit for 1.5×.
    const { lastHitAt } = s;
    for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
      if (!go.active || !go.isFromPlayer) continue;
      for (const pt of [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]) {
        if (Phaser.Math.Distance.Between(go.x, go.y, pt.x, pt.y) > 26) continue;
        const last = lastHitAt.get(go) ?? 0;
        if (time - last < 50) continue;
        lastHitAt.set(go, time);
        const dmg = Math.round(go.damage * 1.5 * this.computeOutgoingMultiplier(npc, 'player'));
        npc.takeDamage(dmg);
        this.pfx.splash(pt.x, pt.y, 40, { drops: 8, mist: 0, wet: false, duration: 260, depth: 7 });
        go.setActive(false).setVisible(false);
        (go.body as Phaser.Physics.Arcade.Body).stop();
        this.noteDamageDealtByPlayer(dmg);
      }
    }
  }

  // Called from applyProjectileToNpc when proj-pressure-dagger (player-fired) hits NPC
  onDaggerHitNpc(proj: Projectile, target: Fighter): void {
    const hitSet = this.daggerHitSets.get(proj);
    if (!hitSet || hitSet.has(target)) return;
    hitSet.add(target);

    const baseDmg = ((proj as any).baseDmg as number) ?? proj.damage;
    const totalDmg = Math.round(baseDmg * this.computeOutgoingMultiplier(target, 'player'));
    target.takeDamage(totalDmg, { pierce: true });
    const level = this.daggerLevels.get(proj) ?? 0;

    // A pierce throws water out the far side, so the fan points along the shot's travel.
    const body = proj.body as Phaser.Physics.Arcade.Body | null;
    const through = body ? Math.atan2(body.velocity.y, body.velocity.x) : 0;
    this.pfx.spray(target.x, target.y, 8 + level * 5, {
      angle: through, spread: 0.7, speed: 190 + level * 70,
      size: 2.8 + level * 0.5, life: 460, fall: 60, depth: 8,
    });
    this.pfx.ring(target.x, target.y, 6, 38 + level * 14, WATER.white, 300, 4, 8);
    this.arena.showFloatingText(target.x, target.y - 30, '💧 PIERCE!', '#88ccff');
    this.noteDamageDealtByPlayer(totalDmg);

    if (this.arena.hasUpgrade('f') && level === 2 && !this.splitState && target === this.arena.npc) {
      this.startSplit(target, this.lastTime);
    }
    // Projectile is NOT deactivated — kit's update() handles out-of-bounds cleanup
  }

  // Called from water-cut hit path in applyProjectileToNpc
  onWaterCutHit(target: Fighter, _attacker: 'player' | 'npc'): void {
    // Every cut lands wet, upgraded or not — the dehydration stack is the upgrade's bit.
    this.pfx.splash(target.x, target.y, 34, { drops: 7, mist: 0, wet: false, duration: 240, depth: 8 });
    if (!this.arena.hasUpgrade('click')) return;
    this.applyDehydration(target, 2);
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

  /** 0–1 fill for the Splash HUD card: full while the 2s downpour is running. */
  isSplashActive(time: number): boolean {
    return time < this.splashActiveUntil;
  }

  replenishGeyserCharges(): void {
    for (const g of this.arena.geysers) {
      if (g.owner !== 'player') continue;
      const charges = (this.geyserCharges.get(g) as number) ?? 2;
      if (charges >= 2) continue;
      const newCharges = charges + 1;
      this.geyserCharges.set(g, newCharges);
      if (newCharges === 2) {
        g.radius = Math.round(g.radius / 0.65);
        this.pfx.waterSpout(g.x, g.y, g.radius * 0.32, g.radius * 1.6, 5);
      }
      this.arena.showFloatingText(g.x, g.y - 20, '+1 CHARGE', '#aaffff');
    }
  }

  isNpcSplit(): boolean {
    return this.splitState !== null;
  }

  // ── Water Mastery ─────────────────────────────────────────────────────────

  /**
   * Every water contribution to the local player's speed: Slipstream's 25% while standing in
   * your own water, and a live Sulphur eruption. Pulled by ArenaScene before movement resolves.
   */
  getPlayerSpeedMult(): number {
    let m = this.slipstreamActive ? SLIPSTREAM_SPEED_MULT : 1;
    const boost = this.sulphurBoost.player;
    if (this.arena.scene.time.now < boost.until) m *= boost.mult;
    return m;
  }

  /** The npc's side of the same, so an eruption reads on their sim too. Sulphur only. */
  getNpcSpeedMult(): number {
    const boost = this.sulphurBoost.npc;
    return this.arena.scene.time.now < boost.until ? boost.mult : 1;
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

  private tryCastSiphon(time: number, aim: number): void {
    if (time - this.siphonLastCastAt < SIPHON_COOLDOWN_MS) return;
    const { player } = this.arena;
    this.siphonLastCastAt = time;
    this.siphonActiveUntil = time + SIPHON_DURATION_MS;
    this.siphonSeen.clear();
    this.playerAvatar?.setHold('draw', aim);
    // Opening pull: a gulp of water yanked back into the caster's hands.
    this.pfx.channelVortex(player.x, player.y, 96, 520, () => (player.active ? { x: player.x, y: player.y } : null), 5);
    this.arena.showFloatingText(player.x, player.y - 28, '🌊 Siphon!', '#66ddff');
    this.arena.broadcastMasteryCast('siphon');
  }

  /** Online replay: the remote water player cast Siphon — open an npc cone that dehydrates us. */
  doNpcSiphon(_tx: number, _ty: number): void {
    const { npc } = this.arena;
    this.npcSiphonActiveUntil = this.arena.scene.time.now + SIPHON_DURATION_MS;
    this.npcSiphonSeen.clear();
    this.nfx.channelVortex(npc.x, npc.y, 96, 520, () => (npc.active ? { x: npc.x, y: npc.y } : null), 5);
  }

  private updateDehydrationBars(): void {
    for (const [fighter, bar] of this.dehydrationBars) {
      if (!fighter.active) { bar.destroy(); this.dehydrationBars.delete(fighter); continue; }
      this.paintDehydrationBar(fighter, bar, this.dehydration.get(fighter) ?? 0);
    }
  }

  /**
   * Siphon: a cone anchored to the caster that follows their aim for 3s. It deals no damage —
   * everything inside just dries out, feeding the dehydration damage bonus on the rest of the
   * kit. Drawn as suction: streams run *inward* along the cone toward the caster's hands.
   */
  private tickSiphon(time: number, delta: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const activeUntil = owner === 'player' ? this.siphonActiveUntil : this.npcSiphonActiveUntil;
    const seen = owner === 'player' ? this.siphonSeen : this.npcSiphonSeen;
    // 'npc' cones dehydrate the local player; 'player' cones dehydrate our enemies.
    const targets = owner === 'player' ? this.arena.enemies : [player];
    const tint = owner === 'player' ? this.pcol : this.ncol;

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
    gfx.fillStyle(tint(WATER.deep), 0.2);
    gfx.slice(origin.x, origin.y, SIPHON_RANGE, angle - SIPHON_HALF_ANGLE, angle + SIPHON_HALF_ANGLE, false);
    gfx.fillPath();
    gfx.lineStyle(2, tint(WATER.cyan), 0.6);
    gfx.beginPath();
    gfx.arc(origin.x, origin.y, SIPHON_RANGE, angle - SIPHON_HALF_ANGLE, angle + SIPHON_HALF_ANGLE, false);
    gfx.strokePath();

    // Nine streams running the length of the cone back toward the caster. Each restarts at
    // the rim on its own phase, so the cone reads as continuously drinking.
    for (let i = 0; i < 9; i++) {
      const lane = (i / 8 - 0.5) * 2 * SIPHON_HALF_ANGLE * 0.92;
      const phase = (this.worldT * 1.6 + i * 0.31) % 1;
      const d = SIPHON_RANGE * (1 - phase);
      const a = angle + lane;
      const fade = 0.85 * Math.min(1, phase * 3) * (0.35 + phase * 0.65);
      gfx.fillStyle(tint(WATER.sky), fade);
      // Head points back at the caster: the ribbon's fat end leads the direction of travel.
      waterRibbon(gfx, origin.x + Math.cos(a) * (d + 34), origin.y + Math.sin(a) * (d + 34), a + Math.PI, 34, 3.4 - phase * 1.4);
    }
    // Intake bloom at the caster's chest where all of it arrives.
    gfx.fillStyle(tint(WATER.foam), 0.45 + Math.sin(this.worldT * 12) * 0.15);
    gfx.fillCircle(origin.x, origin.y, 11 + Math.sin(this.worldT * 12) * 2);

    const gain = SIPHON_DEHYDRATION_PER_SEC * (delta / 1000);
    this.siphonPullAccum += delta;
    const pull = this.siphonPullAccum >= 110;
    if (pull) this.siphonPullAccum = 0;

    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(origin.x, origin.y, t.x, t.y) > SIPHON_RANGE) continue;
      // Shortest signed angle between the cone's axis and the target keeps the wrap at ±π honest.
      const toTarget = Math.atan2(t.y - origin.y, t.x - origin.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toTarget - angle)) > SIPHON_HALF_ANGLE) continue;

      this.applyDehydration(t, gain);
      // Continuous tell on the victim: water visibly leaving them, not just a number ticking.
      if (pull) {
        (owner === 'player' ? this.pfx : this.nfx).spray(t.x, t.y, 2, {
          angle: toTarget + Math.PI, spread: 0.35, speed: 150,
          size: 2.2, life: 320, fall: -10, depth: 7,
        });
      }
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
      this.pfx.ring(player.x, player.y, 8, 52, WATER.foam, 340, 4, 4);
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
    if (pct <= 0) {
      const bar = this.dehydrationBars.get(target);
      if (bar) { bar.destroy(); this.dehydrationBars.delete(target); }
      return;
    }
    let bar = this.dehydrationBars.get(target);
    if (!bar) {
      bar = this.arena.scene.add.graphics().setDepth(20);
      this.dehydrationBars.set(target, bar);
    }
    this.paintDehydrationBar(target, bar, pct);
  }

  /**
   * The dehydration meter: a tube that *drains* rather than a bar that grows, because the
   * stat it shows is water being taken out of the target.
   */
  private paintDehydrationBar(target: Fighter, bar: Phaser.GameObjects.Graphics, pct: number): void {
    const w = 44, h = 5;
    const x = target.x - w / 2, y = target.y - 50;
    bar.clear();
    if (pct <= 0) return;
    bar.fillStyle(this.pcol(WATER.abyss), 0.55);
    bar.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 3);
    // Remaining water sits on the left, sloshing as it drains away.
    const wet = w * (1 - pct / 100);
    if (wet > 1) {
      bar.fillStyle(this.pcol(WATER.bright), 0.9);
      bar.fillRoundedRect(x, y, wet, h, 2);
      bar.fillStyle(this.pcol(WATER.foam), 0.9);
      bar.fillCircle(x + wet, y + h / 2 + Math.sin(this.worldT * 6) * 1, h * 0.5);
    }
    bar.lineStyle(1, this.pcol(WATER.sky), 0.7);
    bar.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 3);
  }

  private consumeGeyserCharge(g: Geyser): void {
    const charges = ((this.geyserCharges.get(g) as number) ?? 2) - 1;
    this.geyserCharges.set(g, charges);

    if (charges === 1) {
      g.radius = Math.round(g.radius * 0.65);
      this.arena.showFloatingText(g.x, g.y - 20, 'WEAK', '#55ccaa');
      this.pfx.mist(g.x, g.y, 3, g.radius, 3);
    } else if (charges <= 0) {
      // Last gasp: the spring coughs up what it has left and drains away.
      this.pfx.waterSpout(g.x, g.y, g.radius * 0.4, g.radius * 1.4, 5);
      this.pfx.wetPatch(g.x, g.y, g.radius);
      this.arena.removeGeyser(g);
      this.arena.showFloatingText(g.x, g.y - 20, 'DEPLETED', '#55aaaa');
    }
  }

  private tickBoilingGeysers(time: number, delta: number, geysers: Geyser[], enemies: Fighter[]): void {
    const playerGeysers = geysers.filter((g) => g.owner === 'player');
    if (playerGeysers.length === 0) return;

    // Steam boiling off, so a scalding geyser reads as hazardous before it ever hits anyone.
    this.boilSteamAccum += delta;
    const steam = this.boilSteamAccum >= 260;
    if (steam) this.boilSteamAccum = 0;

    for (const g of playerGeysers) {
      if (steam) this.pfx.mist(g.x, g.y, 2, g.radius * 0.7, 4);

      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > g.radius) continue;
        if (time - (this.boilLastHitAt.get(t) ?? -Infinity) < 1000) continue;

        this.boilLastHitAt.set(t, time);
        // The damage number is spawned by the target's own 'damaged' listener —
        // adding one here rendered a second number and read as a double tick.
        t.takeDamage(10, { source: g, sourceX: g.x, sourceY: g.y });
        this.pfx.spray(t.x, t.y, 5, { speed: 90, size: 2.4, life: 420, fall: -20, depth: 7 });
        this.pfx.mist(t.x, t.y, 2, 20, 7);
        this.arena.showFloatingText(t.x, t.y - 44, '♨️ SCALDED!', '#ffddaa');
        this.noteDamageDealtByPlayer(10);
      }
    }
  }

  private startSplit(npc: Fighter, time: number): void {
    npc.setVisible(false);
    (npc.body as Phaser.Physics.Arcade.Body).enable = false;

    this.splitState = {
      x1: npc.x - 24, y1: npc.y,
      x2: npc.x + 24, y2: npc.y,
      until: time + 2000,
      lastHitAt: new Map(),
    };
    // The moment of the cut: the body bursts and reforms as two.
    this.pfx.splash(npc.x, npc.y, 78, { drops: 16, mist: 2, duration: 420, depth: 7 });
    this.pfx.ring(npc.x, npc.y, 10, 92, WATER.white, 420, 5, 8);
    this.arena.scene.cameras.main.shake(150, 0.005);
    this.arena.showFloatingText(npc.x, npc.y - 36, '💧 SPLIT!', '#88ccff');
    this.arena.recordMasteryStat('daggerSplits', 1);
  }

  private clearSplit(restoreNpc: boolean): void {
    if (!this.splitState) return;
    const { x1, y1, x2, y2 } = this.splitState;
    this.splitState = null;
    if (this.splitGfx) { this.splitGfx.destroy(); this.splitGfx = null; }

    if (restoreNpc) {
      const npc = this.arena.npc;
      npc.setVisible(true);
      (npc.body as Phaser.Physics.Arcade.Body).enable = true;
      // Both halves pour back together at the middle.
      this.pfx.spray(x1, y1, 6, { angle: Math.atan2(npc.y - y1, npc.x - x1), spread: 0.5, speed: 130, size: 2.6, life: 320, fall: 20, depth: 7 });
      this.pfx.spray(x2, y2, 6, { angle: Math.atan2(npc.y - y2, npc.x - x2), spread: 0.5, speed: 130, size: 2.6, life: 320, fall: 20, depth: 7 });
      this.pfx.crown(npc.x, npc.y, 54, 10, 7);
      this.arena.showFloatingText(npc.x, npc.y - 36, '💧 MERGED', '#88ccff');
    }
  }
}
