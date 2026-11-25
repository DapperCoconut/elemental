import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { bolt, sparks } from '../art';
import {
  ARC, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, COPPER_LIT, IRON_DARK, OFF_RED, SPARK, TIMBER, TIMBER_DARK,
} from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Flux Linkage — Armature-Wright Esmé Varnhagen, who wound the armature of the great dynamo in the
 * Generator Hall by hand, turn by turn, and in the King's telling wound the boy Volt's first coil
 * for him and taught him the one law she knew: move a conductor through a field and it will pay.
 *
 * Four great copper coils lie on the setts, each wound in a different-coloured cloth wire, and
 * each wire runs across the floor to a brass terminal somewhere else in the yard. A fighter who
 * walks *into* a coil makes it pay: a pulse runs down its wire (you can watch the bead of light
 * travel) and the terminal at the far end bursts, hurting whoever stands on it. Faraday's rule —
 * the faster the change, the bigger the pulse — so a coil entered at a dash pays double and stuns.
 *
 * So the yard is a switchboard: when she stands on a terminal, run through the coil wired to it;
 * when she heads for a coil, follow its wire and get off its terminal. Halfway down she rewinds the
 * coils every few seconds: the wires flicker, and the colours land on new terminals.
 */

const ID = fallenId('dynamo', 'flux-linkage');
const COIL_R = 44;
const TERM_R = 60;
const TRAVEL_MS = 620;
const COIL_CD = 1600;
const REWIND_EVERY = 7000;
const REWIND_WARN = 1300;
const WIRE = [0xc8382e, 0x3aa86a, 0xe8c838, 0x4a8ad8];

interface Pulse { coil: number; term: number; at: number; big: boolean; by: Fighter }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const ym = (top + H) / 2;
  const coils: Pt[] = [{ x: 190, y: top + 120 }, { x: W - 190, y: top + 120 }, { x: 190, y: H - 100 }, { x: W - 190, y: H - 100 }];
  const terms: Pt[] = [{ x: W / 2, y: top + 104 }, { x: W / 2, y: H - 84 }, { x: 92, y: ym }, { x: W - 92, y: ym }];
  let wiring = shuffle([0, 1, 2, 3]);
  const ready = [0, 0, 0, 0];
  const inside = new Map<Fighter, boolean[]>([[player, [false, false, false, false]], [npc, [false, false, false, false]]]);
  const pulses: Pulse[] = [];
  const bursts: { x: number; y: number; at: number; big: boolean }[] = [];
  let rewinding = false;
  let rewindAt = 0;

  function shuffle(a: number[]): number[] {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(ctx.rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  /** The wire's lay: out of the coil, along the floor at a right angle, into the terminal. */
  function wirePath(i: number, t = wiring[i]): Pt[] {
    const c = coils[i], e = terms[t];
    const lane = (i - 1.5) * 9;
    return [c, { x: c.x, y: e.y + lane }, { x: e.x, y: e.y + lane }, e];
  }

  function along(path: Pt[], k: number): Pt {
    const segs = path.slice(1).map((p, i) => dist(path[i].x, path[i].y, p.x, p.y));
    let d = k * segs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const f = segs[i] ? clamp(d / segs[i], 0, 1) : 1;
        return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
      }
      d -= segs[i];
    }
    return path[path.length - 1];
  }

  function burst(p: Pulse, time: number): void {
    const t = terms[p.term];
    bursts.push({ x: t.x, y: t.y, at: time, big: p.big });
    ctx.sfx(p.big ? 'thunder' : 'zap');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, t.x, t.y) > TERM_R) continue;
      const n = p.big ? 24 : 12;
      if (f === player) tk.hitPlayer(n, f.x, f.y); else ctx.hit(f, n, f.x, f.y);
      if (p.big) ctx.stun(f, 450);
      if (f !== p.by) ctx.float(f.x, f.y - 50, p.big ? 'INDUCED!' : 'INDUCED', f === npc ? '#bff0ff' : '#ffb0a0');
    }
  }

  return {
    update(time) {
      if (!rewinding && npc.hp < npc.maxHp * 0.5) {
        rewinding = true; rewindAt = time + 2500;
        ctx.banner('She is rewinding the coils — watch the wires change', '#ffe2a8');
      }
      if (rewinding && time >= rewindAt) {
        let next = shuffle([0, 1, 2, 3]);
        while (next.every((v, i) => v === wiring[i])) next = shuffle(next);
        wiring = next; rewindAt = time + REWIND_EVERY;
        ctx.sfx('gear-turn');
      }
      // Entering a coil makes it pay.
      for (const f of [player, npc]) {
        const st = inside.get(f);
        if (!st || !alive(f)) continue;
        coils.forEach((c, i) => {
          const now = dist(f.x, f.y, c.x, c.y) < COIL_R;
          if (now && !st[i] && time >= ready[i]) {
            ready[i] = time + COIL_CD;
            const big = ctx.dashing(f);
            pulses.push({ coil: i, term: wiring[i], at: time, big, by: f });
            ctx.sfx(big ? 'plasma-arc' : 'electric-charge');
          }
          st[i] = now;
        });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        if (time - pulses[i].at >= TRAVEL_MS) { burst(pulses[i], time); pulses.splice(i, 1); }
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 450) bursts.splice(i, 1);
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Off any terminal a pulse is running to.
      for (const p of pulses) {
        const t = terms[p.term];
        const d = dist(npc.x, npc.y, t.x, t.y);
        if (d < TERM_R + 24) {
          const a = Math.atan2(npc.y - t.y, npc.x - t.x);
          return { x: clamp(t.x + Math.cos(a) * 130, 50, W - 50), y: clamp(t.y + Math.sin(a) * 130, top + 40, H - 40) };
        }
      }
      // The player stands on a terminal: run through the coil wired to it.
      const tp = terms.findIndex((t) => dist(player.x, player.y, t.x, t.y) < TERM_R + 8);
      if (tp >= 0) {
        const ci = wiring.indexOf(tp);
        const c = coils[ci];
        if (now() >= ready[ci] - 300) {
          const st = inside.get(npc);
          if (st && st[ci]) {
            const a = Math.atan2(npc.y - c.y, npc.x - c.x);
            return { x: clamp(c.x + Math.cos(a) * 90, 50, W - 50), y: clamp(c.y + Math.sin(a) * 90, top + 40, H - 40) };
          }
          return { x: c.x, y: c.y };
        }
      }
      // Never loiter on a terminal.
      const mine = terms.find((t) => dist(npc.x, npc.y, t.x, t.y) < TERM_R);
      if (mine) return { x: (mine.x + W / 2) / 2, y: ym + (mine.y < ym ? 40 : -40) };
      return null;
    },

    drawGround(g, time) {
      const warn = rewinding && rewindAt - time < REWIND_WARN;
      // Wires first, under everything.
      for (let i = 0; i < 4; i++) {
        const path = wirePath(i);
        const flick = warn && Math.floor(time / 90) % 2 === 0;
        g.lineStyle(7, 0x0a0b0e, 0.5);
        g.beginPath(); g.moveTo(path[0].x, path[0].y + 2); for (const p of path.slice(1)) g.lineTo(p.x, p.y + 2); g.strokePath();
        g.lineStyle(5, WIRE[i], flick ? 0.3 : 0.85);
        g.beginPath(); g.moveTo(path[0].x, path[0].y); for (const p of path.slice(1)) g.lineTo(p.x, p.y); g.strokePath();
        // Cloth braid: little diagonal ticks along the run.
        for (let k = 0.04; k < 0.98; k += 0.035) {
          const p = along(path, k);
          g.lineStyle(1, 0x000000, 0.3); g.lineBetween(p.x - 2, p.y - 2, p.x + 2, p.y + 2);
        }
      }
      // Terminals: brass studs on a slate block, ringed in their wire's colour.
      terms.forEach((t, ti) => {
        const ci = wiring.indexOf(ti);
        const hot = pulses.some((p) => p.term === ti);
        const k = hot ? Math.max(...pulses.filter((p) => p.term === ti).map((p) => (time - p.at) / TRAVEL_MS)) : 0;
        g.fillStyle(hot ? OFF_RED : 0x000000, hot ? 0.1 + k * 0.25 : 0.12); g.fillCircle(t.x, t.y, TERM_R);
        g.lineStyle(2, WIRE[ci], 0.5 + k * 0.5); g.strokeCircle(t.x, t.y, TERM_R);
        if (hot) { g.lineStyle(3, OFF_RED, 0.8); g.strokeCircle(t.x, t.y, TERM_R * (1 - k) + 6); }
        drawTerminal(g, t.x, t.y, WIRE[ci], hot, time);
      });
      // Coils.
      coils.forEach((c, i) => drawCoil(g, c.x, c.y, WIRE[i], time >= ready[i], time));
      for (const b of bursts) {
        const k = clamp((time - b.at) / 450, 0, 1);
        g.lineStyle(b.big ? 6 : 3, b.big ? 0xffffff : ARC, 1 - k); g.strokeCircle(b.x, b.y, TERM_R * (0.4 + k * 0.7));
      }
    },

    drawAir(g, time) {
      for (const p of pulses) {
        const path = wirePath(p.coil, p.term);
        const k = clamp((time - p.at) / TRAVEL_MS, 0, 1);
        const q = along(path, k), q0 = along(path, Math.max(0, k - 0.08));
        bolt(g, q0.x, q0.y - 4, q.x, q.y - 4, Math.floor(time / 40), p.big ? 4 : 2, p.big ? 0xffffff : ARC, 0.9, 6, false);
        glow(g, q.x, q.y, p.big ? 30 : 18, WIRE[p.coil], 0.12, 3);
        sparks(g, q.x, q.y, p.big ? 16 : 9, time, p.big ? 7 : 4, SPARK);
      }
      for (const b of bursts) {
        const k = clamp((time - b.at) / 450, 0, 1);
        for (let j = 0; j < (b.big ? 6 : 3); j++) {
          const a = j * 1.1 + b.at;
          bolt(g, b.x, b.y - 10, b.x + Math.cos(a) * TERM_R, b.y + Math.sin(a) * TERM_R * 0.5, b.at + j, 2 * (1 - k) + 1, ARC, 1 - k, 10, false);
        }
      }
    },

    drawHud(g, time) {
      // Four coil glyphs in their wire colours, lit when the coil will pay.
      const x0 = W / 2 - 66, y = top + 12;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 10, y - 9, 152, 20, 6);
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * 44, on = time >= ready[i];
        for (let k = 0; k < 4; k++) { g.lineStyle(2, on ? COPPER_LIT : COPPER_DARK, on ? 1 : 0.6); g.strokeEllipse(x + k * 4 - 6, y, 6, 12); }
        g.fillStyle(WIRE[i], on ? 1 : 0.35); g.fillRect(x + 12, y - 2, 10, 4);
      }
    },
  };

  /** Scene time without a parameter, for the seek hook (it is handed none). */
  function now(): number { return tk.now; }
}

/** A floor coil: a timber former, layer on layer of copper turns, a cloth band in its wire's colour. */
function drawCoil(g: G, x: number, y: number, wire: number, on: boolean, time: number): void {
  shadow(g, x, y + 6, COIL_R * 2.3, 22, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y + 4, COIL_R * 2 + 10, COIL_R * 0.95 + 6);
  g.fillStyle(0x0c0d10, 1); g.fillEllipse(x, y, COIL_R * 1.5, COIL_R * 0.62);
  for (let k = 0; k < 7; k++) {
    const r = COIL_R * (0.78 + k * 0.035);
    g.lineStyle(2, k % 2 ? COPPER : COPPER_LIT, on ? 1 : 0.55);
    g.strokeEllipse(x, y - k * 0.8, r * 2, r * 0.82);
  }
  g.lineStyle(5, wire, 0.9); g.strokeEllipse(x, y - 3, COIL_R * 1.92, COIL_R * 0.78);
  for (const a of [0.4, 2.0, 3.6, 5.1]) {
    g.fillStyle(TIMBER, 1); g.fillRect(x + Math.cos(a) * COIL_R - 3, y + Math.sin(a) * COIL_R * 0.42 - 4, 6, 8);
  }
  if (on) sparks(g, x + COIL_R * 0.9, y, 8, time, 2, SPARK);
}

/** A terminal block: slate base, two brass studs with knurled nuts, the wire lugged on in colour. */
function drawTerminal(g: G, x: number, y: number, wire: number, hot: boolean, time: number): void {
  g.fillStyle(0x23262e, 1); g.fillRoundedRect(x - 22, y - 12, 44, 22, 4);
  g.fillStyle(0x343843, 1); g.fillRoundedRect(x - 22, y - 12, 44, 6, 3);
  for (const k of [-10, 10]) {
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + k, y, 7);
    g.fillStyle(hot ? BRASS_LIT : BRASS, 1); g.fillCircle(x + k, y - 2, 5.5);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k, y - 2, 2);
  }
  g.lineStyle(3, wire, 1); g.lineBetween(x - 10, y + 4, x - 10, y + 14);
  if (hot) { sparks(g, x, y - 4, 16, time, 6, ARC); glow(g, x, y, 34, ARC, 0.08, 3); }
}

export const FALLEN_FLUX_LINKAGE: GimmickDef = {
  id: ID,
  rules: 'Walk into a coil and its wire bursts the terminal at the other end; at a dash, double and stunning. Run the coil wired to where she stands.',
  make,
};
