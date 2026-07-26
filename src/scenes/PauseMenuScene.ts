import Phaser from 'phaser';
import { C, T, DEPTH, FONT_UI, addButton, addModal } from '../ui';

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

    const resume = () => {
      this.scene.resume(this.parentSceneKey);
      this.scene.stop();
    };

    const exitToMenu = () => {
      this.scene.stop(this.parentSceneKey);
      this.scene.stop();
      // Phaser only overwrites scene.settings.data when a truthy object is passed —
      // an empty object here (not omitted) clears any stale { mode: 'invasion' }
      // left over from a previous MenuScene launch.
      this.scene.start('MenuScene', {});
    };

    // The scrim is interactive, so nothing leaks through to the paused arena.
    const modal = addModal(this, {
      w: 380, h: 244, accent: C.arcane,
      title: '❚❚  PAUSED', glow: 0.5,
      scrimAlpha: 0.7,
    });
    // Scene-launched overlays render above the arena regardless of depth, but
    // the scroll factor still has to be pinned or a moving camera drags the UI.
    modal.g.setScrollFactor(0);
    for (const o of modal.objects) (o as Phaser.GameObjects.Text).setScrollFactor?.(0);
    modal.scrim.setScrollFactor(0);

    addButton(this, {
      x: cx, y: cy - 12, w: 240, h: 48,
      label: 'RESUME', icon: '▶', accent: C.verdant, variant: 'solid', fontSize: 17,
      depth: DEPTH.modalContent,
      onClick: resume,
    });

    addButton(this, {
      x: cx, y: cy + 50, w: 240, h: 44,
      label: 'EXIT TO MENU', icon: '⏻', accent: C.blood, variant: 'danger', fontSize: 15,
      depth: DEPTH.modalContent,
      onClick: exitToMenu,
    });

    this.add.text(cx, cy + 92, 'ESC to resume', {
      fontSize: '10px', fontFamily: FONT_UI, color: T.faint, letterSpacing: 2,
    }).setOrigin(0.5).setDepth(DEPTH.modalContent).setScrollFactor(0);

    this.input.keyboard!.on('keydown-ESC', resume);
  }
}
