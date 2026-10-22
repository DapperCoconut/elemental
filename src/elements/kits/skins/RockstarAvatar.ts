import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn } from '../ElementVisuals';
import { ROCK, RockstarFx, boltGlyph, drawDrumKit, rockFill, rockStar } from './RockstarFx';

/**
 * The Rockstar skin's character (Sound): the drum major replaced by a punk rocker.
 *
 * **Unmastered** — a pale face under a hot-pink mohawk (five spikes, tips in the soul song's
 * colour), shaved black sides with lightning lines, eyeliner, and a black biker jacket: popped
 * collar, asymmetric chrome zip, studded shoulders, a pink band tee showing at the neck.
 * **Mastered** — a headliner: the mohawk explodes into a crown of liberty spikes, crackling
 * between them; chrome-spiked shoulder pads, a chain across the chest, a star painted over one
 * eye, and a stage cape (black outside, purple lining) flaring out behind.
 *
 * During the solo (`setInstrument('bugle')`, the kit's word for "the solo is on") a drum kit
 * stands in front of the body and both hands drum it with sticks; `drumHit()` shakes the
 * cymbals and lights the kick on a landed note.
 */

const ROCK_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: ROCK.pink, alpha: 0.2 },
    { r: 6.8, color: ROCK.black, alpha: 1 },
    { r: 5.3, color: ROCK.leatherHi, alpha: 1 },
    { r: 1.9, color: ROCK.chrome, alpha: 0.95, ox: -1.4, oy: -1.6 },
  ],
  eyeWhite: 0xfdf2ff,
  eyePupil: 0x1a0a24,
  squash: { div: 12, x: 0.5, y: 0.28 },
};

type Instrument = 'none' | 'bugle';

export class RockstarAvatar extends BaseAvatar {
  private fx: RockstarFx;
  private instrument: Instrument = 'none';
  private song: number = ROCK.pink;
  private songPale: number = ROCK.pinkPale;
  private dance = 0;
  /** 0 → 1, decaying: a landed solo note. */
  private hit = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ROCK_AVATAR);
    this.fx = new RockstarFx(scene);
  }

  // ── The Sound kit's rig surface (same names as SoundAvatar) ─────────────

  setInstrument(i: Instrument): void { this.instrument = i; }
  setSong(color: number, pale: number): void {
    if (color === this.song) return;
    this.song = color;
    this.songPale = pale;
    this.forEachHandLayer(0, (halo) => halo.setFillStyle(color, this.mastered ? 0.3 : 0.2));
  }
  setDance(v: number): void { this.dance = Phaser.Math.Clamp(v, 0, 1); }
  /** A solo note landed: crash the cymbal. Visual only. */
  drumHit(big = false): void {
    this.hit = big ? 1 : 0.75;
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 10);
      halo.setFillStyle(this.song, on ? 0.3 : 0.2);
    });
    this.forEachHandLayer(3, (stud) => stud.setFillStyle(on ? ROCK.pinkPale : ROCK.chrome, 0.95));
  }

  /** Fast hands throw off pink sparks. */
  protected emitTrail(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 18;
    const col = Math.random() < 0.5 ? this.song : ROCK.pinkHi;
    this.fx.anim(5, 480, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(col, 0.4 * fade);
      g.fillCircle(x + drift * t, y - 16 * t, 3.4 * fade);
      g.fillStyle(ROCK.white, 0.9 * fade);
      rockStar(g, x + drift * t, y - 16 * t, 2.4 * fade, t * 6);
    });
  }

  /** At the kit: sticks alternating on snare/hi-hat and toms/crash. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const stroke = Math.max(0, Math.sin(this.t * 15 + (side > 0 ? Math.PI : 0)));
    const lift = stroke * 8;
    const tx = side * (15 + Math.sin(this.t * 3.1 + side) * 4);
    const ty = 2 - lift;
    return { ang: Math.atan2(ty, tx), dist: Math.hypot(tx, ty), scale: idle.scale * (1 + stroke * 0.08) };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.hit = Math.max(0, this.hit - delta / 260);
    super.update(delta, x, y, alpha);
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** Stage light pooled under them; mastered, the cape flaring out behind the body. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(ROCK.purple, a * 0.24 * k);
    g.fillCircle(x, y, 27 * k);
    g.fillStyle(this.song, a * (0.1 + this.dance * 0.15));
    g.fillEllipse(x, y + 24, 70 * k, 20 * k);
    if (!this.mastered) return;

    // The cape: rooted at the shoulders, flaring wide and down, its hem flapping and trailing
    // opposite the hands' drift (which way they are running).
    const drift = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.5, -10, 10);
    const hem: { x: number; y: number }[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const hx = x - 34 + u * 68 - drift * 0.8;
      const hy = y + 30 + Math.sin(this.t * 4 + u * 7) * 2.6 + Math.sin(u * Math.PI) * 4;
      hem.push({ x: hx, y: hy });
    }
    g.fillStyle(ROCK.black, alpha);
    rockFill(g, [{ x: x - 16, y: y - 6 }, { x: x + 16, y: y - 6 }, ...hem.slice().reverse()]);
    g.fillStyle(ROCK.purpleDeep, alpha);
    rockFill(g, [{ x: x - 14, y: y - 4 }, { x: x + 14, y: y - 4 }, ...hem.slice().reverse().map((p) => ({ x: x + (p.x - x) * 0.86, y: p.y - 3 }))]);
    g.fillStyle(ROCK.purple, alpha * 0.8);
    rockFill(g, [{ x: x - 10, y: y - 2 }, { x: x - 2, y: y - 2 }, ...hem.slice(1, 5).reverse().map((p) => ({ x: x + (p.x - x) * 0.8, y: p.y - 5 }))]);
    // Stars sewn into the lining.
    g.fillStyle(ROCK.pinkHi, alpha * 0.9);
    rockStar(g, x - 26 - drift * 0.6, y + 22, 2.6, this.t * 0.5);
    rockStar(g, x + 25 - drift * 0.6, y + 20, 2.2, -this.t * 0.4);
    // Chrome hem trim.
    g.lineStyle(1.4, ROCK.chromeMid, alpha);
    g.beginPath();
    g.moveTo(hem[0].x, hem[0].y);
    for (const p of hem) g.lineTo(p.x, p.y);
    g.strokePath();
  }

  /** Head and jacket, over the sprite and under the eyes — the drum kit too while soloing. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const A = alpha;
    const lean = Math.cos(this.facing) * 1.2;

    // Shaved, black-stubbled skull behind the face, wide enough to hide the disc's crown.
    g.fillStyle(ROCK.stubble, A);
    g.fillEllipse(x, y - 9, 40, 30);
    // Face.
    g.fillStyle(ROCK.skinShade, A);
    g.fillEllipse(x + 1.2, y - 5, 31, 28);
    g.fillStyle(ROCK.skin, A);
    g.fillEllipse(x, y - 5.6, 29, 26);
    // Lightning lines shaved into each side.
    g.lineStyle(1, ROCK.leatherLit, A);
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + sd * 17, y - 17);
      g.lineTo(x + sd * 15, y - 12);
      g.lineTo(x + sd * 18, y - 11);
      g.lineTo(x + sd * 16, y - 6);
      g.strokePath();
    }
    // Eyeliner under where the eyes sit (the rig paints the eyes over this).
    const bob = Math.sin(this.t * 2.6) * 1.1;
    for (const sd of [-1, 1]) {
      const ex = x + sd * 7.2 + Math.cos(this.facing) * 2.4;
      const ey = y - 4 + Math.sin(this.facing) * 2 + bob;
      if (this.mastered && sd > 0) {
        g.fillStyle(ROCK.pink, A);
        rockStar(g, ex, ey, 9.5, -Math.PI / 2);
      }
      g.fillStyle(ROCK.black, A * 0.9);
      g.fillEllipse(ex, ey, 11.6, 11);
      g.fillTriangle(ex + sd * 4.5, ey - 1.8, ex + sd * 8.5, ey - 3.6, ex + sd * 5, ey + 1);
    }
    // Smirk.
    g.lineStyle(1.3, ROCK.pinkDeep, A);
    g.beginPath();
    g.arc(x + lean + 2, y + 2.6, 4, 0.2, Math.PI * 0.75, false);
    g.strokePath();

    // ── The jacket ────────────────────────────────────────────────────────
    const jacket = [
      { x: x - 23, y: y + 6 }, { x: x - 19, y: y + 2 }, { x: x - 9, y: y + 4 }, { x: x + lean, y: y + 11 },
      { x: x + 9, y: y + 4 }, { x: x + 19, y: y + 2 }, { x: x + 23, y: y + 6 }, { x: x + 22, y: y + 18 },
      { x: x + 18, y: y + 24 }, { x: x - 18, y: y + 24 }, { x: x - 22, y: y + 18 },
    ];
    g.fillStyle(ROCK.black, A);
    rockFill(g, jacket.map((p) => ({ x: p.x + 1.4, y: p.y + 1 })));
    g.fillStyle(ROCK.leather, A);
    rockFill(g, jacket);
    // Tee in the open neck, with a black bolt.
    g.fillStyle(ROCK.pink, A);
    rockFill(g, [{ x: x - 8, y: y + 5 }, { x: x + 8, y: y + 5 }, { x: x + lean + 3, y: y + 17 }, { x: x + lean - 3, y: y + 17 }]);
    g.fillStyle(ROCK.black, A);
    boltGlyph(g, x + lean, y + 10, 8, 0);
    // Lapels, lit on the left.
    g.fillStyle(ROCK.leatherHi, A);
    rockFill(g, [{ x: x - 19, y: y + 2 }, { x: x - 8, y: y + 4 }, { x: x + lean - 3, y: y + 17 }, { x: x - 9, y: y + 15 }]);
    g.fillStyle(ROCK.leatherLit, A * 0.7);
    rockFill(g, [{ x: x - 18, y: y + 3 }, { x: x - 12, y: y + 4 }, { x: x - 10, y: y + 9 }]);
    g.fillStyle(ROCK.leatherHi, A * 0.8);
    rockFill(g, [{ x: x + 19, y: y + 2 }, { x: x + 8, y: y + 4 }, { x: x + lean + 3, y: y + 17 }, { x: x + 9, y: y + 15 }]);
    // Popped collar: two points flaring up beside the jaw (clear of the eyes).
    for (const sd of [-1, 1]) {
      g.fillStyle(ROCK.black, A);
      rockFill(g, [{ x: x + sd * 13, y: y + 5 }, { x: x + sd * 22, y: y - 3 }, { x: x + sd * 20, y: y + 5 }]);
      g.fillStyle(ROCK.leatherHi, A);
      rockFill(g, [{ x: x + sd * 14, y: y + 4.5 }, { x: x + sd * 21, y: y - 1.5 }, { x: x + sd * 19.5, y: y + 4.5 }]);
    }
    // Asymmetric chrome zip and a pull tab.
    g.lineStyle(1.3, ROCK.chromeMid, A);
    g.lineBetween(x + 9, y + 15, x + 5, y + 23.5);
    g.fillStyle(ROCK.chrome, A);
    g.fillRect(x + 4, y + 21, 2.4, 3);
    // Belt with a chrome buckle.
    g.fillStyle(ROCK.black, A);
    g.fillRect(x - 18, y + 20, 36, 3.2);
    g.fillStyle(ROCK.chrome, A);
    g.fillRect(x + lean - 3, y + 19.6, 6, 4);
    g.fillStyle(ROCK.black, A);
    g.fillRect(x + lean - 1.6, y + 20.6, 3.2, 2);

    if (!this.mastered) {
      // Studs along both shoulders.
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const sx = x + sd * (11 + i * 3.2), sy = y + 3 + i * 0.6;
          g.fillStyle(ROCK.steel, A);
          g.fillCircle(sx + 0.3, sy + 0.4, 1.4);
          g.fillStyle(ROCK.chrome, A);
          g.fillCircle(sx, sy, 1.1);
        }
      }
    } else {
      // Spiked chrome pauldrons.
      for (const sd of [-1, 1]) {
        const px = x + sd * 18, py = y + 4;
        g.fillStyle(ROCK.steelDark, A);
        g.fillEllipse(px, py + 1, 16, 10);
        g.fillStyle(ROCK.chromeMid, A);
        g.fillEllipse(px, py, 15, 9);
        g.fillStyle(ROCK.chrome, A);
        g.fillEllipse(px - sd * 2, py - 1.6, 7, 3);
        for (let i = 0; i < 3; i++) {
          const ang = -Math.PI / 2 + sd * (0.5 + i * 0.5);
          const bx = px + Math.cos(ang) * 5, by = py + Math.sin(ang) * 3;
          const tx = px + Math.cos(ang) * 13, ty = py + Math.sin(ang) * 10;
          g.fillStyle(ROCK.chromeMid, A);
          rockFill(g, [
            { x: bx - Math.sin(ang) * 2.4, y: by + Math.cos(ang) * 2.4 },
            { x: tx, y: ty },
            { x: bx + Math.sin(ang) * 2.4, y: by - Math.cos(ang) * 2.4 },
          ]);
          g.fillStyle(ROCK.white, A * 0.8);
          g.fillCircle(tx - Math.cos(ang) * 2, ty - Math.sin(ang) * 2, 0.8);
        }
      }
      // A chain swinging across the chest.
      const swing = Math.sin(this.t * (3 + this.dance * 8)) * (1 + this.dance * 2);
      for (let i = 0; i <= 9; i++) {
        const u = i / 9;
        const cx = x - 14 + u * 28;
        const cy = y + 12 + Math.sin(u * Math.PI) * (5 + swing);
        g.lineStyle(1, ROCK.chrome, A);
        g.strokeEllipse(cx, cy, 3.2, 2.2);
      }
    }

    if (this.instrument === 'bugle') {
      const dir: 1 | -1 = Math.cos(this.facing) >= 0 ? 1 : -1;
      drawDrumKit(g, x, y + 2, dir, this.t, A, this.hit);
    }
  }

  /** The hair (rooted at the crown) and, at the kit, the sticks in both hands. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const A = alpha;
    // Headbang: the hair whips with the dance and the solo.
    const bang = this.dance + (this.instrument === 'bugle' ? 0.7 : 0);
    const drift = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.35, -6, 6);
    const whip = Math.sin(this.t * (3 + bang * 10)) * (1 + bang * 4) - drift;
    const crownY = y - 18 + Math.max(0, Math.sin(this.t * (2.6 + bang * 10))) * bang * 2;

    const spike = (bx: number, by: number, ang: number, len: number, w: number, col: number, tip: number): void => {
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const nx = -sin, ny = cos;
      const pts: { x: number; y: number }[] = [];
      const steps = 6;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const hw = w * (1 - u) ** 0.9;
        const bend = whip * u * u * 0.6;
        pts.push({ x: bx + cos * len * u + nx * hw + bend, y: by + sin * len * u + ny * hw });
      }
      for (let i = steps; i >= 0; i--) {
        const u = i / steps;
        const hw = w * (1 - u) ** 0.9;
        const bend = whip * u * u * 0.6;
        pts.push({ x: bx + cos * len * u - nx * hw + bend, y: by + sin * len * u - ny * hw });
      }
      g.fillStyle(col, A);
      rockFill(g, pts);
      // Tip in the song's colour: the last third of the spike.
      const tp: { x: number; y: number }[] = [];
      for (let i = 4; i <= steps; i++) {
        const u = i / steps;
        const hw = w * (1 - u) ** 0.9;
        tp.push({ x: bx + cos * len * u + nx * hw + whip * u * u * 0.6, y: by + sin * len * u + ny * hw });
      }
      for (let i = steps; i >= 4; i--) {
        const u = i / steps;
        const hw = w * (1 - u) ** 0.9;
        tp.push({ x: bx + cos * len * u - nx * hw + whip * u * u * 0.6, y: by + sin * len * u - ny * hw });
      }
      g.fillStyle(tip, A);
      rockFill(g, tp);
      // Lit edge.
      g.lineStyle(1, ROCK.pinkPale, A * 0.6);
      g.lineBetween(bx + nx * w * 0.5, by + ny * w * 0.5, bx + cos * len * 0.6 + nx * w * 0.2 + whip * 0.2, by + sin * len * 0.6 + ny * w * 0.2);
    };

    if (!this.mastered) {
      // The mohawk: five spikes in a fan, tallest in the middle.
      const fan = [
        { ox: -6, ang: -Math.PI / 2 - 0.55, len: 13 },
        { ox: -3, ang: -Math.PI / 2 - 0.27, len: 18 },
        { ox: 0, ang: -Math.PI / 2, len: 22 },
        { ox: 3, ang: -Math.PI / 2 + 0.27, len: 18 },
        { ox: 6, ang: -Math.PI / 2 + 0.55, len: 13 },
      ];
      g.fillStyle(ROCK.pinkDeep, A);
      g.fillEllipse(x, crownY + 1, 16, 6);
      for (const s of fan) {
        spike(x + s.ox + 0.8, crownY + 1, s.ang, s.len, 4, ROCK.pinkDeep, ROCK.pinkDeep);
        spike(x + s.ox, crownY, s.ang, s.len, 3.6, ROCK.pink, this.song);
      }
    } else {
      // Liberty spikes: a full crown, nine long spikes, crackling between their tips.
      const n = 9;
      const tips: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const ang = -Math.PI + 0.25 + u * (Math.PI - 0.5);
        const len = 18 + Math.sin(u * Math.PI) * 12;
        const bx = x + Math.cos(ang) * 12, by = crownY + 4 + Math.sin(ang) * 6;
        const col = i % 2 ? ROCK.purple : ROCK.pink;
        spike(bx + 0.8, by + 1, ang, len, 4.6, ROCK.purpleDeep, ROCK.purpleDeep);
        spike(bx, by, ang, len, 4.2, col, this.song);
        tips.push({ x: bx + Math.cos(ang) * len + whip * 0.6, y: by + Math.sin(ang) * len });
      }
      // Arcs jumping tip to tip, re-rolled a few times a second.
      const roll = Math.floor(this.t * 9);
      for (let k = 0; k < 2; k++) {
        const i = (roll * 3 + k * 4) % (n - 1);
        const p = tips[i], q = tips[i + 1];
        const mx = (p.x + q.x) / 2 + Math.sin(roll * 7.1 + k) * 3, my = (p.y + q.y) / 2 - 3 + Math.cos(roll * 3.3 + k) * 2;
        g.lineStyle(2.4, ROCK.purpleHi, A * 0.4);
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(mx, my); g.lineTo(q.x, q.y); g.strokePath();
        g.lineStyle(1, ROCK.white, A * 0.9);
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(mx, my); g.lineTo(q.x, q.y); g.strokePath();
      }
      // A floating star over the crown — the headliner's tell.
      g.fillStyle(this.songPale, A * 0.35);
      g.fillCircle(x, crownY - 34, 6);
      g.fillStyle(ROCK.pinkPale, A);
      rockStar(g, x, crownY - 34 + Math.sin(this.t * 2) * 1.5, 4.4, this.t * 0.8);
    }

    // Sticks at the kit: each from the hand toward its drum, raised on the up-stroke.
    if (this.instrument === 'bugle') {
      for (let i = 0; i < 2; i++) {
        const hx = this.armX[i], hy = this.armY[i];
        const side = i === 0 ? -1 : 1;
        const ang = Math.atan2(hy - (y - 4), hx - (x + side * 4)) + side * 0.25;
        const tx = hx + Math.cos(ang) * 13, ty = hy + Math.sin(ang) * 13;
        g.lineStyle(3, ROCK.woodShade, A);
        g.lineBetween(hx - Math.cos(ang) * 4, hy - Math.sin(ang) * 4, tx, ty);
        g.lineStyle(1.8, ROCK.wood, A);
        g.lineBetween(hx - Math.cos(ang) * 4, hy - Math.sin(ang) * 4, tx, ty);
        g.fillStyle(ROCK.wood, A);
        g.fillCircle(tx, ty, 1.6);
      }
    }
  }
}
