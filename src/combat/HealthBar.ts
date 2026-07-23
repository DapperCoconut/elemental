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

  update(x: number, y: number, hp: number, shieldHp = 0, chargeRatio = 0, clottedHp = 0, weakHp = 0): void {
    this.graphics.clear();
    if (!this.visible) return;

    const bx = x - this.barW / 2;
    const by = y + this.offsetY;

    // Charge bar (yellow, above HP bar)
    if (chargeRatio > 0) {
      const cby = by - this.chargeBarH - 2;
      this.graphics.fillStyle(0x111111, 0.85);
      this.graphics.fillRect(bx - 1, cby - 1, this.barW + 2, this.chargeBarH + 2);
      this.graphics.fillStyle(0xffdd00, 1);
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

    // Weak HP fill (gray) — bonus HP like shield, but decays over time (Quantum blue E).
    if (weakHp > 0) {
      const weakRatio = Math.min(weakHp / this.maxHp, 1 - fillEnd);
      this.graphics.fillStyle(0x999999, 0.85);
      this.graphics.fillRect(bx + this.barW * fillEnd, by, this.barW * weakRatio, this.barH);
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
