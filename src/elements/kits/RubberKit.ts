import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Constants ─────────────────────────────────────────────────────────────────

const PUNCH_MAX_HOLD_MS = 1500;
const PUNCH_MAX_PULL = 72;
const PUNCH_MIN_DMG = 8;
const PUNCH_MAX_DMG = 35;
const PUNCH_REACH = 130;       // max melee reach in pixels
const PUNCH_STRETCH_MS = 130;  // time to fully extend
const PUNCH_HOLD_ANIM_MS = 60; // hold at full extension
const PUNCH_SNAP_MS = 100;     // retract time
const PUNCH_FIST_RADIUS = 40;  // hit detection radius from fist tip

const SLING_MAX_PULL = 130;
const SLING_MIN_SPEED = 400;
const SLING_MAX_SPEED = 860;
const SLING_CONTACT_DMG = 28;
const SLING_FLY_MS = 650;
const SLING_ARM_ANGLE = Math.PI / 4; // 45° each side of cursor

const BOUNCE_FORM_MS = 3000;
const BOUNCE_REFLECT_RADIUS = 50;
const BOUNCE_REFLECT_SPEED = 1.6;

const SPRING_REACH = 115;
const SPRING_EXTEND_MS = 1000;
const SPRING_SWEEP_MS = 180;
const SPRING_LINGER_MS = 500;
const SPRING_HIT_RADIUS = 30;
const SPRING_DMG = 25;
const SPRING_STUN_MS = 1000;
const SPRING_SIZE_MULT = 1.25;
const SPRING_SIZE_MS = 5000;

const BOUNCE_BACK_MS = 5000;
const BOUNCE_BACK_SPEED = 0.2;
const BOUNCE_BACK_SIZE = 1.2;

const BARRAGE_INTERVAL_MS = 120;
const BARRAGE_BASE_MS = 2000;
const BARRAGE_REACH = 110;
const BARRAGE_DMG = 5;
const GEAR_MS = 15000;
const FIREBALL_DOT_BASE_MS = 2000;
const FIREBALL_DOT_BONUS_MS = 1500;

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface RubberArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly width: number;
  readonly height: number;
  readonly pointerWasDown: boolean;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly abilityBars: { fill: Phaser.GameObjects.Rectangle; maxWidth: number }[];
  hasUpgrade(slot: string): boolean;
  hasPerk(perkId: string): boolean;
  setIsDodging(v: boolean): void;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
}

// ── RubberKit ─────────────────────────────────────────────────────────────────

export class RubberKit {
  private readonly arena: RubberArenaApi;

  // Punch (charge)
  private punchHolding = false;
  private punchHoldStart = 0;
  private punchMouseX = 0;
  private punchMouseY = 0;
  private punchFistVisual: Phaser.GameObjects.Rectangle | null = null;

  // Punch (stretch animation — player)
  private punchStretching = false;
  private punchStretchStart = 0;
  private punchStretchDirX = 0;
  private punchStretchDirY = 0;
  private punchStretchDamage = 0;
  private punchStretchMaxReach = PUNCH_REACH;
  private punchStretchHit = false;
  private punchArmGfx: Phaser.GameObjects.Graphics | null = null;

  // Punch (stretch animation — NPC)
  private npcPunchStretching = false;
  private npcPunchStretchStart = 0;
  private npcPunchStretchDirX = 0;
  private npcPunchStretchDirY = 0;
  private npcPunchStretchDamage = 0;
  private npcPunchStretchMaxReach = PUNCH_REACH;
  private npcPunchStretchHit = false;
  private npcPunchArmGfx: Phaser.GameObjects.Graphics | null = null;

  // Slingshot (player)
  private slingState: 'idle' | 'pulling' | 'flying' = 'idle';
  private slingAnchorLX = 0; private slingAnchorLY = 0;
  private slingAnchorRX = 0; private slingAnchorRY = 0;
  private slingCursorAngle = 0;
  private slingGfx: Phaser.GameObjects.Graphics | null = null;
  private slingFlyEnd = 0;
  private slingHitThisFlight: Set<Fighter> = new Set();

  // Slingshot (NPC — simplified: just a contact-damage dash)
  private npcSlingFlyEnd = 0;
  private npcSlingHit: Set<Fighter> = new Set();

  // Bounce Form (player)
  private bounceFormActive = false;
  private bounceFormEnd = 0;
  private bounceFormVisual: Phaser.GameObjects.Rectangle | null = null;

  // Bounce Form (NPC)
  private npcBounceFormActive = false;
  private npcBounceFormEnd = 0;
  private npcBounceFormVisual: Phaser.GameObjects.Rectangle | null = null;

  // Spring Slam (player)
  private springPhase: 'idle' | 'extend' | 'sweep' | 'linger' = 'idle';
  private springPhaseEnd = 0;
  private springSweepStart = 0;
  private springCursorAngle = 0;
  private springGfx: Phaser.GameObjects.Graphics | null = null;
  private springLeftHit: Set<Fighter> = new Set();
  private springRightHit: Set<Fighter> = new Set();
  private springBothApplied: Set<Fighter> = new Set();

  // Spring Slam (NPC)
  private npcSpringPhase: 'idle' | 'extend' | 'sweep' | 'linger' = 'idle';
  private npcSpringPhaseEnd = 0;
  private npcSpringSweepStart = 0;
  private npcSpringCursorAngle = 0;
  private npcSpringGfx: Phaser.GameObjects.Graphics | null = null;
  private npcSpringLeftHit: Set<Fighter> = new Set();
  private npcSpringRightHit: Set<Fighter> = new Set();
  private npcSpringBothApplied: Set<Fighter> = new Set();

  // Bounce Back (player)
  private bounceBackActive = false;
  private bounceBackEnd = 0;
  private bounceBackPrevAbsorber: ((amount: number) => boolean) | null = null;

  // Bounce Back (NPC)
  private npcBounceBackActive = false;
  private npcBounceBackEnd = 0;
  private npcBounceBackPrevAbsorber: ((amount: number) => boolean) | null = null;

  // Vulcanization
  private vulcUnlocked = false;
  private vulcCharging = false;
  private vulcCharge = 0;
  private vulcPlayerCdMultBase = 1;
  private vulcCdMultCaptured = false;
  private vulcSlowTexts: Phaser.GameObjects.Text[] = [];

  // Rubber Gear (Q+)
  private rubberGearActive = false;
  private rubberGearEnd = 0;
  private rubberGearPrevAbsorber: ((amount: number) => boolean) | null = null;
  private rubberGearSteamAccum = 0;

  // Barrage (F+)
  private barrageActive = false;
  private barrageEnd = 0;
  private barrageNext = 0;
  private fKeyWasDown = false;
  private fHoldStart = 0;

  // Fireball Sling (E+)
  private fireballFlight = false;
  private fireballSize = 1;
  private fireballTrailAccum = 0;

  // NPC fire DOT (Fireball Sling + Powerful Parry)
  private npcFireDotUntil = 0;
  private npcFireDotTickAccum = 0;
  private npcFireDotAura: Phaser.GameObjects.Arc | null = null;

  // ── Uber-Gear (perk) ──────────────────────────────────────────────────────
  private uberGearActive = false;
  private uberGearEnd = 0;
  private uberGearSteamAccum = 0;

  // Uber-Gear: Jump Rope (E replacement)
  private uberGearJumpRopeActive = false;
  private uberGearJumpRopeCharges = 0;
  private uberGearJumpRopeEndsAt = 0;
  private uberGearJumpRopeGfx: Phaser.GameObjects.Graphics | null = null;
  private uberGearJumpRopeAy = 0; // y level of the rope (x spans full width)
  // Speed/damage boost from jump rope charges (stacking duration)
  private uberGearJumpRopeBoostUntil = 0;

  // Uber-Gear: Squish (Barrage hit effect)
  private uberGearSquishActive = false;
  private uberGearSquishEndsAt = 0;
  private uberGearSquishSlowPct = 0;

  // Uber-Gear: Dodge stretch
  private uberGearStretchActive = false;
  private uberGearStretchGfx: Phaser.GameObjects.Graphics | null = null;
  private uberGearStretchTarget = { x: 0, y: 0 };
  private uberGearStretchAt = 0;
  private uberGearSizeShrinkUntil = 0;

  // Uber-Gear: Wall-push stars (F double-hit)
  private uberGearStarSprites: Phaser.GameObjects.Arc[] = [];
  private uberGearStarAngle = 0;

  constructor(arena: RubberArenaApi) {
    this.arena = arena;
  }

  // ── reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    const { player, npc } = this.arena;

    this.punchHolding = false;
    this.punchFistVisual?.destroy(); this.punchFistVisual = null;
    player.chargeRatio = 0;

    this.punchStretching = false;
    this.punchArmGfx?.destroy(); this.punchArmGfx = null;
    this.npcPunchStretching = false;
    this.npcPunchArmGfx?.destroy(); this.npcPunchArmGfx = null;

    this.slingState = 'idle';
    this.slingGfx?.destroy(); this.slingGfx = null;
    this.slingHitThisFlight.clear();
    this.npcSlingFlyEnd = 0;
    this.npcSlingHit.clear();

    if (this.bounceFormActive) { player.setVisible(true); player.incomingDamageMultiplier = 1; }
    this.bounceFormActive = false;
    this.bounceFormVisual?.destroy(); this.bounceFormVisual = null;

    if (this.npcBounceFormActive) { npc.setVisible(true); npc.incomingDamageMultiplier = 1; }
    this.npcBounceFormActive = false;
    this.npcBounceFormVisual?.destroy(); this.npcBounceFormVisual = null;

    this.springPhase = 'idle';
    this.springGfx?.destroy(); this.springGfx = null;
    this.springLeftHit.clear(); this.springRightHit.clear(); this.springBothApplied.clear();
    this.npcSpringPhase = 'idle';
    this.npcSpringGfx?.destroy(); this.npcSpringGfx = null;
    this.npcSpringLeftHit.clear(); this.npcSpringRightHit.clear(); this.npcSpringBothApplied.clear();

    if (this.bounceBackActive) {
      player.damageAbsorber = this.bounceBackPrevAbsorber;
      player.sizeMult = 1; player.applySizeMult();
    }
    this.bounceBackActive = false;
    this.bounceBackPrevAbsorber = null;

    if (this.npcBounceBackActive) {
      npc.damageAbsorber = this.npcBounceBackPrevAbsorber;
      npc.sizeMult = 1; npc.applySizeMult();
    }
    this.npcBounceBackActive = false;
    this.npcBounceBackPrevAbsorber = null;

    // Vulcanization
    if (this.vulcCdMultCaptured) player.cooldownMult = this.vulcPlayerCdMultBase;
    player.clearTint();
    for (const t of this.vulcSlowTexts) t.destroy();
    this.vulcSlowTexts = [];
    this.vulcUnlocked = this.ownsAnyRubberUpgrade();
    this.vulcCharging = false;
    this.vulcCharge = 0;
    this.vulcCdMultCaptured = false;
    this.vulcPlayerCdMultBase = 1;

    // Rubber Gear
    if (this.rubberGearActive) player.damageAbsorber = this.rubberGearPrevAbsorber;
    this.rubberGearActive = false;
    this.rubberGearEnd = 0;
    this.rubberGearPrevAbsorber = null;
    this.rubberGearSteamAccum = 0;

    // Barrage
    this.barrageActive = false;
    this.fKeyWasDown = false;
    this.fHoldStart = 0;

    // Fireball Sling
    if (this.fireballFlight) { player.sizeMult = 1; player.applySizeMult(); }
    this.fireballFlight = false;
    this.fireballSize = 1;
    this.fireballTrailAccum = 0;

    // NPC fire DOT
    this.npcFireDotUntil = 0;
    this.npcFireDotTickAccum = 0;
    this.npcFireDotAura?.destroy();
    this.npcFireDotAura = null;

    // Uber-Gear
    if (this.uberGearActive) {
      player.clearTint();
      player.sizeMult = 1; player.applySizeMult();
    }
    this.uberGearActive = false;
    this.uberGearEnd = 0;
    this.uberGearSteamAccum = 0;
    this.uberGearJumpRopeGfx?.destroy(); this.uberGearJumpRopeGfx = null;
    this.uberGearJumpRopeActive = false;
    this.uberGearJumpRopeCharges = 0;
    this.uberGearJumpRopeEndsAt = 0;
    this.uberGearJumpRopeBoostUntil = 0;
    this.uberGearSquishActive = false;
    this.uberGearSquishEndsAt = 0;
    this.uberGearSquishSlowPct = 0;
    if (this.uberGearSquishActive) { npc.setScale(1); }
    this.uberGearStretchGfx?.destroy(); this.uberGearStretchGfx = null;
    this.uberGearStretchActive = false;
    this.uberGearSizeShrinkUntil = 0;
    for (const s of this.uberGearStarSprites) s.destroy();
    this.uberGearStarSprites = [];
  }

  private ownsAnyRubberUpgrade(): boolean {
    return ['click', 'e', 'r', 'f', 'q'].some(s => this.arena.hasUpgrade(s));
  }

  // ── handleInput (called every frame for player element) ───────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { player, scene } = this.arena;
    this.punchMouseX = mouseX;
    this.punchMouseY = mouseY;

    const justPressed = pointer.isDown && !this.arena.pointerWasDown;
    const justReleased = !pointer.isDown && this.arena.pointerWasDown;

    // Right-click vulcanization (disabled while Uber-Gear active)
    const rightDown = pointer.rightButtonDown();
    if (this.vulcUnlocked && !this.bounceFormActive && !this.bounceBackActive && !this.rubberGearActive && !this.barrageActive && !this.uberGearActive && this.vulcCharge < 1) {
      this.vulcCharging = rightDown;
    } else {
      this.vulcCharging = false;
    }

    const blocked = this.bounceFormActive || this.bounceBackActive || this.vulcCharging || this.barrageActive;

    // ── Punch: hold click to charge, release to fire ─────────────────────────
    // While Uber-Gear + Jump Rope active: left-click releases rope instead
    if (this.uberGearActive && this.uberGearJumpRopeActive && justPressed) {
      this.releaseUberGearJumpRope(mouseX, mouseY, time);
    } else if (this.slingState === 'idle' && !blocked) {
      if (justPressed && time >= player.disarmedUntil) {
        this.punchHolding = true;
        this.punchHoldStart = time;
        this.punchFistVisual?.destroy();
        this.punchFistVisual = scene.add
          .rectangle(player.x, player.y, 18, 12, 0xff5577)
          .setStrokeStyle(2, 0xffaacc).setDepth(7);
      }
      if (justReleased && this.punchHolding) {
        this.punchHolding = false;
        if (time >= player.disarmedUntil) {
          const holdMs = time - this.punchHoldStart;
          const resistance = this.arena.hasUpgrade('click') ? (1 + this.vulcCharge) : 1;
          // Uber-Gear: punch charges twice as fast (halve effective hold time)
          const uberHoldMs = this.uberGearActive ? holdMs * 2 : holdMs;
          const pullRatio = Math.min(1, (uberHoldMs / resistance) / PUNCH_MAX_HOLD_MS);
          const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
          player.castAbility('rubber-punch', ctx);
          this.startStretchPunch('player', mouseX, mouseY, pullRatio);
        }
        this.punchFistVisual?.destroy(); this.punchFistVisual = null;
        player.chargeRatio = 0;
      }
    } else if (this.slingState !== 'idle' && justReleased) {
      // Cancel punch state if sling is active
      if (this.punchHolding) {
        this.punchHolding = false;
        this.punchFistVisual?.destroy(); this.punchFistVisual = null;
        player.chargeRatio = 0;
      }
    }

    // ── Sling: detect mouse release during 'pulling' phase ───────────────────
    if (this.slingState === 'pulling' && justReleased) {
      this.releaseSling(mouseX, mouseY, time);
    }

    // ── E / R / F / Q abilities ───────────────────────────────────────────────
    const { eKey, rKey, fKey, qKey } = this.arena;

    // Uber-Gear E: Jump Rope instead of Slingshot
    if (Phaser.Input.Keyboard.JustDown(eKey) && !blocked && time >= player.disarmedUntil) {
      if (this.uberGearActive) {
        if (!this.uberGearJumpRopeActive) {
          this.doUberGearJumpRope(time);
        }
      } else {
        player.castAbility('rubber-sling', this.arena.buildPlayerContext(mouseX, mouseY));
      }
    }

    if (Phaser.Input.Keyboard.JustDown(rKey) && !blocked && time >= player.disarmedUntil) {
      player.castAbility('rubber-bounce-form', this.arena.buildPlayerContext(mouseX, mouseY));
    }

    // F: tap = Spring Slam; hold 1s+ = Barrage (F+ required for barrage)
    if (fKey.isDown && !this.fKeyWasDown) {
      if (!blocked && this.springPhase === 'idle' && time >= player.disarmedUntil) {
        this.fHoldStart = time;
      } else {
        this.fHoldStart = 0;
      }
    }
    if (!fKey.isDown && this.fKeyWasDown && this.fHoldStart > 0) {
      const heldMs = time - this.fHoldStart;
      if (!blocked && this.springPhase === 'idle') {
        if (this.arena.hasUpgrade('f') && heldMs >= 1000) {
          this.startBarrage(time, mouseX, mouseY);
        } else {
          player.castAbility('rubber-spring-slam', this.arena.buildPlayerContext(mouseX, mouseY));
        }
      }
      this.fHoldStart = 0;
    }
    this.fKeyWasDown = fKey.isDown;

    // Q: Uber-Gear perk overrides Bounce Back
    if (Phaser.Input.Keyboard.JustDown(qKey) && !blocked && time >= player.disarmedUntil && !this.rubberGearActive && !this.uberGearActive) {
      if (this.arena.hasPerk('uber-gear')) {
        this.doUberGear(time);
      } else {
        player.castAbility('rubber-bounce-back', this.arena.buildPlayerContext(mouseX, mouseY));
      }
    }
  }

  // ── Uber-Gear dodge suppress (checked in ArenaScene before normal dodge) ──
  shouldSuppressUberGearDodge(mouseX: number, mouseY: number, time: number): boolean {
    if (!this.uberGearActive) return false;
    // If near jump rope, grant a charge instead of dodging
    if (this.uberGearJumpRopeActive) {
      const distToRope = Math.abs(this.arena.player.y - this.uberGearJumpRopeAy);
      if (distToRope < 30) {
        this.uberGearJumpRopeCharges++;
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '+1 ⚡', '#ffcc00');
        return true;
      }
    }
    // Otherwise: stretch-teleport dodge
    if (!this.uberGearStretchActive) {
      this.doUberGearStretch(mouseX, mouseY, time);
    }
    return true;
  }

  // ── applySlingMovement: called from ArenaScene when sling is pulling ───────

  applySlingMovement(mouseX: number, mouseY: number): void {
    if (this.slingState !== 'pulling') return;
    const { player } = this.arena;

    // Midpoint of the two wall anchors (the "handle" of the slingshot)
    const midX = (this.slingAnchorLX + this.slingAnchorRX) / 2;
    const midY = (this.slingAnchorLY + this.slingAnchorRY) / 2;

    // Clamped pull target: mouse position, capped at SLING_MAX_PULL from mid
    let targetX = mouseX;
    let targetY = mouseY;
    const dx = targetX - midX;
    const dy = targetY - midY;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > SLING_MAX_PULL) {
      targetX = midX + (dx / d) * SLING_MAX_PULL;
      targetY = midY + (dy / d) * SLING_MAX_PULL;
    }

    // Move player toward target at high speed
    const pdx = targetX - player.x;
    const pdy = targetY - player.y;
    const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
    if (pd > 3) {
      const spd = Math.min(pd * 8, 900);
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(
        (pdx / pd) * spd, (pdy / pd) * spd,
      );
    } else {
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  // ── update (called every frame when rubber is either player or NPC) ────────

  update(time: number, delta: number): void {
    const { player, npc } = this.arena;

    // Punch stretch animations
    this.updateStretchPunch(time, 'player');
    this.updateStretchPunch(time, 'npc');

    // Punch fist visual tracks behind player
    if (this.punchHolding && this.punchFistVisual) {
      const holdMs = time - this.punchHoldStart;
      const resistance = this.arena.hasUpgrade('click') ? (1 + this.vulcCharge) : 1;
      const pullRatio = Math.min(1, (holdMs / resistance) / PUNCH_MAX_HOLD_MS);
      const pullLen = PUNCH_MAX_PULL * Math.sqrt(pullRatio);
      const dx = this.punchMouseX - player.x;
      const dy = this.punchMouseY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Fist pulls toward mouse; release fires in the opposite direction
      this.punchFistVisual.setPosition(
        player.x + (dx / dist) * pullLen,
        player.y + (dy / dist) * pullLen,
      );
      player.chargeRatio = pullRatio;
    }

    // Sling arm visual (always update when state isn't idle)
    if (this.slingState === 'pulling') {
      this.drawSlingArms();
    } else if (this.slingGfx && this.slingState === 'idle') {
      this.slingGfx.destroy(); this.slingGfx = null;
    }

    // Sling flight contact damage
    if (this.slingState === 'flying') {
      if (time > this.slingFlyEnd) {
        this.endSlingFlight();
      } else {
        this.checkSlingContact('player', time);
      }
    }
    if (time < this.npcSlingFlyEnd) {
      this.checkSlingContact('npc', time);
    }

    // Bounce Form
    this.updateBounceForm(time, 'player');
    this.updateBounceForm(time, 'npc');
    this.steerHomingProjectiles();

    // Spring Slam
    this.updateSpringSlam(time, 'player');
    this.updateSpringSlam(time, 'npc');

    // Bounce Back: apply speed mult every frame while active
    if (this.bounceBackActive) {
      this.arena.applyPlayerSpeedMult(BOUNCE_BACK_SPEED);
      if (time > this.bounceBackEnd) this.expireBounceBack('player');
    }
    if (this.npcBounceBackActive) {
      this.arena.applyNpcSpeedMult(BOUNCE_BACK_SPEED);
      if (time > this.npcBounceBackEnd) this.expireBounceBack('npc');
    }

    // Vulcanization: charge accumulation + cooldown mult + tint + slow HUD
    if (this.vulcCharging) {
      this.vulcCharge = Math.min(1, this.vulcCharge + (delta / 1000) * 0.05);
    }
    if (this.vulcUnlocked) {
      if (!this.vulcCdMultCaptured) {
        this.vulcPlayerCdMultBase = player.cooldownMult;
        this.vulcCdMultCaptured = true;
      }
      const gearSpeedFactor = this.rubberGearActive ? 0.5 : 0;
      const netFactor = Math.max(0.5, 1 + this.vulcCharge - gearSpeedFactor);
      // Uber-Gear + Vulc: no cooldown penalties
      if (this.uberGearActive) {
        player.cooldownMult = this.vulcPlayerCdMultBase;
      } else {
        player.cooldownMult = this.vulcPlayerCdMultBase * netFactor;
      }
      if (this.uberGearActive) {
        player.setTint(0xffffff);
      } else if (this.rubberGearActive) {
        player.setTint(0xffaadd);
      } else if (this.vulcCharge > 0) {
        const v = Math.round(255 * (1 - 0.7 * this.vulcCharge));
        player.setTint(Phaser.Display.Color.GetColor(v, v, v));
      } else {
        player.clearTint();
      }
      // Lazy-create HUD slow texts once abilityBars is populated
      if (this.vulcSlowTexts.length === 0 && this.arena.abilityBars.length > 0) {
        for (const entry of this.arena.abilityBars) {
          const cx = entry.fill.x + entry.maxWidth / 2;
          const t = this.arena.scene.add.text(cx, entry.fill.y, '', {
            fontFamily: 'monospace', fontSize: '10px', color: '#ff4444', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
          }).setOrigin(0.5, 0.5).setDepth(25).setVisible(false);
          this.vulcSlowTexts.push(t);
        }
      }
      if (this.vulcSlowTexts.length > 0) {
        const displayFactor = this.uberGearActive ? 1 : netFactor;
        const netPct = Math.round((displayFactor - 1) * 100);
        for (const t of this.vulcSlowTexts) {
          if (netPct > 0) { t.setText(`${netPct}% slower`); t.setColor('#ff4444'); t.setVisible(true); }
          else if (netPct < 0) { t.setText(`${Math.abs(netPct)}% faster`); t.setColor('#44ff88'); t.setVisible(true); }
          else { t.setVisible(false); }
        }
      }
    }

    // Rubber Gear: speed buff + steam particles + expiry
    if (this.rubberGearActive) {
      this.arena.applyPlayerSpeedMult(1.5);
      this.rubberGearSteamAccum += delta;
      if (this.rubberGearSteamAccum >= 80) {
        this.rubberGearSteamAccum -= 80;
        const sc = this.arena.scene;
        const arc = sc.add.circle(
          player.x + (Math.random() - 0.5) * 20,
          player.y - 16 + (Math.random() - 0.5) * 8,
          4 + Math.random() * 4,
          0xffddee, 0.7,
        ).setDepth(6);
        sc.tweens.add({ targets: arc, y: arc.y - 25, alpha: 0, duration: 400 + Math.random() * 200, onComplete: () => arc.destroy() });
      }
      if (time > this.rubberGearEnd) this.expireRubberGear();
    }

    // Uber-Gear form: speed boost + steam + expiry + all sub-systems
    if (this.uberGearActive) {
      this.arena.applyPlayerSpeedMult(2.0); // +100% speed
      // Steam clouds (same as Rubber Gear)
      this.uberGearSteamAccum += delta;
      if (this.uberGearSteamAccum >= 80) {
        this.uberGearSteamAccum -= 80;
        const sc = this.arena.scene;
        const arc = sc.add.circle(
          player.x + (Math.random() - 0.5) * 20,
          player.y - 16 + (Math.random() - 0.5) * 8,
          4 + Math.random() * 4,
          0xddddff, 0.7,
        ).setDepth(6);
        sc.tweens.add({ targets: arc, y: arc.y - 25, alpha: 0, duration: 400 + Math.random() * 200, onComplete: () => arc.destroy() });
      }
      // Check expiry
      if (time > this.uberGearEnd) {
        this.expireUberGear(time);
      } else {
        // Jump Rope update
        if (this.uberGearJumpRopeActive) {
          if (time >= this.uberGearJumpRopeEndsAt) {
            this.uberGearJumpRopeGfx?.destroy();
            this.uberGearJumpRopeGfx = null;
            this.uberGearJumpRopeActive = false;
          } else {
            const gfx = this.uberGearJumpRopeGfx;
            if (gfx) {
              gfx.clear();
              gfx.lineStyle(3, 0xffaaaa, 0.9);
              gfx.beginPath();
              gfx.moveTo(0, this.uberGearJumpRopeAy);
              gfx.lineTo(this.arena.width, this.uberGearJumpRopeAy);
              gfx.strokePath();
            }
          }
        }
        // Squish update (Barrage hit effect on NPC)
        if (this.uberGearSquishActive) {
          if (time >= this.uberGearSquishEndsAt || !npc.active) {
            npc.setScale(1);
            this.uberGearSquishActive = false;
            this.uberGearSquishSlowPct = 0;
          } else {
            const slowFactor = Math.min(this.uberGearSquishSlowPct / 100, 0.8);
            const scaleX = 1.2 + slowFactor * 0.3;
            const scaleY = Math.max(0.2, 0.6 - slowFactor * 0.3);
            npc.setScale(scaleX, scaleY);
            // Apply slow: reduce npc speed each frame via applyNpcSpeedMult
            this.arena.applyNpcSpeedMult(1 - slowFactor);
          }
        }
        // Star sprites orbit NPC head
        if (this.uberGearStarSprites.length > 0) {
          this.uberGearStarAngle += delta * 0.005;
          for (let i = 0; i < this.uberGearStarSprites.length; i++) {
            const a = this.uberGearStarAngle + (i * Math.PI * 2 / this.uberGearStarSprites.length);
            this.uberGearStarSprites[i].setPosition(npc.x + Math.cos(a) * 24, npc.y - 28 + Math.sin(a) * 8);
          }
        }
        // Stretch teleport update
        if (this.uberGearStretchActive && this.uberGearStretchGfx) {
          this.uberGearStretchGfx.clear();
          this.uberGearStretchGfx.lineStyle(6, 0xffaaaa, 0.7);
          this.uberGearStretchGfx.beginPath();
          this.uberGearStretchGfx.moveTo(player.x, player.y);
          this.uberGearStretchGfx.lineTo(this.uberGearStretchTarget.x, this.uberGearStretchTarget.y);
          this.uberGearStretchGfx.strokePath();
          if (time >= this.uberGearStretchAt + 500) {
            // Teleport
            player.setPosition(this.uberGearStretchTarget.x, this.uberGearStretchTarget.y);
            this.uberGearStretchGfx.destroy();
            this.uberGearStretchGfx = null;
            this.uberGearStretchActive = false;
            // Size shrink for 3s
            this.uberGearSizeShrinkUntil = time + 3000;
            if (player.sizeMult > 0.75) {
              player.sizeMult = 0.75;
              player.applySizeMult();
            }
          }
        }
        // Restore size after shrink
        if (!this.uberGearStretchActive && this.uberGearSizeShrinkUntil > 0 && time >= this.uberGearSizeShrinkUntil) {
          this.uberGearSizeShrinkUntil = 0;
          player.sizeMult = 1;
          player.applySizeMult();
        }
      }
    } else {
      // Restore squish/stars/stretch if uber-gear ended abruptly
      if (this.uberGearSquishActive) {
        npc.setScale(1);
        this.uberGearSquishActive = false;
        this.uberGearSquishSlowPct = 0;
      }
    }

    // Uber-Gear Jump Rope boost: +50% speed while boost is active
    if (this.uberGearJumpRopeBoostUntil > 0 && time < this.uberGearJumpRopeBoostUntil) {
      this.arena.applyPlayerSpeedMult(1.5);
    } else if (this.uberGearJumpRopeBoostUntil > 0 && time >= this.uberGearJumpRopeBoostUntil) {
      this.uberGearJumpRopeBoostUntil = 0;
    }

    // Barrage: lock movement (unless Uber-Gear active) + fire fists + expiry
    if (this.barrageActive) {
      if (!this.uberGearActive) this.arena.applyPlayerSpeedMult(0);
      if (time > this.barrageEnd) {
        this.barrageActive = false;
      } else if (time >= this.barrageNext) {
        this.barrageNext = time + BARRAGE_INTERVAL_MS;
        this.fireBarrageFist();
      }
    }

    // Fireball trail
    if (this.fireballFlight && this.slingState === 'flying') {
      this.fireballTrailAccum += delta;
      if (this.fireballTrailAccum >= 30) {
        this.fireballTrailAccum -= 30;
        const sc = this.arena.scene;
        const arc = sc.add.circle(player.x, player.y, 8 * this.fireballSize, 0xff7733, 0.7).setDepth(5);
        sc.tweens.add({ targets: arc, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 350, onComplete: () => arc.destroy() });
      }
    }

    // NPC fire DOT (from Fireball Sling + Powerful Parry)
    const nowMs = time;
    if (this.npcFireDotUntil > nowMs) {
      if (!this.npcFireDotAura) {
        this.npcFireDotAura = this.arena.scene.add.circle(npc.x, npc.y, 26, 0xff4400, 0.3).setDepth(7);
      }
      this.npcFireDotAura.setPosition(npc.x, npc.y);
      this.npcFireDotTickAccum += delta;
      if (this.npcFireDotTickAccum >= 500) {
        this.npcFireDotTickAccum -= 500;
        npc.takeDamage(2);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xff4400);
        this.arena.spawnDamageNumber(npc.x, npc.y - 20, 2);
      }
    } else {
      this.npcFireDotTickAccum = 0;
      if (this.npcFireDotAura) { this.npcFireDotAura.destroy(); this.npcFireDotAura = null; }
    }

    void delta;
  }

  // ── do* methods called from CastContext ───────────────────────────────────

  doRubberPunch(tx: number, ty: number, pullRatio: number, owner: 'player' | 'npc'): void {
    if (owner === 'npc') {
      this.startStretchPunch('npc', tx, ty, pullRatio);
    }
    // Player punch is fired in handleInput on release; the cast() here just starts cooldown
  }

  doRubberSlingShotStart(cursorAngle: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;

    if (owner === 'npc') {
      // NPC simplification: dash toward player with contact-damage window
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ctx = this.arena.buildNpcContext(player.x, player.y);
      ctx.dashCaster((dx / dist) * SLING_MAX_SPEED * 0.75, (dy / dist) * SLING_MAX_SPEED * 0.75);
      this.npcSlingFlyEnd = time + SLING_FLY_MS;
      this.npcSlingHit.clear();
      return;
    }

    // Player: compute V-anchors and enter pulling state
    const { ax, ay, bx, by } = this.computeSlingAnchors(player.x, player.y, cursorAngle);
    this.slingAnchorLX = ax; this.slingAnchorLY = ay;
    this.slingAnchorRX = bx; this.slingAnchorRY = by;
    this.slingCursorAngle = cursorAngle;
    this.slingState = 'pulling';
    this.slingGfx?.destroy();
    this.slingGfx = this.arena.scene.add.graphics().setDepth(7);
    this.slingHitThisFlight.clear();
    this.arena.showFloatingText(player.x, player.y - 40, '🪀 SLING SET', '#ff5577');
  }

  doRubberSlingShotRelease(_vx: number, _vy: number, _owner: 'player' | 'npc'): void {
    // Release is driven by mouse-up detection in handleInput for the player,
    // and by the dash in doRubberSlingShotStart for the NPC — nothing to do here.
  }

  doRubberBounceForm(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;

    caster.setVisible(false);
    caster.incomingDamageMultiplier = 0;

    const vis = scene.add
      .rectangle(caster.x, caster.y, 96, 16, 0xff5577)
      .setStrokeStyle(3, 0xffaacc).setDepth(8);

    if (owner === 'player') {
      this.bounceFormVisual?.destroy();
      this.bounceFormActive = true;
      this.bounceFormEnd = time + BOUNCE_FORM_MS;
      this.bounceFormVisual = vis;
      this.arena.showFloatingText(caster.x, caster.y - 40, '🔲 BOUNCE FORM', '#ff5577');
      // Uber-Gear: R cooldown ÷ 5 (reduce by 80% of normal 8000ms = 6400ms)
      if (this.uberGearActive) {
        const BOUNCE_FORM_CD = 8000;
        player.reduceCooldown('rubber-bounce-form', BOUNCE_FORM_CD * 0.8);
      }
    } else {
      this.npcBounceFormVisual?.destroy();
      this.npcBounceFormActive = true;
      this.npcBounceFormEnd = time + BOUNCE_FORM_MS;
      this.npcBounceFormVisual = vis;
    }
  }

  doRubberSpringSlam(cursorAngle: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;

    const gfx = scene.add.graphics().setDepth(8);

    if (owner === 'player') {
      this.springGfx?.destroy();
      this.springPhase = 'extend';
      this.springPhaseEnd = time + SPRING_EXTEND_MS;
      this.springCursorAngle = cursorAngle;
      this.springGfx = gfx;
      this.springLeftHit.clear(); this.springRightHit.clear(); this.springBothApplied.clear();
      this.arena.showFloatingText(caster.x, caster.y - 40, '💥 SPRING SLAM', '#ff5577');
    } else {
      this.npcSpringGfx?.destroy();
      this.npcSpringPhase = 'extend';
      this.npcSpringPhaseEnd = time + SPRING_EXTEND_MS;
      this.npcSpringCursorAngle = cursorAngle;
      this.npcSpringGfx = gfx;
      this.npcSpringLeftHit.clear(); this.npcSpringRightHit.clear(); this.npcSpringBothApplied.clear();
    }
  }

  doRubberBounceBack(owner: 'player' | 'npc'): void {
    if (owner === 'player' && this.arena.hasUpgrade('q') && !this.rubberGearActive) {
      this.doRubberGear(this.arena.scene.time.now);
      return;
    }

    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? npc : player;

    const prevAbsorber = caster.damageAbsorber;
    const arena = this.arena;

    caster.damageAbsorber = (amount: number) => {
      target.takeDamage(amount);
      if (owner === 'player') {
        arena.showFloatingText(caster.x, caster.y - 30, `↩ ${amount}`, '#ff5577');
      }
      return true;
    };
    caster.sizeMult = BOUNCE_BACK_SIZE; caster.applySizeMult();

    if (owner === 'player') {
      this.bounceBackActive = true;
      this.bounceBackEnd = time + BOUNCE_BACK_MS;
      this.bounceBackPrevAbsorber = prevAbsorber;
      this.arena.showFloatingText(caster.x, caster.y - 55, '🛡 BOUNCE BACK', '#ff5577');
    } else {
      this.npcBounceBackActive = true;
      this.npcBounceBackEnd = time + BOUNCE_BACK_MS;
      this.npcBounceBackPrevAbsorber = prevAbsorber;
    }

    void scene;
  }

  // ── Public accessors for ArenaScene ───────────────────────────────────────

  isSlingActive(): boolean { return this.slingState !== 'idle'; }
  isBounceFormActive(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.bounceFormActive : this.npcBounceFormActive;
  }
  isBounceBackActive(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.bounceBackActive : this.npcBounceBackActive;
  }
  isSpringActive(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.springPhase !== 'idle' : this.npcSpringPhase !== 'idle';
  }

  // ── Public: NPC fire DOT extension (called from ArenaScene.applyProjectileToNpc) ──

  applyNpcFireDot(durationMs: number): void {
    this.npcFireDotUntil = Math.max(this.npcFireDotUntil, this.arena.scene.time.now + durationMs);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private doRubberGear(time: number): void {
    const { player, npc } = this.arena;
    this.rubberGearPrevAbsorber = player.damageAbsorber;
    this.rubberGearActive = true;
    this.rubberGearEnd = time + GEAR_MS;
    player.damageAbsorber = (amount: number) => {
      const reflected = Math.ceil(amount * 0.25);
      npc.takeDamage(reflected);
      this.arena.spawnDamageNumber(npc.x, npc.y - 24, -2);
      this.arena.showFloatingText(player.x, player.y - 30, `↩ ${reflected}`, '#ffccdd');
      return false;
    };
    this.arena.showFloatingText(player.x, player.y - 55, '⚙ RUBBER GEAR', '#ffccdd');
  }

  private expireRubberGear(): void {
    this.arena.player.damageAbsorber = this.rubberGearPrevAbsorber;
    this.rubberGearActive = false;
    this.rubberGearPrevAbsorber = null;
  }

  // ── Uber-Gear helpers ──────────────────────────────────────────────────────

  private doUberGear(time: number): void {
    const { player } = this.arena;
    this.uberGearActive = true;
    const duration = this.arena.hasUpgrade('q') ? 15000 : 10000;
    this.uberGearEnd = time + duration;
    this.uberGearSteamAccum = 0;
    player.setTint(0xffffff);
    this.arena.showFloatingText(player.x, player.y - 48, '☁️ UBER-GEAR!', '#ffffff');
  }

  private expireUberGear(time: number): void {
    const { player, npc, scene } = this.arena;
    this.uberGearActive = false;
    player.clearTint();
    // Kill or heavily damage player at end
    if (this.arena.hasUpgrade('q')) {
      player.takeDamage(80);
      this.arena.showFloatingText(player.x, player.y - 40, '💥 -80', '#ff5577');
    } else {
      player.hp = 0;
      player.emit('defeated');
    }
    // Cleanup jump rope
    this.uberGearJumpRopeGfx?.destroy();
    this.uberGearJumpRopeGfx = null;
    this.uberGearJumpRopeActive = false;
    this.uberGearJumpRopeCharges = 0;
    // Cleanup squish
    if (this.uberGearSquishActive) { npc.setScale(1); }
    this.uberGearSquishActive = false;
    this.uberGearSquishSlowPct = 0;
    // Cleanup stars
    for (const s of this.uberGearStarSprites) s.destroy();
    this.uberGearStarSprites = [];
    // Cleanup stretch
    this.uberGearStretchGfx?.destroy();
    this.uberGearStretchGfx = null;
    this.uberGearStretchActive = false;
    // Restore size if shrunken
    if (this.uberGearSizeShrinkUntil > 0) {
      this.uberGearSizeShrinkUntil = 0;
      player.sizeMult = 1;
      player.applySizeMult();
    }
    void scene;
    void time;
  }

  private doUberGearJumpRope(time: number): void {
    const { scene, player, width } = this.arena;
    this.uberGearJumpRopeAy = player.y;
    this.uberGearJumpRopeActive = true;
    this.uberGearJumpRopeCharges = 0;
    this.uberGearJumpRopeEndsAt = time + 8000;
    this.uberGearJumpRopeGfx?.destroy();
    this.uberGearJumpRopeGfx = scene.add.graphics().setDepth(6);
    this.arena.showFloatingText(player.x, player.y - 40, '🪢 JUMP ROPE', '#ffaaaa');
    void width;
  }

  private releaseUberGearJumpRope(mouseX: number, mouseY: number, time: number): void {
    const { player, scene } = this.arena;
    const charges = this.uberGearJumpRopeCharges;
    // Destroy rope
    this.uberGearJumpRopeGfx?.destroy();
    this.uberGearJumpRopeGfx = null;
    this.uberGearJumpRopeActive = false;
    // Launch toward cursor like a slingshot
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = SLING_MIN_SPEED + (SLING_MAX_SPEED - SLING_MIN_SPEED) * 0.7;
    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    ctx.dashCaster((dx / dist) * speed, (dy / dist) * speed);
    this.arena.setIsDodging(true);
    this.slingState = 'flying';
    this.slingFlyEnd = time + SLING_FLY_MS;
    this.slingHitThisFlight.clear();
    // Convert each charge into 3s of speed + damage boost (stacking duration)
    if (charges > 0) {
      this.uberGearJumpRopeBoostUntil = Math.max(this.uberGearJumpRopeBoostUntil, time) + charges * 3000;
      this.arena.showFloatingText(player.x, player.y - 48, `⚡ x${charges} BOOST!`, '#ffcc00');
    }
    void scene;
  }

  private doUberGearStretch(mouseX: number, mouseY: number, time: number): void {
    if (this.uberGearStretchActive) return;
    this.uberGearStretchActive = true;
    this.uberGearStretchTarget = { x: mouseX, y: mouseY };
    this.uberGearStretchAt = time;
    this.uberGearStretchGfx = this.arena.scene.add.graphics().setDepth(12);
  }

  private startBarrage(time: number, mouseX: number, mouseY: number): void {
    const { player } = this.arena;
    player.startCooldown('rubber-spring-slam');
    this.barrageActive = true;
    this.barrageEnd = time + BARRAGE_BASE_MS * (1 + this.vulcCharge);
    this.barrageNext = time;
    this.arena.showFloatingText(player.x, player.y - 36, '👊 BARRAGE', '#ff5577');
  }

  private fireBarrageFist(): void {
    const { player, scene } = this.arena;
    const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [this.arena.npc];

    // Aim toward nearest target
    let baseDirX = player.flipX ? -1 : 1; let baseDirY = 0;
    let tgtX = player.x + baseDirX * BARRAGE_REACH; let tgtY = player.y;
    let minDist = Infinity;
    for (const t of targets) {
      if (!t.active) continue;
      const dx = t.x - player.x; const dy = t.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; baseDirX = dx / dist; baseDirY = dy / dist; tgtX = t.x; tgtY = t.y; }
    }
    // Perpendicular axis for lateral scatter
    const perpX = -baseDirY; const perpY = baseDirX;

    // Uber-Gear: fists spawn from screen edges aimed at target
    const uberGear = this.uberGearActive;
    const worldW = this.arena.width;
    const worldH = this.arena.height;

    // 3 fists per burst, staggered 25ms apart — each at a random lateral position
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 25, () => {
        if (!this.barrageActive && i > 0) return; // stop if barrage ended mid-burst
        const lateral = (Math.random() - 0.5) * 90;   // ±45px sideways around target
        const depth   = (Math.random() - 0.5) * 30;   // ±15px forward/back
        const fistX = tgtX + perpX * lateral + baseDirX * depth;
        const fistY = tgtY + perpY * lateral + baseDirY * depth;

        let originX: number;
        let originY: number;
        if (uberGear) {
          // Spawn from a random screen edge
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) { originX = 0; originY = tgtY + lateral; }
          else if (edge === 1) { originX = worldW; originY = tgtY + lateral; }
          else if (edge === 2) { originX = tgtX + lateral; originY = 0; }
          else { originX = tgtX + lateral; originY = worldH; }
        } else {
          const originLateral = lateral * 0.15;
          originX = player.x + perpX * originLateral;
          originY = player.y + perpY * originLateral;
        }

        const armColor = this.vulcArmColor();
        const gfx = scene.add.graphics().setDepth(8);
        gfx.lineStyle(5, armColor, 0.9);
        gfx.beginPath(); gfx.moveTo(originX, originY); gfx.lineTo(fistX, fistY); gfx.strokePath();
        gfx.fillStyle(0xffaacc, 1);
        gfx.fillCircle(fistX, fistY, 10);

        for (const tgt of targets) {
          if (!tgt.active) continue;
          if (Phaser.Math.Distance.Between(fistX, fistY, tgt.x, tgt.y) < PUNCH_FIST_RADIUS + 10) {
            tgt.takeDamage(BARRAGE_DMG);
            this.arena.spawnHitFlash(fistX, fistY, 0xff5577);
            this.arena.spawnDamageNumber(tgt.x, tgt.y - 20, BARRAGE_DMG);
            // Uber-Gear: track squish slow accumulation
            if (uberGear && this.uberGearSquishActive) {
              this.uberGearSquishSlowPct = Math.min(80, this.uberGearSquishSlowPct + BARRAGE_DMG);
            }
            // Uber-Gear: start squish on first hit
            if (uberGear && !this.uberGearSquishActive) {
              const nowMs = scene.time.now;
              this.uberGearSquishActive = true;
              this.uberGearSquishEndsAt = nowMs + 5000;
              this.uberGearSquishSlowPct = BARRAGE_DMG;
              tgt.setScale(1.2, 0.6);
              this.arena.showFloatingText(tgt.x, tgt.y - 36, '💥 SQUISH!', '#ffaaaa');
            }
            break;
          }
        }

        scene.time.delayedCall(80 + Math.random() * 60, () => { gfx.destroy(); });
      });
    }
  }

  private vulcArmColor(): number {
    if (this.vulcCharge <= 0) return 0xff5577;
    const v = 1 - 0.7 * this.vulcCharge;
    const r = Math.round(0xff * v);
    const g = Math.round(0x55 * v);
    const b = Math.round(0x77 * v);
    return (r << 16) | (g << 8) | b;
  }

  private startStretchPunch(owner: 'player' | 'npc', targetX: number, targetY: number, pullRatio: number): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const isUpgraded = owner === 'player' && this.arena.hasUpgrade('click');
    const vulcMult = isUpgraded ? (1 + this.vulcCharge) : 1;
    let damage = Math.round((PUNCH_MIN_DMG + (PUNCH_MAX_DMG - PUNCH_MIN_DMG) * pullRatio) * vulcMult);
    let maxReach = PUNCH_REACH * (isUpgraded ? (1 + 0.5 * this.vulcCharge) : 1);

    // Uber-Gear: extended pull to 120px with diminishing returns above 90px
    if (owner === 'player' && this.uberGearActive) {
      const UBER_MAX_PULL = 120;
      const UBER_DR_START = 90;
      const effectivePull = pullRatio * UBER_MAX_PULL;
      let dmgPull: number;
      if (effectivePull <= UBER_DR_START) {
        dmgPull = effectivePull;
      } else {
        dmgPull = UBER_DR_START + (effectivePull - UBER_DR_START) * 0.5;
      }
      const uberPullRatio = Math.min(1, dmgPull / PUNCH_MAX_PULL);
      damage = Math.round((PUNCH_MIN_DMG + (PUNCH_MAX_DMG - PUNCH_MIN_DMG) * uberPullRatio) * vulcMult);
      maxReach = PUNCH_REACH * (isUpgraded ? (1 + 0.5 * this.vulcCharge) : 1);
    }

    const dx = targetX - caster.x;
    const dy = targetY - caster.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const gfx = scene.add.graphics().setDepth(8);

    if (owner === 'player') {
      this.punchArmGfx?.destroy();
      this.punchStretching = true;
      this.punchStretchStart = scene.time.now;
      this.punchStretchDirX = -dx / dist; // fire opposite to pull direction
      this.punchStretchDirY = -dy / dist;
      this.punchStretchDamage = damage;
      this.punchStretchMaxReach = maxReach;
      this.punchStretchHit = false;
      this.punchArmGfx = gfx;
    } else {
      this.npcPunchArmGfx?.destroy();
      this.npcPunchStretching = true;
      this.npcPunchStretchStart = scene.time.now;
      this.npcPunchStretchDirX = dx / dist;
      this.npcPunchStretchDirY = dy / dist;
      this.npcPunchStretchDamage = damage;
      this.npcPunchStretchMaxReach = PUNCH_REACH;
      this.npcPunchStretchHit = false;
      this.npcPunchArmGfx = gfx;
    }
  }

  private updateStretchPunch(time: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const stretching = isPlayer ? this.punchStretching : this.npcPunchStretching;
    if (!stretching) return;

    const { player, npc } = this.arena;
    const caster = isPlayer ? player : npc;
    const target = isPlayer ? npc : player;

    const stretchStart = isPlayer ? this.punchStretchStart : this.npcPunchStretchStart;
    const dirX = isPlayer ? this.punchStretchDirX : this.npcPunchStretchDirX;
    const dirY = isPlayer ? this.punchStretchDirY : this.npcPunchStretchDirY;
    const damage = isPlayer ? this.punchStretchDamage : this.npcPunchStretchDamage;
    const maxReach = isPlayer ? this.punchStretchMaxReach : this.npcPunchStretchMaxReach;
    const hit = isPlayer ? this.punchStretchHit : this.npcPunchStretchHit;
    const gfx = isPlayer ? this.punchArmGfx : this.npcPunchArmGfx;

    const elapsed = time - stretchStart;
    const totalMs = PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS + PUNCH_SNAP_MS;

    // Compute current reach along the punch direction
    let reach: number;
    if (elapsed < PUNCH_STRETCH_MS) {
      reach = maxReach * (elapsed / PUNCH_STRETCH_MS);
    } else if (elapsed < PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS) {
      reach = maxReach;
    } else {
      const snapT = (elapsed - PUNCH_STRETCH_MS - PUNCH_HOLD_ANIM_MS) / PUNCH_SNAP_MS;
      reach = maxReach * (1 - Math.min(1, snapT));
    }

    const fistX = caster.x + dirX * reach;
    const fistY = caster.y + dirY * reach;

    // Draw rubber arm + fist
    if (gfx) {
      gfx.clear();
      gfx.lineStyle(6, 0xff5577, 0.85);
      gfx.beginPath();
      gfx.moveTo(caster.x, caster.y);
      gfx.lineTo(fistX, fistY);
      gfx.strokePath();
      gfx.fillStyle(0xffaacc, 1);
      gfx.fillCircle(fistX, fistY, 12);
    }

    // Melee hit check during stretch-out and hold only
    if (!hit && elapsed < PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS) {
      const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [target];
      for (const tgt of targets) {
        if (!tgt.active) continue;
        const d = Phaser.Math.Distance.Between(fistX, fistY, tgt.x, tgt.y);
        if (d < PUNCH_FIST_RADIUS) {
          tgt.takeDamage(damage);
          this.arena.spawnHitFlash(tgt.x, tgt.y, 0xff5577);
          this.arena.spawnDamageNumber(tgt.x, tgt.y - 20, damage);
          this.arena.showFloatingText(tgt.x, tgt.y - 40, `👊 ${damage}`, '#ff5577');
          if (isPlayer) this.punchStretchHit = true;
          else this.npcPunchStretchHit = true;
          break;
        }
      }
    }

    // Expire
    if (elapsed >= totalMs) {
      gfx?.destroy();
      if (isPlayer) { this.punchStretching = false; this.punchArmGfx = null; }
      else { this.npcPunchStretching = false; this.npcPunchArmGfx = null; }
    }
  }

  private computeSlingAnchors(
    px: number, py: number, cursorAngle: number,
  ): { ax: number; ay: number; bx: number; by: number } {
    const { width, height } = this.arena;
    const wallL = 25; const wallR = width - 25;
    const wallT = 85; const wallB = height - 25;

    const raycast = (fromX: number, fromY: number, angle: number): { x: number; y: number } => {
      const vx = Math.cos(angle); const vy = Math.sin(angle);
      let t = Infinity;
      if (vx > 0 && wallR > fromX) t = Math.min(t, (wallR - fromX) / vx);
      if (vx < 0 && wallL < fromX) t = Math.min(t, (wallL - fromX) / vx);
      if (vy > 0 && wallB > fromY) t = Math.min(t, (wallB - fromY) / vy);
      if (vy < 0 && wallT < fromY) t = Math.min(t, (wallT - fromY) / vy);
      if (!isFinite(t)) t = 400;
      return { x: fromX + vx * t, y: fromY + vy * t };
    };

    const al = raycast(px, py, cursorAngle - SLING_ARM_ANGLE);
    const ar = raycast(px, py, cursorAngle + SLING_ARM_ANGLE);
    return { ax: al.x, ay: al.y, bx: ar.x, by: ar.y };
  }

  private releaseSling(mouseX: number, mouseY: number, time: number): void {
    const { player } = this.arena;
    const midX = (this.slingAnchorLX + this.slingAnchorRX) / 2;
    const midY = (this.slingAnchorLY + this.slingAnchorRY) / 2;

    const pdx = player.x - midX;
    const pdy = player.y - midY;
    const pullDist = Math.sqrt(pdx * pdx + pdy * pdy);
    const pullRatio = Math.min(1, pullDist / SLING_MAX_PULL);

    const speed = SLING_MIN_SPEED + (SLING_MAX_SPEED - SLING_MIN_SPEED) * pullRatio;
    const vx = Math.cos(this.slingCursorAngle) * speed;
    const vy = Math.sin(this.slingCursorAngle) * speed;

    // E+ Fireball Sling: launch as fireball when vulcanized
    if (this.arena.hasUpgrade('e') && this.vulcCharge > 0) {
      this.fireballFlight = true;
      this.fireballSize = 1 + 0.6 * this.vulcCharge;
      player.sizeMult = this.fireballSize;
      player.applySizeMult();
    } else {
      this.fireballFlight = false;
    }

    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    ctx.dashCaster(vx, vy);
    this.arena.setIsDodging(true);

    this.slingState = 'flying';
    this.slingFlyEnd = time + SLING_FLY_MS;
    this.slingHitThisFlight.clear();
  }

  private drawSlingArms(): void {
    const { player } = this.arena;
    if (!this.slingGfx) return;
    this.slingGfx.clear();
    this.slingGfx.lineStyle(3, 0xff5577, 0.8);

    this.slingGfx.beginPath();
    this.slingGfx.moveTo(this.slingAnchorLX, this.slingAnchorLY);
    this.slingGfx.lineTo(player.x, player.y);
    this.slingGfx.strokePath();

    this.slingGfx.beginPath();
    this.slingGfx.moveTo(this.slingAnchorRX, this.slingAnchorRY);
    this.slingGfx.lineTo(player.x, player.y);
    this.slingGfx.strokePath();

    // Anchor dots
    this.slingGfx.fillStyle(0xffaacc, 1);
    this.slingGfx.fillCircle(this.slingAnchorLX, this.slingAnchorLY, 6);
    this.slingGfx.fillCircle(this.slingAnchorRX, this.slingAnchorRY, 6);
  }

  private endSlingFlight(): void {
    if (this.fireballFlight) {
      this.fireballFlight = false;
      this.arena.player.sizeMult = 1;
      this.arena.player.applySizeMult();
    }
    this.slingState = 'idle';
    this.slingGfx?.destroy(); this.slingGfx = null;
    this.slingHitThisFlight.clear();
  }

  private checkSlingContact(owner: 'player' | 'npc', time: number): void {
    const { player, npc, enemies } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const hitSet = owner === 'player' ? this.slingHitThisFlight : this.npcSlingHit;
    const baseTargets = enemies.length > 0 ? enemies : [owner === 'player' ? npc : player];

    for (const t of baseTargets) {
      if (!t.active || hitSet.has(t)) continue;
      const d = Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y);
      if (d < 52) {
        t.takeDamage(SLING_CONTACT_DMG);
        hitSet.add(t);
        this.arena.spawnHitFlash(t.x, t.y, 0xff5577);
        this.arena.spawnDamageNumber(t.x, t.y - 20, SLING_CONTACT_DMG);
        this.arena.showFloatingText(t.x, t.y - 40, `💥 ${SLING_CONTACT_DMG}`, '#ff5577');
        // E+ Fireball Sling: apply fire DOT on contact
        if (owner === 'player' && this.fireballFlight) {
          const dotMs = FIREBALL_DOT_BASE_MS + FIREBALL_DOT_BONUS_MS * this.vulcCharge;
          this.npcFireDotUntil = Math.max(this.npcFireDotUntil, time + dotMs);
          this.arena.showFloatingText(t.x, t.y - 55, '🔥 BURNING!', '#ff7733');
        }
        if (owner === 'player') this.endSlingFlight();
        else this.npcSlingFlyEnd = 0;
        break;
      }
    }
  }

  private updateBounceForm(time: number, owner: 'player' | 'npc'): void {
    const { player, npc, projectiles } = this.arena;
    const isPlayer = owner === 'player';
    const active = isPlayer ? this.bounceFormActive : this.npcBounceFormActive;
    if (!active) return;

    const endTime = isPlayer ? this.bounceFormEnd : this.npcBounceFormEnd;
    const caster = isPlayer ? player : npc;
    const vis = isPlayer ? this.bounceFormVisual : this.npcBounceFormVisual;

    if (time > endTime) {
      caster.setVisible(true);
      caster.incomingDamageMultiplier = 1;
      vis?.destroy();
      if (isPlayer) { this.bounceFormActive = false; this.bounceFormVisual = null; }
      else { this.npcBounceFormActive = false; this.npcBounceFormVisual = null; }
      return;
    }

    // Track visual to caster position and rotate toward cursor / enemy
    vis?.setPosition(caster.x, caster.y);
    const faceX = isPlayer ? this.punchMouseX : player.x;
    const faceY = isPlayer ? this.punchMouseY : player.y;
    vis?.setRotation(Math.atan2(faceY - caster.y, faceX - caster.x) + Math.PI / 2);

    // Reflect nearby enemy projectiles
    const children = projectiles.getChildren();
    for (const go of children) {
      const proj = go as unknown as Projectile;
      if (!proj.active) continue;
      const isEnemyProj = isPlayer ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!isEnemyProj) continue;
      const d = Phaser.Math.Distance.Between(proj.x, proj.y, caster.x, caster.y);
      if (d > BOUNCE_REFLECT_RADIUS) continue;

      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2) || 1;
      // Uber-Gear: 3× damage, 2× speed, 2× visual size; end form after this deflect
      const uberReflect = isPlayer && this.uberGearActive;
      const reflectSpeedMult = uberReflect ? BOUNCE_REFLECT_SPEED * 2 : BOUNCE_REFLECT_SPEED;
      const newSpd = spd * reflectSpeedMult;
      // Flip direction
      body.setVelocity((-body.velocity.x / spd) * newSpd, (-body.velocity.y / spd) * newSpd);
      (proj as unknown as Record<string, unknown>)['isFromPlayer'] = isPlayer;
      (proj as unknown as Record<string, unknown>)['rubberHomingTarget'] = isPlayer ? npc : player;

      if (uberReflect) {
        (proj as unknown as Record<string, unknown>)['damage'] = Math.round(proj.damage * 3);
        (proj as unknown as Record<string, unknown>)['uberReflected'] = true;
        // Scale up projectile visually 2×
        if ((proj as unknown as Phaser.GameObjects.Sprite).setScale) {
          (proj as unknown as Phaser.GameObjects.Sprite).setScale(2);
        }
        // End bounce form immediately (single deflect)
        caster.setVisible(true);
        caster.incomingDamageMultiplier = 1;
        vis?.destroy();
        if (isPlayer) { this.bounceFormActive = false; this.bounceFormVisual = null; }
        return; // stop reflecting more projectiles this frame
      }

      // R+ Powerful Parry: boost damage and tag fire DOT when vulcanized
      if (isPlayer && this.arena.hasUpgrade('r') && this.vulcCharge > 0) {
        (proj as unknown as Record<string, unknown>)['damage'] = Math.round(proj.damage * (1 + this.vulcCharge * 1.5));
        const dotMs = 1500 + 2500 * this.vulcCharge;
        (proj as unknown as Record<string, unknown>)['rubberParryFireDot'] = dotMs;
      }
    }
  }

  private steerHomingProjectiles(): void {
    const { projectiles } = this.arena;
    const TURN = 0.08;

    for (const go of projectiles.getChildren()) {
      const proj = go as unknown as Record<string, unknown>;
      if (!(proj as unknown as Phaser.GameObjects.GameObject).active) continue;
      const target = proj['rubberHomingTarget'] as Fighter | undefined;
      if (!target) continue;
      if (!target.active) { proj['rubberHomingTarget'] = undefined; continue; }

      const body = (proj as unknown as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const px = (proj as unknown as Phaser.Physics.Arcade.Sprite).x;
      const py = (proj as unknown as Phaser.Physics.Arcade.Sprite).y;
      const dx = target.x - px;
      const dy = target.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      body.setVelocity(
        body.velocity.x + ((dx / dist) * spd - body.velocity.x) * TURN,
        body.velocity.y + ((dy / dist) * spd - body.velocity.y) * TURN,
      );
    }
  }

  private updateSpringSlam(time: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const phase = isPlayer ? this.springPhase : this.npcSpringPhase;
    if (phase === 'idle') return;

    const { player, npc } = this.arena;
    const caster = isPlayer ? player : npc;
    const target = isPlayer ? npc : player;

    // During extend, arms track the current cursor / enemy direction
    if (phase === 'extend') {
      if (isPlayer) {
        this.springCursorAngle = Math.atan2(this.punchMouseY - caster.y, this.punchMouseX - caster.x);
      } else {
        this.npcSpringCursorAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
      }
    }

    const phaseEnd = isPlayer ? this.springPhaseEnd : this.npcSpringPhaseEnd;
    const cursorAngle = isPlayer ? this.springCursorAngle : this.npcSpringCursorAngle;
    const gfx = isPlayer ? this.springGfx : this.npcSpringGfx;
    const sweepStart = isPlayer ? this.springSweepStart : this.npcSpringSweepStart;
    const lHit = isPlayer ? this.springLeftHit : this.npcSpringLeftHit;
    const rHit = isPlayer ? this.springRightHit : this.npcSpringRightHit;
    const bothApplied = isPlayer ? this.springBothApplied : this.npcSpringBothApplied;

    const perpL = cursorAngle + Math.PI / 2;
    const perpR = cursorAngle - Math.PI / 2;

    let leftAngle = perpL;
    let rightAngle = perpR;

    if (phase === 'extend') {
      if (time > phaseEnd) {
        if (isPlayer) { this.springPhase = 'sweep'; this.springSweepStart = time; this.springPhaseEnd = time + SPRING_SWEEP_MS; }
        else { this.npcSpringPhase = 'sweep'; this.npcSpringSweepStart = time; this.npcSpringPhaseEnd = time + SPRING_SWEEP_MS; }
      }
    } else if (phase === 'sweep') {
      const t = Math.min(1, (time - sweepStart) / SPRING_SWEEP_MS);
      leftAngle = perpL + (cursorAngle - perpL) * t;
      rightAngle = perpR + (cursorAngle - perpR) * t;

      // Check hits against target (and invasion enemies)
      const lx = caster.x + Math.cos(leftAngle) * SPRING_REACH;
      const ly = caster.y + Math.sin(leftAngle) * SPRING_REACH;
      const rx = caster.x + Math.cos(rightAngle) * SPRING_REACH;
      const ry = caster.y + Math.sin(rightAngle) * SPRING_REACH;

      const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [target];
      for (const tgt of targets) {
        if (!tgt.active) continue;
        const dL = Phaser.Math.Distance.Between(tgt.x, tgt.y, lx, ly);
        const dR = Phaser.Math.Distance.Between(tgt.x, tgt.y, rx, ry);

        if (dL < SPRING_HIT_RADIUS && !lHit.has(tgt)) {
          lHit.add(tgt);
          tgt.takeDamage(SPRING_DMG);
          this.arena.spawnDamageNumber(tgt.x, tgt.y - 20, SPRING_DMG);
          this.arena.spawnHitFlash(tgt.x, tgt.y, 0xff5577);
        }
        if (dR < SPRING_HIT_RADIUS && !rHit.has(tgt)) {
          rHit.add(tgt);
          tgt.takeDamage(SPRING_DMG);
          this.arena.spawnDamageNumber(tgt.x, tgt.y - 20, SPRING_DMG);
          this.arena.spawnHitFlash(tgt.x, tgt.y, 0xff5577);
        }
        // Both arms hit → size up + stun (only once per target per slam)
        if (lHit.has(tgt) && rHit.has(tgt) && !bothApplied.has(tgt)) {
          bothApplied.add(tgt);
          tgt.earthStunnedUntil = Math.max(tgt.earthStunnedUntil, time + SPRING_STUN_MS);
          tgt.sizeMult *= SPRING_SIZE_MULT; tgt.applySizeMult();
          this.arena.showFloatingText(tgt.x, tgt.y - 52, '💥 DOUBLE ARM!', '#ff5577');
          const sceneRef = this.arena.scene;
          const sizeSnapshot = tgt.sizeMult;
          sceneRef.time.delayedCall(SPRING_SIZE_MS, () => {
            if (tgt.active && tgt.sizeMult >= SPRING_SIZE_MULT) {
              tgt.sizeMult = sizeSnapshot / SPRING_SIZE_MULT;
              tgt.applySizeMult();
            }
          });
          // Uber-Gear: push enemy to nearest wall, deal 25 damage on contact, stun 5s, orbit stars
          if (isPlayer && this.uberGearActive) {
            const wW = this.arena.width; const wH = this.arena.height;
            const toLeft = tgt.x; const toRight = wW - tgt.x;
            const toTop = tgt.y; const toBottom = wH - tgt.y;
            const minDist = Math.min(toLeft, toRight, toTop, toBottom);
            let wallVx = 0; let wallVy = 0;
            if (minDist === toLeft) wallVx = -800;
            else if (minDist === toRight) wallVx = 800;
            else if (minDist === toTop) wallVy = -800;
            else wallVy = 800;
            (tgt.body as Phaser.Physics.Arcade.Body).setVelocity(wallVx, wallVy);
            this.arena.showFloatingText(tgt.x, tgt.y - 60, '🧱 WALL PUSH!', '#ffaaaa');
            sceneRef.time.delayedCall(200, () => {
              if (!tgt.active) return;
              (tgt.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
              tgt.takeDamage(25);
              this.arena.spawnHitFlash(tgt.x, tgt.y, 0xff8888);
              this.arena.spawnDamageNumber(tgt.x, tgt.y - 20, 25);
              this.arena.showFloatingText(tgt.x, tgt.y - 36, '💥 WALL SLAM!', '#ff8888');
              // Extend stun to 5s
              tgt.earthStunnedUntil = Math.max(tgt.earthStunnedUntil, sceneRef.time.now + 5000);
              // Spawn 3 orbiting star sprites
              for (const s of this.uberGearStarSprites) s.destroy();
              this.uberGearStarSprites = [];
              for (let si = 0; si < 3; si++) {
                this.uberGearStarSprites.push(sceneRef.add.circle(tgt.x, tgt.y - 28, 5, 0xffff44, 1).setDepth(15));
              }
              sceneRef.time.delayedCall(5000, () => {
                for (const s of this.uberGearStarSprites) s.destroy();
                this.uberGearStarSprites = [];
              });
            });
          }
        }
      }

      if (time > phaseEnd) {
        leftAngle = cursorAngle; rightAngle = cursorAngle;
        if (isPlayer) { this.springPhase = 'linger'; this.springPhaseEnd = time + SPRING_LINGER_MS; }
        else { this.npcSpringPhase = 'linger'; this.npcSpringPhaseEnd = time + SPRING_LINGER_MS; }
      }
    } else if (phase === 'linger') {
      leftAngle = cursorAngle; rightAngle = cursorAngle;
      if (time > phaseEnd) {
        gfx?.destroy();
        if (isPlayer) { this.springPhase = 'idle'; this.springGfx = null; }
        else { this.npcSpringPhase = 'idle'; this.npcSpringGfx = null; }
        return;
      }
    }

    // Draw arms
    if (gfx) {
      const lx = caster.x + Math.cos(leftAngle) * SPRING_REACH;
      const ly = caster.y + Math.sin(leftAngle) * SPRING_REACH;
      const rx = caster.x + Math.cos(rightAngle) * SPRING_REACH;
      const ry = caster.y + Math.sin(rightAngle) * SPRING_REACH;
      gfx.clear();
      gfx.lineStyle(8, 0xff5577, 0.9);
      gfx.beginPath(); gfx.moveTo(caster.x, caster.y); gfx.lineTo(lx, ly); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(caster.x, caster.y); gfx.lineTo(rx, ry); gfx.strokePath();
      gfx.fillStyle(0xffaacc, 1);
      gfx.fillCircle(lx, ly, 9); gfx.fillCircle(rx, ry, 9);
    }
  }

  private expireBounceBack(owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;

    if (owner === 'player') {
      caster.damageAbsorber = this.bounceBackPrevAbsorber;
      caster.sizeMult = 1; caster.applySizeMult();
      this.bounceBackActive = false;
      this.bounceBackPrevAbsorber = null;
    } else {
      caster.damageAbsorber = this.npcBounceBackPrevAbsorber;
      caster.sizeMult = 1; caster.applySizeMult();
      this.npcBounceBackActive = false;
      this.npcBounceBackPrevAbsorber = null;
    }
  }
}
