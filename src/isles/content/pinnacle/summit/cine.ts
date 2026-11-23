import Phaser from 'phaser';
import type { CutsceneDef, CutsceneKit } from '../../../IslesTypes';
import { cineHero, ease, mix, vignette, wash } from '../../../art/CineArt';
import { mixC } from '../../../art/IsleArt';
import { OBS, councilMask, crackPath, seam, starGlow, starfield, throne } from '../../../art/PinnacleArt';
import { BENCHES } from '../spec';
import { DUST, VOID, crownMould, ferryman, kingSeated, niche } from './art';

/**
 * `cine-throne` — first entry to the Crownless Hall: the walk up to the King.
 *
 *   1  THE DOOR     — the Door of Sixty Seals. Every seal wakes, one after another, gold; the disc
 *                     splits and swings in on starlight. The Ferryman stops at the threshold.
 *   2  THE NAVE     — one long dolly up the hall between sixty empty niches. As you pass them the
 *                     slits of masks that are not there wake and follow you.
 *   3  THE MOULDS   — tracking past the ten crown-moulds, each lit in turn as it crosses the light.
 *   4  THE STAIR    — silence. Low under the last stair, the throne black against the cracked shell.
 *   5  THE KING     — he does not rise. The slit of his mask lights; he turns his face to you.
 *   6  THE LAST STEP — wide, from behind you. The star flares through the crack. Black.
 */

const KING = 'The Obsidian King';
const KING_C = '#c9b0ff';
const FERRY = 'The Ferryman';
const FERRY_C = '#cfe4ff';

type G = Phaser.GameObjects.Graphics;
const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** A black-glass wall filling a rect: vertical panels, a lit facet in each, pale joints, a few violet cracks. */
function glassWall(g: G, x: number, y: number, w: number, h: number, panel: number, rng: () => number, cracks: number): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(x, y, w, h);
  for (let px = x; px < x + w; px += panel) {
    g.fillStyle(OBS.facet, 0.55); g.fillRect(px + panel * 0.58, y, panel * 0.3, h);
    g.lineStyle(1, OBS.edge, 0.22); g.lineBetween(px, y, px, y + h);
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(px + panel * 0.58, y, px + panel * 0.58, y + h);
  }
  for (let i = 0; i < cracks; i++) {
    const a = { x: x + rng() * w, y: y + rng() * h * 0.6 };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 160, y: a.y + 60 + rng() * 140 }, rng, 10, 6), 1.2, 0.7);
  }
}

// ── 1. THE DOOR ──────────────────────────────────────────────────────

const DOOR = { x: 480, y: 288, r: 172 };

/** One half of the Door of Sixty Seals, hinged at its outer edge; `swing` 0–1 turns it in, away from us. */
function doorHalf(g: G, side: -1 | 1, swing: number, litUntil: number, t: number): void {
  const hinge = DOOR.x + side * DOOR.r;
  const sx = 1 - swing * 0.9;
  const tx = (x: number): number => hinge + (x - hinge) * sx;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    pts.push(P(tx(DOOR.x + side * Math.cos(a) * DOOR.r), DOOR.y + Math.sin(a) * DOOR.r));
  }
  const shade = mixC(OBS.glass, OBS.facet, side > 0 ? 0.5 + swing * 0.3 : 0.15);
  g.fillStyle(shade, 1); g.fillPoints(pts, true);
  // Concentric rings of the seal, cut into the glass.
  for (const rr of [0.92, 0.7, 0.36]) {
    g.lineStyle(1.2, OBS.edge, 0.3 * sx + 0.1);
    g.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = -Math.PI / 2 + (i / 20) * Math.PI;
      const x = tx(DOOR.x + side * Math.cos(a) * DOOR.r * rr), y = DOOR.y + Math.sin(a) * DOOR.r * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }
  g.lineStyle(1.6, OBS.edge, 0.6); g.strokePoints(pts, false);
  // The seals: thirty masks to a half, round the outer ring, waking in turn.
  for (let i = 0; i < 30; i++) {
    const idx = side < 0 ? 59 - i : i;
    const a = -Math.PI / 2 + ((i + 0.5) / 30) * Math.PI;
    const mx = tx(DOOR.x + side * Math.cos(a) * DOOR.r * 0.81), my = DOOR.y + Math.sin(a) * DOOR.r * 0.81;
    const on = idx < litUntil;
    const flick = on ? Math.min(1, (litUntil - idx) / 3) : 0;
    councilMask(g, mx, my, 9 * (0.55 + sx * 0.45), {
      slit: mixC(OBS.seam, OBS.star, flick), glow: 0.3 + flick * 1.2, crack: flick * 0.7, alpha: 0.5 + sx * 0.5,
    });
  }
  // The cut edge, burning gold as it parts.
  const ex = tx(DOOR.x);
  seam(g, [{ x: ex, y: DOOR.y - DOOR.r }, { x: ex + side * 3, y: DOOR.y - 60 }, { x: ex - side * 2, y: DOOR.y + 40 }, { x: ex, y: DOOR.y + DOOR.r }],
    2, 0.4 + swing * 0.6, 0.5 + 0.5 * Math.sin(t * 6), OBS.star);
}

function shotDoor(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  glassWall(g, 0, 0, k.W, 470, 64, rng, 7);
  // The floor before the door, in perspective toward it.
  g.fillStyle(0x07060d, 1); g.fillRect(0, 462, k.W, k.H - 462);
  for (let i = -10; i <= 10; i++) { g.lineStyle(1, OBS.seam, 0.1); g.lineBetween(DOOR.x + i * 26, 462, DOOR.x + i * 150, k.H); }
  for (let j = 0; j < 7; j++) { const y = 462 + (j * j) * 4.2; g.lineStyle(1, OBS.edge, 0.12); g.lineBetween(0, y, k.W, y); }
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(0, 462, k.W, 462);
  // The frame: a ring of obsidian round the door, and the jamb-shards.
  g.fillStyle(0x000000, 0.6); g.fillCircle(DOOR.x, DOOR.y, DOOR.r + 26);
  g.fillStyle(OBS.facet, 1); g.fillCircle(DOOR.x, DOOR.y, DOOR.r + 20);
  g.lineStyle(2, OBS.edge, 0.6); g.strokeCircle(DOOR.x, DOOR.y, DOOR.r + 20);
  g.fillStyle(VOID, 1); g.fillCircle(DOOR.x, DOOR.y, DOOR.r + 2);
  // Every seal wakes, one after another.
  const litUntil = Math.max(0, (t - 0.5) / 0.04);
  const swing = ease(t, 3.4, 5.8);
  // Behind the door: the star's light, and the hall going away into it.
  if (swing > 0) {
    g.fillStyle(OBS.starDeep, 0.5 * swing); g.fillCircle(DOOR.x, DOOR.y, DOOR.r);
    g.fillStyle(OBS.star, 0.7 * swing); g.fillCircle(DOOR.x, DOOR.y, DOOR.r * 0.8);
    g.fillStyle(OBS.starCore, swing); g.fillCircle(DOOR.x, DOOR.y + 10, DOOR.r * 0.45);
    // The nave's far throne as a speck, black against it.
    g.fillStyle(0x000000, 0.8 * swing);
    g.fillTriangle(DOOR.x - 8, DOOR.y + 30, DOOR.x + 8, DOOR.y + 30, DOOR.x, DOOR.y + 4);
    g.fillRect(DOOR.x - 6, DOOR.y + 22, 12, 9);
  }
  doorHalf(g, -1, swing, litUntil, t);
  doorHalf(g, 1, swing, litUntil, t);
  // Before it opens, the star asleep in the middle of the seal, seen through the glass.
  if (swing < 1) starGlow(g, DOOR.x, DOOR.y, 5, t, (0.2 + Math.min(1, litUntil / 60) * 0.6) * (1 - swing));
  // The light spilling out over the floor, and two long shadows thrown back at us.
  if (swing > 0) {
    const gap = DOOR.r * 2 * swing * 0.9;
    g.fillStyle(OBS.star, 0.22 * swing);
    g.fillPoints([P(DOOR.x - gap / 2, 462), P(DOOR.x + gap / 2, 462), P(DOOR.x + gap * 1.6, k.H), P(DOOR.x - gap * 1.6, k.H)], true);
    g.fillStyle(OBS.starCore, 0.1 * swing);
    g.fillPoints([P(DOOR.x - gap / 4, 462), P(DOOR.x + gap / 4, 462), P(DOOR.x + gap * 0.8, k.H), P(DOOR.x - gap * 0.8, k.H)], true);
    g.fillStyle(0x000000, 0.45 * swing);
    g.fillPoints([P(492, 540), P(512, 540), P(560, k.H), P(520, k.H)], true);
    g.fillPoints([P(378, 556), P(396, 556), P(360, k.H), P(330, k.H)], true);
  }
  // The Ferryman at the threshold, who stops here; you, who do not.
  ferryman(g, 380, 556, 1.15, t);
  cineHero(g, 500, 520, 20, k.hero.color, { back: true, t });
  wash(g, k.W, k.H, OBS.star, 0.25 * ease(t, 4.4, 4.7) * (1 - ease(t, 4.7, 5.8)));
  vignette(g, k.W, k.H, 0.6);
}

// ── 2. THE NAVE ──────────────────────────────────────────────────────

const F = 320;
const VP = { x: 480, y: 250 };
const EYE = 1.7;
const HALF = 5;
const TALL = 9;
const proj = (X: number, Y: number, d: number): Phaser.Geom.Point => P(VP.x + (X * F) / d, VP.y + ((EYE - Y) * F) / d);

function shotNave(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  const cam = ease(k.p) * 5;
  const near = 0.9;
  const far = 46 - cam;
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  // The far wall: the shell, a crack of gold up it, the throne on its dais at the foot.
  const fw0 = proj(-HALF, TALL, far), fw1 = proj(HALF, 0, far);
  g.fillStyle(OBS.glass, 1); g.fillRect(fw0.x, fw0.y, fw1.x - fw0.x, fw1.y - fw0.y);
  const sc = F / far;
  starGlow(g, VP.x, fw0.y + (fw1.y - fw0.y) * 0.35, sc * 0.5, t, 0.7);
  seam(g, [{ x: VP.x, y: fw0.y }, { x: VP.x + sc * 0.3, y: fw0.y + (fw1.y - fw0.y) * 0.4 }, { x: VP.x - sc * 0.1, y: fw1.y - sc * 3 }], 1.5, 1, 0.6, OBS.star);
  throne(g, VP.x, fw1.y - sc * 0.6, sc / 66, { glow: 0.8, t });
  kingSeated(g, VP.x, fw1.y - sc * 0.6 - sc * 1.06, sc / 62, { t, wake: 0.4 });
  // Ceiling: the vault, cracked, the star showing through in lines of gold.
  g.fillStyle(0x0a0812, 1);
  g.fillPoints([proj(-HALF, TALL, near), proj(HALF, TALL, near), proj(HALF, TALL, far), proj(-HALF, TALL, far)], true);
  for (let i = 0; i < 9; i++) {
    const d0 = 4 + i * 4.6 - cam;
    if (d0 < near + 0.3) continue;
    const a = proj((rng() - 0.5) * 6, TALL, d0), b = proj((rng() - 0.5) * 8, TALL, d0 + 2 + rng() * 3);
    seam(g, crackPath({ x: a.x, y: a.y }, { x: b.x, y: b.y }, rng, 8, 5), Math.max(1, 8 / d0), 0.9, 0.4, OBS.star);
  }
  // Floor: polished glass, joints running to the far wall, cross-joints sliding under us.
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([proj(-HALF, 0, near), proj(HALF, 0, near), proj(HALF, 0, far), proj(-HALF, 0, far)], true);
  for (let X = -HALF; X <= HALF; X += 1.25) {
    const a = proj(X, 0, near), b = proj(X, 0, far);
    g.lineStyle(1, OBS.seam, 0.12); g.lineBetween(a.x, a.y, b.x, b.y);
  }
  for (let d = 1.6 - (cam % 1.6); d < far; d += 1.6) {
    if (d < near) continue;
    const a = proj(-HALF, 0, d), b = proj(HALF, 0, d);
    g.lineStyle(1, OBS.edge, Math.min(0.25, 2 / d)); g.lineBetween(a.x, a.y, b.x, b.y);
  }
  // The runner and the seam down its middle; the heartbeat comes down it toward us.
  g.fillStyle(0x050309, 0.8);
  g.fillPoints([proj(-0.9, 0, near), proj(0.9, 0, near), proj(0.9, 0, far), proj(-0.9, 0, far)], true);
  const s0 = proj(0, 0, near), s1 = proj(0, 0, far);
  seam(g, [{ x: s0.x, y: s0.y }, { x: s1.x, y: s1.y }], 1.4, 0.6);
  const beat = (t % 3.2) / 2.2;
  if (beat < 1) {
    const dB = mix(far, near + 0.5, beat ** 0.6);
    const a = proj(0, 0, dB + 3), b = proj(0, 0, dB);
    seam(g, [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], Math.max(1.4, 6 / dB), 1, 1, OBS.seamLit);
  }
  // Light falling through the vault onto the floor.
  for (const [ds, X] of [[7, -1.6], [13, 2.1], [20, -2.6], [28, 1.2], [36, -0.6]] as [number, number][]) {
    const d = ds - cam;
    if (d < near + 0.4) continue;
    const a = proj(X + 1.2, TALL, d - 0.6), b = proj(X + 2.0, TALL, d - 0.6), c = proj(X + 0.6, 0, d + 0.4), e = proj(X - 0.4, 0, d + 0.4);
    g.fillStyle(OBS.star, 0.07); g.fillPoints([a, b, c, e], true);
    const pool = proj(X + 0.1, 0, d + 0.4);
    g.fillStyle(OBS.star, 0.12); g.fillEllipse(pool.x, pool.y, (F / d) * 1.6, (F / d) * 0.35);
  }
  // The walls, and the sixty niches down them.
  for (const side of [-1, 1]) {
    const X = side * HALF;
    g.fillStyle(side < 0 ? OBS.glass : mixC(OBS.glass, OBS.facet, 0.35), 1);
    g.fillPoints([proj(X, 0, near), proj(X, TALL, near), proj(X, TALL, far), proj(X, 0, far)], true);
    for (let i = 29; i >= 0; i--) {
      const d = 2.4 + i * 1.45 - cam;
      if (d < near + 0.2) continue;
      const z1 = d, z2 = d + 0.75;
      // The stela's pale edge, then the recess.
      const e0 = proj(X, 0, z1 - 0.25), e1 = proj(X, 5.4, z1 - 0.25);
      g.lineStyle(Math.max(1, 3 / d), OBS.edge, 0.5); g.lineBetween(e0.x, e0.y, e1.x, e1.y);
      const r = [proj(X, 2.4, z1), proj(X, 2.4, z2), proj(X, 4.3, z2), proj(X, 4.8, (z1 + z2) / 2), proj(X, 4.3, z1)];
      g.fillStyle(VOID, 1); g.fillPoints(r, true);
      g.lineStyle(1, OBS.edge, Math.min(0.5, 3 / d)); g.strokePoints(r, true);
      const inlay = [proj(X, 0.25, z1), proj(X, 0.25, z2)];
      g.lineStyle(Math.max(1, 2 / d), BENCHES[Math.floor(i / 3)].color, 0.55); g.lineBetween(inlay[0].x, inlay[0].y, inlay[1].x, inlay[1].y);
      // The mask that is not there: a ghost in the dust, and a slit that wakes as you come level.
      const m = proj(X, 3.3, (z1 + z2) / 2);
      const ms = (F / d) * 0.45;
      const wake = ease(1 - (d - 1.2) / 5);
      g.lineStyle(1, DUST, 0.12 + wake * 0.1);
      g.strokePoints([P(m.x - ms * 0.4, m.y - ms), P(m.x, m.y - ms * 1.06), P(m.x + ms * 0.4, m.y - ms), P(m.x + ms * 0.6, m.y - ms * 0.2),
        P(m.x, m.y + ms), P(m.x - ms * 0.6, m.y - ms * 0.2)], true);
      if (wake > 0) {
        g.fillStyle(OBS.seam, 0.25 * wake); g.fillEllipse(m.x, m.y - ms * 0.2, ms * 1.4, ms * 0.35);
        g.fillStyle(OBS.seamLit, wake); g.fillRect(m.x - ms * 0.45, m.y - ms * 0.22, ms * 0.9, Math.max(1, ms * 0.07));
        g.fillStyle(0xffffff, wake); g.fillCircle(m.x - side * ms * 0.2 * wake, m.y - ms * 0.19, Math.max(1, ms * 0.06));
      }
    }
  }
  cineHero(g, 480, 520, 24, k.hero.color, { back: true, walk: 1, t });
  const title = ease(t, 0.6, 1.6) * (1 - ease(t, 4.2, 5.2));
  if (title > 0) {
    k.text(480, 96, 'THE CROWNLESS HALL', { size: 30, color: '#fff2d0', alpha: title, align: 0.5, spacing: 6 });
    k.text(480, 132, 'the top of the spire', { size: 14, color: '#c9b0ff', alpha: title * 0.8, align: 0.5, display: false });
  }
  vignette(g, k.W, k.H, 0.7);
}

// ── 3. THE MOULDS ────────────────────────────────────────────────────

function shotMoulds(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  const scroll = ease(k.p, 0, 1) * 0.85 + k.p * 0.15;
  // Back wall, with the niches passing slowly.
  glassWall(g, 0, 0, k.W, 400, 96, rng, 4);
  const back = scroll * 700;
  for (let i = 0; i < 18; i++) {
    const x = ((i * 70 - back) % 1260 + 1260) % 1260 - 120;
    niche(g, x, 390, 150, BENCHES[i % 10].color, rng);
  }
  g.fillStyle(0x000000, 0.35); g.fillRect(0, 0, k.W, 400);
  // The floor: glass, with the moulds standing in their own reflections.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 400, k.W, k.H - 400);
  for (let j = 0; j < 6; j++) { g.lineStyle(1, OBS.edge, 0.1 + j * 0.03); g.lineBetween(0, 404 + j * j * 5, k.W, 404 + j * j * 5); }
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(0, 400, k.W, 400);
  // The light the moulds pass through.
  g.fillStyle(OBS.star, 0.06);
  g.fillPoints([P(420, 0), P(520, 0), P(560, 560), P(400, 560)], true);
  g.fillStyle(OBS.star, 0.1); g.fillEllipse(480, 540, 220, 34);
  // Ten moulds, the isles in the order they fell.
  const S = 1.55;
  for (let i = 0; i < BENCHES.length; i++) {
    const b = BENCHES[i];
    const x = 330 + i * 240 - scroll * 2160;
    if (x < -120 || x > k.W + 120) continue;
    const shine = ease(1 - Math.abs(x - 480) / 200);
    // Its reflection, upside down and faint.
    g.fillStyle(b.color, 0.05 + shine * 0.08); g.fillEllipse(x, 556, 120 * S * 0.6, 20);
    crownMould(g, x, 540, S, b.isle, b.color, rng, shine);
  }
  // Motes in the light.
  for (let i = 0; i < 24; i++) {
    const f = (t * 0.05 + i * 0.043) % 1;
    g.fillStyle(OBS.starCore, 0.5 * Math.sin(f * Math.PI)); g.fillCircle(430 + ((i * 37) % 110) + Math.sin(t + i) * 8, f * 560, 1.3);
  }
  // Pillars sliding past in the foreground, dark.
  const fore = scroll * 2900;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 520 - fore) % 2080 + 2080) % 2080 - 300;
    g.fillStyle(0x020104, 1); g.fillRect(x, 0, 60, k.H);
    g.lineStyle(2, OBS.edge, 0.35); g.lineBetween(x + 60, 0, x + 60, k.H);
  }
  vignette(g, k.W, k.H, 0.6);
}

// ── 4. THE STAIR ─────────────────────────────────────────────────────

function shotStair(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  // The shell behind the throne, and the crack in it: the only warm light in the world.
  glassWall(g, 0, 0, k.W, 270, 80, rng, 3);
  const flare = 0.75 + 0.1 * Math.sin(t * 1.25);
  g.fillStyle(OBS.starDeep, 0.3); g.fillPoints([P(430, 0), P(540, 0), P(500, 270), P(470, 270)], true);
  g.fillStyle(OBS.star, 0.6); g.fillPoints([P(462, 0), P(506, 0), P(490, 220), P(478, 220)], true);
  starGlow(g, 482, 130, 16, t, flare);
  for (let i = 0; i < 10; i++) {
    const a = { x: 480 + (rng() - 0.5) * 30, y: 20 + rng() * 200 };
    seam(g, crackPath(a, { x: a.x + (i % 2 ? 1 : -1) * (120 + rng() * 300), y: a.y + (rng() - 0.4) * 90 }, rng, 12, 6), 1.4, 0.9, 0.4, OBS.star);
  }
  // Rays down the stair.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i - 3) * 0.2 + Math.sin(t * 0.4 + i) * 0.02;
    g.fillStyle(OBS.star, 0.045);
    g.fillTriangle(482, 130, 482 + Math.cos(a - 0.05) * 700, 130 + Math.sin(a - 0.05) * 700, 482 + Math.cos(a + 0.05) * 700, 130 + Math.sin(a + 0.05) * 700);
  }
  // The throne and the King on it: black against the light.
  throne(g, 480, 268, 0.9, { glow: 0.5, t });
  kingSeated(g, 480, 205, 0.78, { t, wake: 0.15 });
  // The stair, seen from its foot: risers tall and near, shrinking as they climb.
  let y = k.H;
  for (let i = 0; i < 11; i++) {
    const h = 80 * Math.pow(0.8, i);
    const w = 900 * Math.pow(0.92, i);
    const top = y - h;
    g.fillStyle(OBS.glass, 1); g.fillRect(480 - w / 2, top + h * 0.22, w, h * 0.78);
    g.fillStyle(OBS.facet, 1); g.fillRect(480 - w / 2, top, w, h * 0.22);
    g.lineStyle(1.4, OBS.edge, 0.55); g.lineBetween(480 - w / 2, top, 480 + w / 2, top);
    g.fillStyle(OBS.star, 0.05 + i * 0.012); g.fillRect(480 - w * 0.12, top, w * 0.24, h * 0.22);
    y = top;
  }
  // You, climbing.
  const climb = ease(k.p);
  cineHero(g, 480, 610 - climb * 110, 28, k.hero.color, { back: true, walk: 1, t });
  for (let i = 0; i < 20; i++) {
    const f = (t * 0.06 + i * 0.05) % 1;
    g.fillStyle(OBS.starCore, 0.4 * Math.sin(f * Math.PI)); g.fillCircle(300 + ((i * 53) % 360) + Math.sin(t * 0.7 + i) * 10, 140 + f * 420, 1.2);
  }
  vignette(g, k.W, k.H, 0.75);
}

// ── 5. THE KING ──────────────────────────────────────────────────────

function shotKing(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  const zoom = 1 + ease(k.p) * 0.08;
  const Z = (x: number, y: number): [number, number] => [480 + (x - 480) * zoom, 400 + (y - 400) * zoom];
  const wake = ease(t, 0.8, 2.2);
  const look = 0.55 * (1 - ease(t, 2.0, 3.4));
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  glassWall(g, 0, 0, k.W, k.H, 120, rng, 4);
  // The crack in the shell behind him, gold, brightening as he wakes.
  const [cx, cy] = Z(480, 150);
  g.fillStyle(OBS.starDeep, 0.25 + wake * 0.15); g.fillPoints([P(cx - 90, 0), P(cx + 110, 0), P(cx + 30, 330), P(cx - 20, 330)], true);
  g.fillStyle(OBS.star, 0.5 + wake * 0.2); g.fillPoints([P(cx - 30, 0), P(cx + 46, 0), P(cx + 10, 260), P(cx - 4, 260)], true);
  starGlow(g, cx, cy, 22 * zoom, t, 0.55 + wake * 0.35);
  for (let i = 0; i < 12; i++) {
    const a = { x: cx + (rng() - 0.5) * 50, y: rng() * 300 };
    seam(g, crackPath(a, { x: a.x + (i % 2 ? 1 : -1) * (150 + rng() * 320), y: a.y + (rng() - 0.3) * 120 }, rng, 14, 6), 1.6, 0.9, 0.3 + wake * 0.4, i % 4 === 0 ? OBS.seam : OBS.star);
  }
  const [tx, ty] = Z(480, 600);
  throne(g, tx, ty, 2.1 * zoom, { glow: 0.5 + wake * 0.5, t });
  const [kx, ky] = Z(480, 440);
  kingSeated(g, kx, ky, 2.0 * zoom, { t, wake, look });
  // Starlight sifting down past him.
  for (let i = 0; i < 30; i++) {
    const f = (t * 0.05 + i * 0.033) % 1;
    g.fillStyle(OBS.starCore, 0.45 * Math.sin(f * Math.PI)); g.fillCircle(120 + ((i * 97) % 720) + Math.sin(t * 0.5 + i) * 14, 70 + f * 500, 1.3);
  }
  vignette(g, k.W, k.H, 0.8);
}

// ── 6. THE LAST STEP ─────────────────────────────────────────────────

function shotLastStep(g: G, k: CutsceneKit): void {
  const rng = k.rng();
  const t = k.t;
  const flare = ease(t, 2.6, 4.2);
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, k.W, k.H);
  // The far wall, its crack, and the vault overhead with stars beyond its splits.
  glassWall(g, 140, 0, 680, 330, 68, rng, 3);
  starfield(g, 0, 0, k.W, 120, rng, 40, t);
  g.fillStyle(0x0a0812, 1); g.fillPoints([P(0, 0), P(140, 0), P(140, 330), P(0, 640)], true);
  g.fillPoints([P(k.W, 0), P(820, 0), P(820, 330), P(k.W, 640)], true);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const f = i / 6;
      const x = side < 0 ? mix(0, 140, f) : mix(k.W, 820, f);
      const y0 = mix(80, 140, f), y1 = mix(560, 330, f);
      g.lineStyle(1.4, OBS.edge, 0.2 + f * 0.2); g.lineBetween(x, y0, x, y1);
      g.fillStyle(VOID, 1); g.fillRect(x + (side < 0 ? 6 : -6 - 20 * (1 - f)) * 1, mix(200, 190, f), 20 * (1 - f) + 6, mix(70, 40, f));
    }
  }
  const W2 = 54 + flare * 30;
  g.fillStyle(OBS.starDeep, 0.25 + flare * 0.25); g.fillPoints([P(480 - W2, 0), P(480 + W2, 0), P(492, 330), P(470, 330)], true);
  g.fillStyle(OBS.star, 0.5 + flare * 0.4); g.fillPoints([P(468, 0), P(496, 0), P(486, 280), P(478, 280)], true);
  starGlow(g, 482, 120, 12 + flare * 10, t, 0.6 + flare * 0.5);
  // The dais steps.
  for (let i = 0; i < 6; i++) {
    const y = 470 - i * 24, w = 620 - i * 40;
    g.fillStyle(OBS.glass, 1); g.fillRect(480 - w / 2, y - 24, w, 24);
    g.fillStyle(OBS.facet, 1); g.fillRect(480 - w / 2, y - 24, w, 6);
    g.lineStyle(1.2, OBS.edge, 0.5); g.lineBetween(480 - w / 2, y - 24, 480 + w / 2, y - 24);
    g.fillStyle(OBS.star, 0.05 + flare * 0.08); g.fillRect(470 - w * 0.08, y - 24, w * 0.16, 6);
  }
  throne(g, 480, 336, 0.95, { glow: 0.6 + flare * 0.4, t });
  kingSeated(g, 480, 270, 0.82, { t, wake: 0.7 + flare * 0.3 });
  // You, at the foot of it, and your shadow running back toward the door.
  g.fillStyle(0x000000, 0.4); g.fillPoints([P(462, 560), P(498, 560), P(540, k.H), P(420, k.H)], true);
  cineHero(g, 480, 524, 34, k.hero.color, { back: true, t });
  wash(g, k.W, k.H, OBS.star, 0.12 * flare * (0.6 + 0.4 * Math.sin(t * 9)));
  vignette(g, k.W, k.H, 0.8);
  wash(g, k.W, k.H, 0x000000, ease(k.p, 0.82, 1));
}

export const CINE_THRONE: CutsceneDef = {
  id: 'cine-throne',
  shots: [
    {
      ms: 6500, enter: 'fade', draw: shotDoor,
      lines: [
        { who: FERRY, color: FERRY_C, text: 'Sixty seals, and every one of them broken. I have stood at this door before. Never with it open.' },
        { who: FERRY, color: FERRY_C, text: 'I will wait here. I always wait here. Go on — he has been expecting someone for a very long time.' },
      ],
      cues: [
        { at: 500, sfx: 'crystal-chime' }, { at: 1400, sfx: 'crystal-chime' }, { at: 2400, sfx: 'heartbeat' },
        { at: 3400, sfx: 'stone-rise', shake: 0.004, ms: 2200 }, { at: 4500, sfx: 'holy-chord' },
      ],
    },
    {
      ms: 7500, enter: 'white', draw: shotNave,
      lines: [
        { who: KING, color: KING_C, text: 'They hung their faces here when they came up to sit with me. The glass remembers where. So do I.' },
        { who: KING, color: KING_C, text: 'Walk in the middle. Everyone does. It does not help, but they all do it.' },
      ],
      cues: [{ at: 300, sfx: 'hush' }, { at: 2200, sfx: 'heartbeat' }, { at: 5400, sfx: 'heartbeat' }],
    },
    {
      ms: 7000, enter: 'cut', draw: shotMoulds,
      lines: [
        { who: KING, color: KING_C, text: 'Ten crowns. I made every one of them, and you have brought me the pieces.' },
        { who: KING, color: KING_C, text: 'I poured them here and let them cool in the dark. Not one ever fit a head. They were never meant to.' },
      ],
      cues: [{ at: 800, sfx: 'crystal-chime' }, { at: 3200, sfx: 'crystal-chime' }, { at: 5600, sfx: 'crystal-chime' }],
    },
    {
      ms: 5000, enter: 'fade', draw: shotStair,
      cues: [{ at: 200, sfx: 'heartbeat' }, { at: 2700, sfx: 'heartbeat' }],
    },
    {
      ms: 7500, enter: 'cut', draw: shotKing,
      lines: [
        { who: KING, color: KING_C, text: 'I was old when your sea was steam. I fell, it boiled, and it cooled around me. I have been patient since.' },
        { who: KING, color: KING_C, text: 'Your isles asked for order. I gave them monarchs. You bring them back to me broken. That is also order.' },
      ],
      cues: [{ at: 0, sfx: 'hush' }, { at: 900, sfx: 'beam-charge' }, { at: 2200, sfx: 'heartbeat' }],
    },
    {
      ms: 6000, enter: 'cut', draw: shotLastStep,
      lines: [
        { who: KING, color: KING_C, text: 'You will want to stand. Everyone who comes this far wants to stand. Come up to the last step, and no further.' },
      ],
      cues: [{ at: 300, sfx: 'heartbeat' }, { at: 2800, sfx: 'heartbeat' }, { at: 4200, sfx: 'boss-intro', shake: 0.003, ms: 900 }],
    },
  ],
};
