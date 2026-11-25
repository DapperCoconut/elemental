import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { poly, rivets } from '../art';
import {
  BRICK, BRICK_DARK, BRICK_LIT, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT,
  IRON_SHEEN, OCHRE, QUENCH_LIT,
} from '../palette';
import { alive, clamp, dist, heatColor, segsCross, stepDt } from '../util';
import { hurt, onFloor } from './kit';

/**
 * The Glare of Number Two — Bryony Stithy, Keeper of the Second Furnace. When a blast furnace is
 * tapped the open hole throws a heat you feel across the whole cast-house; the hands work behind
 * wheeled iron screens. In the King's telling Bryony decides who gets a screen on tapping night.
 *
 * Two tap-holes are set in the furnace face along the top of the yard. One at a time (both at once
 * past half) the keeper's bar goes into a clay plug, it glows, and the hole is **opened**: radiant
 * heat floods every line of sight from that hole and **burns whoever it can see**, tick by tick,
 * until the hole is botted shut again.
 * - **Screens** stand on rails across the yard. A screen casts a cool shadow away from an open hole —
 *   stand in it. The shadows are drawn, and so is the line from each hole to each fighter.
 * - **A screen heats** while it shelters someone. White-hot, it lets the glare through for a while.
 * - **Strike a screen** to roll it along its rail away from you — roll her shadow out from under her,
 *   or your own into place.
 * The bot takes the nearest cool shadow before a tapping and keeps you out of it if it can.
 */

const ID = fallenId('forge', 'glare');
const IDLE_MS = 3000;
const WARN_MS = 1700;
const OPEN_MS = 2800;
const TICK_MS = 500;
const BURN = 6;
const PANEL = 84;
const ROLL = 110;
const HEAT_RATE = 0.3;
const WHITE_MS = 4000;

interface Screen { x: number; y: number; heat: number; whiteUntil: number; t: StrikeTarget; rolledAt: number; rollFrom: number }
interface Tap { x: number; y: number }

/** A wheeled heat-screen: a riveted iron plate on a timber-and-iron frame, two cast wheels on the rail. */
function heatScreen(g: G, s: Screen, time: number, white: boolean): void {
  const roll = clamp((time - s.rolledAt) / 260, 0, 1);
  const x = s.rollFrom + (s.x - s.rollFrom) * (1 - (1 - roll) ** 2);
  const y = s.y;
  shadow(g, x, y + 4, PANEL + 10, 14, 0.4);
  for (const dx of [-PANEL / 2 + 10, PANEL / 2 - 10]) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + dx, y - 2, 7);
    g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(x + dx, y - 2, 7);
    const a = (x / 7) % (Math.PI * 2);
    g.lineBetween(x + dx - Math.cos(a) * 6, y - 2 - Math.sin(a) * 6, x + dx + Math.cos(a) * 6, y - 2 + Math.sin(a) * 6);
  }
  const k = white ? 1 : s.heat;
  const plate = white ? HEAT_WHITE : k > 0.25 ? heatColor(k * 0.7) : IRON;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - PANEL / 2, y - 46, PANEL, 40);
  g.fillStyle(plate, 1); g.fillRect(x - PANEL / 2 + 3, y - 43, PANEL - 6, 34);
  g.fillStyle(IRON_SHEEN, white ? 0.2 : 0.45); g.fillRect(x - PANEL / 2 + 3, y - 43, PANEL - 6, 3);
  rivets(g, x - PANEL / 2 + 6, y - 40, x + PANEL / 2 - 6, y - 40, 6, 1.3);
  rivets(g, x - PANEL / 2 + 6, y - 12, x + PANEL / 2 - 6, y - 12, 6, 1.3);
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x, y - 46, x, y - 56); g.lineBetween(x - 12, y - 56, x + 12, y - 56);
  if (k > 0.5) glow(g, x, y - 26, 30 + k * 20, white ? HEAT_WHITE : HEAT_ORANGE, 0.03 + k * 0.04, 3);
}

/** A tap-hole in the furnace's brick breast: arch, clay plug, and — open — a white mouth spilling iron. */
function tapHole(g: G, t: Tap, warnK: number, open: boolean, time: number): void {
  g.fillStyle(BRICK_DARK, 1); g.fillRect(t.x - 46, t.y - 30, 92, 42);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    g.fillStyle((r + c) % 2 ? BRICK : BRICK_LIT, 1);
    g.fillRect(t.x - 44 + c * 15 + (r % 2) * 7, t.y - 28 + r * 10, 13, 8);
  }
  g.fillStyle(0x140806, 1); g.fillCircle(t.x, t.y + 2, 13);
  if (open) {
    g.fillStyle(HEAT_WHITE, 1); g.fillCircle(t.x, t.y + 2, 11);
    glow(g, t.x, t.y + 2, 70 + Math.sin(time / 40) * 6, HEAT_YELLOW, 0.09, 4);
    g.fillStyle(HEAT_YELLOW, 1); g.fillRect(t.x - 5, t.y + 10, 10, 18);
    g.fillStyle(HEAT_WHITE, 0.8); g.fillRect(t.x - 2, t.y + 10, 4, 18);
  } else {
    g.fillStyle(warnK > 0 ? heatColor(warnK * 0.8) : OCHRE, 1); g.fillCircle(t.x, t.y + 2, 10);
    if (warnK > 0) {
      // The keeper's tap bar driven into the plug, sparking.
      g.lineStyle(4, IRON_DARK, 1); g.lineBetween(t.x + 10, t.y + 2, t.x + 60, t.y + 34);
      g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(t.x + 10, t.y + 1, t.x + 60, t.y + 33);
      for (let i = 0; i < 4; i++) {
        const ph = (time / 200 + i / 4) % 1;
        g.fillStyle(HEAT_YELLOW, 1 - ph); g.fillCircle(t.x + 8 + ph * 20 * Math.cos(i), t.y + 6 + ph * 14, 1.6);
      }
    }
  }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const taps: Tap[] = [{ x: W * 0.27, y: top + 22 }, { x: W * 0.73, y: top + 22 }];
  const rails = [top + 190, (top + H) / 2 + 40, H - 80];
  const screens: Screen[] = [];
  const tickAt = new Map<Fighter, number>();
  let phase: 'idle' | 'warn' | 'open' = 'idle';
  let phaseAt = 0;
  let which = 0;
  let late = false;
  let started = false;
  let now = 0;

  const active = (): Tap[] => (late ? taps : [taps[which]]);
  const white = (s: Screen) => now < s.whiteUntil;
  const panelBlocks = (s: Screen, t: Tap, x: number, y: number) =>
    !white(s) && segsCross(t.x, t.y, x, y, s.x - PANEL / 2, s.y - 26, s.x + PANEL / 2, s.y - 26);
  const shieldOf = (t: Tap, x: number, y: number) => screens.find((s) => panelBlocks(s, t, x, y)) ?? null;
  const exposedTo = (x: number, y: number) => active().filter((t) => !shieldOf(t, x, y));

  function roll(s: Screen, by: Fighter): void {
    if (now - s.rolledAt < 300) return;
    const dir = by.x <= s.x ? 1 : -1;
    const nx = clamp(s.x + dir * ROLL, PANEL / 2 + 20, W - PANEL / 2 - 20);
    s.rollFrom = s.x;
    s.rolledAt = now;
    s.x = nx;
    s.t.moveTo(nx, s.y - 26);
    ctx.sfx('gear-turn');
  }

  /** The bot's cool spot: just behind a screen from every hole that is (or is about to be) open. */
  function coolSpot(): Pt | null {
    const n = ctx.npc, p = ctx.player;
    let best: Pt | null = null, bestS = 1e9;
    for (const s of screens) {
      if (white(s) || s.heat > 0.85) continue;
      const src = active();
      const sx = src.reduce((a, t) => a + t.x, 0) / src.length, sy = src.reduce((a, t) => a + t.y, 0) / src.length;
      const a = Math.atan2(s.y - 26 - sy, s.x - sx);
      const q = onFloor(ctx, s.x + Math.cos(a) * 38, s.y - 26 + Math.sin(a) * 38 + 18);
      if (exposedTo(q.x, q.y).length) continue;
      const sc = dist(q.x, q.y, n.x, n.y) + (dist(q.x, q.y, p.x, p.y) < 70 ? 400 : 0);
      if (sc < bestS) { bestS = sc; best = q; }
    }
    return best;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        phaseAt = time;
        [[W * 0.3, rails[0]], [W * 0.68, rails[1]], [W * 0.4, rails[2]]].forEach(([x, y]) => {
          const s: Screen = { x, y, heat: 0, whiteUntil: 0, rolledAt: -1e9, rollFrom: x, t: null as unknown as StrikeTarget };
          s.t = ctx.target({ x, y: y - 26, r: 30, onStruck: (by) => roll(s, by === 'player' ? ctx.player : ctx.npc) });
          screens.push(s);
        });
      }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        ctx.banner('BOTH HOLES TAPPED', '#ffe2a8');
      }
      const elapsed = time - phaseAt;
      if (phase === 'idle' && elapsed >= IDLE_MS) { phase = 'warn'; phaseAt = time; ctx.sfx('clang'); }
      else if (phase === 'warn' && elapsed >= WARN_MS) { phase = 'open'; phaseAt = time; ctx.sfx('flame-burst'); }
      else if (phase === 'open' && elapsed >= OPEN_MS) {
        phase = 'idle'; phaseAt = time; which = 1 - which; ctx.sfx('stone-slam');
      }
      for (const s of screens) if (s.whiteUntil && time >= s.whiteUntil) { s.whiteUntil = 0; s.heat = 0.3; }
      if (phase !== 'open') return;
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        for (const t of active()) {
          const sh = shieldOf(t, f.x, f.y);
          if (sh) {
            sh.heat = Math.min(1, sh.heat + HEAT_RATE * dt / active().length);
            if (sh.heat >= 1) { sh.whiteUntil = time + WHITE_MS; ctx.flash(sh.x, sh.y - 26, HEAT_WHITE); ctx.sfx('sizzle'); }
          }
        }
        if (exposedTo(f.x, f.y).length && time - (tickAt.get(f) ?? -1e9) >= TICK_MS) {
          tickAt.set(f, time);
          hurt(ctx, f, BURN * exposedTo(f.x, f.y).length);
        }
      }
    },

    npcSeek() {
      if (phase !== 'idle' || time2Warn() < 900) {
        const c = coolSpot();
        if (c) return c;
      }
      const p = ctx.player, n = ctx.npc;
      return onFloor(ctx, p.x + (n.x < p.x ? -120 : 120), p.y + 20);
    },

    drawGround(g, time) {
      // The rails the screens run on.
      for (const y of rails) {
        for (const o of [-4, 4]) { g.lineStyle(2.5, IRON_DARK, 0.8); g.lineBetween(20, y + o, W - 20, y + o); }
        for (let x = 30; x < W - 20; x += 34) { g.fillStyle(IRON, 0.5); g.fillRect(x, y - 7, 5, 14); }
      }
      if (phase === 'idle') return;
      const k = phase === 'warn' ? (time - phaseAt) / WARN_MS : 1;
      // Each screen's cool shadow away from each hole being tapped.
      for (const t of active()) {
        for (const s of screens) {
          if (white(s)) continue;
          const A = { x: s.x - PANEL / 2, y: s.y - 26 }, B = { x: s.x + PANEL / 2, y: s.y - 26 };
          const far = (p: Pt) => ({ x: p.x + (p.x - t.x) * 6, y: p.y + (p.y - t.y) * 6 });
          poly(g, [A, B, far(B), far(A)], QUENCH_LIT, 0.08 + k * 0.1);
        }
        // The glare itself: a haze over everything the hole can see.
        if (phase === 'open') {
          for (let i = 0; i < 7; i++) {
            const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7 + Math.sin(time / 300 + i) * 0.02;
            g.lineStyle(10, HEAT_YELLOW, 0.04); g.lineBetween(t.x, t.y, t.x + Math.cos(a) * 900, t.y + Math.sin(a) * 900);
          }
        }
      }
      // A line from every hole to every fighter: red where it reaches them, blue where a screen stops it.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        for (const t of active()) {
          const sh = shieldOf(t, f.x, f.y);
          g.lineStyle(2, sh ? QUENCH_LIT : HEAT_RED, 0.3 + k * 0.5);
          g.lineBetween(t.x, t.y, f.x, f.y);
        }
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < taps.length; i++) {
        const t = taps[i];
        const on = late || i === which;
        tapHole(g, t, on && phase === 'warn' ? (time - phaseAt) / WARN_MS : 0, on && phase === 'open', time);
      }
      for (const s of screens) heatScreen(g, s, time, white(s));
    },

    drawHud(g, time) {
      // The cast clock: idle iron, the plug heating, the hole open and burning down.
      const x0 = W / 2 - 70, y = top + 12, w = 140;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 4, y - 4, w + 8, 16, 6);
      const len = phase === 'idle' ? IDLE_MS : phase === 'warn' ? WARN_MS : OPEN_MS;
      const k = clamp((time - phaseAt) / len, 0, 1);
      const c = phase === 'idle' ? IRON : phase === 'warn' ? HEAT_ORANGE : HEAT_WHITE;
      g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x0, y, w, 8, 4);
      g.fillStyle(c, 1); g.fillRoundedRect(x0, y, Math.max(2, w * (phase === 'open' ? 1 - k : k)), 8, 4);
      // A pip per hole, lit when it will be tapped.
      for (let i = 0; i < 2; i++) {
        const on = late || i === which;
        g.fillStyle(on ? (phase === 'open' ? HEAT_WHITE : HEAT_ORANGE) : IRON_DARK, 1);
        g.fillCircle(i === 0 ? x0 - 14 : x0 + w + 14, y + 4, 5);
      }
    },

    destroy() { for (const s of screens) s.t.remove(); },
  };

  function time2Warn(): number { return phase === 'idle' ? IDLE_MS - (now - phaseAt) : 0; }
}

/** The Glare of Number Two: an open tap-hole burns whatever it can see; wheeled screens cast cool shadow. */
export const FALLEN_GLARE: GimmickDef = {
  id: ID,
  rules: 'An open tap-hole burns whoever it can see. Shelter in a screen\'s shadow; screens heat white and fail. Strike a screen to roll it. At half, both holes.',
  make,
};
