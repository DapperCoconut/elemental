import type Phaser from 'phaser';
import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, groundFill, lit, stroke } from '../../../../art/IsleArt';
import {
  bollard, brazierPiece, capsizedHull, chandlery, frozenCrane, frozenFountain, harbourHouse, iceGallery,
  icePalace, icedShip, pressureRidge, rimebiter, rinkLantern, shanty, snowFort, soupCart, thawHouse, warehouse,
} from './art';
import { RIMEFAST_CROWD, RIMEFAST_NPCS } from './npcs';
import { R, drawBrazierFlame, drawBreath, drawDrift, drawGlint, drawHole, jit } from './util';

/**
 * THE RIMEFAST COURT — a harbour the Queen froze solid so no ship could leave.
 *
 * Layout (2400×1600): the frozen basin fills the middle and east, walled by stone quays on three
 * sides and shut at the east by a pressure ridge where the harbour mouth froze. The town hugs the
 * west quay — narrow houses (some with their doors sealed under ice for debt), Gimlet's chandlery,
 * Burgoo's soup cart and the frozen market square with its licensed braziers — and runs along the
 * south quay in warehouses to the road for Slickharbor. Hoarfrost's icicle palace stands on the
 * north shore with its gallery to the west; below its steps, out on the ice, the Tithe Hole.
 *
 * Out on the basin: the iced-in brig *Merrow's Promise*, the Queen's revenue cutter, Floe's
 * icebreaker against the ridge, a capsized hull, Brisa's swept rink, the children's snow forts,
 * and Old Tom's fishing holes between two shanties.
 */

type G = Phaser.GameObjects.Graphics;

const W = 2400;
const H = 1600;

/** The frozen basin. */
const BASIN: Rect = { x: 730, y: 424, w: 1530, h: 832 };
const QUAY = 22;
/** The fishing holes and the rect the engine casts into. */
const HOLES: Pt[] = [{ x: 1400, y: 862 }, { x: 1472, y: 850 }, { x: 1544, y: 866 }];
const FISHING: Rect = { x: 1366, y: 830, w: 212, h: 58 };
const TITHE_HOLE: Pt = { x: 1760, y: 560 };
const RINK = { x: 1150, y: 1010, rx: 175, ry: 82 };
const MARKET: Rect = { x: 300, y: 960, w: 320, h: 220 };
const BRAZIERS: Pt[] = [{ x: 345, y: 995 }, { x: 575, y: 995 }, { x: 345, y: 1150 }, { x: 575, y: 1150 }];
const PALACE = { x: 1560, y: 360 };
const GALLERY = { x: 1100, y: 392, w: 360 };
const BRIG = { x: 1030, y: 732, len: 300 };
const CUTTER = { x: 1850, y: 682, len: 220 };
const BREAKER = { x: 2080, y: 902 };
const CAPSIZED = { x: 1600, y: 1182 };
const FORTS = [{ x: 1850, y: 1180, f: 1 as const }, { x: 2075, y: 1180, f: -1 as const }];
const CRANE = { x: 2120, y: 1340 };
const CHANDLERY = { x: 330, y: 640 };
const CART = { x: 590, y: 846 };
const THAW = { x: 500, y: 1300 };
const NW_HOUSES: { x: number; w: number; h: number; wall: number; roof: number; iced?: boolean; lit?: boolean }[] = [
  { x: 110, w: 110, h: 130, wall: 0x6a7a8a, roof: 0x3a3a48, lit: true },
  { x: 250, w: 120, h: 150, wall: 0x8a6a5a, roof: 0x4a3030, iced: true },
  { x: 390, w: 110, h: 120, wall: 0x5a6a5a, roof: 0x2e3a36, iced: true },
  { x: 530, w: 120, h: 140, wall: 0x7a6a8a, roof: 0x3a3048, lit: true },
  { x: 655, w: 96, h: 118, wall: 0x8a7a62, roof: 0x4a3a2a, iced: true },
];
const SW_HOUSES: { x: number; w: number; h: number; wall: number; roof: number; iced?: boolean; lit?: boolean }[] = [
  { x: 110, w: 110, h: 126, wall: 0x6a5a6a, roof: 0x30303a, iced: true },
  { x: 250, w: 110, h: 140, wall: 0x5a7080, roof: 0x2a3440, lit: true },
];
const HOUSE_Y = 330;
const SW_HOUSE_Y = 1300;
const WAREHOUSES = [{ x: 900, w: 180 }, { x: 1500, w: 200 }, { x: 1820, w: 170 }];
const WAREHOUSE_Y = 1452;
const SHANTIES = [{ x: 1322, y: 836, c: 0x8a3a2a }, { x: 1622, y: 856, c: 0x3a5a6a }];
const LANTERNS: Pt[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.2;
  return { x: RINK.x + Math.cos(a) * (RINK.rx + 18), y: RINK.y + Math.sin(a) * (RINK.ry + 14) };
});
const RIDGE_X = 2330;

const inView = (v: Rect, x: number, y: number, pad = 140): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // Snow over everything first: trodden blue-white with drifts.
  groundFill(g, { x: 0, y: 0, w: W, h: H }, 0xdfe8f0, 0xeef4f8, 0x8a9aaa, rng, 1.1);
  for (let i = 0; i < 30; i++) blob(g, rng() * W, rng() * H, 70 + rng() * 140, 30 + rng() * 60, 0xf6fafc, 0.5, rng);

  // ── The frozen basin ──
  g.fillStyle(R.ice, 1); g.fillRect(BASIN.x, BASIN.y, BASIN.w, BASIN.h);
  for (let i = 0; i < 60; i++) {
    const x = BASIN.x + rng() * BASIN.w, y = BASIN.y + rng() * BASIN.h;
    g.fillStyle(rng() < 0.55 ? R.iceDeep : R.iceLit, 0.18 + rng() * 0.22);
    g.fillEllipse(x, y, 160 + rng() * 320, 50 + rng() * 120);
  }
  // Black-ice windows: clear patches you can see down through, with what lies under them.
  const sunk: (() => void)[] = [];
  for (let i = 0; i < 16; i++) {
    const x = BASIN.x + 80 + rng() * (BASIN.w - 160), y = BASIN.y + 60 + rng() * (BASIN.h - 120);
    const rx = 50 + rng() * 80, ry = 22 + rng() * 34;
    g.fillStyle(R.blackIce, 0.5); g.fillEllipse(x, y, rx * 2, ry * 2);
    g.fillStyle(R.water, 0.4); g.fillEllipse(x + 6, y + 4, rx * 1.4, ry * 1.3);
    const kind = i % 4;
    sunk.push(() => {
      g.fillStyle(0x07141e, 0.55);
      if (kind === 0) {
        // A rowboat on the bottom.
        g.fillEllipse(x, y, 56, 18); g.fillStyle(R.blackIce, 0.6); g.fillEllipse(x, y - 1, 44, 10);
      } else if (kind === 1) {
        // An anchor and a run of chain.
        g.fillRect(x - 2, y - 14, 4, 22); g.fillTriangle(x - 12, y + 6, x + 12, y + 6, x, y + 14);
        for (let k = 0; k < 6; k++) g.fillCircle(x + 6 + k * 7, y - 14 - k * 2, 2.5);
      } else if (kind === 2) {
        // A lobster pot.
        g.fillRect(x - 12, y - 8, 24, 16); g.lineStyle(1, R.blackIce, 0.7); g.lineBetween(x - 12, y, x + 12, y);
      } else {
        // A still, pale shape that is not a fish.
        g.fillStyle(0x6a8a9a, 0.18); g.fillEllipse(x, y, 20, 40); g.fillCircle(x, y - 24, 8);
      }
    });
  }
  for (const s of sunk) s();
  // Healed pressure seams.
  for (let i = 0; i < 26; i++) {
    let x = BASIN.x + rng() * BASIN.w, y = BASIN.y + rng() * BASIN.h;
    let a = rng() * Math.PI * 2;
    for (let s = 0; s < 10; s++) {
      a += (rng() - 0.5) * 0.7;
      const nx = Math.max(BASIN.x, Math.min(BASIN.x + BASIN.w, x + Math.cos(a) * 36));
      const ny = Math.max(BASIN.y, Math.min(BASIN.y + BASIN.h, y + Math.sin(a) * 28));
      g.lineStyle(5, R.iceLit, 0.45); g.lineBetween(x, y, nx, ny);
      g.lineStyle(1.2, R.iceDark, 0.5); g.lineBetween(x, y, nx, ny);
      x = nx; y = ny;
    }
  }
  // Trapped air bubbles.
  for (let i = 0; i < 120; i++) {
    const x = BASIN.x + rng() * BASIN.w, y = BASIN.y + rng() * BASIN.h;
    for (let k = 0; k < 3 + rng() * 4; k++) { g.fillStyle(0xffffff, 0.4); g.fillCircle(x + k * 5, y - k * 3, 1 + rng() * 2); }
  }
  // Snow blown in streaks across the ice.
  for (let i = 0; i < 50; i++) {
    const x = BASIN.x + rng() * BASIN.w, y = BASIN.y + rng() * BASIN.h;
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x, y, 60 + rng() * 120, 6 + rng() * 6);
  }

  // Sled tracks from the quay ramps out to the holes, the rink and the ships.
  const sled = (pts: Pt[]) => {
    for (const off of [-7, 7]) stroke(g, pts.map((p) => ({ x: p.x, y: p.y + off })), 2, R.snowShade, 0.75);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 22);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        g.fillStyle(R.snowBlue, 0.5); g.fillEllipse(a.x + (b.x - a.x) * t + (k % 2 ? 4 : -4), a.y + (b.y - a.y) * t, 5, 3);
      }
    }
  };
  sled([{ x: 730, y: 810 }, { x: 980, y: 860 }, { x: 1250, y: 880 }, { x: 1470, y: 900 }]);
  sled([{ x: 1200, y: 1256 }, { x: 1250, y: 1130 }, { x: 1440, y: 960 }]);
  sled([{ x: 1560, y: 424 }, { x: 1600, y: 600 }, { x: 1560, y: 820 }]);
  sled([{ x: 1250, y: 680 }, { x: 1450, y: 560 }, { x: 1520, y: 430 }]);
  sled([{ x: 1700, y: 1256 }, { x: 1850, y: 1120 }, { x: 1940, y: 1000 }]);

  // Brisa's rink: an oval swept to black-blue, its circuit line painted red, skate scratches.
  g.fillStyle(R.iceDark, 0.35); g.fillEllipse(RINK.x, RINK.y, RINK.rx * 2, RINK.ry * 2);
  g.fillStyle(R.iceDeep, 0.5); g.fillEllipse(RINK.x, RINK.y, RINK.rx * 1.84, RINK.ry * 1.8);
  g.lineStyle(3, R.scarf, 0.6); g.strokeEllipse(RINK.x, RINK.y, RINK.rx * 1.6, RINK.ry * 1.5);
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, d = 0.3 + rng() * 0.6;
    const x = RINK.x + Math.cos(a) * RINK.rx * d, y = RINK.y + Math.sin(a) * RINK.ry * d;
    const t = a + Math.PI / 2 + (rng() - 0.5) * 0.4;
    g.lineStyle(1, R.iceLit, 0.6); g.lineBetween(x, y, x + Math.cos(t) * 26, y + Math.sin(t) * 12);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    drawDrift(g, RINK.x + Math.cos(a) * RINK.rx, RINK.y + Math.sin(a) * RINK.ry, 40, 12, i);
  }

  // Slush rings round the fishing holes, the Tithe Hole's ring of stakes and rope.
  for (const h of HOLES) { g.fillStyle(R.snow, 0.9); g.fillEllipse(h.x, h.y + 2, 74, 50); }
  g.fillStyle(R.snowShade, 0.9); g.fillEllipse(TITHE_HOLE.x, TITHE_HOLE.y + 4, 150, 98);
  g.fillStyle(R.snow, 1); g.fillEllipse(TITHE_HOLE.x, TITHE_HOLE.y, 132, 84);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = TITHE_HOLE.x + Math.cos(a) * 82, sy = TITHE_HOLE.y + Math.sin(a) * 54;
    g.fillStyle(R.timberDark, 1); g.fillRect(sx - 2, sy - 14, 4, 16);
    const b = (i + 1) / 12 * Math.PI * 2;
    g.lineStyle(2, R.livery, 0.9);
    g.lineBetween(sx, sy - 11, TITHE_HOLE.x + Math.cos(b) * 82, TITHE_HOLE.y + Math.sin(b) * 54 - 11);
  }

  // ── Quays: stone walls round the basin, frost-cracked, with iron mooring rings ──
  const quay = (r: Rect) => {
    g.fillStyle(R.stoneDark, 1); g.fillRect(r.x, r.y, r.w, r.h);
    const vertical = r.h > r.w;
    const step = 28;
    if (vertical) {
      for (let y = r.y; y < r.y + r.h; y += step) {
        g.fillStyle(rng() < 0.5 ? R.stone : lit(R.stone, 0.06), 1); g.fillRect(r.x + 2, y + 2, r.w - 4, step - 3);
      }
    } else {
      for (let x = r.x; x < r.x + r.w; x += step * 1.6) {
        g.fillStyle(rng() < 0.5 ? R.stone : lit(R.stone, 0.06), 1); g.fillRect(x + 2, r.y + 2, step * 1.6 - 3, r.h - 4);
      }
    }
    // Frost-cracks, opened by the ice heaving against the stone.
    for (let i = 0; i < (vertical ? r.h : r.w) / 60; i++) {
      const cx = vertical ? r.x + r.w / 2 : r.x + rng() * r.w, cy = vertical ? r.y + rng() * r.h : r.y + r.h / 2;
      let px = cx, py = cy;
      for (let k = 0; k < 4; k++) {
        const nx = px + (vertical ? (rng() - 0.5) * 18 : (rng() - 0.5) * 30), ny = py + (vertical ? (rng() - 0.5) * 30 : (rng() - 0.5) * 18);
        g.lineStyle(1.5, 0x1a2028, 0.8); g.lineBetween(px, py, nx, ny);
        g.lineStyle(1, R.frost, 0.6); g.lineBetween(px + 1, py, nx + 1, ny);
        px = nx; py = ny;
      }
    }
    // Snow along the top lip, the ice heaped against the face.
    g.fillStyle(R.snow, 0.9);
    if (vertical) g.fillRect(r.x - 4, r.y, 6, r.h); else g.fillRect(r.x, r.y - 4, r.w, 6);
  };
  quay({ x: BASIN.x - QUAY, y: BASIN.y - QUAY, w: QUAY, h: BASIN.h + QUAY * 2 });
  quay({ x: BASIN.x, y: BASIN.y - QUAY, w: BASIN.w, h: QUAY });
  quay({ x: BASIN.x, y: BASIN.y + BASIN.h, w: BASIN.w, h: QUAY });
  // Ramps of packed snow down onto the ice where the roads meet the quay.
  for (const [x, y, w, h] of [[BASIN.x - QUAY - 6, 760, QUAY + 30, 90], [1140, BASIN.y + BASIN.h - 4, 120, QUAY + 10], [1500, BASIN.y - QUAY - 4, 120, QUAY + 10], [1660, BASIN.y + BASIN.h - 4, 90, QUAY + 10]] as [number, number, number, number][]) {
    g.fillStyle(R.snowShade, 1); g.fillRect(x, y, w, h);
    g.fillStyle(R.snow, 1); g.fillRect(x + 3, y + 3, w - 6, h - 6);
    for (let k = 0; k < 6; k++) { g.fillStyle(R.snowBlue, 0.5); g.fillEllipse(x + w * (k + 0.5) / 6, y + h / 2, 6, 3); }
  }
  // Mooring rings along the quay face.
  for (let y = BASIN.y + 40; y < BASIN.y + BASIN.h; y += 140) { g.lineStyle(2.5, R.iron, 1); g.strokeCircle(BASIN.x + 4, y, 5); }
  for (let x = BASIN.x + 60; x < BASIN.x + BASIN.w; x += 160) {
    g.lineStyle(2.5, R.iron, 1); g.strokeCircle(x, BASIN.y + BASIN.h - 4, 5); g.strokeCircle(x + 70, BASIN.y + 4, 5);
  }

  // ── The town ──
  // Trodden roads: packed grey snow, scattered with grit and boot-prints.
  const trodden = (pts: Pt[], w: number) => {
    stroke(g, pts, w + 8, R.snowShade, 1);
    stroke(g, pts, w, 0xc4ccd4, 1);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9);
      for (let k = 0; k < n; k++) {
        const t = rng();
        g.fillStyle(rng() < 0.5 ? 0x8a8a8a : 0x9a9488, 0.45);
        g.fillRect(a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.8, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.8, 2, 1.5);
      }
      for (let k = 0; k < n / 3; k++) {
        const t = k / (n / 3);
        g.fillStyle(0xa8b4c0, 0.6); g.fillEllipse(a.x + (b.x - a.x) * t + (k % 2 ? 6 : -6), a.y + (b.y - a.y) * t + (k % 2 ? 3 : -3), 6, 4);
      }
    }
  };
  trodden([{ x: -20, y: 800 }, { x: 300, y: 800 }, { x: BASIN.x - QUAY, y: 805 }], 70);
  trodden([{ x: 330, y: 790 }, { x: 330, y: 700 }], 46);
  trodden([{ x: 460, y: 800 }, { x: 460, y: 400 }, { x: 120, y: 400 }], 48);
  trodden([{ x: 460, y: 400 }, { x: 680, y: 400 }, { x: 900, y: 410 }], 44);
  trodden([{ x: 460, y: 810 }, { x: 460, y: 960 }], 52);
  trodden([{ x: 460, y: 1180 }, { x: 352, y: 1240 }, { x: 352, y: 1360 }, { x: 900, y: 1356 }, { x: 1200, y: 1340 }, { x: 1800, y: 1340 }, { x: 2200, y: 1360 }], 60);
  trodden([{ x: 1200, y: 1300 }, { x: 1200, y: H + 20 }], 70);
  trodden([{ x: 900, y: 410 }, { x: 1300, y: 412 }], 40);
  trodden([{ x: 1820, y: 400 }, { x: 2200, y: 400 }], 40);

  // The frozen market square: frosted cobbles, gutters iced over, a melted ring round each brazier.
  g.fillStyle(0x8a929a, 1); g.fillRect(MARKET.x - 6, MARKET.y - 6, MARKET.w + 12, MARKET.h + 12);
  for (let y = MARKET.y; y < MARKET.y + MARKET.h; y += 12) {
    for (let x = MARKET.x + ((y / 12) % 2) * 8; x < MARKET.x + MARKET.w; x += 16) {
      g.fillStyle(rng() < 0.5 ? 0xa8b0b8 : 0x9aa2aa, 1); g.fillRoundedRect(x + 1, y + 1, 14, 10, 3);
      if (rng() < 0.35) { g.fillStyle(R.frost, 0.6); g.fillRoundedRect(x + 1, y + 1, 14, 10, 3); }
    }
  }
  for (const b of BRAZIERS) {
    g.fillStyle(0x4a4a50, 0.5); g.fillCircle(b.x, b.y, 46);
    g.fillStyle(R.water, 0.25); g.fillCircle(b.x, b.y, 30);
  }
  // Stall frames round the square, empty under their snow.
  for (const [x, y] of [[320, 975], [600, 975], [320, 1165], [600, 1165]] as [number, number][]) {
    g.fillStyle(R.timberDark, 1); g.fillRect(x - 3, y - 3, 6, 6);
  }

  // The palace forecourt: packed, swept snow, and a blue carpet of ice to the steps.
  g.fillStyle(0xe8f0f6, 1); g.fillEllipse(PALACE.x, PALACE.y + 20, 640, 120);
  g.fillStyle(R.glassDeep, 0.35); g.fillRect(PALACE.x - 40, PALACE.y, 80, BASIN.y - PALACE.y);

  // The east: the harbour mouth froze into a pressure ridge, and the open sea beyond is ice too.
  g.fillStyle(R.iceDeep, 1); g.fillRect(BASIN.x + BASIN.w, BASIN.y - QUAY, W - BASIN.x - BASIN.w, BASIN.h + QUAY * 2);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? R.ice : R.iceDark, 0.5); g.fillEllipse(2280 + rng() * 120, BASIN.y + rng() * BASIN.h, 40 + rng() * 60, 20 + rng() * 30);
  }

  // Drifts piled against the map's edges and the quay corners.
  for (let x = 0; x < W; x += 90) { drawDrift(g, x + rng() * 40, 22, 110, 28, x); drawDrift(g, x + rng() * 40, H - 18, 110, 26, x + 1); }
  for (let y = 120; y < H; y += 90) {
    if (y > 700 && y < 900) continue;
    drawDrift(g, 18, y, 50, 70, y);
  }
  for (let y = 60; y < BASIN.y - 40; y += 80) drawDrift(g, W - 20, y, 50, 60, y + 2);
  for (let y = BASIN.y + BASIN.h + 40; y < H; y += 80) drawDrift(g, W - 20, y, 50, 60, y + 3);
  drawDrift(g, BASIN.x - 40, BASIN.y - 40, 90, 30, 7);
  drawDrift(g, BASIN.x - 40, BASIN.y + BASIN.h + 40, 90, 30, 8);
  // Footprints in deep snow in the quiet corners.
  for (let i = 0; i < 40; i++) {
    const x = 40 + rng() * 640, y = 1400 + rng() * 160;
    g.fillStyle(R.snowBlue, 0.5); g.fillEllipse(x, y, 5, 3); g.fillEllipse(x + 8, y + 4, 5, 3);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaPainter['pieces']>[number];

function pieces(): Piece[] {
  const out: Piece[] = [];
  for (const h of NW_HOUSES) {
    out.push({ x: h.x, y: HOUSE_Y, w: h.w + 30, h: h.h + h.w * 0.7, draw: (g, rng) => harbourHouse(g, h.x, HOUSE_Y, h.w, h.h, { wall: h.wall, roof: h.roof, icedShut: h.iced, lit: h.lit }, rng) });
  }
  for (const h of SW_HOUSES) {
    out.push({ x: h.x, y: SW_HOUSE_Y, w: h.w + 30, h: h.h + h.w * 0.7, draw: (g, rng) => harbourHouse(g, h.x, SW_HOUSE_Y, h.w, h.h, { wall: h.wall, roof: h.roof, icedShut: h.iced, lit: h.lit }, rng) });
  }
  out.push({ x: CHANDLERY.x, y: CHANDLERY.y, w: 280, h: 190, draw: (g, rng) => chandlery(g, CHANDLERY.x, CHANDLERY.y, rng) });
  out.push({ x: CART.x, y: CART.y, w: 100, h: 110, draw: (g) => soupCart(g, CART.x, CART.y) });
  out.push({ x: THAW.x, y: THAW.y, w: 240, h: 150, draw: (g, rng) => thawHouse(g, THAW.x, THAW.y, rng) });
  for (const b of BRAZIERS) out.push({ x: b.x, y: b.y, w: 40, h: 40, draw: (g) => brazierPiece(g, b.x, b.y) });
  for (const wh of WAREHOUSES) out.push({ x: wh.x, y: WAREHOUSE_Y, w: wh.w + 30, h: 170, draw: (g, rng) => warehouse(g, wh.x, WAREHOUSE_Y, wh.w, rng) });
  out.push({ x: CRANE.x, y: CRANE.y, w: 300, h: 200, draw: (g) => frozenCrane(g, CRANE.x, CRANE.y) });
  // North shore: the palace, its gallery, the fountain.
  out.push({ x: PALACE.x, y: PALACE.y, w: 560, h: 440, draw: (g, rng) => icePalace(g, PALACE.x, PALACE.y, rng) });
  out.push({ x: GALLERY.x, y: GALLERY.y, w: GALLERY.w + 40, h: 170, draw: (g, rng) => iceGallery(g, GALLERY.x, GALLERY.y, GALLERY.w, rng) });
  out.push({ x: 1960, y: 396, w: 130, h: 90, draw: (g) => frozenFountain(g, 1960, 396) });
  // The basin.
  out.push({ x: BRIG.x, y: BRIG.y, w: BRIG.len + 200, h: 300, draw: (g, rng) => icedShip(g, BRIG.x, BRIG.y, BRIG.len, 'brig', 1, rng) });
  out.push({ x: CUTTER.x, y: CUTTER.y, w: CUTTER.len + 180, h: 260, draw: (g, rng) => icedShip(g, CUTTER.x, CUTTER.y, CUTTER.len, 'cutter', -1, rng) });
  out.push({ x: BREAKER.x, y: BREAKER.y, w: 420, h: 220, draw: (g, rng) => rimebiter(g, BREAKER.x, BREAKER.y, -1, rng) });
  out.push({ x: CAPSIZED.x, y: CAPSIZED.y, w: 240, h: 90, draw: (g, rng) => capsizedHull(g, CAPSIZED.x, CAPSIZED.y, rng) });
  for (const s of SHANTIES) out.push({ x: s.x, y: s.y, w: 100, h: 110, draw: (g, rng) => shanty(g, s.x, s.y, s.c, rng) });
  for (const f of FORTS) out.push({ x: f.x, y: f.y, w: 140, h: 90, draw: (g) => snowFort(g, f.x, f.y, f.f > 0 ? R.scarf : 0x4a7a9a, f.f) });
  for (const l of LANTERNS) out.push({ x: l.x, y: l.y, w: 20, h: 70, draw: (g) => rinkLantern(g, l.x, l.y) });
  for (let y = BASIN.y + 20; y < BASIN.y + BASIN.h + 20; y += 92) {
    out.push({ x: RIDGE_X, y, w: 180, h: 110, draw: (g, rng) => pressureRidge(g, RIDGE_X, y, 150, rng) });
  }
  // Bollards on the quays, some with frozen lines out to the brig and the cutter.
  out.push({ x: 700, y: 700, w: 30, h: 30, draw: (g) => bollard(g, 700, 700, { x: BRIG.x - BRIG.len / 2, y: BRIG.y - 40 }) });
  out.push({ x: 700, y: 980, w: 30, h: 30, draw: (g) => bollard(g, 700, 980) });
  out.push({ x: 1740, y: 404, w: 30, h: 30, draw: (g) => bollard(g, 1740, 404, { x: CUTTER.x + CUTTER.len / 2, y: CUTTER.y - 36 }) });
  out.push({ x: 960, y: 1290, w: 30, h: 30, draw: (g) => bollard(g, 960, 1290) });
  out.push({ x: 1440, y: 1290, w: 30, h: 30, draw: (g) => bollard(g, 1440, 1290) });
  // A winch tripod over the Tithe Hole — what they lower people with.
  out.push({ x: TITHE_HOLE.x, y: TITHE_HOLE.y + 30, w: 120, h: 150, draw: (g) => titheWinch(g, TITHE_HOLE.x, TITHE_HOLE.y + 30) });
  return out;
}

/** The Tithe Hole's winch: three iced poles lashed at the top, a drum and a chair on a rope. */
function titheWinch(g: G, x: number, y: number): void {
  const top = { x, y: y - 140 };
  g.lineStyle(5, R.timberDark, 1);
  g.lineBetween(x - 60, y - 6, top.x, top.y); g.lineBetween(x + 60, y - 6, top.x, top.y); g.lineBetween(x + 14, y - 70, top.x, top.y);
  g.lineStyle(2, R.frost, 0.8); g.lineBetween(x - 58, y - 8, top.x - 1, top.y + 2); g.lineBetween(x + 58, y - 8, top.x + 1, top.y + 2);
  g.fillStyle(R.rope, 1); g.fillRect(top.x - 6, top.y - 2, 12, 8);
  // The drum and its handle on the near pole.
  g.fillStyle(R.iron, 1); g.fillCircle(x - 40, y - 46, 9);
  g.lineStyle(2, R.ironLit, 1); g.lineBetween(x - 40, y - 46, x - 52, y - 56);
  // The chair hanging on its rope above the water, empty, swinging very slightly (it is iced still).
  g.lineStyle(1.5, R.rope, 1); g.lineBetween(top.x, top.y + 6, top.x, y - 64);
  g.fillStyle(R.timber, 1); g.fillRect(x - 12, y - 64, 24, 5);
  g.fillRect(x - 12, y - 80, 3, 16); g.fillRect(x + 9, y - 80, 3, 16);
  g.fillStyle(R.snow, 1); g.fillRect(x - 12, y - 66, 24, 2);
  g.fillStyle(R.livery, 1); g.fillTriangle(top.x, top.y, top.x + 20, top.y + 6, top.x, top.y + 12);
}

// ── Animation ────────────────────────────────────────────────────────

/** Fish shadows gliding under the clear ice: each swims a slow loop of its own. */
const FISH = Array.from({ length: 14 }, (_, i) => ({
  cx: BASIN.x + 120 + jit(31, i) * (BASIN.w - 240),
  cy: BASIN.y + 80 + jit(32, i) * (BASIN.h - 160),
  rx: 60 + jit(33, i) * 120,
  ry: 20 + jit(34, i) * 40,
  sp: 0.15 + jit(35, i) * 0.25,
  ph: jit(36, i) * Math.PI * 2,
  s: 0.7 + jit(37, i) * 0.8,
}));

const painter: AreaPainter = {
  ground: paintGround,
  pieces: pieces(),

  animate(g: G, t: number, view: Rect) {
    // Fish under the ice.
    for (const f of FISH) {
      const a = t * f.sp + f.ph;
      const x = f.cx + Math.cos(a) * f.rx, y = f.cy + Math.sin(a) * f.ry;
      if (!inView(view, x, y, 40)) continue;
      const head = a + Math.PI / 2;
      const c = Math.cos(head), s = Math.sin(head);
      g.fillStyle(0x0a2232, 0.28); g.fillEllipse(x, y, 26 * f.s, 9 * f.s);
      g.fillTriangle(x - c * 13 * f.s, y - s * 5 * f.s, x - c * 22 * f.s - s * 6, y - s * 8 * f.s + c * 6, x - c * 22 * f.s + s * 6, y - s * 8 * f.s - c * 6);
    }
    // The fishing holes and the Tithe Hole: open black water, breathing.
    HOLES.forEach((h, i) => { if (inView(view, h.x, h.y)) drawHole(g, h.x, h.y, 22, t, i * 1.7); });
    if (inView(view, TITHE_HOLE.x, TITHE_HOLE.y)) {
      drawHole(g, TITHE_HOLE.x, TITHE_HOLE.y, 42, t * 0.5, 9.1);
      // Bubbles rising now and then from far below.
      const ph = (t * 0.6) % 3;
      if (ph < 1) {
        for (let i = 0; i < 3; i++) {
          g.fillStyle(R.waterLit, 0.7 * (1 - ph)); g.fillCircle(TITHE_HOLE.x - 10 + i * 10, TITHE_HOLE.y + 4 - ph * 4, 2 + i);
        }
      }
    }
    // Brazier flames on the market square.
    for (const b of BRAZIERS) if (inView(view, b.x, b.y)) drawBrazierFlame(g, b.x, b.y, t, 1);
    // Rink lanterns: a red glow on the ice under each.
    for (const l of LANTERNS) {
      if (!inView(view, l.x, l.y)) continue;
      g.fillStyle(R.scarf, 0.08 + Math.sin(t * 3 + l.x) * 0.03); g.fillCircle(l.x, l.y + 4, 34);
    }
    // Glints of light across the ice.
    for (let i = 0; i < 28; i++) {
      const x = BASIN.x + jit(41, i) * BASIN.w, y = BASIN.y + jit(42, i) * BASIN.h;
      if (!inView(view, x, y, 20)) continue;
      const k = Math.sin(t * 1.4 + i * 2.3);
      if (k > 0.85) drawGlint(g, x, y, 4 + (k - 0.85) * 30, (k - 0.85) * 5);
    }
    // The palace crown light, pulsing very slowly.
    if (inView(view, PALACE.x, PALACE.y - 300, 300)) {
      const k = 0.5 + Math.sin(t * 0.8) * 0.5;
      g.fillStyle(0x6fe6ff, 0.08 + k * 0.1); g.fillCircle(PALACE.x, PALACE.y - 370, 40 + k * 14);
    }
  },

  animateOver(g: G, t: number, view: Rect) {
    // Steam off Burgoo's cauldron — the only steam in Rimefast.
    if (inView(view, CART.x, CART.y - 80)) {
      for (let i = 0; i < 5; i++) {
        const ph = ((t * 0.4 + i * 0.2) % 1);
        g.fillStyle(0xffffff, 0.35 * (1 - ph)); g.fillCircle(CART.x + Math.sin(t * 1.5 + i) * 8 + ph * 10, CART.y - 80 - ph * 70, 6 + ph * 12);
      }
    }
    // Chimney smoke from the chandlery and the lit houses; none from the sealed ones.
    const smokes: [number, number][] = [[CHANDLERY.x + 69, CHANDLERY.y - 180], [NW_HOUSES[0].x, HOUSE_Y - 220], [NW_HOUSES[3].x, HOUSE_Y - 230], [SW_HOUSES[1].x, SW_HOUSE_Y - 225]];
    for (const [x, y] of smokes) {
      if (!inView(view, x, y, 200)) continue;
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.3 + i * 0.25) % 1);
        g.fillStyle(0xa8b0b8, 0.3 * (1 - ph)); g.fillCircle(x + ph * 24 + Math.sin(t + i) * 4, y - ph * 80, 5 + ph * 14);
      }
    }
    // Coal smoke from the Rimebiter's funnel, banked low — she is never let go cold.
    const fx = BREAKER.x + 100, fy = BREAKER.y - 58 - 110;
    if (inView(view, fx, fy, 260)) {
      for (let i = 0; i < 6; i++) {
        const ph = ((t * 0.25 + i / 6) % 1);
        g.fillStyle(0x3a3a42, 0.4 * (1 - ph)); g.fillCircle(fx + ph * 70, fy - ph * 60 + Math.sin(t + i) * 5, 9 + ph * 22);
      }
    }
    // Breath fogging off the champions' and the crowd's spots is the engine's — but the Tithe
    // Hole breathes too: a cold mist rising off the black water.
    if (inView(view, TITHE_HOLE.x, TITHE_HOLE.y)) {
      for (let i = 0; i < 4; i++) drawBreath(g, TITHE_HOLE.x - 30 + i * 18, TITHE_HOLE.y - 6, t * 0.6, i * 0.25, 0.25);
    }
    // A pennant streaming off the palace's middle spire.
    if (inView(view, PALACE.x, PALACE.y - 400, 200)) {
      const s = Math.sin(t * 3) * 5;
      g.fillStyle(R.livery, 1); g.fillTriangle(PALACE.x, PALACE.y - 412, PALACE.x, PALACE.y - 400, PALACE.x + 44, PALACE.y - 408 + s);
      g.fillStyle(R.kelp, 1); g.fillTriangle(PALACE.x + 20, PALACE.y - 409, PALACE.x + 20, PALACE.y - 404, PALACE.x + 30, PALACE.y - 406 + s * 0.6);
    }
  },
};

// ── Solids ───────────────────────────────────────────────────────────

const rect = (x: number, y: number, w: number, h: number): Solid => ({ kind: 'rect', x, y, w, h });
const circ = (x: number, y: number, r: number): Solid => ({ kind: 'circle', x, y, r });

const SOLIDS: Solid[] = [
  // Map borders (exit gaps left open: west at y 800, south at x 1200).
  rect(0, 0, W, 40),
  rect(0, 40, 26, 690), rect(0, 870, 26, H - 870),
  rect(0, H - 26, 1130, 26), rect(1270, H - 26, W - 1270, 26),
  rect(W - 26, 0, 26, H),
  // The pressure ridge that shuts the harbour mouth.
  rect(2262, BASIN.y - 10, W - 2262, BASIN.h + 20),
  // Houses, chandlery, cart, Thaw House, braziers.
  ...NW_HOUSES.map((h) => rect(h.x - h.w / 2, HOUSE_Y - 28, h.w, 28)),
  ...SW_HOUSES.map((h) => rect(h.x - h.w / 2, SW_HOUSE_Y - 28, h.w, 28)),
  rect(CHANDLERY.x - 112, CHANDLERY.y - 30, 224, 30),
  rect(CART.x - 40, CART.y - 22, 80, 20),
  rect(THAW.x - 100, THAW.y - 28, 200, 28),
  ...BRAZIERS.map((b) => circ(b.x, b.y - 4, 12)),
  // South quay warehouses and the crane.
  ...WAREHOUSES.map((wh) => rect(wh.x - wh.w / 2, WAREHOUSE_Y - 30, wh.w, 30)),
  rect(CRANE.x - 30, CRANE.y - 18, 60, 18),
  // The palace, its gallery, the fountain.
  rect(PALACE.x - 240, PALACE.y - 70, 480, 58),
  rect(PALACE.x - 240, PALACE.y - 12, 170, 12), rect(PALACE.x + 70, PALACE.y - 12, 170, 12),
  rect(GALLERY.x - GALLERY.w / 2, GALLERY.y - 26, GALLERY.w, 26),
  circ(1960, 386, 46),
  // Ships and wrecks on the ice (their hulls; masts and smoke are scenery).
  rect(BRIG.x - BRIG.len / 2 + 4, BRIG.y - 36, BRIG.len - 8, 36),
  rect(CUTTER.x - CUTTER.len / 2 + 4, CUTTER.y - 30, CUTTER.len - 8, 30),
  rect(BREAKER.x - 156, BREAKER.y - 40, 312, 40),
  rect(CAPSIZED.x - 96, CAPSIZED.y - 30, 192, 30),
  // Holes in the ice (the water is not for walking on), the shanties, the forts, the winch.
  ...HOLES.map((h) => circ(h.x, h.y + 2, 20)),
  circ(TITHE_HOLE.x, TITHE_HOLE.y + 2, 38),
  ...SHANTIES.map((s) => rect(s.x - 34, s.y - 18, 68, 18)),
  ...FORTS.map((f) => rect(f.x - 56, f.y - 26, 112, 22)),
  // Bollards.
  circ(700, 696, 9), circ(700, 976, 9), circ(1740, 400, 9), circ(960, 1286, 9), circ(1440, 1286, 9),
];

export const RIMEFAST_AREA: AreaDef = {
  id: 'rimefast',
  isle: 'water',
  court: 'rimefast',
  name: 'The Rimefast Court',
  subtitle: 'The frozen harbour — held by Prince Hoarfrost',
  w: W,
  h: H,
  bg: 0xbfd0de,
  accent: 0x9fd8f0,
  weather: 'snow',
  spawn: { x: 200, y: 800 },
  painter,
  solids: SOLIDS,
  exits: [
    { side: 'w', to: 'tidewater', at: 800, label: 'The Tide Road — to Tidewater' },
    { side: 's', to: 'slickharbor', at: 1200, label: 'The Coal Road — to Slickharbor' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 210, y: 900 } },
    { kind: 'prince', id: 'hoarfrost', at: { x: PALACE.x, y: PALACE.y + 70 } },
    { kind: 'water', id: 'rimefast-holes-water', shape: FISHING, fishery: 'rimefast-holes' },
    { kind: 'encounter', id: 'rimefast-thin-ice' },
    { kind: 'encounter', id: 'rimefast-icebreaker' },
    { kind: 'encounter', id: 'rimefast-frostbite' },
    { kind: 'encounter', id: 'rimefast-icicle-gallery' },
    { kind: 'encounter', id: 'rimefast-snow-forts' },
    { kind: 'sign', at: { x: 150, y: 730 }, text: 'RIMEFAST. Warmth by licence. Holes by licence. Leaving by licence (none issued). — H.' },
    { kind: 'sign', at: { x: 1680, y: 640 }, text: 'THE TITHE HOLE. For households in arrears of the Thaw Tithe. To the Queen\'s keeping.' },
    { kind: 'sign', at: { x: 960, y: 940 }, text: 'BRISA\'S RINK. Skates only. Glide, don\'t stamp. The ice can hear you.' },
    { kind: 'sign', at: { x: 640, y: 1220 }, text: 'Braziers on this square are LICENSED. One coin per hour of warmth. — Trapper Tarn, Licensee' },
    { kind: 'chest', id: 'rimefast-chest-crane', at: { x: 2230, y: 1500 }, coins: 90 },
    { kind: 'chest', id: 'rimefast-chest-palace', at: { x: 2080, y: 300 }, orbs: 1, open: { prince: 'hoarfrost' } },
  ],
  npcs: RIMEFAST_NPCS,
  crowd: RIMEFAST_CROWD,
};
