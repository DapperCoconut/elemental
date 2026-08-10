import Phaser from 'phaser';

/**
 * Supersampled rendering.
 *
 * Every scene lays out, aims and clamps in a fixed 960×640 space, but a
 * backbuffer that size goes blurry once Phaser.Scale.FIT stretches it across
 * a large window. The fix: create the canvas at LOGICAL × RENDER_SCALE and
 * scale every scene camera's matrix up to match, so game code keeps seeing
 * 960×640 while vectors (Graphics) and text rasterise at double density.
 * Textures baked in BootScene upscale exactly as before — no worse, no better.
 */
export const LOGICAL_WIDTH = 960;
export const LOGICAL_HEIGHT = 640;
export const RENDER_SCALE = 2;

type Cam = Phaser.Cameras.Scene2D.Camera & {
  cameraManager?: unknown;
  matrix: Phaser.GameObjects.Components.TransformMatrix;
};

/** Patches camera and text prototypes. Must run before `new Phaser.Game()`. */
export function installSuperSampling(): void {
  // Only scene cameras are patched (they have a cameraManager). The internal
  // BaseCamera instances Phaser uses for RenderTextures and generateTexture
  // keep stock behaviour.
  const camProto = Phaser.Cameras.Scene2D.Camera.prototype as unknown as {
    preRender(this: Cam): void;
    getWorldPoint(this: Cam, x: number, y: number, output?: Phaser.Math.Vector2): Phaser.Math.Vector2;
  };

  const origPreRender = camProto.preRender;
  camProto.preRender = function (this: Cam): void {
    if (!this.cameraManager) {
      origPreRender.call(this);
      return;
    }
    // CameraManager sizes new cameras from the (masked, logical) ScaleManager;
    // grow them to cover the real backbuffer before they first render.
    if (this.width === LOGICAL_WIDTH && this.height === LOGICAL_HEIGHT) {
      this.setSize(LOGICAL_WIDTH * RENDER_SCALE, LOGICAL_HEIGHT * RENDER_SCALE);
    }
    origPreRender.call(this);
    // Right-multiplying keeps zoom/scroll/shake/scrollFactor semantics in
    // logical space while mapping it onto the full backbuffer.
    this.matrix.scale(RENDER_SCALE, RENDER_SCALE);
  };

  const origGetWorldPoint = camProto.getWorldPoint;
  camProto.getWorldPoint = function (this: Cam, x, y, output) {
    if (!this.cameraManager) return origGetWorldPoint.call(this, x, y, output);
    // Stock getWorldPoint mixes the matrix with this.zoom, which no longer
    // agrees with the scaled matrix — invert the matrix itself instead.
    const out = output ?? new Phaser.Math.Vector2();
    this.matrix.applyInverse(x, y, out);
    out.x += this.scrollX;
    out.y += this.scrollY;
    return out;
  };

  // Rasterise text at backbuffer density. In TextStyle, resolution 0 means
  // "unset" (Text would then force it to 1); claim that default instead.
  const styleProto = Phaser.GameObjects.TextStyle.prototype as unknown as {
    setStyle(style: object | null, updateText?: boolean, setDefaults?: boolean): unknown;
    resolution: number;
  };
  const origSetStyle = styleProto.setStyle;
  styleProto.setStyle = function (
    this: { resolution: number },
    style: object | null,
    updateText?: boolean,
    setDefaults?: boolean,
  ): unknown {
    const result = origSetStyle.call(this, style, updateText, setDefaults);
    if (this.resolution === 0) this.resolution = RENDER_SCALE;
    return result;
  };
}

/**
 * Makes the ScaleManager report the logical size, hiding the supersampled
 * backbuffer from the many `scene.scale.width` layout sites and from the
 * per-scene arcade-physics world bounds. Run right after `new Phaser.Game()`.
 */
export function maskLogicalSize(scale: Phaser.Scale.ScaleManager): void {
  Object.defineProperty(scale, 'width', { get: () => LOGICAL_WIDTH, configurable: true });
  Object.defineProperty(scale, 'height', { get: () => LOGICAL_HEIGHT, configurable: true });
}
