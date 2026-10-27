import Phaser from 'phaser';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_MONO, FONT_UI, hex, mix,
  addButton, addIconButton, addPagerButton, fillNotched, strokeNotched, ALL_CORNERS, UiButton,
} from '../ui';
import { Sfx } from '../audio';
import { TOWER_DEFS } from '../stronghold/StrongholdTowers';
import { BODY_LABEL, ROLE_LABEL, TowerDef } from '../stronghold/StrongholdTypes';
import { PATH_TINT, attackName } from '../stronghold/Tower';
import { TRAIT_IDS, traitInfo } from '../stronghold/HuskRoadTraits';
import { HUSK_BUILDS, HuskBuildId, familyBuild } from '../stronghold/HuskBuilds';
import { ELEMENTAL_HUSK_VARIANTS } from '../invasion/HuskVariants';
import { STRONGHOLD_ACCENT } from './StrongholdSetupScene';

export interface StrongholdJournalData {
  /** The run's towers — listed first. */
  loadout?: string[];
  /** Tower to open on. */
  focus?: string;
  /** Husk families met this run — marked SEEN. */
  seen?: string[];
  /** Open on the husk tab. */
  tab?: 'towers' | 'husks';
  /** Scene to hand input back to on close. */
  caller?: string;
  onClose?: () => void;
}

const BOSS_NAMES: Record<string, string> = { arbiter: 'The Arbiter', dreamer: 'The Dreamer', paradox: 'The Paradox', decoy: 'Decoy' };
const LIST_ROWS = 21;
const HUSK_COLS = 3;
const HUSK_ROWS = 6;
const W = 932, H = 612;

/**
 * The Stronghold journal: every tower's three paths, tier by tier, with prices; and every husk
 * family's build and road trait. Opened over the run (which pauses while it is up) with the
 * JOURNAL button or J, and from the loadout screen.
 */
export class StrongholdJournalScene extends Phaser.Scene {
  private data0: StrongholdJournalData = {};
  private tab: 'towers' | 'husks' = 'towers';
  private towerIds: string[] = [];
  private towerSel = '';
  private listPage = 0;
  private huskPage = 0;
  private body: Phaser.GameObjects.GameObject[] = [];
  private tabBtns: UiButton[] = [];

  constructor() {
    super({ key: 'StrongholdJournalScene' });
  }

  init(data: StrongholdJournalData): void {
    this.data0 = data ?? {};
    this.tab = data?.tab ?? 'towers';
    const all = Object.keys(TOWER_DEFS).sort((a, b) => (findElementDef(a)?.name ?? a).localeCompare(findElementDef(b)?.name ?? b));
    const lo = (data?.loadout ?? []).filter((id) => TOWER_DEFS[id]);
    this.towerIds = [...lo, ...all.filter((id) => !lo.includes(id))];
    this.towerSel = data?.focus && TOWER_DEFS[data.focus] ? data.focus : this.towerIds[0];
    this.listPage = Math.floor(Math.max(0, this.towerIds.indexOf(this.towerSel)) / LIST_ROWS);
    this.huskPage = 0;
    this.body = [];
    this.tabBtns = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const caller = this.data0.caller ? this.scene.get(this.data0.caller) : null;
    if (caller) { caller.input.enabled = false; if (caller.input.keyboard) caller.input.keyboard.enabled = false; }

    const x0 = (width - W) / 2, y0 = (height - H) / 2;
    const scrim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78).setInteractive().setDepth(DEPTH.modal);
    void scrim;
    const g = this.add.graphics().setDepth(DEPTH.modal);
    fillNotched(g, x0, y0, W, H, mix(C.plate, STRONGHOLD_ACCENT, 0.06), 0.99, 12, ALL_CORNERS);
    strokeNotched(g, x0, y0, W, H, STRONGHOLD_ACCENT, 0.8, 1.5, 12, ALL_CORNERS);
    this.add.text(x0 + 18, y0 + 22, 'STRONGHOLD JOURNAL', {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: hex(mix(STRONGHOLD_ACCENT, 0xffffff, 0.5)), letterSpacing: 3,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);
    const mkTab = (i: number, label: string, tab: 'towers' | 'husks'): void => {
      this.tabBtns[i]?.destroy();
      this.tabBtns[i] = addButton(this, {
        x: x0 + 330 + i * 130, y: y0 + 22, w: 120, h: 28, label, accent: tab === 'towers' ? C.gold : C.blood,
        variant: this.tab === tab ? 'solid' : 'ghost', fontSize: 11, cut: 6, depth: DEPTH.modalContent,
        onClick: () => { if (this.tab === tab) return; Sfx.click(); this.tab = tab; mkTabs(); this.render(); },
      });
    };
    const mkTabs = (): void => { mkTab(0, 'TOWERS', 'towers'); mkTab(1, 'HUSKS', 'husks'); };
    mkTabs();
    addIconButton(this, {
      x: x0 + W - 24, y: y0 + 22, r: 15, iconArt: 'cross', accent: C.steel, tooltip: 'Close (Esc)',
      depth: DEPTH.modalContent, onClick: () => this.close(),
    });
    this.add.text(x0 + W - 48, y0 + 22, 'ESC / J', {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(DEPTH.modalContent);
    // The key that opened the journal must not also close it.
    const openedAt = Date.now();
    const closeKey = (): void => { if (Date.now() - openedAt > 200) this.close(); };
    this.input.keyboard?.on('keydown-ESC', closeKey);
    this.input.keyboard?.on('keydown-J', closeKey);
    this.input.keyboard?.on('keydown-LEFT', () => this.flip(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.flip(1));
    this.render();
  }

  private close(): void {
    const caller = this.data0.caller ? this.scene.get(this.data0.caller) : null;
    if (caller) { caller.input.enabled = true; if (caller.input.keyboard) caller.input.keyboard.enabled = true; }
    Sfx.back();
    const cb = this.data0.onClose;
    this.scene.stop();
    cb?.();
  }

  private flip(dir: number): void {
    if (this.tab === 'towers') {
      const i = this.towerIds.indexOf(this.towerSel);
      this.towerSel = this.towerIds[(i + dir + this.towerIds.length) % this.towerIds.length];
      this.listPage = Math.floor(this.towerIds.indexOf(this.towerSel) / LIST_ROWS);
    } else {
      const pages = Math.ceil(this.huskFamilies().length / (HUSK_COLS * HUSK_ROWS));
      this.huskPage = (this.huskPage + dir + pages) % pages;
    }
    Sfx.click();
    this.render();
  }

  private render(): void {
    for (const o of this.body) o.destroy();
    this.body = [];
    if (this.tab === 'towers') this.renderTowers(); else this.renderHusks();
  }

  private add_<O extends Phaser.GameObjects.GameObject>(o: O): O { this.body.push(o); return o; }

  private txt(x: number, y: number, s: string, size: number, color: string, font = FONT_UI, ox = 0, oy = 0, wrap?: number): Phaser.GameObjects.Text {
    return this.add_(this.add.text(x, y, s, {
      fontSize: `${size}px`, fontFamily: font, color, wordWrap: wrap ? { width: wrap } : undefined, lineSpacing: 1,
      letterSpacing: font === FONT_DISPLAY ? 1 : 0,
    }).setOrigin(ox, oy).setDepth(DEPTH.modalContent + 1));
  }

  // ── Towers ────────────────────────────────────────────────────────

  private renderTowers(): void {
    const { width, height } = this.scale;
    const x0 = (width - W) / 2, y0 = (height - H) / 2;
    const lo = new Set(this.data0.loadout ?? []);
    // The list.
    const lx = x0 + 14, ly = y0 + 48;
    const pages = Math.ceil(this.towerIds.length / LIST_ROWS);
    const ids = this.towerIds.slice(this.listPage * LIST_ROWS, (this.listPage + 1) * LIST_ROWS);
    const g = this.add_(this.add.graphics().setDepth(DEPTH.modalContent));
    fillNotched(g, lx, ly, 172, H - 62, C.well, 0.9, 6, ALL_CORNERS);
    ids.forEach((id, i) => {
      const el = findElementDef(id);
      const color = el?.color ?? 0xffffff;
      const ry = ly + 8 + i * 24;
      const sel = id === this.towerSel;
      if (sel) { g.fillStyle(mix(C.plate, color, 0.3), 1); g.fillRect(lx + 4, ry - 2, 164, 22); }
      g.fillStyle(color, 1); g.fillCircle(lx + 14, ry + 9, 4);
      this.txt(lx + 24, ry + 9, (el?.name ?? id).toUpperCase(), 9, sel ? T.bright : T.dim, FONT_DISPLAY, 0, 0.5);
      this.txt(lx + 164, ry + 9, `${TOWER_DEFS[id].cost}`, 9, lo.has(id) ? T.gold : T.faint, FONT_MONO, 1, 0.5);
      const z = this.add_(this.add.zone(lx + 86, ry + 9, 164, 22).setInteractive({ useHandCursor: true }).setDepth(DEPTH.modalContent + 2));
      z.on('pointerdown', () => { this.towerSel = id; Sfx.click(); this.render(); });
    });
    if (lo.size) this.txt(lx + 8, ly + H - 84, '● gold price = in your loadout', 7, T.faint, FONT_UI);
    if (pages > 1) {
      this.add_(addPagerButton(this, { x: lx + 40, y: ly + H - 76, dir: 'left', depth: DEPTH.modalContent + 2, onClick: () => { this.listPage = (this.listPage + pages - 1) % pages; this.render(); } }).container);
      this.txt(lx + 86, ly + H - 76, `${this.listPage + 1} / ${pages}`, 9, T.dim, FONT_MONO, 0.5, 0.5);
      this.add_(addPagerButton(this, { x: lx + 132, y: ly + H - 76, dir: 'right', depth: DEPTH.modalContent + 2, onClick: () => { this.listPage = (this.listPage + 1) % pages; this.render(); } }).container);
    }
    this.renderTowerDetail(this.towerSel, x0 + 198, y0 + 48, W - 212);
  }

  private renderTowerDetail(id: string, x: number, y: number, w: number): void {
    const def: TowerDef = TOWER_DEFS[id];
    const el = findElementDef(id);
    const color = el?.color ?? 0xffffff;
    const tex = `elem-${id}`;
    if (this.textures.exists(tex)) this.add_(this.add.image(x + 22, y + 22, tex).setScale(0.75).setDepth(DEPTH.modalContent + 1));
    this.txt(x + 50, y + 4, (el?.name ?? id).toUpperCase(), 16, hex(mix(color, 0xffffff, 0.45)), FONT_DISPLAY);
    const reach = def.range > 900 ? 'whole map' : `${def.range}`;
    this.txt(x + 50, y + 26, `${def.cost} 🪙  ·  ${ROLE_LABEL[def.role]}  ·  ${BODY_LABEL[def.body.kind]}  ·  RANGE ${reach}`, 9, T.gold, FONT_DISPLAY);
    const blurb = this.txt(x, y + 48, `${def.blurb}   ✦ ${def.signature.name}: ${def.signature.desc}`, 9, T.normal, FONT_UI, 0, 0, w);
    const base = Object.entries(def.attacks).map(([k, a]) => `BASE  ${attackName(k, a)} — ${a.desc}`).join('\n');
    const baseT = this.txt(x, blurb.y + blurb.height + 4, base, 9, hex(mix(color, 0xffffff, 0.6)), FONT_UI, 0, 0, w);
    const top = baseT.y + baseT.height + 10;
    this.txt(x + w, top - 8, 'One path can reach tier 5, a second tier 2, the third stays closed.', 8, T.faint, FONT_UI, 1, 0.5);

    const colW = (w - 16) / 3;
    const g = this.add_(this.add.graphics().setDepth(DEPTH.modalContent));
    def.paths.forEach((p, pi) => {
      const cx = x + pi * (colW + 8);
      const tint = PATH_TINT[pi];
      const bottom = this.scale.height / 2 + H / 2 - 12;
      fillNotched(g, cx, top, colW, bottom - top, mix(C.well, tint, 0.06), 0.95, 6, ALL_CORNERS);
      strokeNotched(g, cx, top, colW, bottom - top, tint, 0.5, 1, 6, ALL_CORNERS);
      this.txt(cx + 8, top + 8, `${['Z', 'X', 'C'][pi]}  ${p.name.toUpperCase()}`, 11, hex(mix(tint, 0xffffff, 0.4)), FONT_DISPLAY);
      const th = this.txt(cx + 8, top + 24, p.theme, 8, T.dim, FONT_UI, 0, 0, colW - 16);
      let ry = th.y + th.height + 6;
      const slot = (bottom - ry - 4) / 5;
      p.upgrades.forEach((u, ti) => {
        g.fillStyle(tint, 0.9); g.fillCircle(cx + 12, ry + 6, 6);
        this.txt(cx + 12, ry + 6, `${ti + 1}`, 8, '#0a0a14', FONT_DISPLAY, 0.5, 0.5);
        this.txt(cx + 22, ry + 6, u.name, 9, T.bright, FONT_DISPLAY, 0, 0.5);
        this.txt(cx + colW - 8, ry + 6, `${u.cost}`, 9, T.gold, FONT_MONO, 1, 0.5);
        const d = this.txt(cx + 8, ry + 14, u.desc, 8, u.active ? '#9fd8ff' : T.normal, FONT_UI, 0, 0, colW - 16);
        if (d.height > slot - 16) d.setCrop(0, 0, colW - 16, slot - 16);
        ry += slot;
      });
    });
  }

  // ── Husks ─────────────────────────────────────────────────────────

  private huskFamilies(): string[] {
    return TRAIT_IDS;
  }

  private familyName(id: string): string {
    if (BOSS_NAMES[id]) return BOSS_NAMES[id];
    const v = ELEMENTAL_HUSK_VARIANTS.find((x) => x.elementId === id && x.tier === 1);
    if (v) return v.name.replace(/ Husk$/, '');
    return findElementDef(id)?.name ?? id;
  }

  private familyColor(id: string): number {
    return ELEMENTAL_HUSK_VARIANTS.find((x) => x.elementId === id)?.color ?? findElementDef(id)?.color ?? 0xcc3344;
  }

  private renderHusks(): void {
    const { width, height } = this.scale;
    const x0 = (width - W) / 2, y0 = (height - H) / 2;
    const seen = new Set(this.data0.seen ?? []);
    // Build legend.
    const order: HuskBuildId[] = ['swarm', 'runner', 'skirmisher', 'standard', 'brute', 'tank', 'juggernaut'];
    const lw = (W - 28 - 6 * 6) / 7;
    const g = this.add_(this.add.graphics().setDepth(DEPTH.modalContent));
    order.forEach((b, i) => {
      const def = HUSK_BUILDS[b];
      const bx = x0 + 14 + i * (lw + 6), by = y0 + 46;
      fillNotched(g, bx, by, lw, 40, mix(C.well, def.color, 0.12), 1, 5, ALL_CORNERS);
      this.txt(bx + 6, by + 9, def.label, 8, hex(mix(def.color, 0xffffff, 0.3)), FONT_DISPLAY, 0, 0.5);
      this.txt(bx + 6, by + 22, `${def.hp}× HP · ${def.speed}× speed`, 7, T.normal, FONT_MONO, 0, 0.5);
      this.txt(bx + 6, by + 32, `groups of ${def.clump[0]}–${def.clump[1]}`, 7, T.dim, FONT_UI, 0, 0.5);
    });
    this.txt(x0 + 14, y0 + 92, 'Husks come in clumps of one family. Each family walks with a build (above) and a road trait (below). Bosses arrive every tenth wave.', 8, T.faint, FONT_UI);

    const fams = this.huskFamilies();
    const per = HUSK_COLS * HUSK_ROWS;
    const pages = Math.ceil(fams.length / per);
    const list = fams.slice(this.huskPage * per, (this.huskPage + 1) * per);
    const cw = (W - 28 - (HUSK_COLS - 1) * 8) / HUSK_COLS, ch = 72;
    list.forEach((id, i) => {
      const info = traitInfo(id);
      if (!info) return;
      const col = i % HUSK_COLS, row = Math.floor(i / HUSK_COLS);
      const cx = x0 + 14 + col * (cw + 8), cy = y0 + 108 + row * (ch + 6);
      const color = this.familyColor(id);
      const boss = !!BOSS_NAMES[id];
      const b = boss ? null : familyBuild(id);
      fillNotched(g, cx, cy, cw, ch, mix(C.well, color, 0.1), 0.95, 6, ALL_CORNERS);
      g.fillStyle(color, 1); g.fillRect(cx, cy + 6, 4, ch - 12);
      if (seen.has(id)) strokeNotched(g, cx, cy, cw, ch, color, 0.9, 1.5, 6, ALL_CORNERS);
      this.txt(cx + 12, cy + 10, `${this.familyName(id).toUpperCase()}  ·  ${info.name.toUpperCase()}`, 9, hex(mix(color, 0xffffff, 0.45)), FONT_DISPLAY, 0, 0.5);
      const tag = boss ? (id === 'decoy' ? 'DECOY' : 'BOSS') : b!.label;
      this.txt(cx + cw - 8, cy + 10, seen.has(id) ? `SEEN · ${tag}` : tag, 7, boss ? T.bad : hex(mix(b!.color, 0xffffff, 0.2)), FONT_DISPLAY, 1, 0.5);
      const d = this.txt(cx + 12, cy + 20, info.desc, 8, T.normal, FONT_UI, 0, 0, cw - 20);
      if (d.height > 30) d.setCrop(0, 0, cw - 20, 30);
      const bits: string[] = [];
      if (info.weak?.length) bits.push(`weak to ${info.weak.map((w) => findElementDef(w)?.name ?? w).join(', ')}`);
      if (info.immune?.length) bits.push(`immune: ${info.immune.join(', ')}`);
      if (info.resist) bits.push(Object.entries(info.resist).map(([k, v]) => `${k} ×${v}`).join(' '));
      this.txt(cx + 12, cy + ch - 10, bits.join('  ·  '), 7, T.dim, FONT_UI, 0, 0.5);
    });
    if (pages > 1) {
      const py = y0 + H - 20;
      this.add_(addPagerButton(this, { x: x0 + W / 2 - 60, y: py, dir: 'left', depth: DEPTH.modalContent + 2, onClick: () => this.flip(-1) }).container);
      this.txt(x0 + W / 2, py, `${this.huskPage + 1} / ${pages}`, 10, T.dim, FONT_MONO, 0.5, 0.5);
      this.add_(addPagerButton(this, { x: x0 + W / 2 + 60, y: py, dir: 'right', depth: DEPTH.modalContent + 2, onClick: () => this.flip(1) }).container);
    }
  }
}
