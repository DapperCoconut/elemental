import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as Cheats from '../data/Cheats';
import { createCheatSave, applyKonamiCheat } from '../data/CheatSave';
import { GAUNTLET_COST } from '../data/GauntletData';

/** Logo colours at 0 and 100 clicks — the title bleeds from orange to red. */
const LOGO_COLD = 0xff8800;
const LOGO_HOT = 0xff0000;
const LOGO_STROKE_COLD = 0xff2200;
const LOGO_STROKE_HOT = 0x550000;

export class TitleScene extends Phaser.Scene {
  private toast: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0d0d1a);

    // Grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a33, 1);
    for (let x = 0; x < width; x += 60) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 60) grid.lineBetween(0, y, width, y);

    // Title — click it 100 times to unlock cheat mode. It reddens as you go.
    const title = this.add.text(cx, 130, 'ELEMENTAL', {
      fontSize: '68px',
      fontFamily: '"Arial Black", sans-serif',
      strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tintLogo(title);
    this.wireLogoClicks(title, cx, height);

    // Buttons — 3×2 grid
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const buttons: Array<{ label: string; sub?: string; color: number; borderColor: number; action: (() => void) | null }> = [
      // Explicit {} (not omitted) — Phaser only overwrites scene data when the
      // argument is truthy, so omitting it here would leak a stale { mode: 'invasion' }
      // from a previous visit to the INVASION button.
      { label: 'PLAY',       color: 0x1a2a1a, borderColor: 0x44cc44, action: () => this.scene.start('MenuScene', {}) },
      { label: 'CAMPAIGN',   color: 0x2a1500, borderColor: 0xffaa44, action: () => this.scene.start('CampaignSlotSelectScene') },
      { label: 'INVASION',   color: 0x1a0022, borderColor: 0x8800cc, action: () => this.scene.start('MenuScene', { mode: 'invasion' }) },
      { label: 'SHOP',       color: 0x1a1a2a, borderColor: 0x4466ff, action: () => this.scene.start('ShopScene') },
      { label: 'LAB',        color: 0x1a1a2a, borderColor: 0x9944ff, action: () => this.scene.start('LabScene') },
      {
        label: 'GAUNTLETS',
        sub: gauntletUnlocked ? undefined : `🔒 Unlock in Shop (💎${GAUNTLET_COST})`,
        color: 0x2a1a00,
        borderColor: 0xffaa00,
        action: gauntletUnlocked ? () => this.scene.start('GauntletSelectScene') : null,
      },
    ];

    const btnW = 220;
    const btnH = 72;
    const btnGap = 20;
    const cols = 3;
    const rows = 2;
    const gridW = cols * btnW + (cols - 1) * btnGap;
    const gridH = rows * btnH + (rows - 1) * btnGap;
    const gridStartX = cx - gridW / 2 + btnW / 2;
    const gridStartY = cy - gridH / 2 + btnH / 2 + 35;

    buttons.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = gridStartX + col * (btnW + btnGap);
      const by = gridStartY + row * (btnH + btnGap);
      const isLocked = b.action === null;
      const alpha = isLocked ? 0.35 : 0.8;

      const rect = this.add
        .rectangle(bx, by, btnW, btnH, b.color, alpha)
        .setStrokeStyle(2, b.borderColor);

      this.add.text(bx, by - (b.sub ? 8 : 0), b.label, {
        fontSize: '22px',
        fontFamily: '"Arial Black", sans-serif',
        color: isLocked ? '#444444' : '#ffffff',
      }).setOrigin(0.5);

      if (b.sub) {
        this.add.text(bx, by + 16, b.sub, {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#444444',
        }).setOrigin(0.5);
      }

      if (!isLocked && b.action) {
        const action = b.action;
        rect
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => { rect.setAlpha(1); rect.setStrokeStyle(3, 0xffffff); })
          .on('pointerout', () => { rect.setAlpha(alpha); rect.setStrokeStyle(2, b.borderColor); })
          .on('pointerdown', () => action());
      }
    });

    // Wide online-battle button beneath the grid
    const onlineY = gridStartY + rows * (btnH + btnGap) + btnH / 2 - btnGap / 2;
    const onlineW = gridW;
    const onlineRect = this.add
      .rectangle(cx, onlineY, onlineW, 56, 0x0a2222, 0.8)
      .setStrokeStyle(2, 0x44ccaa)
      .setInteractive({ useHandCursor: true });
    const onlineLabel = this.add.text(cx, onlineY, '🌐  ONLINE BATTLE — challenge a friend', {
      fontSize: '19px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#66eecc',
    }).setOrigin(0.5);
    onlineRect
      .on('pointerover', () => { onlineRect.setAlpha(1); onlineRect.setStrokeStyle(3, 0xffffff); onlineLabel.setColor('#ffffff'); })
      .on('pointerout', () => { onlineRect.setAlpha(0.8); onlineRect.setStrokeStyle(2, 0x44ccaa); onlineLabel.setColor('#66eecc'); })
      .on('pointerdown', () => this.scene.start('OnlineLobbyScene'));

    // Shard display
    this.add.text(width - 16, 16, `💎 ${PlayerData.getShards()}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc44',
    }).setOrigin(1, 0);

    // Cheat-profile banner, so it is never ambiguous which save is loaded
    if (Cheats.isCheatMode()) {
      this.add.text(16, 16, '😈 CHEAT PROFILE', {
        fontSize: '15px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ff4466',
      }).setOrigin(0, 0);
    }

    // Footer hint
    this.add.text(cx, height - 24, 'Copyright © 2025 Isaac Butikofer. All rights reserved.', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);

    // Konami code: WWSSADADBA → currencies + gauntlets + secret unlocks
    const KONAMI = ['W', 'W', 'S', 'S', 'A', 'D', 'A', 'D', 'B', 'A'];
    let konamiIdx = 0;

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();

      if (key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          const { campaignSlot } = applyKonamiCheat();
          this.showToast(cx, height, campaignSlot
            ? '🏆 All Gauntlets Complete!\n+9999 💎  +9999 🩸  +9999 🗝️  +9999 ✨ (Slot 1)\n🌀 Slot 1 cheat-flagged'
            : '🏆 All Gauntlets Complete!\n+9999 💎  +9999 🩸');
        }
      } else {
        konamiIdx = key === KONAMI[0] ? 1 : 0;
      }
    });

    // Cheat-mode toggle, bottom right — only once the logo has been unlocked
    if (Cheats.isUnlocked()) this.buildCheatToggle(width, height);
  }

  // ── Logo cheat unlock ────────────────────────────────────────────────

  /**
   * Orange→red gradient tracking click progress. Once unlocked the logo only
   * stays red while the cheat profile is loaded — in normal mode it reverts to
   * orange, so the title screen gives nothing away.
   */
  private tintLogo(title: Phaser.GameObjects.Text): void {
    const t = Cheats.isUnlocked()
      ? (Cheats.isCheatMode() ? 1 : 0)
      : Cheats.getLogoProgress();
    const lerp = (from: number, to: number) =>
      Phaser.Display.Color.ObjectToColor(
        Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(from),
          Phaser.Display.Color.IntegerToColor(to),
          100,
          Math.round(t * 100),
        ),
      ).color;

    title.setColor('#' + lerp(LOGO_COLD, LOGO_HOT).toString(16).padStart(6, '0'));
    title.setStroke('#' + lerp(LOGO_STROKE_COLD, LOGO_STROKE_HOT).toString(16).padStart(6, '0'), 5);
  }

  private wireLogoClicks(title: Phaser.GameObjects.Text, cx: number, height: number): void {
    // No counter, by design — the reddening is the only tell.
    title.on('pointerdown', () => {
      if (Cheats.isUnlocked()) return;

      const clicks = Cheats.bumpLogoClicks();
      this.tintLogo(title);

      // Squash-and-recover so each click registers physically
      this.tweens.killTweensOf(title);
      title.setScale(1);
      this.tweens.add({ targets: title, scaleX: 1.07, scaleY: 0.93, duration: 60, yoyo: true });

      if (clicks >= Cheats.LOGO_CLICK_TARGET) this.onCheatsUnlocked(cx, height);
    });
  }

  private onCheatsUnlocked(cx: number, height: number): void {
    Cheats.unlock();

    const flash = this.add.rectangle(cx, this.scale.height / 2, this.scale.width, this.scale.height, 0xff0000, 0.55).setDepth(90);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });

    this.showToast(cx, height, '😈 CHEATS UNLOCKED\nUse the toggle in the bottom-right corner', 4000);
    this.buildCheatToggle(this.scale.width, height);
  }

  // ── Cheat mode toggle ────────────────────────────────────────────────

  private buildCheatToggle(width: number, height: number): void {
    const on = Cheats.isCheatMode();
    const bx = width - 96;
    const by = height - 30;

    const rect = this.add
      .rectangle(bx, by, 168, 34, on ? 0x330011 : 0x1a1a22, 0.9)
      .setStrokeStyle(2, on ? 0xff3366 : 0x555577)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(bx, by, on ? '😈 CHEAT MODE' : '🎮 NORMAL MODE', {
      fontSize: '13px',
      fontFamily: '"Arial Black", sans-serif',
      color: on ? '#ff6688' : '#8888aa',
    }).setOrigin(0.5).setDepth(51);

    rect.on('pointerover', () => { rect.setStrokeStyle(3, 0xffffff); label.setColor('#ffffff'); });
    rect.on('pointerout', () => {
      rect.setStrokeStyle(2, on ? 0xff3366 : 0x555577);
      label.setColor(on ? '#ff6688' : '#8888aa');
    });
    rect.on('pointerdown', () => this.toggleCheatMode());

    // Rebuild button — re-maxes the cheat profile after new content is added
    if (on) {
      const rb = this.add
        .rectangle(bx - 108, by, 34, 34, 0x1a1a22, 0.9)
        .setStrokeStyle(2, 0x555577)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });
      const rl = this.add.text(bx - 108, by, '↻', {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#8888aa',
      }).setOrigin(0.5).setDepth(51);

      rb.on('pointerover', () => { rb.setStrokeStyle(3, 0xffffff); rl.setColor('#ffffff'); });
      rb.on('pointerout', () => { rb.setStrokeStyle(2, 0x555577); rl.setColor('#8888aa'); });
      rb.on('pointerdown', () => {
        createCheatSave();
        this.scene.restart();
      });
    }
  }

  private toggleCheatMode(): void {
    const goingCheat = !Cheats.isCheatMode();

    // First entry mints the fully-unlocked profile; later entries reuse it.
    if (goingCheat && !Cheats.cheatSaveExists()) createCheatSave();

    Cheats.setCheatMode(goingCheat);
    this.scene.restart();
  }

  // ── Shared toast ─────────────────────────────────────────────────────

  private showToast(cx: number, height: number, message: string, holdMs = 2500): void {
    this.toast?.destroy();
    this.toast = this.add.text(cx, height - 70, message, {
      fontSize: '18px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#ffee00',
      stroke: '#664400',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: this.toast, alpha: 0, y: height - 100,
      delay: holdMs, duration: 1000,
      onComplete: () => { this.toast?.destroy(); this.toast = null; },
    });
  }
}
