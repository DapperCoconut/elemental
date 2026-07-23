import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── Magnet type definitions ────────────────────────────────────────────────

export interface MagnetRod {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  trail: Phaser.GameObjects.Arc[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  contactCooldownPlayer: number;
  contactCooldownNpc: number;
  bouncing: boolean;
  bounceUntil: number;
  owner: 'player' | 'npc';
  destroyOnHit?: boolean;
  permDamageBonus: number;
  isSword?: boolean;
}

export interface MagnetNail {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  x: number;
  y: number;
  inEnemy: boolean;
  implantedUntil: number;
  owner: 'player' | 'npc';
}

export interface MagnetShieldOrb {
  sprite: Phaser.GameObjects.Arc;
  angle: number;
  hp: number;
}

export interface MagnetAtomSmasher {
  flashSprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  fireAt: number;
  walls: Array<{ sprite: Phaser.GameObjects.Rectangle; vx: number; vy: number; active: boolean; hitCooldown: number }>;
  exploded: boolean;
  crossed: boolean;
  owner: 'player' | 'npc';
}

// ── Arena API interface ────────────────────────────────────────────────────

export interface MagnetArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly rightPointerWasDown: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  setIsDodging(v: boolean): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** True only when the player is magnet AND Magnet Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is magnet AND has Magnet Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── Mastery: Metal Detector passive + Mag-Lev bindable ────────────────────────
const ANCIENT_ROD_COUNT = 2;
const ANCIENT_EXPOSE_RADIUS = 62;      // a pulse within this of a hidden rod exposes it
const ANCIENT_LASER_INTERVAL_MS = 3000;
const ANCIENT_LASER_DAMAGE = 5;
const ANCIENT_ACTIVATE_Y_BAND = 100;   // atom-smasher wall must sweep within this of the rod
const MAGLEV_SHIELD = 50;
const MAGLEV_BASH_DMG = 15;
const MAGLEV_BASH_RADIUS = 36;
const MAGLEV_BASH_CD_MS = 400;
const MAGLEV_SLING_SPEED = 950;
const MAGLEV_COOLDOWN_MS = 6000;       // gate on re-mounting; dismount is always allowed

interface AncientRod {
  hx: number;            // hidden position
  hy: number;
  exposed: boolean;
  activated: boolean;
  laserAccum: number;
  rod: MagnetRod | null; // the live rod once exposed
}

// ── MagnetKit ─────────────────────────────────────────────────────────────

export class MagnetKit {
  private magnetRods: MagnetRod[] = [];
  private magnetPlayerNail: MagnetNail | null = null;
  private magnetNpcNail: MagnetNail | null = null;
  private magnetPlayerShieldOrbs: MagnetShieldOrb[] = [];
  private magnetNpcShieldOrbs: MagnetShieldOrb[] = [];
  private magnetPlayerAtomSmasher: MagnetAtomSmasher | null = null;
  private magnetNpcAtomSmasher: MagnetAtomSmasher | null = null;
  private magnetPlayerMagnetized = false;
  private magnetPlayerMagnetizedUntil = 0;
  private magnetNpcMagnetized = false;
  private magnetNpcMagnetizedUntil = 0;
  private magnetNpcAura: Phaser.GameObjects.Arc | null = null;
  private magnetPlayerAura: Phaser.GameObjects.Arc | null = null;
  private magnetPlayerSpeedBuffUntil = 0;
  private magnetNpcSpeedBuffUntil = 0;
  private magnetOrbOrbitAngle = 0;
  private magnetNpcOrbOrbitAngle = 0;
  private magnetNailPullUntil = 0;
  private magnetNailPullVX = 0;
  private magnetNailPullVY = 0;
  // Upgrade state
  private magnetPlayerNails: MagnetNail[] = [];
  private magnetNpcNails: MagnetNail[] = [];
  private magnetPlayerPullStacks = 0;
  private magnetNpcPullStacks = 0;
  private magnetCopperSpawnAccumPlayer = 0;
  private magnetCopperSpawnAccumNpc = 0;
  private magnetReflectUntilPlayer = 0;
  private magnetReflectCenterPlayerX = 0;
  private magnetReflectCenterPlayerY = 0;
  private magnetReflectUntilNpc = 0;
  private magnetReflectCenterNpcX = 0;
  private magnetReflectCenterNpcY = 0;

  // ── Mastery: Metal Detector (ancient rods) + Mag-Lev ──────────────────
  private ancientRods: AncientRod[] = [];
  private ancientRodsInit = false;
  private magLevMounted = false;
  private magLevPreShield = 0;
  private magLevBoard: Phaser.GameObjects.Rectangle | null = null;
  private magLevBashCd: Map<Fighter, number> = new Map();
  private magLevLastMountAt = -MAGLEV_COOLDOWN_MS;
  private npcMagLevMounted = false;
  private npcMagLevPreShield = 0;
  private npcMagLevBoard: Phaser.GameObjects.Rectangle | null = null;
  private npcMagLevBashCd: Map<Fighter, number> = new Map();

  constructor(private arena: MagnetArenaApi) {}

  // ── Public accessors for cross-cutting arena state ─────────────────────

  pushRod(rod: MagnetRod): void { this.magnetRods.push(rod); }

  getNailPullUntil(): number { return this.magnetNailPullUntil; }
  getNailPullVX(): number { return this.magnetNailPullVX; }
  getNailPullVY(): number { return this.magnetNailPullVY; }

  reset(): void {
    const scene = this.arena.scene;
    for (const rod of this.magnetRods) {
      rod.sprite.destroy();
      for (const t of rod.trail) t.destroy();
    }
    this.magnetRods = [];
    if (this.magnetPlayerNail) { this.magnetPlayerNail.sprite.destroy(); this.magnetPlayerNail = null; }
    if (this.magnetNpcNail) { this.magnetNpcNail.sprite.destroy(); this.magnetNpcNail = null; }
    for (const orb of this.magnetPlayerShieldOrbs) orb.sprite.destroy();
    this.magnetPlayerShieldOrbs = [];
    for (const orb of this.magnetNpcShieldOrbs) orb.sprite.destroy();
    this.magnetNpcShieldOrbs = [];
    if (this.magnetPlayerAtomSmasher) {
      this.magnetPlayerAtomSmasher.flashSprite.destroy();
      for (const w of this.magnetPlayerAtomSmasher.walls) w.sprite.destroy();
      this.magnetPlayerAtomSmasher = null;
    }
    if (this.magnetNpcAtomSmasher) {
      this.magnetNpcAtomSmasher.flashSprite.destroy();
      for (const w of this.magnetNpcAtomSmasher.walls) w.sprite.destroy();
      this.magnetNpcAtomSmasher = null;
    }
    this.magnetPlayerMagnetized = false; this.magnetPlayerMagnetizedUntil = 0;
    this.magnetNpcMagnetized = false; this.magnetNpcMagnetizedUntil = 0;
    if (this.magnetNpcAura) { this.magnetNpcAura.destroy(); this.magnetNpcAura = null; }
    if (this.magnetPlayerAura) { this.magnetPlayerAura.destroy(); this.magnetPlayerAura = null; }
    this.magnetPlayerSpeedBuffUntil = 0; this.magnetNpcSpeedBuffUntil = 0;
    this.magnetOrbOrbitAngle = 0; this.magnetNpcOrbOrbitAngle = 0;
    this.magnetNailPullUntil = 0; this.magnetNailPullVX = 0; this.magnetNailPullVY = 0;
    for (const n of this.magnetPlayerNails) n.sprite.destroy();
    this.magnetPlayerNails = [];
    for (const n of this.magnetNpcNails) n.sprite.destroy();
    this.magnetNpcNails = [];
    this.magnetPlayerPullStacks = 0; this.magnetNpcPullStacks = 0;
    this.magnetCopperSpawnAccumPlayer = 0; this.magnetCopperSpawnAccumNpc = 0;
    this.magnetReflectUntilPlayer = 0; this.magnetReflectUntilNpc = 0;
    // Mastery — Metal Detector + Mag-Lev
    this.ancientRods = [];
    this.ancientRodsInit = false;
    this.magLevMounted = false; this.magLevPreShield = 0;
    if (this.magLevBoard) { this.magLevBoard.destroy(); this.magLevBoard = null; }
    this.magLevBashCd = new Map();
    this.magLevLastMountAt = -MAGLEV_COOLDOWN_MS;
    this.npcMagLevMounted = false; this.npcMagLevPreShield = 0;
    if (this.npcMagLevBoard) { this.npcMagLevBoard.destroy(); this.npcMagLevBoard = null; }
    this.npcMagLevBashCd = new Map();
    void scene;
  }

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { player, eKey, fKey, rKey, qKey, pointerWasDown, rightPointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // ── Mastery — Mag-Lev takes over whichever slot it's bound to ────────
    const magLevSlot = this.arena.masteryActive ? this.magLevSlot() : null;
    if (magLevSlot) {
      const mk = magLevSlot === 'e' ? eKey : magLevSlot === 'r' ? rKey : magLevSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(mk)) this.toggleMagLev(time);
    }

    if (pointer.isDown && !pointerWasDown) {
      // While riding the board, click slings you toward the cursor instead of pulsing.
      if (this.magLevMounted) this.magLevSling(mouseX, mouseY);
      else player.castAbility('mag-pulse', playerCtx);
    }

    // Click+: right-click Repulse
    if (pointer.rightButtonDown() && !rightPointerWasDown && this.arena.hasUpgrade('click')) {
      this.doMagnetRepulse(mouseX, mouseY, 'player');
    }

    if (magLevSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.arena.hasUpgrade('e')) {
        // E+ barrage: recall any implanted nails, or fire barrage
        const implanted = this.magnetPlayerNails.filter(n => n.inEnemy);
        if (implanted.length > 0) {
          const { npc } = this.arena;
          for (const nail of implanted) {
            const dmg = 18;
            npc.takeDamage(dmg);
            this.arena.spawnHitFlash(npc.x, npc.y, 0x888899);
            nail.sprite.destroy();
          }
          this.arena.recordMasteryStat('nailTears', implanted.length);
          this.magnetPlayerNails = this.magnetPlayerNails.filter(n => !n.inEnemy);
          this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 36, '🔩 RECALLED', '#ccddee');
          player.reduceCooldown('nail-implant', 2000);
        } else if (this.magnetPlayerNails.length < 3) {
          player.castAbility('nail-implant', playerCtx);
        }
      } else {
        if (this.magnetPlayerNail && this.magnetPlayerNail.inEnemy) {
          const nail = this.magnetPlayerNail;
          const dmg = 18;
          const { npc } = this.arena;
          npc.takeDamage(dmg);
          this.arena.spawnHitFlash(npc.x, npc.y, 0x888899);
          this.arena.recordMasteryStat('nailTears', 1);
          this.arena.showFloatingText(npc.x, npc.y - 36, '🔩 RECALLED', '#ccddee');
          nail.sprite.destroy();
          this.magnetPlayerNail = null;
          player.reduceCooldown('nail-implant', 2000);
        } else if (!this.magnetPlayerNail) {
          player.castAbility('nail-implant', playerCtx);
        }
      }
    }

    if (magLevSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('magnetize', playerCtx);
    }

    if (magLevSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      // R+: Reflect Burst — consume 3 orbs instead of normal protect cast
      if (this.arena.hasUpgrade('r') && this.magnetPlayerShieldOrbs.length >= 3) {
        this.doMagnetReflectBurst('player');
      } else {
        player.castAbility('protect', playerCtx);
      }
    }

    if (magLevSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('atom-smasher', playerCtx);
    }

    void time;
  }

  update(time: number, delta: number): void {
    this.updateMagnetRods(time, delta);
    this.updateMagnetNails(time, delta);
    this.updateMagnetShieldOrbs(time);
    this.updateMagnetAtomSmashers(time, delta);
    this.updateMagnetMagnetized(time, delta);
    this.updateMagnetReflectBurst(time);
    this.updateMagnetSpeedBuff(time);
    this.updateMasteryMetalDetector(time, delta);
    this.updateMagLev(time, delta);
  }

  // ── Public do* methods — called from ArenaScene context builders ───────

  doMagnetPulse(x: number, y: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? npc : player;

    // Mastery — Metal Detector: a pulse landing on a hidden ancient rod exposes it.
    if (owner === 'player' && this.arena.masteryActive) this.tryExposeAncientRod(x, y);

    const ring = scene.add.circle(x, y, 8, 0xcc2244, 0.7).setDepth(6).setStrokeStyle(2, 0xff6688);
    scene.tweens.add({
      targets: ring, scaleX: 10, scaleY: 10, alpha: 0,
      duration: 350, onComplete: () => ring.destroy(),
    });

    const pullRange = 380;
    for (const rod of this.magnetRods) {
      if (rod.owner !== owner) continue;
      const dist = Phaser.Math.Distance.Between(rod.x, rod.y, x, y);
      if (dist <= pullRange) {
        const angle = Math.atan2(y - rod.y, x - rod.x);
        const pulseSpeed = rod.isSword ? 1360 : 680;
        rod.vx = Math.cos(angle) * pulseSpeed;
        rod.vy = Math.sin(angle) * pulseSpeed;
      }
    }

    // Nailed enemies get yanked toward the pulse point — stronger with each nail.
    const implantCount = this.countImplantedNails(owner);
    if (implantCount > 0) {
      const pullAng = Math.atan2(y - target.y, x - target.x);
      const pullSpeed = 220 + (implantCount - 1) * 140;
      if (owner === 'player') {
        this.magnetNailPullVX = Math.cos(pullAng) * pullSpeed;
        this.magnetNailPullVY = Math.sin(pullAng) * pullSpeed;
        this.magnetNailPullUntil = Math.max(this.magnetNailPullUntil, scene.time.now + 350);
      } else if (!target.knockbackImmune) {
        (target.body as Phaser.Physics.Arcade.Body).setVelocity(
          Math.cos(pullAng) * pullSpeed, Math.sin(pullAng) * pullSpeed,
        );
      }
    }

    const shieldOrbs = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    const distToCursor = Phaser.Math.Distance.Between(caster.x, caster.y, x, y);
    if (shieldOrbs.length > 0 && distToCursor <= pullRange) {
      const dx = x - caster.x;
      const dy = y - caster.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const dashSpeed = 1200;
      const dashMs = Phaser.Math.Clamp((dist / dashSpeed) * 1000, 40, 320);
      const body = caster.body as Phaser.Physics.Arcade.Body;
      body.setVelocity((dx / dist) * dashSpeed, (dy / dist) * dashSpeed);
      if (owner === 'player') {
        this.arena.setIsDodging(true);
        player.isInvincible = true;
        scene.time.delayedCall(dashMs, () => {
          if (player.active) {
            player.isInvincible = false;
            this.arena.setIsDodging(false);
            (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          }
        });
        this.magnetPlayerSpeedBuffUntil = scene.time.now + 3000;
      } else {
        this.magnetNpcSpeedBuffUntil = scene.time.now + 3000;
      }
      this.arena.showFloatingText(caster.x, caster.y - 26, '🧲 MAGNET DASH', '#cc2244');
    }
  }

  doMagnetNailAction(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const speed = 520;

    if (this.arena.hasUpgrade('e') && owner === 'player') {
      // E+: fire 3 golden nails in a 12° spread
      const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
      const spreadAngles = [-6, 0, 6].map(d => baseAngle + d * (Math.PI / 180));
      for (const ang of spreadAngles) {
        const spr = scene.add.circle(caster.x, caster.y, 5, 0xffd060, 0.95)
          .setStrokeStyle(1, 0xffee88).setDepth(6);
        const nail: MagnetNail = {
          sprite: spr,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          x: caster.x,
          y: caster.y,
          inEnemy: false,
          implantedUntil: 0,
          owner,
        };
        this.magnetPlayerNails.push(nail);
      }
    } else {
      const existing = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
      if (existing) return;
      const dx = tx - caster.x;
      const dy = ty - caster.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spr = scene.add.circle(caster.x, caster.y, 5, 0x888899, 0.95)
        .setStrokeStyle(1, 0xccddee).setDepth(6);
      const nail: MagnetNail = {
        sprite: spr,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        x: caster.x,
        y: caster.y,
        inEnemy: false,
        implantedUntil: 0,
        owner,
      };
      if (owner === 'player') this.magnetPlayerNail = nail;
      else this.magnetNpcNail = nail;
    }
  }

  doMagnetMagnetize(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const target = owner === 'player' ? npc : player;
    const dist = Phaser.Math.Distance.Between(tx, ty, target.x, target.y);
    if (dist <= 80) {
      const duration = 8000;
      if (owner === 'player') {
        this.magnetNpcMagnetized = true;
        this.magnetNpcMagnetizedUntil = scene.time.now + duration;
      } else {
        this.magnetPlayerMagnetized = true;
        this.magnetPlayerMagnetizedUntil = scene.time.now + duration;
      }
      this.arena.showFloatingText(target.x, target.y - 28, '🧲 MAGNETIZED', '#ff4488');
    }
  }

  doMagnetProtect(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    for (const orb of orbArray) orb.sprite.destroy();
    orbArray.length = 0;

    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 52;
      const ox = caster.x + Math.cos(angle) * r;
      const oy = caster.y + Math.sin(angle) * r;
      const spr = scene.add.circle(ox, oy, 7, 0x4488cc, 0.9)
        .setStrokeStyle(1, 0x88ccff).setDepth(7);
      orbArray.push({ sprite: spr, angle, hp: 5 });
    }
    this.arena.showFloatingText(caster.x, caster.y - 36, '🛡 PROTECT', '#4488cc');
  }

  /** How many of `owner`'s nails are currently implanted in the enemy. */
  private countImplantedNails(owner: 'player' | 'npc'): number {
    const single = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    const array = owner === 'player' ? this.magnetPlayerNails : this.magnetNpcNails;
    let count = single && single.inEnemy ? 1 : 0;
    count += array.filter(n => n.inEnemy).length;
    return count;
  }

  /** Rip out all of `owner`'s implanted nails (destroying their sprites); returns how many. */
  private removeImplantedNails(owner: 'player' | 'npc'): number {
    let removed = 0;
    const single = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    if (single && single.inEnemy) {
      single.sprite.destroy();
      if (owner === 'player') this.magnetPlayerNail = null;
      else this.magnetNpcNail = null;
      removed++;
    }
    if (owner === 'player') {
      for (const n of this.magnetPlayerNails) {
        if (n.inEnemy) { n.sprite.destroy(); removed++; }
      }
      this.magnetPlayerNails = this.magnetPlayerNails.filter(n => !n.inEnemy);
      if (removed > 0) this.magnetPlayerPullStacks = 0;
    } else {
      for (const n of this.magnetNpcNails) {
        if (n.inEnemy) { n.sprite.destroy(); removed++; }
      }
      this.magnetNpcNails = this.magnetNpcNails.filter(n => !n.inEnemy);
    }
    return removed;
  }

  doMagnetAtomSmasher(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const existing = owner === 'player' ? this.magnetPlayerAtomSmasher : this.magnetNpcAtomSmasher;
    if (existing) {
      existing.flashSprite.destroy();
      for (const w of existing.walls) w.sprite.destroy();
    }

    // A small grey trash-compactor core with heavy dark plating.
    const flash = scene.add.circle(x, y, 22, 0x888899, 0.45)
      .setStrokeStyle(4, 0x555566).setDepth(5);

    const W = scene.scale.width;
    const wallH = 160;
    const wallW = 20;
    const leftWall = scene.add.rectangle(-20, y, wallW, wallH, 0x777788)
      .setStrokeStyle(2, 0xaabbcc).setDepth(7);
    const rightWall = scene.add.rectangle(W + 20, y, wallW, wallH, 0x777788)
      .setStrokeStyle(2, 0xaabbcc).setDepth(7);

    const smasher: MagnetAtomSmasher = {
      flashSprite: flash, x, y,
      fireAt: scene.time.now + 3000,
      walls: [
        { sprite: leftWall,  vx: 900,  vy: 0, active: false, hitCooldown: 0 },
        { sprite: rightWall, vx: -900, vy: 0, active: false, hitCooldown: 0 },
      ],
      exploded: false,
      crossed: false,
      owner,
    };

    if (owner === 'player') this.magnetPlayerAtomSmasher = smasher;
    else this.magnetNpcAtomSmasher = smasher;

    this.arena.showFloatingText(x, y - 40, '🗜 TRASH COMPACTOR', '#aabbcc');
  }

  // ── Private per-frame update helpers ─────────────────────────────────────

  private updateMagnetRods(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const dt = delta / 1000;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const pad = 20;
    const friction = 0.88;
    const movingThreshold = 30;

    for (const rod of this.magnetRods) {
      const wasMoving = Math.abs(rod.vx) > movingThreshold || Math.abs(rod.vy) > movingThreshold;

      if (rod.bouncing) {
        if (time > rod.bounceUntil) {
          rod.bouncing = false;
          rod.sprite.setFillStyle(rod.permDamageBonus > 0 ? 0xff9933 : 0x99aacc);
          rod.vx *= 0.3; rod.vy *= 0.3;
        }
      }

      rod.x += rod.vx * dt;
      rod.y += rod.vy * dt;

      if (rod.x < pad) { rod.x = pad; rod.vx = Math.abs(rod.vx); }
      if (rod.x > W - pad) { rod.x = W - pad; rod.vx = -Math.abs(rod.vx); }
      if (rod.y < pad) { rod.y = pad; rod.vy = Math.abs(rod.vy); }
      if (rod.y > H - pad) { rod.y = H - pad; rod.vy = -Math.abs(rod.vy); }

      // Bouncing rods barely lose speed so they ricochet around for the full window.
      const rodFriction = rod.bouncing ? 0.995 : friction;
      rod.vx *= rodFriction;
      rod.vy *= rodFriction;
      if (Math.abs(rod.vx) < 2) rod.vx = 0;
      if (Math.abs(rod.vy) < 2) rod.vy = 0;

      rod.sprite.setPosition(rod.x, rod.y);
      // Q+: blue tint during bounce window; orange perm bonus; default grey
      if (!rod.isSword) {
        if (rod.bouncing && rod.permDamageBonus > 0) rod.sprite.setFillStyle(0x3399ff);
        else if (rod.bouncing) rod.sprite.setFillStyle(0xff4400);
        else if (rod.permDamageBonus > 0) rod.sprite.setFillStyle(0xff9933);
      }
      // Blade perk: rotate sword to face direction of travel
      if (rod.isSword && rod.sprite instanceof Phaser.GameObjects.Rectangle) {
        rod.sprite.rotation = Math.atan2(rod.vy, rod.vx);
      }

      const isMoving = Math.abs(rod.vx) > movingThreshold || Math.abs(rod.vy) > movingThreshold;

      if (isMoving) {
        const trail = scene.add.circle(rod.x, rod.y, 4, rod.bouncing ? 0xff6600 : 0x668899, 0.5).setDepth(3);
        rod.trail.push(trail);
        scene.tweens.add({ targets: trail, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300, onComplete: () => {
          trail.destroy();
          const idx = rod.trail.indexOf(trail);
          if (idx !== -1) rod.trail.splice(idx, 1);
        }});
      }

      if (isMoving || wasMoving) {
        const baseHit = rod.isSword ? 16 : 8;
        const baseDmg = rod.bouncing ? baseHit * 2 : baseHit;
        const tempBonus = rod.bouncing ? baseHit : 0; // Q+ bonus during bounce
        const dmg = baseDmg + rod.permDamageBonus + (this.arena.hasUpgrade('q') ? tempBonus : 0);
        if (rod.owner === 'player') {
          const npcDist = Phaser.Math.Distance.Between(rod.x, rod.y, npc.x, npc.y);
          if (npcDist <= 28 && time > rod.contactCooldownNpc) {
            npc.takeDamage(dmg);
            this.arena.spawnHitFlash(npc.x, npc.y, 0x99aacc);
            this.arena.recordMasteryStat('rodSmashes', 1);
            rod.contactCooldownNpc = time + 500;
            if (rod.destroyOnHit) {
              rod.sprite.destroy();
              for (const t of rod.trail) t.destroy();
              this.magnetRods.splice(this.magnetRods.indexOf(rod), 1);
            }
          }
        } else {
          const playerDist = Phaser.Math.Distance.Between(rod.x, rod.y, player.x, player.y);
          if (playerDist <= 28 && time > rod.contactCooldownPlayer) {
            player.takeDamage(dmg);
            this.arena.spawnHitFlash(player.x, player.y, 0x99aacc);
            rod.contactCooldownPlayer = time + 500;
            if (rod.destroyOnHit) {
              rod.sprite.destroy();
              for (const t of rod.trail) t.destroy();
              this.magnetRods.splice(this.magnetRods.indexOf(rod), 1);
            }
          }
        }
      }

      for (const other of this.magnetRods) {
        if (other === rod) continue;
        const distBetween = Phaser.Math.Distance.Between(rod.x, rod.y, other.x, other.y);
        const minDist = 26;
        if (distBetween < minDist && distBetween > 0) {
          const ang = Math.atan2(rod.y - other.y, rod.x - other.x);
          rod.x = other.x + Math.cos(ang) * minDist;
          rod.y = other.y + Math.sin(ang) * minDist;
          const tmpVx = rod.vx; const tmpVy = rod.vy;
          rod.vx = other.vx * 0.8; rod.vy = other.vy * 0.8;
          other.vx = tmpVx * 0.8; other.vy = tmpVy * 0.8;
        }
      }

      const isMagnetized = rod.owner === 'player' ? this.magnetNpcMagnetized : this.magnetPlayerMagnetized;
      if (isMagnetized) {
        const magTarget = rod.owner === 'player' ? npc : player;
        const magRange = 180;
        const magDist = Phaser.Math.Distance.Between(rod.x, rod.y, magTarget.x, magTarget.y);
        if (magDist <= magRange && magDist > 10) {
          const falloff = Math.max(1, magDist);
          const magnetMult = rod.isSword ? 2 : 1;
          const accel = Math.min(1600 * magnetMult, (600 * 200 * magnetMult) / falloff);
          const magAng = Math.atan2(magTarget.y - rod.y, magTarget.x - rod.x);
          rod.vx += Math.cos(magAng) * accel * dt;
          rod.vy += Math.sin(magAng) * accel * dt;
          const spd = Math.sqrt(rod.vx * rod.vx + rod.vy * rod.vy);
          const speedCap = rod.isSword ? 1400 : 900;
          if (spd > speedCap) { rod.vx = (rod.vx / spd) * speedCap; rod.vy = (rod.vy / spd) * speedCap; }

          // Blade perk: overshoot — extra impulse when passing close to target at speed
          if (rod.isSword) {
            const spd2 = Math.sqrt(rod.vx ** 2 + rod.vy ** 2);
            if (spd2 > 600) {
              const distToTarget = Phaser.Math.Distance.Between(rod.x, rod.y, magTarget.x, magTarget.y);
              if (distToTarget < 30) {
                rod.vx *= 1.3;
                rod.vy *= 1.3;
              }
            }
          }
        }
      }
    }
  }

  private updateMagnetNails(time: number, delta: number): void {
    const { player, npc } = this.arena;
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    // E+ multi-nail array (player only)
    for (let i = this.magnetPlayerNails.length - 1; i >= 0; i--) {
      const nail = this.magnetPlayerNails[i];
      const target = npc;
      if (nail.inEnemy) {
        nail.x = target.x; nail.y = target.y;
        nail.sprite.setPosition(nail.x, nail.y);
        if (time > nail.implantedUntil) {
          nail.sprite.destroy();
          this.magnetPlayerNails.splice(i, 1);
        }
        const tDist = Phaser.Math.Distance.Between(target.x, target.y, player.x, player.y);
        if (tDist > 80 && !target.knockbackImmune) {
          const tAng = Math.atan2(player.y - target.y, player.x - target.x);
          // Pull stacks scale the pull strength
          const stackMult = 1 + 0.5 * this.magnetPlayerPullStacks;
          const pull = 180 * stackMult * dt;
          const body = target.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(body.velocity.x + Math.cos(tAng) * pull, body.velocity.y + Math.sin(tAng) * pull);
        }
      } else {
        nail.x += nail.vx * dt; nail.y += nail.vy * dt;
        nail.sprite.setPosition(nail.x, nail.y);
        if (nail.x < 0 || nail.x > W || nail.y < 0 || nail.y > H) {
          nail.sprite.destroy(); this.magnetPlayerNails.splice(i, 1); continue;
        }
        const isMag = this.magnetNpcMagnetized;
        if (isMag) {
          const toTargetX = target.x - nail.x, toTargetY = target.y - nail.y;
          const toLen = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1;
          if (toLen < 150) {
            nail.vx += (toTargetX / toLen) * 600 * dt;
            nail.vy += (toTargetY / toLen) * 600 * dt;
            const spd = Math.sqrt(nail.vx * nail.vx + nail.vy * nail.vy);
            if (spd > 700) { nail.vx = (nail.vx / spd) * 700; nail.vy = (nail.vy / spd) * 700; }
          }
        }
        const hitDist = Phaser.Math.Distance.Between(nail.x, nail.y, target.x, target.y);
        if (hitDist <= 24) {
          target.takeDamage(18);
          this.arena.spawnHitFlash(target.x, target.y, 0xffd060);
          this.arena.showFloatingText(target.x, target.y - 36, '🔩 NAILED', '#ffd060');
          nail.inEnemy = true;
          nail.implantedUntil = time + 10000;
          nail.x = target.x; nail.y = target.y;
          this.magnetPlayerPullStacks = Math.min(3, this.magnetPlayerPullStacks + 1);
        }
      }
    }

    for (const [nail, owner] of [[this.magnetPlayerNail, 'player'], [this.magnetNpcNail, 'npc']] as [MagnetNail | null, 'player' | 'npc'][]) {
      if (!nail) continue;
      const target = owner === 'player' ? npc : player;

      if (nail.inEnemy) {
        nail.x = target.x;
        nail.y = target.y;
        nail.sprite.setPosition(nail.x, nail.y);
        if (time > nail.implantedUntil) {
          nail.sprite.destroy();
          if (owner === 'player') this.magnetPlayerNail = null;
          else this.magnetNpcNail = null;
        }
        const casterForNail = owner === 'player' ? player : npc;
        const tDist = Phaser.Math.Distance.Between(target.x, target.y, casterForNail.x, casterForNail.y);
        if (tDist > 80 && !target.knockbackImmune) {
          const tAng = Math.atan2(casterForNail.y - target.y, casterForNail.x - target.x);
          const pull = 180 * dt;
          const body = target.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(
            body.velocity.x + Math.cos(tAng) * pull,
            body.velocity.y + Math.sin(tAng) * pull,
          );
        }
      } else {
        nail.x += nail.vx * dt;
        nail.y += nail.vy * dt;
        nail.sprite.setPosition(nail.x, nail.y);

        if (nail.x < 0 || nail.x > W || nail.y < 0 || nail.y > H) {
          nail.sprite.destroy();
          if (owner === 'player') this.magnetPlayerNail = null;
          else this.magnetNpcNail = null;
          continue;
        }

        const isMag = owner === 'player' ? this.magnetNpcMagnetized : this.magnetPlayerMagnetized;
        if (isMag) {
          const toTargetX = target.x - nail.x;
          const toTargetY = target.y - nail.y;
          const toLen = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1;
          const homingRange = 150;
          if (Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) < homingRange) {
            nail.vx += (toTargetX / toLen) * 600 * dt;
            nail.vy += (toTargetY / toLen) * 600 * dt;
            const spd = Math.sqrt(nail.vx * nail.vx + nail.vy * nail.vy);
            if (spd > 700) { nail.vx = (nail.vx / spd) * 700; nail.vy = (nail.vy / spd) * 700; }
          }
        }

        const hitDist = Phaser.Math.Distance.Between(nail.x, nail.y, target.x, target.y);
        if (hitDist <= 24) {
          const dmg = 18;
          target.takeDamage(dmg);
          this.arena.spawnHitFlash(target.x, target.y, 0x888899);
          this.arena.showFloatingText(target.x, target.y - 36, '🔩 NAILED', '#ccddee');
          nail.inEnemy = true;
          nail.implantedUntil = time + 10000;
          nail.x = target.x; nail.y = target.y;
        }
      }
    }
  }

  private updateMagnetShieldOrbs(time: number): void {
    const { player, npc, projectiles } = this.arena;

    if (this.magnetPlayerShieldOrbs.length > 0) {
      this.magnetOrbOrbitAngle += 0.025;
      const r = 52;
      const total = this.magnetPlayerShieldOrbs.length;
      for (let i = total - 1; i >= 0; i--) {
        const orb = this.magnetPlayerShieldOrbs[i];
        orb.angle = this.magnetOrbOrbitAngle + (i / total) * Math.PI * 2;
        const ox = player.x + Math.cos(orb.angle) * r;
        const oy = player.y + Math.sin(orb.angle) * r;
        orb.sprite.setPosition(ox, oy);

        if (projectiles) {
          let orbDestroyed = false;
          for (const go of projectiles.getChildren()) {
            if (orbDestroyed) break;
            const proj = go as Projectile;
            if (!proj.active || proj.isFromPlayer) continue;
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, ox, oy);
            if (d <= 12) {
              orb.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              this.arena.spawnHitFlash(ox, oy, 0x4488cc);
              this.arena.recordMasteryStat('protectBlocks', 1);
              if (orb.hp <= 0) {
                orb.sprite.destroy();
                this.magnetPlayerShieldOrbs.splice(i, 1);
                orbDestroyed = true;
              }
            }
          }
        }
      }
    }

    if (this.magnetNpcShieldOrbs.length > 0) {
      this.magnetNpcOrbOrbitAngle += 0.025;
      const r = 52;
      const total = this.magnetNpcShieldOrbs.length;
      for (let i = total - 1; i >= 0; i--) {
        const orb = this.magnetNpcShieldOrbs[i];
        orb.angle = this.magnetNpcOrbOrbitAngle + (i / total) * Math.PI * 2;
        const ox = npc.x + Math.cos(orb.angle) * r;
        const oy = npc.y + Math.sin(orb.angle) * r;
        orb.sprite.setPosition(ox, oy);

        if (projectiles) {
          let orbDestroyed = false;
          for (const go of projectiles.getChildren()) {
            if (orbDestroyed) break;
            const proj = go as Projectile;
            if (!proj.active || !proj.isFromPlayer) continue;
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, ox, oy);
            if (d <= 12) {
              orb.hp -= proj.damage;
              proj.setActive(false).setVisible(false);
              this.arena.spawnHitFlash(ox, oy, 0x4488cc);
              if (orb.hp <= 0) {
                orb.sprite.destroy();
                this.magnetNpcShieldOrbs.splice(i, 1);
                orbDestroyed = true;
              }
            }
          }
        }
      }
    }

    const dt = (1000 / 60) / 1000;
    if (this.magnetPlayerShieldOrbs.length > 0 && this.magnetNpcMagnetized) {
      const pullTarget = npc;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, pullTarget.x, pullTarget.y);
      if (dist > 30) {
        const ang = Math.atan2(pullTarget.y - player.y, pullTarget.x - player.x);
        const strength = Math.min(1400, (900 * 180) / Math.max(1, dist));
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
          body.velocity.x + Math.cos(ang) * strength * dt,
          body.velocity.y + Math.sin(ang) * strength * dt,
        );
      }
    }
    if (this.magnetNpcShieldOrbs.length > 0 && this.magnetPlayerMagnetized) {
      const pullTarget = player;
      const dist = Phaser.Math.Distance.Between(npc.x, npc.y, pullTarget.x, pullTarget.y);
      if (dist > 30) {
        const ang = Math.atan2(pullTarget.y - npc.y, pullTarget.x - npc.x);
        const strength = Math.min(1400, (900 * 180) / Math.max(1, dist));
        const body = npc.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(
          body.velocity.x + Math.cos(ang) * strength * dt,
          body.velocity.y + Math.sin(ang) * strength * dt,
        );
      }
    }

    void time;
  }

  private updateMagnetAtomSmashers(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const dt = delta / 1000;
    const W = scene.scale.width;

    for (const [smasher, isPlayer] of [[this.magnetPlayerAtomSmasher, true], [this.magnetNpcAtomSmasher, false]] as [MagnetAtomSmasher | null, boolean][]) {
      if (!smasher) continue;

      const owner = smasher.owner;
      const target = owner === 'player' ? npc : player;

      // ── Charging phase ──────────────────────────────────────────────
      if (time < smasher.fireAt) {
        const pulse = 0.3 + 0.15 * Math.sin(time * 0.01);
        if (smasher.flashSprite.active) smasher.flashSprite.setAlpha(pulse);

        // Strongly suck the enemy in — even harder for every nail implanted in them.
        // (This runs after the NPC AI each frame, so setting velocity wins.)
        const dragDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, target.x, target.y);
        if (dragDist <= 320 && dragDist > 4 && !target.knockbackImmune) {
          const dragAng = Math.atan2(smasher.y - target.y, smasher.x - target.x);
          const nailBoost = this.countImplantedNails(owner);
          const pullSpeed = Math.min(dragDist / dt, 260 + nailBoost * 170);
          (target.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(dragAng) * pullSpeed, Math.sin(dragAng) * pullSpeed,
          );
        }
        // Drag owned rods hard into the compactor so they're primed to launch.
        for (const rod of this.magnetRods) {
          if (rod.owner !== owner) continue;
          const rodDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, rod.x, rod.y);
          if (rodDist <= 340 && rodDist > 4) {
            const dragAng = Math.atan2(smasher.y - rod.y, smasher.x - rod.x);
            const pull = Math.min(rodDist / dt, 560);
            rod.vx = Math.cos(dragAng) * pull;
            rod.vy = Math.sin(dragAng) * pull;
          }
        }
        continue;
      }

      // ── Wall phase ──────────────────────────────────────────────────
      // Activate walls on the first frame after fireAt
      for (const wall of smasher.walls) {
        if (!wall.active && !smasher.crossed) {
          wall.active = true;
          wall.sprite.setPosition(wall.vx > 0 ? -20 : W + 20, smasher.y);
        }
      }

      // Move active walls; remove them if they exit the arena
      let anyActive = false;
      for (const wall of smasher.walls) {
        if (!wall.active) continue;
        wall.sprite.x += wall.vx * dt;
        if (wall.sprite.x < -80 || wall.sprite.x > W + 80) {
          wall.sprite.destroy();
          wall.active = false;
          continue;
        }
        anyActive = true;
      }

      // Contact damage with per-wall 500ms cooldown; after crossing, walls despawn on hit
      for (const wall of smasher.walls) {
        if (!wall.active) continue;
        const wallDist = Phaser.Math.Distance.Between(wall.sprite.x, wall.sprite.y, target.x, target.y);
        if (wallDist <= 50 && time > wall.hitCooldown) {
          target.takeDamage(15);
          this.arena.spawnHitFlash(target.x, target.y, 0x884433);
          wall.hitCooldown = time + 500;
          if (smasher.crossed) {
            wall.sprite.destroy();
            wall.active = false;
          }
        }
      }

      // One-shot AoE + rod bounce when walls first cross the center
      if (!smasher.crossed) {
        const lw = smasher.walls[0];
        const rw = smasher.walls[1];
        if ((lw.active && lw.sprite.x >= smasher.x) || (rw.active && rw.sprite.x <= smasher.x)) {
          smasher.crossed = true;
          if (smasher.flashSprite.active) smasher.flashSprite.destroy();

          // Mastery — Metal Detector: the player's atom smash activates any exposed
          // ancient rod its walls swept over, turning it into a laser turret.
          if (owner === 'player' && this.arena.masteryActive) this.activateAncientRods(smasher.y);

          const aeoRadius = 120;
          const aeoDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, target.x, target.y);
          if (aeoDist <= aeoRadius) {
            // Anyone caught in the crusher takes 35.
            target.takeDamage(35);
            this.arena.spawnHitFlash(target.x, target.y, 0xff2244);
            if (owner === 'player') this.arena.recordMasteryStat('atomSmashes', 1);
            // Implanted enemies get their nails ripped out for +30 damage.
            const ripped = this.removeImplantedNails(owner);
            if (ripped > 0) {
              target.takeDamage(30);
              this.arena.showFloatingText(target.x, target.y - 54, '🔩 IMPLANT CRUSHED +30', '#ffd060');
            }
          }
          const boom = scene.add.circle(smasher.x, smasher.y, 20, 0xff4400, 0.9).setDepth(8);
          scene.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 500, onComplete: () => boom.destroy() });
          this.arena.showFloatingText(smasher.x, smasher.y - 40, '💥 COMPACTED', '#aabbcc');

          for (const rod of this.magnetRods) {
            if (rod.owner !== owner) continue;
            const rodDist = Phaser.Math.Distance.Between(smasher.x, smasher.y, rod.x, rod.y);
            if (rodDist <= 200) {
              rod.bouncing = true;
              rod.bounceUntil = time + 3000;
              // Fling ballistically in scattered directions — they ricochet off walls.
              const bounceAng = Math.atan2(rod.y - smasher.y, rod.x - smasher.x) + (Math.random() - 0.5) * 1.4;
              const speed = 750 + Math.random() * 300;
              rod.vx = Math.cos(bounceAng) * speed;
              rod.vy = Math.sin(bounceAng) * speed;
              // Q+: Forged Rods — permanent bonus + blue-glow bounce window.
              if (this.arena.hasUpgrade('q')) {
                rod.permDamageBonus += 2;
                if (!rod.isSword) rod.sprite.setFillStyle(0x3399ff);
              }
            }
          }
        }
      }

      // Clean up smasher once all walls are gone
      if (!anyActive) {
        if (smasher.flashSprite.active) smasher.flashSprite.destroy();
        if (isPlayer) this.magnetPlayerAtomSmasher = null;
        else this.magnetNpcAtomSmasher = null;
      }
    }
  }

  private updateMagnetMagnetized(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;

    if (this.magnetNpcMagnetized) {
      if (time > this.magnetNpcMagnetizedUntil) {
        this.magnetNpcMagnetized = false;
        if (this.magnetNpcAura) { this.magnetNpcAura.destroy(); this.magnetNpcAura = null; }
      } else {
        if (!this.magnetNpcAura) {
          this.magnetNpcAura = scene.add.circle(npc.x, npc.y, 180, 0xcc2244, 0)
            .setStrokeStyle(2, 0xff4488, 0.6).setDepth(2);
        }
        this.magnetNpcAura.setPosition(npc.x, npc.y);
        const remaining = this.magnetNpcMagnetizedUntil - time;
        const baseAlpha = remaining < 2000 ? (remaining / 2000) * 0.6 : 0.6;
        const pulse = baseAlpha * (0.6 + 0.4 * Math.sin(time * 0.008));
        this.magnetNpcAura.setStrokeStyle(2, 0xff4488, pulse);
      }
    } else if (this.magnetNpcAura) {
      this.magnetNpcAura.destroy(); this.magnetNpcAura = null;
    }

    if (this.magnetPlayerMagnetized) {
      if (time > this.magnetPlayerMagnetizedUntil) {
        this.magnetPlayerMagnetized = false;
        if (this.magnetPlayerAura) { this.magnetPlayerAura.destroy(); this.magnetPlayerAura = null; }
      } else {
        if (!this.magnetPlayerAura) {
          this.magnetPlayerAura = scene.add.circle(player.x, player.y, 180, 0xcc2244, 0)
            .setStrokeStyle(2, 0xff4488, 0.6).setDepth(2);
        }
        this.magnetPlayerAura.setPosition(player.x, player.y);
        const remaining = this.magnetPlayerMagnetizedUntil - time;
        const baseAlpha = remaining < 2000 ? (remaining / 2000) * 0.6 : 0.6;
        const pulse = baseAlpha * (0.6 + 0.4 * Math.sin(time * 0.008));
        this.magnetPlayerAura.setStrokeStyle(2, 0xff4488, pulse);
      }
    } else if (this.magnetPlayerAura) {
      this.magnetPlayerAura.destroy(); this.magnetPlayerAura = null;
    }

    // F+: Copper Barrage — spawn a copper rod from magnetized enemy toward caster
    if (this.arena.hasUpgrade('f')) {
      if (this.magnetNpcMagnetized) {
        this.magnetCopperSpawnAccumPlayer += delta;
        if (this.magnetCopperSpawnAccumPlayer >= 1200) {
          this.magnetCopperSpawnAccumPlayer = 0;
          const ang = Math.atan2(player.y - npc.y, player.x - npc.x) + (Math.random() - 0.5) * 0.6;
          const speed = 250;
          const spr = scene.add.circle(npc.x, npc.y, 6, 0xcc7744, 0.9)
            .setStrokeStyle(1, 0xffaa66).setDepth(5);
          const copper: MagnetRod = {
            sprite: spr, trail: [],
            x: npc.x, y: npc.y,
            vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
            contactCooldownPlayer: 0, contactCooldownNpc: 0,
            bouncing: false, bounceUntil: 0,
            owner: 'player',
            destroyOnHit: true,
            permDamageBonus: 0,
            isSword: false,
          };
          this.magnetRods.push(copper);
        }
      } else {
        this.magnetCopperSpawnAccumPlayer = 0;
      }
    }

    void delta;
  }

  private updateMagnetSpeedBuff(time: number): void {
    if (time < this.magnetPlayerSpeedBuffUntil) {
      // Speed buff applied passively via arena speed mult
    }
    if (time < this.magnetNpcSpeedBuffUntil) {
      // NPC speed boost handled in AI speed mult
    }
    void time;
  }

  // ── Upgrade ability implementations ──────────────────────────────

  private doMagnetRepulse(mx: number, my: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const target = owner === 'player' ? npc : player;
    const repulseRange = 320;

    // VFX
    const ring = scene.add.circle(caster.x, caster.y, 8, 0xcc2244, 0.5)
      .setStrokeStyle(2, 0xff88aa).setDepth(6);
    scene.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
    this.arena.showFloatingText(caster.x, caster.y - 30, '💢 REPULSE', '#ff4466');

    void mx; void my;

    // Knock rods outward from caster
    for (const rod of this.magnetRods) {
      if (rod.owner !== owner) continue;
      const dist = Phaser.Math.Distance.Between(rod.x, rod.y, caster.x, caster.y);
      if (dist <= repulseRange) {
        const ang = Math.atan2(rod.y - caster.y, rod.x - caster.x);
        rod.vx = Math.cos(ang) * 680;
        rod.vy = Math.sin(ang) * 680;
      }
    }

    // Knock back nailed enemy
    const nail = owner === 'player' ? this.magnetPlayerNail : this.magnetNpcNail;
    const nails = owner === 'player' ? this.magnetPlayerNails : this.magnetNpcNails;
    const hasNailed = (nail && nail.inEnemy) || nails.some(n => n.inEnemy);
    if (hasNailed && !target.knockbackImmune) {
      const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
      const body = target.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(ang) * 500, Math.sin(ang) * 500);
    }

    // Shove opponent if inside caster's orb ring
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;
    const orbitRadius = 52 + 28; // orb radius + target radius
    const distToTarget = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
    if (orbArray.length > 0 && distToTarget <= orbitRadius && !target.knockbackImmune) {
      const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
      const body = target.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(ang) * 600, Math.sin(ang) * 600);
    }
  }

  private doMagnetReflectBurst(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const orbArray = owner === 'player' ? this.magnetPlayerShieldOrbs : this.magnetNpcShieldOrbs;

    // Consume 3 orbs
    for (let i = 0; i < 3; i++) {
      const orb = orbArray.pop();
      if (orb) orb.sprite.destroy();
    }

    // Set reflect state
    if (owner === 'player') {
      this.magnetReflectUntilPlayer = scene.time.now + 1500;
      this.magnetReflectCenterPlayerX = caster.x;
      this.magnetReflectCenterPlayerY = caster.y;
    } else {
      this.magnetReflectUntilNpc = scene.time.now + 1500;
      this.magnetReflectCenterNpcX = caster.x;
      this.magnetReflectCenterNpcY = caster.y;
    }

    const radius = 180;
    const burst = scene.add.circle(caster.x, caster.y, radius, 0x4488cc, 0.2)
      .setStrokeStyle(3, 0x88ccff, 0.8).setDepth(6);
    scene.tweens.add({ targets: burst, alpha: 0, duration: 1500, onComplete: () => burst.destroy() });
    this.arena.showFloatingText(caster.x, caster.y - 40, '🔵 REFLECT FIELD', '#4488cc');
  }

  private updateMagnetReflectBurst(time: number): void {
    const { projectiles } = this.arena;
    if (!projectiles) return;

    for (const [untilTime, cx, cy, isPlayer] of [
      [this.magnetReflectUntilPlayer, this.magnetReflectCenterPlayerX, this.magnetReflectCenterPlayerY, true],
      [this.magnetReflectUntilNpc, this.magnetReflectCenterNpcX, this.magnetReflectCenterNpcY, false],
    ] as [number, number, number, boolean][]) {
      if (time > untilTime) continue;
      const reflectRadius = 180;
      const projOwner = isPlayer ? 'npc' : 'player'; // reflect enemy projectiles

      for (const go of projectiles.getChildren()) {
        const proj = go as unknown as Projectile;
        if (!proj.active) continue;
        const isEnemyProj = isPlayer ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!isEnemyProj) continue;
        const d = Phaser.Math.Distance.Between(proj.x, proj.y, cx, cy);
        if (d <= reflectRadius) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (proj as any).isFromPlayer = isPlayer;
          void projOwner;
          const body = proj.body as Phaser.Physics.Arcade.Body | null;
          if (body) body.setVelocity(-body.velocity.x, -body.velocity.y);
        }
      }
    }
  }

  // ── Mastery — Metal Detector (ancient rods) ───────────────────────────

  private ensureAncientRods(): void {
    if (this.ancientRodsInit || !this.arena.masteryActive) return;
    this.ancientRodsInit = true;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = 0; i < ANCIENT_ROD_COUNT; i++) {
      this.ancientRods.push({
        hx: Phaser.Math.Between(80, W - 80),
        hy: Phaser.Math.Between(80, H - 80),
        exposed: false, activated: false, laserAccum: 0, rod: null,
      });
    }
  }

  /** A mag-pulse landing on a hidden ancient rod exposes it — it becomes a real, brown rod. */
  private tryExposeAncientRod(x: number, y: number): void {
    const scene = this.arena.scene;
    for (const ar of this.ancientRods) {
      if (ar.exposed) continue;
      if (Phaser.Math.Distance.Between(x, y, ar.hx, ar.hy) > ANCIENT_EXPOSE_RADIUS) continue;
      ar.exposed = true;
      const spr = scene.add.circle(ar.hx, ar.hy, 9, 0x8a5a2b, 0.95).setStrokeStyle(2, 0xbb8844).setDepth(6);
      const rod: MagnetRod = {
        sprite: spr, trail: [], x: ar.hx, y: ar.hy, vx: 0, vy: 0,
        contactCooldownPlayer: 0, contactCooldownNpc: 0, bouncing: false, bounceUntil: 0,
        owner: 'player', permDamageBonus: 0,
      };
      ar.rod = rod;
      this.magnetRods.push(rod);
      this.arena.showFloatingText(ar.hx, ar.hy - 20, '⛏ ANCIENT ROD!', '#bb8844');
      const flash = scene.add.circle(ar.hx, ar.hy, 12, 0xffcc66, 0.8).setDepth(7);
      scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    }
  }

  /** The player's atom smash sweeping over an exposed ancient rod turns it into a laser turret. */
  private activateAncientRods(smasherY: number): void {
    for (const ar of this.ancientRods) {
      if (!ar.exposed || ar.activated || !ar.rod) continue;
      if (Math.abs(ar.rod.y - smasherY) > ANCIENT_ACTIVATE_Y_BAND) continue;
      ar.activated = true;
      (ar.rod.sprite as Phaser.GameObjects.Arc).setFillStyle(0xffaa33, 1);
      this.arena.showFloatingText(ar.rod.x, ar.rod.y - 24, '⚡ ROD ONLINE', '#ffcc44');
    }
  }

  private updateMasteryMetalDetector(_time: number, delta: number): void {
    if (!this.arena.masteryActive) return;
    this.ensureAncientRods();
    const { npc, scene } = this.arena;
    // Only fires at an enemy with magnetic properties: magnetized, or carrying our nails.
    const npcMagnetic = this.magnetNpcMagnetized || this.countImplantedNails('player') > 0;
    for (const ar of this.ancientRods) {
      if (!ar.activated || !ar.rod) continue;
      ar.laserAccum += delta;
      if (ar.laserAccum < ANCIENT_LASER_INTERVAL_MS) continue;
      ar.laserAccum -= ANCIENT_LASER_INTERVAL_MS;
      if (!npcMagnetic || !npc.active || npc.hp <= 0) continue;
      npc.takeDamage(ANCIENT_LASER_DAMAGE);
      this.arena.spawnHitFlash(npc.x, npc.y, 0xffaa33);
      const beam = scene.add.line(0, 0, ar.rod.x, ar.rod.y, npc.x, npc.y, 0xffcc33, 0.9)
        .setOrigin(0, 0).setLineWidth(2).setDepth(7);
      scene.tweens.add({ targets: beam, alpha: 0, duration: 220, onComplete: () => beam.destroy() });
      this.arena.showFloatingText(npc.x, npc.y - 30, `⚡ ${ANCIENT_LASER_DAMAGE}`, '#ffcc44');
    }
  }

  // ── Mastery — Mag-Lev ─────────────────────────────────────────────────

  private magLevSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'mag-lev') return s;
    }
    return null;
  }

  getMagLevCooldownRatio(time: number): number {
    return Math.min(1, (time - this.magLevLastMountAt) / MAGLEV_COOLDOWN_MS);
  }

  private toggleMagLev(time: number): void {
    if (this.magLevMounted) {
      this.dismountMagLev('player');
      this.arena.player.triggerCooldown('mag-lev'); // broadcast the toggle online
      return;
    }
    if (time - this.magLevLastMountAt < MAGLEV_COOLDOWN_MS) return;
    this.magLevLastMountAt = time;
    this.mountMagLev('player');
    this.arena.player.triggerCooldown('mag-lev');
  }

  /** Online replay: the remote magnet player toggled their board. */
  doNpcMagLev(): void {
    if (this.npcMagLevMounted) this.dismountMagLev('npc');
    else this.mountMagLev('npc');
  }

  private mountMagLev(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const board = this.arena.scene.add.rectangle(caster.x, caster.y + 18, 40, 8, 0x6644aa, 0.9)
      .setStrokeStyle(2, 0xaa66ff).setDepth(4);
    if (owner === 'player') {
      this.magLevMounted = true; this.magLevPreShield = caster.shieldHp;
      this.magLevBoard = board; this.magLevBashCd = new Map();
    } else {
      this.npcMagLevMounted = true; this.npcMagLevPreShield = caster.shieldHp;
      this.npcMagLevBoard = board; this.npcMagLevBashCd = new Map();
    }
    caster.shieldHp += MAGLEV_SHIELD;
    this.arena.showFloatingText(caster.x, caster.y - 40, '🛹 MAG-LEV', '#aa66ff');
  }

  private dismountMagLev(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.shieldHp = 0; // dismounting removes all shield HP you have
    if (owner === 'player') {
      this.magLevMounted = false;
      if (this.magLevBoard) { this.magLevBoard.destroy(); this.magLevBoard = null; }
    } else {
      this.npcMagLevMounted = false;
      if (this.npcMagLevBoard) { this.npcMagLevBoard.destroy(); this.npcMagLevBoard = null; }
    }
    this.arena.showFloatingText(caster.x, caster.y - 40, '🛹 DISMOUNT', '#8877aa');
  }

  private magLevSling(mouseX: number, mouseY: number): void {
    const p = this.arena.player;
    const dx = mouseX - p.x, dy = mouseY - p.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (p.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * MAGLEV_SLING_SPEED, (dy / len) * MAGLEV_SLING_SPEED);
    this.arena.setIsDodging(true);
    this.arena.scene.time.delayedCall(200, () => this.arena.setIsDodging(false));
  }

  private updateMagLev(time: number, _delta: number): void {
    const { player, npc } = this.arena;
    if (this.magLevMounted) {
      if (this.magLevBoard) this.magLevBoard.setPosition(player.x, player.y + 18);
      if (player.shieldHp <= this.magLevPreShield) {
        this.dismountMagLev('player'); // board shield spent
      } else if (npc.active && npc.hp > 0
        && Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) <= MAGLEV_BASH_RADIUS
        && time > (this.magLevBashCd.get(npc) ?? 0)) {
        this.magLevBashCd.set(npc, time + MAGLEV_BASH_CD_MS);
        npc.takeDamage(MAGLEV_BASH_DMG);
        this.arena.spawnHitFlash(npc.x, npc.y, 0xaa66ff);
        this.arena.showFloatingText(npc.x, npc.y - 30, `🛹 ${MAGLEV_BASH_DMG}`, '#cc99ff');
      }
    }
    if (this.npcMagLevMounted) {
      if (this.npcMagLevBoard) this.npcMagLevBoard.setPosition(npc.x, npc.y + 18);
      if (npc.shieldHp <= this.npcMagLevPreShield) {
        this.dismountMagLev('npc');
      } else if (player.active && player.hp > 0
        && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= MAGLEV_BASH_RADIUS
        && time > (this.npcMagLevBashCd.get(player) ?? 0)) {
        this.npcMagLevBashCd.set(player, time + MAGLEV_BASH_CD_MS);
        player.takeDamage(MAGLEV_BASH_DMG);
        this.arena.spawnHitFlash(player.x, player.y, 0xaa66ff);
      }
    }
  }
}
