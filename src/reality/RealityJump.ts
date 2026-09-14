import Phaser from 'phaser';

/**
 * The dungeon's parkour jump — a 1-D height sim in the SandKit mould, but
 * element-agnostic: any element the player brings down here can jump in the
 * rooms that allow it. The fighter's (x, y) never changes because of height;
 * `z` lives here alone, and the one visual rule holds: a shadow's distance
 * below a thing is its height.
 */
export class RealityJump {
  /** Height above the floor in sim units, and its velocity. */
  z = 0;
  vz = 0;

  private enabled = false;
  private prevSpaceDown = false;

  /** SandKit's tuning — the arc every course in the game is built against. */
  static readonly JUMP_V = 384;
  static readonly GRAVITY = 900;
  /** Shadow px per height unit. */
  static readonly LIFT = 0.62;

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) { this.z = 0; this.vz = 0; }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Airborne enough to clear floor hazards. */
  isAirborne(): boolean {
    return this.z > 6;
  }

  /**
   * One frame. Space is read as a rising edge on `isDown` — never `JustDown`,
   * which would eat ArenaScene's dodge flag for the whole element
   * (the SandKit/DreamKit trap). Returns true on the frame the jump lands.
   */
  update(dtSec: number, spaceDown: boolean): boolean {
    if (!this.enabled) { this.prevSpaceDown = spaceDown; return false; }
    const pressed = spaceDown && !this.prevSpaceDown;
    this.prevSpaceDown = spaceDown;

    if (pressed && this.z <= 0.5) {
      this.vz = RealityJump.JUMP_V;
    }

    let landed = false;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= RealityJump.GRAVITY * dtSec;
      this.z += this.vz * dtSec;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        landed = true;
      }
    }
    return landed;
  }

  /** The airborne tell: a detached shadow sinking as the jumper rises. */
  drawShadow(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    if (!this.enabled || this.z <= 0.5) return;
    const drop = this.z * RealityJump.LIFT;
    const squash = Math.max(0.45, 1 - this.z / 260);
    g.fillStyle(0x000000, 0.4 * squash);
    g.fillEllipse(x, y + 14 + drop, 26 * squash, 10 * squash);
  }
}
