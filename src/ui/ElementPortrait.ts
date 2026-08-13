import Phaser from 'phaser';
import { ArmGesture, BaseAvatar } from '../elements/kits/ElementVisuals';
import { elementBodyTexture, makeElementAvatar } from '../elements/kits/ElementAvatars';
import { makeSkinAvatar } from '../elements/kits/skins/SkinAvatars';
import { equippedSkin, skinnedColorFn } from './AbilityPreview';

/**
 * A live character portrait: the element's real fighter body with its real rig standing on
 * it, breathing, blinking and looking around, inside a masked box.
 *
 * The element cards used to print an emoji, which said nothing — 🔥 and 🌋 are the same
 * picture to anyone who has not already played fire. This shows the actual character that
 * walks into the arena, including the mastered silhouette and whatever skin is equipped, so
 * the card is a photograph of your fighter rather than a label for it.
 *
 * Everything here is borrowed rather than redrawn, for the same reason `AbilityPreview`
 * refuses to redraw abilities: a hand-painted portrait would drift from the character the
 * moment anyone touched its rig. What this file owns is only the containment (a scaled,
 * masked container) and the idle performance (sway, glances, the odd flourish).
 */
export class ElementPortrait {
  private container: Phaser.GameObjects.Container;
  private maskGfx: Phaser.GameObjects.Graphics;
  private avatar: BaseAvatar | null = null;
  private updateHandler: (t: number, dt: number) => void;
  private needsSort = false;
  private destroyed = false;
  private elapsed = 0;
  /** Countdown to the next unprompted flourish, ms. */
  private nextIdleAt = 2600 + Math.random() * 2600;
  private idleIndex = 0;
  /** Where the character stands, in the container's own (pre-scale) coordinates. */
  private readonly footX: number;
  private readonly footY: number;

  constructor(
    private scene: Phaser.Scene,
    private opts: {
      /** Centre of the portrait box, in screen coordinates. */
      x: number; y: number;
      w: number; h: number;
      elementId: string;
      /** Mastered rigs have their own silhouette; the arena drives it off the same flag. */
      mastered: boolean;
      depth: number;
      /** Rig zoom. 1 is arena scale, which is far too big for a card. */
      scale?: number;
      /** Dim the whole portrait — locked and unavailable cards. */
      muted?: boolean;
    },
  ) {
    const { x, y, w, h, depth } = opts;
    const scale = opts.scale ?? 0.78;

    this.container = scene.add.container(x - w / 2, y - h / 2).setDepth(depth).setScale(scale);
    if (opts.muted) this.container.setAlpha(0.35);

    this.maskGfx = scene.add.graphics();
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(x - w / 2, y - h / 2, w, h);
    this.maskGfx.setVisible(false);
    this.container.setMask(this.maskGfx.createGeometryMask());

    // Stand the character low in the frame: the rig's crown extras (plumes, crowns, halos)
    // climb ~40px and would otherwise be the first thing the mask cuts off.
    this.footX = (w / scale) / 2;
    this.footY = (h / scale) * 0.62;

    this.build();

    this.updateHandler = (_t, dt) => this.step(dt);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    // A scene change tears the display list down without going through the grid's own
    // teardown, and a portrait left driving a destroyed rig throws on the next frame.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** A one-shot flourish — the grid fires one when the pointer enters the card. */
  poke(gesture: ArmGesture = 'raise'): void {
    this.avatar?.play(gesture, -Math.PI / 2);
    this.nextIdleAt = this.elapsed + 3000;
  }

  private build(): void {
    const { elementId } = this.opts;
    const skin = equippedSkin(elementId);
    const tint = skinnedColorFn(elementId);

    // The body sprite first, so the rig's hands and eyes land on top of a torso rather than
    // hanging in the air. Two elements paint their own body instead and have no texture.
    const bodyTex = elementBodyTexture(this.scene, elementId);
    if (bodyTex) {
      this.capture(() => {
        const body = this.scene.add.image(this.footX, this.footY, bodyTex).setDepth(5);
        const bt = skin?.bodyTint;
        if (bt) body.setTintFill(bt[0], bt[0], bt[1], bt[1]);
        return body;
      });
    }

    // A skin that replaces the character wins over the element's own rig, exactly as it
    // does in the arena — the card has to show the fighter the player actually fields.
    const avatar = this.capture(() =>
      makeSkinAvatar(skin?.id ?? null, this.scene) ?? makeElementAvatar(elementId, this.scene, tint));
    if (avatar) {
      this.capture(() => avatar.captureInto((o) => this.adopt(o)));
      this.avatar = avatar;
    }
  }

  private step(deltaMs: number): void {
    if (this.destroyed || !this.avatar) return;
    this.elapsed += deltaMs;

    // Avatars build a private Fx in their constructor that this class never sees, and its
    // gestures emit through it during `update` — so the drive has to happen inside a capture
    // window or the sparks land loose on the menu. Same reasoning as `AbilityPreviewBox`.
    this.capture(() => {
      const a = this.avatar!;
      // A slow glance across the frame. Facing barely moves the hands (they orbit on their
      // own), so this reads almost entirely in the eyes, which is the point.
      a.setFacing(Math.sin(this.elapsed / 1600) * 1.25 - Math.PI / 12);
      a.setMastered(this.opts.mastered);
      if (this.elapsed >= this.nextIdleAt) {
        // Alternate so a row of five cards never falls into lockstep.
        const IDLES: ArmGesture[] = ['flex', 'raise', 'sweep', 'clap'];
        a.play(IDLES[this.idleIndex++ % IDLES.length], -Math.PI / 2);
        this.nextIdleAt = this.elapsed + 4200 + Math.random() * 3600;
      }
      a.update(deltaMs, this.footX, this.footY, 1);
    });

    // Child depths were set before reparenting, so the container was never flagged dirty.
    if (this.needsSort) { this.container.sort('depth'); this.needsSort = false; }
  }

  /** Pull one object into the masked box; destroy stragglers that arrive after teardown. */
  private adopt<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    if (this.destroyed || !this.container.active) {
      (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
      return obj;
    }
    this.container.add(obj);
    this.needsSort = true;
    return obj;
  }

  /** Run `fn` and adopt everything new on the scene's display list afterwards. */
  private capture<T>(fn: () => T): T {
    const list = this.scene.children.list;
    const before = new Set(list);
    let out: T;
    try {
      out = fn();
    } finally {
      // Snapshot first: adopting mutates the very array being walked.
      for (const o of [...list]) if (!before.has(o)) this.adopt(o);
    }
    return out;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler);
    this.avatar?.destroy();
    this.avatar = null;
    this.container.destroy();
    this.maskGfx.destroy();
  }
}
