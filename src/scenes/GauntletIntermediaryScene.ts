import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import {
  GauntletState,
  BOOST_OPTIONS,
  BoostType,
  GAUNTLET_ELEMENTS,
  GAUNTLET_DIFFICULTY,
  GAUNTLET_REWARD,
  DIFFICULTY_LABELS,
} from '../data/GauntletData';

export class GauntletIntermediaryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GauntletIntermediaryScene' });
  }

  create(data: { gauntlet: GauntletState }): void {
    const gs = data.gauntlet;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    const isBossComplete = gs.currentFight === 6;

    if (isBossComplete) {
      this.showCompletion(gs, cx, cy, width, height);
    } else {
      this.showBoostSelection(gs, cx, cy, width, height);
    }
  }

  private showCompletion(gs: GauntletState, cx: number, cy: number, width: number, height: number): void {
    // Award shards and mark completion
    PlayerData.addShards(GAUNTLET_REWARD);
    PlayerData.completeGauntlet(gs.gauntletElement);

    const elDef = GAUNTLET_ELEMENTS.find((e) => e.id === gs.gauntletElement)!;

    // Gauntlet name + star
    this.add.text(cx, cy - 160, `${elDef.emoji} ${elDef.name.toUpperCase()} GAUNTLET`, {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00',
      stroke: '#884400',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const title = this.add.text(cx, cy - 110, 'GAUNTLET COMPLETE!', {
      fontSize: '64px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(cx, cy - 20, `★ You survived all 5 battles and defeated the boss! ★`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, `+${GAUNTLET_REWARD} 💎`, {
      fontSize: '32px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // Back button
    const btnW = 280;
    const btnH = 64;
    const btn = this.add
      .rectangle(cx, cy + 100, btnW, btnH, 0x1a2a1a, 0.9)
      .setStrokeStyle(2, 0x44cc44)
      .setInteractive({ useHandCursor: true });
    const btnLabel = this.add.text(cx, cy + 100, 'BACK TO GAUNTLETS', {
      fontSize: '22px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    btn
      .on('pointerover', () => { btn.setAlpha(1); btn.setStrokeStyle(3, 0xffffff); btnLabel.setColor('#ffcc00'); })
      .on('pointerout', () => { btn.setAlpha(0.9); btn.setStrokeStyle(2, 0x44cc44); btnLabel.setColor('#ffffff'); })
      .on('pointerdown', () => this.scene.start('GauntletSelectScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GauntletSelectScene'));
  }

  private showBoostSelection(gs: GauntletState, cx: number, cy: number, width: number, _height: number): void {
    const elDef = GAUNTLET_ELEMENTS.find((e) => e.id === gs.gauntletElement)!;
    const nextFight = gs.currentFight + 1;
    const isBossFight = nextFight === 6;
    const nextDiffLabel = isBossFight ? 'BOSS' : DIFFICULTY_LABELS[GAUNTLET_DIFFICULTY[nextFight - 1] - 1];

    // Header
    this.add.text(cx, 52, `${elDef.emoji} ${elDef.name.toUpperCase()} GAUNTLET`, {
      fontSize: '22px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffaa00',
      stroke: '#884400',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(cx, 88, `FIGHT ${gs.currentFight} COMPLETE`, {
      fontSize: '42px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Progress bar
    this.drawProgress(cx, 130, gs.currentFight);

    // Accumulated boosts
    if (gs.boosts.length > 0) {
      this.add.text(cx, 170, 'YOUR BOOSTS:', {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
      }).setOrigin(0.5);

      const boostCounts: Record<BoostType, number> = { strength: 0, health: 0, speed: 0 };
      for (const b of gs.boosts) boostCounts[b]++;

      const boostParts = BOOST_OPTIONS
        .filter((bo) => boostCounts[bo.type] > 0)
        .map((bo) => `${bo.emoji} ${bo.label}${boostCounts[bo.type] > 1 ? ` ×${boostCounts[bo.type]}` : ''}`);

      this.add.text(cx, 192, boostParts.join('   '), {
        fontSize: '14px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffcc44',
      }).setOrigin(0.5);
    }

    // Boost selection prompt
    this.add.text(cx, 225, 'CHOOSE A BOOST', {
      fontSize: '20px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#44ccff',
      stroke: '#003366',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Boost cards
    const cardW = 220;
    const cardH = 150;
    const cardGap = 24;
    const totalCardW = BOOST_OPTIONS.length * cardW + (BOOST_OPTIONS.length - 1) * cardGap;
    const cardStartX = cx - totalCardW / 2 + cardW / 2;
    const cardY = 330;

    let selectedBoost: BoostType | null = null;
    const cards: Phaser.GameObjects.Rectangle[] = [];

    // Next fight button (initially hidden)
    const nextBtnW = 280;
    const nextBtnH = 60;
    const nextBtnY = cy + 195;
    const nextBtn = this.add
      .rectangle(cx, nextBtnY, nextBtnW, nextBtnH, 0x1a2a1a, 0)
      .setStrokeStyle(0)
      .setInteractive({ useHandCursor: false });
    const nextLabel = this.add.text(cx, nextBtnY, isBossFight ? '⚔️ FIGHT THE BOSS' : `NEXT FIGHT →  [${nextDiffLabel}]`, {
      fontSize: '20px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#444444',
    }).setOrigin(0.5);

    const activateNextBtn = (): void => {
      nextBtn.setFillStyle(0x1a2a1a, 0.9);
      nextBtn.setStrokeStyle(2, 0x44cc44);
      nextBtn.setInteractive({ useHandCursor: true });
      nextLabel.setColor('#ffffff');
      nextBtn
        .on('pointerover', () => { nextBtn.setAlpha(1); nextBtn.setStrokeStyle(3, 0xffffff); nextLabel.setColor('#ffcc00'); })
        .on('pointerout', () => { nextBtn.setAlpha(0.9); nextBtn.setStrokeStyle(2, 0x44cc44); nextLabel.setColor('#ffffff'); })
        .on('pointerdown', () => {
          if (selectedBoost === null) return;
          this.launchNextFight({ ...gs, currentFight: nextFight, boosts: [...gs.boosts, selectedBoost] });
        });
    };

    BOOST_OPTIONS.forEach((boost, i) => {
      const bx = cardStartX + i * (cardW + cardGap);

      const card = this.add
        .rectangle(bx, cardY, cardW, cardH, 0x111122, 0.85)
        .setStrokeStyle(2, 0x444466)
        .setInteractive({ useHandCursor: true });
      cards.push(card);

      this.add.text(bx, cardY - 42, boost.emoji, { fontSize: '36px' }).setOrigin(0.5);
      this.add.text(bx, cardY + 5, boost.label, {
        fontSize: '18px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.add.text(bx, cardY + 32, boost.description, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      card
        .on('pointerover', () => {
          if (selectedBoost !== boost.type) {
            card.setStrokeStyle(2, 0x44ccff);
            card.setAlpha(1);
          }
        })
        .on('pointerout', () => {
          if (selectedBoost !== boost.type) {
            card.setStrokeStyle(2, 0x444466);
            card.setAlpha(0.85);
          }
        })
        .on('pointerdown', () => {
          if (selectedBoost !== null) return; // already chose
          selectedBoost = boost.type;
          // Highlight selected, dim others
          cards.forEach((c, ci) => {
            if (ci === i) {
              c.setStrokeStyle(3, 0xffcc00);
              c.setAlpha(1);
            } else {
              c.setStrokeStyle(1, 0x333344);
              c.setAlpha(0.4);
            }
          });
          activateNextBtn();
        });
    });

    // Next fight info
    const nextFightLabel = isBossFight
      ? `⚠️ BOSS FIGHT — ${elDef.name.toUpperCase()} 👹 (stationary, 500 HP)`
      : `Next: Fight ${nextFight} / 6  •  ${nextDiffLabel}`;
    this.add.text(cx, nextBtnY + 50, nextFightLabel, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: isBossFight ? '#ff6666' : '#666666',
    }).setOrigin(0.5);
  }

  private drawProgress(cx: number, y: number, completedFights: number): void {
    const totalFights = 6;
    const dotR = 10;
    const dotGap = 28;
    const totalW = totalFights * dotR * 2 + (totalFights - 1) * dotGap;
    const startX = cx - totalW / 2 + dotR;

    const g = this.add.graphics();
    for (let i = 0; i < totalFights; i++) {
      const dx = startX + i * (dotR * 2 + dotGap);
      const isBoss = i === 5;
      const done = i < completedFights;
      const color = done ? 0x44cc44 : isBoss ? 0xff4422 : 0x333366;
      g.fillStyle(color, done ? 1 : 0.5);
      if (isBoss) {
        g.fillTriangle(dx, y - dotR, dx - dotR, y + dotR, dx + dotR, y + dotR);
      } else {
        g.fillCircle(dx, y, dotR);
      }
      if (i < totalFights - 1) {
        g.fillStyle(0x333355, 1);
        g.fillRect(dx + dotR, y - 1, dotGap, 2);
      }
    }
  }

  private launchNextFight(gs: GauntletState): void {
    const isBoss = gs.currentFight === 6;

    if (isBoss) {
      // Boss fight: same element as gauntlet, Boss mutation, Nightmare difficulty
      this.scene.start('ArenaScene', {
        elementId: gs.playerElement,
        enemyElementId: gs.gauntletElement,
        difficulty: 5,
        mutations: ['boss'],
        gauntlet: gs,
      });
    } else {
      // Regular fight: use pre-generated order/mutation (currentFight is now 2-5, index = currentFight - 1)
      const idx = gs.currentFight - 1;
      this.scene.start('ArenaScene', {
        elementId: gs.playerElement,
        enemyElementId: gs.fightOrder[idx],
        difficulty: GAUNTLET_DIFFICULTY[idx],
        mutations: [gs.fightMutations[idx]],
        gauntlet: gs,
      });
    }
  }
}
