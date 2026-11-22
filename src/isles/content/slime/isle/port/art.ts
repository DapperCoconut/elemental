import type { Pt, Rect } from '../../../../IslesTypes';
import { type G, blob, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';
import { poly } from '../../../water/isle/port/art';

/**
 * Stilthaven's palette and set pieces — the stilt harbour at the mire's edge.
 *
 * Everything in Stilthaven stands on legs over black water: the boardwalks, the houses, the Draught
 * House, even the bakery, which is built round one of the white fangs that stand out of the mire.
 * The palette is wet: tarred plank-browns, mangrove grey-greens, bone-white fang rock, the bruise
 * purple of the Matriarch's cloth, venom green where something drips, and warm lamplight in the murk.
 * Set pieces take `x,y` as their base/feet point and draw upward, as the world's pieces expect.
 */

// ── Palette ─────────────────────────────────────────────────────────

/** The mire: black water with a green-brown depth to it. */
export const MIRE = 0x0f1a13;
export const MIRE_DEEP = 0x070d09;
export const MIRE_SHEEN = 0x2a3e26;
export const SCUM = 0x3e5a22;
export const SCUM_LIT = 0x6a8a2e;
/** The sea past the Mooring Walk — darker and colder than any sea before the Breakwater. */
export const SEA = 0x14302e;
export const SEA_SHALLOW = 0x1c3e38;
export const SEA_DEEP = 0x0a1c1c;
export const FOAM = 0xc6d8c0;
/** The firm bank: peat and root mud. */
export const PEAT = 0x2a2418;
export const PEAT_ALT = 0x352c1c;
export const MUD = 0x3e3424;
export const MUD_WET = 0x262418;
/** Tarred boardwalk planks. */
export const PLANK = 0x5a4632;
export const PLANK_ALT = 0x4c3c2a;
export const PLANK_DARK = 0x231a12;
export const PLANK_LIT = 0x7e6646;
/** Mangrove bark and leaf. */
export const BARK = 0x4a4232;
export const BARK_DARK = 0x231f16;
export const BARK_LIT = 0x6e6650;
export const LEAF = 0x2a4a24;
export const LEAF_DARK = 0x162a16;
export const LEAF_LIT = 0x4e7a32;
/** Fang rock: the old white teeth of something vast. */
export const BONE = 0xe4ddc6;
export const BONE_SHADE = 0xa89f86;
export const BONE_DARK = 0x6a6452;
/** Venom. */
export const VENOM = 0x8ad040;
export const VENOM_LIT = 0xd0f070;
export const VENOM_DARK = 0x3e6a18;
/** The Matriarch's cloth: bruise purple. */
export const BRUISE = 0x5a3a5c;
export const BRUISE_DARK = 0x2e1e30;
export const BRUISE_LIT = 0x8a6a8c;
/** Lamplight in the murk. */
export const LAMP = 0xffc870;
export const LAMP_HOT = 0xffe8b0;
export const HONEY = 0xe8a828;
export const HONEY_DARK = 0x8a5a14;
export const COPPER = 0x4a9a7a;
export const COPPER_DARK = 0x24584a;
export const BRASS = 0xc8a050;
export const WEB = 0xdcdcd0;
export const ROPE = 0x9a8a62;
export const IRON = 0x2e2c2a;

export { poly };

/** True when a point is inside a rect. */
export const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ── Small pieces ────────────────────────────────────────────────────

/** A rope sagging between two points (a quadratic dip), drawn as a short polyline. */
export function sag(g: G, a: Pt, b: Pt, dip: number, w: number, color: number, alpha = 1): void {
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(a.x, a.y);
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    g.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * dip);
  }
  g.strokePath();
}

/**
 * The Matriarch's seal: a serpent coiled in a ring, its head turned in to the two fang-punctures at the
 * centre — the Mark, as it is scarred on every wrist on Fangmire. Painted on every door she owns.
 */
export function coilSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.22), color, a);
  g.beginPath(); g.arc(x, y, r, -Math.PI * 0.35, Math.PI * 1.5, false); g.strokePath();
  // The head, turned inward.
  const hx = x + Math.cos(-Math.PI * 0.35) * r, hy = y + Math.sin(-Math.PI * 0.35) * r;
  g.fillStyle(color, a);
  g.fillEllipse(hx - r * 0.18, hy + r * 0.2, r * 0.5, r * 0.36);
  // Tail tip curling past it.
  g.lineStyle(Math.max(1, r * 0.12), color, a);
  g.lineBetween(x, y - r, x + r * 0.2, y - r * 0.82);
  // The Mark: two punctures.
  g.fillCircle(x - r * 0.24, y + r * 0.05, Math.max(1.2, r * 0.13));
  g.fillCircle(x + r * 0.24, y + r * 0.05, Math.max(1.2, r * 0.13));
}

/** An orb-web strung between anchor points: spokes then a spiral, dew-beaded. */
export function web(g: G, x: number, y: number, r: number, rng: () => number, a = 0.5): void {
  const spokes = 9 + Math.floor(rng() * 4);
  g.lineStyle(0.8, WEB, a);
  for (let i = 0; i < spokes; i++) {
    const ang = (i / spokes) * Math.PI * 2 + rng() * 0.2;
    g.lineBetween(x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.9);
  }
  g.lineStyle(0.6, WEB, a * 0.8);
  for (let ring = 1; ring <= 5; ring++) {
    const rr = (ring / 5.5) * r;
    g.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const ang = (i / spokes) * Math.PI * 2;
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.9;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  for (let k = 0; k < 5; k++) { g.fillStyle(0xffffff, a * 0.8); g.fillCircle(x + (rng() - 0.5) * r, y + (rng() - 0.5) * r * 0.8, 0.9); }
}

/** A snake lying coiled in three loops, head up off the coil. Seen from above-front. */
export function coiledSnake(g: G, x: number, y: number, s: number, body: number, belly = 0xd8d0a0): void {
  shadow(g, x, y + 2 * s, 30 * s, 9 * s, 0.3);
  for (let i = 0; i < 3; i++) {
    const rx = (14 - i * 3.6) * s, ry = (6 - i * 1.4) * s, cy = y - i * 4 * s;
    g.lineStyle(5 * s, dim(body, 0.35), 1); g.strokeEllipse(x, cy + 1, rx * 2, ry * 2);
    g.lineStyle(4 * s, body, 1); g.strokeEllipse(x, cy, rx * 2, ry * 2);
    g.lineStyle(1.2 * s, lit(body, 0.3), 0.7);
    g.beginPath(); g.arc(x, cy, rx, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
  }
  // Neck rising off the top coil, head with the yellow eye.
  g.lineStyle(4 * s, body, 1);
  g.lineBetween(x + 3 * s, y - 10 * s, x + 6 * s, y - 20 * s);
  g.fillStyle(body, 1); g.fillEllipse(x + 8 * s, y - 22 * s, 9 * s, 6 * s);
  g.fillStyle(belly, 0.7); g.fillEllipse(x + 7 * s, y - 19 * s, 5 * s, 2 * s);
  g.fillStyle(0xf0d040, 1); g.fillCircle(x + 10 * s, y - 23 * s, 1.2 * s);
  g.lineStyle(0.8 * s, 0xc83a3a, 1); g.lineBetween(x + 12 * s, y - 22 * s, x + 15 * s, y - 21 * s);
}

/** A boardwalk lamp: a crooked pole, a cross-arm and a caged lantern hung off it. */
export function walkLamp(g: G, x: number, y: number, h = 58): void {
  shadow(g, x, y + 1, 16, 5);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 2.5, y - h, 5, h);
  g.fillStyle(BARK_LIT, 0.5); g.fillRect(x - 2.5, y - h, 1.5, h);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 2, y - h, 18, 3);
  g.lineStyle(1, IRON, 1); g.lineBetween(x + 14, y - h + 3, x + 14, y - h + 9);
  glow(g, x + 14, y - h + 16, 26, LAMP, 0.07, 4);
  g.fillStyle(IRON, 1); g.fillRect(x + 8, y - h + 9, 12, 2); g.fillRect(x + 8, y - h + 22, 12, 2);
  g.fillStyle(LAMP, 0.95); g.fillRect(x + 9, y - h + 11, 10, 11);
  g.fillStyle(LAMP_HOT, 1); g.fillRect(x + 12, y - h + 13, 4, 6);
  g.lineStyle(1, IRON, 1); g.lineBetween(x + 11, y - h + 11, x + 11, y - h + 22); g.lineBetween(x + 17, y - h + 11, x + 17, y - h + 22);
}

/** A flat-bottomed mire punt drifting at its rope, a pole laid along it. */
export function punt(g: G, x: number, y: number, len: number, wood: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 5, len + 10, 14);
  g.fillStyle(dim(wood, 0.4), 1); g.fillRoundedRect(x - len / 2, y - 7, len, 14, 5);
  g.fillStyle(wood, 1); g.fillRoundedRect(x - len / 2 + 2, y - 6, len - 4, 9, 4);
  g.fillStyle(dim(wood, 0.25), 1);
  for (let k = 1; k < 4; k++) g.fillRect(x - len / 2 + (len * k) / 4 - 1, y - 6, 2, 10);
  g.lineStyle(2, 0x8a7a50, 1); g.lineBetween(x - len / 2 - 8, y - 9, x + len / 2 + 6, y - 2);
  if (rng() < 0.6) { g.fillStyle(0x4a6a3a, 1); g.fillEllipse(x + len * 0.2, y - 2, 10, 5); }
}

/**
 * The deck: tarred planks laid across the walk's run, gaps between them showing the black water,
 * nail-heads, wet sheen, and a heavy edge beam with stilt-heads poking up through it every few yards.
 */
export function deck(g: G, r: Rect, rng: () => number, runsAcross: boolean): void {
  // Black water shows in the gaps.
  g.fillStyle(MIRE_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const len = runsAcross ? r.h : r.w;
  const span = runsAcross ? r.w : r.h;
  let p = 0;
  while (p < span) {
    const pw = 11 + rng() * 5;
    const col = mixC(PLANK, rng() < 0.5 ? PLANK_ALT : PLANK_LIT, rng() * 0.4);
    const warp = (rng() - 0.5) * 1.5;
    if (runsAcross) {
      g.fillStyle(col, 1); g.fillRect(r.x + p, r.y + warp, pw - 1.6, len);
      g.fillStyle(lit(col, 0.12), 0.5); g.fillRect(r.x + p + 1, r.y, 2, len);
      if (rng() < 0.4) { g.fillStyle(dim(col, 0.3), 0.6); g.fillRect(r.x + p + 3, r.y + rng() * len, pw - 6, 2); }
      g.fillStyle(IRON, 0.8);
      for (let n = 10; n < len; n += 34) { g.fillCircle(r.x + p + 3, r.y + n, 0.9); g.fillCircle(r.x + p + pw - 5, r.y + n, 0.9); }
    } else {
      g.fillStyle(col, 1); g.fillRect(r.x, r.y + p + warp, len, pw - 1.6);
      g.fillStyle(lit(col, 0.12), 0.5); g.fillRect(r.x, r.y + p + 1, len, 2);
      if (rng() < 0.4) { g.fillStyle(dim(col, 0.3), 0.6); g.fillRect(r.x + rng() * len, r.y + p + 3, 2, pw - 6); }
      g.fillStyle(IRON, 0.8);
      for (let n = 10; n < len; n += 34) { g.fillCircle(r.x + n, r.y + p + 3, 0.9); g.fillCircle(r.x + n, r.y + p + pw - 5, 0.9); }
    }
    p += pw;
  }
  // Wet patches and moss in the seams.
  for (let i = 0; i < (r.w * r.h) / 9000; i++) {
    g.fillStyle(MUD_WET, 0.25 + rng() * 0.2);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 20 + rng() * 40, 6 + rng() * 10);
  }
  for (let i = 0; i < (r.w * r.h) / 14000; i++) {
    g.fillStyle(rng() < 0.5 ? SCUM : LEAF, 0.6);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 4 + rng() * 6, 2);
  }
  // Edge beams and stilt-heads.
  g.fillStyle(PLANK_DARK, 1);
  g.fillRect(r.x, r.y, r.w, 3); g.fillRect(r.x, r.y + r.h - 4, r.w, 4);
  g.fillRect(r.x, r.y, 3, r.h); g.fillRect(r.x + r.w - 3, r.y, 3, r.h);
  for (let sx = r.x + 6; sx < r.x + r.w; sx += 46 + rng() * 10) {
    for (const sy of [r.y + 2, r.y + r.h - 3]) {
      g.fillStyle(BARK_DARK, 1); g.fillCircle(sx, sy, 4.5);
      g.fillStyle(BARK, 1); g.fillCircle(sx, sy - 0.8, 3.6);
      g.lineStyle(0.7, BARK_DARK, 0.8); g.strokeCircle(sx, sy - 0.8, 1.8);
    }
  }
  for (let sy = r.y + 30; sy < r.y + r.h - 20; sy += 50 + rng() * 10) {
    for (const sx of [r.x + 2, r.x + r.w - 3]) {
      g.fillStyle(BARK_DARK, 1); g.fillCircle(sx, sy, 4.5);
      g.fillStyle(BARK, 1); g.fillCircle(sx, sy - 0.8, 3.6);
    }
  }
}

/**
 * The legs under a deck's south face: stilts going down into the water, slimed green at the
 * waterline, cross-braced, with the black reflection of each one wobbling below.
 */
export function stiltSkirt(g: G, x0: number, x1: number, y: number, depth: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillRect(x0, y, x1 - x0, depth * 0.6);
  for (let sx = x0 + 8; sx < x1 - 4; sx += 30 + rng() * 14) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 3, y, 6, depth);
    g.fillStyle(BARK, 0.7); g.fillRect(sx - 3, y, 2, depth * 0.7);
    g.fillStyle(SCUM, 0.9); g.fillRect(sx - 3.5, y + depth - 7, 7, 4);
    g.fillStyle(VENOM_DARK, 0.6); g.fillRect(sx - 3, y + depth - 3, 6, 2);
    g.fillStyle(0x000000, 0.35); g.fillRect(sx - 2, y + depth, 4, depth * 0.5);
  }
  g.lineStyle(2, BARK_DARK, 0.9);
  for (let sx = x0 + 8; sx < x1 - 40; sx += 60) g.lineBetween(sx, y + 2, sx + 30, y + depth - 6);
}

/**
 * A mangrove on its prop-roots: a short grey trunk standing on a cage of arching roots that splay
 * out and dive into the water, a dark many-lobed crown, beards of moss, a web strung between two
 * roots, and the odd snake asleep on a bough.
 */
export function mangrove(g: G, x: number, y: number, s: number, rng: () => number, snake = false): void {
  shadow(g, x, y + 4 * s, 120 * s, 30 * s, 0.4);
  const trunkTop = y - 70 * s;
  // Prop roots: arches from the trunk out to the water, back ones first.
  const roots = 7 + Math.floor(rng() * 3);
  for (let i = 0; i < roots; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = (24 + rng() * 40) * s;
    const fx = x + side * reach, fy = y + (rng() - 0.3) * 10 * s;
    const sx = x + side * (2 + rng() * 6) * s, sy = y - (36 + rng() * 26) * s;
    const cx = x + side * reach * 0.9, cy = sy - 6 * s;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push({
        x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * fx,
        y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * fy,
      });
    }
    g.lineStyle(5 * s, BARK_DARK, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y + 1); g.strokePath();
    g.lineStyle(3.6 * s, BARK, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(1.2 * s, BARK_LIT, 0.6); g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1); for (const p of pts.slice(0, 5)) g.lineTo(p.x, p.y - 1.5); g.strokePath();
    // Slimed tip where it goes in.
    g.fillStyle(SCUM, 0.9); g.fillEllipse(fx, fy, 8 * s, 3 * s);
    g.lineStyle(1, MIRE_SHEEN, 0.7); g.strokeEllipse(fx, fy + 1, 14 * s, 4 * s);
  }
  // A web between two roots on the near side.
  web(g, x + 18 * s, y - 22 * s, 14 * s, rng, 0.45);
  // The trunk.
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 7 * s, trunkTop, 14 * s, 42 * s);
  g.fillStyle(BARK, 1); g.fillRect(x - 6 * s, trunkTop, 10 * s, 42 * s);
  g.fillStyle(BARK_LIT, 0.5); g.fillRect(x - 5 * s, trunkTop, 3 * s, 40 * s);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, BARK_DARK, 0.7); g.lineBetween(x - 5 * s, trunkTop + 8 * s + k * 9 * s, x + 3 * s, trunkTop + 10 * s + k * 9 * s); }
  // Boughs.
  g.lineStyle(4 * s, BARK, 1);
  g.lineBetween(x, trunkTop + 4 * s, x - 26 * s, trunkTop - 14 * s);
  g.lineBetween(x, trunkTop + 2 * s, x + 30 * s, trunkTop - 10 * s);
  // Crown: lobes, dark under, lit on top.
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) lobes.push([x + (rng() - 0.5) * 90 * s, trunkTop - 20 * s - rng() * 34 * s, (18 + rng() * 14) * s]);
  for (const [lx, ly, lr] of lobes) { g.fillStyle(LEAF_DARK, 1); g.fillCircle(lx, ly + 4 * s, lr); }
  for (const [lx, ly, lr] of lobes) { g.fillStyle(LEAF, 1); g.fillCircle(lx, ly, lr * 0.92); }
  for (const [lx, ly, lr] of lobes) {
    g.fillStyle(LEAF_LIT, 0.55); g.fillCircle(lx - lr * 0.3, ly - lr * 0.35, lr * 0.45);
    for (let k = 0; k < 4; k++) { g.fillStyle(LEAF_DARK, 0.6); g.fillEllipse(lx + (rng() - 0.5) * lr, ly + (rng() - 0.5) * lr, 4 * s, 2 * s); }
  }
  // Moss beards hanging from the crown's underside.
  for (let i = 0; i < 8; i++) {
    const mx = x + (rng() - 0.5) * 80 * s, my = trunkTop - 6 * s + rng() * 8 * s;
    const ml = (10 + rng() * 22) * s;
    g.lineStyle(1.4 * s, 0x6a7a4a, 0.85); g.lineBetween(mx, my, mx + (rng() - 0.5) * 4, my + ml);
    g.lineStyle(1 * s, 0x8a9a62, 0.6); g.lineBetween(mx + 2, my, mx + 1 + (rng() - 0.5) * 4, my + ml * 0.7);
  }
  // Gossamer from crown to root.
  g.lineStyle(0.7, WEB, 0.3); g.lineBetween(x - 34 * s, trunkTop - 6 * s, x - 40 * s, y - 6 * s);
  if (snake) {
    // A green tree-snake draped over the right bough.
    const bx = x + 18 * s, by = trunkTop - 6 * s;
    g.lineStyle(3 * s, 0x5a9a2a, 1);
    g.beginPath(); g.moveTo(bx - 10 * s, by + 2 * s);
    for (let k = 0; k <= 10; k++) g.lineTo(bx - 10 * s + k * 3 * s, by + Math.sin(k * 1.1) * 4 * s + (k > 7 ? (k - 7) * 4 * s : 0));
    g.strokePath();
    g.fillStyle(0x5a9a2a, 1); g.fillEllipse(bx + 21 * s, by + 14 * s, 6 * s, 4 * s);
    g.fillStyle(0xf0d040, 1); g.fillCircle(bx + 22 * s, by + 13 * s, 0.9 * s);
  }
}

/**
 * A fang of white rock standing out of the mire: a curved enamel cone, darker down the shaded
 * side, crazed with old cracks stained brown, a green tide-line of slime where it meets the water,
 * and the dark root-socket it stands in.
 */
export function fangRock(g: G, x: number, y: number, h: number, lean: number, rng: () => number): void {
  const w = h * 0.34;
  shadow(g, x, y + 4, w * 2.2, w * 0.6, 0.45);
  // The socket of dark gum-rock it stands in.
  blob(g, x, y + 2, w * 0.9, w * 0.32, BONE_DARK, 1, rng, 8);
  g.fillStyle(dim(BONE_DARK, 0.4), 1); g.fillEllipse(x, y + 3, w * 1.3, w * 0.28);
  // The body: a curved cone, base y, tip at (x + lean, y - h).
  const tipX = x + lean, tipY = y - h;
  const L: [number, number][] = [], R: [number, number][] = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const cx = x + lean * t * t, cy = y - h * t;
    const hw = w * 0.5 * Math.pow(1 - t, 0.8);
    L.push([cx - hw, cy]); R.push([cx + hw, cy]);
  }
  poly(g, [...L, ...R.reverse()], BONE_SHADE, 1);
  // Lit face: the left two-thirds.
  const LL: [number, number][] = [], MM: [number, number][] = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const cx = x + lean * t * t, cy = y - h * t;
    const hw = w * 0.5 * Math.pow(1 - t, 0.8);
    LL.push([cx - hw * 0.92, cy]); MM.push([cx + hw * 0.25, cy]);
  }
  poly(g, [...LL, ...MM.reverse()], BONE, 1);
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(x - w * 0.22 + lean * 0.12, y - h * 0.42, w * 0.12, h * 0.36);
  // Enamel cracks, brown-stained.
  for (let c = 0; c < 4; c++) {
    let cx = x + (rng() - 0.5) * w * 0.6, cy = y - h * (0.15 + rng() * 0.5);
    g.lineStyle(1, 0x7a6a4a, 0.75); g.beginPath(); g.moveTo(cx, cy);
    for (let k = 0; k < 4; k++) { cx += (rng() - 0.5) * 6; cy -= 5 + rng() * 6; g.lineTo(cx, cy); }
    g.strokePath();
  }
  // The tide-line: slime and a frill of barnacle-white.
  g.fillStyle(SCUM, 0.95); g.fillRect(x - w * 0.5, y - 10, w, 8);
  g.fillStyle(VENOM_DARK, 0.8); g.fillRect(x - w * 0.48, y - 4, w * 0.96, 3);
  for (let k = 0; k < 6; k++) { g.fillStyle(0xd8d0b8, 0.8); g.fillCircle(x - w * 0.4 + rng() * w * 0.8, y - 11 - rng() * 4, 1.4); }
  // The tip, worn blunt.
  g.fillStyle(lit(BONE, 0.3), 1); g.fillCircle(tipX, tipY + 2, Math.max(1.5, w * 0.06));
}

// ── Buildings ───────────────────────────────────────────────────────

export interface StiltHouseOpts {
  wall: number;
  roof: number;
  /** Reed thatch, a roof shingled in shed snakeskin, or tarred boards. */
  roofKind: 'reed' | 'skin' | 'tar';
  glow?: boolean;
  /** Paint the Matriarch's Mark on the door (a household in good standing). */
  marked?: boolean;
  /** A black X over the door: passed over. */
  passed?: boolean;
  net?: boolean;
}

/**
 * A house on mangrove stilts: a plank box standing on legs over its own little landing, a
 * steep roof dripping at the eaves, round shuttered windows, a ladder down to the deck, and on the
 * door the household's standing — the Mark painted in green, or a black cross for the passed-over.
 * Returns the door point.
 */
export function stiltHouse(g: G, x: number, y: number, w: number, h: number, o: StiltHouseOpts, rng: () => number): Pt {
  const legs = 22;
  const base = y - legs;
  shadow(g, x, y + 2, w * 1.1, 18, 0.38);
  // Legs: crooked mangrove poles, cross-braced.
  for (let k = 0; k < 4; k++) {
    const lx = x - w / 2 + 6 + (k * (w - 12)) / 3;
    g.fillStyle(BARK_DARK, 1); g.fillRect(lx - 3, base, 6, legs);
    g.fillStyle(BARK, 0.8); g.fillRect(lx - 3, base, 2, legs);
  }
  g.lineStyle(2, BARK_DARK, 1); g.lineBetween(x - w / 2 + 6, base + 3, x - w / 6, y - 2); g.lineBetween(x + w / 2 - 6, base + 3, x + w / 6, y - 2);
  // Floor beam and walls of vertical boards.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 - 4, base - 6, w + 8, 7);
  const wallTop = base - 6 - h;
  g.fillStyle(dim(o.wall, 0.3), 1); g.fillRect(x - w / 2, wallTop, w, h);
  for (let bx = x - w / 2; bx < x + w / 2; bx += 8) {
    g.fillStyle(mixC(o.wall, rng() < 0.5 ? PLANK_LIT : PLANK_DARK, rng() * 0.25), 1);
    g.fillRect(bx + 0.6, wallTop, 7, h);
  }
  g.fillStyle(0x000000, 0.18); g.fillRect(x + w * 0.2, wallTop, w * 0.3, h);
  // Damp tide-mark along the foot of the wall.
  g.fillStyle(SCUM, 0.4); g.fillRect(x - w / 2, base - 14, w, 8);
  // Round shuttered windows.
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    const wy = wallTop + h * 0.38;
    g.fillStyle(PLANK_DARK, 1); g.fillCircle(wx, wy, 9);
    g.fillStyle(o.glow ? LAMP : 0x141a14, 1); g.fillCircle(wx, wy, 7);
    if (o.glow) { g.fillStyle(LAMP_HOT, 0.8); g.fillCircle(wx - 2, wy - 2, 2.5); glow(g, wx, wy, 18, LAMP, 0.05, 3); }
    g.lineStyle(1.2, PLANK_DARK, 1); g.lineBetween(wx - 7, wy, wx + 7, wy); g.lineBetween(wx, wy - 7, wx, wy + 7);
    // A shutter hanging open on one side.
    g.fillStyle(dim(o.wall, 0.15), 1); g.fillEllipse(wx + 13, wy, 7, 16);
  }
  // Door.
  const dw = Math.min(22, w * 0.24);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - dw / 2 - 2, base - 6 - h * 0.62, dw + 4, h * 0.62);
  g.fillStyle(dim(o.wall, 0.5), 1); g.fillRect(x - dw / 2, base - 6 - h * 0.6, dw, h * 0.6);
  g.fillStyle(BRASS, 1); g.fillCircle(x + dw / 2 - 4, base - 6 - h * 0.3, 1.5);
  if (o.marked) {
    g.fillStyle(VENOM, 0.85); g.fillCircle(x - 3, base - 6 - h * 0.42, 2); g.fillCircle(x + 3, base - 6 - h * 0.42, 2);
    g.lineStyle(1.2, VENOM, 0.7); g.strokeCircle(x, base - 6 - h * 0.42, 6);
  }
  if (o.passed) {
    g.lineStyle(3, 0x0a0a0a, 0.9);
    g.lineBetween(x - dw / 2 + 2, base - 6 - h * 0.56, x + dw / 2 - 2, base - 6 - h * 0.12);
    g.lineBetween(x + dw / 2 - 2, base - 6 - h * 0.56, x - dw / 2 + 2, base - 6 - h * 0.12);
  }
  // Ladder from the door down to the deck.
  g.lineStyle(2, BARK_LIT, 1); g.lineBetween(x - 7, base - 4, x - 9, y); g.lineBetween(x + 7, base - 4, x + 9, y);
  for (let k = 1; k < 4; k++) { const ry = base - 4 + (k * legs) / 4; g.lineBetween(x - 8, ry, x + 8, ry); }
  if (o.net) {
    // A net hung to dry on the wall, corks along its top.
    for (let k = 0; k < 7; k++) { g.lineStyle(0.8, ROPE, 0.8); g.lineBetween(x - w / 2 + 6 + k * 4, wallTop + 10, x - w / 2 + 2 + k * 4, wallTop + h - 12); }
    for (let k = 0; k < 5; k++) { g.lineStyle(0.8, ROPE, 0.8); g.lineBetween(x - w / 2 + 4, wallTop + 14 + k * 8, x - w / 2 + 32, wallTop + 16 + k * 8); }
    for (let k = 0; k < 4; k++) { g.fillStyle(0xc8a050, 1); g.fillCircle(x - w / 2 + 8 + k * 8, wallTop + 10, 2); }
  }
  // Roof.
  const eave = wallTop + 4;
  const peak = wallTop - h * 0.75;
  const ov = 12;
  poly(g, [[x - w / 2 - ov, eave], [x + w / 2 + ov, eave], [x + w / 4, peak], [x - w / 4, peak]], dim(o.roof, 0.35), 1);
  poly(g, [[x - w / 2 - ov + 2, eave - 3], [x + w / 2 + ov - 2, eave - 3], [x + w / 4, peak + 2], [x - w / 4, peak + 2]], o.roof, 1);
  if (o.roofKind === 'reed') {
    for (let k = 0; k < w / 3; k++) {
      const rx = x - w / 2 - ov + 4 + k * 3.2 + rng() * 2;
      g.lineStyle(1, lit(o.roof, 0.2 + rng() * 0.15), 0.6); g.lineBetween(rx, eave - 3, rx + (x - rx) * 0.4, eave - 3 - (eave - peak) * 0.8);
    }
    // Ragged reed ends hanging off the eave, dripping.
    for (let k = 0; k < w / 4; k++) { g.lineStyle(1, dim(o.roof, 0.1), 1); const rx = x - w / 2 - ov + 2 + k * 4; g.lineBetween(rx, eave - 2, rx + 1, eave + 3 + rng() * 4); }
  } else if (o.roofKind === 'skin') {
    // Shingled in shed snakeskin: rows of scale-diamonds, pale and translucent.
    for (let row = 0; row < 6; row++) {
      const ry = eave - 6 - row * ((eave - peak) / 6.5);
      const half = (w / 2 + ov) - row * ((w / 4 + ov) / 6.5);
      for (let sx = x - half + 4; sx < x + half - 2; sx += 7) {
        g.fillStyle(row % 2 ? lit(o.roof, 0.18) : lit(o.roof, 0.08), 0.8);
        g.fillTriangle(sx, ry, sx + 3.5, ry - 4, sx + 7, ry);
        g.fillTriangle(sx, ry, sx + 3.5, ry + 3, sx + 7, ry);
      }
    }
  } else {
    for (let k = 0; k < 6; k++) { g.lineStyle(1.5, dim(o.roof, 0.4), 0.8); const ry = eave - 4 - k * ((eave - peak) / 6); g.lineBetween(x - w / 2 - ov + k * 4, ry, x + w / 2 + ov - k * 4, ry); }
    g.fillStyle(0x0a0a08, 0.35); g.fillRect(x - w / 4, peak, w / 2, 3);
  }
  // Drips off the eave.
  for (let k = 0; k < 4; k++) { g.fillStyle(MIRE_SHEEN, 0.7); g.fillEllipse(x - w / 2 - ov + 6 + rng() * (w + ov * 2 - 12), eave + 4, 2, 4); }
  // A stovepipe.
  g.fillStyle(IRON, 1); g.fillRect(x + w * 0.28, peak - 6, 5, (eave - peak) * 0.6);
  g.fillStyle(0x4a4a44, 1); g.fillRect(x + w * 0.28 - 1, peak - 8, 7, 3);
  return { x, y: y + 14 };
}

/**
 * The Draught House: a squat hall on doubled stilts with a copper dome like the lid of a vast still,
 * the still-pipe coming out of the top and curling twice round itself before it vents. The doorway is
 * a serpent's open mouth — the upper jaw a carved lintel with two great fangs that drip, the lower
 * jaw the step. Either side, a barred dosing window. The Matriarch's seal on the pediment, and a
 * bruise-purple banner of hers on each corner.
 */
export function draughtHouse(g: G, x: number, y: number, rng: () => number): void {
  const w = 340, legs = 26, base = y - legs;
  shadow(g, x, y + 4, w * 1.2, 34, 0.5);
  // Doubled stilts.
  for (let k = 0; k < 8; k++) {
    const lx = x - w / 2 + 10 + (k * (w - 20)) / 7;
    g.fillStyle(BARK_DARK, 1); g.fillRect(lx - 5, base, 10, legs);
    g.fillStyle(BARK, 0.8); g.fillRect(lx - 5, base, 3, legs);
    g.fillStyle(SCUM, 0.8); g.fillRect(lx - 5, y - 6, 10, 4);
  }
  g.lineStyle(3, BARK_DARK, 1);
  for (let k = 0; k < 7; k++) { const lx = x - w / 2 + 10 + (k * (w - 20)) / 7; g.lineBetween(lx, base + 4, lx + (w - 20) / 7, y - 4); }
  // Plinth beam.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 - 8, base - 10, w + 16, 12);
  g.fillStyle(PLANK, 1); g.fillRect(x - w / 2 - 8, base - 12, w + 16, 5);
  // Walls: dark tarred timber over a stone footing.
  const wallH = 120, wallTop = base - 10 - wallH;
  g.fillStyle(0x4a4640, 1); g.fillRect(x - w / 2, base - 40, w, 30);
  for (let sx = x - w / 2; sx < x + w / 2; sx += 22) {
    for (const [ry, off] of [[base - 40, 0], [base - 26, 11]] as [number, number][]) {
      g.fillStyle(mixC(0x5a564e, 0x3a3832, rng()), 1); g.fillRect(sx + off + 1, ry + 1, 20, 12);
    }
  }
  g.fillStyle(0x2a2420, 1); g.fillRect(x - w / 2, wallTop, w, wallH - 30);
  for (let bx = x - w / 2; bx < x + w / 2; bx += 10) {
    g.fillStyle(mixC(0x3a302a, 0x2a2220, rng()), 1); g.fillRect(bx + 0.8, wallTop, 8.5, wallH - 30);
  }
  // Corner posts, banded in copper.
  for (const cx of [x - w / 2, x + w / 2]) {
    g.fillStyle(PLANK_DARK, 1); g.fillRect(cx - 8, wallTop - 6, 16, wallH + 2);
    for (let k = 0; k < 4; k++) { g.fillStyle(COPPER, 1); g.fillRect(cx - 9, wallTop + 6 + k * 26, 18, 4); }
  }
  // The copper dome — the still-lid — with its green bloom and riveted seams.
  const domeY = wallTop - 4;
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, domeY, w * 0.86, 110);
  g.fillStyle(COPPER, 1); g.fillEllipse(x - 4, domeY - 4, w * 0.82, 100);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - w * 0.45, domeY, w * 0.9, 56);
  g.fillStyle(lit(COPPER, 0.35), 0.6); g.fillEllipse(x - w * 0.16, domeY - 26, w * 0.24, 28);
  g.lineStyle(1.2, COPPER_DARK, 0.9);
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.arc(x + k * 30, domeY + 40, 92, Math.PI * 1.25, Math.PI * 1.75, false); g.strokePath(); }
  for (let k = 0; k < 24; k++) { g.fillStyle(COPPER_DARK, 0.9); g.fillCircle(x - w * 0.38 + k * (w * 0.76 / 23), domeY - 2, 1.4); }
  // The still-pipe: out of the crown, two coils, then a vent.
  const px = x + 20, py = domeY - 50;
  g.fillStyle(COPPER_DARK, 1); g.fillRect(px - 6, py - 30, 12, 34);
  g.lineStyle(9, COPPER_DARK, 1); g.strokeEllipse(px + 18, py - 46, 46, 22);
  g.lineStyle(6, COPPER, 1); g.strokeEllipse(px + 18, py - 47, 46, 22);
  g.lineStyle(9, COPPER_DARK, 1); g.strokeEllipse(px + 18, py - 62, 40, 18);
  g.lineStyle(6, COPPER, 1); g.strokeEllipse(px + 18, py - 63, 40, 18);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(px + 34, py - 100, 10, 34);
  g.fillStyle(COPPER, 1); g.fillRect(px + 32, py - 104, 14, 6);
  g.fillStyle(VENOM, 0.6); g.fillCircle(px + 39, py - 106, 4);
  // The serpent-mouth doorway: upper jaw lintel with scales, two great dripping fangs.
  const dw = 92, dTop = base - 10 - 92;
  g.fillStyle(0x0c0e0a, 1); g.fillRect(x - dw / 2, dTop, dw, 92);
  glow(g, x, base - 40, 46, VENOM, 0.05, 3);
  g.fillStyle(VENOM_DARK, 0.4); g.fillRect(x - dw / 2 + 6, dTop + 30, dw - 12, 62);
  // Lintel = the upper jaw.
  poly(g, [[x - dw / 2 - 26, dTop + 8], [x + dw / 2 + 26, dTop + 8], [x + dw / 2 + 8, dTop - 26], [x, dTop - 44], [x - dw / 2 - 8, dTop - 26]], 0x3a5a2a, 1);
  poly(g, [[x - dw / 2 - 20, dTop + 4], [x + dw / 2 + 20, dTop + 4], [x + dw / 2 + 4, dTop - 24], [x, dTop - 40], [x - dw / 2 - 4, dTop - 24]], 0x4e7a32, 1);
  for (let row = 0; row < 4; row++) {
    for (let k = -5; k <= 5; k++) {
      const sx = x + k * 11 + (row % 2) * 5, sy = dTop - 2 - row * 9;
      if (Math.abs(sx - x) > dw / 2 + 14 - row * 6) continue;
      g.fillStyle(0x3a5a2a, 0.9); g.fillEllipse(sx, sy, 10, 6);
      g.fillStyle(0x6a9a42, 0.6); g.fillEllipse(sx - 1, sy - 1, 6, 3);
    }
  }
  // Eyes on the lintel, yellow, slit.
  for (const ex of [x - 34, x + 34]) {
    g.fillStyle(0x1a1a0a, 1); g.fillEllipse(ex, dTop - 20, 18, 11);
    g.fillStyle(0xf0d040, 1); g.fillEllipse(ex, dTop - 20, 15, 8);
    g.fillStyle(0x0a0a04, 1); g.fillRect(ex - 1, dTop - 24, 2.5, 8);
  }
  // The fangs.
  for (const fx of [x - 26, x + 26]) {
    poly(g, [[fx - 8, dTop + 4], [fx + 8, dTop + 4], [fx + 1, dTop + 46]], BONE_SHADE, 1);
    poly(g, [[fx - 7, dTop + 4], [fx + 3, dTop + 4], [fx, dTop + 44]], BONE, 1);
    g.fillStyle(VENOM, 0.9); g.fillEllipse(fx + 1, dTop + 50, 4, 6);
  }
  // Lower jaw step with a forked tongue mat.
  g.fillStyle(0x3a5a2a, 1); g.fillRect(x - dw / 2 - 10, base - 12, dw + 20, 8);
  g.fillStyle(0x8a2a3a, 1);
  poly(g, [[x - 10, base - 6], [x + 10, base - 6], [x + 6, y + 6], [x + 14, y + 16], [x + 2, y + 9], [x, y + 16], [x - 2, y + 9], [x - 14, y + 16], [x - 6, y + 6]], 0x8a2a3a, 1);
  // Barred dosing windows, lamp-lit, a tin cup on each sill.
  for (const wx of [x - 112, x + 112]) {
    const wy = wallTop + 26;
    g.fillStyle(0x0a0a08, 1); g.fillRect(wx - 26, wy, 52, 40);
    g.fillStyle(LAMP, 0.85); g.fillRect(wx - 23, wy + 3, 46, 34);
    g.fillStyle(LAMP_HOT, 0.6); g.fillRect(wx - 12, wy + 6, 20, 12);
    glow(g, wx, wy + 20, 40, LAMP, 0.05, 3);
    for (let k = 0; k < 6; k++) { g.fillStyle(IRON, 1); g.fillRect(wx - 22 + k * 9, wy, 2.5, 40); }
    g.fillStyle(PLANK, 1); g.fillRect(wx - 30, wy + 40, 60, 6);
    g.fillStyle(0xa8a8a0, 1); g.fillRect(wx - 4, wy + 33, 8, 7);
    g.fillStyle(0xd8d8d0, 1); g.fillRect(wx - 4, wy + 33, 8, 2);
  }
  // Pediment seal and banners.
  coilSeal(g, x, domeY - 6, 14, BRASS, 1);
  for (const bx of [x - w / 2 + 2, x + w / 2 - 2]) {
    g.fillStyle(IRON, 1); g.fillRect(bx - 1, wallTop - 40, 3, 40);
    poly(g, [[bx + 2, wallTop - 38], [bx + 26 * Math.sign(x - bx), wallTop - 38], [bx + 26 * Math.sign(x - bx), wallTop + 22], [bx + 14 * Math.sign(x - bx), wallTop + 12], [bx + 2, wallTop + 22]], BRUISE, 1);
    coilSeal(g, bx + 14 * Math.sign(x - bx), wallTop - 12, 6, BRUISE_LIT, 0.9);
  }
  // Webs in the eaves — even here.
  web(g, x - w / 2 + 22, wallTop + 6, 16, rng, 0.35);
}

/**
 * The ration board by the Draught House door: a tall notice board under a little roof, columns of
 * household names in a tidy clerk's hand, a tally of vial-marks against each — and the black lines
 * through the passed-over. A lamp on a bracket so the queue can read its fate.
 */
export function rationBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 90, 14);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 40, y - 96, 5, 96); g.fillRect(x + 35, y - 96, 5, 96);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 42, y - 100, 84, 76);
  g.fillStyle(0xd8cca8, 1); g.fillRect(x - 38, y - 96, 76, 68);
  // Pinned sheets, slightly askew.
  for (let col = 0; col < 3; col++) {
    const cx = x - 36 + col * 25;
    g.fillStyle(mixC(0xece0c0, 0xc8b890, rng() * 0.6), 1); g.fillRect(cx, y - 93 + rng() * 3, 22, 62);
    g.fillStyle(BRASS, 1); g.fillCircle(cx + 11, y - 92, 1.4);
    for (let r = 0; r < 9; r++) {
      const ry = y - 86 + r * 6.4;
      g.lineStyle(1, 0x3a3020, 0.8); g.lineBetween(cx + 2, ry, cx + 11 + rng() * 4, ry);
      g.fillStyle(VENOM_DARK, 0.9); for (let v = 0; v < 2; v++) g.fillRect(cx + 15 + v * 3, ry - 1.5, 1.4, 3);
      if (rng() < 0.22) { g.lineStyle(1.6, 0x0a0a0a, 1); g.lineBetween(cx + 1, ry, cx + 21, ry); }
    }
  }
  // Roof and lamp.
  poly(g, [[x - 48, y - 98], [x + 48, y - 98], [x + 36, y - 114], [x - 36, y - 114]], 0x3a3028, 1);
  coilSeal(g, x, y - 106, 5, BRASS, 0.9);
  g.fillStyle(IRON, 1); g.fillRect(x + 40, y - 88, 12, 2);
  g.fillStyle(LAMP, 1); g.fillRect(x + 46, y - 86, 7, 9);
  glow(g, x + 49, y - 80, 30, LAMP, 0.06, 3);
}

/** Brass queue-rope posts and a velvet rope sagging between them, bruise purple. */
export function queueRope(g: G, pts: Pt[]): void {
  for (let i = 0; i < pts.length - 1; i++) sag(g, { x: pts[i].x, y: pts[i].y - 22 }, { x: pts[i + 1].x, y: pts[i + 1].y - 22 }, 8, 3, BRUISE, 1);
  for (const p of pts) {
    shadow(g, p.x, p.y + 1, 12, 4);
    g.fillStyle(dim(BRASS, 0.3), 1); g.fillEllipse(p.x, p.y, 12, 5);
    g.fillStyle(BRASS, 1); g.fillRect(p.x - 2, p.y - 26, 4, 26);
    g.fillStyle(lit(BRASS, 0.4), 1); g.fillCircle(p.x, p.y - 27, 3.4);
  }
}

/**
 * A tanner's frame: two poles, a crossbar, and a snakeskin laced out flat to cure — long, its scale
 * pattern drawn diamond by diamond in that snake's colours, the empty eye-caps at the head end.
 */
export function skinFrame(g: G, x: number, y: number, h: number, base: number, band: number, rng: () => number): void {
  shadow(g, x, y + 2, 44, 10);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 18, y - h, 4, h); g.fillRect(x + 14, y - h, 4, h);
  g.fillRect(x - 20, y - h - 2, 40, 4);
  const top = y - h + 6, bot = y - 10;
  // The skin, wider in the middle.
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, sy = top + (bot - top) * t;
    const hw = 4 + Math.sin(t * Math.PI) * 9;
    g.fillStyle(k % 3 === 1 ? band : base, 0.9); g.fillRect(x - hw, sy, hw * 2, (bot - top) / 12 + 0.6);
  }
  // Scale diamonds.
  g.lineStyle(0.6, dim(base, 0.4), 0.7);
  for (let k = 0; k < 10; k++) {
    const sy = top + 4 + k * ((bot - top - 8) / 10);
    const hw = 3 + Math.sin(((sy - top) / (bot - top)) * Math.PI) * 8;
    for (let sx = x - hw + 2; sx < x + hw - 1; sx += 4) { g.lineBetween(sx, sy, sx + 2, sy + 2); g.lineBetween(sx + 2, sy + 2, sx + 4, sy); }
  }
  // Eye-caps at the head end, and the lacing.
  g.fillStyle(lit(base, 0.5), 0.9); g.fillCircle(x - 2.5, top + 2, 1.5); g.fillCircle(x + 2.5, top + 2, 1.5);
  g.lineStyle(0.6, ROPE, 0.9);
  for (let k = 0; k < 6; k++) { const ly = top + 6 + k * ((bot - top - 10) / 6); g.lineBetween(x - 16, ly, x - 6 - rng() * 2, ly + 1); g.lineBetween(x + 16, ly, x + 6 + rng() * 2, ly + 1); }
}

/** A tanning vat: a hooped tub of cloudy green liquor, a paddle leaning in it, a skin draped over the rim. */
export function tanVat(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + 2, r * 2.4, r * 0.6);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - r, y - r * 1.1, r * 2, r * 1.1);
  g.fillStyle(PLANK, 1); for (let k = 0; k < 6; k++) g.fillRect(x - r + 1 + k * (r * 2 / 6), y - r * 1.1, r * 2 / 6 - 1.2, r * 1.1);
  g.fillStyle(IRON, 1); g.fillRect(x - r - 1, y - r * 0.9, r * 2 + 2, 3); g.fillRect(x - r - 1, y - r * 0.3, r * 2 + 2, 3);
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(x, y - r * 1.1, r * 2, r * 0.6);
  g.fillStyle(0x5a7a2a, 1); g.fillEllipse(x, y - r * 1.08, r * 1.8, r * 0.48);
  g.fillStyle(VENOM_LIT, 0.3); g.fillEllipse(x - r * 0.3, y - r * 1.14, r * 0.6, r * 0.14);
  g.lineStyle(3, BARK_LIT, 1); g.lineBetween(x + r * 0.3, y - r * 1.1, x + r * 0.9, y - r * 2.2);
  g.fillStyle(0xc8b890, 0.9); g.fillRect(x - r - 2, y - r * 1.16, 10, r * 0.9);
}

/**
 * The Honeyed Fang: a bakery built round a hollow fang that comes up through its roof. Wild bees
 * nest in the fang — their holes in the enamel, honey seeping from the cracks and running down
 * the white in amber streaks — and the bakery leans its stilt-house against it like a child
 * against a parent. A bread oven of fang-chips in the side; the sign is a fang with a drop of honey
 * where the venom should be.
 */
export function honeyedFang(g: G, x: number, y: number, rng: () => number): void {
  // The fang first: it stands behind and above the house, left of centre.
  const fx = x - 60;
  fangRock(g, fx, y - 6, 210, 18, rng);
  // Bee-holes and honey runs.
  for (let k = 0; k < 6; k++) {
    const hy = y - 90 - k * 18, hx = fx - 8 + (k % 2) * 14 + k * 1.6;
    g.fillStyle(0x2a1a08, 1); g.fillEllipse(hx, hy, 6, 4);
    g.fillStyle(HONEY, 0.9); g.fillRect(hx - 1.5, hy + 1, 3, 10 + rng() * 16);
    g.fillStyle(HONEY, 0.9); g.fillCircle(hx, hy + 12 + rng() * 14, 2);
  }
  // The house leaning on it.
  stiltHouse(g, x + 30, y, 170, 70, { wall: 0x7a5a3a, roof: 0x8a6a2a, roofKind: 'reed', glow: true, marked: true }, rng);
  // Oven: a dome of fang-chips on the right side, red mouth, a chimney of white stones.
  const ox = x + 120, oy = y - 30;
  g.fillStyle(BONE_DARK, 1); g.fillEllipse(ox, oy, 60, 46);
  for (let k = 0; k < 14; k++) { g.fillStyle(mixC(BONE, BONE_SHADE, rng()), 1); g.fillEllipse(ox - 22 + rng() * 44, oy - 16 + rng() * 26, 10, 7); }
  g.fillStyle(0x1a0a04, 1); g.fillEllipse(ox, oy + 6, 24, 16);
  g.fillStyle(0xff8a3a, 0.95); g.fillEllipse(ox, oy + 8, 18, 10);
  g.fillStyle(0xffd88a, 1); g.fillEllipse(ox, oy + 10, 9, 4);
  glow(g, ox, oy + 8, 28, 0xff9a40, 0.06, 3);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? BONE : BONE_SHADE, 1); g.fillRect(ox + 10, oy - 40 - k * 12, 14, 12); }
  // Loaves on a plank by the door, glazed and gold.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 6, y - 4, 56, 5);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(0x8a5a22, 1); g.fillEllipse(x + 2 + i * 13, y - 8, 12, 7);
    g.fillStyle(HONEY, 1); g.fillEllipse(x + 2 + i * 13, y - 10, 9, 3.5);
  }
  // The sign: a fang with a honey drop, swinging from a bracket.
  const sx = x - 16, sy = y - 118;
  g.lineStyle(2.5, BARK_DARK, 1); g.lineBetween(x - 54, sy - 6, sx + 20, sy - 6);
  g.lineStyle(1, IRON, 1); g.lineBetween(sx, sy - 6, sx, sy); g.lineBetween(sx + 16, sy - 6, sx + 16, sy);
  g.fillStyle(0x3a2814, 1); g.fillRoundedRect(sx - 6, sy, 28, 34, 4);
  poly(g, [[sx + 1, sy + 5], [sx + 15, sy + 5], [sx + 9, sy + 26]], BONE, 1);
  g.fillStyle(HONEY, 1); g.fillCircle(sx + 9, sy + 29, 3); g.fillTriangle(sx + 7, sy + 28, sx + 11, sy + 28, sx + 9, sy + 24);
  // A few skeps on the roof ridge for the tame overflow.
  for (const [kx, ky] of [[x + 70, y - 168], [x + 90, y - 166]] as [number, number][]) {
    g.fillStyle(0x9a7a3a, 1); g.fillEllipse(kx, ky, 16, 18);
    g.lineStyle(1, 0x6a4a1e, 0.9); for (let k = 0; k < 3; k++) g.strokeEllipse(kx, ky + k * 2, 16 - k * 3, 5);
    g.fillStyle(0x1a120a, 1); g.fillEllipse(kx, ky + 6, 4, 2);
  }
}

/**
 * A net-loft: a tall, narrow two-storey stilt tower with a loading door high up, a winch beam
 * jutting from the gable with a net hoisted on it, nets hung down the whole face like curtains, and
 * cork floats strung along the eaves.
 */
export function netLoft(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 150, legs = 24, base = y - legs;
  shadow(g, x, y + 2, w * 1.3, 18, 0.4);
  for (let k = 0; k < 3; k++) { const lx = x - w / 2 + 6 + (k * (w - 12)) / 2; g.fillStyle(BARK_DARK, 1); g.fillRect(lx - 3, base, 6, legs); }
  const top = base - h;
  g.fillStyle(0x3e3428, 1); g.fillRect(x - w / 2, top, w, h);
  for (let bx = x - w / 2; bx < x + w / 2; bx += 7) { g.fillStyle(mixC(0x4a3e30, 0x34281e, rng()), 1); g.fillRect(bx + 0.5, top, 6, h); }
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 - 3, top + h * 0.5, w + 6, 4);
  // Loading door up top, open, a lamp inside.
  g.fillStyle(0x0a0a08, 1); g.fillRect(x - 12, top + 14, 24, 30);
  g.fillStyle(LAMP, 0.5); g.fillRect(x - 10, top + 30, 20, 14);
  // Ground door.
  g.fillStyle(0x0a0a08, 1); g.fillRect(x - 10, base - 34, 20, 34);
  // Gable and winch beam.
  poly(g, [[x - w / 2 - 6, top + 2], [x + w / 2 + 6, top + 2], [x, top - 34]], 0x2a2420, 1);
  g.fillStyle(BARK, 1); g.fillRect(x - 3, top - 26, 40, 5);
  g.lineStyle(1, ROPE, 1); g.lineBetween(x + 34, top - 21, x + 34, top + 30);
  // Hoisted net bundle.
  g.fillStyle(0x6a6248, 1); g.fillEllipse(x + 34, top + 38, 20, 24);
  for (let k = 0; k < 5; k++) { g.lineStyle(0.7, ROPE, 0.8); g.lineBetween(x + 25 + k * 4, top + 28, x + 27 + k * 4, top + 50); }
  // Nets down the face.
  for (let k = 0; k < Math.floor(w / 5); k++) { g.lineStyle(0.7, ROPE, 0.55); g.lineBetween(x - w / 2 + 3 + k * 5, top + h * 0.5 + 4, x - w / 2 + 2 + k * 5 + (rng() - 0.5) * 3, base - 4); }
  for (let r = 0; r < 6; r++) { g.lineStyle(0.7, ROPE, 0.55); sag(g, { x: x - w / 2 + 2, y: top + h * 0.5 + 10 + r * 11 }, { x: x + w / 2 - 2, y: top + h * 0.5 + 10 + r * 11 }, 4, 0.7, ROPE, 0.55); }
  for (let k = 0; k < 6; k++) { g.fillStyle(0xc8a050, 1); g.fillCircle(x - w / 2 + 4 + k * ((w - 8) / 5), top + 4, 2.4); }
  web(g, x - w / 2 + 6, top + 6, 10, rng, 0.4);
}

/**
 * The fang-rock lighthouse: a timber tower lashed to the biggest fang on the coast with chains,
 * its lantern room on top glazed in green bottle-glass — it burns the Matriarch's venom-oil and
 * shows green on Draught Nights — with a gallery rail and a keeper's ladder.
 */
export function lighthouse(g: G, x: number, y: number, rng: () => number): void {
  fangRock(g, x - 30, y, 230, -10, rng);
  const base = y - 8, h = 190, w = 44;
  shadow(g, x + 10, y + 4, 60, 14);
  // Tower: tapering timber, chained to the fang.
  poly(g, [[x + 10 - w / 2, base], [x + 10 + w / 2, base], [x + 10 + w * 0.32, base - h], [x + 10 - w * 0.32, base - h]], 0x3a3028, 1);
  for (let k = 0; k < 10; k++) {
    const t = k / 10, hw = (w / 2) * (1 - t * 0.36);
    g.lineStyle(1, 0x2a2018, 1); g.lineBetween(x + 10 - hw, base - h * t, x + 10 + hw, base - h * t);
  }
  g.fillStyle(0xd8d0b8, 0.85);
  for (let k = 0; k < 3; k++) { const t = 0.2 + k * 0.28, hw = (w / 2) * (1 - t * 0.36); g.fillRect(x + 10 - hw, base - h * t - 8, hw * 2, 8); }
  for (let k = 0; k < 4; k++) {
    const cy = base - 30 - k * 44;
    g.lineStyle(2, IRON, 1);
    for (let c = 0; c < 6; c++) g.strokeEllipse(x - 18 + c * 6, cy + Math.sin(c) * 1.5, 7, 4);
  }
  // Gallery and lantern room.
  const lt = base - h;
  g.fillStyle(IRON, 1); g.fillRect(x + 10 - 26, lt - 4, 52, 5);
  for (let k = 0; k < 9; k++) g.fillRect(x + 10 - 25 + k * 6, lt - 16, 1.5, 12);
  g.fillRect(x + 10 - 26, lt - 17, 52, 2);
  g.fillStyle(IRON, 1); g.fillRect(x + 10 - 16, lt - 44, 32, 40);
  g.fillStyle(VENOM_DARK, 1); g.fillRect(x + 10 - 13, lt - 40, 26, 32);
  g.fillStyle(VENOM, 0.75); g.fillRect(x + 10 - 10, lt - 36, 20, 24);
  g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(x + 10, lt - 24, 5);
  for (let k = 0; k < 3; k++) { g.fillStyle(IRON, 1); g.fillRect(x + 10 - 13 + k * 12, lt - 40, 2, 32); }
  poly(g, [[x + 10 - 20, lt - 44], [x + 10 + 20, lt - 44], [x + 10, lt - 66]], 0x2a2420, 1);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 10, lt - 68, 3);
  // Ladder.
  g.lineStyle(1.5, BARK_LIT, 1); g.lineBetween(x + 34, base, x + 30, lt); g.lineBetween(x + 40, base, x + 36, lt);
  for (let k = 1; k < 18; k++) { const ry = base - (k * h) / 18; g.lineBetween(x + 34 - (k * 4) / 18, ry, x + 40 - (k * 4) / 18, ry); }
}

/** A brass ear-trumpet on a post: the informers' letterbox. A slot in the bell takes a folded slip. */
export function earBox(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 18, 5);
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 2.5, y - 44, 5, 44);
  g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x - 8, y - 52, 16, 12);
  g.fillStyle(BRASS, 1); g.fillRect(x - 7, y - 51, 14, 10);
  g.fillStyle(0x1a1408, 1); g.fillRect(x - 4, y - 47, 8, 1.6);
  // The trumpet bell, turned to listen down the walk.
  g.fillStyle(dim(BRASS, 0.2), 1);
  poly(g, [[x + 6, y - 50], [x + 22, y - 60], [x + 24, y - 40], [x + 6, y - 44]], dim(BRASS, 0.2), 1);
  g.fillStyle(0x1a1408, 1); g.fillEllipse(x + 23, y - 50, 6, 20);
  g.fillStyle(lit(BRASS, 0.4), 0.6); g.fillRect(x + 8, y - 49, 12, 1.5);
  coilSeal(g, x, y - 34, 3.5, BRASS, 0.8);
}

/** A boat on the slip: a mire punt's bigger sister, upturned ribs half-planked, on trestles. */
export function slipHull(g: G, x: number, y: number, len: number, rng: () => number): void {
  shadow(g, x, y + 4, len + 40, 22, 0.4);
  for (const tx of [x - len * 0.32, x + len * 0.32]) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(tx - 18, y - 22, 36, 4);
    g.lineStyle(3, BARK_DARK, 1); g.lineBetween(tx - 14, y - 20, tx - 18, y); g.lineBetween(tx + 14, y - 20, tx + 18, y);
  }
  // Keel and ribs.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - len / 2, y - 28, len, 6);
  for (let k = 0; k <= 10; k++) {
    const rx = x - len / 2 + 6 + k * ((len - 12) / 10);
    const rh = 28 * Math.sin(((k + 0.5) / 11) * Math.PI) + 10;
    g.lineStyle(3, PLANK_LIT, 1);
    g.beginPath(); g.arc(rx, y - 28, rh, Math.PI, Math.PI * 1.5, false); g.strokePath();
  }
  // Half-planked on the near side.
  for (let k = 0; k < 4; k++) { g.fillStyle(mixC(PLANK, PLANK_ALT, rng()), 1); g.fillRect(x - len / 2 + 10, y - 30 - k * 7, len * 0.55, 6); }
  // Tar pot.
  g.fillStyle(IRON, 1); g.fillEllipse(x + len / 2 + 22, y - 6, 18, 14);
  g.fillStyle(0x0a0806, 1); g.fillEllipse(x + len / 2 + 22, y - 12, 14, 5);
}

/** A ring of ripples on still water. */
export function ripple(g: G, x: number, y: number, r: number, a: number, color = MIRE_SHEEN): void {
  g.lineStyle(1, color, a); g.strokeEllipse(x, y, r * 2, r * 0.7);
}

export { mixC, dim, lit };
