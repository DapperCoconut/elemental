import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BAT, BRONZE, BRONZE_DARK, BRONZE_LIT, COPPER, COPPER_DARK, FLOOR, FLOOR_DARK, FLOOR_LIT, FLOW, FLOW_DARK, FLOW_LIT,
  GLOW, GLOW_DEEP, GLOW_SOFT, INK, LAMP, LAMP_HOT, PAPER, PLANK, PLANK_DARK, PLANK_LIT, POOL, POOL_DEEP, POOL_LIT,
  REPRISE, REPRISE_DARK, REPRISE_LIT, RIBBON, ROCK, ROCK_DARK, ROCK_DEEP, ROCK_LIT, ROCK_PALE, ROPE, ROPE_DARK,
  SILVER, SILVER_DARK, SILVER_LIT, WET,
} from './palette';

/**
 * Cavern set pieces — a town that lives inside a stone instrument.
 *
 * Everything is drawn *wet* and *ringed*: flowstone laid down in cream bands, a bright sheen on
 * every rounded surface, drips at every tip. Rock is never flat — it bulges, overhangs and is
 * cut back into doorways. Two lights fight over every surface: the blue-green of the glowworm
 * roof from above and the amber of the doorway lamps from below. And everywhere there is
 * something made to catch sound: bronze bands on the stalactites, horns hammered into the rock,
 * stave lines carved where the Score was first sung in.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** A lumpy closed outline round (x, y): the base of every rock mass. */
function lumpPts(x: number, y: number, rx: number, ry: number, rng: () => number, n = 14): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + rng() * 0.3;
    pts.push(P(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k));
  }
  return pts;
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The cave floor: slate in uneven plates, cream flowstone poured across it in tongues, puddles
 * holding the glowworm light, grit and pebbles, and the hairline cracks of an old floor.
 */
export function caveFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(FLOOR, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // Plates of slightly different slate.
  const plates = Math.floor((r.w * r.h) / 26000);
  for (let i = 0; i < plates; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(rng() < 0.5 ? FLOOR_LIT : FLOOR_DARK, 0.35 + rng() * 0.25);
    g.fillPoints(lumpPts(x, y, 40 + rng() * 70, 22 + rng() * 40, rng, 9), true);
  }
  // Flowstone tongues: cream, banded, poured from the walls.
  const tongues = Math.floor((r.w * r.h) / 160000);
  for (let i = 0; i < tongues; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const rx = 60 + rng() * 90, ry = 20 + rng() * 26;
    for (let k = 0; k < 4; k++) {
      g.fillStyle(k % 2 ? FLOW_DARK : FLOW, 0.13 + k * 0.03);
      g.fillEllipse(x + k * 6, y - k * 2, rx * (1 - k * 0.2), ry * (1 - k * 0.2));
    }
  }
  // Cracks.
  for (let i = 0; i < plates / 2; i++) {
    let x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1, FLOOR_DARK, 0.7);
    for (let k = 0; k < 4; k++) { const nx = x + (rng() - 0.5) * 60, ny = y + (rng() - 0.5) * 30; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
  }
  // Puddles with a glowworm glint in each.
  for (let i = 0; i < plates / 3; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, w = 18 + rng() * 40;
    g.fillStyle(FLOOR_DARK, 0.8); g.fillEllipse(x, y, w + 4, w * 0.36 + 3);
    g.fillStyle(WET, 0.7); g.fillEllipse(x, y, w, w * 0.36);
    g.fillStyle(GLOW_SOFT, 0.35); g.fillEllipse(x - w * 0.2, y - 1, w * 0.3, 2);
  }
  // Grit and pebbles.
  for (let i = 0; i < plates * 8; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    if (rng() < 0.2) { g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y + 1, 6, 3); g.fillStyle(ROCK_PALE, 0.8); g.fillEllipse(x, y, 5, 3); }
    else { g.fillStyle(rng() < 0.5 ? ROCK_LIT : FLOOR_DARK, 0.5); g.fillRect(x, y, 1.5, 1.5); }
  }
}

/** A walked path through the cave: packed grit, a lamp-worn pale centre, kerb pebbles. */
export function cavePath(g: G, pts: Pt[], w: number, rng: () => number): void {
  const line = (width: number, color: number, a: number) => {
    g.lineStyle(width, color, a);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    for (const p of pts) { g.fillStyle(color, a); g.fillCircle(p.x, p.y, width / 2); }
  };
  line(w + 10, FLOOR_DARK, 0.6);
  line(w, 0x4a4a4c, 1);
  line(w * 0.55, 0x5a5856, 0.7);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    for (let d = 0; d < len; d += 22) {
      const t = d / len;
      for (const side of [-1, 1]) {
        if (rng() < 0.35) continue;
        const x = a.x + (b.x - a.x) * t + nx * side * (w / 2 + 2), y = a.y + (b.y - a.y) * t + ny * side * (w / 2 + 2);
        g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, y + 1, 9, 5);
        g.fillStyle(ROCK_LIT, 1); g.fillEllipse(x, y, 8, 4);
      }
      if (rng() < 0.4) { g.fillStyle(0x6a6866, 0.6); g.fillRect(a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.6, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.6, 2, 2); }
    }
  }
}

/** The cave wall seen from above: heaped rock masses with lit crowns, along a rect. */
export function wallMass(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(ROCK_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.max(3, Math.floor((r.w * r.h) / 2600));
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, s = 18 + rng() * 28;
    g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x, y + 3, s, s * 0.7, rng, 8), true);
    g.fillStyle(ROCK, 1); g.fillPoints(lumpPts(x, y, s * 0.85, s * 0.6, rng, 8), true);
    g.fillStyle(ROCK_LIT, 0.6); g.fillEllipse(x - s * 0.2, y - s * 0.2, s * 0.6, s * 0.3);
  }
}

/**
 * The chasm: a crack through the cave floor, far deeper than anyone has dropped a lamp. Layered
 * lips, a lit upper edge, cold mist in the throat and a few glowworm threads hanging inside.
 */
export function chasm(g: G, pts: Pt[], w: number, rng: () => number): void {
  const band = (width: number, color: number, a: number, dx = 0, dy = 0) => {
    g.lineStyle(width, color, a);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x + dx, pts[i - 1].y + dy, pts[i].x + dx, pts[i].y + dy);
    for (const p of pts) { g.fillStyle(color, a); g.fillCircle(p.x + dx, p.y + dy, width / 2); }
  };
  band(w + 26, ROCK_DARK, 1);
  band(w + 14, ROCK, 1, -3, -2);
  band(w + 6, ROCK_LIT, 0.5, -5, -3);
  band(w, 0x07080b, 1);
  band(w * 0.6, 0x020203, 1, 3, 4);
  // Mist and a far glow.
  for (let i = 0; i < pts.length * 4; i++) {
    const k = Math.floor(rng() * (pts.length - 1));
    const t = rng();
    const x = pts[k].x + (pts[k + 1].x - pts[k].x) * t, y = pts[k].y + (pts[k + 1].y - pts[k].y) * t;
    g.fillStyle(GLOW_DEEP, 0.05 + rng() * 0.05); g.fillEllipse(x + (rng() - 0.5) * w * 0.4, y, w * 0.7, 18);
    if (rng() < 0.3) { g.fillStyle(GLOW, 0.5); g.fillCircle(x + (rng() - 0.5) * w * 0.5, y + (rng() - 0.5) * 20, 1.2); }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

/** A stalagmite: a banded cone of flowstone growing up off the floor, a drip bead on its tip. */
export function stalagmite(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x + 3, y + 2, 34 * s, 10 * s, 0.35);
  const h = (40 + rng() * 40) * s;
  const w = (14 + rng() * 6) * s;
  g.fillStyle(FLOW_DARK, 1); g.fillTriangle(x - w, y, x + w, y, x + w * 0.1, y - h);
  g.fillStyle(FLOW, 1); g.fillTriangle(x - w * 0.9, y - 1, x + w * 0.5, y - 1, x, y - h + 2);
  g.fillStyle(FLOW_LIT, 0.8); g.fillTriangle(x - w * 0.6, y - 3, x - w * 0.2, y - 3, x - w * 0.05, y - h * 0.9);
  // Growth bands.
  for (let k = 1; k < 6; k++) {
    const yy = y - (h * k) / 6, half = w * (1 - k / 6);
    g.lineStyle(1, FLOW_DARK, 0.6); g.lineBetween(x - half, yy, x + half * 0.9, yy - 1);
  }
  // A collar of rimstone where it meets the floor.
  g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y, w * 2.6, 9 * s);
  g.fillStyle(FLOW, 1); g.fillEllipse(x, y - 1, w * 2.3, 7 * s);
  g.fillStyle(SILVER_LIT, 0.9); g.fillCircle(x + 0.5, y - h + 1, 1.6 * s);
}

/**
 * One hanging stalactite chime: a limestone tooth hung from the roof by a chain, banded in bronze
 * so it rings when it swings, the drip shining at its point. `sway` is radians off plumb.
 */
export function chime(g: G, x: number, topY: number, len: number, sway: number, ring = 0): void {
  const tipX = x + Math.sin(sway) * len, tipY = topY + Math.cos(sway) * len;
  const mx = x + Math.sin(sway) * len * 0.35, my = topY + Math.cos(sway) * len * 0.35;
  // Chain.
  g.lineStyle(1.2, BRONZE_DARK, 1); g.lineBetween(x, topY - 60, mx, my);
  for (let k = 0; k < 6; k++) { const t = k / 6; g.fillStyle(BRONZE, 1); g.fillCircle(x + (mx - x) * t, topY - 60 + (my - topY + 60) * t, 1.1); }
  // The tooth: a long tapering flowstone cone, lit down one side.
  const nx = Math.cos(sway), ny = -Math.sin(sway);
  const w = Math.max(4, len * 0.13);
  g.fillStyle(FLOW_DARK, 1); g.fillTriangle(mx - nx * w, my - ny * w, mx + nx * w, my + ny * w, tipX, tipY);
  g.fillStyle(FLOW, 1); g.fillTriangle(mx - nx * w * 0.8, my - ny * w * 0.8, mx + nx * w * 0.2, my + ny * w * 0.2, tipX, tipY);
  g.fillStyle(FLOW_LIT, 0.7); g.fillTriangle(mx - nx * w * 0.6, my - ny * w * 0.6, mx - nx * w * 0.2, my - ny * w * 0.2, tipX - nx, tipY);
  // Bronze bands.
  for (const t of [0.12, 0.3]) {
    const bx = mx + (tipX - mx) * t, by = my + (tipY - my) * t, bw = w * (1 - t) + 1;
    g.lineStyle(2.4, BRONZE_DARK, 1); g.lineBetween(bx - nx * bw, by - ny * bw + 1, bx + nx * bw, by + ny * bw + 1);
    g.lineStyle(1.6, ring > 0 ? BRONZE_LIT : BRONZE, 1); g.lineBetween(bx - nx * bw, by - ny * bw, bx + nx * bw, by + ny * bw);
  }
  // The drip.
  g.fillStyle(SILVER_LIT, 0.9); g.fillCircle(tipX, tipY + 1.5, 1.6);
  if (ring > 0) {
    g.lineStyle(1.2, GLOW, 0.5 * ring); g.strokeCircle(mx, my + len * 0.25, 8 + (1 - ring) * 14);
    glow(g, tipX, tipY, 10, GLOW, 0.05 * ring, 2);
  }
}

/** The floor shadow of a chime overhead (where it would land). */
export function chimeShadow(g: G, x: number, y: number, r: number, a = 0.28): void {
  g.fillStyle(0x000000, a); g.fillEllipse(x, y, r * 2, r * 0.7);
  g.fillStyle(0x000000, a * 0.8); g.fillEllipse(x, y, r * 1.1, r * 0.38);
}

/**
 * A grotto house: a dwelling cut back into a rock outcrop. A round-arched plank door with a
 * bronze knocker shaped like an ear; two round windows leaded in stave lines, lamplit; a bronze
 * listening-horn chimney that funnels the Repeat down into every hearth whether you like it or
 * not; a little rope-hung lamp. `muted` ties the white silk ribbon of the muted on the door.
 */
export function grottoHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: { muted?: boolean; glow?: number; roofRock?: number } = {}): Pt {
  const glowC = o.glow ?? LAMP;
  shadow(g, x, y + 4, w * 1.15, 22, 0.4);
  // The outcrop the house is carved into.
  const rx = w * 0.62, ry = h * 0.72;
  g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x, y - ry * 0.8, rx * 1.05, ry, rng, 16), true);
  g.fillStyle(o.roofRock ?? ROCK, 1); g.fillPoints(lumpPts(x - 4, y - ry * 0.86, rx * 0.95, ry * 0.92, rng, 16), true);
  g.fillStyle(ROCK_LIT, 0.55); g.fillEllipse(x - rx * 0.3, y - ry * 1.4, rx * 0.9, ry * 0.4);
  // Flowstone curtains down the face.
  for (let i = 0; i < 6; i++) {
    const fx = x - rx * 0.8 + (i / 5) * rx * 1.6, fh = 18 + rng() * 26;
    g.fillStyle(FLOW_DARK, 0.6); g.fillTriangle(fx - 5, y - ry * 1.55 + 6, fx + 5, y - ry * 1.55 + 6, fx, y - ry * 1.55 + fh);
    g.fillStyle(FLOW, 0.5); g.fillTriangle(fx - 3, y - ry * 1.55 + 6, fx + 2, y - ry * 1.55 + 6, fx - 1, y - ry * 1.55 + fh - 3);
  }
  // The dressed front: a smoothed, plastered face.
  const fw = w * 0.86, fh = h * 0.72;
  g.fillStyle(dim(FLOW, 0.25), 1); g.fillRoundedRect(x - fw / 2, y - fh, fw, fh, 14);
  g.fillStyle(FLOW, 1); g.fillRoundedRect(x - fw / 2 + 3, y - fh + 3, fw - 6, fh - 4, 12);
  g.fillStyle(FLOW_LIT, 0.5); g.fillRect(x - fw / 2 + 8, y - fh + 6, fw - 16, 4);
  // Round windows, leaded with five stave lines, warm behind.
  for (const k of [-1, 1]) {
    const wx = x + k * fw * 0.3, wy = y - fh * 0.58, wr = Math.min(14, fw * 0.12);
    g.fillStyle(ROCK_DARK, 1); g.fillCircle(wx, wy, wr + 3);
    g.fillStyle(glowC, (o.glow === 0 ? 0 : 0.9)); g.fillCircle(wx, wy, wr);
    g.fillStyle(LAMP_HOT, o.glow === 0 ? 0 : 0.4); g.fillCircle(wx - 2, wy - 2, wr * 0.5);
    g.lineStyle(1, INK, 0.8);
    for (let s = -2; s <= 2; s++) { const sy = wy + s * wr * 0.32; const half = Math.sqrt(Math.max(0, wr * wr - (sy - wy) ** 2)); g.lineBetween(wx - half, sy, wx + half, sy); }
    g.fillStyle(INK, 0.9); g.fillEllipse(wx + k * 3, wy + wr * 0.16, 4, 3); g.lineBetween(wx + k * 3 + 2, wy + wr * 0.16, wx + k * 3 + 2, wy - wr * 0.5);
    g.lineStyle(2, BRONZE_DARK, 1); g.strokeCircle(wx, wy, wr + 1);
  }
  // The arched door.
  const dw = Math.min(30, fw * 0.28), dh = fh * 0.62;
  g.fillStyle(ROCK_DARK, 1); g.fillRect(x - dw / 2 - 3, y - dh, dw + 6, dh);
  g.beginPath(); g.arc(x, y - dh, dw / 2 + 3, Math.PI, 0, false); g.fillPath();
  g.fillStyle(PLANK, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  g.beginPath(); g.arc(x, y - dh, dw / 2, Math.PI, 0, false); g.fillPath();
  g.lineStyle(1, PLANK_DARK, 1);
  for (let k = 1; k < 4; k++) g.lineBetween(x - dw / 2 + (dw * k) / 4, y - dh - dw * 0.4, x - dw / 2 + (dw * k) / 4, y);
  g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(x - dw / 2, y - dh * 0.75, x + dw / 2, y - dh * 0.75); g.lineBetween(x - dw / 2, y - dh * 0.25, x + dw / 2, y - dh * 0.25);
  // The ear knocker.
  g.lineStyle(2, BRONZE, 1); g.beginPath(); g.arc(x + dw * 0.22, y - dh * 0.5, 4, -Math.PI * 0.6, Math.PI * 0.7, false); g.strokePath();
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(x + dw * 0.22 + 1, y - dh * 0.5 - 2, 1.2);
  if (o.muted) {
    // The white silk ribbon, tied in a bow on the knocker, its tails hanging.
    g.fillStyle(RIBBON, 1);
    g.fillTriangle(x + dw * 0.22, y - dh * 0.5 - 6, x + dw * 0.22 - 7, y - dh * 0.5 - 11, x + dw * 0.22 - 7, y - dh * 0.5 - 1);
    g.fillTriangle(x + dw * 0.22, y - dh * 0.5 - 6, x + dw * 0.22 + 7, y - dh * 0.5 - 11, x + dw * 0.22 + 7, y - dh * 0.5 - 1);
    g.lineStyle(1.5, RIBBON, 1); g.lineBetween(x + dw * 0.22, y - dh * 0.5 - 5, x + dw * 0.22 - 3, y - dh * 0.5 + 14); g.lineBetween(x + dw * 0.22, y - dh * 0.5 - 5, x + dw * 0.22 + 4, y - dh * 0.5 + 12);
  }
  // Door step.
  g.fillStyle(FLOW_DARK, 1); g.fillRect(x - dw / 2 - 6, y - 3, dw + 12, 5);
  g.fillStyle(FLOW_LIT, 1); g.fillRect(x - dw / 2 - 6, y - 4, dw + 12, 2);
  // The listening-horn chimney: a bronze bell-mouth rising out of the rock, turned to the roof.
  const cx = x + rx * 0.45, cy = y - ry * 1.5;
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(cx - 4, cy - 4, 8, 22);
  g.fillStyle(BRONZE, 1); g.fillRect(cx - 3, cy - 4, 5, 22);
  g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(cx - 14, cy - 18, cx + 14, cy - 18, cx, cy - 2);
  g.fillStyle(BRONZE, 1); g.fillEllipse(cx, cy - 18, 28, 9);
  g.fillStyle(ROCK_DEEP, 1); g.fillEllipse(cx, cy - 18, 20, 5);
  g.fillStyle(BRONZE_LIT, 0.8); g.fillEllipse(cx - 7, cy - 19, 6, 2);
  // A rope-hung lamp by the door.
  const lx = x - fw / 2 + 6, ly = y - fh * 0.75;
  g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(lx, ly - 14, lx + 8, ly - 20);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(lx - 4, ly - 14, 8, 2);
  g.fillStyle(glowC, o.glow === 0 ? 0.15 : 0.95); g.fillRoundedRect(lx - 3, ly - 12, 6, 9, 2);
  if (o.glow !== 0) glow(g, lx, ly - 8, 22, glowC, 0.05, 3);
  return { x, y: y + 16 };
}

/**
 * The Echo Wall: a great sheer face of flowstone where the Score was first sung into the rock.
 * Its staves are carved across it in five long grooves, the notes cut in and gilded; ear-horns
 * are hammered into the stone where the echo comes strongest; choir niches with stone lecterns
 * run along its foot, each with a hymn sheet weighted down by a pebble.
 */
export function echoWall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.04, 24, 0.4);
  g.fillStyle(ROCK_DARK, 1); g.fillRect(x0 - 16, top - 30, w + 32, h + 30);
  g.fillStyle(FLOW_DARK, 1); g.fillRect(x0, top, w, h);
  // Vertical flow bands.
  for (let i = 0; i < w / 14; i++) {
    const bx = x0 + i * 14 + rng() * 4;
    g.fillStyle(i % 3 ? FLOW : FLOW_LIT, 0.35 + rng() * 0.2); g.fillRect(bx, top, 6 + rng() * 6, h);
  }
  // Curtains hanging from the lip.
  for (let i = 0; i < w / 22; i++) {
    const cx = x0 + 8 + i * 22 + rng() * 6, ch = 16 + rng() * 34;
    g.fillStyle(FLOW_LIT, 0.8); g.fillTriangle(cx - 6, top, cx + 6, top, cx, top + ch);
    g.fillStyle(SILVER_LIT, 0.8); g.fillCircle(cx, top + ch + 1, 1.2);
  }
  // The carved stave: five grooves, gilt notes, a clef and a repeat sign at the end.
  const sy = top + h * 0.34, gap = 9;
  for (let k = 0; k < 5; k++) {
    g.lineStyle(2, dim(FLOW_DARK, 0.3), 1); g.lineBetween(x0 + 20, sy + k * gap + 1, x0 + w - 20, sy + k * gap + 1);
    g.lineStyle(1, FLOW_LIT, 0.7); g.lineBetween(x0 + 20, sy + k * gap, x0 + w - 20, sy + k * gap);
  }
  // Treble clef, simplified: a loop and a stem.
  g.lineStyle(2.5, BRONZE, 1);
  g.beginPath(); g.arc(x0 + 40, sy + gap * 2.6, gap * 1.1, 0, Math.PI * 1.8, false); g.strokePath();
  g.lineBetween(x0 + 44, sy - gap * 1.2, x0 + 40, sy + gap * 5);
  for (let nx = x0 + 80; nx < x0 + w - 60; nx += 34 + rng() * 10) {
    const line = Math.floor(rng() * 9) - 1;
    const ny = sy + line * gap * 0.5;
    g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(nx + 1, ny + 1, 11, 8);
    g.fillStyle(BRONZE_LIT, 1); g.fillEllipse(nx, ny, 10, 7);
    g.lineStyle(1.6, BRONZE, 1); g.lineBetween(nx + 4.5, ny, nx + 4.5, ny - gap * 3);
  }
  repeatSign(g, x0 + w - 40, sy + gap * 2, gap * 4.4, BRONZE, 1);
  // Ear-horns hammered into the rock.
  for (let i = 0; i < 4; i++) {
    const hx = x0 + w * (0.15 + i * 0.23), hy = top + h * 0.72;
    g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(hx - 3, hy, hx + 3, hy, hx + 14, hy - 12);
    g.fillStyle(BRONZE, 1); g.fillEllipse(hx + 14, hy - 12, 14, 10);
    g.fillStyle(ROCK_DEEP, 1); g.fillEllipse(hx + 14, hy - 12, 9, 6);
    g.fillStyle(BRONZE_LIT, 0.8); g.fillEllipse(hx + 11, hy - 15, 4, 2);
  }
  // Choir niches along the foot: arched hollows with a lectern each.
  const n = Math.max(2, Math.floor(w / 90));
  for (let i = 0; i < n; i++) {
    const nx = x0 + (w * (i + 0.5)) / n, nw = 38, nh = 46;
    g.fillStyle(ROCK_DEEP, 1); g.fillRect(nx - nw / 2, y - nh, nw, nh);
    g.beginPath(); g.arc(nx, y - nh, nw / 2, Math.PI, 0, false); g.fillPath();
    g.fillStyle(LAMP, 0.18); g.fillRect(nx - nw / 2 + 4, y - nh + 4, nw - 8, nh - 4);
    g.lineStyle(2, FLOW_LIT, 0.8); g.beginPath(); g.arc(nx, y - nh, nw / 2, Math.PI, 0, false); g.strokePath();
    // The lectern and its sheet.
    g.fillStyle(FLOW_DARK, 1); g.fillRect(nx - 2, y - 20, 4, 20);
    g.fillStyle(FLOW, 1); g.fillTriangle(nx - 11, y - 20, nx + 11, y - 20, nx + 9, y - 27);
    g.fillStyle(PAPER, 1); g.fillRect(nx - 8, y - 27, 15, 6);
    g.lineStyle(0.6, INK, 0.7); for (let k = 0; k < 3; k++) g.lineBetween(nx - 7, y - 26 + k * 1.8, nx + 6, y - 26 + k * 1.8);
    g.fillStyle(ROCK_PALE, 1); g.fillCircle(nx + 4, y - 25, 1.6);
  }
  g.fillStyle(FLOW_DARK, 1); g.fillRect(x0 - 6, y - 6, w + 12, 8);
  g.fillStyle(FLOW_LIT, 0.7); g.fillRect(x0 - 6, y - 7, w + 12, 2);
}

/** The repeat sign — two bars, the second thick, and two dots before them. Reprise's mark. */
export function repeatSign(g: G, x: number, y: number, h: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillRect(x + h * 0.12, y - h / 2, h * 0.06, h);
  g.fillRect(x + h * 0.24, y - h / 2, h * 0.16, h);
  g.fillCircle(x - h * 0.06, y - h * 0.14, h * 0.07);
  g.fillCircle(x - h * 0.06, y + h * 0.14, h * 0.07);
}

/**
 * The Sounding Shell — Prince Reprise's hall: a vast spiral conch carved out of the cave's back
 * wall, ribbed and nacreous, its mouth the door. Everything said inside comes out again at the
 * mouth a moment later, a little louder. Silver repeat signs on violet banners at either side.
 */
export function soundingShell(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.1, 30, 0.45);
  // The rock it is carved from.
  g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x, y - h * 0.5, w * 0.62, h * 0.62, rng, 18), true);
  g.fillStyle(ROCK, 1); g.fillPoints(lumpPts(x - 6, y - h * 0.54, w * 0.56, h * 0.55, rng, 18), true);
  // The shell: whorls stepping in to a spiral apex, each one ribbed.
  const cx = x + w * 0.08, cy = y - h * 0.56;
  for (let k = 0; k < 6; k++) {
    const r = (h * 0.5) * Math.pow(0.72, k);
    const ox = cx + Math.cos(k * 1.9) * r * 0.25, oy = cy + Math.sin(k * 1.9) * r * 0.2;
    g.fillStyle(dim(FLOW_LIT, 0.25 + k * 0.03), 1); g.fillEllipse(ox, oy + 3, r * 2.25, r * 1.85);
    g.fillStyle(mixC(FLOW_LIT, REPRISE_LIT, 0.15 + k * 0.08), 1); g.fillEllipse(ox, oy, r * 2.15, r * 1.75);
    // Ribs.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.lineStyle(1.2, dim(FLOW, 0.2), 0.55);
      g.lineBetween(ox + Math.cos(a) * r * 0.5, oy + Math.sin(a) * r * 0.42, ox + Math.cos(a) * r * 1.05, oy + Math.sin(a) * r * 0.86);
    }
    // Nacre sheen.
    g.fillStyle(REPRISE_LIT, 0.25); g.fillEllipse(ox - r * 0.35, oy - r * 0.35, r * 0.9, r * 0.35);
    g.fillStyle(GLOW_SOFT, 0.12); g.fillEllipse(ox + r * 0.3, oy + r * 0.2, r * 0.6, r * 0.25);
  }
  // Spines along the outer whorl.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.95;
    const r = h * 0.52;
    const bx = cx + Math.cos(a) * r * 1.05, by = cy + Math.sin(a) * r * 0.86;
    g.fillStyle(FLOW_DARK, 1); g.fillTriangle(bx - 5, by + 2, bx + 5, by + 2, bx + Math.cos(a) * 18, by + Math.sin(a) * 16);
    g.fillStyle(FLOW_LIT, 1); g.fillTriangle(bx - 3, by, bx + 2, by, bx + Math.cos(a) * 15, by + Math.sin(a) * 13);
  }
  // The mouth: a flaring lip and the dark spiral passage inside.
  const mw = w * 0.34, mh = h * 0.42;
  g.fillStyle(dim(REPRISE_DARK, 0.2), 1); g.fillEllipse(x - w * 0.05, y - mh * 0.5, mw * 1.25, mh * 1.15);
  g.fillStyle(FLOW_LIT, 1); g.fillEllipse(x - w * 0.05, y - mh * 0.5, mw * 1.1, mh);
  g.fillStyle(mixC(FLOW_LIT, 0xf0c8d8, 0.4), 1); g.fillEllipse(x - w * 0.05, y - mh * 0.48, mw * 0.9, mh * 0.82);
  g.fillStyle(REPRISE_DARK, 1); g.fillEllipse(x - w * 0.04, y - mh * 0.42, mw * 0.62, mh * 0.62);
  g.fillStyle(ROCK_DEEP, 1); g.fillEllipse(x - w * 0.02, y - mh * 0.4, mw * 0.36, mh * 0.4);
  g.lineStyle(1.5, REPRISE_LIT, 0.5);
  g.beginPath(); g.arc(x - w * 0.03, y - mh * 0.42, mw * 0.24, 0, Math.PI * 1.6, false); g.strokePath();
  // Silver repeat-sign banners on posts.
  for (const k of [-1, 1]) {
    const bx = x + k * w * 0.42, by = y;
    g.fillStyle(SILVER_DARK, 1); g.fillRect(bx - 2, by - 130, 4, 130);
    g.fillStyle(SILVER_LIT, 1); g.fillCircle(bx, by - 132, 4);
    g.fillStyle(REPRISE_DARK, 1); g.fillRect(bx - 16, by - 122, 32, 64);
    g.fillTriangle(bx - 16, by - 58, bx + 16, by - 58, bx, by - 46);
    g.fillStyle(REPRISE, 1); g.fillRect(bx - 14, by - 120, 28, 60);
    g.fillTriangle(bx - 14, by - 60, bx + 14, by - 60, bx, by - 49);
    repeatSign(g, bx - 2, by - 92, 26, SILVER_LIT, 1);
  }
  // Three steps up to the mouth.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? FLOW : FLOW_LIT, 1); g.fillRect(x - w * 0.05 - 56 - k * 8, y - 8 + k * 4, 112 + k * 16, 5); }
}

/**
 * A rope bridge across the chasm: plank deck lashed between two sagging hand-ropes on posts,
 * a lamp hung at each end. Drawn flat from a little above, so it reads over the black of the
 * chasm. `x0 → x1` at height y.
 */
export function ropeBridge(g: G, x0: number, x1: number, y: number, half: number, rng: () => number): void {
  const len = x1 - x0;
  const sag = (t: number) => Math.sin(t * Math.PI) * 6;
  // Underslung ropes (seen in the dark beneath).
  g.lineStyle(2, ROPE_DARK, 0.8);
  for (let i = 0; i < 20; i++) { const t = i / 20, t2 = (i + 1) / 20; g.lineBetween(x0 + len * t, y + sag(t) + half, x0 + len * t2, y + sag(t2) + half); }
  // Planks.
  for (let px = x0 + 4; px < x1 - 4; px += 9) {
    const t = (px - x0) / len;
    const off = (rng() - 0.5) * 2;
    g.fillStyle(PLANK_DARK, 1); g.fillRect(px, y - half + sag(t) + off + 2, 7, half * 2);
    g.fillStyle(rng() < 0.2 ? PLANK_LIT : PLANK, 1); g.fillRect(px, y - half + sag(t) + off, 7, half * 2 - 2);
  }
  // Hand-ropes, both sides, with the hangers down to the deck.
  for (const s of [-1, 1]) {
    const yy = y + s * half;
    g.lineStyle(2.2, ROPE, 1);
    for (let i = 0; i < 24; i++) {
      const t = i / 24, t2 = (i + 1) / 24;
      g.lineBetween(x0 + len * t, yy - 14 + sag(t) * 1.6, x0 + len * t2, yy - 14 + sag(t2) * 1.6);
    }
    g.lineStyle(1, ROPE_DARK, 1);
    for (let i = 1; i < 10; i++) { const t = i / 10; g.lineBetween(x0 + len * t, yy - 14 + sag(t) * 1.6, x0 + len * t, yy + sag(t) - 2); }
    // Posts.
    for (const px of [x0, x1]) {
      g.fillStyle(PLANK_DARK, 1); g.fillRect(px - 3, yy - 20, 6, 22);
      g.fillStyle(PLANK_LIT, 1); g.fillRect(px - 3, yy - 20, 2, 22);
      g.fillStyle(ROPE, 1); g.fillRect(px - 4, yy - 15, 8, 3);
    }
  }
  // Lamps on the near posts.
  for (const px of [x0, x1]) {
    g.lineStyle(1, BRONZE_DARK, 1); g.lineBetween(px, y + half - 20, px + 6, y + half - 26);
    g.fillStyle(LAMP, 0.95); g.fillRoundedRect(px + 3, y + half - 26, 6, 8, 2);
    glow(g, px + 6, y + half - 22, 24, LAMP, 0.05, 3);
  }
}

/**
 * The Tuners' Listening Post: a brass ear-trumpet the size of a cart on a swivel, turned to the
 * cave mouth, its throat wired with copper to a cabinet of dials and a glowing valve; a ledger
 * desk where the listener writes down every voice that came back wrong.
 */
export function listeningPost(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 180, 26, 0.4);
  // Swivel base.
  g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x - 30, y - 2, 60, 16);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 36, y - 26, 12, 26);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 34, y - 26, 6, 26);
  // The horn: a long tapering cone, its bell flared toward the right.
  const hx = x - 30, hy = y - 40;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(P(hx - 30 + t * 110, hy - 3 - t * t * 34)); }
  for (let i = 12; i >= 0; i--) { const t = i / 12; pts.push(P(hx - 30 + t * 110, hy + 3 + t * t * 34)); }
  g.fillStyle(BRONZE_DARK, 1); g.fillPoints(pts, true);
  g.fillStyle(BRONZE, 1); g.fillPoints(pts.map((p) => P(p.x, hy + (p.y - hy) * 0.8 - 2)), true);
  g.fillStyle(BRONZE_LIT, 0.7);
  for (let i = 0; i < 10; i++) { const t = i / 12; g.fillRect(hx - 30 + t * 110, hy - 2 - t * t * 26, 9, 2); }
  // The bell mouth.
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(hx + 80, hy, 22, 74);
  g.fillStyle(BRONZE, 1); g.fillEllipse(hx + 80, hy, 16, 68);
  g.fillStyle(ROCK_DEEP, 1); g.fillEllipse(hx + 82, hy, 10, 54);
  // Rivet ring and the earpiece.
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(BRONZE_LIT, 1); g.fillCircle(hx + 80 + Math.cos(a) * 7, hy + Math.sin(a) * 34, 1.2); }
  g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(hx - 30, hy, hx - 44, hy + 16);
  g.fillStyle(BRONZE, 1); g.fillCircle(hx - 44, hy + 16, 4);
  // Copper wires to the cabinet.
  const kx = x + 70, ky = y;
  g.lineStyle(1.6, COPPER, 1);
  g.lineBetween(hx + 20, hy + 10, kx - 10, ky - 50); g.lineBetween(hx + 10, hy + 8, kx - 14, ky - 40);
  g.lineStyle(1, COPPER_DARK, 1); g.lineBetween(hx + 30, hy + 12, kx - 8, ky - 30);
  // The cabinet: dark wood, three dials, a valve glowing in a cage.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(kx - 22, ky - 64, 44, 64);
  g.fillStyle(PLANK, 1); g.fillRect(kx - 20, ky - 62, 40, 60);
  for (let i = 0; i < 3; i++) {
    const dx = kx - 12 + i * 12, dy = ky - 48;
    g.fillStyle(PAPER, 1); g.fillCircle(dx, dy, 5);
    g.lineStyle(1, INK, 1); g.lineBetween(dx, dy, dx + Math.cos(-0.8 - i * 0.7 + rng()) * 4, dy + Math.sin(-0.8 - i * 0.7) * 4);
    g.lineStyle(1, BRONZE, 1); g.strokeCircle(dx, dy, 5.5);
  }
  g.fillStyle(0xffa860, 0.9); g.fillRoundedRect(kx - 5, ky - 36, 10, 14, 4);
  g.lineStyle(1, BRONZE_DARK, 1); for (let k = 0; k < 3; k++) g.lineBetween(kx - 5 + k * 5, ky - 36, kx - 5 + k * 5, ky - 22);
  glow(g, kx, ky - 30, 20, 0xffa860, 0.06, 3);
  // The ledger desk.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(kx + 28, ky - 28, 4, 28); g.fillRect(kx + 60, ky - 28, 4, 28);
  g.fillStyle(PLANK_LIT, 1); g.fillRect(kx + 24, ky - 32, 44, 6);
  g.fillStyle(PAPER, 1); g.fillRect(kx + 30, ky - 38, 30, 7);
  g.lineStyle(0.8, INK, 0.8); for (let k = 0; k < 3; k++) g.lineBetween(kx + 32, ky - 36 + k * 2, kx + 56, ky - 36 + k * 2);
  g.fillStyle(0xc02020, 1); g.fillRect(kx + 44, ky - 37, 10, 1.4);
}

/**
 * The Bat Hollow roost: an overhang of rock under which the Batkeeper's colony hangs in rows,
 * guano spattered white below, a perch-rail of bone-pale wood, and his hooded red lantern — the
 * one light a bat won't fly to.
 */
export function batRoost(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 230, 36, 0.5);
  // Guano spatter.
  for (let i = 0; i < 40; i++) { g.fillStyle(0xd8d4c4, 0.25 + rng() * 0.3); g.fillCircle(x - 100 + rng() * 200, y - 6 + rng() * 22, 1 + rng() * 2.5); }
  // The overhang.
  g.fillStyle(ROCK_DEEP, 1); g.fillPoints(lumpPts(x, y - 110, 130, 70, rng, 16), true);
  g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x - 6, y - 124, 118, 56, rng, 16), true);
  g.fillStyle(ROCK, 0.8); g.fillEllipse(x - 30, y - 150, 120, 30);
  // The lip of the overhang, and the roost underneath it.
  g.fillStyle(ROCK_DEEP, 1); g.fillRect(x - 110, y - 76, 220, 12);
  for (let i = 0; i < 16; i++) {
    const bx = x - 100 + i * 13 + (rng() - 0.5) * 4, by = y - 64 + (i % 3) * 4;
    // A hanging bat: folded wings, ears down.
    g.fillStyle(BAT, 1); g.fillEllipse(bx, by + 7, 7, 13);
    g.fillTriangle(bx - 4, by + 1, bx + 4, by + 1, bx, by + 15);
    g.fillTriangle(bx - 3, by + 14, bx - 1, by + 14, bx - 2, by + 18); g.fillTriangle(bx + 1, by + 14, bx + 3, by + 14, bx + 2, by + 18);
    g.lineStyle(1, BAT, 1); g.lineBetween(bx, by - 2, bx, by + 1);
    if (rng() < 0.3) { g.fillStyle(0xff6060, 0.9); g.fillCircle(bx - 1.5, by + 15, 0.8); g.fillCircle(bx + 1.5, by + 15, 0.8); }
  }
  // Perch-rail.
  g.fillStyle(0xd8ccb0, 1); g.fillRect(x - 90, y - 34, 180, 4);
  for (const px of [x - 86, x, x + 86]) { g.fillStyle(0xb8ac90, 1); g.fillRect(px - 2, y - 34, 4, 34); }
  // The hooded red lantern on its hook.
  const lx = x + 110, ly = y - 40;
  g.fillStyle(PLANK_DARK, 1); g.fillRect(lx - 2, ly, 4, 40);
  g.lineStyle(2, PLANK_DARK, 1); g.lineBetween(lx, ly, lx - 14, ly - 4);
  g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(lx - 24, ly + 2, lx - 4, ly + 2, lx - 14, ly - 6);
  g.fillStyle(0xd02a2a, 0.9); g.fillRoundedRect(lx - 19, ly + 2, 10, 12, 3);
  glow(g, lx - 14, ly + 8, 26, 0xd02a2a, 0.05, 3);
}

/**
 * The ringing pool's rim: rimstone dams terraced round the water — cream gours stepping down,
 * each brimming — and the water itself, deep in the middle, glowworm-lit at the shallows.
 */
export function ringingPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // Terraced gours round the rim.
  for (let k = 3; k >= 0; k--) {
    const pad = 16 + k * 14;
    g.fillStyle(k % 2 ? FLOW_DARK : FLOW, 1); g.fillEllipse(cx, cy + 4, r.w + pad * 2, r.h + pad * 1.5);
    g.fillStyle(WET, 0.35); g.fillEllipse(cx, cy + 2, r.w + pad * 2 - 8, r.h + pad * 1.5 - 8);
    // The scalloped dam lips.
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const ex = cx + Math.cos(a) * (r.w / 2 + pad), ey = cy + 4 + Math.sin(a) * (r.h / 2 + pad * 0.75);
      g.fillStyle(FLOW_LIT, 0.8); g.fillEllipse(ex, ey, 16, 5);
    }
  }
  // The water.
  g.fillStyle(POOL, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(POOL_DEEP, 1); g.fillEllipse(cx + 10, cy + 6, r.w * 0.68, r.h * 0.6);
  g.fillStyle(0x040c12, 1); g.fillEllipse(cx + 16, cy + 10, r.w * 0.3, r.h * 0.26);
  // Shallows lit blue at the edge.
  g.lineStyle(6, POOL_LIT, 0.18); g.strokeEllipse(cx, cy, r.w - 10, r.h - 8);
  for (let i = 0; i < 30; i++) {
    const a = rng() * Math.PI * 2, d = 0.3 + rng() * 0.6;
    g.fillStyle(GLOW, 0.3 + rng() * 0.4); g.fillCircle(cx + Math.cos(a) * r.w * 0.5 * d, cy + Math.sin(a) * r.h * 0.5 * d, 0.9 + rng());
  }
  // Rocks standing in the water.
  for (const [dx, dy, s] of [[-0.32, -0.1, 14], [0.28, 0.22, 10], [0.05, -0.3, 8]] as [number, number, number][]) {
    const rx = cx + dx * r.w, ry = cy + dy * r.h;
    g.fillStyle(ROCK_DARK, 1); g.fillEllipse(rx, ry + 2, s * 2.2, s);
    g.fillStyle(FLOW_DARK, 1); g.fillEllipse(rx, ry - 2, s * 1.8, s * 1.1);
    g.fillStyle(FLOW_LIT, 0.8); g.fillEllipse(rx - s * 0.3, ry - s * 0.4, s * 0.8, s * 0.35);
    g.lineStyle(1, POOL_LIT, 0.4); g.strokeEllipse(rx, ry + 2, s * 2.6, s * 1.1);
  }
}

/** Rings spreading on the pool where a drip strikes it — animated. Ringing pools ring. */
export function poolRings(g: G, r: Rect, t: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.35 + i * 0.21) % 1;
    const ox = cx + Math.cos(i * 2.3) * r.w * 0.28, oy = cy + Math.sin(i * 1.7) * r.h * 0.26;
    const rr = 4 + ph * 46;
    g.lineStyle(1.2, POOL_LIT, 0.5 * (1 - ph)); g.strokeEllipse(ox, oy, rr * 2, rr * 0.8);
    g.lineStyle(0.8, GLOW, 0.35 * (1 - ph)); g.strokeEllipse(ox, oy, rr * 1.4, rr * 0.55);
    if (ph < 0.08) { g.fillStyle(SILVER_LIT, 0.9); g.fillCircle(ox, oy - (0.08 - ph) * 300, 1.5); }
  }
}

/**
 * The cavern waystone: a stalagmite grown round a bronze ring-bell, so that the waystone rings
 * when it wakes. The ring is worn bright by hands.
 */
export function cavernWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14, 0.4);
  g.fillStyle(FLOW_DARK, 1); g.fillTriangle(x - 18, y, x + 18, y, x + 2, y - 70);
  g.fillStyle(FLOW, 1); g.fillTriangle(x - 16, y - 1, x + 10, y - 1, x, y - 68);
  g.fillStyle(FLOW_LIT, 0.8); g.fillTriangle(x - 11, y - 2, x - 4, y - 2, x - 2, y - 60);
  for (let k = 1; k < 7; k++) { g.lineStyle(1, FLOW_DARK, 0.6); g.lineBetween(x - 18 + k * 2.4, y - k * 9, x + 16 - k * 2.4, y - k * 9 - 1); }
  // The bronze ring-bell, set into the stone at chest height.
  g.lineStyle(4, BRONZE_DARK, 1); g.strokeCircle(x, y - 34, 11);
  g.lineStyle(2.5, BRONZE_LIT, 1); g.strokeCircle(x, y - 35, 11);
  g.fillStyle(GLOW, 0.7); g.fillCircle(x, y - 35, 4);
  glow(g, x, y - 35, 22, GLOW, 0.05, 3);
  g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y, 46, 10);
  g.fillStyle(FLOW, 1); g.fillEllipse(x, y - 1, 40, 7);
}

/** A glowworm-jar lamp on an iron hook post — cold light, the way the cave likes it. */
export function wormLamp(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 16, 6, 0.3);
  g.fillStyle(0x20222a, 1); g.fillRect(x - 2, y - 56, 4, 56);
  g.lineStyle(2, 0x20222a, 1); g.lineBetween(x, y - 56, x + 12, y - 60);
  g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(x + 12, y - 60, x + 12, y - 52);
  g.fillStyle(0x9ab8c0, 0.35); g.fillRoundedRect(x + 6, y - 52, 12, 16, 4);
  g.fillStyle(GLOW, 0.9); for (let i = 0; i < 4; i++) g.fillCircle(x + 9 + (i % 2) * 5, y - 48 + i * 3, 1.1);
  g.fillStyle(BRONZE, 1); g.fillRect(x + 7, y - 54, 10, 2);
  glow(g, x + 12, y - 44, 30, GLOW, 0.05, 3);
}

/**
 * Mabyn Ringwell's stall: a plank counter under a rock shelf, a rack of little chimes strung on
 * cord, glowworm jars on the shelf, a slate price board, a fish basket for the pool's catch.
 */
export function chimeStall(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 200, 24, 0.4);
  // The rock shelf behind it.
  g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x, y - 80, 110, 50, rng, 14), true);
  g.fillStyle(ROCK, 1); g.fillEllipse(x - 10, y - 96, 170, 40);
  // The shelf ledge with jars.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 86, y - 84, 172, 6);
  g.fillStyle(PLANK_LIT, 1); g.fillRect(x - 86, y - 86, 172, 3);
  for (let i = 0; i < 7; i++) {
    const jx = x - 74 + i * 24;
    g.fillStyle(0x9ab8c0, 0.4); g.fillRoundedRect(jx - 6, y - 104, 12, 18, 4);
    g.fillStyle(BRONZE, 1); g.fillRect(jx - 5, y - 106, 10, 3);
    g.fillStyle(i % 3 ? GLOW : LAMP, 0.85); g.fillCircle(jx - 1, y - 96, 1.4); g.fillCircle(jx + 2, y - 92, 1.2);
  }
  // Rack of chimes hung on cord between two poles.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 92, y - 78, 4, 78); g.fillRect(x + 88, y - 78, 4, 78);
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - 90, y - 74, x + 90, y - 72);
  for (let i = 0; i < 11; i++) {
    const cx = x - 80 + i * 16, len = 12 + ((i * 7) % 5) * 4;
    g.lineStyle(0.8, ROPE_DARK, 1); g.lineBetween(cx, y - 73, cx, y - 68);
    g.fillStyle(i % 2 ? SILVER : BRONZE, 1); g.fillRect(cx - 1.5, y - 68, 3, len);
    g.fillStyle(i % 2 ? SILVER_LIT : BRONZE_LIT, 0.8); g.fillRect(cx - 1.5, y - 68, 1, len);
  }
  // The counter.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 80, y - 30, 160, 30);
  g.fillStyle(PLANK, 1); g.fillRect(x - 78, y - 28, 156, 26);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, PLANK_DARK, 0.7); g.lineBetween(x - 78 + k * 26, y - 28, x - 78 + k * 26, y - 2); }
  g.fillStyle(PLANK_LIT, 1); g.fillRect(x - 82, y - 34, 164, 6);
  // Wares on the counter: a conch, a lantern, a coil of silk.
  g.fillStyle(FLOW_LIT, 1); g.fillEllipse(x - 50, y - 38, 18, 10); g.fillStyle(0xf0c8d8, 1); g.fillEllipse(x - 54, y - 38, 7, 5);
  g.fillStyle(GLOW, 0.8); g.fillRoundedRect(x - 10, y - 46, 10, 12, 3); g.fillStyle(BRONZE, 1); g.fillRect(x - 11, y - 48, 12, 2);
  g.fillStyle(RIBBON, 1); g.fillCircle(x + 34, y - 38, 6); g.fillStyle(0xd8d8d0, 1); g.fillCircle(x + 34, y - 38, 2.5);
  // Slate price board.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x + 54, y - 64, 30, 24);
  g.fillStyle(0x2a2e34, 1); g.fillRect(x + 56, y - 62, 26, 20);
  g.lineStyle(0.8, PAPER, 0.8); for (let k = 0; k < 4; k++) g.lineBetween(x + 59, y - 58 + k * 4, x + 59 + 10 + ((k * 5) % 9), y - 58 + k * 4);
  // A fish basket at the foot.
  g.fillStyle(ROPE_DARK, 1); g.fillEllipse(x + 100, y - 6, 26, 14);
  g.fillStyle(ROPE, 1); g.fillEllipse(x + 100, y - 9, 24, 10);
  g.fillStyle(SILVER, 1); g.fillEllipse(x + 96, y - 11, 10, 4); g.fillStyle(GLOW_SOFT, 1); g.fillEllipse(x + 104, y - 10, 9, 3);
}

/**
 * The Whispering Gallery's floor (ground): an elliptical court of polished flowstone ringed by a
 * low carved bench, its two foci set with bronze ear-plates; lines of the old geometry cut in.
 */
export function galleryFloor(g: G, cx: number, cy: number, rx: number, ry: number): void {
  g.fillStyle(FLOW_DARK, 1); g.fillEllipse(cx, cy + 6, rx * 2 + 24, ry * 2 + 20);
  g.fillStyle(FLOW, 1); g.fillEllipse(cx, cy, rx * 2 + 16, ry * 2 + 14);
  g.fillStyle(mixC(FLOW_LIT, FLOOR_LIT, 0.35), 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
  g.fillStyle(FLOW_LIT, 0.25); g.fillEllipse(cx - rx * 0.3, cy - ry * 0.4, rx * 1.1, ry * 0.5);
  // Concentric confocal rings.
  for (let k = 1; k < 4; k++) { g.lineStyle(1, FLOW_DARK, 0.4); g.strokeEllipse(cx, cy, rx * 2 * (k / 4), ry * 2 * (k / 4)); }
  const c = Math.sqrt(rx * rx - ry * ry);
  g.lineStyle(1.2, BRONZE_DARK, 0.6); g.lineBetween(cx - rx, cy, cx + rx, cy);
  for (const k of [-1, 1]) {
    const fx = cx + k * c;
    g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(fx, cy + 1, 34, 14);
    g.fillStyle(BRONZE, 1); g.fillEllipse(fx, cy, 30, 11);
    g.lineStyle(1.5, BRONZE_DARK, 1); g.beginPath(); g.arc(fx, cy, 6, -Math.PI * 0.6, Math.PI * 0.7, false); g.strokePath();
    g.fillStyle(BRONZE_LIT, 0.8); g.fillEllipse(fx - 6, cy - 2, 8, 2);
    // Lines from each focus to points of the rim — the echo's path, cut in.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      g.lineStyle(0.8, FLOW_DARK, 0.3);
      g.lineBetween(fx, cy, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
  }
}

/** The low carved bench round the gallery's rim, as pieces along the back half (drawn upright). */
export function galleryBench(g: G, x: number, y: number, w: number): void {
  g.fillStyle(FLOW_DARK, 1); g.fillRect(x - w / 2, y - 14, w, 14);
  g.fillStyle(FLOW, 1); g.fillRect(x - w / 2, y - 16, w, 6);
  g.fillStyle(FLOW_LIT, 0.8); g.fillRect(x - w / 2, y - 16, w, 2);
  for (let k = 0; k < w / 20; k++) { g.lineStyle(1, FLOW_DARK, 0.6); g.lineBetween(x - w / 2 + k * 20, y - 10, x - w / 2 + k * 20, y); }
}

/** A coil of rope, the ropewright's stock. */
export function ropeCoil(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 1, 28 * s, 8 * s);
  for (let k = 0; k < 4; k++) {
    g.lineStyle(3 * s, k % 2 ? ROPE_DARK : ROPE, 1);
    g.strokeEllipse(x, y - 4 * s - k * 2.5 * s, (24 - k * 3) * s, (10 - k) * s);
  }
  g.lineStyle(2 * s, ROPE, 1); g.lineBetween(x + 10 * s, y - 6 * s, x + 18 * s, y);
}

/** A glowworm's silk thread: a hanging line beaded with sticky drops, its worm lit at the top. */
export function wormThread(g: G, x: number, topY: number, len: number, t: number, seed: number): void {
  const sway = Math.sin(t * 0.8 + seed) * 2;
  g.lineStyle(0.8, GLOW_SOFT, 0.35); g.lineBetween(x, topY, x + sway, topY + len);
  for (let k = 1; k < 6; k++) {
    const yy = topY + (len * k) / 6;
    const tw = 0.4 + Math.sin(t * 2.5 + seed + k) * 0.3;
    g.fillStyle(GLOW, tw); g.fillCircle(x + (sway * k) / 6, yy, 1.1);
  }
  g.fillStyle(GLOW, 0.9); g.fillCircle(x, topY, 2);
  g.fillStyle(lit(GLOW, 0.5), 0.6); g.fillCircle(x, topY, 1);
}

/** A tiny flying bat silhouette, wings at `flap` (0..1). */
export function bat(g: G, x: number, y: number, s: number, flap: number, eye = 0xff5050): void {
  const wy = (flap - 0.5) * 8 * s;
  g.fillStyle(BAT, 1);
  g.fillTriangle(x, y, x - 12 * s, y + wy, x - 5 * s, y + 3 * s);
  g.fillTriangle(x, y, x + 12 * s, y + wy, x + 5 * s, y + 3 * s);
  g.fillTriangle(x - 12 * s, y + wy, x - 8 * s, y + wy + 3 * s, x - 5 * s, y + 3 * s);
  g.fillTriangle(x + 12 * s, y + wy, x + 8 * s, y + wy + 3 * s, x + 5 * s, y + 3 * s);
  g.fillEllipse(x, y + 1 * s, 5 * s, 7 * s);
  g.fillTriangle(x - 2.5 * s, y - 2 * s, x - 1 * s, y - 2 * s, x - 2 * s, y - 5 * s);
  g.fillTriangle(x + 2.5 * s, y - 2 * s, x + 1 * s, y - 2 * s, x + 2 * s, y - 5 * s);
  g.fillStyle(eye, 0.95); g.fillCircle(x - 1.2 * s, y - 0.5 * s, 0.8 * s); g.fillCircle(x + 1.2 * s, y - 0.5 * s, 0.8 * s);
}

/** An eighth note as a projectile: a lit head, a stem and a flag, turned along its flight. */
export function noteShot(g: G, x: number, y: number, r: number, a: number, color: number, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  g.fillStyle(dim(color, 0.4), alpha); g.fillEllipse(x + 1, y + 1, r * 2.4, r * 1.8);
  g.fillStyle(color, alpha); g.fillEllipse(x, y, r * 2.2, r * 1.6);
  g.fillStyle(lit(color, 0.6), alpha * 0.8); g.fillEllipse(x - r * 0.4, y - r * 0.3, r * 0.8, r * 0.5);
  // Stem trails behind the flight, the flag curls off it.
  const sx = x + r * 0.9, sy = y;
  const ex = sx - ux * r * 3.2, ey = sy - uy * r * 3.2 - r * 1.6;
  g.lineStyle(Math.max(1, r * 0.35), color, alpha); g.lineBetween(sx, sy, ex, ey);
  g.lineStyle(Math.max(1, r * 0.3), color, alpha * 0.9); g.lineBetween(ex, ey, ex + r * 1.4, ey + r * 1.4);
}

/** A sound-ring arc: three thin concentric arcs, the classic "it rang" mark. */
export function soundArcs(g: G, x: number, y: number, r: number, a: number, spread: number, color: number, alpha: number): void {
  for (let k = 0; k < 3; k++) {
    g.lineStyle(2 - k * 0.5, color, alpha * (1 - k * 0.25));
    g.beginPath(); g.arc(x, y, r + k * 7, a - spread, a + spread, false); g.strokePath();
  }
}

/** A paper hymn sheet lying on the floor, stave lines and notes. */
export function hymnSheet(g: G, x: number, y: number, rot: number): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pt = (dx: number, dy: number) => P(x + dx * c - dy * s, y + dx * s + dy * c);
  g.fillStyle(dim(PAPER, 0.25), 0.9); g.fillPoints([pt(-9, -6), pt(9, -6), pt(9, 7), pt(-9, 7)], true);
  g.fillStyle(PAPER, 1); g.fillPoints([pt(-9, -7), pt(9, -7), pt(9, 6), pt(-9, 6)], true);
  g.lineStyle(0.6, INK, 0.6);
  for (let k = 0; k < 5; k++) { const a = pt(-7, -4 + k * 2), b = pt(7, -4 + k * 2); g.lineBetween(a.x, a.y, b.x, b.y); }
}

/** Reprise's silver mark used on signs and the court's decoration: a repeat sign in a ring. */
export function repriseSeal(g: G, x: number, y: number, r: number): void {
  g.fillStyle(REPRISE_DARK, 1); g.fillCircle(x, y, r + 2);
  g.fillStyle(REPRISE, 1); g.fillCircle(x, y, r);
  g.lineStyle(1, REPRISE_LIT, 0.8); g.strokeCircle(x, y, r * 0.8);
  repeatSign(g, x - r * 0.12, y, r * 1.1, SILVER_LIT, 1);
}

/** A sign post: a slab of flowstone on a stub, a bronze ear bolted to the top. */
export function caveSign(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 34, 8);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 2, y - 30, 4, 30);
  g.fillStyle(FLOW_DARK, 1); g.fillRoundedRect(x - 18, y - 46, 36, 20, 4);
  g.fillStyle(FLOW, 1); g.fillRoundedRect(x - 17, y - 47, 34, 18, 4);
  g.lineStyle(0.8, INK, 0.7); for (let k = 0; k < 3; k++) g.lineBetween(x - 12, y - 42 + k * 4, x + 12, y - 42 + k * 4);
  g.fillStyle(BRONZE, 1); g.fillEllipse(x + 12, y - 48, 7, 9);
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(x + 12, y - 48, 3, 5);
}

/** Pale cave-cress and mushrooms where the drip keeps a patch of floor wet. */
export function cressPatch(g: G, x: number, y: number, rng: () => number): void {
  for (let i = 0; i < 9; i++) {
    const px = x + (rng() - 0.5) * 40, py = y + (rng() - 0.5) * 14;
    g.lineStyle(1, 0x8ab8a0, 0.8); g.lineBetween(px, py, px + (rng() - 0.5) * 4, py - 6);
    g.fillStyle(0xb8e0c8, 0.8); g.fillCircle(px, py - 6, 1.4);
  }
  for (let i = 0; i < 3; i++) {
    const px = x + (rng() - 0.5) * 30, py = y + (rng() - 0.5) * 8;
    g.fillStyle(0xe0d8c8, 1); g.fillRect(px - 0.8, py - 5, 1.6, 5);
    g.fillStyle(GLOW_SOFT, 0.7); g.fillEllipse(px, py - 5, 6, 3);
  }
}

/** A stacked crate pile with a bell on top — the court's way of saying "goods". */
export function chimeCrates(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 14);
  for (const [dx, dy, s] of [[-14, 0, 1], [14, 0, 0.9], [0, -22, 0.85]] as [number, number, number][]) {
    const w = 26 * s;
    g.fillStyle(PLANK_DARK, 1); g.fillRect(x + dx - w / 2, y + dy - w, w, w);
    g.fillStyle(PLANK, 1); g.fillRect(x + dx - w / 2 + 1.5, y + dy - w + 1.5, w - 3, w - 3);
    g.lineStyle(1.2, PLANK_DARK, 1); g.lineBetween(x + dx - w / 2, y + dy - w, x + dx + w / 2, y + dy); g.lineBetween(x + dx + w / 2, y + dy - w, x + dx - w / 2, y + dy);
  }
  g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(x - 6, y - 44, x + 6, y - 44, x, y - 54);
  g.fillStyle(BRONZE, 1); g.fillEllipse(x, y - 44, 14, 4);
}

/** Cliff overhang along the north wall: a lip of rock with stalactites hanging off it. */
export function northCliff(g: G, x0: number, x1: number, y: number, rng: () => number): void {
  g.fillStyle(ROCK_DEEP, 1); g.fillRect(x0, y - 90, x1 - x0, 90);
  for (let x = x0; x < x1; x += 30 + rng() * 30) {
    const s = 30 + rng() * 30;
    g.fillStyle(ROCK_DARK, 1); g.fillPoints(lumpPts(x, y - 40, s, 36, rng, 9), true);
    g.fillStyle(ROCK, 1); g.fillPoints(lumpPts(x - 4, y - 48, s * 0.8, 26, rng, 9), true);
    g.fillStyle(ROCK_LIT, 0.4); g.fillEllipse(x - 10, y - 60, s * 0.6, 8);
  }
  for (let x = x0 + 10; x < x1; x += 14 + rng() * 22) {
    const len = 10 + rng() * 30;
    g.fillStyle(FLOW_DARK, 1); g.fillTriangle(x - 4, y - 14, x + 4, y - 14, x, y - 14 + len);
    g.fillStyle(FLOW, 0.9); g.fillTriangle(x - 2.5, y - 14, x + 1.5, y - 14, x - 0.5, y - 16 + len);
  }
  g.fillStyle(FLOOR_DARK, 0.6); g.fillRect(x0, y - 4, x1 - x0, 6);
  g.fillStyle(SILVER_DARK, 0.2); g.fillRect(x0, y - 16, x1 - x0, 2);
}

/** A hanging rope ladder / boardwalk edge decoration: a coil of light — used for the cave choirs. */
export function choirStall(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w + 20, 16);
  for (let row = 0; row < 3; row++) {
    const yy = y - row * 12, ww = w - row * 18;
    g.fillStyle(FLOW_DARK, 1); g.fillRect(x - ww / 2, yy - 10, ww, 10);
    g.fillStyle(FLOW, 1); g.fillRect(x - ww / 2, yy - 12, ww, 4);
    // Hymn sheets left on the steps.
    for (let k = 0; k < ww / 28; k++) if (rng() < 0.5) { g.fillStyle(PAPER, 0.9); g.fillRect(x - ww / 2 + 6 + k * 28, yy - 13, 8, 3); }
  }
}

/** A drip from the roof landing: animated — call per frame with the scene time in seconds. */
export function drip(g: G, x: number, groundY: number, t: number, seed: number): void {
  const ph = (t * 0.6 + seed) % 1;
  if (ph < 0.75) {
    const y = groundY - 140 + (ph / 0.75) ** 2 * 140;
    g.fillStyle(SILVER_LIT, 0.8); g.fillEllipse(x, y, 2, 4);
  } else {
    const k = (ph - 0.75) / 0.25;
    g.lineStyle(1, POOL_LIT, 0.6 * (1 - k)); g.strokeEllipse(x, groundY, 6 + k * 18, 2 + k * 6);
  }
}

