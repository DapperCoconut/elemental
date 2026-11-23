import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { CLOUD, CLOUD_LIT, CLOUD_SHADE, GALE, GALE_CSS, GALE_LIT, OBS } from '../art';
import { type Who, WHO, alive, clampN, fighterOf, inArena, stepOf } from './util';

/**
 * SEAT OF SQUALLS — Councilor Corvin Shear (tempest). *Decree of the Open Rail.*
 *
 * The fight is on a span between two shards, open to the cloud on both long sides. Along the north
 * and south edges runs a rail of glass balusters in eight sections. A fighter who is THROWN into an
 * intact section — dashing, launched, knocked back, or carried by the gust — shatters it (8, and
 * bounced back). A broken section stays open for nine seconds, a cloud-gap with violet edges; any
 * fighter who comes to the edge there goes OVER THE RAIL: 22 damage, a long fall through the cloud
 * (aloft, untouchable, unable to steer), and the updraft sets them back on the span.
 *
 * Every few seconds a sheer gust is called down a marked column of the span, north or south, and
 * carries everyone in it toward that edge. A perfected tempest is a knockback brawler: it walks
 * round you to put you between itself and the nearest gap. The turn: so is the gust, and the rail
 * does not care whose body it was.
 */
const openRail = (ctx: GimmickCtx): EncounterGimmick => {
  const SEGS = 8;
  const SEG_W = ctx.W / SEGS;
  const BAND = 64;
  const REGROW = ctx.hard ? 10000 : 9000;
  const FALL = ctx.hard ? 26 : 22;
  const FALL_MS = 1200;
  const WARN = ctx.hard ? 1200 : 1500;
  const BLOW = 600;
  const GAP = ctx.hard ? 4800 : 6000;
  const COL_W = ctx.hard ? 230 : 200;
  const PUSH = 620;

  /** rail[0] = north, rail[1] = south; each section's broken-until clock and when it broke. */
  const rail = [0, 1].map(() => Array.from({ length: SEGS }, () => ({ brokenUntil: 0, brokeAt: -9999 })));
  const grace: Record<Who, number> = { player: 0, npc: 0 };
  const carried: Record<Who, number> = { player: 0, npc: 0 };
  const fall: Record<Who, { side: number; x: number; at: number } | null> = { player: null, npc: null };
  let gust: { state: 'rest' | 'warn' | 'blow'; at: number; x0: number; dir: number } = { state: 'rest', at: 0, x0: 0, dir: 1 };
  let announced = false;

  const top = ctx.top;
  const sideOf = (y: number): number => (y < top + BAND ? 0 : y > ctx.H - BAND ? 1 : -1);
  const segOf = (x: number): number => clampN(Math.floor(x / SEG_W), 0, SEGS - 1);
  const broken = (side: number, i: number, time: number): boolean => time < rail[side][i].brokenUntil;
  const inColumn = (x: number): boolean => x >= gust.x0 && x <= gust.x0 + COL_W;

  const callGust = (time: number): void => {
    // The wind is cruel: it prefers a column that carries toward an open gap.
    const open: { side: number; i: number }[] = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i < SEGS; i++) if (broken(s, i, time + WARN + BLOW)) open.push({ side: s, i });
    if (open.length && ctx.rng() < 0.7) {
      const o = open[Math.floor(ctx.rng() * open.length)];
      gust.x0 = clampN(o.i * SEG_W + SEG_W / 2 - COL_W / 2 + (ctx.rng() - 0.5) * 60, 40, ctx.W - 40 - COL_W);
      gust.dir = o.side === 0 ? -1 : 1;
    } else {
      gust.x0 = 40 + ctx.rng() * (ctx.W - 80 - COL_W);
      gust.dir = ctx.rng() < 0.5 ? -1 : 1;
    }
    gust.state = 'warn';
    gust.at = time + ctx.tk.warn(WARN);
    ctx.sfx('gust');
  };

  const shatter = (w: Who, side: number, i: number, time: number): void => {
    const f = fighterOf(ctx, w);
    rail[side][i].brokenUntil = time + REGROW;
    rail[side][i].brokeAt = time;
    grace[w] = time + 700;
    ctx.hit(f, 8, f.x, f.y);
    ctx.nudge(f, 0, side === 0 ? 46 : -46);
    ctx.float(f.x, f.y - 50, 'THE RAIL BREAKS', '#c9b0ff');
    ctx.sfx('crystal-shatter');
    ctx.flash(f.x, side === 0 ? top + 8 : ctx.H - 8, OBS.seamLit);
  };

  const goOver = (w: Who, side: number, time: number): void => {
    const f = fighterOf(ctx, w);
    fall[w] = { side, x: f.x, at: time };
    ctx.hit(f, FALL, f.x, f.y);
    ctx.airborne(f, FALL_MS);
    ctx.root(f, FALL_MS);
    ctx.float(f.x, f.y - 56, 'OVER THE RAIL', w === 'player' ? '#ff9a8a' : GALE_CSS);
    ctx.sfx('whoosh');
  };

  return {
    update(time, dt) {
      const d = stepOf(dt);
      if (!announced && time > 0) { announced = true; gust.at = time + 3000; ctx.banner('MIND THE RAIL', GALE_CSS); }
      // The sheer gust.
      if (gust.state === 'rest' && time >= gust.at) callGust(time);
      else if (gust.state === 'warn' && time >= gust.at) { gust.state = 'blow'; gust.at = time + BLOW; ctx.sfx('tornado'); }
      else if (gust.state === 'blow') {
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f) || fall[w] || ctx.isAirborne(f) || !inColumn(f.x)) continue;
          ctx.nudge(f, 0, gust.dir * PUSH * d);
          carried[w] = time + 160;
        }
        if (time >= gust.at) { gust.state = 'rest'; gust.at = time + GAP; }
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        const fl = fall[w];
        if (fl) {
          // The updraft sets them back on the span, well in from the edge they went over.
          if (time - fl.at >= FALL_MS) {
            fall[w] = null;
            grace[w] = time + 2200;
            if (alive(f)) {
              const ty = fl.side === 0 ? top + 170 : ctx.H - 170;
              ctx.nudge(f, 0, ty - f.y);
              ctx.sfx('wings');
              ctx.flash(f.x, f.y, GALE_LIT);
            }
          }
          continue;
        }
        if (!alive(f) || time < grace[w] || ctx.isAirborne(f)) continue;
        const side = sideOf(f.y);
        if (side < 0) continue;
        const i = segOf(f.x);
        if (broken(side, i, time)) goOver(w, side, time);
        else if (ctx.dashing(f) || time < carried[w]) shatter(w, side, i, time);
      }
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (fall.npc) return null;
      // Out of a called column first.
      if (gust.state !== 'rest' && inColumn(n.x)) {
        const left = gust.x0 - 60, right = gust.x0 + COL_W + 60;
        return inArena(ctx, Math.abs(n.x - left) < Math.abs(n.x - right) ? left : right, n.y);
      }
      // Then: stand where a blow drives the player toward the nearest open gap (or the nearest edge).
      const now = ctx.scene.time.now;
      let gap: Pt | null = null, gd = Infinity;
      for (let s = 0; s < 2; s++) for (let i = 0; i < SEGS; i++) {
        if (!broken(s, i, now)) continue;
        const gx = i * SEG_W + SEG_W / 2, gy = s === 0 ? top : ctx.H;
        const dd = Math.hypot(gx - p.x, gy - p.y);
        if (dd < gd) { gd = dd; gap = { x: gx, y: gy }; }
      }
      const tgt = gap ?? { x: p.x, y: p.y < (top + ctx.H) / 2 ? top : ctx.H };
      const dx = p.x - tgt.x, dy = p.y - tgt.y;
      const L = Math.hypot(dx, dy) || 1;
      return inArena(ctx, p.x + (dx / L) * 110, p.y + (dy / L) * 110);
    },
    drawGround(g, time) {
      // The rail, both edges: glass balusters in eight sections, or an open gap of cloud.
      for (let s = 0; s < 2; s++) {
        const ey = s === 0 ? top + 4 : ctx.H - 4;
        const inward = s === 0 ? 1 : -1;
        for (let i = 0; i < SEGS; i++) {
          const x0 = i * SEG_W, seg = rail[s][i];
          const isBroken = time < seg.brokenUntil;
          if (isBroken) {
            // The gap: cloud seen straight down past the deck's edge, billowing.
            g.fillStyle(CLOUD_SHADE, 0.85); g.fillRect(x0 + 2, s === 0 ? top - 6 : ctx.H - BAND + 10, SEG_W - 4, BAND - 4);
            for (let k = 0; k < 5; k++) {
              const cx = x0 + 14 + k * (SEG_W - 28) / 4 + Math.sin(time / 700 + k) * 5;
              const cy = ey + inward * (12 + Math.sin(time / 500 + k * 2) * 4);
              g.fillStyle(CLOUD, 0.8); g.fillCircle(cx, cy, 13);
              g.fillStyle(CLOUD_LIT, 0.5); g.fillCircle(cx - 4, cy - 4, 6);
            }
            // The danger lip: violet, flickering faster as it is about to regrow.
            const left = seg.brokenUntil - time;
            const flick = left < 1500 ? (Math.floor(time / 120) % 2 ? 0.9 : 0.4) : 0.7;
            g.lineStyle(3, OBS.seam, flick);
            g.lineBetween(x0, ey + inward * (BAND - 6), x0 + SEG_W, ey + inward * (BAND - 6));
            g.fillStyle(OBS.seam, 0.08); g.fillRect(x0, s === 0 ? top : ctx.H - BAND, SEG_W, BAND);
            // Regrowing: balusters rising out of the edge in the last second and a half.
            if (left < 1500) {
              const k = 1 - left / 1500;
              for (let b = 0; b < 6; b++) {
                const bx = x0 + 10 + b * (SEG_W - 20) / 5;
                g.lineStyle(4, OBS.sheen, 0.6 * k); g.lineBetween(bx, ey, bx, ey + inward * 16 * k);
              }
            }
            continue;
          }
          // Intact: a lip, a top rail and six balusters, a shimmer of air-light along the glass.
          g.fillStyle(OBS.glass, 1); g.fillRect(x0, s === 0 ? top - 2 : ctx.H - 12, SEG_W, 14);
          g.lineStyle(2, OBS.edge, 0.85); g.lineBetween(x0 + 2, ey + inward * 8, x0 + SEG_W - 2, ey + inward * 8);
          for (let b = 0; b < 6; b++) {
            const bx = x0 + 10 + b * (SEG_W - 20) / 5;
            g.fillStyle(OBS.sheen, 1); g.fillRect(bx - 2.5, Math.min(ey, ey + inward * 16), 5, 16);
            g.fillStyle(OBS.edge, 0.7); g.fillRect(bx - 2.5, Math.min(ey, ey + inward * 16), 1.5, 16);
          }
          const sh = ((time / 1800) + i * 0.13) % 1;
          g.fillStyle(GALE, 0.35); g.fillRect(x0 + sh * SEG_W, ey + inward * 7 - 1, 10, 2);
          g.lineStyle(1, OBS.seam, 0.5); g.lineBetween(x0, ey, x0, ey + inward * 16);
          // A fresh break's shards, still skittering across the deck.
          const since = time - seg.brokeAt;
          if (since >= 0 && since < 900) {
            const k = since / 900;
            for (let q = 0; q < 8; q++) {
              const qx = x0 + 10 + q * 13 + Math.sin(q * 3) * 30 * k, qy = ey + inward * (8 + k * 60 * (0.4 + (q % 3) * 0.3));
              g.fillStyle(OBS.edge, 1 - k); g.fillTriangle(qx, qy, qx + 5, qy + 2, qx + 1, qy + 6);
            }
          }
        }
      }
      // The called column: a lane of chevrons pointing at the edge it will carry you to.
      if (gust.state !== 'rest') {
        const warn = gust.state === 'warn';
        const k = warn ? clampN(1 - (gust.at - time) / ctx.tk.warn(WARN), 0, 1) : 1;
        g.fillStyle(GALE, warn ? 0.05 + k * 0.08 : 0.16);
        g.fillRect(gust.x0, top, COL_W, ctx.H - top);
        g.lineStyle(2, GALE, warn ? 0.3 + k * 0.4 : 0.8);
        g.lineBetween(gust.x0, top, gust.x0, ctx.H); g.lineBetween(gust.x0 + COL_W, top, gust.x0 + COL_W, ctx.H);
        const flow = (time / (warn ? 900 : 200)) % 1;
        for (let r = 0; r < 7; r++) {
          const cy = top + ((r + flow * gust.dir + 7) % 7) * ((ctx.H - top) / 7) + 30;
          const cx = gust.x0 + COL_W / 2;
          g.lineStyle(4, GALE_LIT, (warn ? 0.25 + k * 0.4 : 0.8));
          g.lineBetween(cx - 34, cy - gust.dir * 14, cx, cy + gust.dir * 6);
          g.lineBetween(cx + 34, cy - gust.dir * 14, cx, cy + gust.dir * 6);
        }
      }
    },
    drawAir(g, time) {
      // Fighters going over: a body tumbling down into the cloud, then flung back up on the updraft.
      for (const w of WHO) {
        const fl = fall[w];
        if (!fl) continue;
        const k = (time - fl.at) / FALL_MS;
        const edgeY = fl.side === 0 ? top : ctx.H;
        const out = fl.side === 0 ? -1 : 1;
        for (let i = 0; i < 6; i++) {
          const ph = (k * 2 + i / 6) % 1;
          g.fillStyle(CLOUD_LIT, 0.4 * (1 - ph));
          g.fillCircle(fl.x + Math.sin(i * 2 + k * 6) * 30, edgeY + out * (ph * 30) - out * 10, 10 + ph * 18);
        }
        g.lineStyle(2, GALE_LIT, 0.7 * (1 - k));
        g.strokeCircle(fl.x, edgeY - out * 10, 20 + k * 40);
      }
      // In the column while it blows: streaks of wind torn along it.
      if (gust.state === 'blow') {
        for (let i = 0; i < 14; i++) {
          const ph = ((time / 240) + i / 14) % 1;
          const x = gust.x0 + 12 + ((i * 53) % (COL_W - 24));
          const y = gust.dir > 0 ? top + ph * (ctx.H - top) : ctx.H - ph * (ctx.H - top);
          g.lineStyle(2, GALE_LIT, 0.7 * Math.sin(ph * Math.PI));
          g.lineBetween(x, y, x, y - gust.dir * 40);
        }
      }
    },
  };
};

export const OPEN_RAIL: GimmickDef = {
  id: 'bench-air-open-rail',
  rules: 'Whoever is thrown against the rail breaks it; whoever comes to a broken rail goes over it. Sheer gusts carry to the edge.',
  make: openRail,
};
