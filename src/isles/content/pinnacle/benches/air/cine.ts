import type Phaser from 'phaser';
import type { CutsceneDef, CutsceneKit } from '../../../../IslesTypes';
import { cineHero, ease, sky, vignette } from '../../../../art/CineArt';
import { councilMask, crackPath, seam, shard, starfield, starGlow } from '../../../../art/PinnacleArt';
import { benchIntroId } from '../../spec';
import {
  CLOUD_DEEP, GALE, GALE_LIT, OBS, VOID, bannerCloth, bannerPole, breathBottle, breathMeterBody, breathMeterLive,
  cloudBank, cloudWisp, councilSeat, elementGlyph,
} from './art';
import { BENCH } from './councilors';

/**
 * `cine-bench-air` — first entry to the Gale Bench. Three shots, ~14 s:
 *  1. Out on the spire's flank: a black-glass bridge over the cloud sea, banners cracking, stars
 *     close enough to touch; the hero and the Ferryman crossing, small.
 *  2. The Breath-Meter filling the frame: bellows heaving, the anemometer turning, the needle on its
 *     stop, the racks of corked breath.
 *  3. Six seats along the span; one by one the masks turn to look.
 */

type G = Phaser.GameObjects.Graphics;
const FERRY = '#c8c0e0';

/** The Ferryman as the cinematics draw him: a tall cloaked shape, a hood, a lantern of violet. */
function ferryman(g: G, x: number, y: number, s: number, t: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 30 * s, 7 * s);
  g.fillStyle(0x1a1626, 1);
  g.fillTriangle(x - 14 * s, y, x + 14 * s, y, x, y - 52 * s);
  g.fillStyle(0x2a2440, 1); g.fillTriangle(x, y, x + 14 * s, y, x, y - 52 * s);
  g.fillStyle(0x1a1626, 1); g.fillCircle(x, y - 50 * s, 9 * s);
  g.fillStyle(0x000000, 1); g.fillCircle(x + 2 * s, y - 49 * s, 5.5 * s);
  g.lineStyle(1.5 * s, 0x6a6080, 1); g.lineBetween(x + 12 * s, y - 34 * s, x + 18 * s, y - 20 * s);
  const sw = Math.sin(t * 2) * 2 * s;
  g.fillStyle(OBS.seam, 0.2); g.fillCircle(x + 18 * s + sw, y - 16 * s, 10 * s);
  g.fillStyle(OBS.seamLit, 1); g.fillRect(x + 15 * s + sw, y - 20 * s, 6 * s, 8 * s);
}

/** The night outside the spire, with stars close and the cloud sea below `cloudY`. */
function night(g: G, k: CutsceneKit, cloudY: number, drift: number): void {
  sky(g, 0, 0, k.W, k.H, OBS.sky, OBS.skyGlow, 24);
  starfield(g, 0, 0, k.W, cloudY, k.rng(), 160, k.T);
  // Stars close overhead: a few big ones, near enough to have rays.
  starGlow(g, 140, 90, 3, k.T, 0.35);
  starGlow(g, 760, 70, 2.5, k.T + 1, 0.3);
  starGlow(g, 520, 140, 2, k.T + 2, 0.25);
  g.fillStyle(VOID, 1); g.fillRect(0, cloudY, k.W, k.H - cloudY);
  const rng = k.rng();
  for (let row = 0; row < 4; row++) {
    const y = cloudY + 10 + row * 46;
    for (let x = -120; x < k.W + 160; x += 120) {
      const ox = ((x + drift * (0.4 + row * 0.25)) % (k.W + 240)) - 120;
      cloudBank(g, ox, y + 30, 160 + rng() * 60, 50 + row * 10, rng, 0.75 + row * 0.08);
    }
  }
}

export const AIR_CINE: CutsceneDef = {
  id: benchIntroId(BENCH.id),
  shots: [
    {
      ms: 5200,
      enter: 'fade',
      cues: [{ at: 300, sfx: 'gust' }, { at: 2600, sfx: 'whoosh' }],
      lines: [{ who: 'The Ferryman', text: 'Mind the rail. Out here there is nothing under the spire but cloud — and under the cloud, the sea.', color: FERRY }],
      draw(g, k) {
        // The camera rises up the flank as the shot goes on.
        const lift = ease(k.p) * 60;
        night(g, k, 420 + lift, k.T * 30);
        // Shards climbing out of the cloud on both sides; the spire's wall at the left.
        shard(g, 60, 640, 200, 620 + lift, 30, 0.3);
        shard(g, 170, 640, 120, 420 + lift, 10, 0.15);
        shard(g, 880, 640, 170, 520 + lift, -24, 0.25);
        shard(g, 790, 640, 90, 300 + lift, -8, 0.1);
        seam(g, crackPath({ x: 70, y: 600 }, { x: 90, y: 80 }, k.rng(), 12, 9), 2, 0.8, 0.5 + 0.5 * Math.sin(k.T * 1.4));
        // The bridge: a black glass span from shard to shard, rails of balusters, banners on poles.
        const by = 400 + lift;
        g.fillStyle(OBS.glass, 1); g.fillRect(150, by, 680, 22);
        g.fillStyle(OBS.facet, 1); g.fillRect(150, by, 680, 6);
        g.lineStyle(1.5, OBS.edge, 0.85); g.lineBetween(150, by, 830, by);
        g.fillStyle(OBS.glass, 1); g.fillTriangle(320, by + 22, 660, by + 22, 490, by + 90);
        for (let x = 160; x < 830; x += 22) { g.fillStyle(OBS.sheen, 1); g.fillRect(x, by - 18, 3, 18); }
        g.lineStyle(2, OBS.edge, 0.8); g.lineBetween(150, by - 18, 830, by - 18);
        g.lineStyle(1, GALE, 0.45); g.lineBetween(150, by + 11, 830, by + 11);
        for (const [px, dir, sd] of [[250, 1, 0], [480, 1, 2], [720, 1, 4]] as [number, number, number][]) {
          bannerPole(g, px, by, 110);
          bannerCloth(g, px, by - 110, 90, 30, k.T + sd, dir, sd);
        }
        // The hero and the Ferryman crossing, small against all of it.
        const hx = 230 + ease(k.p) * 260;
        ferryman(g, hx - 50, by - 2, 0.75, k.T);
        cineHero(g, hx, by - 14, 12, k.hero.color, { face: 1, t: k.T, walk: 1 });
        // Wisps of cloud tearing past in front.
        for (let i = 0; i < 4; i++) {
          const x = ((k.T * 140 + i * 300) % 1300) - 200;
          cloudWisp(g, x, 470 + lift + i * 34, 260, 22, 0.8);
        }
        vignette(g, k.W, k.H, 0.5);
      },
    },
    {
      ms: 5200,
      enter: 'cut',
      cues: [{ at: 200, sfx: 'gear-turn' }, { at: 1600, sfx: 'gust' }, { at: 3600, sfx: 'clock-tick' }],
      lines: [
        { text: 'The Breath-Meter. Every breath drawn on Highspire was counted on its dial — and owed.' },
        { who: 'Councilor Aurelian Sough', text: 'Fourteen hundred thousand breaths a day, and not once did we lose the count.', color: '#c9b0ff' },
      ],
      draw(g, k) {
        sky(g, 0, 0, k.W, k.H, OBS.sky, CLOUD_DEEP, 20);
        starfield(g, 0, 0, k.W, k.H * 0.6, k.rng(), 90, k.T);
        // A slow push in on the Meter: it grows to fill the frame.
        const s = 0.95 + ease(k.p) * 0.25;
        const x = k.W / 2, y = 600 + ease(k.p) * 30;
        g.fillStyle(GALE, 0.04); g.fillCircle(x, y - 200 * s, 300 * s);
        breathMeterBody(g, x, y, k.rng(), s);
        breathMeterLive(g, x, y, k.T, s, 1);
        // Racks of bottled breath in the foreground, glowing.
        for (let i = 0; i < 7; i++) breathBottle(g, 40 + i * 26, 620, 1.1, k.T, 0.5 + (i % 3) * 0.2, i);
        for (let i = 0; i < 7; i++) breathBottle(g, k.W - 40 - i * 26, 620, 1.1, k.T, 0.4 + (i % 4) * 0.15, i + 9);
        vignette(g, k.W, k.H, 0.55);
      },
    },
    {
      ms: 4800,
      enter: 'cut',
      cues: [{ at: 300, sfx: 'hush' }, { at: 4000, sfx: 'judgement', shake: 0.004 }],
      lines: [{ who: 'The Ferryman', text: 'Six of them. Every breath on that isle was a clause one of them wrote.', color: FERRY }],
      draw(g, k) {
        night(g, k, 360, k.T * 20);
        // The upper span, seen low and straight on; six seats in a row, the masks before them.
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 470, k.W, 170);
        g.fillStyle(OBS.facet, 0.7); g.fillRect(0, 470, k.W, 10);
        g.lineStyle(1.5, OBS.edge, 0.8); g.lineBetween(0, 470, k.W, 470);
        for (let x = 0; x < k.W; x += 60) { g.lineStyle(1, OBS.seam, 0.2); g.lineBetween(x, 480, x - 80, 640); }
        const rng = k.rng();
        BENCH.elements.forEach((el, i) => {
          const sx = 90 + i * 156;
          councilSeat(g, sx, 500, 0.62, el, rng);
          // The councilor: a dark robe; the mask turns from edge-on to full face, one after another.
          const turn = ease(k.p, 0.12 + i * 0.1, 0.3 + i * 0.1);
          g.fillStyle(0x15111f, 1); g.fillTriangle(sx - 26, 560, sx + 26, 560, sx, 470);
          g.fillStyle(0x221c34, 1); g.fillTriangle(sx, 560, sx + 26, 560, sx, 470);
          g.save();
          g.translateCanvas(sx, 466);
          g.scaleCanvas(0.12 + turn * 0.88, 1);
          councilMask(g, 0, 0, 20, { glow: turn, slit: turn > 0.6 ? OBS.seam : OBS.glass });
          g.restore();
          if (turn > 0.95) { g.fillStyle(OBS.seam, 0.12); g.fillCircle(sx, 462, 34); }
          elementGlyph(g, sx, 590, 8, el, GALE, 0.3 + turn * 0.6);
        });
        g.fillStyle(GALE_LIT, 0.05 * (1 - k.p)); g.fillRect(0, 0, k.W, k.H);
        vignette(g, k.W, k.H, 0.55);
      },
    },
  ],
};
