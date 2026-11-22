import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { piezoPlate } from '../art';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Piezo — Sparker Tourmaline.
 *
 * Six slabs of tourmaline are set flush in the floor. Squeeze tourmaline and it makes a spark:
 * every second a fighter stands on a plate charges it (walking about on it charges it faster),
 * and Tourmaline, who has a knack, charges whatever he stands on at double the rate. A plate
 * that fills arcs — to the nearest fighter who is *not* standing on crystal. Stand on a plate and
 * the lightning cannot find you; it finds him.
 *
 * But a full plate with nobody off-crystal to strike holds its charge only so long. Then it
 * earths through whoever is standing on it. So: don't loiter on a plate that's full. Hop.
 */

const PLATE_R = 50;
const ON_R = PLATE_R * 0.9;
const FILL_PER_S = 17;
const WALK_PER_PX = 0.09;
const ARC_WARN = 700;
const HOLD_MS = 2600;

interface Plate { x: number; y: number; charge: number; fullAt: number; arcAt: number; arcTo: Pt | null; arcFx: number; earthFx: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const arcDmg = ctx.hard ? 16 : 13;
  const earthDmg = ctx.hard ? 11 : 9;
  const plates: Plate[] = [];
  for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.3, 0.75]) {
    plates.push({ x: W * fx + (fy > 0.5 ? 40 : -40), y: top + (H - top) * fy, charge: 0, fullAt: -1, arcAt: -1, arcTo: null, arcFx: -9999, earthFx: -9999 });
  }
  const last = new Map<Fighter, Pt>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);

  const plateOf = (f: Fighter): Plate | null => {
    if (!alive(f)) return null;
    for (const p of plates) if (Math.hypot((f.x - p.x) / ON_R, (f.y - p.y) / (ON_R * 0.62 + 12)) < 1) return p;
    return null;
  };

  /** Nearest fighter off crystal, within reach of a plate. */
  const target = (p: Plate): Fighter | null => {
    let best: Fighter | null = null, bd = 560;
    for (const f of [player, npc]) {
      if (!alive(f) || plateOf(f)) continue;
      const d = dist(p.x, p.y, f.x, f.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // Charge plates underfoot.
      for (const f of [player, npc]) {
        const p = plateOf(f);
        const l = last.get(f);
        const moved = l ? dist(l.x, l.y, f.x, f.y) : 0;
        last.set(f, { x: f.x, y: f.y });
        if (!p || p.fullAt >= 0) continue;
        const knack = f === npc ? 2 : 1;
        p.charge = clamp(p.charge + (FILL_PER_S * dt + Math.min(moved, 20) * WALK_PER_PX) * knack, 0, 100);
        if (p.charge >= 100) { p.fullAt = time; ctx.sfx('electric-charge'); }
      }
      for (const p of plates) {
        if (p.fullAt < 0) continue;
        // Full: pick a target and warn; if nobody is off crystal, hold, then earth.
        if (p.arcAt < 0) {
          const t = target(p);
          if (t) { p.arcAt = time + ARC_WARN; p.arcTo = { x: t.x, y: t.y }; ctx.sfx('zap'); }
          else if (time - p.fullAt > HOLD_MS) {
            const on = [player, npc].filter((f) => plateOf(f) === p);
            for (const f of on) { ctx.hit(f, earthDmg, f.x, f.y); ctx.float(f.x, f.y - 44, 'EARTHED', '#bff4ff'); }
            if (!on.length) ctx.float(p.x, p.y - 30, 'grounded', '#bff4ff');
            ctx.sfx('status-shock');
            p.earthFx = time;
            p.charge = 0; p.fullAt = -1;
          }
          continue;
        }
        // The arc tracks its target until it fires.
        const t = target(p);
        if (t) p.arcTo = { x: t.x, y: t.y };
        if (time >= p.arcAt) {
          if (t) {
            ctx.hit(t, arcDmg, t.x, t.y);
            ctx.stun(t, 320);
            ctx.sfx('thunder');
            ctx.flash(t.x, t.y, 0xbff4ff);
          } else ctx.sfx('zap');
          p.arcFx = time;
          p.charge = 0; p.fullAt = -1; p.arcAt = -1;
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const mineP = plateOf(npc);
      // Hop off a plate that's nearly full and has nowhere to send its arc.
      const choose = (avoid: Plate | null) => {
        let best: Plate | null = null, bs = Infinity;
        for (const p of plates) {
          if (p === avoid) continue;
          const s = dist(p.x, p.y, npc.x, npc.y) + p.charge * 4 + (plateOf(player) === p ? 600 : 0);
          if (s < bs) { bs = s; best = p; }
        }
        return best;
      };
      if (mineP && (mineP.charge > 78 || mineP.fullAt >= 0) && plateOf(player)) {
        const p = choose(mineP);
        return p ? { x: p.x, y: p.y } : null;
      }
      if (mineP) {
        // Pace about on it, which charges it faster.
        const t = ctx.scene.time.now / 600;
        return { x: mineP.x + Math.cos(t) * ON_R * 0.5, y: mineP.y + Math.sin(t) * ON_R * 0.25 };
      }
      const p = choose(null);
      return p ? { x: p.x, y: p.y } : null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const p of plates) {
        piezoPlate(g, p.x, p.y, PLATE_R, p.charge / 100, t);
        // A charge ring round the frame.
        g.lineStyle(3, 0xbff4ff, 0.75);
        g.beginPath(); g.arc(p.x, p.y + PLATE_R * 0.72, 12, -Math.PI / 2, -Math.PI / 2 + (p.charge / 100) * Math.PI * 2, false); g.strokePath();
        if (p.fullAt >= 0 && p.arcAt < 0) {
          // Holding: the ring swells as it nears earthing.
          const k = clamp((time - p.fullAt) / HOLD_MS, 0, 1);
          g.lineStyle(2, 0xffffff, 0.3 + k * 0.6); g.strokeEllipse(p.x, p.y, PLATE_R * 2.3 * (1 + k * 0.15), PLATE_R * 1.3 * (1 + k * 0.15));
        }
        if (time - p.earthFx < 500) {
          const k = (time - p.earthFx) / 500;
          g.fillStyle(0xbff4ff, 0.4 * (1 - k)); g.fillEllipse(p.x, p.y, PLATE_R * 2.4, PLATE_R * 1.5);
        }
      }
    },

    drawAir(g, time) {
      for (const p of plates) {
        const firing = time - p.arcFx < 220;
        if (p.arcAt < 0 && !firing) continue;
        const to = p.arcTo;
        if (!to) continue;
        const k = firing ? 1 : clamp(1 - (p.arcAt - time) / ARC_WARN, 0, 1);
        // A jagged arc from the plate to its target: a flicker while warning, a bolt when it fires.
        const pts: Pt[] = [{ x: p.x, y: p.y - 6 }];
        const n = 9;
        for (let i = 1; i < n; i++) {
          const f = i / n;
          const jit = (Math.sin(time / 23 + i * 3.7) + Math.sin(time / 41 + i)) * 12 * (firing ? 1.4 : 0.6);
          const dx = to.x - p.x, dy = to.y - 20 - p.y;
          const len = Math.hypot(dx, dy) || 1;
          pts.push({ x: p.x + dx * f + (-dy / len) * jit, y: p.y - 6 + dy * f + (dx / len) * jit });
        }
        pts.push({ x: to.x, y: to.y - 20 });
        if (firing) {
          g.lineStyle(7, 0x7fe0ff, 0.35); g.strokePoints(pts, false);
          g.lineStyle(3, 0xffffff, 1); g.strokePoints(pts, false);
        } else if (Math.sin(time / 30) > 0.2 - k) {
          g.lineStyle(1.5, 0xbff4ff, 0.3 + k * 0.6); g.strokePoints(pts, false);
          g.lineStyle(2, 0xffffff, k); g.strokeCircle(to.x, to.y - 20, 30 - k * 14);
        }
      }
      // Who is safe: a tiny spark at the feet of anyone on crystal.
      for (const f of [player, npc]) {
        if (!plateOf(f)) continue;
        g.fillStyle(0xe8fcff, 0.6 + Math.sin(time / 70) * 0.3); g.fillCircle(f.x - 10, f.y + 4, 1.6); g.fillCircle(f.x + 9, f.y + 3, 1.3);
      }
    },
  };
}

export const PIEZO: GimmickDef = {
  id: 'geode-piezo',
  rules: 'Standing on a tourmaline plate charges it. A full plate arcs to the nearest fighter not on crystal — and, with no one off, earths through whoever is on it.',
  make,
};
