import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, CREAM, GRAVEL_DARK, NAVY_DARK, SCARLET, SCARLET_LIT,
  WOOD, WOOD_DARK, WOOD_LIT,
} from '../palette';
import { alive, clamp, dist, segInfo, stepDt, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Paced Out — Colour-Sergeant Ruthven Paceby.
 *
 * The drill square is measured with a pace-stick: a great rosewood compass with brass ferrules,
 * walked across the gravel one leg at a time, so every step on Choirholm is thirty inches and no
 * more. Paceby walks his giant one after stragglers. In the star's telling, you are one.
 *
 * One ferrule stays planted; the other is lifted (its half-circle sweep is shaded and its landing
 * ringed) and wheeled round to land a pace on toward **whoever is farther from the planted leg**
 * — the straggler. The swinging leg clouts everyone it sweeps; the landing ferrule pins whoever
 * is under it. Then the legs swap. So keep *him* the straggler: stay nearer the stick than he is.
 * Strike the brass hinge to call the straggler yourself: the next three paces go at your foe.
 * Past half the stick is opened wider and walked at the double.
 */

const PACE = 150;
const HALF_PACE = 195;
const PACE_MS = 1650;
const HALF_PACE_MS = 1300;
const WARN_MS = 800;
const HALF_WARN_MS = 680;
const SWING_MS = 420;
const SWEEP_DMG = 12;
const PIN_DMG = 9;
const PIN_R = 36;
const PIN_MS = 900;
const LEG_W = 14;

/** One leg of the stick: rosewood with a lit edge and a brass ferrule at the foot. */
function leg(g: G, fx: number, fy: number, hx: number, hy: number): void {
  g.lineStyle(9, WOOD_DARK, 1); g.lineBetween(fx, fy, hx, hy);
  g.lineStyle(5, WOOD, 1); g.lineBetween(fx, fy, hx, hy);
  g.lineStyle(1.5, WOOD_LIT, 0.8); g.lineBetween(fx - 1.5, fy, hx - 1.5, hy);
  // Brass bands up the leg and the pointed ferrule.
  const dx = hx - fx, dy = hy - fy;
  for (const k of [0.35, 0.7]) { g.fillStyle(BRASS, 1); g.fillCircle(fx + dx * k, fy + dy * k, 4); }
  const m = Math.hypot(dx, dy) || 1;
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(fx, fy, fx + (dx / m) * 14 - (dy / m) * 5, fy + (dy / m) * 14 + (dx / m) * 5, fx + (dx / m) * 14 + (dy / m) * 5, fy + (dy / m) * 14 - (dx / m) * 5);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx + (dx / m) * 12, fy + (dy / m) * 12, 2.5);
}

/** The hinge: a brass disc with the pace-adjuster's screw-wheel and the sergeant's tassel. */
function hinge(g: G, x: number, y: number, t: number, called: boolean): void {
  g.fillStyle(BRASS_DEEP, 1); g.fillCircle(x, y, 11);
  g.fillStyle(called ? BRASS_SHINE : BRASS, 1); g.fillCircle(x, y, 9);
  g.lineStyle(1.5, BRASS_DARK, 1);
  for (let i = 0; i < 6; i++) { const a = t / 300 + (i / 6) * Math.PI * 2; g.lineBetween(x, y, x + Math.cos(a) * 7, y + Math.sin(a) * 7); }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 3);
  g.lineStyle(2, SCARLET, 1); g.lineBetween(x, y + 9, x + Math.sin(t / 260) * 4, y + 24);
  g.fillStyle(SCARLET_LIT, 1); g.fillEllipse(x + Math.sin(t / 260) * 4, y + 27, 6, 9);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x + Math.sin(t / 260) * 4 - 3, y + 22, 6, 2);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  let A: Pt = { x: W / 2 - 60, y: (top + H) / 2 };
  let B: Pt = { x: A.x + PACE, y: A.y };
  let pace = PACE;
  let paceMs = PACE_MS, warnMs = WARN_MS;
  let doubled = false;
  let nextPaceAt = ctx.scene.time.now + 1800;
  let planned: { from: number; delta: number; at: Pt; toward: Fighter } | null = null;
  let swingAt = -1;
  const swept = new Set<Fighter>();
  let called: { who: Fighter; paces: number } | null = null;
  let lastCall = -9999;

  const inArena = (p: Pt) => p.x > 60 && p.x < W - 60 && p.y > top + 50 && p.y < H - 40;
  const tipAt = (a: number): Pt => ({ x: A.x + Math.cos(a) * pace, y: A.y + Math.sin(a) * pace });
  const straggler = (): Fighter => {
    if (called && alive(called.who)) return called.who;
    if (!alive(npc)) return player;
    if (!alive(player)) return npc;
    return dist(player.x, player.y, A.x, A.y) >= dist(npc.x, npc.y, A.x, A.y) ? player : npc;
  };

  const hingeT = ctx.target({
    x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, r: 24, passThrough: true,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (now - lastCall < 1500) return;
      lastCall = now;
      called = { who: by === 'player' ? npc : player, paces: 3 };
      ctx.float((A.x + B.x) / 2, (A.y + B.y) / 2 - 60, by === 'player' ? 'STRAGGLER: HIM!' : 'STRAGGLER: YOU!', by === 'player' ? '#9ad0ff' : '#ffb070');
      ctx.sfx('clang');
    },
  });

  const plan = () => {
    const who = straggler();
    const from = Math.atan2(B.y - A.y, B.x - A.x);
    const want = Math.atan2(who.y - A.y, who.x - A.x);
    // The landing nearest the straggler's bearing that stays on the square.
    let best = want;
    for (let k = 0; k <= 8; k++) {
      const c1 = want + k * 0.4, c2 = want - k * 0.4;
      if (inArena(tipAt(c1))) { best = c1; break; }
      if (inArena(tipAt(c2))) { best = c2; break; }
    }
    let delta = wrapAngle(best - from);
    if (Math.abs(delta) < 0.35) delta = (delta >= 0 ? 1 : -1) * 0.35;
    planned = { from, delta, at: tipAt(from + delta), toward: who };
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!doubled && alive(npc) && npc.hp / npc.maxHp < 0.5) {
        doubled = true;
        pace = HALF_PACE; paceMs = HALF_PACE_MS; warnMs = HALF_WARN_MS;
        const a = Math.atan2(B.y - A.y, B.x - A.x);
        B = tipAt(a);
        ctx.banner('"Stick open — wider! Double time!" The pace grows and the stick walks faster.', '#ffd27a');
        ctx.sfx('gear-turn');
      }
      if (!planned && time >= nextPaceAt - warnMs) { plan(); ctx.sfx('trap-set'); }
      if (planned && swingAt < 0 && time >= nextPaceAt) { swingAt = time; swept.clear(); ctx.sfx('whoosh'); }
      if (planned && swingAt >= 0) {
        const k = clamp((time - swingAt) / SWING_MS, 0, 1);
        const e = k * k * (3 - 2 * k);
        const tip = tipAt(planned.from + planned.delta * e);
        for (const f of [player, npc]) {
          if (!alive(f) || swept.has(f)) continue;
          if (segInfo(f.x, f.y, A.x, A.y, tip.x, tip.y).d < LEG_W + 20) {
            swept.add(f);
            ctx.hit(f, SWEEP_DMG, f.x, f.y);
            const ta = planned.from + planned.delta * e + Math.sign(planned.delta) * Math.PI / 2;
            ctx.nudge(f, Math.cos(ta) * 70, Math.sin(ta) * 70);
            ctx.sfx('hit-medium');
          }
        }
        if (k >= 1) {
          const L = planned.at;
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, L.x, L.y) > PIN_R) continue;
            ctx.hit(f, PIN_DMG, f.x, f.y);
            ctx.root(f, PIN_MS);
            ctx.float(f.x, f.y - 46, 'PINNED!', '#ff9a7a');
          }
          ctx.sfx('stab');
          ctx.flash(L.x, L.y, BRASS_LIT);
          // The legs swap: the landed ferrule plants, the old one lifts next.
          B = A; A = L;
          if (called && --called.paces <= 0) called = null;
          planned = null; swingAt = -1;
          nextPaceAt = time + paceMs;
        }
      }
      hingeT.moveTo((A.x + B.x) / 2, (A.y + B.y) / 2);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Out of a shaded sweep or a landing ring.
      if (planned) {
        const L = planned.at;
        const na = Math.atan2(npc.y - A.y, npc.x - A.x);
        const off = wrapAngle(na - planned.from);
        const inSweep = dist(npc.x, npc.y, A.x, A.y) < pace + 30 && (planned.delta > 0 ? off > -0.2 && off < planned.delta + 0.2 : off < 0.2 && off > planned.delta - 0.2);
        if (inSweep || dist(npc.x, npc.y, L.x, L.y) < PIN_R + 30) {
          const back = planned.from + planned.delta / 2 + Math.PI;
          return { x: clamp(A.x + Math.cos(back) * (pace * 0.6), 60, W - 60), y: clamp(A.y + Math.sin(back) * (pace * 0.6), top + 50, H - 40) };
        }
      }
      // Stay closer to the planted leg than the player is, on the far side from them.
      const a = Math.atan2(A.y - player.y, A.x - player.x);
      const r = Math.min(pace + 50, Math.max(70, dist(player.x, player.y, A.x, A.y) - 90));
      return { x: clamp(A.x + Math.cos(a) * r, 60, W - 60), y: clamp(A.y + Math.sin(a) * r, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The planted ferrule's bed of kicked-up gravel.
      g.fillStyle(GRAVEL_DARK, 0.6); g.fillEllipse(A.x, A.y + 2, 26, 12);
      g.fillStyle(BRASS_DEEP, 1); g.fillCircle(A.x, A.y, 4);
      if (!planned) return;
      const k = swingAt < 0 ? clamp(1 - (nextPaceAt - time) / warnMs, 0, 1) : 1;
      const lo = Math.min(planned.from, planned.from + planned.delta), hi = Math.max(planned.from, planned.from + planned.delta);
      const mine = planned.toward === npc;
      g.fillStyle(mine ? 0x9ad0ff : SCARLET, 0.08 + k * 0.16);
      g.slice(A.x, A.y, pace + LEG_W, lo, hi, false); g.fillPath();
      g.lineStyle(2, mine ? 0x9ad0ff : SCARLET_LIT, 0.3 + k * 0.5);
      g.beginPath(); g.arc(A.x, A.y, pace + LEG_W, lo, hi, false); g.strokePath();
      // The landing: a chalk ring and the ferrule's cross.
      const L = planned.at;
      g.lineStyle(3, CREAM, 0.35 + k * 0.5); g.strokeCircle(L.x, L.y, PIN_R * (1.4 - k * 0.4));
      g.lineStyle(2, BRASS_LIT, 0.5 + k * 0.4);
      g.lineBetween(L.x - 10, L.y, L.x + 10, L.y); g.lineBetween(L.x, L.y - 10, L.x, L.y + 10);
    },

    drawAir(g, time) {
      // The stick: an inverted V, or one leg wheeling round the planted one.
      let tip = B;
      let lift = 0;
      if (planned) {
        const k = swingAt < 0 ? clamp(1 - (nextPaceAt - time) / warnMs, 0, 1) * 0.25 : clamp((time - swingAt) / SWING_MS, 0, 1);
        const e = swingAt < 0 ? 0 : k * k * (3 - 2 * k);
        tip = tipAt(planned.from + planned.delta * e);
        lift = swingAt < 0 ? k * 40 : Math.sin(Math.PI * k) * 34;
      }
      const hx = (A.x + tip.x) / 2, hy = (A.y + tip.y) / 2 - 70 - lift;
      shadow(g, (A.x + tip.x) / 2, (A.y + tip.y) / 2 + 4, Math.abs(tip.x - A.x) + 30, 12, 0.22);
      g.lineStyle(3, dim(GRAVEL_DARK, 0.4), 0.35); g.lineBetween(A.x, A.y + 2, tip.x, tip.y + 2);
      leg(g, A.x, A.y, hx, hy);
      leg(g, tip.x, tip.y - lift * 0.6, hx, hy);
      hinge(g, hx, hy, time, !!called);
    },

    drawHud(g) {
      // Who is the straggler: two pips, the stick's arrow over the one it walks at.
      const x = W / 2, y = top + 18;
      const who = planned?.toward ?? straggler();
      g.fillStyle(NAVY_DARK, 0.75); g.fillRoundedRect(x - 70, y - 13, 140, 26, 8);
      g.lineStyle(1.5, BRASS, 0.9); g.strokeRoundedRect(x - 70, y - 13, 140, 26, 8);
      for (const [f, px, c] of [[player, x - 34, 0x9ad0ff], [npc, x + 34, 0xffa040]] as [Fighter, number, number][]) {
        g.fillStyle(c, 1); g.fillCircle(px, y, 6);
        if (f === who) {
          g.lineStyle(2.5, BRASS_LIT, 1);
          g.lineBetween(px - 14, y - 4, px - 7, y); g.lineBetween(px - 14, y + 4, px - 7, y);
          g.lineBetween(px + 14, y - 4, px + 7, y); g.lineBetween(px + 14, y + 4, px + 7, y);
        }
      }
      if (called) for (let i = 0; i < called.paces; i++) { g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(x - 6 + i * 6, y + 8, 2); }
    },

    destroy() { hingeT.remove(); },
  };
}

export const FALLEN_PACE_STICK: GimmickDef = {
  id: fallenId('brass', 'pace-stick'),
  rules: 'The pace-stick wheels a leg round at whoever is farther from it, clouting all it sweeps and pinning where it lands. Strike the hinge to call him.',
  make,
};
