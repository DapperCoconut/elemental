import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Sfx } from '../../audio';
import type { NpcLook } from '../IslesTypes';
import { drawNpc } from './NpcArt';
import { woodButton, onRightClick, type WoodButton } from './IslesUi';

/**
 * The world's conversation box: a parchment panel along the bottom with the speaker's live
 * portrait, a typewriter, and optional choices after the last line. Screen-space; the world
 * keeps animating behind it but the player cannot move while it is open.
 */

export interface DialogueChoice { label: string; pick: () => void }

export interface DialogueOpts {
  name: string;
  title?: string;
  look?: NpcLook | null;
  /** Custom portrait painter (a champion's element rig, a prince) instead of an NPC look. */
  portrait?: (g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, talking: boolean) => void;
  lines: string[];
  choices?: DialogueChoice[];
  onDone?: () => void;
  accent?: number;
}

const Z = 30000;
const CPS = 52;

export class WorldDialogue {
  private root: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Graphics;
  private nameT: Phaser.GameObjects.Text;
  private titleT: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private more: Phaser.GameObjects.Text;
  private choiceTexts: WoodButton[] = [];
  private accent = 0xff9d5c;
  private choicesAt = 0;
  private opts: DialogueOpts | null = null;
  private idx = 0;
  private shown = 0;
  private sel = 0;
  private t = 0;
  private openedAt = 0;

  constructor(private scene: Phaser.Scene) {
    const W = scene.scale.width, H = scene.scale.height;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(Z).setVisible(false);
    this.panel = scene.add.graphics();
    this.face = scene.add.graphics();
    this.nameT = scene.add.text(196, H - 186, '', { fontFamily: FONT_DISPLAY, fontSize: '19px', color: '#ffe2b0', stroke: '#2a1408', strokeThickness: 4 });
    this.titleT = scene.add.text(196, H - 162, '', { fontFamily: FONT_UI, fontSize: '13px', color: '#c8a87a' });
    this.body = scene.add.text(196, H - 138, '', {
      fontFamily: FONT_UI, fontSize: '17px', color: '#3a2412', wordWrap: { width: W - 240 }, lineSpacing: 4,
    });
    this.more = scene.add.text(W - 44, H - 36, 'click ▶', { fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#8a5a2a' }).setOrigin(1, 1);
    this.root.add([this.panel, this.face, this.nameT, this.titleT, this.body, this.more]);
    this.drawPanel(0xff9d5c);
    // Right-click backs out of a conversation (the same as Esc / “Not yet”).
    onRightClick(scene, () => { if (this.isOpen && scene.time.now - this.openedAt > 150) this.close(); });
  }

  get isOpen(): boolean { return this.opts !== null; }

  private drawPanel(accent: number): void {
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const g = this.panel;
    g.clear();
    const x = 22, y = H - 200, w = W - 44, h = 184;
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x + 5, y + 7, w, h, 16);
    g.fillStyle(0x3a2412, 1); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 18);
    g.fillStyle(0xf1e2c2, 1); g.fillRoundedRect(x, y, w, h, 16);
    g.fillStyle(0xe6d2aa, 1); g.fillRoundedRect(x + 8, y + h - 18, w - 16, 10, 5);
    // Name tab
    g.fillStyle(0x2a1810, 1); g.fillRoundedRect(186, y - 26, 300, 44, 10);
    g.fillStyle(accent, 1); g.fillRect(186, y + 12, 300, 3);
    // Portrait well
    g.fillStyle(0x2a1810, 1); g.fillRoundedRect(36, y + 14, 144, 156, 12);
    g.fillStyle(0x4a2e1c, 1); g.fillRoundedRect(42, y + 20, 132, 144, 10);
    g.fillStyle(accent, 0.18); g.fillCircle(108, y + 96, 60);
    this.nameT.setY(y - 18);
    this.titleT.setY(y + 22);
    this.body.setY(y + 46);
  }

  open(o: DialogueOpts): void {
    this.opts = o;
    this.idx = 0;
    this.shown = 0;
    this.sel = 0;
    this.openedAt = this.scene.time.now;
    this.accent = o.accent ?? 0xff9d5c;
    this.drawPanel(this.accent);
    this.body.setWordWrapWidth(this.scene.scale.width - 240);
    this.nameT.setText(o.name);
    this.titleT.setText(o.title ?? '');
    this.root.setVisible(true);
    this.clearChoices();
    if (o.lines.length === 0) this.showChoicesOrFinish();
    Sfx.play('ui-open');
  }

  private clearChoices(): void {
    for (const c of this.choiceTexts) c.destroy();
    this.choiceTexts = [];
  }

  private get line(): string { return this.opts?.lines[this.idx] ?? ''; }

  private get atLast(): boolean { return !!this.opts && this.idx >= this.opts.lines.length - 1; }

  update(dtMs: number): void {
    if (!this.opts) return;
    this.t += dtMs / 1000;
    const full = this.line;
    const typing = this.shown < full.length;
    if (typing) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(full.length, this.shown + (CPS * dtMs) / 1000);
      if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0) Sfx.play('ui-type');
    }
    this.body.setText(full.slice(0, Math.floor(this.shown)));
    this.more.setVisible(!typing && this.choiceTexts.length === 0);
    this.more.setAlpha(0.5 + Math.sin(this.t * 6) * 0.5);

    const H = this.scene.scale.height;
    const g = this.face;
    g.clear();
    const px = 108, py = H - 200 + 150;
    if (this.opts.portrait) this.opts.portrait(g, px, py, this.t, typing);
    else if (this.opts.look) drawNpc(g, this.opts.look, { x: px, y: py, t: this.t, look: 0.3, moving: false, talking: typing, scale: 2.7 });

    this.choiceTexts.forEach((c, i) => {
      c.text.setColor(i === this.sel ? '#7a2a08' : '#3a2412');
      c.text.setText(`${i === this.sel ? '▶ ' : ''}${this.opts?.choices?.[i]?.label ?? ''}`);
    });
  }

  /** E / Space / a click on the box (choices are picked by clicking their own buttons). */
  advance(fromClick = false): void {
    if (!this.opts) return;
    if (this.scene.time.now - this.openedAt < 120) return;
    if (this.choiceTexts.length) { if (!fromClick) this.choose(this.sel); return; }
    const full = this.line;
    if (this.shown < full.length) { this.shown = full.length; return; }
    if (this.atLast) { this.showChoicesOrFinish(); return; }
    this.idx += 1;
    this.shown = 0;
    Sfx.play('ui-click');
  }

  move(dir: number): void {
    if (!this.choiceTexts.length) return;
    this.sel = (this.sel + dir + this.choiceTexts.length) % this.choiceTexts.length;
    Sfx.play('ui-hover');
  }

  private showChoicesOrFinish(): void {
    const o = this.opts;
    if (!o) return;
    if (o.choices?.length && !this.choiceTexts.length) {
      const H = this.scene.scale.height;
      const W = this.scene.scale.width;
      // A column of buttons up the right of the box; a long list grows upward over the world.
      const n = o.choices.length;
      const bh = 28, gap = 4;
      const bw = Math.min(420, Math.max(220, ...o.choices.map((c) => c.label.length * 9 + 40)));
      const bottom = H - 40;
      this.choicesAt = this.scene.time.now;
      this.body.setWordWrapWidth(W - 280 - bw);
      o.choices.forEach((c, i) => {
        const by = bottom - (n - 1 - i) * (bh + gap);
        const b = woodButton(this.scene, W - 50 - bw / 2, by, bw, bh, c.label, () => { if (this.scene.time.now - this.choicesAt > 150) this.choose(i); }, {
          parent: this.root, light: true, accent: this.accent, fontSize: 15, onHover: () => { this.sel = i; },
        });
        this.choiceTexts.push(b);
      });
      return;
    }
    this.finish();
  }

  choose(i: number): void {
    const o = this.opts;
    const c = o?.choices?.[i];
    this.finish(false);
    Sfx.play('ui-click');
    c?.pick();
    if (!this.opts) o?.onDone?.();
  }

  private finish(callDone = true): void {
    const o = this.opts;
    this.opts = null;
    this.clearChoices();
    this.root.setVisible(false);
    this.face.clear();
    if (callDone) o?.onDone?.();
  }

  close(): void { this.finish(false); }
}
