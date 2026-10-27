import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_HORN } from '../encounters';
import {
  BARK_DARK, GILT, LEAF_GOLD, LEAF_GREEN, SUN, clamp, dist, frameClock, huntingHorn, noise,
} from '../util';

/**
 * Horn Call — Halloo the Horn-Blower calls the hunt, and the forest answers. Every few seconds
 * he lifts the great horn and **a blast rolls out of him as a ring of sound**, with one gap in it
 * where his breath catches. Then the treeline does what treelines do: the wall of trunks on the
 * **far side** of the glade from where he stood throws the call back — **a second later, a
 * straight wave of echo** comes rolling in off those trees, all the way across the floor.
 *
 * The echo has holes in it. Where the old oaks stand thin in the treeline, light comes through
 * in a shaft and no sound bounces — those gaps are shown on the far wall the moment he blows, so
 * you have time to find one.
 *
 * The rule the player can turn: **the echo is not his.** His own ring cannot touch him, but the
 * call coming back off the trees hits whoever is in its way — Halloo included.
 */

interface Ring { x: number; y: number; bornAt: number; gapA: number; maxR: number; dealt: boolean }
type Wall = 'l' | 'r' | 't' | 'b';
interface Echo { wall: Wall; startAt: number; gaps: number[]; dealtP: boolean; dealtN: boolean; announced: boolean }

const RING_SPD = 290;
const ECHO_SPD = 300;
const BAND = 22;
const GAP_HALF = 64;

function makeHornCall(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const period = hard ? 3600 : 4400;
  const windMs = 750;
  const ringDmg = hard ? 12 : 10;
  const echoDmg = hard ? 13 : 11;
  const gapHalfA = 0.42;

  const rings: Ring[] = [];
  const echoes: Echo[] = [];
  let nextBlow = ctx.scene.time.now + 2400;
  let windAt = 0;

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  /** Where along the wall's length a point sits (y for side walls, x for top/bottom). */
  const along = (w: Wall, x: number, y: number): number => (w === 'l' || w === 'r' ? y : x);
  /** How far the echo front has travelled off its wall. */
  const frontPos = (e: Echo, time: number): number => (time - e.startAt) * ECHO_SPD / 1000;
  /** Distance of a point from the echo's wall. */
  const offWall = (w: Wall, x: number, y: number): number => (w === 'l' ? x : w === 'r' ? W - x : w === 't' ? y - top : H - y);
  const span = (w: Wall): number => (w === 'l' || w === 'r' ? H - top : W);
  const inGap = (e: Echo, x: number, y: number): boolean => e.gaps.some((c) => Math.abs(along(e.wall, x, y) - c) < GAP_HALF);

  const blow = (time: number): void => {
    const n = ctx.npc;
    const far = (Math.hypot(Math.max(n.x, W - n.x), Math.max(n.y - top, H - n.y)));
    rings.push({ x: n.x, y: n.y, bornAt: time, gapA: ctx.rng() * Math.PI * 2, maxR: far + 40, dealt: false });
    // The far wall: whichever is furthest from where he stands.
    const dl = n.x, dr = W - n.x, dt = n.y - top, db = H - n.y;
    const m = Math.max(dl, dr, dt, db);
    const wall: Wall = m === dl ? 'l' : m === dr ? 'r' : m === dt ? 't' : 'b';
    const reach = (m / RING_SPD) * 1000;
    const len = span(wall);
    const base = wall === 'l' || wall === 'r' ? top : 0;
    const nGaps = hard ? 1 : 2;
    const gaps: number[] = [];
    for (let i = 0; i < nGaps; i++) {
      for (let tries = 0; tries < 10; tries++) {
        const c = base + 90 + ctx.rng() * (len - 180);
        if (gaps.every((o) => Math.abs(o - c) > GAP_HALF * 3)) { gaps.push(c); break; }
      }
    }
    echoes.push({ wall, startAt: time + reach + ctx.tk.warn(1000), gaps, dealtP: false, dealtN: false, announced: false });
    ctx.float(n.x, n.y - 58, 'HALLOO!', '#ffd27a');
    ctx.sfx('sonic-pulse');
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      if (!windAt && time >= nextBlow - windMs && alive(ctx.npc)) windAt = time;
      if (time >= nextBlow && alive(ctx.npc)) { blow(time); nextBlow = time + period; windAt = 0; }

      const p = ctx.player;
      for (const r of rings) {
        if (r.dealt || !alive(p)) continue;
        const rad = ((time - r.bornAt) / 1000) * RING_SPD;
        const d = dist(p.x, p.y, r.x, r.y);
        if (Math.abs(d - rad) < BAND / 2 + 14) {
          let da = Math.atan2(p.y - r.y, p.x - r.x) - r.gapA;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > gapHalfA) { r.dealt = true; ctx.hit(p, ringDmg, p.x, p.y); ctx.sfx('hit-medium'); }
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) if (((time - rings[i].bornAt) / 1000) * RING_SPD > rings[i].maxR) rings.splice(i, 1);

      for (const e of echoes) {
        if (time < e.startAt) continue;
        if (!e.announced) { e.announced = true; ctx.sfx('screech'); }
        const fp = frontPos(e, time);
        for (const [f, isP] of [[ctx.player, true], [ctx.npc, false]] as const) {
          if (!alive(f) || (isP ? e.dealtP : e.dealtN)) continue;
          if (Math.abs(offWall(e.wall, f.x, f.y) - fp) < BAND / 2 + 14 && !inGap(e, f.x, f.y)) {
            if (isP) e.dealtP = true; else e.dealtN = true;
            ctx.hit(f, echoDmg, f.x, f.y);
            ctx.float(f.x, f.y - 48, isP ? 'ECHO' : 'HIS OWN ECHO!', isP ? '#ffb27a' : '#9ae8ff');
            ctx.sfx('hit-medium');
          }
        }
      }
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        const len = e.wall === 'l' || e.wall === 'r' ? W : H - top;
        if (time > e.startAt && frontPos(e, time) > len + 30) echoes.splice(i, 1);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const now = ctx.scene.time.now;
      // The echo is coming: line up with the nearest hole in it.
      let soonest: Echo | null = null;
      for (const e of echoes) if (!e.dealtN && (!soonest || e.startAt < soonest.startAt)) soonest = e;
      if (!soonest || soonest.startAt - now > 2600) return null;
      const here = along(soonest.wall, n.x, n.y);
      let c = soonest.gaps[0] ?? here;
      for (const g of soonest.gaps) if (Math.abs(g - here) < Math.abs(c - here)) c = g;
      if (soonest.wall === 'l' || soonest.wall === 'r') return { x: n.x, y: clamp(c, top + 40, H - 40) };
      return { x: clamp(c, 50, W - 50), y: n.y };
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // The treeline round the glade: a canopy rim on all four sides.
      const rim = (x: number, y: number, r: number, seed: number): void => {
        g.fillStyle(0x0e1a10, 0.85); g.fillCircle(x, y, r + 4);
        g.fillStyle(noise(seed) < 0.3 ? LEAF_GOLD : LEAF_GREEN, 0.9); g.fillCircle(x, y, r);
        g.fillStyle(0x2a3a1a, 0.6); g.fillCircle(x + r * 0.2, y + r * 0.25, r * 0.6);
        g.fillStyle(BARK_DARK, 1); g.fillCircle(x, y, r * 0.22);
      };
      for (let x = 20; x < W; x += 54) { rim(x, top - 4 + noise(x) * 8, 22 + noise(x + 1) * 8, x); rim(x + 20, H + 6 - noise(x + 2) * 8, 22 + noise(x + 3) * 8, x + 9); }
      for (let y = top + 30; y < H; y += 54) { rim(-6 + noise(y) * 8, y, 20 + noise(y + 1) * 8, y + 4); rim(W + 6 - noise(y + 2) * 8, y, 20 + noise(y + 3) * 8, y + 7); }

      // Pending echoes: their wall lights up along its length, with sun-shafts where the gaps are.
      for (const e of echoes) {
        if (time >= e.startAt) continue;
        const c = clamp(1 - (e.startAt - time) / 2600, 0, 1);
        const vertical = e.wall === 'l' || e.wall === 'r';
        const wx = e.wall === 'l' ? 0 : e.wall === 'r' ? W - 30 : 0;
        const wy = e.wall === 't' ? top : e.wall === 'b' ? H - 30 : top;
        g.fillStyle(GILT, 0.12 + c * 0.25);
        if (vertical) g.fillRect(wx, wy, 30, H - top); else g.fillRect(wx, wy, W, 30);
        for (const gc of e.gaps) {
          g.fillStyle(SUN, 0.14 + c * 0.12);
          if (vertical) {
            g.fillRect(0, gc - GAP_HALF, W, GAP_HALF * 2);
            g.fillStyle(SUN, 0.5); g.fillRect(wx, gc - GAP_HALF, 30, GAP_HALF * 2);
          } else {
            g.fillRect(gc - GAP_HALF, top, GAP_HALF * 2, H - top);
            g.fillStyle(SUN, 0.5); g.fillRect(gc - GAP_HALF, wy, GAP_HALF * 2, 30);
          }
          // Motes drifting in the shaft.
          for (let k = 0; k < 6; k++) {
            const ph = (ts * 0.2 + k / 6) % 1;
            const mx = vertical ? ph * W : gc + (noise(k + gc) - 0.5) * GAP_HALF * 1.6;
            const my = vertical ? gc + (noise(k + gc) - 0.5) * GAP_HALF * 1.6 : top + ph * (H - top);
            g.fillStyle(0xffffff, 0.5); g.fillCircle(mx, my, 1.6);
          }
        }
      }
    },

    drawAir(g, time) {
      const ts = time / 1000;
      // Horn rings: brass-gold arcs of sound, three thin bands, the gap left clean.
      for (const r of rings) {
        const rad = ((time - r.bornAt) / 1000) * RING_SPD;
        const fade = clamp(1 - rad / r.maxR, 0.2, 1);
        for (let k = 0; k < 3; k++) {
          const rr = rad - k * 8;
          if (rr <= 4) continue;
          g.lineStyle(k === 0 ? 5 : 2, k === 0 ? 0xffd27a : GILT, (k === 0 ? 0.85 : 0.5) * fade);
          g.beginPath(); g.arc(r.x, r.y, rr, r.gapA + gapHalfA, r.gapA + Math.PI * 2 - gapHalfA, false); g.strokePath();
        }
        // Little notes riding the front.
        for (let k = 0; k < 8; k++) {
          const a = r.gapA + gapHalfA + ((k + 0.5) / 8) * (Math.PI * 2 - gapHalfA * 2);
          const x = r.x + Math.cos(a) * rad, y = r.y + Math.sin(a) * rad;
          g.fillStyle(0xfff0c0, 0.7 * fade); g.fillCircle(x, y - 4, 3);
          g.lineStyle(1.5, 0xfff0c0, 0.7 * fade); g.lineBetween(x + 3, y - 4, x + 3, y - 14);
        }
      }
      // Echo fronts: a straight wall of paler, doubled sound rolling in off the trees.
      for (const e of echoes) {
        if (time < e.startAt) continue;
        const fp = frontPos(e, time);
        const vertical = e.wall === 'l' || e.wall === 'r';
        const len = span(e.wall);
        const base = vertical ? top : 0;
        for (let s = base; s < base + len; s += 14) {
          const mid = s + 7;
          if (e.gaps.some((c) => Math.abs(mid - c) < GAP_HALF)) continue;
          for (let k = 0; k < 2; k++) {
            const off = fp - k * 10;
            const wob = Math.sin(mid * 0.08 + ts * 8) * 3;
            const x = e.wall === 'l' ? off + wob : e.wall === 'r' ? W - off - wob : mid;
            const y = e.wall === 't' ? top + off + wob : e.wall === 'b' ? H - off - wob : mid;
            g.lineStyle(k === 0 ? 4 : 2, k === 0 ? 0xe8e0ff : 0xb8a8e8, k === 0 ? 0.75 : 0.4);
            if (vertical) g.lineBetween(x, y - 6, x + (e.wall === 'l' ? 4 : -4), y + 6);
            else g.lineBetween(x - 6, y, x + 6, y + (e.wall === 't' ? 4 : -4));
          }
        }
      }
      // Halloo's breath: the horn lifts as the next call fills.
      const n = ctx.npc;
      if (alive(n)) {
        const k = windAt ? clamp((time - windAt) / windMs, 0, 1) : 0;
        huntingHorn(g, n.x + 22, n.y - 18 - k * 14, 14, 1);
        if (k > 0) {
          g.lineStyle(3, 0xffd27a, 0.8); g.beginPath(); g.arc(n.x, n.y - 60, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
          if (k > 0.75 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(n.x, n.y, 34); }
        }
      }
    },
  };
}

export const HORN_CALL: GimmickDef = {
  id: GIM_HORN,
  rules: 'Each horn blast rolls out as a ring. A second later the far treeline throws it back as a straight wave — stand where the trees thin.',
  make: makeHornCall,
};
