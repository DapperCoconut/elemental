import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { mulberry } from '../../../art/IsleArt';
import { OBS, crackPath, seam, shard } from '../../../art/PinnacleArt';
import { reinforce } from './throneHost';
import {
  DAIS_Y, HALL, PLAYER_R, THRONE_FOOT, at, clampN, courtOf, dist, ease, gesture, line, poly, rayToEdge, segDist,
  wrapA, type Gfx, type Pt,
} from './throneCourt';

/**
 * What the King does from the chair. He never stands in this act; his right hand does it all —
 * a palm raised for an Edict, a gavel brought down on the throne's arm, a finger levelled at
 * the accused, a hand swept across the hall to throw the throne's shadow, a summons to the walls.
 * Every one is telegraphed on the floor and dodgeable; several of them change with the Host.
 */

const W = 960, H = 640;

// ── THE EDICT ────────────────────────────────────────────────────────
// Law comes down the hall in columns. The hall splits into five; every other column lights
// with script and then a sheet of written glass sweeps down it. Then the others. Stand in an
// unlit column, then step across into the one that just passed.

export const edict = (tk: BossToolkit): SignatureMove => {
  const COLS = 5, CW = W / COLS, SPEED = 400, DMG = 15, BAND = 20;
  interface Vol { cols: number[]; from: number; fireAt: number; hit: boolean; seed: number }
  let vols: Vol[] = [];
  const front = (v: Vol, time: number): number => DAIS_Y + ((time - v.fireAt) / 1000) * SPEED;
  return {
    durationMs: 3600,
    windupMs: 950,
    tell: 'THE EDICT',
    cast(time) {
      gesture(tk, 'raise', 2600);
      const odd = Math.random() < 0.5;
      const A = [0, 1, 2, 3, 4].filter((i) => (i % 2 === 1) === odd);
      const B = [0, 1, 2, 3, 4].filter((i) => !A.includes(i));
      const warn = tk.warn(1050);
      vols.push({ cols: A, from: time, fireAt: time + warn, hit: false, seed: Math.floor(Math.random() * 1e6) });
      vols.push({ cols: B, from: time + warn, fireAt: time + warn * 2 + 150, hit: false, seed: Math.floor(Math.random() * 1e6) });
      tk.sfx('curse-cast');
      tk.schedule(warn, () => tk.sfx('judgement'));
      tk.schedule(warn * 2 + 150, () => tk.sfx('judgement'));
    },
    update(time) {
      const p = tk.player;
      for (const v of vols) {
        if (v.hit || time < v.fireAt || !p.active) continue;
        const y = front(v, time);
        if (y > H + 40) continue;
        const inCol = v.cols.some((c) => p.x > c * CW - 8 && p.x < (c + 1) * CW + 8);
        if (inCol && p.y > DAIS_Y - 10 && Math.abs(p.y - y) < BAND + 4) {
          v.hit = true;
          tk.hitPlayer(DMG, p.x, p.y);
        }
      }
      vols = vols.filter((v) => time < v.fireAt || front(v, time) < H + 140);
    },
    drawGround(g, time) {
      for (const v of vols) {
        if (time < v.from) continue;
        const rng = mulberry(v.seed);
        for (const c of v.cols) {
          const l = c * CW + 6, r = (c + 1) * CW - 6;
          if (time < v.fireAt) {
            const k = clampN((time - v.from) / Math.max(1, v.fireAt - v.from), 0, 1);
            g.fillStyle(OBS.seam, 0.04 + k * 0.1);
            g.fillRect(l, DAIS_Y, r - l, H - DAIS_Y);
            g.lineStyle(1.4, OBS.seamLit, 0.25 + k * 0.5);
            g.lineBetween(l, DAIS_Y, l, H); g.lineBetween(r, DAIS_Y, r, H);
            // Lines of law being written down the column, row by row.
            const rows = Math.floor(k * 16);
            for (let i = 0; i < rows; i++) {
              const y = DAIS_Y + 14 + i * 26;
              for (let j = 0; j < 5; j++) {
                const gx = l + 14 + j * ((r - l - 28) / 4) + (rng() - 0.5) * 6;
                g.lineStyle(1.2, OBS.seamLit, 0.35 * (0.5 + k * 0.5));
                g.lineBetween(gx - 5, y, gx + 5, y);
                g.lineBetween(gx + (rng() - 0.5) * 8, y - 5, gx + (rng() - 0.5) * 8, y + 4);
              }
            }
            if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.fillStyle(OBS.seamLit, 0.12); g.fillRect(l, DAIS_Y, r - l, 14); }
          } else {
            const y = front(v, time);
            if (y > H + 120) continue;
            // The trail: written glass fading behind the front.
            for (let i = 0; i < 6; i++) {
              const ty = y - 18 - i * 18;
              if (ty < DAIS_Y) break;
              g.fillStyle(OBS.seam, 0.16 * (1 - i / 6));
              g.fillRect(l, ty - 9, r - l, 16);
              for (let j = 0; j < 4; j++) {
                const gx = l + 18 + j * ((r - l - 36) / 3);
                g.lineStyle(1, OBS.seamLit, 0.5 * (1 - i / 6));
                g.lineBetween(gx - 6, ty, gx + 6, ty);
              }
            }
            // The front: a pane of bright glass, a pale leading edge.
            g.fillStyle(OBS.seam, 0.35); g.fillRect(l - 4, y - BAND, r - l + 8, BAND * 2);
            g.fillStyle(OBS.seamLit, 0.75); g.fillRect(l, y - 4, r - l, 8);
            g.fillStyle(0xffffff, 0.8); g.fillRect(l, y + 2, r - l, 2);
          }
        }
      }
    },
    onPhaseEnd() { vols = []; },
  };
};

// ── THE ACCUSING HAND ───────────────────────────────────────────────
// He points. His mark lands on you. With the Host standing, the mark is an order: every knife
// strikes, every hound runs, the wall marches double-time, until it fades. With no Host to
// order, the accusation is his own: three times the mark follows you, sets, and the floor under
// it erupts in obsidian.

export const accusingHand = (tk: BossToolkit): SignatureMove => {
  interface Acc { x: number; y: number; from: number; lockAt: number; fireAt: number; fired: boolean }
  let accs: Acc[] = [];
  let orderUntil = 0;
  const R = 70, DMG = 18;
  return {
    durationMs: 3600,
    windupMs: 800,
    tell: 'THE ACCUSING HAND',
    cast(time) {
      const c = courtOf(tk);
      const p = tk.player;
      const aim = Math.atan2(p.y - (THRONE_FOOT.y - 50), p.x - THRONE_FOOT.x);
      gesture(tk, 'point', 2600, aim);
      tk.sfx('judgement');
      if (c.soldiers.length > 0) {
        orderUntil = time + 3600;
        c.markUntil = orderUntil;
        tk.sfx('roar');
      } else {
        for (let i = 0; i < 3; i++) {
          const from = time + i * 1150;
          const lockAt = from + (i === 0 ? 1300 : 900);
          accs.push({ x: p.x, y: p.y, from, lockAt, fireAt: lockAt + tk.warn(500), fired: false });
        }
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const a of accs) {
        if (time < a.from) { a.x = p.x; a.y = p.y; continue; }
        if (time < a.lockAt) {
          const k = Math.min(1, dt * 7);
          a.x += (p.x - a.x) * k; a.y += (p.y - a.y) * k;
        } else if (!a.fired && time >= a.fireAt) {
          a.fired = true;
          tk.sfx('stone-rise');
          tk.boom(a.x, a.y, R, OBS.seam);
          if (p.active && dist(p.x, p.y, a.x, a.y) < R + PLAYER_R * 0.5) tk.hitPlayer(DMG, p.x, p.y);
        }
      }
      accs = accs.filter((a) => !a.fired || time < a.fireAt + 700);
    },
    drawGround(g, time) {
      const p = tk.player;
      // The order: the King's mark on the player, a slow-turning brand.
      if (time < orderUntil) {
        const k = clampN((orderUntil - time) / 3600, 0, 1);
        const r = 30;
        g.lineStyle(2, OBS.seamLit, 0.4 + 0.6 * k);
        g.strokeCircle(p.x, p.y + 6, r);
        for (let i = 0; i < 4; i++) {
          const a = time / 500 + (i * Math.PI) / 2;
          const o = at(p.x, p.y + 6, a, r + 10, 0), q1 = at(p.x, p.y + 6, a, r - 2, -5), q2 = at(p.x, p.y + 6, a, r - 2, 5);
          poly(g, [o, q1, q2], OBS.seamLit, 0.8 * k + 0.2);
        }
      }
      for (const a of accs) {
        if (time < a.from) continue;
        if (!a.fired) {
          const locked = time >= a.lockAt;
          const k = locked ? clampN((time - a.lockAt) / Math.max(1, a.fireAt - a.lockAt), 0, 1) : 0;
          g.fillStyle(OBS.seam, locked ? 0.1 + k * 0.2 : 0.05);
          g.fillCircle(a.x, a.y, R);
          g.lineStyle(locked ? 2.4 : 1.4, locked ? OBS.seamLit : OBS.seam, 0.8);
          g.strokeCircle(a.x, a.y, R);
          // The crosshair closing in.
          const gap = R * (locked ? 0.6 - k * 0.45 : 0.6);
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2 + (locked ? 0 : time / 400);
            const o = at(a.x, a.y, ang, R + 6, 0), q = at(a.x, a.y, ang, gap, 0);
            g.lineStyle(2, OBS.seamLit, 0.85); g.lineBetween(o.x, o.y, q.x, q.y);
          }
          if (locked) { g.fillStyle(OBS.seamLit, 0.5 + k * 0.5); g.fillCircle(a.x, a.y, 3 + k * 3); }
        } else {
          // The eruption: a crown of obsidian spikes out of the floor, then sinking.
          const k = clampN((time - a.fireAt) / 700, 0, 1);
          const up = k < 0.2 ? ease(k / 0.2) : 1 - ease((k - 0.6) / 0.4);
          for (let i = 0; i < 9; i++) {
            const ang = i * 0.7 + a.x * 0.01;
            const rr = i === 0 ? 0 : R * (0.35 + (i % 3) * 0.2);
            const sx = a.x + Math.cos(ang) * rr, sy = a.y + Math.sin(ang) * rr * 0.6 + 8;
            if (up > 0.02) shard(g, sx, sy, 14 + (i % 3) * 4, (i === 0 ? 60 : 30 + (i % 4) * 8) * up, Math.cos(ang) * 6, 0.35);
          }
          g.lineStyle(2, OBS.seamLit, 1 - k); g.strokeEllipse(a.x, a.y + 6, R * 2 * (1 + k * 0.3), R * 1.2 * (1 + k * 0.3));
        }
      }
    },
    drawAir(g, time) {
      // The line of the accusation, hand to mark, while he points.
      const c = courtOf(tk);
      const gst = c.gesture;
      if (!gst || gst.kind !== 'point' || time > gst.until) return;
      const target = accs.find((a) => !a.fired && time >= a.from) ?? (time < orderUntil ? { x: tk.player.x, y: tk.player.y } : null);
      if (!target) return;
      const hx = THRONE_FOOT.x + 30 + Math.cos(gst.aim) * 66, hy = THRONE_FOOT.y - 56 + Math.sin(gst.aim) * 52;
      g.lineStyle(5, OBS.seam, 0.12); g.lineBetween(hx, hy, target.x, target.y);
      g.lineStyle(1.2, OBS.seamLit, 0.5); g.lineBetween(hx, hy, target.x, target.y);
    },
    onPhaseEnd() { accs = []; orderUntil = 0; },
  };
};

// ── THE GAVEL ───────────────────────────────────────────────────────
// He brings a gavel of black glass down on the arm of the throne. Cracks race out of the dais
// down the hall — five, one of them through you — glow, and erupt in glass. Then a second blow,
// the cracks falling between the first ones. Stand between; then move.

export const gavelBlow = (tk: BossToolkit): SignatureMove => {
  interface Crack { pts: Pt[]; len: number; born: number; growMs: number; eruptAt: number; hit: boolean }
  let cracks: Crack[] = [];
  const GROW = 900, HALF = 14, DMG = 16;
  const O = { x: THRONE_FOOT.x, y: DAIS_Y + 6 };
  const strike = (time: number, offset: number) => {
    const p = tk.player;
    const base = clampN(Math.atan2(p.y - O.y, p.x - O.x), 0.2, Math.PI - 0.2);
    const rng = mulberry(Math.floor(time) + 7);
    for (const k of [-2, -1, 0, 1, 2]) {
      const a = clampN(base + (k + offset) * 0.45, 0.12, Math.PI - 0.12);
      const end = rayToEdge(O.x, O.y, a, HALL.l - 20, HALL.t, HALL.r + 20, H);
      const pts = crackPath(O, { x: end.x, y: end.y }, rng, 10, 9);
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      const growMs = (len / GROW) * 1000;
      cracks.push({ pts, len, born: time, growMs, eruptAt: time + growMs + tk.warn(420), hit: false });
    }
    tk.sfx('anvil');
    tk.sfx('quake');
    tk.scene.cameras.main.shake(260, 0.006);
  };
  /** The first `len` px of a polyline. */
  const partial = (pts: Pt[], len: number): Pt[] => {
    const out: Pt[] = [pts[0]];
    let left = len;
    for (let i = 1; i < pts.length; i++) {
      const d = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d >= left) {
        const k = left / Math.max(1e-3, d);
        out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k });
        return out;
      }
      left -= d;
      out.push(pts[i]);
    }
    return out;
  };
  return {
    durationMs: 3400,
    windupMs: 1000,
    tell: 'THE GAVEL',
    cast(time) {
      gesture(tk, 'gavel', 1100);
      tk.schedule(470, () => strike(tk.now, 0));
      tk.schedule(1700, () => { gesture(tk, 'gavel', 1000); });
      tk.schedule(2130, () => strike(tk.now, 0.5));
    },
    update(time) {
      const p = tk.player;
      for (const c of cracks) {
        if (c.hit || time < c.eruptAt || time > c.eruptAt + 180 || !p.active) continue;
        for (let i = 1; i < c.pts.length; i++) {
          if (segDist(p.x, p.y, c.pts[i - 1].x, c.pts[i - 1].y, c.pts[i].x, c.pts[i].y) < HALF + PLAYER_R * 0.8) {
            c.hit = true;
            tk.hitPlayer(DMG, p.x, p.y);
            break;
          }
        }
        if (!c.hit) c.hit = time > c.eruptAt + 170;
      }
      if (cracks.some((c) => time >= c.eruptAt && time - c.eruptAt < 20)) tk.sfx('crystal-shatter');
      cracks = cracks.filter((c) => time < c.eruptAt + 620);
    },
    drawGround(g, time) {
      for (const c of cracks) {
        const grown = clampN((time - c.born) / Math.max(1, c.growMs), 0, 1);
        if (time < c.eruptAt) {
          const pre = clampN((time - c.born - c.growMs) / Math.max(1, c.eruptAt - c.born - c.growMs), 0, 1);
          const pts = partial(c.pts, c.len * grown);
          seam(g, pts, 1.6 + pre * 1.4, 0.7 + pre * 0.3, pre);
          if (grown >= 1 && pre > 0.6 && Math.floor(time / 80) % 2 === 0) line(g, c.pts, HALF * 2, OBS.seam, 0.12);
          // The crack's racing tip.
          const tip = pts[pts.length - 1];
          if (grown < 1) { g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(tip.x, tip.y, 3); }
        } else {
          const k = clampN((time - c.eruptAt) / 620, 0, 1);
          const up = k < 0.15 ? ease(k / 0.15) : 1 - ease((k - 0.45) / 0.55);
          line(g, c.pts, HALF * 2, OBS.seamLit, 0.25 * (1 - k));
          seam(g, c.pts, 2.4, 1 - k, 1);
          // Glass breaking up out of the crack along its length.
          for (let i = 1; i < c.pts.length; i++) {
            const a = c.pts[i - 1], b = c.pts[i];
            if (up > 0.03) shard(g, (a.x + b.x) / 2, (a.y + b.y) / 2 + 4, 12, (18 + (i % 3) * 8) * up, (i % 2 ? 4 : -4), 0.35);
          }
        }
      }
    },
    onPhaseEnd() { cracks = []; },
  };
};

// ── THE THRONE'S SHADOW ─────────────────────────────────────────────
// He sweeps a hand across the hall and the throne's shadow swings with it, a long black wedge
// turning on the dais like a sundial's hand — faster at its tip than you can run. Get under it:
// near the throne the shadow moves slowly, and you can cross it there (or dash through it).

export const thronesShadow = (tk: BossToolkit): SignatureMove => {
  interface Sh { a0: number; a1: number; warnUntil: number; endAt: number; lastHit: number }
  let sh: Sh | null = null;
  const O = { x: THRONE_FOOT.x, y: DAIS_Y - 4 };
  const LEN = 720, HALF_A = 0.16, MIN_R = 44, DMG = 12, SWEEP = 3000;
  const angleAt = (s: Sh, time: number): number => s.a0 + (s.a1 - s.a0) * ease((time - s.warnUntil) / SWEEP);
  return {
    durationMs: 4400,
    windupMs: 900,
    tell: "THE THRONE'S SHADOW",
    cast(time) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const a0 = Math.PI / 2 - dir * 1.28, a1 = Math.PI / 2 + dir * 1.28;
      const warn = tk.warn(1100);
      sh = { a0, a1, warnUntil: time + warn, endAt: time + warn + SWEEP, lastHit: 0 };
      gesture(tk, 'sweep', warn + SWEEP);
      tk.sfx('hush');
      tk.schedule(warn, () => tk.sfx('gravity-slam'));
    },
    update(time) {
      if (!sh) return;
      if (time > sh.endAt + 300) { sh = null; return; }
      if (time < sh.warnUntil || time > sh.endAt) return;
      const p = tk.player;
      const a = angleAt(sh, time);
      const r = dist(p.x, p.y, O.x, O.y);
      if (!p.active || r < MIN_R || r > LEN) return;
      const pad = Math.atan2(PLAYER_R * 0.8, r);
      if (Math.abs(wrapA(Math.atan2(p.y - O.y, p.x - O.x) - a)) < HALF_A + pad && time - sh.lastHit > 650) {
        sh.lastHit = time;
        tk.hitPlayer(DMG, p.x, p.y);
        tk.slowPlayer(0.6, 500);
      }
    },
    drawGround(g, time) {
      if (!sh) return;
      const wedge = (a: number, len: number, color: number, alpha: number) => {
        const L = at(O.x, O.y, a - HALF_A, len, 0), R = at(O.x, O.y, a + HALF_A, len, 0);
        const l0 = at(O.x, O.y, a - HALF_A * 2, MIN_R, 0), r0 = at(O.x, O.y, a + HALF_A * 2, MIN_R, 0);
        poly(g, [l0, L, R, r0], color, alpha);
        return { L, R, l0, r0 };
      };
      if (time < sh.warnUntil) {
        const k = clampN(1 - (sh.warnUntil - time) / tk.warn(1100), 0, 1);
        const e = wedge(sh.a0, LEN, 0x000000, 0.15 + k * 0.25);
        line(g, [e.l0, e.L], 1.4, OBS.seam, 0.6); line(g, [e.r0, e.R], 1.4, OBS.seam, 0.6);
        // The way it will swing: a dashed arc with an arrowhead.
        const pts: Pt[] = [];
        for (let i = 0; i <= 18; i++) pts.push(at(O.x, O.y, sh.a0 + (sh.a1 - sh.a0) * (i / 18), 250, 0));
        for (let i = 0; i < 18; i += 2) line(g, [pts[i], pts[i + 1]], 2, OBS.seamLit, 0.3 + k * 0.4);
        const tip = pts[18], dir = Math.sign(sh.a1 - sh.a0);
        const b1 = at(tip.x, tip.y, sh.a1 + dir * Math.PI / 2, -14, -7), b2 = at(tip.x, tip.y, sh.a1 + dir * Math.PI / 2, -14, 7);
        poly(g, [tip, b1, b2], OBS.seamLit, 0.4 + k * 0.4);
        return;
      }
      const fade = time > sh.endAt ? clampN(1 - (time - sh.endAt) / 300, 0, 1) : 1;
      const a = angleAt(sh, Math.min(time, sh.endAt));
      const e = wedge(a, LEN, 0x000000, 0.62 * fade);
      wedge(a, LEN, OBS.seam, 0.06 * fade);
      line(g, [e.l0, e.L], 2, OBS.seam, 0.8 * fade);
      line(g, [e.r0, e.R], 2, OBS.seam, 0.8 * fade);
      // In the shadow, far down it, two violet eyes — the King's, looking back up the hall.
      const m = at(O.x, O.y, a, LEN * 0.55, 0);
      const side = at(0, 0, a, 0, 9);
      for (const s of [-1, 1]) {
        g.fillStyle(OBS.seam, 0.3 * fade); g.fillCircle(m.x + side.x * s, m.y + side.y * s, 6);
        g.fillStyle(OBS.seamLit, 0.9 * fade); g.fillCircle(m.x + side.x * s, m.y + side.y * s, 2);
      }
    },
    onPhaseEnd() { sh = null; },
  };
};

// ── THE LEVY ────────────────────────────────────────────────────────
// He calls on the walls. With the Host standing, two more of it step out to join the wave.
// With the Aegis cracked, the walls answer anyway — chains of black glass lash out of both side
// walls and snap taut across the hall, crossing where you stand.

export const levy = (tk: BossToolkit): SignatureMove => {
  interface Chain { ax: number; ay: number; bx: number; by: number; from: number; fireAt: number }
  let chains: Chain[] = [];
  const WARN = 950, FIRE = 380;
  return {
    durationMs: 2600,
    windupMs: 800,
    tell: 'THE LEVY',
    cast(time) {
      gesture(tk, 'raise', 1600);
      if (reinforce(tk, 2)) { tk.sfx('stone-rise'); return; }
      const p = tk.player;
      const warn = tk.warn(WARN);
      for (const side of [-1, 1]) {
        const wy = clampN(p.y + (Math.random() - 0.5) * 240, HALL.t + 20, H - 40);
        const ax = side < 0 ? 58 : 902;
        const angle = Math.atan2(p.y - wy, p.x - ax);
        const far = rayToEdge(p.x, p.y, angle, 58, DAIS_Y, 902, H);
        chains.push({ ax, ay: wy, bx: far.x, by: far.y, from: time, fireAt: time + warn });
        tk.spawnLane({ x: p.x, y: p.y, angle, halfW: 16, warnMs: WARN, fireMs: FIRE, damage: 14 });
      }
      tk.sfx('chain');
    },
    update(time) {
      if (chains.some((c) => time >= c.fireAt && time - c.fireAt < 20)) tk.sfx('whip');
      chains = chains.filter((c) => time < c.fireAt + FIRE + 300);
    },
    drawAir(g: Gfx, time) {
      for (const c of chains) {
        const live = time >= c.fireAt;
        const k = live ? 1 : clampN((time - c.from) / Math.max(1, c.fireAt - c.from), 0, 1);
        const fade = live ? clampN(1 - (time - c.fireAt - FIRE) / 300, 0, 1) : 1;
        const L = dist(c.ax, c.ay, c.bx, c.by);
        const a = Math.atan2(c.by - c.ay, c.bx - c.ax);
        // Slack and paying out while it warns; taut and bright as it fires.
        const reach = live ? L : L * k;
        const sag = live ? 0 : 26 * (1 - k * 0.6);
        const n = Math.floor(reach / 16);
        for (let i = 0; i < n; i++) {
          const f = i * 16;
          const s = Math.sin((f / Math.max(1, L)) * Math.PI) * sag;
          const p = at(c.ax, c.ay, a, f, s);
          const turn = i % 2 === 0;
          g.lineStyle(live ? 2.4 : 1.6, live ? OBS.seamLit : OBS.edge, (live ? 0.95 : 0.55) * fade);
          if (turn) g.strokeEllipse(p.x, p.y, 14, 7);
          else g.strokeEllipse(p.x, p.y, 7, 10);
        }
        g.fillStyle(OBS.sheen, fade); g.fillCircle(c.ax, c.ay, 6);
        g.lineStyle(1, OBS.edge, fade); g.strokeCircle(c.ax, c.ay, 6);
      }
    },
    onPhaseEnd() { chains = []; },
  };
};
