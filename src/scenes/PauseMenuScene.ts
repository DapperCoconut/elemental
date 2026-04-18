import Phaser from 'phaser';

export class PauseMenuScene extends Phaser.Scene {
  private parentSceneKey = 'ArenaScene';

  constructor() {
    super({ key: 'PauseMenuScene' });
  }

  init(data: { parentSceneKey: string }): void {
    this.parentSceneKey = data.parentSceneKey ?? 'ArenaScene';
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dim overlay — blocks all click-through to arena
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setDepth(100)
      .setScrollFactor(0)
      .setInteractive();

    // Panel
    this.add.rectangle(cx, cy, 320, 200, 0x0d0d1a, 1)
      .setStrokeStyle(2, 0x4444aa)
      .setDepth(101)
      .setScrollFactor(0);

    // Title
    this.add.text(cx, cy - 68, 'PAUSED', {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // RESUME button
    const resumeBtn = this.add.rectangle(cx, cy - 4, 200, 44, 0x112211, 1)
      .setStrokeStyle(2, 0x44cc44)
      .setDepth(102)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const resumeLbl = this.add.text(cx, cy - 4, 'RESUME', {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#44cc44',
    }).setOrigin(0.5).setDepth(103).setScrollFactor(0);

    // EXIT TO MENU button
    const exitBtn = this.add.rectangle(cx, cy + 58, 200, 44, 0x221111, 1)
      .setStrokeStyle(2, 0xcc4444)
      .setDepth(102)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    const exitLbl = this.add.text(cx, cy + 58, 'EXIT TO MENU', {
      fontSize: '16px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#cc4444',
    }).setOrigin(0.5).setDepth(103).setScrollFactor(0);

    const resume = () => {
      this.scene.resume(this.parentSceneKey);
      this.scene.stop();
    };

    const exitToMenu = () => {
      this.scene.stop(this.parentSceneKey);
      this.scene.stop();
      this.scene.start('MenuScene');
    };

    resumeBtn
      .on('pointerover', () => resumeBtn.setStrokeStyle(3, 0xaaffaa))
      .on('pointerout', () => resumeBtn.setStrokeStyle(2, 0x44cc44))
      .on('pointerdown', resume);
    resumeLbl.setInteractive().on('pointerdown', resume);

    exitBtn
      .on('pointerover', () => exitBtn.setStrokeStyle(3, 0xffaaaa))
      .on('pointerout', () => exitBtn.setStrokeStyle(2, 0xcc4444))
      .on('pointerdown', exitToMenu);
    exitLbl.setInteractive().on('pointerdown', exitToMenu);

    this.input.keyboard!.on('keydown-ESC', resume);
  }
}
