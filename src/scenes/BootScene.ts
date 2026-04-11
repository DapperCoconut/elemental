import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const gfx = this.add.graphics();

    // Fire element texture (red-orange circle)
    gfx.clear();
    gfx.fillStyle(0xff4400);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xff8800);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-fire', 48, 48);

    // Water element texture (blue circle)
    gfx.clear();
    gfx.fillStyle(0x0066cc);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x44aaff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-water', 48, 48);

    // Air element texture (light blue/white circle)
    gfx.clear();
    gfx.fillStyle(0x88bbee);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaaddff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-air', 48, 48);

    // Life element texture (green circle)
    gfx.clear();
    gfx.fillStyle(0x22aa22);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x44cc44);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-life', 48, 48);

    // Petal projectile (small green circle)
    gfx.clear();
    gfx.fillStyle(0x66dd44);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('proj-life', 12, 12);

    // Fireball projectile (small orange circle)
    gfx.clear();
    gfx.fillStyle(0xff8800);
    gfx.fillCircle(7, 7, 7);
    gfx.generateTexture('proj-fire', 14, 14);

    // Water cut projectile (cyan-blue rectangle — slash shape)
    gfx.clear();
    gfx.fillStyle(0x00ccff);
    gfx.fillRect(0, 3, 22, 8);
    gfx.lineStyle(1, 0xaaeeff);
    gfx.strokeRect(0, 3, 22, 8);
    gfx.generateTexture('proj-water', 22, 14);

    // Earth element texture (brown circle)
    gfx.clear();
    gfx.fillStyle(0x887755);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaa9966);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-earth', 48, 48);

    // Oil element texture (dark amber circle)
    gfx.clear();
    gfx.fillStyle(0x664400);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaa6600);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-oil', 48, 48);

    // Oil drone laser projectile (small amber circle)
    gfx.clear();
    gfx.fillStyle(0xffaa00);
    gfx.fillCircle(5, 5, 5);
    gfx.generateTexture('proj-oil', 10, 10);

    // Shadow element texture (dark purple circle)
    gfx.clear();
    gfx.fillStyle(0x220033);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x8800cc);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-shadow', 48, 48);

    // Ice element texture (light blue circle)
    gfx.clear();
    gfx.fillStyle(0x88ccff);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xcceeff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-ice', 48, 48);

    // Ice spike projectile (small cyan-white circle)
    gfx.clear();
    gfx.fillStyle(0xaaddff);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(1, 0xffffff);
    gfx.strokeCircle(6, 6, 6);
    gfx.generateTexture('proj-ice', 12, 12);

    // Growth element texture (lime-green circle)
    gfx.clear();
    gfx.fillStyle(0x88bb22);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaadd44);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-growth', 48, 48);

    // Growth spore projectile (small lime circle)
    gfx.clear();
    gfx.fillStyle(0xaadd44);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('proj-growth', 8, 8);

    // Growth infect dagger projectile (dark green rect)
    gfx.clear();
    gfx.fillStyle(0x447700);
    gfx.fillRect(0, 2, 12, 4);
    gfx.lineStyle(1, 0x88cc00);
    gfx.strokeRect(0, 2, 12, 4);
    gfx.generateTexture('proj-growth-dagger', 12, 8);

    // Crystal element texture (cyan-white circle)
    gfx.clear();
    gfx.fillStyle(0x66bbdd);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaaeeff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-crystal', 48, 48);

    // Crystal shard projectile (small bright-cyan rect)
    gfx.clear();
    gfx.fillStyle(0x88eeff);
    gfx.fillRect(0, 2, 8, 4);
    gfx.lineStyle(1, 0xffffff);
    gfx.strokeRect(0, 2, 8, 4);
    gfx.generateTexture('proj-crystal-shard', 8, 8);

    // Soul element texture (pale purple circle)
    gfx.clear();
    gfx.fillStyle(0x9966cc);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xddaaff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-soul', 48, 48);

    // Soul bolt projectile (small pale orb for ghoul shots)
    gfx.clear();
    gfx.fillStyle(0xccaaff);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xeeddff);
    gfx.strokeCircle(5, 5, 5);
    gfx.generateTexture('proj-soul-bolt', 10, 10);

    // Hunt element texture (dark red-orange, wolf)
    gfx.clear();
    gfx.fillStyle(0xaa2200);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xff6600);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-hunt', 48, 48);

    // Hunt pellet projectile (tiny red dot)
    gfx.clear();
    gfx.fillStyle(0xff4400);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('proj-hunt-pellet', 8, 8);

    gfx.destroy();

    this.scene.start('TitleScene');
  }
}
