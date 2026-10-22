import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn } from '../ElementVisuals';
import { JASON_FIRE, JasonFx, drawMachete, flameLayered } from './JasonFx';

/**
 * The Jason skin's character: Silence's fog-orb replaced by the camp-lake slasher.
 *
 * **Unmastered** — a hulking man in a white hockey mask (red chevrons, breathing holes, straps)
 * over a bald, scarred head, in a torn olive work jacket that hangs past the sprite's lower
 * edge, a machete in his right fist.
 * **Mastered** — the one they chained at the bottom of the lake: shoulders hunched higher with
 * torn sleeve tufts, chains crossed over the chest, lake-weed hanging off him, an axe crack
 * split down the mask, and a broken chain dragging a rusted shackle-weight behind him.
 *
 * **Flaming** (`setForm('flaming')`, driven by the kit while his Run ultimate is live): the
 * jacket chars and smoulders, fire stands up off his shoulders and crown, the mask chevrons
 * and eye-holes glow, the machete runs hot and every move sheds embers.
 *
 * The mask's eye-holes are computed with exactly the same offsets `BaseAvatar` uses for the
 * eyes (±7.2, -4, plus look and bob), so the eyes always sit in the holes.
 */

const J = {
  maskLit: 0xf4f1e6,
  mask: 0xe2ddcc,
  maskShade: 0xb9b29c,
  maskDeep: 0x7f7864,
  maskScorch: 0x5a5146,
  chevron: 0xc4161c,
  chevronDark: 0x7a0c10,
  hole: 0x0d0b09,
  strap: 0x2a2620,
  skin: 0x8a7462,
  skinShade: 0x5e4a3e,
  scar: 0xa8907a,
  jacketLit: 0x5f5a44,
  jacket: 0x4a4636,
  jacketShade: 0x33301f,
  jacketDeep: 0x221f15,
  charred: 0x1a1612,
  shirt: 0x2e3a3e,
  button: 0x9a8e70,
  glove: 0x3b2a1e,
  gloveLit: 0x5e4430,
  gloveDeep: 0x1e140d,
  chain: 0x6a6e70,
  chainLit: 0xa8adb0,
  rust: 0x7a3d1c,
  rustLit: 0xa85a2c,
  weed: 0x3f5a34,
  weedLit: 0x6b8a4a,
  sclera: 0xdcd6c2,
  pupil: 0x140806,
};

/** Leather work gloves: shadow, glove, knuckle, a dull glint. */
const JASON_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.6, color: J.gloveDeep, alpha: 0.45 },
    { r: 7.4, color: J.glove, alpha: 1 },
    { r: 4.6, color: J.gloveLit, alpha: 1 },
    { r: 1.8, color: J.maskLit, alpha: 0.55, ox: -1.6, oy: -2 },
  ],
  eyeWhite: J.sclera,
  eyePupil: J.pupil,
  // Heavy: hands lag and barely smear.
  squash: { div: 16, x: 0.32, y: 0.2 },
};

export type JasonForm = 'normal' | 'flaming';

interface Pt { x: number; y: number }

function fill(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
}

export class JasonAvatar extends BaseAvatar {
  private fx: JasonFx;
  private form: JasonForm = 'normal';
  /** 0–1, eases toward the form so the fire catches and dies rather than popping. */
  private burn = 0;
  private stealth = 0;

  constructor(scene: Phaser.Scene, _tint: ColorFn, depth = 6) {
    super(scene, (c) => c, depth, JASON_AVATAR);
    this.fx = new JasonFx(scene);
  }

  /** The Q transformation. Cheap to call every frame. */
  setForm(form: JasonForm): void {
    if (form === this.form) return;
    this.form = form;
    this.refreshHands();
  }

  /** Stealth meter, 0–1 — he fades into the lake mist as it fills. */
  setStealth(v: number): void { this.stealth = Phaser.Math.Clamp(v, 0, 1); }

  protected applyMastery(_on: boolean): void {
    this.refreshHands();
  }

  private refreshHands(): void {
    const hot = this.form === 'flaming';
    this.setEyeWhite(hot ? JASON_FIRE.amber : J.sclera);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(hot ? 13 : this.mastered ? 10.5 : 9.6);
      halo.setFillStyle(hot ? JASON_FIRE.orange : this.mastered ? J.weed : J.gloveDeep, hot ? 0.4 : 0.45);
    });
    this.forEachHandLayer(2, (k) => k.setFillStyle(hot ? JASON_FIRE.red : J.gloveLit, 1));
  }

  protected emitTrail(x: number, y: number): void {
    if (this.form === 'flaming') this.fx.ember(x, y);
    else if (this.mastered) this.fx.drip(x, y);
  }

  /** Stealth crouch: fists drawn in, machete held low. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    return { ang: this.facing + side * 1.75, dist: 20, scale: idle.scale };
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  /** Face anchor — identical to the offsets BaseAvatar uses for the eyes. */
  private face(x: number, y: number): { fx: number; fy: number; lx: number } {
    const lx = Math.cos(this.facing) * 2.4;
    const ly = Math.sin(this.facing) * 2.0;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    return { fx: x + lx, fy: y + ly + bob, lx };
  }

  private get vis(): number { return 1 - this.stealth * 0.5; }

  // ── Layers ──────────────────────────────────────────────────────────────

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    this.burn += ((this.form === 'flaming' ? 1 : 0) - this.burn) * 0.12;
    const vis = this.vis;
    // Heavy shadow he stands in.
    g.fillStyle(J.hole, a * 0.45 * vis);
    g.fillEllipse(x, y + 24, 64, 18);
    if (this.burn > 0.02) {
      const f = 0.9 + Math.sin(this.t * 12) * 0.06;
      g.fillStyle(JASON_FIRE.orange, a * 0.28 * this.burn * f);
      g.fillCircle(x, y - 4, 44 * f);
      g.fillStyle(JASON_FIRE.yellow, a * 0.14 * this.burn);
      g.fillEllipse(x, y + 22, 80 * f, 26 * f);
    }
    if (this.mastered) this.drawDragChain(g, x, y, alpha * vis);
  }

  /** Mastered: a broken chain trailing behind him to a rusted shackle-weight on the floor. */
  private drawDragChain(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const back = this.facing + Math.PI;
    // Lagging hands give the run direction; the weight drags further out the faster he goes.
    const mean = (this.armX[0] + this.armX[1]) / 2 - x;
    const drag = Phaser.Math.Clamp(Math.abs(mean) * 0.3, 0, 8);
    const bx = x + Math.cos(back) * (34 + drag);
    const by = y + 18 + Math.sin(back) * (16 + drag * 0.5);
    const sx = x + Math.cos(back) * 12, sy = y + 14;
    const links = 6;
    for (let i = 0; i <= links; i++) {
      const u = i / links;
      const cx = sx + (bx - sx) * u;
      const cy = sy + (by - sy) * u + Math.sin(u * Math.PI) * 5;
      g.lineStyle(2.2, J.chain, alpha);
      if (i % 2) g.strokeEllipse(cx, cy, 6, 3.4);
      else g.strokeEllipse(cx, cy, 3.4, 5.4);
    }
    g.fillStyle(J.hole, alpha * 0.4);
    g.fillEllipse(bx + 2, by + 6, 22, 8);
    g.fillStyle(J.rust, alpha);
    g.fillCircle(bx, by, 9);
    g.fillStyle(J.rustLit, alpha * 0.8);
    g.fillCircle(bx - 2.5, by - 2.5, 4.5);
    g.fillStyle(J.chain, alpha);
    g.fillRect(bx - 3, by - 11, 6, 4);
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const vis = alpha * this.vis;
    const m = this.mastered;
    const burn = this.burn;
    const { fx, fy, lx } = this.face(x, y);
    const sh = m ? 33 : 30;   // shoulder half-width — bulky either way, a hulk mastered
    const shY = m ? -13 : -10; // shoulder height; mastered hunches them up round the head

    // ── Torso: a broad jacket, torn hem, wider than the disc on both sides ──
    const hem: Pt[] = [];
    const hemN = 9;
    for (let i = 0; i <= hemN; i++) {
      const u = i / hemN;
      hem.push({ x: x + 25 - u * 50, y: y + 25 + (i % 2 ? 3.5 : 0) + Math.sin(i * 2.3) * 1.2 });
    }
    const torso: Pt[] = [
      { x: x - 13, y: y - 17 },
      { x: x - sh + 4, y: y + shY },
      { x: x - sh, y: y + shY + 6 },
      { x: x - sh + 1, y: y + 10 },
      { x: x - 26, y: y + 24 },
      ...hem,
      { x: x + 26, y: y + 24 },
      { x: x + sh - 1, y: y + 10 },
      { x: x + sh, y: y + shY + 6 },
      { x: x + sh - 4, y: y + shY },
      { x: x + 13, y: y - 17 },
    ];
    g.fillStyle(J.jacketDeep, vis);
    fill(g, torso.map((p) => ({ x: p.x + 2, y: p.y + 1.5 })));
    g.fillStyle(J.jacket, vis);
    fill(g, torso);
    // Lit side (left) and shadow side (right), following the shoulders down.
    g.fillStyle(J.jacketLit, vis * 0.8);
    fill(g, [{ x: x - 13, y: y - 15 }, { x: x - sh + 5, y: y + shY + 1 }, { x: x - sh + 2, y: y + shY + 6 },
      { x: x - sh + 3, y: y + 9 }, { x: x - 18, y: y + 20 }, { x: x - 12, y: y + 2 }]);
    g.fillStyle(J.jacketShade, vis * 0.85);
    fill(g, [{ x: x + 14, y: y - 12 }, { x: x + sh - 4, y: y + shY + 2 }, { x: x + sh - 1, y: y + shY + 7 },
      { x: x + sh - 2, y: y + 10 }, { x: x + 25, y: y + 24 }, { x: x + 16, y: y + 25 }, { x: x + 15, y: y + 4 }]);
    // Shirt and front opening, buttons down it.
    g.fillStyle(J.shirt, vis);
    fill(g, [{ x: x - 6, y: y + 6 }, { x: x + 6, y: y + 6 }, { x: x + 4, y: y + 26 }, { x: x - 4, y: y + 26 }]);
    g.fillStyle(J.button, vis);
    for (const by of [13, 19]) g.fillCircle(x - 7.5, y + by, 1.2);
    // Rips: dark tears with frayed lighter edges.
    g.fillStyle(J.jacketDeep, vis);
    fill(g, [{ x: x - 22, y: y + 12 }, { x: x - 17, y: y + 10 }, { x: x - 19, y: y + 16 }]);
    fill(g, [{ x: x + 18, y: y + 15 }, { x: x + 23, y: y + 13 }, { x: x + 22, y: y + 19 }, { x: x + 19, y: y + 18 }]);
    g.lineStyle(1, J.jacketLit, vis * 0.7);
    g.lineBetween(x - 22, y + 12, x - 17, y + 10);
    g.lineBetween(x + 18, y + 15, x + 23, y + 13);
    // Shoulder seams.
    g.lineStyle(1.2, J.jacketDeep, vis * 0.8);
    g.lineBetween(x - sh + 4, y + shY + 1, x - sh + 6, y + 12);
    g.lineBetween(x + sh - 4, y + shY + 1, x + sh - 6, y + 12);

    if (m) this.drawLakeBound(g, x, y, sh, shY, vis);

    // Charring while he burns: the jacket blackens from the hem up, embers glowing in it.
    if (burn > 0.02) {
      g.fillStyle(J.charred, vis * 0.55 * burn);
      fill(g, [...hem, { x: x - 26, y: y + 24 }, { x: x - 24, y: y + 12 }, { x: x, y: y + 9 }, { x: x + 24, y: y + 12 }, { x: x + 26, y: y + 24 }]);
      for (let i = 0; i < 7; i++) {
        const ex = x - 22 + i * 7.3 + Math.sin(i * 3.1) * 2;
        const ey = y + 14 + Math.sin(i * 1.7) * 6;
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 7 + i * 1.9);
        g.fillStyle(JASON_FIRE.amber, vis * burn * (0.4 + 0.6 * pulse));
        g.fillCircle(ex, ey, 1.3 + pulse);
      }
    }

    // ── Head: bald, scarred scalp showing round the mask ──
    g.fillStyle(J.skinShade, vis);
    g.fillEllipse(x + lx * 0.4 + 1, y - 9, 34, 33);
    g.fillStyle(J.skin, vis);
    g.fillEllipse(x + lx * 0.4, y - 10, 32, 31);
    g.lineStyle(1.2, J.scar, vis * 0.9);
    g.beginPath();
    g.arc(x + lx * 0.4 - 4, y - 18, 9, Math.PI * 1.05, Math.PI * 1.6);
    g.strokePath();
    g.lineBetween(x + lx * 0.4 + 9, y - 22, x + lx * 0.4 + 13, y - 15);

    this.drawMask(g, fx, fy, vis, burn);
  }

  /** The hockey mask — eye-holes on the eye anchors, chevrons, breathing holes, straps. */
  private drawMask(g: Phaser.GameObjects.Graphics, fx: number, fy: number, vis: number, burn: number): void {
    const m = this.mastered;
    const top = fy - 19, bot = fy + 13;
    const half = (u: number) => 13.5 * Math.pow(Math.sin(Math.PI * (0.12 + 0.82 * u)), 0.55);
    const side = (dir: number, off = 0, scale = 1): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        pts.push({ x: fx + off + dir * half(u) * scale, y: top + (bot - top) * u });
      }
      return pts;
    };
    const outline = (off = 0, scale = 1): Pt[] => [...side(-1, off, scale), ...side(1, off, scale).reverse()];

    // Straps running back round the head.
    g.lineStyle(2.2, J.strap, vis);
    g.lineBetween(fx - 12.5, fy - 8, fx - 16, fy - 10);
    g.lineBetween(fx + 12.5, fy - 8, fx + 16, fy - 10);
    g.lineBetween(fx - 12, fy + 4, fx - 15.5, fy + 5);
    g.lineBetween(fx + 12, fy + 4, fx + 15.5, fy + 5);

    g.fillStyle(J.maskDeep, vis);
    fill(g, outline(1.2));
    g.fillStyle(m ? J.maskShade : J.mask, vis);
    fill(g, outline());
    g.fillStyle(J.maskLit, vis * (m ? 0.45 : 0.75));
    fill(g, outline(-3.5, 0.55));
    // Shadow side on the right cheek.
    g.fillStyle(J.maskShade, vis * 0.8);
    fill(g, [{ x: fx + 6, y: fy - 16 }, { x: fx + 12, y: fy - 9 }, { x: fx + 12.5, y: fy + 2 }, { x: fx + 7, y: fy + 12 }, { x: fx + 8, y: fy }]);
    if (burn > 0.02) {
      g.fillStyle(J.maskScorch, vis * 0.6 * burn);
      fill(g, [{ x: fx - 13, y: fy + 4 }, { x: fx - 8, y: fy + 13 }, { x: fx + 8, y: fy + 13 }, { x: fx + 13, y: fy + 4 }, { x: fx, y: fy + 8 }]);
    }

    // Eye-holes — the BaseAvatar eyes land dead centre in these.
    for (const s of [-1, 1]) {
      g.fillStyle(J.maskDeep, vis);
      g.fillEllipse(fx + s * 7.2, fy - 3.6, 12.4, 10.6);
      g.fillStyle(burn > 0.02 ? JASON_FIRE.deep : J.hole, vis);
      g.fillEllipse(fx + s * 7.2, fy - 4, 11, 9.6);
    }

    // Red chevrons: a pair on the brow, one under each eye. Glow hot while he burns.
    const chev = burn > 0.5 ? JASON_FIRE.amber : J.chevron;
    const chevD = burn > 0.5 ? JASON_FIRE.red : J.chevronDark;
    const tri = (cx: number, cy: number, w: number, h: number, flip: number): Pt[] => [
      { x: cx - w, y: cy - h * flip }, { x: cx + w, y: cy - h * flip }, { x: cx, y: cy + h * flip },
    ];
    for (const s of [-1, 1]) {
      g.fillStyle(chevD, vis);
      fill(g, tri(fx + s * 4, fy - 13.6, 2.6, 2.8, 1));
      fill(g, tri(fx + s * 8.8, fy + 4.4, 2.4, 2.6, -1));
      g.fillStyle(chev, vis);
      fill(g, tri(fx + s * 4, fy - 14.2, 2.1, 2.3, 1));
      fill(g, tri(fx + s * 8.8, fy + 3.9, 1.9, 2.1, -1));
    }
    // Breathing holes: a column down the nose, rows round the mouth.
    g.fillStyle(J.hole, vis * 0.9);
    for (let i = 0; i < 3; i++) g.fillCircle(fx, fy - 2 + i * 3, 0.9);
    for (let i = 0; i < 5; i++) g.fillCircle(fx - 4.8 + i * 2.4, fy + 8, 0.85);
    for (let i = 0; i < 4; i++) g.fillCircle(fx - 3.6 + i * 2.4, fy + 10.8, 0.85);
    for (const s of [-1, 1]) {
      g.fillCircle(fx + s * 3.6, fy + 4.6, 0.85);
      g.fillCircle(fx + s * 11, fy - 1, 0.8);
    }

    if (m) {
      // Mastered: an axe crack split down from the crown, clear of the eye-holes.
      g.lineStyle(2.4, J.hole, vis);
      g.beginPath();
      g.moveTo(fx + 3, top + 0.5);
      g.lineTo(fx + 1, fy - 13);
      g.lineTo(fx + 2.6, fy - 10.5);
      g.lineTo(fx + 0.6, fy - 8.6);
      g.strokePath();
      g.lineStyle(1, J.maskLit, vis * 0.8);
      g.lineBetween(fx + 4.4, top + 1, fx + 2.6, fy - 13);
      // Grime and lake stain over the bone.
      g.fillStyle(J.weed, vis * 0.35);
      g.fillEllipse(fx - 8, fy + 9, 7, 4);
      g.fillEllipse(fx + 10, fy - 13, 5, 3);
    }
  }

  /** Mastered extras on the torso: chains crossed over the chest, lake-weed, shoulder tufts. */
  private drawLakeBound(g: Phaser.GameObjects.Graphics, x: number, y: number, sh: number, shY: number, vis: number): void {
    // Torn sleeve tufts jutting off the hunched shoulders — the silhouette's new corners.
    for (const s of [-1, 1]) {
      g.fillStyle(J.jacketDeep, vis);
      fill(g, [
        { x: x + s * (sh - 6), y: y + shY - 1 }, { x: x + s * (sh + 5), y: y + shY - 3 },
        { x: x + s * (sh + 1), y: y + shY + 3 }, { x: x + s * (sh + 7), y: y + shY + 6 },
        { x: x + s * (sh + 1), y: y + shY + 9 }, { x: x + s * (sh - 3), y: y + shY + 8 },
      ]);
    }
    // Two chains crossing the chest below the mask, links alternating face-on and edge-on.
    const chainLine = (x1: number, y1: number, x2: number, y2: number): void => {
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const cx = x1 + (x2 - x1) * u, cy = y1 + (y2 - y1) * u + Math.sin(u * Math.PI) * 2;
        g.lineStyle(2, J.chain, vis);
        if (i % 2) g.strokeEllipse(cx, cy, 6.4, 3.6);
        else g.strokeEllipse(cx, cy, 3.4, 5.6);
        g.lineStyle(0.8, J.chainLit, vis * 0.8);
        g.lineBetween(cx - 1.4, cy - 1.4, cx + 0.4, cy - 1.8);
      }
    };
    chainLine(x - 27, y + 6, x + 22, y + 23);
    chainLine(x + 27, y + 6, x - 22, y + 23);
    // Lake weed draped over the shoulders, hanging past the arms.
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const bx = x + s * (sh - 8 - k * 6), by = y + shY + 2;
        const sway = Math.sin(this.t * 1.8 + k + s) * 1.6;
        const pts: Pt[] = [];
        const len = 18 - k * 5;
        for (let i = 0; i <= 6; i++) {
          const u = i / 6;
          pts.push({ x: bx + s * u * 3 + sway * u - 1.6 * (1 - u), y: by + len * u });
        }
        for (let i = 6; i >= 0; i--) {
          const u = i / 6;
          pts.push({ x: bx + s * u * 3 + sway * u + 1.6 * (1 - u) + 0.3, y: by + len * u });
        }
        g.fillStyle(k ? J.weedLit : J.weed, vis * 0.95);
        fill(g, pts);
      }
    }
  }

  /**
   * Above the crown and out at the hands: the machete in the right fist and — while he burns —
   * fire standing up off the crown and both shoulders. Nothing drawn below the crown on the
   * face column, so the mask stays clear.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const vis = alpha * this.vis;
    const burn = this.burn;

    // Machete in the right hand, blade carried on the line out from the body.
    const hx = this.armX[1], hy = this.armY[1];
    if (hx !== 0 || hy !== 0) {
      const out = Math.atan2(hy - y, hx - x);
      const ang = out + 0.35;
      drawMachete(g, hx, hy, ang, this.mastered ? 32 : 28, vis, this.mastered, burn);
    }

    if (burn <= 0.02) return;
    const lean = Phaser.Math.Clamp(((this.armX[0] + this.armX[1]) / 2 - x) * 0.5, -9, 9);
    const sh = this.mastered ? 33 : 30;
    const shY = this.mastered ? -13 : -10;
    const roots: Array<[number, number, number, number]> = [
      [x - sh + 6, y + shY + 2, 0.75, 0],
      [x + sh - 6, y + shY + 2, 0.75, 1.3],
      [x - 9, y - 21, 0.9, 2.6],
      [x + 8, y - 22, 0.95, 3.7],
      [x, y - 24, 1.15, 5.1],
    ];
    for (const [rx, ry, s, ph] of roots) {
      const f = 1 + Math.sin(this.t * 11 + ph) * 0.12 + Math.sin(this.t * 17 + ph * 1.7) * 0.06;
      const h = 22 * s * f * burn * this.intensity;
      g.fillStyle(JASON_FIRE.orange, vis * 0.18 * burn);
      g.fillEllipse(rx + lean * 0.3, ry - h * 0.45, 18 * s, h * 1.2);
      flameLayered(g, rx, ry, h, 6.4 * s, lean + Math.sin(this.t * 4 + ph) * 2, vis * burn);
    }
    // Sparks pulling up off the crown.
    for (let i = 0; i < 4; i++) {
      const p = (this.t * (0.9 + i * 0.2) + i * 0.27) % 1;
      const sx = x + lean * (1 + p) + Math.sin(this.t * 5 + i * 2) * 8;
      const sy = y - 30 - p * 30;
      g.fillStyle(JASON_FIRE.yellow, vis * burn * (1 - p));
      g.fillCircle(sx, sy, 1.6 * (1 - p * 0.5));
    }
  }
}
