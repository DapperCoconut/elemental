import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Depths draws.
 *
 * The element is a stretch of water with things living in it, so almost nothing here is a
 * shape on its own — every primitive is a *body*: a spine with a taper, a tail that swishes
 * off its own phase, fins that catch the light on one side only. The one silhouette that
 * matters more than the rest is the fish, because five of Depths' abilities are literally
 * "which fish was it", and a player has to be able to tell an icefish from a bomb fish while
 * it is crossing the arena at 600 px/s. That is why `fishBody` takes a profile rather than a
 * colour: the barracuda is long and thin, the pufferfish is a ball, and the reads never
 * depend on hue alone.
 *
 * The other rule: light in the deep comes from the things in it, never from above. Every
 * body is filled dark and lit along its top edge only.
 */

export type DepthsColorFn = ColorFn;

export const DPT = {
  /** The water itself, darkest first. */
  abyss: 0x04141d,
  deep: 0x0a2b3a,
  trench: 0x11455a,
  /** The element colour. */
  teal: 0x0e8f9c,
  cyan: 0x3fd8e8,
  foam: 0xd8f6ff,
  /** Eutrophication — the algae bloom, and the lure that imitates it. */
  algae: 0x7ac64b,
  algaeDeep: 0x35701f,
  lure: 0xc8ffa4,
  /** Piranha. */
  blood: 0xc4243a,
  scale: 0x9fb4b8,
  /** The five fish. */
  ice: 0x9fe8ff,
  barracuda: 0xd2dccd,
  puffer: 0xe8c85a,
  bomb: 0xff6a3d,
  gulper: 0x7b52a8,
  /** The five rare fish, landed only on a baited line. */
  saw: 0xb9c9c4,
  sword: 0x6d8fe0,
  whale: 0x3f7a8c,
  flyer: 0x6fe3ff,
  cat: 0x9a7444,
  /**
   * Algae Trap's poisoned bloom. Only ever painted on the caster's own screen — everybody
   * else is shown `algae`, which is the entire ability.
   */
  rot: 0xd4344a,
  rotDeep: 0x5e0f1c,
  rotLure: 0xffb0b0,
  /** Megalodon. */
  shark: 0x4a6672,
  sharkDark: 0x1d2f38,
  bone: 0xf2f7f2,
};

/**
 * Which fish is on the end of the line. Every one of these throws differently.
 *
 * The first five are the ordinary catch. The last five only come up on a baited line
 * (the F upgrade), and each one is a whole ability rather than a variation on "a fish
 * flies at them" — which is why the silhouettes below diverge as hard as they do.
 */
export type FishKind =
  | 'icefish' | 'barracuda' | 'pufferfish' | 'bombfish' | 'gulper'
  | 'sawfish' | 'swordfish' | 'whaleshark' | 'flyingfish' | 'catfish';

export const FISH_LABEL: Record<FishKind, string> = {
  icefish: 'ICEFISH',
  barracuda: 'BARRACUDA',
  pufferfish: 'PUFFERFISH',
  bombfish: 'BOMB FISH',
  gulper: 'GULPER EEL',
  sawfish: 'SAW FISH',
  swordfish: 'SWORD FISH',
  whaleshark: 'WHALE SHARK',
  flyingfish: 'FLYING FISH',
  catfish: 'CATFISH',
};

export const FISH_EMOJI: Record<FishKind, string> = {
  icefish: '🧊', barracuda: '🗡️', pufferfish: '🐡', bombfish: '💣', gulper: '🐍',
  sawfish: '🔪', swordfish: '⚔️', whaleshark: '🐋', flyingfish: '🐬', catfish: '🐈',
};

export const FISH_COLOR: Record<FishKind, number> = {
  icefish: DPT.ice,
  barracuda: DPT.barracuda,
  pufferfish: DPT.puffer,
  bombfish: DPT.bomb,
  gulper: DPT.gulper,
  sawfish: DPT.saw,
  swordfish: DPT.sword,
  whaleshark: DPT.whale,
  flyingfish: DPT.flyer,
  catfish: DPT.cat,
};

/** How each fish is built. One table so a thrown fish and a held fish never disagree. */
export interface FishProfile {
  /** Body height as a fraction of length. A barracuda is 0.34; a pufferfish is 1.5. */
  depth: number;
  /** Tail fin size, again relative to length. Eels barely have one. */
  tail: number;
  teeth: boolean;
  /** Spines around the whole body — the pufferfish, and nothing else. */
  spines?: boolean;
  /** A lit stripe down the flank. */
  stripe?: boolean;
  /** The bomb fish's fuse. */
  fuse?: boolean;
  /** The saw fish's toothed rostrum, sticking out past the nose. */
  saw?: boolean;
  /** The sword fish's bill — the same idea, ground to a single point. */
  bill?: boolean;
  /** Pale constellations across the flank. The whale shark, and nothing else. */
  spots?: boolean;
  /** Oversized pectorals held out like a glider's. */
  wings?: boolean;
  /** Barbels trailing off the snout. */
  whiskers?: boolean;
}

export const FISH_PROFILE: Record<FishKind, FishProfile> = {
  icefish: { depth: 0.5, tail: 0.3, teeth: false, stripe: true },
  barracuda: { depth: 0.32, tail: 0.26, teeth: true, stripe: true },
  pufferfish: { depth: 1.35, tail: 0.2, teeth: false, spines: true },
  bombfish: { depth: 0.95, tail: 0.24, teeth: false, fuse: true },
  gulper: { depth: 0.42, tail: 0.14, teeth: true },
  sawfish: { depth: 0.36, tail: 0.24, teeth: false, saw: true, stripe: true },
  swordfish: { depth: 0.34, tail: 0.32, teeth: false, bill: true, stripe: true },
  whaleshark: { depth: 0.46, tail: 0.28, teeth: false, spots: true },
  flyingfish: { depth: 0.4, tail: 0.3, teeth: false, wings: true, stripe: true },
  catfish: { depth: 0.62, tail: 0.22, teeth: false, whiskers: true },
};

/** The whale shark's remoras: too small for a profile of their own to read, so they share one. */
export const REMORA_PROFILE: FishProfile = { depth: 0.44, tail: 0.3, teeth: false, stripe: true };

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so anything that has to wobble the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 57.7 + i * 311.3) * 28643.129;
  return v - Math.floor(v);
}

/** Local (along-spine, across-spine) → world, for a body rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/**
 * A fish, nose-first along `ang`.
 *
 * Built from a spine rather than an ellipse so the profile actually changes the silhouette:
 * the outline walks the top edge from nose to tail and comes back along the belly, and every
 * fin, tooth and spine is hung off the same two axes. `wiggle` is a free-running phase — the
 * tail swishes and the body bends with it, which is the only thing that separates a fish from
 * a dart at a distance.
 */
export function fishBody(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, ang: number,
  len: number,
  color: number,
  alpha: number,
  profile: FishProfile,
  wiggle = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const h = len * profile.depth * 0.5;
  const swish = Math.sin(wiggle) * len * 0.09;
  const bend = Math.sin(wiggle - 0.8) * len * 0.04;
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // The spine's own curve, sampled the same way on both edges so the body bends as one.
  const curve = (u: number): number => bend * (0.5 - u / len);

  const top: Array<[number, number]> = [
    [0.50, 0.00], [0.34, -0.62], [0.10, -0.98], [-0.14, -0.86], [-0.34, -0.52], [-0.44, -0.26],
  ];
  const pts: Phaser.Geom.Point[] = [];
  for (const [u, v] of top) pts.push(P(u * len, v * h + curve(u * len)));
  // Tail root, then the fin's two lobes, then back to the root on the underside.
  pts.push(P(-0.44 * len, 0.26 * h + curve(-0.44 * len)));
  for (let i = top.length - 1; i >= 1; i--) {
    const [u, v] = top[i];
    pts.push(P(u * len, -v * h + curve(u * len)));
  }

  // Belly shadow first, offset down — a body lit only along its back.
  g.fillStyle(tint(DPT.abyss), alpha * 0.6);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x - sa * -2.2, p.y + ca * 2.2)), true);

  g.fillStyle(tint(color), alpha * 0.92);
  g.fillPoints(pts, true);
  g.lineStyle(1.3, tint(DPT.foam), alpha * 0.5);
  // Only the top edge gets the highlight.
  for (let i = 1; i < top.length; i++) {
    const a = P(top[i - 1][0] * len, top[i - 1][1] * h + curve(top[i - 1][0] * len));
    const b = P(top[i][0] * len, top[i][1] * h + curve(top[i][0] * len));
    g.lineBetween(a.x, a.y, b.x, b.y);
  }

  // Tail fin — the swish lives here, so it always trails the body's own bend.
  const root = P(-0.44 * len, curve(-0.44 * len));
  const tl = len * profile.tail;
  const up = P(-0.44 * len - tl, -tl * 1.15 + swish);
  const dn = P(-0.44 * len - tl * 0.85, tl * 1.05 + swish);
  const mid = P(-0.44 * len - tl * 0.4, swish * 0.5);
  g.fillStyle(tint(color), alpha * 0.8);
  g.fillPoints([root, up, mid], true);
  g.fillPoints([root, dn, mid], true);
  g.lineStyle(1.1, tint(DPT.foam), alpha * 0.35);
  g.lineBetween(root.x, root.y, up.x, up.y);
  g.lineBetween(root.x, root.y, dn.x, dn.y);

  // Dorsal + pectoral.
  const dA = P(0.06 * len, -0.95 * h);
  const dB = P(-0.14 * len, -0.86 * h);
  const dC = P(-0.04 * len, -1.7 * h);
  g.fillStyle(tint(color), alpha * 0.7);
  g.fillPoints([dA, dB, dC], true);
  const fA = P(0.16 * len, 0.5 * h);
  const fB = P(0.02 * len, 0.55 * h);
  const fC = P(0.04 * len, 1.25 * h + Math.sin(wiggle * 1.7) * 2);
  g.fillStyle(tint(DPT.abyss), alpha * 0.75);
  g.fillPoints([fA, fB, fC], true);

  if (profile.stripe) {
    const s0 = P(0.34 * len, -0.18 * h);
    const s1 = P(-0.36 * len, -0.1 * h);
    g.lineStyle(Math.max(1.2, h * 0.22), tint(DPT.foam), alpha * 0.22);
    g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  }

  if (profile.spines) {
    // A pufferfish reads as a ball of needles or it reads as nothing.
    g.lineStyle(1.6, tint(DPT.foam), alpha * 0.75);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + wiggle * 0.2;
      const r0 = len * 0.42;
      const r1 = r0 + len * (0.16 + 0.05 * Math.sin(wiggle * 3 + i));
      g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0,
        x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
  }

  if (profile.teeth) {
    g.fillStyle(tint(DPT.bone), alpha * 0.95);
    for (let i = 0; i < 5; i++) {
      const u = (0.46 - i * 0.075) * len;
      const t0 = P(u, 0.14 * h);
      const t1 = P(u - len * 0.035, 0.14 * h);
      const t2 = P(u - len * 0.017, 0.44 * h);
      g.fillPoints([t0, t1, t2], true);
    }
  }

  if (profile.saw) {
    // A rostrum half again as long as the head, with teeth down both edges. It is the whole
    // read on this fish — everything else about a saw fish is a plain grey body.
    const r0 = P(0.5 * len, curve(0.5 * len));
    const r1 = P(0.98 * len, 0);
    g.lineStyle(Math.max(2.4, h * 0.34), tint(DPT.bone), alpha * 0.9);
    g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    g.lineStyle(1, tint(DPT.abyss), alpha * 0.5);
    g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    for (let i = 0; i < 7; i++) {
      const u = (0.56 + i * 0.06) * len;
      for (const side of [-1, 1]) {
        const a = P(u, side * h * 0.08);
        const b = P(u + len * 0.022, side * h * 0.5);
        g.lineStyle(1.7, tint(DPT.bone), alpha * 0.95);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  if (profile.bill) {
    // One spike, tapered to nothing. Long enough that the fish arrives point-first.
    const b0 = P(0.46 * len, -h * 0.16);
    const b1 = P(0.46 * len, h * 0.16);
    const b2 = P(1.1 * len, 0);
    g.fillStyle(tint(DPT.abyss), alpha * 0.5);
    g.fillPoints([new Phaser.Geom.Point(b0.x, b0.y + 2), new Phaser.Geom.Point(b1.x, b1.y + 2),
      new Phaser.Geom.Point(b2.x, b2.y + 2)], true);
    g.fillStyle(tint(DPT.bone), alpha * 0.95);
    g.fillPoints([b0, b1, b2], true);
    g.lineStyle(1.2, tint(DPT.foam), alpha * 0.7);
    g.lineBetween(b0.x, b0.y, b2.x, b2.y);
  }

  if (profile.spots) {
    // Two staggered rows of pale checks — the one marking everybody recognises on sight.
    g.fillStyle(tint(DPT.foam), alpha * 0.5);
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 10);
      const u = (0.38 - (i % 10) * 0.085) * len;
      const v = (row === 0 ? -1 : 1) * h * (0.24 + jitter(11, i) * 0.42);
      const s = P(u, v + curve(u));
      g.fillCircle(s.x, s.y, Math.max(1.3, len * 0.024));
    }
    // A vast, permanently open mouth. It is a filter feeder — it never closes.
    const m0 = P(0.5 * len, -h * 0.18);
    const m1 = P(0.34 * len, -h * 0.5);
    const m2 = P(0.34 * len, h * 0.5);
    const m3 = P(0.5 * len, h * 0.18);
    g.fillStyle(tint(DPT.abyss), alpha * 0.9);
    g.fillPoints([m0, m1, m2, m3], true);
    g.lineStyle(1.4, tint(DPT.foam), alpha * 0.4);
    for (let i = 0; i < 4; i++) {
      const u = (0.44 - i * 0.03) * len;
      g.lineBetween(P(u, -h * 0.42).x, P(u, -h * 0.42).y, P(u, h * 0.42).x, P(u, h * 0.42).y);
    }
  }

  if (profile.wings) {
    // Pectorals held out stiff and translucent, beating on their own slower phase. A flying
    // fish that folded them would just be an icefish.
    const beat = Math.sin(wiggle * 0.8) * 0.25;
    for (const side of [-1, 1]) {
      const w0 = P(0.2 * len, side * h * 0.3);
      const w1 = P(-0.24 * len, side * h * 0.45);
      const w2 = P(-0.02 * len, side * h * (2.6 + beat));
      g.fillStyle(tint(color), alpha * 0.45);
      g.fillPoints([w0, w1, w2], true);
      g.lineStyle(1.1, tint(DPT.foam), alpha * 0.55);
      g.lineBetween(w0.x, w0.y, w2.x, w2.y);
      g.lineBetween(w1.x, w1.y, w2.x, w2.y);
      // Two ribs, so the fin reads as a wing rather than a smear.
      const rib = P(-0.12 * len, side * h * (1.4 + beat * 0.5));
      g.lineStyle(0.9, tint(DPT.foam), alpha * 0.3);
      g.lineBetween(w0.x, w0.y, rib.x, rib.y);
    }
  }

  if (profile.whiskers) {
    // Four barbels dragging off the snout, each drawn as three segments so they hang.
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const spread = 0.45 + (i % 2) * 0.4;
      const root = P(0.44 * len, side * h * 0.24);
      let px = root.x;
      let py = root.y;
      g.lineStyle(1.5, tint(DPT.abyss), alpha * 0.85);
      for (let j = 1; j <= 3; j++) {
        const a = ang + side * spread + Math.sin(wiggle * 0.9 + i * 1.7 + j) * 0.22;
        const d = len * 0.17 * j;
        const cx = root.x + Math.cos(a) * d;
        const cy = root.y + Math.sin(a) * d;
        g.lineBetween(px, py, cx, cy);
        px = cx;
        py = cy;
      }
    }
  }

  if (profile.fuse) {
    // A lit fuse curling off the back, sparking at the tip.
    const f0 = P(-0.1 * len, -1.0 * h);
    const f1 = P(-0.3 * len, -1.9 * h + Math.sin(wiggle * 4) * 3);
    const f2 = P(-0.12 * len, -2.5 * h + Math.cos(wiggle * 3) * 3);
    g.lineStyle(2, tint(DPT.abyss), alpha * 0.9);
    g.lineBetween(f0.x, f0.y, f1.x, f1.y);
    g.lineBetween(f1.x, f1.y, f2.x, f2.y);
    g.fillStyle(tint(DPT.foam), alpha);
    g.fillCircle(f2.x, f2.y, 2.4 + Math.abs(Math.sin(wiggle * 8)) * 1.6);
    g.fillStyle(tint(DPT.bomb), alpha * 0.5);
    g.fillCircle(f2.x, f2.y, 5.5 + Math.abs(Math.sin(wiggle * 8)) * 3);
  }

  // Eye last, so nothing paints over it.
  const eye = P(0.33 * len, -0.28 * h);
  g.fillStyle(tint(DPT.foam), alpha * 0.95);
  g.fillCircle(eye.x, eye.y, Math.max(1.4, len * 0.055));
  g.fillStyle(tint(DPT.abyss), alpha);
  g.fillCircle(eye.x + ca * 0.8, eye.y + sa * 0.8, Math.max(0.8, len * 0.028));
}

/**
 * A piranha: small, silver, and drawn nose-down onto whatever it is chewing. Its own little
 * body rather than a scaled `fishBody`, because at this size the fins would be one pixel and
 * the only thing that has to read is *jaw*.
 */
export function piranha(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, ang: number, size: number, alpha: number, chew: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const gape = 0.5 + 0.5 * Math.sin(chew);

  const body = [
    P(size, 0), P(size * 0.35, -size * 0.62), P(-size * 0.3, -size * 0.55),
    P(-size * 0.75, -size * 0.2), P(-size * 0.75, size * 0.2), P(-size * 0.3, size * 0.55),
    P(size * 0.35, size * 0.62),
  ];
  g.fillStyle(tint(DPT.abyss), alpha * 0.7);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y + 1.8)), true);
  g.fillStyle(tint(DPT.scale), alpha * 0.95);
  g.fillPoints(body, true);
  // Red belly — the one thing everyone knows about a piranha.
  g.fillStyle(tint(DPT.blood), alpha * 0.8);
  g.fillPoints([P(size * 0.35, size * 0.62), P(-size * 0.3, size * 0.55),
    P(-size * 0.3, size * 0.2), P(size * 0.3, size * 0.24)], true);

  // The jaw, hinged open on the chew phase.
  g.fillStyle(tint(DPT.abyss), alpha);
  g.fillPoints([P(size, 0), P(size * 0.2, size * 0.1),
    P(size * 0.35, size * (0.2 + gape * 0.55))], true);
  g.fillStyle(tint(DPT.bone), alpha);
  for (let i = 0; i < 3; i++) {
    const u = size * (0.9 - i * 0.22);
    g.fillPoints([P(u, size * 0.02), P(u - size * 0.1, size * 0.02),
      P(u - size * 0.05, size * (0.22 + gape * 0.3))], true);
  }
  g.fillStyle(tint(DPT.foam), alpha);
  g.fillCircle(P(size * 0.45, -size * 0.22).x, P(size * 0.45, -size * 0.22).y, size * 0.16);
}

/**
 * A healing algae orb: a bead of light with fronds of weed streaming off it. Drawn the same
 * way whether it is real (Eutrophication) or a lie (the anglerfish lure) — which is the whole
 * point of the passive, so the two must not be told apart by their art.
 *
 * `poison` swaps the palette to red for Algae Trap. Only the shape survives the swap, and
 * deliberately so: the caller decides *whose screen* gets the red, and everybody else is
 * shown a heal.
 */
export function algaeOrb(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, r: number, t: number, alpha: number, seed = 0, poison = false,
): void {
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.6 + seed);
  const bright = poison ? DPT.rot : DPT.algae;
  const dark = poison ? DPT.rotDeep : DPT.algaeDeep;
  const lit = poison ? DPT.rotLure : DPT.lure;

  g.fillStyle(tint(bright), alpha * 0.13);
  g.fillCircle(x, y, r * 2.6 * pulse);
  g.fillStyle(tint(bright), alpha * 0.2);
  g.fillCircle(x, y, r * 1.7 * pulse);

  // Fronds: five weeds swaying on their own phases, rooted at the bead.
  g.lineStyle(2, tint(dark), alpha * 0.85);
  for (let i = 0; i < 5; i++) {
    const base = (i / 5) * TAU + seed;
    let px = x;
    let py = y;
    for (let s = 1; s <= 4; s++) {
      const a = base + Math.sin(t * 1.6 + i * 1.3 + s * 0.5) * 0.5;
      const d = r * 0.75 * s;
      const cx = x + Math.cos(a) * d;
      const cy = y + Math.sin(a) * d * 0.85;
      g.lineBetween(px, py, cx, cy);
      px = cx;
      py = cy;
    }
    g.fillStyle(tint(bright), alpha * 0.7);
    g.fillCircle(px, py, 1.8);
  }

  g.fillStyle(tint(dark), alpha * 0.95);
  g.fillCircle(x, y, r * pulse);
  g.fillStyle(tint(bright), alpha);
  g.fillCircle(x, y, r * 0.68 * pulse);
  g.fillStyle(tint(lit), alpha);
  g.fillCircle(x - r * 0.22, y - r * 0.24, r * 0.3 * pulse);
}

/**
 * The dark puddle a Lungfish Strike leaves: not a stain on the floor but a hole in it, with a
 * rim of displaced water and a slow churn inside. Somebody drowning has to be able to see it
 * from the far corner of the arena, so the rim is bright and the interior is nearly black.
 */
export function darkPuddle(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, r: number, t: number, alpha: number, seed = 0,
): void {
  const lobes = 22;
  const rim: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU;
    const rr = r * (1 + Math.sin(t * 1.4 + i * 1.7 + seed) * 0.06 + (jitter(seed, i) - 0.5) * 0.1);
    rim.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62));
  }
  g.fillStyle(tint(DPT.abyss), alpha * 0.95);
  g.fillPoints(rim, true);
  g.lineStyle(3, tint(DPT.cyan), alpha * 0.8);
  g.strokePoints(rim, true, true);
  g.lineStyle(1.4, tint(DPT.foam), alpha * 0.5);
  g.strokePoints(rim.map((p) => new Phaser.Geom.Point(
    x + (p.x - x) * 0.82, y + (p.y - y) * 0.82)), true, true);

  // Air coming up out of it — the read that this is where the breathing happens.
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.55 + i / 6) % 1;
    const a = seed + i * 1.9;
    const bx = x + Math.cos(a) * r * 0.5;
    const by = y + Math.sin(a) * r * 0.3 - ph * r * 0.9;
    g.fillStyle(tint(DPT.foam), alpha * (1 - ph) * 0.6);
    g.fillCircle(bx, by, 1.6 + ph * 2.6);
  }
}

/** A run of bubbles rising from a point — used raw by the Fx and by the avatar's gills. */
export function bubbleColumn(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, t: number, count: number, spread: number, rise: number, alpha: number,
  seed = 0,
): void {
  for (let i = 0; i < count; i++) {
    const ph = (t * 0.7 + jitter(seed, i)) % 1;
    const bx = x + Math.sin(t * 2 + i * 2.3) * spread * (0.3 + ph);
    const by = y - ph * rise;
    g.lineStyle(1.2, tint(DPT.foam), alpha * (1 - ph) * 0.7);
    g.strokeCircle(bx, by, 1.4 + jitter(seed, 40 + i) * 3 * (0.5 + ph));
  }
}

/**
 * The oxygen bar over a drowning fighter. Deliberately not the shared HealthBar: it has to sit
 * *above* the health bar, empty right-to-left, and go red-and-shaking in its last second, none
 * of which the shared bar does.
 */
export function oxygenBar(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, w: number, ratio: number, t: number, alpha: number,
): void {
  const h = 6;
  const panic = ratio <= 0.2;
  const shake = panic ? Math.sin(t * 40) * 1.4 : 0;
  const bx = x - w / 2 + shake;

  g.fillStyle(tint(DPT.abyss), alpha * 0.85);
  g.fillRoundedRect(bx - 2, y - 2, w + 4, h + 4, 3);
  g.fillStyle(tint(DPT.deep), alpha * 0.9);
  g.fillRect(bx, y, w, h);

  const fillCol = ratio > 0.5 ? DPT.cyan : ratio > 0.2 ? DPT.teal : DPT.blood;
  g.fillStyle(tint(fillCol), alpha);
  g.fillRect(bx, y, w * Phaser.Math.Clamp(ratio, 0, 1), h);
  g.fillStyle(tint(DPT.foam), alpha * 0.45);
  g.fillRect(bx, y, w * Phaser.Math.Clamp(ratio, 0, 1), 1.6);

  g.lineStyle(1.2, tint(DPT.foam), alpha * 0.7);
  g.strokeRect(bx, y, w, h);

  // A bubble marker on the left cap, so the bar is never confused for a health bar.
  g.fillStyle(tint(ratio <= 0 ? DPT.blood : DPT.foam), alpha * 0.9);
  g.strokeCircle(bx - 7, y + h / 2, 3.2);
  g.fillCircle(bx - 8.2, y + h / 2 - 1.1, 1.1);
}

/**
 * The Megalodon. A silhouette with three jobs: be enormous, be obviously a shark, and make
 * the jaw the part your eye lands on — everything it does is about what is inside its mouth.
 */
export function sharkBody(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, ang: number, len: number, alpha: number, gape: number, t: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const h = len * 0.17;
  const swish = Math.sin(t * 7) * len * 0.05;
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const top: Array<[number, number]> = [
    [0.50, -0.10], [0.40, -0.55], [0.18, -0.92], [-0.10, -1.00], [-0.34, -0.72], [-0.46, -0.36],
  ];
  const outline: Phaser.Geom.Point[] = [];
  for (const [u, v] of top) outline.push(P(u * len, v * h));
  outline.push(P(-0.46 * len, 0.36 * h));
  for (let i = top.length - 1; i >= 0; i--) outline.push(P(top[i][0] * len, -top[i][1] * h));

  // Cast shadow under it — a body this size that doesn't sit *in* the water floats on it.
  g.fillStyle(tint(DPT.abyss), alpha * 0.45);
  g.fillPoints(outline.map((p) => new Phaser.Geom.Point(p.x, p.y + h * 0.5)), true);

  g.fillStyle(tint(DPT.shark), alpha * 0.96);
  g.fillPoints(outline, true);
  // Counter-shaded belly: pale underneath, dark on top.
  g.fillStyle(tint(DPT.sharkDark), alpha * 0.7);
  g.fillPoints([...top.map(([u, v]) => P(u * len, v * h)), P(-0.46 * len, 0), P(0.5 * len, 0)], true);
  g.fillStyle(tint(DPT.foam), alpha * 0.16);
  g.fillPoints([P(0.42 * len, 0.3 * h), P(-0.2 * len, 0.9 * h), P(-0.4 * len, 0.3 * h)], true);

  // Dorsal fin, pectorals, caudal.
  g.fillStyle(tint(DPT.sharkDark), alpha * 0.95);
  g.fillPoints([P(0.06 * len, -0.98 * h), P(-0.2 * len, -0.85 * h), P(-0.06 * len, -2.5 * h)], true);
  g.fillPoints([P(0.16 * len, 0.75 * h), P(-0.02 * len, 0.7 * h), P(-0.06 * len, 2.0 * h)], true);
  g.fillPoints([P(0.1 * len, -0.9 * h), P(0.0 * len, -0.85 * h), P(0.06 * len, -1.5 * h)], true);
  const root = P(-0.46 * len, 0);
  g.fillPoints([root, P(-0.5 * len - len * 0.1, -1.9 * h + swish), P(-0.62 * len, swish * 0.5)], true);
  g.fillPoints([root, P(-0.5 * len - len * 0.06, 1.4 * h + swish), P(-0.62 * len, swish * 0.5)], true);

  // Gill slits.
  g.lineStyle(1.6, tint(DPT.abyss), alpha * 0.8);
  for (let i = 0; i < 5; i++) {
    const u = (0.26 - i * 0.05) * len;
    g.lineBetween(P(u, -0.55 * h).x, P(u, -0.55 * h).y, P(u - len * 0.02, 0.5 * h).x, P(u - len * 0.02, 0.5 * h).y);
  }

  // The jaw. Hinged open by `gape`, with a black throat behind the teeth.
  const jawDrop = 0.35 + gape * 1.15;
  const jaw = [P(0.5 * len, -0.1 * h), P(0.2 * len, 0.2 * h), P(0.3 * len, jawDrop * h),
    P(0.52 * len, jawDrop * h * 0.7)];
  g.fillStyle(tint(DPT.abyss), alpha);
  g.fillPoints(jaw, true);
  g.fillStyle(tint(DPT.blood), alpha * 0.5);
  g.fillPoints([P(0.34 * len, 0.24 * h), P(0.24 * len, jawDrop * h * 0.8), P(0.42 * len, jawDrop * h * 0.75)], true);

  g.fillStyle(tint(DPT.bone), alpha);
  for (let i = 0; i < 7; i++) {
    const u = (0.48 - i * 0.045) * len;
    // Upper row hangs down, lower row points up — the classic double row.
    g.fillPoints([P(u, -0.06 * h), P(u - len * 0.028, -0.06 * h), P(u - len * 0.014, 0.28 * h)], true);
    g.fillPoints([P(u - len * 0.01, jawDrop * h * 0.92), P(u - len * 0.038, jawDrop * h * 0.92),
      P(u - len * 0.024, jawDrop * h * 0.58)], true);
  }

  // Eye: small, black, and set well back — a shark's eye is not where you expect it.
  const eye = P(0.33 * len, -0.5 * h);
  g.fillStyle(tint(DPT.foam), alpha * 0.5);
  g.fillCircle(eye.x, eye.y, len * 0.022);
  g.fillStyle(tint(DPT.abyss), alpha);
  g.fillCircle(eye.x, eye.y, len * 0.016);
}

/** The lure's stalk: the illicium arcing over the crown with the esca on the end. */
export function illicium(
  g: Phaser.GameObjects.Graphics,
  tint: DepthsColorFn,
  x: number, y: number, reach: number, t: number, alpha: number,
): { x: number; y: number } {
  const sway = Math.sin(t * 1.7) * 0.22;
  const segs = 7;
  let px = x;
  let py = y;
  let ex = x;
  let ey = y;
  g.lineStyle(2.4, tint(DPT.deep), alpha * 0.95);
  for (let i = 1; i <= segs; i++) {
    const s = i / segs;
    // An arc that leans forward as it rises, so the bulb dangles in front of the face.
    const a = -Math.PI / 2 + sway + s * (1.15 + Math.sin(t * 2.1) * 0.1);
    const d = reach * s;
    const cx = x + Math.cos(a) * d * 0.85;
    const cy = y + Math.sin(a) * d;
    g.lineBetween(px, py, cx, cy);
    px = cx;
    py = cy;
    ex = cx;
    ey = cy;
  }
  return { x: ex, y: ey };
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class DepthsFx extends FxBase {
  /** Bubbles bursting off a point and rising. The element's default "something happened". */
  bubbles(x: number, y: number, count = 8, spread = 26, color = DPT.foam, ms = 620, depth = 9): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.3 + Math.random() * 0.7),
      r: 1.6 + Math.random() * 3.4,
      s: i * 13.7 + Math.random() * 50,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e - e * 22;
        g.lineStyle(1.4, this.tint(color), (1 - t) * 0.8);
        g.strokeCircle(px, py, p.r * (0.6 + e * 0.8));
        g.fillStyle(this.tint(color), (1 - t) * 0.35);
        g.fillCircle(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.32);
      }
    });
  }

  /** A bite: two arcs of teeth meeting, and blood in the water. */
  chomp(x: number, y: number, ang: number, size = 26, color = DPT.blood, depth = 10): void {
    this.anim(depth, 300, (g, t) => {
      const close = easeIn(t);
      const gape = (1 - close) * 0.9 + 0.05;
      for (const side of [-1, 1]) {
        const base = ang + side * gape;
        g.lineStyle(3, this.tint(DPT.bone), (1 - t) * 0.95);
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = base + (i / 6 - 0.5) * 1.5 * side;
          const r = size * (i % 2 === 0 ? 1 : 0.82);
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.fillStyle(this.tint(color), (1 - t) * 0.4);
      g.fillCircle(x, y, size * (0.3 + close * 0.7));
    });
    this.bubbles(x, y, 5, size, DPT.foam, 420, depth);
  }

  /** A slash through water — the Lungfish Strike's own arc, with the wake it leaves. */
  slashArc(x: number, y: number, ang: number, reach: number, color = DPT.cyan, depth = 10): void {
    this.anim(depth, 320, (g, t) => {
      const sweep = 1.9;
      const a0 = ang - sweep / 2;
      const spanEnd = Phaser.Math.Clamp(t * 1.7, 0, 1);
      for (const [w, c, al] of [[7, DPT.foam, 0.35], [3.4, color, 0.95]] as [number, number, number][]) {
        g.lineStyle(w * (1 - t * 0.6), this.tint(c), (1 - t) * al);
        g.beginPath();
        for (let i = 0; i <= 18; i++) {
          const s = (i / 18) * spanEnd;
          const a = a0 + s * sweep;
          const r = reach * (0.55 + 0.45 * Math.sin(s * Math.PI));
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    });
    this.bubbles(x + Math.cos(ang) * reach * 0.6, y + Math.sin(ang) * reach * 0.6, 7, 30, DPT.foam, 500, depth);
  }

  /** An expanding ring of displaced water. Casts, expiries, spits. */
  ring(x: number, y: number, r0: number, r1: number, color = DPT.cyan, ms = 460, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const steps = 24;
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.09);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72));
      }
      g.lineStyle(3 * (1 - t) + 0.8, this.tint(color), (1 - t) * 0.8);
      g.strokePoints(pts, false, false);
      g.lineStyle(1.2, this.tint(DPT.foam), (1 - t) * 0.5);
      g.strokePoints(pts.map((p) => new Phaser.Geom.Point(
        x + (p.x - x) * 0.86, y + (p.y - y) * 0.86)), false, false);
    });
  }

  /** Something surfaced. A splash crown thrown up out of the point. */
  splash(x: number, y: number, size = 30, color = DPT.cyan, depth = 10): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, size * 0.5, DPT.foam, color, depth);
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (jitter(seed, i) - 0.5) * 2.6;
        const d = size * (0.5 + jitter(seed, 20 + i)) * e;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + e * e * size * 0.5;
        g.fillStyle(this.tint(i % 3 === 0 ? DPT.foam : color), (1 - t) * 0.85);
        g.fillCircle(px, py, 3.4 * (1 - t * 0.6));
      }
    });
  }

  /** A detonation underwater: the shock ring plus the cavity that collapses after it. */
  blast(x: number, y: number, r: number, color = DPT.bomb, depth = 11): void {
    this.flashIn(x, y, r * 0.5, DPT.foam, color, depth);
    this.anim(depth, 560, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(color), (1 - t) * 0.35);
      g.fillCircle(x, y, r * e);
      g.lineStyle(4 * (1 - t) + 1, this.tint(DPT.foam), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(2, this.tint(color), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * e * 0.62);
    });
    this.bubbles(x, y, 12, r * 0.8, DPT.foam, 700, depth);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const DEPTHS_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: DPT.teal, alpha: 0.22 },
    { r: 7, color: DPT.trench, alpha: 0.95 },
    { r: 2.6, color: DPT.cyan, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: DPT.foam,
  eyePupil: DPT.abyss,
  squash: { div: 13, x: 0.5, y: 0.3 },
};

/**
 * The angler: a thing from the bottom of the water with a light on its head and too many
 * teeth. Its two tells are both permanent — the illicium arcing over the crown with the esca
 * glowing on the end, and a row of gill slits venting bubbles down its flank.
 *
 * Two states change the silhouette. While the passive is fading the body out, the esca is the
 * *only* thing that stays lit, which is what sells the lie to whoever comes to eat it. And a
 * caught fish is held crosswise in the jaw, which is the player's one readout of which of the
 * five they are about to throw.
 */
export class DepthsAvatar extends BaseAvatar {
  /** 0–1 — how far the passive has faded the body out. The esca ignores this. */
  private hidden = 0;
  /** The fish currently clamped in the jaw, if any. */
  private fish: FishKind | null = null;
  /** 0–1 fishing progress, drawn as a taut line running off the illicium. */
  private fishing = 0;
  private seed = Math.random() * 999;
  /** The alpha handed in before the fade — what the esca is drawn at, whatever the body does. */
  private baseAlpha = 1;

  constructor(scene: Phaser.Scene, tint: DepthsColorFn, depth = 6) {
    super(scene, tint, depth, DEPTHS_AVATAR);
  }

  setHidden(v: number): void { this.hidden = Phaser.Math.Clamp(v, 0, 1); }
  setFish(kind: FishKind | null): void { this.fish = kind; }
  setFishing(progress: number): void { this.fishing = Phaser.Math.Clamp(progress, 0, 1); }

  /**
   * The fade runs through the rig's own alpha, so the hands and eyes go with the body — but
   * never all the way to zero, because `BaseAvatar` stops painting its layers below 0.02 and
   * the esca is the one thing that has to still be there when everything else has gone.
   */
  update(delta: number, x: number, y: number, alpha: number): void {
    this.baseAlpha = alpha;
    super.update(delta, x, y, alpha * (1 - this.hidden * 0.94));
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.34 : 0.22);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new DepthsFx(this.scene, this.tint).bubbles(x, y, 1, 5, DPT.foam, 420, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // The pool of dark the character stands in, and the cold light the esca throws down it.
    g.fillStyle(this.tint(DPT.abyss), a * 0.5);
    g.fillEllipse(x, y + 13, 50, 19);
    g.fillStyle(this.tint(DPT.teal), a * 0.14);
    g.fillEllipse(x, y + 12, 66 + Math.sin(this.t * 2) * 5, 24);
    for (let i = 0; i < 3; i++) {
      const r = 17 + i * 10 + Math.sin(this.t * 1.8 + i) * 3;
      g.lineStyle(1.3, this.tint(i === 1 ? DPT.cyan : DPT.trench), a * (0.2 - i * 0.045));
      g.strokeEllipse(x, y + 13, r * 2, r * 0.78);
    }
  }

  /** Gills: three slits down the near flank, venting into the water. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    g.lineStyle(1.8, this.tint(DPT.abyss), alpha * 0.7);
    for (let i = 0; i < 3; i++) {
      const gy = y - 4 + i * 5;
      g.lineBetween(x + 12, gy, x + 16 + Math.sin(this.t * 3 + i) * 1.2, gy + 3);
    }
    bubbleColumn(g, this.tint, x + 15, y + 2, this.t, 3, 3, 20, alpha * 0.5, this.seed);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const vis = alpha;
    // The esca ignores the fade entirely — a lure that dimmed with the thing holding it would
    // stop being bait at exactly the moment the passive finished setting it.
    const lit = this.baseAlpha;

    // ── The illicium and its esca ──
    const tip = illicium(g, this.tint, x, y - 20, 26 + (this.mastered ? 5 : 0), this.t,
      lit * (0.35 + 0.65 * (1 - this.hidden)));
    const pulse = 0.8 + 0.2 * Math.sin(this.t * 3.4);
    g.fillStyle(this.tint(DPT.lure), lit * 0.16);
    g.fillCircle(tip.x, tip.y, 15 * pulse);
    g.fillStyle(this.tint(DPT.algae), lit * 0.4);
    g.fillCircle(tip.x, tip.y, 8 * pulse);
    g.fillStyle(this.tint(DPT.lure), lit);
    g.fillCircle(tip.x, tip.y, 4 * pulse);

    // A taut line off the esca while fishing, dipping into the floor in front.
    if (this.fishing > 0) {
      const endX = x + Math.cos(this.facing) * 34;
      const endY = y + Math.sin(this.facing) * 34 + 12;
      g.lineStyle(1.2, this.tint(DPT.foam), lit * 0.5);
      const segs = 8;
      let px = tip.x;
      let py = tip.y;
      for (let i = 1; i <= segs; i++) {
        const s = i / segs;
        const cx = tip.x + (endX - tip.x) * s;
        const cy = tip.y + (endY - tip.y) * s + Math.sin(s * Math.PI) * 9;
        g.lineBetween(px, py, cx, cy);
        px = cx;
        py = cy;
      }
      // The float bobbing where the line meets the floor, sinking as the catch nears.
      const bob = Math.sin(this.t * 9) * (1.5 + this.fishing * 3);
      g.fillStyle(this.tint(DPT.blood), lit * 0.9);
      g.fillCircle(endX, endY + bob, 3.4);
      g.fillStyle(this.tint(DPT.foam), lit * 0.9);
      g.fillCircle(endX, endY + bob - 1.4, 1.6);
    }

    // ── The jaw ──
    // An underbite of teeth across the lower face. Sits below the eyes at y-4, so it reads as
    // a mouth rather than covering the face.
    g.fillStyle(this.tint(DPT.abyss), vis * 0.85);
    g.fillEllipse(x, y + 9, 26, 9);
    g.fillStyle(this.tint(DPT.bone), vis * 0.95);
    for (let i = 0; i < 6; i++) {
      const tx = x - 11 + i * 4.4;
      g.fillTriangle(tx, y + 5, tx + 3.2, y + 5, tx + 1.6, y + 11);
      g.fillTriangle(tx + 1, y + 13, tx + 4.2, y + 13, tx + 2.6, y + 7.5);
    }

    // ── A caught fish, clamped crosswise in that jaw ──
    if (this.fish) {
      const kind = this.fish;
      const wig = this.t * 9;
      // Lit rather than faded: which fish is in your mouth is a readout, not decoration.
      fishBody(g, this.tint, x + 2, y + 9, 0.12 + Math.sin(wig) * 0.08, 30,
        FISH_COLOR[kind], lit * 0.95, FISH_PROFILE[kind], wig);
    }
  }
}
