import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Music, Sfx } from '../../audio';
import type { TrackName } from '../../audio';
import { findElementDef } from '../../data/ElementRoster';
import * as Save from '../IslesSave';
import { getCutscene } from '../IslesRegistry';
import { hashStr, mulberry } from '../art/IsleArt';
import type { CutsceneDef, CutsceneKit, CutsceneShot } from '../IslesTypes';

/**
 * Plays a `CutsceneDef`: painted shots under cinema bars, subtitles typed out one line at a time,
 * timed cues (sound, shake, flash), then on to whatever scene comes `next`.
 *
 * SPACE / E / click hurries the line on screen; ESC twice skips the whole thing. A shot whose
 * painter throws ends the cutscene rather than freezing it — a cinematic must never be the thing
 * that stops a save from going on.
 */

const BAR = 62;
const TYPE_CPS = 46;
const hold = (text: string) => 1250 + text.length * 34;

interface Next { key: string; data?: object }

/** Start a cutscene and then `next`. If the id is unknown, goes straight to `next`. */
export function playCutscene(scene: Phaser.Scene, id: string, next: Next): void {
  if (!getCutscene(id)) { scene.scene.start(next.key, next.data); return; }
  scene.scene.start('IslesCutsceneScene', { id, next });
}

export class IslesCutsceneScene extends Phaser.Scene {
  private def!: CutsceneDef;
  private next!: Next;
  private g!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Text[] = [];
  private poolAt = 0;
  private who!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  private shotIdx = 0;
  private shotAt = 0;
  private startAt = 0;
  private lineIdx = -1;
  private lineAt = 0;
  private cueIdx = 0;
  private skipArmedUntil = 0;
  private leaving = false;
  private hero = { element: 'fire', color: 0xff6a2a };

  constructor() { super({ key: 'IslesCutsceneScene' }); }

  init(data: { id: string; next: Next }): void {
    this.def = getCutscene(data.id) ?? { id: data.id, shots: [] };
    this.next = data.next;
    this.shotIdx = 0;
    this.lineIdx = -1;
    this.cueIdx = 0;
    this.leaving = false;
    this.skipArmedUntil = 0;
    this.pool = [];
  }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor(0x000000);
    if (this.def.music) Music.play(this.def.music as TrackName); else Music.stop(0.8);
    if (Save.hasActive()) {
      const el = Save.S().element;
      this.hero = { element: el, color: findElementDef(el)?.color ?? 0xff6a2a };
    }
    this.g = this.add.graphics().setDepth(0);
    this.over = this.add.graphics().setDepth(50);
    this.who = this.add.text(W / 2, H - BAR + 6, '', {
      fontFamily: FONT_DISPLAY, fontSize: '13px', color: '#c9b0ff', letterSpacing: 3,
    }).setOrigin(0.5, 0).setDepth(60);
    this.sub = this.add.text(W / 2, H - BAR + 24, '', {
      fontFamily: FONT_UI, fontSize: '17px', color: '#f2ecff', align: 'center', wordWrap: { width: W - 180 },
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(60);
    this.hint = this.add.text(W - 16, 10, '', { fontFamily: FONT_UI, fontSize: '11px', color: '#8a80a0' })
      .setOrigin(1, 0).setDepth(60);

    const hurry = () => this.hurry();
    this.input.keyboard?.on('keydown-SPACE', hurry);
    this.input.keyboard?.on('keydown-E', hurry);
    this.input.keyboard?.on('keydown-ENTER', hurry);
    this.input.on('pointerdown', hurry);
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.time.now < this.skipArmedUntil) this.finish();
      else this.skipArmedUntil = this.time.now + 2600;
    });
    this.events.once('shutdown', () => { this.input.keyboard?.removeAllListeners(); this.input.removeAllListeners(); });

    this.startAt = this.time.now;
    if (!this.def.shots.length) { this.finish(); return; }
    this.beginShot(0);
  }

  private shot(): CutsceneShot { return this.def.shots[this.shotIdx]; }

  private beginShot(i: number): void {
    this.shotIdx = i;
    this.shotAt = this.time.now;
    this.cueIdx = 0;
    const s = this.shot();
    this.lineIdx = s.lines?.length ? 0 : -1;
    this.lineAt = this.time.now + (s.lines?.length ? 500 : 0);
  }

  /** SPACE / click: finish typing the line, or move to the next one. */
  private hurry(): void {
    if (this.leaving) return;
    const s = this.shot();
    const line = s.lines?.[this.lineIdx];
    if (!line) return;
    const now = this.time.now;
    const typedMs = (line.text.length / TYPE_CPS) * 1000;
    if (now < this.lineAt + typedMs) this.lineAt = now - typedMs;
    else this.nextLine();
  }

  private nextLine(): void {
    const s = this.shot();
    if (this.lineIdx < 0) return;
    this.lineIdx++;
    this.lineAt = this.time.now + 180;
    if (this.lineIdx >= (s.lines?.length ?? 0)) this.lineIdx = 9999;
  }

  private finish(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      Music.play('campaign');
      this.scene.start(this.next.key, this.next.data);
    });
  }

  update(): void {
    if (this.leaving || !this.def.shots.length) return;
    const W = this.scale.width, H = this.scale.height;
    const now = this.time.now;
    const s = this.shot();
    const ms = now - this.shotAt;
    const lines = s.lines ?? [];
    const linesDone = !lines.length || this.lineIdx >= lines.length;

    // Cues.
    const cues = s.cues ?? [];
    while (this.cueIdx < cues.length && cues[this.cueIdx].at <= ms) {
      const c = cues[this.cueIdx++];
      if (c.sfx) Sfx.play(c.sfx);
      if (c.shake) this.cameras.main.shake(c.ms ?? 400, c.shake);
      if (c.flash !== undefined) this.cameras.main.flash(c.ms ?? 350, (c.flash >> 16) & 255, (c.flash >> 8) & 255, c.flash & 255);
    }

    // The picture.
    this.poolAt = 0;
    const seed = hashStr(this.def.id) + this.shotIdx * 977;
    const kit: CutsceneKit = {
      W, H, t: ms / 1000, p: Phaser.Math.Clamp(ms / Math.max(1, s.ms), 0, 1), T: (now - this.startAt) / 1000,
      line: this.lineIdx >= lines.length ? lines.length - 1 : this.lineIdx,
      rng: () => mulberry(seed),
      test: (c) => (Save.hasActive() ? Save.test(c) : false),
      hero: this.hero,
      text: (x, y, str, o = {}) => {
        let t = this.pool[this.poolAt];
        if (!t) { t = this.add.text(0, 0, '', {}).setDepth(40); this.pool.push(t); }
        this.poolAt++;
        t.setVisible(true).setPosition(x, y).setOrigin(o.align ?? 0.5, 0.5).setAlpha(o.alpha ?? 1);
        const size = `${o.size ?? 18}px`;
        const family = o.display === false ? FONT_UI : FONT_DISPLAY;
        const color = o.color ?? '#ffffff';
        if (t.text !== str) t.setText(str);
        if (t.style.fontSize !== size || t.style.fontFamily !== family || t.style.color !== color) {
          t.setStyle({ fontFamily: family, fontSize: size, color, stroke: '#000000', strokeThickness: Math.max(2, (o.size ?? 18) / 8) });
        }
        t.setLetterSpacing(o.spacing ?? 0);
      },
    };
    this.g.clear();
    try {
      s.draw(this.g, kit);
    } catch (e) {
      console.error(`[isles] cutscene ${this.def.id} shot ${this.shotIdx}`, e);
      this.finish();
      return;
    }
    for (let i = this.poolAt; i < this.pool.length; i++) this.pool[i].setVisible(false);

    // Bars, the way in, the subtitle.
    const o = this.over;
    o.clear();
    const enter = s.enter ?? 'fade';
    const inMs = enter === 'white' ? 800 : enter === 'fade' ? (this.shotIdx === 0 ? 900 : 420) : 0;
    if (inMs > 0 && ms < inMs) {
      o.fillStyle(enter === 'white' ? 0xffffff : 0x000000, 1 - ms / inMs);
      o.fillRect(0, 0, W, H);
    }
    if (!s.full) {
      o.fillStyle(0x000000, 1);
      o.fillRect(0, 0, W, BAR);
      o.fillRect(0, H - BAR, W, BAR);
    }

    const line = lines[this.lineIdx];
    if (line && now >= this.lineAt) {
      const n = Math.floor(((now - this.lineAt) / 1000) * TYPE_CPS);
      const shown = line.text.slice(0, n);
      if (this.sub.text !== shown) {
        this.sub.setText(shown);
        if (n <= line.text.length && n % 4 === 0 && shown.length) Sfx.play('ui-click', { volume: 0.1 });
      }
      this.sub.setFontStyle(line.who ? 'normal' : 'italic').setColor(line.who ? '#f2ecff' : (line.color ?? '#d8d0ee'));
      this.who.setText(line.who ? line.who.toUpperCase() : '').setColor(line.color ?? '#c9b0ff');
      this.sub.setY(s.full ? H - 92 : H - BAR + (line.who ? 24 : 16));
      this.who.setY(s.full ? H - 112 : H - BAR + 6);
      if (now >= this.lineAt + (line.text.length / TYPE_CPS) * 1000 + hold(line.text)) this.nextLine();
    } else {
      if (this.sub.text) this.sub.setText('');
      if (this.who.text) this.who.setText('');
    }
    this.hint.setText(now < this.skipArmedUntil ? 'ESC again to skip' : '');

    if (ms >= s.ms && linesDone) {
      if (this.shotIdx + 1 < this.def.shots.length) this.beginShot(this.shotIdx + 1);
      else this.finish();
    }
  }
}
