import Phaser from 'phaser';
import { Ability } from '../../elements/Ability';
import { MUTATIONS } from '../../data/Mutations';
import type { CityLoadoutApi } from './CityDraft';

const FONT = '"Arial Black", "Segoe UI Black", Impact, sans-serif';

/**
 * The two pieces of City HUD both sides of a co-op run draw for themselves:
 * a seal over every tray card whose key hasn't been drafted yet, and the
 * player's own drafted mutations as a row of emoji under the shard count.
 */
export class CityHud {
  private sealG: Phaser.GameObjects.Graphics;
  private sealIcons: Phaser.GameObjects.Text[] = [];
  private curseLabel: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.sealG = scene.add.graphics().setDepth(24);
    this.curseLabel = scene.add.text(scene.scale.width - 16, 58, '', {
      fontSize: '13px', fontFamily: FONT, color: '#ff8899', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(25);
  }

  paint(loadout: CityLoadoutApi | null, tray: Ability[], curses: Array<{ id: string; starred: boolean }>): void {
    const g = this.sealG;
    g.clear();
    if (loadout) {
      const { width: W, height: H } = this.scene.scale;
      const cardW = 130, cardH = 48;
      const startX = W / 2 - (5 * cardW) / 2 + cardW / 2;
      const row = tray.slice(0, 5);
      const sealed = loadout.abilityKeys().filter((a) => a.locked);
      while (this.sealIcons.length < sealed.length) {
        this.sealIcons.push(this.scene.add.text(0, 0, '🔒', { fontSize: '16px' }).setOrigin(0.5).setDepth(24.5));
      }
      this.sealIcons.forEach((t, i) => {
        const a = sealed[i];
        const idx = a ? row.findIndex((ab) => ab.displayKey === a.key) : -1;
        if (!a || idx < 0) { t.setVisible(false); return; }
        const x = startX + idx * cardW;
        const y = H - 30;
        g.fillStyle(0x05050c, 0.72);
        g.fillRect(x - (cardW - 4) / 2, y - (cardH - 4) / 2, cardW - 4, cardH - 4);
        g.lineStyle(1, 0x6a6a90, 0.8);
        g.strokeRect(x - (cardW - 4) / 2, y - (cardH - 4) / 2, cardW - 4, cardH - 4);
        t.setVisible(true).setPosition(x, y);
      });
    }
    const marks = curses.map(({ id, starred }) => {
      const m = MUTATIONS.find((d) => d.id === id);
      return `${starred ? '★' : ''}${m?.emoji ?? '?'}`;
    });
    this.curseLabel.setText(marks.length ? `🧬 ${marks.join(' ')}` : '');
  }

  destroy(): void {
    this.sealG.destroy();
    for (const t of this.sealIcons) t.destroy();
    this.sealIcons = [];
    this.curseLabel.destroy();
  }
}
