import Phaser from 'phaser';
import * as Ranked from '../data/RankedData';
import { ElementDef, findElementDef } from '../data/ElementRoster';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addScrim, UiButton,
} from '../ui';
import { Music, Sfx } from '../audio';

const TILE_W = 84;
const TILE_H = 54;
const GAP = 6;
const COLS = 10;

/**
 * Ranked ban phase. The player strikes five elements from the bot's roster; then the
 * bot's five random strikes against the player's own pool are revealed card by card.
 * Both lists ride on to `RankedSelectScene`.
 */
export class RankedBanScene extends Phaser.Scene {
  private bans: string[] = [];
  private tiles = new Map<string, { paint: (state: 'idle' | 'hover') => void }>();
  private counter!: Phaser.GameObjects.Text;
  private confirmBtn!: UiButton;
  private revealing = false;

  constructor() {
    super({ key: 'RankedBanScene' });
  }

  create(): void {
    Music.play('menu');
    this.bans = [];
    this.tiles.clear();
    this.revealing = false;
    const { width, height } = this.scale;
    const p = Ranked.getProfile();

    addBackdrop(this, { accent: C.blood, variant: 'lattice', motes: 14 });
    const back = () => { if (!this.revealing) this.scene.start('RankedScene'); };
    addBackButton(this, back);
    this.input.keyboard?.on('keydown-ESC', back);

    this.add.text(width / 2, 36, 'BAN PHASE', {
      fontSize: '32px', fontFamily: FONT_DISPLAY, letterSpacing: 8,
      color: hex(mix(C.blood, 0xffffff, 0.65)), stroke: hex(mix(C.blood, 0x000000, 0.8)), strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(width / 2, 66, `Strike ${Ranked.RANKED_BAN_COUNT} elements the ${p.name} bot may not field. It will strike back.`, {
      fontSize: '12px', fontFamily: FONT_UI, color: T.normal,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.counter = this.add.text(width / 2, 90, '', {
      fontSize: '14px', fontFamily: FONT_DISPLAY, letterSpacing: 2, color: T.gold,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const roster = Ranked.rankedBotRoster();
    const rows = Math.ceil(roster.length / COLS);
    const gridW = COLS * TILE_W + (COLS - 1) * GAP;
    const x0 = width / 2 - gridW / 2 + TILE_W / 2;
    const y0 = 128;
    roster.forEach((el, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // Centre a short last row.
      const inRow = row === rows - 1 ? roster.length - row * COLS : COLS;
      const rowOffset = ((COLS - inRow) * (TILE_W + GAP)) / 2;
      this.buildTile(el, x0 + rowOffset + col * (TILE_W + GAP), y0 + row * (TILE_H + GAP));
    });

    const btnY = height - 46;
    addButton(this, {
      x: width / 2 - 200, y: btnY, w: 180, h: 46, label: 'RANDOM', sublabel: 'fill remaining bans',
      iconArt: 'refresh', accent: C.steel, variant: 'ghost', fontSize: 14,
      onClick: () => this.fillRandom(),
    });
    addButton(this, {
      x: width / 2 + 200, y: btnY, w: 180, h: 46, label: 'CLEAR', iconArt: 'cross',
      accent: C.steel, variant: 'quiet', fontSize: 14,
      onClick: () => { if (this.revealing) return; this.bans = []; this.repaintAll(); },
    });
    this.confirmBtn = addButton(this, {
      x: width / 2, y: btnY, w: 200, h: 52, label: 'LOCK BANS', iconArt: 'lock',
      accent: C.blood, variant: 'solid', fontSize: 17, disabled: true,
      onClick: () => this.confirm(),
    });

    this.repaintAll();
  }

  private buildTile(el: ElementDef, x: number, y: number): void {
    const g = this.add.graphics().setDepth(DEPTH.panel);
    const emoji = this.add.text(x, y - 8, el.emoji, { fontSize: '20px' }).setOrigin(0.5).setDepth(DEPTH.content);
    const name = this.add.text(x, y + 16, el.name.toUpperCase(), {
      fontSize: '9px', fontFamily: FONT_DISPLAY, letterSpacing: 1, color: T.normal,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    const cross = this.add.graphics().setDepth(DEPTH.content + 1);

    const paint = (state: 'idle' | 'hover'): void => {
      const banned = this.bans.includes(el.id);
      const full = this.bans.length >= Ranked.RANKED_BAN_COUNT;
      const col = banned ? C.blood : el.color;
      const lift = state === 'hover' ? 0.12 : 0;
      g.clear();
      const base = banned ? mix(C.plate, C.blood, 0.32) : mix(C.plate, el.color, 0.12 + lift);
      g.fillStyle(mix(base, 0x000000, 0.15), 1);
      g.fillRect(x - TILE_W / 2, y - TILE_H / 2, TILE_W, TILE_H);
      g.fillStyle(mix(base, 0xffffff, 0.06), 1);
      g.fillRect(x - TILE_W / 2, y - TILE_H / 2, TILE_W, TILE_H * 0.45);
      g.lineStyle(banned || state === 'hover' ? 2 : 1, mix(col, 0xffffff, 0.2), banned ? 1 : state === 'hover' ? 0.9 : 0.4);
      g.strokeRect(x - TILE_W / 2, y - TILE_H / 2, TILE_W, TILE_H);
      const dim = !banned && full;
      emoji.setAlpha(banned ? 0.45 : dim ? 0.4 : 1);
      name.setColor(banned ? hex(mix(C.blood, 0xffffff, 0.55)) : dim ? T.faint : T.normal);
      cross.clear();
      if (banned) {
        cross.lineStyle(4, 0x000000, 0.5);
        cross.lineBetween(x - 18, y - 18, x + 18, y + 10);
        cross.lineBetween(x + 18, y - 18, x - 18, y + 10);
        cross.lineStyle(3, C.blood, 1);
        cross.lineBetween(x - 18, y - 19, x + 18, y + 9);
        cross.lineBetween(x + 18, y - 19, x - 18, y + 9);
      }
    };
    paint('idle');
    this.tiles.set(el.id, { paint });

    const hit = this.add.rectangle(x, y, TILE_W, TILE_H, 0xffffff, 0)
      .setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (!this.revealing) { paint('hover'); Sfx.hover(); } });
    hit.on('pointerout', () => paint('idle'));
    hit.on('pointerdown', () => this.toggle(el.id));
  }

  private toggle(id: string): void {
    if (this.revealing) return;
    const i = this.bans.indexOf(id);
    if (i >= 0) {
      this.bans.splice(i, 1);
      Sfx.play('ui-back');
    } else if (this.bans.length < Ranked.RANKED_BAN_COUNT) {
      this.bans.push(id);
      Sfx.play('ui-equip');
      this.cameras.main.shake(60, 0.002);
    } else {
      Sfx.play('ui-denied');
      return;
    }
    this.repaintAll();
  }

  private fillRandom(): void {
    if (this.revealing) return;
    const pool = Ranked.rankedBotRoster().map((e) => e.id).filter((id) => !this.bans.includes(id));
    while (this.bans.length < Ranked.RANKED_BAN_COUNT && pool.length) {
      const j = Math.floor(Math.random() * pool.length);
      this.bans.push(pool.splice(j, 1)[0]);
    }
    Sfx.play('ui-equip');
    this.repaintAll();
  }

  private repaintAll(): void {
    for (const t of this.tiles.values()) t.paint('idle');
    const n = this.bans.length;
    this.counter.setText(`BANS  ${n} / ${Ranked.RANKED_BAN_COUNT}    ${'✖'.repeat(n)}${'◇'.repeat(Ranked.RANKED_BAN_COUNT - n)}`);
    this.confirmBtn.setDisabled(n < Ranked.RANKED_BAN_COUNT);
  }

  // ── The bot's answer ────────────────────────────────────────────────

  private confirm(): void {
    if (this.revealing || this.bans.length < Ranked.RANKED_BAN_COUNT) return;
    this.revealing = true;
    const botBans = Ranked.rollBotBans();
    const playerBans = [...this.bans];
    const { width, height } = this.scale;
    const cx = width / 2;

    addScrim(this, 0.82, DEPTH.overlay);
    this.add.text(cx, 150, 'THE BOT STRIKES BACK', {
      fontSize: '30px', fontFamily: FONT_DISPLAY, letterSpacing: 6,
      color: hex(mix(C.blood, 0xffffff, 0.6)), stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    this.add.text(cx, 186, botBans.length < Ranked.RANKED_BAN_COUNT
      ? `Your roster is small — it only bans ${botBans.length}.`
      : 'Five of your elements are off the table.', {
      fontSize: '13px', fontFamily: FONT_UI, color: T.normal,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    const cardW = 120, cardH = 156, gap = 18;
    const n = Math.max(1, botBans.length);
    const startX = cx - ((n - 1) * (cardW + gap)) / 2;
    const cardY = 316;

    if (botBans.length === 0) {
      this.add.text(cx, cardY, 'You only own one element — nothing to ban.', {
        fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.gold,
      }).setOrigin(0.5).setDepth(DEPTH.modalContent);
    }

    botBans.forEach((id, i) => {
      const el = findElementDef(id);
      const x = startX + i * (cardW + gap);
      const card = this.add.container(x, cardY).setDepth(DEPTH.modalContent).setScale(0, 1);
      const g = this.add.graphics();
      const col = el?.color ?? C.steel;
      for (let k = 4; k >= 1; k--) {
        g.lineStyle(2, C.blood, 0.08 * (5 - k));
        g.strokeRect(-cardW / 2 - k * 3, -cardH / 2 - k * 3, cardW + k * 6, cardH + k * 6);
      }
      g.fillStyle(mix(C.plate, col, 0.22), 1);
      g.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      g.fillStyle(mix(C.plate, col, 0.35), 1);
      g.fillRect(-cardW / 2, -cardH / 2, cardW, cardH * 0.4);
      g.lineStyle(2, C.blood, 1);
      g.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
      const emoji = this.add.text(0, -24, el?.emoji ?? '?', { fontSize: '44px' }).setOrigin(0.5);
      const name = this.add.text(0, 34, (el?.name ?? id).toUpperCase(), {
        fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
      }).setOrigin(0.5);
      const stamp = this.add.text(0, 58, 'BANNED', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, letterSpacing: 3, color: hex(mix(C.blood, 0xffffff, 0.4)),
      }).setOrigin(0.5);
      const slash = this.add.graphics();
      slash.lineStyle(5, C.blood, 0.9);
      slash.lineBetween(-cardW / 2 + 12, -cardH / 2 + 14, cardW / 2 - 12, 10);
      slash.setAlpha(0);
      card.add([g, emoji, name, stamp, slash]);

      const delay = 500 + i * 420;
      this.tweens.add({
        targets: card, scaleX: 1, duration: 260, delay, ease: 'Back.easeOut',
        onStart: () => Sfx.play('ui-open'),
      });
      this.tweens.add({
        targets: slash, alpha: 1, duration: 120, delay: delay + 260,
        onStart: () => { Sfx.play('hit-medium'); this.cameras.main.shake(80, 0.004); },
      });
    });

    // Your own strikes, for the record.
    const yours = playerBans.map((id) => findElementDef(id)?.emoji ?? '?').join('  ');
    this.add.text(cx, 430, `YOU BANNED:  ${yours}`, {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    const total = 500 + botBans.length * 420 + 500;
    this.time.delayedCall(total, () => {
      addButton(this, {
        x: cx, y: height - 110, w: 300, h: 54, label: 'CHOOSE YOUR ELEMENT', iconArt: 'chevronRight',
        accent: C.verdant, variant: 'solid', fontSize: 16, depth: DEPTH.modalContent,
        onClick: () => this.scene.start('RankedSelectScene', { playerBans, botBans }),
      }).pulse();
    });
  }
}
