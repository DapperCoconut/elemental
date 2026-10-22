import Phaser from 'phaser';
import { Husk } from '../invasion/Husk';
import { HuskVariantDef } from '../invasion/HuskVariants';
import { track, RoadTrack } from './StrongholdMap';
import { HuskTrait, traitFor } from './HuskRoadTraits';

/**
 * A husk on the road. The invasion `Husk` keeps its body, its dead-player look, DOT ticking and
 * the common status fields; this adds the road position, the handful of statuses the tower
 * movesets apply that the 1v1 game has no field for, and the husk's road trait (what its brand
 * makes it do in this mode — see HuskRoadTraits).
 */
export class RoadHusk extends Husk {
  /** Which road it walks. */
  public readonly trackIndex: number;
  /** Distance travelled along the road, in px. The targeting order and the breach check. */
  public pathDist = 0;
  /** Sideways offset from the centre line so a column does not stack into one sprite. */
  public readonly lateral: number;
  public roadSpeed: number;
  public bounty: number;
  public readonly breach: number;
  public readonly trait: HuskTrait | null;

  // ── Stronghold statuses ─────────────────────────────────────────
  public slowMult = 1;
  public slowUntil = 0;
  public weakenMult = 1;
  public weakenUntil = 0;
  public bleedUntil = 0;
  public bleedAccum = 0;
  public stunnedUntil = 0;
  /** Asleep: stopped dead until the timer runs out or three hits wake it. */
  public sleepUntil = 0;
  public sleepHits = 0;
  /** Turned around: walks back toward the breach. */
  public confusedUntil = 0;
  /** Soaked: electric hits land ×1.5 and frost lands double. */
  public soakedUntil = 0;
  /** Corroded: its armour and shell count for nothing. */
  public corrodedUntil = 0;
  /** Radiation stacks — each burns 0.4% of max HP a second. */
  public radStacks = 0;
  public radAccum = 0;
  /** Ruin stacks — the fifth collapses into a burst. */
  public ruinStacks = 0;
  /** Infected: the toxic jumps to neighbours when it dies. */
  public infectedUntil = 0;
  /** Gilded: pays this multiple of its bounty if it dies before the mark fades. */
  public goldMarkMult = 1;
  public goldMarkUntil = 0;
  /** Seen: hidden husks can be targeted while this runs. */
  public revealedUntil = 0;
  /** Stitched: shares a slice of every hit with the rest of its stitch. */
  public linkId = 0;
  public linkUntil = 0;
  /** Encased in wax: stopped, and blasts land ×1.6. */
  public encasedUntil = 0;
  /** A tower status already printed recently — throttles pop-ups. */
  public lastStatusText = new Map<string, number>();
  /** True while a barrier is holding this husk. */
  public blocked = false;

  // ── Trait state (HuskRoadTraits owns these) ─────────────────────
  /** Untargetable right now (burrowed, submerged, phased). */
  public untargetable = false;
  /** Hidden: towers without detection cannot pick it as a target. */
  public hidden = false;
  /** Floats over traps, barriers, minions and ground zones. */
  public airborne = false;
  /** Sharp hits it shrugs off before the shell cracks (Crystal). */
  public shellHits = 0;
  /** A child of a split/echo/rise — never splits again. */
  public isChild = false;
  /** Extra speed multiplier a trait puts on it (Time haste, sprints, banners). */
  public traitSpeedMult = 1;
  public traitSpeedUntil = 0;
  /** Damage reduction a banner/ward gives it. */
  public wardMult = 1;
  public wardUntil = 0;
  /** CC immunity (Devotion's enthralled). */
  public ccImmuneUntil = 0;
  public traitNextAt = 0;
  public traitPhase = 0;
  public traitStacks = 0;

  private readonly scratch = { x: 0, y: 0 };
  private readonly road: RoadTrack;

  constructor(
    scene: Phaser.Scene, variant: HuskVariantDef,
    hp: number, speed: number, bounty: number, breach: number,
    trackIndex = 0, startDist = 0,
  ) {
    const road = track(trackIndex);
    const start = road.pointAlong(startDist);
    super(scene, start.x, start.y, hp, speed, 6, 950, variant);
    this.road = road;
    this.trackIndex = trackIndex;
    this.pathDist = startDist;
    this.roadSpeed = speed;
    this.bounty = bounty;
    this.breach = breach;
    this.lateral = (Math.random() - 0.5) * 30;
    this.trait = traitFor(variant);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setVelocity(0, 0);
    // Rise as the dead element player it was — the same look the invasion uses.
    this.dress();
    this.place();
  }

  get track(): RoadTrack { return this.road; }

  /** Walk-speed multiplier from the Stronghold-only statuses. 0 while stopped. */
  modeSpeedMult(time: number): number {
    if (this.stunnedUntil > time || this.sleepUntil > time || this.encasedUntil > time) return 0;
    let m = this.slowUntil > time ? this.slowMult : 1;
    if (this.traitSpeedUntil > time) m *= this.traitSpeedMult;
    return m;
  }

  /** True when a tower may pick this husk as its target. */
  targetable(time: number, detect: boolean): boolean {
    if (!this.active || this.hp <= 0 || this.untargetable) return false;
    if (this.hidden && !detect && this.revealedUntil <= time) return false;
    return true;
  }

  /** Put the sprite on the road at `pathDist`. */
  place(): void {
    const p = this.road.pointAlong(this.pathDist, this.scratch);
    const h = this.road.headingAlong(this.pathDist);
    const lift = this.airborne ? -10 : 0;
    const x = p.x - h.y * this.lateral;
    const y = p.y + h.x * this.lateral + lift;
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    // The dressed rig faces where it is marching.
    const back = this.confusedUntil > this.scene.time.now ? -1 : 1;
    this.marchTo = { x: x + h.x * 40 * back, y: y + h.y * 40 * back };
    this.setFlipX(h.x * back < 0);
  }

  get reachedKeep(): boolean {
    return this.pathDist >= this.road.length - 2;
  }
}
