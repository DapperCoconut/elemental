import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── LightArenaApi ─────────────────────────────────────────────────────────

export interface LightArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  readonly width: number;
  readonly height: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
  hasUpgrade(slot: string): boolean;
}

// ── Tuning ──────────────────────────────────────────────────────────────

const CAR_MAX_SPEED = 620;
const CAR_MIN_COAST = 160;
const CAR_ACCEL_RATE = 175; // px/s^2 gained while roughly aimed straight (quartered from the original 700)
const CAR_TURN_BRAKE_RATE = 3600; // px/s^2 lost while cutting a hard turn (quadrupled from the original 900)
const CAR_BASE_TURN_RATE = Math.PI * 2.6; // rad/s turn cap while slow
const CAR_FAST_TURN_RATE = Math.PI * 1.1; // rad/s turn cap at max speed (drift, but still responsive)
const STRAIGHT_THRESHOLD = 0.4; // rad (~23°) — below this counts as a straightaway

const BLINK_MAX_CHARGES = 2;
const BLINK_RECHARGE_MS = 5000;
const BLINK_BOOST_MS = 600;

const MAX_RAMPS = 5;
const RAMP_TRIGGER_RADIUS = 34;
const RAMP_OFFSET = 56;
const RAMP_BOOST_MS = 1500;
const RAMP_LANCE_SPEED = 520;
const RAMP_LANCE_SPREAD_DEG = 22;

const TRICK_RADIUS = 50;
const TRICK_DAMAGE = 5;
const TRICK_BOOST_MS = 1200;

const STREAK_DAMAGE = 15;
const STREAK_HIT_RADIUS = 40;
const STREAK_THICKNESS = 18;
const STREAK_LIFETIME_MS = 900;
const SPEED_O_LIGHT_BOUNCES = 125;
const SPEED_O_LIGHT_BOUNCE_MS = 60;

const BOOST_TARGET_SPEED = CAR_MAX_SPEED / 3; // Prism Ramp / Light Trick boosts now only push you to 1/3 top speed

const LANCE_COLOR_SLOW = 0xfff4a8;
const LANCE_COLOR_FAST = 0xff2200;

const LANCE_HIT_RADIUS = 30;
const LANCE_BASE_DAMAGE = 6;
const LANCE_MAX_BONUS_DAMAGE = 100; // scales with accel ratio^2, so a max-speed lance hits for 106 vs. ~6 at a crawl
const LANCE_HIT_COOLDOWN_MS = 250;

// ── Click+ Redline ──────────────────────────────────────────────────────
const CLICK_PLUS_MAX_SPEED_MULT = 2;
const CLICK_PLUS_DANGER_RATIO = 0.75;
const CLICK_PLUS_WALL_DAMAGE = 50;

// ── E+ Steam Charge ─────────────────────────────────────────────────────
const E_PLUS_MAX_HOLD_MS = 2000;
const E_PLUS_BOOST_MIN_MS = 400;
const E_PLUS_BOOST_MAX_MS = 1600;
const E_PLUS_STEAM_INTERVAL_MS = 130;

// ── R+ Prism Drill ──────────────────────────────────────────────────────
const DRILL_SPEED = 900;
const DRILL_SLOW_MULT = 0.1;
const DRILL_HIT_RADIUS = 26;
const DRILL_STUN_MS = 500;
const DRILL_STUN_TICK_MS = 500;
const DRILL_MIN_DAMAGE = 2;
const DRILL_MAX_DAMAGE = 5;
const DRILL_LIFETIME_MS = 4000;

// ── F+ Javelin Burst ────────────────────────────────────────────────────
const F_PLUS_JAVELIN_COUNT = 12;
const F_PLUS_JAVELIN_SPEED = 480;

// ── Q+ Flare-Stream ─────────────────────────────────────────────────────
const FLARE_TELEPORT_INTERVAL = 10;
const FLARE_BEAM_LIFETIME_MS = 35000;
const FLARE_ACCEL_MULT = 3;

interface LightRamp {
  x: number;
  y: number;
  angle: number;
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Rectangle;
  overlapping: Set<Fighter>;
}

interface LightStreak {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  owner: 'player' | 'npc';
  sprite: Phaser.GameObjects.Rectangle;
  until: number;
  hitSet: Set<Fighter>;
}

interface LightDrill {
  x: number;
  y: number;
  angle: number;
  speed: number;
  dmg: number;
  sprite: Phaser.GameObjects.Triangle;
  hitTarget: Fighter | null;
  nextStunAt: number;
  until: number;
}

interface LightFlareBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sprite: Phaser.GameObjects.Rectangle;
  until: number;
}

function lerpColor(colorA: number, colorB: number, t: number): number {
  const ratio = Phaser.Math.Clamp(t, 0, 1);
  const a = Phaser.Display.Color.IntegerToColor(colorA);
  const b = Phaser.Display.Color.IntegerToColor(colorB);
  const out = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(ratio * 100));
  return Phaser.Display.Color.GetColor(out.r, out.g, out.b);
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
}

// ── LightKit ──────────────────────────────────────────────────────────────

export class LightKit {
  // ── Player car state ───────────────────────────────────────────────────
  private lanceHeld = false;
  private lanceSprite: Phaser.GameObjects.Triangle | null = null;
  private carAngle = 0;
  private carSpeed = 0;
  private carBoostUntil = 0;

  private blinkCharges = BLINK_MAX_CHARGES;
  private blinkRechargeQueue: number[] = [];

  private ramps: LightRamp[] = [];
  private streaks: LightStreak[] = [];
  private lanceHitCooldowns: Map<Fighter, number> = new Map();

  private speedOLightActive = false;
  private speedOLightBouncesLeft = 0;
  private speedOLightNextBounceAt = 0;

  private accelBarBg: Phaser.GameObjects.Rectangle | null = null;
  private accelBarFill: Phaser.GameObjects.Rectangle | null = null;

  // ── Click+ Redline ───────────────────────────────────────────────────────
  private dangerVignette: Phaser.GameObjects.Rectangle[] | null = null;

  // ── E+ Steam Charge ──────────────────────────────────────────────────────
  private ePlusHolding = false;
  private ePlusHoldStart = 0;
  private nextSteamAt = 0;

  // ── R+ Prism Drill ───────────────────────────────────────────────────────
  private drills: LightDrill[] = [];
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Q+ Flare-Stream ──────────────────────────────────────────────────────
  private playerTeleportCount = 0;
  private flareBeams: LightFlareBeam[] = [];

  // ── NPC mirror state ────────────────────────────────────────────────────
  private npcLanceSprite: Phaser.GameObjects.Triangle | null = null;
  private npcCarAngle = 0;
  private npcCarSpeed = 0;
  private npcCarBoostUntil = 0;
  private npcRamps: LightRamp[] = [];
  private npcLanceHitCooldowns: Map<Fighter, number> = new Map();

  private npcSpeedOLightActive = false;
  private npcSpeedOLightBouncesLeft = 0;
  private npcSpeedOLightNextBounceAt = 0;

  constructor(private arena: LightArenaApi) {}

  reset(): void {
    this.lanceHeld = false;
    if (this.lanceSprite) { this.lanceSprite.destroy(); this.lanceSprite = null; }
    this.carAngle = 0;
    this.carSpeed = 0;
    this.carBoostUntil = 0;

    this.blinkCharges = BLINK_MAX_CHARGES;
    this.blinkRechargeQueue = [];

    this.ramps.forEach((r) => r.sprite.destroy());
    this.ramps = [];
    this.streaks.forEach((s) => s.sprite.destroy());
    this.streaks = [];
    this.lanceHitCooldowns.clear();

    this.speedOLightActive = false;
    this.speedOLightBouncesLeft = 0;
    this.speedOLightNextBounceAt = 0;

    this.destroyAccelBar();

    this.dangerVignette?.forEach((r) => r.destroy());
    this.dangerVignette = null;

    this.ePlusHolding = false;
    this.ePlusHoldStart = 0;
    this.nextSteamAt = 0;

    this.drills.forEach((d) => d.sprite.destroy());
    this.drills = [];
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;

    this.playerTeleportCount = 0;
    this.flareBeams.forEach((b) => b.sprite.destroy());
    this.flareBeams = [];

    if (this.npcLanceSprite) { this.npcLanceSprite.destroy(); this.npcLanceSprite = null; }
    this.npcCarAngle = 0;
    this.npcCarSpeed = 0;
    this.npcCarBoostUntil = 0;
    this.npcRamps.forEach((r) => r.sprite.destroy());
    this.npcRamps = [];
    this.npcLanceHitCooldowns.clear();

    this.npcSpeedOLightActive = false;
    this.npcSpeedOLightBouncesLeft = 0;
    this.npcSpeedOLightNextBounceAt = 0;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerLight: boolean, isNpcLight: boolean): void {
    const { player, npc, scene } = this.arena;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const npcBody = npc.body as Phaser.Physics.Arcade.Body;

    if (isPlayerLight) {
      while (this.blinkRechargeQueue.length > 0 && time >= this.blinkRechargeQueue[0]) {
        this.blinkRechargeQueue.shift();
        this.blinkCharges = Math.min(BLINK_MAX_CHARGES, this.blinkCharges + 1);
      }

      if (this.speedOLightActive) {
        this.stepSpeedOLight('player', time);
        playerBody.setVelocity(0, 0);
        if (this.lanceSprite) this.lanceSprite.setVisible(false);
        this.destroyDangerVignette();
      } else if (this.ePlusHolding) {
        // E+ Steam Charge: rooted in place, aiming at the cursor, acceleration frozen (not lost)
        playerBody.setVelocity(0, 0);
        const ptr = scene.input.activePointer;
        this.carAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        if (this.lanceSprite) {
          this.lanceSprite.setVisible(true);
          this.updateLanceVisual(this.lanceSprite, player, this.carAngle, this.carSpeed / CAR_MAX_SPEED);
        }
        if (time >= this.nextSteamAt) {
          this.nextSteamAt = time + E_PLUS_STEAM_INTERVAL_MS;
          this.spawnSteamParticle(time);
        }
        this.destroyDangerVignette();
      } else if (this.lanceHeld) {
        if (this.lanceSprite) this.lanceSprite.setVisible(true);
        const ptr = scene.input.activePointer;
        const desired = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const ratio = this.stepCar(playerBody, time, delta, desired, true);
        if (this.lanceSprite) {
          this.updateLanceVisual(this.lanceSprite, player, this.carAngle, ratio);
          this.checkLanceContact(time, this.lanceSprite.x, this.lanceSprite.y, ratio, this.arena.enemies, this.lanceHitCooldowns);
        }
        this.updateAccelBar(ratio);

        // Click+ Redline: doubled meter (already folded into `ratio` by stepCar), danger zone above 3/4
        if (this.arena.hasUpgrade('click')) {
          const dangerAlpha = ratio > CLICK_PLUS_DANGER_RATIO
            ? Phaser.Math.Clamp((ratio - CLICK_PLUS_DANGER_RATIO) / (1 - CLICK_PLUS_DANGER_RATIO), 0, 1) * 0.4
            : 0;
          this.updateDangerVignette(dangerAlpha);
          if (dangerAlpha > 0 && (playerBody.blocked.up || playerBody.blocked.down || playerBody.blocked.left || playerBody.blocked.right)) {
            player.takeDamage(CLICK_PLUS_WALL_DAMAGE);
            this.arena.spawnHitFlash(player.x, player.y, 0xff3333);
            this.arena.showFloatingText(player.x, player.y - 34, `💥 WALL CRASH -${CLICK_PLUS_WALL_DAMAGE}`, '#ff3333');
            this.carSpeed = 0;
            this.updateDangerVignette(0);
          }
        } else {
          this.destroyDangerVignette();
        }
      } else {
        this.destroyAccelBar();
        this.destroyDangerVignette();
      }
    }

    if (isNpcLight) {
      if (this.npcSpeedOLightActive) {
        this.stepSpeedOLight('npc', time);
        npcBody.setVelocity(0, 0);
        if (this.npcLanceSprite) this.npcLanceSprite.setVisible(false);
      } else {
        if (!this.npcLanceSprite) {
          this.npcLanceSprite = scene.add.triangle(0, 0, -10, 12, -10, -12, 22, 0, LANCE_COLOR_SLOW)
            .setDepth(10).setStrokeStyle(1, 0xffffff);
        }
        this.npcLanceSprite.setVisible(true);
        const desired = Math.atan2(player.y - npc.y, player.x - npc.x);
        const ratio = this.stepCar(npcBody, time, delta, desired, false);
        this.updateLanceVisual(this.npcLanceSprite, npc, this.npcCarAngle, ratio);
        this.checkLanceContact(time, this.npcLanceSprite.x, this.npcLanceSprite.y, ratio, [player], this.npcLanceHitCooldowns);
      }

      const npcCastId = this.arena.npcCastId;
      if (npcCastId === 'blink') {
        this.npcCarAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
        this.npcCarBoostUntil = time + BLINK_BOOST_MS;
        this.arena.showFloatingText(npc.x, npc.y - 30, '⚡ BLINK', '#88ddff');
      }
      if (npcCastId === 'prism-ramp') {
        this.placeRamp('npc', npc.x, npc.y, this.npcCarAngle);
        this.arena.showFloatingText(npc.x, npc.y - 30, '🔺 PRISM RAMP', '#88ddff');
      }
      if (npcCastId === 'light-trick') {
        this.triggerLightTrick('npc', time, npc, [player]);
      }
      if (npcCastId === 'speed-o-light' && !this.npcSpeedOLightActive) {
        this.startSpeedOLight('npc', time);
      }
    }

    // Ramp overlap checks run unconditionally — each array is naturally empty
    // on whichever side isn't playing Light this match.
    this.updateRampArray(time, this.ramps, player, this.arena.enemies);
    this.updateRampArray(time, this.npcRamps, npc, [player]);

    this.updateStreaks(time);
    this.updateDrills(time, delta);
    this.updateFlareBeams(time);

    // R+ Prism Drill stun — same "zero velocity while stunned" approach used elsewhere in this codebase
    if (time < this.playerStunUntil) playerBody.setVelocity(0, 0);
    if (time < this.npcStunUntil) npcBody.setVelocity(0, 0);
  }

  private stepCar(body: Phaser.Physics.Arcade.Body, time: number, delta: number, desiredAngle: number, isPlayer: boolean): number {
    const dtS = delta / 1000;
    let angle = isPlayer ? this.carAngle : this.npcCarAngle;
    let speed = isPlayer ? this.carSpeed : this.npcCarSpeed;
    const boostUntil = isPlayer ? this.carBoostUntil : this.npcCarBoostUntil;

    // Click+ Redline: doubles the top end of the meter (and the risk that comes with it)
    const maxSpeed = isPlayer && this.arena.hasUpgrade('click') ? CAR_MAX_SPEED * CLICK_PLUS_MAX_SPEED_MULT : CAR_MAX_SPEED;

    const diff = Phaser.Math.Angle.Wrap(desiredAngle - angle);
    const absDiff = Math.abs(diff);
    const speedRatio = speed / maxSpeed;
    const turnRate = CAR_BASE_TURN_RATE - (CAR_BASE_TURN_RATE - CAR_FAST_TURN_RATE) * speedRatio;
    const maxTurnStep = turnRate * dtS;
    angle += Phaser.Math.Clamp(diff, -maxTurnStep, maxTurnStep);

    // Q+ Flare-Stream: standing on your own flare beam triples the accel rate
    let accelRate = CAR_ACCEL_RATE;
    if (isPlayer && this.flareBeams.length > 0 && this.arena.hasUpgrade('q') && this.isOnFlareBeam(body.center.x, body.center.y)) {
      accelRate *= FLARE_ACCEL_MULT;
    }

    if (absDiff < STRAIGHT_THRESHOLD) {
      speed = Math.min(maxSpeed, speed + accelRate * dtS);
    } else {
      speed = Math.max(CAR_MIN_COAST, speed - CAR_TURN_BRAKE_RATE * dtS * (absDiff / Math.PI));
    }

    if (time < boostUntil) speed = Math.max(speed, BOOST_TARGET_SPEED);
    speed = Phaser.Math.Clamp(speed, 0, maxSpeed);

    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (isPlayer) { this.carAngle = angle; this.carSpeed = speed; } else { this.npcCarAngle = angle; this.npcCarSpeed = speed; }
    return speed / maxSpeed;
  }

  private updateLanceVisual(sprite: Phaser.GameObjects.Triangle, caster: Fighter, angle: number, ratio: number): void {
    const dist = 34;
    sprite.setPosition(caster.x + Math.cos(angle) * dist, caster.y + Math.sin(angle) * dist);
    sprite.setRotation(angle);
    sprite.setFillStyle(lerpColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, ratio));
  }

  /** Contact damage for the held/driven lance tip — scales with the current acceleration ratio. */
  private checkLanceContact(time: number, lanceX: number, lanceY: number, ratio: number, targets: Fighter[], hitCooldowns: Map<Fighter, number>): void {
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (time < (hitCooldowns.get(t) ?? 0)) continue;
      if (Phaser.Math.Distance.Between(lanceX, lanceY, t.x, t.y) <= LANCE_HIT_RADIUS) {
        const dmg = LANCE_BASE_DAMAGE + Math.round(LANCE_MAX_BONUS_DAMAGE * ratio * ratio);
        t.takeDamage(dmg);
        this.arena.spawnHitFlash(t.x, t.y, LANCE_COLOR_SLOW);
        hitCooldowns.set(t, time + LANCE_HIT_COOLDOWN_MS);
      }
    }
  }

  private ensureAccelBar(): void {
    if (this.accelBarBg) return;
    const { scene, width: W, hpBarY, hpBarH } = this.arena;
    const barW = 220;
    const barH = 8;
    const barY = hpBarY + hpBarH / 2 + 3 + barH / 2;
    this.accelBarBg = scene.add.rectangle(W / 2, barY, barW + 4, barH + 4, 0x0a0a18, 0.9)
      .setStrokeStyle(2, 0x445577).setDepth(20);
    this.accelBarFill = scene.add.rectangle(W / 2 - barW / 2, barY, 0, barH, LANCE_COLOR_SLOW, 1)
      .setOrigin(0, 0.5).setDepth(21);
  }

  private updateAccelBar(ratio: number): void {
    this.ensureAccelBar();
    const barW = 220;
    if (this.accelBarFill) {
      this.accelBarFill.setSize(barW * Phaser.Math.Clamp(ratio, 0, 1), 8);
      this.accelBarFill.setFillStyle(lerpColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, ratio), 1);
    }
  }

  private destroyAccelBar(): void {
    if (this.accelBarBg) { this.accelBarBg.destroy(); this.accelBarBg = null; }
    if (this.accelBarFill) { this.accelBarFill.destroy(); this.accelBarFill = null; }
  }

  // ── Click+ Redline danger vignette ─────────────────────────────────────────

  private ensureDangerVignette(): void {
    if (this.dangerVignette) return;
    const { scene, width: W, height: H } = this.arena;
    const t = 36;
    const mk = (x: number, y: number, w: number, h: number) =>
      scene.add.rectangle(x, y, w, h, 0xff0000, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(999);
    this.dangerVignette = [mk(0, 0, W, t), mk(0, H - t, W, t), mk(0, 0, t, H), mk(W - t, 0, t, H)];
  }

  private updateDangerVignette(alpha: number): void {
    if (alpha <= 0) { this.destroyDangerVignette(); return; }
    this.ensureDangerVignette();
    this.dangerVignette?.forEach((r) => r.setFillStyle(0xff0000, alpha));
  }

  private destroyDangerVignette(): void {
    if (!this.dangerVignette) return;
    this.dangerVignette.forEach((r) => r.destroy());
    this.dangerVignette = null;
  }

  // ── E+ Steam Charge ──────────────────────────────────────────────────────

  private spawnSteamParticle(time: number): void {
    const { scene, player } = this.arena;
    const holdRatio = Phaser.Math.Clamp((time - this.ePlusHoldStart) / E_PLUS_MAX_HOLD_MS, 0, 1);
    const color = lerpColor(0xcccccc, 0xff2200, holdRatio);
    const ox = Phaser.Math.Between(-6, 6);
    const c = scene.add.circle(player.x + ox, player.y - 16, 4 + holdRatio * 3, color, 0.7).setDepth(11);
    scene.tweens.add({ targets: c, y: c.y - 26, alpha: 0, duration: 500, onComplete: () => c.destroy() });
  }

  // ── Prism Ramp ───────────────────────────────────────────────────────────

  private placeRamp(owner: 'player' | 'npc', originX: number, originY: number, angle: number): void {
    const arr = owner === 'player' ? this.ramps : this.npcRamps;
    if (arr.length >= MAX_RAMPS) {
      const oldest = arr.shift();
      oldest?.sprite.destroy();
    }
    const x = originX + Math.cos(angle) * RAMP_OFFSET;
    const y = originY + Math.sin(angle) * RAMP_OFFSET;
    const sprite = this.arena.scene.add.rectangle(x, y, 46, 26, 0x66ddff, 0.85)
      .setStrokeStyle(2, 0xffffff).setDepth(4).setRotation(angle);
    arr.push({ x, y, angle, owner, sprite, overlapping: new Set() });
  }

  private updateRampArray(time: number, arr: LightRamp[], ownerFighter: Fighter, otherFighters: Fighter[]): void {
    if (arr.length === 0) return;
    const candidates = [ownerFighter, ...otherFighters];
    const shattered: LightRamp[] = [];
    for (const ramp of arr) {
      for (const f of candidates) {
        if (!f.active || f.hp <= 0) continue;
        const within = Phaser.Math.Distance.Between(ramp.x, ramp.y, f.x, f.y) <= RAMP_TRIGGER_RADIUS;
        const was = ramp.overlapping.has(f);
        if (within && !was) {
          ramp.overlapping.add(f);
          // R+ Prism Drill: driving your held lance onto your own ramp while holding R fires the drill instead
          const drillReady = f === ownerFighter && f === this.arena.player && this.lanceHeld &&
            this.arena.hasUpgrade('r') && this.arena.rKey.isDown;
          if (drillReady) {
            this.launchPrismDrill(ramp, time);
            shattered.push(ramp);
          } else {
            this.launchRampLances(ramp);
            this.arena.spawnHitFlash(ramp.x, ramp.y, 0x66ddff);
            if (f === ownerFighter) {
              if (ramp.owner === 'player') this.carBoostUntil = time + RAMP_BOOST_MS;
              else this.npcCarBoostUntil = time + RAMP_BOOST_MS;
              this.arena.showFloatingText(f.x, f.y - 30, '⚡ RAMP BOOST', '#66ddff');
            }
          }
        } else if (!within && was) {
          ramp.overlapping.delete(f);
        }
      }
    }
    for (const r of shattered) {
      r.sprite.destroy();
      const idx = arr.indexOf(r);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  private launchPrismDrill(ramp: LightRamp, time: number): void {
    const { scene, player } = this.arena;
    const ratio = this.carSpeed / CAR_MAX_SPEED;
    this.carSpeed = 0;
    this.lanceHeld = false;
    player.setScale(1);
    if (this.lanceSprite) { this.lanceSprite.destroy(); this.lanceSprite = null; }
    this.destroyAccelBar();
    this.updateDangerVignette(0);

    const dmg = DRILL_MIN_DAMAGE + Math.round((DRILL_MAX_DAMAGE - DRILL_MIN_DAMAGE) * ratio);
    const sprite = scene.add.triangle(ramp.x, ramp.y, -10, 12, -10, -12, 22, 0, LANCE_COLOR_FAST)
      .setDepth(10).setStrokeStyle(1, 0xffffff).setRotation(ramp.angle);
    this.drills.push({
      x: ramp.x, y: ramp.y, angle: ramp.angle, speed: DRILL_SPEED, dmg,
      sprite, hitTarget: null, nextStunAt: 0, until: time + DRILL_LIFETIME_MS,
    });
    this.arena.showFloatingText(player.x, player.y - 30, '🔻 PRISM DRILL', '#ff4422');
  }

  private updateDrills(time: number, delta: number): void {
    if (this.drills.length === 0) return;
    const dtS = delta / 1000;
    const { width: W, height: H } = this.arena;
    for (let i = this.drills.length - 1; i >= 0; i--) {
      const d = this.drills[i];
      if (time >= d.until) { d.sprite.destroy(); this.drills.splice(i, 1); continue; }

      d.x += Math.cos(d.angle) * d.speed * dtS;
      d.y += Math.sin(d.angle) * d.speed * dtS;
      d.sprite.setPosition(d.x, d.y);

      if (d.x < -20 || d.x > W + 20 || d.y < -20 || d.y > H + 20) {
        d.sprite.destroy();
        this.drills.splice(i, 1);
        continue;
      }

      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > DRILL_HIT_RADIUS) continue;
        if (d.hitTarget !== t) {
          d.hitTarget = t;
          d.speed *= DRILL_SLOW_MULT;
          t.takeDamage(d.dmg);
          this.arena.spawnHitFlash(t.x, t.y, LANCE_COLOR_FAST);
          d.nextStunAt = time;
        }
        if (time >= d.nextStunAt) {
          d.nextStunAt = time + DRILL_STUN_TICK_MS;
          if (t === this.arena.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + DRILL_STUN_MS);
          else this.npcStunUntil = Math.max(this.npcStunUntil, time + DRILL_STUN_MS);
        }
        break;
      }
    }
  }

  private launchRampLances(ramp: LightRamp): void {
    const { scene, projectiles } = this.arena;
    const colors = [0xff3333, 0x33ff66, 0x3399ff];
    const isPlayerOwned = ramp.owner === 'player';
    const ratio = (ramp.owner === 'player' ? this.carSpeed : this.npcCarSpeed) / CAR_MAX_SPEED;
    const dmg = LANCE_BASE_DAMAGE + Math.round(LANCE_MAX_BONUS_DAMAGE * ratio * ratio);
    for (let i = -1; i <= 1; i++) {
      const a = ramp.angle + i * Phaser.Math.DegToRad(RAMP_LANCE_SPREAD_DEG);
      const proj = new Projectile(scene, ramp.x, ramp.y, 'proj-light-triangle', dmg, isPlayerOwned);
      proj.setTint(colors[i + 1]);
      projectiles.add(proj);
      proj.launch(Math.cos(a) * RAMP_LANCE_SPEED, Math.sin(a) * RAMP_LANCE_SPEED);
    }
  }

  // ── Light Trick ──────────────────────────────────────────────────────────

  private triggerLightTrick(owner: 'player' | 'npc', time: number, caster: Fighter, targets: Fighter[]): void {
    const scene = this.arena.scene;
    const flash = scene.add.circle(caster.x, caster.y, TRICK_RADIUS, LANCE_COLOR_SLOW, 0.5).setDepth(9);
    scene.time.delayedCall(150, () => flash.destroy());

    let hit = false;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y) <= TRICK_RADIUS) {
        t.takeDamage(TRICK_DAMAGE);
        this.arena.spawnHitFlash(t.x, t.y, LANCE_COLOR_SLOW);
        hit = true;
      }
    }

    // F+ Javelin Burst: if the trick's AOE also catches a prism ramp, that ramp fires 12 javelins
    // and grants both the trick boost and the ramp boost at once.
    let rampHit: LightRamp | null = null;
    if (owner === 'player' && this.arena.hasUpgrade('f')) {
      const allRamps: LightRamp[] = [...this.ramps, ...this.npcRamps];
      rampHit = allRamps.find((r) => Phaser.Math.Distance.Between(caster.x, caster.y, r.x, r.y) <= TRICK_RADIUS) ?? null;
    }

    if (rampHit) {
      this.launchJavelinBurst(rampHit);
      this.arena.spawnHitFlash(rampHit.x, rampHit.y, 0x66ddff);
      const boostUntil = time + Math.max(TRICK_BOOST_MS, RAMP_BOOST_MS);
      if (owner === 'player') this.carBoostUntil = boostUntil; else this.npcCarBoostUntil = boostUntil;
      this.arena.showFloatingText(caster.x, caster.y - 30, '🌟 JAVELIN BURST', '#66ddff');
    } else if (hit) {
      if (owner === 'player') this.carBoostUntil = time + TRICK_BOOST_MS;
      else this.npcCarBoostUntil = time + TRICK_BOOST_MS;
      this.arena.showFloatingText(caster.x, caster.y - 30, '✨ LIGHT TRICK', '#fff4a8');
    }
  }

  private launchJavelinBurst(ramp: LightRamp): void {
    const { scene, projectiles } = this.arena;
    const isPlayerOwned = ramp.owner === 'player';
    for (let i = 0; i < F_PLUS_JAVELIN_COUNT; i++) {
      const a = (i / F_PLUS_JAVELIN_COUNT) * Math.PI * 2;
      const proj = new Projectile(scene, ramp.x, ramp.y, 'proj-light-triangle', TRICK_DAMAGE, isPlayerOwned);
      proj.setTint(0x66ddff);
      projectiles.add(proj);
      proj.launch(Math.cos(a) * F_PLUS_JAVELIN_SPEED, Math.sin(a) * F_PLUS_JAVELIN_SPEED);
    }
  }

  // ── Speed 'O' Light ──────────────────────────────────────────────────────

  private startSpeedOLight(owner: 'player' | 'npc', time: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.dodgeChance += 1.0;
    if (owner === 'player') {
      this.speedOLightActive = true;
      this.speedOLightBouncesLeft = SPEED_O_LIGHT_BOUNCES;
      this.speedOLightNextBounceAt = time;
    } else {
      this.npcSpeedOLightActive = true;
      this.npcSpeedOLightBouncesLeft = SPEED_O_LIGHT_BOUNCES;
      this.npcSpeedOLightNextBounceAt = time;
    }
    this.arena.showFloatingText(caster.x, caster.y - 30, "💫 SPEED 'O' LIGHT", '#fff4a8');
  }

  private stepSpeedOLight(owner: 'player' | 'npc', time: number): void {
    const isPlayer = owner === 'player';
    const nextAt = isPlayer ? this.speedOLightNextBounceAt : this.npcSpeedOLightNextBounceAt;
    if (time < nextAt) return;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const body = caster.body as Phaser.Physics.Arcade.Body;
    const { width: W, height: H, scene } = this.arena;
    const margin = 24;
    const wall = Math.floor(Math.random() * 4);
    let nx = caster.x;
    let ny = caster.y;
    if (wall === 0) { nx = margin + Math.random() * (W - margin * 2); ny = margin; }
    else if (wall === 1) { nx = margin + Math.random() * (W - margin * 2); ny = H - margin; }
    else if (wall === 2) { nx = margin; ny = margin + Math.random() * (H - margin * 2); }
    else { nx = W - margin; ny = margin + Math.random() * (H - margin * 2); }

    const midX = (caster.x + nx) / 2;
    const midY = (caster.y + ny) / 2;
    const length = Math.max(4, Phaser.Math.Distance.Between(caster.x, caster.y, nx, ny));
    const angle = Math.atan2(ny - caster.y, nx - caster.x);
    const sprite = scene.add.rectangle(midX, midY, length, STREAK_THICKNESS, LANCE_COLOR_SLOW, 0.85).setRotation(angle).setDepth(9);
    this.streaks.push({ x1: caster.x, y1: caster.y, x2: nx, y2: ny, owner, sprite, until: time + STREAK_LIFETIME_MS, hitSet: new Set() });

    // Q+ Flare-Stream: every 10th teleport leaves a lasting orange beam
    if (owner === 'player' && this.arena.hasUpgrade('q')) {
      this.playerTeleportCount++;
      if (this.playerTeleportCount % FLARE_TELEPORT_INTERVAL === 0) {
        const flareSprite = scene.add.rectangle(midX, midY, length, STREAK_THICKNESS, 0xff8800, 0.85).setRotation(angle).setDepth(8);
        this.flareBeams.push({ x1: caster.x, y1: caster.y, x2: nx, y2: ny, sprite: flareSprite, until: time + FLARE_BEAM_LIFETIME_MS });
      }
    }

    caster.setPosition(nx, ny);
    body.reset(nx, ny);

    const bouncesLeft = (isPlayer ? this.speedOLightBouncesLeft : this.npcSpeedOLightBouncesLeft) - 1;
    if (isPlayer) {
      this.speedOLightBouncesLeft = bouncesLeft;
      this.speedOLightNextBounceAt = time + SPEED_O_LIGHT_BOUNCE_MS;
    } else {
      this.npcSpeedOLightBouncesLeft = bouncesLeft;
      this.npcSpeedOLightNextBounceAt = time + SPEED_O_LIGHT_BOUNCE_MS;
    }

    if (bouncesLeft <= 0) {
      caster.dodgeChance = Math.max(0, caster.dodgeChance - 1.0);
      if (isPlayer) this.speedOLightActive = false; else this.npcSpeedOLightActive = false;
    }
  }

  private updateStreaks(time: number): void {
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      if (time >= s.until) { s.sprite.destroy(); this.streaks.splice(i, 1); continue; }
      const targets = s.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || s.hitSet.has(t)) continue;
        if (distToSegment(t.x, t.y, s.x1, s.y1, s.x2, s.y2) <= STREAK_HIT_RADIUS) {
          s.hitSet.add(t);
          t.takeDamage(STREAK_DAMAGE);
          this.arena.spawnHitFlash(t.x, t.y, LANCE_COLOR_SLOW);
        }
      }
      s.sprite.setAlpha(Math.max(0, 0.85 * (s.until - time) / STREAK_LIFETIME_MS));
    }
  }

  private updateFlareBeams(time: number): void {
    for (let i = this.flareBeams.length - 1; i >= 0; i--) {
      const b = this.flareBeams[i];
      if (time >= b.until) { b.sprite.destroy(); this.flareBeams.splice(i, 1); continue; }
      b.sprite.setAlpha(Math.max(0.15, 0.85 * (b.until - time) / FLARE_BEAM_LIFETIME_MS));
    }
  }

  private isOnFlareBeam(x: number, y: number): boolean {
    for (const b of this.flareBeams) {
      if (distToSegment(x, y, b.x1, b.y1, b.x2, b.y2) <= STREAK_HIT_RADIUS) return true;
    }
    return false;
  }

  // ── Input ────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene, eKey, rKey, fKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Click (hold): Light Lance / car-mode
    const down = pointer.leftButtonDown();
    if (down && !this.lanceHeld) {
      this.lanceHeld = true;
      player.setScale(0.5);
      if (!this.lanceSprite) {
        this.lanceSprite = scene.add.triangle(0, 0, -10, 12, -10, -12, 22, 0, LANCE_COLOR_SLOW)
          .setDepth(10).setStrokeStyle(1, 0xffffff);
      }
      if (this.carSpeed < 40) {
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
      }
    } else if (!down && this.lanceHeld) {
      this.lanceHeld = false;
      player.setScale(1);
      if (this.lanceSprite) { this.lanceSprite.destroy(); this.lanceSprite = null; }
    }

    // E: Blink — instantly snap heading to cursor, preserving speed
    // E+ Steam Charge: hold instead of tap — root in place aiming at the cursor, then release for a
    // stronger boost the longer you held.
    if (this.arena.hasUpgrade('e')) {
      if (Phaser.Input.Keyboard.JustDown(eKey)) {
        if (!this.ePlusHolding && this.blinkCharges > 0 && !this.speedOLightActive) {
          this.ePlusHolding = true;
          this.ePlusHoldStart = time;
          this.blinkCharges--;
          this.blinkRechargeQueue.push(time + BLINK_RECHARGE_MS);
          this.arena.showFloatingText(player.x, player.y - 30, '👁️ FOCUSING', '#88ddff');
        }
      }
      if (Phaser.Input.Keyboard.JustUp(eKey) && this.ePlusHolding) {
        const heldMs = Phaser.Math.Clamp(time - this.ePlusHoldStart, 0, E_PLUS_MAX_HOLD_MS);
        const holdRatio = heldMs / E_PLUS_MAX_HOLD_MS;
        this.ePlusHolding = false;
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        this.carBoostUntil = time + Phaser.Math.Linear(E_PLUS_BOOST_MIN_MS, E_PLUS_BOOST_MAX_MS, holdRatio);
        this.arena.showFloatingText(player.x, player.y - 30, '🔥 STEAM RELEASE', '#ff6622');
      }
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.blinkCharges > 0 && !this.speedOLightActive) {
        this.blinkCharges--;
        this.blinkRechargeQueue.push(time + BLINK_RECHARGE_MS);
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        this.carBoostUntil = time + BLINK_BOOST_MS;
        this.arena.showFloatingText(player.x, player.y - 30, '⚡ BLINK', '#88ddff');
      }
    }

    // R: Prism Ramp
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (player.castAbility('prism-ramp', playerCtx)) {
        const angle = this.lanceHeld ? this.carAngle : Math.atan2(mouseY - player.y, mouseX - player.x);
        this.placeRamp('player', player.x, player.y, angle);
        this.arena.showFloatingText(player.x, player.y - 30, '🔺 PRISM RAMP', '#88ddff');
      }
    }

    // F: Light Trick
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('light-trick', playerCtx)) {
        this.triggerLightTrick('player', time, player, this.arena.enemies);
      }
    }

    // Q: Speed 'O' Light
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (!this.speedOLightActive && player.castAbility('speed-o-light', playerCtx)) {
        this.startSpeedOLight('player', time);
      }
    }
  }
}
