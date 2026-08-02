import Phaser from 'phaser';
import { StoryBeat, getStoryBeat } from '../data/CampaignStory';
import * as CP from '../data/CampaignProgress';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix } from '../ui';
import { Sfx } from '../audio';

/**
 * Story dialogue overlay — a bottom bar with a portrait, a typewriter line and
 * a very obvious skip. Launched over a paused scene; resumes it when done.
 *
 * Beats are one-shot per save slot (CampaignProgress.seenStoryBeats), marked
 * seen the moment the overlay opens so a mid-beat quit never replays it.
 */

interface DialogueData {
  beatId: string;
  slotIdx: 0 | 1 | 2;
  /** Scene key to resume when the beat ends. */
  resumeKey: string;
}

const TYPE_MS = 16;
const BAR_H = 148;

export class DialogueScene extends Phaser.Scene {
  private beat: StoryBeat | null = null;
  private slotIdx: 0 | 1 | 2 = 0;
  private resumeKey = '';
  private lineIdx = 0;
  private shown = 0;
  private lastTypeAt = 0;
  private lineText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private portraitText!: Phaser.GameObjects.Text;
  private plateG!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  init(data: DialogueData): void {
    this.beat = getStoryBeat(data.beatId) ?? null;
    this.slotIdx = data.slotIdx;
    this.resumeKey = data.resumeKey;
    this.lineIdx = 0;
    this.shown = 0;
    if (this.beat) CP.markStoryBeatSeen(this.slotIdx, this.beat.id);
  }

  create(): void {
    if (!this.beat || this.beat.lines.length === 0) { this.finish(); return; }
    const { width, height } = this.scale;

    // Scrim keeps the paused scene readable but clearly backgrounded.
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35).setDepth(0);

    this.plateG = this.add.graphics().setDepth(1);
    this.portraitText = this.add.text(74, height - BAR_H / 2 - 8, '', { fontSize: '44px' })
      .setOrigin(0.5).setDepth(2);
    this.nameText = this.add.text(132, height - BAR_H + 22, '', {
      fontSize: '14px', fontFamily: FONT_DISPLAY, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(2);
    this.lineText = this.add.text(132, height - BAR_H + 44, '', {
      fontSize: '14px', fontFamily: FONT_UI, color: T.bright,
      wordWrap: { width: width - 200 }, lineSpacing: 5,
    }).setOrigin(0, 0).setDepth(2);
    this.hintText = this.add.text(width - 26, height - 22, 'SPACE ▸   ·   ESC skips', {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1.5,
    }).setOrigin(1, 0.5).setDepth(2);
    this.tweens.add({ targets: this.hintText, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });

    this.startLine();

    const advance = (): void => {
      const line = this.beat!.lines[this.lineIdx];
      if (this.shown < line.text.length) {
        this.shown = line.text.length; // first press completes the line
        this.lineText.setText(line.text);
        return;
      }
      this.lineIdx++;
      if (this.lineIdx >= this.beat!.lines.length) this.finish();
      else this.startLine();
    };

    this.input.keyboard!.on('keydown-SPACE', advance);
    this.input.keyboard!.on('keydown-ENTER', advance);
    this.input.on('pointerdown', advance);
    this.input.keyboard!.on('keydown-ESC', () => this.finish());
    void DEPTH;
  }

  private startLine(): void {
    const line = this.beat!.lines[this.lineIdx];
    const { width, height } = this.scale;
    this.shown = 0;
    this.lastTypeAt = 0;
    Sfx.play('ui-click');

    // Bar plate, re-tinted per speaker.
    const accent = line.color;
    const g = this.plateG;
    g.clear();
    g.fillStyle(0x04040c, 0.94);
    g.fillRect(24, height - BAR_H, width - 48, BAR_H - 16);
    g.lineStyle(2, accent, 0.8);
    g.strokeRect(24, height - BAR_H, width - 48, BAR_H - 16);
    g.lineStyle(1, mix(accent, 0xffffff, 0.4), 0.25);
    g.strokeRect(29, height - BAR_H + 5, width - 58, BAR_H - 26);
    // Portrait plate.
    g.fillStyle(mix(accent, 0x000000, 0.65), 1);
    g.fillCircle(74, height - BAR_H / 2 - 8, 34);
    g.lineStyle(2, accent, 0.9);
    g.strokeCircle(74, height - BAR_H / 2 - 8, 34);

    this.portraitText.setText(line.emoji);
    this.nameText.setText(line.speaker.toUpperCase()).setColor(hex(mix(accent, 0xffffff, 0.5)));
    this.lineText.setText('');
    void C;
  }

  update(time: number): void {
    if (!this.beat) return;
    const line = this.beat.lines[this.lineIdx];
    if (!line || this.shown >= line.text.length) return;
    if (time - this.lastTypeAt < TYPE_MS) return;
    this.lastTypeAt = time;
    this.shown = Math.min(line.text.length, this.shown + 2);
    this.lineText.setText(line.text.slice(0, this.shown));
  }

  private finish(): void {
    this.scene.stop();
    if (this.resumeKey) this.scene.resume(this.resumeKey);
  }
}

/**
 * Play a beat over `host` if this slot has not seen it. Returns true if the
 * overlay launched (the host is paused until it finishes).
 */
export function maybePlayStory(host: Phaser.Scene, slotIdx: 0 | 1 | 2, beatId: string): boolean {
  if (CP.hasSeenStoryBeat(slotIdx, beatId) || !getStoryBeat(beatId)) return false;
  host.scene.pause();
  host.scene.launch('DialogueScene', { beatId, slotIdx, resumeKey: host.scene.key });
  return true;
}
