import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { EMB } from '../art';
import { WHO, type Who, alive, clamp, dist, other, side, stepDt } from './util';

/**
 * Decree of Confinement — Councilor Celestine Arc, Seat of the Corona.
 *
 * Arc wrote the lamp ordinance (no light on the plateau but the lamp the crown lit) and appointed
 * Prince Flux, who tried to become the lamp. Her floor is a confinement ring: a band of ember-
 * white plasma racing clockwise round the room between ten black-glass coils.
 *
 *  - Inside the band you are CARRIED with the flow, your cooldowns run 1.8× and you CHARGE.
 *    Out of it, charge bleeds away. Charge is damage: up to +35% on everything you land.
 *  - A full charge ARCS: a bolt jumps to the other fighter if they are within reach, and the
 *    charge drops back. Ride the ring and you are a gun.
 *  - On a clock the coils PINCH: they clamp violet, the band narrows (watch it), then everything
 *    inside discharges — a heavy hit, a shove out of the band and half the charge gone.
 *
 * A perfected Plasma bot fills a room with things that hurt both sides anyway; here it rides the
 * ring to charge and jumps out on the pinch. A clever player rides it the other way round the
 * room from him, arcs him from across the core, and is out of the band a beat before he is.
 */

const BAND = 40;
const CARRY = 150;
const CHARGE_IN = 34;
const CHARGE_OUT = 14;
const BOOST = 0.35;
const ARC_REACH = 340;
const COILS = 10;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const R = Math.min(200, (H - top) / 2 - BAND - 28);
  const PINCH_EVERY = ctx.hard ? 7600 : 9500;
  const PINCH_WARN = 1600;
  const PINCH_DMG = ctx.hard ? 24 : 20;
  const ARC_DMG = ctx.hard ? 16 : 14;
  const charge: Record<Who, number> = { player: 0, npc: 0 };
  let nextPinch = 0;
  let warnAt = -1;
  let pinchFx = -9999;
  let started = false;
  let flow = 0;
  let arcs: { a: Pt; b: Pt; at: number; seed: number }[] = [];

  const radial = (x: number, y: number) => dist(x, y, cx, cy);
  const inBand = (w: Who): boolean => { const f = side(ctx, w); return alive(f) && !ctx.isAirborne(f) && Math.abs(radial(f.x, f.y) - R) < BAND; };
  const takenFrom = (w: Who) => 1 + BOOST * (charge[w] / 100);

  function pinch(time: number): void {
    pinchFx = time;
    ctx.sfx('thunder');
    for (const w of WHO) {
      if (!inBand(w)) continue;
      const f = side(ctx, w);
      ctx.hit(f, PINCH_DMG, f.x, f.y);
      const d = radial(f.x, f.y) || 1;
      const out = d >= R ? 1 : -1;
      ctx.nudge(f, ((f.x - cx) / d) * 96 * out, ((f.y - cy) / d) * 96 * out);
      charge[w] *= 0.5;
      ctx.float(f.x, f.y - 50, 'DISCHARGED', '#fff2d8');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPinch = time + PINCH_EVERY; }
      flow += dt;
      if (warnAt < 0 && time >= nextPinch - ctx.tk.warn(PINCH_WARN)) {
        warnAt = time;
        ctx.banner('THE COILS PINCH', '#c9b0ff');
        ctx.sfx('electric-charge');
      }
      if (time >= nextPinch) { pinch(time); nextPinch = time + PINCH_EVERY; warnAt = -1; }

      for (const w of WHO) {
        const f = side(ctx, w);
        if (!alive(f)) continue;
        if (inBand(w)) {
          // Carried clockwise round the ring.
          const a = Math.atan2(f.y - cy, f.x - cx);
          ctx.nudge(f, -Math.sin(a) * CARRY * dt, Math.cos(a) * CARRY * dt);
          charge[w] = Math.min(100, charge[w] + CHARGE_IN * dt);
        } else charge[w] = Math.max(0, charge[w] - CHARGE_OUT * dt);
        // A full charge arcs to the other fighter when they are in reach.
        const o = side(ctx, other(w));
        if (charge[w] >= 100 && alive(o) && !ctx.isAirborne(o) && dist(f.x, f.y, o.x, o.y) <= ARC_REACH) {
          charge[w] = 45;
          ctx.hit(o, ARC_DMG, o.x, o.y);
          ctx.sfx('plasma-arc');
          arcs.push({ a: { x: f.x, y: f.y }, b: { x: o.x, y: o.y }, at: time, seed: time % 97 });
        }
      }
      arcs = arcs.filter((a) => time - a.at < 320);
    },

    playerTakenMult() { return takenFrom('npc'); },
    npcTakenMult() { return takenFrom('player'); },
    playerCooldownRate() { return inBand('player') ? 1.8 : 1; },
    npcCooldownRate() { return inBand('npc') ? 1.8 : 1; },

    npcSeek() {
      const n = ctx.npc;
      if (!alive(n)) return null;
      const a = Math.atan2(n.y - cy, n.x - cx);
      const d = radial(n.x, n.y);
      // The coils are clamping: out of the band, to whichever side is nearer.
      if (warnAt >= 0) {
        const r = d >= R ? R + BAND + 80 : Math.max(30, R - BAND - 70);
        return { x: clamp(cx + Math.cos(a) * r, 60, W - 60), y: clamp(cy + Math.sin(a) * r, top + 60, H - 50) };
      }
      // Not charged: get on the ring, a little ahead along the flow.
      if (charge.npc < 75) return { x: cx + Math.cos(a + 0.45) * R, y: cy + Math.sin(a + 0.45) * R };
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      const warn = warnAt >= 0 ? clamp((time - warnAt) / ctx.tk.warn(PINCH_WARN), 0, 1) : 0;
      const post = clamp(1 - (time - pinchFx) / 500, 0, 1);
      // The core: a disc of darker glass, a slow star-turn of faint lines.
      g.fillStyle(OBS.glass, 0.55); g.fillCircle(cx, cy, R - BAND - 6);
      for (let i = 0; i < 6; i++) {
        const an = t * 0.1 + (i / 6) * Math.PI * 2;
        g.lineStyle(1, OBS.seam, 0.12); g.lineBetween(cx, cy, cx + Math.cos(an) * (R - BAND - 10), cy + Math.sin(an) * (R - BAND - 10));
      }
      // The band: a deep glow, the hot middle, both rims of glass.
      const half = BAND * (1 - warn * 0.55);
      const hot = mixC(EMB.ember, EMB.core, 0.35 + warn * 0.5 + post * 0.15);
      g.lineStyle(BAND * 2 + 10, EMB.deep, 0.16); g.strokeCircle(cx, cy, R);
      g.lineStyle(half * 2, EMB.ember, 0.22 + warn * 0.2); g.strokeCircle(cx, cy, R);
      g.lineStyle(half * 0.9, hot, 0.3 + warn * 0.3); g.strokeCircle(cx, cy, R);
      g.lineStyle(3, OBS.edge, 0.55); g.strokeCircle(cx, cy, R + BAND); g.strokeCircle(cx, cy, R - BAND);
      g.lineStyle(1, OBS.edge, 0.25); g.strokeCircle(cx, cy, R + BAND + 6); g.strokeCircle(cx, cy, R - BAND - 6);
      // Streaks racing clockwise; filaments braiding.
      for (let i = 0; i < 26; i++) {
        const a0 = flow * (CARRY / R) * 1.4 + (i / 26) * Math.PI * 2;
        const rr = R + Math.sin(i * 2.7) * half * 0.7;
        g.lineStyle(2, lit(EMB.hot, 0.3), 0.6); g.beginPath(); g.arc(cx, cy, rr, a0, a0 + 0.16, false); g.strokePath();
      }
      for (let s = 0; s < 2; s++) {
        g.lineStyle(1.4, s ? EMB.core : EMB.hot, 0.55);
        g.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          const rr = R + Math.sin(a * 9 + t * 4 + s * Math.PI) * half * 0.55;
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      // Pinch telegraph: two rings closing on the centre-line.
      if (warn > 0) {
        g.lineStyle(2, OBS.seamLit, 0.5 + warn * 0.5);
        g.strokeCircle(cx, cy, R + BAND - warn * BAND * 0.85);
        g.strokeCircle(cx, cy, R - BAND + warn * BAND * 0.85);
      }
      if (post > 0) { g.lineStyle(BAND * 2, 0xffffff, post * 0.5); g.strokeCircle(cx, cy, R); }
      // The coils: black-glass blocks straddling the band, violet when they clamp.
      for (let i = 0; i < COILS; i++) {
        const a = (i / COILS) * Math.PI * 2 + 0.1;
        const ox = cx + Math.cos(a) * (R + BAND + 22), oy = cy + Math.sin(a) * (R + BAND + 22);
        const ix = cx + Math.cos(a) * (R - BAND - 18), iy = cy + Math.sin(a) * (R - BAND - 18);
        for (const [x, y, s] of [[ox, oy, 15], [ix, iy, 10]] as [number, number, number][]) {
          g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, s);
          g.fillStyle(OBS.facet, 1); g.fillCircle(x + s * 0.2, y - s * 0.2, s * 0.7);
          g.lineStyle(1.2, OBS.edge, 0.7); g.strokeCircle(x, y, s);
          g.fillStyle(warn > 0 ? OBS.seamLit : dim(EMB.ember, 0.3), warn > 0 ? 0.5 + warn * 0.5 : 0.8); g.fillCircle(x, y, s * 0.35);
        }
        if (warn > 0) seam(g, [{ x: ox, y: oy }, { x: (ox + ix) / 2 + Math.sin(time / 40 + i) * 6, y: (oy + iy) / 2 }, { x: ix, y: iy }], 1, warn, warn);
      }
    },

    drawAir(g, time) {
      // Charge crackling round anyone carrying it.
      for (const w of WHO) {
        const f = side(ctx, w);
        if (!alive(f) || charge[w] < 8) continue;
        const k = charge[w] / 100;
        const n = 2 + Math.floor(k * 5);
        for (let i = 0; i < n; i++) {
          const a = time / 160 + (i / n) * Math.PI * 2;
          const r = 26 + Math.sin(time / 90 + i) * 4;
          g.fillStyle(k > 0.9 ? EMB.core : EMB.hot, 0.5 + k * 0.4); g.fillCircle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8, 1.6 + k);
        }
        if (k > 0.9) { g.lineStyle(1.5, EMB.core, 0.4 + 0.4 * Math.sin(time / 40)); g.strokeCircle(f.x, f.y, 30); }
      }
      // Arcs: a jagged bolt, white core in an ember sheath.
      for (const arc of arcs) {
        const k = (time - arc.at) / 320;
        const pts: Pt[] = [arc.a];
        const steps = 9;
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          const j = Math.sin(arc.seed * 3.1 + i * 2.3 + time / 30) * 18;
          const nx = -(arc.b.y - arc.a.y), ny = arc.b.x - arc.a.x;
          const l = Math.hypot(nx, ny) || 1;
          pts.push({ x: arc.a.x + (arc.b.x - arc.a.x) * f + (nx / l) * j, y: arc.a.y + (arc.b.y - arc.a.y) * f + (ny / l) * j });
        }
        pts.push(arc.b);
        seam(g, pts, 2.2, 1 - k, 1, EMB.ember);
        g.lineStyle(1.4, 0xffffff, 1 - k);
        for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      }
    },

    drawHud(g, time) {
      const meter = (w: Who, x: number, dir: number) => {
        const k = charge[w] / 100;
        const y = top + 14;
        const x0 = dir > 0 ? x : x - 130;
        g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(x0 - 4, y - 4, 138, 16, 6);
        g.lineStyle(1, OBS.edge, 0.6); g.strokeRoundedRect(x0 - 4, y - 4, 138, 16, 6);
        g.fillStyle(dim(EMB.ember, 0.4), 1); g.fillRect(x0, y, 130, 8);
        g.fillStyle(k >= 0.9 && Math.floor(time / 100) % 2 ? EMB.core : EMB.hot, 1);
        g.fillRect(dir > 0 ? x0 : x0 + 130 - 130 * k, y, 130 * k, 8);
      };
      meter('player', 20, 1);
      meter('npc', W - 20, -1);
    },
  };
}

export const CONFINEMENT: GimmickDef = {
  id: 'bench-fire-confinement',
  rules: 'The ring confines: within it you are carried, quickened and charged — a full charge arcs. At the pinch, all within discharge.',
  make,
};
