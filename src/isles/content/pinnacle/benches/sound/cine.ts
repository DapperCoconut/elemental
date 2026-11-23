import type { CutsceneDef } from '../../../../IslesTypes';
import { cineHero, ease, mix, sky, vignette, wash } from '../../../../art/CineArt';
import { BENCHES, benchIntroId } from '../../spec';
import { OBS, VOICE, VOICE_LIT, councilMask, lit, organPipe, ribbon, seam, turningMask, voiceJar } from './art';

/**
 * cine-bench-sound — the Choir Bench revealed. Three shots, ~15 s:
 *  1. THE HOUSE: from the stage, looking up an empty amphitheatre of black glass, tier on tier,
 *     the house-lights burning for nobody, the Part lit note by note up the aisle; the hero small
 *     at the foot. The Ferryman.
 *  2. THE VOICE VAULT: the back wall, close — shelf on shelf of jars, each a voice, the hum rolling
 *     across them; the great jar over the door, a mouth open inside it on a note it cannot stop.
 *  3. THE SIX: one by one, high on the tiers, six masks turn to look; the slits light. A councilor.
 */

const B = BENCHES.find((x) => x.isle === 'sound')!;
const FERRY = '#c8d8e8';

export const CHOIR_CINE: CutsceneDef = {
  id: benchIntroId(B.id),
  shots: [
    {
      ms: 5400,
      enter: 'fade',
      cues: [{ at: 300, sfx: 'hush' }, { at: 2600, sfx: 'crystal-chime' }],
      lines: [{ who: 'The Ferryman', text: 'Mind the quiet in here. In this room it is the loudest thing there is.', color: FERRY }],
      draw(g, k) {
        const { W, H, t } = k;
        const push = ease(k.p) * 30;
        sky(g, 0, 0, W, H, 0x05040a, OBS.glass, 12);
        // The Vault glimmering at the very top of the house.
        const vy = 70 - push * 0.3;
        g.fillStyle(VOICE, 0.06); g.fillRect(0, vy - 20, W, 90);
        for (let i = 0; i < 90; i++) {
          const x = (i * 97) % W, y = vy + ((i * 31) % 60);
          const v = Math.sin(t * 1.4 - x * 0.01) * 0.5 + 0.5;
          g.fillStyle(VOICE, 0.25 + v * 0.5); g.fillRect(x, y, 3, 4);
        }
        // Tiers: rows of seats narrowing up toward the Vault, each riser with its little lights.
        for (let r = 0; r < 11; r++) {
          const f = r / 10;
          const y = mix(560, 150, Math.pow(f, 0.8)) + push * (1 - f);
          const half = mix(470, 210, f);
          const s = mix(1.3, 0.45, f);
          g.fillStyle(OBS.glass, 1); g.fillRect(W / 2 - half, y, half * 2, 10 * s);
          g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(W / 2 - half, y, W / 2 + half, y);
          const n = Math.floor((half * 2) / (26 * s));
          for (let i = 0; i < n; i++) {
            const x = W / 2 - half + (i + 0.5) * ((half * 2) / n);
            if (Math.abs(x - W / 2) < 34 * s) continue;
            g.fillStyle(OBS.facet, 1); g.fillRect(x - 9 * s, y - 20 * s, 18 * s, 16 * s);
            g.fillStyle(OBS.sheen, 0.8); g.fillRect(x - 9 * s, y - 20 * s, 18 * s, 2);
            if ((i * 7 + r * 3) % 23 === 0) { g.fillStyle(VOICE, 0.7); g.fillCircle(x, y - 10 * s, 3 * s); }
            if ((i * 5 + r) % 29 === 0) ribbon(g, x, y - 12 * s, 4 * s, 0.9);
          }
          for (let i = 0; i < 6; i++) { g.fillStyle(VOICE, 0.3 + 0.3 * Math.sin(t * 2 + r + i)); g.fillCircle(W / 2 - half + 20 + i * ((half * 2 - 40) / 5), y + 5 * s, 1.5 * s); }
        }
        // The aisle, the Part inlaid up it — one note lit at a time, climbing.
        g.fillStyle(0x07050c, 0.8); g.fillTriangle(W / 2 - 60, 600, W / 2 + 60, 600, W / 2, 140);
        const lit0 = (t * 0.45) % 1;
        for (let i = 0; i < 12; i++) {
          const f = i / 12;
          const y = mix(580, 170, Math.pow(f, 0.8));
          const on = Math.abs(f - lit0) < 0.05;
          g.fillStyle(on ? VOICE_LIT : VOICE, on ? 1 : 0.4); g.fillEllipse(W / 2, y, mix(12, 4, f), mix(8, 3, f));
        }
        // Organ pipes on each side.
        for (let i = 0; i < 5; i++) {
          organPipe(g, 40 + i * 26, 600, 18, 260 + i * 40, 0.5);
          organPipe(g, W - 40 - i * 26, 600, 18, 260 + i * 40, 0.5);
        }
        cineHero(g, W / 2, 560 + push * 0.2, 16, k.hero.color, { back: true, t });
        vignette(g, W, H, 0.7);
      },
    },
    {
      ms: 4800,
      enter: 'cut',
      cues: [{ at: 200, sfx: 'holy-chord' }],
      lines: [{ text: 'Every jar is a voice. Choirholm\'s on the low shelves. Higher up, isles nobody remembers.' }],
      draw(g, k) {
        const { W, H, t } = k;
        const rng = k.rng();
        const pan = ease(k.p) * 60;
        g.fillStyle(0x05040a, 1); g.fillRect(0, 0, W, H);
        // Shelves, full frame, the hum rolling across.
        for (let row = 0; row < 9; row++) {
          const y = 104 + row * 54;
          for (let x = -pan; x < W + 30; x += 22) {
            const s = 30 + rng() * 14;
            if (Math.abs(x - W / 2 + pan * 0.5) < 110 && row > 1 && row < 7) continue;
            const v = Math.sin(t * 1.6 - (x + pan) * 0.012 + row * 0.6) * 0.5 + 0.5;
            g.fillStyle(OBS.glass, 1); g.fillRect(x - 7, y - s * 0.78, 14, s * 0.78);
            g.fillStyle(VOICE, 0.25 + v * 0.55); g.fillEllipse(x, y - s * 0.4, 9, s * 0.4);
            g.fillStyle(OBS.facet, 1); g.fillRect(x - 5, y - s * 0.95, 10, 5);
          }
          g.fillStyle(OBS.facet, 1); g.fillRect(0, y, W, 6);
          g.fillStyle(OBS.sheen, 1); g.fillRect(0, y, W, 1.5);
        }
        // The great jar over the door, close: a mouth inside it, open on one note for ever.
        const cx = W / 2 - pan * 0.5, cy = 420;
        g.fillStyle(VOICE, 0.08 + 0.04 * Math.sin(t * 3)); g.fillCircle(cx, cy - 90, 150);
        voiceJar(g, cx, cy, 200, { glow: 1, label: true });
        g.fillStyle(0x5a1840, 0.7); g.fillEllipse(cx, cy - 80, 26 + Math.sin(t * 6) * 3, 34);
        g.fillStyle(VOICE_LIT, 0.7); g.fillEllipse(cx - 30, cy - 108, 10, 5); g.fillEllipse(cx + 30, cy - 108, 10, 5);
        for (let i = 0; i < 3; i++) {
          const ph = ((t * 0.7) + i / 3) % 1;
          g.lineStyle(2, VOICE_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy - 80, 60 + ph * 240, 40 + ph * 120);
        }
        vignette(g, W, H, 0.6);
      },
    },
    {
      ms: 5200,
      enter: 'cut',
      cues: [{ at: 400, sfx: 'crystal-chime' }, { at: 1300, sfx: 'crystal-chime' }, { at: 2200, sfx: 'curse-cast' }],
      lines: [
        { who: 'Councilor Tessitura Bray', text: 'Take your seat. The house is empty tonight — the performance is you.', color: '#ffd2ec' },
      ],
      draw(g, k) {
        const { W, H, t } = k;
        sky(g, 0, 0, W, H, 0x05040a, 0x120d1c, 10);
        // Dark tiers in the background.
        for (let r = 0; r < 7; r++) {
          const y = 140 + r * 64;
          g.fillStyle(OBS.glass, 1); g.fillRect(0, y, W, 16);
          g.lineStyle(1, OBS.edge, 0.35); g.lineBetween(0, y, W, y);
        }
        seam(g, [{ x: 60, y: 600 }, { x: 140, y: 470 }, { x: 110, y: 340 }, { x: 190, y: 200 }], 1.4, 0.6, 0.3);
        // Six masks, high on the tiers, each turning to look in turn — the slit lighting as it faces you.
        const spots = [
          { x: 150, y: 430, s: 34 }, { x: 330, y: 300, s: 28 }, { x: 480, y: 220, s: 24 },
          { x: 630, y: 300, s: 28 }, { x: 810, y: 430, s: 34 }, { x: 480, y: 470, s: 44 },
        ];
        spots.forEach((m, i) => {
          const turn = 1 - ease(t, 0.35 + i * 0.55, 0.95 + i * 0.55);
          const facing = turn < 0.05;
          // A dark robed shoulder under each.
          g.fillStyle(0x0a0810, 1); g.fillEllipse(m.x, m.y + m.s * 1.9, m.s * 2.6, m.s * 1.6);
          g.lineStyle(1, OBS.edge, 0.3); g.strokeEllipse(m.x, m.y + m.s * 1.9, m.s * 2.6, m.s * 1.6);
          if (facing) councilMask(g, m.x, m.y, m.s, { glow: 0.8 + 0.2 * Math.sin(t * 3 + i), slit: i === 5 ? lit(VOICE, 0.2) : OBS.seam });
          else turningMask(g, m.x, m.y, m.s, (i % 2 ? -1 : 1) * turn);
        });
        wash(g, W, H, 0x000000, 0.35 * (1 - ease(t, 0, 0.6)));
        vignette(g, W, H, 0.7);
      },
    },
  ],
};
