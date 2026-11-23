import Phaser from 'phaser';
import type { CutsceneDef } from '../../../IslesTypes';
import { ease, mix, sky, sea, vignette, cineHero, boat, crowd } from '../../../art/CineArt';
import { OBS, drawPinnacle, shard, slab, seam, starfield } from '../../../art/PinnacleArt';
import { ISLES, P, ferryman, glassRain, lantern, shardRow, shingle, wanderer, wreck } from './art';

/**
 * `cine-landfall` — first arrival at Glasswater Landing. The crossing ends where the sea turns to
 * glass; the spire fills the sky; the ten boats of the Muster run up on black shingle among the
 * wrecks of every challenger who came before; the Ferryman says what he has never said; and the
 * first stair goes up into the dark.
 */

type G = Phaser.GameObjects.Graphics;

/** A camp tent with a fire before it — the Muster settling in along the stair's foot. */
function camp(g: G, x: number, y: number, s: number, col: number, t: number): void {
  const fl = 0.8 + 0.2 * Math.sin(t * 12 + x);
  g.fillStyle(0xffa040, 0.1 * fl); g.fillCircle(x + 26 * s, y - 4 * s, 34 * s);
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2 * s, 60 * s, 8 * s);
  g.fillStyle(col, 1); g.fillTriangle(x - 26 * s, y, x + 22 * s, y, x - 4 * s, y - 34 * s);
  g.fillStyle(0x000000, 0.3); g.fillTriangle(x - 26 * s, y, x - 4 * s, y, x - 4 * s, y - 34 * s);
  g.fillStyle(0x140e10, 1); g.fillTriangle(x - 2 * s, y, x + 8 * s, y, x - 2 * s, y - 18 * s);
  g.fillStyle(0xff8a30, fl); g.fillTriangle(x + 20 * s, y, x + 32 * s, y, x + 26 * s + Math.sin(t * 14) * 2 * s, y - 14 * s);
  g.fillStyle(0xffe0a0, fl); g.fillTriangle(x + 23 * s, y, x + 29 * s, y, x + 26 * s, y - 7 * s);
}

export const CINE_LANDFALL: CutsceneDef = {
  id: 'cine-landfall',
  music: 'title',
  shots: [
    // 1 — The approach, from behind the hero in the skiff's bow: the spire fills the sky.
    {
      ms: 8000,
      cues: [{ at: 2400, sfx: 'crystal-chime' }, { at: 5200, sfx: 'crystal-chime' }, { at: 6800, sfx: 'splash' }],
      lines: [{ text: 'The last crossing ended where the sea stopped being water.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const near = ease(p);
        sky(g, 0, 0, W, 480, 0x05040a, 0x2a1c40, 24);
        starfield(g, 0, 0, W, 300, r, 70, t);
        drawPinnacle(g, 520, 470, mix(560, 780, near), { t, lit: 0 });
        shardRow(g, 40, 900, 474, 14, 20, 70, r);
        // The sea: water near the boat, black glass toward the spire.
        sea(g, W, 470, H, t * (1 - near * 0.6), 0x0b0f22, 0x6a6a9a, near * 0.7);
        g.fillStyle(OBS.sea, 0.9); g.fillRect(0, 470, W, 22 + near * 40);
        g.lineStyle(1, OBS.edge, 0.25);
        for (let i = 0; i < 5; i++) g.lineBetween(0, 474 + i * (5 + near * 8), W, 474 + i * (5 + near * 8));
        // Black-glass teeth breaking the surface, sliding past as we close.
        for (let i = 0; i < 5; i++) {
          const side = i % 2 ? 1 : -1;
          const f = (r() + near * 0.6) % 1;
          const x = 480 + side * (120 + f * f * 520);
          const y = 490 + f * 90;
          const h = 20 + f * 90;
          shard(g, x, y, h * 0.5, h, side * h * 0.2, 0.2);
          g.fillStyle(0xffffff, 0.18); g.fillEllipse(x, y + 2, h * 0.8, 4);
        }
        glassRain(g, W, 60, H, t, r, 60, 0.8);
        // The skiff's bow under us, its lamp, and the hero looking up.
        const rock = Math.sin(t * 1.4) * 4;
        g.fillStyle(0x2a1e18, 1);
        g.fillPoints([P(330, H), P(462, 552 + rock), P(492, 536 + rock), P(520, 552 + rock), P(640, H)], true);
        g.fillStyle(0x4a3628, 1);
        g.fillPoints([P(462, 552 + rock), P(492, 536 + rock), P(520, 552 + rock), P(498, 556 + rock)], true);
        g.lineStyle(2, 0x8a6a4a, 0.7); g.lineBetween(330, H, 462, 552 + rock); g.lineBetween(520, 552 + rock, 640, H);
        g.lineStyle(3, 0x3a2a20, 1); g.lineBetween(492, 540 + rock, 508, 460 + rock);
        lantern(g, 516 + Math.sin(t * 1.9) * 3, 476 + rock, 1.3, t, 1);
        cineHero(g, 410, 552 + rock * 0.5, 34, k.hero.color, { back: true, t });
        vignette(g, W, H, 0.6);
      },
    },
    // 2 — The fleet grounding on glass shingle among the wrecks of older boats.
    {
      ms: 9500,
      enter: 'cut',
      cues: [
        ...ISLES.map((_, i) => ({ at: Math.round((2.2 + i * 0.45) * 1000), sfx: i % 3 === 0 ? 'land' : 'crystal-chime' })),
        { at: 3000, sfx: 'clang' },
      ],
      lines: [
        { text: 'Ten boats ran up on shingle that rang like broken bottles.' },
        { who: 'Tamsin Coalwhistle', color: '#ffb04a', text: 'Mind your feet, all of you. It\'s edges all the way up.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t } = k;
        sky(g, 0, 0, W, 420, 0x07060d, 0x2a1c40, 22);
        starfield(g, 0, 0, W, 260, r, 60, t);
        drawPinnacle(g, 740, 430, 1300, { t, lit: 0 });
        sea(g, W, 404, 470, t, 0x0b0f22, 0x6a6a9a, 0.5);
        shingle(g, 0, 468, W, H - 468, r, t, 150);
        wreck(g, 860, 500, 0.9, 0x8a6a8a, 0.18, t);
        wreck(g, 90, 560, 1.1, 0x6a8a8a, -0.12, t);
        // The boats run in from the left and nose up onto the shingle.
        for (let i = 0; i < 10; i++) {
          const t0 = 0.3 + i * 0.45;
          const go = ease(t, t0, t0 + 2.1);
          const ground = ease(t, t0 + 1.6, t0 + 2.2);
          const tx = 70 + i * 84;
          const x = mix(-160, tx, go);
          const y = mix(452, 478 + (i % 2) * 6, ground);
          const tilt = ground * 0.06;
          // Aboard until grounded, then over the side and onto the glass.
          const off = ease(t, t0 + 2.4, t0 + 3.0);
          const hop = Math.sin(off * Math.PI) * 18;
          const wx = mix(x - 6, tx + 14, off), wy = mix(y - 8, 530 + (i % 3) * 16, off);
          if (off < 1) wanderer(g, i, wx, wy, off > 0 ? 0.9 : 0.5, t, { hop, face: 1 });
          g.fillStyle(0xffffff, 0.2 * (go - ground)); g.fillEllipse(x - 30, y + 4, 60, 4);
          boat(g, x, y, 0.75, 0x3a2c22, ISLES[i].col, t + tilt, 1);
        }
        // Everyone ashore, in front of the hulls.
        for (let i = 0; i < 10; i++) {
          const off = ease(t, 0.3 + i * 0.45 + 2.4, 0.3 + i * 0.45 + 3.0);
          if (off >= 1) wanderer(g, i, 70 + i * 84 + 14, 530 + (i % 3) * 16, 0.9, t, { face: i < 5 ? 1 : -1, wave: i === 0 && k.line === 1 ? 1 : 0 });
        }
        glassRain(g, W, 60, H, t, r, 50, 0.7);
        vignette(g, W, H, 0.5);
      },
    },
    // 3 — The Ferryman among the wrecks: he has done this before.
    {
      ms: 10000,
      cues: [{ at: 1200, sfx: 'crystal-chime' }, { at: 7000, sfx: 'heartbeat' }],
      lines: [
        { who: 'The Ferryman', text: 'I\'ve rowed challengers here before. Every one of them, to this beach.' },
        { who: 'The Ferryman', text: 'These are their boats.' },
        { who: 'The Ferryman', text: 'Never rowed one back. Go on, then. There is always a last one.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const push = ease(p);
        sky(g, 0, 0, W, 450, 0x06050b, 0x261a38, 22);
        starfield(g, 0, 0, W, 240, r, 50, t);
        drawPinnacle(g, 790, 440, 980, { t, lit: 0 });
        sea(g, W, 420, 452, t, 0x0b0f22, 0x5a5a8a, 0.7);
        shingle(g, 0, 448, W, H - 448, r, t, 120);
        // The graveyard of boats, running away along the shore, sails faded to ghosts.
        const sails = [0x8a6a6a, 0x6a7a8a, 0x7a8a6a, 0x8a7a5a, 0x6a6a8a, 0x8a6a8a, 0x5a7a7a];
        for (let i = 0; i < 7; i++) {
          const f = i / 6;
          wreck(g, mix(110, 600, f) + push * 10 * (1 - f), mix(462, 520, 1 - f), mix(0.32, 0.9, 1 - f) * (1 + push * 0.05), sails[i], (i % 2 ? 0.14 : -0.1), t);
        }
        // His skiff drawn up behind him.
        g.fillStyle(0x2a1e18, 1);
        g.fillPoints([P(600, 470), P(720, 468), P(752, 444), P(740, 474), P(712, 488), P(612, 488)], true);
        g.lineStyle(1.4, 0x8a6a4a, 0.7); g.lineBetween(600, 470, 720, 468); g.lineBetween(720, 468, 752, 444);
        // The man himself, close, in his own lantern-light.
        const s = mix(3.2, 3.5, push);
        g.fillStyle(0xffb050, 0.05); g.fillCircle(340, 400, 260);
        ferryman(g, 300 - push * 10, 600, s, t, { face: 1, lamp: 1 });
        glassRain(g, W, 60, H, t, r, 36, 0.6);
        vignette(g, W, H, 0.6);
      },
    },
    // 4 — The first stair: the hero at its foot, the Muster's camp fires on either side.
    {
      ms: 7500,
      cues: [{ at: 800, sfx: 'stone-rise' }, { at: 4200, sfx: 'beam-charge' }],
      lines: [{ text: 'Ten benches. Sixty seats. One throne. The stair began here.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const rise = ease(p) * 40;
        sky(g, 0, 0, W, H, 0x05040a, 0x1e1430, 18);
        starfield(g, 0, 0, W, 200, r, 50, t);
        drawPinnacle(g, 480, 640 + rise, 1500, { t, lit: 0 });
        // The doorway the stair climbs to: a dark slot outlined in violet.
        const dy = 168 + rise;
        g.fillStyle(0x000000, 1); g.fillPoints([P(452, dy + 70), P(452, dy + 10), P(480, dy - 14), P(508, dy + 10), P(508, dy + 70)], true);
        seam(g, [{ x: 452, y: dy + 70 }, { x: 452, y: dy + 10 }, { x: 480, y: dy - 14 }, { x: 508, y: dy + 10 }, { x: 508, y: dy + 70 }], 1.6, 0.9, 0.5 + 0.5 * Math.sin(t * 2));
        // The stair, step on step, narrowing as it climbs.
        for (let i = 11; i >= 0; i--) {
          const y = 560 - i * 30 + rise;
          slab(g, 480, y, 300 - i * 20, 20, r, i % 4 === 1 ? 1 : 0);
        }
        // The Muster's camp along the stair-foot, fires lit.
        shingle(g, 0, 540 + rise, 300, 120, r, t, 50);
        shingle(g, 660, 540 + rise, 300, 120, r, t, 50);
        camp(g, 90, 552 + rise, 1, 0x8a4a2a, t);
        camp(g, 200, 520 + rise, 0.7, 0x4a6a8a, t);
        camp(g, 790, 548 + rise, 1, 0x6a3a7a, t);
        camp(g, 900, 516 + rise, 0.7, 0x4a6a3a, t);
        crowd(g, 30, 250, 572 + rise, 4, 6, [ISLES[0].col, ISLES[2].col, ISLES[4].col, ISLES[6].col], t);
        crowd(g, 720, 940, 572 + rise, 4, 6, [ISLES[1].col, ISLES[3].col, ISLES[7].col, ISLES[9].col], t);
        // The hero at the foot of it, looking up.
        cineHero(g, 480, 540, 24, k.hero.color, { back: true, t, walk: p > 0.6 ? 1 : 0 });
        g.fillStyle(OBS.seam, 0.05 + 0.03 * Math.sin(t * 2)); g.fillRect(0, 0, W, H);
        vignette(g, W, H, 0.6);
      },
    },
  ],
};
