import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Image {
  public damage: number;
  public readonly isFromPlayer: boolean;
  public isPowered = false;
  public perkBoost = 1;
  public isHeal = false;
  public portalUsed = false;
  /**
   * Ruin's Shatter Starter: this shot has flown through a ruin crystal. It comes out half the
   * size and no longer deals damage at all — RuinKit converts health to weak HP on the hit
   * instead, at the two projectile chokepoints in ArenaScene.
   */
  public ruinRusted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    damage: number,
    isFromPlayer: boolean,
  ) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    // Do NOT call scene.physics.add.existing here.
    // The Phaser.Physics.Arcade.Group that owns this projectile will enable
    // physics via its createCallbackHandler when group.add(this) is called.
    // Setting velocity before that happens causes the group to overwrite the
    // body with a fresh zero-velocity one.
    this.damage = damage;
    this.isFromPlayer = isFromPlayer;
  }

  /** Call this after adding to the projectile group to set it in motion. */
  launch(vx: number, vy: number): this {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    return this;
  }
}
