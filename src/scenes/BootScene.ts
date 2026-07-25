import Phaser from 'phaser';
import { HUSK_VARIANTS, huskTextureKey } from '../invasion/HuskVariants';

/** Scale a colour's channels toward black by `factor` (0–1). */
function darken(color: number, factor: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return Phaser.Display.Color.GetColor(ch(c.red), ch(c.green), ch(c.blue));
}

/**
 * Blend a colour `t` of the way toward white. Multiplying can't lighten a
 * near-black body, so dark husks lift their outline this way instead.
 */
function lighten(color: number, t: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const ch = (v: number) => Math.round(v + (255 - v) * t);
  return Phaser.Display.Color.GetColor(ch(c.red), ch(c.green), ch(c.blue));
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const gfx = this.add.graphics();

    // Fire element texture — a living ember: charred rim, banked coals, white-hot heart,
    // with flame tips licking up around the crown. Radius stays 22 to match the physics body.
    gfx.clear();
    gfx.fillStyle(0x991100, 1);
    gfx.fillCircle(24, 24, 22);
    // Flame tips around the upper half, drawn under the body so only their points show.
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      const len = 22 + (i % 2 === 0 ? 1.5 : 0.5);
      gfx.fillStyle(i % 2 === 0 ? 0xff6600 : 0xff2200, 1);
      gfx.fillTriangle(
        24 + Math.cos(a - 0.22) * 17, 24 + Math.sin(a - 0.22) * 17,
        24 + Math.cos(a) * len, 24 + Math.sin(a) * len,
        24 + Math.cos(a + 0.22) * 17, 24 + Math.sin(a + 0.22) * 17,
      );
    }
    gfx.fillStyle(0xcc1100, 1);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0xff4400, 1);
    gfx.fillCircle(24, 25, 16);
    gfx.fillStyle(0xff6600, 1);
    gfx.fillCircle(24, 26, 12.5);
    gfx.fillStyle(0xff9900, 1);
    gfx.fillCircle(24, 27, 8.5);
    gfx.fillStyle(0xffdd33, 1);
    gfx.fillCircle(24, 28, 5);
    // Rim light along the top edge sells the sphere.
    gfx.lineStyle(2.5, 0xff8800, 0.9);
    gfx.strokeCircle(24, 24, 21);
    gfx.lineStyle(2, 0xffdd33, 0.55);
    gfx.beginPath();
    gfx.arc(24, 24, 19, Math.PI * 1.15, Math.PI * 1.85);
    gfx.strokePath();
    gfx.generateTexture('elem-fire', 48, 48);

    // Water element texture — a bead of water held by its own surface tension: dark rim,
    // ocean body, a caustic pooling low where light refracts through, and a hard specular
    // glint up-left. Radius stays 22 to match the physics body.
    gfx.clear();
    gfx.fillStyle(0x00224d, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x00468c, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.fillStyle(0x0066bb, 1);
    gfx.fillCircle(24, 25, 17);
    gfx.fillStyle(0x0088dd, 1);
    gfx.fillCircle(24, 26.5, 13);
    // Caustic: light that passed through the bead concentrates against the far wall.
    gfx.fillStyle(0x22aaee, 1);
    gfx.fillEllipse(24, 31, 20, 10);
    gfx.fillStyle(0x55ccff, 0.85);
    gfx.fillEllipse(24, 33, 13, 5.5);
    // Meniscus band across the waist.
    gfx.lineStyle(2, 0x88ddff, 0.45);
    gfx.beginPath();
    gfx.arc(24, 24, 15, Math.PI * 0.08, Math.PI * 0.92);
    gfx.strokePath();
    // Rim light along the top edge sells the sphere.
    gfx.lineStyle(2.5, 0x22aaee, 0.9);
    gfx.strokeCircle(24, 24, 21);
    gfx.lineStyle(2, 0xbbeeff, 0.6);
    gfx.beginPath();
    gfx.arc(24, 24, 19, Math.PI * 1.12, Math.PI * 1.88);
    gfx.strokePath();
    // Specular glint + two trapped bubbles.
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillEllipse(17.5, 16, 9, 5.5);
    gfx.fillStyle(0xddf6ff, 0.55);
    gfx.fillCircle(31, 19, 2.6);
    gfx.fillCircle(28.5, 30, 1.7);
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

    // Sakura projectile (white circle — tinted pink at spawn)
    gfx.clear();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('proj-sakura', 12, 12);

    // Fireball projectile — layered hot core inside a ragged red shell. Canvas stays 14×14
    // so the physics hitbox is unchanged; the extra read comes from the colour banding.
    gfx.clear();
    gfx.fillStyle(0xcc1100, 0.85);
    gfx.fillCircle(7, 7, 7);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      gfx.fillStyle(0xff2200, 0.9);
      gfx.fillCircle(7 + Math.cos(a) * 2.6, 7 + Math.sin(a) * 2.6, 3.6);
    }
    gfx.fillStyle(0xff5500, 1);
    gfx.fillCircle(7, 7, 5.2);
    gfx.fillStyle(0xff9900, 1);
    gfx.fillCircle(7, 7, 3.6);
    gfx.fillStyle(0xffdd33, 1);
    gfx.fillCircle(7, 7, 2.2);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(6.6, 6.6, 1.1);
    gfx.generateTexture('proj-fire', 14, 14);

    // Cremation ember projectile (deep-red coal with a glowing crack, Fire Mastery)
    gfx.clear();
    gfx.fillStyle(0x991100, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0xcc1100, 1);
    gfx.fillCircle(5, 5, 3.8);
    gfx.fillStyle(0xff5500, 1);
    gfx.fillCircle(4.6, 4.6, 2.2);
    gfx.fillStyle(0xff9900, 1);
    gfx.fillCircle(4.4, 4.4, 1.1);
    gfx.lineStyle(1, 0xff5500, 0.9);
    gfx.strokeCircle(5, 5, 5);
    gfx.generateTexture('proj-ember', 10, 10);

    // Water cut projectile — a thrown ribbon: filament tail on the left, fat bead leading on
    // the right where surface tension gathers it. Canvas stays 22×14 so the hitbox is unchanged.
    gfx.clear();
    gfx.fillStyle(0x00468c, 1);
    gfx.fillTriangle(0, 7, 15, 2, 15, 12);
    gfx.fillCircle(16.2, 7, 5.4);
    gfx.fillStyle(0x0088dd, 1);
    gfx.fillTriangle(2.5, 7, 15, 3.6, 15, 10.4);
    gfx.fillCircle(16, 7, 4);
    gfx.fillStyle(0x55ccff, 1);
    gfx.fillTriangle(6, 7, 15.5, 4.8, 15.5, 9.2);
    gfx.fillCircle(15.8, 7, 2.6);
    // Foam catching the light along the leading edge, plus a specular pip.
    gfx.lineStyle(1.2, 0xbbeeff, 0.85);
    gfx.beginPath();
    gfx.arc(16.2, 7, 5.2, Math.PI * 1.25, Math.PI * 0.75);
    gfx.strokePath();
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(15.2, 5.4, 1.3);
    gfx.generateTexture('proj-water', 22, 14);

    // Pressure dagger projectile — the same ribbon crushed down: near-black abyss core under
    // a bright pressure edge, so the charged shot reads as denser rather than merely bigger.
    gfx.clear();
    gfx.fillStyle(0x00224d, 1);
    gfx.fillTriangle(0, 7, 12.5, 2.4, 12.5, 11.6);
    gfx.fillCircle(13.4, 7, 4.5);
    gfx.fillStyle(0x00468c, 1);
    gfx.fillTriangle(2, 7, 12.5, 3.8, 12.5, 10.2);
    gfx.fillCircle(13.2, 7, 3.2);
    gfx.fillStyle(0x22aaee, 1);
    gfx.fillTriangle(5, 7, 13, 5, 13, 9);
    // Pressure edge: a hard bright line down the top face of the lance.
    gfx.lineStyle(1.4, 0xddf6ff, 0.9);
    gfx.beginPath();
    gfx.moveTo(1.5, 6.4);
    gfx.lineTo(13, 3.4);
    gfx.strokePath();
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(13, 5.6, 1.2);
    gfx.generateTexture('proj-pressure-dagger', 18, 14);

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

    // Crystal element texture (cyan-white circle)
    gfx.clear();
    gfx.fillStyle(0x66bbdd);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xaaeeff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-crystal', 48, 48);

    // Crystal kite shard projectile (kite/deltoid shape — NOT a symmetric diamond: asymmetric top/bottom, symmetric left/right)
    // Tripled in size from the original 14×16 texture.
    gfx.clear();
    gfx.fillStyle(0x88eeff);
    gfx.beginPath();
    gfx.moveTo(21, 0);   // top point
    gfx.lineTo(36, 18);  // right point
    gfx.lineTo(21, 48);  // bottom point (longer tail — kite shape)
    gfx.lineTo(6, 18);   // left point
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(3, 0xffffff);
    gfx.strokePath();
    gfx.generateTexture('proj-crystal-kite', 42, 48);

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

    // Acid Whip projectile (short green lash rectangle)
    gfx.clear();
    gfx.fillStyle(0x77dd33);
    gfx.fillRect(0, 3, 16, 6);
    gfx.lineStyle(1, 0xccff88);
    gfx.strokeRect(0, 3, 16, 6);
    gfx.generateTexture('proj-acid-whip', 16, 12);

    // Purge ball projectile (dark acid orb with a neon drip ring)
    gfx.clear();
    gfx.fillStyle(0x225511);
    gfx.fillCircle(9, 9, 9);
    gfx.lineStyle(2, 0x66ff33, 0.9);
    gfx.strokeCircle(9, 9, 7);
    gfx.generateTexture('proj-purge', 18, 18);

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

    // Prism lance projectile (plain triangle, tinted per bolt)
    gfx.clear();
    gfx.fillStyle(0xffffff);
    gfx.fillTriangle(0, 0, 0, 20, 24, 10);
    gfx.generateTexture('proj-light-triangle', 24, 20);

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

    // Gunpowder element texture — dark purple circle with skull-like cross
    gfx.clear();
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x880066, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.lineStyle(2, 0xcc44ff, 1);
    // cross lines for skull accent
    gfx.beginPath(); gfx.moveTo(24, 10); gfx.lineTo(24, 38); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(10, 24); gfx.lineTo(38, 24); gfx.strokePath();
    gfx.generateTexture('elem-gunpowder', 48, 48);
    gfx.clear();

    // proj-gunpowder-musket — fast musket ball with a brass tip
    gfx.fillStyle(0x3a2a1a, 1);
    gfx.fillRect(0, 1, 16, 3);
    gfx.fillStyle(0xddaa55, 1);
    gfx.fillCircle(16, 2, 3);
    gfx.generateTexture('proj-gunpowder-musket', 20, 5);
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

    // fx-chicken — Magic Mastery Transmogrify: white circle body, yellow beak, two white wings
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xdddddd, 1);
    gfx.strokeCircle(24, 24, 22);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillEllipse(12, 16, 12, 8);
    gfx.fillEllipse(36, 16, 12, 8);
    gfx.lineStyle(2, 0xcccccc, 0.9);
    gfx.strokeEllipse(12, 16, 12, 8);
    gfx.strokeEllipse(36, 16, 12, 8);
    gfx.fillStyle(0xffcc00, 1);
    gfx.beginPath();
    gfx.moveTo(24, 26);
    gfx.lineTo(31, 30);
    gfx.lineTo(24, 34);
    gfx.closePath();
    gfx.fillPath();
    gfx.generateTexture('fx-chicken', 48, 48);
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

    // proj-tech-cruncher — 22×14 green triangle (Addicting Cruncher)
    gfx.fillStyle(0x33ff88, 1);
    gfx.beginPath();
    gfx.moveTo(20, 7);
    gfx.lineTo(2, 1);
    gfx.lineTo(2, 13);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, 0xaaffcc, 1);
    gfx.strokePath();
    gfx.generateTexture('proj-tech-cruncher', 22, 14);
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

    // ── Subterfuge element (abstract combined: slime + fate; id 'quantum') ───

    // elem-quantum — black circle with red trim: a shady suit with a red tie
    gfx.fillStyle(0x141414, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xcc2233, 1);
    gfx.strokeCircle(24, 24, 22);
    // white collar wedge
    gfx.fillStyle(0xdddddd, 1);
    gfx.fillTriangle(24, 18, 17, 10, 31, 10);
    // red tie
    gfx.fillStyle(0xcc2233, 1);
    gfx.fillTriangle(24, 18, 20, 26, 28, 26);
    gfx.fillTriangle(24, 34, 20, 26, 28, 26);
    // shoulder accents
    gfx.lineStyle(2, 0x882222, 0.9);
    gfx.beginPath();
    gfx.arc(24, 24, 14, Math.PI * 0.15, Math.PI * 0.85, false);
    gfx.strokePath();
    gfx.generateTexture('elem-quantum', 48, 48);
    gfx.clear();

    // proj-quantum — small red-black orb (kept for compatibility)
    gfx.fillStyle(0x1a1a1a, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xcc2233, 1);
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

    // proj-fate-burst — small orange circle (Burst card pellet)
    gfx.fillStyle(0xff8800, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0xffcc66, 1);
    gfx.strokeCircle(5, 5, 4);
    gfx.generateTexture('proj-fate-burst', 10, 10);
    gfx.clear();

    // proj-fate-barrier — small blue circle (Barrier card ring bullet)
    gfx.fillStyle(0x4488ff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.lineStyle(1, 0x99ccff, 1);
    gfx.strokeCircle(4, 4, 3);
    gfx.generateTexture('proj-fate-barrier', 8, 8);
    gfx.clear();

    // proj-fate-infect — small green spike (Infect card pellet)
    gfx.fillStyle(0x55cc55, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.lineStyle(1, 0x99ff99, 1);
    gfx.strokeCircle(5, 5, 4);
    gfx.generateTexture('proj-fate-infect', 10, 10);
    gfx.clear();

    // proj-fate-striker — chunky black orb with a dark outline (Striker card, very slow, 35 dmg)
    gfx.fillStyle(0x111118, 1);
    gfx.fillCircle(9, 9, 9);
    gfx.lineStyle(2, 0x444455, 1);
    gfx.strokeCircle(9, 9, 8);
    gfx.generateTexture('proj-fate-striker', 18, 18);
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

    // silence-stalker — 28×28 near-black circle that blends into the border fog
    gfx.fillStyle(0x0a0010, 1);
    gfx.fillCircle(14, 14, 13);
    gfx.lineStyle(1, 0x1e0a2a, 0.9);
    gfx.strokeCircle(14, 14, 13);
    gfx.generateTexture('silence-stalker', 28, 28);
    gfx.clear();

    // silence-stalker-eye — 14×9 white eye (tinted redder as the stalker matures)
    gfx.fillStyle(0xffffff, 1);
    gfx.fillEllipse(7, 4, 12, 7);
    gfx.fillStyle(0x220033, 1);
    gfx.fillCircle(7, 4, 2);
    gfx.generateTexture('silence-stalker-eye', 14, 9);
    gfx.clear();

    // silence-face-eye — 12×8 facing indicator eye (silence user's screen only)
    gfx.fillStyle(0xddddee, 0.95);
    gfx.fillEllipse(6, 4, 10, 6);
    gfx.fillStyle(0x110022, 1);
    gfx.fillCircle(7, 4, 2);
    gfx.generateTexture('silence-face-eye', 12, 8);
    gfx.clear();

    // silence-grabber — 44×44 lumpy black blob studded with eyes
    gfx.fillStyle(0x060009, 1);
    gfx.fillCircle(22, 22, 19);
    gfx.fillCircle(10, 14, 9);
    gfx.fillCircle(34, 12, 8);
    gfx.fillCircle(34, 33, 9);
    gfx.fillCircle(10, 32, 8);
    gfx.fillStyle(0xddddee, 1);
    gfx.fillEllipse(12, 15, 7, 4);
    gfx.fillEllipse(30, 12, 6, 4);
    gfx.fillEllipse(22, 24, 8, 5);
    gfx.fillEllipse(33, 32, 6, 4);
    gfx.fillEllipse(11, 31, 5, 3);
    gfx.fillStyle(0xaa0022, 1);
    gfx.fillCircle(12, 15, 1.5);
    gfx.fillCircle(30, 12, 1.5);
    gfx.fillCircle(22, 24, 2);
    gfx.fillCircle(33, 32, 1.5);
    gfx.fillCircle(11, 31, 1);
    gfx.generateTexture('silence-grabber', 44, 44);
    gfx.clear();

    // silence-hand — 32×32 gangly five-fingered hand
    gfx.fillStyle(0x0a0010, 1);
    gfx.fillEllipse(16, 20, 16, 13); // palm
    for (let fi = 0; fi < 5; fi++) {
      const fa = (-0.85 + fi * 0.42);
      const fx = 16 + Math.cos(fa - Math.PI / 2) * 13;
      const fy = 18 + Math.sin(fa - Math.PI / 2) * 13;
      gfx.lineStyle(3, 0x0a0010, 1);
      gfx.lineBetween(16, 18, fx, fy);
      gfx.fillCircle(fx, fy, 2);
    }
    gfx.generateTexture('silence-hand', 32, 32);
    gfx.clear();

    // silence-teeth — 220×220 feast circle: grey disc ringed with inward teeth
    gfx.fillStyle(0x333338, 0.5);
    gfx.fillCircle(110, 110, 108);
    gfx.lineStyle(3, 0x555560, 0.9);
    gfx.strokeCircle(110, 110, 108);
    gfx.fillStyle(0xddddcc, 0.95);
    for (let ti = 0; ti < 22; ti++) {
      const ta = (ti / 22) * Math.PI * 2;
      const ox = 110 + Math.cos(ta) * 104;
      const oy = 110 + Math.sin(ta) * 104;
      const ix = 110 + Math.cos(ta) * 82;
      const iy = 110 + Math.sin(ta) * 82;
      const px = Math.cos(ta + Math.PI / 2) * 6;
      const py = Math.sin(ta + Math.PI / 2) * 6;
      gfx.fillTriangle(ox - px, oy - py, ox + px, oy + py, ix, iy);
    }
    gfx.generateTexture('silence-teeth', 220, 220);
    gfx.clear();

    // silence-blob — 110×110 hallway horror: black mass of eyes, teeth and hands
    gfx.fillStyle(0x050008, 1);
    gfx.fillCircle(55, 58, 48);
    gfx.fillCircle(26, 36, 22);
    gfx.fillCircle(84, 34, 20);
    gfx.fillCircle(20, 80, 18);
    gfx.fillCircle(90, 82, 19);
    // Protruding hands (finger clusters at the rim)
    gfx.lineStyle(4, 0x050008, 1);
    for (let hi = 0; hi < 6; hi++) {
      const ha = -Math.PI / 2 + (hi - 2.5) * 0.5;
      const hx = 55 + Math.cos(ha) * 52;
      const hy = 58 + Math.sin(ha) * 52;
      for (let fj = -1; fj <= 1; fj++) {
        gfx.lineBetween(hx, hy, hx + Math.cos(ha + fj * 0.35) * 12, hy + Math.sin(ha + fj * 0.35) * 12);
      }
    }
    // Scattered mismatched eyes
    const blobEyes: Array<[number, number, number]> = [
      [34, 40, 6], [70, 34, 5], [52, 52, 8], [28, 70, 5], [82, 62, 6], [60, 80, 4], [44, 28, 4],
    ];
    for (const [ex, ey, er] of blobEyes) {
      gfx.fillStyle(0xddddee, 1);
      gfx.fillEllipse(ex, ey, er * 2, er * 1.3);
      gfx.fillStyle(0xaa0022, 1);
      gfx.fillCircle(ex, ey, Math.max(1.5, er * 0.4));
    }
    // Gaping mouth full of teeth
    gfx.fillStyle(0x000000, 1);
    gfx.fillEllipse(55, 92, 44, 20);
    gfx.fillStyle(0xddddcc, 1);
    for (let mt = 0; mt < 7; mt++) {
      const mx = 37 + mt * 6;
      gfx.fillTriangle(mx, 84, mx + 5, 84, mx + 2.5, 92);
      gfx.fillTriangle(mx, 101, mx + 5, 101, mx + 2.5, 93);
    }
    gfx.generateTexture('silence-blob', 110, 110);
    gfx.clear();

    // silence-spit — 12×12 grey-green glob
    gfx.fillStyle(0x7a8a66, 1);
    gfx.fillCircle(6, 6, 5);
    gfx.fillStyle(0x9aaa88, 0.8);
    gfx.fillCircle(4, 4, 2);
    gfx.generateTexture('silence-spit', 12, 12);
    gfx.clear();

    // silence-noise-0/1/2 — 20×20 static frames for hallucination flicker
    for (let ni = 0; ni < 3; ni++) {
      for (let px = 0; px < 10; px++) {
        for (let py = 0; py < 10; py++) {
          const v = Math.random();
          gfx.fillStyle(v > 0.5 ? 0xffffff : 0x000000, 0.25 + Math.random() * 0.5);
          gfx.fillRect(px * 2, py * 2, 2, 2);
        }
      }
      gfx.generateTexture(`silence-noise-${ni}`, 20, 20);
      gfx.clear();
    }

    // silence-big-eye — 64×40 bloodshot eye for the hallucination eye-screen
    gfx.fillStyle(0xddddee, 1);
    gfx.fillEllipse(32, 20, 60, 34);
    gfx.lineStyle(1, 0xaa4444, 0.8);
    for (let vi = 0; vi < 6; vi++) {
      const va = (vi / 6) * Math.PI * 2;
      gfx.lineBetween(32 + Math.cos(va) * 10, 20 + Math.sin(va) * 6, 32 + Math.cos(va) * 27, 20 + Math.sin(va) * 15);
    }
    gfx.fillStyle(0x881122, 1);
    gfx.fillCircle(32, 20, 9);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(32, 20, 4);
    gfx.generateTexture('silence-big-eye', 64, 40);
    gfx.clear();

    // silence-seeker — 48×36 mutated watcher: lumpy body, two big black wings, red glare
    gfx.fillStyle(0x050008, 1);
    // wings: layered feather triangles fanning out from the shoulders
    for (let wi = 0; wi < 4; wi++) {
      const wy = 8 + wi * 5;
      gfx.fillTriangle(20, 16, 2, wy, 12, 22);       // left wing feathers
      gfx.fillTriangle(28, 16, 46, wy, 36, 22);      // right wing feathers
    }
    // grotesque body: off-center lumps
    gfx.fillStyle(0x0a0010, 1);
    gfx.fillCircle(24, 20, 12);
    gfx.fillCircle(18, 14, 7);
    gfx.fillCircle(31, 15, 6);
    gfx.fillCircle(24, 29, 6);
    gfx.lineStyle(1, 0x2a0a3a, 0.9);
    gfx.strokeCircle(24, 20, 12);
    // the red glare
    gfx.fillStyle(0xddddee, 1);
    gfx.fillEllipse(24, 19, 13, 8);
    gfx.fillStyle(0xff1122, 1);
    gfx.fillCircle(24, 19, 3.5);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(24, 19, 1.5);
    // a few stray teeth under the eye
    gfx.fillStyle(0xddddcc, 1);
    gfx.fillTriangle(18, 26, 21, 26, 19.5, 30);
    gfx.fillTriangle(23, 27, 26, 27, 24.5, 31);
    gfx.fillTriangle(28, 26, 31, 26, 29.5, 30);
    gfx.generateTexture('silence-seeker', 48, 36);
    gfx.clear();

    // silence-vulture — 48×46 terrifying smiling bird: hunched shape, dead eyes, too-wide grin
    gfx.fillStyle(0x0a0410, 1);
    gfx.fillEllipse(24, 30, 34, 26);                 // hunched body
    gfx.fillCircle(24, 14, 11);                      // head
    // ragged wing edges
    for (let vi = 0; vi < 5; vi++) {
      gfx.fillTriangle(8 + vi * 8, 40, 12 + vi * 8, 40, 10 + vi * 8, 46);
    }
    // scrawny neck ring
    gfx.lineStyle(2, 0x2a1030, 0.9);
    gfx.strokeCircle(24, 14, 11);
    // dead white eyes — small pupils that don't quite point the same way
    gfx.fillStyle(0xeeeeee, 1);
    gfx.fillCircle(19, 11, 4);
    gfx.fillCircle(29, 11, 4);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(20, 12, 1.4);
    gfx.fillCircle(28, 10, 1.4);
    // the smile: a white crescent far too wide for the head
    gfx.fillStyle(0xddddcc, 1);
    gfx.slice(24, 16, 9, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165), false);
    gfx.fillPath();
    gfx.lineStyle(1, 0x0a0410, 1);
    for (let ti = 0; ti < 5; ti++) {
      const tx2 = 17 + ti * 3.5;
      gfx.lineBetween(tx2, 17, tx2, 23);
    }
    gfx.generateTexture('silence-vulture', 48, 46);
    gfx.clear();

    // silence-striker — 56×56 werewolf horror: jagged fur silhouette, ears, claws, burning eyes
    gfx.fillStyle(0x0c0612, 1);
    gfx.fillCircle(28, 30, 20);                      // torso
    // jagged fur all around the rim
    for (let fi = 0; fi < 16; fi++) {
      const fa = (fi / 16) * Math.PI * 2;
      const bx = 28 + Math.cos(fa) * 19;
      const by = 30 + Math.sin(fa) * 19;
      const tx3 = 28 + Math.cos(fa + 0.09) * 27;
      const ty3 = 30 + Math.sin(fa + 0.09) * 27;
      const cx3 = 28 + Math.cos(fa - 0.14) * 19;
      const cy3 = 30 + Math.sin(fa - 0.14) * 19;
      gfx.fillTriangle(bx, by, tx3, ty3, cx3, cy3);
    }
    // ears
    gfx.fillTriangle(16, 12, 22, 18, 12, 22);
    gfx.fillTriangle(40, 12, 34, 18, 44, 22);
    // snout + bared teeth
    gfx.fillStyle(0x140a1c, 1);
    gfx.fillEllipse(28, 38, 18, 12);
    gfx.fillStyle(0xddddcc, 1);
    for (let mt = 0; mt < 5; mt++) {
      const mx = 21 + mt * 3.6;
      gfx.fillTriangle(mx, 36, mx + 3, 36, mx + 1.5, 41);
    }
    // claws poking out both sides
    gfx.fillStyle(0xccccdd, 1);
    gfx.fillTriangle(6, 32, 12, 30, 10, 37);
    gfx.fillTriangle(4, 38, 10, 36, 9, 43);
    gfx.fillTriangle(50, 32, 44, 30, 46, 37);
    gfx.fillTriangle(52, 38, 46, 36, 47, 43);
    // burning eyes
    gfx.fillStyle(0xff1122, 1);
    gfx.fillEllipse(21, 26, 7, 4);
    gfx.fillEllipse(35, 26, 7, 4);
    gfx.fillStyle(0xffee88, 1);
    gfx.fillCircle(21, 26, 1.2);
    gfx.fillCircle(35, 26, 1.2);
    gfx.generateTexture('silence-striker', 56, 56);
    gfx.clear();

    // silence-eyeball — 16×16 detached boggle eye on its stalk stump
    gfx.fillStyle(0xddddee, 1);
    gfx.fillCircle(8, 8, 7);
    gfx.lineStyle(1, 0xaa4455, 0.9);
    gfx.strokeCircle(8, 8, 7);
    gfx.fillStyle(0xaa1122, 1);
    gfx.fillCircle(8, 8, 3.4);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(8, 8, 1.6);
    gfx.generateTexture('silence-eyeball', 16, 16);
    gfx.clear();

    // silence-eye-shot — 8×8 red bolt
    gfx.fillStyle(0xff1133, 1);
    gfx.fillCircle(4, 4, 3.4);
    gfx.fillStyle(0xffaaaa, 0.9);
    gfx.fillCircle(3, 3, 1.3);
    gfx.generateTexture('silence-eye-shot', 8, 8);
    gfx.clear();

    // silence-midget — 22×22 pallid biter: round body, teeth crammed onto its leading edge
    gfx.fillStyle(0xcfc4bb, 1);
    gfx.fillCircle(11, 11, 9);
    gfx.lineStyle(1, 0x8a7a70, 0.9);
    gfx.strokeCircle(11, 11, 9);
    // black maw on the right side (sprite is rotated to face its meal)
    gfx.fillStyle(0x1a0508, 1);
    gfx.slice(11, 11, 9, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    gfx.fillPath();
    // ferocious interlocking teeth
    gfx.fillStyle(0xffffff, 1);
    for (let ti = 0; ti < 4; ti++) {
      const ta2 = Phaser.Math.DegToRad(-45 + ti * 30);
      const ox2 = 11 + Math.cos(ta2) * 9;
      const oy2 = 11 + Math.sin(ta2) * 9;
      const ix2 = 11 + Math.cos(ta2) * 3;
      const iy2 = 11 + Math.sin(ta2) * 3;
      gfx.fillTriangle(ox2, oy2 - 2, ox2, oy2 + 2, ix2, iy2);
    }
    // one tiny hateful eye
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(6, 8, 1.6);
    gfx.generateTexture('silence-midget', 22, 22);
    gfx.clear();

    // silence-blood — 6×6 pixelated blood chunk
    gfx.fillStyle(0x7a0d14, 1);
    gfx.fillRect(0, 0, 6, 6);
    gfx.fillStyle(0xa01820, 1);
    gfx.fillRect(0, 0, 3, 3);
    gfx.fillStyle(0x550a10, 1);
    gfx.fillRect(3, 3, 3, 3);
    gfx.generateTexture('silence-blood', 6, 6);
    gfx.clear();

    // silence-flesh-eye — 26×26 arena decal: an eye set into puckered flesh
    gfx.fillStyle(0x8a3040, 0.95);
    gfx.fillCircle(13, 13, 12);
    gfx.fillStyle(0xa54a58, 0.9);
    gfx.fillCircle(13, 13, 9);
    gfx.fillStyle(0xddddee, 1);
    gfx.fillEllipse(13, 13, 13, 8);
    gfx.fillStyle(0x226622, 1);
    gfx.fillCircle(13, 13, 3.2);
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(13, 13, 1.5);
    gfx.generateTexture('silence-flesh-eye', 26, 26);
    gfx.clear();

    // silence-flesh-teeth — 28×18 arena decal: a gum ridge of crooked teeth
    gfx.fillStyle(0x8a3040, 0.95);
    gfx.fillEllipse(14, 12, 26, 11);
    gfx.fillStyle(0xe8e2d0, 1);
    for (let ti = 0; ti < 5; ti++) {
      const tx4 = 4 + ti * 5;
      gfx.fillTriangle(tx4, 11, tx4 + 4, 11, tx4 + 2, 3 + (ti % 2) * 2);
    }
    gfx.generateTexture('silence-flesh-teeth', 28, 18);
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

    // ── Invasion husk texture ───────────────────────────────────────

    // husk — 48×48 rotten-green zombie circle, vacant eyes, crooked mouth
    gfx.fillStyle(0x3e5a22, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.lineStyle(3, 0x1d2e0f, 1);
    gfx.strokeCircle(24, 24, 20);
    gfx.fillStyle(0x5a7a35, 0.6);
    gfx.fillCircle(19, 18, 8); // decayed blotch
    gfx.fillStyle(0x0e1607, 1);
    gfx.fillCircle(17, 19, 4);
    gfx.fillCircle(31, 19, 4);
    gfx.lineStyle(2, 0x0e1607, 1);
    gfx.lineBetween(16, 31, 22, 33);
    gfx.lineBetween(22, 33, 27, 30);
    gfx.lineBetween(27, 30, 33, 32);
    gfx.generateTexture('husk', 48, 48);
    gfx.clear();

    // One husk body per invasion variant, drawn from the variant's own colour.
    // Dark bodies get a lighter outline (and vice versa) so the silhouette
    // stays legible against the arena floor at either extreme.
    for (const variant of HUSK_VARIANTS) {
      const base = Phaser.Display.Color.IntegerToColor(variant.color);
      const dark = base.red * 0.299 + base.green * 0.587 + base.blue * 0.114 < 90;
      const outline = dark ? lighten(variant.color, 0.45) : darken(variant.color, 0.42);
      const blotch  = lighten(variant.color, dark ? 0.60 : 0.25);
      const feature = dark ? lighten(variant.color, 0.70) : darken(variant.color, 0.22);

      gfx.fillStyle(variant.color, 1);
      gfx.fillCircle(24, 24, 20);
      gfx.lineStyle(3, outline, 1);
      gfx.strokeCircle(24, 24, 20);
      gfx.fillStyle(blotch, 0.6);
      gfx.fillCircle(19, 18, 8); // decayed blotch
      gfx.fillStyle(feature, 1);
      gfx.fillCircle(17, 19, 4);
      gfx.fillCircle(31, 19, 4);
      gfx.lineStyle(2, feature, 1);
      gfx.lineBetween(16, 31, 22, 33);
      gfx.lineBetween(22, 33, 27, 30);
      gfx.lineBetween(27, 30, 33, 32);
      gfx.generateTexture(huskTextureKey(variant), 48, 48);
      gfx.clear();
    }

    // Soul — grave headstone (rounded-top slab + a small mound of dirt)
    gfx.fillStyle(0x776688, 1);
    gfx.fillCircle(16, 24, 12);
    gfx.fillRect(4, 24, 24, 22);
    gfx.lineStyle(2, 0xccaaff, 0.8);
    gfx.strokeCircle(16, 24, 12);
    gfx.strokeRect(4, 24, 24, 22);
    gfx.fillStyle(0x3a2a44, 1);
    gfx.fillEllipse(16, 47, 30, 8);
    gfx.generateTexture('soul-grave', 32, 52);
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

    // proj-tinker-bullet — small grey square bullet
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillRect(0, 0, 8, 8);
    gfx.lineStyle(1, 0xffffff, 0.8);
    gfx.strokeRect(0, 0, 8, 8);
    gfx.generateTexture('proj-tinker-bullet', 8, 8);
    gfx.clear();

    // proj-tinker-rocket — orange elongated oval rocket
    gfx.fillStyle(0xff6600, 1);
    gfx.fillEllipse(6, 10, 12, 20);
    gfx.fillStyle(0xffcc00, 1);
    gfx.fillCircle(6, 4, 4);
    gfx.lineStyle(1, 0xff9933, 1);
    gfx.strokeEllipse(6, 10, 12, 20);
    gfx.generateTexture('proj-tinker-rocket', 12, 20);
    gfx.clear();

    // Golf ball — white sphere with grey dimples
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(20, 20, 20);
    gfx.lineStyle(1, 0xcccccc);
    gfx.strokeCircle(20, 20, 20);
    gfx.fillStyle(0xaaaaaa);
    gfx.fillCircle(12, 14, 2); gfx.fillCircle(20, 10, 2); gfx.fillCircle(28, 14, 2);
    gfx.fillCircle(14, 24, 2); gfx.fillCircle(26, 24, 2); gfx.fillCircle(20, 30, 2);
    gfx.generateTexture('proj-golf-ball', 40, 40);

    // Golf ball starred — black, 25% smaller
    gfx.clear();
    gfx.fillStyle(0x111111);
    gfx.fillCircle(15, 15, 15);
    gfx.lineStyle(1, 0x444444);
    gfx.strokeCircle(15, 15, 15);
    gfx.fillStyle(0x444444);
    gfx.fillCircle(9, 11, 1.5); gfx.fillCircle(15, 7, 1.5); gfx.fillCircle(21, 11, 1.5);
    gfx.fillCircle(11, 19, 1.5); gfx.fillCircle(19, 19, 1.5); gfx.fillCircle(15, 23, 1.5);
    gfx.generateTexture('proj-golf-ball-starred', 30, 30);
    gfx.clear();

    gfx.destroy();

    this.scene.start('TitleScene');
  }
}
