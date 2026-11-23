import type { CutsceneDef } from '../../../../IslesTypes';
import { cineHero, ease, vignette } from '../../../../art/CineArt';
import { glow, mixC } from '../../../../art/IsleArt';
import { OBS, councilMask, seam, shard } from '../../../../art/PinnacleArt';
import { benchIntroId } from '../../spec';
import { alembic, alembicLive, councilSeat, glassDrop, plaque, still, stillLive } from './art';
import { B, FEN, MIST, VEN, VEN_DARK, VEN_DEEP } from './palette';

/**
 * The Venom Bench's intro: (1) up the stair into the bowl — the fen under the glass, the mist, the
 * stills dripping either side of the causeway; (2) the Register of the Marked filling the frame,
 * a name being struck as we watch, the alembic glowing in front of it; (3) six seats in the gloom,
 * and one by one the masks turn and their slits light green.
 */

const ORDER = ['slime', 'death', 'shadow', 'bind', 'subterfuge', 'string'];

export const PIN_SLIME_CINE: CutsceneDef = {
  id: benchIntroId(B.id),
  music: 'boss',
  shots: [
    {
      ms: 5000,
      enter: 'fade',
      cues: [{ at: 0, sfx: 'hush' }, { at: 2600, sfx: 'slime-splat' }],
      lines: [{ who: 'The Ferryman', text: 'Mind the mist. Every wisp of it was somebody\'s dose, boiled off and never drunk.', color: '#c9b0ff' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        const rise = ease(p) * 60;
        g.fillStyle(0x030205, 1); g.fillRect(0, 0, W, H);
        // The bowl's far wall: shards in a curve, the Register a pale band at the very top.
        g.fillStyle(FEN, 1); g.fillEllipse(W / 2, 330 + rise, 1300, 520);
        for (let i = 0; i < 70; i++) {
          g.fillStyle(rng() < 0.5 ? VEN_DARK : 0x0c1a0e, 0.6);
          g.fillEllipse(rng() * W, 200 + rng() * 380 + rise, 40 + rng() * 140, 10 + rng() * 30);
        }
        for (let i = 0; i < 6; i++) glow(g, 100 + rng() * (W - 200), 260 + rng() * 260 + rise, 30 + rng() * 30, VEN, 0.04, 3);
        for (let i = 0; i < 26; i++) {
          const a = Math.PI + (i / 25) * Math.PI;
          shard(g, W / 2 + Math.cos(a) * 640, 330 + rise + Math.sin(a) * 250, 60, 90 + rng() * 120, -Math.cos(a) * 30, rng() * 0.5);
        }
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 62, W, 70 + rise * 0.3);
        for (let x = 20; x < W; x += 30) plaque(g, x, 92 + rise * 0.3, 24, 8, rng);
        // The causeway, narrowing as it climbs.
        g.fillStyle(OBS.facet, 1); g.fillTriangle(W / 2 - 220, H, W / 2 + 220, H, W / 2, 150 + rise);
        g.fillStyle(OBS.glass, 1); g.fillTriangle(W / 2 - 180, H, W / 2 - 30, H, W / 2, 150 + rise);
        g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(W / 2 - 220, H, W / 2, 150 + rise); g.lineBetween(W / 2 + 220, H, W / 2, 150 + rise);
        for (let i = 1; i < 14; i++) {
          const f = Math.pow(i / 14, 1.6);
          const y = H - f * (H - 150 - rise), hw = 220 * (1 - f);
          g.lineStyle(1, OBS.glass, 1); g.lineBetween(W / 2 - hw, y, W / 2 + hw, y);
        }
        seam(g, [{ x: W / 2, y: H }, { x: W / 2 + 8, y: 420 }, { x: W / 2, y: 150 + rise }], 1.4, 0.6, 0.3, VEN);
        // Stills either side, dripping.
        still(g, 150, 520 + rise * 0.5, 1.6, rng); stillLive(g, 150, 520 + rise * 0.5, 1.6, t, 0);
        still(g, W - 190, 470 + rise * 0.5, 1.3, rng); stillLive(g, W - 190, 470 + rise * 0.5, 1.3, t, 1.1);
        // Mist rolling across, low.
        for (let i = 0; i < 7; i++) {
          g.fillStyle(MIST, 0.06);
          g.fillEllipse(((i * 210 + t * (30 + i * 6)) % (W + 400)) - 200, 360 + (i % 4) * 50 + rise, 420, 60);
        }
        cineHero(g, W / 2, 540 - ease(p) * 40, 20, k.hero.color, { back: true, t: k.T, walk: 1 });
        vignette(g, W, H, 0.6);
      },
    },
    {
      ms: 5200,
      enter: 'cut',
      cues: [{ at: 1800, sfx: 'curse-cast' }, { at: 1800, flash: 0x8a5cff }],
      lines: [{ who: 'The Ferryman', text: 'The Register of the Marked. Every name the Draught passed over — struck through, in a clerk\'s good hand.', color: '#c9b0ff' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        const pan = -ease(p) * 120;
        g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, H);
        // The wall: rows of plaques, buttresses between bays.
        for (let row = 0; row < 11; row++) {
          for (let col = 0; col < 11; col++) {
            const x = 40 + col * 96 + pan + (row % 2) * 10, y = 90 + row * 38;
            if (x < -60 || x > W + 60) continue;
            const fresh = row === 5 && col === 6;
            plaque(g, x, y, 80, 22, rng, fresh ? 0 : 1);
            if (fresh) {
              const s = ease(p, 0.3, 0.42);
              if (s > 0) seam(g, [{ x: x - 42, y: y + 2 }, { x: x - 42 + 84 * s, y: y - 1 }], 2.4, 1, 1 - s * 0.5, OBS.seam);
            }
          }
        }
        for (let b = 0; b < 4; b++) {
          const bx = 230 + b * 290 + pan;
          g.fillStyle(OBS.facet, 1); g.fillRect(bx - 16, 62, 32, H);
          g.fillStyle(OBS.sheen, 1); g.fillRect(bx - 16, 62, 9, H);
        }
        // The alembic in front, huge, its Draught glowing.
        const ax = 300 + pan * 0.4, ay = H - 40;
        glow(g, ax - 30, ay - 220, 160, VEN, 0.05, 3);
        alembic(g, ax, ay, 1.5, rng);
        alembicLive(g, ax, ay, 1.5, t);
        for (let i = 0; i < 5; i++) glassDrop(g, 600 + i * 70 + pan * 0.6, (t * 140 + i * 90) % H, 2.4, 0.6);
        g.fillStyle(MIST, 0.07); g.fillEllipse(W / 2, H - 70, W * 1.4, 120);
        vignette(g, W, H, 0.55);
      },
    },
    {
      ms: 4800,
      enter: 'cut',
      cues: [{ at: 400, sfx: 'crystal-chime' }, { at: 1900, sfx: 'crystal-chime' }, { at: 3300, sfx: 'boss-intro' }],
      lines: [{ who: 'Councilor Absalom Strike', text: 'An unregistered person. How irregular. Somebody fetch the quill.', color: '#9be04a' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const rng = k.rng();
        g.fillStyle(0x030205, 1); g.fillRect(0, 0, W, H);
        g.fillStyle(VEN_DEEP, 0.08); g.fillEllipse(W / 2, H - 80, W * 1.2, 220);
        // Six seats climbing away in a zig-zag, a mask before each, turning one by one.
        const spots = [
          { x: 180, y: 540, s: 0.95 }, { x: 790, y: 500, s: 0.85 }, { x: 260, y: 400, s: 0.7 },
          { x: 700, y: 360, s: 0.6 }, { x: 330, y: 290, s: 0.5 }, { x: 630, y: 260, s: 0.44 },
        ];
        for (let i = spots.length - 1; i >= 0; i--) {
          const sp = spots[i];
          councilSeat(g, sp.x, sp.y, sp.s, ORDER[i], rng);
          const turn = ease(p, i * 0.12, i * 0.12 + 0.18);
          const face = sp.x < W / 2 ? 1 : -1;
          const mx = sp.x + (1 - turn) * -face * 26 * sp.s;
          const my = sp.y - 150 * sp.s;
          // The councilor: a dark robed shape with the mask where a face should be.
          g.fillStyle(0x0c0a12, 1); g.fillTriangle(mx - 40 * sp.s, sp.y + 30 * sp.s, mx + 40 * sp.s, sp.y + 30 * sp.s, mx, my - 30 * sp.s);
          g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(mx + 40 * sp.s, sp.y + 30 * sp.s, mx, my - 30 * sp.s);
          councilMask(g, mx, my, 26 * sp.s, { slit: mixC(VEN_DARK, VEN, turn), glow: turn, alpha: 0.5 + turn * 0.5 });
        }
        for (let i = 0; i < 6; i++) {
          g.fillStyle(MIST, 0.06);
          g.fillEllipse(((i * 260 + t * 26) % (W + 400)) - 200, 470 + (i % 3) * 50, 460, 70);
        }
        vignette(g, W, H, 0.65);
      },
    },
  ],
};
