import Phaser from 'phaser';
import type { CutsceneDef } from '../../../IslesTypes';
import { ease, mix, sky, sea, vignette, wash, cineHero, boat, mixC, lit } from '../../../art/CineArt';
import { OBS, drawPinnacle, starfield, seam, crackPath } from '../../../art/PinnacleArt';
import { ISLES, P, beacon, clouds, ferryman, gull, isle, skiff, stormWall, wanderer, rays } from './art';

/**
 * `cine-shroud` — played when the tenth monarch falls. The storm in the middle of the sea, which
 * every sailor in the campaign has steered round, loses the last of the ten crowns that held it up
 * and tears open like a curtain: the Obsidian Pinnacle, seen for the first time. Beacons climb on
 * all ten freed isles, all pointing one way, and ten boats — the Muster — put out with the
 * Ferryman's skiff at their head.
 */

type G = Phaser.GameObjects.Graphics;

/** A little crown glyph — the ten lamps that hold the storm up. `a` 0 dark, 1 burning. */
function crownLamp(g: G, x: number, y: number, s: number, a: number, t: number): void {
  const cold = 0x3a3450;
  const col = mixC(cold, OBS.seamLit, a);
  if (a > 0.05) {
    for (let i = 3; i >= 1; i--) { g.fillStyle(OBS.seam, 0.07 * a); g.fillCircle(x, y - 4 * s, (6 + i * 7) * s * (0.9 + 0.1 * Math.sin(t * 9))); }
  }
  g.fillStyle(col, 0.35 + 0.65 * a);
  g.fillPoints([
    P(x - 9 * s, y), P(x + 9 * s, y), P(x + 10 * s, y - 12 * s), P(x + 5 * s, y - 6 * s),
    P(x, y - 15 * s), P(x - 5 * s, y - 6 * s), P(x - 10 * s, y - 12 * s),
  ], true);
  g.lineStyle(1, a > 0.05 ? 0xffffff : 0x5a5470, 0.4 + 0.5 * a);
  g.lineBetween(x - 9 * s, y, x + 9 * s, y);
}

export const CINE_SHROUD: CutsceneDef = {
  id: 'cine-shroud',
  music: 'title',
  shots: [
    // 1 — The storm on the horizon, as every sailor knew it.
    {
      ms: 8000,
      cues: [{ at: 1800, sfx: 'thunder' }, { at: 5600, sfx: 'rain' }],
      lines: [
        { text: 'For as long as anyone could remember, a storm stood in the middle of the sea.' },
        { text: 'Ships that sailed into it did not sail out.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const pan = ease(p) * 50;
        sky(g, 0, 0, W, 380, 0x06050c, 0x3a2440, 26);
        starfield(g, 0, 0, W, 250, r, 80, t);
        // A thin moon, hung over the left-hand sea.
        g.fillStyle(0xf2ecff, 0.12); g.fillCircle(170 - pan * 0.15, 118, 34);
        g.fillStyle(0xf2ecff, 0.95); g.fillCircle(170 - pan * 0.15, 118, 16);
        g.fillStyle(0x0c0a16, 1); g.fillCircle(177 - pan * 0.15, 113, 15);
        clouds(g, -120, 180, W + 240, 110, 12, r, 0x24182e, 0.55, -pan * 0.3 + t * 4);
        // The Shroud itself on the horizon, glowing faintly from within.
        g.fillStyle(OBS.seam, 0.06); g.fillEllipse(540 - pan * 0.5, 330, 760, 200);
        stormWall(g, 540 - pan * 0.5, 372, 580, 300, t, r, { fury: 0.75 });
        sea(g, W, 370, H, t, 0x0b0f22, 0x5a4a7a);
        // The storm's light lying on the water.
        for (let i = 0; i < 8; i++) {
          const y = 384 + i * 16;
          g.fillStyle(OBS.seam, 0.05 + 0.03 * Math.sin(t * 2 + i));
          g.fillEllipse(540 - pan * 0.5 + Math.sin(t + i) * 10, y, 300 - i * 18, 4 + i);
        }
        // A headland in the near dark, a lit cottage window on it (somebody always watches it).
        const hx = -pan * 1.6;
        g.fillStyle(0x07060b, 1);
        g.fillPoints([P(hx - 40, H), P(hx - 40, 420), P(hx + 60, 400), P(hx + 160, 430), P(hx + 230, 480), P(hx + 290, 520), P(hx + 330, H)], true);
        g.fillStyle(0x15121e, 1);
        g.fillPoints([P(hx + 60, 400), P(hx + 160, 430), P(hx + 150, 436), P(hx + 62, 410)], true);
        g.fillStyle(0x0c0a12, 1); g.fillRect(hx + 70, 372, 44, 34);
        g.fillTriangle(hx + 64, 374, hx + 120, 374, hx + 92, 350);
        g.fillStyle(0xffc070, 0.2); g.fillCircle(hx + 100, 390, 12);
        g.fillStyle(0xffd890, 1); g.fillRect(hx + 96, 385, 8, 9);
        g.lineStyle(1, 0x2a2436, 1);
        for (let i = 0; i < 9; i++) g.lineBetween(hx + 180 + i * 14, 470 + i * 6, hx + 186 + i * 14, 458 + i * 6 - (i % 3) * 4);
        // Gulls heading home, away from the weather.
        for (let i = 0; i < 4; i++) gull(g, ((t * 40 + i * 140) % (W + 200)) - 100, 200 + i * 26 + Math.sin(t + i) * 6, 0.9, t, 0xb8b0d0, 0.8);
        vignette(g, W, H, 0.5);
      },
    },
    // 2 — Close on the wall: ten crown-lamps in the storm, nine already dark. The tenth goes out.
    {
      ms: 8500,
      enter: 'cut',
      cues: [
        { at: 600, sfx: 'thunder', shake: 0.003 }, { at: 2600, sfx: 'thunder' },
        { at: 4500, sfx: 'crystal-shatter', shake: 0.004, ms: 600 }, { at: 5600, sfx: 'hush' },
      ],
      lines: [
        { text: 'Ten crowns kept it standing. One by one, they fell.' },
        { text: 'Then the tenth went out — and the storm forgot what it was for.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t } = k;
        const out = ease(t, 4.3, 5.0);
        const calm = ease(t, 4.8, 8.0);
        sky(g, 0, 0, W, H, 0x050409, 0x1a1428, 18);
        stormWall(g, 480 + Math.sin(t * 0.3) * 20, 560, 1400, 600, t, r, { fury: 1 - calm * 0.8, glow: 1 - calm * 0.6 });
        // Rain lashing across the frame — easing as the storm loses heart.
        g.lineStyle(1, 0x8a80b0, 0.28 * (1 - calm * 0.7));
        for (let i = 0; i < 70; i++) {
          const x0 = r() * (W + 300), sp = 600 + r() * 400;
          const y = ((r() * H + t * sp * (1 - calm * 0.5)) % H);
          const x = (x0 - y * 0.4) % (W + 300) - 60;
          g.lineBetween(x, y, x - 8, y - 20);
        }
        // The ten lamps in an arc through the cloud. The tenth gutters and goes out.
        for (let i = 0; i < 10; i++) {
          const f = i / 9;
          const x = 130 + f * 700;
          const y = 300 - Math.sin(f * Math.PI) * 120 + Math.sin(t * 0.8 + i) * 4;
          let a = 0;
          if (i === 9) a = (1 - out) * (0.8 + 0.2 * Math.sin(t * 23)) * (t > 3.6 ? (Math.sin(t * 40) > -0.2 ? 1 : 0.2) : 1);
          crownLamp(g, x, y, 1.2, a, t);
          if (i === 9 && out > 0 && out < 1) {
            // A puff of violet smoke where it was.
            g.fillStyle(OBS.seam, 0.3 * (1 - out)); g.fillCircle(x, y - 8 - out * 30, 6 + out * 18);
          }
        }
        // Sea, whipped white, settling.
        sea(g, W, 540, H, t * (1.6 - calm), 0x0a0e1e, 0x8a80b0, calm);
        // When the last lamp dies, the light in the cloud dims with it.
        wash(g, W, H, 0x000000, out * 0.2);
        vignette(g, W, H, 0.6);
      },
    },
    // 3 — The tear: the wall folds back like a curtain and the spire stands in the gap.
    {
      ms: 9500,
      enter: 'cut',
      cues: [
        { at: 300, sfx: 'thunder' }, { at: 1400, sfx: 'gust' }, { at: 1500, shake: 0.005, ms: 3200 },
        { at: 2600, sfx: 'tornado' }, { at: 5200, sfx: 'boss-intro', flash: 0xc9b0ff, ms: 500 },
      ],
      lines: [{ text: 'It tore open like a curtain — and behind it stood the thing it had hidden.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const split = ease(p, 0.12, 0.62);
        const zoom = ease(p, 0.5, 1);
        sky(g, 0, 0, W, H, 0x040308, 0x1c1230, 18);
        // Behind the storm: a clear sky, first stars, the glow of the thing.
        starfield(g, 480 - 360 * split, 70, 720 * split + 1, 300, r, 90, t);
        g.fillStyle(OBS.skyGlow, 0.5 * split); g.fillEllipse(480, 300, 640 * split + 40, 420);
        g.fillStyle(OBS.seam, 0.12 * split); g.fillEllipse(480, 240, 300 * split + 20, 360);
        const base = 440 + zoom * 30;
        const h = 330 + zoom * 60;
        drawPinnacle(g, 480, base, h, { t, storm: 1 - ease(p, 0.3, 0.85), lit: 0 });
        // The sea round its foot boiled to glass: a black mirror ring with violet cracks.
        g.fillStyle(0x07060c, 1); g.fillEllipse(480, base + 6, 520 + zoom * 80, 26);
        const rr = k.rng();
        for (let i = 0; i < 6; i++) {
          const a0 = { x: 480 + (rr() - 0.5) * 420, y: base + 2 + rr() * 8 };
          seam(g, crackPath(a0, { x: a0.x + (rr() - 0.5) * 120, y: a0.y + rr() * 8 }, rr, 4, 4), 1, 0.6 * split);
        }
        // The curtain, drawn back.
        stormWall(g, 480, base + 10, 1300, 520, t, r, { split, fury: 1 - split * 0.6 });
        rays(g, 480, base - h, Math.PI * 0.15, Math.PI * 0.85, 14, 620, OBS.seam, 0.07 * Math.sin(split * Math.PI), t);
        sea(g, W, base + 14, H, t, 0x0a0e1e, 0x6a5a8a, split * 0.6);
        vignette(g, W, H, 0.55);
      },
    },
    // 4 — Looking up the spire from the glass at its foot, until its tip comes into view.
    {
      ms: 9000,
      cues: [{ at: 600, sfx: 'beam-charge' }, { at: 5600, sfx: 'curse-cast' }],
      lines: [
        { text: 'The Obsidian Pinnacle: where a star once fell into the sea, and the sea boiled to glass.' },
        { text: 'At the top of it sat the one who had crowned all ten of them.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const tilt = ease(p, 0, 0.85);
        sky(g, 0, 0, W, H, 0x040308, 0x22163a, 24);
        starfield(g, 0, 0, W, H * 0.8, r, 140, t);
        // The Shroud's last rags blowing off both ways.
        clouds(g, -300 - t * 30, 120, 500, 300, 8, r, 0x1c1828, 0.6 * (1 - p * 0.6), 0);
        clouds(g, W - 200 + t * 30, 100, 500, 320, 8, r, 0x1c1828, 0.6 * (1 - p * 0.6), 0);
        const base = mix(560, 830, tilt);
        drawPinnacle(g, 470, base, 760, { t, lit: 0 });
        // The black glass sea underfoot, mirror-flat.
        if (base < H) {
          g.fillStyle(OBS.sea, 1); g.fillRect(0, base, W, H - base);
          g.lineStyle(1, OBS.edge, 0.18);
          for (let i = 0; i < 7; i++) g.lineBetween(0, base + 4 + i * i * 2.6, W, base + 4 + i * i * 2.6);
          g.fillStyle(OBS.seam, 0.1); g.fillEllipse(470, base + 10, 520, 20);
        }
        // Motes of glass drifting up past us like slow snow.
        for (let i = 0; i < 46; i++) {
          const sp = 18 + r() * 30;
          const x = r() * W + Math.sin(t + i) * 10;
          const y = H - ((r() * H + t * sp + tilt * 260) % H);
          const sz = 1 + r() * 2.4;
          g.fillStyle(r() > 0.7 ? OBS.seamLit : OBS.edge, 0.5);
          g.fillTriangle(x, y - sz * 1.6, x + sz, y, x - sz, y);
        }
        vignette(g, W, H, 0.55);
      },
    },
    // 5 — Beacons climbing on all ten freed isles, every pillar leaning toward the spire.
    {
      ms: 9500,
      cues: [
        ...ISLES.map((_, i) => ({ at: 600 + i * 620, sfx: i % 2 ? 'flame-burst' : 'fireball' })),
        { at: 7200, sfx: 'holy-chord' },
      ],
      lines: [{ text: 'On every freed isle a beacon was lit — and every one of them pointed the same way.' }],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        const drift = p * 24;
        sky(g, 0, 0, W, 340, 0x05050e, 0x1e1a38, 22);
        starfield(g, 0, 0, W, 300, r, 110, t);
        sea(g, W, 330, H, t, 0x080c1c, 0x3a3a6a, 0.5);
        drawPinnacle(g, 480 - drift * 0.2, 334, 120, { t, lit: 0 });
        // Back to front: far isles first.
        const spots: [number, number, number, number][] = [
          [3, 410, 342, 0.36], [5, 610, 344, 0.38], [2, 250, 350, 0.45], [8, 870, 352, 0.48], [4, 90, 362, 0.52],
          [6, 740, 364, 0.5], [1, 300, 398, 0.72], [7, 670, 402, 0.72], [0, 120, 440, 0.95], [9, 850, 444, 1],
        ];
        const peak = [90, 46, 80, 120, 46, 60, 62, 78, 104, 52];
        for (const [i, x0, y, s] of spots) {
          const x = x0 + (x0 - 480) * drift * 0.002 * (s * 3);
          const on = ease(t, 0.6 + i * 0.62, 1.5 + i * 0.62);
          const col = ISLES[i].col;
          g.fillStyle(col, 0.08 * on); g.fillEllipse(x, y + 10 * s, 200 * s, 18 * s);
          isle(g, i, x, y, s, mixC(0x0b0b16, col, 0.12 + 0.1 * on), 1, on);
          beacon(g, x, y - peak[i] * s, col, on, t, s, (480 - x) * 0.55);
          // Its reflection, broken by the swell.
          for (let j = 0; j < 4; j++) {
            g.fillStyle(col, 0.15 * on * (1 - j / 4));
            g.fillRect(x - (6 - j) * s + Math.sin(t * 3 + j) * 3, y + 6 * s + j * 8 * s, (12 - j * 2) * s, 3 * s);
          }
        }
        vignette(g, W, H, 0.5);
      },
    },
    // 6 — The Muster puts out: ten boats from ten directions, the Ferryman's skiff at the head.
    {
      ms: 10000,
      cues: [{ at: 900, sfx: 'splash' }, { at: 3400, sfx: 'splash' }, { at: 6000, sfx: 'gust' }],
      lines: [
        { who: 'The Ferryman', text: 'So. All ten of them came.' },
        { who: 'The Ferryman', text: 'Sit down, then. Mind the oar. This is the last crossing.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 300, 0x0a0c1c, 0x3c2c4c, 22);
        starfield(g, 0, 0, W, 200, r, 60, t);
        g.fillStyle(lit(0x3c2c4c, 0.2), 0.4); g.fillEllipse(480, 300, 900, 50);
        drawPinnacle(g, 480, 300, 150 + p * 20, { t, lit: 0 });
        sea(g, W, 298, H, t, 0x0d1430, 0x7a74a8);
        // Ten boats, far to near, closing on the spire from both sides.
        const order = [0, 5, 1, 6, 2, 7, 3, 8, 4, 9];
        for (const i of order) {
          const side = i < 5 ? -1 : 1;
          const d = (i % 5) / 4;
          const y = 318 + d * 150;
          const s = 0.4 + d * 0.65;
          const x = 480 + side * (140 + d * 330) - side * ease(p) * (50 + d * 120);
          const face = side < 0 ? 1 : -1;
          g.fillStyle(ISLES[i].col, 0.12); g.fillEllipse(x, y + 4 * s, 90 * s, 8 * s);
          wanderer(g, i, x - face * 8 * s, y - 6 * s, s * 0.42, t, { face });
          boat(g, x, y, s, 0x3a2c22, ISLES[i].col, t, face);
        }
        // The skiff in the foreground: the Ferryman rows, the hero sits forward, facing the spire.
        const sx = mix(250, 330, ease(p)), sy = 560;
        const stroke = Math.sin(t * 1.8);
        ferryman(g, sx - 34, sy - 10, 0.8, t, { row: stroke, face: 1 });
        cineHero(g, sx + 32, sy - 22, 13, k.hero.color, { face: 1, t });
        skiff(g, sx, sy, 1, t, 1, 1);
        // The oar's wake.
        g.fillStyle(0xffffff, 0.2 * Math.max(0, stroke)); g.fillEllipse(sx - 64, sy + 8, 30, 4);
        vignette(g, W, H, 0.5);
      },
    },
  ],
};
