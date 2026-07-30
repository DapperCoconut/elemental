import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix, tintPlate, accentText } from './Theme';
import {
  ALL_CORNERS, Corners,
  drawCornerBrackets, drawGlow, drawSheen, fillDiamond, fillHex, fillNotchedGradient, strokeHex, strokeNotched,
} from './Shapes';
import { Sfx } from '../audio';

export type ButtonVariant =
  /** Filled accent plate — the one thing you want clicked on this screen. */
  | 'solid'
  /** Dark plate with an accent edge — the default for lists of choices. */
  | 'ghost'
  /** Barely-there chrome — back, cancel, pagination. */
  | 'quiet'
  /** Destructive. */
  | 'danger';

type State = 'idle' | 'hover' | 'down';

export interface ButtonOptions {
  /** Centre of the button. */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** Small line under the label. */
  sublabel?: string;
  /** Emoji or glyph shown ahead of the label. */
  icon?: string;
  /** Right-aligned text, typically a price. */
  trailing?: string;
  trailingColor?: string;
  accent?: number;
  variant?: ButtonVariant;
  fontSize?: number;
  cut?: number;
  corners?: Corners;
  depth?: number;
  disabled?: boolean;
  /** Left-align the label block instead of centring it. */
  align?: 'center' | 'left';
  onClick?: () => void;
  onHover?: () => void;
  onOut?: () => void;
}

/**
 * The game's standard pressable plate.
 *
 * Built as a Container so hover can lift the whole thing with a scale tween;
 * an alpha-0 Rectangle inside it does the hit-testing, which avoids relying on
 * Container's own (size-dependent) input path.
 */
export class UiButton {
  readonly container: Phaser.GameObjects.Container;

  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private subText: Phaser.GameObjects.Text | null = null;
  private iconText: Phaser.GameObjects.Text | null = null;
  private trailingText: Phaser.GameObjects.Text | null = null;
  private hit: Phaser.GameObjects.Rectangle;
  private opts: Required<Pick<ButtonOptions, 'w' | 'h' | 'accent' | 'variant' | 'cut'>> & ButtonOptions;
  private disabled: boolean;
  private state: State = 'idle';

  constructor(scene: Phaser.Scene, options: ButtonOptions) {
    this.scene = scene;
    this.disabled = options.disabled ?? false;
    this.opts = {
      ...options,
      w: options.w,
      h: options.h,
      accent: options.accent ?? (options.variant === 'danger' ? C.blood : C.arcane),
      variant: options.variant ?? 'ghost',
      cut: options.cut ?? Math.min(12, options.h / 3),
    };

    const { w, h } = this.opts;
    const depth = options.depth ?? DEPTH.content;

    this.container = scene.add.container(options.x, options.y).setDepth(depth);
    this.g = scene.add.graphics();
    this.container.add(this.g);

    const leftPad = 16;
    const hasIcon = !!options.icon;
    const centred = (options.align ?? 'center') === 'center';

    if (hasIcon) {
      const ix = centred ? -this.estimateLabelWidth() / 2 - 14 : -w / 2 + leftPad + 8;
      this.iconText = scene.add.text(ix, options.sublabel ? -8 : 0, options.icon!, {
        fontSize: `${Math.round((options.fontSize ?? 18) * 1.15)}px`,
      }).setOrigin(0.5);
      this.container.add(this.iconText);
    }

    const labelX = centred ? (hasIcon ? 10 : 0) : -w / 2 + leftPad + (hasIcon ? 30 : 0);
    const labelOriginX = centred ? 0.5 : 0;

    this.labelText = scene.add.text(labelX, options.sublabel ? -9 : 0, options.label, {
      fontSize: `${options.fontSize ?? 18}px`,
      fontFamily: FONT_DISPLAY,
      color: T.bright,
      letterSpacing: 1.5,
    }).setOrigin(labelOriginX, 0.5);
    this.container.add(this.labelText);

    if (options.sublabel) {
      this.subText = scene.add.text(labelX, 11, options.sublabel, {
        fontSize: '10px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 0.5,
        wordWrap: { width: w - 40 },
      }).setOrigin(labelOriginX, 0.5);
      this.container.add(this.subText);
    }

    if (options.trailing) {
      this.trailingText = scene.add.text(w / 2 - leftPad, 0, options.trailing, {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: options.trailingColor ?? T.gold,
      }).setOrigin(1, 0.5);
      this.container.add(this.trailingText);
    }

    this.hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0);
    this.container.add(this.hit);

    if (!this.disabled) this.wire();
    this.paint();
  }

  /** Rough advance width, used only to place a centred icon. */
  private estimateLabelWidth(): number {
    return this.opts.label.length * (this.opts.fontSize ?? 18) * 0.62;
  }

  private wire(): void {
    this.hit.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.state = 'hover';
        this.paint();
        Sfx.hover();
        this.scene.tweens.add({ targets: this.container, scaleX: 1.035, scaleY: 1.035, duration: 110, ease: 'Cubic.easeOut' });
        this.opts.onHover?.();
      })
      .on('pointerout', () => {
        this.state = 'idle';
        this.paint();
        this.scene.tweens.add({ targets: this.container, scaleX: 1, scaleY: 1, duration: 130, ease: 'Cubic.easeOut' });
        this.opts.onOut?.();
      })
      .on('pointerdown', () => {
        this.state = 'down';
        this.paint();
        // The variant already encodes what the button means, so it can pick the
        // click: `quiet` is the back/cancel chrome, `danger` is destructive.
        if (this.opts.variant === 'quiet') Sfx.back();
        else if (this.opts.variant === 'danger') Sfx.play('ui-click', { rate: 0.72 });
        else Sfx.click();
        this.scene.tweens.add({
          targets: this.container, scaleX: 0.965, scaleY: 0.965, duration: 70, yoyo: true, ease: 'Quad.easeOut',
        });
        this.opts.onClick?.();
      })
      .on('pointerup', () => {
        if (this.state === 'down') { this.state = 'hover'; this.paint(); }
      });
  }

  /** Repaints the plate for the current state. Cheap — one Graphics clear. */
  private paint(): void {
    const { w, h, cut } = this.opts;
    const corners = this.opts.corners ?? ALL_CORNERS;
    const x = -w / 2;
    const y = -h / 2;
    const g = this.g;
    g.clear();

    const accent = this.disabled ? mix(this.opts.accent, C.steel, 0.75) : this.opts.accent;
    const variant = this.opts.variant;
    const hot = this.state !== 'idle' && !this.disabled;

    // Base plate colour per variant.
    let base: number;
    let edgeAlpha: number;
    let labelColor: string;
    if (variant === 'solid') {
      base = tintPlate(accent, hot ? 0.62 : 0.42);
      edgeAlpha = 1;
      labelColor = hot ? '#ffffff' : hex(mix(accent, 0xffffff, 0.82));
    } else if (variant === 'quiet') {
      base = mix(C.plate, 0x000000, hot ? 0.15 : 0.4);
      edgeAlpha = hot ? 0.8 : 0.4;
      labelColor = hot ? T.bright : T.dim;
    } else if (variant === 'danger') {
      base = tintPlate(accent, hot ? 0.5 : 0.24);
      edgeAlpha = hot ? 1 : 0.7;
      labelColor = hot ? '#ffffff' : hex(mix(accent, 0xffffff, 0.6));
    } else {
      base = tintPlate(accent, hot ? 0.34 : 0.14);
      edgeAlpha = hot ? 1 : 0.6;
      labelColor = hot ? '#ffffff' : accentText(accent);
    }

    if (this.disabled) {
      base = mix(C.plate, 0x000000, 0.5);
      edgeAlpha = 0.28;
      labelColor = T.ghost;
    }

    if (hot) drawGlow(g, x, y, w, h, accent, this.state === 'down' ? 0.7 : 0.5, 4, 3, cut, corners);

    fillNotchedGradient(
      g, x, y, w, h,
      mix(base, 0xffffff, this.state === 'down' ? 0.02 : 0.1), mix(base, 0x000000, 0.42),
      this.disabled ? 0.6 : 1, cut, corners, 14,
    );

    // Accent light pooling at the bottom of the plate.
    if (!this.disabled) {
      fillNotchedGradient(
        g, x + 2, y + h * 0.5, w - 4, h * 0.5 - 2,
        base, accent, hot ? 0.2 : 0.08, cut, [false, false, corners[2], corners[3]], 8,
      );
    }

    strokeNotched(g, x, y, w, h, hot ? mix(accent, 0xffffff, 0.5) : accent, edgeAlpha, hot ? 2 : 1.5, cut, corners);
    strokeNotched(g, x + 4, y + 4, w - 8, h - 8, accent, this.disabled ? 0.06 : hot ? 0.3 : 0.14, 1, Math.max(2, cut - 4), corners);
    drawSheen(g, x, y, w, h, mix(accent, 0xffffff, 0.75), this.disabled ? 0.08 : hot ? 0.5 : 0.28, cut);

    if (hot) {
      drawCornerBrackets(g, x, y, w, h, mix(accent, 0xffffff, 0.6), 0.9, 2, 12, cut);
      // Chevron pips that appear on either side when the plate is live.
      fillDiamond(g, x + 9, 0, 3, mix(accent, 0xffffff, 0.7), 0.9);
      fillDiamond(g, x + w - 9, 0, 3, mix(accent, 0xffffff, 0.7), 0.9);
    }

    this.labelText.setColor(labelColor);
    if (this.subText) this.subText.setColor(this.disabled ? T.ghost : hot ? T.normal : T.dim);
    if (this.iconText) this.iconText.setAlpha(this.disabled ? 0.35 : 1);
    if (this.trailingText) this.trailingText.setAlpha(this.disabled ? 0.4 : 1);
  }

  setLabel(label: string): this {
    this.opts.label = label;
    this.labelText.setText(label);
    return this;
  }

  setSublabel(text: string): this {
    this.subText?.setText(text);
    return this;
  }

  setTrailing(text: string, color?: string): this {
    this.trailingText?.setText(text);
    if (color) this.trailingText?.setColor(color);
    return this;
  }

  setAccent(accent: number): this {
    this.opts.accent = accent;
    this.paint();
    return this;
  }

  setDisabled(disabled: boolean): this {
    if (this.disabled === disabled) return this;
    this.disabled = disabled;
    if (disabled) {
      this.hit.disableInteractive();
      this.state = 'idle';
      this.container.setScale(1);
    } else {
      // disableInteractive() leaves the old handlers attached, so re-enabling
      // without clearing them would stack a second onClick on every toggle.
      this.hit.removeAllListeners();
      this.wire();
    }
    this.paint();
    return this;
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  /**
   * Slow breathing highlight for the single most important action on a screen.
   *
   * Pulses the plate's alpha rather than the container's scale — hover and
   * press already own scale, and two tweens on the same property would fight.
   */
  pulse(): this {
    this.scene.tweens.add({
      targets: this.g, alpha: { from: 1, to: 0.72 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }
}

export function addButton(scene: Phaser.Scene, opts: ButtonOptions): UiButton {
  return new UiButton(scene, opts);
}

/** Standard top-left back plate, wired to ESC by the caller. */
export function addBackButton(
  scene: Phaser.Scene, onClick: () => void, accent = C.steel, label = 'BACK',
): UiButton {
  return new UiButton(scene, {
    x: 66, y: 38, w: 100, h: 34,
    label, icon: '◄', fontSize: 13, variant: 'quiet', accent,
    depth: DEPTH.content + 5, cut: 8, onClick,
  });
}

/**
 * Hexagonal icon button — corner affordances like the trophy, book and bag
 * buttons, where a full plate would be too heavy.
 */
export function addIconButton(scene: Phaser.Scene, opts: {
  x: number; y: number; r?: number; icon: string; accent?: number;
  depth?: number; onClick: () => void; tooltip?: string;
}): Phaser.GameObjects.Container {
  const r = opts.r ?? 21;
  const accent = opts.accent ?? C.arcane;
  const depth = opts.depth ?? DEPTH.content + 5;
  const container = scene.add.container(opts.x, opts.y).setDepth(depth);

  const g = scene.add.graphics();
  container.add(g);

  const icon = scene.add.text(0, 0, opts.icon, { fontSize: `${Math.round(r * 0.86)}px` }).setOrigin(0.5);
  container.add(icon);

  let tip: Phaser.GameObjects.Text | null = null;

  const paint = (hot: boolean): void => {
    g.clear();
    if (hot) {
      for (let i = 4; i >= 1; i--) strokeHex(g, 0, 0, r + i * 2.5, accent, 0.12 * (5 - i), 2);
    }
    fillHex(g, 0, 0, r, mix(tintPlate(accent, hot ? 0.5 : 0.22), 0x000000, 0.12), 1);
    strokeHex(g, 0, 0, r, hot ? mix(accent, 0xffffff, 0.5) : accent, hot ? 1 : 0.7, hot ? 2.5 : 1.8);
    strokeHex(g, 0, 0, r - 4, accent, hot ? 0.35 : 0.16, 1);
  };
  paint(false);

  const hit = scene.add.circle(0, 0, r, 0xffffff, 0).setInteractive({ useHandCursor: true });
  container.add(hit);

  hit.on('pointerover', () => {
    paint(true);
    Sfx.hover();
    scene.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 110, ease: 'Back.easeOut' });
    if (opts.tooltip && !tip) {
      tip = scene.add.text(opts.x, opts.y + r + 12, opts.tooltip, {
        fontSize: '10px', fontFamily: FONT_UI, color: T.normal,
        backgroundColor: hex(C.void_), padding: { x: 6, y: 3 }, letterSpacing: 1,
      }).setOrigin(0.5, 0).setDepth(depth + 10);
    }
  });
  hit.on('pointerout', () => {
    paint(false);
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 130 });
    tip?.destroy(); tip = null;
  });
  hit.on('pointerdown', () => {
    Sfx.click();
    scene.tweens.add({ targets: container, scaleX: 0.9, scaleY: 0.9, duration: 70, yoyo: true });
    opts.onClick();
  });

  return container;
}

/** Sliding switch with a lit track. Returns a setter so callers can re-sync it. */
export function addToggle(scene: Phaser.Scene, opts: {
  x: number; y: number; value: boolean; accent?: number; depth?: number;
  label?: string; onChange: (value: boolean) => void;
}): { setValue: (v: boolean) => void; container: Phaser.GameObjects.Container } {
  const accent = opts.accent ?? C.verdant;
  const depth = opts.depth ?? DEPTH.content;
  const trackW = 54;
  const trackH = 26;
  const knobR = 9;

  const container = scene.add.container(opts.x, opts.y).setDepth(depth);
  const g = scene.add.graphics();
  container.add(g);

  const knob = scene.add.circle(0, 0, knobR, 0x888899).setDepth(1);
  container.add(knob);

  const stateLabel = scene.add.text(trackW / 2 + 12, 0, '', {
    fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
  }).setOrigin(0, 0.5);
  container.add(stateLabel);

  if (opts.label) {
    const lbl = scene.add.text(-trackW / 2 - 12, 0, opts.label, {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1,
    }).setOrigin(1, 0.5);
    container.add(lbl);
  }

  let value = opts.value;

  const paint = (): void => {
    g.clear();
    const on = value;
    const col = on ? accent : C.steel;
    if (on) drawGlow(g, -trackW / 2, -trackH / 2, trackW, trackH, accent, 0.5, 3, 2.5, trackH / 2);
    fillNotchedGradient(
      g, -trackW / 2, -trackH / 2, trackW, trackH,
      mix(on ? tintPlate(accent, 0.55) : C.plate, 0x000000, 0.1),
      mix(on ? tintPlate(accent, 0.35) : C.plate, 0x000000, 0.5),
      1, trackH / 2, ALL_CORNERS, 8,
    );
    strokeNotched(g, -trackW / 2, -trackH / 2, trackW, trackH, col, on ? 1 : 0.5, 1.5, trackH / 2, ALL_CORNERS);
    knob.setFillStyle(on ? mix(accent, 0xffffff, 0.45) : 0x6a6a85);
    knob.setX(on ? trackW / 2 - knobR - 3 : -trackW / 2 + knobR + 3);
    stateLabel.setText(on ? 'ON' : 'OFF').setColor(on ? hex(mix(accent, 0xffffff, 0.5)) : T.faint);
  };
  paint();

  const hit = scene.add.rectangle(0, 0, trackW + 8, trackH + 10, 0xffffff, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerdown', () => {
    value = !value;
    paint();
    Sfx.play(value ? 'ui-toggle-on' : 'ui-toggle-off');
    scene.tweens.add({ targets: knob, scaleX: 1.35, scaleY: 1.35, duration: 90, yoyo: true });
    opts.onChange(value);
  });

  return {
    container,
    setValue: (v: boolean) => { value = v; paint(); },
  };
}

/** Segmented tab strip. Highlights the active tab and calls back on change. */
export function addTabs(scene: Phaser.Scene, opts: {
  x: number; y: number; tabW: number; tabH?: number; gap?: number;
  tabs: Array<{ label: string; accent?: number; disabled?: boolean; hint?: string }>;
  active: number;
  accent?: number;
  depth?: number;
  onSelect: (index: number) => void;
}): void {
  const tabH = opts.tabH ?? 30;
  const gap = opts.gap ?? 4;
  const depth = opts.depth ?? DEPTH.content;
  const baseAccent = opts.accent ?? C.arcane;
  const total = opts.tabs.length * opts.tabW + (opts.tabs.length - 1) * gap;
  const startX = opts.x - total / 2 + opts.tabW / 2;

  opts.tabs.forEach((tab, i) => {
    const accent = tab.accent ?? baseAccent;
    const isActive = i === opts.active;
    const tx = startX + i * (opts.tabW + gap);

    const g = scene.add.graphics().setDepth(depth);
    const x = tx - opts.tabW / 2;
    const y = opts.y - tabH / 2;
    // Tabs are cut on the top corners only, so the strip reads as one rail.
    const corners: Corners = [true, true, false, false];

    const paint = (hot: boolean): void => {
      g.clear();
      if (isActive) drawGlow(g, x, y, opts.tabW, tabH, accent, 0.4, 3, 2.5, 8, corners);
      const base = tab.disabled
        ? mix(C.plate, 0x000000, 0.55)
        : tintPlate(accent, isActive ? 0.45 : hot ? 0.22 : 0.08);
      fillNotchedGradient(g, x, y, opts.tabW, tabH, mix(base, 0xffffff, 0.08), mix(base, 0x000000, 0.35), 1, 8, corners, 8);
      strokeNotched(g, x, y, opts.tabW, tabH, accent, tab.disabled ? 0.2 : isActive ? 1 : hot ? 0.7 : 0.35, isActive ? 2 : 1, 8, corners);
      if (isActive) {
        g.fillStyle(mix(accent, 0xffffff, 0.4), 1);
        g.fillRect(x + 4, y + tabH - 3, opts.tabW - 8, 3);
      }
    };
    paint(false);

    const label = scene.add.text(tx, opts.y, tab.label, {
      fontSize: '12px',
      fontFamily: FONT_DISPLAY,
      color: tab.disabled ? T.ghost : isActive ? hex(mix(accent, 0xffffff, 0.75)) : T.dim,
      letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(depth + 1);

    if (tab.disabled) {
      if (tab.hint) {
        scene.add.text(tx, opts.y + tabH / 2 + 8, tab.hint, {
          fontSize: '8px', fontFamily: FONT_UI, color: T.ghost,
        }).setOrigin(0.5).setDepth(depth + 1);
      }
      return;
    }

    const hit = scene.add.rectangle(tx, opts.y, opts.tabW, tabH, 0xffffff, 0)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(true); Sfx.hover(); if (!isActive) label.setColor(T.bright); });
    hit.on('pointerout', () => { paint(false); if (!isActive) label.setColor(T.dim); });
    hit.on('pointerdown', () => { Sfx.play('ui-tab'); opts.onSelect(i); });
  });
}

/** Compact ◀ / ▶ pager plate. */
export function addPagerButton(scene: Phaser.Scene, opts: {
  x: number; y: number; dir: 'left' | 'right'; accent?: number; depth?: number; onClick: () => void;
}): UiButton {
  return new UiButton(scene, {
    x: opts.x, y: opts.y, w: 34, h: 46,
    label: opts.dir === 'left' ? '◀' : '▶',
    fontSize: 15, variant: 'ghost',
    accent: opts.accent ?? C.arcane,
    depth: opts.depth ?? DEPTH.content,
    cut: 8,
    onClick: opts.onClick,
  });
}
