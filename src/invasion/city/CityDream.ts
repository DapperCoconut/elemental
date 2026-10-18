import Phaser from 'phaser';
import { TypewriterBox } from '../../ui';
import { dreamLinesFor, DreamLines } from './AllElementDialogue';

const FONT = '"Georgia", "Times New Roman", serif';

/**
 * The All-Element talking in its sleep. The opening is a proper dialogue plate
 * (the first wave waits for it); everything after is murmured — a line of
 * italic under the All-Element's health bar that fades on its own, so it never
 * takes a click away from a fight.
 */
export class CityDream {
  private lines: DreamLines;
  private box: TypewriterBox;
  private murmur: Phaser.GameObjects.Text;
  private saidHurt = false;

  constructor(private scene: Phaser.Scene, elementId: string, onOpenChange?: (open: boolean) => void) {
    this.lines = dreamLinesFor(elementId);
    this.box = new TypewriterBox(scene, { accent: 0xe8dcff, onOpenChange });
    this.murmur = scene.add.text(scene.scale.width / 2, 166, '', {
      fontSize: '13px', fontFamily: FONT, fontStyle: 'italic', color: '#e8dcff',
      stroke: '#0a0614', strokeThickness: 4, align: 'center', wordWrap: { width: 620 },
    }).setOrigin(0.5, 0).setDepth(26).setAlpha(0);
  }

  get isOpen(): boolean { return this.box.isOpen(); }

  /** The opening. Resolves once the last line is dismissed. */
  intro(): Promise<void> {
    return this.box.say([...this.lines.intro], { speaker: '✦ THE ALL-ELEMENT (asleep)' });
  }

  /** Waves 5, 10 and 15 each get their line. */
  onWaveHeld(wave: number): void {
    const line = wave === 5 ? this.lines.milestones[0]
      : wave === 10 ? this.lines.milestones[1]
        : wave === 15 ? this.lines.milestones[2] : null;
    if (line) this.say(line);
  }

  /** First time it drops below half. */
  onHealth(frac: number): void {
    if (this.saidHurt || frac >= 0.5) return;
    this.saidHurt = true;
    this.say(this.lines.hurt, '#ffb0b8');
  }

  saved(): void { this.say(this.lines.saved, '#fff4c0', 8000); }
  downed(): void { this.say(this.lines.downed, '#ffb0b8'); }
  get fallenLine(): string { return this.lines.fallen; }

  private say(text: string, color = '#e8dcff', ms = 6000): void {
    const t = this.murmur;
    this.scene.tweens.killTweensOf(t);
    t.setText(`“${text}”`).setColor(color).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 400 });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: ms, duration: 900 });
  }

  destroy(): void {
    this.box.destroy();
    this.murmur.destroy();
  }
}
