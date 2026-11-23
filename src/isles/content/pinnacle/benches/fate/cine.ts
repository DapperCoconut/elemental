import Phaser from 'phaser';
import type { CutsceneDef, CutsceneKit } from '../../../../IslesTypes';
import { OBS, councilMask, crackPath, seam, shard, starGlow } from '../../../../art/PinnacleArt';
import { glow } from '../../../../art/IsleArt';
import { cineHero, ease, vignette, wash } from '../../../../art/CineArt';
import { BENCHES, benchIntroId, seatId } from '../../spec';
import { type PocketState, councilSeat, chipStack, fusedDie, hourglass, wheelBowl, wheelSpin, type Emblem } from './art';
import { FELT_DEEP, FELT_GLOW, LOT_LILAC, ROUGE, ROUGE_DEEP } from './palette';

/**
 * `cine-bench-fate`: first entry to the Lot Bench. Three shots — the gaming floor revealed from
 * the top of the stair (dice fused into the walls, the hourglass hanging over the dark, the
 * wheel's glint far off), the Wheel of Sixty seen from above with the ball running its track,
 * and the six masks of the Lot turning, one after another, to look at the challenger.
 */

type G = Phaser.GameObjects.Graphics;
const B = BENCHES.find((b) => b.isle === 'fate')!;
const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** The Ferryman, as a hooded silhouette with his lantern. */
function ferryman(g: G, x: number, y: number, s: number, t: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 2, 40 * s, 10 * s);
  g.fillStyle(0x16141e, 1);
  g.fillPoints([pt(x - 16 * s, y), pt(x + 16 * s, y), pt(x + 9 * s, y - 46 * s), pt(x, y - 58 * s), pt(x - 9 * s, y - 46 * s)], true);
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x + 9 * s, y - 46 * s, x + 16 * s, y);
  g.fillStyle(0x05040a, 1); g.fillEllipse(x + 2 * s, y - 44 * s, 10 * s, 12 * s);
  // Lantern on a pole.
  g.lineStyle(2 * s, 0x2a2430, 1); g.lineBetween(x + 14 * s, y - 30 * s, x + 26 * s, y - 62 * s);
  const lx = x + 26 * s, ly = y - 56 * s + Math.sin(t * 2) * 1.5 * s;
  glow(g, lx, ly, 22 * s, 0xd8c8ff, 0.06, 3);
  g.fillStyle(0xe8e0ff, 1); g.fillRect(lx - 3 * s, ly - 4 * s, 6 * s, 8 * s);
}

/** Pocket state for the cinematic: lit where a seat has fallen anywhere on the spire. */
function pockets(k: CutsceneKit): (i: number) => PocketState {
  const st: PocketState[] = [];
  for (const b of BENCHES) for (const el of b.elements) st.push(k.test({ encounter: seatId(el) }) ? 2 : 1);
  return (i) => st[i] ?? 0;
}

/** Shot 1: the room revealed from the stair. */
function shotRoom(g: G, k: CutsceneKit): void {
  const { W, H, t } = k;
  const rng = k.rng();
  const push = ease(k.p);
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  // The floor: a glass plane running away to a dark far wall, felt lines converging.
  const hy = 250 - push * 20, vx = W / 2;
  g.fillStyle(OBS.glass, 1); g.fillPoints([pt(0, H), pt(W, H), pt(vx + 180, hy), pt(vx - 180, hy)], true);
  for (let i = -8; i <= 8; i++) {
    g.lineStyle(1, i % 4 === 0 ? FELT_GLOW : OBS.seam, i % 4 === 0 ? 0.25 : 0.14);
    g.lineBetween(vx + i * 22, hy, vx + i * 150, H);
  }
  for (let j = 1; j < 10; j++) {
    const f = Math.pow(j / 10, 1.8);
    const y = hy + (H - hy) * f;
    const half = 180 + (W / 2 - 180 + 200) * f;
    g.lineStyle(1, OBS.seam, 0.1 + f * 0.1); g.lineBetween(vx - half, y, vx + half, y);
  }
  // The far wall: a cliff of shards, violet in the cracks.
  for (let i = 0; i < 16; i++) shard(g, vx - 240 + i * 32 + rng() * 10, hy + 4, 30 + rng() * 20, 120 + rng() * 120, (rng() - 0.5) * 20, 0.15);
  seam(g, crackPath({ x: vx - 120, y: hy - 150 }, { x: vx - 60, y: hy }, rng, 10, 6), 1.4, 0.8, 0.3 + 0.3 * Math.sin(t * 2));
  // The wheel's far glint: an ellipse of pockets on the floor.
  g.fillStyle(0x05040a, 1); g.fillEllipse(vx, hy + 70, 260, 50);
  for (let i = 0; i < 30; i++) {
    const a = t * 0.4 + (i / 30) * Math.PI * 2;
    g.fillStyle(i % 2 ? ROUGE : OBS.facet, 0.9); g.fillCircle(vx + Math.cos(a) * 110, hy + 70 + Math.sin(a) * 20, 4);
  }
  // Dice fused into the side walls, nearer and larger.
  fusedDie(g, 70 - push * 30, H - 150, 170, [6, 5, 3], 1, rng, 0.8 + 0.2 * Math.sin(t * 3));
  fusedDie(g, W - 70 + push * 30, H - 170, 190, [2, 4, 1], -1, rng, 0.8 + 0.2 * Math.sin(t * 3 + 1));
  fusedDie(g, 210, hy + 110, 80, [3, 1, 5], 1, rng, 0.7);
  fusedDie(g, W - 210, hy + 100, 74, [4, 6, 2], -1, rng, 0.7);
  // The hourglass hanging over all of it, swaying.
  hourglass(g, vx + Math.sin(t * 0.8) * 6, 150 - push * 10, 0.75, 0.35 + t * 0.02, t, -20);
  // Chips spilled at the stair top, the hero, the Ferryman.
  for (let i = 0; i < 5; i++) chipStack(g, 330 + i * 70, H - 70 + (i % 2) * 8, 1 + (i % 3), i % 2 ? ROUGE : OBS.facet, 9);
  cineHero(g, vx, H - 96 - push * 30, 22, k.hero.color, { back: true, t, walk: 1 - push });
  ferryman(g, vx - 120, H - 70, 1.3, t);
  vignette(g, W, H, 0.55);
  if (k.p < 0.15) wash(g, W, H, 0x000000, 1 - k.p / 0.15);
}

/** Shot 2: the Wheel of Sixty from above. */
function shotWheel(g: G, k: CutsceneKit): void {
  const { W, H, t } = k;
  const rng = k.rng();
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(FELT_DEEP, 0.3); g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 20, R = 250 + ease(k.p) * 30;
  wheelBowl(g, cx, cy, R, rng);
  const rot = t * 0.5;
  // The ball runs the track and drops into a pocket of this bench at ~70% of the shot.
  const settle = ease(k.p, 0.45, 0.75);
  const target = (B.n - 1) * 6 + 2;
  const restA = rot + ((target + 0.5) / 60) * Math.PI * 2;
  const runA = -t * 3.2;
  const a = settle >= 1 ? restA : runA + (restA - runA) * settle;
  wheelSpin(g, cx, cy, R, rot, t, pockets(k), (B.n - 1) * 6, { a, k: 1 - settle, flare: settle >= 1 ? 0.5 + 0.5 * Math.sin(t * 6) : 0, pocket: target });
  vignette(g, W, H, 0.6);
}

/** Shot 3: six seats in the dark; the masks turn to look, one by one. */
function shotMasks(g: G, k: CutsceneKit): void {
  const { W, H, t } = k;
  const rng = k.rng();
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(ROUGE_DEEP, 0.12); g.fillRect(0, H * 0.55, W, H * 0.45);
  const emblems: Emblem[] = ['die', 'chip', 'hourglass', 'ticket', 'eye', 'flag'];
  for (let i = 0; i < 6; i++) {
    const x = 110 + i * 148, y = 520 - Math.abs(i - 2.5) * 14;
    councilSeat(g, x, y, 0.9, emblems[i], rng);
    // The councilor standing before it: a robed shape; the mask turning to face us.
    const turn = ease(k.p, 0.08 + i * 0.12, 0.2 + i * 0.12);
    g.fillStyle(0x14121c, 1);
    g.fillPoints([pt(x - 22, y + 30), pt(x + 22, y + 30), pt(x + 13, y - 40), pt(x - 13, y - 40)], true);
    g.lineStyle(1, OBS.edge, 0.3); g.lineBetween(x + 13, y - 40, x + 22, y + 30);
    g.fillStyle(0x0a0910, 1); g.fillCircle(x, y - 54, 15);
    if (turn > 0) {
      councilMask(g, x + (1 - turn) * 9, y - 56, 16 * (0.6 + 0.4 * turn), { slit: LOT_LILAC, alpha: turn, glow: turn });
      if (turn > 0.95) glow(g, x, y - 58, 26, LOT_LILAC, 0.03, 3);
    }
  }
  // Far above them, through a hairline in the ceiling, the first warm light.
  starGlow(g, W / 2, 40, 3, t, 0.4);
  vignette(g, W, H, 0.6);
}

export const FATE_BENCH_INTRO: CutsceneDef = {
  id: benchIntroId(B.id),
  music: 'boss',
  shots: [
    {
      ms: 5000, enter: 'fade', draw: shotRoom,
      cues: [{ at: 300, sfx: 'dice' }, { at: 2600, sfx: 'clock-tick' }],
      lines: [{ who: 'The Ferryman', text: 'Lotterhaven\'s bench. Every number in the Draw was chosen in this room, before the drum ever turned.' }],
    },
    {
      ms: 5200, enter: 'cut', draw: shotWheel,
      cues: [{ at: 0, sfx: 'dice' }, { at: 3800, sfx: 'crystal-chime' }],
      lines: [{ who: 'Councilor Sortes Quill', text: 'Sixty pockets, one for each of us. In all these years the ball has never once landed in ours.', color: '#e4c8ff' }],
    },
    {
      ms: 4600, enter: 'cut', draw: shotMasks,
      cues: [
        { at: 400, sfx: 'curse-cast' }, { at: 1500, sfx: 'curse-cast' }, { at: 2500, sfx: 'curse-cast' },
        { at: 3600, sfx: 'boss-intro', shake: 0.004, ms: 500 },
      ],
      lines: [{ who: 'Councilor Sortes Quill', text: 'Place your stake, challenger. The House has already counted it.', color: '#e4c8ff' }],
    },
  ],
};
