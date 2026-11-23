import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import {
  BARNACLE, BRASS, BRASS_DARK, BRASS_LIT, BUOY, DRIFT, DRIFT_DARK, DRIFT_LIT, FOAM, FOAM_DIM, PILE, PILE_WET,
  ROPE, ROPE_DARK, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, SHINGLE, SHINGLE_DARK, WEED,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Weighed Under — Ballast-Master Coyle (gravity).
 *
 * The Queen keeps the drowned "as ballast for the crown", and Coyle is the man who weighs it. In
 * this fight ballast is literal: every hard blow you take hangs another stone on your ankles —
 * five at most. Each stone slows you, and each stone also puts weight behind your own blows (your
 * foe takes more from you the heavier you are). Weight is a choice, until the sea comes.
 *
 * Swells roll across the flats in bands (a dark trough shows first). Caught light, a swell lifts
 * you and sets you down a step on with a slap. Caught carrying three stones or more, you are
 * *weighed under*: held on the bottom, hurt, and the sea keeps two of your stones. Below half
 * Coyle's swells come two at once.
 *
 * In the middle stands the crown's weighbridge. Strike it and every stone you carry is tipped
 * across the beam and hung on your foe instead. Then the beam has to settle before it weighs again.
 * Coyle does it to you whenever he is heavier — so load him up, tip him right before a swell, and
 * watch the sea take its tithe off the tithe-man.
 */

const MAX_STONES = 5;
const HEAVY = 3;
const SLOW_PER = 0.07;
const HIT_PER = 0.06;
const BAND = 58;
const WARN_MS = 1900;
const SCALE_R = 30;
const SCALE_SETTLE_MS = 6500;
const UNDER_DMG = 18;
const SLAP_DMG = 5;

/** One swell on its way: a band across the flats, horizontal (`y`) or vertical (`x`). */
interface Swell { vertical: boolean; c: number; dir: number; fireAt: number; fired: boolean }
/** A stone in flight across the weighbridge. */
interface Toss { fx: number; fy: number; to: Fighter; at: number; n: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const span = H - top;
  const scaleAt = { x: W / 2, y: top + span * 0.5 };
  const stones = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const gainCd = new Map<Fighter, number>();
  let swells: Swell[] = [];
  let tosses: Toss[] = [];
  let started = false;
  let nextSwell = 0;
  let scaleReady = 0;
  let tilt = 0;
  let tiltTo = 0;
  let selfHit = false;
  let target: StrikeTarget | null = null;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  const two = (): boolean => npc.hp < npc.maxHp * 0.55;
  const inSwell = (s: Swell, f: Fighter): boolean => Math.abs((s.vertical ? f.x : f.y) - s.c) < BAND + 16;

  function hurt(f: Fighter, amount: number): void {
    selfHit = true;
    if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y);
    selfHit = false;
  }

  function addStone(f: Fighter, amount: number): void {
    const time = ctx.scene.time.now;
    if (selfHit || amount < 8 || (gainCd.get(f) ?? 0) > time) return;
    const n = stones.get(f) ?? 0;
    if (n >= MAX_STONES) return;
    gainCd.set(f, time + 1400);
    stones.set(f, n + 1);
    ctx.sfx('rock-throw');
  }

  function weigh(by: Striker): void {
    const time = ctx.scene.time.now;
    const f = by === 'player' ? player : npc;
    const n = stones.get(f) ?? 0;
    if (time < scaleReady || n === 0) return;
    const o = other(f);
    stones.set(f, 0);
    tosses.push({ fx: scaleAt.x, fy: scaleAt.y - 40, to: o, at: time, n });
    tk.schedule(520, () => {
      stones.set(o, Math.min(MAX_STONES, (stones.get(o) ?? 0) + n));
      ctx.sfx('stone-slam');
    });
    scaleReady = time + SCALE_SETTLE_MS;
    tiltTo = o.x < scaleAt.x ? -0.42 : 0.42;
    ctx.sfx('gravity-slam');
  }

  function planSwells(time: number): void {
    const count = two() ? 2 : 1;
    const vertical = ctx.rng() < 0.45;
    const lo = vertical ? 80 : top + 70, hi = vertical ? W - 80 : H - 60;
    const first = lo + ctx.rng() * (hi - lo);
    for (let i = 0; i < count; i++) {
      let c = first;
      if (i === 1) c = first - lo > hi - first ? first - 230 - ctx.rng() * 60 : first + 230 + ctx.rng() * 60;
      swells.push({ vertical, c: clamp(c, lo, hi), dir: ctx.rng() < 0.5 ? -1 : 1, fireAt: time + WARN_MS + i * 250, fired: false });
    }
    ctx.sfx('rain');
  }

  function fire(s: Swell): void {
    s.fired = true;
    ctx.sfx('splash');
    for (const f of [player, npc]) {
      if (!alive(f) || !inSwell(s, f)) continue;
      const n = stones.get(f) ?? 0;
      if (n >= HEAVY) {
        hurt(f, UNDER_DMG);
        ctx.root(f, 1400);
        stones.set(f, n - 2);
        ctx.flash(f.x, f.y, SEA_DEEP);
        ctx.sfx('gravity-slam');
      } else {
        hurt(f, SLAP_DMG);
        ctx.nudge(f, s.vertical ? s.dir * 50 : 0, s.vertical ? 0 : s.dir * 50);
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSwell = time + 6000;
        scaleReady = time + 2500;
        target = ctx.target({ x: scaleAt.x, y: scaleAt.y - 24, r: SCALE_R, onStruck: (by) => weigh(by) });
      }
      // The weighbridge is solid: shoulder against its post, never through it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = dist(f.x, f.y, scaleAt.x, scaleAt.y);
        if (d < 26) ctx.nudge(f, ((f.x - scaleAt.x) / (d || 1)) * (26 - d), ((f.y - scaleAt.y) / (d || 1)) * (26 - d));
      }
      if (time >= nextSwell) { planSwells(time); nextSwell = time + (two() ? 8000 : 9000); }
      for (const s of swells) if (!s.fired && time >= s.fireAt) fire(s);
      swells = swells.filter((s) => time < s.fireAt + 700);
      tosses = tosses.filter((t) => time < t.at + 560);
      if (time >= scaleReady) tiltTo = clamp(((stones.get(npc) ?? 0) - (stones.get(player) ?? 0)) * 0.05, -0.2, 0.2) * Math.sign(npc.x - scaleAt.x || 1);
      tilt += (tiltTo - tilt) * Math.min(1, dt * 4);
    },

    onPlayerHurt(amount) { addStone(player, amount); },
    onNpcHurt(amount) { addStone(npc, amount); },
    playerSpeedMult: () => 1 - SLOW_PER * (stones.get(player) ?? 0),
    npcSpeedMult: () => 1 - SLOW_PER * (stones.get(npc) ?? 0),
    npcTakenMult: () => 1 + HIT_PER * (stones.get(player) ?? 0),
    playerTakenMult: () => 1 + HIT_PER * (stones.get(npc) ?? 0),

    npcSeek() {
      const time = ctx.scene.time.now;
      // A swell is coming over Coyle: walk off the band, the short way.
      const s = swells.find((w) => !w.fired && inSwell(w, npc));
      if (s) {
        const v = s.vertical ? npc.x : npc.y;
        const off = v < s.c ? s.c - BAND - 60 : s.c + BAND + 60;
        return s.vertical ? { x: clamp(off, 50, W - 50), y: npc.y } : { x: npc.x, y: clamp(off, top + 50, H - 50) };
      }
      // Heavier than you and the beam has settled: go and tip it.
      const mine = stones.get(npc) ?? 0;
      if (time >= scaleReady - 500 && mine >= 2 && mine > (stones.get(player) ?? 0)) {
        const a = Math.atan2(npc.y - scaleAt.y, npc.x - scaleAt.x);
        return { x: scaleAt.x + Math.cos(a) * 44, y: scaleAt.y + Math.sin(a) * 44 };
      }
      return null;
    },

    drawGround(g, time) {
      // Swells: a dark trough with foam chevrons pointing the way it rolls; then the crest breaks.
      for (const s of swells) {
        const warnK = clamp(1 - (s.fireAt - time) / WARN_MS, 0, 1);
        const len = s.vertical ? span : W;
        const rect = (c: number, half: number): [number, number, number, number] =>
          s.vertical ? [c - half, top, half * 2, span] : [0, c - half, W, half * 2];
        if (!s.fired) {
          g.fillStyle(SEA_DEEP, 0.12 + warnK * 0.22); g.fillRect(...rect(s.c, BAND));
          g.fillStyle(SEA, 0.1 + warnK * 0.18); g.fillRect(...rect(s.c, BAND * warnK));
          g.lineStyle(2, SEA_LIT, 0.4 + warnK * 0.4);
          const e1 = s.c - BAND, e2 = s.c + BAND;
          if (s.vertical) { g.lineBetween(e1, top, e1, H); g.lineBetween(e2, top, e2, H); } else { g.lineBetween(0, e1, W, e1); g.lineBetween(0, e2, W, e2); }
          for (let p = 30; p < len; p += 70) {
            const q = s.c + s.dir * ((time / 12 + p) % 40 - 20) * 0.6;
            const [ax, ay] = s.vertical ? [q, top + p] : [p, q];
            g.lineStyle(2, FOAM, 0.35 + warnK * 0.4);
            if (s.vertical) { g.lineBetween(ax - s.dir * 8, ay - 8, ax, ay); g.lineBetween(ax - s.dir * 8, ay + 8, ax, ay); } else { g.lineBetween(ax - 8, ay - s.dir * 8, ax, ay); g.lineBetween(ax + 8, ay - s.dir * 8, ax, ay); }
          }
        } else {
          const k = clamp((time - s.fireAt) / 700, 0, 1);
          const crest = s.c - s.dir * BAND + s.dir * BAND * 2 * k;
          g.fillStyle(SEA_SHALLOW, 0.5 * (1 - k)); g.fillRect(...rect(s.c, BAND));
          g.fillStyle(SEA_LIT, 0.7 * (1 - k)); g.fillRect(...rect(crest, 10));
          for (let p = 0; p < len; p += 22) {
            const [fx, fy] = s.vertical ? [crest + s.dir * 6, top + p + 11] : [p + 11, crest + s.dir * 6];
            g.fillStyle(FOAM, 0.85 * (1 - k)); g.fillEllipse(fx, fy, s.vertical ? 9 : 22, s.vertical ? 22 : 9);
          }
        }
      }
      // The weighbridge's footing: a plank platform, barnacled at the edge.
      const { x, y } = scaleAt;
      g.fillStyle(0x000000, 0.28); g.fillEllipse(x, y + 8, 120, 30);
      g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - 54, y - 12, 108, 24);
      for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? DRIFT : DRIFT_LIT, 1); g.fillRect(x - 52 + i * 21, y - 10, 19, 20); }
      g.fillStyle(BARNACLE, 0.7);
      for (let i = 0; i < 9; i++) g.fillCircle(x - 50 + i * 12, y + 11, 2);
    },

    drawAir(g, time) {
      const { x, y } = scaleAt;
      const ready = time >= scaleReady;
      // The post, the beam, and two brass pans swinging on chains.
      g.fillStyle(PILE_WET, 1); g.fillRect(x - 7, y - 78, 14, 78);
      g.fillStyle(PILE, 1); g.fillRect(x - 5, y - 78, 6, 78);
      g.fillStyle(WEED, 0.8); g.fillRect(x - 7, y - 16, 14, 6);
      const bx = Math.cos(tilt) * 56, by = Math.sin(tilt) * 56;
      g.lineStyle(7, DRIFT_DARK, 1); g.lineBetween(x - bx, y - 78 - by, x + bx, y - 78 + by);
      g.lineStyle(3, DRIFT_LIT, 1); g.lineBetween(x - bx, y - 80 - by, x + bx, y - 80 + by);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y - 78, 6);
      g.fillStyle(ready ? BRASS_LIT : BRASS_DARK, 1); g.fillCircle(x, y - 78, 3);
      for (const side of [-1, 1]) {
        const ex = x + side * bx, ey = y - 78 + side * by;
        const sw = Math.sin(time / 400 + side) * 2;
        const py = ey + 34;
        g.lineStyle(1.2, SHINGLE, 1);
        for (const off of [-12, 0, 12]) g.lineBetween(ex, ey, ex + off + sw, py);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(ex + sw, py + 2, 34, 10);
        g.fillStyle(BRASS, 1); g.fillEllipse(ex + sw, py, 32, 8);
        // Counterweights in the pans: tithe-stones with the crown's red band.
        for (let i = 0; i < 2; i++) {
          g.fillStyle(SHINGLE_DARK, 1); g.fillEllipse(ex + sw - 6 + i * 12, py - 4, 11, 8);
          g.fillStyle(BUOY, 1); g.fillRect(ex + sw - 9 + i * 12, py - 5, 6, 2);
        }
      }
      if (!ready) {
        const k = 1 - (scaleReady - time) / SCALE_SETTLE_MS;
        g.lineStyle(3, BRASS, 0.6); g.beginPath(); g.arc(x, y - 78, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      // Stones in flight across the beam.
      for (const t of tosses) {
        const k = clamp((time - t.at) / 520, 0, 1);
        const tx = t.fx + (t.to.x - t.fx) * k, ty = t.fy + (t.to.y - t.fy) * k - Math.sin(k * Math.PI) * 70;
        for (let i = 0; i < t.n; i++) {
          g.fillStyle(SHINGLE_DARK, 1); g.fillEllipse(tx + (i - t.n / 2) * 7, ty + (i % 2) * 5, 12, 9);
          g.fillStyle(SHINGLE, 1); g.fillEllipse(tx + (i - t.n / 2) * 7 - 1, ty + (i % 2) * 5 - 1.5, 8, 5);
        }
      }
      // The ballast on each fighter: stones roped to the ankles, dragging behind.
      for (const f of [player, npc]) {
        const n = stones.get(f) ?? 0;
        if (!alive(f) || n === 0) continue;
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.45;
          const sx = f.x + Math.cos(a) * 30, sy = f.y + 8 + Math.sin(a) * 14;
          g.lineStyle(1.5, i < HEAVY ? ROPE : ROPE_DARK, 1); g.lineBetween(f.x, f.y + 10, sx, sy - 4);
          g.fillStyle(0x000000, 0.3); g.fillEllipse(sx, sy + 4, 14, 4);
          g.fillStyle(SHINGLE_DARK, 1); g.fillEllipse(sx, sy, 13, 10);
          g.fillStyle(SHINGLE, 1); g.fillEllipse(sx - 1.5, sy - 2, 8, 5);
          g.fillStyle(WEED, 0.7); g.fillEllipse(sx + 2, sy + 3, 6, 2);
        }
        if (n >= HEAVY) {
          g.lineStyle(2, BUOY, 0.5 + Math.sin(time / 140) * 0.3); g.strokeEllipse(f.x, f.y + 14, 60, 18);
        }
      }
    },

    drawHud(g, time) {
      // Stone pips either side; the next swell as a curling wave filling in the middle.
      const x = W / 2, y = top + 20;
      for (const [f, side] of [[player, -1], [npc, 1]] as [Fighter, number][]) {
        const n = stones.get(f) ?? 0;
        for (let i = 0; i < MAX_STONES; i++) {
          const cx = x + side * (34 + i * 14);
          g.fillStyle(i < n ? (i >= HEAVY - 1 && n >= HEAVY ? BUOY : SHINGLE) : 0x1e2226, 1); g.fillEllipse(cx, y, 11, 9);
          g.lineStyle(1, f === player ? SEA_LIT : FOAM_DIM, 0.8); g.strokeEllipse(cx, y, 11, 9);
        }
        g.lineStyle(1.5, BUOY, 0.7); g.lineBetween(x + side * (34 + (HEAVY - 1) * 14 - 7), y - 9, x + side * (34 + (HEAVY - 1) * 14 - 7), y + 9);
      }
      const k = clamp(1 - (nextSwell - time) / (two() ? 8000 : 9000), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 15);
      g.fillStyle(SEA, 1); g.fillRect(x - 11, y + 8 - k * 18, 22, k * 18);
      g.lineStyle(2, k > 0.8 ? FOAM : SEA_LIT, 1);
      g.beginPath(); g.arc(x - 2, y + 2, 7, Math.PI * 0.9, Math.PI * 2.1, false); g.strokePath();
      g.lineStyle(2, time >= scaleReady ? BRASS_LIT : BRASS_DARK, 1); g.strokeCircle(x, y, 15);
    },

    destroy() {
      target?.remove();
      target = null;
      stones.clear();
      gainCd.clear();
      swells = [];
      tosses = [];
    },
  };
}

export const FALLEN_WEIGHED_UNDER: GimmickDef = {
  id: fallenId('tidewater', 'weighed-under'),
  rules: 'Hard blows hang ballast on you: slower, but you hit harder. Swells sink anyone carrying three. Strike the weighbridge to tip yours onto the foe.',
  make,
};
