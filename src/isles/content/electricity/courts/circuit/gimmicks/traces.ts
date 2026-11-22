import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { pad, pulseBead, segText, via } from '../art';
import { COPPER, COPPER_DARK, COPPER_LIT, FAULT, FILAMENT, MASK_DARK, PULSE, SILK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Traces — Etcher Solde.
 *
 * Solde etches the court's new streets, and her yard is a test board: copper traces laid across
 * the floor in a lattice, with power pins at two corners. Pulses of current leave the pins and
 * race along the copper at a sprint; whoever is standing on a trace as one goes by is zapped
 * (hurt and locked for a blink). Off the copper you are safe — the green between is just board.
 *
 * Where three or more traces meet there is a *junction*: a round switch pad with an arrow showing
 * which way the next pulse goes. Strike a junction and you throw it — the arrow clicks round to
 * the next trace. Solde throws them to steer the current through you; a quick player throws them
 * back, and runs the pulses down the trace she is standing on.
 */

const COLS = [120, 300, 480, 660, 840];
const ROWS = [170, 300, 430, 560];
const SPEED = 270;
const TRACE_HALF = 9;
const ZAP_R = 24;
const ZAP_MS = 380;
const SWITCH_R = 22;
/** One blow, one click: a beam or a burst landing on a junction throws it once, not every tick. */
const SWITCH_GAP_MS = 300;

interface Node { id: number; x: number; y: number; nb: number[]; ptr: number; owner: 'p' | 'n' | null; flipAt: number }
interface Pulse { from: number; to: number; t: number; hops: number; hit: Set<Fighter>; seed: number }
interface Spark { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, player, npc, rng } = ctx;
  const nodes: Node[] = [];
  const at = (r: number, c: number) => r * COLS.length + c;
  for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < COLS.length; c++) {
    nodes.push({ id: at(r, c), x: COLS[c], y: ROWS[r], nb: [], ptr: 0, owner: null, flipAt: -9999 });
  }
  const link = (a: number, b: number) => { nodes[a].nb.push(b); nodes[b].nb.push(a); };
  // The lattice, with gaps left as open board: a full rail top and bottom, rungs between.
  for (let c = 0; c < 4; c++) { link(at(0, c), at(0, c + 1)); link(at(3, c), at(3, c + 1)); }
  link(at(1, 0), at(1, 1)); link(at(1, 2), at(1, 3));
  link(at(2, 1), at(2, 2)); link(at(2, 3), at(2, 4));
  link(at(0, 0), at(1, 0)); link(at(2, 0), at(3, 0));
  link(at(1, 1), at(2, 1)); link(at(2, 1), at(3, 1));
  link(at(0, 2), at(1, 2)); link(at(2, 2), at(3, 2));
  link(at(1, 3), at(2, 3));
  link(at(0, 4), at(1, 4)); link(at(1, 4), at(2, 4)); link(at(2, 4), at(3, 4));
  // Nodes nobody links to (none here, but a dead lattice point would be skipped when drawn).
  const used = nodes.filter((n) => n.nb.length > 0);
  for (const n of used) n.ptr = Math.floor(rng() * n.nb.length);
  const edges: [number, number][] = [];
  for (const n of used) for (const m of n.nb) if (m > n.id) edges.push([n.id, m]);
  const junctions = used.filter((n) => n.nb.length >= 3);

  /** The two power pins: top-left and bottom-right, at the ends of the rails. */
  const pins = [at(0, 0), at(3, 4)];
  const pulses: Pulse[] = [];
  const sparks: Spark[] = [];
  const lastZap = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  let nextEmit = 0;
  let pinIdx = 0;
  let warnPin = -1;
  let started = false;
  const every = ctx.hard ? 1050 : 1350;
  const dmg = ctx.hard ? 10 : 8;

  /** Where a pulse arriving at `n` from `from` goes next (null = a dead end, it earths out). */
  function route(n: Node, from: number): number | null {
    const out = n.nb.filter((m) => m !== from);
    if (!out.length) return null;
    if (n.nb.length <= 2) return out[0];
    let k = n.ptr;
    for (let i = 0; i < n.nb.length; i++) {
      const cand = n.nb[(k + i) % n.nb.length];
      if (cand !== from) return cand;
    }
    return out[0];
  }

  function emit(): void {
    const pin = nodes[pins[pinIdx]];
    pinIdx = (pinIdx + 1) % pins.length;
    const to = route(pin, -1);
    if (to === null) return;
    pulses.push({ from: pin.id, to, t: 0, hops: 0, hit: new Set(), seed: rng() * 10 });
    ctx.sfx('zap');
  }

  const pulsePos = (p: Pulse): Pt => {
    const a = nodes[p.from], b = nodes[p.to];
    return { x: a.x + (b.x - a.x) * p.t, y: a.y + (b.y - a.y) * p.t };
  };

  /** The trace segment a point is standing on, if any. */
  function edgeUnder(x: number, y: number): [number, number] | null {
    for (const [a, b] of edges) if (segDist(x, y, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y) < TRACE_HALF + 12) return [a, b];
    return null;
  }

  function flip(by: 'player' | 'npc', n: Node, time: number): void {
    if (time - n.flipAt < SWITCH_GAP_MS) return;
    n.ptr = (n.ptr + 1) % n.nb.length;
    n.owner = by === 'player' ? 'p' : 'n';
    n.flipAt = time;
    ctx.sfx('clang');
    ctx.float(n.x, n.y - 26, 'SWITCHED', by === 'player' ? '#9af6ff' : '#ffb070');
  }

  // Junction pads are floor switches: strike one to throw it. Shots fly on over them.
  for (const n of junctions) {
    ctx.target({ x: n.x, y: n.y, r: SWITCH_R, passThrough: true, onStruck: (by) => flip(by, n, ctx.scene.time.now) });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextEmit = time + 900; }
      // The pins: warn, then emit.
      if (warnPin < 0 && time >= nextEmit - 550) { warnPin = pins[pinIdx]; }
      if (time >= nextEmit) {
        nextEmit = time + every;
        warnPin = -1;
        if (pulses.length < 7) emit();
      }
      // Pulses race along the copper.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const a = nodes[p.from], b = nodes[p.to];
        const len = Math.max(1, dist(a.x, a.y, b.x, b.y));
        p.t += (SPEED * dt) / len;
        while (p.t >= 1) {
          const arrived = nodes[p.to];
          const next = route(arrived, p.from);
          p.hops++;
          if (next === null || p.hops > 14) {
            sparks.push({ x: arrived.x, y: arrived.y, at: time });
            pulses.splice(i, 1);
            break;
          }
          const over = (p.t - 1) * len;
          p.from = arrived.id; p.to = next;
          const nl = Math.max(1, dist(arrived.x, arrived.y, nodes[next].x, nodes[next].y));
          p.t = over / nl;
        }
        if (pulses[i] !== p) continue;
        const pos = pulsePos(p);
        for (const f of [player, npc]) {
          if (!alive(f) || p.hit.has(f)) continue;
          if (dist(pos.x, pos.y, f.x, f.y) < ZAP_R) {
            p.hit.add(f);
            // A zapped fighter is briefly earthed: no second zap while they step off the copper.
            if (time - (lastZap.get(f) ?? 0) < 1100) continue;
            lastZap.set(f, time);
            ctx.hit(f, dmg, f.x, f.y);
            ctx.stun(f, ZAP_MS);
            ctx.flash(f.x, f.y, PULSE);
            ctx.sfx('status-shock');
            sparks.push({ x: f.x, y: f.y, at: time });
          }
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) if (time - sparks[i].at > 500) sparks.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Route the current through the player: if they stand on a trace, go and strike a junction at
      // one end of it until its arrow points down their trace.
      const e = edgeUnder(player.x, player.y);
      if (e) {
        for (const id of e) {
          const n = nodes[id];
          if (n.nb.length < 3) continue;
          const other = id === e[0] ? e[1] : e[0];
          if (n.nb[n.ptr] === other) continue;
          // Stand off the copper, a diagonal step from the pad, in reach to strike it.
          const sx = n.x < W / 2 ? 1 : -1, sy = n.y < H / 2 ? 1 : -1;
          return { x: clamp(n.x + sx * 34, 50, W - 50), y: clamp(n.y + sy * 34, ctx.top + 40, H - 40) };
        }
      }
      // Otherwise stand on clean board near them: the middle of the nearest lattice cell.
      let best: Pt = { x: W / 2, y: H / 2 };
      let bd = Infinity;
      for (let r = 0; r < ROWS.length - 1; r++) for (let c = 0; c < COLS.length - 1; c++) {
        const cx = (COLS[c] + COLS[c + 1]) / 2, cy = (ROWS[r] + ROWS[r + 1]) / 2;
        const d = Math.abs(dist(cx, cy, player.x, player.y) - 200);
        if (d < bd) { bd = d; best = { x: cx, y: cy }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The copper: dark etch line, the trace, a lit crown.
      for (const [a, b] of edges) {
        const A = nodes[a], B = nodes[b];
        g.lineStyle(TRACE_HALF * 2 + 6, MASK_DARK, 0.8); g.lineBetween(A.x, A.y, B.x, B.y);
        g.lineStyle(TRACE_HALF * 2, COPPER_DARK, 1); g.lineBetween(A.x, A.y, B.x, B.y);
        g.lineStyle(TRACE_HALF * 2 - 4, COPPER, 1); g.lineBetween(A.x, A.y, B.x, B.y);
        g.lineStyle(3, COPPER_LIT, 0.5); g.lineBetween(A.x, A.y, B.x, B.y);
      }
      // Live traces glow where a pulse is running.
      for (const p of pulses) {
        const A = nodes[p.from], B = nodes[p.to];
        g.lineStyle(TRACE_HALF * 2 + 8, PULSE, 0.12); g.lineBetween(A.x, A.y, B.x, B.y);
      }
      // Corners and dead ends: plain vias.
      for (const n of used) if (n.nb.length < 3 && !pins.includes(n.id)) via(g, n.x, n.y, 10);
      // The pins: a tinned pad with a + and the warning flash before each pulse.
      for (const id of pins) {
        const n = nodes[id];
        pad(g, n.x, n.y, 34, 34);
        g.fillStyle(FAULT, 1); g.fillRect(n.x - 7, n.y - 1.5, 14, 3); g.fillRect(n.x - 1.5, n.y - 7, 3, 14);
        if (warnPin === id) {
          const k = clamp(1 - (nextEmit - time) / 550, 0, 1);
          g.lineStyle(3, PULSE, 0.3 + k * 0.6); g.strokeCircle(n.x, n.y, 30 - k * 10);
        }
      }
      // Junctions: a round switch pad with the arrow showing the next way out.
      for (const n of junctions) {
        const k = clamp(1 - (time - n.flipAt) / 400, 0, 1);
        const own = n.owner === 'p' ? PULSE : n.owner === 'n' ? 0xffb070 : SILK;
        g.fillStyle(MASK_DARK, 1); g.fillCircle(n.x, n.y, SWITCH_R + 4);
        g.fillStyle(COPPER_DARK, 1); g.fillCircle(n.x, n.y, SWITCH_R);
        g.fillStyle(lit(COPPER, 0.1), 1); g.fillCircle(n.x, n.y, SWITCH_R - 3);
        g.lineStyle(2, own, 0.7 + k * 0.3); g.strokeCircle(n.x, n.y, SWITCH_R - 1 + k * 6);
        const to = nodes[n.nb[n.ptr]];
        const a = Math.atan2(to.y - n.y, to.x - n.x);
        const ca = Math.cos(a), sa = Math.sin(a);
        g.fillStyle(own, 1);
        g.fillTriangle(n.x + ca * 16, n.y + sa * 16, n.x - ca * 4 - sa * 8, n.y - sa * 4 + ca * 8, n.x - ca * 4 + sa * 8, n.y - sa * 4 - ca * 8);
        g.fillStyle(dim(own, 0.5), 1); g.fillCircle(n.x, n.y, 3);
        // The way it points glows a little down the trace.
        g.lineStyle(4, own, 0.18); g.lineBetween(n.x + ca * 22, n.y + sa * 22, n.x + ca * 70, n.y + sa * 70);
      }
      // A little silkscreen: Solde's board number in the corner.
      segText(g, W - 130, H - 30, 'SLD-01', 10, SILK, 0.35);
    },

    drawAir(g, time) {
      for (const p of pulses) {
        const A = nodes[p.from], B = nodes[p.to];
        const len = Math.max(1, dist(A.x, A.y, B.x, B.y));
        const pos = pulsePos(p);
        pulseBead(g, pos.x, pos.y, (B.x - A.x) / len, (B.y - A.y) / len, 7 + Math.sin(time / 40 + p.seed) * 1.2);
      }
      for (const s of sparks) {
        const k = (time - s.at) / 500;
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + s.x * 0.01;
          const r1 = 6 + k * 26, r2 = r1 + 8;
          g.lineStyle(2 * (1 - k), i % 2 ? PULSE : FILAMENT, 1 - k);
          g.lineBetween(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1, s.x + Math.cos(a + 0.2) * r2, s.y + Math.sin(a + 0.2) * r2);
        }
      }
    },

    drawHud(g) {
      // A legend chip at the top: how many pulses are on the board.
      const x = ctx.W / 2 - 60, y = ctx.top + 6;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x, y, 120, 16, 6);
      for (let i = 0; i < 7; i++) {
        g.fillStyle(i < pulses.length ? PULSE : dim(PULSE, 0.75), 1);
        g.fillCircle(x + 14 + i * 15, y + 8, 4);
      }
    },
  };
}

export const TRACES: GimmickDef = {
  id: 'circuit-traces',
  rules: 'Pulses race along the copper and zap whoever stands on a trace. Strike a junction to throw its switch and steer the current into your foe.',
  make,
};
