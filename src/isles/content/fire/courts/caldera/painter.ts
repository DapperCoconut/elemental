import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import {
  type G, blob, brandSigil, dim, flagstones, glow, groundFill, lit, mixC, road, shadow, stroke,
} from '../../../../art/IsleArt';
import { CAL, basaltColumn, hexPts, lavaBubbles, samplePolyline } from './palette';
import {
  BRAZIERS, BRIDGES, CAMP, COLUMNS, H, KEEP, KILN_DOOR, LAKE, QUARRY_FACE, RIVER_A, RIVER_B, ROADS, STATUES, VENTS, W,
} from './layout';

/**
 * The Caldera Court, painted. Inside the crater on Brandmark's peak: a floor of black glass
 * and ash; two lava rivers mostly skinned over with crust, crossed on slabs of cooled rock; a
 * crusted lava lake to the east; hexagonal basalt columns standing in clumps and paving the
 * rim; the miners' forge camp in the south-west under an overseer's tower; the obsidian
 * quarry they cut for the King; Prince Basalt's keep carved straight into the north-west
 * cliff — and on the north rim, set into a buttress between two statues of the King, the
 * sealed iron door of the Kiln with its six princes' locks.
 */

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Courts' seal colours on the Kiln door, one lock per prince (hearth, powder, boilerworks, candlewick, corona, caldera). */
const SEALS = [0xff7a2f, 0xc9a24a, 0x9ab0c0, 0xf2d48a, 0xfff2a8, 0xff4a1a];

const RIVER_A_S = samplePolyline(RIVER_A, 22);
const RIVER_B_S = samplePolyline(RIVER_B, 22);

// ── Ground pieces ────────────────────────────────────────────────────

function rimBand(g: G, rng: () => number): void {
  // The crater wall: tightly packed basalt column tops, rising (darker, larger) toward the edge.
  const cell = 30;
  const bandAt = (x: number, y: number): number => {
    const dn = y, dw = x, de = W - x, ds = H - y;
    const gate = Math.abs(x - 1200) < 90 && ds < 140;
    const d = Math.min(dn, dw, de, gate ? 9999 : ds);
    return d;
  };
  for (let r = 0; r * cell * 1.5 < H + cell; r++) {
    for (let q = -2; q * cell * Math.sqrt(3) < W + cell * 2; q++) {
      const x = q * cell * Math.sqrt(3) + (r % 2) * cell * Math.sqrt(3) * 0.5;
      const y = r * cell * 1.5;
      const d = bandAt(x, y);
      const depth = d < 70 ? 1 : d < 150 ? (150 - d) / 80 : 0;
      if (depth <= 0 || (d > 100 && rng() > depth * 1.3)) continue;
      const tone = 0.15 + rng() * 0.25 - depth * 0.15;
      g.fillStyle(CAL.basaltDark, 1); g.fillPoints(hexPts(x, y + 3, cell - 1, 0, 1), true, true);
      g.fillStyle(mixC(CAL.basalt, CAL.basaltLit, tone), 1); g.fillPoints(hexPts(x, y, cell - 3, 0, 1), true, true);
      g.lineStyle(1, CAL.basaltLit, 0.25); g.strokePoints(hexPts(x, y, cell - 3, 0, 1), true, true);
      if (rng() < 0.08) { g.lineStyle(1.2, CAL.seam, 0.7); g.lineBetween(x - 8, y - 4, x + 6, y + 5); }
    }
  }
}

function river(g: G, pts: Pt[], rng: () => number): void {
  stroke(g, pts, 104, 0x1a0e0a);
  stroke(g, pts, 88, CAL.crust);
  stroke(g, pts, 60, 0x9a2e0a);
  stroke(g, pts, 26, 0xe85a18);
  // Crust skin: dark plates jostling over most of the surface, so only the seams glow.
  for (const p of samplePolyline(pts, 14)) {
    if (rng() < 0.35) continue;
    const w = 18 + rng() * 26, h = 10 + rng() * 14;
    g.fillStyle(rng() < 0.5 ? CAL.crust : CAL.crustMid, 0.92);
    g.fillEllipse(p.x + (rng() - 0.5) * 40, p.y + (rng() - 0.5) * 30, w, h);
  }
  // Banks of glassy rubble.
  for (const p of samplePolyline(pts, 30)) {
    for (const side of [-1, 1]) {
      g.fillStyle(rng() < 0.5 ? CAL.obsidianLit : CAL.basaltMid, 0.8);
      g.fillCircle(p.x + side * (44 + rng() * 6) * (rng() < 0.5 ? 1 : 0.2), p.y + side * (40 + rng() * 8), 3 + rng() * 4);
    }
  }
}

function bridge(g: G, b: { x: number; y: number; a: number }, rng: () => number): void {
  // A slab of rock, cooled hard across the flow and dressed with basalt caps.
  const len = 150, wid = 70;
  const ux = Math.cos(b.a), uy = Math.sin(b.a), nx = -uy, ny = ux;
  const corner = (s: number, t: number): Phaser.Geom.Point => new Phaser.Geom.Point(b.x + ux * s * len / 2 + nx * t * wid / 2, b.y + uy * s * len / 2 + ny * t * wid / 2);
  g.fillStyle(0x000000, 0.5); g.fillPoints([corner(-1.05, -1.2), corner(1.05, -1.2), corner(1.05, 1.25), corner(-1.05, 1.25)], true, true);
  g.fillStyle(CAL.basaltDark, 1); g.fillPoints([corner(-1, -1), corner(1, -1), corner(1, 1.1), corner(-1, 1.1)], true, true);
  g.fillStyle(CAL.basalt, 1); g.fillPoints([corner(-0.97, -0.92), corner(0.97, -0.92), corner(0.97, 0.92), corner(-0.97, 0.92)], true, true);
  // Hex caps paving the deck.
  for (let s = -0.8; s <= 0.81; s += 0.27) {
    for (const t of [-0.45, 0.45]) {
      const c = corner(s + (t > 0 ? 0.13 : 0), t);
      g.fillStyle(mixC(CAL.basaltMid, CAL.basaltLit, rng() * 0.3), 1);
      g.fillPoints(hexPts(c.x, c.y, 15, b.a, 1), true, true);
    }
  }
  // Lava light along the edges where the slab meets the flow.
  g.lineStyle(3, CAL.lava, 0.6);
  g.lineBetween(corner(-1, -1).x, corner(-1, -1).y, corner(1, -1).x, corner(1, -1).y);
  g.lineBetween(corner(-1, 1.1).x, corner(-1, 1.1).y, corner(1, 1.1).x, corner(1, 1.1).y);
}

function lake(g: G, rng: () => number): void {
  const cx = LAKE.x + LAKE.w / 2, cy = LAKE.y + LAKE.h / 2;
  blob(g, cx, cy, LAKE.w * 0.6, LAKE.h * 0.6, 0x1a0e0a, 1, rng, 14);
  blob(g, cx, cy, LAKE.w * 0.54, LAKE.h * 0.54, CAL.crust, 1, rng, 14);
  blob(g, cx, cy, LAKE.w * 0.48, LAKE.h * 0.48, 0xa8340c, 1, rng, 13);
  blob(g, cx, cy, LAKE.w * 0.36, LAKE.h * 0.36, 0xe0561a, 1, rng, 12);
  blob(g, cx + 20, cy - 10, LAKE.w * 0.2, LAKE.h * 0.18, CAL.lavaLit, 0.8, rng, 10);
  // Crust rafts adrift on it.
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * LAKE.w * 0.44;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.95;
    const pts: Phaser.Geom.Point[] = [];
    const s = 10 + rng() * 22;
    for (let k = 0; k < 6; k++) { const aa = (k / 6) * Math.PI * 2; pts.push(new Phaser.Geom.Point(x + Math.cos(aa) * s * (0.7 + rng() * 0.4), y + Math.sin(aa) * s * 0.55 * (0.7 + rng() * 0.4))); }
    g.fillStyle(rng() < 0.6 ? CAL.crust : CAL.crustMid, 0.95); g.fillPoints(pts, true, true);
    g.lineStyle(1, CAL.lavaHot, 0.5); g.strokePoints(pts, true, true);
  }
  // Ferro's jetty: basalt columns stepping out into the lake.
  for (let i = 0; i < 4; i++) {
    const x = LAKE.x - 20 + i * 26, y = 905;
    g.fillStyle(CAL.basaltDark, 1); g.fillPoints(hexPts(x, y + 4, 17, 0, 0.7), true, true);
    g.fillStyle(mixC(CAL.basaltMid, CAL.basaltLit, i * 0.08), 1); g.fillPoints(hexPts(x, y, 16, 0, 0.7), true, true);
  }
}

function quarryFloor(g: G, rng: () => number): void {
  // Terraced cuts in black glass, each step's lip catching the light.
  const r: Rect = { x: 80, y: 860, w: 480, h: 250 };
  g.fillStyle(0x0d0b11, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let k = 0; k < 4; k++) {
    const y = r.y + 12 + k * 58;
    const x0 = r.x + k * 18, x1 = r.x + r.w - 40 - k * 30;
    g.fillStyle(mixC(CAL.obsidian, CAL.obsidianLit, 0.15 + k * 0.08), 1); g.fillRect(x0, y, x1 - x0, 50);
    g.lineStyle(2, CAL.glassGleam, 0.35); g.lineBetween(x0, y, x1, y);
    for (let i = 0; i < 9; i++) {
      const cx = x0 + rng() * (x1 - x0), cy = y + 10 + rng() * 34;
      g.lineStyle(1, CAL.glassGleam, 0.2 + rng() * 0.25);
      g.beginPath(); g.arc(cx, cy, 5 + rng() * 9, Math.PI * 1.1, Math.PI * 1.8, false); g.strokePath();
    }
  }
  // Chalk lines where the next blocks will be cut.
  g.lineStyle(1, 0xe8dcc8, 0.25);
  for (let i = 0; i < 5; i++) { const x = 140 + i * 80; g.strokeRect(x, 1000 + (i % 2) * 30, 60, 36); }
}

function campGround(g: G, rng: () => number): void {
  blob(g, 690, 1480, 420, 170, 0x2b2524, 0.9, rng, 16);
  blob(g, 690, 1480, 340, 120, 0x352d2a, 0.6, rng, 14);
  // Ore-cart rail from the quarry bridge into the camp.
  const rail: Pt[] = [{ x: 545, y: 1240 }, { x: 600, y: 1345 }, { x: 760, y: 1390 }, { x: 980, y: 1400 }];
  for (const off of [-6, 6]) {
    g.lineStyle(2, 0x5a5250, 1);
    g.beginPath(); g.moveTo(rail[0].x + off, rail[0].y); for (const p of rail) g.lineTo(p.x + off, p.y); g.strokePath();
  }
  for (const p of samplePolyline(rail, 14)) { g.fillStyle(CAL.wood, 1); g.fillRect(p.x - 10, p.y - 2, 20, 4); }
  // Slag spills and dropped picks.
  for (let i = 0; i < 30; i++) {
    g.fillStyle(rng() < 0.5 ? CAL.crust : 0x1a1418, 0.7);
    g.fillEllipse(400 + rng() * 620, 1380 + rng() * 240, 6 + rng() * 12, 3 + rng() * 5);
  }
}

function kilnApproach(g: G, rng: () => number): void {
  // A forecourt of brand-stamped flags before the door.
  flagstones(g, { x: 1010, y: 322, w: 380, h: 110 }, 34, 0x2a2228, 0x120d10, rng);
  for (let i = 0; i < 5; i++) brandSigil(g, 1060 + i * 70, 380, 9, 0x6a2a14, 0.7);
  // The slag that runs out from under the door.
  g.fillStyle(CAL.crust, 1); g.fillRect(1160, 322, 80, 18);
  g.fillStyle(CAL.lava, 0.8); g.fillRect(1170, 324, 60, 6);
}

// ── Set pieces ───────────────────────────────────────────────────────

function kilnDoor(g: G): void {
  const x = KILN_DOOR.x, y = KILN_DOOR.y;
  // The buttress: a wall of basalt columns, tallest at the middle.
  for (let i = -8; i <= 8; i++) {
    const cx = x + i * 30;
    const h = 330 - Math.abs(i) * 6 + ((i * 37) % 11);
    basaltColumn(g, cx, y - 4 + Math.abs(i) * 1.5, 17, h, 0.05 + (Math.abs(i) % 3) * 0.05, 0);
  }
  shadow(g, x, y + 6, 360, 30, 0.5);
  // The arch: black iron frame in a pointed arch.
  const dw = 220, dh = 260;
  g.fillStyle(0x0a0709, 1);
  g.fillRect(x - dw / 2 - 22, y - dh, dw + 44, dh);
  g.fillTriangle(x - dw / 2 - 22, y - dh, x + dw / 2 + 22, y - dh, x, y - dh - 70);
  g.fillStyle(0x1c1416, 1);
  g.fillRect(x - dw / 2, y - dh + 6, dw, dh - 6);
  g.fillTriangle(x - dw / 2, y - dh + 6, x + dw / 2, y - dh + 6, x, y - dh - 52);
  // Riveted iron leaves, split down the middle.
  g.fillStyle(0x2e2426, 1);
  g.fillRect(x - dw / 2 + 8, y - dh + 14, dw / 2 - 12, dh - 14);
  g.fillRect(x + 4, y - dh + 14, dw / 2 - 12, dh - 14);
  g.lineStyle(3, 0x0a0709, 1); g.lineBetween(x, y - dh - 50, x, y);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 6; c++) {
      g.fillStyle(0x5a4a44, 1);
      g.fillCircle(x - dw / 2 + 18 + c * 18, y - dh + 30 + r * 26, 2.2);
      g.fillCircle(x + 18 + c * 17, y - dh + 30 + r * 26, 2.2);
    }
  }
  for (let k = 0; k < 4; k++) { g.fillStyle(0x15100f, 1); g.fillRect(x - dw / 2 + 8, y - dh + 60 + k * 56, dw - 16, 6); }
  // The great brand, half on each leaf.
  brandSigil(g, x, y - dh * 0.55, 46, 0x5a1a0a, 1);
  // The chains: two diagonals crossing over the door, six locks hanging where they meet the frame.
  g.lineStyle(6, 0x2a2224, 1);
  g.lineBetween(x - dw / 2 - 10, y - dh + 10, x + dw / 2 + 10, y - 40);
  g.lineBetween(x + dw / 2 + 10, y - dh + 10, x - dw / 2 - 10, y - 40);
  g.lineStyle(2, 0x6a5a54, 1);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const ax = x - dw / 2 - 10 + (dw + 20) * t, ay = y - dh + 10 + (dh - 50) * t;
    const bx = x + dw / 2 + 10 - (dw + 20) * t;
    g.strokeEllipse(ax, ay, 10, 6); g.strokeEllipse(bx, ay, 10, 6);
  }
  // Pointed lintel ornaments: a crown of spikes over the arch.
  for (let i = -3; i <= 3; i++) {
    const sx = x + i * 30, sy = y - dh - 60 + Math.abs(i) * 14;
    g.fillStyle(0x0a0709, 1); g.fillTriangle(sx - 7, sy + 10, sx + 7, sy + 10, sx, sy - 22);
  }
  // Lock plates: six iron padlocks in a row at the chains' crossing (painted dark; lit in animate).
  for (let i = 0; i < 6; i++) {
    const lx = x - 75 + i * 30, ly = y - dh * 0.24;
    g.fillStyle(0x0a0709, 1); g.fillRoundedRect(lx - 11, ly - 6, 22, 22, 4);
    g.lineStyle(3, 0x0a0709, 1); g.beginPath(); g.arc(lx, ly - 6, 7, Math.PI, 0, false); g.strokePath();
    g.fillStyle(dim(SEALS[i], 0.55), 1); g.fillRoundedRect(lx - 9, ly - 4, 18, 18, 3);
  }
  // Threshold step.
  g.fillStyle(CAL.basaltDark, 1); g.fillRect(x - dw / 2 - 30, y - 6, dw + 60, 10);
  g.fillStyle(CAL.basaltMid, 1); g.fillRect(x - dw / 2 - 30, y - 8, dw + 60, 4);
}

function statue(g: G, x: number, y: number, flip: number): void {
  // King Ashgrave, carved in basalt: robed, crowned, holding the branding iron out over the forecourt.
  shadow(g, x, y + 4, 110, 26, 0.45);
  g.fillStyle(CAL.basaltDark, 1); g.fillRect(x - 42, y - 40, 84, 40);
  g.fillStyle(CAL.basaltMid, 1); g.fillRect(x - 40, y - 42, 80, 6);
  g.fillStyle(CAL.basalt, 1);
  g.fillTriangle(x - 34, y - 40, x + 34, y - 40, x, y - 190);
  g.fillStyle(dim(CAL.basalt, 0.2), 1); g.fillTriangle(x, y - 40, x + 34, y - 40, x, y - 190);
  g.fillStyle(CAL.basaltMid, 1); g.fillCircle(x, y - 196, 22);
  // Crown.
  for (let i = -2; i <= 2; i++) { g.fillStyle(0x2a2226, 1); g.fillTriangle(x + i * 8 - 5, y - 212, x + i * 8 + 5, y - 212, x + i * 8, y - 232 + Math.abs(i) * 4); }
  // Eyes: two lava-lit slits.
  g.fillStyle(CAL.lava, 0.9); g.fillRect(x - 10, y - 200, 7, 2); g.fillRect(x + 3, y - 200, 7, 2);
  // The branding iron, held out toward the door.
  g.lineStyle(5, 0x2a2224, 1); g.lineBetween(x + flip * 10, y - 140, x + flip * 70, y - 170);
  brandSigil(g, x + flip * 78, y - 174, 11, 0x2a2224, 1);
}

function brazier(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 12);
  g.fillStyle(0x1a1416, 1); g.fillTriangle(x - 16, y, x + 16, y, x, y - 30);
  g.fillStyle(0x2e2426, 1); g.fillRect(x - 3, y - 44, 6, 18);
  g.fillStyle(0x2e2426, 1); g.fillEllipse(x, y - 46, 46, 16);
  g.fillStyle(CAL.crust, 1); g.fillEllipse(x, y - 48, 36, 10);
}

function keep(g: G, rng: () => number): void {
  const x = KEEP.x, y = KEEP.y;
  // The cliff it is cut from: a wall of tall columns, broken off unevenly at the top.
  for (let i = -9; i <= 9; i++) {
    const cx = x + i * 28;
    const h = 260 + ((i * 53) % 70) + (Math.abs(i) < 4 ? 40 : 0);
    basaltColumn(g, cx, y - 6, 16, h, 0.04 + ((i + 9) % 3) * 0.05, 0);
  }
  shadow(g, x, y + 4, 520, 26, 0.45);
  // Façade carved into the columns: a smoothed panel, terraces of windows, a great door.
  g.fillStyle(0x26242c, 1); g.fillRect(x - 160, y - 230, 320, 230);
  g.fillStyle(0x302e37, 1); g.fillRect(x - 150, y - 222, 300, 222);
  // Hex-framed windows in three rows, burning orange.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && (c === 1 || c === 2 || c === 3)) continue;
      const wx = x - 110 + c * 55, wy = y - 190 + r * 56;
      g.fillStyle(0x0a080c, 1); g.fillPoints(hexPts(wx, wy, 15, 0, 1), true, true);
      g.fillStyle(CAL.lavaLit, 0.85); g.fillPoints(hexPts(wx, wy, 10, 0, 1), true, true);
      g.fillStyle(CAL.lavaLit, 0.1); g.fillCircle(wx, wy, 24);
    }
  }
  // The door: a tall hexagonal mouth with a slab rolled half aside.
  g.fillStyle(0x0a080c, 1); g.fillPoints(hexPts(x, y - 60, 58, Math.PI / 6, 1.05), true, true);
  g.fillStyle(0x2a1006, 1); g.fillPoints(hexPts(x, y - 56, 48, Math.PI / 6, 1.05), true, true);
  g.fillStyle(CAL.lava, 0.35); g.fillPoints(hexPts(x, y - 50, 32, Math.PI / 6, 1.05), true, true);
  g.fillStyle(CAL.basaltMid, 1); g.fillCircle(x + 56, y - 46, 40);
  g.fillStyle(CAL.basaltLit, 1); g.fillCircle(x + 52, y - 50, 32);
  g.fillStyle(CAL.basaltMid, 1); g.fillPoints(hexPts(x + 52, y - 50, 18, 0, 1), true, true);
  // Steps.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(mixC(CAL.basaltDark, CAL.basaltMid, k * 0.3), 1);
    g.fillRect(x - 80 + k * 10, y - 4 + k * 0 - k * 0, 160 - k * 20, 6);
  }
  g.fillStyle(CAL.basaltMid, 1); g.fillRect(x - 90, y - 2, 180, 6);
  // Banners: grey, with the heir's hexagon inside the King's broken ring.
  for (const bx of [x - 135, x + 135]) {
    g.fillStyle(0x1a1416, 1); g.fillRect(bx - 2, y - 200, 4, 200);
    g.fillStyle(0x45434d, 1); g.fillRect(bx - 18, y - 196, 36, 90);
    g.fillTriangle(bx - 18, y - 106, bx + 18, y - 106, bx, y - 90);
    g.lineStyle(2, CAL.lava, 0.9); g.strokePoints(hexPts(bx, y - 150, 9, 0, 1), true, true);
    g.beginPath(); g.arc(bx, y - 150, 14, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
  }
  // Rubble at the cliff foot.
  for (let i = 0; i < 12; i++) {
    g.fillStyle(rng() < 0.5 ? CAL.basaltMid : CAL.basalt, 1);
    g.fillCircle(x - 250 + rng() * 500, y - 2 + rng() * 6, 3 + rng() * 5);
  }
}

function quarryFace(g: G, rng: () => number): void {
  const x = QUARRY_FACE.x, y = QUARRY_FACE.y;
  // A sheer face of black glass, cut in steps, scaffolding lashed to it.
  g.fillStyle(0x08070b, 1); g.fillRect(x - 175, y - 330, 370, 330);
  for (let k = 0; k < 5; k++) {
    const yy = y - 330 + k * 66;
    g.fillStyle(mixC(0x0d0b12, CAL.obsidianLit, 0.1 + (k % 2) * 0.1), 1);
    g.fillRect(x - 170 + k * 6, yy, 360 - k * 10, 62);
    // Conchoidal scoops — the curved fractures of struck obsidian.
    for (let i = 0; i < 6; i++) {
      const cx = x - 150 + rng() * 320, cy = yy + 14 + rng() * 40;
      g.lineStyle(2, CAL.glassGleam, 0.3 + rng() * 0.3);
      g.beginPath(); g.arc(cx, cy, 10 + rng() * 14, Math.PI * 1.05, Math.PI * 1.75, false); g.strokePath();
      g.lineStyle(1, 0x6a4c9c, 0.35);
      g.beginPath(); g.arc(cx + 2, cy + 3, 8 + rng() * 10, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
    }
  }
  // Scaffold.
  g.lineStyle(4, CAL.wood, 1);
  for (const sx of [x - 120, x - 20, x + 90]) g.lineBetween(sx, y, sx, y - 250);
  for (let k = 0; k < 4; k++) g.lineBetween(x - 130, y - 40 - k * 62, x + 100, y - 40 - k * 62);
  g.lineStyle(2, 0x3a281a, 1);
  g.lineBetween(x - 120, y - 40, x - 20, y - 102); g.lineBetween(x - 20, y - 102, x + 90, y - 164);
  // A cut block hanging from a crane arm.
  g.lineStyle(3, CAL.wood, 1); g.lineBetween(x + 150, y, x + 150, y - 280); g.lineBetween(x + 150, y - 280, x + 60, y - 280);
  g.lineStyle(1.5, 0x5a5250, 1); g.lineBetween(x + 70, y - 280, x + 70, y - 200);
  g.fillStyle(0x0a080c, 1); g.fillRect(x + 50, y - 200, 40, 26);
  g.lineStyle(1, CAL.glassGleam, 0.7); g.lineBetween(x + 54, y - 196, x + 66, y - 178);
}

function columnCluster(g: G, x: number, y: number, s: number, rng: () => number): void {
  const n = 4 + Math.floor(rng() * 4);
  const parts: { x: number; y: number; h: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = rng() * 26 * s;
    parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: (40 + rng() * 110) * s, r: (13 + rng() * 6) * s });
  }
  parts.sort((a, b) => a.y - b.y);
  for (const p of parts) basaltColumn(g, p.x, p.y, p.r, p.h, rng() * 0.35, rng() < 0.15 ? 0.45 : 0);
}

function vent(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 90 * s, 28 * s);
  g.fillStyle(CAL.basaltDark, 1); g.fillEllipse(x, y, 84 * s, 40 * s);
  g.fillStyle(CAL.basalt, 1);
  g.fillTriangle(x - 40 * s, y, x + 40 * s, y, x + 14 * s, y - 34 * s);
  g.fillTriangle(x - 40 * s, y, x - 14 * s, y - 34 * s, x + 14 * s, y - 34 * s);
  g.fillStyle(CAL.sulphurDark, 1); g.fillEllipse(x, y - 34 * s, 34 * s, 12 * s);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.fillStyle(rng() < 0.6 ? CAL.sulphur : lit(CAL.sulphur, 0.3), 0.9);
    g.fillEllipse(x + Math.cos(a) * 16 * s, y - 34 * s + Math.sin(a) * 6 * s, 7 * s, 4 * s);
  }
  g.fillStyle(0x140a06, 1); g.fillEllipse(x, y - 34 * s, 16 * s, 6 * s);
  // Yellow streaks down the cone.
  g.lineStyle(2, CAL.sulphur, 0.5);
  for (let i = 0; i < 4; i++) { const ox = (i - 1.5) * 12 * s; g.lineBetween(x + ox * 0.4, y - 30 * s, x + ox, y - 4 * s); }
}

function stall(g: G, x: number, y: number): void {
  // Mother Scoria's commissary: a lean-to of scavenged iron sheets, goods hung under it.
  shadow(g, x, y + 3, 170, 22);
  g.fillStyle(CAL.wood, 1); g.fillRect(x - 70, y - 90, 6, 90); g.fillRect(x + 64, y - 90, 6, 90);
  g.fillStyle(0x3a3436, 1);
  g.fillTriangle(x - 86, y - 84, x + 86, y - 84, x + 86, y - 110);
  g.fillTriangle(x - 86, y - 84, x - 86, y - 102, x + 86, y - 110);
  g.lineStyle(1, 0x5a5250, 1); for (let i = 0; i < 6; i++) g.lineBetween(x - 80 + i * 30, y - 86, x - 80 + i * 30, y - 104);
  // Counter.
  g.fillStyle(dim(CAL.wood, 0.3), 1); g.fillRect(x - 66, y - 34, 132, 34);
  g.fillStyle(lit(CAL.wood, 0.15), 1); g.fillRect(x - 70, y - 38, 140, 6);
  // Wares on the counter: a crust brooch, a pick, a ring, a yellow whistle.
  g.fillStyle(CAL.crustMid, 1); g.fillCircle(x - 44, y - 44, 7);
  g.lineStyle(3, 0x8a7a6a, 1); g.lineBetween(x - 20, y - 40, x - 6, y - 58); g.lineStyle(4, 0x4a4a4e, 1); g.lineBetween(x - 14, y - 60, x + 2, y - 52);
  g.lineStyle(3, CAL.lavaLit, 1); g.strokeCircle(x + 22, y - 46, 6);
  g.fillStyle(CAL.sulphur, 1); g.fillRoundedRect(x + 38, y - 50, 18, 7, 3);
  // Hanging goods: buckets, a lantern, a string of dried loach.
  g.lineStyle(1, 0x2a2224, 1); g.lineBetween(x - 50, y - 84, x - 50, y - 70); g.lineBetween(x + 40, y - 84, x + 40, y - 72);
  g.fillStyle(0x5a5250, 1); g.fillRect(x - 58, y - 70, 16, 14);
  g.fillStyle(CAL.lavaLit, 0.9); g.fillRect(x + 35, y - 72, 10, 12);
  for (let i = 0; i < 4; i++) { g.fillStyle(0x8a6a4a, 1); g.fillEllipse(x - 20 + i * 12, y - 70 + (i % 2) * 3, 6, 12); }
}

function forge(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 150, 22);
  // Stone hearth with a chimney hood.
  g.fillStyle(CAL.basaltDark, 1); g.fillRect(x - 56, y - 50, 80, 50);
  g.fillStyle(CAL.basalt, 1); g.fillRect(x - 52, y - 48, 72, 46);
  g.fillStyle(0x160b08, 1); g.fillRect(x - 40, y - 34, 48, 22);
  g.fillStyle(CAL.basaltMid, 1); g.fillTriangle(x - 60, y - 50, x + 28, y - 50, x - 16, y - 92);
  g.fillRect(x - 24, y - 140, 16, 52);
  // Anvil and bellows.
  g.fillStyle(0x2a2626, 1); g.fillRect(x + 34, y - 22, 10, 22); g.fillRect(x + 24, y - 30, 34, 10);
  g.fillTriangle(x + 58, y - 30, x + 58, y - 22, x + 70, y - 28);
  g.fillStyle(CAL.hide, 1); g.fillEllipse(x - 70, y - 22, 28, 18);
  g.fillStyle(CAL.wood, 1); g.fillRect(x - 84, y - 24, 10, 4);
  // A bucket of quench water.
  g.fillStyle(0x5a5250, 1); g.fillRect(x + 4, y - 14, 16, 14);
  g.fillStyle(CAL.rain, 1); g.fillRect(x + 6, y - 14, 12, 3);
}

function trough(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 100, 14);
  g.fillStyle(CAL.basaltDark, 1); g.fillRect(x - 44, y - 22, 88, 22);
  g.fillStyle(CAL.basalt, 1); g.fillRect(x - 42, y - 24, 84, 6);
  g.fillStyle(0x3a3436, 1); g.fillRect(x - 38, y - 20, 76, 6);
  // Ash in the bottom (it used to be rain).
  g.fillStyle(CAL.ash, 0.7); g.fillEllipse(x, y - 17, 70, 4);
}

function tower(g: G, x: number, y: number): void {
  // The overseer's watch-tower: four stilts, a hut on top, a bell and a lantern.
  shadow(g, x, y + 3, 70, 16);
  g.lineStyle(4, CAL.wood, 1);
  g.lineBetween(x - 20, y, x - 14, y - 120); g.lineBetween(x + 20, y, x + 14, y - 120);
  g.lineStyle(2, dim(CAL.wood, 0.3), 1);
  g.lineBetween(x - 18, y - 20, x + 17, y - 70); g.lineBetween(x + 18, y - 20, x - 17, y - 70);
  g.fillStyle(dim(CAL.wood, 0.2), 1); g.fillRect(x - 26, y - 150, 52, 32);
  g.fillStyle(0x3a3436, 1); g.fillTriangle(x - 32, y - 150, x + 32, y - 150, x, y - 172);
  g.fillStyle(0x0a080c, 1); g.fillRect(x - 14, y - 144, 28, 12);
  g.fillStyle(0x8a7a3a, 1); g.fillCircle(x + 30, y - 140, 6);
  brandSigil(g, x, y - 126, 6, 0xff7a2f, 0.9);
}

function tallyBoard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 10);
  g.fillStyle(CAL.wood, 1); g.fillRect(x - 24, y - 60, 4, 60); g.fillRect(x + 20, y - 60, 4, 60);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 28, y - 62, 56, 38);
  g.lineStyle(1.5, 0xe8dcc8, 0.8);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
    const tx = x - 22 + i * 5 + (i >= 5 ? 3 : 0), ty = y - 56 + r * 11;
    g.lineBetween(tx, ty, tx, ty + 7);
  }
  g.lineStyle(2, 0x6a5a54, 1); g.lineBetween(x - 28, y - 30, x + 28, y - 50);
}

function tent(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 110, 18);
  const c = mixC(CAL.hide, 0x4a3a2e, rng() * 0.5);
  g.fillStyle(dim(c, 0.4), 1); g.fillTriangle(x - 52, y, x + 52, y, x, y - 64);
  g.fillStyle(c, 1); g.fillTriangle(x - 46, y, x + 30, y, x - 6, y - 60);
  g.fillStyle(0x140d0a, 1); g.fillTriangle(x - 8, y, x + 12, y, x + 2, y - 30);
  g.lineStyle(1, dim(c, 0.5), 1); for (let i = 1; i < 4; i++) g.lineBetween(x - 46 + i * 10, y, x - 6, y - 60);
  // A Tithe Fire's iron pot by the flap — every household keeps one.
  g.fillStyle(0x1a1416, 1); g.fillEllipse(x + 40, y - 6, 16, 10);
}

function blockStack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 76, 14);
  const blocks: [number, number][] = [[-20, 0], [10, 0], [-6, -20]];
  for (const [ox, oy] of blocks) {
    g.fillStyle(0x08070b, 1); g.fillRect(x + ox - 14, y + oy - 20, 30, 20);
    g.fillStyle(CAL.obsidianLit, 1); g.fillRect(x + ox - 14, y + oy - 24, 30, 5);
    g.lineStyle(1, CAL.glassGleam, 0.6); g.lineBetween(x + ox - 10, y + oy - 16, x + ox - 2, y + oy - 4);
  }
}

function cart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 56, 12);
  g.fillStyle(0x3a3436, 1); g.fillRect(x - 22, y - 26, 44, 18);
  g.fillStyle(0x0a080c, 1); g.fillEllipse(x, y - 28, 38, 10);
  g.fillStyle(CAL.obsidianLit, 1); g.fillTriangle(x - 10, y - 30, x + 4, y - 30, x - 2, y - 40);
  g.fillStyle(0x1a1416, 1); g.fillCircle(x - 14, y - 6, 6); g.fillCircle(x + 14, y - 6, 6);
}

function snag(g: G, x: number, y: number, rng: () => number): void {
  // A tree that grew on the outer slope once and fell in, charred to glass at the tips.
  shadow(g, x, y, 40, 10);
  g.lineStyle(7, 0x1a1214, 1); g.lineBetween(x, y, x + (rng() - 0.5) * 10, y - 70);
  g.lineStyle(3, 0x1a1214, 1);
  g.lineBetween(x, y - 40, x - 22, y - 62); g.lineBetween(x + 2, y - 54, x + 20, y - 72);
  g.fillStyle(CAL.lava, 0.7); g.fillCircle(x - 22, y - 62, 2); g.fillCircle(x + 20, y - 72, 2);
}

// ── The painter ──────────────────────────────────────────────────────

export function makeCalderaPainter(): AreaPainter {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  const add = (x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void): void => {
    pieces.push({ x, y, w, h, draw });
  };

  add(KILN_DOOR.x, KILN_DOOR.y, 560, 420, (g) => kilnDoor(g));
  STATUES.forEach((s, i) => add(s.x, s.y, 120, 250, (g) => statue(g, s.x, s.y, i === 0 ? 1 : -1)));
  BRAZIERS.forEach((b) => add(b.x, b.y, 50, 60, (g) => brazier(g, b.x, b.y)));
  add(KEEP.x, KEEP.y, 560, 420, (g, rng) => keep(g, rng));
  add(QUARRY_FACE.x, QUARRY_FACE.y, 380, 340, (g, rng) => quarryFace(g, rng));
  for (const c of COLUMNS) add(c.x, c.y + 20 * c.s, 120 * c.s, 200 * c.s, (g, rng) => columnCluster(g, c.x, c.y, c.s, rng));
  for (const v of VENTS) add(v.x, v.y, 100 * v.s, 50 * v.s, (g, rng) => vent(g, v.x, v.y, v.s, rng));
  add(CAMP.stall.x, CAMP.stall.y, 180, 120, (g) => stall(g, CAMP.stall.x, CAMP.stall.y));
  add(CAMP.forge.x, CAMP.forge.y, 170, 150, (g) => forge(g, CAMP.forge.x, CAMP.forge.y));
  add(CAMP.trough.x, CAMP.trough.y, 100, 30, (g) => trough(g, CAMP.trough.x, CAMP.trough.y));
  add(CAMP.tower.x, CAMP.tower.y, 80, 180, (g) => tower(g, CAMP.tower.x, CAMP.tower.y));
  add(CAMP.board.x, CAMP.board.y, 64, 70, (g) => tallyBoard(g, CAMP.board.x, CAMP.board.y));
  for (const t of CAMP.tents) add(t.x, t.y, 110, 70, (g, rng) => tent(g, t.x, t.y, rng));
  for (const s of CAMP.stacks) add(s.x, s.y, 80, 50, (g) => blockStack(g, s.x, s.y));
  add(CAMP.cart.x, CAMP.cart.y, 60, 44, (g) => cart(g, CAMP.cart.x, CAMP.cart.y));
  for (const p of [{ x: 120, y: 1620 }, { x: 2290, y: 1100 }, { x: 2150, y: 880 + 340 }, { x: 640, y: 1700 }, { x: 1700, y: 200 }]) {
    add(p.x, p.y, 50, 80, (g, rng) => snag(g, p.x, p.y, rng));
  }

  return {
    ground(g, rng) {
      groundFill(g, { x: 0, y: 0, w: W, h: H }, CAL.obsidian, 0x231d2a, 0x6a5f78, rng, 1.1);
      // Ash drifts and black-glass sheets.
      for (let i = 0; i < 70; i++) blob(g, rng() * W, rng() * H, 60 + rng() * 140, 24 + rng() * 60, 0x2e282c, 0.35, rng);
      for (let i = 0; i < 50; i++) {
        const x = rng() * W, y = rng() * H;
        blob(g, x, y, 40 + rng() * 80, 18 + rng() * 34, CAL.obsidianLit, 0.25, rng);
        g.lineStyle(1, CAL.glassGleam, 0.25);
        g.beginPath(); g.arc(x, y, 12 + rng() * 20, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
      }
      // Hairline lava cracks across the floor (pulsed in animate).
      for (let i = 0; i < 40; i++) {
        let x = 100 + rng() * (W - 200), y = 180 + rng() * (H - 300);
        let a = rng() * Math.PI * 2;
        g.lineStyle(1.5, CAL.seam, 0.7);
        for (let s = 0; s < 4; s++) {
          const nx = x + Math.cos(a) * (14 + rng() * 18), ny = y + Math.sin(a) * (10 + rng() * 12);
          g.lineBetween(x, y, nx, ny); x = nx; y = ny; a += (rng() - 0.5) * 1.2;
        }
      }
      // Sulphur stains round the vents.
      for (const v of VENTS) {
        blob(g, v.x, v.y + 6, 110 * v.s, 50 * v.s, CAL.sulphurDark, 0.35, rng);
        blob(g, v.x, v.y + 4, 60 * v.s, 26 * v.s, CAL.sulphur, 0.22, rng);
      }
      quarryFloor(g, rng);
      campGround(g, rng);
      river(g, RIVER_A, rng);
      river(g, RIVER_B, rng);
      lake(g, rng);
      for (const r of ROADS) road(g, r.pts, r.w, 0x2b2530, 0x0d0b10, 0x463d52, rng);
      for (const b of BRIDGES) bridge(g, b, rng);
      kilnApproach(g, rng);
      rimBand(g, rng);
      // The gate south: two broken column stumps either side of the road down to the Hearth.
      basaltColumn(g, 1110, H - 40, 20, 50, 0.2, 0);
      basaltColumn(g, 1290, H - 40, 20, 56, 0.2, 0);
    },

    pieces,

    animate(g, t, view) {
      // Lava pulsing down the rivers: bright beads riding the flow.
      for (const samples of [RIVER_A_S, RIVER_B_S]) {
        for (let i = 0; i < samples.length; i++) {
          const p = samples[i];
          if (!inView(view, p.x, p.y, 60)) continue;
          const k = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.55);
          if (k < 0.55) continue;
          g.fillStyle(CAL.lavaHot, (k - 0.55) * 1.3);
          g.fillEllipse(p.x + Math.sin(i * 1.7) * 8, p.y + Math.cos(i * 2.3) * 6, 10, 5);
        }
      }
      // The lake breathes: a slow glow and bubbles.
      const lcx = LAKE.x + LAKE.w / 2, lcy = LAKE.y + LAKE.h / 2;
      if (inView(view, lcx, lcy, 300)) {
        glow(g, lcx, lcy, 200 + Math.sin(t * 0.8) * 20, CAL.lavaLit, 0.03, 4);
        for (let i = 0; i < 9; i++) lavaBubbles(g, lcx + Math.cos(i * 2.4) * 140, lcy + Math.sin(i * 1.9) * 130, 30, 24, t, i, 3);
      }
      // Vent throats.
      for (const v of VENTS) {
        if (!inView(view, v.x, v.y, 80)) continue;
        const k = 0.5 + 0.5 * Math.sin(t * 1.6 + v.x);
        g.fillStyle(CAL.lava, 0.3 + k * 0.4); g.fillEllipse(v.x, v.y - 34 * v.s, 10 * v.s, 4 * v.s);
      }
      // Forge mouth and braziers.
      const f = CAMP.forge;
      if (inView(view, f.x, f.y, 120)) {
        const k = 0.6 + Math.sin(t * 9) * 0.2 + Math.sin(t * 13) * 0.1;
        g.fillStyle(CAL.lava, k); g.fillRect(f.x - 38, f.y - 32, 44, 18);
        g.fillStyle(CAL.lavaHot, k * 0.8); g.fillRect(f.x - 30, f.y - 26, 28, 8);
        glow(g, f.x - 16, f.y - 24, 60, CAL.lavaLit, 0.04, 3);
      }
      for (const b of BRAZIERS) {
        if (!inView(view, b.x, b.y, 100)) continue;
        for (let i = 0; i < 5; i++) {
          const h = 18 + Math.sin(t * 8 + i * 1.7) * 6;
          const ox = (i - 2) * 6;
          g.fillStyle(i % 2 ? CAL.lavaLit : CAL.lava, 0.9);
          g.fillTriangle(b.x + ox - 5, b.y - 48, b.x + ox + 5, b.y - 48, b.x + ox + Math.sin(t * 5 + i) * 3, b.y - 48 - h);
        }
        glow(g, b.x, b.y - 56, 50, CAL.lavaLit, 0.04, 3);
      }
      // The Kiln door: the brand smoulders and the six locks glow in their princes' colours.
      const d = KILN_DOOR;
      if (inView(view, d.x, d.y - 150, 340)) {
        const k = 0.5 + 0.5 * Math.sin(t * 1.3);
        brandSigil(g, d.x, d.y - 260 * 0.55, 46, CAL.lava, 0.25 + k * 0.35);
        for (let i = 0; i < 6; i++) {
          const lx = d.x - 75 + i * 30, ly = d.y - 260 * 0.24;
          const kk = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.04);
          g.fillStyle(SEALS[i], 0.4 + kk * 0.5); g.fillRoundedRect(lx - 7, ly - 2, 14, 14, 3);
          g.fillStyle(SEALS[i], 0.08); g.fillCircle(lx, ly + 5, 18);
        }
        g.fillStyle(CAL.lavaHot, 0.4 + k * 0.4); g.fillRect(d.x - 30, d.y - 6, 60, 4);
        // Light leaking under the door.
        g.fillStyle(CAL.lavaLit, 0.15 + k * 0.15); g.fillTriangle(d.x - 110, d.y, d.x + 110, d.y, d.x, d.y + 60);
      }
      // The keep's windows flicker.
      if (inView(view, KEEP.x, KEEP.y - 120, 300)) {
        const k = 0.5 + 0.5 * Math.sin(t * 3.1);
        g.fillStyle(CAL.lava, 0.2 + k * 0.25);
        g.fillPoints(hexPts(KEEP.x, KEEP.y - 50, 32, Math.PI / 6, 1.05), true, true);
      }
    },

    animateOver(g, t, view) {
      // Sulphur plumes rising from the vents.
      for (const v of VENTS) {
        if (!inView(view, v.x, v.y - 80, 140)) continue;
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.35 + i / 6 + v.x * 0.001) % 1;
          const x = v.x + Math.sin(t * 0.9 + i * 1.3) * 10 * ph * v.s;
          const y = v.y - 34 * v.s - ph * 150 * v.s;
          g.fillStyle(ph < 0.3 ? CAL.sulphur : 0xb8b49a, (1 - ph) * 0.3);
          g.fillCircle(x, y, (6 + ph * 22) * v.s);
        }
      }
      // Forge chimney smoke.
      const f = CAMP.forge;
      if (inView(view, f.x, f.y - 160, 160)) {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.3 + i / 6) % 1;
          g.fillStyle(0x3a3436, (1 - ph) * 0.45);
          g.fillCircle(f.x - 16 + Math.sin(t + i) * 12 * ph, f.y - 140 - ph * 160, 8 + ph * 26);
        }
      }
      // Heat shimmer over the lake: sparks lifting off.
      const lcx = LAKE.x + LAKE.w / 2, lcy = LAKE.y + LAKE.h / 2;
      if (inView(view, lcx, lcy, 320)) {
        for (let i = 0; i < 14; i++) {
          const ph = (t * 0.4 + i / 14) % 1;
          const x = lcx + Math.sin(i * 2.7) * 200 + Math.sin(t * 2 + i) * 6;
          const y = lcy + Math.cos(i * 1.9) * 180 - ph * 120;
          g.fillStyle(i % 3 ? CAL.lavaLit : CAL.lavaHot, (1 - ph) * 0.8);
          g.fillCircle(x, y, 1.6 + (1 - ph));
        }
      }
    },
  };
}

