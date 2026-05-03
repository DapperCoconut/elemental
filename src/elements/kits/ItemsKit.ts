import type { Player } from '../../entities/Player';

export interface ItemsArenaApi {
  get player(): Player;
  applySelfDamage(amount: number): void;
  applyPlayerSpeedMult(f: number): void;
  bumpMaxHp(amount: number): void;
  addShieldCharges(n: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
}

export class ItemsKit {
  private hotSauceActive = false;
  private tickAccum = 0;

  constructor(private api: ItemsArenaApi) {}

  reset(): void {
    this.hotSauceActive = false;
    this.tickAccum = 0;
  }

  applyConsumed(consumed: Set<string>): void {
    const { player } = this.api;
    if (consumed.has('grilled-cheese')) {
      this.api.bumpMaxHp(20);
      this.api.showFloatingText(player.x, player.y - 40, '+20 MAX HP', '#88ff88');
    }
    if (consumed.has('bubble')) {
      this.api.addShieldCharges(3);
      this.api.showFloatingText(player.x, player.y - 40, '🫧 BUBBLE ×3', '#88ccff');
    }
    if (consumed.has('hot-sauce')) {
      this.api.applyPlayerSpeedMult(1.5);
      this.hotSauceActive = true;
      this.api.showFloatingText(player.x, player.y - 40, '🌶️ HOT SAUCE', '#ff8844');
    }
  }

  update(dt: number): void {
    if (!this.hotSauceActive) return;
    const { player } = this.api;
    if (!player.active) return;
    this.tickAccum += dt;
    if (this.tickAccum >= 1000) {
      this.tickAccum -= 1000;
      this.api.applySelfDamage(1);
    }
  }
}
