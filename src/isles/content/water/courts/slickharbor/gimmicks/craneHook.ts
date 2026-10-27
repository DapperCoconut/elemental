import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_CRANE } from '../encounters';
import {
  CRUDE, SAFETY_RED, SAFETY_WHITE, STEEL, STEEL_DARK, clamp, dist, drumEnd, frameClock, noise, segDist,
  tithCrate,
} from '../util';

/**
 * Crane Hook — Craneman Hoyle's loading yard, under the jib of the dockside crane. A net of
 * tithe drums hangs from the hook and **swings like a pendulum** through the yard along the line
 * the jib's shadow marks on the boards. It is low — and lethal — through the middle of each
 * swing, and high enough to pass over your head at either end; its shadow shrinks and darkens as
 * it comes down. Every few swings Hoyle **slews** the jib with his cab magnet, swinging the
 * whole line round to pass through wherever you are standing; the new line is drawn before the
 * load comes back down it.
 *
 * Hoyle also **drops crates** off the hook — their shadows show where — and a crate is cover:
 * stand with one between you and your foe and you take far less. But a crate on the swing line
 * is in the load's way, and when the load smashes it the splinters fly at anyone close by.
 *
 * The rule the player can turn: the load hits whoever it meets — Hoyle included — and the
 * splinters do not care whose crate it was.
 */

interface Crate { x: number; y: number; landAt: number; bornAt: number; smashed: boolean; landed: boolean }
interface Burst { x: number; y: number; at: number; seed: number }

const LOAD_R = 44;
const CRATE_R = 24;
const LOW = 0.45;

function makeCraneHook(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const now0 = ctx.scene.time.now;
  const loadDmg = hard ? 21 : 16;
  const dropDmg = hard ? 15 : 12;
  const splinterDmg = hard ? 10 : 8;
  const omega = (Math.PI * 2) / (hard ? 3.1 : 3.7);
  const coverMult = 0.55;

  const C: Pt = { x: W / 2, y: (top + H) / 2 + 12 };
  /** The crane stands off the top of the yard: the jib's shadow falls from here. */
  const BASE: Pt = { x: W / 2, y: top - 160 };
  let theta = 0;
  let phi = 0;
  let halfSwings = 0;
  let slewFrom = 0, slewTo = 0, slewStart = 0, slewUntil = 0;
  let endSign = 1;

  const crates: Crate[] = [];
  const bursts: Burst[] = [];
  let nextCrate = now0 + 3200;
  const hitReady = new Map<Fighter, number>();

  const ampFor = (th: number): number => {
    const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    return Math.min(340, c > 0.01 ? (W / 2 - 64) / c : 9999, s > 0.01 ? ((H - top) / 2 - 56) / s : 9999);
  };
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const slewing = (time: number): boolean => time < slewUntil;
  const curTheta = (time: number): number => {
    if (!slewing(time)) return theta;
    const k = clamp((time - slewStart) / (slewUntil - slewStart), 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    return slewFrom + (slewTo - slewFrom) * e;
  };
  /** Load ground position and height (0 = scraping the boards, 1 = top of the swing). */
  const load = (time: number): { x: number; y: number; h: number; vx: number; vy: number } => {
    const th = curTheta(time);
    const A = ampFor(th);
    const s = slewing(time) ? endSign : Math.sin(phi);
    const c = slewing(time) ? 0 : Math.cos(phi);
    return {
      x: C.x + Math.cos(th) * A * s, y: C.y + Math.sin(th) * A * s, h: 1 - Math.abs(c),
      vx: Math.cos(th) * c, vy: Math.sin(th) * c,
    };
  };
  const lineEnds = (th: number): [Pt, Pt] => {
    const A = ampFor(th);
    return [{ x: C.x - Math.cos(th) * A, y: C.y - Math.sin(th) * A }, { x: C.x + Math.cos(th) * A, y: C.y + Math.sin(th) * A }];
  };

  const beginSlew = (time: number): void => {
    const p = ctx.player;
    let target = Math.atan2(p.y - C.y, p.x - C.x);
    if (dist(p.x, p.y, C.x, C.y) < 40) target = theta + Math.PI / 2;
    // A line has no direction: choose the equivalent angle nearest the current one.
    while (target - theta > Math.PI / 2) target -= Math.PI;
    while (target - theta < -Math.PI / 2) target += Math.PI;
    slewFrom = theta; slewTo = target; slewStart = time; slewUntil = time + (hard ? 1150 : 1350);
    endSign = Math.sin(phi) >= 0 ? 1 : -1;
    ctx.sfx('magnet-pull');
    ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SLEW!', '#bfe8ff');
  };

  const dropCrate = (time: number): void => {
    const th = theta;
    const onLine = ctx.rng() < 0.5;
    let x: number, y: number;
    if (onLine) {
      const d = (ctx.rng() < 0.5 ? -1 : 1) * (90 + ctx.rng() * 150);
      x = C.x + Math.cos(th) * d; y = C.y + Math.sin(th) * d;
    } else {
      const along = (ctx.rng() - 0.5) * 360, off = (ctx.rng() < 0.5 ? -1 : 1) * (110 + ctx.rng() * 70);
      x = C.x + Math.cos(th) * along - Math.sin(th) * off; y = C.y + Math.sin(th) * along + Math.cos(th) * off;
    }
    x = clamp(x, 70, W - 70); y = clamp(y, top + 60, H - 50);
    crates.push({ x, y, bornAt: time, landAt: time + 1100, smashed: false, landed: false });
    if (crates.filter((c) => !c.smashed).length > 4) { const old = crates.find((c) => !c.smashed); if (old) old.smashed = true; }
  };

  const smash = (c: Crate, time: number): void => {
    c.smashed = true;
    bursts.push({ x: c.x, y: c.y - 14, at: time, seed: time * 0.001 });
    ctx.sfx('explosion-small');
    ctx.float(c.x, c.y - 40, 'SPLINTERS!', '#ffd79a');
    for (const f of [ctx.player, ctx.npc]) {
      if (alive(f) && dist(f.x, f.y, c.x, c.y) < 84) ctx.hit(f, splinterDmg, f.x, f.y);
    }
  };

  /** Is `f` sheltering behind a crate from `foe`? */
  const covered = (f: Fighter, foe: Fighter): boolean => {
    const time = ctx.scene.time.now;
    const dFoe = dist(f.x, f.y, foe.x, foe.y);
    return crates.some((c) => !c.smashed && time >= c.landAt
      && dist(f.x, f.y, c.x, c.y) < 84 && dist(f.x, f.y, c.x, c.y) < dFoe
      && segDist(c.x, c.y - 10, f.x, f.y, foe.x, foe.y) < 34);
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      if (slewing(time)) {
        // Hold at the top of the swing while the jib comes round.
      } else {
        if (slewUntil && time >= slewUntil) { theta = slewTo; slewUntil = 0; phi = endSign > 0 ? Math.PI / 2 : -Math.PI / 2; }
        const before = Math.floor((phi - Math.PI / 2) / Math.PI);
        phi += omega * dt;
        const after = Math.floor((phi - Math.PI / 2) / Math.PI);
        if (after !== before) {
          // An end of the swing: every third reach, Hoyle slews the jib onto you.
          halfSwings++;
          if (halfSwings % 3 === 0 && alive(ctx.player)) beginSlew(time);
        }
      }

      const L = load(time);
      // The load meets whoever is in its way at the bottom of its arc.
      if (L.h < LOW) {
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || time < (hitReady.get(f) ?? 0)) continue;
          if (dist(f.x, f.y, L.x, L.y) < LOAD_R + 16) {
            hitReady.set(f, time + 1000);
            ctx.hit(f, loadDmg, f.x, f.y);
            const sp = Math.hypot(L.vx, L.vy) || 1;
            ctx.nudge(f, (L.vx / sp) * 80, (L.vy / sp) * 80);
            ctx.float(f.x, f.y - 46, 'HOOKED!', f === ctx.player ? '#ffb27a' : '#8fe6ff');
            ctx.sfx('hit-heavy');
          }
        }
        for (const c of crates) if (!c.smashed && time >= c.landAt && dist(c.x, c.y, L.x, L.y) < LOAD_R + CRATE_R) smash(c, time);
      }

      // Crates dropping off the hook.
      if (time >= nextCrate) { nextCrate = time + (hard ? 4300 : 5200); dropCrate(time); }
      for (const c of crates) {
        if (c.smashed || time < c.landAt) continue;
        if (!c.landed) {
          c.landed = true;
          ctx.sfx('stone-slam');
          for (const f of [ctx.player, ctx.npc]) if (alive(f) && dist(f.x, f.y, c.x, c.y) < 36) ctx.hit(f, dropDmg, f.x, f.y);
        }
        // Crates are solid: shoulder anyone out of one.
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, c.x, c.y - 6);
          if (d < CRATE_R + 14 && d > 0.01) {
            const push = CRATE_R + 14 - d;
            ctx.nudge(f, ((f.x - c.x) / d) * push, ((f.y - c.y + 6) / d) * push);
          }
        }
      }
      for (let i = crates.length - 1; i >= 0; i--) if (crates[i].smashed && crates.length > 6) crates.splice(i, 1);
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 800) bursts.splice(i, 1);
    },

    playerTakenMult: () => (covered(ctx.player, ctx.npc) ? coverMult : 1),
    npcTakenMult: () => (covered(ctx.npc, ctx.player) ? coverMult : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, time = ctx.scene.time.now;
      const th = curTheta(time);
      const [a, b] = lineEnds(th);
      // Clear the swing line whenever the load is coming low through it.
      const L = load(time);
      if (segDist(n.x, n.y, a.x, a.y, b.x, b.y) < LOAD_R + 50 && (L.h < 0.8 || slewing(time))) {
        const side = (n.x - C.x) * -Math.sin(th) + (n.y - C.y) * Math.cos(th) >= 0 ? 1 : -1;
        return { x: clamp(n.x - Math.sin(th) * side * 140, 60, W - 60), y: clamp(n.y + Math.cos(th) * side * 140, top + 40, H - 40) };
      }
      // Hurt, he takes cover behind a crate on the far side from you.
      if (n.hp < n.maxHp * 0.6) {
        const p = ctx.player;
        let best: Pt | null = null, bd = Infinity;
        for (const c of crates) {
          if (c.smashed || time < c.landAt) continue;
          if (segDist(c.x, c.y, a.x, a.y, b.x, b.y) < LOAD_R + 40) continue;
          const d = dist(p.x, p.y, c.x, c.y) || 1;
          const spot = { x: clamp(c.x + ((c.x - p.x) / d) * 46, 60, W - 60), y: clamp(c.y + ((c.y - p.y) / d) * 46, top + 40, H - 40) };
          const dd = dist(n.x, n.y, spot.x, spot.y);
          if (dd < bd) { bd = dd; best = spot; }
        }
        return best;
      }
      return null;
    },

    drawGround(g, time) {
      const th = curTheta(time);
      const [a, b] = lineEnds(th);
      // The swing track: rope-scuffed boards along the line, and the low middle marked red.
      g.lineStyle(LOAD_R * 2, 0x000000, 0.1); g.lineBetween(a.x, a.y, b.x, b.y);
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        const low = Math.abs(t - 0.5) < 0.5 * Math.sin(Math.acos(1 - LOW));
        g.fillStyle(low ? SAFETY_RED : SAFETY_WHITE, low ? 0.4 : 0.22); g.fillCircle(x, y, low ? 4 : 3);
      }
      // A slew in progress: the new line, dashed, brightening.
      if (slewing(time)) {
        const [na, nb] = lineEnds(slewTo);
        const k = clamp((time - slewStart) / (slewUntil - slewStart), 0, 1);
        for (let d = 0; d < 1; d += 0.05) {
          const x0 = na.x + (nb.x - na.x) * d, y0 = na.y + (nb.y - na.y) * d;
          const x1 = na.x + (nb.x - na.x) * (d + 0.03), y1 = na.y + (nb.y - na.y) * (d + 0.03);
          g.lineStyle(4, 0x9fe0ff, 0.3 + k * 0.6); g.lineBetween(x0, y0, x1, y1);
        }
      }
      const L = load(time);
      // The jib's shadow: a long lattice band from the crane base off the top of the yard to the hook.
      const ja = Math.atan2(L.y - BASE.y, L.x - BASE.x);
      const nx = -Math.sin(ja), ny = Math.cos(ja);
      g.lineStyle(14, 0x000000, 0.16); g.lineBetween(BASE.x, BASE.y, L.x, L.y);
      g.lineStyle(1.5, 0x000000, 0.18);
      const jl = dist(BASE.x, BASE.y, L.x, L.y);
      for (let d = 0; d < jl; d += 22) {
        const x = BASE.x + Math.cos(ja) * d, y = BASE.y + Math.sin(ja) * d;
        g.lineBetween(x + nx * 7, y + ny * 7, x + Math.cos(ja) * 22 - nx * 7, y + Math.sin(ja) * 22 - ny * 7);
      }
      // The load's shadow: tight and dark when low, broad and faint when high.
      const sh = 1 - L.h * 0.45;
      g.fillStyle(0x000000, 0.42 - L.h * 0.26); g.fillEllipse(L.x, L.y + 8, LOAD_R * 2.2 * sh, LOAD_R * 1.1 * sh);
      if (L.h < LOW) { g.lineStyle(3, SAFETY_RED, 0.7); g.strokeEllipse(L.x, L.y + 8, LOAD_R * 2.3, LOAD_R * 1.2); }
      // Crates: falling shadows, then the crate itself.
      for (const c of crates) {
        if (c.smashed) {
          // Broken boards left lying.
          for (let i = 0; i < 5; i++) {
            const bx = c.x + (noise(c.x + i) - 0.5) * 50, by = c.y + (noise(c.y + i) - 0.5) * 24;
            g.fillStyle(0x6a4a2e, 0.8); g.fillRect(bx - 9, by - 2, 18, 4);
          }
          continue;
        }
        if (time < c.landAt) {
          const k = clamp((time - c.bornAt) / (c.landAt - c.bornAt), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(c.x, c.y, 60 * (0.4 + k * 0.6), 22 * (0.4 + k * 0.6));
          g.lineStyle(2, SAFETY_WHITE, 0.3 + k * 0.6); g.strokeRect(c.x - 26, c.y - 12, 52, 24);
          continue;
        }
        tithCrate(g, c.x, c.y + 10, 22);
      }
    },

    drawAir(g, time) {
      const L = load(time);
      const lift = 30 + L.h * 80;
      const lx = L.x, ly = L.y - lift;
      // Cables up out of the yard toward the trolley.
      g.lineStyle(2, 0x141414, 1); g.lineBetween(lx - 4, ly - 20, lx - 4, top); g.lineBetween(lx + 4, ly - 20, lx + 4, top);
      // Hook block, red and white.
      g.fillStyle(STEEL_DARK, 1); g.fillRect(lx - 12, ly - 34, 24, 18);
      g.fillStyle(SAFETY_RED, 1); g.fillRect(lx - 10, ly - 32, 20, 6);
      g.fillStyle(SAFETY_WHITE, 1); g.fillRect(lx - 10, ly - 26, 20, 5);
      g.lineStyle(4, STEEL, 1); g.beginPath(); g.arc(lx, ly - 8, 8, -Math.PI * 0.15, Math.PI * 1.1, false); g.strokePath();
      // The net of drums.
      g.lineStyle(1.5, 0x8a7450, 1);
      for (let k = -2; k <= 2; k++) g.lineBetween(lx, ly - 4, lx + k * 14, ly + 26);
      const sway = Math.sin(time / 300) * 2;
      drumEnd(g, lx - 15 + sway, ly + 22, 12, 0x3a1e18);
      drumEnd(g, lx + 15 + sway, ly + 22, 12, 0x2a2a30);
      drumEnd(g, lx + sway, ly + 40, 12, SAFETY_RED);
      drumEnd(g, lx - 26 + sway, ly + 40, 10, 0x1e3a2a);
      drumEnd(g, lx + 26 + sway, ly + 40, 10, 0x3a1e18);
      g.lineStyle(1, 0x8a7450, 0.8);
      for (let r = 0; r < 3; r++) g.lineBetween(lx - 34 + sway, ly + 14 + r * 14, lx + 34 + sway, ly + 14 + r * 14);
      // Crude dripping off the drums when it swings low.
      if (L.h < 0.6) { g.fillStyle(CRUDE, 0.9); g.fillCircle(lx + 6, ly + 56 + ((time / 8) % 20), 2.2); }
      // Falling crates.
      for (const c of crates) {
        if (c.smashed || time >= c.landAt) continue;
        const k = clamp((time - c.bornAt) / (c.landAt - c.bornAt), 0, 1);
        tithCrate(g, c.x, c.y + 10 - (1 - k) * (1 - k) * 320, 22);
      }
      // Splinter bursts.
      for (const b of bursts) {
        const k = (time - b.at) / 800;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + b.seed;
          const r = 10 + k * 80;
          const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r * 0.7 - Math.sin(k * Math.PI) * 24;
          g.lineStyle(3, i % 2 ? 0x9a7a52 : 0x6a4a2e, 1 - k);
          g.lineBetween(x, y, x + Math.cos(a + 1) * 9, y + Math.sin(a + 1) * 9);
        }
      }
      // Hoyle's magnet arcs while the jib is slewing.
      const n = ctx.npc;
      if (alive(n) && slewing(time)) {
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 400) + i / 3) % 1;
          g.lineStyle(2.5, 0x9fe0ff, 0.8 * (1 - ph));
          g.beginPath(); g.arc(n.x, n.y - 20, 18 + ph * 40, -Math.PI * 0.8, -Math.PI * 0.2, false); g.strokePath();
        }
      }
      // A shield tag over whoever is behind cover.
      for (const [f, foe] of [[ctx.player, ctx.npc], [ctx.npc, ctx.player]] as const) {
        if (!alive(f) || !covered(f, foe)) continue;
        const y = f.y - 56;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(f.x - 14, y - 10, 28, 20, 6);
        g.fillStyle(0x9a7a52, 1); g.fillRect(f.x - 7, y - 6, 14, 12);
        g.lineStyle(1.5, 0x4a321e, 1); g.strokeRect(f.x - 7, y - 6, 14, 12); g.lineBetween(f.x - 7, y - 6, f.x + 7, y + 6);
      }
    },

    destroy() { hitReady.clear(); },
  };
}

export const CRANE_HOOK: GimmickDef = {
  id: GIM_CRANE,
  rules: 'The hooked load swings low through the middle of its line. Crates give cover — but the load smashes them into splinters.',
  make: makeCraneHook,
};
