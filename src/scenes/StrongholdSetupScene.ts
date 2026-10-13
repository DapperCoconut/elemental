import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { allSelectableElements, ElementDef } from '../data/ElementRoster';
import { getElementProfile } from '../data/ElementProfiles';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addHeaderBar, addPagerButton, addCardPlate, addWell,
  showToast, ElementPortrait, UiButton, drawIcon,
} from '../ui';
import { Music, Sfx } from '../audio';
import { TOWER_DEFS } from '../stronghold/StrongholdTowers';
import { towerAbilityName } from '../stronghold/Tower';
import { STRONGHOLD_DIFFICULTIES, StrongholdDifficultyId } from '../stronghold/StrongholdWaves';

export const STRONGHOLD_ACCENT = 0x60a5fa;
export const MAX_TOWER_PICKS = 6;

const CARD_W = 142;
const CARD_H = 150;
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

  constructor() {
    super({ key: 'StrongholdSetupScene' });
  }

  init(data?: { picks?: string[]; difficulty?: StrongholdDifficultyId }): void {
    this.picks = data?.picks ? [...data.picks] : [];
    this.difficulty = data?.difficulty ?? 'normal';
    this.page = 0;
  }

  create(): void {
    Music.play('menu');
    const { width, height } = this.scale;
    const cx = width / 2;
    addBackdrop(this, { accent: STRONGHOLD_ACCENT, variant: 'lattice', motes: 16 });
    addHeaderBar(this, { title: 'STRONGHOLD', subtitle: 'Pick up to six elements. They stand as towers on the road.', accent: STRONGHOLD_ACCENT, iconArt: 'castle' });
    addBackButton(this, () => { Sfx.back(); this.scene.start('TitleScene'); });

    this.roster = allSelectableElements().filter((e) => !!TOWER_DEFS[e.id]);

    // ── Difficulty ────────────────────────────────────────────────────
    const diffY = 92;
    const bw = 150, gap = 10;
    const startX = cx - ((bw + gap) * STRONGHOLD_DIFFICULTIES.length - gap) / 2 + bw / 2;
    STRONGHOLD_DIFFICULTIES.forEach((d, i) => {
      const btn = addButton(this, {
        x: startX + i * (bw + gap), y: diffY, w: bw, h: 34,
        label: d.label, accent: d.color, fontSize: 13, cut: 8,
        variant: d.id === this.difficulty ? 'solid' : 'ghost',
        onClick: () => { Sfx.click(); this.difficulty = d.id; this.refreshDifficulty(); },
      });
      this.diffButtons.push(btn);
    });
    this.diffDesc = this.add.text(cx, diffY + 30, '', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.bestText = this.add.text(width - 24, diffY + 30, '', {
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
        x, y, w: 150, h: 34, label: d.label, accent: d.color, fontSize: 13, cut: 8,
        variant: want as 'solid' | 'ghost',
        onClick: () => { Sfx.click(); this.difficulty = d.id; this.refreshDifficulty(); },
      });
      this.diffButtons[i].container.setData('variant', want);
    });
    const d = STRONGHOLD_DIFFICULTIES.find((x) => x.id === this.difficulty)!;
    this.diffDesc?.setText(d.description).setColor(hex(mix(d.color, 0xffffff, 0.45)));
    const best = PlayerData.getStrongholdBest(d.id);
    this.bestText?.setText(best > 0 ? `BEST  WAVE ${best}` : 'NO RECORD YET');
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

    const gridTop = 146;
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
    out.push(this.add.text(tx, y - 20, `${def.tiers[0]} → ${def.tiers[4]}`, {
      fontSize: '9px', fontFamily: FONT_UI, color: T.dim, wordWrap: { width: 66 },
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    out.push(this.add.text(tx, y + 6, towerAbilityName(el.id, 'click', def.abilities.click), {
      fontSize: '9px', fontFamily: FONT_UI, color: T.normal, wordWrap: { width: 66 },
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));
    const costG = this.add.graphics().setDepth(DEPTH.content);
    drawIcon(costG, 'coin', tx + 6, y + 30, 6, C.gold);
    out.push(costG);
    out.push(this.add.text(tx + 16, y + 30, `${def.cost}`, {
      fontSize: '12px', fontFamily: FONT_MONO, color: T.gold,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content));

    const status = picked ? '✓  IN LOADOUT' : full ? 'LOADOUT FULL' : '▶  ADD';
    out.push(this.add.text(x, y + CARD_H / 2 - 13, status, {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: picked ? T.good : full ? T.ghost : hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content));

    const zone = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: !full });
    zone.on('pointerover', () => { if (!picked && !full) plate.paint('hover'); portrait.poke(); });
    zone.on('pointerout', () => plate.paint(picked ? 'active' : 'idle'));
    zone.on('pointerdown', () => this.toggle(el.id));
    out.push(zone);
    return out;
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
    this.scene.start('StrongholdScene', { elements: [...this.picks], difficulty: this.difficulty });
  }
}
