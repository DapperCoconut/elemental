import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { IRON, IRON_LIT, MARL, MARL_DARK, MARL_DEEP, MARL_LIT, SLIP_LIT } from '../palette';
import { alive, clamp, dist, ease } from '../util';

/**
 * Folded Over — Wedgewife Hulda Brack, who wedged the tithe clay on the great bench.
 *
 * Wedging is folding: you lift half the slab, fold it over onto the other half and press, again
 * and again, until no air is left in it. Hulda wedged the clay every soldier of the Tithe Ranks
 * was made from. In the King's telling she pressed the air out of people the same way.
 *
 * Here the yard is the slab. Hulda scores a fold line across it and lifts one half (shaded, its
 * edge raised, iron pegs at both ends). Whoever stands on the lifting half is folded over with
 * it — flung to their mirror image across the line — and pressed down hard. But anyone folded
 * onto the *other* fighter lands soft, and the one underneath is wedged: crushed and stunned.
 * Ghost marks show where everyone on the lifting half will land.
 *
 * Step off the lifting half; or stand on it at the mirror of where Hulda stands. Strike a peg
 * while the line is scored and the other half lifts instead — the bot likes to stand at your
 * mirror, so turning the fold drops you on her. Halfway down, every fold is followed by a second,
 * across it. The bot stands at your mirror when you are off the lifting half, and keeps clear of
 * your landing when you are on it.
 */

const ID = fallenId('potter', 'wedge');
const WARN_MS = 2100;
const WARN_LATE_MS = 1500;
const FLIP_MS = 480;
const PRESS = 14;
const WEDGED = 30;
const LAND_R = 62;
const PEG_R = 24;

interface Mover { f: Fighter; from: Pt; to: Pt }
interface Fold {
  px: number; py: number; dx: number; dy: number; side: 1 | -1; warnAt: number; flipAt: number;
  turned: boolean; second: boolean; pegs: StrikeTarget[]; movers: Mover[] | null; ends: [Pt, Pt];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const ym = (top + H) / 2;
  let fold: Fold | null = null;
  let nextAt = -1;
  let half = false;
  let now = 0;
  let landedAt = -1e9;
  let landed: Pt[] = [];

  const signed = (f: Fold, x: number, y: number) => (x - f.px) * -f.dy + (y - f.py) * f.dx;
  const lifts = (f: Fold, x: number, y: number) => signed(f, x, y) * f.side > 0;
  const mirror = (f: Fold, x: number, y: number): Pt => {
    const s = signed(f, x, y);
    return { x: clamp(x + 2 * s * f.dy, 44, W - 44), y: clamp(y - 2 * s * f.dx, top + 30, H - 40) };
  };

  /** Where a line from (px,py) along ±(dx,dy) leaves the yard, pulled a little inside. */
  function edge(px: number, py: number, dx: number, dy: number): Pt {
    let t = 1e9;
    if (dx > 1e-6) t = Math.min(t, (W - 30 - px) / dx); else if (dx < -1e-6) t = Math.min(t, (30 - px) / dx);
    if (dy > 1e-6) t = Math.min(t, (H - 24 - py) / dy); else if (dy < -1e-6) t = Math.min(t, (top + 24 - py) / dy);
    return { x: px + dx * t, y: py + dy * t };
  }

  function score(time: number, second: boolean, prev: Fold | null): void {
    let px: number, py: number, a: number;
    if (second && prev) { px = prev.px; py = prev.py; a = Math.atan2(prev.dy, prev.dx) + Math.PI / 2; }
    else { px = W / 2 + (rng() - 0.5) * 240; py = ym + (rng() - 0.5) * 140; a = Math.floor(rng() * 12) * (Math.PI / 12); }
    const dx = Math.cos(a), dy = Math.sin(a);
    const f: Fold = {
      px, py, dx, dy, side: 1, warnAt: time, flipAt: time + (second || half ? WARN_LATE_MS : WARN_MS), turned: false, second,
      pegs: [], movers: null, ends: [edge(px, py, dx, dy), edge(px, py, -dx, -dy)],
    };
    // The crown's side: the half the player stands on lifts, more often than not.
    const ps = signed(f, player.x, player.y) >= 0 ? 1 : -1;
    f.side = (rng() < 0.65 ? ps : -ps) as 1 | -1;
    for (const e of f.ends) {
      const d = dist(e.x, e.y, px, py) || 1;
      const peg = { x: e.x + (px - e.x) / d * 18, y: e.y + (py - e.y) / d * 18 };
      f.pegs.push(ctx.target({
        x: peg.x, y: peg.y, r: PEG_R, passThrough: true,
        onStruck: () => {
          if (f.turned || f.movers || now >= f.flipAt) return;
          f.turned = true;
          f.side = (f.side === 1 ? -1 : 1);
          ctx.float(peg.x, peg.y - 40, 'THE OTHER HALF LIFTS', '#ffd27a');
          ctx.sfx('snap-back');
        },
      }));
    }
    fold = f;
    ctx.sfx('stone-rise');
  }

  function flip(f: Fold): void {
    f.movers = [];
    for (const p of [player, npc]) {
      if (!alive(p) || ctx.isAirborne(p) || !lifts(f, p.x, p.y)) continue;
      f.movers.push({ f: p, from: { x: p.x, y: p.y }, to: mirror(f, p.x, p.y) });
      ctx.airborne(p, FLIP_MS);
      ctx.root(p, FLIP_MS);
    }
    for (const t of f.pegs) t.remove();
    f.pegs = [];
    ctx.sfx('whoosh');
  }

  function press(f: Fold): void {
    const movers = f.movers ?? [];
    landed = [];
    for (const m of movers) {
      const o = m.f === player ? npc : player;
      const oMoved = movers.some((q) => q.f === o);
      landed.push(m.to);
      if (!oMoved && alive(o) && dist(o.x, o.y, m.to.x, m.to.y) < LAND_R) {
        ctx.hit(o, WEDGED, o.x, o.y);
        ctx.stun(o, 900);
        ctx.float(o.x, o.y - 52, 'WEDGED', o === player ? '#ffb08a' : '#ffd27a');
        ctx.flash(o.x, o.y, MARL_LIT);
      } else {
        ctx.hit(m.f, PRESS, m.f.x, m.f.y);
        ctx.root(m.f, 600);
        ctx.float(m.f.x, m.f.y - 52, 'PRESSED', '#e6c9a8');
      }
    }
    landedAt = now;
    ctx.sfx('gravity-slam');
  }

  /** The lifting half of the yard as a polygon (the yard rectangle cut along the fold line). */
  function halfPoly(f: Fold): Pt[] {
    const rect: Pt[] = [{ x: 0, y: top }, { x: W, y: top }, { x: W, y: H }, { x: 0, y: H }];
    const out: Pt[] = [];
    for (let i = 0; i < rect.length; i++) {
      const a = rect[i], b = rect[(i + 1) % rect.length];
      const sa = signed(f, a.x, a.y) * f.side, sb = signed(f, b.x, b.y) * f.side;
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
    }
    return out;
  }

  return {
    update(time) {
      now = time;
      if (nextAt < 0) nextAt = time + 2400;
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        ctx.banner('Hulda wedges twice: every fold is crossed by another.', '#ffd27a');
        ctx.sfx('boss-phase');
      }
      const f = fold;
      if (!f) { if (time >= nextAt) score(time, false, null); return; }
      if (!f.movers && time >= f.flipAt) flip(f);
      if (f.movers) {
        const k = clamp((time - f.flipAt) / FLIP_MS, 0, 1);
        const e = ease(k);
        for (const m of f.movers) {
          if (!alive(m.f)) continue;
          ctx.nudge(m.f, m.from.x + (m.to.x - m.from.x) * e - m.f.x, m.from.y + (m.to.y - m.from.y) * e - m.f.y);
        }
        if (k >= 1) {
          press(f);
          fold = null;
          if (half && !f.second) score(time, true, f);
          else nextAt = time + (half ? 4200 : 5200);
        }
      }
    },

    npcSeek() {
      const f = fold;
      if (!f || f.movers || !alive(npc) || !alive(player)) return null;
      if (!lifts(f, player.x, player.y)) return mirror(f, player.x, player.y);
      // The player will fold: stand on the still half, clear of where they land.
      const land = mirror(f, player.x, player.y);
      const nx = -f.dy * -f.side, ny = f.dx * -f.side;
      let q = { x: f.px + nx * 150, y: f.py + ny * 150 };
      if (dist(q.x, q.y, land.x, land.y) < 130) q = { x: q.x + f.dx * 200, y: q.y + f.dy * 200 };
      return { x: clamp(q.x, 60, W - 60), y: clamp(q.y, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const f = fold;
      // Old landings: a pressed ring in the clay.
      const lk = clamp(1 - (time - landedAt) / 1400, 0, 1);
      if (lk > 0) for (const p of landed) { g.lineStyle(3, MARL_DEEP, 0.6 * lk); g.strokeEllipse(p.x, p.y + 4, 70, 26); }
      if (!f) return;
      const poly = halfPoly(f);
      if (!f.movers) {
        // The lifting half: shaded, a raised lip along the score, arrows over the line.
        const k = clamp((time - f.warnAt) / (f.flipAt - f.warnAt), 0, 1);
        g.fillStyle(MARL_DARK, 0.12 + 0.18 * k); g.fillPoints(poly, true);
        const [a, b] = f.ends;
        g.lineStyle(7, MARL_DEEP, 0.6); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(2, MARL_LIT, 0.6 + 0.4 * k); g.lineBetween(a.x - f.dy * 4 * f.side, a.y + f.dx * 4 * f.side, b.x - f.dy * 4 * f.side, b.y + f.dx * 4 * f.side);
        const nx = -f.dy * f.side, ny = f.dx * f.side;
        for (let i = -3; i <= 3; i++) {
          const cx = f.px + f.dx * i * 90, cy = f.py + f.dy * i * 90;
          const off = 40 + Math.sin(time / 180 + i) * 6;
          const sx = cx + nx * off, sy = cy + ny * off, ex = cx - nx * 30, ey = cy - ny * 30;
          g.lineStyle(3, mixC(MARL_LIT, 0xffd27a, k), 0.35 + 0.4 * k);
          g.beginPath(); g.moveTo(sx, sy); g.lineTo((sx + ex) / 2 + f.dx * 10, (sy + ey) / 2 + f.dy * 10); g.lineTo(ex, ey); g.strokePath();
          g.fillStyle(mixC(MARL_LIT, 0xffd27a, k), 0.35 + 0.4 * k); g.fillCircle(ex, ey, 3);
        }
        // Ghost marks: where everyone on the lifting half will be pressed down.
        for (const p of [player, npc]) {
          if (!alive(p) || !lifts(f, p.x, p.y)) continue;
          const m = mirror(f, p.x, p.y);
          const c = p === player ? 0x8fd0ff : 0xffa040;
          g.lineStyle(2, c, 0.35 + 0.45 * k); g.strokeEllipse(m.x, m.y + 4, LAND_R * 1.4, LAND_R * 0.5);
          g.fillStyle(c, 0.08 + 0.12 * k); g.fillEllipse(m.x, m.y + 4, LAND_R * 1.4, LAND_R * 0.5);
          g.lineStyle(1, c, 0.3); g.lineBetween(p.x, p.y, m.x, m.y);
        }
        for (const e of f.ends) drawPeg(g, e, f, time);
      } else {
        // The half folding over: each corner swings across the line like a turning page.
        const k = ease(clamp((time - f.flipAt) / FLIP_MS, 0, 1));
        const c = Math.cos(Math.PI * k);
        const moved = poly.map((p) => { const s = signed(f, p.x, p.y); const ns = s * c; return { x: p.x + (ns - s) * -f.dy, y: p.y + (ns - s) * f.dx }; });
        const lift = Math.sin(Math.PI * k) * 18;
        g.fillStyle(0x000000, 0.25); g.fillPoints(moved.map((p) => ({ x: p.x + lift, y: p.y + lift })), true);
        g.fillStyle(k < 0.5 ? MARL : MARL_DARK, 0.85); g.fillPoints(moved.map((p) => ({ x: p.x, y: p.y - lift })), true);
        g.lineStyle(2, k < 0.5 ? MARL_LIT : MARL_DEEP, 0.9); g.strokePoints(moved.map((p) => ({ x: p.x, y: p.y - lift })), true);
      }
    },

    drawAir(g, time) {
      const f = fold;
      if (!f || f.movers) return;
      // Hulda's wedging-wire hangs over the score line, its glint running along.
      const [a, b] = f.ends;
      const gt = (time / 900) % 1;
      glow(g, a.x + (b.x - a.x) * gt, a.y + (b.y - a.y) * gt, 18, SLIP_LIT, 0.08, 3);
    },

    drawHud(g, time) {
      // The next fold: a slab icon that lifts as the moment comes.
      const f = fold;
      const k = f ? (f.movers ? 1 : clamp((time - f.warnAt) / (f.flipAt - f.warnAt), 0, 1)) : 0;
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 40, y - 12, 80, 26, 6);
      g.fillStyle(MARL_DARK, 1); g.fillRect(x - 30, y + 2, 60, 6);
      g.fillStyle(MARL, 1); g.fillRect(x - 30, y + 2 - 1, 30, 5);
      const ang = k * Math.PI;
      g.lineStyle(5, f?.second ? 0xffd27a : MARL_LIT, 1);
      g.lineBetween(x, y + 2, x + Math.cos(ang) * 30, y + 2 - Math.sin(ang) * 16);
    },

    destroy() { if (fold) for (const t of fold.pegs) t.remove(); },
  };
}

/** An iron peg driven at the end of the score line, a twist of wire wound round its head. */
function drawPeg(g: G, e: Pt, f: Fold, time: number): void {
  const d = Math.hypot(f.px - e.x, f.py - e.y) || 1;
  const x = e.x + (f.px - e.x) / d * 18, y = e.y + (f.py - e.y) / d * 18;
  g.fillStyle(MARL_DEEP, 0.8); g.fillEllipse(x, y + 2, 22, 8);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y - 22, 6, 24);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 3, y - 22, 1.5, 24);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 23, 12, 5);
  g.lineStyle(1.2, 0xd8d4cc, 1);
  for (let k = 0; k < 3; k++) g.strokeEllipse(x, y - 18 + k * 3, 9, 3);
  if (!f.turned) { const p = 0.5 + 0.5 * Math.sin(time / 160); g.lineStyle(2, 0xffd27a, 0.25 + 0.35 * p); g.strokeCircle(x, y - 10, PEG_R); }
}

export const FALLEN_WEDGE: GimmickDef = {
  id: ID,
  rules: 'Hulda folds the yard: whoever is on the lifting half lands at their mirror, pressed — or on the foe, wedging him. Strike a peg to lift the other half.',
  make,
};
