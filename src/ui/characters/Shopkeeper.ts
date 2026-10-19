import Phaser from 'phaser';
import { mix } from '../Theme';
import { MenuCharacter, fillPts, strokePts } from './MenuCharacter';

/**
 * The shopkeeper: a hunched goblin merchant behind his counter. Long hooked nose, one ear
 * taller than the other, a jeweller's loupe strapped over the near eye, a patched waistcoat
 * over a grubby shirt, and two hands on the counter with a ring on every finger. He faces
 * right, toward his shelves.
 *
 * Origin `(0, 0)` is the counter line his hands rest on. Everything is drawn in local units
 * at roughly 1:1 with a 170px-tall figure; `scale` resizes the lot.
 */
export class Shopkeeper extends MenuCharacter {
  private static readonly SKIN = 0x6f9c3d;
  private static readonly SKIN_DARK = 0x3f6224;
  private static readonly SKIN_LIT = 0x9fcb5e;
  private static readonly VEST = 0x3b2246;
  private static readonly VEST_LIT = 0x5a3a6a;
  private static readonly SHIRT = 0xd9cfae;
  private static readonly SHIRT_DARK = 0x9a8f72;
  private static readonly BRASS = 0xc89a3c;
  private static readonly BRASS_LIT = 0xf0d48a;
  private static readonly INK = 0x120d0a;
  private static readonly CAP = 0x6b2a2a;

  mouth(): { x: number; y: number } {
    return { x: this.x + 44 * this.scale * this.dir, y: this.y - 112 * this.scale };
  }

  protected paint(g: Phaser.GameObjects.Graphics, t: number): void {
    const S = Shopkeeper;
    const breath = Math.sin(t * 1.7) * 1.6;
    const pleased = this.mood === 'pleased' || this.mood === 'greedy';
    const grumpy = this.mood === 'grumpy';
    const surprised = this.mood === 'surprised' || this.mood === 'shocked';
    const greedy = this.mood === 'greedy';
    const headX = 14 + Math.sin(t * 0.9) * 1.2;
    const headY = -132 + breath + (surprised ? -6 : 0);

    // ── Torso: a hunch, shoulders rolled forward, leaning on the counter ──
    const torso: [number, number][] = [
      [-60, 0], [-66, -58 + breath], [-44, -96 + breath], [10, -108 + breath], [60, -84 + breath], [66, -30], [62, 0],
    ];
    fillPts(g, torso, S.INK);
    fillPts(g, torso.map(([x, y]) => [x * 0.97, y * 0.97 + 1] as [number, number]), S.VEST);
    // Shirt showing in the V and at the collar.
    fillPts(g, [[-10, -100 + breath], [34, -104 + breath], [26, -40], [2, -34], [-14, -60]], S.SHIRT);
    fillPts(g, [[-6, -98 + breath], [28, -101 + breath], [18, -70], [0, -66]], S.SHIRT_DARK, 0.5);
    // Waistcoat lapels over it, buttons down the front.
    fillPts(g, [[-44, -96 + breath], [-10, -100 + breath], [-2, -30], [-24, -10]], S.VEST_LIT);
    fillPts(g, [[34, -104 + breath], [60, -84 + breath], [40, -14], [22, -30]], S.VEST_LIT);
    g.lineStyle(1.2, S.INK, 0.7);
    g.lineBetween(-10, -100 + breath, -2, -30);
    g.lineBetween(34, -104 + breath, 22, -30);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(S.BRASS, 1); g.fillCircle(8 - i * 3, -30 - i * 14, 3);
      g.fillStyle(S.BRASS_LIT, 1); g.fillCircle(7 - i * 3, -31 - i * 14, 1.1);
    }
    // Patches: two squares of mismatched cloth, stitched on.
    for (const [px, py, pc] of [[-38, -50, 0x7a5a2a], [44, -46, 0x2a5a4a]] as const) {
      g.fillStyle(pc, 1); g.fillRect(px - 8, py - 7, 16, 14);
      g.lineStyle(1, S.INK, 0.9);
      for (let i = 0; i < 4; i++) {
        g.lineBetween(px - 8 + i * 5, py - 9, px - 6 + i * 5, py - 5);
        g.lineBetween(px - 8 + i * 5, py + 5, px - 6 + i * 5, py + 9);
      }
    }
    // Shadow of the chin on the chest.
    g.fillStyle(S.INK, 0.35); g.fillEllipse(headX + 6, -98 + breath, 56, 16);

    // ── Arms and hands on the counter ──
    // Each arm bends at an elbow stuck out to the side, so he reads as leaning on the
    // counter rather than standing with two pillars for sleeves.
    const rub = greedy ? Math.sin(t * 11) * 7 : 0;
    const lift = greedy ? -6 : 0;
    const hands: [number, number, number][] = [[-30 + rub, lift, -1], [34 - rub, lift, 1]];
    for (const [hx, hy, side] of hands) {
      const sx = side < 0 ? -50 : 52;
      const sy = -84 + breath;
      const ex = side < 0 ? -78 : 80;
      const ey = -40 + breath * 0.5;
      // Sleeve: upper arm out to the elbow, forearm back in to the hand, cuffed.
      g.lineStyle(22, S.INK, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy - 10);
      g.fillStyle(S.INK, 1); g.fillCircle(ex, ey, 11);
      g.lineStyle(18, S.SHIRT, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy - 10);
      g.fillStyle(S.SHIRT, 1); g.fillCircle(ex, ey, 9);
      g.lineStyle(2, S.SHIRT_DARK, 0.6); g.lineBetween(sx + side * 4, sy + 7, ex + side * 2, ey + 6);
      g.lineBetween(ex - side * 2, ey + 7, hx + side * 2, hy - 5);
      g.fillStyle(S.SHIRT_DARK, 1); g.fillEllipse(hx + side * 2, hy - 12, 24, 12);
      // Hand: palm on the counter, four fingers forward, each with a ring.
      g.fillStyle(S.INK, 1); g.fillEllipse(hx, hy - 4, 30, 18);
      g.fillStyle(S.SKIN, 1); g.fillEllipse(hx, hy - 4, 27, 15);
      g.fillStyle(S.SKIN_LIT, 0.6); g.fillEllipse(hx - 4, hy - 8, 12, 5);
      for (let f = 0; f < 4; f++) {
        const fx = hx + 12 + f * 2 - 4;
        const fy = hy - 10 + f * 5;
        const len = 14 - Math.abs(f - 1.5) * 2;
        g.lineStyle(6.5, S.INK, 1); g.lineBetween(fx, fy, fx + len, fy + 1);
        g.lineStyle(4.8, S.SKIN, 1); g.lineBetween(fx, fy, fx + len, fy + 1);
        // Ring: a gold band with a coloured stone.
        const rx = fx + len * 0.45;
        g.fillStyle(S.BRASS, 1); g.fillRect(rx - 1.6, fy - 3, 3.2, 6);
        g.fillStyle([0xff4d6d, 0x4fc3ff, 0x4ade80, 0xd946ef][(f + (side > 0 ? 2 : 0)) % 4], 1);
        g.fillCircle(rx, fy - 3, 1.6);
      }
      // Thumb tucked on the near side.
      g.lineStyle(6, S.INK, 1); g.lineBetween(hx - 8, hy - 8, hx - 2, hy - 16);
      g.lineStyle(4.4, S.SKIN, 1); g.lineBetween(hx - 8, hy - 8, hx - 2, hy - 16);
    }

    // ── Head ──
    // Far ear (behind the head), then the head, then the near ear over it.
    const earTwitch = Math.sin(t * 7) > 0.96 ? 4 : 0;
    fillPts(g, [[headX + 12, headY - 22], [headX - 6, headY - 60 - earTwitch], [headX + 30, headY - 34]], S.INK);
    fillPts(g, [[headX + 12, headY - 22], [headX - 4, headY - 56 - earTwitch], [headX + 28, headY - 33]], S.SKIN_DARK);
    // Neck.
    g.fillStyle(S.INK, 1); g.fillRect(headX - 14, headY + 14, 28, 24);
    g.fillStyle(S.SKIN_DARK, 1); g.fillRect(headX - 12, headY + 14, 24, 24);
    // Skull: a long egg leaning forward with a heavy jaw.
    const skull: [number, number][] = [
      [headX - 36, headY - 6], [headX - 30, headY - 30], [headX - 8, headY - 42], [headX + 24, headY - 40],
      [headX + 40, headY - 22], [headX + 42, headY + 2], [headX + 32, headY + 22], [headX + 4, headY + 30], [headX - 24, headY + 20],
    ];
    fillPts(g, skull, S.INK);
    fillPts(g, skull.map(([x, y]) => [headX + (x - headX) * 0.95, headY + (y - headY) * 0.95] as [number, number]), S.SKIN);
    // Lit brow ridge and a shadowed jaw.
    fillPts(g, [[headX - 26, headY - 26], [headX - 6, headY - 38], [headX + 22, headY - 36], [headX + 10, headY - 26], [headX - 10, headY - 22]], S.SKIN_LIT, 0.55);
    g.fillStyle(S.SKIN_DARK, 0.5); g.fillEllipse(headX + 6, headY + 20, 44, 14);
    // Warts.
    g.fillStyle(S.SKIN_DARK, 1); g.fillCircle(headX - 20, headY + 4, 2.4); g.fillCircle(headX + 30, headY + 12, 1.8);
    // Near ear: huge, pointing up and back, notched.
    const ear: [number, number][] = [
      [headX - 24, headY - 18], [headX - 40, headY - 30], [headX - 64, headY - 66 - earTwitch], [headX - 46, headY - 40],
      [headX - 44, headY - 24], [headX - 30, headY - 4],
    ];
    fillPts(g, ear, S.INK);
    fillPts(g, ear.map(([x, y]) => [x + 1, y + 1] as [number, number]), S.SKIN);
    fillPts(g, [[headX - 32, headY - 20], [headX - 44, headY - 34], [headX - 58, headY - 58 - earTwitch], [headX - 46, headY - 36], [headX - 38, headY - 14]], S.SKIN_DARK, 0.8);
    // A notch bitten out of the ear, and a brass earring.
    fillPts(g, [[headX - 50, headY - 44], [headX - 56, headY - 50], [headX - 54, headY - 40]], S.INK);
    g.lineStyle(1.6, S.BRASS, 1); g.strokeCircle(headX - 36, headY - 2, 4);

    // Skullcap: a worn leather cap sitting back on the crown, with a button.
    fillPts(g, [[headX - 30, headY - 30], [headX - 10, headY - 46], [headX + 22, headY - 44], [headX + 34, headY - 28], [headX + 10, headY - 36], [headX - 12, headY - 38]], S.INK);
    fillPts(g, [[headX - 28, headY - 30], [headX - 10, headY - 44], [headX + 22, headY - 42], [headX + 32, headY - 28], [headX + 10, headY - 35], [headX - 12, headY - 37]], S.CAP);
    g.fillStyle(mix(S.CAP, 0xffffff, 0.3), 0.5); g.fillEllipse(headX, headY - 41, 20, 4);
    g.fillStyle(S.BRASS, 1); g.fillCircle(headX + 6, headY - 44, 2.4);

    // ── Nose: long, hooked, pointing right ──
    const nose: [number, number][] = [
      [headX + 24, headY - 14], [headX + 52, headY - 10], [headX + 70, headY + 4], [headX + 64, headY + 12], [headX + 48, headY + 6], [headX + 30, headY + 8],
    ];
    fillPts(g, nose, S.INK);
    fillPts(g, nose.map(([x, y]) => [x - 0.5, y] as [number, number]), S.SKIN);
    fillPts(g, [[headX + 28, headY - 12], [headX + 50, headY - 8], [headX + 62, headY + 2], [headX + 46, headY - 1]], S.SKIN_LIT, 0.6);
    g.fillStyle(S.SKIN_DARK, 1); g.fillCircle(headX + 56, headY + 8, 2);
    g.fillStyle(S.SKIN_DARK, 1); g.fillCircle(headX + 66, headY + 8, 1.2);

    // ── Eyes ──
    const look = this.lookDir(this.x + headX * this.scale * this.dir, this.y + headY * this.scale);
    const open = 1 - this.blink;
    const wide = surprised ? 1.35 : pleased ? 0.55 : 1;
    const eyes: [number, number, number][] = [[headX - 2, headY - 14, 6.5], [headX + 26, headY - 16, 5]];
    eyes.forEach(([ex, ey, er], i) => {
      const h = er * open * wide;
      g.fillStyle(S.INK, 1); g.fillEllipse(ex, ey, er * 2 + 2, h * 2 + 2);
      g.fillStyle(0xf2efc8, 1); g.fillEllipse(ex, ey, er * 2, h * 2);
      if (open > 0.2) {
        const px = ex + look.x * er * 0.5;
        const py = ey + look.y * er * 0.45;
        g.fillStyle(0x3a1a08, 1); g.fillCircle(px, py, er * 0.55 * (surprised ? 0.7 : 1));
        g.fillStyle(0x000000, 1); g.fillCircle(px, py, er * 0.3);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(px - er * 0.2, py - er * 0.22, er * 0.14);
      }
      // Brow: a thick ridge, angled by mood.
      const tilt = grumpy ? (i === 0 ? -3 : 3) : surprised ? -4 : pleased ? 2 : 0;
      g.lineStyle(3, S.SKIN_DARK, 1);
      g.lineBetween(ex - er - 2, ey - er - 3 + tilt, ex + er + 2, ey - er - 3 - tilt);
    });
    // The loupe over the near eye: a brass barrel with a glass lens, strapped round the head.
    const lx = headX - 2;
    const ly = headY - 14;
    g.lineStyle(2.4, mix(S.CAP, 0x000000, 0.3), 1);
    g.beginPath(); g.moveTo(lx - 10, ly - 4); g.lineTo(headX - 30, headY - 26); g.strokePath();
    g.fillStyle(S.BRASS, 1); g.fillCircle(lx, ly, 11);
    g.fillStyle(mix(S.BRASS, 0x000000, 0.45), 1); g.fillCircle(lx, ly, 8.5);
    g.fillStyle(0xbfe6ff, 0.3); g.fillCircle(lx, ly, 8);
    g.lineStyle(1, S.BRASS_LIT, 0.9); g.strokeCircle(lx, ly, 10);
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(lx - 3, ly - 4, 4, 2.4);

    // ── Mouth: wide, a grin that bares two lower teeth; flaps while talking ──
    const talkOpen = this.talking ? Math.abs(Math.sin(t * 16)) * 7 : 0;
    const moodOpen = surprised ? 9 : 0;
    const openM = Math.max(talkOpen, moodOpen);
    const curve = grumpy ? -3 : pleased ? 7 : 3;
    const mx0 = headX + 2;
    const mx1 = headX + 44;
    const my = headY + 16;
    const lip: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      lip.push([mx0 + (mx1 - mx0) * u, my - Math.sin(u * Math.PI) * curve]);
    }
    const under: [number, number][] = lip.map(([x, y]) => [x, y + 2 + Math.sin(((x - mx0) / (mx1 - mx0)) * Math.PI) * openM]);
    fillPts(g, [...lip, ...under.slice().reverse()], S.INK);
    if (openM > 1.5) {
      fillPts(g, [...lip.map(([x, y]) => [x, y + 1.5] as [number, number]), ...under.slice(1, 8).reverse()], 0x4a1020);
      // Tongue.
      g.fillStyle(0xa03050, 1); g.fillEllipse((mx0 + mx1) / 2, my + openM * 0.7, 14, openM * 0.5);
    }
    // Teeth: two snaggle-teeth up from the lower lip.
    g.fillStyle(0xf0e6c0, 1);
    g.fillTriangle(mx0 + 10, under[2][1] + 1, mx0 + 16, under[2][1] + 1, mx0 + 13, under[2][1] - 6);
    g.fillTriangle(mx1 - 12, under[6][1] + 1, mx1 - 6, under[6][1] + 1, mx1 - 10, under[6][1] - 5);
    // Lip line.
    g.lineStyle(1.4, S.INK, 1);
    g.beginPath(); g.moveTo(lip[0][0], lip[0][1]); for (const [x, y] of lip) g.lineTo(x, y); g.strokePath();

    // Greedy: little coin sparkle in the loupe.
    if (greedy) {
      g.fillStyle(0xffe08a, 0.6 + 0.4 * Math.sin(t * 12)); g.fillCircle(lx + 1, ly + 1, 3);
    }
  }
}
