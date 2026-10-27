import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { fighterOf, live, SIDES } from './shared';
import { BRASS, BRASS_DARK, BRASS_LIT, CSS_BRASS, CSS_METER, LAMPLIGHT, WHITE } from '../palette';
import { arrow, dist, hoop } from '../orbitArt';

/**
 * Slingshot — Courier Apsis's fight.
 *
 * The couriers of the Orbit Court don't walk between islets; they *fall* between them, round the
 * moon, on a slingshot. Four brass hoops stand about the yard, each with a leather band strung
 * across it and its flight-path painted on the paving: a long curving arc, chevrons running the
 * way it throws. **Pass through a hoop** and the band catches you and flings you down its arc at
 * a sprint no legs can match, setting you down at the far end. Anyone standing on the arc when
 * you come through is **bowled over** — knocked aside, staggered, and hurt.
 *
 * A hoop needs a few seconds to re-tension after it throws. Apsis rides them like a postman on
 * his round: whenever you stand on an arc whose hoop is near him and ready, he takes it — and
 * comes through you. The arcs are painted for both of you. Stand off the paint, and when he
 * stops on one to catch his breath, take the hoop that throws down it.
 */

interface Arc { px: number; py: number; r: number; a0: number; sweep: number; readyAt: number; pts: Pt[] }
interface Flight { arc: number; t0: number; ms: number; bowled: boolean }

const HOOP_R = 30;
const RECHARGE = 3000;
const SPEED = 900;

export const SLINGSHOT: GimmickDef = {
  id: 'orbit-slingshot',
  rules: 'Pass through a brass hoop and you are flung along its painted arc. Anyone on the arc when you come through is bowled over.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const midY = (top + H) / 2 + 8;
    const bowl = hard ? 15 : 12;
    const mk = (px: number, py: number, r: number, a0: number, sweep: number): Arc => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const a = a0 + sweep * (i / 40);
        pts.push({ x: Phaser.Math.Clamp(px + Math.cos(a) * r, 40, W - 40), y: Phaser.Math.Clamp(py + Math.sin(a) * r, top + 30, H - 40) });
      }
      return { px, py, r, a0, sweep, readyAt: 0, pts };
    };
    const arcs: Arc[] = [
      mk(W * 0.3, midY, 190, -Math.PI / 2, Math.PI),
      mk(W * 0.7, midY, 190, Math.PI / 2, Math.PI),
      mk(W * 0.5, midY - 16, 220, Math.PI, -Math.PI * 0.75),
      mk(W * 0.5, midY - 16, 220, 0, -Math.PI * 0.75),
    ];
    const arcLen = (a: Arc): number => Math.abs(a.sweep) * a.r;
    const ringAt = (a: Arc): Pt => a.pts[0];
    const posOn = (a: Arc, k: number): Pt => {
      const i = Phaser.Math.Clamp(k, 0, 1) * (a.pts.length - 1);
      const lo = Math.floor(i), hi = Math.min(a.pts.length - 1, lo + 1);
      const f = i - lo;
      return { x: a.pts[lo].x + (a.pts[hi].x - a.pts[lo].x) * f, y: a.pts[lo].y + (a.pts[hi].y - a.pts[lo].y) * f };
    };
    const offArc = (a: Arc, x: number, y: number): number => {
      let best = Infinity;
      for (const p of a.pts) best = Math.min(best, dist(p.x, p.y, x, y));
      return best;
    };

    const flights: Record<Side, Flight | null> = { p: null, n: null };
    const cool = { p: 0, n: 0 };
    const trails: { x: number; y: number; at: number }[] = [];
    const bowls: { x: number; y: number; at: number }[] = [];

    return {
      update(time) {
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          if (!live(f)) { flights[k] = null; continue; }
          const fl = flights[k];
          if (fl) {
            const a = arcs[fl.arc];
            const q = Phaser.Math.Clamp((time - fl.t0) / fl.ms, 0, 1);
            const ease = q < 0.15 ? q * q / 0.15 * 0.5 + q * 0.5 : q;
            const to = posOn(a, ease);
            ctx.nudge(f, to.x - f.x, to.y - f.y);
            trails.push({ x: f.x, y: f.y, at: time });
            // Bowling whoever stands on the arc.
            const ok: Side = k === 'p' ? 'n' : 'p';
            const o = fighterOf(ctx, ok);
            if (!fl.bowled && live(o) && !flights[ok] && dist(o.x, o.y, f.x, f.y) < 46) {
              fl.bowled = true;
              const ahead = posOn(a, ease + 0.04);
              const tx = ahead.x - f.x, ty = ahead.y - f.y;
              const tl = Math.hypot(tx, ty) || 1;
              const side = (o.x - f.x) * -ty + (o.y - f.y) * tx >= 0 ? 1 : -1;
              ctx.hit(o, bowl, o.x, o.y);
              ctx.nudge(o, (-ty / tl) * 70 * side + (tx / tl) * 30, (tx / tl) * 70 * side + (ty / tl) * 30);
              ctx.stun(o, hard ? 420 : 340);
              bowls.push({ x: o.x, y: o.y, at: time });
              ctx.sfx('hit-heavy');
              ctx.float(o.x, o.y - 48, k === 'p' ? 'BOWLED OVER' : 'SPECIAL DELIVERY', k === 'p' ? CSS_BRASS : CSS_METER);
            }
            if (q >= 1) { flights[k] = null; cool[k] = time + 600; ctx.sfx('land'); }
            continue;
          }
          if (time < cool[k]) continue;
          for (let i = 0; i < arcs.length; i++) {
            const a = arcs[i];
            const r = ringAt(a);
            if (time < a.readyAt || dist(r.x, r.y, f.x, f.y) > HOOP_R) continue;
            a.readyAt = time + RECHARGE;
            flights[k] = { arc: i, t0: time, ms: Math.max(450, (arcLen(a) / SPEED) * 1000), bowled: false };
            ctx.sfx('snap-back');
            if (k === 'n') ctx.float(r.x, r.y - 60, 'APSIS TAKES THE HOOP', CSS_METER);
            break;
          }
        }
        while (trails.length && time - trails[0].at > 300) trails.shift();
        while (bowls.length && time - bowls[0].at > 600) bowls.shift();
      },

      playerSpeedMult: () => (flights.p ? 0 : 1),
      npcSpeedMult: () => (flights.n ? 0 : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        if (flights.n) return null;
        // You are on a painted arc and its hoop is ready and near: go and take it.
        let best: Pt | null = null, bd = Infinity;
        for (const a of arcs) {
          if (t < a.readyAt - 300) continue;
          if (offArc(a, p.x, p.y) > 50) continue;
          const r = ringAt(a);
          const d = dist(r.x, r.y, n.x, n.y);
          if (d < 430 && d < bd) { bd = d; best = r; }
        }
        if (best) return best;
        // You are flying: get off whatever arc you are on.
        if (flights.p) {
          const a = arcs[flights.p.arc];
          if (offArc(a, n.x, n.y) < 70) {
            const ang = Math.atan2(n.y - a.py, n.x - a.px);
            const want = a.r + (offArc(a, n.x, n.y) < 1 ? 110 : Math.sign(dist(n.x, n.y, a.px, a.py) - a.r || 1) * 110);
            return { x: a.px + Math.cos(ang) * want, y: a.py + Math.sin(ang) * want };
          }
        }
        return null;
      },

      drawGround(g, time) {
        const sec = time / 1000;
        arcs.forEach((a) => {
          const ready = time >= a.readyAt;
          const k = ready ? 1 : 1 - (a.readyAt - time) / RECHARGE;
          // The painted path: a brass band with chevrons running the way it throws.
          g.lineStyle(26, BRASS_DARK, ready ? 0.14 : 0.07);
          g.beginPath(); a.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
          g.lineStyle(2, ready ? BRASS_LIT : BRASS, ready ? 0.6 : 0.3);
          g.beginPath(); a.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
          const chev = 9;
          for (let i = 0; i < chev; i++) {
            const q = ((i + (ready ? sec * 0.8 : 0)) / chev) % 1;
            const p0 = posOn(a, q), p1 = posOn(a, Math.min(1, q + 0.02));
            const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            g.lineStyle(3, ready ? LAMPLIGHT : BRASS, ready ? 0.7 : 0.25);
            g.lineBetween(p0.x + Math.cos(ang + 2.4) * 9, p0.y + Math.sin(ang + 2.4) * 9, p0.x, p0.y);
            g.lineBetween(p0.x + Math.cos(ang - 2.4) * 9, p0.y + Math.sin(ang - 2.4) * 9, p0.x, p0.y);
          }
          // Where it sets you down.
          const end = a.pts[a.pts.length - 1];
          g.lineStyle(2, BRASS, 0.5); g.strokeCircle(end.x, end.y, 18);
          g.lineStyle(1, BRASS, 0.4); g.lineBetween(end.x - 10, end.y, end.x + 10, end.y); g.lineBetween(end.x, end.y - 10, end.x, end.y + 10);
          // The hoop's catchment.
          const r = ringAt(a);
          g.lineStyle(2, ready ? LAMPLIGHT : BRASS_DARK, ready ? 0.5 + 0.3 * Math.sin(sec * 5) : 0.3); g.strokeCircle(r.x, r.y, HOOP_R);
          if (!ready) {
            g.lineStyle(3, BRASS_LIT, 0.8);
            g.beginPath(); g.arc(r.x, r.y, HOOP_R + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
          }
        });
        // Live flights paint the arc ahead of the flyer red-hot.
        for (const k of SIDES) {
          const fl = flights[k];
          if (!fl) continue;
          const a = arcs[fl.arc];
          const q = Phaser.Math.Clamp((time - fl.t0) / fl.ms, 0, 1);
          const p0 = posOn(a, q);
          const p1 = posOn(a, Math.min(1, q + 0.3));
          g.lineStyle(30, LAMPLIGHT, 0.18); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
        }
      },

      drawAir(g, time) {
        arcs.forEach((a) => {
          const r = ringAt(a);
          const k = time >= a.readyAt ? 1 : 1 - (a.readyAt - time) / RECHARGE;
          hoop(g, r.x, r.y + 14, 24, k, 1);
          // A little arrow over the hoop pointing the way it throws.
          const p1 = posOn(a, 0.06);
          arrow(g, r.x, r.y - 52, Math.atan2(p1.y - r.y, p1.x - r.x), 12, k >= 1 ? BRASS_LIT : BRASS_DARK, 0.9, 2);
        });
        for (const tr of trails) {
          const q = (time - tr.at) / 300;
          g.fillStyle(BRASS_LIT, 0.5 * (1 - q)); g.fillCircle(tr.x, tr.y - 6, 14 * (1 - q * 0.6));
        }
        for (const b of bowls) {
          const q = (time - b.at) / 600;
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + q * 3;
            g.fillStyle(i % 2 ? WHITE : BRASS_LIT, 1 - q); g.fillCircle(b.x + Math.cos(ang) * (16 + q * 20), b.y - 30 + Math.sin(ang) * 6, 2.5);
          }
        }
      },

      drawHud(g) {
        // Four hoop pips: lit when ready.
        const t = ctx.scene.time.now;
        const x = W / 2, y = 114;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 44, y - 10, 88, 20, 7);
        arcs.forEach((a, i) => {
          const k = t >= a.readyAt ? 1 : 1 - (a.readyAt - t) / RECHARGE;
          g.lineStyle(2, k >= 1 ? BRASS_LIT : BRASS_DARK, 1); g.strokeCircle(x - 30 + i * 20, y, 6);
          g.fillStyle(BRASS, 0.9); g.fillCircle(x - 30 + i * 20, y, 5 * k);
        });
      },
    };
  },
};
