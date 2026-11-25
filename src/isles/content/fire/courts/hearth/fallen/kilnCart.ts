import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { brandSigil, dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { BRAND, BRICK, BRICK_DARK, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, SLATE, SOOT } from '../palette';
import { alive, clamp, dist, frameClock } from '../gimmicks/util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Kiln Cart — Dorrit Mapp, in the King's telling the carter who drove the iron cart that took
 * cold-hearth families up the hill to the Kiln, and never once looked behind him.
 *
 * Rails cross the room from a cart-shed in the west to the Kiln's mouth in the east, splitting at
 * a set of points into a HIGH road and a LOW road. On the bell, the road the points are set to
 * glows end to end; then the cart comes, a ton of iron and coal, and runs down anyone on it.
 * Off the rails you are safe — the cart only kills what stands in its road.
 *
 * The exploit is the points lever by the shed: strike it and the points throw. Even with the
 * cart already rolling, it takes whichever road is set when it reaches the split — so wait for
 * Dorrit to cross the other road and throw it under his own cart, which hurts him far worse than
 * you. Halfway down, the cart's lodestone wakes: while it runs it drags at both of you, and the
 * carts come quicker. The bot keeps off the lit road and runs to the lever when you stand on the
 * dark one.
 */

const ID = fallenId('hearth', 'kiln-cart');
const RAIL_HALF = 22;
const CART_R = 34;
const WARN_MS = 1400;
const SPLIT_S = 170;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const step = frameClock();
  const ym = (top + H) / 2;
  const head: Pt[] = [{ x: 0, y: ym }, { x: SPLIT_S, y: ym }];
  const tail: Pt[] = [{ x: W - 170, y: ym }, { x: W, y: ym }];
  const roads: Record<'high' | 'low', Pt[]> = {
    high: [...head, { x: 290, y: top + 110 }, { x: W - 290, y: top + 110 }, ...tail],
    low: [...head, { x: 290, y: H - 76 }, { x: W - 290, y: H - 76 }, ...tail],
  };
  let points: 'high' | 'low' = 'high';
  let lastThrow = 0;
  const lever = ctx.target({
    x: 110, y: ym - 70, r: 18, passThrough: true,
    onStruck: () => {
      if (tk.now - lastThrow < 450) return;
      lastThrow = tk.now;
      points = points === 'high' ? 'low' : 'high';
      ctx.sfx('gear-turn');
      ctx.float(110, ym - 110, points === 'high' ? 'POINTS: HIGH' : 'POINTS: LOW', '#ffd27a');
    },
  });
  /** The run in progress: where along the road, which road it committed to (null before the split). */
  let run: { s: number; road: 'high' | 'low' | null; hit: Set<Fighter> } | null = null;
  let bellAt = 0;
  let nextBell = 0;
  let lode = false;
  let started = false;

  const roadLen = (pts: Pt[]) => pts.slice(1).reduce((a, p, i) => a + dist(pts[i].x, pts[i].y, p.x, p.y), 0);
  const at = (pts: Pt[], s: number): { p: Pt; a: number } => {
    for (let i = 1; i < pts.length; i++) {
      const l = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (s <= l || i === pts.length - 1) {
        const k = clamp(s / l, 0, 1);
        return { p: { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k }, a: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) };
      }
      s -= l;
    }
    return { p: pts[pts.length - 1], a: 0 };
  };
  const nearRoad = (pts: Pt[], x: number, y: number): number => {
    let best = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      best = Math.min(best, dist(x, y, a.x + dx * t, a.y + dy * t));
    }
    return best;
  };
  const liveRoad = (): Pt[] => roads[run?.road ?? points];
  const cartPos = () => (run ? at(liveRoad(), run.s) : null);

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextBell = time + 2500; }
      if (!lode && npc.hp < npc.maxHp * 0.5) {
        lode = true;
        ctx.banner('THE LODESTONE WAKES', '#ffd27a');
        ctx.sfx('magnet-pull');
      }
      if (!run && !bellAt && time >= nextBell) {
        bellAt = time + tk.warn(WARN_MS);
        ctx.sfx('train-horn');
      }
      if (bellAt && time >= bellAt) {
        bellAt = 0;
        run = { s: 0, road: null, hit: new Set() };
        ctx.sfx('engine');
      }
      if (run) {
        const speed = lode ? 400 : 340;
        run.s += speed * dt;
        if (!run.road && run.s >= SPLIT_S) run.road = points;
        const c = cartPos();
        if (c) {
          for (const f of [player, npc]) {
            if (!alive(f) || run.hit.has(f) || dist(f.x, f.y, c.p.x, c.p.y) > CART_R + 20) continue;
            run.hit.add(f);
            const side = Math.sign((f.x - c.p.x) * -Math.sin(c.a) + (f.y - c.p.y) * Math.cos(c.a)) || 1;
            ctx.nudge(f, -Math.sin(c.a) * side * 70 + Math.cos(c.a) * 40, Math.cos(c.a) * side * 70 + Math.sin(c.a) * 40);
            if (f === player) { tk.hitPlayer(22, f.x, f.y); ctx.stun(player, 350); }
            else { ctx.hit(npc, 64, f.x, f.y); ctx.stun(npc, 900); ctx.float(npc.x, npc.y - 56, 'RUN DOWN', '#ffb070'); }
            ctx.sfx('hit-heavy');
          }
          if (lode) {
            tk.pull(c.p.x, c.p.y, 75, 120);
            if (alive(npc) && !run.hit.has(npc)) {
              const d = dist(npc.x, npc.y, c.p.x, c.p.y);
              if (d > 30 && d < 360) ctx.nudge(npc, ((c.p.x - npc.x) / d) * 75 * dt, ((c.p.y - npc.y) / d) * 75 * dt);
            }
          }
        }
        if (run.s >= roadLen(liveRoad())) {
          run = null;
          tk.boom(W - 40, ym, 70, EMBER);
          ctx.sfx('explosion-small');
          nextBell = time + (lode ? 3600 : 5200);
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const road = run ? liveRoad() : roads[points];
      const danger = bellAt || run;
      // Off the lit road, sideways — the quickest step out of its way.
      if (danger && nearRoad(road, npc.x, npc.y) < RAIL_HALF + 50) {
        const up = npc.y < ym ? 1 : -1;
        return { x: npc.x, y: tk.clampY(npc.y + up * 120) };
      }
      // You are on the dark road and the cart has not reached the split: throw the points.
      const other = roads[points === 'high' ? 'low' : 'high'];
      if (danger && (!run || !run.road) && nearRoad(other, player.x, player.y) < RAIL_HALF + 10 && nearRoad(other, player.x, player.y) < nearRoad(road, player.x, player.y)) {
        return { x: lever.x + 24, y: lever.y + 20 };
      }
      return null;
    },

    drawGround(g, time) {
      const lit = (name: 'high' | 'low') => (run ? (run.road ?? points) === name : bellAt ? points === name : false);
      // Shared trunk first, then each branch.
      const warnK = bellAt ? 0.5 + Math.sin(time / 70) * 0.5 : 0;
      for (const name of ['low', 'high'] as const) drawRails(g, roads[name], lit(name) ? (run ? 1 : warnK) : 0, time);
      // The points blade at the split, showing which road it is set to.
      const toward = roads[points][2];
      const a = Math.atan2(toward.y - ym, toward.x - SPLIT_S);
      g.lineStyle(5, KINDLE_POINT, 1); g.lineBetween(SPLIT_S, ym, SPLIT_S + Math.cos(a) * 40, ym + Math.sin(a) * 40);
      // Rod from lever to points.
      g.lineStyle(2, IRON, 1); g.lineBetween(lever.x, lever.y, SPLIT_S, ym - 6);
      if (lode && run) {
        const c = cartPos();
        if (c) for (let i = 0; i < 3; i++) {
          const r = 60 + ((time / 6 + i * 60) % 180);
          g.lineStyle(2, 0x9ab0ff, 0.25 * (1 - r / 240)); g.strokeCircle(c.p.x, c.p.y, r);
        }
      }
    },

    drawAir(g, time) {
      drawShed(g, 0, ym);
      drawMouth(g, W, ym, time, !!run);
      drawLever(g, lever.x, lever.y, points, time);
      const c = cartPos();
      if (c) drawCart(g, c.p.x, c.p.y, c.a, time, lode);
      else if (bellAt) {
        // The cart nosing out of the shed, lamp swinging.
        const k = clamp(1 - (bellAt - time) / tk.warn(WARN_MS), 0, 1);
        drawCart(g, -50 + k * 40, ym, 0, time, lode);
      }
    },

    drawHud(g, time) {
      const y = top + 16, x = W / 2;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 70, y - 13, 140, 26, 6);
      // A little fork with the set road lit.
      g.lineStyle(3, 0x5a5550, 1); g.lineBetween(x - 56, y, x - 36, y); g.lineBetween(x - 36, y, x - 18, y - 8); g.lineBetween(x - 36, y, x - 18, y + 8);
      g.lineStyle(3, EMBER_LIT, 1); g.lineBetween(x - 36, y, x - 18, points === 'high' ? y - 8 : y + 8);
      // The bell clock.
      const k = run ? 1 : bellAt ? 1 : clamp(1 - (nextBell - time) / 5200, 0, 1);
      g.fillStyle(0x2b2725, 1); g.fillRect(x - 4, y - 6, 66, 12);
      g.fillStyle(run || bellAt ? EMBER : GLOW, 1); g.fillRect(x - 4, y - 6, 66 * k, 12);
      g.lineStyle(1, IRON, 1); g.strokeRect(x - 4, y - 6, 66, 12);
    },

    destroy() { lever.remove(); },
  };
}

const KINDLE_POINT = 0xffd27a;

/** Sleepers and two iron rails along a road; ember-lit end to end when the cart is coming. */
function drawRails(g: G, pts: Pt[], hot: number, time: number): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = dist(a.x, a.y, b.x, b.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let s = 8; s < l; s += 22) {
      const cx = a.x + Math.cos(ang) * s, cy = a.y + Math.sin(ang) * s;
      g.lineStyle(7, 0x3a2c20, 1); g.lineBetween(cx - nx * RAIL_HALF, cy - ny * RAIL_HALF, cx + nx * RAIL_HALF, cy + ny * RAIL_HALF);
      g.lineStyle(1, 0x5a4430, 0.8); g.lineBetween(cx - nx * RAIL_HALF + 1, cy - ny * RAIL_HALF, cx + nx * RAIL_HALF + 1, cy + ny * RAIL_HALF);
    }
    for (const o of [-13, 13]) {
      g.lineStyle(4, IRON, 1); g.lineBetween(a.x + nx * o, a.y + ny * o, b.x + nx * o, b.y + ny * o);
      g.lineStyle(1.5, hot > 0 ? EMBER_LIT : 0x8a827a, hot > 0 ? 0.4 + hot * 0.6 : 0.7);
      g.lineBetween(a.x + nx * (o - 1), a.y + ny * (o - 1), b.x + nx * (o - 1), b.y + ny * (o - 1));
    }
    if (hot > 0) {
      g.fillStyle(EMBER, 0.08 * hot);
      g.fillPoints([
        { x: a.x + nx * RAIL_HALF, y: a.y + ny * RAIL_HALF }, { x: b.x + nx * RAIL_HALF, y: b.y + ny * RAIL_HALF },
        { x: b.x - nx * RAIL_HALF, y: b.y - ny * RAIL_HALF }, { x: a.x - nx * RAIL_HALF, y: a.y - ny * RAIL_HALF },
      ], true);
      const ph = (time / 400) % 1;
      g.fillStyle(EMBER_LIT, 0.6 * hot); g.fillCircle(a.x + (b.x - a.x) * ph, a.y + (b.y - a.y) * ph, 3);
    }
  }
}

/** The iron coal-tub: riveted sides, the King's brand, coal heaped and glowing, a lamp, a lodestone. */
function drawCart(g: G, x: number, y: number, a: number, time: number, lode: boolean): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  shadow(g, x, y + 8, 78, 22, 0.4);
  const bounce = Math.sin(time / 50) * 1.2;
  const by = y - 16 + bounce;
  for (const s of [-20, 20]) { g.fillStyle(SOOT, 1); g.fillCircle(x + ux * s, y - 2 + uy * s, 9); g.fillStyle(IRON, 1); g.fillCircle(x + ux * s, y - 2 + uy * s, 6); g.fillStyle(0x6a625c, 1); g.fillCircle(x + ux * s, y - 2 + uy * s, 2); }
  g.fillStyle(SOOT, 1); g.fillRect(x - 38, by - 24, 76, 30);
  g.fillStyle(IRON, 1); g.fillRect(x - 36, by - 22, 72, 26);
  g.fillStyle(0x3a3532, 1); g.fillRect(x - 36, by - 22, 72, 5);
  for (let i = 0; i < 7; i++) { g.fillStyle(0x6a625c, 1); g.fillCircle(x - 32 + i * 10.6, by - 18, 1.3); g.fillCircle(x - 32 + i * 10.6, by + 1, 1.3); }
  brandSigil(g, x, by - 8, 8, BRAND, 0.9);
  // The coal, heaped and smouldering.
  for (let i = 0; i < 9; i++) {
    const cx = x - 28 + i * 7, cy = by - 26 - Math.sin((i / 8) * Math.PI) * 10;
    g.fillStyle(i % 3 ? 0x1a1716 : 0x2b2725, 1); g.fillCircle(cx, cy, 6);
    if (i % 2) { g.fillStyle(EMBER, 0.6 + Math.sin(time / 90 + i) * 0.3); g.fillCircle(cx + 1, cy - 1, 2); }
  }
  // Lamp on its bracket at the front.
  const lx = x + (ux >= 0 ? 40 : -40);
  g.fillStyle(IRON, 1); g.fillRect(lx - 4, by - 30, 8, 12);
  g.fillStyle(GLOW, 0.9); g.fillRect(lx - 2, by - 28, 4, 8);
  glow(g, lx, by - 24, 26, GLOW, 0.06, 3);
  if (lode) {
    // The lodestone slung under the tub, humming blue.
    g.fillStyle(SLATE, 1); g.fillEllipse(x, by + 10, 26, 10);
    g.fillStyle(0x9ab0ff, 0.5 + Math.sin(time / 80) * 0.3); g.fillEllipse(x, by + 10, 14, 5);
  }
}

/** The points lever: a cast-iron stand with a long handle, thrown to the road it sets. */
function drawLever(g: G, x: number, y: number, points: 'high' | 'low', time: number): void {
  shadow(g, x, y + 2, 34, 10);
  g.fillStyle(IRON, 1); g.fillRect(x - 12, y - 10, 24, 12);
  g.fillStyle(0x4a4440, 1); g.fillRect(x - 10, y - 8, 20, 3);
  const a = points === 'high' ? -Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5;
  const tx = x + Math.cos(a) * 40, ty = y - 8 + Math.sin(a) * 40;
  g.lineStyle(4, IRON, 1); g.lineBetween(x, y - 8, tx, ty);
  g.fillStyle(KINDLE_POINT, 0.8 + Math.sin(time / 300) * 0.2); g.fillCircle(tx, ty, 5);
  g.lineStyle(1.5, KINDLE_POINT, 0.5); g.strokeCircle(x, y - 8, 18);
}

/** The cart-shed in the west wall: slate roof, open doors, the dark inside. */
function drawShed(g: G, x: number, ym: number): void {
  g.fillStyle(SOOT, 1); g.fillRect(x, ym - 60, 28, 120);
  g.fillStyle(0x3a2c20, 1); g.fillRect(x + 20, ym - 60, 10, 18); g.fillRect(x + 20, ym + 42, 10, 18);
  g.fillStyle(SLATE, 1); g.fillTriangle(x, ym - 70, x + 34, ym - 62, x, ym - 54);
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillRect(x, ym - 66, 32, 6);
}

/** The Kiln's mouth in the east wall, roaring brighter when a cart is on its way in. */
function drawMouth(g: G, W: number, ym: number, time: number, hungry: boolean): void {
  const x = W - 16;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 24, ym - 76, 40, 152);
  for (let r = 0; r < 9; r++) { g.fillStyle(r % 2 ? BRICK : dim(BRICK, 0.15), 1); g.fillRect(x - 22 + (r % 2) * 5, ym - 74 + r * 16.5, 34, 14); }
  const f = (hungry ? 1 : 0.6) * (0.8 + Math.sin(time / 70) * 0.15);
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 20, ym - 46, 30, 92, { tl: 14, bl: 14, tr: 0, br: 0 });
  g.fillStyle(EMBER_DARK, 1); g.fillRoundedRect(x - 16, ym - 40, 26, 80, { tl: 12, bl: 12, tr: 0, br: 0 });
  g.fillStyle(EMBER, f); g.fillRoundedRect(x - 12, ym - 32, 22, 64, { tl: 10, bl: 10, tr: 0, br: 0 });
  g.fillStyle(GLOW, f); g.fillRoundedRect(x - 6, ym - 20, 16, 40, { tl: 8, bl: 8, tr: 0, br: 0 });
  glow(g, x - 10, ym, hungry ? 120 : 80, EMBER, 0.05, 4);
}

export const FALLEN_KILN_CART: GimmickDef = {
  id: ID,
  rules: 'On the bell the cart runs the lit road. Step off the rails. Strike the lever to throw the points — run Dorrit down. At half, its lodestone drags.',
  make,
};
