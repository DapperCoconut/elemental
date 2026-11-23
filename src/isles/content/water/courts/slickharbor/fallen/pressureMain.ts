import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CRUDE, CRUDE_AMBER, RUST, SAFETY_RED, SAFETY_WHITE, STEEL, STEEL_DARK, STEEL_LIT, clamp, droplet, frameClock,
  noise, sheenAt,
} from '../util';

/**
 * Pressure Main — Corliss Haggard is the valveman of the crude main that runs from the Nodding Field
 * to the Queen's tanker. In the star's telling he is the one who kept the line "past safe" because
 * the Prince asked for a faster tithe, and buried the welders who said no. The main runs right
 * across the middle of the fight, four handwheel valves along it.
 *
 * **The pressure only climbs.** A gauge fills; one flange on the main is the weak joint (it weeps
 * and glows, and the gauge says how long it has), and when the needle hits the red the joint
 * **blows**: a wall of crude erupts straight across the arena through it, north and south.
 *
 * The turn the player can make: **strike a valve** to bleed the line — the gauge drops, and the
 * valve's jet shoots out of the main toward the side where the valveman stands, a lance of hot
 * crude that catches him if he is in front of it. He strikes valves too, and his jets come for
 * you. At half health he runs it past safe: the needle climbs faster and two joints blow at once.
 */

const ID = fallenId('slickharbor', 'pressure-main');
const VALVE_XS = [150, 370, 590, 810];
const JOINT_XS = [64, 260, 480, 700, 896];
const LANCE_WARN = 380;
const LANCE_MS = 420;
const LANCE_LEN = 270;
const LANCE_HALF = 24;
const BLOW_WARN = 900;
const BLOW_HALF = 34;

interface Valve { x: number; readyAt: number; target: StrikeTarget | null }
interface Lance { x: number; side: number; at: number; hit: Set<Fighter>; loud: boolean }
interface Blow { x: number; at: number; done: boolean }

function makePressureMain(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const tick = frameClock();
  const MY = (top + H) / 2 + 6;
  const lanceDmg = 12;
  const blowDmg = 15;
  let pressure = 0.15;
  let pastSafe = false;
  let weak: number[] = [1 + Math.floor(ctx.rng() * 3)];
  const lances: Lance[] = [];
  const blows: Blow[] = [];
  const valves: Valve[] = VALVE_XS.map((x) => ({ x, readyAt: 0, target: null }));

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const sideOf = (f: Fighter): number => (f.y < MY ? -1 : 1);
  const pickWeak = (): void => {
    const all = [0, 1, 2, 3, 4].sort(() => ctx.rng() - 0.5);
    weak = all.slice(0, pastSafe ? 2 : 1);
  };

  for (const v of valves) {
    v.target = ctx.target({
      x: v.x, y: MY, r: 22, passThrough: true,
      onStruck(by) {
        const time = ctx.scene.time.now;
        if (time < v.readyAt) return;
        v.readyAt = time + 5000;
        pressure = Math.max(0, pressure - 0.25);
        const aim = by === 'player' ? ctx.npc : ctx.player;
        lances.push({ x: v.x, side: sideOf(aim), at: time + LANCE_WARN, hit: new Set(), loud: false });
        ctx.sfx('gear-turn');
      },
    });
  }

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const P = ctx.player, N = ctx.npc;
      if (!pastSafe && N.hp < N.maxHp * 0.5) {
        pastSafe = true;
        weak = [...weak, (weak[0] + 2) % 5];
        ctx.banner('PAST SAFE — the needle climbs faster, two joints at a time', '#ffc860');
        ctx.sfx('engine');
      }
      if (alive(P) && alive(N)) pressure += (pastSafe ? 0.125 : 0.085) * dt;
      if (pressure >= 1) {
        pressure = 0.15;
        for (const j of weak) {
          const x = JOINT_XS[j];
          blows.push({ x, at: time + tk.warn(BLOW_WARN), done: false });
          tk.spawnLane({ x, y: MY, angle: Math.PI / 2, halfW: BLOW_HALF, warnMs: BLOW_WARN, fireMs: 420, damage: blowDmg });
        }
        ctx.sfx('beam-charge');
        pickWeak();
      }
      // The blow reaches the valveman too — the toolkit lane only knows the player.
      for (let i = blows.length - 1; i >= 0; i--) {
        const b = blows[i];
        if (!b.done && time >= b.at) {
          b.done = true;
          ctx.sfx('geyser');
          if (alive(N) && Math.abs(N.x - b.x) < BLOW_HALF + 12) ctx.hit(N, blowDmg, N.x, N.y);
        }
        if (time > b.at + 700) blows.splice(i, 1);
      }
      // Valve lances: a jet out of the main toward one side.
      for (let i = lances.length - 1; i >= 0; i--) {
        const l = lances[i];
        if (time < l.at) continue;
        if (!l.loud) { l.loud = true; ctx.sfx('water-jet'); }
        for (const f of [P, N]) {
          if (!alive(f) || l.hit.has(f)) continue;
          const dy = (f.y - MY) * l.side;
          if (Math.abs(f.x - l.x) < LANCE_HALF + 12 && dy > -10 && dy < LANCE_LEN) {
            l.hit.add(f);
            ctx.hit(f, lanceDmg, f.x, f.y);
            if (f === N) ctx.float(N.x, N.y - 50, 'VENTED!', '#ffc860');
          }
        }
        if (time >= l.at + LANCE_MS) lances.splice(i, 1);
      }
    },

    npcSeek(): Pt | null {
      const N = ctx.npc, P = ctx.player;
      // Clear of a joint that is about to go.
      const danger = pressure > 0.72 || blows.some((b) => !b.done);
      if (danger) {
        const hot = blows.length ? blows.map((b) => b.x) : weak.map((j) => JOINT_XS[j]);
        const near = hot.reduce((a, b) => (Math.abs(b - N.x) < Math.abs(a - N.x) ? b : a));
        if (Math.abs(N.x - near) < 110) return { x: clamp(near + (near < W / 2 ? 170 : -170), 60, W - 60), y: N.y };
      }
      // A valve between him and the player: get on it and turn it on them.
      if (sideOf(P) !== sideOf(N)) {
        for (const v of valves) {
          if (ctx.scene.time.now < v.readyAt || Math.abs(P.x - v.x) > 110) continue;
          return { x: v.x, y: MY + sideOf(N) * 46 };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // Sleepers under the main, crude soaked into the ground on both sides.
      for (let x = 20; x < W; x += 46) {
        g.fillStyle(0x2a2018, 1); g.fillRect(x, MY - 26, 14, 52);
        g.fillStyle(CRUDE, 0.4); g.fillEllipse(x + 7, MY + 30, 30 + noise(x) * 30, 10);
      }
      // Lance warnings: a dashed strip from the valve out to where the jet will reach.
      for (const l of lances) {
        if (time >= l.at) continue;
        const c = clamp(1 - (l.at - time) / LANCE_WARN, 0, 1);
        g.fillStyle(SAFETY_RED, 0.12 + c * 0.18);
        g.fillRect(l.x - LANCE_HALF, l.side > 0 ? MY : MY - LANCE_LEN, LANCE_HALF * 2, LANCE_LEN);
        g.lineStyle(2, SAFETY_WHITE, 0.5 + c * 0.4);
        for (let d = 0; d < LANCE_LEN; d += 24) g.lineBetween(l.x, MY + l.side * d, l.x, MY + l.side * (d + 12));
      }
      drawMain(g, ts);
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Lances: a scalding column of crude and steam.
      for (const l of lances) {
        if (time < l.at) continue;
        const k = clamp((time - l.at) / LANCE_MS, 0, 1);
        const len = LANCE_LEN * Math.min(1, k * 4);
        g.fillStyle(SAFETY_WHITE, 0.25 * (1 - k)); g.fillRect(l.x - LANCE_HALF - 6, Math.min(MY, MY + l.side * len), LANCE_HALF * 2 + 12, len);
        g.fillStyle(CRUDE, 0.85 * (1 - k * 0.6)); g.fillRect(l.x - LANCE_HALF * 0.6, Math.min(MY, MY + l.side * len), LANCE_HALF * 1.2, len);
        for (let i = 0; i < 10; i++) {
          const d = noise(i + l.x) * len;
          droplet(g, l.x + (noise(i * 3) - 0.5) * LANCE_HALF * 2, MY + l.side * d, 3, 1 - k);
        }
      }
      // Blowouts: the joint bursts and a wall of crude stands up across the yard.
      for (const b of blows) {
        if (!b.done) continue;
        const k = clamp((time - b.at) / 700, 0, 1);
        g.fillStyle(CRUDE, 0.8 * (1 - k)); g.fillRect(b.x - BLOW_HALF, top, BLOW_HALF * 2, H - top);
        for (let s = 0; s < 3; s++) { g.lineStyle(3, sheenAt(ts + s), 0.4 * (1 - k)); g.lineBetween(b.x - BLOW_HALF + 8 + s * 20, top, b.x - BLOW_HALF + 8 + s * 20, H); }
        for (let i = 0; i < 16; i++) droplet(g, b.x + (noise(i) - 0.5) * 120, MY + (noise(i * 5) - 0.5) * (H - top) * k, 4, 1 - k);
      }
    },

    drawHud(g) {
      // The line gauge: needle on a dial with the red sector, and the weak-joint count beside it.
      const x = W - 66, y = top + 44, r = 30;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, r + 7);
      g.fillStyle(STEEL_DARK, 1); g.fillCircle(x, y, r + 4);
      g.fillStyle(SAFETY_WHITE, 1); g.fillCircle(x, y, r);
      g.lineStyle(6, SAFETY_RED, 0.9); g.beginPath(); g.arc(x, y, r - 6, Math.PI * 1.95, Math.PI * 2.25, false); g.strokePath();
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
        g.lineStyle(1, STEEL_DARK, 1); g.lineBetween(x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10), x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
      }
      const na = Math.PI * 0.75 + clamp(pressure, 0, 1) * Math.PI * 1.5 + (pressure > 0.8 ? Math.sin(ctx.scene.time.now / 30) * 0.04 : 0);
      g.lineStyle(2.5, SAFETY_RED, 1); g.lineBetween(x, y, x + Math.cos(na) * (r - 5), y + Math.sin(na) * (r - 5));
      g.fillStyle(STEEL_DARK, 1); g.fillCircle(x, y, 4);
      for (let i = 0; i < weak.length; i++) { g.fillStyle(CRUDE_AMBER, 1); g.fillCircle(x - r - 14, y - 8 + i * 14, 5); }
    },

    destroy() { for (const v of valves) v.target?.remove(); lances.length = 0; blows.length = 0; },
  };

  /** The main itself: a long greasy pipe, bolted flanges at the joints, red handwheels on the valves. */
  function drawMain(g: G, ts: number): void {
    const now = ctx.scene.time.now;
    g.fillStyle(0x000000, 0.4); g.fillRect(0, MY - 8, W, 22);
    g.fillStyle(STEEL_DARK, 1); g.fillRect(0, MY - 14, W, 26);
    g.fillStyle(STEEL, 1); g.fillRect(0, MY - 12, W, 18);
    g.fillStyle(STEEL_LIT, 0.5); g.fillRect(0, MY - 10, W, 4);
    for (let x = 30; x < W; x += 90) { g.fillStyle(RUST, 0.35); g.fillEllipse(x + noise(x) * 40, MY + 2, 30, 8); }
    JOINT_XS.forEach((jx, j) => {
      const isWeak = weak.includes(j);
      const hot = isWeak ? clamp((pressure - 0.4) / 0.6, 0, 1) : 0;
      g.fillStyle(STEEL_DARK, 1); g.fillRect(jx - 7, MY - 20, 14, 38);
      for (let b = 0; b < 4; b++) {
        const pop = isWeak && pressure > 0.8 && noise(b + Math.floor(ts * 8)) > 0.6 ? -2 : 0;
        g.fillStyle(STEEL_LIT, 1); g.fillCircle(jx + pop, MY - 15 + b * 10, 2);
      }
      if (isWeak) {
        g.fillStyle(SAFETY_RED, 0.15 + hot * 0.45 + 0.1 * Math.sin(ts * (4 + hot * 16))); g.fillCircle(jx, MY, 22 + hot * 10);
        g.fillStyle(CRUDE, 0.9); g.fillEllipse(jx + 4, MY + 24, 18 + hot * 20, 8 + hot * 6);
        droplet(g, jx + 3, MY + 14 + ((ts * 2) % 1) * 10, 2.5);
        for (let s = 0; s < 3; s++) {
          const ph = (ts * 3 + s / 3) % 1;
          g.fillStyle(SAFETY_WHITE, 0.4 * hot * (1 - ph)); g.fillCircle(jx + (s - 1) * 6, MY - 20 - ph * 30, 3 + ph * 6);
        }
      }
    });
    for (const v of valves) {
      const ready = now >= v.readyAt;
      g.fillStyle(STEEL_DARK, 1); g.fillRect(v.x - 12, MY - 18, 24, 34);
      g.fillStyle(STEEL, 1); g.fillRect(v.x - 4, MY - 30, 8, 14);
      const wx = v.x, wy = MY - 32, spin = ready ? 0 : ts * 6;
      g.lineStyle(4, ready ? SAFETY_RED : 0x5a2a20, 1); g.strokeCircle(wx, wy, 12);
      for (let k = 0; k < 4; k++) { const a = spin + (k / 4) * Math.PI * 2; g.lineStyle(2, ready ? SAFETY_RED : 0x5a2a20, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 11, wy + Math.sin(a) * 11); }
      g.fillStyle(STEEL_LIT, 1); g.fillCircle(wx, wy, 3);
      if (!ready) { g.fillStyle(SAFETY_WHITE, 0.9); g.fillRect(v.x + 12, MY - 40, 10, 14); g.fillStyle(SAFETY_RED, 1); g.fillRect(v.x + 12, MY - 40, 10, 4); }
    }
  }
}

export const FALLEN_PRESSURE_MAIN: GimmickDef = {
  id: ID,
  rules: 'Pressure climbs until the weeping joint blows a wall of crude across the yard. Strike a valve to bleed it: the jet shoots at Haggard\'s side.',
  make: makePressureMain,
};
