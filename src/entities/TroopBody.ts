import Phaser from 'phaser';
import { Fighter, DamageOpts } from './Fighter';

/**
 * A summoned soldier's body: Emotion's knights, archers and barbarian.
 *
 * `BodySection`'s trick with health of its own — an invisible Fighter the arena registers wherever
 * its owner's enemies look for targets (`enemies` / `enemyGroup` for the npc's troops,
 * `Fighter.bodies()` for the player's), so every damage path the engine has can reach a soldier
 * without knowing soldiers exist. Unlike a section, what it takes is its own: it has hit points,
 * and it dies.
 *
 * The kit that owns it draws it, walks it (`place`) and buries it. A status laid on one mostly goes
 * nowhere — the kit reads the few it honours (Depressed).
 */
export class TroopBody extends Fighter {
  /** Called after a hit actually cost this body health, with what it cost. */
  onStruck: ((lost: number, opts?: DamageOpts) => void) | null = null;
  /** Multiplies every hit before anything else sees it. Rewritten by the owning kit each frame. */
  takenMult = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: number, maxHp: number, radius: number) {
    super(scene, x, y, 'husk', { id: 'troop', name, color, emoji: '', abilities: [] }, maxHp, 0);
    this.setAlpha(0);
    this.forceInvisible = true;
    this.quietDeath = true;
    this.hideHealthBar();
    const pb = this.body as Phaser.Physics.Arcade.Body;
    pb.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    pb.setCollideWorldBounds(false);
    pb.setImmovable(true);
    pb.moves = false;
  }

  /** Put the body where the kit says its soldier is standing. */
  place(x: number, y: number): void {
    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
  }

  takeDamage(amount: number, opts?: DamageOpts): void {
    if (!this.active || this.hp <= 0) return;
    const before = this.hp;
    super.takeDamage(amount > 0 ? Math.max(1, Math.round(amount * this.takenMult)) : amount, opts);
    const lost = before - this.hp;
    if (lost > 0) this.onStruck?.(lost, opts);
  }

  applySelfDamage(): void { /* no-op */ }
}
