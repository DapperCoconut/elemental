import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { lit } from '../../../../art/IsleArt';
import { FOAM, GOLD, maresaSigil } from './art';

/**
 * The Undertow's three wardens — the Queen's keepers, one at the head of each drowned hall.
 *
 * Each fight is built on the hall it closes. The Sluicemaster runs the flood clock, the
 * Eel-Wrangler holds the leash of the thing in the current hall, the Bell-Diver keeps the only
 * air in the gallery. Every rule cuts both ways: a player who reads it turns it on the warden.
 */

type Who = 'player' | 'npc';
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);

// ── Warden 1: The Sluice Wheels ──────────────────────────────────────

/**
 * Four sluice channels cross the floor, the mouths taking turns from the west and east walls.
 * Beside each mouth — clear of its own channel — stands a bronze valve wheel. Stand on a wheel
 * and it cranks; cranked, its sluice fires a jet down the channel that hurts and *soaks* whoever
 * is in it (soaked: +20% damage taken, slower) for a few seconds. And on the Sluicemaster's own
 * clock, two channels open by themselves. Crank the wheel when he is standing in its channel.
 */
const sluiceWheels = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const HALF = 30;
  const CRANK_MS = 600;
  const WARN_MS = 900;
  const FIRE_MS = 1400;
  const COOL_MS = 4200;
  const SCHEDULE_MS = ctx.hard ? 9000 : 11000;
  const SOAK_MS = 3600;
  const HEAD_SPEED = 950;
  const WHEEL_R = 30;

  interface Channel {
    y: number;
    /** -1: mouth on the west wall, jet runs east. 1: mouth on the east wall. */
    side: -1 | 1;
    wheel: Pt;
    crank: number;
    cranker: Who | null;
    warnAt: number;
    fireAt: number;
    endAt: number;
    readyAt: number;
    hitOnce: Record<Who, boolean>;
    lastTick: Record<Who, number>;
    spin: number;
  }
  const ys = [top + 74, top + 194, top + 314, top + 434];
  const wheelY = [top + 22, top + 134, top + 254, top + 374];
  const channels: Channel[] = ys.map((y, i) => {
    const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
    return {
      y, side, wheel: { x: side < 0 ? 82 : ctx.W - 82, y: wheelY[i] },
      crank: 0, cranker: null, warnAt: 0, fireAt: 0, endAt: 0, readyAt: 0,
      hitOnce: { player: false, npc: false }, lastTick: { player: 0, npc: 0 }, spin: 0,
    };
  });
  const soakedUntil: Record<Who, number> = { player: 0, npc: 0 };
  let nextSchedule = 0;
  let scheduled: number[] = [];
  let nextPair: number[] = [0, 3];

  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const inChannel = (c: Channel, f: Fighter) => Math.abs(f.y - c.y) < HALF + 8;
  const firing = (c: Channel, time: number) => c.fireAt > 0 && time >= c.fireAt && time < c.endAt;
  const armed = (c: Channel, time: number) => c.warnAt > 0 && time < c.endAt;
  const headX = (c: Channel, time: number) => {
    const run = (time - c.fireAt) / 1000 * HEAD_SPEED;
    return c.side < 0 ? 40 + run : ctx.W - 40 - run;
  };
  const passed = (c: Channel, f: Fighter, time: number) => (c.side < 0 ? f.x < headX(c, time) : f.x > headX(c, time));

  const open = (c: Channel, time: number, by: Who | 'clock') => {
    if (armed(c, time)) return;
    c.warnAt = time;
    c.fireAt = time + ctx.tk.warn(WARN_MS);
    c.endAt = c.fireAt + FIRE_MS;
    c.readyAt = c.endAt + COOL_MS;
    c.hitOnce = { player: false, npc: false };
    c.crank = 0;
    c.cranker = null;
    ctx.sfx('gear-turn');
    if (by === 'player') ctx.float(c.wheel.x, c.wheel.y - 36, 'SLUICE OPEN', '#9ae8ff');
    else if (by === 'npc') ctx.float(c.wheel.x, c.wheel.y - 36, 'GRUE OPENS IT', '#ffb08a');
  };

  const pickPair = () => {
    const west = Math.floor(ctx.rng() * 2) * 2; // 0 or 2
    const east = 1 + Math.floor(ctx.rng() * 2) * 2; // 1 or 3
    nextPair = [west, east];
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (nextSchedule === 0) { nextSchedule = time + SCHEDULE_MS * 0.6; pickPair(); }
      // The Sluicemaster's flood schedule: two channels, one from each wall, by the clock.
      if (time >= nextSchedule) {
        nextSchedule = time + SCHEDULE_MS;
        scheduled = [...nextPair];
        for (const i of scheduled) open(channels[i], time, 'clock');
        ctx.banner('THE FLOOD SCHEDULE', '#9ae8ff');
        pickPair();
      }
      for (const c of channels) {
        c.spin += step * (armed(c, time) ? 9 : c.crank > 0 ? 6 : 0.4);
        // Cranking: whoever stands on a ready wheel turns it.
        if (!armed(c, time) && time >= c.readyAt) {
          let on: Who | null = null;
          for (const w of ['player', 'npc'] as const) {
            const f = fighter(w);
            if (alive(f) && dist(f.x, f.y, c.wheel.x, c.wheel.y) < WHEEL_R + 10) { on = w; break; }
          }
          if (on && (c.cranker === null || c.cranker === on)) {
            c.cranker = on;
            c.crank += step * 1000;
            if (Math.floor(c.crank / 150) !== Math.floor((c.crank - step * 1000) / 150)) ctx.sfx('clock-tick');
            if (c.crank >= CRANK_MS) open(c, time, on);
          } else if (!on) {
            c.crank = Math.max(0, c.crank - step * 1500);
            if (c.crank === 0) c.cranker = null;
          }
        }
        if (!firing(c, time)) continue;
        if (time - c.fireAt < 40) ctx.sfx('water-jet');
        for (const w of ['player', 'npc'] as const) {
          const f = fighter(w);
          if (!alive(f) || !inChannel(c, f) || !passed(c, f, time)) continue;
          if (!c.hitOnce[w]) {
            c.hitOnce[w] = true;
            c.lastTick[w] = time;
            ctx.hit(f, 14, f.x, f.y);
            ctx.flash(f.x, f.y, 0x9ae8ff);
            ctx.sfx('splash');
            soakedUntil[w] = time + SOAK_MS;
            ctx.float(f.x, f.y - 46, 'SOAKED', '#9ae8ff');
            continue;
          }
          if (time - c.lastTick[w] > 400) {
            c.lastTick[w] = time;
            ctx.hit(f, 4, f.x, f.y);
            soakedUntil[w] = Math.max(soakedUntil[w], time + SOAK_MS * 0.6);
          }
          // The jet's push — a short shove down the channel.
          ctx.nudge(f, -c.side * 80 * step, 0);
        }
      }
    },
    playerTakenMult() { return ctx.scene.time.now < soakedUntil.player ? 1.2 : 1; },
    npcTakenMult() { return ctx.scene.time.now < soakedUntil.npc ? 1.2 : 1; },
    playerSpeedMult() { return ctx.scene.time.now < soakedUntil.player ? 0.86 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < soakedUntil.npc ? 0.86 : 1; },
    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc, p = ctx.player;
      // Get out of any channel that is about to fire on him — to the nearest dry strip.
      for (const c of channels) {
        if (!armed(c, now) || !inChannel(c, n)) continue;
        const up = c.y - HALF - 30, down = c.y + HALF + 30;
        const y = Math.abs(n.y - up) < Math.abs(n.y - down) && up > top + 10 ? up : down;
        return { x: n.x, y: clampN(y, top + 14, ctx.H - 40) };
      }
      // The player is standing in a channel whose wheel is ready: go and crank it.
      for (const c of channels) {
        if (armed(c, now) || now < c.readyAt || !inChannel(c, p)) continue;
        if (c.cranker === 'player') continue;
        return { x: c.wheel.x, y: c.wheel.y };
      }
      return null;
    },
    drawGround(g, time) {
      for (const c of channels) {
        const x0 = 0, x1 = ctx.W;
        // The trough.
        g.fillStyle(0x020608, 0.7); g.fillRect(x0, c.y - HALF - 4, x1 - x0, HALF * 2 + 8);
        g.fillStyle(0x0e2a34, 0.85); g.fillRect(x0, c.y - HALF, x1 - x0, HALF * 2);
        g.lineStyle(2, 0x3a5a58, 1); g.lineBetween(x0, c.y - HALF - 3, x1, c.y - HALF - 3); g.lineBetween(x0, c.y + HALF + 3, x1, c.y + HALF + 3);
        // Flow arrows showing which way it will run.
        for (let i = 0; i < 7; i++) {
          const ax = 120 + i * 120;
          const d = -c.side;
          g.lineStyle(2, 0x3a6a72, 0.6);
          g.lineBetween(ax - d * 10, c.y - 8, ax + d * 4, c.y); g.lineBetween(ax + d * 4, c.y, ax - d * 10, c.y + 8);
        }
        if (armed(c, time) && time < c.fireAt) {
          // Telegraph: the trough wells up with foam, brighter as the jet comes.
          const k = clampN((time - c.warnAt) / Math.max(1, c.fireAt - c.warnAt), 0, 1);
          g.fillStyle(0x9ae8ff, 0.06 + k * 0.16); g.fillRect(x0, c.y - HALF, x1 - x0, HALF * 2);
          for (let i = 0; i < 18; i++) {
            const fx = (i * 53 + time * 0.08 * -c.side) % ctx.W;
            g.fillStyle(FOAM, 0.15 + k * 0.4); g.fillEllipse((fx + ctx.W) % ctx.W, c.y + ((i * 17) % (HALF * 2 - 10)) - HALF + 5, 18, 4);
          }
          if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xe8ffff, 0.6); g.strokeRect(2, c.y - HALF, ctx.W - 4, HALF * 2); }
        }
        if (firing(c, time)) {
          const hx = clampN(headX(c, time), 0, ctx.W);
          const fromX = c.side < 0 ? 0 : hx, toX = c.side < 0 ? hx : ctx.W;
          g.fillStyle(0x4ab8e0, 0.75); g.fillRect(fromX, c.y - HALF + 2, toX - fromX, HALF * 2 - 4);
          for (let i = 0; i < 22; i++) {
            const fx = ((i * 0.618 + time * 0.003) % 1);
            const x = fromX + fx * (toX - fromX);
            g.fillStyle(0xffffff, 0.45); g.fillEllipse(x, c.y - HALF + 6 + ((i * 11) % (HALF * 2 - 12)), 30, 5);
          }
          // The jet head: a white wall of spray.
          if (hx > 0 && hx < ctx.W) {
            g.fillStyle(0xffffff, 0.8); g.fillEllipse(hx, c.y, 30, HALF * 2 + 14);
            g.fillStyle(FOAM, 0.5); g.fillEllipse(hx - c.side * -18, c.y, 22, HALF * 2 + 24);
          }
        }
      }
      // The valve wheels.
      for (const c of channels) {
        const w = c.wheel;
        const ready = !armed(c, time) && time >= c.readyAt;
        g.fillStyle(0x000000, 0.35); g.fillEllipse(w.x, w.y + 6, 64, 20);
        g.fillStyle(0x1a120a, 1); g.fillCircle(w.x, w.y, WHEEL_R);
        g.lineStyle(5, ready ? 0xb88a3a : 0x5a4a32, 1); g.strokeCircle(w.x, w.y, WHEEL_R - 4);
        for (let k = 0; k < 6; k++) {
          const a = c.spin + (k / 6) * Math.PI * 2;
          g.lineStyle(3, ready ? 0xd8a84a : 0x6a5a3a, 1);
          g.lineBetween(w.x, w.y, w.x + Math.cos(a) * (WHEEL_R - 4), w.y + Math.sin(a) * (WHEEL_R - 4));
          g.fillStyle(ready ? GOLD : 0x6a5a3a, 1); g.fillCircle(w.x + Math.cos(a) * (WHEEL_R - 1), w.y + Math.sin(a) * (WHEEL_R - 1), 3);
        }
        g.fillStyle(0x3a2a12, 1); g.fillCircle(w.x, w.y, 7);
        maresaSigil(g, w.x, w.y, 5, GOLD, 0.8);
        if (c.crank > 0) {
          const k = c.crank / CRANK_MS;
          g.lineStyle(4, c.cranker === 'player' ? 0x9ae8ff : 0xff9a6a, 0.9);
          g.beginPath(); g.arc(w.x, w.y, WHEEL_R + 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else if (!ready) {
          const k = armed(c, time) ? 0 : clampN(1 - (c.readyAt - time) / COOL_MS, 0, 1);
          g.lineStyle(2, 0x6a7a7a, 0.6);
          g.beginPath(); g.arc(w.x, w.y, WHEEL_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else {
          g.lineStyle(2, GOLD, 0.25 + Math.sin(time / 200) * 0.15); g.strokeCircle(w.x, w.y, WHEEL_R + 6);
        }
        // A line of rivets from the wheel to its mouth, so you can see which channel it drives.
        const mx = c.side < 0 ? 18 : ctx.W - 18;
        for (let k = 0; k < 5; k++) {
          const t = k / 4;
          g.fillStyle(ready ? 0xb88a3a : 0x4a3a2a, 0.8);
          g.fillCircle(w.x + (mx - w.x) * t, w.y + (c.y - w.y) * t, 2.4);
        }
      }
      // Soaked fighters drip.
      for (const w of ['player', 'npc'] as const) {
        if (time > soakedUntil[w]) continue;
        const f = fighter(w);
        g.fillStyle(0x4ab8e0, 0.18); g.fillEllipse(f.x, f.y + 12, 46, 14);
      }
    },
    drawAir(g, time) {
      // The bronze fish-head mouths on the walls, jaws opening as their channel arms.
      for (const c of channels) {
        const mx = c.side < 0 ? 16 : ctx.W - 16;
        const s = -c.side;
        const gape = armed(c, time) ? (time < c.fireAt ? clampN((time - c.warnAt) / 600, 0, 1) : 1) : 0.15;
        g.fillStyle(0x2a1e0e, 1); g.fillEllipse(mx, c.y, 40, 56);
        g.fillStyle(0x8a6a2a, 1); g.fillEllipse(mx, c.y, 36, 50);
        g.fillStyle(0x020608, 1); g.fillEllipse(mx + s * 8, c.y, 16, 8 + gape * 26);
        g.fillStyle(0xe8e0c8, 1);
        for (const jaw of [-1, 1]) {
          const jy = c.y + jaw * (4 + gape * 11);
          g.fillTriangle(mx + s * 3, jy, mx + s * 11, jy, mx + s * 7, jy - jaw * 6);
        }
        g.fillStyle(GOLD, 1); g.fillCircle(mx - s * 6, c.y - 14, 2.5);
      }
      for (const w of ['player', 'npc'] as const) {
        if (time > soakedUntil[w]) continue;
        const f = fighter(w);
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 500) + i / 3) % 1;
          g.fillStyle(0x9ae8ff, (1 - ph) * 0.8); g.fillCircle(f.x - 12 + i * 12, f.y - 30 + ph * 40, 2.2);
        }
      }
    },
    drawHud(g, time) {
      // The flood schedule: a brass tide-clock with the next two channels shown as pips.
      const cx = ctx.W / 2, cy = top + 26;
      const left = clampN((nextSchedule - time) / SCHEDULE_MS, 0, 1);
      g.fillStyle(0x0a1418, 0.88); g.fillRoundedRect(cx - 120, cy - 18, 240, 36, 10);
      g.lineStyle(2, 0x8a6a2a, 1); g.strokeRoundedRect(cx - 120, cy - 18, 240, 36, 10);
      g.fillStyle(0x1a2a2e, 1); g.fillCircle(cx, cy, 15);
      g.fillStyle(left < 0.2 ? 0xe8ffff : 0x4ab8e0, 0.9);
      g.slice(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.fillPath();
      for (let i = 0; i < 4; i++) {
        const on = nextPair.includes(i);
        const x = i < 2 ? cx - 92 + i * 30 : cx + 32 + (i - 2) * 30;
        g.fillStyle(on ? (left < 0.2 && Math.floor(time / 120) % 2 ? 0xffffff : 0x9ae8ff) : 0x2a3a3e, 1);
        g.fillRoundedRect(x, cy - 5, 24, 10, 3);
      }
    },
  };
};

// ── Warden 2: The Eel Run ────────────────────────────────────────────

/**
 * An oval race of current runs round the floor and the Wrangler's electric eel swims it. Stand
 * on the race and the current carries you along; touch the eel and it bites and throws you
 * off. Its battery fills as it swims; when it is full the eel discharges and the *whole race* is
 * live for a moment — anyone standing on it is shocked and staggered, the Wrangler included.
 * Ride the race for speed, but be off it when the eel lights up. Better: leave her on it.
 */
const eelRun = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const CX = ctx.W / 2, CY = (top + ctx.H) / 2 + 8;
  const A = 330, B = 188;
  const BAND = 36;
  const FLOW = 118;
  const CHARGE_MS = ctx.hard ? 5600 : 7000;
  const WARN_MS = 1150;
  const LIVE_MS = 800;
  const EEL_SPEED = 0.95; // radians per second round the race
  const EEL_LEN = 0.95;   // radians of body behind the head

  let eelA = Math.PI;
  let chargeFrom = 0;
  let warnAt = 0;
  let liveAt = 0;
  const shockedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const bittenAt: Record<Who, number> = { player: 0, npc: 0 };
  const zappedThisDischarge: Record<Who, boolean> = { player: false, npc: false };
  const sparks: { a: number; t: number }[] = [];

  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const ellipse = (a: number): Pt => ({ x: CX + Math.cos(a) * A, y: CY + Math.sin(a) * B });
  /** Normalised radius of a point against the race: 1 on the centreline. */
  const rnorm = (x: number, y: number) => Math.hypot((x - CX) / A, (y - CY) / B);
  /** Approximate distance off the centreline, in px. */
  const offRace = (x: number, y: number) => {
    const a = Math.atan2((y - CY) / B, (x - CX) / A);
    const p = ellipse(a);
    return { d: dist(x, y, p.x, p.y), a, inside: rnorm(x, y) < 1 };
  };
  const onRace = (f: Fighter) => offRace(f.x, f.y).d < BAND;
  const live = (time: number) => liveAt > 0 && time >= liveAt && time < liveAt + LIVE_MS;
  const warning = (time: number) => warnAt > 0 && time >= warnAt && time < liveAt;
  const charge = (time: number) => (warnAt > 0 ? 1 : clampN((time - chargeFrom) / CHARGE_MS, 0, 1));

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (chargeFrom === 0) chargeFrom = time;
      eelA += EEL_SPEED * step * (warning(time) ? 0.4 : 1);
      // Battery.
      if (warnAt === 0 && time - chargeFrom >= CHARGE_MS) {
        warnAt = time;
        liveAt = time + ctx.tk.warn(WARN_MS);
        zappedThisDischarge.player = false;
        zappedThisDischarge.npc = false;
        ctx.sfx('electric-charge');
        const head = ellipse(eelA);
        ctx.float(head.x, head.y - 40, 'THE EEL IS CHARGED', '#d8f070');
      }
      if (warnAt > 0 && time >= liveAt) {
        if (time - liveAt < 40) { ctx.sfx('thunder'); ctx.scene.cameras.main.shake(180, 0.005); }
        for (const w of ['player', 'npc'] as const) {
          const f = fighter(w);
          if (!alive(f) || zappedThisDischarge[w] || !onRace(f) || !live(time)) continue;
          zappedThisDischarge[w] = true;
          ctx.hit(f, 18, f.x, f.y);
          ctx.flash(f.x, f.y, 0xd8f070);
          shockedUntil[w] = time + 1300;
          ctx.float(f.x, f.y - 50, w === 'npc' ? 'SHE IS ON THE RACE!' : 'SHOCKED', '#d8f070');
          ctx.sfx('status-shock');
        }
        if (time >= liveAt + LIVE_MS) { warnAt = 0; liveAt = 0; chargeFrom = time; }
      }
      // The current carries anyone on the race, counter-clockwise.
      for (const w of ['player', 'npc'] as const) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const o = offRace(f.x, f.y);
        if (o.d >= BAND) continue;
        // Tangent of the ellipse at angle a (direction of increasing a).
        const tx = -Math.sin(o.a) * A, ty = Math.cos(o.a) * B;
        const tl = Math.hypot(tx, ty) || 1;
        ctx.nudge(f, (tx / tl) * FLOW * step, (ty / tl) * FLOW * step);
        // The eel's body: from the head back along the race.
        let rel = (eelA - o.a) % (Math.PI * 2);
        if (rel < 0) rel += Math.PI * 2;
        if (rel < EEL_LEN && time - bittenAt[w] > 900) {
          bittenAt[w] = time;
          ctx.hit(f, 12, f.x, f.y);
          ctx.sfx('trap-snap');
          ctx.float(f.x, f.y - 44, 'BITTEN', '#c8f070');
          // Thrown off the race, the way you were not facing.
          const nx = (f.x - CX) / (A * A), ny = (f.y - CY) / (B * B);
          const nl = Math.hypot(nx, ny) || 1;
          const s = o.inside ? -1 : 1;
          ctx.nudge(f, (nx / nl) * 70 * s, (ny / nl) * 70 * s);
        }
      }
      if (warning(time) && Math.floor(time / 50) % 2 === 0) sparks.push({ a: ctx.rng() * Math.PI * 2, t: time });
      while (sparks.length && time - sparks[0].t > 400) sparks.shift();
    },
    playerSpeedMult() { return ctx.scene.time.now < shockedUntil.player ? 0.5 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < shockedUntil.npc ? 0.5 : 1; },
    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc;
      const o = offRace(n.x, n.y);
      // About to discharge (or will be soon): get off the race, whichever side is nearer.
      if ((warnAt > 0 || charge(now) > 0.82) && o.d < BAND + 30) {
        const k = o.inside ? 0.62 : 1.42;
        return { x: clampN(CX + Math.cos(o.a) * A * k, 60, ctx.W - 60), y: clampN(CY + Math.sin(o.a) * B * k, top + 40, ctx.H - 50) };
      }
      return null;
    },
    drawGround(g, time) {
      // The race: a ring of dark running water with a lit centreline.
      const steps = 64;
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
        const p0 = ellipse(a0), p1 = ellipse(a1);
        g.lineStyle(BAND * 2, 0x0a2a34, 0.85); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
      for (let i = 0; i < steps; i++) {
        const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
        const p0 = ellipse(a0), p1 = ellipse(a1);
        const lt = live(time);
        g.lineStyle(lt ? 8 : 2, lt ? 0xf0ff9a : 0x3a7a8a, lt ? 0.85 : 0.6); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
      // Edges.
      for (const kk of [-1, 1]) {
        g.lineStyle(2, 0x5a8a8a, 0.6);
        g.beginPath();
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const p = ellipse(a);
          const nx = (p.x - CX) / (A * A), ny = (p.y - CY) / (B * B);
          const nl = Math.hypot(nx, ny) || 1;
          const x = p.x + (nx / nl) * BAND * kk, y = p.y + (ny / nl) * BAND * kk;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
      // Flow chevrons travelling with the current.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + (time / 1000) * (FLOW / ((A + B) / 2));
        const p = ellipse(a), q = ellipse(a + 0.06);
        const tx = q.x - p.x, ty = q.y - p.y, tl = Math.hypot(tx, ty) || 1;
        const ux = tx / tl, uy = ty / tl;
        g.lineStyle(2, FOAM, 0.35);
        g.lineBetween(p.x - ux * 8 - uy * 8, p.y - uy * 8 + ux * 8, p.x, p.y);
        g.lineBetween(p.x - ux * 8 + uy * 8, p.y - uy * 8 - ux * 8, p.x, p.y);
      }
      // Warning: the race fizzes yellow, brighter as the discharge comes.
      if (warning(time)) {
        const w = clampN((time - warnAt) / Math.max(1, liveAt - warnAt), 0, 1);
        for (let i = 0; i < steps; i += 2) {
          const p = ellipse((i / steps) * Math.PI * 2);
          g.fillStyle(0xd8f070, 0.08 + w * 0.22); g.fillCircle(p.x, p.y, BAND * 0.9);
        }
      }
      // The sand island in the middle and its grounding post, a hint that inside is dry.
      g.fillStyle(0x3a4a42, 0.5); g.fillEllipse(CX, CY, (A - BAND - 10) * 2, (B - BAND - 10) * 2);
      g.lineStyle(2, 0x6a7a5a, 0.4); g.strokeEllipse(CX, CY, (A - BAND - 10) * 2, (B - BAND - 10) * 2);
      maresaSigil(g, CX, CY, 30, 0x5a6a52, 0.6);
      // Shocked fighters.
      for (const w of ['player', 'npc'] as const) {
        if (time > shockedUntil[w]) continue;
        const f = fighter(w);
        g.lineStyle(2, 0xd8f070, 0.6); g.strokeCircle(f.x, f.y + 8, 24 + Math.sin(time / 40) * 3);
      }
    },
    drawAir(g, time) {
      // The eel: a long body following the race, banded green-black, glowing as it charges.
      const k = charge(time);
      const segs = 18;
      for (let i = segs; i >= 0; i--) {
        const a = eelA - (i / segs) * EEL_LEN;
        const p = ellipse(a);
        const wv = Math.sin(time / 90 + i * 0.8) * 5;
        const nx = (p.x - CX) / (A * A), ny = (p.y - CY) / (B * B);
        const nl = Math.hypot(nx, ny) || 1;
        const x = p.x + (nx / nl) * wv, y = p.y + (ny / nl) * wv;
        const w = 7 + (1 - i / segs) * 9;
        g.fillStyle(0x0e1e16, 1); g.fillCircle(x, y, w + 2);
        g.fillStyle(i % 3 === 0 ? 0x1e3a22 : 0x3a6a3a, 1); g.fillCircle(x, y, w);
        if (k > 0.5) { g.fillStyle(0xd8f070, (k - 0.5) * 1.4 * (i % 2 ? 0.6 : 0.3)); g.fillCircle(x, y, w * 0.5); }
      }
      const head = ellipse(eelA);
      const ahead = ellipse(eelA + 0.05);
      const ha = Math.atan2(ahead.y - head.y, ahead.x - head.x);
      g.fillStyle(0x0e1e16, 1); g.fillEllipse(head.x, head.y, 40, 28);
      g.fillStyle(0x3a6a3a, 1); g.fillEllipse(head.x, head.y, 34, 22);
      const ex = head.x + Math.cos(ha) * 8 - Math.sin(ha) * 6, ey = head.y + Math.sin(ha) * 8 + Math.cos(ha) * 6;
      g.fillStyle(0xf0ff9a, 1); g.fillCircle(ex, ey, 4);
      g.fillStyle(0x000000, 1); g.fillCircle(ex, ey, 1.6);
      g.fillStyle(0xe8e0c8, 1);
      g.fillTriangle(head.x + Math.cos(ha) * 20, head.y + Math.sin(ha) * 20, head.x + Math.cos(ha + 0.5) * 12, head.y + Math.sin(ha + 0.5) * 12, head.x + Math.cos(ha - 0.5) * 12, head.y + Math.sin(ha - 0.5) * 12);
      // Sparks crawling the race during the warning, bolts when it is live.
      for (const s of sparks) {
        const p = ellipse(s.a);
        const f = 1 - (time - s.t) / 400;
        g.lineStyle(2, 0xf0ff9a, f);
        g.lineBetween(p.x, p.y, p.x + Math.sin(s.t) * 14, p.y - 10 - Math.cos(s.t) * 8);
      }
      if (live(time)) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + time / 300;
          const p = ellipse(a), q = ellipse(a + 0.32);
          g.lineStyle(3, 0xffffff, 0.8);
          g.lineBetween(p.x, p.y, (p.x + q.x) / 2 + Math.sin(time / 20 + i) * 14, (p.y + q.y) / 2 + Math.cos(time / 25 + i) * 14);
          g.lineBetween((p.x + q.x) / 2 + Math.sin(time / 20 + i) * 14, (p.y + q.y) / 2 + Math.cos(time / 25 + i) * 14, q.x, q.y);
        }
      }
    },
    drawHud(g, time) {
      // The eel's battery: a glass jar of light filling to the discharge.
      const k = charge(time);
      const x = ctx.W / 2 - 110, y = top + 20;
      g.fillStyle(0x0a1418, 0.88); g.fillRoundedRect(x - 10, y - 10, 240, 26, 8);
      g.lineStyle(2, 0x3a6a3a, 1); g.strokeRoundedRect(x - 10, y - 10, 240, 26, 8);
      g.fillStyle(0x1a2a1a, 1); g.fillRoundedRect(x, y - 3, 220, 12, 5);
      const col = warnAt > 0 ? (Math.floor(time / 80) % 2 ? 0xffffff : 0xf0ff9a) : lit(0x6a9a3a, k * 0.5);
      g.fillStyle(col, 1); g.fillRoundedRect(x, y - 3, 220 * k, 12, 5);
      for (let i = 1; i < 6; i++) { g.fillStyle(0x0a1418, 0.7); g.fillRect(x + i * 36.6, y - 3, 2, 12); }
    },
  };
};

// ── Warden 3: Last Breath ────────────────────────────────────────────

/**
 * The gallery is under, and both of you are holding your breath. Breath drains; at nothing you
 * drown, a little at a time. The Bell-Diver's great bronze bell hangs in the water with a pocket
 * of air beneath it — under it, breath comes back fast — but the bell holds one: crowd it and
 * neither of you breathes. Pockets of air bubble up from the floor now and then; a heavy hit
 * knocks the breath out of whoever takes it. Knock him out of his own bell.
 */
const lastBreath = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const DRAIN = ctx.hard ? 8.5 : 7;
  const REFILL = 42;
  const BELL_R = 58;
  const MOVE_MS = 8000;
  const DRIFT_MS = 1800;
  const POCKET_EVERY = 2900;
  const POCKET_LIFE = 2600;
  const POCKET_R = 30;

  const breath: Record<Who, number> = { player: 100, npc: 100 };
  const lastDrown: Record<Who, number> = { player: 0, npc: 0 };
  const lastGasp: Record<Who, number> = { player: 0, npc: 0 };
  let bell: Pt = { x: ctx.W / 2, y: (top + ctx.H) / 2 + 10 };
  let bellFrom: Pt = { ...bell };
  let bellTo: Pt = { ...bell };
  let moveAt = 0;
  let driftAt = 0;
  let crowded = false;
  let nextPocket = 0;
  interface Pocket { x: number; y: number; born: number; riseAt: number; taken: boolean }
  const pockets: Pocket[] = [];
  const gasps: { x: number; y: number; t: number }[] = [];

  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const under = (f: Fighter) => alive(f) && dist(f.x, f.y, bell.x, bell.y) < BELL_R;
  const pickSpot = (): Pt => {
    let best = { x: ctx.W / 2, y: (top + ctx.H) / 2 };
    let score = -1;
    for (let i = 0; i < 8; i++) {
      const c = { x: 140 + ctx.rng() * (ctx.W - 280), y: top + 110 + ctx.rng() * (ctx.H - top - 200) };
      const s = Math.min(dist(c.x, c.y, bell.x, bell.y), 420) - Math.abs(dist(c.x, c.y, bell.x, bell.y) - 300) * 0.3;
      if (s > score) { score = s; best = c; }
    }
    return best;
  };

  const gasp = (w: Who, amount: number) => {
    const now = ctx.scene.time.now;
    if (amount < 6 || now - lastGasp[w] < 300) return;
    lastGasp[w] = now;
    const f = fighter(w);
    breath[w] = Math.max(0, breath[w] - 6);
    gasps.push({ x: f.x, y: f.y - 20, t: now });
    // A hit under the bell knocks you out of it.
    if (dist(f.x, f.y, bell.x, bell.y) < BELL_R) {
      const a = Math.atan2(f.y - bell.y, f.x - bell.x);
      ctx.nudge(f, Math.cos(a) * 46, Math.sin(a) * 46);
      ctx.float(f.x, f.y - 50, w === 'npc' ? 'OUT OF HIS BELL!' : 'KNOCKED OUT', '#e8ffff');
    }
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (moveAt === 0) { moveAt = time + MOVE_MS; bellTo = pickSpot(); nextPocket = time + 1500; }
      // The bell is winched to its next mooring on a clock; you see where it is going first.
      if (time >= moveAt) {
        moveAt = time + MOVE_MS;
        bellFrom = { ...bell };
        driftAt = time;
        ctx.sfx('chain');
      }
      if (driftAt > 0) {
        const k = clampN((time - driftAt) / DRIFT_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        bell = { x: bellFrom.x + (bellTo.x - bellFrom.x) * e, y: bellFrom.y + (bellTo.y - bellFrom.y) * e };
        if (k >= 1) { driftAt = 0; bellTo = pickSpot(); }
      }
      // Breath.
      const pu = under(ctx.player), nu = under(ctx.npc);
      crowded = pu && nu;
      for (const w of ['player', 'npc'] as const) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const isUnder = w === 'player' ? pu : nu;
        if (isUnder && !crowded) breath[w] = Math.min(100, breath[w] + REFILL * step);
        else breath[w] = Math.max(0, breath[w] - DRAIN * step);
        if (breath[w] <= 0 && time - lastDrown[w] > 500) {
          lastDrown[w] = time;
          ctx.hit(f, 4, f.x, f.y);
          if (Math.floor(time / 500) % 4 === 0) ctx.float(f.x, f.y - 46, 'DROWNING', '#9ac8ff');
          ctx.sfx('bubble');
        }
      }
      // Air pockets welling up from the floor.
      if (time >= nextPocket) {
        nextPocket = time + POCKET_EVERY;
        const x = 90 + ctx.rng() * (ctx.W - 180), y = top + 70 + ctx.rng() * (ctx.H - top - 130);
        pockets.push({ x, y, born: time, riseAt: time + ctx.tk.warn(900), taken: false });
      }
      for (const p of pockets) {
        if (p.taken || time < p.riseAt) continue;
        for (const w of ['player', 'npc'] as const) {
          const f = fighter(w);
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > POCKET_R + 12) continue;
          p.taken = true;
          breath[w] = Math.min(100, breath[w] + 28);
          ctx.float(p.x, p.y - 30, w === 'player' ? '+AIR' : 'he gulps it', w === 'player' ? '#e8ffff' : '#ffc89a');
          ctx.sfx('bubble');
          break;
        }
      }
      for (let i = pockets.length - 1; i >= 0; i--) {
        if (pockets[i].taken || time > pockets[i].riseAt + POCKET_LIFE) pockets.splice(i, 1);
      }
      while (gasps.length && time - gasps[0].t > 700) gasps.shift();
    },
    onPlayerHurt(amount) { gasp('player', amount); },
    onNpcHurt(amount) { gasp('npc', amount); },
    playerSpeedMult() { return breath.player <= 0 ? 0.82 : 1; },
    npcSpeedMult() { return breath.npc <= 0 ? 0.82 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const now = ctx.scene.time.now;
      // Low: breathe — the nearest live pocket if it is much closer, else the bell.
      if (breath.npc < 48 || (under(n) && breath.npc < 96)) {
        let best: Pocket | null = null;
        let bd = dist(n.x, n.y, bell.x, bell.y) * 0.6;
        for (const pk of pockets) {
          if (pk.taken || now < pk.riseAt) continue;
          const d = dist(n.x, n.y, pk.x, pk.y);
          if (d < bd) { bd = d; best = pk; }
        }
        return best ? { x: best.x, y: best.y } : { x: bell.x, y: bell.y };
      }
      // Healthy and you are breathing: crowd you out of the bell.
      if (under(p) && breath.player < 80) return { x: bell.x, y: bell.y };
      return null;
    },
    drawGround(g, time) {
      // Deep water over everything: a blue wash and drowned light.
      g.fillStyle(0x0a2a4a, 0.22); g.fillRect(0, top, ctx.W, ctx.H - top);
      for (let i = 0; i < 10; i++) {
        const x = ((i * 113 + time * 0.012) % ctx.W);
        g.fillStyle(0xbff8ff, 0.03); g.fillTriangle(x - 20, top, x + 30, top, x + 90, ctx.H);
      }
      // Where the bell is going next.
      if (driftAt === 0) {
        const left = clampN((moveAt - time) / MOVE_MS, 0, 1);
        g.lineStyle(2, GOLD, 0.15 + (1 - left) * 0.45);
        g.strokeCircle(bellTo.x, bellTo.y, BELL_R * (0.5 + (1 - left) * 0.5));
        for (let k = 0; k < 10; k++) {
          const t = k / 10;
          g.fillStyle(GOLD, 0.12 + (1 - left) * 0.2);
          g.fillCircle(bell.x + (bellTo.x - bell.x) * t, bell.y + (bellTo.y - bell.y) * t, 2);
        }
      }
      // The air under the bell: a silver dome on the floor.
      g.fillStyle(crowded ? 0xff9a6a : 0xe8ffff, crowded ? 0.16 : 0.14); g.fillCircle(bell.x, bell.y, BELL_R);
      g.lineStyle(2, crowded ? 0xff9a6a : 0xe8ffff, 0.5 + Math.sin(time / 200) * 0.2); g.strokeCircle(bell.x, bell.y, BELL_R);
      // Pockets: a ring welling up, then a fat silver bubble.
      for (const p of pockets) {
        if (time < p.riseAt) {
          const k = clampN((time - p.born) / Math.max(1, p.riseAt - p.born), 0, 1);
          g.lineStyle(2, 0xe8ffff, 0.2 + k * 0.5); g.strokeCircle(p.x, p.y, POCKET_R * (1.6 - k * 0.6));
          for (let i = 0; i < 3; i++) { g.fillStyle(0xe8ffff, 0.4 * k); g.fillCircle(p.x + Math.sin(time / 90 + i * 2) * 10, p.y - i * 5, 2); }
        } else {
          g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x, p.y + 8, POCKET_R * 1.6, 10);
        }
      }
    },
    drawAir(g, time) {
      for (const p of pockets) {
        if (time < p.riseAt) continue;
        const left = 1 - (time - p.riseAt) / POCKET_LIFE;
        const wob = 1 + Math.sin(time / 120 + p.x) * 0.08;
        g.fillStyle(0xe8ffff, 0.2); g.fillEllipse(p.x, p.y - 6, POCKET_R * 2 * wob, POCKET_R * 1.7 / wob);
        g.lineStyle(2, 0xffffff, 0.5 + left * 0.3); g.strokeEllipse(p.x, p.y - 6, POCKET_R * 2 * wob, POCKET_R * 1.7 / wob);
        g.fillStyle(0xffffff, 0.7); g.fillEllipse(p.x - 10, p.y - 18, 10, 5);
      }
      // The bell: hung from a chain to the surface, a bronze dome with a porthole.
      const bx = bell.x, by = bell.y - 34;
      g.lineStyle(3, 0x3a3a32, 1);
      for (let y = top; y < by - 40; y += 10) g.strokeEllipse(bx + Math.sin(time / 600 + y * 0.02) * 2, y, 4, 8);
      g.fillStyle(0x3a2a12, 1); g.fillEllipse(bx, by + 30, BELL_R * 1.7, 16);
      g.fillStyle(0x6a4a1e, 1);
      g.fillRoundedRect(bx - 44, by - 34, 88, 62, { tl: 40, tr: 40, bl: 6, br: 6 });
      g.fillStyle(0x9a6a2a, 1);
      g.fillRoundedRect(bx - 38, by - 30, 30, 54, { tl: 30, tr: 0, bl: 4, br: 0 });
      g.fillStyle(0x4a3212, 1); g.fillRect(bx - 48, by + 22, 96, 8);
      g.fillStyle(0x2a1a0a, 1); g.fillCircle(bx + 8, by - 6, 13);
      g.fillStyle(crowded ? 0xff9a6a : 0xffe08a, 0.75); g.fillCircle(bx + 8, by - 6, 10);
      g.lineStyle(2, 0x2a1a0a, 1); g.lineBetween(bx - 2, by - 6, bx + 18, by - 6); g.lineBetween(bx + 8, by - 16, bx + 8, by + 4);
      for (let k = 0; k < 7; k++) { g.fillStyle(0xc8a050, 1); g.fillCircle(bx - 36 + k * 12, by + 26, 2); }
      // Breath escaping under the rim.
      for (let i = 0; i < 4; i++) {
        const ph = ((time / 700) + i / 4) % 1;
        g.lineStyle(1.5, 0xe8ffff, (1 - ph) * 0.7);
        g.strokeCircle(bx - 40 + i * 26 + Math.sin(time / 200 + i) * 6, by + 30 - ph * 90, 3 + ph * 4);
      }
      // Each fighter's breath, as a row of bubbles over the head.
      for (const w of ['player', 'npc'] as const) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const n = Math.ceil(breath[w] / 20);
        for (let i = 0; i < 5; i++) {
          const x = f.x - 22 + i * 11, y = f.y - 60;
          if (i < n) {
            g.fillStyle(breath[w] < 25 ? 0xff9a8a : 0xe8ffff, 0.85); g.fillCircle(x, y, 4);
            g.fillStyle(0xffffff, 1); g.fillCircle(x - 1.2, y - 1.2, 1.2);
          } else {
            g.lineStyle(1, 0x6a8a9a, 0.6); g.strokeCircle(x, y, 3.5);
          }
        }
      }
      for (const gs of gasps) {
        const k = (time - gs.t) / 700;
        for (let i = 0; i < 4; i++) {
          g.lineStyle(1.5, 0xe8ffff, 1 - k);
          g.strokeCircle(gs.x + (i - 1.5) * 8 + Math.sin(i * 3) * 4, gs.y - k * 50 - i * 5, 3 + k * 3);
        }
      }
    },
    drawHud(g, time) {
      // Two breath gauges either side of a little bell icon.
      const cx = ctx.W / 2, cy = top + 24;
      g.fillStyle(0x0a1418, 0.88); g.fillRoundedRect(cx - 160, cy - 15, 320, 30, 10);
      g.lineStyle(2, 0x8a6a2a, 1); g.strokeRoundedRect(cx - 160, cy - 15, 320, 30, 10);
      g.fillStyle(0x6a4a1e, 1); g.fillRoundedRect(cx - 10, cy - 10, 20, 18, { tl: 9, tr: 9, bl: 2, br: 2 });
      if (crowded && Math.floor(time / 150) % 2 === 0) { g.lineStyle(2, 0xff9a6a, 1); g.strokeCircle(cx, cy, 14); }
      g.fillStyle(0x1a2a30, 1); g.fillRoundedRect(cx - 148, cy - 5, 124, 10, 4); g.fillRoundedRect(cx + 24, cy - 5, 124, 10, 4);
      g.fillStyle(breath.player < 25 ? 0xff9a8a : 0xe8ffff, 1); g.fillRoundedRect(cx - 24 - 124 * (breath.player / 100), cy - 5, 124 * (breath.player / 100), 10, 4);
      g.fillStyle(breath.npc < 25 ? 0xff9a8a : 0xffc89a, 1); g.fillRoundedRect(cx + 24, cy - 5, 124 * (breath.npc / 100), 10, 4);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const UNDERTOW_GIMMICKS: GimmickDef[] = [
  {
    id: 'undertow-sluice-wheels',
    rules: 'Stand on a valve wheel to open its sluice: the jet soaks whoever is in that channel (+20% taken). Two open by the clock.',
    make: sluiceWheels,
  },
  {
    id: 'undertow-eel-run',
    rules: 'The current race carries you and the eel swims it. When its battery fills, the whole race is live — be off it.',
    make: eelRun,
  },
  {
    id: 'undertow-last-breath',
    rules: 'Breath drains; at zero you drown. Refill under the bell (it holds one) or in rising air. Heavy hits knock breath out.',
    make: lastBreath,
  },
];

export const UNDERTOW_WARDENS: EncounterDef[] = [
  {
    id: 'undertow-warden-1', court: 'undertow', name: 'The Sluice Wheels',
    foeName: 'Sluicemaster Haddon Grue', foeElement: 'pressure', difficulty: 5, hpMult: 1.1,
    gimmick: 'undertow-sluice-wheels', at: { x: 900, y: 1830 }, coins: 100,
    look: { body: 0x8a9a8a, accent: 0x3a4a3a, hat: 'goggles', traits: ['apron', 'tool', 'beard'], size: 1.3, eye: 0x7ad8f0 },
    challenge: [
      'Twice a day for twenty-two years I have let the sea in on time. Never a minute late. Never a minute early.',
      'You are not on my schedule. The schedule does not like things that are not on it.',
      'Stand in a channel, would you? I have a wheel that wants turning.',
    ],
    beaten: [
      'You opened my sluices on me. On ME. ...It is a good feeling, isn\'t it? I always wondered.',
      'The clock is broken. The tide will just have to come when it likes. Like it used to.',
    ],
  },
  {
    id: 'undertow-warden-2', court: 'undertow', name: 'The Eel Run',
    foeName: 'Eel-Wrangler Sessaly Voss', foeElement: 'electricity', difficulty: 5, hpMult: 1.15,
    gimmick: 'undertow-eel-run', at: { x: 900, y: 1070 }, coins: 100,
    look: { body: 0xb89a8a, accent: 0x1a3a3a, hat: 'bandana', traits: ['eyepatch', 'scarf', 'tool'], size: 1.0, eye: 0xd8f070 },
    challenge: [
      'Easy, girl. Easy. It\'s only a visitor. ...She has not eaten since the Tide Guard. She is excited to meet you.',
      'Mind the race. She swims it, and when she is full she lets go, and anything standing in her water lights up.',
      'I lost the eye to her in the first week. We understand each other now.',
    ],
    beaten: [
      'Hush, girl. Hush. ...She has stopped. She is just going round and round. I think she is tired too.',
    ],
  },
  {
    id: 'undertow-warden-3', court: 'undertow', name: 'Last Breath',
    foeName: 'Bell-Diver Hollis Mire', foeElement: 'air', difficulty: 5, hpMult: 1.2,
    gimmick: 'undertow-last-breath', at: { x: 900, y: 420 }, coins: 100,
    look: { body: 0x9a8a7a, accent: 0x6a5a2a, hat: 'diving', traits: ['pack', 'lantern'], size: 1.2, eye: 0xffe08a },
    challenge: [
      'Every breath in this gallery passes through my bell. The Queen lets me keep one. Just the one.',
      'You came down here breathing like it was free. Down here, it is tithed. Hold it. Hold it. Go on.',
    ],
    beaten: [
      '...take the bell. There is enough air in it for everyone. There always was. She just said there wasn\'t.',
      'She is past the rime-gate. Go on up. And breathe, for pity\'s sake. Breathe out loud.',
    ],
  },
];
