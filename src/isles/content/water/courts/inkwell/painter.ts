import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { G, mulberry, stroke } from '../../../../art/IsleArt';
import {
  BLUE, BLUE_DEEP, BLUE_LIT, BLUE_WASH, GREY, GREY_LIT, INK, INK_LIT, INK_SOFT, PAPER, PAPER_SHADE, WHITE,
} from './palette';
import {
  ARCHIVE, AREA_H, AREA_W, BRIDGES_X, CANAL, CUT, CUT_BRIDGES_Y, HALL, HOUSES, LAMPS, LINES, MANOR, PENS, PRESS,
  PUNTS, REACH, ROADS, SHOP, SQUARE, TOWERS, WALL_N, WALL_SEGMENTS,
} from './layout';
import {
  P, decreeSheet, hatchEllipse, hatchRect, inView, inkBlot, inkShadow, polyline, queenSeal, scribble,
} from './inkArt';

/**
 * The Inkwell Court — a scriptorium town drawn on its own page.
 *
 * Nothing here is drawn like anywhere else on the isles:
 * • The ground is ruled paper. Faint blue rule-lines run across the whole town with a double
 *   margin down the west side, and ghost handwriting shows through the bare ground between the
 *   streets, as if the town was written onto a ledger and never quite dried.
 * • Streets are flagstones drawn as toon slabs, every one outlined in ink. Shade is hatching.
 * • Canals are dead black ink with bare-paper ripple strokes riding a slow current, old decrees
 *   floating down them, and paper coping stones along the banks.
 * • Prince Blot keeps house in a giant inkwell with the quill still standing in it. The censors'
 *   towers sweep the streets with blue reading-lamps; the Queen's decrees hang drying on lines
 *   across Decree Square and flap in the canal wind.
 * • Every house wears a tide-mark — the Queen's water came this high — and the houses whose Dry
 *   Tithe went unpaid carry her blue seal nailed on the door: LEFT UNDER.
 */

// ── Ground ──────────────────────────────────────────────────────────────

/** Ruled paper across the whole map, plus the double margin and ghost handwriting. */
function ruledPaper(g: G, rng: () => number): void {
  g.fillStyle(PAPER, 1); g.fillRect(0, 0, AREA_W, AREA_H);
  // Paper fibre: tiny pale and dark flecks.
  for (let i = 0; i < 5200; i++) {
    g.fillStyle(rng() < 0.7 ? PAPER_SHADE : WHITE, 0.35 + rng() * 0.4);
    g.fillRect(rng() * AREA_W, rng() * AREA_H, 1 + rng() * 3, 1);
  }
  // Foxing: soft age-spots.
  for (let i = 0; i < 70; i++) {
    g.fillStyle(PAPER_SHADE, 0.25 + rng() * 0.25);
    g.fillEllipse(rng() * AREA_W, rng() * AREA_H, 40 + rng() * 160, 20 + rng() * 70);
  }
  // The rule-lines and the margin.
  for (let y = 60; y < AREA_H; y += 44) {
    g.lineStyle(1.2, BLUE_LIT, 0.32); g.lineBetween(0, y, AREA_W, y);
  }
  g.lineStyle(1.5, BLUE, 0.4); g.lineBetween(150, 0, 150, AREA_H);
  g.lineStyle(1, BLUE, 0.3); g.lineBetween(156, 0, 156, AREA_H);
  // Ghost handwriting resting on the rules.
  for (let i = 0; i < 120; i++) {
    const row = Math.floor(rng() * ((AREA_H - 60) / 44));
    const y = 60 + row * 44 - 6;
    scribble(g, 170 + rng() * (AREA_W - 400), y, 120 + rng() * 240, rng, INK, 0.08 + rng() * 0.07);
  }
  // Old blots soaked into the page.
  for (let i = 0; i < 46; i++) inkBlot(g, rng() * AREA_W, WALL_N + rng() * (AREA_H - WALL_N), 6 + rng() * 22, rng, INK_SOFT, 0.18 + rng() * 0.15, false);
}

/** A slab of paving: a slightly crooked quad, paper fill, ink outline, a hatch on its shadow side. */
function slab(g: G, x: number, y: number, w: number, h: number, ang: number, rng: () => number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const j = (): number => (rng() - 0.5) * 2.2;
  const pts = [
    P(x + (-w / 2) * c - (-h / 2) * s + j(), y + (-w / 2) * s + (-h / 2) * c + j()),
    P(x + (w / 2) * c - (-h / 2) * s + j(), y + (w / 2) * s + (-h / 2) * c + j()),
    P(x + (w / 2) * c - (h / 2) * s + j(), y + (w / 2) * s + (h / 2) * c + j()),
    P(x + (-w / 2) * c - (h / 2) * s + j(), y + (-w / 2) * s + (h / 2) * c + j()),
  ];
  g.fillStyle(rng() < 0.15 ? PAPER_SHADE : WHITE, 1); g.fillPoints(pts, true, true);
  g.lineStyle(1.3, INK, 0.8); g.strokePoints(pts, true, true);
  if (rng() < 0.3) {
    g.lineStyle(1, INK, 0.35);
    g.lineBetween(pts[1].x - 3, pts[1].y + 2, pts[2].x - 3, pts[2].y - 2);
  }
}

/** A street: an ink kerb, a paper bed, then slabs laid across it in courses. */
function street(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 8, INK);
  stroke(g, pts, w, PAPER_SHADE);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const across = Math.max(2, Math.round(w / 20));
    const step = 17;
    for (let d = 0; d < len; d += step) {
      const shift = (Math.round(d / step) % 2) * 0.5;
      for (let k = 0; k < across; k++) {
        const off = ((k + shift + 0.5) / across - 0.5) * (w - 6);
        if (Math.abs(off) > w / 2 - 6) continue;
        slab(g, a.x + ux * d - uy * off, a.y + uy * d + ux * off, step - 3, w / across - 3, ang, rng);
      }
    }
  }
}

/** Decree Square: concentric courses of slabs round the Queen's seal, inlaid in blue. */
function decreeSquare(g: G, rng: () => number): void {
  const { x, y, rx, ry } = SQUARE;
  g.fillStyle(INK, 1); g.fillEllipse(x, y, rx * 2 + 12, ry * 2 + 10);
  g.fillStyle(PAPER_SHADE, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
  for (let ring = 0; ring < 6; ring++) {
    const k = 1 - ring / 6;
    const rrx = rx * k - 8, rry = ry * k - 5;
    const n = Math.max(8, Math.floor(28 * k));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      slab(g, x + Math.cos(a) * rrx, y + Math.sin(a) * rry, (Math.PI * 2 * rrx) / n - 4, 16, a + Math.PI / 2, rng);
    }
  }
  // The seal in the middle — the one blue on the square's floor, worn pale by feet.
  queenSeal(g, x, y, 34, 0.85);
  g.lineStyle(2, INK, 1); g.strokeCircle(x, y, 40);
  // Ink spilled from the manor's lip runs into the square's top edge.
  inkBlot(g, MANOR.x - 40, MANOR.y + 18, 30, rng);
  inkBlot(g, MANOR.x + 70, MANOR.y + 10, 18, rng);
}

/** A canal stretch: black ink water inside paper coping stones. */
function canalBody(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(INK, 1); g.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18);
  // Coping stones on both long edges.
  const horizontal = r.w >= r.h;
  const len = horizontal ? r.w : r.h;
  for (let d = 0; d < len + 16; d += 26) {
    for (const side of [0, 1]) {
      const sx = horizontal ? r.x - 8 + d : (side ? r.x + r.w + 1 : r.x - 9);
      const sy = horizontal ? (side ? r.y + r.h + 1 : r.y - 9) : r.y - 8 + d;
      g.fillStyle(WHITE, 1);
      if (horizontal) g.fillRect(sx + 1, sy + 1, 23, 7); else g.fillRect(sx + 1, sy + 1, 7, 23);
      g.lineStyle(1.2, INK, 1);
      if (horizontal) g.strokeRect(sx + 1, sy + 1, 23, 7); else g.strokeRect(sx + 1, sy + 1, 7, 23);
      if (rng() < 0.35) { g.lineStyle(1, INK, 0.5); horizontal ? g.lineBetween(sx + 4, sy + 6, sx + 14, sy + 3) : g.lineBetween(sx + 2, sy + 4, sx + 6, sy + 14); }
    }
  }
  g.fillStyle(INK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // A faint blue sheen in the black, and fixed white ripples (the moving ones are animated).
  g.fillStyle(BLUE_DEEP, 0.22);
  if (horizontal) g.fillRect(r.x, r.y + r.h * 0.2, r.w, r.h * 0.18); else g.fillRect(r.x + r.w * 0.2, r.y, r.w * 0.18, r.h);
  for (let i = 0; i < len / 40; i++) {
    const px = horizontal ? r.x + rng() * r.w : r.x + 8 + rng() * (r.w - 16);
    const py = horizontal ? r.y + 10 + rng() * (r.h - 20) : r.y + rng() * r.h;
    g.lineStyle(1.2, WHITE, 0.35);
    g.beginPath(); g.arc(px, py, 6 + rng() * 6, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  }
  // Tide-mark on the coping: the Queen lets the sea in to here.
  g.lineStyle(2, BLUE, 0.35);
  if (horizontal) { g.lineBetween(r.x, r.y - 14, r.x + r.w, r.y - 14); } else { g.lineBetween(r.x - 14, r.y, r.x - 14, r.y + r.h); }
}

/** A bridge deck over a canal: planked, ink-railed, with the posts standing proud. */
function bridgeDeck(g: G, x0: number, x1: number, y0: number, y1: number, vertical: boolean): void {
  g.fillStyle(INK, 1); g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
  g.fillStyle(WHITE, 1); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.lineStyle(1, INK, 0.75);
  if (vertical) {
    for (let y = y0 + 8; y < y1; y += 9) g.lineBetween(x0 + 2, y, x1 - 2, y);
  } else {
    for (let x = x0 + 8; x < x1; x += 9) g.lineBetween(x, y0 + 2, x, y1 - 2);
  }
  // Hatched underside where the deck shades the water.
  if (vertical) hatchRect(g, { x: x1 - 10, y: y0, w: 10, h: y1 - y0 }, 4, INK, 0.5);
  else hatchRect(g, { x: x0, y: y1 - 10, w: x1 - x0, h: 10 }, 4, INK, 0.5);
  // Railings and posts.
  g.lineStyle(3, INK, 1);
  if (vertical) {
    g.lineBetween(x0 + 3, y0, x0 + 3, y1); g.lineBetween(x1 - 3, y0, x1 - 3, y1);
    for (let y = y0; y <= y1; y += (y1 - y0) / 3) {
      g.fillStyle(INK, 1); g.fillRect(x0, y - 3, 7, 7); g.fillRect(x1 - 7, y - 3, 7, 7);
      g.fillStyle(WHITE, 1); g.fillRect(x0 + 2, y - 1, 2, 2); g.fillRect(x1 - 5, y - 1, 2, 2);
    }
  } else {
    g.lineBetween(x0, y0 + 3, x1, y0 + 3); g.lineBetween(x0, y1 - 3, x1, y1 - 3);
    for (let x = x0; x <= x1; x += (x1 - x0) / 3) {
      g.fillStyle(INK, 1); g.fillRect(x - 3, y0, 7, 7); g.fillRect(x - 3, y1 - 7, 7, 7);
      g.fillStyle(WHITE, 1); g.fillRect(x - 1, y0 + 2, 2, 2); g.fillRect(x - 1, y1 - 5, 2, 2);
    }
  }
}

/** The squid pens: plank walkways boxing the basin into six pens, a feed hatch on each. */
function squidPens(g: G, rng: () => number): void {
  const r = PENS;
  canalBody(g, r, rng);
  const cols = 3, rows = 2;
  const pw = r.w / cols, ph = (r.h - 20) / rows;
  const plank = (x: number, y: number, w: number, h: number): void => {
    g.fillStyle(INK, 1); g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(WHITE, 1); g.fillRect(x, y, w, h);
    g.lineStyle(1, INK, 0.6);
    if (w > h) for (let k = x + 10; k < x + w; k += 14) g.lineBetween(k, y + 1, k, y + h - 1);
    else for (let k = y + 10; k < y + h; k += 14) g.lineBetween(x + 1, k, x + w - 1, k);
  };
  for (let c = 0; c <= cols; c++) plank(r.x + c * pw - 4, r.y + 14, 8, r.h - 20);
  for (let rr = 0; rr <= rows; rr++) plank(r.x - 4, r.y + 14 + rr * ph - 4, r.w + 8, 8);
  // Netting across each pen mouth: an ink grid you can see the squids under.
  for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
    const x = r.x + c * pw + 8, y = r.y + 18 + rr * ph + 4;
    g.lineStyle(1, GREY_LIT, 0.35);
    for (let k = 0; k < pw - 16; k += 12) g.lineBetween(x + k, y, x + k, y + ph - 12);
    for (let k = 0; k < ph - 12; k += 12) g.lineBetween(x, y + k, x + pw - 16, y + k);
    // A number board on the plank: the pen's stock count, chalked by Murk.
    const bx = x + pw / 2 - 10, by = y - 8;
    g.fillStyle(INK, 1); g.fillRect(bx - 1, by - 1, 22, 10);
    g.fillStyle(WHITE, 1); g.fillRect(bx, by, 20, 8);
    g.lineStyle(1, INK, 1); g.lineBetween(bx + 4, by + 2, bx + 4, by + 6); g.lineBetween(bx + 8, by + 2, bx + 15, by + 6);
  }
}

// ── Set pieces ──────────────────────────────────────────────────────────

/** Prince Blot's manor: a great ink bottle with the royal quill standing in it. */
function drawManor(g: G, rng: () => number): void {
  const { x, y, w } = MANOR;
  const bodyTop = y - 170, neckTop = bodyTop - 58;
  inkShadow(g, x, y + 6, w + 60, 36, 0.6);
  // Paper steps up to the door.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(WHITE, 1); g.fillRect(x - 46 + k * 6, y - 4 - k * 6, 92 - k * 12, 7);
    g.lineStyle(1.3, INK, 1); g.strokeRect(x - 46 + k * 6, y - 4 - k * 6, 92 - k * 12, 7);
  }
  // The bottle body — squat, square-shouldered black glass.
  const body = [
    P(x - w / 2, y - 10), P(x - w / 2, bodyTop + 40), P(x - w / 2 + 40, bodyTop), P(x - 82, bodyTop - 4),
    P(x + 82, bodyTop - 4), P(x + w / 2 - 40, bodyTop), P(x + w / 2, bodyTop + 40), P(x + w / 2, y - 10),
  ];
  g.fillStyle(INK, 1); g.fillPoints(body.map((p) => P(p.x, p.y + 4)), true, true);
  g.fillStyle(INK_SOFT, 1); g.fillPoints(body, true, true);
  g.lineStyle(4, INK, 1); g.strokePoints(body, true, true);
  // Neck and lip.
  g.fillStyle(INK_SOFT, 1); g.fillRect(x - 80, neckTop, 160, bodyTop - neckTop + 2);
  g.lineStyle(4, INK, 1); g.strokeRect(x - 80, neckTop, 160, bodyTop - neckTop + 2);
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 98, neckTop - 18, 196, 22, 8);
  g.lineStyle(2, INK_LIT, 1); g.strokeRoundedRect(x - 98, neckTop - 18, 196, 22, 8);
  // The ink inside the mouth, brimming, with a white meniscus.
  g.fillStyle(INK, 1); g.fillEllipse(x, neckTop - 8, 170, 14);
  g.lineStyle(1.5, WHITE, 0.6); g.beginPath(); g.arc(x, neckTop - 8, 80, Math.PI * 1.1, Math.PI * 1.45, false); g.strokePath();
  // Toon glass gloss: two bare-white curves on the left shoulder, one on the neck.
  g.lineStyle(7, WHITE, 0.85);
  g.beginPath(); g.arc(x - w / 2 + 70, bodyTop + 70, 50, Math.PI * 1.05, Math.PI * 1.45, false); g.strokePath();
  g.lineStyle(3, WHITE, 0.7);
  g.beginPath(); g.arc(x - w / 2 + 70, bodyTop + 70, 36, Math.PI * 1.1, Math.PI * 1.35, false); g.strokePath();
  g.lineStyle(4, WHITE, 0.6); g.lineBetween(x - 66, neckTop + 8, x - 66, bodyTop - 8);
  // The paper label round the belly — it is the manor's balcony, rail and all.
  const ly = bodyTop + 66;
  g.fillStyle(PAPER, 1); g.fillRect(x - w / 2 + 6, ly, w - 12, 54);
  g.lineStyle(2.5, INK, 1); g.strokeRect(x - w / 2 + 6, ly, w - 12, 54);
  g.lineStyle(1, INK, 1); g.strokeRect(x - w / 2 + 12, ly + 5, w - 24, 44);
  scribble(g, x - 110, ly + 18, 220, rng, INK, 0.9, 1.6);
  scribble(g, x - 80, ly + 36, 160, rng, INK, 0.6, 1);
  queenSeal(g, x + w / 2 - 34, ly + 28, 16);
  queenSeal(g, x - w / 2 + 34, ly + 28, 16);
  // Balcony rail along the label's top edge.
  g.lineStyle(2, INK, 1); g.lineBetween(x - w / 2 + 6, ly - 10, x + w / 2 - 6, ly - 10);
  for (let k = x - w / 2 + 12; k < x + w / 2 - 6; k += 14) g.lineBetween(k, ly - 10, k, ly);
  // Windows cut in the black glass, glowing the Queen's blue.
  for (const wx of [x - 120, x - 60, x + 60, x + 120]) {
    const wy = y - 58;
    g.fillStyle(INK, 1); g.fillRoundedRect(wx - 15, wy - 26, 30, 40, { tl: 15, tr: 15, bl: 0, br: 0 });
    g.fillStyle(BLUE, 1); g.fillRoundedRect(wx - 11, wy - 22, 22, 32, { tl: 11, tr: 11, bl: 0, br: 0 });
    g.fillStyle(BLUE_LIT, 1); g.fillRect(wx - 1, wy - 22, 2, 32); g.fillRect(wx - 11, wy - 6, 22, 2);
  }
  for (const wx of [x - 40, x + 40]) {
    g.fillStyle(INK, 1); g.fillCircle(wx, bodyTop + 26, 12);
    g.fillStyle(BLUE, 1); g.fillCircle(wx, bodyTop + 26, 8);
    g.fillStyle(BLUE_LIT, 1); g.fillRect(wx - 8, bodyTop + 25, 16, 2);
  }
  // The door: a tall paper arch with an ink keyhole.
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 28, y - 82, 56, 64, { tl: 28, tr: 28, bl: 0, br: 0 });
  g.fillStyle(PAPER, 1); g.fillRoundedRect(x - 23, y - 77, 46, 59, { tl: 23, tr: 23, bl: 0, br: 0 });
  g.lineStyle(1.5, INK, 1); g.lineBetween(x, y - 76, x, y - 18);
  queenSeal(g, x, y - 52, 9);
  // The quill: a shaft out of the ink, a great white vane with inked barbs, the tip high above.
  const qx0 = x + 30, qy0 = neckTop - 6, qx1 = x + 180, qy1 = 40;
  const qa = Math.atan2(qy1 - qy0, qx1 - qx0);
  const nx = -Math.sin(qa), ny = Math.cos(qa);
  g.lineStyle(9, INK, 1); g.lineBetween(qx0, qy0, qx1, qy1);
  g.lineStyle(4, WHITE, 1); g.lineBetween(qx0, qy0, qx1, qy1);
  const vane: Phaser.Geom.Point[] = [];
  const vaneL: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = 0.18 + (i / 16) * 0.82;
    const bx = qx0 + (qx1 - qx0) * t, by = qy0 + (qy1 - qy0) * t;
    const wdt = Math.sin(Math.PI * Math.min(1, (t - 0.18) / 0.82)) * 46 + 4;
    vane.push(P(bx + nx * wdt, by + ny * wdt));
    vaneL.push(P(bx - nx * wdt * 0.8, by - ny * wdt * 0.8));
  }
  const outline = [...vane, ...vaneL.reverse()];
  g.fillStyle(INK, 1); g.fillPoints(outline.map((p) => P(p.x + 3, p.y + 3)), true, true);
  g.fillStyle(WHITE, 1); g.fillPoints(outline, true, true);
  g.lineStyle(3, INK, 1); g.strokePoints(outline, true, true);
  g.lineStyle(1.2, INK, 0.8);
  for (let i = 2; i < 16; i++) {
    const t = 0.18 + (i / 16) * 0.82;
    const bx = qx0 + (qx1 - qx0) * t, by = qy0 + (qy1 - qy0) * t;
    const wdt = Math.sin(Math.PI * Math.min(1, (t - 0.18) / 0.82)) * 44;
    g.lineBetween(bx, by, bx + nx * wdt + Math.cos(qa) * 14, by + ny * wdt + Math.sin(qa) * 14);
    g.lineBetween(bx, by, bx - nx * wdt * 0.75 + Math.cos(qa) * 12, by - ny * wdt * 0.75 + Math.sin(qa) * 12);
  }
  // Notches torn in the vane; the lowest barbs dipped black.
  g.fillStyle(INK, 1);
  const lo = vane[2];
  g.fillTriangle(lo.x, lo.y, lo.x - 10, lo.y + 6, lo.x - 2, lo.y + 12);
  g.fillCircle(vaneL[vaneL.length - 3].x, vaneL[vaneL.length - 3].y, 5);
  g.lineStyle(2, INK, 1); g.lineBetween(qx0, qy0, qx0 + (qx1 - qx0) * 0.18, qy0 + (qy1 - qy0) * 0.18);
  // Banners either side, hung from the shoulders: the seal on black cloth.
  for (const side of [-1, 1]) {
    const bx = x + side * (w / 2 + 26);
    g.lineStyle(3, INK, 1); g.lineBetween(bx, y, bx, bodyTop - 30);
    g.fillStyle(INK, 1); g.fillRect(bx - 18, bodyTop - 26, 36, 84);
    g.fillTriangle(bx - 18, bodyTop + 58, bx + 18, bodyTop + 58, bx, bodyTop + 72);
    g.lineStyle(1.5, WHITE, 0.8); g.strokeRect(bx - 14, bodyTop - 22, 28, 70);
    queenSeal(g, bx, bodyTop + 14, 11);
  }
}

/** A censor's tower: a round paper keep, ink-coursed, with the blue reading-lamp up top. */
function drawTower(g: G, t: { x: number; y: number; r: number; h: number }, rng: () => number): void {
  const { x, y, r, h } = t;
  inkShadow(g, x, y + 3, r * 3, r * 0.9);
  g.fillStyle(INK, 1); g.fillRect(x - r - 3, y - h - 3, r * 2 + 6, h + 6);
  g.fillStyle(WHITE, 1); g.fillRect(x - r, y - h, r * 2, h);
  // Stone courses, offset every row; a hatched shadow down the east flank.
  g.lineStyle(1, INK, 0.55);
  for (let yy = y - h + 14; yy < y; yy += 14) {
    g.lineBetween(x - r, yy, x + r, yy);
    const off = (Math.round(yy / 14) % 2) * 9;
    for (let xx = x - r + off; xx < x + r; xx += 18) g.lineBetween(xx, yy, xx, yy + 14);
  }
  hatchRect(g, { x: x + r * 0.35, y: y - h, w: r * 0.65, h }, 4, INK, 0.55, 1.1);
  // Arrow-slit windows (black) climbing round.
  for (let k = 0; k < 4; k++) {
    const sy = y - 40 - k * (h - 60) / 4, sx = x - r * 0.4 + (k % 2) * r * 0.5;
    g.fillStyle(INK, 1); g.fillRect(sx - 3, sy - 14, 6, 18);
  }
  // A door at the foot with the censors' bar across it.
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 12, y - 34, 24, 34, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.fillStyle(PAPER_SHADE, 1); g.fillRect(x - 15, y - 22, 30, 5);
  g.lineStyle(1, INK, 1); g.strokeRect(x - 15, y - 22, 30, 5);
  // Gallery and lantern room.
  const ly = y - h;
  g.fillStyle(INK, 1); g.fillRect(x - r - 12, ly - 6, r * 2 + 24, 10);
  for (let k = x - r - 10; k <= x + r + 10; k += 8) { g.lineStyle(1.5, INK, 1); g.lineBetween(k, ly - 6, k, ly - 16); }
  g.lineStyle(2, INK, 1); g.lineBetween(x - r - 12, ly - 16, x + r + 12, ly - 16);
  g.fillStyle(INK, 1); g.fillRect(x - r * 0.75, ly - 50, r * 1.5, 40);
  g.fillStyle(BLUE, 1); g.fillRect(x - r * 0.75 + 4, ly - 46, r * 1.5 - 8, 32);
  g.lineStyle(2, INK, 1);
  for (let k = 1; k < 3; k++) g.lineBetween(x - r * 0.75 + (r * 1.5 * k) / 3, ly - 46, x - r * 0.75 + (r * 1.5 * k) / 3, ly - 14);
  // Cone roof: black with a white highlight stroke and a spike.
  g.fillStyle(INK, 1); g.fillTriangle(x - r - 6, ly - 48, x + r + 6, ly - 48, x, ly - 48 - r * 1.8);
  g.lineStyle(2, WHITE, 0.7); g.lineBetween(x - r * 0.5, ly - 52, x - 4, ly - 44 - r * 1.6);
  g.lineStyle(2, INK, 1); g.lineBetween(x, ly - 48 - r * 1.8, x, ly - 70 - r * 1.8);
  g.fillStyle(BLUE, 1); g.fillCircle(x, ly - 72 - r * 1.8, 3);
  // A posted notice by the door.
  decreeSheet(g, x + r + 6, y - 64, 16, 22, 0.05, Math.floor(rng() * 9));
}

/** The Pressworks: timber-framed paper hall, sawtooth roof, a flywheel at the west gable. */
function drawPress(g: G, rng: () => number): void {
  const { x, y, w, h } = PRESS;
  const x0 = x - w / 2, x1 = x + w / 2, top = y - h;
  inkShadow(g, x, y + 4, w * 1.15, 28);
  g.fillStyle(INK, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(WHITE, 1); g.fillRect(x0, top, w, h);
  // Timber framing: posts, a mid rail, and X braces in every bay.
  const bays = 6, bw = w / bays;
  g.lineStyle(4, INK, 1);
  for (let b = 0; b <= bays; b++) g.lineBetween(x0 + b * bw, top, x0 + b * bw, y);
  g.lineBetween(x0, top + h * 0.45, x1, top + h * 0.45);
  g.lineStyle(2.5, INK, 1);
  for (let b = 0; b < bays; b++) {
    if (b === 2 || b === 3) continue;
    g.lineBetween(x0 + b * bw + 3, top + h * 0.45 + 3, x0 + (b + 1) * bw - 3, y - 3);
    g.lineBetween(x0 + (b + 1) * bw - 3, top + h * 0.45 + 3, x0 + b * bw + 3, y - 3);
  }
  // Upper windows.
  for (let b = 0; b < bays; b++) {
    const wx = x0 + b * bw + bw / 2, wy = top + h * 0.22;
    g.fillStyle(INK, 1); g.fillRect(wx - 13, wy - 13, 26, 26);
    g.fillStyle(b % 2 ? WHITE : PAPER_SHADE, 1); g.fillRect(wx - 10, wy - 10, 20, 20);
    g.lineStyle(2, INK, 1); g.lineBetween(wx, wy - 10, wx, wy + 10); g.lineBetween(wx - 10, wy, wx + 10, wy);
  }
  // The big doors stand open: the press inside in silhouette.
  const dx0 = x0 + bw * 2 + 4, dx1 = x0 + bw * 4 - 4, dy0 = top + h * 0.45 + 6;
  g.fillStyle(INK, 1); g.fillRect(dx0, dy0, dx1 - dx0, y - dy0);
  g.fillStyle(INK_LIT, 1);
  g.fillRect(dx0 + 20, dy0 + 20, dx1 - dx0 - 40, 12);
  g.fillRect(dx0 + 30, dy0 + 32, 10, y - dy0 - 32); g.fillRect(dx1 - 40, dy0 + 32, 10, y - dy0 - 32);
  g.fillStyle(WHITE, 0.85); g.fillRect(dx0 + 44, dy0 + 40, dx1 - dx0 - 88, 18);
  scribble(g, dx0 + 48, dy0 + 49, dx1 - dx0 - 96, rng, INK, 0.8, 0.8);
  // Sawtooth roof: three teeth, black with white glazing on the steep faces.
  const teeth = 3, tw = (w + 20) / teeth;
  for (let k = 0; k < teeth; k++) {
    const tx = x0 - 10 + k * tw;
    g.fillStyle(INK, 1); g.fillTriangle(tx, top, tx + tw, top, tx + tw, top - 46);
    g.fillStyle(WHITE, 1); g.fillRect(tx + tw - 9, top - 40, 6, 38);
    g.lineStyle(1, INK, 1); g.strokeRect(tx + tw - 9, top - 40, 6, 38);
    g.lineStyle(2, WHITE, 0.6); g.lineBetween(tx + 10, top - 4, tx + tw - 14, top - 36);
  }
  // Chimney stack for the drying stoves.
  g.fillStyle(INK, 1); g.fillRect(x1 - 50, top - 92, 26, 60);
  g.fillStyle(WHITE, 1); g.fillRect(x1 - 54, top - 98, 34, 8);
  g.lineStyle(1.5, INK, 1); g.strokeRect(x1 - 54, top - 98, 34, 8);
  // Signboard.
  g.fillStyle(INK, 1); g.fillRect(x - 70, top + h * 0.45 - 16, 140, 22);
  g.lineStyle(1.5, WHITE, 1); g.strokeRect(x - 66, top + h * 0.45 - 13, 132, 16);
  scribble(g, x - 56, top + h * 0.45 - 5, 112, rng, WHITE, 0.95, 1.3);
  // Flywheel housing on the west gable (the spokes turn in animateOver).
  g.fillStyle(INK, 1); g.fillRect(x0 - 30, y - 90, 30, 90);
  g.lineStyle(5, INK, 1); g.strokeCircle(x0 - 20, y - 62, 38);
  g.lineStyle(2, WHITE, 0.8); g.strokeCircle(x0 - 20, y - 62, 34);
  // A paper drift spilling from the doors.
  for (let i = 0; i < 9; i++) decreeSheet(g, dx0 + 10 + rng() * (dx1 - dx0 - 20), y + 6 + rng() * 26, 12, 9, (rng() - 0.5) * 1.6, i);
}

/** Nib & Sac, stationers: striped awning, a nib for a sign, ink sacs hung in the window. */
function drawShop(g: G, rng: () => number): void {
  const { x, y, w, h } = SHOP;
  const x0 = x - w / 2, top = y - h;
  inkShadow(g, x, y + 4, w * 1.2, 22);
  g.fillStyle(INK, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(WHITE, 1); g.fillRect(x0, top, w, h);
  hatchRect(g, { x: x0 + w - 24, y: top, w: 24, h }, 4, INK, 0.45);
  // Gable roof.
  g.fillStyle(INK, 1); g.fillTriangle(x0 - 14, top + 2, x0 + w + 14, top + 2, x, top - 62);
  g.lineStyle(2, WHITE, 0.6); g.lineBetween(x0, top - 4, x - 6, top - 54);
  // Striped awning over the window.
  const ay = top + 30;
  for (let k = 0; k < 9; k++) {
    const sx = x0 + 6 + (k * (w - 12)) / 9;
    g.fillStyle(k % 2 ? WHITE : INK, 1);
    g.fillRect(sx, ay, (w - 12) / 9 + 0.5, 22);
    g.fillTriangle(sx, ay + 22, sx + (w - 12) / 9, ay + 22, sx + (w - 12) / 18, ay + 30);
  }
  g.lineStyle(2, INK, 1); g.strokeRect(x0 + 6, ay, w - 12, 22);
  // The window, with ink sacs hanging in a row and bottles on the sill.
  const wx0 = x0 + 12, wy0 = ay + 34, ww = w * 0.55, wh = h - 70;
  g.fillStyle(INK, 1); g.fillRect(wx0 - 3, wy0 - 3, ww + 6, wh + 6);
  g.fillStyle(PAPER, 1); g.fillRect(wx0, wy0, ww, wh);
  for (let k = 0; k < 4; k++) {
    const sx = wx0 + 12 + k * (ww - 24) / 3, sy = wy0 + 16 + (k % 2) * 6;
    g.lineStyle(1, INK, 1); g.lineBetween(sx, wy0, sx, sy - 8);
    g.fillStyle(INK, 1); g.fillEllipse(sx, sy, 12, 16);
    g.fillStyle(WHITE, 0.8); g.fillEllipse(sx - 2, sy - 3, 3, 5);
  }
  for (let k = 0; k < 5; k++) {
    const bx = wx0 + 8 + k * (ww - 16) / 4;
    g.fillStyle(INK, 1); g.fillRect(bx - 4, wy0 + wh - 14, 8, 12); g.fillRect(bx - 2, wy0 + wh - 18, 4, 4);
    if (k === 2) { g.fillStyle(BLUE, 1); g.fillRect(bx - 3, wy0 + wh - 10, 6, 6); }
  }
  g.lineStyle(2, INK, 1); g.lineBetween(wx0 + ww / 2, wy0, wx0 + ww / 2, wy0 + wh);
  // Door.
  const dx = x0 + w - 40;
  g.fillStyle(INK, 1); g.fillRect(dx - 15, y - 48, 30, 48);
  g.fillStyle(PAPER_SHADE, 1); g.fillRect(dx - 11, y - 44, 22, 44);
  g.fillStyle(INK, 1); g.fillCircle(dx + 6, y - 22, 2);
  // Hanging sign: a great pen nib on a bracket.
  const sx = x0 + w + 4, sy = top + 12;
  g.lineStyle(3, INK, 1); g.lineBetween(x0 + w - 4, sy, sx + 30, sy);
  g.lineStyle(1.5, INK, 1); g.lineBetween(sx + 10, sy, sx + 10, sy + 8); g.lineBetween(sx + 26, sy, sx + 26, sy + 8);
  const nib = [P(sx + 8, sy + 8), P(sx + 28, sy + 8), P(sx + 26, sy + 30), P(sx + 18, sy + 46), P(sx + 10, sy + 30)];
  g.fillStyle(WHITE, 1); g.fillPoints(nib, true, true);
  g.lineStyle(2, INK, 1); g.strokePoints(nib, true, true);
  g.lineBetween(sx + 18, sy + 26, sx + 18, sy + 46);
  g.fillStyle(INK, 1); g.fillCircle(sx + 18, sy + 24, 3);
  scribble(g, x0 + 20, top + 16, w - 40, rng, INK, 0.9, 1);
}

/** The Hall of Reflection — perfectly symmetrical, a giant blot painted across its face. */
function drawHall(g: G): void {
  const { x, y, w } = HALL;
  const h = 150, top = y - h, x0 = x - w / 2;
  inkShadow(g, x, y + 4, w * 1.15, 26);
  g.fillStyle(INK, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(WHITE, 1); g.fillRect(x0, top, w, h);
  // Pediment.
  g.fillStyle(INK, 1); g.fillTriangle(x0 - 16, top + 2, x0 + w + 16, top + 2, x, top - 58);
  g.fillStyle(WHITE, 1); g.fillTriangle(x0 + 8, top - 4, x0 + w - 8, top - 4, x, top - 46);
  g.fillStyle(INK, 1); g.fillCircle(x, top - 20, 10);
  g.fillStyle(WHITE, 1); g.fillCircle(x, top - 20, 6);
  g.fillStyle(INK, 1); g.fillCircle(x, top - 20, 2.5);
  // Columns, mirrored.
  for (let k = 0; k < 6; k++) {
    const cx = x0 + 18 + k * ((w - 36) / 5);
    g.fillStyle(INK, 1); g.fillRect(cx - 9, top + 6, 18, h - 6);
    g.fillStyle(WHITE, 1); g.fillRect(cx - 6, top + 10, 12, h - 12);
    g.lineStyle(1, INK, 0.7); g.lineBetween(cx - 2, top + 12, cx - 2, y - 4); g.lineBetween(cx + 2, top + 12, cx + 2, y - 4);
    g.fillStyle(INK, 1); g.fillRect(cx - 11, top + 4, 22, 6); g.fillRect(cx - 11, y - 6, 22, 6);
  }
  // The blot across the frieze: generated once, mirrored exactly down the middle.
  const r = mulberry(0x5a5a);
  const half: { dx: number; dy: number; s: number }[] = [];
  for (let i = 0; i < 16; i++) half.push({ dx: 6 + r() * 70, dy: (r() - 0.5) * 50, s: 5 + r() * 15 });
  for (const b of half) for (const sgn of [-1, 1]) {
    g.fillStyle(INK, 1);
    g.fillEllipse(x + sgn * b.dx, top + 62 + b.dy, b.s * 2, b.s * 1.6);
  }
  g.fillRect(x - 6, top + 34, 12, 56);
  // Central door, with a mirror for a window.
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 20, y - 56, 40, 56, { tl: 20, tr: 20, bl: 0, br: 0 });
  g.fillStyle(BLUE_WASH, 1); g.fillCircle(x, y - 38, 10);
  g.lineStyle(1.5, WHITE, 1); g.lineBetween(x - 4, y - 44, x + 3, y - 33);
}

/** The Archive: an old scriptorium, roof stove in, charters stacked under a tarp. */
function drawArchive(g: G, rng: () => number): void {
  const { x, y, w } = ARCHIVE;
  const h = 120, top = y - h, x0 = x - w / 2;
  inkShadow(g, x, y + 4, w * 1.2, 22);
  g.fillStyle(INK, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(PAPER, 1); g.fillRect(x0, top, w, h);
  // Its tide-mark is the highest in town: this street is the first the Queen lets under.
  g.fillStyle(INK, 0.12); g.fillRect(x0, top + h * 0.35, w, h * 0.65);
  g.lineStyle(2.5, INK, 0.8);
  g.beginPath();
  for (let k = 0; k <= 20; k++) { const xx = x0 + (k / 20) * w; const yy = top + h * 0.35 + Math.sin(k * 1.3) * 3; if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
  g.strokePath();
  // Broken roof: a gable with a bite out of it, rafters showing.
  g.fillStyle(INK, 1);
  g.fillTriangle(x0 - 10, top + 2, x0 + w * 0.42, top + 2, x - 10, top - 54);
  g.fillTriangle(x0 + w * 0.7, top + 2, x0 + w + 10, top + 2, x + 18, top - 40);
  g.lineStyle(3, INK, 1);
  for (let k = 0; k < 3; k++) g.lineBetween(x0 + w * (0.45 + k * 0.08), top, x - 4 + k * 8, top - 46 + k * 4);
  // Shuttered windows, one hanging off.
  for (const wx of [x0 + 34, x0 + w - 34]) {
    g.fillStyle(INK, 1); g.fillRect(wx - 14, top + 26, 28, 26);
    g.fillStyle(WHITE, 1); g.fillRect(wx - 11, top + 29, 22, 20);
    g.lineStyle(1.5, INK, 1); g.lineBetween(wx - 11, top + 29, wx + 11, top + 49);
  }
  g.fillStyle(WHITE, 1); g.fillRect(x0 + w - 20, top + 40, 10, 26);
  g.lineStyle(1.5, INK, 1); g.strokeRect(x0 + w - 20, top + 40, 10, 26);
  // Door, and the stacks of salvaged charters by it.
  g.fillStyle(INK, 1); g.fillRect(x - 13, y - 40, 26, 40);
  for (let s = 0; s < 3; s++) {
    const sx = x0 + 22 + s * 16;
    for (let k = 0; k < 5; k++) {
      g.fillStyle(WHITE, 1); g.fillRect(sx - 7, y - 8 - k * 5, 14 + (k % 2), 5);
      g.lineStyle(1, INK, 1); g.strokeRect(sx - 7, y - 8 - k * 5, 14 + (k % 2), 5);
    }
  }
  scribble(g, x + 20, top + 14, 50, rng, INK, 0.7);
}

/**
 * A scriptorium house: tall and narrow, jettied storeys, black timber framing, steep roof, and a
 * tide-mark round its foot. `under` houses carry the Queen's seal on the door.
 */
function drawHouse(g: G, hs: { x: number; y: number; w: number; floors: number }, rng: () => number): void {
  const { x, y, w, floors } = hs;
  const fh = 44;
  inkShadow(g, x, y + 3, w * 1.25, 18);
  let top = y;
  for (let f = 0; f < floors; f++) {
    const fw = w + f * 6;
    const fx0 = x - fw / 2, fy0 = top - fh;
    g.fillStyle(INK, 1); g.fillRect(fx0 - 2.5, fy0 - 2.5, fw + 5, fh + 5);
    g.fillStyle(f % 2 ? WHITE : PAPER, 1); g.fillRect(fx0, fy0, fw, fh);
    // Framing pattern varies per house and storey.
    const pat = (Math.floor(x / 37) + f) % 3;
    g.lineStyle(3, INK, 1);
    g.lineBetween(fx0 + fw * 0.33, fy0, fx0 + fw * 0.33, fy0 + fh);
    g.lineBetween(fx0 + fw * 0.67, fy0, fx0 + fw * 0.67, fy0 + fh);
    g.lineStyle(2, INK, 1);
    if (pat === 0) { g.lineBetween(fx0, fy0, fx0 + fw * 0.33, fy0 + fh); g.lineBetween(fx0 + fw, fy0, fx0 + fw * 0.67, fy0 + fh); }
    if (pat === 1) { g.lineBetween(fx0, fy0 + fh, fx0 + fw * 0.33, fy0); g.lineBetween(fx0 + fw, fy0 + fh, fx0 + fw * 0.67, fy0); }
    if (pat === 2) { g.lineBetween(fx0, fy0 + fh / 2, fx0 + fw * 0.33, fy0 + fh / 2); g.lineBetween(fx0 + fw * 0.67, fy0 + fh / 2, fx0 + fw, fy0 + fh / 2); }
    // A window in the middle bay (the ground floor gets the door instead).
    if (f > 0) {
      const wx = x, wy = fy0 + fh / 2;
      const lit = rng() < 0.25;
      g.fillStyle(INK, 1); g.fillRect(wx - 10, wy - 12, 20, 24);
      g.fillStyle(lit ? BLUE : rng() < 0.5 ? WHITE : INK_SOFT, 1); g.fillRect(wx - 7, wy - 9, 14, 18);
      g.lineStyle(1.5, INK, 1); g.lineBetween(wx, wy - 9, wx, wy + 9); g.lineBetween(wx - 7, wy, wx + 7, wy);
      if (rng() < 0.3) { g.fillStyle(WHITE, 1); g.fillRect(wx + 8, wy - 2, 5, 3); }
    }
    // Jetty beam under the overhang.
    g.fillStyle(INK, 1); g.fillRect(fx0 - 4, fy0 + fh - 3, fw + 8, 4);
    top = fy0;
  }
  // Roof: steep, black, a bare-white highlight stroke, a chimney.
  const rw = w + floors * 6 + 16;
  g.fillStyle(INK, 1); g.fillTriangle(x - rw / 2, top + 2, x + rw / 2, top + 2, x, top - rw * 0.9);
  g.lineStyle(2, WHITE, 0.65); g.lineBetween(x - rw / 2 + 12, top - 4, x - 6, top - rw * 0.8);
  g.fillStyle(INK, 1); g.fillRect(x + rw * 0.18, top - rw * 0.6, 12, rw * 0.45);
  g.fillStyle(WHITE, 1); g.fillRect(x + rw * 0.18 - 2, top - rw * 0.6 - 4, 16, 5);
  g.lineStyle(1, INK, 1); g.strokeRect(x + rw * 0.18 - 2, top - rw * 0.6 - 4, 16, 5);
  // Tide-mark at the foot: a wavy ink line and a wash of hatching below it.
  const tideH = 14 + ((x * 13) % 12);
  hatchRect(g, { x: x - w / 2, y: y - tideH, w, h: tideH }, 4, INK, 0.4);
  g.lineStyle(2, INK, 0.85);
  g.beginPath();
  for (let k = 0; k <= 12; k++) { const xx = x - w / 2 + (k / 12) * w; const yy = y - tideH + Math.sin(k * 1.6 + x) * 2; if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
  g.strokePath();
  // Door.
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 12, y - 34, 24, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(PAPER_SHADE, 1); g.fillRoundedRect(x - 9, y - 31, 18, 31, { tl: 8, tr: 8, bl: 0, br: 0 });
  if (Math.floor(x / 53) % 3 === 0) {
    // LEFT UNDER: the Queen's seal nailed to the door, a ribbon of blue tape across it.
    queenSeal(g, x, y - 20, 7);
    g.lineStyle(3, BLUE, 0.9); g.lineBetween(x - 12, y - 32, x + 12, y - 6);
  } else {
    g.fillStyle(INK, 1); g.fillCircle(x + 4, y - 16, 1.8);
  }
}

/** The north wall: a long run of tall gables, the oldest scriptoria, windows all shuttered. */
function drawWallSegment(g: G, i: number, rng: () => number): void {
  const segW = AREA_W / WALL_SEGMENTS;
  const x0 = i * segW, x1 = x0 + segW, mid = (x0 + x1) / 2;
  const y = WALL_N;
  const hgt = 120 + ((i * 37) % 40);
  g.fillStyle(INK, 1); g.fillRect(x0, y - hgt - 2, segW, hgt + 4);
  g.fillStyle(i % 2 ? WHITE : PAPER, 1); g.fillRect(x0 + 3, y - hgt, segW - 6, hgt);
  hatchRect(g, { x: x0 + 3, y: y - 30, w: segW - 6, h: 30 }, 5, INK, 0.3);
  // Gable.
  g.fillStyle(INK, 1); g.fillTriangle(x0 - 4, y - hgt + 2, x1 + 4, y - hgt + 2, mid, y - hgt - segW * 0.55);
  g.lineStyle(2, WHITE, 0.55); g.lineBetween(x0 + 10, y - hgt - 4, mid - 6, y - hgt - segW * 0.48);
  // Two storeys of shuttered windows.
  for (let row = 0; row < 2; row++) for (const fx of [0.3, 0.7]) {
    const wx = x0 + segW * fx, wy = y - hgt + 26 + row * 44;
    g.fillStyle(INK, 1); g.fillRect(wx - 11, wy - 12, 22, 26);
    g.fillStyle(WHITE, 1); g.fillRect(wx - 9, wy - 10, 8, 22); g.fillRect(wx + 1, wy - 10, 8, 22);
    g.lineStyle(1, INK, 0.8);
    for (let k = 0; k < 4; k++) { g.lineBetween(wx - 9, wy - 6 + k * 5, wx - 1, wy - 6 + k * 5); g.lineBetween(wx + 1, wy - 6 + k * 5, wx + 9, wy - 6 + k * 5); }
  }
  if (rng() < 0.45) decreeSheet(g, mid, y - 34, 14, 18, (rng() - 0.5) * 0.2, i);
}

function drawLamp(g: G, x: number, y: number): void {
  inkShadow(g, x, y + 2, 20, 7);
  g.fillStyle(INK, 1); g.fillRect(x - 2.5, y - 56, 5, 56); g.fillRect(x - 7, y - 4, 14, 4);
  g.fillRect(x - 8, y - 72, 16, 4); g.fillRect(x - 6, y - 70, 12, 14);
  g.fillStyle(BLUE, 1); g.fillRect(x - 4, y - 68, 8, 10);
  g.fillStyle(INK, 1); g.fillTriangle(x - 9, y - 72, x + 9, y - 72, x, y - 80);
}

function drawPunt(g: G, p: { x: number; y: number; flip?: boolean }): void {
  const s = p.flip ? -1 : 1;
  const hull = [P(p.x - 46, p.y - 8), P(p.x + 46, p.y - 8), P(p.x + 40, p.y + 8), P(p.x - 40, p.y + 8)];
  g.fillStyle(WHITE, 1); g.fillPoints(hull, true, true);
  g.lineStyle(2.5, INK, 1); g.strokePoints(hull, true, true);
  g.lineStyle(1, INK, 0.7); for (let k = -30; k <= 30; k += 15) g.lineBetween(p.x + k, p.y - 7, p.x + k, p.y + 7);
  g.lineStyle(3, INK, 1); g.lineBetween(p.x - 50 * s, p.y + 4, p.x + 30 * s, p.y - 56);
  g.lineStyle(1.5, WHITE, 0.7); g.lineBetween(p.x - 48 * s, p.y + 2, p.x + 28 * s, p.y - 54);
  // A rope to the coping stone.
  g.lineStyle(1.2, INK, 1); g.lineBetween(p.x - 40 * s, p.y - 6, p.x - 54 * s, p.y - 32);
}

function drawPole(g: G, x: number, y: number): void {
  inkShadow(g, x, y + 2, 16, 6);
  g.fillStyle(INK, 1); g.fillRect(x - 3, y - 66, 6, 66);
  g.fillRect(x - 6, y - 70, 12, 5);
  g.lineStyle(1, WHITE, 0.7); g.lineBetween(x - 1, y - 62, x - 1, y - 6);
}

// ── Animated helpers ────────────────────────────────────────────────────

/** Moving bare-paper ripple strokes riding the canal current (eastward), in one canal rect. */
function canalRipples(g: G, r: Rect, view: Rect, s: number, seed: number): void {
  if (!inView(view, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) / 2 + 40)) return;
  const horizontal = r.w >= r.h;
  const n = Math.floor((horizontal ? r.w : r.h) / 55);
  for (let i = 0; i < n; i++) {
    const k = (i * 9301 + seed * 49297) % 233280 / 233280;
    const lane = ((i * 37) % 100) / 100;
    if (horizontal) {
      const x = r.x + ((k * r.w + s * 18) % r.w);
      const y = r.y + 12 + lane * (r.h - 24);
      if (!inView(view, x, y, 20)) continue;
      const wob = Math.sin(s * 1.7 + i) * 2;
      g.lineStyle(1.4, WHITE, 0.5);
      g.beginPath(); g.arc(x, y + wob, 9, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
      g.beginPath(); g.arc(x + 14, y + wob + 1, 6, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    } else {
      const y = r.y + ((k * r.h + s * 14) % r.h);
      const x = r.x + 10 + lane * (r.w - 20);
      if (!inView(view, x, y, 20)) continue;
      g.lineStyle(1.4, WHITE, 0.5);
      g.beginPath(); g.arc(x, y, 7, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    }
  }
}

/** A squid in its pen: white mantle, ink outline, pie-cut eyes, eight lazy arms; sometimes it puffs. */
function penSquid(g: G, x: number, y: number, s: number, i: number, Z = 1): void {
  const bob = Math.sin(s * 1.3 + i * 2.1) * 3 * Z;
  const face = Math.sin(s * 0.4 + i) * 0.6;
  // Arms trailing.
  for (let a = 0; a < 6; a++) {
    const base = Math.PI / 2 + (a - 2.5) * 0.28 + face * 0.3;
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const d = (8 + k * 5) * Z;
      const curl = Math.sin(s * 2.4 + a + k * 0.8) * k * 0.9 * Z;
      pts.push({ x: x + Math.cos(base) * d + curl, y: y + bob + Math.sin(base) * d });
    }
    g.lineStyle(3.5 * Z, INK, 1); polyline(g, pts);
    g.lineStyle(1.6 * Z, WHITE, 1); polyline(g, pts);
  }
  // Mantle.
  const m = [
    P(x - 11 * Z, y + bob + 6 * Z), P(x - 9 * Z, y + bob - 12 * Z), P(x, y + bob - 24 * Z),
    P(x + 9 * Z, y + bob - 12 * Z), P(x + 11 * Z, y + bob + 6 * Z),
  ];
  g.fillStyle(WHITE, 1); g.fillPoints(m, true, true);
  g.lineStyle(2.2, INK, 1); g.strokePoints(m, true, true);
  if (Z > 1.4) {
    // Old Gloom's scars: three tap-marks where the ink-tappers' needles go in.
    g.lineStyle(1.5, INK, 1);
    for (let k = 0; k < 3; k++) g.lineBetween(x - 6 * Z + k * 5 * Z, y + bob - 16 * Z, x - 4 * Z + k * 5 * Z, y + bob - 10 * Z);
  }
  // Eyes — pie-cut pupils, the house style.
  for (const ex of [-5, 5]) {
    g.fillStyle(WHITE, 1); g.fillEllipse(x + ex * Z, y + bob, 7 * Z, 9 * Z);
    g.lineStyle(1.2, INK, 1); g.strokeEllipse(x + ex * Z, y + bob, 7 * Z, 9 * Z);
    g.fillStyle(INK, 1); g.slice(x + (ex + face) * Z, y + bob + Z, 2.6 * Z, -2.2, 3.6, false); g.fillPath();
  }
  // A puff of ink every few seconds — the stock is milked for the Queen's presses.
  const ph = ((s + i * 1.7) % 6) / 6;
  if (ph < 0.25) {
    const k = ph / 0.25;
    g.fillStyle(INK, 0.6 * (1 - k)); g.fillCircle(x + 4 * Z, y + bob + (26 + k * 10) * Z, (6 + k * 14) * Z);
    g.lineStyle(1, WHITE, 0.4 * (1 - k)); g.strokeCircle(x + 4 * Z, y + bob + (26 + k * 10) * Z, (6 + k * 14) * Z);
  }
}

/** A blue reading-lamp beam swept along the street from a censor's tower. */
function towerBeam(g: G, t: { x: number; y: number; r: number; h: number }, s: number, i: number, view: Rect): void {
  const lx = t.x, ly = t.y - t.h - 30;
  const sweep = Math.sin(s * 0.35 + i * 2.2) * 1.1 + Math.PI / 2 + (i === 1 ? 0.4 : i === 2 ? -Math.PI / 2 - 0.6 : 0);
  const dist = 240 + Math.sin(s * 0.5 + i) * 40;
  const fx = t.x + Math.cos(sweep) * dist, fy = t.y + Math.sin(sweep) * dist * 0.6;
  if (!inView(view, (lx + fx) / 2, (ly + fy) / 2, 360)) return;
  const nx = -Math.sin(sweep) * 46, ny = Math.cos(sweep) * 28;
  g.fillStyle(BLUE, 0.1);
  g.fillTriangle(lx - 4, ly, lx + 4, ly, fx + nx, fy + ny);
  g.fillTriangle(lx - 4, ly, fx - nx, fy - ny, fx + nx, fy + ny);
  g.fillStyle(BLUE_WASH, 0.18); g.fillEllipse(fx, fy, 104, 58);
  g.lineStyle(1.5, BLUE, 0.4); g.strokeEllipse(fx, fy, 104, 58);
  g.fillStyle(BLUE_LIT, 0.8); g.fillCircle(lx, ly, 5);
}

/** A decree drifting down the canal on the current, turning slowly. */
function floatingDecree(g: G, s: number, i: number, view: Rect): void {
  const span = AREA_W + 200;
  const x = -100 + ((s * 16 + i * 610) % span);
  const y = CANAL.y + 22 + ((i * 23) % 36);
  if (x > PENS.x && x < PENS.x + PENS.w) return;
  if (!inView(view, x, y, 30)) return;
  const rot = Math.sin(s * 0.3 + i) * 0.8;
  g.fillStyle(INK, 0.25); g.fillEllipse(x, y + 8, 22, 6);
  decreeSheet(g, x, y - 6, 15, 12, rot, i);
}

// ── The painter ─────────────────────────────────────────────────────────

const LINE_SHEETS = LINES.map((l, i) => {
  const r = mulberry(0x1e5 + i * 31);
  const n = Math.max(3, Math.floor(Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) / 24));
  return Array.from({ length: n }, (_, k) => ({ t: (k + 0.5) / n, w: 13 + r() * 5, h: 16 + r() * 7, ph: r() * 6 }));
});

/** Pen slots (centres of the six pens) for the animated squids. */
const PEN_SPOTS: Pt[] = (() => {
  const out: Pt[] = [];
  const pw = PENS.w / 3, ph = (PENS.h - 20) / 2;
  for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) out.push({ x: PENS.x + c * pw + pw / 2, y: PENS.y + 26 + r * ph + ph / 2 - 6 });
  return out;
})();

/** Canal rects (for ripples) — the Grand Canal in pieces between bridges, plus the Cut. */
const CANAL_RECTS: Rect[] = (() => {
  const out: Rect[] = [];
  let x = PENS.x + PENS.w;
  for (const b of BRIDGES_X) { out.push({ x, y: CANAL.y, w: b.x0 - x, h: CANAL.h }); x = b.x1; }
  out.push({ x, y: CANAL.y, w: AREA_W - x, h: CANAL.h });
  let y = CUT.y0;
  for (const b of CUT_BRIDGES_Y) { out.push({ x: CUT.x, y, w: CUT.w, h: b.y0 - y }); y = b.y1; }
  out.push({ x: CUT.x, y, w: CUT.w, h: CUT.y1 - y });
  return out;
})();

export const INKWELL_PAINTER: AreaPainter = {
  ground(g, rng) {
    ruledPaper(g, rng);
    // The Grand Canal (one long body, bridges laid over it) and the Quill Cut.
    canalBody(g, { x: 0, y: CANAL.y, w: AREA_W, h: CANAL.h }, rng);
    canalBody(g, { x: CUT.x, y: CUT.y0, w: CUT.w, h: CUT.y1 - CUT.y0 + 4 }, rng);
    squidPens(g, rng);
    // The fishing reach: a punt stage of planks along the bank, a mooring ring, a tally board.
    g.fillStyle(INK, 1); g.fillRect(REACH.x + 60, REACH.y - 30, 200, 26);
    g.fillStyle(WHITE, 1); g.fillRect(REACH.x + 63, REACH.y - 27, 194, 20);
    g.lineStyle(1, INK, 0.7);
    for (let k = REACH.x + 75; k < REACH.x + 257; k += 12) g.lineBetween(k, REACH.y - 27, k, REACH.y - 7);
    // Streets, then the square over them.
    for (const r of ROADS) street(g, r, r === ROADS[8] ? 34 : 50, rng);
    decreeSquare(g, rng);
    for (const b of BRIDGES_X) bridgeDeck(g, b.x0, b.x1, CANAL.y - 14, CANAL.y + CANAL.h + 14, true);
    for (const b of CUT_BRIDGES_Y) bridgeDeck(g, CUT.x - 14, CUT.x + CUT.w + 14, b.y0, b.y1, false);
    // Ink puddles in the gutters, splashes at the press door, the blot under the Hall.
    for (let i = 0; i < 30; i++) {
      const road = ROADS[Math.floor(rng() * ROADS.length)];
      const p = road[Math.floor(rng() * road.length)];
      inkBlot(g, p.x + (rng() - 0.5) * 80, p.y + (rng() - 0.5) * 40, 5 + rng() * 9, rng);
    }
    for (let i = 0; i < 6; i++) inkBlot(g, PRESS.x - 60 + rng() * 120, PRESS.y + 14 + rng() * 30, 6 + rng() * 10, rng);
    inkBlot(g, HALL.x, HALL.y + 40, 26, rng);
    // A big spilt-well stain round the manor's foot (the Prince's ink runs downhill into town).
    for (let k = 0; k < 4; k++) inkBlot(g, MANOR.x - 150 + k * 100, MANOR.y + 12, 14 + rng() * 10, rng);
    // Ink-hatched shade along the foot of the north wall.
    hatchRect(g, { x: 0, y: WALL_N, w: AREA_W, h: 26 }, 6, INK, 0.3);
    // Blue tide-line paint on the square's kerbs: the Queen's water marks.
    g.lineStyle(2, BLUE, 0.5); g.strokeEllipse(SQUARE.x, SQUARE.y, SQUARE.rx * 2 + 24, SQUARE.ry * 2 + 20);
  },

  pieces: [
    { x: MANOR.x, y: MANOR.y, w: MANOR.w + 220, h: MANOR.y - 30, draw: drawManor },
    { x: PRESS.x, y: PRESS.y, w: PRESS.w + 80, h: PRESS.h + 110, draw: drawPress },
    { x: SHOP.x, y: SHOP.y, w: SHOP.w + 80, h: SHOP.h + 70, draw: drawShop },
    { x: HALL.x, y: HALL.y, w: HALL.w + 40, h: 220, draw: (g: G) => drawHall(g) },
    { x: ARCHIVE.x, y: ARCHIVE.y, w: ARCHIVE.w + 40, h: 190, draw: drawArchive },
    ...TOWERS.map((t) => ({ x: t.x, y: t.y, w: t.r * 3 + 40, h: t.h + t.r * 2 + 90, draw: (g: G, rng: () => number) => drawTower(g, t, rng) })),
    ...HOUSES.map((hs) => ({
      x: hs.x, y: hs.y, w: hs.w + hs.floors * 6 + 30, h: hs.floors * 44 + (hs.w + hs.floors * 6) * 0.95 + 20,
      draw: (g: G, rng: () => number) => drawHouse(g, hs, rng),
    })),
    ...Array.from({ length: WALL_SEGMENTS }, (_, i) => ({
      x: (i + 0.5) * (AREA_W / WALL_SEGMENTS), y: WALL_N, w: AREA_W / WALL_SEGMENTS + 10, h: 260,
      draw: (g: G, rng: () => number) => drawWallSegment(g, i, rng),
    })),
    ...LAMPS.map((p) => ({ x: p.x, y: p.y, w: 24, h: 84, draw: (g: G) => drawLamp(g, p.x, p.y) })),
    ...PUNTS.map((p) => ({ x: p.x, y: p.y, w: 110, h: 70, draw: (g: G) => drawPunt(g, p) })),
    ...LINES.flatMap((l) => [l.a, l.b]).map((p) => ({ x: p.x, y: p.y, w: 20, h: 74, draw: (g: G) => drawPole(g, p.x, p.y) })),
  ],

  animate(g, t, view) {
    const s = t;
    for (let i = 0; i < CANAL_RECTS.length; i++) canalRipples(g, CANAL_RECTS[i], view, s, i + 1);
    for (let i = 0; i < 4; i++) floatingDecree(g, s, i, view);
    // The pens: squids bobbing, puffing, the water inside the nets stirred.
    if (inView(view, PENS.x + PENS.w / 2, PENS.y + PENS.h / 2, PENS.w)) {
      canalRipples(g, { x: PENS.x + 10, y: PENS.y + 20, w: PENS.w - 20, h: PENS.h - 30 }, view, s * 0.4, 99);
      PEN_SPOTS.forEach((p, i) => penSquid(g, p.x, p.y - (i === 2 ? 8 : 0), s, i, i === 2 ? 1.7 : 1));
    }
    // Blue lamp glow pooled on the flagstones.
    for (let i = 0; i < LAMPS.length; i++) {
      const p = LAMPS[i];
      if (!inView(view, p.x, p.y, 80)) continue;
      const fl = 0.85 + 0.15 * Math.sin(s * 3 + i * 1.9);
      g.fillStyle(BLUE_WASH, 0.22 * fl); g.fillEllipse(p.x, p.y + 6, 90, 34);
      g.lineStyle(1, BLUE, 0.25 * fl); g.strokeEllipse(p.x, p.y + 6, 90, 34);
    }
    // The manor's ink seeping: a slow drip that runs from the step into the square.
    if (inView(view, MANOR.x, MANOR.y, 300)) {
      const ph = (s * 0.25) % 1;
      g.fillStyle(INK, 1); g.fillCircle(MANOR.x - 40, MANOR.y + 18 + ph * 40, 3 + ph * 2);
      g.lineStyle(1, WHITE, 0.6); g.strokeCircle(MANOR.x - 40, MANOR.y + 18 + ph * 40, 3 + ph * 2);
    }
    // Bubbles rising in the black canal — something below breathes.
    for (let i = 0; i < 10; i++) {
      const bx = 520 + ((i * 211) % (AREA_W - 600));
      const ph = ((s * 0.6 + i * 0.37) % 1);
      const by = CANAL.y + 20 + ((i * 17) % 40);
      if (!inView(view, bx, by, 20) || ph > 0.4) continue;
      g.lineStyle(1.2, WHITE, 0.7 * (1 - ph / 0.4)); g.strokeCircle(bx, by, 2 + ph * 10);
    }
  },

  animateOver(g, t, view) {
    const s = t;
    // Decrees drying on the lines: each sheet swings on its peg in the canal wind.
    LINES.forEach((l, li) => {
      const mx = (l.a.x + l.b.x) / 2, my = (l.a.y + l.b.y) / 2 - 62;
      if (!inView(view, mx, my, 160)) return;
      const ax = l.a.x, ay = l.a.y - 64, bx = l.b.x, by = l.b.y - 64;
      const pts: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const tt = k / 12;
        pts.push({ x: ax + (bx - ax) * tt, y: ay + (by - ay) * tt + Math.sin(Math.PI * tt) * (l.sag + Math.sin(s * 1.4 + li) * 2) });
      }
      g.lineStyle(1.5, INK, 1); polyline(g, pts);
      for (const sh of LINE_SHEETS[li]) {
        const tt = sh.t;
        const px = ax + (bx - ax) * tt;
        const py = ay + (by - ay) * tt + Math.sin(Math.PI * tt) * (l.sag + Math.sin(s * 1.4 + li) * 2);
        const tilt = Math.sin(s * 2.2 + sh.ph) * 0.22 + Math.sin(s * 5.3 + sh.ph * 2) * 0.05;
        decreeSheet(g, px, py, sh.w, sh.h, tilt, Math.floor(sh.ph * 10));
      }
    });
    // The censors' lamps sweep the streets.
    TOWERS.forEach((tw, i) => towerBeam(g, tw, s, i, view));
    // The Pressworks flywheel turns; the stoves breathe a smudge of ink smoke.
    const fx = PRESS.x - PRESS.w / 2 - 20, fy = PRESS.y - 62;
    if (inView(view, fx, fy, 160)) {
      const a0 = s * 2.6;
      g.lineStyle(4, INK, 1);
      for (let k = 0; k < 6; k++) {
        const a = a0 + (k * Math.PI) / 3;
        g.lineBetween(fx, fy, fx + Math.cos(a) * 32, fy + Math.sin(a) * 32);
      }
      g.fillStyle(INK, 1); g.fillCircle(fx, fy, 7);
      g.fillStyle(WHITE, 1); g.fillCircle(fx, fy, 3);
      const cx = PRESS.x + PRESS.w / 2 - 37, cy = PRESS.y - PRESS.h - 100;
      for (let k = 0; k < 5; k++) {
        const ph = (s * 0.3 + k / 5) % 1;
        g.fillStyle(INK_SOFT, 0.45 * (1 - ph)); g.fillCircle(cx + Math.sin(s + k) * 8 + ph * 30, cy - ph * 90, 7 + ph * 16);
        g.lineStyle(1, INK, 0.4 * (1 - ph)); g.strokeCircle(cx + Math.sin(s + k) * 8 + ph * 30, cy - ph * 90, 7 + ph * 16);
      }
    }
    // The manor's blue windows pulse with the Prince's moods; the quill-tip catches a glint.
    if (inView(view, MANOR.x, MANOR.y - 200, 400)) {
      const pulse = 0.5 + 0.5 * Math.sin(s * 1.6);
      for (const wx of [MANOR.x - 120, MANOR.x - 60, MANOR.x + 60, MANOR.x + 120]) {
        g.fillStyle(BLUE_LIT, 0.15 + pulse * 0.2); g.fillCircle(wx, MANOR.y - 64, 24);
      }
      const gl = (s * 0.5) % 1;
      if (gl < 0.12) {
        const k = gl / 0.12;
        g.lineStyle(2, WHITE, 1 - k);
        const gx = MANOR.x + 175, gy = 46;
        g.lineBetween(gx - 8 - k * 6, gy, gx + 8 + k * 6, gy); g.lineBetween(gx, gy - 8 - k * 6, gx, gy + 8 + k * 6);
      }
    }
    // Squid ink drifting off the pens in a faint grey haze.
    if (inView(view, PENS.x + PENS.w / 2, PENS.y, 300)) {
      for (let k = 0; k < 6; k++) {
        const ph = (s * 0.12 + k / 6) % 1;
        g.fillStyle(GREY, 0.1 * (1 - ph));
        g.fillEllipse(PENS.x + 40 + k * 70 + ph * 40, PENS.y - ph * 60, 60 + ph * 50, 20 + ph * 14);
      }
    }
  },
};
