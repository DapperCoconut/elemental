import Phaser from 'phaser';
import { C, T, DEPTH, FONT_DISPLAY, FONT_UI, addButton, addModal, addSlider, addToggle } from '../ui';
import { Sfx } from '../audio';

/**
 * Audio settings, launched as an overlay over whatever scene asked for it.
 *
 * Changes apply and persist as you make them, so there is no OK/Cancel — the
 * only button closes the panel. Dragging the sound slider ticks a reference blip
 * (see `Sfx.setSfxVolume`) so the choice is audible while you make it.
 */
export class AudioSettingsScene extends Phaser.Scene {
  private parentSceneKey: string | null = null;

  constructor() {
    super({ key: 'AudioSettingsScene' });
  }

  init(data: { parentSceneKey?: string }): void {
    this.parentSceneKey = data?.parentSceneKey ?? null;
  }

  create(): void {
    const accent = 0x2ee6c0;

    const close = (): void => {
      if (this.parentSceneKey) this.scene.resume(this.parentSceneKey);
      this.scene.stop();
    };

    const modal = addModal(this, {
      w: 420, h: 318, accent,
      title: '🔊  AUDIO',
      subtitle: 'SOUND  ·  MUSIC  ·  MUTE',
      glow: 0.5,
      scrimAlpha: 0.74,
    });
    // Scene-launched overlays draw above the parent regardless of depth, but the
    // scroll factor still has to be pinned or a moving camera drags the panel.
    modal.g.setScrollFactor(0);
    for (const o of modal.objects) (o as Phaser.GameObjects.Text).setScrollFactor?.(0);
    modal.scrim.setScrollFactor(0);

    const cx = (modal.left + modal.right) / 2;
    const firstY = modal.contentTop + 54;

    addSlider(this, {
      x: cx - 16, y: firstY, w: 236, value: Sfx.getSfxVolume(), accent,
      depth: DEPTH.modalContent, label: 'SOUND EFFECTS',
      onChange: (v) => Sfx.setSfxVolume(v),
    });

    addSlider(this, {
      x: cx - 16, y: firstY + 64, w: 236, value: Sfx.getMusicVolume(), accent: C.arcane,
      depth: DEPTH.modalContent, label: 'MUSIC',
      onChange: (v) => Sfx.setMusicVolume(v),
    });

    this.add.text(cx - 140, firstY + 128, 'MUTE EVERYTHING', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 1.5,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent);

    addToggle(this, {
      x: cx + 92, y: firstY + 128, value: Sfx.isMuted(), accent: C.blood,
      depth: DEPTH.modalContent,
      onChange: (on) => Sfx.setMuted(on),
    });

    this.add.text(cx, firstY + 154, 'Every sound in this game is generated in code — there are no audio files.', {
      fontSize: '9px', fontFamily: FONT_UI, color: T.ghost, align: 'center',
      wordWrap: { width: 340 },
    }).setOrigin(0.5, 0).setDepth(DEPTH.modalContent);

    addButton(this, {
      x: cx, y: modal.bottom - 34, w: 180, h: 40,
      label: 'DONE', icon: '✓', accent: C.verdant, variant: 'solid', fontSize: 15,
      depth: DEPTH.modalContent,
      onClick: close,
    });

    this.input.keyboard!.on('keydown-ESC', close);
  }
}
