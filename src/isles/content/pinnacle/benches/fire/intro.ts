import type Phaser from 'phaser';
import type { CutsceneDef } from '../../../../IslesTypes';
import { cineHero, ease, sky, vignette, wash } from '../../../../art/CineArt';
import { OBS, councilMask, shard } from '../../../../art/PinnacleArt';
import { BENCHES, benchIntroId } from '../../spec';
import { EMB, councilSeat, deadFurnace, emberSeam, firstBrand, lavaFall, type Emblem } from './art';

const B = BENCHES.find((b) => b.isle === 'fire')!;
const FERRY = { who: 'The Ferryman', color: '#b8c4d8' };

/** Rising embers across the frame — the hall still breathes heat. */
function embers(g: Phaser.GameObjects.Graphics, W: number, H: number, t: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const ph = ((t * (0.05 + (i % 7) * 0.012)) + i * 0.137) % 1;
    const x = ((i * 173) % W) + Math.sin(t + i) * 18;
    const y = H - ph * (H + 40);
    g.fillStyle(i % 3 ? EMB.ember : EMB.hot, 0.7 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 1.2 + (i % 3) * 0.6);
  }
}

/**
 * The Ember Bench's arrival: the hall seen from the top of the south stair — frozen falls down
 * both walls, the cooled floor running away to the dead furnace — then the First Brand, close,
 * still red; then the six seats, and six masks turning one after another to look at you.
 */
export const BENCH_FIRE_INTRO: CutsceneDef = {
  id: benchIntroId(B.id),
  shots: [
    {
      ms: 5200,
      enter: 'fade',
      cues: [{ at: 300, sfx: 'boss-intro' }],
      lines: [{ ...FERRY, text: 'The Ember Bench. They wrote the Brand in here — the first law of all of them.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        const tilt = -ease(p) * 50;
        sky(g, 0, 0, W, H, 0x050308, 0x140a10, 16);
        const vx = W / 2, vy = 210 + tilt;
        // The floor: cooled flows running away to the furnace, ember cracks along it.
        g.fillStyle(OBS.glass, 1);
        g.fillTriangle(-200, H, W + 200, H, vx, vy);
        for (let i = 0; i < 9; i++) {
          const f = (i + 1) / 10;
          const y = vy + (H - vy) * f * f;
          const hw = (W / 2 + 200) * f * f;
          g.lineStyle(1 + f * 2, OBS.sheen, 0.25 + f * 0.2);
          g.beginPath(); g.arc(vx, y - hw * 0.25, hw * 0.6, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
        }
        for (let i = 0; i < 8; i++) {
          const f = 0.3 + rng() * 0.7, s = (rng() - 0.5) * 1.4;
          const y = vy + (H - vy) * f * f, x = vx + s * (W / 2) * f * f;
          emberSeam(g, [{ x, y }, { x: x + 40 * f, y: y + 8 * f }, { x: x + 70 * f, y: y + 4 * f }], 0.6 + f, 0.5 + 0.3 * Math.sin(t * 2 + i), 0.3);
        }
        // The dead furnace at the end of the hall, and the Brand hanging half way.
        deadFurnace(g, vx, vy + 8, 140, 110, rng);
        firstBrand(g, vx, vy + 130, 0.36, 0.7, rng);
        // Frozen falls down both walls, far to near.
        for (let i = 4; i >= 0; i--) {
          const f = 1 - i * 0.18;
          const y = vy + (H - vy) * f * f + 30;
          const off = (W / 2 + 60) * f * f;
          const hgt = 200 + 440 * f * f, wdt = 50 + 140 * f * f;
          lavaFall(g, vx - off, y, wdt, hgt, rng);
          lavaFall(g, vx + off, y, wdt, hgt, rng);
        }
        embers(g, W, H, t, 40);
        cineHero(g, W / 2, 540 - ease(p) * 30, 24, k.hero.color, { back: true, t, walk: 1 });
        vignette(g, W, H, 0.7);
      },
    },
    {
      ms: 5000,
      enter: 'cut',
      cues: [{ at: 200, sfx: 'sizzle' }, { at: 2600, sfx: 'anvil', shake: 0.003 }],
      lines: [{ ...FERRY, text: 'That is the First Brand. Every mark on Brandmark was struck off that face. Feel it? Still warm.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        sky(g, 0, 0, W, H, 0x0a0608, 0x1c0c0a, 16);
        // Shards far behind, black on darker black.
        for (let i = 0; i < 9; i++) shard(g, 40 + i * 110, H, 90, 300 + (i % 3) * 90, (i % 2 ? 1 : -1) * 20, 0.1);
        const s = 1.15 + ease(p) * 0.12;
        const heat = 0.62 + 0.12 * Math.sin(t * 2.2);
        // Its heat, breathing under the face.
        for (let i = 4; i >= 1; i--) { g.fillStyle(EMB.ember, 0.04); g.fillEllipse(W / 2, 600 - 150 * s, 260 * s * (1 + i * 0.3), 80 * s * (1 + i * 0.3)); }
        firstBrand(g, W / 2, 600 + ease(p) * 20, s, heat, rng);
        // Drips of ember off the face onto the block.
        for (let i = 0; i < 4; i++) {
          const ph = ((t * 0.5) + i / 4) % 1;
          g.fillStyle(EMB.hot, 1 - ph); g.fillCircle(W / 2 - 60 + i * 40, 600 - 106 * s + ph * 70, 3);
        }
        embers(g, W, H, t, 50);
        vignette(g, W, H, 0.8);
      },
    },
    {
      ms: 5600,
      enter: 'cut',
      cues: [{ at: 900, sfx: 'curse-cast' }, { at: 3000, sfx: 'judgement' }],
      lines: [{ who: 'Councilor Ashmund Vell', color: '#ff9a6a', text: 'A challenger. Note the hour, Clerk. Six seats, one docket — we begin at the bottom.' }],
      draw(g, k) {
        const { W, H, t } = k;
        const rng = k.rng();
        sky(g, 0, 0, W, H, 0x07050b, 0x150a0e, 16);
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 470, W, H - 470);
        g.lineStyle(1.5, OBS.edge, 0.4); g.lineBetween(0, 470, W, 470);
        const kinds: Emblem[] = ['flame', 'volcano', 'gauge', 'keg', 'corona', 'seal'];
        kinds.forEach((kind, i) => {
          const x = 110 + i * 148, y = 470 - Math.abs(i - 2.5) * 10;
          councilSeat(g, x, y, kind, B.color, rng, 1);
          // The councilor before the seat: a robed body, the head turning to the camera.
          const by = y + 62, hy = y + 28;
          g.fillStyle(0x000000, 0.4); g.fillEllipse(x, by + 22, 50, 12);
          g.fillStyle(0x1c1726, 1); g.fillCircle(x, by, 22);
          g.fillStyle(0x2a2236, 1); g.fillCircle(x - 3, by - 3, 18);
          const turn = ease(t, 0.9 + i * 0.38, 1.5 + i * 0.38);
          g.fillStyle(0x120e18, 1); g.fillCircle(x, hy, 15);
          if (turn > 0) {
            councilMask(g, x + (1 - turn) * 10, hy, 15, { alpha: turn, glow: turn, slit: turn > 0.95 ? EMB.hot : OBS.seam });
          }
        });
        embers(g, W, H, t, 30);
        // The hero small in the foreground, looking up at them.
        cineHero(g, W / 2, 590, 20, k.hero.color, { back: true, t });
        vignette(g, W, H, 0.6);
        wash(g, W, H, 0x000000, 0.25 * (1 - ease(t, 0, 0.6)));
      },
    },
  ],
};
