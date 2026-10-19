import Phaser from 'phaser';
import { HUSK_VARIANTS, CORRUPT_KIN, huskTextureKey } from '../invasion/HuskVariants';

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

/**
 * The classic element body, as Fire/Water/Ice wear it: one hue, banded dark rim → light core
 * pooling low, a rim light along the crown and a single specular glint. Paints into the 48×48
 * canvas at radius 22 (the physics body) — call `generateTexture` after.
 *
 * This is the *base*. An element's identity belongs in the rig's accessories on top of it,
 * not printed onto the orb — a patterned body plus a costume plus props is what turned the
 * roster into clutter.
 */
export interface OrbTones {
  /** Outermost ring — the darkest shade of the hue. */
  rim: number;
  shell: number;
  body: number;
  mid: number;
  /** The light pooled low in the orb. */
  core: number;
  /** Rim light along the crown. */
  light: number;
  /** Specular glint; defaults to white. */
  glint?: number;
}

export function bakeOrb(gfx: Phaser.GameObjects.Graphics, t: OrbTones): void {
  gfx.clear();
  gfx.fillStyle(t.rim, 1);
  gfx.fillCircle(24, 24, 22);
  gfx.fillStyle(t.shell, 1);
  gfx.fillCircle(24, 24, 19.5);
  gfx.fillStyle(t.body, 1);
  gfx.fillCircle(24, 25, 16);
  gfx.fillStyle(t.mid, 1);
  gfx.fillCircle(24, 26.5, 12);
  gfx.fillStyle(t.core, 0.85);
  gfx.fillEllipse(24, 31, 16, 8);
  gfx.lineStyle(2.5, t.light, 0.9);
  gfx.strokeCircle(24, 24, 21);
  gfx.lineStyle(2, t.light, 0.55);
  gfx.beginPath();
  gfx.arc(24, 24, 18.5, Math.PI * 1.15, Math.PI * 1.85);
  gfx.strokePath();
  gfx.fillStyle(t.glint ?? 0xffffff, 0.85);
  gfx.fillEllipse(17.5, 16, 8, 5);
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

    // Air element texture — a plain pale-sky orb in Air's palette (slate → steel → sky → mist).
    // No shear bands printed on it: the fan crest AirAvatar wears is the dancer.
    bakeOrb(gfx, { rim: 0x445668, shell: 0x6688aa, body: 0x88aacc, mid: 0xaaddff, core: 0xccddff, light: 0xe4f2ff, glint: 0xffffff });
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

    // Earth element texture — a plain clay-brown orb in Earth's palette (umber → clay → sand).
    // No strata or cracks printed on it: the standing-stone crown EarthAvatar wears is the rock.
    bakeOrb(gfx, { rim: 0x342b20, shell: 0x5b4c39, body: 0x6d5c45, mid: 0x887755, core: 0xa8926c, light: 0xccaa66, glint: 0xe3d2a8 });
    gfx.generateTexture('elem-earth', 48, 48);

    // Oil element texture: a glossy orb of crude — tar rim to a warm brown core, an amber rim
    // light, and a pale teal glint for the interference film on the surface.
    bakeOrb(gfx, { rim: 0x07050a, shell: 0x140d08, body: 0x2b1c0c, mid: 0x3d2812, core: 0x5a3a12, light: 0xc47a2a, glint: 0xa8ece2 });
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

    // Hunt element texture — human form: a plain gunpowder-ember orb (HUNTER_TONES). The hood
    // HuntAvatar wears on the crown is the hunter; the body only says "hunt" by its colour.
    bakeOrb(gfx, { rim: 0x3d1a0e, shell: 0x7a2c06, body: 0xa83a02, mid: 0xcc4400, core: 0xff6600, light: 0xffaa44, glint: 0xffe0b0 });
    gfx.generateTexture('elem-hunt', 48, 48);

    // Hunt beast form — a plain blood-red orb (BEAST_TONES); the wolf ears on the crown are the
    // beast.
    bakeOrb(gfx, { rim: 0x2c0606, shell: 0x5a0808, body: 0x8b0000, mid: 0xa80c0c, core: 0xcc1111, light: 0xff2222, glint: 0xffd0c8 });
    gfx.generateTexture('elem-hunt-beast', 48, 48);

    // Hunt hybrid form — a plain monster-hunter-silver orb (SILVER_TONES); half-grown wolf ears
    // on the crown say he is caught between the two.
    bakeOrb(gfx, { rim: 0x2e3238, shell: 0x4f555e, body: 0x6f767f, mid: 0x9aa0ab, core: 0xc4c8d2, light: 0xdddde6, glint: 0xffffff });
    gfx.generateTexture('elem-hunt-hybrid', 48, 48);

    // Gravity element texture: a plain violet orb — abyss rim to an amethyst core. The ringed
    // planet look comes from the ring GravityAvatar orbits over the crown, not the body.
    bakeOrb(gfx, { rim: 0x1a0a2e, shell: 0x2d1155, body: 0x5511aa, mid: 0x7030c0, core: 0x8844cc, light: 0xaa55ee, glint: 0xe8dcff });
    gfx.generateTexture('elem-gravity', 48, 48);

    // Creation element texture: a plain forged-copper orb — soot rim to an ember core. The
    // smith's gear turns over the crown in CreationAvatar; the body only says "creation".
    bakeOrb(gfx, { rim: 0x2a1206, shell: 0x4a2c14, body: 0x8a4a1c, mid: 0xa8551f, core: 0xcc6622, light: 0xee8833, glint: 0xffee99 });
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

    // Time element texture: a plain orb of polished brass — leather-dark rim to a noon-gold core.
    // The gunslinger's hat (TimeAvatar) carries the character; the body only says "time".
    bakeOrb(gfx, { rim: 0x3a2610, shell: 0x5a3a18, body: 0xb8862b, mid: 0xd9a838, core: 0xffdd44, light: 0xffee88, glint: 0xfff6c8 });
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

    // Fate element body: a plain jade orb — felt-green rim to a mint core. The fan of cards is
    // worn over the crown by FateAvatar; nothing is printed on the body.
    bakeOrb(gfx, { rim: 0x0d3b2e, shell: 0x1d6652, body: 0x2a8870, mid: 0x44bb99, core: 0x66d4b2, light: 0x88eecc, glint: 0xfffdf4 });
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

    // Sound element texture: a plain orb in the drum major's deep maroon, with a rose rim light.
    // The character is told by the shako the rig wears and the baton out on the field.
    bakeOrb(gfx, { rim: 0x1e040a, shell: 0x3a0812, body: 0x5c1020, mid: 0x7a1a2e, core: 0x9e2a42, light: 0xd06a80, glint: 0xffe8ee });
    gfx.generateTexture('elem-sound', 48, 48);

    // Light element texture: a star. A pale gold body shading into a white-hot core, with a
    // four-point starburst standing out of it and a smaller diagonal one behind, so the icon
    // reads as something shining rather than a coloured bead. Nothing exceeds radius 23.5.
    gfx.clear();
    gfx.fillStyle(0x14110a, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0xffaa22, 1);
    gfx.fillCircle(24, 24, 20);
    gfx.fillStyle(0xffdd44, 1);
    gfx.fillCircle(24, 24, 16.5);
    gfx.fillStyle(0xfff4a8, 1);
    gfx.fillCircle(23, 23, 12);
    gfx.fillStyle(0xffffcc, 1);
    gfx.fillCircle(22, 22, 7.5);
    // Diagonal rays, behind the main burst and shorter.
    gfx.fillStyle(0xfff4a8, 0.85);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const c = Math.cos(a), s = Math.sin(a);
      gfx.fillTriangle(24 + c * 15, 24 + s * 15, 24 - s * 2.4, 24 + c * 2.4, 24 + s * 2.4, 24 - c * 2.4);
    }
    // The main burst: four long points, white with a gold edge.
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const c = Math.cos(a), s = Math.sin(a);
      gfx.fillStyle(0xffdd44, 1);
      gfx.fillTriangle(24 + c * 21, 24 + s * 21, 24 - s * 3.6, 24 + c * 3.6, 24 + s * 3.6, 24 - c * 3.6);
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(24 + c * 19, 24 + s * 19, 24 - s * 1.8, 24 + c * 1.8, 24 + s * 1.8, 24 - c * 1.8);
    }
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(23, 23, 4.5);
    gfx.lineStyle(2.4, 0xfff4a8, 1);
    gfx.strokeCircle(24, 24, 21.5);
    gfx.fillStyle(0xffffff, 0.55);
    gfx.fillEllipse(17, 14, 10, 5);
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

    // Magnet element texture: a plain orb of the element's crimson (MAGNET.red). The horseshoe
    // the rig wears on its crown and the red/blue pole hands carry the magnet; the body is clean.
    // (magnet-rod, proj-nail, magnet-orb and magnet-wall used to live here. MagnetKit draws
    // every one of those itself now, and nothing referenced the textures, so they are gone.)
    bakeOrb(gfx, { rim: 0x2e0810, shell: 0x76132a, body: 0x8c1832, mid: 0xa01c3a, core: 0xbb2442, light: 0xff4488, glint: 0xff99bb });
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

    // Metal element texture — a plain orb of forged steel (METAL.iron → steel → chrome). The
    // blade crest the rig wears on its crown says "edges"; the body is clean polished plate.
    bakeOrb(gfx, { rim: 0x1c2026, shell: 0x3e4650, body: 0x5c6672, mid: 0x75828f, core: 0x8fa0b0, light: 0xc9d6e2 });
    gfx.generateTexture('elem-metal', 48, 48);

    // Gunpowder element texture — a plain orb of charged powder in the element's funeral
    // violet (GUNPOWDER.void → plum → violet), an orchid rim light. The musketeer is told by
    // the shako the rig wears on top, not by anything printed on the body.
    bakeOrb(gfx, { rim: 0x140a1c, shell: 0x2a0c40, body: 0x440066, mid: 0x5a1880, core: 0x8a3ab0, light: 0xcc44ff, glint: 0xe0a8ff });
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

    // Rubber element texture — a plain glossy gum ball in the element's pink (RUBBER.maroon →
    // rose → blush). The spring on the rig's crown is the character; the body only says "rubber".
    bakeOrb(gfx, {
      rim: 0x5a1022, shell: 0x992233, body: 0xcc3355, mid: 0xff5577,
      core: 0xff77aa, light: 0xffaacc, glint: 0xffffff,
    });
    gfx.generateTexture('elem-rubber', 48, 48);
    gfx.clear();

    // ── Magic element (abstract combined: slime + light) ─────────────────────

    // elem-magic — a plain arcane orb in one violet hue: ink rim to an orchid core, a purple
    // rim light. The wizard hat (MagicAvatar.drawExtras) carries the character.
    bakeOrb(gfx, { rim: 0x1a0a2e, shell: 0x2e1250, body: 0x552288, mid: 0x6e30b0, core: 0x9944ff, light: 0xcc88ff, glint: 0xf0dcff });
    gfx.generateTexture('elem-magic', 48, 48);
    gfx.clear();

    // fx-chicken — Magic Mastery Transmogrify. A proper hen in three-quarter view facing right:
    // tail plumes, a scalloped wing, comb and wattle, scaly legs. The lilac rim is the tell that
    // this is somebody who *was* a fighter a moment ago, not scenery.
    {
      const CH = {
        shade: 0xc9c4bb,   // underside / the side the light misses
        body: 0xfaf7ef,    // the hen herself
        lit: 0xffffff,     // top face
        outline: 0x8b8478,
        comb: 0xdd3322,
        combLit: 0xff5f4a,
        beak: 0xf0a020,
        beakLit: 0xffc844,
        leg: 0xe89020,
        eye: 0x241426,
        rim: 0xcc99ff,
      };
      // Tail — three plumes sweeping up and back, drawn first so the body overlaps their roots.
      for (const [i, [tx, ty, tw, th, rot]] of ([
        [9, 20, 17, 7, -0.85], [6, 25, 19, 7, -0.42], [7, 31, 16, 6, -0.05],
      ] as const).entries()) {
        gfx.fillStyle(i === 1 ? CH.lit : CH.shade, 1);
        gfx.save();
        gfx.translateCanvas(tx, ty);
        gfx.rotateCanvas(rot);
        gfx.fillEllipse(0, 0, tw, th);
        gfx.lineStyle(1.4, CH.outline, 0.8);
        gfx.strokeEllipse(0, 0, tw, th);
        gfx.restore();
      }
      // Legs — scaly shanks with three toes each, behind the body.
      gfx.lineStyle(2.6, CH.leg, 1);
      for (const lx of [19, 26]) {
        gfx.beginPath();
        gfx.moveTo(lx, 36); gfx.lineTo(lx - 1, 43);
        gfx.strokePath();
        gfx.lineStyle(2, CH.leg, 1);
        for (const toe of [-4, 0, 4]) {
          gfx.beginPath();
          gfx.moveTo(lx - 1, 43); gfx.lineTo(lx - 1 + toe, 46);
          gfx.strokePath();
        }
        gfx.lineStyle(2.6, CH.leg, 1);
      }
      // Body — plump egg, shaded underneath and lit along the back.
      gfx.fillStyle(CH.shade, 1);
      gfx.fillEllipse(21, 30, 32, 26);
      gfx.fillStyle(CH.body, 1);
      gfx.fillEllipse(21, 28, 31, 24);
      gfx.fillStyle(CH.lit, 0.85);
      gfx.fillEllipse(21, 24, 24, 13);
      gfx.lineStyle(1.6, CH.outline, 0.85);
      gfx.strokeEllipse(21, 28, 31, 24);
      // Wing — three overlapping feather scallops, the covert above them.
      gfx.fillStyle(CH.lit, 1);
      gfx.fillEllipse(20, 26, 18, 11);
      gfx.lineStyle(1.4, CH.outline, 0.7);
      gfx.strokeEllipse(20, 26, 18, 11);
      gfx.fillStyle(CH.shade, 0.9);
      for (const fx2 of [14, 19, 24]) {
        gfx.fillCircle(fx2, 30, 4);
      }
      gfx.lineStyle(1.2, CH.outline, 0.6);
      for (const fx2 of [14, 19, 24]) {
        gfx.strokeCircle(fx2, 30, 4);
      }
      // Neck and head.
      gfx.fillStyle(CH.body, 1);
      gfx.fillEllipse(33, 20, 15, 17);
      gfx.fillStyle(CH.lit, 0.9);
      gfx.fillEllipse(33, 17, 11, 9);
      gfx.lineStyle(1.5, CH.outline, 0.85);
      gfx.strokeEllipse(33, 20, 15, 17);
      // Comb — three fleshy points along the crown.
      gfx.fillStyle(CH.comb, 1);
      gfx.fillCircle(29, 11, 3.4);
      gfx.fillCircle(33, 9, 3.8);
      gfx.fillCircle(37, 11, 3.2);
      gfx.fillStyle(CH.combLit, 0.75);
      gfx.fillCircle(32, 8, 2);
      // Wattle under the chin.
      gfx.fillStyle(CH.comb, 1);
      gfx.fillEllipse(38, 27, 5, 7);
      // Beak — upper and lower mandible, slightly parted.
      gfx.fillStyle(CH.beak, 1);
      gfx.beginPath();
      gfx.moveTo(39, 19); gfx.lineTo(47, 21); gfx.lineTo(39, 23);
      gfx.closePath();
      gfx.fillPath();
      gfx.fillStyle(CH.beakLit, 1);
      gfx.beginPath();
      gfx.moveTo(39, 19); gfx.lineTo(46, 20.6); gfx.lineTo(39, 21);
      gfx.closePath();
      gfx.fillPath();
      // Eye — dark bead with a glint.
      gfx.fillStyle(CH.eye, 1);
      gfx.fillCircle(36, 17, 2.6);
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillCircle(36.9, 16.1, 0.9);
      // The spell still clinging to her.
      gfx.lineStyle(1.6, CH.rim, 0.45);
      gfx.strokeEllipse(21, 28, 33, 26);
      gfx.strokeEllipse(33, 20, 17, 19);
      gfx.generateTexture('fx-chicken', 48, 48);
      gfx.clear();
    }

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

    // elem-technology — a plain orb of screen-light in one teal hue: a near-black bezel rim to
    // a mint core, with a phosphor rim light. The antenna (TechnologyAvatar.drawExtras) carries
    // the character.
    bakeOrb(gfx, { rim: 0x061a16, shell: 0x0d3a32, body: 0x17645a, mid: 0x23887a, core: 0x44ccaa, light: 0x88ffee, glint: 0xe0fff8 });
    gfx.generateTexture('elem-technology', 48, 48);
    gfx.clear();

    // (No proj-tech-cruncher texture: the Cruncher is painted per frame by TechnologyVisuals
    // so its mouth can actually chomp, which a stamped triangle could never do.)

    // ── Echo element (abstract combined: fate + light) ───────────────────────

    // elem-echo — a plain dusk-indigo orb (ECHO.umbra → dusk → slate) with a lilac rim light so
    // it still separates from the dark it lives in. The bat ears on the rig are the character.
    bakeOrb(gfx, {
      rim: 0x141228, shell: 0x221f44, body: 0x3b3566, mid: 0x4a4f8a,
      core: 0x5a63a0, light: 0xccccff, glint: 0xe8ecff,
    });
    gfx.generateTexture('elem-echo', 48, 48);
    gfx.clear();

    // ── Subterfuge element (abstract combined: slime + fate; id 'subterfuge') ───

    // elem-subterfuge — 48×48: a plain crimson orb, dark wine rim to a scarlet heart. The house
    // colour is the whole body; the suit and the money live in the rig's fedora, not here.
    bakeOrb(gfx, {
      rim: 0x2a080c, shell: 0x55141c, body: 0x8a1824, mid: 0xb01e2c,
      core: 0xdd3344, light: 0xff6670, glint: 0xffd6da,
    });
    gfx.generateTexture('elem-subterfuge', 48, 48);
    gfx.clear();

    // proj-subterfuge — 10×10 pellet: a black round with a red jacket and a lit tip.
    gfx.fillStyle(0x0a0a0a, 1);
    gfx.fillCircle(5, 5, 5);
    gfx.fillStyle(0xcc2233, 1);
    gfx.fillCircle(5, 5, 3.4);
    gfx.fillStyle(0xffdd33, 1);
    gfx.fillCircle(4, 4, 1.5);
    gfx.generateTexture('proj-subterfuge', 10, 10);
    gfx.clear();

    // ── Quantum element (bonds two other elements; swaps between them on dodge) ──

    // elem-quantum — 48×48 menu icon: a Bohr atom. Three electron shells at 60° to each
    // other, a hot nucleus, and one electron riding each shell. Quantum fires nothing of
    // its own, so there is no proj- texture to match this: it borrows the bonded half's.
    gfx.fillStyle(0x061014, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.lineStyle(3, 0x7df9ff, 1);
    gfx.strokeCircle(24, 24, 22);

    // Shells: a rotated ellipse has no Graphics primitive, so each one is walked out as a
    // parametric polyline. Two passes — a wide dim pass under a narrow bright one — so the
    // orbits read as glowing wire rather than as flat strokes.
    const shell = (rot: number, rx: number, ry: number): void => {
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const at = (a: number): [number, number] => {
        const ex = Math.cos(a) * rx;
        const ey = Math.sin(a) * ry;
        return [24 + ex * cos - ey * sin, 24 + ex * sin + ey * cos];
      };
      for (const [w, alpha] of [[3.2, 0.28], [1.4, 0.95]] as Array<[number, number]>) {
        gfx.lineStyle(w, 0x7df9ff, alpha);
        gfx.beginPath();
        const [sx, sy] = at(0);
        gfx.moveTo(sx, sy);
        for (let i = 1; i <= 48; i++) {
          const [px, py] = at((i / 48) * Math.PI * 2);
          gfx.lineTo(px, py);
        }
        gfx.closePath();
        gfx.strokePath();
      }
      return undefined;
    };
    shell(0, 17, 6.5);
    shell(Math.PI / 3, 17, 6.5);
    shell((Math.PI * 2) / 3, 17, 6.5);

    // Electrons — one per shell, each parked at a different phase so the icon does not
    // read as symmetrical at a glance.
    const electron = (rot: number, a: number): void => {
      const ex = Math.cos(a) * 17;
      const ey = Math.sin(a) * 6.5;
      const px = 24 + ex * Math.cos(rot) - ey * Math.sin(rot);
      const py = 24 + ex * Math.sin(rot) + ey * Math.cos(rot);
      gfx.fillStyle(0xd8fdff, 1);
      gfx.fillCircle(px, py, 2.4);
      gfx.fillStyle(0x7df9ff, 0.5);
      gfx.fillCircle(px, py, 3.8);
    };
    electron(0, 0.35);
    electron(Math.PI / 3, 2.6);
    electron((Math.PI * 2) / 3, 4.4);

    // Nucleus: a blown-out core, so the centre is the brightest thing in the icon.
    gfx.fillStyle(0x7df9ff, 0.30);
    gfx.fillCircle(24, 24, 8);
    gfx.fillStyle(0xbdf6ff, 0.75);
    gfx.fillCircle(24, 24, 5.2);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(24, 24, 3.2);
    gfx.generateTexture('elem-quantum', 48, 48);
    gfx.clear();

    // quantum-body — the fighter a Quantum wears all fight, whichever element is live. Just
    // the orb: the shells, electrons and ghosting are QuantumAvatar's, drawn live round it, so
    // the face stays clear and nothing here has to read at icon size.
    gfx.fillStyle(0x0b2d40, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0x0f4560, 1);
    gfx.fillCircle(23, 22.5, 18);
    gfx.fillStyle(0x146a8a, 0.9);
    gfx.fillCircle(22, 21, 12.5);
    // A nucleus low in the belly, below the eyes, so the brightest point never sits on the face.
    gfx.fillStyle(0x7df9ff, 0.35);
    gfx.fillCircle(24, 32, 7);
    gfx.fillStyle(0xeaffff, 0.9);
    gfx.fillCircle(24, 32, 3);
    gfx.lineStyle(2.5, 0x7df9ff, 0.95);
    gfx.strokeCircle(24, 24, 21);
    gfx.lineStyle(1.6, 0xb07dff, 0.55);
    gfx.beginPath();
    gfx.arc(24, 24, 18.5, Math.PI * 0.15, Math.PI * 0.85);
    gfx.strokePath();
    gfx.fillStyle(0xffffff, 0.75);
    gfx.fillEllipse(16.5, 13.5, 8, 4.5);
    gfx.generateTexture('quantum-body', 48, 48);
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
    //
    // Only four Silence textures survive the visual pass: the menu icon, and the three
    // forms a Fighter is actually re-skinned into. Everything else Silence owns — watchers,
    // grabbers, vultures, teeth, effigies, kin — is drawn per frame by SilenceVisuals, so
    // it can blink, chew, sag and track you rather than sitting there as a stamp.

    // elem-silence — a plain orb of dark fog in one plum hue: near-black rim to an amethyst
    // core, with an orchid rim light. The eye-stalk (SilenceAvatar.drawExtras) carries the
    // character.
    bakeOrb(gfx, { rim: 0x05000a, shell: 0x1a0022, body: 0x2a1038, mid: 0x3a1850, core: 0x6622aa, light: 0x8844cc, glint: 0xcc99ff });
    gfx.generateTexture('elem-silence', 48, 48);
    gfx.clear();

    // silence-blob — 110×110 hallway horror. The live mass of eyes, hands and teeth is
    // painted over this every frame; what the texture carries is the bulk underneath it,
    // so the moving parts have something solid to sit on.
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399;
      const d = 18 * Math.abs(Math.sin(i * 1.7));
      gfx.fillStyle(i % 3 === 0 ? 0x0a0010 : 0x05000a, 1);
      gfx.fillCircle(55 + Math.cos(a) * d, 58 + Math.sin(a) * d * 0.85, 30 + (i % 4) * 6);
    }
    gfx.fillStyle(0x05000a, 1);
    gfx.fillCircle(55, 58, 48);
    // A wet rim highlight along the top so the mass reads as three-dimensional.
    gfx.lineStyle(3, 0x2a1038, 0.8);
    gfx.beginPath();
    gfx.arc(55, 58, 46, Math.PI * 1.15, Math.PI * 1.95);
    gfx.strokePath();
    gfx.generateTexture('silence-blob', 110, 110);
    gfx.clear();

    // silence-striker — 56×56 werewolf horror: hunched shoulders, a jagged fur silhouette,
    // ears, a snout full of teeth and eyes that are already burning.
    // Fur: an irregular ring of tapering spikes, longest across the shoulders.
    gfx.fillStyle(0x0a0010, 1);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const shoulder = 1 + 0.4 * Math.abs(Math.cos(a));
      const l = 22 * shoulder * (0.82 + 0.3 * Math.abs(Math.sin(i * 2.7)));
      const w = 0.11;
      gfx.fillTriangle(
        28 + Math.cos(a - w) * 17, 30 + Math.sin(a - w) * 17,
        28 + Math.cos(a + w) * 17, 30 + Math.sin(a + w) * 17,
        28 + Math.cos(a) * l, 30 + Math.sin(a) * l,
      );
    }
    gfx.fillStyle(0x1a0022, 1);
    gfx.fillCircle(28, 30, 18);
    gfx.fillStyle(0x0a0010, 1);
    gfx.fillCircle(28, 30, 15);
    // Ears.
    for (const side of [-1, 1]) {
      gfx.fillStyle(0x0a0010, 1);
      gfx.fillTriangle(28 + side * 8, 18, 28 + side * 15, 20, 28 + side * 11, 5);
      gfx.fillStyle(0x442255, 1);
      gfx.fillTriangle(28 + side * 9.5, 17, 28 + side * 13, 18.5, 28 + side * 11, 9);
    }
    // Snout: a wedge pushed forward, gums and a double row of teeth.
    gfx.fillStyle(0x0a0010, 1);
    gfx.fillTriangle(20, 34, 36, 34, 28, 50);
    gfx.fillStyle(0x661122, 1);
    gfx.fillTriangle(22, 36, 34, 36, 28, 47);
    gfx.fillStyle(0xddddcc, 1);
    for (let i = 0; i < 5; i++) {
      const tx = 23 + i * 2.6;
      gfx.fillTriangle(tx, 36, tx + 1.8, 36, tx + 0.9, 41 - Math.abs(i - 2) * 1.1);
      gfx.fillTriangle(tx, 46 - Math.abs(i - 2) * 1.4, tx + 1.8, 46 - Math.abs(i - 2) * 1.4, tx + 0.9, 41);
    }
    // Burning eyes, deep-set under a brow.
    for (const side of [-1, 1]) {
      gfx.fillStyle(0x05000a, 1);
      gfx.fillEllipse(28 + side * 6.5, 27, 9, 6);
      gfx.fillStyle(0xff2233, 1);
      gfx.fillEllipse(28 + side * 6.5, 27, 6, 3.6);
      gfx.fillStyle(0xffffff, 0.85);
      gfx.fillCircle(28 + side * 5.4, 26.2, 1.2);
    }
    gfx.lineStyle(2, 0x05000a, 1);
    gfx.lineBetween(20, 23, 26, 25);
    gfx.lineBetween(36, 23, 30, 25);
    gfx.generateTexture('silence-striker', 56, 56);
    gfx.clear();

    // silence-awakened — 72×72 the host cracked open. SilenceVisuals paints the split shell,
    // the limbs and what is looking out of it every frame; the texture is the pale husk it
    // all hangs on, so there is a body under the moving parts.
    gfx.fillStyle(0x05000a, 0.5);
    gfx.fillEllipse(36, 54, 46, 14);
    gfx.fillStyle(0xddddcc, 0.55);
    gfx.fillCircle(36, 34, 21);
    gfx.fillStyle(0x0a0010, 0.9);
    gfx.fillEllipse(36, 34, 10, 40);
    // Hairline fractures spreading off the split.
    gfx.lineStyle(1.4, 0x05000a, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      gfx.lineBetween(36, 34 + (i - 2.5) * 4, 36 + Math.cos(a) * 20, 34 + (i - 2.5) * 4 + Math.sin(a) * 12);
    }
    gfx.generateTexture('silence-awakened', 72, 72);
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
    // stays legible against the arena floor at either extreme. Elemental
    // variants also wear their element's glyph on the chest, and tiers II/III
    // grow horns and a crown so the dangerous ones read across the room.
    const drawHuskMarker = (marker: string, mc: number, md: number): void => {
      // Chest badge centred at (33, 31), ~6px — a heraldic patch of the element.
      const mx = 33, my = 31;
      gfx.fillStyle(md, 0.85);
      gfx.fillCircle(mx, my, 7.5);
      gfx.lineStyle(1, mc, 0.9);
      gfx.strokeCircle(mx, my, 7.5);
      switch (marker) {
        case 'flame':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 4, my + 4, mx, my - 5, mx + 4, my + 4);
          gfx.fillTriangle(mx - 2, my + 4, mx + 1, my - 1, mx + 3, my + 4);
          break;
        case 'droplet':
        case 'wave':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx, my - 5, mx - 3.5, my + 1, mx + 3.5, my + 1);
          gfx.fillCircle(mx, my + 1.5, 3.5);
          if (marker === 'wave') { gfx.lineStyle(1, md, 1); gfx.lineBetween(mx - 4, my + 3, mx + 4, my + 3); }
          break;
        case 'leaf':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx, my, 8, 5);
          gfx.lineStyle(1, md, 1);
          gfx.lineBetween(mx - 4, my, mx + 4, my);
          break;
        case 'gust':
          gfx.lineStyle(1.5, mc, 1);
          gfx.lineBetween(mx - 4, my - 3, mx + 4, my - 3);
          gfx.lineBetween(mx - 5, my, mx + 3, my);
          gfx.lineBetween(mx - 3, my + 3, mx + 5, my + 3);
          break;
        case 'rock':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 4, my + 4, mx - 1, my - 4, mx + 2, my + 4);
          gfx.fillTriangle(mx, my + 4, mx + 3, my - 2, mx + 5, my + 4);
          break;
        case 'brick':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 5, my - 4, 10, 8);
          gfx.lineStyle(1, md, 1);
          gfx.lineBetween(mx - 5, my, mx + 5, my);
          gfx.lineBetween(mx, my - 4, mx, my);
          break;
        case 'slick':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx - 2, my, 3);
          gfx.fillCircle(mx + 2, my + 2, 2.4);
          gfx.fillCircle(mx + 1, my - 3, 1.8);
          break;
        case 'cross':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 1.2, my - 5, 2.4, 10);
          gfx.fillRect(mx - 4, my - 2.6, 8, 2.4);
          break;
        case 'crescent':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 4.5);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx + 2, my - 1, 3.8);
          break;
        case 'snow':
          gfx.lineStyle(1.5, mc, 1);
          for (let a = 0; a < 6; a++) {
            const r = (a / 6) * Math.PI * 2;
            gfx.lineBetween(mx, my, mx + Math.cos(r) * 5, my + Math.sin(r) * 5);
          }
          break;
        case 'gem':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 4, my - 1, mx + 4, my - 1, mx, my + 5);
          gfx.fillTriangle(mx - 2.5, my - 4, mx + 2.5, my - 4, mx + 4, my - 1);
          gfx.fillTriangle(mx - 2.5, my - 4, mx - 4, my - 1, mx + 4, my - 1);
          break;
        case 'ghost':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my - 1, 3.5);
          gfx.fillRect(mx - 3.5, my - 1, 7, 4);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx - 1.4, my - 1.5, 0.9);
          gfx.fillCircle(mx + 1.4, my - 1.5, 0.9);
          break;
        case 'fang':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 4, my - 3, mx - 1, my - 3, mx - 2.5, my + 4);
          gfx.fillTriangle(mx + 1, my - 3, mx + 4, my - 3, mx + 2.5, my + 4);
          break;
        case 'hourglass':
          gfx.lineStyle(1.5, mc, 1);
          gfx.strokeRect(mx - 3.5, my - 4.5, 7, 9);
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 3, my - 4, mx + 3, my - 4, mx, my);
          gfx.fillTriangle(mx - 3, my + 4, mx + 3, my + 4, mx, my);
          break;
        case 'ring':
          gfx.lineStyle(1.5, mc, 1);
          gfx.strokeEllipse(mx, my, 10, 4);
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 2.2);
          break;
        case 'hammer':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 1, my - 2, 2, 7);
          gfx.fillRect(mx - 4, my - 5, 8, 4);
          break;
        case 'bolt':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx + 2, my - 5, mx - 3, my + 1, mx + 0.5, my + 1);
          gfx.fillTriangle(mx - 2, my + 5, mx + 3, my - 1, mx - 0.5, my - 1);
          break;
        case 'flask':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx - 2, my + 1, 2.6);
          gfx.fillCircle(mx + 2, my - 1, 2);
          gfx.fillCircle(mx + 1, my + 3, 1.6);
          break;
        case 'card':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 3, my - 4.5, 6, 9);
          gfx.lineStyle(1, md, 1);
          gfx.strokeRect(mx - 3, my - 4.5, 6, 9);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx, my, 1.4);
          break;
        case 'note':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx - 2, my + 3, 4.5, 3.5);
          gfx.fillRect(mx - 0.4, my - 4, 1.6, 7);
          gfx.fillRect(mx - 0.4, my - 4.5, 4.5, 2);
          break;
        case 'star':
          gfx.fillStyle(mc, 1);
          for (let a = 0; a < 4; a++) {
            const r = (a / 4) * Math.PI;
            gfx.fillTriangle(
              mx + Math.cos(r) * 5.5, my + Math.sin(r) * 5.5,
              mx + Math.cos(r + Math.PI / 2) * 1.4, my + Math.sin(r + Math.PI / 2) * 1.4,
              mx - Math.cos(r + Math.PI / 2) * 1.4, my - Math.sin(r + Math.PI / 2) * 1.4,
            );
          }
          break;
        case 'magnet':
          gfx.lineStyle(2.4, mc, 1);
          gfx.beginPath();
          gfx.arc(mx, my - 1, 3.6, Math.PI, 0, false);
          gfx.strokePath();
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 5, my - 1, 2.4, 4.5);
          gfx.fillRect(mx + 2.6, my - 1, 2.4, 4.5);
          break;
        case 'gear':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 3.4);
          for (let a = 0; a < 6; a++) {
            const r = (a / 6) * Math.PI * 2;
            gfx.fillRect(mx + Math.cos(r) * 4.4 - 1, my + Math.sin(r) * 4.4 - 1, 2, 2);
          }
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx, my, 1.4);
          break;
        case 'orb':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 4);
          gfx.fillStyle(md, 0.8);
          gfx.fillCircle(mx + 1.4, my - 1.4, 1.4);
          break;
        case 'skull':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my - 1, 4);
          gfx.fillRect(mx - 2.4, my + 1, 4.8, 3);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx - 1.6, my - 1.4, 1.1);
          gfx.fillCircle(mx + 1.6, my - 1.4, 1.1);
          break;
        case 'ball':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 4.2);
          gfx.lineStyle(1, md, 1);
          gfx.strokeCircle(mx, my, 2.2);
          break;
        case 'book':
        case 'page':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 3.6, my - 4.4, 7.2, 8.8);
          gfx.lineStyle(1, md, 1);
          gfx.lineBetween(mx - 2, my - 2.4, mx + 2, my - 2.4);
          gfx.lineBetween(mx - 2, my, mx + 2, my);
          gfx.lineBetween(mx - 2, my + 2.4, mx + 1, my + 2.4);
          if (marker === 'book') { gfx.lineStyle(1.4, md, 1); gfx.lineBetween(mx, my - 4.4, mx, my + 4.4); }
          break;
        case 'mask':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx, my - 0.5, 9, 6.5);
          gfx.fillStyle(md, 1);
          gfx.fillEllipse(mx - 2, my - 1, 2.4, 1.6);
          gfx.fillEllipse(mx + 2, my - 1, 2.4, 1.6);
          break;
        case 'scribble':
          gfx.lineStyle(1.4, mc, 1);
          gfx.lineBetween(mx - 4, my - 3, mx + 4, my - 2);
          gfx.lineBetween(mx + 4, my - 2, mx - 3, my + 1);
          gfx.lineBetween(mx - 3, my + 1, mx + 3, my + 4);
          break;
        case 'banner':
          gfx.fillStyle(mc, 1);
          gfx.fillRect(mx - 1, my - 5, 1.6, 10);
          gfx.fillTriangle(mx + 0.6, my - 5, mx + 5.5, my - 3, mx + 0.6, my - 1);
          break;
        case 'heart':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx - 1.8, my - 1.4, 2.4);
          gfx.fillCircle(mx + 1.8, my - 1.4, 2.4);
          gfx.fillTriangle(mx - 4, my - 0.4, mx + 4, my - 0.4, mx, my + 4.6);
          break;
        case 'coin':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 4.2);
          gfx.lineStyle(1, md, 1);
          gfx.strokeCircle(mx, my, 2.6);
          gfx.lineBetween(mx, my - 2, mx, my + 2);
          break;
        case 'bone':
          gfx.lineStyle(2, mc, 1);
          gfx.lineBetween(mx - 3, my + 3, mx + 3, my - 3);
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx - 3.6, my + 2, 1.6);
          gfx.fillCircle(mx - 2, my + 3.8, 1.6);
          gfx.fillCircle(mx + 3.6, my - 2, 1.6);
          gfx.fillCircle(mx + 2, my - 3.8, 1.6);
          break;
        case 'eye':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx, my, 9, 5);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx, my, 2);
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx + 0.7, my - 0.7, 0.7);
          break;
        case 'rad':
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 1.6);
          for (let a = 0; a < 3; a++) {
            const r = (a / 3) * Math.PI * 2 - Math.PI / 2;
            gfx.fillTriangle(
              mx + Math.cos(r - 0.5) * 5.5, my + Math.sin(r - 0.5) * 5.5,
              mx + Math.cos(r + 0.5) * 5.5, my + Math.sin(r + 0.5) * 5.5,
              mx + Math.cos(r) * 1.8, my + Math.sin(r) * 1.8,
            );
          }
          break;
        case 'chain':
          gfx.lineStyle(1.4, mc, 1);
          gfx.strokeEllipse(mx - 2.4, my - 1.6, 4, 3);
          gfx.strokeEllipse(mx + 0.4, my + 0.8, 4, 3);
          gfx.strokeEllipse(mx + 3, my + 3, 4, 3);
          break;
        case 'meat':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx - 1, my - 1, 7, 5.5);
          gfx.lineStyle(1.6, mc, 1);
          gfx.lineBetween(mx + 2, my + 1, mx + 4.5, my + 3.5);
          gfx.fillStyle(md, 1);
          gfx.fillCircle(mx + 4.5, my + 3.5, 1.2);
          break;
        case 'echo':
          gfx.lineStyle(1.4, mc, 1);
          gfx.strokeCircle(mx, my, 2);
          gfx.lineStyle(1, mc, 0.7);
          gfx.strokeCircle(mx, my, 4);
          gfx.lineStyle(1, mc, 0.4);
          gfx.strokeCircle(mx, my, 6);
          break;
        case 'dagger':
          gfx.fillStyle(mc, 1);
          gfx.fillTriangle(mx - 1.4, my - 4, mx + 1.4, my - 4, mx, my + 3);
          gfx.fillRect(mx - 3, my + 2.4, 6, 1.6);
          gfx.fillRect(mx - 0.8, my + 4, 1.6, 2);
          break;
        case 'pit':
          gfx.fillStyle(mc, 1);
          gfx.fillEllipse(mx, my + 1, 9, 5);
          gfx.fillStyle(md, 1);
          gfx.fillEllipse(mx, my + 1, 5.5, 2.8);
          break;
        default:
          gfx.fillStyle(mc, 1);
          gfx.fillCircle(mx, my, 3);
          break;
      }
    };

    /**
     * The three tenth-wave bosses. Each gets its own silhouette rather than the
     * branded-husk body, because you are meant to know which of the three walked
     * in from across the room — and each reads its tier off the same three rungs
     * the elemental husks use (inner ring at II, corona and crown at III).
     */
    const drawBoss = (kind: string, color: number, tier: number): void => {
      const lit = lighten(color, 0.55);
      const deep = darken(color, 0.6);

      // Tier III burns a corona behind whichever of the three it is.
      if (tier >= 3) {
        gfx.fillStyle(lit, 0.35);
        gfx.fillCircle(24, 24, 24);
      }

      if (kind === 'arbiter') {
        // A magistrate in a black robe: ivory mantle at the shoulders, a gold
        // band bound over the eyes, and the scales hung on its chest.
        gfx.fillStyle(0x14110a, 1);
        gfx.fillCircle(24, 24, 20);
        gfx.lineStyle(3, color, 1);
        gfx.strokeCircle(24, 24, 20);
        // Mantle: two ivory lobes falling either side of the head.
        gfx.fillStyle(0xe2dcc8, 1);
        gfx.fillEllipse(9, 27, 13, 22);
        gfx.fillEllipse(39, 27, 13, 22);
        gfx.lineStyle(1.2, 0x9a927c, 1);
        gfx.strokeEllipse(9, 27, 13, 22);
        gfx.strokeEllipse(39, 27, 13, 22);
        // The blindfold, with the slit of light under it.
        gfx.fillStyle(color, 1);
        gfx.fillRect(9, 15, 30, 8);
        gfx.fillStyle(deep, 1);
        gfx.fillRect(9, 21, 30, 2);
        gfx.fillStyle(0xfff2c0, 1);
        gfx.fillRect(15, 17.5, 4, 2);
        gfx.fillRect(29, 17.5, 4, 2);
        // Scales: a beam on a post with two hanging pans.
        gfx.lineStyle(2, color, 1);
        gfx.lineBetween(24, 28, 24, 34);
        gfx.lineBetween(15, 30, 33, 30);
        gfx.lineBetween(15, 30, 15, 34);
        gfx.lineBetween(33, 30, 33, 34);
        gfx.fillStyle(lit, 1);
        gfx.fillEllipse(15, 35, 8, 3.5);
        gfx.fillEllipse(33, 35, 8, 3.5);
        if (tier >= 2) {
          // A raised collar of gold plates.
          gfx.fillStyle(lit, 1);
          gfx.fillTriangle(12, 12, 18, 2, 22, 11);
          gfx.fillTriangle(36, 12, 30, 2, 26, 11);
          gfx.lineStyle(1.2, deep, 1);
          gfx.strokeTriangle(12, 12, 18, 2, 22, 11);
          gfx.strokeTriangle(36, 12, 30, 2, 26, 11);
        }
        if (tier >= 3) {
          // A crown of nails driven straight through the band.
          gfx.fillStyle(0xf2e2a0, 1);
          for (const nx of [14, 20, 28, 34]) {
            gfx.fillRect(nx - 1, 1, 2, 12);
            gfx.fillRect(nx - 3, 0, 6, 3);
          }
        }
        return;
      }

      if (kind === 'dreamer') {
        // Something asleep and still coming for you: a soft body, closed eyes,
        // a nightcap fallen over one side, and the sleep rising off it.
        if (tier >= 3) {
          // A crescent moon riding behind its head.
          gfx.fillStyle(0xf2ecff, 0.6);
          gfx.fillCircle(24, 22, 23);
          gfx.fillStyle(0x0d0a1a, 1);
          gfx.fillCircle(31, 19, 21);
        }
        gfx.fillStyle(color, 1);
        gfx.fillCircle(24, 24, 20);
        gfx.fillStyle(lighten(color, 0.3), 0.55);
        gfx.fillCircle(19, 19, 11);
        gfx.lineStyle(3, darken(color, 0.45), 1);
        gfx.strokeCircle(24, 24, 20);
        if (tier >= 2) {
          gfx.lineStyle(2, lit, 0.9);
          gfx.strokeCircle(24, 24, 16);
        }
        // Closed eyes: two lashes curving down.
        gfx.lineStyle(2.4, 0x2a2050, 1);
        gfx.beginPath();
        gfx.arc(17, 21, 5, Math.PI * 0.15, Math.PI * 0.85, false);
        gfx.strokePath();
        gfx.beginPath();
        gfx.arc(31, 21, 5, Math.PI * 0.15, Math.PI * 0.85, false);
        gfx.strokePath();
        // A slack, half-open mouth.
        gfx.fillStyle(0x2a2050, 1);
        gfx.fillEllipse(24, 32, 7, 5);
        // The nightcap, slumped to the left with its pom hanging.
        gfx.fillStyle(0x4a3a8a, 1);
        gfx.fillTriangle(6, 14, 30, 8, 14, -2);
        gfx.fillStyle(0xe8e2ff, 1);
        gfx.fillRect(5, 10, 26, 5);
        gfx.fillCircle(13, -2, 4);
        gfx.lineStyle(1.2, 0x2a2050, 1);
        gfx.strokeTriangle(6, 14, 30, 8, 14, -2);
        // Sleep coming off it, in three sizes.
        gfx.fillStyle(0xf2ecff, 0.95);
        const zAt = (zx: number, zy: number, s: number): void => {
          gfx.fillRect(zx, zy, s, s * 0.28);
          gfx.fillRect(zx, zy + s * 0.72, s, s * 0.28);
          gfx.fillTriangle(zx + s * 0.72, zy, zx + s, zy + s * 0.2, zx + s * 0.28, zy + s);
        };
        zAt(36, 4, 7);
        zAt(41, 13, 5);
        return;
      }

      // paradox — three of itself at once, none of them quite here, with the
      // one solid nucleus they all agree on and rings running through it.
      gfx.fillStyle(0xff5fd0, 0.4);
      gfx.fillCircle(19, 26, 18);
      gfx.fillStyle(0xffe86a, 0.32);
      gfx.fillCircle(29, 22, 18);
      gfx.fillStyle(color, 0.85);
      gfx.fillCircle(24, 24, 19);
      gfx.lineStyle(2.5, lit, 1);
      gfx.strokeCircle(24, 24, 19);
      // Faces from two of the three, offset — neither of them the real one.
      gfx.fillStyle(0x06201f, 0.75);
      gfx.fillCircle(16, 20, 3.4);
      gfx.fillCircle(30, 20, 3.4);
      gfx.fillStyle(0x06201f, 0.4);
      gfx.fillCircle(19, 22, 3);
      gfx.fillCircle(33, 22, 3);
      // Orbital rings — one more per tier, each on its own tilt.
      // Traced by hand rather than strokeEllipse + a canvas transform, so the
      // baked texture never depends on transform state leaking between variants.
      const rings = 1 + Math.min(2, tier - 1);
      for (let i = 0; i < rings; i++) {
        const rot = (i / 3) * Math.PI + 0.5;
        gfx.lineStyle(1.8, lit, 0.85);
        gfx.beginPath();
        for (let s = 0; s <= 26; s++) {
          const a = (s / 26) * Math.PI * 2;
          const ex = Math.cos(a) * 21;
          const ey = Math.sin(a) * 7.5;
          const px = 24 + ex * Math.cos(rot) - ey * Math.sin(rot);
          const py = 24 + ex * Math.sin(rot) + ey * Math.cos(rot);
          if (s === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
        }
        gfx.strokePath();
      }
      // The nucleus they all share.
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(24, 24, tier >= 3 ? 6 : 4.5);
      gfx.fillStyle(color, 1);
      gfx.fillCircle(24, 24, tier >= 3 ? 3.4 : 2.6);
    };

    for (const variant of HUSK_VARIANTS) {
      // The corrupt-kin is not a branded husk — it is what the corruption grows.
      // Baked by hand below so it can wear its own face.
      if (variant.id === 'corrupt-kin') continue;
      // Nor are the three bosses: they get their own bodies, not a branded one.
      if (variant.bossKind) {
        drawBoss(variant.bossKind, variant.color, variant.tier ?? 1);
        gfx.generateTexture(huskTextureKey(variant), 48, 48);
        gfx.clear();
        continue;
      }
      const base = Phaser.Display.Color.IntegerToColor(variant.color);
      const dark = base.red * 0.299 + base.green * 0.587 + base.blue * 0.114 < 90;
      const outline = dark ? lighten(variant.color, 0.45) : darken(variant.color, 0.42);
      const blotch  = lighten(variant.color, dark ? 0.60 : 0.25);
      const feature = dark ? lighten(variant.color, 0.70) : darken(variant.color, 0.22);
      const tier = variant.tier ?? 1;

      // Tier III wears a bright elemental corona behind the body.
      if (tier >= 3) {
        gfx.fillStyle(lighten(variant.color, 0.5), 0.4);
        gfx.fillCircle(24, 24, 24);
        gfx.fillStyle(lighten(variant.color, 0.8), 0.3);
        gfx.fillCircle(24, 24, 22);
      }
      gfx.fillStyle(variant.color, 1);
      gfx.fillCircle(24, 24, 20);
      gfx.lineStyle(3, outline, 1);
      gfx.strokeCircle(24, 24, 20);
      if (tier >= 2) {
        // A second, inner ring — the brand burning deeper.
        gfx.lineStyle(2, lighten(variant.color, dark ? 0.7 : 0.45), 0.9);
        gfx.strokeCircle(24, 24, 16);
      }
      gfx.fillStyle(blotch, 0.6);
      gfx.fillCircle(19, 18, 8); // decayed blotch
      // Tier II grows tall horns in the element's lit colour, dark-edged so
      // they read against both the body and the arena floor; tier III wears a
      // crooked gold crown between them.
      if (tier >= 2) {
        const hornFill = lighten(variant.color, dark ? 0.85 : 0.6);
        const hornEdge = darken(variant.color, 0.55);
        gfx.fillStyle(hornFill, 1);
        gfx.fillTriangle(7, 15, 12, 0, 18, 10);
        gfx.fillTriangle(41, 15, 36, 0, 30, 10);
        gfx.lineStyle(1.5, hornEdge, 1);
        gfx.strokeTriangle(7, 15, 12, 0, 18, 10);
        gfx.strokeTriangle(41, 15, 36, 0, 30, 10);
      }
      if (tier >= 3) {
        gfx.fillStyle(0xf2c53d, 1);
        gfx.fillTriangle(15, 10, 18, 2, 21, 10);
        gfx.fillTriangle(21, 10, 24, 0, 27, 10);
        gfx.fillTriangle(27, 10, 30, 2, 33, 10);
        gfx.fillRect(15, 9, 18, 4);
        gfx.lineStyle(1.5, 0x6b4a12, 1);
        gfx.strokeRect(15, 9, 18, 4);
      }
      // Eyes: vacant at tier 1, lit from within at tier 3.
      gfx.fillStyle(tier >= 3 ? 0x0e0e0e : feature, 1);
      gfx.fillCircle(17, 19, 4);
      gfx.fillCircle(31, 19, 4);
      if (tier >= 3) {
        gfx.fillStyle(lighten(variant.color, 0.75), 1);
        gfx.fillCircle(17, 19, 1.8);
        gfx.fillCircle(31, 19, 1.8);
      }
      gfx.lineStyle(2, feature, 1);
      gfx.lineBetween(16, 31, 22, 33);
      gfx.lineBetween(22, 33, 27, 30);
      gfx.lineBetween(27, 30, 33, 32);
      // The elemental brand on the chest.
      if (variant.marker) {
        drawHuskMarker(variant.marker, dark ? lighten(variant.color, 0.75) : lighten(variant.color, 0.45), darken(variant.color, 0.5));
      }
      gfx.generateTexture(huskTextureKey(variant), 48, 48);
      gfx.clear();
    }

    // ── Corrupt-Kin — the apocalypse's own brood ─────────────────────
    // A husk-shaped hole in the room: near-black tar body with a ragged, weeping
    // edge, a single vast red iris where its face should be, a scatter of lesser
    // eyes budding out of the tar, and four tendrils reaching off the shoulders.
    {
      // Ragged silhouette: the body outline wanders instead of holding a circle.
      const lobes = 22;
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        // Deterministic wobble — no Math.random, so every session bakes the same brood.
        const wob = 19 + Math.sin(a * 3 + 1.1) * 2.2 + Math.sin(a * 7) * 1.4;
        pts.push({ x: 24 + Math.cos(a) * wob, y: 24 + Math.sin(a) * wob });
      }
      // Tendrils first, so the body sits on top of their roots.
      gfx.lineStyle(3, 0x120610, 1);
      for (const [a, len] of [[-2.5, 15], [-0.7, 13], [0.8, 14], [2.4, 12]] as const) {
        let px = 24 + Math.cos(a) * 16;
        let py = 24 + Math.sin(a) * 16;
        for (let s = 1; s <= 3; s++) {
          const na = a + Math.sin(s * 1.7) * 0.5;
          const nx = px + Math.cos(na) * (len / 3);
          const ny = py + Math.sin(na) * (len / 3);
          gfx.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
        gfx.fillStyle(0xcc1133, 1);
        gfx.fillCircle(px, py, 1.6);
      }
      // Weeping halo, then the tar body.
      gfx.fillStyle(0x3a0a20, 0.4);
      gfx.fillCircle(24, 24, 23);
      gfx.fillStyle(0x120610, 1);
      gfx.fillPoints(pts, true, true);
      gfx.lineStyle(2, 0x35102a, 1);
      gfx.strokePoints(pts, true, true);
      // Tar highlights running down the left shoulder.
      gfx.fillStyle(0x2a0e22, 0.9);
      gfx.fillEllipse(17, 18, 12, 9);
      gfx.fillEllipse(14, 27, 7, 11);
      // The great iris.
      gfx.fillStyle(0xf2e6e6, 1);
      gfx.fillEllipse(24, 23, 22, 16);
      gfx.fillStyle(0xcc1133, 1);
      gfx.fillCircle(24, 23, 7.5);
      gfx.fillStyle(0xff4466, 1);
      gfx.fillCircle(24, 23, 5);
      gfx.fillStyle(0x0a0206, 1);
      gfx.fillEllipse(24, 23, 3.4, 7);
      gfx.fillStyle(0xffffff, 0.85);
      gfx.fillCircle(21, 20, 1.6);
      // Veins crawling out of the socket.
      gfx.lineStyle(1, 0x8a1030, 0.85);
      for (const a of [2.4, 3.5, 5.4, 0.5] as const) {
        gfx.lineBetween(24 + Math.cos(a) * 11, 23 + Math.sin(a) * 8, 24 + Math.cos(a) * 17, 23 + Math.sin(a) * 13);
      }
      // Budding lesser eyes.
      for (const [ex, ey, er] of [[13, 33, 3], [34, 32, 2.4], [24, 37, 2.6], [36, 18, 2]] as const) {
        gfx.fillStyle(0xe8dcdc, 1);
        gfx.fillCircle(ex, ey, er);
        gfx.fillStyle(0xcc1133, 1);
        gfx.fillCircle(ex, ey, er * 0.55);
        gfx.fillStyle(0x0a0206, 1);
        gfx.fillCircle(ex, ey, er * 0.24);
      }
      gfx.generateTexture(huskTextureKey(CORRUPT_KIN), 48, 48);
      gfx.clear();
    }

    // Disgraced Knight — the Disgraced King's summon. Not an invasion variant
    // (it never rolls in a wave), so it is baked here by hand: black plate over
    // a rotted body, a slit-visored great helm lit cold from inside, heavy
    // pauldrons and a notched blade held across the chest.
    gfx.fillStyle(0x08060e, 0.5);
    gfx.fillEllipse(24, 44, 30, 8); // ground shadow
    // Torso plate, lit from the upper left so the armour reads as curved metal.
    gfx.fillStyle(0x14101c, 1);
    gfx.fillCircle(24, 25, 17);
    gfx.fillStyle(0x241d33, 1);
    gfx.fillCircle(22, 23, 14);
    gfx.fillStyle(0x342a49, 1);
    gfx.fillCircle(20, 21, 9);
    // Pauldrons — fluted half-discs sitting proud of the torso.
    gfx.fillStyle(0x1a1526, 1);
    gfx.fillEllipse(9, 20, 13, 16);
    gfx.fillEllipse(39, 20, 13, 16);
    gfx.lineStyle(1, 0x4a3d66, 0.8);
    gfx.strokeEllipse(9, 20, 13, 16);
    gfx.strokeEllipse(39, 20, 13, 16);
    // Great helm, with a cold slit where a face should be.
    gfx.fillStyle(0x0d0a14, 1);
    gfx.fillEllipse(24, 15, 22, 20);
    gfx.lineStyle(2, 0x4a3d66, 0.9);
    gfx.strokeEllipse(24, 15, 22, 20);
    gfx.fillStyle(0xb9a3ff, 0.95);
    gfx.fillRect(16, 14, 16, 3);
    gfx.fillStyle(0xe8dcff, 1);
    gfx.fillRect(17, 15, 5, 1.5);
    gfx.fillRect(26, 15, 5, 1.5);
    // Blade across the chest — a notched edge catching the same cold light.
    gfx.lineStyle(3, 0x2c2440, 1);
    gfx.lineBetween(11, 38, 37, 26);
    gfx.lineStyle(1.5, 0x8a76bb, 0.9);
    gfx.lineBetween(12, 37, 36, 26);
    gfx.generateTexture('husk-knight', 48, 48);
    gfx.clear();

    // Disgraced Herald — the knight's ranged cousin. Robed rather than plated,
    // with a hooded skull, a tall standard over one shoulder and a lantern of
    // cold fire held out front (the thing it actually throws at you).
    gfx.fillStyle(0x08060e, 0.5);
    gfx.fillEllipse(24, 44, 26, 7);
    // Standard: a pole with a torn banner, planted behind the body.
    gfx.lineStyle(2, 0x3a2f52, 1);
    gfx.lineBetween(37, 42, 33, 5);
    gfx.fillStyle(0x2a1240, 1);
    gfx.fillTriangle(33, 7, 45, 11, 33, 22);
    gfx.lineStyle(1, 0xb9a3ff, 0.7);
    gfx.lineBetween(33, 7, 45, 11);
    gfx.fillStyle(0xffc44d, 0.85);
    gfx.fillCircle(33, 5, 2.5);
    // Robe — a bell with a lit hem.
    gfx.fillStyle(0x171226, 1);
    gfx.fillTriangle(10, 43, 30, 43, 20, 14);
    gfx.fillStyle(0x241d33, 1);
    gfx.fillTriangle(13, 42, 26, 42, 20, 17);
    gfx.lineStyle(1, 0x6a58a0, 0.7);
    gfx.lineBetween(10, 43, 30, 43);
    // Hood and the skull inside it.
    gfx.fillStyle(0x0d0a14, 1);
    gfx.fillEllipse(20, 15, 20, 21);
    gfx.fillStyle(0x06040a, 1);
    gfx.fillEllipse(20, 16, 13, 15);
    gfx.fillStyle(0xb9a3ff, 0.95);
    gfx.fillCircle(17, 15, 2.4);
    gfx.fillCircle(23, 15, 2.4);
    // Lantern of cold fire, held out at arm's length.
    gfx.lineStyle(2, 0x2c2440, 1);
    gfx.lineBetween(20, 26, 9, 28);
    gfx.fillStyle(0x7b3fd4, 0.5);
    gfx.fillCircle(8, 30, 7);
    gfx.fillStyle(0xb9a3ff, 1);
    gfx.fillCircle(8, 30, 4);
    gfx.fillStyle(0xe8dcff, 1);
    gfx.fillCircle(7, 29, 1.6);
    gfx.generateTexture('husk-herald', 48, 48);
    gfx.clear();

    // Disgraced Lancer — the charger. Same plate as the knight, but leaned
    // forward behind a couched lance, with a spur of speed lines off the heel.
    gfx.fillStyle(0x08060e, 0.5);
    gfx.fillEllipse(24, 44, 30, 8);
    // Speed lines trailing the rear.
    gfx.lineStyle(2, 0x4a3d66, 0.55);
    gfx.lineBetween(2, 20, 12, 22);
    gfx.lineBetween(1, 28, 11, 29);
    gfx.lineBetween(4, 35, 13, 35);
    // Body, hunched forward to the right.
    gfx.fillStyle(0x14101c, 1);
    gfx.fillEllipse(22, 27, 30, 26);
    gfx.fillStyle(0x241d33, 1);
    gfx.fillEllipse(20, 25, 22, 19);
    gfx.fillStyle(0x342a49, 1);
    gfx.fillEllipse(18, 23, 13, 11);
    // Single heavy pauldron on the leading shoulder.
    gfx.fillStyle(0x1a1526, 1);
    gfx.fillEllipse(30, 20, 15, 17);
    gfx.lineStyle(1, 0x4a3d66, 0.85);
    gfx.strokeEllipse(30, 20, 15, 17);
    // Sallet helm, visor forward.
    gfx.fillStyle(0x0d0a14, 1);
    gfx.fillEllipse(24, 13, 21, 17);
    gfx.lineStyle(2, 0x4a3d66, 0.9);
    gfx.strokeEllipse(24, 13, 21, 17);
    gfx.fillStyle(0xff8899, 0.95);
    gfx.fillRect(19, 12, 13, 2.5);
    // The lance: a long tapered shaft with a bright head, couched under the arm.
    gfx.lineStyle(4, 0x2c2440, 1);
    gfx.lineBetween(8, 36, 40, 22);
    gfx.lineStyle(1.5, 0x8a76bb, 0.9);
    gfx.lineBetween(9, 35, 39, 22);
    gfx.fillStyle(0xd8c4ff, 1);
    gfx.fillTriangle(40, 18, 47, 23, 38, 26);
    gfx.fillStyle(0x2a1240, 1);
    gfx.fillCircle(18, 32, 4); // vamplate
    gfx.generateTexture('husk-lancer', 48, 48);
    gfx.clear();

    // Brood — the Devourer's spawn, and the only hard-mode summon. Not a plated
    // thing at all: a wet, segmented grub with a lamprey mouth at the front and
    // a fringe of legs, so a screen of them reads as vermin rather than as more
    // soldiers. Drawn small in the frame because its variant scales to 0.8.
    gfx.fillStyle(0x08040a, 0.5);
    gfx.fillEllipse(24, 40, 26, 7); // ground shadow
    // Body — four overlapping segments tapering back, lit along the top.
    for (let i = 0; i < 4; i++) {
      const bx = 30 - i * 6;
      const r = 11 - i * 1.6;
      gfx.fillStyle(i % 2 === 0 ? 0x5a1e33 : 0x4a1628, 1);
      gfx.fillCircle(bx, 24 + i * 1.5, r);
      gfx.fillStyle(0x8a3550, 0.8);
      gfx.fillEllipse(bx - 1, 20 + i * 1.5, r * 0.9, r * 0.5);
    }
    // Legs — a fringe down both flanks.
    gfx.lineStyle(1.5, 0x2a0c18, 1);
    for (let i = 0; i < 4; i++) {
      const bx = 29 - i * 6;
      gfx.lineBetween(bx, 30 + i, bx - 3, 36 + i);
      gfx.lineBetween(bx, 18 + i, bx - 3, 12 + i);
    }
    // Head — a ring mouth of teeth, wide open and pointing forward.
    gfx.fillStyle(0x2a0c18, 1);
    gfx.fillCircle(35, 23, 9);
    gfx.fillStyle(0x06030a, 1);
    gfx.fillCircle(36, 23, 5.5);
    gfx.fillStyle(0xe9f4ec, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      gfx.fillTriangle(
        36 + Math.cos(a - 0.22) * 8, 23 + Math.sin(a - 0.22) * 8,
        36 + Math.cos(a + 0.22) * 8, 23 + Math.sin(a + 0.22) * 8,
        36 + Math.cos(a) * 3, 23 + Math.sin(a) * 3,
      );
    }
    // Two pale eyespots back on the first segment.
    gfx.fillStyle(0xbdfff0, 0.95);
    gfx.fillCircle(28, 20, 2);
    gfx.fillCircle(28, 27, 2);
    gfx.generateTexture('husk-larva', 48, 48);
    gfx.clear();

    // Thrall — the shared summon every world Sovereign calls (WorldBossKit's
    // summon move). Deliberately colour-neutral ash-and-shadow so it sits under
    // any boss's palette: a hunched figure of cinders with a cracked mask.
    gfx.fillStyle(0x08060e, 0.5);
    gfx.fillEllipse(24, 44, 28, 8); // ground shadow
    // Hunched body — a leaning teardrop of ash.
    gfx.fillStyle(0x1c1a24, 1);
    gfx.fillEllipse(24, 28, 26, 30);
    gfx.fillStyle(0x2c2438, 1);
    gfx.fillEllipse(22, 26, 19, 23);
    // Cracks of dim heat running up the body.
    gfx.lineStyle(1.5, 0x6a5f85, 0.8);
    gfx.lineBetween(19, 38, 22, 27);
    gfx.lineBetween(27, 39, 26, 30);
    gfx.lineBetween(23, 26, 21, 19);
    // Trailing wisps where legs would be.
    gfx.fillStyle(0x14121c, 1);
    gfx.fillTriangle(14, 40, 22, 38, 16, 46);
    gfx.fillTriangle(26, 39, 33, 40, 31, 46);
    // The mask: a pale oval split by a crack, two hollow eyes.
    gfx.fillStyle(0x9a93ab, 1);
    gfx.fillEllipse(24, 15, 17, 15);
    gfx.lineStyle(1.2, 0x3c3550, 1);
    gfx.lineBetween(24, 8, 22, 15);
    gfx.lineBetween(22, 15, 25, 22);
    gfx.fillStyle(0x0a0812, 1);
    gfx.fillEllipse(20, 14, 4.5, 6);
    gfx.fillEllipse(29, 14, 4.5, 6);
    // Claw hands held forward.
    gfx.fillStyle(0x2c2438, 1);
    gfx.fillCircle(11, 28, 5);
    gfx.fillCircle(37, 28, 5);
    gfx.lineStyle(1.5, 0x0a0812, 1);
    gfx.lineBetween(9, 26, 6, 22);
    gfx.lineBetween(11, 25, 9, 21);
    gfx.lineBetween(39, 26, 42, 22);
    gfx.lineBetween(37, 25, 39, 21);
    gfx.generateTexture('husk-thrall', 48, 48);
    gfx.clear();

    // Disgraced King body sprite. The fight draws the mech and the King itself
    // per-frame in Graphics — this texture only backs the invisible hitbox that
    // sits in ArenaScene's npc slot, so it just has to exist and be the right size.
    gfx.fillStyle(0x2a1240, 1);
    gfx.fillCircle(24, 24, 21);
    gfx.lineStyle(3, 0x7b4bc4, 1);
    gfx.strokeCircle(24, 24, 21);
    gfx.fillStyle(0xd8c4ff, 1);
    gfx.fillCircle(18, 21, 3.5);
    gfx.fillCircle(30, 21, 3.5);
    gfx.generateTexture('elem-king', 48, 48);
    gfx.clear();

    // Justice — a set of scales cast in gold on dark marble. JusticeKit paints the
    // character rig over the top of this per-frame, so the sprite only has to read as
    // "Justice" on the element cards and at a glance in the arena.
    gfx.fillStyle(0x241a08, 1);
    gfx.fillCircle(24, 24, 21);
    gfx.lineStyle(3, 0xc9a13a, 1);
    gfx.strokeCircle(24, 24, 21);
    // Stand + beam.
    gfx.fillStyle(0x7d5f22, 1);
    gfx.fillRect(22, 14, 4, 24);
    gfx.fillEllipse(24, 39, 20, 5);
    gfx.lineStyle(2.5, 0xf0d68a, 1);
    gfx.lineBetween(9, 17, 39, 17);
    // Two pans on short chains.
    gfx.lineStyle(1.2, 0xc9a13a, 1);
    gfx.lineBetween(11, 17, 11, 24);
    gfx.lineBetween(37, 17, 37, 24);
    gfx.fillStyle(0xf0d68a, 1);
    gfx.fillEllipse(11, 25, 14, 5);
    gfx.fillEllipse(37, 25, 14, 5);
    // Finial.
    gfx.fillStyle(0xfff3cf, 1);
    gfx.fillCircle(24, 12, 3.2);
    gfx.generateTexture('elem-justice', 48, 48);
    gfx.clear();

    // Justice's thrown spear — the head-on shape of the ground click's projectile,
    // drawn nose-right so the kit can just rotate it to the aim.
    gfx.fillStyle(0x7d5f22, 1);
    gfx.fillRect(2, 7, 16, 3);
    gfx.fillStyle(0xf0d68a, 1);
    gfx.fillRect(2, 7, 16, 1.2);
    gfx.fillStyle(0xc9a13a, 1);
    gfx.fillTriangle(16, 4, 16, 13, 20, 8.5);   // crossguard flare
    gfx.fillTriangle(18, 5.5, 18, 11.5, 30, 8.5); // leaf head
    gfx.lineStyle(1, 0xfff3cf, 1);
    gfx.lineBetween(18, 8.5, 30, 8.5);
    gfx.generateTexture('proj-justice-spear', 32, 17);
    gfx.clear();

    // Dream — a crescent moon over a piece of night sky, with a little hourglass of the
    // sandman's sand hanging off it. DreamKit paints the character rig over the top of this per-frame, so the
    // sprite only has to read as "Dream" on the element cards.
    gfx.fillStyle(0x0b0620, 1);
    gfx.fillCircle(24, 24, 21);
    gfx.lineStyle(3, 0x5b3fd4, 1);
    gfx.strokeCircle(24, 24, 21);
    // Nebula wash inside the disc.
    gfx.fillStyle(0x1b1145, 1);
    gfx.fillCircle(19, 28, 13);
    gfx.fillStyle(0x4f7dff, 0.5);
    gfx.fillCircle(29, 18, 9);
    // Crescent: a bright disc with a dark one bitten out of it.
    gfx.fillStyle(0xfff4c2, 1);
    gfx.fillCircle(22, 21, 11);
    gfx.fillStyle(0x0b0620, 1);
    gfx.fillCircle(27, 18, 10);
    // Stars.
    for (const [sx, sy, sr] of [[13, 14, 2], [34, 30, 1.6], [17, 36, 1.4], [33, 12, 1.2]]) {
      gfx.fillStyle(0xd8e2ff, 1);
      gfx.fillCircle(sx, sy, sr);
    }
    // A tiny hourglass of gold sand, hanging out of the crescent's horn.
    gfx.lineStyle(1.2, 0xd8e2ff, 1);
    gfx.lineBetween(26, 30, 29, 34);
    gfx.fillStyle(0xd7b25a, 1);
    gfx.fillTriangle(25.5, 34, 32.5, 34, 29, 38.5);
    gfx.fillTriangle(25.5, 43, 32.5, 43, 29, 38.5);
    gfx.fillStyle(0xf0d48a, 1);
    gfx.fillTriangle(27, 42, 31, 42, 29, 39.5);
    gfx.generateTexture('elem-dream', 48, 48);
    gfx.clear();

    // Paint (id `chalk`) — a warm canvas-linen orb, rose at the rim. The spatter, beret and
    // brush are the rig's; the body is just the canvas they are all painted on.
    bakeOrb(gfx, { rim: 0x7a2a48, shell: 0xb5576f, body: 0xe4d4b6, mid: 0xeee2c8, core: 0xf6eedc, light: 0xfffaf0, glint: 0xffffff });
    gfx.generateTexture('elem-chalk', 48, 48);
    gfx.clear();

    // Wax — a beeswax body: a pale candle-wax disc with a comb of cells pressed into the lower
    // half, a melted lip at the crown and two drips running off it. The rig paints the wick,
    // the flame and the hands; this is only what the fighter is *made of*.
    gfx.fillStyle(0x8d641c, 1);
    gfx.fillCircle(24, 24, 22);
    gfx.fillStyle(0xf2c85b, 1);
    gfx.fillCircle(24, 23, 20);
    gfx.fillStyle(0xffefad, 0.9);
    gfx.fillEllipse(18, 15, 14, 9);
    // Comb pressed into the lower half: six hex cells, honey in two of them.
    const hexAt = (cx: number, cy: number, r: number) => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      gfx.fillPoints(pts, true);
    };
    const cells: Array<[number, number, boolean]> = [[16, 29, false], [24, 29, true], [32, 29, false], [20, 36, true], [28, 36, false]];
    for (const [cx, cy, honey] of cells) {
      gfx.fillStyle(0x8d641c, 0.85);
      hexAt(cx, cy, 4.3);
      gfx.fillStyle(honey ? 0xd99518 : 0xe6bd4e, 1);
      hexAt(cx, cy, 3.1);
    }
    // The melted lip and two drips, the thing that says wax rather than cheese.
    gfx.fillStyle(0xffefad, 0.95);
    gfx.fillEllipse(24, 6, 26, 7);
    gfx.fillRoundedRect(13, 6, 5, 12, 2);
    gfx.fillRoundedRect(31, 6, 4, 9, 2);
    gfx.fillCircle(15.5, 18, 2.6);
    gfx.fillCircle(33, 15, 2.2);
    gfx.generateTexture('elem-wax', 48, 48);
    gfx.clear();

    // Clay — a plain orb of wet potter's clay, umber rim to a warm core. The dollop on the
    // crown (ClayAvatar) is the costume; the golem the kit draws is the same material.
    bakeOrb(gfx, { rim: 0x3d2316, shell: 0x57321f, body: 0x9a5c32, mid: 0xb9743f, core: 0xc38352, light: 0xd99a63, glint: 0xf3d7ae });
    gfx.generateTexture('elem-clay', 48, 48);
    gfx.clear();

    // Illusion — a harlequin mask with a second, misregistered copy of itself sliding out
    // from behind it. IllusionKit paints the character rig over the top per-frame, so the
    // sprite only has to read as "Illusion" on the element cards.
    gfx.fillStyle(0xff4dd2, 0.35);
    gfx.fillPoints([
      new Phaser.Geom.Point(28, 6), new Phaser.Geom.Point(43, 22),
      new Phaser.Geom.Point(28, 44), new Phaser.Geom.Point(13, 22),
    ], true);
    gfx.fillStyle(0x160b26, 1);
    gfx.fillPoints([
      new Phaser.Geom.Point(22, 4), new Phaser.Geom.Point(38, 21),
      new Phaser.Geom.Point(22, 44), new Phaser.Geom.Point(6, 21),
    ], true);
    gfx.lineStyle(2, 0xb45cff, 1);
    gfx.strokePoints([
      new Phaser.Geom.Point(22, 4), new Phaser.Geom.Point(38, 21),
      new Phaser.Geom.Point(22, 44), new Phaser.Geom.Point(6, 21),
    ], true, true);
    // Half the face lit violet — the split is the whole point of a two-faced mask.
    gfx.fillStyle(0xb45cff, 0.3);
    gfx.fillTriangle(22, 4, 38, 21, 22, 44);
    // Eye slits.
    gfx.fillStyle(0xfff0ff, 0.95);
    gfx.fillEllipse(16, 19, 9, 4.5);
    gfx.fillEllipse(28, 19, 9, 4.5);
    gfx.fillStyle(0x160b26, 1);
    gfx.fillCircle(16, 19, 1.6);
    gfx.fillCircle(28, 19, 1.6);
    // A crack running off the chin.
    gfx.lineStyle(1.4, 0x4de8ff, 0.85);
    gfx.beginPath();
    gfx.moveTo(22, 30); gfx.lineTo(19, 36); gfx.lineTo(24, 40);
    gfx.strokePath();
    gfx.generateTexture('elem-illusion', 48, 48);
    gfx.clear();

    // proj-illusion-crack — Crack Shot's bullet: a stubby red dart with a hot core, drawn
    // nose-right so the kit's `setRotation` points it along its own velocity.
    gfx.fillStyle(0x8e1420, 1);
    gfx.fillPoints([
      new Phaser.Geom.Point(18, 5), new Phaser.Geom.Point(2, 1),
      new Phaser.Geom.Point(5, 5), new Phaser.Geom.Point(2, 9),
    ], true);
    gfx.fillStyle(0xff3b4a, 1);
    gfx.fillPoints([
      new Phaser.Geom.Point(17, 5), new Phaser.Geom.Point(3, 2),
      new Phaser.Geom.Point(6, 5), new Phaser.Geom.Point(3, 8),
    ], true);
    gfx.fillStyle(0xfff0ff, 0.9);
    gfx.fillCircle(13, 5, 1.8);
    gfx.generateTexture('proj-illusion-crack', 20, 10);
    gfx.clear();

    // Depths — a plain orb of deep-sea teal (the DPT teal ladder). The anglerfish lure is the
    // rig's accessory, not part of the body.
    bakeOrb(gfx, { rim: 0x062633, shell: 0x0a3e4e, body: 0x0e6f7c, mid: 0x0e8f9c, core: 0x3fd8e8, light: 0x7fe6f0, glint: 0xd8f6ff });
    gfx.generateTexture('elem-depths', 48, 48);
    gfx.clear();

    // Conquest — a plain crimson orb in the banner red; the standard planted on the crown is
    // painted by ConquestAvatar, so the body itself stays one hue.
    bakeOrb(gfx, { rim: 0x3a0d09, shell: 0x5e1610, body: 0x8c2219, mid: 0xb02f24, core: 0xd8483a, light: 0xff8a6a, glint: 0xffd8cc });
    gfx.generateTexture('elem-conquest', 48, 48);
    gfx.clear();

    // Devotion (id `passion`) — a plain light-gold orb. The mitre is PassionAvatar's to draw, so
    // nothing about the hat is baked in here.
    bakeOrb(gfx, { rim: 0x4a3810, shell: 0x8a6a22, body: 0xc9a540, mid: 0xe2c463, core: 0xf5e08a, light: 0xfff2b8, glint: 0xfffcf0 });
    gfx.generateTexture('elem-passion', 48, 48);
    gfx.clear();

    // Ruin — a plain dry brick-red orb (the RUI red ladder). The crown of rusted spikes and the
    // empty socket are RuinAvatar's accessories, not part of the body.
    bakeOrb(gfx, { rim: 0x2a0c08, shell: 0x5a1812, body: 0x8f1f18, mid: 0xc4392c, core: 0xe05a44, light: 0xff6a4d, glint: 0xffd8cc });
    gfx.generateTexture('elem-ruin', 48, 48);
    gfx.clear();

    // Sand (element id `dune`) — a plain orb of packed dune, umber rim to sun-bleached core.
    // SandAvatar repaints the same orb per-frame (so it can swell with height and fuse to glass);
    // this bake is what the element cards show. The straw hat on the rig says the rest.
    bakeOrb(gfx, { rim: 0x6e5028, shell: 0x8f6b38, body: 0xc9a05a, mid: 0xd9b46c, core: 0xe8c87a, light: 0xf0cd8e, glint: 0xfff3d6 });
    gfx.generateTexture('elem-dune', 48, 48);
    gfx.clear();

    // Paper — a plain orb of cream pulp, crease-tan rim to bright-sheet core. The folded
    // newspaper hat the rig wears is what says "paper"; the body is just its stock.
    bakeOrb(gfx, { rim: 0x8a7c56, shell: 0xb3a47c, body: 0xd6cbac, mid: 0xe6dcc0, core: 0xf2ead6, light: 0xfffaf0, glint: 0xffffff });
    gfx.generateTexture('elem-paper', 48, 48);
    gfx.clear();

    // Death — a plain shroud-violet orb, void rim to a smoky core with a bone glint. The hood
    // and the katana are DeathAvatar's; the body is just the dark he is made of.
    bakeOrb(gfx, { rim: 0x07060d, shell: 0x171227, body: 0x2a2242, mid: 0x3a3158, core: 0x554c78, light: 0x8a80b8, glint: 0xe9e3d2 });
    gfx.generateTexture('elem-death', 48, 48);
    gfx.clear();

    // Fortune — a plain gold orb, brass rim to a bright minted core. The dealer's visor and the
    // gun in hand are FortuneAvatar's; the body is just the money.
    bakeOrb(gfx, { rim: 0x4a3008, shell: 0x7a5512, body: 0xa8791e, mid: 0xd4a02e, core: 0xf0c33c, light: 0xfff0a8, glint: 0xfffbe6 });
    gfx.generateTexture('elem-fortune', 48, 48);
    gfx.clear();

    // Amber — a nugget of resin with a mosquito trapped in it. The nugget is an irregular
    // polygon, not a circle, with a bevelled lit face and a dark rind; the insect inside is drawn
    // properly (thorax, abdomen, wings, six legs) because it is the whole idea of the element.
    const nug = [
      new Phaser.Geom.Point(24, 2), new Phaser.Geom.Point(41, 12),
      new Phaser.Geom.Point(45, 30), new Phaser.Geom.Point(33, 45),
      new Phaser.Geom.Point(13, 44), new Phaser.Geom.Point(3, 28),
      new Phaser.Geom.Point(7, 10),
    ];
    gfx.fillStyle(0x1a0f05, 1);
    gfx.fillPoints(nug, true);
    gfx.fillStyle(0x8a4a08, 1);
    gfx.fillPoints(nug.map((p) => new Phaser.Geom.Point(24 + (p.x - 24) * 0.93, 24 + (p.y - 24) * 0.93)), true);
    gfx.fillStyle(0xd98b1f, 1);
    gfx.fillPoints(nug.map((p) => new Phaser.Geom.Point(23 + (p.x - 24) * 0.8, 23 + (p.y - 24) * 0.8)), true);
    gfx.fillStyle(0xf7c25a, 1);
    gfx.fillPoints(nug.map((p) => new Phaser.Geom.Point(20 + (p.x - 24) * 0.5, 19 + (p.y - 24) * 0.5)), true);
    // Trapped mosquito: wings behind, then legs, abdomen, thorax, head and proboscis.
    gfx.fillStyle(0xffe9a8, 0.55);
    gfx.fillEllipse(22, 20, 15, 7);
    gfx.fillEllipse(22, 28, 15, 7);
    gfx.lineStyle(1.2, 0x1a0f05, 0.85);
    for (let i = 0; i < 3; i++) {
      gfx.lineBetween(24 - i * 3, 25, 16 - i * 4, 33 + i * 3);
      gfx.lineBetween(24 - i * 3, 23, 17 - i * 4, 14 - i * 2);
    }
    gfx.fillStyle(0x9e1f22, 1);
    gfx.fillEllipse(17, 25, 17, 8);
    gfx.fillStyle(0xd4413f, 1);
    gfx.fillEllipse(15, 23, 9, 4);
    gfx.fillStyle(0x3f2917, 1);
    gfx.fillEllipse(28, 24, 10, 9);
    gfx.fillStyle(0x6f4a2c, 1);
    gfx.fillEllipse(27, 22, 6, 4);
    gfx.fillStyle(0x1a0f05, 1);
    gfx.fillCircle(34, 24, 3.4);
    gfx.lineStyle(1.6, 0xe4d9bb, 1);
    gfx.lineBetween(36, 25, 45, 27);
    gfx.generateTexture('elem-amber', 48, 48);
    gfx.clear();

    // Psychic — a plain polished-ebony orb (the PSY board ladder), lit in silver. The ivory
    // king's crown with the third eye in its band is the rig's accessory, not part of the body.
    bakeOrb(gfx, { rim: 0x050506, shell: 0x141417, body: 0x1f1f24, mid: 0x2b2b32, core: 0x45454e, light: 0xa9a9b3, glint: 0xf7f3e8 });
    gfx.generateTexture('elem-psychic', 48, 48);
    gfx.clear();

    // Myth — a hole cut in the arena with the night showing through: a black void with a thin
    // violet rim and pinpricks of starlight. Excalibur is the rig's, not the body's.
    bakeOrb(gfx, { rim: 0x3b2a6b, shell: 0x1f1540, body: 0x0a0616, mid: 0x05030c, core: 0x05030c, light: 0x3b2a6b, glint: 0x7d5cff });
    for (let i = 0; i < 22; i++) {
      const sa = Math.sin(i * 91.7 + 3.1) * 18733.517;
      const sd = Math.sin(i * 47.3 + 1.7) * 18733.517;
      const a = (sa - Math.floor(sa)) * Math.PI * 2;
      const d = Math.sqrt(sd - Math.floor(sd)) * 15;
      const px = 24 + Math.cos(a) * d;
      const py = 24 + Math.sin(a) * d;
      const big = i % 7 === 0;
      gfx.fillStyle(i % 5 === 0 ? 0xa9c7ff : 0xfff6d5, big ? 1 : 0.85);
      if (big) {
        gfx.fillPoints([
          new Phaser.Geom.Point(px, py - 2.6), new Phaser.Geom.Point(px + 0.9, py - 0.9), new Phaser.Geom.Point(px + 2.6, py),
          new Phaser.Geom.Point(px + 0.9, py + 0.9), new Phaser.Geom.Point(px, py + 2.6), new Phaser.Geom.Point(px - 0.9, py + 0.9),
          new Phaser.Geom.Point(px - 2.6, py), new Phaser.Geom.Point(px - 0.9, py - 0.9),
        ], true);
      } else {
        gfx.fillCircle(px, py, 0.9);
      }
    }
    gfx.generateTexture('elem-myth', 48, 48);
    gfx.clear();

    // Myth's star shard — the Stronghold tower's bolt.
    gfx.fillStyle(0x7d5cff, 0.5);
    gfx.fillCircle(8, 8, 7);
    gfx.fillStyle(0xfff6d5, 1);
    gfx.fillPoints([
      new Phaser.Geom.Point(8, 1), new Phaser.Geom.Point(10, 6), new Phaser.Geom.Point(15, 8), new Phaser.Geom.Point(10, 10),
      new Phaser.Geom.Point(8, 15), new Phaser.Geom.Point(6, 10), new Phaser.Geom.Point(1, 8), new Phaser.Geom.Point(6, 6),
    ], true);
    gfx.generateTexture('proj-myth-star', 16, 16);
    gfx.clear();

    // Radiation — a plain orb of contained neon green (the RAD neon ladder). The trefoil and the
    // lead live on the rig's hazmat helmet, not on the body.
    bakeOrb(gfx, { rim: 0x0f2e08, shell: 0x1f5a10, body: 0x3f9e18, mid: 0x5cc82a, core: 0x9dff6a, light: 0xc2ff8f, glint: 0xeeffdc });
    gfx.generateTexture('elem-radiation', 48, 48);
    gfx.clear();

    // Bind — a plain orb of the patron's cosmic violet, void rim to lit core with an aether rim
    // light. The broken gold halo the rig wears over it is the relic; the body is the dark.
    bakeOrb(gfx, { rim: 0x080415, shell: 0x180c3a, body: 0x2a1660, mid: 0x3a1f7a, core: 0x6f3fd0, light: 0xb894ff, glint: 0xd8c4ff });
    gfx.generateTexture('elem-bind', 48, 48);
    gfx.clear();

    // Slime (id: gum) — a squat blob with one enormous hand reaching out of it, because the
    // silhouette has to say "no legs, one arm" before anything else does. Green body, pink
    // bubble caught in the palm, and a wet crescent on both so they read as the same material.
    gfx.fillStyle(0x0f2410, 0.4);
    gfx.fillEllipse(18, 41, 30, 8);
    // Body: bottom-heavy, flat where it meets the ground.
    gfx.fillStyle(0x1f6b2a, 1);
    gfx.fillEllipse(16, 30, 28, 24);
    gfx.fillStyle(0x46b93f, 1);
    gfx.fillEllipse(16, 30, 24, 20);
    gfx.fillStyle(0x8ce65a, 0.55);
    gfx.fillEllipse(13, 27, 15, 12);
    gfx.fillStyle(0x0f2410, 1);
    gfx.fillCircle(12, 28, 2.2);
    gfx.fillCircle(20, 28, 2.2);
    // The arm, tapering up and to the right, sagging in the middle.
    gfx.fillStyle(0x1f6b2a, 1);
    gfx.fillTriangle(20, 24, 26, 32, 39, 15);
    gfx.fillStyle(0x46b93f, 1);
    gfx.fillTriangle(21, 25, 26, 30, 38, 16);
    // The hand: a fat ball of ooze at the end of it, holding a bubble.
    gfx.fillStyle(0x1f6b2a, 1);
    gfx.fillCircle(38, 14, 10);
    gfx.fillStyle(0x46b93f, 1);
    gfx.fillCircle(38, 14, 8.4);
    gfx.fillStyle(0xff70bd, 0.75);
    gfx.fillCircle(38, 13, 4.6);
    gfx.lineStyle(1.4, 0xffc9e8, 1);
    gfx.strokeCircle(38, 13, 4.6);
    // Two wet crescents, one on each mass — the element's whole signature.
    gfx.lineStyle(2, 0xe2ffc8, 0.9);
    gfx.beginPath();
    gfx.arc(14, 28, 8, -2.5, -1.4, false);
    gfx.strokePath();
    gfx.lineStyle(1.7, 0xe2ffc8, 0.9);
    gfx.beginPath();
    gfx.arc(37, 13, 5.6, -2.6, -1.5, false);
    gfx.strokePath();
    // A drip letting go of the underside of the arm.
    gfx.fillStyle(0x46b93f, 0.9);
    gfx.fillEllipse(29, 27, 3, 6);
    gfx.fillCircle(29, 30, 1.7);
    gfx.generateTexture('elem-gum', 48, 48);
    gfx.clear();

    // Harvest (id `gluttony`) — a plain orb of dark burlap (HAR.sack): the scarecrow's sack head.
    // The knot, the grin and the scythe are the rig's, not printed on the body.
    bakeOrb(gfx, { rim: 0x0c0806, shell: 0x1a140f, body: 0x2a2119, mid: 0x372b20, core: 0x46382a, light: 0x6a5741, glint: 0xb8a58a });
    gfx.generateTexture('elem-gluttony', 48, 48);
    gfx.clear();

    // A deliberately empty 48×48 body, for the elements whose avatar paints its own torso.
    // Cloth's bobbin and Marrow draw a whole character over the fighter sprite, so there is
    // nothing for a sprite underneath to be — but `ELEMENT_TEXTURES` has to hand ArenaScene
    // *something*, and what it used to hand them was `elem-fire`.
    gfx.generateTexture('elem-bodyless', 48, 48);
    gfx.clear();

    // Magma — a plain molten orb in the element's orange (MAG.magma → lava → white). The pirate
    // lives in the rig's tricorn and eye patch; the body only has to say "lava".
    bakeOrb(gfx, {
      rim: 0x6e1606, shell: 0xa82a0c, body: 0xd9431a, mid: 0xff5a1e,
      core: 0xff8b22, light: 0xffc44a, glint: 0xfff0c0,
    });
    gfx.generateTexture('elem-magma', 48, 48);
    gfx.clear();

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
