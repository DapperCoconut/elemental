import Phaser from 'phaser';
import * as Ranked from '../data/RankedData';
import * as PlayerData from '../data/PlayerData';
import { findElementDef } from '../data/ElementRoster';
import { getPerksForElement } from '../data/Perks';
import { buildNpcLoadout } from '../data/NpcLoadout';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addScrim, ElementPanels, renderElementGrid, openBondPicker,
} from '../ui';
import { addRankBadge } from '../ui/RankBadges';
import { Music, Sfx } from '../audio';
import { startRankedGame } from './RankedIntermissionScene';

/**
 * Ranked element pick. The shared element grid, with the bot's bans greyed out as
 * locked cards. Picking rolls the bot's element (its roster minus the player's bans),
 * shows the versus splash, and starts game one of the series.
 */
export class RankedSelectScene extends Phaser.Scene {
  private playerBans: string[] = [];
  private botBans: string[] = [];
  private panels!: ElementPanels;
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private elemPage = 0;
  private bondChosen = false;
  private launching = false;

  constructor() {
    super({ key: 'RankedSelectScene' });
  }

  create(data: { playerBans?: string[]; botBans?: string[] }): void {
    Music.play('menu');
    this.playerBans = [...(data?.playerBans ?? [])];
    this.botBans = [...(data?.botBans ?? [])];
    this.phaseObjects = [];
    this.elemPage = 0;
    this.bondChosen = false;
    this.launching = false;

    const { width } = this.scale;
    const cx = width / 2;
    const p = Ranked.getProfile();
    const accent = p.tier.color;

    addBackdrop(this, { accent, variant: 'rays', motes: 18 });
    addRankBadge(this, { x: width - 52, y: 50, size: 30, step: p.step, depth: DEPTH.content });

    this.add.text(cx, 40, 'CHOOSE YOUR ELEMENT', {
      fontSize: '30px', fontFamily: FONT_DISPLAY, letterSpacing: 5,
      color: hex(mix(accent, 0xffffff, 0.7)), stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, 70, `RANKED  ·  ${p.name.toUpperCase()}  ·  BEST OF THREE`, {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const emojis = (ids: string[]) => ids.map((id) => findElementDef(id)?.emoji ?? '?').join(' ') || '—';
    this.add.text(cx, 100, `THE BOT BANNED:  ${emojis(this.botBans)}`, {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(C.blood, 0xffffff, 0.5)), letterSpacing: 1.5,
      backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, 126, `IT CANNOT PLAY:  ${emojis(this.playerBans)}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.gold, letterSpacing: 1.5,
      backgroundColor: hex(C.void_), padding: { x: 10, y: 3 },
    }).setOrigin(0.5).setDepth(DEPTH.content);

    this.panels = new ElementPanels(this, () => this.renderElements());
    const back = () => {
      if (this.launching) return;
      if (this.panels.isOpen()) this.panels.closeElementInfo();
      else this.scene.start('RankedScene');
    };
    addBackButton(this, back);
    this.input.keyboard?.on('keydown-ESC', back);

    this.renderElements();
  }

  private renderElements(): void {
    for (const obj of this.phaseObjects) {
      if (obj.active) obj.destroy();
    }
    this.phaseObjects = renderElementGrid(this, {
      y: this.scale.height / 2 + 52,
      page: this.elemPage,
      panels: this.panels,
      accent: Ranked.getProfile().tier.color,
      onPageChange: (pg) => { this.elemPage = pg; this.renderElements(); },
      onSelect: (id) => this.selectElement(id),
      lockedLabel: (el) => (this.botBans.includes(el.id) ? '✖ BANNED' : null),
      onLockedSelect: () => Sfx.play('ui-denied'),
      showCustomize: true,
      showPerkDictionary: true,
      emptyText: 'No extra elements unlocked yet.',
    });
  }

  private selectElement(elementId: string): void {
    if (this.launching || this.botBans.includes(elementId)) return;
    if (elementId === 'quantum' && !this.bondChosen) {
      openBondPicker(this, (a, b) => {
        PlayerData.setQuantumBond(a, b);
        this.bondChosen = true;
        this.selectElement(elementId);
      });
      return;
    }
    this.launching = true;

    const p = Ranked.getProfile();
    const enemy = Ranked.rollBotElement(this.playerBans);
    const diff = Ranked.rankedDifficulty(p.step);
    const perkPool = getPerksForElement(enemy);
    const series: Ranked.RankedSeries = {
      playerElement: elementId,
      enemyElement: enemy,
      playerBans: this.playerBans,
      botBans: this.botBans,
      wins: 0,
      losses: 0,
      step: p.step,
      npcPerk: diff.level >= 4 && perkPool.length > 0
        ? perkPool[Math.floor(Math.random() * perkPool.length)].id : null,
      npcLoadout: buildNpcLoadout(enemy, diff.level),
    };
    this.showVersus(series);
  }

  /** The versus splash: your pick slides in, the bot's pick is revealed, then the fight. */
  private showVersus(series: Ranked.RankedSeries): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const you = findElementDef(series.playerElement);
    const foe = findElementDef(series.enemyElement);

    addScrim(this, 0.9, DEPTH.overlay);
    const band = this.add.graphics().setDepth(DEPTH.modal);
    band.fillStyle(mix(C.void_, C.verdant, 0.18), 1);
    band.fillPoints([
      new Phaser.Geom.Point(0, cy - 90), new Phaser.Geom.Point(cx + 40, cy - 90),
      new Phaser.Geom.Point(cx - 40, cy + 90), new Phaser.Geom.Point(0, cy + 90),
    ], true);
    band.fillStyle(mix(C.void_, C.blood, 0.2), 1);
    band.fillPoints([
      new Phaser.Geom.Point(cx + 44, cy - 90), new Phaser.Geom.Point(width, cy - 90),
      new Phaser.Geom.Point(width, cy + 90), new Phaser.Geom.Point(cx - 36, cy + 90),
    ], true);
    band.lineStyle(3, C.gold, 0.9);
    band.lineBetween(cx + 42, cy - 90, cx - 38, cy + 90);

    const side = (x: number, el: typeof you, label: string, col: number, fromX: number) => {
      const c = this.add.container(fromX, cy).setDepth(DEPTH.modalContent);
      c.add(this.add.text(0, -26, el?.emoji ?? '?', { fontSize: '64px' }).setOrigin(0.5));
      c.add(this.add.text(0, 40, (el?.name ?? '?').toUpperCase(), {
        fontSize: '24px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 3,
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5));
      c.add(this.add.text(0, 68, label, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(col, 0xffffff, 0.5)), letterSpacing: 3,
      }).setOrigin(0.5));
      this.tweens.add({ targets: c, x, duration: 420, ease: 'Cubic.easeOut' });
      return c;
    };
    side(cx - 220, you, 'YOU', C.verdant, -200);
    const foeSide = side(cx + 220, foe, `${series.step >= Ranked.EXCELSIUS_STEP ? 'EXCELSIUS' : Ranked.rankName(series.step).toUpperCase()} BOT`, C.blood, width + 200);
    foeSide.setAlpha(0);
    this.tweens.add({ targets: foeSide, alpha: 1, duration: 200, delay: 500 });

    const vs = this.add.text(cx, cy, 'VS', {
      fontSize: '54px', fontFamily: FONT_DISPLAY, color: T.gold, stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent + 1).setScale(3).setAlpha(0);
    this.tweens.add({
      targets: vs, scale: 1, alpha: 1, duration: 300, delay: 700, ease: 'Back.easeOut',
      onStart: () => { Sfx.play('boss-intro'); this.cameras.main.shake(120, 0.006); },
    });

    this.add.text(cx, cy + 130, 'BEST OF THREE  ·  GAME 1', {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.normal, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent);

    this.time.delayedCall(2300, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => startRankedGame(this, series));
    });
  }
}
