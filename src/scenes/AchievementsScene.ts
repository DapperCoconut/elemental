import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../data/Achievements';
import { getSkinDef } from '../data/Skins';
import * as PlayerData from '../data/PlayerData';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addHeaderBar, addWell, addRowPlate, drawMeter, fillDiamond,
} from '../ui';

export class AchievementsScene extends Phaser.Scene {
  private scrollHandler: (...args: unknown[]) => void = () => {};

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const accent = C.gold;

    addBackdrop(this, { accent, variant: 'void', motes: 14 });

    const unlockedCount = ACHIEVEMENTS.filter((a) => PlayerData.isAchievementUnlocked(a.id)).length;
    const header = addHeaderBar(this, {
      title: '🏆  ACHIEVEMENTS',
      subtitle: `${unlockedCount} OF ${ACHIEVEMENTS.length} UNLOCKED`,
      accent,
      height: 82,
    });

    // Completion meter tucked into the header's right side.
    const meter = this.add.graphics().setDepth(DEPTH.panel + 1);
    drawMeter(meter, width - 200, 46, 170, 10, unlockedCount / ACHIEVEMENTS.length, accent);
    this.add.text(width - 200, 30, 'COMPLETION', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.panel + 1);
    this.add.text(width - 30, 30, `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.5)),
    }).setOrigin(1, 0.5).setDepth(DEPTH.panel + 1);

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard!.on('keydown-ESC', back);

    // ── Scrollable achievement list ──────────────────────────────────
    const SCROLL_TOP = header.bottom + 12;
    const SCROLL_BOT = height - 30;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;
    const COL_W = width - 120;

    addWell(this, cx, SCROLL_TOP + SCROLL_H / 2, COL_W + 24, SCROLL_H + 12, accent, DEPTH.panel - 1);

    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(DEPTH.panel);
    // make.graphics with addToScene=false: used purely as a mask shape, never rendered
    // (an added Graphics would paint this rect solid white over the background).
    const maskGfx = this.make.graphics({}, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    scrollContainer.setMask(maskGfx.createGeometryMask());

    const COL_X = 60;
    let innerY = 8;

    for (const ach of ACHIEVEMENTS) {
      const unlocked = PlayerData.isAchievementUnlocked(ach.id);

      const descText = this.add.text(COL_X + 24, innerY + 34, ach.description, {
        fontSize: '12px', fontFamily: FONT_UI,
        color: unlocked ? T.normal : T.faint,
        wordWrap: { width: COL_W - 56 }, lineSpacing: 3,
      });

      const reward = ach.skinReward ? getSkinDef(ach.skinReward) : undefined;
      let rewardText: Phaser.GameObjects.Text | null = null;
      let rowH = 34 + descText.height + 16;
      if (reward) {
        rewardText = this.add.text(COL_X + 24, innerY + 34 + descText.height + 8,
          `🎁  ${reward.name}  ·  ${reward.elementId} skin`, {
            fontSize: '11px', fontFamily: FONT_DISPLAY,
            color: unlocked ? hex(mix(accent, 0xffffff, 0.45)) : T.ghost,
            letterSpacing: 0.5,
          });
        rowH += 20;
      }

      const row = addRowPlate(this, {
        x: cx, y: innerY + rowH / 2, w: COL_W, h: rowH - 6,
        accent, muted: !unlocked, depth: DEPTH.panel,
      });

      const nameText = this.add.text(COL_X + 24, innerY + 17, `${ach.emoji}   ${ach.name}`, {
        fontSize: '16px', fontFamily: FONT_DISPLAY,
        color: unlocked ? hex(mix(accent, 0xffffff, 0.6)) : T.faint,
        letterSpacing: 1,
      }).setOrigin(0, 0.5);

      const badgeG = this.add.graphics();
      const badgeX = COL_X + COL_W - 90;
      if (unlocked) {
        fillDiamond(badgeG, badgeX - 10, innerY + 17, 4, mix(accent, 0xffffff, 0.5), 1);
      }
      const badge = this.add.text(COL_X + COL_W - 24, innerY + 17, unlocked ? 'UNLOCKED' : 'LOCKED', {
        fontSize: '10px', fontFamily: FONT_DISPLAY,
        color: unlocked ? hex(mix(C.verdant, 0xffffff, 0.3)) : T.ghost,
        letterSpacing: 2,
      }).setOrigin(1, 0.5);

      scrollContainer.add([row.g, badgeG, nameText, badge, descText]);
      if (rewardText) scrollContainer.add(rewardText);

      innerY += rowH + 8;
    }

    // Scroll wiring
    const maxScroll = Math.max(0, innerY - SCROLL_H);
    let scrollY = 0;
    let thumb: Phaser.GameObjects.Graphics | null = null;
    this.scrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
      thumb?.setY(SCROLL_TOP + 6 + (SCROLL_H - 20) * (scrollY / maxScroll));
    };
    this.input.on('wheel', this.scrollHandler);
    this.events.once('shutdown', () => this.input.off('wheel', this.scrollHandler));

    // Scroll rail — a thin trough on the right with a lit thumb.
    if (maxScroll > 0) {
      const railX = cx + COL_W / 2 + 16;
      const rail = this.add.graphics().setDepth(DEPTH.panel);
      rail.fillStyle(C.well, 0.9);
      rail.fillRect(railX - 2, SCROLL_TOP, 4, SCROLL_H);
      rail.lineStyle(1, accent, 0.2);
      rail.strokeRect(railX - 2, SCROLL_TOP, 4, SCROLL_H);

      thumb = this.add.graphics().setDepth(DEPTH.panel + 1);
      thumb.fillStyle(accent, 0.75);
      thumb.fillRect(railX - 3, 0, 6, 14);
      thumb.setY(SCROLL_TOP + 6);
    }
  }
}
