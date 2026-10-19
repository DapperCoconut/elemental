import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  BondQuest, entangleQuests, entangleProgress, isQuestDone, questProgress,
} from '../data/QuantumBonds';
import { ELEMENT_MAP } from '../elements/ElementRegistry';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addHeaderBar, ElementPortrait,
  ALL_CORNERS, fillNotched, strokeNotched,
} from '../ui';
import { drawPlank, WOOD } from '../ui/Woodwork';
import { SpeechBubble, addHoverLabel } from '../ui/SpeechBubble';
import { Alchemist } from '../ui/characters/Alchemist';
import { Music, Sfx } from '../audio';

/** Quantum's colour, matching `quantumElement.color` and the arena's loadout readout. */
const Q_CYAN = 0x7df9ff;
const Q_DEEP = mix(Q_CYAN, 0x000000, 0.78);

const PAGE_SIZE = 12;
const BENCH_Y = 446;
/** The two bell jars on the bench: Quantum's atom, and whatever is being entangled with it. */
const JAR_L_X = 330;
const JAR_R_X = 480;
const JAR_Y = 334;

/**
 * The Entanglement Lab — where Quantum learns a new element.
 *
 * Quantum cannot simply be handed an element's abilities; the element has to be entangled
 * first, and only one can be researched at a time. This screen is that choice and the progress
 * against it: pick a specimen from the cabinet, see the three quests it asks for on the
 * clipboard, and commit to working on it. The same alchemist from upstairs runs the bench.
 *
 * Switching away does not wipe what has been banked — quest counts are keyed by element, so an
 * abandoned one is waiting where it was left. Only one can *accrue* at a time, which is
 * enforced down in `PlayerData.addEntangleQuestProgress` rather than here.
 */
export class QuantumLabScene extends Phaser.Scene {
  /** The element currently under the right-hand jar. Not the same as the one being researched. */
  private pick: string | null = null;
  private page = 0;
  private openingLine: string[] | null = null;
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private alchemist: Alchemist | null = null;
  private bubble: SpeechBubble | null = null;
  private arcGfx!: Phaser.GameObjects.Graphics;
  private elapsed = 0;

  constructor() {
    super({ key: 'QuantumLabScene' });
  }

  /**
   * Every interaction on this screen goes through `scene.restart`, so the socket and the page
   * have to survive one — `init` runs again on every restart, and defaulting them there would
   * throw away the click that caused it. State arrives back through `data`; only a genuinely
   * fresh entry (no data) falls through to opening on whatever is being researched.
   */
  init(data?: { pick?: string | null; page?: number; say?: string[] }): void {
    this.panelObjects = [];
    this.alchemist = null;
    this.bubble = null;
    this.elapsed = 0;
    this.openingLine = data?.say ?? null;
    if (data && ('pick' in data || 'page' in data)) {
      this.pick = data.pick ?? null;
      this.page = data.page ?? 0;
      return;
    }
    // Open on whatever is being worked on, so the screen answers "how am I doing" first.
    this.pick = PlayerData.getResearchingElement();
    this.page = 0;
  }

  /** Restart carrying the current socket and page — see {@link init}. */
  private refresh(page = this.page, say?: string[]): void {
    this.scene.restart({ pick: this.pick, page, say });
  }

  create(): void {
    Music.play('lab');
    // Quantum's mastery counts entangled elements; banking it here lets a save from before
    // the mastery existed catch up the first time the lab is opened.
    PlayerData.noteEntangledCount();
    const { width, height } = this.scale;
    const cx = width / 2;

    this.buildRoom(width, height);

    addHeaderBar(this, {
      title: '⚛  ENTANGLEMENT LAB', subtitle: 'ENTANGLE AN ELEMENT  ·  ONE AT A TIME', accent: Q_CYAN, height: 66,
    });

    const back = () => this.scene.start('LabScene');
    addBackButton(this, back, Q_CYAN);
    this.input.keyboard!.on('keydown-ESC', back);

    this.alchemist = new Alchemist(this, 104, BENCH_Y - 4, { scale: 0.86, depth: DEPTH.panel + 2 });
    const m = this.alchemist.mouth();
    this.bubble = new SpeechBubble(this, {
      anchorX: m.x, anchorY: m.y, side: 'right', width: 170, offsetX: -52, offsetY: -44, accent: Q_CYAN,
      depth: DEPTH.content + 30, onTalk: (on) => this.alchemist?.setTalking(on),
    });

    this.buildRoster(width, cx);
    this.buildJars();
    this.renderPanel(width);

    this.time.delayedCall(350, () => this.bubble?.say(this.openingLine ?? [this.openingLineFor()], { silent: true }));
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta / 1000;
    this.paintArc();
  }

  private openingLineFor(): string {
    const researching = PlayerData.getResearchingElement();
    if (this.pick && PlayerData.isElementEntangled(this.pick)) return `${ELEMENT_MAP[this.pick].name} is entangled. Quantum can carry its abilities.`;
    if (this.pick) {
      const { done, total } = entangleProgress(this.pick);
      return researching === this.pick
        ? `Researching ${ELEMENT_MAP[this.pick].name}: ${done} of ${total} quests done.`
        : `${ELEMENT_MAP[this.pick].name}: ${done} of ${total} quests done. Begin research?`;
    }
    return 'Pick a specimen from the cabinet. One can be researched at a time.';
  }

  // ── The room ───────────────────────────────────────────────────────────────

  /** Dark tile, orbit rings behind the bench, a cyan-lit bench with the two bell jars' stand. */
  private buildRoom(width: number, height: number): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    g.fillStyle(0x070a12, 1); g.fillRect(0, 0, width, height);
    const tw = 48;
    const th = 30;
    for (let row = 0; row * th < BENCH_Y; row++) {
      for (let col = -1; col * tw < width + tw; col++) {
        const x = col * tw + (row % 2 ? tw / 2 : 0);
        const y = row * th;
        const h = Math.sin((row * 7 + col * 13) * 12.9898) * 43758.5453;
        const u = h - Math.floor(h);
        g.fillStyle(mix(0x101a26, 0x152430, u), 1);
        g.fillRect(x + 1, y + 1, tw - 2, th - 2);
        g.fillStyle(0xffffff, 0.03); g.fillRect(x + 1, y + 1, tw - 2, 1.5);
      }
    }
    for (let k = 0; k < 14; k++) { g.fillStyle(0x000000, 0.05); g.fillRect(0, k * 10, width, 10); }
    // The orbit rings, the atom the element is named for, at scale behind everything.
    const rings = this.add.graphics().setDepth(DEPTH.backdrop + 1);
    const cx = width / 2;
    const cy = 300;
    for (let i = 0; i < 3; i++) {
      const rot = (i * Math.PI) / 3;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      rings.lineStyle(1.5, Q_CYAN, 0.07);
      rings.beginPath();
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        const ex = Math.cos(a) * 320;
        const ey = Math.sin(a) * 110;
        const px = cx + ex * cos - ey * sin;
        const py = cy + ex * sin + ey * cos;
        if (k === 0) rings.moveTo(px, py); else rings.lineTo(px, py);
      }
      rings.closePath();
      rings.strokePath();
    }
    for (let k = 10; k >= 1; k--) { g.fillStyle(Q_CYAN, 0.012); g.fillCircle((JAR_L_X + JAR_R_X) / 2, JAR_Y, k * 28); }
    g.fillStyle(0x05070c, 1); g.fillRect(0, BENCH_Y, width, height - BENCH_Y);
    for (let k = 0; k < 18; k++) {
      g.fillStyle(0x000000, 0.04 * (1 - k / 18));
      g.fillRect(k * 5, 0, 5, height); g.fillRect(width - k * 5 - 5, 0, 5, height); g.fillRect(0, height - k * 5 - 5, width, 5);
    }

    // The bench.
    const bench = this.add.graphics().setDepth(DEPTH.panel + 3);
    drawPlank(bench, -4, BENCH_Y, width + 8, 18, { seed: 71, lit: 0.1 });
    bench.fillStyle(WOOD.dark, 1); bench.fillRect(-4, BENCH_Y + 18, width + 8, 4);
    drawPlank(bench, -4, BENCH_Y + 22, width + 8, height - BENCH_Y - 22, { seed: 72, lit: -0.2 });
    for (const dx of [250, 540, 760]) {
      bench.fillStyle(0x000000, 0.3); bench.fillRoundedRect(dx - 56, BENCH_Y + 40, 112, 44, 3);
      bench.lineStyle(1, WOOD.lit, 0.35); bench.strokeRoundedRect(dx - 52, BENCH_Y + 44, 104, 36, 2);
      bench.fillStyle(0xc89a3c, 1); bench.fillRoundedRect(dx - 10, BENCH_Y + 60, 20, 5, 2);
    }
    // Cables from the jars down into the bench, and a dial.
    bench.lineStyle(3, 0x1a2a3a, 1); bench.lineBetween(JAR_L_X + 30, BENCH_Y + 2, JAR_L_X + 60, BENCH_Y + 40); bench.lineBetween(JAR_R_X - 30, BENCH_Y + 2, JAR_R_X - 60, BENCH_Y + 40);
    bench.fillStyle(0x15121a, 1); bench.fillCircle(405, BENCH_Y + 62, 12);
    bench.fillStyle(0x3a4a5a, 1); bench.fillCircle(405, BENCH_Y + 62, 10);
    bench.lineStyle(2, Q_CYAN, 0.9); bench.lineBetween(405, BENCH_Y + 62, 405 + 6, BENCH_Y + 55);
  }

  // ── The jars ───────────────────────────────────────────────────────────────

  /** Two bell jars on brass bases: Quantum's atom on the left, the picked element on the right. */
  private buildJars(): void {
    const g = this.add.graphics().setDepth(DEPTH.panel + 4);
    const jar = (x: number, lit: boolean): void => {
      const w = 96;
      const h = 150;
      const top = JAR_Y - h / 2 - 10;
      // Base.
      g.fillStyle(0x15121a, 1); g.fillEllipse(x, BENCH_Y - 2, w + 24, 16);
      g.fillStyle(0x8a6a2a, 1); g.fillRoundedRect(x - w / 2 - 10, BENCH_Y - 18, w + 20, 14, 3);
      g.fillStyle(0xc89a3c, 1); g.fillRoundedRect(x - w / 2 - 8, BENCH_Y - 20, w + 16, 6, 3);
      // Glass dome.
      g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x - w / 2 + 4, top + 6, w, BENCH_Y - 20 - top, 44);
      g.lineStyle(2.5, 0x10141c, 1); g.strokeRoundedRect(x - w / 2, top, w, BENCH_Y - 20 - top, 44);
      g.fillStyle(lit ? mix(0xd6ecff, Q_CYAN, 0.3) : 0xd6ecff, lit ? 0.16 : 0.1); g.fillRoundedRect(x - w / 2, top, w, BENCH_Y - 20 - top, 44);
      g.fillStyle(0xffffff, 0.3); g.fillEllipse(x - w * 0.3, top + 50, 10, 60);
      g.fillStyle(0xffffff, 0.15); g.fillEllipse(x + w * 0.35, top + 90, 5, 40);
      g.fillStyle(0xc89a3c, 1); g.fillCircle(x, top - 2, 6);
      g.fillStyle(0xf0d48a, 1); g.fillCircle(x - 1.5, top - 3.5, 2);
    };
    jar(JAR_L_X, true);
    jar(JAR_R_X, !!this.pick);

    // Quantum's atom under the left jar: a lit core and three turning orbits.
    const atom = this.add.graphics().setDepth(DEPTH.panel + 5);
    const paintAtom = (): void => {
      atom.clear();
      const t = this.elapsed;
      for (let k = 4; k >= 1; k--) { atom.fillStyle(Q_CYAN, 0.05); atom.fillCircle(JAR_L_X, JAR_Y, 10 + k * 7); }
      for (let i = 0; i < 3; i++) {
        const ra = i * Math.PI / 3 + t * 0.5;
        const c = Math.cos(ra);
        const sn = Math.sin(ra);
        atom.lineStyle(1.3, mix(Q_CYAN, 0xffffff, 0.3), 0.8);
        atom.beginPath();
        for (let k = 0; k <= 30; k++) {
          const u = (k / 30) * Math.PI * 2;
          const ex = Math.cos(u) * 32;
          const ey = Math.sin(u) * 12;
          const px = JAR_L_X + ex * c - ey * sn;
          const py = JAR_Y + ex * sn + ey * c;
          if (k === 0) atom.moveTo(px, py); else atom.lineTo(px, py);
        }
        atom.strokePath();
        const eu = t * (1.6 + i * 0.4) + i * 2;
        const ex = Math.cos(eu) * 32;
        const ey = Math.sin(eu) * 12;
        atom.fillStyle(0xffffff, 1); atom.fillCircle(JAR_L_X + ex * c - ey * sn, JAR_Y + ex * sn + ey * c, 2.2);
      }
      atom.fillStyle(0x10141c, 1); atom.fillCircle(JAR_L_X, JAR_Y, 10);
      atom.fillStyle(Q_CYAN, 1); atom.fillCircle(JAR_L_X, JAR_Y, 8.5);
      atom.fillStyle(0xffffff, 0.9); atom.fillCircle(JAR_L_X - 2.5, JAR_Y - 2.5, 3);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, paintAtom);
    this.add.text(JAR_L_X, BENCH_Y - 30, 'QUANTUM', { fontSize: '9px', fontFamily: FONT_DISPLAY, color: hex(Q_CYAN), letterSpacing: 2 }).setOrigin(0.5).setDepth(DEPTH.content);

    // The specimen under the right jar: the element's live portrait, standing in the glass.
    const el = this.pick ? ELEMENT_MAP[this.pick] : null;
    if (el) {
      const portrait = new ElementPortrait(this, {
        x: JAR_R_X, y: JAR_Y + 4, w: 84, h: 120, elementId: this.pick!, mastered: false, depth: DEPTH.panel + 5, scale: 0.6,
      });
      this.add.zone(JAR_R_X, JAR_Y, 1, 1).once('destroy', () => portrait.destroy());
      this.add.text(JAR_R_X, BENCH_Y - 30, el.name.toUpperCase(), { fontSize: '9px', fontFamily: FONT_DISPLAY, color: hex(el.color), letterSpacing: 2 }).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      this.add.text(JAR_R_X, JAR_Y, '?', { fontSize: '40px', fontFamily: FONT_DISPLAY, color: T.ghost }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(JAR_R_X, BENCH_Y - 30, 'SPECIMEN', { fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2 }).setOrigin(0.5).setDepth(DEPTH.content);
    }
    this.arcGfx = this.add.graphics().setDepth(DEPTH.panel + 6);
  }

  /** The entanglement arc between the jars: a jagged bolt that re-rolls every frame while a specimen is in. */
  private paintArc(): void {
    const g = this.arcGfx;
    if (!g?.active) return;
    g.clear();
    const el = this.pick ? ELEMENT_MAP[this.pick] : null;
    const done = !!this.pick && PlayerData.isElementEntangled(this.pick);
    const active = !!this.pick && PlayerData.getResearchingElement() === this.pick;
    const x0 = JAR_L_X + 48;
    const x1 = JAR_R_X - 48;
    const y = JAR_Y - 20;
    // Terminals on both jars.
    g.fillStyle(0xc89a3c, 1); g.fillRect(x0 - 6, y - 4, 8, 8); g.fillRect(x1 - 2, y - 4, 8, 8);
    if (!el) {
      g.lineStyle(1, C.steel, 0.3); g.lineBetween(x0 + 2, y, x1 - 2, y);
      return;
    }
    const color = done ? Q_CYAN : active ? mix(Q_CYAN, el.color, 0.5) : el.color;
    const strength = done ? 1 : active ? 0.7 : 0.35;
    for (let pass = 0; pass < 2; pass++) {
      g.lineStyle(pass === 0 ? 3 : 1.2, pass === 0 ? mix(color, 0x000000, 0.2) : 0xffffff, strength * (pass === 0 ? 0.7 : 0.9));
      g.beginPath();
      g.moveTo(x0 + 2, y);
      const n = 9;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        g.lineTo(x0 + 2 + (x1 - x0 - 4) * u, y + (Math.random() - 0.5) * 18 * strength);
      }
      g.lineTo(x1 - 2, y);
      g.strokePath();
    }
    for (let k = 3; k >= 1; k--) { g.fillStyle(color, 0.05 * strength); g.fillCircle((x0 + x1) / 2, y, 10 + k * 10); }
  }

  // ── The cabinet ────────────────────────────────────────────────────────────

  /** Every element the player owns and could entangle. Quantum itself and the King are out. */
  private bondableElements(): string[] {
    return Object.keys(ELEMENT_MAP).filter((id) => {
      if (id === 'quantum' || id === 'king') return false;
      return PlayerData.isElementUnlocked(id) || ['fire', 'water', 'life', 'air', 'earth'].includes(id);
    });
  }

  /** A wall cabinet of specimen tiles across the top of the room, two shelves of six. */
  private buildRoster(width: number, cx: number): void {
    const all = this.bondableElements();
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const shown = all.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);

    const y0 = 118;
    const cellW = 74;
    const cellH = 58;
    const perRow = 6;
    const rowW = perRow * cellW;
    const left = cx - rowW / 2;

    // The cabinet: a wooden case with two shelves and a brass label.
    const cab = this.add.graphics().setDepth(DEPTH.panel);
    cab.fillStyle(0x000000, 0.4); cab.fillRect(left - 16, y0 - 34, rowW + 36, cellH * 2 + 32);
    drawPlank(cab, left - 18, y0 - 36, rowW + 36, 8, { seed: 81 });
    drawPlank(cab, left - 18, y0 - 36, 8, cellH * 2 + 36, { seed: 82, vertical: true });
    drawPlank(cab, left + rowW + 10, y0 - 36, 8, cellH * 2 + 36, { seed: 83, vertical: true });
    cab.fillStyle(0x0b1018, 1); cab.fillRect(left - 10, y0 - 28, rowW + 20, cellH * 2 + 24);
    for (let r = 0; r < 2; r++) drawPlank(cab, left - 10, y0 + 24 + r * cellH, rowW + 20, 6, { seed: 84 + r, lit: 0.05 });
    cab.fillStyle(0xc89a3c, 1); cab.fillRoundedRect(cx - 50, y0 - 44, 100, 14, 2);
    this.add.text(cx, y0 - 37, 'SPECIMENS', { fontSize: '8px', fontFamily: FONT_DISPLAY, color: '#2a1a08', letterSpacing: 2 }).setOrigin(0.5).setDepth(DEPTH.content);

    shown.forEach((id, i) => {
      const el = ELEMENT_MAP[id];
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = left + col * cellW + cellW / 2;
      const y = y0 + row * cellH;
      const picked = id === this.pick;
      const entangled = PlayerData.isElementEntangled(id);

      // A specimen: a small capsule of the element's colour with its glyph, lit when picked.
      const g = this.add.graphics().setDepth(DEPTH.content - 1);
      const paint = (hot: boolean): void => {
        g.clear();
        const lit = picked ? 1 : hot ? 0.5 : 0;
        if (lit > 0) { for (let k = 3; k >= 1; k--) { g.fillStyle(el.color, 0.06 * lit); g.fillCircle(x, y - 4, 14 + k * 6); } }
        g.fillStyle(0x10141c, 1); g.fillRoundedRect(x - 16, y - 24, 32, 42, 10);
        g.fillStyle(mix(el.color, 0x000000, 0.55 - lit * 0.25), 1); g.fillRoundedRect(x - 14, y - 22, 28, 38, 9);
        g.fillStyle(mix(el.color, 0xffffff, 0.2), 0.85); g.fillRoundedRect(x - 11, y - 2, 22, 15, 6);
        g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(x - 11, y - 20, 5, 22, 2);
        g.lineStyle(picked ? 2 : 1, picked ? mix(el.color, 0xffffff, 0.5) : mix(el.color, 0x000000, 0.2), picked ? 1 : 0.7);
        g.strokeRoundedRect(x - 14, y - 22, 28, 38, 9);
        g.fillStyle(0xc89a3c, 1); g.fillRect(x - 8, y - 27, 16, 5);
        if (entangled) { g.fillStyle(Q_CYAN, 1); g.fillCircle(x + 14, y - 22, 4); g.fillStyle(0xffffff, 0.9); g.fillCircle(x + 13, y - 23, 1.4); }
      };
      paint(false);
      this.add.text(x, y - 10, el.emoji, { fontSize: '14px' }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(x, y + 23, el.name.toUpperCase(), {
        fontSize: '6.5px', fontFamily: FONT_DISPLAY, color: picked ? T.bright : T.dim, letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      let label: Phaser.GameObjects.Container | null = null;
      const hit = this.add.rectangle(x, y, 64, 52, 0x000000, 0.001).setDepth(DEPTH.content + 1).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { paint(true); label?.destroy(); label = addHoverLabel(this, x, y - 40, el.name, el.color); });
      hit.on('pointerout', () => { paint(false); label?.destroy(); label = null; });
      hit.on('pointerdown', () => { label?.destroy(); label = null; this.pickElement(id); });
    });

    if (pages > 1) {
      const pager = (dx: number, dir: -1 | 1, label: string) => {
        addButton(this, { x: cx + dx, y: y0 + cellH - 4, w: 36, h: 44, label, accent: Q_CYAN, fontSize: 12, onClick: () => this.refresh(this.page + dir) });
      };
      if (this.page > 0) pager(-rowW / 2 - 44, -1, '<');
      if (this.page < pages - 1) pager(rowW / 2 + 44, 1, '>');
    }
  }

  /** Clicking a specimen puts it under the jar, or lifts the jar if it was already there. */
  private pickElement(id: string): void {
    Sfx.play('ui-click');
    const picking = this.pick !== id;
    this.pick = picking ? id : null;
    if (!picking) { this.refresh(this.page, ['Specimen returned. Pick another.']); return; }
    const el = ELEMENT_MAP[id];
    if (PlayerData.isElementEntangled(id)) { this.refresh(this.page, [`${el.name}. Already entangled — Quantum can carry it.`]); return; }
    const { done, total } = entangleProgress(id);
    const active = PlayerData.getResearchingElement() === id;
    this.refresh(this.page, [active
      ? `${el.name}. Researching: ${done} of ${total} quests done.`
      : `${el.name}. ${done} of ${total} quests done. Begin research?`]);
  }

  // ── The clipboard ──────────────────────────────────────────────────────────

  /** The quest sheet, on a clipboard hung beside the jars. */
  private renderPanel(width: number): void {
    for (const o of this.panelObjects) if (o.active) (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    this.panelObjects = [];

    const panelX = 586;
    const panelW = width - panelX - 36;
    const panelY = 236;
    const panelH = 182;
    const cxP = panelX + panelW / 2;

    // Clipboard: a board with a clip at the top and a sheet of paper.
    const board = this.add.graphics().setDepth(DEPTH.content - 1);
    board.fillStyle(0x000000, 0.4); board.fillRoundedRect(panelX + 4, panelY - 10, panelW, panelH + 24, 6);
    drawPlank(board, panelX, panelY - 14, panelW, panelH + 24, { seed: 91, lit: -0.1 });
    board.fillStyle(0x3b3a44, 1); board.fillRoundedRect(cxP - 26, panelY - 24, 52, 18, 4);
    board.fillStyle(0x7a7a8c, 1); board.fillRoundedRect(cxP - 22, panelY - 21, 44, 6, 3);
    fillNotched(board, panelX + 10, panelY, panelW - 20, panelH, 0xe8e2d0, 1, 2, ALL_CORNERS);
    strokeNotched(board, panelX + 10, panelY, panelW - 20, panelH, 0xa9a394, 0.8, 1, 2, ALL_CORNERS);
    board.lineStyle(1, 0xc8c0b0, 0.5);
    for (let i = 1; i < 7; i++) board.lineBetween(panelX + 20, panelY + 10 + i * 24, panelX + panelW - 20, panelY + 10 + i * 24);
    this.panelObjects.push(board);

    const say = (text: string, color: string, y: number, size = 11, weight: 'ui' | 'display' = 'ui') => {
      const t = this.add.text(cxP, y, text, {
        fontSize: `${size}px`, fontFamily: weight === 'ui' ? FONT_UI : FONT_DISPLAY, color, align: 'center',
        wordWrap: { width: panelW - 50 }, lineSpacing: 3,
      }).setOrigin(0.5, 0).setDepth(DEPTH.content);
      this.panelObjects.push(t);
      return t;
    };

    if (!this.pick) {
      say('Pick a specimen from the cabinet to see what entangling it would take.', '#5a5248', panelY + 70, 12);
      return;
    }
    const key = this.pick;
    const quests = entangleQuests(key);
    const done = PlayerData.isElementEntangled(key);
    const active = PlayerData.getResearchingElement() === key;

    if (done) {
      say(`⚛ ${ELEMENT_MAP[key].name} is entangled.`, '#1a4a5a', panelY + 20, 14, 'display');
      say("Quantum can put its abilities on your keys. Build the loadout on Quantum's CUSTOMIZE page.", '#4a4238', panelY + 60, 11);
      return;
    }

    const { done: doneCount, total } = entangleProgress(key);
    say(`⚛ ⇄ ${ELEMENT_MAP[key].name.toUpperCase()}   —   ${doneCount} / ${total}`, '#1a4a5a', panelY + 10, 12, 'display');
    quests.forEach((q, i) => this.renderQuest(q, key, panelX + 20, panelY + 36 + i * 34, panelW - 40, active));

    // Commit / switch. Anything banked on an element stays banked, so switching is not a loss.
    const otherActive = PlayerData.getResearchingElement();
    const label = active ? 'RESEARCHING' : otherActive ? 'SWITCH RESEARCH' : 'BEGIN RESEARCH';
    const btn = addButton(this, {
      x: cxP, y: panelY + panelH + 36, w: 200, h: 34, label, accent: active ? C.steel : Q_CYAN, fontSize: 12,
      onClick: () => {
        if (active) return;
        Sfx.play('ui-equip');
        PlayerData.setResearchingElement(key);
        this.refresh(this.page, [`Researching ${ELEMENT_MAP[key].name}. Progress banks as you play; come back to see it.`]);
      },
    });
    this.panelObjects.push(btn.container);
    if (otherActive && !active) {
      say(`Currently researching ${ELEMENT_MAP[otherActive]?.name ?? otherActive}. Switching keeps its progress.`, T.faint, panelY + panelH + 58, 9);
    }
  }

  /** One quest row: a tick box, what it wants, and a bar showing how far in it is. */
  private renderQuest(q: BondQuest, key: string, left: number, y: number, barW: number, active: boolean): void {
    const have = questProgress(key, q);
    const complete = isQuestDone(key, q);

    const bar = this.add.graphics().setDepth(DEPTH.content);
    fillNotched(bar, left, y, barW, 28, 0xd8d2c0, 0.9, 3, ALL_CORNERS);
    if (have > 0) {
      const frac = Math.min(1, have / q.target);
      fillNotched(bar, left, y, barW * frac, 28, complete ? mix(Q_CYAN, 0xffffff, 0.3) : mix(Q_CYAN, 0xe8e2d0, 0.55), 0.95, 3, ALL_CORNERS);
    }
    strokeNotched(bar, left, y, barW, 28, complete ? mix(Q_CYAN, 0x000000, 0.4) : 0xa9a394, 0.8, 1, 3, ALL_CORNERS);
    // Tick box.
    bar.lineStyle(1.5, 0x2a3a4a, 1); bar.strokeRect(left + 8, y + 8, 12, 12);
    if (complete) { bar.lineStyle(2, 0x1a6a4a, 1); bar.lineBetween(left + 10, y + 14, left + 13, y + 18); bar.lineBetween(left + 13, y + 18, left + 19, y + 9); }
    this.panelObjects.push(bar);

    const text = this.add.text(left + 28, y + 14, q.detail, {
      fontSize: '9.5px', fontFamily: FONT_UI, color: complete ? '#1a3a2a' : active ? '#2a2a2a' : '#5a5248',
      wordWrap: { width: barW - 90 }, maxLines: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);
    const count = this.add.text(left + barW - 8, y + 14, `${have} / ${q.target}`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: complete ? '#1a6a4a' : '#4a4238',
    }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);
    this.panelObjects.push(text, count);
  }
}
