import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../data/Achievements';
import { getCosmeticDef } from '../data/Cosmetics';
import * as PlayerData from '../data/PlayerData';

export class AchievementsScene extends Phaser.Scene {
  private scrollHandler: (...args: unknown[]) => void = () => {};

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background + grid
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title
    this.add.text(cx, 36, '🏆  ACHIEVEMENTS', {
      fontSize: '36px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc44',
      stroke: '#664400',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const unlockedCount = ACHIEVEMENTS.filter((a) => PlayerData.isAchievementUnlocked(a.id)).length;
    this.add.text(cx, 66, `${unlockedCount} / ${ACHIEVEMENTS.length} unlocked`, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#888899',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.rectangle(52, 36, 88, 36, 0x222233).setStrokeStyle(1, 0x555577).setInteractive({ useHandCursor: true });
    const backLabel = this.add.text(52, 36, '← BACK', { fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa' }).setOrigin(0.5);
    backBtn.on('pointerover', () => { backBtn.setFillStyle(0x333355); backLabel.setColor('#ffffff'); });
    backBtn.on('pointerout',  () => { backBtn.setFillStyle(0x222233); backLabel.setColor('#aaaaaa'); });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0x223355, 0.6);
    div.lineBetween(40, 88, width - 40, 88);

    // ── Scrollable achievement list ──────────────────────────────────
    const SCROLL_TOP = 100;
    const SCROLL_BOT = height - 36;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const scrollContainer = this.add.container(0, SCROLL_TOP).setDepth(5);
    // make.graphics with addToScene=false: used purely as a mask shape, never rendered
    // (an added Graphics would paint this rect solid white over the background).
    const maskGfx = this.make.graphics({}, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    scrollContainer.setMask(maskGfx.createGeometryMask());

    const COL_X = 60;
    const COL_W = width - 120;
    let innerY = 6;

    for (const ach of ACHIEVEMENTS) {
      const unlocked = PlayerData.isAchievementUnlocked(ach.id);
      const alpha = unlocked ? 1 : 0.55;

      const descText = this.add.text(COL_X + 16, innerY + 30, ach.description, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif',
        color: unlocked ? '#ccccdd' : '#666677',
        wordWrap: { width: COL_W - 32 }, lineSpacing: 3,
      }).setAlpha(alpha);

      const reward = ach.cosmeticReward ? getCosmeticDef(ach.cosmeticReward) : undefined;
      let rewardText: Phaser.GameObjects.Text | null = null;
      let rowH = 30 + descText.height + 14;
      if (reward) {
        rewardText = this.add.text(COL_X + 16, innerY + 30 + descText.height + 8,
          `🎁 Reward: ${reward.name} (${reward.slot} cosmetic)`, {
            fontSize: '11px', fontFamily: '"Arial Black", sans-serif',
            color: unlocked ? '#ffdd88' : '#554433',
          }).setAlpha(alpha);
        rowH += 20;
      }

      const rowBg = this.add.rectangle(cx, innerY + rowH / 2, COL_W, rowH - 6,
        unlocked ? 0x1a1508 : 0x10101c, unlocked ? 0.85 : 0.6)
        .setStrokeStyle(1, unlocked ? 0x886622 : 0x2a2a44, 0.8);

      const nameText = this.add.text(COL_X + 16, innerY + 15, `${ach.emoji}  ${ach.name}`, {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif',
        color: unlocked ? '#ffee99' : '#777788',
      }).setOrigin(0, 0.5).setAlpha(alpha);

      const badge = this.add.text(COL_X + COL_W - 16, innerY + 15, unlocked ? '✓ UNLOCKED' : '🔒 LOCKED', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif',
        color: unlocked ? '#88ff88' : '#665533',
      }).setOrigin(1, 0.5);

      scrollContainer.add([rowBg, nameText, badge, descText]);
      if (rewardText) scrollContainer.add(rewardText);

      innerY += rowH + 8;
    }

    // Scroll wiring
    const maxScroll = Math.max(0, innerY - SCROLL_H);
    let scrollY = 0;
    this.scrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };
    this.input.on('wheel', this.scrollHandler);
    this.events.once('shutdown', () => this.input.off('wheel', this.scrollHandler));

    if (maxScroll > 0) {
      this.add.text(width - 16, SCROLL_BOT + 4, '▼ scroll', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#444466',
      }).setOrigin(1, 0);
    }
  }
}
