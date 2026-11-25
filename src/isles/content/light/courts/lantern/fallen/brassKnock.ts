import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { soulLantern } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, IRON_LIT, LIME_DARK, LIME_DEEP, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, segDist } from '../util';
import { THEM, wirePlate, YOU } from './common';

/**
 * Brass Knock — Capwright Thibault Orme.
 *
 * Orme casts the heavy brass lanterns for Wire Fourteen, the penitents' wire, and before any of
 * them goes up he hangs five in a row from a test-beam and knocks the end one, to hear the brass
 * ring true all the way down. Three of his test-rows stand in the yard. Strike an end lantern and
 * the knock runs through the row — you can see it pass, lantern to lantern — and the lantern at
 * the *far* end swings out along the row's line, clouting whoever stands in the chalked lane
 * beyond it. The struck end does not move: the blow always comes out the other side.
 *
 * Two things to do with that. Stand where Orme is not, strike the end by you, and the far lantern
 * swings out at him. Or strike a row's middle lantern to grip it: the row goes dead for a while,
 * and a knock already running through it is caught before it swings. Orme raps a row himself every
 * few seconds — the one whose far lane is nearest you — with his mallet raised in plain sight first.
 *
 * Halfway down he hears it ring false and the rows start to rebound: the far lantern swings back,
 * the knock runs home again, and the end that was struck swings out in its turn. From then on,
 * never strike a row from its own end's lane.
 */

const SP = 34;            // lantern spacing along a row
const LANE = 130;         // how far a swing reaches out past the end lantern
const HALF = 24;          // half-width of the lane
const KNOCK = 240;        // ms for the knock to run the row
const WARN = 650;         // ms the far lantern trembles before it swings
const BACK = 320;         // ms for it to swing home
const GRIP_MS = 5000;     // a gripped row stays dead this long
const HAMMER = 800;       // Orme's mallet hangs raised this long
const EVERY = 5200;       // ms between Orme's own knocks
const DMG = 15;

type End = 0 | 4;

interface Pulse { from: End; t0: number; rebound: boolean; hitA: boolean; hitB: boolean }
interface Row {
  cx: number; cy: number; ax: number; ay: number;
  ends: [StrikeTarget, StrikeTarget]; mid: StrikeTarget;
  gripUntil: number; pulse: Pulse | null; gripAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc } = ctx;
  let rebound = false;
  let hammer: { row: Row; end: End; at: number } | null = null;
  let nextKnock = 0;
  let started = false;

  const rows: Row[] = [];
  const at = (r: Row, i: number): Pt => ({ x: r.cx + r.ax * (i - 2) * SP, y: r.cy + r.ay * (i - 2) * SP });
  /** The outward direction at an end: away from the row's middle. */
  const out = (r: Row, e: End): Pt => (e === 4 ? { x: r.ax, y: r.ay } : { x: -r.ax, y: -r.ay });
  /** The lane a swing from end `e` sweeps: from just past the lantern to the swing's reach. */
  const lane = (r: Row, e: End): [Pt, Pt] => {
    const p = at(r, e), o = out(r, e);
    return [{ x: p.x + o.x * 16, y: p.y + o.y * 16 }, { x: p.x + o.x * (16 + LANE), y: p.y + o.y * (16 + LANE) }];
  };
  const laneMid = (r: Row, e: End): Pt => { const [a, b] = lane(r, e); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const inLane = (f: Fighter, r: Row, e: End, pad = 18): boolean => {
    const [a, b] = lane(r, e);
    return segDist(f.x, f.y, a.x, a.y, b.x, b.y) < HALF + pad;
  };

  /** A pulse's timeline: when the far end swings (A) and, rebounding, when the struck end does (B). */
  const times = (p: Pulse) => {
    const armA = p.t0 + KNOCK, hitA = armA + WARN, homeA = hitA + BACK;
    const armB = homeA + KNOCK, hitB = armB + WARN, homeB = hitB + BACK;
    return { armA, hitA, homeA, armB, hitB, homeB, end: p.rebound ? homeB : homeA };
  };

  function knock(r: Row, from: End, time: number): void {
    if (r.pulse || time < r.gripUntil) return;
    r.pulse = { from, t0: time, rebound, hitA: false, hitB: false };
    ctx.sfx('clang');
  }

  function swingHits(r: Row, e: End): void {
    const o = out(r, e);
    for (const f of [player, npc]) {
      if (!alive(f) || !inLane(f, r, e)) continue;
      ctx.hit(f, DMG, f.x, f.y);
      ctx.nudge(f, o.x * 55, o.y * 55);
    }
    const p = at(r, e);
    ctx.flash(p.x + o.x * 60, p.y + o.y * 60, BRASS_LIT);
    ctx.sfx('hit-heavy');
  }

  function addRow(cx: number, cy: number, ax: number, ay: number): void {
    const r = { cx, cy, ax, ay, gripUntil: 0, pulse: null, gripAt: 0 } as unknown as Row;
    const endTarget = (e: End): StrikeTarget => {
      const p = at(r, e);
      return ctx.target({ x: p.x, y: p.y, r: 17, onStruck: () => knock(r, e, ctx.scene.time.now) });
    };
    r.ends = [endTarget(0), endTarget(4)];
    const m = at(r, 2);
    r.mid = ctx.target({
      x: m.x, y: m.y, r: 15,
      onStruck: () => {
        const now = ctx.scene.time.now;
        if (now < r.gripUntil) return;
        r.gripUntil = now + GRIP_MS;
        r.gripAt = now;
        // A grip catches a knock that has not yet swung its lantern out.
        if (r.pulse) {
          const tm = times(r.pulse);
          if (now < tm.hitA - 140 || (r.pulse.rebound && now > tm.homeA && now < tm.hitB - 140)) r.pulse = null;
        }
        ctx.sfx('chain');
      },
    });
    rows.push(r);
  }
  addRow(430, top + 112, 1, 0);
  addRow(640, 500, 1, 0);
  addRow(W - 80, 330, 0, 1);

  /** How far lantern `i` of a row hangs off true right now (signed, along the row's axis). */
  function swingOf(r: Row, i: number, time: number): number {
    const p = r.pulse;
    if (!p) return 0;
    const tm = times(p);
    const far: End = p.from === 0 ? 4 : 0;
    const sign = (e: End) => (e === 4 ? 1 : -1);
    const arc = (e: End, hit: number) => {
      if (time < hit - 140 || time > hit + BACK) return 0;
      const k = time < hit ? (time - (hit - 140)) / 140 : 1 - (time - hit) / BACK;
      return sign(e) * LANE * 0.55 * Math.sin(clamp(k, 0, 1) * Math.PI / 2);
    };
    if (i === far) return arc(far, tm.hitA);
    if (p.rebound && i === p.from) return arc(p.from, tm.hitB);
    return 0;
  }

  return {
    update(time) {
      if (!started) { started = true; nextKnock = time + 3000; }
      if (!rebound && alive(npc) && npc.hp <= npc.maxHp * 0.5) {
        rebound = true;
        ctx.banner('THE ROWS REBOUND', '#f0d68a');
        ctx.sfx('boss-phase');
      }

      for (const r of rows) {
        const p = r.pulse;
        if (!p) continue;
        const tm = times(p);
        const far: End = p.from === 0 ? 4 : 0;
        if (!p.hitA && time >= tm.hitA) { p.hitA = true; swingHits(r, far); }
        if (p.rebound && !p.hitB && time >= tm.hitB) { p.hitB = true; swingHits(r, p.from); }
        if (time >= tm.end) r.pulse = null;
      }

      // Orme's own knock: the row whose far lane lies nearest you, mallet up first.
      if (!hammer && time >= nextKnock - HAMMER && alive(player) && alive(npc)) {
        let best: { row: Row; end: End; d: number } | null = null;
        for (const r of rows) {
          if (r.pulse || time < r.gripUntil + 200) continue;
          for (const s of [0, 4] as End[]) {
            const m = laneMid(r, s === 0 ? 4 : 0);
            const d = dist(m.x, m.y, player.x, player.y);
            if (!best || d < best.d) best = { row: r, end: s, d };
          }
        }
        if (best) { hammer = { row: best.row, end: best.end, at: time + HAMMER }; ctx.sfx('hammer-forge'); }
        else nextKnock = time + 1200;
      }
      if (hammer && time >= hammer.at) {
        knock(hammer.row, hammer.end, time);
        hammer = null;
        nextKnock = time + EVERY;
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Out of any lane that is about to swing.
      for (const r of rows) {
        const p = r.pulse;
        if (!p) continue;
        const tm = times(p);
        const far: End = p.from === 0 ? 4 : 0;
        const live: End[] = [];
        if (!p.hitA) live.push(far);
        if (p.rebound && !p.hitB && now > tm.homeA - 200) live.push(p.from);
        for (const e of live) {
          if (!inLane(npc, r, e, 46)) continue;
          const side = (npc.x - r.cx) * -r.ay + (npc.y - r.cy) * r.ax >= 0 ? 1 : -1;
          return { x: clamp(npc.x - r.ay * side * 90, 60, W - 60), y: clamp(npc.y + r.ax * side * 90, top + 40, ctx.H - 40) };
        }
      }
      // Spring a row on the stranger: stand by the end whose far lane holds them.
      let spot: Pt | null = null;
      let bd = 440;
      for (const r of rows) {
        if (r.pulse || now < r.gripUntil) continue;
        for (const s of [0, 4] as End[]) {
          if (!inLane(player, r, s === 0 ? 4 : 0, 30)) continue;
          const p = at(r, s);
          const side = (npc.x - r.cx) * -r.ay + (npc.y - r.cy) * r.ax >= 0 ? 1 : -1;
          const c = { x: p.x - r.ay * side * 52, y: p.y + r.ax * side * 52 };
          const d = dist(npc.x, npc.y, c.x, c.y);
          if (d < bd) { bd = d; spot = c; }
        }
      }
      if (spot) return { x: clamp(spot.x, 60, W - 60), y: clamp(spot.y, top + 40, ctx.H - 40) };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 40, ctx.H - 40) };
    },

    drawGround(g, time) {
      for (const r of rows) {
        // The row's footing: a worn limestone sill with a brass rule let into it.
        const a = at(r, 0), b = at(r, 4);
        const px = -r.ay * 14, py = r.ax * 14;
        g.fillStyle(LIME_DEEP, 0.35);
        g.fillPoints([{ x: a.x + px - r.ax * 18, y: a.y + py - r.ay * 18 }, { x: b.x + px + r.ax * 18, y: b.y + py + r.ay * 18 },
          { x: b.x - px + r.ax * 18, y: b.y - py + r.ay * 18 }, { x: a.x - px - r.ax * 18, y: a.y - py - r.ay * 18 }], true);
        g.lineStyle(2, BRASS_DARK, 0.7); g.lineBetween(a.x, a.y, b.x, b.y);
        // Both end lanes, chalked faintly always; brightly while they are about to swing.
        const p = r.pulse;
        const tm = p ? times(p) : null;
        for (const e of [0, 4] as End[]) {
          const [l0, l1] = lane(r, e);
          const nx = -r.ay * HALF, ny = r.ax * HALF;
          let k = 0;
          if (p && tm) {
            const far: End = p.from === 0 ? 4 : 0;
            if (e === far && !p.hitA && time >= tm.armA - KNOCK) k = clamp((time - tm.armA) / WARN, 0, 1) * 0.85 + 0.15;
            if (p.rebound && e === p.from && !p.hitB && time >= tm.homeA) k = clamp((time - tm.armB) / WARN, 0, 1) * 0.85 + 0.15;
          }
          if (hammer && hammer.row === r && e === (hammer.end === 0 ? 4 : 0)) k = Math.max(k, 0.12);
          const quad = [{ x: l0.x + nx, y: l0.y + ny }, { x: l1.x + nx, y: l1.y + ny }, { x: l1.x - nx, y: l1.y - ny }, { x: l0.x - nx, y: l0.y - ny }];
          if (k > 0) {
            g.fillStyle(BRASS, 0.1 + k * 0.28); g.fillPoints(quad, true);
            // The filling bar: how near the swing is.
            const fx = l0.x + (l1.x - l0.x) * k, fy = l0.y + (l1.y - l0.y) * k;
            g.fillStyle(BRASS_LIT, 0.35 + k * 0.3);
            g.fillPoints([{ x: l0.x + nx * 0.4, y: l0.y + ny * 0.4 }, { x: fx + nx * 0.4, y: fy + ny * 0.4 }, { x: fx - nx * 0.4, y: fy - ny * 0.4 }, { x: l0.x - nx * 0.4, y: l0.y - ny * 0.4 }], true);
          }
          // Chalk edges, dashed.
          g.lineStyle(1.4, 0xffffff, k > 0 ? 0.75 : 0.22);
          for (const s of [1, -1]) {
            for (let d = 0; d < LANE; d += 14) {
              const t0 = d / LANE, t1 = Math.min(1, (d + 8) / LANE);
              g.lineBetween(l0.x + (l1.x - l0.x) * t0 + nx * s, l0.y + (l1.y - l0.y) * t0 + ny * s, l0.x + (l1.x - l0.x) * t1 + nx * s, l0.y + (l1.y - l0.y) * t1 + ny * s);
            }
          }
          // The reach mark: a brass chevron at the lane's end.
          const o = out(r, e);
          g.lineStyle(2, BRASS_DARK, k > 0 ? 0.9 : 0.35);
          g.lineBetween(l1.x - o.x * 8 + nx * 0.6, l1.y - o.y * 8 + ny * 0.6, l1.x, l1.y);
          g.lineBetween(l1.x - o.x * 8 - nx * 0.6, l1.y - o.y * 8 - ny * 0.6, l1.x, l1.y);
        }
        // Shadows of the lanterns, moving with any swing.
        for (let i = 0; i < 5; i++) {
          const q = at(r, i), off = swingOf(r, i, time);
          g.fillStyle(0x000000, 0.22); g.fillEllipse(q.x + r.ax * off, q.y + r.ay * off + 2, 24, 8);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const r of rows) {
        const H0 = 92;
        const a = at(r, 0), b = at(r, 4);
        const px = -r.ay * 16, py = r.ax * 16 - 10;
        // The test frame: two iron posts set back from the row, a timber beam across them.
        for (const q of [{ x: a.x - r.ax * 10 + px, y: a.y - r.ay * 10 + py }, { x: b.x + r.ax * 10 + px, y: b.y + r.ay * 10 + py }]) {
          g.fillStyle(0x000000, 0.25); g.fillEllipse(q.x, q.y + 2, 16, 6);
          g.fillStyle(IRON, 1); g.fillRect(q.x - 3, q.y - H0, 6, H0);
          g.fillStyle(IRON_LIT, 0.7); g.fillRect(q.x - 2, q.y - H0, 1.4, H0);
          g.fillStyle(IRON, 1); g.fillRect(q.x - 7, q.y - 4, 14, 5);
        }
        const ba = { x: a.x - r.ax * 12 + px, y: a.y - r.ay * 12 + py - H0 }, bb = { x: b.x + r.ax * 12 + px, y: b.y + r.ay * 12 + py - H0 };
        g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(ba.x, ba.y, bb.x, bb.y);
        g.lineStyle(2, lit(TIMBER_DARK, 0.3), 1); g.lineBetween(ba.x, ba.y - 2, bb.x, bb.y - 2);
        const gripped = time < r.gripUntil;
        // The knock running the row: a brass flash passing from lantern to lantern.
        let flashAt = -1;
        const p = r.pulse;
        if (p) {
          const tm = times(p);
          const far: End = p.from === 0 ? 4 : 0;
          if (time < tm.armA) flashAt = p.from + (far - p.from) * clamp((time - p.t0) / KNOCK, 0, 1);
          else if (p.rebound && time >= tm.homeA && time < tm.armB) flashAt = far + (p.from - far) * clamp((time - tm.homeA) / KNOCK, 0, 1);
        }
        for (let i = 0; i < 5; i++) {
          const q = at(r, i);
          const off = swingOf(r, i, time);
          const lift = Math.abs(off) * 0.42;
          const hx = q.x + px * 0.3, hy = q.y + py * 0.3 - H0 + 4;
          const lx = q.x + r.ax * off + px * 0.3, ly = q.y + r.ay * off + py * 0.3 - 68 - lift;
          // Two strings from the beam, a V, so it can only swing along the row.
          g.lineStyle(1.2, IRON, 0.9);
          g.lineBetween(hx - r.ay * 6 - r.ax * 2, hy + r.ax * 2, lx, ly);
          g.lineBetween(hx + r.ay * 6 + r.ax * 2, hy - r.ax * 2, lx, ly);
          // A trembling far lantern while it gathers the knock.
          let shake = 0;
          if (p) {
            const tm = times(p);
            const far: End = p.from === 0 ? 4 : 0;
            if ((i === far && time >= tm.armA && time < tm.hitA - 140) || (p.rebound && i === p.from && time >= tm.armB && time < tm.hitB - 140)) {
              shake = Math.sin(time / 22) * 1.6;
            }
          }
          soulLantern(g, lx + shake * r.ax, ly + shake * r.ay, 1.45, 0.9, t + i);
          // A heavy brass collar: Fourteen's lanterns are cast thick.
          g.fillStyle(BRASS_DARK, 1); g.fillRect(lx + shake * r.ax - 12, ly + 37, 24, 4);
          g.fillStyle(BRASS_LIT, 0.8); g.fillRect(lx + shake * r.ax - 11, ly + 37, 22, 1.2);
          if (Math.abs(flashAt - i) < 0.6) {
            glow(g, lx, ly + 24, 22, BRASS_LIT, 0.12, 3);
            g.lineStyle(1.6, BRASS_LIT, 0.95);
            for (let k = 0; k < 6; k++) {
              const aa = (k / 6) * Math.PI * 2 + time / 90;
              g.lineBetween(lx + Math.cos(aa) * 14, ly + 24 + Math.sin(aa) * 14, lx + Math.cos(aa) * 21, ly + 24 + Math.sin(aa) * 21);
            }
          }
          // A gripped row: leather muffles bound round the middle three.
          if (gripped && i >= 1 && i <= 3) {
            const fade = clamp((r.gripUntil - time) / 600, 0, 1);
            g.fillStyle(0x6a4a2e, 0.95 * fade); g.fillRect(lx - 13, ly + 14, 26, 10);
            g.lineStyle(1, 0x3a2818, fade); g.strokeRect(lx - 13, ly + 14, 26, 10);
            g.lineBetween(lx - 13, ly + 19, lx + 13, ly + 19);
          }
        }
        // A grip just taken: a brass hand-print flash over the middle lantern.
        if (time - r.gripAt < 400) {
          const m = at(r, 2);
          const k = (time - r.gripAt) / 400;
          g.lineStyle(2, YOU, 1 - k); g.strokeCircle(m.x + px * 0.3, m.y + py * 0.3 - 44, 14 + k * 16);
        }
      }
      // Orme's mallet, raised over the end he is about to rap.
      if (hammer) {
        const q = at(hammer.row, hammer.end);
        const k = clamp(1 - (hammer.at - time) / HAMMER, 0, 1);
        const o = out(hammer.row, hammer.end);
        const hx = q.x + o.x * 30, hy = q.y + o.y * 30 - 70;
        const ang = -1.2 + k * 1.1;
        const ex = hx + Math.cos(ang - Math.PI / 2) * 28 * -o.x - Math.sin(ang) * 6, ey = hy + Math.sin(ang - Math.PI / 2) * 28;
        g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(hx, hy + 10, ex, ey);
        g.fillStyle(BRASS_DARK, 1); g.fillRect(ex - 9, ey - 7, 18, 14);
        g.fillStyle(BRASS, 1); g.fillRect(ex - 8, ey - 6, 16, 9);
        g.fillStyle(BRASS_LIT, 0.8); g.fillRect(ex - 7, ey - 5, 14, 2);
        g.lineStyle(1.5, THEM, 0.5 + k * 0.5); g.strokeCircle(q.x, q.y - 44, 20 + (1 - k) * 18);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      wirePlate(g, cx, y, 214, 30);
      // One little row per test-frame: five brass beads, the state of the row.
      rows.forEach((r, n) => {
        const x0 = cx - 84 + n * 62;
        const gripped = time < r.gripUntil;
        const armed = !!r.pulse;
        for (let i = 0; i < 5; i++) {
          const c = gripped ? 0x8a7a62 : armed ? THEM : BRASS;
          g.fillStyle(BRASS_DARK, 1); g.fillCircle(x0 + i * 9, y + 15, 3.6);
          g.fillStyle(c, 1); g.fillCircle(x0 + i * 9, y + 15, 2.8);
        }
        if (gripped) { g.fillStyle(0x6a4a2e, 0.9); g.fillRect(x0 + 5, y + 11, 18, 8); }
        g.lineStyle(1, LIME_DARK, 0.9); g.lineBetween(x0 - 3, y + 9, x0 + 39, y + 9);
      });
      // The rebound mark: two arrows, out and home.
      if (rebound) {
        g.lineStyle(1.6, THEM, 0.6 + Math.sin(time / 200) * 0.3);
        g.lineBetween(cx + 92, y + 12, cx + 102, y + 12); g.lineBetween(cx + 99, y + 9, cx + 102, y + 12); g.lineBetween(cx + 99, y + 15, cx + 102, y + 12);
        g.lineBetween(cx + 92, y + 19, cx + 102, y + 19); g.lineBetween(cx + 95, y + 16, cx + 92, y + 19); g.lineBetween(cx + 95, y + 22, cx + 92, y + 19);
      }
    },

    destroy() { for (const r of rows) { r.ends[0].remove(); r.ends[1].remove(); r.mid.remove(); } },
  };
}

export const FALLEN_BRASS_KNOCK: GimmickDef = {
  id: fallenId('lantern', 'brass-knock'),
  rules: 'Strike an end lantern: the knock runs the row and the far end swings out down its chalked lane. Strike the middle to grip a row dead.',
  make,
};
