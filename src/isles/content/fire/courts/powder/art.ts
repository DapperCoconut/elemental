import type Phaser from 'phaser';
import { barrel, brandSigil, dim, lit, shadow } from '../../../../art/IsleArt';
import { P, drawKeg } from './util';

/**
 * Set pieces for the Powder Court's world map. Each draws in world space with `x,y` at its base
 * line (the depth it sorts at). Nothing here is shared with another court: the star-fort pieces —
 * earth-and-timber walls, guns on the rampart, the squat bombproof keep — are the court's look.
 */

type G = Phaser.GameObjects.Graphics;

/** A garrison gun on the rampart, seen from behind, barrel cocked out over the parapet. */
export function rampartGun(g: G, x: number, y: number, face: -1 | 1 = -1): void {
  shadow(g, x, y + 2, 64, 14);
  // Platform planks.
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 30, y - 8, 60, 10);
  g.fillStyle(P.oak, 1); g.fillRect(x - 29, y - 9, 58, 7);
  // Carriage cheeks and the two trucks (wheels).
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 16, y - 26, 32, 18);
  g.fillStyle(P.oak, 1); g.fillRect(x - 14, y - 25, 28, 15);
  for (const wx of [-15, 15]) {
    g.fillStyle(P.iron, 1); g.fillCircle(x + wx, y - 8, 7);
    g.fillStyle(P.ironLit, 1); g.fillCircle(x + wx, y - 8, 2);
  }
  // Barrel tilted toward the parapet (up the screen), a little to one side.
  const mx = x + face * 8, my = y - 58;
  g.lineStyle(15, dim(P.iron, 0.45), 1); g.lineBetween(x, y - 18, mx, my);
  g.lineStyle(11, P.iron, 1); g.lineBetween(x, y - 18, mx, my);
  g.lineStyle(3, P.ironLit, 0.7); g.lineBetween(x - 3, y - 20, mx - 3, my + 2);
  g.fillStyle(dim(P.iron, 0.5), 1); g.fillEllipse(mx, my, 14, 7);
  g.fillStyle(0x000000, 1); g.fillEllipse(mx, my, 8, 4);
  g.fillStyle(P.iron, 1); g.fillCircle(x, y - 16, 6);
  // A pyramid of shot by the wheel.
  for (let r = 0; r < 2; r++) for (let i = 0; i < 2 - r; i++) {
    g.fillStyle(P.powder, 1); g.fillCircle(x + 28 + i * 8 + r * 4, y - 4 - r * 6, 4);
  }
}

/**
 * Prince Fuse's magazine-keep: a squat five-sided bombproof bastion, earth heaped on its vaulted
 * roof and turfed over, walls splayed and buttressed, a single iron door, two vent chimneys, and
 * the court's sigil — the King's brand drawn as a powder trail curling out of a lit fuse — set into
 * the face in black iron.
 */
export function bombproofKeep(g: G, x: number, y: number, rng: () => number): void {
  const w = 320, h = 120;
  shadow(g, x, y + 8, w * 1.2, 40, 0.4);
  // Splayed stone walls: a trapezoid wider at the foot.
  const stone = 0x6a625a;
  g.fillStyle(dim(stone, 0.5), 1);
  g.fillPoints([
    { x: x - w / 2 - 6, y: y + 2 }, { x: x + w / 2 + 6, y: y + 2 },
    { x: x + w / 2 - 22, y: y - h - 4 }, { x: x - w / 2 + 22, y: y - h - 4 },
  ] as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(stone, 1);
  g.fillPoints([
    { x: x - w / 2, y }, { x: x + w / 2, y },
    { x: x + w / 2 - 24, y: y - h }, { x: x - w / 2 + 24, y: y - h },
  ] as Phaser.Types.Math.Vector2Like[], true);
  // Coursed ashlar.
  for (let row = 0; row < 7; row++) {
    const yy = y - 8 - row * 16;
    const inset = 24 * ((row * 16) / h);
    g.lineStyle(1, dim(stone, 0.35), 0.8); g.lineBetween(x - w / 2 + inset, yy, x + w / 2 - inset, yy);
    for (let k = 0; k < 12; k++) {
      const bx = x - w / 2 + inset + ((k + (row % 2) * 0.5) * (w - inset * 2)) / 12;
      g.lineBetween(bx, yy, bx, yy - 16);
    }
  }
  // Raking buttresses at the corners.
  for (const s of [-1, 1]) {
    g.fillStyle(dim(stone, 0.2), 1);
    g.fillTriangle(x + s * (w / 2 + 14), y + 2, x + s * (w / 2 - 30), y + 2, x + s * (w / 2 - 34), y - h + 10);
  }
  // Earth roof heaped over the vault, turfed, with a gun platform on top.
  g.fillStyle(dim(P.earth, 0.3), 1); g.fillEllipse(x, y - h - 2, w - 30, 64);
  g.fillStyle(P.turf, 1); g.fillEllipse(x, y - h - 8, w - 46, 54);
  g.fillStyle(lit(P.turf, 0.15), 1); g.fillEllipse(x - 40, y - h - 18, w - 160, 22);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(dim(P.turf, 0.25), 0.7);
    g.fillRect(x - w / 2 + 40 + rng() * (w - 80), y - h - 26 + rng() * 34, 2, 4);
  }
  // Vent chimneys (bombproof vents are cowled, not open flues).
  for (const vx of [-90, 90]) {
    g.fillStyle(dim(stone, 0.4), 1); g.fillRect(x + vx - 9, y - h - 50, 18, 32);
    g.fillStyle(P.iron, 1); g.fillRect(x + vx - 13, y - h - 56, 26, 8);
    g.fillStyle(0x000000, 1); g.fillRect(x + vx - 8, y - h - 48, 16, 4);
  }
  // The powder-trail sigil on the face: a fuse cord running out of a ring and burning into the brand.
  const sx = x, sy = y - h * 0.62;
  g.fillStyle(0x000000, 0.25); g.fillCircle(sx, sy, 34);
  brandSigil(g, sx, sy, 22, 0x1a1614, 1);
  g.lineStyle(3, 0x1a1614, 1);
  g.beginPath();
  g.moveTo(sx + 22, sy + 10);
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    g.lineTo(sx + 22 + t * 70, sy + 10 - Math.sin(t * Math.PI * 2) * 12 + t * 20);
  }
  g.strokePath();
  g.fillStyle(P.spark, 1); g.fillCircle(sx + 92, sy + 30, 3.5);
  // Iron door, studded, with a lintel.
  g.fillStyle(dim(stone, 0.5), 1); g.fillRect(x - 26, y - 56, 52, 56);
  g.fillStyle(P.iron, 1); g.fillRect(x - 21, y - 52, 42, 52);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    g.fillStyle(P.ironLit, 1); g.fillCircle(x - 13 + c * 13, y - 44 + r * 12, 1.8);
  }
  g.fillStyle(dim(stone, 0.2), 1); g.fillRect(x - 32, y - 62, 64, 8);
  // Loopholes either side.
  for (const lx of [-90, -55, 55, 90]) {
    g.fillStyle(0x0a0806, 1); g.fillRect(x + lx - 2, y - 72, 4, 22);
  }
  // Kegs stacked against the wall — the magazine is full.
  for (const kx of [-128, -110, 112, 130]) barrel(g, x + kx, y + 2, 10, P.oak, P.hoop);
}

/** A stretch of the fort's inner wall: a stone revetment faced with timber, topped with turf. */
export function revetment(g: G, x1: number, y1: number, x2: number, y2: number): void {
  const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const stone = 0x5f584f;
  if (vertical) {
    const x = x1, ya = Math.min(y1, y2), yb = Math.max(y1, y2);
    g.fillStyle(dim(stone, 0.45), 1); g.fillRect(x - 12, ya - 40, 24, yb - ya + 40);
    g.fillStyle(stone, 1); g.fillRect(x - 10, ya - 38, 20, yb - ya + 36);
    g.fillStyle(P.turf, 1); g.fillRect(x - 12, ya - 44, 24, 10);
    for (let y = ya; y < yb; y += 18) { g.lineStyle(1, dim(stone, 0.3), 1); g.lineBetween(x - 10, y, x + 10, y); }
  } else {
    const y = y1, xa = Math.min(x1, x2), xb = Math.max(x1, x2);
    shadow(g, (xa + xb) / 2, y + 2, xb - xa + 20, 14, 0.25);
    g.fillStyle(dim(stone, 0.45), 1); g.fillRect(xa - 2, y - 42, xb - xa + 4, 44);
    g.fillStyle(stone, 1); g.fillRect(xa, y - 40, xb - xa, 40);
    g.fillStyle(P.turf, 1); g.fillRect(xa - 4, y - 48, xb - xa + 8, 12);
    g.fillStyle(lit(P.turf, 0.15), 1); g.fillRect(xa - 4, y - 48, xb - xa + 8, 3);
    for (let x = xa; x < xb; x += 26) { g.lineStyle(1, dim(stone, 0.3), 1); g.lineBetween(x, y - 40, x, y); }
    g.lineStyle(1, dim(stone, 0.3), 1); g.lineBetween(xa, y - 20, xb, y - 20);
  }
}

/** The Quartermastery: a low timber store with a lean-to counter, crates and a hanging price board. */
export function quartermastery(g: G, x: number, y: number, rng: () => number): void {
  const w = 210, h = 92;
  shadow(g, x, y + 4, w * 1.15, 22);
  g.fillStyle(dim(P.oak, 0.5), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(P.oak, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let i = 0; i < 9; i++) { g.lineStyle(1, dim(P.oak, 0.3), 1); g.lineBetween(x - w / 2, y - h + i * 11, x + w / 2, y - h + i * 11); }
  // Lead-sheet roof, flat and heavy.
  g.fillStyle(0x4a4c52, 1); g.fillRect(x - w / 2 - 10, y - h - 14, w + 20, 16);
  g.fillStyle(0x6c707a, 1); g.fillRect(x - w / 2 - 10, y - h - 14, w + 20, 3);
  // Counter hatch with its prop.
  g.fillStyle(0x1a120c, 1); g.fillRect(x - 50, y - 62, 100, 34);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 56, y - 30, 112, 8);
  g.fillStyle(P.oak, 1); g.fillRect(x - 54, y - 78, 108, 14);
  g.lineStyle(2, P.oakDark, 1); g.lineBetween(x - 50, y - 64, x - 40, y - 30);
  // Wares inside: a row of brass and red.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 ? P.brass : P.redcoat, 0.9); g.fillRect(x - 42 + i * 15, y - 50 + (i % 3) * 3, 8, 12);
  }
  // Price board hanging off the eave.
  g.lineStyle(1, 0x2a2420, 1); g.lineBetween(x + 70, y - h - 2, x + 70, y - h + 14); g.lineBetween(x + 98, y - h - 2, x + 98, y - h + 14);
  g.fillStyle(0x2a2420, 1); g.fillRect(x + 62, y - h + 14, 44, 26);
  g.fillStyle(P.saltpetre, 0.8);
  for (let i = 0; i < 3; i++) g.fillRect(x + 67, y - h + 19 + i * 7, 20 + rng() * 12, 2);
  // Crates and a keg out front.
  for (const [cx, s] of [[-86, 12], [-64, 10], [80, 11]] as [number, number][]) {
    shadow(g, x + cx, y + 2, s * 2.2, s * 0.6);
    g.fillStyle(dim(P.oak, 0.4), 1); g.fillRect(x + cx - s, y - s * 2, s * 2, s * 2);
    g.fillStyle(lit(P.oak, 0.1), 1); g.fillRect(x + cx - s + 2, y - s * 2 + 2, s * 2 - 4, s * 2 - 4);
    g.lineStyle(1.5, dim(P.oak, 0.4), 1); g.lineBetween(x + cx - s + 2, y - s * 2 + 2, x + cx + s - 2, y - 2);
  }
  barrel(g, x + 100, y + 2, 9, P.oak, P.hoop);
}

/** The signal mast: a ship's mast planted in the yard with a yardarm, shrouds and a lookout. */
export function signalMast(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14);
  // Shrouds to the ground.
  g.lineStyle(1, 0x2a2420, 0.8);
  g.lineBetween(x, y - 190, x - 34, y); g.lineBetween(x, y - 190, x + 34, y);
  g.lineBetween(x, y - 130, x - 34, y); g.lineBetween(x, y - 130, x + 34, y);
  // Mast and yard.
  g.fillStyle(dim(P.oak, 0.4), 1); g.fillRect(x - 5, y - 230, 10, 230);
  g.fillStyle(P.oak, 1); g.fillRect(x - 4, y - 230, 7, 230);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 60, y - 196, 120, 6);
  // Crow's nest.
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 14, y - 160, 28, 12);
  g.fillStyle(P.oak, 1); g.fillRect(x - 13, y - 162, 26, 4);
  // Base: a stone collar and a cleat rack.
  g.fillStyle(0x5f584f, 1); g.fillRect(x - 14, y - 12, 28, 14);
  g.fillStyle(P.iron, 1); g.fillRect(x - 18, y - 30, 36, 3);
}

/** A long garrison barracks: whitewashed with timber framing, tiled roof, a tithe brazier at the door. */
export function barracks(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 96;
  shadow(g, x, y + 4, w * 1.08, 24);
  const wall = 0xd8cfbd;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Timber frame.
  g.lineStyle(5, P.oakDark, 1);
  for (let bx = x - w / 2; bx <= x + w / 2; bx += 60) g.lineBetween(bx, y - h, bx, y);
  g.lineBetween(x - w / 2, y - h / 2, x + w / 2, y - h / 2);
  // Tiled roof with a ridge.
  const roof = 0x7a3a2a;
  g.fillStyle(dim(roof, 0.4), 1); g.fillRect(x - w / 2 - 14, y - h - 46, w + 28, 50);
  g.fillStyle(roof, 1); g.fillRect(x - w / 2 - 10, y - h - 44, w + 20, 44);
  for (let r = 0; r < 4; r++) {
    for (let tx = x - w / 2 - 10 + (r % 2) * 8; tx < x + w / 2 + 10; tx += 16) {
      g.fillStyle(rng() < 0.3 ? dim(roof, 0.15) : lit(roof, 0.06), 1);
      g.fillRect(tx, y - h - 42 + r * 11, 14, 9);
    }
  }
  g.fillStyle(dim(roof, 0.5), 1); g.fillRect(x - w / 2 - 12, y - h - 48, w + 24, 5);
  // Windows (shuttered, red) and two doors.
  for (let wx = x - w / 2 + 30; wx < x + w / 2 - 20; wx += 60) {
    g.fillStyle(0x2a2420, 1); g.fillRect(wx - 9, y - h + 18, 18, 22);
    g.fillStyle(P.redcoat, 1); g.fillRect(wx - 16, y - h + 18, 7, 22); g.fillRect(wx + 9, y - h + 18, 7, 22);
  }
  for (const dx of [-w / 4, w / 4]) {
    g.fillStyle(P.oakDark, 1); g.fillRect(x + dx - 12, y - 36, 24, 36);
    g.fillStyle(P.brass, 1); g.fillCircle(x + dx + 6, y - 18, 2);
  }
  // Arms rack: muskets stood up against the wall.
  for (let i = 0; i < 6; i++) {
    const mx = x - 22 + i * 8;
    g.lineStyle(2, 0x3a2a1a, 1); g.lineBetween(mx, y - 4, mx + 2, y - 42);
    g.lineStyle(1, P.ironLit, 1); g.lineBetween(mx + 2, y - 42, mx + 2, y - 50);
  }
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 28, y - 18, 56, 4);
}

/** A casemate home dug into the rampart: an arched brick front, a door, and a tithe brazier. */
export function casemate(g: G, x: number, y: number, rng: () => number): void {
  const w = 120, h = 70;
  shadow(g, x, y + 3, w * 1.1, 18);
  // The earth bank it is cut into.
  g.fillStyle(P.earthDark, 1); g.fillEllipse(x, y - h + 4, w + 60, 70);
  g.fillStyle(P.turf, 1); g.fillEllipse(x, y - h - 10, w + 40, 46);
  // Brick arch front.
  const brick = 0x8a4a34;
  g.fillStyle(dim(brick, 0.4), 1); g.fillRoundedRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4, { tl: 50, tr: 50, bl: 0, br: 0 });
  g.fillStyle(brick, 1); g.fillRoundedRect(x - w / 2, y - h, w, h, { tl: 48, tr: 48, bl: 0, br: 0 });
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng() < 0.5 ? dim(brick, 0.15) : lit(brick, 0.08), 0.8);
    g.fillRect(x - w / 2 + 6 + rng() * (w - 20), y - h + 22 + rng() * (h - 28), 10, 4);
  }
  g.fillStyle(P.oakDark, 1); g.fillRoundedRect(x - 13, y - 40, 26, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
  brandSigil(g, x, y - 24, 6, 0xff7a2f, 0.9);
  g.fillStyle(0x2a2420, 1); g.fillRect(x + 26, y - 46, 16, 14);
  g.fillStyle(0xffb347, 0.85); g.fillRect(x + 28, y - 44, 12, 10);
}

/** A tithe brazier's iron basket on three legs (the fire itself is animated). */
export function titheBrazier(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.lineStyle(2, P.iron, 1);
  g.lineBetween(x - 9, y, x - 5, y - 18); g.lineBetween(x + 9, y, x + 5, y - 18); g.lineBetween(x, y + 2, x, y - 18);
  g.fillStyle(P.iron, 1); g.fillEllipse(x, y - 20, 24, 10);
  g.fillStyle(0x2a1208, 1); g.fillEllipse(x, y - 22, 18, 6);
}

/** A gatehouse pier: squared stone, a brass lamp bracket, a pennant socket. */
export function gatePier(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14);
  const stone = 0x6a625a;
  g.fillStyle(dim(stone, 0.45), 1); g.fillRect(x - 20, y - 110, 40, 110);
  g.fillStyle(stone, 1); g.fillRect(x - 18, y - 108, 36, 106);
  for (let r = 0; r < 6; r++) { g.lineStyle(1, dim(stone, 0.3), 1); g.lineBetween(x - 18, y - 18 - r * 16, x + 18, y - 18 - r * 16); }
  g.fillStyle(dim(stone, 0.2), 1); g.fillRect(x - 24, y - 118, 48, 12);
  // A cannonball finial — every gate in the court wears one.
  g.fillStyle(P.powder, 1); g.fillCircle(x, y - 126, 10);
  g.fillStyle(P.ironLit, 0.6); g.fillCircle(x - 3, y - 129, 3);
  g.fillStyle(P.brass, 1); g.fillRect(x - 3, y - 76, 6, 10);
}

/** A rack of powder kegs: two tiers on timber chocks, lying down, stencilled, with a tarp half off. */
export function kegRack(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 130, 20);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 58, y - 6, 116, 8);
  for (let i = 0; i < 4; i++) drawKeg(g, x - 42 + i * 28, y - 16, 12, 0, rng() * 3);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 46, y - 32, 92, 5);
  for (let i = 0; i < 3; i++) drawKeg(g, x - 28 + i * 28, y - 42, 12, 0, rng() * 3);
  drawKeg(g, x - 14 + (rng() < 0.5 ? 0 : 28), y - 66, 12, 0, rng() * 3);
  // Tarpaulin thrown half over the top tier.
  g.fillStyle(0x5a5a3a, 0.95);
  g.fillTriangle(x - 52, y - 30, x + 6, y - 82, x + 30, y - 34);
  g.fillStyle(lit(0x5a5a3a, 0.15), 0.9); g.fillTriangle(x - 40, y - 36, x + 2, y - 76, x + 8, y - 44);
  // Chalk tally on the chock.
  g.fillStyle(P.saltpetre, 0.7);
  for (let i = 0; i < 5; i++) g.fillRect(x + 20 + i * 4, y - 4, 1.5, 6);
}

/** A straw butt on a frame with a painted bullseye, shot full of holes. */
export function strawTarget(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 46, 12);
  g.lineStyle(3, P.oakDark, 1); g.lineBetween(x - 14, y, x - 10, y - 50); g.lineBetween(x + 14, y, x + 10, y - 50);
  g.fillStyle(0xc8a85a, 1); g.fillCircle(x, y - 46, 22);
  g.fillStyle(0xd8bb6a, 1); g.fillCircle(x - 3, y - 49, 18);
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    g.lineStyle(1, 0x8a6a2a, 0.7); g.lineBetween(x + Math.cos(a) * 8, y - 46 + Math.sin(a) * 8, x + Math.cos(a) * 21, y - 46 + Math.sin(a) * 21);
  }
  g.fillStyle(P.saltpetre, 1); g.fillCircle(x, y - 46, 13);
  g.fillStyle(P.redcoat, 1); g.fillCircle(x, y - 46, 9);
  g.fillStyle(P.saltpetre, 1); g.fillCircle(x, y - 46, 5);
  g.fillStyle(P.redcoat, 1); g.fillCircle(x, y - 46, 2);
  for (let i = 0; i < 7; i++) {
    g.fillStyle(0x1a120c, 1); g.fillCircle(x - 15 + rng() * 30, y - 60 + rng() * 28, 1.5);
  }
}

/** The range master's tower: a timber lookout on stilts with a red range flag. */
export function rangeTower(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 16);
  g.lineStyle(5, P.oakDark, 1);
  g.lineBetween(x - 24, y, x - 18, y - 90); g.lineBetween(x + 24, y, x + 18, y - 90);
  g.lineStyle(2, P.oak, 1);
  g.lineBetween(x - 22, y - 10, x + 20, y - 60); g.lineBetween(x + 22, y - 10, x - 20, y - 60);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 30, y - 104, 60, 16);
  g.fillStyle(P.oak, 1); g.fillRect(x - 28, y - 120, 56, 18);
  g.fillStyle(0x4a4c52, 1); g.fillTriangle(x - 36, y - 120, x + 36, y - 120, x, y - 146);
  g.fillStyle(0x1a120c, 1); g.fillRect(x - 18, y - 116, 36, 8);
  g.lineStyle(2, P.iron, 1); g.lineBetween(x + 30, y - 120, x + 30, y - 170);
}

/** A run of filled sandbags, stacked three high in staggered courses. */
export function sandbagLine(g: G, x1: number, y: number, x2: number): void {
  const xa = Math.min(x1, x2), xb = Math.max(x1, x2);
  shadow(g, (xa + xb) / 2, y + 2, xb - xa + 20, 14, 0.28);
  for (let row = 0; row < 3; row++) {
    for (let x = xa + (row % 2) * 12; x < xb; x += 24) {
      const yy = y - 6 - row * 10;
      g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x, yy + 2, 26, 13);
      g.fillStyle(P.sandbag, 1); g.fillEllipse(x, yy, 24, 11);
      g.fillStyle(lit(P.sandbag, 0.15), 1); g.fillEllipse(x - 3, yy - 2, 12, 4);
      g.lineStyle(1, dim(P.sandbag, 0.3), 1); g.lineBetween(x + 8, yy - 4, x + 8, yy + 4);
    }
  }
}

/** An ammunition limber: a two-wheeled cart with a powder chest and a red flag on a stick. */
export function powderCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 18);
  g.lineStyle(4, P.oakDark, 1); g.lineBetween(x - 70, y - 10, x - 26, y - 18);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 32, y - 44, 64, 28);
  g.fillStyle(0x3a4a2a, 1); g.fillRect(x - 30, y - 50, 60, 30);
  g.fillStyle(lit(0x3a4a2a, 0.2), 1); g.fillRect(x - 30, y - 50, 60, 5);
  g.fillStyle(P.saltpetre, 0.8); g.fillRect(x - 6, y - 40, 12, 10);
  for (const wx of [-24, 24]) {
    g.lineStyle(4, P.oakDark, 1); g.strokeCircle(x + wx, y - 12, 13);
    g.lineStyle(2, P.oak, 1);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4;
      g.lineBetween(x + wx - Math.cos(a) * 12, y - 12 - Math.sin(a) * 12, x + wx + Math.cos(a) * 12, y - 12 + Math.sin(a) * 12);
    }
  }
  g.lineStyle(1.5, P.oakDark, 1); g.lineBetween(x + 26, y - 50, x + 26, y - 82);
  g.fillStyle(P.redcoat, 1); g.fillTriangle(x + 26, y - 82, x + 26, y - 70, x + 44, y - 76);
}

/** The cooper's bench: a shaving horse, a half-raised keg in its truss hoop, and a pile of staves. */
export function cooperBench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 18);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 44, y - 20, 50, 7);
  g.lineStyle(3, P.oakDark, 1); g.lineBetween(x - 40, y - 14, x - 44, y); g.lineBetween(x, y - 14, x + 4, y);
  // Raised keg: staves splayed at the top, held by a truss hoop.
  for (let i = 0; i < 7; i++) {
    const bx = x + 24 + (i - 3) * 5;
    g.lineStyle(4, i % 2 ? P.oak : lit(P.oak, 0.1), 1);
    g.lineBetween(bx, y, bx + (i - 3) * 2, y - 36);
  }
  g.lineStyle(2.5, P.hoop, 1); g.lineBetween(x + 6, y - 6, x + 42, y - 6);
  // Loose staves.
  for (let i = 0; i < 4; i++) {
    g.lineStyle(3, P.oak, 1); g.lineBetween(x - 40 + i * 6, y + 6, x - 16 + i * 6, y + 2);
  }
}
