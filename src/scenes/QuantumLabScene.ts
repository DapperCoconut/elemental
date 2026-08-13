import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  BondQuest, bondQuests, bondProgress, isQuestDone, questProgress,
} from '../data/QuantumBonds';
import { ELEMENT_MAP } from '../elements/ElementRegistry';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addCardPlate, addHeaderBar,
  ALL_CORNERS, fillNotched, fillNotchedGradient, strokeNotched, drawGlow,
} from '../ui';
import { Music, Sfx } from '../audio';

/** Quantum's colour, matching `quantumElement.color` and the arena's bond readout. */
const Q_CYAN = 0x7df9ff;
const Q_DEEP = mix(Q_CYAN, 0x000000, 0.78);

const PAGE_SIZE = 12;

/**
 * The Entanglement Lab — where Quantum learns a new pair.
 *
 * Quantum cannot simply be handed two elements; a bond has to be researched first, and only
 * one can be researched at a time. This screen is that choice and the progress against it:
 * pick two elements, see the three quests the pair asks for, and commit to working on it.
 *
 * Switching away from a bond does not wipe what has been banked — quest counts are keyed by
 * bond, so an abandoned pair is waiting where it was left. Only one can *accrue* at a time,
 * which is enforced down in `PlayerData.addBondQuestProgress` rather than here.
 */
export class QuantumLabScene extends Phaser.Scene {
  /** The pair currently shown in the two sockets. Not the same as the researched pair. */
  private pickA: string | null = null;
  private pickB: string | null = null;
  private page = 0;
  private panelObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'QuantumLabScene' });
  }

  /**
   * Every interaction on this screen goes through `scene.restart`, so the sockets and the page
   * have to survive one — `init` runs again on every restart, and defaulting them there would
   * throw away the click that caused it. State arrives back through `data`; only a genuinely
   * fresh entry (no data) falls through to opening on whatever is being researched.
   */
  init(data?: { pickA?: string | null; pickB?: string | null; page?: number }): void {
    this.panelObjects = [];
    if (data && ('pickA' in data || 'pickB' in data || 'page' in data)) {
      this.pickA = data.pickA ?? null;
      this.pickB = data.pickB ?? null;
      this.page = data.page ?? 0;
      return;
    }
    const researching = PlayerData.getResearchingBond();
    // Open on whatever is being worked on, so the screen answers "how am I doing" first.
    const halves = researching ? researching.split('+') : [];
    this.pickA = halves[0] ?? null;
    this.pickB = halves[1] ?? null;
    this.page = 0;
  }

  /** Restart carrying the current sockets and page — see {@link init}. */
  private refresh(page = this.page): void {
    this.scene.restart({ pickA: this.pickA, pickB: this.pickB, page });
  }

  create(): void {
    Music.play('lab');
    const { width, height } = this.scale;
    const cx = width / 2;

    this.buildBackdrop(width, height);

    addHeaderBar(this, {
      title: '⚛  ENTANGLEMENT LAB',
      subtitle: 'BOND TWO ELEMENTS  ·  ONE PAIR AT A TIME',
      accent: Q_CYAN,
      height: 66,
    });

    const back = () => this.scene.start('LabScene');
    addBackButton(this, back, Q_CYAN);
    this.input.keyboard!.on('keydown-ESC', back);

    this.buildSockets(cx);
    this.buildRoster(width, height, cx);
    this.renderPanel(width, cx);
  }

  // ── Backdrop ───────────────────────────────────────────────────────────────

  /** Orbit rings drifting behind the panels — the atom the element is named for, at scale. */
  private buildBackdrop(width: number, height: number): void {
    this.add.rectangle(0, 0, width, height, C.void_).setOrigin(0).setDepth(DEPTH.backdrop);
    const g = this.add.graphics().setDepth(DEPTH.backdrop + 1);
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < 3; i++) {
      const rot = (i * Math.PI) / 3;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      g.lineStyle(1.5, Q_CYAN, 0.07);
      g.beginPath();
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        const ex = Math.cos(a) * 300;
        const ey = Math.sin(a) * 110;
        const px = cx + ex * cos - ey * sin;
        const py = cy + ex * sin + ey * cos;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    }
    drawGlow(g, cx, cy, 150, Q_CYAN, 0.05);
  }

  // ── Sockets ────────────────────────────────────────────────────────────────

  private buildSockets(cx: number): void {
    const y = 150;
    const socket = (x: number, id: string | null, label: string): void => {
      const el = id ? ELEMENT_MAP[id] : null;
      const accent = el ? el.color : C.steel;
      addCardPlate(this, { x, y, w: 108, h: 108, accent, cut: 14, muted: !el });
      this.add.text(x, y - 12, el ? el.emoji : '?', { fontSize: '38px' }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(x, y + 30, el ? el.name.toUpperCase() : label, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: el ? T.bright : T.faint, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    };
    socket(cx - 150, this.pickA, 'FIRST');
    socket(cx + 150, this.pickB, 'SECOND');

    // The bond glyph between them, lit only once both sockets are filled.
    const lit = !!(this.pickA && this.pickB);
    const g = this.add.graphics().setDepth(DEPTH.content);
    g.lineStyle(2, lit ? Q_CYAN : C.steel, lit ? 0.9 : 0.3);
    g.strokeCircle(cx, y, 22);
    g.lineStyle(1.5, lit ? Q_CYAN : C.steel, lit ? 0.55 : 0.2);
    g.strokeCircle(cx, y, 32);
    this.add.text(cx, y, '⚛', {
      fontSize: '22px', color: lit ? hex(Q_CYAN) : hex(C.steel),
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);
  }

  // ── Roster ─────────────────────────────────────────────────────────────────

  /** Every element the player owns and could bond. Quantum itself and the King are out. */
  private bondableElements(): string[] {
    return Object.keys(ELEMENT_MAP).filter((id) => {
      if (id === 'quantum' || id === 'king') return false;
      return PlayerData.isElementUnlocked(id) || ['fire', 'water', 'life', 'air', 'earth'].includes(id);
    });
  }

  private buildRoster(width: number, height: number, cx: number): void {
    const all = this.bondableElements();
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const shown = all.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);

    const y0 = 232;
    const cellW = 74;
    const cellH = 62;
    const perRow = 6;
    const rowW = perRow * cellW;

    shown.forEach((id, i) => {
      const el = ELEMENT_MAP[id];
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = cx - rowW / 2 + col * cellW + cellW / 2;
      const y = y0 + row * cellH;

      const picked = id === this.pickA || id === this.pickB;
      const plate = this.add.graphics().setDepth(DEPTH.content - 1);
      fillNotchedGradient(plate, x - 32, y - 26, 64, 52,
        mix(el.color, 0x000000, picked ? 0.55 : 0.82),
        mix(el.color, 0x000000, 0.92), 1, 6, ALL_CORNERS, 8);
      strokeNotched(plate, x - 32, y - 26, 64, 52, el.color, picked ? 0.95 : 0.35, 1.5, 6, ALL_CORNERS);

      this.add.text(x, y - 8, el.emoji, { fontSize: '20px' }).setOrigin(0.5).setDepth(DEPTH.content);
      this.add.text(x, y + 15, el.name.toUpperCase(), {
        fontSize: '7px', fontFamily: FONT_DISPLAY, color: picked ? T.bright : T.dim, letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content);

      const hit = this.add.rectangle(x, y, 64, 52, 0x000000, 0.001)
        .setDepth(DEPTH.content + 1).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.pickElement(id));
    });

    if (pages > 1) {
      const pager = (dx: number, dir: -1 | 1, label: string) => {
        addButton(this, {
          x: cx + dx, y: y0 + 2 * cellH + 6, w: 40, h: 26, label,
          accent: Q_CYAN, fontSize: 12,
          onClick: () => this.refresh(this.page + dir),
        });
      };
      if (this.page > 0) pager(-rowW / 2 - 34, -1, '<');
      if (this.page < pages - 1) pager(rowW / 2 + 34, 1, '>');
    }
  }

  /**
   * Clicking an element fills the first empty socket, or clears it if it was already in one.
   * Two clicks make a pair; a third replaces the second half, which is the behaviour anyone
   * poking at two slots expects.
   */
  private pickElement(id: string): void {
    Sfx.play('ui-click');
    if (this.pickA === id) this.pickA = null;
    else if (this.pickB === id) this.pickB = null;
    else if (!this.pickA) this.pickA = id;
    else this.pickB = id;
    this.refresh();
  }

  // ── Quest panel ────────────────────────────────────────────────────────────

  private renderPanel(width: number, cx: number): void {
    for (const o of this.panelObjects) if (o.active) (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    this.panelObjects = [];

    const panelY = 386;
    const panelW = 560;
    const panelH = 168;
    const well = this.add.graphics().setDepth(DEPTH.content - 1);
    fillNotched(well, cx - panelW / 2, panelY, panelW, panelH, Q_DEEP, 0.92, 10, ALL_CORNERS);
    strokeNotched(well, cx - panelW / 2, panelY, panelW, panelH, Q_CYAN, 0.35, 1.5, 10, ALL_CORNERS);
    this.panelObjects.push(well);

    const say = (text: string, color: string, y: number, size = 12) => {
      const t = this.add.text(cx, y, text, {
        fontSize: `${size}px`, fontFamily: FONT_UI, color, align: 'center',
        wordWrap: { width: panelW - 40 }, lineSpacing: 4,
      }).setOrigin(0.5, 0).setDepth(DEPTH.content);
      this.panelObjects.push(t);
      return t;
    };

    if (!this.pickA || !this.pickB) {
      say('Pick two elements to see what bonding them would take.', T.faint, panelY + 70, 13);
      return;
    }

    const a = this.pickA;
    const b = this.pickB;
    const key = PlayerData.bondKey(a, b);
    const quests = bondQuests(a, b);
    const done = PlayerData.isBondResearched(a, b);
    const active = PlayerData.getResearchingBond() === key;

    if (done) {
      say(`⚛ ${ELEMENT_MAP[a].name} ⇄ ${ELEMENT_MAP[b].name} is bonded.`, hex(Q_CYAN), panelY + 16, 15);
      say('Quantum can carry this pair. Choose it on the element screen before a fight.',
        T.dim, panelY + 44, 12);
      return;
    }

    const { done: doneCount, total } = bondProgress(a, b);
    say(`${ELEMENT_MAP[a].name} ⇄ ${ELEMENT_MAP[b].name}  —  ${doneCount} / ${total} complete`,
      hex(Q_CYAN), panelY + 12, 14);

    quests.forEach((q, i) => this.renderQuest(q, key, cx, panelY + 40 + i * 34, panelW, active));

    // Commit / switch. Anything banked on a bond stays banked, so switching is not a loss.
    const otherActive = PlayerData.getResearchingBond();
    const label = active ? 'RESEARCHING' : otherActive ? 'SWITCH RESEARCH' : 'BEGIN RESEARCH';
    const btn = addButton(this, {
      x: cx, y: panelY + panelH + 26, w: 200, h: 34, label,
      accent: active ? C.steel : Q_CYAN, fontSize: 12,
      onClick: () => {
        if (active) return;
        Sfx.play('ui-equip');
        PlayerData.setResearchingBond(key);
        this.refresh();
      },
    });
    this.panelObjects.push(btn.container);

    if (otherActive && !active) {
      const halves = otherActive.split('+');
      say(`Currently researching ${ELEMENT_MAP[halves[0]]?.name ?? halves[0]} ⇄ `
        + `${ELEMENT_MAP[halves[1]]?.name ?? halves[1]}. Switching keeps its progress.`,
        T.faint, panelY + panelH + 48, 10);
    }
  }

  /** One quest row: a name, what it wants, and a bar showing how far in it is. */
  private renderQuest(
    q: BondQuest, key: string, cx: number, y: number, panelW: number, active: boolean,
  ): void {
    const have = questProgress(key, q);
    const complete = isQuestDone(key, q);
    const left = cx - panelW / 2 + 20;
    const barW = panelW - 40;

    const bar = this.add.graphics().setDepth(DEPTH.content);
    fillNotched(bar, left, y, barW, 28, mix(C.void_, Q_CYAN, 0.06), 0.9, 5, ALL_CORNERS);
    if (have > 0) {
      const frac = Math.min(1, have / q.target);
      fillNotched(bar, left, y, barW * frac, 28,
        complete ? mix(Q_CYAN, 0x000000, 0.55) : mix(Q_CYAN, 0x000000, 0.75), 0.95, 5, ALL_CORNERS);
    }
    strokeNotched(bar, left, y, barW, 28, complete ? Q_CYAN : C.line, complete ? 0.9 : 0.4, 1, 5, ALL_CORNERS);
    this.panelObjects.push(bar);

    const tick = this.add.text(left + 10, y + 14, complete ? '✔' : '○', {
      fontSize: '13px', color: complete ? hex(Q_CYAN) : T.faint,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);

    const text = this.add.text(left + 30, y + 14, q.detail, {
      fontSize: '10px', fontFamily: FONT_UI,
      color: complete ? T.bright : active ? T.dim : T.faint,
      wordWrap: { width: barW - 110 },
      maxLines: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);

    const count = this.add.text(left + barW - 10, y + 14, `${have} / ${q.target}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: complete ? hex(Q_CYAN) : T.dim,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content + 1);

    this.panelObjects.push(tick, text, count);
  }
}
