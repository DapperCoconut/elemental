import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, COPPER_DARK, FOE_C, HOT, HOT_LIT, IRON, IRON_DARK, MINE_C, REDLINE, SOOT,
  clamp, dist, frameClock, rivets,
} from '../util';

/**
 * Hot Rivets — Rivet-Boss Clinker Hale heats the rivets that hold the Great Boiler shut, and in
 * the King's telling his crew riveted the bunkhouse doors closed on the strike's first night.
 *
 * A rivet forge on the north wall pitches white-hot rivets in high arcs. Each one is aimed to land
 * *near* a fighter, and its mark on the floor is a catch-can ringed by a splash band: anyone in the
 * band when it lands is spattered, but whoever stands in the can **catches** it — and a caught
 * rivet is flung straight back at their opponent. So every pitch asks the same question: step in
 * and catch, or step clear. Past half the forge runs hot: rivets come two at a time, and the ones
 * nobody catches lie glowing on the floor and burn whoever walks them.
 */

const ID = fallenId('boilerworks', 'hot-rivets');
const FLIGHT_MS = 1350;
const CATCH_R = 26;
const SPLASH_R = 86;

type Side = 'player' | 'npc';
interface Rivet { from: Pt; to: Pt; at: number; land: number; aim: Side }
interface Slag { x: number; y: number; until: number; nextTick: number }

function makeHotRivets(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const tick = frameClock();
  const forge: Pt = { x: W / 2, y: top + 34 };

  let rivetsInAir: Rivet[] = [];
  let slag: Slag[] = [];
  let nextPitch = ctx.scene.time.now + 1800;
  let aimNext: Side = 'player';
  let hot = false;
  const caught = { player: 0, npc: 0 };

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');

  /** Pick a landing spot 50–110 px off the aimed fighter, inside the floor. */
  const pitch = (aim: Side, time: number): void => {
    const f = fighterOf(aim);
    const a = rng() * Math.PI * 2, d = 50 + rng() * 60;
    const to = { x: clamp(f.x + Math.cos(a) * d, 50, W - 50), y: clamp(f.y + Math.sin(a) * d, top + 90, H - 40) };
    rivetsInAir.push({ from: { ...forge }, to, at: time, land: time + FLIGHT_MS, aim });
    ctx.sfx('whoosh');
  };

  const land = (r: Rivet, time: number): void => {
    let wasCaught = false;
    for (const s of ['player', 'npc'] as Side[]) {
      const f = fighterOf(s);
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, r.to.x, r.to.y);
      if (d < CATCH_R && !wasCaught) {
        wasCaught = true;
        caught[s]++;
        ctx.sfx('clang');
        ctx.float(f.x, f.y - 44, 'CAUGHT', s === 'player' ? '#9fe8ff' : '#ffb070');
        const foe = fighterOf(other(s));
        const ang = Math.atan2(foe.y - r.to.y, foe.x - r.to.x);
        ctx.tk.spawnBullet({
          x: r.to.x, y: r.to.y, angle: ang, speed: 430, damage: 15, r: 7, lifeMs: 2600,
          color: HOT_LIT, hits: s === 'player' ? [ctx.npc] : [ctx.player],
        });
      } else if (d < SPLASH_R) {
        ctx.hit(f, 13, f.x, f.y);
        const k = Math.max(1, d);
        ctx.nudge(f, ((f.x - r.to.x) / k) * 26, ((f.y - r.to.y) / k) * 26);
      }
    }
    ctx.flash(r.to.x, r.to.y, HOT_LIT);
    ctx.sfx(wasCaught ? 'hammer-forge' : 'sizzle');
    if (!wasCaught && hot) slag.push({ x: r.to.x, y: r.to.y, until: time + 4200, nextTick: time + 300 });
  };

  return {
    update(time) {
      tick(time);
      if (!hot && ctx.npc.hp < ctx.npc.maxHp * 0.55) {
        hot = true;
        ctx.banner('THE FORGE RUNS WHITE', '#ffd08a');
        ctx.sfx('inferno');
      }
      if (time >= nextPitch) {
        if (hot) { pitch('player', time); pitch('npc', time); nextPitch = time + 2300; }
        else { pitch(aimNext, time); aimNext = other(aimNext); nextPitch = time + 1650; }
      }
      const done = rivetsInAir.filter((r) => time >= r.land);
      rivetsInAir = rivetsInAir.filter((r) => time < r.land);
      for (const r of done) land(r, time);

      slag = slag.filter((s) => time < s.until);
      for (const s of slag) {
        if (time < s.nextTick) continue;
        s.nextTick = time + 450;
        for (const f of [ctx.player, ctx.npc]) {
          if (alive(f) && dist(f.x, f.y, s.x, s.y) < 30) ctx.hit(f, 5, f.x, f.y);
        }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const now = ctx.scene.time.now;
      // Catch whatever can be reached in time; otherwise step out of any splash band.
      let best: Pt | null = null, bestD = Infinity;
      for (const r of rivetsInAir) {
        const d = dist(n.x, n.y, r.to.x, r.to.y);
        const reach = ((r.land - now) / 1000) * 180;
        if (d < reach && d < bestD) { best = r.to; bestD = d; }
      }
      if (best) return best;
      for (const r of rivetsInAir) {
        const d = dist(n.x, n.y, r.to.x, r.to.y);
        if (d < SPLASH_R + 10) {
          const k = Math.max(1, d);
          return { x: clamp(r.to.x + ((n.x - r.to.x) / k) * (SPLASH_R + 50), 50, W - 50), y: clamp(r.to.y + ((n.y - r.to.y) / k) * (SPLASH_R + 50), top + 40, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      drawForge(g, forge.x, forge.y, hot, time);
      // Slag: rivets nobody caught, cooling from white through cherry to black.
      for (const s of slag) {
        const k = clamp((s.until - time) / 4200, 0, 1);
        g.fillStyle(HOT, 0.18 * k); g.fillCircle(s.x, s.y, 30);
        g.fillStyle(dim(SOOT, 0.2), 0.8); g.fillEllipse(s.x, s.y + 2, 26, 12);
        drawRivetHead(g, s.x, s.y, 7, k);
      }
      // Landing marks: a catch-can inside a splash band, with a closing clock.
      for (const r of rivetsInAir) {
        const k = clamp((time - r.at) / FLIGHT_MS, 0, 1);
        const c = r.aim === 'player' ? MINE_C : FOE_C;
        g.fillStyle(REDLINE, 0.08 + k * 0.14); g.fillCircle(r.to.x, r.to.y, SPLASH_R);
        g.lineStyle(2, REDLINE, 0.55 + 0.3 * k); g.strokeCircle(r.to.x, r.to.y, SPLASH_R);
        g.lineStyle(4, HOT_LIT, 0.9);
        g.beginPath(); g.arc(r.to.x, r.to.y, SPLASH_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        // The catch-can: a riveter's cone bucket seen from above.
        g.fillStyle(0x000000, 0.4); g.fillCircle(r.to.x + 2, r.to.y + 3, CATCH_R);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(r.to.x, r.to.y, CATCH_R);
        g.fillStyle(BRASS, 1); g.fillCircle(r.to.x, r.to.y, CATCH_R - 4);
        g.fillStyle(dim(BRASS, 0.55), 1); g.fillCircle(r.to.x, r.to.y, CATCH_R - 9);
        g.fillStyle(0x1a1208, 1); g.fillCircle(r.to.x, r.to.y, 6);
        g.lineStyle(2, c, 0.9); g.strokeCircle(r.to.x, r.to.y, CATCH_R + 2);
      }
    },

    drawAir(g, time) {
      // Rivets in flight: a high parabola, a spark trail, the rivet's shadow running along the floor.
      for (const r of rivetsInAir) {
        const k = clamp((time - r.at) / FLIGHT_MS, 0, 1);
        const x = r.from.x + (r.to.x - r.from.x) * k;
        const gy = r.from.y + (r.to.y - r.from.y) * k;
        const lift = Math.sin(k * Math.PI) * 190;
        g.fillStyle(0x000000, 0.25 + 0.2 * k); g.fillEllipse(x, gy, 10 + 8 * k, 4 + 3 * k);
        for (let i = 1; i <= 5; i++) {
          const kk = Math.max(0, k - i * 0.025);
          const tx = r.from.x + (r.to.x - r.from.x) * kk;
          const ty = r.from.y + (r.to.y - r.from.y) * kk - Math.sin(kk * Math.PI) * 190;
          g.fillStyle(i < 3 ? HOT_LIT : HOT, 0.6 - i * 0.1); g.fillCircle(tx, ty, 3.5 - i * 0.5);
        }
        drawRivetHead(g, x, gy - lift, 8, 1, k * 9);
      }
    },

    drawHud(g, time) {
      // Top-right: the forge's next-pitch clock and each side's caught tally.
      const x = W - 150, y = top + 10;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 138, 40, 6);
      const span = hot ? 2300 : 1650;
      const k = clamp(1 - (nextPitch - time) / span, 0, 1);
      g.fillStyle(0x2a1a10, 1); g.fillRect(x + 8, y + 8, 50, 8);
      g.fillStyle(hot ? HOT_LIT : HOT, 1); g.fillRect(x + 8, y + 8, 50 * k, 8);
      g.lineStyle(1, BRASS, 1); g.strokeRect(x + 8, y + 8, 50, 8);
      for (const [s, row] of [['player', 0], ['npc', 1]] as [Side, number][]) {
        const n = Math.min(8, caught[s]);
        for (let i = 0; i < 8; i++) {
          g.fillStyle(i < n ? (s === 'player' ? MINE_C : FOE_C) : 0x333333, 1);
          g.fillCircle(x + 70 + i * 8, y + 12 + row * 14, 3);
        }
      }
      drawRivetHead(g, x + 22, y + 30, 6, 1);
    },
  };
}

/** One rivet: a domed head over a stubby shank, glowing by `heat` (0 cold … 1 white). */
function drawRivetHead(g: G, x: number, y: number, s: number, heat: number, spin = 0): void {
  const body = heat > 0.66 ? HOT_LIT : heat > 0.3 ? HOT : dim(IRON, 0.2);
  g.fillStyle(body, 0.18 * heat); g.fillCircle(x, y, s * 2.2);
  const w = Math.abs(Math.cos(spin)) * 0.4 + 0.6;
  g.fillStyle(dim(body, 0.35), 1); g.fillRect(x - s * 0.35 * w, y, s * 0.7 * w, s * 1.2);
  g.fillStyle(body, 1); g.fillEllipse(x, y, s * 2 * w, s * 1.2);
  g.fillStyle(lit(body, 0.6), 1); g.fillEllipse(x - s * 0.3, y - s * 0.2, s * 0.7, s * 0.35);
}

/** The rivet forge: a brick hearth on the wall, its coal bed, bellows and a rack of rivet tongs. */
function drawForge(g: G, x: number, y: number, hot: boolean, time: number): void {
  const beat = 0.5 + 0.5 * Math.sin(time / (hot ? 90 : 170));
  g.fillStyle(hot ? HOT_LIT : HOT, 0.07 + 0.07 * beat); g.fillCircle(x, y + 10, hot ? 120 : 90);
  // Brick hearth.
  g.fillStyle(0x3a1a12, 1); g.fillRect(x - 70, y - 30, 140, 50);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 7; i++) {
      const bx = x - 70 + i * 20 + (row % 2) * 10;
      if (bx + 18 > x + 70) continue;
      g.fillStyle(row % 2 ? 0x7a3a24 : 0x8a442a, 1); g.fillRect(bx + 1, y - 29 + row * 12, 18, 10);
    }
  }
  // Coal bed glowing in the throat.
  g.fillStyle(0x140806, 1); g.fillEllipse(x, y + 2, 92, 30);
  for (let i = 0; i < 12; i++) {
    const cx = x - 38 + (i % 6) * 15 + (i > 5 ? 7 : 0), cy = y - 4 + (i > 5 ? 10 : 0);
    const f = 0.5 + 0.5 * Math.sin(time / 120 + i * 1.7);
    g.fillStyle(f > 0.6 ? HOT_LIT : HOT, 0.6 + 0.4 * f); g.fillCircle(cx, cy, 5);
  }
  // Rivets heating in the coals.
  for (let i = 0; i < 4; i++) drawRivetHead(g, x - 24 + i * 16, y - 2, 4, 0.8 + 0.2 * beat);
  // Bellows to the right, pumping.
  const squash = 0.6 + 0.4 * Math.sin(time / (hot ? 140 : 260));
  g.fillStyle(COPPER_DARK, 1); g.fillTriangle(x + 74, y - 4, x + 120, y - 18 * squash, x + 120, y + 10 * squash);
  g.fillStyle(0x5a3a22, 1); g.fillRect(x + 118, y - 20 * squash, 8, 32 * squash);
  // Tong rack to the left.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 118, y - 26, 40, 5);
  g.lineStyle(2, IRON, 1);
  for (let i = 0; i < 4; i++) { const tx = x - 114 + i * 10; g.lineBetween(tx, y - 21, tx - 2, y + 8); g.lineBetween(tx + 3, y - 21, tx + 5, y + 8); }
  rivets(g, { x: x - 66, y: y + 18 }, { x: x + 66, y: y + 18 }, 12, 1.4, BRASS);
}

export const HOT_RIVETS: GimmickDef = {
  id: ID,
  rules: 'The forge pitches hot rivets near both fighters. Stand in the can to catch one and fling it at your foe; the ring around it splashes.',
  make: makeHotRivets,
};
