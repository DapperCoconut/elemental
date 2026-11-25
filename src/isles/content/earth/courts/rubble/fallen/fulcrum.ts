import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ashlar, crack, weed } from '../art';
import { CHALK, DUST, DUST_LIT, LIME, LIME_DARK, LIME_DEEP, LIME_LIT, SCREE, SCREE_DARK, STRATA_GREY } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Lever and Lintel — Prise-Man Leofric Stannage, who in the King's telling levered the old capital's
 * walls over for the Regent, one lintel at a time, and was paid by the course.
 *
 * Fallen lintels lie across broken column drums like see-saws, one end down in the dust, the other
 * cocked up in the air. Strike a raised end and it slams down — and whoever stands on the low end is
 * thrown up and *over the drum*, out past the end that was struck, landing hard where a ring is
 * chalked. Nothing touches a thrown fighter in the air; whoever is under the ring when they land is
 * flattened. Every few seconds Leofric drops a capstone on the raised end of the slab whose low end
 * is nearest you (its shadow swells first).
 *
 * Use it both ways: strike a lintel while he stands on its low end and you land him where you like;
 * stand on a low end and shoot its far end yourself to be thrown clear of anything — and come down
 * on him. Halfway down the drums crack and every lintel rocks by itself on a slow beat (each one
 * wobbles before it goes). The bot steps off any low end that is about to go, and when you stand on
 * one it walks to that lintel's raised end, so its casts strike it.
 */

const ID = fallenId('rubble', 'fulcrum');
const L = 105;
const THROW = 150;
const FLY_MS = 850;
const CAP_EVERY = 4700;
const CAP_MS = 1100;
const ROCK_EVERY = 3900;
const WOBBLE_MS = 950;
const RING_R = 64;

interface Slab {
  c: Pt; ux: number; uy: number;
  /** Which end is down: +1 or -1 along (ux, uy). */
  down: number;
  flipAt: number;
  target: StrikeTarget | null;
  capAt: number;
  rockAt: number;
  seed: number;
}
interface Flight { from: Pt; to: Pt; start: number; landed: boolean }

/** One end of a lintel: k = +1 or -1 along its axis. */
const endOf = (s: Slab, k: number): Pt => ({ x: s.c.x + s.ux * L * k, y: s.c.y + s.uy * L * k });

const LAYOUT: [number, number, number][] = [[260, 240, 0], [700, 250, 0.6], [270, 500, -0.5], [690, 500, 0]];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const slabs: Slab[] = [];
  const flights = new Map<Fighter, Flight>();
  let started = false;
  let rocking = false;
  let nextCap = 0;

  const end = endOf;
  const onLowEnd = (s: Slab, f: Fighter): boolean => {
    const a = ((f.x - s.c.x) * s.ux + (f.y - s.c.y) * s.uy) * s.down;
    const across = Math.abs((f.x - s.c.x) * -s.uy + (f.y - s.c.y) * s.ux);
    return a > L * 0.3 && a < L + 18 && across < 32;
  };
  const pending = (s: Slab, time: number) => (s.capAt > 0 && s.capAt - time < CAP_MS + 200) || (rocking && s.rockAt - time < WOBBLE_MS + 200);

  function flip(s: Slab, time: number): void {
    if (time - s.flipAt < 450) return;
    const old = s.down;
    // Whoever is on the low end goes up and over the drum.
    for (const f of [player, npc]) {
      if (!alive(f) || flights.has(f) || !onLowEnd(s, f)) continue;
      const land = end(s, -old);
      const to = { x: tk.clampX(land.x - s.ux * old * THROW), y: tk.clampY(land.y - s.uy * old * THROW) };
      flights.set(f, { from: { x: f.x, y: f.y }, to, start: time, landed: false });
      ctx.airborne(f, FLY_MS);
      ctx.root(f, FLY_MS + 60);
      ctx.sfx('boing');
    }
    s.down = -old;
    s.flipAt = time;
    s.target?.moveTo(end(s, -s.down).x, end(s, -s.down).y - 26);
    ctx.sfx('stone-slam');
  }

  function land(f: Fighter, fl: Flight): void {
    fl.landed = true;
    ctx.sfx('gravity-slam');
    if (f === player) tk.hitPlayer(8, f.x, f.y); else ctx.hit(npc, 8, f.x, f.y);
    ctx.stun(f, 350);
    const other = f === player ? npc : player;
    if (alive(other) && !ctx.isAirborne(other) && dist(other.x, other.y, fl.to.x, fl.to.y) < RING_R) {
      if (other === player) tk.hitPlayer(22, other.x, other.y);
      else { ctx.hit(npc, 32, other.x, other.y); ctx.float(npc.x, npc.y - 58, 'LANDED ON', '#f0e0b0'); }
      ctx.stun(other, 600);
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        LAYOUT.forEach(([x, y, a], i) => {
          const s: Slab = { c: { x, y }, ux: Math.cos(a), uy: Math.sin(a), down: i % 2 ? 1 : -1, flipAt: -1e9, target: null, capAt: 0, rockAt: 0, seed: i * 2.3 };
          const up = end(s, -s.down);
          s.target = ctx.target({ x: up.x, y: up.y - 26, r: 22, passThrough: true, onStruck: () => flip(s, tk.now) });
          slabs.push(s);
        });
        nextCap = time + 3000;
      }
      if (!rocking && npc.hp < npc.maxHp * 0.5) {
        rocking = true;
        slabs.forEach((s, i) => { s.rockAt = time + 1800 + i * (ROCK_EVERY / 4); });
        ctx.banner('THE DRUMS CRACK — THE LINTELS ROCK', '#e6d2a8');
        ctx.sfx('quake');
      }
      // Leofric's capstone: onto the raised end of the lintel whose low end is nearest you.
      if (time >= nextCap && alive(player)) {
        nextCap = time + CAP_EVERY;
        let best: Slab | null = null, bd = Infinity;
        for (const s of slabs) { if (s.capAt) continue; const e = end(s, s.down); const d = dist(e.x, e.y, player.x, player.y); if (d < bd) { bd = d; best = s; } }
        if (best) { best.capAt = time + tk.warn(CAP_MS); ctx.sfx('whoosh'); }
      }
      for (const s of slabs) {
        if (s.capAt && time >= s.capAt) {
          s.capAt = 0;
          const up = end(s, -s.down);
          for (const f of [player, npc]) {
            if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, up.x, up.y) > 40) continue;
            if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(npc, 20, f.x, f.y);
          }
          ctx.flash(up.x, up.y, 0xe6d2a8);
          flip(s, time);
        }
        if (rocking && time >= s.rockAt) { s.rockAt = time + ROCK_EVERY; flip(s, time); }
      }
      // Thrown fighters ride their arc, then come down.
      for (const [f, fl] of flights) {
        if (fl.landed) { if (time - fl.start > FLY_MS + 400) flights.delete(f); continue; }
        if (!alive(f)) { flights.delete(f); continue; }
        const k = clamp((time - fl.start) / FLY_MS, 0, 1);
        const tx = fl.from.x + (fl.to.x - fl.from.x) * k, ty = fl.from.y + (fl.to.y - fl.from.y) * k;
        ctx.nudge(f, tx - f.x, ty - f.y);
        if (k >= 1) land(f, fl);
      }
    },

    npcSeek() {
      if (!alive(player) || flights.has(npc)) return null;
      const time = tk.now;
      for (const s of slabs) {
        if (!onLowEnd(s, npc) || !pending(s, time)) continue;
        return { x: tk.clampX(npc.x - s.uy * 90), y: tk.clampY(npc.y + s.ux * 90) };
      }
      // You on a low end: to that lintel's raised end, off to the side of the throw.
      for (const s of slabs) {
        if (!onLowEnd(s, player)) continue;
        const up = end(s, -s.down);
        const sg = (npc.x - s.c.x) * -s.uy + (npc.y - s.c.y) * s.ux >= 0 ? 1 : -1;
        return { x: tk.clampX(up.x - s.uy * sg * 60), y: tk.clampY(up.y + s.ux * sg * 60) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const s of slabs) {
        drawDrum(g, s);
        // The capstone's shadow swelling on the raised end.
        if (s.capAt) {
          const k = clamp(1 - (s.capAt - time) / CAP_MS, 0, 1), up = end(s, -s.down);
          g.fillStyle(0x000000, 0.15 + k * 0.35); g.fillEllipse(up.x, up.y + 4, 30 + k * 40, 12 + k * 16);
          g.lineStyle(2, 0xffc070, 0.4 + k * 0.5); g.strokeEllipse(up.x, up.y + 4, 80, 32);
        }
        // The low end, chalked as a throwing-place when it is about to go.
        if (pending(s, time)) {
          const lo = end(s, s.down);
          g.lineStyle(2, CHALK, 0.4 + Math.sin(time / 90) * 0.2); g.strokeEllipse(lo.x, lo.y + 4, 74, 30);
          const to = end(s, -s.down);
          const lx = tk.clampX(to.x - s.ux * s.down * THROW), ly = tk.clampY(to.y - s.uy * s.down * THROW);
          g.lineStyle(1.5, CHALK, 0.3); g.strokeCircle(lx, ly, RING_R);
        }
      }
      // Landing rings of anyone in the air.
      for (const [, fl] of flights) {
        if (fl.landed) continue;
        const k = clamp((time - fl.start) / FLY_MS, 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillCircle(fl.to.x, fl.to.y, RING_R * (0.4 + k * 0.6));
        g.lineStyle(3, 0xffb050, 0.6 + k * 0.4); g.strokeCircle(fl.to.x, fl.to.y, RING_R);
        for (let i = 0; i < 4; i++) crack(g, fl.to.x, fl.to.y, RING_R * k, i * 1.57 + 0.4, SCREE_DARK, 0.5 * k, 1.4);
      }
    },

    drawAir(g, time) {
      for (const s of slabs) drawLintel(g, s, time, rocking && s.rockAt - time < WOBBLE_MS);
      for (const s of slabs) if (s.capAt) {
        const k = clamp(1 - (s.capAt - time) / CAP_MS, 0, 1), up = end(s, -s.down);
        drawCapstone(g, up.x, up.y - 30 - (1 - k) * 220, 0.6 + k * 0.4);
      }
      // A thrown fighter's dust arc.
      for (const [f, fl] of flights) {
        if (fl.landed) {
          const k = clamp((time - fl.start - FLY_MS) / 400, 0, 1);
          for (let i = 0; i < 10; i++) { const a = i * 0.628; g.fillStyle(DUST_LIT, 0.5 * (1 - k)); g.fillCircle(fl.to.x + Math.cos(a) * (20 + k * 60), fl.to.y + Math.sin(a) * (8 + k * 24), 8 + k * 8); }
          continue;
        }
        const k = clamp((time - fl.start) / FLY_MS, 0, 1);
        for (let i = 1; i < 6; i++) {
          const kk = Math.max(0, k - i * 0.05), lift = Math.sin(kk * Math.PI) * 120;
          g.fillStyle(DUST, 0.35 - i * 0.05); g.fillCircle(fl.from.x + (fl.to.x - fl.from.x) * kk, fl.from.y + (fl.to.y - fl.from.y) * kk - lift, 9 - i);
        }
        shadow(g, f.x, f.y + 6, 40 * (1 - Math.sin(k * Math.PI) * 0.5), 12, 0.35);
      }
    },

    drawHud(g, time) {
      // A little see-saw that tips as the next capstone comes; four pips for the lintels' rocking.
      const x = W / 2, y = top + 20;
      const k = clamp(1 - (nextCap - time) / CAP_EVERY, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 40, y - 16, 80, 32, 6);
      g.fillStyle(LIME_DARK, 1); g.fillTriangle(x - 6, y + 10, x + 6, y + 10, x, y);
      const a = (k - 0.5) * 0.5;
      g.lineStyle(5, LIME, 1); g.lineBetween(x - Math.cos(a) * 30, y - Math.sin(a) * 30, x + Math.cos(a) * 30, y + Math.sin(a) * 30);
      g.fillStyle(SCREE, 1); g.fillRect(x + Math.cos(a) * 26 - 5, y + Math.sin(a) * 26 - 12 - (1 - k) * 4, 10, 8);
      if (rocking) slabs.forEach((s, i) => {
        const r = clamp(1 - (s.rockAt - time) / ROCK_EVERY, 0, 1);
        g.fillStyle(r > 0.75 ? 0xffb050 : LIME_DEEP, 1); g.fillCircle(x - 18 + i * 12, y + 22, 3.5);
      });
    },

    destroy() { for (const s of slabs) s.target?.remove(); },
  };
}

/** A column drum the lintel rocks on: fluted, cracked across once the rocking starts. */
function drawDrum(g: G, s: Slab): void {
  shadow(g, s.c.x, s.c.y + 6, 60, 16, 0.35);
  g.fillStyle(LIME_DEEP, 1); g.fillEllipse(s.c.x, s.c.y + 4, 44, 18);
  g.fillStyle(LIME_DARK, 1); g.fillRect(s.c.x - 22, s.c.y - 10, 44, 14);
  g.fillStyle(LIME, 1); g.fillEllipse(s.c.x, s.c.y - 10, 44, 16);
  for (let i = 0; i < 6; i++) { g.fillStyle(LIME_DEEP, 0.5); g.fillRect(s.c.x - 20 + i * 8, s.c.y - 8, 1.5, 12); }
  weed(g, s.c.x + 20, s.c.y + 6, 0.7);
}

/** The lintel: a long dressed beam of limestone with a carved fascia, tipped on its drum. */
function drawLintel(g: G, s: Slab, time: number, wobble: boolean): void {
  const tilt = clamp((time - s.flipAt) / 160, 0, 1);
  const lift = (k: number) => {
    const now = k === s.down ? 0 : 1, before = k === s.down ? 1 : 0;
    return (before + (now - before) * tilt) * 26;
  };
  const jit = wobble ? Math.sin(time / 40 + s.seed) * 3 : 0;
  const a = endOf(s, 1), b = endOf(s, -1);
  const ay = a.y - 14 - lift(1) + jit, by = b.y - 14 - lift(-1) - jit;
  const nx = -s.uy * 15, ny = s.ux * 7;
  // The beam's top face, then its front face.
  g.fillStyle(LIME_LIT, 1);
  g.fillPoints([{ x: a.x - nx, y: ay - ny - 8 }, { x: b.x - nx, y: by - ny - 8 }, { x: b.x + nx, y: by + ny - 8 }, { x: a.x + nx, y: ay + ny - 8 }], true);
  g.fillStyle(LIME, 1);
  g.fillPoints([{ x: a.x + nx, y: ay + ny - 8 }, { x: b.x + nx, y: by + ny - 8 }, { x: b.x + nx, y: by + ny + 6 }, { x: a.x + nx, y: ay + ny + 6 }], true);
  // Fascia mouldings and the carved rosettes of the old Exchange door.
  g.lineStyle(1.5, LIME_DARK, 1);
  g.lineBetween(a.x + nx, ay + ny - 3, b.x + nx, by + ny - 3);
  for (let i = 1; i < 4; i++) {
    const k = i / 4, rx = a.x + (b.x - a.x) * k + nx, ry = ay + (by - ay) * k + ny;
    g.strokeCircle(rx, ry + 2, 3);
  }
  // Each end: a broken tenon, the raised one lit to be struck.
  for (const k of [1, -1]) {
    const e = endOf(s, k), ey = e.y - 14 - lift(k) + (k === 1 ? jit : -jit);
    ashlar(g, e.x, ey + 8, 16, 14, k === s.down ? LIME_DARK : LIME, true);
    if (k !== s.down) glow(g, e.x, ey - 8, 20, 0xf0c870, 0.04 + Math.sin(time / 220 + s.seed) * 0.015, 3);
  }
  if (wobble) crack(g, s.c.x, s.c.y - 6, 18, Math.PI / 2, STRATA_GREY, 0.9, 1.6);
}

/** A capstone dropping out of the sky on Leofric's rope: a squared block with a lifting ring. */
function drawCapstone(g: G, x: number, y: number, a: number): void {
  g.lineStyle(2, 0x6a5a40, a); g.lineBetween(x, y - 30, x, y - 300);
  ashlar(g, x, y + 10, 30, 24, SCREE, false);
  g.lineStyle(2, 0x3a3634, a); g.strokeCircle(x, y - 18, 5);
}

export const FALLEN_FULCRUM: GimmickDef = {
  id: ID,
  rules: 'Strike a raised lintel: whoever is on its low end is thrown over the drum and lands hard. Throw him, or yourself onto him. At half, they rock.',
  make,
};
