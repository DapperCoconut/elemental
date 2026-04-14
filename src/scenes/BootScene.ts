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

    // Hunt vampire stake (dark red elongated rectangle)
    gfx.clear();
    gfx.fillStyle(0x880033);
    gfx.fillRect(0, 4, 20, 6);
    gfx.fillStyle(0xcc2255);
    gfx.fillTriangle(20, 0, 20, 14, 28, 7);
    gfx.generateTexture('proj-hunt-stake', 28, 14);

    // Gravity element texture (dark purple circle with lighter purple stroke)
    gfx.clear();
    gfx.fillStyle(0x441177);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaa55ee);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-gravity', 48, 48);

    // Creation element texture (dark orange circle with bright orange stroke)
    gfx.clear();
    gfx.fillStyle(0x883311);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xcc6622);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-creation', 48, 48);

    // Creation copper bolt (small orange-brown circle)
    gfx.clear();
    gfx.fillStyle(0xcc6622);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('proj-creation-copper', 12, 12);

    // Creation silver bolt (small light-grey circle)
    gfx.clear();
    gfx.fillStyle(0xccccdd);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('proj-creation-silver', 12, 12);

    // Creation gold bolt (small yellow circle)
    gfx.clear();
    gfx.fillStyle(0xffdd22);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('proj-creation-gold', 12, 12);

    // Creation dagger (thin white rectangle)
    gfx.clear();
    gfx.fillStyle(0xeeeeff);
    gfx.fillRect(0, 2, 18, 4);
    gfx.generateTexture('proj-creation-dagger', 18, 8);

    // Creation scythe (magenta rectangle)
    gfx.clear();
    gfx.fillStyle(0xcc22aa);
    gfx.fillRect(0, 0, 16, 10);
    gfx.lineStyle(2, 0xff44ee);
    gfx.strokeRect(0, 0, 16, 10);
    gfx.generateTexture('proj-creation-scythe', 16, 10);

    // Time element texture (golden yellow circle)
    gfx.clear();
    gfx.fillStyle(0xffdd44);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffffaa);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-sand', 48, 48);

    // Time Warp orb (large golden-white orb)
    gfx.clear();
    gfx.fillStyle(0xffee88);
    gfx.fillCircle(14, 14, 14);
    gfx.lineStyle(3, 0xffffff);
    gfx.strokeCircle(14, 14, 14);
    gfx.generateTexture('proj-time-orb', 28, 28);

    // Time barrage shard (small golden diamond)
    gfx.clear();
    gfx.fillStyle(0xffdd44);
    gfx.fillRect(1, 3, 6, 4);
    gfx.lineStyle(1, 0xffffaa);
    gfx.strokeRect(1, 3, 6, 4);
    gfx.generateTexture('proj-time-shard', 8, 10);

    // Keep sand-ball/sand-shard as aliases for legacy references
    gfx.clear();
    gfx.fillStyle(0xffdd44);
    gfx.fillCircle(12, 12, 12);
    gfx.generateTexture('proj-sand-ball', 24, 24);
    gfx.clear();
    gfx.fillStyle(0xffdd44);
    gfx.fillRect(1, 3, 6, 4);
    gfx.generateTexture('proj-sand-shard', 8, 10);

    // Electricity element texture (bright yellow circle with jagged stroke)
    gfx.clear();
    gfx.fillStyle(0xddcc00);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffff44);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-electricity', 48, 48);

    // Electro ball projectile (small yellow-white circle)
    gfx.clear();
    gfx.fillStyle(0xffff44);
    gfx.fillCircle(7, 7, 7);
    gfx.lineStyle(2, 0xffffff, 0.7);
    gfx.strokeCircle(7, 7, 5);
    gfx.generateTexture('proj-electro', 14, 14);

    // Slime element texture (green blob circle)
    gfx.clear();
    gfx.fillStyle(0x55bb33);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x88ff44);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-slime', 48, 48);

    // Slime projectile (small green circle)
    gfx.clear();
    gfx.fillStyle(0x66cc44);
    gfx.fillCircle(8, 8, 8);
    gfx.lineStyle(2, 0xaaffaa, 0.8);
    gfx.strokeCircle(8, 8, 6);
    gfx.generateTexture('proj-slime', 16, 16);

    // Fate element texture (teal/mint circle with a card-suit pip)
    gfx.clear();
    gfx.fillStyle(0x55ddbb);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaaffee);
    gfx.strokeCircle(24, 24, 20);
    gfx.generateTexture('elem-fate', 48, 48);

    // Fate card projectile (small white rectangle, card-like)
    gfx.clear();
    gfx.fillStyle(0xffffff);
    gfx.fillRoundedRect(0, 0, 10, 14, 2);
    gfx.lineStyle(1, 0xddbbff);
    gfx.strokeRoundedRect(0, 0, 10, 14, 2);
    gfx.generateTexture('proj-fate-card', 10, 14);

    // Slot machine icon for placed entity (gold/pink rectangle)
    gfx.clear();
    gfx.fillStyle(0xffcc44);
    gfx.fillRoundedRect(0, 0, 28, 28, 4);
    gfx.lineStyle(2, 0xff88cc);
    gfx.strokeRoundedRect(0, 0, 28, 28, 4);
    gfx.generateTexture('slot-machine', 28, 28);

    // Sound element texture (pink/magenta circle with wavy accent ring)
    gfx.clear();
    gfx.fillStyle(0xcc4499);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xff88cc);
    gfx.strokeCircle(24, 24, 20);
    gfx.generateTexture('elem-sound', 48, 48);

    // Light element texture (pale yellow circle with white stroke)
    gfx.clear();
    gfx.fillStyle(0xeedb88);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffffff);
    gfx.strokeCircle(24, 24, 20);
    gfx.generateTexture('elem-light', 48, 48);

    // Holy blade projectile (slim bright white lance shape)
    gfx.clear();
    gfx.fillStyle(0xffffff);
    gfx.fillRect(0, 3, 20, 4);
    gfx.fillStyle(0xffee88);
    gfx.fillTriangle(18, 0, 26, 5, 18, 10);
    gfx.generateTexture('proj-holy-blade', 26, 10);

    // Dummy element texture (grey circle with target crosshair stroke)
    gfx.clear();
    gfx.fillStyle(0x777777);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xbbbbbb);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-dummy', 48, 48);

    gfx.destroy();

    this.scene.start('TitleScene');
  }
}
