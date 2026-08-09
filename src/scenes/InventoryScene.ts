import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import { ITEMS, getItem, consumedItemIds, shortDescOf, fullDescOf } from '../data/Items';
import {
  ARTIFACTS, ArtifactDef, ARTIFACT_COOLDOWN_MS, armedArtifactIds, getArtifact,
} from '../data/Artifacts';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addButton, addChip, addIconButton, addPanel, addRowPlate, addWell, addBody, fillDiamond,
} from '../ui';
import { Music, Sfx } from '../audio';

const ACCENT = 0x2ee6c0;
const ARTIFACT_ACCENT = 0xffc44d;

/** Rows are shorter than they used to be — the bag holds ten at a time now, not seven. */
const ROW_H = 48;
const ROW_PAD = 5;
const ROW_STRIDE = ROW_H + ROW_PAD;

const TAB_Y = 84;
const SEARCH_Y = 118;
const LIST_TOP = 144;
/** Width of the scrollbar gutter down the right edge of the list well. */
const BAR_W = 8;

type Tab = 'items' | 'artifacts';

interface Row {
  id: string;
  emoji: string;
  name: string;
  /** The one-line mechanical summary shown on the row. */
  summary: string;
  /** Right-hand column: item count, or an artifact's readiness. */
  trailing: string;
  trailingColor: string;
  /** Small caption under the trailing text. */
  note: string;
  noteColor: string;
  accent: number;
  /** Rows that cannot be used right now are painted back. */
  muted: boolean;
}

/**
 * Slide-over item drawer. Occupies the right portion of the screen; the left is dimmed and
 * click-to-close, so the campaign map stays visible behind it.
 *
 * Three things beyond a plain list, because the bag got big: a **tab** for artifacts (which
 * are owned rather than stocked, and are never spent), a **search field** that filters on
 * name and on the generated effect text, and a real **scrollbar** with a draggable thumb.
 * The wheel still works; the bar exists so you can tell at a glance how much bag is left.
 */
export class InventoryScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private callerKey = 'CampaignWorldMapScene';

  private panelX = 0;
  private panelW = 0;
  private listH = 0;

  private tab: Tab = 'items';
  private query = '';

  private rowContainer!: Phaser.GameObjects.Container;
  private chrome: Phaser.GameObjects.GameObject[] = [];
  private detailGroup: Phaser.GameObjects.GameObject[] = [];
  private scrollOffset = 0;
  private totalRows = 0;

  private searchText!: Phaser.GameObjects.Text;
  private barThumb: Phaser.GameObjects.Rectangle | null = null;
  private dragging = false;
  private dragFromY = 0;
  private dragFromOffset = 0;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; callerKey: string }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.callerKey = data?.callerKey ?? 'CampaignWorldMapScene';
  }

  create(): void {
    Music.play('menu');
    const { width, height } = this.scale;
    // Wider than it was: a search field and a readiness column need the room.
    this.panelW = Math.floor(width * 0.62);
    this.panelX = width - this.panelW;
    this.listH = height - LIST_TOP - 14;
    this.scrollOffset = 0;
    this.detailGroup = [];
    this.chrome = [];
    this.tab = 'items';
    this.query = '';
    this.dragging = false;

    // Dim + close on the exposed left side
    this.add.rectangle(this.panelX / 2, height / 2, this.panelX, height, 0x03030a, 0.6)
      .setDepth(DEPTH.overlay)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Drawer plate — square on the right edge so it reads as attached to it.
    addPanel(this, {
      x: this.panelX + this.panelW / 2, y: height / 2,
      w: this.panelW, h: height,
      accent: ACCENT,
      corners: [true, false, false, true],
      cut: 24,
      depth: DEPTH.overlay + 1,
      glow: 0.5,
      title: '🎒  INVENTORY',
      subtitle: 'ITEMS ARE SPENT · ARTIFACTS COME BACK',
    });

    addChip(this, {
      x: width - 20, y: 30, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`,
      accent: ACCENT, originX: 1, depth: DEPTH.overlay + 3,
    });

    addIconButton(this, {
      x: this.panelX + 32, y: 30, r: 16, icon: '✕', accent: C.steel,
      depth: DEPTH.overlay + 3, tooltip: 'Close',
      onClick: () => this.close(),
    });

    // The list trough is drawn once, here — `buildList` runs on every wheel tick and every
    // keystroke, and anything it draws that it does not also destroy is a leak.
    addWell(this, this.panelX + this.panelW / 2, LIST_TOP + this.listH / 2,
      this.panelW - 20, this.listH, ACCENT, DEPTH.overlay + 2);

    this.buildTabs();
    this.buildSearchField();

    this.input.keyboard!.on('keydown', (ev: KeyboardEvent) => this.onKey(ev));

    this.input.on('wheel', (_ptr: unknown, _objs: unknown, _dx: number, dy: number) => {
      if (this.detailGroup.length > 0) return;
      this.scrollBy(dy * 0.6);
    });

    // Scrollbar dragging lives on the scene, not the thumb, so a fast drag that leaves the
    // 8px-wide thumb behind still moves the list.
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const travel = Math.max(1, this.listH - this.thumbHeight());
      const perPx = this.maxScroll() / travel;
      this.setScroll(this.dragFromOffset + (ptr.y - this.dragFromY) * perPx);
    });
    this.input.on('pointerup', () => { this.dragging = false; });

    // Artifact cooldowns tick down in real time, so the list has to keep up with them.
    this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this.tab === 'artifacts' && this.detailGroup.length === 0) this.buildList();
      },
    });

    this.buildList();
  }

  // ── Chrome ────────────────────────────────────────────────────────

  private buildTabs(): void {
    const tabs: Array<{ id: Tab; label: string; accent: number; count: number }> = [
      { id: 'items', label: '🎒 ITEMS', accent: ACCENT, count: this.ownedItems().length },
      { id: 'artifacts', label: '✦ ARTIFACTS', accent: ARTIFACT_ACCENT, count: CP.getArtifacts(this.slotIdx).length },
    ];
    const tabW = (this.panelW - 40) / 2 - 4;
    tabs.forEach((t, i) => {
      const x = this.panelX + 20 + tabW / 2 + i * (tabW + 8);
      const active = this.tab === t.id;
      const g = this.add.graphics().setDepth(DEPTH.overlay + 2);
      const paint = (hot: boolean): void => {
        g.clear();
        g.fillStyle(mix(C.plate, t.accent, active ? 0.42 : hot ? 0.2 : 0.08), 1);
        g.fillRect(x - tabW / 2, TAB_Y - 14, tabW, 28);
        g.lineStyle(active ? 2 : 1, t.accent, active ? 1 : 0.35);
        g.strokeRect(x - tabW / 2, TAB_Y - 14, tabW, 28);
        if (active) {
          g.fillStyle(mix(t.accent, 0xffffff, 0.4), 1);
          g.fillRect(x - tabW / 2 + 4, TAB_Y + 11, tabW - 8, 3);
        }
      };
      paint(false);
      this.chrome.push(g);

      const label = this.add.text(x, TAB_Y, `${t.label}   ${t.count}`, {
        fontSize: '12px', fontFamily: FONT_DISPLAY,
        color: active ? hex(mix(t.accent, 0xffffff, 0.7)) : T.dim, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(DEPTH.overlay + 3);
      this.chrome.push(label);

      const hit = this.add.rectangle(x, TAB_Y, tabW, 28, 0xffffff, 0)
        .setDepth(DEPTH.overlay + 4).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => paint(true));
      hit.on('pointerout', () => paint(false));
      hit.on('pointerdown', () => {
        if (this.tab === t.id) return;
        Sfx.play('ui-tab');
        this.tab = t.id;
        this.scrollOffset = 0;
        this.closeDetail(false);
        this.rebuildChrome();
        this.buildList();
      });
      this.chrome.push(hit);
    });
  }

  private buildSearchField(): void {
    const w = this.panelW - 40;
    const cx = this.panelX + 20 + w / 2;
    this.chrome.push(addWell(this, cx, SEARCH_Y, w, 28, ACCENT, DEPTH.overlay + 2, 6));

    const icon = this.add.text(cx - w / 2 + 12, SEARCH_Y, '🔍', { fontSize: '13px' })
      .setOrigin(0, 0.5).setDepth(DEPTH.overlay + 3);
    this.chrome.push(icon);

    this.searchText = this.add.text(cx - w / 2 + 34, SEARCH_Y, '', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.bright,
    }).setOrigin(0, 0.5).setDepth(DEPTH.overlay + 3);
    this.chrome.push(this.searchText);

    // The caret blinks whether or not anything is typed — the field is always focused,
    // because there is nothing else on this drawer that wants the keyboard.
    const caret = this.add.text(0, SEARCH_Y, '|', {
      fontSize: '13px', fontFamily: FONT_UI, color: hex(mix(ACCENT, 0xffffff, 0.5)),
    }).setOrigin(0, 0.5).setDepth(DEPTH.overlay + 3);
    this.chrome.push(caret);
    this.tweens.add({ targets: caret, alpha: 0, duration: 520, yoyo: true, repeat: -1 });
    const placeCaret = (): void => { caret.setX(this.searchText.x + this.searchText.width + 1); };

    const clear = addIconButton(this, {
      x: cx + w / 2 - 16, y: SEARCH_Y, r: 10, icon: '✕', accent: C.steel,
      depth: DEPTH.overlay + 4, onClick: () => { this.query = ''; this.refreshSearch(); },
    });
    this.chrome.push(clear);

    this.refreshSearch = (): void => {
      this.searchText.setText(this.query || '');
      if (!this.query) {
        this.searchText.setText('type to filter…').setColor(T.ghost);
      } else {
        this.searchText.setColor(T.bright);
      }
      placeCaret();
      this.scrollOffset = 0;
      this.buildList();
    };
    this.refreshSearch();
  }

  /** Reassigned by `buildSearchField` once the field exists. */
  private refreshSearch: () => void = () => { /* replaced in buildSearchField */ };

  private rebuildChrome(): void {
    for (const o of this.chrome) o.destroy();
    this.chrome = [];
    this.buildTabs();
    this.buildSearchField();
  }

  private onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      if (this.detailGroup.length > 0) this.closeDetail(true);
      else if (this.query) { this.query = ''; this.refreshSearch(); }
      else this.close();
      return;
    }
    if (this.detailGroup.length > 0) return;
    if (ev.key === 'Backspace') {
      if (this.query) { this.query = this.query.slice(0, -1); this.refreshSearch(); }
      return;
    }
    // Single printable characters only — arrows, modifiers and F-keys are not text.
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      if (this.query.length >= 24) return;
      this.query += ev.key;
      Sfx.play('ui-type');
      this.refreshSearch();
    }
  }

  // ── Rows ──────────────────────────────────────────────────────────

  private ownedItems(): typeof ITEMS {
    const inventory = CP.getInventory(this.slotIdx);
    return ITEMS.filter((def) => (inventory[def.id] ?? 0) > 0);
  }

  private ownedArtifacts(): ArtifactDef[] {
    const owned = CP.getArtifacts(this.slotIdx);
    return ARTIFACTS.filter((a) => owned.includes(a.id));
  }

  /** Everything on the current tab, filtered by the search box. */
  private rows(): Row[] {
    const q = this.query.trim().toLowerCase();
    const matches = (...fields: string[]): boolean =>
      !q || fields.some((f) => f.toLowerCase().includes(q));

    if (this.tab === 'items') {
      const inventory = CP.getInventory(this.slotIdx);
      return this.ownedItems()
        .filter((def) => matches(def.name, shortDescOf(def), def.flavor))
        .map((def) => {
          const armed = consumedItemIds.has(def.id);
          return {
            id: def.id,
            emoji: def.emoji,
            name: def.name,
            summary: shortDescOf(def),
            trailing: `×${inventory[def.id] ?? 0}`,
            trailingColor: T.gold,
            note: armed ? '✓ ARMED' : '',
            noteColor: hex(mix(C.frost, 0xffffff, 0.3)),
            accent: armed ? C.frost : ACCENT,
            muted: false,
          };
        });
    }

    const now = Date.now();
    return this.ownedArtifacts()
      .filter((a) => matches(a.name, a.lines.join(' '), a.flavor, a.combo))
      .map((a) => {
        const armed = armedArtifactIds.has(a.id);
        const readyAt = CP.getArtifactReadyAt(this.slotIdx, a.id);
        const cooling = readyAt > now;
        return {
          id: a.id,
          emoji: a.emoji,
          name: a.name,
          summary: a.lines[0],
          trailing: armed ? 'ARMED' : cooling ? countdown(readyAt - now) : 'READY',
          trailingColor: armed ? hex(mix(C.frost, 0xffffff, 0.35)) : cooling ? T.faint : T.good,
          note: armed ? 'takes effect next match' : cooling ? 'cooling down' : '',
          noteColor: T.faint,
          accent: armed ? C.frost : cooling ? C.steel : a.accent,
          muted: cooling && !armed,
        };
      });
  }

  private maxScroll(): number {
    return Math.max(0, this.totalRows * ROW_STRIDE - this.listH + 12);
  }

  private thumbHeight(): number {
    const content = Math.max(1, this.totalRows * ROW_STRIDE);
    return Phaser.Math.Clamp((this.listH / content) * this.listH, 30, this.listH);
  }

  private scrollBy(delta: number): void {
    this.setScroll(this.scrollOffset + delta);
  }

  private setScroll(value: number): void {
    const next = Phaser.Math.Clamp(value, 0, this.maxScroll());
    if (Math.abs(next - this.scrollOffset) < 0.5) return;
    this.scrollOffset = next;
    this.buildList();
  }

  private buildList(): void {
    const listY = LIST_TOP;
    const listH = this.listH;

    if (this.rowContainer) this.rowContainer.destroy();
    this.barThumb = null;

    this.rowContainer = this.add.container(0, 0).setDepth(DEPTH.overlay + 3);
    const maskGfx = this.make.graphics({}, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(this.panelX, listY, this.panelW, listH);
    this.rowContainer.setMask(maskGfx.createGeometryMask());

    const rows = this.rows();
    this.totalRows = rows.length;
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll());

    if (rows.length === 0) {
      this.rowContainer.add(this.add.text(this.panelX + this.panelW / 2, listY + 70, this.emptyText(), {
        fontSize: '13px', fontFamily: FONT_UI, color: T.faint, align: 'center', lineSpacing: 6,
        wordWrap: { width: this.panelW - 120 },
      }).setOrigin(0.5, 0));
      return;
    }

    const rowW = this.panelW - 36 - BAR_W - 6;
    const rowCx = this.panelX + (this.panelW - BAR_W - 6) / 2;

    rows.forEach((row, i) => {
      const y = listY + 6 + i * ROW_STRIDE - this.scrollOffset;
      // Rows scrolled well clear of the well are not built at all — the bag can hold
      // sixty items and only ten of them are ever on screen.
      if (y + ROW_H < listY - ROW_STRIDE || y > listY + listH + ROW_STRIDE) return;

      const plate = addRowPlate(this, {
        x: rowCx, y: y + ROW_H / 2, w: rowW, h: ROW_H,
        accent: row.accent, depth: DEPTH.overlay + 3,
      });

      const hit = this.add.rectangle(rowCx, y + ROW_H / 2, rowW, ROW_H, 0xffffff, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => plate.paint(true))
        .on('pointerout', () => plate.paint(false))
        .on('pointerdown', () => this.openDetail(row.id));

      const left = rowCx - rowW / 2;
      const objs: Phaser.GameObjects.GameObject[] = [
        plate.g,
        this.add.text(left + 24, y + ROW_H / 2, row.emoji, { fontSize: '22px' })
          .setOrigin(0.5).setAlpha(row.muted ? 0.5 : 1),
        this.add.text(left + 46, y + ROW_H / 2 - 9, row.name, {
          fontSize: '14px', fontFamily: FONT_DISPLAY,
          color: row.muted ? T.dim : T.bright, letterSpacing: 0.5,
        }).setOrigin(0, 0.5),
        this.add.text(left + 46, y + ROW_H / 2 + 10, row.summary, {
          fontSize: '9.5px', fontFamily: FONT_UI, color: row.muted ? T.ghost : T.dim,
          wordWrap: { width: rowW - 190 }, maxLines: 1,
        }).setOrigin(0, 0.5),
        this.add.text(left + rowW - 16, y + ROW_H / 2 + (row.note ? -8 : 0), row.trailing, {
          fontSize: '14px', fontFamily: FONT_DISPLAY, color: row.trailingColor,
        }).setOrigin(1, 0.5),
        hit,
      ];
      if (row.note) {
        objs.push(this.add.text(left + rowW - 16, y + ROW_H / 2 + 11, row.note, {
          fontSize: '8.5px', fontFamily: FONT_DISPLAY, color: row.noteColor, letterSpacing: 1,
        }).setOrigin(1, 0.5));
      }
      this.rowContainer.add(objs);
    });

    this.buildScrollbar(listY, listH);
  }

  private emptyText(): string {
    if (this.query) return `Nothing in the bag matches “${this.query}”.`;
    return this.tab === 'items'
      ? 'Nothing in the bag.\n\nWorld Shops trade items for ⚡ Sparks.'
      : 'No artifacts yet.\n\nThey are locked in the Vault — fifteen of the gold chests\non the campaign world map hold one each.';
  }

  /** Track plus draggable thumb, drawn into the row container so it scrolls out of nothing. */
  private buildScrollbar(listY: number, listH: number): void {
    const max = this.maxScroll();
    const x = this.panelX + this.panelW - 10 - BAR_W / 2;

    const track = this.add.rectangle(x, listY + listH / 2, BAR_W, listH, 0x000000, 0.35)
      .setOrigin(0.5);
    this.rowContainer.add(track);
    if (max <= 0) return;

    const thumbH = this.thumbHeight();
    const travel = listH - thumbH;
    const y = listY + thumbH / 2 + (this.scrollOffset / max) * travel;

    // The track's hit plate goes down *first*: input picks the topmost object, so a plate
    // added after the thumb would swallow every drag before it started.
    const trackHit = this.add.rectangle(x, listY + listH / 2, BAR_W + 8, listH, 0xffffff, 0)
      .setInteractive();
    trackHit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.scrollBy(ptr.y < y ? -listH * 0.8 : listH * 0.8);
    });
    this.rowContainer.add(trackHit);

    const thumb = this.add.rectangle(x, y, BAR_W, thumbH, mix(ACCENT, 0xffffff, 0.15), 0.85)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    thumb.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragFromY = ptr.y;
      this.dragFromOffset = this.scrollOffset;
    });
    this.rowContainer.add(thumb);
    this.barThumb = thumb;
  }

  // ── Detail ────────────────────────────────────────────────────────

  /** Full-drawer detail view for one entry, with its action. */
  private openDetail(id: string): void {
    if (this.tab === 'artifacts') { this.openArtifactDetail(id); return; }

    const def = getItem(id);
    if (!def) return;
    const { height } = this.scale;
    const cx = this.panelX + this.panelW / 2;
    const midY = height / 2;

    this.rowContainer?.setVisible(false);

    const alreadyActive = consumedItemIds.has(id);
    const count = CP.getInventory(this.slotIdx)[id] ?? 0;
    const depth = DEPTH.overlay + 4;

    const objs: Phaser.GameObjects.GameObject[] = [
      ...this.emblem(cx, midY - 118, def.emoji, ACCENT, depth),
      this.add.text(cx, midY - 52, def.name, {
        fontSize: '23px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(depth + 1),
      this.add.text(cx, midY - 26, `OWNED  ×${count}`, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 1),
      addBody(this, {
        x: cx, y: midY + 10, text: fullDescOf(def), size: 13, color: T.normal,
        wrap: this.panelW - 80, align: 'center', originX: 0.5, depth: depth + 1,
        lineSpacing: 4,
      }),
    ];

    if (alreadyActive) {
      objs.push(addButton(this, {
        x: cx, y: midY + 116, w: 220, h: 46,
        label: 'ALREADY ACTIVE', sublabel: 'Takes effect next match',
        accent: C.frost, variant: 'ghost', fontSize: 14, depth,
        disabled: true,
      }).container);
    } else {
      objs.push(addButton(this, {
        x: cx, y: midY + 116, w: 200, h: 52,
        label: 'USE', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 20, depth,
        onClick: () => {
          if (CP.consumeItem(this.slotIdx, id)) {
            consumedItemIds.add(id);
            this.closeDetail(true);
          }
        },
      }).container);
    }

    objs.push(this.backButton(cx, midY + 176, depth));
    this.detailGroup = objs;
  }

  /**
   * An artifact's page. Same shape as an item's, but the action is ARM rather than USE and
   * the button states are three-way: ready, already armed, or still cooling.
   */
  private openArtifactDetail(id: string): void {
    const def = getArtifact(id);
    if (!def) return;
    const { height } = this.scale;
    const cx = this.panelX + this.panelW / 2;
    const midY = height / 2;

    this.rowContainer?.setVisible(false);

    const armed = armedArtifactIds.has(id);
    const readyAt = CP.getArtifactReadyAt(this.slotIdx, id);
    const cooling = readyAt > Date.now();
    const depth = DEPTH.overlay + 4;

    const body = `${def.flavor}\n\n${def.lines.map((l) => `• ${l}`).join('\n')}\n\n${def.combo}`;

    const objs: Phaser.GameObjects.GameObject[] = [
      ...this.emblem(cx, midY - 132, def.emoji, def.accent, depth),
      this.add.text(cx, midY - 66, def.name, {
        fontSize: '23px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1.5,
      }).setOrigin(0.5).setDepth(depth + 1),
      this.add.text(cx, midY - 42, 'ARTIFACT  ·  NEVER SPENT  ·  5 MINUTE COOLDOWN', {
        fontSize: '9.5px', fontFamily: FONT_DISPLAY,
        color: hex(mix(def.accent, 0xffffff, 0.4)), letterSpacing: 2,
      }).setOrigin(0.5).setDepth(depth + 1),
      addBody(this, {
        x: cx, y: midY - 22, text: body, size: 12.5, color: T.normal,
        wrap: this.panelW - 80, align: 'center', originX: 0.5, depth: depth + 1,
        lineSpacing: 4,
      }),
    ];

    if (armed) {
      objs.push(addButton(this, {
        x: cx, y: midY + 122, w: 240, h: 46,
        label: 'ALREADY ARMED', sublabel: 'Takes effect next match',
        accent: C.frost, variant: 'ghost', fontSize: 14, depth, disabled: true,
      }).container);
    } else if (cooling) {
      objs.push(addButton(this, {
        x: cx, y: midY + 122, w: 240, h: 46,
        label: countdown(readyAt - Date.now()),
        sublabel: 'Still recovering from the last use',
        accent: C.steel, variant: 'quiet', fontSize: 17, depth, disabled: true,
      }).container);
    } else {
      objs.push(addButton(this, {
        x: cx, y: midY + 122, w: 220, h: 52,
        label: 'ARM', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 20, depth,
        onClick: () => {
          armedArtifactIds.add(id);
          CP.startArtifactCooldown(this.slotIdx, id, ARTIFACT_COOLDOWN_MS);
          Sfx.play('ui-equip');
          this.closeDetail(true);
        },
      }).container);
    }

    objs.push(this.backButton(cx, midY + 182, depth));
    this.detailGroup = objs;
  }

  /** The glyph set in a lit diamond, shared by both detail views. */
  private emblem(x: number, y: number, glyph: string, accent: number, depth: number): Phaser.GameObjects.GameObject[] {
    const g = this.add.graphics().setDepth(depth);
    for (let k = 6; k >= 1; k--) {
      g.fillStyle(accent, 0.04);
      g.fillCircle(x, y, 30 + k * 7);
    }
    fillDiamond(g, x, y, 44, mix(C.plate, accent, 0.2), 0.95);
    g.lineStyle(2, accent, 0.7);
    g.strokeCircle(x, y, 44);
    return [g, this.add.text(x, y, glyph, { fontSize: '44px' }).setOrigin(0.5).setDepth(depth + 1)];
  }

  private backButton(x: number, y: number, depth: number): Phaser.GameObjects.GameObject {
    return addButton(this, {
      x, y, w: 160, h: 38,
      label: 'BACK', icon: '◄', variant: 'quiet', accent: C.steel, fontSize: 13, depth,
      onClick: () => this.closeDetail(true),
    }).container;
  }

  private closeDetail(rebuild: boolean): void {
    for (const obj of this.detailGroup) obj.destroy();
    this.detailGroup = [];
    this.rowContainer?.setVisible(true);
    if (rebuild) {
      // Counts and readiness both change behind the detail view, so the tabs go too.
      this.rebuildChrome();
      this.buildList();
    }
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume(this.callerKey);
  }
}

/** `4:59` — the readable half of a five-minute cooldown. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Mount the bottom-right 🎒 inventory button on any campaign scene. */
export function addInventoryButton(
  scene: Phaser.Scene,
  slotIdx: 0 | 1 | 2,
  depth = 10,
): void {
  const { width, height } = scene.scale;
  addIconButton(scene, {
    x: width - 36, y: height - 36, r: 22, icon: '🎒', accent: ACCENT, depth,
    tooltip: 'Inventory',
    onClick: () => {
      scene.scene.pause();
      scene.scene.launch('InventoryScene', { slotIdx, callerKey: scene.scene.key });
    },
  });
}
