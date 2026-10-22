import Phaser from 'phaser';
import { ColorFn, FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * Rockstar skin (Sound) — the concert gear that replaces the marching band's.
 *
 * Visual only: every painter here takes the same anchor, footprint and timing inputs as the
 * SoundVisuals painter it stands in for (`drawBaton` → `drawGuitar`, `drawStage` →
 * `drawRockStage`, `drawGong` → `drawGiantCymbal`, `noteShot` → `boltShot`, `fanfare` →
 * `pyro`), so the kit branches the drawing on the owner's skin and nothing else changes.
 *
 * Colours are the skin's final palette, used raw — a skin's own art never goes back through
 * the element's remap. Song colours arrive already mapped by the caller.
 */

export const ROCK = {
  black: 0x0c0912,
  leather: 0x1a1422,
  leatherHi: 0x3a2f4a,
  leatherLit: 0x5a4a6e,
  pink: 0xff2d95,
  pinkHi: 0xff7cc0,
  pinkPale: 0xffc8ea,
  pinkDeep: 0x8a1456,
  purple: 0x8a2be2,
  purpleHi: 0xb36bff,
  purplePale: 0xdcb8ff,
  purpleDeep: 0x2e0c52,
  chrome: 0xeef0f8,
  chromeMid: 0xb4bacb,
  steel: 0x6c7086,
  steelDark: 0x353849,
  skin: 0xf4e2ea,
  skinShade: 0xd8bccb,
  stubble: 0x2a2232,
  wood: 0xe2c79a,
  woodShade: 0x9c7a4c,
  ebony: 0x231a1c,
  white: 0xffffff,
  shadow: 0x050309,
};

interface Pt { x: number; y: number }

export function rockFill(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
}

function rockStroke(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** A five-point star, `r` outer radius. */
export function rockStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot = -Math.PI / 2): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  rockFill(g, pts);
}

/** A flat lightning-bolt glyph (the logo), `h` tall, built as one tapered polygon. */
export function boltGlyph(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, lean = 0): void {
  const s = h / 20;
  const p = (px: number, py: number): Pt => ({ x: x + (px + py * lean) * s, y: y + py * s });
  rockFill(g, [p(2, -10), p(-6, 1), p(-0.5, 1), p(-3, 10), p(6, -2), p(0.5, -2), p(4, -10)]);
}

/** A jagged lightning line from a to b, re-rolled from `seed`. */
function boltLine(
  g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
  segs: number, jitter: number, seed: number,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts: Pt[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const j = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const off = ((j - Math.floor(j)) - 0.5) * 2 * jitter;
    pts.push({ x: x1 + dx * u + nx * off, y: y1 + dy * u + ny * off });
  }
  pts.push({ x: x2, y: y2 });
  rockStroke(g, pts);
}

// ── Per-frame painters ──────────────────────────────────────────────────

/**
 * The flying electric guitar, standing in for the drum major's baton: a jagged hot-pink body
 * with a black pickguard, chrome pickups and bridge, an ebony neck with chrome frets, and a
 * pointed headstock — spun about its balance point. Same footprint as the baton (~40px end to
 * end) and the same spin reads: ghosts, a blur disc, and sparks — lightning here — at speed.
 */
export function drawGuitar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, rot: number, spin: number, t: number, alpha = 1,
  song: number = ROCK.pink, scale = 1, shadow = true,
): void {
  if (alpha <= 0.01) return;
  const lift = (10 + Math.sin(t * 3) * 1.5) * scale;
  const cy = y - lift;
  const S = scale;

  if (shadow) {
    g.fillStyle(ROCK.shadow, alpha * 0.32);
    g.fillEllipse(x, y + 4, (26 + spin * 16) * S, 7 * S);
  }
  if (spin > 0.15) {
    g.fillStyle(song, alpha * 0.12 * spin);
    g.fillCircle(x, cy, 25 * S);
    g.lineStyle(1.5, ROCK.purpleHi, alpha * 0.4 * spin);
    g.strokeCircle(x, cy, 21 * S);
  }

  const body = (a: number, al: number, ghost: boolean): void => {
    const cos = Math.cos(a), sin = Math.sin(a);
    // Guitar-local (u along the neck toward the headstock, v across) → world.
    const L = (u: number, v: number): Pt => ({ x: x + (cos * u - sin * v) * S, y: cy + (sin * u + cos * v) * S });
    const shape: [number, number][] = [
      [-21, -3], [-20, -8], [-15, -12], [-10, -8], [-6, -11], [-3.5, -7], [-5, -3],
      [-5, 3], [-3.5, 6.5], [-7, 11], [-12, 9], [-18, 10.5], [-21.5, 5],
    ];
    if (ghost) {
      g.fillStyle(song, al);
      rockFill(g, shape.map(([u, v]) => L(u, v)));
      g.lineStyle(2.2 * S, song, al);
      rockStroke(g, [L(-5, 0), L(20, 0)]);
      return;
    }
    // Black edge, then the pink body, then a lit bevel on one horn.
    g.fillStyle(ROCK.black, al);
    rockFill(g, shape.map(([u, v]) => L(u * 1.08 + 0.4, v * 1.12)));
    g.fillStyle(ROCK.pink, al);
    rockFill(g, shape.map(([u, v]) => L(u, v)));
    g.fillStyle(ROCK.pinkHi, al * 0.75);
    rockFill(g, [L(-19, -4), L(-18, -8), L(-15, -10.5), L(-12, -7.5), L(-15, -5)]);
    // Pickguard with a lightning decal.
    g.fillStyle(ROCK.black, al);
    rockFill(g, [L(-17, -2), L(-13, -6.5), L(-6.5, -4.5), L(-6.5, 4), L(-10, 7), L(-16, 4)]);
    g.fillStyle(ROCK.purpleHi, al);
    const d0 = L(-11.5, 0.5);
    boltGlyph(g, d0.x, d0.y, 8 * S, 0);
    // Pickups and the bridge.
    for (const u of [-14.5, -9]) {
      g.lineStyle(2.6 * S, ROCK.chromeMid, al);
      rockStroke(g, [L(u, -3.6), L(u, 3.6)]);
      g.lineStyle(1 * S, ROCK.white, al * 0.8);
      rockStroke(g, [L(u - 0.4, -3.2), L(u - 0.4, 3.2)]);
    }
    g.lineStyle(1.8 * S, ROCK.chrome, al);
    rockStroke(g, [L(-18.5, -2.6), L(-18.5, 2.6)]);
    // Neck and frets.
    g.lineStyle(4.2 * S, ROCK.ebony, al);
    rockStroke(g, [L(-6, 0), L(15.5, 0)]);
    g.lineStyle(1 * S, ROCK.chromeMid, al * 0.9);
    for (let u = -2; u < 15; u += 3.2) rockStroke(g, [L(u, -1.9), L(u, 1.9)]);
    // Headstock: a pointed hockey-stick with three pegs a side.
    g.fillStyle(ROCK.black, al);
    rockFill(g, [L(15, -2.4), L(22.5, -4.5), L(24, -1), L(15, 2.4)]);
    g.fillStyle(ROCK.pink, al);
    rockFill(g, [L(15.6, -1.7), L(22, -3.6), L(23, -1.3), L(15.6, 1.7)]);
    g.fillStyle(ROCK.chrome, al);
    for (const u of [17, 19, 21]) {
      const p = L(u, -3.6 - (u - 17) * 0.25);
      g.fillCircle(p.x, p.y, 0.9 * S);
    }
    // Strings, bridge to nut.
    g.lineStyle(0.6 * S, ROCK.chrome, al * 0.75);
    for (const v of [-1, 0, 1]) rockStroke(g, [L(-18.5, v * 1.2), L(15, v * 0.9)]);
    // A strap end-pin glint.
    const pin = L(-21.5, 0);
    g.fillStyle(ROCK.white, al * 0.9);
    g.fillCircle(pin.x, pin.y, 1.1 * S);
  };

  const ghosts = spin > 0.12 ? Math.round(1 + spin * 3) : 0;
  for (let i = ghosts; i >= 1; i--) {
    body(rot - i * (0.16 + spin * 0.22), alpha * 0.18 * (1 - i / (ghosts + 1)), true);
  }
  body(rot, alpha, false);

  // Lightning arcs cracking off the body at speed.
  if (spin > 0.45) {
    const n = Math.round(spin * 3);
    for (let i = 0; i < n; i++) {
      const a = rot + Math.PI - i * 0.7 - 0.3;
      const r1 = 18 * S, r2 = (27 + i * 3) * S;
      g.lineStyle(1.4, i % 2 ? ROCK.purplePale : song, alpha * (0.85 - i * 0.18));
      boltLine(g, x + Math.cos(a) * r1, cy + Math.sin(a) * r1, x + Math.cos(a - 0.3) * r2, cy + Math.sin(a - 0.3) * r2,
        3, 2.4, Math.floor(t * 18) + i);
    }
  }
}

/**
 * The concert stage for the solo, in the footprint of the marching riser (128 wide, anchored on
 * the lip): a black deck with a chrome trim and a lightning banner across the front, an amp
 * stack standing at each end, sweeping pink and purple lights from above, and fog at the lip.
 */
export function drawRockStage(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, alpha = 1): void {
  if (alpha <= 0.01) return;
  const w = 128, halfW = w / 2;
  // Light rig: four cones sweeping on their own phases, under everything.
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const sx = x + side * (120 + (i % 2) * 34);
    const aim = x + Math.sin(t * (0.8 + i * 0.27) + i * 1.7) * 46;
    g.fillStyle(i % 2 ? ROCK.purpleHi : ROCK.pinkHi, alpha * 0.09);
    rockFill(g, [{ x: sx - 8, y: y - 240 }, { x: sx + 8, y: y - 240 }, { x: aim + 30, y: y + 6 }, { x: aim - 30, y: y + 6 }]);
  }
  g.fillStyle(ROCK.pinkHi, alpha * 0.12);
  g.fillEllipse(x, y + 2, 92, 26);

  g.fillStyle(ROCK.shadow, alpha * 0.5);
  g.fillEllipse(x, y + 22, w * 1.2, 20);

  // Amp stacks: two cabinets each, a speaker grille with four cones, chrome corners, a logo plate.
  for (const side of [-1, 1]) {
    const ax = x + side * (halfW - 15);
    const bw = 28;
    for (let k = 0; k < 2; k++) {
      const top = y - 10 - (k + 1) * 22;
      g.fillStyle(ROCK.black, alpha);
      g.fillRect(ax - bw / 2, top, bw, 22);
      g.fillStyle(ROCK.leather, alpha);
      g.fillRect(ax - bw / 2 + 2, top + 2, bw - 4, 18);
      for (const [cx, cyy] of [[-6, 6], [6, 6], [-6, 15], [6, 15]]) {
        const pump = 1 + Math.max(0, Math.sin(t * 9 + k + cx)) * 0.12;
        g.fillStyle(ROCK.steelDark, alpha);
        g.fillCircle(ax + cx, top + cyy, 4.4 * pump);
        g.fillStyle(ROCK.black, alpha);
        g.fillCircle(ax + cx, top + cyy, 2.6 * pump);
        g.fillStyle(ROCK.steel, alpha);
        g.fillCircle(ax + cx - 0.6, top + cyy - 0.6, 1);
      }
      g.fillStyle(ROCK.chrome, alpha);
      for (const [cx, cyy] of [[-bw / 2, 0], [bw / 2, 0], [-bw / 2, 22], [bw / 2, 22]]) g.fillRect(ax + cx - 1.5, top + cyy - 1.5, 3, 3);
    }
    // The head unit on top, with a glowing pink logo and knobs.
    const ht = y - 10 - 44 - 9;
    g.fillStyle(ROCK.black, alpha);
    g.fillRect(ax - 15, ht, 30, 9);
    g.fillStyle(ROCK.pink, alpha * (0.7 + 0.3 * Math.sin(t * 6 + side)));
    g.fillRect(ax - 11, ht + 2, 9, 3);
    g.fillStyle(ROCK.chromeMid, alpha);
    for (let i = 0; i < 4; i++) g.fillCircle(ax + 2 + i * 3.2, ht + 4.5, 1);
  }

  // Deck: black boards, a chrome lip, and the face with a lightning banner.
  g.fillStyle(ROCK.black, alpha);
  g.fillRect(x - halfW, y + 2, w, 18);
  g.fillStyle(ROCK.leather, alpha);
  g.fillRect(x - halfW, y - 8, w, 11);
  g.lineStyle(1, ROCK.leatherHi, alpha * 0.7);
  for (let i = 1; i < 6; i++) g.lineBetween(x - halfW + i * (w / 6), y - 8, x - halfW + i * (w / 6), y + 3);
  g.lineStyle(2, ROCK.chrome, alpha);
  g.lineBetween(x - halfW, y - 8, x + halfW, y - 8);
  g.lineStyle(1.4, ROCK.chromeMid, alpha);
  g.lineBetween(x - halfW, y + 2.5, x + halfW, y + 2.5);
  // Hazard-stripe kick plate in pink and black.
  for (let i = 0; i < 16; i++) {
    const sx = x - halfW + i * 8;
    g.fillStyle(i % 2 ? ROCK.pinkDeep : ROCK.black, alpha);
    rockFill(g, [{ x: sx, y: y + 20 }, { x: sx + 4, y: y + 14 }, { x: sx + 12, y: y + 14 }, { x: sx + 8, y: y + 20 }]);
  }
  // Banner: a bolt either side of a star.
  g.fillStyle(ROCK.purpleHi, alpha);
  boltGlyph(g, x - 26, y + 9, 14, 0.15);
  boltGlyph(g, x + 26, y + 9, 14, -0.15);
  g.fillStyle(ROCK.pink, alpha);
  rockStar(g, x, y + 9, 7, -Math.PI / 2 + Math.sin(t * 2) * 0.1);

  // Footlights, pink and purple on alternating beats.
  for (let i = 0; i < 6; i++) {
    const lx = x - halfW + (i + 0.5) * (w / 6);
    const lit = 0.4 + 0.6 * Math.max(0, Math.sin(t * 6 + i * 1.6));
    const c = i % 2 ? ROCK.purpleHi : ROCK.pinkHi;
    g.fillStyle(c, alpha * lit * 0.35);
    g.fillCircle(lx, y - 8, 7);
    g.fillStyle(ROCK.white, alpha * lit);
    g.fillCircle(lx, y - 8, 2.2);
  }
  // Fog rolling off the lip.
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.25 + i / 5) % 1;
    const fx = x - halfW + p * w;
    g.fillStyle(ROCK.purplePale, alpha * 0.08 * Math.sin(p * Math.PI));
    g.fillEllipse(fx, y + 4, 40, 12);
  }
}

/**
 * The drum kit the rockstar plays the solo on, painted in front of the body (front view):
 * kick drum with a bolt on its head, two rack toms, snare, floor tom, hi-hat and a crash
 * on a boom. `hit` (0 → 1, decaying) shakes the cymbals and lights the kick on a landed note;
 * `beat` is the kit's own running stroke clock so the cymbals breathe between hits.
 */
export function drawDrumKit(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, dir: 1 | -1, t: number, alpha: number, hit: number,
): void {
  if (alpha <= 0.01) return;
  const crashX = x + dir * 26, hatX = x - dir * 26;
  const wob = Math.sin(t * 30) * hit * 0.35 + Math.sin(t * 7) * 0.05;

  // Stands: chrome posts from the floor up to each cymbal.
  g.lineStyle(1.6, ROCK.steel, alpha);
  g.lineBetween(crashX, y + 30, crashX - dir * 2, y - 11);
  g.lineBetween(hatX, y + 30, hatX, y - 1);
  for (const sx of [crashX, hatX]) {
    g.lineBetween(sx, y + 30, sx - 5, y + 33);
    g.lineBetween(sx, y + 30, sx + 5, y + 33);
  }

  // Kick drum.
  const kx = x, ky = y + 18, kr = 13;
  g.fillStyle(ROCK.shadow, alpha * 0.4);
  g.fillEllipse(kx, y + 31, 40, 6);
  g.fillStyle(ROCK.black, alpha);
  g.fillCircle(kx, ky, kr + 1.6);
  g.fillStyle(ROCK.chromeMid, alpha);
  g.fillCircle(kx, ky, kr + 0.6);
  g.fillStyle(ROCK.leather, alpha);
  g.fillCircle(kx, ky, kr - 0.8);
  g.fillStyle(ROCK.pink, alpha * (0.25 + hit * 0.5));
  g.fillCircle(kx, ky, kr - 2);
  g.fillStyle(hit > 0.3 ? ROCK.pinkPale : ROCK.pink, alpha);
  boltGlyph(g, kx, ky, 16, 0.1);
  g.fillStyle(ROCK.chrome, alpha);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    g.fillCircle(kx + Math.cos(a) * (kr + 0.6), ky + Math.sin(a) * (kr + 0.6), 0.9);
  }

  // A drum: shell (a short barrel) under an ellipse head, chrome hoop.
  const drum = (dx: number, dy: number, w: number, h: number, shell: number): void => {
    g.fillStyle(ROCK.black, alpha);
    g.fillRect(dx - w / 2, dy, w, shell);
    g.fillEllipse(dx, dy + shell, w, h);
    g.fillStyle(ROCK.purple, alpha);
    g.fillRect(dx - w / 2 + 1, dy, w - 2, shell - 1);
    g.fillStyle(ROCK.purpleHi, alpha * 0.6);
    g.fillRect(dx - w / 2 + 2, dy + 0.5, 2.5, shell - 2);
    g.fillStyle(ROCK.chromeMid, alpha);
    g.fillEllipse(dx, dy, w + 1, h + 1);
    g.fillStyle(ROCK.chrome, alpha);
    g.fillEllipse(dx, dy, w - 1.5, h - 1.2);
    g.fillStyle(ROCK.white, alpha * 0.9);
    g.fillEllipse(dx - w * 0.15, dy - h * 0.12, w * 0.35, h * 0.3);
  };
  drum(x - 7, y + 4, 12, 4.4, 5);
  drum(x + 7, y + 4, 12, 4.4, 5);
  drum(x - dir * 18, y + 9, 15, 5, 6);
  drum(x + dir * 18, y + 13, 16, 5.5, 9);

  // Cymbals: thin bronze-chrome discs with a bell, tilted toward the drummer.
  const cymbal = (cx: number, cyy: number, w: number, tilt: number): void => {
    const h = w * 0.24;
    const ty = cyy + tilt * w * 0.3;
    g.fillStyle(ROCK.steelDark, alpha);
    rockFill(g, [{ x: cx - w / 2, y: cyy - tilt * w * 0.3 + 1 }, { x: cx, y: ty - h / 2 + 1 }, { x: cx + w / 2, y: ty + tilt * w * 0.3 + 1 }, { x: cx, y: ty + h / 2 + 1 }]);
    g.fillStyle(ROCK.chromeMid, alpha);
    rockFill(g, [{ x: cx - w / 2, y: cyy - tilt * w * 0.3 }, { x: cx, y: ty - h / 2 }, { x: cx + w / 2, y: ty + tilt * w * 0.3 }, { x: cx, y: ty + h / 2 }]);
    g.fillStyle(ROCK.chrome, alpha);
    g.fillEllipse(cx, ty - 0.6, w * 0.32, h * 0.6);
    g.fillStyle(ROCK.white, alpha);
    g.fillCircle(cx, ty - 1, 1.1);
  };
  cymbal(hatX, y - 1, 16, wob * 0.5);
  cymbal(hatX, y + 1.2, 16, 0);
  cymbal(crashX, y - 12, 21, -dir * 0.25 + wob);

  // Crash shimmer on a landed note.
  if (hit > 0.05) {
    g.lineStyle(1.4, ROCK.pinkPale, alpha * hit);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 3;
      g.lineBetween(crashX + Math.cos(a) * 9, y - 12 + Math.sin(a) * 4, crashX + Math.cos(a) * (14 + hit * 8), y - 12 + Math.sin(a) * (6 + hit * 5));
    }
  }
}

/**
 * Big Finish's struck instrument: a giant crash cymbal on a chrome boom in the gong's exact
 * footprint (disc radius `26 + flair·10`, same anchor), and a giant drumstick doing the
 * gong mallet's swing.
 */
export function drawGiantCymbal(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, dir: 1 | -1, swing: number, ring: number, flair: number, alpha = 1,
): void {
  if (alpha <= 0.01) return;
  const r = 26 + flair * 10;
  const shake = ring > 0 ? Math.sin(ring * 0.09) * Math.max(0, 1 - ring / 900) * 3 : 0;
  const tilt = ring > 0 ? Math.sin(ring * 0.05) * Math.max(0, 1 - ring / 1200) * 0.35 : 0;
  const gx = x + shake, gy = y - 6;
  // Tripod stand and boom.
  g.fillStyle(ROCK.shadow, alpha * 0.35);
  g.fillEllipse(x, y + r + 14, r * 2.6, 9);
  g.lineStyle(3.4, ROCK.steelDark, alpha);
  g.lineBetween(x, y + r + 12, x, gy + 4);
  g.lineBetween(x, y + r + 12, x - r * 0.7, y + r + 16);
  g.lineBetween(x, y + r + 12, x + r * 0.7, y + r + 16);
  g.lineStyle(1.6, ROCK.chrome, alpha * 0.8);
  g.lineBetween(x - 1, y + r + 12, x - 1, gy + 4);
  if (ring > 0) {
    g.fillStyle(ROCK.pinkHi, alpha * Math.max(0, 0.45 - ring / 2000));
    g.fillCircle(gx, gy, r + 12);
  }
  // The disc, seen tilted: an ellipse that rocks on the strike, lathe rings and a bell.
  const h = r * (1.15 + tilt);
  g.fillStyle(ROCK.steelDark, alpha);
  g.fillEllipse(gx, gy + 1.5, r * 2 + 3, h + 3);
  g.fillStyle(ROCK.chromeMid, alpha);
  g.fillEllipse(gx, gy, r * 2, h);
  g.lineStyle(1, ROCK.chrome, alpha * 0.55);
  for (let i = 1; i <= 4; i++) g.strokeEllipse(gx, gy, r * 2 * (0.2 + i * 0.19), h * (0.2 + i * 0.19));
  g.fillStyle(ROCK.chrome, alpha);
  g.fillEllipse(gx, gy, r * 0.55, h * 0.3);
  g.fillStyle(ROCK.white, alpha * 0.8);
  g.fillEllipse(gx - r * 0.42, gy - h * 0.25, r * 0.6, h * 0.12);
  g.fillStyle(ROCK.pink, alpha);
  boltGlyph(g, gx + r * 0.45, gy + h * 0.12, r * 0.35, 0.1);
  if (ring > 0) {
    for (let k = 0; k < 3; k++) {
      const u = ((ring / 700) + k / 3) % 1;
      const life = Math.max(0, 1 - ring / 1400);
      g.lineStyle(2.4 - u * 1.6, k % 2 ? ROCK.pinkHi : ROCK.purplePale, alpha * life * (1 - u));
      g.strokeEllipse(gx, gy, (r + 6 + u * (60 + flair * 70)) * 2, (r + 6 + u * (60 + flair * 70)) * 1.3);
    }
  }
  // The drumstick: same pivot and arc as the gong mallet.
  const px = x - dir * (r + 30), py = y - 4;
  const back = -dir * 2.2;
  const k = ring > 0 ? 1 : swing;
  const a = ring > 0 ? Math.sin(Math.min(1, ring / 160) * Math.PI) * -dir * 0.25
    : back * easeOut(Math.min(1, k * 1.6)) * (1 - easeIn(Math.max(0, (k - 0.62) / 0.38)));
  const len = r + 24;
  const ca = dir > 0 ? a : Math.PI + a;
  const hx = px + Math.cos(ca) * len, hy = py + Math.sin(ca) * len;
  g.lineStyle(5, ROCK.woodShade, alpha);
  g.lineBetween(px, py, hx, hy);
  g.lineStyle(3, ROCK.wood, alpha);
  g.lineBetween(px, py, hx, hy);
  g.lineStyle(5.4, ROCK.black, alpha);
  g.lineBetween(px, py, px + Math.cos(ca) * 10, py + Math.sin(ca) * 10);
  g.fillStyle(ROCK.wood, alpha);
  g.fillEllipse(hx, hy, 7, 5);
  g.fillStyle(ROCK.white, alpha * 0.6);
  g.fillCircle(hx - 1, hy - 1, 1.4);
}

// ── One-shots ───────────────────────────────────────────────────────────

export class RockstarFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * A solo hit flown at its target in `noteShot`'s exact path and timing (300ms bezier, then an
   * impact): a spinning pink star with a lightning tail, landing in a star-burst.
   */
  boltShot(x1: number, y1: number, x2: number, y2: number, color: number, big = false, depth = 12): void {
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 60 - Math.random() * 50;
    const seed = Math.random() * 100;
    const at = (u: number): Pt => ({
      x: (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2,
      y: (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2,
    });
    this.anim(depth, 300, (g, t) => {
      const u = easeIn(t);
      const head = at(u);
      // Tail: jagged lightning back along the path.
      const tail: Pt[] = [];
      for (let i = 0; i <= 6; i++) {
        const uu = Math.max(0, u - i * 0.05);
        const p = at(uu);
        const j = Math.sin(seed + i * 4.1 + t * 30) * (i === 0 ? 0 : 3.2);
        tail.push({ x: p.x + j, y: p.y - j * 0.6 });
      }
      g.lineStyle(big ? 4 : 3, color, 0.45);
      rockStroke(g, tail);
      g.lineStyle(big ? 1.8 : 1.3, ROCK.white, 0.9);
      rockStroke(g, tail);
      g.fillStyle(color, 0.28);
      g.fillCircle(head.x, head.y, big ? 13 : 9);
      g.fillStyle(ROCK.pink, 1);
      rockStar(g, head.x, head.y, big ? 9 : 7, t * 9);
      g.fillStyle(ROCK.pinkPale, 1);
      rockStar(g, head.x, head.y, big ? 4.5 : 3.4, t * 9);
    });
    this.scene.time.delayedCall(300, () => this.starBurst(x2, y2, big ? 34 : 24, color, depth - 2));
  }

  /** The impact: a ring, eight star spikes and two lightning forks. */
  starBurst(x: number, y: number, radius: number, color: number, depth = 10): void {
    const seed = Math.random() * 100;
    this.anim(depth, 300, (g, t) => {
      const fade = 1 - t;
      const r = radius * easeOut(t);
      g.fillStyle(color, 0.3 * fade);
      g.fillCircle(x, y, r);
      g.lineStyle(2.4 * fade + 0.4, ROCK.pinkHi, 0.9 * fade);
      g.strokeCircle(x, y, r);
      g.fillStyle(ROCK.pinkPale, 0.9 * fade);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + seed;
        const rr = r * (i % 2 ? 0.8 : 1.15);
        rockFill(g, [
          { x: x + Math.cos(a - 0.12) * r * 0.3, y: y + Math.sin(a - 0.12) * r * 0.3 },
          { x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr },
          { x: x + Math.cos(a + 0.12) * r * 0.3, y: y + Math.sin(a + 0.12) * r * 0.3 },
        ]);
      }
      g.lineStyle(1.4, ROCK.purplePale, fade);
      for (let k = 0; k < 2; k++) {
        const a = seed + k * Math.PI + 0.6;
        boltLine(g, x, y, x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, 4, 3, seed + k);
      }
    });
  }

  /** The crash cymbal ringing on a landed solo note: shimmer lines and a flash off the edge. */
  crash(x: number, y: number, big = false, depth = 11): void {
    this.anim(depth, big ? 320 : 220, (g, t) => {
      const fade = 1 - t;
      const r = (big ? 22 : 14) * easeOut(t) + 6;
      g.fillStyle(ROCK.pinkPale, 0.3 * fade);
      g.fillEllipse(x, y, r * 2, r * 0.9);
      g.lineStyle(1.6, ROCK.white, 0.9 * fade);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.lineBetween(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.22, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.45);
      }
    });
  }

  /**
   * Taking the stage (stands in for `fanfare`): the light rig slams on in pink and purple, two
   * spark fountains go up either side, and a pair of lightning bolts strike the stage.
   */
  pyro(x: number, y: number, depth = 10): void {
    const seed = Math.random() * 100;
    this.anim(depth, 800, (g, t) => {
      const fade = 1 - t;
      for (const side of [-1, 1]) {
        g.fillStyle(side < 0 ? ROCK.pinkHi : ROCK.purpleHi, 0.2 * fade);
        rockFill(g, [
          { x: x + side * 120, y: y - 220 }, { x: x + side * 100, y: y - 220 },
          { x: x - 40 * side, y: y + 18 }, { x: x + 40 * side * 0.2, y: y + 18 },
        ]);
        // Spark fountain off each end of the stage.
        const fx = x + side * 52;
        for (let i = 0; i < 9; i++) {
          const p = (t * 1.6 + i / 9) % 1;
          const sx = fx + Math.sin(seed + i * 2.3) * 10 * p;
          const sy = y + 10 - p * 70 + p * p * 30;
          g.fillStyle(i % 3 ? ROCK.pinkPale : ROCK.white, fade * (1 - p));
          g.fillCircle(sx, sy, 1.8 * (1 - p * 0.5));
        }
      }
      if (t < 0.4) {
        const k = 1 - t / 0.4;
        for (const side of [-1, 1]) {
          g.lineStyle(4, ROCK.purpleHi, 0.5 * k);
          boltLine(g, x + side * 30, y - 160, x + side * 10, y - 8, 7, 9, seed + side);
          g.lineStyle(1.6, ROCK.white, k);
          boltLine(g, x + side * 30, y - 160, x + side * 10, y - 8, 7, 9, seed + side);
        }
      }
    });
  }
}
