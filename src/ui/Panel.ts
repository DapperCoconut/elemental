import Phaser from 'phaser';
import { C, T, DEPTH, CUT, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate, accentText } from './Theme';
import {
  ALL_CORNERS, BOTTOM_CORNERS, Corners,
  drawCornerBrackets, drawGlow, drawSheen, fillDiamond, fillNotched, fillNotchedGradient, strokeNotched,
} from './Shapes';
import { drawIcon, IconName } from './Icons';
import { UiButton } from './Button';

export interface PanelOptions {
  /** Centre of the panel. */
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: number;
  /** Base plate colour. Defaults to a plate tinted toward the accent. */
  fill?: number;
  alpha?: number;
  cut?: number;
  corners?: Corners;
  depth?: number;
  /** Outer bloom strength, 0 disables. */
  glow?: number;
  brackets?: boolean;
  /** Draws a header band with this label across the top of the panel. */
  title?: string;
  subtitle?: string;
  /** Drawn glyph set to the left of the title. */
  titleIcon?: IconName;
}

export interface PanelHandle {
  g: Phaser.GameObjects.Graphics;
  /** Left edge, in scene coordinates. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** First y below the header band (or below the top edge if there is none). */
  contentTop: number;
  objects: Phaser.GameObjects.GameObject[];
}

/**
 * The workhorse surface: a cut-cornered plate with a double-struck frame,
 * corner brackets and an optional header band.
 *
 * Draws in absolute scene coordinates rather than a container so it can be
 * dropped underneath existing scene content without reparenting anything.
 */
export function addPanel(scene: Phaser.Scene, opts: PanelOptions): PanelHandle {
  const accent = opts.accent ?? C.arcane;
  const cut = opts.cut ?? CUT;
  const corners = opts.corners ?? ALL_CORNERS;
  const depth = opts.depth ?? DEPTH.panel;
  const alpha = opts.alpha ?? 1;
  const fill = opts.fill ?? tintPlate(accent, 0.1);

  const x = opts.x - opts.w / 2;
  const y = opts.y - opts.h / 2;
  const w = opts.w;
  const h = opts.h;

  const g = scene.add.graphics().setDepth(depth);
  const objects: Phaser.GameObjects.GameObject[] = [g];

  if (opts.glow !== 0) drawGlow(g, x, y, w, h, accent, opts.glow ?? 0.34, 5, 3, cut, corners);

  // Body: lit at the top, settling into shadow at the bottom.
  fillNotchedGradient(g, x, y, w, h, mix(fill, 0xffffff, 0.06), mix(fill, 0x000000, 0.45), alpha, cut, corners, 22);

  // Frame — dim outer edge, bright inner hairline.
  strokeNotched(g, x, y, w, h, mix(accent, 0x000000, 0.35), 0.9 * alpha, 2, cut, corners);
  strokeNotched(g, x + 4, y + 4, w - 8, h - 8, accent, 0.22 * alpha, 1, Math.max(2, cut - 4), corners);
  drawSheen(g, x, y, w, h, mix(accent, 0xffffff, 0.6), 0.28 * alpha, cut);

  if (opts.brackets !== false) drawCornerBrackets(g, x, y, w, h, accent, 0.85 * alpha, 2, 16, cut);

  let contentTop = y;

  if (opts.title) {
    const bandH = opts.subtitle ? 52 : 40;
    fillNotchedGradient(
      g, x + 2, y + 2, w - 4, bandH,
      mix(accent, 0x000000, 0.5), mix(fill, 0x000000, 0.15),
      0.9 * alpha, Math.max(2, cut - 2), [corners[0], corners[1], false, false], 10,
    );
    g.lineStyle(2, accent, 0.7 * alpha);
    g.beginPath(); g.moveTo(x + 10, y + bandH + 2); g.lineTo(x + w - 10, y + bandH + 2); g.strokePath();
    fillDiamond(g, x + w / 2, y + bandH + 2, 4, accent, 0.9 * alpha);

    const titleY = opts.subtitle ? y + 20 : y + bandH / 2 + 1;
    const titleText = scene.add.text(opts.x + (opts.titleIcon ? 14 : 0), titleY, opts.title, {
      fontSize: '19px',
      fontFamily: FONT_DISPLAY,
      color: accentText(accent),
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(depth + 1);
    objects.push(titleText);
    if (opts.titleIcon) {
      drawIcon(g, opts.titleIcon, titleText.x - titleText.width / 2 - 16, titleY, 10,
        mix(accent, 0xffffff, 0.5));
    }

    if (opts.subtitle) {
      objects.push(scene.add.text(opts.x, y + 39, opts.subtitle, {
        fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(depth + 1));
    }
    contentTop = y + bandH + 2;
  }

  return { g, left: x, right: x + w, top: y, bottom: y + h, contentTop, objects };
}

/**
 * A modal: full-screen scrim plus a centred panel that pops in.
 *
 * The scrim swallows pointer events, so anything under it is safe from stray
 * clicks while the modal is up.
 */
export function addModal(scene: Phaser.Scene, opts: Omit<PanelOptions, 'x' | 'y'> & {
  x?: number; y?: number; scrimAlpha?: number; onScrimClick?: () => void;
}): PanelHandle & { scrim: Phaser.GameObjects.Rectangle } {
  const { width, height } = scene.scale;
  const x = opts.x ?? width / 2;
  const y = opts.y ?? height / 2;
  const depth = opts.depth ?? DEPTH.modal;

  const scrim = scene.add.rectangle(width / 2, height / 2, width, height, 0x03030a, opts.scrimAlpha ?? 0.74)
    .setDepth(depth - 1)
    .setInteractive();
  if (opts.onScrimClick) scrim.on('pointerdown', opts.onScrimClick);

  const panel = addPanel(scene, { ...opts, x, y, depth });

  // Pop-in: the panel scales up from the centre while the scrim fades.
  scene.tweens.add({ targets: scrim, alpha: { from: 0, to: opts.scrimAlpha ?? 0.74 }, duration: 130 });

  return { ...panel, scrim };
}

/**
 * Recessed trough for list content — darker than the plate it sits on, with an
 * inner shadow at the top so it reads as cut into the surface.
 */
export function addWell(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  accent = C.arcane, depth = DEPTH.panel, cut = 6,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  const left = x - w / 2;
  const top = y - h / 2;
  fillNotched(g, left, top, w, h, C.well, 0.92, cut, ALL_CORNERS);
  // Inner shadow along the top lip.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, 0.09 * (1 - i / 6));
    g.fillRect(left + cut, top + i, w - cut * 2, 1);
  }
  strokeNotched(g, left, top, w, h, mix(accent, C.line, 0.55), 0.5, 1, cut, ALL_CORNERS);
  return g;
}

/**
 * Full-width chrome bar at the top of a screen: title, optional subtitle, and a
 * rule that separates it from the content below.
 */
export function addHeaderBar(scene: Phaser.Scene, opts: {
  title: string;
  subtitle?: string;
  accent?: number;
  height?: number;
  depth?: number;
  /** Centre the title (default) or push it right of the back button. */
  align?: 'center' | 'left';
  /** Drawn glyph struck into the band ahead of the title. */
  iconArt?: IconName;
}): {
  g: Phaser.GameObjects.Graphics;
  titleText: Phaser.GameObjects.Text;
  subtitleText: Phaser.GameObjects.Text | null;
  bottom: number;
} {
  const { width } = scene.scale;
  const accent = opts.accent ?? C.arcane;
  const h = opts.height ?? 76;
  const depth = opts.depth ?? DEPTH.panel;

  const g = scene.add.graphics().setDepth(depth);

  // Band: accent-washed at the top, fading into the scene.
  fillNotchedGradient(g, 0, 0, width, h, mix(C.void_, accent, 0.16), C.void_, 0.85, 0, ALL_CORNERS, 16);

  // Underline: a bright rule with a diamond, tapering to nothing at the edges.
  g.lineStyle(2, accent, 0.55);
  g.beginPath(); g.moveTo(30, h); g.lineTo(width - 30, h); g.strokePath();
  g.lineStyle(1, mix(accent, 0xffffff, 0.5), 0.22);
  g.beginPath(); g.moveTo(30, h + 3); g.lineTo(width - 30, h + 3); g.strokePath();
  fillDiamond(g, width / 2, h, 5, mix(accent, 0xffffff, 0.4), 0.95);
  fillDiamond(g, 30, h, 3, accent, 0.6);
  fillDiamond(g, width - 30, h, 3, accent, 0.6);

  // Etched tick marks along the band, like a machined rule.
  g.lineStyle(1, accent, 0.16);
  for (let x = 60; x < width - 60; x += 16) {
    const long = x % 80 === 60;
    g.beginPath(); g.moveTo(x, h - (long ? 12 : 6)); g.lineTo(x, h - 2); g.strokePath();
  }

  const tx = (opts.align === 'left' ? 156 : width / 2) + (opts.iconArt && opts.align !== 'left' ? 20 : 0);
  const originX = opts.align === 'left' ? 0 : 0.5;

  const titleText = scene.add.text(tx, opts.subtitle ? h / 2 - 9 : h / 2 - 2, opts.title, {
    fontSize: '30px',
    fontFamily: FONT_DISPLAY,
    color: hex(mix(accent, 0xffffff, 0.55)),
    stroke: hex(mix(accent, 0x000000, 0.75)),
    strokeThickness: 4,
    letterSpacing: 4,
  }).setOrigin(originX, 0.5).setDepth(depth + 1);

  titleText.setShadow(0, 3, hex(mix(accent, 0x000000, 0.8)), 8, false, true);

  if (opts.iconArt) {
    const ix = originX === 0 ? tx - 32 : tx - titleText.width / 2 - 26;
    drawIcon(g, opts.iconArt, ix, titleText.y, 15, mix(accent, 0xffffff, 0.5));
  }

  const subtitleText = opts.subtitle
    ? scene.add.text(tx, h / 2 + 17, opts.subtitle, {
        fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 2,
      }).setOrigin(originX, 0.5).setDepth(depth + 1)
    : null;

  return { g, titleText, subtitleText, bottom: h + 4 };
}

/**
 * Selectable card plate used for elements, save slots, gauntlets and the like.
 *
 * Returns a `paint` callback so callers can re-render the card on hover or
 * selection without rebuilding any game objects.
 */
export function addCardPlate(scene: Phaser.Scene, opts: {
  x: number; y: number; w: number; h: number;
  accent: number;
  depth?: number;
  cut?: number;
  corners?: Corners;
  /** Dim everything and drop the glow — for locked or unavailable cards. */
  muted?: boolean;
}): { g: Phaser.GameObjects.Graphics; paint: (state: 'idle' | 'hover' | 'active') => void } {
  const cut = opts.cut ?? 14;
  const corners = opts.corners ?? ALL_CORNERS;
  const depth = opts.depth ?? DEPTH.panel;
  const g = scene.add.graphics().setDepth(depth);
  const x = opts.x - opts.w / 2;
  const y = opts.y - opts.h / 2;
  const { w, h } = opts;

  const paint = (state: 'idle' | 'hover' | 'active'): void => {
    g.clear();
    const accent = opts.muted ? mix(opts.accent, C.steel, 0.7) : opts.accent;
    const lift = state === 'idle' ? 0 : state === 'hover' ? 0.1 : 0.18;
    const base = opts.muted ? mix(C.plate, 0x000000, 0.4) : tintPlate(accent, 0.12 + lift);

    if (!opts.muted && state !== 'idle') {
      drawGlow(g, x, y, w, h, accent, state === 'active' ? 0.6 : 0.4, 4, 3, cut, corners);
    }

    fillNotchedGradient(
      g, x, y, w, h,
      mix(base, 0xffffff, 0.07 + lift * 0.4), mix(base, 0x000000, 0.5),
      opts.muted ? 0.75 : 1, cut, corners, 20,
    );

    // A wedge of accent light bleeding up from the bottom edge.
    if (!opts.muted) {
      fillNotchedGradient(
        g, x + 2, y + h * 0.55, w - 4, h * 0.45 - 2,
        accent, accent, 0.055 + lift * 0.16, cut, [false, false, corners[2], corners[3]], 10,
      );
    }

    const edge = state === 'idle' ? accent : mix(accent, 0xffffff, state === 'active' ? 0.7 : 0.45);
    strokeNotched(g, x, y, w, h, edge, opts.muted ? 0.4 : state === 'idle' ? 0.75 : 1, state === 'idle' ? 2 : 3, cut, corners);
    strokeNotched(g, x + 5, y + 5, w - 10, h - 10, accent, opts.muted ? 0.08 : 0.16 + lift, 1, Math.max(2, cut - 5), corners);
    drawSheen(g, x, y, w, h, mix(accent, 0xffffff, 0.7), opts.muted ? 0.1 : 0.35, cut);

    if (state === 'active') drawCornerBrackets(g, x, y, w, h, mix(accent, 0xffffff, 0.5), 1, 2, 18, cut);
  };

  paint('idle');
  return { g, paint };
}

/**
 * A row strip for scrolling lists — flat, cheap, and consistent with the
 * plates above it. Bottom corners only, so rows stack cleanly.
 */
export function addRowPlate(scene: Phaser.Scene, opts: {
  x: number; y: number; w: number; h: number;
  accent: number; depth?: number; muted?: boolean;
}): { g: Phaser.GameObjects.Graphics; paint: (hover: boolean) => void } {
  const g = scene.add.graphics().setDepth(opts.depth ?? DEPTH.panel);
  const x = opts.x - opts.w / 2;
  const y = opts.y - opts.h / 2;
  const { w, h } = opts;

  const paint = (hover: boolean): void => {
    g.clear();
    const accent = opts.muted ? mix(opts.accent, C.steel, 0.65) : opts.accent;
    const base = opts.muted ? mix(C.well, 0x000000, 0.2) : tintPlate(accent, hover ? 0.2 : 0.09);
    fillNotchedGradient(g, x, y, w, h, mix(base, 0xffffff, 0.05), mix(base, 0x000000, 0.35),
      opts.muted ? 0.7 : 0.95, 8, BOTTOM_CORNERS, 10);
    // Accent spine on the left edge — the row's "tab".
    g.fillStyle(accent, opts.muted ? 0.3 : hover ? 1 : 0.65);
    g.fillRect(x, y + 2, 3, h - 4);
    strokeNotched(g, x, y, w, h, accent, opts.muted ? 0.22 : hover ? 0.8 : 0.35, 1, 8, BOTTOM_CORNERS);
  };

  paint(false);
  return { g, paint };
}

/**
 * Chrome for a full-screen overlay that sits on top of a live scene: an opaque
 * scrim, a header bar, and a back plate.
 *
 * Returns every object it created so the caller can tear the overlay down with
 * its own teardown list — overlays here are built and destroyed in place rather
 * than being separate Scenes.
 */
export function addOverlayChrome(scene: Phaser.Scene, opts: {
  title: string;
  subtitle?: string;
  /** Drawn glyph struck into the header band ahead of the title. */
  iconArt?: IconName;
  accent?: number;
  /** Base depth; the scrim sits here and everything else above it. */
  depth?: number;
  onBack: () => void;
}): { objects: Phaser.GameObjects.GameObject[]; bottom: number } {
  const { width, height } = scene.scale;
  const accent = opts.accent ?? C.arcane;
  const depth = opts.depth ?? DEPTH.overlay;
  const objects: Phaser.GameObjects.GameObject[] = [];

  const scrim = scene.add.rectangle(width / 2, height / 2, width, height, 0x04040c, 0.97)
    .setDepth(depth)
    .setInteractive();
  objects.push(scrim);

  const header = addHeaderBar(scene, {
    title: opts.title,
    subtitle: opts.subtitle,
    iconArt: opts.iconArt,
    accent,
    height: opts.subtitle ? 74 : 62,
    depth: depth + 2,
  });
  objects.push(header.g, header.titleText);
  if (header.subtitleText) objects.push(header.subtitleText);

  // Imported lazily-ish: Button pulls from Theme/Shapes only, so there is no
  // cycle back into Panel.
  const back = new UiButton(scene, {
    x: 66, y: 32, w: 100, h: 32,
    label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent,
    depth: depth + 4, cut: 8,
    onClick: opts.onBack,
  });
  objects.push(back.container);

  return { objects, bottom: header.bottom };
}
