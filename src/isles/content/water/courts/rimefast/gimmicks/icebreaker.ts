import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, R, RCOL, alive, jit } from '../util';

/**
 * ICEBREAKER — Captain Floe.
 *
 * Floe fights on the harbour ice while his icebreaker, the *Rimebiter*, works the basin round
 * him. Every few seconds the horn goes and red flags spring up along a lane — then the iron prow
 * comes through it, end to end, ploughing anyone in its way aside for a heavy hit. It does not
 * care whose captain you are.
 *
 * The ship leaves open water behind its stern: a channel you can only wade through slowly, with
 * the cold biting the whole way, until it freezes over again. The floes on either side are pushed
 * apart as it goes — stand at the edge and you drift away from the cut.
 *
 * Floe lays the first lane of every pair through wherever you are standing, then fights from the
 * far bank of the channel it leaves. Cross it while he is reloading, or bait him into the lane —
 * the prow hits him just as hard.
 */

type Side = 'player' | 'npc';

interface Pass {
  vertical: boolean;
  /** Lane centre across the axis (y for a horizontal lane, x for a vertical one). */
  pos: number;
  /** Direction of travel along the axis: +1 or −1. */
  dir: 1 | -1;
  bornAt: number;
  fireAt: number;
  /** When the stern has cleared the far edge. */
  doneAt: number;
  closeAt: number;
  hit: Record<Side, boolean>;
  seed: number;
}

const HALF_W = 52;
const HULL_LEN = 560;
const SPEED = 600;
const WARN_MS = 2300;
const CHANNEL_MS = 6200;

export const ICEBREAKER: GimmickDef = {
  id: 'rimefast-icebreaker',
  rules: 'When the horn sounds and red flags go up, the icebreaker ploughs that lane — a heavy hit on anyone in it. It leaves a channel of icy water that is slow and cold to cross.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const passes: Pass[] = [];
    const damage = ctx.hard ? 24 : 20;
    const every = ctx.hard ? 5600 : 7000;
    let nextCall = -1;
    let callNo = 0;
    let now = 0;
    const lastChill: Record<Side, number> = { player: 0, npc: 0 };
    const swimNote: Record<Side, number> = { player: 0, npc: 0 };
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);

    const axisLen = (p: Pass): number => (p.vertical ? H - top : W);
    const axisStart = (p: Pass): number => (p.vertical ? (p.dir > 0 ? top : H) : (p.dir > 0 ? 0 : W));
    /** Where the bow is along the axis at time t (it starts a hull's length off the edge). */
    const bowAt = (p: Pass, t: number): number => axisStart(p) + p.dir * (-60 + ((t - p.fireAt) / 1000) * SPEED);
    const across = (p: Pass, f: Fighter): number => (p.vertical ? f.x - p.pos : f.y - p.pos);
    const along = (p: Pass, f: Fighter): number => (p.vertical ? f.y : f.x);

    /** The open channel's span along the axis at time t, as [lo, hi] — behind the stern. */
    const channelSpan = (p: Pass, t: number): [number, number] | null => {
      if (t < p.fireAt || t > p.closeAt) return null;
      const stern = bowAt(p, t) - p.dir * HULL_LEN;
      const start = axisStart(p);
      const end = p.dir > 0 ? Math.min(stern, start + axisLen(p) + 40) : Math.max(stern, start - axisLen(p) - 40);
      if ((end - start) * p.dir <= 0) return null;
      return [Math.min(start, end), Math.max(start, end)];
    };

    const call = (t: number): void => {
      const p = ctx.player;
      const vertical = callNo % 2 === 1 ? rng() < 0.7 : rng() < 0.35;
      // The first lane of a pair is laid on you; the second is the captain's whim.
      const onYou = callNo % 2 === 0;
      const lo = vertical ? 90 : top + 70, hi = vertical ? W - 90 : H - 60;
      const want = onYou ? (vertical ? p.x : p.y) : lo + rng() * (hi - lo);
      const pos = Math.max(lo, Math.min(hi, want));
      const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
      const fireAt = t + WARN_MS;
      const pass: Pass = {
        vertical, pos, dir, bornAt: t, fireAt,
        doneAt: fireAt + (((vertical ? H - top : W) + HULL_LEN + 120) / SPEED) * 1000,
        closeAt: 0, hit: { player: false, npc: false }, seed: rng() * 100,
      };
      pass.closeAt = pass.doneAt + CHANNEL_MS;
      passes.push(pass);
      ctx.sfx('train-horn');
      ctx.float(ctx.npc.x, ctx.npc.y - 52, onYou ? 'LAY HER ON THEM!' : 'HARD ABOUT!', RCOL.red);
      if (callNo === 0) ctx.banner('ICEBREAKER!', RCOL.red);
      // On hard, the second call of a pair is a double — two hulls a lane apart.
      if (ctx.hard && !onYou && rng() < 0.6) {
        const off = pos + (pos > (lo + hi) / 2 ? -190 : 190);
        passes.push({ ...pass, pos: off, dir: (-dir) as 1 | -1, fireAt: fireAt + 700, doneAt: pass.doneAt + 700, closeAt: pass.closeAt + 700, hit: { player: false, npc: false }, seed: rng() * 100 });
      }
      callNo++;
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextCall < 0) nextCall = time + 2600;
        if (dt === 0) return;
        if (time >= nextCall) { call(time); nextCall = time + every * (0.85 + rng() * 0.3); }

        for (const p of passes) {
          if (time < p.fireAt) continue;
          if (time >= p.fireAt && time - dt * 1000 < p.fireAt) ctx.sfx('engine');
          const bow = bowAt(p, time);
          const stern = bow - p.dir * HULL_LEN;
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (!alive(f)) continue;
            const off = across(p, f);
            const a = along(p, f);
            const inHull = Math.abs(off) < HALF_W + 16 && (a - stern) * p.dir >= 0 && (bow + p.dir * 30 - a) * p.dir >= 0;
            if (inHull && !p.hit[s] && time < p.doneAt) {
              p.hit[s] = true;
              ctx.hit(f, damage, f.x, f.y);
              ctx.sfx('clang');
              ctx.sfx('ice-shatter');
              const side = off >= 0 ? 1 : -1;
              const push = (HALF_W + 34 - Math.abs(off)) * side;
              ctx.nudge(f, p.vertical ? push : 0, p.vertical ? 0 : push);
              ctx.float(f.x, f.y - 46, s === 'player' ? 'RAMMED!' : 'RUN DOWN BY HIS OWN SHIP!', s === 'player' ? RCOL.red : RCOL.green);
            }
            // The floes either side of the cut drift apart for a couple of seconds after the stern.
            const span = channelSpan(p, time);
            if (span && time < p.doneAt + 2000 && a >= span[0] && a <= span[1]) {
              const d = Math.abs(off);
              if (d > HALF_W * 0.8 && d < HALF_W + 170) {
                const side = off >= 0 ? 1 : -1;
                const v = 38 * dt * side;
                ctx.nudge(f, p.vertical ? v : 0, p.vertical ? 0 : v);
              }
            }
          }
        }

        // Swimming the channel: cold bites while you wade.
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f) || !swimming(f)) continue;
          if (time - lastChill[s] > 900) {
            lastChill[s] = time;
            ctx.hit(f, ctx.hard ? 5 : 4, f.x, f.y);
            ctx.sfx('status-freeze');
          }
          if (time - swimNote[s] > 4000) {
            swimNote[s] = time;
            ctx.float(f.x, f.y - 40, 'ICE WATER', RCOL.deep);
          }
        }
        for (let i = passes.length - 1; i >= 0; i--) if (time > passes[i].closeAt + 1600) passes.splice(i, 1);
      },

      playerSpeedMult: () => (swimming(ctx.player) ? 0.48 : 1),
      npcSpeedMult: () => (swimming(ctx.npc) ? 0.48 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, pl = ctx.player;
        // Clear any lane about to fire.
        for (const p of passes) {
          if (now > p.doneAt || now < p.bornAt) continue;
          const off = across(p, n);
          if (Math.abs(off) < HALF_W + 40) {
            const side = off >= 0 ? 1 : -1;
            const to = p.pos + side * (HALF_W + 90);
            return p.vertical ? { x: to, y: n.y } : { x: n.x, y: to };
          }
        }
        // Keep an open channel between himself and you: stand on the far bank, level with you.
        for (const p of passes) {
          const span = channelSpan(p, now);
          if (!span || now > p.closeAt - 1200) continue;
          const pOff = across(p, pl), nOff = across(p, n);
          if (Math.abs(pOff) < HALF_W) continue;
          const mySide = pOff >= 0 ? -1 : 1;
          if (nOff * mySide < -HALF_W && Math.abs(nOff) > HALF_W) continue;
          const to = p.pos + mySide * (HALF_W + 70);
          const a = Math.max(span[0] + 30, Math.min(span[1] - 30, along(p, pl)));
          return p.vertical ? { x: to, y: a } : { x: a, y: to };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const p of passes) {
          // Warning: two rows of red flags marking the lane edges, chevrons pointing the way.
          if (time < p.fireAt + 300) {
            const k = Math.min(1, (time - p.bornAt) / (WARN_MS * 0.4));
            const urgent = p.fireAt - time < 700;
            const len = axisLen(p);
            g.fillStyle(R.scarf, (urgent ? 0.16 + Math.sin(time / 50) * 0.06 : 0.08) * k);
            if (p.vertical) g.fillRect(p.pos - HALF_W, top, HALF_W * 2, H - top);
            else g.fillRect(0, p.pos - HALF_W, W, HALF_W * 2);
            for (let s = 30; s < len; s += 70) {
              const a = (p.vertical ? top : 0) + s;
              for (const e of [-1, 1]) {
                const fx = p.vertical ? p.pos + e * HALF_W : a, fy = p.vertical ? a : p.pos + e * HALF_W;
                g.lineStyle(1.5, R.timberDark, k); g.lineBetween(fx, fy, fx, fy - 16 * k);
                const flap = Math.sin(time / 120 + s) * 2;
                g.fillStyle(R.scarf, k); g.fillTriangle(fx, fy - 16 * k, fx, fy - 9 * k, fx + 9 + flap, fy - 13 * k);
              }
              // Chevron pointing the ship's way.
              const cxp = p.vertical ? p.pos : a + 35, cyp = p.vertical ? a + 35 : p.pos;
              const d = p.dir * 9;
              g.lineStyle(2, R.scarf, 0.45 * k);
              if (p.vertical) { g.lineBetween(cxp - 9, cyp - d, cxp, cyp); g.lineBetween(cxp + 9, cyp - d, cxp, cyp); }
              else { g.lineBetween(cxp - d, cyp - 9, cxp, cyp); g.lineBetween(cxp - d, cyp + 9, cxp, cyp); }
            }
          }
          // The channel: black water with broken floes, refreezing at the end.
          const span = channelSpan(p, time);
          if (!span) continue;
          const closing = Math.max(0, Math.min(1, (p.closeAt - time) / 1500));
          const hw = HALF_W * (0.55 + 0.45 * closing);
          const rx = p.vertical ? p.pos - hw : span[0], ry = p.vertical ? Math.max(top, span[0]) : p.pos - hw;
          const rw = p.vertical ? hw * 2 : span[1] - span[0], rh = p.vertical ? Math.min(H, span[1]) - Math.max(top, span[0]) : hw * 2;
          if (rw <= 0 || rh <= 0) continue;
          g.fillStyle(R.slush, 0.9); g.fillRect(rx - (p.vertical ? 6 : 0), ry - (p.vertical ? 0 : 6), rw + (p.vertical ? 12 : 0), rh + (p.vertical ? 0 : 12));
          g.fillStyle(R.water, 0.95 * (0.4 + closing * 0.6)); g.fillRect(rx, ry, rw, rh);
          if (closing < 1) { g.fillStyle(R.iceDeep, 0.5 * (1 - closing)); g.fillRect(rx, ry, rw, rh); }
          // Broken floes turning in the water.
          const n = Math.floor((p.vertical ? rh : rw) / 46);
          for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n;
            const wob = Math.sin(t * 1.3 + i + p.seed) * hw * 0.45;
            const fx = p.vertical ? p.pos + wob : rx + u * rw, fy = p.vertical ? ry + u * rh : p.pos + wob;
            const s = 7 + jit(p.seed, i) * 9;
            g.fillStyle(R.iceDeep, 0.9); g.fillRect(fx - s, fy - s * 0.6 + 2, s * 2, s * 1.2);
            g.fillStyle(R.iceLit, 0.9); g.fillRect(fx - s, fy - s * 0.6, s * 2, s * 1.2);
          }
          // Wake lines along the edges.
          g.lineStyle(1.5, R.frost, 0.4);
          if (p.vertical) { g.lineBetween(p.pos - hw, ry, p.pos - hw, ry + rh); g.lineBetween(p.pos + hw, ry, p.pos + hw, ry + rh); }
          else { g.lineBetween(rx, p.pos - hw, rx + rw, p.pos - hw); g.lineBetween(rx, p.pos + hw, rx + rw, p.pos + hw); }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const p of passes) {
          if (time < p.fireAt - 900 || time > p.doneAt) continue;
          // Smoke from beyond the edge before she arrives — the funnel shows first.
          if (time < p.fireAt) {
            const k = 1 - (p.fireAt - time) / 900;
            const ex = p.vertical ? p.pos : (p.dir > 0 ? 18 : W - 18), ey = p.vertical ? (p.dir > 0 ? top + 14 : H - 14) : p.pos;
            for (let i = 0; i < 4; i++) {
              g.fillStyle(0x3a3a40, 0.35 * k); g.fillCircle(ex + Math.sin(time / 200 + i) * 10, ey - i * 9, 8 + i * 4);
            }
            continue;
          }
          drawShip(g, p, bowAt(p, time), time);
        }
      },
    };

    function swimming(f: Fighter): boolean {
      for (const p of passes) {
        const span = channelSpan(p, now);
        if (!span || now > p.closeAt - 200) continue;
        if (Math.abs(across(p, f)) < HALF_W * 0.85) {
          const a = along(p, f);
          if (a >= span[0] && a <= span[1]) return true;
        }
      }
      return false;
    }

    /**
     * The *Rimebiter* from above: a riveted iron hull with a fat ice-belt painted red at the bow,
     * a white wheelhouse, a raked funnel puffing coal smoke, and ice heaving up off the stem.
     */
    function drawShip(g: Phaser.GameObjects.Graphics, p: Pass, bow: number, time: number): void {
      const L = HULL_LEN, B = HALF_W * 1.7;
      // Local frame: u along travel (bow at u=0, stern at u=-L), v across.
      const P = (u: number, v: number): { x: number; y: number } => {
        const a = bow + p.dir * u;
        return p.vertical ? { x: p.pos + v, y: a } : { x: a, y: p.pos + v };
      };
      const poly = (pts: [number, number][], color: number, alpha = 1): void => {
        g.fillStyle(color, alpha);
        g.fillPoints(pts.map(([u, v]) => P(u, v)), true);
      };
      // Shadow and wash.
      poly([[10, 0], [-L * 0.12, B * 0.62], [-L, B * 0.56], [-L, -B * 0.56], [-L * 0.12, -B * 0.62]], 0x000000, 0.25);
      // Hull.
      poly([[0, 0], [-L * 0.14, B * 0.5], [-L * 0.97, B * 0.5], [-L, B * 0.4], [-L, -B * 0.4], [-L * 0.97, -B * 0.5], [-L * 0.14, -B * 0.5]], R.hull);
      poly([[-4, 0], [-L * 0.14, B * 0.42], [-L * 0.95, B * 0.42], [-L * 0.95, -B * 0.42], [-L * 0.14, -B * 0.42]], R.hullLit);
      // The red ice-belt at the bow.
      poly([[0, 0], [-L * 0.14, B * 0.5], [-L * 0.2, B * 0.5], [-L * 0.07, 0], [-L * 0.2, -B * 0.5], [-L * 0.14, -B * 0.5]], R.scarf);
      // Deck planking and rivet lines.
      for (let u = -L * 0.22; u > -L * 0.94; u -= 22) {
        const a = P(u, -B * 0.4), b = P(u, B * 0.4);
        g.lineStyle(1, dim(R.hullLit, 0.3), 0.8); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (const v of [-B * 0.46, B * 0.46]) {
        for (let u = -L * 0.18; u > -L * 0.96; u -= 14) { const q = P(u, v); g.fillStyle(R.ironLit, 0.8); g.fillCircle(q.x, q.y, 1.2); }
      }
      // Wheelhouse, white and rimed, with dark windows facing forward.
      poly([[-L * 0.42, B * 0.3], [-L * 0.62, B * 0.3], [-L * 0.62, -B * 0.3], [-L * 0.42, -B * 0.3]], lit(R.canvas, 0.2));
      for (let i = -2; i <= 2; i++) { const q = P(-L * 0.43, i * B * 0.1); g.fillStyle(R.blackIce, 1); g.fillRect(q.x - 3, q.y - 3, 6, 6); }
      // Funnel, raked aft, with a band in the Queen's green.
      const f0 = P(-L * 0.7, 0);
      g.fillStyle(0x1a1a1e, 1); g.fillCircle(f0.x, f0.y, 15);
      g.fillStyle(R.livery, 1); g.fillCircle(f0.x, f0.y, 11);
      g.fillStyle(0x0a0a0c, 1); g.fillCircle(f0.x, f0.y, 6);
      for (let i = 0; i < 5; i++) {
        const ph = ((time / 500 + i * 0.2) % 1);
        const q = P(-L * 0.7 - ph * 120, Math.sin(time / 300 + i) * 14);
        g.fillStyle(0x3a3a40, 0.45 * (1 - ph)); g.fillCircle(q.x, q.y, 10 + ph * 18);
      }
      // Anchor at the hawse, chain on deck, a stern flag.
      const an = P(-L * 0.1, B * 0.3);
      g.lineStyle(2, R.ironLit, 1); g.strokeCircle(an.x, an.y, 4);
      const st = P(-L * 0.99, 0);
      const flap = Math.sin(time / 90) * 3;
      g.fillStyle(R.livery, 1);
      if (p.vertical) g.fillTriangle(st.x, st.y, st.x + 10 + flap, st.y - p.dir * 14, st.x - 10 + flap, st.y - p.dir * 14);
      else g.fillTriangle(st.x, st.y, st.x - p.dir * 14, st.y + 10 + flap, st.x - p.dir * 14, st.y - 10 + flap);
      // Ice heaving off the stem: broken plates thrown aside.
      for (let i = 0; i < 8; i++) {
        const ph = ((time / 260 + i / 8) % 1);
        const side = i % 2 ? 1 : -1;
        const q = P(8 - ph * 60, side * (B * 0.3 + ph * 50));
        g.fillStyle(R.iceLit, 0.9 * (1 - ph)); g.fillRect(q.x - 5, q.y - 3, 10, 6);
        g.fillStyle(R.snow, 0.7 * (1 - ph)); g.fillCircle(q.x + 3, q.y - 4, 3);
      }
    }
  },
};
