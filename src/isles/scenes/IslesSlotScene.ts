import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO, hex } from '../../ui';
import { Music, Sfx } from '../../audio';
import { allSelectableElements, ElementDef } from '../../data/ElementRoster';
import { TownWalker } from '../../campaign/town/TownWalker';
import * as Save from '../IslesSave';
import { getArea, ISLES } from '../IslesRegistry';

/**
 * The Ten Isles' front door: three save slots over a moonlit sea, and — for an empty slot — the
 * choice of which element walks ashore. The element can be changed later from the bag; this only
 * picks who you arrive as.
 */

type Mode = 'slots' | 'pick' | 'confirmDelete';

export class IslesSlotScene extends Phaser.Scene {
  private mode: Mode = 'slots';
  private sel = 0;
  private pickSel = 0;
  private pickScroll = 0;
  private elements: ElementDef[] = [];
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private preview: TownWalker | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() { super({ key: 'IslesSlotScene' }); }

  create(): void {
    Music.play('campaign');
    this.mode = 'slots';
    this.sel = Save.activeIndex();
    this.elements = allSelectableElements().filter((e) => e.id !== 'quantum');
    this.bg = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,ESC,X,DELETE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.render();
  }

  update(time: number, delta: number): void {
    this.drawBackdrop(time / 1000);
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    const up = JD(k.W) || JD(k.UP), down = JD(k.S) || JD(k.DOWN);
    const go = JD(k.E) || JD(k.SPACE) || JD(k.ENTER);
    const back = JD(k.ESC);
    if (this.mode === 'slots') {
      if (up) { this.sel = (this.sel + 2) % 3; Sfx.play('ui-hover'); this.render(); }
      if (down) { this.sel = (this.sel + 1) % 3; Sfx.play('ui-hover'); this.render(); }
      if (go) this.choose(this.sel);
      if ((JD(k.X) || JD(k.DELETE)) && Save.slots()[this.sel]) { this.mode = 'confirmDelete'; this.render(); }
      if (back) this.scene.start('TitleScene');
    } else if (this.mode === 'pick') {
      const n = this.elements.length;
      if (up) { this.pickSel = (this.pickSel - 1 + n) % n; this.render(); }
      if (down) { this.pickSel = (this.pickSel + 1) % n; this.render(); }
      if (go) this.create_(this.sel, this.elements[this.pickSel].id);
      if (back) { this.mode = 'slots'; this.render(); }
      if (this.preview) this.preview.update(delta, 700, 400, false, Math.PI / 2 + Math.sin(time / 900) * 0.6);
    } else if (this.mode === 'confirmDelete') {
      if (JD(k.E) || JD(k.ENTER)) { Save.deleteSlot(this.sel); Sfx.play('ui-back'); this.mode = 'slots'; this.render(); }
      if (back || JD(k.SPACE)) { this.mode = 'slots'; this.render(); }
    }
  }

  private choose(i: number): void {
    this.sel = i;
    const s = Save.slots()[i];
    Sfx.play('ui-click');
    if (s) {
      Save.setActive(i);
      this.scene.start('IsleWorldScene', {});
    } else {
      this.mode = 'pick';
      this.pickSel = 0;
      this.pickScroll = 0;
      this.render();
    }
  }

  private create_(i: number, element: string): void {
    const s = Save.createSlot(i, `Wanderer ${i + 1}`, element);
    const port = getArea('emberport');
    if (port) s.pos = { ...port.spawn };
    Save.persist();
    Sfx.play('unlock');
    this.scene.start('IsleWorldScene', {});
  }

  private drawBackdrop(t: number): void {
    const W = this.scale.width, H = this.scale.height;
    const g = this.bg;
    g.clear();
    g.fillStyle(0x0a0812, 1); g.fillRect(0, 0, W, H);
    // Sky glow from the volcano.
    for (let k = 12; k >= 1; k--) { g.fillStyle(0xff5a1a, 0.012); g.fillCircle(W * 0.72, H * 0.55, 30 + k * 30); }
    // Sea
    g.fillStyle(0x0e1424, 1); g.fillRect(0, H * 0.6, W, H * 0.4);
    for (let i = 0; i < 18; i++) {
      const y = H * 0.62 + i * 14;
      g.lineStyle(1.5, 0x2a3a5a, 0.5 - i * 0.02);
      g.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const yy = y + Math.sin(x * 0.02 + t * 1.2 + i) * 3;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.strokePath();
    }
    // Brandmark silhouette with its volcano.
    g.fillStyle(0x140c0c, 1);
    g.fillTriangle(W * 0.48, H * 0.62, W * 0.98, H * 0.62, W * 0.72, H * 0.3);
    g.fillStyle(0x1a0e0c, 1);
    g.fillTriangle(W * 0.55, H * 0.62, W * 0.9, H * 0.62, W * 0.74, H * 0.4);
    g.fillStyle(0xff6a1a, 0.7 + Math.sin(t * 2) * 0.2); g.fillEllipse(W * 0.72, H * 0.31, 26, 6);
    for (let i = 0; i < 12; i++) {
      const k = ((t * 0.3 + i / 12) % 1);
      g.fillStyle(0xff8a3a, (1 - k) * 0.7); g.fillCircle(W * 0.72 + Math.sin(i * 7 + t) * 18 * k, H * 0.31 - k * 120, 2);
    }
    // The Pinnacle far off.
    g.fillStyle(0x08060c, 1); g.fillTriangle(W * 0.06, H * 0.62, W * 0.16, H * 0.62, W * 0.11, H * 0.2);
    g.fillStyle(0x7a5cff, 0.4 + Math.sin(t * 1.3) * 0.2); g.fillCircle(W * 0.11, H * 0.2, 3);
  }

  private clear(): void {
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    this.preview?.destroy();
    this.preview = null;
  }

  private text(x: number, y: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, st);
    this.dyn.push(t);
    return t;
  }

  private render(): void {
    this.clear();
    const W = this.scale.width;
    this.text(W / 2, 46, 'THE TEN ISLES', { fontFamily: FONT_DISPLAY, fontSize: '44px', color: '#ffd8a0', stroke: '#1a0804', strokeThickness: 8 }).setOrigin(0.5);
    this.text(W / 2, 92, 'Ten tyrants. Sixty courts. One sea.', { fontFamily: FONT_UI, fontSize: '16px', color: '#c8a888', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    if (this.mode === 'pick') { this.renderPick(); return; }

    const slots = Save.slots();
    slots.forEach((s, i) => {
      const y = 150 + i * 120;
      const on = i === this.sel;
      const g = this.add.graphics();
      this.dyn.push(g);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(W / 2 - 300 + 6, y + 8, 600, 100, 14);
      g.fillStyle(on ? 0x2e1c10 : 0x1a120c, 0.95); g.fillRoundedRect(W / 2 - 300, y, 600, 100, 14);
      g.lineStyle(on ? 3 : 1, on ? 0xffa050 : 0x5a3a24, 1); g.strokeRoundedRect(W / 2 - 300, y, 600, 100, 14);
      const zone = this.add.zone(W / 2 - 300, y, 600, 100).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.choose(i));
      zone.on('pointerover', () => { if (this.sel !== i) { this.sel = i; this.render(); } });
      this.dyn.push(zone);
      if (!s) {
        this.text(W / 2, y + 50, '+  NEW VOYAGE', { fontFamily: FONT_DISPLAY, fontSize: '22px', color: on ? '#ffd8a0' : '#8a6a4a' }).setOrigin(0.5);
        return;
      }
      const isle = ISLES.find((x) => x.port === s.area || x.courts.includes(s.area));
      const area = getArea(s.area);
      this.text(W / 2 - 276, y + 16, `${s.name}`, { fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#ffe2b0' });
      this.text(W / 2 - 276, y + 46, `${s.element.toUpperCase()}  ·  ${area?.name ?? s.area}${isle ? `, ${isle.name}` : ''}`, { fontFamily: FONT_UI, fontSize: '15px', color: '#d8b888' });
      this.text(W / 2 - 276, y + 70, `Princes ${s.princes.length}/60   Monarchs ${s.monarchs.length}/10   Quests ${Object.values(s.quests).filter((q) => q.done).length}`, { fontFamily: FONT_UI, fontSize: '13px', color: '#a88868' });
      this.text(W / 2 + 276, y + 18, `🪙 ${s.coins}\n🔮 ${s.orbs}\n🗝️ ${s.keys}`, { fontFamily: FONT_MONO, fontSize: '14px', color: '#ffd27a', align: 'right' }).setOrigin(1, 0);
    });
    const help = this.mode === 'confirmDelete'
      ? `Delete ${slots[this.sel]?.name ?? 'this voyage'} forever?  E = delete · ESC = keep`
      : 'W/S choose · E start · X delete · ESC back';
    this.text(W / 2, 540, help, { fontFamily: FONT_UI, fontSize: '15px', color: this.mode === 'confirmDelete' ? '#ff8a7a' : '#b89878', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
  }

  private renderPick(): void {
    const W = this.scale.width;
    this.text(W / 2, 130, 'Who walks ashore at Emberport?', { fontFamily: FONT_DISPLAY, fontSize: '20px', color: '#ffe2b0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    const rows = 11;
    if (this.pickSel < this.pickScroll) this.pickScroll = this.pickSel;
    if (this.pickSel >= this.pickScroll + rows) this.pickScroll = this.pickSel - rows + 1;
    const g = this.add.graphics();
    this.dyn.push(g);
    g.fillStyle(0x000000, 0.55); g.fillRoundedRect(150, 160, 330, rows * 34 + 20, 12);
    this.elements.slice(this.pickScroll, this.pickScroll + rows).forEach((e, k) => {
      const i = k + this.pickScroll;
      const y = 170 + k * 34;
      const on = i === this.pickSel;
      if (on) { g.fillStyle(e.color, 0.3); g.fillRoundedRect(158, y, 314, 30, 8); g.lineStyle(2, e.color, 1); g.strokeRoundedRect(158, y, 314, 30, 8); }
      g.fillStyle(e.color, 1); g.fillCircle(178, y + 15, 7);
      const t = this.text(196, y + 6, e.name, { fontFamily: FONT_UI, fontSize: '16px', color: on ? '#ffffff' : '#c8b898' });
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.pickSel === i) this.create_(this.sel, e.id); else { this.pickSel = i; this.render(); } });
    });
    const e = this.elements[this.pickSel];
    g.fillStyle(0x000000, 0.45); g.fillRoundedRect(560, 200, 280, 300, 14);
    g.fillStyle(e.color, 0.12); g.fillCircle(700, 380, 90);
    this.preview = new TownWalker(this, e.id, 700, 400);
    this.preview.container.setScale(1.3);
    this.text(700, 230, e.name.toUpperCase(), { fontFamily: FONT_DISPLAY, fontSize: '24px', color: hex(e.color), stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.text(700, 470, 'You can change element later from your bag.', { fontFamily: FONT_UI, fontSize: '12px', color: '#a88868', wordWrap: { width: 250 }, align: 'center' }).setOrigin(0.5);
    this.text(W / 2, 580, 'W/S choose · E begin · ESC back', { fontFamily: FONT_UI, fontSize: '15px', color: '#b89878', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
  }
}
