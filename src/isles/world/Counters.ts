import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI, FONT_MONO } from '../../ui';
import { Sfx } from '../../audio';
import { describeEffect } from '../../data/Items';
import * as Save from '../IslesSave';
import { MAX_CHARMS } from '../IslesSave';
import {
  getShop, getBakery, getIsleItem, boats, dockUpgrades, getUber, getRod, ISLES, ALL_ISLE_IDS, routeOpen, getIsle, PINNACLE,
} from '../IslesRegistry';
import type { IsleItemDef } from '../IslesTypes';
import * as Quests from '../systems/Quests';

/**
 * The counters you walk up to: a shop, the tackle stall, a bakery, the dock. Each is one
 * screen-space ledger panel (rows on the left, the selected row's detail on the right) drawn over
 * the living world. Keyboard: W/S or arrows pick, E/Enter acts, A/D or Tab switches tab, Esc/Q
 * leaves. Mouse works on everything.
 */

const Z = 31000;

export interface Row {
  icon: string;
  name: string;
  /** Right-aligned price / status. */
  right: string;
  rightColor?: string;
  detail: string[];
  /** Button label for E, or null when nothing can be done. */
  verb: string | null;
  act?: () => string | null;
  dim?: boolean;
}

export interface Tab { label: string; rows: () => Row[] }

export class LedgerPanel {
  private root: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private tabs: Tab[] = [];
  private tab = 0;
  private sel = 0;
  private scroll = 0;
  private title = '';
  private accent = 0xff9d5c;
  private onClose: (() => void) | null = null;
  private note = '';
  private noteUntil = 0;

  constructor(private scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(Z).setVisible(false);
    this.g = scene.add.graphics();
    this.root.add(this.g);
  }

  get isOpen(): boolean { return this.root.visible; }

  open(title: string, tabs: Tab[], accent: number, onClose?: () => void): void {
    this.title = title;
    this.tabs = tabs;
    this.tab = 0;
    this.sel = 0;
    this.scroll = 0;
    this.accent = accent;
    this.onClose = onClose ?? null;
    this.root.setVisible(true);
    Sfx.play('ui-open');
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.setVisible(false);
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    Sfx.play('ui-close');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  key(k: 'up' | 'down' | 'left' | 'right' | 'act' | 'back'): void {
    if (!this.isOpen) return;
    const rows = this.rows();
    if (k === 'back') { this.close(); return; }
    if (k === 'up') this.sel = Math.max(0, this.sel - 1);
    if (k === 'down') this.sel = Math.min(rows.length - 1, this.sel + 1);
    if (k === 'left' || k === 'right') {
      if (this.tabs.length > 1) {
        this.tab = (this.tab + (k === 'left' ? -1 : 1) + this.tabs.length) % this.tabs.length;
        this.sel = 0; this.scroll = 0;
        Sfx.play('ui-tab');
      }
    }
    if (k === 'act') this.act();
    this.render();
  }

  private rows(): Row[] { return this.tabs[this.tab]?.rows() ?? []; }

  private act(): void {
    const r = this.rows()[this.sel];
    if (!r?.act || !r.verb) { Sfx.play('ui-denied'); return; }
    const msg = r.act();
    if (msg) { this.note = msg; this.noteUntil = this.scene.time.now + 2600; }
    this.render();
  }

  update(): void {
    if (this.isOpen && this.note && this.scene.time.now > this.noteUntil) { this.note = ''; this.render(); }
  }

  render(): void {
    for (const d of this.dyn) d.destroy();
    this.dyn = [];
    const W = this.scene.scale.width, H = this.scene.scale.height;
    const g = this.g;
    g.clear();
    g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, W, H);
    const x = 60, y = 54, w = W - 120, h = H - 108;
    g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x + 6, y + 8, w, h, 16);
    g.fillStyle(0x3a2412, 1); g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 18);
    g.fillStyle(0x24160c, 1); g.fillRoundedRect(x, y, w, h, 16);
    g.fillStyle(this.accent, 1); g.fillRect(x + 16, y + 52, w - 32, 2);
    const txt = (tx: number, ty: number, s: string, o: Phaser.Types.GameObjects.Text.TextStyle) => {
      const t = this.scene.add.text(tx, ty, s, o);
      this.root.add(t); this.dyn.push(t); return t;
    };
    txt(x + 22, y + 14, this.title, { fontFamily: FONT_DISPLAY, fontSize: '22px', color: '#ffe2b0' });
    txt(x + w - 22, y + 18, `🪙 ${Save.S().coins}   🔮 ${Save.S().orbs}   🗝️ ${Save.S().keys}`, { fontFamily: FONT_MONO, fontSize: '15px', color: '#ffd27a' }).setOrigin(1, 0);

    // Tabs
    if (this.tabs.length > 1) {
      let tx = x + 22;
      this.tabs.forEach((tb, i) => {
        const t = txt(tx, y + 62, tb.label, { fontFamily: FONT_DISPLAY, fontSize: '14px', color: i === this.tab ? '#ffe2b0' : '#8a6a4a' });
        t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.tab = i; this.sel = 0; this.scroll = 0; this.render(); });
        if (i === this.tab) { g.fillStyle(this.accent, 1); g.fillRect(tx, y + 82, t.width, 2); }
        tx += t.width + 26;
      });
    }

    const rows = this.rows();
    const listY = y + 94, rowH = 38, listW = w * 0.52;
    const visible = Math.floor((h - 150) / rowH);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + visible) this.scroll = this.sel - visible + 1;
    if (rows.length === 0) txt(x + 30, listY + 10, 'Nothing here yet.', { fontFamily: FONT_UI, fontSize: '16px', color: '#8a6a4a' });
    rows.slice(this.scroll, this.scroll + visible).forEach((r, k) => {
      const i = k + this.scroll;
      const ry = listY + k * rowH;
      const on = i === this.sel;
      g.fillStyle(on ? 0x4a2e1a : 0x2e1c10, 1); g.fillRoundedRect(x + 18, ry, listW, rowH - 4, 8);
      if (on) { g.lineStyle(2, this.accent, 1); g.strokeRoundedRect(x + 18, ry, listW, rowH - 4, 8); }
      const zone = this.scene.add.zone(x + 18, ry, listW, rowH - 4).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { if (this.sel === i) this.act(); else this.sel = i; this.render(); });
      this.root.add(zone); this.dyn.push(zone);
      txt(x + 30, ry + 7, `${r.icon}  ${r.name}`, { fontFamily: FONT_UI, fontSize: '16px', color: r.dim ? '#7a6050' : '#f2e2c8' });
      txt(x + 18 + listW - 12, ry + 8, r.right, { fontFamily: FONT_MONO, fontSize: '14px', color: r.rightColor ?? '#ffd27a' }).setOrigin(1, 0);
    });
    if (rows.length > visible) {
      txt(x + 18 + listW / 2, y + h - 40, `${this.scroll + 1}–${Math.min(rows.length, this.scroll + visible)} of ${rows.length}`, { fontFamily: FONT_UI, fontSize: '12px', color: '#8a6a4a' }).setOrigin(0.5, 0);
    }

    // Detail
    const r = rows[this.sel];
    const dx = x + listW + 40, dw = w - listW - 60;
    g.fillStyle(0x1a100a, 1); g.fillRoundedRect(dx - 8, listY, dw + 8, h - 150, 12);
    if (r) {
      txt(dx + 6, listY + 12, `${r.icon} ${r.name}`, { fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#ffe2b0', wordWrap: { width: dw - 12 } });
      txt(dx + 6, listY + 46, r.detail.join('\n'), { fontFamily: FONT_UI, fontSize: '14px', color: '#e2ccaa', wordWrap: { width: dw - 16 }, lineSpacing: 5 });
      if (r.verb) {
        const bx = dx + dw / 2, by = y + h - 70;
        g.fillStyle(this.accent, 1); g.fillRoundedRect(bx - 110, by - 18, 220, 38, 10);
        g.fillStyle(0x2a1408, 1); g.fillRoundedRect(bx - 106, by - 14, 212, 30, 8);
        const b = txt(bx, by + 1, `[E]  ${r.verb}`, { fontFamily: FONT_DISPLAY, fontSize: '16px', color: '#ffe2b0' }).setOrigin(0.5);
        b.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.act());
      }
    }
    txt(x + 22, y + h - 26, 'W/S select · E act · A/D tabs · Esc leave', { fontFamily: FONT_UI, fontSize: '12px', color: '#8a6a4a' });
    if (this.note) {
      txt(W / 2, y + h - 30, this.note, { fontFamily: FONT_DISPLAY, fontSize: '15px', color: '#9dffb0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1);
    }
  }
}

// ── Item read-outs ─────────────────────────────────────────────────────

export function itemDetail(it: IsleItemDef): string[] {
  const kind = {
    charm: `Charm — equip up to ${MAX_CHARMS}, kept forever`,
    food: 'Meal — eaten before your next fight',
    artifact: 'Artifact — one equipped at a time',
    fish: 'Fish — sell it, cook it, or eat it raw',
    material: 'Ingredient',
    rod: 'Fishing rod',
    key: 'Key',
  }[it.kind];
  const out = [kind, '', `“${it.flavor}”`, ''];
  if (it.effect) out.push(...describeEffect(it.effect).map((l) => `• ${l}`));
  for (const l of it.scriptText ?? []) out.push(`• ${l}`);
  if (it.kind === 'rod') {
    const r = getRod(it.id);
    if (r) out.push(`• Fishes: ${r.kinds.join(', ')}`, `• Control ×${r.control}`);
  }
  return out;
}

const owned = (it: IsleItemDef): boolean => (it.kind === 'charm' || it.kind === 'artifact' || it.kind === 'rod') && Save.count(it.id) > 0;

function buyRow(it: IsleItemDef, onBought?: () => void): Row {
  const have = Save.count(it.id);
  const price = it.price ?? 0;
  const isOwned = owned(it);
  return {
    icon: it.emoji,
    name: it.name + (have > 0 && !isOwned ? `  ×${have}` : ''),
    right: isOwned ? 'OWNED' : `${price} 🪙`,
    rightColor: isOwned ? '#9dffb0' : Save.S().coins >= price ? '#ffd27a' : '#c86a5a',
    detail: itemDetail(it),
    verb: isOwned ? null : 'BUY',
    dim: isOwned,
    act: () => {
      if (!Save.spendCoins(price)) { Sfx.play('ui-denied'); return 'Not enough coins.'; }
      Save.give(it.id, 1);
      if (it.kind === 'rod' && !Save.S().rod) { Save.S().rod = it.id; Save.persist(); }
      Sfx.play('ui-purchase');
      onBought?.();
      return `Bought ${it.name}.`;
    },
  };
}

function sellRows(): Row[] {
  const s = Save.S();
  const rows: Row[] = [];
  for (const [id, n] of Object.entries(s.inv)) {
    const it = getIsleItem(id);
    if (!it || !it.sell || n <= 0) continue;
    if (it.kind === 'charm' || it.kind === 'artifact' || it.kind === 'rod') continue;
    rows.push({
      icon: it.emoji, name: `${it.name}  ×${n}`, right: `+${it.sell} 🪙`, rightColor: '#9dffb0',
      detail: itemDetail(it), verb: 'SELL ONE',
      act: () => {
        if (!Save.take(id, 1)) return null;
        Save.addCoins(it.sell!);
        Sfx.play('money');
        return `Sold ${it.name} for ${it.sell} coins.`;
      },
    });
  }
  return rows;
}

export function openShop(p: LedgerPanel, shopId: string, accent: number, onClose?: () => void): boolean {
  const shop = getShop(shopId);
  if (!shop) return false;
  const tabs: Tab[] = [{
    label: 'BUY',
    rows: () => shop.stock.map((id) => getIsleItem(id)).filter((x): x is IsleItemDef => !!x).map((it) => buyRow(it)),
  }];
  tabs.push({ label: 'SELL', rows: sellRows });
  p.open(shop.name, tabs, accent, onClose);
  return true;
}

export function openBakery(p: LedgerPanel, bakeryId: string, accent: number, onClose?: () => void, toast?: (s: string) => void): boolean {
  const b = getBakery(bakeryId);
  if (!b) return false;
  const rows = (): Row[] => b.recipes.map((r) => {
    const out = getIsleItem(r.output);
    const canIn = r.inputs.every((i) => Save.count(i.item) >= i.count);
    const can = canIn && Save.S().coins >= r.coins;
    const need = r.inputs.map((i) => {
      const it = getIsleItem(i.item);
      return `${Save.count(i.item) >= i.count ? '✓' : '✗'} ${it?.emoji ?? '?'} ${it?.name ?? i.item}  ${Save.count(i.item)}/${i.count}`;
    });
    return {
      icon: out?.emoji ?? '🍞',
      name: r.name,
      right: `${r.coins} 🪙`,
      rightColor: can ? '#ffd27a' : '#c86a5a',
      detail: ['Needs:', ...need, '', ...(out ? itemDetail(out) : [])],
      verb: can ? 'BAKE' : null,
      dim: !can,
      act: () => {
        if (!r.inputs.every((i) => Save.count(i.item) >= i.count) || !Save.spendCoins(r.coins)) return 'Missing ingredients.';
        for (const i of r.inputs) Save.take(i.item, i.count);
        Save.give(r.output, r.makes ?? 1);
        Sfx.play('craft-complete');
        for (const l of Quests.notify({ kind: 'cook', recipe: r.id })) toast?.(l);
        return `${out?.name ?? r.output} ×${r.makes ?? 1}, fresh from the oven.`;
      },
    };
  });
  p.open(b.name, [{ label: 'RECIPES', rows }, { label: 'SELL', rows: sellRows }], accent, onClose);
  return true;
}

/** The dock: boats, upgrades, uber-upgrades and casting off. */
/** `here` is the isle the dock stands on — every other charted isle is a crossing from it. */
export function openDock(p: LedgerPanel, accent: number, here: string, setSail: (dest: string) => void, onClose?: () => void): void {
  const s = () => Save.S();
  const boatRows = (): Row[] => boats().map((b) => {
    const mine = s().boat.owned === b.id;
    return {
      icon: '⛵', name: b.name, right: mine ? 'MOORED' : `${b.price} 🪙`,
      rightColor: mine ? '#9dffb0' : s().coins >= b.price ? '#ffd27a' : '#c86a5a',
      detail: [
        `Hull ${b.hull} · Speed ${b.speed} · Handling ${b.handling} · Hold ×${b.hold}`,
        '',
        'A boat lost at sea is gone for good, along with what you paid for it.',
        s().boat.owned && !mine ? 'Buying this replaces your current boat (no refund).' : '',
      ],
      verb: mine ? null : 'BUY',
      act: () => {
        if (!Save.spendCoins(b.price)) return 'Not enough coins.';
        s().boat.owned = b.id;
        Save.persist();
        Sfx.play('ui-purchase');
        return `${b.name} is yours. Mind the rocks.`;
      },
    };
  });
  const upRows = (): Row[] => dockUpgrades().map((u) => {
    const lvl = s().boat.upgrades[u.id] ?? 0;
    const next = u.prices[lvl];
    return {
      icon: '🔧', name: `${u.name}  ${'◆'.repeat(lvl)}${'◇'.repeat(u.prices.length - lvl)}`,
      right: next === undefined ? 'MAX' : `${next} 🪙`,
      rightColor: next === undefined ? '#9dffb0' : s().coins >= next ? '#ffd27a' : '#c86a5a',
      detail: [u.text, '', 'Upgrades stay with you across every boat you own.'],
      verb: next === undefined ? null : 'UPGRADE',
      act: () => {
        if (next === undefined || !Save.spendCoins(next)) return 'Not enough coins.';
        s().boat.upgrades[u.id] = lvl + 1;
        Save.persist();
        Sfx.play('hammer-forge');
        return `${u.name} — level ${lvl + 1}.`;
      },
    };
  });
  const uberRows = (): Row[] => {
    const rows: Row[] = s().boat.ubers.map((id) => {
      const u = getUber(id);
      const on = s().boat.uber === id;
      return {
        icon: '⚓', name: u?.name ?? id, right: on ? 'FITTED' : 'OWNED', rightColor: '#9dffb0',
        detail: [u?.text ?? '', '', 'Only one Uber-upgrade can be fitted at a time.'],
        verb: on ? 'UNFIT' : 'FIT',
        act: () => { s().boat.uber = on ? null : id; Save.persist(); return on ? 'Unfitted.' : `${u?.name} fitted.`; },
      };
    });
    if (!rows.length) rows.push({ icon: '🐉', name: 'No Uber-upgrades yet', right: '', detail: ['Sea beasts of the Far Wastes carry the makings of Uber-upgrades.', 'Sail out, go deep, and bring one down.'], verb: null, dim: true });
    return rows;
  };
  const sailRows = (): Row[] => {
    const has = !!s().boat.owned;
    const rows: Row[] = [
      {
        icon: '🌊', name: 'The Far Wastes', right: has ? `best ${s().wastesBest}m` : 'NO BOAT',
        detail: ['Endless sea. Deeper is darker, richer and stranger.', 'Sea beasts surface out there — they drop Uber-upgrade parts.', 'Turn back any time with the coins you have hauled.'],
        verb: has ? 'SET SAIL' : null,
        act: () => { setSail('wastes'); return null; },
      },
    ];
    for (const isle of ISLES) {
      if (isle.id === here) continue;
      const open = routeOpen(isle.id);
      const prev = getIsle(ALL_ISLE_IDS[ALL_ISLE_IDS.indexOf(isle.id) - 1] ?? '');
      rows.push({
        icon: isle.outer ? '⛈️' : '🧭', name: isle.name, right: !open ? 'NO CHART' : has ? (isle.outer ? 'ROUGH SEAS' : 'CROSSING') : 'NO BOAT',
        rightColor: open && has ? (isle.outer ? '#ffb07a' : '#9dd8ff') : '#8a6a4a',
        detail: open
          ? [`Held by ${isle.monarch.name}, ${isle.monarch.title}.`, '',
            ...(isle.outer
              ? ['Beyond the Breakwater: the Outer Sea. A long crossing in black water;', 'the swell throws the boat about and breakers roll in. Thread their gaps.', 'Sink and you wash up back here.']
              : ['A crossing: open sea until landfall. Sink and you wash up back here.']),
            s().waystones.includes(isle.port) ? 'You have landed there before.' : 'You have never set foot there.']
          : [`Held by ${isle.monarch.name}, ${isle.monarch.title}.`, '', `No pilot will chart the way while ${prev ? prev.monarch.name : 'the tyrant here'} still reigns.`],
        verb: open && has ? 'SET SAIL' : null,
        dim: !open,
        act: () => { setSail(isle.id); return null; },
      });
    }
    if (here !== PINNACLE.id) {
      const open = routeOpen(PINNACLE.id);
      const fallen = ISLES.filter((i) => s().monarchs.includes(i.monarch.id)).length;
      rows.push({
        icon: '🗡️', name: PINNACLE.name, right: !open ? 'THE SHROUD' : has ? 'THE LAST CROSSING' : 'NO BOAT',
        rightColor: open && has ? '#c9b0ff' : '#8a6a4a',
        detail: open
          ? ['The black spire in the middle of the sea. The storm that hid it is gone.', '',
            'Sixty councilors sit on its ten benches, and above them the Obsidian King.',
            'The water round it is glass-black and full of the spire’s own shards.',
            s().waystones.includes(PINNACLE.port) ? 'You have landed there before.' : 'Nobody has landed there and come back.']
          : ['The black spire in the middle of the sea, wrapped in a wall of storm: the Shroud.', '',
            `No pilot will go near it while a monarch still reigns. ${fallen} of ${ISLES.length} have fallen.`],
        verb: open && has ? 'SET SAIL' : null,
        dim: !open,
        act: () => { setSail(PINNACLE.id); return null; },
      });
    }
    const uncharted = ALL_ISLE_IDS.length - ISLES.length;
    if (uncharted > 0) rows.push({
      icon: '🏝️', name: 'The other isles', right: 'UNCHARTED', rightColor: '#8a6a4a',
      detail: [`${uncharted} more isles lie out there, each under its own tyrant.`, 'Their charts are not drawn yet.'],
      verb: null, dim: true,
    });
    return rows;
  };
  p.open('THE DOCKS', [
    { label: 'SAIL', rows: sailRows },
    { label: 'BOATS', rows: boatRows },
    { label: 'UPGRADES', rows: upRows },
    { label: 'UBER', rows: uberRows },
  ], accent, onClose);
}
