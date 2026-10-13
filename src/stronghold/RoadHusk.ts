import Phaser from 'phaser';
import { Husk } from '../invasion/Husk';
import { HuskVariantDef } from '../invasion/HuskVariants';
import { pointAlong, headingAlong, PATH_LENGTH } from './StrongholdMap';

/**
 * A husk on the road. The invasion `Husk` keeps its body, textures, DOT ticking and the
 * common status fields; this adds the road position and the handful of statuses the tower
 * movesets apply that the 1v1 game has no field for (a plain slow, a weaken, a bleed).
 */
export class RoadHusk extends Husk {
  /** Distance travelled along the road, in px. The targeting order and the breach check. */
  public pathDist = 0;
  /** Sideways offset from the centre line so a column does not stack into one sprite. */
  public readonly lateral: number;
  public readonly roadSpeed: number;
  public readonly bounty: number;
  public readonly breach: number;

  public slowMult = 1;
  public slowUntil = 0;
  public weakenMult = 1;
  public weakenUntil = 0;
  public bleedUntil = 0;
  public bleedAccum = 0;
  /** Set by the Stronghold stun rider — the husk reads as stunned, not frozen. */
  public stunnedUntil = 0;
  /** Throttles the status pop-ups so a DOT does not print its icon every tick. */
  public lastStatusText = new Map<string, number>();
  /** True while a barrier is holding this husk. */
  public blocked = false;

  private readonly scratch = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene, variant: HuskVariantDef,
    hp: number, speed: number, bounty: number, breach: number,
  ) {
    const start = pointAlong(0);
    super(scene, start.x, start.y, hp, speed, 6, 950, variant);
    this.roadSpeed = speed;
    this.bounty = bounty;
    this.breach = breach;
    this.lateral = (Math.random() - 0.5) * 30;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setVelocity(0, 0);
    this.place();
  }

  /** Walk-speed multiplier from the Stronghold-only statuses. 0 while stunned. */
  modeSpeedMult(time: number): number {
    if (this.stunnedUntil > time) return 0;
    return this.slowUntil > time ? this.slowMult : 1;
  }

  /** Put the sprite on the road at `pathDist`. */
  place(): void {
    const p = pointAlong(this.pathDist, this.scratch);
    const h = headingAlong(this.pathDist);
    const x = p.x - h.y * this.lateral;
    const y = p.y + h.x * this.lateral;
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    // Face the way it walks.
    this.setFlipX(h.x < 0);
  }

  get reachedKeep(): boolean {
    return this.pathDist >= PATH_LENGTH - 2;
  }
}
