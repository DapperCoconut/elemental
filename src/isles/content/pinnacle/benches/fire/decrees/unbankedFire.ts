import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { OBS } from '../../../../../art/PinnacleArt';
import { EMB, brandingIron } from '../art';
import { WHO, type Who, alive, clamp, dist, side } from './util';

/**
 * Decree of the Unbanked Fire — Councilor Ashmund Vell, Seat of Embers.
 *
 * Vell drafted the hearth clause ("a fire found cold is a family found wanting"); in his room no
 * fire may ever be banked. The floor is a grid of cooled glass, and it will burn:
 *
 *  - Every cast either fighter makes sets the glass ~90 px ahead of them alight (once a second at
 *    most). Aim your casts and you aim fire.
 *  - Fire spreads cell to cell on a tick, far more readily downwind. The draught (the great
 *    bellows) turns every 12 s, announced, and is drawn as streaks across the floor.
 *  - A burning cell scorches whoever stands in it. When it burns out it is ASH, and ash cannot
 *    burn again until it cools back to glass, 9 s later — a firebreak.
 *  - The First Brand overhead drips a live coal onto the floor every few seconds (its shadow
 *    shows where).
 *
 * A perfected Fire bot runs at double speed in Flame Body and its mastery strips every burn off
 * it — but this is not a burn, it is the floor: it still stands upwind and casts at you, and it
 * still has to leave. A clever player burns a firebreak round themself first, then lights the
 * glass upwind of him and lets the draught carry it.
 */

const CELL = 40;
const BURN_MS = 2600;
const ASH_MS = 9000;
const TICK_MS = 300;
const SCORCH_EVERY = 500;
const MAX_BURNING = 64;
const IGNITE_COOLDOWN = 1000;
const AHEAD = 90;
const DRAUGHT_EVERY = 12000;

/** Cell states. */
const Cell = { Glass: 0, Burning: 1, Ash: 2 } as const;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const cols = Math.floor(W / CELL);
  const rows = Math.floor((H - top) / CELL);
  const N = cols * rows;
  const state = new Uint8Array(N);
  const until = new Float64Array(N);
  const litAt = new Float64Array(N);
  const SCORCH = ctx.hard ? 6 : 5;
  const BASE_P = ctx.hard ? 0.13 : 0.1;
  const WIND_P = ctx.hard ? 0.36 : 0.3;
  const COAL_EVERY = ctx.hard ? 5200 : 6800;
  const COAL_WARN = 1300;

  /** Eight headings the draught can blow from. */
  const HEADINGS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
  let windI = rng() < 0.5 ? 0 : 4;
  let windA = (windI * Math.PI) / 4;
  let windShown = windA;
  let nextDraught = 0;
  let nextTick = 0;
  let nextCoal = 0;
  let coal: { x: number; y: number; at: number } | null = null;
  let started = false;
  let burning = 0;
  const nextIgnite: Record<Who, number> = { player: 0, npc: 0 };
  const nextScorch: Record<Who, number> = { player: 0, npc: 0 };

  const idx = (c: number, r: number) => r * cols + c;
  const cellOf = (x: number, y: number): number => {
    const c = Math.floor(x / CELL), r = Math.floor((y - top) / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
    return idx(c, r);
  };
  const centre = (i: number): Pt => ({ x: (i % cols) * CELL + CELL / 2, y: top + Math.floor(i / cols) * CELL + CELL / 2 });

  function ignite(i: number, time: number): boolean {
    if (i < 0 || state[i] !== Cell.Glass || burning >= MAX_BURNING) return false;
    state[i] = Cell.Burning;
    until[i] = time + BURN_MS * (0.85 + rng() * 0.3);
    litAt[i] = time;
    burning++;
    return true;
  }

  /** A cast lights the glass ahead of the caster: the cell ahead and the one past it. */
  function castFire(w: Who, time: number): void {
    const f = side(ctx, w);
    if (!alive(f) || time < nextIgnite[w]) return;
    nextIgnite[w] = time + IGNITE_COOLDOWN;
    const a = ctx.facing(f);
    const x = f.x + Math.cos(a) * AHEAD, y = f.y + Math.sin(a) * AHEAD;
    const lit1 = ignite(cellOf(x, y), time);
    const lit2 = ignite(cellOf(x + Math.cos(a) * CELL, y + Math.sin(a) * CELL), time);
    if (lit1 || lit2) ctx.sfx('flame-burst');
  }

  function spread(time: number): void {
    const wx = Math.cos(windA), wy = Math.sin(windA);
    const toLight: number[] = [];
    for (let i = 0; i < N; i++) {
      if (state[i] !== Cell.Burning) continue;
      const c = i % cols, r = Math.floor(i / cols);
      const nb: [number, number, number, number][] = [[c + 1, r, 1, 0], [c - 1, r, -1, 0], [c, r + 1, 0, 1], [c, r - 1, 0, -1]];
      for (const [nc, nr, dx, dy] of nb) {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const j = idx(nc, nr);
        if (state[j] !== Cell.Glass) continue;
        const along = dx * wx + dy * wy;
        const p = Math.max(0.015, BASE_P + along * WIND_P);
        if (rng() < p) toLight.push(j);
      }
    }
    for (const j of toLight) ignite(j, time);
  }

  function age(time: number): void {
    for (let i = 0; i < N; i++) {
      if (state[i] === Cell.Burning && time >= until[i]) { state[i] = Cell.Ash; until[i] = time + ASH_MS; burning--; }
      else if (state[i] === Cell.Ash && time >= until[i]) state[i] = Cell.Glass;
    }
  }

  /** Hotness of the floor at a point for the bot's choices: burning near = bad. */
  function danger(x: number, y: number): number {
    let d = 0;
    const c0 = Math.floor(x / CELL), r0 = Math.floor((y - top) / CELL);
    for (let r = r0 - 2; r <= r0 + 2; r++) {
      for (let c = c0 - 2; c <= c0 + 2; c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) { d += 0.3; continue; }
        const s = state[idx(c, r)];
        if (s === Cell.Burning) d += 3 / (1 + Math.abs(r - r0) + Math.abs(c - c0));
        else if (s === Cell.Ash) d -= 0.25;
      }
    }
    return d;
  }

  return {
    update(time, dtRaw) {
      if (!started) {
        started = true;
        nextDraught = time + DRAUGHT_EVERY;
        nextTick = time + TICK_MS;
        nextCoal = time + 2500;
        ctx.banner(`THE DRAUGHT BLOWS ${HEADINGS[windI]}`, '#ffb35a');
      }
      // The draught turns: never straight back on itself, always announced.
      if (time >= nextDraught) {
        nextDraught = time + DRAUGHT_EVERY;
        windI = (windI + (rng() < 0.5 ? 2 : 6) + (rng() < 0.5 ? 1 : 0)) % 8;
        windA = (windI * Math.PI) / 4;
        ctx.banner(`THE DRAUGHT TURNS — ${HEADINGS[windI]}`, '#ffb35a');
        ctx.sfx('gust');
      }
      windShown += Math.atan2(Math.sin(windA - windShown), Math.cos(windA - windShown)) * Math.min(1, dtRaw * 2);
      if (time >= nextTick) { nextTick = time + TICK_MS; age(time); spread(time); }

      // The Brand's coal.
      if (!coal && time >= nextCoal) {
        const p = ctx.player;
        // Near-ish the fight, never on top of anyone.
        const x = clamp(p.x + (rng() - 0.5) * 420, 60, W - 60);
        const y = clamp(p.y + (rng() - 0.5) * 300, top + 50, H - 40);
        coal = { x, y, at: time + ctx.tk.warn(COAL_WARN) };
        ctx.sfx('sizzle');
      }
      if (coal && time >= coal.at) {
        const c = cellOf(coal.x, coal.y);
        ignite(c, time);
        const ctr = centre(c);
        for (const [dx, dy] of [[CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) ignite(cellOf(ctr.x + dx, ctr.y + dy), time);
        ctx.tk.boom(coal.x, coal.y, 40, EMB.hot);
        ctx.sfx('fireball');
        coal = null;
        nextCoal = time + COAL_EVERY;
      }

      // Scorch whoever stands in fire.
      for (const w of WHO) {
        const f = side(ctx, w);
        if (!alive(f) || ctx.isAirborne(f)) continue;
        const i = cellOf(f.x, f.y);
        if (i >= 0 && state[i] === Cell.Burning && time >= nextScorch[w]) {
          nextScorch[w] = time + SCORCH_EVERY;
          ctx.hit(f, SCORCH, f.x, f.y);
        }
      }
    },

    onPlayerCast() { castFire('player', ctx.scene.time.now); },
    onNpcCast() { castFire('npc', ctx.scene.time.now); },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (!alive(n) || !alive(p)) return null;
      // On fire or about to be: get to the coolest ground near by (ash is best).
      const here = danger(n.x, n.y);
      // Otherwise: upwind of the challenger, so every cast's fire runs down onto them.
      const ux = p.x - Math.cos(windA) * 210, uy = p.y - Math.sin(windA) * 210;
      const want = { x: here > 1.2 ? n.x : ux, y: here > 1.2 ? n.y : uy };
      let best: Pt | null = null, bs = Infinity;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const r = k % 2 ? 70 : 140;
        const x = clamp(want.x + Math.cos(a) * r, 50, W - 50), y = clamp(want.y + Math.sin(a) * r, top + 50, H - 40);
        const s = danger(x, y) * 60 + dist(x, y, want.x, want.y) * 0.4;
        if (s < bs) { bs = s; best = { x, y }; }
      }
      const cs = danger(want.x, want.y) * 60;
      return cs <= bs ? { x: clamp(want.x, 50, W - 50), y: clamp(want.y, top + 50, H - 40) } : best;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // Draught streaks across the whole floor.
      const a = windShown;
      for (let i = 0; i < 18; i++) {
        const ph = ((t * 0.55) + i * 0.137) % 1;
        const bx = (i * 211) % W, by = top + 20 + ((i * 97) % (H - top - 40));
        const x = bx + Math.cos(a) * ph * 200, y = by + Math.sin(a) * ph * 200;
        g.lineStyle(1.4, EMB.hot, 0.2 * Math.sin(ph * Math.PI));
        g.lineBetween(x, y, x - Math.cos(a) * 34, y - Math.sin(a) * 34);
      }
      // Ash and burning cells.
      for (let i = 0; i < N; i++) {
        const s = state[i];
        if (s === Cell.Glass) continue;
        const c = centre(i);
        if (s === Cell.Ash) {
          const left = clamp((until[i] - time) / ASH_MS, 0, 1);
          g.fillStyle(EMB.ash, 0.35 + left * 0.45); g.fillRect(c.x - CELL / 2 + 1, c.y - CELL / 2 + 1, CELL - 2, CELL - 2);
          g.fillStyle(EMB.ashLit, 0.25 * left);
          g.fillCircle(c.x - 8 + ((i * 7) % 16), c.y - 6 + ((i * 13) % 12), 4);
          if (left > 0.6) { g.fillStyle(EMB.ember, (left - 0.6) * 1.4); g.fillCircle(c.x + ((i * 11) % 14) - 7, c.y + ((i * 5) % 10) - 5, 1.6); }
        } else {
          const k = clamp((time - litAt[i]) / 300, 0, 1);
          g.fillStyle(EMB.deep, 0.5 * k); g.fillRect(c.x - CELL / 2, c.y - CELL / 2, CELL, CELL);
          g.fillStyle(EMB.ember, 0.22 * k); g.fillCircle(c.x, c.y, CELL * 0.7);
        }
      }
      // The coal's shadow, tightening as it falls.
      if (coal) {
        const k = clamp(1 - (coal.at - time) / ctx.tk.warn(COAL_WARN), 0, 1);
        g.fillStyle(0x000000, 0.25 + k * 0.3); g.fillEllipse(coal.x, coal.y, 90 - k * 50, 40 - k * 20);
        g.lineStyle(2, EMB.ember, 0.4 + k * 0.5); g.strokeCircle(coal.x, coal.y, 60 - k * 30);
      }
      // Where the challenger's next cast will set the glass alight.
      const p = ctx.player;
      if (alive(p) && time >= nextIgnite.player) {
        const fa = ctx.facing(p);
        const i = cellOf(p.x + Math.cos(fa) * AHEAD, p.y + Math.sin(fa) * AHEAD);
        if (i >= 0) {
          const c = centre(i);
          g.lineStyle(1.2, state[i] === Cell.Glass ? EMB.hot : EMB.ashLit, 0.45);
          g.strokeRect(c.x - CELL / 2 + 4, c.y - CELL / 2 + 4, CELL - 8, CELL - 8);
        }
      }
    },

    drawAir(g, time) {
      // Flames: three tongues per burning cell, flickering, leaning with the draught.
      const lean = Math.cos(windShown) * 6;
      for (let i = 0; i < N; i++) {
        if (state[i] !== Cell.Burning) continue;
        const c = centre(i);
        const left = clamp((until[i] - time) / BURN_MS, 0, 1);
        const grow = clamp((time - litAt[i]) / 260, 0, 1);
        const hgt = (14 + 14 * Math.min(1, left * 1.6)) * grow;
        for (let k = 0; k < 3; k++) {
          const fx = c.x - 11 + k * 11 + Math.sin(time / 90 + i + k) * 2;
          const fl = hgt * (0.75 + 0.35 * Math.sin(time / 70 + i * 1.7 + k * 2.1));
          g.fillStyle(EMB.deep, 0.75); g.fillTriangle(fx - 7, c.y + 8, fx + 7, c.y + 8, fx + lean, c.y + 8 - fl);
          g.fillStyle(EMB.ember, 0.85); g.fillTriangle(fx - 5, c.y + 8, fx + 5, c.y + 8, fx + lean * 0.8, c.y + 8 - fl * 0.78);
          g.fillStyle(EMB.core, 0.7); g.fillTriangle(fx - 2.5, c.y + 8, fx + 2.5, c.y + 8, fx + lean * 0.5, c.y + 8 - fl * 0.42);
        }
        // A spark lifting off now and then.
        const ph = ((time / 700) + i * 0.31) % 1;
        g.fillStyle(EMB.hot, 1 - ph); g.fillCircle(c.x + Math.sin(i * 3 + time / 300) * 10 + lean * ph * 2, c.y - 10 - ph * 34, 1.4);
      }
      // The coal falling out of the dark, a glowing drip off the Brand.
      if (coal) {
        const k = clamp(1 - (coal.at - time) / ctx.tk.warn(COAL_WARN), 0, 1);
        const y = coal.y - (1 - k * k) * 360;
        g.fillStyle(EMB.ember, 0.25); g.fillCircle(coal.x, y, 14);
        g.fillStyle(EMB.hot, 1); g.fillCircle(coal.x, y, 6);
        g.fillStyle(EMB.core, 1); g.fillCircle(coal.x - 1.5, y - 1.5, 2.5);
        g.lineStyle(2, EMB.ember, 0.4); g.lineBetween(coal.x, y - 6, coal.x, y - 40);
      }
    },

    drawHud(g, time) {
      // The draught vane: a little branding iron that swings to point downwind, and a gauge of how
      // long until it turns.
      const cx = W / 2, cy = top + 26;
      g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(cx - 58, cy - 20, 116, 40, 10);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 58, cy - 20, 116, 40, 10);
      g.lineStyle(1, dim(EMB.ember, 0.3), 0.8); g.strokeCircle(cx - 30, cy, 14);
      brandingIron(g, cx - 30 + Math.cos(windShown) * 11, cy + Math.sin(windShown) * 11, 22, windShown + Math.PI, 0.85, 0.7);
      const left = clamp((nextDraught - time) / DRAUGHT_EVERY, 0, 1);
      g.fillStyle(dim(EMB.ember, 0.5), 1); g.fillRect(cx - 8, cy - 3, 56, 6);
      g.fillStyle(left < 0.2 ? EMB.core : lit(EMB.ember, 0.2), 1); g.fillRect(cx - 8, cy - 3, 56 * left, 6);
      // Burning floor, as a row of tiny flame pips.
      const pips = Math.min(10, Math.ceil(burning / 6));
      for (let i = 0; i < pips; i++) { g.fillStyle(EMB.ember, 0.9); g.fillTriangle(cx - 8 + i * 5.6, cy + 14, cx - 4 + i * 5.6, cy + 14, cx - 6 + i * 5.6, cy + 7); }
    },
  };
}

export const UNBANKED_FIRE: GimmickDef = {
  id: 'bench-fire-unbanked',
  rules: 'No fire shall be banked: every cast sets the glass ahead alight, flame spreads with the draught, and ash may not burn twice.',
  make,
};
