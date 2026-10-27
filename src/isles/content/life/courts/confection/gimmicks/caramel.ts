import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { BRITTLE, CARAMEL, CARAMEL_DARK, SALT_LIT, crackle } from '../art';

/**
 * Caramel — Cook Butterscotch's kettles on the bank of the Treacle Pool.
 *
 * A row of copper kettles hangs on a beam over the yard, one over each lane of the floor. When
 * Butterscotch tips one, hot caramel pours down that lane from top to bottom — it burns whoever
 * is in it and drags at their feet. Then it sets: glossy for a moment, then hard, pale, crackled
 * brittle that you can walk on as well as any floor.
 *
 * Brittle does not take a knock. Anyone standing on it when they are *hit* goes through it, into
 * the hot caramel still under the crust — held fast and scalded, and the hole stays molten a
 * moment for anyone else.
 *
 * Butterscotch pours where you are and likes you on her brittle where she can reach you. She
 * steps off it when you come close. Catch her on it anyway — and land the blow.
 */

const LANES = 8;
const WARN_MS = 1100;
const POUR_MS = 1600;
const SET_MS = 800;
const BRITTLE_MS = 7500;
const POUR_EVERY_MS = 3200;
const POUR_EVERY_HARD_MS = 2600;
const MAX_POURING = 2;
const TICK_MS = 500;
const BURN = 6;
const BURN_HARD = 7;
const POUR_SLOW = 0.6;
const SET_SLOW = 0.75;
const HOLE_R = 58;
const HOLE_MS = 1600;
const FALL_DAMAGE = 12;
const FALL_HARD_DAMAGE = 15;
const FALL_ROOT_MS = 900;
const HOLE_BURN = 4;

type LaneState = 'idle' | 'warn' | 'pour' | 'set' | 'brittle';
interface Lane { state: LaneState; at: number; seed: number }
interface Hole { x: number; y: number; at: number; lane: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const lw = W / LANES;
  const pourEvery = ctx.hard ? POUR_EVERY_HARD_MS : POUR_EVERY_MS;
  const burn = ctx.hard ? BURN_HARD : BURN;
  const fallDamage = ctx.hard ? FALL_HARD_DAMAGE : FALL_DAMAGE;

  const lanes: Lane[] = Array.from({ length: LANES }, () => ({ state: 'idle' as LaneState, at: 0, seed: rng() * 100 }));
  let holes: Hole[] = [];
  let nextPour = 2000;
  let announced = false;
  let selfHit = false;
  const lastTick = new Map<string, number>();

  const laneOf = (x: number): number => Math.max(0, Math.min(LANES - 1, Math.floor(x / lw)));
  const stateAt = (f: Fighter): LaneState => lanes[laneOf(f.x)].state;
  const inHole = (f: Fighter): Hole | null => holes.find((h) => Math.hypot(f.x - h.x, f.y + 10 - h.y) < HOLE_R) ?? null;

  const hitSelf = (f: Fighter, n: number): void => {
    selfHit = true;
    try { ctx.hit(f, n, f.x, f.y); } finally { selfHit = false; }
  };
  const tick = (key: string, time: number): boolean => {
    if (time - (lastTick.get(key) ?? -9999) < TICK_MS) return false;
    lastTick.set(key, time);
    return true;
  };

  /** Advance a lane through its pour. */
  const step = (l: Lane, time: number): void => {
    if (l.state === 'warn' && time - l.at >= WARN_MS) { l.state = 'pour'; l.at = time; ctx.sfx('sizzle'); }
    else if (l.state === 'pour' && time - l.at >= POUR_MS) { l.state = 'set'; l.at = time; }
    else if (l.state === 'set' && time - l.at >= SET_MS) { l.state = 'brittle'; l.at = time; ctx.sfx('crystal-chime'); }
    else if (l.state === 'brittle' && time - l.at >= BRITTLE_MS) { l.state = 'idle'; l.at = time; }
  };

  /** A hit on someone standing on brittle sends them through it. */
  const breakThrough = (f: Fighter): void => {
    if (selfHit || !f.active || f.hp <= 0) return;
    const li = laneOf(f.x);
    if (lanes[li].state !== 'brittle' || inHole(f)) return;
    const now = ctx.scene.time.now;
    holes.push({ x: f.x, y: f.y + 10, at: now, lane: li });
    hitSelf(f, fallDamage);
    ctx.root(f, FALL_ROOT_MS);
    ctx.sfx('ice-shatter');
    ctx.float(f.x, f.y - 50, f === ctx.player ? 'THROUGH THE BRITTLE!' : 'SHE WENT THROUGH!', f === ctx.player ? '#ffb070' : '#9df5c8');
    ctx.scene.cameras.main.shake(110, 0.004);
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('MIND THE POUR', '#ffcf80'); }
      for (const l of lanes) step(l, time);

      // Butterscotch tips the kettle over the player's lane (or one beside it).
      if (time >= nextPour) {
        nextPour = time + pourEvery;
        const pouring = lanes.filter((l) => l.state === 'warn' || l.state === 'pour').length;
        if (pouring < MAX_POURING) {
          const pl = laneOf(ctx.player.x);
          const offs = rng() < 0.6 ? [0, -1, 1] : [rng() < 0.5 ? -1 : 1, 0];
          for (const o of offs) {
            const li = pl + o;
            if (li < 0 || li >= LANES) continue;
            const l = lanes[li];
            if (l.state !== 'idle' && l.state !== 'brittle') continue;
            l.state = 'warn'; l.at = time;
            ctx.sfx('beam-charge');
            break;
          }
        }
      }

      // Burns from the pour and from open holes.
      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        const key = f === ctx.player ? 'p' : 'n';
        if (stateAt(f) === 'pour' && tick(`${key}-pour`, time)) { hitSelf(f, burn); ctx.flash(f.x, f.y, CARAMEL); }
        const h = inHole(f);
        if (h && time - h.at > 200 && tick(`${key}-hole`, time)) hitSelf(f, HOLE_BURN);
      }
      holes = holes.filter((h) => time - h.at < HOLE_MS && lanes[h.lane].state === 'brittle');
    },

    onPlayerHurt() { breakThrough(ctx.player); },
    onNpcHurt() { breakThrough(ctx.npc); },

    playerSpeedMult() { const s = stateAt(ctx.player); return s === 'pour' ? POUR_SLOW : s === 'set' ? SET_SLOW : 1; },
    npcSpeedMult() { const s = stateAt(ctx.npc); return s === 'pour' ? POUR_SLOW : s === 'set' ? SET_SLOW : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const li = laneOf(n.x);
      const here = lanes[li].state;
      const safeLane = (avoidBrittle: boolean): number => {
        let best = li, bd = Infinity;
        for (let i = 0; i < LANES; i++) {
          const s = lanes[i].state;
          if (s === 'warn' || s === 'pour' || s === 'set' || (avoidBrittle && s === 'brittle')) continue;
          const d = Math.abs(i - li);
          if (d < bd) { bd = d; best = i; }
        }
        return best;
      };
      // Out of a lane that is about to pour (or pouring).
      if (here === 'warn' || here === 'pour') return { x: (safeLane(false) + 0.5) * lw, y: n.y };
      // Off the brittle when the player is close enough to strike her.
      if (here === 'brittle' && Math.hypot(p.x - n.x, p.y - n.y) < 320) return { x: (safeLane(true) + 0.5) * lw, y: n.y };
      // The player on brittle: go and land the blow.
      if (stateAt(p) === 'brittle' && !inHole(p)) return { x: p.x + (n.x < p.x ? -70 : 70), y: p.y };
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (let i = 0; i < LANES; i++) {
        const l = lanes[i];
        const x0 = i * lw;
        const k = (time - l.at);
        if (l.state === 'warn') {
          // The drip line: where the pour will run.
          const a = 0.1 + 0.15 * (k / WARN_MS);
          g.fillStyle(CARAMEL, a); g.fillRect(x0 + 4, top, lw - 8, H - top);
          g.lineStyle(2, CARAMEL, 0.5 + 0.4 * (k / WARN_MS));
          for (let y = top; y < H; y += 26) g.lineBetween(x0 + 6, y, x0 + 18, y + 8);
          for (let y = top; y < H; y += 26) g.lineBetween(x0 + lw - 6, y, x0 + lw - 18, y + 8);
        } else if (l.state === 'pour') {
          // The front runs down the lane; behind it, molten caramel with flowing bands.
          const front = top + Math.min(1, k / 380) * (H - top);
          g.fillStyle(CARAMEL_DARK, 0.95); g.fillRect(x0 + 2, top, lw - 4, front - top);
          g.fillStyle(CARAMEL, 0.95); g.fillRect(x0 + 6, top, lw - 12, front - top);
          for (let b = 0; b < 7; b++) {
            const by = top + ((b * 90 + t * 260) % (H - top));
            if (by > front) continue;
            g.fillStyle(lit(CARAMEL, 0.3), 0.5); g.fillEllipse(x0 + lw / 2 + Math.sin(by * 0.03 + l.seed) * 20, by, lw * 0.5, 10);
          }
          g.fillStyle(lit(CARAMEL, 0.5), 0.9); g.fillEllipse(x0 + lw / 2, front, lw - 10, 18);
          // Bubbles.
          for (let b = 0; b < 6; b++) {
            const ph = (t * 1.5 + b * 0.37 + l.seed) % 1;
            const bx = x0 + 14 + ((b * 37 + l.seed * 7) % (lw - 28)), by = top + 30 + ((b * 113) % (H - top - 60));
            if (by > front) continue;
            g.lineStyle(1.5, lit(CARAMEL, 0.4), 0.8 * (1 - ph)); g.strokeCircle(bx, by, 2 + ph * 6);
          }
        } else if (l.state === 'set') {
          g.fillStyle(dim(CARAMEL, 0.1), 0.95); g.fillRect(x0 + 2, top, lw - 4, H - top);
          g.fillStyle(0xffffff, 0.22); g.fillRect(x0 + 10, top, 10, H - top);
          g.fillStyle(0xffffff, 0.12); g.fillRect(x0 + 26, top, 4, H - top);
        } else if (l.state === 'brittle') {
          // Pale set brittle: crackled, nut-studded, salt-flaked; it dulls as it ages.
          const age = k / BRITTLE_MS;
          g.fillStyle(dim(BRITTLE, 0.25), 1); g.fillRect(x0 + 2, top, lw - 4, H - top);
          g.fillStyle(BRITTLE, 1); g.fillRect(x0 + 4, top, lw - 8, H - top);
          crackle(g, x0 + 4, top, lw - 8, H - top, Math.floor(l.seed), dim(BRITTLE, 0.4), 0.6, 14);
          for (let n = 0; n < 16; n++) {
            const nx = x0 + 12 + ((n * 53 + l.seed * 3) % (lw - 24)), ny = top + 20 + ((n * 97 + l.seed * 11) % (H - top - 40));
            g.fillStyle(dim(CARAMEL, 0.3), 0.9); g.fillEllipse(nx, ny, 7, 5);
            if (n % 3 === 0) { g.fillStyle(SALT_LIT, 0.9); g.fillRect(nx + 6, ny - 3, 2, 2); }
          }
          if (age > 0.8 && Math.floor(time / 200) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.35); g.strokeRect(x0 + 4, top, lw - 8, H - top); }
          g.fillStyle(0xffffff, 0.12); g.fillRect(x0 + 8, top, 6, H - top);
        }
      }
      // Holes through the brittle: molten caramel bubbling up through broken crust.
      for (const h of holes) {
        const k = (time - h.at) / HOLE_MS;
        g.fillStyle(CARAMEL_DARK, 1); g.fillEllipse(h.x, h.y, HOLE_R * 2, HOLE_R * 1.2);
        g.fillStyle(CARAMEL, 1); g.fillEllipse(h.x, h.y, HOLE_R * 1.7, HOLE_R * 0.95);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(BRITTLE, 1 - k * 0.5);
          g.fillTriangle(h.x + Math.cos(a) * HOLE_R * 0.95, h.y + Math.sin(a) * HOLE_R * 0.58, h.x + Math.cos(a + 0.3) * HOLE_R * 1.1, h.y + Math.sin(a + 0.3) * HOLE_R * 0.68, h.x + Math.cos(a + 0.15) * HOLE_R * 0.7, h.y + Math.sin(a + 0.15) * HOLE_R * 0.42);
        }
        const ph = (time / 300) % 1;
        g.lineStyle(2, lit(CARAMEL, 0.4), 1 - ph); g.strokeCircle(h.x + 8, h.y - 4, 3 + ph * 8);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The kettle beam across the top of the yard and a copper kettle over every lane.
      g.fillStyle(0x3a2418, 1); g.fillRect(0, top - 6, W, 10);
      for (let i = 0; i < LANES; i++) {
        const l = lanes[i];
        const cx = (i + 0.5) * lw;
        const tip = l.state === 'warn' ? Math.min(1, (time - l.at) / WARN_MS) * 0.9 : l.state === 'pour' ? 0.9 : 0;
        const ky = top + 14;
        g.lineStyle(2, 0x2a1a10, 1); g.lineBetween(cx, top - 2, cx, ky - 10);
        g.fillStyle(dim(0xc8703a, 0.4), 1); g.fillEllipse(cx + tip * 4, ky + 1, 34, 24);
        g.fillStyle(0xc8703a, 1); g.fillEllipse(cx + tip * 4, ky, 32, 22);
        g.fillStyle(lit(0xc8703a, 0.4), 1); g.fillEllipse(cx - 6 + tip * 4, ky - 4, 10, 6);
        // The spout, tipping down as it pours.
        const sx = cx + 14 + tip * 4, sy = ky + 2 + tip * 8;
        g.lineStyle(5, dim(0xc8703a, 0.2), 1); g.lineBetween(cx + 10, ky, sx, sy);
        if (l.state === 'pour') {
          const wob = Math.sin(t * 20 + i) * 2;
          g.lineStyle(7, CARAMEL, 1); g.lineBetween(sx, sy, cx + wob, top + 70);
          g.lineStyle(2, lit(CARAMEL, 0.5), 1); g.lineBetween(sx - 1, sy, cx - 2 + wob, top + 70);
        } else if (l.state === 'warn') {
          const d = ((time - l.at) / 180) % 1;
          g.fillStyle(CARAMEL, 1); g.fillCircle(sx, sy + d * 30, 3);
        }
        // Fire under the kettle.
        if (l.state === 'warn' || l.state === 'pour') {
          for (let f = 0; f < 3; f++) {
            g.fillStyle(f % 2 ? 0xffb030 : 0xff6a20, 0.8);
            g.fillTriangle(cx - 8 + f * 8, ky + 14, cx - 4 + f * 8, ky + 14, cx - 6 + f * 8, ky + 4 - Math.abs(Math.sin(t * 12 + f)) * 6);
          }
        }
      }
      // A fighter in a hole sinks to the knees.
      for (const h of holes) {
        for (const f of [ctx.player, ctx.npc]) {
          if (Math.hypot(f.x - h.x, f.y + 10 - h.y) > HOLE_R * 0.6 || time - h.at > FALL_ROOT_MS) continue;
          g.fillStyle(CARAMEL, 0.95); g.fillEllipse(f.x, f.y + 12, 46, 18);
          g.fillStyle(lit(CARAMEL, 0.3), 0.8); g.fillEllipse(f.x - 6, f.y + 9, 16, 5);
        }
      }
    },
  };
}

export const CARAMEL_POUR: GimmickDef = {
  id: 'confection-caramel',
  rules: 'Hot caramel pours down a lane (it burns), then sets into BRITTLE. Anyone hit while standing on brittle goes through into the hot caramel.',
  make,
};
