import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { glint } from '../art';
import { BEAM_HOT, GOLD_LIT, IRON_DARK, MARBLE_DARK, SCORCH, SCORCH_DARK, SUN } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Where the Loops Come Down — Canon Ysembrand Tolle, Reader of the Sun's Face.
 *
 * Before the Noon the temple's canons kept a book of the sun's spots; Ysembrand kept it and,
 * people say, once read the old star-charts aloud to the children. In the star's telling she
 * never read them anything but the sun: the spots on its face, and which way each one points.
 *
 * Sunspots lie on the temple floor, a dark core in a fringe of filaments, each of one polarity —
 * north (red) or south (blue). Every cycle each north spot throws a burning loop of the sun's own
 * fire to the nearest free south spot: the arch rises between them, whitens, and snaps down along
 * its foot-line. Get off the lines.
 *
 * The exploit is the polarity. Strike a spot and it turns over — every loop re-knots at once to
 * the new pairing, on a short fuse. Turn the one that throws a loop through her. She turns them
 * too. Halfway down the spots begin to wander, and two more break out.
 */

const ID = fallenId('noon', 'loops');
const CALM_MS = 1250;
const RISE_MS = 1250;
const REKNOT_MS = 900;
const FLARE_MS = 280;
const HALF_W = 22;
const MAX_LEN = 720;
const DMG = 13;
const DMG_NPC = 18;
const NORTH = 0xe8402e;
const SOUTH = 0x3a7ae8;

type Phase = 'calm' | 'rise' | 'flare';

interface Spot { x: number; y: number; hx: number; hy: number; north: boolean; flipped: number; phase: number; target: StrikeTarget | null }
interface Loop { a: Spot; b: Spot }

/** Greedy nearest pairing: each north spot to the nearest unclaimed south spot, shortest first. */
function pairUp(spots: Spot[], flip: Spot | null = null): Loop[] {
  const pol = (s: Spot): boolean => (s === flip ? !s.north : s.north);
  const cand: { a: Spot; b: Spot; d: number }[] = [];
  for (const a of spots) for (const b of spots) {
    if (!pol(a) || pol(b)) continue;
    const d = dist(a.x, a.y, b.x, b.y);
    if (d <= MAX_LEN) cand.push({ a, b, d });
  }
  cand.sort((p, q) => p.d - q.d);
  const used = new Set<Spot>();
  const out: Loop[] = [];
  for (const c of cand) {
    if (used.has(c.a) || used.has(c.b)) continue;
    used.add(c.a); used.add(c.b);
    out.push({ a: c.a, b: c.b });
  }
  return out;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const mk = (x: number, y: number, north: boolean, phase: number): Spot => ({ x, y, hx: x, hy: y, north, flipped: -1e9, phase, target: null });
  const spots: Spot[] = [
    mk(150, top + 110, true, 0), mk(W / 2, top + 90, false, 1), mk(W - 150, top + 120, true, 2),
    mk(170, H - 90, false, 3), mk(W / 2, H - 80, true, 4), mk(W - 160, H - 100, false, 5),
  ];
  const extra: Spot[] = [mk(290, (top + H) / 2, true, 6), mk(W - 290, (top + H) / 2, false, 7)];
  let loops: Loop[] = [];
  let phase: Phase = 'calm';
  let phaseAt = 0;
  let riseMs = RISE_MS;
  let wander = false;
  let started = false;
  const burns: { ax: number; ay: number; bx: number; by: number; at: number }[] = [];

  function arm(s: Spot): void {
    s.target = ctx.target({
      x: s.x, y: s.y, r: 26,
      onStruck() {
        const now = tk.now;
        if (now - s.flipped < 520) return;
        s.flipped = now; s.north = !s.north;
        ctx.sfx('magnet-pull');
        ctx.flash(s.x, s.y, s.north ? NORTH : SOUTH);
        if (phase === 'rise') { loops = pairUp(spots); phaseAt = now; riseMs = tk.warn(REKNOT_MS); ctx.sfx('plasma-arc'); }
      },
    });
  }

  function flare(t: number): void {
    ctx.sfx('light-beam');
    let hp = false, hn = false;
    for (const l of loops) {
      if (!hp && alive(player) && segDist(player.x, player.y, l.a.x, l.a.y, l.b.x, l.b.y) < HALF_W + 12) { hp = true; tk.hitPlayer(DMG, player.x, player.y); }
      if (!hn && alive(npc) && segDist(npc.x, npc.y, l.a.x, l.a.y, l.b.x, l.b.y) < HALF_W + 12) { hn = true; ctx.hit(npc, DMG_NPC, npc.x, npc.y); ctx.flash(npc.x, npc.y - 20, BEAM_HOT); }
      burns.push({ ax: l.a.x, ay: l.a.y, bx: l.b.x, by: l.b.y, at: t });
    }
    while (burns.length > 10) burns.shift();
  }

  /** Does any loop of this pairing cross a point (with a margin)? */
  const crosses = (ls: Loop[], x: number, y: number, m: number): boolean => ls.some((l) => segDist(x, y, l.a.x, l.a.y, l.b.x, l.b.y) < m);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; phaseAt = time + 600; for (const s of spots) arm(s); }
      if (!wander && npc.hp < npc.maxHp * 0.5) {
        wander = true;
        for (const s of extra) { spots.push(s); arm(s); }
        ctx.banner('THE SPOTS WANDER', '#ffd08a');
        ctx.sfx('plasma-arc');
      }
      if (wander && phase !== 'flare') {
        for (const s of spots) {
          s.phase += dt * 0.5;
          s.x = tk.clampX(s.hx + Math.cos(s.phase) * 46, 50);
          s.y = tk.clampY(s.hy + Math.sin(s.phase * 1.3) * 30, 50);
          s.target?.moveTo(s.x, s.y);
        }
      }
      const el = time - phaseAt;
      if (phase === 'calm' && el >= CALM_MS) { phase = 'rise'; phaseAt = time; riseMs = tk.warn(RISE_MS); loops = pairUp(spots); ctx.sfx('electric-charge'); }
      else if (phase === 'rise') {
        // Wandering feet drag their loops with them: re-pair live until the last third.
        if (wander && el < riseMs * 0.66) loops = pairUp(spots);
        if (el >= riseMs) { phase = 'flare'; phaseAt = time; flare(time); }
      } else if (phase === 'flare' && el >= FLARE_MS) { phase = 'calm'; phaseAt = time; loops = []; }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // Off any loop that is rising.
      if (phase === 'rise') {
        for (const l of loops) {
          if (segDist(npc.x, npc.y, l.a.x, l.a.y, l.b.x, l.b.y) > HALF_W + 60) continue;
          const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, n = Math.hypot(dx, dy) || 1;
          const side = (npc.x - l.a.x) * -dy + (npc.y - l.a.y) * dx >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x - (dy / n) * side * 110), y: tk.clampY(npc.y + (dx / n) * side * 110) };
        }
      }
      // A spot whose turning would throw a loop through you and not through her: go and stand by it.
      if (alive(player)) {
        let best: Spot | null = null, bd = Infinity;
        for (const s of spots) {
          if (tk.now - s.flipped < 1200) continue;
          const ls = pairUp(spots, s);
          if (!crosses(ls, player.x, player.y, HALF_W + 10)) continue;
          const stand: Pt = { x: s.x + (s.x < W / 2 ? 34 : -34), y: s.y };
          if (crosses(ls, stand.x, stand.y, HALF_W + 30)) continue;
          const d = dist(npc.x, npc.y, s.x, s.y);
          if (d < bd) { bd = d; best = s; }
        }
        if (best) return { x: best.x + (best.x < W / 2 ? 34 : -34), y: best.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const b of burns) {
        const k = clamp(1 - (time - b.at) / 3500, 0, 1);
        if (k <= 0) continue;
        g.lineStyle(HALF_W * 1.4, SCORCH, 0.2 * k); g.lineBetween(b.ax, b.ay, b.bx, b.by);
        g.lineStyle(2, SCORCH_DARK, 0.45 * k); g.lineBetween(b.ax, b.ay, b.bx, b.by);
      }
      // Foot-lines of the rising loops.
      if (phase === 'rise') {
        const k = clamp((time - phaseAt) / riseMs, 0, 1);
        for (const l of loops) {
          g.lineStyle(HALF_W * 2, SUN, 0.05 + k * 0.14); g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
          const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, n = Math.hypot(dx, dy) || 1;
          const nx = (-dy / n) * HALF_W, ny = (dx / n) * HALF_W;
          g.lineStyle(1.5, k > 0.7 ? 0xffffff : GOLD_LIT, 0.35 + k * 0.5);
          g.lineBetween(l.a.x + nx, l.a.y + ny, l.b.x + nx, l.b.y + ny);
          g.lineBetween(l.a.x - nx, l.a.y - ny, l.b.x - nx, l.b.y - ny);
        }
      } else if (phase === 'flare') {
        const k = clamp((time - phaseAt) / FLARE_MS, 0, 1);
        for (const l of loops) {
          g.lineStyle(HALF_W * 2 + 10, BEAM_HOT, 0.6 * (1 - k)); g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
          g.lineStyle(6, 0xffffff, 1 - k); g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
        }
      }
      for (const s of spots) drawSpot(g, s, time);
    },

    drawAir(g, time) {
      if (phase !== 'rise' && phase !== 'flare') return;
      const k = phase === 'rise' ? clamp((time - phaseAt) / riseMs, 0, 1) : 1 - clamp((time - phaseAt) / FLARE_MS, 0, 1);
      for (const l of loops) drawLoop(g, l, k, time, phase === 'flare');
    },

    drawHud(g) {
      // The spot book: one pip per spot in its polarity, and the fuse of the current cycle.
      const x0 = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 14, y - 20, 24 + spots.length * 20, 40, 8);
      spots.forEach((s, i) => {
        const x = x0 + i * 20;
        g.fillStyle(s.north ? NORTH : SOUTH, 1); g.fillCircle(x, y - 4, 6);
        g.fillStyle(0x1a0e08, 1); g.fillCircle(x, y - 4, 2.5);
      });
      const k = phase === 'rise' ? clamp((tk.now - phaseAt) / riseMs, 0, 1) : 0;
      g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 6, y + 8, spots.length * 20, 5);
      g.fillStyle(k > 0.7 ? 0xffffff : GOLD_LIT, 1); g.fillRect(x0 - 6, y + 8, spots.length * 20 * k, 5);
    },

    destroy() { for (const s of spots) s.target?.remove(); for (const s of extra) s.target?.remove(); },
  };
}

/** A sunspot inlaid in the floor: a black umbra, a fringe of radial filaments, its polarity ring and sign. */
function drawSpot(g: G, s: Spot, time: number): void {
  const col = s.north ? NORTH : SOUTH;
  g.fillStyle(MARBLE_DARK, 0.5); g.fillEllipse(s.x, s.y + 2, 60, 30);
  g.fillStyle(0x6a3a1a, 0.85); g.fillEllipse(s.x, s.y, 50, 26);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.sin(time / 900 + i) * 0.04;
    g.lineStyle(1.5, i % 2 ? 0x3a1e0c : 0x9a5a28, 0.9);
    g.lineBetween(s.x + Math.cos(a) * 9, s.y + Math.sin(a) * 5, s.x + Math.cos(a) * 24, s.y + Math.sin(a) * 12.5);
  }
  g.fillStyle(0x120804, 1); g.fillEllipse(s.x, s.y, 20, 11);
  g.fillStyle(0x2a1408, 1); g.fillEllipse(s.x - 2, s.y - 1, 9, 5);
  g.lineStyle(2.5, col, 0.85); g.strokeEllipse(s.x, s.y, 58, 30);
  // The polarity sign, struck in the ring's colour.
  g.lineStyle(2.5, col, 1);
  g.lineBetween(s.x + 30, s.y - 18, s.x + 40, s.y - 18);
  if (s.north) g.lineBetween(s.x + 35, s.y - 23, s.x + 35, s.y - 13);
  const sp = flipFade(time - s.flipped);
  if (sp > 0) { g.lineStyle(2, col, sp); g.strokeEllipse(s.x, s.y, 58 + (1 - sp) * 40, 30 + (1 - sp) * 20); }
}

/** Fade of a just-flipped ring, 1 → 0 over half a second. */
const flipFade = (el: number): number => clamp(1 - el / 500, 0, 1);

/**
 * A loop of the sun's fire: three twisted strands of plasma arching from one spot to its partner,
 * rising with the fuse, beads of light running along it, white-hot as it snaps.
 */
function drawLoop(g: G, l: Loop, k: number, time: number, snapping: boolean): void {
  const len = dist(l.a.x, l.a.y, l.b.x, l.b.y);
  const h = (40 + len * 0.28) * (0.25 + k * 0.75) * (snapping ? k : 1);
  const N = 22;
  const strands: [number, number, number][] = [[0, 0xff8a3a, 4], [0.33, 0xffd06a, 3], [0.66, 0xfff0c0, 2]];
  for (const [ph, col, w] of strands) {
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const tw = Math.sin(t * Math.PI * 3 + time / 160 + ph * 6) * 4;
      pts.push({ x: l.a.x + (l.b.x - l.a.x) * t + tw, y: l.a.y + (l.b.y - l.a.y) * t - Math.sin(t * Math.PI) * h + tw * 0.5 });
    }
    g.lineStyle(w + 6, col, 0.12 + k * 0.1); g.strokePoints(pts, false);
    g.lineStyle(w, snapping ? 0xffffff : mixC(col, 0xffffff, k * 0.5), 0.6 + k * 0.4); g.strokePoints(pts, false);
  }
  for (let i = 0; i < 3; i++) {
    const t = ((time / 700 + i / 3) % 1);
    const x = l.a.x + (l.b.x - l.a.x) * t, y = l.a.y + (l.b.y - l.a.y) * t - Math.sin(t * Math.PI) * h;
    glint(g, x, y, 6 + k * 4, 0.9);
  }
  glow(g, l.a.x, l.a.y, 22, NORTH, 0.06 + k * 0.05, 3);
  glow(g, l.b.x, l.b.y, 22, SOUTH, 0.06 + k * 0.05, 3);
}

export const FALLEN_LOOPS: GimmickDef = {
  id: ID,
  rules: 'Red sunspots throw burning loops to the nearest blue ones; each snaps down its line. Strike a spot to turn it over and re-knot every loop.',
  make,
};
