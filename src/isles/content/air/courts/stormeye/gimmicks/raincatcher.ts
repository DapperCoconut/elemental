import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim } from '../../../../../art/IsleArt';
import { Clock, S, SCOL, alive, clamp, dist, jit } from '../util';

/**
 * RAINCATCHER — Cisternkeeper Mull.
 *
 * A copper cistern stands in each corner of the yard with a funnel of rain-catchers over it, and
 * the rain fills them — you can watch each gauge-glass climb. A cistern faces one of two ways: along
 * the wall it stands on, or down the side of the yard. When it is full it brims (spilling, its lane
 * lit across the yard), and then it tips: a wall of water runs the length of its lane faster than
 * anyone can walk. Whoever it catches is knocked down for a hit, swept along with it and left
 * soaked and slow.
 *
 * Each cistern has a crank by its foot. Lean on the crank for a moment and the cistern swings to its
 * other facing — even while brimming. Mull turns them all day long to put the wave where you stand.
 * Turn them back. Better, turn the one about to tip so its lane runs through *him*.
 */

type Side = 'player' | 'npc';
type Facing = 'h' | 'v';

interface Cistern {
  /** Corner: −1/1 in x and y. */
  sx: number; sy: number;
  x: number; y: number;
  crank: Pt;
  facing: Facing;
  fill: number;
  rate: number;
  brimAt: number;
  turnK: number;
  turnedAt: number;
  turner: Side | null;
}
interface Wave { lane: Rect; dir: { x: number; y: number }; at: number; front: number; hit: Record<Side, boolean>; done: boolean }

const LANE = 220;
const WAVE_SPEED = 430;
const WAVE_THICK = 70;
const TURN_MS = 700;
const CRANK_R = 46;

export const RAINCATCHER: GimmickDef = {
  id: 'stormeye-raincatcher',
  rules: 'Rain fills the four corner cisterns. A full one brims, then tips a wave down its lit lane — it knocks you along and soaks you. Stand at a cistern\'s crank to swing it to its other lane, even while it brims.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const brimMs = ctx.tk.warn(1700);
    const dmg = ctx.hard ? 16 : 13;
    let now = 0;
    const soaked: Record<Side, number> = { player: 0, npc: 0 };
    let waves: Wave[] = [];

    const cisterns: Cistern[] = ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([sx, sy], i) => {
      const x = sx < 0 ? 64 : W - 64, y = sy < 0 ? top + 56 : H - 50;
      return {
        sx, sy, x, y,
        crank: { x: x - sx * 70, y: y - sy * 62 },
        facing: (i % 3 === 0 ? 'h' : 'v') as Facing,
        fill: 0.15 + rng() * 0.45,
        rate: 1 / ((ctx.hard ? 7 : 9) + i * 1.3 + rng() * 2),
        brimAt: -1, turnK: 0, turnedAt: -9999, turner: null,
      };
    });

    /** The strip of yard a cistern's wave runs down, and which way. */
    const laneOf = (c: Cistern, f: Facing = c.facing): { lane: Rect; dir: { x: number; y: number } } => {
      if (f === 'h') {
        const y0 = c.sy < 0 ? top : H - LANE;
        return { lane: { x: 0, y: y0, w: W, h: LANE }, dir: { x: -c.sx, y: 0 } };
      }
      const x0 = c.sx < 0 ? 0 : W - LANE;
      return { lane: { x: x0, y: top, w: LANE, h: H - top }, dir: { x: 0, y: -c.sy } };
    };
    const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

    const tip = (c: Cistern): void => {
      const { lane, dir } = laneOf(c);
      waves.push({ lane, dir, at: now, front: 0, hit: { player: false, npc: false }, done: false });
      c.fill = 0; c.brimAt = -1;
      ctx.sfx('geyser');
    };

    /** Where the wave front is along its lane (in absolute coordinates). */
    const frontPos = (w: Wave): number => {
      const L = w.dir.x !== 0 ? w.lane.w : w.lane.h;
      const run = w.front;
      if (w.dir.x > 0) return w.lane.x + run;
      if (w.dir.x < 0) return w.lane.x + L - run;
      if (w.dir.y > 0) return w.lane.y + run;
      return w.lane.y + L - run;
    };
    const inWave = (w: Wave, f: Fighter): boolean => {
      if (!inRect(w.lane, f.x, f.y)) return false;
      const fp = frontPos(w);
      const along = w.dir.x !== 0 ? f.x : f.y;
      const sgn = w.dir.x !== 0 ? w.dir.x : w.dir.y;
      // Inside the band of water just behind the front.
      const behind = (fp - along) * sgn;
      return behind >= -10 && behind <= WAVE_THICK;
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        for (const c of cisterns) {
          if (c.brimAt < 0) {
            c.fill = Math.min(1, c.fill + c.rate * dt);
            if (c.fill >= 1) { c.brimAt = time + brimMs; ctx.sfx('rain'); }
          } else if (time >= c.brimAt) tip(c);
          // The crank: lean on it and the cistern swings.
          let leaning: Side | null = null;
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (alive(f) && dist(f.x, f.y, c.crank.x, c.crank.y) < CRANK_R) { leaning = s; break; }
          }
          if (leaning && time - c.turnedAt > 900) {
            c.turnK += (dt * 1000) / TURN_MS;
            c.turner = leaning;
            if (c.turnK >= 1) {
              c.facing = c.facing === 'h' ? 'v' : 'h';
              c.turnK = 0; c.turnedAt = time;
              ctx.sfx('gear-turn');
              ctx.float(c.crank.x, c.crank.y - 40, leaning === 'player' ? 'CISTERN TURNED' : 'MULL TURNS IT', leaning === 'player' ? SCOL.blue : SCOL.red);
            }
          } else c.turnK = Math.max(0, c.turnK - dt * 2);
        }
        for (const w of waves) {
          const L = w.dir.x !== 0 ? w.lane.w : w.lane.h;
          w.front += WAVE_SPEED * dt;
          if (w.front > L + WAVE_THICK + 40) { w.done = true; continue; }
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (!alive(f) || !inWave(w, f)) continue;
            if (!w.hit[s]) {
              w.hit[s] = true;
              ctx.hit(f, dmg, f.x, f.y);
              ctx.sfx('splash');
              ctx.float(f.x, f.y - 50, s === 'player' ? 'SWEPT AWAY' : 'MULL IS SWEPT', s === 'player' ? SCOL.red : SCOL.green);
            }
            soaked[s] = time + 2200;
            // Carried along with the water, slower than it, so it soon passes over.
            ctx.nudge(f, w.dir.x * WAVE_SPEED * 0.6 * dt, w.dir.y * WAVE_SPEED * 0.6 * dt);
          }
        }
        waves = waves.filter((w) => !w.done);
      },

      playerSpeedMult: () => (now < soaked.player ? 0.72 : 1),
      npcSpeedMult: () => (now < soaked.npc ? 0.72 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Out of any lane that is about to go, or any wave coming.
        for (const c of cisterns) {
          if (c.brimAt < 0) continue;
          const { lane } = laneOf(c);
          if (inRect(lane, n.x, n.y)) {
            // Unless he can turn it onto you from where he stands.
            const other = laneOf(c, c.facing === 'h' ? 'v' : 'h');
            if (inRect(other.lane, p.x, p.y) && !inRect(other.lane, c.crank.x, c.crank.y) && dist(n.x, n.y, c.crank.x, c.crank.y) < 160) return c.crank;
            return lane.w === W
              ? { x: n.x, y: lane.y < (top + H) / 2 ? lane.y + lane.h + 50 : lane.y - 50 }
              : { x: lane.x < W / 2 ? lane.x + lane.w + 50 : lane.x - 50, y: n.y };
          }
        }
        // The fullest cistern that would hit you if he turned it: go and turn it.
        const ranked = cisterns.filter((c) => c.fill > 0.55 || c.brimAt > 0).sort((a, b) => b.fill - a.fill);
        for (const c of ranked) {
          const cur = laneOf(c), other = laneOf(c, c.facing === 'h' ? 'v' : 'h');
          if (!inRect(cur.lane, p.x, p.y) && inRect(other.lane, p.x, p.y)) return c.crank;
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Lanes: faint while a cistern fills past half, lit and strobing while it brims.
        for (const c of cisterns) {
          if (c.fill < 0.5 && c.brimAt < 0) continue;
          const { lane, dir } = laneOf(c);
          const brim = c.brimAt > 0;
          const k = brim ? clamp(1 - (c.brimAt - time) / brimMs, 0, 1) : (c.fill - 0.5) * 2;
          g.fillStyle(S.water, brim ? 0.14 + k * 0.16 : 0.05 + k * 0.05); g.fillRect(lane.x, lane.y, lane.w, lane.h);
          if (brim && k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.4); g.strokeRect(lane.x + 2, lane.y + 2, lane.w - 4, lane.h - 4); }
          // Chevrons running the way the water will go.
          const along = dir.x !== 0;
          const L = along ? lane.w : lane.h;
          const flow = (time / (brim ? 4 : 12)) % 80;
          for (let d = -80; d < L + 80; d += 80) {
            const u = d + flow * (along ? Math.sign(dir.x) : Math.sign(dir.y));
            const mx = along ? (dir.x > 0 ? lane.x + u : lane.x + L - u) : lane.x + lane.w / 2;
            const my = along ? lane.y + lane.h / 2 : (dir.y > 0 ? lane.y + u : lane.y + L - u);
            if (mx < lane.x || mx > lane.x + lane.w || my < lane.y || my > lane.y + lane.h) continue;
            g.lineStyle(3, S.waterLit, brim ? 0.55 : 0.25);
            const s = 14;
            g.lineBetween(mx - dir.x * s - dir.y * s, my - dir.y * s - dir.x * s, mx, my);
            g.lineBetween(mx - dir.x * s + dir.y * s, my - dir.y * s + dir.x * s, mx, my);
          }
        }
        // Wet trails behind the waves.
        for (const w of waves) {
          const fp = frontPos(w);
          g.fillStyle(S.puddle, 0.35);
          if (w.dir.x > 0) g.fillRect(w.lane.x, w.lane.y, Math.max(0, fp - w.lane.x), w.lane.h);
          else if (w.dir.x < 0) g.fillRect(fp, w.lane.y, w.lane.x + w.lane.w - fp, w.lane.h);
          else if (w.dir.y > 0) g.fillRect(w.lane.x, w.lane.y, w.lane.w, Math.max(0, fp - w.lane.y));
          else g.fillRect(w.lane.x, fp, w.lane.w, w.lane.y + w.lane.h - fp);
        }
        // Cranks: a timber wheel on a post, with the turning progress round it.
        for (const c of cisterns) {
          const k = c.turnK;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(c.crank.x, c.crank.y + 6, 36, 12);
          g.lineStyle(1.5, S.copperLit, 0.35); g.strokeCircle(c.crank.x, c.crank.y, CRANK_R);
          if (k > 0) {
            g.lineStyle(5, c.turner === 'player' ? S.eye : S.red, 0.9);
            g.beginPath(); g.arc(c.crank.x, c.crank.y, CRANK_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The waves: a wall of grey-green water with a white curling lip and spray thrown ahead.
        for (const w of waves) {
          const fp = frontPos(w);
          const along = w.dir.x !== 0;
          const span = along ? w.lane.h : w.lane.w;
          const n = Math.floor(span / 12);
          for (let i = 0; i <= n; i++) {
            const o = (i / n) * span;
            const wob = Math.sin(time / 80 + i * 0.9) * 6;
            const fx = along ? fp + wob * Math.sign(w.dir.x) : w.lane.x + o;
            const fy = along ? w.lane.y + o : fp + wob * Math.sign(w.dir.y);
            const bx = fx - w.dir.x * WAVE_THICK, by = fy - w.dir.y * WAVE_THICK;
            g.lineStyle(14, S.water, 0.85); g.lineBetween(bx, by, fx, fy);
            g.lineStyle(6, S.waterLit, 0.8); g.lineBetween(fx - w.dir.x * 18, fy - w.dir.y * 18, fx, fy);
            g.fillStyle(0xffffff, 0.85); g.fillCircle(fx, fy, 5 + jit(i, 3) * 3);
            if (i % 2 === 0) { g.fillStyle(0xffffff, 0.4); g.fillCircle(fx + w.dir.x * (10 + jit(i, 4) * 14), fy + w.dir.y * (10 + jit(i, 4) * 14) - 6, 3); }
          }
        }
        // The cisterns, corner by corner.
        for (const c of cisterns) {
          const { x, y } = c;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 26, 90, 22);
          // Stilts.
          g.fillStyle(S.graniteDark, 1); g.fillRect(x - 32, y, 10, 26); g.fillRect(x + 22, y, 10, 26);
          // The tank.
          g.fillStyle(dim(S.copper, 0.5), 1); g.fillRoundedRect(x - 40, y - 46, 80, 56, 10);
          g.fillStyle(S.copperDark, 1); g.fillRoundedRect(x - 38, y - 44, 76, 52, 9);
          g.fillStyle(S.verdigris, 0.45); g.fillRect(x - 38, y - 8, 76, 12);
          for (let i = 0; i < 3; i++) { g.fillStyle(S.copper, 1); g.fillRect(x - 38, y - 36 + i * 16, 76, 2); }
          // Funnel of catchers, with rain pouring into it.
          g.fillStyle(S.copper, 1); g.fillTriangle(x - 52, y - 68, x + 52, y - 68, x, y - 44);
          g.fillStyle(S.copperLit, 0.5); g.fillTriangle(x - 52, y - 68, x, y - 68, x, y - 44);
          for (let i = 0; i < 6; i++) {
            const ph = (time / 260 + jit(i, c.sx + 3)) % 1;
            const rx = x - 44 + jit(i, c.sy + 5) * 88;
            g.lineStyle(1, S.rain, 0.6); g.lineBetween(rx, y - 120 + ph * 52, rx + 3, y - 110 + ph * 52);
          }
          // Gauge-glass.
          g.fillStyle(S.glassDark, 1); g.fillRect(x + 24, y - 40, 8, 44);
          g.fillStyle(c.brimAt > 0 ? S.waterLit : S.water, 1); g.fillRect(x + 25, y + 3 - 42 * c.fill, 6, 42 * c.fill);
          // The spout, pointing down its lane, spilling while it brims.
          const { dir } = laneOf(c);
          const sx = x + dir.x * 44, sy = y - 16 + dir.y * 34;
          g.fillStyle(S.copperDark, 1); g.fillCircle(sx, sy, 9);
          g.fillStyle(0x10141a, 1); g.fillCircle(sx + dir.x * 3, sy + dir.y * 3, 5);
          if (c.brimAt > 0) {
            for (let i = 0; i < 5; i++) {
              const ph = (time / 200 + i / 5) % 1;
              g.fillStyle(S.waterLit, 0.8 * (1 - ph));
              g.fillCircle(sx + dir.x * ph * 40 + (jit(i, 9) - 0.5) * 10, sy + dir.y * ph * 40 + ph * 14, 3 + ph * 3);
            }
            g.fillStyle(S.waterLit, 0.7); g.fillEllipse(x, y - 46, 70, 8);
          }
          // The crank wheel itself.
          const ca = c.turnK * Math.PI * 2 + (time - c.turnedAt < 400 ? (time - c.turnedAt) / 60 : 0);
          g.lineStyle(3, S.timber, 1); g.strokeCircle(c.crank.x, c.crank.y - 16, 10);
          g.lineBetween(c.crank.x - Math.cos(ca) * 10, c.crank.y - 16 - Math.sin(ca) * 10, c.crank.x + Math.cos(ca) * 10, c.crank.y - 16 + Math.sin(ca) * 10);
          g.fillStyle(S.timber, 1); g.fillRect(c.crank.x - 2, c.crank.y - 16, 4, 18);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // Soaked: a wet blue rim on the screen while it lasts.
        if (now < soaked.player) {
          const a = clamp((soaked.player - time) / 2200, 0, 1);
          g.lineStyle(18, S.water, 0.3 * a); g.strokeRect(9, top + 9, W - 18, H - top - 18);
        }
      },
    };
  },
};
