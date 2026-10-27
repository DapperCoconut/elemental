import type { AreaDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, dim, glow, groundFill, lit, mixC, rock, shadow } from '../../../../art/IsleArt';
import { carve, inView } from '../../../water/isle/port/art';
import {
  BARK, BARK_DARK, BARK_LIT, BRASS, BRASS_DARK, EMBER, EMPRESS, EMPRESS_DARK, FOAM, GLOW, HEART, HEART_ALT, HEART_DARK,
  LICHEN, LITTER, LITTER_ALT, LOAM, MOSS, MOSS_DARK, MOSS_LIT, PEAT, PEAT_ALT, ROOT, ROOT_DARK, ROOT_LIT, SEA, SEA_DEEP,
  SEA_SHALLOW, acornWeight, bracket, burlHouse, coracle, eelTrap, fern, fireflyJar, groundRoot, hollowLog, jarLight,
  mossDrape, netHeap, poly, rootArch, sagLine, stake, toadstools, verdigraSeal,
} from './art';
import { MOSSGATE_CROWD, MOSSGATE_NPCS } from './people';

/**
 * Mossgate — the harbour town grown inside the Fallen Elder, and where every crossing to Thornwild
 * makes landfall.
 *
 * A hundred years ago, in the Empress's first storm, the Elder came down: crown to the north, roots
 * torn up out of the shore. Its trunk was already hollow, and the top of the hollow had rotted open,
 * so what lay on the ground was a great wooden gutter a thousand paces long — and Mossgate moved in.
 * The town's high street, the Pith, runs straight up the middle of the heartwood floor between the
 * two curving bark walls, under the last bands of bark that still span the top. Knot-holes rotted
 * through both walls are the lanes out: the Westknot to the Leaflitter quarter, where the fallen
 * boughs are hollowed into houses, and the Eastknot to Burrow Row. The north end runs on up the
 * trunk toward the Bloom Court.
 *
 * At the south the trunk is snapped off short, and its root plate stands up on end in the west of
 * the shore like a cliff of soil and stone. One root of it — the Great Root — runs the whole length
 * of the waterfront, humping up out of the mud in seven arches and diving back in: the root-arch
 * quays. Boats moor in the bays under the arches. Two roots run on out into the sea and are walked
 * on: the Taproot, where every crossing lands, and the bent one, the Crook, that the fishers use.
 *
 * You land at the end of the Taproot, walk up it under the tallest arch, and the first thing you see
 * on the quay is the Empress's scales, tipped toward her acorns.
 */

const W = 2600;
const H = 1500;
/** Where the sea begins along the south shore. */
const SEA_Y = 1290;
/** The trunk's snapped-off south end. */
const BUTT_Y = 1080;
/** Inner heartwood floor of the trunk. */
const FLOOR_X0 = 770;
const FLOOR_X1 = 1830;
/** The rot-holes through both walls (the Westknot and the Eastknot). */
const KNOT_Y0 = 690;
const KNOT_Y1 = 820;

/** Walkable root over the sea — shared by the painter and the solids. */
const TAPROOT: Rect = { x: 1250, y: 1280, w: 100, h: 200 };
const CROOK: Rect = { x: 2170, y: 1280, w: 60, h: 170 };
/** The root plate standing on end in the south-west. */
const PLATE: Rect = { x: 90, y: 1105, w: 430, h: 45 };

/** The Great Root's seven arches along the waterline: [x0, x1, height]. */
const ARCHES: [number, number, number][] = [
  [580, 840, 104], [880, 1150, 112], [1190, 1410, 150], [1460, 1760, 92], [1800, 2040, 108], [2080, 2320, 126], [2360, 2580, 100],
];
/** The two surviving bands of bark that still span the open top of the trunk. */
const RIBS = [430, 880];

// ── Ground ───────────────────────────────────────────────────────────

/** A wall of the trunk: outer bark slope, mossy rim, inner rotted slope — painted flat from above. */
function paintWall(g: G, side: 'w' | 'e', rng: () => number): void {
  // Distances measured outward from the floor edge.
  const edge = side === 'w' ? FLOOR_X0 : FLOOR_X1;
  const out = side === 'w' ? -1 : 1;
  const band = (d0: number, d1: number): [number, number] => {
    const a = edge + out * d0, b = edge + out * d1;
    return [Math.min(a, b), Math.abs(b - a)];
  };
  for (let y = 0; y < BUTT_Y; y += 4) {
    if (y > KNOT_Y0 && y < KNOT_Y1) continue;
    const wob = Math.sin(y / 60) * 3 + Math.sin(y / 17) * 1.5;
    // Inner slope: heartwood darkening and rotting as it rises to the rim.
    for (let k = 0; k < 8; k++) {
      const [x, w] = band(k * 10, k * 10 + 11);
      g.fillStyle(mixC(HEART_ALT, 0x3a2a1c, k / 8), 1); g.fillRect(x + out * wob * 0.3, y, w, 4);
    }
    // Rim: the broken lip of the bark, moss on top.
    const [rx, rw] = band(80, 112);
    g.fillStyle(BARK_DARK, 1); g.fillRect(rx + wob, y, rw, 4);
    g.fillStyle(MOSS_DARK, 1); g.fillRect(rx + wob + 3, y, rw - 6, 4);
    // Outer slope: furrowed bark falling away to the forest floor.
    const [ox, ow] = band(112, 172);
    g.fillStyle(BARK, 1); g.fillRect(ox + wob, y, ow, 4);
  }
  // Furrows down the outer bark and grain down the inner slope.
  for (let i = 0; i < 260; i++) {
    const y = rng() * BUTT_Y;
    if (y > KNOT_Y0 - 10 && y < KNOT_Y1 + 10) continue;
    const d = 116 + rng() * 52;
    const x = edge + out * d;
    g.lineStyle(1.5 + rng(), BARK_DARK, 0.7); g.lineBetween(x, y, x + (rng() - 0.5) * 3, y + 20 + rng() * 40);
    if (rng() < 0.25) { g.fillStyle(LICHEN, 0.4); g.fillEllipse(x, y, 8 + rng() * 10, 5); }
  }
  for (let i = 0; i < 160; i++) {
    const y = rng() * BUTT_Y;
    if (y > KNOT_Y0 - 10 && y < KNOT_Y1 + 10) continue;
    const x = edge + out * (6 + rng() * 66);
    g.lineStyle(1, HEART_DARK, 0.35); g.lineBetween(x, y, x, y + 30 + rng() * 60);
  }
  // Moss tufts along the rim and bracket fungus on the inner slope.
  for (let y = 8; y < BUTT_Y; y += 14) {
    if (y > KNOT_Y0 - 6 && y < KNOT_Y1 + 6) continue;
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_LIT, 0.9);
    g.fillEllipse(edge + out * (86 + rng() * 22), y, 10 + rng() * 10, 7 + rng() * 5);
  }
  for (let i = 0; i < 9; i++) {
    const y = 60 + rng() * (BUTT_Y - 120);
    if (y > KNOT_Y0 - 40 && y < KNOT_Y1 + 40) continue;
    bracket(g, edge + out * (40 + rng() * 26), y, 6 + rng() * 4, rng() < 0.5 ? 0xc8a070 : 0xd8c8a0);
  }
  // The knot-hole: rotted bark curling back from the gap, punky red rot exposed.
  for (const y of [KNOT_Y0, KNOT_Y1]) {
    const s = y === KNOT_Y0 ? -1 : 1;
    for (let d = 0; d < 172; d += 8) {
      const x = edge + out * d;
      const jag = 6 + Math.abs(Math.sin(d * 0.7)) * 12;
      g.fillStyle(d < 80 ? 0x7a4a2e : BARK_DARK, 1);
      g.fillTriangle(x - 5, y, x + 5, y, x, y + s * jag);
    }
    g.fillStyle(0x8a5236, 0.7); g.fillRect(Math.min(edge, edge + out * 172), y + (s < 0 ? -6 : 0), 172, 6);
  }
  // The splintered end at the butt.
  for (let d = 0; d < 172; d += 7) {
    const x = edge + out * d;
    const len = 10 + Math.abs(Math.sin(d * 0.37)) * 26 + rng() * 8;
    g.fillStyle(d < 80 ? HEART : BARK, 1);
    g.fillTriangle(x - 4, BUTT_Y - 2, x + 4, BUTT_Y - 2, x + (rng() - 0.5) * 4, BUTT_Y + len);
  }
}

function paintGround(g: G, rng: () => number): void {
  // The forest floor everywhere outside the trunk: leaf litter over black loam.
  groundFill(g, { x: 0, y: 0, w: W, h: SEA_Y }, LITTER, LITTER_ALT, 0x8a7a40, rng, 1.2);
  for (let i = 0; i < 1500; i++) {
    const x = rng() * W, y = rng() * SEA_Y;
    if (x > FLOOR_X0 - 172 && x < FLOOR_X1 + 172 && y < BUTT_Y) continue;
    const col = [0x8a6a2a, 0xa07a30, 0x6a5a28, 0x7a4a24, 0x5a6a2a][Math.floor(rng() * 5)];
    g.fillStyle(col, 0.55);
    g.fillEllipse(x, y, 4 + rng() * 4, 2 + rng() * 2);
  }
  for (let i = 0; i < 46; i++) blob(g, rng() * W, rng() * (SEA_Y - 200), 30 + rng() * 60, 14 + rng() * 26, MOSS_DARK, 0.35, rng);

  // The Empress's hedge along the north of both outer quarters: clipped dark yew, thorned.
  for (const [x0, x1] of [[0, 600], [2000, W]] as [number, number][]) {
    g.fillStyle(0x16261a, 1); g.fillRect(x0, 0, x1 - x0, 60);
    for (let x = x0; x < x1; x += 14) {
      g.fillStyle(rng() < 0.5 ? 0x1e3a22 : 0x24442a, 1); g.fillEllipse(x + 7, 56 + rng() * 6, 22, 16);
      if (rng() < 0.5) { g.fillStyle(0xc8c0a0, 0.6); g.fillTriangle(x + 4, 64, x + 8, 64, x + 6, 70); }
    }
    g.lineStyle(2, EMPRESS, 0.3); g.lineBetween(x0, 40, x1, 40);
  }

  // Lanes in the outer quarters: beaten earth from the knot-holes to the edge roads.
  const lane = (pts: { x: number; y: number }[], w: number): void => {
    g.lineStyle(w + 10, LOAM, 0.6); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
    g.lineStyle(w, 0x5a4a30, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
    for (const p of pts) { g.fillStyle(0x5a4a30, 1); g.fillCircle(p.x, p.y, w / 2); }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 12);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        g.fillStyle(rng() < 0.5 ? 0x6a5a3a : 0x4a3a24, 0.6);
        g.fillEllipse(a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.7, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.7, 5, 3);
      }
    }
  };
  lane([{ x: 0, y: 750 }, { x: 300, y: 756 }, { x: 600, y: 752 }, { x: FLOOR_X0, y: 755 }], 70);
  lane([{ x: FLOOR_X1, y: 755 }, { x: 2000, y: 752 }, { x: 2300, y: 756 }, { x: W, y: 750 }], 70);
  lane([{ x: 300, y: 756 }, { x: 260, y: 620 }, { x: 240, y: 330 }], 34);
  lane([{ x: 300, y: 756 }, { x: 260, y: 930 }, { x: 420, y: 1120 }, { x: 560, y: 1200 }], 34);
  lane([{ x: 2300, y: 756 }, { x: 2200, y: 610 }, { x: 2130, y: 350 }], 34);
  lane([{ x: 2300, y: 756 }, { x: 2360, y: 900 }, { x: 2300, y: 1050 }, { x: 2140, y: 1150 }], 34);

  // ── The trunk. Heartwood floor first: pale, polished, the long grain running north–south.
  g.fillStyle(HEART, 1); g.fillRect(FLOOR_X0, 0, FLOOR_X1 - FLOOR_X0, BUTT_Y);
  for (let i = 0; i < 420; i++) {
    const x = FLOOR_X0 + rng() * (FLOOR_X1 - FLOOR_X0), y = rng() * BUTT_Y;
    g.lineStyle(1 + rng() * 1.5, rng() < 0.6 ? HEART_ALT : lit(HEART, 0.1), 0.5);
    g.lineBetween(x, y, x + (rng() - 0.5) * 4, y + 40 + rng() * 120);
  }
  // Knots in the floor, like dark eyes.
  for (let i = 0; i < 14; i++) {
    const x = FLOOR_X0 + 40 + rng() * (FLOOR_X1 - FLOOR_X0 - 80), y = 40 + rng() * (BUTT_Y - 80);
    if (Math.abs(x - 1300) < 70) continue;
    for (let k = 3; k >= 1; k--) { g.lineStyle(1, HEART_DARK, 0.3); g.strokeEllipse(x, y, 10 + k * 7, 22 + k * 12); }
    g.fillStyle(HEART_DARK, 0.7); g.fillEllipse(x, y, 7, 14);
  }
  // The Pith: the worn path straight up the middle, and the cross-lane between the knot-holes.
  g.fillStyle(lit(HEART, 0.12), 0.65); g.fillRect(1240, 0, 120, BUTT_Y);
  g.fillStyle(lit(HEART, 0.18), 0.45); g.fillRect(1268, 0, 64, BUTT_Y);
  g.fillStyle(lit(HEART, 0.12), 0.6); g.fillRect(FLOOR_X0, 712, FLOOR_X1 - FLOOR_X0, 86);
  for (let i = 0; i < 160; i++) {
    g.fillStyle(0x5a4028, 0.25); g.fillEllipse(1250 + rng() * 100, rng() * BUTT_Y, 5, 3);
  }
  // Moss creeping in from the walls and puddling where the bark ribs drip.
  for (let i = 0; i < 30; i++) {
    const side = rng() < 0.5;
    blob(g, side ? FLOOR_X0 + rng() * 60 : FLOOR_X1 - rng() * 60, rng() * BUTT_Y, 20 + rng() * 34, 30 + rng() * 60, MOSS, 0.5, rng);
  }
  for (const ry of RIBS) {
    // The shadow each rib throws across the floor at noon.
    g.fillStyle(0x2a1a0e, 0.22); g.fillRect(FLOOR_X0, ry - 18, FLOOR_X1 - FLOOR_X0, 34);
    for (let k = 0; k < 14; k++) blob(g, FLOOR_X0 + 40 + rng() * (FLOOR_X1 - FLOOR_X0 - 80), ry + (rng() - 0.5) * 18, 14 + rng() * 18, 5 + rng() * 4, MOSS_DARK, 0.55, rng);
  }
  paintWall(g, 'w', rng);
  paintWall(g, 'e', rng);
  // The lanes through the knot-holes, bark crumbs on the floor of each.
  for (const [x0, x1] of [[FLOOR_X0 - 172, FLOOR_X0], [FLOOR_X1, FLOOR_X1 + 172]] as [number, number][]) {
    g.fillStyle(0x6a4a30, 1); g.fillRect(x0, KNOT_Y0 + 4, x1 - x0, KNOT_Y1 - KNOT_Y0 - 8);
    for (let i = 0; i < 60; i++) {
      g.fillStyle(rng() < 0.5 ? BARK : 0x8a5a3a, 0.8);
      g.fillRect(x0 + rng() * (x1 - x0), KNOT_Y0 + 10 + rng() * (KNOT_Y1 - KNOT_Y0 - 20), 3 + rng() * 6, 2 + rng() * 3);
    }
  }

  // The Green Shoot's patch: the only living wood in the trunk, a ring of soft green round it.
  blob(g, 1050, 236, 60, 26, MOSS, 0.7, rng);
  blob(g, 1050, 236, 34, 14, MOSS_LIT, 0.6, rng);

  // ── The waterfront: peat, worn smooth, paved with the flat tops of surface roots.
  g.fillStyle(PEAT, 1); g.fillRect(0, BUTT_Y, W, SEA_Y - BUTT_Y);
  for (let x = 0; x < W; x += 30) blob(g, x + 15, BUTT_Y + 6, 34, 14, PEAT, 1, rng);
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.5 ? PEAT_ALT : 0x2a2218, 0.6);
    g.fillEllipse(rng() * W, BUTT_Y + 20 + rng() * (SEA_Y - BUTT_Y - 30), 4 + rng() * 6, 2 + rng() * 2);
  }
  // Surface roots fanning out of the root plate across the shore.
  for (let k = 0; k < 7; k++) {
    const sx = 300 + k * 30, sy = 1150;
    const pts = [{ x: sx, y: sy }];
    let x = sx, y = sy;
    for (let s = 0; s < 6; s++) {
      x += 120 + rng() * 140; y += (rng() - 0.45) * 30;
      y = Math.max(BUTT_Y + 30, Math.min(SEA_Y - 30, y));
      pts.push({ x, y });
    }
    groundRoot(g, pts, 7 - k * 0.5, rng);
  }
  // The Great Root's run between its arches: a low hump in the mud along the waterline.
  for (let i = 0; i < ARCHES.length - 1; i++) {
    const a = ARCHES[i][1], b = ARCHES[i + 1][0];
    groundRoot(g, [{ x: a, y: SEA_Y - 2 }, { x: (a + b) / 2, y: SEA_Y - 6 }, { x: b, y: SEA_Y - 2 }], 16, rng);
  }
  groundRoot(g, [{ x: 520, y: 1160 }, { x: 560, y: 1240 }, { x: ARCHES[0][0], y: SEA_Y - 2 }], 18, rng);

  // The wrack line: weed and bark-crumbs where the tide leaves them.
  g.lineStyle(3, 0x2a3a1e, 0.75);
  g.beginPath();
  for (let x = 0; x <= W; x += 14) {
    const y = SEA_Y - 14 + Math.sin(x / 50) * 3 + (rng() - 0.5) * 3;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();

  // The sea: shallow over the drowned roots, then deep green.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 50, W, H - SEA_Y - 50);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 150, W, H - SEA_Y - 150);
  // Drowned roots showing dark under the shallows — the root-reef the snapper live in.
  for (let k = 0; k < 9; k++) {
    let x = 100 + k * 290, y = SEA_Y + 20;
    g.lineStyle(10 - k % 3 * 2, 0x163a32, 0.55);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 5; s++) { x += (rng() - 0.5) * 90; y += 30 + rng() * 20; g.lineTo(x, y); }
    g.strokePath();
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle(lit(SEA, 0.12), 0.2);
    g.fillEllipse(rng() * W, SEA_Y + 24 + rng() * (H - SEA_Y - 24), 30 + rng() * 80, 3 + rng() * 3);
  }

  // The two walked roots: flat-topped, worn shiny down the middle, moss on the shoulders.
  for (const r of [TAPROOT, CROOK]) {
    g.fillStyle(0x0a1a18, 0.4); g.fillRoundedRect(r.x + 8, r.y + 12, r.w, r.h, r.w / 2);
    g.fillStyle(ROOT_DARK, 1); g.fillRoundedRect(r.x - 4, r.y, r.w + 8, r.h + 6, r.w / 2);
    g.fillStyle(ROOT, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, r.w / 2.2);
    g.fillStyle(ROOT_LIT, 0.55); g.fillRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h - r.w * 0.3);
    for (let y = r.y + 10; y < r.y + r.h - 10; y += 16) {
      g.lineStyle(1.5, ROOT_DARK, 0.6); g.lineBetween(r.x + 6, y + (rng() - 0.5) * 4, r.x + r.w - 6, y + (rng() - 0.5) * 4);
      g.fillStyle(MOSS, 0.85); g.fillEllipse(r.x + 4, y, 10, 8); g.fillEllipse(r.x + r.w - 4, y + 6, 10, 8);
    }
    for (let k = 0; k < 18; k++) { g.fillStyle(0xd8d4c0, 0.8); g.fillCircle(r.x + rng() * r.w, r.y + r.h - 4 - rng() * 30, 1.3); }
  }
  // The Crook's bend: a knuckle where it turned.
  g.fillStyle(ROOT, 1); g.fillCircle(CROOK.x + CROOK.w / 2 + 20, CROOK.y + CROOK.h - 10, 30);
  g.fillStyle(ROOT_LIT, 0.4); g.fillCircle(CROOK.x + CROOK.w / 2 + 14, CROOK.y + CROOK.h - 18, 12);

  // The weighing floor in front of the scales: flagstones of cut root-slab, the Empress's seal inlaid.
  g.fillStyle(ROOT_DARK, 1); g.fillEllipse(1640, 1206, 280, 84);
  g.fillStyle(0x6a503a, 1); g.fillEllipse(1640, 1204, 264, 74);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, ROOT_DARK, 0.6); g.strokeEllipse(1640, 1204, 60 + k * 60, 16 + k * 16); }
  verdigraSeal(g, 1640, 1228, 12, EMPRESS_DARK, 0.6);
  // Worn queue-path in the peat, from the trunk to the pan.
  g.fillStyle(0x2a2218, 0.5); g.fillEllipse(1540, 1130, 140, 34);
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A hollow-log house: piece + base footprint solid. */
function logHouse(x: number, y: number, len: number, r: number, face: 'w' | 'e', bark: number, opts: { flue?: boolean; fungus?: boolean } = {}): void {
  pieces.push({ x, y, w: len + 60, h: r * 2 + 70, draw: (g, rng) => { hollowLog(g, x, y, len, r, { bark, face, glow: EMBER, flue: opts.flue, fungus: opts.fungus }, rng); } });
  solids.push({ kind: 'rect', x: x - len / 2, y: y - 30, w: len, h: 30 });
}

// The Leaflitter: the west quarter, fallen boughs hollowed into homes.
logHouse(180, 300, 200, 32, 'e', 0x5a4434, { flue: true });
logHouse(470, 380, 180, 30, 'w', 0x4e3e30, { fungus: true });
logHouse(230, 860, 220, 34, 'e', 0x564232, { flue: true, fungus: true });
// The Hollin log — honey and turnips, a pound and a quarter short. Skeps and a turnip clamp at the door.
pieces.push({
  x: 330, y: 560, w: 300, h: 140, draw: (g, rng) => {
    hollowLog(g, 330, 560, 230, 34, { bark: 0x5e4836, face: 'w', glow: EMBER, flue: true }, rng);
    // Two straw skeps on a plank by the door, one empty.
    for (const [sx, empty] of [[400, false], [430, true]] as [number, boolean][]) {
      shadow(g, sx, 586, 26, 8);
      g.fillStyle(0x5a4028, 1); g.fillRect(sx - 14, 578, 28, 6);
      g.fillStyle(0x9a7a3a, 1); g.fillEllipse(sx, 568, 22, 24);
      g.lineStyle(1, 0x6a4a1e, 0.9); for (let k = 0; k < 4; k++) g.strokeEllipse(sx, 568 + k * 2, 22 - k * 3, 6);
      g.fillStyle(0x1a120a, 1); g.fillEllipse(sx, 576, 6, 3);
      if (empty) { g.lineStyle(1, 0x2a1a0a, 0.8); g.lineBetween(sx - 8, 562, sx + 6, 572); }
    }
    // The turnip clamp: a mound of earth with straw poking out. Fennel is in it.
    shadow(g, 470, 592, 60, 14);
    g.fillStyle(0x4a3a24, 1); g.fillEllipse(470, 584, 56, 24);
    for (let k = 0; k < 8; k++) { g.lineStyle(1.5, 0xc8a850, 1); g.lineBetween(450 + k * 5, 574, 448 + k * 6, 566 - rng() * 6); }
    g.fillStyle(0xe8e0e8, 1); g.fillCircle(458, 590, 4); g.fillStyle(0x9a4a8a, 1); g.fillCircle(458, 588, 3);
  },
});
solids.push({ kind: 'rect', x: 215, y: 530, w: 230, h: 30 }, { kind: 'circle', x: 470, y: 584, r: 22 });

// Burrow Row: the east quarter.
logHouse(2150, 320, 200, 32, 'e', 0x544030, { flue: true });
logHouse(2300, 560, 220, 34, 'w', 0x5a4434, { fungus: true });
pieces.push({ x: 2460, y: 860, w: 160, h: 140, draw: (g, rng) => burlHouse(g, 2460, 860, 120, 96, 0x6a4a34, rng) });
solids.push({ kind: 'rect', x: 2410, y: 830, w: 100, h: 30 });
// Linnet's notch on her own doorpost: two children measured, both lines at the same height.
pieces.push({
  x: 2170, y: 566, w: 30, h: 80, draw: (g) => {
    g.fillStyle(ROOT_DARK, 1); g.fillRect(2166, 500, 8, 66);
    g.lineStyle(1.5, 0xe8e0c8, 0.9);
    for (let k = 0; k < 4; k++) g.lineBetween(2162, 556 - k * 9, 2178, 556 - k * 9);
    g.lineStyle(2, 0xe8e0c8, 1); g.lineBetween(2160, 524, 2180, 524);
  },
});
// Seed-drying racks: hurdles of woven hazel with seed-heads hung upside down.
for (const [x, y] of [[2120, 960], [2240, 990]] as [number, number][]) {
  pieces.push({
    x, y, w: 110, h: 90, draw: (g, rng) => {
      shadow(g, x, y + 2, 100, 14);
      g.fillStyle(ROOT_DARK, 1); g.fillRect(x - 46, y - 64, 5, 64); g.fillRect(x + 41, y - 64, 5, 64);
      g.fillRect(x - 48, y - 66, 96, 4);
      for (let k = 0; k < 9; k++) {
        const hx = x - 40 + k * 10;
        g.lineStyle(1, 0x8a7a50, 1); g.lineBetween(hx, y - 62, hx, y - 48);
        g.fillStyle([0xc8a040, 0x8a6a2a, 0xa8b060][k % 3], 1); g.fillEllipse(hx, y - 42 + rng() * 3, 7, 13);
      }
    },
  });
  solids.push({ kind: 'circle', x: x - 44, y: y - 2, r: 5 }, { kind: 'circle', x: x + 44, y: y - 2, r: 5 });
}

// ── Inside the trunk.

// The Crumb & Thistle — an oven in a burl, a thistle crust on the sign, loaves in the round window.
pieces.push({
  x: 940, y: 990, w: 280, h: 230, draw: (g, rng) => {
    burlHouse(g, 940, 990, 200, 130, 0x7a5236, rng, EMBER);
    // The oven mouth in the burl's side, red-lit.
    g.fillStyle(0x1a0e08, 1); g.fillEllipse(1010, 962, 40, 28);
    g.fillStyle(0xff8a3a, 0.9); g.fillEllipse(1010, 964, 32, 20);
    g.fillStyle(0xffd88a, 0.9); g.fillEllipse(1010, 968, 18, 8);
    // A stone flue rising out of the moss.
    g.fillStyle(0x4a4438, 1); g.fillRect(900, 832, 22, 50);
    g.fillStyle(0x5a5446, 1); for (let k = 0; k < 4; k++) g.fillRect(900, 834 + k * 12, 22, 5);
    g.fillStyle(0x2a2620, 1); g.fillEllipse(911, 832, 24, 7);
    // The sign: a loaf with a thistle stuck in it, on a crook of root.
    g.lineStyle(3, ROOT_DARK, 1); g.lineBetween(830, 990, 830, 900); g.lineBetween(830, 900, 860, 900);
    g.fillStyle(0x3a2a1a, 1); g.fillRoundedRect(838, 904, 52, 32, 6);
    g.fillStyle(0x8a5a2a, 1); g.fillEllipse(864, 924, 36, 16);
    g.fillStyle(0xd8a060, 1); g.fillEllipse(864, 922, 30, 10);
    g.lineStyle(1.5, 0x4a7a3a, 1); g.lineBetween(864, 918, 866, 906);
    g.fillStyle(0xa86ac8, 1); g.fillCircle(866, 905, 4);
    g.fillStyle(0x4a7a3a, 1); g.fillTriangle(861, 909, 871, 909, 866, 914);
    // Loaves cooling on a plank by the door, each with a prickle of thistle.
    g.fillStyle(0x5a3a22, 1); g.fillRect(960, 984, 60, 5);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x8a5a2a, 1); g.fillEllipse(968 + i * 15, 980, 13, 7);
      g.fillStyle(0xd8a060, 1); g.fillEllipse(968 + i * 15, 978, 9, 4);
      g.fillStyle(0xa86ac8, 1); g.fillCircle(968 + i * 15, 975, 1.5);
    }
  },
});
solids.push({ kind: 'rect', x: 850, y: 958, w: 180, h: 32 });

// The Knothole Emporium — a great knot in the floor that grew up into a dome, its eye the door.
pieces.push({
  x: 1660, y: 600, w: 260, h: 200, draw: (g, rng) => {
    shadow(g, 1660, 604, 240, 30, 0.38);
    // The whorl: rings of grain swirled round the knot.
    for (let k = 6; k >= 0; k--) {
      g.fillStyle(k % 2 ? 0x7a5634 : 0x8a6440, 1);
      g.fillEllipse(1660, 600 - 60 - k * 2, 200 - k * 18, 130 - k * 12);
    }
    g.fillStyle(lit(0x8a6440, 0.18), 0.6); g.fillEllipse(1630, 500, 80, 18);
    // The eye of the knot: a great dark oval door, polished round its rim.
    g.fillStyle(0x2a1a0e, 1); g.fillEllipse(1660, 566, 58, 70);
    g.fillStyle(0x5a3a5a, 1); g.fillEllipse(1660, 570, 46, 60);
    g.lineStyle(2, 0xa88a5a, 1); g.strokeEllipse(1660, 566, 58, 70);
    g.fillStyle(BRASS, 1); g.fillCircle(1676, 576, 2.4);
    // A bay of wares on a shelf of bracket fungus beside it.
    bracket(g, 1584, 560, 10, 0xd8c8a0);
    g.fillStyle(0x7aa848, 1); g.fillCircle(1578, 552, 4);
    g.fillStyle(0xe8a020, 1); g.fillCircle(1590, 550, 3.5);
    g.fillStyle(0x8a6a3a, 1); g.fillEllipse(1600, 553, 8, 6);
    // Sign: a knot-hole with a coin in it.
    g.fillStyle(0x3a2a1a, 1); g.fillRoundedRect(1714, 520, 46, 30, 6);
    g.lineStyle(2, 0xa88a5a, 1); g.strokeEllipse(1737, 535, 22, 16);
    g.fillStyle(BRASS, 1); g.fillCircle(1737, 535, 5);
    mossDrape(g, 1580, 1740, 470, rng, 14);
  },
});
solids.push({ kind: 'rect', x: 1570, y: 570, w: 180, h: 30 });

// More homes along the inner walls.
logHouse(930, 520, 200, 30, 'e', 0x6a503a, { fungus: true });
logHouse(1640, 300, 200, 32, 'w', 0x5e4836, { flue: true });
logHouse(1650, 900, 200, 30, 'w', 0x624a36, { fungus: true });

// The Last Green Shoot: a single living sapling out of the heartwood floor, staked and bound.
pieces.push({
  x: 1050, y: 236, w: 70, h: 110, draw: (g) => {
    shadow(g, 1050, 238, 40, 10, 0.3);
    // A little fence of twigs round it, and Sorrel's stool.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      g.lineStyle(2, ROOT_DARK, 1); g.lineBetween(1050 + Math.cos(a) * 22, 236 + Math.sin(a) * 9, 1050 + Math.cos(a) * 22, 226 + Math.sin(a) * 9);
    }
    g.lineStyle(1, 0xb8a070, 0.9); g.strokeEllipse(1050, 230, 44, 18);
    // The shoot: a thin grey-green stem, a bud, and a single leaf.
    g.lineStyle(3, 0x6a7a4a, 1); g.lineBetween(1050, 236, 1052, 170);
    g.lineStyle(1, 0xb8a070, 1); g.lineBetween(1046, 236, 1046, 192); g.lineBetween(1046, 200, 1052, 198);
    g.fillStyle(0x4a6a2a, 1); g.fillEllipse(1052, 168, 6, 9);
  },
});
solids.push({ kind: 'circle', x: 1050, y: 232, r: 20 });

// The Knot Well: a knot that rotted through to the ground and filled with rain. The notch-post beside.
pieces.push({
  x: 1150, y: 650, w: 100, h: 60, draw: (g) => {
    shadow(g, 1150, 652, 90, 22, 0.3);
    g.fillStyle(HEART_DARK, 1); g.fillEllipse(1150, 640, 84, 34);
    g.fillStyle(0x3a2616, 1); g.fillEllipse(1150, 640, 72, 26);
    g.fillStyle(0x1e3a34, 1); g.fillEllipse(1150, 642, 60, 20);
    g.lineStyle(1, HEART_DARK, 0.6); g.strokeEllipse(1150, 640, 100, 44);
    // A bucket on a root-crook.
    g.lineStyle(3, ROOT_DARK, 1); g.lineBetween(1194, 646, 1194, 600); g.lineBetween(1194, 600, 1160, 604);
    g.lineStyle(1, 0xb8a070, 1); g.lineBetween(1160, 604, 1160, 622);
    g.fillStyle(0x5a4028, 1); g.fillRect(1154, 622, 12, 10);
  },
});
solids.push({ kind: 'circle', x: 1150, y: 640, r: 34 });
pieces.push({
  x: 1212, y: 604, w: 30, h: 110, draw: (g) => {
    shadow(g, 1212, 605, 16, 5);
    g.fillStyle(0x6a503a, 1); g.fillRect(1208, 510, 9, 95);
    g.fillStyle(lit(0x6a503a, 0.25), 1); g.fillRect(1208, 510, 2, 95);
    // Every child's notch, season on season, cut into the post — and the Empress's mark: a finger's width.
    for (let k = 0; k < 18; k++) {
      g.lineStyle(1, 0xe8dcc0, 0.8);
      const y = 598 - k * 4.6 - (k % 3);
      g.lineBetween(1206, y, 1212 + (k % 2) * 4, y);
    }
    g.fillStyle(EMPRESS, 0.9); g.fillRect(1206, 540, 13, 2);
    verdigraSeal(g, 1212, 520, 4, EMPRESS_DARK, 0.9);
  },
});
solids.push({ kind: 'circle', x: 1212, y: 602, r: 6 });

// Ferns and toadstools in the corners of everything.
for (const [x, y, s] of [
  [60, 160, 22], [380, 200, 18], [90, 640, 20], [520, 820, 18], [120, 1040, 22], [560, 1000, 16],
  [2060, 200, 20], [2500, 280, 22], [2080, 700, 16], [2540, 640, 20], [2560, 1020, 18], [2040, 880, 16],
  [800, 140, 14], [1800, 160, 14], [800, 1040, 14], [1800, 760, 12],
] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g, rng) => fern(g, x, y, s, rng() < 0.5 ? 0x4a8a3a : 0x5a9a44, rng) });
}
for (const [x, y] of [[140, 470], [520, 650], [2100, 470], [2520, 380], [880, 760], [1760, 1000], [440, 1060], [2400, 700]] as [number, number][]) {
  pieces.push({ x, y, w: 50, h: 30, draw: (g, rng) => toadstools(g, x, y, 7, rng) });
}

// ── The waterfront.

// The root plate: the Elder's torn-up roots standing on end — a cliff of soil, stone and root.
pieces.push({
  x: 305, y: 1150, w: 480, h: 300, draw: (g, rng) => {
    shadow(g, 305, 1154, 470, 40, 0.45);
    // The plate itself: a lumpy wall of black soil.
    const top = 1150 - 230;
    poly(g, [[90, 1150], [520, 1150], [530, 1060], [490, 980], [420, 930], [305, top], [200, 936], [120, 990], [80, 1070]], LOAM);
    poly(g, [[100, 1146], [510, 1146], [518, 1064], [482, 988], [416, 942], [305, top + 12], [204, 948], [128, 996], [92, 1072]], 0x3a2e1e);
    // Stones caught in the roots.
    for (let i = 0; i < 26; i++) rock(g, 120 + rng() * 380, 970 + rng() * 170, 5 + rng() * 9, 0x6a6a5e, rng);
    // Roots radiating from the old trunk's stump, torn and dangling.
    for (let k = 0; k < 16; k++) {
      const a = Math.PI + (k / 15) * Math.PI;
      const len = 120 + rng() * 90;
      const cx = 305, cy = 1080;
      g.lineStyle(10 - (k % 4) * 2, ROOT_DARK, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * len * 1.05, cy + Math.sin(a) * len * 0.8);
      g.lineStyle(6 - (k % 4), ROOT, 1);
      g.lineBetween(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.78);
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.78;
      g.lineStyle(1.5, ROOT_DARK, 0.9); g.lineBetween(ex, ey, ex + (rng() - 0.5) * 8, ey + 18 + rng() * 20);
    }
    // The stump end of the trunk, sawn-looking where it tore, rings showing.
    g.fillStyle(BARK_DARK, 1); g.fillEllipse(305, 1080, 108, 80);
    g.fillStyle(HEART_DARK, 1); g.fillEllipse(305, 1080, 92, 68);
    for (let k = 1; k < 7; k++) { g.lineStyle(1, 0x3a2616, 0.6); g.strokeEllipse(305, 1080, 92 * k / 7, 68 * k / 7); }
    // Ferns and moss rooting on the plate's face.
    mossDrape(g, 210, 400, top + 30, rng, 16);
    for (let i = 0; i < 6; i++) fern(g, 130 + rng() * 350, 990 + rng() * 120, 12 + rng() * 6, 0x4a8a3a, rng);
  },
});
solids.push({ kind: 'rect', ...PLATE });

// The Great Root's arches along the waterline.
ARCHES.forEach(([x0, x1, h], i) => {
  pieces.push({ x: (x0 + x1) / 2, y: SEA_Y, w: x1 - x0 + 80, h: h + 60, draw: (g, rng) => rootArch(g, x0, x1, SEA_Y, h, i === 2 ? 22 : 17, rng) });
  solids.push({ kind: 'circle', x: x0, y: SEA_Y - 6, r: 22 }, { kind: 'circle', x: x1, y: SEA_Y - 6, r: 22 });
});

// The tithe-scales: the post, plinth and the stacked brass acorns. Beam and pans are animated.
const SCALE_X = 1640, SCALE_Y = 1180, BEAM_Y = SCALE_Y - 178;
pieces.push({
  x: SCALE_X, y: SCALE_Y, w: 320, h: 240, draw: (g, rng) => {
    shadow(g, SCALE_X, SCALE_Y + 4, 170, 30, 0.4);
    // Plinth of cut root-slab, three steps.
    for (let s = 0; s < 3; s++) {
      const w = 130 - s * 26;
      g.fillStyle(ROOT_DARK, 1); g.fillRect(SCALE_X - w / 2, SCALE_Y - 10 - s * 9, w, 11);
      g.fillStyle(s % 2 ? 0x6a503a : 0x7a5e44, 1); g.fillRect(SCALE_X - w / 2 + 2, SCALE_Y - 9 - s * 9, w - 4, 7);
    }
    // The post: green-painted iron, wound with a trained climbing rose.
    g.fillStyle(0x1a2a1a, 1); g.fillRect(SCALE_X - 8, BEAM_Y, 16, SCALE_Y - 36 - BEAM_Y);
    g.fillStyle(EMPRESS_DARK, 1); g.fillRect(SCALE_X - 6, BEAM_Y, 12, SCALE_Y - 36 - BEAM_Y);
    g.fillStyle(lit(EMPRESS_DARK, 0.25), 1); g.fillRect(SCALE_X - 6, BEAM_Y, 3, SCALE_Y - 36 - BEAM_Y);
    for (let y = BEAM_Y + 10; y < SCALE_Y - 40; y += 12) {
      g.lineStyle(2, 0x2e5a22, 1); g.lineBetween(SCALE_X - 8, y, SCALE_X + 8, y + 8);
      if (rng() < 0.45) { g.fillStyle(0xc83a5a, 1); g.fillCircle(SCALE_X + (rng() < 0.5 ? -9 : 9), y + 4, 3); }
      if (rng() < 0.5) { g.fillStyle(0x4a8a3a, 1); g.fillEllipse(SCALE_X + 10, y, 6, 3); }
    }
    // Finial: the seal in brass.
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(SCALE_X, BEAM_Y - 8, 14);
    verdigraSeal(g, SCALE_X, BEAM_Y - 8, 11, BRASS, 1);
    // The acorns, stacked in a pyramid beside the plinth.
    const pile: [number, number][] = [[SCALE_X + 90, SCALE_Y - 2], [SCALE_X + 108, SCALE_Y - 2], [SCALE_X + 126, SCALE_Y - 2], [SCALE_X + 99, SCALE_Y - 16], [SCALE_X + 117, SCALE_Y - 16], [SCALE_X + 108, SCALE_Y - 30]];
    for (const [ax, ay] of pile) acornWeight(g, ax, ay, 7);
    // The tithe on the other side: baskets waiting their turn.
    for (let k = 0; k < 3; k++) {
      const bx = SCALE_X - 100 - k * 22, by = SCALE_Y - 2;
      shadow(g, bx, by + 2, 22, 6);
      g.fillStyle(0x8a6a3a, 1); g.fillRoundedRect(bx - 10, by - 14, 20, 14, 3);
      g.lineStyle(1, 0x5a4220, 1); for (let r = 0; r < 3; r++) g.lineBetween(bx - 10, by - 11 + r * 4, bx + 10, by - 11 + r * 4);
      g.fillStyle([0xe8a020, 0xe8e0e8, 0x8a5a2a][k], 1); g.fillCircle(bx - 3, by - 16, 4); g.fillCircle(bx + 4, by - 15, 3.5);
    }
  },
});
solids.push({ kind: 'rect', x: SCALE_X - 66, y: SCALE_Y - 30, w: 132, h: 30 }, { kind: 'rect', x: SCALE_X + 80, y: SCALE_Y - 16, w: 56, h: 16 });

// Bram's slip: a hull on a cradle of bent root, moss being packed into the seams.
pieces.push({
  x: 1000, y: 1200, w: 240, h: 130, draw: (g, rng) => {
    shadow(g, 1000, 1204, 200, 24, 0.36);
    for (const cx of [944, 1056]) { g.fillStyle(ROOT_DARK, 1); g.fillRect(cx - 4, 1176, 8, 26); }
    g.lineStyle(5, ROOT, 1); g.beginPath(); g.arc(1000, 1210, 66, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
    g.fillStyle(0x3a2a1c, 1); g.fillEllipse(1000, 1166, 170, 38);
    g.fillStyle(0x6a4a30, 1); g.fillEllipse(1000, 1160, 160, 26);
    g.fillStyle(lit(0x6a4a30, 0.2), 1); g.fillEllipse(990, 1154, 110, 6);
    // Seams with moss caulking stuffed in, half done.
    for (let k = 0; k < 9; k++) {
      const sx = 930 + k * 17;
      g.lineStyle(1.5, k < 5 ? MOSS : 0x2a1a0e, 1); g.lineBetween(sx, 1150, sx + 4, 1172);
    }
    // A heap of moss and a bucket of pitch.
    blob(g, 1080, 1196, 18, 8, MOSS, 1, rng);
    g.fillStyle(0x1a1410, 1); g.fillRect(912, 1186, 14, 12); g.fillStyle(0x0a0806, 1); g.fillEllipse(919, 1186, 14, 4);
    // Ribs of a new hull drying on a rack behind.
    for (let k = 0; k < 5; k++) { g.lineStyle(3, 0x8a6a4a, 1); g.beginPath(); g.arc(1040 + k * 12, 1120, 16, Math.PI, Math.PI * 1.9, false); g.strokePath(); }
  },
});
solids.push({ kind: 'rect', x: 920, y: 1172, w: 160, h: 28 });

// The Hook & Bramble — a shed built into a broken stump, briarwood rods bending on frames outside.
pieces.push({
  x: 2440, y: 1110, w: 260, h: 220, draw: (g, rng) => {
    shadow(g, 2440, 1114, 200, 26, 0.38);
    // The stump: a ragged ring of bark, a roof of moss over it.
    g.fillStyle(BARK_DARK, 1); g.fillRect(2362, 1010, 156, 100);
    g.fillStyle(BARK, 1); g.fillRect(2366, 1012, 148, 96);
    for (let k = 0; k < 14; k++) { g.lineStyle(1.5, BARK_DARK, 0.7); const fx = 2370 + k * 10.5; g.lineBetween(fx, 1014, fx + (rng() - 0.5) * 3, 1106); }
    poly(g, [[2356, 1014], [2524, 1014], [2510, 990], [2480, 1000], [2460, 976], [2430, 996], [2400, 980], [2380, 1000]], BARK_DARK);
    g.fillStyle(MOSS_DARK, 1); g.fillEllipse(2440, 1000, 190, 40);
    g.fillStyle(MOSS, 1); g.fillEllipse(2440, 994, 176, 30);
    mossDrape(g, 2360, 2520, 1010, rng, 12);
    // Door and a window full of hooks.
    g.fillStyle(0x1a120a, 1); g.fillRoundedRect(2422, 1068, 30, 42, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(0x3a5a3a, 1); g.fillRoundedRect(2425, 1071, 24, 39, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(EMBER, 0.85); g.fillCircle(2392, 1050, 12);
    g.lineStyle(1, 0x2a2a20, 1); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(2386 + k * 4, 1052, 2, 0, Math.PI, false); g.strokePath(); }
    // Briarwood canes on their bending frames: thorned, curved, nine years at it.
    for (let k = 0; k < 3; k++) {
      const fx = 2486 + k * 14;
      g.lineStyle(2, ROOT_DARK, 1); g.lineBetween(fx, 1108, fx, 1050);
      g.lineStyle(2.5, 0x6a3a2a, 1); g.beginPath(); g.arc(fx - 30, 1108, 34 + k * 4, -Math.PI * 0.5, 0, false); g.strokePath();
      for (let t = 0; t < 6; t++) {
        const a = -Math.PI * 0.5 + t * 0.26;
        const tx = fx - 30 + Math.cos(a) * (34 + k * 4), ty = 1108 + Math.sin(a) * (34 + k * 4);
        g.fillStyle(0xb8a070, 1); g.fillTriangle(tx - 1.5, ty, tx + 1.5, ty, tx + 2, ty - 4);
      }
    }
    // Sign: a ray with a hooked bramble.
    g.fillStyle(0x3a2a1a, 1); g.fillRoundedRect(2366, 960, 58, 30, 5);
    poly(g, [[2380, 975], [2395, 965], [2410, 975], [2395, 985]], 0x8a6a4a);
    g.lineStyle(1.5, 0x8a6a4a, 1); g.lineBetween(2410, 975, 2420, 980);
  },
});
solids.push({ kind: 'rect', x: 2362, y: 1080, w: 156, h: 30 });

// Harbour clutter, kept off the walking lines.
for (const [x, y, r, hide] of [[180, 1220, 16, 0x8a6a4a], [240, 1236, 14, 0x6a5a3a], [2560, 1200, 15, 0x7a5a3a]] as [number, number, number, number][]) {
  pieces.push({ x, y, w: r * 3, h: r * 2, draw: (g) => coracle(g, x, y, r, hide) });
  solids.push({ kind: 'circle', x, y: y - r * 0.4, r: r * 0.9 });
}
for (const [x, y, s] of [[640, 1170, 14], [1840, 1170, 13], [2290, 1150, 12]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g, rng) => netHeap(g, x, y, s, rng) });
  solids.push({ kind: 'circle', x, y: y - s * 0.4, r: s });
}
for (const [x, y, len] of [[420, 1190, 46], [1960, 1196, 40], [1120, 1240, 36]] as [number, number, number][]) {
  pieces.push({ x, y, w: len + 20, h: 30, draw: (g) => eelTrap(g, x, y, len) });
}
// Mooring stakes along both walked roots.
const STAKES: [number, number][] = [[1242, 1330], [1358, 1380], [1242, 1430], [1358, 1460], [2162, 1350], [2238, 1410]];
for (const [x, y] of STAKES) pieces.push({ x, y, w: 20, h: 40, draw: (g) => stake(g, x, y, 30) });

// Firefly jars: along the Pith, the lanes and the quay.
const JARS: [number, number][] = [
  [1226, 200], [1374, 420], [1226, 660], [1374, 900], [1226, 1060],
  [700, 1170], [1180, 1160], [1440, 1150], [1960, 1150], [2330, 1160],
  [460, 740], [140, 760], [2140, 740], [2460, 760], [620, 300], [1990, 560],
];
for (const [x, y] of JARS) {
  pieces.push({ x, y, w: 30, h: 70, draw: (g) => fireflyJar(g, x, y) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 4 });
}

// ── Water and walls as solids ────────────────────────────────────────

solids.push(
  // The open sea, with the two walked roots cut out of it.
  ...carve({ x: 0, y: SEA_Y + 6, w: W, h: H - SEA_Y - 6 }, [TAPROOT, CROOK]),
  // The trunk walls, broken at the two knot-holes and ending at the butt.
  { kind: 'rect', x: 630, y: 0, w: 134, h: KNOT_Y0 },
  { kind: 'rect', x: 630, y: KNOT_Y1, w: 134, h: BUTT_Y - KNOT_Y1 },
  { kind: 'rect', x: 1836, y: 0, w: 134, h: KNOT_Y0 },
  { kind: 'rect', x: 1836, y: KNOT_Y1, w: 134, h: BUTT_Y - KNOT_Y1 },
  // The Empress's hedges along the north of both outer quarters.
  { kind: 'rect', x: 0, y: 0, w: 630, h: 62 },
  { kind: 'rect', x: 1970, y: 0, w: W - 1970, h: 62 },
);

// ── Animation ────────────────────────────────────────────────────────

/** Boats moored in the arch bays and off the roots: coracles and two little cutters. */
const MOORED: { x: number; y: number; len: number; hull: number; mast: boolean }[] = [
  { x: 1020, y: 1350, len: 54, hull: 0x5a4a30, mast: true },
  { x: 1600, y: 1340, len: 60, hull: 0x3a5a3a, mast: true },
  { x: 720, y: 1330, len: 26, hull: 0x7a5a3a, mast: false },
  { x: 1920, y: 1330, len: 24, hull: 0x6a5a3a, mast: false },
  { x: 2470, y: 1340, len: 28, hull: 0x8a6a4a, mast: false },
];

function animateUnder(g: G, t: number, view: Rect): void {
  // ── The sea: long green swells, the odd fleck of foam.
  if (view.y + view.h > SEA_Y - 40) {
    for (let row = 0; row < 10; row++) {
      const y = SEA_Y + 22 + row * 22;
      if (y < view.y - 20 || y > view.y + view.h + 20) continue;
      const speed = 8 + row * 2.2;
      for (let x = Math.floor(view.x / 96) * 96 - 96; x < view.x + view.w + 96; x += 96) {
        const ox = x + ((t * speed + row * 37) % 96);
        if (ox > TAPROOT.x - 8 && ox < TAPROOT.x + TAPROOT.w + 8) continue;
        if (ox > CROOK.x - 8 && ox < CROOK.x + CROOK.w + 30 && y < CROOK.y + CROOK.h + 20) continue;
        const yy = y + Math.sin(t * 0.8 + x * 0.012 + row) * 4;
        g.lineStyle(3, lit(SEA, 0.22), 0.16); g.lineBetween(ox, yy, ox + 44, yy - 1);
        if ((row + Math.floor(x / 96)) % 5 === 0) { g.fillStyle(FOAM, 0.26); g.fillEllipse(ox + 30, yy - 1, 10, 2.4); }
      }
    }
    // Foam lapping round each foot of the Great Root.
    for (const [x0, x1] of ARCHES) {
      for (const fx of [x0, x1]) {
        if (!inView(view, fx, SEA_Y, 40)) continue;
        const k = 0.3 + Math.sin(t * 1.6 + fx) * 0.18;
        g.fillStyle(FOAM, k); g.fillEllipse(fx, SEA_Y + 10, 44, 6);
      }
      // Under each arch, the water shines where the light comes through.
      const mx = (x0 + x1) / 2;
      if (inView(view, mx, SEA_Y + 20, 160)) {
        g.fillStyle(lit(SEA_SHALLOW, 0.2), 0.12 + Math.sin(t * 0.7 + mx) * 0.04);
        g.fillEllipse(mx, SEA_Y + 24, (x1 - x0) * 0.7, 18);
      }
    }
    // Foam collars round the walked roots.
    for (const r of [TAPROOT, CROOK]) {
      for (let y = r.y + 20; y < r.y + r.h; y += 36) {
        if (!inView(view, r.x, y, 40)) continue;
        const k = 0.3 + Math.sin(t * 1.8 + y) * 0.18;
        g.fillStyle(FOAM, k); g.fillEllipse(r.x - 4, y, 12, 4); g.fillEllipse(r.x + r.w + 4, y + 10, 12, 4);
      }
    }
    // Moored boats bobbing.
    for (const b of MOORED) {
      if (!inView(view, b.x, b.y, 80)) continue;
      const bob = Math.sin(t * 1.1 + b.x) * 3;
      const roll = Math.sin(t * 0.8 + b.y) * 0.06;
      const y = b.y + bob;
      g.fillStyle(0x0a1a18, 0.4); g.fillEllipse(b.x + 4, y + 10, b.len + 10, 12);
      if (!b.mast) {
        // A coracle: a round hide bowl, its paddle across it.
        g.fillStyle(dim(b.hull, 0.4), 1); g.fillEllipse(b.x, y + 2, b.len, b.len * 0.6);
        g.fillStyle(b.hull, 1); g.fillEllipse(b.x, y, b.len - 4, b.len * 0.5);
        g.fillStyle(dim(b.hull, 0.55), 1); g.fillEllipse(b.x, y - 1, b.len - 10, b.len * 0.32);
        g.lineStyle(2, 0x8a6a3a, 1); g.lineBetween(b.x - b.len * 0.5, y - 4, b.x + b.len * 0.5, y + 2);
        continue;
      }
      g.fillStyle(dim(b.hull, 0.4), 1); g.fillEllipse(b.x, y + 2, b.len, 16);
      g.fillStyle(b.hull, 1); g.fillEllipse(b.x, y, b.len - 4, 12);
      g.fillStyle(MOSS, 0.9); g.fillRect(b.x - b.len * 0.4, y - 3, b.len * 0.8, 2);
      const mx = b.x + roll * 70;
      g.lineStyle(2, 0x2a2018, 1); g.lineBetween(b.x, y - 2, mx, y - 52);
      g.lineStyle(1, 0x8a7a5a, 0.7); g.lineBetween(mx, y - 52, b.x + b.len / 2, y - 2); g.lineBetween(mx, y - 52, b.x - b.len / 2, y - 2);
      // A leaf-green sail, half reefed.
      poly(g, [[mx + 1, y - 48], [mx + 1, y - 16], [mx + b.len * 0.4, y - 16]], 0x6a8a4a, 0.95);
    }
  }

  // ── The Green Shoot breathes: a faint green glow, the leaf trembling.
  if (inView(view, 1050, 200, 120)) {
    glow(g, 1052, 176, 30 + Math.sin(t * 1.2) * 4, MOSS_LIT, 0.035, 3);
    const tw = Math.sin(t * 2.3) * 2;
    g.fillStyle(0x6ac040, 1); g.fillEllipse(1062 + tw, 186, 18, 7);
    g.lineStyle(1, 0x3a7a2a, 1); g.lineBetween(1054, 186, 1070 + tw, 186);
  }
  // ── The Knot Well: rain still dripping into it from the rib above, rings spreading.
  if (inView(view, 1150, 640, 120)) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i / 3) % 1;
      g.lineStyle(1, 0x8ac0b0, (1 - ph) * 0.6);
      g.strokeEllipse(1150 + (i - 1) * 10, 642, 6 + ph * 40, 2 + ph * 12);
    }
  }
  // ── Firefly light pooling on the ground under each jar.
  for (const [x, y] of JARS) {
    if (!inView(view, x, y, 80)) continue;
    const f = 0.8 + Math.sin(t * 2.1 + x) * 0.2;
    g.fillStyle(GLOW, 0.05 * f); g.fillEllipse(x + 12, y + 4, 70, 22);
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  // ── The tithe-scales' beam: it never settles, and it always leans toward the acorns.
  if (inView(view, SCALE_X, BEAM_Y, 240)) {
    const ang = 0.12 + Math.sin(t * 0.45) * 0.07 + Math.sin(t * 1.3) * 0.015;
    const half = 120;
    const lx = SCALE_X - Math.cos(ang) * half, ly = BEAM_Y - Math.sin(ang) * half;
    const rx = SCALE_X + Math.cos(ang) * half, ry = BEAM_Y + Math.sin(ang) * half;
    g.lineStyle(7, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
    g.lineStyle(4, BRASS, 1); g.lineBetween(lx, ly, rx, ry);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(SCALE_X, BEAM_Y, 7);
    g.fillStyle(BRASS, 1); g.fillCircle(SCALE_X, BEAM_Y, 4.5);
    // The pointer, hanging plumb, against its little dial.
    g.fillStyle(0x1a2a1a, 0.9); g.fillRect(SCALE_X - 16, BEAM_Y + 10, 32, 6);
    g.lineStyle(2, 0xc83a3a, 1); g.lineBetween(SCALE_X, BEAM_Y, SCALE_X + Math.sin(ang) * 18, BEAM_Y + 16);
    const CH = 74;
    for (const [px, py, right] of [[lx, ly, false], [rx, ry, true]] as [number, number, boolean][]) {
      const sw = Math.sin(t * 1.4 + (right ? 1 : 0)) * 2;
      const by = py + CH;
      g.lineStyle(1, BRASS_DARK, 1);
      g.lineBetween(px, py, px - 22 + sw, by); g.lineBetween(px, py, px + 22 + sw, by); g.lineBetween(px, py, px + sw, by);
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px + sw, by + 2, 52, 14);
      g.fillStyle(BRASS, 1); g.fillEllipse(px + sw, by, 48, 11);
      if (right) {
        // The Empress's pan: three acorns, sitting heavy.
        for (let k = 0; k < 3; k++) acornWeight(g, px + sw - 12 + k * 12, by - 1, 4.5);
      } else {
        // The house's pan: honey jars and turnips, never quite enough.
        g.fillStyle(0xe8a020, 1); g.fillRoundedRect(px + sw - 16, by - 12, 10, 11, 2);
        g.fillStyle(0xfff0b0, 0.6); g.fillRect(px + sw - 14, by - 10, 2, 6);
        g.fillStyle(0xe8e0e8, 1); g.fillCircle(px + sw + 2, by - 5, 5); g.fillStyle(0x9a4a8a, 1); g.fillCircle(px + sw + 2, by - 7, 3.5);
        g.fillStyle(0x4a8a3a, 1); g.fillTriangle(px + sw, by - 10, px + sw + 4, by - 10, px + sw + 2, by - 16);
        g.fillStyle(0xe8e0e8, 1); g.fillCircle(px + sw + 12, by - 4, 4);
      }
    }
  }
  // ── The bark ribs spanning the open top of the trunk, moss hanging off them, dripping.
  for (const ry of RIBS) {
    if (!inView(view, 1300, ry - 160, 700)) continue;
    const L = FLOOR_X0 - 90, R = FLOOR_X1 + 90;
    const arcY = (x: number): number => ry - 40 - Math.sin(((x - L) / (R - L)) * Math.PI) * 170;
    for (let x = L; x <= R; x += 10) {
      const y = arcY(x);
      g.fillStyle(BARK_DARK, 1); g.fillCircle(x, y + 2, 16);
    }
    for (let x = L; x <= R; x += 10) {
      const y = arcY(x);
      g.fillStyle(BARK, 1); g.fillCircle(x, y, 14);
      g.fillStyle(BARK_LIT, 0.5); g.fillCircle(x - 2, y - 6, 5);
    }
    for (let x = L + 30; x < R - 30; x += 22) {
      const y = arcY(x);
      g.fillStyle(MOSS, 1); g.fillEllipse(x, y - 11, 22, 9);
      const len = 14 + ((x * 7) % 26);
      const sw = Math.sin(t * 1.2 + x * 0.05) * 3;
      g.lineStyle(1.5, MOSS_DARK, 0.9);
      g.lineBetween(x, y + 12, x + sw, y + 12 + len);
      g.fillStyle(MOSS, 0.9); g.fillCircle(x + sw, y + 12 + len, 2);
    }
    // Drips falling from the rib to the floor.
    for (let i = 0; i < 6; i++) {
      const dx = L + 120 + i * ((R - L - 240) / 5);
      const ph = (t * 0.7 + i * 0.37) % 1;
      const y0 = arcY(dx) + 14;
      const y = y0 + ph * (ry - y0);
      g.fillStyle(0xc8e8e0, 0.6 * (1 - ph * 0.5)); g.fillEllipse(dx, y, 2.5, 5);
    }
  }
  // ── Fireflies in their jars, and a few loose ones drifting off along the Pith.
  for (const [x, y] of JARS) {
    if (!inView(view, x, y, 60)) continue;
    const p = jarLight(x, y);
    const f = 0.75 + Math.sin(t * 2.1 + x) * 0.25;
    glow(g, p.x, p.y, 14 * f, GLOW, 0.06, 3);
    for (let k = 0; k < 3; k++) {
      const on = Math.sin(t * 3 + k * 2.1 + x) > 0.2;
      if (!on) continue;
      g.fillStyle(GLOW, 1); g.fillCircle(p.x - 3 + k * 3, p.y - 2 + Math.sin(t * 2 + k) * 3, 1.3);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 900 + ((i * 197 + t * 14) % 800), y = 80 + ((i * 263) % 900) + Math.sin(t * 0.8 + i) * 20;
    if (!inView(view, x, y, 10)) continue;
    const on = Math.sin(t * 2.4 + i * 1.7);
    if (on < 0.3) continue;
    g.fillStyle(GLOW, 0.2 * on); g.fillCircle(x, y, 5);
    g.fillStyle(GLOW, on); g.fillCircle(x, y, 1.5);
  }
  // ── Smoke from the Crumb & Thistle's flue: thin, warm, smelling of thistle crust.
  if (inView(view, 911, 760, 200)) {
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.22 + i / 6) % 1;
      g.fillStyle(0xb8b0a0, (1 - ph) * 0.28);
      g.fillCircle(911 + ph * 40 + Math.sin(t + i) * 6, 826 - ph * 150, 7 + ph * 20);
    }
    glow(g, 1010, 964, 24 + Math.sin(t * 5) * 3, 0xff8a3a, 0.05, 3);
  }
  // ── Smoke curling from the log-house flues.
  for (const [x, y] of [[130, 210], [387, 466], [1690, 210], [2100, 230], [175, 766]] as [number, number][]) {
    if (!inView(view, x, y, 120)) continue;
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.25 + i / 4) % 1;
      g.fillStyle(0xa8a898, (1 - ph) * 0.22);
      g.fillCircle(x + ph * 20 + Math.sin(t + i) * 4, y - ph * 80, 4 + ph * 12);
    }
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1130, y: 1190 } },
  { kind: 'mooring', at: { x: 1300, y: 1458 }, isle: 'life' },
  { kind: 'water', id: 'mossgate-sea-water', shape: { x: 540, y: 1300, w: 2060, h: 190 }, fishery: 'mossgate-sea' },
  { kind: 'sign', at: { x: 1390, y: 150 }, text: 'NORTH — up the Elder to the Bloom Court. Prince Petalis\'s gardens. Keep to the gravel.' },
  { kind: 'sign', at: { x: 110, y: 690 }, text: 'WEST — The Confection Court. Prince Saccharo\'s Sweet-Tax house. Lick nothing.' },
  { kind: 'sign', at: { x: 2490, y: 690 }, text: 'EAST — The Wildhunt Court. Prince Fang\'s lodge. Do not run. Runners are hunted.' },
  { kind: 'sign', at: { x: 1380, y: 1170 }, text: 'THE TAPROOT — Moorings at the end. Hulls: B. Underbough. Tackle: E. Reedbottom, under the last arch.' },
  {
    kind: 'sign', at: { x: 1760, y: 1220 },
    text: 'THE BLOOM TITHE. Each house, each season, against the Empress\'s weight. Short houses shall be pruned to flower.',
  },
  { kind: 'sign', at: { x: 980, y: 290 }, text: 'THE GREEN SHOOT. The Elder\'s last. Do not tread, cut, graft or weigh it. — M. Sorrel' },
  { kind: 'sign', at: { x: 560, y: 1110 }, text: 'THE FALLEN ELDER. Came down in the first storm. We moved in. It did not mind.' },
  { kind: 'chest', id: 'mossgate-chest-plate', at: { x: 44, y: 1220 }, coins: 110, orbs: 1 },
  { kind: 'chest', id: 'mossgate-chest-crook', at: { x: 2200, y: 1430 }, orbs: 2, coins: 50 },
  { kind: 'chest', id: 'mossgate-chest-tithe', at: { x: 1730, y: 1250 }, coins: 360, open: { monarch: 'verdigra' } },
];

export const MOSSGATE_AREA: AreaDef = {
  id: 'mossgate',
  isle: 'life',
  name: 'Mossgate',
  subtitle: 'Harbour town in the Fallen Elder',
  w: W,
  h: H,
  bg: LITTER,
  accent: EMPRESS,
  weather: 'leaves',
  spawn: { x: 1300, y: 1410 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'bloom', label: 'Up the Elder — the Bloom Court' },
    { side: 'w', to: 'confection', label: 'The Sugar Road — the Confection Court' },
    { side: 'e', to: 'wildhunt', label: 'The Deer Path — the Wildhunt Court' },
  ],
  pois: POIS,
  npcs: MOSSGATE_NPCS,
  crowd: MOSSGATE_CROWD,
};
