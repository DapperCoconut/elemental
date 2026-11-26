import Phaser from 'phaser';
import { FONT_DISPLAY } from '../../ui';
import { Sfx } from '../../audio';

/**
 * The Isles' shared mouse chrome: one wooden button look for every campaign menu, plus the two
 * mouse conventions they all follow — the wheel scrolls, a right-click backs out.
 */

export interface WoodButtonOpts {
  accent?: number;
  fontSize?: number;
  /** Container to add into (its scroll factor / depth win). Otherwise screen-space at `depth`. */
  parent?: Phaser.GameObjects.Container;
  depth?: number;
  disabled?: boolean;
  /** Parchment look (dark text on light) for the map and dialogue. */
  light?: boolean;
  onHover?: () => void;
}

export interface WoodButton {
  objs: Phaser.GameObjects.GameObject[];
  text: Phaser.GameObjects.Text;
  destroy(): void;
}

/** A pressable plank centred on (x, y). */
export function woodButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, o: WoodButtonOpts = {}): WoodButton {
  const accent = o.accent ?? 0xff9d5c;
  const g = scene.add.graphics();
  const text = scene.add.text(x, y, label, {
    fontFamily: FONT_DISPLAY, fontSize: `${o.fontSize ?? 15}px`,
    color: o.disabled ? (o.light ? '#9a8668' : '#7a6050') : o.light ? '#3a2412' : '#ffe2b0',
  }).setOrigin(0.5);
  const draw = (hover: boolean, down: boolean) => {
    g.clear();
    const dy = down ? 1 : 0;
    if (o.light) {
      g.fillStyle(0x3a2412, 1); g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2 + dy, w + 4, h + 4, 9);
      g.fillStyle(hover && !o.disabled ? 0xfff0d0 : 0xe6d2aa, 1); g.fillRoundedRect(x - w / 2, y - h / 2 + dy, w, h, 8);
      if (hover && !o.disabled) { g.lineStyle(2, accent, 1); g.strokeRoundedRect(x - w / 2 + 2, y - h / 2 + 2 + dy, w - 4, h - 4, 7); }
    } else {
      g.fillStyle(o.disabled ? 0x4a3a2a : accent, 1); g.fillRoundedRect(x - w / 2, y - h / 2 + dy, w, h, 9);
      g.fillStyle(hover && !o.disabled ? 0x4a2a14 : 0x2a1408, 1); g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3 + dy, w - 6, h - 6, 7);
    }
    text.setY(y + dy);
  };
  draw(false, false);
  const hit = scene.add.zone(x, y, w, h);
  if (!o.disabled) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(true, false); Sfx.play('ui-hover'); o.onHover?.(); });
    hit.on('pointerout', () => draw(false, false));
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) return; draw(true, true); });
    hit.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonReleased()) return;
      draw(true, false);
      onClick();
    });
  }
  const objs: Phaser.GameObjects.GameObject[] = [g, text, hit];
  if (o.parent) o.parent.add(objs);
  else for (const ob of [g, text]) ob.setScrollFactor(0).setDepth(o.depth ?? 0);
  if (!o.parent) hit.setScrollFactor(0).setDepth(o.depth ?? 0);
  return { objs, text, destroy: () => { for (const ob of objs) ob.destroy(); } };
}

/** Right-click anywhere backs out. Unhooks itself when the scene shuts down. */
export function onRightClick(scene: Phaser.Scene, fn: () => void): () => void {
  const h = (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) fn(); };
  scene.input.on('pointerdown', h);
  const off = () => scene.input.off('pointerdown', h);
  scene.events.once('shutdown', off);
  return off;
}

/** Mouse wheel: `dir` is +1 (down) or −1 (up) per notch. */
export function onWheel(scene: Phaser.Scene, fn: (dir: number, pointer: Phaser.Input.Pointer) => void): () => void {
  const h = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => { if (dy) fn(Math.sign(dy), p); };
  scene.input.on('wheel', h);
  const off = () => scene.input.off('wheel', h);
  scene.events.once('shutdown', off);
  return off;
}
