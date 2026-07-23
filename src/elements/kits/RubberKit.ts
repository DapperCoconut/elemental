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
const SLING_MIN_PULL_TO_FIRE = 20; // below this, releasing just lets the band go slack instead of launching
const SLING_MIN_SPEED = 400;
const SLING_MAX_SPEED = 860;
const SLING_CONTACT_DMG = 28;
const SLING_FLY_MS = 650; // NPC's simplified dash-attack contact window — unrelated to the player's wall launch below
const SLING_LAUNCH_MAX_MS = 3000; // Player launch: hard cap; flight normally ends earlier once the player physically stops at the wall
const SLING_ARM_ANGLE = Math.PI / 4; // 45° each side of cursor

const BOUNCE_FORM_MS = 3000;
const BOUNCE_REFLECT_RADIUS = 50;
const BOUNCE_REFLECT_SPEED = 1.6;

const FIREBALL_DOT_BASE_MS = 2000;
const FIREBALL_DOT_BONUS_MS = 1500;

// Rubber Banding (F)
const BAND_LIFETIME_MS = 12000;
const BAND_LIFETIME_PLUS_MS = 18000; // F+
const BAND_COMFORT_RADIUS = 170;
const BAND_MAX_STRETCH = 420;
const BAND_MIN_SPEED_MULT = 0.3;
const BAND_HOLD_THRESHOLD_MS = 180;
const BAND_RECALL_DURATION_MS = 220;
const BAND_RECALL_CONTACT_DMG = 15; // F+
const BAND_RECALL_HIT_RADIUS = 34;
const BAND_ANCHOR_MIN_SPEED = 500;
const BAND_ANCHOR_MAX_SPEED = 1500;
const BAND_ANCHOR_MAX_OVERSHOOT = 260;
const BAND_ANCHOR_RADIUS = 14;
const BAND_ANCHOR_MIN_FLY_DMG = 5;
const BAND_ANCHOR_MAX_FLY_DMG = 30; // at max tension
const BAND_ANCHOR_HIT_RADIUS = BAND_ANCHOR_RADIUS + 22;
const BAND_SMASH_RADIUS = BAND_ANCHOR_RADIUS + PUNCH_FIST_RADIUS;
const NPC_BAND_AUTO_RECALL_CHECK_MS = 900;

// Rubberage (Q)
const RUBBERAGE_COUNT = 15;
const RUBBERAGE_COUNT_PLUS = 25; // Q+
const RUBBERAGE_DURATION_MS = 10000;
const RUBBERAGE_DURATION_PLUS_MS = 14000; // Q+
const RUBBERAGE_DMG = 5;
const RUBBERAGE_DMG_PLUS = 8; // Q+
const RUBBERAGE_RADIUS = 7;
const RUBBERAGE_FIGHTER_RADIUS = 20;
const RUBBERAGE_BASE_SPEED = 240;
const RUBBERAGE_MAX_SPEED = 820;
const RUBBERAGE_SPEED_GROWTH_PER_MS = 0.00045;
const RUBBERAGE_HIT_COOLDOWN_MS = 350;
const RUBBERAGE_KNOCKBACK = 620;

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

interface RubberageBall {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastHitAt: number;
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
  /** Rest position (where E was pressed) — the reference point the player is pulled away from and launches back through. */
  private slingRestX = 0; private slingRestY = 0;
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

  // Vulcanization
  private vulcUnlocked = false;
  private vulcCharging = false;
  private vulcCharge = 0;
  private vulcPlayerCdMultBase = 1;
  private vulcCdMultCaptured = false;
  private vulcSlowTexts: Phaser.GameObjects.Text[] = [];

  // Fireball Sling (E+)
  private fireballFlight = false;
  private fireballSize = 1;
  private fireballTrailAccum = 0;

  // NPC fire DOT (Fireball Sling + Powerful Parry)
  private npcFireDotUntil = 0;
  private npcFireDotTickAccum = 0;
  private npcFireDotAura: Phaser.GameObjects.Arc | null = null;

  // ── Rubber Banding (player) ──────────────────────────────────────────────
  private bandActive = false;
  private bandAnchorX = 0; private bandAnchorY = 0;
  private bandCreatedAt = 0;
  private bandLifetimeMs = BAND_LIFETIME_MS;
  private bandReinforced = false;
  private bandGfx: Phaser.GameObjects.Graphics | null = null;
  private bandFKeyWasDown = false;
  private bandFHoldStart = 0;
  private bandPullTriggeredThisPress = false;
  private bandAnchorFlying = false;
  private bandAnchorFlyDirX = 0; private bandAnchorFlyDirY = 0;
  private bandAnchorFlySpeed = 0;
  private bandAnchorFlyEnd = 0;
  private bandAnchorFlyTension = 0;
  private bandAnchorFlyHitSet: Set<Fighter> = new Set();
  private bandRecalling = false;
  private bandRecallFromX = 0; private bandRecallFromY = 0;
  private bandRecallToX = 0; private bandRecallToY = 0;
  private bandRecallStart = 0;

  // Rubber Banding (NPC — simplified: auto snap-back when overstretched)
  private npcBandActive = false;
  private npcBandAnchorX = 0; private npcBandAnchorY = 0;
  private npcBandCreatedAt = 0;
  private npcBandLifetimeMs = BAND_LIFETIME_MS;
  private npcBandGfx: Phaser.GameObjects.Graphics | null = null;
  private npcBandNextAutoCheck = 0;
  private npcBandRecalling = false;
  private npcBandRecallFromX = 0; private npcBandRecallFromY = 0;
  private npcBandRecallToX = 0; private npcBandRecallToY = 0;
  private npcBandRecallStart = 0;

  // ── Rubberage (player / NPC) ─────────────────────────────────────────────
  private rubberageBalls: RubberageBall[] = [];
  private rubberageEnd = 0;
  private rubberageDmg = RUBBERAGE_DMG;

  private npcRubberageBalls: RubberageBall[] = [];
  private npcRubberageEnd = 0;
  private npcRubberageDmg = RUBBERAGE_DMG;

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

    // Rubber Banding
    this.bandGfx?.destroy(); this.bandGfx = null;
    this.bandActive = false;
    this.bandAnchorFlying = false;
    this.bandAnchorFlyHitSet.clear();
    if (this.bandRecalling) player.isInvincible = false;
    this.bandRecalling = false;
    this.bandFHoldStart = 0;
    this.bandFKeyWasDown = false;
    this.bandPullTriggeredThisPress = false;
    this.bandReinforced = false;
    this.bandLifetimeMs = BAND_LIFETIME_MS;

    this.npcBandGfx?.destroy(); this.npcBandGfx = null;
    this.npcBandActive = false;
    this.npcBandRecalling = false;
    this.npcBandLifetimeMs = BAND_LIFETIME_MS;

    // Rubberage
    this.clearRubberageBalls('player');
    this.clearRubberageBalls('npc');
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

    // Right-click vulcanization
    const rightDown = pointer.rightButtonDown();
    if (this.vulcUnlocked && !this.bounceFormActive && this.vulcCharge < 1) {
      this.vulcCharging = rightDown;
    } else {
      this.vulcCharging = false;
    }

    const blocked = this.bounceFormActive || this.vulcCharging;

    // ── Punch: hold click to charge, release to fire ─────────────────────────
    if (this.slingState === 'idle' && !blocked) {
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
          const pullRatio = Math.min(1, (holdMs / resistance) / PUNCH_MAX_HOLD_MS);
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

    if (Phaser.Input.Keyboard.JustDown(eKey) && !blocked && time >= player.disarmedUntil) {
      player.castAbility('rubber-sling', this.arena.buildPlayerContext(mouseX, mouseY));
    }

    if (Phaser.Input.Keyboard.JustDown(rKey) && !blocked && time >= player.disarmedUntil) {
      player.castAbility('rubber-bounce-form', this.arena.buildPlayerContext(mouseX, mouseY));
    }

    // F: Rubber Banding — tap with no anchor plants one; tap while tethered snaps you
    // back to it; hold while tethered reels the anchor toward you instead.
    if (Phaser.Input.Keyboard.JustDown(fKey) && !blocked && time >= player.disarmedUntil) {
      if (!this.bandActive) {
        player.castAbility('rubber-band', this.arena.buildPlayerContext(mouseX, mouseY));
      } else {
        this.bandFHoldStart = time;
        this.bandPullTriggeredThisPress = false;
      }
    }
    if (fKey.isDown && this.bandActive && this.bandFHoldStart > 0 && !this.bandPullTriggeredThisPress) {
      if (time - this.bandFHoldStart >= BAND_HOLD_THRESHOLD_MS) {
        this.startBandPull(time);
        this.bandPullTriggeredThisPress = true;
      }
    }
    if (!fKey.isDown && this.bandFKeyWasDown && this.bandFHoldStart > 0) {
      const heldMs = time - this.bandFHoldStart;
      if (heldMs < BAND_HOLD_THRESHOLD_MS && this.bandActive) {
        this.startBandRecall('player');
      }
      this.bandFHoldStart = 0;
      this.bandPullTriggeredThisPress = false;
    }
    this.bandFKeyWasDown = fKey.isDown;

    // Q: Rubberage
    if (Phaser.Input.Keyboard.JustDown(qKey) && !blocked && time >= player.disarmedUntil) {
      player.castAbility('rubberage', this.arena.buildPlayerContext(mouseX, mouseY));
    }
  }

  // ── applySlingMovement: called from ArenaScene when sling is pulling ───────

  applySlingMovement(mouseX: number, mouseY: number): void {
    if (this.slingState !== 'pulling') return;
    const { player } = this.arena;

    // Clamped pull target: mouse position, capped at SLING_MAX_PULL from the rest
    // position (where the ability was cast) — a real slingshot pulls back from where
    // you're standing, not toward some far-off point out by the fork's wall anchors.
    const restX = this.slingRestX;
    const restY = this.slingRestY;
    let targetX = mouseX;
    let targetY = mouseY;
    const dx = targetX - restX;
    const dy = targetY - restY;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > SLING_MAX_PULL) {
      targetX = restX + (dx / d) * SLING_MAX_PULL;
      targetY = restY + (dy / d) * SLING_MAX_PULL;
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
      const body = player.body as Phaser.Physics.Arcade.Body;
      // The player's body collides with the world bounds, so a launch naturally rides all
      // the way to the wall and stops there — end the flight the moment that happens (rather
      // than waiting out a fixed timer that could cut the trip short mid-arena). Checking
      // `blocked` instead of raw velocity matters for a diagonal launch: only the axis that
      // actually hit a wall zeroes out, so the other axis can retain a small residual velocity
      // forever and never trip a "speed near zero" check.
      if (time > this.slingFlyEnd || body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right) {
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

    // Rubber Banding
    this.updateBand(time, delta, 'player');
    this.updateBand(time, delta, 'npc');

    // Rubberage
    this.updateRubberageBalls(time, delta, 'player');
    this.updateRubberageBalls(time, delta, 'npc');

    // Vulcanization: charge accumulation + cooldown mult + tint + slow HUD
    if (this.vulcCharging) {
      this.vulcCharge = Math.min(1, this.vulcCharge + (delta / 1000) * 0.05);
    }
    if (this.vulcUnlocked) {
      if (!this.vulcCdMultCaptured) {
        this.vulcPlayerCdMultBase = player.cooldownMult;
        this.vulcCdMultCaptured = true;
      }
      const netFactor = Math.max(0.5, 1 + this.vulcCharge);
      player.cooldownMult = this.vulcPlayerCdMultBase * netFactor;
      if (this.vulcCharge > 0) {
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
        const netPct = Math.round((netFactor - 1) * 100);
        for (const t of this.vulcSlowTexts) {
          if (netPct > 0) { t.setText(`${netPct}% slower`); t.setColor('#ff4444'); t.setVisible(true); }
          else if (netPct < 0) { t.setText(`${Math.abs(netPct)}% faster`); t.setColor('#44ff88'); t.setVisible(true); }
          else { t.setVisible(false); }
        }
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
    this.slingRestX = player.x; this.slingRestY = player.y;
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
    } else {
      this.npcBounceFormVisual?.destroy();
      this.npcBounceFormActive = true;
      this.npcBounceFormEnd = time + BOUNCE_FORM_MS;
      this.npcBounceFormVisual = vis;
    }
  }

  doRubberBandStart(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;
    const gfx = scene.add.graphics().setDepth(7);

    if (owner === 'player') {
      this.bandGfx?.destroy();
      this.bandActive = true;
      this.bandAnchorX = caster.x; this.bandAnchorY = caster.y;
      this.bandCreatedAt = time;
      this.bandReinforced = this.arena.hasUpgrade('f');
      this.bandLifetimeMs = this.bandReinforced ? BAND_LIFETIME_PLUS_MS : BAND_LIFETIME_MS;
      this.bandGfx = gfx;
      this.bandFHoldStart = 0;
      this.bandPullTriggeredThisPress = false;
      this.bandAnchorFlying = false;
      this.arena.showFloatingText(caster.x, caster.y - 40, '⚫ ANCHOR SET', '#ff5577');
    } else {
      this.npcBandGfx?.destroy();
      this.npcBandActive = true;
      this.npcBandAnchorX = caster.x; this.npcBandAnchorY = caster.y;
      this.npcBandCreatedAt = time;
      this.npcBandLifetimeMs = BAND_LIFETIME_MS;
      this.npcBandGfx = gfx;
      this.npcBandNextAutoCheck = time + NPC_BAND_AUTO_RECALL_CHECK_MS;
    }
  }

  doRubberage(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const time = scene.time.now;
    const isPlus = owner === 'player' && this.arena.hasUpgrade('q');
    const count = isPlus ? RUBBERAGE_COUNT_PLUS : RUBBERAGE_COUNT;
    const dmg = isPlus ? RUBBERAGE_DMG_PLUS : RUBBERAGE_DMG;
    const duration = isPlus ? RUBBERAGE_DURATION_PLUS_MS : RUBBERAGE_DURATION_MS;

    const balls: RubberageBall[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = RUBBERAGE_BASE_SPEED * (0.8 + Math.random() * 0.4);
      const gfx = scene.add.circle(caster.x, caster.y, RUBBERAGE_RADIUS, 0xff5577, 1)
        .setStrokeStyle(2, 0xffaacc).setDepth(7);
      balls.push({
        gfx,
        x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        lastHitAt: 0,
      });
    }

    if (owner === 'player') {
      this.clearRubberageBalls('player');
      this.rubberageBalls = balls;
      this.rubberageEnd = time + duration;
      this.rubberageDmg = dmg;
      this.arena.showFloatingText(caster.x, caster.y - 40, '🔴 RUBBERAGE!', '#ff5577');
    } else {
      this.clearRubberageBalls('npc');
      this.npcRubberageBalls = balls;
      this.npcRubberageEnd = time + duration;
      this.npcRubberageDmg = dmg;
    }
  }

  // ── Public accessors for ArenaScene ───────────────────────────────────────

  isSlingActive(): boolean { return this.slingState !== 'idle'; }
  isBounceFormActive(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.bounceFormActive : this.npcBounceFormActive;
  }

  // ── Public: NPC fire DOT extension (called from ArenaScene.applyProjectileToNpc) ──

  applyNpcFireDot(durationMs: number): void {
    this.npcFireDotUntil = Math.max(this.npcFireDotUntil, this.arena.scene.time.now + durationMs);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private startStretchPunch(owner: 'player' | 'npc', targetX: number, targetY: number, pullRatio: number): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const isUpgraded = owner === 'player' && this.arena.hasUpgrade('click');
    const vulcMult = isUpgraded ? (1 + this.vulcCharge) : 1;
    const damage = Math.round((PUNCH_MIN_DMG + (PUNCH_MAX_DMG - PUNCH_MIN_DMG) * pullRatio) * vulcMult);
    const maxReach = PUNCH_REACH * (isUpgraded ? (1 + 0.5 * this.vulcCharge) : 1);

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

    // Rubber Banding: smack your own anchor with a stretched punch to shatter it
    if (isPlayer && this.bandActive) {
      const bandDist = Phaser.Math.Distance.Between(fistX, fistY, this.bandAnchorX, this.bandAnchorY);
      if (bandDist < BAND_SMASH_RADIUS) {
        this.shatterBand('player');
      }
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
    const pdx = player.x - this.slingRestX;
    const pdy = player.y - this.slingRestY;
    const pullDist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pullDist < SLING_MIN_PULL_TO_FIRE) {
      // Not pulled back far enough — the band just goes slack instead of launching.
      this.slingState = 'idle';
      this.slingGfx?.destroy(); this.slingGfx = null;
      return;
    }

    const pullRatio = Math.min(1, pullDist / SLING_MAX_PULL);
    const speed = SLING_MIN_SPEED + (SLING_MAX_SPEED - SLING_MIN_SPEED) * pullRatio;
    // Real slingshot: launch back through the rest position, opposite the pull direction.
    const vx = -(pdx / pullDist) * speed;
    const vy = -(pdy / pullDist) * speed;

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
    this.slingFlyEnd = time + SLING_LAUNCH_MAX_MS;
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
      const newSpd = spd * BOUNCE_REFLECT_SPEED;
      // Flip direction
      body.setVelocity((-body.velocity.x / spd) * newSpd, (-body.velocity.y / spd) * newSpd);
      (proj as unknown as Record<string, unknown>)['isFromPlayer'] = isPlayer;
      (proj as unknown as Record<string, unknown>)['rubberHomingTarget'] = isPlayer ? npc : player;

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

  // ── Rubber Banding helpers ─────────────────────────────────────────────────

  private distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax; const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx; const cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  private startBandRecall(owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const anchorX = owner === 'player' ? this.bandAnchorX : this.npcBandAnchorX;
    const anchorY = owner === 'player' ? this.bandAnchorY : this.npcBandAnchorY;
    const startX = caster.x; const startY = caster.y;
    const dx = anchorX - startX; const dy = anchorY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return;

    const time = this.arena.scene.time.now;
    (caster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    if (owner === 'player') {
      this.bandRecalling = true;
      this.bandRecallFromX = startX; this.bandRecallFromY = startY;
      this.bandRecallToX = anchorX; this.bandRecallToY = anchorY;
      this.bandRecallStart = time;
      this.arena.setIsDodging(true);
      player.isInvincible = true;
      this.arena.showFloatingText(caster.x, caster.y - 40, '↩ SNAP!', '#ff5577');

      // F+ Reinforced Band: contact damage to anything along the snap path
      if (this.bandReinforced) {
        const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [npc];
        for (const t of targets) {
          if (!t.active) continue;
          if (this.distPointToSegment(t.x, t.y, startX, startY, anchorX, anchorY) < BAND_RECALL_HIT_RADIUS) {
            t.takeDamage(BAND_RECALL_CONTACT_DMG);
            this.arena.spawnHitFlash(t.x, t.y, 0xff5577);
          }
        }
      }
    } else {
      this.npcBandRecalling = true;
      this.npcBandRecallFromX = startX; this.npcBandRecallFromY = startY;
      this.npcBandRecallToX = anchorX; this.npcBandRecallToY = anchorY;
      this.npcBandRecallStart = time;
    }
  }

  private startBandPull(time: number): void {
    const { player } = this.arena;
    const anchorX = this.bandAnchorX; const anchorY = this.bandAnchorY;
    const dx = player.x - anchorX; const dy = player.y - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) return;

    const tension = Math.min(1, dist / BAND_MAX_STRETCH);
    const speed = BAND_ANCHOR_MIN_SPEED + (BAND_ANCHOR_MAX_SPEED - BAND_ANCHOR_MIN_SPEED) * tension;
    const overshoot = BAND_ANCHOR_MAX_OVERSHOOT * tension;
    const totalDist = dist + overshoot;

    this.bandAnchorFlying = true;
    this.bandAnchorFlyDirX = dx / dist; this.bandAnchorFlyDirY = dy / dist;
    this.bandAnchorFlySpeed = speed;
    this.bandAnchorFlyEnd = time + (totalDist / speed) * 1000;
    this.bandAnchorFlyTension = tension;
    this.bandAnchorFlyHitSet.clear();
    this.arena.showFloatingText(player.x, player.y - 40, '⬅ REEL IN!', '#ff77aa');
  }

  private updateBand(time: number, delta: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const active = isPlayer ? this.bandActive : this.npcBandActive;
    if (!active) return;

    const { player, npc, enemies, width, height } = this.arena;
    const caster = isPlayer ? player : npc;
    const createdAt = isPlayer ? this.bandCreatedAt : this.npcBandCreatedAt;
    const lifetimeMs = isPlayer ? this.bandLifetimeMs : this.npcBandLifetimeMs;
    const gfx = isPlayer ? this.bandGfx : this.npcBandGfx;

    if (time > createdAt + lifetimeMs) {
      this.expireBand(owner);
      return;
    }

    let anchorX = isPlayer ? this.bandAnchorX : this.npcBandAnchorX;
    let anchorY = isPlayer ? this.bandAnchorY : this.npcBandAnchorY;

    // Anchor-flying (player pulling the anchor toward themselves)
    if (isPlayer && this.bandAnchorFlying) {
      if (time >= this.bandAnchorFlyEnd) {
        this.bandAnchorFlying = false;
        this.bandAnchorFlyHitSet.clear();
      } else {
        const dtS = delta / 1000;
        anchorX += this.bandAnchorFlyDirX * this.bandAnchorFlySpeed * dtS;
        anchorY += this.bandAnchorFlyDirY * this.bandAnchorFlySpeed * dtS;
        const wallL = 25 + BAND_ANCHOR_RADIUS; const wallR = width - 25 - BAND_ANCHOR_RADIUS;
        const wallT = 85 + BAND_ANCHOR_RADIUS; const wallB = height - 25 - BAND_ANCHOR_RADIUS;
        anchorX = Math.max(wallL, Math.min(wallR, anchorX));
        anchorY = Math.max(wallT, Math.min(wallB, anchorY));
        this.bandAnchorX = anchorX; this.bandAnchorY = anchorY;

        // The flying anchor damages anything it passes through, harder the more tension it was reeled in under.
        const flyTargets = enemies.length > 0 ? enemies : [npc];
        const flyDmg = Math.round(BAND_ANCHOR_MIN_FLY_DMG + (BAND_ANCHOR_MAX_FLY_DMG - BAND_ANCHOR_MIN_FLY_DMG) * this.bandAnchorFlyTension);
        for (const t of flyTargets) {
          if (!t.active || t.hp <= 0 || this.bandAnchorFlyHitSet.has(t)) continue;
          if (Phaser.Math.Distance.Between(anchorX, anchorY, t.x, t.y) <= BAND_ANCHOR_HIT_RADIUS) {
            this.bandAnchorFlyHitSet.add(t);
            t.takeDamage(flyDmg);
            this.arena.spawnHitFlash(t.x, t.y, 0xff5577);
          }
        }
      }
    }

    // Snap-back recall: lerp position directly rather than relying on physics velocity
    // (the caster's Arcade body damps burst velocity within a couple of frames, which
    // made a dashCaster-based recall undershoot the anchor badly — verified via the
    // /verify browser harness).
    const recalling = isPlayer ? this.bandRecalling : this.npcBandRecalling;
    if (recalling) {
      const recallStart = isPlayer ? this.bandRecallStart : this.npcBandRecallStart;
      const fromX = isPlayer ? this.bandRecallFromX : this.npcBandRecallFromX;
      const fromY = isPlayer ? this.bandRecallFromY : this.npcBandRecallFromY;
      const toX = isPlayer ? this.bandRecallToX : this.npcBandRecallToX;
      const toY = isPlayer ? this.bandRecallToY : this.npcBandRecallToY;
      const t = Math.min(1, (time - recallStart) / BAND_RECALL_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      caster.setPosition(fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased);
      (caster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (t >= 1) {
        if (isPlayer) {
          this.bandRecalling = false;
          this.arena.setIsDodging(false);
          player.isInvincible = false;
        } else {
          this.npcBandRecalling = false;
        }
      }
    }

    // NPC auto-recall when overstretched (simplified AI usage)
    if (!isPlayer && !this.npcBandRecalling) {
      const ndx = caster.x - anchorX; const ndy = caster.y - anchorY;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      if (ndist > BAND_COMFORT_RADIUS * 1.3 && time >= this.npcBandNextAutoCheck) {
        this.npcBandNextAutoCheck = time + NPC_BAND_AUTO_RECALL_CHECK_MS;
        this.startBandRecall('npc');
      }
    }

    // Slow when stretched beyond the comfort radius — the penalty is squared so it's
    // barely noticeable near the comfort radius but bites hard as tension nears max stretch.
    const dx = caster.x - anchorX; const dy = caster.y - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > BAND_COMFORT_RADIUS) {
      const over = Math.min(1, (dist - BAND_COMFORT_RADIUS) / (BAND_MAX_STRETCH - BAND_COMFORT_RADIUS));
      const mult = 1 - (over * over) * (1 - BAND_MIN_SPEED_MULT);
      if (isPlayer) this.arena.applyPlayerSpeedMult(mult);
      else this.arena.applyNpcSpeedMult(mult);
    }

    // Draw anchor + band
    if (gfx) {
      gfx.clear();
      gfx.lineStyle(3, 0xff77aa, 0.85);
      gfx.beginPath(); gfx.moveTo(anchorX, anchorY); gfx.lineTo(caster.x, caster.y); gfx.strokePath();
      gfx.fillStyle(0x111111, 1);
      gfx.fillCircle(anchorX, anchorY, BAND_ANCHOR_RADIUS);
      gfx.lineStyle(2, 0xff5577, 1);
      gfx.strokeCircle(anchorX, anchorY, BAND_ANCHOR_RADIUS);
    }
  }

  private expireBand(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.bandGfx?.destroy(); this.bandGfx = null;
      this.bandActive = false;
      this.bandAnchorFlying = false;
    } else {
      this.npcBandGfx?.destroy(); this.npcBandGfx = null;
      this.npcBandActive = false;
    }
  }

  private shatterBand(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const anchorX = owner === 'player' ? this.bandAnchorX : this.npcBandAnchorX;
    const anchorY = owner === 'player' ? this.bandAnchorY : this.npcBandAnchorY;
    this.expireBand(owner);
    if (owner === 'player') this.arena.showFloatingText(anchorX, anchorY - 20, '💥 SHATTERED', '#ffaacc');
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const shard = scene.add.circle(anchorX, anchorY, 4, 0x111111, 1).setDepth(8);
      scene.tweens.add({
        targets: shard,
        x: anchorX + Math.cos(angle) * 40, y: anchorY + Math.sin(angle) * 40,
        alpha: 0, duration: 300, onComplete: () => shard.destroy(),
      });
    }
  }

  // ── Rubberage helpers ───────────────────────────────────────────────────────

  private clearRubberageBalls(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      for (const b of this.rubberageBalls) b.gfx.destroy();
      this.rubberageBalls = [];
      this.rubberageEnd = 0;
    } else {
      for (const b of this.npcRubberageBalls) b.gfx.destroy();
      this.npcRubberageBalls = [];
      this.npcRubberageEnd = 0;
    }
  }

  private updateRubberageBalls(time: number, delta: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const balls = isPlayer ? this.rubberageBalls : this.npcRubberageBalls;
    if (balls.length === 0) return;
    const end = isPlayer ? this.rubberageEnd : this.npcRubberageEnd;
    const dmg = isPlayer ? this.rubberageDmg : this.npcRubberageDmg;

    if (time > end) {
      this.clearRubberageBalls(owner);
      return;
    }

    const { width, height } = this.arena;
    const wallL = 25 + RUBBERAGE_RADIUS; const wallR = width - 25 - RUBBERAGE_RADIUS;
    const wallT = 85 + RUBBERAGE_RADIUS; const wallB = height - 25 - RUBBERAGE_RADIUS;
    const dt = delta / 1000;
    const growth = 1 + delta * RUBBERAGE_SPEED_GROWTH_PER_MS;

    for (const ball of balls) {
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
      if (spd < RUBBERAGE_MAX_SPEED) {
        const newSpd = Math.min(RUBBERAGE_MAX_SPEED, spd * growth);
        ball.vx = (ball.vx / spd) * newSpd;
        ball.vy = (ball.vy / spd) * newSpd;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < wallL) { ball.x = wallL; ball.vx = Math.abs(ball.vx); }
      else if (ball.x > wallR) { ball.x = wallR; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < wallT) { ball.y = wallT; ball.vy = Math.abs(ball.vy); }
      else if (ball.y > wallB) { ball.y = wallB; ball.vy = -Math.abs(ball.vy); }
    }

    // Ball-ball collisions (equal-mass elastic reflection along the collision normal)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]; const b = balls[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = RUBBERAGE_RADIUS * 2;
        if (d > 0 && d < minD) {
          const nx = dx / d; const ny = dy / d;
          const overlap = (minD - d) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          const avn = a.vx * nx + a.vy * ny;
          const bvn = b.vx * nx + b.vy * ny;
          a.vx += (bvn - avn) * nx; a.vy += (bvn - avn) * ny;
          b.vx += (avn - bvn) * nx; b.vy += (avn - bvn) * ny;
        }
      }
    }

    // Fighter collisions: damage + heavy knockback, ball bounces off the target
    const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [owner === 'player' ? this.arena.npc : this.arena.player];
    for (const ball of balls) {
      for (const tgt of targets) {
        if (!tgt.active) continue;
        const dx = tgt.x - ball.x; const dy = tgt.y - ball.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < RUBBERAGE_RADIUS + RUBBERAGE_FIGHTER_RADIUS && time - ball.lastHitAt > RUBBERAGE_HIT_COOLDOWN_MS) {
          ball.lastHitAt = time;
          tgt.takeDamage(dmg);
          this.arena.spawnHitFlash(tgt.x, tgt.y, 0xff5577);
          const body = tgt.body as Phaser.Physics.Arcade.Body | null;
          if (body) body.setVelocity((dx / d) * RUBBERAGE_KNOCKBACK, (dy / d) * RUBBERAGE_KNOCKBACK);
          const ballSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
          ball.vx = -(dx / d) * ballSpd;
          ball.vy = -(dy / d) * ballSpd;
          break;
        }
      }
    }

    for (const ball of balls) ball.gfx.setPosition(ball.x, ball.y);
  }
}
