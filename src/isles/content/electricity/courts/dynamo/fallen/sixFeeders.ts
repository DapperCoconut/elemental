import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { bolt, cablePoints, sparks, switchCabinet } from '../art';
import { ARC, BRASS, BRASS_DARK, BRASS_LIT, COPPER_DARK, IRON, IRON_DARK, IRON_LIT, OFF_RED, RIVET, SPARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * Six Feeders — Board-Attendant Ignatz Brume of the Generator Hall switchboard. Every cable that
 * leaves the station passes through a knife switch on his board, and in the King's telling it was
 * Ignatz who decided, each night, which street's feeder stayed closed and which was thrown open.
 *
 * Six feeder switches stand round the yard, and each fighter has a circuit. Strike an open switch
 * and it closes onto *your* circuit: a feeder cable runs from it to you, and every feeder you carry
 * makes your cooldowns run faster and your feet lighter. Strike a closed switch and you throw it
 * over to the *other* circuit — steal his, or hand him yours. But each circuit's breaker is rated
 * for three feeders: a fourth and it trips. The tripping circuit's breaker rings a warning, and
 * then every feeder on it discharges down its line — straight from its switch to where the victim
 * stood when it tripped — burning anyone across a line, and all of that fighter's switches fall
 * open. While the breaker rings, throw one of your own feeders away (onto him) and it holds.
 *
 * So the yard is a greed game with a lever: run hot at three, and when he runs hot, throw one of
 * your own onto him. Halfway down the station is overdrawn and the breakers are rated for two.
 */

const ID = fallenId('dynamo', 'six-feeders');
const SW_R = 26;
const RING_MS = 950;
const LANE_HW = 22;
const LANE_DMG = 13;

type Side = 'player' | 'npc';
interface Feeder { x: number; y: number; owner: Side | null; lockUntil: number; t: StrikeTarget | null; flipAt: number }
interface Trip { victim: Side; at: number; fireAt: number; to: Pt }
interface Lane { a: Pt; b: Pt; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const feeders: Feeder[] = [
    { x: 170, y: top + 54 }, { x: W / 2, y: top + 54 }, { x: W - 170, y: top + 54 },
    { x: 170, y: H - 40 }, { x: W / 2, y: H - 40 }, { x: W - 170, y: H - 40 },
  ].map((p) => ({ ...p, owner: null, lockUntil: 0, t: null, flipAt: -9999 }));
  let rated = 3;
  let trip: Trip | null = null;
  const lanes: Lane[] = [];

  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const otherSide = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
  const load = (s: Side) => feeders.filter((f) => f.owner === s).length;
  const tint = (s: Side | null) => (s === 'player' ? ARC : s === 'npc' ? OFF_RED : 0x5a5e66);

  function checkTrips(time: number): void {
    if (trip) return;
    for (const s of ['player', 'npc'] as Side[]) {
      if (load(s) <= rated) continue;
      const f = fighter(s);
      trip = { victim: s, at: time, fireAt: time + RING_MS, to: { x: f.x, y: f.y } };
      ctx.float(f.x, f.y - 56, s === 'player' ? 'YOUR BREAKER RINGS' : 'HIS BREAKER RINGS', s === 'player' ? '#ffb0a0' : '#bff0ff');
      ctx.sfx('countdown-tick');
      return;
    }
  }

  function fire(t: Trip, time: number): void {
    const mine = feeders.filter((f) => f.owner === t.victim);
    const hurt = new Map<Fighter, number>();
    for (const sw of mine) {
      const dx = t.to.x - sw.x, dy = t.to.y - sw.y, l = Math.hypot(dx, dy) || 1;
      const b = { x: t.to.x + (dx / l) * 90, y: t.to.y + (dy / l) * 90 };
      lanes.push({ a: { x: sw.x, y: sw.y - 20 }, b, at: time });
      for (const f of [player, npc]) {
        if (alive(f) && segDist(f.x, f.y, sw.x, sw.y, b.x, b.y) < LANE_HW + 18) hurt.set(f, (hurt.get(f) ?? 0) + 1);
      }
      sw.owner = null; sw.flipAt = time;
    }
    for (const [f, n] of hurt) {
      const dmg = LANE_DMG * n;
      if (f === player) tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(f, dmg, f.x, f.y);
    }
    ctx.sfx('explosion-medium');
    ctx.flash(t.to.x, t.to.y, ARC);
  }

  for (const sw of feeders) {
    sw.t = ctx.target({
      x: sw.x, y: sw.y - 24, r: SW_R,
      onStruck(by) {
        if (tk.now < sw.lockUntil) return;
        sw.lockUntil = tk.now + 650;
        sw.owner = sw.owner === null ? by : otherSide(sw.owner);
        sw.flipAt = tk.now;
        ctx.sfx(sw.owner === by ? 'clang' : 'trap-snap');
        // Throwing a feeder off a ringing breaker saves it.
        if (trip && load(trip.victim) <= rated) {
          const v = fighter(trip.victim);
          ctx.float(v.x, v.y - 56, 'HELD', '#ffe2a8');
          trip = null;
        }
        checkTrips(tk.now);
      },
    });
  }

  return {
    update(time) {
      if (rated === 3 && npc.hp < npc.maxHp * 0.5) {
        rated = 2;
        ctx.banner('The station is overdrawn — every breaker is rated for two feeders', '#ffe2a8');
        ctx.sfx('boss-phase');
        checkTrips(time);
      }
      if (trip) {
        if (load(trip.victim) <= rated) trip = null;
        else if (time >= trip.fireAt) { fire(trip, time); trip = null; checkTrips(time); }
      }
      for (let i = lanes.length - 1; i >= 0; i--) if (time - lanes[i].at > 450) lanes.splice(i, 1);
    },

    playerCooldownRate: () => 1 + 0.3 * load('player'),
    npcCooldownRate: () => 1 + 0.3 * load('npc'),
    playerSpeedMult: () => 1 + 0.07 * load('player'),
    npcSpeedMult: () => 1 + 0.07 * load('npc'),

    npcSeek() {
      if (!alive(player)) return null;
      const at = (sw: Feeder): Pt => ({ x: sw.x, y: sw.y + (sw.y < H / 2 ? 46 : -46) });
      const nearestOf = (list: Feeder[]) => list.sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y))[0];
      if (trip && trip.victim === 'npc') {
        const mine = nearestOf(feeders.filter((f) => f.owner === 'npc'));
        if (mine && dist(mine.x, mine.y, npc.x, npc.y) < 240) return at(mine);
      }
      if (trip) {
        // Off the lines that are about to fire: away from where they converge, sideways.
        const a = Math.atan2(npc.y - trip.to.y, npc.x - trip.to.x) + 0.9;
        return { x: clamp(npc.x + Math.cos(a) * 150, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 150, top + 60, H - 60) };
      }
      // He runs hot: throw one of mine onto him.
      if (load('player') >= rated) {
        const mine = nearestOf(feeders.filter((f) => f.owner === 'npc'));
        if (mine) return at(mine);
      }
      // Below the rating: take an open feeder, or steal one of his.
      if (load('npc') < rated) {
        const want = nearestOf(feeders.filter((f) => f.owner !== 'npc'));
        if (want) return at(want);
      }
      return null;
    },

    drawGround(g, time) {
      // Feeder cables from each closed switch to the fighter it feeds, slack on the setts.
      for (const sw of feeders) {
        if (!sw.owner) continue;
        const f = fighter(sw.owner);
        if (!alive(f)) continue;
        const pts = cablePoints({ x: sw.x, y: sw.y + 4 }, { x: f.x, y: f.y + 6 }, 18, 14);
        g.lineStyle(5, 0x07080a, 0.45);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y + 2); for (const p of pts.slice(1)) g.lineTo(p.x, p.y + 2); g.strokePath();
        g.lineStyle(3, COPPER_DARK, 0.9);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.strokePath();
        g.lineStyle(1.2, tint(sw.owner), 0.7);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1); for (const p of pts.slice(1)) g.lineTo(p.x, p.y - 1); g.strokePath();
        const k = ((time / 700) + sw.x * 0.01) % 1;
        const q = pts[Math.floor(k * (pts.length - 1))];
        g.fillStyle(tint(sw.owner), 0.9); g.fillCircle(q.x, q.y, 2.5);
      }
      // A ringing breaker: the lines its feeders will discharge down, drawn as they will fire.
      if (trip) {
        const k = clamp((time - trip.at) / RING_MS, 0, 1);
        for (const sw of feeders.filter((f) => f.owner === trip?.victim)) {
          const dx = trip.to.x - sw.x, dy = trip.to.y - sw.y, l = Math.hypot(dx, dy) || 1;
          const bx = trip.to.x + (dx / l) * 90, by = trip.to.y + (dy / l) * 90;
          g.lineStyle(LANE_HW * 2, OFF_RED, 0.06 + k * 0.14); g.lineBetween(sw.x, sw.y, bx, by);
          g.lineStyle(1.5, OFF_RED, 0.4 + k * 0.5); g.lineBetween(sw.x, sw.y, sw.x + (bx - sw.x) * k, sw.y + (by - sw.y) * k);
        }
        g.lineStyle(2, OFF_RED, 0.8); g.strokeCircle(trip.to.x, trip.to.y, 40 * (1 - k) + 12);
      }
      for (const sw of feeders) drawFeeder(g, sw, time);
    },

    drawAir(g, time) {
      for (const l of lanes) {
        const k = clamp((time - l.at) / 450, 0, 1);
        bolt(g, l.a.x, l.a.y, l.b.x, l.b.y, Math.floor(time / 40) + Math.round(l.a.x), 6 * (1 - k) + 1, ARC, 1 - k, 18);
        sparks(g, l.b.x, l.b.y, 22, time, 6, SPARK);
      }
    },

    drawHud(g, time) {
      drawBreaker(g, 24, top + 8, load('player'), rated, ARC, trip?.victim === 'player', time);
      drawBreaker(g, W - 24 - 96, top + 8, load('npc'), rated, OFF_RED, trip?.victim === 'npc', time);
    },

    destroy() { for (const sw of feeders) sw.t?.remove(); },
  };

  /** One feeder: a tall switch cabinet on a slab, its owner's tag, the blades flashing as they throw. */
  function drawFeeder(g: G, sw: Feeder, time: number): void {
    shadow(g, sw.x, sw.y + 4, 60, 16, 0.3);
    g.fillStyle(0x34363c, 1); g.fillRoundedRect(sw.x - 28, sw.y - 4, 56, 12, 3);
    g.fillStyle(0x45484f, 1); g.fillRect(sw.x - 28, sw.y - 4, 56, 3);
    switchCabinet(g, sw.x, sw.y, 1.35, sw.owner !== null, sw.owner ? 0.8 : 0);
    // Owner tag: a painted enamel plate under the cabinet.
    g.fillStyle(tint(sw.owner), 1); g.fillRoundedRect(sw.x - 12, sw.y - 2, 24, 7, 2);
    g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(sw.x - 12, sw.y - 2, 24, 7, 2);
    for (const k of [-8, 8]) { g.fillStyle(RIVET, 1); g.fillCircle(sw.x + k, sw.y + 1.5, 1.2); }
    const since = time - sw.flipAt;
    if (since < 300) {
      sparks(g, sw.x, sw.y - 34, 16, time, 8, SPARK);
      glow(g, sw.x, sw.y - 30, 36, ARC, 0.1 * (1 - since / 300), 3);
    }
  }
}

/** A breaker panel on the HUD: a slate board, a pip per feeder carried, the rating marked in brass. */
function drawBreaker(g: G, x: number, y: number, n: number, rated: number, col: number, ringing: boolean, time: number): void {
  const w = 96, h = 26;
  g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x, y, w, h, 5);
  g.fillStyle(IRON, 1); g.fillRect(x + 3, y + 3, w - 6, 3);
  for (let i = 0; i < 4; i++) {
    const px = x + 14 + i * 18, py = y + 15;
    const over = i >= rated;
    g.fillStyle(over ? 0x2a1010 : 0x14161a, 1); g.fillCircle(px, py, 6);
    if (i < n) { g.fillStyle(over ? OFF_RED : col, 1); g.fillCircle(px, py, 4.5); }
    g.lineStyle(1, over ? OFF_RED : IRON_LIT, 0.7); g.strokeCircle(px, py, 6);
  }
  // The rating mark: a brass bar after the last safe pip.
  const rx = x + 14 + rated * 18 - 9;
  g.fillStyle(BRASS, 1); g.fillRect(rx - 1, y + 5, 2, h - 8);
  g.fillStyle(BRASS_LIT, 1); g.fillTriangle(rx - 4, y + 4, rx + 4, y + 4, rx, y + 8);
  if (ringing && Math.floor(time / 110) % 2 === 0) {
    g.lineStyle(2, OFF_RED, 1); g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
  }
}

export const FALLEN_SIX_FEEDERS: GimmickDef = {
  id: ID,
  rules: 'Strike a feeder switch to close it onto you (faster cooldowns) or throw it onto him. Over three, a circuit trips and fires at its owner.',
  make,
};
