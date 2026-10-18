import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Element } from '../../elements/Element';
import { HUSK_FAMILIES, BASIC_HUSK, huskTextureKey } from '../HuskVariants';

export const ALL_ELEMENT_MAX_HP = 500;

const ALL_ELEMENT: Element = {
  id: 'all-element',
  name: 'The All-Element',
  color: 0xffffff,
  emoji: '✦',
  abilities: [],
};

/** The fifteen ordinary elements' colours, which circle it as motes. */
const MOTE_COLORS = HUSK_FAMILIES.filter((f) => f.category === 'normal').map((f) => f.color);

const HUD_FONT = '"Arial Black", "Segoe UI Black", Impact, sans-serif';

/**
 * The thing the city is defending: every element at once, asleep on a plinth
 * at the top of Main Street, dreaming. It is a Fighter only so husks can see,
 * chase and bite it through the same target lists they use for players — the
 * sprite itself is invisible and never moves; everything you see is drawn here.
 *
 * Never registered in the arena's `enemies`, so no player ability can hit it.
 */
export class AllElement extends Fighter {
  private artG: Phaser.GameObjects.Graphics;
  private hudG: Phaser.GameObjects.Graphics;
  private hudLabel: Phaser.GameObjects.Text;
  private hurtFlashUntil = 0;
  /** Last HP the cracks were drawn for — they only ever grow. */
  private lastHurtAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, huskTextureKey(BASIC_HUSK), ALL_ELEMENT, ALL_ELEMENT_MAX_HP, 0);
    this.setAlpha(0);
    this.setHealthBarVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.moves = false;
    // Big enough that a pack of husks rings it rather than stacking on one pixel.
    this.sizeMult = 1.5;
    this.applySizeMult();
    this.setAlpha(0);

    this.artG = scene.add.graphics().setDepth(4.2);
    this.hudG = scene.add.graphics().setDepth(25);
    this.hudLabel = scene.add.text(scene.scale.width / 2, 68, '', {
      fontSize: '11px', fontFamily: HUD_FONT, color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(26);
  }

  takeDamage(amount: number, opts?: Parameters<Fighter['takeDamage']>[1]): void {
    const before = this.hp;
    super.takeDamage(amount, opts);
    if (this.hp < before) {
      this.hurtFlashUntil = this.scene.time.now + 140;
      this.lastHurtAt = this.scene.time.now;
    }
  }

  /** True for a couple of seconds after the last hit — the HUD bar throbs. */
  get recentlyHurt(): boolean {
    return this.scene.time.now - this.lastHurtAt < 2000;
  }

  /**
   * Per-frame paint. `inView` is false while the local player is out in a lane:
   * the body is then drawn by nobody, but the HUD bar stays up everywhere.
   */
  draw(time: number, inView: boolean): void {
    this.drawHud(time);
    const g = this.artG;
    g.clear();
    if (!inView) return;
    const x = this.x, y = this.y;
    const frac = Math.max(0, this.hp) / this.maxHp;
    const hurt = time < this.hurtFlashUntil;

    // Plinth: a stepped octagonal base with the fifteen colours inlaid as tiles.
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(x + 4, y + 50, 132, 40);
    g.fillStyle(0x6e6658, 1);
    g.fillEllipse(x, y + 44, 128, 38);
    g.fillStyle(0x8e8574, 1);
    g.fillEllipse(x, y + 38, 108, 30);
    for (let i = 0; i < MOTE_COLORS.length; i++) {
      const a = (i / MOTE_COLORS.length) * Math.PI * 2;
      g.fillStyle(MOTE_COLORS[i], 0.85);
      g.fillCircle(x + Math.cos(a) * 46, y + 38 + Math.sin(a) * 12, 3);
    }
    g.lineStyle(2, 0x3a342c, 1);
    g.strokeEllipse(x, y + 38, 108, 30);

    // Light shaft rising from the plinth.
    const bob = Math.sin(time / 700) * 4;
    g.fillStyle(0xffffff, 0.05 + frac * 0.05);
    g.fillTriangle(x - 40, y + 36, x + 40, y + 36, x, y - 70 + bob);

    // The orb: layered halos that cycle through the elements, a pearl core.
    const cy = y - 6 + bob;
    const hueIdx = (time / 900) % MOTE_COLORS.length;
    const c0 = MOTE_COLORS[Math.floor(hueIdx)];
    const c1 = MOTE_COLORS[(Math.floor(hueIdx) + 1) % MOTE_COLORS.length];
    const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(c0), Phaser.Display.Color.ValueToColor(c1), 100, (hueIdx % 1) * 100);
    const halo = Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b);
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(halo, 0.05 * i * (0.5 + frac * 0.5));
      g.fillCircle(x, cy, 26 + i * 9);
    }
    g.fillStyle(hurt ? 0xff4444 : 0xf6f2ff, 1);
    g.fillCircle(x, cy, 24);
    g.fillStyle(halo, 0.55);
    g.fillCircle(x - 4, cy + 3, 18);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x - 8, cy - 9, 6);

    // A sleeper's face: closed, curved eyes that only open when it is hurt.
    g.lineStyle(2, 0x2a2440, 0.85);
    if (hurt || frac < 0.25) {
      g.fillStyle(0x2a2440, 1);
      g.fillCircle(x - 8, cy + 1, 3);
      g.fillCircle(x + 8, cy + 1, 3);
    } else {
      g.beginPath();
      g.arc(x - 8, cy, 4, 0.2, Math.PI - 0.2);
      g.strokePath();
      g.beginPath();
      g.arc(x + 8, cy, 4, 0.2, Math.PI - 0.2);
      g.strokePath();
    }

    // Cracks spread across the pearl as it loses health. Deterministic per angle.
    const cracks = Math.floor((1 - frac) * 8);
    g.lineStyle(1.5, 0x221a30, 0.9);
    for (let i = 0; i < cracks; i++) {
      const a = i * 2.39996;
      let px = x + Math.cos(a) * 24, py = cy + Math.sin(a) * 24;
      for (let s = 0; s < 3; s++) {
        const nx = px - Math.cos(a + (s % 2 ? 0.5 : -0.5)) * 6;
        const ny = py - Math.sin(a + (s % 2 ? 0.5 : -0.5)) * 6;
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    }

    // Motes: one per ordinary element, orbiting on a tilted ring. Lost health dims them in turn.
    const lit = Math.ceil(frac * MOTE_COLORS.length);
    for (let i = 0; i < MOTE_COLORS.length; i++) {
      const a = time / 1600 + (i / MOTE_COLORS.length) * Math.PI * 2;
      const mx = x + Math.cos(a) * 52;
      const my = cy + Math.sin(a) * 18;
      const front = Math.sin(a) > 0;
      const alive = i < lit;
      g.fillStyle(alive ? MOTE_COLORS[i] : 0x3a3a3a, alive ? (front ? 1 : 0.55) : 0.5);
      g.fillCircle(mx, my, front ? 4.5 : 3.2);
    }
  }

  private drawHud(time: number): void {
    const g = this.hudG;
    g.clear();
    const W = this.scene.scale.width;
    const w = 280, h = 12, x = W / 2 - w / 2, y = 62;
    const frac = Math.max(0, this.hp) / this.maxHp;
    const throb = this.recentlyHurt ? 0.5 + Math.sin(time / 90) * 0.5 : 0;
    g.fillStyle(0x000000, 0.75);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    // The bar is a band of every element's colour, cut off where the health ends.
    const seg = w / MOTE_COLORS.length;
    for (let i = 0; i < MOTE_COLORS.length; i++) {
      const sx = x + i * seg;
      if (sx >= x + w * frac) break;
      g.fillStyle(MOTE_COLORS[i], 1);
      g.fillRect(sx, y, Math.min(seg, x + w * frac - sx), h);
    }
    g.lineStyle(1, throb > 0 ? 0xff4444 : 0xffffff, throb > 0 ? 0.6 + throb * 0.4 : 0.6);
    g.strokeRect(x - 2, y - 2, w + 4, h + 4);
    this.hudLabel.setText(`✦ THE ALL-ELEMENT  ${Math.ceil(Math.max(0, this.hp))} / ${this.maxHp}`);
  }

  destroy(fromScene?: boolean): void {
    this.artG?.destroy();
    this.hudG?.destroy();
    this.hudLabel?.destroy();
    super.destroy(fromScene);
  }
}
