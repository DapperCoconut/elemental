import type { CutsceneDef, CutsceneKit } from '../../../../IslesTypes';
import type { G } from '../../../../art/IsleArt';
import { OBS, councilMask, shard, starGlow } from '../../../../art/PinnacleArt';
import { cineHero, ease, vignette, wash } from '../../../../art/CineArt';
import { BENCHES, benchIntroId } from '../../spec';
import { NOON, type Emblem, ceilingSeam, councilSeat, emblem, sunShaft } from './art';

/**
 * The Noon Bench's arrival (~15 s, three shots).
 *   1. Up the nave from the top of the stair: mirror walls running away to a blaze at the far end,
 *      the captured sunbeam falling into its well halfway, the challenger climbing into it.
 *   2. Looking straight up: the Ceiling Seam — the King's floor from beneath, its plates split,
 *      the star burning through. The Ferryman says what it is.
 *   3. Six seats in a crescent, six masked backs. One by one they turn, and their slits light.
 */

const B = BENCHES.find((b) => b.isle === 'light')!;
const FERRY = '#c8d0e0';
const GLAZE = '#fff2b0';
const VP = { x: 480, y: 196 };
const SEATS: Emblem[] = ['brush', 'compass', 'sigil', 'sun', 'scales', 'lantern'];

/** Shot 1 — the nave in one-point perspective, pushing in. */
function nave(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const s = 1 + ease(k.p) * 0.16;
  const P = (x: number, y: number) => ({ x: VP.x + (x - VP.x) * s, y: VP.y + (y - VP.y) * s });
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  // The far end: the Seam, a blaze where the nave meets the ceiling.
  starGlow(g, VP.x, VP.y - 40, 16 * s, k.T, 1.1);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    sunShaft(g, VP.x, VP.y - 40, VP.x + Math.cos(a + Math.PI) * -700, VP.y + 620, 8, 140, 0.5 + 0.15 * Math.sin(k.T * 1.3 + i));
  }
  // The walls, receding.
  const wl = [P(-200, 0), P(380, 150), P(380, 236), P(-200, 760)];
  const wr = [P(1160, 0), P(580, 150), P(580, 236), P(1160, 760)];
  g.fillStyle(OBS.glass, 1); g.fillPoints(wl, true); g.fillPoints(wr, true);
  // Mirrors along both walls, each holding a sliver of gold.
  for (let i = 0; i < 7; i++) {
    const z = Math.pow(0.72, i);
    for (const side of [-1, 1]) {
      const x0 = VP.x + side * (100 + 600 * z) , x1 = VP.x + side * (100 + 600 * z * 0.82);
      const top0 = VP.y - 40 - 250 * z, bot0 = VP.y + 40 + 330 * z;
      const top1 = VP.y - 40 - 250 * z * 0.82, bot1 = VP.y + 40 + 330 * z * 0.82;
      const q = [P(x0, top0), P(x1, top1), P(x1, bot1), P(x0, bot0)];
      g.fillStyle(0x16121f, 1); g.fillPoints(q, true);
      g.lineStyle(1.2, OBS.edge, 0.5); g.strokePoints(q, true);
      const m = 0.35 + 0.25 * Math.sin(k.T * 0.8 + i + side);
      g.fillStyle(NOON.gold, 0.12 * m + 0.05);
      g.fillPoints([P(x0, top0 + (bot0 - top0) * 0.3), P(x1, top1 + (bot1 - top1) * 0.3), P(x1, top1 + (bot1 - top1) * 0.4), P(x0, top0 + (bot0 - top0) * 0.42)], true);
    }
  }
  // The floor: black glass tiles running to the point, the brass meridian down the middle.
  const fl = [P(-200, 760), P(380, 236), P(580, 236), P(1160, 760)];
  g.fillStyle(0x0b0911, 1); g.fillPoints(fl, true);
  g.lineStyle(1, OBS.seam, 0.14);
  for (let i = -8; i <= 8; i++) { const a = P(VP.x + i * 160, 760), b = P(VP.x + i * 12, 236); g.lineBetween(a.x, a.y, b.x, b.y); }
  for (let i = 1; i < 9; i++) { const y = 236 + 10 * Math.pow(1.55, i); const a = P(-200, y), b = P(1160, y); g.lineBetween(a.x, a.y, b.x, b.y); }
  const m0 = P(VP.x, 760), m1 = P(VP.x, 236);
  g.lineStyle(4, NOON.brass, 0.7); g.lineBetween(m0.x, m0.y, m1.x, m1.y);
  // Light lying on the floor in long stripes down the nave.
  for (let i = 0; i < 5; i++) {
    const y = 250 + 30 * Math.pow(1.5, i);
    const c = P(VP.x + Math.sin(i * 2.7) * 120, y);
    g.fillStyle(NOON.gold, 0.08); g.fillEllipse(c.x, c.y, 160 * s * (1 + i * 0.4), 18 * (1 + i * 0.6));
  }
  // The captured sunbeam falling into its well, halfway up.
  const w = P(VP.x, 300);
  sunShaft(g, w.x, 0, w.x, w.y, 26, 40, 1.3 + 0.2 * Math.sin(k.T * 2));
  g.fillStyle(NOON.starCore, 0.9); g.fillEllipse(w.x, w.y, 44 * s, 8 * s);
  // The six seats down the sides, dark shapes with a violet glint each.
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const z = Math.pow(0.7, 1 + Math.floor(i / 2) * 1.2);
    const b = P(VP.x + side * (60 + 330 * z), VP.y + 40 + 250 * z);
    shard(g, b.x, b.y, 40 * z * s, 150 * z * s, 0, 0.2);
    g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(b.x, b.y - 100 * z * s, Math.max(1, 3 * z * s));
  }
  // Motes in the light.
  for (let i = 0; i < 40; i++) {
    const x = rng() * k.W, y0 = rng() * k.H;
    const y = (y0 - k.t * (10 + rng() * 20) + k.H) % k.H;
    g.fillStyle(NOON.gold, 0.25 + rng() * 0.5); g.fillCircle(x, y, 0.8 + rng() * 1.2);
  }
  // The challenger, from behind, climbing the last steps into it.
  cineHero(g, 480, 540 - ease(k.p) * 50, 30 * (1 - ease(k.p) * 0.2), k.hero.color, { back: true, walk: 1, t: k.t });
  vignette(g, k.W, k.H, 0.55);
  if (k.p < 0.12) wash(g, k.W, k.H, NOON.starCore, 0.5 * (1 - k.p / 0.12));
}

/** Shot 2 — straight up at the Ceiling Seam. */
function seamShot(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  g.fillStyle(0x040308, 1); g.fillRect(0, 0, k.W, k.H);
  const heat = 0.9 + ease(k.p) * 0.4;
  ceilingSeam(g, 480 + Math.sin(k.T * 0.2) * 8, 560, 1180, 520, k.T, 1010, heat);
  // The light behind the hottest split swelling as we look.
  starGlow(g, 470, 300, 22 + ease(k.p) * 10, k.T, 0.6 * heat);
  // Dust turning in the beams.
  for (let i = 0; i < 70; i++) {
    const x = rng() * k.W, y = rng() * k.H;
    const a = k.t * (0.2 + rng() * 0.4) + rng() * 6.28;
    g.fillStyle(NOON.gold, 0.2 + rng() * 0.5); g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 6, 0.7 + rng() * 1.3);
  }
  vignette(g, k.W, k.H, 0.6);
}

/** Shot 3 — the six seats, six masked backs; one by one they turn to look. */
function masks(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  // The back wall: black glass with gold pouring down it from the top.
  for (let i = 0; i < 9; i++) shard(g, 40 + i * 110 + rng() * 30, 330, 120, 260 + rng() * 60, (rng() - 0.5) * 30, 0.2);
  for (let i = 0; i < 4; i++) sunShaft(g, 160 + i * 220, 62, 200 + i * 220, 520, 20, 120, 0.7);
  g.fillStyle(0x0b0911, 1); g.fillRect(0, 380, k.W, 260);
  g.fillStyle(NOON.gold, 0.06); g.fillEllipse(480, 420, 900, 120);
  // The crescent of seats.
  for (let i = 0; i < 6; i++) {
    const x = 140 + i * 136;
    const y = 400 - Math.sin((i / 5) * Math.PI) * 40;
    councilSeat(g, x, y, 0.72, SEATS[i], 900 + i);
    // The councilor before the seat: a tall robe of black glass, a gold stole with the seat's emblem.
    const fy = y + 44;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, fy + 4, 60, 12);
    g.fillStyle(OBS.glass, 1); g.fillPoints([{ x: x - 26, y: fy }, { x: x + 26, y: fy }, { x: x + 13, y: fy - 74 }, { x: x - 13, y: fy - 74 }], true);
    g.fillStyle(OBS.facet, 1); g.fillPoints([{ x, y: fy }, { x: x + 26, y: fy }, { x: x + 13, y: fy - 74 }, { x, y: fy - 74 }], true);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x + 13, fy - 74, x + 26, fy);
    // Who turns when: right to left from the presiding seat, half a second apart.
    const turn = ease(k.t, 0.7 + (5 - i) * 0.42, 1.1 + (5 - i) * 0.42);
    const hx = x, hy = fy - 88;
    if (turn > 0) {
      g.fillStyle(NOON.gold, 0.9 * turn); g.fillRect(x - 3, fy - 70, 6, 50);
      emblem(g, SEATS[i], x, fy - 30, 7, turn);
    }
    if (turn < 0.5) {
      // The back of the head: a dark hood, the mask's strap catching the light.
      const w = 15 * (1 - turn * 1.2);
      g.fillStyle(OBS.glass, 1); g.fillEllipse(hx, hy, w * 2 + 4, 32);
      g.lineStyle(1, OBS.edge, 0.6); g.strokeEllipse(hx, hy, w * 2 + 4, 32);
      g.lineStyle(2, NOON.brass, 0.6); g.lineBetween(hx - w, hy - 2, hx + w, hy - 2);
    } else {
      const a = (turn - 0.5) * 2;
      councilMask(g, hx, hy, 16, { alpha: 1, glow: a * (1 + 0.4 * Math.sin(k.t * 4 + i)) });
      if (a < 1) { g.fillStyle(OBS.seamLit, 0.6 * (1 - a)); g.fillCircle(hx, hy - 3, 30 * (1 - a)); }
    }
  }
  // The challenger at the foot of the dais, small, looking up at them.
  cineHero(g, 480, 548, 18, k.hero.color, { back: true, t: k.t });
  vignette(g, k.W, k.H, 0.5);
}

export const LIGHT_BENCH_INTRO: CutsceneDef = {
  id: benchIntroId(B.id),
  shots: [
    {
      ms: 5400, enter: 'white', draw: nave,
      cues: [{ at: 200, sfx: 'holy-chord' }, { at: 2600, sfx: 'light-beam' }],
      lines: [{ who: 'The Ferryman', color: FERRY, text: 'Tenth bench. The last one under Him. Shade your eyes — the shell is thin as a fingernail up here.' }],
    },
    {
      ms: 4800, enter: 'cut', draw: seamShot,
      cues: [{ at: 300, sfx: 'beam-charge' }, { at: 2400, shake: 0.003, ms: 900, sfx: 'quake' }],
      lines: [{ who: 'The Ferryman', color: FERRY, text: 'That is the floor of His hall you are looking at. From underneath. He is sat right over our heads.' }],
    },
    {
      ms: 5600, enter: 'cut', draw: masks,
      cues: [
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 800 + i * 420, sfx: 'crystal-chime' })),
        { at: 3500, sfx: 'judgement', flash: 0xfff2b0 },
      ],
      lines: [
        { who: 'Councilor Aurelia Glaze', color: GLAZE, text: 'We drafted the Endless Noon on this bench, clause by clause. We are still rather proud of it.' },
        { who: 'Councilor Aurelia Glaze', color: GLAZE, text: 'Do step into the light, challenger. We should like to see you clearly.' },
      ],
    },
  ],
};
