import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, lighten, mix, CUT } from './Theme';

/**
 * An in-scene dialogue plate with a typewriter reveal — the voice of the
 * Reality dungeon, but deliberately generic: any scene can hold one.
 *
 * `DialogueScene` already exists and is not this: it is welded to campaign
 * story beats (`seenStoryBeats`, scene-pause, beat ids), which is exactly wrong
 * for lines that must replay on every dungeon attempt and speak mid-fight.
 *
 * One line at a time; a click finishes the reveal, a second click advances.
 * `say()` resolves when the last line has been dismissed, so callers can
 * sequence a scripted beat with a plain `await`.
 */
export class TypewriterBox {
  private scene: Phaser.Scene;
  private accent: number;
  /** Fired on open/close — ArenaScene uses it to latch pointer input away from ability casts. */
  private onOpenChange?: (open: boolean) => void;

  private container: Phaser.GameObjects.Container | null = null;
  private text: Phaser.GameObjects.Text | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private clickZone: Phaser.GameObjects.Zone | null = null;
  private typeTimer: Phaser.Time.TimerEvent | null = null;

  private lines: string[] = [];
  private lineIdx = 0;
  private shown = 0;
  private speaker = '';
  private resolveSay: (() => void) | null = null;

  /** Ms per revealed character. */
  private static readonly TYPE_MS = 24;

  constructor(scene: Phaser.Scene, opts?: { accent?: number; onOpenChange?: (open: boolean) => void }) {
    this.scene = scene;
    this.accent = opts?.accent ?? C.frost;
    this.onOpenChange = opts?.onOpenChange;
  }

  isOpen(): boolean {
    return this.container !== null;
  }

  /**
   * Speaks the lines in order and resolves once the last is dismissed. A call
   * while a previous one is still open cuts the old sequence off (resolving its
   * promise) rather than queueing — a boss that has moved on has moved on.
   */
  say(lines: string[], opts?: { speaker?: string }): Promise<void> {
    this.teardown();
    if (lines.length === 0) return Promise.resolve();
    this.lines = lines;
    this.lineIdx = 0;
    this.speaker = opts?.speaker ?? '';
    return new Promise((resolve) => {
      this.resolveSay = resolve;
      this.build();
      this.startLine();
    });
  }

  /** Kills the box outright, resolving any waiting `say()`. Safe to call twice. */
  destroy(): void {
    this.teardown();
  }

  // ── Internals ───────────────────────────────────────────────────────

  private build(): void {
    const { width: W, height: H } = this.scene.scale;
    const plateW = Math.min(720, W - 80);
    const plateH = 96;
    const x = W / 2;
    const y = H - 88;

    const g = this.scene.add.graphics();
    // Cut-cornered plate in the house style, glowing faintly with the accent.
    const left = -plateW / 2;
    const top = -plateH / 2;
    g.fillStyle(mix(C.plate, this.accent, 0.08), 0.96);
    g.beginPath();
    g.moveTo(left + CUT, top);
    g.lineTo(left + plateW - CUT, top);
    g.lineTo(left + plateW, top + CUT);
    g.lineTo(left + plateW, top + plateH - CUT);
    g.lineTo(left + plateW - CUT, top + plateH);
    g.lineTo(left + CUT, top + plateH);
    g.lineTo(left, top + plateH - CUT);
    g.lineTo(left, top + CUT);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, this.accent, 0.7);
    g.strokePath();
    g.lineStyle(1, mix(this.accent, 0x000000, 0.5), 0.5);
    g.strokeRect(left + 4, top + 4, plateW - 8, plateH - 8);

    this.text = this.scene.add.text(left + 22, top + (this.speaker ? 32 : 20), '', {
      fontSize: '15px', fontFamily: FONT_UI, color: T.bright,
      wordWrap: { width: plateW - 44 },
      lineSpacing: 4,
    });

    const children: Phaser.GameObjects.GameObject[] = [g, this.text];

    if (this.speaker) {
      children.push(this.scene.add.text(left + 22, top + 12, this.speaker.toUpperCase(), {
        fontSize: '11px', fontFamily: FONT_DISPLAY, letterSpacing: 2,
        color: hex(lighten(this.accent, 0.35)),
      }));
    }

    this.prompt = this.scene.add.text(left + plateW - 20, top + plateH - 16, '▼', {
      fontSize: '12px', fontFamily: FONT_UI, color: hex(this.accent),
    }).setOrigin(1, 0.5).setVisible(false);
    children.push(this.prompt);

    this.container = this.scene.add.container(x, y, children).setDepth(DEPTH.modal);

    // Full-screen click catcher: while the box is up, every click belongs to it.
    this.clickZone = this.scene.add.zone(W / 2, H / 2, W, H)
      .setDepth(DEPTH.modal - 1)
      .setInteractive({ useHandCursor: true });
    this.clickZone.on('pointerdown', () => this.advance());

    this.onOpenChange?.(true);
  }

  private startLine(): void {
    this.shown = 0;
    this.typeTimer?.remove();
    this.prompt?.setVisible(false);
    const line = this.lines[this.lineIdx];
    this.text?.setText('');
    this.typeTimer = this.scene.time.addEvent({
      delay: TypewriterBox.TYPE_MS,
      repeat: line.length - 1,
      callback: () => {
        this.shown += 1;
        this.text?.setText(line.slice(0, this.shown));
        if (this.shown >= line.length) this.prompt?.setVisible(true);
      },
    });
  }

  private advance(): void {
    const line = this.lines[this.lineIdx];
    if (this.shown < line.length) {
      // First click lands the whole line; reading speed is the player's call.
      this.typeTimer?.remove();
      this.typeTimer = null;
      this.shown = line.length;
      this.text?.setText(line);
      this.prompt?.setVisible(true);
      return;
    }
    this.lineIdx += 1;
    if (this.lineIdx < this.lines.length) {
      this.startLine();
    } else {
      this.teardown();
    }
  }

  private teardown(): void {
    const hadBox = this.container !== null;
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.clickZone?.destroy();
    this.clickZone = null;
    this.container?.destroy();
    this.container = null;
    this.text = null;
    this.prompt = null;
    const resolve = this.resolveSay;
    this.resolveSay = null;
    if (hadBox) this.onOpenChange?.(false);
    // Resolve last: the callback may immediately open the next beat.
    resolve?.();
  }
}
