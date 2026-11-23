import Phaser from 'phaser';
import type { CutsceneDef } from '../../../../IslesTypes';
import { cineHero, ease, mix, sky, vignette, wash } from '../../../../art/CineArt';
import { OBS, councilMask, seam, shard } from '../../../../art/PinnacleArt';
import { mixC } from '../../../../art/IsleArt';
import { benchIntroId } from '../../spec';
import { elementGlyph, serpent, sleeper, splashRing, tideClockBase, tideClockWorks, whale } from './art';
import { SEA_HIGH, SEA_LOW, SEA_MID, STILL, TIDE, TIDE_DEEP, TIDE_LIT, TIDE_PALE } from './palette';

/**
 * The Tide Bench's intro, three shots (~15 s): the drowned chamber seen up its length with the sea
 * leaning on both window-walls and a whale going by; the Tide-Clock turning — and stopping; six
 * masks against the great north window, turning one by one to look.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);
const ELEMENTS = ['water', 'ice', 'depths', 'oil', 'ink', 'cloth'];

export const WATER_INTRO: CutsceneDef = {
  id: benchIntroId('bench-water'),
  shots: [
    // 1 — The room, up its length: a corridor of glass with the sea pressing in on both sides.
    {
      ms: 5200,
      enter: 'fade',
      cues: [{ at: 300, sfx: 'bubble' }, { at: 2600, sfx: 'heartbeat' }],
      lines: [{ who: 'The Ferryman', text: 'Mind the stairs. They go down a good deal further than the water lets you see.', color: '#c9b0ff' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        const vx = W / 2, vy = 210;
        g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
        // The window-walls: two great wedges of open sea narrowing to the far end.
        for (const side of [-1, 1]) {
          const nx = side < 0 ? 0 : W, fx = vx + side * 120;
          g.fillStyle(SEA_MID, 1); g.fillPoints([P(nx, 0), P(fx, vy - 120), P(fx, vy + 40), P(nx, H)], true);
          for (let i = 0; i < 8; i++) {
            const f = i / 8;
            g.fillStyle(mixC(SEA_HIGH, SEA_LOW, f), 0.55);
            g.fillPoints([P(nx, H * f), P(fx, vy - 120 + 160 * f), P(fx, vy - 120 + 160 * (f + 0.125)), P(nx, H * (f + 0.125))], true);
          }
          // Light shafts and kelp in the sea beyond.
          for (let i = 0; i < 3; i++) {
            const sx = nx - side * (60 + i * 70);
            g.fillStyle(TIDE_PALE, 0.05); g.fillTriangle(sx, 0, sx - side * 40, 0, sx + side * 50, H);
          }
          // Mullions converging.
          for (let i = 0; i <= 6; i++) {
            const f = i / 6;
            const tx = mix(nx, fx, f * f * 0.9 + f * 0.1), ty0 = mix(0, vy - 120, f * f * 0.9 + f * 0.1), ty1 = mix(H, vy + 40, f * f * 0.9 + f * 0.1);
            g.lineStyle(Math.max(2, 16 * (1 - f)), OBS.glass, 1); g.lineBetween(tx, ty0, tx, ty1);
            g.lineStyle(1, OBS.edge, 0.5 * (1 - f * 0.7)); g.lineBetween(tx + side * 2, ty0, tx + side * 2, ty1);
          }
        }
        // A whale going by beyond the left glass, and something long beyond the right.
        whale(g, mix(-160, 330, ease(t, 0, 6)), 210 + Math.sin(t) * 6, 1.1, 1, t, 0.75);
        serpent(g, 860 - t * 12, 120 + t * 14, 0.8, t, 0.5, 16);
        // The floor: black glass receding, tide-lines running into it toward the far end.
        g.fillStyle(OBS.glass, 1); g.fillPoints([P(130, H), P(vx - 120, vy + 40), P(vx + 120, vy + 40), P(W - 130, H)], true);
        for (let i = 0; i < 9; i++) {
          const f = (i / 9) ** 1.7;
          const y = mix(vy + 40, H, f), half = mix(120, W / 2 - 130, f);
          g.lineStyle(1, OBS.seam, 0.12 + f * 0.1); g.lineBetween(vx - half, y, vx + half, y);
        }
        for (const off of [-0.55, 0, 0.55]) {
          const pts = [];
          for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push({ x: vx + off * mix(110, 340, f) + Math.sin(f * 7 + t) * 10 * f, y: mix(vy + 40, H, f) }); }
          seam(g, pts, 1.2, 0.5, 0.3 + 0.3 * Math.sin(t * 2 + off), TIDE);
        }
        // The far end: the Tide-Clock small against the north window.
        g.fillStyle(SEA_HIGH, 1); g.fillRect(vx - 120, vy - 120, 240, 160);
        tideClockBase(g, vx, vy + 34, 0.32, rng);
        tideClockWorks(g, vx, vy + 34, 0.32, t);
        // The glass stair going down into still black water, foreground left.
        g.fillStyle(STILL, 1); g.fillPoints([P(0, 430), P(240, 470), P(170, H), P(0, H)], true);
        for (let i = 0; i < 6; i++) {
          const y = 440 + i * 26;
          g.fillStyle(mixC(OBS.facet, STILL, i / 6), 1); g.fillPoints([P(250 - i * 10, y), P(330 - i * 8, y + 6), P(320 - i * 8, y + 16), P(240 - i * 10, y + 10)], true);
          g.lineStyle(1, mixC(OBS.edge, TIDE, i / 6), 0.7 - i * 0.1); g.lineBetween(250 - i * 10, y, 330 - i * 8, y + 6);
        }
        for (let i = 0; i < 3; i++) splashRing(g, 80 + i * 50, 520 + i * 18, ((t * 0.5) + i / 3) % 1, 30, TIDE_LIT);
        // Drips falling from the dark above.
        for (let i = 0; i < 10; i++) { const y = ((t * 220 + i * 97) % 600); g.fillStyle(TIDE_LIT, 0.6); g.fillRect(140 + i * 74, y, 1.5, 7); }
        cineHero(g, vx + 20, mix(560, 470, ease(p)), 26, k.hero.color, { back: true, t, walk: 1 - ease(p, 0.8, 1) });
        vignette(g, W, H, 0.6);
        wash(g, W, H, 0x000000, 1 - ease(t, 0, 1.2));
      },
    },
    // 2 — The Tide-Clock, close: the moons of sea going round, the hand going round — then not.
    {
      ms: 5000,
      enter: 'cut',
      cues: [{ at: 0, sfx: 'clock-tick' }, { at: 800, sfx: 'clock-tick' }, { at: 1600, sfx: 'clock-tick' }, { at: 2400, sfx: 'clock-tick' }, { at: 3300, sfx: 'gear-turn', shake: 0.003 }],
      lines: [{ who: 'Councilor Neap', text: 'Every high water that ever drowned the Reach was set on this clock. To the minute. I wound it.', color: '#9ad8ff' }],
      draw(g, k) {
        const { W, H, t } = k;
        const rng = k.rng();
        sky(g, 0, 0, W, H, SEA_HIGH, SEA_LOW, 20);
        for (let i = 0; i < 5; i++) { g.fillStyle(TIDE_PALE, 0.05); g.fillTriangle(120 + i * 180, 0, 170 + i * 180, 0, 60 + i * 200, H); }
        whale(g, W - t * 40, 150, 1.6, -1, t, 0.35);
        // The north window's mullions behind it.
        for (let i = 0; i <= 4; i++) { g.fillStyle(OBS.glass, 1); g.fillRect(i * (W / 4) - 10, 0, 20, H); g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(i * (W / 4) + 10, 0, i * (W / 4) + 10, H); }
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 520, W, 120);
        const halt = ease(t, 3.2, 3.8);
        const cx = W / 2, cy = 620 + Math.sin(t * 0.4) * 3;
        tideClockBase(g, cx, cy, 1.4, rng);
        tideClockWorks(g, cx, cy, 1.4, t, halt);
        // When it stops, its water keeps going: the moons slosh, and the light dims a beat.
        if (halt > 0) wash(g, W, H, TIDE_DEEP, 0.18 * halt);
        vignette(g, W, H, 0.55);
      },
    },
    // 3 — Six masks against the window, turning one by one to look.
    {
      ms: 5200,
      enter: 'cut',
      cues: [600, 1050, 1500, 1950, 2400, 2850].map((at) => ({ at, sfx: 'crystal-chime' })),
      lines: [{ who: 'Councilor Neap', text: 'Six of us drafted the Undertow, clause by clause. You will find it very thoroughly worded.', color: '#9ad8ff' }],
      draw(g, k) {
        const { W, H, t } = k;
        const rng = k.rng();
        sky(g, 0, 0, W, H, SEA_MID, SEA_LOW, 18);
        serpent(g, 140 + t * 30, 60, 1.4, t, 0.35, 24);
        for (let i = 0; i < 40; i++) { g.fillStyle(TIDE_LIT, 0.2 + rng() * 0.3); g.fillCircle(rng() * W, rng() * 420, 0.8 + rng()); }
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 470, W, H - 470);
        for (let i = 0; i < 6; i++) {
          const x = 110 + i * 148, base = 500 + Math.abs(i - 2.5) * 14;
          // The seat behind each.
          shard(g, x, base, 70, 250, (i - 2.5) * 3, 0.25);
          g.fillStyle(TIDE, 0.08); g.fillCircle(x, base - 170, 30);
          elementGlyph(g, ELEMENTS[i], x, base - 170, 1, TIDE_LIT, 0.8);
          // The councilor: a dark robed shape, the mask at its head.
          g.fillStyle(OBS.glass, 1); g.fillPoints([P(x - 34, base + 40), P(x - 18, base - 70), P(x + 18, base - 70), P(x + 34, base + 40)], true);
          g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x + 18, base - 70, x + 34, base + 40);
          const turn = ease(t, 0.6 + i * 0.45, 0.95 + i * 0.45);
          const my = base - 86;
          if (turn < 0.5) {
            // Still in profile: a sliver of glass, its slit dark.
            const w = mix(4, 14, turn * 2);
            g.fillStyle(OBS.facet, 1); g.fillPoints([P(x - w, my - 26), P(x + w * 0.4, my - 30), P(x + w, my + 4), P(x, my + 28)], true);
            g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + w * 0.4, my - 30, x + w, my + 4);
          } else {
            councilMask(g, x, my, 26, { glow: turn, slit: mixC(OBS.seam, TIDE_LIT, 0.35) });
          }
        }
        // Sleepers drifting past the glass behind them — the drowned, gone home.
        for (let i = 0; i < 3; i++) sleeper(g, (i * 380 + t * 24) % (W + 100) - 50, 330 + i * 22, 16, t + i, { alpha: 0.35 });
        vignette(g, W, H, 0.6);
      },
    },
  ],
};
