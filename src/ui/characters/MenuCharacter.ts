import Phaser from 'phaser';
import { DEPTH } from '../Theme';

/** How a menu character is feeling. Each subclass decides what a mood looks like. */
export type Mood = 'idle' | 'pleased' | 'grumpy' | 'surprised' | 'greedy' | 'thinking' | 'shocked';

/**
 * The scaffolding every menu character shares — the goblin behind the shop counter, the
 * alchemist at the lab bench, the keeper of the vault. One Graphics repainted every frame
 * off the scene's update event, a mood that decays back to idle, a talking flag the speech
 * bubble flips, a blink timer, and eyes that follow the pointer.
 *
 * Subclasses paint themselves in `paint()` around their own origin and say where their mouth
 * is so a `SpeechBubble` can hang off it. Scene shutdown tears the character down on its own,
 * the same way `ElementPortrait` does.
 */
export abstract class MenuCharacter {
  protected scene: Phaser.Scene;
  protected g: Phaser.GameObjects.Graphics;
  /** Origin — where the character's feet (or the counter it leans on) are. */
  protected x: number;
  protected y: number;
  protected scale: number;
  /** -1 when mirrored so the character faces left. */
  protected dir: 1 | -1;
  protected t = 0;
  protected mood: Mood = 'idle';
  private moodUntil = 0;
  protected talking = false;
  /** Pointer target in scene coordinates; eyes turn toward it. */
  protected lookX: number;
  protected lookY: number;
  /** 0 open … 1 shut, so a blink can be drawn as a scale on the eye. */
  protected blink = 0;
  private blinkAt = 1800;
  private blinkT = -1;
  /** A knock-back a reaction can drive; decays on its own. */
  protected jolt = 0;
  private updateHandler: (t: number, dt: number) => void;
  private destroyed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: { scale?: number; depth?: number; flip?: boolean } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.scale = opts.scale ?? 1;
    this.dir = opts.flip ? -1 : 1;
    this.lookX = x + 200;
    this.lookY = y - 60;
    this.g = scene.add.graphics().setDepth(opts.depth ?? DEPTH.content);
    this.updateHandler = (_t, dt) => this.step(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.input.on('pointermove', this.onPointer, this);
  }

  /** Where a speech bubble's tail should land, in scene coordinates. */
  abstract mouth(): { x: number; y: number };

  /** Paint the whole character around `(0, 0)` = the origin, already scaled. */
  protected abstract paint(g: Phaser.GameObjects.Graphics, t: number): void;

  setTalking(on: boolean): void { this.talking = on; }

  /** Set a mood; it falls back to idle after `ms` (default 2.4s). */
  setMood(mood: Mood, ms = 2400): void {
    this.mood = mood;
    this.moodUntil = this.t * 1000 + ms;
  }

  /** A sudden recoil, for explosions and bad news. */
  knock(strength = 1): void { this.jolt = strength; }

  lookAt(x: number, y: number): void { this.lookX = x; this.lookY = y; }

  /** Normalised look direction from `(ox, oy)` (scene coords), clamped to the unit disc. */
  protected lookDir(ox: number, oy: number): { x: number; y: number } {
    const dx = this.lookX - ox;
    const dy = this.lookY - oy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 220);
    // Mirrored characters paint in a flipped frame, so the look vector flips with them.
    return { x: (dx / d) * k * this.dir, y: (dy / d) * k };
  }

  private onPointer(p: Phaser.Input.Pointer): void {
    this.lookX = p.worldX;
    this.lookY = p.worldY;
  }

  private step(dt: number): void {
    if (this.destroyed || !this.g.active) return;
    this.t += dt / 1000;
    if (this.mood !== 'idle' && this.t * 1000 >= this.moodUntil) this.mood = 'idle';
    // Blink: a fast shut-and-open every few seconds.
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) { this.blinkT = 0; this.blinkAt = 2400 + Math.random() * 3200; }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const u = this.blinkT / 160;
      this.blink = u < 1 ? Math.sin(u * Math.PI) : 0;
      if (u >= 1) this.blinkT = -1;
    }
    this.jolt = Math.max(0, this.jolt - dt / 600);
    this.g.clear();
    this.g.setPosition(this.x + (this.jolt > 0 ? Math.sin(this.t * 60) * this.jolt * 4 : 0), this.y);
    this.g.setScale(this.scale * this.dir, this.scale);
    this.paint(this.g, this.t);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    this.scene.input.off('pointermove', this.onPointer, this);
    this.g.destroy();
  }
}

export const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Fill a closed polygon from flat pairs. */
export function fillPts(g: Phaser.GameObjects.Graphics, pts: [number, number][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => P(x, y)), true, true);
}

/** Stroke a closed polygon from flat pairs. */
export function strokePts(g: Phaser.GameObjects.Graphics, pts: [number, number][], color: number, alpha = 1, w = 1, close = true): void {
  g.lineStyle(w, color, alpha);
  g.strokePoints(pts.map(([x, y]) => P(x, y)), close);
}
