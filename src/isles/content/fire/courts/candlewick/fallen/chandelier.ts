import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, SOOT, WAX, WICK, WOOD, dist, flame } from '../art';

/**
 * Crown of Candles — Verger Hask, who in the King's telling keeps the cathedral's great wheel
 * chandelier and lets it fall on whoever the Prince points at during evensong.
 *
 * The wheel hangs over the floor and drifts after you; its shadow is where it will land. On Hask's
 * count the chain slips — the shadow darkens and tightens — and it crashes, scorching and stunning
 * everything under it, then lies there until it is hauled back up. Two chain-winches stand on the
 * side walls: STRIKE either and the chain runs at once, dropping the wheel wherever it hangs a
 * short beat later. The exploit: the wheel follows you, so walk it over Hask and strike a winch.
 * Halfway, the chain burns: the wheel swings end to end like a censer, Hask's count quickens and
 * every crash flings its candles outward.
 */

const DRIFT = 72;
const DRIFT_LATE = 48;
const DROP_EVERY_MS = 8200;
const DROP_EVERY_LATE_MS = 6400;
const SLIP_WARN_MS = 1300;
const WINCH_SLIP_MS = 720;
const CRASH_R = 92;
const CRASH_DAMAGE = 24;
const CRASH_STUN_MS = 700;
const DOWN_MS = 1400;
const HOIST_MS = 1800;
const HANG_H = 150;
const CANDLES = 10;
const SPRAY_DAMAGE = 8;

type Mode = 'hung' | 'slipping' | 'down' | 'hoisting';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fieldTop = top + 40;
  let x = W / 2, y = (fieldTop + H) / 2;
  let mode: Mode = 'hung';
  let modeAt = 0;
  let crashAt = 0;
  let nextDropAt = DROP_EVERY_MS;
  let burnt = false;
  let swingT = 0;
  let announced = false;
  let lastWinch = -1;

  const winchSpots: Pt[] = [{ x: 46, y: H / 2 + 30 }, { x: W - 46, y: H / 2 + 30 }];
  const winches: StrikeTarget[] = winchSpots.map((p, i) => ctx.target({
    x: p.x, y: p.y - 20, r: 26,
    onStruck() {
      if (mode !== 'hung') return;
      lastWinch = i;
      slip(ctx.scene.time.now, WINCH_SLIP_MS);
      ctx.sfx('chain');
    },
  }));

  const slip = (time: number, warn: number): void => {
    mode = 'slipping';
    modeAt = time;
    crashAt = time + warn;
  };

  const crash = (time: number): void => {
    mode = 'down';
    modeAt = time;
    ctx.sfx('explosion-medium');
    ctx.tk.boom(x, y, CRASH_R, 0xffc24a);
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0) continue;
      if (dist(x, y, f.x, f.y) < CRASH_R + 8) {
        ctx.hit(f, CRASH_DAMAGE, f.x, f.y);
        ctx.stun(f, CRASH_STUN_MS);
      }
    }
    if (burnt) {
      // The candles fly off the rim, a spoke's width apart: walk into a gap.
      const off = rng() * Math.PI * 2;
      for (let i = 0; i < CANDLES; i++) {
        const a = off + (i / CANDLES) * Math.PI * 2;
        ctx.tk.spawnBullet({
          x: x + Math.cos(a) * CRASH_R * 0.7, y: y + Math.sin(a) * CRASH_R * 0.45, angle: a, speed: 230,
          damage: SPRAY_DAMAGE, lifeMs: 1700, r: 6, color: 0xffc24a, hits: [ctx.player, ctx.npc],
        });
      }
    }
  };

  /** Where the wheel is drifting toward this frame. */
  const aim = (): Pt => {
    const p = ctx.player;
    if (!burnt) return { x: p.x, y: p.y };
    return { x: W / 2 + Math.sin(swingT) * (W / 2 - 150), y: p.y };
  };

  const height = (time: number): number => {
    if (mode === 'hung') return 1;
    if (mode === 'slipping') {
      // A shudder first, then the chain runs: most of the fall in the last third.
      const k = Math.min(1, (time - modeAt) / (crashAt - modeAt));
      return k < 0.66 ? 1 - Math.sin(time * 0.06) * 0.02 : 1 - ((k - 0.66) / 0.34) ** 2;
    }
    if (mode === 'down') return 0;
    return Math.min(1, (time - modeAt) / HOIST_MS);
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('EVENSONG — MIND THE WHEEL', '#ffe2a8'); }
      if (!burnt && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        burnt = true;
        ctx.banner('THE CHAIN BURNS', '#ffb070');
        ctx.sfx('boss-phase');
      }
      if (mode === 'hung') {
        if (burnt) swingT += dt * 0.85;
        const t = aim();
        const speed = burnt ? DRIFT_LATE : DRIFT;
        const d = dist(x, y, t.x, t.y);
        if (burnt) {
          // The swing carries it on x; y still drifts after the player.
          x = t.x;
          if (d > 1) y += Math.sign(t.y - y) * Math.min(Math.abs(t.y - y), speed * dt);
        } else if (d > 1) {
          x += ((t.x - x) / d) * Math.min(d, speed * dt);
          y += ((t.y - y) / d) * Math.min(d, speed * dt);
        }
        y = Math.max(fieldTop + 30, Math.min(H - 60, y));
        if (time >= nextDropAt) { slip(time, SLIP_WARN_MS); ctx.sfx('chain'); }
      } else if (mode === 'slipping' && time >= crashAt) {
        crash(time);
      } else if (mode === 'down' && time >= modeAt + DOWN_MS) {
        mode = 'hoisting'; modeAt = time; ctx.sfx('gear-turn');
      } else if (mode === 'hoisting' && time >= modeAt + HOIST_MS) {
        mode = 'hung';
        nextDropAt = time + (burnt ? DROP_EVERY_LATE_MS : DROP_EVERY_MS);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const dn = dist(x, y, n.x, n.y);
      // Under the wheel as it slips, or as it hangs and drifts his way: get out from under.
      if ((mode === 'slipping' && dn < CRASH_R + 50) || (mode === 'hung' && dn < CRASH_R + 10)) {
        const a = dn > 1 ? Math.atan2(n.y - y, n.x - x) : Math.atan2(n.y - p.y, n.x - p.x);
        return { x: x + Math.cos(a) * (CRASH_R + 90), y: y + Math.sin(a) * (CRASH_R + 90) };
      }
      // The player under the hanging wheel: go and strike the nearer winch.
      if (mode === 'hung' && dist(x, y, p.x, p.y) < CRASH_R * 0.7) {
        const w = winchSpots.reduce((m, c) => (dist(c.x, c.y, n.x, n.y) < dist(m.x, m.y, n.x, n.y) ? c : m));
        return { x: w.x + (w.x < W / 2 ? 50 : -50), y: w.y };
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      const h = height(time);
      // The wheel's shadow: a spoked ring of dark with a candle-lit speck per candle, tighter as it falls.
      const spread = 1 + h * 0.25;
      const dark = mode === 'slipping' ? 0.2 + (1 - h) * 0.3 + Math.min(1, (time - modeAt) / (crashAt - modeAt)) * 0.15 : 0.16;
      if (mode !== 'down') {
        g.fillStyle(0x000000, dark); g.fillEllipse(x, y, CRASH_R * 2 * spread, CRASH_R * 1.2 * spread);
        g.lineStyle(2, mode === 'slipping' ? 0xff9a4a : BRASS, mode === 'slipping' ? 0.85 : 0.4);
        g.strokeEllipse(x, y, CRASH_R * 2, CRASH_R * 1.2);
        for (let i = 0; i < CANDLES; i++) {
          const a = (i / CANDLES) * Math.PI * 2 + t * 0.2;
          g.fillStyle(0xffc24a, 0.12 + h * 0.08);
          g.fillCircle(x + Math.cos(a) * CRASH_R * 0.82 * spread, y + Math.sin(a) * CRASH_R * 0.5 * spread, 6);
        }
        if (mode === 'slipping' && Math.floor(time / 90) % 2) { g.lineStyle(3, 0xffe0a0, 0.6); g.strokeEllipse(x, y, CRASH_R * 2, CRASH_R * 1.2); }
      }
      // Winches on the side walls: a brass-bound drum on a bracket, its crank, the chain wound on it.
      winchSpots.forEach((p, i) => {
        const side = p.x < W / 2 ? -1 : 1;
        shadow(g, p.x, p.y + 2, 54, 14, 0.3);
        g.fillStyle(dim(WOOD, 0.35), 1); g.fillRect(side < 0 ? p.x - 24 : p.x + 14, p.y - 52, 10, 52);
        g.fillStyle(WOOD, 1); g.fillRoundedRect(p.x - 18, p.y - 40, 36, 26, 6);
        g.fillStyle(BRASS, 1); g.fillRect(p.x - 18, p.y - 38, 4, 22); g.fillRect(p.x + 14, p.y - 38, 4, 22);
        g.lineStyle(1.5, 0x5a5048, 1);
        const spin = mode === 'slipping' && lastWinch === i ? time * 0.04 : mode === 'hoisting' ? time * 0.02 : 0;
        for (let k = 0; k < 5; k++) {
          const yy = p.y - 36 + ((k * 5 + spin) % 24);
          g.lineBetween(p.x - 14, yy, p.x + 14, yy + 2);
        }
        const ca = spin * 0.3;
        g.lineStyle(3, dim(BRASS, 0.2), 1); g.lineBetween(p.x, p.y - 27, p.x - side * Math.cos(ca) * 16, p.y - 27 + Math.sin(ca) * 16);
        g.fillStyle(WOOD, 1); g.fillCircle(p.x - side * Math.cos(ca) * 16, p.y - 27 + Math.sin(ca) * 16, 3.5);
      });
      // Fallen: the wheel lies crumpled on its shadow, candles snapped, wax splashed out.
      if (mode === 'down' || (mode === 'hoisting' && h < 0.15)) wheel(g, x, y, t, 0, true);
    },

    drawAir(g, time) {
      const t = time / 1000;
      const h = height(time);
      if (mode === 'down' || (mode === 'hoisting' && h < 0.15)) return;
      const wy = y - h * HANG_H;
      // The chains: one up into the dark, two to the winches, slack or taut.
      g.lineStyle(2.5, 0x4a4440, 0.8); g.lineBetween(x, top, x, wy - 26);
      for (const p of winchSpots) {
        const sag = mode === 'slipping' ? 40 : 14;
        const mx = (p.x + x) / 2, my = Math.min(p.y - 40, wy - 26) - 60 + sag;
        g.lineStyle(1.5, 0x4a4440, 0.45);
        g.lineBetween(p.x, p.y - 40, mx, my); g.lineBetween(mx, my, x, wy - 26);
      }
      wheel(g, x, wy, t, mode === 'slipping' ? Math.sin(time * 0.05) * 0.06 : burnt ? Math.cos(swingT) * 0.12 : 0, false);
    },

    drawHud(g, time) {
      // Hask's count: a chain of links top-right, one dropping off per beat until the slip.
      const x0 = W - 180, y0 = 66;
      const period = burnt ? DROP_EVERY_LATE_MS : DROP_EVERY_MS;
      const left = mode === 'hung' ? Math.max(0, (nextDropAt - time) / period) : 0;
      const links = 8;
      for (let i = 0; i < links; i++) {
        const on = i < Math.ceil(left * links);
        g.lineStyle(3, on ? BRASS : dim(BRASS, 0.6), on ? 1 : 0.35);
        g.strokeEllipse(x0 + i * 18, y0 - 10, i % 2 ? 14 : 20, i % 2 ? 20 : 12);
      }
      // A little wheel at the end: lit while hung, flashing red when slipping, grey when down.
      const c = mode === 'slipping' ? (Math.floor(time / 100) % 2 ? 0xff5040 : BRASS) : mode === 'hung' ? BRASS : 0x6a6460;
      g.lineStyle(3, c, 1); g.strokeCircle(x0 + links * 18 + 12, y0 - 10, 11);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        g.lineBetween(x0 + links * 18 + 12 - Math.cos(a) * 11, y0 - 10 - Math.sin(a) * 11, x0 + links * 18 + 12 + Math.cos(a) * 11, y0 - 10 + Math.sin(a) * 11);
      }
    },

    destroy() {
      for (const w of winches) w.remove();
    },
  };
}

/**
 * The great wheel: an iron hoop in three-quarter view, four spokes to a boss, a ring of candles on
 * cups round the rim. `tilt` rocks it; `fallen` draws it buckled flat with its candles snapped.
 */
function wheel(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, tilt: number, fallen: boolean): void {
  const rx = CRASH_R * 0.86, ry = CRASH_R * (fallen ? 0.42 : 0.34);
  if (fallen) {
    g.fillStyle(WAX, 0.6); g.fillEllipse(x, y + 4, rx * 2.3, ry * 2.4);
    g.fillStyle(lit(WAX, 0.1), 0.6); g.fillEllipse(x - 10, y, rx * 1.4, ry * 1.2);
  }
  // Back half of the hoop, spokes, boss, front half — so candles sit on the rim correctly.
  hoop(g, x, y, rx, ry, Math.PI, Math.PI * 2, 6, dim(SOOT, 0.2), 1);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + tilt;
    g.lineStyle(3, SOOT, 1); g.lineBetween(x - Math.cos(a) * rx, y - Math.sin(a) * ry, x + Math.cos(a) * rx, y + Math.sin(a) * ry);
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 9); g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(x - 2, y - 2, 3.5);
  for (let i = 0; i < CANDLES; i++) {
    const a = (i / CANDLES) * Math.PI * 2 + tilt;
    const cx = x + Math.cos(a) * rx, cy = y + Math.sin(a) * ry;
    g.fillStyle(BRASS, 1); g.fillEllipse(cx, cy, 10, 4);
    if (fallen) {
      g.fillStyle(WAX, 1); g.fillRect(cx - 2, cy - 4, 9, 4);
      continue;
    }
    g.fillStyle(WAX, 1); g.fillRect(cx - 2.5, cy - 15, 5, 14);
    g.lineStyle(1, WICK, 1); g.lineBetween(cx, cy - 15, cx, cy - 18);
    flame(g, cx, cy - 17, 3.2, t, i, 0.04);
  }
  hoop(g, x, y, rx, ry, 0, Math.PI, 6, SOOT, 1);
  hoop(g, x, y + 1, rx, ry, 0.2, Math.PI - 0.2, 1.5, lit(SOOT, 0.35), 0.8);
}

/** Part of an elliptical hoop from angle `a0` to `a1`, stroked as a polyline. */
function hoop(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, a0: number, a1: number, w: number, c: number, a: number): void {
  const steps = 18;
  g.lineStyle(w, c, a);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    const px = x + Math.cos(t) * rx, py = y + Math.sin(t) * ry;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

export const CHANDELIER: GimmickDef = {
  id: fallenId('candlewick', 'chandelier'),
  rules: 'The great wheel drifts after you and falls on its shadow. Strike a wall winch to drop it at once — on whoever is under it.',
  make,
};
