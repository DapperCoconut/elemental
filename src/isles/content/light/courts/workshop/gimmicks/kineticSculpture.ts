import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { gear } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, IRON_DARK, IRON_LIT, SUN } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Kinetic Sculpture — Artisan Mobile.
 *
 * A giant mobile of brass weights turns overhead. The great bar wheels slowly about its hub; from
 * one end hangs a second bar carrying two weights, turning the other way; from the other end, one
 * heavy weight on its own. Their small hard shadows (it is always noon) sweep the floor.
 *
 * Every few seconds each weight swings low on its wire. As it drops its shadow darkens and
 * tightens — and when it is down it strikes whoever its shadow is on, and knocks them along the
 * way it was turning. Hit a weight and the whole mobile spins faster for a while; spin it so a
 * dropping weight swings onto your foe.
 */

interface Weight {
  /** Shadow on the floor. */
  x: number; y: number;
  /** How far up it hangs, px (drawn above its shadow). */
  lift: number;
  r: number;
  /** Swing clock offset (ms) and period. */
  off: number;
  /** Whom it has struck this low swing. */
  struck: Set<Fighter>;
  target: StrikeTarget | null;
  /** The direction its shadow is moving (for the knock). */
  vx: number; vy: number;
  hue: number;
}

const SQUASH = 0.62;
const ARM_A = 250;
const ARM_B = 205;
const SUB = 96;
const HUB_LIFT = 178;
const DESCEND_MS = 1150;
const LOW_MS = 380;
const RISE_MS = 800;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 6 };
  const BASE_SPIN = ctx.hard ? 0.55 : 0.45;
  const MAX_SPIN = 2.3;
  const PERIOD = ctx.hard ? 3900 : 4700;
  const DMG = ctx.hard ? 15 : 13;
  let spin = BASE_SPIN;
  let theta = 0;
  let spunAt = -9999;
  let started = false;
  const weights: Weight[] = [
    { x: 0, y: 0, lift: 0, r: 18, off: 0, struck: new Set(), target: null, vx: 0, vy: 0, hue: BRASS },
    { x: 0, y: 0, lift: 0, r: 18, off: PERIOD * 0.5, struck: new Set(), target: null, vx: 0, vy: 0, hue: COPPER },
    { x: 0, y: 0, lift: 0, r: 26, off: PERIOD * 0.25, struck: new Set(), target: null, vx: 0, vy: 0, hue: BRASS_DARK },
  ];
  let t0 = 0;

  /** Where a weight is in its swing: 0 high … 1 down. And whether it is striking. */
  function swing(w: Weight, time: number): { k: number; low: boolean; phaseMs: number } {
    const ph = (time - t0 + w.off) % PERIOD;
    const highMs = PERIOD - DESCEND_MS - LOW_MS - RISE_MS;
    if (ph < highMs) return { k: 0, low: false, phaseMs: ph - highMs };
    if (ph < highMs + DESCEND_MS) return { k: (ph - highMs) / DESCEND_MS, low: false, phaseMs: ph - highMs };
    if (ph < highMs + DESCEND_MS + LOW_MS) return { k: 1, low: true, phaseMs: ph - highMs };
    return { k: 1 - (ph - highMs - DESCEND_MS - LOW_MS) / RISE_MS, low: false, phaseMs: ph - highMs };
  }

  /** Lay the mobile out at the current angle; with `commit`, move the weights there (once a frame, in update). */
  function place(time: number, commit = true): { ax: number; ay: number; bx: number; by: number; phi: number } {
    const ax = C.x + Math.cos(theta) * ARM_A, ay = C.y + Math.sin(theta) * ARM_A * SQUASH;
    const bx = C.x - Math.cos(theta) * ARM_B, by = C.y - Math.sin(theta) * ARM_B * SQUASH;
    const phi = -1.7 * theta + 0.8;
    const pts: Pt[] = [
      { x: ax + Math.cos(phi) * SUB, y: ay + Math.sin(phi) * SUB * SQUASH },
      { x: ax - Math.cos(phi) * SUB, y: ay - Math.sin(phi) * SUB * SQUASH },
      { x: bx, y: by },
    ];
    if (!commit) return { ax, ay, bx, by, phi };
    weights.forEach((w, i) => {
      w.vx = pts[i].x - w.x; w.vy = pts[i].y - w.y;
      w.x = pts[i].x; w.y = pts[i].y;
      const s = swing(w, time);
      w.lift = 150 - s.k * 128;
    });
    return { ax, ay, bx, by, phi };
  }

  function spinUp(time: number): void {
    spin = Math.min(MAX_SPIN, spin + 0.5);
    spunAt = time;
    ctx.sfx('gear-turn');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        t0 = time;
        place(time);
        for (const w of weights) {
          w.target = ctx.target({
            x: w.x, y: w.y - w.lift, r: w.r + 4, passThrough: false,
            onStruck: () => { const now = ctx.scene.time.now; if (now - spunAt > 250) { spinUp(now); ctx.float(w.x, w.y - w.lift - 30, 'SPIN!', '#f6d98a'); } },
          });
        }
      }
      // The mobile slows back toward its idle turn.
      spin += (BASE_SPIN - spin) * Math.min(1, dt * 0.22);
      theta += spin * dt;
      place(time);
      for (const w of weights) {
        w.target?.moveTo(w.x, w.y - w.lift);
        const s = swing(w, time);
        if (!s.low) { if (s.k === 0) w.struck.clear(); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || w.struck.has(f)) continue;
          if (dist(f.x, f.y, w.x, w.y) < w.r + 20) {
            w.struck.add(f);
            ctx.hit(f, w.r > 20 ? DMG + 3 : DMG, f.x, f.y);
            // Knocked along the way it was turning.
            const m = Math.hypot(w.vx, w.vy) || 1;
            ctx.nudge(f, (w.vx / m) * 90, (w.vy / m) * 90);
            ctx.sfx('gravity-slam');
          }
        }
      }
    },

    npcSeek() {
      // Stay at fighting range of the stranger, out of every shadow that is coming down soon.
      const now = ctx.scene.time.now;
      let best: Pt = { x: player.x, y: player.y };
      let bs = -Infinity;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const p = { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 190, top + 50, H - 40) };
        let s = -dist(p.x, p.y, npc.x, npc.y) * 0.3;
        for (const w of weights) {
          const sw = swing(w, now);
          const danger = sw.k > 0.2 || sw.low ? 1 : 0.3;
          const d = dist(p.x, p.y, w.x, w.y);
          if (d < 110) s -= (110 - d) * 3 * danger;
          // A weight dropping near the stranger is good news.
          if (danger >= 1 && dist(player.x, player.y, w.x, w.y) < 80) s += 30;
        }
        if (s > bs) { bs = s; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      // The hub's own shadow, a ring of rivets painted on the floor round it, and the weights' tracks.
      g.lineStyle(1, IRON_DARK, 0.15); g.strokeEllipse(C.x, C.y, ARM_A * 2, ARM_A * 2 * SQUASH);
      g.strokeEllipse(C.x, C.y, ARM_B * 2, ARM_B * 2 * SQUASH);
      g.fillStyle(0x000000, 0.18); g.fillEllipse(C.x, C.y, 30, 12);
      for (const w of weights) {
        const s = swing(w, time);
        // The shadow: soft and wide high up, small, dark and hard as it comes down.
        const k = s.k;
        const sr = w.r * (1.7 - k * 0.7);
        g.fillStyle(0x000000, 0.12 + k * 0.38); g.fillEllipse(w.x, w.y, sr * 2, sr * 2 * SQUASH);
        if (k > 0 && !s.low && s.phaseMs >= 0 && s.phaseMs < DESCEND_MS) {
          // Coming down: a tightening ring and chevrons pointing in.
          g.lineStyle(2, BRASS_LIT, 0.4 + k * 0.5); g.strokeEllipse(w.x, w.y, (w.r + 20) * 2 * (1.6 - k * 0.6), (w.r + 20) * 2 * SQUASH * (1.6 - k * 0.6));
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + time / 600;
            const d = (w.r + 34) * (1.4 - k * 0.5);
            const px = w.x + Math.cos(a) * d, py = w.y + Math.sin(a) * d * SQUASH;
            g.fillStyle(BRASS_LIT, 0.4 + k * 0.5);
            g.fillTriangle(px, py, px + Math.cos(a) * 9 - Math.sin(a) * 5, py + (Math.sin(a) * 9 + Math.cos(a) * 5) * SQUASH, px + Math.cos(a) * 9 + Math.sin(a) * 5, py + (Math.sin(a) * 9 - Math.cos(a) * 5) * SQUASH);
          }
        }
        if (s.low) {
          g.lineStyle(3, 0xffffff, 0.6); g.strokeEllipse(w.x, w.y, (w.r + 20) * 2, (w.r + 20) * 2 * SQUASH);
          // Scuff marks where it skims the floor.
          g.lineStyle(2, 0x000000, 0.2); g.lineBetween(w.x - w.vx * 6, w.y - w.vy * 6, w.x, w.y);
        }
      }
    },

    drawAir(g, time) {
      const { ax, ay, bx, by, phi } = place(time, false);
      const lifted = (x: number, y: number, l: number) => ({ x, y: y - l });
      const hub = lifted(C.x, C.y, HUB_LIFT);
      // The hanging rod from the ceiling, and the hub.
      g.lineStyle(3, IRON_DARK, 1); g.lineBetween(hub.x, top - 10, hub.x, hub.y);
      const a = lifted(ax, ay, HUB_LIFT), b = lifted(bx, by, HUB_LIFT);
      // The great bar.
      g.lineStyle(7, BRASS_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(4, BRASS, 1); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(1.5, BRASS_LIT, 0.8); g.lineBetween(a.x, a.y - 1.5, b.x, b.y - 1.5);
      gear(g, hub.x, hub.y, 10, 12, BRASS, 1, theta * 2);
      // The sub-bar hanging from end A.
      const subY = HUB_LIFT - 34;
      const s1 = lifted(ax + Math.cos(phi) * SUB, ay + Math.sin(phi) * SUB * SQUASH, subY);
      const s2 = lifted(ax - Math.cos(phi) * SUB, ay - Math.sin(phi) * SUB * SQUASH, subY);
      const sa = lifted(ax, ay, subY);
      g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(a.x, a.y, sa.x, sa.y);
      g.lineStyle(5, COPPER_DARK, 1); g.lineBetween(s1.x, s1.y, s2.x, s2.y);
      g.lineStyle(3, COPPER, 1); g.lineBetween(s1.x, s1.y, s2.x, s2.y);
      gear(g, sa.x, sa.y, 6, 10, COPPER, 1, -theta * 3.4);
      const anchors = [s1, s2, b];
      weights.forEach((w, i) => {
        const top2 = anchors[i];
        const wp = lifted(w.x, w.y, w.lift);
        const sw = swing(w, time);
        // Its wire, and the weight: a brass bob with a sunburst boss and a polished cap.
        g.lineStyle(1.2, IRON_LIT, 0.9); g.lineBetween(top2.x, top2.y, wp.x, wp.y - w.r);
        if (sw.low) glow(g, wp.x, wp.y, w.r + 14, SUN, 0.06, 2);
        g.fillStyle(dim(w.hue, 0.4), 1); g.fillCircle(wp.x + 1, wp.y + 2, w.r);
        g.fillStyle(w.hue, 1); g.fillCircle(wp.x, wp.y, w.r);
        g.fillStyle(lit(w.hue, 0.35), 1); g.fillEllipse(wp.x - w.r * 0.3, wp.y - w.r * 0.35, w.r * 0.8, w.r * 0.5);
        g.lineStyle(1.5, dim(w.hue, 0.5), 1); g.strokeCircle(wp.x, wp.y, w.r * 0.55);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(wp.x - w.r * 0.4, wp.y - w.r * 0.45, 2);
        for (let k = 0; k < 8; k++) {
          const t2 = (k / 8) * Math.PI * 2 + theta;
          g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(wp.x + Math.cos(t2) * w.r * 0.78, wp.y + Math.sin(t2) * w.r * 0.78, 1.3);
        }
        // Motion lines as it swings low.
        if (sw.k > 0.5) {
          g.lineStyle(2, 0xffffff, 0.3 * sw.k);
          g.lineBetween(wp.x - w.vx * 5, wp.y - w.vy * 5 - w.r, wp.x - w.vx * 12, wp.y - w.vy * 12 - w.r);
        }
      });
      // A spin flash at the hub when somebody has just spun it.
      const k = clamp((time - spunAt) / 600, 0, 1);
      if (k < 1) { g.lineStyle(3, BRASS_LIT, 1 - k); g.strokeCircle(hub.x, hub.y, 14 + k * 40); }
    },

    drawHud(g) {
      // The spin gauge: idle to flat-out.
      const k = clamp((spin - BASE_SPIN) / (MAX_SPIN - BASE_SPIN), 0, 1);
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 13);
      g.lineStyle(3, BRASS, 0.9);
      g.beginPath(); g.arc(x, y, 10, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * k, false); g.strokePath();
      const na = Math.PI * 0.75 + Math.PI * 1.5 * k;
      g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(x, y, x + Math.cos(na) * 9, y + Math.sin(na) * 9);
    },

    destroy() { for (const w of weights) w.target?.remove(); },
  };
}

export const KINETIC_GIMMICK: GimmickDef = {
  id: 'workshop-kinetic',
  rules: 'A giant mobile turns overhead. Each weight swings low in turn — its shadow tightens — and strikes whoever it is over. Hit a weight to spin the whole mobile faster.',
  make,
};
