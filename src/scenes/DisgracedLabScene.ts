import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_ELEMENT_UNLOCK_MAP } from '../data/AbstractElements';
import { findDivinePerkRecipe } from '../data/DivinePerks';
import { PerkDef } from '../data/Perks';
import {
  Bounty, getBounties, msUntilBountyRefresh, formatCountdown,
  difficultyLabel, BOUNTY_REFRESH_COST_NUCLEI,
} from '../data/Bounties';
import { getMutationDef } from '../data/Mutations';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addChip, addHeaderBar, addTabs, addCardPlate, addWell,
  ALL_CORNERS, fillHex, strokeHex, fillDiamond, fillNotched,
  fillNotchedGradient, strokeNotched, drawGlow, drawOrnateRule,
} from '../ui';
import { Music } from '../audio';

/** The lab's own colour — corrupt violet drowned in the dark it was left in. */
const DECAY = mix(C.corrupt, 0x000000, 0.45);

const SLOT_W = 104;
const SLOT_H = 104;

interface ElementDef { id: string; name: string; emoji: string; color: number }

/** Normal elements — base and combined. Exactly one goes in the left socket. */
const NORMAL_ELEMENTS: ElementDef[] = [
  { id: 'fire',     name: 'Fire',     emoji: '🔥',  color: 0xff4400 },
  { id: 'water',    name: 'Water',    emoji: '💧',  color: 0x0088ff },
  { id: 'life',     name: 'Life',     emoji: '🌿',  color: 0x44cc44 },
  { id: 'air',      name: 'Air',      emoji: '💨',  color: 0xaaddff },
  { id: 'earth',    name: 'Earth',    emoji: '🗿',  color: 0x887755 },
  { id: 'oil',      name: 'Oil',      emoji: '🛢️', color: 0x664400 },
  { id: 'shadow',   name: 'Shadow',   emoji: '🌑',  color: 0x330044 },
  { id: 'ice',      name: 'Ice',      emoji: '❄️',  color: 0x88ccff },
  { id: 'growth',   name: 'Growth',   emoji: '🐛',  color: 0x88bb22 },
  { id: 'crystal',  name: 'Crystal',  emoji: '💎',  color: 0x88ccff },
  { id: 'soul',     name: 'Soul',     emoji: '👻',  color: 0xccaaff },
  { id: 'hunt',     name: 'Hunt',     emoji: '🐺',  color: 0xcc4400 },
  { id: 'sand',     name: 'Time',     emoji: '⏳',  color: 0xffdd44 },
  { id: 'gravity',  name: 'Gravity',  emoji: '🌌',  color: 0x8844cc },
  { id: 'creation', name: 'Creation', emoji: '⚒️', color: 0xcc6622 },
];

/** Abstract elements — exactly one goes in the right socket. */
const ABSTRACT_ELEMENTS: ElementDef[] = [
  { id: 'electricity', name: 'Electricity', emoji: '⚡', color: 0xffee00 },
  { id: 'slime',       name: 'Acid',        emoji: '💚', color: 0x66cc44 },
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
  private tab: 0 | 1 = 0;

  private normalId: string | null = null;
  private abstractId: string | null = null;
  private normalVisual: Phaser.GameObjects.Container | null = null;
  private abstractVisual: Phaser.GameObjects.Container | null = null;

  private normalX = 0;
  private normalY = 0;
  private abstractX = 0;
  private abstractY = 0;

  private messageText!: Phaser.GameObjects.Text;
  private divineChip!: { setValue: (v: string) => void };
  private countdownText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'DisgracedLabScene' });
  }

  init(data: { tab?: 0 | 1 }): void {
    this.tab = data?.tab ?? 0;
    this.normalId = null;
    this.abstractId = null;
    this.normalVisual = null;
    this.abstractVisual = null;
    this.countdownText = null;
  }

  create(): void {
    Music.play('lab');
    const { width, height } = this.scale;
    const cx = width / 2;

    this.buildHauntedBackdrop(width, height);

    addHeaderBar(this, {
      title: '⚰  DISGRACED LAB',
      subtitle: this.tab === 0 ? 'WHAT THE KING WAS BUILDING' : 'CONTRACTS  ·  PAID IN DIVINE NUCLEI',
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
      x: cx, y: 92, tabW: 132, tabH: 30,
      active: this.tab,
      tabs: [
        { label: 'FORGE', accent: DECAY },
        { label: 'BOUNTIES', accent: C.gold },
      ],
      onSelect: (idx) => { if (idx !== this.tab) this.scene.restart({ tab: idx as 0 | 1 }); },
    });

    this.messageText = this.add.text(cx, height - 34, '', {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.gold,
      align: 'center', letterSpacing: 0.5, lineSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content + 5);

    if (this.tab === 0) this.buildForgeTab(width, height, cx);
    else this.buildBountiesTab(width, height, cx);
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

    // ── Ingredient trays ─────────────────────────────────────────
    const unlockedAbstract = this.unlockedAbstractElements();

    this.buildTray(cx - 236, 168, 'NORMAL', C.frost, NORMAL_ELEMENTS, 5);
    this.buildTray(cx + 236, 168, 'ABSTRACT', C.corrupt, unlockedAbstract, 5);

    // ── Sockets ──────────────────────────────────────────────────
    const slotY = 452;
    this.normalX = cx - 108;
    this.normalY = slotY;
    this.abstractX = cx + 108;
    this.abstractY = slotY;

    this.drawSocket(this.normalX, slotY, C.frost, 'NORMAL');
    this.drawSocket(this.abstractX, slotY, C.corrupt, 'ABSTRACT');

    // Joiner — a cross with a diamond, matching the Lab upstairs.
    const jg = this.add.graphics().setDepth(DEPTH.panel + 1);
    jg.lineStyle(3, DECAY, 0.8);
    jg.beginPath(); jg.moveTo(cx - 12, slotY); jg.lineTo(cx + 12, slotY); jg.strokePath();
    jg.beginPath(); jg.moveTo(cx, slotY - 12); jg.lineTo(cx, slotY + 12); jg.strokePath();
    fillDiamond(jg, cx, slotY, 4, mix(C.corrupt, 0xffffff, 0.6), 1);

    addButton(this, {
      x: cx, y: slotY + 92, w: 340, h: 52,
      label: 'FORGE DIVINE PERK', icon: '💠', trailing: '1 💠',
      trailingColor: hex(mix(C.corrupt, 0xffffff, 0.4)),
      accent: C.corrupt, variant: 'solid', fontSize: 17, align: 'left',
      onClick: () => this.attemptDivineForge(),
    });
  }

  private unlockedAbstractElements(): ElementDef[] {
    const completed = PlayerData.getCompletedGauntlets();
    return ABSTRACT_ELEMENTS.filter((el) => {
      const needed = ABSTRACT_ELEMENT_UNLOCK_MAP[el.id];
      return needed ? completed.includes(needed) : false;
    });
  }

  /**
   * A wall rack of ingredient tokens. Normal elements outnumber the sockets
   * badly, so they are laid out as a grid of small gems that are dragged down
   * rather than the single row the Lab upstairs uses.
   */
  private buildTray(
    cx: number, top: number, label: string, accent: number,
    elements: ElementDef[], perRow: number,
  ): void {
    this.add.text(cx, top - 18, label, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.4)), letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    if (elements.length === 0) {
      this.add.text(cx, top + 40, 'None unlocked.\nComplete a Gauntlet.', {
        fontSize: '11px', fontFamily: FONT_UI, color: T.ghost, align: 'center', lineSpacing: 5,
      }).setOrigin(0.5).setDepth(DEPTH.content);
      return;
    }

    const step = 84;
    const rows = Math.ceil(elements.length / perRow);
    const gridW = Math.min(perRow, elements.length) * step;

    // Rack plate behind the tokens.
    const rack = this.add.graphics().setDepth(DEPTH.panel - 1);
    const rw = gridW + 12;
    const rh = rows * 74 + 16;
    fillNotched(rack, cx - rw / 2, top - 8, rw, rh, mix(C.well, accent, 0.05), 0.75, 10, ALL_CORNERS);
    strokeNotched(rack, cx - rw / 2, top - 8, rw, rh, mix(accent, C.line, 0.5), 0.4, 1, 10, ALL_CORNERS);

    elements.forEach((el, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, elements.length - row * perRow);
      const ox = cx - (inRow * step) / 2 + step / 2 + col * step;
      const oy = top + 24 + row * 74;
      const token = this.createToken(el, ox, oy);
      this.makeDraggable(token, el.id, ox, oy);
    });
  }

  /** A cut gem in the element's colour — the Lab's token, one size down. */
  private createToken(el: ElementDef, x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(el.color, 0.05);
      g.fillCircle(0, 0, 20 + k * 3);
    }
    fillHex(g, 0, 0, 26, mix(el.color, 0x000000, 0.55), 0.95);
    fillHex(g, 0, 0, 22, mix(el.color, 0x000000, 0.25), 0.95);
    strokeHex(g, 0, 0, 26, mix(el.color, 0xffffff, 0.35), 0.95, 2);
    if (ABSTRACT_ELEMENT_IDS.includes(el.id)) strokeHex(g, 0, 0, 30, C.corrupt, 0.7, 2);

    const emoji = this.add.text(0, -4, el.emoji, { fontSize: '18px' }).setOrigin(0.5);
    const name = this.add.text(0, 15, el.name.toUpperCase(), {
      fontSize: '7px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5);

    return this.add.container(x, y, [g, emoji, name]).setDepth(DEPTH.panel + 2);
  }

  private makeDraggable(
    container: Phaser.GameObjects.Container, elementId: string,
    originX: number, originY: number,
  ): void {
    container.setSize(58, 58);
    container.setInteractive({ useHandCursor: true });
    this.input.setDraggable(container);

    container.on('dragstart', () => container.setDepth(DEPTH.content + 6));
    container.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => container.setPosition(dx, dy));
    container.on('dragend', () => {
      container.setDepth(DEPTH.panel + 2);
      const isAbstract = ABSTRACT_ELEMENT_IDS.includes(elementId);
      const inNormal = Math.abs(container.x - this.normalX) <= SLOT_W / 2
        && Math.abs(container.y - this.normalY) <= SLOT_H / 2;
      const inAbstract = Math.abs(container.x - this.abstractX) <= SLOT_W / 2
        && Math.abs(container.y - this.abstractY) <= SLOT_H / 2;

      // The sockets are typed, so a mis-drop is caught here rather than being
      // allowed through to fail at the forge.
      if (inNormal) {
        if (isAbstract) this.showMessage('⚡ That socket takes a NORMAL element.', '#ff8888');
        else this.seat('normal', elementId);
      } else if (inAbstract) {
        if (!isAbstract) this.showMessage('⚡ That socket takes an ABSTRACT element.', '#ff8888');
        else this.seat('abstract', elementId);
      }
      container.setPosition(originX, originY);
    });
  }

  /** Empty socket: a recessed notched plate with a ghost hexagon. */
  private drawSocket(x: number, y: number, accent: number, label: string): void {
    const g = this.add.graphics().setDepth(DEPTH.panel);
    const left = x - SLOT_W / 2;
    const top = y - SLOT_H / 2;
    fillNotchedGradient(g, left, top, SLOT_W, SLOT_H,
      mix(C.well, accent, 0.06), mix(C.void_, accent, 0.03), 1, 12, ALL_CORNERS, 12);
    strokeNotched(g, left, top, SLOT_W, SLOT_H, accent, 0.7, 2, 12, ALL_CORNERS);
    strokeNotched(g, left + 5, top + 5, SLOT_W - 10, SLOT_H - 10, accent, 0.16, 1, 8, ALL_CORNERS);
    strokeHex(g, x, y - 6, 22, accent, 0.22, 1);
    this.add.text(x, y + SLOT_H / 2 - 13, label, {
      fontSize: '9px', fontFamily: FONT_DISPLAY,
      color: hex(mix(accent, 0x000000, 0.3)), letterSpacing: 1.5,
    }).setOrigin(0.5).setDepth(DEPTH.panel + 1);
  }

  private seat(socket: 'normal' | 'abstract', elementId: string): void {
    const pool = socket === 'normal' ? NORMAL_ELEMENTS : ABSTRACT_ELEMENTS;
    const el = pool.find((e) => e.id === elementId);
    if (!el) return;

    const x = socket === 'normal' ? this.normalX : this.abstractX;
    const y = socket === 'normal' ? this.normalY : this.abstractY;

    if (socket === 'normal') {
      this.normalId = elementId;
      this.normalVisual?.destroy();
      this.normalVisual = this.buildSeated(el, x, y, socket);
    } else {
      this.abstractId = elementId;
      this.abstractVisual?.destroy();
      this.abstractVisual = this.buildSeated(el, x, y, socket);
    }
    this.messageText.setText('');
  }

  private buildSeated(
    el: ElementDef, x: number, y: number, socket: 'normal' | 'abstract',
  ): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    drawGlow(g, -32, -32, 64, 64, el.color, 0.5, 4, 3, 14);
    fillHex(g, 0, 0, 33, mix(el.color, 0x000000, 0.5), 0.97);
    fillHex(g, 0, 0, 28, mix(el.color, 0x000000, 0.2), 0.97);
    strokeHex(g, 0, 0, 33, mix(el.color, 0xffffff, 0.45), 1, 2);
    if (socket === 'abstract') strokeHex(g, 0, 0, 38, C.corrupt, 0.8, 2);

    const emoji = this.add.text(0, -4, el.emoji, { fontSize: '22px' }).setOrigin(0.5);
    const name = this.add.text(0, 18, el.name.toUpperCase(), {
      fontSize: '8px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5);

    const hit = this.add.circle(0, 0, 34, 0xffffff, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (socket === 'normal') {
        this.normalId = null;
        this.normalVisual?.destroy();
        this.normalVisual = null;
      } else {
        this.abstractId = null;
        this.abstractVisual?.destroy();
        this.abstractVisual = null;
      }
    });

    return this.add.container(x, y, [g, emoji, name, hit]).setDepth(DEPTH.panel + 5);
  }

  /**
   * Forge. Only a complete, correctly-typed pairing can spend a nucleus — an
   * unstable pairing or a pairing whose perk has not been discovered yet both
   * leave the player's nuclei untouched.
   */
  private attemptDivineForge(): void {
    this.messageText.setText('');

    if (!this.normalId || !this.abstractId) {
      this.showMessage('Seat one normal and one abstract element.', '#ff8888');
      return;
    }

    const recipe = findDivinePerkRecipe(this.normalId, this.abstractId);
    if (!recipe) {
      this.showMessage('This pairing is not yet understood.\nNo Divine Nucleus was spent.', '#ffcc44');
      return;
    }

    if (PlayerData.isPerkUnlocked(recipe.elementId, recipe.id)) {
      this.showMessage(`${recipe.emoji} ${recipe.name} already forged!`, '#ffcc44');
      return;
    }

    if (!PlayerData.spendDivineNuclei(1)) {
      this.showMessage('Need a Divine Nucleus. Complete a bounty.', '#ff8888');
      return;
    }

    PlayerData.unlockPerk(recipe.elementId, recipe.id);
    this.divineChip.setValue(`×${PlayerData.getDivineNuclei()}`);
    this.showDivinePopup(recipe);
  }

  private showDivinePopup(perk: PerkDef): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const objects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.78)
      .setDepth(DEPTH.overlay).setInteractive();
    objects.push(overlay);

    const g = this.add.graphics().setDepth(DEPTH.modal);
    drawGlow(g, cx - 200, cy - 130, 400, 260, C.corrupt, 0.7, 6, 4, 14);
    fillNotchedGradient(g, cx - 200, cy - 130, 400, 260,
      mix(C.plate, C.corrupt, 0.28), mix(C.void_, C.corrupt, 0.08), 1, 14, ALL_CORNERS, 20);
    strokeNotched(g, cx - 200, cy - 130, 400, 260, mix(C.corrupt, 0xffffff, 0.35), 1, 2, 14, ALL_CORNERS);
    drawOrnateRule(g, cx, cy - 46, 160, C.corrupt, 0.8);
    objects.push(g);

    objects.push(this.add.text(cx, cy - 92, '💠  DIVINE PERK FORGED', {
      fontSize: '17px', fontFamily: FONT_DISPLAY,
      color: hex(mix(C.corrupt, 0xffffff, 0.6)), letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    objects.push(this.add.text(cx, cy - 12, `${perk.emoji}  ${perk.name.toUpperCase()}`, {
      fontSize: '25px', fontFamily: FONT_DISPLAY, color: T.bright,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent));

    objects.push(this.add.text(cx, cy + 26, perk.description, {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal,
      align: 'center', wordWrap: { width: 340 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent));

    const btn = addButton(this, {
      x: cx, y: cy + 100, w: 160, h: 40,
      label: 'CONTINUE', accent: C.corrupt, variant: 'solid',
      fontSize: 14, depth: DEPTH.modalContent,
      onClick: () => {
        for (const o of objects) o.destroy();
        btn.destroy();
        this.normalId = null;
        this.abstractId = null;
        this.normalVisual?.destroy(); this.normalVisual = null;
        this.abstractVisual?.destroy(); this.abstractVisual = null;
      },
    });
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
        this.scene.restart({ tab: 1 });
      },
    });
  }

  private buildBountyCard(b: Bounty, x: number, y: number, w: number, h: number): void {
    const done = PlayerData.isBountyCompleted(b.key);
    const accent = done ? C.steel : b.color;

    const plate = addCardPlate(this, { x, y, w, h, accent, cut: 14, muted: done });
    const top = y - h / 2;

    // Crest — the target element.
    const halo = this.add.graphics().setDepth(DEPTH.content - 1);
    if (!done) {
      for (let k = 5; k >= 1; k--) {
        halo.fillStyle(b.color, 0.05);
        halo.fillCircle(x, top + 46, 14 + k * 5);
      }
    }
    this.add.text(x, top + 46, b.emoji, { fontSize: '34px' })
      .setOrigin(0.5).setDepth(DEPTH.content).setAlpha(done ? 0.4 : 1);
    this.add.text(x, top + 82, b.name.toUpperCase(), {
      fontSize: '13px', fontFamily: FONT_DISPLAY,
      color: done ? T.ghost : hex(mix(b.color, 0xffffff, 0.6)), letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);

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
    this.messageText.setText(text).setColor(color);
    this.time.delayedCall(3200, () => { if (this.messageText.active) this.messageText.setText(''); });
  }
}
