import type Phaser from 'phaser';
import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { mulberry } from '../../../art/IsleArt';
import { OBS, crackPath, seam, shard } from '../../../art/PinnacleArt';
import { aegisDisc, aegisShard, crescent } from './duelArt';
import {
  BODY_R, DS, FIELD, PLAYER_R, type Pt, along, at, clampN, dist, fieldX, fieldY, float, inWedge, lengths, place,
  segDist, shake, smooth, swing,
} from './duelState';

/**
 * Act II — THE CRACKED MASK: the King's sword-and-shield moves. Each reads `DS.shattered` as it is
 * cast: with the Aegis he fights sword-and-board; once it breaks he fights two-handed, faster and
 * wider. Every blow is telegraphed on the floor from exactly where he will stand when it lands.
 */

type G = Phaser.GameObjects.Graphics;
const STAR = OBS.star;
const TAU = Math.PI * 2;

// ── Strikes: the telegraphed sword blows every move is built from ──────

/** One sword blow. `arc` — a sweeping cut through a wedge; `lane` — a straight chop / line; `disc` — a spinning cut all round. */
interface Strike {
  kind: 'arc' | 'lane' | 'disc';
  ox: number; oy: number; a: number;
  half: number; r: number; len: number; halfW: number;
  /** Sweep sense of an arc (+1 clockwise on screen). */
  dir: 1 | -1;
  from: number; fireAt: number; dmg: number;
  fired: boolean;
  /** Where the body steps to as the blow lands (the telegraph is drawn from here). */
  step?: Pt;
  sfx: string;
  /** Pose while it telegraphs. */
  pose: 'cocked' | 'raised' | 'guard';
  stun?: number;
  hitWord?: string;
}

/** A queue of telegraphed blows: draws them filling, lands them, leaves their marks a moment. */
class Strikes {
  list: Strike[] = [];
  constructor(private tk: BossToolkit) {}

  add(s: Omit<Strike, 'fired' | 'from'> & { from?: number }): Strike {
    const st: Strike = { ...s, from: s.from ?? this.tk.now, fired: false };
    this.list.push(st);
    if (st.kind === 'arc') { DS.pose = 'cocked'; DS.swordA = st.a - st.dir * st.half; }
    else if (st.kind === 'lane') DS.pose = st.pose === 'raised' ? 'raised' : 'cocked';
    else DS.pose = 'cocked';
    if (st.kind === 'lane' && st.pose !== 'raised') DS.swordA = st.a + Math.PI;
    if (st.kind === 'disc') DS.swordA = st.a + Math.PI * 0.8;
    return st;
  }

  update(time: number): void {
    const tk = this.tk;
    const p = tk.player;
    for (const s of this.list) {
      if (s.fired || time < s.fireAt) continue;
      s.fired = true;
      if (s.step) place(tk, s.step.x, s.step.y);
      tk.sfx(s.sfx);
      let hit = false;
      if (s.kind === 'arc') {
        swing(tk, s.a - s.dir * s.half, s.a + s.dir * s.half, 150, s.r);
        DS.pose = 'rest';
        hit = inWedge(p.x, p.y, s.ox, s.oy, s.a, s.half, s.r);
      } else if (s.kind === 'lane') {
        DS.pose = 'thrust'; DS.swordA = s.a; DS.swing = null;
        hit = segDist(p.x, p.y, s.ox, s.oy, s.ox + Math.cos(s.a) * s.len, s.oy + Math.sin(s.a) * s.len) < s.halfW + PLAYER_R;
        shake(tk, 180, 0.005);
      } else {
        swing(tk, s.a, s.a + TAU * s.dir, 260, s.r, true);
        DS.pose = 'rest';
        hit = dist(p.x, p.y, s.ox, s.oy) < s.r + PLAYER_R;
      }
      if (hit && p.active) {
        tk.hitPlayer(s.dmg, p.x, p.y);
        if (s.stun) tk.stun(s.stun);
        if (s.hitWord) float(tk, p.x, p.y - 44, s.hitWord, '#c9b0ff');
      }
    }
    this.list = this.list.filter((s) => !s.fired || time < s.fireAt + 700);
  }

  /** Is a blow still being telegraphed? */
  pending(): boolean { return this.list.some((s) => !s.fired); }

  drawGround(g: G, time: number): void {
    for (const s of this.list) {
      const k = clampN((time - s.from) / Math.max(1, s.fireAt - s.from), 0, 1);
      const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
      if (!s.fired) {
        if (s.kind === 'arc') {
          const a0 = s.a - s.half, a1 = s.a + s.half;
          g.fillStyle(OBS.seam, 0.07 + k * 0.08); g.slice(s.ox, s.oy, s.r, a0, a1, false); g.fillPath();
          // The fill sweeps the way the blade will: you can read which side it comes from.
          const st = s.dir > 0 ? a0 : a1;
          const en = st + s.dir * 2 * s.half * k;
          g.fillStyle(OBS.seamLit, 0.16); g.slice(s.ox, s.oy, s.r, Math.min(st, en), Math.max(st, en), false); g.fillPath();
          g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : OBS.seamLit, 0.5 + k * 0.4);
          g.beginPath(); g.arc(s.ox, s.oy, s.r, a0, a1, false); g.strokePath();
          g.lineStyle(1.2, OBS.seamLit, 0.35);
          g.lineBetween(s.ox, s.oy, s.ox + Math.cos(a0) * s.r, s.oy + Math.sin(a0) * s.r);
          g.lineBetween(s.ox, s.oy, s.ox + Math.cos(a1) * s.r, s.oy + Math.sin(a1) * s.r);
          // An arrowhead at the far rim, pointing along the sweep.
          const ea = s.dir > 0 ? a1 : a0;
          const ex = s.ox + Math.cos(ea) * s.r, ey = s.oy + Math.sin(ea) * s.r;
          const ta = ea + s.dir * Math.PI / 2;
          g.fillStyle(OBS.seamLit, 0.7);
          g.fillTriangle(ex + Math.cos(ta) * 12, ey + Math.sin(ta) * 12, ex + Math.cos(ea) * 8, ey + Math.sin(ea) * 8, ex - Math.cos(ea) * 8, ey - Math.sin(ea) * 8);
        } else if (s.kind === 'lane') {
          const ca = Math.cos(s.a), sa = Math.sin(s.a), px = -sa * s.halfW, py = ca * s.halfW;
          const ex = s.ox + ca * s.len, ey = s.oy + sa * s.len;
          const fx = s.ox + ca * s.len * k, fy = s.oy + sa * s.len * k;
          g.fillStyle(OBS.seam, 0.08 + k * 0.06);
          g.fillPoints([{ x: s.ox + px, y: s.oy + py }, { x: ex + px, y: ey + py }, { x: ex - px, y: ey - py }, { x: s.ox - px, y: s.oy - py }], true);
          g.fillStyle(OBS.seamLit, 0.16);
          g.fillPoints([{ x: s.ox + px, y: s.oy + py }, { x: fx + px, y: fy + py }, { x: fx - px, y: fy - py }, { x: s.ox - px, y: s.oy - py }], true);
          g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : OBS.seamLit, 0.55 + k * 0.35);
          g.strokePoints([{ x: s.ox + px, y: s.oy + py }, { x: ex + px, y: ey + py }, { x: ex - px, y: ey - py }, { x: s.ox - px, y: s.oy - py }], true);
          seam(g, [{ x: s.ox, y: s.oy }, { x: ex, y: ey }], 0.8, 0.4 + k * 0.4, k);
        } else {
          g.fillStyle(OBS.seam, 0.07 + k * 0.08); g.fillCircle(s.ox, s.oy, s.r);
          g.fillStyle(OBS.seamLit, 0.14); g.slice(s.ox, s.oy, s.r, s.a, s.a + TAU * k, false); g.fillPath();
          g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : OBS.seamLit, 0.55 + k * 0.4); g.strokeCircle(s.ox, s.oy, s.r);
        }
      } else {
        // The mark it leaves: a scored crescent, a line of glass thrown up, a ring.
        const f = 1 - clampN((time - s.fireAt) / 700, 0, 1);
        if (s.kind === 'arc') crescent(g, s.ox, s.oy, s.a - s.dir * s.half, s.a + s.dir * s.half, s.r, 0.5 * f);
        else if (s.kind === 'disc') { g.lineStyle(6 * f + 1, OBS.seamLit, 0.6 * f); g.strokeCircle(s.ox, s.oy, s.r * (1 + (1 - f) * 0.1)); }
        else {
          const n = Math.floor(s.len / 28);
          for (let i = 1; i <= n; i++) {
            const d = i * 28;
            const age = time - s.fireAt - d * 0.5;
            if (age < 0) continue;
            const h = (age < 90 ? age / 90 : clampN(1 - (age - 300) / 300, 0, 1)) * (18 + (i % 3) * 7);
            if (h <= 1) continue;
            shard(g, s.ox + Math.cos(s.a) * d + ((i % 2) * 2 - 1) * 8, s.oy + Math.sin(s.a) * d + 6, 12, h, ((i % 2) * 2 - 1) * 4, 0.3);
          }
          seam(g, [{ x: s.ox, y: s.oy }, { x: s.ox + Math.cos(s.a) * s.len, y: s.oy + Math.sin(s.a) * s.len }], 1.2, f, f);
        }
      }
    }
  }

  clear(): void { this.list = []; }
}

/** Where a blow should land from: he steps in (more if you are far), never off the floor. */
function stepIn(tk: BossToolkit, base: number, keep = 150, most = 140): { o: Pt; a: number } {
  const o = at(tk);
  const p = tk.player;
  const a = Math.atan2(p.y - o.y, p.x - o.x);
  const d = dist(p.x, p.y, o.x, o.y);
  const s = base + (d > keep + 60 ? Math.min(d - keep, most) : 0);
  return { o: { x: fieldX(o.x + Math.cos(a) * s), y: fieldY(o.y + Math.sin(a) * s) }, a };
}

/** End a move's hold on the body. */
function release(): void { DS.drive = false; DS.turnMult = 1; DS.pose = 'rest'; DS.crouch = 0; DS.braced = 0; DS.crownFlare = 0; }

// ── Fault lines: cracks that race out and then erupt as glass ──────────

/** One crack: races along its path (the telegraph), holds, then glass erupts from root to tip. */
class Fault {
  cum: number[];
  total: number;
  hit = false;
  front = 0;
  constructor(public pts: Pt[], public born: number, public race: number, public readyAt: number, public erupt: number, public dmg: number) {
    this.cum = lengths(pts);
    this.total = this.cum[this.cum.length - 1];
  }
  doneAt(): number { return this.readyAt + (this.total / this.erupt) * 1000 + 800; }
}

/** A set of faults with their damage and their art. */
class Faults {
  list: Fault[] = [];
  constructor(private tk: BossToolkit) {}

  /** A crack from `o` along `a` for `len` (clipped to the floor), seeded jag. */
  add(o: Pt, a: number, len: number, born: number, race: number, holdMs: number, dmg: number, rng: () => number): Fault {
    let L = len;
    for (let i = 0; i < 12; i++) {
      const ex = o.x + Math.cos(a) * L, ey = o.y + Math.sin(a) * L;
      if (ex > 30 && ex < this.tk.W - 30 && ey > 104 && ey < this.tk.H - 24) break;
      L *= 0.85;
    }
    const pts = crackPath(o, { x: o.x + Math.cos(a) * L, y: o.y + Math.sin(a) * L }, rng, 16, Math.max(4, Math.round(L / 55)));
    const f = new Fault(pts, born, race, 0, 1000, dmg);
    f.readyAt = born + (f.total / race) * 1000 + this.tk.warn(holdMs);
    this.list.push(f);
    return f;
  }

  update(time: number): void {
    const p = this.tk.player;
    for (const f of this.list) {
      if (time < f.readyAt) continue;
      const nf = Math.min(f.total, ((time - f.readyAt) / 1000) * f.erupt);
      if (!f.hit && p.active) {
        for (let d = f.front; d <= nf; d += 8) {
          const q = along(f.pts, f.cum, d);
          if (dist(q.x, q.y, p.x, p.y) < 14 + PLAYER_R) {
            f.hit = true;
            this.tk.hitPlayer(f.dmg, p.x, p.y);
            break;
          }
        }
      }
      if (f.front < f.total && nf >= f.total) this.tk.sfx('crystal-shatter');
      f.front = nf;
    }
    this.list = this.list.filter((f) => time < f.doneAt());
  }

  lastDone(): number { return this.list.reduce((m, f) => Math.max(m, f.doneAt()), 0); }

  draw(g: G, time: number): void {
    for (const f of this.list) {
      const raced = Math.min(f.total, ((time - f.born) / 1000) * f.race);
      if (raced <= 0) continue;
      const pts: Pt[] = [];
      for (let i = 0; i < f.pts.length && f.cum[i] <= raced; i++) pts.push(f.pts[i]);
      pts.push(along(f.pts, f.cum, raced));
      const warm = clampN(1 - (f.readyAt - time) / 500, 0, 1);
      const fade = time > f.readyAt ? clampN(1 - (time - f.readyAt - (f.total / f.erupt) * 1000) / 700, 0, 1) : 1;
      seam(g, pts, 1.4 + warm * 1.2, fade, warm, warm > 0.8 && Math.floor(time / 80) % 2 === 0 ? OBS.seamLit : OBS.seam);
      if (time < f.readyAt && raced < f.total) {
        const tip = pts[pts.length - 1];
        g.fillStyle(0xffffff, 0.8); g.fillCircle(tip.x, tip.y, 2.6);
      }
      if (time >= f.readyAt) {
        // Glass thrust up along the crack behind the eruption front.
        for (let d = 14; d <= f.front; d += 24) {
          const q = along(f.pts, f.cum, d);
          const age = time - (f.readyAt + (d / f.erupt) * 1000);
          const h = (age < 80 ? age / 80 : clampN(1 - (age - 420) / 320, 0, 1)) * (22 + ((d * 7) % 13));
          if (h <= 1) continue;
          shard(g, q.x, q.y + 4, 13, h, ((Math.round(d) % 3) - 1) * 5, 0.35);
        }
        if (f.front < f.total) {
          const q = along(f.pts, f.cum, f.front);
          g.fillStyle(OBS.seamLit, 0.45); g.fillCircle(q.x, q.y, 12);
        }
      }
    }
  }

  clear(): void { this.list = []; }
}

// ── 1. THE VERDICT ─────────────────────────────────────────────────────
// Three cuts, each a different blow: a forehand sweep (right to left), a backhand (left to right),
// then the sentence — a two-handed chop that throws glass up a long line. He steps into each, and
// his guard barely turns while he commits: the combo is the time to get round him.
// Two-handed: four cuts, wider and quicker, the last a full spinning cut — THE CROWNING CUT.

interface CutPlan { kind: 'arc' | 'lane' | 'disc'; dir: 1 | -1; warn: number; r: number; half: number; dmg: number; step: number }

export const verdict = (tk: BossToolkit): SignatureMove => {
  const S = new Strikes(tk);
  let plan: CutPlan[] = [];
  let next = 0;
  let nextAt = 0;
  let active = false;
  let dur = 3600;
  const gap = (): number => (DS.shattered ? 170 : 240);
  return {
    get durationMs() { return dur; },
    windupMs: 600,
    gesture: 'sweep',
    locksBody: true,
    tell: 'THE VERDICT',
    cast(time) {
      plan = DS.shattered
        ? [
          { kind: 'arc', dir: -1, warn: 470, r: 190, half: 1.25, dmg: 11, step: 40 },
          { kind: 'arc', dir: 1, warn: 400, r: 190, half: 1.25, dmg: 11, step: 40 },
          { kind: 'arc', dir: -1, warn: 400, r: 205, half: 1.35, dmg: 11, step: 30 },
          { kind: 'disc', dir: 1, warn: 620, r: 165, half: 0, dmg: 13, step: 20 },
        ]
        : [
          { kind: 'arc', dir: -1, warn: 650, r: 175, half: 1.2, dmg: 10, step: 38 },
          { kind: 'arc', dir: 1, warn: 520, r: 175, half: 1.2, dmg: 10, step: 38 },
          { kind: 'lane', dir: 1, warn: 700, r: 0, half: 0, dmg: 12, step: 24 },
        ];
      next = 0; nextAt = time; active = true;
      DS.drive = true; DS.turnMult = 0.3;
      dur = plan.reduce((s, c) => s + tk.warn(c.warn) + gap(), 0) + 500;
    },
    update(time) {
      if (active && next < plan.length && time >= nextAt) {
        const c = plan[next++];
        const { o, a } = stepIn(tk, c.step);
        const fireAt = time + tk.warn(c.warn);
        S.add({
          kind: c.kind, ox: o.x, oy: o.y, a, half: c.half, r: c.r, len: 430, halfW: 26, dir: c.dir, fireAt, dmg: c.dmg,
          step: o, sfx: c.kind === 'lane' ? 'stone-slam' : c.kind === 'disc' ? 'tornado' : 'slash',
          pose: c.kind === 'lane' ? 'raised' : 'cocked', hitWord: c.kind === 'disc' ? 'CROWNED' : undefined,
        });
        if (c.kind === 'disc') tk.sfx('beam-charge');
        nextAt = fireAt + gap();
      }
      S.update(time);
      if (active && next >= plan.length && !S.pending() && time >= nextAt) { active = false; release(); }
    },
    drawGround(g, time) { S.drawGround(g, time); },
    onPhaseEnd() { S.clear(); active = false; plan = []; },
  };
};

// ── 2. THE LONG REACH ──────────────────────────────────────────────────
// He gathers low and the floor shows the line he means to run you through; the aim follows you,
// then sets. He crosses it in a blink. If the point finds nothing it goes into the glass to the
// guard and he must wrench it out — no shield, no turn, open from every side — until the cracks
// round the blade flare and burst. Two-handed: a miss is ripped straight out into a second reach.

export const longReach = (tk: BossToolkit): SignatureMove => {
  type St = 'aim' | 'go' | 'stuck' | 'recover' | null;
  let st: St = null;
  let left = 0;
  let t0 = 0, aimUntil = 0, lockAt = 0, goMs = 230, stuckUntil = 0, recoverUntil = 0;
  let a = 0, L = 0;
  let from: Pt = { x: 0, y: 0 }, to: Pt = { x: 0, y: 0 };
  let hit = false;
  let dur = 4000;
  let cracks: Pt[][] = [];
  const reachOf = (o: Pt, ang: number): number => {
    let l = 400;
    for (let i = 0; i < 14; i++) {
      const ex = o.x + Math.cos(ang) * l, ey = o.y + Math.sin(ang) * l;
      if (ex >= FIELD.x0 && ex <= FIELD.x1 && ey >= FIELD.y0 && ey <= FIELD.y1) break;
      l *= 0.88;
    }
    return Math.max(80, l);
  };
  const aim = (time: number): void => {
    st = 'aim'; t0 = time; hit = false;
    aimUntil = time + tk.warn(DS.shattered ? 600 : 860);
    lockAt = t0 + (aimUntil - t0) * 0.62;
    from = at(tk);
    DS.drive = true; DS.pose = 'cocked'; DS.turnMult = 0.6;
    tk.sfx('beam-charge');
  };
  return {
    get durationMs() { return dur; },
    windupMs: 500,
    gesture: 'punch',
    locksBody: true,
    tell: 'THE LONG REACH',
    cast(time) {
      left = DS.shattered ? 2 : 1;
      dur = left * (tk.warn(860) + 300) + (DS.shattered ? 1500 : tk.hard ? 1700 : 2100) + 700;
      aim(time);
    },
    update(time) {
      if (!st) return;
      const p = tk.player;
      if (st === 'aim') {
        DS.crouch = clampN((time - t0) / 300, 0, 1);
        if (time < lockAt) {
          a = Math.atan2(p.y - from.y, p.x - from.x);
          L = reachOf(from, a);
          DS.swordA = a + Math.PI;
        }
        if (time >= aimUntil) {
          st = 'go'; t0 = time; left--;
          to = { x: fieldX(from.x + Math.cos(a) * L), y: fieldY(from.y + Math.sin(a) * L) };
          DS.pose = 'thrust'; DS.swordA = a; DS.crouch = 0;
          tk.sfx('stab'); tk.sfx('whoosh');
        }
      } else if (st === 'go') {
        const k = clampN((time - t0) / goMs, 0, 1);
        const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
        place(tk, x, y);
        if (!hit && p.active && segDist(p.x, p.y, x, y, x + Math.cos(a) * 92, y + Math.sin(a) * 60) < 24 + PLAYER_R) {
          hit = true;
          tk.hitPlayer(13, p.x, p.y);
          tk.slowPlayer(0.6, 600);
          float(tk, p.x, p.y - 44, 'RUN THROUGH', '#c9b0ff');
        }
        if (k >= 1) {
          if (hit) { st = 'recover'; recoverUntil = time + 500; }
          else if (left > 0) { tk.sfx('crystal-shatter'); aim(time); }
          else {
            // The point goes into the glass.
            st = 'stuck';
            stuckUntil = time + (DS.shattered ? 1500 : tk.hard ? 1700 : 2100);
            DS.stuckUntil = stuckUntil;
            DS.stuckX = fieldX(to.x + Math.cos(a) * 70);
            DS.stuckY = clampN(to.y + Math.sin(a) * 44 + 24, FIELD.y0, tk.H - 40);
            DS.pose = 'buried';
            tk.sfx('stone-slam'); tk.sfx('crystal-shatter');
            shake(tk, 260, 0.008);
            const rng = mulberry(Math.floor(time));
            cracks = [];
            for (let i = 0; i < 7; i++) {
              const ca = (i / 7) * TAU + rng() * 0.4;
              cracks.push(crackPath({ x: DS.stuckX, y: DS.stuckY }, { x: DS.stuckX + Math.cos(ca) * 96, y: DS.stuckY + Math.sin(ca) * 70 }, rng, 9, 5));
            }
            if (time - DS.saidOpenAt > 7000) { DS.saidOpenAt = time; float(tk, DS.x, DS.y - 112, 'THE BLADE IS CAUGHT', '#ffe9b0'); }
          }
        }
      } else if (st === 'stuck') {
        DS.crouch = 0.5 + 0.5 * Math.sin(time / 90) * 0.5;
        if (time >= stuckUntil) {
          // He wrenches it free and the glass round it bursts.
          tk.sfx('ice-shatter'); tk.sfx('explosion-small');
          tk.boom(DS.stuckX, DS.stuckY, 100, OBS.seamLit);
          if (p.active && dist(p.x, p.y, DS.stuckX, DS.stuckY) < 100 + PLAYER_R * 0.5) tk.hitPlayer(8, p.x, p.y);
          swing(tk, a + 0.5, a - 2.2, 260, 110);
          DS.stuckUntil = 0;
          st = 'recover'; recoverUntil = time + 450;
        }
      } else if (st === 'recover' && time >= recoverUntil) {
        st = null; release();
      }
    },
    drawGround(g, time) {
      if (st === 'aim') {
        const k = clampN((time - t0) / Math.max(1, aimUntil - t0), 0, 1);
        const locked = time >= lockAt;
        const ca = Math.cos(a), sa = Math.sin(a), hw = 30;
        const px = -sa, py = ca;
        const ex = from.x + ca * (L + 90), ey = from.y + sa * (L + 90);
        // A spear of light: wide at him, a point at the far end.
        const pts = [
          { x: from.x + px * hw, y: from.y + py * hw }, { x: ex - ca * 40 + px * hw, y: ey - sa * 40 + py * hw }, { x: ex, y: ey },
          { x: ex - ca * 40 - px * hw, y: ey - sa * 40 - py * hw }, { x: from.x - px * hw, y: from.y - py * hw },
        ];
        g.fillStyle(locked ? OBS.seamLit : OBS.seam, locked ? 0.16 : 0.08); g.fillPoints(pts, true);
        const blink = locked && Math.floor(time / 70) % 2 === 0;
        g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : OBS.seamLit, 0.4 + k * 0.5); g.strokePoints(pts, true);
        for (let i = 1; i <= 5; i++) {
          const f = ((time / 400 + i / 5) % 1);
          const cx = from.x + ca * (L + 60) * f, cy = from.y + sa * (L + 60) * f;
          g.lineStyle(2, OBS.seamLit, 0.5 * k);
          g.lineBetween(cx - ca * 10 + px * 12, cy - sa * 10 + py * 12, cx, cy);
          g.lineBetween(cx - ca * 10 - px * 12, cy - sa * 10 - py * 12, cx, cy);
        }
      }
      if (st === 'stuck') {
        const left2 = stuckUntil - time;
        const flare = clampN(1 - left2 / tk.warn(600), 0, 1);
        for (const c of cracks) {
          const n = Math.max(2, Math.round(c.length * clampN((time - (stuckUntil - (DS.shattered ? 1500 : 2100))) / 600, 0.2, 1)));
          seam(g, c.slice(0, n), 1.2 + flare * 1.4, 0.8, flare, flare > 0.5 ? OBS.seamLit : OBS.seam);
        }
        // The open ring: gold while he is caught, violet-white as the burst comes.
        g.lineStyle(2, STAR, 0.35 * (1 - flare)); g.strokeCircle(DS.x, DS.y, BODY_R + 22 + Math.sin(time / 120) * 3);
        if (flare > 0) {
          g.fillStyle(OBS.seamLit, 0.06 + flare * 0.12); g.fillCircle(DS.stuckX, DS.stuckY, 100);
          if (Math.floor(time / 80) % 2 === 0) { g.lineStyle(2.5, 0xffffff, 0.4 + flare * 0.5); g.strokeCircle(DS.stuckX, DS.stuckY, 100); }
        }
      }
    },
    drawAir(g, time) {
      if (st === 'go') {
        const k = clampN((time - t0) / goMs, 0, 1);
        for (let i = 1; i <= 4; i++) {
          const kk = Math.max(0, k - i * 0.12);
          const x = from.x + (to.x - from.x) * kk, y = from.y + (to.y - from.y) * kk;
          g.fillStyle(OBS.seam, 0.18 / i); g.fillEllipse(x, y - 20, 70, 100);
        }
        g.lineStyle(3, OBS.seamLit, 0.6); g.lineBetween(from.x, from.y - 10, DS.x, DS.y - 10);
      }
    },
    onPhaseEnd() { st = null; cracks = []; },
  };
};

// ── 3. THE AEGIS FLIES / THE AEGIS RECALLED ────────────────────────────
// With the shield: he hurls it. The floor shows its whole flight first — out at you, off the walls
// three times — then it comes home to his arm wherever he stands. While it is gone he is bare all
// round; get in close and he cuts at you one-handed, so read the cut and punish the back of it.
// Broken: the Aegis's pieces stand in the floor where it burst. He calls them home through
// whatever is between, holds them turning round him, then flings them out to new places.

export const aegis = (tk: BossToolkit): SignatureMove => {
  // Thrown.
  type St = 'aim' | 'fly' | 'return' | null;
  let st: St = null;
  let t0 = 0, aimUntil = 0, hitAt = -1e9, nextCutAt = 0, cutBusyUntil = 0;
  let path: Pt[] = [], cum: number[] = [], total = 0, bounce = 0;
  let disc: Pt = { x: 0, y: 0 };
  let spin = 0;
  let trail: Pt[] = [];
  const S = new Strikes(tk);
  // Recalled.
  type Rt = 'rise' | 'in' | 'orbit' | 'out' | null;
  let rt: Rt = null;
  let r0 = 0, rUntil = 0;
  interface Fly { x: number; y: number; fx: number; fy: number; tx: number; ty: number; hit: boolean; size: number; done: boolean }
  let fly: Fly[] = [];
  let center: Pt = { x: 0, y: 0 };
  let dur = 4000;
  const SPEED = 640;

  const buildPath = (o: Pt, a: number): void => {
    const X0 = 46, X1 = tk.W - 46, Y0 = 112, Y1 = tk.H - 40;
    path = [o];
    let x = o.x, y = o.y, dx = Math.cos(a), dy = Math.sin(a);
    let rest = 1500;
    for (let b = 0; b < 4 && rest > 0; b++) {
      const tx = dx > 0 ? (X1 - x) / dx : dx < 0 ? (X0 - x) / dx : Infinity;
      const ty = dy > 0 ? (Y1 - y) / dy : dy < 0 ? (Y0 - y) / dy : Infinity;
      const tt = Math.max(1, Math.min(tx, ty, rest));
      x += dx * tt; y += dy * tt; rest -= tt;
      path.push({ x, y });
      if (rest <= 0 || b === 3) break;
      if (tx < ty) dx = -dx; else dy = -dy;
    }
    cum = lengths(path);
    total = cum[cum.length - 1];
  };

  const castThrow = (time: number): void => {
    const o = at(tk);
    const a = tk.angleToPlayer(o.x, o.y);
    buildPath({ x: o.x + Math.cos(a) * 50, y: o.y + Math.sin(a) * 50 }, a);
    st = 'aim'; t0 = time; aimUntil = time + tk.warn(800); bounce = 0;
    DS.drive = true; DS.pose = 'cocked'; DS.swordA = a + 2.4; DS.turnMult = 0.6;
    dur = tk.warn(800) + (total / SPEED) * 1000 + 1300;
  };

  const castRecall = (time: number): void => {
    if (DS.shards.length === 0) {
      const o = at(tk);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const x = fieldX(o.x + Math.cos(a) * 240), y = fieldY(o.y + Math.sin(a) * 200);
        DS.shards.push({ x, y, a, fromX: x, fromY: y, at: 0, size: 22 });
      }
    }
    center = at(tk);
    fly = DS.shards.map((s) => ({ x: s.x, y: s.y, fx: s.x, fy: s.y, tx: center.x, ty: center.y - 20, hit: false, size: s.size, done: false }));
    DS.shards = [];
    rt = 'rise'; r0 = time; rUntil = time + tk.warn(950);
    DS.drive = true; DS.pose = 'raised'; DS.turnMult = 0.4;
    tk.sfx('magnet-pull'); tk.sfx('crystal-chime');
    dur = tk.warn(950) + 500 + tk.warn(650) + 600;
  };

  const flyStep = (dt: number, speed: number): boolean => {
    const p = tk.player;
    let all = true;
    for (const f of fly) {
      if (f.done) continue;
      const d = dist(f.x, f.y, f.tx, f.ty);
      const step = speed * dt;
      if (d <= step) { f.x = f.tx; f.y = f.ty; f.done = true; continue; }
      all = false;
      f.x += ((f.tx - f.x) / d) * step; f.y += ((f.ty - f.y) / d) * step;
      if (!f.hit && p.active && dist(f.x, f.y, p.x, p.y) < 16 + PLAYER_R) {
        f.hit = true;
        tk.hitPlayer(8, p.x, p.y);
      }
    }
    return all;
  };

  return {
    get durationMs() { return dur; },
    windupMs: 600,
    gesture: 'sweep',
    tell: 'THE AEGIS',
    cast(time) {
      if (DS.shattered || DS.shield === 'gone') castRecall(time);
      else castThrow(time);
    },
    update(time, dt) {
      const p = tk.player;
      // ── Thrown.
      if (st === 'aim' && time >= aimUntil) {
        st = 'fly'; t0 = time; DS.shield = 'thrown'; DS.drive = false; DS.turnMult = 1;
        swing(tk, DS.swordA, DS.swordA - 2, 200, 80);
        tk.sfx('whoosh'); tk.sfx('gust');
      }
      if (st === 'fly' || st === 'return') {
        spin += dt * 14;
        trail.unshift({ ...disc }); if (trail.length > 4) trail.pop();
        if (st === 'fly') {
          const d = ((time - t0) / 1000) * SPEED;
          disc = along(path, cum, d);
          while (bounce + 1 < path.length - 1 && d >= cum[bounce + 1]) {
            bounce++;
            tk.sfx('clang');
            tk.boom(path[bounce].x, path[bounce].y, 40, OBS.seamLit);
          }
          if (d >= total) st = 'return';
        } else {
          const tx = DS.x + 40, ty = DS.y - 10;
          const d = dist(disc.x, disc.y, tx, ty);
          const step = 600 * dt;
          if (d <= Math.max(30, step)) {
            st = null; trail = [];
            DS.shield = DS.shattered ? 'gone' : 'arm';
            DS.blockAt = time; DS.blockX = tx; DS.blockY = ty;
            tk.sfx('shield-block');
          } else { disc.x += ((tx - disc.x) / d) * step; disc.y += ((ty - disc.y) / d) * step; }
        }
        if (st && p.active && time - hitAt > 600 && dist(disc.x, disc.y, p.x, p.y) < 28 + PLAYER_R) {
          hitAt = time;
          tk.hitPlayer(10, p.x, p.y);
          tk.sfx('hit-heavy');
        }
        // Bare, and you came close: a one-handed cut, plainly drawn.
        if (st && time >= nextCutAt && !S.pending() && dist(p.x, p.y, DS.x, DS.y) < 170) {
          const { o, a } = stepIn(tk, 20, 120, 40);
          const fireAt = time + tk.warn(480);
          S.add({ kind: 'arc', ox: o.x, oy: o.y, a, half: 1.1, r: 165, len: 0, halfW: 0, dir: Math.random() < 0.5 ? 1 : -1, fireAt, dmg: 10, step: o, sfx: 'slash', pose: 'cocked' });
          nextCutAt = fireAt + 1400;
          cutBusyUntil = fireAt + 200;
          DS.drive = true;
        }
      }
      if (cutBusyUntil && time >= cutBusyUntil) { cutBusyUntil = 0; if (!rt && st !== 'aim') { DS.drive = false; DS.pose = 'rest'; } }
      S.update(time);

      // ── Recalled.
      if (rt === 'rise' && time >= rUntil) { rt = 'in'; r0 = time; tk.sfx('whoosh'); }
      if (rt === 'in' && flyStep(dt, 1000)) {
        rt = 'orbit'; r0 = time; rUntil = time + tk.warn(650);
        tk.sfx('crystal-chime');
        DS.pose = 'guard';
        const a0 = tk.angleToPlayer(center.x, center.y);
        fly.forEach((f, i) => {
          const a = a0 + (i / fly.length) * TAU;
          f.tx = fieldX(center.x + Math.cos(a) * 300); f.ty = fieldY(center.y + Math.sin(a) * 260);
          f.hit = false; f.done = false;
        });
      }
      if (rt === 'orbit') {
        const k = (time - r0) / 1000;
        fly.forEach((f, i) => {
          const a = k * 5 + (i / fly.length) * TAU;
          f.x = center.x + Math.cos(a) * 62; f.y = center.y - 20 + Math.sin(a) * 40;
        });
        if (time >= rUntil) {
          rt = 'out'; r0 = time;
          fly.forEach((f) => { f.x = center.x; f.y = center.y - 20; });
          swing(tk, 0, TAU, 260, 90, true);
          tk.sfx('crystal-shatter'); tk.sfx('whoosh');
        }
      }
      if (rt === 'out' && flyStep(dt, 1000)) {
        rt = null;
        DS.shards = fly.map((f) => ({ x: f.tx, y: f.ty, a: 0, fromX: f.tx, fromY: f.ty, at: 0, size: f.size }));
        fly = [];
        shake(tk, 200, 0.006);
        release();
      }
    },
    drawGround(g, time) {
      S.drawGround(g, time);
      if (st === 'aim' || st === 'fly') {
        // The whole flight, dotted, with a star at each wall it will strike.
        const k = st === 'aim' ? clampN((time - t0) / Math.max(1, aimUntil - t0), 0, 1) : 1;
        const flown = st === 'fly' ? ((time - t0) / 1000) * SPEED : 0;
        const blink = st === 'aim' && k > 0.75 && Math.floor(time / 80) % 2 === 0;
        for (let d = flown; d < total * k; d += 22) {
          const q = along(path, cum, d);
          g.fillStyle(blink ? 0xffffff : OBS.seamLit, 0.55); g.fillCircle(q.x, q.y, 3);
        }
        for (let i = 1; i < path.length - 1; i++) {
          if (cum[i] > total * k || cum[i] < flown) continue;
          const q = path[i];
          g.fillStyle(OBS.seamLit, 0.3); g.fillCircle(q.x, q.y, 16);
          g.lineStyle(2, 0xffffff, 0.7);
          g.lineBetween(q.x - 9, q.y, q.x + 9, q.y); g.lineBetween(q.x, q.y - 9, q.x, q.y + 9);
        }
        g.lineStyle(2, OBS.seamLit, 0.25);
        for (let i = 1; i < path.length; i++) if (cum[i] > flown) g.lineBetween(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
      }
      if (st === 'return') {
        g.lineStyle(2, OBS.seamLit, 0.35); g.lineBetween(disc.x, disc.y, DS.x + 40, DS.y - 10);
      }
      if (rt === 'rise' || rt === 'orbit') {
        const k = clampN((time - r0) / Math.max(1, rUntil - r0), 0, 1);
        const blink = k > 0.75 && Math.floor(time / 80) % 2 === 0;
        for (const f of fly) {
          const ax = rt === 'rise' ? f.x : center.x, ay = rt === 'rise' ? f.y : center.y;
          const bx = rt === 'rise' ? center.x : f.tx, by = rt === 'rise' ? center.y : f.ty;
          const a = Math.atan2(by - ay, bx - ax), hw = 18;
          const px = -Math.sin(a) * hw, py = Math.cos(a) * hw;
          g.fillStyle(OBS.seam, 0.06 + k * 0.08);
          g.fillPoints([{ x: ax + px, y: ay + py }, { x: bx + px, y: by + py }, { x: bx - px, y: by - py }, { x: ax - px, y: ay - py }], true);
          g.lineStyle(blink ? 2.5 : 1.5, blink ? 0xffffff : OBS.seamLit, 0.35 + k * 0.45);
          g.lineBetween(ax + px, ay + py, bx + px, by + py); g.lineBetween(ax - px, ay - py, bx - px, by - py);
          if (rt === 'orbit') { g.fillStyle(OBS.seam, 0.25); g.fillCircle(f.tx, f.ty, 18); }
        }
        if (rt === 'rise') for (const f of fly) aegisShard(g, f.x, f.y, f.size, 0, time / 1000, k, k);
      }
    },
    drawAir(g) {
      if (st === 'fly' || st === 'return') aegisDisc(g, disc.x, disc.y, spin, { trail });
      if (rt === 'in' || rt === 'orbit' || rt === 'out') {
        for (const f of fly) {
          g.fillStyle(OBS.seam, 0.25); g.fillCircle(f.x, f.y - 10, 16);
          shard(g, f.x, f.y, f.size * 0.7, f.size * 1.2, 0, 0.5);
          g.fillStyle(0xffffff, 0.6); g.fillCircle(f.x, f.y - f.size * 0.6, 1.8);
        }
      }
    },
    onPhaseEnd() { st = null; rt = null; fly = []; trail = []; S.clear(); },
  };
};

// ── 4. FAULT LINES ─────────────────────────────────────────────────────
// He drives the sword point-down into the floor at his feet and the glass splits: cracks race out
// in a fan before him, hold glowing, then glass erupts along them root to tip. The fan is in front —
// he is kneeling on the hilt and his back is to the room. Two-handed: a wider fan, every crack forking.

export const faultLines = (tk: BossToolkit): SignatureMove => {
  const F = new Faults(tk);
  let active = false;
  let until = 0;
  let pending: { at: number; o: Pt; a: number; len: number }[] = [];
  let dur = 3200;
  return {
    get durationMs() { return dur; },
    windupMs: 650,
    gesture: 'slam',
    locksBody: true,
    tell: 'FAULT LINES',
    cast(time) {
      const o = at(tk);
      const face = tk.angleToPlayer(o.x, o.y);
      const root = { x: o.x + Math.cos(face) * 24, y: o.y + 30 };
      const two = DS.shattered;
      const spread = two ? [-1.5, -1, -0.5, 0, 0.5, 1, 1.5] : [-1, -0.5, 0, 0.5, 1];
      const rng = mulberry(Math.floor(time) ^ 0x5eed);
      pending = [];
      for (const s of spread) {
        const a = face + s + (rng() - 0.5) * 0.1;
        const f = F.add(root, a, 520, time, 760, 420, 9, rng);
        if (two) {
          // A fork from the middle of each crack, born as the race reaches it.
          const mid = along(f.pts, f.cum, f.total * 0.5);
          pending.push({ at: time + ((f.total * 0.5) / 760) * 1000, o: mid, a: a + (rng() < 0.5 ? -0.55 : 0.55), len: 200 });
        }
      }
      active = true;
      DS.drive = true; DS.pose = 'plunge'; DS.turnMult = 0.2; DS.crouch = 0.6;
      tk.sfx('stone-slam'); tk.sfx('quake');
      shake(tk, 300, 0.009);
      until = F.lastDone() - 600;
      dur = until - time + 300;
    },
    update(time) {
      if (pending.length) {
        const rng = mulberry(Math.floor(time));
        pending = pending.filter((q) => {
          if (time < q.at) return true;
          F.add(q.o, q.a, q.len, time, 760, 420 + 0, 9, rng);
          return false;
        });
      }
      F.update(time);
      if (active && time >= until) { active = false; release(); }
    },
    drawGround(g, time) {
      F.draw(g, time);
      if (active) {
        // The sword's point in the floor, light pooling round it.
        g.fillStyle(OBS.seam, 0.2); g.fillEllipse(DS.x + Math.cos(DS.guardA) * 22, DS.y + 30, 50, 18);
      }
    },
    onPhaseEnd() { F.clear(); pending = []; active = false; },
  };
};

// ── 5. KNEEL ───────────────────────────────────────────────────────────
// He lifts the sword and commands it, and the crown answers: rings of starlight roll out across the
// hall, a chime before each. A ring passes harmlessly over anyone who is still — kneeling — and
// strikes and roots anyone it finds moving. (A dash goes over it.) Two-handed: four rings, faster.

export const kneel = (tk: BossToolkit): SignatureMove => {
  interface Ring { born: number; speed: number; ox: number; oy: number; touched: boolean; judged: boolean }
  let rings: Ring[] = [];
  let emits: number[] = [];
  let active = false;
  let until = 0;
  let o: Pt = { x: 0, y: 0 };
  let last: Pt | null = null;
  let vS = 0;
  let dur = 4000;
  const BAND = 26;
  const radius = (r: Ring, time: number): number => BODY_R + ((time - r.born) / 1000) * r.speed;
  return {
    get durationMs() { return dur; },
    windupMs: 700,
    gesture: 'raise',
    locksBody: true,
    tell: 'KNEEL',
    cast(time) {
      const two = DS.shattered;
      const n = two ? 4 : 3, spacing = two ? 850 : 1100;
      const first = time + tk.warn(500);
      emits = Array.from({ length: n }, (_, i) => first + i * spacing);
      o = at(tk);
      active = true;
      until = emits[n - 1] + 700;
      dur = until - time + 900;
      DS.drive = true; DS.pose = 'raised'; DS.turnMult = 0.5;
      tk.sfx('judgement');
      float(tk, o.x, o.y - 118, 'KNEEL', '#ffe9b0');
    },
    update(time, dt) {
      const p = tk.player;
      if (last && dt > 0) vS = vS * 0.6 + (dist(p.x, p.y, last.x, last.y) / dt) * 0.4;
      last = { x: p.x, y: p.y };
      if (active) {
        const nextE = emits.find((e) => e > time - 1) ?? 0;
        DS.crownFlare = nextE ? clampN(1 - (nextE - time) / 500, 0.2, 1) : 0.3;
        while (emits.length && time >= emits[0]) {
          emits.shift();
          rings.push({ born: time, speed: DS.shattered ? 290 : 240, ox: o.x, oy: o.y, touched: false, judged: false });
          tk.sfx('holy-chord');
        }
        if (time >= until) { active = false; release(); }
      }
      for (const r of rings) {
        if (r.judged || !p.active) continue;
        const d = dist(p.x, p.y, r.ox, r.oy);
        const contact = Math.abs(d - radius(r, time)) < BAND / 2 + PLAYER_R;
        if (contact) {
          r.touched = true;
          if (vS > 55 && !tk.playerDashing()) {
            r.judged = true;
            tk.hitPlayer(8, p.x, p.y);
            tk.root(650);
            tk.sfx('status-stun');
            float(tk, p.x, p.y - 44, 'KNELT', '#ffe9b0');
          }
        } else if (r.touched) { r.judged = true; tk.sfx('sparkle'); }
      }
      rings = rings.filter((r) => radius(r, time) < 1150);
    },
    drawGround(g, time) {
      const t = time / 1000;
      if (active) {
        const nextE = emits[0];
        if (nextE !== undefined) {
          const k = clampN(1 - (nextE - time) / 500, 0, 1);
          if (k > 0) { g.lineStyle(3, STAR, 0.6 * k); g.strokeCircle(o.x, o.y, BODY_R + 30 * k); g.fillStyle(STAR, 0.06 * k); g.fillCircle(o.x, o.y, BODY_R + 30 * k); }
        }
      }
      const p = tk.player;
      let near = 0;
      for (const r of rings) {
        const R = radius(r, time);
        g.lineStyle(BAND, STAR, 0.16); g.strokeCircle(r.ox, r.oy, R);
        g.lineStyle(3, STAR, 0.8); g.strokeCircle(r.ox, r.oy, R + BAND / 2 - 2);
        g.lineStyle(1.5, OBS.starCore, 0.6); g.strokeCircle(r.ox, r.oy, R - BAND / 2 + 2);
        // Chevrons bowing inward all round: the ring is a command to bow.
        const n = Math.max(12, Math.round(R / 14));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + t * 0.2;
          const cx = r.ox + Math.cos(a) * R, cy = r.oy + Math.sin(a) * R;
          const ix = -Math.cos(a), iy = -Math.sin(a);
          const qx = -iy * 6, qy = ix * 6;
          g.fillStyle(STAR, 0.7);
          g.fillTriangle(cx - ix * 6 + qx, cy - iy * 6 + qy, cx - ix * 6 - qx, cy - iy * 6 - qy, cx + ix * 6, cy + iy * 6);
        }
        if (!r.judged) near = Math.max(near, clampN(1 - (dist(p.x, p.y, r.ox, r.oy) - R) / 160, 0, 1) * (dist(p.x, p.y, r.ox, r.oy) > R - BAND ? 1 : 0));
      }
      // Over the player as a ring comes: a little crown that burns white when you are still.
      if (near > 0 && p.active) {
        const still = vS <= 55;
        const c = still ? OBS.starCore : 0xff7a9a;
        const x = p.x, y = p.y - 52;
        g.fillStyle(c, 0.25 * near); g.fillCircle(x, y, 14);
        g.fillStyle(c, 0.9 * near);
        g.fillTriangle(x - 10, y + 5, x - 7, y - 6, x - 3, y + 5);
        g.fillTriangle(x - 4, y + 5, x, y - 9, x + 4, y + 5);
        g.fillTriangle(x + 3, y + 5, x + 7, y - 6, x + 10, y + 5);
        g.fillRect(x - 10, y + 4, 20, 3);
      }
    },
    onPhaseEnd() { rings = []; emits = []; active = false; last = null; },
  };
};

// ── 6. THE KING'S GUARD ────────────────────────────────────────────────
// He sets himself behind the shield, sword drawn back, and the guard turns as fast as you do. A
// draining ring round him counts the stance down. Strike him in it — from anywhere — and he answers
// at once: a cross-cut through where you stood. Leave him be and, when the ring runs out, he
// charges behind the shield and bashes whatever is before it. Two-handed: the blade held across
// him as a bar; struck, he spins; left alone, he chops a long line at you.

export const kingsGuard = (tk: BossToolkit): SignatureMove => {
  const S = new Strikes(tk);
  let win = false, wFrom = 0, wEnd = 0, triggered = false;
  let bash: { from: Pt; a: number; at: number; hit: boolean } | null = null;
  let endAt = 0;
  let dur = 3400;
  const BASH_LEN = 150, BASH_MS = 220;
  return {
    get durationMs() { return dur; },
    windupMs: 450,
    hold: 'brace',
    locksBody: true,
    tell: "THE KING'S GUARD",
    cast(time) {
      const two = DS.shattered;
      win = true; triggered = false; wFrom = time; wEnd = time + (two ? 1800 : 2400);
      endAt = 0; bash = null;
      DS.drive = true; DS.braced = 1; DS.pose = 'guard'; DS.turnMult = two ? 2.4 : 3.2;
      tk.sfx(two ? 'clang' : 'shield-block');
      dur = (wEnd - time) + 1300;
    },
    takenMult() {
      if (!win) return 1;
      return DS.shattered ? 0.55 : 0.35;
    },
    onBossHurt() {
      if (!win || triggered) return;
      const time = tk.now;
      triggered = true; win = false;
      DS.braced = 0;
      const p = tk.player;
      tk.sfx('clang');
      if (DS.shattered) {
        const o = at(tk);
        S.add({ kind: 'disc', ox: o.x, oy: o.y, a: tk.angleToPlayer(o.x, o.y), half: 0, r: 155, len: 0, halfW: 0, dir: 1, fireAt: time + tk.warn(480), dmg: 12, sfx: 'tornado', pose: 'cocked', hitWord: 'ANSWERED' });
        endAt = time + tk.warn(480) + 500;
      } else {
        const o = at(tk);
        const toP = Math.atan2(p.y - o.y, p.x - o.x);
        const d = dist(p.x, p.y, o.x, o.y);
        const stepPt = d > 110 ? { x: fieldX(o.x + Math.cos(toP) * Math.min(d - 90, 140)), y: fieldY(o.y + Math.sin(toP) * Math.min(d - 90, 140)) } : o;
        const fireAt = time + tk.warn(380);
        for (const off of [Math.PI / 4, -Math.PI / 4]) {
          const a = toP + off;
          S.add({ kind: 'lane', ox: p.x - Math.cos(a) * 150, oy: p.y - Math.sin(a) * 150, a, half: 0, r: 0, len: 300, halfW: 24, dir: 1, fireAt, dmg: 12, step: stepPt, sfx: 'slash', pose: 'cocked', hitWord: 'ANSWERED' });
        }
        endAt = fireAt + 500;
      }
    },
    update(time) {
      const p = tk.player;
      if (win) {
        DS.braced = 0.6 + 0.4 * Math.sin(time / 90);
        if (time >= wEnd) {
          win = false; DS.braced = 0;
          if (DS.shattered) {
            const o = at(tk);
            S.add({ kind: 'lane', ox: o.x, oy: o.y, a: tk.angleToPlayer(o.x, o.y), half: 0, r: 0, len: 460, halfW: 28, dir: 1, fireAt: time + tk.warn(600), dmg: 12, sfx: 'stone-slam', pose: 'raised' });
            endAt = time + tk.warn(600) + 500;
          } else {
            bash = { from: at(tk), a: DS.guardA, at: time, hit: false };
            tk.sfx('shield-block'); tk.sfx('whoosh');
          }
        }
      }
      if (bash) {
        const k = clampN((time - bash.at) / BASH_MS, 0, 1);
        const x = bash.from.x + Math.cos(bash.a) * BASH_LEN * k, y = bash.from.y + Math.sin(bash.a) * BASH_LEN * k;
        place(tk, x, y);
        if (!bash.hit && p.active && (dist(p.x, p.y, DS.x, DS.y) < BODY_R + PLAYER_R + 14 || (k >= 1 && inWedge(p.x, p.y, DS.x, DS.y, bash.a, 0.7, 110)))) {
          bash.hit = true;
          tk.hitPlayer(10, p.x, p.y);
          tk.stun(450);
          tk.sfx('hit-heavy');
          float(tk, p.x, p.y - 44, 'BASHED', '#c9b0ff');
        }
        if (k >= 1) { bash = null; endAt = time + 400; }
      }
      S.update(time);
      if (endAt && time >= endAt && !S.pending()) { endAt = 0; release(); }
    },
    drawGround(g, time) {
      S.drawGround(g, time);
      if (win) {
        // The stance, counting down: a draining ring round him.
        const k = clampN((wEnd - time) / Math.max(1, wEnd - wFrom), 0, 1);
        g.lineStyle(5, OBS.seamLit, 0.65);
        g.beginPath(); g.arc(DS.x, DS.y, BODY_R + 30, -Math.PI / 2, -Math.PI / 2 + TAU * k, false); g.strokePath();
        g.lineStyle(1.5, 0xffffff, 0.35); g.strokeCircle(DS.x, DS.y, BODY_R + 30);
        if (!DS.shattered) {
          // The bash it will become, shown for the last stretch of the stance.
          const show = clampN(1 - (wEnd - time) / tk.warn(650), 0, 1);
          if (show > 0) {
            const a = DS.guardA;
            const ex = DS.x + Math.cos(a) * BASH_LEN, ey = DS.y + Math.sin(a) * BASH_LEN;
            const hw = BODY_R + 14;
            const px = -Math.sin(a) * hw, py = Math.cos(a) * hw;
            g.fillStyle(OBS.seam, 0.1 + show * 0.12);
            g.fillPoints([{ x: DS.x + px, y: DS.y + py }, { x: ex + px, y: ey + py }, { x: ex - px, y: ey - py }, { x: DS.x - px, y: DS.y - py }], true);
            g.fillStyle(OBS.seam, 0.1 + show * 0.1); g.slice(ex, ey, 110, a - 0.7, a + 0.7, false); g.fillPath();
            const blink = show > 0.75 && Math.floor(time / 80) % 2 === 0;
            g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : OBS.seamLit, 0.4 + show * 0.5);
            g.beginPath(); g.arc(ex, ey, 110, a - 0.7, a + 0.7, false); g.strokePath();
          }
        }
      }
    },
    onPhaseEnd() { S.clear(); win = false; bash = null; endAt = 0; },
  };
};

// ── 7. THE EXECUTION ───────────────────────────────────────────────────
// He crouches and leaps out of the hall's light. An executioner's ring follows you on the floor —
// his shadow inside it — then sets. He comes down sword-first into the ring: the ring is struck and
// a cross of cracks runs out from it, and the blade is fast in the glass for a breath after.
// Two-handed: he leaps twice, the second from where the first came down.

export const execution = (tk: BossToolkit): SignatureMove => {
  type St = 'crouch' | 'air' | 'stuck' | null;
  const F = new Faults(tk);
  let st: St = null;
  let left = 0;
  let t0 = 0, until = 0, lockAt = 0;
  let from: Pt = { x: 0, y: 0 }, target: Pt = { x: 0, y: 0 };
  let dur = 3500;
  const RING = 92;
  const leap = (time: number): void => {
    st = 'crouch'; t0 = time; until = time + (DS.shattered ? 260 : 380);
    from = at(tk);
    DS.drive = true; DS.pose = 'raised';
    tk.sfx('whoosh');
  };
  return {
    get durationMs() { return dur; },
    windupMs: 600,
    gesture: 'raise',
    locksBody: true,
    tell: 'THE EXECUTION',
    cast(time) {
      left = DS.shattered ? 2 : 1;
      dur = DS.shattered ? 2 * (260 + tk.warn(850) + 700) + 700 : 380 + tk.warn(1100) + 1000 + 700;
      leap(time);
    },
    update(time) {
      const p = tk.player;
      if (st === 'crouch') {
        DS.crouch = clampN((time - t0) / (until - t0), 0, 1);
        if (time >= until) {
          st = 'air'; t0 = time; until = time + tk.warn(DS.shattered ? 850 : 1100);
          lockAt = t0 + (until - t0) * 0.62;
          left--; DS.crouch = 0;
          tk.sfx('wings');
          target = { x: fieldX(p.x), y: fieldY(p.y) };
        }
      } else if (st === 'air') {
        const k = clampN((time - t0) / Math.max(1, until - t0), 0, 1);
        if (time < lockAt) target = { x: fieldX(p.x), y: fieldY(p.y) };
        DS.air = Math.sin(k * Math.PI);
        const e = smooth(k);
        place(tk, from.x + (target.x - from.x) * e, from.y + (target.y - from.y) * e);
        if (time >= until) {
          place(tk, target.x, target.y);
          DS.air = 0;
          tk.sfx('gravity-slam'); tk.sfx('quake');
          shake(tk, 380, 0.013);
          tk.boom(target.x, target.y + 20, RING, OBS.seamLit);
          if (p.active && dist(p.x, p.y, target.x, target.y) < RING + PLAYER_R * 0.6) {
            tk.hitPlayer(13, p.x, p.y);
            float(tk, p.x, p.y - 44, 'EXECUTED', '#c9b0ff');
          }
          const rng = mulberry(Math.floor(time) ^ 0xe7);
          const a0 = tk.angleToPlayer(target.x, target.y) + Math.PI / 4;
          const n = DS.shattered ? 6 : 4;
          for (let i = 0; i < n; i++) F.add({ x: target.x, y: target.y + 10 }, a0 + (i / n) * TAU, DS.shattered ? 300 : 270, time, 900, 260, 8, rng);
          st = 'stuck'; t0 = time; until = time + (DS.shattered ? 700 : 1000);
          DS.stuckUntil = until; DS.stuckX = target.x; DS.stuckY = target.y + 30; DS.pose = 'buried';
        }
      } else if (st === 'stuck' && time >= until) {
        DS.stuckUntil = 0;
        if (left > 0) leap(time);
        else { st = null; release(); }
      }
      F.update(time);
    },
    drawGround(g, time) {
      F.draw(g, time);
      if (st === 'air' || st === 'crouch') {
        const k = st === 'air' ? clampN((time - t0) / Math.max(1, until - t0), 0, 1) : 0;
        const locked = st === 'air' && time >= lockAt;
        const x = st === 'air' ? target.x : tk.player.x, y = st === 'air' ? target.y : tk.player.y;
        // The executioner's ring: a dark disc, a rim, a cross, the clock filling.
        g.fillStyle(0x000000, 0.18 + k * 0.15); g.fillCircle(x, y, RING);
        g.fillStyle(OBS.seam, 0.1 + k * 0.12); g.slice(x, y, RING, -Math.PI / 2, -Math.PI / 2 + TAU * k, false); g.fillPath();
        const blink = locked && Math.floor(time / 70) % 2 === 0;
        g.lineStyle(blink ? 4 : 2.5, blink ? 0xffffff : OBS.seamLit, 0.5 + k * 0.45); g.strokeCircle(x, y, RING);
        g.lineStyle(1.5, OBS.seamLit, 0.4 + k * 0.4);
        g.lineBetween(x - RING * 0.7, y, x + RING * 0.7, y); g.lineBetween(x, y - RING * 0.7, x, y + RING * 0.7);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + Math.PI / 4;
          g.fillStyle(OBS.seamLit, 0.6);
          g.fillTriangle(x + Math.cos(a) * (RING + 12), y + Math.sin(a) * (RING + 12), x + Math.cos(a + 0.12) * (RING - 4), y + Math.sin(a + 0.12) * (RING - 4), x + Math.cos(a - 0.12) * (RING - 4), y + Math.sin(a - 0.12) * (RING - 4));
        }
      }
    },
    onPhaseEnd() { st = null; F.clear(); },
  };
};

