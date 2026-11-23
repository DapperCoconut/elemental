import type Phaser from 'phaser';
import type { BossEntry, BossEntryKit } from '../../../../boss/framework/BossDefs';
import { OBS, crackPath, seam, mixC } from '../../../art/PinnacleArt';
import { mulberry } from '../../../art/IsleArt';
import { CX, CY, OUTRO, RING_IN } from './starSky';
import { TAU, clamp, drawKingFigure, drawStar, halfMask, shellShard, sm } from './starArt';

/**
 * The two cinematics of Act III.
 *
 * STAR_ENTRY — the unshelling (~9.5 s). He walks to the middle of the hall and lets the sword
 * fall. The mask splits down its seam and drops away; under it his face is light. Light comes out
 * of every crack in him, then out of every crack in the floor as the hall fractures outward from
 * his feet; the shell flies off him in plates; white-out. When sight comes back the hall is gone —
 * its glass tumbling away into space — and in the middle of a forming ring of ice the star
 * ignites, unfurls its rays, opens its eyes, and gathers the last of its shell into orbit.
 *
 * KING_OUTRO — the star goes out (~7.2 s). No explosion: the rays draw in, he cools from gold to
 * ember, says one last quiet thing, folds to a point, and a single mote of light drifts down.
 */

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

const ENTRY_MS = 9500;
const SWAP = 0.55;
const SWAP_T = (ENTRY_MS * SWAP) / 1000;

/** Eighteen jagged cracks running out from the middle of the hall, fixed. */
const FRACTURES: P[][] = (() => {
  const rng = mulberry(1601);
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * TAU + (rng() - 0.5) * 0.25;
    return crackPath({ x: 0, y: 0 }, { x: Math.cos(a) * 720, y: Math.sin(a) * 720 }, rng, 26, 10);
  });
})();
/** Short branches off the main cracks. */
const BRANCHES: { from: number; at: number; pts: P[] }[] = (() => {
  const rng = mulberry(1602);
  const out: { from: number; at: number; pts: P[] }[] = [];
  FRACTURES.forEach((f, i) => {
    for (let b = 0; b < 2; b++) {
      const at = 2 + Math.floor(rng() * 6);
      const p0 = f[at];
      const a = Math.atan2(p0.y, p0.x) + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.5);
      const len = 60 + rng() * 120;
      out.push({ from: i, at, pts: crackPath(p0, { x: p0.x + Math.cos(a) * len, y: p0.y + Math.sin(a) * len }, rng, 10, 4) });
    }
  });
  return out;
})();
/** The hall's glass, flung into space after the white-out. */
const DEBRIS: { a: number; r0: number; v: number; s: number; spin: number }[] = (() => {
  const rng = mulberry(1603);
  return Array.from({ length: 34 }, () => ({ a: rng() * TAU, r0: 60 + rng() * 260, v: 120 + rng() * 260, s: 8 + rng() * 22, spin: (rng() - 0.5) * 4 }));
})();
/** Light-beams out of his cracks. */
const BEAMS: { a: number; w: number; at: number }[] = (() => {
  const rng = mulberry(1604);
  return Array.from({ length: 16 }, (_, i) => ({ a: i * 2.39996 + rng() * 0.3, w: 5 + rng() * 9, at: 1.7 + i * 0.17 }));
})();

/** Where he stands while the entry paints him: he walks to the middle in the first 1.4 s. */
const kingAt = (k: BossEntryKit, T: number): P => {
  const e = sm(T, 0, 1.4);
  return { x: k.fromX + (CX - k.fromX) * e, y: k.fromY + (CY - k.fromY) * e };
};

/** The black-glass sword, rotated about its middle. */
function sword(g: G, x: number, y: number, rot: number, alpha: number): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pt = (px: number, py: number): P => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  g.fillStyle(0x000000, 0.35 * alpha); g.fillEllipse(x + 4, y + 6, 90, 14);
  g.fillStyle(OBS.sheen, alpha); g.fillPoints([pt(-4, -40), pt(4, -40), pt(3, 30), pt(0, 40), pt(-3, 30)], true);
  g.lineStyle(1, OBS.edge, 0.8 * alpha); g.strokePoints([pt(-4, -40), pt(4, -40), pt(3, 30), pt(0, 40), pt(-3, 30)], true);
  g.lineStyle(1.2, OBS.seamLit, 0.9 * alpha); const a = pt(0, -36), b = pt(0, 32); g.lineBetween(a.x, a.y, b.x, b.y);
  g.fillStyle(OBS.edge, alpha); g.fillPoints([pt(-13, -42), pt(13, -42), pt(13, -38), pt(-13, -38)], true);
  g.fillStyle(OBS.glass, alpha); g.fillPoints([pt(-2, -42), pt(2, -42), pt(2, -56), pt(-2, -56)], true);
  const pm = pt(0, -59); g.fillStyle(OBS.seam, alpha); g.fillCircle(pm.x, pm.y, 3.5);
}

/** The floor fracturing radially from under him (over the hall, under the fighters). */
function drawFractures(g: G, ox: number, oy: number, T: number): void {
  const grow = sm(T, 1.4, 4.6);
  if (grow <= 0) return;
  const gold = sm(T, 2.4, 4.4);
  const color = mixC(OBS.seam, OBS.star, gold);
  const width = 1.4 + gold * 3.2;
  // Light welling up under the floor round him.
  g.fillStyle(OBS.star, 0.1 * gold); g.fillCircle(ox, oy, 80 + grow * 220);
  g.fillStyle(OBS.starCore, 0.12 * gold); g.fillCircle(ox, oy, 40 + grow * 90);
  FRACTURES.forEach((f, i) => {
    const kk = clamp(grow * 1.25 - (i % 3) * 0.08, 0, 1);
    const n = Math.max(2, Math.ceil(kk * (f.length - 1)) + 1);
    seam(g, f.slice(0, n).map((p) => ({ x: ox + p.x, y: oy + p.y })), width, 1, gold, color);
  });
  for (const b of BRANCHES) {
    const kk = clamp(grow * 1.25 - (b.from % 3) * 0.08, 0, 1);
    if (kk * (FRACTURES[b.from].length - 1) < b.at + 1) continue;
    seam(g, b.pts.map((p) => ({ x: ox + p.x, y: oy + p.y })), width * 0.6, 0.85, gold * 0.6, color);
  }
  // Plates of floor between the cracks lifting and parting, light under every seam.
  const lift = sm(T, 3.5, 5.2);
  if (lift > 0) {
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * TAU, a1 = ((i + 1) / 18) * TAU;
      const am = (a0 + a1) / 2;
      const push = lift * (14 + (i % 4) * 8);
      const dx = Math.cos(am) * push, dy = Math.sin(am) * push;
      const pts = [
        { x: ox + Math.cos(a0) * 70 + dx, y: oy + Math.sin(a0) * 70 + dy }, { x: ox + Math.cos(a0) * 170 + dx, y: oy + Math.sin(a0) * 170 + dy },
        { x: ox + Math.cos(a1) * 170 + dx, y: oy + Math.sin(a1) * 170 + dy }, { x: ox + Math.cos(a1) * 70 + dx, y: oy + Math.sin(a1) * 70 + dy },
      ];
      g.fillStyle(OBS.starCore, 0.4 * lift);
      g.fillTriangle(ox, oy, ox + Math.cos(a0) * 190, oy + Math.sin(a0) * 190, ox + Math.cos(a1) * 190, oy + Math.sin(a1) * 190);
      g.fillStyle(i % 2 ? OBS.glass : OBS.facet, 1); g.fillPoints(pts, true);
      g.lineStyle(1.5, OBS.star, 0.8 * lift); g.strokePoints(pts, true);
    }
  }
}

/** THE UNSHELLING. See the file comment. */
export const STAR_ENTRY: BossEntry = {
  ms: ENTRY_MS,
  swapAt: SWAP,
  bodyTo: { x: CX, y: CY },
  hideBody: true,
  cues: [
    { at: 0, sfx: 'boss-phase', say: 'Enough.' },
    { at: 950, sfx: 'clang' },
    { at: 1700, sfx: 'crystal-shatter', shake: 0.004, ms: 600, say: 'You wanted to know what was under the glass.' },
    { at: 2900, sfx: 'ice-shatter' },
    { at: 3500, sfx: 'quake', shake: 0.008, ms: 1700 },
    { at: 4300, sfx: 'beam-charge' },
    { at: 5150, sfx: 'explosion-large', flash: 0xffffff, ms: 1100, shake: 0.022 },
    { at: 6300, sfx: 'holy-chord' },
    { at: 7000, banner: 'THE STAR UNSHELLED', sfx: 'boss-intro' },
    { at: 7700, sfx: 'sparkle', say: 'I fell into your sea before it had a name. Look at me.' },
  ],
  drawGround(g, k) {
    const T = k.t / 1000;
    RING_IN.k = T < SWAP_T ? 0 : sm(T, SWAP_T + 0.2, 8.6);
    if (T >= SWAP_T) return;
    const at = kingAt(k, T);
    drawFractures(g, at.x, at.y, T);
    // The sword where it fell.
    if (T > 0.55) {
      const f = sm(T, 0.55, 0.95);
      sword(g, at.x + 46 + f * 14, at.y + 10 + f * 26, -0.15 + f * 1.45, 1);
    }
    // The mask's halves, where they landed.
    const mf = sm(T, 1.7, 2.9);
    if (mf > 0) {
      for (const side of [-1, 1] as const) {
        halfMask(g, at.x + side * (8 + mf * 44), at.y - 6 + mf * 58, 22, side, side * mf * 1.4, 1 - sm(T, 4.2, 5.0) * 0.6, 1 - mf * 0.5);
      }
    }
  },
  drawOver(g, k) {
    const T = k.t / 1000;
    const W = k.W, H = k.H;
    if (T < SWAP_T) {
      const at = kingAt(k, T);
      const light = sm(T, 2.0, 4.8);
      // Beams out of every crack in him.
      for (const b of BEAMS) {
        const e = sm(T, b.at, b.at + 0.5);
        if (e <= 0) continue;
        const a = b.a + Math.sin(T * 0.6 + b.a) * 0.12;
        const len = 1100 * e;
        const w = b.w * (1 + light * 2);
        const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
        g.fillStyle(OBS.star, 0.14 + 0.1 * light);
        g.fillTriangle(at.x + px * w, at.y + py * w, at.x - px * w, at.y - py * w, at.x + Math.cos(a) * len, at.y + Math.sin(a) * len);
        g.fillStyle(OBS.starCore, 0.35);
        g.fillTriangle(at.x + px * w * 0.25, at.y + py * w * 0.25, at.x - px * w * 0.25, at.y - py * w * 0.25, at.x + Math.cos(a) * len * 0.8, at.y + Math.sin(a) * len * 0.8);
      }
      // Him — the armour, the crack running, the mask until it goes.
      const crack = sm(T, 0.4, 1.7);
      const shake = T > 0.9 && T < 1.7 ? Math.sin(T * 70) * 1.5 : 0;
      if (T < 4.6) drawKingFigure(g, at.x + shake, at.y, T, { crack, maskOn: T < 1.7, light, sword: T < 0.55 });
      // The sword as it falls.
      if (T >= 0.55 && T < 0.95) {
        const f = sm(T, 0.55, 0.95);
        sword(g, at.x + 46 + f * 14, at.y - 10 + f * 46, -0.15 + f * 1.45, 1);
      }
      // The mask splitting down its seam and dropping away.
      if (T >= 1.7 && T < 2.9) {
        const mf = sm(T, 1.7, 2.9);
        for (const side of [-1, 1] as const) halfMask(g, at.x + side * (8 + mf * 44), at.y - 6 + mf * 58, 22, side, side * mf * 1.4, 1, 1);
      }
      // The shell comes off him in plates.
      const fly = sm(T, 3.6, 5.2);
      if (fly > 0) {
        for (let i = 0; i < 14; i++) {
          const a = i * 0.45 + i * i * 0.13;
          const d = 40 + (T - 3.6) * 300 * (0.6 + (i % 3) * 0.25);
          shellShard(g, at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 9 + (i % 4) * 3, T * (2 + i % 3) + i, a + Math.PI);
        }
      }
      // He becomes the light.
      const disc = sm(T, 3.8, SWAP_T);
      if (disc > 0) {
        g.fillStyle(OBS.star, 0.5 * disc); g.fillCircle(at.x, at.y, 40 + disc * 520);
        g.fillStyle(OBS.starCore, 0.8 * disc); g.fillCircle(at.x, at.y, 30 + disc * 300);
        g.fillStyle(0xffffff, disc); g.fillCircle(at.x, at.y, 20 + disc * 140);
      }
    } else {
      // Space. The hall's glass tumbling away into it.
      const dt = T - SWAP_T;
      const fade = 1 - sm(T, SWAP_T + 1.5, 8.6);
      for (const d of DEBRIS) {
        const r = d.r0 + dt * d.v;
        const s = d.s * (1 - sm(T, SWAP_T, 9));
        if (s < 0.6 || fade <= 0) continue;
        shellShard(g, CX + Math.cos(d.a) * r, CY + Math.sin(d.a) * r, s, d.spin * dt + d.a, d.a + Math.PI, fade);
      }
      // The star ignites at the heart of it.
      drawStar(g, CX, CY, k.time / 1000, {
        scale: 0.12 + 0.88 * sm(T, 5.6, 7.6),
        heat: 0.3 + 0.7 * sm(T, 5.4, 7.0),
        rays: sm(T, 6.6, 8.8),
        face: sm(T, 7.2, 8.6),
        shell: sm(T, 7.6, 9.2),
        facing: Math.atan2(k.player.y - CY, k.player.x - CX),
      });
      // The last fragments of shell drawn in from the debris, settling into orbit.
      const settle = sm(T, 6.8, 9.2);
      if (settle > 0 && settle < 1) {
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + (1 - settle) * 3;
          const d = 125 + (1 - settle) * 260;
          shellShard(g, CX + Math.cos(a) * d, CY + Math.sin(a) * d, 8, T * 2 + i, a + Math.PI, (1 - settle) * 0.9);
        }
      }
    }
    // White-out — and the slow return of sight.
    const white = T < SWAP_T + 0.35 ? sm(T, 4.4, SWAP_T) : 1 - sm(T, SWAP_T + 0.35, 7.0);
    if (white > 0) {
      g.fillStyle(0xfffbea, white); g.fillRect(0, 0, W, H);
      g.fillStyle(0xffffff, white * 0.6); g.fillRect(0, 0, W, H);
    }
  },
};

/** Six fragments of shell drifting off as he goes out; the mask-half sinks. */
function driftingShell(g: G, T: number, t: number): void {
  const go = sm(T, 0.4, 5.0);
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? -1 : 1;
    const a = t * 0.28 * dir * (1 - go) + (i / 6) * TAU + i * 0.4;
    const rr = 120 + go * (90 + i * 24);
    const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr + (i === 5 ? go * 80 : 0);
    const alpha = 1 - sm(T, 3.0, 6.0);
    if (alpha <= 0) continue;
    shellShard(g, x, y, 8 + (i % 3) * 2, t * 0.3 + i, a + Math.PI, alpha);
  }
}

/** HIS FALL. See the file comment. */
export const KING_OUTRO: BossEntry = {
  ms: 7200,
  hideBody: true,
  cues: [
    { at: 200, sfx: 'hush' },
    { at: 1100, say: 'Ah. Quiet... I had forgotten the dark was so kind. Let them have their dawn.' },
    { at: 2600, sfx: 'heartbeat' },
    { at: 4200, sfx: 'heartbeat' },
    { at: 5300, sfx: 'sparkle' },
  ],
  drawOver(g, k) {
    const T = k.t / 1000;
    const t = k.time / 1000;
    OUTRO.k = sm(T, 0.3, 5.4);
    driftingShell(g, T, t);
    const fold = sm(T, 4.6, 5.4);
    if (fold < 1) {
      drawStar(g, CX, CY, t, {
        scale: 1 - fold * 0.92,
        rays: 1 - sm(T, 0.2, 3.0),
        heat: 1 - sm(T, 0.5, 4.6) * 0.7,
        gutter: sm(T, 0.4, 4.6) * 0.8,
        face: 1 - sm(T, 3.6, 4.6),
        shell: 0,
        facing: Math.atan2(k.player.y - CY, k.player.x - CX),
      });
    }
    // Folded to a point: one glint.
    const glint = sm(T, 5.0, 5.3) * (1 - sm(T, 5.4, 6.0));
    if (glint > 0) {
      g.lineStyle(1.5, OBS.starCore, glint); g.lineBetween(CX - 60 * glint, CY, CX + 60 * glint, CY);
      g.lineStyle(1, OBS.starCore, glint * 0.7); g.lineBetween(CX, CY - 24 * glint, CX, CY + 24 * glint);
      g.fillStyle(0xffffff, glint); g.fillCircle(CX, CY, 3);
    }
    // A single mote of light, drifting down.
    if (T > 5.3) {
      const d = T - 5.3;
      const mx = CX + Math.sin(d * 1.7) * 10, my = CY + d * 32;
      const a = 1 - sm(T, 6.3, 7.2);
      g.fillStyle(OBS.star, 0.18 * a); g.fillCircle(mx, my, 9);
      g.fillStyle(OBS.starCore, 0.9 * a); g.fillCircle(mx, my, 2.4);
    }
  },
};
