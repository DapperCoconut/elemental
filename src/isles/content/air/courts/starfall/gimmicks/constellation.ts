import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { SF, alive, clamp, dist, inlayStar, makeClock, segDist, star } from '../palette';

/**
 * Constellation — Cartographer Ursa.
 *
 * A figure from Highspire's sky is laid into the floor as a handful of brass star-studs, each
 * numbered. Touch them in order and the line of the figure is drawn behind you, in your colour;
 * Ursa is drawing the same figure in hers, so the two of you race for each next star — whoever
 * touches it first takes it. When the last star is taken the figure is finished and belongs to
 * whoever took the most of it. It lifts off the floor and is stamped down round the *other*
 * fighter: its outline glows there for a moment, then every star and line of it bursts. The more
 * of it its owner drew, the harder it hits. Step out of a figure stamped round you.
 *
 * The exploit is the order: Ursa runs for the next star, so standing between her and it — or
 * on the one after — wins races; and a figure stamped round her can be held there by crowding
 * her toward its lines.
 */

/** Highspire's figures, as points in a unit box (-1..1) and the order they are drawn in. */
const FIGURES: { name: string; pts: Pt[] }[] = [
  { name: 'THE KITE', pts: [{ x: 0, y: -1 }, { x: 0.6, y: -0.1 }, { x: 0, y: 0.6 }, { x: -0.6, y: -0.1 }, { x: 0, y: -1 }, { x: 0.2, y: 1 }] },
  { name: 'THE WINDMILL', pts: [{ x: -0.9, y: -0.8 }, { x: 0, y: 0 }, { x: 0.9, y: -0.8 }, { x: 0.8, y: 0.85 }, { x: 0, y: 0 }, { x: -0.8, y: 0.85 }] },
  { name: 'THE BELLOWS', pts: [{ x: -1, y: 0 }, { x: -0.2, y: -0.8 }, { x: 0.6, y: -0.5 }, { x: 1, y: 0 }, { x: 0.6, y: 0.5 }, { x: -0.2, y: 0.8 }] },
  { name: 'THE LANTERN', pts: [{ x: 0, y: -1 }, { x: 0, y: -0.45 }, { x: -0.6, y: 0.1 }, { x: 0, y: 0.9 }, { x: 0.6, y: 0.1 }, { x: 0, y: -0.45 }] },
  { name: 'THE SLEEPER', pts: [{ x: -1, y: 0.4 }, { x: -0.45, y: 0 }, { x: 0.1, y: 0.15 }, { x: 0.55, y: -0.35 }, { x: 1, y: -0.1 }] },
  { name: 'THE CORK', pts: [{ x: -0.5, y: -0.9 }, { x: 0.5, y: -0.9 }, { x: 0.7, y: 0.8 }, { x: -0.7, y: 0.8 }, { x: -0.5, y: -0.9 }] },
];

type Side = 'player' | 'npc';
interface Stud { x: number; y: number; by: Side | null; at: number }
interface Stamp { pts: Pt[]; owner: Side; target: Side; claims: number; bornAt: number; fireAt: number; fired: boolean; name: string }

export const constellationGimmick: GimmickDef = {
  id: 'starfall-constellation',
  rules: 'Touch the floor-stars in order to draw the figure. Finished, it is stamped round the foe and bursts — harder for each star you drew.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const TOUCH_R = 32;
    const STAMP_WARN = hard ? 800 : 950;
    const LINE_HALF = 18;
    const STAR_BLAST = 34;
    const BASE_DMG = 6;
    const PER_CLAIM = hard ? 3.5 : 3;
    const GAP_MS = 1600;

    let studs: Stud[] = [];
    let figName = '';
    let figIdx = Math.floor(rng() * FIGURES.length);
    let nextIdx = 0;
    let layAt = -1;
    let stamps: Stamp[] = [];
    let now = 0;

    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const colourOf = (s: Side): number => (s === 'player' ? SF.comet : SF.starGold);

    /** Lay a new figure into the floor somewhere, scaled to fit, studs numbered in drawing order. */
    const lay = (): void => {
      figIdx = (figIdx + 1 + Math.floor(rng() * (FIGURES.length - 1))) % FIGURES.length;
      const f = FIGURES[figIdx];
      figName = f.name;
      const sx = 190 + rng() * 60, sy = 130 + rng() * 40;
      const cx = clamp(W / 2 + (rng() - 0.5) * 260, sx + 60, W - sx - 60);
      const cy = clamp((top + H) / 2 + (rng() - 0.5) * 120, top + sy + 50, H - sy - 50);
      // A closed figure repeats its first point: the repeat is a line, not a second stud.
      const seen: Pt[] = [];
      studs = [];
      for (const p of f.pts) {
        const x = cx + p.x * sx, y = cy + p.y * sy;
        if (seen.some((q) => Math.hypot(q.x - x, q.y - y) < 4)) continue;
        seen.push({ x, y });
        studs.push({ x, y, by: null, at: 0 });
      }
      nextIdx = 0;
      ctx.banner(figName, '#ffe08a');
      ctx.sfx('crystal-chime');
    };

    /** The figure's full line list (including closing repeats), in world space at its laid spot. */
    const figureLines = (): Pt[] => {
      const f = FIGURES[figIdx];
      const xs = studs.map((s) => s.x), ys = studs.map((s) => s.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const fxs = f.pts.map((p) => p.x), fys = f.pts.map((p) => p.y);
      const fminX = Math.min(...fxs), fmaxX = Math.max(...fxs), fminY = Math.min(...fys), fmaxY = Math.max(...fys);
      return f.pts.map((p) => ({
        x: minX + ((p.x - fminX) / (fmaxX - fminX || 1)) * (maxX - minX),
        y: minY + ((p.y - fminY) / (fmaxY - fminY || 1)) * (maxY - minY),
      }));
    };

    const finish = (): void => {
      const mine = studs.filter((s) => s.by === 'player').length;
      const hers = studs.filter((s) => s.by === 'npc').length;
      const owner: Side = mine > hers ? 'player' : hers > mine ? 'npc' : (studs[studs.length - 1].by ?? 'npc');
      const target: Side = owner === 'player' ? 'npc' : 'player';
      const tf = fighterOf(target);
      // Re-centre the whole figure (shrunk a little) on the target where they stand now.
      const lines = figureLines();
      const cx = lines.reduce((a, p) => a + p.x, 0) / lines.length, cy = lines.reduce((a, p) => a + p.y, 0) / lines.length;
      const k = 0.72;
      const pts = lines.map((p) => ({ x: tf.x + (p.x - cx) * k, y: tf.y + (p.y - cy) * k }));
      stamps.push({ pts, owner, target, claims: owner === 'player' ? mine : hers, bornAt: now, fireAt: now + STAMP_WARN, fired: false, name: figName });
      ctx.float(tf.x, tf.y - 60, `${figName} — ${owner === 'player' ? 'YOURS' : 'URSA\'S'}`, owner === 'player' ? '#8fe3ff' : '#ffe08a');
      ctx.sfx('prism');
      studs = [];
      layAt = now + GAP_MS;
    };

    const onFigure = (f: Fighter, pts: Pt[]): boolean => {
      for (let i = 0; i < pts.length - 1; i++) if (segDist(f.x, f.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < LINE_HALF + 8) return true;
      return pts.some((p) => dist(f.x, f.y, p.x, p.y) < STAR_BLAST);
    };

    return {
      update(time: number) {
        tick(time);
        now = time;
        if (layAt < 0) layAt = time + 900;
        if (studs.length === 0 && layAt > 0 && time >= layAt) { layAt = 0; lay(); }
        // Races for the next stud.
        if (studs.length > 0 && nextIdx < studs.length) {
          const s = studs[nextIdx];
          const dp = alive(ctx.player) ? dist(ctx.player.x, ctx.player.y, s.x, s.y) : Infinity;
          const dn = alive(ctx.npc) ? dist(ctx.npc.x, ctx.npc.y, s.x, s.y) : Infinity;
          if (Math.min(dp, dn) < TOUCH_R) {
            s.by = dp <= dn ? 'player' : 'npc';
            s.at = time;
            nextIdx++;
            ctx.sfx('crystal-chime');
            ctx.float(s.x, s.y - 30, `${nextIdx}`, s.by === 'player' ? '#8fe3ff' : '#ffe08a');
            if (nextIdx >= studs.length) finish();
          }
        }
        for (const st of stamps) {
          if (st.fired || time < st.fireAt) continue;
          st.fired = true;
          const f = fighterOf(st.target);
          ctx.sfx('light-beam');
          for (const p of st.pts) ctx.flash(p.x, p.y, colourOf(st.owner));
          if (alive(f) && onFigure(f, st.pts)) {
            const dmg = Math.round(BASE_DMG + PER_CLAIM * st.claims);
            ctx.hit(f, dmg, f.x, f.y);
            ctx.float(f.x, f.y - 46, `${st.name}!`, st.owner === 'player' ? '#8fe3ff' : '#ffe08a');
          }
        }
        stamps = stamps.filter((st) => time < st.fireAt + 600);
      },

      // Ursa races hardest of all in hard mode.
      npcSpeedMult: () => (hard && studs.length > 0 ? 1.1 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Out of a figure stamped round her: away from its centre, through the nearest gap.
        const mineIn = stamps.find((st) => !st.fired && st.target === 'npc');
        if (mineIn) {
          const cx = mineIn.pts.reduce((a, p) => a + p.x, 0) / mineIn.pts.length;
          const cy = mineIn.pts.reduce((a, p) => a + p.y, 0) / mineIn.pts.length;
          const a = Math.atan2(n.y - cy, n.x - cx) + 0.4;
          return { x: clamp(cx + Math.cos(a) * 220, 60, W - 60), y: clamp(cy + Math.sin(a) * 220, top + 50, H - 50) };
        }
        // Otherwise race for the next star.
        if (studs.length > 0 && nextIdx < studs.length) return { x: studs[nextIdx].x, y: studs[nextIdx].y };
        return null;
      },

      drawGround(g, time) {
        // The laid figure: ghost lines between unclaimed studs, coloured lines between claimed ones.
        if (studs.length > 0) {
          for (let i = 0; i < studs.length - 1; i++) {
            const a = studs[i], b = studs[i + 1];
            const drawn = b.by !== null;
            g.lineStyle(drawn ? 4 : 1.5, drawn ? colourOf(b.by as Side) : SF.silver, drawn ? 0.9 : 0.3);
            g.lineBetween(a.x, a.y, b.x, b.y);
          }
          studs.forEach((s, i) => {
            const next = i === nextIdx;
            g.fillStyle(0x000000, 0.35); g.fillEllipse(s.x, s.y + 4, 40, 18);
            g.fillStyle(SF.brassDark, 1); g.fillCircle(s.x, s.y, 15);
            g.fillStyle(s.by ? colourOf(s.by) : SF.brass, 1); g.fillCircle(s.x, s.y, 12);
            inlayStar(g, s.x, s.y, 9, s.by ? SF.starHot : SF.brassLit, 1);
            if (next) {
              const pulse = 0.5 + 0.5 * Math.sin(time / 110);
              g.lineStyle(2.5, SF.starHot, 0.5 + 0.5 * pulse); g.strokeCircle(s.x, s.y, TOUCH_R + pulse * 6);
              g.lineStyle(1.5, SF.starHot, 0.25); g.strokeCircle(s.x, s.y, TOUCH_R + 14 + pulse * 6);
            }
          });
        }
        // Stamped figures: the outline glowing round its target, then bursting.
        for (const st of stamps) {
          const c = colourOf(st.owner);
          if (!st.fired) {
            const k = clamp((time - st.bornAt) / (st.fireAt - st.bornAt), 0, 1);
            g.lineStyle(LINE_HALF * 2, c, 0.06 + k * 0.14);
            for (let i = 0; i < st.pts.length - 1; i++) g.lineBetween(st.pts[i].x, st.pts[i].y, st.pts[i + 1].x, st.pts[i + 1].y);
            g.lineStyle(2, c, 0.5 + k * 0.5);
            for (let i = 0; i < st.pts.length - 1; i++) g.lineBetween(st.pts[i].x, st.pts[i].y, st.pts[i + 1].x, st.pts[i + 1].y);
            for (const p of st.pts) { g.fillStyle(c, 0.12 + k * 0.2); g.fillCircle(p.x, p.y, STAR_BLAST); }
          }
        }
      },

      drawAir(g, time) {
        for (const st of stamps) {
          const c = colourOf(st.owner);
          if (!st.fired) {
            const k = clamp((time - st.bornAt) / (st.fireAt - st.bornAt), 0, 1);
            for (const p of st.pts) star(g, p.x, p.y, 6 + k * 10, c, 0.6 + k * 0.4);
          } else {
            const k = clamp((time - st.fireAt) / 600, 0, 1);
            g.lineStyle(10 * (1 - k), SF.starHot, 1 - k);
            for (let i = 0; i < st.pts.length - 1; i++) g.lineBetween(st.pts[i].x, st.pts[i].y, st.pts[i + 1].x, st.pts[i + 1].y);
            for (const p of st.pts) { g.lineStyle(3 * (1 - k), c, 1 - k); g.strokeCircle(p.x, p.y, STAR_BLAST * (0.5 + k)); }
          }
        }
        // Claimed studs throw up a little star for a moment.
        for (const s of studs) {
          if (!s.by) continue;
          const k = (time - s.at) / 500;
          if (k >= 0 && k < 1) star(g, s.x, s.y - k * 30, 10 * (1 - k) + 2, colourOf(s.by), 1 - k);
        }
      },

      drawHud(g) {
        // The figure's name and a pip per star, coloured by who took it.
        if (studs.length === 0) return;
        const y = top + 14;
        const x0 = W / 2 - (studs.length - 1) * 11;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 16, y - 10, (studs.length - 1) * 22 + 32, 20, 8);
        studs.forEach((s, i) => {
          g.fillStyle(s.by ? colourOf(s.by) : i === nextIdx ? SF.starHot : SF.stoneMid, 1);
          g.fillCircle(x0 + i * 22, y, i === nextIdx ? 6 : 5);
        });
      },

      destroy() { studs = []; stamps = []; },
    };
  },
};
