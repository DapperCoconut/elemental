import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from '../ElementVisuals';

/**
 * The Roaring skin's character: metal's butcher replaced by a knight cut out of the dark.
 *
 * Everything about the read is *black shape, white edge*. The armour is filled with flat void
 * and stroked with a hard white rim; the helm is an angular frog-mouth with one horizontal
 * visor slit, and the rig's own eyes are left to burn inside that slit rather than being drawn
 * over the front of it — `drawBody` paints under the face, so the slit is a socket and the two
 * white discs are the light coming out of it.
 *
 * Two forms. **Unmastered** is a gaunt floating knight: narrow cuirass, spiked pauldrons, a
 * modest two-tine crown. **Mastered** unfurls a tattered cape, splits the visor into a jagged
 * roar, and grows the crown into a full antler rack.
 *
 * The afterimage is the other half of the look. The rig keeps a short trail of its own recent
 * positions and stamps a fading silhouette at each one, under the sprite — so anything that
 * moves the character (a dash, a lunge, a swing that drags the body with it) smears.
 *
 * Unlike an element's own avatar this one takes no colour mapper — a skin's palette is already
 * the final one, and routing black through metal's remap would tint it.
 */

const ROAR = {
  void: 0x000000,
  char: 0x080810,
  iron: 0x161620,
  dim: 0x1c1c28,
  steel: 0x3a3a4e,
  mid: 0x33334a,
  pale: 0x6b6b8a,
  chrome: 0x8e8ea8,
  lit: 0xa8a8c4,
  hi: 0xd0d0e4,
  white: 0xffffff,
};

/** Gauntlets of nothing, rimmed in white — concentric discs of one hand, outermost first. */
const ROARING_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: ROAR.white, alpha: 0.1 },
    { r: 7.6, color: ROAR.void, alpha: 1 },
    { r: 4.8, color: ROAR.iron, alpha: 1 },
    { r: 2.0, color: ROAR.white, alpha: 1, ox: -2.1, oy: -2.2 },
  ],
  eyeWhite: ROAR.white,
  eyePupil: ROAR.hi,
  // Heavy plate: it lags and smears, but it never squashes much.
  squash: { div: 17, x: 0.46, y: 0.2 },
};

/** How long an afterimage lives, and how often one is stamped. */
const GHOST_LIFE = 0.42;
const GHOST_EVERY = 0.05;
const GHOST_MAX = 7;
/** Below this much movement between samples the knight isn't really going anywhere. */
const GHOST_MIN_MOVE = 2.2;

// ── Primitives ────────────────────────────────────────────────────────────

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

/** Fill a polygon in void and trace it in white — the whole grammar of this character. */
function plate(
  g: Phaser.GameObjects.Graphics,
  pts: Pt[], fill: number, rim: number, alpha: number, rimWidth = 1.5,
): void {
  g.fillStyle(fill, alpha);
  g.fillPoints(pts, true);
  if (rimWidth <= 0) return;
  g.lineStyle(rimWidth, rim, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

/**
 * A tine: a straight spike with a fat root and a needle point, drawn point-by-point so the
 * taper is continuous. Antlers are all this shape at different lengths and rakes — a spike
 * built out of stacked circles at this size reads as a caterpillar, not a horn.
 */
function tine(cx: number, cy: number, angle: number, len: number, halfW: number, curl: number): Pt[] {
  const segs = 7;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let px = cx, py = cy, a = angle;
  const step = len / segs;
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const w = halfW * Math.pow(1 - f, 0.55);
    const nx = -Math.sin(a), ny = Math.cos(a);
    left.push(P(px + nx * w, py + ny * w));
    right.push(P(px - nx * w, py - ny * w));
    a += (curl * (0.3 + f * 1.7)) / segs;
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
  }
  right.reverse();
  return left.concat(right);
}

// ── RoaringFx ─────────────────────────────────────────────────────────────

/** The one-shot bits the rig itself throws off: hand-trail ghosts. */
class RoaringFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /**
   * The afterimage a moving fist leaves: a black disc with a white rim that swells and fades
   * in place. It doesn't drift — an afterimage is a record of where something *was*, so any
   * motion of its own breaks the illusion.
   */
  ghostFist(x: number, y: number): void {
    this.anim(4, 260, (g, t) => {
      const fade = 1 - t;
      const r = 6.4 * (1 + t * 0.5);
      g.fillStyle(ROAR.void, 0.55 * fade);
      g.fillCircle(x, y, r);
      g.lineStyle(1.4, ROAR.white, 0.7 * fade);
      g.strokeCircle(x, y, r);
    });
  }
}

// ── RoaringAvatar ─────────────────────────────────────────────────────────

interface Ghost { x: number; y: number; born: number }

export class RoaringAvatar extends BaseAvatar {
  private fx: RoaringFx;
  /** Recent positions, stamped under the sprite as fading silhouettes. */
  private ghosts: Ghost[] = [];
  private lastGhostAt = -Infinity;
  private lastGhostX = 0;
  private lastGhostY = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, ROARING_AVATAR);
    this.fx = new RoaringFx(scene);
  }

  /**
   * Mastery tell — the knight stops being a figure and starts being a presence: a hotter
   * corona on each fist and a white rim round the plate. The silhouette changes (cape, roaring
   * visor, full rack) live in the drawing hooks off `this.mastered`.
   */
  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 16 : 12);
      halo.setFillStyle(ROAR.white, on ? 0.16 : 0.1);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, ROAR.white, 0.9);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.ghostFist(x, y);
  }

  /** Both fists hauled in behind the guard — metal's own brace, kept so holds still read. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const grip = 0.5 + 0.5 * Math.sin(this.t * 6);
    return {
      ang: this.facing + side * (0.42 + grip * 0.16),
      dist: 20 + grip * 6,
      scale: idle.scale * (1.12 + grip * 0.14),
    };
  }

  // ── Geometry shared by the hooks ────────────────────────────────────────

  /** The float. Matched to BaseAvatar's own eye bob so the helm and the visor light stay locked. */
  private bob(): number {
    return Math.sin(this.t * 2.6) * 1.1;
  }

  /** Cuirass, pauldrons and helm as point lists, so the ghost pass can reuse them verbatim. */
  private silhouette(x: number, y: number): Pt[][] {
    const k = this.mastered ? 1.08 : 1;
    const cuirass = [
      P(x - 21 * k, y - 15), P(x - 9, y - 20), P(x + 9, y - 20), P(x + 21 * k, y - 15),
      P(x + 15 * k, y + 2), P(x + 11, y + 15), P(x, y + 25), P(x - 11, y + 15),
      P(x - 15 * k, y + 2),
    ];
    // Pauldrons are raked back and up — a knight's shoulders read as threat before anything else.
    const pauldron = (side: number): Pt[] => [
      P(x + side * 12, y - 20),
      P(x + side * 26 * k, y - 26 * k),
      P(x + side * 33 * k, y - 13),
      P(x + side * 24, y - 6),
      P(x + side * 15, y - 10),
    ];
    // Frog-mouth helm: a wedge that overhangs the visor and comes to a chin below it.
    const helm = [
      P(x, y - 30), P(x + 15, y - 24), P(x + 17, y - 10), P(x + 12, y + 1),
      P(x, y + 6), P(x - 12, y + 1), P(x - 17, y - 10), P(x - 15, y - 24),
    ];
    return [cuirass, pauldron(-1), pauldron(1), helm];
  }

  // ── Layers ──────────────────────────────────────────────────────────────

  /** The afterimage trail, plus the pool of dark the knight floats over. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    // Sample a new ghost if the body has actually moved since the last one.
    if (this.t - this.lastGhostAt >= GHOST_EVERY) {
      if (Math.hypot(x - this.lastGhostX, y - this.lastGhostY) >= GHOST_MIN_MOVE) {
        this.ghosts.push({ x, y, born: this.t });
        if (this.ghosts.length > GHOST_MAX) this.ghosts.shift();
      }
      this.lastGhostAt = this.t;
      this.lastGhostX = x;
      this.lastGhostY = y;
    }
    this.ghosts = this.ghosts.filter((gh) => this.t - gh.born < GHOST_LIFE);

    for (const gh of this.ghosts) {
      const age = (this.t - gh.born) / GHOST_LIFE;
      const fade = (1 - age) * (1 - age);
      const by = gh.y + this.bob();
      for (const pts of this.silhouette(gh.x, by)) {
        plate(g, pts, ROAR.void, ROAR.white, fade * 0.5, 1.1);
      }
    }

    // Nothing under it but its own shadow — the knight does not stand on the floor.
    const drop = (this.mastered ? 1.3 : 1) * this.intensity;
    g.fillStyle(ROAR.void, a * 0.55 * this.intensity);
    g.fillEllipse(x, y + 32, 54 * drop, 15 * drop);
    g.fillStyle(ROAR.iron, a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 32, 34 * drop, 9 * drop);
    if (this.mastered) {
      // A cold ring of light bleeding out from under the cape.
      g.lineStyle(1.6, ROAR.pale, a * 0.4 * (0.6 + 0.4 * Math.sin(this.t * 3)));
      g.strokeEllipse(x, y + 31, 66 + Math.sin(this.t * 2) * 6, 19);
    }
  }

  /**
   * The armour, painted over the fighter sprite and under the face — which is the whole trick
   * with this character, because it means the visor slit is cut *behind* the eyes and they read
   * as the light inside the helm.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const by = y + this.bob();
    if (this.mastered) this.drawCape(g, x, by, alpha);

    const [cuirass, pauldronL, pauldronR, helm] = this.silhouette(x, by);

    plate(g, cuirass, ROAR.void, ROAR.white, alpha, 1.7);
    // A single ridge down the breastplate — without it the cuirass is a black kite.
    g.lineStyle(1.2, ROAR.steel, alpha * 0.85);
    g.lineBetween(x, by - 18, x, by + 22);
    g.lineStyle(1, ROAR.pale, alpha * 0.5);
    g.lineBetween(x - 6, by - 12, x - 3, by + 14);

    for (const pd of [pauldronL, pauldronR]) plate(g, pd, ROAR.char, ROAR.white, alpha, 1.5);
    // Spikes standing off the top of each pauldron.
    for (const side of [-1, 1] as const) {
      const n = this.mastered ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const sx = x + side * (19 + i * 6);
        const sy = by - 22 - i * 2;
        plate(g, tine(sx, sy, -Math.PI / 2 + side * (0.5 + i * 0.18), 11 - i * 1.5, 2.6, side * 0.2),
          ROAR.void, ROAR.white, alpha, 1.1);
      }
    }

    plate(g, helm, ROAR.void, ROAR.white, alpha, 1.7);
    this.drawVisor(g, x, by, a, alpha);

    // Gorget under the chin, tying the helm to the cuirass.
    g.fillStyle(ROAR.char, alpha);
    g.fillEllipse(x, by + 8, 26, 8);
    g.lineStyle(1.3, ROAR.pale, alpha * 0.8);
    g.strokeEllipse(x, by + 8, 26, 8);
  }

  /**
   * The slit. Left *dark* rather than lit — the eyes render on top of it and supply the glow,
   * so painting light in here would double it up. Once mastered the slit breaks downward into a
   * jagged mouth, which is where the name comes from.
   */
  private drawVisor(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const slitY = y - 4;
    g.fillStyle(ROAR.dim, alpha);
    g.fillPoints([
      P(x - 14, slitY - 5), P(x + 14, slitY - 5),
      P(x + 12, slitY + 5), P(x - 12, slitY + 5),
    ], true);
    // Bright lip along the top of the slit — the overhang catching the light from inside.
    g.lineStyle(1.4, ROAR.white, alpha * 0.9);
    g.lineBetween(x - 14, slitY - 5, x + 14, slitY - 5);

    // A wash of light spilling out of the socket, breathing.
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 3.6);
    g.fillStyle(ROAR.hi, a * 0.22 * pulse * this.intensity);
    g.fillEllipse(x, slitY, 34, 15);

    if (this.mastered) {
      // The roar: teeth of shadow biting down out of the visor.
      for (let i = -3; i <= 3; i++) {
        const tx = x + i * 4.4;
        const drop = 6 + (i % 2 === 0 ? 4 : 1.5);
        g.fillStyle(ROAR.void, alpha);
        g.fillPoints([P(tx - 2.4, slitY + 4), P(tx + 2.4, slitY + 4), P(tx, slitY + drop)], true);
        g.lineStyle(0.9, ROAR.white, alpha * 0.75);
        g.lineBetween(tx - 2.4, slitY + 4, tx, slitY + drop);
      }
      g.fillStyle(ROAR.white, a * 0.3 * pulse);
      g.fillEllipse(x, slitY - 1, 20, 6);
    }
  }

  /** Mastered: a cape of torn dark hanging off the pauldrons and trailing behind the run. */
  private drawCape(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    // The cape drags opposite the way the hands have been flung, which is the rig's free read
    // on which way the body is travelling.
    const mean = (this.armX[0] + this.armX[1]) / 2;
    const drag = Phaser.Math.Clamp((x - mean) * 0.7, -14, 14);
    const sway = Math.sin(this.t * 1.7) * 3;

    const pts: Pt[] = [P(x - 24, y - 22), P(x + 24, y - 22)];
    // Ragged hem: alternating points, each swung further the lower it hangs.
    const teeth = 7;
    for (let i = teeth; i >= 0; i--) {
      const f = i / teeth;
      const px = x - 30 + 60 * f + drag * 0.8 + sway * f;
      const py = y + 30 + (i % 2 === 0 ? 9 : 0) + Math.sin(f * 5 + this.t * 2) * 2.5;
      pts.push(P(px, py));
    }
    plate(g, pts, ROAR.void, ROAR.white, alpha * 0.92, 1.3);
    // Two folds, so a black sheet doesn't read as a hole in the screen.
    for (const off of [-9, 8]) {
      g.lineStyle(1.1, ROAR.steel, alpha * 0.6);
      g.lineBetween(x + off * 0.5, y - 20, x + off + drag * 0.6, y + 30);
    }
  }

  /**
   * The crown of antlers, rooted above the helm so it never touches the face. Unmastered is a
   * spare two-tine pair; mastered is a full rack with brow tines and a halo of cold light.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const by = y + this.bob();
    const rootY = by - 27;
    const rack = this.mastered ? 4 : 2;
    const scale = (this.mastered ? 1.35 : 1) * this.intensity;

    for (const side of [-1, 1] as const) {
      // Main beam, sweeping out and up off the temple.
      const beamAng = -Math.PI / 2 + side * 0.5;
      const beamLen = 30 * scale;
      plate(g, tine(x + side * 7, rootY, beamAng, beamLen, 3.4 * scale, side * 0.5),
        ROAR.void, ROAR.white, alpha, 1.4);

      // Tines off the beam, raked forward and shortening toward the tip.
      for (let i = 0; i < rack; i++) {
        const f = 0.25 + (i / Math.max(1, rack - 1)) * 0.6;
        const ba = beamAng + side * 0.5 * f * f;
        const bx = x + side * 7 + Math.cos(ba) * beamLen * f;
        const byy = rootY + Math.sin(ba) * beamLen * f;
        const len = (14 - i * 2.2) * scale;
        plate(g, tine(bx, byy, ba - side * (0.75 - i * 0.1), len, 2.2 * scale, side * 0.3),
          ROAR.void, ROAR.white, alpha, 1.1);
      }
    }

    if (this.mastered) {
      // A ring of cold light standing behind the rack — the presence, not the armour.
      const r = 30 + Math.sin(this.t * 2.4) * 2;
      g.lineStyle(1.6, ROAR.pale, a * 0.5);
      g.strokeCircle(x, rootY - 6, r);
      g.lineStyle(0.9, ROAR.white, a * 0.35);
      g.strokeCircle(x, rootY - 6, r - 4);
      // Motes of dark circling the crown, each rimmed so they read as objects, not gaps.
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.4 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 30;
        const cy = rootY - 6 + Math.sin(p) * 8;
        const near = 0.7 + 0.3 * easeOut(0.5 + 0.5 * Math.sin(p));
        g.fillStyle(ROAR.void, alpha * 0.95);
        g.fillCircle(cx, cy, 3.6 * near);
        g.lineStyle(1.1, ROAR.white, alpha * 0.75);
        g.strokeCircle(cx, cy, 3.6 * near);
      }
    }
  }
}
