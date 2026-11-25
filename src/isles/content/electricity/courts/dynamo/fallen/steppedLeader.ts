import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { bolt, boltPoints, lightningRod, sparks } from '../art';
import { ARC, ARC_CORE, ARC_VIOLET, BASALT_DARK, INSULATOR, INSULATOR_LIT, OFF_RED, SPARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * Stepped Leader — Cloud-Reader Ferelith Gowde of the Rod Forest, who reads the storm the way a
 * pilot reads water. In the King's telling she told the Prince's men where the next strike would
 * fall, and they stood the households that were short of their Draw on that ground to wait for it.
 *
 * Lightning does not fall all at once. A *stepped leader* comes down first: a faint violet channel
 * that grows in jerks, a step at a time, forking as it goes, every live tip feeling for the
 * nearest fighter. The whole branching tree stays drawn on the hillside as it grows. When a tip
 * comes close enough, a streamer rises from that fighter to meet it — a beat to dash clear — and
 * then the return stroke: the full current runs back up the whole tree, burning whoever it touched
 * and anyone standing across any of its branches.
 *
 * The tips go for whoever is *nearer*. Keep her between you and the tip and it is her streamer that
 * rises; stay off the branches it laid on the way. Each stroke leaves fulgurite — the branch fused
 * into green glass — for a moment. Halfway down the storm thickens and two leaders come down at
 * once from opposite sides, so the safe side of her keeps changing.
 */

const ID = fallenId('dynamo', 'stepped-leader');
const STEP_MS = 300;
const STEP_LEN = 46;
const MAX_STEPS = 14;
const MAX_TIPS = 4;
const REACH = 64;
const STREAMER_MS = 340;
const BRANCH_HIT = 22;

interface Seg { a: Pt; b: Pt; seed: number }
interface Leader { from: Pt; segs: Seg[]; tips: Pt[]; steps: number; nextAt: number; hit: Fighter | null; strikeAt: number }
interface Glass { segs: Seg[]; at: number; struck: Pt }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const leaders: Leader[] = [];
  const glass: Glass[] = [];
  let nextAt = -1;
  let twin = false;
  let lastSide = 0;

  const fighters = () => [player, npc].filter(alive);
  const nearest = (p: Pt): Fighter | null => {
    let best: Fighter | null = null, bd = 1e9;
    for (const f of fighters()) { const d = dist(p.x, p.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
    return best;
  };

  /** A cloud-base point on the given edge (0 north, 1 east, 2 west). */
  function origin(side: number): Pt {
    const r = ctx.rng();
    if (side === 0) return { x: 120 + r * (W - 240), y: top + 6 };
    if (side === 1) return { x: W - 8, y: top + 80 + r * (H - top - 160) };
    return { x: 8, y: top + 80 + r * (H - top - 160) };
  }

  function spawn(side: number, time: number): void {
    const from = origin(side);
    leaders.push({ from, segs: [], tips: [from], steps: 0, nextAt: time + 500, hit: null, strikeAt: 0 });
    ctx.sfx('electric-charge');
  }

  function step(l: Leader, time: number): void {
    l.steps++;
    const grown: Pt[] = [];
    for (const tip of l.tips) {
      const f = nearest(tip);
      const want = f ? Math.atan2(f.y - tip.y, f.x - tip.x) : Math.PI / 2;
      const a = want + (ctx.rng() - 0.5) * 0.9;
      const add = (ang: number) => {
        const b = { x: clamp(tip.x + Math.cos(ang) * STEP_LEN, 20, W - 20), y: clamp(tip.y + Math.sin(ang) * STEP_LEN, top + 4, H - 14) };
        l.segs.push({ a: tip, b, seed: Math.floor(ctx.rng() * 9999) });
        grown.push(b);
      };
      add(a);
      if (l.tips.length + grown.length < MAX_TIPS + 1 && ctx.rng() < 0.32) add(a + (ctx.rng() < 0.5 ? -0.75 : 0.75));
    }
    // Keep the tips nearest the fighters; the rest stop growing (but stay part of the tree).
    grown.sort((p, q) => {
      const fp = nearest(p), fq = nearest(q);
      return (fp ? dist(p.x, p.y, fp.x, fp.y) : 0) - (fq ? dist(q.x, q.y, fq.x, fq.y) : 0);
    });
    l.tips = grown.slice(0, MAX_TIPS);
    ctx.sfx('status-shock');
    // A tip within reach: that fighter's streamer rises to meet it.
    for (const tip of l.tips) {
      const f = nearest(tip);
      if (f && dist(tip.x, tip.y, f.x, f.y) < REACH) {
        l.hit = f; l.strikeAt = time + STREAMER_MS;
        ctx.sfx('beam-charge');
        return;
      }
    }
    if (l.steps >= MAX_STEPS) { l.hit = null; l.strikeAt = time + STREAMER_MS; }
  }

  function stroke(l: Leader, time: number): void {
    const hurt = new Set<Fighter>();
    let struck: Pt = l.tips[0] ?? l.from;
    if (l.hit && alive(l.hit)) {
      const f = l.hit;
      const tip = l.tips.slice().sort((p, q) => dist(p.x, p.y, f.x, f.y) - dist(q.x, q.y, f.x, f.y))[0];
      if (tip && dist(tip.x, tip.y, f.x, f.y) < REACH + 46) {
        struck = { x: f.x, y: f.y };
        l.segs.push({ a: tip, b: struck, seed: 7 });
        if (f === player) tk.hitPlayer(20, f.x, f.y); else ctx.hit(f, 20, f.x, f.y);
        ctx.stun(f, 400);
        ctx.float(f.x, f.y - 52, f === npc ? 'STRUCK' : 'STREAMER MET', f === npc ? '#bff0ff' : '#ffb0a0');
        hurt.add(f);
      }
    }
    for (const f of fighters()) {
      if (hurt.has(f)) continue;
      if (l.segs.some((s) => segDist(f.x, f.y, s.a.x, s.a.y, s.b.x, s.b.y) < BRANCH_HIT)) {
        if (f === player) tk.hitPlayer(12, f.x, f.y); else ctx.hit(f, 12, f.x, f.y);
        ctx.float(f.x, f.y - 46, 'ON THE BRANCH', f === npc ? '#bff0ff' : '#ffb0a0');
      }
    }
    ctx.sfx('thunder');
    ctx.flash(struck.x, struck.y, ARC);
    glass.push({ segs: l.segs, at: time, struck });
  }

  return {
    update(time) {
      if (nextAt < 0) nextAt = time + 1400;
      if (!twin && npc.hp < npc.maxHp * 0.5) {
        twin = true;
        ctx.banner('The storm thickens — two leaders at once', '#d0c0ff');
      }
      if (!leaders.length && time >= nextAt && fighters().length === 2) {
        if (twin) { spawn(1, time); spawn(2, time); } else { lastSide = (lastSide + 1 + Math.floor(ctx.rng() * 2)) % 3; spawn(lastSide, time); }
      }
      for (let i = leaders.length - 1; i >= 0; i--) {
        const l = leaders[i];
        if (l.strikeAt) {
          if (time >= l.strikeAt) { stroke(l, time); leaders.splice(i, 1); if (!leaders.length) nextAt = time + 2100; }
          continue;
        }
        if (time >= l.nextAt) { l.nextAt = time + STEP_MS; step(l, time); }
      }
      for (let i = glass.length - 1; i >= 0; i--) if (time - glass[i].at > 2400) glass.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player) || !leaders.length) return null;
      // Stand so the player is nearer every tip: behind them, as seen from the tips.
      let tx = 0, ty = 0, n = 0;
      for (const l of leaders) for (const t of l.tips) { tx += t.x; ty += t.y; n++; }
      if (!n) return null;
      tx /= n; ty /= n;
      const a = Math.atan2(player.y - ty, player.x - tx);
      let p = { x: clamp(player.x + Math.cos(a) * 140, 50, W - 50), y: clamp(player.y + Math.sin(a) * 140, top + 40, H - 40) };
      // A streamer rising from her: dash it off.
      if (leaders.some((l) => l.hit === npc)) p = { x: clamp(npc.x + Math.cos(a) * 160, 50, W - 50), y: clamp(npc.y + Math.sin(a) * 160, top + 40, H - 40) };
      return p;
    },

    drawGround(g, time) {
      // The Rod Forest's edge: three scorched rods along the north wall, set dressing.
      for (const [x, h] of [[90, 70], [W - 90, 84], [W / 2 + 210, 62]] as [number, number][]) lightningRod(g, x, top + 30, h, 0, 0.15);
      // Fulgurite: fused glass where the last strokes ran, fading.
      for (const gl of glass) {
        const k = 1 - clamp((time - gl.at) / 2400, 0, 1);
        for (const s of gl.segs) {
          g.lineStyle(7, BASALT_DARK, 0.5 * k); g.lineBetween(s.a.x, s.a.y + 2, s.b.x, s.b.y + 2);
          g.lineStyle(4, INSULATOR, 0.7 * k); g.lineBetween(s.a.x, s.a.y, s.b.x, s.b.y);
          g.lineStyle(1.5, INSULATOR_LIT, 0.8 * k); g.lineBetween(s.a.x, s.a.y - 1, s.b.x, s.b.y - 1);
        }
        g.fillStyle(BASALT_DARK, 0.6 * k); g.fillEllipse(gl.struck.x, gl.struck.y + 4, 80, 28);
      }
      // Each growing tree's shadow on the ground: where its branches lie, the stroke will burn.
      for (const l of leaders) {
        for (const s of l.segs) {
          g.lineStyle(BRANCH_HIT * 2, ARC_VIOLET, 0.07); g.lineBetween(s.a.x, s.a.y, s.b.x, s.b.y);
          g.lineStyle(1, ARC_VIOLET, 0.35); g.lineBetween(s.a.x, s.a.y, s.b.x, s.b.y);
        }
        // The rising streamer under its fighter.
        if (l.hit && alive(l.hit)) {
          const k = clamp(1 - (l.strikeAt - time) / STREAMER_MS, 0, 1);
          g.lineStyle(3, l.hit === player ? OFF_RED : ARC, 0.5 + k * 0.5);
          g.strokeEllipse(l.hit.x, l.hit.y + 4, 70 - k * 30, 24 - k * 10);
        }
      }
    },

    drawAir(g, time) {
      for (const l of leaders) {
        // The cloud base where it comes down.
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + time / 1600;
          g.fillStyle(i % 2 ? 0x1a1e28 : 0x2a3040, 0.75);
          g.fillCircle(l.from.x + Math.cos(a) * 30, l.from.y + Math.sin(a) * 10, 20 + (i % 3) * 6);
        }
        // The leader: thin, flickering, step by step.
        const flick = Math.floor(time / 70);
        for (const s of l.segs) {
          const pts = boltPoints(s.a.x, s.a.y, s.b.x, s.b.y, s.seed + (flick % 3), 7);
          g.lineStyle(3, ARC_VIOLET, 0.18);
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.strokePath();
          g.lineStyle(1.2, 0xe8dcff, 0.7);
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.strokePath();
        }
        for (const t of l.tips) {
          glow(g, t.x, t.y, 22, ARC_VIOLET, 0.1, 3);
          g.fillStyle(ARC_CORE, 0.9); g.fillCircle(t.x, t.y, 3);
          sparks(g, t.x, t.y, 10, time, 3, ARC_VIOLET);
        }
        if (l.hit && alive(l.hit)) {
          const k = clamp(1 - (l.strikeAt - time) / STREAMER_MS, 0, 1);
          const tip = l.tips[0];
          const sx = l.hit.x, sy = l.hit.y - 20;
          const ex = sx + (tip.x - sx) * k * 0.8, ey = sy + (tip.y - sy) * k * 0.8;
          bolt(g, sx, sy, ex, ey, flick, 1.5, l.hit === player ? OFF_RED : ARC, 0.8, 6, false);
        }
      }
      // The return stroke: the whole tree at once, white.
      for (const gl of glass) {
        const k = clamp((time - gl.at) / 380, 0, 1);
        if (k >= 1) continue;
        for (const s of gl.segs) bolt(g, s.a.x, s.a.y, s.b.x, s.b.y, s.seed, 4 * (1 - k) + 1, ARC, 1 - k, 6, false);
        glow(g, gl.struck.x, gl.struck.y, 90, ARC, 0.12 * (1 - k), 3);
        sparks(g, gl.struck.x, gl.struck.y, 30, time, 8, SPARK);
        if (k < 0.25) { g.fillStyle(0xe8fbff, 0.14); g.fillRect(0, top, W, H - top); }
      }
    },
  };
}

export const FALLEN_STEPPED_LEADER: GimmickDef = {
  id: ID,
  rules: 'A leader forks down step by step toward the nearer fighter; when it reaches one, the whole tree strikes. Keep her nearer the tips. Off the branches.',
  make,
};
