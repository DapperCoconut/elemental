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

    // Air element texture — a ball of compressed air: storm-dark rim, a body that pales
    // toward the middle where the pressure is highest, three sheared bands curling across
    // the face, and a hard specular glint. Radius stays 22 to match the physics body.
    gfx.clear();
    gfx.fillStyle(0x24303c, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x445668, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.fillStyle(0x6688aa, 1);
    gfx.fillCircle(24, 25, 17);
    gfx.fillStyle(0x88aacc, 1);
    gfx.fillCircle(24, 26, 13);
    // Compressed heart, brightest where the air is packed tightest.
    gfx.fillStyle(0xaaddff, 1);
    gfx.fillEllipse(24, 28, 19, 11);
    gfx.fillStyle(0xccddff, 0.85);
    gfx.fillEllipse(24, 30, 12, 6);
    // Shear bands curling across the face — the tell that the whole thing is turning.
    gfx.lineStyle(2.2, 0xe4f2ff, 0.5);
    for (let i = 0; i < 3; i++) {
      gfx.beginPath();
      gfx.arc(24, 24 + i * 3 - 3, 9 + i * 4, Math.PI * 0.15, Math.PI * 0.85);
      gfx.strokePath();
    }
    // Rim light along the top edge sells the sphere.
    gfx.lineStyle(2.5, 0x88aacc, 0.9);
    gfx.strokeCircle(24, 24, 21);
    gfx.lineStyle(2, 0xe4f2ff, 0.6);
    gfx.beginPath();
    gfx.arc(24, 24, 19, Math.PI * 1.12, Math.PI * 1.88);
    gfx.strokePath();
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillEllipse(17.5, 16, 9, 5.5);
    gfx.generateTexture('elem-air', 48, 48);

    // Life element texture — a seed pod swollen with sap: bark rim, deep green flesh, a
    // young leaf unfurling across the face and a wet glint. Radius stays 22 to match the
    // physics body.
    gfx.clear();
    gfx.fillStyle(0x2a1d12, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x1d4718, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.fillStyle(0x2d6b28, 1);
    gfx.fillCircle(24, 25, 17);
    gfx.fillStyle(0x44aa3a, 1);
    gfx.fillCircle(24, 26.5, 13);
    // Sap pooling low, where the light passes through the thinnest part of the pod.
    gfx.fillStyle(0x5ec44a, 1);
    gfx.fillEllipse(24, 31, 20, 10);
    gfx.fillStyle(0x8fdd5a, 0.85);
    gfx.fillEllipse(24, 33, 13, 5.5);
    // The leaf itself, drawn as a lens across the middle with a midrib down it.
    gfx.fillStyle(0x8fdd5a, 0.75);
    gfx.fillEllipse(24, 22, 26, 12);
    gfx.fillStyle(0xc8f59a, 0.55);
    gfx.fillEllipse(24, 21, 18, 7);
    gfx.lineStyle(1.6, 0x1d4718, 0.6);
    gfx.beginPath();
    gfx.moveTo(12, 22);
    gfx.lineTo(36, 22);
    gfx.strokePath();
    // Rim light along the top edge sells the sphere.
    gfx.lineStyle(2.5, 0x5ec44a, 0.9);
    gfx.strokeCircle(24, 24, 21);
    gfx.lineStyle(2, 0xc8f59a, 0.6);
    gfx.beginPath();
    gfx.arc(24, 24, 19, Math.PI * 1.12, Math.PI * 1.88);
    gfx.strokePath();
    gfx.fillStyle(0xffffff, 0.85);
    gfx.fillEllipse(17.5, 16, 8, 5);
    gfx.generateTexture('elem-life', 48, 48);

    // Petal projectile — a five-petal blossom rather than a dot, so it reads as thrown
    // foliage from any angle (petals never get a rotation set on them).
    gfx.clear();
    gfx.fillStyle(0x2d6b28, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      gfx.fillEllipse(6 + Math.cos(a) * 2.6, 6 + Math.sin(a) * 2.6, 6, 4.4);
    }
    gfx.fillStyle(0x5ec44a, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      gfx.fillEllipse(6 + Math.cos(a) * 2.4, 6 + Math.sin(a) * 2.4, 4.8, 3.4);
    }
    gfx.fillStyle(0xc8f59a, 1);
    gfx.fillCircle(6, 6, 2.1);
    gfx.fillStyle(0xffe98a, 1);
    gfx.fillCircle(6, 6, 1.1);
    gfx.generateTexture('proj-life', 12, 12);

    // Sakura projectile — the same blossom drawn in whites and greys so the pink tint
    // applied at spawn multiplies through cleanly instead of muddying a coloured base.
    gfx.clear();
    gfx.fillStyle(0x888888, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      gfx.fillEllipse(6 + Math.cos(a) * 2.6, 6 + Math.sin(a) * 2.6, 6, 4.4);
    }
    gfx.fillStyle(0xffffff, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      gfx.fillEllipse(6 + Math.cos(a) * 2.4, 6 + Math.sin(a) * 2.4, 4.8, 3.4);
    }
    gfx.fillStyle(0xdddddd, 1);
    gfx.fillCircle(6, 6, 2.1);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(6, 6, 1.1);
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

    // Earth element texture — a boulder rather than a brown disc: dark shell, stone body,
    // stacked strata bands, and one lit facet up-and-left where the light falls. Every point
    // stays inside radius 23.5 of (24,24); Fighter hardcodes a radius-22 body in 48×48.
    gfx.clear();
    gfx.fillStyle(0x342b20);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x5b4c39);
    gfx.fillCircle(24, 24, 20);
    // Strata: two bands of lighter rock cutting across the body.
    gfx.fillStyle(0x6d5c45);
    gfx.fillTriangle(5, 20, 43, 14, 43, 24);
    gfx.fillTriangle(5, 20, 43, 24, 6, 28);
    gfx.fillStyle(0x887755);
    gfx.fillTriangle(8, 32, 40, 30, 38, 38);
    gfx.fillTriangle(8, 32, 38, 38, 12, 39);
    // Lit facet: a flat plane catching the light off the top-left shoulder.
    gfx.fillStyle(0xa8926c);
    gfx.fillTriangle(10, 17, 26, 8, 33, 17);
    gfx.fillTriangle(10, 17, 33, 17, 17, 23);
    // Crevices, and a hard specular pip on the high edge.
    gfx.lineStyle(2, 0x1c1409, 0.85);
    gfx.beginPath();
    gfx.moveTo(17, 23); gfx.lineTo(24, 30); gfx.lineTo(20, 40);
    gfx.moveTo(24, 30); gfx.lineTo(36, 33);
    gfx.strokePath();
    gfx.lineStyle(2, 0xccaa66, 0.8);
    gfx.beginPath();
    gfx.moveTo(11, 18); gfx.lineTo(26, 9.5);
    gfx.strokePath();
    gfx.fillStyle(0xe3d2a8, 0.95);
    gfx.fillCircle(20, 14, 2.2);
    gfx.generateTexture('elem-earth', 48, 48);

    // Oil element texture: a steel drum end-on — crude body, chrome hoop bands, a hazard
    // stripe and the interference film sitting on the surface. Everything stays inside the
    // radius-23.5 the Fighter body assumes.
    gfx.clear();
    gfx.fillStyle(0x1a1108);
    gfx.fillCircle(24, 24, 22);
    // Hoop bands running across the drum, kept as chords inside the radius-22 body.
    gfx.fillStyle(0x2b1c0c);
    gfx.fillRect(6, 13, 36, 7);
    gfx.fillRect(6, 28, 36, 7);
    gfx.lineStyle(2, 0x6b7480, 0.85);
    gfx.beginPath();
    gfx.moveTo(6, 13); gfx.lineTo(42, 13);
    gfx.moveTo(6, 20); gfx.lineTo(42, 20);
    gfx.moveTo(6, 28); gfx.lineTo(42, 28);
    gfx.moveTo(6, 35); gfx.lineTo(42, 35);
    gfx.strokePath();
    // Hazard stripe down the middle of the drum.
    gfx.fillStyle(0xffaa00, 0.9);
    gfx.fillRect(20, 4, 8, 40);
    gfx.fillStyle(0x07050a, 0.9);
    for (let i = 0; i < 5; i++) gfx.fillRect(20, 6 + i * 8, 8, 3.5);
    // Iridescent film, then a hard specular pip on the high shoulder.
    gfx.fillStyle(0x7a4fd0, 0.4);
    gfx.fillEllipse(17, 15, 20, 9);
    gfx.fillStyle(0x2fd6c0, 0.35);
    gfx.fillEllipse(15, 13, 12, 5);
    gfx.fillStyle(0xb8c4d0, 0.9);
    gfx.fillCircle(15, 13, 2.4);
    gfx.lineStyle(3, 0x8a4f14);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-oil', 48, 48);

    // Oil drone laser bolt: gold body drawn out along its flight, white-hot core.
    gfx.clear();
    gfx.fillStyle(0xc47a2a, 0.55);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0xffaa00);
    gfx.fillCircle(5, 5, 3.6);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(4.4, 4.4, 1.6);
    gfx.generateTexture('proj-oil', 10, 10);

    // Shadow element body: an absence with a lit rim. Layered dark → darker toward the middle
    // (the inverse of every other element here), with tendrils groping out of the void and a
    // single cold specular pip on the high shoulder so it still reads as a solid object.
    gfx.clear();
    gfx.fillStyle(0x4a1170, 0.85);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x330055);
    gfx.fillCircle(24, 24, 19);
    gfx.fillStyle(0x1e0033);
    gfx.fillCircle(24, 23, 15);
    gfx.fillStyle(0x08000f);
    gfx.fillCircle(24, 22, 10);
    // Tendrils reaching from the core toward the rim.
    gfx.fillStyle(0x120020, 0.95);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const inner = 6;
      const outer = 20;
      const w = 0.2;
      gfx.beginPath();
      gfx.moveTo(24 + Math.cos(a - w) * inner, 24 + Math.sin(a - w) * inner);
      gfx.lineTo(24 + Math.cos(a + 0.25) * outer, 24 + Math.sin(a + 0.25) * outer);
      gfx.lineTo(24 + Math.cos(a + w) * inner, 24 + Math.sin(a + w) * inner);
      gfx.closePath();
      gfx.fillPath();
    }
    gfx.fillStyle(0xcc88ff, 0.55);
    gfx.fillCircle(17, 16, 3);
    gfx.fillStyle(0xe6ccff, 0.9);
    gfx.fillCircle(16.5, 15.5, 1.5);
    gfx.lineStyle(3, 0xaa44ff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-shadow', 48, 48);

    // Ice element body: a frozen orb with internal facets. Layered deep → pale toward the top
    // left, cleaved by two hard facet lines, ringed by rime spikes and finished with a small,
    // sharp specular pip — ice takes a much tighter highlight than water does.
    gfx.clear();
    gfx.fillStyle(0x1a4a7a);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x2d6f9e);
    gfx.fillCircle(24, 24, 19);
    gfx.fillStyle(0x4fa3d9);
    gfx.fillCircle(23, 22, 15);
    gfx.fillStyle(0x88ccff, 0.9);
    gfx.fillCircle(21, 20, 10);
    // Cleavage planes running across the orb.
    gfx.fillStyle(0xcceeff, 0.55);
    gfx.beginPath();
    gfx.moveTo(8, 20); gfx.lineTo(26, 6); gfx.lineTo(31, 14); gfx.lineTo(13, 30);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0xe6f7ff, 0.4);
    gfx.beginPath();
    gfx.moveTo(28, 40); gfx.lineTo(40, 26); gfx.lineTo(43, 31); gfx.lineTo(32, 43);
    gfx.closePath(); gfx.fillPath();
    // Rime spikes seated on the rim.
    gfx.fillStyle(0xcceeff, 0.85);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const r0 = 17, r1 = 22.8, w = 0.11;
      gfx.beginPath();
      gfx.moveTo(24 + Math.cos(a - w) * r0, 24 + Math.sin(a - w) * r0);
      gfx.lineTo(24 + Math.cos(a) * r1, 24 + Math.sin(a) * r1);
      gfx.lineTo(24 + Math.cos(a + w) * r0, 24 + Math.sin(a + w) * r0);
      gfx.closePath(); gfx.fillPath();
    }
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(17, 16, 2.6);
    gfx.lineStyle(3, 0xcceeff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-ice', 48, 48);

    // Ice spike projectile: a faceted shard, not a bead. Broad shoulder near the base and a
    // long point, with a bright inner facet down one flank.
    gfx.clear();
    gfx.fillStyle(0x2d6f9e);
    gfx.beginPath();
    gfx.moveTo(6, 0); gfx.lineTo(11, 4.5); gfx.lineTo(7.5, 12); gfx.lineTo(1.5, 5.5);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0x88ccff);
    gfx.beginPath();
    gfx.moveTo(6, 1.4); gfx.lineTo(9.6, 5); gfx.lineTo(7, 10.6); gfx.lineTo(3, 5.6);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0xe6f7ff, 0.95);
    gfx.beginPath();
    gfx.moveTo(6, 2.2); gfx.lineTo(7.6, 5); gfx.lineTo(6.4, 9); gfx.lineTo(4.6, 5.2);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(5.2, 4, 1.1);
    gfx.generateTexture('proj-ice', 12, 12);

    // Growth element body: a cell. Layered membrane → cytoplasm → nucleus, with buds pushing
    // out against the wall from inside, vacuoles catching the light, and a wet sheen up top.
    gfx.clear();
    gfx.fillStyle(0x1a3a10);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x3f7a1f);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0x557733, 0.9);
    gfx.fillCircle(24, 24, 16);
    // Buds swelling against the inside of the membrane.
    gfx.fillStyle(0x88bb22, 0.95);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      gfx.fillCircle(24 + Math.cos(a) * 13, 24 + Math.sin(a) * 13, 5.5);
    }
    // Nucleus, off-centre so the cell doesn't read as a target reticle.
    gfx.fillStyle(0xaadd44);
    gfx.fillCircle(21, 22, 8);
    gfx.fillStyle(0x14290c, 0.9);
    gfx.fillCircle(21, 22, 4.2);
    gfx.fillStyle(0xccee88, 0.85);
    gfx.fillCircle(19.5, 20.5, 1.8);
    // Vacuoles.
    gfx.fillStyle(0xddffcc, 0.5);
    gfx.fillCircle(32, 31, 3.4);
    gfx.fillCircle(15, 32, 2.4);
    // Wet sheen across the upper-left of the membrane.
    gfx.fillStyle(0xddffcc, 0.28);
    gfx.fillEllipse(17, 15, 16, 8);
    gfx.lineStyle(3, 0xaadd44);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-growth', 48, 48);

    // Crystal element body: a cut gem seen face-on. Flat facets radiating from an off-centre
    // table, each shaded differently so the sphere reads as faceted rather than round, with a
    // violet/gold refraction split at the rim and one hard specular pip on the table.
    gfx.clear();
    gfx.fillStyle(0x1a3350);
    gfx.fillCircle(24, 24, 22);
    // Refraction fringes bleeding off opposite rims.
    gfx.fillStyle(0xaa44ff, 0.35);
    gfx.fillCircle(21, 24, 20);
    gfx.fillStyle(0xffcc44, 0.28);
    gfx.fillCircle(27, 24, 20);
    // Eight kite facets around the table, alternating shade.
    const cutShades = [0x2b6ea8, 0x66bbdd, 0x88ccff, 0x2b6ea8, 0x66bbdd, 0x88ccff, 0x2b6ea8, 0x66bbdd];
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 - 0.4;
      const a1 = ((i + 1) / 8) * Math.PI * 2 - 0.4;
      gfx.fillStyle(cutShades[i], 0.95);
      gfx.beginPath();
      gfx.moveTo(21, 21);
      gfx.lineTo(24 + Math.cos(a0) * 21, 24 + Math.sin(a0) * 21);
      gfx.lineTo(24 + Math.cos(a1) * 21, 24 + Math.sin(a1) * 21);
      gfx.closePath();
      gfx.fillPath();
    }
    // Table facet, off-centre so the gem never reads as a target reticle.
    gfx.fillStyle(0xd8f4ff, 0.92);
    gfx.beginPath();
    gfx.moveTo(21, 12); gfx.lineTo(31, 20); gfx.lineTo(26, 30); gfx.lineTo(14, 25);
    gfx.closePath(); gfx.fillPath();
    gfx.lineStyle(1.2, 0x88eeff, 0.9);
    gfx.strokePath();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(20, 18, 2.4);
    gfx.lineStyle(3, 0xaaeeff);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-crystal', 48, 48);

    // Crystal kite shard projectile (kite/deltoid shape — NOT a symmetric diamond: asymmetric
    // top/bottom, symmetric left/right). Now cut: a violet/gold refraction split behind the
    // body, a girdle break across the waist, and a bright inner table down the spine.
    gfx.clear();
    const kite = (inset: number, y0: number, y1: number) => {
      gfx.beginPath();
      gfx.moveTo(21, y0);
      gfx.lineTo(36 - inset, 18);
      gfx.lineTo(21, y1);
      gfx.lineTo(6 + inset, 18);
      gfx.closePath();
      gfx.fillPath();
    };
    gfx.fillStyle(0xaa44ff, 0.5);
    gfx.beginPath();
    gfx.moveTo(19, 0); gfx.lineTo(34, 18); gfx.lineTo(19, 48); gfx.lineTo(4, 18);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0xffcc44, 0.5);
    gfx.beginPath();
    gfx.moveTo(23, 0); gfx.lineTo(38, 18); gfx.lineTo(23, 48); gfx.lineTo(8, 18);
    gfx.closePath(); gfx.fillPath();
    gfx.fillStyle(0x2b6ea8);
    kite(0, 0, 48);
    gfx.fillStyle(0x88eeff);
    kite(4, 4, 42);
    gfx.fillStyle(0xd8f4ff, 0.95);
    kite(10, 9, 34);
    // Girdle break across the waist, and the spine down the middle.
    gfx.lineStyle(1.5, 0xffffff, 0.85);
    gfx.beginPath();
    gfx.moveTo(6, 18); gfx.lineTo(36, 18);
    gfx.moveTo(21, 0); gfx.lineTo(21, 48);
    gfx.strokePath();
    gfx.lineStyle(3, 0xffffff);
    gfx.beginPath();
    gfx.moveTo(21, 0); gfx.lineTo(36, 18); gfx.lineTo(21, 48); gfx.lineTo(6, 18);
    gfx.closePath();
    gfx.strokePath();
    gfx.generateTexture('proj-crystal-kite', 42, 48);

    // Soul element texture — a shade: crypt-dark rim, amethyst body, a hollow socket band and
    // the pale core showing through, with the light caught high-left the way every element's
    // body is lit here.
    gfx.clear();
    gfx.fillStyle(0x2e1440);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x552266);
    gfx.fillCircle(24, 25, 19.5);
    gfx.fillStyle(0x7733aa);
    gfx.fillCircle(23, 23, 16);
    // The band a shade's face sits in — two sockets and the mouth below them.
    gfx.fillStyle(0x140820, 0.75);
    gfx.fillEllipse(24, 20, 30, 11);
    gfx.fillStyle(0x9955ee);
    gfx.fillCircle(22, 27, 10.5);
    gfx.fillStyle(0xccaaff, 0.9);
    gfx.fillCircle(20, 26, 6);
    gfx.fillStyle(0xeeddff);
    gfx.fillCircle(18, 24, 3.2);
    gfx.lineStyle(2.5, 0xccaaff, 0.85);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(1.4, 0xeeddff, 0.6);
    gfx.beginPath();
    gfx.arc(24, 24, 18, Math.PI * 1.05, Math.PI * 1.6);
    gfx.strokePath();
    gfx.generateTexture('elem-soul', 48, 48);

    // Soul bolt projectile (small pale orb for ghoul shots)
    gfx.clear();
    gfx.fillStyle(0x552266);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0x9955ee);
    gfx.fillCircle(5, 5, 3.8);
    gfx.fillStyle(0xccaaff);
    gfx.fillCircle(4.4, 4.4, 2.2);
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(3.6, 3.6, 1);
    gfx.generateTexture('proj-soul-bolt', 10, 10);

    // Hunt element texture — hide over dried blood, with three claw gouges torn across the
    // body and the powder-heat showing through them.
    gfx.clear();
    gfx.fillStyle(0x3d1a0e);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x6b2412);
    gfx.fillCircle(24, 25, 19);
    gfx.fillStyle(0xaa3300);
    gfx.fillCircle(23, 23, 15.5);
    // Three raked gouges, each a dark cut with a hot lip below it.
    for (let i = 0; i < 3; i++) {
      const ox = -7 + i * 7;
      gfx.lineStyle(3.4, 0x2a0f06, 0.95);
      gfx.beginPath();
      gfx.moveTo(24 + ox - 5, 11); gfx.lineTo(24 + ox + 2, 24); gfx.lineTo(24 + ox - 3, 37);
      gfx.strokePath();
      gfx.lineStyle(1.3, 0xff6600, 0.9);
      gfx.beginPath();
      gfx.moveTo(24 + ox - 3.6, 12); gfx.lineTo(24 + ox + 3.4, 24); gfx.lineTo(24 + ox - 1.6, 36);
      gfx.strokePath();
    }
    gfx.fillStyle(0xffaa44, 0.55);
    gfx.fillCircle(17, 17, 5.5);
    gfx.lineStyle(2.5, 0xff6600, 0.9);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-hunt', 48, 48);

    // Hunt hybrid form — the same body under a silver hunter's plate, gouges gone cold.
    gfx.clear();
    gfx.fillStyle(0x2b0c06);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x3a3f46);
    gfx.fillCircle(24, 25, 19);
    gfx.fillStyle(0x9aa0ab);
    gfx.fillCircle(23, 23, 15);
    gfx.fillStyle(0x6b2412, 0.55);
    gfx.fillEllipse(24, 30, 26, 12);
    for (let i = 0; i < 3; i++) {
      const ox = -7 + i * 7;
      gfx.lineStyle(3, 0x1d2126, 0.95);
      gfx.beginPath();
      gfx.moveTo(24 + ox - 5, 12); gfx.lineTo(24 + ox + 2, 24); gfx.lineTo(24 + ox - 3, 36);
      gfx.strokePath();
      gfx.lineStyle(1.2, 0xf2f4ff, 0.85);
      gfx.beginPath();
      gfx.moveTo(24 + ox - 3.6, 13); gfx.lineTo(24 + ox + 3.4, 24); gfx.lineTo(24 + ox - 1.6, 35);
      gfx.strokePath();
    }
    gfx.fillStyle(0xf2f4ff, 0.6);
    gfx.fillCircle(17, 17, 5);
    gfx.lineStyle(3.5, 0xdddde6);
    gfx.strokeCircle(24, 24, 22);
    gfx.lineStyle(1.6, 0xcc1111, 0.7);
    gfx.strokeCircle(24, 24, 14);
    gfx.generateTexture('elem-hunt-hybrid', 48, 48);

    // Hunt pellet — buckshot: a lead ball with a hot leading face.
    gfx.clear();
    gfx.fillStyle(0x3d1a0e);
    gfx.fillCircle(4, 4, 4);
    gfx.fillStyle(0xcc4400);
    gfx.fillCircle(4, 4, 3);
    gfx.fillStyle(0xffaa44);
    gfx.fillCircle(3.2, 3.2, 1.4);
    gfx.generateTexture('proj-hunt-pellet', 8, 8);

    // Hunt silver bullet — a cold slug with a bright rim and a punched nose.
    gfx.clear();
    gfx.fillStyle(0x3a3f46);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0x9aa0ab);
    gfx.fillCircle(5, 5, 4);
    gfx.fillStyle(0xdddde6);
    gfx.fillCircle(4.2, 4.2, 2.4);
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(3.6, 3.6, 1.1);
    gfx.lineStyle(1, 0xf2f4ff, 0.9);
    gfx.strokeCircle(5, 5, 4.6);
    gfx.generateTexture('proj-hunt-silver', 10, 10);

    // Hunt shrapnel — a torn sliver of casing, not a bar: wide at the break, tapering to a barb.
    gfx.clear();
    gfx.fillStyle(0x3a3f46);
    gfx.fillTriangle(0, 1, 0, 6, 10, 4);
    gfx.fillStyle(0x9aa0ab);
    gfx.fillTriangle(0.5, 2, 0.5, 5.4, 8.6, 3.9);
    gfx.fillStyle(0xf2f4ff);
    gfx.fillTriangle(1, 2.6, 1, 4, 6.5, 3.6);
    gfx.generateTexture('proj-hunt-shrapnel', 10, 7);

    // Hunt vampire stake (dark red elongated rectangle) — kept for any legacy refs
    gfx.clear();
    gfx.fillStyle(0x880033);
    gfx.fillRect(0, 4, 20, 6);
    gfx.fillStyle(0xcc2255);
    gfx.fillTriangle(20, 0, 20, 14, 28, 7);
    gfx.generateTexture('proj-hunt-stake', 28, 14);

    // Gravity element texture — a well seen from above: an accretion disc of spiral arms
    // falling into a black core, with the photon ring bent around it.
    gfx.clear();
    gfx.fillStyle(0x1a0a2e);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x2d1155);
    gfx.fillCircle(24, 24, 19);
    // Four arms spiralling in, drawn as tapering wedges.
    for (let k = 0; k < 4; k++) {
      const base = (k / 4) * Math.PI * 2;
      for (const [shade, w] of [[0x5511aa, 4.6], [0xaa44ff, 2.6], [0xccbbee, 1.1]] as const) {
        gfx.lineStyle(w, shade, 0.95);
        gfx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const f = i / 10;
          const r = 18 - f * 12;
          const a = base + f * 1.5;
          const px = 24 + Math.cos(a) * r, py = 24 + Math.sin(a) * r;
          if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
        }
        gfx.strokePath();
      }
    }
    // Event horizon, then the lensed ring standing off it.
    gfx.fillStyle(0x0a0614);
    gfx.fillCircle(24, 24, 6.5);
    gfx.lineStyle(2, 0xe8dcff, 0.95);
    gfx.strokeCircle(24, 24, 8.4);
    gfx.lineStyle(1, 0xaa44ff, 0.6);
    gfx.strokeCircle(24, 24, 10.6);
    gfx.lineStyle(2.5, 0xaa55ee, 0.9);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-gravity', 48, 48);

    // Creation element texture — a smith's gear seen head-on: an iron rim with square teeth,
    // a bronze web with four riveted spokes, and a pink Nexus core burning in the bore.
    gfx.clear();
    gfx.fillStyle(0x2a1206);
    gfx.fillCircle(24, 24, 22);
    // Teeth around the rim.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const p = -s, q = c;
      gfx.fillStyle(0x8a4a1c);
      gfx.fillPoints([
        { x: 24 + c * 15 + p * 4.6, y: 24 + s * 15 + q * 4.6 },
        { x: 24 + c * 22.6 + p * 3.2, y: 24 + s * 22.6 + q * 3.2 },
        { x: 24 + c * 22.6 - p * 3.2, y: 24 + s * 22.6 - q * 3.2 },
        { x: 24 + c * 15 - p * 4.6, y: 24 + s * 15 - q * 4.6 },
      ], true);
    }
    gfx.fillStyle(0x4a2c14);
    gfx.fillCircle(24, 24, 18);
    gfx.fillStyle(0x8a4a1c);
    gfx.fillCircle(24, 24, 15.5);
    // Lit upper bevel — the whole disc reads flat without it.
    gfx.fillStyle(0xcc6622);
    gfx.slice(24, 24, 15.5, Math.PI * 1.15, Math.PI * 1.95);
    gfx.fillPath();
    gfx.fillStyle(0x2a1206);
    gfx.fillCircle(24, 24, 11.5);
    // Four spokes with a rivet at the hub end of each.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const c = Math.cos(a), s = Math.sin(a);
      gfx.fillStyle(0xffaa44);
      gfx.fillPoints([
        { x: 24 + c * 4 - s * 2.6, y: 24 + s * 4 + c * 2.6 },
        { x: 24 + c * 13 - s * 1.8, y: 24 + s * 13 + c * 1.8 },
        { x: 24 + c * 13 + s * 1.8, y: 24 + s * 13 - c * 1.8 },
        { x: 24 + c * 4 + s * 2.6, y: 24 + s * 4 - c * 2.6 },
      ], true);
      gfx.fillStyle(0x2a1206);
      gfx.fillCircle(24 + c * 11, 24 + s * 11, 1.9);
      gfx.fillStyle(0xffee99);
      gfx.fillCircle(24 + c * 11 - 0.5, 24 + s * 11 - 0.5, 0.9);
    }
    // Nexus core in the bore, with its specular glint.
    gfx.fillStyle(0xff3399);
    gfx.fillCircle(24, 24, 6);
    gfx.fillStyle(0xff88cc);
    gfx.fillCircle(24, 24, 3.6);
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(22.8, 22.8, 1.6);
    gfx.lineStyle(2, 0xcc6622, 0.9);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-creation', 48, 48);

    // Creation bolts: a forged slug per tier — dark jacket, tier metal, driving band, glint.
    for (const [key, metal, lit] of [
      ['proj-creation-copper', 0xcc6622, 0xffaa44],
      ['proj-creation-silver', 0xccccdd, 0xffffff],
      ['proj-creation-gold', 0xffdd22, 0xffee99],
    ] as const) {
      gfx.clear();
      gfx.fillStyle(0x2a1206);
      gfx.fillCircle(6, 6, 6);
      gfx.fillStyle(metal);
      gfx.fillCircle(6, 6, 5);
      gfx.fillStyle(0x4a2c14);
      gfx.fillRect(1.5, 4.8, 9, 1.4);
      gfx.fillStyle(lit);
      gfx.fillCircle(4.6, 4.4, 1.8);
      gfx.generateTexture(key, 12, 12);
    }

    // Creation dagger — a ground blade with a fuller, a brass guard and a wrapped grip.
    gfx.clear();
    gfx.fillStyle(0x4a2c14);
    gfx.fillPoints([{ x: 0, y: 1.4 }, { x: 18, y: 4 }, { x: 0, y: 6.6 }], true);
    gfx.fillStyle(0xccccdd);
    gfx.fillPoints([{ x: 5, y: 2 }, { x: 17, y: 4 }, { x: 5, y: 6 }], true);
    gfx.fillStyle(0xffffff);
    gfx.fillRect(6, 3.2, 9, 0.9);
    gfx.fillStyle(0xffaa44);
    gfx.fillRect(4, 0.6, 1.8, 6.8);
    gfx.fillStyle(0x8a5a2a);
    gfx.fillRect(0.5, 2.4, 3.4, 3.2);
    gfx.generateTexture('proj-creation-dagger', 18, 8);

    // Creation scythe — a crescent blade riding a riveted haft.
    gfx.clear();
    gfx.fillStyle(0x4a2c14);
    gfx.fillRect(0, 4, 12, 2.4);
    gfx.fillStyle(0xcc22aa);
    gfx.fillPoints([
      { x: 4, y: 9.4 }, { x: 12, y: 5 }, { x: 15.4, y: 0 }, { x: 15.4, y: 4 }, { x: 11, y: 9.4 },
    ], true);
    gfx.fillStyle(0xff88cc);
    gfx.fillPoints([{ x: 6, y: 8.6 }, { x: 12.6, y: 4.4 }, { x: 14.6, y: 1.2 }, { x: 13.6, y: 5 }], true);
    gfx.fillStyle(0xffaa44);
    gfx.fillCircle(3, 5.2, 1.8);
    gfx.generateTexture('proj-creation-scythe', 16, 10);

    // Time element texture — a pocket-watch face: brass bezel, hour ticks, and the two hands
    // locked at high noon over a sun-bleached dial.
    gfx.clear();
    gfx.fillStyle(0x5a3a18);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0xb8862b);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0xffdd44);
    gfx.fillCircle(23.5, 23.5, 16.5);
    gfx.fillStyle(0xffee88);
    gfx.fillCircle(22, 22, 13);
    // Hour ticks: four long, eight short.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      gfx.lineStyle(long ? 2.4 : 1.2, 0x5a3a18, 0.9);
      gfx.beginPath();
      gfx.moveTo(24 + Math.cos(a) * (long ? 11 : 13), 24 + Math.sin(a) * (long ? 11 : 13));
      gfx.lineTo(24 + Math.cos(a) * 15.5, 24 + Math.sin(a) * 15.5);
      gfx.strokePath();
    }
    // Both hands straight up: noon.
    gfx.lineStyle(3, 0x2a1c0a, 1);
    gfx.beginPath(); gfx.moveTo(24, 26); gfx.lineTo(24, 12); gfx.strokePath();
    gfx.lineStyle(1.8, 0x2a1c0a, 1);
    gfx.beginPath(); gfx.moveTo(24, 26); gfx.lineTo(24, 15); gfx.strokePath();
    gfx.fillStyle(0x5a3a18); gfx.fillCircle(24, 24, 2.6);
    gfx.fillStyle(0xfff6c8); gfx.fillCircle(24, 24, 1.1);
    gfx.fillStyle(0xfff6c8, 0.5);
    gfx.fillCircle(17, 17, 4.5);
    gfx.lineStyle(2.5, 0xffee88, 0.9);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-sand', 48, 48);

    // Time Warp orb — the lasso's honda: a brass loop with the rope's braid on it.
    gfx.clear();
    gfx.fillStyle(0x5a3a18);
    gfx.fillCircle(14, 14, 13.5);
    gfx.fillStyle(0xb8862b);
    gfx.fillCircle(14, 14, 11);
    gfx.fillStyle(0x2a1c0a);
    gfx.fillCircle(14, 14, 7.5);
    gfx.lineStyle(2, 0xffdd44, 0.95);
    gfx.strokeCircle(14, 14, 9.5);
    gfx.fillStyle(0xffee88);
    gfx.fillCircle(10.5, 10.5, 2.6);
    gfx.generateTexture('proj-time-orb', 28, 28);

    // Time barrage shard — a clock hand rather than a bar.
    gfx.clear();
    gfx.fillStyle(0x5a3a18);
    gfx.fillTriangle(0, 3, 0, 7, 8, 5);
    gfx.fillStyle(0xffdd44);
    gfx.fillTriangle(0.6, 3.6, 0.6, 6.4, 7, 5);
    gfx.fillStyle(0xfff6c8);
    gfx.fillCircle(1.4, 5, 1.5);
    gfx.generateTexture('proj-time-shard', 8, 10);

    // Time revolver bullet — a jacketed round with a brass rim and a hot nose (tinted by age).
    gfx.clear();
    gfx.fillStyle(0x5a3a18);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0xb8862b);
    gfx.fillCircle(5, 5, 4);
    gfx.fillStyle(0xffee44);
    gfx.fillCircle(4.6, 4.6, 2.7);
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(3.8, 3.8, 1.2);
    gfx.generateTexture('proj-time-bullet', 10, 10);

    // Time lasso orb (16×16 transparent — rope drawn via Graphics)
    gfx.clear();
    gfx.fillStyle(0xffdd44, 0);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('proj-time-lasso-orb', 16, 16);

    // Time chamber explosive — a whole loaded cylinder thrown downrange, six live chambers
    // glowing hot around a gunmetal hub.
    gfx.clear();
    gfx.fillStyle(0x2a1c0a);
    gfx.fillCircle(10, 10, 10);
    gfx.fillStyle(0x3c3c44);
    gfx.fillCircle(10, 10, 8.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cx = 10 + Math.cos(a) * 5, cy = 10 + Math.sin(a) * 5;
      gfx.fillStyle(0x1a0f06);
      gfx.fillCircle(cx, cy, 2.4);
      gfx.fillStyle(0xff4422);
      gfx.fillCircle(cx, cy, 1.7);
      gfx.fillStyle(0xffdd44);
      gfx.fillCircle(cx - 0.4, cy - 0.4, 0.8);
    }
    gfx.fillStyle(0x9aa0ab);
    gfx.fillCircle(10, 10, 2.2);
    gfx.lineStyle(1.4, 0xff8800, 0.9);
    gfx.strokeCircle(10, 10, 9.4);
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

    // Electricity element body: a charged cell. Layered burnt shell → copper casing → live
    // amber body → white filament, etched by a fork of current that earths from the core out to
    // the rim, with arc beads at its kinks and one hard specular on the high shoulder.
    gfx.clear();
    gfx.fillStyle(0x3a2a00);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x8a5a00);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0xcc8800);
    gfx.fillCircle(24, 24, 16.5);
    gfx.fillStyle(0xffaa00, 0.95);
    gfx.fillCircle(23, 22, 12.5);
    // Contact spikes seated on the rim — a cell has terminals, not a smooth edge.
    gfx.fillStyle(0xffcc22, 0.9);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const r0 = 17.5, r1 = 22.8, w = 0.1;
      gfx.beginPath();
      gfx.moveTo(24 + Math.cos(a - w) * r0, 24 + Math.sin(a - w) * r0);
      gfx.lineTo(24 + Math.cos(a) * r1, 24 + Math.sin(a) * r1);
      gfx.lineTo(24 + Math.cos(a + w) * r0, 24 + Math.sin(a + w) * r0);
      gfx.closePath(); gfx.fillPath();
    }
    // The fork: fixed here (a texture can't re-roll), but kinked and branched so it still reads
    // as a discharge rather than as a lightning-bolt glyph.
    const boltRun: Array<[number, number]> = [
      [21, 22], [28, 13], [24, 19], [33, 8],
    ];
    const boltFork: Array<[number, number]> = [
      [21, 22], [14, 30], [19, 27], [12, 39],
    ];
    for (const [w, c, a] of [[5, 0xffee00, 0.5], [2.6, 0xffff66, 0.95], [1.1, 0xffffff, 1]] as const) {
      gfx.lineStyle(w, c, a);
      for (const run of [boltRun, boltFork]) {
        gfx.beginPath();
        gfx.moveTo(run[0][0], run[0][1]);
        for (let i = 1; i < run.length; i++) gfx.lineTo(run[i][0], run[i][1]);
        gfx.strokePath();
      }
    }
    // Beads at the kinks — what stops the stacked strokes reading as one fat ribbon.
    gfx.fillStyle(0xffffff, 0.9);
    for (const [bx, by] of [boltRun[1], boltRun[2], boltFork[1], boltFork[2]]) gfx.fillCircle(bx, by, 1.5);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(17, 16, 2.6);
    gfx.lineStyle(3, 0xffee00);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-electricity', 48, 48);

    // Electro ball projectile: a bead of current, not a dot — a dim corona, an amber body, a
    // white filament, and two stubby forks kicking off the equator.
    gfx.clear();
    gfx.fillStyle(0xcc8800, 0.4);
    gfx.fillCircle(7, 7, 7);
    gfx.fillStyle(0xffaa00);
    gfx.fillCircle(7, 7, 5.4);
    gfx.fillStyle(0xffee00);
    gfx.fillCircle(6.6, 6.4, 3.6);
    gfx.lineStyle(1.2, 0xffff66, 0.9);
    gfx.beginPath();
    gfx.moveTo(1.4, 8.4); gfx.lineTo(4.6, 6.2); gfx.lineTo(3.4, 8.6);
    gfx.moveTo(12.6, 5.6); gfx.lineTo(9.4, 7.8); gfx.lineTo(10.6, 5.4);
    gfx.strokePath();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(6.2, 5.8, 1.7);
    gfx.generateTexture('proj-electro', 14, 14);

    // Sun projectile texture (photon slime)
    gfx.clear();
    gfx.fillStyle(0xffee44, 1);
    gfx.fillCircle(10, 10, 10);
    gfx.lineStyle(2, 0xffffff, 0.9);
    gfx.strokeCircle(10, 10, 8);
    gfx.generateTexture('proj-sun', 20, 20);

    // Acid element body: a globule mid-boil. Layered rot → moss → live lime → neon core, with
    // bubbles working the surface, an edge visibly eaten into by its own corrosion, and one wet
    // bead of specular high on the shoulder.
    gfx.clear();
    gfx.fillStyle(0x07140a);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x2a6b1a);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0x448822);
    gfx.fillCircle(24, 24, 16.5);
    gfx.fillStyle(0x66cc44, 0.95);
    gfx.fillCircle(22.5, 22, 12);
    gfx.fillStyle(0x88ff33, 0.9);
    gfx.fillCircle(21.5, 21, 7.5);
    // Bites chewed out of the rim — acid dissolves even its own edge.
    gfx.fillStyle(0x07140a, 0.95);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.9;
      gfx.fillCircle(24 + Math.cos(a) * 21, 24 + Math.sin(a) * 21, 3.6);
    }
    // Bubbles boiling up through the body, each with its own tiny highlight.
    const acidBubbles: Array<[number, number, number]> = [
      [17, 30, 3.4], [30, 29, 2.6], [27, 16, 2.2], [15, 21, 1.8], [32, 22, 1.5],
    ];
    for (const [bx, by, br] of acidBubbles) {
      gfx.fillStyle(0xaaff44, 0.85);
      gfx.fillCircle(bx, by, br);
      gfx.lineStyle(1, 0xccff88, 0.9);
      gfx.strokeCircle(bx, by, br);
      gfx.fillStyle(0xccff88, 0.9);
      gfx.fillCircle(bx - br * 0.35, by - br * 0.35, br * 0.32);
    }
    // A drip running off the low edge, and the wet bead up top.
    gfx.fillStyle(0x66cc44, 0.9);
    gfx.fillEllipse(24, 40, 5, 9);
    gfx.fillCircle(24, 43.5, 2.6);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(17, 15, 2.8);
    gfx.lineStyle(3, 0x88ff33);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-slime', 48, 48);

    // Acid Whip lash: a drop, not a bar — a fat leading head with a thin tail dragging behind
    // it, so a lash reads as flung liquid even at 16px.
    gfx.clear();
    gfx.fillStyle(0x143d0a);
    gfx.fillEllipse(11, 6, 10, 9);
    gfx.fillTriangle(0, 5, 0, 7, 8, 6);
    gfx.fillStyle(0x66cc44);
    gfx.fillEllipse(11, 6, 7.5, 6.6);
    gfx.fillTriangle(2, 5.4, 2, 6.6, 8, 6);
    gfx.fillStyle(0x88ff33);
    gfx.fillEllipse(11.4, 5.6, 4.4, 3.8);
    gfx.fillStyle(0xccff88, 0.95);
    gfx.fillCircle(10.2, 4.6, 1.5);
    gfx.generateTexture('proj-acid-whip', 16, 12);

    // Purge ball: a heavy, dark orb of concentrated acid with a neon rim eaten ragged, bubbles
    // trapped inside it and a wet bead where the light catches.
    gfx.clear();
    gfx.fillStyle(0x07140a);
    gfx.fillCircle(9, 9, 9);
    gfx.fillStyle(0x143d0a);
    gfx.fillCircle(9, 9, 7.6);
    gfx.fillStyle(0x2a6b1a);
    gfx.fillCircle(8.4, 8.2, 5.4);
    gfx.fillStyle(0x448822, 0.9);
    gfx.fillCircle(8, 7.6, 3.2);
    gfx.fillStyle(0x88ff33, 0.9);
    gfx.fillCircle(11.6, 11, 1.8);
    gfx.fillCircle(5.6, 11.4, 1.3);
    gfx.lineStyle(1.6, 0x66ff33, 0.95);
    gfx.strokeCircle(9, 9, 8);
    gfx.fillStyle(0x07140a, 0.95);
    gfx.fillCircle(9 + Math.cos(2.1) * 8.4, 9 + Math.sin(2.1) * 8.4, 2);
    gfx.fillCircle(9 + Math.cos(5.2) * 8.4, 9 + Math.sin(5.2) * 8.4, 1.6);
    gfx.fillStyle(0xccff88, 0.95);
    gfx.fillCircle(6.4, 5.8, 1.7);
    gfx.generateTexture('proj-purge', 18, 18);

    // Fate element body: a hand held over green felt. Layered felt → mint body → a fan of three
    // cards laid across the face, each with its own suit, and one hard specular where the light
    // catches the topmost card.
    gfx.clear();
    gfx.fillStyle(0x0d3b2e);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x2a8870);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0x44bb99);
    gfx.fillCircle(24, 24, 16);
    gfx.fillStyle(0x88eecc, 0.9);
    gfx.fillCircle(22, 21, 11);
    // A fan of three cards across the middle, each rotated a little further than the last.
    const fanCard = (cx: number, cy: number, rot: number, face: number) => {
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const quad = (hw: number, hh: number, col: number, a: number) => {
        gfx.fillStyle(col, a);
        gfx.beginPath();
        const pts: Array<[number, number]> = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
        pts.forEach(([lx, ly], i) => {
          const px = cx + lx * cos - ly * sin;
          const py = cy + lx * sin + ly * cos;
          if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
        });
        gfx.closePath();
        gfx.fillPath();
      };
      quad(6, 8.5, 0x191922, 1);
      quad(4.8, 7.2, face, 1);
      quad(1.6, 6.4, 0xfffdf4, 0.35);
    };
    fanCard(16, 27, -0.5, 0xf2eddd);
    fanCard(24, 25, 0, 0xf2eddd);
    fanCard(32, 27, 0.5, 0xf2eddd);
    // Suit pips on the three faces — the read that says "cards" rather than "tiles".
    gfx.fillStyle(0xcc2233, 1);
    gfx.fillTriangle(16, 24, 18, 27, 16, 30);
    gfx.fillTriangle(16, 24, 14, 27, 16, 30);
    gfx.fillStyle(0x14141c, 1);
    gfx.fillCircle(22.6, 25.6, 1.7);
    gfx.fillCircle(25.4, 25.6, 1.7);
    gfx.fillTriangle(23, 26.8, 25, 26.8, 24, 29.4);
    gfx.fillStyle(0xcc2233, 1);
    gfx.fillCircle(30.8, 25.6, 1.7);
    gfx.fillCircle(33.2, 25.6, 1.7);
    gfx.fillTriangle(30, 26, 34, 26, 32, 29.6);
    // A gold chip tucked behind the fan, and the specular on the top card.
    gfx.fillStyle(0xffcc44, 1);
    gfx.fillCircle(34, 17, 4.4);
    gfx.fillStyle(0xfffdf4, 0.85);
    gfx.fillCircle(34, 17, 2);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(18, 15, 2.4);
    gfx.lineStyle(3, 0x88eecc);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-fate', 48, 48);

    // Fate card projectile: a real card in miniature — dark edge, bone stock, a gilt border and
    // a red pip, with the sheen running down one flank.
    gfx.clear();
    gfx.fillStyle(0x191922, 1);
    gfx.fillRect(0, 0, 10, 14);
    gfx.fillStyle(0xf2eddd, 1);
    gfx.fillRect(1, 1, 8, 12);
    gfx.lineStyle(1, 0xffcc44, 0.95);
    gfx.strokeRect(2, 2.5, 6, 9);
    gfx.fillStyle(0xcc2233, 1);
    gfx.fillTriangle(5, 4.5, 6.6, 7, 5, 9.5);
    gfx.fillTriangle(5, 4.5, 3.4, 7, 5, 9.5);
    gfx.fillStyle(0xfffdf4, 0.6);
    gfx.fillRect(1.4, 1.4, 1.8, 11.2);
    gfx.generateTexture('proj-fate-card', 10, 14);

    // Sound element texture: a dark plum body under a magenta rim, with three wavefronts
    // rolling off a bright core — the element's own primitive, stamped on its icon.
    gfx.clear();
    gfx.fillStyle(0x66225c, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x1a0616, 1);
    gfx.fillCircle(24, 25, 19);
    gfx.lineStyle(3, 0xff66cc, 1);
    gfx.strokeCircle(24, 24, 21.5);
    // Wavefronts, widening as they leave the core.
    for (let i = 0; i < 3; i++) {
      gfx.lineStyle(3 - i * 0.6, i === 0 ? 0xffcdee : 0xff99dd, 0.95 - i * 0.22);
      gfx.beginPath();
      gfx.arc(15, 24, 6 + i * 5.5, -0.85, 0.85);
      gfx.strokePath();
    }
    // Emitter core + specular glint.
    gfx.fillStyle(0xff66cc, 1);
    gfx.fillCircle(14, 24, 5);
    gfx.fillStyle(0xfff4fb, 1);
    gfx.fillCircle(14, 24, 2.4);
    gfx.fillStyle(0xffffff, 0.55);
    gfx.fillEllipse(18, 14, 9, 5);
    gfx.generateTexture('elem-sound', 48, 48);

    // Light element texture: a pale gold body with a prism shard cut through it, fringing red
    // one side and blue the other — the element's chromatic split, stamped on its icon.
    gfx.clear();
    gfx.fillStyle(0x14110a, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0xfff4a8, 1);
    gfx.fillCircle(24, 24, 19);
    gfx.fillStyle(0xffdd44, 1);
    gfx.fillCircle(26, 27, 15);
    // The shard, with its two fringes.
    gfx.fillStyle(0xff3355, 0.85);
    gfx.fillTriangle(9, 33, 36, 9, 22, 36);
    gfx.fillStyle(0x3399ff, 0.85);
    gfx.fillTriangle(13, 39, 40, 15, 26, 42);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillTriangle(11, 36, 38, 12, 24, 39);
    gfx.lineStyle(3, 0xffffff, 1);
    gfx.strokeCircle(24, 24, 21.5);
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillEllipse(17, 14, 11, 6);
    gfx.generateTexture('elem-light', 48, 48);

    // Prism lance projectile: a cut shard with a lit shoulder. Kept near-white — the kit tints
    // each bolt its own spectrum colour, and a multiply tint only darkens what is already there.
    gfx.clear();
    gfx.fillStyle(0x9a9a9a, 1);
    gfx.fillTriangle(0, 0, 0, 20, 24, 10);
    gfx.fillStyle(0xdddddd, 1);
    gfx.fillTriangle(2, 3, 2, 17, 21, 10);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillTriangle(3, 6, 3, 11, 20, 10);
    gfx.generateTexture('proj-light-triangle', 24, 20);

    // Dummy element texture (grey circle with target crosshair stroke)
    gfx.clear();
    gfx.fillStyle(0x777777);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0xbbbbbb);
    gfx.strokeCircle(24, 24, 22);
    gfx.generateTexture('elem-dummy', 48, 48);

    // Magnet element texture: a dark iron body wearing the element's own emblem — a horseshoe
    // with a red north leg, a blue south leg and the field jumping the gap between them.
    // (magnet-rod, proj-nail, magnet-orb and magnet-wall used to live here. MagnetKit draws
    // every one of those itself now, and nothing referenced the textures, so they are gone.)
    gfx.clear();
    gfx.fillStyle(0x333a4a, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x14161f, 1);
    gfx.fillCircle(24, 25, 19);
    // Yoke.
    gfx.lineStyle(7, 0x99aacc, 1);
    gfx.beginPath();
    gfx.arc(24, 24, 11, Math.PI, 0);
    gfx.strokePath();
    // Legs, coloured by pole.
    gfx.fillStyle(0x99aacc, 1);
    gfx.fillRect(9.5, 24, 7, 6);
    gfx.fillRect(31.5, 24, 7, 6);
    gfx.fillStyle(0xcc2244, 1);
    gfx.fillRect(9.5, 29, 7, 9);
    gfx.fillStyle(0x3399ff, 1);
    gfx.fillRect(31.5, 29, 7, 9);
    // The field jumping the gap.
    gfx.lineStyle(2, 0xff4488, 0.9);
    gfx.beginPath();
    gfx.arc(24, 38, 11, Math.PI, 0, true);
    gfx.strokePath();
    gfx.lineStyle(1.4, 0x88ccff, 0.7);
    gfx.beginPath();
    gfx.arc(24, 38, 17, Math.PI, 0, true);
    gfx.strokePath();
    gfx.lineStyle(3, 0xff3366, 1);
    gfx.strokeCircle(24, 24, 21.5);
    gfx.fillStyle(0xffffff, 0.5);
    gfx.fillEllipse(17, 13, 10, 5);
    gfx.generateTexture('elem-magnet', 48, 48);

    // Plasma element texture — a bead of caged lightning: violet shell, magenta body, a
    // white core and forked arcs crawling over the surface.
    gfx.clear();
    gfx.fillStyle(0x1a0033, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x6600cc, 1);
    gfx.fillCircle(24, 24, 19);
    gfx.fillStyle(0xaa22ff, 1);
    gfx.fillCircle(24, 24, 14);
    gfx.fillStyle(0xdd66ff, 1);
    gfx.fillCircle(24, 24, 9);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(24, 24, 4.5);
    // Arcs jumping from the core out to the shell — kinked, never straight.
    gfx.lineStyle(2, 0xff88ff, 0.95);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      gfx.beginPath();
      gfx.moveTo(24 + Math.cos(a) * 5, 24 + Math.sin(a) * 5);
      gfx.lineTo(24 + Math.cos(a + 0.35) * 12, 24 + Math.sin(a + 0.35) * 12);
      gfx.lineTo(24 + Math.cos(a - 0.2) * 17.5, 24 + Math.sin(a - 0.2) * 17.5);
      gfx.strokePath();
    }
    gfx.lineStyle(2.5, 0xffaaff, 0.9);
    gfx.strokeCircle(24, 24, 21);
    gfx.fillStyle(0xffffff, 0.45);
    gfx.fillEllipse(17, 14, 11, 6);
    gfx.generateTexture('elem-plasma', 48, 48);

    // Metal element texture — a blood-wet steel disc: dark iron rim, a honed bevel across the
    // top face, a crossed pair of blade shards and blood pooled in the lower half.
    gfx.clear();
    gfx.fillStyle(0x2b2228, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x5c6672, 1);
    gfx.fillCircle(24, 24, 19.5);
    gfx.fillStyle(0x8fa0b0, 1);
    gfx.fillCircle(24, 24, 16);
    // Blood pooled in the bottom of the dish.
    gfx.fillStyle(0x990018, 1);
    gfx.slice(24, 24, 16, 0.18, Math.PI - 0.18, false);
    gfx.fillPath();
    gfx.fillStyle(0xcc0022, 0.75);
    gfx.fillEllipse(24, 30, 22, 7);
    // Two crossed blade shards, honed edges catching the light.
    for (const dir of [-1, 1]) {
      gfx.fillStyle(0xc9d6e2, 1);
      gfx.beginPath();
      gfx.moveTo(24 - dir * 11, 33);
      gfx.lineTo(24 + dir * 3, 33);
      gfx.lineTo(24 + dir * 11, 13);
      gfx.lineTo(24 + dir * 6, 12);
      gfx.closePath();
      gfx.fillPath();
      gfx.lineStyle(1.4, 0xffffff, 0.9);
      gfx.beginPath();
      gfx.moveTo(24 + dir * 2, 32);
      gfx.lineTo(24 + dir * 10, 14);
      gfx.strokePath();
    }
    gfx.lineStyle(3, 0xd9b25a, 1);
    gfx.strokeCircle(24, 24, 21.5);
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillEllipse(16, 14, 10, 5);
    gfx.generateTexture('elem-metal', 48, 48);

    // Gunpowder element texture — a powder keg seen end-on: soot body, brass bands, a violet
    // skull glow and a lit fuse burning at the top.
    gfx.clear();
    gfx.fillStyle(0x140a1c, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x440066, 1);
    gfx.fillCircle(24, 24, 19);
    gfx.fillStyle(0x241428, 1);
    gfx.fillCircle(24, 24, 16);
    // Brass hoops round the keg.
    gfx.lineStyle(2.5, 0xd9a441, 1);
    gfx.strokeCircle(24, 24, 15);
    gfx.strokeCircle(24, 24, 9);
    // Charge grains packed inside.
    gfx.fillStyle(0x6a2088, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      gfx.fillCircle(24 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, 2.2);
    }
    // Fuse out of the bung, burning.
    gfx.lineStyle(2.4, 0x5c4326, 1);
    gfx.beginPath();
    gfx.moveTo(24, 12);
    gfx.lineTo(28, 7);
    gfx.lineTo(33, 8);
    gfx.strokePath();
    gfx.fillStyle(0xff7722, 1);
    gfx.fillCircle(33.5, 8, 3.4);
    gfx.fillStyle(0xffcc55, 1);
    gfx.fillCircle(33.5, 8, 2);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(33.5, 8, 0.9);
    gfx.lineStyle(3, 0xcc44ff, 1);
    gfx.strokeCircle(24, 24, 21.5);
    gfx.fillStyle(0xffffff, 0.35);
    gfx.fillEllipse(16, 15, 9, 5);
    gfx.generateTexture('elem-gunpowder', 48, 48);
    gfx.clear();

    // proj-gunpowder-musket — a lead ball on a smoke wake, brass-jacketed at the nose
    gfx.fillStyle(0x241428, 1);
    gfx.fillRect(0, 1, 12, 3);
    gfx.fillStyle(0x6b5f66, 1);
    gfx.fillRect(4, 0.5, 9, 4);
    gfx.fillStyle(0xd9a441, 1);
    gfx.fillCircle(15, 2.5, 3);
    gfx.fillStyle(0xffeeaa, 1);
    gfx.fillCircle(16, 1.8, 1.3);
    gfx.generateTexture('proj-gunpowder-musket', 20, 5);
    gfx.clear();

    // Metal chain link projectile — an oval link with a lit top edge
    gfx.clear();
    gfx.lineStyle(3, 0x2b2228, 1);
    gfx.strokeEllipse(7, 6, 12, 8);
    gfx.lineStyle(2, 0x8fa0b0, 1);
    gfx.strokeEllipse(7, 6, 11, 7);
    gfx.lineStyle(1, 0xc9d6e2, 1);
    gfx.beginPath();
    gfx.moveTo(3, 3.5);
    gfx.lineTo(11, 3.5);
    gfx.strokePath();
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

    // Fate's card pellets. Each one is a cut card rather than a bead: a dark edge, a coloured
    // face inset inside it, and a bright sheen down one flank — the same read as the full-size
    // cards FateVisuals draws, shrunk to bullet scale.
    const fatePellet = (
      key: string, size: number, edge: number, face: number, lit: number,
    ) => {
      const c = size / 2;
      const half = size * 0.5 - 0.5;
      gfx.clear();
      gfx.fillStyle(edge, 1);
      gfx.fillRect(c - half * 0.74, c - half, half * 1.48, half * 2);
      gfx.fillStyle(face, 1);
      gfx.fillRect(c - half * 0.52, c - half * 0.8, half * 1.04, half * 1.6);
      gfx.fillStyle(lit, 0.85);
      gfx.fillRect(c - half * 0.44, c - half * 0.72, half * 0.34, half * 1.44);
      gfx.fillStyle(0xfffdf4, 0.9);
      gfx.fillRect(c - half * 0.2, c - half * 0.5, half * 0.34, half * 0.34);
      gfx.generateTexture(key, size, size);
      gfx.clear();
    };

    // Burst pellet — orange card chip.
    fatePellet('proj-fate-burst', 10, 0x191922, 0xff8800, 0xffcc66);
    // Barrier bullet — blue card chip.
    fatePellet('proj-fate-barrier', 8, 0x191922, 0x4488ff, 0x99ccff);
    // Infect pellet — sickly green card chip.
    fatePellet('proj-fate-infect', 10, 0x0d1a0d, 0x55cc55, 0x99ff99);

    // proj-fate-striker — the heavy card: a black face-down card with a gilt border and a
    // single sealed pip, so the slowest, hardest-hitting shot reads as the most valuable one.
    gfx.fillStyle(0x05050a, 1);
    gfx.fillRect(1.5, 0, 15, 18);
    gfx.fillStyle(0x2b2140, 1);
    gfx.fillRect(3, 1.5, 12, 15);
    gfx.lineStyle(1.2, 0xa07018, 1);
    gfx.strokeRect(4.5, 3, 9, 12);
    gfx.lineStyle(1, 0x6a4fa8, 0.9);
    gfx.strokeRect(6, 5, 6, 8);
    gfx.fillStyle(0xffcc44, 0.95);
    gfx.fillCircle(9, 9, 2.2);
    gfx.fillStyle(0xfff3c4, 0.9);
    gfx.fillCircle(8.2, 8.2, 0.9);
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

    // silence-doll — 30×42 burlap voodoo doll: stitched sack body, X eyes, pins through it
    gfx.fillStyle(0xb49a6a, 1);
    gfx.fillEllipse(15, 12, 17, 15);                 // head
    gfx.fillRoundedRect(7, 18, 16, 17, 5);           // torso
    gfx.fillRoundedRect(1, 20, 8, 5, 2);             // left arm
    gfx.fillRoundedRect(21, 20, 8, 5, 2);            // right arm
    gfx.fillRoundedRect(8, 34, 5, 8, 2);             // left leg
    gfx.fillRoundedRect(17, 34, 5, 8, 2);            // right leg
    // burlap seam down the middle + shoulder stitches
    gfx.lineStyle(1, 0x7d6440, 0.9);
    gfx.lineBetween(15, 19, 15, 34);
    for (let si = 0; si < 5; si++) {
      const sy = 20 + si * 3;
      gfx.lineBetween(13, sy, 17, sy + 1.5);
    }
    // stitched-shut X eyes
    gfx.lineStyle(1.4, 0x1a0d08, 1);
    gfx.lineBetween(9, 9, 13, 13);
    gfx.lineBetween(13, 9, 9, 13);
    gfx.lineBetween(17, 9, 21, 13);
    gfx.lineBetween(21, 9, 17, 13);
    // sewn mouth
    gfx.lineBetween(11, 17, 19, 17);
    for (let mi = 0; mi < 4; mi++) gfx.lineBetween(11.5 + mi * 2.2, 15.5, 11.5 + mi * 2.2, 18.5);
    // pins driven through the chest, heads glinting
    gfx.lineStyle(1, 0xc8ccd8, 1);
    gfx.lineBetween(9, 30, 20, 24);
    gfx.lineBetween(21, 31, 11, 26);
    gfx.fillStyle(0xcc1133, 1);
    gfx.fillCircle(9, 30, 2);
    gfx.fillCircle(21, 31, 2);
    gfx.generateTexture('silence-doll', 30, 42);
    gfx.clear();

    // silence-awakened — 72×72 the host cracked open: pale shell split apart, black
    // interior full of eyes, four long spider-limbed tentacles hauling it around
    gfx.fillStyle(0x0a0410, 1);
    gfx.fillCircle(36, 38, 21);                      // the black thing inside
    // four jointed spider tentacles, two per side, reaching well past the shell
    gfx.lineStyle(4, 0x0a0410, 1);
    const awLimbs: Array<[number, number, number, number, number, number]> = [
      [20, 34, 6, 14, 1, 34], [52, 34, 66, 14, 71, 34],
      [22, 46, 5, 54, 2, 70], [50, 46, 67, 54, 70, 70],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of awLimbs) {
      gfx.lineBetween(x1, y1, x2, y2);
      gfx.lineBetween(x2, y2, x3, y3);
      gfx.fillStyle(0x0a0410, 1);
      gfx.fillCircle(x2, y2, 2.6);                   // knee joint
      gfx.fillTriangle(x3, y3, x3 - 2, y3 - 5, x3 + 2, y3 - 5); // barbed tip
    }
    // the split shell — two pale halves peeled back off the black core
    gfx.fillStyle(0xd6cfc2, 1);
    gfx.beginPath();
    gfx.arc(36, 38, 22, Phaser.Math.DegToRad(100), Phaser.Math.DegToRad(260), false);
    gfx.closePath();
    gfx.fillPath();
    gfx.beginPath();
    gfx.arc(36, 38, 22, Phaser.Math.DegToRad(-80), Phaser.Math.DegToRad(80), false);
    gfx.closePath();
    gfx.fillPath();
    // ragged edges of the crack
    gfx.fillStyle(0xa89f90, 1);
    for (let ci = 0; ci < 7; ci++) {
      const cy = 18 + ci * 6;
      gfx.fillTriangle(30, cy, 36, cy + 3, 30, cy + 6);
      gfx.fillTriangle(42, cy, 36, cy + 3, 42, cy + 6);
    }
    // black eyes crowding the gap
    gfx.fillStyle(0x000000, 1);
    gfx.fillEllipse(36, 26, 8, 6);
    gfx.fillEllipse(33, 36, 6, 5);
    gfx.fillEllipse(39, 44, 6, 5);
    gfx.fillEllipse(36, 52, 5, 4);
    gfx.fillStyle(0xffffff, 0.85);
    gfx.fillCircle(37.5, 25, 1.2);
    gfx.fillCircle(34, 35, 1);
    gfx.fillCircle(40, 43, 1);
    gfx.generateTexture('silence-awakened', 72, 72);
    gfx.clear();

    // silence-kin — 26×26 a small awakened: black lump, spindly legs, two white pinprick eyes
    gfx.lineStyle(2, 0x0a0410, 1);
    for (let ki = 0; ki < 6; ki++) {
      const ka = Phaser.Math.DegToRad(20 + ki * 28);
      gfx.lineBetween(13, 14, 13 + Math.cos(ka) * 12, 14 + Math.sin(ka) * 11);
    }
    gfx.fillStyle(0x0a0410, 1);
    gfx.fillEllipse(13, 12, 17, 14);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(10, 10, 1.6);
    gfx.fillCircle(16, 10, 1.6);
    gfx.fillStyle(0xddddcc, 1);
    for (let kt = 0; kt < 3; kt++) gfx.fillTriangle(10 + kt * 3, 15, 12 + kt * 3, 15, 11 + kt * 3, 18);
    gfx.generateTexture('silence-kin', 26, 26);
    gfx.clear();

    // silence-corrupt — 46×46 the enemy remade: featureless black body, no eyes, split by a grin
    gfx.fillStyle(0x08040c, 1);
    gfx.fillCircle(23, 23, 19);
    gfx.lineStyle(1, 0x2a1038, 0.9);
    gfx.strokeCircle(23, 23, 19);
    // a too-wide white smile with squared-off teeth
    gfx.fillStyle(0xf4f2ea, 1);
    gfx.beginPath();
    gfx.arc(23, 20, 14, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    gfx.closePath();
    gfx.fillPath();
    gfx.fillStyle(0x08040c, 1);
    for (let gi = 0; gi < 5; gi++) gfx.fillRect(11 + gi * 5, 27, 1.6, 8);
    gfx.fillRect(9, 20, 28, 5);
    // faint smoke curling off the shoulders
    gfx.fillStyle(0x2a1038, 0.5);
    gfx.fillCircle(9, 11, 4);
    gfx.fillCircle(37, 11, 4);
    gfx.generateTexture('silence-corrupt', 46, 46);
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

    // Soul — grave headstone: a weathered, chipped slab leaning slightly, with a carved cross
    // cut into its face, moss down the shaded side and a turned mound of dirt at its foot.
    gfx.fillStyle(0x1c1424, 0.55);
    gfx.fillEllipse(16, 48, 30, 9);
    // Slab body, lit face then shaded flank so it reads as stone rather than a rectangle.
    gfx.fillStyle(0x554466, 1);
    gfx.fillCircle(16, 23, 12);
    gfx.fillRect(4, 23, 24, 23);
    gfx.fillStyle(0x776688, 1);
    gfx.fillCircle(14, 22, 10.5);
    gfx.fillRect(3.5, 22, 21, 24);
    gfx.fillStyle(0x8f7fa4, 1);
    gfx.fillCircle(13, 21, 7.5);
    gfx.fillRect(5.5, 21, 15, 22);
    // Chipped top-left corner and a crack running down — a fresh slab reads as a placeholder.
    gfx.fillStyle(0x554466, 1);
    gfx.fillTriangle(4, 24, 9, 17, 4, 15);
    gfx.lineStyle(1.2, 0x3a2f47, 0.9);
    gfx.beginPath();
    gfx.moveTo(20, 20); gfx.lineTo(18, 30); gfx.lineTo(21, 38);
    gfx.strokePath();
    // Carved cross, cut in shadow with a lit lower lip.
    gfx.fillStyle(0x3a2f47, 1);
    gfx.fillRect(14, 18, 4, 18);
    gfx.fillRect(9, 24, 14, 4);
    gfx.fillStyle(0xa899bb, 0.7);
    gfx.fillRect(14, 35, 4, 1.4);
    gfx.fillRect(9, 27, 14, 1.2);
    // Moss along the damp side, and grave-light seeping from the base.
    gfx.fillStyle(0x3f5a3a, 0.75);
    gfx.fillEllipse(25, 34, 6, 14);
    gfx.fillEllipse(24, 44, 8, 6);
    gfx.fillStyle(0x2e1440, 1);
    gfx.fillEllipse(16, 46, 30, 10);
    gfx.fillStyle(0x552266, 0.9);
    gfx.fillEllipse(16, 45, 24, 7);
    gfx.fillStyle(0x9955ee, 0.55);
    gfx.fillEllipse(16, 45, 14, 4);
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
