import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import {
  BUOY, BUOY_DARK, DRIFT, DRIFT_DARK, FOAM, PAINT_CREAM, PILE, PILE_WET, ROPE, ROPE_DARK, SEA_LIT, SHINGLE_DARK,
  WEED, WETSAND_DARK,
} from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * The Seine — Seine-Master Garrow (string).
 *
 * The Prince's seine is the long net the flats are swept with at the ebb — for fish, the crown
 * says, and for anyone who owes. Garrow runs it. A seine is staked along one edge of the flats
 * (it lies there in folds a moment first, so you see which way it will come), then it sweeps right
 * across, faster than anyone can walk. Its one way through is the *purse-mouth*, a gap in the mesh.
 *
 * Meet the net anywhere else and you are in it: shoved along in front of the mesh, tangled and slow,
 * until it reaches the far side and is *hauled* — a hard wrench that leaves you stunned. Caught,
 * you can still walk along the net to a gap and slip out behind it.
 *
 * The head-rope is buoyed with cork floats, and floats can be struck. Strike one and the mesh
 * under it is cut: a new gap. Strike one beside a fighter caught in the mesh and you *cinch* it
 * on them instead — hauled on the spot. Garrow does both. Below half he sets two nets at once
 * from opposite sides, and their mouths will not line up.
 */

const SPEED = 170;
const WARN_MS = 1600;
const FLOAT_STEP = 64;
const MOUTH_HALF = 62;
const CUT_HALF = 40;
const CATCH_FRONT = 16;
const CATCH_BACK = -24;
const HAUL_DMG = 16;
const HAUL_STUN = 900;

/** A float on the head-rope, `c` along the net; struck, it cuts or cinches. */
interface Float { c: number; t: StrikeTarget | null }
/** One seine on the flats. */
interface Net {
  vertical: boolean; dir: number; pos: number; end: number; start: number;
  gaps: { c: number; half: number }[]; floats: Float[];
  caught: Set<Fighter>; spent: Set<Fighter>; done: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let nets: Net[] = [];
  let started = false;
  let nextNet = 0;
  let closing = false;

  const axisOf = (n: Net, f: Fighter): number => (n.vertical ? f.x : f.y);
  const latOf = (n: Net, f: Fighter): number => (n.vertical ? f.y : f.x);
  const latRange = (n: Net): [number, number] => (n.vertical ? [top, H] : [0, W]);
  const at = (n: Net, c: number): { x: number; y: number } => (n.vertical ? { x: n.pos, y: c } : { x: c, y: n.pos });
  const inGap = (n: Net, lat: number): boolean => n.gaps.some((g) => Math.abs(lat - g.c) < g.half - 6);
  const sweeping = (n: Net, time: number): boolean => time >= n.start + WARN_MS && !n.done;

  function hurt(f: Fighter, amount: number): void {
    if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y);
  }

  function haul(n: Net, f: Fighter): void {
    n.caught.delete(f);
    n.spent.add(f);
    hurt(f, HAUL_DMG);
    ctx.stun(f, HAUL_STUN);
    ctx.sfx('whip');
    ctx.sfx('chain');
  }

  function struck(n: Net, fl: Float, by: Striker): void {
    if (!fl.t || n.done) return;
    const striker = by === 'player' ? player : npc;
    const p = at(n, fl.c);
    // Beside a caught fighter (not the striker): cinch it on them.
    for (const f of n.caught) {
      if (f !== striker && Math.hypot(f.x - p.x, f.y - p.y) < 100) {
        haul(n, f);
        ctx.flash(f.x, f.y, ROPE);
        return;
      }
    }
    fl.t.remove(); fl.t = null;
    n.gaps.push({ c: fl.c, half: CUT_HALF });
    ctx.sfx('slash');
  }

  function lay(vertical: boolean, dir: number, time: number): void {
    const [a0, a1] = vertical ? [0, W] : [top, H];
    const n: Net = {
      vertical, dir, pos: dir > 0 ? a0 + 10 : a1 - 10, end: dir > 0 ? a1 - 26 : a0 + 26, start: time,
      gaps: [], floats: [], caught: new Set(), spent: new Set(), done: false,
    };
    const [l0, l1] = latRange(n);
    n.gaps.push({ c: l0 + 90 + ctx.rng() * (l1 - l0 - 180), half: MOUTH_HALF });
    for (let c = l0 + FLOAT_STEP / 2; c < l1; c += FLOAT_STEP) {
      const fl: Float = { c, t: null };
      if (!inGap(n, c)) {
        const p = at(n, c);
        fl.t = ctx.target({ x: p.x, y: p.y, r: 16, passThrough: true, onStruck: (by) => struck(n, fl, by) });
      }
      n.floats.push(fl);
    }
    nets.push(n);
    ctx.sfx('trap-set');
  }

  function finish(n: Net): void {
    n.done = true;
    for (const f of [...n.caught]) haul(n, f);
    for (const fl of n.floats) { fl.t?.remove(); fl.t = null; }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextNet = time + 3500; }
      if (!closing && npc.hp < npc.maxHp * 0.55) {
        closing = true;
        ctx.banner('THE PURSE CLOSES — two nets at once', '#b89a62');
        ctx.sfx('chain');
      }
      if (time >= nextNet && !nets.some((n) => !n.done)) {
        const vertical = ctx.rng() < 0.5;
        const dir = ctx.rng() < 0.5 ? 1 : -1;
        lay(vertical, dir, time);
        if (closing) lay(vertical, -dir, time);
        nextNet = time + 2600;
      }
      for (const n of nets) {
        if (!sweeping(n, time)) continue;
        n.pos += n.dir * SPEED * dt;
        for (const fl of n.floats) if (fl.t) { const p = at(n, fl.c); fl.t.moveTo(p.x, p.y); }
        for (const f of [player, npc]) {
          if (!alive(f) || n.spent.has(f)) continue;
          const rel = (axisOf(n, f) - n.pos) * n.dir;
          if (inGap(n, latOf(n, f)) || rel > 40) { n.caught.delete(f); continue; }
          if (rel < CATCH_FRONT && rel > CATCH_BACK) {
            if (!n.caught.has(f)) { n.caught.add(f); ctx.sfx('trap-snap'); }
            const push = (CATCH_FRONT - rel) * n.dir;
            ctx.nudge(f, n.vertical ? push : 0, n.vertical ? 0 : push);
          }
        }
        if ((n.pos - n.end) * n.dir >= 0) finish(n);
      }
      nets = nets.filter((n) => !n.done || time < n.start + 12000);
      if (nets.every((n) => n.done) && nextNet < time) nextNet = time + 2600;
    },

    playerSpeedMult: () => (nets.some((n) => n.caught.has(player)) ? 0.75 : 1),
    npcSpeedMult: () => (nets.some((n) => n.caught.has(npc)) ? 0.75 : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      const live = nets.filter((n) => !n.done);
      // You are in the mesh and Garrow is clear of it: go to the float beside you and cinch.
      for (const n of live) {
        if (!n.caught.has(player) || n.caught.has(npc)) continue;
        const fl = n.floats.filter((f) => f.t).sort((a, b) => Math.abs(a.c - latOf(n, player)) - Math.abs(b.c - latOf(n, player)))[0];
        if (fl) { const p = at(n, fl.c); return { x: p.x - (n.vertical ? n.dir * 30 : 0), y: p.y - (n.vertical ? 0 : n.dir * 30) }; }
      }
      // A net is coming at Garrow: line up on its nearest gap.
      for (const n of live) {
        const rel = (axisOf(n, npc) - n.pos) * n.dir;
        if (rel < CATCH_BACK || (sweeping(n, time) && rel > 300)) continue;
        const lat = latOf(n, npc);
        const gap = n.gaps.reduce((b, g) => (Math.abs(g.c - lat) < Math.abs(b.c - lat) ? g : b));
        const [l0, l1] = latRange(n);
        const c = clamp(gap.c, l0 + 50, l1 - 50);
        return n.vertical ? { x: npc.x, y: c } : { x: c, y: npc.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const n of nets) {
        if (n.done) continue;
        const [l0, l1] = latRange(n);
        const P = (c: number, off: number): { x: number; y: number } => (n.vertical ? { x: n.pos - n.dir * off, y: c } : { x: c, y: n.pos - n.dir * off });
        if (!sweeping(n, time)) {
          // Staked: the net lies in folds along its edge, the sweep direction chevroned out ahead.
          const k = clamp((time - n.start) / WARN_MS, 0, 1);
          for (let c = l0 + 10; c < l1; c += 26) {
            if (inGap(n, c)) continue;
            const p = P(c, -10);
            g.fillStyle(ROPE_DARK, 0.6); g.fillEllipse(p.x, p.y, n.vertical ? 14 : 24, n.vertical ? 24 : 14);
          }
          for (let c = l0 + 40; c < l1; c += 90) {
            const d = 40 + ((time / 6) % 60);
            const a = P(c, -d), b = P(c, -d - 14);
            g.lineStyle(3, ROPE, 0.25 + k * 0.5);
            const sx = n.vertical ? 0 : 9, sy = n.vertical ? 9 : 0;
            g.lineBetween(a.x - sx, a.y - sy, b.x, b.y); g.lineBetween(a.x + sx, a.y + sy, b.x, b.y);
          }
          for (const gp of n.gaps) {
            const p = P(gp.c, -20);
            g.lineStyle(2, SEA_LIT, 0.6); g.strokeEllipse(p.x, p.y, n.vertical ? 24 : gp.half * 2, n.vertical ? gp.half * 2 : 24);
          }
          continue;
        }
        // Sweeping: a wake of churned sand behind, the lead-line dragging, mesh up to the head-rope.
        for (let c = l0; c < l1; c += 30) {
          const p = P(c + 15, 34);
          g.fillStyle(WETSAND_DARK, 0.35); g.fillEllipse(p.x, p.y, n.vertical ? 30 : 34, n.vertical ? 34 : 30);
        }
        for (let c = l0; c < l1; c += 12) {
          if (inGap(n, c) || inGap(n, c + 12)) continue;
          const a = P(c, 0), b = P(c + 12, 14), d = P(c + 12, 0), e = P(c, 14);
          g.lineStyle(1, PAINT_CREAM, 0.55); g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(d.x, d.y, e.x, e.y);
        }
        // Lead-line with its weights, head-rope with frayed ends at each gap.
        let run: number | null = null;
        for (let c = l0; c <= l1; c += 6) {
          const open = inGap(n, c) || c + 6 > l1;
          if (!open && run === null) run = c;
          if (open && run !== null) {
            const a = P(run, 0), b = P(c, 0), la = P(run, 14), lb = P(c, 14);
            g.lineStyle(2, SHINGLE_DARK, 0.9); g.lineBetween(la.x, la.y, lb.x, lb.y);
            g.lineStyle(4, ROPE_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(2, ROPE, 1); g.lineBetween(a.x, a.y, b.x, b.y);
            for (const end of [run, c]) {
              const q = P(end, 0);
              g.lineStyle(1.2, ROPE, 0.9);
              for (let i = -1; i <= 1; i++) g.lineBetween(q.x, q.y, q.x + (n.vertical ? i * 6 : (end === run ? -6 : 6)), q.y + (n.vertical ? (end === run ? -6 : 6) : i * 6));
            }
            run = null;
          }
        }
        for (let c = l0 + 20; c < l1; c += 40) {
          if (inGap(n, c)) continue;
          const p = P(c, 14);
          g.fillStyle(PILE_WET, 1); g.fillRect(p.x - 3, p.y - 3, 6, 6);
        }
        // Weed and a flapping fish snagged in the mesh.
        const wp = P(l0 + ((n.start / 7) % (l1 - l0)), 8);
        if (!inGap(n, n.vertical ? wp.y : wp.x)) {
          g.fillStyle(WEED, 0.8); g.fillEllipse(wp.x, wp.y, 16, 6);
          g.fillStyle(SEA_LIT, 0.9); g.fillEllipse(wp.x + 6, wp.y - 3 + Math.sin(time / 90) * 2, 12, 5);
        }
      }
    },

    drawAir(g, time) {
      for (const n of nets) {
        if (n.done || !sweeping(n, time)) continue;
        // Cork floats bobbing along the head-rope, crown-red every third.
        n.floats.forEach((fl, i) => {
          if (!fl.t) return;
          const p = at(n, fl.c);
          const bob = Math.sin(time / 200 + i) * 1.5;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 2, p.y + 6, 16, 5);
          g.fillStyle(i % 3 === 0 ? BUOY_DARK : DRIFT_DARK, 1); g.fillEllipse(p.x, p.y + bob, 17, 13);
          g.fillStyle(i % 3 === 0 ? BUOY : PAINT_CREAM, 1); g.fillEllipse(p.x, p.y - 1 + bob, 14, 10);
          g.fillStyle(FOAM, 0.6); g.fillEllipse(p.x - 3, p.y - 3 + bob, 5, 2.5);
          g.lineStyle(1.2, ROPE_DARK, 1); g.lineBetween(p.x - 7, p.y + bob, p.x + 7, p.y + bob);
        });
        // Stakes and haul-posts at the two ends of the head-rope.
        const [l0, l1] = latRange(n);
        for (const c of [l0 + 4, l1 - 4]) {
          const p = at(n, c);
          g.fillStyle(DRIFT_DARK, 1); g.fillRect(p.x - 4, p.y - 26, 8, 28);
          g.fillStyle(DRIFT, 1); g.fillRect(p.x - 2, p.y - 26, 3, 28);
        }
        // Whoever is caught wears the mesh.
        for (const f of n.caught) {
          if (!alive(f)) continue;
          g.lineStyle(1.2, PAINT_CREAM, 0.8);
          for (let i = -2; i <= 2; i++) {
            g.lineBetween(f.x - 22 + i * 8, f.y - 34, f.x + 2 + i * 8, f.y + 16);
            g.lineBetween(f.x + 22 + i * 8, f.y - 34, f.x - 2 + i * 8, f.y + 16);
          }
          g.fillStyle(PILE, 1); g.fillCircle(f.x - 18, f.y + 16, 2.5); g.fillCircle(f.x + 18, f.y + 16, 2.5);
        }
      }
    },

    drawHud(g, time) {
      // The next sweep: a coiled net filling; two coils once the purse is closing.
      const x = W / 2, y = top + 20;
      const live = nets.find((n) => !n.done);
      const k = live ? 1 : clamp(1 - (nextNet - time) / 2600, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 34, y - 15, 68, 30, 8);
      const coils = closing ? [x - 14, x + 14] : [x];
      for (const cx of coils) {
        g.lineStyle(2, ROPE_DARK, 1); g.strokeCircle(cx, y, 10);
        g.lineStyle(2, ROPE, 1); g.beginPath(); g.arc(cx, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        g.lineStyle(1, PAINT_CREAM, 0.7); g.strokeCircle(cx, y, 5);
        g.fillStyle(BUOY, 1); g.fillEllipse(cx, y - 10, 7, 5);
      }
      if (nets.some((n) => n.caught.has(player))) { g.lineStyle(2, BUOY, 0.6 + Math.sin(time / 100) * 0.3); g.strokeRoundedRect(x - 34, y - 15, 68, 30, 8); }
    },

    destroy() {
      for (const n of nets) for (const fl of n.floats) fl.t?.remove();
      nets = [];
    },
  };
}

export const FALLEN_SEINE: GimmickDef = {
  id: fallenId('tidewater', 'seine'),
  rules: 'A seine sweeps the flats: slip through its gap or be hauled. Strike a float to cut a new gap — or, beside someone caught, to haul them now.',
  make,
};
