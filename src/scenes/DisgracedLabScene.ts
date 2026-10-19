import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';
import { findDivinePerkRecipe } from '../data/DivinePerks';
import { PerkDef } from '../data/Perks';
import {
  UNSTABLE_BASE_IDS, UNSTABLE_FAULT_TEXT, UnstableRecipe,
  getUnstableRecipe, readUnstableSockets,
} from '../data/UnstableRecipes';
import { findElementDef } from '../data/ElementRoster';
import {
  Bounty, getBounties, msUntilBountyRefresh, formatCountdown,
  difficultyLabel, BOUNTY_REFRESH_COST_NUCLEI,
} from '../data/Bounties';
import { getMutationDef } from '../data/Mutations';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addChip, addHeaderBar, addTabs, addCardPlate, addPanel, addWell,
  ALL_CORNERS, fillDiamond,
  fillNotchedGradient, strokeNotched, drawGlow, drawOrnateRule,
  addElementCrest,
} from '../ui';
import { LabBench } from '../ui/LabBench';
import { drawPlank, WOOD } from '../ui/Woodwork';
import { SpeechBubble } from '../ui/SpeechBubble';
import { Alchemist } from '../ui/characters/Alchemist';
import { Music, Sfx } from '../audio';

/** The lab's own colour — corrupt violet drowned in the dark it was left in. */
const DECAY = mix(C.corrupt, 0x000000, 0.45);
/** The second tier runs hotter than the first — a sick green over the violet. */
const UNSTABLE = 0x7cc93d;

const FLASK_X = 480;
const FLASK_Y = 338;
const BENCH_Y = 446;
const VIAL_H = 58;

/** Tabs, by name rather than index — the order on screen has changed once already. */
export type DisgracedTab = 'forge' | 'synthesis' | 'bounties';
const TABS: DisgracedTab[] = ['forge', 'synthesis', 'bounties'];

interface ElementDef { id: string; name: string; emoji: string; color: number }

/**
 * Normal elements — base only. Exactly one goes in the left socket. Every
 * divine recipe pairs an abstract with a base element; combined (duo)
 * elements can never forge anything, so they are not offered at all.
 */
const NORMAL_ELEMENTS: ElementDef[] = [
  { id: 'fire',     name: 'Fire',     emoji: '🔥',  color: 0xff4400 },
  { id: 'water',    name: 'Water',    emoji: '💧',  color: 0x0088ff },
  { id: 'life',     name: 'Life',     emoji: '🌿',  color: 0x44cc44 },
  { id: 'air',      name: 'Air',      emoji: '💨',  color: 0xaaddff },
  { id: 'earth',    name: 'Earth',    emoji: '🪨',  color: 0x887755 },
];

/** Abstract elements — exactly one goes in the right socket. */
const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '🟢', color: 0x66cc44 },
  { id: 'fate',        name: 'Fate',        emoji: '🃏', color: 0x88eecc },
  { id: 'sound',       name: 'Sound',       emoji: '🔊', color: 0xff66cc },
  { id: 'light',       name: 'Light',       emoji: '✨', color: 0xfff4a8 },
];

/**
 * The Disgraced Laboratory.
 *
 * The King's own workshop, found behind the normal Lab once he is dead: the
 * same bones as upstairs, left to rot. Two things happen here — divine perks
 * are forged from one abstract and one normal element (nothing else holds
 * together), and bounty contracts are taken to pay for them.
 */
export class DisgracedLabScene extends Phaser.Scene {
  private tab: DisgracedTab = 'forge';

  /** The cracked flask and the vials, on whichever forge tab is open. */
  private bench: LabBench | null = null;
  /** The ghost of the King's chemist, still at his bench. */
  private ghost: Alchemist | null = null;
  private bubble: SpeechBubble | null = null;
  /** The live read-out under the flask — what it would make, or why it will not. */
  private verdictText: Phaser.GameObjects.Text | null = null;

  private messageText!: Phaser.GameObjects.Text;
  private divineChip!: { setValue: (v: string) => void };
  private countdownText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'DisgracedLabScene' });
  }

  init(data: { tab?: DisgracedTab }): void {
    this.tab = data?.tab ?? 'forge';
    this.bench = null;
    this.ghost = null;
    this.bubble = null;
    this.verdictText = null;
    this.countdownText = null;
  }

  create(): void {
    Music.play('lab');
    const { width, height } = this.scale;
    const cx = width / 2;

    this.buildHauntedBackdrop(width, height);

    addHeaderBar(this, {
      title: '⚰  DISGRACED LAB',
      subtitle: this.tab === 'forge' ? 'WHAT THE KING WAS BUILDING'
        : this.tab === 'synthesis' ? 'TIER TWO  ·  WHAT HE COULD NOT MAKE HOLD'
        : 'CONTRACTS  ·  PAID IN DIVINE NUCLEI',
      accent: DECAY,
      height: 66,
    });

    const back = () => this.scene.start('LabScene');
    addBackButton(this, back, DECAY);
    this.input.keyboard!.on('keydown-ESC', back);

    // Currency rail — divine nuclei here, ordinary ones because the reroll eats them.
    this.divineChip = addChip(this, {
      x: width - 18, y: 26, icon: '💠', value: `×${PlayerData.getDivineNuclei()}`,
      accent: C.corrupt, originX: 1,
    });
    addChip(this, {
      x: width - 18, y: 52, icon: '⚛️', value: `×${PlayerData.getNuclei()}`,
      accent: C.arcane, originX: 1, fontSize: 13,
    });

    addTabs(this, {
      x: cx, y: 92, tabW: 122, tabH: 30,
      active: TABS.indexOf(this.tab),
      tabs: [
        { label: 'PERKS', accent: DECAY },
        { label: 'SYNTHESIS', accent: UNSTABLE },
        { label: 'BOUNTIES', accent: C.gold },
      ],
      onSelect: (idx) => { if (TABS[idx] !== this.tab) this.scene.restart({ tab: TABS[idx] }); },
    });

    this.messageText = this.add.text(cx, height - 34, '', {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold,
      align: 'center', letterSpacing: 0.5, lineSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content + 5);

    if (this.tab === 'forge') this.buildForgeTab(width, height, cx);
    else if (this.tab === 'synthesis') this.buildSynthesisTab(width, height, cx);
    else this.buildBountiesTab(width, height, cx);
  }

  update(_time: number, delta: number): void {
    this.bench?.update(delta);
  }

  // ── The bench ────────────────────────────────────────────────────

  /**
   * The King's bench: a rotten plank across the room, the ghost of his chemist behind it,
   * a cracked flask on a tripod, and the vials he left out. `capacity` is how many the flask
   * takes on this tab; `canPour` is the tab's rule for what may go in.
   */
  private buildBench(width: number, capacity: number, canPour: (id: string, poured: string[]) => string | null, fullLine: string): void {
    const bench = this.add.graphics().setDepth(DEPTH.panel + 3);
    drawPlank(bench, -4, BENCH_Y, width + 8, 18, { seed: 61, lit: -0.3 });
    bench.fillStyle(WOOD.dark, 1); bench.fillRect(-4, BENCH_Y + 18, width + 8, 4);
    drawPlank(bench, -4, BENCH_Y + 22, width + 8, 48, { seed: 62, lit: -0.5 });
    // Rot: a split down the plank, a missing board, old stains.
    bench.lineStyle(2, 0x000000, 0.7); bench.lineBetween(300, BENCH_Y + 2, 420, BENCH_Y + 14);
    bench.fillStyle(0x000000, 0.6); bench.fillRect(880, BENCH_Y + 24, 50, 44);
    bench.fillStyle(mix(DECAY, 0x000000, 0.3), 0.35); bench.fillEllipse(FLASK_X - 80, BENCH_Y + 8, 60, 8);
    bench.fillStyle(mix(UNSTABLE, 0x000000, 0.4), 0.3); bench.fillEllipse(640, BENCH_Y + 7, 34, 6);

    this.ghost = new Alchemist(this, 150, BENCH_Y - 4, { scale: 0.9, depth: DEPTH.panel + 2, spectral: true });
    const m = this.ghost.mouth();
    this.bubble = new SpeechBubble(this, {
      anchorX: m.x, anchorY: m.y, side: 'right', width: 225, accent: DECAY,
      depth: DEPTH.modal + 60, onTalk: (on) => this.ghost?.setTalking(on),
    });
    this.bench = new LabBench(this, {
      flaskX: FLASK_X, flaskY: FLASK_Y, capacity, decayed: true,
      elements: [...NORMAL_ELEMENTS, ...ABSTRACT_ELEMENTS],
      canPour, fullLine,
      say: (line) => { this.ghost?.setMood('grumpy', 1500); this.bubble?.say([line]); },
      onPoured: (el, _poured, left) => {
        this.ghost?.setMood('pleased', 1200);
        this.refreshVerdict();
        this.bubble?.say([left > 0 ? `${el.name} in. ${left} more.` : `${el.name} in. The flask is full — press FORGE.`]);
      },
      onEmptied: () => { this.refreshVerdict(); this.bubble?.say(['Flask emptied. Nothing spent.']); },
    });

    // Base vials in a rack on the bench; abstract vials on a shelf above. Only the ones this
    // save has reached stand out — the rest were never here.
    const rackLeft = 590;
    const rackW = width - rackLeft - 40;
    const bases = this.tab === 'synthesis' ? NORMAL_ELEMENTS.filter((e) => UNSTABLE_BASE_IDS.includes(e.id)) : NORMAL_ELEMENTS;
    const step = rackW / Math.max(bases.length, 1);
    const rack = this.add.graphics().setDepth(DEPTH.panel + 4);
    drawPlank(rack, rackLeft, BENCH_Y - 22, rackW, 10, { seed: 63, lit: -0.25 });
    for (let i = 0; i < bases.length; i++) { rack.fillStyle(0x0a0806, 1); rack.fillEllipse(rackLeft + step * (i + 0.5), BENCH_Y - 17, 24, 7); }
    bases.forEach((el, i) => this.bench!.addVial(el, rackLeft + step * (i + 0.5), BENCH_Y - 18));

    const abstract = this.unlockedAbstractElements();
    const shelfY = 300;
    const shelf = this.add.graphics().setDepth(DEPTH.panel);
    drawPlank(shelf, rackLeft, shelfY, rackW, 10, { seed: 64, lit: -0.3 });
    shelf.fillStyle(WOOD.dark, 1); shelf.fillRect(rackLeft, shelfY + 10, rackW, 3);
    for (const bx of [rackLeft + 20, rackLeft + rackW - 20]) {
      shelf.lineStyle(3, 0x3b3a44, 1); shelf.beginPath(); shelf.moveTo(bx, shelfY + 12); shelf.lineTo(bx, shelfY + 30); shelf.lineTo(bx + 14, shelfY + 12); shelf.strokePath();
    }
    this.add.text(rackLeft + rackW / 2, shelfY - VIAL_H - 30, 'ABSTRACT', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0xffffff, 0.3)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    if (abstract.length === 0) {
      this.add.text(rackLeft + rackW / 2, shelfY - 30, 'None unlocked. Complete a Gauntlet.', {
        fontSize: '10px', fontFamily: FONT_UI, color: T.ghost,
      }).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      const astep = rackW / Math.max(abstract.length, 3);
      abstract.forEach((el, i) => this.bench!.addVial(el, rackLeft + astep * (i + 0.5), shelfY - 1));
    }
  }

  /** The corroded brass plate with the red button, on the bench front. */
  private buildForgeButton(cx: number, label: string, accent: number, onPress: () => void): void {
    const bx = cx;
    const by = BENCH_Y + 96;
    const g = this.add.graphics().setDepth(DEPTH.content);
    const paint = (down: number, lit: number): void => {
      g.clear();
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(bx - 68, by - 48, 136, 100, 8);
      g.fillStyle(0x4a4a2a, 1); g.fillRoundedRect(bx - 66, by - 50, 132, 100, 8);
      g.fillStyle(0x7a7a3c, 1); g.fillRoundedRect(bx - 62, by - 46, 124, 92, 6);
      // Verdigris.
      g.fillStyle(0x3a8a6a, 0.45); g.fillEllipse(bx - 40, by - 30, 30, 18); g.fillEllipse(bx + 44, by + 30, 24, 14);
      g.lineStyle(1, 0xa8a860, 0.5); g.strokeRoundedRect(bx - 58, by - 42, 116, 84, 5);
      g.fillStyle(0x1a0a0a, 1); g.fillCircle(bx, by - 8, 32);
      const r = 28 - down * 2;
      const dy = down * 4;
      g.fillStyle(mix(C.blood, 0x000000, 0.55), 1); g.fillCircle(bx, by - 8 + dy + 3, r);
      g.fillStyle(mix(mix(C.blood, 0x000000, 0.2), 0xffffff, lit * 0.2), 1); g.fillCircle(bx, by - 8 + dy, r);
      g.fillStyle(mix(C.blood, 0xffffff, 0.25 + lit * 0.2), 1); g.fillCircle(bx - 6, by - 16 + dy, r * 0.5);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(bx - 10, by - 20 + dy, 10, 5);
      for (let k = 3; k >= 1; k--) { g.fillStyle(accent, 0.05 * lit); g.fillCircle(bx, by - 8, 34 + k * 8); }
    };
    paint(0, 0);
    this.add.text(bx, by + 32, label, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#1a1a08', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);
    const hit = this.add.circle(bx, by - 8, 34, 0xffffff, 0).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(0, 1); Sfx.play('ui-hover'); });
    hit.on('pointerout', () => paint(0, 0));
    hit.on('pointerdown', () => { paint(1, 1); this.time.delayedCall(140, () => paint(0, 1)); onPress(); });
  }

  // ── The room ─────────────────────────────────────────────────────

  /**
   * The lab's decay, painted over a void backdrop: guttering ceiling lamps,
   * cracked glass, stains that ran and dried, and the ghosts of whoever was
   * working down here when it was abandoned.
   */
  private buildHauntedBackdrop(width: number, height: number): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);

    // Wash — colder and darker than the standard backdrop, and lit from below
    // rather than above, so the room feels underground.
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      g.fillStyle(mix(0x06060c, mix(0x0d0a16, DECAY, 0.10), t), 1);
      g.fillRect(0, (height / steps) * i, width, height / steps + 1);
    }

    // Tiled floor in receding perspective, most of the grout long gone.
    g.lineStyle(1, mix(C.lineSoft, DECAY, 0.3), 0.28);
    for (let y = height * 0.62; y < height; y += 22) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath();
    }
    for (let i = -6; i <= 18; i++) {
      const x = width / 2 + i * 84;
      g.beginPath();
      g.moveTo(width / 2 + (x - width / 2) * 0.42, height * 0.62);
      g.lineTo(x, height);
      g.strokePath();
    }

    // Cracks running out of the corners.
    g.lineStyle(1, mix(C.line, DECAY, 0.4), 0.35);
    const crack = (sx: number, sy: number, dx: number, dy: number, segs: number) => {
      let x = sx; let y = sy;
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < segs; i++) {
        const h = Math.sin((i + sx) * 12.9898) * 43758.5453;
        const jitter = (h - Math.floor(h)) * 2 - 1;
        x += dx + jitter * 16;
        y += dy + jitter * 10;
        g.lineTo(x, y);
      }
      g.strokePath();
    };
    crack(0, 40, 34, 12, 7);
    crack(width, 90, -30, 16, 8);
    crack(width * 0.2, height, 22, -30, 6);

    // Old stains that ran down the wall and dried.
    for (const [sx, sw, sh] of [[width * 0.14, 46, 150], [width * 0.72, 32, 110], [width * 0.88, 54, 190]]) {
      for (let i = 0; i < 10; i++) {
        g.fillStyle(mix(0x120a18, DECAY, 0.25), 0.05);
        g.fillEllipse(sx, 70 + (sh / 10) * i, sw * (1 - i / 14), sh / 6);
      }
    }

    // Cobwebs in the upper corners: radials out of the corner, then arcs strung
    // between them. The quarter sweep is always 0..90° and mirrored by `dir`, so
    // both corners hang downward into the room.
    for (const side of [-1, 1] as const) {
      const ox = side < 0 ? 12 : width - 12;
      const dir = side < 0 ? 1 : -1;
      const oy = 14;
      g.lineStyle(1, 0x8f86a8, 0.14);
      for (let i = 0; i <= 5; i++) {
        const a = (Math.PI / 2) * (i / 5);
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(a) * 96 * dir, oy + Math.sin(a) * 96);
        g.strokePath();
      }
      for (const r of [34, 58, 82]) {
        g.beginPath();
        for (let i = 0; i <= 5; i++) {
          const a = (Math.PI / 2) * (i / 5);
          // Slack between spokes: the arc sags a little at the midpoint.
          const sag = Math.sin((i / 5) * Math.PI) * 5;
          const px = ox + Math.cos(a) * (r + sag) * dir;
          const py = oy + Math.sin(a) * (r + sag);
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    }

    // Broken glassware along the foot of the room.
    for (const [bx, by, br] of [[62, height - 40, 15], [width - 96, height - 34, 19], [width * 0.36, height - 26, 12]]) {
      g.fillStyle(0x1a2430, 0.5);
      g.fillEllipse(bx, by, br * 2, br * 0.7);
      g.lineStyle(1.5, 0x5f7f94, 0.4);
      // A flask sheared off at an angle — the jagged rim is the whole read.
      g.beginPath();
      g.moveTo(bx - br, by);
      g.lineTo(bx - br * 0.7, by - br * 1.3);
      g.lineTo(bx - br * 0.2, by - br * 0.8);
      g.lineTo(bx + br * 0.3, by - br * 1.6);
      g.lineTo(bx + br * 0.8, by - br * 0.5);
      g.lineTo(bx + br, by);
      g.strokePath();
      g.fillStyle(mix(DECAY, 0x000000, 0.3), 0.35);
      g.fillEllipse(bx, by - 3, br * 1.5, br * 0.5);
    }

    this.buildLamps(width);
    this.buildGhosts(width, height);

    // Vignette last, so everything above sinks into the dark at the edges.
    const v = this.add.graphics().setDepth(DEPTH.base - 1);
    const bands = 22;
    for (let i = 0; i < bands; i++) {
      const a = 0.075 * (1 - i / bands);
      const o = (110 / bands) * i;
      v.fillStyle(0x000000, a);
      v.fillRect(0, o, width, 110 / bands + 1);
      v.fillRect(0, height - o - 110 / bands - 1, width, 110 / bands + 1);
      v.fillRect(o, 0, 110 / bands + 1, height);
      v.fillRect(width - o - 110 / bands - 1, 0, 110 / bands + 1, height);
    }
  }

  /** Three ceiling lamps: one dead, one steady, one that will not settle. */
  private buildLamps(width: number): void {
    const lamps: Array<{ x: number; mode: 'dead' | 'steady' | 'flicker' }> = [
      { x: width * 0.18, mode: 'flicker' },
      { x: width * 0.5,  mode: 'dead' },
      { x: width * 0.82, mode: 'steady' },
    ];

    for (const lamp of lamps) {
      const g = this.add.graphics().setDepth(DEPTH.backdrop + 1);
      const y = 84;

      // Flex and shade.
      g.lineStyle(1.5, 0x2b2b3d, 0.9);
      g.beginPath(); g.moveTo(lamp.x, 0); g.lineTo(lamp.x, y - 12); g.strokePath();
      g.fillStyle(0x1b1b28, 1);
      g.fillTriangle(lamp.x - 20, y, lamp.x + 20, y, lamp.x, y - 14);
      g.lineStyle(1, mix(C.line, DECAY, 0.3), 0.7);
      g.strokeTriangle(lamp.x - 20, y, lamp.x + 20, y, lamp.x, y - 14);

      if (lamp.mode === 'dead') {
        g.fillStyle(0x0e0e16, 1);
        g.fillCircle(lamp.x, y + 3, 5);
        continue;
      }

      // Bulb plus the cone of light it throws down the wall.
      const glowG = this.add.graphics().setDepth(DEPTH.backdrop + 1);
      glowG.fillStyle(mix(DECAY, 0xffffff, 0.6), 0.9);
      glowG.fillCircle(lamp.x, y + 3, 5);
      for (let i = 0; i < 12; i++) {
        glowG.fillStyle(mix(DECAY, 0xffffff, 0.35), 0.035 - i * 0.0025);
        glowG.fillTriangle(lamp.x - 6, y, lamp.x + 6, y, lamp.x, y + 60 + i * 26);
      }

      if (lamp.mode === 'flicker') {
        // Deliberately irregular: a short stutter, a long hold, another stutter.
        this.tweens.add({
          targets: glowG, alpha: { from: 1, to: 0.12 },
          duration: 70, yoyo: true, repeat: -1, repeatDelay: 1900, hold: 40,
        });
        this.tweens.add({
          targets: glowG, alpha: 0.5,
          duration: 55, yoyo: true, repeat: -1, delay: 780, repeatDelay: 2600,
        });
      } else {
        this.tweens.add({
          targets: glowG, alpha: { from: 0.82, to: 1 },
          duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /**
   * Whoever was working down here never left. Each ghost is a wisp — a rounded
   * hood over a ragged tail, two dark eyes — drifting across the room on a long
   * sine path, fading in at one wall and out at the other.
   */
  private buildGhosts(width: number, height: number): void {
    const COUNT = 3;
    for (let i = 0; i < COUNT; i++) {
      const container = this.add.container(0, 0).setDepth(DEPTH.base - 2).setAlpha(0);
      const g = this.add.graphics();
      container.add(g);

      const r = 15 + i * 3;
      // Body: a hood, then three tattered lobes for the hem.
      g.fillStyle(0xc8bfe0, 0.16);
      g.fillCircle(0, 0, r + 5);
      g.fillStyle(0xdcd4f0, 0.3);
      g.fillCircle(0, -2, r);
      g.fillTriangle(-r, r * 0.5, -r * 0.33, r * 1.7, 0, r * 0.6);
      g.fillTriangle(-r * 0.33, r * 0.5, r * 0.33, r * 1.9, r * 0.66, r * 0.6);
      g.fillTriangle(r * 0.2, r * 0.5, r * 0.9, r * 1.5, r, r * 0.3);
      // Eyes — two hollows, the only dark part of it.
      g.fillStyle(0x18121f, 0.75);
      g.fillEllipse(-r * 0.34, -r * 0.24, r * 0.3, r * 0.42);
      g.fillEllipse(r * 0.34, -r * 0.24, r * 0.3, r * 0.42);

      const leftToRight = i % 2 === 0;
      const startX = leftToRight ? -60 : width + 60;
      const endX = leftToRight ? width + 60 : -60;
      const laneY = height * (0.32 + 0.2 * i);

      container.setPosition(startX, laneY);
      if (!leftToRight) container.setScale(-1, 1);

      const duration = 17000 + i * 5500;
      this.tweens.add({
        targets: container, x: endX,
        duration, repeat: -1, delay: i * 5200,
        onRepeat: () => container.setPosition(startX, laneY),
      });
      // Bob, independent of the crossing so the path never looks like a rail.
      this.tweens.add({
        targets: container, y: laneY - 26,
        duration: 3200 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Fade in off one wall and out at the other — they are never fully solid.
      this.tweens.add({
        targets: container, alpha: { from: 0, to: 0.5 },
        duration: duration * 0.22, yoyo: true, hold: duration * 0.34,
        repeat: -1, delay: i * 5200, repeatDelay: duration * 0.22,
      });
    }
  }

  // ── Forge tab ────────────────────────────────────────────────────

  private buildForgeTab(width: number, height: number, cx: number): void {
    void height;
    this.add.text(cx, 130, 'ONE ABSTRACT.  ONE NORMAL.  NOTHING ELSE HOLDS.', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0xffffff, 0.35)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // The sockets were typed; the flask is too. A second of the same kind is refused at the lip.
    this.buildBench(width, 2, (id, poured) => {
      const isAbs = ABSTRACT_ELEMENT_IDS.includes(id);
      const hasAbs = poured.some((p) => ABSTRACT_ELEMENT_IDS.includes(p));
      const hasNormal = poured.some((p) => !ABSTRACT_ELEMENT_IDS.includes(p));
      if (isAbs && hasAbs) return 'One abstract only. The other vial must be normal.';
      if (!isAbs && hasNormal) return 'One normal only. The other vial must be abstract.';
      return null;
    }, 'Flask is full. Press FORGE, or click the flask to empty it.');

    this.buildForgeButton(cx, 'FORGE  ·  1 💠', C.corrupt, () => this.attemptDivineForge());
    this.time.delayedCall(350, () => this.bubble?.say([
      `Divine nuclei: ${PlayerData.getDivineNuclei()}. One normal vial, one abstract, then FORGE. One nucleus a perk.`,
    ], { silent: true }));
  }

  private unlockedAbstractElements(): ElementDef[] {
    const completed = PlayerData.getCompletedGauntlets();
    return ABSTRACT_ELEMENTS.filter((el) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[el.id];
      return needed ? completed.includes(needed) : false;
    });
  }

  private nameOf(id: string): string {
    return findElementDef(id)?.name ?? id;
  }

  /**
   * Forge. Only a complete, correctly-typed pairing can spend a nucleus — a pairing whose
   * perk is not understood blows up in the ghost's face but costs nothing.
   */
  private attemptDivineForge(): void {
    const bench = this.bench;
    if (!bench || bench.busy) return;
    const [a, b] = bench.poured;
    const say = (line: string, mood: 'thinking' | 'grumpy' = 'grumpy'): void => {
      Sfx.play('ui-denied');
      this.ghost?.setMood(mood, 1800);
      this.bubble?.say([line]);
    };
    if (!a || !b) { say('Two vials first. One normal, one abstract.', 'thinking'); return; }
    const recipe = findDivinePerkRecipe(a, b);
    if (!recipe) {
      this.bubble?.hide();
      bench.heatThen(() => {
        this.ghost?.blacken(1);
        bench.explode(() => this.bubble?.say([`${this.nameOf(a)} + ${this.nameOf(b)}: not understood. No Divine Nucleus spent.`], { hold: 1200 }));
      });
      return;
    }
    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) { say(`${this.nameOf(a)} + ${this.nameOf(b)} → ${recipe.name}. Already forged. Nothing spent.`, 'thinking'); return; }
    if (!PlayerData.spendDivineNuclei(1)) { say(`That takes a Divine Nucleus. You have ${PlayerData.getDivineNuclei()}. Complete a bounty.`); return; }

    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.divineChip.setValue(`×${PlayerData.getDivineNuclei()}`);
    this.bubble?.hide();
    bench.heatThen(() => {
      this.ghost?.setMood('pleased', 3000);
      bench.succeed(C.corrupt, () => {
        this.showDivinePopup(recipe);
        this.bubble?.say([`${this.nameOf(a)} + ${this.nameOf(b)} → ${recipe.name}. One Divine Nucleus spent, ${PlayerData.getDivineNuclei()} left.`], { hold: 1500 });
      });
    });
  }

  private showDivinePopup(perk: PerkDef): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const objects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.78).setDepth(DEPTH.overlay).setInteractive();
    objects.push(overlay);

    const g = this.add.graphics().setDepth(DEPTH.modal);
    drawGlow(g, cx - 200, cy - 130, 400, 260, C.corrupt, 0.7, 6, 4, 14);
    fillNotchedGradient(g, cx - 200, cy - 130, 400, 260, mix(C.plate, C.corrupt, 0.28), mix(C.void_, C.corrupt, 0.08), 1, 14, ALL_CORNERS, 20);
    strokeNotched(g, cx - 200, cy - 130, 400, 260, mix(C.corrupt, 0xffffff, 0.35), 1, 2, 14, ALL_CORNERS);
    drawOrnateRule(g, cx, cy - 46, 160, C.corrupt, 0.8);
    objects.push(g);

    objects.push(this.add.text(cx, cy - 92, '💠  DIVINE PERK FORGED', {
      fontSize: '17px', fontFamily: FONT_DISPLAY, color: hex(mix(C.corrupt, 0xffffff, 0.6)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    objects.push(this.add.text(cx, cy - 12, `${perk.emoji}  ${perk.name.toUpperCase()}`, {
      fontSize: '25px', fontFamily: FONT_DISPLAY, color: T.bright,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    objects.push(this.add.text(cx, cy + 26, perk.description, {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal, align: 'center', wordWrap: { width: 340 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));

    const btn = addButton(this, {
      x: cx, y: cy + 100, w: 160, h: 40, label: 'CONTINUE', accent: C.corrupt, variant: 'solid', fontSize: 14, depth: DEPTH.modalContent,
      onClick: () => {
        for (const o of objects) o.destroy();
        btn.destroy();
        this.bench?.reset();
      },
    });
  }

  // ── Synthesis tab (tier two) ─────────────────────────────────────

  /**
   * Three vials and a wager.
   *
   * The flask is deliberately not typed the way tier one's is: "two abstracts will not hold"
   * is a rule the player is supposed to *find*, so a second abstract pours happily and is
   * then refused out loud by the read-out under the flask — and blows up on the button.
   */
  private buildSynthesisTab(width: number, height: number, cx: number): void {
    const pending = PlayerData.getPendingUnstable();
    if (pending) {
      this.buildPendingPanel(width, height, cx, pending);
      return;
    }

    this.add.text(cx, 126, 'TWO BASE.  ONE ABSTRACT.  THAT IS THE WHOLE GRAMMAR.', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(UNSTABLE, 0xffffff, 0.35)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, 148, 'What comes out of here does not hold on its own. You will have to hold it down yourself.', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.ghost,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.buildBench(width, 3, () => null, 'Flask is full. Press FORGE, or click the flask to empty it.');

    // Live read-out, chalked on the bench front beside the button: what the flask would
    // make, or the reason it will not.
    const slate = this.add.graphics().setDepth(DEPTH.content - 1);
    slate.fillStyle(0x000000, 0.4); slate.fillRoundedRect(cx + 94, BENCH_Y + 50, 316, 70, 4);
    slate.fillStyle(0x1b1f1c, 1); slate.fillRoundedRect(cx + 90, BENCH_Y + 46, 316, 70, 4);
    slate.lineStyle(1, 0x3a3a30, 1); slate.strokeRoundedRect(cx + 90, BENCH_Y + 46, 316, 70, 4);
    this.verdictText = this.add.text(cx + 248, BENCH_Y + 58, '', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.ghost,
      align: 'center', letterSpacing: 1, lineSpacing: 4, wordWrap: { width: 300 },
    }).setOrigin(0.5, 0).setDepth(DEPTH.content);
    this.refreshVerdict();

    this.buildForgeButton(cx, 'FORGE  ·  1 💠', UNSTABLE, () => this.attemptUnstableForge());
    this.time.delayedCall(350, () => this.bubble?.say([
      `Divine nuclei: ${PlayerData.getDivineNuclei()}. Two base vials and one abstract, then FORGE. What comes out, you fight for.`,
    ], { silent: true }));
  }

  /** Re-stamps the line under the flask from whatever has been poured. */
  private refreshVerdict(): void {
    if (!this.verdictText || !this.bench) return;
    const [a, b, c] = this.bench.poured;
    const attempt = readUnstableSockets(a ?? null, b ?? null, c ?? null);

    if (attempt.recipe) {
      const r = attempt.recipe;
      const binder = findElementDef(attempt.abstractId ?? '');
      const owned = PlayerData.isElementUnlocked(r.result);
      this.verdictText.setText(
        `${r.resultEmoji}  ${r.resultName.toUpperCase()}${owned ? '   (already stabilised)' : ''}\n`
        + `the ${r.echoEmoji} ${r.echoName} of the abstract — bound with ${binder?.emoji ?? ''} ${binder?.name ?? ''}`,
      ).setColor(owned ? T.faint : hex(mix(UNSTABLE, 0xffffff, 0.55)));
      return;
    }
    const fault = attempt.fault ?? 'incomplete';
    this.verdictText.setText(UNSTABLE_FAULT_TEXT[fault]).setColor(fault === 'incomplete' ? T.ghost : '#ff8888');
  }

  /**
   * Forge. The Divine Nucleus is spent here and only here — every shape that cannot hold
   * blows up without costing one. What it buys is the *right to fight for* the element, not
   * the element: the forge is recorded as pending and settled by the bout.
   */
  private attemptUnstableForge(): void {
    const bench = this.bench;
    if (!bench || bench.busy) return;
    const [a, b, c] = bench.poured;
    const attempt = readUnstableSockets(a ?? null, b ?? null, c ?? null);
    const say = (line: string, mood: 'thinking' | 'grumpy' = 'grumpy'): void => {
      Sfx.play('ui-denied');
      this.ghost?.setMood(mood, 1800);
      this.bubble?.say([line]);
    };
    if (!attempt.recipe) {
      const fault = attempt.fault ?? 'incomplete';
      if (fault === 'incomplete') { say('Three vials first. Two base, one abstract.', 'thinking'); return; }
      // A legal-looking mix that will not hold goes off on the bench. Nothing is spent.
      this.bubble?.hide();
      bench.heatThen(() => {
        this.ghost?.blacken(1);
        bench.explode(() => this.bubble?.say([`${UNSTABLE_FAULT_TEXT[fault].replace(/\n/g, ' ')} Nothing spent.`], { hold: 1200 }));
      });
      this.refreshVerdict();
      return;
    }
    const recipe = attempt.recipe;
    if (PlayerData.isElementUnlocked(recipe.result)) { say(`${recipe.resultName} is already stabilised. Nothing spent.`, 'thinking'); return; }
    if (PlayerData.getPendingUnstable()) { say('A forge is already waiting on you. Settle that one first.', 'thinking'); return; }
    if (!PlayerData.spendDivineNuclei(1)) { say(`That takes a Divine Nucleus. You have ${PlayerData.getDivineNuclei()}. Complete a bounty.`); return; }

    // Order matters: the two bases first, the binder last, because that is the order the
    // three of them will walk onto the floor.
    const ingredients = [...attempt.bases, attempt.abstractId!];
    PlayerData.setPendingUnstable({ result: recipe.result, ingredients });
    this.divineChip.setValue(`×${PlayerData.getDivineNuclei()}`);
    this.bubble?.hide();
    bench.heatThen(() => {
      this.ghost?.setMood('shocked', 3000);
      bench.succeed(UNSTABLE, () => {
        this.showUnstablePopup(recipe, ingredients);
        this.bubble?.say([`${recipe.resultName}. It will not hold. One Divine Nucleus spent — put all three down to keep it.`], { hold: 1500 });
      });
    });
  }

  /** The moment the forge fails on purpose. */
  private showUnstablePopup(recipe: UnstableRecipe, ingredients: string[]): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const objects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.8)
      .setDepth(DEPTH.overlay).setInteractive();
    objects.push(overlay);

    const g = this.add.graphics().setDepth(DEPTH.modal);
    drawGlow(g, cx - 230, cy - 158, 460, 316, UNSTABLE, 0.7, 6, 4, 14);
    fillNotchedGradient(g, cx - 230, cy - 158, 460, 316,
      mix(C.plate, UNSTABLE, 0.22), mix(C.void_, UNSTABLE, 0.06), 1, 14, ALL_CORNERS, 20);
    strokeNotched(g, cx - 230, cy - 158, 460, 316, mix(UNSTABLE, 0xffffff, 0.35), 1, 2, 14, ALL_CORNERS);
    drawOrnateRule(g, cx, cy - 74, 180, UNSTABLE, 0.8);
    objects.push(g);

    objects.push(this.add.text(cx, cy - 120, '⚠  TOO UNSTABLE', {
      fontSize: '22px', fontFamily: FONT_DISPLAY,
      color: hex(mix(UNSTABLE, 0xffffff, 0.6)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    objects.push(this.add.text(cx, cy - 46, `${recipe.resultEmoji}  ${recipe.resultName.toUpperCase()}`, {
      fontSize: '27px', fontFamily: FONT_DISPLAY, color: T.bright,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    objects.push(this.add.text(cx, cy - 12,
      'It came apart on the bench. The three that made it are loose in there,\n'
      + 'and they will not settle until every one of them is put down.', {
      fontSize: '13px', fontFamily: FONT_UI, color: T.normal,
      align: 'center', lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));

    const names = ingredients
      .map((id) => { const d = findElementDef(id); return d ? `${d.emoji} ${d.name.toUpperCase()}` : id; })
      .join('   ·   ');
    objects.push(this.add.text(cx, cy + 40, names, {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));
    objects.push(this.add.text(cx, cy + 62, 'THREE ON THREE  ·  EXPERT  ·  THE NUCLEUS IS ALREADY SPENT', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    const close = () => {
      for (const o of objects) o.destroy();
      stabilise.destroy();
      later.destroy();
    };

    const stabilise = addButton(this, {
      x: cx - 96, y: cy + 116, w: 220, h: 46,
      label: 'STABILISE IT', icon: '⚔', accent: UNSTABLE, variant: 'solid',
      fontSize: 15, depth: DEPTH.modalContent,
      onClick: () => this.startStabilisation(),
    });
    const later = addButton(this, {
      x: cx + 130, y: cy + 116, w: 150, h: 46,
      label: 'LATER', accent: C.steel, variant: 'quiet',
      fontSize: 14, depth: DEPTH.modalContent,
      onClick: () => { close(); this.scene.restart({ tab: 'synthesis' }); },
    });
  }

  /**
   * The bench with a forge already on it. Shown instead of the sockets while one
   * is outstanding, so a player who closed the tab mid-loadout is not quietly
   * out a nucleus.
   */
  private buildPendingPanel(
    width: number, height: number, cx: number,
    pending: PlayerData.PendingUnstableForge,
  ): void {
    void height;
    const recipe = getUnstableRecipe(pending.result);
    const cy = 330;

    const panel = addPanel(this, {
      x: cx, y: cy, w: Math.min(620, width - 80), h: 300,
      accent: UNSTABLE, glow: 0.5,
      title: '⚠  A FORGE IS STILL LOOSE',
    });

    this.add.text(cx, panel.contentTop + 40, `${recipe?.resultEmoji ?? '⚗'}  ${(recipe?.resultName ?? pending.result).toUpperCase()}`, {
      fontSize: '30px', fontFamily: FONT_DISPLAY, color: T.bright,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.add.text(cx, panel.contentTop + 80,
      'Its Divine Nucleus is spent. Put all three ingredients down and it is yours;\n'
      + 'lose, and the forge goes with them.', {
      fontSize: '13px', fontFamily: FONT_UI, color: T.normal,
      align: 'center', lineSpacing: 5,
    }).setOrigin(0.5, 0).setDepth(DEPTH.content);

    const names = pending.ingredients
      .map((id) => { const d = findElementDef(id); return d ? `${d.emoji} ${d.name.toUpperCase()}` : id; })
      .join('   ·   ');
    addWell(this, cx, panel.contentTop + 148, 420, 40, UNSTABLE, DEPTH.content);
    this.add.text(cx, panel.contentTop + 148, names, {
      fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content + 1);

    addButton(this, {
      x: cx, y: panel.bottom - 44, w: 320, h: 52,
      label: 'STABILISE IT', icon: '⚔', trailing: 'EXPERT · 3v3',
      trailingColor: hex(mix(UNSTABLE, 0xffffff, 0.4)),
      accent: UNSTABLE, variant: 'solid', fontSize: 17, align: 'left',
      onClick: () => this.startStabilisation(),
    }).pulse();
  }

  /** Off to the element picker, which reads the pending forge straight off the save. */
  private startStabilisation(): void {
    Sfx.play('ui-equip');
    this.cameras.main.fade(240, 0, 0, 0);
    this.time.delayedCall(260, () => this.scene.start('MenuScene', { mode: 'stabilize' }));
  }

  // ── Bounties tab ─────────────────────────────────────────────────

  private buildBountiesTab(width: number, height: number, cx: number): void {
    void width;
    const bounties = getBounties();

    this.countdownText = this.add.text(cx, 130, '', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    const tick = () => this.countdownText?.setText(`NEW CONTRACTS IN  ${formatCountdown(msUntilBountyRefresh())}`);
    tick();
    this.time.addEvent({ delay: 1000, loop: true, callback: tick });

    const cardW = 168;
    const cardH = 268;
    const gap = 12;
    const startX = cx - (bounties.length * cardW + (bounties.length - 1) * gap) / 2;
    const cardY = 300;

    bounties.forEach((b, i) => {
      this.buildBountyCard(b, startX + i * (cardW + gap) + cardW / 2, cardY, cardW, cardH);
    });

    // Reroll — pays in ordinary nuclei, which is what makes it a real choice.
    const nuclei = PlayerData.getNuclei();
    const canReroll = nuclei >= BOUNTY_REFRESH_COST_NUCLEI;
    addButton(this, {
      x: cx, y: height - 76, w: 340, h: 46,
      label: 'REFRESH CONTRACTS', icon: '🔄',
      trailing: `⚛️ ${BOUNTY_REFRESH_COST_NUCLEI}`,
      sublabel: canReroll ? undefined : `You have ${nuclei}`,
      accent: canReroll ? C.arcane : C.steel,
      variant: canReroll ? 'ghost' : 'quiet',
      fontSize: 15, align: 'left',
      disabled: !canReroll,
      onClick: () => {
        if (!PlayerData.spendNuclei(BOUNTY_REFRESH_COST_NUCLEI)) return;
        PlayerData.bumpBountyRerollOffset();
        this.scene.restart({ tab: 'bounties' });
      },
    });
  }

  private buildBountyCard(b: Bounty, x: number, y: number, w: number, h: number): void {
    const done = PlayerData.isBountyCompleted(b.key);
    const accent = done ? C.steel : b.color;

    const plate = addCardPlate(this, { x, y, w, h, accent, cut: 14, muted: done });
    const top = y - h / 2;

    // Crest — the target itself, standing in the frame. A contract that names a fighter
    // should show the fighter, the same way the roster cards do.
    addElementCrest(this, {
      x, y: top + 58, w: w - 16, h: 96,
      elementId: b.elementId, name: `${b.emoji}  ${b.name}`, accent: b.color,
      muted: done, depth: DEPTH.panel + 1, portraitScale: 0.54,
    });

    // Difficulty pip row — five diamonds, lit up to the contract's level.
    const pips = this.add.graphics().setDepth(DEPTH.content);
    for (let i = 0; i < 5; i++) {
      const px = x - 4 * 9 + i * 18;
      const lit = i < b.difficulty;
      fillDiamond(pips, px, top + 104, lit ? 4.5 : 2.5,
        done ? C.line : lit ? mix(C.gold, 0xffffff, 0.3) : C.line, lit ? 1 : 0.6);
    }
    this.add.text(x, top + 122, difficultyLabel(b.difficulty), {
      fontSize: '10px', fontFamily: FONT_DISPLAY,
      color: done ? T.ghost : T.gold, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // Modifier list.
    const modTop = top + 146;
    addWell(this, x, modTop + 30, w - 20, 66, C.arcane, DEPTH.content);
    if (b.mutationIds.length === 0) {
      this.add.text(x, modTop + 30, '— no modifiers —', {
        fontSize: '10px', fontFamily: FONT_UI, color: T.ghost,
      }).setOrigin(0.5).setDepth(DEPTH.content + 1);
    } else {
      b.mutationIds.forEach((id, i) => {
        const def = getMutationDef(id);
        this.add.text(x, modTop + 10 + i * 19, def ? `${def.emoji} ${def.name.toUpperCase()}` : id, {
          fontSize: '10px', fontFamily: FONT_DISPLAY,
          color: done ? T.ghost : T.normal, letterSpacing: 0.5,
        }).setOrigin(0.5).setDepth(DEPTH.content + 1);
      });
    }

    // Payout.
    this.add.text(x, top + h - 46, done ? '✔  CLAIMED' : `💠  ×${b.reward}`, {
      fontSize: done ? '13px' : '19px', fontFamily: FONT_DISPLAY,
      color: done ? T.good : hex(mix(C.corrupt, 0xffffff, 0.55)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (done) {
      this.add.text(x, top + h - 22, 'Wait for new contracts', {
        fontSize: '9px', fontFamily: FONT_UI, color: T.ghost,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      return;
    }

    this.add.text(x, top + h - 22, '▶  ACCEPT', {
      fontSize: '11px', fontFamily: FONT_DISPLAY,
      color: hex(mix(b.color, 0xffffff, 0.55)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0)
      .setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => plate.paint('hover'));
    hit.on('pointerout', () => plate.paint('idle'));
    hit.on('pointerdown', () => this.scene.start('MenuScene', { mode: 'bounty', bounty: b }));
  }

  // ── Shared ───────────────────────────────────────────────────────

  private showMessage(text: string, color: string): void {
    if (this.bubble) { this.bubble.say([text.replace(/\n/g, ' ')]); return; }
    this.messageText.setText(text).setColor(color);
    this.time.delayedCall(3200, () => { if (this.messageText.active) this.messageText.setText(''); });
  }
}
