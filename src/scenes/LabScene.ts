import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { isCheatMode } from '../data/Cheats';
import { findRecipe, Recipe } from '../data/Recipes';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';
import { findPerkRecipe, findQuadPerkRecipe, findPentaPerkRecipe, findAbstractTriplePerkRecipe, PerkDef, ALL_PERKS } from '../data/Perks';
import { DIVINE_PERKS } from '../data/DivinePerks';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addChip, addHeaderBar, addIconButton,
  addTabs, addRowPlate, addModal, addElementCrest,
} from '../ui';
import { LabBench } from '../ui/LabBench';
import { drawPlank, WOOD } from '../ui/Woodwork';
import { SpeechBubble } from '../ui/SpeechBubble';
import { Alchemist } from '../ui/characters/Alchemist';
import { Music, Sfx } from '../audio';

type LabMode = 'elements' | 'perks' | 'quad-perks' | 'penta-perks';

/** Per-mode accent — the chalkboard re-lights when you change forge mode. */
const MODE_ACCENT: Record<LabMode, number> = {
  'elements': 0x9d5cff,
  'perks': 0x4fc3ff,
  'quad-perks': 0xffaa44,
  'penta-perks': 0xd946ef,
};

/** How many vials the flask takes in each mode. */
const CAPACITY: Record<LabMode, number> = { 'elements': 2, 'perks': 3, 'quad-perks': 4, 'penta-perks': 5 };

/** A forge ingredient. */
interface LabElement { id: string; name: string; emoji: string; color: number }

const BASE_ELEMENTS: LabElement[] = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '💨', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
];

const ALL_ABSTRACT_ELEMENTS: LabElement[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

/** What pressing COMBINE amounts to, decided before anything is animated. */
type Outcome =
  | { kind: 'say'; say: string; mood: 'thinking' | 'grumpy' }
  | { kind: 'explode'; say: string }
  | { kind: 'element'; recipe: Recipe; say: string }
  | { kind: 'perk'; perk: PerkDef; say: string };

const FLASK_X = 480;
const FLASK_Y = 338;
const BENCH_Y = 446;
const VIAL_H = 58;

export class LabScene extends Phaser.Scene {
  private labMode: LabMode = 'elements';
  /** The flask, the vials and every animation between them. */
  private bench!: LabBench;

  private alchemist: Alchemist | null = null;
  private bubble: SpeechBubble | null = null;
  private nucleiChip!: { setValue: (v: string) => void };
  private combineLabel!: Phaser.GameObjects.Text;
  private perkBookObjects: Phaser.GameObjects.GameObject[] = [];
  private perkBookScrollHandler: (...args: unknown[]) => void = () => {};

  constructor() {
    super({ key: 'LabScene' });
  }

  init(data: { labMode?: LabMode }): void {
    this.labMode = data?.labMode ?? 'elements';
    this.alchemist = null;
    this.bubble = null;
    this.perkBookObjects = [];
  }

  create(): void {
    Music.play('lab');
    const { width, height } = this.scale;
    const cx = width / 2;
    const accent = MODE_ACCENT[this.labMode];
    const labLevel = PlayerData.getLabLevel();

    this.paintRoom(width, height, accent, labLevel);

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // The King's own lab is below this one. Nothing hints at it until he is dead — after
    // that the floor is quietly marked.
    if (PlayerData.isKingDefeated()) {
      const prompt = this.add.text(cx, height - 16, '◈   P R E S S   S P A C E   ◈', {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0x000000, 0.25)), letterSpacing: 4,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      this.tweens.add({ targets: prompt, alpha: { from: 0.35, to: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.input.keyboard!.on('keydown-SPACE', () => {
        this.cameras.main.fade(280, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('DisgracedLabScene'));
      });
    }

    // The Entanglement Lab, where Quantum is taught a new element. Cheat mode counts as
    // unlocked for the same reason the rosters treat it that way.
    if (PlayerData.isElementUnlocked('quantum') || isCheatMode()) {
      addButton(this, {
        x: 96, y: height - 36, w: 150, h: 32, label: '⚛ ENTANGLEMENT', accent: 0x7df9ff, fontSize: 11,
        onClick: () => this.scene.start('QuantumLabScene'),
      });
    }

    this.nucleiChip = addChip(this, {
      x: width - 60, y: 26, icon: '⚛️', value: `×${PlayerData.getNuclei()}`, accent: C.arcane, originX: 1,
    });
    addIconButton(this, {
      x: width - 32, y: 26, r: 17, icon: '📖', accent: C.arcane, tooltip: 'Perk dictionary',
      onClick: () => this.showPerkBook(),
    });

    // ── Mode tabs, chalked under the board ──
    const tabModes: LabMode[] = ['elements', 'perks', 'quad-perks', 'penta-perks'];
    const tabUnlocked = [true, labLevel >= 2, labLevel >= 3, labLevel >= 4];
    addTabs(this, {
      x: cx, y: 150, tabW: 96, tabH: 28,
      active: tabModes.indexOf(this.labMode),
      tabs: tabModes.map((mode, idx) => ({
        label: ['ELEMENTS', 'PERKS', 'QUAD', 'PENTA'][idx],
        accent: MODE_ACCENT[mode],
        disabled: !tabUnlocked[idx],
        hint: tabUnlocked[idx] ? undefined : `LV.${idx + 1}`,
      })),
      onSelect: (idx) => { if (this.labMode !== tabModes[idx]) this.scene.restart({ labMode: tabModes[idx] }); },
    });

    // ── The bench: alchemist, flask, vials, the big red button ──
    this.alchemist = new Alchemist(this, 150, BENCH_Y - 4, { scale: 0.9, depth: DEPTH.panel + 2 });
    // The bubble sits over his head in the top-left (x ≤ 250): clear of the flask, the vials
    // and the result cards, which all live right of x = 250.
    const m = this.alchemist.mouth();
    this.bubble = new SpeechBubble(this, {
      anchorX: m.x - 22, anchorY: m.y - 72, side: 'right', width: 190, offsetX: -120, accent: accent,
      depth: DEPTH.modal + 60, onTalk: (on) => this.alchemist?.setTalking(on),
    });

    this.bench = new LabBench(this, {
      flaskX: FLASK_X, flaskY: FLASK_Y, capacity: CAPACITY[this.labMode],
      elements: this.getAvailableElements(),
      fullLine: 'Flask is full. Press COMBINE, or click the flask to empty it.',
      say: (line) => { this.alchemist?.setMood('grumpy', 1500); this.bubble?.say([line]); },
      onPoured: (el, _poured, left) => {
        this.alchemist?.setMood('pleased', 1200);
        this.refreshNuclei();
        this.bubble?.say([left > 0 ? `${el.name} in. ${left} more.` : `${el.name} in. The flask is full — press COMBINE.`]);
      },
      onEmptied: () => { this.refreshNuclei(); this.bubble?.say(['Flask emptied. Nothing spent.']); },
    });

    this.buildVials(width);
    this.buildCombineButton(cx, accent);

    this.time.delayedCall(350, () => this.bubble?.say([this.openingLine()], { silent: true }));
  }

  update(_time: number, delta: number): void {
    this.bench.update(delta);
  }

  // ── The room ───────────────────────────────────────────────────────

  /** Slate tiles, a chalkboard with the title and the instruction, the bench, a wall shelf. */
  private paintRoom(width: number, height: number, accent: number, labLevel: number): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    g.fillStyle(0x0d1216, 1); g.fillRect(0, 0, width, height);
    // Tiles, offset every other row, grout dark.
    const tw = 48;
    const th = 30;
    for (let row = 0; row * th < BENCH_Y; row++) {
      for (let col = -1; col * tw < width + tw; col++) {
        const x = col * tw + (row % 2 ? tw / 2 : 0);
        const y = row * th;
        const h = Math.sin((row * 7 + col * 13) * 12.9898) * 43758.5453;
        const u = h - Math.floor(h);
        g.fillStyle(mix(0x1c2a30, 0x24363c, u), 1);
        g.fillRect(x + 1, y + 1, tw - 2, th - 2);
        g.fillStyle(0xffffff, 0.04); g.fillRect(x + 1, y + 1, tw - 2, 1.5);
      }
    }
    // Light falls from above the bench; the top of the wall darkens.
    for (let k = 0; k < 14; k++) { g.fillStyle(0x000000, 0.05); g.fillRect(0, k * 10, width, 10); }
    for (let k = 10; k >= 1; k--) { g.fillStyle(accent, 0.012); g.fillCircle(FLASK_X, FLASK_Y, k * 30); }
    // Floor below the bench front: dark boards.
    g.fillStyle(0x0a0d10, 1); g.fillRect(0, BENCH_Y, width, height - BENCH_Y);
    // Vignette.
    for (let k = 0; k < 18; k++) {
      g.fillStyle(0x000000, 0.04 * (1 - k / 18));
      g.fillRect(k * 5, 0, 5, height); g.fillRect(width - k * 5 - 5, 0, 5, height);
      g.fillRect(0, height - k * 5 - 5, width, 5);
    }

    // ── Chalkboard ──
    const bx = width / 2;
    const bw = 540;
    const bh = 104;
    const by = 72;
    const b = this.add.graphics().setDepth(DEPTH.panel);
    g.fillStyle(0x000000, 0.4); g.fillRect(bx - bw / 2 + 4, by - bh / 2 + 6, bw, bh);
    drawPlank(b, bx - bw / 2 - 8, by - bh / 2 - 8, bw + 16, 8, { seed: 1 });
    drawPlank(b, bx - bw / 2 - 8, by + bh / 2, bw + 16, 8, { seed: 2 });
    drawPlank(b, bx - bw / 2 - 8, by - bh / 2, 8, bh, { seed: 3, vertical: true });
    drawPlank(b, bx + bw / 2, by - bh / 2, 8, bh, { seed: 4, vertical: true });
    b.fillStyle(0x1f3a2e, 1); b.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    // Chalk dust and half-erased ghosts of old formulas.
    for (let i = 0; i < 9; i++) {
      const h = Math.sin(i * 91.7) * 43758.5453;
      const u = h - Math.floor(h);
      b.fillStyle(0xffffff, 0.035); b.fillEllipse(bx - bw / 2 + u * bw, by - bh / 2 + ((u * 3.7) % 1) * bh, 40 + u * 60, 10);
    }
    b.lineStyle(1, 0xffffff, 0.08);
    for (let i = 0; i < 4; i++) {
      const y = by - bh / 2 + 14 + i * 24;
      b.lineBetween(bx - bw / 2 + 12, y, bx - bw / 2 + 12 + 60 + (i * 37) % 80, y + (i % 2 ? 2 : -2));
    }
    // Chalk tray with a stub of chalk.
    b.fillStyle(WOOD.dark, 1); b.fillRect(bx - 90, by + bh / 2 + 8, 180, 6);
    b.fillStyle(0xf1ece0, 1); b.fillRect(bx + 40, by + bh / 2 + 4, 16, 5);
    b.fillStyle(mix(accent, 0xffffff, 0.5), 1); b.fillRect(bx + 62, by + bh / 2 + 4, 12, 5);

    this.add.text(bx, by - 30, labLevel === 0 ? 'THE LAB' : `THE LAB  ·  LEVEL ${labLevel}`, {
      fontSize: '22px', fontFamily: FONT_DISPLAY, color: '#f1ece0', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0.92);
    const chalkAccent = hex(mix(accent, 0xffffff, 0.55));
    this.add.text(bx, by + 2, this.instruction(), {
      fontSize: '13px', fontFamily: FONT_UI, color: chalkAccent, align: 'center', wordWrap: { width: bw - 40 },
    }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0.9);
    this.add.text(bx, by + 30, `${CAPACITY[this.labMode]} VIALS  →  COMBINE  ·  ${this.costLine()}`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#cfd8d0', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0.75);

    // ── Bench ──
    const bench = this.add.graphics().setDepth(DEPTH.panel + 3);
    drawPlank(bench, -4, BENCH_Y, width + 8, 18, { seed: 21, lit: 0.12, nails: false });
    bench.fillStyle(WOOD.dark, 1); bench.fillRect(-4, BENCH_Y + 18, width + 8, 4);
    drawPlank(bench, -4, BENCH_Y + 22, width + 8, height - BENCH_Y - 22, { seed: 22, lit: -0.2 });
    // Drawers along the front, with brass pulls.
    for (const dx of [250, 640, 790]) {
      bench.fillStyle(0x000000, 0.3); bench.fillRoundedRect(dx - 56, BENCH_Y + 40, 112, 44, 3);
      bench.lineStyle(1, WOOD.lit, 0.35); bench.strokeRoundedRect(dx - 52, BENCH_Y + 44, 104, 36, 2);
      bench.fillStyle(0xc89a3c, 1); bench.fillRoundedRect(dx - 10, BENCH_Y + 60, 20, 5, 2);
    }
    // Stains and a scorch on the bench top around the flask.
    bench.fillStyle(0x000000, 0.25); bench.fillEllipse(FLASK_X, BENCH_Y + 8, 150, 12);
    bench.fillStyle(mix(accent, 0x000000, 0.5), 0.25); bench.fillEllipse(FLASK_X - 90, BENCH_Y + 9, 30, 6);
    bench.fillStyle(0x3a6a2a, 0.3); bench.fillEllipse(610, BENCH_Y + 7, 22, 5);
    // Open notebook and a quill on the left of the flask, by the alchemist's hand.
    bench.fillStyle(0xe6d7b0, 1); bench.fillRect(286, BENCH_Y - 10, 70, 12);
    bench.fillStyle(0xd0c09a, 1); bench.fillRect(321, BENCH_Y - 10, 35, 12);
    bench.lineStyle(1, 0x4a3a2a, 0.6);
    for (let i = 0; i < 3; i++) { bench.lineBetween(292, BENCH_Y - 7 + i * 3, 316, BENCH_Y - 7 + i * 3); bench.lineBetween(326, BENCH_Y - 7 + i * 3, 350, BENCH_Y - 7 + i * 3); }
    bench.lineStyle(2, 0x2a2a3a, 1); bench.lineBetween(360, BENCH_Y - 2, 384, BENCH_Y - 26);
  }

  private instruction(): string {
    switch (this.labMode) {
      case 'perks': return 'Pour three vials — base or abstract — and press COMBINE to forge a perk.';
      case 'quad-perks': return 'Pour four vials — base or abstract — and press COMBINE for a quad perk.';
      case 'penta-perks': return 'Pour all five and press COMBINE for a penta perk.';
      default: return 'Pour two vials into the flask and press COMBINE.';
    }
  }

  private costLine(): string {
    switch (this.labMode) {
      case 'perks': return '2–4 ⚛️';
      case 'quad-perks': return '5 ⚛️';
      case 'penta-perks': return '10 ⚛️';
      default: return '1 ⚛️  (3 ⚛️ ABSTRACT)';
    }
  }

  private openingLine(): string {
    const n = PlayerData.getNuclei();
    switch (this.labMode) {
      case 'perks': return `Perk mode. Three vials, then COMBINE. Two nuclei for a base perk, four with an abstract in it. You have ${n}.`;
      case 'quad-perks': return `Quad perks. Four vials, five nuclei each. You have ${n}.`;
      case 'penta-perks': return `Penta perks. All five vials, ten nuclei each. You have ${n}.`;
      default: return `Nuclei: ${n}. Pour two vials into the flask and press COMBINE. One nucleus a mix, three for two abstracts.`;
    }
  }

  // ── Vials ──────────────────────────────────────────────────────────

  private getUnlockedAbstractElements(): LabElement[] {
    const completed = PlayerData.getCompletedGauntlets();
    return ALL_ABSTRACT_ELEMENTS.filter((el) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[el.id];
      return needed ? completed.includes(needed) : false;
    });
  }

  private getAvailableElements(): LabElement[] {
    return [...BASE_ELEMENTS, ...this.getUnlockedAbstractElements()];
  }

  /** Base vials in a rack on the bench; abstract vials on a wall shelf above them. */
  private buildVials(width: number): void {
    const rackLeft = 590;
    const rackW = width - rackLeft - 40;
    const step = rackW / BASE_ELEMENTS.length;
    // The rack: a plank with holes the vials stand in.
    const rack = this.add.graphics().setDepth(DEPTH.panel + 4);
    drawPlank(rack, rackLeft, BENCH_Y - 22, rackW, 10, { seed: 31, lit: 0.05 });
    for (let i = 0; i < BASE_ELEMENTS.length; i++) {
      rack.fillStyle(0x0a0806, 1); rack.fillEllipse(rackLeft + step * (i + 0.5), BENCH_Y - 17, 24, 7);
    }
    for (const lx of [rackLeft + 8, rackLeft + rackW - 8]) {
      rack.fillStyle(WOOD.dark, 1); rack.fillRect(lx - 3, BENCH_Y - 14, 6, 14);
    }
    BASE_ELEMENTS.forEach((el, i) => this.bench.addVial(el, rackLeft + step * (i + 0.5), BENCH_Y - 18));

    const abstract = this.getUnlockedAbstractElements();
    if (abstract.length > 0) {
      const shelfY = 300;
      const shelf = this.add.graphics().setDepth(DEPTH.panel);
      for (let i = 0; i < 5; i++) { shelf.fillStyle(0x000000, 0.1 * (1 - i / 5)); shelf.fillRect(rackLeft, shelfY + 10 + i * 2, rackW, 2); }
      drawPlank(shelf, rackLeft, shelfY, rackW, 10, { seed: 32 });
      shelf.fillStyle(WOOD.dark, 1); shelf.fillRect(rackLeft, shelfY + 10, rackW, 3);
      for (const bx of [rackLeft + 20, rackLeft + rackW - 20]) {
        shelf.lineStyle(3, 0x3b3a44, 1); shelf.beginPath(); shelf.moveTo(bx, shelfY + 12); shelf.lineTo(bx, shelfY + 30); shelf.lineTo(bx + 14, shelfY + 12); shelf.strokePath();
      }
      this.add.text(rackLeft + rackW / 2, shelfY - VIAL_H - 30, 'ABSTRACT', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0xffffff, 0.3)), letterSpacing: 3,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      const astep = rackW / Math.max(abstract.length, 3);
      abstract.forEach((el, i) => this.bench.addVial(el, rackLeft + astep * (i + 0.5), shelfY - 1));
    }
  }

  // ── Combine ────────────────────────────────────────────────────────

  /** The big red button on the bench front. */
  private buildCombineButton(cx: number, accent: number): void {
    const bx = cx;
    const by = BENCH_Y + 96;
    const g = this.add.graphics().setDepth(DEPTH.content);
    const paint = (down: number, lit: number): void => {
      g.clear();
      // Brass plate screwed to the drawer front.
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(bx - 68, by - 48, 136, 100, 8);
      g.fillStyle(0x8a6a2a, 1); g.fillRoundedRect(bx - 66, by - 50, 132, 100, 8);
      g.fillStyle(0xc89a3c, 1); g.fillRoundedRect(bx - 62, by - 46, 124, 92, 6);
      g.lineStyle(1, 0xf0d48a, 0.5); g.strokeRoundedRect(bx - 58, by - 42, 116, 84, 5);
      for (const [sx, sy] of [[bx - 56, by - 40], [bx + 56, by - 40], [bx - 56, by + 40], [bx + 56, by + 40]]) {
        g.fillStyle(0x3b3a44, 1); g.fillCircle(sx, sy, 2.4);
        g.fillStyle(0x9a9aae, 1); g.fillRect(sx - 2, sy - 0.5, 4, 1);
      }
      // The button: a fat red dome in a dark well, sinking when pressed.
      g.fillStyle(0x1a0a0a, 1); g.fillCircle(bx, by - 8, 32);
      const r = 28 - down * 2;
      const dy = down * 4;
      g.fillStyle(mix(C.blood, 0x000000, 0.45), 1); g.fillCircle(bx, by - 8 + dy + 3, r);
      g.fillStyle(mix(C.blood, 0xffffff, lit * 0.2), 1); g.fillCircle(bx, by - 8 + dy, r);
      g.fillStyle(mix(C.blood, 0xffffff, 0.35 + lit * 0.2), 1); g.fillCircle(bx - 6, by - 16 + dy, r * 0.5);
      g.fillStyle(0xffffff, 0.75); g.fillEllipse(bx - 10, by - 20 + dy, 10, 5);
      for (let k = 3; k >= 1; k--) { g.fillStyle(accent, 0.05 * lit); g.fillCircle(bx, by - 8, 34 + k * 8); }
    };
    paint(0, 0);
    this.combineLabel = this.add.text(bx, by + 32, `COMBINE  ·  ${this.combineCost()}`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#2a1a08', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);

    const hit = this.add.circle(bx, by - 8, 34, 0xffffff, 0).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(0, 1); Sfx.play('ui-hover'); });
    hit.on('pointerout', () => paint(0, 0));
    hit.on('pointerdown', () => {
      paint(1, 1);
      this.time.delayedCall(140, () => paint(0, 1));
      this.combine();
    });
  }

  /** The nuclei the current flask would cost, for the label under the button. */
  private combineCost(): string {
    switch (this.labMode) {
      case 'perks': return '2–4 ⚛️';
      case 'quad-perks': return '5 ⚛️';
      case 'penta-perks': return '10 ⚛️';
      default: {
        const abs = this.bench.poured.filter((id) => ABSTRACT_ELEMENT_IDS.includes(id)).length;
        return abs === 2 ? '3 ⚛️' : '1 ⚛️';
      }
    }
  }

  private names(ids: string[]): string {
    return ids.map((id) => this.getAvailableElements().find((e) => e.id === id)?.name ?? id).join(' + ');
  }

  /** Decide what the flask makes — and pay for it — without animating anything yet. */
  private evaluate(): Outcome {
    const cap = CAPACITY[this.labMode];
    const ids = this.bench.poured;
    if (ids.length < cap) {
      return { kind: 'say', mood: 'thinking', say: `${cap - ids.length} more vial${cap - ids.length === 1 ? '' : 's'} first.` };
    }
    const have = PlayerData.getNuclei();
    const broke = (cost: number): Outcome => ({ kind: 'say', mood: 'grumpy', say: `That mix needs ${cost} nucle${cost === 1 ? 'us' : 'i'}. You have ${have}. The shop sells them.` });

    if (this.labMode === 'elements') {
      const [a, b] = ids;
      const a1 = ABSTRACT_ELEMENT_IDS.includes(a);
      const a2 = ABSTRACT_ELEMENT_IDS.includes(b);
      // Mixed base + abstract: fails and wastes 1 nucleus.
      if (a1 !== a2) {
        if (!PlayerData.spendNucleus()) return broke(1);
        this.refreshNuclei();
        return { kind: 'explode', say: `${this.names(ids)}: base and abstract don't mix. One nucleus wasted. ${PlayerData.getNuclei()} left.` };
      }
      if (a1 && a2 && PlayerData.getLabLevel() < 1) {
        return { kind: 'say', mood: 'grumpy', say: 'Abstract fusion needs Lab level 1. The shop sells it.' };
      }
      const recipe = findRecipe(a, b);
      if (!recipe) return { kind: 'explode', say: `${this.names(ids)} → nothing. No recipe. Nothing spent.` };
      if (PlayerData.isElementUnlocked(recipe.result)) {
        return { kind: 'say', mood: 'thinking', say: `${this.names(ids)} → ${recipe.resultName}. Already discovered. Nothing spent.` };
      }
      const cost = a1 && a2 ? 3 : 1;
      if (!PlayerData.spendNuclei(cost)) return broke(cost);
      PlayerData.unlockElement(recipe.result);
      this.refreshNuclei();
      return { kind: 'element', recipe, say: `${this.names(ids)} → ${recipe.resultName}. ${cost} nucle${cost === 1 ? 'us' : 'i'} spent, ${PlayerData.getNuclei()} left.` };
    }

    let recipe: PerkDef | undefined;
    let cost: number;
    if (this.labMode === 'perks') {
      const baseRecipe = findPerkRecipe(ids[0], ids[1], ids[2]);
      recipe = baseRecipe ?? findAbstractTriplePerkRecipe(ids[0], ids[1], ids[2]);
      cost = baseRecipe ? 2 : 4;
    } else if (this.labMode === 'quad-perks') {
      recipe = findQuadPerkRecipe(ids[0], ids[1], ids[2], ids[3]);
      cost = 5;
    } else {
      recipe = findPentaPerkRecipe(ids[0], ids[1], ids[2], ids[3], ids[4]);
      cost = 10;
    }
    if (!recipe) return { kind: 'explode', say: `${this.names(ids)} → no perk. Nothing spent.` };
    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) {
      return { kind: 'say', mood: 'thinking', say: `${recipe.name}. Already forged. Nothing spent.` };
    }
    if (!PlayerData.spendNuclei(cost)) return broke(cost);
    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.refreshNuclei();
    return { kind: 'perk', perk: recipe, say: `${this.names(ids)} → ${recipe.name}. ${cost} nuclei spent, ${PlayerData.getNuclei()} left.` };
  }

  private combine(): void {
    if (this.bench.busy) return;
    const outcome = this.evaluate();
    if (outcome.kind === 'say') {
      Sfx.play('ui-denied');
      this.alchemist?.setMood(outcome.mood, 1800);
      this.bubble?.say([outcome.say]);
      return;
    }
    this.bubble?.hide();
    this.alchemist?.lookAt(FLASK_X, FLASK_Y);
    // Heat the flask: the burner comes up and the mix boils for a beat before it resolves.
    this.bench.heatThen(() => {
      if (outcome.kind === 'explode') {
        this.alchemist?.blacken(1);
        this.bench.explode(() => this.bubble?.say([outcome.say], { hold: 1200 }));
        return;
      }
      const color = outcome.kind === 'element' ? (findElementDef(outcome.recipe.result)?.color ?? C.arcane) : MODE_ACCENT[this.labMode];
      this.alchemist?.setMood('pleased', 3000);
      this.bench.succeed(color, () => {
        if (outcome.kind === 'element') this.showDiscoveryPopup(outcome.recipe.result, outcome.recipe.resultName, outcome.recipe.resultEmoji);
        else this.showPerkDiscoveryPopup(outcome.perk);
        this.bubble?.say([outcome.say], { hold: 1500 });
      });
    });
  }

  private refreshNuclei(): void {
    this.nucleiChip.setValue(`×${PlayerData.getNuclei()}`);
    this.combineLabel?.setText(`COMBINE  ·  ${this.combineCost()}`);
  }

  /** Clear the bench after a card is dismissed. */
  private resetBench(): void {
    this.bench.reset();
    this.refreshNuclei();
  }

  // ── Cards ──────────────────────────────────────────────────────────

  /**
   * The payoff moment for a fusion: the element you just made, standing in the frame.
   */
  private showDiscoveryPopup(elementId: string, name: string, emoji: string): void {
    const { width } = this.scale;
    const cx = width / 2;
    const accent = findElementDef(elementId)?.color ?? C.arcane;
    const objects: Phaser.GameObjects.GameObject[] = [];

    const modal = addModal(this, {
      w: 460, h: 344, accent, glow: 0.6, title: '✨  NEW ELEMENT DISCOVERED', depth: DEPTH.modal + 40,
    });
    objects.push(modal.scrim, ...modal.objects);

    const crest = addElementCrest(this, {
      x: cx, y: modal.contentTop + 78, w: 172, h: 138, elementId, name: `${emoji}  ${name}`, accent,
      mastered: PlayerData.isMasteryEnabled(elementId), depth: DEPTH.modal + 41, portraitScale: 0.78,
    });
    objects.push(...crest.objects);

    objects.push(this.add.text(cx, modal.contentTop + 168, `${emoji}  ${name.toUpperCase()}`, {
      fontSize: '28px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 2,
      stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.modal + 42));
    objects.push(this.add.text(cx, modal.contentTop + 196, 'Now available in Element Select', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modal + 42));

    objects.push(addButton(this, {
      x: cx, y: modal.bottom - 38, w: 180, h: 44, label: 'CONTINUE', icon: '✔', accent, variant: 'solid', fontSize: 15,
      depth: DEPTH.modal + 42,
      onClick: () => { for (const o of objects) o.destroy(); this.resetBench(); },
    }).container);
  }

  /** The same moment for a forged perk — a struck sigil rather than a character. */
  private showPerkDiscoveryPopup(perk: PerkDef): void {
    const { width } = this.scale;
    const cx = width / 2;
    const isPenta = perk.tier === 'penta';
    const isQuad = perk.tier === 'quad';
    const isAbstract = perk.tier === 'abstract-triple';
    const accent = isPenta ? 0xcc44ff : isQuad ? 0xffaa44 : isAbstract ? 0xcc66ff : 0x44aaff;
    const heading = isPenta ? 'PENTA PERK FORGED' : isQuad ? 'QUAD PERK FORGED' : isAbstract ? 'ABSTRACT PERK FORGED' : 'NEW PERK FORGED';

    const objects: Phaser.GameObjects.GameObject[] = [];
    const modal = addModal(this, { w: 480, h: 342, accent, glow: 0.6, title: `${perk.emoji}  ${heading}`, depth: DEPTH.modal + 40 });
    objects.push(modal.scrim, ...modal.objects);
    objects.push(this.add.text(cx, modal.contentTop + 50, perk.emoji, { fontSize: '46px' }).setOrigin(0.5).setDepth(DEPTH.modal + 42));
    objects.push(this.add.text(cx, modal.contentTop + 104, perk.name.toUpperCase(), {
      fontSize: '24px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.6)), letterSpacing: 1.5, align: 'center', wordWrap: { width: 400 },
    }).setOrigin(0.5).setDepth(DEPTH.modal + 42));
    objects.push(this.add.text(cx, modal.contentTop + 134, perk.description, {
      fontSize: '13px', fontFamily: FONT_UI, color: T.normal, align: 'center', wordWrap: { width: 380 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modal + 42));
    objects.push(this.add.text(cx, modal.bottom - 74, `Equip on ${perk.elementId.toUpperCase()} in Element Select`, {
      fontSize: '11px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modal + 42));
    objects.push(addButton(this, {
      x: cx, y: modal.bottom - 36, w: 180, h: 42, label: 'CONTINUE', icon: '✔', accent, variant: 'solid', fontSize: 15,
      depth: DEPTH.modal + 42,
      onClick: () => { for (const o of objects) o.destroy(); this.resetBench(); },
    }).container);
  }

  // ── Perk book ──────────────────────────────────────────────────────

  private showPerkBook(): void {
    this.closePerkBook();
    const { width, height } = this.scale;
    const cx = width / 2;

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    const SCROLL_TOP = 104;
    const SCROLL_BOT = height - 52;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50).setInteractive();
    this.perkBookObjects.push(bg);

    const headerBar = addHeaderBar(this, {
      title: '📖  PERK DICTIONARY', subtitle: 'CRAFT PERKS IN THE LAB TO EQUIP THEM ON AN ELEMENT', accent: C.arcane, height: 74, depth: 54,
    });
    this.perkBookObjects.push(headerBar.g, headerBar.titleText);
    if (headerBar.subtitleText) this.perkBookObjects.push(headerBar.subtitleText);

    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(51);
    this.perkBookObjects.push(scrollContainer);
    const maskGfx = this.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    scrollContainer.setMask(maskGfx.createGeometryMask());
    this.perkBookObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    const NAME_Y = 10;
    const DESC_Y = 28;
    const ROW_PAD = 10;
    let innerY = 8;

    const tiers: Array<'triple' | 'abstract-triple' | 'quad' | 'penta' | 'divine'> = ['triple', 'abstract-triple', 'quad', 'penta', 'divine'];
    for (const tier of tiers) {
      // Divine perks live in their own table (they are forged downstairs), but read identically.
      const allTierPerks = tier === 'divine' ? DIVINE_PERKS : ALL_PERKS.flatMap((ep) => ep.perks.filter((p) => p.tier === tier));
      if (allTierPerks.length === 0) continue;

      const tierLabel = tier === 'triple' ? '— TRIPLE PERKS  (Lab Level 2 · 2 ⚛️) —'
        : tier === 'abstract-triple' ? '— ABSTRACT PERKS  (Lab Level 2 · 4 ⚛️) —'
        : tier === 'quad' ? '— QUAD PERKS  (Lab Level 3 · 5 ⚛️)  ·  Perkaholic Mutation —'
        : tier === 'penta' ? '— PENTA PERKS  (Penta Synthesis · 10 ⚛️) —'
        : '— DIVINE PERKS  (Disgraced Lab · 1 💠) —';
      const tierColor = tier === 'divine' ? hex(mix(C.corrupt, 0xffffff, 0.6))
        : tier === 'penta' ? hex(mix(C.corrupt, 0xffffff, 0.4))
        : tier === 'quad' ? T.gold
        : tier === 'abstract-triple' ? hex(mix(C.arcane, 0xffffff, 0.4))
        : hex(mix(C.frost, 0xffffff, 0.3));

      scrollContainer.add(this.add.text(cx, innerY, tierLabel, { fontSize: '10px', fontFamily: FONT_DISPLAY, color: tierColor, letterSpacing: 2 }).setOrigin(0.5));
      innerY += 20;

      for (const perk of allTierPerks) {
        const unlocked = PlayerData.isPerkUnlocked(perk.elementId, perk.id);
        const equipped = PlayerData.getEquippedPerk(perk.elementId) === perk.id;
        const alpha = unlocked ? 1.0 : 0.35;
        const tierAccent = tier === 'penta' || tier === 'divine' ? C.corrupt : tier === 'quad' ? C.gold : tier === 'abstract-triple' ? C.arcane : C.frost;

        const descText = this.add.text(COL_X + 12, innerY + DESC_Y, perk.description, {
          fontSize: '9px', fontFamily: FONT_UI, color: unlocked ? T.dim : T.ghost, wordWrap: { width: COL_W - 24 },
        }).setAlpha(alpha);
        const rowH = DESC_Y + descText.height + ROW_PAD;
        const row = addRowPlate(this, { x: cx, y: innerY + rowH / 2, w: COL_W, h: rowH - 2, accent: tierAccent, muted: !unlocked });
        const nameText = this.add.text(COL_X + 12, innerY + NAME_Y, `${perk.emoji} ${perk.name}`, {
          fontSize: '13px', fontFamily: FONT_DISPLAY, color: unlocked ? T.bright : T.faint, letterSpacing: 0.5,
        }).setAlpha(alpha);
        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join('  +  ');
        const recipeText = this.add.text(COL_X + COL_W - 10, innerY + NAME_Y, recipeStr, { fontSize: '11px', color: unlocked ? T.normal : T.ghost }).setOrigin(1, 0).setAlpha(alpha);
        scrollContainer.add([row.g, nameText, recipeText, descText]);
        if (equipped) {
          scrollContainer.add(this.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '✓', { fontSize: '11px', fontFamily: 'Arial', color: '#88ff88' }));
        } else if (!unlocked) {
          scrollContainer.add(this.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '🔒', { fontSize: '10px' }));
        }
        innerY += rowH + 3;
      }
      innerY += 14;
    }

    const totalContentH = innerY;
    let scrollY = 0;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);
    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };
    this.perkBookScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => { doScroll((deltaY as number) * 0.5); };
    this.input.on('wheel', this.perkBookScrollHandler);

    if (maxScroll > 0) {
      this.perkBookObjects.push(this.add.text(width - 16, SCROLL_BOT - 4, 'scroll ▼', {
        fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
      }).setOrigin(1, 1).setDepth(56));
    }

    this.perkBookObjects.push(addButton(this, {
      x: 66, y: 37, w: 100, h: 34, label: 'BACK', icon: '◄', fontSize: 13, variant: 'quiet', accent: C.arcane, depth: 56, cut: 8,
      onClick: () => this.closePerkBook(),
    }).container);
  }

  private closePerkBook(): void {
    this.input.off('wheel', this.perkBookScrollHandler);
    this.perkBookObjects.forEach((o) => o.destroy());
    this.perkBookObjects = [];
  }
}
