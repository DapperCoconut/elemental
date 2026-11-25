import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { shadow, type G } from '../../../../../art/IsleArt';
import { BOX, BOX_DARK, BOX_LIT, GRAVEL, GRAVEL_DARK, LEAF, STEM, VERDIGRIS, VERDIGRIS_LIT } from '../palette';
import { alive, clamp } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Knot Re-Tied — Sister Wormwood of the knot garden, who in the King's telling taught the court's
 * children the knots: over, under, and never out of your own bed.
 *
 * The floor is a knot garden: ribbons of clipped box laid in a pattern, waist-high. The box is a
 * wall — no one walks through it and no shot gets over it — so every knot is a maze of little rooms
 * with gaps between them. Every few seconds she re-ties the knot. The new pattern shows first as a
 * line of green shoots; then it springs up all at once, and whoever stands on a shoot is thrown
 * aside, cut, and held in the twigs a moment; the old box is clipped away.
 *
 * At the heart of the knot is its bow — a verdigris tie. Strike it while the shoots are showing and
 * the new knot springs up *now*, before anyone has stepped clear: time it on her. From half, every
 * new knot also lays one ribbon straight through wherever you stand.
 */

const ID = fallenId('bloom', 'knot-retied');
const HEDGE_HALF = 11;
const BODY = 20;
const SHOOT_MS = 1500;

type Line = Pt[];

/** A ring of box from a0 to a1 (radians), sampled into a ribbon. */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, rot: number): Line {
  const pts: Line = [];
  const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 0.2));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push({ x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) });
  }
  return pts;
}

/** The three knots she ties, each with deliberate gaps (the paths between the rooms). */
function knot(kind: number, cx: number, cy: number, rot: number): Line[] {
  const out: Line[] = [];
  const GAP = 0.55;
  if (kind === 0) {
    // Quatrefoil: four lobes round a ring, each lobe open on its outer side.
    out.push(...[0, 1, 2, 3].map((q) => arc(cx, cy, 150, 110, q * Math.PI / 2 + GAP / 2, (q + 1) * Math.PI / 2 - GAP / 2, rot)));
    for (let q = 0; q < 4; q++) {
      const a = q * Math.PI / 2 + Math.PI / 4 + rot;
      const lx = cx + Math.cos(a) * 250, ly = cy + Math.sin(a) * 160;
      out.push(arc(lx, ly, 90, 70, a + Math.PI * 0.75, a + Math.PI * 1.25 + Math.PI, 0));
    }
  } else if (kind === 1) {
    // Lover's knot: two rings crossing, each broken where it crosses the other.
    for (const s of [-1, 1]) {
      const ox = cx + s * 120 * Math.cos(rot), oy = cy + s * 120 * Math.sin(rot);
      out.push(arc(ox, oy, 175, 135, rot + (s > 0 ? Math.PI : 0) + 0.7, rot + (s > 0 ? Math.PI : 0) + Math.PI * 2 - 0.7, 0));
    }
    out.push(arc(cx, cy, 340, 200, rot + 0.3, rot + Math.PI - 0.3, 0), arc(cx, cy, 340, 200, rot + Math.PI + 0.3, rot + Math.PI * 2 - 0.3, 0));
  } else {
    // Lattice: diagonal ribbons both ways, broken every so often.
    for (const sgn of [-1, 1]) {
      for (let k = -2; k <= 2; k++) {
        const a = Math.PI / 4 * sgn + rot;
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        const ox = cx + nx * k * 170, oy = cy + ny * k * 170;
        for (const [t0, t1] of [[-420, -150], [-90, 90], [150, 420]]) {
          out.push([{ x: ox + ux * t0, y: oy + uy * t0 }, { x: ox + ux * t1, y: oy + uy * t1 }]);
        }
      }
    }
  }
  return out;
}

/** Nearest distance from a point to a ribbon, and the closest point on it. */
function near(px: number, py: number, line: Line): { d: number; x: number; y: number } {
  let best = { d: 1e9, x: px, y: py };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / l2, 0, 1);
    const x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(px - x, py - y);
    if (d < best.d) best = { d, x, y };
  }
  return best;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const inside = (l: Line) => l.map((p) => ({ x: clamp(p.x, 30, W - 30), y: clamp(p.y, top + 10, H - 20) }));
  let hedges: Line[] = [];
  let shoots: Line[] = [];
  let clippings: { lines: Line[]; at: number } | null = null;
  let shootAt = 0;
  let growAt = 0;
  let nextTie = 0;
  let turned = false;
  let kind = 0;
  let bow: StrikeTarget | null = null;

  function lay(time: number): void {
    kind = (kind + 1 + Math.floor(rng() * 2)) % 3;
    shoots = knot(kind, cx + (rng() - 0.5) * 120, cy + (rng() - 0.5) * 60, rng() * Math.PI).map(inside);
    if (turned && alive(player)) {
      // A ribbon through where you stand, across the line between you.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.PI / 2;
      shoots.push(inside([{ x: player.x - Math.cos(a) * 130, y: player.y - Math.sin(a) * 130 }, { x: player.x + Math.cos(a) * 130, y: player.y + Math.sin(a) * 130 }]));
    }
    shootAt = time;
    growAt = time + tk.warn(SHOOT_MS);
    ctx.sfx('spore');
  }

  function grow(time: number): void {
    clippings = { lines: hedges, at: time };
    hedges = shoots;
    shoots = [];
    growAt = 0;
    ctx.sfx('stone-rise');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const hit = hedges.map((l) => near(f.x, f.y, l)).find((n) => n.d < HEDGE_HALF + BODY);
      if (!hit) continue;
      const d = hit.d || 1;
      const ux = hit.d ? (f.x - hit.x) / d : 1, uy = hit.d ? (f.y - hit.y) / d : 0;
      ctx.nudge(f, ux * (HEDGE_HALF + BODY + 26 - d), uy * (HEDGE_HALF + BODY + 26 - d));
      if (f === player) { tk.hitPlayer(10, f.x, f.y); tk.root(600); }
      else { ctx.hit(npc, 18, f.x, f.y); ctx.root(npc, 700); ctx.float(f.x, f.y - 56, 'HEDGED', '#a8d890'); }
    }
    nextTie = time + (turned ? 7000 : 8800);
  }

  return {
    update(time) {
      if (!nextTie) {
        nextTie = time + 2200;
        bow = ctx.target({
          x: cx, y: cy, r: 26, passThrough: true,
          onStruck: (by) => {
            if (!growAt || tk.now - shootAt < 250) return;
            ctx.float(cx, cy - 40, by === 'player' ? 'YOU PULL THE BOW' : 'SHE PULLS THE BOW', '#7fd6c6');
            grow(tk.now);
          },
        });
      }
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('THE KNOT TIGHTENS ON YOU', '#a8d890');
        ctx.sfx('thorn');
      }
      if (!growAt && time >= nextTie) lay(time);
      if (growAt && time >= growAt) grow(time);
      // The box is a wall: shoulder fighters out of it, and stop shots in it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        for (const l of hedges) {
          const n = near(f.x, f.y, l);
          if (n.d >= HEDGE_HALF + BODY || n.d < 0.01) continue;
          const k = HEDGE_HALF + BODY - n.d;
          ctx.nudge(f, ((f.x - n.x) / n.d) * k, ((f.y - n.y) / n.d) * k);
        }
      }
      for (const s of ctx.shotsNear(cx, cy, 1200)) {
        if (hedges.some((l) => near(s.x, s.y, l).d < HEDGE_HALF + 4)) s.block();
      }
      if (clippings && time - clippings.at > 700) clippings = null;
    },

    npcSeek() {
      if (!growAt) return null;
      const onShoot = (x: number, y: number) => shoots.some((l) => near(x, y, l).d < HEDGE_HALF + BODY + 22);
      if (!onShoot(npc.x, npc.y)) return null;
      // The nearest clear ground, trying a ring of steps.
      for (const r of [70, 110, 150]) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const x = tk.clampX(npc.x + Math.cos(a) * r), y = tk.clampY(npc.y + Math.sin(a) * r);
          if (!onShoot(x, y) && !hedges.some((l) => near(x, y, l).d < HEDGE_HALF + BODY)) return { x, y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      // The bow at the knot's heart: a gravel roundel with the verdigris tie.
      g.fillStyle(GRAVEL_DARK, 1); g.fillCircle(cx, cy, 30);
      g.fillStyle(GRAVEL, 1); g.fillCircle(cx, cy, 26);
      const live = growAt > 0;
      const pulse = live ? 0.5 + Math.sin(time / 90) * 0.5 : 0;
      g.lineStyle(5, live ? VERDIGRIS_LIT : VERDIGRIS, 1);
      g.strokeEllipse(cx - 10, cy - 2, 18, 12); g.strokeEllipse(cx + 10, cy - 2, 18, 12);
      g.lineBetween(cx - 2, cy + 2, cx - 9, cy + 16); g.lineBetween(cx + 2, cy + 2, cx + 9, cy + 16);
      g.fillStyle(VERDIGRIS_LIT, 1); g.fillCircle(cx, cy - 1, 4);
      if (live) { g.lineStyle(2, VERDIGRIS_LIT, 0.3 + pulse * 0.5); g.strokeCircle(cx, cy, 32 + pulse * 6); }
      if (live) {
        const k = clamp((time - shootAt) / (growAt - shootAt), 0, 1);
        for (const l of shoots) drawShoots(g, l, k);
      }
      if (clippings) {
        const k = (time - clippings.at) / 700;
        for (const l of clippings.lines) drawClippings(g, l, k);
      }
      for (const l of hedges) drawBox(g, l);
    },

    drawHud(g, time) {
      // A little knot dial: fills toward the next re-tie, flashes green while the shoots show.
      const x = W / 2, y = top + 16;
      const k = growAt ? 1 : clamp(1 - (nextTie - time) / (turned ? 7000 : 8800), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 15);
      g.lineStyle(4, growAt ? LEAF : BOX_LIT, 1);
      g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      g.lineStyle(2, VERDIGRIS_LIT, 1); g.strokeEllipse(x - 4, y, 7, 5); g.strokeEllipse(x + 4, y, 7, 5);
    },

    destroy() { bow?.remove(); },
  };
}

/** Clipped box: a dark base, a rounded lit top with leaf texture, a shadow along its foot. */
function drawBox(g: G, l: Line): void {
  for (let i = 1; i < l.length; i++) shadow(g, (l[i - 1].x + l[i].x) / 2, (l[i - 1].y + l[i].y) / 2 + 6, 34, 10, 0.18);
  for (const [w, c, dy] of [[HEDGE_HALF * 2 + 4, BOX_DARK, 2], [HEDGE_HALF * 2, BOX, -3], [HEDGE_HALF * 1.1, BOX_LIT, -6]] as [number, number, number][]) {
    g.lineStyle(w, c, 1);
    g.beginPath(); g.moveTo(l[0].x, l[0].y + dy);
    for (let i = 1; i < l.length; i++) g.lineTo(l[i].x, l[i].y + dy);
    g.strokePath();
  }
  // Leaf flecks along the top.
  for (let i = 1; i < l.length; i++) {
    const a = l[i - 1], b = l[i];
    const n = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 6;
      g.fillStyle((k + i) % 3 ? LEAF : 0x7ab84e, 0.8); g.fillEllipse(x + ((k * 5) % 7) - 3, y + ((k * 3) % 5) - 2, 4, 3);
    }
  }
  // Clipped ends.
  for (const e of [l[0], l[l.length - 1]]) { g.fillStyle(BOX_DARK, 1); g.fillCircle(e.x, e.y + 1, HEDGE_HALF + 1); g.fillStyle(BOX, 1); g.fillCircle(e.x, e.y - 3, HEDGE_HALF - 1); }
}

/** The new knot as shoots: a dotted line of green sprigs, taller as it nears springing. */
function drawShoots(g: G, l: Line, k: number): void {
  for (let i = 1; i < l.length; i++) {
    const a = l[i - 1], b = l[i];
    const n = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 14));
    for (let j = 0; j < n; j++) {
      const t = j / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const h = 3 + k * 12;
      g.fillStyle(0x33231a, 0.6); g.fillEllipse(x, y + 1, 8, 3);
      g.lineStyle(1.5, STEM, 1); g.lineBetween(x, y, x, y - h);
      g.fillStyle(LEAF, 1); g.fillEllipse(x - 3, y - h * 0.7, 5, 3); g.fillEllipse(x + 3, y - h, 5, 3);
    }
  }
  g.lineStyle(HEDGE_HALF * 2 + BODY, 0xa8d890, 0.05 + k * 0.1);
  g.beginPath(); g.moveTo(l[0].x, l[0].y); for (let i = 1; i < l.length; i++) g.lineTo(l[i].x, l[i].y); g.strokePath();
}

/** The old knot clipped away: sprigs of box falling into the gravel. */
function drawClippings(g: G, l: Line, k: number): void {
  for (let i = 0; i < l.length; i++) {
    const p = l[i];
    for (let j = 0; j < 3; j++) {
      const a = i * 1.7 + j * 2.1;
      g.fillStyle(j % 2 ? BOX_LIT : LEAF, 0.8 * (1 - k));
      g.fillEllipse(p.x + Math.cos(a) * k * 18, p.y + Math.sin(a) * k * 10 + k * 8, 4, 2.5);
    }
  }
}

export const FALLEN_KNOT_RETIED: GimmickDef = {
  id: ID,
  rules: 'The box hedges are walls. Every few seconds the knot re-ties: off the green shoots or be thrown and held. Strike the bow to spring it early.',
  make,
};
