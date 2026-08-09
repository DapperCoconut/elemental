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
  addBackButton, addBackdrop, addButton, addChip, addHeaderBar, addTabs, showToast,
  drawGoldChest, drawMimicChest, fillDiamond,
} from '../ui';
import { Music, Sfx } from '../audio';

/** Grid geometry for the two gold pages. */
const COLS = 5;
const ROWS = 5;
const GRID_TOP = 156;
const GRID_LEFT = 172;
const CELL_W = 154;
const CELL_H = 86;
const CHEST_W = 78;

/** The mimic page is seven big ones, 4 over 3. */
const MIMIC_W = 118;

/**
 * The Vault: three pages of locked chests, priced in 🗝️ Keys.
 *
 * Reached from the campaign world map in every realm. Pages 1–2 are fifty gold chests at one
 * key each; page 3 is seven mimics at three. What is inside is decided by the table in
 * `Vault.ts` — this scene only draws it, charges for it, and puts on the reveal.
 *
 * A chest is opened on a single click. There is no confirm step on purpose: at one key a
 * chest, a modal between every click would be fifty modals, and the reveal *is* the
 * confirmation. The only thing that stops a click is not being able to afford it.
 */
export class VaultScene extends Phaser.Scene {
  private slotIdx: 0 | 1 | 2 = 0;
  private mode: 'normal' | 'abstract' | 'corrupt' = 'normal';
  private page = 0;

  private keyChip!: { setValue: (v: string) => void };
  private pageObjects: Phaser.GameObjects.GameObject[] = [];
  private revealObjects: Phaser.GameObjects.GameObject[] = [];
  /** True while the reveal overlay owns the screen — the grid stops taking clicks. */
  private revealing = false;

  constructor() {
    super({ key: 'VaultScene' });
  }

  init(data: { slotIdx: 0 | 1 | 2; mode?: 'normal' | 'abstract' | 'corrupt'; page?: number }): void {
    this.slotIdx = data?.slotIdx ?? 0;
    this.mode = data?.mode ?? 'normal';
    this.page = Phaser.Math.Clamp(data?.page ?? 0, 0, VAULT_PAGE_COUNT - 1);
  }

  create(): void {
    Music.play('shop');
    const { width } = this.scale;
    this.pageObjects = [];
    this.revealObjects = [];
    this.revealing = false;

    const accent = this.pageAccent;
    addBackdrop(this, { accent, variant: this.page === MIMIC_PAGE ? 'void' : 'lattice', motes: 12 });

    addHeaderBar(this, {
      title: 'THE VAULT',
      subtitle: this.page === MIMIC_PAGE
        ? 'SOMETHING DOWN HERE IS NOT FURNITURE'
        : `STRONGBOX ROW ${this.page + 1}  ·  ONE KEY A LID`,
      accent,
      height: 74,
    });

    this.keyChip = addChip(this, {
      x: width - 16, y: 24, icon: '🗝️', value: `${CP.getKeys(this.slotIdx)}`,
      accent: C.gold, originX: 1, fontSize: 15,
    });
    addChip(this, {
      x: width - 16, y: 54, icon: '⚡', value: `${CP.getSparks(this.slotIdx)}`,
      accent: 0x2ee6c0, originX: 1, fontSize: 12,
    });

    const back = (): void => {
      if (this.revealing) return;
      this.scene.start('CampaignWorldMapScene', { slotIdx: this.slotIdx, mode: this.mode });
    };
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    addTabs(this, {
      x: width / 2, y: 104, tabW: 176, tabH: 30, accent,
      tabs: [
        { label: `ROW I   ${openedOnPage(this.slotIdx, 0)}/${CHESTS_PER_PAGE}`, accent: C.gold },
        { label: `ROW II   ${openedOnPage(this.slotIdx, 1)}/${CHESTS_PER_PAGE}`, accent: C.gold },
        { label: `THE BACK ROOM   ${openedOnPage(this.slotIdx, MIMIC_PAGE)}/7`, accent: C.blood },
      ],
      active: this.page,
      depth: DEPTH.content,
      onSelect: (i) => {
        if (this.revealing || i === this.page) return;
        this.scene.restart({ slotIdx: this.slotIdx, mode: this.mode, page: i });
      },
    });

    this.renderPage();
  }

  private get pageAccent(): number {
    return this.page === MIMIC_PAGE ? C.blood : C.gold;
  }

  // ── Grid ────────────────────────────────────────────────────────────

  private renderPage(): void {
    for (const o of this.pageObjects) o.destroy();
    this.pageObjects = [];

    const { width, height } = this.scale;
    const chests = chestsOnPage(this.page);

    if (this.page === MIMIC_PAGE) {
      this.add.text(width / 2, 142,
        'Seven of them. Three keys each. They do not open — they bite.\nEvery one is an element nothing else in this game will ever hand you.', {
          fontSize: '12px', fontFamily: FONT_UI, color: T.dim, align: 'center', lineSpacing: 5,
        }).setOrigin(0.5, 0).setDepth(DEPTH.content);

      // 4 over 3, both rows centred.
      chests.forEach((chest, i) => {
        const row = i < 4 ? 0 : 1;
        const inRow = row === 0 ? 4 : 3;
        const idx = row === 0 ? i : i - 4;
        const rowW = inRow * 190;
        const x = width / 2 - rowW / 2 + 190 * (idx + 0.5);
        const y = 258 + row * 168;
        this.buildChest(chest, x, y, MIMIC_W);
      });
    } else {
      chests.forEach((chest) => {
        const col = chest.index % COLS;
        const row = Math.floor(chest.index / COLS);
        const x = GRID_LEFT + col * CELL_W;
        const y = GRID_TOP + row * CELL_H;
        this.buildChest(chest, x, y, CHEST_W);
      });
    }

    const done = totalOpened(this.slotIdx);
    const footer = this.add.text(width / 2, height - 22,
      `${done} / ${VAULT_CHESTS.length} LIDS UP`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY,
        color: done === VAULT_CHESTS.length ? T.gold : T.faint, letterSpacing: 2,
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
      const glyph = this.add.text(x, y - h * 0.06, rewardEmoji(chest.reward), {
        fontSize: `${Math.round(w * 0.36)}px`,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2).setAlpha(0.95);
      this.pageObjects.push(glyph);
      const tick = this.add.text(x + w * 0.42, y - h * 0.44, '✓', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: T.good,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2);
      this.pageObjects.push(tick);
    } else {
      const cost = this.add.text(x, y + h * 0.62, `🗝️ ${chest.cost}`, {
        fontSize: chest.mimic ? '13px' : '11px', fontFamily: FONT_DISPLAY,
        color: CP.getKeys(this.slotIdx) >= chest.cost ? T.gold : T.bad, letterSpacing: 0.5,
      }).setOrigin(0.5).setDepth(DEPTH.content + 2);
      this.pageObjects.push(cost);
    }

    // Graphics carries no hit area of its own — an invisible plate does the testing.
    const hit = this.add.rectangle(x, y, w * 1.16, h * 1.5, 0xffffff, 0)
      .setDepth(DEPTH.content + 3)
      .setInteractive({ useHandCursor: !opened });
    this.pageObjects.push(hit);

    if (opened) {
      hit.on('pointerover', () => paint(true));
      hit.on('pointerout', () => paint(false));
      return;
    }

    hit.on('pointerover', () => {
      paint(true);
      Sfx.hover();
      // Mimics twitch when looked at. Gold chests just lift.
      this.tweens.add({
        targets: g, y: chest.mimic ? -3 : -2, duration: chest.mimic ? 90 : 130,
        yoyo: chest.mimic, repeat: chest.mimic ? 1 : 0, ease: 'Sine.easeOut',
      });
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
      showToast(this, result.failure === 'no-keys'
        ? `Not enough keys — this one wants 🗝️ ${chest.cost}`
        : 'That one is already empty', { accent: C.blood });
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

    const { width, height } = this.scale;
    const accent = chest.mimic ? C.blood : C.gold;
    const bigW = chest.mimic ? 190 : 168;
    const cx = width / 2;
    const cy = 178;

    const scrim = this.add.rectangle(cx, height / 2, width, height, 0x03030a, 0)
      .setDepth(DEPTH.overlay).setInteractive();
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

    this.tweens.add({
      targets: state, x: cx, y: cy, w: bigW, duration: 260, ease: 'Cubic.easeOut',
      onUpdate: repaint,
    });

    this.time.delayedCall(250, () => {
      if (chest.mimic) {
        // The lunge: it snaps open, throws itself at the screen, and settles.
        this.cameras.main.shake(260, 0.008);
        this.cameras.main.flash(220, 190, 30, 45);
        Sfx.play('hit-heavy');
        this.tweens.add({
          targets: state, open: 1, duration: 190, ease: 'Back.easeOut', onUpdate: repaint,
        });
        this.tweens.add({
          targets: state, w: bigW * 1.22, duration: 150, yoyo: true, ease: 'Sine.easeOut', onUpdate: repaint,
        });
      } else {
        this.tweens.add({
          targets: state, open: 1, duration: 420, ease: 'Back.easeOut', onUpdate: repaint,
        });
        this.cameras.main.flash(260, 255, 210, 120);
        // Coins spraying out of the lid.
        for (let i = 0; i < 14; i++) {
          const spark = this.add.circle(cx, cy - 10, 3 + Math.random() * 3, mix(C.gold, 0xffffff, Math.random() * 0.6), 0.9)
            .setDepth(DEPTH.overlay + 2);
          this.revealObjects.push(spark);
          this.tweens.add({
            targets: spark,
            x: cx + (Math.random() - 0.5) * 260,
            y: cy - 40 - Math.random() * 90,
            alpha: 0, scale: 0.3,
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

    push(this.add.text(cx, titleY + 24, card.kicker, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(depth));

    const rule = this.add.graphics().setDepth(depth);
    rule.lineStyle(1, accent, 0.4);
    rule.beginPath(); rule.moveTo(cx - 230, titleY + 40); rule.lineTo(cx + 230, titleY + 40); rule.strokePath();
    fillDiamond(rule, cx, titleY + 40, 3, mix(accent, 0xffffff, 0.5), 0.9);
    push(rule);

    // Some upgrade descriptions run to a full paragraph, so the body is clamped to whatever
    // fits above the button rather than being allowed to walk off the bottom of the screen.
    // Nothing is lost: the untruncated text is on the Shop plate the upgrade belongs to.
    const bodyTop = titleY + 52;
    const bodyBottom = height - 96;
    const lineH = 12.5 * 1.35 + 5;
    push(this.add.text(cx, bodyTop, card.body, {
      fontSize: '12.5px', fontFamily: FONT_UI, color: T.normal,
      align: 'center', lineSpacing: 5, wordWrap: { width: 660 },
      maxLines: Math.max(3, Math.floor((bodyBottom - bodyTop) / lineH)),
    }).setOrigin(0.5, 0).setDepth(depth));

    const btn = addButton(this, {
      x: cx, y: height - 62, w: 220, h: 46,
      label: 'TAKE IT', icon: '✦', accent: C.verdant, variant: 'solid', fontSize: 17, depth,
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
    this.scene.restart({ slotIdx: this.slotIdx, mode: this.mode, page: this.page });
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
        emoji: a.emoji,
        title: a.name,
        kicker: 'ARTIFACT  ·  REUSABLE  ·  5 MINUTE COOLDOWN',
        body: `${a.flavor}\n\n${a.lines.map((l) => `• ${l}`).join('\n')}\n\n${a.combo}`,
      };
    }
    case 'element': {
      const el = findElementDef(reward.elementId);
      return {
        emoji: el?.emoji ?? '❓',
        title: el?.name ?? reward.elementId,
        kicker: 'ELEMENT UNLOCKED  ·  PICKABLE EVERYWHERE',
        body: 'It was inside the whole time, and it was awake.\n\n'
          + `${el?.name ?? reward.elementId} is now on every element-select screen in the game — menu, campaign, gauntlet and lobby — and its five shop plates are open.`,
      };
    }
  }
}
