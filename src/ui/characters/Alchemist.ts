import Phaser from 'phaser';
import { mix } from '../Theme';
import { MenuCharacter, fillPts } from './MenuCharacter';

const ALCH = {
  SKIN: 0xe8c9a4,
  SKIN_DARK: 0xb8906a,
  SKIN_LIT: 0xf7e2c8,
  COAT: 0xd8d2c4,
  COAT_DARK: 0x9a9488,
  COAT_LIT: 0xf0ece2,
  HAIR: 0xe9e4d2,
  HAIR_DARK: 0xa8a290,
  BRASS: 0xc89a3c,
  BRASS_LIT: 0xf0d48a,
  LENS: 0x7fe3ff,
  INK: 0x16120e,
  SOOT: 0x1a1612,
};
type AlchPalette = typeof ALCH;

/**
 * The Lab's alchemist: a frazzled, wild-haired chemist in a singed coat with brass goggles
 * pushed up into the hair. Faces right, toward the flask. Every failed mix leaves soot on
 * him and stands the hair up further; it settles over the next few seconds.
 *
 * Origin `(0, 0)` is the bench top his hands rest on. About 190px tall at scale 1.
 */
export class Alchemist extends MenuCharacter {
  /** The palette in use — the real one, or the spectral remap for the King's dead chemist. */
  private readonly pal: AlchPalette;
  private readonly spectral: boolean;

  /** 0–1: how blackened he is. Fades on its own. */
  private soot = 0;
  /** Extra hair lift from the last bang, 0–1. */
  private frazzle = 0;
  /** Stable scatter for the soot smudges and singe holes. */
  private seed = 3;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: { scale?: number; depth?: number; flip?: boolean; spectral?: boolean } = {}) {
    super(scene, x, y, opts);
    this.spectral = !!opts.spectral;
    if (this.spectral) {
      // Everything drained toward a cold moonlit blue and drawn translucent: a ghost.
      const remap = (c: number): number => mix(mix(c, 0x9fd7ff, 0.55), 0x6a7aa8, 0.25);
      this.pal = Object.fromEntries(Object.entries(ALCH).map(([k, v]) => [k, remap(v)])) as AlchPalette;
      this.g.setAlpha(0.72);
    } else {
      this.pal = ALCH;
    }
  }

  mouth(): { x: number; y: number } {
    return { x: this.x + 30 * this.scale * this.dir, y: this.y - 118 * this.scale };
  }

  /** A blast just went off in his face. */
  blacken(amount = 1): void {
    this.soot = Math.min(1, this.soot + amount);
    this.frazzle = 1;
    this.seed += 1;
    this.knock(1);
    this.setMood('shocked', 2600);
  }

  protected paint(g: Phaser.GameObjects.Graphics, t: number): void {
    const A = this.pal;
    if (this.spectral) this.soot = 0;
    this.soot = Math.max(0, this.soot - 0.0012);
    this.frazzle = Math.max(0, this.frazzle - 0.0025);
    const breath = Math.sin(t * 1.5) * 1.4;
    const thinking = this.mood === 'thinking';
    const pleased = this.mood === 'pleased';
    const shocked = this.mood === 'shocked' || this.mood === 'surprised';
    const headX = 6 + Math.sin(t * 0.8) * 1.4;
    const headY = -140 + breath + (shocked ? -5 : 0);
    const sootC = (c: number, k = 1): number => mix(c, A.SOOT, this.soot * 0.75 * k);

    // ── Coat: narrow shoulders, a long lab coat with a notched collar, pockets, singe holes ──
    const coat: [number, number][] = [
      [-46, 0], [-50, -70 + breath], [-40, -108 + breath], [-14, -118 + breath], [26, -118 + breath], [48, -104 + breath], [52, -60], [48, 0],
    ];
    fillPts(g, coat, A.INK);
    fillPts(g, coat.map(([x, y]) => [x * 0.97, y * 0.97 + 1] as [number, number]), sootC(A.COAT));
    // Shirt and a crooked tie in the V.
    fillPts(g, [[-8, -112 + breath], [20, -114 + breath], [14, -72], [4, -66], [-6, -74]], sootC(0x6f8fb5));
    fillPts(g, [[2, -106 + breath], [10, -106 + breath], [12, -70], [6, -62], [0, -70]], sootC(0x8a2a3a));
    // Lapels.
    fillPts(g, [[-40, -108 + breath], [-8, -112 + breath], [-2, -64], [-20, -40], [-26, -70]], sootC(A.COAT_LIT));
    fillPts(g, [[20, -114 + breath], [48, -104 + breath], [34, -70], [14, -40], [10, -64]], sootC(A.COAT_LIT));
    g.lineStyle(1.2, A.COAT_DARK, 0.8);
    g.lineBetween(-8, -112 + breath, -2, -64); g.lineBetween(20, -114 + breath, 14, -40);
    g.lineBetween(-2, -64, 2, -4);
    // Pocket with pens, a pocket on the other side with a scorch.
    g.fillStyle(sootC(A.COAT_DARK), 1); g.fillRect(-40, -48, 22, 18);
    g.fillStyle(sootC(A.COAT), 1); g.fillRect(-39, -47, 20, 16);
    for (const [px, pc] of [[-36, 0x2255aa], [-31, 0xaa2233], [-26, 0x22aa55]] as const) {
      g.fillStyle(pc, 1); g.fillRect(px, -56, 3, 10);
      g.fillStyle(A.BRASS, 1); g.fillRect(px, -56, 3, 2);
    }
    g.fillStyle(sootC(A.COAT_DARK), 1); g.fillRect(22, -46, 22, 18);
    g.fillStyle(sootC(A.COAT), 1); g.fillRect(23, -45, 20, 16);
    // Singe holes: dark ragged blots with a brown rim, more of them the sootier he is.
    const holes = 2 + Math.round(this.soot * 4);
    for (let i = 0; i < holes; i++) {
      const h = Math.sin((i + this.seed) * 12.9898) * 43758.5453;
      const u = h - Math.floor(h);
      const hx = -36 + u * 70;
      const hy = -100 + ((u * 7.3) % 1) * 80;
      g.fillStyle(0x6a4a2a, 0.9); g.fillCircle(hx, hy, 3.5 + u * 2);
      g.fillStyle(A.INK, 1); g.fillCircle(hx, hy, 2 + u * 1.5);
    }
    // Soot smudges across the coat and face.
    if (this.soot > 0.05) {
      for (let i = 0; i < 7; i++) {
        const h = Math.sin((i + this.seed * 3) * 78.233) * 43758.5453;
        const u = h - Math.floor(h);
        g.fillStyle(A.SOOT, this.soot * 0.55);
        g.fillEllipse(-30 + u * 70, -110 + ((u * 5.1) % 1) * 100, 10 + u * 12, 6 + u * 5);
      }
    }
    g.fillStyle(A.INK, 0.3); g.fillEllipse(headX + 2, -112 + breath, 44, 14);

    // ── Arms: one hand flat on the bench, the other raised holding a pipette (or on the chin, thinking) ──
    const sx = -44; const sy = -92 + breath;
    const ex = -66; const ey = -46;
    const hx = -24 + Math.sin(t * 1.3) * 1.5; const hy = -4;
    g.lineStyle(20, A.INK, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy - 8);
    g.fillStyle(A.INK, 1); g.fillCircle(ex, ey, 10);
    g.lineStyle(16, sootC(A.COAT), 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy - 8);
    g.fillStyle(sootC(A.COAT), 1); g.fillCircle(ex, ey, 8);
    g.fillStyle(sootC(A.COAT_DARK), 1); g.fillEllipse(hx, hy - 12, 20, 9);
    g.fillStyle(A.INK, 1); g.fillEllipse(hx, hy - 3, 26, 14);
    g.fillStyle(sootC(A.SKIN), 1); g.fillEllipse(hx, hy - 3, 23, 12);
    for (let f = 0; f < 4; f++) {
      g.lineStyle(5, A.INK, 1); g.lineBetween(hx + 8, hy - 9 + f * 4, hx + 20 - Math.abs(f - 1.5) * 2, hy - 8 + f * 4);
      g.lineStyle(3.6, sootC(A.SKIN), 1); g.lineBetween(hx + 8, hy - 9 + f * 4, hx + 20 - Math.abs(f - 1.5) * 2, hy - 8 + f * 4);
    }
    // Right arm.
    const rsx = 46; const rsy = -94 + breath;
    const raised = !thinking;
    const rex = raised ? 74 : 54; const rey = raised ? -70 : -60;
    const rhx = thinking ? headX + 22 : 70 + Math.sin(t * 2.1) * 2;
    const rhy = thinking ? headY + 22 : -118 + Math.sin(t * 2.1) * 2;
    g.lineStyle(20, A.INK, 1); g.lineBetween(rsx, rsy, rex, rey); g.lineBetween(rex, rey, rhx, rhy + 6);
    g.fillStyle(A.INK, 1); g.fillCircle(rex, rey, 10);
    g.lineStyle(16, sootC(A.COAT), 1); g.lineBetween(rsx, rsy, rex, rey); g.lineBetween(rex, rey, rhx, rhy + 6);
    g.fillStyle(sootC(A.COAT), 1); g.fillCircle(rex, rey, 8);
    g.fillStyle(sootC(A.COAT_DARK), 1); g.fillCircle(rhx, rhy + 8, 9);
    g.fillStyle(A.INK, 1); g.fillCircle(rhx, rhy, 10);
    g.fillStyle(sootC(A.SKIN), 1); g.fillCircle(rhx, rhy, 8.5);
    if (!thinking) {
      // A pipette pinched between finger and thumb, a drop hanging off it.
      g.lineStyle(3, A.INK, 1); g.lineBetween(rhx - 2, rhy - 6, rhx + 10, rhy - 34);
      g.lineStyle(1.6, 0xcfe8ff, 0.9); g.lineBetween(rhx - 2, rhy - 6, rhx + 10, rhy - 34);
      g.fillStyle(0x8a2a3a, 1); g.fillEllipse(rhx + 11, rhy - 37, 7, 9);
      const drip = (t * 0.6) % 1;
      g.fillStyle(0x7fe3ff, 1 - drip); g.fillCircle(rhx - 3, rhy - 3 + drip * 10, 1.8);
    }

    // ── Neck and head: a long thin face, big nose, bags under the eyes ──
    g.fillStyle(A.INK, 1); g.fillRect(headX - 10, headY + 22, 20, 22);
    g.fillStyle(sootC(A.SKIN_DARK), 1); g.fillRect(headX - 8, headY + 22, 16, 22);
    const skull: [number, number][] = [
      [headX - 26, headY - 20], [headX - 20, headY - 38], [headX + 2, headY - 46], [headX + 24, headY - 36],
      [headX + 30, headY - 12], [headX + 26, headY + 18], [headX + 10, headY + 32], [headX - 10, headY + 32], [headX - 24, headY + 12],
    ];
    fillPts(g, skull, A.INK);
    fillPts(g, skull.map(([x, y]) => [headX + (x - headX) * 0.94, headY + (y - headY) * 0.95] as [number, number]), sootC(A.SKIN, 0.8));
    fillPts(g, [[headX - 18, headY - 24], [headX + 2, headY - 38], [headX + 20, headY - 28], [headX + 6, headY - 20], [headX - 10, headY - 16]], A.SKIN_LIT, 0.45);
    g.fillStyle(A.SKIN_DARK, 0.45); g.fillEllipse(headX + 2, headY + 24, 30, 10);
    // Ears.
    for (const side of [-1, 1]) {
      const ex2 = headX + side * 27;
      g.fillStyle(A.INK, 1); g.fillEllipse(ex2, headY - 2, 10, 15);
      g.fillStyle(sootC(A.SKIN), 1); g.fillEllipse(ex2, headY - 2, 8, 13);
      g.fillStyle(A.SKIN_DARK, 0.6); g.fillEllipse(ex2, headY - 2, 4, 7);
    }
    // Nose: long, a little bulbous, pointing right.
    fillPts(g, [[headX + 8, headY - 10], [headX + 34, headY + 4], [headX + 30, headY + 12], [headX + 14, headY + 10]], A.INK);
    fillPts(g, [[headX + 9, headY - 9], [headX + 32, headY + 4], [headX + 29, headY + 11], [headX + 14, headY + 9]], sootC(A.SKIN));
    g.fillStyle(A.SKIN_LIT, 0.5); g.fillEllipse(headX + 24, headY + 1, 8, 4);
    g.fillStyle(A.SKIN_DARK, 1); g.fillCircle(headX + 26, headY + 9, 1.6);

    // ── Eyes: big, tired, with bags; wide when shocked, squinting when pleased ──
    const look = this.lookDir(this.x + headX * this.scale * this.dir, this.y + headY * this.scale);
    const open = 1 - this.blink;
    const wide = shocked ? 1.5 : pleased ? 0.5 : 1;
    const eyes: [number, number, number][] = [[headX - 8, headY - 10, 6], [headX + 16, headY - 12, 6]];
    eyes.forEach(([ex, ey, er], i) => {
      const h = er * open * wide;
      // Bags.
      g.lineStyle(1.4, A.SKIN_DARK, 0.9);
      g.beginPath(); g.arc(ex, ey + 2, er + 1.5, 0.25, Math.PI - 0.25); g.strokePath();
      g.fillStyle(A.INK, 1); g.fillEllipse(ex, ey, er * 2 + 2, h * 2 + 2);
      g.fillStyle(0xfdfbf4, 1); g.fillEllipse(ex, ey, er * 2, h * 2);
      if (open > 0.2) {
        // Shocked: pupils shrink to pins.
        const px = ex + look.x * er * 0.45;
        const py = ey + look.y * er * 0.4;
        g.fillStyle(0x2a4a7a, 1); g.fillCircle(px, py, er * (shocked ? 0.3 : 0.55));
        g.fillStyle(0x000000, 1); g.fillCircle(px, py, er * (shocked ? 0.15 : 0.3));
        g.fillStyle(0xffffff, 0.9); g.fillCircle(px - er * 0.2, py - er * 0.22, er * 0.14);
      }
      // Bloodshot threads.
      g.lineStyle(0.8, 0xd06a6a, 0.6);
      g.lineBetween(ex - er * 0.8, ey + 1, ex - er * 0.3, ey + h * 0.3);
      // Brows: thin, raised high when shocked, pinched when thinking.
      const tilt = thinking ? (i === 0 ? 2 : -2) : 0;
      const lift = shocked ? -5 : 0;
      g.lineStyle(2.2, A.HAIR_DARK, 1);
      g.lineBetween(ex - er - 1, ey - er - 4 + lift + tilt, ex + er + 1, ey - er - 4 + lift - tilt);
    });

    // ── Mouth: thin; flaps while talking, an O when shocked, a crooked smile when pleased ──
    const talkOpen = this.talking ? Math.abs(Math.sin(t * 15)) * 5 : 0;
    const openM = Math.max(talkOpen, shocked ? 7 : 0);
    const mx = headX + 10;
    const my = headY + 20;
    if (openM > 1.5) {
      g.fillStyle(A.INK, 1); g.fillEllipse(mx, my, 12 + openM * 0.6, openM + 2);
      g.fillStyle(0x4a1020, 1); g.fillEllipse(mx, my + 0.5, 9 + openM * 0.4, openM);
      g.fillStyle(0xf0e6c0, 1); g.fillRect(mx - 4, my - openM / 2, 8, 2);
    } else {
      g.lineStyle(1.8, A.INK, 1);
      g.beginPath();
      g.moveTo(mx - 9, my + (pleased ? 2 : 0));
      g.lineTo(mx, my + (pleased ? -2 : 0.5));
      g.lineTo(mx + 9, my + (pleased ? -3 : -1));
      g.strokePath();
    }

    // ── Hair: a shock of white standing in every direction; frazzle stands it up further ──
    const lift = 1 + this.frazzle * 0.8;
    const tufts = 13;
    for (let i = 0; i < tufts; i++) {
      const u = i / (tufts - 1);
      const ang = -Math.PI * 0.95 + u * Math.PI * 0.9 + Math.sin(t * 2 + i) * 0.04;
      const bx = headX - 2 + Math.cos(ang * 0.8) * 24;
      const by = headY - 28 + Math.sin(ang) * 10;
      const len = (16 + ((i * 7) % 5) * 5 + (i % 2) * 6) * lift;
      const wob = Math.sin(t * 3 + i * 1.7) * 2 * this.frazzle;
      const tx = bx + Math.cos(ang) * len + wob;
      const ty = by + Math.sin(ang) * len * 1.1 - this.frazzle * 6;
      g.lineStyle(5.5, A.INK, 1); g.lineBetween(bx, by, tx, ty);
      g.lineStyle(3.5, sootC(i % 3 ? A.HAIR : A.HAIR_DARK, 0.6), 1); g.lineBetween(bx, by, tx, ty);
    }
    fillPts(g, [[headX - 28, headY - 22], [headX - 18, headY - 44], [headX + 4, headY - 52], [headX + 26, headY - 42], [headX + 32, headY - 20], [headX + 10, headY - 30], [headX - 12, headY - 30]], A.INK);
    fillPts(g, [[headX - 26, headY - 22], [headX - 17, headY - 42], [headX + 4, headY - 50], [headX + 25, headY - 40], [headX + 30, headY - 20], [headX + 10, headY - 29], [headX - 12, headY - 29]], sootC(A.HAIR, 0.6));
    // Goggles pushed up into the hair: two brass cups with cyan lenses on a strap.
    const gy = headY - 36;
    g.lineStyle(3, 0x3a2a1a, 1);
    g.beginPath(); g.arc(headX + 2, gy + 12, 28, Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
    for (const gx of [headX - 10, headX + 14]) {
      g.fillStyle(A.INK, 1); g.fillCircle(gx, gy, 10);
      g.fillStyle(A.BRASS, 1); g.fillCircle(gx, gy, 8.5);
      g.fillStyle(mix(A.LENS, 0x000000, 0.4), 1); g.fillCircle(gx, gy, 6);
      g.fillStyle(A.LENS, 0.7); g.fillCircle(gx - 1, gy - 1, 4.5);
      g.fillStyle(0xffffff, 0.8); g.fillEllipse(gx - 2.5, gy - 2.5, 3, 1.8);
      g.lineStyle(1, A.BRASS_LIT, 0.9); g.strokeCircle(gx, gy, 8);
    }
    g.fillStyle(A.BRASS, 1); g.fillRect(headX - 1, gy - 2, 6, 4);
  }
}
