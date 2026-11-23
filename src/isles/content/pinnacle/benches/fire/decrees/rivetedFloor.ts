import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { EMB, heatColor } from '../art';
import { WHO, type Who, alive, clamp, dist, other, side, stepDt } from './util';

/**
 * Decree of the Riveted Floor — Councilor Barrow Gaskett, Seat of the Gauge.
 *
 * Gaskett wrote section four ("the tithe-fire shall be metered, and the meter shall be believed")
 * and appointed Prince Gauge. His floor is twelve riveted plates of black glass over a boiler, each
 * with its own gauge:
 *
 *  - A plate fills while anyone stands on it (twice as fast with both on it), and slowly bleeds
 *    off when empty. Every landing slam presses the plate it lands on too.
 *  - Full, it HISSES (rivets popping, steam at the seams) — then blows: whoever is still on it is
 *    thrown up on the steam and comes down on the OTHER fighter, wherever they are. The landing
 *    spot is marked, follows its mark until the last moment, then locks: step out of the ring.
 *  - Coming down is a slam (damage + a short real stun) on whoever is inside the ring; in the air
 *    nothing can touch the flyer. Step off during the hiss and the plate only vents.
 *
 * A perfected Pressure bot holds its keys to charge and walks slowly while it does — it fills
 * plates by being itself, and it knows to stay on its plate when it is nearly full. A clever
 * player rides a full plate onto him, and is never standing still when his plate blows.
 */

const COLS = 4;
const ROWS = 3;
const FLIGHT_MS = 1150;
const LOCK_BEFORE = 420;
const SLAM_R = 96;
const COOL_MS = 2600;
const DRAIN_PER_S = 7;

interface Plate { x: number; y: number; w: number; h: number; p: number; state: 'fill' | 'hiss' | 'cool'; at: number; seed: number }
interface Flight { from: Pt; to: Pt; start: number; end: number; locked: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const FILL = ctx.hard ? 19 : 16;
  const SLAM = ctx.hard ? 28 : 24;
  const HISS = ctx.hard ? 800 : 950;
  const pw = W / COLS, ph = (H - top) / ROWS;
  const plates: Plate[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) plates.push({ x: c * pw, y: top + r * ph, w: pw, h: ph, p: 0, state: 'fill', at: 0, seed: r * 7 + c * 3 });
  const flights: Record<Who, Flight | null> = { player: null, npc: null };
  let rings: { x: number; y: number; at: number }[] = [];

  const plateAt = (x: number, y: number): Plate | null => {
    const c = Math.floor(x / pw), r = Math.floor((y - top) / ph);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return plates[r * COLS + c];
  };
  const onGround = (w: Who): boolean => { const f = side(ctx, w); return alive(f) && !flights[w] && !ctx.isAirborne(f); };

  function launch(w: Who, time: number): void {
    const f = side(ctx, w), o = side(ctx, other(w));
    flights[w] = { from: { x: f.x, y: f.y }, to: { x: o.x, y: o.y }, start: time, end: time + FLIGHT_MS, locked: false };
    ctx.airborne(f, FLIGHT_MS);
    ctx.root(f, FLIGHT_MS);
    ctx.float(f.x, f.y - 50, 'BLOWN!', '#ffe8b8');
  }

  function blow(pl: Plate, time: number): void {
    pl.state = 'cool';
    pl.at = time + COOL_MS;
    pl.p = 0;
    ctx.sfx('explosion-medium');
    ctx.tk.boom(pl.x + pl.w / 2, pl.y + pl.h / 2, 70, 0xf0f0f0);
    let any = false;
    for (const w of WHO) if (onGround(w) && plateAt(side(ctx, w).x, side(ctx, w).y) === pl) { launch(w, time); any = true; }
    if (!any) ctx.float(pl.x + pl.w / 2, pl.y + pl.h / 2, 'VENTED', '#e0e0e0');
  }

  function land(w: Who, fl: Flight, time: number): void {
    const o = side(ctx, other(w));
    flights[w] = null;
    ctx.sfx('gravity-slam');
    ctx.tk.boom(fl.to.x, fl.to.y, SLAM_R, EMB.hot);
    rings.push({ x: fl.to.x, y: fl.to.y, at: time });
    if (alive(o) && !ctx.isAirborne(o) && dist(o.x, o.y, fl.to.x, fl.to.y) <= SLAM_R) {
      ctx.hit(o, SLAM, o.x, o.y);
      ctx.stun(o, 450);
      ctx.float(o.x, o.y - 50, 'SLAMMED', '#ffb35a');
    }
    const pl = plateAt(fl.to.x, fl.to.y);
    if (pl && pl.state === 'fill') pl.p = Math.min(99, pl.p + 30);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // Who stands where.
      const count = new Map<Plate, number>();
      for (const w of WHO) {
        if (!onGround(w)) continue;
        const pl = plateAt(side(ctx, w).x, side(ctx, w).y);
        if (pl) count.set(pl, (count.get(pl) ?? 0) + 1);
      }
      for (const pl of plates) {
        if (pl.state === 'cool') { if (time >= pl.at) pl.state = 'fill'; continue; }
        if (pl.state === 'hiss') { if (time >= pl.at) blow(pl, time); continue; }
        const n = count.get(pl) ?? 0;
        pl.p = n > 0 ? Math.min(100, pl.p + FILL * n * dt) : Math.max(0, pl.p - DRAIN_PER_S * dt);
        if (pl.p >= 100) {
          pl.state = 'hiss';
          pl.at = time + ctx.tk.warn(HISS);
          ctx.sfx('gear-turn');
          ctx.float(pl.x + pl.w / 2, pl.y + 24, 'RIVETS GOING', '#ffe8b8');
        }
      }
      // Flights: an arc up the screen and down on the mark, steered by nudges.
      for (const w of WHO) {
        const fl = flights[w];
        if (!fl) continue;
        const f = side(ctx, w), o = side(ctx, other(w));
        if (!alive(f)) { flights[w] = null; continue; }
        if (!fl.locked) {
          if (alive(o)) { fl.to.x = o.x; fl.to.y = o.y; }
          if (time >= fl.end - LOCK_BEFORE) { fl.locked = true; ctx.sfx('countdown-tick'); }
        }
        const k = clamp((time - fl.start) / FLIGHT_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        const gx = fl.from.x + (fl.to.x - fl.from.x) * e;
        const gy = fl.from.y + (fl.to.y - fl.from.y) * e;
        const lift = Math.sin(k * Math.PI) * 110;
        ctx.nudge(f, gx - f.x, gy - lift - f.y);
        if (time >= fl.end) { ctx.nudge(f, fl.to.x - f.x, fl.to.y - f.y); land(w, fl, time); }
      }
      rings = rings.filter((r) => time - r.at < 700);
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (!alive(n) || !alive(p)) return null;
      const away = (from: Pt, r: number): Pt => {
        const a = Math.atan2(n.y - from.y, n.x - from.x);
        return { x: clamp(from.x + Math.cos(a) * r, 60, W - 60), y: clamp(from.y + Math.sin(a) * r, top + 60, H - 50) };
      };
      // The challenger is coming down: get out of the ring.
      const fp = flights.player;
      if (fp) return away(fp.to, SLAM_R + 90);
      // The challenger's plate is about to blow: be far away so the drop has a long way to come.
      const pp = plateAt(p.x, p.y);
      if (pp && (pp.state === 'hiss' || pp.p > 78)) return away(p, 320);
      // Its own plate is filling well and the challenger is elsewhere: stay on it, at its near edge.
      const np = plateAt(n.x, n.y);
      if (np && np !== pp && np.state !== 'cool' && np.p > 30) {
        return { x: clamp(p.x, np.x + 30, np.x + np.w - 30), y: clamp(p.y, np.y + 30, np.y + np.h - 30) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const pl of plates) drawPlate(g, pl, time);
      // Landing marks.
      for (const w of WHO) {
        const fl = flights[w];
        if (!fl) continue;
        const k = clamp((time - fl.start) / FLIGHT_MS, 0, 1);
        const c = fl.locked ? 0xff5a3a : EMB.hot;
        g.fillStyle(0x000000, 0.2 + k * 0.25); g.fillEllipse(fl.to.x, fl.to.y + 6, SLAM_R * 2 * (0.5 + k * 0.5), SLAM_R * 0.7 * (0.5 + k * 0.5));
        g.lineStyle(fl.locked ? 3 : 2, c, 0.6 + 0.3 * Math.sin(time / 60)); g.strokeCircle(fl.to.x, fl.to.y, SLAM_R);
        g.lineStyle(2, c, 0.8); g.strokeCircle(fl.to.x, fl.to.y, SLAM_R * (1 - k));
        // The flyer's own shadow on the floor under its arc.
        const e = k * k * (3 - 2 * k);
        g.fillStyle(0x000000, 0.35); g.fillEllipse(fl.from.x + (fl.to.x - fl.from.x) * e, fl.from.y + (fl.to.y - fl.from.y) * e + 14, 40, 12);
      }
      for (const r of rings) {
        const k = (time - r.at) / 700;
        g.lineStyle(4 * (1 - k), EMB.core, 1 - k); g.strokeCircle(r.x, r.y, SLAM_R * (0.6 + k * 0.7));
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + r.x;
          g.lineStyle(1.5, EMB.ember, 0.8 * (1 - k));
          g.lineBetween(r.x + Math.cos(a) * 20, r.y + Math.sin(a) * 12, r.x + Math.cos(a) * (40 + k * 60), r.y + Math.sin(a) * (24 + k * 30));
        }
      }
    },

    drawAir(g, time) {
      // Steam: at the seams of a hissing plate, and the column a blown plate throws.
      for (const pl of plates) {
        if (pl.state === 'hiss') {
          for (let i = 0; i < 10; i++) {
            const ph = ((time / 500) + i * 0.1) % 1;
            const along = (i * 0.17 + pl.seed * 0.1) % 1;
            const edge = i % 4;
            const sx = edge < 2 ? pl.x + along * pl.w : pl.x + (edge === 2 ? 4 : pl.w - 4);
            const sy = edge < 2 ? pl.y + (edge === 0 ? 4 : pl.h - 4) : pl.y + along * pl.h;
            g.fillStyle(0xf4f0ec, 0.35 * (1 - ph)); g.fillCircle(sx, sy - ph * 40, 6 + ph * 14);
          }
        } else if (pl.state === 'cool' && pl.at - time > COOL_MS - 900) {
          const k = 1 - (pl.at - time - (COOL_MS - 900)) / 900;
          const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
          for (let i = 0; i < 9; i++) {
            g.fillStyle(0xf4f0ec, 0.4 * (1 - k)); g.fillCircle(cx + Math.sin(i * 2.3) * 30 * (1 + k), cy - k * 160 - i * 14, 18 + i * 3 + k * 20);
          }
        }
      }
      // Steam trailing a flyer.
      for (const w of WHO) {
        const fl = flights[w];
        if (!fl) continue;
        const f = side(ctx, w);
        for (let i = 0; i < 5; i++) { g.fillStyle(0xf4f0ec, 0.25 - i * 0.04); g.fillCircle(f.x - (fl.to.x - fl.from.x) * 0.02 * i, f.y + 18 + i * 9, 10 + i * 3); }
      }
    },
  };

  /** One plate: black glass with an inset bevel, rivets that heat, ember seams, and its gauge. */
  function drawPlate(g: Phaser.GameObjects.Graphics, pl: Plate, time: number): void {
    const k = pl.state === 'hiss' ? 1 : pl.state === 'cool' ? 0 : pl.p / 100;
    const hissing = pl.state === 'hiss';
    const jump = hissing ? Math.abs(Math.sin(time / 45 + pl.seed)) * 3 : 0;
    g.fillStyle(mixC(OBS.glass, OBS.facet, 0.25 + ((pl.seed % 3) * 0.1)), 0.55); g.fillRect(pl.x + 4, pl.y + 4, pl.w - 8, pl.h - 8);
    g.lineStyle(1, OBS.edge, 0.25); g.strokeRect(pl.x + 10, pl.y + 10, pl.w - 20, pl.h - 20);
    // The seams between plates: ember from below, brighter the fuller the plate.
    g.lineStyle(3, heatColor(0.3 + k * 0.7), 0.15 + k * 0.5); g.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);
    if (hissing) { g.lineStyle(2, EMB.core, 0.5 + 0.4 * Math.sin(time / 50)); g.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4); }
    // Rivets: along every edge; they heat with the plate and jump when it hisses.
    const rv = (rx: number, ry: number, i: number) => {
      const up = hissing ? jump * ((i % 3) + 1) * 0.6 : 0;
      g.fillStyle(0x000000, 0.4); g.fillCircle(rx + 1, ry + 1.5, 3.4);
      g.fillStyle(mixC(OBS.facet, heatColor(0.4 + k * 0.6), k), 1); g.fillCircle(rx, ry - up, 3.2);
      g.fillStyle(lit(OBS.edge, 0.3), 0.7); g.fillCircle(rx - 1, ry - 1 - up, 1);
    };
    let i = 0;
    for (let x = pl.x + 16; x < pl.x + pl.w - 10; x += 28) { rv(x, pl.y + 10, i++); rv(x, pl.y + pl.h - 10, i++); }
    for (let y = pl.y + 38; y < pl.y + pl.h - 30; y += 28) { rv(pl.x + 10, y, i++); rv(pl.x + pl.w - 10, y, i++); }
    // The gauge, in the plate's upper corner.
    const gx = pl.x + pl.w - 34, gy = pl.y + 34;
    g.fillStyle(OBS.glass, 1); g.fillCircle(gx, gy, 17);
    g.lineStyle(1.5, OBS.edge, 0.8); g.strokeCircle(gx, gy, 17);
    g.lineStyle(3, dim(EMB.ember, 0.2), 1); g.beginPath(); g.arc(gx, gy, 12, Math.PI * 0.75, Math.PI * 2.25, false); g.strokePath();
    g.lineStyle(3, 0xff4a2a, 1); g.beginPath(); g.arc(gx, gy, 12, Math.PI * 1.95, Math.PI * 2.25, false); g.strokePath();
    const shake = hissing ? Math.sin(time / 30) * 0.08 : 0;
    const na = Math.PI * 0.75 + k * Math.PI * 1.5 + shake;
    g.lineStyle(2, EMB.core, 1); g.lineBetween(gx, gy, gx + Math.cos(na) * 13, gy + Math.sin(na) * 13);
    g.fillStyle(OBS.edge, 1); g.fillCircle(gx, gy, 2.5);
    // A cooled plate shows its blown rivet-holes.
    if (pl.state === 'cool') {
      g.fillStyle(0x000000, 0.5);
      for (let j = 0; j < 6; j++) g.fillCircle(pl.x + 16 + ((j * 53 + pl.seed * 11) % (pl.w - 32)), pl.y + (j % 2 ? 10 : pl.h - 10), 3);
    }
  }
}

export const RIVETED_FLOOR: GimmickDef = {
  id: 'bench-fire-riveted-floor',
  rules: 'Each plate shall hold what stands on it: filled, it blows its rivets and throws its occupant down upon the other.',
  make,
};
