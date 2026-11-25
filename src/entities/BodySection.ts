import Phaser from 'phaser';
import { Fighter, DamageOpts } from './Fighter';

/**
 * One more piece of a fighter's body that can be hit: String's abdomen lobes.
 *
 * The Blood Tree's trick, pointed the other way — an invisible Fighter that the arena registers
 * wherever its owner's enemies look for targets (`enemies` / `enemyGroup` for the npc's sections,
 * `Fighter.bodies()` and the player-parts group for the player's), so every damage path the engine
 * has reaches it without knowing it exists. It has no health of its own: whatever it takes lands
 * on its owner, multiplied by `damageMult`. Because each section is a separate body, anything that
 * hits several bodies at once — a blast, a shot that passes through — bills the owner once per
 * section it touches.
 *
 * Only damage is forwarded. A status, shove or grab laid on a section goes nowhere.
 */
export class BodySection extends Fighter {
  /** Called after a hit on this section actually cost the owner health. */
  onStruck: ((amount: number) => void) | null = null;

  constructor(scene: Phaser.Scene, readonly owner: Fighter, readonly damageMult: number, radius: number) {
    super(scene, owner.x, owner.y, 'husk', {
      id: 'body-section', name: owner.element.name, color: owner.element.color, emoji: '', abilities: [],
    }, owner.maxHp, 0);
    this.setAlpha(0);
    this.forceInvisible = true;
    this.hideHealthBar();
    const pb = this.body as Phaser.Physics.Arcade.Body;
    pb.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    pb.setCollideWorldBounds(false);
    pb.setImmovable(true);
    pb.moves = false;
    this.mirror();
  }

  /** Put the section where the chain says it is, and keep it reading as part of its owner. */
  place(x: number, y: number): void {
    this.setPosition(x, y);
    const pb = this.body as Phaser.Physics.Arcade.Body | null;
    pb?.reset(x, y);
    this.mirror();
  }

  /** Health, phasing and the co-op block are the owner's: a section is hittable exactly when they are. */
  private mirror(): void {
    const o = this.owner;
    this.maxHp = o.maxHp;
    this.hp = o.active ? o.hp : 0;
    this.projectilePhase = o.projectilePhase;
    this.allyDamageBlocked = o.allyDamageBlocked;
    this.downed = o.downed;
  }

  setIncomingCritContext(chance: number, mult: number): void {
    this.owner.setIncomingCritContext(chance, mult);
  }

  rollDodge(): boolean {
    return this.owner.rollDodge();
  }

  takeDamage(amount: number, opts?: DamageOpts): void {
    const o = this.owner;
    if (!o.active || o.hp <= 0) return;
    if (this.lastDamageOwner) o.lastDamageOwner = this.lastDamageOwner;
    const before = o.hp + o.shieldHp;
    o.takeDamage(amount > 0 ? Math.round(amount * this.damageMult) : amount, opts);
    this.lastIncomingDamage = o.lastIncomingDamage;
    this.mirror();
    const lost = before - (o.hp + o.shieldHp);
    if (lost > 0) this.onStruck?.(lost);
  }

  /** Nothing to mend: the health is the owner's. */
  heal(): void { /* no-op */ }

  applySelfDamage(): void { /* no-op */ }
}
