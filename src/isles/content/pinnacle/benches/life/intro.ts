import type { CutsceneDef, CutsceneKit } from '../../../../IslesTypes';
import type Phaser from 'phaser';
import { OBS, councilMask, crackPath, seam, shard, starGlow, starfield } from '../../../../art/PinnacleArt';
import { cineHero, ease, mix, sky, vignette, wash } from '../../../../art/CineArt';
import { benchIntroId } from '../../spec';
import { GREEN, bellJar, glassLeaf, obsidianTree, pruningShears, sapling, seatGlyph, vine } from './art';

/**
 * The Thorn Bench's intro: the hothouse of black glass seen from the top of the stair, the
 * Shears hung open over the kept sapling, and six masks in the dark turning to look.
 */

type G = Phaser.GameObjects.Graphics;
const ELEMENTS = ['life', 'growth', 'gluttony', 'hunt', 'marrow', 'gum'];

/** Petals and green motes drifting through a shot (screen space). */
function drift(g: G, k: CutsceneKit, n: number): void {
  for (let i = 0; i < n; i++) {
    const sp = 18 + (i % 7) * 6;
    const x = ((i * 137.7 + k.T * sp) % (k.W + 40)) - 20;
    const y = ((i * 89.3 + k.T * (24 + (i % 5) * 8)) % (k.H + 40)) - 20;
    const sw = Math.sin(k.T * 1.6 + i) * 8;
    if (i % 3 === 0) { g.fillStyle(GREEN.glow, 0.5); g.fillCircle(x + sw, y, 1.4); }
    else { g.fillStyle(GREEN.petal, 0.75); g.fillEllipse(x + sw, y, 5, 3); }
  }
}

/** Shot 1 — the room: a nave of obsidian ribs, glass trees in rows, roots splitting the floor. */
function room(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const { W, H } = k;
  const lift = ease(k.p, 0, 1) * 120;
  sky(g, 0, 0, W, H, OBS.sky, OBS.skyGlow, 20);
  starfield(g, 0, 0, W, H * 0.55, rng, 140, k.T);
  // Ribs of the hothouse arching overhead, converging on a far vanishing point.
  const vx = W / 2, vy = 150 + lift * 0.4;
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    const x = mix(-120, W + 120, f);
    g.lineStyle(10 - Math.abs(f - 0.5) * 8, OBS.glass, 1); g.lineBetween(x, H + 40, vx + (x - vx) * 0.12, vy);
    g.lineStyle(1.2, OBS.edge, 0.5); g.lineBetween(x + 3, H + 40, vx + (x - vx) * 0.12 + 1, vy);
  }
  // The floor: black glass toward the viewer, with green-lit splits running back.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 380 + lift * 0.3, W, H);
  for (let i = 0; i < 12; i++) {
    const x0 = rng() * W;
    seam(g, crackPath({ x: x0, y: H }, { x: vx + (x0 - vx) * 0.3, y: 400 + lift * 0.3 }, rng, 14, 6), 1.4, 0.7, 0.3 + 0.3 * Math.sin(k.T * 2 + i), i % 2 ? GREEN.glow : OBS.seam);
  }
  // Two rows of glass trees receding.
  for (let r = 4; r >= 0; r--) {
    const s = 0.45 + r * 0.22;
    const y = 400 + lift * 0.3 + r * 52;
    obsidianTree(g, vx - 140 - r * 120, y, s, rng, { lean: 8, vines: 1 });
    obsidianTree(g, vx + 140 + r * 120, y, s, rng, { lean: -8, vines: 1 });
  }
  // Glints: the leaves chiming.
  for (let i = 0; i < 30; i++) {
    const x = rng() * W, y = 160 + rng() * 300 + lift * 0.3;
    const tw = Math.sin(k.T * (1 + rng() * 2) + i);
    if (tw > 0.7) { g.fillStyle(0xffffff, (tw - 0.7) * 3); g.fillCircle(x, y, 1.6); }
  }
  // Vines in the foreground, real and green.
  vine(g, [{ x: -10, y: H - 70 }, { x: 120, y: H - 110 }, { x: 240, y: H - 90 }, { x: 330, y: H - 130 }], 4, rng, { leaves: 20, bloom: 0.3 });
  vine(g, [{ x: W + 10, y: H - 60 }, { x: W - 140, y: H - 120 }, { x: W - 260, y: H - 96 }], 4, rng, { leaves: 20, bloom: 0.3 });
  for (let i = 0; i < 10; i++) glassLeaf(g, 200 + rng() * 560, H - 90 + rng() * 30, rng() * 6.28, 12, 0.5);
  cineHero(g, W / 2, H - 100 - k.p * 40, 22, k.hero.color, { back: true, t: k.T, walk: 1 });
  drift(g, k, 40);
  vignette(g, W, H, 0.6);
  wash(g, W, H, 0x000000, 1 - ease(k.t, 0, 1.2));
}

/** Shot 2 — the set piece: the Shears overhead, tilting down to the jar and the sapling in it. */
function shears(g: G, k: CutsceneKit): void {
  const { W, H } = k;
  const tilt = ease(k.p, 0.05, 0.85);
  const oy = mix(260, -40, tilt);
  sky(g, 0, 0, W, H, OBS.sky, 0x0c1a10, 16);
  // A crack of starlight high in the ceiling: the only warm light.
  starGlow(g, W / 2 + 160, 40 + oy - 260, 5, k.T, 0.5);
  // The shears: they ease a fraction wider, as if remembering.
  const open = 0.78 + Math.sin(k.T * 0.8) * 0.03 + ease(k.p, 0.6, 1) * 0.04;
  pruningShears(g, W / 2, 330 + oy, 1.55, open, { glow: 0.8, t: k.T });
  // The dais and the jar beneath.
  const jy = 600 + oy;
  for (let i = 0; i < 3; i++) {
    const r = 170 - i * 40;
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillEllipse(W / 2, jy - i * 18, r * 2, r * 0.6);
    g.lineStyle(1.2, OBS.edge, 0.6); g.strokeEllipse(W / 2, jy - i * 18, r * 2, r * 0.6);
  }
  sapling(g, W / 2, jy - 46, 2, k.T, 0);
  bellJar(g, W / 2, jy - 42, 70, 200, { tint: 0xd8f0ff });
  // Roots straining up round the dais.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x0 = W / 2 + s * (200 + i * 90);
      vine(g, [{ x: x0, y: H + 10 }, { x: x0 - s * 30, y: jy + 20 }, { x: x0 - s * 70, y: jy - 10 - i * 10 }], 3.2, k.rng(), { leaves: 16, bloom: 0.2 });
    }
  }
  drift(g, k, 26);
  vignette(g, W, H, 0.65);
}

/** Shot 3 — the six: masks in the dark before six seats, turning one by one, slits lighting green. */
function masks(g: G, k: CutsceneKit): void {
  const { W, H } = k;
  const rng = k.rng();
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const row = i < 3 ? 0 : 1;
    const col = i % 3;
    const x = 200 + col * 280 + (row ? 0 : 0);
    const y = row ? 470 : 300;
    const s = row ? 1 : 0.8;
    // The seat behind.
    shard(g, x, y + 30 * s, 70 * s, 220 * s, 0, 0.2);
    shard(g, x - 46 * s, y + 30 * s, 40 * s, 130 * s, -10 * s, 0.1);
    shard(g, x + 46 * s, y + 30 * s, 40 * s, 136 * s, 10 * s, 0.1);
    seatGlyph(g, ELEMENTS[i], x, y - 130 * s, 14 * s, GREEN.glow, 0.5 + 0.4 * ease(k.p, 0.2, 0.8));
    // The councilor: a robed dark shape; the head turns from away to facing us.
    const turn = ease(k.t, 0.6 + i * 0.35, 1.3 + i * 0.35);
    g.fillStyle(0x0a0810, 1); g.fillEllipse(x, y + 20 * s, 90 * s, 120 * s);
    g.fillStyle(0x0a0810, 1); g.fillCircle(x, y - 46 * s, 30 * s);
    g.lineStyle(1, OBS.edge, 0.3); g.strokeEllipse(x, y + 20 * s, 90 * s, 120 * s);
    if (turn > 0) {
      const mx = x + (1 - turn) * 18 * s;
      councilMask(g, mx, y - 46 * s, 30 * s, { alpha: turn, slit: GREEN.vine, glow: turn });
      if (turn > 0.95) { g.fillStyle(GREEN.glow, 0.15); g.fillCircle(mx, y - 52 * s, 50 * s); }
    }
  }
  // Vines across the bottom, alive, in the near dark.
  vine(g, [{ x: -10, y: H - 70 }, { x: 300, y: H - 100 }, { x: 640, y: H - 80 }, { x: W + 10, y: H - 110 }], 3, rng, { leaves: 22, bloom: 0.2 });
  drift(g, k, 18);
  vignette(g, W, H, 0.7);
}

export const BENCH_LIFE_INTRO: CutsceneDef = {
  id: benchIntroId('bench-life'),
  shots: [
    {
      ms: 5200, draw: room, enter: 'fade',
      cues: [{ at: 300, sfx: 'crystal-chime' }, { at: 2600, sfx: 'crystal-chime' }],
      lines: [{ who: 'The Ferryman', text: 'A garden. Of course it is a garden. Everything up here is something he took and kept.' }],
    },
    {
      ms: 5600, draw: shears, enter: 'cut',
      cues: [{ at: 400, sfx: 'gear-turn' }, { at: 3600, sfx: 'heartbeat' }],
      lines: [{ who: 'The Ferryman', text: 'Those Shears cut the Pruning into law. That, under the glass, is the one thing they ever spared.' }],
    },
    {
      ms: 4800, draw: masks, enter: 'cut',
      cues: [{ at: 700, sfx: 'hush' }, { at: 2400, sfx: 'curse-cast' }],
      lines: [{ who: 'Councilor Amaranth Vell', text: 'A visitor. Not pruned. Not kept. How very untidy.', color: '#b8ffb0' }],
    },
  ],
};
