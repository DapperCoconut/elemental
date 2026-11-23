import type { CutsceneDef } from '../../../IslesTypes';
import { cineHero, ease, mix, mixC, sea, sky, vignette, wash } from '../../../art/CineArt';
import { starfield } from '../../../art/PinnacleArt';
import { ISLES, ferryman, gull, isle, skiff, sunDisc } from '../../pinnacle/cine/art';
import { CROWN_COLS, MOOD, cinder, crownGlyph } from '../art';
import { CINE_FALL_END } from '../spec';
import { ashDrift, ladle, reef } from './art';

/**
 * `cine-fall-end` — the appeal dismissed, and the true ending. The cinder goes grey, then dark; the
 * Fall lets go of the isles like a held breath, crown by crown; the gap in the Ladle turns out to
 * have a star in it after all; the Ferryman rows the player home under a whole sky; first light on
 * Emberport; the narrator's last line. No stinger — this time it does not ask.
 */
export const CINE_FALL_END_DEF: CutsceneDef = {
  id: CINE_FALL_END,
  music: 'title',
  shots: [
    // 1 — Grey, then dark.
    {
      ms: 10500,
      cues: [{ at: 600, sfx: 'hush' }, { at: 5200, sfx: 'heartbeat' }, { at: 7400, sfx: 'smoke' }],
      lines: [
        { who: 'The Fallen King', text: 'Dismissed. On the law, too. I had not thought it could be done on the law.' },
        { who: 'The Fallen King', text: 'Thank you for hearing all of it. Nobody ever heard all of it. Goodnight.' },
        { text: 'The cinder went grey, and then it went dark, and this time it stayed dark.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const ash = ease(p, 0.35, 0.9);
        sky(g, 0, 0, W, 300, 0x07060e, mixC(0x2a1a14, 0x0c0e18, ash), 16);
        starfield(g, 0, 0, W, 280, r, 80, t);
        sky(g, 0, 290, W, H - 290, 0x1a2418, 0x0c100c, 12);
        g.fillStyle(MOOD.open.wash, 0.1 * (1 - ash)); g.fillEllipse(480, 430, 700, 360);
        cinder(g, 480, 560, 3.6, { mood: 'open', t, keys: 1, turned: 1, split: 1, king: 1 - ease(p, 0.55, 0.85), sitUp: 0.4, ash });
        ashDrift(g, W, H, t, k.rng(), 60, 0.6 * (1 - ash), 0.4 + ash * 0.6);
        vignette(g, W, H, 0.6);
      },
    },
    // 2 — The Fall lets go of the isles, crown by crown, like a breath let out.
    {
      ms: 9500,
      enter: 'cut',
      cues: [...ISLES.map((_, i) => ({ at: 600 + i * 560, sfx: 'hush' })), { at: 6800, sfx: 'holy-chord' }],
      lines: [
        { text: 'And the Fall let go of the isles, the way you let go of a breath you had not known you were holding.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t } = k;
        const dawn = ease(t, 5.6, 9.0);
        sky(g, 0, 0, W, 380, mixC(0x050308, 0x2a3a6a, dawn), mixC(0x1a0c10, 0xffb080, dawn), 22);
        starfield(g, 0, 0, W, 340 - dawn * 160, r, 120, t);
        sea(g, W, 380, H, t, mixC(0x08060c, 0x1a2a4a, dawn), mixC(0x3a1a20, 0xffc8a0, dawn), 0.7);
        for (let i = 0; i < 10; i++) {
          const x = 60 + i * 93, y = 386 - (i % 2) * 6;
          const out = ease(t, 0.6 + i * 0.56, 1.1 + i * 0.56);
          const col = CROWN_COLS[i];
          isle(g, i, x, y, 0.34 + (i % 3) * 0.04, mixC(0x0a0810, mixC(col, 0x000000, 0.6), 0.25 + 0.25 * dawn), 1, out);
          crownGlyph(g, x, y - 60 - (i % 3) * 6, 1.4, col, 1 - out, t);
          // As each crown goes out, a beat of the isle's own colour rises off it and away.
          if (out > 0 && out < 1) { g.fillStyle(col, 0.3 * (1 - out)); g.fillCircle(x, y - 60 - out * 120, 6 + out * 20); }
        }
        vignette(g, W, H, 0.5);
      },
    },
    // 3 — The Ladle, whole.
    {
      ms: 8000,
      enter: 'cut',
      cues: [{ at: 1400, sfx: 'sparkle' }, { at: 4200, sfx: 'crystal-chime' }],
      lines: [
        { text: 'Where the gap had been, there was a star. There had always been a star.' },
        { text: 'The cinder had only been lying in front of it.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, H, 0x02040c, 0x0e1a34, 24);
        starfield(g, 0, 0, W, H, r, 220, t);
        g.fillStyle(0x8a9ac8, 0.04); g.fillEllipse(480, 260, 1200, 160);
        const s = mix(2.6, 3.0, ease(p));
        ladle(g, 300, 160, s, t, 1 - ease(p, 0.2, 0.55), ease(p, 0.25, 0.6));
        vignette(g, W, H, 0.5);
      },
    },
    // 4 — The row home under a whole sky; Fallpoint dark astern.
    {
      ms: 11000,
      enter: 'fade',
      cues: [{ at: 600, sfx: 'splash' }, { at: 3400, sfx: 'splash' }, { at: 6400, sfx: 'splash' }],
      lines: [
        { who: 'The Ferryman', text: 'Home, then. No fare.' },
        { who: 'The Ferryman', text: 'There never was a fare, not for you. I only ever said so to see if you would argue.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 340, 0x03050e, 0x14203a, 22);
        starfield(g, 0, 0, W, 320, r, 190, t);
        ladle(g, 120, 60, 1.2, t, 0, 1);
        sea(g, W, 338, H, t, 0x060c1c, 0x2a3a6a, 0.8);
        // Fallpoint astern: a dark ring, a last thread of steam, nothing burning in it.
        reef(g, 780 + p * 20, 352, 220 - p * 30, t, k.rng(), 'sealed', 0);
        // Starlight on the swell.
        for (let i = 0; i < 18; i++) { g.fillStyle(0xffffff, 0.2); g.fillRect(r() * W, 360 + r() * 200, 1, 3 + r() * 5); }
        const sx = mix(300, 380, ease(p)), sy = 540;
        const stroke = Math.sin(t * 1.4);
        ferryman(g, sx + 34, sy - 10, 0.8, t, { row: stroke, face: -1 });
        cineHero(g, sx - 30, sy - 22, 13, k.hero.color, { face: -1, t });
        skiff(g, sx, sy, 1, t, -1, 1);
        g.fillStyle(0xffffff, 0.2 * Math.max(0, stroke)); g.fillEllipse(sx + 64, sy + 8, 30, 4);
        vignette(g, W, H, 0.55);
      },
    },
    // 5 — First light on Emberport.
    {
      ms: 9000,
      enter: 'fade',
      cues: [{ at: 1200, sfx: 'gust' }, { at: 4800, sfx: 'holy-chord' }],
      lines: [{ text: 'They came in to Emberport on the first light, the way the very first crossing had.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const sun = ease(p, 0, 1);
        sky(g, 0, 0, W, 400, mixC(0x1a2040, 0x6a8ac8, sun), mixC(0x6a4a5a, 0xffc890, sun), 22);
        starfield(g, 0, 0, W, 200 * (1 - sun), r, 60, t);
        sunDisc(g, 640, mix(420, 360, sun), 34, 0xfff0c0, 0.9);
        isle(g, 0, 560, 400, 1.6, mixC(0x1a1418, 0x4a3028, sun), 1, 1);
        sea(g, W, 398, H, t, mixC(0x0c1428, 0x3a5a8a, sun), mixC(0x3a4a7a, 0xffe0b0, sun), 0.8);
        // The sun's road on the water.
        for (let i = 0; i < 10; i++) { g.fillStyle(0xffe0a0, 0.25 * sun * (1 - i / 10)); g.fillRect(620 - (10 - i) * 3 + Math.sin(t * 2 + i) * 4, 410 + i * 16, 40 + (10 - i) * 6, 3); }
        for (let i = 0; i < 3; i++) gull(g, 200 + i * 110 + t * 20, 180 + i * 24 + Math.sin(t + i) * 6, 1, t, 0xf0ece0, 0.85);
        skiff(g, mix(260, 360, ease(p)), 560, 0.8, t, 1, 1 - sun);
        vignette(g, W, H, 0.45);
      },
    },
    // 6 — The narrator's last line, over a sky that keeps its stars. No stinger.
    {
      ms: 9500,
      enter: 'fade',
      cues: [{ at: 800, sfx: 'sparkle' }],
      lines: [
        { text: 'And the freed sea slept easy, under a sky that kept every one of its stars.' },
        { text: 'This time, nobody had to ask.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 420, 0x03050e, 0x16223e, 24);
        starfield(g, 0, 0, W, 400, r, 240, t);
        ladle(g, 620, 90, 1.4, t, 0, 1);
        for (let i = 0; i < 10; i++) isle(g, i, 50 + i * 96, 420, 0.26 + (i % 3) * 0.05, 0x080c18, 1, 1);
        sea(g, W, 418, H, t, 0x060c1c, 0x2a3a6a, 0.9);
        wash(g, W, H, 0x000000, ease(p, 0.75, 1));
      },
    },
  ],
};
