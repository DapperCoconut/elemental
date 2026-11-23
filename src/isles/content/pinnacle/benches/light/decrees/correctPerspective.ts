import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';
import { SIDE, SIDE_CSS, WHO, alive, clamp, dist, fighterOf, onFloor } from './util';

/**
 * DECREE OF CORRECT PERSPECTIVE — Councilor Ludovic Varnish, Seat of the Likeness (Paint).
 *
 * He drafted the Portrait Clause — the Despot painted on every wall in full noon, life-size and
 * larger — and the rule of the Mural Court's perspective: what the Bench wants seen is drawn in
 * the foreground; what it does not, is pushed back toward the vanishing point until it is nothing.
 * Here the floor is the picture. A chalked perspective grid runs to one VANISHING POINT.
 *   - Near the point you are drawn small: you take as little as 60%.
 *   - Out in the foreground you are drawn huge: you take up to 140%.
 *   - The painter moves the point (its new place is chalked in first).
 *   - The point is pinned to the floor: strike it and it is drawn toward whoever struck it.
 * He paints from the back of the picture. The trick: he knows where the point is going, so he
 * leaves early — and while he walks across the picture he is, for a moment, very large.
 */

const CHALK = 0xf4efe2;
const MAX_D = 760;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const SHIFT = ctx.hard ? 9000 : 11000;
  const WARN = 2400;
  const GLIDE = 700;
  const vp = { x: W / 2, y: top + 70 };
  let next: { x: number; y: number } | null = null;
  let shiftAt = 0;
  let glideFrom: { x: number; y: number; at: number; to: { x: number; y: number }; ms: number } | null = null;
  let pullGate = 0;
  let started = false;
  let pin: StrikeTarget | null = null;

  const depth = (x: number, y: number) => clamp(dist(x, y, vp.x, vp.y) / MAX_D, 0, 1);
  const scaleAt = (x: number, y: number) => 0.6 + 0.8 * depth(x, y);

  const SPOTS = [
    { x: 120, y: top + 60 }, { x: W / 2, y: top + 60 }, { x: W - 120, y: top + 60 },
    { x: 110, y: (top + H) / 2 }, { x: W - 110, y: (top + H) / 2 },
    { x: 120, y: H - 60 }, { x: W / 2, y: H - 60 }, { x: W - 120, y: H - 60 }, { x: W / 2, y: (top + H) / 2 },
  ];

  function plan(now: number): void {
    const far = SPOTS.filter((s) => dist(s.x, s.y, vp.x, vp.y) > 320);
    next = far[Math.floor(rng() * far.length)] ?? SPOTS[0];
    shiftAt = now + ctx.tk.warn(WARN);
    ctx.banner('THE PAINTER MOVES THE POINT', '#f4efe2');
    ctx.sfx('sparkle');
  }

  function glide(to: { x: number; y: number }, ms: number): void {
    glideFrom = { x: vp.x, y: vp.y, at: ctx.scene.time.now, to: onFloor(ctx, to.x, to.y, 60), ms };
  }

  function struck(by: 'player' | 'npc'): void {
    const now = ctx.scene.time.now;
    if (now < pullGate || glideFrom) return;
    pullGate = now + 700;
    const f = fighterOf(ctx, by);
    const d = dist(f.x, f.y, vp.x, vp.y) || 1;
    const step = Math.min(120, d - 40);
    if (step <= 0) return;
    glide({ x: vp.x + ((f.x - vp.x) / d) * step, y: vp.y + ((f.y - vp.y) / d) * step }, 300);
    ctx.float(vp.x, vp.y - 30, 'DRAWN IN', SIDE_CSS[by]);
    ctx.sfx('whoosh');
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        shiftAt = time + SHIFT;
        pin = ctx.target({ x: vp.x, y: vp.y, r: 30, passThrough: true, onStruck: (by) => struck(by) });
      }
      if (!next && time >= shiftAt - ctx.tk.warn(WARN)) plan(time);
      if (next && time >= shiftAt) { glide(next, GLIDE); next = null; shiftAt = time + SHIFT; ctx.sfx('whoosh'); }
      if (glideFrom) {
        const k = clamp((time - glideFrom.at) / glideFrom.ms, 0, 1);
        const e = k * k * (3 - 2 * k);
        vp.x = glideFrom.x + (glideFrom.to.x - glideFrom.x) * e;
        vp.y = glideFrom.y + (glideFrom.to.y - glideFrom.y) * e;
        if (k >= 1) glideFrom = null;
      }
      pin?.moveTo(vp.x, vp.y);
    },

    playerTakenMult() { return scaleAt(ctx.player.x, ctx.player.y); },
    npcTakenMult() { return scaleAt(ctx.npc.x, ctx.npc.y); },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // He knows where the point is going and leaves for it early.
      const goal = next ?? vp;
      // Just off the point, on the side away from the player.
      const a = Math.atan2(goal.y - p.y, goal.x - p.x);
      const spot = onFloor(ctx, goal.x + Math.cos(a) * 46, goal.y + Math.sin(a) * 46, 50);
      return dist(n.x, n.y, spot.x, spot.y) > 18 ? spot : null;
    },

    destroy() { pin?.remove(); },

    drawGround(g, time) {
      const t = time / 1000;
      drawGrid(g, vp.x, vp.y, 1);
      if (next) {
        // The new point chalked in, its grid sketched faint and flickering.
        const k = clamp(1 - (shiftAt - time) / ctx.tk.warn(WARN), 0, 1);
        const flick = Math.floor(time / 110) % 2 ? 1 : 0.55;
        drawGrid(g, next.x, next.y, 0.35 * k * flick);
        chalkStar(g, next.x, next.y, 10 + k * 6, 0.5 * flick);
        g.lineStyle(1, CHALK, 0.4 * k);
        g.lineBetween(vp.x, vp.y, vp.x + (next.x - vp.x) * k, vp.y + (next.y - vp.y) * k);
      }
      // The vanishing point: a gold pin through a chalk star, rings of depth round it.
      g.lineStyle(1, CHALK, 0.25);
      for (const r of [MAX_D * 0.25, MAX_D * 0.5]) dashedCircle(g, vp.x, vp.y, r, t * 0.05);
      g.fillStyle(NOON.gold, 0.12); g.fillCircle(vp.x, vp.y, 30);
      chalkStar(g, vp.x, vp.y, 16, 0.95);
      g.fillStyle(NOON.brassDark, 1); g.fillCircle(vp.x, vp.y, 5);
      g.fillStyle(NOON.gold, 1); g.fillCircle(vp.x - 1, vp.y - 1, 3.4);
    },

    drawAir(g) {
      // How large the picture draws each fighter: a chalk outline round them, huge in the foreground.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const s = scaleAt(f.x, f.y);
        const r = 24 * s * 1.25;
        g.lineStyle(1.6, CHALK, 0.55); g.strokeCircle(f.x, f.y, r);
        g.lineStyle(1, SIDE[w], 0.6); g.strokeCircle(f.x, f.y, r + 3);
        // Two construction lines from the outline back to the point: the painter's rule.
        const a = Math.atan2(vp.y - f.y, vp.x - f.x);
        g.lineStyle(1, CHALK, 0.18);
        g.lineBetween(f.x + Math.cos(a + Math.PI / 2) * r, f.y + Math.sin(a + Math.PI / 2) * r, vp.x, vp.y);
        g.lineBetween(f.x + Math.cos(a - Math.PI / 2) * r, f.y + Math.sin(a - Math.PI / 2) * r, vp.x, vp.y);
      }
    },

    drawHud(g) {
      // Two little figures at the top: each side drawn at the size the picture has them now.
      const y = top + 22;
      g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(W / 2 - 80, y - 16, 160, 32, 8);
      g.lineStyle(1.5, NOON.brass, 0.9); g.strokeRoundedRect(W / 2 - 80, y - 16, 160, 32, 8);
      WHO.forEach((w, i) => {
        const f = fighterOf(ctx, w);
        const s = scaleAt(f.x, f.y);
        const x = W / 2 - 40 + i * 80;
        g.fillStyle(SIDE[w], 0.9); g.fillCircle(x, y + 2, 9 * s);
        g.lineStyle(1, CHALK, 0.8); g.strokeCircle(x, y + 2, 9 * s + 2);
      });
      g.lineStyle(1, CHALK, 0.5); g.lineBetween(W / 2, y - 10, W / 2, y + 12);
    },
  };

  /** A one-point perspective floor: horizon, orthogonals to every edge, transversals spaced as depth. */
  function drawGrid(g: G, px: number, py: number, a: number): void {
    // The horizon line through the point.
    g.lineStyle(1.5, CHALK, 0.28 * a); g.lineBetween(0, py, W, py);
    // Orthogonals: from the point to marks along all four edges.
    g.lineStyle(1, CHALK, 0.12 * a);
    for (let x = 0; x <= W; x += 80) { g.lineBetween(px, py, x, top); g.lineBetween(px, py, x, H); }
    for (let y = top; y <= H; y += 80) { g.lineBetween(px, py, 0, y); g.lineBetween(px, py, W, y); }
    // Transversals: lines parallel to the horizon, crowding in toward it.
    for (let i = 1; i < 11; i++) {
      const off = 9 * Math.pow(1.42, i);
      for (const s of [-1, 1]) {
        const y = py + s * off;
        if (y < top || y > H) continue;
        g.lineStyle(1, CHALK, (0.06 + i * 0.012) * a); g.lineBetween(0, y, W, y);
      }
    }
  }
}

/** A chalk star: five strokes, a little smudged. */
function chalkStar(g: G, x: number, y: number, r: number, a: number): void {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 5; i++) {
    const an = -Math.PI / 2 + ((i * 2) % 5) * ((Math.PI * 2) / 5);
    pts.push({ x: x + Math.cos(an) * r, y: y + Math.sin(an) * r });
  }
  g.lineStyle(3, CHALK, 0.25 * a); g.strokePoints(pts, false);
  g.lineStyle(1.4, CHALK, a); g.strokePoints(pts, false);
}

function dashedCircle(g: G, x: number, y: number, r: number, phase: number): void {
  const n = Math.max(12, Math.floor(r / 14));
  for (let i = 0; i < n; i += 2) {
    const a0 = phase + (i / n) * Math.PI * 2, a1 = phase + ((i + 1) / n) * Math.PI * 2;
    g.beginPath(); g.arc(x, y, r, a0, a1, false); g.strokePath();
  }
}

export const CORRECT_PERSPECTIVE: GimmickDef = {
  id: 'bench-light-correct-perspective',
  rules: 'The picture has one vanishing point: who stands near it is drawn small and hard to hurt, who stands in the foreground is drawn large.',
  make,
};
