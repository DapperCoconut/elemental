import type Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { type G, blob, dim, glow, lit, mixC, shadow, stroke } from '../../../../art/IsleArt';
import {
  P, SF, armillary, breathBottle, breathMeter, comet, crater, inlayStar, star, telescope,
} from './palette';
import {
  ARCH, ARMILLARIES, CRATERS, CX, DOME, ECLIPSE, H, HOUSES, KILN, LANTERNS, LAST_STAIR, LUNG_GATE, METER_HOUSE,
  PLATEAU, PLAZA, POOL, REGISTRY, ROADS, SCOPES, SHOP, SIPHON, SPUR, TOWER, W, edgeAt, walkable,
} from './layout';

/**
 * The Starfall Court, painted. The summit of Highspire stands above the clouds, where it is always
 * night. Below every edge the cloud sea lies silver under the moon, so far down that the storms of
 * the lower courts are only flickers in it and Orbit's islets are a scatter of brass lights. Up
 * here the ground is moonstone, blue-grey and faintly glowing, cut into star-roads with brass
 * stars set in them; the middle of the summit is a great constellation mosaic of lapis and gold
 * leaf. Fallen stars have punched craters of black glass into the south-west, their veins still
 * cooling violet. Everyone up here is an astronomer of some kind — every house wears a dome with a
 * slit in it — because the Prince keeps the Ledger of Stars: every soul on the isle has a star,
 * and when a household falls behind on the Breath Tax, their star is snuffed on his chart and the
 * collectors come with their bottles. Over all of it, from the very peak, the King's windmill-
 * palace turns its black sails across the stars, and their shadows sweep the summit.
 */

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** The plateau's outline as a polygon, pushed out (or in, if negative) by `d` px. */
function plateauPoly(d: number, dy = 0): Phaser.Geom.Point[] {
  const out: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const e = edgeAt(a);
    out.push(P(PLATEAU.x + Math.cos(a) * (PLATEAU.rx * e + d), PLATEAU.y + Math.sin(a) * (PLATEAU.ry * e + d) + dy));
  }
  return out;
}

// ── Ground ───────────────────────────────────────────────────────────

/** The cloud sea far below, silver under the moon, with the moon's glade laid across it. */
function cloudSea(g: G, rng: () => number): void {
  g.fillStyle(SF.cloudDeep, 1); g.fillRect(0, 0, W, H);
  // Gaps in the clouds: the black sea showing through, far below.
  for (let i = 0; i < 40; i++) blob(g, rng() * W, rng() * H, 80 + rng() * 160, 30 + rng() * 60, SF.nightDeep, 0.6, rng, 11);
  // Rolling cloud tops in rows, lit on their upper edges.
  for (let row = 0; row < H; row += 46) {
    for (let x = -60; x < W + 60; x += 70 + rng() * 60) {
      const y = row + (rng() - 0.5) * 30;
      if (walkable(x, y) && walkable(x + 40, y + 20)) continue;
      const r = 34 + rng() * 40;
      g.fillStyle(dim(SF.cloud, 0.25), 0.9); g.fillEllipse(x + 4, y + 8, r * 2.4, r * 1.1);
      g.fillStyle(SF.cloud, 0.95); g.fillEllipse(x, y, r * 2.3, r * 1.0);
      g.fillStyle(SF.cloudLit, 0.55); g.fillEllipse(x - r * 0.3, y - r * 0.25, r * 1.3, r * 0.45);
    }
  }
  // The moonglade: a long bright path across the cloud tops, east of the summit.
  for (let i = 0; i < 70; i++) {
    const k = rng();
    const x = 1500 + k * 900 + (rng() - 0.5) * 120, y = 1500 + k * 300 + (rng() - 0.5) * 80;
    if (walkable(x, y)) continue;
    g.fillStyle(SF.moon, 0.18 + rng() * 0.25); g.fillEllipse(x, y, 30 + rng() * 60, 4 + rng() * 5);
  }
  // Orbit's islets, far down to the south-east: little brass lights in a ring.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = 2150 + Math.cos(a) * 120, y = 1660 + Math.sin(a) * 50;
    g.fillStyle(SF.brassLit, 0.55); g.fillCircle(x, y, 2.5);
    g.fillStyle(SF.brass, 0.15); g.fillCircle(x, y, 7);
  }
  g.fillStyle(SF.nightDeep, 0.8); g.fillCircle(2150, 1660, 9);
  // Stormeye's endless storm as a dark knot in the clouds to the east.
  blob(g, 2290, 760, 120, 70, mixC(SF.cloudDeep, 0x000000, 0.4), 0.85, rng, 13);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.lineStyle(3, SF.cloud, 0.4);
    g.beginPath(); g.arc(2290, 760, 60 + i * 5, a, a + 1.2); g.strokePath();
  }
}

/** The plateau: moonstone, its cliff face showing along the south, frost in the hollows. */
function plateau(g: G, rng: () => number): void {
  // The cliff face below the rim (seen along the south side, where the summit falls away).
  g.fillStyle(SF.stoneDeep, 1); g.fillPoints(plateauPoly(4, 46), true, true);
  g.fillStyle(SF.stoneDark, 1); g.fillPoints(plateauPoly(2, 26), true, true);
  for (let i = 0; i < 90; i++) {
    const a = Math.PI * (0.08 + rng() * 0.84);
    const e = edgeAt(a);
    const x = PLATEAU.x + Math.cos(a) * PLATEAU.rx * e, y = PLATEAU.y + Math.sin(a) * PLATEAU.ry * e;
    g.lineStyle(1.5, SF.stoneDeep, 0.8); g.lineBetween(x, y + 6, x + (rng() - 0.5) * 8, y + 34 + rng() * 10);
  }
  // The top: moonstone, mottled.
  g.fillStyle(SF.stoneMid, 1); g.fillPoints(plateauPoly(0), true, true);
  g.fillStyle(SF.stone, 1); g.fillPoints(plateauPoly(-26), true, true);
  for (let i = 0; i < 260; i++) {
    const x = 200 + rng() * 2000, y = 180 + rng() * 1560;
    if (!walkable(x, y)) continue;
    g.fillStyle(rng() < 0.5 ? SF.stoneLit : SF.stoneMid, 0.18 + rng() * 0.2);
    g.fillEllipse(x, y, 60 + rng() * 140, 20 + rng() * 40);
  }
  // Moonstone's own glow: a pale blue sheen in streaks, as if the rock held some light.
  for (let i = 0; i < 70; i++) {
    const x = 220 + rng() * 1960, y = 200 + rng() * 1520;
    if (!walkable(x, y)) continue;
    g.fillStyle(0xc8d8ff, 0.08 + rng() * 0.08); g.fillEllipse(x, y, 90 + rng() * 120, 6 + rng() * 8);
  }
  // Grit, glints and rime.
  for (let i = 0; i < 2400; i++) {
    const x = rng() * W, y = rng() * H;
    if (!walkable(x, y)) continue;
    const r = rng();
    if (r < 0.75) { g.fillStyle(SF.stoneDark, 0.25 + rng() * 0.3); g.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 1.5); }
    else if (r < 0.93) { g.fillStyle(SF.star, 0.3 + rng() * 0.4); g.fillRect(x, y, 1, 1); }
    else { g.fillStyle(0xe8f0ff, 0.25); g.fillEllipse(x, y, 10 + rng() * 18, 3 + rng() * 4); }
  }
  // The Cloudstair spur and the Last Stair.
  g.fillStyle(SF.stoneDark, 1); g.fillRect(SPUR.x - 6, SPUR.y, SPUR.w + 12, SPUR.h);
  g.fillStyle(SF.stone, 1); g.fillRect(SPUR.x, SPUR.y, SPUR.w, SPUR.h);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(LAST_STAIR.x - 6, LAST_STAIR.y, LAST_STAIR.w + 12, LAST_STAIR.h);
  g.fillStyle(SF.stone, 1); g.fillRect(LAST_STAIR.x, LAST_STAIR.y, LAST_STAIR.w, LAST_STAIR.h);
  // Rime caught in the lee of the rim, thickest on the north.
  for (let i = 0; i < 140; i++) {
    const a = -Math.PI * (0.1 + rng() * 0.8);
    const e = edgeAt(a) - 0.03 - rng() * 0.05;
    const x = PLATEAU.x + Math.cos(a) * PLATEAU.rx * e, y = PLATEAU.y + Math.sin(a) * PLATEAU.ry * e;
    g.fillStyle(0xeef4ff, 0.35 + rng() * 0.3); g.fillEllipse(x, y, 20 + rng() * 40, 5 + rng() * 6);
  }
}

/** A star-road: moonstone setts laid in courses, a brass star inlaid every so often. */
function starRoads(g: G, rng: () => number): void {
  for (const r of ROADS) {
    stroke(g, r.pts, r.w + 12, SF.stoneDark);
    stroke(g, r.pts, r.w, SF.stoneLit);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1), nx = -uy, ny = ux;
      for (let d = 0; d < len; d += 12) {
        for (let k = -r.w / 2 + 8; k < r.w / 2 - 4; k += 14) {
          const x = a.x + ux * d + nx * (k + (Math.floor(d / 12) % 2) * 7), y = a.y + uy * d + ny * (k + (Math.floor(d / 12) % 2) * 7);
          g.fillStyle(mixC(SF.stone, SF.stoneLit, rng()), 1); g.fillRoundedRect(x - 6, y - 5, 12, 10, 2);
        }
      }
      for (let d = 40; d < len; d += 120) {
        const x = a.x + ux * d, y = a.y + uy * d;
        g.fillStyle(SF.stoneDark, 1); g.fillCircle(x, y, 10);
        inlayStar(g, x, y, 9, SF.brass, 1, -Math.PI / 2);
        inlayStar(g, x - 0.5, y - 0.5, 6, SF.brassLit, 1, -Math.PI / 2);
      }
    }
  }
  // The Cloudstair's steps up through the arch and the Last Stair's flights to the Lung.
  for (let i = 0; i < 12; i++) {
    const y = H - 20 - i * 18;
    g.fillStyle(SF.stoneDark, 1); g.fillRect(CX - 70, y, 140, 6);
    g.fillStyle(SF.stoneLit, 0.6); g.fillRect(CX - 70, y - 2, 140, 2);
  }
  for (let i = 0; i < 9; i++) {
    const y = 420 - i * 20;
    const w = 150 - i * 6;
    g.fillStyle(SF.stoneDark, 1); g.fillRect(CX - w / 2, y, w, 7);
    g.fillStyle(SF.stoneLit, 0.7); g.fillRect(CX - w / 2, y - 2, w, 2);
  }
}

/** The Highspire constellations set round the plaza's rim, as gold dots and silver lines. */
const PLAZA_FIGURES: Pt[][] = [
  // The Kite.
  [{ x: 0, y: -14 }, { x: 10, y: 0 }, { x: 0, y: 16 }, { x: -10, y: 0 }, { x: 0, y: -14 }],
  // The Windmill.
  [{ x: -12, y: -12 }, { x: 12, y: 12 }, { x: 0, y: 0 }, { x: 12, y: -12 }, { x: -12, y: 12 }],
  // The Bellows.
  [{ x: -14, y: 4 }, { x: 0, y: -10 }, { x: 14, y: 4 }, { x: 0, y: 12 }, { x: -14, y: 4 }],
  // The Sleeper.
  [{ x: -16, y: 6 }, { x: -6, y: 0 }, { x: 6, y: 2 }, { x: 16, y: -4 }],
  // The Lantern.
  [{ x: 0, y: -16 }, { x: 0, y: -8 }, { x: -8, y: 0 }, { x: 0, y: 10 }, { x: 8, y: 0 }, { x: 0, y: -8 }],
  // The Lodestone.
  [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }, { x: -10, y: -10 }, { x: 10, y: 10 }],
];

/** The Mosaic Plaza: a lapis floor laid with gold-leaf stars, silver lines and a compass of brass. */
function plazaMosaic(g: G, rng: () => number): void {
  const { x, y, rx, ry } = PLAZA;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 10, rx * 2 + 30, ry * 2 + 30);
  g.fillStyle(SF.brassDark, 1); g.fillEllipse(x, y, rx * 2 + 18, ry * 2 + 18);
  g.fillStyle(SF.brass, 1); g.fillEllipse(x, y, rx * 2 + 10, ry * 2 + 10);
  g.fillStyle(SF.lapisDeep, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
  // Tesserae: a scatter of little lapis squares in two blues.
  for (let i = 0; i < 1600; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    const tx = x + Math.cos(a) * rx * r * 0.98, ty = y + Math.sin(a) * ry * r * 0.98;
    g.fillStyle(rng() < 0.5 ? SF.lapis : SF.lapisLit, 0.55 + rng() * 0.4); g.fillRect(tx - 2.5, ty - 2.5, 5, 5);
  }
  // A ring band near the rim, with the six figures of Highspire's sky set in it.
  g.lineStyle(2, SF.silver, 0.7); g.strokeEllipse(x, y, rx * 1.66, ry * 1.66); g.strokeEllipse(x, y, rx * 1.92, ry * 1.92);
  PLAZA_FIGURES.forEach((fig, i) => {
    const a = (i / PLAZA_FIGURES.length) * Math.PI * 2 - Math.PI / 2;
    const fx = x + Math.cos(a) * rx * 0.895, fy = y + Math.sin(a) * ry * 0.895;
    g.lineStyle(1.5, SF.silver, 0.85);
    g.beginPath(); g.moveTo(fx + fig[0].x, fy + fig[0].y * 0.8);
    for (let k = 1; k < fig.length; k++) g.lineTo(fx + fig[k].x, fy + fig[k].y * 0.8);
    g.strokePath();
    for (const p of fig) inlayStar(g, fx + p.x, fy + p.y * 0.8, 3.2, SF.leaf, 1);
  });
  // Gold-leaf stars sown over the field, and a few long silver lines between the brightest.
  const bright: Pt[] = [];
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.78;
    const sx = x + Math.cos(a) * rx * r, sy = y + Math.sin(a) * ry * r;
    const s = 2 + rng() * 4;
    inlayStar(g, sx, sy, s, SF.leaf, 0.9, rng() * 6);
    if (s > 5) bright.push({ x: sx, y: sy });
  }
  g.lineStyle(1, SF.silver, 0.45);
  for (let i = 0; i < bright.length - 1; i++) if (Math.hypot(bright[i + 1].x - bright[i].x, bright[i + 1].y - bright[i].y) < 160) g.lineBetween(bright[i].x, bright[i].y, bright[i + 1].x, bright[i + 1].y);
  // The compass rose at the heart: an eight-pointed brass star and the four winds.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const L = i % 2 === 0 ? 70 : 40;
    g.fillStyle(i % 2 === 0 ? SF.brass : SF.brassDark, 1);
    g.fillTriangle(x + Math.cos(a - 0.3) * 12, y + Math.sin(a - 0.3) * 12 * 0.7, x + Math.cos(a + 0.3) * 12, y + Math.sin(a + 0.3) * 12 * 0.7, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.7);
    g.fillStyle(SF.brassLit, 1);
    g.fillTriangle(x, y, x + Math.cos(a + 0.3) * 12, y + Math.sin(a + 0.3) * 12 * 0.7, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.7);
  }
  g.fillStyle(SF.brassDark, 1); g.fillCircle(x, y, 9);
  inlayStar(g, x, y, 7, SF.starGold, 1);
}

/** The Eclipse Terrace: a round dais of dark stone, the moon's phases inlaid round its edge. */
function eclipseDais(g: G): void {
  const { x, y, r } = ECLIPSE;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 10, r * 2.2, r * 1.4);
  g.fillStyle(SF.stoneDeep, 1); g.fillEllipse(x, y, r * 2.1, r * 1.3);
  g.fillStyle(SF.stoneDark, 1); g.fillEllipse(x, y - 4, r * 2, r * 1.2);
  g.lineStyle(2, SF.silver, 0.5); g.strokeEllipse(x, y - 4, r * 1.7, r * 1.0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 0.86, py = y - 4 + Math.sin(a) * r * 0.52;
    const k = i / 12;
    g.fillStyle(SF.moon, 0.9); g.fillCircle(px, py, 7);
    // The phase: a shadow disc slid across by how far round the year it is.
    g.fillStyle(SF.stoneDeep, 1); g.fillCircle(px + Math.cos(k * Math.PI * 2) * 7, py, 6.4);
  }
  // At the centre, a black disc with a thin bright ring: totality.
  g.fillStyle(SF.nightDeep, 1); g.fillEllipse(x, y - 4, 70, 44);
  g.lineStyle(3, SF.corona, 0.8); g.strokeEllipse(x, y - 4, 74, 47);
}

/** The Starpool: a stone basin of cooling starlight, violet and white, ringed with a brass lip. */
function starpool(g: G, rng: () => number): void {
  const { x, y, w, h } = POOL;
  g.fillStyle(SF.stoneDark, 1); g.fillRoundedRect(x - 14, y - 12, w + 28, h + 26, 40);
  g.fillStyle(SF.brass, 1); g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 34);
  g.fillStyle(SF.violetDeep, 1); g.fillRoundedRect(x, y, w, h, 30);
  g.fillStyle(SF.violet, 0.7); g.fillRoundedRect(x + 12, y + 10, w - 24, h - 22, 24);
  g.fillStyle(SF.dust, 0.35); g.fillEllipse(x + w * 0.4, y + h * 0.45, w * 0.55, h * 0.4);
  for (let i = 0; i < 40; i++) star(g, x + 18 + rng() * (w - 36), y + 14 + rng() * (h - 28), 1.5 + rng() * 3, SF.star, 0.6 + rng() * 0.4);
  // Steps down into it on the west side, worn smooth by anglers.
  for (let i = 0; i < 3; i++) { g.fillStyle(SF.stoneLit, 0.7); g.fillRect(x - 12, y + 40 + i * 20, 16, 12); }
}

/** A small round constellation mosaic set into the street, a household's own stars. */
function streetMosaic(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(SF.brassDark, 1); g.fillEllipse(x, y, r * 2 + 6, r * 1.3 + 4);
  g.fillStyle(SF.lapisDeep, 1); g.fillEllipse(x, y, r * 2, r * 1.3);
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) pts.push({ x: x + (rng() - 0.5) * r * 1.4, y: y + (rng() - 0.5) * r * 0.8 });
  g.lineStyle(1, SF.silver, 0.7);
  for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  for (const p of pts) inlayStar(g, p.x, p.y, 3, SF.leaf, 1);
}

/** Star charts chalked on the stone by the stargazers: circles, crosses and dotted arcs. */
function chalkChart(g: G, x: number, y: number, rng: () => number): void {
  g.lineStyle(1.2, 0xf0f0ff, 0.4);
  g.strokeCircle(x, y, 40); g.strokeCircle(x, y, 22);
  g.lineBetween(x - 46, y, x + 46, y); g.lineBetween(x, y - 46, x, y + 46);
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 40;
    g.fillStyle(0xf0f0ff, 0.5); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6);
  }
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.9 + i * 0.18;
    g.fillStyle(0xf0f0ff, 0.35); g.fillCircle(x + Math.cos(a) * 58, y + Math.sin(a) * 58, 1.2);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

/**
 * The Lung's gate on the Last Stair, and the palace above it: a black windmill-tower of iron and
 * stone rising off the top of the world, its hub and the roots of its sails just in view. The
 * gate is a pair of bronze doors shaped like bellows, with a great breath-meter for a rose window
 * and six cork stoppers sealing it, one for each of the King's children.
 */
function lungGate(g: G, rng: () => number): void {
  const { x, y } = LUNG_GATE;
  shadow(g, x, y + 4, 320, 40, 0.4);
  // The palace tower, rising off the top edge: tapering black stone, banded in iron.
  g.fillStyle(SF.palace, 1);
  g.fillPoints([P(x - 150, y - 20), P(x + 150, y - 20), P(x + 100, y - 380), P(x - 100, y - 380)], true, true);
  g.fillStyle(SF.palaceLit, 0.35);
  g.fillPoints([P(x - 150, y - 20), P(x - 60, y - 20), P(x - 40, y - 380), P(x - 100, y - 380)], true, true);
  for (let k = 0; k < 6; k++) {
    const by = y - 50 - k * 56;
    const half = 150 - (k * 56 + 30) * (50 / 360);
    g.fillStyle(SF.ink, 0.7); g.fillRect(x - half, by, half * 2, 6);
    for (let r = -half + 10; r < half; r += 26) { g.fillStyle(SF.palaceLit, 0.8); g.fillCircle(x + r, by + 3, 1.8); }
  }
  // Slit windows lit from inside — the bottling floors, never dark.
  for (let i = 0; i < 10; i++) {
    const wx = x - 70 + (i % 5) * 35, wy = y - 120 - Math.floor(i / 5) * 120 - rng() * 10;
    g.fillStyle(0x9ad6c6, 0.7); g.fillRect(wx - 3, wy - 12, 6, 24);
  }
  // The gatehouse: a squat drum of moonstone, a bellows-door, and the meter over it.
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 130, y - 130, 260, 130);
  g.fillStyle(SF.stone, 1); g.fillRect(x - 124, y - 126, 248, 122);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, SF.stoneDark, 0.6); g.lineBetween(x - 124, y - 100 + k * 22, x + 124, y - 100 + k * 22); }
  g.fillStyle(SF.stoneLit, 1); g.fillRect(x - 136, y - 140, 272, 14);
  // The doors: two leather bellows-boards between bronze ribs, pleated.
  const dw = 110, dh = 104;
  g.fillStyle(0x2a1e14, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  for (let k = 0; k < 6; k++) {
    const py = y - dh + 8 + k * 16;
    g.fillStyle(0x5a3e28, 1); g.fillTriangle(x - dw / 2 + 4, py, x - 4, py, x - dw / 4, py + 12);
    g.fillTriangle(x + 4, py, x + dw / 2 - 4, py, x + dw / 4, py + 12);
  }
  g.lineStyle(4, SF.brassDark, 1); g.lineBetween(x, y - dh, x, y); g.strokeRect(x - dw / 2, y - dh, dw, dh);
  // Six cork stoppers sealing the seam, one per prince, each with the King's wax.
  for (let i = 0; i < 6; i++) {
    const cy = y - dh + 12 + i * 15;
    g.fillStyle(0x8a6040, 1); g.fillRoundedRect(x - 9, cy - 5, 18, 10, 3);
    g.fillStyle(0xa8302a, 1); g.fillCircle(x, cy, 3.5);
  }
  // The great breath-meter over the door, as a rose window.
  breathMeter(g, x, y - dh - 34, 30, 0.88);
  g.lineStyle(3, SF.brassDark, 1); g.strokeCircle(x, y - dh - 34, 34);
  // Lamps of bottled breath either side of the door.
  for (const side of [-1, 1]) {
    breathBottle(g, x + side * 92, y - 34, 14, 0.9);
    g.lineStyle(2, SF.brassDark, 1); g.lineBetween(x + side * 92, y - 60, x + side * 92, y - 92);
  }
}

/**
 * Prince Nova's Zenith Tower: a slim white tower of moonstone, ringed with brass galleries, a
 * dome at its top split by an open slit and a telescope pushed through it at the zenith. His
 * banner — an eight-rayed star in a ring — hangs either side of the door.
 */
function zenithTower(g: G, rng: () => number): void {
  const { x, y } = TOWER;
  shadow(g, x, y + 4, 260, 46, 0.35);
  // Steps up to the door.
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? SF.stoneLit : SF.stone, 1); g.fillRect(x - 80 + i * 10, y - 10 - i * 8, 160 - i * 20, 10); }
  // The shaft.
  const top = y - 380;
  g.fillStyle(SF.stoneDark, 1); g.fillPoints([P(x - 74, y - 24), P(x + 74, y - 24), P(x + 54, top), P(x - 54, top)], true, true);
  g.fillStyle(SF.stoneLit, 1); g.fillPoints([P(x - 68, y - 26), P(x + 60, y - 26), P(x + 44, top + 4), P(x - 50, top + 4)], true, true);
  g.fillStyle(0xffffff, 0.25); g.fillPoints([P(x - 60, y - 26), P(x - 26, y - 26), P(x - 22, top + 4), P(x - 44, top + 4)], true, true);
  // Brass galleries round the shaft.
  for (const gy of [y - 140, y - 260]) {
    const half = 74 - ((y - 24 - gy) / (y - 24 - top)) * 20 + 14;
    g.fillStyle(SF.brassDark, 1); g.fillEllipse(x, gy, half * 2, 22);
    g.fillStyle(SF.brass, 1); g.fillEllipse(x, gy - 3, half * 2 - 4, 16);
    for (let k = -half + 6; k < half; k += 10) { g.lineStyle(1.5, SF.brassDark, 1); g.lineBetween(x + k, gy - 3, x + k, gy - 18); }
    g.lineStyle(2, SF.brassLit, 1); g.lineBetween(x - half + 2, gy - 18, x + half - 2, gy - 18);
  }
  // Narrow windows, star-shaped.
  for (let i = 0; i < 4; i++) inlayStar(g, x + (i % 2 ? 18 : -18), y - 90 - i * 70, 8, 0x9d86ff, 0.9);
  // The dome, its slit open, the telescope pushed through.
  g.fillStyle(SF.stoneDark, 1); g.fillEllipse(x, top, 132, 120);
  g.fillStyle(SF.silver, 1); g.fillEllipse(x, top - 4, 124, 112);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 24, top - 20, 40, 60);
  g.fillStyle(SF.nightDeep, 1); g.fillRect(x - 10, top - 58, 20, 58);
  g.fillStyle(SF.brassDark, 1); g.fillRect(x - 70, top - 4, 140, 8);
  telescope(g, x + 4, top - 2, 90, -Math.PI / 2 - 0.25);
  // The door and its banners.
  g.fillStyle(SF.nightDeep, 1); g.fillRoundedRect(x - 26, y - 104, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.lineStyle(3, SF.brass, 1); g.strokeRoundedRect(x - 26, y - 104, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
  inlayStar(g, x, y - 82, 9, SF.starGold, 1);
  for (const side of [-1, 1]) {
    const bx = x + side * 100;
    g.fillStyle(SF.brassDark, 1); g.fillRect(bx - 2, y - 190, 4, 190);
    g.fillStyle(SF.violetDeep, 1); g.fillRect(bx + (side < 0 ? 2 : -34), y - 184, 32, 64);
    g.fillTriangle(bx + (side < 0 ? 2 : -34), y - 120, bx + (side < 0 ? 34 : -2), y - 120, bx + (side < 0 ? 18 : -18), y - 106);
    const ex = bx + (side < 0 ? 18 : -18), ey = y - 156;
    g.lineStyle(1.5, SF.starGold, 1); g.strokeCircle(ex, ey, 11);
    star(g, ex, ey, 9, SF.starGold, 1);
  }
  for (let i = 0; i < 4; i++) { g.fillStyle(SF.stoneMid, 0.5); g.fillCircle(x - 40 + rng() * 80, y - 30 - rng() * 300, 2); }
}

/**
 * The Registry of Stars: a long hall of columns with a pediment, a star-clock in the gable, and
 * in front a brass board of plaques — every household's star by name. Some plaques are inked
 * over black: snuffed.
 */
function registry(g: G, rng: () => number): void {
  const { x, y } = REGISTRY;
  shadow(g, x, y + 4, 300, 40, 0.35);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 136, y - 20, 272, 20);
  g.fillStyle(SF.stoneLit, 1); g.fillRect(x - 130, y - 24, 260, 8);
  g.fillStyle(SF.stoneDeep, 1); g.fillRect(x - 118, y - 150, 236, 126);
  // Shelves of ledgers inside, glimpsed between the columns.
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 22; k++) {
      g.fillStyle([0x5a2a2a, 0x2a3a5a, 0x3a4a2a, 0x5a4a2a][(k + r) % 4], 1);
      g.fillRect(x - 112 + k * 10.2, y - 144 + r * 30, 8, 24);
    }
  }
  for (let i = 0; i < 6; i++) {
    const cx = x - 110 + i * 44;
    g.fillStyle(SF.stoneMid, 1); g.fillRect(cx - 10, y - 154, 20, 132);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(cx - 8, y - 154, 9, 132);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(cx - 13, y - 160, 26, 8);
  }
  // The pediment and its star-clock.
  g.fillStyle(SF.stoneDark, 1); g.fillTriangle(x - 146, y - 158, x + 146, y - 158, x, y - 228);
  g.fillStyle(SF.stone, 1); g.fillTriangle(x - 132, y - 162, x + 132, y - 162, x, y - 220);
  g.fillStyle(SF.lapisDeep, 1); g.fillCircle(x, y - 184, 20);
  g.lineStyle(2, SF.brass, 1); g.strokeCircle(x, y - 184, 20);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(SF.leaf, 1); g.fillCircle(x + Math.cos(a) * 15, y - 184 + Math.sin(a) * 15, 1.4); }
  g.lineStyle(2, SF.brassLit, 1); g.lineBetween(x, y - 184, x + 10, y - 194);
  // The board of plaques out front: brass squares, a few inked black.
  g.fillStyle(SF.brassDark, 1); g.fillRect(x + 150, y - 110, 70, 110);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      const snuffed = rng() < 0.22;
      g.fillStyle(snuffed ? SF.ink : SF.brass, 1); g.fillRect(x + 154 + c * 16.5, y - 106 + r * 17, 13, 13);
      if (!snuffed) inlayStar(g, x + 160.5 + c * 16.5, y - 99.5 + r * 17, 3, SF.brassLit, 1);
    }
  }
}

/** The moon-disc gantry over the Eclipse Terrace: two posts, a brass rail, a pale disc hung on it. */
function eclipseGantry(g: G): void {
  const { x, y } = ECLIPSE;
  for (const side of [-1, 1]) {
    const px = x + side * 104;
    shadow(g, px, y - 36, 30, 10);
    g.fillStyle(SF.stoneDark, 1); g.fillRect(px - 10, y - 220, 20, 184);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(px - 8, y - 220, 8, 184);
  }
  g.lineStyle(6, SF.brassDark, 1); g.lineBetween(x - 118, y - 214, x + 118, y - 214);
  g.lineStyle(3, SF.brassLit, 1); g.lineBetween(x - 118, y - 216, x + 118, y - 216);
  // The disc, hung off-centre on its carriage — it is wound across for the eclipse rite.
  const dx = x - 40;
  g.lineStyle(2, SF.brassDark, 1); g.lineBetween(dx, y - 214, dx, y - 190);
  g.fillStyle(SF.moonShade, 1); g.fillCircle(dx, y - 160, 34);
  g.fillStyle(SF.moon, 1); g.fillCircle(dx - 3, y - 163, 31);
  for (const [cx, cy, r] of [[-10, -6, 6], [8, 6, 4], [4, -14, 3], [-6, 12, 3]] as const) {
    g.fillStyle(SF.moonShade, 0.6); g.fillCircle(dx + cx, y - 163 + cy, r);
  }
}

/**
 * The Great Telescope: a dome of riveted copper-green on a drum of moonstone, its shutter open,
 * and a brass tube the length of a ship pushed out of it toward the sky.
 */
function greatTelescope(g: G, rng: () => number): void {
  const { x, y } = DOME;
  shadow(g, x, y + 4, 340, 50, 0.35);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 150, y - 110, 300, 110);
  g.fillStyle(SF.stone, 1); g.fillRect(x - 144, y - 106, 288, 102);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, SF.stoneDark, 0.6); g.lineBetween(x - 144, y - 84 + k * 22, x + 144, y - 84 + k * 22); }
  g.fillStyle(SF.nightDeep, 1); g.fillRoundedRect(x - 30, y - 80, 60, 80, { tl: 30, tr: 30, bl: 0, br: 0 });
  // The dome.
  const dy = y - 110;
  g.fillStyle(0x2f5a52, 1); g.fillEllipse(x, dy, 320, 260);
  g.fillStyle(SF.verdigris, 1); g.fillEllipse(x - 6, dy - 6, 304, 244);
  g.fillStyle(lit(SF.verdigris, 0.3), 0.6); g.fillEllipse(x - 60, dy - 50, 110, 120);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 160, dy - 2, 320, 112 + 2);
  g.fillStyle(SF.stone, 1); g.fillRect(x - 144, dy, 288, 4);
  for (let k = -4; k <= 4; k++) {
    g.lineStyle(1.5, 0x2f5a52, 0.8);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const px = x + Math.cos(a) * 152 * (k / 4.5), py = dy + Math.sin(a) * 122;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle(0x2f5a52, 0.8); g.fillCircle(x - 140 + rng() * 280, dy - rng() * 110, 1.2); }
  // The shutter slit, open, and the great tube.
  g.fillStyle(SF.nightDeep, 1); g.fillPoints([P(x - 20, dy - 2), P(x + 26, dy - 2), P(x + 40, dy - 120), P(x + 10, dy - 124)], true, true);
  const a = -Math.PI / 2 + 0.55;
  const bx0 = x + 6, by0 = dy - 40;
  const bx1 = bx0 + Math.cos(a) * 240, by1 = by0 + Math.sin(a) * 240;
  g.lineStyle(42, SF.brassDark, 1); g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(34, SF.brass, 1); g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(8, SF.brassLit, 1); g.lineBetween(bx0 - 10, by0 - 6, bx1 - 10, by1 - 6);
  for (const k of [0.25, 0.55, 0.85]) {
    const rx = bx0 + (bx1 - bx0) * k, ry = by0 + (by1 - by0) * k;
    g.lineStyle(46, SF.brassDark, 1); g.lineBetween(rx - Math.cos(a) * 3, ry - Math.sin(a) * 3, rx + Math.cos(a) * 3, ry + Math.sin(a) * 3);
  }
  g.fillStyle(SF.brassDark, 1); g.fillCircle(bx1, by1, 26);
  g.fillStyle(SF.comet, 0.85); g.fillCircle(bx1, by1, 19);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(bx1 - 6, by1 - 6, 6);
  // A ladder up the drum to the dome walk.
  g.lineStyle(2, SF.brassDark, 1);
  g.lineBetween(x + 100, y, x + 100, y - 110); g.lineBetween(x + 118, y, x + 118, y - 110);
  for (let k = 0; k < 9; k++) g.lineBetween(x + 100, y - 8 - k * 12, x + 118, y - 8 - k * 12);
}

/**
 * The Star Kiln: a round iron cage on a stone hearth, a fallen star chained burning inside it,
 * fed by a pair of the King's bellows. The court burns stars here for the Lung's lamps.
 */
function starKiln(g: G): void {
  const { x, y } = KILN;
  shadow(g, x, y + 4, 200, 40, 0.38);
  g.fillStyle(SF.stoneDark, 1); g.fillEllipse(x, y - 14, 160, 60);
  g.fillStyle(SF.stoneMid, 1); g.fillEllipse(x, y - 20, 150, 50);
  g.fillStyle(0x1a0c08, 1); g.fillEllipse(x, y - 22, 110, 32);
  // The cage bars.
  g.lineStyle(4, 0x2a2a34, 1);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const bx = x + Math.cos(a) * 64;
    g.beginPath(); g.moveTo(bx, y - 22 + Math.sin(a) * -12); g.lineTo(x + Math.cos(a) * 50, y - 150); g.lineTo(x, y - 176); g.strokePath();
  }
  g.lineStyle(5, 0x2a2a34, 1); g.strokeEllipse(x, y - 100, 116, 26);
  g.fillStyle(0x2a2a34, 1); g.fillCircle(x, y - 178, 8);
  // Chains down to the star.
  g.lineStyle(2, 0x5a5a6a, 1);
  for (const s of [-1, 1]) g.lineBetween(x + s * 46, y - 120, x + s * 10, y - 78);
  // The bellows feeding it, pleated leather on brass, one each side.
  for (const s of [-1, 1]) {
    const bx = x + s * 104;
    g.fillStyle(0x5a3e28, 1); g.fillTriangle(bx, y - 40, bx + s * 40, y - 70, bx + s * 40, y - 10);
    for (let k = 0; k < 4; k++) { g.lineStyle(1.5, 0x2a1e14, 1); g.lineBetween(bx + s * 10 * k, y - 40 - k * 7, bx + s * 10 * k, y - 40 + k * 7); }
    g.lineStyle(3, SF.brassDark, 1); g.lineBetween(bx, y - 40, x + s * 56, y - 34);
  }
}

/** The Almanac: a domed stall hung with star charts on lines, a celestial globe on the counter. */
function almanac(g: G, rng: () => number): void {
  const { x, y } = SHOP;
  shadow(g, x, y + 4, 200, 34, 0.35);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 84, y - 110, 168, 110);
  g.fillStyle(SF.stone, 1); g.fillRect(x - 80, y - 106, 160, 102);
  g.fillStyle(SF.nightDeep, 1); g.fillRect(x - 64, y - 96, 128, 56);
  // Shelves of rolled charts behind.
  for (let i = 0; i < 12; i++) { g.fillStyle(SF.parchment, 1); g.fillCircle(x - 56 + (i % 6) * 22, y - 84 + Math.floor(i / 6) * 22, 6); g.lineStyle(1, 0xa89870, 1); g.strokeCircle(x - 56 + (i % 6) * 22, y - 84 + Math.floor(i / 6) * 22, 3); }
  // The counter and the globe.
  g.fillStyle(SF.brassDark, 1); g.fillRect(x - 84, y - 40, 168, 10);
  g.fillStyle(SF.brass, 1); g.fillRect(x - 84, y - 42, 168, 4);
  g.fillStyle(SF.lapis, 1); g.fillCircle(x + 46, y - 58, 14);
  for (let i = 0; i < 6; i++) { g.fillStyle(SF.leaf, 1); g.fillCircle(x + 40 + rng() * 14, y - 64 + rng() * 14, 1.2); }
  g.lineStyle(2, SF.brass, 1); g.beginPath(); g.arc(x + 46, y - 58, 17, Math.PI * 0.6, Math.PI * 2.1); g.strokePath();
  // The dome roof.
  g.fillStyle(SF.violetDeep, 1); g.fillEllipse(x, y - 110, 184, 110);
  g.fillStyle(SF.violet, 0.7); g.fillEllipse(x - 6, y - 116, 168, 92);
  for (let i = 0; i < 14; i++) inlayStar(g, x - 70 + rng() * 140, y - 150 + rng() * 34, 2 + rng() * 2, SF.leaf, 1);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 92, y - 112, 184, 8);
  // Charts hung out on a line to the right, curling.
  g.lineStyle(1, 0xa89870, 1); g.lineBetween(x + 84, y - 100, x + 140, y - 80);
  for (let i = 0; i < 3; i++) {
    const cx = x + 94 + i * 18, cy = y - 96 + i * 7;
    g.fillStyle(SF.parchment, 1); g.fillRect(cx - 7, cy, 14, 20);
    g.lineStyle(0.8, SF.lapis, 1); g.strokeCircle(cx, cy + 10, 4);
  }
  g.fillStyle(SF.brassDark, 1); g.fillRect(x + 138, y - 82, 3, 82);
}

/** The Cloud Line arch: two piers and a span of moonstone, the King's meter set in the keystone. */
function cloudArch(g: G): void {
  const { x, y, span } = ARCH;
  for (const side of [-1, 1]) {
    const px = x + side * (span / 2 + 6);
    shadow(g, px, y, 54, 16);
    g.fillStyle(SF.stoneDark, 1); g.fillRect(px - 22, y - 170, 44, 170);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(px - 18, y - 170, 18, 170);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(px - 26, y - 176, 52, 10);
  }
  g.lineStyle(26, SF.stoneDark, 1); g.beginPath(); g.arc(x, y - 170, span / 2 + 6, Math.PI, 0, false); g.strokePath();
  g.lineStyle(18, SF.stone, 1); g.beginPath(); g.arc(x, y - 170, span / 2 + 6, Math.PI, 0, false); g.strokePath();
  breathMeter(g, x, y - 170 - span / 2 - 6, 22, 0.5);
  // The painted line across the road: the Cloud Line itself, in white, with a brass rail.
  g.fillStyle(0xf4f4ff, 0.85); g.fillRect(x - span / 2 + 10, y + 6, span - 20, 5);
  for (let k = 0; k < 6; k++) { g.fillStyle(SF.nightDeep, 0.6); g.fillRect(x - span / 2 + 22 + k * 28, y + 6, 10, 5); }
}

/** The meter-house: a brass booth with gauges, a frost-glass window and a book of readings. */
function meterHouse(g: G): void {
  const { x, y } = METER_HOUSE;
  shadow(g, x, y + 4, 170, 30, 0.35);
  g.fillStyle(SF.brassDark, 1); g.fillRect(x - 70, y - 120, 140, 120);
  g.fillStyle(SF.brass, 1); g.fillRect(x - 66, y - 116, 132, 112);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) breathMeter(g, x - 48 + c * 32, y - 92 + r * 32, 11, ((r * 4 + c) * 0.17) % 1);
  g.fillStyle(0xdfeaf4, 0.85); g.fillRect(x - 44, y - 34, 88, 26);
  g.lineStyle(2, SF.brassDark, 1); g.strokeRect(x - 44, y - 34, 88, 26);
  g.fillStyle(0xffffff, 0.4); g.fillEllipse(x - 10, y - 22, 40, 10);
  g.fillStyle(SF.brassDark, 1); g.fillTriangle(x - 80, y - 118, x + 80, y - 118, x, y - 160);
  g.fillStyle(SF.brassLit, 1); g.fillTriangle(x - 70, y - 120, x + 70, y - 120, x, y - 154);
  g.fillStyle(SF.brassDark, 1); g.fillRect(x - 2, y - 180, 4, 24);
  g.fillStyle(SF.brassLit, 1); g.fillCircle(x, y - 182, 5);
}

/** A domed observatory-house: a drum of moonstone, a round roof with a slit, a window scope. */
function domeHouse(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 120 * s, 26 * s, 0.32);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 50 * s, y - 60 * s, 100 * s, 60 * s);
  g.fillStyle(SF.stone, 1); g.fillRect(x - 47 * s, y - 58 * s, 94 * s, 56 * s);
  g.fillStyle(SF.stoneLit, 0.5); g.fillRect(x - 47 * s, y - 58 * s, 30 * s, 56 * s);
  // Door and a lit window.
  g.fillStyle(SF.nightDeep, 1); g.fillRoundedRect(x - 12 * s, y - 40 * s, 24 * s, 40 * s, { tl: 12 * s, tr: 12 * s, bl: 0, br: 0 });
  g.fillStyle(SF.starGold, 0.8); g.fillCircle(x + 28 * s, y - 34 * s, 7 * s);
  g.lineStyle(1, SF.stoneDark, 1); g.lineBetween(x + 21 * s, y - 34 * s, x + 35 * s, y - 34 * s); g.lineBetween(x + 28 * s, y - 41 * s, x + 28 * s, y - 27 * s);
  // The dome: one of three colours, per family.
  const roof = [SF.verdigris, SF.violetDeep, SF.silver][Math.floor(rng() * 3)];
  g.fillStyle(dim(roof, 0.35), 1); g.fillEllipse(x, y - 60 * s, 108 * s, 84 * s);
  g.fillStyle(roof, 1); g.fillEllipse(x - 3 * s, y - 63 * s, 100 * s, 76 * s);
  g.fillStyle(0xffffff, 0.2); g.fillEllipse(x - 20 * s, y - 78 * s, 26 * s, 30 * s);
  g.fillStyle(SF.stoneDark, 1); g.fillRect(x - 54 * s, y - 62 * s, 108 * s, 6 * s);
  g.fillStyle(SF.nightDeep, 1); g.fillRect(x - 5 * s, y - 100 * s, 10 * s, 38 * s);
  // A breath-meter bolted by the door: the household's reading, for the collectors.
  breathMeter(g, x - 28 * s, y - 30 * s, 7 * s, rng());
  // A little telescope poking out of the slit.
  const a = -Math.PI / 2 + (rng() - 0.5) * 1.2;
  g.lineStyle(6 * s, SF.brassDark, 1); g.lineBetween(x, y - 84 * s, x + Math.cos(a) * 40 * s, y - 84 * s + Math.sin(a) * 40 * s);
  g.lineStyle(4 * s, SF.brass, 1); g.lineBetween(x, y - 84 * s, x + Math.cos(a) * 40 * s, y - 84 * s + Math.sin(a) * 40 * s);
}

/** A star-lantern: a tall slim brass pole with a cage at the top holding a captured star-mote. */
function lanternPole(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.lineStyle(4, SF.brassDark, 1); g.lineBetween(x, y, x, y - 92);
  g.lineStyle(2, SF.brass, 1); g.lineBetween(x - 1, y, x - 1, y - 92);
  g.fillStyle(SF.brassDark, 1); g.fillRect(x - 7, y - 4, 14, 4);
  // The cage: a little armillary of wire.
  g.lineStyle(1.5, SF.brass, 1); g.strokeCircle(x, y - 104, 10); g.strokeEllipse(x, y - 104, 20, 7); g.strokeEllipse(x, y - 104, 7, 20);
  g.fillStyle(SF.brassDark, 1); g.fillCircle(x, y - 116, 2.5);
}

/** The copper siphon: rods sunk in the Starpool, wired to a rack of glass jars filling with light. */
function siphon(g: G): void {
  const { x, y } = SIPHON;
  shadow(g, x, y, 60, 16);
  g.fillStyle(0x8a4a28, 1); g.fillRect(x - 6, y - 70, 12, 70);
  g.fillStyle(0xc87a48, 1); g.fillRect(x - 4, y - 70, 5, 70);
  g.lineStyle(3, 0xc87a48, 1); g.lineBetween(x - 4, y - 60, POOL.x + POOL.w - 30, POOL.y + 50);
  g.lineBetween(x - 4, y - 40, POOL.x + POOL.w - 40, POOL.y + 100);
  for (let i = 0; i < 3; i++) {
    const jx = x + 16 + i * 12, jy = y - 4;
    g.fillStyle(0x223040, 1); g.fillRoundedRect(jx - 5, jy - 18, 10, 18, 3);
    g.fillStyle(SF.dust, 0.75); g.fillRoundedRect(jx - 4, jy - 12 + i * 2, 8, 11 - i * 2, 2);
    g.fillStyle(0x8a4a28, 1); g.fillRect(jx - 3, jy - 21, 6, 3);
  }
}

// ── The painter ──────────────────────────────────────────────────────

const lanternMote = (l: Pt): Pt => ({ x: l.x, y: l.y - 104 });
const KILN_STAR = { x: KILN.x, y: KILN.y - 70 };
/** The palace's hub, just off the top of the map; its sails sweep down over the Last Stair. */
const HUB = { x: CX, y: -140 };
const SAIL_LEN = 470;

export function makeStarfallPainter(): AreaPainter {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  const add = (x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void): void => {
    pieces.push({ x, y, w, h, draw });
  };

  add(LUNG_GATE.x, LUNG_GATE.y + 2, 340, 600, (g, rng) => lungGate(g, rng));
  add(TOWER.x, TOWER.y + 4, 280, 480, (g, rng) => zenithTower(g, rng));
  add(REGISTRY.x, REGISTRY.y + 4, 380, 240, (g, rng) => registry(g, rng));
  add(ECLIPSE.x, ECLIPSE.y - 34, 260, 240, (g) => eclipseGantry(g));
  add(DOME.x, DOME.y + 4, 380, 420, (g, rng) => greatTelescope(g, rng));
  add(KILN.x, KILN.y + 4, 260, 200, (g) => starKiln(g));
  add(SHOP.x, SHOP.y + 4, 300, 200, (g, rng) => almanac(g, rng));
  add(ARCH.x, ARCH.y + 12, ARCH.span + 80, 300, (g) => cloudArch(g));
  add(METER_HOUSE.x, METER_HOUSE.y + 4, 190, 200, (g) => meterHouse(g));
  add(SIPHON.x, SIPHON.y + 2, 100, 90, (g) => siphon(g));
  for (const h of HOUSES) add(h.x, h.y + 2, 130 * h.s, 130 * h.s, (g, rng) => domeHouse(g, h.x, h.y, h.s, rng));
  for (const l of LANTERNS) add(l.x, l.y, 30, 130, (g) => lanternPole(g, l.x, l.y));
  for (const s of SCOPES) add(s.x, s.y + 2, s.s * 1.6, s.s * 1.6, (g) => telescope(g, s.x, s.y, s.s, s.a));
  for (const a of ARMILLARIES) add(a.x, a.y + 2, 60, 90, (g) => { shadow(g, a.x, a.y, 50, 14); armillary(g, a.x, a.y, 36, 0.8); });

  return {
    ground(g, rng) {
      cloudSea(g, rng);
      plateau(g, rng);
      starRoads(g, rng);
      plazaMosaic(g, rng);
      eclipseDais(g);
      for (const c of CRATERS) crater(g, c.x, c.y, c.r, c === CRATERS[0] ? 0.8 : 0.25, rng);
      starpool(g, rng);
      // Household mosaics in the streets, and the stargazers' chalk.
      for (const [mx, my] of [[1040, 1480], [1380, 1240], [740, 820], [1620, 700], [1060, 700], [1900, 1080], [440, 1300]] as const) streetMosaic(g, mx, my, 26, rng);
      for (const [cx2, cy2] of [[1060, 1520], [1340, 1510], [880, 680], [2000, 980], [580, 760]] as const) chalkChart(g, cx2, cy2, rng);
      // A worn patch before the Lung's door where the collectors set down their crates.
      g.fillStyle(SF.stoneDark, 0.4); g.fillEllipse(CX, 270, 200, 50);
      for (let i = 0; i < 7; i++) { g.fillStyle(0x9ad6c6, 0.25); g.fillCircle(CX - 70 + i * 23, 284 + Math.sin(i * 1.7) * 6, 3); }
    },

    pieces,

    animate(g, t, view) {
      // The sails' shadows sweeping the north of the summit as the palace turns.
      if (view.y < 760) {
        for (let i = 0; i < 4; i++) {
          const a = t * 0.18 + (i / 4) * Math.PI * 2;
          const sy = Math.sin(a);
          if (sy < 0.15) continue;
          const tipX = HUB.x + Math.cos(a) * SAIL_LEN * 1.35, tipY = HUB.y + 120 + sy * SAIL_LEN * 1.35;
          const nx = -Math.sin(a) * 50, ny = Math.cos(a) * 50;
          g.fillStyle(0x000000, 0.13 * sy);
          g.fillTriangle(HUB.x + 20 + nx * 0.2, HUB.y + 160, tipX + nx, tipY + ny, tipX - nx, tipY - ny);
        }
      }
      // The Starpool: slow swirls of light, and stars rising and winking out on its surface.
      const pc = { x: POOL.x + POOL.w / 2, y: POOL.y + POOL.h / 2 };
      if (inView(view, pc.x, pc.y, 220)) {
        for (let i = 0; i < 3; i++) {
          g.lineStyle(1.5, SF.dust, 0.25);
          g.beginPath(); g.arc(pc.x + (i - 1) * 60, pc.y, 22 + i * 6, t * (0.6 + i * 0.2), t * (0.6 + i * 0.2) + 2.4); g.strokePath();
        }
        for (let i = 0; i < 7; i++) {
          const ph = (t * 0.4 + i * 0.37) % 1;
          const sx = POOL.x + 30 + ((i * 53) % (POOL.w - 60)), sy = POOL.y + 26 + ((i * 31) % (POOL.h - 50));
          star(g, sx, sy, 2 + Math.sin(ph * Math.PI) * 4, SF.star, Math.sin(ph * Math.PI));
        }
        // Light draining up the siphon's wires in beads.
        for (let i = 0; i < 4; i++) {
          const k = (t * 0.7 + i / 4) % 1;
          const x = POOL.x + POOL.w - 30 + (SIPHON.x - 4 - (POOL.x + POOL.w - 30)) * k, y = POOL.y + 50 + (SIPHON.y - 60 - (POOL.y + 50)) * k;
          g.fillStyle(SF.dust, 0.85); g.fillCircle(x, y, 2);
        }
      }
      // The freshest crater still breathes violet.
      const c0 = CRATERS[0];
      if (inView(view, c0.x, c0.y, 100)) {
        const k = 0.5 + 0.5 * Math.sin(t * 1.3);
        g.fillStyle(SF.violet, 0.12 + 0.12 * k); g.fillEllipse(c0.x, c0.y, c0.r * 1.3, c0.r * 0.75);
        g.fillStyle(SF.dust, 0.4 + 0.4 * k); g.fillCircle(c0.x, c0.y, 4 + k * 2);
      }
      // Cloud sea drifting past the rim far below.
      for (let i = 0; i < 12; i++) {
        const y = 140 + i * 140;
        const span = W + 700;
        const x = ((t * (8 + (i % 3) * 4) + i * 431) % span) - 350;
        if (!inView(view, x, y, 280) || walkable(x, y)) continue;
        g.fillStyle(SF.cloudLit, 0.12); g.fillEllipse(x, y, 340, 50);
      }
      // A star falls into the cloud sea now and then, somewhere off the edge.
      const ph = (t * 0.09) % 1;
      if (ph < 0.12) {
        const k = ph / 0.12;
        const n = Math.floor(t * 0.09);
        const sx = ((n * 977) % 2000) + 200, sy = ((n * 613) % 600) + 100;
        const x = sx + k * 300, y = sy + k * 220;
        if (inView(view, x, y, 200) && !walkable(x, y)) comet(g, x, y, Math.atan2(220, 300), 90, 3, t, 1 - k);
      }
      // Stormeye's knot flickers with its lightning, far off to the east.
      if (inView(view, 2290, 760, 200)) {
        const f = Math.sin(t * 7.3) * Math.sin(t * 2.1);
        if (f > 0.82) { g.fillStyle(0xe8f0ff, 0.3); g.fillCircle(2290, 760, 70); }
      }
    },

    animateOver(g, t, view) {
      // Every star-lantern's mote breathes, and the light in its cage turns.
      LANTERNS.forEach((l, i) => {
        const p = lanternMote(l);
        if (!inView(view, p.x, p.y, 80)) return;
        const k = 0.75 + 0.25 * Math.sin(t * (1.1 + (i % 4) * 0.3) + i);
        glow(g, p.x, p.y, 30 * k, SF.dust, 0.05, 3);
        star(g, p.x, p.y, 5 + k * 2, SF.star, 0.95);
      });
      // The caged star in the kiln: white-hot, its glow pumped by the bellows.
      if (inView(view, KILN_STAR.x, KILN_STAR.y, 200)) {
        const pump = 0.8 + 0.2 * Math.sin(t * 2.4);
        glow(g, KILN_STAR.x, KILN_STAR.y, 90 * pump, SF.giant, 0.05, 4);
        glow(g, KILN_STAR.x, KILN_STAR.y, 36 * pump, SF.giantLit, 0.12, 3);
        star(g, KILN_STAR.x, KILN_STAR.y, 22 * pump, SF.starHot, 1);
        for (let i = 0; i < 6; i++) {
          const k = (t * 0.8 + i / 6) % 1;
          g.fillStyle(SF.giantLit, 1 - k); g.fillCircle(KILN_STAR.x + Math.sin(i * 2.7 + t) * 20, KILN_STAR.y - k * 110, 2);
        }
      }
      // The great telescope's lens catches starlight and winks.
      const lx = DOME.x + 6 + Math.cos(-Math.PI / 2 + 0.55) * 240, ly = DOME.y - 150 + Math.sin(-Math.PI / 2 + 0.55) * 240;
      if (inView(view, lx, ly, 80)) {
        const k = Math.max(0, Math.sin(t * 0.7)) ** 8;
        if (k > 0.02) star(g, lx - 6, ly - 6, 10 + k * 30, SF.star, k);
      }
      // The Zenith Tower's slit glows with whatever the Prince is looking at.
      if (inView(view, TOWER.x, TOWER.y - 400, 120)) {
        glow(g, TOWER.x, TOWER.y - 410, 26 + Math.sin(t * 1.6) * 4, SF.violetLit, 0.06, 3);
      }
      // House windows warm and dim as people move inside.
      HOUSES.forEach((h, i) => {
        const wx = h.x + 28 * h.s, wy = h.y - 34 * h.s;
        if (!inView(view, wx, wy, 60)) return;
        const k = 0.6 + 0.4 * Math.sin(t * (0.8 + (i % 3) * 0.3) + i * 1.7);
        g.fillStyle(SF.starGold, 0.12 * k); g.fillCircle(wx, wy, 16 * h.s);
      });
      // The Lung's sails, black against the stars, turning over the Last Stair.
      if (view.y < 520) {
        for (let i = 0; i < 4; i++) {
          const a = t * 0.18 + (i / 4) * Math.PI * 2;
          const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
          const r0 = 70, r1 = SAIL_LEN;
          g.lineStyle(10, SF.ink, 0.9); g.lineBetween(HUB.x, HUB.y, HUB.x + ux * r1, HUB.y + uy * r1);
          const quad = [
            P(HUB.x + ux * r0 + nx * 6, HUB.y + uy * r0 + ny * 6), P(HUB.x + ux * r1 + nx * 6, HUB.y + uy * r1 + ny * 6),
            P(HUB.x + ux * r1 + nx * 76, HUB.y + uy * r1 + ny * 76), P(HUB.x + ux * r0 + nx * 50, HUB.y + uy * r0 + ny * 50),
          ];
          g.fillStyle(SF.palace, 0.86); g.fillPoints(quad, true, true);
          g.lineStyle(1.5, SF.palaceLit, 0.6);
          for (let k = 1; k < 6; k++) {
            const d = r0 + ((r1 - r0) * k) / 6;
            g.lineBetween(HUB.x + ux * d + nx * 6, HUB.y + uy * d + ny * 6, HUB.x + ux * d + nx * (50 + 26 * (k / 6)), HUB.y + uy * d + ny * (50 + 26 * (k / 6)));
          }
        }
        g.fillStyle(SF.ink, 1); g.fillCircle(HUB.x, HUB.y, 50);
        breathMeter(g, HUB.x, HUB.y + 4, 26, 0.92);
      }
      // Rime dust whisked off the rim by the summit wind.
      for (let i = 0; i < 18; i++) {
        const k = ((t * 0.15 + i * 0.061) % 1);
        const x = view.x + ((i * 233 + k * 900) % (view.w + 100)) - 50;
        const y = view.y + ((i * 157) % view.h) + Math.sin(t + i) * 10;
        g.fillStyle(0xeef4ff, 0.35 * Math.sin(k * Math.PI)); g.fillRect(x, y, 2, 1);
      }
    },
  };
}

