import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, CANVAS, CANVAS_SHADE, CHALK, FOE_TINT, HEM_VELVET, PLAYER_TINT, RED_THREAD, STEEL, TAR, chalkLine, dist,
  stitches,
} from '../art';

/**
 * Cut to Pattern — Master Cutter Selvage, who chalked the Prince's patterns.
 *
 * Sails are lofted full size: the pattern chalked straight onto the loft floor, then cut out
 * with the great shears. In the star's telling Selvage is the cutter who taught Hem to cut — and
 * here he cuts *people* out of the cloth. He chalks a sail panel round the stranger (a triangle
 * jib; below half a four-sided main), then his shears run the chalk line all the way round.
 * Anyone the shears pass on the line is snipped; anyone still inside when the cut closes is cut
 * out — a heavy blow and a moment held in the lifted panel. Walk out across the chalk before the
 * shears come round.
 *
 * The exploit is the shears themselves: they are a thing you can strike as they run. Strike them
 * and they turn in his hand — his sleeve is caught in his own pattern, and the next panel is
 * chalked round *him*, small and fast.
 */

const ID = fallenId('sailmaker', 'cut-to-pattern');
const CHALK_MS = 1000;
const TURN_CHALK_MS = 700;
const SHEAR_SPEED = 430;
const TURN_SHEAR_SPEED = 600;
const R_JIB = 150;
const R_MAIN = 172;
const R_TURN = 118;
const GAP_MS = 4400;
const MAIN_GAP_MS = 3500;
const SNIP_R = 30;
const LIFT_MS = 700;

type State = 'chalk' | 'cut' | 'lift' | 'jammed';
interface Pattern {
  pts: Pt[]; per: number[]; total: number;
  state: State; t0: number; chalkMs: number; speed: number;
  cut: number; onFoe: boolean; snipped: Set<Fighter>; shears: StrikeTarget | null; seed: number;
}

function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  let pat: Pattern | null = null;
  let nextAt = 1400;
  let main = false;
  let turnNext = false;
  let announced = false;
  const cutOutAt = new Map<Fighter, number>();

  /** Walk `d` px round the outline from the first corner. */
  const along = (p: Pattern, d: number): Pt => {
    let rest = Math.max(0, Math.min(p.total, d));
    for (let i = 0; i < p.pts.length; i++) {
      const a = p.pts[i], b = p.pts[(i + 1) % p.pts.length];
      if (rest <= p.per[i] || i === p.pts.length - 1) {
        const k = p.per[i] > 0 ? Math.min(1, rest / p.per[i]) : 0;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
      rest -= p.per[i];
    }
    return p.pts[0];
  };

  const chalkAround = (f: Fighter, onFoe: boolean): void => {
    const sides = onFoe ? 3 : main ? 4 : 3;
    const R = onFoe ? R_TURN : main ? R_MAIN : R_JIB;
    const off = onFoe ? 0 : 34;
    const cx = Phaser.Math.Clamp(f.x + (rng() - 0.5) * off, 60 + R * 0.4, W - 60 - R * 0.4);
    const cy = Phaser.Math.Clamp(f.y + 8 + (rng() - 0.5) * off, top + 40 + R * 0.4, H - 40 - R * 0.4);
    const rot = rng() * Math.PI * 2;
    const pts: Pt[] = [];
    for (let i = 0; i < sides; i++) {
      // A sail is never regular: the leech runs long, the foot short.
      const a = rot + (i / sides) * Math.PI * 2 + (sides === 3 ? (i === 1 ? 0.25 : 0) : (i % 2 ? 0.12 : -0.08));
      const r = R * (sides === 3 ? (i === 0 ? 1.12 : 0.95) : 0.92 + (i % 2) * 0.12);
      pts.push({ x: tk.clampX(cx + Math.cos(a) * r, 24), y: tk.clampY(cy + Math.sin(a) * r, 24) });
    }
    const per = pts.map((a, i) => { const b = pts[(i + 1) % pts.length]; return dist(a.x, a.y, b.x, b.y); });
    pat = {
      pts, per, total: per.reduce((s, v) => s + v, 0), state: 'chalk', t0: ctx.scene.time.now,
      chalkMs: onFoe ? TURN_CHALK_MS : CHALK_MS, speed: onFoe ? TURN_SHEAR_SPEED : SHEAR_SPEED,
      cut: 0, onFoe, snipped: new Set(), shears: null, seed: rng() * 10,
    };
    ctx.sfx('whoosh');
  };

  const startCut = (p: Pattern): void => {
    p.state = 'cut'; p.t0 = ctx.scene.time.now;
    ctx.sfx('slash');
    const s = p.pts[0];
    p.shears = ctx.target({
      x: s.x, y: s.y - 10, r: 22,
      onStruck: (by) => {
        if (by !== 'player' || p.state !== 'cut' || p.onFoe) return;
        p.state = 'jammed'; p.t0 = ctx.scene.time.now;
        p.shears?.remove(); p.shears = null;
        turnNext = true;
        nextAt = ctx.scene.time.now + 250;
        ctx.root(ctx.npc, 1300);
        ctx.sfx('clang');
        ctx.banner('THE SHEARS TURN', '#9df5c8');
      },
    });
  };

  const close = (p: Pattern): void => {
    p.state = 'lift'; p.t0 = ctx.scene.time.now;
    p.shears?.remove(); p.shears = null;
    ctx.sfx('trap-snap');
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0 || !inside(p.pts, f.x, f.y + 10)) continue;
      cutOutAt.set(f, ctx.scene.time.now);
      if (f === ctx.player) { tk.hitPlayer(24, f.x, f.y); ctx.root(f, 900); ctx.banner('CUT OUT', '#ff9a7a'); }
      else { ctx.hit(f, Math.max(30, f.maxHp * 0.1), f.x, f.y); ctx.root(f, 1300); ctx.banner('CUT FROM HIS OWN CLOTH', '#9df5c8'); }
    }
    nextAt = ctx.scene.time.now + (main ? MAIN_GAP_MS : GAP_MS);
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('STAND OFF THE PATTERN', '#e8e4d8'); }
      if (!main && ctx.npc.hp < ctx.npc.maxHp * 0.5) { main = true; ctx.banner('THE MAINSAIL', '#ffb080'); ctx.sfx('boss-phase'); }

      if (!pat || ((pat.state === 'lift' || pat.state === 'jammed') && time - pat.t0 > LIFT_MS)) {
        if (pat && time - pat.t0 > LIFT_MS) pat = null;
        if (!pat && time >= nextAt) { chalkAround(turnNext ? ctx.npc : ctx.player, turnNext); turnNext = false; }
      }
      const p = pat;
      if (!p) return;
      if (p.state === 'chalk' && time - p.t0 >= p.chalkMs) startCut(p);
      if (p.state === 'cut') {
        p.cut = Math.min(p.total, p.cut + p.speed * dt);
        const s = along(p, p.cut);
        p.shears?.moveTo(s.x, s.y - 10);
        for (const f of [ctx.player, ctx.npc]) {
          if (p.snipped.has(f) || !f.active || f.hp <= 0) continue;
          if (dist(f.x, f.y + 10, s.x, s.y) < SNIP_R) {
            p.snipped.add(f);
            ctx.sfx('slash');
            if (f === ctx.player) { tk.hitPlayer(10, f.x, f.y); tk.slowPlayer(0.6, 600); }
            else ctx.hit(f, Math.max(10, f.maxHp * 0.03), f.x, f.y);
          }
        }
        if (p.cut >= p.total) close(p);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const p = pat;
      if (!p || (p.state !== 'chalk' && p.state !== 'cut')) return null;
      const c = p.pts.reduce((s, q) => ({ x: s.x + q.x / p.pts.length, y: s.y + q.y / p.pts.length }), { x: 0, y: 0 });
      if (inside(p.pts, n.x, n.y + 10)) {
        const a = Math.atan2(n.y - c.y, n.x - c.x);
        return { x: tk.clampX(c.x + Math.cos(a) * 220), y: tk.clampY(c.y + Math.sin(a) * 220) };
      }
      // Keep the stranger hemmed in: stand on the far side of the panel from the open floor.
      const pl = ctx.player;
      if (!p.onFoe && inside(p.pts, pl.x, pl.y + 10)) {
        const a = Math.atan2(pl.y - c.y, pl.x - c.x);
        return { x: tk.clampX(c.x + Math.cos(a) * 200), y: tk.clampY(c.y + Math.sin(a) * 200) };
      }
      return null;
    },

    drawGround(g, time) {
      const p = pat;
      if (!p) return;
      const n = p.pts.length;
      if (p.state === 'chalk' || p.state === 'cut') {
        // The panel's cloth shows faintly inside the chalk — brighter as the cut nears closing.
        const k = p.state === 'cut' ? p.cut / p.total : 0;
        g.fillStyle(p.onFoe ? FOE_TINT : CANVAS, 0.05 + k * 0.16 + Math.sin(time / 90) * 0.02 * k);
        g.fillPoints(p.pts.map((q) => new Phaser.Geom.Point(q.x, q.y)), true, true);
        // Chalk, drawn as the cutter's chalk goes round.
        const drawn = p.state === 'chalk' ? ((time - p.t0) / p.chalkMs) * p.total : p.total;
        let left = drawn;
        for (let i = 0; i < n && left > 0; i++) {
          const a = p.pts[i], b = p.pts[(i + 1) % n];
          const k2 = Math.min(1, left / p.per[i]);
          chalkLine(g, a.x, a.y, a.x + (b.x - a.x) * k2, a.y + (b.y - a.y) * k2, 0.9);
          left -= p.per[i];
        }
        // Corner marks: a chalked cross and a brass pricker in every corner.
        for (const q of p.pts) {
          g.lineStyle(2, CHALK, 0.8); g.lineBetween(q.x - 7, q.y - 7, q.x + 7, q.y + 7); g.lineBetween(q.x - 7, q.y + 7, q.x + 7, q.y - 7);
          g.fillStyle(BRASS, 1); g.fillCircle(q.x, q.y, 2.5);
        }
        // The cut behind the shears: a clean slit with frayed lips.
        if (p.state === 'cut') {
          let rest = p.cut;
          for (let i = 0; i < n && rest > 0; i++) {
            const a = p.pts[i], b = p.pts[(i + 1) % n];
            const k3 = Math.min(1, rest / p.per[i]);
            const ex = a.x + (b.x - a.x) * k3, ey = a.y + (b.y - a.y) * k3;
            g.lineStyle(4, TAR, 0.9); g.lineBetween(a.x, a.y, ex, ey);
            g.lineStyle(1, lit(CANVAS, 0.2), 0.8); g.lineBetween(a.x + 1, a.y - 2, ex + 1, ey - 2);
            const len = p.per[i] * k3, ux = (b.x - a.x) / p.per[i], uy = (b.y - a.y) / p.per[i];
            g.lineStyle(1, CANVAS_SHADE, 0.8);
            for (let d = 6; d < len; d += 9) {
              const fx = a.x + ux * d, fy = a.y + uy * d, w = Math.sin(d * 1.7 + p.seed) * 3;
              g.lineBetween(fx, fy, fx - uy * (4 + w), fy + ux * (4 + w));
            }
            rest -= p.per[i];
          }
        }
      }
      if (p.state === 'jammed') {
        const k = (time - p.t0) / LIFT_MS;
        for (let i = 0; i < n; i++) {
          const a = p.pts[i], b = p.pts[(i + 1) % n];
          chalkLine(g, a.x, a.y, b.x, b.y, 0.6 * (1 - k));
        }
      }
    },

    drawAir(g, time) {
      const p = pat;
      if (!p) return;
      if (p.state === 'chalk') {
        // The tailor's chalk: a flat blue-white slab at the drawing tip.
        const tip = along(p, ((time - p.t0) / p.chalkMs) * p.total);
        g.fillStyle(dim(CHALK, 0.25), 1); g.fillTriangle(tip.x - 9, tip.y - 2, tip.x + 9, tip.y - 2, tip.x, tip.y - 16);
        g.fillStyle(0xdfe8f2, 1); g.fillTriangle(tip.x - 7, tip.y - 4, tip.x + 7, tip.y - 4, tip.x, tip.y - 15);
        g.fillStyle(CHALK, 0.4); g.fillCircle(tip.x, tip.y, 5);
      }
      if (p.state === 'cut') drawShears(g, along(p, p.cut), time, p.onFoe);
      if (p.state === 'lift') {
        // The cut panel lifts off the floor, stitched hem and all, and away.
        const k = (time - p.t0) / LIFT_MS;
        const up = k * 60;
        const pts = p.pts.map((q) => new Phaser.Geom.Point(q.x, q.y - up));
        g.fillStyle(p.onFoe ? dim(FOE_TINT, 0.3) : CANVAS, 0.6 * (1 - k)); g.fillPoints(pts, true, true);
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          stitches(g, a.x, a.y, b.x, b.y, RED_THREAD, 1.6, 6, 4, 1 - k);
        }
      }
      // Anyone cut out stands in a ring of cut cloth for a moment.
      for (const f of [ctx.player, ctx.npc]) {
        const k = (time - (cutOutAt.get(f) ?? -9999)) / 1100;
        if (k < 0 || k > 1) continue;
        g.lineStyle(3, CANVAS, 0.8 * (1 - k)); g.strokeEllipse(f.x, f.y + 14, 50, 18);
        stitches(g, f.x - 24, f.y + 14, f.x + 24, f.y + 14, RED_THREAD, 1.5, 5, 4, 1 - k);
      }
    },

    drawHud(g) {
      const p = pat;
      const cx = W / 2, cy = top + 26;
      g.fillStyle(0x16141a, 0.7); g.fillRoundedRect(cx - 34, top + 4, 68, 46, 8);
      // A thumbnail of the panel with the shears' progress round it.
      const sides = p ? p.pts.length : main ? 4 : 3;
      const thumb: Pt[] = [];
      for (let i = 0; i < sides; i++) { const a = -Math.PI / 2 + (i / sides) * Math.PI * 2; thumb.push({ x: cx + Math.cos(a) * 16, y: cy + Math.sin(a) * 16 }); }
      g.fillStyle(p?.onFoe ? FOE_TINT : PLAYER_TINT, p ? 0.3 : 0.1); g.fillPoints(thumb.map((q) => new Phaser.Geom.Point(q.x, q.y)), true, true);
      const done = p && p.state === 'cut' ? p.cut / p.total : p && p.state === 'lift' ? 1 : 0;
      for (let i = 0; i < sides; i++) {
        const a = thumb[i], b = thumb[(i + 1) % sides];
        const k = Phaser.Math.Clamp(done * sides - i, 0, 1);
        g.lineStyle(2, CHALK, 0.5); g.lineBetween(a.x, a.y, b.x, b.y);
        if (k > 0) { g.lineStyle(3, RED_THREAD, 1); g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); }
      }
      g.fillStyle(HEM_VELVET, 1); g.fillCircle(cx, cy + 2, 3);
    },

    destroy() { pat?.shears?.remove(); pat = null; },
  };
}

/** The great cutting shears: two long blades scissoring on a brass pivot, ring handles behind. */
function drawShears(g: G, at: Pt, time: number, turned: boolean): void {
  const x = at.x, y = at.y - 10;
  const open = 0.18 + Math.abs(Math.sin(time / 70)) * 0.32;
  const base = turned ? Math.PI : -0.4;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(at.x, at.y + 4, 40, 10);
  for (const s of [-1, 1]) {
    const a = base + s * open;
    const ux = Math.cos(a), uy = Math.sin(a);
    const nx = -uy, ny = ux;
    // Blade.
    g.fillStyle(dim(STEEL, 0.4), 1);
    g.fillTriangle(x + nx * 4, y + ny * 4, x - nx * 2, y - ny * 2, x + ux * 40, y + uy * 40);
    g.fillStyle(STEEL, 1);
    g.fillTriangle(x + nx * 3, y + ny * 3, x - nx * 1, y - ny * 1, x + ux * 38, y + uy * 38);
    g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(x, y, x + ux * 34, y + uy * 34);
    // Handle and its ring.
    const hx = x - ux * 18, hy = y - uy * 18;
    g.lineStyle(4, TAR, 1); g.lineBetween(x, y, hx, hy);
    g.lineStyle(3, TAR, 1); g.strokeCircle(hx - ux * 6, hy - uy * 6, 7);
    g.lineStyle(1, lit(TAR, 0.4), 1); g.strokeCircle(hx - ux * 6, hy - uy * 6, 5);
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 3.5);
  g.fillStyle(lit(BRASS, 0.5), 1); g.fillCircle(x - 1, y - 1, 1.2);
}

export const FALLEN_CUT_TO_PATTERN: GimmickDef = {
  id: ID,
  rules: 'He chalks a sail panel round you and his shears cut it out: get off it before they close. Strike the shears and he is cut instead.',
  make,
};
