import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { junctionLever, oreCart, railTrack } from '../art';
import { HEAT_ORANGE, HEAT_YELLOW, IRON_SHEEN } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Ore Carts — Railhand Tilda.
 *
 * A loop of rail runs round the yard with a cross line through its middle, and loaded ore carts
 * race round it, faster every lap. Whoever is on the rails when a cart comes through is bowled
 * over: hurt, flung off the track and stunned a moment. The rails glow ahead of every cart, so you
 * can see where it is going.
 *
 * Two junction levers stand at the ends of the cross line. Strike one to throw it, and every
 * cart reaching that junction turns down the cross line instead of going round — which
 * is how Tilda puts a cart through the middle of the yard where you are standing. But the levers
 * are nobody's: throw one yourself and send the next cart through her.
 */

/** The loop's corners (clockwise) and the cross line's y. */
const X0 = 110, X1 = 850, Y0 = 170, Y1 = 590, YC = 380;
const TOP_LEN = X1 - X0, SIDE_LEN = Y1 - Y0;
const PERIM = 2 * (TOP_LEN + SIDE_LEN);
/** Loop distance of the right junction (down the right side) and the left (up the left side). */
const J_R = TOP_LEN + (YC - Y0);
const J_L = 2 * TOP_LEN + SIDE_LEN + (Y1 - YC);
const CROSS_LEN = X1 - X0;

const CART_R = 30;
const HIT_DMG = 14;
const HIT_PUSH = 86;
const HIT_STUN = 450;
const LEVER_CD = 1400;
const LEVER_R = 26;

interface Track { mode: 'loop' | 'cross'; s: number; dir: 1 | -1 }
interface Cart extends Track { speed: number; laps: number; hitAt: Map<Fighter, number>; bornAt: number }
interface Lever { at: Pt; junction: number; dir: 1 | -1; cross: boolean; cdUntil: number; flash: number }

function loopPt(s: number): { x: number; y: number; a: number } {
  let d = ((s % PERIM) + PERIM) % PERIM;
  if (d < TOP_LEN) return { x: X0 + d, y: Y0, a: 0 };
  d -= TOP_LEN;
  if (d < SIDE_LEN) return { x: X1, y: Y0 + d, a: Math.PI / 2 };
  d -= SIDE_LEN;
  if (d < TOP_LEN) return { x: X1 - d, y: Y1, a: Math.PI };
  d -= TOP_LEN;
  return { x: X0, y: Y1 - d, a: -Math.PI / 2 };
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { tk, player, npc, rng } = ctx;
  const levers: Lever[] = [
    // The left lever turns carts coming up the left side east along the cross line, and the right
    // one carts coming down the right side west.
    { at: { x: 58, y: YC + 64 }, junction: J_L, dir: 1, cross: false, cdUntil: 0, flash: 0 },
    { at: { x: 902, y: YC - 64 }, junction: J_R, dir: -1, cross: false, cdUntil: 0, flash: 0 },
  ];
  const carts: Cart[] = [];
  const nCarts = ctx.hard ? 3 : 2;
  const baseSpeed = ctx.hard ? 280 : 245;
  let started = false;

  /** A blow on a lever throws it (once per LEVER_CD); shots fly on past the handle. */
  function throwLever(l: Lever): void {
    const time = ctx.scene.time.now;
    if (time < l.cdUntil) return;
    l.cross = !l.cross;
    l.cdUntil = time + LEVER_CD;
    l.flash = time;
    ctx.float(l.at.x, l.at.y - 44, l.cross ? 'TO THE CROSS LINE' : 'ROUND THE LOOP', '#ffc23a');
    ctx.sfx('gear-turn');
  }
  const handles = levers.map((l) => ctx.target({ x: l.at.x, y: l.at.y - 14, r: LEVER_R, passThrough: true, onStruck: () => throwLever(l) }));

  const crossed = (s0: number, s1: number, j: number) => (s0 < j && j <= s1) || (s0 < j + PERIM && j + PERIM <= s1);

  /** Where a cart would be after `d` more pixels of rail, following the levers as they stand now. */
  function step(c: Track, d: number, depth = 0): Track {
    if (depth > 4) return c;
    if (c.mode === 'loop') {
      const s1 = c.s + d;
      for (const l of levers) {
        if (l.cross && crossed(c.s, s1, l.junction)) {
          const over = ((s1 - l.junction) % PERIM + PERIM) % PERIM;
          return step({ mode: 'cross', s: 0, dir: l.dir }, over, depth + 1);
        }
      }
      return { mode: 'loop', s: ((s1 % PERIM) + PERIM) % PERIM, dir: c.dir };
    }
    const s1 = c.s + d;
    if (s1 >= CROSS_LEN) return step({ mode: 'loop', s: c.dir > 0 ? J_R : J_L, dir: c.dir }, s1 - CROSS_LEN, depth + 1);
    return { mode: 'cross', s: s1, dir: c.dir };
  }

  function pos(c: Track): { x: number; y: number; a: number } {
    if (c.mode === 'loop') return loopPt(c.s);
    return { x: c.dir > 0 ? X0 + c.s : X1 - c.s, y: YC, a: c.dir > 0 ? 0 : Math.PI };
  }

  /** Distance from a point to the nearest rail. */
  function railDist(x: number, y: number): number {
    return Math.min(
      segDist(x, y, X0, Y0, X1, Y0), segDist(x, y, X1, Y0, X1, Y1), segDist(x, y, X1, Y1, X0, Y1),
      segDist(x, y, X0, Y1, X0, Y0), segDist(x, y, X0, YC, X1, YC),
    );
  }

  function bowl(c: Cart, f: Fighter, time: number): void {
    const p = pos(c);
    const nx = -Math.sin(p.a), ny = Math.cos(p.a);
    const side = (f.x - p.x) * nx + (f.y - p.y) * ny >= 0 ? 1 : -1;
    if (f === player) tk.hitPlayer(HIT_DMG, f.x, f.y);
    else ctx.hit(f, HIT_DMG + 4, f.x, f.y);
    ctx.stun(f, HIT_STUN);
    ctx.nudge(f, nx * side * HIT_PUSH + Math.cos(p.a) * 30, ny * side * HIT_PUSH + Math.sin(p.a) * 30);
    ctx.float(f.x, f.y - 46, 'BOWLED OVER', '#ffc23a');
    ctx.flash(f.x, f.y, HEAT_YELLOW);
    ctx.sfx('hit-heavy');
    c.hitAt.set(f, time);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < nCarts; i++) {
          carts.push({ mode: 'loop', s: (PERIM * i) / nCarts + 180, dir: 1, speed: baseSpeed * (0.9 + rng() * 0.15), laps: 0, hitAt: new Map(), bornAt: time });
        }
        ctx.sfx('train-horn');
      }

      // The carts.
      for (const c of carts) {
        const before = c.mode;
        const next = step(c, c.speed * dt);
        if (next.mode === 'loop' && c.mode === 'loop' && next.s < c.s) {
          c.laps++;
          c.speed = Math.min(baseSpeed * 1.45, c.speed + 14);
        }
        c.mode = next.mode; c.s = next.s; c.dir = next.dir;
        if (before === 'loop' && c.mode === 'cross') ctx.sfx('train-horn');
        const p = pos(c);
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          if (time - (c.hitAt.get(f) ?? -9999) < 900) continue;
          if (dist(f.x, f.y, p.x, p.y) < CART_R) bowl(c, f, time);
        }
      }
    },

    destroy() { for (const h of handles) h.remove(); },

    npcSeek() {
      // Off the rails if a cart is coming.
      const onRail = railDist(npc.x, npc.y) < 46;
      if (onRail) {
        for (const c of carts) {
          for (let d = 0; d <= 300; d += 30) {
            const p = pos(step(c, d));
            if (dist(p.x, p.y, npc.x, npc.y) < 50) {
              // Step to whichever side of the rail is nearer open ground.
              const ox = npc.x < (X0 + X1) / 2 ? 1 : -1;
              const oy = Math.abs(npc.y - YC) < 40 ? (player.y < YC ? 1 : -1) : npc.y < (Y0 + Y1) / 2 ? 1 : -1;
              const vertical = Math.abs(p.a) > 1 && Math.abs(p.a) < 2.2;
              return { x: clamp(npc.x + (vertical ? ox * 90 : 0), 50, tk.W - 50), y: clamp(npc.y + (vertical ? 0 : oy * 90), ctx.top + 40, tk.H - 40) };
            }
          }
        }
      }
      // Strike the lever that sends the next cart over the player.
      const pOnCross = Math.abs(player.y - YC) < 50 && player.x > X0 && player.x < X1;
      for (const l of levers) {
        const want = pOnCross;
        if (l.cross === want) continue;
        // Only worth it if a cart will reach that junction soon.
        const soon = carts.some((c) => c.mode === 'loop' && ((l.junction - c.s + PERIM) % PERIM) < 520);
        if (soon && dist(npc.x, npc.y, l.at.x, l.at.y) < 520) return { x: l.at.x, y: l.at.y };
      }
      // Otherwise keep at range, off the rails, inside the loop's quarters.
      const qx = player.x < tk.W / 2 ? 700 : 260;
      const qy = player.y < YC ? 490 : 270;
      return { x: qx, y: qy };
    },

    drawGround(g, time) {
      // The rails: the loop and the cross line.
      railTrack(g, { x: X0, y: Y0 }, { x: X1, y: Y0 });
      railTrack(g, { x: X1, y: Y0 }, { x: X1, y: Y1 });
      railTrack(g, { x: X1, y: Y1 }, { x: X0, y: Y1 });
      railTrack(g, { x: X0, y: Y1 }, { x: X0, y: Y0 });
      railTrack(g, { x: X0, y: YC }, { x: X1, y: YC });
      // Switch points: the live route shown bright.
      for (const l of levers) {
        const jx = l.junction === J_R ? X1 : X0;
        const into = l.cross ? { x: jx + (l.dir > 0 ? 50 : -50), y: YC } : { x: jx, y: YC + (l.dir > 0 ? -50 : 50) };
        g.lineStyle(5, HEAT_YELLOW, 0.5 + Math.sin(time / 160) * 0.2); g.lineBetween(jx, YC, into.x, into.y);
        g.fillStyle(IRON_SHEEN, 1); g.fillCircle(jx, YC, 6);
      }
      // The rails glowing ahead of each cart.
      for (const c of carts) {
        for (let d = 20; d <= 240; d += 20) {
          const p = pos(step(c, d));
          g.fillStyle(HEAT_YELLOW, 0.35 * (1 - d / 260)); g.fillCircle(p.x, p.y, 14);
        }
      }
    },

    drawAir(g, time) {
      for (const l of levers) junctionLever(g, l.at.x, l.at.y, l.cross, time - l.flash < 600 ? 1 - (time - l.flash) / 600 : 0);
      for (const c of carts) {
        const p = pos(c);
        // Sparks off the wheels at speed.
        for (let i = 0; i < 3; i++) {
          const ph = (time / 120 + i / 3) % 1;
          g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_ORANGE, 1 - ph);
          g.fillCircle(p.x - Math.cos(p.a) * (18 + ph * 20) + (i - 1) * 6, p.y - Math.sin(p.a) * (18 + ph * 20) + 8, 1.5);
        }
        oreCart(g, p.x, p.y, 1.15, p.a, 'ore');
        glow(g, p.x + Math.cos(p.a) * 26, p.y + Math.sin(p.a) * 26 - 6, 30, HEAT_YELLOW, 0.035, 3);
      }
    },
  };
}

export const ORE_CARTS: GimmickDef = {
  id: 'forge-ore-carts',
  rules: 'Ore carts race the rails, faster every lap, and bowl over whoever is on them. Strike a junction lever to throw it and send carts down the cross line.',
  make,
};
