import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate } from './Theme';
import { ALL_CORNERS, drawGlow, drawOrnateRule, fillDiamond, fillNotchedGradient, strokeNotched } from './Shapes';
import { drawIcon, IconName } from './Icons';
import { Sfx } from '../audio';

/**
 * Big centred scene title: layered stroke, accent drop-shadow, an ornate rule
 * beneath it, and a slow breathing glow behind the letterforms.
 */
export function addTitle(scene: Phaser.Scene, opts: {
  x: number; y: number; text: string;
  subtitle?: string;
  accent?: number;
  size?: number;
  depth?: number;
  /** Ornate rule under the title. On by default. */
  rule?: boolean;
  /** Adds the slow glow pulse. On by default. */
  animate?: boolean;
}): { text: Phaser.GameObjects.Text; container: Phaser.GameObjects.Container } {
  const accent = opts.accent ?? C.arcane;
  const size = opts.size ?? 56;
  const depth = opts.depth ?? DEPTH.content;

  const container = scene.add.container(opts.x, opts.y).setDepth(depth);

  // Halo behind the letters, so the title sits in its own pool of light.
  const halo = scene.add.graphics();
  const haloW = opts.text.length * size * 0.62;
  for (let i = 10; i >= 1; i--) {
    halo.fillStyle(accent, 0.02);
    halo.fillEllipse(0, 0, haloW * (0.5 + i * 0.1), size * (0.7 + i * 0.16));
  }
  container.add(halo);
  if (opts.animate !== false) {
    scene.tweens.add({ targets: halo, alpha: { from: 0.55, to: 1 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  const text = scene.add.text(0, 0, opts.text, {
    fontSize: `${size}px`,
    fontFamily: FONT_DISPLAY,
    color: hex(mix(accent, 0xffffff, 0.72)),
    stroke: hex(mix(accent, 0x000000, 0.72)),
    strokeThickness: Math.max(4, size * 0.1),
    letterSpacing: Math.round(size * 0.09),
  }).setOrigin(0.5);
  text.setShadow(0, Math.round(size * 0.07), hex(mix(accent, 0x000000, 0.85)), size * 0.2, false, true);
  container.add(text);

  if (opts.rule !== false) {
    const rule = scene.add.graphics();
    drawOrnateRule(rule, 0, size * 0.62, Math.max(90, haloW * 0.44), accent, 0.75);
    container.add(rule);
  }

  if (opts.subtitle) {
    container.add(scene.add.text(0, size * 0.62 + 20, opts.subtitle, {
      fontSize: '13px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 3, align: 'center',
    }).setOrigin(0.5));
  }

  return { text, container };
}

/** Small all-caps section heading with a leading accent tick. */
export function addSectionLabel(scene: Phaser.Scene, opts: {
  x: number; y: number; text: string; accent?: number; depth?: number;
  align?: 'center' | 'left'; width?: number;
  /** Drawn glyph set just ahead of the heading. */
  iconArt?: IconName;
}): Phaser.GameObjects.Text {
  const accent = opts.accent ?? C.arcane;
  const depth = opts.depth ?? DEPTH.content;
  const centred = (opts.align ?? 'center') === 'center';

  const labelX = opts.x + (centred ? (opts.iconArt ? 11 : 0) : (opts.iconArt ? 34 : 14));
  const label = scene.add.text(labelX, opts.y, opts.text, {
    fontSize: '14px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 3,
  }).setOrigin(centred ? 0.5 : 0, 0.5).setDepth(depth);

  const g = scene.add.graphics().setDepth(depth);
  // The glyph sits inside the heading block, so the rules are struck from the block's real
  // extent rather than from the text's — otherwise an icon punches through the left rule.
  const blockL = centred ? label.x - label.width / 2 - (opts.iconArt ? 22 : 0) : opts.x;
  const blockR = centred ? label.x + label.width / 2 : opts.x + 20 + label.width;

  if (centred) {
    const halfW = opts.width ? opts.width / 2 : label.width / 2 + 40;
    g.lineStyle(1, accent, 0.4);
    g.beginPath(); g.moveTo(opts.x - halfW, opts.y); g.lineTo(blockL - 12, opts.y); g.strokePath();
    g.beginPath(); g.moveTo(blockR + 12, opts.y); g.lineTo(opts.x + halfW, opts.y); g.strokePath();
    fillDiamond(g, opts.x - halfW, opts.y, 3, accent, 0.6);
    fillDiamond(g, opts.x + halfW, opts.y, 3, accent, 0.6);
    if (opts.iconArt) drawIcon(g, opts.iconArt, blockL + 9, opts.y, 8, mix(accent, 0xffffff, 0.4));
  } else {
    g.fillStyle(accent, 0.9);
    g.fillRect(opts.x, opts.y - 7, 3, 14);
    if (opts.iconArt) drawIcon(g, opts.iconArt, opts.x + 20, opts.y, 8, mix(accent, 0xffffff, 0.4));
    if (opts.width) {
      g.lineStyle(1, accent, 0.3);
      g.beginPath();
      g.moveTo(blockR, opts.y);
      g.lineTo(opts.x + opts.width, opts.y);
      g.strokePath();
    }
  }

  return label;
}

/**
 * Currency / stat pill: icon, value, accent edge. `originX` of 1 right-aligns
 * it against `x`, which is what the top-right HUD corners want.
 */
export function addChip(scene: Phaser.Scene, opts: {
  x: number; y: number; icon?: string; iconArt?: IconName; value: string;
  accent?: number; depth?: number; originX?: number; fontSize?: number;
  /** Extra caption under the value. */
  caption?: string;
}): { container: Phaser.GameObjects.Container; setValue: (v: string) => void } {
  const accent = opts.accent ?? C.gold;
  const depth = opts.depth ?? DEPTH.content + 5;
  const fs = opts.fontSize ?? 15;
  const h = opts.caption ? 40 : 28;

  const container = scene.add.container(opts.x, opts.y).setDepth(depth);
  const g = scene.add.graphics();
  container.add(g);

  const iconY = opts.caption ? -5 : 0;
  // A drawn glyph has no text metrics, so it rides on a zero-alpha spacer of the width the
  // layout needs and paints itself into the chip's own Graphics at layout time.
  const artSize = fs * 0.5;
  const icon = opts.iconArt
    ? scene.add.text(0, iconY, '', { fontSize: `${fs}px` })
        .setOrigin(0, 0.5).setAlpha(0).setFixedSize(artSize * 2 + 3, fs)
    : scene.add.text(0, iconY, opts.icon ?? '', { fontSize: `${fs}px` }).setOrigin(0, 0.5);
  const value = scene.add.text(0, iconY, opts.value, {
    fontSize: `${fs}px`, fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.55)), letterSpacing: 1,
  }).setOrigin(0, 0.5);
  container.add([icon, value]);

  let caption: Phaser.GameObjects.Text | null = null;
  if (opts.caption) {
    caption = scene.add.text(0, 11, opts.caption, {
      fontSize: '9px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 1,
    }).setOrigin(0, 0.5);
    container.add(caption);
  }

  const layout = (): void => {
    const padX = 11;
    const gapIcon = 6;
    const w = padX * 2 + icon.width + gapIcon + Math.max(value.width, caption?.width ?? 0);
    const left = -(opts.originX ?? 0) * w;

    icon.setX(left + padX);
    value.setX(left + padX + icon.width + gapIcon);
    caption?.setX(left + padX + icon.width + gapIcon);

    g.clear();
    fillNotchedGradient(
      g, left, -h / 2, w, h,
      mix(tintPlate(accent, 0.2), 0xffffff, 0.05), mix(tintPlate(accent, 0.14), 0x000000, 0.45),
      0.95, h / 2.6, ALL_CORNERS, 8,
    );
    strokeNotched(g, left, -h / 2, w, h, accent, 0.55, 1.5, h / 2.6, ALL_CORNERS);
    g.lineStyle(1, mix(accent, 0xffffff, 0.7), 0.25);
    g.beginPath(); g.moveTo(left + h / 2.6, -h / 2 + 1.5); g.lineTo(left + w - h / 2.6, -h / 2 + 1.5); g.strokePath();
    if (opts.iconArt) drawIcon(g, opts.iconArt, left + padX + icon.width / 2, iconY, artSize, accent);
  };
  layout();

  return {
    container,
    setValue: (v: string) => { value.setText(v); layout(); },
  };
}

/** Status pill — "CLEARED", "LOCKED", "NEW". Small, loud, and non-interactive. */
export function addBadge(scene: Phaser.Scene, opts: {
  x: number; y: number; text: string; accent?: number; depth?: number; glow?: boolean;
}): Phaser.GameObjects.Container {
  const accent = opts.accent ?? C.gold;
  const container = scene.add.container(opts.x, opts.y).setDepth(opts.depth ?? DEPTH.content + 2);
  const g = scene.add.graphics();
  container.add(g);

  const label = scene.add.text(0, 0, opts.text, {
    fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.7)), letterSpacing: 1.5,
  }).setOrigin(0.5);
  container.add(label);

  const w = label.width + 18;
  const h = 19;
  if (opts.glow) drawGlow(g, -w / 2, -h / 2, w, h, accent, 0.5, 3, 2, 6);
  fillNotchedGradient(g, -w / 2, -h / 2, w, h, tintPlate(accent, 0.4), mix(tintPlate(accent, 0.25), 0x000000, 0.4), 1, 6, ALL_CORNERS, 6);
  strokeNotched(g, -w / 2, -h / 2, w, h, accent, 0.85, 1, 6, ALL_CORNERS);
  container.bringToTop(label);
  // Containers have no intrinsic size; stamp it so callers can pack badges in a
  // row without reaching into the child list.
  container.setSize(w, h);

  return container;
}

/** Body copy in the house body face. Thin wrapper, but it keeps sizes honest. */
export function addBody(scene: Phaser.Scene, opts: {
  x: number; y: number; text: string;
  size?: number; color?: string; wrap?: number; align?: 'left' | 'center' | 'right';
  depth?: number; originX?: number; originY?: number; lineSpacing?: number;
}): Phaser.GameObjects.Text {
  return scene.add.text(opts.x, opts.y, opts.text, {
    fontSize: `${opts.size ?? 13}px`,
    fontFamily: FONT_UI,
    color: opts.color ?? T.normal,
    align: opts.align ?? 'left',
    lineSpacing: opts.lineSpacing ?? 4,
    ...(opts.wrap ? { wordWrap: { width: opts.wrap } } : {}),
  })
    .setOrigin(opts.originX ?? 0, opts.originY ?? 0)
    .setDepth(opts.depth ?? DEPTH.content);
}

/** Transient message that rises and fades near the bottom of the screen. */
export function showToast(scene: Phaser.Scene, message: string, opts: {
  accent?: number; holdMs?: number; y?: number;
} = {}): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const accent = opts.accent ?? C.gold;
  const y = opts.y ?? height - 78;

  const container = scene.add.container(width / 2, y).setDepth(DEPTH.toast);
  const g = scene.add.graphics();
  container.add(g);

  const label = scene.add.text(0, 0, message, {
    fontSize: '15px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.65)),
    align: 'center', lineSpacing: 5, letterSpacing: 1,
  }).setOrigin(0.5);
  container.add(label);

  const w = label.width + 44;
  const h = label.height + 22;
  drawGlow(g, -w / 2, -h / 2, w, h, accent, 0.5, 4, 3, 10);
  fillNotchedGradient(g, -w / 2, -h / 2, w, h, tintPlate(accent, 0.3), mix(C.void_, accent, 0.1), 0.97, 10, ALL_CORNERS, 12);
  strokeNotched(g, -w / 2, -h / 2, w, h, accent, 0.9, 2, 10, ALL_CORNERS);
  container.bringToTop(label);

  container.setScale(0.9).setAlpha(0);
  Sfx.play('ui-toast');
  scene.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: container, alpha: 0, y: y - 34,
    delay: opts.holdMs ?? 2400, duration: 800,
    onComplete: () => container.destroy(),
  });

  return container;
}
