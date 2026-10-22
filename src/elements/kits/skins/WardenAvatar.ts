import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, easeOut } from '../ElementVisuals';
import { WARDEN } from './WardenFx';

/**
 * The Warden skin's character: echo's bat-thing replaced by the Warden of the deep dark.
 *
 * Blocky on purpose — the whole rig is built from rects and stepped polygons, because the thing
 * it is quoting is made of voxels. **Unmastered** is the Warden as it climbs out of the sculk: a
 * square dark-teal hulk, a ribcage recess with two souls pulsing on its heartbeat, one tendril
 * horn each side of the head. **Mastered** is a Warden the deep dark has grown into: broader
 * shoulders stepped out past the disc, four souls in a cage that glows through its ribs,
 * doubled tendrils, sculk sensors sprouting from the shoulders, an amethyst cluster breaking
 * out of one of them, and a spreading sculk patch underfoot.
 */

/** Blocky fists: a soul-glow halo, then the dark knuckle disc under the square drawn in extras. */
const WARDEN_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: WARDEN.cyan, alpha: 0.16 },
    { r: 6.2, color: WARDEN.sculk, alpha: 1 },
    { r: 4.2, color: WARDEN.teal, alpha: 1 },
    { r: 1.6, color: WARDEN.cyanHi, alpha: 0.9, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: WARDEN.cyanHi,
  eyePupil: WARDEN.deep,
  // Heavy fists: they barely smear.
  squash: { div: 18, x: 0.3, y: 0.18 },
};

type G = Phaser.GameObjects.Graphics;

function pts(list: [number, number][]): Phaser.Geom.Point[] {
  return list.map(([x, y]) => new Phaser.Geom.Point(x, y));
}

/** The Warden's heartbeat: a double thump once per beat, 0–1. */
function heartbeat(t: number, rate: number): number {
  const p = (t * rate) % 1;
  const thump = (c: number) => Math.exp(-(((p - c) / 0.05) ** 2));
  return Math.min(1, thump(0.05) + 0.7 * thump(0.22));
}

/** Seeded 0–1 so the sculk texture holds still between frames. */
function hash(k: number): number {
  const v = Math.sin(k * 91.17 + 7.31) * 43758.5453;
  return v - Math.floor(v);
}

// ── WardenRigFx ───────────────────────────────────────────────────────────

/** Sculk motes shed off the fists: tiny square specks of soul light that sink and go out. */
class WardenRigFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  speck(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 16;
    const s = 1.6 + Math.random() * 1.4;
    this.anim(5, 560, (g, t) => {
      const fade = 1 - t;
      const px = x + dx * easeOut(t);
      const py = y + 8 * t;
      g.fillStyle(WARDEN.cyan, 0.35 * fade);
      g.fillRect(px - s, py - s, s * 2, s * 2);
      g.fillStyle(WARDEN.soul, 0.9 * fade);
      g.fillRect(px - s * 0.5, py - s * 0.5, s, s);
    });
  }
}

// ── WardenAvatar ──────────────────────────────────────────────────────────

export class WardenAvatar extends BaseAvatar {
  private fx: WardenRigFx;
  /** Sculk mottling on the hide: seeded squares in body-local coords. */
  private mottle: { x: number; y: number; s: number; c: number }[] = [];

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, WARDEN_AVATAR);
    this.fx = new WardenRigFx(scene);
    for (let i = 0; i < 14; i++) {
      const h1 = hash(i), h2 = hash(i + 50), h3 = hash(i + 100);
      // Keep the mottling off the face band (y -10..+2) so the eyes stay clean.
      let my = -22 + h2 * 44;
      if (my > -11 && my < 3) my = h3 < 0.5 ? -14 : 6;
      this.mottle.push({ x: -20 + h1 * 36, y: my, s: 2.5 + h3 * 3, c: h3 < 0.5 ? WARDEN.sculk : WARDEN.tealMid });
    }
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? WARDEN.soul : WARDEN.cyanHi);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(WARDEN.cyan, on ? 0.24 : 0.16);
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.speck(x, y);
  }

  private get beat(): number {
    return heartbeat(this.t, this.mastered ? 1.5 : 1.0) * this.intensity;
  }

  // ── Glow: soul light and, mastered, a sculk patch spreading underfoot ────

  protected drawGlow(g: G, x: number, y: number, a: number): void {
    const b = this.beat;
    if (this.mastered) {
      // A sculk patch: stepped dark tiles with sensor specks, under everything.
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + 0.3;
        const d = 26 + hash(i + 200) * 14;
        const s = 8 + hash(i + 300) * 7;
        g.fillStyle(WARDEN.sculkDark, a * 0.8);
        g.fillRect(x + Math.cos(ang) * d - s / 2, y + 16 + Math.sin(ang) * d * 0.45 - s / 4, s, s / 2);
        if (i % 3 === 0) {
          g.fillStyle(WARDEN.cyan, a * (0.35 + 0.5 * b));
          g.fillRect(x + Math.cos(ang) * d - 1.2, y + 16 + Math.sin(ang) * d * 0.45 - 1, 2.4, 2);
        }
      }
    }
    g.fillStyle(WARDEN.deep, a * 0.4);
    g.fillEllipse(x, y + 22, this.mastered ? 70 : 56, 16);
    // Soul light breathing out of the chest on each heartbeat.
    g.fillStyle(WARDEN.cyan, a * (0.08 + 0.14 * b));
    g.fillCircle(x, y + 10, (this.mastered ? 40 : 32) * (1 + 0.08 * b));
  }

  // ── Body: the blocky hulk, under the eyes ────────────────────────────────

  protected drawBody(g: G, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const b = this.beat;
    const breathe = Math.sin(this.t * 1.6) * 0.8;
    const top = y - (m ? 26 : 23) + breathe * 0.3;
    const bot = y + 22;
    const hw = m ? 23 : 21; // half-width of the trunk

    // Legs: two square stumps standing out under the trunk.
    for (const side of [-1, 1]) {
      const lx = x + side * 10;
      g.fillStyle(WARDEN.sculkDark, alpha);
      g.fillRect(lx - 6.5, bot - 4, 13, 10);
      g.fillStyle(WARDEN.teal, alpha);
      g.fillRect(lx - 5.5, bot - 4, 11, 8.5);
      g.fillStyle(WARDEN.tealLit, alpha * 0.5);
      g.fillRect(lx - 5.5, bot - 4, 3, 8.5);
    }

    // Shoulders: stepped blocks — mastered ones step out well past the disc.
    const sw = m ? 33 : 26;
    const sy = top + 3;
    g.fillStyle(WARDEN.sculkDark, alpha);
    g.fillPoints(pts([
      [x - sw, sy + 4], [x - sw + 4, sy], [x + sw - 4, sy], [x + sw, sy + 4],
      [x + sw, sy + 14], [x + sw - 5, sy + 18], [x - sw + 5, sy + 18], [x - sw, sy + 14],
    ]), true);
    g.fillStyle(WARDEN.teal, alpha);
    g.fillPoints(pts([
      [x - sw + 1, sy + 4], [x - sw + 4.5, sy + 1], [x + sw - 4.5, sy + 1], [x + sw - 1, sy + 4],
      [x + sw - 1, sy + 12], [x - sw + 1, sy + 12],
    ]), true);
    g.fillStyle(WARDEN.tealLit, alpha * 0.55);
    g.fillRect(x - sw + 3, sy + 1.5, sw - 6, 3);

    // Trunk: shadow side, body, lit band down the left.
    g.fillStyle(WARDEN.sculkDark, alpha);
    g.fillRect(x - hw + 2, top + 2, hw * 2, bot - top);
    g.fillStyle(WARDEN.teal, alpha);
    g.fillRect(x - hw, top, hw * 2, bot - top);
    g.fillStyle(WARDEN.tealMid, alpha * 0.7);
    g.fillRect(x - hw, top, 6, bot - top);
    g.fillStyle(WARDEN.sculk, alpha * 0.8);
    g.fillRect(x + hw - 5, top, 5, bot - top);

    // Sculk mottling.
    for (const p of this.mottle) {
      g.fillStyle(p.c, alpha * 0.7);
      g.fillRect(x + p.x, y + p.y, p.s, p.s);
    }

    // Head plate: the face sits in a darker square band, framed so the eyes read as set in.
    g.fillStyle(WARDEN.sculk, alpha * 0.9);
    g.fillRect(x - 15, y - 11, 30, 14);
    g.fillStyle(WARDEN.deep, alpha * 0.5);
    g.fillRect(x - 15, y + 1, 30, 2);

    // Ribcage recess and the souls inside it.
    const cw = m ? 30 : 24, ch = m ? 15 : 13;
    const cy = y + 5;
    g.fillStyle(WARDEN.deep, alpha);
    g.fillRect(x - cw / 2, cy, cw, ch);
    const souls: [number, number][] = m
      ? [[-9, 4], [-3, 9], [4, 4], [10, 9]]
      : [[-5, 5], [5, 8]];
    for (let i = 0; i < souls.length; i++) {
      const [sx, sy2] = souls[i];
      const wob = Math.sin(this.t * 3 + i * 1.9) * 1.2;
      const k = 0.55 + 0.45 * b;
      g.fillStyle(WARDEN.cyan, alpha * 0.35 * k);
      g.fillRect(x + sx - 4.5, cy + sy2 - 4.5 + wob, 9, 9);
      g.fillStyle(WARDEN.cyan, alpha * (0.7 + 0.3 * k));
      g.fillRect(x + sx - 2.8, cy + sy2 - 2.8 + wob, 5.6, 5.6);
      g.fillStyle(WARDEN.soul, alpha * k);
      g.fillRect(x + sx - 1.4, cy + sy2 - 1.8 + wob, 2.6, 2.6);
    }
    // Ribs across the cage — the souls glow between them.
    g.fillStyle(m ? WARDEN.tealLit : WARDEN.tealMid, alpha);
    const ribs = m ? 5 : 4;
    for (let i = 0; i < ribs; i++) {
      const rx = x - cw / 2 + ((i + 0.5) / ribs) * cw - 1.2;
      g.fillRect(rx, cy - 1, 2.4, ch + 1);
    }
    g.fillRect(x - cw / 2 - 1, cy - 1.5, cw + 2, 2.2);
    if (m) {
      g.lineStyle(1.2, WARDEN.cyan, alpha * (0.3 + 0.5 * b));
      g.strokeRect(x - cw / 2 - 1, cy - 1.5, cw + 2, ch + 2);
    }

    if (m) this.drawShoulderGrowth(g, x, sy, sw, alpha, b);
  }

  /** Mastered: sculk sensors on the left shoulder, an amethyst cluster on the right. */
  private drawShoulderGrowth(g: G, x: number, sy: number, sw: number, alpha: number, b: number): void {
    // Sculk sensors: a dark block with two tendril stalks whose tips glow on the beat.
    for (const ox of [-sw + 6, -sw + 15]) {
      const bx = x + ox;
      g.fillStyle(WARDEN.sculkDark, alpha);
      g.fillRect(bx - 3.5, sy - 2, 7, 5);
      const sway = Math.sin(this.t * 2.3 + ox) * 1.2;
      g.fillStyle(WARDEN.tealMid, alpha);
      g.fillRect(bx - 2 + sway * 0.5, sy - 8, 1.6, 7);
      g.fillRect(bx + 0.8 + sway * 0.3, sy - 6, 1.6, 5);
      g.fillStyle(WARDEN.cyan, alpha * (0.5 + 0.5 * b));
      g.fillRect(bx - 2.3 + sway * 0.5, sy - 10, 2.2, 2.4);
      g.fillRect(bx + 0.5 + sway * 0.3, sy - 8, 2.2, 2.4);
    }
    // Amethyst cluster breaking out of the right shoulder.
    const ax = x + sw - 9, ay = sy + 2;
    const shardsAt: [number, number, number][] = [[-0.5, 12, 4.2], [-1.15, 9, 3.4], [0.15, 8, 3.2]];
    for (const [ang0, len, wid] of shardsAt) {
      const ang = -Math.PI / 2 + ang0;
      const c = Math.cos(ang), s = Math.sin(ang);
      const at = (f: number, sd: number): [number, number] => [ax + f * c - sd * s, ay + f * s + sd * c];
      g.fillStyle(WARDEN.ameDeep, alpha);
      g.fillPoints(pts([at(-1, -wid - 1), at(len * 0.7, -wid - 0.8), at(len + 1.4, 0), at(len * 0.7, wid + 0.8), at(-1, wid + 1)]), true);
      g.fillStyle(WARDEN.ame, alpha);
      g.fillPoints(pts([at(0, -wid), at(len * 0.7, -wid * 0.9), at(len, 0), at(len * 0.7, wid * 0.9), at(0, wid)]), true);
      g.fillStyle(WARDEN.ameHi, alpha * 0.85);
      g.fillPoints(pts([at(0, -wid), at(len * 0.7, -wid * 0.9), at(len, 0), at(0, 0)]), true);
    }
    const tw = 0.5 + 0.5 * Math.sin(this.t * 4.1);
    g.fillStyle(WARDEN.amePale, alpha * tw);
    g.fillRect(ax - 4, ay - 11, 2, 2);
  }

  // ── Extras: tendril horns above the crown, square fists over the hands ──

  protected drawExtras(g: G, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const b = this.beat;
    const top = y - (m ? 26 : 23);

    // Tendrils: the Warden's horn-like ears, rooted at the head's top corners and sweeping
    // out and up. They twitch when it "listens", and their inner stripe glows on the beat.
    const sets = m ? [{ ox: 12, len: 20, lift: 15, w: 5 }, { ox: 5, len: 13, lift: 17, w: 3.6 }]
      : [{ ox: 12, len: 16, lift: 12, w: 4.4 }];
    for (const side of [-1, 1]) {
      for (let k = 0; k < sets.length; k++) {
        const st = sets[k];
        const twitch = Math.sin(this.t * (this.intensity > 1 ? 8 : 2) + side * 1.3 + k) * 2;
        const rx = x + side * st.ox, ry = top + 2;
        const steps = 6;
        const outer: [number, number][] = [];
        const inner: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          // Out first, then curling up — a horn, not a spike.
          const px = rx + side * (st.len * u);
          const py = ry - st.lift * u * u - twitch * u;
          const w = st.w * (1 - u * 0.8);
          outer.push([px, py - w]);
          inner.push([px, py + w]);
        }
        const poly = [...outer, ...inner.reverse()];
        g.fillStyle(WARDEN.sculkDark, alpha);
        g.fillPoints(pts(poly.map(([px, py]) => [px + 1, py + 1.2])), true);
        g.fillStyle(WARDEN.tealMid, alpha);
        g.fillPoints(pts(poly), true);
        // Glowing inner stripe.
        g.lineStyle(1.6, WARDEN.cyan, alpha * (0.45 + 0.55 * b));
        g.beginPath();
        for (let i = 1; i < steps; i++) {
          const u = i / steps;
          const px = rx + side * (st.len * u);
          const py = ry - st.lift * u * u - twitch * u;
          if (i === 1) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    }
    // Crown ridge between the tendrils.
    g.fillStyle(WARDEN.sculk, alpha);
    g.fillRect(x - 10, top - 3, 20, 4);
    g.fillStyle(WARDEN.tealLit, alpha * 0.6);
    g.fillRect(x - 10, top - 3, 20, 1.4);

    // Square fists over the hand discs, turned to the aim.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const ang = this.facing;
      const c = Math.cos(ang), s = Math.sin(ang);
      const sq = (h: number): Phaser.Geom.Point[] => pts([
        [hx + (-h) * c - (-h) * s, hy + (-h) * s + (-h) * c],
        [hx + h * c - (-h) * s, hy + h * s + (-h) * c],
        [hx + h * c - h * s, hy + h * s + h * c],
        [hx + (-h) * c - h * s, hy + (-h) * s + h * c],
      ]);
      g.fillStyle(WARDEN.sculkDark, alpha);
      g.fillPoints(sq(m ? 7.4 : 6.6), true);
      g.fillStyle(WARDEN.teal, alpha);
      g.fillPoints(sq(m ? 6 : 5.3), true);
      // Knuckle line, lit on the beat when mastered.
      const kx = hx + c * 4, ky = hy + s * 4;
      g.lineStyle(1.6, m ? WARDEN.cyan : WARDEN.tealLit, alpha * (m ? 0.5 + 0.5 * b : 0.8));
      g.lineBetween(kx - s * 4.5, ky + c * 4.5, kx + s * 4.5, ky - c * 4.5);
    }
  }
}
