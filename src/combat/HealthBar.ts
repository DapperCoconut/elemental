import Phaser from 'phaser';

export class HealthBar {
  private graphics: Phaser.GameObjects.Graphics;
  private maxHp: number;
  private readonly barW = 52;
  private readonly barH = 7;
  private readonly offsetY = -38;
  private readonly chargeBarH = 4;
  public visible = true;

  constructor(scene: Phaser.Scene, maxHp: number) {
    this.graphics = scene.add.graphics();
    this.maxHp = maxHp;
    this.graphics.setDepth(10);
  }

  update(x: number, y: number, hp: number, shieldHp = 0, chargeRatio = 0, clottedHp = 0, weakHp = 0, chargeColor = 0xffdd00, corruptHp = 0): void {
    this.graphics.clear();
    if (!this.visible) return;

    const bx = x - this.barW / 2;
    const by = y + this.offsetY;

    // Charge bar (yellow by default, above HP bar; color overridable e.g. Rubber Bazooka overcharge)
    if (chargeRatio > 0) {
      const cby = by - this.chargeBarH - 2;
      this.graphics.fillStyle(0x111111, 0.85);
      this.graphics.fillRect(bx - 1, cby - 1, this.barW + 2, this.chargeBarH + 2);
      this.graphics.fillStyle(chargeColor, 1);
      this.graphics.fillRect(bx, cby, this.barW * Math.min(1, chargeRatio), this.chargeBarH);
    }

    // Background
    this.graphics.fillStyle(0x111111, 0.85);
    this.graphics.fillRect(bx - 1, by - 1, this.barW + 2, this.barH + 2);

    // HP fill
    const ratio = Math.max(0, hp / this.maxHp);
    const color = ratio > 0.5 ? 0x22dd55 : ratio > 0.25 ? 0xffcc00 : 0xff3300;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(bx, by, this.barW * ratio, this.barH);

    let fillEnd = ratio;

    // Clotted HP (dark red — Metal R+ Blood Clottage). Part of your health, not
    // a bonus: drawn right after normal HP, turning that slice of the bar dark red.
    if (clottedHp > 0) {
      const clottedRatio = Math.min(clottedHp / this.maxHp, 1 - fillEnd);
      this.graphics.fillStyle(0x770011, 1);
      this.graphics.fillRect(bx + this.barW * fillEnd, by, this.barW * clottedRatio, this.barH);
      fillEnd += clottedRatio;
    }

    // Shield fill (blue) — bonus HP beyond your health total.
    if (shieldHp > 0) {
      const shieldRatio = Math.min(shieldHp / this.maxHp, 1 - fillEnd);
      this.graphics.fillStyle(0x4488ff, 0.85);
      this.graphics.fillRect(bx + this.barW * fillEnd, by, this.barW * shieldRatio, this.barH);
      fillEnd += shieldRatio;
    }

    // Weak HP fill (gray) — bonus HP like shield, but decays over time.
    if (weakHp > 0) {
      const weakRatio = Math.min(weakHp / this.maxHp, 1 - fillEnd);
      this.graphics.fillStyle(0x999999, 0.85);
      this.graphics.fillRect(bx + this.barW * fillEnd, by, this.barW * weakRatio, this.barH);
      fillEnd += weakRatio;
    }

    // Corrupt HP (sick purple — Harvest). Bonus health, so it sits past the end like a shield —
    // and when the bar is already full it rots back over the top of it from the right, because
    // the scarecrow gets most of it while healthy and an invisible pool would be no pool at all.
    if (corruptHp > 0) {
      const corruptRatio = Math.min(corruptHp / this.maxHp, 1);
      const start = Math.max(0, Math.min(fillEnd, 1 - corruptRatio));
      this.graphics.fillStyle(0x8a2fc9, 0.95);
      this.graphics.fillRect(bx + this.barW * start, by, this.barW * corruptRatio, this.barH);
      this.graphics.fillStyle(0xd27bff, 0.8);
      this.graphics.fillRect(bx + this.barW * start, by, this.barW * corruptRatio, 2);
    }
  }

  setMaxHp(newMax: number): void {
    this.maxHp = newMax;
  }

  hide(): void {
    this.graphics.clear();
    this.visible = false;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
