import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Sfx } from '../../audio';
import { ISLES, PINNACLE, allAreas, isleOf } from '../IslesRegistry';
import type { AreaDef, IsleDef } from '../IslesTypes';

/**
 * The cheat save's fast-travel menu: a button in the world HUD's top right that drops a panel listing every
 * isle and, for the picked isle, every area on it. Built only while cheat mode is on (IsleWorldScene.create).
 */

const ROW = 20;
const ISLE_W = 150;
const AREA_W = 168;
/** Area rows per column before the list wraps into another column. */
const PER_COL = 24;
const PAD = 8;
const TOP = 40;

export class CheatTravel {
  private readonly isles: IsleDef[] = [...ISLES, PINNACLE];
  private readonly byIsle = new Map<string, AreaDef[]>();
  private readonly button: Phaser.GameObjects.Text;
  private readonly g: Phaser.GameObjects.Graphics;
  private rows: Phaser.GameObjects.Text[] = [];
  private isle: string;
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly here: string,
    private readonly depth: number,
    private readonly go: (areaId: string) => void,
  ) {
    for (const a of allAreas()) {
      const id = isleOf(a.id);
      if (!id) continue;
      const list = this.byIsle.get(id) ?? [];
      list.push(a);
      this.byIsle.set(id, list);
    }
    this.isle = isleOf(here) ?? this.isles[0].id;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.button = scene.add.text(0, 12, '⚡ TRAVEL [T]', {
      fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#9dffb0', stroke: '#000', strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    this.button.on('pointerdown', () => this.toggle());
  }

  get isOpen(): boolean { return this.open; }

  toggle(): void {
    this.open = !this.open;
    Sfx.play('ui-tab');
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.render();
  }

  /** Called every frame by the HUD: keeps the button just left of the coin readout, hidden under a dialogue. */
  layout(right: number, hidden: boolean): void {
    if (hidden && this.open) this.close();
    this.button.setX(right).setVisible(!hidden);
  }

  private render(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
    this.g.clear();
    if (!this.open) return;

    const areas = this.byIsle.get(this.isle) ?? [];
    const cols = Math.max(1, Math.ceil(areas.length / PER_COL));
    const perCol = Math.ceil(areas.length / cols);
    const w = PAD * 3 + ISLE_W + cols * AREA_W;
    const h = PAD * 2 + Math.max(this.isles.length, perCol) * ROW;
    const x0 = this.scene.scale.width - 8 - w;

    this.g.fillStyle(0x08100c, 0.94); this.g.fillRoundedRect(x0, TOP, w, h, 8);
    this.g.lineStyle(2, 0x6aff9a, 0.8); this.g.strokeRoundedRect(x0, TOP, w, h, 8);
    this.g.lineStyle(1, 0x6aff9a, 0.35); this.g.lineBetween(x0 + PAD * 1.5 + ISLE_W, TOP + PAD, x0 + PAD * 1.5 + ISLE_W, TOP + h - PAD);

    this.isles.forEach((isle, i) => {
      const on = isle.id === this.isle;
      this.row(x0 + PAD, TOP + PAD + i * ROW, ISLE_W, isle.name, on ? '#ffffff' : '#9dc8a8', on, () => {
        this.isle = isle.id;
        Sfx.play('ui-hover');
        this.render();
      });
    });
    areas.forEach((a, i) => {
      const col = Math.floor(i / perCol), r = i % perCol;
      const cur = a.id === this.here;
      this.row(x0 + PAD * 2 + ISLE_W + col * AREA_W, TOP + PAD + r * ROW, AREA_W, cur ? `● ${a.name}` : a.name, cur ? '#ffe2a8' : '#e8f4ea', false, () => {
        if (cur) { this.close(); return; }
        Sfx.play('teleport');
        this.close();
        this.go(a.id);
      });
    });
  }

  private row(x: number, y: number, w: number, label: string, color: string, bold: boolean, pick: () => void): void {
    const t = this.scene.add.text(x, y + 2, label, {
      fontFamily: FONT_UI, fontSize: '12px', color, fontStyle: bold ? 'bold' : 'normal', fixedWidth: w - 4,
    }).setScrollFactor(0).setDepth(this.depth + 1).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setBackgroundColor('#1e3a28'));
    t.on('pointerout', () => t.setBackgroundColor('rgba(0,0,0,0)'));
    t.on('pointerdown', pick);
    this.rows.push(t);
  }
}
