import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Hunt renders: the hunter avatar (ball fists + eyes + a pair
 * of ears that grow into a snarling head as the beast comes out), the blood auras, and the
 * one-shot effects every hunt ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes hunt
 * hunt: the gash, the palette, and the effects built out of it.
 *
 * Colours must come from the HUNT palette below. Hunt has no skin yet, but every
 * call still routes through the owner's `huntColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.huntColor bound to one owner. */
export type HuntColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const HUNT = {
  /** Hide and dried blood — what everything is silhouetted against. */
  pitch: 0x1a0a06,
  hide: 0x3d1a0e,
  rust: 0x6b2412,
  /** The element's own heat. */
  ember: 0xcc4400,
  flare: 0xff6600,
  spark: 0xffaa44,
  /** Fresh blood. */
  gore: 0x8b0000,
  blood: 0xcc1111,
  fresh: 0xff2222,
  /** Teeth, claws and bone. */
  bone: 0xf2e3c8,
  /** Monster-hunter silver: the hybrid form's kit. */
  silver: 0xdddde6,
  steel: 0x9aa0ab,
  /** The kit he carries: stock, bluing, brass and a red hull. */
  wood: 0x5a3a1e,
  woodLit: 0x8a5c30,
  gun: 0x41464d,
  gunLit: 0x6d757f,
  brass: 0xc9a227,
  hull: 0xa61e1e,
  cord: 0xd8cbb0,
  /** Inside the mouth. */
  maw: 0x1c0508,
  tongue: 0xb0384a,
  fur: 0x452213,
  furLit: 0x7a4222,
  /** Blood Moon. */
  moon: 0xff5544,
  moonDark: 0x440d0d,
  smoke: 0x2a2420,
  white: 0xffffff,
} as const;

/** One coherent set of shades. `crust → body → wound → lit` runs dark to bright. */
export interface HuntTones {
  crust: number;
  body: number;
  wound: number;
  lit: number;
  spark: number;
}

/** Human form: gunpowder orange over dried blood. */
export const HUNTER_TONES: HuntTones = {
  crust: HUNT.hide, body: HUNT.ember, wound: HUNT.flare, lit: HUNT.spark, spark: HUNT.white,
};
/** The NPC's read darker so two hunters never blur together. */
export const NPC_TONES: HuntTones = {
  crust: HUNT.pitch, body: HUNT.rust, wound: HUNT.ember, lit: HUNT.flare, spark: HUNT.spark,
};
/** Beast form: it stops being about powder and starts being about blood. */
export const BEAST_TONES: HuntTones = {
  crust: 0x2c0606, body: HUNT.gore, wound: HUNT.blood, lit: HUNT.fresh, spark: HUNT.bone,
};
/** Blood Moon: everything under it runs hot red. */
export const MOON_TONES: HuntTones = {
  crust: HUNT.moonDark, body: HUNT.blood, wound: HUNT.moon, lit: 0xff8877, spark: HUNT.white,
};
/**
 * Hell (divine perk): the hellhound. Beast tones burnt through — coal-black hide with fire
 * showing under it, so the smaller silhouette still reads as the more dangerous one.
 */
export const HELL_TONES: HuntTones = {
  crust: 0x140302, body: HUNT.rust, wound: HUNT.flare, lit: 0xffcc66, spark: HUNT.white,
};
/** Hybrid form: silver shot, silver blade, silver trim. */
export const SILVER_TONES: HuntTones = {
  crust: 0x3a3f46, body: HUNT.steel, wound: HUNT.silver, lit: 0xf2f4ff, spark: HUNT.white,
};

export const tonesFor = (owner: 'player' | 'npc'): HuntTones =>
  (owner === 'player' ? HUNTER_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A gash: the crescent a claw leaves. It comes to a point at *both* ends and carries its mass in
 * the middle, bowed along its length — the opposite of every other primitive in the game, which
 * are all rooted at one end and taper away from it. That two-ended, bellied silhouette is the
 * whole read of the element: nothing hunt does is a jet or a shard, it is a wound.
 *
 * `curve` bows the centreline; `rip` tears one flank so a fresh cut never looks stamped.
 */
export function huntGash(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0.32,
  rip = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const STEPS = 12;

  // Centreline bow and the belly profile that puts the mass in the middle.
  const bow = (f: number): number => curve * len * Math.sin(Math.PI * f);
  const w = (f: number): number => halfW * Math.pow(Math.sin(Math.PI * f), 0.62);

  const at = (f: number, side: number): [number, number] => {
    // The torn flank only ever bites into one side, which is what makes the cut directional.
    const tear = side < 0 && rip > 0 ? 1 - rip * (0.35 + 0.65 * Math.abs(Math.sin(f * 9.3))) : 1;
    const off = bow(f) + side * w(f) * tear;
    return [cx + cos * (f - 0.5) * len + px * off, cy + sin * (f - 0.5) * len + py * off];
  };

  g.beginPath();
  const start = at(0, 1);
  g.moveTo(start[0], start[1]);
  for (let i = 1; i <= STEPS; i++) { const p = at(i / STEPS, 1); g.lineTo(p[0], p[1]); }
  for (let i = STEPS; i >= 0; i--) { const p = at(i / STEPS, -1); g.lineTo(p[0], p[1]); }
  g.closePath();
  g.fillPath();
}

export interface GashLayerOpts {
  curve?: number;
  rip?: number;
  /** Bright bone edge along the outer flank. Default true. */
  edge?: boolean;
  /** Droplets flicked off the two points. Default true. */
  flick?: boolean;
}

/**
 * Layered gash: a dark crust, the body of the wound, a hot inner channel, a bone-bright edge
 * along the leading flank and two droplets thrown off the points.
 *
 * The edge is what stops a ring of gashes reading as a set of curved bananas — a real cut has
 * one lit lip where the flesh is turned up, and the eye reads depth off that alone.
 */
export function huntGashLayered(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  opts: GashLayerOpts = {},
): void {
  const curve = opts.curve ?? 0.32;
  const rip = opts.rip ?? 0.22;

  g.fillStyle(tint(tones.crust), alpha * 0.8);
  huntGash(g, cx, cy, angle, len * 1.05, halfW * 1.4, curve, rip * 0.5);
  g.fillStyle(tint(tones.body), alpha * 0.92);
  huntGash(g, cx, cy, angle, len, halfW, curve, rip);
  g.fillStyle(tint(tones.wound), alpha * 0.9);
  huntGash(g, cx, cy, angle, len * 0.9, halfW * 0.5, curve, rip);
  g.fillStyle(tint(tones.lit), alpha * 0.85);
  huntGash(g, cx, cy, angle, len * 0.62, halfW * 0.2, curve, 0);

  if (opts.edge !== false) {
    // One lit lip only. Outlining the whole gash flattens it to a decal.
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    g.lineStyle(Math.max(0.8, halfW * 0.24), tint(tones.spark), alpha * 0.6);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const off = curve * len * Math.sin(Math.PI * f) + halfW * Math.pow(Math.sin(Math.PI * f), 0.62);
      const x = cx + cos * (f - 0.5) * len + px * off;
      const y = cy + sin * (f - 0.5) * len + py * off;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  if (opts.flick !== false) {
    // Blood thrown off the two points, which is where a real claw leaves it.
    for (const s of [-0.5, 0.5]) {
      const x = cx + Math.cos(angle) * s * len * 1.02;
      const y = cy + Math.sin(angle) * s * len * 1.02;
      g.fillStyle(tint(tones.body), alpha * 0.7);
      g.fillCircle(x, y, halfW * 0.34);
      g.fillStyle(tint(tones.lit), alpha * 0.55);
      g.fillCircle(x, y, halfW * 0.16);
    }
  }
}

// ── Anatomy: the wolf head ────────────────────────────────────────────────

export interface WolfHeadOpts {
  /** Paint the eyes. The avatar leaves them off — the character rig's own eyes sit there. */
  eyes?: boolean;
  /** Fill a cranium behind the features. The avatar leaves it off — the sprite is the skull. */
  solid?: boolean;
  /** Ears, ruff and the scar. Off for the small jaws inside a howl. */
  mane?: number;
  /** Extra vertical shove on the whole face, in units of `size`. */
  drop?: number;
}

/**
 * A snarling wolf head, drawn face-on: swept ears, a heavy brow that overhangs the eyes, a
 * muzzle running down the middle of the face, and jaws that come apart on `jaw` into a black
 * maw with two full ranks of fangs and a tongue behind them.
 *
 * Everything is laid out in units of `size` (the head's half-height) so the same function
 * paints the character's own face at 20px and the spectral head that lunges out of a transform
 * at 90. `lean` is the aim direction and only ever nudges the features — this is a face looking
 * at the camera, not a top-down sprite, and rotating it would break the read.
 *
 * The eye sockets sit at `±0.38 · size`. When this is drawn over the character rig, that is the
 * number the head has to be sized from: the rig's own eyes are fixed at ±7.2px, so a head much
 * bigger than ~19 would put its muzzle straight through the face. `eyes: false` draws the
 * sockets as open liners instead of filling them, and the rig's eyes look out through them.
 *
 * The ferocity is in three details, in order of how much they carry: the brow slabs angled down
 * toward the nose, the canines being nearly twice the length of the other fangs, and the two
 * curl wrinkles that appear on the muzzle only once the lip is actually up.
 */
export function drawWolfHead(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  x: number, y: number, lean: number, size: number, jaw: number, alpha: number,
  opts: WolfHeadOpts = {},
): void {
  if (alpha <= 0.01 || size <= 0.5) return;
  const mane = opts.mane ?? 1;
  const lx = Math.cos(lean), ly = Math.sin(lean);
  // Features drift a few pixels toward the aim, which is all the "looking" a face-on head needs.
  const cx = x + lx * size * 0.1;
  const cy = y + ly * size * 0.06 + size * (opts.drop ?? 0);
  const S = (u: number): number => u * size;
  const P = (u: number, v: number): [number, number] => [cx + S(u), cy + S(v)];

  // Ruff: fur standing up around the back of the skull. Uneven on purpose — a groomed
  // fringe reads as a mane on a costume, a ragged one reads as an animal.
  if (mane > 0.02) {
    g.fillStyle(tint(HUNT.fur), 0.9 * alpha);
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI * 0.98 + (i / 12) * Math.PI * 1.96;
      const len = size * (0.24 + 0.2 * Math.abs(Math.sin(i * 2.7))) * mane;
      const r0 = size * 0.86;
      const bx = cx + Math.cos(a) * r0, by = cy + Math.sin(a) * r0;
      const tipA = a + (i % 2 ? 0.18 : -0.18);
      g.beginPath();
      g.moveTo(bx + Math.cos(a + 1.4) * size * 0.11, by + Math.sin(a + 1.4) * size * 0.11);
      g.lineTo(bx + Math.cos(tipA) * len, by + Math.sin(tipA) * len);
      g.lineTo(bx + Math.cos(a - 1.4) * size * 0.11, by + Math.sin(a - 1.4) * size * 0.11);
      g.closePath();
      g.fillPath();
    }
  }

  // Cranium, only when nothing else is providing one.
  if (opts.solid) {
    g.fillStyle(tint(tones.crust), 0.95 * alpha);
    g.fillEllipse(cx, cy - S(0.06), S(1.72), S(1.78));
    g.fillStyle(tint(HUNT.fur), 0.85 * alpha);
    g.fillEllipse(cx, cy - S(0.1), S(1.5), S(1.54));
  }

  // Ears: swept back and outward, with a fold of inner ear turned toward the camera.
  if (mane > 0.02) {
    for (const s of [-1, 1]) {
      const [bx, by] = P(s * 0.5, -0.95);
      const swept = -Math.PI / 2 + s * (0.46 + 0.1 * mane) - ly * 0.06;
      const h = S(0.86) * mane;
      g.fillStyle(tint(HUNT.fur), 0.96 * alpha);
      g.beginPath();
      g.moveTo(bx - s * S(0.26), by + S(0.1));
      g.lineTo(bx + s * S(0.24), by - S(0.04));
      g.lineTo(bx + Math.cos(swept) * h, by + Math.sin(swept) * h);
      g.closePath();
      g.fillPath();
      g.fillStyle(tint(tones.body), 0.85 * alpha);
      g.beginPath();
      g.moveTo(bx - s * S(0.13), by + S(0.06));
      g.lineTo(bx + s * S(0.14), by - S(0.02));
      g.lineTo(bx + Math.cos(swept) * h * 0.66, by + Math.sin(swept) * h * 0.66);
      g.closePath();
      g.fillPath();
      // A notch bitten out of one ear. Every wolf worth fearing has lost part of an ear.
      if (s > 0) {
        g.fillStyle(tint(HUNT.pitch), 0.5 * alpha);
        g.fillCircle(bx + Math.cos(swept) * h * 0.72, by + Math.sin(swept) * h * 0.72, S(0.1));
      }
    }
  }

  // Brow: two heavy slabs whose inner ends sit lower than their outer ends. This one angle is
  // the difference between a dog and something that wants to kill you.
  for (const s of [-1, 1]) {
    const [ix, iy] = P(s * 0.1, -0.2);
    const [ox, oy] = P(s * 0.74, -0.5);
    g.lineStyle(S(0.19), tint(tones.crust), 0.95 * alpha);
    g.lineBetween(ix, iy, ox, oy);
    g.lineStyle(S(0.07), tint(tones.lit), 0.35 * alpha);
    g.lineBetween(ix, iy - S(0.09), ox, oy - S(0.09));
  }

  // Muzzle: a wedge running down the middle of the face, with a lit bridge along its spine.
  // It starts just below the eye line — any higher and the bridge buries the eyes.
  const snoutTop = -0.06;
  const snoutTip = 0.66;
  g.fillStyle(tint(tones.crust), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-0.26, snoutTop));
  g.lineTo(...P(0.26, snoutTop));
  g.lineTo(...P(0.22, snoutTip));
  g.lineTo(...P(-0.22, snoutTip));
  g.closePath();
  g.fillPath();
  g.fillStyle(tint(HUNT.fur), 0.9 * alpha);
  g.beginPath();
  g.moveTo(...P(-0.19, snoutTop + 0.03));
  g.lineTo(...P(0.19, snoutTop + 0.03));
  g.lineTo(...P(0.16, snoutTip - 0.04));
  g.lineTo(...P(-0.16, snoutTip - 0.04));
  g.closePath();
  g.fillPath();
  g.fillStyle(tint(tones.body), 0.5 * alpha);
  g.fillRect(cx - S(0.06), cy + S(snoutTop), S(0.12), S(snoutTip - snoutTop));

  // Nose pad, nostrils and the wet glint off it.
  const [nx, ny] = P(0, snoutTip - 0.03);
  g.fillStyle(tint(HUNT.pitch), 0.98 * alpha);
  g.fillEllipse(nx, ny, S(0.34), S(0.24));
  g.fillStyle(tint(HUNT.maw), 0.9 * alpha);
  for (const s of [-1, 1]) g.fillEllipse(nx + s * S(0.09), ny + S(0.02), S(0.08), S(0.11));
  g.fillStyle(tint(HUNT.white), 0.4 * alpha);
  g.fillCircle(nx - S(0.08), ny - S(0.07), S(0.05));

  // Snarl wrinkles — only once the lip is genuinely up.
  if (jaw > 0.3) {
    const k = (jaw - 0.3) / 0.7;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const [wx, wy] = P(s * (0.2 + i * 0.09), snoutTip - 0.26 - i * 0.12);
        g.fillStyle(tint(tones.crust), 0.7 * alpha * k);
        huntGash(g, wx, wy, s > 0 ? 0.5 : Math.PI - 0.5, S(0.24) * k, S(0.035), 0.35, 0);
      }
    }
  }

  // ── Jaws ──
  const lipY = snoutTip + 0.1;
  const open = jaw * 0.5;
  const chinY = lipY + 0.16 + open;

  // The maw, black behind the teeth.
  if (jaw > 0.04) {
    g.fillStyle(tint(HUNT.maw), 0.95 * alpha);
    g.beginPath();
    g.moveTo(...P(-0.4, lipY - 0.02));
    g.lineTo(...P(0.4, lipY - 0.02));
    g.lineTo(...P(0.3, chinY));
    g.lineTo(...P(-0.3, chinY));
    g.closePath();
    g.fillPath();
    // Tongue lolling in the back of it.
    if (jaw > 0.35) {
      g.fillStyle(tint(HUNT.tongue), 0.9 * alpha);
      g.fillEllipse(cx, cy + S(lipY + open * 0.75), S(0.3), S(0.2 + open * 0.5));
      g.fillStyle(tint(HUNT.maw), 0.5 * alpha);
      g.fillRect(cx - S(0.015), cy + S(lipY + open * 0.4), S(0.03), S(open * 0.7));
    }
  }

  // Upper lip and its rank of teeth. The two canines are the whole point.
  g.fillStyle(tint(tones.crust), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-0.44, lipY - 0.16));
  g.lineTo(...P(0.44, lipY - 0.16));
  g.lineTo(...P(0.4, lipY));
  g.lineTo(...P(-0.4, lipY));
  g.closePath();
  g.fillPath();
  for (let i = 0; i < 7; i++) {
    const u = (i - 3) / 3 * 0.34;
    const canine = i === 1 || i === 5;
    const h = (canine ? 0.34 : 0.15) * (0.35 + 0.65 * jaw);
    const w = canine ? 0.075 : 0.05;
    g.fillStyle(tint(HUNT.bone), 0.98 * alpha);
    g.beginPath();
    g.moveTo(...P(u - w, lipY - 0.02));
    g.lineTo(...P(u + w, lipY - 0.02));
    g.lineTo(...P(u + (canine ? w * 0.3 : 0), lipY + h));
    g.closePath();
    g.fillPath();
  }

  // Lower jaw, swung down and away, with its own shorter rank pointing up.
  if (jaw > 0.04) {
    g.fillStyle(tint(tones.crust), 0.95 * alpha);
    g.beginPath();
    g.moveTo(...P(-0.34, chinY - 0.02));
    g.lineTo(...P(0.34, chinY - 0.02));
    g.lineTo(...P(0.26, chinY + 0.2));
    g.lineTo(...P(-0.26, chinY + 0.2));
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(HUNT.fur), 0.8 * alpha);
    g.fillEllipse(cx, cy + S(chinY + 0.14), S(0.42), S(0.14));
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2 * 0.24;
      const canine = i === 0 || i === 4;
      const h = (canine ? 0.26 : 0.12) * jaw;
      g.fillStyle(tint(HUNT.bone), 0.98 * alpha);
      g.beginPath();
      g.moveTo(...P(u - 0.05, chinY));
      g.lineTo(...P(u + 0.05, chinY));
      g.lineTo(...P(u, chinY - h));
      g.closePath();
      g.fillPath();
    }
    // Drool: two strands stretching between the canines once the jaws are properly apart.
    if (jaw > 0.6) {
      const k = (jaw - 0.6) / 0.4;
      g.lineStyle(S(0.03), tint(HUNT.cord), 0.4 * alpha * k);
      for (const s of [-1, 1]) {
        g.lineBetween(...P(s * 0.24, lipY + 0.3), ...P(s * 0.2, chinY - 0.02));
      }
    }
  }

  // Eyes. Filled when this head owns them; when it is drawn over the character rig they stay
  // open — a dark liner and a wash of eyeshine, with the rig's own eyes burning through.
  for (const s of [-1, 1]) {
    const [ex, ey] = P(s * 0.38, -0.12);
    if (opts.eyes) {
      g.fillStyle(tint(HUNT.pitch), 0.9 * alpha);
      g.fillEllipse(ex, ey, S(0.36), S(0.24));
      g.fillStyle(tint(tones.lit), 0.95 * alpha);
      g.fillEllipse(ex, ey, S(0.28), S(0.16));
      g.fillStyle(tint(HUNT.maw), 0.95 * alpha);
      g.fillEllipse(ex, ey, S(0.07), S(0.15));
      g.fillStyle(tint(HUNT.white), 0.6 * alpha);
      g.fillCircle(ex - s * S(0.07), ey - S(0.04), S(0.035));
    } else {
      g.lineStyle(S(0.06), tint(HUNT.pitch), 0.85 * alpha);
      g.strokeEllipse(ex, ey, S(0.42), S(0.3));
      g.fillStyle(tint(tones.lit), 0.3 * alpha);
      g.fillEllipse(ex, ey, S(0.36), S(0.24));
      // A wedge of shadow in the outer corner: the squint that makes an eye look mean.
      g.fillStyle(tint(HUNT.pitch), 0.7 * alpha);
      g.beginPath();
      g.moveTo(...P(s * 0.6, -0.22));
      g.lineTo(...P(s * 0.6, -0.02));
      g.lineTo(...P(s * 0.42, -0.12));
      g.closePath();
      g.fillPath();
    }
  }

  // One old scar raked across the brow. Cheap character, and it makes two heads never identical.
  if (mane > 0.5) {
    g.fillStyle(tint(HUNT.rust), 0.55 * alpha);
    huntGash(g, ...P(-0.56, -0.42), 1.15, S(0.62), S(0.045), 0.2, 0);
  }
}

/**
 * The claws that come out of a beast's fists: three curved bone blades fanning off the knuckles,
 * plus the dark hair on the back of the hand they push through.
 */
export function drawClaws(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  x: number, y: number, angle: number, scale: number, alpha: number,
): void {
  if (alpha <= 0.01 || scale <= 0.02) return;
  g.fillStyle(tint(HUNT.fur), 0.75 * alpha);
  g.fillCircle(x, y, 7 * scale);
  for (let i = -1; i <= 1; i++) {
    const a = angle + i * 0.42;
    const len = (17 - Math.abs(i) * 3) * scale;
    const bx = x + Math.cos(a) * 5 * scale, by = y + Math.sin(a) * 5 * scale;
    // The claw curves: three segments, each swinging a little further round than the last.
    const pts: Array<[number, number]> = [];
    let px2 = bx, py2 = by, aa = a;
    for (let k = 0; k < 3; k++) {
      aa += 0.26;
      px2 += Math.cos(aa) * len / 3;
      py2 += Math.sin(aa) * len / 3;
      pts.push([px2, py2]);
    }
    const w = 2.9 * scale;
    g.fillStyle(tint(tones.crust), 0.9 * alpha);
    g.beginPath();
    g.moveTo(bx - Math.sin(a) * w, by + Math.cos(a) * w);
    for (const [qx, qy] of pts) g.lineTo(qx, qy);
    for (let k = pts.length - 1; k >= 0; k--) {
      const f = (k + 1) / 3;
      g.lineTo(pts[k][0] + Math.sin(a) * w * (1 - f), pts[k][1] - Math.cos(a) * w * (1 - f));
    }
    g.lineTo(bx + Math.sin(a) * w, by - Math.cos(a) * w);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.3 * scale, tint(HUNT.bone), 0.85 * alpha);
    g.beginPath();
    g.moveTo(bx, by);
    for (const [qx, qy] of pts) g.lineTo(qx, qy);
    g.strokePath();
  }
}

// ── Anatomy: the kit he carries ───────────────────────────────────────────

/**
 * The crossbow, drawn as a real object: a tillered stock with a cheek rest, a recurved prod
 * bound on at the fore-end, a string that is genuinely *drawn back to the nut* when the shot is
 * loaded and snapped flat across the limb tips when it isn't, a stirrup at the nose, and the
 * bolt lying in the groove waiting to go.
 *
 * `load` runs 0 (just fired, string forward, groove empty) to 1 (spanned and loaded). `recoil`
 * kicks the whole weapon back along its own axis and tips the nose up.
 */
export function drawCrossbow(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  x: number, y: number, angle: number, scale: number, load: number, recoil: number,
  alpha = 1,
): void {
  if (alpha <= 0.01) return;
  const a = angle - recoil * 0.34;
  const cos = Math.cos(a), sin = Math.sin(a);
  const ox = x - cos * recoil * 7, oy = y - sin * recoil * 7;
  const S = (u: number): number => u * scale;
  /** Local (forward, right) → world. */
  const P = (f: number, r: number): [number, number] =>
    [ox + cos * S(f) - sin * S(r), oy + sin * S(f) + cos * S(r)];
  /**
   * A rectangle in the weapon's own frame. Graphics' own fillRect is axis-aligned in *world*
   * space, so every panel on a weapon that can point in any direction has to be a path.
   */
  const quad = (f0: number, r0: number, f1: number, r1: number, stroke = false): void => {
    g.beginPath();
    g.moveTo(...P(f0, r0));
    g.lineTo(...P(f1, r0));
    g.lineTo(...P(f1, r1));
    g.lineTo(...P(f0, r1));
    g.closePath();
    if (stroke) g.strokePath(); else g.fillPath();
  };

  // Stock: a long wedge from the butt to the nose, thicker under the lock.
  g.fillStyle(tint(HUNT.wood), 0.98 * alpha);
  g.beginPath();
  g.moveTo(...P(-17, -3.4));
  g.lineTo(...P(-4, -3.2));
  g.lineTo(...P(20, -2.2));
  g.lineTo(...P(20, 2.2));
  g.lineTo(...P(-4, 4.6));
  g.lineTo(...P(-17, 5.2));
  g.closePath();
  g.fillPath();
  // Grain along the top edge, so the stock reads as wood rather than a brown bar.
  g.lineStyle(S(1), tint(HUNT.woodLit), 0.75 * alpha);
  g.lineBetween(...P(-16, -2.4), ...P(19, -1.4));
  g.lineStyle(S(0.7), tint(HUNT.pitch), 0.4 * alpha);
  g.lineBetween(...P(-15, 1.4), ...P(18, 0.6));

  // Butt plate and the cheek rest that gives the stock its profile.
  g.fillStyle(tint(HUNT.gun), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-17, -3.6));
  g.lineTo(...P(-19.5, -2));
  g.lineTo(...P(-19.5, 5));
  g.lineTo(...P(-17, 5.4));
  g.closePath();
  g.fillPath();

  // Trigger guard and blade hanging under the lock.
  g.lineStyle(S(1.3), tint(HUNT.gun), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-3, 4.6));
  g.lineTo(...P(-3, 8.4));
  g.lineTo(...P(3.4, 8));
  g.lineTo(...P(4, 4.2));
  g.strokePath();
  g.lineStyle(S(1.1), tint(HUNT.steel), 0.95 * alpha);
  g.lineBetween(...P(0.6, 4.4), ...P(0, 7.4));

  // Prod: two recurved limbs bound on at the fore-end, swept back toward the shooter.
  const limbRoot = 12;
  for (const s of [-1, 1]) {
    const pts: Array<[number, number]> = [
      P(limbRoot, s * 1.6),
      P(limbRoot - 0.4, s * 8),
      P(limbRoot - 2.6, s * 14),
      P(limbRoot - 6.4, s * 17.6),
    ];
    g.lineStyle(S(3.2), tint(tones.crust), 0.95 * alpha);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.strokePath();
    g.lineStyle(S(1.4), tint(HUNT.woodLit), 0.8 * alpha);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.strokePath();
    // Horn tip cap.
    g.fillStyle(tint(HUNT.bone), 0.95 * alpha);
    g.fillCircle(pts[3][0], pts[3][1], S(1.5));
  }
  // Binding where the prod passes through the stock.
  g.fillStyle(tint(HUNT.gore), 0.9 * alpha);
  quad(9.6, -3.4, 14.4, 3.6);
  g.lineStyle(S(0.8), tint(HUNT.pitch), 0.6 * alpha);
  for (let i = 0; i < 3; i++) g.lineBetween(...P(10.6 + i * 1.4, -3.2), ...P(10.6 + i * 1.4, 3.4));

  // String: flat across the tips when spent, hauled back into a hard V at the nut when spanned.
  const nut = 6 - load * 12;
  const tipL = P(limbRoot - 6.4, -17.6), tipR = P(limbRoot - 6.4, 17.6);
  const nock = P(nut, 0);
  g.lineStyle(S(1.5), tint(HUNT.cord), 0.95 * alpha);
  g.beginPath();
  g.moveTo(tipL[0], tipL[1]);
  g.lineTo(nock[0], nock[1]);
  g.lineTo(tipR[0], tipR[1]);
  g.strokePath();

  // Bolt seated against the nut once the span is nearly done — the last beat of the reload.
  if (load > 0.55) {
    const [bx, by] = P(nut + 13, 0);
    HuntFx.drawBolt(g, tint, tones, bx, by, a, scale * 0.8, 0, false);
  }

  // Nut and lock plate.
  g.fillStyle(tint(HUNT.steel), 0.95 * alpha);
  g.fillCircle(...P(-6, 0.4), S(2.4));
  g.fillStyle(tint(HUNT.gunLit), 0.7 * alpha);
  g.fillCircle(...P(-6, -0.4), S(1.1));

  // Stirrup at the nose — how you span it, and what makes it unmistakably a crossbow.
  g.lineStyle(S(1.8), tint(HUNT.gun), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(19, -2.4));
  g.lineTo(...P(24.5, -4.6));
  g.lineTo(...P(25.5, 3.6));
  g.lineTo(...P(19.5, 2.4));
  g.strokePath();

  // Iron sight nub, and a strap trailing off the butt.
  g.fillStyle(tint(HUNT.gunLit), 0.9 * alpha);
  quad(15.4, -5, 17, -2.4);
  g.lineStyle(S(1.2), tint(HUNT.hide), 0.7 * alpha);
  g.lineBetween(...P(-18, 4), ...P(-11, 9.5));
}

/**
 * A pump shotgun: barrel and magazine tube over a sliding fore-end, a receiver with an open
 * ejection port, a dropped stock with shell loops sewn onto it, and the brass showing in each
 * loop. `pump` slides the fore-end back (0 = forward and ready, 1 = racked open).
 */
export function drawShotgun(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  x: number, y: number, angle: number, scale: number, pump: number, recoil: number,
  shells: number, alpha = 1,
): void {
  if (alpha <= 0.01) return;
  const a = angle - recoil * 0.42;
  const cos = Math.cos(a), sin = Math.sin(a);
  const ox = x - cos * recoil * 9, oy = y - sin * recoil * 9;
  const S = (u: number): number => u * scale;
  const P = (f: number, r: number): [number, number] =>
    [ox + cos * S(f) - sin * S(r), oy + sin * S(f) + cos * S(r)];
  /** A rectangle in the weapon's own frame — Graphics' fillRect is world-axis-aligned. */
  const quad = (f0: number, r0: number, f1: number, r1: number, stroke = false): void => {
    g.beginPath();
    g.moveTo(...P(f0, r0));
    g.lineTo(...P(f1, r0));
    g.lineTo(...P(f1, r1));
    g.lineTo(...P(f0, r1));
    g.closePath();
    if (stroke) g.strokePath(); else g.fillPath();
  };

  // Stock: dropped, with a comb and a rubber pad.
  g.fillStyle(tint(HUNT.wood), 0.98 * alpha);
  g.beginPath();
  g.moveTo(...P(-6, -2.6));
  g.lineTo(...P(-14, 0.4));
  g.lineTo(...P(-21, 4.6));
  g.lineTo(...P(-20, 8.2));
  g.lineTo(...P(-11, 5.4));
  g.lineTo(...P(-6, 3.4));
  g.closePath();
  g.fillPath();
  g.lineStyle(S(0.9), tint(HUNT.woodLit), 0.7 * alpha);
  g.lineBetween(...P(-7, -1.8), ...P(-20, 5.2));
  g.fillStyle(tint(HUNT.pitch), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-21, 4.4));
  g.lineTo(...P(-23, 5.6));
  g.lineTo(...P(-22, 8.8));
  g.lineTo(...P(-20, 8.4));
  g.closePath();
  g.fillPath();

  // Shell loops on the comb — the ammo you can see is what sells a shotgun as a shotgun.
  for (let i = 0; i < 4; i++) {
    const f = -9 - i * 3.1, r = 1.6 + i * 1.35;
    if (i < shells) {
      g.fillStyle(tint(HUNT.hull), 0.95 * alpha);
      quad(f - 1.2, r - 1.5, f + 1.2, r + 0.4);
      g.fillStyle(tint(HUNT.brass), 0.95 * alpha);
      quad(f - 1.2, r + 0.4, f + 1.2, r + 1.6);
    } else {
      g.lineStyle(S(0.7), tint(HUNT.hide), 0.7 * alpha);
      quad(f - 1.2, r - 1.5, f + 1.2, r + 1.5, true);
    }
  }

  // Receiver: the chunky middle, with the port cut into its flank.
  g.fillStyle(tint(HUNT.gun), 0.98 * alpha);
  g.beginPath();
  g.moveTo(...P(-7, -3.4));
  g.lineTo(...P(4.5, -3.4));
  g.lineTo(...P(4.5, 3.6));
  g.lineTo(...P(-7, 3.6));
  g.closePath();
  g.fillPath();
  g.lineStyle(S(0.9), tint(HUNT.gunLit), 0.8 * alpha);
  g.lineBetween(...P(-7, -2.8), ...P(4.5, -2.8));
  g.fillStyle(tint(HUNT.maw), 0.9 * alpha);
  quad(-3.5, 0.2, 1.5, 2.4);

  // Trigger guard.
  g.lineStyle(S(1.2), tint(HUNT.gun), 0.95 * alpha);
  g.beginPath();
  g.moveTo(...P(-5.5, 3.6));
  g.lineTo(...P(-5.5, 7.4));
  g.lineTo(...P(0.6, 7.2));
  g.lineTo(...P(1.4, 3.6));
  g.strokePath();

  // Barrel and magazine tube.
  g.fillStyle(tint(HUNT.gun), 0.98 * alpha);
  quad(4.5, -3.2, 28.5, 0);
  g.lineStyle(S(0.9), tint(HUNT.gunLit), 0.85 * alpha);
  g.lineBetween(...P(4.5, -2.7), ...P(28.5, -2.7));
  g.fillStyle(tint(HUNT.steel), 0.9 * alpha);
  quad(4.5, 0.6, 23.5, 3);

  // Fore-end, sliding on the tube.
  const slide = -pump * 4.6;
  g.fillStyle(tint(HUNT.wood), 0.98 * alpha);
  quad(11 + slide, -0.4, 20 + slide, 4);
  g.lineStyle(S(0.6), tint(HUNT.pitch), 0.6 * alpha);
  for (let i = 0; i < 4; i++) {
    g.lineBetween(...P(12.4 + slide + i * 2, -0.2), ...P(12.4 + slide + i * 2, 3.8));
  }

  // Muzzle: a flared crown with the bore black inside it, and a bead sight on top.
  g.fillStyle(tint(HUNT.gunLit), 0.95 * alpha);
  quad(27.5, -3.6, 29.9, 0.4);
  g.fillStyle(tint(HUNT.maw), 0.95 * alpha);
  g.fillCircle(...P(29.2, -1.6), S(1.5));
  g.fillStyle(tint(tones.lit), 0.8 * alpha);
  g.fillCircle(...P(25.5, -4.2), S(1));
}

export interface FragOpts {
  /** Shrapnel slivers flung out. Defaults to radius/8. */
  shards?: number;
  /** Smoke puffs left behind. Defaults to radius/40. */
  smoke?: number;
  /** Leave a scorched, blood-flecked crater. Default true. */
  crater?: boolean;
  depth?: number;
  duration?: number;
  tones?: HuntTones;
}

export interface SplatterOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Blood falls. Positive values sink the droplets. */
  fall?: number;
  tones?: HuntTones;
}

// ── HuntFx ────────────────────────────────────────────────────────────────

/**
 * One-shot hunt effects. Cheap to construct — build one per owner and hand it the owner's
 * colour mapper.
 */
export class HuntFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: HuntColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Expanding front. Hunt's wobbles hard — nothing this element does is tidy. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 5), 16, 64);
    const jitter = Array.from({ length: segs }, () => 0.84 + Math.random() * 0.32);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.6)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const k = i % segs;
        const a = (k / segs) * TAU;
        const rr = r * jitter[k];
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: HuntTones = HUNTER_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.wound, depth);
  }

  /**
   * A rake: three (or more) parallel gashes opening in sequence across the aim, each a beat
   * behind the last, then closing. This is hunt's signature — it is what a claw does, and it
   * replaces every "wide flat oval scaled sideways" the element used to draw.
   */
  rake(
    x: number, y: number, angle: number, len: number,
    count = 3, depth = 8, tones: HuntTones = HUNTER_TONES, spread = 13,
  ): void {
    const claws = Array.from({ length: count }, (_, i) => ({
      off: (i - (count - 1) / 2) * spread,
      delay: i * 0.07,
      len: len * (0.82 + Math.random() * 0.36),
      w: len * (0.055 + Math.random() * 0.03),
      curve: 0.2 + Math.random() * 0.25,
    }));
    // The gashes lie across the aim, so the rake sweeps through the target rather than at it.
    const across = angle + Math.PI / 2;
    const px = -Math.sin(across), py = Math.cos(across);
    this.anim(depth, 300, (g, t) => {
      for (const c of claws) {
        const lt = (t - c.delay) / (1 - c.delay);
        if (lt <= 0) continue;
        const open = lt < 0.3 ? easeOut(lt / 0.3) : 1;
        const fade = 1 - easeIn(Math.max(0, (lt - 0.35) / 0.65));
        huntGashLayered(
          g, this.tint, tones,
          x + px * c.off * -1 + Math.cos(angle) * lt * 6,
          y + py * c.off * -1 + Math.sin(angle) * lt * 6,
          across, c.len * open, c.w * open, fade, { curve: c.curve, rip: 0.3 },
        );
      }
    });
  }

  /** Blood thrown out of a wound: droplets that arc, sink and leave a smear where they land. */
  splatter(x: number, y: number, count: number, opts: SplatterOpts = {}): void {
    const tones = opts.tones ?? BEAST_TONES;
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 520;
    const fall = opts.fall ?? 44;
    const depth = opts.depth ?? 6;

    const drops = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), ang: a,
        v: speed * (0.4 + Math.random()),
        r: size * (0.5 + Math.random() * 0.9),
        delay: Math.random() * 0.2,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const d of drops) {
        const lt = (t - d.delay) / (1 - d.delay);
        if (lt <= 0) continue;
        const dist = d.v * easeOut(lt) * (life / 1000);
        const ex = x + d.cos * dist;
        const ey = y + d.sin * dist + fall * lt * lt;
        const fade = 1 - lt * lt;
        // A droplet in flight is a teardrop, not a dot — stretch it along its travel.
        g.fillStyle(this.tint(tones.crust), 0.7 * fade);
        huntGash(g, ex, ey, d.ang, d.r * 4.4 * fade, d.r * 1.1 * fade, 0.1, 0);
        g.fillStyle(this.tint(tones.body), 0.9 * fade);
        g.fillCircle(ex, ey, d.r * fade);
        g.fillStyle(this.tint(tones.lit), 0.7 * fade);
        g.fillCircle(ex - d.r * 0.25, ey - d.r * 0.28, d.r * 0.36 * fade);
      }
    });
  }

  /** A pool of blood and powder-burn left where something went off. Hunt's scorch mark. */
  crater(x: number, y: number, radius: number, depth = 1, tones: HuntTones = HUNTER_TONES): void {
    const lobes = Array.from({ length: 8 }, (_, i) => ({
      ang: (i / 8) * TAU + Math.random() * 0.4,
      d: radius * (0.2 + Math.random() * 0.5),
      r: radius * (0.24 + Math.random() * 0.3),
    }));
    const flecks = Array.from({ length: 9 }, () => {
      const a = Math.random() * TAU;
      const d = radius * (0.5 + Math.random() * 0.8);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, r: 1 + Math.random() * 2.4, ang: a };
    });
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(HUNT.pitch), 0.6 * a);
      for (const l of lobes) g.fillCircle(x + Math.cos(l.ang) * l.d, y + Math.sin(l.ang) * l.d * 0.7, l.r);
      g.fillStyle(this.tint(tones.crust), 0.35 * a);
      g.fillEllipse(x, y, radius * 1.4, radius * 0.95);
      for (const f of flecks) {
        g.fillStyle(this.tint(HUNT.gore), 0.6 * a);
        huntGash(g, f.x, f.y, f.ang, f.r * 3.4, f.r * 0.8, 0.2, 0.3);
      }
    });
  }

  /** Slivers of casing thrown out of a frag. Straight, hard and fast — not blood. */
  shrapnel(x: number, y: number, count: number, radius: number, depth = 6, tones: HuntTones = HUNTER_TONES): void {
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a), ang: a,
        v: radius * (1.4 + Math.random() * 1.4),
        len: 5 + Math.random() * 9,
        spin: (Math.random() - 0.5) * 22,
      };
    });
    this.anim(depth, 420, (g, t) => {
      for (const b of bits) {
        const d = b.v * easeOut(t) * 0.42;
        const ex = x + b.cos * d, ey = y + b.sin * d + 26 * t * t;
        const fade = 1 - t * t;
        g.lineStyle(2 * fade, this.tint(tones.spark), 0.85 * fade);
        const a = b.ang + b.spin * t * 0.05;
        g.lineBetween(ex, ey, ex - Math.cos(a) * b.len, ey - Math.sin(a) * b.len);
        g.lineStyle(1 * fade, this.tint(HUNT.silver), 0.9 * fade);
        g.lineBetween(ex, ey, ex - Math.cos(a) * b.len * 0.5, ey - Math.sin(a) * b.len * 0.5);
      }
    });
  }

  /** Smoke: powder haze that swells, lifts and thins. */
  smoke(x: number, y: number, count: number, radius: number, depth = 5): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius,
      oy: (Math.random() - 0.5) * radius * 0.7,
      r: radius * (0.3 + Math.random() * 0.35),
      drift: (Math.random() - 0.5) * 24,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 1300, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(HUNT.smoke), 0.34 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 26 * lt, p.r * (0.5 + lt * 1.5));
      }
    });
  }

  /**
   * The body of a frag: gash lobes blown out of the seat of the blast, holding then peeling
   * back. Reads as a shell coming apart rather than a disc being scaled.
   */
  fragBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: HuntTones = HUNTER_TONES): void {
    const lobes = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.3,
      len: 0.66 + Math.random() * 0.36,
      w: 0.14 + Math.random() * 0.07,
      delay: Math.random() * 0.16,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const core = easeOut(Math.min(1, t * 3.4));
      g.fillStyle(this.tint(tones.crust), 0.75 * fade);
      g.fillCircle(x, y, radius * 0.44 * core);
      g.fillStyle(this.tint(tones.body), 0.85 * fade);
      g.fillCircle(x, y, radius * 0.3 * core);
      for (const l of lobes) {
        const lt = Math.max(0, (t - l.delay) / (1 - l.delay));
        const grow = easeOut(Math.min(1, lt * 2.2));
        const drift = radius * (0.3 + 0.4 * easeIn(lt));
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(l.ang) * drift, y + Math.sin(l.ang) * drift,
          l.ang + Math.PI / 2, radius * l.len * grow, radius * l.w * (1 - lt * 0.3), 0.9 * fade,
          { curve: 0.28, rip: 0.28, flick: false },
        );
      }
      if (t < 0.35) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.35) * 0.9);
        g.fillCircle(x, y, radius * 0.2);
      }
    });
  }

  /** Full frag: flash, lobes, two fronts, shrapnel, smoke and a crater. Six layers minimum. */
  frag(x: number, y: number, radius: number, opts: FragOpts = {}): void {
    const tones = opts.tones ?? HUNTER_TONES;
    const shards = opts.shards ?? Math.max(6, Math.round(radius / 8));
    const puffs = opts.smoke ?? Math.max(2, Math.round(radius / 40));
    const dur = opts.duration ?? Math.round(320 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.crater !== false) this.crater(x, y, radius * 0.5, 1, tones);
    this.fragBloom(x, y, radius * 0.66, dur, depth, tones);
    this.flash(x, y, radius * 0.34, depth + 1, tones);
    this.ring(x, y, radius * 0.18, radius, tones.lit, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.3, tones.body, dur, 3.5, depth));
    this.shrapnel(x, y, shards, radius, depth, tones);
    this.splatter(x, y, Math.max(3, Math.round(radius / 16)), {
      speed: radius * 1.5, size: 2.8, life: Math.round(dur * 1.2), depth, tones: BEAST_TONES,
    });
    this.smoke(x, y, puffs, radius * 0.6, depth - 1);
  }

  /**
   * The star of flame off a shotgun muzzle: two long petals along the bore, two short ones
   * across it, and a blown-out white core. Short — 90ms — because a flash that lingers reads
   * as a fireball instead of a discharge.
   */
  muzzleStar(x: number, y: number, angle: number, scale = 1, depth = 10, tones: HuntTones = HUNTER_TONES): void {
    const arms = [
      { off: 0, len: 1.35 }, { off: 0.42, len: 0.95 }, { off: -0.42, len: 0.95 },
      { off: 1.35, len: 0.5 }, { off: -1.35, len: 0.5 },
      { off: Math.PI, len: 0.3 },
    ];
    this.anim(depth, 95, (g, t) => {
      const fade = 1 - t * t;
      const grow = 0.5 + easeOut(t) * 0.8;
      for (const arm of arms) {
        const a = angle + arm.off;
        const L = 30 * scale * arm.len * grow;
        const w = 7 * scale * arm.len * fade;
        // A flame petal: a wide root at the bore narrowing to a point.
        g.fillStyle(this.tint(tones.wound), 0.85 * fade);
        g.beginPath();
        g.moveTo(x - Math.sin(a) * w, y + Math.cos(a) * w);
        g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
        g.lineTo(x + Math.sin(a) * w, y - Math.cos(a) * w);
        g.closePath();
        g.fillPath();
        g.fillStyle(this.tint(tones.lit), 0.9 * fade);
        g.beginPath();
        g.moveTo(x - Math.sin(a) * w * 0.5, y + Math.cos(a) * w * 0.5);
        g.lineTo(x + Math.cos(a) * L * 0.7, y + Math.sin(a) * L * 0.7);
        g.lineTo(x + Math.sin(a) * w * 0.5, y - Math.cos(a) * w * 0.5);
        g.closePath();
        g.fillPath();
      }
      g.fillStyle(this.tint(tones.spark), 0.95 * fade);
      g.fillCircle(x, y, 8 * scale * (1 - t * 0.3));
      g.fillStyle(this.tint(HUNT.white), fade);
      g.fillCircle(x, y, 4.4 * scale * (1 - t * 0.4));
    });
  }

  /**
   * A shotgun going off. The pellets are the whole thing: eighteen individual balls of shot
   * leaving the bore at slightly different angles and speeds, each dragging a short streak,
   * spreading as they run out to the end of the cone and dying there. Everything else — the
   * star of flame, the wad tumbling out behind them, the powder smoke, the ejected hull — is
   * dressing hung on that.
   *
   * The old version of this drew five flame petals and called it a shotgun. It read as a
   * flamethrower cough, which is exactly the complaint.
   */
  shotgunBlast(
    x: number, y: number, angle: number,
    opts: {
      range?: number; halfAngle?: number; pellets?: number; scale?: number;
      tones?: HuntTones; shell?: boolean; depth?: number;
    } = {},
  ): void {
    const tones = opts.tones ?? HUNTER_TONES;
    const range = opts.range ?? 168;
    const half = opts.halfAngle ?? 0.44;
    const n = opts.pellets ?? 18;
    const scale = opts.scale ?? 1;
    const depth = opts.depth ?? 9;
    const life = 260;

    // ── Shot ──
    const shot = Array.from({ length: n }, () => {
      // Biased toward the centre of the pattern: a real cone is dense in the middle.
      const skew = (Math.random() + Math.random() - 1);
      const a = angle + skew * half;
      return {
        a, cos: Math.cos(a), sin: Math.sin(a),
        reach: range * (0.55 + Math.random() * 0.55),
        r: 1.7 + Math.random() * 1.5,
        delay: Math.random() * 0.08,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of shot) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        // Air drag: fast off the bore, dying out toward the end of the pattern.
        const d = p.reach * easeOut(lt);
        const px = x + p.cos * d, py = y + p.sin * d;
        const fade = 1 - lt * lt;
        // Streak out of the back of the ball — this is what makes it read as travelling.
        const tail = 16 * scale * (1 - lt) + 4;
        g.lineStyle(p.r * 1.5 * fade, this.tint(tones.wound), 0.55 * fade);
        g.lineBetween(px, py, px - p.cos * tail, py - p.sin * tail);
        g.fillStyle(this.tint(HUNT.gun), 0.95 * fade);
        g.fillCircle(px, py, p.r * scale * fade);
        g.fillStyle(this.tint(tones.lit), 0.9 * fade);
        g.fillCircle(px - p.cos * 0.5, py - p.sin * 0.5, p.r * 0.55 * scale * fade);
      }
    });

    // ── Wad ──
    // The plastic cup, thrown out with the shot but far slower, tumbling and falling short.
    this.anim(depth - 1, 520, (g, t) => {
      const d = range * 0.3 * easeOut(t);
      const wx = x + Math.cos(angle) * d;
      const wy = y + Math.sin(angle) * d + 34 * t * t;
      const spin = angle + t * 9;
      const fade = 1 - t * t;
      g.lineStyle(2.2 * scale * fade, this.tint(HUNT.cord), 0.7 * fade);
      g.beginPath();
      g.arc(wx, wy, 4 * scale, spin, spin + 4.2, false);
      g.strokePath();
    });

    // ── Powder ──
    this.muzzleStar(x, y, angle, scale, depth + 1, tones);
    this.smoke(x + Math.cos(angle) * 22 * scale, y + Math.sin(angle) * 22 * scale, 3, 16 * scale, depth - 2);
    this.smoke(x + Math.cos(angle) * 60 * scale, y + Math.sin(angle) * 60 * scale, 2, 22 * scale, depth - 2);

    // ── Pressure ──
    // A crescent of compressed air standing off the bore, opening along the cone.
    this.anim(depth - 1, 220, (g, t) => {
      const r = 20 + range * 0.5 * easeOut(t);
      g.lineStyle(3.5 * (1 - t), this.tint(tones.body), 0.4 * (1 - t));
      g.beginPath();
      g.arc(x, y, r, angle - half * (1 + t * 0.5), angle + half * (1 + t * 0.5), false);
      g.strokePath();
    });

    // ── Hull ──
    if (opts.shell) {
      const eject = angle - Math.PI / 2 - 0.4;
      this.anim(depth, 620, (g, t) => {
        const d = 46 * easeOut(t);
        const hx = x + Math.cos(eject) * d - Math.cos(angle) * 12;
        const hy = y + Math.sin(eject) * d + 70 * t * t;
        const spin = t * 13;
        const fade = 1 - Math.max(0, (t - 0.6) / 0.4);
        const c = Math.cos(spin), s = Math.sin(spin);
        const put = (lf: number, lr: number): [number, number] =>
          [hx + lf * c - lr * s, hy + lf * s + lr * c];
        g.fillStyle(this.tint(HUNT.hull), 0.95 * fade);
        g.beginPath();
        g.moveTo(...put(-5, -2.2)); g.lineTo(...put(4, -2.2));
        g.lineTo(...put(4, 2.2)); g.lineTo(...put(-5, 2.2));
        g.closePath();
        g.fillPath();
        g.fillStyle(this.tint(HUNT.brass), 0.95 * fade);
        g.beginPath();
        g.moveTo(...put(-7, -2.2)); g.lineTo(...put(-5, -2.2));
        g.lineTo(...put(-5, 2.2)); g.lineTo(...put(-7, 2.2));
        g.closePath();
        g.fillPath();
        g.fillStyle(this.tint(HUNT.smoke), 0.3 * fade);
        g.fillCircle(hx, hy, 3);
      });
    }
  }

  /**
   * A pounce: the smear a lunging body leaves, drawn as a run of gashes down the path with a
   * kick-off burst at the launch point.
   */
  pounce(x1: number, y1: number, x2: number, y2: number, depth = 5, tones: HuntTones = BEAST_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Phaser.Math.Clamp(Math.round(dist / 22), 3, 20);
    this.anim(depth, 340, (g, t) => {
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.5 - f) * 2.6, 0, 1);
        if (local <= 0) continue;
        const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
        huntGashLayered(g, this.tint, tones, cx, cy, angle + Math.PI / 2,
          26 * local, 4.5 * local, 0.7 * local, { curve: 0.25, flick: false });
      }
    });
    this.splatter(x1, y1, 4, { speed: 70, angle: angle + Math.PI, spread: 0.8, size: 2.4, life: 420, depth, tones });
  }

  /**
   * A howl: open jaws of sound punching outward — arcs rather than closed rings, because a
   * roar is directionless but a mouth is not, and the gap sells the difference.
   */
  howl(x: number, y: number, radius: number, duration = 700, depth = 9, tones: HuntTones = BEAST_TONES): void {
    const mouths = 3;
    const teeth = 14;
    this.anim(depth, duration, (g, t) => {
      for (let m = 0; m < mouths; m++) {
        const lt = t * 1.3 - m * 0.15;
        if (lt <= 0 || lt >= 1) continue;
        const r = radius * easeOut(lt);
        const fade = (1 - lt) * (1 - m * 0.2);
        g.lineStyle(4.5 * fade, this.tint(tones.wound), 0.7 * fade);
        g.strokeCircle(x, y, r);
        // Fangs standing off the front — this is a mouth, not a shockwave.
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * TAU + m * 0.2;
          huntGashLayered(g, this.tint, tones,
            x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI / 2,
            radius * 0.17 * fade, radius * 0.032 * fade, 0.85 * fade,
            { curve: 0.3, flick: false, edge: false });
        }
      }
      if (t < 0.4) {
        const k = 1 - t / 0.4;
        g.fillStyle(this.tint(tones.crust), 0.7 * k);
        g.fillCircle(x, y, radius * 0.2 * (0.6 + t));
        g.fillStyle(this.tint(tones.spark), 0.9 * k);
        g.fillCircle(x, y, radius * 0.08 * (0.6 + t));
      }
    });
  }

  /**
   * The beast coming out. Staged so it plays as an event rather than a puff:
   *
   *   1. the body clenches and goes black for two frames,
   *   2. the hide splits along a rosette of gashes and torn flaps of it are thrown clear,
   *   3. a ridge of bone spurs erupts through the back, holds, and sinks again,
   *   4. a spectral wolf head the size of the arena tile lunges out along the aim, jaws wide,
   *   5. two shockwaves and a ring of dust go out under it,
   *   6. blood everywhere, and a pool left behind.
   *
   * Step 4 is what the whole thing is for. Everything else could be any element's explosion;
   * a head with its jaws open coming straight at the camera can only be this one.
   */
  transformBeast(x: number, y: number, radius: number, tones: HuntTones, lean: number, depth = 8): void {
    const R = radius;

    // 1 — the clench. A dark mass sucking in before it lets go.
    this.anim(depth, 200, (g, t) => {
      const k = 1 - easeOut(t);
      g.fillStyle(this.tint(HUNT.pitch), 0.75 * k);
      g.fillCircle(x, y, R * (1.1 - 0.5 * easeOut(t)));
    });

    // 2 — hide splitting, and the flaps of it thrown off.
    const rips = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.3,
      delay: Math.random() * 0.18,
      len: 0.7 + Math.random() * 0.55,
      spin: (Math.random() - 0.5) * 16,
    }));
    this.anim(depth, 520, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const r of rips) {
        const lt = Math.max(0, (t - r.delay) / (1 - r.delay));
        const k = easeOut(lt);
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(r.ang) * R * (0.35 + k * 0.85),
          y + Math.sin(r.ang) * R * (0.35 + k * 0.85),
          r.ang + Math.PI / 2, R * r.len * 0.75, R * 0.15, 0.9 * fade,
          { curve: 0.32, rip: 0.4 },
        );
        // A torn scrap of hide, tumbling away behind its gash.
        const d = R * (0.5 + k * 1.5);
        const hx = x + Math.cos(r.ang) * d, hy = y + Math.sin(r.ang) * d + 40 * lt * lt;
        const sa = r.ang + r.spin * lt;
        const w = R * 0.16 * (1 - lt * 0.5);
        g.fillStyle(this.tint(HUNT.hide), 0.8 * fade);
        g.beginPath();
        g.moveTo(hx + Math.cos(sa) * w * 1.9, hy + Math.sin(sa) * w * 1.9);
        g.lineTo(hx + Math.cos(sa + 2.3) * w, hy + Math.sin(sa + 2.3) * w);
        g.lineTo(hx + Math.cos(sa + 3.5) * w * 1.4, hy + Math.sin(sa + 3.5) * w * 1.4);
        g.lineTo(hx + Math.cos(sa - 1.6) * w * 0.9, hy + Math.sin(sa - 1.6) * w * 0.9);
        g.closePath();
        g.fillPath();
      }
    });

    // 3 — the spine coming through: six bone spurs erupting, holding, sinking.
    const spurs = Array.from({ length: 6 }, (_, i) => ({
      ang: lean + Math.PI + (i - 2.5) * 0.3,
      len: R * (0.42 + Math.random() * 0.3),
    }));
    this.anim(depth + 1, 620, (g, t) => {
      const out = t < 0.25 ? easeOut(t / 0.25) : t > 0.7 ? 1 - easeIn((t - 0.7) / 0.3) : 1;
      if (out <= 0.01) return;
      for (const s of spurs) {
        const bx = x + Math.cos(s.ang) * R * 0.4, by = y + Math.sin(s.ang) * R * 0.4;
        const L = s.len * out;
        const w = R * 0.09 * out;
        g.fillStyle(this.tint(HUNT.bone), 0.95 * out);
        g.beginPath();
        g.moveTo(bx - Math.sin(s.ang) * w, by + Math.cos(s.ang) * w);
        g.lineTo(bx + Math.cos(s.ang) * L, by + Math.sin(s.ang) * L);
        g.lineTo(bx + Math.sin(s.ang) * w, by - Math.cos(s.ang) * w);
        g.closePath();
        g.fillPath();
        g.fillStyle(this.tint(HUNT.gore), 0.6 * out);
        g.fillCircle(bx, by, w * 1.6);
      }
    });

    // 4 — the head. Comes out small and close, ends up huge and gone.
    this.anim(depth + 2, 620, (g, t) => {
      const k = easeOut(t);
      const size = R * (0.5 + k * 1.5);
      const d = R * 0.9 * k;
      const alpha = t < 0.2 ? t / 0.2 : 1 - easeIn((t - 0.2) / 0.8);
      drawWolfHead(
        g, this.tint, tones,
        x + Math.cos(lean) * d, y + Math.sin(lean) * d - R * 0.25 * k,
        lean, size, 0.45 + k * 0.55, alpha * 0.92,
        { eyes: true, solid: true, mane: 1 },
      );
    });

    // 5 — the ground giving way under it.
    this.ring(x, y, R * 0.2, R * 1.7, tones.lit, 420, 5.5, depth);
    this.scene.time.delayedCall(110, () => this.ring(x, y, R * 0.3, R * 2.4, tones.body, 520, 3.5, depth));
    this.crater(x, y, R * 0.75, 1, tones);

    // 6 — blood.
    this.splatter(x, y, 14, { speed: R * 3, size: 3.4, life: 620, depth, tones: BEAST_TONES });
    this.flash(x, y, R * 0.6, depth + 3, tones);
  }

  /**
   * The beast being pulled back in. The same rosette run inward, the spurs retracting, and a
   * body that folds up and goes quiet — deliberately smaller and sadder than the way out.
   */
  transformRevert(x: number, y: number, radius: number, tones: HuntTones, depth = 8): void {
    const R = radius;
    const rips = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.3,
      delay: Math.random() * 0.22,
      len: 0.6 + Math.random() * 0.45,
    }));
    this.anim(depth, 560, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const r of rips) {
        const lt = Math.max(0, (t - r.delay) / (1 - r.delay));
        const k = 1 - easeOut(lt);
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(r.ang) * R * (0.3 + k * 0.9),
          y + Math.sin(r.ang) * R * (0.3 + k * 0.9),
          r.ang + Math.PI / 2, R * r.len * 0.6 * (0.4 + k * 0.6), R * 0.12, 0.85 * fade,
          { curve: 0.3, rip: 0.3 },
        );
      }
      // The body closing over: a dark shell shrinking down onto the fighter.
      g.lineStyle(3 * fade, this.tint(tones.crust), 0.6 * fade);
      g.strokeCircle(x, y, R * (1.3 - easeOut(t) * 0.9));
    });
    this.ring(x, y, R * 1.5, R * 0.25, tones.wound, 460, 3.5, depth);
    this.splatter(x, y, 6, { speed: R * 1.2, size: 2.6, life: 620, fall: 70, depth, tones: BEAST_TONES });
    this.smoke(x, y, 3, R * 0.7, depth - 1);
  }

  /**
   * Hungering channel: blood dragged inward toward a tightening ring — the wind-up before a
   * Blood Hunt teleport. `follow` lets it track a caster that can still be moved.
   */
  channelHunger(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 8, tones: HuntTones = BEAST_TONES,
  ): void {
    const streams = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU,
      spin: 0.6 + (i % 3) * 0.4,
      phase: i / 9,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 24) * 0.15;
      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        huntGashLayered(g, this.tint, tones,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r, a,
          r * 0.4, 3.4 * (1 - lt), 0.8 * (1 - lt * 0.5), { curve: 0.35, flick: false });
      }
      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(tones.crust), 0.6);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.85 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.32);
      g.lineStyle(3, this.tint(tones.wound), 0.4 + 0.45 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /** Ignition burst for a toggle: gashes locking inward around a body. */
  bloom(x: number, y: number, radius: number, count = 8, depth = 5, tones: HuntTones = HUNTER_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({ ang: (i / count) * TAU, delay: (i % 3) * 0.06 }));
    this.anim(depth, 440, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = radius * (1.5 - easeOut(lt) * 0.8);
        huntGashLayered(g, this.tint, tones,
          x + Math.cos(s.ang) * d, y + Math.sin(s.ang) * d, s.ang + Math.PI / 2,
          radius * 0.55, radius * 0.13, 0.85 * fade, { curve: 0.3, flick: false });
      }
    });
    this.ring(x, y, radius * 1.4, radius * 0.6, tones.lit, 380, 3.5, depth);
  }

  // ── Caller-owned Graphics painters ──────────────────────────────────────

  /**
   * A live grenade, drawn as an object rather than a marker: a segmented pineapple casing that
   * tumbles while it is still travelling, a bent spoon flying off it, a fuse cord whose ember
   * eats its way down toward the shell, and a lead-in warning that goes from a lazy sweep to a
   * hard triple strobe over the last second.
   *
   * `spin` is the tumble angle (radians) and `settled` says whether it has come to rest — a
   * grenade on the ground stops rotating, sits into its own shadow and starts venting.
   */
  static drawGrenade(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, t: number, fuseLeft: number, isHeal: boolean,
    spin = 0, settled = false,
  ): void {
    const urgency = Phaser.Math.Clamp(1 - fuseLeft / 3000, 0, 1);
    const panic = Phaser.Math.Clamp(1 - fuseLeft / 900, 0, 1);
    const shell = isHeal ? 0x2f4a24 : HUNT.hide;
    const trim = isHeal ? 0x44cc44 : tones.wound;
    // The last second: a hard triple strobe instead of the lazy pulse.
    const beat = panic > 0
      ? Math.max(0.55 + 0.45 * Math.sin(t * 10), Math.pow(Math.abs(Math.sin(t * 22)), 0.35))
      : 0.55 + 0.45 * Math.sin(t * (6 + urgency * 18));
    const a = settled ? spin * 0 : spin;
    const cos = Math.cos(a), sin = Math.sin(a);
    // Local → world for the tumbling casing.
    const P = (lx: number, ly: number): [number, number] => [x + lx * cos - ly * sin, y + lx * sin + ly * cos];

    // Shadow: tight and dark once it has settled, smeared while it is still in the air.
    g.fillStyle(tint(HUNT.pitch), settled ? 0.45 : 0.28);
    g.fillEllipse(x, y + (settled ? 9 : 12), settled ? 19 : 26, settled ? 7 : 5);

    // Body — a segmented pineapple, three bands of four plates.
    g.fillStyle(tint(shell), 1);
    g.fillEllipse(x, y, 18, 19);
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        if (col === 0) continue;
        const [px, py] = P(col * 4.4, row * 5.6);
        g.fillStyle(tint(row === 0 ? tones.crust : HUNT.pitch), 0.5);
        g.fillRoundedRect(px - 3.4, py - 2.4, 6.8, 4.8, 1.6);
      }
    }
    // Scored seams, so the plates read as cast metal rather than painted squares.
    g.lineStyle(1, tint(HUNT.pitch), 0.9);
    for (let i = -1; i <= 1; i++) {
      const [ax, ay] = P(-9, i * 5.6);
      const [bx, by] = P(9, i * 5.6);
      g.lineBetween(ax, ay, bx, by);
      const [cx2, cy2] = P(i * 4.6, -9);
      const [dx2, dy2] = P(i * 4.6, 9);
      g.lineBetween(cx2, cy2, dx2, dy2);
    }
    // A lit rim on the top-left shoulder gives the ball volume.
    g.fillStyle(tint(trim), 0.35);
    g.fillEllipse(x - 3.4, y - 4, 8, 6);
    g.lineStyle(1.4, tint(tones.body), 0.7);
    g.strokeEllipse(x, y, 18, 19);

    // Neck, cap and the spoon that flew off — the reason it is armed at all.
    const [nx, ny] = P(0, -11);
    g.fillStyle(tint(HUNT.steel), 1);
    g.fillRoundedRect(nx - 2.6, ny - 4, 5.2, 6, 1.4);
    g.fillStyle(tint(HUNT.smoke), 1);
    g.fillRoundedRect(nx - 4.4, ny - 6, 8.8, 3, 1.2);
    if (!settled) {
      // Spoon tumbling away behind it while it is still travelling.
      const sa = a * 2.6;
      const sx = x - Math.cos(a) * 24 + Math.cos(sa) * 3;
      const sy = y - Math.sin(a) * 24 + Math.sin(sa) * 3;
      g.lineStyle(2.2, tint(HUNT.steel), 0.75);
      g.lineBetween(sx, sy, sx + Math.cos(sa) * 9, sy + Math.sin(sa) * 9);
    }

    // Fuse cord: a short curl with an ember eating down it toward the shell.
    const burn = Phaser.Math.Clamp(urgency, 0, 1);
    const cordLen = 13 * (1 - burn * 0.72);
    g.lineStyle(1.8, tint(0x5a4736), 0.95);
    g.beginPath();
    g.moveTo(nx, ny - 3);
    g.lineTo(nx + Math.sin(t * 3) * 2.5, ny - 3 - cordLen * 0.55);
    g.lineTo(nx - Math.sin(t * 3.7) * 3, ny - 3 - cordLen);
    g.strokePath();
    const ex = nx - Math.sin(t * 3.7) * 3;
    const ey = ny - 3 - cordLen;
    g.fillStyle(tint(tones.lit), 0.85 + 0.15 * beat);
    g.fillCircle(ex, ey, 2.2 + urgency * 1.8 + beat * 1.2);
    g.fillStyle(tint(HUNT.white), 0.85 * beat);
    g.fillCircle(ex, ey, 1 + beat);
    // Sparks flicking off the ember, thicker as it burns down.
    for (let i = 0; i < 3; i++) {
      const sa = t * (7 + i * 3) + i * 2.1;
      const sd = (3 + i * 2) * (0.5 + 0.5 * Math.sin(t * 9 + i));
      g.fillStyle(tint(tones.spark), (0.25 + urgency * 0.45) * (0.4 + 0.6 * beat));
      g.fillCircle(ex + Math.cos(sa) * sd, ey + Math.sin(sa) * sd - urgency * 3, 0.9 + urgency);
    }

    // A settled grenade vents: powder smoke curling out of the seams.
    if (settled) {
      for (let i = 0; i < 3; i++) {
        const f = ((t * 0.9 + i * 0.33) % 1);
        g.fillStyle(tint(HUNT.smoke), 0.22 * (1 - f));
        g.fillCircle(x + Math.sin(t * 2 + i * 2) * 5, y - 4 - f * 18, 2.5 + f * 5);
      }
    }

    // Warning: one sweeping arc normally, a hard closing ring over the last second.
    if (panic <= 0) {
      g.lineStyle(1.6, tint(trim), 0.22 + urgency * 0.35);
      g.beginPath();
      g.arc(x, y, 20 - urgency * 4, t * 3, t * 3 + 2.2, false);
      g.strokePath();
    } else {
      g.lineStyle(2 + panic * 1.5, tint(HUNT.fresh), 0.35 + 0.5 * beat);
      g.strokeCircle(x, y, 26 - panic * 12 + beat * 2);
      // Four tick marks on the ring, so the closing read is unmistakable.
      for (let i = 0; i < 4; i++) {
        const ta = (i / 4) * TAU + t * 2;
        const tr = 26 - panic * 12 + beat * 2;
        g.lineStyle(2, tint(HUNT.white), 0.5 * beat);
        g.lineBetween(
          x + Math.cos(ta) * (tr - 4), y + Math.sin(ta) * (tr - 4),
          x + Math.cos(ta) * (tr + 4), y + Math.sin(ta) * (tr + 4),
        );
      }
    }
  }

  /**
   * A crossbow bolt: fletched shaft, banded shoulder and a broadhead. `bite` sinks the head
   * into whatever it is stuck in and adds the blood running out around it.
   */
  static drawBolt(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, angle: number, scale = 1, bite = 0, bomb = false,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    const L = 22 * scale;
    const tipX = x + cos * L * 0.5, tipY = y + sin * L * 0.5;
    const backX = x - cos * L * 0.5, backY = y - sin * L * 0.5;

    // Shaft.
    g.lineStyle(3 * scale, tint(HUNT.hide), 1);
    g.lineBetween(backX, backY, tipX, tipY);
    g.lineStyle(1.2 * scale, tint(tones.lit), 0.5);
    g.lineBetween(backX + px * 0.9, backY + py * 0.9, tipX + px * 0.9, tipY + py * 0.9);

    // Broadhead — a leaf, not a triangle: two curved flanks meeting at the point.
    const hb = L * 0.24;
    g.fillStyle(tint(bomb ? HUNT.flare : HUNT.steel), 1);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(tipX - cos * hb + px * 3.4 * scale, tipY - sin * hb + py * 3.4 * scale);
    g.lineTo(tipX - cos * hb * 1.7, tipY - sin * hb * 1.7);
    g.lineTo(tipX - cos * hb - px * 3.4 * scale, tipY - sin * hb - py * 3.4 * scale);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(bomb ? HUNT.spark : HUNT.silver), 0.8);
    g.fillCircle(tipX - cos * hb * 0.6, tipY - sin * hb * 0.6, 1.2 * scale);

    // Bomb head: a charge lashed behind the broadhead, beating.
    if (bomb) {
      const bx = tipX - cos * L * 0.3, by = tipY - sin * L * 0.3;
      g.fillStyle(tint(HUNT.rust), 1);
      g.fillCircle(bx, by, 4 * scale);
      g.lineStyle(1.2 * scale, tint(HUNT.flare), 0.9);
      g.strokeCircle(bx, by, 4.8 * scale);
    }

    // Fletching: two swept vanes at the nock.
    for (const s of [-1, 1]) {
      g.fillStyle(tint(s > 0 ? tones.body : tones.crust), 0.95);
      g.beginPath();
      g.moveTo(backX, backY);
      g.lineTo(backX + cos * L * 0.3 + px * s * 4 * scale, backY + sin * L * 0.3 + py * s * 4 * scale);
      g.lineTo(backX + cos * L * 0.34, backY + sin * L * 0.34);
      g.closePath();
      g.fillPath();
    }

    // Buried: the wound around the shaft and the blood running down off it.
    if (bite > 0) {
      g.fillStyle(tint(HUNT.gore), 0.55 * bite);
      huntGash(g, tipX - cos * 3, tipY - sin * 3, angle + Math.PI / 2, 9 * scale, 2.6 * scale, 0.3, 0.2);
      g.fillStyle(tint(HUNT.blood), 0.7 * bite);
      g.fillCircle(tipX - cos * 2, tipY - sin * 2, 2 * scale);
    }
  }

  /**
   * A hook and its chain: heavy links running back to the thrower, with the claw at the far
   * end. Links are drawn individually so the line reads as chain rather than a rubber band.
   */
  static drawHookChain(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x0: number, y0: number, x1: number, y1: number, t: number, latched: boolean,
  ): void {
    const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1) || 1;
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    const links = Phaser.Math.Clamp(Math.round(dist / 11), 2, 34);
    // A latched chain is taut; one still flying keeps a little sway in it.
    const sag = latched ? 0 : Math.min(16, dist * 0.06);

    for (let i = 0; i <= links; i++) {
      const f = i / links;
      const bow = Math.sin(Math.PI * f) * sag * Math.sin(t * 6 + f * 4);
      const lx = x0 + cos * dist * f + px * bow;
      const ly = y0 + sin * dist * f + py * bow;
      g.lineStyle(3.2, tint(i % 2 ? HUNT.steel : HUNT.smoke), 0.95);
      g.strokeEllipse(lx, ly, 7, 4.4);
    }

    // The claw: three curved tines closing on the target.
    const close = latched ? 1 : 0.35 + 0.2 * Math.sin(t * 9);
    for (const s of [-1, 0, 1]) {
      const a = angle + s * 0.6 * (1 - close * 0.55);
      g.lineStyle(3, tint(HUNT.silver), 1);
      g.beginPath();
      g.moveTo(x1 - cos * 5, y1 - sin * 5);
      g.lineTo(x1 + Math.cos(a) * 8, y1 + Math.sin(a) * 8);
      g.lineTo(x1 + Math.cos(a - s * 0.9) * 12, y1 + Math.sin(a - s * 0.9) * 12);
      g.strokePath();
    }
    g.fillStyle(tint(tones.crust), 1);
    g.fillCircle(x1 - cos * 5, y1 - sin * 5, 4.4);
    if (latched) {
      g.fillStyle(tint(HUNT.blood), 0.5 + 0.3 * Math.sin(t * 12));
      g.fillCircle(x1, y1, 5);
    }
  }

  /**
   * A searing slash burned into the floor: a gash lying in its own scorch, breathing heat.
   * Fades out over its life rather than blinking off.
   */
  static drawSear(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, angle: number, len: number, t: number, life: number,
  ): void {
    const a = Phaser.Math.Clamp(life, 0, 1);
    const beat = 0.7 + 0.3 * Math.sin(t * 5 + x * 0.05);
    g.fillStyle(tint(HUNT.pitch), 0.3 * a);
    huntGash(g, x, y, angle, len * 1.25, len * 0.2, 0.3, 0.3);
    huntGashLayered(g, tint, tones, x, y, angle, len, len * 0.1, 0.75 * a * beat,
      { curve: 0.3, rip: 0.3, flick: false });
    // Heat coming off it.
    for (let i = 0; i < 3; i++) {
      const f = ((t * 0.8 + i * 0.34) % 1);
      g.fillStyle(tint(tones.lit), 0.22 * a * (1 - f));
      g.fillCircle(
        x + Math.cos(angle) * (i - 1) * len * 0.3,
        y + Math.sin(angle) * (i - 1) * len * 0.3 - f * 14,
        1.6 + f * 3,
      );
    }
  }

  /**
   * Blood Moon sky: a red wash, a low vignette and the moon itself hanging in the corner with
   * clouds dragging across its face. Painted into a caller-owned Graphics pinned over the arena.
   */
  static drawBloodMoonSky(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn,
    w: number, h: number, t: number, alpha: number,
  ): void {
    if (alpha <= 0.01) return;
    g.fillStyle(tint(HUNT.moonDark), 0.2 * alpha);
    g.fillRect(0, 0, w, h);
    // Vignette: four thickening bands rather than a real radial, which Graphics can't do.
    for (let i = 0; i < 5; i++) {
      const k = i / 5;
      g.fillStyle(tint(0x2a0505), 0.055 * alpha);
      g.fillRect(0, 0, w, h * 0.16 * (1 - k));
      g.fillRect(0, h - h * 0.16 * (1 - k), w, h * 0.16 * (1 - k));
      g.fillRect(0, 0, w * 0.13 * (1 - k), h);
      g.fillRect(w - w * 0.13 * (1 - k), 0, w * 0.13 * (1 - k), h);
    }
    // The moon, low and swollen in the top-right.
    const mx = w - 96;
    const my = 92;
    const r = 44 + Math.sin(t * 0.7) * 1.6;
    g.fillStyle(tint(HUNT.moon), 0.12 * alpha);
    g.fillCircle(mx, my, r * 1.7);
    g.fillStyle(tint(HUNT.blood), 0.2 * alpha);
    g.fillCircle(mx, my, r * 1.25);
    g.fillStyle(tint(0xd94433), 0.85 * alpha);
    g.fillCircle(mx, my, r);
    // Maria: darker pocks, fixed so the moon doesn't shimmer.
    const pocks: Array<[number, number, number]> = [
      [-0.32, -0.2, 0.24], [0.18, -0.36, 0.15], [0.3, 0.22, 0.2], [-0.12, 0.36, 0.13], [0.02, 0.02, 0.1],
    ];
    for (const [ox, oy, pr] of pocks) {
      g.fillStyle(tint(0x9c2a20), 0.6 * alpha);
      g.fillCircle(mx + ox * r, my + oy * r, pr * r);
    }
    // Cloud bands dragging across its face.
    for (let i = 0; i < 3; i++) {
      const cy = my - r * 0.5 + i * r * 0.5;
      const cx = mx + (((t * (9 + i * 5) + i * 130) % (w + 240)) - 120) * 0.12 - 40;
      g.fillStyle(tint(0x2a0d0d), 0.4 * alpha);
      g.fillEllipse(cx, cy, r * 2.1, r * 0.22);
    }
  }

  /**
   * The pump gauge over a hybrid hunter's shoulder: one shell per pump, the fourth glowing
   * red because the next trigger pull goes off in your hands.
   */
  static drawPumpGauge(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn,
    x: number, y: number, pumps: number, overloaded: boolean, t: number,
  ): void {
    const slots = 4;
    for (let i = 0; i < slots; i++) {
      const sx = x + (i - (slots - 1) / 2) * 11;
      const filled = i < pumps;
      const danger = i === 3 && (filled || overloaded);
      g.fillStyle(tint(danger ? HUNT.fresh : filled ? HUNT.spark : HUNT.pitch),
        danger ? 0.7 + 0.3 * Math.sin(t * 14) : filled ? 0.95 : 0.5);
      g.fillRoundedRect(sx - 3.6, y - 7, 7.2, 14, 2);
      g.lineStyle(1, tint(filled ? HUNT.bone : HUNT.smoke), 0.85);
      g.strokeRoundedRect(sx - 3.6, y - 7, 7.2, 14, 2);
      if (filled) {
        g.fillStyle(tint(HUNT.hide), 0.9);
        g.fillRect(sx - 3.6, y + 2, 7.2, 5);
      }
    }
  }

  /**
   * A Hunter's Trail mark: a pair of paw prints pressed into the ground with the blood scent
   * still steaming off them, fading as the mark ages. Beats a flat translucent disc.
   */
  static drawTrail(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, radius: number, angle: number, t: number, life: number,
  ): void {
    const a = Phaser.Math.Clamp(life, 0, 1);
    g.fillStyle(tint(tones.crust), 0.16 * a);
    g.fillCircle(x, y, radius);

    // Two prints, offset along the heading so the track reads as a stride.
    for (const s of [-1, 1]) {
      const px = x + Math.cos(angle) * s * radius * 0.32 - Math.sin(angle) * s * radius * 0.3;
      const py = y + Math.sin(angle) * s * radius * 0.32 + Math.cos(angle) * s * radius * 0.3;
      g.fillStyle(tint(HUNT.gore), 0.6 * a);
      // Pad.
      g.fillEllipse(px, py, radius * 0.42, radius * 0.36);
      // Four toes fanned in front of it.
      for (let i = 0; i < 4; i++) {
        const ta = angle + (i - 1.5) * 0.38;
        g.fillCircle(px + Math.cos(ta) * radius * 0.31, py + Math.sin(ta) * radius * 0.31, radius * 0.11);
      }
    }
    // Scent rising off the mark.
    g.fillStyle(tint(tones.wound), 0.22 * a * (0.5 + 0.5 * Math.sin(t * 3)));
    g.fillCircle(x, y - radius * 0.3 - (t * 6) % 8, radius * 0.18);
  }

  /**
   * Bleeding: a wound ring with drips running down out of it, drawn on the victim every frame.
   * A status the enemy carries has to be readable between ticks, not only on them.
   */
  static drawBleed(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    g.lineStyle(2, tint(HUNT.blood), 0.45 * alpha);
    g.strokeCircle(x, y, radius * (1 + 0.04 * Math.sin(t * 4)));
    g.fillStyle(tint(HUNT.gore), 0.18 * alpha);
    g.fillCircle(x, y, radius);
    // Four drips on their own loops down the body.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.sin(t * 0.7 + i) * 0.4;
      const f = ((t * 0.9 + i * 0.31) % 1);
      const dx = x + Math.cos(a) * radius * 0.8;
      const dy = y + Math.sin(a) * radius * 0.5 + f * radius * 0.9;
      const fade = (1 - f) * alpha;
      g.fillStyle(tint(HUNT.blood), 0.85 * fade);
      huntGash(g, dx, dy, Math.PI / 2, 7 * fade, 1.9 * fade, 0.1, 0);
      g.fillStyle(tint(HUNT.fresh), 0.7 * fade);
      g.fillCircle(dx, dy + 3 * fade, 1.4 * fade);
    }
  }

  /**
   * A roar cone: nested jaw-arcs sweeping out along the aim, each one a beat behind the last,
   * with fangs standing off the leading edge. Beats a translucent pie slice — the gap between
   * the arcs is what makes it read as sound leaving a mouth.
   */
  roarCone(
    x: number, y: number, angle: number, halfAngle: number, length: number,
    depth = 9, tones: HuntTones = BEAST_TONES,
  ): void {
    const waves = 4;
    const teeth = 9;
    this.anim(depth, 620, (g, t) => {
      for (let w = 0; w < waves; w++) {
        const lt = t * 1.45 - w * 0.16;
        if (lt <= 0 || lt >= 1) continue;
        const r = length * easeOut(lt);
        const fade = (1 - lt) * (1 - w * 0.16);
        g.lineStyle(5 * fade, this.tint(tones.wound), 0.55 * fade);
        g.beginPath();
        g.arc(x, y, r, angle - halfAngle, angle + halfAngle, false);
        g.strokePath();
        for (let i = 0; i < teeth; i++) {
          const a = angle - halfAngle + (i / (teeth - 1)) * halfAngle * 2;
          huntGashLayered(
            g, this.tint, tones,
            x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI / 2,
            length * 0.055 * fade, length * 0.011 * fade, 0.8 * fade,
            { curve: 0.3, flick: false, edge: false },
          );
        }
      }
      // The throat itself, held open at the caster.
      const k = Math.max(0, 1 - t * 1.8);
      g.fillStyle(this.tint(tones.crust), 0.55 * k);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, length * 0.22, angle - halfAngle, angle + halfAngle, false);
      g.closePath();
      g.fillPath();
      g.fillStyle(this.tint(tones.spark), 0.85 * k);
      g.fillCircle(x, y, 7 * (0.6 + t));
    });
  }

  /**
   * A crossbow bolt leaving the stock: the string's snap, a short muzzle gash and the wake
   * behind the shaft. Small on purpose — the bolt itself is drawn every frame by the kit.
   */
  boltRelease(x: number, y: number, angle: number, depth = 8, tones: HuntTones = HUNTER_TONES): void {
    this.anim(depth, 160, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(tones.lit), 0.8 * fade);
      huntGash(g, x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, angle + Math.PI / 2,
        20 * fade, 3 * fade, 0.24, 0);
      g.lineStyle(1.6 * fade, this.tint(HUNT.bone), 0.7 * fade);
      g.lineBetween(
        x - Math.sin(angle) * 11, y + Math.cos(angle) * 11,
        x + Math.sin(angle) * 11, y - Math.cos(angle) * 11,
      );
    });
  }

  /** A bolt biting home: a puncture ring and blood kicked back along the shaft. */
  boltBite(x: number, y: number, angle: number, depth = 9, tones: HuntTones = BEAST_TONES): void {
    this.flash(x, y, 9, depth, tones);
    this.ring(x, y, 3, 22, tones.wound, 260, 2.5, depth);
    this.splatter(x, y, 5, {
      speed: 130, angle: angle + Math.PI, spread: 0.9, size: 2.2, life: 420, depth, tones: BEAST_TONES,
    });
  }

  /**
   * A shockwave off a buried bolt: two thin rings and a scatter of gashes pushed straight out
   * of the wound. Read at a glance as "that bolt just told me where you are".
   */
  boltPing(x: number, y: number, radius: number, depth = 4, tones: HuntTones = HUNTER_TONES): void {
    const spokes = Array.from({ length: 6 }, (_, i) => (i / 6) * TAU + Math.random() * 0.3);
    this.anim(depth, 520, (g, t) => {
      const fade = 1 - t;
      for (const s of [0, 0.22]) {
        const lt = t - s;
        if (lt <= 0) continue;
        g.lineStyle(2.4 * (1 - lt), this.tint(tones.wound), 0.5 * (1 - lt));
        g.strokeCircle(x, y, radius * easeOut(lt));
      }
      for (const a of spokes) {
        const d = radius * 0.55 * easeOut(t);
        huntGashLayered(g, this.tint, tones,
          x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI / 2,
          radius * 0.24 * fade, radius * 0.05 * fade, 0.6 * fade,
          { curve: 0.3, flick: false, edge: false });
      }
    });
  }

  /** The needle going in: a hard white spike, a jolt ring, and the kick that follows. */
  syringeJab(x: number, y: number, depth = 9): void {
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - t;
      const drop = easeOut(Math.min(1, t * 3));
      // Barrel + plunger driving down into the shoulder.
      const by = y - 26 + drop * 12;
      g.fillStyle(this.tint(HUNT.silver), 0.9 * fade);
      g.fillRect(x - 3.5, by - 14, 7, 15);
      g.fillStyle(this.tint(0x66ff99), 0.85 * fade);
      g.fillRect(x - 2.4, by - 13 + drop * 12, 4.8, 13 - drop * 12);
      g.fillStyle(this.tint(HUNT.steel), 0.95 * fade);
      g.fillRect(x - 6.5, by - 16, 13, 2.4);
      g.lineStyle(1.6, this.tint(HUNT.bone), 0.9 * fade);
      g.lineBetween(x, by + 1, x, by + 10);
      // The jolt.
      if (t > 0.35) {
        const k = (t - 0.35) / 0.65;
        g.lineStyle(2.5 * (1 - k), this.tint(0x88ffaa), 0.7 * (1 - k));
        g.strokeCircle(x, y, 12 + k * 34);
      }
    });
  }

  /**
   * A shriek box: the forward rectangle Hybrid form screams into, drawn as a throat of stacked
   * sound bars rather than a flat translucent slab.
   */
  shriekBox(
    cx: number, cy: number, angle: number, halfLen: number, halfWide: number,
    depth = 7, tones: HuntTones = SILVER_TONES,
  ): void {
    const bars = 7;
    this.anim(depth, 320, (g, t) => {
      const fade = 1 - easeIn(t);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const px = -sin, py = cos;
      for (let i = 0; i < bars; i++) {
        const f = i / (bars - 1);
        // Each bar launches a beat after the one behind it, so the sound visibly travels.
        const local = Phaser.Math.Clamp(t * 2.2 - f * 0.8, 0, 1);
        if (local <= 0) continue;
        const along = (f - 0.5) * halfLen * 2;
        const w = halfWide * (0.55 + 0.45 * Math.sin(Math.PI * f)) * local;
        huntGashLayered(
          g, this.tint, tones,
          cx + cos * along, cy + sin * along,
          angle + Math.PI / 2, w * 2, 4.5 * fade, 0.75 * fade,
          { curve: 0.12, rip: 0.15, flick: false },
        );
      }
      // The mouth of the box.
      g.lineStyle(2 * fade, this.tint(tones.spark), 0.7 * fade);
      g.strokeRect(cx - halfLen, cy - halfWide, halfLen * 2, halfWide * 2);
      void px; void py;
    });
  }
}

// ── HuntAura ──────────────────────────────────────────────────────────────

/**
 * Persistent blood aura clinging to a fighter (Blood Pact, Blood Moon, a bleeding victim).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class HuntAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private dripAccum = 0;
  private teeth: { ang: number; len: number; w: number; spin: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: HuntColorFn,
    private tones: HuntTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 7,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.teeth = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.45 + Math.random() * 0.3,
      w: 0.1 + Math.random() * 0.05,
      spin: 0.35 + Math.random() * 0.4,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }
  setTones(tones: HuntTones): void { this.tones = tones; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const beat = 0.8 + 0.2 * Math.sin(this.t * 4);
    g.fillStyle(this.tint(this.tones.crust), 0.24 * this.intensity * alpha * beat);
    g.fillCircle(x, y, this.radius * 0.95);
    g.lineStyle(2, this.tint(this.tones.wound), 0.45 * alpha * beat);
    g.strokeCircle(x, y, this.radius);

    for (const s of this.teeth) {
      const ang = s.ang + this.t * s.spin;
      huntGashLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.72, y + Math.sin(ang) * this.radius * 0.72,
        ang + Math.PI / 2,
        this.radius * s.len * this.intensity, this.radius * s.w, 0.6 * alpha,
        { curve: 0.3, flick: false },
      );
    }

    this.dripAccum += delta;
    const interval = 380 / Math.max(0.4, this.intensity);
    if (this.dripAccum >= interval) {
      this.dripAccum = 0;
      const a = Math.random() * TAU;
      new HuntFx(this.scene, this.tint).splatter(
        x + Math.cos(a) * this.radius * 0.6, y + Math.sin(a) * this.radius * 0.6,
        1, { speed: 12, size: 2.2, life: 620, fall: 40, depth: 4, tones: this.tones },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── HuntAvatar ────────────────────────────────────────────────────────────

/** Hunt's three shapes. The rig reads the form and changes silhouette accordingly. */
export type HuntForm = 'human' | 'beast' | 'hybrid';

/** What the character is holding. The beast holds nothing — it grew its own. */
export type HuntWeapon = 'crossbow' | 'shotgun' | null;

/** Concentric discs of one fist, outermost first. */
const HUNT_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: HUNT.rust, alpha: 0.3 },
    { r: 6.8, color: HUNT.ember, alpha: 0.95 },
    { r: 3.6, color: HUNT.spark, alpha: 1 },
    { r: 1.5, color: HUNT.white, alpha: 1, ox: -2.2, oy: -2.2 },
  ],
  eyeWhite: HUNT.bone,
  eyePupil: HUNT.pitch,
  // A fist is heavy: a lot of stretch along travel, very little squash across it.
  squash: { div: 12, x: 0.58, y: 0.2 },
};

/**
 * The hunt character rig: two heavy fists, a pair of eyes, and a set of ears above the crown
 * that grow into a full snarling head as the beast comes out. The hands, eyes and gestures come
 * from BaseAvatar; what hunt adds is the form change, the claws that sprout on the fists in
 * beast form, and the blood pooling underfoot.
 */
export class HuntAvatar extends BaseAvatar {
  private fx: HuntFx;
  private tones: HuntTones;
  private form: HuntForm = 'human';
  /** Eased toward 1 in beast form so the head grows rather than popping. */
  private beastness = 0;
  private moon = false;
  /** Hell (divine perk): wearing hellhound colours over the beast shape. */
  private hell = false;

  /** The kit in his hands. Driven by the kit from the form. */
  private weapon: HuntWeapon = 'crossbow';
  /** A weapon brought up for one ability, and how long it stays up. */
  private swap: HuntWeapon = null;
  private swapLeft = 0;
  /** 0 = just loosed, 1 = spanned and loaded. Read straight off the crossbow's cooldown. */
  private load = 1;
  /** Shells showing in the shotgun's loops. */
  private shells = 0;
  /** Recoil impulse, kicked to 1 on every shot and bled off over ~150ms. */
  private recoil = 0;
  /** Pump action, kicked when a shell is racked. */
  private pump = 0;
  /** How far the jaws are apart. Attacks snap it open; it closes on its own. */
  private snarl = 0;

  constructor(scene: Phaser.Scene, tint: HuntColorFn, tones: HuntTones = HUNTER_TONES, depth = 6) {
    super(scene, tint, depth, HUNT_AVATAR);
    this.fx = new HuntFx(scene, tint);
    this.tones = tones;
    if (tones !== HUNTER_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.95));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.lit), 1));
    }
  }

  /** Which weapon is in his hands, or null while the beast is wearing the body. */
  setWeapon(w: HuntWeapon): void { this.weapon = w; }

  /**
   * Bring a different weapon up for a moment and then put it away again. Human form carries the
   * crossbow, but Blast is a shotgun — without this he fires buckshot out of a crossbow, which
   * is the sort of thing you only notice once and then cannot stop noticing.
   */
  flashWeapon(w: HuntWeapon, ms = 900): void {
    this.swap = w;
    this.swapLeft = ms;
  }

  /** Crossbow span, 0 (spent) → 1 (loaded). The string and the bolt in the groove follow it. */
  setLoad(v: number): void { this.load = Phaser.Math.Clamp(v, 0, 1); }

  /** Shells visible in the shotgun's stock loops. */
  setShells(n: number): void { this.shells = Phaser.Math.Clamp(n, 0, 4); }

  /** Fire: kick the weapon back along its own axis. */
  kick(strength = 1): void { this.recoil = Math.min(1.4, this.recoil + strength); }

  /** Rack the pump — the fore-end slams back and rides forward again. */
  rack(): void { this.pump = 1; }

  /** Snap the jaws open. Decays back to an idle pant on its own. */
  snap(amount = 1): void { this.snarl = Math.max(this.snarl, Phaser.Math.Clamp(amount, 0, 1)); }

  /**
   * Which of hunt's three shapes the character is wearing. Beast and hybrid are separate
   * silhouettes, not tints — the ears grow, the muzzle comes out, the fists sprout claws.
   */
  setForm(form: HuntForm): void {
    if (form === this.form) return;
    this.form = form;
    this.repaintHands();
  }

  /**
   * Hell (divine perk): the beast shape is worn by a hellhound instead — same silhouette,
   * burnt colours. Early-outs when unchanged, so kits can call it every frame.
   */
  setHell(on: boolean): void {
    if (on === this.hell) return;
    this.hell = on;
    this.repaintHands();
  }

  private repaintHands(): void {
    const tones = this.formTones();
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.95));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.lit), 1));
    this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(tones.crust), 0.34));
  }

  /** Blood Moon overhead — everything the character wears runs red under it. */
  setMoon(on: boolean): void { this.moon = on; }

  /** Colours for the shape alone, before a Blood Moon gets a say. */
  private formTones(): HuntTones {
    if (this.form === 'beast') return this.hell ? HELL_TONES : BEAST_TONES;
    if (this.form === 'hybrid') return SILVER_TONES;
    return this.tones;
  }

  /** Colours for whatever the character is currently wearing. */
  private activeTones(): HuntTones {
    if (this.moon) return MOON_TONES;
    return this.formTones();
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered hunt
   * user is identifiable at a glance before they cast anything: bone-white eyes, a heavy corona
   * and a hard rim on each fist, a bigger head, a rack of trophy fangs strung overhead and a
   * taken skull swinging off the belt. Shape changes, not just brighter tints — a tint alone
   * vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? HUNT.white : HUNT.bone);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(this.tint(on ? this.tones.wound : HUNT.rust), on ? 0.34 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(HUNT.bone), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists sling blood. */
  protected emitTrail(x: number, y: number): void {
    this.fx.splatter(x, y, 1, { speed: 10, size: 2, life: 480, fall: 30, depth: 5, tones: this.activeTones() });
  }

  /**
   * Bleed off the impulses the kit pokes in — recoil, the pump stroke and the snarl all decay
   * on their own so a caller only ever has to say "it happened", never "it is still happening".
   */
  update(delta: number, x: number, y: number, alpha: number): void {
    const dt = delta / 1000;
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.pump = Math.max(0, this.pump - dt * 5);
    this.snarl = Math.max(0, this.snarl - dt * 2.2);
    if (this.swapLeft > 0) {
      this.swapLeft -= delta;
      if (this.swapLeft <= 0) this.swap = null;
    }
    super.update(delta, x, y, alpha);
  }

  /** Whatever is actually up right now — a one-ability swap beats the form's standing weapon. */
  private heldWeapon(): HuntWeapon {
    return this.swapLeft > 0 ? this.swap : this.weapon;
  }

  /** How far the jaws hang open right now: an idle pant, plus whatever the last attack added. */
  private jawOpen(): number {
    return Phaser.Math.Clamp(0.16 + 0.09 * Math.sin(this.t * 3.4) + this.snarl * 0.82, 0, 1);
  }

  /**
   * Where the weapon sits: between the two fists, shoved a little further out along the aim so
   * the stock never crosses the face. Anchoring it to the live hand positions is what makes it
   * look *held* — when a gesture throws a fist forward the whole weapon lunges with it.
   */
  private weaponAnchor(x: number, y: number): { x: number; y: number } {
    const mx = (this.armX[0] + this.armX[1]) / 2;
    const my = (this.armY[0] + this.armY[1]) / 2;
    return {
      x: mx + Math.cos(this.facing) * 12 + (mx - x) * 0.1,
      // Held at the chest, not across the face — otherwise the stock cuts through the eyes.
      y: my + Math.sin(this.facing) * 12 + (my - y) * 0.1 + 8,
    };
  }

  /**
   * Under the character: the blood it stands in, the gouges it has scored into the floor, and —
   * once the beast is out — the ruff along its back and the tail sweeping behind it. All of it
   * lives on the low layer so the body sits on top and the silhouette reads in one piece.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tones = this.activeTones();
    const b = this.beastness;

    g.fillStyle(this.tint(tones.crust), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 7, 54 * this.intensity, 25 * this.intensity);
    g.fillStyle(this.tint(tones.body), a * 0.2 * this.intensity);
    g.fillEllipse(x, y + 6, 36 * this.intensity, 17 * this.intensity);
    // Three gouges scored into the floor, turning slowly under the character.
    for (let i = 0; i < 3; i++) {
      const ang = this.t * 0.5 + (i / 3) * TAU;
      huntGashLayered(
        g, this.tint, tones,
        x + Math.cos(ang) * 13, y + 7 + Math.sin(ang) * 6,
        ang + Math.PI / 2, (16 + Math.sin(this.t * 2 + i) * 3) * this.intensity, 2.6,
        a * 0.4, { curve: 0.3, flick: false, edge: false },
      );
    }
    if (b <= 0.08) return;

    // Hackles: a fan of raised fur standing up around the back of the body, away from the aim.
    const back = this.facing + Math.PI;
    for (let i = 0; i < 9; i++) {
      const ang = back + (i - 4) * 0.28;
      const len = (14 + 10 * Math.abs(Math.sin(i * 2.1))) * b * this.intensity;
      const bx = x + Math.cos(ang) * 19, by = y + Math.sin(ang) * 19;
      const tip = ang + Math.sin(this.t * 3 + i) * 0.12;
      g.fillStyle(this.tint(HUNT.fur), 0.9 * alpha);
      g.beginPath();
      g.moveTo(bx + Math.cos(ang + 1.5) * 4, by + Math.sin(ang + 1.5) * 4);
      g.lineTo(bx + Math.cos(tip) * len, by + Math.sin(tip) * len);
      g.lineTo(bx + Math.cos(ang - 1.5) * 4, by + Math.sin(ang - 1.5) * 4);
      g.closePath();
      g.fillPath();
    }

    // Tail: four tapering segments trailing behind, each swinging a beat after the one ahead.
    let tx = x + Math.cos(back) * 20, ty = y + Math.sin(back) * 20;
    let ta = back;
    for (let i = 0; i < 4; i++) {
      ta += Math.sin(this.t * 3.6 - i * 0.7) * 0.34;
      const seg = (13 - i * 1.6) * b * this.intensity;
      const nx = tx + Math.cos(ta) * seg, ny = ty + Math.sin(ta) * seg;
      g.lineStyle((13 - i * 2.6) * b, this.tint(HUNT.fur), 0.92 * alpha);
      g.lineBetween(tx, ty, nx, ny);
      tx = nx; ty = ny;
    }
    // Bone-white tip.
    g.fillStyle(this.tint(HUNT.bone), 0.8 * alpha * b);
    g.fillCircle(tx, ty, 3.4 * b);
  }

  /**
   * Everything over the sprite: the hood he wears while he is still a man, the crossbow or
   * shotgun in his fists, the claws that replace them, and — as the beast comes out — a full
   * snarling head grown over the top of the body. Rooted so nothing ever buries the eyes.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // Ease toward the form so the change is a growth, not a pop.
    const want = this.form === 'human' ? 0 : this.form === 'hybrid' ? 0.55 : 1;
    this.beastness += (want - this.beastness) * 0.12;
    const b = this.beastness;
    const tones = this.activeTones();
    const scale = (this.mastered ? 1.22 : 1) * this.intensity;

    // ── Forearms ──
    // Two tapered limbs from the shoulders out to the fists. Without them the hands read as
    // two loose balls; with them the character has reach, and the weapon has something holding it.
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const sx = x + Math.cos(this.facing + s * 1.5) * 12;
      const sy = y + Math.sin(this.facing + s * 1.5) * 12 + 3;
      const hx = this.armX[i], hy = this.armY[i];
      g.lineStyle(7 * scale, this.tint(b > 0.4 ? HUNT.fur : tones.crust), 0.9 * alpha);
      g.lineBetween(sx, sy, hx, hy);
      g.lineStyle(3 * scale, this.tint(b > 0.4 ? HUNT.furLit : tones.body), 0.6 * alpha);
      g.lineBetween(sx, sy, hx * 0.5 + sx * 0.5, hy * 0.5 + sy * 0.5);
    }

    // ── The kit in his hands ──
    const held = this.heldWeapon();
    if (held && b < 0.9) {
      const w = this.weaponAnchor(x, y);
      const wa = alpha * (1 - b);
      if (held === 'crossbow') {
        drawCrossbow(g, this.tint, tones, w.x, w.y, this.facing, 0.9 * scale, this.load, this.recoil, wa);
      } else {
        drawShotgun(g, this.tint, tones, w.x, w.y, this.facing, 0.82 * scale, this.pump, this.recoil, this.shells, wa);
      }
      // Grip straps: the fists actually close on it rather than floating alongside.
      g.lineStyle(3.4 * scale, this.tint(tones.crust), 0.55 * wa);
      for (let i = 0; i < 2; i++) g.lineBetween(this.armX[i], this.armY[i], w.x, w.y);
    }

    // ── Claws ──
    if (b > 0.25) {
      for (let i = 0; i < 2; i++) {
        const out = Math.atan2(this.armY[i] - y, this.armX[i] - x);
        drawClaws(g, this.tint, tones, this.armX[i], this.armY[i], out, (b - 0.25) / 0.75 * scale, alpha);
      }
    }

    // ── The hood ──
    // While he is still a man: a peaked leather hood with a fur-trimmed brim, thrown back a
    // little from the aim, and a scarf pulled up over the jaw. It rots away as the beast rises.
    const hood = Math.max(0, 1 - b * 1.6);
    if (hood > 0.02) {
      const ha = alpha * hood;
      const lean = this.facing;
      const peakX = x - Math.cos(lean) * 5, peakY = y - 26 - Math.sin(lean) * 2;
      g.fillStyle(this.tint(HUNT.hide), 0.96 * ha);
      g.beginPath();
      g.moveTo(x - 21 * scale, y - 3);
      g.lineTo(x - 17 * scale, y - 18 * scale);
      g.lineTo(peakX, peakY);
      g.lineTo(x + 17 * scale, y - 18 * scale);
      g.lineTo(x + 21 * scale, y - 3);
      g.lineTo(x + 15 * scale, y - 12);
      g.lineTo(x - 15 * scale, y - 12);
      g.closePath();
      g.fillPath();
      // Fur trim: tufts hanging off the brim, stopping just short of the brow.
      for (let i = 0; i < 9; i++) {
        const f = (i / 8 - 0.5) * 2;
        const bx = x + f * 20 * scale;
        const by = y - 12 - Math.cos(f * 1.3) * 3;
        g.fillStyle(this.tint(HUNT.fur), 0.95 * ha);
        g.fillCircle(bx, by, (2.6 + Math.abs(Math.sin(i * 2.3)) * 1.6) * scale);
      }
      g.lineStyle(1.6 * scale, this.tint(tones.body), 0.5 * ha);
      g.lineBetween(x - 16 * scale, y - 16 * scale, peakX, peakY + 3);
      // Scarf across the jaw, knotted off to one side.
      g.fillStyle(this.tint(tones.crust), 0.9 * ha);
      g.fillEllipse(x + Math.cos(lean) * 2, y + 12, 30 * scale, 12 * scale);
      g.fillStyle(this.tint(tones.body), 0.55 * ha);
      g.fillEllipse(x + Math.cos(lean) * 2, y + 10.5, 24 * scale, 6 * scale);
      g.fillStyle(this.tint(tones.crust), 0.9 * ha);
      g.fillCircle(x + 15 * scale, y + 14, 4 * scale);
      // Bandolier across the chest, with brass showing in the loops.
      g.lineStyle(5 * scale, this.tint(HUNT.hide), 0.9 * ha);
      g.lineBetween(x - 16 * scale, y - 2, x + 13 * scale, y + 19);
      for (let i = 0; i < 4; i++) {
        const f = 0.15 + i * 0.22;
        const bx = x - 16 * scale + 29 * scale * f;
        const by = y - 2 + 21 * f;
        g.fillStyle(this.tint(HUNT.hull), 0.95 * ha);
        g.fillCircle(bx, by, 2.4 * scale);
        g.fillStyle(this.tint(HUNT.brass), 0.95 * ha);
        g.fillCircle(bx, by, 1.3 * scale);
      }
    }

    // ── The head ──
    // Sized off the rig's eye spacing rather than off the body or the intensity: the sockets
    // have to land on the eyes that are already there. Ears, jaw and ruff all overhang the
    // sprite, so the silhouette still grows with the beast even though the skull doesn't.
    if (b > 0.06) {
      drawWolfHead(
        g, this.tint, this.moon ? MOON_TONES : tones,
        x, y, this.facing, 19.5 * (0.62 + 0.38 * b), this.jawOpen() * b, alpha * Math.min(1, b * 1.7),
        { mane: b, drop: 0.03 },
      );
      // Eyeshine burning through the open sockets, on top of the rig's own eyes.
      // `a` carries the rig's breathing pulse, so the eyes flare and settle with the body.
      const glow = this.moon ? HUNT.moon : tones.lit;
      for (const s of [-1, 1]) {
        g.fillStyle(this.tint(glow), 0.4 * a * b);
        g.fillCircle(x + s * 7.2 + Math.cos(this.facing) * 2.4, y - 4 + Math.sin(this.facing) * 2, 4.6 * b);
      }
    }

    // ── Mastery ──
    if (this.mastered) {
      // Trophy fangs strung overhead, swinging on their own beat.
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.1 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 26;
        const cy = y - 34 + Math.sin(p) * 7;
        g.fillStyle(this.tint(HUNT.bone), 0.95 * alpha);
        huntGash(g, cx, cy, p + Math.PI / 2, 12, 3, 0.4, 0);
        g.fillStyle(this.tint(tones.body), 0.55 * alpha);
        g.fillCircle(cx, cy, 1.6);
      }
      // A skull he took, hanging off the belt and swinging with his stride.
      const sway = Math.sin(this.t * 2.3) * 0.22;
      const kx = x - Math.cos(this.facing) * 16 + Math.sin(sway) * 8;
      const ky = y + 18 + Math.cos(sway) * 4;
      g.lineStyle(1.4, this.tint(HUNT.hide), 0.8 * alpha);
      g.lineBetween(x - Math.cos(this.facing) * 14, y + 6, kx, ky - 6);
      drawWolfHead(
        g, this.tint, { ...tones, crust: HUNT.bone, body: 0xd8c9a8, wound: HUNT.hide, lit: HUNT.rust, spark: HUNT.white },
        kx, ky, Math.PI / 2, 9, 0.25, 0.9 * alpha, { mane: 0, solid: true, eyes: false },
      );
    }
  }
}
