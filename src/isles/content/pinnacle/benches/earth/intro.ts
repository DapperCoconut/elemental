import type Phaser from 'phaser';
import type { CutsceneDef, CutsceneKit } from '../../../../IslesTypes';
import { dim } from '../../../../art/IsleArt';
import { cineHero, ease, mix, sky, vignette, wash } from '../../../../art/CineArt';
import { OBS, councilMask, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, benchIntroId } from '../../spec';
import { OCHRE, SANDSTONE, STRATA, type SeatSigil, greatScale, seatSigil, titheStack } from './art';

/**
 * The Stone Bench's intro: up the stair into the vault of strata; the Great Scale, where a stone
 * slips off the mountain and the beam does not even stir for it; six masks turning to look.
 */

type G = Phaser.GameObjects.Graphics;
const B = BENCHES.find((x) => x.isle === 'earth')!;
const FERRY = '#c9d8e8';
const BEDWELL = '#e8c27e';

/** Shot 1: the vault in one-point perspective — strata walls converging, dust in violet shafts, the hero climbing. */
function vault(g: G, k: CutsceneKit): void {
  const { W, H, t, p } = k;
  const rng = k.rng();
  const vx = W / 2, vy = mix(250, 230, p);
  sky(g, 0, 0, W, H, OBS.sky, OBS.glass, 12);
  // Wall slices: from the near edges toward the vanishing point, each banded with strata.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const f0 = i / 9, f1 = (i + 1) / 9;
      const x0 = mix(side < 0 ? 0 : W, vx + side * 70, f0), x1 = mix(side < 0 ? 0 : W, vx + side * 70, f1);
      const t0 = mix(0, vy - 130, f0), t1 = mix(0, vy - 130, f1);
      const b0 = mix(H, vy + 40, f0), b1 = mix(H, vy + 40, f1);
      const bands = 7;
      for (let b = 0; b < bands; b++) {
        const q0 = b / bands, q1 = (b + 1) / bands;
        const col = dim(STRATA[(b + i * 2) % STRATA.length], 0.35 + f0 * 0.35);
        g.fillStyle(col, 1);
        g.fillPoints([
          { x: x0, y: mix(t0, b0, q0) }, { x: x1, y: mix(t1, b1, q0) }, { x: x1, y: mix(t1, b1, q1) }, { x: x0, y: mix(t0, b0, q1) },
        ] as unknown as Phaser.Math.Vector2[], true);
      }
      g.fillStyle(OBS.glass, 0.45 + f0 * 0.3);
      g.fillPoints([{ x: x0, y: t0 }, { x: x1, y: t1 }, { x: x1, y: b1 }, { x: x0, y: b0 }] as unknown as Phaser.Math.Vector2[], true);
      g.lineStyle(1, OBS.edge, 0.35 * (1 - f0)); g.lineBetween(x0, t0, x0, b0);
    }
  }
  // Floor: black glass, a polished runner up the middle.
  g.fillStyle(OBS.glass, 1); g.fillTriangle(0, H, W, H, vx, vy + 40);
  g.fillStyle(OBS.facet, 0.6); g.fillTriangle(vx - 140, H, vx + 140, H, vx, vy + 40);
  g.lineStyle(2, OCHRE, 0.35); g.lineBetween(vx - 140, H, vx - 4, vy + 40); g.lineBetween(vx + 140, H, vx + 4, vy + 40);
  // Far off: the Scale, small, and the starlight hairline above the far stair.
  greatScale(g, vx, vy + 34, 0.16, 0.12, rng, { t });
  seam(g, [{ x: vx - 2, y: vy - 120 }, { x: vx + 4, y: vy - 108 }, { x: vx - 1, y: vy - 94 }], 1, 0.9, 0.5, OBS.star);
  // Tithe stacks along the walls.
  for (let i = 0; i < 5; i++) {
    const f = 0.15 + i * 0.16, s = 1 - f;
    titheStack(g, mix(60, vx - 90, f), mix(H - 40, vy + 50, f), 4 + (i % 3), 26 * s, rng);
    titheStack(g, mix(W - 60, vx + 90, f), mix(H - 50, vy + 52, f), 5 + (i % 2), 24 * s, rng);
  }
  // Shafts of violet light, dust falling in them.
  for (const sx of [300, 560, 680]) {
    g.fillStyle(OBS.seamLit, 0.05); g.fillTriangle(sx - 20, 0, sx + 20, 0, sx + 90, H);
    g.fillStyle(OBS.seamLit, 0.03); g.fillTriangle(sx - 20, 0, sx + 90, H, sx - 40, H);
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.15 + i * 0.1) % 1;
      g.fillStyle(SANDSTONE, 0.5 * Math.sin(ph * Math.PI)); g.fillCircle(sx + ph * 70 + ((i * 17) % 30), ph * H, 1.5);
    }
  }
  // The hero, climbing in from the bottom edge.
  const hy = mix(H + 30, 470, ease(p, 0, 0.8));
  cineHero(g, vx, hy, 22, k.hero.color, { back: true, t, walk: p < 0.85 ? 1 : 0 });
  vignette(g, W, H, 0.6);
  wash(g, W, H, 0x000000, 1 - ease(t, 0, 0.8));
}

/** Shot 2: the Great Scale from low down; a stone slides off the mountain; the beam does not move. */
function scale(g: G, k: CutsceneKit): void {
  const { W, H, t, p } = k;
  const rng = k.rng();
  sky(g, 0, 0, W, H, OBS.sky, OBS.skyGlow, 16);
  for (let i = 0; i < 6; i++) shard(g, 60 + i * 170, H - 40, 120, 260 + (i % 3) * 80, (i - 3) * 6, 0.1);
  g.fillStyle(OBS.glass, 1); g.fillRect(0, H - 90, W, 90);
  const s = mix(1.02, 1.1, p);
  greatScale(g, W / 2, H - 70, s, 0.12 + Math.sin(t * 9) * 0.004 * ease(t, 1.9, 2.1) * (1 - ease(t, 2.1, 2.8)), rng, { t });
  // A tithe-stone works loose from the top of the heap and tumbles down the mountain.
  const fall = ease(t, 1.4, 2.6);
  if (t > 1.4 && t < 3.4) {
    const x = W / 2 - 330 * s - 30 * fall, y = H - 70 - 430 * s + 210 * s - 160 * s + fall * fall * 190 * s;
    g.fillStyle(dim(OCHRE, 0.35), 1); g.fillRect(x - 7, y - 5, 14, 9);
    g.fillStyle(OCHRE, 1); g.fillRect(x - 7, y - 5, 14, 3);
  }
  if (t > 2.6 && t < 3.4) {
    const q = (t - 2.6) / 0.8;
    for (let i = 0; i < 8; i++) { g.fillStyle(SANDSTONE, 0.6 * (1 - q)); g.fillCircle(W / 2 - 330 * s - 30 + (i - 4) * 8 * (1 + q * 2), H - 80 - q * 10 - (i % 2) * 4, 2); }
  }
  vignette(g, W, H, 0.55);
}

/** Shot 3: six seats in a row, and six masks turning one after another to look down the hall. */
function masks(g: G, k: CutsceneKit): void {
  const { W, H, t } = k;
  const rng = k.rng();
  sky(g, 0, 0, W, H, OBS.sky, OBS.glass, 10);
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 430, W, H - 430);
  const sigils: SeatSigil[] = ['earth', 'crystal', 'clay', 'dune', 'metal', 'ruin'];
  sigils.forEach((sg, i) => {
    const x = 110 + i * 148, y = 470;
    slab(g, x, y, 120, 20, rng, 1);
    shard(g, x - 26, y - 40, 32, 130, -7, 0.1);
    shard(g, x + 26, y - 40, 32, 136, 7, 0.12);
    shard(g, x, y - 40, 44, 210, 0, 0.3);
    g.fillStyle(OBS.facet, 1); g.fillCircle(x, y - 120, 12);
    seatSigil(g, sg, x, y - 120, 6, OCHRE, 0.9);
    // The councilor before the seat: a robed dark shape, then the mask turning.
    const turn = ease(t, 0.5 + i * 0.35, 0.95 + i * 0.35);
    g.fillStyle(dim(STRATA[i], 0.75), 1); g.fillEllipse(x, y + 10, 64, 90);
    g.fillStyle(OBS.glass, 1 - turn);
    g.fillTriangle(x - 4, y - 70, x + 14, y - 40, x - 2, y - 16);
    councilMask(g, x, y - 42, 24, { alpha: turn, glow: turn, slit: OBS.seamLit });
  });
  vignette(g, W, H, 0.5);
}

export const EARTH_BENCH_INTRO: CutsceneDef = {
  id: benchIntroId(B.id),
  shots: [
    {
      ms: 5000, enter: 'fade', draw: vault,
      lines: [{ who: 'The Ferryman', text: 'The Stone Bench. Every isle paid its weight up these stairs, one season at a time.', color: FERRY }],
      cues: [{ at: 300, sfx: 'stone-rise' }],
    },
    {
      ms: 5500, enter: 'cut', draw: scale,
      lines: [
        { who: 'The Ferryman', text: 'A mountain of tithe-stone in one pan. A single crown in the other.', color: FERRY },
        { who: 'The Ferryman', text: 'Look which way it leans.', color: FERRY },
      ],
      cues: [{ at: 1400, sfx: 'rock-throw' }, { at: 2600, sfx: 'stone-slam', shake: 0.004, ms: 300 }],
    },
    {
      ms: 4500, enter: 'cut', draw: masks,
      lines: [{ who: 'Councilor Bedwell', text: 'Underweight. Every one of them came up those stairs underweight. Step onto the scale.', color: BEDWELL }],
      cues: [
        { at: 500, sfx: 'crystal-chime' }, { at: 1200, sfx: 'crystal-chime' }, { at: 1900, sfx: 'crystal-chime' },
        { at: 2400, sfx: 'boss-intro' },
      ],
    },
  ],
};
