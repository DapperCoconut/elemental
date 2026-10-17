import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { DREAM_BOONS, dreamSummary } from '../../data/DreamBuffs';
import { findElementDef } from '../../data/ElementRoster';
import { DRM, DreamColorFn, crescentMoon, star } from './DreamVisuals';
import { FONT_DISPLAY, FONT_UI } from '../../ui/Theme';

/**
 * Lifelong Dream's element picker: the screen-space menu that opens when the bound key is
 * pressed, and closes when a choice is made.
 *
 * Forty-eight rows and a search box. It is drawn rather than built out of `src/ui` on purpose —
 * everything in this file lives at a fixed depth above the arena, must survive a match restart
 * being torn down underneath it, and is painted in Dream's own palette through the owner's skin
 * mapper like every other thing the element draws.
 *
 * **Typing and walking are the same keys**, so the picker tells DreamKit to hold the player
 * still while it is open (`DreamKit.isPlayerLocked`). The fight does not stop — that is the
 * cost of stopping to dream in the middle of one — but the dreamer is untouchable while the
 * menu is up, and the menu picks at random on its own if it is left open too long.
 */

/** How long the picker will wait before choosing for you. */
export const PICKER_TIMEOUT_MS = 12000;

const ROW_H = 26;
const ROWS_VISIBLE = 11;
const PANEL_W = 560;

interface Row {
  id: string;
  name: string;
  emoji: string;
  color: number;
  summary: string;
}

export class DreamElementPicker {
  private scene: Phaser.Scene;
  private tint: DreamColorFn;
  private onPick: (elementId: string) => void;

  private gfx: Phaser.GameObjects.Graphics | null = null;
  private title: Phaser.GameObjects.Text | null = null;
  private queryText: Phaser.GameObjects.Text | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private rowSubs: Phaser.GameObjects.Text[] = [];
  private hits: Phaser.GameObjects.Rectangle[] = [];

  private all: Row[] = [];
  private filtered: Row[] = [];
  private query = '';
  private scroll = 0;
  private hover = -1;
  private openedAt = 0;
  private vizT = 0;
  private open = false;

  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private wheelHandler: ((...args: unknown[]) => void) | null = null;

  constructor(scene: Phaser.Scene, tint: DreamColorFn, onPick: (elementId: string) => void) {
    this.scene = scene;
    this.tint = tint;
    this.onPick = onPick;
    // Built once: the roster does not change inside a match, and rebuilding it per open would
    // re-resolve forty-eight element defs for nothing.
    for (const id of Object.keys(DREAM_BOONS)) {
      const def = findElementDef(id);
      this.all.push({
        id,
        name: def?.name ?? id,
        emoji: def?.emoji ?? '❔',
        color: def?.color ?? DRM.pale,
        summary: dreamSummary(id),
      });
    }
    this.all.sort((a, b) => a.name.localeCompare(b.name));
  }

  isOpen(): boolean { return this.open; }

  /** A random element from the table — the top row, and what a timeout picks. */
  randomId(): string {
    return this.all[Math.floor(Math.random() * this.all.length)].id;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.query = '';
    this.scroll = 0;
    this.hover = -1;
    this.openedAt = this.scene.time.now;
    this.refilter();
    this.build();

    // Raw DOM rather than Phaser's keyboard, because the arena already owns W/A/S/D as movement
    // keys and a `keydown-W` handler would fight it. The picker holds the player still while it
    // is up, so the same physical key is unambiguously a letter for as long as this is bound.
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.open) return;
      if (e.key === 'Escape') { this.choose(this.randomId()); return; }
      if (e.key === 'Enter') {
        const first = this.filtered[0];
        this.choose(first ? first.id : this.randomId());
        return;
      }
      if (e.key === 'Backspace') {
        this.query = this.query.slice(0, -1);
        this.scroll = 0;
        this.refilter();
        this.paint();
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
        this.query = (this.query + e.key).slice(0, 22);
        this.scroll = 0;
        this.refilter();
        this.paint();
        Sfx.play('ui-type', { volume: 0.35 });
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    this.wheelHandler = (_p: unknown, _o: unknown, _dx: unknown, dy: unknown) => {
      if (!this.open) return;
      const max = Math.max(0, this.filtered.length + 1 - ROWS_VISIBLE);
      this.scroll = Phaser.Math.Clamp(this.scroll + ((dy as number) > 0 ? 1 : -1), 0, max);
      this.paint();
    };
    this.scene.input.on('wheel', this.wheelHandler);

    Sfx.play('ui-open', { volume: 0.6 });
  }

  /** Closes without choosing. Only `DreamKit.reset()` and a death should use this. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
    if (this.wheelHandler) this.scene.input.off('wheel', this.wheelHandler);
    this.wheelHandler = null;
    this.destroyObjects();
  }

  private choose(id: string): void {
    if (!this.open) return;
    Sfx.play('ui-equip', { volume: 0.7 });
    this.close();
    this.onPick(id);
  }

  private refilter(): void {
    const q = this.query.trim().toLowerCase();
    this.filtered = q
      ? this.all.filter((r) => r.name.toLowerCase().includes(q) || r.id.includes(q))
      : [...this.all];
  }

  /** The picker gives up and dreams of something at random rather than hanging the match. */
  update(delta: number): void {
    if (!this.open) return;
    this.vizT += delta / 1000;
    if (this.scene.time.now - this.openedAt >= PICKER_TIMEOUT_MS) {
      this.choose(this.randomId());
      return;
    }
    this.paint();
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private get geom(): { x: number; y: number; w: number; h: number } {
    const w = PANEL_W;
    const h = 96 + ROWS_VISIBLE * ROW_H;
    const cam = this.scene.scale;
    return { x: (cam.width - w) / 2, y: (cam.height - h) / 2 - 10, w, h };
  }

  private build(): void {
    const { x, y, w } = this.geom;
    this.gfx = this.scene.add.graphics().setDepth(60).setScrollFactor(0);

    this.title = this.scene.add.text(x + w / 2, y + 20, '🌠  WHAT DO YOU DREAM OF?', {
      fontSize: '15px',
      fontFamily: FONT_DISPLAY,
      color: '#d8e2ff', stroke: '#05040f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(62).setScrollFactor(0);

    this.queryText = this.scene.add.text(x + 22, y + 46, '', {
      fontSize: '12px',
      fontFamily: FONT_UI,
      color: '#ffd98a',
    }).setOrigin(0, 0.5).setDepth(62).setScrollFactor(0);

    this.hint = this.scene.add.text(x + w / 2, y + this.geom.h - 14,
      'type to search  ·  ENTER takes the top row  ·  ESC dreams at random', {
        fontSize: '9px',
        fontFamily: FONT_UI,
        color: '#6b6b88',
      }).setOrigin(0.5).setDepth(62).setScrollFactor(0);

    for (let i = 0; i < ROWS_VISIBLE; i++) {
      const ry = y + 74 + i * ROW_H + ROW_H / 2;
      this.rowTexts.push(this.scene.add.text(x + 46, ry - 5, '', {
        fontSize: '12px',
        fontFamily: FONT_DISPLAY,
        color: '#d8e2ff',
      }).setOrigin(0, 0.5).setDepth(62).setScrollFactor(0));
      this.rowSubs.push(this.scene.add.text(x + 46, ry + 7, '', {
        fontSize: '8px',
        fontFamily: FONT_UI,
        color: '#7b83a0',
      }).setOrigin(0, 0.5).setDepth(62).setScrollFactor(0));

      const hit = this.scene.add.rectangle(x + w / 2, ry, w - 20, ROW_H - 2, 0xffffff, 0)
        .setDepth(63).setScrollFactor(0).setInteractive({ useHandCursor: true });
      const idx = i;
      hit.on('pointerover', () => { this.hover = idx; });
      hit.on('pointerout', () => { if (this.hover === idx) this.hover = -1; });
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        const row = this.rowAt(idx);
        if (row === 'random') this.choose(this.randomId());
        else if (row) this.choose(row.id);
      });
      this.hits.push(hit);
    }
    this.paint();
  }

  /** What is on visible line `i`: the random row, an element, or nothing. */
  private rowAt(i: number): Row | 'random' | null {
    const abs = this.scroll + i;
    if (abs === 0) return 'random';
    return this.filtered[abs - 1] ?? null;
  }

  private paint(): void {
    const g = this.gfx;
    if (!g) return;
    const { x, y, w, h } = this.geom;
    g.clear();

    // The room behind it goes dark, but not black — the fight is still happening out there.
    g.fillStyle(0x05040f, 0.72);
    g.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);

    // The panel: a piece of night sky — banded from deep violet at the top to near-black at
    // the bottom — with a silver double frame, a waxing moon in the corner and a bank of
    // cloud along the foot.
    const t = this.vizT;
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x + 4, y + 6, w, h, 12);
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(this.tint(DRM.deep)),
        Phaser.Display.Color.IntegerToColor(this.tint(DRM.night)), bands - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 0.98);
      const by = y + (h * i) / bands;
      if (i === 0) g.fillRoundedRect(x, by, w, h / bands + 12, { tl: 12, tr: 12, bl: 0, br: 0 });
      else if (i === bands - 1) g.fillRoundedRect(x, by, w, h / bands, { tl: 0, tr: 0, bl: 12, br: 12 });
      else g.fillRect(x, by, w, h / bands + 1);
    }
    // Fixed starfield, twinkling out of phase.
    for (let i = 0; i < 42; i++) {
      const sx = x + 10 + ((i * 97) % (w - 20));
      const sy = y + 8 + ((i * 61) % (h - 16));
      const tw = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.1));
      g.fillStyle(this.tint(i % 5 === 0 ? DRM.sky : DRM.star), tw);
      g.fillCircle(sx, sy, i % 7 === 0 ? 1.2 : 0.7);
    }
    // The moon, up in the top-left corner behind the title.
    crescentMoon(g, this.tint, x + 34, y + 22, 13, 0.25 + 0.1 * Math.sin(t * 0.6), DRM.star, 0.95, DRM.deep);
    // Cloud bank along the bottom edge.
    for (let i = 0; i < 12; i++) {
      const cx = x + 20 + i * ((w - 40) / 11);
      const r = 12 + ((i * 5) % 3) * 4 + Math.sin(t * 0.8 + i) * 1.2;
      g.fillStyle(this.tint(DRM.violet), 0.22);
      g.fillCircle(cx, y + h - 4, r);
      g.fillStyle(this.tint(DRM.pale), 0.06);
      g.fillCircle(cx - 2, y + h - 8, r * 0.7);
    }
    g.lineStyle(2.5, this.tint(DRM.violet), 0.95);
    g.strokeRoundedRect(x, y, w, h, 12);
    g.lineStyle(1, this.tint(DRM.pale), 0.45);
    g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 9);
    // A star pinned at every corner, turning slowly.
    for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
      star(g, this.tint, cx, cy, 6, 0.95, DRM.star, t * 0.7);
    }

    // The search box: a recessed well with a soft violet rim.
    g.fillStyle(this.tint(DRM.night), 0.95);
    g.fillRoundedRect(x + 14, y + 34, w - 28, 24, 12);
    g.fillStyle(this.tint(DRM.deep), 0.6);
    g.fillRoundedRect(x + 15, y + 46, w - 30, 11, { tl: 0, tr: 0, bl: 11, br: 11 });
    g.lineStyle(1.5, this.tint(this.query ? DRM.sky : DRM.purple), 0.75);
    g.strokeRoundedRect(x + 14, y + 34, w - 28, 24, 12);
    const caret = Math.floor(this.vizT * 2) % 2 === 0 ? '▏' : ' ';
    this.queryText?.setText(this.query ? `${this.query}${caret}` : `search…${caret}`);
    this.queryText?.setColor(this.query ? '#ffd98a' : '#4a4a63');

    // The countdown to a random pick, as a hairline draining across the top of the panel.
    const left = 1 - Phaser.Math.Clamp(
      (this.scene.time.now - this.openedAt) / PICKER_TIMEOUT_MS, 0, 1);
    // A silver track under the search box, with a little moon riding the head of it.
    const trackX = x + 24, trackW = w - 48, trackY = y + 64;
    g.fillStyle(this.tint(DRM.night), 0.9);
    g.fillRoundedRect(trackX, trackY - 1.5, trackW, 3, 1.5);
    g.fillStyle(this.tint(left < 0.3 ? DRM.dread : DRM.purple), 0.9);
    g.fillRoundedRect(trackX, trackY - 1.5, Math.max(3, trackW * left), 3, 1.5);
    crescentMoon(g, this.tint, trackX + trackW * left, trackY, 4,
      left, left < 0.3 ? DRM.dread : DRM.star, 1, DRM.night);

    for (let i = 0; i < ROWS_VISIBLE; i++) {
      const ry = y + 74 + i * ROW_H + ROW_H / 2;
      const row = this.rowAt(i);
      const on = this.hover === i && row !== null;
      const lbl = this.rowTexts[i];
      const sub = this.rowSubs[i];
      this.hits[i].setVisible(row !== null);
      if (!row) { lbl.setText(''); sub.setText(''); continue; }

      const isRandom = row === 'random';
      const color = isRandom ? DRM.wish : (row as Row).color;
      if (!on && i % 2 === 1) {
        g.fillStyle(this.tint(DRM.violet), 0.08);
        g.fillRoundedRect(x + 10, ry - ROW_H / 2 + 1, w - 20, ROW_H - 2, 4);
      }
      if (on) {
        g.fillStyle(this.tint(color), 0.18);
        g.fillRoundedRect(x + 10, ry - ROW_H / 2 + 1, w - 20, ROW_H - 2, 4);
        g.lineStyle(1, this.tint(color), 0.7);
        g.strokeRoundedRect(x + 10, ry - ROW_H / 2 + 1, w - 20, ROW_H - 2, 4);
      }
      // The element's own colour as a little moon on the left of the row, waxing full on hover.
      g.fillStyle(this.tint(DRM.night), 1);
      g.fillCircle(x + 28, ry, 9);
      g.lineStyle(1, this.tint(color), on ? 0.9 : 0.45);
      g.strokeCircle(x + 28, ry, 9);
      crescentMoon(g, this.tint, x + 28, ry, 6.5, on ? 1 : 0.55, color, on ? 1 : 0.8, DRM.night);
      if (on) star(g, this.tint, x + 37, ry - 7, 3, 0.95, DRM.star, t * 2);

      lbl.setText(isRandom ? '🎲  RANDOM' : `${(row as Row).emoji}  ${(row as Row).name.toUpperCase()}`);
      lbl.setColor(on ? '#ffffff' : isRandom ? '#ffd98a' : '#d8e2ff');
      sub.setText(isRandom
        ? 'let the dream choose — one of the forty-eight, and you find out when it lands'
        : (row as Row).summary);
      sub.setColor(on ? '#a8b0c8' : '#6b7285');
    }

    const max = Math.max(0, this.filtered.length + 1 - ROWS_VISIBLE);
    if (max > 0) {
      const trackH = ROWS_VISIBLE * ROW_H - 8;
      const knob = Math.max(18, trackH * (ROWS_VISIBLE / (this.filtered.length + 1)));
      g.fillStyle(this.tint(DRM.deep), 0.8);
      g.fillRoundedRect(x + w - 12, y + 78, 4, trackH, 2);
      g.fillStyle(this.tint(DRM.purple), 0.9);
      g.fillRoundedRect(x + w - 12, y + 78 + (trackH - knob) * (this.scroll / max), 4, knob, 2);
    }

    this.title?.setText(this.query
      ? `🌠  ${this.filtered.length} MATCH${this.filtered.length === 1 ? '' : 'ES'}`
      : '🌠  WHAT DO YOU DREAM OF?');
  }

  private destroyObjects(): void {
    this.gfx?.destroy(); this.gfx = null;
    this.title?.destroy(); this.title = null;
    this.queryText?.destroy(); this.queryText = null;
    this.hint?.destroy(); this.hint = null;
    for (const t of this.rowTexts) t.destroy();
    for (const t of this.rowSubs) t.destroy();
    for (const h of this.hits) h.destroy();
    this.rowTexts = [];
    this.rowSubs = [];
    this.hits = [];
  }

  destroy(): void {
    this.close();
  }
}
