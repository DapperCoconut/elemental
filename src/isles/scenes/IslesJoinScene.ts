import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO } from '../../ui';
import { Sfx } from '../../audio';
import { Net, type NetStatus } from '../../network/NetworkManager';
import * as Save from '../IslesSave';
import { Coop } from '../net/IslesCoop';

/**
 * Join a friend's Ten Isles by room code. You go as the voyage you picked on the slot screen — its
 * element, genes, charms and pockets — into *their* world, and take home the coins and orbs you earn.
 */
export class IslesJoinScene extends Phaser.Scene {
  private code = '';
  private note = '';
  private noteColor = '#c8a888';
  private waiting = false;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private onStatus: ((s: NetStatus, detail?: string) => void) | null = null;

  constructor() { super({ key: 'IslesJoinScene' }); }

  create(): void {
    this.code = '';
    this.note = 'Ask your friend for the code at the top left of their screen (they open a room from the ESC menu).';
    this.noteColor = '#c8a888';
    this.waiting = false;
    if (!Save.hasActive()) { this.scene.start('IslesSlotScene'); return; }
    const W = this.scale.width, H = this.scale.height;
    const g = this.add.graphics();
    g.fillStyle(0x0a0812, 1); g.fillRect(0, 0, W, H);
    for (let k = 10; k >= 1; k--) { g.fillStyle(0x3a8ad8, 0.014); g.fillCircle(W / 2, H * 0.42, 40 + k * 36); }
    g.fillStyle(0x0e1424, 1); g.fillRect(0, H * 0.66, W, H * 0.34);

    this.onStatus = (status, detail) => {
      if (status === 'connected') { this.say('Found them. Asking for their world…', '#9dd8ff'); Coop.hello(); }
      else if (status === 'joining') this.say('Knocking…', '#c8a888');
      else if (status === 'error') { this.waiting = false; this.say(detail ?? 'Could not connect.', '#ff8a7a'); Sfx.play('ui-denied'); }
    };
    Net.onStatus(this.onStatus);
    Coop.world = {
      onWorld: (area) => { Sfx.play('unlock'); this.scene.start('IsleWorldScene', { area, note: `You have joined ${Coop.nameOf(0)}'s world.` }); },
      onLeft: (why) => { this.waiting = false; this.say(why, '#ff8a7a'); },
    };
    this.events.once('shutdown', () => {
      Coop.world = null;
      if (this.onStatus) Net.offStatus(this.onStatus);
      this.onStatus = null;
      this.input.keyboard?.off('keydown', this.onKey, this);
    });
    this.input.keyboard?.on('keydown', this.onKey, this);
    this.render();
  }

  private onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') { Coop.leave(); Sfx.play('ui-back'); this.scene.start('IslesSlotScene'); return; }
    if (this.waiting) return;
    if (ev.key === 'Backspace') { this.code = this.code.slice(0, -1); this.render(); return; }
    if (ev.key === 'Enter') { this.go(); return; }
    if (/^[a-zA-Z0-9]$/.test(ev.key) && this.code.length < 4) {
      this.code += ev.key.toUpperCase();
      Sfx.play('ui-hover');
      this.render();
      if (this.code.length === 4) this.go();
    }
  }

  private go(): void {
    if (this.code.length !== 4) { this.say('A room code is four characters.', '#ff8a7a'); return; }
    this.waiting = true;
    this.say('Looking for the room…', '#c8a888');
    Coop.join(this.code);
  }

  private say(s: string, color: string): void { this.note = s; this.noteColor = color; this.render(); }

  private render(): void {
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    const W = this.scale.width;
    const t = (x: number, y: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle) => { const o = this.add.text(x, y, s, st).setOrigin(0.5); this.dyn.push(o); return o; };
    const s = Save.S();
    t(W / 2, 90, 'JOIN A FRIEND', { fontFamily: FONT_DISPLAY, fontSize: '40px', color: '#bfe6ff', stroke: '#06101c', strokeThickness: 8 });
    t(W / 2, 140, `Going as ${s.name} — ${s.element.toUpperCase()}. Their world, your pockets.`, { fontFamily: FONT_UI, fontSize: '16px', color: '#c8d8e8', stroke: '#000', strokeThickness: 3 });
    const g = this.add.graphics();
    this.dyn.push(g);
    for (let i = 0; i < 4; i++) {
      const x = W / 2 - 129 + i * 86, y = 250;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 32 + 4, y - 40 + 6, 64, 80, 10);
      g.fillStyle(0x12202e, 1); g.fillRoundedRect(x - 32, y - 40, 64, 80, 10);
      g.lineStyle(i === this.code.length && !this.waiting ? 3 : 1.5, i === this.code.length && !this.waiting ? 0x7ad8ff : 0x3a5a78, 1); g.strokeRoundedRect(x - 32, y - 40, 64, 80, 10);
      t(x, y, this.code[i] ?? '', { fontFamily: FONT_MONO, fontSize: '44px', color: '#ffffff' });
    }
    t(W / 2, 350, this.note, { fontFamily: FONT_UI, fontSize: '15px', color: this.noteColor, stroke: '#000', strokeThickness: 3, wordWrap: { width: 640 }, align: 'center' });
    t(W / 2, 560, this.waiting ? 'ESC cancel' : 'Type the code · ENTER join · ESC back', { fontFamily: FONT_UI, fontSize: '14px', color: '#8aa0b8', stroke: '#000', strokeThickness: 3 });
  }
}
