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

    // Adrenaline element texture — amber-gold circle with lightning bolt
    gfx.clear();
    gfx.fillStyle(0xffbb22, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xffeeaa, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(3, 0xcc7700, 1);
    gfx.beginPath();
    gfx.moveTo(28, 10); gfx.lineTo(20, 24); gfx.lineTo(26, 24); gfx.lineTo(18, 38);
    gfx.strokePath();
    gfx.generateTexture('elem-adrenaline', 48, 48);
    gfx.clear();

    // proj-adrenaline-shot — small yellow spark (8px)
    gfx.fillStyle(0xffee44, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.lineStyle(2, 0xffbb22, 1);
    gfx.strokeCircle(6, 6, 5);
    gfx.generateTexture('proj-adrenaline-shot', 12, 12);
    gfx.clear();

    // tex-adrenaline-ramp — small amber wedge rectangle (30×12)
    gfx.fillStyle(0xcc8800, 1);
    gfx.fillRect(0, 6, 30, 6);
    gfx.fillStyle(0xffcc44, 1);
    gfx.fillTriangle(0, 12, 30, 0, 30, 12);
    gfx.generateTexture('tex-adrenaline-ramp', 30, 12);
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

    // proj-tech-protestor — 32×32 angry red humanoid silhouette
    gfx.fillStyle(0xcc2222, 1);
    // head
    gfx.fillCircle(16, 7, 6);
    // body
    gfx.fillRect(10, 13, 12, 10);
    // legs
    gfx.fillRect(10, 23, 5, 9);
    gfx.fillRect(17, 23, 5, 9);
    // arms raised (sign-holder pose)
    gfx.fillRect(3, 12, 7, 4);
    gfx.fillRect(22, 12, 7, 4);
    gfx.lineStyle(1, 0xff6666, 1);
    gfx.strokeRect(2, 4, 12, 8);
    gfx.generateTexture('proj-tech-protestor', 32, 32);
    gfx.clear();

    // proj-tech-jail-bar — 4×60 vertical cyan bar (drawn live as jail box outline)
    gfx.fillStyle(0x44ccaa, 0.9);
    gfx.fillRect(0, 0, 4, 60);
    gfx.lineStyle(1, 0x88ffee, 1);
    gfx.strokeRect(0, 0, 4, 60);
    gfx.generateTexture('proj-tech-jail-bar', 4, 60);
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

    gfx.destroy();

    this.scene.start('TitleScene');
  }
}
