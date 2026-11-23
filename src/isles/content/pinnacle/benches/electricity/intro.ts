import type { CutsceneDef } from '../../../../IslesTypes';
import { cineHero, ease, vignette } from '../../../../art/CineArt';
import { OBS, councilMask, seam, shard, slab } from '../../../../art/PinnacleArt';
import { benchIntroId } from '../../spec';
import { VOLT, bolt, cable, glassArcs, glyph, leydenJar, meterDial, type SeatGlyph } from './art';

/**
 * cine-bench-electricity — first entry to the Storm Bench. Three shots, ~15 s:
 *   1. The conductor revealed: the camera climbs a cable as thick as a tree past walls of black glass
 *      with arcs crawling inside them, while the ranks of Leyden jars light one after another.
 *   2. The Meter: the dial that counted the Draw, needle pinned and arcing at the stop.
 *   3. Six seats on their plinths; one by one the masks turn and their slits light storm-yellow.
 */

const FERRY = '#c9b0ff';
const COUNCIL = '#ffe14a';
const GLYPHS: SeatGlyph[] = ['electricity', 'technology', 'magnet', 'radiation', 'rubber', 'quantum'];

export const STORM_INTRO: CutsceneDef = {
  id: benchIntroId('bench-electricity'),
  shots: [
    {
      ms: 5200,
      enter: 'fade',
      cues: [{ at: 600, sfx: 'electric-charge' }, { at: 3400, sfx: 'plasma-arc', shake: 0.003, ms: 300 }],
      lines: [{ who: 'The Ferryman', color: FERRY, text: 'Hear that hum? Every crank on Voltreach ended in this room. A whole isle\'s evenings, wired up here.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        // The camera climbs: everything scrolls down as p rises.
        const climb = ease(p) * 520;
        g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
        g.fillStyle(OBS.skyGlow, 0.25); g.fillEllipse(W / 2, -40 + climb * 0.2, W * 1.2, 300);
        // Far wall: tall panes of black glass with arcs crawling inside them.
        for (let i = 0; i < 9; i++) {
          const x = 30 + i * 112 + (rng() - 0.5) * 20;
          const y = 900 + climb;
          shard(g, x, y, 120 + rng() * 40, 1400, (rng() - 0.5) * 30, 0.15 + rng() * 0.3);
          glassArcs(g, x - 40, y - 1300, 80, 1250, t + i, i * 13, 3);
        }
        // Ranks of jars on ledges, lighting from the bottom up as the camera passes.
        for (let row = 0; row < 5; row++) {
          const ly = 620 - row * 230 + climb;
          if (ly < -40 || ly > H + 140) continue;
          slab(g, 170, ly + 8, 280, 16);
          slab(g, W - 170, ly + 8, 280, 16);
          const lit = ease(p * 5.2 - row * 0.9);
          for (let j = 0; j < 4; j++) {
            leydenJar(g, 70 + j * 66, ly, 0.6, lit * (0.5 + j * 0.12), t + j + row, VOLT);
            leydenJar(g, W - 70 - j * 66, ly, 0.6, lit * (0.5 + j * 0.12), t + j * 1.3 + row, VOLT);
          }
          if (lit > 0.9) bolt(g, 70, ly - 82, W - 70, ly - 82, Math.floor(t * 18) + row, 1.4, VOLT, 0.35, 1);
        }
        // The cable, thick as a tree, up the middle of the frame.
        cable(g, [{ x: W / 2 + 30, y: H + 60 }, { x: W / 2 - 10, y: H * 0.5 }, { x: W / 2 + 20, y: -60 }], 70, t * 1.4);
        vignette(g, W, H, 0.6);
      },
    },
    {
      ms: 5400,
      enter: 'cut',
      cues: [{ at: 300, sfx: 'beam-charge' }, { at: 2600, sfx: 'thunder', shake: 0.008, ms: 450, flash: 0xffe14a }],
      lines: [{ who: 'Councilor Ampleforth', color: COUNCIL, text: 'Sixth bench. The Draw was written here, and the Meter counted it. It never once read zero.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, H);
        // Push in on the dial.
        const r = 300 + ease(p) * 60;
        const cy = H * 0.86 + ease(p) * 20;
        g.fillStyle(VOLT, 0.05); g.fillCircle(W / 2, cy, r * 1.5);
        // Cables rising behind it into the dark.
        for (const dx of [-1, 1]) cable(g, [{ x: W / 2 + dx * r * 0.7, y: cy }, { x: W / 2 + dx * r * 0.85, y: cy - r * 0.9 }, { x: W / 2 + dx * r * 0.6, y: -40 }], 40, t * 1.2 + dx);
        meterDial(g, W / 2, cy, r, 1, t, { mask: true, tremble: 2.5 });
        // At the strike, an arc leaps from the pinned needle up into the ceiling.
        if (k.t > 2.55 && k.t < 3.1) {
          const a = Math.PI * 1.92;
          bolt(g, W / 2 + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, W * 0.8, -20, Math.floor(t * 30), 4, VOLT, 1, 3);
        }
        seam(g, [{ x: 40, y: 80 }, { x: 120, y: 160 }, { x: 90, y: 260 }], 1.5, 0.6, 0.3);
        vignette(g, W, H, 0.55);
      },
    },
    {
      ms: 5200,
      enter: 'cut',
      cues: GLYPHS.map((_, i) => ({ at: 700 + i * 420, sfx: 'zap' })),
      lines: [{ who: 'Councilor Twice', color: COUNCIL, text: 'Six of us, and you, and the current. Do sit down. Ah — no. Those are our seats.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
        for (let i = 0; i < 12; i++) shard(g, i * 90 + rng() * 30, 330, 110, 260 + rng() * 80, (rng() - 0.5) * 20, 0.1);
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 330, W, H - 330);
        g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(0, 330, W, 330);
        // Six seats in a shallow arc, each with its glyph and a masked councilor before it.
        for (let i = 0; i < 6; i++) {
          const x = 110 + i * 148;
          const y = 420 + Math.abs(i - 2.5) * 14;
          slab(g, x, y, 110, 16);
          slab(g, x, y - 16, 90, 14);
          shard(g, x - 18, y - 30, 40, 170, -6, 0.2);
          shard(g, x + 18, y - 30, 40, 176, 6, 0.3);
          g.fillStyle(OBS.glass, 1); g.fillCircle(x, y - 110, 16);
          const turned = ease(k.t, 0.7 + i * 0.42, 1.0 + i * 0.42);
          glyph(g, GLYPHS[i], x, y - 110, 9, VOLT, 0.3 + turned * 0.7);
          // The councilor: a dark robe and the mask, turning to face the camera.
          g.fillStyle(0x16121e, 1); g.fillEllipse(x, y + 26, 54, 70);
          g.fillStyle(0x221c30, 1); g.fillEllipse(x - 6, y + 20, 30, 56);
          councilMask(g, x + (1 - turned) * 10, y - 18, 18, { slit: turned > 0.5 ? VOLT : OBS.facet, glow: turned, alpha: 0.6 + turned * 0.4 });
          if (turned > 0 && turned < 1) bolt(g, x, y - 18, x, y - 170, Math.floor(t * 20) + i, 1.4, VOLT, 1 - turned, 1);
        }
        // The hero at the foot of the bench, seen from behind.
        cineHero(g, W / 2, 560 - ease(p) * 20, 26, k.hero.color, { back: true, t, walk: 0.2 });
        vignette(g, W, H, 0.5);
      },
    },
  ],
};
