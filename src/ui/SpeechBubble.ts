import Phaser from 'phaser';
import { C, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix } from './Theme';
import { Sfx } from '../audio';

/**
 * A comic speech bubble for the menu characters — the shopkeeper, the alchemist, the
 * vault-keeper. A rounded plate with a tail pointing at whoever is talking, text that types
 * itself in, and lines that advance on their own so the player is never held up: this is
 * not `TypewriterBox`, which owns the whole screen's clicks while it is up. Here a click on
 * the bubble itself lands the line (or skips to the next); clicks anywhere else go through.
 *
 * Anchor the bubble at the speaker's mouth and say which side the plate should sit on. A new
 * `say()` cuts the previous one off — a merchant who has moved on has moved on.
 */
export class SpeechBubble {
  private scene: Phaser.Scene;
  private accent: number;
  private anchorX: number;
  private anchorY: number;
  private side: 'left' | 'right';
  private place: 'above' | 'below';
  private offsetX: number;
  private offsetY: number;
  private width: number;
  private depth: number;

  private container: Phaser.GameObjects.Container | null = null;
  private plate: Phaser.GameObjects.Graphics | null = null;
  private text: Phaser.GameObjects.Text | null = null;
  private hit: Phaser.GameObjects.Rectangle | null = null;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private holdTimer: Phaser.Time.TimerEvent | null = null;
  private fade: Phaser.Tweens.Tween | null = null;

  private lines: string[] = [];
  private lineIdx = 0;
  private shown = 0;
  private hold = 0;
  private onTalk: ((talking: boolean) => void) | null = null;
  private onDone: (() => void) | null = null;
  private destroyed = false;

  private static readonly TYPE_MS = 22;

  constructor(scene: Phaser.Scene, opts: {
    /** The point the tail aims at — the speaker's mouth. */
    anchorX: number; anchorY: number;
    /** Which side of the anchor the plate sits on. */
    side?: 'left' | 'right';
    /** Whether the plate floats above the mouth (default) or hangs below it. */
    place?: 'above' | 'below';
    /** Slide the plate from its default spot; the tail still finds the anchor. */
    offsetX?: number;
    offsetY?: number;
    width?: number;
    accent?: number;
    depth?: number;
    /** Fired when speech starts and stops, so the speaker can flap its mouth. */
    onTalk?: (talking: boolean) => void;
  }) {
    this.scene = scene;
    this.anchorX = opts.anchorX;
    this.anchorY = opts.anchorY;
    this.side = opts.side ?? 'right';
    this.place = opts.place ?? 'above';
    this.offsetX = opts.offsetX ?? 0;
    this.offsetY = opts.offsetY ?? 0;
    this.width = opts.width ?? 300;
    this.accent = opts.accent ?? C.gold;
    this.depth = opts.depth ?? DEPTH.content + 8;
    this.onTalk = opts.onTalk ?? null;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  isOpen(): boolean { return this.container !== null; }

  /** Move the tail — a speaker that bobs can keep the bubble pinned to its mouth. */
  setAnchor(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
    if (this.container) this.container.setPosition(x, y);
  }

  /**
   * Speak the lines in order. Each one holds for a beat scaled to its length and then
   * advances; after the last the bubble fades out. `hold` adds extra ms per line.
   */
  say(lines: string[], opts?: { hold?: number; onDone?: () => void; silent?: boolean }): void {
    if (this.destroyed) return;
    this.cancel();
    if (lines.length === 0) return;
    this.lines = lines;
    this.lineIdx = 0;
    this.hold = opts?.hold ?? 0;
    this.onDone = opts?.onDone ?? null;
    if (!opts?.silent) Sfx.play('ui-toast');
    this.build();
    this.startLine();
  }

  /** Drop whatever is being said, now. */
  hide(): void { this.cancel(); }

  destroy(): void {
    if (this.destroyed) return;
    this.cancel();
    this.destroyed = true;
  }

  // ── Internals ───────────────────────────────────────────────────────

  private build(): void {
    this.container = this.scene.add.container(this.anchorX, this.anchorY).setDepth(this.depth);
    this.plate = this.scene.add.graphics();
    this.text = this.scene.add.text(0, 0, '', {
      fontSize: '14px', fontFamily: FONT_UI, color: '#f6efe0',
      wordWrap: { width: this.width - 36 }, lineSpacing: 4,
    });
    this.hit = this.scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.hit.on('pointerdown', () => this.advance());
    this.container.add([this.plate, this.text, this.hit]);
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 120 });
  }

  /** Size the plate for the whole line, then reveal it a character at a time. */
  private layout(line: string): void {
    if (!this.plate || !this.text || !this.hit) return;
    this.text.setText(line);
    const tw = Math.min(this.width - 36, Math.max(90, this.text.width));
    const th = this.text.height;
    const w = tw + 36;
    const h = th + 28;
    // The plate floats off to the side of the anchor, above or below it; the tail bridges the gap.
    const dir = this.side === 'right' ? 1 : -1;
    const below = this.place === 'below';
    const left = (dir > 0 ? 22 : -22 - w) + this.offsetX;
    const top = (below ? 44 : -h - 26) + this.offsetY;
    this.text.setPosition(left + 18, top + 14);
    this.hit.setPosition(left + w / 2, top + h / 2).setSize(w, h + 20);

    const g = this.plate;
    g.clear();
    const fill = mix(0x1a1410, this.accent, 0.08);
    // Shadow, body, edge.
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(left + 3, top + 5, w, h, 12);
    g.fillStyle(fill, 0.97);
    g.fillRoundedRect(left, top, w, h, 12);
    // Tail: a triangle from the plate's near edge to the anchor.
    // The tail leaves the plate from whichever part of its edge is nearest the anchor.
    const nearX = Phaser.Math.Clamp(0, left + 22, left + w - 46);
    const tx0 = nearX;
    const tx1 = nearX + 24;
    const edgeY = below ? top + 2 : top + h - 2;
    g.fillStyle(fill, 0.97);
    g.fillTriangle(tx0, edgeY, tx1, edgeY, 0, below ? 2 : -2);
    g.lineStyle(1.5, mix(this.accent, 0xffffff, 0.2), 0.85);
    g.strokeRoundedRect(left, top, w, h, 12);
    g.lineStyle(1.5, mix(this.accent, 0xffffff, 0.2), 0.85);
    g.beginPath(); g.moveTo(tx0, below ? top : top + h); g.lineTo(0, below ? 2 : -2); g.lineTo(tx1, below ? top : top + h); g.strokePath();
    // Mask the seam where the tail meets the plate.
    g.fillStyle(fill, 1);
    g.fillRect(Math.min(tx0, tx1) + 1, below ? top - 1 : top + h - 3, Math.abs(tx1 - tx0) - 2, 4);
    g.lineStyle(1, mix(this.accent, 0xffffff, 0.6), 0.25);
    g.beginPath(); g.moveTo(left + 14, top + 2); g.lineTo(left + w - 14, top + 2); g.strokePath();
    // A little "…" prompt dot row in the corner, so the player knows a click moves it on.
    g.fillStyle(this.accent, 0.5);
    for (let i = 0; i < 3; i++) g.fillCircle(left + w - 26 + i * 6, top + h - 8, 1.4);
  }

  private startLine(): void {
    const line = this.lines[this.lineIdx];
    this.layout(line);
    this.shown = 0;
    this.text?.setText('');
    this.typeTimer?.remove();
    this.holdTimer?.remove();
    this.onTalk?.(true);
    this.typeTimer = this.scene.time.addEvent({
      delay: SpeechBubble.TYPE_MS,
      repeat: line.length - 1,
      callback: () => {
        this.shown += 1;
        this.text?.setText(line.slice(0, this.shown));
        if (this.shown % 3 === 0) Sfx.play('ui-type');
        if (this.shown >= line.length) this.landed();
      },
    });
  }

  /** The line is fully shown: hold it, then move on. */
  private landed(): void {
    this.onTalk?.(false);
    this.typeTimer?.remove();
    this.typeTimer = null;
    const line = this.lines[this.lineIdx];
    const ms = 1400 + line.length * 38 + this.hold;
    this.holdTimer?.remove();
    this.holdTimer = this.scene.time.delayedCall(ms, () => this.next());
  }

  private advance(): void {
    const line = this.lines[this.lineIdx];
    if (this.shown < line.length) {
      this.shown = line.length;
      this.text?.setText(line);
      this.landed();
      return;
    }
    this.next();
  }

  private next(): void {
    this.lineIdx += 1;
    if (this.lineIdx < this.lines.length) {
      this.startLine();
      return;
    }
    // Last line done: fade and clear.
    const c = this.container;
    this.container = null;
    this.plate = null;
    this.text = null;
    this.hit = null;
    this.holdTimer?.remove();
    this.holdTimer = null;
    if (c) {
      this.fade = this.scene.tweens.add({
        targets: c, alpha: 0, duration: 220,
        onComplete: () => c.destroy(),
      });
    }
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  private cancel(): void {
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.holdTimer?.remove();
    this.holdTimer = null;
    this.fade?.stop();
    this.fade = null;
    this.container?.destroy();
    this.container = null;
    this.plate = null;
    this.text = null;
    this.hit = null;
    this.onDone = null;
    this.onTalk?.(false);
  }
}

/** A tiny label that pops over a hovered thing — item names on a shelf, vial names on a desk. */
export function addHoverLabel(scene: Phaser.Scene, x: number, y: number, label: string, accent: number, depth = DEPTH.content + 9): Phaser.GameObjects.Container {
  const t = scene.add.text(0, 0, label.toUpperCase(), {
    fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 1.5,
  }).setOrigin(0.5);
  const g = scene.add.graphics();
  const w = t.width + 18;
  g.fillStyle(0x100c0a, 0.92);
  g.fillRoundedRect(-w / 2, -11, w, 22, 5);
  g.lineStyle(1, accent, 0.6);
  g.strokeRoundedRect(-w / 2, -11, w, 22, 5);
  const c = scene.add.container(x, y, [g, t]).setDepth(depth).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: y - 4, duration: 110 });
  return c;
}
