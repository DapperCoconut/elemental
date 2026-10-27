import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { type G, blob, dim, glow, lit, mixC, road, shadow, stroke } from '../../../../art/IsleArt';
import {
  HW, barkCurl, birchEye, leaf, lenticel, samplePolyline, sapDrop, sapLantern, spile, woodpecker,
} from './palette';
import {
  BOUGH_HALF, CATWALKS, CROWN, CX, DRIFTS, EAST_BOUGH, EAST_BURL, FLOOR_X0, FLOOR_X1, GLASSHOUSE, GLASS_DOOR, GREAT_LANTERN,
  H, HEARTROOM, HOUSES, LANTERNS, LEDGE, LOFT, MILL, MILLRACE, PIPE, PIPE_HEAD, POOL, RINGED_HOUSE, RING_STUMP, ROADS, ROOTS,
  SCALES, SCAR, SHOP, TAPS, TERRACES, TRUNK_FOOT, TRUNK_TOP, W, WEST_BOUGH, WEST_BURL, trunkHalf, walkable,
} from './layout';

/**
 * The Heartwood Court, painted. The Heartwood is a birch the size of a mountain, and a city
 * lives on it. At its foot, the forest floor: leaf litter, moss, the great roots humping out of
 * the soil, a root pool dark as tea, and the sawmill — built on the Empress's order "for the
 * day the tree stops giving", greased every week, chained every night, never once run. Up the
 * root stairs the trunk itself is the street: a vast band of silver bark barred with black
 * lenticels, terraces of boardwalk cut across it, knot-hole houses bulging from its flanks with
 * round red doors, sap taps and their buckets everywhere, sap lanterns glowing gold. Its birch
 * "eyes" — the scars of fallen branches — watch the whole street. Higher, a storm-split runs
 * down the bark, bridged by catwalks. At the top the trunk forks: Prince Birchbark's Heartroom
 * grows from the west burl, the woodpeckers' Drumming Loft from the east, and on the fork
 * itself stands the Empress's Glasshouse, verdigris iron and green glass, its panes clouded by
 * the shapes of the hedges inside — which are people. Off the tree there is only air: the
 * lesser forest's crowns far below, then mist, then sky.
 */

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** The trunk's outline as a polygon, inset by `d` px from its flanks. */
function trunkPoly(d: number, y0 = TRUNK_TOP - 40, y1 = TRUNK_FOOT + 10): Phaser.Geom.Point[] {
  const left: Phaser.Geom.Point[] = [], right: Phaser.Geom.Point[] = [];
  for (let y = y0; y <= y1; y += 20) {
    const hw = trunkHalf(y) - d;
    left.push(P(CX - hw, y));
    right.push(P(CX + hw, y));
  }
  return [...left, ...right.reverse()];
}

// ── Ground ───────────────────────────────────────────────────────────

/** The air round the tree: sky at the top, mist in the middle, the lesser forest's crowns below. */
function airBackdrop(g: G, rng: () => number): void {
  // Sky to mist to canopy, in bands.
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    const c = k < 0.5 ? mixC(HW.sky, HW.mist, k * 2) : mixC(HW.mist, HW.canopy, (k - 0.5) * 2);
    g.fillStyle(c, 1); g.fillRect(0, (H / bands) * i, W, H / bands + 1);
  }
  // The lesser forest, far below: round crowns seen from above, crowding thicker toward the floor.
  for (let i = 0; i < 520; i++) {
    const x = rng() * W, y = 640 + rng() * (H - 640);
    if (walkable(x, y)) continue;
    const depth = (y - 640) / (H - 640);
    const r = 14 + rng() * 26 + depth * 18;
    const hue = rng() < 0.5 ? HW.canopyGold : rng() < 0.5 ? HW.canopyLit : HW.leafRust;
    const fade = 0.55 - depth * 0.45;
    g.fillStyle(dim(HW.canopy, 0.35), 0.8); g.fillCircle(x + 3, y + 4, r);
    g.fillStyle(mixC(hue, HW.mist, fade), 1); g.fillCircle(x, y, r * 0.92);
    g.fillStyle(mixC(lit(hue, 0.2), HW.mist, fade), 1); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.45);
  }
  // Mist banks lying over the forest, thick in the middle of the climb.
  for (let i = 0; i < 70; i++) {
    const y = 300 + rng() * 1100;
    const x = rng() * W;
    if (walkable(x, y)) continue;
    const a = 0.18 + 0.25 * (1 - Math.abs(y - 850) / 600);
    g.fillStyle(HW.mist, Math.max(0.06, a)); g.fillEllipse(x, y, 180 + rng() * 300, 30 + rng() * 40);
  }
  // Faraway hills on the horizon at the very top, blue with distance.
  g.fillStyle(mixC(HW.sky, 0x5a7a8a, 0.35), 1);
  for (let x = 0; x < W; x += 140) {
    const h = 30 + Math.sin(x * 0.004) * 18 + rng() * 14;
    g.fillEllipse(x + 70, 40, 260, h * 2);
  }
  g.fillStyle(HW.sky, 0.5); g.fillRect(0, 40, W, 30);
}

/** The forest floor among the roots — soil, leaf litter, moss and a fern thicket at each side. */
function forestFloor(g: G, rng: () => number): void {
  const y0 = TRUNK_FOOT - 30;
  g.fillStyle(HW.soil, 1); g.fillRect(0, y0, W, H - y0);
  for (let i = 0; i < 80; i++) blob(g, rng() * W, y0 + rng() * (H - y0), 60 + rng() * 140, 20 + rng() * 50, rng() < 0.5 ? HW.soilMid : HW.mossDark, 0.5, rng);
  for (let i = 0; i < 30; i++) blob(g, rng() * W, y0 + 40 + rng() * (H - y0 - 40), 40 + rng() * 90, 16 + rng() * 30, HW.moss, 0.35, rng);
  // Leaf litter: thousands of fallen birch leaves.
  for (let i = 0; i < 2600; i++) {
    const x = rng() * W, y = y0 + rng() * (H - y0);
    const c = [HW.leafGold, HW.leafRust, HW.leafButter, HW.litter, HW.leafRed][Math.floor(rng() * 5)];
    leaf(g, x, y, rng() * Math.PI * 2, 5 + rng() * 6, mixC(c, HW.soil, 0.25 + rng() * 0.35), 0.85);
  }
  // Twigs.
  for (let i = 0; i < 120; i++) {
    const x = rng() * W, y = y0 + rng() * (H - y0), a = rng() * Math.PI;
    g.lineStyle(1.5, HW.barkShade, 0.5); g.lineBetween(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 5);
  }
  // Fern thickets at the edges: a wall of fronds.
  for (const [x0, x1] of [[0, FLOOR_X0 + 10], [FLOOR_X1 - 10, W]] as const) {
    g.fillStyle(dim(HW.mossDark, 0.3), 1); g.fillRect(x0, y0, x1 - x0, H - y0);
    for (let i = 0; i < 90; i++) {
      const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (H - y0);
      for (let f = 0; f < 5; f++) {
        const a = -Math.PI / 2 + (f - 2) * 0.45 + (rng() - 0.5) * 0.2;
        const len = 26 + rng() * 22;
        g.lineStyle(3, f % 2 ? HW.leafDark : HW.moss, 0.95); g.lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        for (let k = 1; k < 5; k++) {
          const px = x + Math.cos(a) * len * (k / 5), py = y + Math.sin(a) * len * (k / 5);
          g.lineStyle(1.5, HW.leafGreen, 0.8);
          g.lineBetween(px, py, px + Math.cos(a - 1.2) * 7, py + Math.sin(a - 1.2) * 7);
          g.lineBetween(px, py, px + Math.cos(a + 1.2) * 7, py + Math.sin(a + 1.2) * 7);
        }
      }
    }
  }
}

/** Birch bark over any filled shape already laid down: lenticels, curls, lichen and moss. */
function barkDetail(g: G, rng: () => number, x0: number, y0: number, x1: number, y1: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0);
    if (!walkable(x, y) || y >= TRUNK_FOOT) continue;
    const r = rng();
    if (r < 0.82) lenticel(g, x, y, 8 + rng() * 26, 0.45 + rng() * 0.5);
    else if (r < 0.9) barkCurl(g, x, y, 6 + rng() * 9, rng);
    else if (r < 0.96) { g.fillStyle(HW.lichen, 0.35); g.fillCircle(x, y, 4 + rng() * 9); }
    else { g.fillStyle(HW.barkMid, 0.5); g.fillEllipse(x, y, 60 + rng() * 80, 6 + rng() * 6); }
  }
}

/** The trunk: a vast band of birch bark, shaded as a cylinder, flaring into the roots. */
function trunk(g: G, rng: () => number): void {
  // A dark rim under the bark where it meets the air, then the bark.
  g.fillStyle(HW.barkDark, 1); g.fillPoints(trunkPoly(-8), true, true);
  g.fillStyle(HW.barkShade, 1); g.fillPoints(trunkPoly(0), true, true);
  g.fillStyle(HW.barkMid, 1); g.fillPoints(trunkPoly(36), true, true);
  g.fillStyle(HW.bark, 1); g.fillPoints(trunkPoly(110), true, true);
  // The lit face, a little left of centre, as if the morning were on it.
  g.fillStyle(HW.barkLit, 0.55);
  const lp: Phaser.Geom.Point[] = [];
  for (let y = TRUNK_TOP - 30; y <= TRUNK_FOOT; y += 20) lp.push(P(CX - trunkHalf(y) * 0.55, y));
  for (let y = TRUNK_FOOT; y >= TRUNK_TOP - 30; y -= 20) lp.push(P(CX - trunkHalf(y) * 0.08, y));
  g.fillPoints(lp, true, true);
  // The root flare: buttresses spreading out of the foot into the forest floor.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bx = CX + side * (trunkHalf(TRUNK_FOOT) - 60 - i * 150);
      const ex = bx + side * (60 + i * 30), ey = TRUNK_FOOT + 55 + i * 6;
      g.fillStyle(HW.barkShade, 1);
      g.fillTriangle(bx - 60, TRUNK_FOOT - 10, bx + 60, TRUNK_FOOT - 10, ex, ey);
      g.fillStyle(HW.barkMid, 1);
      g.fillTriangle(bx - 44, TRUNK_FOOT - 12, bx + 44, TRUNK_FOOT - 12, ex - side * 6, ey - 8);
    }
  }
  barkDetail(g, rng, CX - 720, TRUNK_TOP - 40, CX + 720, TRUNK_FOOT, 2200);
  // Moss up the shaded east flank near the foot.
  for (let i = 0; i < 60; i++) {
    const y = TRUNK_FOOT - rng() * 360;
    const x = CX + trunkHalf(y) - 20 - rng() * 70;
    g.fillStyle(rng() < 0.5 ? HW.moss : HW.mossDark, 0.5); g.fillCircle(x, y, 6 + rng() * 12);
  }
  // The tree's eyes: the black almond scars where branches fell. Big ones on the street.
  const EYES: [number, number, number][] = [
    [960, 1190, 70], [1480, 960, 64], [900, 700, 52], [1420, 640, 58], [1050, 1330, 44], [1340, 1210, 40], [760, 1060, 48],
  ];
  for (const [x, y, w] of EYES) birchEye(g, x, y, w, 0.2 + rng() * 0.3, 0.9);
}

/** The crown fork and the two great boughs reaching out over the air. */
function crown(g: G, rng: () => number): void {
  const bough = (pts: Pt[]): void => {
    stroke(g, pts.map((p) => ({ x: p.x, y: p.y + 10 })), BOUGH_HALF * 2 + 18, HW.barkDark);
    stroke(g, pts, BOUGH_HALF * 2 + 4, HW.barkShade);
    stroke(g, pts.map((p) => ({ x: p.x, y: p.y - 6 })), BOUGH_HALF * 2 - 30, HW.barkMid);
    stroke(g, pts.map((p) => ({ x: p.x, y: p.y - 14 })), BOUGH_HALF * 2 - 90, HW.bark);
  };
  bough(WEST_BOUGH);
  bough(EAST_BOUGH);
  for (const b of [WEST_BURL, EAST_BURL]) {
    g.fillStyle(HW.barkDark, 1); g.fillCircle(b.x, b.y + 12, b.r + 8);
    g.fillStyle(HW.barkShade, 1); g.fillCircle(b.x, b.y, b.r + 2);
    g.fillStyle(HW.barkMid, 1); g.fillCircle(b.x, b.y - 8, b.r - 24);
    g.fillStyle(HW.bark, 1); g.fillCircle(b.x - 10, b.y - 18, b.r - 70);
  }
  g.fillStyle(HW.barkDark, 1); g.fillEllipse(CROWN.x, CROWN.y + 14, CROWN.rx * 2 + 16, CROWN.ry * 2 + 16);
  g.fillStyle(HW.barkShade, 1); g.fillEllipse(CROWN.x, CROWN.y, CROWN.rx * 2, CROWN.ry * 2);
  g.fillStyle(HW.barkMid, 1); g.fillEllipse(CROWN.x, CROWN.y - 10, CROWN.rx * 1.7, CROWN.ry * 1.7);
  g.fillStyle(HW.bark, 1); g.fillEllipse(CROWN.x - 20, CROWN.y - 20, CROWN.rx * 1.2, CROWN.ry * 1.2);
  // Lesser branches and twigs reaching off the boughs into the air, with their turned leaves.
  for (const pts of [WEST_BOUGH, EAST_BOUGH]) {
    for (const p of samplePolyline(pts, 90)) {
      for (const side of [-1, 1]) {
        if (rng() < 0.3) continue;
        const a = side * Math.PI / 2 + (rng() - 0.5) * 0.9;
        const len = 80 + rng() * 90;
        const sx = p.x + Math.cos(a) * BOUGH_HALF * 0.9, sy = p.y + Math.sin(a) * BOUGH_HALF * 0.9;
        const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
        g.lineStyle(9, HW.barkShade, 1); g.lineBetween(sx, sy, ex, ey);
        g.lineStyle(5, HW.bark, 1); g.lineBetween(sx, sy - 1, ex, ey - 1);
        for (let k = 0; k < 14; k++) {
          const t = 0.4 + rng() * 0.6;
          const lx = sx + (ex - sx) * t + (rng() - 0.5) * 40, ly = sy + (ey - sy) * t + (rng() - 0.5) * 40;
          if (walkable(lx, ly)) continue;
          const c = [HW.leafGold, HW.leafButter, HW.leafRust, HW.leafGreen][Math.floor(rng() * 4)];
          leaf(g, lx, ly, rng() * Math.PI * 2, 9 + rng() * 6, c, 0.95);
        }
      }
    }
  }
  barkDetail(g, rng, 150, 120, 2250, TRUNK_TOP + 20, 1100);
  // Fallen leaves lying in the fork and along the boughs.
  for (let i = 0; i < 700; i++) {
    const x = 160 + rng() * 2080, y = 150 + rng() * 520;
    if (!walkable(x, y) || y > TRUNK_TOP + 20) continue;
    const c = [HW.leafGold, HW.leafRust, HW.leafButter, HW.leafRed][Math.floor(rng() * 4)];
    leaf(g, x, y, rng() * Math.PI * 2, 6 + rng() * 5, c, 0.6 + rng() * 0.3);
  }
}

/** The forest-floor paths and the boardwalk climb. */
function roads(g: G, rng: () => number): void {
  // Forest-floor paths: trodden soil.
  road(g, ROADS[1].pts, ROADS[1].w, HW.soilMid, dim(HW.soil, 0.3), HW.litter, rng);
  road(g, ROADS[2].pts, ROADS[2].w, HW.soilMid, dim(HW.soil, 0.3), HW.litter, rng);
  road(g, [{ x: CX, y: H }, { x: CX, y: TRUNK_FOOT + 60 }], 64, HW.soilMid, dim(HW.soil, 0.3), HW.litter, rng);
  // The root stairs: rungs of root grown and trimmed into steps up onto the bark.
  for (let i = 0; i < 9; i++) {
    const y = TRUNK_FOOT + 70 - i * 15;
    const w = 120 - i * 4;
    g.fillStyle(HW.heartDeep, 1); g.fillRoundedRect(CX - w / 2, y - 2, w, 14, 6);
    g.fillStyle(i % 2 ? HW.barkShade : HW.barkMid, 1); g.fillRoundedRect(CX - w / 2 + 2, y - 4, w - 4, 11, 5);
    g.fillStyle(HW.barkLit, 0.6); g.fillRect(CX - w / 2 + 8, y - 4, w - 16, 2);
  }
  // The boardwalk up the trunk: planks laid crosswise, nailed into the bark.
  boardwalk(g, [{ x: CX, y: TRUNK_FOOT - 50 }, { x: CX, y: 330 }], 70, rng);
  // The bough walks.
  boardwalk(g, WEST_BOUGH, 54, rng);
  boardwalk(g, EAST_BOUGH, 54, rng);
}

/** Planks laid across a line, each with nail heads and a lit leading edge. */
function boardwalk(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 13) {
      const x = a.x + ux * d, y = a.y + uy * d;
      if (rng() < 0.03) continue;
      const half = w / 2 + (rng() - 0.5) * 6;
      const c = mixC(HW.plank, rng() < 0.5 ? HW.plankLit : HW.plankDark, rng() * 0.5);
      g.lineStyle(12, HW.plankDark, 1); g.lineBetween(x - nx * (half + 1), y - ny * (half + 1), x + nx * (half + 1), y + ny * (half + 1));
      g.lineStyle(10, c, 1); g.lineBetween(x - nx * half, y - ny * half, x + nx * half, y + ny * half);
      g.fillStyle(HW.iron, 0.8);
      g.fillCircle(x - nx * (half - 5), y - ny * (half - 5), 1.2); g.fillCircle(x + nx * (half - 5), y + ny * (half - 5), 1.2);
    }
  }
}

/** Each terrace: a boardwalk ledge across the trunk, with a rope rail where it meets the air. */
function terraces(g: G, rng: () => number): void {
  for (const ty of TERRACES) {
    const hw = trunkHalf(ty) - 40;
    g.fillStyle(0x000000, 0.18); g.fillRect(CX - hw, ty - 14, hw * 2, 40);
    for (let x = CX - hw; x < CX + hw; x += 14) {
      const c = mixC(HW.plank, rng() < 0.5 ? HW.plankLit : HW.plankDark, rng() * 0.5);
      g.fillStyle(HW.plankDark, 1); g.fillRect(x, ty - 16, 13, 34);
      g.fillStyle(c, 1); g.fillRect(x + 1, ty - 15, 11, 31);
      g.fillStyle(HW.plankLit, 0.4); g.fillRect(x + 1, ty - 15, 11, 2);
    }
    // Bracket shadows under the ledge.
    for (let x = CX - hw + 30; x < CX + hw; x += 110) {
      g.fillStyle(0x000000, 0.2); g.fillTriangle(x - 10, ty + 18, x + 10, ty + 18, x, ty + 40);
    }
  }
  // Rope rail along both flanks of the trunk, the whole climb: posts and a sagging rope.
  for (const side of [-1, 1]) {
    let px = 0, py = 0;
    for (let y = TRUNK_TOP + 10; y <= TRUNK_FOOT - 20; y += 60) {
      const x = CX + side * (trunkHalf(y) - 14);
      g.fillStyle(HW.plankDark, 1); g.fillRect(x - 3, y - 18, 6, 20);
      g.fillStyle(HW.plankLit, 1); g.fillRect(x - 2, y - 18, 3, 3);
      if (py) {
        g.lineStyle(2, HW.rope, 0.9);
        g.beginPath(); g.moveTo(px, py - 14);
        for (let k = 1; k <= 6; k++) {
          const t = k / 6;
          g.lineTo(px + (x - px) * t, py - 14 + (y - py) * t + Math.sin(t * Math.PI) * 8);
        }
        g.strokePath();
      }
      px = x; py = y;
    }
  }
}

/** The Lantern Ledge: a round deck of planks on the trunk, laid in rings round the lantern post. */
function ledge(g: G, rng: () => number): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(LEDGE.x, LEDGE.y + 10, LEDGE.r * 2 + 20, LEDGE.r * 1.4 + 20);
  g.fillStyle(HW.plankDark, 1); g.fillEllipse(LEDGE.x, LEDGE.y, LEDGE.r * 2 + 8, LEDGE.r * 1.4 + 8);
  for (let ring = 0; ring < 6; ring++) {
    const r0 = LEDGE.r * (1 - ring / 6);
    const n = 24 - ring * 3;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.92) / n) * Math.PI * 2;
      const r1 = r0 - LEDGE.r / 6 + 2;
      const pts = [
        P(LEDGE.x + Math.cos(a0) * r0, LEDGE.y + Math.sin(a0) * r0 * 0.7),
        P(LEDGE.x + Math.cos(a1) * r0, LEDGE.y + Math.sin(a1) * r0 * 0.7),
        P(LEDGE.x + Math.cos(a1) * r1, LEDGE.y + Math.sin(a1) * r1 * 0.7),
        P(LEDGE.x + Math.cos(a0) * r1, LEDGE.y + Math.sin(a0) * r1 * 0.7),
      ];
      g.fillStyle(mixC(HW.plank, rng() < 0.5 ? HW.plankLit : HW.plankDark, rng() * 0.45), 1);
      g.fillPoints(pts, true, true);
    }
  }
  // A ring of brass tithe-marks inlaid round the edge: one notch per household.
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    g.fillStyle(i % 5 === 0 ? HW.whitewash : HW.amberDeep, 0.8);
    g.fillRect(LEDGE.x + Math.cos(a) * (LEDGE.r - 6) - 1, LEDGE.y + Math.sin(a) * (LEDGE.r - 6) * 0.7 - 1, 3, 3);
  }
}

/** The storm-split: a lightning scar down the bark, the red heartwood showing in its depth. */
function scar(g: G, rng: () => number): void {
  const { x, y, w, h } = SCAR;
  g.fillStyle(HW.barkDark, 1); g.fillRoundedRect(x - 12, y - 10, w + 24, h + 20, 20);
  g.fillStyle(HW.heartDeep, 1); g.fillRoundedRect(x - 4, y, w + 8, h, 14);
  g.fillStyle(HW.heart, 1); g.fillRoundedRect(x + 6, y + 10, w - 12, h - 20, 10);
  // Charred lips where the lightning came down.
  for (let i = 0; i < 40; i++) {
    const sy = y + rng() * h, side = rng() < 0.5 ? x - 8 : x + w + 8;
    g.fillStyle(HW.mark, 0.6); g.fillEllipse(side, sy, 10 + rng() * 10, 4);
  }
  // Grain lines deep in it.
  g.lineStyle(1, HW.heartLit, 0.5);
  for (let k = 0; k < 4; k++) {
    const gx = x + 10 + k * 9;
    g.beginPath(); g.moveTo(gx, y + 12);
    for (let yy = y + 12; yy < y + h - 12; yy += 16) g.lineTo(gx + Math.sin(yy * 0.05 + k) * 3, yy);
    g.strokePath();
  }
  // The catwalks: three planks and a rope rail each side.
  for (const cy of CATWALKS) {
    g.fillStyle(0x000000, 0.3); g.fillRect(x - 26, cy - 18, w + 52, 40);
    for (let k = 0; k < 3; k++) {
      g.fillStyle(HW.plankDark, 1); g.fillRect(x - 24, cy - 16 + k * 12, w + 48, 11);
      g.fillStyle(k === 1 ? HW.plankLit : HW.plank, 1); g.fillRect(x - 23, cy - 15 + k * 12, w + 46, 9);
    }
    g.lineStyle(2, HW.rope, 1);
    g.lineBetween(x - 24, cy - 22, x + w + 24, cy - 22); g.lineBetween(x - 24, cy + 24, x + w + 24, cy + 24);
    for (const px of [x - 24, x + w + 24]) { g.fillStyle(HW.plankDark, 1); g.fillRect(px - 3, cy - 28, 6, 56); }
  }
}

/** The root pool: tea-dark water in a hollow between roots, rimmed with moss and stones. */
function rootPool(g: G, rng: () => number): void {
  const { x, y, w, h } = POOL;
  blob(g, x + w / 2, y + h / 2 + 6, w * 0.62, h * 0.7, HW.mossDark, 1, rng, 14);
  blob(g, x + w / 2, y + h / 2, w * 0.58, h * 0.64, HW.moss, 0.9, rng, 14);
  g.fillStyle(0x2a2010, 1); g.fillEllipse(x + w / 2, y + h / 2, w, h);
  g.fillStyle(0x3a2a14, 1); g.fillEllipse(x + w / 2, y + h / 2 - 4, w * 0.9, h * 0.82);
  g.fillStyle(0x1a140a, 1); g.fillEllipse(x + w / 2 + 10, y + h / 2 + 4, w * 0.6, h * 0.5);
  // Rootlets trailing into the water, and fallen leaves floating on it.
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const sx = x + w / 2 + Math.cos(a) * w * 0.5, sy = y + h / 2 + Math.sin(a) * h * 0.5;
    g.lineStyle(2, HW.barkShade, 0.7);
    g.lineBetween(sx, sy, sx - Math.cos(a) * 26, sy - Math.sin(a) * 16);
  }
  for (let i = 0; i < 22; i++) {
    leaf(g, x + 30 + rng() * (w - 60), y + 20 + rng() * (h - 40), rng() * 6.3, 7, rng() < 0.5 ? HW.leafGold : HW.leafRust, 0.9);
  }
  // The iron pipe sunk into it, and its brass collar.
  g.fillStyle(HW.iron, 1); g.fillCircle(PIPE_HEAD.x + 32, PIPE_HEAD.y, 12);
  g.lineStyle(3, HW.verdigris, 1); g.strokeCircle(PIPE_HEAD.x + 32, PIPE_HEAD.y, 13);
}

/** The pipe that drinks the pool: iron, riveted, climbing the trunk's west flank to the crown. */
function pipe(g: G): void {
  stroke(g, PIPE, 16, HW.iron);
  stroke(g, PIPE, 10, HW.ironLit);
  stroke(g, PIPE.map((p) => ({ x: p.x - 2, y: p.y - 2 })), 3, mixC(HW.ironLit, 0xffffff, 0.3));
  for (const p of samplePolyline(PIPE, 70)) {
    g.fillStyle(HW.verdigris, 1); g.fillCircle(p.x, p.y, 9);
    g.fillStyle(HW.verdigrisDark, 1); g.fillCircle(p.x, p.y, 4);
  }
}

/** The millrace: a cold brown stream running from the east edge to the wheel. */
function millrace(g: G): void {
  stroke(g, MILLRACE, 66, HW.mossDark);
  stroke(g, MILLRACE, 54, 0x3a2c18);
  stroke(g, MILLRACE.map((p) => ({ x: p.x, y: p.y - 4 })), 36, 0x4e3c20);
}

// ── Set pieces ───────────────────────────────────────────────────────

/** A topiary person, as a shadow seen through green glass: a hedge with a human outline. */
function graftedShadow(g: G, x: number, y: number, s: number, pose: number): void {
  const c = HW.verdigrisDark;
  g.fillStyle(c, 0.55);
  g.fillCircle(x, y - s * 1.7, s * 0.34);
  g.fillEllipse(x, y - s * 0.95, s * 0.8, s * 1.1);
  g.fillRect(x - s * 0.3, y - s * 0.5, s * 0.22, s * 0.5);
  g.fillRect(x + s * 0.08, y - s * 0.5, s * 0.22, s * 0.5);
  // Arms held as a topiarist would clip them: up in a V, out level, or wrapped.
  const arm = (a: number): void => { g.lineStyle(s * 0.2, c, 0.55); g.lineBetween(x, y - s * 1.2, x + Math.cos(a) * s * 0.9, y - s * 1.2 + Math.sin(a) * s * 0.9); };
  if (pose === 0) { arm(-Math.PI * 0.75); arm(-Math.PI * 0.25); } else if (pose === 1) { arm(Math.PI); arm(0); } else { arm(Math.PI * 0.8); arm(Math.PI * 0.2); }
}

/** The Glasshouse: the Empress's palace of verdigris iron and green glass on the crown fork. */
function glasshouse(g: G, rng: () => number): void {
  const { x, w } = GLASSHOUSE;
  const base = GLASSHOUSE.y + GLASSHOUSE.h;
  const cx = x + w / 2;
  shadow(g, cx, base + 4, w + 60, 40, 0.35);
  // A plinth of cut stone the bark has grown up round.
  g.fillStyle(HW.barkDark, 1); g.fillRect(x - 14, base - 28, w + 28, 30);
  g.fillStyle(0x8a8a80, 1); g.fillRect(x - 8, base - 34, w + 16, 22);
  g.fillStyle(0xb0b0a4, 1); g.fillRect(x - 8, base - 34, w + 16, 4);
  // The two wings: long glass halls with pitched roofs.
  const wing = (wx: number, ww: number): void => {
    const top = base - 160;
    g.fillStyle(HW.glassDeep, 0.95); g.fillRect(wx, top, ww, 128);
    g.fillStyle(HW.glass, 0.55); g.fillRect(wx, top, ww, 128);
    for (let i = 0; i < 8; i++) graftedShadow(g, wx + 20 + i * ((ww - 40) / 7), base - 40, 18 + (i % 3) * 3, (i * 7 + Math.floor(rng() * 3)) % 3);
    g.fillStyle(HW.glassDeep, 0.95); g.fillTriangle(wx - 6, top, wx + ww + 6, top, wx + ww / 2, top - 52);
    g.fillStyle(HW.glass, 0.45); g.fillTriangle(wx, top, wx + ww, top, wx + ww / 2, top - 46);
    g.lineStyle(3, HW.verdigrisDark, 1); g.strokeRect(wx, top, ww, 128);
    g.lineStyle(2, HW.verdigris, 1);
    for (let gx = wx + 22; gx < wx + ww; gx += 22) g.lineBetween(gx, top, gx, top + 128);
    for (let gy = top + 32; gy < top + 128; gy += 32) g.lineBetween(wx, gy, wx + ww, gy);
    g.lineBetween(wx - 6, top, wx + ww / 2, top - 52); g.lineBetween(wx + ww + 6, top, wx + ww / 2, top - 52);
    for (let k = 1; k < 5; k++) g.lineBetween(wx + (ww / 5) * k, top, wx + ww / 2, top - 52);
  };
  wing(x, 170);
  wing(x + w - 170, 170);
  // The central hall and its dome, rising off the top of the map.
  const hx = cx - 95, hw = 190, htop = base - 200;
  g.fillStyle(HW.glassDeep, 0.95); g.fillRect(hx, htop, hw, 168);
  g.fillStyle(HW.glass, 0.5); g.fillRect(hx, htop, hw, 168);
  for (let i = 0; i < 4; i++) graftedShadow(g, hx + 30 + i * 44, base - 44, 22, (i + 1) % 3);
  g.fillStyle(HW.glassDeep, 0.95); g.fillEllipse(cx, htop, hw + 40, 240);
  g.fillStyle(HW.glass, 0.5); g.fillEllipse(cx, htop, hw + 26, 226);
  g.fillStyle(HW.glassDeep, 1); g.fillRect(hx - 22, htop, hw + 44, 10);
  g.lineStyle(3, HW.verdigrisDark, 1); g.strokeEllipse(cx, htop, hw + 40, 240);
  g.lineStyle(2, HW.verdigris, 1);
  for (let k = -3; k <= 3; k++) {
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI;
      const px = cx + Math.cos(a) * (hw / 2 + 20) * (k / 3.5), py = htop + Math.sin(a) * 120;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  for (const r of [0.35, 0.65]) g.strokeEllipse(cx, htop - 120 * (1 - r) * 0.2, (hw + 40) * r, 240 * r * 0.6);
  for (let gx = hx + 24; gx < hx + hw; gx += 24) g.lineBetween(gx, htop, gx, htop + 168);
  // The finial: an iron rose.
  g.fillStyle(HW.verdigris, 1); g.fillCircle(cx, htop - 118, 8);
  // The door: tall iron double-doors in a pointed arch, wrapped in iron vines.
  const dw = 70, dh = 96;
  g.fillStyle(HW.iron, 1);
  g.fillRect(cx - dw / 2 - 8, base - 34 - dh, dw + 16, dh);
  g.fillTriangle(cx - dw / 2 - 8, base - 34 - dh, cx + dw / 2 + 8, base - 34 - dh, cx, base - 34 - dh - 40);
  g.fillStyle(0x16201c, 1);
  g.fillRect(cx - dw / 2, base - 34 - dh + 6, dw, dh - 6);
  g.fillTriangle(cx - dw / 2, base - 34 - dh + 6, cx + dw / 2, base - 34 - dh + 6, cx, base - 34 - dh - 28);
  g.lineStyle(2, HW.verdigrisDark, 1); g.lineBetween(cx, base - 34 - dh - 28, cx, base - 34);
  g.lineStyle(2.5, HW.verdigris, 1);
  for (let k = 0; k < 7; k++) {
    const vy = base - 40 - k * 16;
    g.beginPath(); g.arc(cx - dw / 4, vy, 10, k * 0.9, k * 0.9 + Math.PI * 1.3); g.strokePath();
    g.beginPath(); g.arc(cx + dw / 4, vy, 10, Math.PI - k * 0.9 - Math.PI * 1.3, Math.PI - k * 0.9); g.strokePath();
  }
  // Six iron buds on the door, one for each of the Empress's children.
  for (let i = 0; i < 6; i++) {
    const bx = cx - 30 + i * 12, by = base - 34 - dh - 4;
    g.fillStyle(HW.verdigrisDark, 1); g.fillCircle(bx, by, 4.5);
    g.fillStyle(HW.verdigris, 1); g.fillCircle(bx - 0.8, by - 0.8, 3);
  }
  g.fillStyle(0x8a8a80, 1); g.fillRect(cx - dw / 2 - 16, base - 34, dw + 32, 8);
  // Bark lipping up round the plinth: the tree has been growing round it for a hundred years.
  for (let i = 0; i < 18; i++) {
    const bx = x - 10 + i * ((w + 20) / 17);
    if (Math.abs(bx - cx) < 60) continue;
    g.fillStyle(HW.barkShade, 1); g.fillEllipse(bx, base - 4, 40, 18);
    g.fillStyle(HW.bark, 1); g.fillEllipse(bx - 2, base - 8, 30, 10);
    lenticel(g, bx, base - 6, 14, 0.8);
  }
}

/** Prince Birchbark's Heartroom: a hall grown, not built, out of the west burl. */
function heartroom(g: G, rng: () => number): void {
  const { x, y } = HEARTROOM;
  shadow(g, x, y + 4, 300, 40, 0.35);
  // Living birch columns in a crescent, their crowns knitted into a roof.
  const cols = 7;
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1);
    const cx = x - 120 + t * 240, cy = y - Math.sin(t * Math.PI) * 18;
    const h = 150 + Math.sin(t * Math.PI) * 40;
    g.fillStyle(HW.barkShade, 1); g.fillRect(cx - 13, cy - h, 26, h);
    g.fillStyle(HW.bark, 1); g.fillRect(cx - 11, cy - h, 18, h);
    for (let k = 0; k < 9; k++) lenticel(g, cx - 2, cy - 12 - k * (h / 9), 12 + rng() * 6, 0.8);
  }
  // The roof: interlaced branches and a thatch of gold leaves.
  g.fillStyle(HW.leafDark, 1); g.fillEllipse(x, y - 190, 330, 120);
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    const lx = x + Math.cos(a) * 160 * r, ly = y - 192 + Math.sin(a) * 56 * r;
    leaf(g, lx, ly, rng() * 6.3, 12 + rng() * 6, [HW.leafGold, HW.leafButter, HW.leafRust][Math.floor(rng() * 3)], 1);
  }
  // The great round door: a knot in the burl, its heartwood red, a bark lid curled above.
  g.fillStyle(HW.barkDark, 1); g.fillEllipse(x, y - 52, 112, 112);
  g.fillStyle(HW.heartDeep, 1); g.fillEllipse(x, y - 52, 96, 98);
  g.fillStyle(HW.heart, 1); g.fillEllipse(x, y - 48, 82, 84);
  for (let r = 10; r < 40; r += 7) { g.lineStyle(1.2, HW.heartLit, 0.5); g.strokeEllipse(x, y - 48, r * 2, r * 2.05); }
  g.fillStyle(HW.amber, 1); g.fillCircle(x + 26, y - 44, 5);
  // Banners: the pruning-hook of the Empress's children, gold on heartwood red.
  for (const bx of [x - 150, x + 150]) {
    g.fillStyle(HW.plankDark, 1); g.fillRect(bx - 2, y - 150, 4, 150);
    g.fillStyle(HW.heart, 1); g.fillRect(bx + 2, y - 146, 30, 54);
    g.fillTriangle(bx + 2, y - 92, bx + 32, y - 92, bx + 17, y - 80);
    g.lineStyle(3, HW.amberLit, 1);
    g.beginPath(); g.arc(bx + 20, y - 128, 8, -Math.PI * 0.2, Math.PI * 0.9); g.strokePath();
    g.lineBetween(bx + 12, y - 124, bx + 12, y - 100);
  }
  // A clipped hedge either side of the door — the shape of a kneeling person, if you look.
  for (const side of [-1, 1]) {
    const hx = x + side * 78;
    g.fillStyle(HW.leafDark, 1); g.fillEllipse(hx, y - 20, 34, 40); g.fillCircle(hx, y - 46, 12);
    g.fillStyle(HW.moss, 1); g.fillEllipse(hx - 3, y - 24, 26, 30); g.fillCircle(hx - 2, y - 48, 9);
  }
}

/** The Drumming Loft: a tall drilled post where the court's woodpeckers roost, with log drums. */
function loft(g: G, rng: () => number): void {
  const { x, y } = LOFT;
  shadow(g, x, y + 2, 200, 30, 0.32);
  // A hollow birch stub, full of woodpecker holes.
  g.fillStyle(HW.barkShade, 1); g.fillRoundedRect(x - 44, y - 210, 88, 210, 30);
  g.fillStyle(HW.bark, 1); g.fillRoundedRect(x - 38, y - 206, 70, 204, 26);
  for (let i = 0; i < 16; i++) {
    const hx = x - 26 + (i % 4) * 17 + (rng() - 0.5) * 6, hy = y - 190 + Math.floor(i / 4) * 44 + (rng() - 0.5) * 8;
    g.fillStyle(HW.heartDeep, 1); g.fillCircle(hx, hy, 5);
    g.fillStyle(HW.mark, 1); g.fillCircle(hx, hy + 1, 3.5);
  }
  for (let k = 0; k < 10; k++) lenticel(g, x - 6, y - 20 - k * 19, 18, 0.7);
  // Hollow-log drums slung on either side, each with its striker.
  for (const side of [-1, 1]) {
    const dx = x + side * 72, dy = y - 46;
    g.fillStyle(HW.barkDark, 1); g.fillEllipse(dx, dy, 52, 60);
    g.fillStyle(HW.barkMid, 1); g.fillEllipse(dx, dy - 2, 46, 54);
    g.fillStyle(HW.heartDeep, 1); g.fillEllipse(dx + side * 10, dy - 4, 16, 34);
    g.lineStyle(2, HW.rope, 1); g.lineBetween(dx, dy - 30, x + side * 30, y - 120);
  }
  // A woodpecker on top, keeping time.
  woodpecker(g, x + 10, y - 220, 1, 10, 0);
}

/** A knot-hole house: a burl bulging off the trunk's flank with a round red door. */
function knotHouse(g: G, x: number, y: number, s: number, side: -1 | 1, ringed: boolean, rng: () => number): void {
  shadow(g, x, y + 2, 110 * s, 22 * s, 0.3);
  const bx = x - side * 8 * s;
  g.fillStyle(HW.barkDark, 1); g.fillEllipse(bx, y - 44 * s, 118 * s, 104 * s);
  g.fillStyle(HW.barkShade, 1); g.fillEllipse(bx, y - 48 * s, 110 * s, 96 * s);
  g.fillStyle(HW.bark, 1); g.fillEllipse(bx - side * 10 * s, y - 56 * s, 78 * s, 66 * s);
  for (let i = 0; i < 6; i++) lenticel(g, bx + (rng() - 0.5) * 70 * s, y - 20 * s - rng() * 70 * s, (10 + rng() * 10) * s, 0.8);
  // Moss on its north side.
  g.fillStyle(HW.moss, 0.55); g.fillEllipse(bx + side * 24 * s, y - 86 * s, 40 * s, 14 * s);
  // The door: round, plank-built, set in a red heartwood frame.
  const dx = x, dy = y - 24 * s;
  g.fillStyle(HW.heartDeep, 1); g.fillCircle(dx, dy, 22 * s);
  g.fillStyle(HW.heart, 1); g.fillCircle(dx, dy, 19 * s);
  g.fillStyle(HW.plank, 1); g.fillCircle(dx, dy, 15 * s);
  g.lineStyle(1, HW.plankDark, 1);
  for (let k = -2; k <= 2; k++) g.lineBetween(dx + k * 6 * s, dy - Math.sqrt(Math.max(0, 225 - 36 * k * k)) * s, dx + k * 6 * s, dy + Math.sqrt(Math.max(0, 225 - 36 * k * k)) * s);
  g.fillStyle(HW.amberDeep, 1); g.fillCircle(dx + 8 * s, dy + 2 * s, 2 * s);
  // A round window above, glowing amber.
  g.fillStyle(HW.heartDeep, 1); g.fillCircle(dx - side * 26 * s, y - 64 * s, 9 * s);
  g.fillStyle(HW.amberLit, 0.9); g.fillCircle(dx - side * 26 * s, y - 64 * s, 6.5 * s);
  g.lineStyle(1, HW.heartDeep, 1); g.lineBetween(dx - side * 26 * s - 6 * s, y - 64 * s, dx - side * 26 * s + 6 * s, y - 64 * s);
  // A spile and bucket by every door: every household owes its sap.
  spile(g, dx + side * 34 * s, y - 2, 9 * s, 0.5);
  if (ringed) {
    // The pruners' white ring, slapped round the whole burl: this household is short.
    g.lineStyle(6 * s, HW.whitewash, 0.95); g.strokeEllipse(bx, y - 48 * s, 106 * s, 90 * s);
    for (let i = 0; i < 6; i++) {
      const a = rng() * Math.PI * 2;
      g.lineStyle(2, HW.whitewash, 0.8);
      g.lineBetween(bx + Math.cos(a) * 53 * s, y - 48 * s + Math.sin(a) * 45 * s, bx + Math.cos(a) * 53 * s, y - 48 * s + Math.sin(a) * 45 * s + 10 * s);
    }
  }
}

/** The Burl: the court shop, a big knot with a counter cut into it and a board hung out. */
function burlShop(g: G, rng: () => number): void {
  const { x, y } = SHOP;
  knotHouse(g, x, y, 1.35, -1, false, rng);
  // A counter of a split log across the door.
  g.fillStyle(HW.heartDeep, 1); g.fillRect(x - 46, y - 18, 92, 14);
  g.fillStyle(HW.sapwood, 1); g.fillRect(x - 46, y - 22, 92, 6);
  // Wares: jars of amber, a charm on a cord, a little ring-locket.
  for (let i = 0; i < 4; i++) { sapDrop(g, x - 30 + i * 18, y - 28, 4.5); }
  // The hanging sign: a slice of branch with a knot burnt into it.
  g.lineStyle(2, HW.rope, 1); g.lineBetween(x + 54, y - 110, x + 54, y - 94); g.lineBetween(x + 86, y - 110, x + 86, y - 94);
  g.fillStyle(HW.plankDark, 1); g.fillRect(x + 40, y - 116, 60, 4);
  g.fillStyle(HW.sapwood, 1); g.fillEllipse(x + 70, y - 82, 50, 28);
  g.lineStyle(1, HW.plankDark, 1); g.strokeEllipse(x + 70, y - 82, 50, 28); g.strokeEllipse(x + 70, y - 82, 30, 16);
  g.fillStyle(HW.heartDeep, 1); g.fillCircle(x + 70, y - 82, 4);
}

/** The Great Sap Lantern: a bent birch post hung with an amber drop the size of a cart. */
function greatLantern(g: G): void {
  const { x, y } = GREAT_LANTERN;
  shadow(g, x, y + 2, 70, 18, 0.35);
  g.lineStyle(14, HW.barkShade, 1);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 120); g.lineTo(x + 10, y - 190); g.lineTo(x + 60, y - 220); g.strokePath();
  g.lineStyle(9, HW.bark, 1);
  g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 6, y - 120); g.lineTo(x + 8, y - 190); g.lineTo(x + 58, y - 222); g.strokePath();
  for (let k = 0; k < 7; k++) lenticel(g, x - 4, y - 14 - k * 22, 14, 0.8);
  sapLantern(g, x + 60, y - 220, 34);
}

/** The tithe-scales: a beam balance on a post, with weights stacked and sap jars waiting. */
function scales(g: G): void {
  const { x, y } = SCALES;
  shadow(g, x, y + 2, 120, 22, 0.3);
  g.fillStyle(HW.plankDark, 1); g.fillRect(x - 40, y - 16, 80, 16);
  g.fillStyle(HW.iron, 1); g.fillRect(x - 4, y - 96, 8, 82);
  g.lineStyle(5, HW.iron, 1); g.lineBetween(x - 54, y - 92, x + 54, y - 86);
  g.fillStyle(HW.amberDeep, 1); g.fillTriangle(x - 8, y - 96, x + 8, y - 96, x, y - 108);
  for (const [px, py] of [[x - 54, y - 92], [x + 54, y - 86]] as const) {
    g.lineStyle(1, HW.iron, 1); g.lineBetween(px, py, px - 16, py + 30); g.lineBetween(px, py, px + 16, py + 30);
    g.fillStyle(HW.ironLit, 1); g.fillEllipse(px, py + 32, 38, 10);
  }
  sapDrop(g, x - 54, y - 64, 7);
  g.fillStyle(HW.iron, 1); g.fillRect(x + 46, y - 64, 16, 10); g.fillRect(x + 49, y - 72, 10, 8);
  for (let i = 0; i < 3; i++) { g.fillStyle(HW.amber, 0.9); g.fillRect(x - 30 + i * 16, y - 32, 10, 14); g.lineStyle(1, HW.amberDeep, 1); g.strokeRect(x - 30 + i * 16, y - 32, 10, 14); }
}

/** The sawmill that is never allowed to run: a timber shed, a great blade, chained and locked. */
function sawmill(g: G, rng: () => number): void {
  const { x, y } = MILL;
  shadow(g, x, y + 4, 300, 40, 0.35);
  // The shed.
  g.fillStyle(HW.plankDark, 1); g.fillRect(x - 130, y - 140, 260, 140);
  for (let k = 0; k < 13; k++) {
    g.fillStyle(mixC(HW.plank, HW.plankDark, rng() * 0.4), 1); g.fillRect(x - 128 + k * 20, y - 138, 18, 136);
  }
  g.fillStyle(HW.mossDark, 1); g.fillTriangle(x - 146, y - 136, x + 146, y - 136, x, y - 210);
  g.fillStyle(HW.moss, 1); g.fillTriangle(x - 132, y - 140, x + 132, y - 140, x, y - 202);
  // The brass whistle on the ridge — the sound everyone dreads.
  g.fillStyle(HW.amberDeep, 1); g.fillRect(x - 5, y - 232, 10, 26);
  g.fillStyle(HW.amberLit, 1); g.fillRect(x - 3, y - 232, 4, 26);
  // The bay, open at the front, and the blade in it.
  g.fillStyle(0x1a140c, 1); g.fillRect(x - 74, y - 118, 148, 118);
  const bx = x, by = y - 58, br = 50;
  g.fillStyle(HW.ironLit, 1); g.fillCircle(bx, by, br);
  g.fillStyle(0x9aa0a2, 1); g.fillCircle(bx - 6, by - 6, br * 0.82);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    g.fillStyle(0xc8ccce, 1);
    g.fillTriangle(bx + Math.cos(a) * br, by + Math.sin(a) * br, bx + Math.cos(a + 0.12) * br, by + Math.sin(a + 0.12) * br, bx + Math.cos(a + 0.03) * (br + 8), by + Math.sin(a + 0.03) * (br + 8));
  }
  g.fillStyle(HW.iron, 1); g.fillCircle(bx, by, 9);
  // Chains wrapped round the blade, and a padlock the size of a head.
  g.lineStyle(4, HW.rust, 1);
  for (const a of [0.5, -0.6]) {
    g.lineBetween(bx - Math.cos(a) * 70, by - Math.sin(a) * 70, bx + Math.cos(a) * 70, by + Math.sin(a) * 70);
  }
  for (let i = -6; i <= 6; i++) {
    for (const a of [0.5, -0.6]) {
      g.lineStyle(2, mixC(HW.rust, 0xffffff, 0.2), 1);
      g.strokeEllipse(bx + Math.cos(a) * i * 10, by + Math.sin(a) * i * 10, 8, 5);
    }
  }
  g.fillStyle(HW.amberDeep, 1); g.fillRoundedRect(bx + 16, by + 16, 30, 26, 6);
  g.lineStyle(4, HW.ironLit, 1); g.beginPath(); g.arc(bx + 31, by + 16, 9, Math.PI, 0); g.strokePath();
  g.fillStyle(HW.mark, 1); g.fillCircle(bx + 31, by + 28, 3);
  // The waterwheel on the race side, still and mossy.
  const wx = x + 156, wy = y - 54;
  g.fillStyle(HW.plankDark, 1); g.fillCircle(wx, wy, 58);
  g.fillStyle(0x1a140c, 1); g.fillCircle(wx, wy, 46);
  g.lineStyle(5, HW.plank, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(wx, wy, wx + Math.cos(a) * 56, wy + Math.sin(a) * 56);
  }
  g.lineStyle(6, HW.plank, 1); g.strokeCircle(wx, wy, 54);
  g.fillStyle(HW.moss, 0.7); g.fillEllipse(wx - 10, wy + 48, 60, 14);
  // Stacked fallen-bough logs by the door (fallen, never felled).
  for (let i = 0; i < 4; i++) {
    const lx = x - 110 + (i % 2) * 22, ly = y + 2 - Math.floor(i / 2) * 18;
    g.fillStyle(HW.barkShade, 1); g.fillRoundedRect(lx - 30, ly - 16, 60, 16, 8);
    g.fillStyle(HW.sapwood, 1); g.fillEllipse(lx + 30, ly - 8, 12, 16);
    g.lineStyle(1, HW.heart, 1); g.strokeEllipse(lx + 30, ly - 8, 6, 9);
  }
}

/** A great root humping out of the soil: tapering, birch-pale on top, earthy at its flanks. */
function rootHump(g: G, pts: Pt[], girth: number, rng: () => number): void {
  const pp = samplePolyline(pts, 12);
  for (let i = 0; i < pp.length; i++) {
    const t = i / (pp.length - 1);
    const r = girth * (1 - t * 0.45);
    g.fillStyle(0x000000, 0.25); g.fillEllipse(pp[i].x + 4, pp[i].y + r * 0.6, r * 2.2, r * 0.9);
  }
  for (let i = 0; i < pp.length; i++) {
    const t = i / (pp.length - 1);
    const r = girth * (1 - t * 0.45);
    g.fillStyle(HW.barkDark, 1); g.fillCircle(pp[i].x, pp[i].y, r + 3);
  }
  for (let i = 0; i < pp.length; i++) {
    const t = i / (pp.length - 1);
    const r = girth * (1 - t * 0.45);
    g.fillStyle(HW.barkShade, 1); g.fillCircle(pp[i].x, pp[i].y - 2, r);
    g.fillStyle(HW.bark, 1); g.fillCircle(pp[i].x - r * 0.15, pp[i].y - r * 0.4, r * 0.55);
  }
  for (let i = 0; i < pp.length; i += 2) lenticel(g, pp[i].x + (rng() - 0.5) * 8, pp[i].y - 6, 10 + rng() * 8, 0.7);
}

/** A sap lantern on its crook of bent birch. */
function lanternPost(g: G, x: number, y: number, flip: number): void {
  shadow(g, x, y, 18, 6);
  g.lineStyle(4, HW.barkShade, 1);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 56); g.lineTo(x + flip * 16, y - 66); g.strokePath();
  g.lineStyle(2, HW.bark, 1); g.lineBetween(x - 1, y, x - 1, y - 56);
  sapLantern(g, x + flip * 16, y - 66, 10);
}

/** The broken branch's stump on the trunk: its sawn-by-storm face shows a century of rings. */
function ringStump(g: G): void {
  const { x, y, r } = RING_STUMP;
  shadow(g, x, y + 4, r * 2.6, r * 0.8, 0.35);
  g.fillStyle(HW.barkDark, 1); g.fillEllipse(x, y - 10, r * 2.2, r * 1.4 + 20);
  g.fillStyle(HW.barkShade, 1); g.fillRect(x - r * 1.05, y - 30, r * 2.1, 24);
  g.fillStyle(HW.sapwood, 1); g.fillEllipse(x, y - 30, r * 2, r * 1.2);
  for (let k = 1; k < 12; k++) {
    g.lineStyle(k % 3 === 0 ? 2 : 1, k % 3 === 0 ? HW.heart : HW.heartLit, 0.75);
    g.strokeEllipse(x + k * 0.5, y - 30, r * 2 * (k / 12), r * 1.2 * (k / 12));
  }
  g.fillStyle(HW.heartDeep, 1); g.fillCircle(x + 6, y - 30, 3);
  // A crack from the storm, and a little brass reading-pin Dendro left in the 40th ring.
  g.lineStyle(2, HW.heartDeep, 1); g.lineBetween(x - r * 0.9, y - 34, x - 6, y - 28);
  g.fillStyle(HW.amberLit, 1); g.fillCircle(x + r * 0.55, y - 38, 2.5);
}

/** A drift of turned leaves, banked where the boughs catch them. */
function drift(g: G, x: number, y: number, s: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 4, 90 * s, 26 * s);
  g.fillStyle(HW.leafRust, 1); g.fillEllipse(x, y - 6 * s, 84 * s, 30 * s);
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
    leaf(g, x + Math.cos(a) * 40 * s * rr, y - 8 * s + Math.sin(a) * 13 * s * rr - (1 - rr) * 8 * s, rng() * 6.3, 9 * s,
      [HW.leafGold, HW.leafButter, HW.leafRust, HW.leafRed][Math.floor(rng() * 4)], 1);
  }
}

// ── The painter ──────────────────────────────────────────────────────

/** Lantern glass positions (for the flicker), matching `lanternPost`. */
const lanternFlip = (i: number): number => (i % 2 ? -1 : 1);
const lanternGlow = (l: Pt, i: number): Pt => ({ x: l.x + lanternFlip(i) * 16, y: l.y - 66 + 13 });
const GREAT_GLOW = { x: GREAT_LANTERN.x + 60, y: GREAT_LANTERN.y - 220 + 44 };

/** Tap drips: a drop forms at each spout and falls into its bucket. */
const tapSpout = (t: Pt): Pt => ({ x: t.x + 6, y: t.y - 14 });

export function makeHeartwoodPainter(): AreaPainter {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  const add = (x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void): void => {
    pieces.push({ x, y, w, h, draw });
  };

  add(CX, GLASSHOUSE.y + GLASSHOUSE.h + 2, GLASSHOUSE.w + 80, GLASSHOUSE.h + 40, (g, rng) => glasshouse(g, rng));
  add(HEARTROOM.x, HEARTROOM.y + 4, 360, 280, (g, rng) => heartroom(g, rng));
  add(LOFT.x, LOFT.y + 2, 220, 250, (g, rng) => loft(g, rng));
  HOUSES.forEach((h, i) => add(h.x, h.y + 2, 130 * h.s, 120 * h.s, (g, rng) => knotHouse(g, h.x, h.y, h.s, h.side, i === RINGED_HOUSE, rng)));
  add(SHOP.x, SHOP.y + 2, 200, 170, (g, rng) => burlShop(g, rng));
  add(GREAT_LANTERN.x, GREAT_LANTERN.y + 2, 160, 280, (g) => greatLantern(g));
  add(SCALES.x, SCALES.y + 2, 140, 120, (g) => scales(g));
  add(MILL.x + 30, MILL.y + 4, 400, 260, (g, rng) => sawmill(g, rng));
  for (const r of ROOTS) {
    const maxY = Math.max(...r.pts.map((p) => p.y));
    const xs = r.pts.map((p) => p.x);
    add((Math.min(...xs) + Math.max(...xs)) / 2, maxY + r.girth, Math.max(...xs) - Math.min(...xs) + 60, 120, (g, rng) => rootHump(g, r.pts, r.girth, rng));
  }
  LANTERNS.forEach((l, i) => add(l.x, l.y, 50, 90, (g) => lanternPost(g, l.x, l.y, lanternFlip(i))));
  for (const t of TAPS) add(t.x, t.y, 30, 40, (g) => spile(g, t.x, t.y, 10, 0.6));
  add(RING_STUMP.x, RING_STUMP.y + 4, 130, 100, (g) => ringStump(g));
  for (const d of DRIFTS) add(d.x, d.y + 2, 100 * d.s, 50 * d.s, (g, rng) => drift(g, d.x, d.y, d.s, rng));

  return {
    ground(g, rng) {
      airBackdrop(g, rng);
      forestFloor(g, rng);
      trunk(g, rng);
      crown(g, rng);
      pipe(g);
      terraces(g, rng);
      roads(g, rng);
      ledge(g, rng);
      scar(g, rng);
      rootPool(g, rng);
      millrace(g);
      // A worn patch in front of the Glasshouse door where the pruned are led in.
      g.fillStyle(HW.barkShade, 0.5); g.fillEllipse(GLASS_DOOR.x, GLASS_DOOR.y + 10, 150, 46);
      for (let i = 0; i < 9; i++) { g.fillStyle(HW.whitewash, 0.35); g.fillCircle(GLASS_DOOR.x - 60 + i * 15, GLASS_DOOR.y + 26 + Math.sin(i) * 4, 2.5); }
    },

    pieces,

    animate(g, t, view) {
      // The root pool: rings where things rise, and the lazy turn of floating leaves.
      const pc = { x: POOL.x + POOL.w / 2, y: POOL.y + POOL.h / 2 };
      if (inView(view, pc.x, pc.y, 200)) {
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.35 + i * 0.27) % 1;
          const rx = pc.x - 90 + ((i * 67) % 180), ry = pc.y - 30 + ((i * 41) % 60);
          g.lineStyle(1.2, 0xd8c890, (1 - ph) * 0.45); g.strokeEllipse(rx, ry, 8 + ph * 40, 3 + ph * 14);
        }
        // The pipe's drinking: a slow whirl at its mouth.
        for (let k = 0; k < 3; k++) {
          g.lineStyle(1.5, 0xd8c890, 0.35);
          g.beginPath(); g.arc(PIPE_HEAD.x + 32, PIPE_HEAD.y, 18 + k * 8, t * 2 + k, t * 2 + k + 2.2); g.strokePath();
        }
      }
      // The millrace runs; it is the only thing at the mill that is allowed to move.
      if (inView(view, 2200, 1530, 260)) {
        for (let i = 0; i < 12; i++) {
          const ph = (t * 0.5 + i / 12) % 1;
          const x = W - ph * (W - 2090), y = 1516 + ((i * 13) % 34) + ph * 20;
          g.lineStyle(1.5, 0xa89a70, 0.4 * (1 - ph)); g.lineBetween(x, y, x - 16, y + 1);
        }
      }
      // Sap creeping down from each tap and dropping into its bucket.
      for (let i = 0; i < TAPS.length; i++) {
        const s = tapSpout(TAPS[i]);
        if (!inView(view, s.x, s.y, 40)) continue;
        const ph = (t * 0.45 + i * 0.31) % 1;
        if (ph < 0.7) sapDrop(g, s.x, s.y + 2, 1 + ph * 2.6, 0.9);
        else sapDrop(g, s.x, s.y + 2 + (ph - 0.7) * 30, 2.6, 0.9);
      }
      // Mist sliding slowly past the flanks of the tree.
      for (let i = 0; i < 10; i++) {
        const y = 420 + i * 92;
        const span = W + 600;
        const x = ((t * (10 + (i % 3) * 5) + i * 377) % span) - 300;
        if (!inView(view, x, y, 260) || walkable(x, y)) continue;
        g.fillStyle(HW.mist, 0.14); g.fillEllipse(x, y, 320, 34);
      }
      // A hawk circling far below over the lesser forest.
      for (let i = 0; i < 2; i++) {
        const a = t * (0.25 + i * 0.08) + i * 3;
        const hx = (i ? 2050 : 330) + Math.cos(a) * 150, hy = 1050 + Math.sin(a) * 60;
        if (!inView(view, hx, hy, 40)) continue;
        g.lineStyle(2, 0x3a3226, 0.6);
        g.lineBetween(hx - 9, hy - Math.abs(Math.sin(t * 3)) * 2, hx, hy + 2); g.lineBetween(hx, hy + 2, hx + 9, hy - Math.abs(Math.sin(t * 3)) * 2);
      }
    },

    animateOver(g, t, view) {
      // Every sap lantern breathes gold.
      LANTERNS.forEach((l, i) => {
        const p = lanternGlow(l, i);
        if (!inView(view, p.x, p.y, 80)) return;
        const k = 0.75 + 0.25 * Math.sin(t * (1.3 + (i % 4) * 0.2) + i);
        glow(g, p.x, p.y, 38 * k, HW.amber, 0.04, 3);
      });
      if (inView(view, GREAT_GLOW.x, GREAT_GLOW.y, 200)) {
        const k = 0.85 + 0.15 * Math.sin(t * 0.8);
        glow(g, GREAT_GLOW.x, GREAT_GLOW.y, 140 * k, HW.amber, 0.03, 5);
        g.fillStyle(HW.amberHot, 0.5 + 0.2 * Math.sin(t * 2.1)); g.fillCircle(GREAT_GLOW.x - 6, GREAT_GLOW.y - 8, 5);
      }
      // House windows flicker as someone moves inside.
      HOUSES.forEach((h, i) => {
        const wx = h.x - h.side * 26 * h.s, wy = h.y - 64 * h.s;
        if (!inView(view, wx, wy, 60)) return;
        const k = 0.6 + 0.4 * Math.sin(t * (0.9 + (i % 3) * 0.4) + i * 2);
        g.fillStyle(HW.amberLit, 0.1 * k); g.fillCircle(wx, wy, 16 * h.s);
      });
      // Sun glinting along the Glasshouse panes, travelling slowly across the roof.
      if (inView(view, CX, 150, 400)) {
        const ph = (t * 0.07) % 1;
        const gx = GLASSHOUSE.x + ph * GLASSHOUSE.w;
        g.fillStyle(0xffffff, 0.22); g.fillEllipse(gx, 150 - Math.sin(ph * Math.PI) * 60, 40, 120);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(gx, 140 - Math.sin(ph * Math.PI) * 60, 3);
      }
      // The woodpeckers at the loft keep time: a peck every beat, the drums answering.
      if (inView(view, LOFT.x, LOFT.y - 120, 200)) {
        const beat = (t * 2.2) % 1;
        if (beat < 0.15) {
          g.fillStyle(HW.barkLit, 0.8);
          for (let i = 0; i < 3; i++) g.fillCircle(LOFT.x + 28 + i * 4, LOFT.y - 220 - i * 3, 1.5);
        }
        const drum = Math.floor(t * 2.2) % 4 === 3 ? 1 - beat : 0;
        if (drum > 0) {
          for (const side of [-1, 1]) { g.lineStyle(2, HW.barkLit, 0.5 * drum); g.strokeEllipse(LOFT.x + side * 72, LOFT.y - 46, 60 + (1 - drum) * 30, 70 + (1 - drum) * 30); }
        }
      }
      // The tree's eye over the Lantern Ledge opens a little, now and then, and gleams.
      if (inView(view, 960, 1190, 120)) {
        const open = Math.max(0, Math.sin(t * 0.21)) ** 6;
        if (open > 0.02) { g.fillStyle(HW.amber, 0.5 * open); g.fillCircle(960, 1190, 6 + open * 4); g.fillStyle(HW.amberHot, 0.7 * open); g.fillCircle(959, 1188, 2); }
      }
      // Leaves overhanging the bough edges, swaying over whoever walks beneath.
      for (const pts of [WEST_BOUGH, EAST_BOUGH]) {
        samplePolyline(pts, 120).forEach((p, i) => {
          const ex = p.x, ey = p.y + BOUGH_HALF + 6;
          if (!inView(view, ex, ey, 60)) return;
          for (let k = 0; k < 4; k++) {
            const sway = Math.sin(t * 1.4 + i + k) * 3;
            leaf(g, ex - 24 + k * 16 + sway, ey + (k % 2) * 6, Math.PI / 2 + Math.sin(t + k) * 0.3, 11, k % 2 ? HW.leafGold : HW.leafRust, 0.9);
          }
        });
      }
    },
  };
}
