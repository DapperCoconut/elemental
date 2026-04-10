import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NpcOpponent, NpcAiState, DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import { Projectile } from '../combat/Projectile';
import { CastContext } from '../elements/Ability';
import { Element } from '../elements/Element';
import { HealthBar } from '../combat/HealthBar';
import { fireElement } from '../elements/fire';
import { waterElement } from '../elements/water';
import { lifeElement } from '../elements/life';
import { airElement, fireHitscan, fireBounceHitscan } from '../elements/air';
import { earthElement } from '../elements/earth';
import * as PlayerData from '../data/PlayerData';
import { getTotalRewardMult } from '../data/Mutations';

interface AbilityBarEntry {
  fill: Phaser.GameObjects.Rectangle;
  abilityId: string;
  maxWidth: number;
}

interface Puddle {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface Geyser {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

interface PainRainShadow {
  sprite: Phaser.GameObjects.Arc;
  fireAt: number;
  x: number;
  y: number;
  fired: boolean;
  owner: 'player' | 'npc';
  damage: number;
  hitRadius: number;
  color: number;
}

interface Plant {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  healthBar: HealthBar;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  owner: 'player' | 'npc';
  type: 'normal' | 'life' | 'thorn';
  accum: number; // timer accumulator for life/thorn plant special effects
}

const ELEMENT_MAP: Record<string, Element> = {
  fire: fireElement,
  water: waterElement,
  life: lifeElement,
  air: airElement,
  earth: earthElement,
};

const ELEMENT_TEXTURES: Record<string, string> = {
  fire: 'elem-fire',
  water: 'elem-water',
  life: 'elem-life',
  air: 'elem-air',
  earth: 'elem-earth',
};

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private npc!: NpcOpponent;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private playerElement!: Element;
  private npcElement!: Element;
  private elementId = 'fire';
  private npcDifficulty!: DifficultyConfig;

  // Input keys
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private fKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Shared state — reset in create()
  private abilityBars: AbilityBarEntry[] = [];
  private dodgeOnCooldown = false;
  private isDodging = false;
  private gameEnded = false;
  private playerSpeedMult = 1;

  // Player fire-specific state
  private flameBodyActive = false;
  private flameBodyTickAccum = 0;
  private flameBodyAura: Phaser.GameObjects.Arc | null = null;
  private flamethrowerHoldMs = 0;
  private flamethrowerTickAccum = 0;
  private pointerWasDown = false;
  private nukeChanneling = false;
  private nukeChannelEnd = 0;

  // Player water-specific state
  private splashActiveUntil = 0;
  private splashDropAccum = 0;
  private splashDropCount = 0;         // E upgrade: tracks puddle index in splash sequence
  private painRainHolding = false;     // Q upgrade: hold-to-channel monsoon
  private painRainHoldAccum = 0;       // Q upgrade: accumulator for hold drops
  private playerGeyserBuffUntil = 0;
  private shieldAura: Phaser.GameObjects.Arc | null = null;

  // Player life-specific state
  private playerPlants: Plant[] = [];
  private thornDragActiveUntil = 0;
  private thornDragTickAccum = 0;
  private thornDragAura: Phaser.GameObjects.Arc | null = null;
  // Life upgrade charge tracking
  private lifeRPrevDown = false;
  private lifeRHolding = false;
  private lifeRHoldStart = 0;
  private lifeRChargeVisual: Phaser.GameObjects.Arc | null = null;
  private lifeFPrevDown = false;
  private lifeFHolding = false;
  private lifeFHoldStart = 0;
  private lifeFChargeVisual: Phaser.GameObjects.Arc | null = null;
  private lifeQPrevDown = false;
  private lifeQHolding = false;
  private lifeQHoldStart = 0;
  private lifeQChargeVisual: Phaser.GameObjects.Arc | null = null;

  // Player air-specific state
  private grappleDodgeCharges = 0;
  private grappleDodgeAura: Phaser.GameObjects.Arc | null = null;
  private quickShotCharged = false;
  private airConsecutiveHits = 0;
  private playerWindTrapX = 0;
  private playerWindTrapY = 0;
  private playerWindTrapExpiry = 0;
  private playerWindTrapSprite: Phaser.GameObjects.Arc | null = null;
  // Air upgrade state
  private airElectroHolding = false;
  private airElectroHeldSince = 0;
  private airElectroCharged = false;
  private airElectroChargeVisual: Phaser.GameObjects.Arc | null = null;
  private isGrappling = false;
  private airBeamWalking = false;

  // NPC mirror state
  private npcSpeedMult = 1;
  private npcFlameBodyActive = false;
  private npcFlameBodyTickAccum = 0;
  private npcFlameBodyAura: Phaser.GameObjects.Arc | null = null;
  private npcNukeChanneling = false;
  private npcNukeChannelEnd = 0;
  private npcSplashActiveUntil = 0;
  private npcSplashDropAccum = 0;
  private npcGeyserBuffUntil = 0;
  private npcShieldAura: Phaser.GameObjects.Arc | null = null;
  private npcPlants: Plant[] = [];
  private npcThornDragActiveUntil = 0;
  private npcThornDragTickAccum = 0;
  private npcThornDragAura: Phaser.GameObjects.Arc | null = null;
  private npcQuickShotCharged = false;
  private npcAirConsecutiveHits = 0;
  private npcWindTrapX = 0;
  private npcWindTrapY = 0;
  private npcWindTrapExpiry = 0;
  private npcWindTrapSprite: Phaser.GameObjects.Arc | null = null;

  // Player earth-specific state
  private earthShieldAura: Phaser.GameObjects.Arc | null = null;
  private earthShieldLabel: Phaser.GameObjects.Text | null = null;
  private npcEarthShieldLabel: Phaser.GameObjects.Text | null = null;
  private earthSlamActive = false;
  private earthSlamEnd = 0;
  private earthSlamBouncing = false;
  private earthSlamBounceEnd = 0;
  private earthSlamHitDealt = false;
  private earthSlamLastWallHit = 0;
  // Bull Rush
  private earthBullRushActive = false;
  private earthBullRushEnd = 0;
  private earthBullRushSpeed = 0;
  private earthBullRushLastHit = 0;
  private earthBullRushWallHitLast = 0;
  private earthBullRushDrApplied = false;
  private earthBullRushAura: Phaser.GameObjects.Arc | null = null;
  // Shield Shed (F upgrade)
  private earthShieldShedHolding = false;
  private earthShieldShedStart = 0;
  private earthShieldShedActive = false;
  private earthShieldShedEnd = 0;
  private earthShieldShedBonus = 0;
  private earthShieldShedAura: Phaser.GameObjects.Arc | null = null;

  // Mutations
  private mutations: Set<string> = new Set();
  // Rebirth
  private npcRebirthUsed = false;
  private npcRebirthGlow: Phaser.GameObjects.Arc | null = null;
  // Clone
  private clone: NpcOpponent | null = null;
  private cloneProjectiles: Phaser.Physics.Arcade.Group | null = null;
  private cloneDefeated = false;
  private cloneSpeedMult = 1;
  private cloneNukeChanneling = false;
  private cloneNukeChannelEnd = 0;
  private cloneFlameBodyActive = false;
  private cloneFlameBodyTickAccum = 0;
  private cloneFlameBodyAura: Phaser.GameObjects.Arc | null = null;
  private cloneSplashActiveUntil = 0;
  private cloneSplashDropAccum = 0;
  private cloneGeyserBuffUntil = 0;
  private cloneThornDragActiveUntil = 0;
  private cloneThornDragTickAccum = 0;
  private cloneThornDragAura: Phaser.GameObjects.Arc | null = null;
  private cloneQuickShotCharged = false;
  private cloneAirConsecutiveHits = 0;
  private cloneWindTrapX = 0;
  private cloneWindTrapY = 0;
  private cloneWindTrapExpiry = 0;
  private cloneWindTrapSprite: Phaser.GameObjects.Arc | null = null;
  private cloneEarthSlamActive = false;
  private cloneEarthSlamEnd = 0;
  private cloneEarthSlamHitDealt = false;

  // NPC earth-specific state
  private npcEarthShieldAura: Phaser.GameObjects.Arc | null = null;
  private npcEarthSlamActive = false;
  private npcEarthSlamEnd = 0;
  private npcEarthSlamBouncing = false;
  private npcEarthSlamBounceEnd = 0;
  private npcEarthSlamHitDealt = false;
  private npcEarthSlamLastWallHit = 0;
  private npcBullRushActive = false;
  private npcBullRushEnd = 0;
  private npcBullRushSpeed = 0;
  private npcBullRushLastHit = 0;
  private npcBullRushDrApplied = false;
  private npcBullRushAura: Phaser.GameObjects.Arc | null = null;

  // Player upgrade state
  private activeUpgrades: string[] = [];
  // Flameshredder (Click upgrade) — NPC burns from player fireballs
  private npcBurningUntil = 0;
  private npcBurnTickAccum = 0;
  private npcBurnAura: Phaser.GameObjects.Arc | null = null;
  // Mastered Flameshredder — player burns from NPC fireballs
  private playerBurningUntil = 0;
  private playerBurnTickAccum = 0;
  private playerBurnAura: Phaser.GameObjects.Arc | null = null;
  // Pressure Charge (R upgrade)
  private pressureCharging = false;
  private pressureChargeStart = 0;
  private pressureChargeVisual: Phaser.GameObjects.Arc | null = null;
  private pressureTremorAccum = 0;
  private pressureLastMouseX = 0;
  private pressureLastMouseY = 0;
  // Flame Affinity (F upgrade)
  private enhancedFlameBody = false;
  private fKeyHeldSince = 0;
  private fKeyWasDown = false;
  // Armageddon (Q upgrade)
  private armageddonActive = false;
  private armageddonChargeVisual: Phaser.GameObjects.Arc | null = null;

  // Shared world effects (owner-aware)
  private puddles: Puddle[] = [];
  private geysers: Geyser[] = [];
  private painRainShadows: PainRainShadow[] = [];

  constructor() {
    super({ key: 'ArenaScene' });
  }

  create(data: { elementId: string; enemyElementId?: string; difficulty?: number; mutations?: string[] }): void {
    this.elementId = data.elementId ?? 'fire';
    const enemyElementId = data.enemyElementId ?? (this.elementId === 'fire' ? 'water' : 'fire');
    const difficultyLevel = Math.max(1, Math.min(5, data.difficulty ?? 3));
    const difficultyConfig = DIFFICULTY_PRESETS[difficultyLevel - 1];
    this.npcDifficulty = difficultyConfig;

    this.playerElement = ELEMENT_MAP[this.elementId] ?? fireElement;
    this.npcElement    = ELEMENT_MAP[enemyElementId] ?? waterElement;

    // Reset all mutable state
    this.gameEnded = false;
    this.dodgeOnCooldown = false;
    this.isDodging = false;
    this.abilityBars = [];
    this.playerSpeedMult = 1;

    this.flameBodyActive = false;
    this.flameBodyTickAccum = 0;
    this.flameBodyAura = null;
    this.flamethrowerHoldMs = 0;
    this.flamethrowerTickAccum = 0;
    this.pointerWasDown = false;
    this.nukeChanneling = false;
    this.nukeChannelEnd = 0;

    this.splashActiveUntil = 0;
    this.splashDropAccum = 0;
    this.splashDropCount = 0;
    this.painRainHolding = false;
    this.painRainHoldAccum = 0;
    this.playerGeyserBuffUntil = 0;
    this.shieldAura = null;

    this.npcSpeedMult = 1;
    this.npcFlameBodyActive = false;
    this.npcFlameBodyTickAccum = 0;
    this.npcFlameBodyAura = null;
    this.npcNukeChanneling = false;
    this.npcNukeChannelEnd = 0;
    this.npcSplashActiveUntil = 0;
    this.npcSplashDropAccum = 0;
    this.npcGeyserBuffUntil = 0;
    this.npcShieldAura = null;
    this.npcPlants = [];
    this.npcThornDragActiveUntil = 0;
    this.npcThornDragTickAccum = 0;
    this.npcThornDragAura = null;
    this.npcQuickShotCharged = false;
    this.npcAirConsecutiveHits = 0;
    this.npcWindTrapX = 0;
    this.npcWindTrapY = 0;
    this.npcWindTrapExpiry = 0;
    this.npcWindTrapSprite = null;

    this.playerPlants = [];
    this.thornDragActiveUntil = 0;
    this.thornDragTickAccum = 0;
    this.thornDragAura = null;
    this.lifeRPrevDown = false;
    this.lifeRHolding = false;
    this.lifeRHoldStart = 0;
    this.lifeRChargeVisual = null;
    this.lifeFPrevDown = false;
    this.lifeFHolding = false;
    this.lifeFHoldStart = 0;
    this.lifeFChargeVisual = null;
    this.lifeQPrevDown = false;
    this.lifeQHolding = false;
    this.lifeQHoldStart = 0;
    this.lifeQChargeVisual = null;
    this.grappleDodgeCharges = 0;
    this.grappleDodgeAura = null;
    this.quickShotCharged = false;
    this.airConsecutiveHits = 0;
    this.playerWindTrapX = 0;
    this.playerWindTrapY = 0;
    this.playerWindTrapExpiry = 0;
    this.playerWindTrapSprite = null;
    this.airElectroHolding = false;
    this.airElectroHeldSince = 0;
    this.airElectroCharged = false;
    this.airElectroChargeVisual = null;
    this.isGrappling = false;
    this.airBeamWalking = false;

    this.earthShieldAura = null;
    this.earthShieldLabel = null;
    this.npcEarthShieldLabel = null;
    this.earthSlamActive = false;
    this.earthSlamEnd = 0;
    this.earthSlamBouncing = false;
    this.earthSlamBounceEnd = 0;
    this.earthSlamHitDealt = false;
    this.earthSlamLastWallHit = 0;
    this.earthBullRushActive = false;
    this.earthBullRushEnd = 0;
    this.earthBullRushSpeed = 0;
    this.earthBullRushLastHit = 0;
    this.earthBullRushWallHitLast = 0;
    this.earthBullRushDrApplied = false;
    this.earthBullRushAura = null;
    this.earthShieldShedHolding = false;
    this.earthShieldShedStart = 0;
    this.earthShieldShedActive = false;
    this.earthShieldShedEnd = 0;
    this.earthShieldShedBonus = 0;
    this.earthShieldShedAura = null;

    this.npcEarthShieldAura = null;
    this.npcEarthSlamActive = false;
    this.npcEarthSlamEnd = 0;
    this.npcEarthSlamBouncing = false;
    this.npcEarthSlamBounceEnd = 0;
    this.npcEarthSlamHitDealt = false;
    this.npcEarthSlamLastWallHit = 0;
    this.npcBullRushActive = false;
    this.npcBullRushEnd = 0;
    this.npcBullRushSpeed = 0;
    this.npcBullRushLastHit = 0;
    this.npcBullRushDrApplied = false;
    this.npcBullRushAura = null;

    this.activeUpgrades = PlayerData.getActiveUpgrades(this.elementId);
    this.npcBurningUntil = 0;
    this.npcBurnTickAccum = 0;
    this.npcBurnAura = null;
    this.playerBurningUntil = 0;
    this.playerBurnTickAccum = 0;
    this.playerBurnAura = null;
    this.pressureCharging = false;
    this.pressureChargeStart = 0;
    this.pressureChargeVisual = null;
    this.pressureTremorAccum = 0;
    this.pressureLastMouseX = 0;
    this.pressureLastMouseY = 0;
    this.enhancedFlameBody = false;
    this.fKeyHeldSince = 0;
    this.fKeyWasDown = false;
    this.armageddonActive = false;
    this.armageddonChargeVisual = null;

    this.mutations = new Set();
    this.npcRebirthUsed = false;
    this.npcRebirthGlow = null;
    this.clone = null;
    this.cloneProjectiles = null;
    this.cloneDefeated = false;
    this.cloneSpeedMult = 1;
    this.cloneNukeChanneling = false;
    this.cloneNukeChannelEnd = 0;
    this.cloneFlameBodyActive = false;
    this.cloneFlameBodyTickAccum = 0;
    this.cloneFlameBodyAura = null;
    this.cloneSplashActiveUntil = 0;
    this.cloneSplashDropAccum = 0;
    this.cloneGeyserBuffUntil = 0;
    this.cloneThornDragActiveUntil = 0;
    this.cloneThornDragTickAccum = 0;
    this.cloneThornDragAura = null;
    this.cloneQuickShotCharged = false;
    this.cloneAirConsecutiveHits = 0;
    this.cloneWindTrapX = 0;
    this.cloneWindTrapY = 0;
    this.cloneWindTrapExpiry = 0;
    this.cloneWindTrapSprite = null;
    this.cloneEarthSlamActive = false;
    this.cloneEarthSlamEnd = 0;
    this.cloneEarthSlamHitDealt = false;

    this.puddles = [];
    this.geysers = [];
    this.painRainShadows = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const pad = 32;

    // ── Background ────────────────────────────────────────────────
    this.add.rectangle(cx, cy, W, H, 0x0d0d1a);
    this.add.rectangle(cx, cy, W - pad * 2, H - pad * 2, 0x181828);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x202038, 1);
    for (let x = pad; x < W - pad; x += 80) grid.lineBetween(x, pad, x, H - pad);
    for (let y = pad; y < H - pad; y += 80) grid.lineBetween(pad, y, W - pad, y);

    const border = this.add.graphics();
    border.lineStyle(3, 0x3a3a5a, 1);
    border.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // ── Physics ───────────────────────────────────────────────────
    this.physics.world.setBounds(pad, pad, W - pad * 2, H - pad * 2);
    this.projectiles = this.physics.add.group();

    // ── Fighters — texture driven by element choice ────────────────
    const playerTexture = ELEMENT_TEXTURES[this.elementId] ?? 'elem-fire';
    const npcTexture    = ELEMENT_TEXTURES[enemyElementId]  ?? 'elem-water';
    this.player = new Player(this, 180, cy, this.playerElement, playerTexture);
    this.npc = new NpcOpponent(this, W - 180, cy, this.npcElement, npcTexture, difficultyConfig);

    // ── Apply mutations ──────────────────────────────────────────────
    this.mutations = new Set(data.mutations ?? []);
    if (this.mutations.has('healthy')) {
      const bonus = Math.round(this.npc.maxHp * 0.5);
      this.npc.maxHp += bonus; this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('swift')) { this.npc.speed *= 2; }
    if (this.mutations.has('deadly')) { this.player.incomingDamageMultiplier = 1.5; }
    if (this.mutations.has('mini')) {
      this.npc.setScale(0.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
      this.npc.speed *= 2;
      this.npc.maxHp = Math.round(this.npc.maxHp * 0.75);
      this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('giant')) {
      this.npc.setScale(1.5);
      (this.npc.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
      this.npc.speed = Math.round(this.npc.speed * 0.7);
      const giantBonus = Math.round(this.npc.maxHp * 1.25);
      this.npc.maxHp += giantBonus; this.npc.hp = this.npc.maxHp;
    }
    if (this.mutations.has('mastered')) { this.npc.isMastered = true; }

    if (this.mutations.has('clone')) {
      this.cloneProjectiles = this.physics.add.group();
      this.clone = new NpcOpponent(this, cx, cy / 2, this.npcElement, npcTexture, difficultyConfig);
      if (this.mutations.has('healthy')) {
        const b = Math.round(this.clone.maxHp * 0.5);
        this.clone.maxHp += b; this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('swift')) { this.clone.speed *= 2; }
      if (this.mutations.has('mini')) {
        this.clone.setScale(0.5);
        (this.clone.body as Phaser.Physics.Arcade.Body).setCircle(11, 13, 13);
        this.clone.speed *= 2;
        this.clone.maxHp = Math.round(this.clone.maxHp * 0.75);
        this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('giant')) {
        this.clone.setScale(1.5);
        (this.clone.body as Phaser.Physics.Arcade.Body).setCircle(33, -9, -9);
        this.clone.speed = Math.round(this.clone.speed * 0.7);
        const gb = Math.round(this.clone.maxHp * 1.25);
        this.clone.maxHp += gb; this.clone.hp = this.clone.maxHp;
      }
      if (this.mutations.has('mastered')) { this.clone.isMastered = true; }
      this.add.text(cx, cy / 2 - 38, `CLONE ${this.npcElement.emoji}`, {
        fontSize: '12px', color: '#888888',
      }).setOrigin(0.5).setDepth(20);
    }

    // ── Overlap callbacks ─────────────────────────────────────────
    this.physics.add.overlap(
      this.projectiles,
      this.npc,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        if (!proj.active || !proj.isFromPlayer) return;
        this.npc.takeDamage(proj.damage);
        this.spawnHitFlash(proj.x, proj.y, 0xff6600);
        // Flameshredder: fireball hit also applies burning DOT
        if (proj.texture.key === 'proj-fire' && this.hasUpgrade('click')) {
          this.npcBurningUntil = Math.max(this.npcBurningUntil, this.time.now + 3000);
        }
        // Knockback: water-cut hit pushes NPC in projectile travel direction
        if (proj.texture.key === 'proj-water' && this.hasUpgrade('click')) {
          const projBody = proj.body as Phaser.Physics.Arcade.Body;
          const vx = projBody.velocity.x;
          const vy = projBody.velocity.y;
          const len = Math.sqrt(vx * vx + vy * vy) || 1;
          const nb = this.npc.body as Phaser.Physics.Arcade.Body;
          nb.setVelocity(nb.velocity.x + (vx / len) * 180, nb.velocity.y + (vy / len) * 180);
        }
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
      },
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.projectiles,
      this.player,
      (a, b) => {
        const proj = (a instanceof Projectile ? a : b) as Projectile;
        if (!proj.active || proj.isFromPlayer) return;
        // F upgrade: 50% dodge while mid-grapple
        if (this.isGrappling && this.hasUpgrade('f') && Math.random() < 0.5) {
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        // Grapple dodge (player only) — 50% per charge, up to 2 charges
        const grappleDodge = this.grappleDodgeCharges > 0 && Math.random() < 0.50;
        if (grappleDodge) {
          this.grappleDodgeCharges--;
          if (this.grappleDodgeCharges === 0 && this.grappleDodgeAura) {
            this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = null;
          }
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -1); // DODGED
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          return;
        }
        this.player.takeDamage(proj.damage);
        this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
        // Mastered Flameshredder: NPC fireballs apply burning DOT to player
        if (proj.texture.key === 'proj-fire' && this.npc.isMastered) {
          this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
        }
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
      },
      undefined,
      this,
    );

    // ── Clone overlaps ────────────────────────────────────────────
    if (this.clone && this.cloneProjectiles) {
      // Clone projectiles hit player
      this.physics.add.overlap(
        this.cloneProjectiles,
        this.player,
        (a, b) => {
          const proj = (a instanceof Projectile ? a : b) as Projectile;
          if (!proj.active) return;
          this.player.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0x00aaff);
          if (proj.texture.key === 'proj-fire' && this.clone?.isMastered) {
            this.playerBurningUntil = Math.max(this.playerBurningUntil, this.time.now + 3000);
          }
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        },
        undefined, this,
      );
      // Player projectiles hit clone (NPC projectiles excluded via isFromPlayer check)
      this.physics.add.overlap(
        this.projectiles,
        this.clone,
        (a, b) => {
          const proj = (a instanceof Projectile ? a : b) as Projectile;
          if (!proj.active || !proj.isFromPlayer) return;
          this.clone!.takeDamage(proj.damage);
          this.spawnHitFlash(proj.x, proj.y, 0xff6600);
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        },
        undefined, this,
      );
    }

    // ── Defeat + damage events ────────────────────────────────────
    this.player.once('defeated', () => this.endGame(false));

    const registerNpcDefeat = () => {
      this.npc.once('defeated', () => {
        if (this.mutations.has('rebirth') && !this.npcRebirthUsed) {
          this.npcRebirthUsed = true;
          this.npc.isInvincible = true;
          const flash = this.add.circle(this.npc.x, this.npc.y, 50, 0x00ffff, 0.8).setDepth(15);
          this.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
          this.time.delayedCall(400, () => {
            if (!this.npc.active) return;
            this.npc.hp = Math.round(this.npc.maxHp * 0.5);
            this.npc.speed *= 1.2;
            this.player.incomingDamageMultiplier *= 1.2;
            this.npc.isInvincible = false;
            if (this.npcRebirthGlow) this.npcRebirthGlow.destroy();
            this.npcRebirthGlow = this.add.circle(this.npc.x, this.npc.y, 36, 0x00ffff, 0.15).setDepth(4);
            this.npcRebirthGlow.setStrokeStyle(3, 0x00ffff, 0.9);
            this.tweens.add({ targets: this.npcRebirthGlow, alpha: 0.45, yoyo: true, repeat: -1, duration: 400 });
            registerNpcDefeat();
          });
        } else {
          this.endGame(true);
        }
      });
    };
    registerNpcDefeat();

    if (this.clone) {
      this.clone.once('defeated', () => {
        this.cloneDefeated = true;
        const lbl = this.add.text(cx, cy - 40, 'CLONE DEFEATED', {
          fontSize: '26px', fontFamily: '"Arial Black", sans-serif',
          color: '#ffaa00', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: lbl, alpha: 0, y: cy - 80, delay: 500, duration: 1000, onComplete: () => lbl.destroy() });
        if (this.clone) { this.clone.setActive(false).setVisible(false); }
        this.clone = null;
      });
    }

    this.player.on('damaged', (n: number) => {
      if (n === 0 && this.elementId === 'water' && this.hasUpgrade('f')) {
        const dmg = this.player.lastIncomingDamage;
        if (dmg > 0) {
          this.npc.takeDamage(dmg);
          this.spawnDamageNumber(this.player.x, this.player.y - 34, -2); // REFLECTED
          return;
        }
      }
      this.spawnDamageNumber(this.player.x, this.player.y - 34, n);
    });
    this.npc.on('damaged', (n: number) =>
      this.spawnDamageNumber(this.npc.x, this.npc.y - 34, n),
    );

    // ── Input ──────────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    this.wKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.qKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.eKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.rKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.fKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── HUD ────────────────────────────────────────────────────────
    this.createHUD(W, H);

    // ── Arena labels ───────────────────────────────────────────────
    this.add.text(180, 20, `${this.playerElement.emoji} YOU`, {
      fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(20);
    this.add.text(W - 180, 20, `ENEMY ${this.npcElement.emoji}`, {
      fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(20);
  }

  // ── HUD ─────────────────────────────────────────────────────────

  private createHUD(W: number, H: number): void {
    const hudY = H - 30;
    const cardW = 130;
    const cardH = 48;
    const abilities = this.playerElement.abilities;

    this.add.rectangle(W / 2, hudY, W, cardH + 4, 0x0a0a18, 0.95).setDepth(20);

    const totalWidth = abilities.length * cardW;
    const startX = W / 2 - totalWidth / 2 + cardW / 2;

    const fillColors: Record<string, number> = {
      'fireball':       0xff6600,
      'flame-dash':     0xff3300,
      'pressure-bomb':  0xff8800,
      'flame-body':     0xff9900,
      'flame-nuke':     0xcc2200,
      'water-cut':      0x0099ff,
      'splash':         0x00aadd,
      'geyser':         0x00ffcc,
      'water-shield':   0x4488ff,
      'pain-rain':      0x0033aa,
      'petal-shotgun':  0x66dd44,
      'plant':          0x22aa22,
      'grow':           0x44ff88,
      'thorns':         0xcc2222,
      'thorn-drag':     0x116611,
      'air-snipe':      0xccddff,
      'quick-shot':     0x88ddff,
      'wind-trap':      0x44aacc,
      'grapple':        0x6699cc,
      'charged-beam':   0x2255aa,
      'stab':           0xaa8844,
      'shield-up':      0x997744,
      'shield-slam':    0xbb9955,
      'shield-break':   0xcc8833,
      'bull-rush':      0xcc4400,
    };

    abilities.forEach((ab, i) => {
      const x = startX + i * cardW;

      this.add
        .rectangle(x, hudY, cardW - 4, cardH - 4, 0x1a1a30)
        .setStrokeStyle(1, 0x333355)
        .setDepth(21);

      const fill = this.add
        .rectangle(x - (cardW - 4) / 2, hudY, 0, cardH - 4, fillColors[ab.id] ?? 0x4466aa, 0.45)
        .setOrigin(0, 0.5)
        .setDepth(22);

      this.add.text(x, hudY - 6, `[${ab.displayKey}] ${ab.name}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#dddddd',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.add.text(x, hudY + 8, ab.description, {
        fontSize: '9px',
        color: '#000000',
        wordWrap: { width: cardW - 12 },
        maxLines: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(23);

      this.abilityBars.push({ fill, abilityId: ab.id, maxWidth: cardW - 4 });
    });

    this.add.text(W - 50, hudY, '[SPC]\nDodge', {
      fontSize: '11px',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5).setDepth(23);
  }

  // ── Context builders ────────────────────────────────────────────

  private buildPlayerContext(targetX: number, targetY: number): CastContext {
    return {
      scene: this,
      casterX: this.player.x,
      casterY: this.player.y,
      targetX,
      targetY,
      isPlayerCaster: true,
      projectiles: this.projectiles,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.npc.x, this.npc.y) <= radius) {
          this.npc.takeDamage(damage);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
        }
      },
      dashCaster: (vx, vy) => {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
        this.isDodging = true;
        this.player.isInvincible = true;
        this.time.delayedCall(280, () => {
          if (this.player.active) {
            this.player.isInvincible = false;
            this.isDodging = false;
          }
        });
      },
      healCaster: (amount) => this.player.heal(amount),
      damageCaster: (amount) => this.player.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.playerSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.nukeChanneling = true;
        this.nukeChannelEnd = this.time.now + durationMs;
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { this.player.shieldCharges += 1; },
      spawnPuddle: (_x, _y) => { /* drops managed by ArenaScene per splashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'player'),
      spawnPainRain: () => {
        if (this.hasUpgrade('q')) {
          this.createPainRain('player', 500, 150, 2400); // 5× drops, 3× duration
        } else {
          this.createPainRain('player');
        }
      },
      spawnPlant: (x, y) => this.createPlant(x, y, 'player'),
      growPlants: () => {
        for (const p of this.playerPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.playerPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius) {
            this.npc.takeDamage(20);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* state set in player input handler */ },
      activateQuickShot: () => { this.quickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.playerWindTrapX = x;
        this.playerWindTrapY = y;
        this.playerWindTrapExpiry = this.time.now + 5000;
        if (this.playerWindTrapSprite) this.playerWindTrapSprite.destroy();
        this.playerWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.playerWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.playerWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.isDodging = true;
        if (this.hasUpgrade('f')) {
          this.isGrappling = true;
          this.player.setAlpha(0.5);
        }
        this.time.delayedCall(travelTime, () => {
          if (this.player.active) {
            this.isDodging = false;
            this.isGrappling = false;
            this.player.setAlpha(1);
            body.setVelocity(0, 0);
            this.grappleDodgeCharges = 2;
            if (this.grappleDodgeAura) this.grappleDodgeAura.destroy();
            this.grappleDodgeAura = this.add.circle(this.player.x, this.player.y, 26, 0x6699cc, 0.35).setDepth(6);
            this.tweens.add({ targets: this.grappleDodgeAura, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
          }
        });
        const trail = this.add.circle(this.player.x, this.player.y, 8, 0xaaddff, 0.5);
        this.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
        else { this.airConsecutiveHits = 0; }
      },
      quickShotActive: this.quickShotCharged,
      addShieldHp: (amount) => { this.player.shieldHp = Math.min(100, this.player.shieldHp + amount); },
      getShieldHp: () => this.player.shieldHp,
      setShieldHp: (amount) => { this.player.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        let dx = (this.dKey.isDown ? 1 : 0) - (this.aKey.isDown ? 1 : 0);
        let dy = (this.sKey.isDown ? 1 : 0) - (this.wKey.isDown ? 1 : 0);
        if (dx === 0 && dy === 0) {
          const pointer = this.input.activePointer;
          const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
          dx = Math.cos(ang); dy = Math.sin(ang);
        } else {
          const len = Math.sqrt(dx * dx + dy * dy); dx /= len; dy /= len;
        }
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(dx * 600, dy * 600);
        this.earthSlamActive = true;
        this.earthSlamEnd = this.time.now + 400;
        this.earthSlamHitDealt = false;
        this.isDodging = true;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (dist > range) return;
        const pointer = this.input.activePointer;
        const dirX = pointer.worldX - this.player.x;
        const dirY = pointer.worldY - this.player.y;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const toNpcX = this.npc.x - this.player.x;
        const toNpcY = this.npc.y - this.player.y;
        const dot = (dirX / dirLen) * (toNpcX / dist) + (dirY / dirLen) * (toNpcY / dist);
        if (dot > 0.4) {
          this.npc.takeDamage(damage);
          this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
          if (knockback > 0) {
            const nb = this.npc.body as Phaser.Physics.Arcade.Body;
            nb.setVelocity((toNpcX / dist) * knockback, (toNpcY / dist) * knockback);
          }
        }
      },
      startBullRush: () => {
        this.earthBullRushActive = true;
        this.earthBullRushEnd = this.time.now + 6000;
        this.earthBullRushSpeed = 100;
        this.earthBullRushLastHit = 0;
        this.earthBullRushDrApplied = false;
        this.isDodging = true;
        this.player.incomingDamageMultiplier *= 0.8;
        this.earthBullRushDrApplied = true;
        if (this.earthBullRushAura) this.earthBullRushAura.destroy();
        this.earthBullRushAura = this.add.circle(this.player.x, this.player.y, 36, 0xcc4400, 0.4).setDepth(6);
        this.tweens.add({ targets: this.earthBullRushAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 220 });
      },
    };
  }

  private buildNpcContext(targetX: number, targetY: number): CastContext {
    return {
      scene: this,
      casterX: this.npc.x,
      casterY: this.npc.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: this.projectiles,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(damage);
        }
      },
      dashCaster: (vx, vy) => {
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
      },
      healCaster: (amount) => this.npc.heal(amount),
      damageCaster: (amount) => this.npc.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.npcSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.npcNukeChanneling = true;
        this.npcNukeChannelEnd = this.time.now + durationMs;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { this.npc.shieldCharges += 1; },
      spawnPuddle: (_x, _y) => { /* managed via npcSplashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'npc'),
      spawnPainRain: () => this.npc.isMastered
        ? this.createPainRain('npc', 500, 150, 2400)
        : this.createPainRain('npc'),
      spawnPlant: (x, y) => this.createPlant(x, y, 'npc'),
      growPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius) {
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* state set in NPC cast reaction */ },
      activateQuickShot: () => { this.npcQuickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.npcWindTrapX = x;
        this.npcWindTrapY = y;
        this.npcWindTrapExpiry = this.time.now + 5000;
        if (this.npcWindTrapSprite) this.npcWindTrapSprite.destroy();
        this.npcWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.npcWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.npcWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - this.npc.x;
        const dy = y - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = this.npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(travelTime, () => {
          if (this.npc.active) body.setVelocity(0, 0);
        });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.npcAirConsecutiveHits = Math.min(this.npcAirConsecutiveHits + 1, 3); }
        else { this.npcAirConsecutiveHits = 0; }
      },
      quickShotActive: this.npcQuickShotCharged,
      addShieldHp: (amount) => { this.npc.shieldHp = Math.min(100, this.npc.shieldHp + amount); },
      getShieldHp: () => this.npc.shieldHp,
      setShieldHp: (amount) => { this.npc.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        const dx = this.player.x - this.npc.x;
        const dy = this.player.y - this.npc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 600, (dy / len) * 600);
        this.npcEarthSlamActive = true;
        this.npcEarthSlamEnd = this.time.now + 400;
        this.npcEarthSlamHitDealt = false;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
        if (dist > range) return;
        this.player.takeDamage(damage);
        this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
        if (knockback > 0) {
          const toPlayerX = this.player.x - this.npc.x;
          const toPlayerY = this.player.y - this.npc.y;
          const pb = this.player.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity((toPlayerX / dist) * knockback, (toPlayerY / dist) * knockback);
        }
      },
      startBullRush: () => {
        this.npcBullRushActive = true;
        this.npcBullRushEnd = this.time.now + 6000;
        this.npcBullRushSpeed = 100;
        this.npcBullRushLastHit = 0;
        this.npcBullRushDrApplied = false;
        this.npc.incomingDamageMultiplier *= 0.8;
        this.npcBullRushDrApplied = true;
        if (this.npcBullRushAura) this.npcBullRushAura.destroy();
        this.npcBullRushAura = this.add.circle(this.npc.x, this.npc.y, 36, 0xcc4400, 0.4).setDepth(6);
        this.tweens.add({ targets: this.npcBullRushAura, alpha: 0.15, yoyo: true, repeat: -1, duration: 220 });
      },
    };
  }

  // ── Clone context ────────────────────────────────────────────────

  private buildCloneContext(targetX: number, targetY: number): CastContext {
    const clone = this.clone!;
    return {
      scene: this,
      casterX: clone.x,
      casterY: clone.y,
      targetX,
      targetY,
      isPlayerCaster: false,
      projectiles: this.cloneProjectiles!,
      dealAoeDamage: (cx, cy, radius, damage) => {
        if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.y) <= radius) {
          this.player.takeDamage(damage);
        }
      },
      dashCaster: (vx, vy) => { (clone.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy); },
      healCaster: (amount) => clone.heal(amount),
      damageCaster: (amount) => clone.applySelfDamage(amount),
      setCasterSpeedMultiplier: (mult) => { this.cloneSpeedMult = mult; },
      lockCaster: (durationMs) => {
        this.cloneNukeChanneling = true;
        this.cloneNukeChannelEnd = this.time.now + durationMs;
        (clone.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      },
      addShieldCharge: () => { clone.shieldCharges += 1; },
      spawnPuddle: () => { /* managed via cloneSplashActiveUntil */ },
      spawnGeyser: (x, y) => this.createGeyser(x, y, 'npc'),
      spawnPainRain: () => clone.isMastered
        ? this.createPainRain('npc', 500, 150, 2400)
        : this.createPainRain('npc'),
      spawnPlant: (x, y) => this.createPlant(x, y, 'npc'),
      growPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0x44ff44, 0.6).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
      },
      thornPlants: () => {
        for (const p of this.npcPlants) {
          const ring = this.add.circle(p.x, p.y, 10, 0xcc2222, 0.75).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius) {
            this.player.takeDamage(20);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc2222);
          }
        }
      },
      startThornDrag: () => { /* managed via clone reaction */ },
      activateQuickShot: () => { this.cloneQuickShotCharged = true; },
      placeWindTrap: (x, y) => {
        this.cloneWindTrapX = x; this.cloneWindTrapY = y;
        this.cloneWindTrapExpiry = this.time.now + 5000;
        if (this.cloneWindTrapSprite) this.cloneWindTrapSprite.destroy();
        this.cloneWindTrapSprite = this.add.circle(x, y, 80, 0xaaddff, 0).setDepth(3);
        this.cloneWindTrapSprite.setStrokeStyle(3, 0xaaddff, 0.9);
        this.tweens.add({ targets: this.cloneWindTrapSprite, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 });
      },
      grappleTo: (x, y) => {
        const dx = x - clone.x;
        const dy = y - clone.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 1200;
        const travelTime = Math.min(350, (len / speed) * 1000);
        const body = clone.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * speed, (dy / len) * speed);
        this.time.delayedCall(travelTime, () => { if (clone.active) body.setVelocity(0, 0); });
      },
      reportAirSnipeResult: (hit) => {
        if (hit) { this.cloneAirConsecutiveHits = Math.min(this.cloneAirConsecutiveHits + 1, 3); }
        else { this.cloneAirConsecutiveHits = 0; }
      },
      quickShotActive: this.cloneQuickShotCharged,
      addShieldHp: (amount) => { clone.shieldHp = Math.min(100, clone.shieldHp + amount); },
      getShieldHp: () => clone.shieldHp,
      setShieldHp: (amount) => { clone.shieldHp = Math.max(0, amount); },
      slamCaster: () => {
        const dx = this.player.x - clone.x;
        const dy = this.player.y - clone.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (clone.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 600, (dy / len) * 600);
        this.cloneEarthSlamActive = true;
        this.cloneEarthSlamEnd = this.time.now + 400;
        this.cloneEarthSlamHitDealt = false;
      },
      dealMeleeDamage: (range, damage, knockback = 0) => {
        const dist = Phaser.Math.Distance.Between(clone.x, clone.y, this.player.x, this.player.y);
        if (dist > range) return;
        this.player.takeDamage(damage);
        this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
        if (knockback > 0) {
          const toPlayerX = this.player.x - clone.x;
          const toPlayerY = this.player.y - clone.y;
          const pb = this.player.body as Phaser.Physics.Arcade.Body;
          pb.setVelocity((toPlayerX / dist) * knockback, (toPlayerY / dist) * knockback);
        }
      },
      startBullRush: () => { /* clone does not use bull rush */ },
    };
  }

  // ── World effect helpers ─────────────────────────────────────────

  private createGeyser(x: number, y: number, owner: 'player' | 'npc'): void {
    // Permanent Geysers upgrade: cap at 2, remove oldest when placing a 3rd
    if (owner === 'player' && this.hasUpgrade('r')) {
      const mine = this.geysers.filter(g => g.owner === 'player');
      if (mine.length >= 2) {
        const oldest = mine[0];
        oldest.sprite.destroy();
        this.geysers.splice(this.geysers.indexOf(oldest), 1);
      }
    }
    const sprite = this.add.circle(x, y, 40, 0x00ccaa, 0.45).setDepth(2);
    this.tweens.add({
      targets: sprite,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.2,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });
    const expiresAt = (owner === 'player' && this.hasUpgrade('r')) ? Infinity : this.time.now + 5000;
    this.geysers.push({ sprite, expiresAt, x, y, radius: 40, owner });
  }

  private createPainRain(
    owner: 'player' | 'npc',
    count = 100,
    minDelay = 50,
    maxDelay = 800,
    damage = 5,
    color = 0x001155,
    shadowRadius = 14,
    hitRadius = 55,
  ): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = 50;
    for (let i = 0; i < count; i++) {
      const sx = Phaser.Math.Between(pad, W - pad);
      const sy = Phaser.Math.Between(pad, H - pad);
      const fireAt = this.time.now + Phaser.Math.Between(minDelay, maxDelay);
      const shadow = this.add.circle(sx, sy, shadowRadius, color, 0.6).setDepth(7);
      this.painRainShadows.push({ sprite: shadow, fireAt, x: sx, y: sy, fired: false, owner, damage, hitRadius, color });
    }
  }

  private createPlant(x: number, y: number, owner: 'player' | 'npc'): void {
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    // Cap at 5 normal plants per owner — remove oldest normal plant if over limit
    const normalCount = list.filter((p) => p.type === 'normal').length;
    if (normalCount >= 5) {
      const oldestNormalIdx = list.findIndex((p) => p.type === 'normal');
      if (oldestNormalIdx !== -1) {
        const oldest = list.splice(oldestNormalIdx, 1)[0];
        oldest.sprite.destroy(); oldest.label.destroy(); oldest.healthBar.destroy();
      }
    }
    // E upgrade: double HP and purple color for player plants
    const isUpgradedE = owner === 'player' && this.hasUpgrade('e');
    const maxHp = isUpgradedE ? 50 : 25;
    const fillColor = isUpgradedE ? 0x9922cc : 0x22aa22;
    const fillAlpha = isUpgradedE ? 0.6 : 0.55;
    const sprite = this.add.circle(x, y, 24, fillColor, fillAlpha).setDepth(2);
    const label = this.add.text(x, y, '🌱', { fontSize: '20px' }).setOrigin(0.5).setDepth(3);
    const healthBar = new HealthBar(this, maxHp);
    this.tweens.add({
      targets: sprite,
      scaleX: 1.08, scaleY: 1.08, alpha: 0.35,
      yoyo: true, repeat: -1, duration: 1200,
    });
    list.push({ sprite, label, healthBar, expiresAt: Infinity, x, y, radius: 120, hp: maxHp, maxHp, owner, type: 'normal', accum: 0 });
  }

  private convertToLifePlant(): void {
    if (this.playerPlants.some((p) => p.type === 'life')) return; // already one life plant
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.playerPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'life';
    closest.hp = 100;
    closest.maxHp = 100;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xaaffaa, 0.75);
    closest.label.setText('🌼');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 100);
    const bloom = this.add.circle(closest.x, closest.y, 12, 0xaaffaa, 0.9).setDepth(6);
    this.tweens.add({ targets: bloom, scaleX: 8, scaleY: 8, alpha: 0, duration: 600, onComplete: () => bloom.destroy() });
  }

  private convertToThornPlant(): void {
    if (this.playerPlants.filter((p) => p.type === 'thorn').length >= 2) return; // max 2 thorn plants
    let closest: Plant | null = null;
    let closestDist = Infinity;
    for (const p of this.playerPlants) {
      if (p.type !== 'normal') continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    if (!closest) return;
    closest.type = 'thorn';
    closest.hp = 50;
    closest.maxHp = 50;
    closest.accum = 0;
    closest.sprite.setFillStyle(0xff2222, 0.75);
    closest.label.setText('🌵');
    closest.healthBar.destroy();
    closest.healthBar = new HealthBar(this, 50);
    const burst = this.add.circle(closest.x, closest.y, 12, 0xff2222, 0.9).setDepth(6);
    this.tweens.add({ targets: burst, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
  }

  private triggerOvergrowth(): void {
    const plants = [...this.playerPlants];
    this.playerPlants = [];
    for (const p of plants) {
      const boom = this.add.circle(p.x, p.y, 12, 0x44ff44, 0.8).setDepth(6);
      this.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 450, onComplete: () => boom.destroy() });
      p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const speed = 480;
        const proj = new Projectile(this, p.x + Math.cos(angle) * 20, p.y + Math.sin(angle) * 20, 'proj-life', 8, true);
        this.projectiles.add(proj);
        proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }
  }

  // ── Game over ────────────────────────────────────────────────────

  private hasUpgrade(slot: string): boolean {
    return this.activeUpgrades.includes(slot);
  }

  private endGame(playerWon: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;

    this.cameras.main.flash(
      350,
      playerWon ? 255 : 0,
      playerWon ? 140 : 80,
      playerWon ? 0 : 255,
    );

    this.time.delayedCall(700, () => {
      this.scene.start('GameOverScene', {
        playerWon,
        difficulty: this.npcDifficulty.level,
        rewardMult: playerWon ? getTotalRewardMult() : undefined,
      });
    });
  }

  // ── Visual helpers ───────────────────────────────────────────────

  private spawnHitFlash(x: number, y: number, color: number): void {
    const flash = this.add.circle(x, y, 8, color, 0.9);
    this.tweens.add({
      targets: flash,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  /** amount=0 → BLOCKED, amount=-1 → DODGED, amount>0 → damage */
  private spawnDamageNumber(x: number, y: number, amount: number): void {
    const isBlocked = amount === 0;
    const isDodged = amount === -1;
    const isReflected = amount === -2;
    const label = isReflected ? 'REFLECTED' : isBlocked ? 'BLOCKED' : isDodged ? 'DODGED' : `-${amount}`;
    const color = isReflected ? '#ff66ff' : isBlocked ? '#66ddff' : isDodged ? '#aaeeff' : '#ffffff';
    const stroke = isReflected ? '#660066' : isBlocked ? '#003344' : isDodged ? '#002244' : '#880000';

    const txt = this.add.text(x, y, label, {
      fontSize: (isBlocked || isDodged || isReflected) ? '13px' : `${Math.min(20, 12 + Math.floor(amount / 10))}px`,
      fontFamily: '"Arial Black", sans-serif',
      color,
      stroke,
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  private spawnFlamethrowerCone(px: number, py: number, tx: number, ty: number): void {
    const angle = Phaser.Math.Angle.Between(px, py, tx, ty);
    const cone = this.add.triangle(
      px + Math.cos(angle) * 60,
      py + Math.sin(angle) * 60,
      0, -14,
      90, 0,
      0, 14,
      0xff5500, 0.55,
    );
    cone.setRotation(angle);
    cone.setDepth(4);
    this.tweens.add({
      targets: cone,
      alpha: 0,
      scaleX: 0.4,
      duration: 120,
      onComplete: () => cone.destroy(),
    });
  }

  // ── Update loop ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.gameEnded) return;

    const pointer = this.input.activePointer;
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;

    // ── Channel expiry ────────────────────────────────────────────
    if (this.nukeChanneling && time >= this.nukeChannelEnd) { this.nukeChanneling = false; this.player.chargeRatio = 0; }
    if (this.npcNukeChanneling && time >= this.npcNukeChannelEnd) this.npcNukeChanneling = false;

    // Standard nuke charge bar (non-Armageddon, non-air-beam-walk)
    if (this.nukeChanneling && !this.armageddonActive && !this.airBeamWalking) {
      const elapsed = time - (this.nukeChannelEnd - 2000);
      this.player.chargeRatio = Math.min(1, elapsed / 2000);
    }
    // Air Q upgrade charge bar while walking
    if (this.airBeamWalking) {
      this.player.chargeRatio = Math.min(1, (time - (this.nukeChannelEnd - 1500)) / 1500);
    }
    // Air E upgrade charge bar
    if (this.airElectroHolding) {
      this.player.chargeRatio = Math.min(1, (time - this.airElectroHeldSince) / 1500);
    } else if (this.airElectroCharged && !this.airBeamWalking && !this.nukeChanneling) {
      this.player.chargeRatio = 1;
    }

    // ── Flame Body ticks (player) ────────────────────────────────
    if (this.elementId === 'fire' && this.flameBodyActive) {
      this.flameBodyTickAccum += delta;
      if (this.flameBodyTickAccum >= 250) {
        this.flameBodyTickAccum -= 250;
        const fbDmg = this.enhancedFlameBody ? 4 : 2;
        this.player.applySelfDamage(fbDmg);
      }
      if (this.flameBodyAura) this.flameBodyAura.setPosition(this.player.x, this.player.y);
    }

    // ── Armageddon charge visual tracking ─────────────────────────
    if (this.armageddonActive && this.nukeChanneling) {
      if (this.armageddonChargeVisual) this.armageddonChargeVisual.setPosition(this.player.x, this.player.y);
      const elapsed = time - (this.nukeChannelEnd - 2000);
      this.player.chargeRatio = Math.min(1, elapsed / 2000);
    } else if (!this.pressureCharging) {
      this.player.chargeRatio = this.enhancedFlameBody ? 1 : 0;
      if (this.armageddonChargeVisual && !this.nukeChanneling) {
        this.armageddonChargeVisual.destroy();
        this.armageddonChargeVisual = null;
        this.armageddonActive = false;
      }
    }

    // ── Burning DOT (Flameshredder upgrade) ───────────────────────
    if (this.npcBurningUntil > time) {
      if (!this.npcBurnAura) {
        this.npcBurnAura = this.add.circle(this.npc.x, this.npc.y, 26, 0xff4400, 0.3).setDepth(7);
      }
      this.npcBurnAura.setPosition(this.npc.x, this.npc.y);
      this.npcBurnTickAccum += delta;
      if (this.npcBurnTickAccum >= 500) {
        this.npcBurnTickAccum -= 500;
        this.npc.takeDamage(1);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
      }
    } else {
      this.npcBurnTickAccum = 0;
      if (this.npcBurnAura) { this.npcBurnAura.destroy(); this.npcBurnAura = null; }
    }

    // ── Burning DOT on player (Mastered Flameshredder) ────────────
    if (this.playerBurningUntil > time) {
      if (!this.playerBurnAura) {
        this.playerBurnAura = this.add.circle(this.player.x, this.player.y, 26, 0xff4400, 0.3).setDepth(7);
      }
      this.playerBurnAura.setPosition(this.player.x, this.player.y);
      this.playerBurnTickAccum += delta;
      if (this.playerBurnTickAccum >= 500) {
        this.playerBurnTickAccum -= 500;
        this.player.applySelfDamage(1);
        this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
      }
    } else {
      this.playerBurnTickAccum = 0;
      if (this.playerBurnAura) { this.playerBurnAura.destroy(); this.playerBurnAura = null; }
    }

    // ── NPC Flame Body tick ───────────────────────────────────────
    if (this.npcFlameBodyActive) {
      // No self-damage for the NPC (only cosmetic / speed effect)
      this.npcFlameBodyTickAccum += delta;
      if (this.npcFlameBodyTickAccum >= 250) this.npcFlameBodyTickAccum -= 250;
      if (this.npcFlameBodyAura) this.npcFlameBodyAura.setPosition(this.npc.x, this.npc.y);
    }

    // ── Geyser buff checks ────────────────────────────────────────
    for (const g of this.geysers) {
      if (g.owner === 'player') {
        if (Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) <= g.radius) {
          this.playerGeyserBuffUntil = time + 2000;
        }
      } else {
        if (Phaser.Math.Distance.Between(g.x, g.y, this.npc.x, this.npc.y) <= g.radius) {
          this.npcGeyserBuffUntil = time + 2000;
        }
      }
    }

    // ── Speed multipliers ─────────────────────────────────────────
    if (this.elementId === 'fire') {
      this.playerSpeedMult = this.flameBodyActive ? 2 : 1;
    } else if (this.elementId === 'earth') {
      this.playerSpeedMult = this.hasUpgrade('e') ? 1 + this.player.shieldHp / 100 : 1;
      if (this.earthShieldShedActive) {
        if (time > this.earthShieldShedEnd) {
          this.earthShieldShedActive = false;
          this.earthShieldShedBonus = 0;
          if (this.earthShieldShedAura) { this.earthShieldShedAura.destroy(); this.earthShieldShedAura = null; }
        } else {
          this.playerSpeedMult += this.earthShieldShedBonus;
          if (this.earthShieldShedAura) this.earthShieldShedAura.setPosition(this.player.x, this.player.y);
        }
      }
    } else {
      this.playerSpeedMult = time < this.playerGeyserBuffUntil ? 1.5 : 1;
    }

    this.npcSpeedMult = 1;
    if (this.npcFlameBodyActive) this.npcSpeedMult = 2;
    else if (time < this.npcGeyserBuffUntil) this.npcSpeedMult = 1.5;


    // ── Player movement ─────────────────────────────────────────
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.nukeChanneling && !this.armageddonActive && !this.airBeamWalking) {
      // Standard nuke: fully locked
      playerBody.setVelocity(0, 0);
    } else if (!this.isDodging) {
      let vx = 0;
      let vy = 0;
      if (this.aKey.isDown) vx -= this.player.speed;
      if (this.dKey.isDown) vx += this.player.speed;
      if (this.wKey.isDown) vy -= this.player.speed;
      if (this.sKey.isDown) vy += this.player.speed;

      if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

      let moveMult = this.playerSpeedMult;
      if (this.armageddonActive) moveMult *= 0.2;          // Armageddon: 20% speed
      else if (this.pressureCharging) moveMult *= 0.75;    // Pressure Charge: 75% speed

      playerBody.setVelocity(vx * moveMult, vy * moveMult);
    }

    // ── Player abilities ─────────────────────────────────────────
    const playerCtx = this.buildPlayerContext(mouseX, mouseY);

    if (this.elementId === 'fire') {
      if (!this.nukeChanneling || this.armageddonActive) {
        // ── Click: Fireball / Flamethrower ────────────────────────
        if (pointer.isDown) {
          const justPressed = !this.pointerWasDown;
          this.flamethrowerHoldMs += delta;
          if (justPressed) {
            this.player.castAbility('fireball', playerCtx);
          } else if (this.flamethrowerHoldMs > 120) {
            this.flamethrowerTickAccum += delta;
            if (this.flamethrowerTickAccum >= 100) {
              this.flamethrowerTickAccum -= 100;
              const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
              if (dist <= 180) {
                const dirX = mouseX - this.player.x;
                const dirY = mouseY - this.player.y;
                const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                const dot = (dirX / dirLen) * ((this.npc.x - this.player.x) / dist)
                          + (dirY / dirLen) * ((this.npc.y - this.player.y) / dist);
                if (dot > 0.866) {
                  const ftDmg = this.enhancedFlameBody ? 8 : 4;
                  this.npc.takeDamage(ftDmg);
                  this.spawnHitFlash(this.npc.x, this.npc.y, 0xff5500);
                  // Flameshredder: apply burning DOT on flamethrower hit
                  if (this.hasUpgrade('click')) {
                    this.npcBurningUntil = Math.max(this.npcBurningUntil, time + 3000);
                  }
                }
              }
              this.spawnFlamethrowerCone(this.player.x, this.player.y, mouseX, mouseY);
            }
          }
        } else {
          this.flamethrowerHoldMs = 0;
          this.flamethrowerTickAccum = 0;
        }
        this.pointerWasDown = pointer.isDown;

        // ── E: Flame Dash (+ Propulsion upgrade) ──────────────────
        if (!this.armageddonActive && Phaser.Input.Keyboard.JustDown(this.eKey)) {
          const dashStartX = this.player.x;
          const dashStartY = this.player.y;
          if (this.player.castAbility('flame-dash', playerCtx) && this.hasUpgrade('e')) {
            // Spawn 4 explosions sampled during the 280ms dash
            for (let i = 1; i <= 4; i++) {
              this.time.delayedCall(i * 70, () => {
                if (!this.player.active) return;
                const t = i / 4;
                const ex = dashStartX + (this.player.x - dashStartX) * t;
                const ey = dashStartY + (this.player.y - dashStartY) * t;
                const distToNpc = Phaser.Math.Distance.Between(ex, ey, this.npc.x, this.npc.y);
                if (distToNpc <= 50) {
                  this.npc.takeDamage(Phaser.Math.Between(5, 8));
                  this.spawnHitFlash(this.npc.x, this.npc.y, 0xff6600);
                }
                const ring = this.add.circle(ex, ey, 8, 0xff6600, 0.8).setDepth(4);
                this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
              });
            }
          }
        }

        // ── R: Pressure Bomb / Pressure Charge upgrade ────────────
        if (!this.armageddonActive) {
          if (this.hasUpgrade('r')) {
            if (this.rKey.isDown) {
              if (!this.pressureCharging && this.player.getCooldownRatio('pressure-bomb') >= 1) {
                // Start charging
                this.pressureCharging = true;
                this.pressureChargeStart = time;
                this.pressureTremorAccum = 0;
                this.player.incomingDamageMultiplier = 1.5; // vulnerable while charging
                const cv = this.add.circle(this.player.x, this.player.y, 12, 0xff8800, 0.6).setDepth(4);
                this.tweens.add({ targets: cv, scaleX: 0.5, scaleY: 0.5, yoyo: true, repeat: -1, duration: 300 });
                this.pressureChargeVisual = cv;
              }
              if (this.pressureCharging) {
                if (this.pressureChargeVisual) this.pressureChargeVisual.setPosition(this.player.x, this.player.y);
                this.pressureLastMouseX = mouseX;
                this.pressureLastMouseY = mouseY;
                const heldMs = time - this.pressureChargeStart;
                const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
                // Update charge bar ratio (max 6s = full bar)
                this.player.chargeRatio = Math.min(1, heldMs / 6000);
                // Tremors during charge (every 1s, after 3s threshold)
                if (chargeLevel >= 1) {
                  this.pressureTremorAccum += delta;
                  if (this.pressureTremorAccum >= 1000) {
                    this.pressureTremorAccum -= 1000;
                    const tremorDmg = chargeLevel === 2 ? 6 : 3;
                    for (let ti = 0; ti < 5; ti++) {
                      const ang = (Math.PI * 2 / 5) * ti;
                      const tx = mouseX + Math.cos(ang) * 70;
                      const ty = mouseY + Math.sin(ang) * 70;
                      if (Phaser.Math.Distance.Between(tx, ty, this.npc.x, this.npc.y) <= 40) {
                        this.npc.takeDamage(tremorDmg);
                      }
                      const tremor = this.add.circle(tx, ty, 6, 0xff6600, 0.7).setDepth(4);
                      this.tweens.add({ targets: tremor, scaleX: 4, scaleY: 4, alpha: 0, duration: 300, onComplete: () => tremor.destroy() });
                    }
                  }
                } else {
                  this.pressureTremorAccum = 0;
                }
              }
            } else if (this.pressureCharging) {
              // Released — fire the charged bomb
              this.pressureCharging = false;
              this.player.chargeRatio = 0;
              this.player.incomingDamageMultiplier = 1;
              if (this.pressureChargeVisual) { this.pressureChargeVisual.destroy(); this.pressureChargeVisual = null; }
              const heldMs = time - this.pressureChargeStart;
              const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
              const dmgMult = chargeLevel === 2 ? 2 : chargeLevel === 1 ? 1.5 : 1;
              const finalDmg = Math.round(32 * dmgMult);
              const mx = this.pressureLastMouseX;
              const my = this.pressureLastMouseY;
              if (Phaser.Math.Distance.Between(mx, my, this.npc.x, this.npc.y) <= 100) {
                this.npc.takeDamage(finalDmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xff8800);
              }
              // Explosion visual
              const ring = this.add.circle(mx, my, 10, 0xff8800, 0.9).setDepth(4);
              this.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
              const core = this.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(5);
              this.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
              this.player.triggerCooldown('pressure-bomb');
            }
          } else {
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
              this.player.castAbility('pressure-bomb', playerCtx);
            }
          }
        }

        // ── F: Flame Body / Flame Affinity upgrade ────────────────
        if (!this.armageddonActive) {
          if (this.hasUpgrade('f')) {
            const fDown = this.fKey.isDown;
            if (fDown) {
              if (!this.fKeyWasDown) this.fKeyHeldSince = time;
              const held = time - this.fKeyHeldSince;
              if (held >= 1000 && !this.enhancedFlameBody) {
                // Hold 1s → activate enhanced flame body
                this.enhancedFlameBody = true;
                this.flameBodyActive = true;
                this.flameBodyTickAccum = 0;
                if (this.flameBodyAura) this.flameBodyAura.destroy();
                this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 40, 0xff2200, 0.4).setDepth(3);
              } else if (!this.enhancedFlameBody) {
                // Show charge progress toward enhanced activation
                this.player.chargeRatio = Math.min(1, held / 1000);
              }
            } else {
              if (this.fKeyWasDown) {
                const held = time - this.fKeyHeldSince;
                if (held < 1000) {
                  // Short press: toggle on/off (works for both normal and enhanced)
                  const wasActive = this.flameBodyActive;
                  this.flameBodyActive = !wasActive;
                  this.enhancedFlameBody = false;
                  this.flameBodyTickAccum = 0;
                  if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
                  if (this.flameBodyActive) {
                    this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 30, 0xff6600, 0.25).setDepth(3);
                  }
                }
                // Long press release: enhanced stays active until next short press
              }
            }
            this.fKeyWasDown = fDown;
          } else {
            // No upgrade: original toggle
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.flameBodyActive = !this.flameBodyActive;
              this.flameBodyTickAccum = 0;
              if (this.flameBodyActive) {
                this.flameBodyAura = this.add.circle(this.player.x, this.player.y, 30, 0xff6600, 0.25).setDepth(3);
              } else {
                if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
              }
            }
          }
        }

        // ── Q: Flame Nuke / Armageddon upgrade ────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.hasUpgrade('q') && this.player.getCooldownRatio('flame-nuke') >= 1) {
            // Armageddon: move during channel, 264 range, burn bonus damage
            this.player.triggerCooldown('flame-nuke');
            this.nukeChanneling = true;
            this.nukeChannelEnd = time + 2000;
            this.armageddonActive = true;

            const charge = this.add.circle(this.player.x, this.player.y, 10, 0xff2200, 0.6).setDepth(6);
            this.tweens.add({ targets: charge, scaleX: 22, scaleY: 22, alpha: 0.15, duration: 2000, onComplete: () => charge.destroy() });
            this.armageddonChargeVisual = charge;

            this.time.delayedCall(2000, () => {
              this.armageddonActive = false;
              this.nukeChanneling = false;
              const isBurning = this.npcBurningUntil > this.time.now;
              const dmg = isBurning ? 120 : 80;
              const radius = 264;
              const distToNpc = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
              if (distToNpc <= radius) {
                this.npc.takeDamage(dmg);
                this.spawnHitFlash(this.npc.x, this.npc.y, 0xff4400);
              }
              const boom = this.add.circle(this.player.x, this.player.y, 12, 0xff4400, 0.9).setDepth(5);
              this.tweens.add({ targets: boom, scaleX: 22, scaleY: 22, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
              const boomCore = this.add.circle(this.player.x, this.player.y, 8, 0xffffff, 1).setDepth(6);
              this.tweens.add({ targets: boomCore, scaleX: 9, scaleY: 9, alpha: 0, duration: 320, onComplete: () => boomCore.destroy() });
            });
          } else if (!this.hasUpgrade('q')) {
            this.player.castAbility('flame-nuke', this.buildPlayerContext(this.player.x, this.player.y));
          }
        }
      }

    } else if (this.elementId === 'water') {
      if (pointer.isDown) {
        this.player.castAbility('water-cut', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        if (this.player.castAbility('splash', playerCtx)) {
          this.splashActiveUntil = time + 2000;
          this.splashDropAccum = 0;
          this.splashDropCount = 0;
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        this.player.castAbility('geyser', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
        this.player.castAbility('water-shield', playerCtx);
      }
      if (this.hasUpgrade('q')) {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.player.castAbility('pain-rain', playerCtx)) {
            this.painRainHolding = true;
            this.painRainHoldAccum = 0;
          }
        }
        if (this.qKey.isDown && this.painRainHolding) {
          this.painRainHoldAccum += delta;
          if (this.painRainHoldAccum >= 250) {
            this.painRainHoldAccum -= 250;
            this.createPainRain('player', 15, 0, 100); // 15 drops, near-instant detonation
          }
        }
        if (!this.qKey.isDown) this.painRainHolding = false;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          this.player.castAbility('pain-rain', playerCtx);
        }
      }

    } else if (this.elementId === 'life') {
      // ── Click: Petal Shotgun (or Petal Burst upgrade) ─────────────
      if (pointer.isDown) {
        if (this.hasUpgrade('click')) {
          if (this.player.getCooldownRatio('petal-shotgun') >= 1) {
            this.player.triggerCooldown('petal-shotgun');
            const FIVE_ANGLES = [-30, -15, 0, 15, 30];
            const dx = mouseX - this.player.x;
            const dy = mouseY - this.player.y;
            const baseAngle = Math.atan2(dy, dx);
            const speed = 480;
            const spawnDist = 32;
            for (const deg of FIVE_ANGLES) {
              const angle = baseAngle + deg * (Math.PI / 180);
              const proj = new Projectile(
                this,
                this.player.x + Math.cos(angle) * spawnDist,
                this.player.y + Math.sin(angle) * spawnDist,
                'proj-life', 5, true,
              );
              this.projectiles.add(proj);
              proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
          }
        } else {
          this.player.castAbility('petal-shotgun', playerCtx);
        }
      }

      // ── E: Plant ──────────────────────────────────────────────────
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        this.player.castAbility('plant', playerCtx);
      }

      // ── R: Grow / Life Root upgrade ───────────────────────────────
      if (this.hasUpgrade('r')) {
        const rDown = this.rKey.isDown;
        if (rDown && !this.lifeRPrevDown) {
          this.lifeRHolding = true;
          this.lifeRHoldStart = time;
          this.lifeRChargeVisual = this.add.circle(this.player.x, this.player.y, 28, 0x88ffaa, 0.4).setDepth(4);
        }
        if (rDown && this.lifeRHolding) {
          if (this.lifeRChargeVisual) this.lifeRChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeRHoldStart) / 3000);
          if (time - this.lifeRHoldStart >= 3000) {
            this.lifeRHolding = false;
            if (this.lifeRChargeVisual) { this.lifeRChargeVisual.destroy(); this.lifeRChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.convertToLifePlant();
            this.player.triggerCooldown('grow');
          }
        }
        if (!rDown && this.lifeRPrevDown && this.lifeRHolding) {
          this.lifeRHolding = false;
          if (this.lifeRChargeVisual) { this.lifeRChargeVisual.destroy(); this.lifeRChargeVisual = null; }
          this.player.chargeRatio = 0;
          this.player.castAbility('grow', playerCtx);
        }
        this.lifeRPrevDown = rDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('grow', playerCtx);
        }
      }

      // ── F: Thorns / Thorn Trap upgrade ───────────────────────────
      if (this.hasUpgrade('f')) {
        const fDown = this.fKey.isDown;
        if (fDown && !this.lifeFPrevDown) {
          this.lifeFHolding = true;
          this.lifeFHoldStart = time;
          this.lifeFChargeVisual = this.add.circle(this.player.x, this.player.y, 28, 0xff4444, 0.4).setDepth(4);
        }
        if (fDown && this.lifeFHolding) {
          if (this.lifeFChargeVisual) this.lifeFChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeFHoldStart) / 3000);
          if (time - this.lifeFHoldStart >= 3000) {
            this.lifeFHolding = false;
            if (this.lifeFChargeVisual) { this.lifeFChargeVisual.destroy(); this.lifeFChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.convertToThornPlant();
            this.player.triggerCooldown('thorns');
          }
        }
        if (!fDown && this.lifeFPrevDown && this.lifeFHolding) {
          this.lifeFHolding = false;
          if (this.lifeFChargeVisual) { this.lifeFChargeVisual.destroy(); this.lifeFChargeVisual = null; }
          this.player.chargeRatio = 0;
          this.player.castAbility('thorns', playerCtx);
        }
        this.lifeFPrevDown = fDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('thorns', playerCtx);
        }
      }

      // ── Q: Thorn Drag / Overgrowth upgrade ───────────────────────
      if (this.hasUpgrade('q')) {
        const qDown = this.qKey.isDown;
        if (qDown && !this.lifeQPrevDown) {
          if (this.player.getCooldownRatio('thorn-drag') >= 1) {
            this.lifeQHolding = true;
            this.lifeQHoldStart = time;
            this.lifeQChargeVisual = this.add.circle(this.player.x, this.player.y, 35, 0x44ff44, 0.3).setDepth(4);
          }
        }
        if (qDown && this.lifeQHolding) {
          if (this.lifeQChargeVisual) this.lifeQChargeVisual.setPosition(this.player.x, this.player.y);
          this.player.chargeRatio = Math.min(1, (time - this.lifeQHoldStart) / 8000);
          if (time - this.lifeQHoldStart >= 8000) {
            this.lifeQHolding = false;
            if (this.lifeQChargeVisual) { this.lifeQChargeVisual.destroy(); this.lifeQChargeVisual = null; }
            this.player.chargeRatio = 0;
            this.triggerOvergrowth();
            this.player.triggerCooldown('thorn-drag');
          }
        }
        if (!qDown && this.lifeQPrevDown && this.lifeQHolding) {
          this.lifeQHolding = false;
          if (this.lifeQChargeVisual) { this.lifeQChargeVisual.destroy(); this.lifeQChargeVisual = null; }
          this.player.chargeRatio = 0;
          if (this.player.castAbility('thorn-drag', playerCtx)) {
            this.thornDragActiveUntil = time + 2000;
            this.thornDragTickAccum = 0;
            this.thornDragAura = this.add.circle(this.player.x, this.player.y, 30, 0x44ff44, 0.3).setDepth(3);
          }
        }
        this.lifeQPrevDown = qDown;
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
          if (this.player.castAbility('thorn-drag', playerCtx)) {
            this.thornDragActiveUntil = time + 2000;
            this.thornDragTickAccum = 0;
            this.thornDragAura = this.add.circle(this.player.x, this.player.y, 30, 0x44ff44, 0.3).setDepth(3);
          }
        }
      }

    } else if (this.elementId === 'air') {
      if (!this.nukeChanneling) {
        // ── Click: Air Snipe ─────────────────────────────────────
        if (pointer.isDown) {
          const snipeBase = this.buildPlayerContext(mouseX, mouseY);
          if (this.airElectroCharged && this.player.getCooldownRatio('air-snipe') >= 1) {
            // Electro charged shot: instant, 1.5× damage, miss = 20 self-damage
            this.player.triggerCooldown('air-snipe');
            this.airElectroCharged = false;
            if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
            this.player.chargeRatio = 0;
            const electroCtx: typeof snipeBase = {
              ...snipeBase,
              lockCaster: () => {},
              quickShotActive: true,
              reportAirSnipeResult: (hit) => {
                if (hit) { this.airConsecutiveHits = Math.min(this.airConsecutiveHits + 1, 3); }
                else {
                  this.airConsecutiveHits = 0;
                  this.player.applySelfDamage(20);
                  this.spawnHitFlash(this.player.x, this.player.y, 0xaaddff);
                }
              },
            };
            fireHitscan(electroCtx, 45, 0xffee44, true);
          } else {
            // Normal snipe — Click upgrade removes the 0.5s movement lock
            const noLockCtx = this.hasUpgrade('click')
              ? { ...snipeBase, lockCaster: (_d: number) => {} }
              : snipeBase;
            if (this.player.castAbility('air-snipe', noLockCtx)) {
              if (this.quickShotCharged) this.quickShotCharged = false;
            }
          }
        }

        // ── E: Quick Shot / Electro Charge (upgrade) ─────────────
        if (this.hasUpgrade('e')) {
          if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.airElectroHolding = true;
            this.airElectroHeldSince = time;
            if (this.airElectroChargeVisual) this.airElectroChargeVisual.destroy();
            this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 10, 0xffee44, 0.9).setDepth(8);
          }
          if (this.airElectroHolding) {
            if (this.airElectroChargeVisual) this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
            if (!this.eKey.isDown) {
              // Released early → normal quick-shot
              this.airElectroHolding = false;
              if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
              this.player.chargeRatio = 0;
              this.player.castAbility('quick-shot', playerCtx);
            } else if (time - this.airElectroHeldSince >= 1500) {
              // Fully charged
              this.airElectroHolding = false;
              this.airElectroCharged = true;
              if (this.airElectroChargeVisual) { this.airElectroChargeVisual.destroy(); this.airElectroChargeVisual = null; }
              this.airElectroChargeVisual = this.add.circle(this.player.x, this.player.y, 22, 0xffee44, 0.7).setDepth(8);
              this.tweens.add({ targets: this.airElectroChargeVisual, alpha: 0.2, yoyo: true, repeat: -1, duration: 280 });
            }
          }
          if (this.airElectroCharged && this.airElectroChargeVisual) {
            this.airElectroChargeVisual.setPosition(this.player.x, this.player.y);
          }
        } else {
          if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.player.castAbility('quick-shot', playerCtx);
          }
        }

        // ── R: Wind Trap ──────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
          this.player.castAbility('wind-trap', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── F: Grapple ────────────────────────────────────────────
        if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
          this.player.castAbility('grapple', this.buildPlayerContext(mouseX, mouseY));
        }

        // ── Q: Charged Beam (upgrade: bounce + walk) ──────────────
        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.airConsecutiveHits >= 3) {
          if (this.hasUpgrade('q')) {
            if (this.player.getCooldownRatio('charged-beam') >= 1) {
              this.player.triggerCooldown('charged-beam');
              this.airConsecutiveHits = 0;
              this.nukeChanneling = true;
              this.airBeamWalking = true;
              this.nukeChannelEnd = time + 1500;
              const { width: W, height: H } = this.scale;
              const capX = mouseX, capY = mouseY;
              const chargeVis = this.add.circle(this.player.x, this.player.y, 14, 0x88ccff, 0.8).setDepth(8);
              this.tweens.add({ targets: chargeVis, scaleX: 5, scaleY: 5, alpha: 0.1, duration: 1500, onComplete: () => chargeVis.destroy() });
              this.time.delayedCall(1500, () => {
                this.airBeamWalking = false;
                this.nukeChanneling = false;
                this.player.chargeRatio = 0;
                fireBounceHitscan(
                  this.buildPlayerContext(capX, capY),
                  100, 3, W, H,
                );
              });
            }
          } else {
            if (this.player.castAbility('charged-beam', this.buildPlayerContext(mouseX, mouseY))) {
              this.airConsecutiveHits = 0;
            }
          }
        }
      }
    } else if (this.elementId === 'earth') {
      if (!this.earthSlamActive && !this.earthSlamBouncing && !this.earthBullRushActive) {
        // E: Shield Up — hold to charge at 8.75 shield/s; blocks all other abilities while held
        if (this.eKey.isDown && this.player.shieldHp < 100) {
          this.player.shieldHp = Math.min(100, this.player.shieldHp + 8.75 * (delta / 1000));
        }

        if (!this.eKey.isDown) {
          // Click: stab (damage scales with speed if upgraded)
          if (pointer.isDown) {
            if (this.hasUpgrade('click')) {
              const speedScale = this.playerSpeedMult;
              const scaledCtx = { ...playerCtx, dealMeleeDamage: (range: number, dmg: number, kb = 0) => playerCtx.dealMeleeDamage(range, Math.round(dmg * speedScale), kb) };
              this.player.castAbility('stab', scaledCtx);
            } else {
              this.player.castAbility('stab', playerCtx);
            }
          }
          // R: Shield Slam
          if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.player.castAbility('shield-slam', playerCtx);
          }
          // F: Shield Break / Shield Shed (hold upgrade)
          if (this.hasUpgrade('f')) {
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.earthShieldShedHolding = true;
              this.earthShieldShedStart = time;
              this.player.chargeRatio = 0;
            }
            if (this.earthShieldShedHolding) {
              this.player.chargeRatio = Math.min(1, (time - this.earthShieldShedStart) / 2000);
              if (!this.fKey.isDown) {
                this.earthShieldShedHolding = false;
                this.player.chargeRatio = 0;
                this.player.castAbility('shield-break', playerCtx);
              } else if (time - this.earthShieldShedStart >= 2000) {
                this.earthShieldShedHolding = false;
                this.player.chargeRatio = 0;
                const shedAmount = this.player.shieldHp;
                this.player.shieldHp = 0;
                const bonus = shedAmount * 0.03;
                this.earthShieldShedActive = true;
                this.earthShieldShedEnd = time + 6000;
                this.earthShieldShedBonus = bonus;
                if (this.earthShieldShedAura) this.earthShieldShedAura.destroy();
                this.earthShieldShedAura = this.add.circle(this.player.x, this.player.y, 32, 0xffcc44, 0.5).setDepth(6);
                this.tweens.add({ targets: this.earthShieldShedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
                this.spawnHitFlash(this.player.x, this.player.y, 0xffcc44);
              }
            }
          } else {
            if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
              this.player.castAbility('shield-break', playerCtx);
            }
          }
          // Q: Bull Rush
          if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.player.castAbility('bull-rush', playerCtx);
          }
        } // end !eKey.isDown
      }
    }

    // ── Player water world effects ────────────────────────────────
    if (this.elementId === 'water') {
      if (time < this.splashActiveUntil) {
        this.splashDropAccum += delta;
        if (this.splashDropAccum >= 150) {
          this.splashDropAccum -= 150;
          this.splashDropCount++;
          const isFinal = this.hasUpgrade('e') && (time + 150 >= this.splashActiveUntil);
          const puddleRadius = isFinal ? 54 : 36;
          const puddleAlpha = isFinal ? 0.7 : 0.5;
          const puddleDuration = isFinal ? 5000 : 1000;
          const spr = this.add.circle(mouseX, mouseY, puddleRadius, 0x0066bb, puddleAlpha).setDepth(2);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + puddleDuration, x: mouseX, y: mouseY, radius: puddleRadius, tickAccum: 0, owner: 'player' });
        }
      }

      // Shield aura maintenance
      if (this.player.shieldCharges > 0 && !this.shieldAura) {
        this.shieldAura = this.add.circle(this.player.x, this.player.y, 32, 0x44aaff, 0.35).setDepth(6);
      } else if (this.player.shieldCharges === 0 && this.shieldAura) {
        this.shieldAura.destroy();
        this.shieldAura = null;
      }
      if (this.shieldAura) this.shieldAura.setPosition(this.player.x, this.player.y);
    }

    // ── Grapple dodge aura ────────────────────────────────────────
    if (this.grappleDodgeAura) {
      if (this.grappleDodgeCharges > 0) {
        this.grappleDodgeAura.setPosition(this.player.x, this.player.y);
      } else {
        this.grappleDodgeAura.destroy();
        this.grappleDodgeAura = null;
      }
    }

    // ── Earth element per-frame ───────────────────────────────────
    if (this.elementId === 'earth') {
      // Player slam — dash phase
      if (this.earthSlamActive) {
        if (time > this.earthSlamEnd) {
          this.earthSlamActive = false;
          this.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else if (!this.earthSlamHitDealt) {
          const slamDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
          if (slamDist <= 60) {
            const shieldDmg = Math.max(5, Math.floor(this.player.shieldHp / 2));
            this.npc.takeDamage(shieldDmg);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xbb9955);
            this.earthSlamHitDealt = true;
            this.earthSlamActive = false;
            this.isDodging = false;
            playerBody.setVelocity(0, 0);
          } else if (playerBody.blocked.left || playerBody.blocked.right || playerBody.blocked.up || playerBody.blocked.down) {
            // Entered bounce phase
            this.earthSlamActive = false;
            this.earthSlamBouncing = true;
            this.earthSlamBounceEnd = time + 5000;
            this.earthSlamLastWallHit = time;
            // Nudge out of wall, then launch
            if (playerBody.blocked.left)  this.player.x += 6;
            if (playerBody.blocked.right) this.player.x -= 6;
            if (playerBody.blocked.up)    this.player.y += 6;
            if (playerBody.blocked.down)  this.player.y -= 6;
            let bounceAng: number;
            if (this.hasUpgrade('r')) {
              const ptr = this.input.activePointer;
              bounceAng = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
            } else {
              let awayX = 0, awayY = 0;
              if (playerBody.blocked.left)  awayX += 1;
              if (playerBody.blocked.right) awayX -= 1;
              if (playerBody.blocked.up)    awayY += 1;
              if (playerBody.blocked.down)  awayY -= 1;
              bounceAng = Math.atan2(awayY || 0, awayX || 1) + (Math.random() - 0.5) * (Math.PI * 0.89);
            }
            playerBody.setVelocity(Math.cos(bounceAng) * 950, Math.sin(bounceAng) * 950);
            if (this.player.shieldHp === 0) {
              this.player.takeDamage(5);
              this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            }
          }
        }
      }

      // Player slam — bounce phase
      if (this.earthSlamBouncing) {
        if (time > this.earthSlamBounceEnd) {
          this.earthSlamBouncing = false;
          this.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else {
          const bl = playerBody.blocked;
          const wallHit = bl.left || bl.right || bl.up || bl.down;
          if (wallHit && time - this.earthSlamLastWallHit > 150) {
            this.earthSlamLastWallHit = time;
            // Nudge out of wall to prevent sticking
            if (bl.left)  this.player.x += 6;
            if (bl.right) this.player.x -= 6;
            if (bl.up)    this.player.y += 6;
            if (bl.down)  this.player.y -= 6;
            // Compute bounce angle — cursor-guided if R upgrade, else random
            let wallAng: number;
            if (this.hasUpgrade('r')) {
              const ptr = this.input.activePointer;
              wallAng = Math.atan2(ptr.worldY - this.player.y, ptr.worldX - this.player.x);
            } else {
              let awayX = 0, awayY = 0;
              if (bl.left)  awayX += 1;
              if (bl.right) awayX -= 1;
              if (bl.up)    awayY += 1;
              if (bl.down)  awayY -= 1;
              wallAng = Math.atan2(awayY || 0, awayX || 1) + (Math.random() - 0.5) * (Math.PI * 0.89);
            }
            playerBody.setVelocity(Math.cos(wallAng) * 950, Math.sin(wallAng) * 950);
            if (this.player.shieldHp === 0) {
              this.player.takeDamage(5);
              this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            }
          }
          // Can still hit NPC once during bounce (half shield damage)
          if (!this.earthSlamHitDealt) {
            const bounceDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
            if (bounceDist <= 60) {
              const shieldDmg = Math.max(5, Math.floor(this.player.shieldHp / 2));
              this.npc.takeDamage(shieldDmg);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xbb9955);
              this.earthSlamHitDealt = true;
            }
          }
        }
      }

      // Player earth shield aura + counter label
      if (this.player.shieldHp > 0 && !this.earthShieldAura) {
        this.earthShieldAura = this.add.circle(this.player.x, this.player.y, 30, 0x997744, 0.3).setDepth(6);
        this.earthShieldLabel = this.add.text(this.player.x, this.player.y, '', {
          fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaddff',
        }).setOrigin(0.5).setDepth(11);
      } else if (this.player.shieldHp === 0 && this.earthShieldAura) {
        this.earthShieldAura.destroy(); this.earthShieldAura = null;
        if (this.earthShieldLabel) { this.earthShieldLabel.destroy(); this.earthShieldLabel = null; }
      }
      if (this.earthShieldAura) this.earthShieldAura.setPosition(this.player.x, this.player.y);
      if (this.earthShieldLabel) {
        this.earthShieldLabel.setText(`🛡${Math.floor(this.player.shieldHp)}`);
        this.earthShieldLabel.setPosition(this.player.x, this.player.y);
      }

      // Bull Rush — player
      if (this.earthBullRushActive) {
        if (time > this.earthBullRushEnd) {
          // Expired — clean up
          this.earthBullRushActive = false;
          this.isDodging = false;
          if (this.earthBullRushDrApplied) { this.player.incomingDamageMultiplier /= 0.8; this.earthBullRushDrApplied = false; }
          if (this.earthBullRushAura) { this.earthBullRushAura.destroy(); this.earthBullRushAura = null; }
          playerBody.setVelocity(0, 0);
        } else {
          // Accelerate toward cursor
          const ptr = this.input.activePointer;
          const rdx = ptr.worldX - this.player.x;
          const rdy = ptr.worldY - this.player.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          this.earthBullRushSpeed = Math.min(700, this.earthBullRushSpeed + delta * 0.4);
          playerBody.setVelocity((rdx / rlen) * this.earthBullRushSpeed, (rdy / rlen) * this.earthBullRushSpeed);
          if (this.earthBullRushAura) this.earthBullRushAura.setPosition(this.player.x, this.player.y);

          // Hit NPC (multi-hit with debounce)
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) <= 60
            && time - this.earthBullRushLastHit > 500) {
            this.earthBullRushLastHit = time;
            this.npc.takeDamage(25);
            this.spawnHitFlash(this.npc.x, this.npc.y, 0xcc4400);
            const toNx = this.npc.x - this.player.x;
            const toNy = this.npc.y - this.player.y;
            const nd = Math.sqrt(toNx * toNx + toNy * toNy) || 1;
            (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity((toNx / nd) * 500, (toNy / nd) * 500);
          }

          // Wall collision
          if (playerBody.blocked.left || playerBody.blocked.right || playerBody.blocked.up || playerBody.blocked.down) {
            if (this.hasUpgrade('q') && time - this.earthBullRushWallHitLast >= 3000) {
              this.earthBullRushWallHitLast = time;
              this.player.applySelfDamage(15);
              this.spawnHitFlash(this.player.x, this.player.y, 0x887755);
              // Upgrade DR to 45%: currently at ×0.8 (20% DR). Multiply by another ×0.65 → ×0.52 ≈ 45% DR total
              if (this.earthBullRushDrApplied) {
                this.player.incomingDamageMultiplier /= 0.8;
                this.player.incomingDamageMultiplier *= (1 - 0.45);
              }
              this.createPainRain('player', 40, 200, 1500, 10, 0x554422, 20, 70);
            }
            // Bounce off wall
            if (playerBody.blocked.left || playerBody.blocked.right) this.earthBullRushSpeed *= 0.5;
            if (playerBody.blocked.up || playerBody.blocked.down) this.earthBullRushSpeed *= 0.5;
          }
        }
      }
    }

    // ── NPC earth slam + aura ─────────────────────────────────────
    if (this.npcElement.id === 'earth') {
      const npcBody = this.npc.body as Phaser.Physics.Arcade.Body;

      // NPC slam — dash phase
      if (this.npcEarthSlamActive) {
        if (time > this.npcEarthSlamEnd) {
          this.npcEarthSlamActive = false;
          npcBody.setVelocity(0, 0);
        } else if (!this.npcEarthSlamHitDealt) {
          const slamDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
          if (slamDist <= 60) {
            const shieldDmg = Math.max(5, Math.floor(this.npc.shieldHp / 2));
            this.player.takeDamage(shieldDmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xbb9955);
            this.npcEarthSlamHitDealt = true;
            this.npcEarthSlamActive = false;
            npcBody.setVelocity(0, 0);
          } else if (npcBody.blocked.left || npcBody.blocked.right || npcBody.blocked.up || npcBody.blocked.down) {
            this.npcEarthSlamActive = false;
            this.npcEarthSlamBouncing = true;
            this.npcEarthSlamBounceEnd = time + 5000;
            this.npcEarthSlamLastWallHit = time;
            if (npcBody.blocked.left)  this.npc.x += 6;
            if (npcBody.blocked.right) this.npc.x -= 6;
            if (npcBody.blocked.up)    this.npc.y += 6;
            if (npcBody.blocked.down)  this.npc.y -= 6;
            let npcAwayX = 0, npcAwayY = 0;
            if (npcBody.blocked.left)  npcAwayX += 1;
            if (npcBody.blocked.right) npcAwayX -= 1;
            if (npcBody.blocked.up)    npcAwayY += 1;
            if (npcBody.blocked.down)  npcAwayY -= 1;
            const npcBaseAng = Math.atan2(npcAwayY || 0, npcAwayX || 1);
            const npcAng = npcBaseAng + (Math.random() - 0.5) * (Math.PI * 0.89);
            npcBody.setVelocity(Math.cos(npcAng) * 950, Math.sin(npcAng) * 950);
            if (this.npc.shieldHp === 0) {
              this.npc.takeDamage(5);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
            }
          }
        }
      }

      // NPC slam — bounce phase
      if (this.npcEarthSlamBouncing) {
        if (time > this.npcEarthSlamBounceEnd) {
          this.npcEarthSlamBouncing = false;
          npcBody.setVelocity(0, 0);
        } else {
          const nbl = npcBody.blocked;
          const npcWallHit = nbl.left || nbl.right || nbl.up || nbl.down;
          if (npcWallHit && time - this.npcEarthSlamLastWallHit > 150) {
            this.npcEarthSlamLastWallHit = time;
            if (nbl.left)  this.npc.x += 6;
            if (nbl.right) this.npc.x -= 6;
            if (nbl.up)    this.npc.y += 6;
            if (nbl.down)  this.npc.y -= 6;
            let npcAwayX2 = 0, npcAwayY2 = 0;
            if (nbl.left)  npcAwayX2 += 1;
            if (nbl.right) npcAwayX2 -= 1;
            if (nbl.up)    npcAwayY2 += 1;
            if (nbl.down)  npcAwayY2 -= 1;
            const npcBase2 = Math.atan2(npcAwayY2 || 0, npcAwayX2 || 1);
            const npcWallAng = npcBase2 + (Math.random() - 0.5) * (Math.PI * 0.89);
            npcBody.setVelocity(Math.cos(npcWallAng) * 950, Math.sin(npcWallAng) * 950);
            if (this.npc.shieldHp === 0) {
              this.npc.takeDamage(5);
              this.spawnHitFlash(this.npc.x, this.npc.y, 0xaa8844);
            }
          }
          if (!this.npcEarthSlamHitDealt) {
            const bounceDist = Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y);
            if (bounceDist <= 60) {
              const shieldDmg = Math.max(5, Math.floor(this.npc.shieldHp / 2));
              this.player.takeDamage(shieldDmg);
              this.spawnHitFlash(this.player.x, this.player.y, 0xbb9955);
              this.npcEarthSlamHitDealt = true;
            }
          }
        }
      }

      // NPC earth shield aura + counter label
      if (this.npc.shieldHp > 0 && !this.npcEarthShieldAura) {
        this.npcEarthShieldAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x997744, 0.3).setDepth(6);
        this.npcEarthShieldLabel = this.add.text(this.npc.x, this.npc.y, '', {
          fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#aaddff',
        }).setOrigin(0.5).setDepth(11);
      } else if (this.npc.shieldHp === 0 && this.npcEarthShieldAura) {
        this.npcEarthShieldAura.destroy(); this.npcEarthShieldAura = null;
        if (this.npcEarthShieldLabel) { this.npcEarthShieldLabel.destroy(); this.npcEarthShieldLabel = null; }
      }
      if (this.npcEarthShieldAura) this.npcEarthShieldAura.setPosition(this.npc.x, this.npc.y);
      if (this.npcEarthShieldLabel) {
        this.npcEarthShieldLabel.setText(`🛡${Math.floor(this.npc.shieldHp)}`);
        this.npcEarthShieldLabel.setPosition(this.npc.x, this.npc.y);
      }

      // NPC Bull Rush
      if (this.npcBullRushActive) {
        if (time > this.npcBullRushEnd) {
          this.npcBullRushActive = false;
          if (this.npcBullRushDrApplied) { this.npc.incomingDamageMultiplier /= 0.8; this.npcBullRushDrApplied = false; }
          if (this.npcBullRushAura) { this.npcBullRushAura.destroy(); this.npcBullRushAura = null; }
          npcBody.setVelocity(0, 0);
        } else {
          // Accelerate toward player
          const rdx = this.player.x - this.npc.x;
          const rdy = this.player.y - this.npc.y;
          const rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          this.npcBullRushSpeed = Math.min(700, this.npcBullRushSpeed + delta * 0.4);
          npcBody.setVelocity((rdx / rlen) * this.npcBullRushSpeed, (rdy / rlen) * this.npcBullRushSpeed);
          if (this.npcBullRushAura) this.npcBullRushAura.setPosition(this.npc.x, this.npc.y);

          // Hit player
          if (Phaser.Math.Distance.Between(this.npc.x, this.npc.y, this.player.x, this.player.y) <= 60
            && time - this.npcBullRushLastHit > 500) {
            this.npcBullRushLastHit = time;
            this.player.takeDamage(25);
            this.spawnHitFlash(this.player.x, this.player.y, 0xcc4400);
            const toPx = this.player.x - this.npc.x;
            const toPy = this.player.y - this.npc.y;
            const pd = Math.sqrt(toPx * toPx + toPy * toPy) || 1;
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity((toPx / pd) * 500, (toPy / pd) * 500);
          }
        }
      }
    }

    // ── NPC world effects (water) ─────────────────────────────────
    if (this.npcElement.id === 'water') {
      if (time < this.npcSplashActiveUntil) {
        this.npcSplashDropAccum += delta;
        if (this.npcSplashDropAccum >= 150) {
          this.npcSplashDropAccum -= 150;
          // Drop puddle near player with aim scatter based on difficulty
          const splashMissRange = this.npcDifficulty.aimOffsetDeg * 2.2; // ~0 on Nightmare, ~110 on Easy
          const splashX = this.player.x + Phaser.Math.Between(-splashMissRange, splashMissRange);
          const splashY = this.player.y + Phaser.Math.Between(-splashMissRange, splashMissRange);
          const spr = this.add.circle(splashX, splashY, 36, 0x0066bb, 0.5).setDepth(2);
          this.tweens.add({ targets: spr, scaleX: 1.3, scaleY: 1.3, alpha: 0.25, duration: 800 });
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: splashX, y: splashY, radius: 36, tickAccum: 0, owner: 'npc' });
        }
      }

      // NPC shield aura maintenance
      if (this.npc.shieldCharges > 0 && !this.npcShieldAura) {
        this.npcShieldAura = this.add.circle(this.npc.x, this.npc.y, 32, 0x44aaff, 0.35).setDepth(6);
      } else if (this.npc.shieldCharges === 0 && this.npcShieldAura) {
        this.npcShieldAura.destroy();
        this.npcShieldAura = null;
      }
      if (this.npcShieldAura) this.npcShieldAura.setPosition(this.npc.x, this.npc.y);
    }

    // ── Shared puddle ticks + expiry ──────────────────────────────
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time > p.expiresAt) {
        p.sprite.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      const target = p.owner === 'player' ? this.npc : this.player;
      if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) <= p.radius) {
        p.tickAccum += delta;
        if (p.tickAccum >= 250) {
          p.tickAccum -= 250;
          target.takeDamage(2);
          this.spawnHitFlash(target.x, target.y, 0x0099ff);
        }
      }
    }

    // ── Geyser expiry ─────────────────────────────────────────────
    for (let i = this.geysers.length - 1; i >= 0; i--) {
      if (time > this.geysers[i].expiresAt) {
        this.geysers[i].sprite.destroy();
        this.geysers.splice(i, 1);
      }
    }

    // ── Plant expiry ──────────────────────────────────────────────
    // ── Plant health bar updates + projectile damage + expiry ─────
    const allActiveProj = this.projectiles.getChildren() as Projectile[];

    for (let i = this.playerPlants.length - 1; i >= 0; i--) {
      const p = this.playerPlants[i];
      if (time > p.expiresAt || p.hp <= 0) {
        p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
        this.playerPlants.splice(i, 1);
        continue;
      }
      p.healthBar.update(p.x, p.y, p.hp);

      // E upgrade: normal plants slowly follow cursor
      if (p.type === 'normal' && this.hasUpgrade('e')) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const distToCursor = Math.sqrt(dx * dx + dy * dy);
        if (distToCursor > 5) {
          const moveAmount = Math.min(60 * delta / 1000, distToCursor);
          p.x += (dx / distToCursor) * moveAmount;
          p.y += (dy / distToCursor) * moveAmount;
          p.sprite.setPosition(p.x, p.y);
          p.label.setPosition(p.x, p.y);
        }
      }

      // Life plant: heal player 10 HP every 2 seconds
      if (p.type === 'life') {
        p.accum += delta;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          this.player.heal(10);
          const apple = this.add.text(p.x, p.y, '🍎', { fontSize: '18px' }).setOrigin(0.5).setDepth(6);
          this.tweens.add({ targets: apple, y: p.y - 50, alpha: 0, duration: 900, onComplete: () => apple.destroy() });
        }
      }

      // Thorn plant: fire petal at enemy every 1 second
      if (p.type === 'thorn') {
        p.accum += delta;
        if (p.accum >= 1000) {
          p.accum -= 1000;
          const dx = this.npc.x - p.x;
          const dy = this.npc.y - p.y;
          const dist2 = Math.sqrt(dx * dx + dy * dy) || 1;
          const thornProj = new Projectile(this, p.x, p.y, 'proj-life', 8, true);
          this.projectiles.add(thornProj);
          thornProj.launch((dx / dist2) * 480, (dy / dist2) * 480);
        }
      }

      // NPC projectiles damage player plants
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hp -= proj.damage;
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }
    }
    for (let i = this.npcPlants.length - 1; i >= 0; i--) {
      const p = this.npcPlants[i];
      if (time > p.expiresAt || p.hp <= 0) {
        p.sprite.destroy(); p.label.destroy(); p.healthBar.destroy();
        this.npcPlants.splice(i, 1);
        continue;
      }
      p.healthBar.update(p.x, p.y, p.hp);
      // Player projectiles damage NPC plants
      for (const go of allActiveProj) {
        const proj = go as Projectile;
        if (!proj.active || !proj.isFromPlayer) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hp -= proj.damage;
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }
    }

    // ── Pain Rain drops ───────────────────────────────────────────
    for (let i = this.painRainShadows.length - 1; i >= 0; i--) {
      const s = this.painRainShadows[i];
      if (!s.fired && time >= s.fireAt) {
        s.fired = true;
        s.sprite.destroy();

        const wave = this.add.circle(s.x, s.y, 10, s.color, 0.7).setDepth(8);
        this.tweens.add({ targets: wave, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => wave.destroy() });
        const core = this.add.circle(s.x, s.y, 7, 0xffffff, 1).setDepth(9);
        this.tweens.add({ targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 220, onComplete: () => core.destroy() });

        const target = s.owner === 'player' ? this.npc : this.player;
        if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) <= s.hitRadius) {
          target.takeDamage(s.damage);
          this.spawnHitFlash(target.x, target.y, s.color);
        }
      }
      if (s.fired) this.painRainShadows.splice(i, 1);
    }

    // ── Dodge (Space) ────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dodgeOnCooldown && !this.isDodging && !this.nukeChanneling) {
      this.dodgeOnCooldown = true;
      this.isDodging = true;
      this.player.isInvincible = true;

      let dx = (this.dKey.isDown ? 1 : 0) - (this.aKey.isDown ? 1 : 0);
      let dy = (this.sKey.isDown ? 1 : 0) - (this.wKey.isDown ? 1 : 0);
      if (dx === 0 && dy === 0) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, mouseX, mouseY);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      } else {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      playerBody.setVelocity(dx * 520, dy * 520);

      const trail = this.add.circle(this.player.x, this.player.y, 18, 0x8844ff, 0.4);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 300, onComplete: () => trail.destroy() });

      this.time.delayedCall(280, () => {
        if (this.player.active) { this.player.isInvincible = false; this.isDodging = false; }
      });
      this.time.delayedCall(1000, () => { this.dodgeOnCooldown = false; });
    }

    // ── NPC AI ───────────────────────────────────────────────────
    const aiState: NpcAiState = {
      isLocked: this.npcNukeChanneling || this.npcEarthSlamActive || this.npcEarthSlamBouncing,
      hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
      flameBodyActive: this.npcFlameBodyActive,
      projectiles: this.projectiles,
      plantCount: this.npcPlants.length,
      thornDragActive: time < this.npcThornDragActiveUntil,
      enemyNearPlant: this.npcPlants.some(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      ),
      windTrapActive: time < this.npcWindTrapExpiry,
      chargedBeamReady: this.npcAirConsecutiveHits >= 3,
      earthShieldHp: this.npc.shieldHp,
    };

    const npcPreDashX = this.npc.x;
    const npcPreDashY = this.npc.y;
    const npcCastId = this.npc.doAI(
      this.player,
      (tx, ty) => this.buildNpcContext(tx, ty),
      time,
      aiState,
    );

    // React to NPC casts that need ArenaScene state
    if (npcCastId === 'splash') {
      this.npcSplashActiveUntil = time + 2000;
      this.npcSplashDropAccum = 0;
    }
    if ((npcCastId === 'flame-dash' || npcCastId === 'flame-dash-charged') && this.npc.isMastered) {
      for (let i = 1; i <= 4; i++) {
        this.time.delayedCall(i * 70, () => {
          if (!this.npc.active) return;
          const t = i / 4;
          const ex = npcPreDashX + (this.npc.x - npcPreDashX) * t;
          const ey = npcPreDashY + (this.npc.y - npcPreDashY) * t;
          const expl = this.add.circle(ex, ey, 22, 0xff4400, 0.7).setDepth(8);
          this.tweens.add({ targets: expl, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => expl.destroy() });
          if (Phaser.Math.Distance.Between(ex, ey, this.player.x, this.player.y) <= 50) {
            this.player.takeDamage(Phaser.Math.Between(5, 8));
            this.spawnHitFlash(this.player.x, this.player.y, 0xff4400);
          }
        });
      }
    }
    if (npcCastId === 'flame-body') {
      this.npcFlameBodyActive = !this.npcFlameBodyActive;
      this.npcFlameBodyTickAccum = 0;
      if (this.npcFlameBodyActive) {
        this.npcFlameBodyAura = this.add.circle(this.npc.x, this.npc.y, 30, 0xff6600, 0.25).setDepth(3);
      } else {
        if (this.npcFlameBodyAura) { this.npcFlameBodyAura.destroy(); this.npcFlameBodyAura = null; }
      }
    }
    if (npcCastId === 'thorn-drag') {
      this.npcThornDragActiveUntil = time + 2000;
      this.npcThornDragTickAccum = 0;
      this.npcThornDragAura = this.add.circle(this.npc.x, this.npc.y, 30, 0x44ff44, 0.3).setDepth(3);
    }
    if (npcCastId === 'quick-shot') {
      this.npcQuickShotCharged = true;
    }
    if (npcCastId === 'charged-beam') {
      this.npcAirConsecutiveHits = 0;
    }

    // ── Rebirth glow follows NPC ─────────────────────────────────
    if (this.npcRebirthGlow && this.npc.active) {
      this.npcRebirthGlow.setPosition(this.npc.x, this.npc.y);
    }

    // ── Clone AI ─────────────────────────────────────────────────
    if (this.clone && this.clone.active && !this.cloneDefeated) {
      // Speed mult for clone
      this.cloneSpeedMult = 1;
      if (this.cloneFlameBodyActive) this.cloneSpeedMult = 2;
      else if (time < this.cloneGeyserBuffUntil) this.cloneSpeedMult = 1.5;

      const cloneAiState: NpcAiState = {
        isLocked: this.cloneNukeChanneling || this.cloneEarthSlamActive,
        hasActiveGeyser: this.geysers.some((g) => g.owner === 'npc'),
        flameBodyActive: this.cloneFlameBodyActive,
        projectiles: this.projectiles,
        plantCount: this.npcPlants.length,
        thornDragActive: time < this.cloneThornDragActiveUntil,
        enemyNearPlant: this.npcPlants.some(
          (p) => Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
        ),
        windTrapActive: time < this.cloneWindTrapExpiry,
        chargedBeamReady: this.cloneAirConsecutiveHits >= 3,
        earthShieldHp: this.clone.shieldHp,
      };

      const cloneCastId = this.clone.doAI(
        this.player,
        (tx, ty) => this.buildCloneContext(tx, ty),
        time,
        cloneAiState,
      );

      if (cloneCastId === 'splash') { this.cloneSplashActiveUntil = time + 2000; this.cloneSplashDropAccum = 0; }
      if (cloneCastId === 'flame-body') {
        this.cloneFlameBodyActive = !this.cloneFlameBodyActive;
        this.cloneFlameBodyTickAccum = 0;
        if (this.cloneFlameBodyActive) {
          this.cloneFlameBodyAura = this.add.circle(this.clone.x, this.clone.y, 30, 0xff6600, 0.25).setDepth(3);
        } else if (this.cloneFlameBodyAura) {
          this.cloneFlameBodyAura.destroy(); this.cloneFlameBodyAura = null;
        }
      }
      if (cloneCastId === 'thorn-drag') {
        this.cloneThornDragActiveUntil = time + 2000;
        this.cloneThornDragTickAccum = 0;
        this.cloneThornDragAura = this.add.circle(this.clone.x, this.clone.y, 30, 0x44ff44, 0.3).setDepth(3);
      }
      if (cloneCastId === 'quick-shot') { this.cloneQuickShotCharged = true; }
      if (cloneCastId === 'charged-beam') { this.cloneAirConsecutiveHits = 0; }

      // Post-AI clone velocity
      if (this.cloneNukeChanneling) {
        if (time >= this.cloneNukeChannelEnd) this.cloneNukeChanneling = false;
        else (this.clone.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else if (this.cloneSpeedMult !== 1) {
        const cb = this.clone.body as Phaser.Physics.Arcade.Body;
        cb.velocity.x *= this.cloneSpeedMult;
        cb.velocity.y *= this.cloneSpeedMult;
      }

      // Clone flame body aura position
      if (this.cloneFlameBodyActive && this.cloneFlameBodyAura) {
        this.cloneFlameBodyAura.setPosition(this.clone.x, this.clone.y);
      }

      // Clone geyser buff check
      for (const g of this.geysers) {
        if (g.owner === 'npc' && Phaser.Math.Distance.Between(g.x, g.y, this.clone.x, this.clone.y) <= g.radius) {
          this.cloneGeyserBuffUntil = time + 2000;
        }
      }

      // Clone earth slam
      if (this.cloneEarthSlamActive) {
        if (time >= this.cloneEarthSlamEnd) {
          this.cloneEarthSlamActive = false;
        } else if (!this.cloneEarthSlamHitDealt) {
          const dist = Phaser.Math.Distance.Between(this.clone.x, this.clone.y, this.player.x, this.player.y);
          if (dist <= 60) {
            this.cloneEarthSlamHitDealt = true;
            const slamDmg = Math.max(10, Math.round(this.clone.shieldHp * 0.4));
            this.player.takeDamage(slamDmg);
            this.spawnHitFlash(this.player.x, this.player.y, 0xaa8844);
            this.clone.shieldHp = Math.max(0, this.clone.shieldHp - slamDmg);
          }
        }
      }

      // Clone thorn drag on player
      if (time < this.cloneThornDragActiveUntil && !this.isDodging) {
        const tdx = this.clone.x - this.player.x;
        const tdy = this.clone.y - this.player.y;
        const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const pb2 = this.player.body as Phaser.Physics.Arcade.Body;
        pb2.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);
        this.cloneThornDragTickAccum += delta;
        if (this.cloneThornDragTickAccum >= 250) {
          this.cloneThornDragTickAccum -= 250;
          this.player.takeDamage(3);
          this.spawnHitFlash(this.player.x, this.player.y, 0x44cc44);
        }
        if (this.cloneThornDragAura) this.cloneThornDragAura.setPosition(this.clone.x, this.clone.y);
      } else if (this.cloneThornDragAura && time >= this.cloneThornDragActiveUntil) {
        this.cloneThornDragAura.destroy(); this.cloneThornDragAura = null;
      }

      // Clone wind trap on player
      if (time < this.cloneWindTrapExpiry && !this.isDodging) {
        const trapR = 80;
        const d = Phaser.Math.Distance.Between(this.cloneWindTrapX, this.cloneWindTrapY, this.player.x, this.player.y);
        if (d > trapR) {
          const ang = Phaser.Math.Angle.Between(this.cloneWindTrapX, this.cloneWindTrapY, this.player.x, this.player.y);
          this.player.setPosition(
            this.cloneWindTrapX + Math.cos(ang) * trapR,
            this.cloneWindTrapY + Math.sin(ang) * trapR,
          );
          const playerBodyWind = this.player.body as Phaser.Physics.Arcade.Body;
          const vDotN = playerBodyWind.velocity.x * Math.cos(ang) + playerBodyWind.velocity.y * Math.sin(ang);
          if (vDotN > 0) {
            playerBodyWind.velocity.x -= vDotN * Math.cos(ang);
            playerBodyWind.velocity.y -= vDotN * Math.sin(ang);
          }
        }
      } else if (this.cloneWindTrapSprite && time >= this.cloneWindTrapExpiry) {
        this.cloneWindTrapSprite.destroy(); this.cloneWindTrapSprite = null;
      }

      // Clone water splash drops near player
      if (this.npcElement.id === 'water' && time < this.cloneSplashActiveUntil) {
        this.cloneSplashDropAccum += delta;
        if (this.cloneSplashDropAccum >= 150) {
          this.cloneSplashDropAccum -= 150;
          const missRange = this.npcDifficulty.aimOffsetDeg * 2.2;
          const sx = this.player.x + Phaser.Math.Between(-missRange, missRange);
          const sy = this.player.y + Phaser.Math.Between(-missRange, missRange);
          const spr = this.add.circle(sx, sy, 36, 0x0066bb, 0.5).setDepth(2);
          this.puddles.push({ sprite: spr, expiresAt: time + 1000, x: sx, y: sy, radius: 36, tickAccum: 0, owner: 'npc' });
        }
      }
    }

    // ── Post-AI NPC velocity multiplier ──────────────────────────
    if (this.npcNukeChanneling) {
      (this.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else if (this.npcSpeedMult !== 1) {
      const nb = this.npc.body as Phaser.Physics.Arcade.Body;
      nb.velocity.x *= this.npcSpeedMult;
      nb.velocity.y *= this.npcSpeedMult;
    }

    // ── Wind Trap — player's trap constrains NPC ─────────────────
    if (time < this.playerWindTrapExpiry) {
      // R upgrade: trap follows cursor
      if (this.hasUpgrade('r')) {
        const ptr = this.input.activePointer;
        this.playerWindTrapX = ptr.worldX;
        this.playerWindTrapY = ptr.worldY;
        if (this.playerWindTrapSprite) this.playerWindTrapSprite.setPosition(ptr.worldX, ptr.worldY);
      }
      const trapR = 80;
      const d = Phaser.Math.Distance.Between(this.playerWindTrapX, this.playerWindTrapY, this.npc.x, this.npc.y);
      if (d > trapR) {
        const ang = Phaser.Math.Angle.Between(this.playerWindTrapX, this.playerWindTrapY, this.npc.x, this.npc.y);
        this.npc.setPosition(
          this.playerWindTrapX + Math.cos(ang) * trapR,
          this.playerWindTrapY + Math.sin(ang) * trapR,
        );
        // Don't zero velocity — let the AI keep moving so it slides along the boundary
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        // Reflect the outward component of velocity so NPC bounces along the edge
        const vDotN = nb.velocity.x * Math.cos(ang) + nb.velocity.y * Math.sin(ang);
        if (vDotN > 0) {
          nb.velocity.x -= vDotN * Math.cos(ang);
          nb.velocity.y -= vDotN * Math.sin(ang);
        }
      }
    } else if (this.playerWindTrapSprite) {
      this.playerWindTrapSprite.destroy();
      this.playerWindTrapSprite = null;
    }

    // ── Wind Trap — NPC's trap constrains player ──────────────────
    if (time < this.npcWindTrapExpiry && !this.isDodging) {
      const trapR = 80;
      const d = Phaser.Math.Distance.Between(this.npcWindTrapX, this.npcWindTrapY, this.player.x, this.player.y);
      if (d > trapR) {
        const ang = Phaser.Math.Angle.Between(this.npcWindTrapX, this.npcWindTrapY, this.player.x, this.player.y);
        this.player.setPosition(
          this.npcWindTrapX + Math.cos(ang) * trapR,
          this.npcWindTrapY + Math.sin(ang) * trapR,
        );
        // Cancel only the outward velocity so the player can still move inside
        const vDotN = playerBody.velocity.x * Math.cos(ang) + playerBody.velocity.y * Math.sin(ang);
        if (vDotN > 0) {
          playerBody.velocity.x -= vDotN * Math.cos(ang);
          playerBody.velocity.y -= vDotN * Math.sin(ang);
        }
      }
    } else if (this.npcWindTrapSprite && time >= this.npcWindTrapExpiry) {
      this.npcWindTrapSprite.destroy();
      this.npcWindTrapSprite = null;
    }

    // ── Thorn Drag (player drags NPC) ────────────────────────────
    if (time < this.thornDragActiveUntil) {
      const tdx = mouseX - this.npc.x;
      const tdy = mouseY - this.npc.y;
      const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const npcDragBody = this.npc.body as Phaser.Physics.Arcade.Body;
      npcDragBody.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);

      this.thornDragTickAccum += delta;
      if (this.thornDragTickAccum >= 250) {
        this.thornDragTickAccum -= 250;
        this.npc.takeDamage(3);
        this.spawnHitFlash(this.npc.x, this.npc.y, 0x44cc44);
      }
      if (this.thornDragAura) this.thornDragAura.setPosition(this.player.x, this.player.y);
    } else if (this.thornDragAura) {
      this.thornDragAura.destroy();
      this.thornDragAura = null;
    }

    // ── Thorn Drag (NPC drags player) ────────────────────────────
    if (time < this.npcThornDragActiveUntil && !this.isDodging) {
      const tdx = this.npc.x - this.player.x;
      const tdy = this.npc.y - this.player.y;
      const tdLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const playerDragBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerDragBody.setVelocity((tdx / tdLen) * 220, (tdy / tdLen) * 220);

      this.npcThornDragTickAccum += delta;
      if (this.npcThornDragTickAccum >= 250) {
        this.npcThornDragTickAccum -= 250;
        this.player.takeDamage(3);
        this.spawnHitFlash(this.player.x, this.player.y, 0x44cc44);
      }
      if (this.npcThornDragAura) this.npcThornDragAura.setPosition(this.npc.x, this.npc.y);
    } else if (this.npcThornDragAura && time >= this.npcThornDragActiveUntil) {
      this.npcThornDragAura.destroy();
      this.npcThornDragAura = null;
    }

    // ── Puddle slow (post-AI) ─────────────────────────────────────
    if (this.puddles.length > 0) {
      const playerInPuddle = this.puddles.some(
        (p) => p.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) <= p.radius,
      );
      if (playerInPuddle) {
        const pb = this.player.body as Phaser.Physics.Arcade.Body;
        pb.velocity.x *= 0.5;
        pb.velocity.y *= 0.5;
      }

      const npcInPuddle = this.puddles.some(
        (p) => p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, this.npc.x, this.npc.y) <= p.radius,
      );
      if (npcInPuddle) {
        const nb = this.npc.body as Phaser.Physics.Arcade.Body;
        nb.velocity.x *= 0.5;
        nb.velocity.y *= 0.5;
      }
    }

    // ── Clean up projectiles ──────────────────────────────────────
    const wb = this.physics.world.bounds;
    const allProj = this.projectiles.getChildren().slice() as Projectile[];
    for (const p of allProj) {
      if (!p.active) { p.destroy(); continue; }
      if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
        p.destroy();
      }
    }
    if (this.cloneProjectiles) {
      const cloneProjs = this.cloneProjectiles.getChildren().slice() as Projectile[];
      for (const p of cloneProjs) {
        if (!p.active) { p.destroy(); continue; }
        if (p.x < wb.left - 60 || p.x > wb.right + 60 || p.y < wb.top - 60 || p.y > wb.bottom + 60) {
          p.destroy();
        }
      }
    }

    // ── Update HUD cooldown bars ─────────────────────────────────
    for (const entry of this.abilityBars) {
      if (entry.abilityId === 'flame-body') {
        entry.fill.setSize(this.flameBodyActive ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'water-shield') {
        entry.fill.setSize(this.player.shieldCharges > 0 ? entry.maxWidth : 0, entry.fill.height);
      } else if (entry.abilityId === 'splash') {
        if (time < this.splashActiveUntil) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('splash'), entry.fill.height);
        }
      } else if (entry.abilityId === 'thorn-drag') {
        if (time < this.thornDragActiveUntil) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('thorn-drag'), entry.fill.height);
        }
      } else if (entry.abilityId === 'quick-shot') {
        // Full when charged, otherwise shows cooldown
        if (this.quickShotCharged) {
          entry.fill.setSize(entry.maxWidth, entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('quick-shot'), entry.fill.height);
        }
      } else if (entry.abilityId === 'charged-beam') {
        // Shows hit progress (0-3) when not ready, shows CD progress when ready
        if (this.airConsecutiveHits >= 3) {
          entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio('charged-beam'), entry.fill.height);
        } else {
          entry.fill.setSize(entry.maxWidth * (this.airConsecutiveHits / 3), entry.fill.height);
        }
      } else {
        entry.fill.setSize(entry.maxWidth * this.player.getCooldownRatio(entry.abilityId), entry.fill.height);
      }
    }
  }
}
