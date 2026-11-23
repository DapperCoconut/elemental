import Phaser from 'phaser';
import type { CutsceneDef, CutsceneKit, CutsceneShot } from '../../../IslesTypes';
import { ease, mix, sky, sea, vignette, wash, cineHero, boat, crowd, mixC, lit, dim } from '../../../art/CineArt';
import { OBS, drawPinnacle, starGlow, starfield, throne, glassFloor, seam, crackPath } from '../../../art/PinnacleArt';
import { ISLES, MUSTER, P, clouds, css, fallingStar, ferryman, gull, isle, rays, shingle, skiff, sunDisc, wanderer } from './art';

/**
 * `cine-ending` — after the Obsidian King falls. The star goes out like a hearth at the end of the
 * night; the glass round the spire softens back into water; then ten dawns, one per freed isle,
 * each its tyranny undone in one image (the Kiln cold, the tide out, the hedges letting go, every
 * corked breath uncorked, the Sepulchre opened, the storm broken, the Draught poured free, the
 * Lots thrown away, every voice its own note, the sun finally setting and rising). The Muster says
 * goodbye, the Ferryman rows someone back for the first time, the title card — and the stinger:
 * night over the freed sea, a star shivers loose and falls, a far flash. "…or does it?"
 */

type G = Phaser.GameObjects.Graphics;

// ── Shared bits of the dawns ───────────────────────────────────────────

/** A dawn sky in two gradients — high cold colour, a warm middle, the hot band at the horizon `hy`. */
function dawnSky(g: G, W: number, hy: number, top: number, midC: number, low: number): void {
  sky(g, 0, 0, W, hy * 0.55, top, midC, 14);
  sky(g, 0, hy * 0.55, W, hy * 0.45 + 2, midC, low, 12);
}

/** The isle's name, set small in its own colour in the top-left of the frame. */
function caption(k: CutsceneKit, i: number): void {
  k.text(74, 92, ISLES[i].name.toUpperCase(), { size: 16, color: css(ISLES[i].col), alpha: ease(k.t, 0.15, 0.8), align: 0, spacing: 6 });
}

/** A townsperson, freed: coat, head, two arms — `arms` 0 at their sides, 1 thrown up. `y` the feet. */
function folk(g: G, x: number, y: number, s: number, col: number, t: number, arms: number, seed: number): void {
  const skin = [0xf0c8a0, 0xc89070, 0x8a5a3a, 0xe0b090][seed % 4];
  const bob = arms > 0.5 ? Math.abs(Math.sin(t * 6 + seed)) * 2 * s : 0;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y, 10 * s, 2.4 * s);
  g.fillStyle(dim(col, 0.4), 1); g.fillRect(x - 2.6 * s, y - 5 * s - bob, 2 * s, 5 * s); g.fillRect(x + 0.6 * s, y - 5 * s - bob, 2 * s, 5 * s);
  g.fillStyle(col, 1); g.fillEllipse(x, y - 9.5 * s - bob, 8 * s, 10 * s);
  const sy = y - 12 * s - bob;
  const lift = arms * (9 + Math.sin(t * 8 + seed) * 1.5) * s;
  g.lineStyle(1.8 * s, col, 1);
  g.lineBetween(x - 3 * s, sy, x - 6 * s, sy + 6 * s - lift);
  g.lineBetween(x + 3 * s, sy, x + 6 * s, sy + 6 * s - lift);
  g.fillStyle(skin, 1); g.fillCircle(x, y - 17 * s - bob, 3.6 * s);
}

const FOLK_COLS = [0xb85a4a, 0x4a7ab0, 0x6aa05a, 0xd0a040, 0x8a5aa0, 0x5a8a8a, 0xc07090, 0x7a6a5a];

// ── 1–2: the star goes out; the glass clears ──────────────────────────

/** The Crownless Hall, broken open: the last mote of the star drifts down and goes out in the hero's hands. */
const STAR_OUT: CutsceneShot = {
  ms: 9500,
  cues: [{ at: 400, sfx: 'hush' }, { at: 5900, sfx: 'holy-chord' }],
  lines: [
    { text: 'The star did not explode. It sighed, the way a hearth does at the end of a long night.' },
    { text: 'And went out.' },
  ],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t } = k;
    const light = 1 - ease(t, 2.2, 6.6);
    g.fillStyle(0x040308, 1); g.fillRect(0, 0, W, H);
    // Through the burst shell: a plain night sky.
    g.fillStyle(0x0c1028, 1);
    g.fillPoints([P(250, 0), P(710, 0), P(640, 120), P(560, 190), P(420, 180), P(330, 110)], true);
    starfield(g, 250, 0, 460, 180, r, 50, t);
    // The shell's broken plates hanging round the hole, their cracks still warm for a while.
    const plates: number[][] = [
      [0, 0, 250, 0, 330, 110, 260, 170, 120, 220, 0, 260],
      [710, 0, W, 0, W, 250, 830, 220, 720, 170, 640, 120],
      [120, 220, 260, 170, 330, 110, 420, 180, 300, 260, 160, 300],
      [640, 120, 720, 170, 830, 220, 800, 300, 660, 260, 560, 190],
    ];
    plates.forEach((pl, i) => {
      const pts: Phaser.Geom.Point[] = [];
      for (let j = 0; j < pl.length; j += 2) pts.push(P(pl[j], pl[j + 1]));
      g.fillStyle(i < 2 ? OBS.glass : OBS.facet, 1); g.fillPoints(pts, true);
      g.lineStyle(1.2, OBS.edge, 0.5); g.strokePoints(pts, true);
    });
    for (let i = 0; i < 7; i++) {
      const a = { x: 40 + r() * 880, y: r() * 250 };
      const pts = crackPath(a, { x: a.x + (r() - 0.5) * 160, y: a.y + 40 + r() * 70 }, r, 10, 5);
      seam(g, pts, 1.6, 0.25 + 0.75 * light, light, light > 0.3 ? OBS.star : OBS.seam);
    }
    // Floor, the empty throne, its seams cooling.
    glassFloor(g, 0, 400, W, 240, 48, r);
    g.fillStyle(OBS.star, 0.1 * light); g.fillEllipse(480, 470, 700, 120);
    throne(g, 480, 392, 0.85, { sword: false, glow: 0.2 + light * 0.6, t });
    // The last mote of it, falling like a slow snowflake.
    const fall = ease(t, 0.4, 6.2);
    const mx = 480 + Math.sin(t * 1.3) * 40 * (1 - fall), my = mix(120, 452, fall);
    const heat = 1 - ease(t, 5.4, 6.6);
    if (heat > 0.01) starGlow(g, mx, my, mix(9, 3, fall), t, heat);
    else {
      // A ring of breath where it was.
      const pf = ease(t, 6.6, 8.2);
      g.lineStyle(1.4, OBS.star, 0.6 * (1 - pf)); g.strokeCircle(480, 452, 4 + pf * 30);
    }
    cineHero(g, 480, 500, 24, k.hero.color, { face: 1, t });
    // The hero's hands cupped under it.
    g.fillStyle(lit(k.hero.color, 0.25), 1); g.fillCircle(466, 470, 7); g.fillCircle(494, 470, 7);
    wash(g, W, H, OBS.starDeep, 0.08 * light);
    vignette(g, W, H, 0.6);
  },
};

/** Outside at first light: the black glass sea softens back into water, near shore first. */
const GLASS_CLEARS: CutsceneShot = {
  ms: 9500,
  cues: [{ at: 1400, sfx: 'crystal-chime' }, { at: 3400, sfx: 'crystal-chime' }, { at: 5600, sfx: 'splash' }, { at: 6400, sfx: 'holy-chord' }],
  lines: [
    { text: 'The glass round the spire softened, and was water again.' },
    { text: 'And somewhere past it, the sun remembered the way up.' },
  ],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    const c = ease(p, 0, 0.85);
    sky(g, 0, 0, W, 410, mixC(0x07060d, 0x3a5a9a, c), mixC(0x2a1a4a, 0xffc890, c), 26);
    starfield(g, 0, 0, W, 260, r, 60, t);
    wash(g, W, 260, mixC(0x07060d, 0x3a5a9a, c), c * 0.85);
    const sy = 430 - c * 80;
    sunDisc(g, 770, sy, 30, 0xffd8a0, c);
    rays(g, 770, sy, -Math.PI * 0.98, -Math.PI * 0.02, 14, 700, 0xfff0d0, 0.07 * c, t);
    drawPinnacle(g, 400, 410, 330, { t, lit: 10 });
    // Dawn light running up its sunward edge.
    const k2 = 330 / 400;
    for (let i = 0; i < 6; i++) {
      const f = ((t * 0.18 + i / 6) % 1);
      const x = mix(400 + 75 * k2, 400 + 14 * k2, f), y = mix(410, 80, f);
      g.fillStyle(0xfff0d0, 0.7 * c * Math.sin(f * Math.PI)); g.fillCircle(x, y, 2.4);
      g.fillStyle(0xfff0d0, 0.15 * c * Math.sin(f * Math.PI)); g.fillCircle(x, y, 9);
    }
    g.fillStyle(0xffd0b0, 0.14 * c); g.fillRect(0, 300, W, 110);
    // Water underneath everything; the glass over it, clearing band by band from the near shore out.
    sea(g, W, 410, H, t, 0x1a3a6a, 0xffe0c0, 0.4);
    const bands = 8;
    for (let b = 0; b < bands; b++) {
      const near = bands - 1 - b;
      const y0 = 410 + (b / bands) ** 1.4 * (H - 410), y1 = 410 + ((b + 1) / bands) ** 1.4 * (H - 410);
      const glassA = 1 - ease(c, near * 0.08, near * 0.08 + 0.45);
      if (glassA <= 0.01) { for (let j = 0; j < 5; j++) r(); continue; }
      g.fillStyle(OBS.sea, glassA); g.fillRect(0, y0, W, y1 - y0 + 1);
      const a0 = { x: r() * W, y: y0 + 2 }, b0 = { x: r() * W, y: y1 - 2 };
      seam(g, crackPath(a0, b0, r, 6, 4), 1, 0.6 * glassA);
    }
    // Sun on the new water.
    for (let i = 0; i < 9; i++) {
      g.fillStyle(0xfff0d0, 0.45 * c);
      g.fillRect(770 - (30 - i * 2) + Math.sin(t * 2 + i * 1.7) * 14, 416 + i * i * 2.2, 60 - i * 4, 2);
    }
    vignette(g, W, H, 0.5);
  },
};

// ── 3–12: ten dawns ────────────────────────────────────────────────────

/** Brandmark: the Kiln cold on the peak; hearths lit for nobody's sake; a flower through a dropped brand. */
const DAWN_FIRE: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 600, sfx: 'flame-burst' }],
  lines: [{ text: 'Brandmark. Every hearth lit, and not one of them owed.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 420, 0x1c1430, 0x8a3a4a, 0xffa060);
    const sy = 410 - ease(p) * 50;
    sunDisc(g, 680, sy, 30, 0xffc080);
    rays(g, 680, sy, -Math.PI * 0.95, -Math.PI * 0.05, 12, 520, 0xffd0a0, 0.06, t);
    g.fillStyle(0x3a1a2a, 1); g.fillRect(0, 410, W, 80);
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0xffc080, 0.5); g.fillRect(680 - (30 - i * 2) + Math.sin(i * 3.1 + t * 2) * 20, 414 + i * 6, 60 - i * 4, 2);
    }
    // The peak, dark against the sun, its sunward rim catching fire-colour.
    const pk = [120, 480, 300, 330, 400, 210, 450, 172, 530, 170, 600, 232, 720, 340, 860, 480];
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < pk.length; i += 2) pts.push(P(pk[i], pk[i + 1]));
    g.fillStyle(0x2a161c, 1); g.fillPoints(pts, true);
    g.lineStyle(2, 0xff9a60, 0.6);
    for (let i = 8; i < pk.length - 2; i += 2) g.lineBetween(pk[i], pk[i + 1], pk[i + 2], pk[i + 3]);
    g.lineStyle(1, 0x3a2028, 0.8);
    for (let i = 0; i < 8; i++) { const x = 300 + r() * 400; g.lineBetween(x, 260 + r() * 60, x + (r() - 0.5) * 60, 380 + r() * 60); }
    // The Kiln on the summit — cold, its furnace mouth dark, a crack down its face, battlements fallen.
    g.fillStyle(0x1e1014, 1); g.fillRect(440, 120, 100, 54);
    for (let j = 0; j < 6; j++) { const h = [10, 6, 0, 8, 3, 10][j]; if (h) g.fillRect(442 + j * 16, 120 - h, 12, h); }
    g.fillRect(520, 82, 14, 40);
    g.fillStyle(0x2a161c, 1); g.fillTriangle(520, 82, 534, 82, 534, 92);
    g.fillStyle(0x050304, 1); g.fillRect(474, 146, 32, 28); g.fillCircle(490, 146, 16);
    g.lineStyle(2, 0x3a2028, 1); g.lineBetween(462, 120, 468, 134); g.lineBetween(468, 134, 460, 150); g.lineBetween(460, 150, 466, 172);
    g.lineStyle(1.4, 0xff9a60, 0.5); g.lineBetween(540, 120, 540, 174); g.lineBetween(534, 82, 534, 120);
    // A bird where the smoke used to come out.
    g.fillStyle(0x1a0c10, 1); g.fillEllipse(527, 79, 9, 5); g.fillCircle(531, 76, 2.4);
    // The village: hearths lighting one by one, honest smoke curling up.
    for (let j = 0; j < 18; j++) {
      const side = r() < 0.5 ? -1 : 1;
      const f = r();
      const x = 490 + side * (70 + f * 300);
      const y = Math.min(470, 205 + Math.abs(x - 490) * 0.72 + 20 + r() * 46);
      const on = ease(t, 0.3 + j * 0.14, 0.7 + j * 0.14);
      g.fillStyle(0x3a2024, 1); g.fillRect(x - 9, y - 11, 18, 11);
      g.fillStyle(0x4a2a2a, 1); g.fillTriangle(x - 11, y - 11, x + 11, y - 11, x, y - 19);
      g.fillStyle(0xffa040, 0.25 * on); g.fillCircle(x - 2, y - 6, 8);
      g.fillStyle(0xffd080, on); g.fillRect(x - 4, y - 8, 4, 4);
      for (let q = 0; q < 3; q++) {
        const ph = ((t * 14 + q * 10 + j * 7) % 30) / 30;
        g.fillStyle(0xd0a0a8, 0.28 * on * (1 - ph)); g.fillCircle(x + 5 + Math.sin(ph * 6 + j) * 4, y - 20 - ph * 30, 2 + ph * 4);
      }
    }
    // Foreground: a branding iron dropped in the grass, and a flower come up through its ring.
    g.fillStyle(0x1a140e, 1);
    g.fillPoints([P(0, H), P(0, 520), P(160, 500), P(360, 512), P(520, 540), P(700, 530), P(W, 548), P(W, H)], true);
    g.lineStyle(1.4, 0x3a3a1e, 1);
    for (let i = 0; i < 34; i++) { const x = r() * W; const y = 530 + r() * 40; g.lineBetween(x, y, x + Math.sin(t * 2 + i) * 3, y - 8 - r() * 10); }
    g.lineStyle(5, 0x4a3a34, 1); g.lineBetween(250, 556, 428, 524);
    g.fillStyle(0x2a1a14, 1); g.fillRect(232, 550, 26, 10);
    g.lineStyle(4, 0x6a3a2a, 1); g.strokeCircle(446, 518, 16);
    g.lineStyle(2, 0x6a3a2a, 1); g.lineBetween(440, 510, 446, 522); g.lineBetween(452, 510, 446, 522);
    const grow = ease(t, 0.8, 3.4);
    g.lineStyle(2, 0x4a8a3a, 1); g.lineBetween(446, 540, 448, 518 - grow * 30);
    g.fillStyle(0x4a8a3a, 1); g.fillEllipse(440, 530 - grow * 8, 10, 4);
    const fx = 448, fy = 518 - grow * 30;
    for (let q = 0; q < 5; q++) {
      const an = q * 1.2566 + t * 0.2;
      g.fillStyle(0xff6a2a, 1); g.fillEllipse(fx + Math.cos(an) * 5 * grow, fy + Math.sin(an) * 5 * grow, 7 * grow + 1, 5 * grow + 1);
    }
    g.fillStyle(0xffd040, 1); g.fillCircle(fx, fy, 2.6 * grow + 0.5);
    vignette(g, W, H, 0.45);
    caption(k, 0);
  },
};

/** The Drowned Reach: the tide draining out of the low street, doors opening onto dry steps. */
const DAWN_WATER: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 500, sfx: 'splash' }, { at: 3000, sfx: 'bubble' }],
  lines: [{ text: 'The Drowned Reach. The tide went out — and stayed out.' }],
  draw(g, k) {
    const { W, H, t, p } = k;
    dawnSky(g, W, 340, 0x1a2a4a, 0x6a8ab0, 0xffd0a0);
    sunDisc(g, 480, 336 - ease(p) * 28, 24, 0xffe8c0);
    sea(g, W, 332, 430, t, 0x2a4a6a, 0xffe0c0, 0.9);
    // Where the maelstrom was: a few slack rings of foam, fading.
    for (let i = 0; i < 5; i++) { g.lineStyle(1, 0xffffff, 0.16 * (1 - p)); g.strokeEllipse(690, 362, 40 + i * 30, 8 + i * 5); }
    // The street, running down to the sea.
    g.fillStyle(0x3a4048, 1); g.fillPoints([P(300, 580), P(660, 580), P(540, 420), P(420, 420)], true);
    g.lineStyle(1, 0x4a5058, 1);
    for (let i = 0; i < 8; i++) { const y = 420 + i * i * 2.6; const w = 60 + i * 24; g.lineBetween(480 - w, y, 480 + w, y); }
    const wl = mix(440, 532, ease(p, 0, 0.75));
    const houses: [number, number, number, number][] = [
      [0, 130, 140, 0x5a6a7a], [130, 220, 210, 0x6a5a5a], [220, 320, 160, 0x4a5a6a],
      [640, 740, 170, 0x5a5a6a], [740, 840, 120, 0x6a6a5a], [840, 960, 190, 0x4a6a6a],
    ];
    houses.forEach(([x0, x1, top, col], i) => {
      const w = x1 - x0, xc = (x0 + x1) / 2;
      g.fillStyle(col, 1); g.fillRect(x0, top, w, 580 - top);
      g.fillStyle(lit(col, 0.15), 1); g.fillTriangle(x0 - 4, top, x1 + 4, top, xc, top - 34);
      g.fillStyle(dim(col, 0.2), 1); g.fillRect(x0, top, 4, 580 - top);
      for (let rr = 0; rr < 2; rr++) for (let c = 0; c < 2; c++) {
        const wx = x0 + w * (0.25 + c * 0.5) - 8, wy = top + 30 + rr * 70;
        g.fillStyle(0xffd890, 0.9); g.fillRect(wx, wy, 16, 22);
        g.lineStyle(1.4, dim(col, 0.4), 1); g.lineBetween(wx + 8, wy, wx + 8, wy + 22);
      }
      // The band that has been under the sea: dark, wet, hung with weed.
      g.fillStyle(dim(col, 0.45), 0.85); g.fillRect(x0, 440, w, 92);
      g.lineStyle(1.4, 0xffffff, 0.3); g.lineBetween(x0, 440, x1, 440);
      g.fillStyle(0x3a6a3a, 0.9);
      for (let q = 0; q < 5; q++) g.fillTriangle(x0 + q * w / 5, 440, x0 + q * w / 5 + 8, 440, x0 + q * w / 5 + 4, 452 + (q % 2) * 6);
      // The door: shut while the sea is at it, thrown open once the step is dry.
      const open = ease(p, 0.72 + i * 0.03, 0.9 + i * 0.03);
      g.fillStyle(0x1a1410, 1); g.fillRect(xc - 13, 488, 26, 44);
      g.fillStyle(0xffc070, open); g.fillRect(xc - 11, 490, 22, 42);
      g.fillStyle(dim(col, 0.6), 1); g.fillRect(xc - 13 - open * 10, 488, 26 - open * 16, 44);
      // A drip off the sill.
      const dp = (t * 1.3 + i * 0.37) % 1;
      g.fillStyle(0xd0e8ff, 0.7); g.fillCircle(x0 + w * 0.7, 444 + dp * (wl - 444), 1.6);
      if (open > 0.5) folk(g, xc, 534, 2, FOLK_COLS[i], t, open, i);
    });
    // The water, falling away.
    g.fillStyle(0x24506a, 0.9); g.fillRect(0, wl, W, H - wl);
    g.lineStyle(1.4, 0xffe0c0, 0.4);
    for (let i = 0; i < 6; i++) { const y = wl + 4 + i * 8; const x = (t * 30 + i * 140) % W; g.lineBetween(x, y, x + 60, y); }
    g.fillStyle(0xffe8c0, 0.45); g.fillRect(470, wl + 2, 20, H - wl);
    for (let i = 0; i < 3; i++) gull(g, 300 + ((t * 30 + i * 120) % 400), 160 + i * 20, 1, t, 0xffffff, 0.9);
    vignette(g, W, H, 0.45);
    caption(k, 1);
  },
};

/** Thornwild: the topiary hedges shed their leaves and let their people go; the lawn gone gloriously untidy. */
const DAWN_LIFE: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 700, sfx: 'thorn' }, { at: 2000, sfx: 'spore' }],
  lines: [{ text: 'Thornwild. The hedges let go, and the garden grew wild.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 400, 0x24343a, 0xa8c890, 0xfff0c0);
    const sy = 380 - ease(p) * 30;
    sunDisc(g, 250, sy, 26, 0xfff0c0);
    rays(g, 250, sy, -Math.PI * 0.9, -Math.PI * 0.1, 10, 520, 0xffffe0, 0.05, t);
    g.fillStyle(0x2a4a34, 1); g.fillPoints([P(0, 420), P(200, 380), P(420, 400), P(640, 340), P(860, 370), P(W, 360), P(W, 470), P(0, 470)], true);
    // The Glasshouse on its hill: panes gone, ribs bare, the vines out through the top.
    const cx = 650, cy = 340, R = 110;
    g.fillStyle(0xd0f0e0, 0.15); g.fillEllipse(cx, cy, R * 2, R * 2);
    g.fillStyle(0x2a4a34, 1); g.fillRect(cx - R - 4, cy, R * 2 + 8, R + 4);
    g.lineStyle(2, 0x2a3a3a, 1);
    for (let m = -2; m <= 2; m++) {
      const wm = R * Math.cos((m / 3) * (Math.PI / 2) * 1.4) * (m === 0 ? 0.02 : Math.sign(m));
      const pts: Phaser.Geom.Point[] = [];
      for (let a = 0; a <= 8; a++) { const an = (a / 8) * Math.PI; pts.push(P(cx + (m === 0 ? 0 : wm) * Math.cos(an), cy - R * Math.sin(an))); }
      g.strokePoints(pts, false);
    }
    g.beginPath(); g.arc(cx, cy, R, Math.PI, Math.PI * 2); g.strokePath();
    for (let h = 1; h < 3; h++) { const yy = cy - R * h / 3; const hw = Math.sqrt(R * R - (R * h / 3) ** 2); g.lineBetween(cx - hw, yy, cx + hw, yy); }
    g.fillStyle(0x2a3a3a, 1); g.fillRect(cx - R - 6, cy - 4, R * 2 + 12, 8);
    for (let v = 0; v < 4; v++) {
      const pts: Phaser.Geom.Point[] = [];
      const x0 = cx - 80 + v * 50;
      const grow = ease(t, 0.2 + v * 0.2, 2.8 + v * 0.2);
      for (let s = 0; s <= 10; s++) { const f = (s / 10) * grow; pts.push(P(x0 + Math.sin(f * 7 + v) * 18 + (v - 1.5) * f * 30, cy - f * (R + 60))); }
      g.lineStyle(3, 0x3a8a3a, 1); g.strokePoints(pts, false);
      for (let s = 2; s <= 10; s += 2) { const q = pts[s]; g.fillStyle(0x5fd068, 1); g.fillEllipse(q.x + 5, q.y, 10, 5); }
    }
    // The lawn.
    g.fillStyle(0x3a6a3a, 1); g.fillRect(0, 466, W, H - 466);
    // The topiary row: each hedge falls away from the person grafted into it.
    for (let j = 0; j < 6; j++) {
      const x = 110 + j * 148, y = 508 + (j % 2) * 10;
      const free = ease(t, 0.4 + j * 0.25, 1.5 + j * 0.25);
      folk(g, x, y, 3, FOLK_COLS[j], t, free, j);
      const ha = 1 - free;
      if (ha > 0.02) {
        g.fillStyle(0x2a6a2a, ha); g.fillEllipse(x, y - 30, 40, 62); g.fillCircle(x, y - 66, 15);
        g.fillStyle(0x3a8a3a, ha); g.fillEllipse(x - 6, y - 36, 26, 40); g.fillCircle(x - 4, y - 69, 9);
        g.fillStyle(0x6a4a2a, ha); g.fillRect(x - 3, y - 4, 6, 6);
      }
      for (let q = 0; q < 6; q++) {
        const lf = Math.min(1, free * 1.4 - q * 0.05);
        if (lf <= 0 || lf >= 1) continue;
        g.fillStyle(0x5fd068, 1 - lf);
        g.fillEllipse(x + Math.sin(q * 2.3 + t * 3) * (14 + lf * 30), y - 60 + lf * 60 + q * 4, 6, 3);
      }
    }
    // Wildflowers everywhere, nobody trimming them.
    const fc = [0xff6a8a, 0xffd040, 0xffffff, 0xb07aff, 0xff9a40];
    const bloom = 0.6 + 0.4 * ease(p);
    for (let i = 0; i < 46; i++) {
      const x = r() * W, y0 = 560 + r() * 30, h = (18 + r() * 50) * bloom;
      const sw = Math.sin(t * 1.8 + i) * 4;
      const col = fc[Math.floor(r() * fc.length)];
      g.lineStyle(1.4, 0x2a5a2a, 1); g.lineBetween(x, y0, x + sw, y0 - h);
      g.fillStyle(col, 1); g.fillCircle(x + sw, y0 - h, 3 + bloom * 1.5);
      g.fillStyle(0xffe890, 1); g.fillCircle(x + sw, y0 - h, 1.2);
    }
    vignette(g, W, H, 0.4);
    caption(k, 2);
  },
};

/** Highspire: above the cloud sea, a rack of breath-bottles uncorking one after another. */
const DAWN_AIR: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 500, sfx: 'snap-back' }, { at: 1400, sfx: 'gust' }, { at: 2600, sfx: 'whoosh' }],
  lines: [{ text: 'Highspire. Every corked breath, let go at once.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 440, 0x1a3a6a, 0x8ab8e0, 0xffe8d0);
    sunDisc(g, 170, 430 - ease(p) * 40, 26, 0xfff0d8);
    // The cloud sea.
    g.fillStyle(0xead8e0, 1); g.fillRect(0, 450, W, H - 450);
    clouds(g, -80, 410, W + 160, 60, 16, r, 0xfff0f4, 0.9, t * 6);
    clouds(g, -80, 470, W + 160, 90, 14, r, 0xd8c4d4, 0.7, -t * 4);
    // The needle, its ledge-towns, and the Lung on top with its sails stopped.
    g.fillStyle(0x4a4a5c, 1);
    g.fillPoints([P(540, 470), P(572, 300), P(592, 160), P(606, 96), P(624, 92), P(640, 170), P(660, 310), P(700, 470)], true);
    g.fillStyle(0x6a6a7e, 1);
    g.fillPoints([P(540, 470), P(572, 300), P(592, 160), P(606, 96), P(612, 96), P(600, 200), P(590, 330), P(580, 470)], true);
    for (const [ly, lx] of [[400, 560], [330, 650], [250, 584], [190, 630]]) {
      g.fillStyle(0x8a7a6a, 1); g.fillRect(lx - 16, ly - 12, 14, 12); g.fillRect(lx, ly - 16, 12, 16);
      g.fillStyle(0xffe0a0, 1); g.fillRect(lx - 12, ly - 8, 3, 3); g.fillRect(lx + 4, ly - 11, 3, 3);
    }
    g.fillStyle(0x5a4a44, 1); g.fillRect(606, 58, 18, 36);
    g.fillTriangle(602, 58, 628, 58, 615, 46);
    g.lineStyle(3, 0x8a7a6a, 1);
    g.lineBetween(615, 60, 585, 30); g.lineBetween(615, 60, 650, 34); g.lineBetween(615, 60, 640, 92);
    g.lineBetween(615, 60, 606, 92);
    g.fillStyle(0xd8c8b0, 0.8); g.fillTriangle(585, 30, 600, 45, 592, 26); g.fillTriangle(650, 34, 636, 48, 656, 42);
    // Kites, where the collectors used to fly.
    const kc = [0xe85a4a, 0xffd040, 0x4a8ae8];
    for (let i = 0; i < 3; i++) {
      const kx = 300 + i * 160 + Math.sin(t * 1.2 + i) * 16, ky = 150 + i * 40 + Math.cos(t * 1.5 + i) * 10;
      g.fillStyle(kc[i], 1); g.fillPoints([P(kx, ky - 14), P(kx + 10, ky), P(kx, ky + 16), P(kx - 10, ky)], true);
      g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(kx, ky - 14, kx, ky + 16);
      g.lineStyle(1, 0xffffff, 0.5);
      for (let q = 0; q < 4; q++) g.lineBetween(kx + Math.sin(t * 4 + q) * 4, ky + 16 + q * 8, kx + Math.sin(t * 4 + q + 1) * 4, ky + 24 + q * 8);
      g.lineStyle(0.8, 0xffffff, 0.3); g.lineBetween(kx, ky + 16, 250 + i * 60, 560);
    }
    // Foreground: a balcony, the bottle rack, corks popping and breath spiralling free.
    g.fillStyle(0x5a3e2a, 1); g.fillPoints([P(0, 504), P(430, 520), P(460, H), P(0, H)], true);
    g.lineStyle(1, 0x3a2a1e, 1);
    for (let i = 1; i < 6; i++) g.lineBetween(i * 80, 506 + i * 3, i * 84 + 20, H);
    g.fillStyle(0x6a4a30, 1); g.fillRect(40, 494, 380, 8);
    for (let j = 0; j < 8; j++) {
      const bx = 66 + j * 46, by = 494;
      g.fillStyle(0xc8e8f0, 0.35); g.fillEllipse(bx, by - 14, 22, 28); g.fillRect(bx - 4, by - 38, 8, 12);
      g.lineStyle(1, 0xffffff, 0.5); g.strokeEllipse(bx, by - 14, 22, 28);
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(bx - 5, by - 18, 4, 10);
      const tj = 0.3 + j * 0.32;
      const dt = t - tj;
      if (dt < 0) { g.fillStyle(0xa07a4a, 1); g.fillRect(bx - 4.5, by - 44, 9, 8); }
      else {
        const cxk = bx + dt * 50, cyk = by - 44 - dt * 200 + dt * dt * 260;
        if (cyk < H) { g.fillStyle(0xa07a4a, 1); g.fillRect(cxk - 4.5, cyk, 9, 8); }
        for (let q = 0; q < 9; q++) {
          const d = dt * 70 - q * 9;
          if (d <= 0) continue;
          g.fillStyle(0xffffff, Math.max(0, 0.55 * (1 - d / 240)));
          g.fillCircle(bx + Math.sin(d * 0.07 + j) * 10 * (1 + d / 60), by - 40 - d, 2.4 + d * 0.04);
        }
      }
    }
    // A breath-meter, thrown down, its glass starred.
    g.fillStyle(0xc8a04a, 1); g.fillCircle(330, 548, 16);
    g.fillStyle(0xf0e8d0, 1); g.fillCircle(330, 548, 12);
    g.lineStyle(1.6, 0x2a2a2a, 1); g.lineBetween(330, 548, 338, 540);
    g.lineStyle(1, 0x8a8a8a, 0.8); g.lineBetween(322, 542, 334, 554); g.lineBetween(326, 556, 338, 546);
    vignette(g, W, H, 0.4);
    caption(k, 3);
  },
};

/** Bedrock Hold: the Sepulchre's cliff of cells, opened door by door, the dawn falling in. */
const DAWN_EARTH: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 400, sfx: 'stone-slam' }, { at: 1300, sfx: 'stone-rise' }, { at: 2300, sfx: 'stone-slam' }],
  lines: [{ text: 'Bedrock Hold. The Sepulchre\'s doors, opened from the outside.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 230, 0x2a2030, 0xc07a5a, 0xffd090);
    sunDisc(g, 860, 210 - ease(p) * 30, 28, 0xffd8a0);
    // The banded face of the Hold.
    const bandC = [0x8a5a3a, 0xa06a44, 0x7a4a34, 0xb07a4e, 0x8e5e40, 0x9a6440, 0x7e5038, 0xa87048];
    for (let b = 0; b < 8; b++) {
      const y = 200 + b * 50;
      g.fillStyle(bandC[b], 1); g.fillRect(0, y, W, 51);
      g.lineStyle(1, lit(bandC[b], 0.2), 0.6); g.lineBetween(0, y, W, y + Math.sin(b) * 4);
    }
    g.fillStyle(0xffd090, 0.14); g.fillTriangle(W, 200, W, H, 300, H);
    // Three galleries of cells.
    for (let row = 0; row < 3; row++) {
      const y = 296 + row * 100;
      g.fillStyle(0x5a3a28, 1); g.fillRect(40, y, 880, 10);
      g.fillStyle(0xd09a6a, 1); g.fillRect(40, y, 880, 2);
      for (let c = 0; c < 7; c++) {
        const idx = row * 7 + c;
        const x = 110 + c * 124;
        const o = ease(t, 0.25 + idx * 0.09, 0.85 + idx * 0.09);
        g.fillStyle(0x1a1010, 1); g.fillRect(x - 22, y - 56, 44, 56); g.fillCircle(x, y - 56, 22);
        g.fillStyle(0xffd090, 0.55 * o); g.fillRect(x - 20, y - 54, 40, 54); g.fillCircle(x, y - 56, 20);
        if (o > 0.6) folk(g, x, y, 2, FOLK_COLS[idx % FOLK_COLS.length], t, ease(o, 0.8, 1), idx);
        // The slab door, swung aside.
        g.fillStyle(0x6a5a50, 1 - o * 0.7);
        g.fillRect(x - 22 + o * 30, y - 76 + o * 10, 44 - o * 30, 76 - o * 10);
        g.lineStyle(1, 0x3a2a24, 1 - o * 0.7); g.strokeRect(x - 22 + o * 30, y - 76 + o * 10, 44 - o * 30, 76 - o * 10);
      }
    }
    // The Tithe Scales in the foreground, both pans empty and level.
    g.fillStyle(0x8a6a3a, 1); g.fillRect(806, 444, 10, 136);
    g.fillStyle(0xb08a4a, 1); g.fillRect(730, 438, 162, 7); g.fillCircle(811, 441, 7);
    g.lineStyle(1, 0xd8b070, 1);
    g.lineBetween(734, 445, 720, 506); g.lineBetween(734, 445, 748, 506);
    g.lineBetween(888, 445, 874, 506); g.lineBetween(888, 445, 902, 506);
    g.fillStyle(0xb08a4a, 1); g.fillEllipse(734, 508, 50, 10); g.fillEllipse(888, 508, 50, 10);
    g.fillStyle(0xffe0a0, 0.7); g.fillEllipse(740, 506, 20, 3);
    g.fillStyle(0x5a4030, 1); g.fillEllipse(900, 432, 10, 6); g.fillCircle(904, 428, 3);
    // Dust in the low sunlight.
    for (let i = 0; i < 30; i++) {
      const x = (r() * W + t * 8) % W, y = 220 + r() * 340 + Math.sin(t + i) * 6;
      g.fillStyle(0xffe0b0, 0.5 * r()); g.fillCircle(x, y, 1.2);
    }
    vignette(g, W, H, 0.45);
    caption(k, 4);
  },
};

/** Voltreach: the storm that never stopped parts at last; cut cables hang slack from the pylons. */
const DAWN_ELECTRICITY: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 300, sfx: 'thunder' }, { at: 2200, sfx: 'rain' }],
  lines: [{ text: 'Voltreach. The storm broke, and the sun got through.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    const gap = ease(p, 0, 0.9);
    dawnSky(g, W, 380, 0x3a4a7a, 0xe8b890, 0xffe0a0);
    sunDisc(g, 480, 360 - ease(p) * 22, 26, 0xfff0c0, 0.4 + gap * 0.6);
    // The storm folding back both ways.
    g.fillStyle(0x22222e, 1);
    g.fillRect(0, 0, 360 - gap * 280, 380); g.fillRect(600 + gap * 280, 0, W, 380);
    clouds(g, 200 - gap * 300, 20, 260, 340, 14, r, 0x2a2a38, 0.95, 0);
    clouds(g, 520 + gap * 300, 20, 260, 340, 14, r, 0x2a2a38, 0.95, 0);
    g.fillStyle(0x2a2a38, 1 - gap); g.fillRect(0, 0, W, 60);
    rays(g, 480, 40, Math.PI * 0.28, Math.PI * 0.72, 10, 560, 0xfff0c0, 0.09 * gap, t);
    sea(g, W, 376, 440, t, 0x2a3a5a, 0xffe0b0, 0.7);
    // The isle: a crown of black rock, rods on every peak.
    const rock = [0, 580, 0, 470, 80, 420, 150, 460, 230, 380, 300, 440, 380, 400, 480, 420, 580, 400, 660, 440, 740, 370, 820, 450, 900, 410, W, 450, W, 580];
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < rock.length; i += 2) pts.push(P(rock[i], rock[i + 1]));
    g.fillStyle(0x16161e, 1); g.fillPoints(pts, true);
    g.lineStyle(1.4, 0xffd8a0, 0.35);
    for (let i = 2; i < rock.length - 4; i += 2) g.lineBetween(rock[i], rock[i + 1], rock[i + 2], rock[i + 3]);
    g.lineStyle(1.4, 0x8a8a9a, 1);
    for (const [x, y] of [[80, 420], [230, 380], [740, 370], [900, 410]]) { g.lineBetween(x, y, x, y - 28); g.fillStyle(0x8a8a9a, 1); g.fillCircle(x, y - 30, 3); }
    // The Crown Coil, cold copper.
    g.fillStyle(0x1e1a1a, 1); g.fillRect(466, 210, 28, 214);
    g.lineStyle(3, 0x8a5a3a, 1);
    for (let j = 0; j < 6; j++) g.strokeEllipse(480, 230 + j * 26, 74 - j * 7, 14);
    // Pylons with their cables cut and hanging.
    for (const [px, py] of [[150, 530], [330, 480], [640, 480], [820, 530]]) {
      const h = 120;
      g.lineStyle(2, 0x5a5a6a, 1);
      g.lineBetween(px - 16, py, px - 3, py - h); g.lineBetween(px + 16, py, px + 3, py - h);
      for (let q = 1; q < 5; q++) { const y = py - (h * q) / 5; const w = 16 - (13 * q) / 5; g.lineBetween(px - w, y, px + w, y - h / 5); }
      g.lineBetween(px - 24, py - h + 10, px + 24, py - h + 10);
      for (const s of [-1, 1]) {
        const x0 = px + s * 24, y0 = py - h + 10;
        const sway = Math.sin(t * 1.4 + px) * 4;
        const pts2: Phaser.Geom.Point[] = [];
        for (let q = 0; q <= 6; q++) { const f = q / 6; pts2.push(P(x0 + s * f * 20 + sway * f, y0 + f * 70 + Math.sin(f * Math.PI) * 6)); }
        g.lineStyle(1.6, 0x2a2a2a, 1); g.strokePoints(pts2, false);
        g.fillStyle(0xc87a3a, 1); g.fillCircle(pts2[6].x, pts2[6].y, 2);
      }
    }
    // Houses lit by their own candles.
    for (let j = 0; j < 9; j++) {
      const x = 60 + j * 100 + (j % 2) * 20, y = 540 + (j % 3) * 10;
      g.fillStyle(0x2a2a34, 1); g.fillRect(x - 16, y - 20, 32, 20); g.fillTriangle(x - 19, y - 20, x + 19, y - 20, x, y - 32);
      const on = ease(t, 0.4 + j * 0.25, 0.8 + j * 0.25);
      g.fillStyle(0xffc060, 0.25 * on); g.fillCircle(x, y - 10, 12);
      g.fillStyle(0xffd890, on); g.fillRect(x - 4, y - 14, 8, 7);
    }
    vignette(g, W, H, 0.45);
    caption(k, 5);
  },
};

/** Fangmire: mist lifting off the mire between the white fangs; the Draught ladled out for anyone. */
const DAWN_SLIME: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 500, sfx: 'bubble' }, { at: 2200, sfx: 'heal' }],
  lines: [{ text: 'Fangmire. The Draught, poured for everyone, owed by no one.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    const lift = ease(p);
    dawnSky(g, W, 380, 0x1a2a2a, 0x7aa088, 0xffe8b0);
    sunDisc(g, 560, 370 - lift * 25, 28, 0xfff0c0, 0.85);
    // Back row of fangs, ivory in the low sun.
    for (let j = 0; j < 7; j++) {
      const x = 70 + j * 140, h = 90 + ((j * 53) % 110);
      g.fillStyle(0xb8b098, 1); g.fillPoints([P(x - 16, 404), P(x - 8, 404 - h * 0.6), P(x + 10, 404 - h), P(x + 6, 404 - h * 0.5), P(x + 16, 404)], true);
      g.fillStyle(0xf0e8d0, 1); g.fillPoints([P(x - 2, 404), P(x + 10, 404 - h), P(x + 6, 404 - h * 0.5), P(x + 16, 404)], true);
    }
    // The black water and its mirrored sun.
    g.fillStyle(0x0e1a16, 1); g.fillRect(0, 402, W, H - 402);
    for (let i = 0; i < 8; i++) { g.fillStyle(0xfff0c0, 0.35); g.fillRect(560 - 24 + i * 2 + Math.sin(t * 2 + i) * 8, 408 + i * 9, 48 - i * 4, 2); }
    // Mist, lifting.
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0xd8e8d8, 0.32 * (1 - lift * 0.75));
      g.fillEllipse((i * 120 + t * 10) % (W + 200) - 100, 396 - lift * 30 + Math.sin(i) * 10, 260, 34);
    }
    // Mangroves on their stilt-roots at both edges.
    for (const [mx, sc] of [[40, 1.2], [910, 1.1], [180, 0.7]]) {
      g.lineStyle(3 * sc, 0x1a2418, 1);
      for (let q = -3; q <= 3; q++) g.lineBetween(mx, 360 - 40 * sc, mx + q * 16 * sc, 470);
      g.fillStyle(0x1a2a1a, 1); g.fillRect(mx - 6 * sc, 230, 12 * sc, 160 * sc);
      g.fillEllipse(mx, 230, 150 * sc, 80 * sc); g.fillEllipse(mx - 40 * sc, 260, 90 * sc, 50 * sc);
      g.fillStyle(0x2a3a24, 1); g.fillEllipse(mx + 20 * sc, 220, 80 * sc, 40 * sc);
    }
    // The Draught House, shutters thrown open, its cauldron out on the boardwalk.
    g.lineStyle(3, 0x3a2a1e, 1);
    for (const sx of [262, 290, 370, 398]) g.lineBetween(sx, 430, sx, 490);
    g.fillStyle(0x4a3a2a, 1); g.fillRect(256, 380, 150, 54);
    g.fillStyle(0x3a2a20, 1); g.fillTriangle(246, 382, 416, 382, 331, 338);
    g.fillStyle(0xffd080, 0.9); g.fillRect(286, 396, 34, 24); g.fillRect(344, 396, 34, 24);
    g.fillStyle(0x6a4a30, 1); g.fillRect(270, 396, 14, 24); g.fillRect(322, 396, 14, 24); g.fillRect(328, 396, 14, 24); g.fillRect(380, 396, 14, 24);
    g.fillStyle(0x5a4030, 1); g.fillRect(250, 432, 520, 8);
    g.lineStyle(1, 0x3a2a1e, 1);
    for (let i = 0; i < 26; i++) g.lineBetween(250 + i * 20, 432, 250 + i * 20, 440);
    for (const sx of [480, 600, 720]) { g.lineStyle(3, 0x3a2a1e, 1); g.lineBetween(sx, 440, sx, 500); }
    g.fillStyle(0x1a1a1a, 1); g.fillEllipse(470, 420, 46, 30); g.fillRect(450, 404, 40, 6);
    g.fillStyle(0x9ee04a, 0.9); g.fillEllipse(470, 406, 38, 7);
    for (let q = 0; q < 4; q++) {
      const ph = ((t * 0.6 + q * 0.25) % 1);
      g.fillStyle(0xd8f0c0, 0.4 * (1 - ph)); g.fillCircle(466 + Math.sin(ph * 6 + q) * 8, 398 - ph * 50, 5 + ph * 10);
    }
    for (let j = 0; j < 6; j++) {
      const x = 520 + j * 42;
      folk(g, x, 432, 2, FOLK_COLS[j + 1], t, 0.8, j + 3);
      g.fillStyle(0x9ee04a, 1); g.fillCircle(x + 6, 432 - 25 - Math.sin(t * 8 + j + 3) * 1.5 * 2, 2.6);
    }
    // The last fireflies of the night, going out.
    for (let i = 0; i < 22; i++) {
      const x = r() * W, y = 180 + r() * 260;
      g.fillStyle(0xc8ff6a, (1 - lift) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i)))); g.fillCircle(x + Math.sin(t + i) * 6, y + Math.cos(t * 1.3 + i) * 4, 1.8);
    }
    vignette(g, W, H, 0.45);
    caption(k, 6);
  },
};

/** Lotterhaven: the Wheel stopped on the House roof; the whole quay throwing its Lots into the sea. */
const DAWN_FATE: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 400, sfx: 'jackpot' }, { at: 1500, sfx: 'money' }, { at: 2800, sfx: 'splash' }],
  lines: [{ text: 'Lotterhaven. Every Lot thrown in the sea. Nobody drawn.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 380, 0x2a1a3a, 0xc06a8a, 0xffd8a0);
    sunDisc(g, 150, 370 - ease(p) * 30, 28, 0xffe0b0);
    sea(g, W, 378, H, t, 0x2a2a4a, 0xffd0b0, 0.6);
    // The terraced hill, cut like baize, the suits trimmed in its hedges.
    for (let s = 0; s < 5; s++) {
      const hw = 270 - s * 46, y = 470 - (s + 1) * 38;
      g.fillStyle(s % 2 ? 0x3a8a54 : 0x2a7a4a, 1); g.fillRect(640 - hw, y, hw * 2, 470 - y);
      g.fillStyle(0x8ad08a, 0.6); g.fillRect(640 - hw, y, hw * 2, 2);
      for (let q = 0; q < 6; q++) {
        const x = 640 - hw + 20 + q * ((hw * 2 - 40) / 5), yy = y + 14;
        const suit = (q + s) % 4;
        g.fillStyle(suit % 2 ? 0x1a4a2a : 0x7a2a2a, 1);
        if (suit === 0) { g.fillCircle(x - 3, yy - 2, 4); g.fillCircle(x + 3, yy - 2, 4); g.fillTriangle(x - 7, yy, x + 7, yy, x, yy + 8); }
        else if (suit === 1) { g.fillTriangle(x - 7, yy + 2, x + 7, yy + 2, x, yy - 8); g.fillCircle(x - 3, yy + 2, 4); g.fillCircle(x + 3, yy + 2, 4); g.fillRect(x - 1, yy + 2, 2, 6); }
        else if (suit === 2) { g.fillPoints([P(x, yy - 8), P(x + 6, yy), P(x, yy + 8), P(x - 6, yy)], true); }
        else { g.fillCircle(x, yy - 4, 3.6); g.fillCircle(x - 4, yy + 1, 3.6); g.fillCircle(x + 4, yy + 1, 3.6); g.fillRect(x - 1, yy + 2, 2, 6); }
      }
    }
    for (let i = 0; i < 20; i++) { g.fillStyle(i % 2 ? 0xb02a3a : 0x1a1a20, 1); g.fillRect(380 + i * 26, 466, 13, 6); }
    // The House, and its Wheel — stopped, knocked askew on the roof.
    g.fillStyle(0xe8d8c0, 1); g.fillRect(580, 236, 120, 46);
    g.fillStyle(0xd0a040, 1); g.fillEllipse(640, 236, 70, 40);
    g.fillStyle(0xe8d8c0, 1); g.fillRect(580, 236, 120, 6);
    for (let c = 0; c < 5; c++) { g.fillStyle(0x6a5a5a, 1); g.fillRect(590 + c * 22, 252, 8, 20); }
    const wx = 640, wy = 190, rot = 0.3;
    g.lineStyle(4, 0xb08a3a, 1); g.strokeCircle(wx, wy, 34);
    g.lineStyle(2, 0xb08a3a, 1);
    for (let sp = 0; sp < 8; sp++) { const an = rot + (sp * Math.PI) / 8; g.lineBetween(wx + Math.cos(an) * 34, wy + Math.sin(an) * 34, wx - Math.cos(an) * 34, wy - Math.sin(an) * 34); }
    g.fillStyle(0x8a2a2a, 1); g.fillCircle(wx, wy, 6);
    g.lineStyle(3, 0x6a5a4a, 1); g.lineBetween(wx, wy + 34, wx + 6, 236);
    // The quay and its crowd.
    g.fillStyle(0x5a4a5a, 1); g.fillPoints([P(0, 500), P(390, 514), P(400, H), P(0, H)], true);
    g.fillStyle(0x8a7a8a, 1); g.fillRect(0, 500, 392, 4);
    crowd(g, 20, 370, 520, 10, 9, FOLK_COLS, t, 1);
    // The Lots: brass tokens arcing out over the water, spinning and catching the sun.
    for (let j = 0; j < 44; j++) {
      const x0 = 30 + r() * 330, vx = 80 + r() * 160, vy = -(260 + r() * 180), ph = r() * 2.4;
      const tt = (t + ph) % 2.4;
      const x = x0 + vx * tt, y = 506 + vy * tt + 240 * tt * tt;
      if (y > 600 || x > W) continue;
      const spin = Math.abs(Math.cos(tt * 14 + j));
      g.fillStyle(0xe8c04a, 1); g.fillEllipse(x, y, 7 * spin + 1, 7);
      if (spin > 0.85) { g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 1, y - 1, 1.2); }
    }
    for (let i = 0; i < 5; i++) {
      const sp = ((t * 0.8 + i * 0.37) % 1);
      g.lineStyle(1.2, 0xffffff, 0.5 * (1 - sp)); g.strokeEllipse(470 + i * 90, 540 + (i % 2) * 18, 8 + sp * 26, 3 + sp * 8);
    }
    vignette(g, W, H, 0.45);
    caption(k, 7);
  },
};

/** Choirholm: the Great Organ's pipes silent and full of birds; every voice on the terraces its own note. */
const DAWN_SOUND: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 300, sfx: 'crystal-chime' }, { at: 1200, sfx: 'sonic-pulse' }, { at: 2400, sfx: 'sparkle' }],
  lines: [{ text: 'Choirholm. Everyone sang whatever note they liked.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 420, 0x2a2a4a, 0x9a8ac0, 0xffd8e8);
    sunDisc(g, 790, 410 - ease(p) * 30, 26, 0xffe8f0);
    sea(g, W, 416, H, t, 0x4a4a6a, 0xffe0f0, 0.8);
    // The isle, steep and snow-capped, its terraces facing the summit.
    g.fillStyle(0x4a4a6a, 1); g.fillPoints([P(160, 480), P(380, 230), P(450, 156), P(500, 148), P(560, 220), P(800, 480)], true);
    g.fillStyle(0xe8e8f4, 1); g.fillPoints([P(380, 230), P(450, 156), P(500, 148), P(560, 220), P(520, 210), P(480, 230), P(430, 214)], true);
    g.lineStyle(1.6, 0xffe8f0, 0.5); g.lineBetween(500, 148, 560, 220); g.lineBetween(560, 220, 800, 480);
    for (let ti = 0; ti < 7; ti++) {
      const y = 260 + ti * 32, hw = 70 + ti * 42;
      g.lineStyle(2, 0x6a6a8e, 1);
      g.beginPath(); g.arc(476, y - hw * 0.9, hw, Math.PI * 0.32, Math.PI * 0.68); g.strokePath();
      for (let q = 0; q < 5 + ti; q++) {
        const an = Math.PI * 0.34 + (q / (4 + ti)) * Math.PI * 0.32;
        const x = 476 + Math.cos(an) * hw, yy = y - hw * 0.9 + Math.sin(an) * hw;
        g.fillStyle(FOLK_COLS[(q + ti) % FOLK_COLS.length], 1); g.fillCircle(x, yy - 3, 2.6);
        g.fillStyle(0xf0c8a0, 1); g.fillCircle(x, yy - 7, 1.6);
      }
    }
    // The cathedral, its pipes silent; birds sitting on them.
    g.fillStyle(0xd8d4e8, 1); g.fillRect(452, 120, 48, 34); g.fillTriangle(448, 120, 504, 120, 476, 100);
    const pipes = [28, 46, 62, 74, 62, 46, 28];
    pipes.forEach((h, i) => {
      const x = 446 + i * 9;
      g.fillStyle(0xc8ccd8, 1); g.fillRect(x, 100 - h, 6, h);
      g.fillStyle(0xffffff, 0.7); g.fillRect(x, 100 - h, 2, h);
      if (i % 2 === 0) { const by = 98 - h + Math.sin(t * 3 + i) * 0.6; g.fillStyle(0x2a2a3a, 1); g.fillEllipse(x + 3, by - 2, 7, 5); g.fillCircle(x + 5, by - 5, 2); }
    });
    // Notes: every voice its own, every colour, going wherever they like.
    const nc = [0xff8ad0, 0xffd040, 0x7ad0ff, 0xb07aff, 0x9ee04a, 0xffffff, 0xff9a60, 0x6affd0];
    for (let i = 0; i < 36; i++) {
      const x0 = 260 + r() * 440, y0 = 300 + r() * 160, sp = 0.18 + r() * 0.25, ph = r(), sz = 0.7 + r() * 0.8, col = nc[Math.floor(r() * nc.length)];
      const age = (t * sp + ph) % 1;
      const x = x0 + Math.sin(age * 6 + i) * 30 + (x0 - 480) * age * 0.5, y = y0 - age * 240;
      const a = Math.sin(age * Math.PI) * Math.min(1, t * 1.5);
      g.fillStyle(col, a); g.fillEllipse(x, y, 7 * sz, 5 * sz);
      g.lineStyle(1.4 * sz, col, a); g.lineBetween(x + 3 * sz, y, x + 3 * sz, y - 15 * sz);
      if (i % 3 === 0) g.lineBetween(x + 3 * sz, y - 15 * sz, x + 8 * sz, y - 10 * sz);
      else if (i % 3 === 1) { g.fillEllipse(x + 12 * sz, y + 2 * sz, 7 * sz, 5 * sz); g.lineBetween(x + 15 * sz, y + 2 * sz, x + 15 * sz, y - 13 * sz); g.lineBetween(x + 3 * sz, y - 15 * sz, x + 15 * sz, y - 13 * sz); }
    }
    // A snowy balcony rail, and a tuning-reed somebody unpinned and dropped.
    g.fillStyle(0xe8e8f4, 1); g.fillPoints([P(0, 530), P(300, 540), P(340, H), P(0, H)], true);
    g.fillStyle(0x5a5a7a, 1); g.fillRect(0, 498, 320, 5);
    for (let i = 0; i < 9; i++) g.fillRect(10 + i * 36, 498, 4, 40);
    g.fillStyle(0xc8a04a, 1); g.fillRect(170, 556, 26, 5); g.fillRect(190, 553, 4, 11);
    g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(t * 4)); g.fillCircle(176, 557, 1.6);
    vignette(g, W, H, 0.4);
    caption(k, 8);
  },
};

/** Solmara: the first sunrise in twenty-two years — last stars fading, and long shadows at last. */
const DAWN_LIGHT: CutsceneShot = {
  ms: 4300,
  cues: [{ at: 300, sfx: 'light-beam' }, { at: 2400, sfx: 'holy-chord' }],
  lines: [{ text: 'Solmara. The sun went down at last — and came back up.' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    const up = ease(p);
    sky(g, 0, 0, W, 240, 0x0a0c24, 0x4a3a6a, 14);
    starfield(g, 0, 0, W, 220, r, 100, t);
    g.fillStyle(0x2a2a50, up * 0.7); g.fillRect(0, 0, W, 240);
    sky(g, 0, 240, W, 182, 0x4a3a6a, 0xff9a50, 12);
    const sx = 600, sy = 424 - up * 34;
    sunDisc(g, sx, sy, 46, 0xffa860);
    rays(g, sx, sy, -Math.PI * 0.98, -Math.PI * 0.02, 16, 700, 0xffd0a0, 0.05, t);
    sea(g, W, 420, H, t, 0x3a2a4a, 0xffc890, 0.8);
    // The white town, and the Heliostat's mirrors turned face-down.
    for (let row = 0; row < 5; row++) {
      for (let c = 0; c < 7 - row; c++) {
        const x = 20 + c * 52 + row * 22, y = 440 - row * 40, w = 46, h = 40;
        g.fillStyle(0xe8dcd0, 1); g.fillRect(x, y - h, w, h);
        g.fillStyle(0xffc890, 0.5); g.fillRect(x + w - 10, y - h, 10, h);
        g.fillStyle(0x8a7a8a, 1); g.fillRect(x, y - h, 10, h);
        g.fillStyle(0x5a4a5a, 1); g.fillRect(x + 18, y - 24, 10, 14);
      }
    }
    g.fillStyle(0xf0e8e0, 1); g.fillEllipse(140, 240, 60, 40);
    g.fillStyle(0xffd0a0, 0.6); g.fillEllipse(152, 234, 24, 18);
    g.lineStyle(2, 0x5a5060, 1); g.strokeEllipse(140, 214, 160, 36);
    for (let m = 0; m < 9; m++) {
      const an = Math.PI + (m / 8) * Math.PI;
      const mx = 140 + Math.cos(an) * 80, my = 214 + Math.sin(an) * 18;
      g.lineStyle(1, 0x5a5060, 1); g.lineBetween(mx, my, mx, my - 16);
      g.fillStyle(0x2a2430, 1); g.fillPoints([P(mx - 8, my - 16), P(mx + 8, my - 16), P(mx + 6, my - 10), P(mx - 6, my - 10)], true);
      g.lineStyle(1, 0xffc890, 0.6); g.lineBetween(mx - 8, my - 16, mx + 8, my - 16);
    }
    // The terrace, and the people on it, each with a long shadow for the first time.
    g.fillStyle(0xe8d8c8, 1); g.fillRect(380, 480, W - 380, H - 480);
    g.fillStyle(0xffc890, 0.25); g.fillRect(380, 480, W - 380, H - 480);
    g.lineStyle(1, 0xc8b8a8, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(380, 490 + i * i * 3, W, 490 + i * i * 3);
    const people: [number, number, number][] = [[420, 520, 2.4], [520, 540, 2.6], [690, 528, 2.4], [780, 548, 2.6], [860, 534, 1.7]];
    const L = 40 + up * 280;
    people.forEach(([x, y, s]) => {
      const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
      g.fillStyle(0x3a2a40, 0.55);
      g.fillPoints([P(x + nx * 5, y + ny * 5), P(x - nx * 5, y - ny * 5), P(x - nx * 9 + ux * L, y - ny * 9 + uy * L * 0.35), P(x + nx * 9 + ux * L, y + ny * 9 + uy * L * 0.35)], true);
    });
    people.forEach(([x, y, s], i) => folk(g, x, y, s, FOLK_COLS[(i + 2) % FOLK_COLS.length], t, i === 4 ? 0 : 0.2 * up, i + 5));
    // The child pointing down at its own shadow.
    g.lineStyle(2, FOLK_COLS[6], 1); g.lineBetween(862, 514, 872, 528);
    vignette(g, W, H, 0.4);
    caption(k, 9);
  },
};

// ── 13–14: the Muster's farewell; the row home ─────────────────────────

/** The Muster on the landing in morning light, the hero in the middle of them. */
const MUSTER_FAREWELL: CutsceneShot = {
  ms: 11000,
  cues: [{ at: 500, sfx: 'sparkle' }],
  lines: [
    { who: MUSTER[0].name, color: '#ffb04a', text: 'Ten crowns down, and whatever he was besides. I\'m going home to sleep for a week.' },
    { who: MUSTER[7].name, color: '#e8c04a', text: 'I had money on you. Tuppence had money against. She\'s sulking.' },
    { who: MUSTER[9].name, color: '#f2f0e8', text: 'Mind the dark on the way home. It\'s a good dark, now.' },
  ],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    dawnSky(g, W, 400, 0x5a7ab0, 0xffc8a0, 0xfff0d0);
    sunDisc(g, 820, 360, 34, 0xfff0c0);
    rays(g, 820, 360, -Math.PI, 0, 14, 800, 0xfff4e0, 0.05, t);
    drawPinnacle(g, 170, 410, 330, { t, lit: 10 });
    g.fillStyle(0xffd8b0, 0.16); g.fillRect(0, 200, 400, 210);
    sea(g, W, 404, 472, t, 0x3a6a9a, 0xfff0d0, 0.6);
    for (let i = 0; i < 10; i++) boat(g, 80 + i * 88, 470, 0.55, 0x4a3a2a, ISLES[i].col, t + i, i % 2 ? -1 : 1);
    shingle(g, 0, 470, W, H - 470, r, t, 130, 1);
    const speaker = k.line === 0 ? 0 : k.line === 1 ? 7 : k.line === 2 ? 9 : -1;
    for (let i = 0; i < 10; i++) {
      const x = i < 5 ? 66 + i * 80 : 574 + (i - 5) * 80;
      const y = 548 + (i % 2) * 10;
      wanderer(g, i, x, y, 1.25, t, { face: x < 480 ? 1 : -1, wave: i === speaker ? 1 : p > 0.85 ? 1 : 0 });
    }
    cineHero(g, 480, 530, 22, k.hero.color, { face: 1, t });
    vignette(g, W, H, 0.4);
  },
};

/** The Ferryman rows the hero home, the ten boats fanning out to ten isles behind. */
const ROW_HOME: CutsceneShot = {
  ms: 9000,
  cues: [{ at: 800, sfx: 'splash' }, { at: 3200, sfx: 'splash' }, { at: 5600, sfx: 'splash' }],
  lines: [
    { who: 'The Ferryman', text: 'Sit. Mind the oar.' },
    { who: 'The Ferryman', text: 'First time I\'ve ever rowed one back.' },
  ],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t, p } = k;
    const go = ease(p);
    dawnSky(g, W, 380, 0x5a8ac8, 0xffd8b0, 0xfff4e0);
    sunDisc(g, 700, 300, 30, 0xfff4d0);
    clouds(g, -100, 120, W + 200, 120, 8, r, 0xffffff, 0.35, t * 5);
    drawPinnacle(g, 130, 384, 210, { t, lit: 10 });
    sea(g, W, 380, H, t, 0x2a5a8a, 0xfff0d0, 0.4);
    for (let i = 0; i < 9; i++) { g.fillStyle(0xfff4d0, 0.45); g.fillRect(700 - 28 + i * 2 + Math.sin(t * 2 + i) * 10, 386 + i * i * 2, 56 - i * 4, 2); }
    // Ten boats peeling off for ten isles.
    for (let i = 0; i < 10; i++) {
      const spread = i - 4.5;
      const x = 480 + spread * 36 + spread * go * 80;
      const y = 470 - go * (40 + (i % 3) * 16);
      const s = 0.62 - go * 0.3;
      boat(g, x, y, s, 0x4a3a2a, ISLES[i].col, t + i, spread < 0 ? -1 : 1);
    }
    for (let i = 0; i < 3; i++) gull(g, 200 + ((t * 36 + i * 160) % 600), 180 + i * 24, 1, t, 0xffffff, 0.9);
    // The skiff: the Ferryman at the oar, the hero looking back at the spire.
    const sx = mix(380, 560, go), sy = 556;
    const stroke = Math.sin(t * 1.6);
    ferryman(g, sx - 34, sy - 10, 0.8, t, { row: stroke, face: 1, lamp: 0.3 });
    cineHero(g, sx + 32, sy - 22, 13, k.hero.color, { face: -1, t });
    skiff(g, sx, sy, 1, t, 1, 0.3);
    g.fillStyle(0xffffff, 0.22 * Math.max(0, stroke)); g.fillEllipse(sx - 64, sy + 8, 30, 4);
    vignette(g, W, H, 0.4);
  },
};

// ── 15: the title card ─────────────────────────────────────────────────

/** THE TEN ISLES — ten lights circling the title, each in its isle's colour. */
const TITLE: CutsceneShot = {
  ms: 7500,
  full: true,
  cues: [{ at: 1200, sfx: 'holy-chord' }],
  draw(g, k) {
    const r = k.rng();
    const { W, H, t } = k;
    sky(g, 0, 0, W, H, 0x05040a, 0x120e20, 16);
    starfield(g, 0, 0, W, H, r, 120, t);
    for (let i = 0; i < 10; i++) {
      const an = t * 0.12 + (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = 480 + Math.cos(an) * 330, y = 300 + Math.sin(an) * 150;
      const a = ease(t, 0.2 + i * 0.12, 0.8 + i * 0.12);
      const col = ISLES[i].col;
      for (let q = 3; q >= 1; q--) { g.fillStyle(col, 0.07 * a); g.fillCircle(x, y, 6 + q * 8); }
      g.fillStyle(col, a); g.fillCircle(x, y, 4);
      g.fillStyle(0xffffff, a); g.fillCircle(x, y, 1.8);
    }
    const ta = ease(t, 1.2, 2.6);
    k.text(480, 286, 'THE TEN ISLES', { size: 60, color: '#fff4dc', alpha: ta, spacing: 14 });
    g.lineStyle(1, 0xfff4dc, 0.5 * ta); g.lineBetween(300, 334, 660, 334);
    const na = ease(t, 2.6, 3.6) * 0.8;
    k.text(480, 358, ISLES.slice(0, 5).map((s) => s.name).join('  ·  '), { size: 13, color: '#d8d0ee', alpha: na, spacing: 2, display: false });
    k.text(480, 380, ISLES.slice(5).map((s) => s.name).join('  ·  '), { size: 13, color: '#d8d0ee', alpha: na, spacing: 2, display: false });
    k.text(480, 430, 'free', { size: 18, color: '#ffe9b0', alpha: ease(t, 3.8, 5), spacing: 10 });
  },
};

// ── 16–17: the stinger ─────────────────────────────────────────────────

/**
 * Night over the freed sea, the Ferryman sitting on a jetty with his lamp. At `T` 2.8 s a star
 * starts to shiver; at 5.6 s it comes loose and falls; at 7.4 s it lands beyond the horizon in a
 * far flash, and the red glow of it stays.
 */
function stinger(g: G, k: CutsceneKit, T: number): void {
  const r = k.rng();
  const { W, H } = k;
  sky(g, 0, 0, W, 400, 0x03050e, 0x14203a, 22);
  starfield(g, 0, 0, W, 380, r, 170, T);
  g.fillStyle(0x8a9ac8, 0.05); g.fillEllipse(480, 160, 1100, 90);
  // The ten isles asleep along the horizon, windows lit.
  for (let i = 0; i < 10; i++) isle(g, i, 50 + i * 96, 400, 0.28 + (i % 3) * 0.05, 0x080c18, 1, 1);
  sea(g, W, 398, H, T, 0x060c1c, 0x2a3a6a, 0.8);
  for (let i = 0; i < 14; i++) { g.fillStyle(0xffffff, 0.25); g.fillRect(r() * W, 410 + r() * 150, 1, 4 + r() * 6); }
  // The star.
  const X0 = 700, Y0 = 150, X1 = 872, Y1 = 398;
  const shiver = ease(T, 2.8, 5.4);
  const f = Phaser.Math.Clamp((T - 5.6) / 1.8, 0, 1);
  if (T < 5.6) {
    const j = shiver * 2.4 * Math.sin(T * 70);
    const jx = X0 + j, jy = Y0 + shiver * 1.6 * Math.cos(T * 53);
    g.fillStyle(OBS.star, 0.12 + shiver * 0.18); g.fillCircle(jx, jy, 5 + shiver * 6);
    g.fillStyle(0xffffff, 0.8 + 0.2 * Math.sin(T * 3)); g.fillCircle(jx, jy, 1.8 + shiver * 0.8);
  } else if (f < 1) {
    const ff = f * f;
    fallingStar(g, mix(X0, X1, ff), mix(Y0, Y1, ff), X1 - X0, Y1 - Y0, 30 + f * 180, 1);
  }
  const imp = T - 7.4;
  if (imp > 0) {
    // The far flash, a dome of light on the horizon, and the glow that will not go away.
    const core = 1 - ease(imp, 0.1, 1.6);
    const rr = 10 + ease(imp, 0, 0.7) * 80;
    g.fillStyle(0xffffff, 0.12 * core); g.fillRect(0, 0, W, H);
    g.fillStyle(OBS.starDeep, 0.25 * core); g.fillEllipse(X1, Y1, rr * 3, rr * 1.4);
    g.fillStyle(OBS.star, 0.6 * core); g.fillEllipse(X1, Y1, rr * 1.4, rr * 0.8);
    g.fillStyle(0xffffff, core); g.fillEllipse(X1, Y1, rr * 0.5, rr * 0.3);
    const ember = ease(imp, 0.4, 2) * (0.75 + 0.25 * Math.sin(T * 2.4));
    g.fillStyle(0xff5a2a, 0.18 * ember); g.fillEllipse(X1, Y1 - 6, 200, 60);
    g.fillStyle(0xff8a3a, 0.3 * ember); g.fillEllipse(X1, Y1 - 2, 80, 18);
    for (let q = 0; q < 5; q++) {
      g.fillStyle(0x3a1a1a, 0.25 * ember); g.fillCircle(X1 + Math.sin(T * 0.4 + q) * 10, Y1 - 20 - q * 22 - imp * 4, 12 + q * 6);
    }
    g.fillStyle(0xff8a3a, 0.25 * Math.max(core, ember * 0.6)); g.fillRect(X1 - 8, Y1 + 2, 16, 140);
  }
  // The jetty, the moored skiff, the Ferryman watching.
  skiff(g, 160, 566, 0.9, T, 1, 0);
  g.fillStyle(0x1a1410, 1); g.fillRect(0, 520, 380, 14);
  g.lineStyle(4, 0x1a1410, 1);
  for (let i = 0; i < 5; i++) g.lineBetween(30 + i * 80, 534, 30 + i * 80, H);
  g.lineStyle(1, 0x3a2e24, 1); g.lineBetween(0, 520, 380, 520);
  ferryman(g, 300, 522, 1.3, T, { face: 1, lamp: 1 });
  vignette(g, W, H, 0.6);
}

/** The ending: the star out, the glass gone, ten dawns, farewell, the row home, the title, the stinger. */
export const CINE_ENDING: CutsceneDef = {
  id: 'cine-ending',
  music: 'title',
  shots: [
    STAR_OUT,
    GLASS_CLEARS,
    DAWN_FIRE, DAWN_WATER, DAWN_LIFE, DAWN_AIR, DAWN_EARTH,
    DAWN_ELECTRICITY, DAWN_SLIME, DAWN_FATE, DAWN_SOUND, DAWN_LIGHT,
    MUSTER_FAREWELL,
    ROW_HOME,
    TITLE,
    {
      ms: 9500,
      cues: [{ at: 2900, sfx: 'sparkle' }, { at: 5600, sfx: 'meteor' }, { at: 7500, sfx: 'quake', shake: 0.003, ms: 900 }],
      lines: [{ text: 'And the freed sea slept easy, under a sky that kept its stars.' }],
      draw(g, k) { stinger(g, k, k.t); },
    },
    {
      ms: 6500,
      enter: 'cut',
      cues: [{ at: 200, sfx: 'heartbeat' }, { at: 2600, sfx: 'heartbeat' }],
      lines: [{ text: '…or does it?' }],
      draw(g, k) { stinger(g, k, 9.5 + k.t); },
    },
  ],
};
