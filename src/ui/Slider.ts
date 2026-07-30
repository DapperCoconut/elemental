import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, hex, mix, tintPlate } from './Theme';
import { ALL_CORNERS, drawGlow, fillDiamond, fillNotchedGradient, strokeNotched } from './Shapes';

/**
 * Horizontal value slider.
 *
 * Dragging is wired on the scene's input plane rather than on the knob, because
 * a knob-only drag loses the pointer the moment it moves faster than the knob
 * follows — which, on a 200px track, is most drags.
 */
export function addSlider(scene: Phaser.Scene, opts: {
  x: number; y: number; w: number;
  value: number;
  accent?: number;
  depth?: number;
  label?: string;
  /** Fired continuously while dragging. */
  onChange: (value: number) => void;
  /** Fired once when the drag ends — for anything too expensive to do per-frame. */
  onCommit?: (value: number) => void;
}): { setValue: (v: number) => void } {
  const accent = opts.accent ?? C.arcane;
  const depth = opts.depth ?? DEPTH.content;
  const h = 10;
  const knobR = 9;
  const left = opts.x - opts.w / 2;

  const g = scene.add.graphics().setDepth(depth);
  const knob = scene.add.circle(0, opts.y, knobR, mix(accent, 0xffffff, 0.4)).setDepth(depth + 2);
  const readout = scene.add.text(opts.x + opts.w / 2 + 16, opts.y, '', {
    fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.55)), letterSpacing: 1,
  }).setOrigin(0, 0.5).setDepth(depth + 1);

  if (opts.label) {
    scene.add.text(left, opts.y - 20, opts.label, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1.5,
    }).setOrigin(0, 0.5).setDepth(depth + 1);
  }

  let value = Math.max(0, Math.min(1, opts.value));

  const paint = (): void => {
    g.clear();
    const y = opts.y - h / 2;
    // Empty trough, then the filled portion painted over it.
    fillNotchedGradient(g, left, y, opts.w, h, mix(C.plate, 0x000000, 0.4), mix(C.plate, 0x000000, 0.7), 1, h / 2, ALL_CORNERS, 6);
    if (value > 0.001) {
      drawGlow(g, left, y, opts.w * value, h, accent, 0.35, 2, 2, h / 2);
      fillNotchedGradient(g, left, y, Math.max(h, opts.w * value), h, tintPlate(accent, 0.6), tintPlate(accent, 0.35), 1, h / 2, ALL_CORNERS, 6);
    }
    strokeNotched(g, left, y, opts.w, h, accent, 0.5, 1, h / 2, ALL_CORNERS);
    // Quarter ticks, so the scale reads as a control rather than a bar.
    for (let i = 1; i < 4; i++) fillDiamond(g, left + (opts.w * i) / 4, opts.y + 12, 2, accent, 0.3);

    knob.setX(left + opts.w * value);
    knob.setFillStyle(mix(accent, 0xffffff, 0.45));
    readout.setText(`${Math.round(value * 100)}`);
  };
  paint();

  const setFromPointer = (px: number): void => {
    value = Math.max(0, Math.min(1, (px - left) / opts.w));
    paint();
    opts.onChange(value);
  };

  let dragging = false;
  const hit = scene.add.rectangle(opts.x, opts.y, opts.w + knobR * 2, 30, 0xffffff, 0)
    .setDepth(depth + 3)
    .setInteractive({ useHandCursor: true });

  hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = true;
    setFromPointer(p.x);
    scene.tweens.add({ targets: knob, scale: 1.25, duration: 90, yoyo: true });
  });
  // Tracked on the scene so the drag survives the pointer leaving the hit box.
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (dragging) setFromPointer(p.x);
  });
  scene.input.on('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    opts.onCommit?.(value);
  });

  return {
    setValue: (v: number) => { value = Math.max(0, Math.min(1, v)); paint(); },
  };
}
