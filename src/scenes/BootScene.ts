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

    // Hunt hybrid form texture (darker body, jagged silver stroke to look distinct)
    gfx.clear();
    gfx.fillStyle(0x661100);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(4, 0xdddddd);
    gfx.strokeCircle(24, 24, 22);
    // Inner ring glow
    gfx.lineStyle(2, 0xff8844, 0.7);
    gfx.strokeCircle(24, 24, 15);
    gfx.generateTexture('elem-hunt-hybrid', 48, 48);

    // Hunt pellet projectile (tiny red dot)
    gfx.clear();
    gfx.fillStyle(0xff4400);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('proj-hunt-pellet', 8, 8);

    // Hunt silver bullet (slightly larger silver circle)
    gfx.clear();
    gfx.fillStyle(0xdddddd);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xffffff);
    gfx.strokeCircle(5, 5, 5);
    gfx.generateTexture('proj-hunt-silver', 10, 10);

    // Hunt shrapnel (thin silver sliver)
    gfx.clear();
    gfx.fillStyle(0xcccccc);
    gfx.fillRect(0, 2, 10, 3);
    gfx.generateTexture('proj-hunt-shrapnel', 10, 7);

    // Hunt vampire stake (dark red elongated rectangle) — kept for any legacy refs
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

    // Time revolver bullet (10×10 yellow circle, tinted at runtime)
    gfx.clear();
    gfx.fillStyle(0xffee44);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xffffff, 0.7);
    gfx.strokeCircle(5, 5, 4);
    gfx.generateTexture('proj-time-bullet', 10, 10);

    // Time lasso orb (16×16 transparent — rope drawn via Graphics)
    gfx.clear();
    gfx.fillStyle(0xffdd44, 0);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('proj-time-lasso-orb', 16, 16);

    // Time chamber explosive (20×20 red circle with concentric ring)
    gfx.clear();
    gfx.fillStyle(0xff3300);
    gfx.fillCircle(10, 10, 10);
    gfx.lineStyle(2, 0xff8800, 0.9);
    gfx.strokeCircle(10, 10, 7);
    gfx.generateTexture('proj-time-chamber', 20, 20);

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

    // Ball lightning projectile (larger, purple-white crackling orb)
    gfx.clear();
    gfx.fillStyle(0xcc88ff);
    gfx.fillCircle(14, 14, 14);
    gfx.lineStyle(3, 0xffffff, 0.8);
    gfx.strokeCircle(14, 14, 12);
    gfx.lineStyle(2, 0xffee00, 0.6);
    gfx.strokeCircle(14, 14, 8);
    gfx.generateTexture('proj-ball-lightning', 28, 28);

    // Storm cloud texture (dark circle with lighter ring)
    gfx.clear();
    gfx.fillStyle(0x223344, 0.85);
    gfx.fillCircle(40, 40, 40);
    gfx.lineStyle(3, 0x4488cc, 0.7);
    gfx.strokeCircle(40, 40, 38);
    gfx.lineStyle(2, 0x88ccff, 0.4);
    gfx.strokeCircle(40, 40, 28);
    gfx.generateTexture('fx-storm-cloud', 80, 80);

    // Sun projectile texture (photon slime)
    gfx.clear();
    gfx.fillStyle(0xffee44, 1);
    gfx.fillCircle(10, 10, 10);
    gfx.lineStyle(2, 0xffffff, 0.9);
    gfx.strokeCircle(10, 10, 8);
    gfx.generateTexture('proj-sun', 20, 20);

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
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(0, 0, 10, 14);
    gfx.lineStyle(1, 0xccaa44, 1);
    gfx.strokeRect(0, 0, 10, 14);
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

    // Magnet element texture (crimson/dark red circle with metallic border)
    gfx.clear();
    gfx.fillStyle(0x991122);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xff3366);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-magnet', 48, 48);

    // Metal rod (projectile / world object) — grey circle
    gfx.clear();
    gfx.fillStyle(0x99aacc);
    gfx.fillCircle(10, 10, 10);
    gfx.lineStyle(2, 0xddeeff);
    gfx.strokeCircle(10, 10, 10);
    gfx.generateTexture('magnet-rod', 20, 20);

    // Nail projectile — thin dark rectangle
    gfx.clear();
    gfx.fillStyle(0x888899);
    gfx.fillRect(0, 3, 18, 4);
    gfx.lineStyle(1, 0xccddee);
    gfx.strokeRect(0, 3, 18, 4);
    gfx.generateTexture('proj-nail', 18, 10);

    // Magnet shield orb — small teal circle
    gfx.clear();
    gfx.fillStyle(0x4488cc);
    gfx.fillCircle(7, 7, 7);
    gfx.lineStyle(1, 0x88ccff);
    gfx.strokeCircle(7, 7, 7);
    gfx.generateTexture('magnet-orb', 14, 14);

    // Atom smasher wall — red-grey rectangle
    gfx.clear();
    gfx.fillStyle(0x884433);
    gfx.fillRect(0, 0, 20, 80);
    gfx.lineStyle(2, 0xff6644);
    gfx.strokeRect(0, 0, 20, 80);
    gfx.generateTexture('magnet-wall', 20, 80);

    // Plasma element texture — bright purple circle with inner glow ring
    gfx.clear();
    gfx.fillStyle(0x6600cc);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(4, 0xdd88ff);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(2, 0xffffff, 0.5);
    gfx.strokeCircle(24, 24, 14);
    gfx.generateTexture('elem-plasma', 48, 48);

    // Metal element texture — silver/steel circle with gold border
    gfx.clear();
    gfx.fillStyle(0x778899);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xddcc88);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-metal', 48, 48);

    // Death element texture — dark purple circle with skull-like cross
    gfx.clear();
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x880066, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.lineStyle(2, 0xcc44ff, 1);
    // cross lines for skull accent
    gfx.beginPath(); gfx.moveTo(24, 10); gfx.lineTo(24, 38); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(10, 24); gfx.lineTo(38, 24); gfx.strokePath();
    gfx.generateTexture('elem-death', 48, 48);
    gfx.clear();

    // proj-death-bolt — small dark purple bolt for Daemon barrage
    gfx.fillStyle(0xcc44ff, 1);
    gfx.fillCircle(6, 6, 5);
    gfx.generateTexture('proj-death-bolt', 12, 12);
    gfx.clear();

    // proj-death-dagger — 14×4 dark purple pointed projectile (Demon perk)
    gfx.fillStyle(0x660044, 1);
    gfx.fillRect(0, 0, 14, 4);
    gfx.generateTexture('proj-death-dagger', 14, 4);
    gfx.clear();

    // Metal chain link projectile — small steel rect
    gfx.clear();
    gfx.fillStyle(0x889aaa);
    gfx.fillRect(0, 2, 14, 8);
    gfx.lineStyle(1, 0xccddee);
    gfx.strokeRect(0, 2, 14, 8);
    gfx.generateTexture('proj-metal-chain', 14, 12);

    // Metal grenade — small dark circle
    gfx.clear();
    gfx.fillStyle(0x445544);
    gfx.fillCircle(9, 9, 9);
    gfx.lineStyle(1, 0x88aa88);
    gfx.strokeCircle(9, 9, 9);
    gfx.generateTexture('proj-metal-grenade', 18, 18);

    // Metal RPG rocket — elongated shape
    gfx.clear();
    gfx.fillStyle(0xcc5511);
    gfx.fillRect(0, 3, 22, 7);
    gfx.fillStyle(0xff8844);
    gfx.fillTriangle(22, 0, 22, 13, 30, 6);
    gfx.generateTexture('proj-metal-rpg', 30, 13);

    // Metal taser bolt — electric yellow circle
    gfx.clear();
    gfx.fillStyle(0xffee22);
    gfx.fillCircle(8, 8, 8);
    gfx.lineStyle(2, 0xffffff);
    gfx.strokeCircle(8, 8, 8);
    gfx.generateTexture('proj-metal-taser', 16, 16);

    // Void element texture — near-black circle with dark purple stroke and inner ring
    gfx.clear();
    gfx.fillStyle(0x110022, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x440066, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(2, 0x8800cc, 0.7);
    gfx.strokeCircle(24, 24, 13);
    gfx.generateTexture('elem-void', 48, 48);
    gfx.clear();

    // proj-void-floater — small dark orb (~10px)
    gfx.fillStyle(0x330044, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0xaa00ff, 0.9);
    gfx.strokeCircle(6, 6, 5);
    gfx.generateTexture('proj-void-floater', 12, 12);
    gfx.clear();

    // proj-void-pulse — medium dark circle for Re-Lapse (~14px)
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(7, 7, 7);
    gfx.lineStyle(2, 0x8800cc, 1);
    gfx.strokeCircle(7, 7, 6);
    gfx.generateTexture('proj-void-pulse', 14, 14);
    gfx.clear();

    // Rubber element texture — pink circle with rubber-band loop
    gfx.clear();
    gfx.fillStyle(0xff5577, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffaacc, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(4, 0xffffff, 0.9);
    gfx.strokeEllipse(24, 24, 26, 14);
    gfx.lineStyle(4, 0xffffff, 0.9);
    gfx.strokeEllipse(24, 24, 14, 26);
    gfx.generateTexture('elem-rubber', 48, 48);
    gfx.clear();

    // ── Magic element (abstract combined: slime + light) ─────────────────────

    // elem-magic — deep purple circle with inner book pages outline
    gfx.fillStyle(0x9944ff, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xcc88ff, 1);
    gfx.strokeCircle(24, 24, 22);
    // inner book shape: vertical spine + two horizontal lines
    gfx.lineStyle(2, 0xffffff, 0.8);
    gfx.beginPath(); gfx.moveTo(24, 10); gfx.lineTo(24, 38); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(13, 16); gfx.lineTo(24, 16); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(13, 24); gfx.lineTo(24, 24); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(13, 32); gfx.lineTo(24, 32); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(24, 16); gfx.lineTo(35, 16); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(24, 24); gfx.lineTo(35, 24); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(24, 32); gfx.lineTo(35, 32); gfx.strokePath();
    gfx.generateTexture('elem-magic', 48, 48);
    gfx.clear();

    // proj-magic-missile — small purple streak with bright tip
    gfx.fillStyle(0x9944ff, 1);
    gfx.fillRect(0, 2, 10, 4);
    gfx.fillStyle(0xddaaff, 1);
    gfx.fillRect(8, 1, 4, 6);
    gfx.generateTexture('proj-magic-missile', 12, 8);
    gfx.clear();

    // proj-magic-cluster-core — 12px dark purple orb (cluster bomb primary)
    gfx.fillStyle(0x6611cc, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0xbb66ff, 1);
    gfx.strokeCircle(6, 6, 5);
    gfx.generateTexture('proj-magic-cluster-core', 12, 12);
    gfx.clear();

    // proj-magic-cluster-shard — 6px small shard (cluster bomb shrapnel)
    gfx.fillStyle(0xcc88ff, 1);
    gfx.fillCircle(3, 3, 3);
    gfx.generateTexture('proj-magic-cluster-shard', 6, 6);
    gfx.clear();

    // proj-magic-boomerang — curved shape using a thick arc stroke
    gfx.lineStyle(5, 0xaa55ee, 1);
    gfx.beginPath();
    gfx.arc(10, 10, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    gfx.strokePath();
    gfx.lineStyle(2, 0xddbbff, 1);
    gfx.beginPath();
    gfx.arc(10, 10, 8, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    gfx.strokePath();
    gfx.generateTexture('proj-magic-boomerang', 22, 14);
    gfx.clear();

    // proj-magic-chain — small purple chain link (16×6)
    gfx.fillStyle(0x7722cc, 1);
    gfx.fillRect(0, 1, 14, 5);
    gfx.lineStyle(1, 0xcc88ff, 1);
    gfx.strokeRect(0, 1, 14, 5);
    // oval link marks
    gfx.lineStyle(1, 0xddaaff, 0.8);
    gfx.strokeRect(1, 2, 4, 3);
    gfx.strokeRect(9, 2, 4, 3);
    gfx.generateTexture('proj-magic-chain', 16, 8);
    gfx.clear();

    // proj-magic-pillar — 30×80 rising column with bright top
    gfx.fillStyle(0x6611cc, 1);
    gfx.fillRect(0, 10, 30, 70);
    gfx.fillStyle(0xddaaff, 1);
    gfx.fillRect(0, 0, 30, 12);
    gfx.lineStyle(2, 0xcc88ff, 1);
    gfx.strokeRect(0, 0, 30, 80);
    gfx.generateTexture('proj-magic-pillar', 30, 80);
    gfx.clear();

    // proj-magic-anchor — 24px faint circle with rune cross
    gfx.lineStyle(2, 0x9944ff, 0.7);
    gfx.strokeCircle(12, 12, 11);
    gfx.lineStyle(1, 0xcc88ff, 0.5);
    gfx.beginPath(); gfx.moveTo(12, 2); gfx.lineTo(12, 22); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(2, 12); gfx.lineTo(22, 12); gfx.strokePath();
    gfx.generateTexture('proj-magic-anchor', 24, 24);
    gfx.clear();

    // proj-magic-heal-orb — 10px lavender orb (meditate heal projectile)
    gfx.fillStyle(0xcc99ff, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0xffeeff, 0.7);
    gfx.strokeCircle(6, 6, 4);
    gfx.generateTexture('proj-magic-heal-orb', 12, 12);
    gfx.clear();

    // proj-sparkle-star — 14px 5-pointed star, white center + magenta tips
    {
      const cx = 7, cy = 7, outerR = 6, innerR = 2.5, points = 5;
      gfx.fillStyle(0xff88ff, 1);
      gfx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        if (i === 0) gfx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        else gfx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      gfx.closePath();
      gfx.fillPath();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(cx, cy, 2);
    }
    gfx.generateTexture('proj-sparkle-star', 14, 14);
    gfx.clear();

    // proj-thorn-vine — 16×8 green vine segment (Virulent Thorns)
    gfx.fillStyle(0x22aa44, 1);
    gfx.fillRect(0, 1, 14, 5);
    gfx.lineStyle(1, 0x66ff88, 1);
    gfx.strokeRect(0, 1, 14, 5);
    gfx.lineStyle(1, 0x44cc66, 0.8);
    gfx.strokeRect(1, 2, 4, 3);
    gfx.strokeRect(9, 2, 4, 3);
    gfx.generateTexture('proj-thorn-vine', 16, 8);
    gfx.clear();

    // proj-thorn-vine-dark — 16×8 darker forest green (Thorn Prison)
    gfx.fillStyle(0x115522, 1);
    gfx.fillRect(0, 1, 14, 5);
    gfx.lineStyle(1, 0x33aa55, 1);
    gfx.strokeRect(0, 1, 14, 5);
    gfx.lineStyle(1, 0x22883a, 0.8);
    gfx.strokeRect(1, 2, 4, 3);
    gfx.strokeRect(9, 2, 4, 3);
    gfx.generateTexture('proj-thorn-vine-dark', 16, 8);
    gfx.clear();

    // ── Magic upgrade textures ────────────────────────────────────────────────

    // fx-dark-fire-cloud — 70px orange-purple radial blob (Corrupt Flames)
    gfx.fillStyle(0xff4400, 0.55);
    gfx.fillCircle(35, 35, 30);
    gfx.fillStyle(0x881166, 0.45);
    gfx.fillCircle(35, 35, 20);
    gfx.lineStyle(2, 0xcc3300, 0.6);
    gfx.strokeCircle(35, 35, 28);
    gfx.generateTexture('fx-dark-fire-cloud', 70, 70);
    gfx.clear();

    // fx-acid-cloud — 90px blue-green pulsing cloud (Acid Cloud Summon)
    gfx.fillStyle(0x224488, 0.55);
    gfx.fillCircle(45, 45, 38);
    gfx.fillStyle(0x33cc66, 0.3);
    gfx.fillCircle(45, 45, 25);
    gfx.lineStyle(3, 0x44aaff, 0.7);
    gfx.strokeCircle(45, 45, 36);
    gfx.generateTexture('fx-acid-cloud', 90, 90);
    gfx.clear();

    // fx-purple-trail — 14px soft purple orb (F+ meditate trail)
    gfx.fillStyle(0xaa44ff, 0.8);
    gfx.fillCircle(7, 7, 6);
    gfx.fillStyle(0xdd99ff, 0.5);
    gfx.fillCircle(7, 7, 3);
    gfx.generateTexture('fx-purple-trail', 14, 14);
    gfx.clear();

    // fx-anchor-aura-pink — 50px pink ring (R+ normal recall speed aura)
    gfx.lineStyle(4, 0xff88cc, 0.85);
    gfx.strokeCircle(25, 25, 22);
    gfx.lineStyle(2, 0xffccee, 0.5);
    gfx.strokeCircle(25, 25, 18);
    gfx.generateTexture('fx-anchor-aura-pink', 50, 50);
    gfx.clear();

    // fx-anchor-aura-black — 50px dark aura (R+ dark wild teleport aura)
    gfx.lineStyle(4, 0x220044, 0.9);
    gfx.strokeCircle(25, 25, 22);
    gfx.lineStyle(3, 0x9900cc, 0.7);
    gfx.strokeCircle(25, 25, 18);
    gfx.generateTexture('fx-anchor-aura-black', 50, 50);
    gfx.clear();

    // fx-temple-small — 28px gray circle (Gaia's Temple base)
    gfx.fillStyle(0x888888, 0.8);
    gfx.fillCircle(14, 14, 13);
    gfx.lineStyle(2, 0xcccccc, 0.9);
    gfx.strokeCircle(14, 14, 12);
    gfx.lineStyle(1, 0xaaaaaa, 0.6);
    gfx.strokeCircle(14, 14, 8);
    gfx.generateTexture('fx-temple-small', 28, 28);
    gfx.clear();

    // fx-temple-large — 40px darker gray circle (Gaia's Monument base)
    gfx.fillStyle(0x555555, 0.85);
    gfx.fillCircle(20, 20, 18);
    gfx.lineStyle(3, 0x999999, 0.9);
    gfx.strokeCircle(20, 20, 17);
    gfx.lineStyle(1, 0x777777, 0.6);
    gfx.strokeCircle(20, 20, 11);
    gfx.generateTexture('fx-temple-large', 40, 40);
    gfx.clear();

    // ── Technology element (abstract combined: sound + light) ─────────────────

    // elem-technology — cyan circle with white { } brace glyph
    gfx.fillStyle(0x44ccaa, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x88ffee, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffffff, 1);
    gfx.beginPath(); gfx.moveTo(17, 12); gfx.lineTo(14, 16); gfx.lineTo(14, 22); gfx.lineTo(11, 24); gfx.lineTo(14, 26); gfx.lineTo(14, 32); gfx.lineTo(17, 36); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(31, 12); gfx.lineTo(34, 16); gfx.lineTo(34, 22); gfx.lineTo(37, 24); gfx.lineTo(34, 26); gfx.lineTo(34, 32); gfx.lineTo(31, 36); gfx.strokePath();
    gfx.generateTexture('elem-technology', 48, 48);
    gfx.clear();

    // proj-tech-flail-ball — 24px dark metal sphere with rivet highlights
    gfx.fillStyle(0x334455, 1);
    gfx.fillCircle(12, 12, 12);
    gfx.lineStyle(2, 0x88aacc, 1);
    gfx.strokeCircle(12, 12, 11);
    gfx.fillStyle(0x88aacc, 1);
    gfx.fillCircle(8, 8, 3);
    gfx.fillCircle(17, 7, 2);
    gfx.fillStyle(0x556677, 1);
    gfx.fillCircle(15, 17, 4);
    gfx.generateTexture('proj-tech-flail-ball', 24, 24);
    gfx.clear();

    // proj-tech-flail-chain — 8×8 single chain link
    gfx.fillStyle(0x556677, 1);
    gfx.fillRect(0, 2, 8, 4);
    gfx.lineStyle(1, 0x88aacc, 1);
    gfx.strokeRect(0, 2, 8, 4);
    gfx.lineStyle(1, 0xaaccee, 0.7);
    gfx.strokeRect(1, 3, 2, 2);
    gfx.strokeRect(5, 3, 2, 2);
    gfx.generateTexture('proj-tech-flail-chain', 8, 8);
    gfx.clear();

    // proj-tech-bullet — 10×6 green pixel bullet with trailing glow
    gfx.fillStyle(0x22aa66, 1);
    gfx.fillRect(0, 1, 8, 4);
    gfx.fillStyle(0x88ffcc, 1);
    gfx.fillRect(7, 0, 4, 6);
    gfx.fillStyle(0x44ccaa, 0.5);
    gfx.fillRect(0, 0, 4, 6);
    gfx.generateTexture('proj-tech-bullet', 12, 6);
    gfx.clear();

    // proj-tech-protestor — 32×32 red circle
    gfx.fillStyle(0xff2222, 1);
    gfx.fillCircle(16, 16, 14);
    gfx.generateTexture('proj-tech-protestor', 32, 32);
    gfx.clear();

    // proj-tech-jail-bar — 4×60 vertical cyan bar (drawn live as jail box outline)
    gfx.fillStyle(0x44ccaa, 0.9);
    gfx.fillRect(0, 0, 4, 60);
    gfx.lineStyle(1, 0x88ffee, 1);
    gfx.strokeRect(0, 0, 4, 60);
    gfx.generateTexture('proj-tech-jail-bar', 4, 60);
    gfx.clear();

    // proj-tech-disc — 18×18 cyan spinning disc
    gfx.fillStyle(0x2299ff, 1);
    gfx.fillCircle(9, 9, 9);
    gfx.lineStyle(2, 0x88ddff, 1);
    gfx.strokeCircle(9, 9, 7);
    gfx.fillStyle(0xaaeeff, 1);
    gfx.fillCircle(9, 9, 3);
    gfx.generateTexture('proj-tech-disc', 18, 18);
    gfx.clear();

    // proj-tech-grenade — 14×16 dark-green grenade
    gfx.fillStyle(0x334422, 1);
    gfx.fillCircle(7, 9, 7);
    gfx.fillStyle(0x556633, 1);
    gfx.fillRect(5, 2, 4, 5);
    gfx.fillStyle(0x88aa44, 1);
    gfx.fillRect(5, 0, 4, 3);
    gfx.lineStyle(1, 0x88aa44, 1);
    gfx.strokeCircle(7, 9, 6);
    gfx.generateTexture('proj-tech-grenade', 14, 16);
    gfx.clear();

    // proj-tech-malware — 22×22 blue square with scan-lines
    gfx.fillStyle(0x1133ee, 1);
    gfx.fillRect(0, 0, 22, 22);
    gfx.lineStyle(2, 0x5577ff, 1);
    gfx.strokeRect(1, 1, 20, 20);
    gfx.lineStyle(1, 0x3355cc, 0.7);
    for (let row = 4; row < 22; row += 5) { gfx.beginPath(); gfx.moveTo(2, row); gfx.lineTo(20, row); gfx.strokePath(); }
    gfx.generateTexture('proj-tech-malware', 22, 22);
    gfx.clear();

    // proj-tech-ransomware — 26×26 orange lock circle
    gfx.fillStyle(0xff6600, 1);
    gfx.fillCircle(13, 13, 13);
    gfx.lineStyle(3, 0xffaa33, 1);
    gfx.strokeCircle(13, 13, 11);
    gfx.fillStyle(0xffcc66, 1);
    gfx.fillRect(9, 8, 8, 6);
    gfx.lineStyle(2, 0xffffff, 1);
    gfx.strokeCircle(13, 10, 4);
    gfx.generateTexture('proj-tech-ransomware', 26, 26);
    gfx.clear();

    // proj-tech-trojan — 28×26 wooden crate with circuit markings
    gfx.fillStyle(0x885533, 1);
    gfx.fillRect(1, 1, 26, 24);
    gfx.lineStyle(2, 0xddaa66, 1);
    gfx.strokeRect(1, 1, 26, 24);
    gfx.lineStyle(2, 0x664422, 1);
    gfx.beginPath(); gfx.moveTo(14, 1); gfx.lineTo(14, 25); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(1, 13); gfx.lineTo(27, 13); gfx.strokePath();
    gfx.lineStyle(1, 0x44ccaa, 0.8);
    gfx.strokeRect(5, 5, 8, 8);
    gfx.strokeRect(15, 15, 8, 6);
    gfx.generateTexture('proj-tech-trojan', 28, 26);
    gfx.clear();

    // proj-tech-cluster — 8×8 small red cluster bomb
    gfx.fillStyle(0xff3300, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.lineStyle(1, 0xff7744, 1);
    gfx.strokeCircle(4, 4, 3);
    gfx.generateTexture('proj-tech-cluster', 8, 8);
    gfx.clear();

    // ── Echo element (abstract combined: fate + light) ───────────────────────

    // elem-echo — white-purple circle with bat wing arcs
    gfx.fillStyle(0x221133, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xccccff, 1);
    gfx.strokeCircle(24, 24, 22);
    // bat wing arcs
    gfx.lineStyle(2, 0xaaaadd, 0.8);
    gfx.beginPath();
    gfx.arc(16, 24, 8, Math.PI * 1.2, Math.PI * 1.8, false);
    gfx.strokePath();
    gfx.beginPath();
    gfx.arc(32, 24, 8, Math.PI * 1.2, Math.PI * 1.8, false);
    gfx.strokePath();
    gfx.generateTexture('elem-echo', 48, 48);
    gfx.clear();

    // ── Quantum element (abstract combined: slime + fate) ────────────────────

    // elem-quantum — deep purple circle with orbital arcs
    gfx.fillStyle(0x330066, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaa44ff, 1);
    gfx.strokeCircle(24, 24, 22);
    // horizontal orbital ellipse
    gfx.lineStyle(2, 0xcc88ff, 0.9);
    gfx.beginPath();
    gfx.arc(24, 24, 14, Math.PI * 0.15, Math.PI * 0.85, false);
    gfx.strokePath();
    gfx.beginPath();
    gfx.arc(24, 24, 14, Math.PI * 1.15, Math.PI * 1.85, false);
    gfx.strokePath();
    // nucleus dot
    gfx.fillStyle(0xee99ff, 1);
    gfx.fillCircle(24, 24, 4);
    gfx.generateTexture('elem-quantum', 48, 48);
    gfx.clear();

    // proj-quantum — small purple orb
    gfx.fillStyle(0xaa44ff, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xee99ff, 1);
    gfx.strokeCircle(5, 5, 4);
    gfx.generateTexture('proj-quantum', 10, 10);
    gfx.clear();

    // proj-fate-coin — 12×12 gold circle (coin toss projectile)
    gfx.fillStyle(0xffcc00, 1);
    gfx.fillCircle(6, 6, 5);
    gfx.lineStyle(2, 0xffaa00, 1);
    gfx.strokeCircle(6, 6, 4);
    gfx.generateTexture('proj-fate-coin', 12, 12);
    gfx.clear();

    // proj-fate-dice — 24×24 white square with dots (dice projectile)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(0, 0, 24, 24, 4);
    gfx.lineStyle(1, 0xcccccc, 1);
    gfx.strokeRoundedRect(0, 0, 24, 24, 4);
    gfx.fillStyle(0x333333, 1);
    // center dot
    gfx.fillCircle(12, 12, 2);
    // corner dots
    gfx.fillCircle(6, 6, 2);
    gfx.fillCircle(18, 6, 2);
    gfx.fillCircle(6, 18, 2);
    gfx.fillCircle(18, 18, 2);
    gfx.generateTexture('proj-fate-dice', 24, 24);
    gfx.clear();

    // ── Silence element (abstract combined: slime + sound) ────────────────────

    // elem-silence — near-black purple circle with two small white eye dots
    gfx.fillStyle(0x1a0022, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x660099, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(19, 22, 3);
    gfx.fillCircle(29, 22, 3);
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(19, 22, 1);
    gfx.fillCircle(29, 22, 1);
    gfx.generateTexture('elem-silence', 48, 48);
    gfx.clear();

    // proj-silence-eye — 18×18 dark eye projectile with red iris
    gfx.fillStyle(0x110011, 1);
    gfx.fillCircle(9, 9, 9);
    gfx.fillStyle(0xaa0022, 1);
    gfx.fillCircle(9, 9, 5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(9, 9, 2);
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(11, 7, 1);
    gfx.generateTexture('proj-silence-eye', 18, 18);
    gfx.clear();

    // proj-silence-hook — 16×16 grey crescent hook
    gfx.lineStyle(3, 0x888888, 1);
    gfx.beginPath();
    gfx.arc(8, 8, 6, -Math.PI * 0.2, Math.PI * 0.9);
    gfx.strokePath();
    gfx.lineStyle(2, 0xaaaaaa, 1);
    gfx.beginPath();
    gfx.moveTo(12, 13);
    gfx.lineTo(14, 15);
    gfx.strokePath();
    gfx.generateTexture('proj-silence-hook', 16, 16);
    gfx.clear();

    // tree-silence — 48×72 leafy tree: brown trunk + dark-green canopy
    gfx.fillStyle(0x5c3a1e, 1);
    gfx.fillRect(18, 42, 12, 30);
    gfx.fillStyle(0x1a4a1a, 1);
    gfx.fillCircle(24, 28, 20);
    gfx.fillStyle(0x0d2e0d, 1);
    gfx.fillCircle(24, 20, 13);
    gfx.lineStyle(1, 0x2d6e2d, 0.5);
    gfx.strokeCircle(24, 28, 20);
    gfx.generateTexture('tree-silence', 48, 72);
    gfx.clear();

    // eye-silence — 12×12 small eye (used in They Watch border goop)
    gfx.fillStyle(0xdddddd, 1);
    gfx.fillEllipse(6, 6, 10, 7);
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(6, 6, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(6, 6, 1);
    gfx.generateTexture('eye-silence', 12, 12);
    gfx.clear();

    // mask-silence — 28×22 white hockey mask with dark eye holes and vertical bar lines
    gfx.fillStyle(0xeeeeee, 1);
    gfx.fillEllipse(14, 11, 26, 20); // face oval
    gfx.fillStyle(0x000000, 0.85);
    gfx.fillEllipse(8, 9, 6, 5);    // left eye hole
    gfx.fillEllipse(20, 9, 6, 5);   // right eye hole
    gfx.fillStyle(0x000000, 0.35);
    // Vertical bar lines (hockey mask)
    for (let bx2 = 5; bx2 <= 23; bx2 += 6) {
      gfx.fillRect(bx2, 14, 2, 5);
    }
    // Horizontal chin bar
    gfx.fillRect(5, 17, 18, 2);
    gfx.generateTexture('mask-silence', 28, 22);
    gfx.clear();

    // doll-silence — 20×24 mini voodoo straw figure with hockey mask (R+ possession)
    gfx.fillStyle(0x997755, 1);
    gfx.fillRect(8, 10, 4, 10); // torso
    gfx.fillRect(4, 12, 5, 2);  // left arm
    gfx.fillRect(11, 12, 5, 2); // right arm
    gfx.fillRect(7, 20, 3, 4);  // left leg
    gfx.fillRect(10, 20, 3, 4); // right leg
    gfx.fillStyle(0xeeeeee, 1);
    gfx.fillEllipse(10, 7, 8, 7); // mask face
    gfx.fillStyle(0x000000, 0.8);
    gfx.fillEllipse(7, 6, 2, 2);  // left eye hole
    gfx.fillEllipse(13, 6, 2, 2); // right eye hole
    gfx.generateTexture('doll-silence', 20, 24);
    gfx.clear();

    // goop-silence-form — 80×80 irregular black blob with yellow eyes (Q+ goop transform)
    gfx.fillStyle(0x0a0a0a, 1);
    gfx.fillCircle(40, 40, 36);
    gfx.fillCircle(20, 28, 16);
    gfx.fillCircle(58, 22, 14);
    gfx.fillCircle(62, 52, 18);
    gfx.fillCircle(24, 56, 15);
    gfx.fillStyle(0xffff00, 1);
    gfx.fillEllipse(28, 32, 8, 5);
    gfx.fillEllipse(52, 28, 8, 5);
    gfx.fillEllipse(22, 50, 6, 4);
    gfx.fillEllipse(58, 50, 6, 4);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(30, 32, 2);
    gfx.fillCircle(54, 28, 2);
    gfx.fillCircle(23, 50, 1);
    gfx.fillCircle(59, 50, 1);
    gfx.generateTexture('goop-silence-form', 80, 80);
    gfx.clear();

    // domain-shard — 10×4 black-purple elongated diamond for Domain Expansion
    gfx.fillStyle(0x0a0014, 1);
    gfx.fillTriangle(5, 2, 0, 2, 5, 0);
    gfx.fillTriangle(5, 2, 10, 2, 5, 4);
    gfx.fillRect(0, 1, 10, 2);
    gfx.lineStyle(1, 0x330066, 1);
    gfx.strokeRect(0, 0, 10, 4);
    gfx.generateTexture('domain-shard', 10, 4);
    gfx.clear();

    // tech-backrooms-tile — 64×64 yellow mottled wallpaper tile
    gfx.fillStyle(0xbbaa44, 1);
    gfx.fillRect(0, 0, 64, 64);
    for (let ty = 0; ty < 4; ty++) {
      for (let tx = 0; tx < 4; tx++) {
        const bx = tx * 16, by = ty * 16;
        gfx.fillStyle(0xccbb55, 0.5);
        gfx.fillRect(bx + 1, by + 1, 14, 14);
        gfx.lineStyle(1, 0x998822, 0.8);
        gfx.strokeRect(bx, by, 16, 16);
      }
    }
    // subtle noise dots
    gfx.fillStyle(0x887733, 0.4);
    for (let ni = 0; ni < 30; ni++) {
      gfx.fillCircle(2 + (ni * 7 + ni * ni * 3) % 60, 2 + (ni * 11 + ni * 3) % 60, 1);
    }
    gfx.generateTexture('tech-backrooms-tile', 64, 64);
    gfx.clear();

    // tech-backrooms-eye — 12×12 simple bloodshot eye
    gfx.fillStyle(0xffeedd, 1);
    gfx.fillEllipse(6, 6, 12, 8);
    gfx.fillStyle(0x882222, 1);
    gfx.fillCircle(6, 6, 3);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(6, 6, 1.5);
    gfx.lineStyle(1, 0xcc4422, 0.7);
    gfx.lineBetween(1, 5, 3, 6);
    gfx.lineBetween(9, 5, 11, 6);
    gfx.generateTexture('tech-backrooms-eye', 12, 12);
    gfx.clear();

    // echo-psychic-eye — 18×18 white outer circle, light-blue iris, black pupil
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(9, 9, 9);
    gfx.fillStyle(0x88ccff, 1);
    gfx.fillCircle(9, 9, 5.5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(9, 9, 2.5);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(11, 7, 1.5); // specular
    gfx.generateTexture('echo-psychic-eye', 18, 18);
    gfx.clear();

    // ── Corrupted enemy textures ────────────────────────────────────

    // corrupted-basic — 48×48 dark purple circle, magenta stroke
    gfx.fillStyle(0x220022, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0xdd00dd, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.fillStyle(0xff44ff, 1);
    gfx.fillCircle(17, 20, 3);
    gfx.fillCircle(31, 20, 3);
    gfx.generateTexture('corrupted-basic', 48, 48);
    gfx.clear();

    // corrupted-overcharged — 48×48 yellow circle, red stroke
    gfx.fillStyle(0x332200, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0xff4400, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.fillStyle(0xffcc00, 1);
    gfx.fillCircle(24, 24, 8);
    gfx.lineStyle(2, 0xffaa00, 0.8);
    gfx.strokeCircle(24, 24, 14);
    gfx.generateTexture('corrupted-overcharged', 48, 48);
    gfx.clear();

    // corrupted-rusher — 48×48 red circle, white streak
    gfx.fillStyle(0x330000, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0xff2222, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.lineStyle(3, 0xffffff, 0.9);
    gfx.lineBetween(8, 24, 40, 24);
    gfx.lineBetween(14, 18, 24, 24);
    gfx.lineBetween(14, 30, 24, 24);
    gfx.generateTexture('corrupted-rusher', 48, 48);
    gfx.clear();

    // corrupted-protected — 48×48 blue circle, cyan stroke
    gfx.fillStyle(0x001133, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0x0088ff, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.lineStyle(2, 0x44ddff, 0.7);
    gfx.strokeCircle(24, 24, 14);
    gfx.fillStyle(0x44aaff, 1);
    gfx.fillCircle(24, 24, 5);
    gfx.generateTexture('corrupted-protected', 48, 48);
    gfx.clear();

    // corrupted-architect — 48×48 dark green circle, lime stroke
    gfx.fillStyle(0x001100, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0x22bb22, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.fillStyle(0x44ff44, 0.6);
    gfx.fillTriangle(24, 12, 14, 30, 34, 30);
    gfx.generateTexture('corrupted-architect', 48, 48);
    gfx.clear();

    // corrupted-titan — 72×72 large dark red circle, orange stroke
    gfx.fillStyle(0x220000, 1);
    gfx.fillCircle(36, 36, 32);
    gfx.lineStyle(4, 0xff6600, 1);
    gfx.strokeCircle(36, 36, 32);
    gfx.lineStyle(2, 0xff3300, 0.7);
    gfx.strokeCircle(36, 36, 22);
    gfx.fillStyle(0xff4400, 1);
    gfx.fillCircle(25, 28, 5);
    gfx.fillCircle(47, 28, 5);
    gfx.fillStyle(0xff8800, 0.8);
    gfx.fillRect(26, 40, 20, 4);
    gfx.generateTexture('corrupted-titan', 72, 72);
    gfx.clear();

    // proj-corrupted — 12×12 purple projectile
    gfx.fillStyle(0xaa00cc, 1);
    gfx.fillCircle(6, 6, 5);
    gfx.lineStyle(1, 0xff44ff, 0.8);
    gfx.strokeCircle(6, 6, 5);
    gfx.generateTexture('proj-corrupted', 12, 12);
    gfx.clear();

    // proj-noxious — 12×12 green noxious projectile (festering growth shots)
    gfx.fillStyle(0x004400, 1);
    gfx.fillCircle(6, 6, 5);
    gfx.lineStyle(1, 0x44ff44, 0.8);
    gfx.strokeCircle(6, 6, 5);
    gfx.fillStyle(0x88ff44, 0.6);
    gfx.fillCircle(6, 6, 2);
    gfx.generateTexture('proj-noxious', 12, 12);
    gfx.clear();

    // proj-titan-rocket — 16×16 red-orange rocket
    gfx.fillStyle(0xff4400, 1);
    gfx.fillTriangle(8, 0, 2, 16, 14, 16);
    gfx.lineStyle(2, 0xff8800, 0.8);
    gfx.strokeTriangle(8, 0, 2, 16, 14, 16);
    gfx.generateTexture('proj-titan-rocket', 16, 16);
    gfx.clear();

    // corrupted-growth — 32×32 dark green festering growth
    gfx.fillStyle(0x002200, 1);
    gfx.fillCircle(16, 16, 14);
    gfx.lineStyle(2, 0x44cc44, 0.8);
    gfx.strokeCircle(16, 16, 14);
    gfx.fillStyle(0x226622, 0.6);
    gfx.fillCircle(16, 16, 7);
    gfx.lineStyle(1, 0x88ff44, 0.5);
    for (let ci = 0; ci < 6; ci++) {
      const ca = (ci / 6) * Math.PI * 2;
      gfx.lineBetween(16, 16, 16 + Math.cos(ca) * 12, 16 + Math.sin(ca) * 12);
    }
    gfx.generateTexture('corrupted-growth', 32, 32);
    gfx.clear();

    // titan-shield — 24×24 cyan orbiting shield
    gfx.fillStyle(0x003344, 1);
    gfx.fillCircle(12, 12, 10);
    gfx.lineStyle(2, 0x44ffff, 1);
    gfx.strokeCircle(12, 12, 10);
    gfx.fillStyle(0x88ffff, 0.7);
    gfx.fillCircle(12, 12, 4);
    gfx.generateTexture('titan-shield', 24, 24);
    gfx.clear();

    // proj-note-blue — blue rhythm note
    gfx.fillStyle(0x3388ff, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0x88ccff, 1);
    gfx.strokeCircle(6, 6, 6);
    gfx.generateTexture('proj-note-blue', 12, 12);
    gfx.clear();

    // proj-note-purple — purple rhythm note
    gfx.fillStyle(0x9955cc, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0xcc99ee, 1);
    gfx.strokeCircle(6, 6, 6);
    gfx.generateTexture('proj-note-purple', 12, 12);
    gfx.clear();

    // proj-note-hold-green — green hold note pill
    gfx.fillStyle(0x44ee88, 1);
    gfx.fillRoundedRect(0, 0, 30, 12, 4);
    gfx.lineStyle(2, 0x88ffcc, 1);
    gfx.strokeRoundedRect(0, 0, 30, 12, 4);
    gfx.generateTexture('proj-note-hold-green', 30, 12);
    gfx.clear();

    // elem-fallen-angel — 32×32 dark purple circle with radiating lines
    gfx.fillStyle(0x6644aa, 1);
    gfx.fillCircle(16, 16, 14);
    gfx.lineStyle(2, 0x9966cc, 1);
    gfx.strokeCircle(16, 16, 14);
    gfx.lineStyle(1, 0xcc88ff, 0.7);
    for (let ri = 0; ri < 8; ri++) {
      const ra = (ri / 8) * Math.PI * 2;
      gfx.lineBetween(16, 16, 16 + Math.cos(ra) * 14, 16 + Math.sin(ra) * 14);
    }
    gfx.generateTexture('elem-fallen-angel', 32, 32);
    gfx.clear();

    // elem-light-blue — 48×48 blue player sprite (same shape as elem-light but blue)
    gfx.fillStyle(0x4488ff, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(2, 0x88bbff, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillCircle(18, 18, 5);
    gfx.generateTexture('elem-light-blue', 48, 48);
    gfx.clear();

    // perk-stalagmite — 20×32 cyan spike (for Stalagmite quad perk)
    gfx.fillStyle(0x4488cc, 1);
    gfx.fillTriangle(10, 0, 20, 32, 0, 32);  // spike shape
    gfx.lineStyle(2, 0x88ccff, 1);
    gfx.strokeTriangle(10, 0, 20, 32, 0, 32);
    gfx.generateTexture('perk-stalagmite', 20, 32);
    gfx.clear();

    // perk-stalagmite-lava — same but lava-colored for upgraded final stalagmite
    gfx.fillStyle(0xcc4400, 1);
    gfx.fillTriangle(10, 0, 20, 32, 0, 32);
    gfx.lineStyle(2, 0xff8833, 1);
    gfx.strokeTriangle(10, 0, 20, 32, 0, 32);
    gfx.fillStyle(0xffcc00, 0.6);
    gfx.fillTriangle(10, 6, 17, 30, 3, 30);  // inner glow
    gfx.generateTexture('perk-stalagmite-lava', 20, 32);
    gfx.clear();

    gfx.destroy();

    this.scene.start('TitleScene');
  }
}
