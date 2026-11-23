import type { CutsceneDef } from '../../../IslesTypes';
import { cineHero, ease, mix, mixC, sea, sky, vignette, wash } from '../../../art/CineArt';
import { OBS, drawPinnacle, starfield } from '../../../art/PinnacleArt';
import { ISLES, css, ferryman, isle, rays, stormWall } from '../../pinnacle/cine/art';
import { CROWN_COLS, MOOD, P, cinder, crownGlyph } from '../art';
import { CINE_FALL } from '../spec';
import { ashDrift, clamp01, ferryHands, greatBell, pinnedSun } from './art';

/**
 * `cine-fall` — the first step into the Fall. The player walks into the light of the split shell; the
 * ten dawns of the ending run backwards — Solmara's sun pinned again at noon, Choirholm's bell hung
 * back in its frame — ten crowns are relit along a dark horizon, the Shroud draws shut round the
 * spire, and the Ferryman, who came too, looks at his own hands.
 */
export const CINE_FALL_DEF: CutsceneDef = {
  id: CINE_FALL,
  music: 'boss',
  shots: [
    // 1 — Into the light.
    {
      ms: 8000,
      cues: [{ at: 500, sfx: 'hush' }, { at: 3800, sfx: 'portal' }, { at: 6200, sfx: 'time-warp', flash: 0xffe0a8, ms: 500 }],
      lines: [
        { who: 'The Fallen King', text: 'Mind the step. It is a long way down, and all of it is the past.' },
        { who: 'The Ferryman', text: 'You are not going in there alone. Shift over.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 330, 0x07060e, 0x241a1a, 18);
        starfield(g, 0, 0, W, 300, r, 90, t);
        sky(g, 0, 320, W, H - 320, 0x1c2618, 0x0c120c, 12);
        const SX = 640, SY = 470;
        const swallow = ease(p, 0.55, 0.95);
        g.fillStyle(MOOD.open.wash, 0.08 + swallow * 0.2); g.fillEllipse(SX, SY - 120, 600 + swallow * 900, 400 + swallow * 600);
        rays(g, SX, SY - 120, Math.PI * 0.9, Math.PI * 2.1, 18, 700, MOOD.open.light, 0.06 + swallow * 0.1, t);
        cinder(g, SX, SY, 2.6, { mood: 'open', t, keys: 1, turned: 1, split: 1, king: 1 - ease(p, 0.2, 0.5), sitUp: 1 });
        // The player walks toward it, the Ferryman a step behind with his lamp.
        const hx = mix(160, 560, ease(p, 0.05, 0.85));
        ferryman(g, hx - 110, 520, 1.6, t, { face: 1, lamp: 1 });
        cineHero(g, hx, 486, 26, k.hero.color, { face: 1, t, walk: p < 0.85 ? 1 : 0, alpha: 1 - swallow * 0.8 });
        wash(g, W, H, 0xfff4dc, ease(p, 0.75, 1) * 0.9);
        vignette(g, W, H, 0.5);
      },
    },
    // 2 — Solmara: the sun dragged back up the sky and pinned at noon.
    {
      ms: 8500,
      enter: 'white',
      cues: [{ at: 600, sfx: 'time-warp' }, { at: 3800, sfx: 'hammer-forge', shake: 0.003 }, { at: 4300, sfx: 'hammer-forge', shake: 0.003 }, { at: 4800, sfx: 'light-beam' }],
      lines: [
        { text: 'The ten dawns of the ending ran backwards.' },
        { text: 'Over Solmara, the sun was dragged back up the sky and pinned again at noon.' },
      ],
      draw(g, k) {
        const { W, H, t, p } = k;
        const up = ease(p, 0.05, 0.42);
        const pin = ease(p, 0.42, 0.6);
        const sunY = mix(430, 130, up);
        // Dawn draining out of the sky into hard white.
        sky(g, 0, 0, W, 440, mixC(0x3a4a8a, 0xe8f0ff, up), mixC(0xffa060, 0xfff8e8, up), 22);
        pinnedSun(g, 480, sunY, 44, t, pin, 1 - up);
        // Solmara's mirror crown, and its glare.
        isle(g, 9, 480, 440, 2.2, mixC(0x3a2a1a, 0xd8d0b0, up), 1, 1 - up);
        g.fillStyle(0xffffff, 0.12 * pin); g.fillEllipse(480, 370, 300, 80);
        sea(g, W, 438, H, t, mixC(0x2a3a6a, 0x8aa0c0, up), 0xffffff, 0.6);
        // Shadows shrinking under it to nothing: the long dawn shadow of a mast going short.
        const sh = mix(260, 10, up);
        g.lineStyle(4, 0x1a1a24, 0.6); g.lineBetween(160, 600, 160, 470);
        g.fillStyle(0x1a1a24, 0.4); g.fillPoints([P(156, 600), P(164, 600), P(164 + sh, 606), P(156 + sh, 606)], true);
        k.text(80, 96, 'SOLMARA', { size: 16, color: css(ISLES[9].col), alpha: ease(t, 0.2, 0.9), align: 0, spacing: 6 });
        wash(g, W, H, 0xffffff, 0.15 * pin * (0.6 + 0.4 * Math.sin(t * 6)));
        vignette(g, W, H, 0.4);
      },
    },
    // 3 — Choirholm: the bell hung back in its frame, and the singing stops.
    {
      ms: 8500,
      enter: 'cut',
      cues: [{ at: 400, sfx: 'time-warp' }, { at: 3600, sfx: 'chain' }, { at: 5200, sfx: 'clang', shake: 0.004 }, { at: 6200, sfx: 'hush' }],
      lines: [
        { text: 'Over Choirholm, the great bell rose off the square and hung itself back in its frame.' },
        { text: 'And all the singing in the streets stopped, mid-note, as if it had never been allowed.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const lift = ease(p, 0.15, 0.62);
        sky(g, 0, 0, W, H, mixC(0xffc0a0, 0x2a2040, lift), mixC(0xffe0c0, 0x14101c, lift), 20);
        starfield(g, 0, 0, W, 260, r, 60, t, 0xffffff);
        // Choirholm's pipes far behind.
        isle(g, 8, 780, 470, 1.3, mixC(0x5a3a4a, 0x1a1420, lift), 1, 1 - lift);
        isle(g, 8, 160, 480, 1.0, mixC(0x5a3a4a, 0x1a1420, lift), 1, 1 - lift);
        // The square.
        g.fillStyle(mixC(0x8a6a5a, 0x2a2228, lift), 1); g.fillRect(0, 480, W, H - 480);
        for (let i = 0; i < 12; i++) { g.lineStyle(1, 0x000000, 0.2); g.lineBetween(i * 90 - 60, H, 240 + i * 50, 480); }
        greatBell(g, 480, 200, 1.2, lift, t);
        // Notes in the air, falling silent: each one freezes, then drops.
        for (let i = 0; i < 18; i++) {
          const x = 60 + ((i * 131) % 840);
          const fall = clamp01((p - 0.55 - (i % 6) * 0.04) * 4);
          const y = 300 + ((i * 47) % 160) - (1 - fall) * Math.sin(t * 2 + i) * 6 + fall * fall * 220;
          const a = (1 - fall) * (0.4 + 0.6 * (1 - lift * 0.5));
          if (a <= 0) continue;
          g.fillStyle(ISLES[8].col, a); g.fillEllipse(x, y, 9, 7);
          g.lineStyle(1.6, ISLES[8].col, a); g.lineBetween(x + 4, y, x + 4, y - 20);
          g.lineBetween(x + 4, y - 20, x + 11, y - 15);
        }
        k.text(80, 96, 'CHOIRHOLM', { size: 16, color: css(ISLES[8].col), alpha: ease(t, 0.2, 0.9), align: 0, spacing: 6 });
        vignette(g, W, H, 0.5);
      },
    },
    // 4 — Ten crowns relit, one by one, along a dark horizon.
    {
      ms: 9500,
      enter: 'cut',
      cues: [
        ...ISLES.map((_, i) => ({ at: 700 + i * 620, sfx: i % 2 ? 'curse-cast' : 'flame-burst' })),
        { at: 7300, sfx: 'boss-phase' },
      ],
      lines: [
        { text: 'On ten dark horizons, ten crowns were lit again — one by one, in the order they had fallen.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t } = k;
        sky(g, 0, 0, W, 380, 0x050308, 0x1a0c10, 22);
        starfield(g, 0, 0, W, 340, r, 120, t);
        sea(g, W, 380, H, t, 0x08060c, 0x3a1a20, 0.6);
        for (let i = 0; i < 10; i++) {
          const x = 60 + i * 93, y = 386 - (i % 2) * 6;
          const on = ease(t, 0.7 + i * 0.62, 1.2 + i * 0.62);
          const col = CROWN_COLS[i];
          isle(g, i, x, y, 0.34 + (i % 3) * 0.04, mixC(0x0a0810, dimTo(col), 0.2 * on), 1, 0);
          crownGlyph(g, x, y - 60 - (i % 3) * 6, 1.4, col, on, t);
          // The crown's light on the water: a long, cold pillar of reflection.
          for (let j = 0; j < 6; j++) { g.fillStyle(col, 0.16 * on * (1 - j / 6)); g.fillRect(x - 5 + Math.sin(t * 2 + j + i) * 3, y + 8 + j * 14, 10 - j, 3); }
        }
        // The sky darkens a step each time one lights.
        const lit = ease(t, 0.7, 7.2);
        wash(g, W, H, 0x000000, 0.15 * lit);
        vignette(g, W, H, 0.5);
      },
    },
    // 5 — The Shroud draws shut round the spire.
    {
      ms: 8500,
      enter: 'cut',
      cues: [{ at: 600, sfx: 'thunder' }, { at: 2200, sfx: 'tornado' }, { at: 4400, sfx: 'thunder', shake: 0.004, ms: 1000 }, { at: 6600, sfx: 'curse-cast' }],
      lines: [{ text: 'The storm drew shut again round the spire, as if it had never once been asked to leave.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const close = ease(p, 0.08, 0.7);
        sky(g, 0, 0, W, H, 0x040308, 0x1c1230, 18);
        starfield(g, 480 - 360 * (1 - close), 70, 720 * (1 - close) + 1, 300, r, 80, t);
        g.fillStyle(OBS.skyGlow, 0.5 * (1 - close)); g.fillEllipse(480, 300, 640 * (1 - close) + 40, 420);
        drawPinnacle(g, 480, 460, 340, { t, storm: close, lit: 0 });
        stormWall(g, 480, 470, 1300, 520, t, k.rng(), { split: 1 - close, fury: 0.4 + close * 0.6 });
        sea(g, W, 468, H, t * (1 + close), 0x0a0e1e, 0x6a5a8a, 0.3);
        // Ember glints in the cloud: this is the Fall's storm, not the old one.
        for (let i = 0; i < 20; i++) {
          const x = r() * W, y = 120 + r() * 340;
          g.fillStyle(MOOD.fall.light, 0.4 * close * Math.max(0, Math.sin(t * 3 + i * 1.7)));
          g.fillCircle(x, y, 1.6);
        }
        vignette(g, W, H, 0.6);
      },
    },
    // 6 — The Ferryman looks at his own hands.
    {
      ms: 9500,
      enter: 'cut',
      cues: [{ at: 800, sfx: 'hush' }, { at: 3800, sfx: 'status-debuff' }, { at: 7000, sfx: 'heartbeat' }],
      lines: [
        { who: 'The Ferryman', text: 'Forty years I rowed these waters with a tally cut in my hand. Look. It has come back.' },
        { who: 'The Ferryman', text: '…Again, then.' },
      ],
      draw(g, k) {
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, H, 0x0a0608, 0x1c0e0a, 16);
        // The lantern's light between his hands.
        for (let i = 4; i >= 1; i--) { g.fillStyle(0xffb050, 0.05); g.fillCircle(480, 330, 60 + i * 50); }
        g.fillStyle(MOOD.fall.wash, 0.06 + 0.03 * Math.sin(t * 2.2)); g.fillRect(0, 0, W, H);
        // The hood above, dark, the beard's tip and two glints.
        g.fillStyle(0x07060a, 1); g.fillEllipse(480, 60, 300, 200);
        g.fillStyle(0xd8d4cc, 1); g.fillTriangle(440, 110, 520, 110, 486, 170);
        g.lineStyle(1, 0x9a948c, 1); g.lineBetween(470, 112, 478, 160); g.lineBetween(496, 112, 490, 158);
        g.fillStyle(0xffc070, 0.9); g.fillCircle(455, 70, 3); g.fillCircle(508, 70, 3);
        ferryHands(g, 480, 330, 1.25, t, ease(p, 0.2, 0.55));
        ashDrift(g, W, H, t, k.rng(), 26, 0.8, 0.7);
        vignette(g, W, H, 0.7);
      },
    },
    // 7 — Card: the Fall.
    {
      ms: 6000,
      enter: 'fade',
      full: true,
      cues: [{ at: 300, sfx: 'boss-intro' }, { at: 2400, sfx: 'heartbeat' }],
      draw(g, k) {
        const { W, H, t } = k;
        g.fillStyle(0x050203, 1); g.fillRect(0, 0, W, H);
        const beat = Math.max(0, Math.sin(t * 3.4)) ** 6;
        g.fillStyle(MOOD.fall.wash, 0.06 + 0.06 * beat); g.fillEllipse(480, 320, 700, 240);
        for (let i = 0; i < 10; i++) crownGlyph(g, 228 + i * 56, 440, 0.9, CROWN_COLS[i], 0.6 + 0.2 * beat, t);
        ashDrift(g, W, H, t, k.rng(), 40, 0.9, 0.8);
        k.text(480, 270, 'THE FALL', { size: 64, color: '#ff8a5a', alpha: ease(t, 0.3, 1.4), spacing: 18 });
        k.text(480, 340, 'the case, heard again', { size: 16, color: '#d8b8a8', alpha: ease(t, 1.6, 2.8), display: false, spacing: 4 });
      },
    },
  ],
};

/** A crown colour sunk most of the way to night, for an isle's silhouette under it. */
const dimTo = (c: number): number => mixC(c, 0x000000, 0.7);
