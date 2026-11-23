import type { CutsceneDef } from '../../../IslesTypes';
import { boat, cineHero, ease, mix, mixC, sea, sky, vignette, wash } from '../../../art/CineArt';
import { starfield } from '../../../art/PinnacleArt';
import { ferryman, rays, skiff } from '../../pinnacle/cine/art';
import { FP, KEY_METALS, MOOD, P, cinder, fallenKing, key } from '../art';
import { CINE_METEOR } from '../spec';
import { ashDrift, ladle, reef } from './art';

/**
 * `cine-meteor` — the locks. Played when the player turns sixty keys at the fallen star. Fallpoint from
 * the sea; the shell and its sixty eye-slits; the keys leave the player's hands and fly to their
 * locks; they turn themselves, all together; the shell splits; and a small figure sits up in the
 * light and, very politely, lodges an appeal.
 */
export const CINE_METEOR_DEF: CutsceneDef = {
  id: CINE_METEOR,
  music: 'title',
  shots: [
    // 1 — Fallpoint from the sea at night: a ring of glass, a hole in the sky.
    {
      ms: 8500,
      cues: [{ at: 400, sfx: 'splash' }, { at: 3800, sfx: 'splash' }],
      lines: [
        { text: 'The star had not gone out gently. What was left of it fell east of Brandmark, and boiled the sea to glass.' },
        { text: 'Sailors called the place Fallpoint, and steered wide of it, and looked up at the gap it left.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 360, 0x04060e, 0x161c34, 22);
        starfield(g, 0, 0, W, 330, r, 150, t);
        ladle(g, 600, 70, 1.3, t, 1);
        sea(g, W, 356, H, t, 0x060c1c, 0x2a3a6a, 0.6);
        reef(g, 480 - p * 20, 372, 560 + p * 60, t, k.rng(), 'sealed', 0.5);
        // Its light on the water.
        for (let i = 0; i < 6; i++) { g.fillStyle(MOOD.sealed.light, 0.06); g.fillEllipse(480 - p * 20 + Math.sin(t + i) * 8, 392 + i * 14, 120 - i * 12, 3 + i); }
        // The skiff rowing in from the left foreground.
        const sx = mix(120, 260, ease(p)), sy = 540;
        const stroke = Math.sin(t * 1.6);
        ferryman(g, sx - 34, sy - 10, 0.8, t, { row: stroke, face: 1 });
        cineHero(g, sx + 32, sy - 22, 13, k.hero.color, { face: 1, t });
        skiff(g, sx, sy, 1, t, 1, 1);
        g.fillStyle(0xffffff, 0.2 * Math.max(0, stroke)); g.fillEllipse(sx - 64, sy + 8, 30, 4);
        // A couple of onlookers' boats already drawn up at the reef.
        boat(g, 330, 384, 0.32, 0x5a4030, 0x8a9aa8, t, 1);
        boat(g, 650, 386, 0.3, 0x3a3a4a, 0xc8c0e0, t, -1);
        vignette(g, W, H, 0.55);
      },
    },
    // 2 — Close on the shell: thin black glass, sixty eye-slits, all watching.
    {
      ms: 8500,
      enter: 'cut',
      cues: [{ at: 500, sfx: 'hush' }, { at: 3600, sfx: 'heartbeat' }, { at: 6200, sfx: 'heartbeat' }],
      lines: [
        { text: 'It lay in the heart of the bowl, shelled over again in black glass, and shut with sixty locks.' },
        { text: 'One for every seat of the Council. Each cut in the shape of a mask’s eye-slit.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 300, 0x04060e, 0x1a1a30, 16);
        starfield(g, 0, 0, W, 280, r, 70, t);
        // The bowl floor sloping up and away behind it.
        sky(g, 0, 280, W, H - 280, mixFloor(0.1), mixFloor(0.6), 14);
        for (let i = 1; i < 8; i++) { g.lineStyle(2, 0x2a3a2a, 0.3); g.strokeEllipse(480, 560, 160 * i * 1.2, 40 * i * 1.1); }
        const s = mix(3.3, 3.7, ease(p));
        g.fillStyle(MOOD.sealed.wash, 0.06 + 0.03 * Math.sin(t)); g.fillEllipse(480, 520, 700, 300);
        cinder(g, 480, 590, s, { mood: 'sealed', t });
        vignette(g, W, H, 0.6);
      },
    },
    // 3 — The keys leave the player's hands and fly to their locks.
    {
      ms: 9500,
      enter: 'cut',
      cues: [
        { at: 600, sfx: 'chain' }, { at: 1800, sfx: 'sparkle' }, { at: 3400, sfx: 'crystal-chime' },
        { at: 5000, sfx: 'crystal-chime' }, { at: 6600, sfx: 'crystal-chime' },
      ],
      lines: [
        { text: 'Every prince and every monarch had handed over a key, and nobody had ever said what it opened.' },
        { text: 'They were the keys to their own sentences. One by one, they left the satchel on their own.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 260, 0x04060e, 0x1a1a30, 14);
        starfield(g, 0, 0, W, 240, r, 60, t);
        sky(g, 0, 250, W, H - 250, mixFloor(0.05), mixFloor(0.55), 14);
        const SX = 690, SY = 470;
        cinder(g, SX, SY, 2.2, { mood: 'sealed', t, keys: ease(p, 0.2, 0.95) });
        // The player from behind, lower left.
        const hx = 220, hy = 520;
        cineHero(g, hx, hy, 46, k.hero.color, { back: true, t, face: 1 });
        // The satchel at the hip, flap thrown back.
        g.fillStyle(0x5a4028, 1); g.fillRoundedRect(hx + 26, hy + 6, 40, 30, 6);
        g.fillStyle(0x7a5a3a, 1); g.fillPoints([P(hx + 26, hy + 8), P(hx + 66, hy + 8), P(hx + 60, hy - 10), P(hx + 32, hy - 12)], true);
        g.fillStyle(0xffd860, 0.15 + 0.1 * Math.sin(t * 3)); g.fillEllipse(hx + 46, hy + 6, 40, 14);
        // Sixty keys in flight: each leaves at its own moment, arcs high, spins, and slots in.
        for (let i = 0; i < 60; i++) {
          const start = 0.04 + (i / 60) * 0.72;
          const f = ease(p, start, start + 0.18);
          if (f <= 0 || f >= 1) continue;
          const tx = SX + (((i * 37) % 60) / 60 - 0.5) * 180, ty = SY - 30 - ((i * 13) % 4) * 36;
          const x = mix(hx + 46, tx, f);
          const y = mix(hy, ty, f) - Math.sin(f * Math.PI) * (120 + (i % 7) * 16);
          key(g, x, y, 1.1, t * 6 + i, KEY_METALS[i % KEY_METALS.length], 1, 1 - f);
          // Its trail.
          g.lineStyle(1, KEY_METALS[i % KEY_METALS.length], 0.2);
          const f0 = Math.max(0, f - 0.08);
          g.lineBetween(mix(hx + 46, tx, f0), mix(hy, ty, f0) - Math.sin(f0 * Math.PI) * (120 + (i % 7) * 16), x, y);
        }
        const flying = Math.round(ease(p, 0.2, 0.95) * 60);
        k.text(880, 90, `${flying} / 60`, { size: 18, color: '#d8d0ff', alpha: 0.7 * ease(p, 0.1, 0.25), align: 1, spacing: 4 });
        vignette(g, W, H, 0.55);
      },
    },
    // 4 — The turning: all sixty, together, a sweep of light round the shell.
    {
      ms: 8000,
      enter: 'cut',
      cues: [
        { at: 900, sfx: 'clock-tick' }, { at: 1500, sfx: 'clock-tick' }, { at: 2100, sfx: 'clock-tick' },
        { at: 2700, sfx: 'gear-turn' }, { at: 3600, sfx: 'clang' }, { at: 4600, sfx: 'clang', shake: 0.003, ms: 400 },
        { at: 6000, sfx: 'crystal-shatter', flash: 0xffe0a8, ms: 400 },
      ],
      lines: [{ text: 'Sixty keys turned together, as the Council had once signed together: without a word.' }],
      draw(g, k) {
        const { W, H, t, p } = k;
        const turned = ease(p, 0.12, 0.72);
        g.fillStyle(0x06060c, 1); g.fillRect(0, 0, W, H);
        const warm = ease(p, 0.6, 0.85);
        g.fillStyle(MOOD.open.wash, 0.08 * warm); g.fillEllipse(480, 360, 900, 600);
        cinder(g, 480, 760, 6.4, { mood: turned > 0.98 ? 'open' : 'sealed', t, keys: 1, turned });
        // The hairline seam between the halves goes white-hot at the end.
        if (warm > 0) {
          g.lineStyle(4, MOOD.open.core, warm); g.lineBetween(480, 760, 480, 760 - 84 * 6.4);
          g.lineStyle(18, MOOD.open.light, 0.2 * warm); g.lineBetween(480, 760, 480, 760 - 84 * 6.4);
        }
        vignette(g, W, H, 0.6);
      },
    },
    // 5 — The shell splits, and something small sits up in the light.
    {
      ms: 9000,
      enter: 'white',
      cues: [
        { at: 200, sfx: 'explosion-medium', shake: 0.006, ms: 700 }, { at: 1400, sfx: 'holy-chord' },
        { at: 4600, sfx: 'heartbeat' }, { at: 6400, sfx: 'whoosh' },
      ],
      lines: [
        { text: 'The shell came apart like a seed-case. The light that came out of it was warm, and not unkind.' },
        { text: 'And in the light, something no bigger than a man sat up, and brushed the ash from its sleeves.' },
      ],
      draw(g, k) {
        const r = k.rng();
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, 300, 0x0a0810, 0x2a1e1a, 16);
        starfield(g, 0, 0, W, 260, r, 60, t);
        sky(g, 0, 290, W, H - 290, 0x2a2a1e, 0x141810, 14);
        const split = ease(p, 0, 0.3);
        rays(g, 480, 470, Math.PI * 1.05, Math.PI * 1.95, 16, 560, MOOD.open.light, 0.08 * split, t);
        cinder(g, 480, 560, 3.6, { mood: 'open', t, keys: 1, turned: 1, split, king: ease(p, 0.25, 0.5), sitUp: ease(p, 0.45, 0.8) });
        ashDrift(g, W, H, t, k.rng(), 50, 0.7, split);
        wash(g, W, H, 0xffffff, 0.5 * (1 - ease(p, 0, 0.12)));
        vignette(g, W, H, 0.5);
      },
    },
    // 6 — The appeal, lodged politely.
    {
      ms: 12500,
      enter: 'fade',
      cues: [{ at: 600, sfx: 'hush' }, { at: 7400, sfx: 'judgement' }],
      lines: [
        { who: 'The Fallen King', text: 'Good evening. Forgive me for not rising. I am rather smaller than when we last met.' },
        { who: 'The Fallen King', text: 'You won on the facts. I do not dispute a single one of them. I appeal on the law.' },
        { who: 'The Fallen King', text: 'Hear the case again — with everything I should have sent the first time.' },
      ],
      draw(g, k) {
        const { W, H, t, p } = k;
        sky(g, 0, 0, W, H, 0x1a120c, 0x3a2414, 20);
        // Behind him the split shell rises like the two halves of a pulpit.
        g.fillStyle(MOOD.open.wash, 0.12); g.fillEllipse(480, 360, 700, 560);
        g.fillStyle(MOOD.open.light, 0.1); g.fillEllipse(480, 380, 360, 380);
        for (const side of [-1, 1]) {
          const x0 = 480 + side * 170;
          g.fillStyle(FP.shell, 1);
          g.fillPoints([P(x0, H), P(x0 + side * 160, H), P(x0 + side * 120, 200), P(x0 + side * 40, 120), P(x0 - side * 10, 260)], true);
          g.lineStyle(3, MOOD.open.light, 0.8); g.lineBetween(x0 - side * 10, 260, x0, H);
          g.lineStyle(1.5, 0x8f84b8, 0.5); g.lineBetween(x0 + side * 40, 120, x0 + side * 120, 200);
          // Keys in their locks down the halves.
          for (let i = 0; i < 6; i++) {
            const ky = 220 + i * 60, kx = x0 + side * (40 + i * 12);
            g.fillStyle(0x000000, 0.9); g.fillEllipse(kx, ky, 26, 8);
            g.fillStyle(MOOD.open.core, 0.9); g.fillTriangle(kx - 11, ky, kx + 11, ky, kx, ky - 3);
            key(g, kx, ky - 22, 1.5, -Math.PI / 2, KEY_METALS[i], 1, 0.5);
          }
        }
        const zoom = mix(4.2, 4.6, ease(p));
        fallenKing(g, 480, 600, zoom, { t, heat: 0.9, mood: 'open', sit: 0.15 });
        ashDrift(g, W, H, t, k.rng(), 30, 0.4, 0.6);
        vignette(g, W, H, 0.6);
      },
    },
    // 7 — Card: the appeal is lodged.
    {
      ms: 5500,
      enter: 'fade',
      full: true,
      cues: [{ at: 400, sfx: 'boss-intro' }],
      draw(g, k) {
        const { W, H, t } = k;
        g.fillStyle(0x050304, 1); g.fillRect(0, 0, W, H);
        g.fillStyle(MOOD.open.wash, 0.05 + 0.03 * Math.sin(t * 1.3)); g.fillEllipse(480, 330, 520, 160);
        cinder(g, 480, 470, 0.6, { mood: 'open', t, keys: 1, turned: 1, split: 1, king: 1, sitUp: 0.4 });
        k.text(480, 260, 'THE APPEAL IS LODGED', { size: 40, color: '#ffe0a8', alpha: ease(t, 0.4, 1.6), spacing: 10 });
        k.text(480, 312, 'step into the Fall from the fallen star, whenever you will hear it', { size: 14, color: '#c8b8a0', alpha: ease(t, 1.6, 2.8), display: false, spacing: 2 });
      },
    },
  ],
};

/** The bowl floor's colour at depth 0–1 (near rim … the heart). */
const mixFloor = (f: number): number => mixC(0x1a2a1c, 0x0e140e, f);
