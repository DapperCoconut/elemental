import Phaser from 'phaser';
import * as CP from '../data/CampaignProgress';
import {
  VAULT_CHESTS, VaultChestDef, VaultReward,
  CHESTS_PER_PAGE, MIMIC_PAGE, VAULT_PAGE_COUNT,
  chestsOnPage, openVaultChest, openedOnPage, totalOpened,
} from '../data/Vault';
import { getArtifact } from '../data/Artifacts';
import { getItem } from '../data/Items';
import { getUpgradeDef } from '../data/Upgrades';
import { findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackButton, addButton, addChip, addTabs,
  drawGoldChest, drawMimicChest, fillDiamond,
} from '../ui';
import { addHangingSign, drawPlank, drawShelf, WOOD } from '../ui/Woodwork';
import { SpeechBubble } from '../ui/SpeechBubble';
import { VaultKeeper } from '../ui/characters/VaultKeeper';
import { Music, Sfx } from '../audio';

/** Grid geometry for the two gold pages: five shelves of five. */
const COLS = 5;
const GRID_TOP = 168;
const GRID_LEFT = 212;
const CELL_W = 150;
const CELL_H = 88;
const CHEST_W = 78;

/** The mimic page is seven big ones, 4 over 3. */
const MIMIC_W = 118;

const FLOOR_Y = 612;

/** Scene data: the save slot, the realm, the page, and a line for the keeper to open with. */
interface VaultInit { slotIdx: 0 | 1 | 2; mode?: 'normal' | 'abstract' | 'corrupt'; page?: number; say?: string[] }

/**
 * The Vault: three pages of locked chests, priced in 🗝️ Keys, kept by a clerk who says what
 * each one costs and what came out of it.
 *
 * Reached from the campaign world map in every realm. Pages 1–2 are fifty gold chests at one
 * key each on five shelves; page 3 is the back room — seven mimics at three. What is inside is
 * decided by the table in `Vault.ts`; this scene only draws it, charges for it, and puts on
 * the reveal.
 *
 * A chest is opened on a single click. There is no confirm step on purpose: at one key a
 * chest, a modal between every click would be fifty modals, and the reveal *is* the
 * confirmation. The only thing that stops a click is not being able to afford it.
 */
export class VaultScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private mode: 'normal' | 'abstract' | 'corrupt' = 'normal';
  private page = 0;
  private openingLine: string[] | null = null;

  private keyChip!: { setValue: (v: string) => void };
  private pageObjects: Phaser.GameObjects.GameObject[] = [];
  private revealObjects: Phaser.GameObjects.GameObject[] = [];
  /** True while the reveal overlay owns the screen — the grid stops taking clicks. */
  private revealing = false;
  private keeper: VaultKeeper | null = null;
  private bubble: SpeechBubble | null = null;
  /** What the keeper says about the chest just opened, once its card is taken. */
  private ledgerLine: string | null = null;

  constructor() {
    super({ key: 'VaultScene' });
  }

  init(data: VaultInit): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.mode = data?.mode ?? 'normal';
    this.page = Phaser.Math.Clamp(data?.page ?? 0, 0, VAULT_PAGE_COUNT - 1);
    this.openingLine = data?.say ?? null;
    this.ledgerLine = null;
    this.keeper = null;
    this.bubble = null;
  }

  create(): void {
    Music.play('shop');
    const { width, height } = this.scale;
    this.pageObjects = [];
    this.revealObjects = [];
    this.revealing = false;

    const accent = this.pageAccent;
    const back = this.page === MIMIC_PAGE;
    this.paintRoom(width, height, back);

    addHangingSign(this, {
      x: width / 2, y: 8, w: 320, h: 44, drop: 26, fontSize: 14,
      label: back ? 'THE BACK ROOM' : `THE VAULT  ·  ROW ${this.page === 0 ? 'I' : 'II'}`,
      accent: mix(accent, WOOD.paint, 0.5),
    });

    this.keyChip = addChip(this, {
      x: width - 16, y: 24, icon: '🗝️', value: `${CP.getKeys(this.slotIdx)}`, accent: C.gold, originX: 1, fontSize: 15,
    });
    addChip(this, {
      x: width - 16, y: 54, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`, accent: 0x2ee6c0, originX: 1, fontSize: 12,
    });

    const leave = (): void => {
      if (this.revealing) return;
      this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: this.mode });
    };
    addBackButton(this, leave);
    this.input.keyboard!.on('keydown-ESC', leave);

    addTabs(this, {
      x: width / 2, y: 112, tabW: 176, tabH: 30, accent,
      tabs: [
        { label: `ROW I   ${openedOnPage(this.slotIdx, 0)}/${CHESTS_PER_PAGE}`, accent: C.gold },
        { label: `ROW II   ${openedOnPage(this.slotIdx, 1)}/${CHESTS_PER_PAGE}`, accent: C.gold },
        { label: `THE BACK ROOM   ${openedOnPage(this.slotIdx, MIMIC_PAGE)}/7`, accent: C.blood },
      ],
      active: this.page,
      depth: DEPTH.content,
      onSelect: (i) => {
        if (this.revealing || i === this.page) return;
        this.scene.restart({ slotIdx: this.slotIdx, mode: this.mode, page: i } as VaultInit);
      },
    });

    // The keeper at his lectern, bottom left.
    // A short lectern he stands beside, ledger open on it; he is drawn in front of it.
    const lx = 118;
    const lg = this.add.graphics().setDepth(DEPTH.panel + 1);
    drawPlank(lg, lx - 36, FLOOR_Y - 84, 72, 10, { seed: 51, lit: 0.1 });
    lg.fillStyle(WOOD.dark, 1); lg.fillRect(lx - 32, FLOOR_Y - 74, 64, 6);
    drawPlank(lg, lx - 20, FLOOR_Y - 68, 40, 68, { seed: 52, vertical: true, lit: -0.15 });
    lg.fillStyle(0xe6d7b0, 1); lg.fillRect(lx - 28, FLOOR_Y - 92, 56, 8);
    lg.fillStyle(0xd0c09a, 1); lg.fillRect(lx, FLOOR_Y - 92, 28, 8);
    lg.lineStyle(1, 0x4a3a2a, 0.6); lg.lineBetween(lx - 22, FLOOR_Y - 88, lx - 6, FLOOR_Y - 88); lg.lineBetween(lx + 6, FLOOR_Y - 88, lx + 22, FLOOR_Y - 88);
    this.keeper = new VaultKeeper(this, 70, FLOOR_Y - 2, { scale: 0.86, depth: DEPTH.panel + 2 });
    const m = this.keeper.mouth();
    // The bubble hugs the left wall, in the strip beside the shelves.
    this.bubble = new SpeechBubble(this, {
      anchorX: m.x, anchorY: m.y, side: 'right', width: 178, offsetX: -92, accent: C.gold,
      depth: DEPTH.overlay + 8, onTalk: (on) => this.keeper?.setTalking(on),
    });

    this.renderPage();

    const keys = CP.getKeys(this.slotIdx);
    const opener = this.openingLine ?? [back
      ? `Keys: ${keys}. Three a lid in here. They bite. Click one.`
      : `Keys: ${keys}. One key a lid. Click a chest and it opens.`];
    this.time.delayedCall(350, () => this.bubble?.say(opener, { silent: true }));
  }

  private get pageAccent(): number {
    return this.page === MIMIC_PAGE ? C.blood : C.gold;
  }

  // ── The room ────────────────────────────────────────────────────────

  /** Dressed stone, a flagstone floor, iron sconces; the back room is darker and bare. */
  private paintRoom(width: number, height: number, back: boolean): void {
    const g = this.add.graphics().setDepth(DEPTH.backdrop);
    const base = back ? 0x16100f : 0x1c1a16;
    g.fillStyle(base, 1); g.fillRect(0, 0, width, height);
    // Stone blocks, offset per course.
    const bw = 96;
    const bh = 34;
    for (let row = 0; row * bh < FLOOR_Y; row++) {
      for (let col = -1; col * bw < width + bw; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        const y = row * bh;
        const h = Math.sin((row * 11 + col * 17) * 12.9898) * 43758.5453;
        const u = h - Math.floor(h);
        g.fillStyle(mix(back ? 0x2a2220 : 0x3a3630, back ? 0x332a28 : 0x4a453c, u), 1);
        g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        g.fillStyle(0xffffff, 0.035); g.fillRect(x + 1.5, y + 1.5, bw - 3, 2);
        g.fillStyle(0x000000, 0.18); g.fillRect(x + 1.5, y + bh - 3.5, bw - 3, 2);
      }
    }
    for (let k = 0; k < 10; k++) { g.fillStyle(0x000000, 0.05); g.fillRect(0, k * 10, width, 10); }
    // Flagstone floor.
    g.fillStyle(back ? 0x120d0c : 0x1a1714, 1); g.fillRect(0, FLOOR_Y - 8, width, height - FLOOR_Y + 8);
    g.lineStyle(1, 0x000000, 0.5);
    for (let x = -20; x < width; x += 110) g.lineBetween(x, FLOOR_Y - 8, x + 30, height);
    g.lineBetween(0, FLOOR_Y + 12, width, FLOOR_Y + 12);
    g.fillStyle(0xffffff, 0.04); g.fillRect(0, FLOOR_Y - 8, width, 2);
    // Vignette.
    for (let k = 0; k < 18; k++) {
      g.fillStyle(0x000000, (back ? 0.07 : 0.045) * (1 - k / 18));
      g.fillRect(k * 5, 0, 5, height); g.fillRect(width - k * 5 - 5, 0, 5, height);
      g.fillRect(0, height - k * 5 - 5, width, 5); g.fillRect(0, k * 5, width, 5);
    }
    // Sconces either side, with a warm pool; the back room's gutter red.
    for (const sx of [150, width - 150]) {
      const light = this.add.graphics().setDepth(DEPTH.backdrop + 1);
      const col = back ? 0xff4d4d : 0xffb347;
      for (let k = 8; k >= 1; k--) { light.fillStyle(col, back ? 0.018 : 0.026); light.fillCircle(sx, 110, k * 26); }
      this.tweens.add({ targets: light, alpha: { from: back ? 0.4 : 0.8, to: 1 }, duration: back ? 420 : 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      g.fillStyle(0x3b3a44, 1); g.fillRect(sx - 4, 90, 8, 30);
      g.fillStyle(0x15121a, 1); g.fillTriangle(sx - 12, 92, sx + 12, 92, sx, 74);
      g.fillStyle(col, 0.9); g.fillEllipse(sx, 84, 7, 12);
      g.fillStyle(0xffffff, 0.8); g.fillEllipse(sx, 86, 3, 6);
    }
    if (back) {
      // Sawdust, a dropped key, scratches on the floor where something was dragged.
      g.fillStyle(0x5a4a30, 0.35);
      for (let i = 0; i < 14; i++) { const h = Math.sin(i * 91.7) * 43758.5453; const u = h - Math.floor(h); g.fillEllipse(80 + u * (width - 160), FLOOR_Y + 4 + ((u * 7.3) % 1) * 20, 20 + u * 30, 4); }
      g.lineStyle(1.5, 0x000000, 0.5); g.lineBetween(420, FLOOR_Y + 2, 520, FLOOR_Y + 22); g.lineBetween(440, FLOOR_Y, 530, FLOOR_Y + 18);
    }
  }

  // ── Grid ────────────────────────────────────────────────────────────

  private renderPage(): void {
    for (const o of this.pageObjects) o.destroy();
    this.pageObjects = [];

    const { width, height } = this.scale;
    const chests = chestsOnPage(this.page);

    if (this.page === MIMIC_PAGE) {
      const note = this.add.text(width / 2, 146,
        'Seven of them. Three keys each. They do not open — they bite.\nEvery one is an element nothing else in this game will ever hand you.', {
          fontSize: '12px', fontFamily: FONT_UI, color: T.dim, align: 'center', lineSpacing: 5,
        }).setOrigin(0.5, 0).setDepth(DEPTH.content);
      this.pageObjects.push(note);

      // 4 over 3, both rows centred, each row on a long shelf.
      const sg = this.add.graphics().setDepth(DEPTH.panel);
      this.pageObjects.push(sg);
      for (const [row, inRow] of [[0, 4], [1, 3]] as const) {
        const y = 268 + row * 170;
        const w = inRow * 190 + 40;
        drawShelf(sg, width / 2 - w / 2 + (row === 1 ? 20 : 0), y + MIMIC_W * 0.43 + 4, w - (row === 1 ? 40 : 0), 60 + row);
      }
      chests.forEach((chest, i) => {
        const row = i < 4 ? 0 : 1;
        const inRow = row === 0 ? 4 : 3;
        const idx = row === 0 ? i : i - 4;
        const rowW = inRow * 190;
        const x = width / 2 - rowW / 2 + 190 * (idx + 0.5);
        const y = 268 + row * 170;
        this.buildChest(chest, x, y, MIMIC_W);
      });
    } else {
      // Five shelves, drawn before the chests so the lids sit on them.
      const sg = this.add.graphics().setDepth(DEPTH.panel);
      this.pageObjects.push(sg);
      const shelfX = GRID_LEFT - CELL_W / 2 + 6;
      const shelfW = COLS * CELL_W - 12;
      for (let row = 0; row < 5; row++) {
        drawShelf(sg, shelfX, GRID_TOP + row * CELL_H + CHEST_W * 0.43 + 4, shelfW, 70 + row + this.page * 5);
      }
      chests.forEach((chest) => {
        const col = chest.index % COLS;
        const row = Math.floor(chest.index / COLS);
        this.buildChest(chest, GRID_LEFT + col * CELL_W, GRID_TOP + row * CELL_H, CHEST_W);
      });
    }

    const done = totalOpened(this.slotIdx);
    const footer = this.add.text(width / 2, height - 14, `${done} / ${VAULT_CHESTS.length} LIDS UP`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: done === VAULT_CHESTS.length ? T.gold : T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.pageObjects.push(footer);
  }

  private buildChest(chest: VaultChestDef, x: number, y: number, w: number): void {
    const opened = CP.isVaultChestOpened(this.slotIdx, chest.id);
    const h = w * 0.86;
    const g = this.add.graphics().setDepth(DEPTH.content);
    this.pageObjects.push(g);

    const paint = (hot: boolean): void => {
      g.clear();
      const opts = { open: opened ? 1 : 0, hot, spent: opened };
      if (chest.mimic) drawMimicChest(g, x, y, w, opts);
      else drawGoldChest(g, x, y, w, opts);
    };
    paint(false);

    // What it turned out to be — the grid doubles as a trophy case once emptied.
    if (opened) {
      const glyph = this.add.text(x, y - h * 0.06, rewardEmoji(chest.reward), { fontSize: `${Math.round(w * 0.36)}px` })
        .setOrigin(0.5).setDepth(DEPTH.content + 2).setAlpha(0.95);
      this.pageObjects.push(glyph);
      const tick = this.add.text(x + w * 0.42, y - h * 0.44, '✓', { fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.good })
        .setOrigin(0.5).setDepth(DEPTH.content + 2);
      this.pageObjects.push(tick);
    } else {
      // A tag on the lid: the price, red when short.
      const cost = this.add.text(x, y + h * 0.62, `🗝️ ${chest.cost}`, {
        fontSize: chest.mimic ? '13px' : '11px', fontFamily: FONT_DISPLAY,
        color: CP.getKeys(this.slotIdx) >= chest.cost ? T.gold : T.bad, letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2);
      this.pageObjects.push(cost);
    }

    // Graphics carries no hit area of its own — an invisible plate does the testing.
    const hit = this.add.rectangle(x, y, w * 1.16, h * 1.5, 0xffffff, 0).setDepth(DEPTH.content + 3).setInteractive({ useHandCursor: !opened });
    this.pageObjects.push(hit);

    if (opened) {
      hit.on('pointerover', () => paint(true));
      hit.on('pointerout', () => paint(false));
      return;
    }

    hit.on('pointerover', () => {
      paint(true);
      Sfx.hover();
      this.keeper?.lookAt(x, y);
      // Mimics twitch when looked at. Gold chests just lift.
      this.tweens.add({ targets: g, y: chest.mimic ? -3 : -2, duration: chest.mimic ? 90 : 130, yoyo: chest.mimic, repeat: chest.mimic ? 1 : 0, ease: 'Sine.easeOut' });
    });
    hit.on('pointerout', () => {
      paint(false);
      this.tweens.add({ targets: g, y: 0, duration: 130 });
    });
    hit.on('pointerdown', () => this.tryOpen(chest, x, y, w));
  }

  private tryOpen(chest: VaultChestDef, x: number, y: number, w: number): void {
    if (this.revealing) return;
    const result = openVaultChest(this.slotIdx, chest.id);
    if (!result.ok || !result.reward) {
      Sfx.denied();
      this.keeper?.setMood('grumpy', 1800);
      this.bubble?.say([result.failure === 'no-keys'
        ? `That one wants ${chest.cost} key${chest.cost === 1 ? '' : 's'}. You have ${CP.getKeys(this.slotIdx)}.`
        : 'That one is already empty.']);
      return;
    }
    this.keyChip.setValue(`${CP.getKeys(this.slotIdx)}`);
    this.playReveal(chest, result.reward, x, y, w);
  }

  // ── Reveal ──────────────────────────────────────────────────────────

  /**
   * The pay-off. The clicked chest is redrawn full size in the middle of a darkened screen
   * and tweened open; a mimic gets a lunge and a shake on top. Only when the lid is all the
   * way back does the card naming the contents come up.
   */
  private playReveal(chest: VaultChestDef, reward: VaultReward, fromX: number, fromY: number, gridW: number): void {
    this.revealing = true;
    Sfx.play(chest.mimic ? 'ui-open' : 'ui-purchase');
    this.bubble?.hide();
    this.keeper?.setMood(chest.mimic ? 'shocked' : 'pleased', 3000);
    if (chest.mimic) this.keeper?.knock(1);

    const { width, height } = this.scale;
    const accent = chest.mimic ? C.blood : C.gold;
    const bigW = chest.mimic ? 190 : 168;
    const cx = width / 2;
    const cy = 178;

    const scrim = this.add.rectangle(cx, height / 2, width, height, 0x03030a, 0).setDepth(DEPTH.overlay).setInteractive();
    this.revealObjects.push(scrim);
    this.tweens.add({ targets: scrim, fillAlpha: 0.88, duration: 200 });

    const g = this.add.graphics().setDepth(DEPTH.overlay + 1);
    this.revealObjects.push(g);

    // Starts at the grid tile and flies to the middle, so the eye never loses which one it was.
    const state = { open: 0, x: fromX, y: fromY, w: gridW };
    const repaint = (): void => {
      g.clear();
      if (chest.mimic) drawMimicChest(g, state.x, state.y, state.w, { open: state.open });
      else drawGoldChest(g, state.x, state.y, state.w, { open: state.open });
    };
    repaint();
    this.tweens.add({ targets: state, x: cx, y: cy, w: bigW, duration: 260, ease: 'Cubic.easeOut', onUpdate: repaint });

    this.time.delayedCall(250, () => {
      if (chest.mimic) {
        this.cameras.main.shake(260, 0.008);
        this.cameras.main.flash(220, 190, 30, 45);
        Sfx.play('hit-heavy');
        this.tweens.add({ targets: state, open: 1, duration: 190, ease: 'Back.easeOut', onUpdate: repaint });
        this.tweens.add({ targets: state, w: bigW * 1.22, duration: 150, yoyo: true, ease: 'Sine.easeOut', onUpdate: repaint });
      } else {
        this.tweens.add({ targets: state, open: 1, duration: 420, ease: 'Back.easeOut', onUpdate: repaint });
        this.cameras.main.flash(260, 255, 210, 120);
        for (let i = 0; i < 14; i++) {
          const spark = this.add.circle(cx, cy - 10, 3 + Math.random() * 3, mix(C.gold, 0xffffff, Math.random() * 0.6), 0.9).setDepth(DEPTH.overlay + 2);
          this.revealObjects.push(spark);
          this.tweens.add({
            targets: spark, x: cx + (Math.random() - 0.5) * 260, y: cy - 40 - Math.random() * 90, alpha: 0, scale: 0.3,
            duration: 520 + Math.random() * 340, ease: 'Quad.easeOut',
          });
        }
      }
    });

    this.time.delayedCall(chest.mimic ? 620 : 760, () => this.buildRewardCard(reward, chest, accent));
  }

  private buildRewardCard(reward: VaultReward, chest: VaultChestDef, accent: number): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const depth = DEPTH.overlay + 4;
    const push = (o: Phaser.GameObjects.GameObject): void => { this.revealObjects.push(o); };

    const card = describeReward(reward);

    if (chest.mimic) {
      push(this.add.text(cx, 280, 'IT WAS NEVER A CHEST', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(C.blood, 0xffffff, 0.45)), letterSpacing: 4,
      }).setOrigin(0.5).setDepth(depth));
    }
    const titleY = chest.mimic ? 312 : 292;
    push(this.add.text(cx, titleY, `${card.emoji}  ${card.title}`, {
      fontSize: '26px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.65)),
      stroke: hex(mix(accent, 0x000000, 0.75)), strokeThickness: 4, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(depth));
    push(this.add.text(cx, titleY + 24, card.kicker, { fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3 }).setOrigin(0.5).setDepth(depth));

    const rule = this.add.graphics().setDepth(depth);
    rule.lineStyle(1, accent, 0.4);
    rule.beginPath(); rule.moveTo(cx - 230, titleY + 40); rule.lineTo(cx + 230, titleY + 40); rule.strokePath();
    fillDiamond(rule, cx, titleY + 40, 3, mix(accent, 0xffffff, 0.5), 0.9);
    push(rule);

    // Long bodies clamp above the button rather than walking off the bottom of the screen.
    const bodyTop = titleY + 52;
    const bodyBottom = height - 96;
    const lineH = 12.5 * 1.35 + 5;
    push(this.add.text(cx, bodyTop, card.body, {
      fontSize: '12.5px', fontFamily: FONT_UI, color: T.normal, align: 'center', lineSpacing: 5, wordWrap: { width: 660 },
      maxLines: Math.max(3, Math.floor((bodyBottom - bodyTop) / lineH)),
    }).setOrigin(0.5, 0).setDepth(depth));

    // The keeper reads the ledger entry out loud once the card is taken — spoken over it, the
    // bubble would sit across the card's text.
    const chestNo = chest.mimic ? `Mimic ${chest.index + 1}` : `Chest ${chest.page * CHESTS_PER_PAGE + chest.index + 1}`;
    this.ledgerLine = `${chestNo}: ${card.title}. ${chest.cost} key${chest.cost === 1 ? '' : 's'}. ${CP.getKeys(this.slotIdx)} left. Next lid?`;

    const btn = addButton(this, {
      x: cx, y: height - 62, w: 220, h: 46, label: 'TAKE IT', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 17, depth,
      onClick: () => this.closeReveal(),
    });
    push(btn.container);
    this.input.keyboard!.once('keydown-SPACE', () => this.closeReveal());
  }

  private closeReveal(): void {
    if (!this.revealing) return;
    this.revealing = false;
    for (const o of this.revealObjects) o.destroy();
    this.revealObjects = [];
    // The tab counters and the key chip both moved, so the page is rebuilt wholesale.
    this.scene.restart({
      slotIdx: this.slotIdx, mode: this.mode, page: this.page,
      say: [this.ledgerLine ?? `Keys: ${CP.getKeys(this.slotIdx)}. Next lid?`],
    } as VaultInit);
  }
}

// ── Reward prose ──────────────────────────────────────────────────────

function rewardEmoji(reward: VaultReward): string {
  switch (reward.kind) {
    case 'upgrade': return findElementDef(reward.elementId)?.emoji ?? '⭐';
    case 'artifact': return getArtifact(reward.artifactId)?.emoji ?? '🔮';
    case 'element': return findElementDef(reward.elementId)?.emoji ?? '❓';
  }
}

interface RewardCard { emoji: string; title: string; kicker: string; body: string }

/** Everything the reveal card says, built from the reward itself so it can never overpromise. */
export function describeReward(reward: VaultReward): RewardCard {
  switch (reward.kind) {
    case 'upgrade': {
      const el = findElementDef(reward.elementId);
      const up = getUpgradeDef(reward.elementId, reward.slot);
      const items = reward.items.map((id) => {
        const def = getItem(id);
        return def ? `${def.emoji} ${def.name}` : id;
      });
      return {
        emoji: el?.emoji ?? '⭐',
        title: up?.name ?? 'Upgrade',
        kicker: `${(el?.name ?? reward.elementId).toUpperCase()}  ·  ${(up?.displayKey ?? reward.slot).toUpperCase()} SLOT  ·  UNLOCKED AND EQUIPPED`,
        // Purse first: the description can run to a paragraph and the card clamps long
        // bodies, so the part that would be missed if anything were cut goes at the top.
        body: `⚡ ${reward.sparks} Sparks     ${items.join('     ')}\n\n${up?.description ?? 'A shop upgrade, yours without paying for it.'}`,
      };
    }
    case 'artifact': {
      const a = getArtifact(reward.artifactId);
      if (!a) return { emoji: '🔮', title: 'Artifact', kicker: 'ARTIFACT', body: '' };
      return {
        emoji: a.emoji, title: a.name, kicker: 'ARTIFACT  ·  REUSABLE  ·  5 MINUTE COOLDOWN',
        body: `${a.flavor}\n\n${a.lines.map((l) => `• ${l}`).join('\n')}\n\n${a.combo}`,
      };
    }
    case 'element': {
      const el = findElementDef(reward.elementId);
      return {
        emoji: el?.emoji ?? '❓', title: el?.name ?? reward.elementId, kicker: 'ELEMENT UNLOCKED  ·  PICKABLE EVERYWHERE',
        body: 'It was inside the whole time, and it was awake.\n\n'
          + `${el?.name ?? reward.elementId} is now on every element-select screen in the game — menu, campaign, gauntlet and lobby — and its five shop plates are open.`,
      };
    }
  }
}
