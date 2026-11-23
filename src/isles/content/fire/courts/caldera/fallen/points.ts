import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CAL, dist, makeClock } from '../palette';

/**
 * The Points — Pointsman Harl Cinderby (Technology).
 *
 * Harl worked the points on the ore line, the lever that decided whether a loaded cart went
 * round to the cutting sheds or straight up the middle to the Kiln door — and, in the King's
 * telling, which crews rode in it. The arena is his junction: a loop of rail round the floor
 * and a spur straight across its middle, joined at the west points. A heavy ore cart runs the
 * line without stopping and flattens whoever stands on its rails; its lamp lights the rails a
 * second ahead of it.
 *
 * The lever by the points is a thing either side can strike, and every blow throws it: the
 * cart takes the long loop or cuts across the spur. Stand on the spur's rails and you are safe
 * until somebody throws the points — so throw them when Harl is the one standing there.
 * Halfway down a second cart joins the line, half a lap behind the first.
 */

const CART_HIT_R = 36;
const CART_DMG = 24;
const RAIL_GAUGE = 7;

interface Cart { route: 0 | 1; s: number; hitAt: Map<Fighter, number>; born: number }

export const pointsGimmick: GimmickDef = {
  id: fallenId('caldera', 'points'),
  rules: 'An ore cart runs the rails and flattens whoever is on them. Strike the lever to throw the points: loop or spur.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const tick = makeClock();
    const L = 90, R = W - 90, T = top + 64, B = H - 60, M = Math.round((T + B) / 2);
    /** Route 0: the long loop over the top. Route 1: straight across the spur. Both start and end at the west points. */
    const routes: Pt[][] = [
      [{ x: L, y: M }, { x: L, y: T }, { x: R, y: T }, { x: R, y: B }, { x: L, y: B }, { x: L, y: M }],
      [{ x: L, y: M }, { x: R, y: M }, { x: R, y: B }, { x: L, y: B }, { x: L, y: M }],
    ];
    const lens = routes.map((r) => r.slice(1).reduce((acc, p, i) => acc + dist(r[i].x, r[i].y, p.x, p.y), 0));
    const LEVER: Pt = { x: L + 74, y: M - 62 };
    let points: 0 | 1 = 0;
    let flippedAt = -9999;
    let late = false;
    let nowT = 0;
    const carts: Cart[] = [{ route: 0, s: 0, hitAt: new Map(), born: 0 }];
    const speed = (): number => (late ? 300 : 270);

    const at = (route: number, s: number): { x: number; y: number; dx: number; dy: number } => {
      const r = routes[route];
      let left = Phaser.Math.Clamp(s, 0, lens[route]);
      for (let i = 0; i < r.length - 1; i++) {
        const a = r[i], b = r[i + 1], d = dist(a.x, a.y, b.x, b.y);
        if (left <= d || i === r.length - 2) {
          const t = d > 0 ? Math.min(1, left / d) : 0;
          return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / (d || 1), dy: (b.y - a.y) / (d || 1) };
        }
        left -= d;
      }
      return { x: r[0].x, y: r[0].y, dx: 0, dy: -1 };
    };
    /** Where a cart will be `ahead` px further on, taking the points as they stand now. */
    const ahead = (c: Cart, d: number): Pt => {
      const s = c.s + d;
      return s <= lens[c.route] ? at(c.route, s) : at(points, s - lens[c.route]);
    };
    const nearestRail = (x: number, y: number): { p: Pt; d: number } => {
      let best: Pt = { x: L, y: M }, bd = Infinity;
      for (const r of routes) {
        for (let i = 0; i < r.length - 1; i++) {
          const a = r[i], b = r[i + 1];
          const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
          const t = Phaser.Math.Clamp(((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / len2, 0, 1);
          const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          const d = dist(x, y, p.x, p.y);
          if (d < bd) { bd = d; best = p; }
        }
      }
      return { p: best, d: bd };
    };

    const lever: StrikeTarget = ctx.target({
      x: LEVER.x, y: LEVER.y, r: 22, passThrough: true,
      onStruck: () => {
        if (nowT - flippedAt < 650) return;
        flippedAt = nowT;
        points = points === 0 ? 1 : 0;
        ctx.sfx('gear-turn');
        ctx.flash(L, M, CAL.sulphur);
      },
    });

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          late = true;
          const lead = carts[0];
          carts.push({ route: lead.route, s: (lead.s + lens[lead.route] / 2) % lens[lead.route], hitAt: new Map(), born: time });
          ctx.banner('A SECOND CART ON THE LINE', '#ffd27a');
          ctx.sfx('train-horn');
        }
        for (const c of carts) {
          c.s += speed() * dt;
          if (c.s >= lens[c.route]) { c.s -= lens[c.route]; c.route = points; ctx.sfx('clang'); }
          const p = at(c.route, c.s);
          for (const f of [ctx.player, ctx.npc]) {
            if (!f.active || f.hp <= 0 || time - (c.hitAt.get(f) ?? -9999) < 900) continue;
            if (dist(p.x, p.y, f.x, f.y) < CART_HIT_R) {
              c.hitAt.set(f, time);
              ctx.hit(f, CART_DMG, f.x, f.y);
              // Thrown off the rails to whichever side they stood on.
              const side = (f.x - p.x) * -p.dy + (f.y - p.y) * p.dx >= 0 ? 1 : -1;
              ctx.nudge(f, -p.dy * side * 64 + p.dx * 20, p.dx * side * 64 + p.dy * 20);
              ctx.sfx('hit-heavy');
              ctx.flash(f.x, f.y, CAL.lavaLit);
            }
          }
        }
      },

      npcSeek(): Pt | null {
        const n = ctx.npc, pl = ctx.player;
        // On a rail the cart is about to use: step off it, away from the line.
        for (const c of carts) {
          for (let d = 0; d <= 380; d += 20) {
            const q = ahead(c, d);
            if (dist(q.x, q.y, n.x, n.y) < CART_HIT_R + 26) {
              const r = nearestRail(n.x, n.y);
              let ux = n.x - r.p.x, uy = n.y - r.p.y;
              const ul = Math.hypot(ux, uy);
              if (ul < 4) { ux = W / 2 - n.x; uy = (r.p.y === M ? (T + M) / 2 : M) - n.y; }
              const k = Math.hypot(ux, uy) || 1;
              return { x: Phaser.Math.Clamp(n.x + (ux / k) * 90, 50, W - 50), y: Phaser.Math.Clamp(n.y + (uy / k) * 90, top + 40, H - 40) };
            }
          }
        }
        // The player loitering on the spur (or the top loop) with a cart coming to the points: go throw them.
        const want: 0 | 1 | null = Math.abs(pl.y - M) < 40 && pl.x > L && pl.x < R ? 1 : Math.abs(pl.y - T) < 40 ? 0 : null;
        if (want !== null && want !== points && carts.some((c) => lens[c.route] - c.s < 520)) return { x: LEVER.x + 26, y: LEVER.y + 18 };
        return null;
      },

      drawGround(g, time) {
        // Sleepers first, then the two steel rails, on both routes.
        const railRun = (a: Pt, b: Pt, lit: number): void => {
          const len = dist(a.x, a.y, b.x, b.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
          for (let s = 6; s < len; s += 18) {
            const x = a.x + ux * s, y = a.y + uy * s;
            g.fillStyle(CAL.wood, 1);
            g.fillPoints([
              new Phaser.Geom.Point(x + nx * 13 - ux * 3, y + ny * 13 - uy * 3), new Phaser.Geom.Point(x + nx * 13 + ux * 3, y + ny * 13 + uy * 3),
              new Phaser.Geom.Point(x - nx * 13 + ux * 3, y - ny * 13 + uy * 3), new Phaser.Geom.Point(x - nx * 13 - ux * 3, y - ny * 13 - uy * 3),
            ], true, true);
          }
          for (const o of [-RAIL_GAUGE, RAIL_GAUGE]) {
            g.lineStyle(3, mixC(0x5a5660, CAL.lavaHot, lit), 1);
            g.lineBetween(a.x + nx * o, a.y + ny * o, b.x + nx * o, b.y + ny * o);
            g.lineStyle(1, 0xb8b4c0, 0.5);
            g.lineBetween(a.x + nx * o - 1, a.y + ny * o - 1, b.x + nx * o - 1, b.y + ny * o - 1);
          }
        };
        for (const r of routes) for (let i = 0; i < r.length - 1; i++) railRun(r[i], r[i + 1], 0);
        // Lamp-light on the rails ahead of each cart: the second of track it is about to cover.
        for (const c of carts) {
          for (let d = 20; d <= 280; d += 14) {
            const q = ahead(c, d);
            g.fillStyle(CAL.lavaHot, 0.22 * (1 - d / 300)); g.fillEllipse(q.x, q.y, 34, 22);
          }
        }
        // The west points: two switch blades, laid toward the route they will send the cart.
        const bladeA = points === 0 ? { x: L, y: M - 42 } : { x: L + 42, y: M };
        g.lineStyle(4, CAL.sulphur, 1); g.lineBetween(L, M + 4, bladeA.x, bladeA.y);
        g.fillStyle(CAL.sulphurDark, 1); g.fillCircle(L, M, 7);
        // The lever: a stand, a quadrant notched for both throws, the handle laid over.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(LEVER.x, LEVER.y + 12, 44, 14);
        g.fillStyle(CAL.iron, 1); g.fillRect(LEVER.x - 14, LEVER.y - 2, 28, 14);
        g.lineStyle(2, CAL.basaltLit, 1);
        g.beginPath(); g.arc(LEVER.x, LEVER.y, 18, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
        const throwK = Phaser.Math.Clamp((time - flippedAt) / 160, 0, 1);
        const toA = points === 0 ? -0.5 : 0.5, fromA = -toA;
        const ang = -Math.PI / 2 + fromA + (toA - fromA) * throwK;
        const hx = LEVER.x + Math.cos(ang) * 30, hy = LEVER.y + Math.sin(ang) * 30;
        g.lineStyle(4, mixC(CAL.iron, 0xffffff, 0.25), 1); g.lineBetween(LEVER.x, LEVER.y + 2, hx, hy);
        g.fillStyle(points === 0 ? CAL.ash : CAL.lava, 1); g.fillCircle(hx, hy, 5);
      },

      drawAir(g, time) {
        for (const c of carts) {
          const p = at(c.route, c.s);
          const ang = Math.atan2(p.dy, p.dx);
          const cs = Math.cos(ang), sn = Math.sin(ang);
          const tr = (lx: number, ly: number): Phaser.Geom.Point => new Phaser.Geom.Point(p.x + lx * cs - ly * sn, p.y + lx * sn + ly * cs);
          // Shadow, wheels, then the riveted iron tub heaped with black glass.
          g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + 4, p.y + 8, 64, 30);
          g.fillStyle(0x15131a, 1);
          for (const [wx, wy] of [[-16, -14], [16, -14], [-16, 14], [16, 14]]) { const q = tr(wx, wy); g.fillCircle(q.x, q.y, 6); }
          g.fillStyle(CAL.iron, 1); g.fillPoints([tr(-26, -15), tr(26, -15), tr(26, 15), tr(-26, 15)], true, true);
          g.fillStyle(mixC(CAL.iron, 0xffffff, 0.15), 1); g.fillPoints([tr(-22, -11), tr(22, -11), tr(22, 11), tr(-22, 11)], true, true);
          for (const [ox, oy, r] of [[-10, -3, 8], [4, 4, 9], [12, -5, 7], [-4, 6, 6]]) {
            const q = tr(ox, oy);
            g.fillStyle(CAL.obsidian, 1); g.fillCircle(q.x, q.y - 4, r);
            g.fillStyle(CAL.glassGleam, 0.5); g.fillCircle(q.x - 2, q.y - 7, r * 0.3);
          }
          for (const [rx, ry] of [[-24, -13], [24, -13], [-24, 13], [24, 13]]) { const q = tr(rx, ry); g.fillStyle(CAL.basaltLit, 1); g.fillCircle(q.x, q.y, 1.6); }
          // Its lamp, swinging a little, and sparks off the wheels.
          const lamp = tr(30, 0);
          g.fillStyle(CAL.lavaHot, 0.9); g.fillCircle(lamp.x, lamp.y, 4.5);
          g.fillStyle(CAL.lavaHot, 0.15); g.fillCircle(lamp.x, lamp.y, 14 + Math.sin(time / 90) * 2);
          for (let k = 0; k < 3; k++) {
            const q = tr(-26 - k * 6, (k % 2 ? 14 : -14));
            g.fillStyle(CAL.lavaLit, 0.8 - k * 0.25); g.fillCircle(q.x, q.y, 1.6);
          }
        }
      },

      drawHud(g) {
        // A pointsman's track diagram: the loop, the spur, the route set, the carts on it.
        const x0 = W - 104, y0 = top + 10, sx = 84 / (R - L), sy = 50 / (B - T);
        const m = (p: Pt): Pt => ({ x: x0 + (p.x - L) * sx, y: y0 + (p.y - T) * sy });
        g.fillStyle(0x000000, 0.55); g.fillRect(x0 - 8, y0 - 6, 100, 64);
        routes.forEach((r, ri) => {
          g.lineStyle(ri === points ? 3 : 1.5, ri === points ? CAL.sulphur : 0x5a5660, 1);
          for (let i = 0; i < r.length - 1; i++) { const a = m(r[i]), b = m(r[i + 1]); g.lineBetween(a.x, a.y, b.x, b.y); }
        });
        for (const c of carts) { const q = m(at(c.route, c.s)); g.fillStyle(CAL.lavaHot, 1); g.fillCircle(q.x, q.y, 3.5); }
      },

      destroy() { lever.remove(); carts.length = 0; },
    };
  },
};
