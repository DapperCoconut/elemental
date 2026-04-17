import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

type TitanPhase = 'idle' | 'barrage' | 'rockets' | 'slam' | 'cooldown';

interface ShieldOrb {
  sprite: Phaser.GameObjects.Arc;
  hp: number;
  angle: number;
  active: boolean;
}

interface TitanRocket {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  hp: number;
}

export class TitanCorrupted extends CorruptedBase {
  public shieldOrbs: ShieldOrb[] = [];
  public titanRockets: TitanRocket[] = [];
  private phase: TitanPhase = 'idle';
  private phaseUntil = 0;
  private attackCycleIdx = 0;
  private orbitAngle = 0;
  private orbitRadius = 62;
  private attackDelay = 2500;

  /** Callback: fire a projectile from titan toward player */
  public onFireProjectile?: (fromX: number, fromY: number, toX: number, toY: number, damage: number) => void;
  /** Callback: deal AoE slam damage centered on titan */
  public onSlam?: (x: number, y: number, radius: number, damage: number) => void;
  /** Callback: spawn a homing rocket */
  public onSpawnRocket?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 500, speed = 50) {
    super(scene, x, y, 'corrupted-titan', CorruptedType.Titan, maxHp, speed);
    this.isInvincible = true; // invincible until shields are dead

    // Create 2 orbiting shield orbs
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const sx = x + Math.cos(angle) * this.orbitRadius;
      const sy = y + Math.sin(angle) * this.orbitRadius;
      const sprite = (scene as Phaser.Scene).add
        .circle(sx, sy, 12, 0x003344, 1)
        .setStrokeStyle(2, 0x44ffff, 1)
        .setDepth(6);
      this.shieldOrbs.push({ sprite, hp: 80, angle, active: true });
    }
  }

  /** Called by InvasionScene when a player projectile hits a shield orb */
  damageShield(orbIdx: number, amount: number): void {
    const orb = this.shieldOrbs[orbIdx];
    if (!orb || !orb.active) return;
    orb.hp -= amount;

    const flash = (this.scene as Phaser.Scene).add
      .circle(orb.sprite.x, orb.sprite.y, 16, 0xffffff, 0.5).setDepth(7);
    (this.scene as Phaser.Scene).tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });

    if (orb.hp <= 0) {
      orb.active = false;
      orb.sprite.destroy();
      // Check if all shields dead
      if (this.shieldOrbs.every(o => !o.active)) {
        this.isInvincible = false;
        // Flash body red to indicate vulnerability
        const boom = (this.scene as Phaser.Scene).add
          .circle(this.x, this.y, 40, 0xff0000, 0.4).setDepth(7);
        (this.scene as Phaser.Scene).tweens.add({ targets: boom, scaleX: 2, scaleY: 2, alpha: 0, duration: 600, onComplete: () => boom.destroy() });
      }
    }
  }

  aiTick(
    target: Fighter,
    _projectiles: Phaser.Physics.Arcade.Group,
    _allCorrupted: CorruptedBase[],
    time: number,
    delta: number,
  ): void {
    if (!this.active || this.hp <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Orbit shields
    this.orbitAngle += delta * 0.001;
    for (let i = 0; i < this.shieldOrbs.length; i++) {
      const orb = this.shieldOrbs[i];
      if (!orb.active) continue;
      const angle = this.orbitAngle + (i / this.shieldOrbs.length) * Math.PI * 2;
      const sx = this.x + Math.cos(angle) * this.orbitRadius;
      const sy = this.y + Math.sin(angle) * this.orbitRadius;
      orb.sprite.setPosition(sx, sy);
      orb.angle = angle;
    }

    // Update rocket positions
    for (const rocket of this.titanRockets) {
      if (!rocket.active) continue;
      // Home toward target
      const dx = target.x - rocket.x;
      const dy = target.y - rocket.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const homingStrength = 3;
      rocket.vx += (dx / len) * homingStrength;
      rocket.vy += (dy / len) * homingStrength;
      // Clamp speed
      const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
      if (speed > 280) { rocket.vx *= 280 / speed; rocket.vy *= 280 / speed; }
      rocket.x += rocket.vx * (delta / 1000);
      rocket.y += rocket.vy * (delta / 1000);
      rocket.sprite.setPosition(rocket.x, rocket.y);

      // Check contact with player
      const dist = Phaser.Math.Distance.Between(rocket.x, rocket.y, target.x, target.y);
      if (dist <= 30) {
        target.takeDamage(20);
        this.destroyRocket(rocket);
      }
    }

    // Slow movement toward player
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist > 140) {
      body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    } else {
      body.setVelocity(0, 0);
    }

    // Attack phase machine
    switch (this.phase) {
      case 'idle': {
        if (time >= this.phaseUntil) {
          const attacks: TitanPhase[] = ['barrage', 'rockets', 'slam'];
          this.phase = attacks[this.attackCycleIdx % attacks.length];
          this.attackCycleIdx++;
          this.executeAttack(target, time);
        }
        break;
      }
      case 'barrage':
      case 'rockets':
      case 'slam': {
        if (time >= this.phaseUntil) {
          this.phase = 'cooldown';
          this.phaseUntil = time + this.attackDelay;
        }
        break;
      }
      case 'cooldown': {
        if (time >= this.phaseUntil) {
          this.phase = 'idle';
          this.phaseUntil = time;
        }
        break;
      }
    }
  }

  private executeAttack(target: Fighter, time: number): void {
    if (this.phase === 'barrage') {
      // 8 projectiles in spread
      const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
      for (let i = 0; i < 8; i++) {
        const a = baseAngle + ((i - 3.5) / 3.5) * (Math.PI / 3);
        this.onFireProjectile?.(this.x, this.y,
          this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 15);
      }
      this.phaseUntil = time + 1200;
    } else if (this.phase === 'rockets') {
      // 2 homing rockets
      for (let i = 0; i < 2; i++) {
        const offsetAngle = (i / 2) * Math.PI * 2;
        const rx = this.x + Math.cos(offsetAngle) * this.orbitRadius * 0.5;
        const ry = this.y + Math.sin(offsetAngle) * this.orbitRadius * 0.5;
        this.onSpawnRocket?.(rx, ry);
      }
      this.phaseUntil = time + 1500;
    } else if (this.phase === 'slam') {
      // Close-range slam
      const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
      if (dist <= 140) {
        this.onSlam?.(this.x, this.y, 120, 40);
      }
      this.phaseUntil = time + 1000;
    }
  }

  destroyRocket(rocket: TitanRocket): void {
    if (!rocket.active) return;
    rocket.active = false;
    const boom = (this.scene as Phaser.Scene).add
      .circle(rocket.x, rocket.y, 8, 0xff4400, 0.8).setDepth(7);
    (this.scene as Phaser.Scene).tweens.add({ targets: boom, scaleX: 4, scaleY: 4, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
    rocket.sprite.destroy();
  }

  destroy(fromScene?: boolean): void {
    for (const orb of this.shieldOrbs) {
      if (orb.active) { orb.sprite.destroy(); orb.active = false; }
    }
    for (const r of this.titanRockets) {
      if (r.active) this.destroyRocket(r);
    }
    super.destroy(fromScene);
  }
}

void (Projectile as unknown);
