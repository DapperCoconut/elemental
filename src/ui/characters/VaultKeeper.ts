import Phaser from 'phaser';
import { mix } from '../Theme';
import { MenuCharacter, fillPts } from './MenuCharacter';

/**
 * The vault-keeper: a short, broad old clerk in a green eyeshade and round spectacles, a
 * waistcoat with a watch chain, sleeve garters, and a ring of keys the size of a dinner
 * plate on his belt. A ledger under one arm. Faces right, toward the strongboxes.
 *
 * Origin `(0, 0)` is the floor under his boots. About 150px tall at scale 1.
 */
export class VaultKeeper extends MenuCharacter {
  private static readonly SKIN = 0xd9b48c;
  private static readonly SKIN_DARK = 0xa67c55;
  private static readonly SKIN_LIT = 0xf0d2b0;
  private static readonly VEST = 0x4a3b2a;
  private static readonly VEST_LIT = 0x6b5640;
  private static readonly SHIRT = 0xe8e2d0;
  private static readonly SHIRT_DARK = 0xa9a394;
  private static readonly TROUSER = 0x2b2a36;
  private static readonly BEARD = 0xcfcad8;
  private static readonly BEARD_DARK = 0x8f8aa0;
  private static readonly BRASS = 0xc89a3c;
  private static readonly BRASS_LIT = 0xf0d48a;
  private static readonly SHADE = 0x2e8b57;
  private static readonly INK = 0x14100c;

  mouth(): { x: number; y: number } {
    return { x: this.x + 26 * this.scale * this.dir, y: this.y - 98 * this.scale };
  }

  protected paint(g: Phaser.GameObjects.Graphics, t: number): void {
    const K = VaultKeeper;
    const breath = Math.sin(t * 1.4) * 1.3;
    const pleased = this.mood === 'pleased' || this.mood === 'greedy';
    const grumpy = this.mood === 'grumpy';
    const surprised = this.mood === 'surprised' || this.mood === 'shocked';
    const headX = 4;
    const headY = -112 + breath + (surprised ? -4 : 0);

    // ── Boots and trousers: short legs, planted ──
    for (const side of [-1, 1]) {
      g.fillStyle(K.INK, 1); g.fillRoundedRect(side * 18 - 14, -14, 28, 14, 4);
      g.fillStyle(0x2a2420, 1); g.fillRoundedRect(side * 18 - 13, -13, 26, 12, 4);
      g.fillStyle(0x4a4038, 0.6); g.fillRect(side * 18 - 13, -13, 26, 3);
      g.fillStyle(K.INK, 1); g.fillRect(side * 18 - 13, -40, 26, 28);
      g.fillStyle(K.TROUSER, 1); g.fillRect(side * 18 - 12, -40, 24, 27);
    }
    // ── Torso: wide and round, waistcoat over a shirt, belt with the key ring ──
    const torso: [number, number][] = [
      [-46, -36], [-50, -70 + breath], [-40, -96 + breath], [-12, -104 + breath], [22, -104 + breath], [48, -94 + breath], [52, -66 + breath], [46, -36],
    ];
    fillPts(g, torso, K.INK);
    fillPts(g, torso.map(([x, y]) => [x * 0.97, y * 0.98 + 0.5] as [number, number]), K.VEST);
    fillPts(g, [[-10, -100 + breath], [20, -100 + breath], [16, -60], [4, -52], [-8, -60]], K.SHIRT);
    fillPts(g, [[-40, -96 + breath], [-10, -100 + breath], [-4, -52], [-22, -40], [-30, -60]], K.VEST_LIT);
    fillPts(g, [[20, -100 + breath], [48, -94 + breath], [36, -60], [16, -40], [10, -52]], K.VEST_LIT);
    g.lineStyle(1.2, K.INK, 0.7);
    g.lineBetween(-10, -100 + breath, -4, -52); g.lineBetween(20, -100 + breath, 16, -40);
    // Buttons and a watch chain looping to the pocket.
    for (let i = 0; i < 3; i++) { g.fillStyle(K.BRASS, 1); g.fillCircle(4 - i * 2, -48 - i * 12, 2.6); }
    g.lineStyle(1.4, K.BRASS, 1);
    g.beginPath(); g.moveTo(2, -62); g.lineTo(14, -70); g.lineTo(30, -58); g.strokePath();
    g.fillStyle(K.BRASS, 1); g.fillCircle(30, -56, 3.6);
    g.fillStyle(K.BRASS_LIT, 1); g.fillCircle(29, -57, 1.2);
    // Belt and the key ring hanging off it, keys swinging a little.
    g.fillStyle(K.INK, 1); g.fillRect(-48, -40, 96, 8);
    g.fillStyle(0x3a2a1a, 1); g.fillRect(-47, -39, 94, 6);
    g.fillStyle(K.BRASS, 1); g.fillRect(-6, -41, 12, 10);
    g.fillStyle(K.INK, 1); g.fillRect(-3, -38, 6, 4);
    const sw = Math.sin(t * 1.9) * 0.08;
    const rx = -40 + Math.sin(sw) * 12;
    const ry = -22 + Math.cos(sw) * 10;
    g.lineStyle(3, K.BRASS, 1); g.strokeCircle(rx, ry, 11);
    g.lineStyle(1, K.BRASS_LIT, 0.8); g.strokeCircle(rx, ry, 10);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.25 + (i / 4) * Math.PI * 0.5 + sw;
      const kx = rx + Math.cos(a) * 11;
      const ky = ry + Math.sin(a) * 11;
      const len = 12 + (i % 2) * 5;
      g.lineStyle(3, K.INK, 1); g.lineBetween(kx, ky, kx + Math.cos(a) * len, ky + Math.sin(a) * len);
      g.lineStyle(1.8, i % 2 ? K.BRASS : 0x9a9aae, 1); g.lineBetween(kx, ky, kx + Math.cos(a) * len, ky + Math.sin(a) * len);
      g.fillStyle(i % 2 ? K.BRASS : 0x9a9aae, 1); g.fillRect(kx + Math.cos(a) * len - 2, ky + Math.sin(a) * len - 1, 4, 3);
    }

    // ── Arms: left holds the ledger against the hip; right rests on the lectern / gestures ──
    // Left arm with ledger.
    g.lineStyle(18, K.INK, 1); g.lineBetween(-46, -90 + breath, -56, -50);
    g.lineStyle(14, K.SHIRT, 1); g.lineBetween(-46, -90 + breath, -56, -50);
    g.fillStyle(K.INK, 1); g.fillRect(-72, -62, 30, 40);
    g.fillStyle(0x7a2a2a, 1); g.fillRect(-71, -61, 28, 38);
    g.fillStyle(0xe6d7b0, 1); g.fillRect(-70, -60, 3, 36);
    g.fillStyle(K.BRASS, 1); g.fillRect(-60, -46, 10, 8);
    g.fillStyle(K.INK, 1); g.fillCircle(-54, -40, 8);
    g.fillStyle(K.SKIN, 1); g.fillCircle(-54, -40, 7);
    // Sleeve garter.
    g.fillStyle(0x7a2a2a, 1); g.fillRect(-54, -82 + breath, 12, 4);
    // Right arm.
    const point = pleased || surprised;
    const rhx = point ? 70 : 54;
    const rhy = point ? -92 + breath : -46;
    g.lineStyle(18, K.INK, 1); g.lineBetween(46, -90 + breath, 62, -68); g.lineBetween(62, -68, rhx, rhy + 6);
    g.fillStyle(K.INK, 1); g.fillCircle(62, -68, 9);
    g.lineStyle(14, K.SHIRT, 1); g.lineBetween(46, -90 + breath, 62, -68); g.lineBetween(62, -68, rhx, rhy + 6);
    g.fillStyle(K.SHIRT, 1); g.fillCircle(62, -68, 7);
    g.fillStyle(0x7a2a2a, 1); g.fillRect(50, -86 + breath, 10, 4);
    g.fillStyle(K.SHIRT_DARK, 1); g.fillCircle(rhx - (point ? 2 : 0), rhy + 8, 8);
    g.fillStyle(K.INK, 1); g.fillCircle(rhx, rhy, 9);
    g.fillStyle(K.SKIN, 1); g.fillCircle(rhx, rhy, 8);
    if (point) {
      g.lineStyle(5, K.INK, 1); g.lineBetween(rhx + 4, rhy - 2, rhx + 18, rhy - 8);
      g.lineStyle(3.6, K.SKIN, 1); g.lineBetween(rhx + 4, rhy - 2, rhx + 18, rhy - 8);
    }

    // ── Head: round, big nose, bushy brows, beard, spectacles, eyeshade ──
    g.fillStyle(K.INK, 1); g.fillRect(headX - 10, headY + 18, 20, 16);
    g.fillStyle(K.SKIN_DARK, 1); g.fillRect(headX - 8, headY + 18, 16, 16);
    g.fillStyle(K.INK, 1); g.fillCircle(headX, headY, 31);
    g.fillStyle(K.SKIN, 1); g.fillCircle(headX, headY, 29);
    g.fillStyle(K.SKIN_LIT, 0.5); g.fillEllipse(headX - 8, headY - 12, 22, 14);
    g.fillStyle(0xd8907a, 0.35); g.fillCircle(headX - 14, headY + 8, 6); g.fillCircle(headX + 20, headY + 6, 5);
    // Ears.
    for (const side of [-1, 1]) {
      g.fillStyle(K.INK, 1); g.fillEllipse(headX + side * 29, headY + 2, 10, 14);
      g.fillStyle(K.SKIN, 1); g.fillEllipse(headX + side * 29, headY + 2, 8, 12);
    }
    // Beard: a broad grey bib under the mouth.
    const beard: [number, number][] = [
      [headX - 24, headY + 10], [headX - 26, headY + 30], [headX - 14, headY + 44], [headX + 6, headY + 48], [headX + 24, headY + 40], [headX + 30, headY + 22], [headX + 26, headY + 10],
    ];
    fillPts(g, beard, K.INK);
    fillPts(g, beard.map(([x, y]) => [x, y - 1] as [number, number]), K.BEARD);
    g.lineStyle(1, K.BEARD_DARK, 0.7);
    for (let i = 0; i < 6; i++) g.lineBetween(headX - 18 + i * 8, headY + 22, headX - 20 + i * 8 + Math.sin(i) * 2, headY + 38 + (i % 2) * 4);
    // Moustache over the beard.
    g.fillStyle(K.BEARD, 1); g.fillEllipse(headX - 2, headY + 14, 16, 6); g.fillEllipse(headX + 14, headY + 14, 16, 6);
    // Nose: a big round one.
    g.fillStyle(K.INK, 1); g.fillCircle(headX + 16, headY + 6, 9);
    g.fillStyle(K.SKIN, 1); g.fillCircle(headX + 16, headY + 6, 8);
    g.fillStyle(K.SKIN_LIT, 0.6); g.fillCircle(headX + 14, headY + 3, 3);
    g.fillStyle(0xd8907a, 0.4); g.fillCircle(headX + 17, headY + 7, 6);
    // Mouth, under the moustache: open when talking.
    const openM = this.talking ? Math.abs(Math.sin(t * 14)) * 5 : surprised ? 5 : 0;
    g.fillStyle(K.INK, 1); g.fillEllipse(headX + 6, headY + 20, 12, 2 + openM);
    if (openM > 2) { g.fillStyle(0x4a1020, 1); g.fillEllipse(headX + 6, headY + 20.5, 9, openM - 1); }
    // Eyes behind round spectacles, with brows.
    const look = this.lookDir(this.x + headX * this.scale * this.dir, this.y + headY * this.scale);
    const open = 1 - this.blink;
    const wide = surprised ? 1.3 : pleased ? 0.6 : 1;
    for (const [ex, ey] of [[headX - 8, headY - 8], [headX + 12, headY - 8]] as const) {
      const er = 5;
      g.fillStyle(K.INK, 1); g.fillEllipse(ex, ey, er * 2 + 2, er * 2 * open * wide + 2);
      g.fillStyle(0xfdfbf4, 1); g.fillEllipse(ex, ey, er * 2, er * 2 * open * wide);
      if (open > 0.2) {
        g.fillStyle(0x2a3a5a, 1); g.fillCircle(ex + look.x * 2, ey + look.y * 1.8, 2.6);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(ex + look.x * 2 - 1, ey + look.y * 1.8 - 1, 0.8);
      }
      // Spectacle rim.
      g.lineStyle(1.8, K.BRASS, 1); g.strokeCircle(ex, ey, 8.5);
      g.fillStyle(0xbfe6ff, 0.12); g.fillCircle(ex, ey, 8);
      // Bushy brow.
      const tilt = grumpy ? (ex < headX ? -3 : 3) : surprised ? -4 : 0;
      g.lineStyle(4, K.BEARD, 1); g.lineBetween(ex - 8, ey - 11 + tilt, ex + 8, ey - 12 - tilt);
    }
    g.lineStyle(1.8, K.BRASS, 1); g.lineBetween(headX + 0.5, headY - 8, headX + 3.5, headY - 8);
    g.lineBetween(headX - 16.5, headY - 9, headX - 28, headY - 6); g.lineBetween(headX + 20.5, headY - 9, headX + 30, headY - 6);
    // Eyeshade: a green translucent visor on a band, bald pate behind it with a fringe.
    g.fillStyle(K.BEARD, 1); g.fillEllipse(headX - 26, headY - 6, 10, 18); g.fillEllipse(headX + 28, headY - 6, 10, 18);
    g.fillStyle(K.SKIN_LIT, 0.4); g.fillEllipse(headX, headY - 24, 30, 10);
    g.lineStyle(3, K.INK, 1); g.beginPath(); g.arc(headX, headY - 4, 30, Math.PI * 1.08, Math.PI * 1.92); g.strokePath();
    g.lineStyle(1.5, 0x3a2a1a, 1); g.beginPath(); g.arc(headX, headY - 4, 30, Math.PI * 1.08, Math.PI * 1.92); g.strokePath();
    const visor: [number, number][] = [[headX - 30, headY - 18], [headX + 34, headY - 20], [headX + 44, headY - 10], [headX - 36, headY - 8]];
    fillPts(g, visor, K.INK, 0.9);
    fillPts(g, visor.map(([x, y]) => [x, y + 0.5] as [number, number]), K.SHADE, 0.85);
    fillPts(g, [[headX - 28, headY - 17], [headX + 30, headY - 19], [headX + 36, headY - 14], [headX - 32, headY - 12]], mix(K.SHADE, 0xffffff, 0.3), 0.5);
  }
}
