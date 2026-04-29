import Phaser from 'phaser';
import { getAnyWorld } from '../data/AbstractWorlds';

export class CampaignFightMenuScene extends Phaser.Scene {
  private worldId = 'fire';
  private nodeId = 'fire-fight-1';
  private isChallenge = false;
  private kind = 'fight';
  private slotIdx: 0 | 1 | 2 = 0;
  private hardMode = false;

  constructor() {
    super({ key: 'CampaignFightMenuScene' });
  }

  init(data: { worldId: string; nodeId: string; isChallenge: boolean; kind?: string; slotIdx: 0 | 1 | 2 }): void {
    this.worldId = data?.worldId ?? 'fire';
    this.nodeId = data?.nodeId ?? 'fire-fight-1';
    this.isChallenge = data?.isChallenge ?? false;
    this.kind = data?.kind ?? (this.isChallenge ? 'challenge' : 'fight');
    this.slotIdx = data?.slotIdx ?? 0;
    this.hardMode = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const world = getAnyWorld(this.worldId);

    const borderColor =
      this.kind === 'invasion' ? 0xff7722 :
      this.kind === 'gauntlet' ? 0x4488ff :
      this.kind === 'challenge' ? 0x8800cc :
      (world?.color ?? 0x4466ff);

    const panelW = 520;
    const panelH = 360;

    // Dim overlay
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setDepth(0)
      .setInteractive();

    // Panel background
    this.add.rectangle(cx, cy, panelW, panelH, 0x0d0d1a, 1)
      .setStrokeStyle(3, borderColor)
      .setDepth(1);

    // Title
    const fightNum = this.nodeId.includes('fight-') ? this.nodeId.split('fight-')[1] : null;
    const titleText =
      this.kind === 'invasion'  ? '👾  INVASION' :
      this.kind === 'gauntlet'  ? '🏆  GAUNTLET' :
      this.kind === 'challenge' ? `${world?.emoji ?? '⚔️'}  CHALLENGE` :
      `${world?.emoji ?? '⚔️'}  FIGHT ${fightNum ?? '?'}`;
    const titleColor =
      this.kind === 'invasion'  ? '#ff9955' :
      this.kind === 'gauntlet'  ? '#88bbff' :
      this.kind === 'challenge' ? '#cc88ff' :
      '#ffffff';

    this.add.text(cx, cy - 130, titleText, {
      fontSize: '28px',
      fontFamily: '"Arial Black", sans-serif',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cy - 94, world ? world.name.toUpperCase() + ' WORLD' : '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5).setDepth(2);

    // Placeholder body
    const detailsText = this.add.text(cx, cy - 20, '[ Fight details coming soon ]', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#444466',
    }).setOrigin(0.5).setDepth(2);

    // Hard mode toggle
    const toggleY = cy + 60;
    const toggleLabelX = cx - 54;
    const toggleTrackX = cx + 42;

    this.add.text(toggleLabelX, toggleY, 'HARD MODE', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#888888',
    }).setOrigin(0.5).setDepth(2);

    const trackW = 44;
    const trackH = 22;
    const track = this.add.rectangle(toggleTrackX, toggleY, trackW, trackH, 0x222233)
      .setStrokeStyle(1, 0x555566)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    const knob = this.add.circle(toggleTrackX - 10, toggleY, 8, 0x888888)
      .setDepth(3);

    const updateToggle = () => {
      if (this.hardMode) {
        track.setFillStyle(0x661111).setStrokeStyle(1, 0xcc3333);
        knob.setFillStyle(0xff4444).setX(toggleTrackX + 10);
        detailsText.setText('[ Hard mode details coming soon ]').setColor('#663333');
      } else {
        track.setFillStyle(0x222233).setStrokeStyle(1, 0x555566);
        knob.setFillStyle(0x888888).setX(toggleTrackX - 10);
        detailsText.setText('[ Fight details coming soon ]').setColor('#444466');
      }
    };

    track.on('pointerdown', () => {
      this.hardMode = !this.hardMode;
      updateToggle();
    });

    // START button
    const startBtn = this.add.rectangle(cx, cy + 130, 200, 52, 0x1a2a1a)
      .setStrokeStyle(2, 0x44cc44)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    const startLbl = this.add.text(cx, cy + 130, 'START', {
      fontSize: '22px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#44cc44',
    }).setOrigin(0.5).setDepth(3);
    startBtn
      .on('pointerover', () => { startBtn.setFillStyle(0x253525); startLbl.setColor('#aaffaa'); })
      .on('pointerout', () => { startBtn.setFillStyle(0x1a2a1a); startLbl.setColor('#44cc44'); })
      .on('pointerdown', () => this.startFight());

    // BACK button
    const backBtn = this.add.rectangle(cx, cy + 140 + 60, 140, 36, 0x222233)
      .setStrokeStyle(1, 0x555577)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    const backLbl = this.add.text(cx, cy + 140 + 60, '← BACK', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(3);
    backBtn
      .on('pointerover', () => { backBtn.setFillStyle(0x333355); backLbl.setColor('#ffffff'); })
      .on('pointerout', () => { backBtn.setFillStyle(0x222233); backLbl.setColor('#aaaaaa'); })
      .on('pointerdown', () => this.close());

    this.input.keyboard!.on('keydown-ESC', () => this.close());
  }

  private startFight(): void {
    const world = getAnyWorld(this.worldId);
    const enemyElementId = world?.parentId ?? world?.id ?? 'fire';
    const difficulty = this.kind === 'fight' ? 1 : 2;

    this.scene.start('CampaignElementSelectScene', {
      worldId: this.worldId,
      nodeId: this.nodeId,
      isChallenge: this.isChallenge,
      kind: this.kind,
      slotIdx: this.slotIdx,
      hardMode: this.hardMode,
      enemyElementId,
      difficulty,
    });
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('CampaignWorldScene');
  }
}
