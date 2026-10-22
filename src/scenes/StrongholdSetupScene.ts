import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { allSelectableElements, ElementDef } from '../data/ElementRoster';
import { getElementProfile } from '../data/ElementProfiles';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addHeaderBar, addPagerButton, addCardPlate, addWell,
  showToast, ElementPortrait, UiButton, drawIcon, fillNotched, strokeNotched, ALL_CORNERS,
} from '../ui';
import { Music, Sfx } from '../audio';
import { TOWER_DEFS } from '../stronghold/StrongholdTowers';
import { BODY_LABEL, ROLE_LABEL } from '../stronghold/StrongholdTypes';
import { STRONGHOLD_DIFFICULTIES, StrongholdDifficultyId, recordKey } from '../stronghold/StrongholdWaves';
import { STRONGHOLD_MAPS, getStrongholdMap } from '../stronghold/StrongholdMap';

export const STRONGHOLD_ACCENT = 0x60a5fa;
export const MAX_TOWER_PICKS = 6;

const CARD_W = 142;
const CARD_H = 136;
const COLS = 6;
const ROWS = 2;
const PAGE = COLS * ROWS;

/**
 * Stronghold loadout: pick a difficulty and up to six elements to bring as towers.
 *
 * Reads the same roster as every other picker (`allSelectableElements`), filtered to the
 * elements that have a tower moveset — which is every element with a character of its own.
 */
export class StrongholdSetupScene extends Phaser.Scene {
  private difficulty: StrongholdDifficultyId = 'normal';
  private mapId = 'kingsroad';
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  private picks: string[] = [];
  private page = 0;
  private gridObjects: Phaser.GameObjects.GameObject[] = [];
  private portraits: ElementPortrait[] = [];
  private loadoutObjects: Phaser.GameObjects.GameObject[] = [];
  private diffButtons: UiButton[] = [];
  private diffDesc: Phaser.GameObjects.Text | null = null;
  private bestText: Phaser.GameObjects.Text | null = null;
  private startBtn: UiButton | null = null;
  private roster: ElementDef[] = [];
  private hintText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'StrongholdSetupScene' });
  }

  init(data?: { picks?: string[]; difficulty?: StrongholdDifficultyId; map?: string }): void {
    this.picks = data?.picks ? [...data.picks] : [];
    this.difficulty = data?.difficulty ?? 'normal';
    this.mapId = getStrongholdMap(data?.map).id;
    this.page = 0;
    this.diffButtons = [];
    this.mapObjects = [];
  }

  create(): void {
    Music.play('menu');
    const { width, height } = this.scale;
    const cx = width / 2;
    addBackdrop(this, { accent: STRONGHOLD_ACCENT, variant: 'lattice', motes: 16 });
    addHeaderBar(this, { title: 'STRONGHOLD', subtitle: 'Pick a map, a difficulty and up to six elements to stand as towers.', accent: STRONGHOLD_ACCENT, iconArt: 'castle' });
    addBackButton(this, () => { Sfx.back(); this.scene.start('TitleScene'); });

    this.roster = allSelectableElements().filter((e) => !!TOWER_DEFS[e.id]);

    this.renderMaps();

    // ── Difficulty ────────────────────────────────────────────────────
    const diffY = 158;
    const bw = 130, gap = 8;
    const startX = cx - ((bw + gap) * STRONGHOLD_DIFFICULTIES.length - gap) / 2 + bw / 2;
    STRONGHOLD_DIFFICULTIES.forEach((d, i) => {
      const btn = addButton(this, {
        x: startX + i * (bw + gap), y: diffY, w: bw, h: 26,
        label: d.label, accent: d.color, fontSize: 13, cut: 8,
        variant: d.id === this.difficulty ? 'solid' : 'ghost',
        onClick: () => { Sfx.click(); this.difficulty = d.id; this.refreshDifficulty(); },
      });
      this.diffButtons.push(btn);
    });
    this.diffDesc = this.add.text(cx, diffY + 22, '', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.bestText = this.add.text(width - 24, diffY, '', {
      fontSize: '11px', fontFamily: FONT_MONO, color: T.gold,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content);
    this.refreshDifficulty();

    // ── Loadout strip + start ─────────────────────────────────────────
    this.startBtn = addButton(this, {
      x: width - 120, y: height - 46, w: 200, h: 46,
      label: 'HOLD THE ROAD', iconArt: 'castle', accent: C.verdant, variant: 'solid', fontSize: 15, cut: 10,
      onClick: () => this.start(),
    });
    this.add.text(24, height - 92, 'YOUR TOWERS', {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content);

    this.hintText = this.add.text(cx, 514, 'Hover a tower to see how it plays.', {
      fontSize: '10px', fontFamily: FONT_UI, color: T.dim, align: 'center', wordWrap: { width: width - 120 },
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.renderGrid();
    this.renderLoadout();

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
  }

  private refreshDifficulty(): void {
    STRONGHOLD_DIFFICULTIES.forEach((d, i) => {
      // Buttons are rebuilt rather than restyled — UiButton has no variant setter.
      const btn = this.diffButtons[i];
      const was = btn.container.getData('variant') as string | undefined;
      const want = d.id === this.difficulty ? 'solid' : 'ghost';
      if (was === want) return;
      btn.container.setData('variant', want);
      const { x, y } = btn.container;
      btn.destroy();
      this.diffButtons[i] = addButton(this, {
        x, y, w: 130, h: 26, label: d.label, accent: d.color, fontSize: 13, cut: 8,
        variant: want as 'solid' | 'ghost',
        onClick: () => { Sfx.click(); this.difficulty = d.id; this.refreshDifficulty(); },
      });
      this.diffButtons[i].container.setData('variant', want);
    });
    const d = STRONGHOLD_DIFFICULTIES.find((x) => x.id === this.difficulty)!;
    this.diffDesc?.setText(d.description).setColor(hex(mix(d.color, 0xffffff, 0.45)));
    const best = PlayerData.getStrongholdBest(recordKey(this.mapId, d.id));
    this.bestText?.setText(best > 0 ? `BEST  WAVE ${best}` : 'NO RECORD YET');
  }

  // ── Maps ──────────────────────────────────────────────────────────

  /** Three map plates across the top, each with a drawn preview of its roads and water. */
  private renderMaps(): void {
    for (const o of this.mapObjects) o.destroy();
    this.mapObjects = [];
    const { width } = this.scale;
    const pw = 250, ph = 58, gap = 12;
    const x0 = width / 2 - ((pw + gap) * STRONGHOLD_MAPS.length - gap) / 2;
    const y = 82;
    STRONGHOLD_MAPS.forEach((m, i) => {
      const x = x0 + i * (pw + gap);
      const on = m.id === this.mapId;
      const g = this.add.graphics().setDepth(DEPTH.content);
      this.mapObjects.push(g);
      fillNotched(g, x, y, pw, ph, on ? mix(C.plate, m.tagColor, 0.22) : mix(C.plate, 0x000000, 0.2), 1, 8, ALL_CORNERS);
      strokeNotched(g, x, y, pw, ph, on ? m.tagColor : C.line, on ? 1 : 0.6, on ? 2 : 1, 8, ALL_CORNERS);
      // Preview: the field squashed into a 96×60 window.
      const px = x + 6, py = y + 5, pW = 96, pH = 48;
      const sx = pW / 960, sy = pH / 492;
      const P = (pt: { x: number; y: number }): { x: number; y: number } => ({ x: px + Phaser.Math.Clamp(pt.x, 0, 960) * sx, y: py + Phaser.Math.Clamp(pt.y - 56, 0, 492) * sy });
      g.fillStyle(m.theme.ground[0], 1); g.fillRect(px, py, pW, pH);
      g.fillStyle(m.theme.water.shallow, 1);
      for (const w of m.water) {
        if (w.kind === 'ellipse') { const c = P(w); g.fillEllipse(c.x, c.y, w.rx * 2 * sx, w.ry * 2 * sy); }
        else if (w.kind === 'rect') { const c = P(w); g.fillRect(c.x, c.y, Math.min(w.w * sx, px + pW - c.x), Math.min(w.h * sy, py + pH - c.y)); }
        else { g.lineStyle(Math.max(2, w.hw * 2 * sx), m.theme.water.shallow, 1); g.beginPath(); const a = P(w.pts[0]); g.moveTo(a.x, a.y); for (const q of w.pts.slice(1)) { const b = P(q); g.lineTo(b.x, b.y); } g.strokePath(); }
      }
      g.fillStyle(m.theme.hazard.glow, 1);
      for (const w of m.hazards) {
        if (w.kind === 'ellipse') { const c = P(w); g.fillEllipse(c.x, c.y, w.rx * 2 * sx, w.ry * 2 * sy); }
        else if (w.kind === 'river') { g.lineStyle(Math.max(2, w.hw * 2 * sx), m.theme.hazard.glow, 1); g.beginPath(); const a = P(w.pts[0]); g.moveTo(a.x, a.y); for (const q of w.pts.slice(1)) { const b = P(q); g.lineTo(b.x, b.y); } g.strokePath(); }
      }
      for (const tr of m.tracks) {
        g.lineStyle(3, m.theme.road[2], 1);
        g.beginPath(); const a = P(tr[0]); g.moveTo(a.x, a.y);
        for (const q of tr.slice(1)) { const b = P(q); g.lineTo(b.x, b.y); }
        g.strokePath();
      }
      const k = P(m.tracks[0][m.tracks[0].length - 1]);
      g.fillStyle(C.gold, 1); g.fillRect(k.x - 3, k.y - 4, 6, 7);
      g.lineStyle(1, C.line, 1); g.strokeRect(px, py, pW, pH);

      const tx = x + 110;
      this.mapObjects.push(this.add.text(tx, y + 11, m.name, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: on ? T.bright : T.dim, letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content));
      this.mapObjects.push(this.add.text(tx, y + 23, `${m.tag}${m.tracks.length > 1 ? '  ·  2 ROADS' : ''}`, {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: hex(m.tagColor), letterSpacing: 2,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content));
      this.mapObjects.push(this.add.text(tx, y + 30, m.blurb, {
        fontSize: '8px', fontFamily: FONT_UI, color: T.faint, wordWrap: { width: pw - 116 },
      }).setOrigin(0, 0).setDepth(DEPTH.content));
      const z = this.add.zone(x + pw / 2, y + ph / 2, pw, ph).setInteractive({ useHandCursor: true }).setDepth(DEPTH.content + 1);
      z.on('pointerdown', () => { if (this.mapId === m.id) return; Sfx.click(); this.mapId = m.id; this.renderMaps(); this.refreshDifficulty(); });
      this.mapObjects.push(z);
    });
  }

  // ── Roster grid ───────────────────────────────────────────────────

  private renderGrid(): void {
    for (const p of this.portraits) p.destroy();
    this.portraits = [];
    for (const o of this.gridObjects) o.destroy();
    this.gridObjects = [];

    const { width } = this.scale;
    const cx = width / 2;
    const pages = Math.max(1, Math.ceil(this.roster.length / PAGE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const items = this.roster.slice(this.page * PAGE, this.page * PAGE + PAGE);

    const gridTop = 194;
    const gapX = 8, gapY = 10;
    const gridW = COLS * CARD_W + (COLS - 1) * gapX;
    const x0 = cx - gridW / 2 + CARD_W / 2;

    items.forEach((el, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = x0 + col * (CARD_W + gapX);
      const y = gridTop + CARD_H / 2 + row * (CARD_H + gapY);
      this.gridObjects.push(...this.buildCard(el, x, y));
    });

    const label = this.add.text(cx, gridTop + ROWS * (CARD_H + gapY) + 2, `${this.page + 1}  /  ${pages}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.gridObjects.push(label);
    const midY = gridTop + (ROWS * CARD_H + gapY) / 2;
    if (this.page > 0) {
      this.gridObjects.push(addPagerButton(this, { x: 30, y: midY, dir: 'left', accent: STRONGHOLD_ACCENT, onClick: () => { this.page--; this.renderGrid(); } }).container);
    }
    if (this.page < pages - 1) {
      this.gridObjects.push(addPagerButton(this, { x: width - 30, y: midY, dir: 'right', accent: STRONGHOLD_ACCENT, onClick: () => { this.page++; this.renderGrid(); } }).container);
    }
  }

  private buildCard(el: ElementDef, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const def = TOWER_DEFS[el.id];
    const picked = this.picks.includes(el.id);
    const full = !picked && this.picks.length >= MAX_TOWER_PICKS;
    const accent = picked ? C.verdant : el.color;

    const plate = addCardPlate(this, { x, y, w: CARD_W, h: CARD_H, accent, cut: 10, muted: full });
    out.push(plate.g);
    if (picked) plate.paint('active');

    // Portrait in a well on the left; text on the right.
    const wellX = x - CARD_W / 2 + 36, wellY = y - 14;
    out.push(addWell(this, wellX, wellY, 58, 78, accent, DEPTH.panel + 1, 6));
    const portrait = new ElementPortrait(this, {
      x: wellX, y: wellY, w: 56, h: 76, elementId: el.id,
      mastered: PlayerData.isMasteryEnabled(el.id), depth: DEPTH.panel + 2, scale: 0.5, muted: full,
    });
    this.portraits.push(portrait);

    const tx = x - CARD_W / 2 + 72;
    out.push(this.add.text(tx, y - 54, el.name.toUpperCase(), {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.45)), letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    out.push(this.add.text(tx, y - 40, getElementProfile(el.id).archetype.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    out.push(this.add.text(tx, y - 26, ROLE_LABEL[def.role], {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.3)), letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    out.push(this.add.text(tx, y - 14, BODY_LABEL[def.body.kind], {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: def.body.kind === 'ground' ? T.faint : T.gold, letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    out.push(this.add.text(tx, y - 4, def.signature.name, {
      fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: 66 },
    }).setOrigin(0, 0).setDepth(DEPTH.content));
    const costG = this.add.graphics().setDepth(DEPTH.content);
    drawIcon(costG, 'coin', tx + 6, y + 34, 6, C.gold);
    out.push(costG);
    out.push(this.add.text(tx + 16, y + 34, `${def.cost}`, {
      fontSize: '12px', fontFamily: FONT_MONO, color: T.gold,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));

    const status = picked ? '✓  IN LOADOUT' : full ? 'LOADOUT FULL' : '▶  ADD';
    out.push(this.add.text(x, y + CARD_H / 2 - 13, status, {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: picked ? T.good : full ? T.ghost : hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content));

    const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: !full });
    zone.on('pointerover', () => { if (!picked && !full) plate.paint('hover'); portrait.poke(); this.showHint(`${el.name.toUpperCase()} — ${def.blurb}`); });
    zone.on('pointerout', () => plate.paint(picked ? 'active' : 'idle'));
    zone.on('pointerdown', () => this.toggle(el.id));
    out.push(zone);
    return out;
  }

  private showHint(text: string): void {
    this.hintText?.setText(text);
  }

  private toggle(id: string): void {
    const at = this.picks.indexOf(id);
    if (at >= 0) { this.picks.splice(at, 1); Sfx.play('ui-toggle-off'); }
    else if (this.picks.length >= MAX_TOWER_PICKS) { Sfx.denied(); showToast(this, `Six towers is the limit — remove one first.`, { accent: C.blood }); return; }
    else { this.picks.push(id); Sfx.play('ui-toggle-on'); }
    this.renderGrid();
    this.renderLoadout();
  }

  // ── Loadout strip ─────────────────────────────────────────────────

  private renderLoadout(): void {
    for (const o of this.loadoutObjects) o.destroy();
    this.loadoutObjects = [];
    const { height } = this.scale;
    const y = height - 50;
    const slotW = 92, gap = 8;
    for (let i = 0; i < MAX_TOWER_PICKS; i++) {
      const x = 24 + slotW / 2 + i * (slotW + gap);
      const id = this.picks[i];
      const el = id ? this.roster.find((e) => e.id === id) : undefined;
      const accent = el?.color ?? C.line;
      this.loadoutObjects.push(addWell(this, x, y, slotW, 54, accent, DEPTH.panel, 8));
      if (el) {
        const tex = `elem-${el.id}`;
        if (this.textures.exists(tex)) {
          this.loadoutObjects.push(this.add.image(x - 28, y, tex).setScale(0.6).setDepth(DEPTH.content));
        }
        this.loadoutObjects.push(this.add.text(x - 8, y - 8, el.name.toUpperCase(), {
          fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.45)),
        }).setOrigin(0, 0.5).setDepth(DEPTH.content));
        this.loadoutObjects.push(this.add.text(x - 8, y + 9, `${i + 1}  ·  ${TOWER_DEFS[el.id].cost} 🪙`, {
          fontSize: '9px', fontFamily: FONT_MONO, color: T.dim,
        }).setOrigin(0, 0.5).setDepth(DEPTH.content));
        const z = this.add.zone(x, y, slotW, 54).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => this.toggle(el.id));
        this.loadoutObjects.push(z);
      } else {
        this.loadoutObjects.push(this.add.text(x, y, `${i + 1}`, {
          fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.ghost,
        }).setOrigin(0.5).setDepth(DEPTH.content));
      }
    }
    this.startBtn?.setDisabled(this.picks.length === 0);
  }

  private start(): void {
    if (this.picks.length === 0) { Sfx.denied(); showToast(this, 'Pick at least one element to build with.', { accent: C.blood }); return; }
    Sfx.play('scene-transition');
    this.scene.start('StrongholdScene', { elements: [...this.picks], difficulty: this.difficulty, map: this.mapId });
  }
}
