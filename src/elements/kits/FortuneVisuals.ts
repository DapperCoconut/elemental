import Phaser from 'phaser';
import { ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Fortune draws.
 *
 * Two materials and one rule. The materials are **gold** — the coins, the awning trim, the
 * beam, every number that goes up — and **gunmetal**, which is everything he sells you from
 * behind the second tab and never advertises. The rule is that money is always round and
 * weapons are always straight: if a shape on screen has a curve in it, it is worth something,
 * and if it has an edge, it is going to hurt.
 *
 * The blood coin is the element's one signature object and it is drawn properly — a milled rim
 * with real teeth, a dark clotted face, and a bevel that catches the light on whichever side it
 * is spinning toward. It appears at every scale in the kit: raining out of a wound, stacked on
 * the counter, jammed in a turnstile slot, and burning away one at a time along the ultimate.
 */

export type FortuneColorFn = ColorFn;

export const FOR = {
  /** The bottom of the ladder — shadow under the stall, the inside of a barrel. */
  ink: 0x140f0a,
  soot: 0x2a2119,
  /** The stall: dry timber and sun-bleached canvas. */
  timber: 0x6b4423,
  timberLit: 0x8c5c31,
  canvas: 0xe6d8b8,
  canvasShade: 0xbda98a,
  /** Accent 1 — money. Everything that goes up is one of these three. */
  gold: 0xf0c33c,
  goldLit: 0xfff0a8,
  brass: 0xa8791e,
  /** Accent 2 — blood. The coins are minted out of it and the awning is striped with it. */
  blood: 0xb3202e,
  bloodDark: 0x6d1119,
  /** Accent 3 — the illegal tab. Nothing legal is ever this colour. */
  contraband: 0x2f8f57,
  neon: 0x6ef2a2,
  /** Weapons. Straight edges only. */
  steel: 0xb8c2cc,
  gunmetal: 0x3a4048,
  grip: 0x3b2a1d,
  /** Muzzle flash and the ultimate's core. */
  hot: 0xfff6d0,
};

/** Deterministic 0–1 noise, so a milled rim keeps the same teeth every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 61.7 + i * 91.3) * 24571.117;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A blood coin.
 *
 * `spin` is the phase of its tumble, and the coin is squashed on the X axis by `cos(spin)` —
 * so it genuinely goes edge-on twice a turn instead of just rotating a disc. The rim is milled
 * with real teeth around the visible arc, the face carries a struck skull-and-drop device, and
 * the bevel highlight sits on whichever side the tumble is currently presenting.
 */
export function bloodCoin(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number,
  { spin = 0, dark = 1, face = FOR.blood, rim = FOR.gold, device = true } = {},
): void {
  const squash = Math.cos(spin);
  const w = Math.max(0.6, Math.abs(squash) * r);
  const edgeOn = Math.abs(squash) < 0.22;

  // Edge-on: the coin is a bright sliver of milled gold and nothing else.
  if (edgeOn) {
    g.fillStyle(shade(tint(rim), dark * 1.05), alpha);
    g.fillRect(x - Math.max(0.9, w), y - r, Math.max(1.8, w * 2), r * 2);
    g.fillStyle(shade(tint(FOR.goldLit), dark), alpha * 0.8);
    g.fillRect(x - Math.max(0.4, w * 0.4), y - r * 0.8, Math.max(0.8, w * 0.8), r * 1.6);
    return;
  }

  // Rim, then face inset inside it.
  g.fillStyle(shade(tint(rim), dark * 0.72), alpha);
  g.fillEllipse(x, y, w * 2, r * 2);
  g.fillStyle(shade(tint(rim), dark), alpha);
  g.fillEllipse(x, y, w * 1.86, r * 1.86);
  g.fillStyle(shade(tint(face), dark), alpha);
  g.fillEllipse(x, y, w * 1.44, r * 1.44);
  g.fillStyle(shade(tint(FOR.bloodDark), dark), alpha * 0.75);
  g.fillEllipse(x + w * 0.12, y + r * 0.12, w * 1.3, r * 1.3);

  // Milling: short radial teeth around the rim, only as many as the squash can show.
  const teeth = Math.max(4, Math.round(14 * Math.abs(squash)));
  g.lineStyle(Math.max(0.6, r * 0.09), shade(tint(FOR.brass), dark), alpha * 0.7);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    const ca = Math.cos(a) * w;
    const sa = Math.sin(a) * r;
    g.lineBetween(x + ca * 0.87, y + sa * 0.87, x + ca * 1.0, y + sa * 1.0);
  }

  // Struck device: a skull over a falling drop. Only at a size where it can read.
  if (device && r > 4.5) {
    const s = r / 8;
    g.fillStyle(shade(tint(FOR.gold), dark), alpha * 0.9);
    g.fillEllipse(x, y - r * 0.15, w * 0.62, r * 0.5);
    g.fillRect(x - w * 0.22, y + r * 0.05, w * 0.44, r * 0.28);
    g.fillStyle(shade(tint(FOR.bloodDark), dark), alpha);
    g.fillCircle(x - w * 0.2, y - r * 0.2, Math.max(0.5, 1.2 * s));
    g.fillCircle(x + w * 0.2, y - r * 0.2, Math.max(0.5, 1.2 * s));
    g.fillStyle(shade(tint(FOR.blood), dark), alpha * 0.9);
    g.fillEllipse(x, y + r * 0.52, w * 0.26, r * 0.3);
  }

  // Bevel highlight, on the leading edge of the tumble.
  const lead = Math.sign(squash) || 1;
  g.lineStyle(Math.max(0.7, r * 0.13), shade(tint(FOR.goldLit), dark), alpha * 0.75);
  g.beginPath();
  g.arc(x, y, r, lead > 0 ? -2.5 : 0.6, lead > 0 ? -0.7 : 2.4, false);
  g.strokePath();
}

/**
 * A bullet in flight. A tapered slug with a copper jacket line and a hot tracer streak behind
 * it — the streak is what makes it readable at speed, the slug is what makes it a bullet.
 */
export function bulletShape(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { dark = 1, color = FOR.steel, tracer = 1, seed = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size * 0.34;

  if (tracer > 0) {
    const tl = size * (3.2 + jitter(seed, 1) * 1.2) * tracer;
    const tail = [P(-tl, 0), P(-size * 0.4, -w * 0.75), P(-size * 0.4, w * 0.75)];
    g.fillStyle(shade(tint(FOR.hot), dark), alpha * 0.28 * tracer);
    g.fillPoints(tail, true);
  }

  const body = [
    P(size, 0),
    P(size * 0.35, -w),
    P(-size * 0.75, -w * 0.92),
    P(-size * 0.75, w * 0.92),
    P(size * 0.35, w),
  ];
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.7);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.22, y + (p.y - y) * 1.22)), true);
  g.fillStyle(shade(tint(color), dark), alpha);
  g.fillPoints(body, true);
  // Copper jacket band across the base, and a glint down the top edge.
  const b0 = P(-size * 0.45, -w * 0.95);
  const b1 = P(-size * 0.45, w * 0.95);
  g.lineStyle(Math.max(0.8, size * 0.22), shade(tint(FOR.brass), dark), alpha * 0.85);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  const g0 = P(size * 0.75, -w * 0.4);
  const g1 = P(-size * 0.5, -w * 0.6);
  g.lineStyle(Math.max(0.5, size * 0.13), shade(tint(FOR.hot), dark), alpha * 0.6);
  g.lineBetween(g0.x, g0.y, g1.x, g1.y);
}

/** The five guns, drawn as silhouettes in a hand. `(x, y)` is the grip; the barrel runs along `ang`. */
export function gunShape(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, kind: string, alpha: number,
  { dark = 1, recoil = 0, golden = false } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const back = recoil * 5;
  const P = (u: number, v: number) => pt(x - ca * back, y - sa * back, ca, sa, u, v);
  const metal = golden ? FOR.gold : FOR.gunmetal;
  const lit = golden ? FOR.goldLit : FOR.steel;

  const poly = (pts: [number, number][], color: number, a: number): void => {
    g.fillStyle(shade(tint(color), dark), alpha * a);
    g.fillPoints(pts.map(([u, v]) => P(u, v)), true);
  };

  // Grip: every gun has one, angled down and back off the frame.
  poly([[-2, 1], [4, 1], [2, 11], [-5, 10]], FOR.grip, 1);
  g.lineStyle(1, shade(tint(FOR.ink), dark), alpha * 0.6);
  const gs = P(-1, 3);
  const ge = P(-2.5, 9);
  g.lineBetween(gs.x, gs.y, ge.x, ge.y);

  switch (kind) {
    case 'revolver': {
      poly([[-4, -3], [10, -3], [10, 2], [-4, 2]], metal, 1);          // frame
      poly([[10, -2.2], [24, -2.2], [24, 1.4], [10, 1.4]], metal, 1);  // barrel
      poly([[10, 1.4], [22, 1.4], [22, 3], [10, 3]], lit, 0.5);        // ejector rod
      g.fillStyle(shade(tint(lit), dark), alpha);
      const cyl = P(4, -0.5);
      g.fillCircle(cyl.x, cyl.y, 4.2);                                  // cylinder
      g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.9);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + ang;
        g.fillCircle(cyl.x + Math.cos(a) * 2.3, cyl.y + Math.sin(a) * 2.3, 0.95);
      }
      break;
    }
    case 'rifle': {
      poly([[-6, -2], [12, -2], [12, 2.6], [-6, 3.4]], FOR.grip, 1);     // stock
      poly([[2, -3], [16, -3], [16, 1.6], [2, 1.6]], metal, 1);          // receiver
      poly([[16, -1.8], [38, -1.8], [38, 0.8], [16, 0.8]], metal, 1);    // long barrel
      poly([[9, -6], [16, -6], [16, -3.2], [9, -3.2]], lit, 0.9);        // scope block
      g.lineStyle(1.2, shade(tint(FOR.ink), dark), alpha * 0.8);
      const s0 = P(9, -4.6);
      const s1 = P(17, -4.6);
      g.lineBetween(s0.x, s0.y, s1.x, s1.y);
      poly([[24, 1], [27, 1], [27, 4.6], [24, 4.6]], metal, 0.8);        // bipod stub
      break;
    }
    case 'ar': {
      poly([[-7, -2.4], [8, -2.4], [8, 2], [-7, 2.6]], metal, 1);        // buffer/stock
      poly([[3, -3.4], [18, -3.4], [18, 2], [3, 2]], metal, 1);          // receiver
      poly([[18, -2], [32, -2], [32, 0.8], [18, 0.8]], metal, 1);        // barrel
      poly([[30, -3.4], [33, -3.4], [33, -1.6], [30, -1.6]], lit, 0.9);  // front sight
      poly([[8, 2], [14, 2], [13, 10], [8, 9]], FOR.grip, 1);            // magazine
      g.lineStyle(1, shade(tint(FOR.ink), dark), alpha * 0.55);
      const r0 = P(6, -3.2);
      const r1 = P(16, -3.2);
      g.lineBetween(r0.x, r0.y, r1.x, r1.y);                              // rail
      break;
    }
    case 'golden': {
      poly([[-4, -3.2], [11, -3.2], [11, 2], [-4, 2]], FOR.gold, 1);
      poly([[11, -2.4], [26, -2.4], [26, 1.2], [11, 1.2]], FOR.gold, 1);
      poly([[24, -2.4], [28, -2.4], [28, 1.2], [24, 1.2]], FOR.goldLit, 1); // emitter
      g.lineStyle(1, shade(tint(FOR.goldLit), dark), alpha * 0.9);
      const f0 = P(-2, -2.4);
      const f1 = P(10, -2.4);
      g.lineBetween(f0.x, f0.y, f1.x, f1.y);
      // Filigree: three notches down the slide, because it is a stupid, decorated gun.
      for (let i = 0; i < 3; i++) {
        const n0 = P(0 + i * 3.4, -3.2);
        const n1 = P(1.6 + i * 3.4, -1.4);
        g.lineStyle(0.9, shade(tint(FOR.brass), dark), alpha * 0.85);
        g.lineBetween(n0.x, n0.y, n1.x, n1.y);
      }
      break;
    }
    case 'launcher': {
      // Fat, short and ugly: a drum of three shells under a stubby tube with a leaf sight.
      poly([[-8, -2.6], [6, -2.6], [6, 2.4], [-8, 3.2]], FOR.grip, 1);   // shoulder stock
      poly([[0, -4], [14, -4], [14, 2.2], [0, 2.2]], metal, 1);          // receiver
      poly([[14, -3.4], [30, -3.4], [30, 1.6], [14, 1.6]], metal, 1);    // bore
      poly([[28, -3.8], [31, -3.8], [31, 2], [28, 2]], lit, 0.8);        // muzzle ring
      g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
      const drum = P(7, 3.6);
      g.fillCircle(drum.x, drum.y, 5.6);                                  // shell drum
      g.fillStyle(shade(tint(FOR.contraband), dark), alpha * 0.9);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + ang * 0.5;
        g.fillCircle(drum.x + Math.cos(a) * 3, drum.y + Math.sin(a) * 3, 1.5);
      }
      poly([[10, -6.4], [12, -6.4], [12, -3.8], [10, -3.8]], lit, 0.85);  // leaf sight
      break;
    }
    case 'bouncy': {
      // A toy. Rounded shell, a coil you can see charging, and a rubber cup instead of a muzzle.
      poly([[-4, -3.6], [12, -3.6], [12, 2.2], [-4, 2.2]], FOR.contraband, 1);
      poly([[12, -2.8], [24, -2.8], [24, 1.6], [12, 1.6]], metal, 1);
      g.fillStyle(shade(tint(FOR.neon), dark), alpha * 0.9);
      const coil = P(4, -0.6);
      g.fillCircle(coil.x, coil.y, 3.4);
      g.lineStyle(1, shade(tint(FOR.hot), dark), alpha * 0.8);
      for (let i = 0; i < 3; i++) {
        const c0 = P(13 + i * 3.2, -2.6);
        const c1 = P(13 + i * 3.2, 1.4);
        g.lineBetween(c0.x, c0.y, c1.x, c1.y);                            // barrel ribs
      }
      g.fillStyle(shade(tint(FOR.grip), dark), alpha);
      const cup = P(25.5, -0.6);
      g.fillCircle(cup.x, cup.y, 3.2);                                    // rubber cup
      g.fillStyle(shade(tint(FOR.neon), dark), alpha * 0.75);
      g.fillCircle(cup.x, cup.y, 1.6);
      break;
    }
    default: { // pistol
      poly([[-4, -3], [15, -3], [15, 1.6], [-4, 1.6]], metal, 1);        // slide
      poly([[-3, 1.6], [10, 1.6], [10, 3], [-3, 3]], lit, 0.55);         // frame rail
      poly([[13, -2.4], [17, -2.4], [17, 1], [13, 1]], metal, 1);        // muzzle
      g.lineStyle(0.9, shade(tint(FOR.ink), dark), alpha * 0.55);
      for (let i = 0; i < 4; i++) {
        const c0 = P(-3 + i * 1.6, -2.6);
        const c1 = P(-3 + i * 1.6, 1.2);
        g.lineBetween(c0.x, c0.y, c1.x, c1.y);                            // slide serrations
      }
      break;
    }
  }
}

/** The muzzle end of whichever gun is drawn above, in world space. */
export function muzzleOf(x: number, y: number, ang: number, kind: string): { x: number; y: number } {
  const reach = kind === 'rifle' ? 38 : kind === 'ar' ? 32 : kind === 'launcher' ? 31
    : kind === 'golden' ? 28 : kind === 'bouncy' ? 26 : kind === 'revolver' ? 24 : 17;
  return { x: x + Math.cos(ang) * reach, y: y + Math.sin(ang) * reach - 1 };
}

/**
 * The stall.
 *
 * Four things stacked, in the order you would build one: a shadow, two posts, a counter with a
 * coin stack and a strongbox on it, and a scalloped awning above. The awning is striped, and
 * the stripe colour is the whole tab indicator — canvas-and-blood for the legal page, tarpaulin
 * green for the illegal one, so a glance at the middle of the arena tells you which page the
 * shopkeeper is standing behind.
 */
export function stall(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, w: number, alpha: number,
  { t = 0, illegal = false, dark = 1, seed = 3, stock = 3 } = {},
): void {
  const half = w / 2;
  const counterY = y + 16;
  const roofY = y - 26;
  const stripe = illegal ? FOR.contraband : FOR.blood;
  const cloth = illegal ? shade(FOR.canvas, 0.62) : FOR.canvas;

  // Shadow.
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.45);
  g.fillEllipse(x, counterY + 13, w * 1.05, 13);

  // Posts.
  for (const s of [-1, 1]) {
    g.fillStyle(shade(tint(FOR.timber), dark), alpha);
    g.fillRect(x + s * (half - 4) - 2.5, roofY, 5, counterY - roofY + 8);
    g.fillStyle(shade(tint(FOR.timberLit), dark), alpha * 0.8);
    g.fillRect(x + s * (half - 4) - 2.5, roofY, 2, counterY - roofY + 8);
  }

  // Counter: a plank with a lip, and a dark gap under it.
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.8);
  g.fillRect(x - half, counterY + 3, w, 9);
  g.fillStyle(shade(tint(FOR.timber), dark), alpha);
  g.fillRect(x - half - 3, counterY - 4, w + 6, 8);
  g.fillStyle(shade(tint(FOR.timberLit), dark), alpha);
  g.fillRect(x - half - 3, counterY - 4, w + 6, 2.6);

  // What is on the counter: a stack of coins that shortens as the shopkeeper spends, and a
  // strongbox with a lit keyhole.
  for (let i = 0; i < Math.max(0, Math.min(5, stock)); i++) {
    bloodCoin(g, tint, x - half + 13, counterY - 7 - i * 3.1, 5.4, alpha,
      { spin: 0.35 + Math.sin(t * 0.6 + i) * 0.06, dark, device: false });
  }
  g.fillStyle(shade(tint(FOR.soot), dark), alpha);
  g.fillRect(x + half - 24, counterY - 15, 18, 11);
  g.fillStyle(shade(tint(FOR.brass), dark), alpha * 0.9);
  g.fillRect(x + half - 24, counterY - 15, 18, 2.4);
  g.fillCircle(x + half - 15, counterY - 8, 2.1);
  g.fillStyle(shade(tint(illegal ? FOR.neon : FOR.gold), dark), alpha * (0.55 + 0.45 * Math.sin(t * 3)));
  g.fillCircle(x + half - 15, counterY - 8, 1.1);

  // Awning: a swagged front edge with scallops, not a rectangle.
  const front: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x - half - 9, roofY)];
  const SC = 9;
  for (let i = 0; i <= SC; i++) {
    const u = -1 + (i / SC) * 2;
    const sag = 7 * (1 - u * u);
    front.push(new Phaser.Geom.Point(x + u * (half + 9), roofY + 12 + sag + Math.sin(t * 1.6 + i) * 0.7));
  }
  front.push(new Phaser.Geom.Point(x + half + 9, roofY));
  g.fillStyle(shade(tint(cloth), dark), alpha);
  g.fillPoints(front, true);
  // Stripes, clipped by redrawing narrow wedges of the same swag.
  for (let i = 0; i < SC; i += 2) {
    const u0 = -1 + (i / SC) * 2;
    const u1 = -1 + ((i + 1) / SC) * 2;
    g.fillStyle(shade(tint(stripe), dark), alpha * 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(x + u0 * (half + 9), roofY),
      new Phaser.Geom.Point(x + u1 * (half + 9), roofY),
      new Phaser.Geom.Point(x + u1 * (half + 9), roofY + 12 + 7 * (1 - u1 * u1)),
      new Phaser.Geom.Point(x + u0 * (half + 9), roofY + 12 + 7 * (1 - u0 * u0)),
    ], true);
  }
  // Scalloped hem.
  for (let i = 0; i < SC; i++) {
    const u = -1 + ((i + 0.5) / SC) * 2;
    const px = x + u * (half + 9);
    const py = roofY + 12 + 7 * (1 - u * u);
    g.fillStyle(shade(tint(i % 2 ? stripe : cloth), dark), alpha);
    g.fillCircle(px, py, (half + 9) / SC * 0.72);
  }

  // Ridge pole and a hanging sign: a coin on the legal page, a crossed-out one on the illegal.
  g.fillStyle(shade(tint(FOR.timberLit), dark), alpha);
  g.fillRect(x - half - 10, roofY - 2.5, w + 20, 3.5);
  const sy = roofY - 15 + Math.sin(t * 1.1 + seed) * 1.2;
  g.lineStyle(1, shade(tint(FOR.brass), dark), alpha * 0.7);
  g.lineBetween(x, roofY - 1, x, sy + 7);
  bloodCoin(g, tint, x, sy, 8, alpha, { spin: t * 0.9, dark });
  if (illegal) {
    g.lineStyle(2, shade(tint(FOR.neon), dark), alpha * 0.9);
    g.lineBetween(x - 9, sy - 9, x + 9, sy + 9);
  }
}

/**
 * One turnstile of the Paywall — a waist-high drum with three arms that rotate as things are
 * charged through it, on a post with a lit coin slot. A whole wall of these is just this shape
 * repeated down the arena with the phases offset.
 */
export function turnstile(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, alpha: number,
  { spin = 0, dark = 1, hot = 0 } = {},
): void {
  // Post with a foot.
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.5);
  g.fillEllipse(x, y + 13, 20, 6);
  g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
  g.fillRect(x - 4, y - 12, 8, 25);
  g.fillStyle(shade(tint(FOR.steel), dark), alpha * 0.75);
  g.fillRect(x - 4, y - 12, 2.4, 25);

  // Coin slot: gold when idle, hot the instant somebody has just paid.
  g.fillStyle(shade(tint(FOR.ink), dark), alpha);
  g.fillRect(x - 2.4, y - 8, 4.8, 6);
  g.fillStyle(shade(tint(hot > 0 ? FOR.hot : FOR.gold), dark), alpha * (0.5 + hot * 0.5));
  g.fillRect(x - 1.6, y - 7.2, 3.2, 4.4);

  // Three arms out of the drum head, foreshortened by their own angle so they read as rotating.
  const head = y - 14;
  g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
  g.fillEllipse(x, head, 13, 6);
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * TAU;
    const reach = 17;
    const ex = x + Math.cos(a) * reach;
    const ey = head + Math.sin(a) * reach * 0.34;
    // Nearer arms are drawn brighter and thicker — the only depth cue a flat shape gets.
    const near = 0.55 + 0.45 * Math.sin(a);
    g.lineStyle(2.4 * near + 0.8, shade(tint(FOR.steel), dark * (0.6 + near * 0.5)), alpha * (0.5 + near * 0.5));
    g.lineBetween(x, head, ex, ey);
    g.fillStyle(shade(tint(FOR.gold), dark), alpha * (0.4 + near * 0.5));
    g.fillCircle(ex, ey, 1.8 * near + 0.7);
  }
}

/**
 * The Death Machine. A disc vacuum with a rubber bumper, two drive wheels showing at the sides,
 * a lit sensor eye that looks where it is going, and a kitchen knife gaffer-taped upright to the
 * lid — the tape is drawn, because the tape is the joke.
 */
export function roombaShape(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  { spin = 0, dark = 1, angry = 0 } = {},
): void {
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.5);
  g.fillEllipse(x, y + 9, 26, 8);

  // Chassis.
  g.fillStyle(shade(tint(FOR.soot), dark), alpha);
  g.fillCircle(x, y, 13);
  g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
  g.fillCircle(x, y, 11.4);
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.7);
  g.fillEllipse(x, y + 2.4, 18, 9);

  // Bumper arc across the leading edge.
  g.lineStyle(2.6, shade(tint(FOR.grip), dark), alpha);
  g.beginPath();
  g.arc(x, y, 12.4, ang - 1.15, ang + 1.15, false);
  g.strokePath();

  // Drive wheels, poking out either side of the travel axis.
  for (const s of [-1, 1]) {
    const wa = ang + s * Math.PI / 2;
    g.fillStyle(shade(tint(FOR.ink), dark), alpha);
    g.fillEllipse(x + Math.cos(wa) * 11, y + Math.sin(wa) * 11, 5.4, 5.4);
  }

  // Sensor eye, looking along travel; red when it has a target.
  const ex = x + Math.cos(ang) * 6.5;
  const ey = y + Math.sin(ang) * 6.5;
  g.fillStyle(shade(tint(angry > 0 ? FOR.blood : FOR.neon), dark), alpha * (0.55 + 0.45 * Math.sin(spin * 6)));
  g.fillCircle(ex, ey, 2.3);

  // The knife: blade up the middle, tang, and two crossed strips of tape holding it on.
  const ka = ang;
  const ca = Math.cos(ka);
  const sa = Math.sin(ka);
  const P = (u: number, v: number) => pt(x, y - 3, ca, sa, u, v);
  const blade = [P(16, 0), P(2, -3.4), P(-7, -2.6), P(-7, 1.2), P(2, 1.2)];
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.8);
  g.fillPoints(blade.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.1, y - 3 + (p.y - (y - 3)) * 1.1)), true);
  g.fillStyle(shade(tint(FOR.steel), dark), alpha);
  g.fillPoints(blade, true);
  g.lineStyle(0.9, shade(tint(FOR.hot), dark), alpha * 0.75);
  const e0 = P(15, -0.4);
  const e1 = P(0, -2.8);
  g.lineBetween(e0.x, e0.y, e1.x, e1.y);
  g.fillStyle(shade(tint(FOR.grip), dark), alpha);
  g.fillPoints([P(-7, -2.8), P(-14, -2.4), P(-14, 1.4), P(-7, 1.4)], true);
  for (const s of [-1, 1]) {
    g.lineStyle(2.2, shade(tint(FOR.canvasShade), dark), alpha * 0.7);
    const t0 = P(-2 + s * 3, -6);
    const t1 = P(-2 - s * 3, 6);
    g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  }
}

/** One of the Ornate Daggers: a leaf blade with a jewelled crossguard, small and thrown flat. */
export function daggerShape(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  { dark = 1, size = 9 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size * 0.3;

  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.65);
  g.fillPoints([P(size * 1.25, 0), P(0, -w * 1.7), P(-size * 0.8, 0), P(0, w * 1.7)], true);
  g.fillStyle(shade(tint(FOR.steel), dark), alpha);
  g.fillPoints([P(size, 0), P(size * 0.1, -w), P(-size * 0.5, 0), P(size * 0.1, w)], true);
  g.lineStyle(0.8, shade(tint(FOR.hot), dark), alpha * 0.7);
  const s0 = P(size * 0.9, 0);
  const s1 = P(-size * 0.4, 0);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  // Guard and pommel, in gold — these are ornate daggers, and the gold is what says so.
  g.fillStyle(shade(tint(FOR.gold), dark), alpha);
  g.fillPoints([P(-size * 0.42, -w * 1.5), P(-size * 0.18, -w * 1.5), P(-size * 0.18, w * 1.5), P(-size * 0.42, w * 1.5)], true);
  const pm = P(-size * 0.72, 0);
  g.fillCircle(pm.x, pm.y, Math.max(1, size * 0.17));
}

/**
 * Pay-to-Win. A hard gold core with two softer sheaths around it, a shimmer running out along
 * the axis, and coins visibly burning off the emitter — the beam has to look expensive, because
 * paying for it is the cost.
 */
export function goldBeam(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  { t = 0, dark = 1, seed = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const quad = (w0: number, w1: number, color: number, a: number): void => {
    g.fillStyle(shade(tint(color), dark), alpha * a);
    g.fillPoints([P(0, -w0), P(len, -w1), P(len, w1), P(0, w0)], true);
  };

  quad(halfW * 1.9, halfW * 3.4, FOR.brass, 0.22);
  quad(halfW * 1.25, halfW * 2.1, FOR.gold, 0.5);
  quad(halfW * 0.62, halfW * 1.0, FOR.goldLit, 0.85);
  quad(halfW * 0.24, halfW * 0.38, FOR.hot, 1);

  // Shimmer: bright rings sliding out along the beam.
  for (let i = 0; i < 5; i++) {
    const k = ((t * 1.5 + i / 5) % 1);
    const u = k * len;
    const w = halfW * (0.7 + k * 1.3);
    g.lineStyle(1.6, shade(tint(FOR.hot), dark), alpha * (1 - k) * 0.6);
    const a0 = P(u, -w);
    const a1 = P(u, w);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }

  // Emitter bloom, and the coins going into it.
  g.fillStyle(shade(tint(FOR.hot), dark), alpha * 0.85);
  g.fillCircle(x, y, halfW * 1.5);
  g.fillStyle(shade(tint(FOR.gold), dark), alpha * 0.4);
  g.fillCircle(x, y, halfW * 2.6);
  for (let i = 0; i < 3; i++) {
    const k = ((t * 2.2 + i / 3) % 1);
    const d = 26 * (1 - k);
    const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 1.4;
    bloodCoin(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d - 4 * k, 4.6 * (1 - k * 0.5),
      alpha * (1 - k) * 0.9, { spin: t * 8 + i, dark, device: false });
  }
}

/**
 * Pay-to-Win, once Golden Excess has been paid for. The same beam opened out into a wedge —
 * `half` is the half-angle in radians — with the palette pushed from gold toward furnace orange
 * by `heat`, and a burning fan of arcs sliding out through it.
 */
export function goldCone(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, len: number, half: number, alpha: number,
  { t = 0, dark = 1, heat = 0 } = {},
): void {
  // The palette walks from money to furnace as the bill climbs.
  const mix = (cold: number, hot: number): number => {
    const k = Phaser.Math.Clamp(heat, 0, 1);
    const c = (s: number): number => Math.round(((cold >> s) & 0xff) * (1 - k) + ((hot >> s) & 0xff) * k);
    return (c(16) << 16) | (c(8) << 8) | c(0);
  };
  const outer = mix(FOR.brass, 0xd2410f);
  const mid = mix(FOR.gold, 0xff7a1a);
  const inner = mix(FOR.goldLit, 0xffb347);

  const wedge = (k: number, color: number, a: number): void => {
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x, y)];
    const N = Math.max(6, Math.round(half * 14));
    for (let i = 0; i <= N; i++) {
      const s = ang - half * k + (2 * half * k) * (i / N);
      pts.push(new Phaser.Geom.Point(x + Math.cos(s) * len, y + Math.sin(s) * len));
    }
    g.fillStyle(shade(tint(color), dark), alpha * a);
    g.fillPoints(pts, true);
  };

  wedge(1, outer, 0.22);
  wedge(0.78, mid, 0.42);
  wedge(0.5, inner, 0.6);
  wedge(0.22, FOR.hot, 0.85);

  // Arcs riding outward through the wedge, so the cone reads as pouring rather than standing.
  for (let i = 0; i < 6; i++) {
    const k = ((t * 1.4 + i / 6) % 1);
    g.lineStyle(2.4 * (1 - k) + 0.6, shade(tint(FOR.hot), dark), alpha * (1 - k) * 0.55);
    g.beginPath();
    g.arc(x, y, len * k, ang - half, ang + half, false);
    g.strokePath();
  }

  // Emitter, hotter and larger the more it is costing.
  g.fillStyle(shade(tint(FOR.hot), dark), alpha * 0.9);
  g.fillCircle(x, y, 10 + heat * 8);
  g.fillStyle(shade(tint(mid), dark), alpha * 0.4);
  g.fillCircle(x, y, 18 + heat * 14);
}

/**
 * A 40mm shell in the air. Blunt nose, a band of copper, and four fins that tumble — the shell
 * is drawn spinning because the thing is lobbed, not fired flat.
 */
export function grenadeShape(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  { spin = 0, dark = 1, size = 7 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Fins first, so the body sits over their roots.
  for (let i = 0; i < 4; i++) {
    const f = Math.cos(spin * 3 + (i / 4) * TAU);
    g.fillStyle(shade(tint(FOR.gunmetal), dark * (0.7 + 0.3 * Math.abs(f))), alpha * 0.9);
    g.fillPoints([P(-size * 0.9, 0), P(-size * 1.7, f * size * 0.85), P(-size * 0.5, f * size * 0.5)], true);
  }
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.7);
  g.fillEllipse(x, y, size * 2.5, size * 1.9);
  g.fillStyle(shade(tint(FOR.contraband), dark), alpha);
  g.fillEllipse(x, y, size * 2.1, size * 1.5);
  // Copper band and the blunt gold nose.
  g.lineStyle(Math.max(1, size * 0.28), shade(tint(FOR.brass), dark), alpha * 0.9);
  const b0 = P(-size * 0.15, -size * 0.72);
  const b1 = P(-size * 0.15, size * 0.72);
  g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.fillStyle(shade(tint(FOR.gold), dark), alpha);
  const nose = P(size * 0.95, 0);
  g.fillCircle(nose.x, nose.y, size * 0.46);
  g.fillStyle(shade(tint(FOR.hot), dark), alpha * (0.5 + 0.5 * Math.abs(Math.sin(spin * 5))));
  g.fillCircle(nose.x, nose.y, size * 0.2);
}

/**
 * The Bouncy Blaster's heavy round. A capsule of green light with a hard core and a spent-arc
 * tail; `charge` is how much of its bounce budget is left, and it dims as it is used up.
 */
export function bouncyBolt(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { dark = 1, charge = 1, t = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size * (0.5 + charge * 0.3);

  g.fillStyle(shade(tint(FOR.neon), dark), alpha * 0.2 * charge);
  g.fillPoints([P(-size * 4.5, 0), P(-size, -w * 0.9), P(-size, w * 0.9)], true);
  g.fillStyle(shade(tint(FOR.contraband), dark), alpha * 0.85);
  g.fillPoints([P(size * 1.6, 0), P(0, -w), P(-size * 1.4, 0), P(0, w)], true);
  g.fillStyle(shade(tint(FOR.neon), dark), alpha);
  g.fillPoints([P(size * 1.05, 0), P(0, -w * 0.5), P(-size * 0.8, 0), P(0, w * 0.5)], true);
  g.fillStyle(shade(tint(FOR.hot), dark), alpha * (0.7 + 0.3 * Math.sin(t * 14)));
  const core = P(size * 0.2, 0);
  g.fillCircle(core.x, core.y, size * 0.34);
}

/**
 * The Midas round. Slow, fat and obviously expensive: a gilded slug with a heavy corona and
 * flakes of gold shedding off it as it travels.
 */
export function midasBullet(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  { t = 0, dark = 1, seed = 0, size = 11 } = {},
): void {
  g.fillStyle(shade(tint(FOR.gold), dark), alpha * 0.22);
  g.fillCircle(x, y, size * 1.9 + Math.sin(t * 6) * 1.4);
  g.fillStyle(shade(tint(FOR.brass), dark), alpha * 0.4);
  g.fillCircle(x, y, size * 1.25);
  bulletShape(g, tint, x, y, ang, size, alpha, { dark, color: FOR.gold, tracer: 1.4, seed });
  // Flakes shedding off the jacket.
  for (let i = 0; i < 4; i++) {
    const k = ((t * 1.6 + i / 4) % 1);
    const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 1.5;
    g.fillStyle(shade(tint(FOR.goldLit), dark), alpha * (1 - k) * 0.8);
    g.fillCircle(x + Math.cos(a) * 16 * k, y + Math.sin(a) * 16 * k - 6 * k, 2 * (1 - k) + 0.6);
  }
}

/**
 * A gilded body. Drawn under whoever the Midas round caught — a slow gold shell with a running
 * seam of light, so a doubled payout is visible on the target rather than only in the purse.
 */
export function gildedAura(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number,
  { t = 0, dark = 1 } = {},
): void {
  g.fillStyle(shade(tint(FOR.gold), dark), alpha * 0.2);
  g.fillCircle(x, y, r * 1.15);
  g.lineStyle(2.2, shade(tint(FOR.goldLit), dark), alpha * 0.75);
  g.strokeCircle(x, y, r);
  for (let i = 0; i < 3; i++) {
    const a = t * 2.4 + (i / 3) * TAU;
    g.lineStyle(1.4, shade(tint(FOR.hot), dark), alpha * 0.7);
    g.beginPath();
    g.arc(x, y, r * (0.72 + i * 0.14), a, a + 1.1, false);
    g.strokePath();
  }
}

/**
 * The Chilly Pepper's ring. A rime front thrown out from the buyer's feet, with frost spurs
 * standing up off it — cold in a kit where every other effect is fire or gold.
 */
export function frostRing(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, r: number, alpha: number,
  { t = 0, dark = 1, seed = 0 } = {},
): void {
  const ice = 0x9fe4ff;
  const deep = 0x4a86b8;
  g.fillStyle(shade(tint(deep), dark), alpha * 0.16);
  g.fillCircle(x, y, r);
  g.lineStyle(3.2, shade(tint(ice), dark), alpha * 0.8);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.2, shade(tint(FOR.hot), dark), alpha * 0.4);
  g.strokeCircle(x, y, r * 0.82);
  // Spurs of rime standing off the front, tilted by the seed so no two rings match.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + jitter(seed, i) * 0.4 + t * 0.3;
    const h = 5 + jitter(seed, 30 + i) * 7;
    const bx = x + Math.cos(a) * r;
    const by = y + Math.sin(a) * r;
    g.fillStyle(shade(tint(ice), dark), alpha * 0.85);
    g.fillPoints([
      new Phaser.Geom.Point(bx + Math.cos(a) * h, by + Math.sin(a) * h),
      new Phaser.Geom.Point(bx + Math.cos(a + 1.9) * 3.4, by + Math.sin(a + 1.9) * 3.4),
      new Phaser.Geom.Point(bx + Math.cos(a - 1.9) * 3.4, by + Math.sin(a - 1.9) * 3.4),
    ], true);
  }
}

/**
 * A Heal Pylon. A tripod under a crystal that is green and lit when it has a charge in it and
 * grey and dark when it does not — the light *is* the cooldown readout.
 */
export function healPylon(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, alpha: number,
  { t = 0, dark = 1, ready = 1 } = {},
): void {
  const lit = ready > 0.5;
  const bulb = lit ? FOR.neon : FOR.gunmetal;

  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.5);
  g.fillEllipse(x, y + 15, 26, 8);
  // Three legs to a collar.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    g.lineStyle(2.6, shade(tint(FOR.gunmetal), dark), alpha);
    g.lineBetween(x, y - 2, x + Math.cos(a) * 11, y + 14);
  }
  g.fillStyle(shade(tint(FOR.steel), dark), alpha);
  g.fillRect(x - 4, y - 12, 8, 11);
  g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
  g.fillRect(x - 5.5, y - 4, 11, 4);

  // The crystal, breathing while charged.
  const pulse = lit ? 0.75 + 0.25 * Math.sin(t * 4) : 0.35;
  g.fillStyle(shade(tint(bulb), dark), alpha * 0.22 * pulse);
  g.fillCircle(x, y - 16, 15 * pulse);
  g.fillStyle(shade(tint(bulb), dark), alpha * pulse);
  g.fillPoints([
    new Phaser.Geom.Point(x, y - 25),
    new Phaser.Geom.Point(x + 5.5, y - 16),
    new Phaser.Geom.Point(x, y - 8),
    new Phaser.Geom.Point(x - 5.5, y - 16),
  ], true);
  if (lit) {
    g.fillStyle(shade(tint(FOR.hot), dark), alpha * 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(x, y - 21),
      new Phaser.Geom.Point(x + 2.4, y - 16),
      new Phaser.Geom.Point(x, y - 11),
      new Phaser.Geom.Point(x - 2.4, y - 16),
    ], true);
    // A little green cross floating over a charged pylon.
    g.fillStyle(shade(tint(FOR.neon), dark), alpha * 0.8);
    const fy = y - 32 - Math.sin(t * 2.6) * 2.5;
    g.fillRect(x - 1.4, fy - 4.5, 2.8, 9);
    g.fillRect(x - 4.5, fy - 1.4, 9, 2.8);
  }
}

/**
 * The auditor. A man in a hat lying prone at the top of the arena with a rifle out, drawn small
 * because he is a long way off — and he is only ever on screen for five seconds.
 */
export function auditor(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  { dark = 1, fired = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Rifle, along the line of sight.
  g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
  g.fillPoints([P(-6, -2), P(30, -1.4), P(30, 1.4), P(-6, 2.6)], true);
  g.fillStyle(shade(tint(FOR.steel), dark), alpha * 0.8);
  g.fillPoints([P(6, -4.4), P(14, -4.4), P(14, -2), P(6, -2)], true);   // scope
  // Bipod.
  g.lineStyle(1.4, shade(tint(FOR.gunmetal), dark), alpha * 0.9);
  const bp = P(22, 1.4);
  g.lineBetween(bp.x, bp.y, bp.x - 4, bp.y + 6);
  g.lineBetween(bp.x, bp.y, bp.x + 4, bp.y + 6);

  // Body: a suit, prone. Shoulders, then the hat over the head.
  g.fillStyle(shade(tint(FOR.soot), dark), alpha);
  g.fillEllipse(x - ca * 12, y - sa * 12, 20, 15);
  g.fillStyle(shade(tint(FOR.canvasShade), dark), alpha * 0.8);
  g.fillRect(x - ca * 12 - 1.5, y - sa * 12 - 5, 3, 10);                 // shirt collar
  g.fillStyle(shade(tint(FOR.ink), dark), alpha);
  g.fillCircle(x - ca * 4, y - sa * 4, 5.4);                             // head
  g.fillStyle(shade(tint(FOR.soot), dark), alpha);
  g.fillEllipse(x - ca * 4, y - sa * 4 - 2, 18, 6);                      // hat brim
  g.fillRect(x - ca * 4 - 4.5, y - sa * 4 - 8, 9, 6);                    // crown

  if (fired > 0) {
    const mz = P(31, 0);
    g.fillStyle(shade(tint(FOR.hot), dark), alpha * fired);
    g.fillCircle(mz.x, mz.y, 9 * fired);
  }
}

/**
 * The auditor's laser and the reticle it is sitting on. `lock` runs 0→1 over the five seconds
 * he takes to be sure, and the dot stops wandering as it closes.
 */
export function auditMark(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  fromX: number, fromY: number, x: number, y: number, alpha: number,
  { t = 0, dark = 1, lock = 0 } = {},
): void {
  const wob = (1 - lock) * 5;
  const px = x + Math.sin(t * 7) * wob;
  const py = y + Math.cos(t * 5.5) * wob;

  g.lineStyle(1, shade(tint(FOR.blood), dark), alpha * (0.35 + lock * 0.4));
  g.lineBetween(fromX, fromY, px, py);
  g.lineStyle(2.6, shade(tint(FOR.blood), dark), alpha * 0.18 * (0.5 + lock));
  g.lineBetween(fromX, fromY, px, py);

  // Reticle: a ring closing onto the dot with four ticks around it.
  const r = 22 - lock * 12;
  g.lineStyle(1.6, shade(tint(FOR.blood), dark), alpha * (0.5 + lock * 0.5));
  g.strokeCircle(px, py, r);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + t * 0.8;
    g.lineBetween(px + Math.cos(a) * r * 0.55, py + Math.sin(a) * r * 0.55,
      px + Math.cos(a) * r * 1.3, py + Math.sin(a) * r * 1.3);
  }
  g.fillStyle(shade(tint(FOR.blood), dark), alpha * (0.55 + 0.45 * Math.sin(t * 12)));
  g.fillCircle(px, py, 2.6);
}

/** A lick of chilli fire off the Spicy Pepper trail. Ragged, low, and leaning with the draught. */
export function pepperFlame(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, h: number, alpha: number,
  { t = 0, seed = 0, dark = 1 } = {},
): void {
  const lean = Math.sin(t * 3.4 + seed) * h * 0.22;
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * 0.3;
    const color = layer === 0 ? FOR.bloodDark : layer === 1 ? FOR.blood : FOR.gold;
    const pts: Phaser.Geom.Point[] = [];
    const N = 7;
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      const rise = (1 - u * u) * h * k;
      const wob = Math.sin(t * 7 + i * 1.7 + seed) * h * 0.09;
      pts.push(new Phaser.Geom.Point(x + u * h * 0.5 * k + lean * (rise / (h * k || 1)), y - rise + wob));
    }
    pts.push(new Phaser.Geom.Point(x + h * 0.5 * k, y + 1.5));
    pts.push(new Phaser.Geom.Point(x - h * 0.5 * k, y + 1.5));
    g.fillStyle(shade(tint(color), dark), alpha * (0.55 + layer * 0.16));
    g.fillPoints(pts, true);
  }
}

/**
 * Drive by Flex. A rusted saloon seen from above, and every garage buff is bolted onto it
 * somewhere you can see: the bumper grows teeth, the tyres fatten, the roof grows a turret or a
 * cannon, and the whole shell goes from brown rust to riveted plate once it is a Tank.
 *
 * `wear` is how close the thing is to its last bounce — the paint darkens and the panels start
 * hanging off, so a car about to go up looks like a car about to go up.
 */
export function rustyCar(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, ang: number, alpha: number,
  {
    t = 0, dark = 1, wear = 0, rider = false, spikes = false, tires = false,
    tank = false, speedster = false, gunner = false, robo = false, sunroof = false,
    turret = 0,
  } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  // A Tank is a wider, squarer thing than a saloon; everything else is the same shell.
  const L = tank ? 30 : 27;
  const W = tank ? 17 : 14;
  // The rust wins as the bounces run out.
  const shell = tank ? FOR.gunmetal : FOR.timber;
  const body = shade(tint(shell), dark * (1 - wear * 0.35));

  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.45);
  g.fillEllipse(x + 2, y + 9, L * 2.1, W * 1.5);

  // Wheels first, so the body sits on them. Quick Tires makes them visibly fatter.
  const tw = tires || speedster ? 7.4 : 5.6;
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      const w = P(su * L * 0.62, sv * (W + 1.5));
      g.fillStyle(shade(tint(FOR.ink), dark), alpha);
      g.fillCircle(w.x, w.y, tw);
      g.fillStyle(shade(tint(FOR.soot), dark), alpha * 0.9);
      g.fillCircle(w.x, w.y, tw * 0.55);
      // A hub that turns, so a stationary-looking car still reads as driving.
      g.lineStyle(1.1, shade(tint(FOR.steel), dark), alpha * 0.7);
      const hub = t * (speedster ? 26 : 13) + (su + sv);
      g.lineBetween(w.x - Math.cos(hub) * tw * 0.45, w.y - Math.sin(hub) * tw * 0.45,
        w.x + Math.cos(hub) * tw * 0.45, w.y + Math.sin(hub) * tw * 0.45);
    }
  }

  // The shell: a blunt wedge, nose slightly narrower than the boot.
  const hull = [P(L, -W * 0.72), P(L * 0.82, -W), P(-L * 0.94, -W), P(-L, -W * 0.6),
    P(-L, W * 0.6), P(-L * 0.94, W), P(L * 0.82, W), P(L, W * 0.72)];
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.85);
  g.fillPoints(hull, true);
  g.fillStyle(body, alpha);
  g.fillPoints(hull.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.93, y + (p.y - y) * 0.93)), true);

  // Rust blooms. Deterministic off the wear, so they creep rather than crawl about.
  for (let i = 0; i < 5; i++) {
    const j = jitter(41 + i, i);
    const rp = P((j * 2 - 1) * L * 0.7, (jitter(i, 9) * 2 - 1) * W * 0.7);
    g.fillStyle(shade(tint(FOR.bloodDark), dark), alpha * (0.18 + wear * 0.45));
    g.fillCircle(rp.x, rp.y, 2 + j * 2.6 + wear * 2);
  }

  // Cabin: a dark windscreen with a bar of glare across it, and the roof behind it.
  const glass = [P(L * 0.44, -W * 0.72), P(-L * 0.1, -W * 0.78), P(-L * 0.1, W * 0.78), P(L * 0.44, W * 0.72)];
  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.92);
  g.fillPoints(glass, true);
  g.fillStyle(shade(tint(FOR.steel), dark), alpha * 0.28);
  const gl0 = P(L * 0.4, -W * 0.5);
  const gl1 = P(-L * 0.06, -W * 0.1);
  g.lineStyle(2.2, shade(tint(FOR.canvas), dark), alpha * 0.3);
  g.lineBetween(gl0.x, gl0.y, gl1.x, gl1.y);
  g.fillStyle(shade(tint(shell), dark * 1.25), alpha);
  g.fillPoints([P(-L * 0.14, -W * 0.8), P(-L * 0.76, -W * 0.78), P(-L * 0.76, W * 0.78), P(-L * 0.14, W * 0.8)], true);

  // Headlights, always on, always pointing where it is about to go.
  for (const sv of [-1, 1]) {
    const h = P(L * 0.94, sv * W * 0.45);
    g.fillStyle(shade(tint(FOR.hot), dark), alpha * 0.9);
    g.fillCircle(h.x, h.y, 2.6);
    g.fillStyle(shade(tint(FOR.goldLit), dark), alpha * 0.18);
    g.fillCircle(h.x + ca * 6, h.y + sa * 6, 7);
  }

  // Spiked Bumper: real teeth off the nose, not a painted stripe.
  if (spikes) {
    g.fillStyle(shade(tint(FOR.steel), dark), alpha);
    for (let i = -2; i <= 2; i++) {
      const base = P(L * 0.98, i * W * 0.38);
      const tipp = P(L * 1.32, i * W * 0.3);
      const b0 = P(L * 0.98, i * W * 0.38 - 2.6);
      const b1 = P(L * 0.98, i * W * 0.38 + 2.6);
      g.fillPoints([b0, tipp, b1], true);
      void base;
    }
  }

  // Sunroof: a hole in the roof with light coming up out of it.
  if (sunroof) {
    const sr = P(-L * 0.42, 0);
    g.fillStyle(shade(tint(FOR.ink), dark), alpha);
    g.fillEllipse(sr.x, sr.y, W * 1.05, W * 0.8);
    g.fillStyle(shade(tint(FOR.goldLit), dark), alpha * (0.35 + 0.25 * Math.sin(t * 5)));
    g.fillEllipse(sr.x, sr.y, W * 0.72, W * 0.5);
  }

  // The rider, standing up out of the roof: shoulders, a head, and the shadow they cast on it.
  if (rider) {
    const r = P(-L * 0.34, 0);
    g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.5);
    g.fillEllipse(r.x + 2, r.y + 3, 17, 11);
    g.fillStyle(shade(tint(FOR.blood), dark), alpha);
    g.fillEllipse(r.x, r.y, 15, 10);
    g.fillStyle(shade(tint(FOR.canvas), dark), alpha);
    g.fillCircle(r.x, r.y - 1, 5.2);
    g.fillStyle(shade(tint(FOR.gold), dark), alpha * 0.9);
    g.fillCircle(r.x, r.y - 1, 3.2);
  }

  // Robo-Gunner / Tank: a turret on the roof, turned to `turret` rather than to travel.
  if (robo || tank) {
    const m = P(-L * 0.08, 0);
    g.fillStyle(shade(tint(FOR.gunmetal), dark * 1.2), alpha);
    g.fillCircle(m.x, m.y, tank ? 9 : 6.5);
    g.fillStyle(shade(tint(FOR.soot), dark), alpha);
    g.fillCircle(m.x, m.y, tank ? 6.5 : 4.6);
    const bl = tank ? 30 : 17;
    g.lineStyle(tank ? 5.2 : 3, shade(tint(FOR.steel), dark), alpha);
    g.lineBetween(m.x, m.y, m.x + Math.cos(turret) * bl, m.y + Math.sin(turret) * bl);
    if (tank) {
      g.fillStyle(shade(tint(FOR.gunmetal), dark), alpha);
      g.fillCircle(m.x + Math.cos(turret) * bl, m.y + Math.sin(turret) * bl, 3.4);
    }
  }

  // Mounted Gunner: a belt of brass slung over the boot, so the extra rounds are visible.
  if (gunner) {
    for (let i = 0; i < 5; i++) {
      const b = P(-L * 0.82, (i / 4 - 0.5) * W * 1.4);
      g.fillStyle(shade(tint(FOR.brass), dark), alpha * 0.95);
      g.fillEllipse(b.x, b.y, 4.6, 2.6);
    }
  }

  // Speedster: exhaust flame off the back, and it is on fire because that is the point.
  if (speedster) {
    for (let i = 0; i < 3; i++) {
      const e = P(-L * (1.05 + i * 0.22), Math.sin(t * 22 + i) * 3);
      g.fillStyle(shade(tint(i === 0 ? FOR.hot : i === 1 ? FOR.gold : FOR.blood), dark),
        alpha * (0.75 - i * 0.2));
      g.fillCircle(e.x, e.y, 6 - i * 1.4);
    }
  }
}

/**
 * One notch of the battle pass ribbon.
 *
 * Three states and three kinds, and the shape says which is which: a bought tier is a filled
 * gold block, the next one pulses on its own clock, and everything past it is a flat empty slot.
 * The `plus` tiers are drawn a head taller with a struck star on them — the ribbon should read
 * as "five more and something good happens" without a legend.
 */
export function passTier(
  g: Phaser.GameObjects.Graphics,
  tint: FortuneColorFn,
  x: number, y: number, w: number, h: number, alpha: number,
  { state = 'locked' as 'owned' | 'next' | 'locked', plus = false, t = 0, dark = 1 } = {},
): void {
  const tall = plus ? h * 1.34 : h;
  const pulse = state === 'next' ? 0.55 + 0.45 * Math.sin(t * 6) : 0;
  const face = state === 'owned' ? (plus ? FOR.goldLit : FOR.gold)
    : state === 'next' ? FOR.brass : FOR.soot;

  g.fillStyle(shade(tint(FOR.ink), dark), alpha * 0.85);
  g.fillRect(x - w / 2 - 1, y - tall / 2 - 1, w + 2, tall + 2);
  g.fillStyle(shade(tint(face), dark * (state === 'next' ? 1 + pulse * 0.5 : 1)),
    alpha * (state === 'locked' ? 0.55 : 0.95));
  g.fillRect(x - w / 2, y - tall / 2, w, tall);

  if (state !== 'locked') {
    g.fillStyle(shade(tint(FOR.hot), dark), alpha * (state === 'owned' ? 0.35 : 0.2 + pulse * 0.5));
    g.fillRect(x - w / 2, y - tall / 2, w, tall * 0.28);
  }
  if (plus) {
    // A struck five-point star, the same device the coin carries, so the reward reads as money.
    const r = Math.min(w, tall) * 0.34;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const rr = i % 2 === 0 ? r : r * 0.44;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    g.fillStyle(shade(tint(state === 'locked' ? FOR.brass : FOR.ink), dark), alpha * 0.9);
    g.fillPoints(pts, true);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class FortuneFx extends FxBase {
  /** Coins out of a wound, or off a counter. They arc up and fall, tumbling the whole way. */
  coinBurst(x: number, y: number, count = 5, spread = 30, ms = 700, depth = 11, dark = 1): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: -Math.PI * 0.85 + Math.random() * Math.PI * 0.7,
      d: spread * (0.4 + Math.random()),
      r: 3.4 + Math.random() * 2.6,
      s: Math.random() * TAU,
      i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + easeIn(t) * 34;
        bloodCoin(g, this.tint, px, py, p.r, (1 - t * t) * 0.95,
          { spin: p.s + t * 12, dark, device: false });
      }
    });
  }

  /** A gun going off: a four-point star of flame at the muzzle plus a puff of propellant. */
  muzzle(x: number, y: number, ang: number, size = 1, ms = 130, depth = 11, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const a = (1 - t) * (1 - t);
      const r = (9 + jitter(seed, 0) * 5) * size;
      g.fillStyle(shade(this.tint(FOR.hot), dark), a);
      g.fillCircle(x, y, r * 0.45);
      for (let i = 0; i < 4; i++) {
        const sa = ang + (i - 1.5) * 0.62;
        const d = r * (i === 1 || i === 2 ? 1.9 : 1.0);
        g.fillStyle(shade(this.tint(i % 2 ? FOR.gold : FOR.goldLit), dark), a * 0.9);
        g.fillPoints([
          new Phaser.Geom.Point(x, y),
          new Phaser.Geom.Point(x + Math.cos(sa - 0.22) * d * 0.5, y + Math.sin(sa - 0.22) * d * 0.5),
          new Phaser.Geom.Point(x + Math.cos(sa) * d, y + Math.sin(sa) * d),
          new Phaser.Geom.Point(x + Math.cos(sa + 0.22) * d * 0.5, y + Math.sin(sa + 0.22) * d * 0.5),
        ], true);
      }
      g.fillStyle(shade(this.tint(FOR.canvasShade), dark), a * 0.28);
      g.fillCircle(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8, r * (0.5 + t * 1.2));
    });
  }

  /** A bullet hitting something solid: a hard spark cone thrown back down the line of flight. */
  impact(x: number, y: number, ang: number, ms = 240, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 9, FOR.hot, FOR.gold, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 6; i++) {
        const a = ang + Math.PI + (jitter(seed, i) - 0.5) * 1.9;
        const d = (10 + jitter(seed, 9 + i) * 22) * e;
        g.lineStyle(1.4 * (1 - t) + 0.4, shade(this.tint(i % 2 ? FOR.gold : FOR.hot), dark), (1 - t) * 0.85);
        g.lineBetween(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
    });
  }

  /** Money changing hands: a gold ring closing inward onto a point. */
  cash(x: number, y: number, r = 34, ms = 480, depth = 22, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const k = 1 - easeOut(t);
      g.lineStyle(3 * k + 0.6, shade(this.tint(FOR.gold), dark), k * 0.85);
      g.strokeCircle(x, y, r * k + 4);
      g.lineStyle(1.4, shade(this.tint(FOR.goldLit), dark), k * 0.6);
      g.strokeCircle(x, y, r * k * 0.6 + 3);
    });
  }

  /** An explosion out of the Explosives Pouch: soot ring, gold shrapnel, black smoke. */
  boom(x: number, y: number, r: number, ms = 520, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.4, FOR.hot, FOR.blood, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, shade(this.tint(FOR.blood), dark), (1 - t) * 0.7);
      g.strokeCircle(x, y, r * e);
      g.fillStyle(shade(this.tint(FOR.soot), dark), (1 - t) * 0.4);
      g.fillCircle(x, y, r * e * 0.8);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + jitter(seed, i) * 0.5;
        const d = r * (0.5 + jitter(seed, 20 + i) * 0.8) * e;
        g.fillStyle(shade(this.tint(i % 3 ? FOR.gold : FOR.steel), dark), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.6 * (1 - t) + 0.6);
      }
    });
  }

  /** The Chilly Pepper going off: a rime front thrown outward and a fall of frost behind it. */
  frost(x: number, y: number, r: number, ms = 620, depth = 11, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      frostRing(g, this.tint, x, y, r * (0.25 + e * 0.85), (1 - t) * 0.9, { t: t * 4, dark, seed });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + jitter(seed, i) * 0.6;
        const d = r * (0.3 + jitter(seed, 40 + i) * 0.9) * e;
        g.fillStyle(shade(this.tint(0xdff3ff), dark), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d + easeIn(t) * 10, 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** A shell detonating: a hard shock ring, a soot ball, and fragments thrown flat and far. */
  blast(x: number, y: number, r: number, ms = 560, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.45, FOR.hot, FOR.gold, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(7 * (1 - t) + 1.4, shade(this.tint(FOR.gold), dark), (1 - t) * 0.8);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(2, shade(this.tint(FOR.hot), dark), (1 - t) * 0.5);
      g.strokeCircle(x, y, r * e * 0.6);
      g.fillStyle(shade(this.tint(FOR.soot), dark), (1 - t) * 0.5);
      g.fillCircle(x, y, r * e * 0.7);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + jitter(seed, i) * 0.5;
        const d = r * (0.6 + jitter(seed, 60 + i) * 0.7) * e;
        g.lineStyle(2 * (1 - t) + 0.5, shade(this.tint(i % 3 ? FOR.gold : FOR.contraband), dark), (1 - t) * 0.9);
        g.lineBetween(x + Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6,
          x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
    });
  }

  /**
   * The car going up. A fireball is not enough for a whole vehicle, so this is a fireball plus
   * the vehicle: a dozen tumbling panels of rusted timber and gunmetal thrown flat and falling,
   * and a pair of wheels that outlive the rest of it.
   */
  wreck(x: number, y: number, r: number, ms = 900, depth = 12, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.6, FOR.hot, FOR.blood, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(9 * (1 - t) + 1.6, shade(this.tint(FOR.blood), dark), (1 - t) * 0.75);
      g.strokeCircle(x, y, r * e);
      g.fillStyle(shade(this.tint(FOR.soot), dark), (1 - t) * 0.55);
      g.fillCircle(x, y, r * e * 0.72);
      g.fillStyle(shade(this.tint(FOR.gold), dark), (1 - t) * (1 - t) * 0.8);
      g.fillCircle(x, y, r * (1 - t) * 0.45);

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + jitter(seed, i);
        const d = r * (0.7 + jitter(seed, 30 + i) * 0.9) * e;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + easeIn(t) * 26;
        const spin = jitter(seed, 60 + i) * TAU + t * 14;
        const w = 4 + jitter(seed, 90 + i) * 5;
        const ca = Math.cos(spin);
        const sa = Math.sin(spin);
        g.fillStyle(shade(this.tint(i % 3 === 0 ? FOR.gunmetal : FOR.timber), dark), (1 - t) * 0.9);
        g.fillPoints([
          new Phaser.Geom.Point(px + ca * w - sa * 2, py + sa * w + ca * 2),
          new Phaser.Geom.Point(px - ca * w - sa * 2, py - sa * w + ca * 2),
          new Phaser.Geom.Point(px - ca * w + sa * 2, py - sa * w - ca * 2),
          new Phaser.Geom.Point(px + ca * w + sa * 2, py + sa * w - ca * 2),
        ], true);
      }
      // Two wheels, rolling out of the fire and going further than anything else.
      for (const s of [-1, 1]) {
        const a = seed + (s > 0 ? 0.6 : 2.7);
        const px = x + Math.cos(a) * r * 1.35 * e;
        const py = y + Math.sin(a) * r * 1.35 * e + easeIn(t) * 12;
        g.fillStyle(shade(this.tint(FOR.ink), dark), (1 - t) * 0.9);
        g.fillCircle(px, py, 6.5 * (1 - t * 0.4));
        g.lineStyle(1.2, shade(this.tint(FOR.steel), dark), (1 - t) * 0.7);
        g.lineBetween(px - Math.cos(t * 22) * 4, py - Math.sin(t * 22) * 4,
          px + Math.cos(t * 22) * 4, py + Math.sin(t * 22) * 4);
      }
    });
  }

  /** Somebody leaving the floor — up the way for a grenade launch, or sideways for a Tele-Core. */
  rift(x: number, y: number, r = 26, ms = 420, depth = 11, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const k = 1 - easeOut(t);
      g.lineStyle(3.4 * k + 0.6, shade(this.tint(FOR.goldLit), dark), k * 0.9);
      g.strokeEllipse(x, y, r * (2 - k) * 0.8, r * k * 1.4 + 4);
      g.lineStyle(1.4, shade(this.tint(FOR.hot), dark), k * 0.7);
      g.strokeEllipse(x, y, r * k, r * k * 1.8);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + t * 4;
        g.fillStyle(shade(this.tint(FOR.gold), dark), k * 0.8);
        g.fillCircle(x + Math.cos(a) * r * (1 - k) , y + Math.sin(a) * r * (1 - k) * 0.5, 2.2 * k + 0.5);
      }
    });
  }

  /** Spent brass off the ejection port. Small, and the only thing in the kit that bounces. */
  brass(x: number, y: number, ang: number, ms = 620, depth = 9, dark = 1): void {
    const a = ang + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const d = 16 + Math.random() * 14;
    const spin = Math.random() * TAU;
    this.anim(depth, ms, (g, t) => {
      const px = x + Math.cos(a) * d * easeOut(t);
      const py = y + Math.sin(a) * d * easeOut(t) + easeIn(t) * 30;
      g.fillStyle(shade(this.tint(FOR.brass), dark), (1 - t) * 0.9);
      const ra = spin + t * 16;
      g.fillPoints([
        new Phaser.Geom.Point(px + Math.cos(ra) * 2.6, py + Math.sin(ra) * 2.6),
        new Phaser.Geom.Point(px + Math.cos(ra + 1.6) * 1.1, py + Math.sin(ra + 1.6) * 1.1),
        new Phaser.Geom.Point(px - Math.cos(ra) * 2.6, py - Math.sin(ra) * 2.6),
        new Phaser.Geom.Point(px - Math.cos(ra + 1.6) * 1.1, py - Math.sin(ra + 1.6) * 1.1),
      ], true);
    });
  }

  /**
   * The Acceleration Gear, doing its one job.
   *
   * A steel cog thrown out of the ejection port alongside the brass, spinning back down the line
   * of the shot. `accel` is the live rate multiplier: it sets how many teeth are on the cog, how
   * fast it turns, and whether it has gone gold — the mod at full song is a bright, obviously
   * over-driven thing, and on a nearly full magazine it is a dull grey nothing.
   */
  gear(x: number, y: number, ang: number, accel: number, ms = 340, depth = 10, dark = 1): void {
    const k = Phaser.Math.Clamp((accel - 1) / 1.2, 0, 1);
    const teeth = 7 + Math.round(k * 5);
    const a = ang + Math.PI + (Math.random() - 0.5) * 0.7;
    const d = 12 + k * 20;
    const r0 = 3.4 + k * 2.6;
    const spin = Math.random() * TAU;
    const hot = k > 0.55;
    this.anim(depth, ms, (g, t) => {
      const px = x + Math.cos(a) * d * easeOut(t);
      const py = y + Math.sin(a) * d * easeOut(t) + easeIn(t) * 16;
      const fade = 1 - t;
      const ra = spin + t * (10 + k * 26);
      const r = r0 * (0.7 + fade * 0.3);

      // The teeth, drawn as a ring of stubs so the cog reads as toothed at 7px across.
      g.fillStyle(shade(this.tint(hot ? FOR.gold : FOR.steel), dark), fade * 0.9);
      for (let i = 0; i < teeth; i++) {
        const ta = ra + (i / teeth) * TAU;
        const tx = px + Math.cos(ta) * r * 1.32;
        const ty = py + Math.sin(ta) * r * 1.32;
        g.fillPoints([
          new Phaser.Geom.Point(tx + Math.cos(ta + 1.57) * r * 0.28, ty + Math.sin(ta + 1.57) * r * 0.28),
          new Phaser.Geom.Point(tx - Math.cos(ta + 1.57) * r * 0.28, ty - Math.sin(ta + 1.57) * r * 0.28),
          new Phaser.Geom.Point(px - Math.cos(ta + 1.57) * r * 0.34 + Math.cos(ta) * r * 0.8,
            py - Math.sin(ta + 1.57) * r * 0.34 + Math.sin(ta) * r * 0.8),
          new Phaser.Geom.Point(px + Math.cos(ta + 1.57) * r * 0.34 + Math.cos(ta) * r * 0.8,
            py + Math.sin(ta + 1.57) * r * 0.34 + Math.sin(ta) * r * 0.8),
        ], true);
      }
      // Body, then the bore through the middle so it is a cog rather than a saw blade.
      g.fillStyle(shade(this.tint(hot ? FOR.brass : FOR.gunmetal), dark), fade * 0.95);
      g.fillCircle(px, py, r);
      g.fillStyle(shade(this.tint(FOR.ink), dark), fade * 0.9);
      g.fillCircle(px, py, r * 0.34);
      // One tooth catches the light, which is what makes the spin legible at this size.
      g.fillStyle(shade(this.tint(hot ? FOR.hot : FOR.canvasShade), dark), fade * 0.8);
      g.fillCircle(px + Math.cos(ra) * r * 1.32, py + Math.sin(ra) * r * 1.32, r * 0.3);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const FORTUNE_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: FOR.brass, alpha: 0.34 },
    { r: 7.2, color: FOR.gold, alpha: 0.85 },
    { r: 2.6, color: FOR.hot, alpha: 0.95, ox: -1.8, oy: -1.9 },
  ],
  eyeWhite: FOR.goldLit,
  eyePupil: FOR.ink,
  squash: { div: 14, x: 0.48, y: 0.3 },
};

/**
 * The shopkeeper.
 *
 * A merchant's silhouette with one thing wrong with it: the apron, the money belt and the green
 * dealer's visor are exactly what you would expect behind a market counter, and then there is a
 * gun in his hand. The visor is the character — a hard flat brim across the top of the face that
 * catches the light, which is why the eyes underneath it read as squinting at a ledger even when
 * he is shooting at you.
 *
 * Two things drive the look. `setWealth` swells the coin halo and the belt as the purse fills, so
 * a rich Fortune is visibly worth robbing. `setGun` puts whichever weapon he has bought in his
 * right hand at full size, so the thing about to be fired is always on screen before it fires.
 */
export class FortuneAvatar extends BaseAvatar {
  /** 0 = broke, 1 = loaded. Lerped so the purse swells rather than pops. */
  private wealth = 0;
  private wealthTarget = 0;
  private gun: string | null = 'pistol';
  private golden = false;
  /** Ability tell, and the recoil kick on the drawn weapon. */
  private flare = 0;
  private recoil = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: FortuneColorFn, depth = 6) {
    super(scene, tint, depth, FORTUNE_AVATAR);
  }

  /** Purse fullness, 0–1. Drives the halo, the belt and the visor's glint. */
  setWealth(v: number): void { this.wealthTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Which weapon is in the hand, or null while reloading an empty one. */
  setGun(kind: string | null): void {
    this.gun = kind;
    this.golden = kind === 'golden';
  }

  /** Kick the drawn weapon back along the aim for a few frames. */
  kick(strength = 1): void { this.recoil = Math.min(1.4, this.recoil + strength); }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 380);
    this.recoil = Math.max(0, this.recoil - delta / 110);
    this.wealth += (this.wealthTarget - this.wealth) * Math.min(1, delta / 500);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.55 : 0.34);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new FortuneFx(this.scene, this.tint).coinBurst(x, y, 1, 8, 420, 4);
  }

  /** A spill of gold light on the floor, widening with the purse. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(FOR.brass), a * 0.4);
    g.fillEllipse(x, y + 16, 46 + this.wealth * 26, 15 + this.wealth * 5);
    g.fillStyle(this.tint(FOR.gold), a * (0.18 + this.wealth * 0.28));
    g.fillEllipse(x, y + 16, 26 + this.wealth * 20, 9 + this.wealth * 4);
  }

  /** Apron, money belt, and the coins tucked into it. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const sway = Math.sin(this.t * 1.9) * 1.3;

    // Apron: a trapezoid with a rounded hem and a big front pocket.
    g.fillStyle(this.tint(FOR.canvasShade), alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x - 8, y - 12),
      new Phaser.Geom.Point(x + 8, y - 12),
      new Phaser.Geom.Point(x + 11 + sway * 0.3, y + 15),
      new Phaser.Geom.Point(x - 11 + sway * 0.3, y + 15),
    ], true);
    g.fillStyle(this.tint(FOR.canvas), alpha * 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(x - 6.5, y - 11),
      new Phaser.Geom.Point(x + 6.5, y - 11),
      new Phaser.Geom.Point(x + 9 + sway * 0.3, y + 12),
      new Phaser.Geom.Point(x - 9 + sway * 0.3, y + 12),
    ], true);
    // Neck strap.
    g.lineStyle(1.6, this.tint(FOR.timber), alpha * 0.8);
    g.lineBetween(x - 5, y - 12, x - 3, y - 17);
    g.lineBetween(x + 5, y - 12, x + 3, y - 17);
    // Pocket, with a receipt corner sticking out of it.
    g.lineStyle(1.2, this.tint(FOR.canvasShade), alpha * 0.9);
    g.strokeRect(x - 6.5, y + 1, 13, 8);
    g.lineBetween(x, y + 1, x, y + 9);
    g.fillStyle(this.tint(FOR.hot), alpha * 0.85);
    g.fillPoints([
      new Phaser.Geom.Point(x + 2, y + 1),
      new Phaser.Geom.Point(x + 6, y + 1),
      new Phaser.Geom.Point(x + 5, y - 3),
    ], true);

    // Money belt across the waist, with coins in the loops. Fuller as the purse fills.
    g.fillStyle(this.tint(FOR.grip), alpha);
    g.fillRect(x - 10, y - 3, 20, 4.4);
    g.fillStyle(this.tint(FOR.brass), alpha);
    g.fillRect(x - 2.4, y - 3.4, 4.8, 5.2);
    const loops = 1 + Math.round(this.wealth * 3);
    for (let i = 0; i < loops; i++) {
      const s = i % 2 ? 1 : -1;
      const px = x + s * (5 + Math.floor(i / 2) * 4.2);
      bloodCoin(g, this.tint, px, y - 0.8, 2.9, alpha * 0.95,
        { spin: 0.5 + Math.sin(this.t * 1.3 + i) * 0.12, device: false });
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const lean = Math.cos(this.facing) * 2;

    // ── Dealer's visor ──
    // A hard flat brim across the top of the face with a translucent green panel under it. The
    // panel is the one place the element admits to being a bit crooked.
    g.fillStyle(this.tint(FOR.contraband), alpha * 0.45);
    g.fillPoints([
      new Phaser.Geom.Point(x - 12 + lean, crown + 4),
      new Phaser.Geom.Point(x + 12 + lean, crown + 4),
      new Phaser.Geom.Point(x + 9 + lean, crown + 11),
      new Phaser.Geom.Point(x - 9 + lean, crown + 11),
    ], true);
    g.fillStyle(this.tint(FOR.contraband), alpha);
    g.fillRect(x - 12 + lean, crown + 1.5, 24, 3.4);
    g.fillStyle(this.tint(FOR.neon), alpha * 0.7);
    g.fillRect(x - 12 + lean, crown + 1.5, 24, 1.2);
    // Headband and its buckle.
    g.lineStyle(2.2, this.tint(FOR.timber), alpha * 0.9);
    g.beginPath();
    g.arc(x, crown + 3, 12, Math.PI * 0.08, Math.PI * 0.92, false);
    g.strokePath();
    g.fillStyle(this.tint(FOR.gold), alpha * (0.6 + this.flare * 0.4));
    g.fillCircle(x + lean, crown, 2.2);

    // ── Coin halo ──
    // Three coins orbiting the crown, radius and speed both rising with the purse. The cheapest
    // possible read on "this person is currently worth killing".
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ph = this.t * (1.1 + this.wealth * 2.2) + (i / n) * TAU;
      const rr = 15 + this.wealth * 7;
      const px = x + Math.cos(ph) * rr;
      const py = crown - 4 + Math.sin(ph) * rr * 0.3;
      bloodCoin(g, this.tint, px, py, 4 + this.wealth * 1.4, alpha * (0.45 + this.wealth * 0.45),
        { spin: ph * 1.7, device: false });
    }

    // ── The weapon ──
    // Held in the right hand at its true size. `armX/armY` are protected on the rig, so the gun
    // is painted onto the hand rather than floating near it.
    if (this.gun) {
      const hx = this.armX[1];
      const hy = this.armY[1];
      if (this.golden) {
        g.fillStyle(this.tint(FOR.gold), alpha * (0.16 + this.flare * 0.2));
        g.fillCircle(hx, hy, 18);
      }
      gunShape(g, this.tint, hx, hy, this.facing, this.gun, alpha,
        { recoil: this.recoil, golden: this.golden });
    } else {
      // Reloading: a fresh magazine held up where the gun would be.
      const hx = this.armX[1];
      const hy = this.armY[1];
      g.fillStyle(this.tint(FOR.gunmetal), alpha * 0.9);
      g.fillRect(hx - 3, hy - 6, 6, 12);
      g.fillStyle(this.tint(FOR.brass), alpha * 0.9);
      g.fillRect(hx - 3, hy - 6, 6, 2.6);
    }

    // Mastered: a second coin halo running the other way, and a sovereign at the throat.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const ph = -this.t * 1.7 + (i / 3) * TAU + this.seed;
        bloodCoin(g, this.tint, x + Math.cos(ph) * 22, crown - 2 + Math.sin(ph) * 7, 3.4,
          alpha * 0.5, { spin: ph, device: false });
      }
      bloodCoin(g, this.tint, x, y - 13, 4.6, alpha * 0.95, { spin: this.t * 2 });
    }
  }

  /**
   * Two bespoke holds. `brace` is the two-handed shooting grip — both hands out along the aim,
   * the support hand tucked in behind the firing hand and neither of them wandering. `charge`
   * is the ultimate: hands cupped low in front, holding something that costs money to hold.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'brace') {
      return {
        ang: this.holdAngle + side * 0.2,
        dist: side > 0 ? 30 : 19,
        scale: idle.scale * 1.05,
      };
    }
    if (hold === 'ride') {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 9);
      return {
        ang: this.holdAngle + side * 0.34,
        dist: 27 + pulse * 4,
        scale: idle.scale * (1.15 + pulse * 0.2),
      };
    }
    return null;
  }
}
