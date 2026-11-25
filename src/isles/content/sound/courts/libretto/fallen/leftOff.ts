import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { mulberry, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { inkBlot, sheet } from '../art';
import { GILT, GILT_LIT, INK, INK_SHEEN, PAPER_LIT, RED, RED_DARK, RED_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { proofSlip, slipBar } from './common';

/**
 * Where We Left Off — Lector Cosima Ribband, who reads the day's page of the Score aloud at the
 * eagle lectern in Proof Square, and keeps its red silk bookmark.
 *
 * She lays a bookmark at every fighter's feet — a red ribbon on the stones, its thread running back
 * to whoever it marks — and a few breaths later turns back to where we left off: every marked
 * fighter is snatched back along their thread to their ribbon, and anyone standing on that thread
 * is bowled over by them as they fly. Before she turns back she blots your place: ink falls on your
 * ribbon and lies there, burning, waiting for you to be put back in it.
 *
 * Strike a ribbon to lift it, and its fighter stays where they are — lift yours out of the ink, or
 * lift hers so she cannot bowl you. Or leave yours, and stand so that he is on your thread when the
 * page turns. Past half she marks the place twice, and you are carried back through both.
 */

const WAIT = 4200;
const BLOT_AT = 1200, BLOT_FALL = 1200;
const BLOT_R = 46;

interface Mark { f: Fighter; pts: Pt[]; t: StrikeTarget[]; lifted: boolean }
interface Riffle { path: Pt[]; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  let marks: Mark[] = [];
  const riffles: Riffle[] = [];
  let blot: { x: number; y: number; landAt: number; until: number; seed: number } | null = null;
  const ticks = new Map<Fighter, number>();
  let started = false;
  let half = false;
  let markAt = 0, secondAt = 0, turnAt = 0;
  let waiting = false;
  let laidAt = 0;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  const markOf = (f: Fighter): Mark | undefined => marks.find((m) => m.f === f && !m.lifted);
  /** The way a fighter will be carried: from where they stand back through every ribbon, newest first. */
  const pathOf = (m: Mark): Pt[] => [{ x: m.f.x, y: m.f.y }, ...[...m.pts].reverse()];

  function ribbonTarget(m: Mark, p: Pt): StrikeTarget {
    return ctx.target({
      x: p.x, y: p.y, r: 22, passThrough: true,
      onStruck: (by) => {
        // Lifted on purpose only: a blow from beside it, once the ribbon has settled.
        const f = by === 'player' ? player : npc;
        if (m.lifted || !waiting || ctx.scene.time.now - laidAt < 700 || dist(f.x, f.y, p.x, p.y) > 110) return;
        m.lifted = true;
        for (const t of m.t) t.remove();
        ctx.sfx('snap-back');
        ctx.flash(p.x, p.y, RED_LIT);
      },
    });
  }

  function lay(first: boolean): void {
    laidAt = ctx.scene.time.now;
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const p = { x: f.x, y: f.y };
      let m = marks.find((mm) => mm.f === f);
      if (first || !m) { m = { f, pts: [], t: [], lifted: false }; marks = marks.filter((mm) => mm.f !== f); marks.push(m); }
      if (m.lifted) continue;
      m.pts.push(p);
      m.t.push(ribbonTarget(m, p));
    }
    ctx.sfx('whoosh');
  }

  function turnBack(time: number): void {
    for (const m of marks) {
      if (m.lifted || !alive(m.f) || ctx.isAirborne(m.f)) continue;
      const path = pathOf(m);
      const o = other(m.f);
      let bowled = false;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        if (bowled || !alive(o) || ctx.isAirborne(o) || segDist(o.x, o.y, a.x, a.y, b.x, b.y) > 34) continue;
        bowled = true;
        ctx.hit(o, 14, o.x, o.y);
        ctx.stun(o, 500);
        const sa = Math.atan2(b.y - a.y, b.x - a.x);
        const side = (o.x - a.x) * Math.sin(sa) - (o.y - a.y) * Math.cos(sa) > 0 ? -1 : 1;
        ctx.nudge(o, -Math.sin(sa) * 44 * side, Math.cos(sa) * 44 * side);
        ctx.sfx('hit-heavy');
      }
      const end = path[path.length - 1];
      ctx.nudge(m.f, end.x - m.f.x, end.y - m.f.y);
      riffles.push({ path, at: time });
    }
    ctx.sfx('time-warp');
    for (const m of marks) for (const t of m.t) t.remove();
    marks = [];
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; markAt = time + 2600; }
      if (!half && npc.hp < npc.maxHp * 0.5) half = true;

      if (!waiting && time >= markAt && alive(npc)) {
        waiting = true;
        lay(true);
        turnAt = time + WAIT;
        secondAt = half ? time + 1800 : 0;
      }
      if (waiting) {
        if (secondAt && time >= secondAt) { secondAt = 0; lay(false); }
        // Her ink falls on your place.
        if (!blot && time >= turnAt - WAIT + BLOT_AT) {
          const m = marks.find((mm) => mm.f === player);
          const p = m?.pts[0] ?? { x: player.x, y: player.y };
          blot = { x: p.x, y: p.y, landAt: time + BLOT_FALL, until: turnAt + 2600, seed: time % 997 };
          ctx.sfx('slime-splat');
        }
        if (time >= turnAt) { waiting = false; turnBack(time); markAt = time + 2600; }
      }
      if (blot && time >= blot.landAt) {
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, blot.x, blot.y) > BLOT_R + 8) continue;
          if (time - (ticks.get(f) ?? 0) < 500) continue;
          ticks.set(f, time);
          ctx.hit(f, 5, f.x, f.y);
        }
        if (time > blot.until) blot = null;
      }
      for (let i = riffles.length - 1; i >= 0; i--) if (time - riffles[i].at > 600) riffles.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = markOf(npc), yours = markOf(player);
      if (waiting && mine) {
        // Stand beyond you from her newest ribbon, so her thread runs through you.
        const b = mine.pts[mine.pts.length - 1];
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        let x = player.x + Math.cos(a) * 110, y = player.y + Math.sin(a) * 110;
        if (yours) {
          const yb = yours.pts[yours.pts.length - 1];
          if (segDist(x, y, player.x, player.y, yb.x, yb.y) < 60) { x += Math.cos(a + Math.PI / 2) * 90; y += Math.sin(a + Math.PI / 2) * 90; }
        }
        return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 210, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (blot) {
        if (time < blot.landAt) {
          const k = clamp(1 - (blot.landAt - time) / BLOT_FALL, 0, 1);
          g.fillStyle(INK, 0.1 + 0.25 * k); g.fillEllipse(blot.x, blot.y, BLOT_R * 2 * (0.4 + 0.6 * k), BLOT_R * 1.2 * (0.4 + 0.6 * k));
          g.lineStyle(2, INK, 0.5); g.strokeCircle(blot.x, blot.y, BLOT_R);
        } else {
          inkBlot(g, blot.x, blot.y, BLOT_R * 0.72, mulberry(blot.seed), INK, 0.92);
          g.fillStyle(INK_SHEEN, 0.2 + Math.sin(time / 300) * 0.06); g.fillEllipse(blot.x - 10, blot.y - 8, 30, 10);
        }
      }
      // Threads from each marked fighter back to their ribbons — the way they will be carried.
      const k = waiting ? clamp(1 - (turnAt - time) / WAIT, 0, 1) : 0;
      for (const m of marks) {
        if (m.lifted || !alive(m.f)) continue;
        const path = pathOf(m);
        const col = m.f === player ? RED_LIT : RED;
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i], b = path[i + 1];
          const n = Math.max(2, Math.floor(dist(a.x, a.y, b.x, b.y) / 14));
          for (let j = 0; j < n; j++) {
            const t = j / n;
            g.fillStyle(col, 0.25 + 0.55 * k); g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1.6 + k * 1.4);
          }
        }
        for (const p of m.pts) drawRibbon(g, p.x, p.y, time, m.f === player);
      }
    },

    drawAir(g, time) {
      if (blot && time < blot.landAt) {
        const k = clamp(1 - (blot.landAt - time) / BLOT_FALL, 0, 1);
        const y = blot.y - (1 - k) * 220;
        g.fillStyle(INK, 1); g.fillCircle(blot.x, y, 6 + k * 3); g.fillTriangle(blot.x - 5, y, blot.x + 5, y, blot.x, y - 14);
        g.fillStyle(INK_SHEEN, 0.6); g.fillCircle(blot.x - 2, y - 2, 2);
      }
      // The page riffling back along each path.
      for (const r of riffles) {
        const k = clamp((time - r.at) / 600, 0, 1);
        for (let i = 0; i < r.path.length - 1; i++) {
          const a = r.path[i], b = r.path[i + 1];
          for (let j = 0; j < 5; j++) {
            const t = (j / 5 + k) % 1;
            const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 18;
            sheet(g, x, y, 14 * Math.abs(Math.cos(t * 9 + time / 60)) + 2, 18, (b.x - a.x) * 0.002, PAPER_LIT, 1 - k);
          }
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      proofSlip(g, x, y, 168, 28);
      // An open book on the slip, a red ribbon hanging from it for each mark still down.
      g.fillStyle(PAPER_LIT, 1); g.fillRect(x - 66, y + 7, 12, 15); g.fillRect(x - 53, y + 7, 12, 15);
      g.lineStyle(1, INK, 0.8); g.strokeRect(x - 66, y + 7, 25, 15); g.lineBetween(x - 54, y + 7, x - 54, y + 22);
      let k = 0;
      for (const m of marks) if (!m.lifted) { g.lineStyle(2, m.f === player ? RED_LIT : RED_DARK, 1); g.lineBetween(x - 58 + k * 6, y + 7, x - 57 + k * 6, y + 26); k++; }
      const prog = waiting ? clamp(1 - (turnAt - time) / WAIT, 0, 1) : clamp(1 - (markAt - time) / 2600, 0, 1) * 0.15;
      slipBar(g, x - 30, y + 11, 104, prog, waiting ? RED : GILT);
    },

    destroy() { for (const m of marks) for (const t of m.t) t.remove(); },
  };
}

/** A red silk bookmark lying on the stones in a loose S, frayed at one end, a gilt tassel at the other. */
function drawRibbon(g: G, x: number, y: number, time: number, yours: boolean): void {
  const sway = Math.sin(time / 500 + x) * 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push({ x: x - 18 + t * 36, y: y + Math.sin(t * Math.PI * 2) * 7 + sway * t }); }
  g.lineStyle(7, RED_DARK, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y + 2); for (const p of pts) g.lineTo(p.x, p.y + 2); g.strokePath();
  g.lineStyle(5, yours ? RED_LIT : RED, 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(1, 0xffffff, 0.35); g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1.5); for (const p of pts) g.lineTo(p.x, p.y - 1.5); g.strokePath();
  // Frayed end.
  const e = pts[pts.length - 1];
  g.lineStyle(1, RED, 1); for (let k = -2; k <= 2; k++) g.lineBetween(e.x, e.y + k, e.x + 5, e.y + k * 1.6);
  // Gilt tassel.
  const s = pts[0];
  g.fillStyle(GILT, 1); g.fillCircle(s.x, s.y, 3.5);
  g.lineStyle(1, GILT_LIT, 1); for (let k = -2; k <= 2; k++) g.lineBetween(s.x, s.y + 2, s.x - 3 + k * 1.5, s.y + 9);
}

export const FALLEN_LEFT_OFF: GimmickDef = {
  id: fallenId('libretto', 'left-off'),
  rules: 'Bookmarks fall at your feet; she turns back, flinging each of you to your ribbon through whoever is in the way. Strike a ribbon to lift it.',
  make,
};
