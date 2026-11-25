import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { card } from '../art';
import { BAIZE_DEEP, CARD_BLACK, GILT, GILT_DARK, GILT_LIT, IVORY, MAHOGANY, MAHOGANY_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt, type Suit } from '../util';
import { fallenId } from '../../../../meteor/spec';
import { rankCard } from './deck';

/**
 * The Long Patience — Governess Ermengild Pask, who in the King's telling taught Prince Ante to
 * wait: to build down, king to ace, red on black, and never move a card before its time.
 *
 * She lays a run across the yard, one card at a time, each a rank lower than the last and the other
 * colour. Every card she lays is tied to the one before it by a gilt thread drawn taut along the
 * floor, and a taut thread burns whoever stands across it (a tick every half second, and it drags at
 * the feet). She lays each new card near you, so the run winds round you as it grows. When the ace
 * goes down the run *comes out*: every thread blazes at once, and anyone across one is cut.
 *
 * Strike any card of the run and it is pulled: the run breaks there, and every thread from that
 * card on snaps back like a cut violin string — whipping whoever stands across it. Break her run
 * while she is standing in its tail. Halfway down she lays faster.
 */

const ID = fallenId('card', 'patience');
const RUN = 13;
const LAY_MS = 1500;
const LAY_FAST_MS = 1050;
const FLY_MS = 520;
const TAUT_MS = 280;
const TOUCH = 22;
const BURN_MS = 500;
const BURN = 6;
const SNAP_R = 34;
const SNAP = 14;
const SNAP_SHOW = 320;
const OUT_WARN = 1100;
const OUT_R = 34;
const OUT = 20;
const CW = 26, CH = 36;

interface RunCard {
  x: number; y: number; fromX: number; fromY: number;
  rank: number; suit: Suit; ang: number;
  layAt: number;
  target: StrikeTarget | null;
}
interface Whip { ax: number; ay: number; bx: number; by: number; at: number; side: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const run: RunCard[] = [];
  const whips: Whip[] = [];
  const lastBurn = new Map<Fighter, number>();
  let nextLay = 0;
  let outAt = 0;
  let outFlash = 0;
  let started = false;
  let fast = false;
  let npcOnThread = false;
  let now = 0;

  const landed = (c: RunCard, time: number) => time >= c.layAt + FLY_MS;
  const live = (i: number, time: number) => i > 0 && i < run.length && time >= run[i].layAt + FLY_MS + TAUT_MS;
  /** Distance from a point to the nearest live thread, and that thread's end index. */
  function nearestThread(x: number, y: number, time: number): { d: number; i: number } {
    let best = { d: Infinity, i: -1 };
    for (let i = 1; i < run.length; i++) {
      if (!live(i, time)) continue;
      const d = segDist(x, y, run[i - 1].x, run[i - 1].y, run[i].x, run[i].y);
      if (d < best.d) best = { d, i };
    }
    return best;
  }

  function lay(time: number): void {
    const rank = RUN - run.length;
    const prev = run[run.length - 1];
    const red = prev ? !(prev.suit === 'heart' || prev.suit === 'diamond') : rng() < 0.5;
    const suit: Suit = red ? (rng() < 0.5 ? 'heart' : 'diamond') : (rng() < 0.5 ? 'spade' : 'club');
    // The king goes down at her own feet; every later card goes down near you.
    const anchor = prev ? player : npc;
    const a = rng() * Math.PI * 2, r = prev ? 95 + rng() * 60 : 40;
    let x = clamp(anchor.x + Math.cos(a) * r, 60, W - 60);
    let y = clamp(anchor.y + Math.sin(a) * r, top + 50, H - 40);
    if (prev) {
      const d = dist(prev.x, prev.y, x, y);
      if (d > 300) { x = prev.x + ((x - prev.x) / d) * 300; y = prev.y + ((y - prev.y) / d) * 300; }
      if (d < 70) { const k = 70 / Math.max(1, d); x = clamp(prev.x + (x - prev.x) * k, 60, W - 60); y = clamp(prev.y + (y - prev.y) * k, top + 50, H - 40); }
    }
    const c: RunCard = { x, y, fromX: npc.x, fromY: npc.y - 20, rank, suit, ang: (rng() - 0.5) * 0.8, layAt: time, target: null };
    run.push(c);
    ctx.sfx('whoosh');
  }

  function struck(c: RunCard): void {
    const i = run.indexOf(c);
    if (i < 0 || outAt) return;
    breakAt(i, now);
  }

  function breakAt(i: number, time: number): void {
    const hit = new Set<Fighter>();
    for (let k = Math.max(1, i); k < run.length; k++) {
      const a = run[k - 1], b = run[k];
      if (!live(k, time)) continue;
      whips.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, at: time, side: k % 2 ? 1 : -1 });
      for (const f of [player, npc]) if (alive(f) && segDist(f.x, f.y, a.x, a.y, b.x, b.y) < SNAP_R) hit.add(f);
    }
    for (const f of hit) { ctx.hit(f, SNAP, f.x, f.y); if (f === npc) ctx.flash(f.x, f.y, GILT_LIT); }
    for (const c of run.splice(i)) c.target?.remove();
    ctx.sfx(hit.size ? 'whip' : 'snap-back');
    nextLay = Math.max(nextLay, time + 800);
  }

  function comeOut(time: number): void {
    for (const f of [player, npc]) {
      if (alive(f) && nearestThread(f.x, f.y, time).d < OUT_R) ctx.hit(f, OUT, f.x, f.y);
    }
    ctx.sfx('crystal-shatter');
    outFlash = time;
    for (const c of run) c.target?.remove();
    run.length = 0;
    outAt = 0;
    nextLay = time + 1600;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; nextLay = time + 1200; ctx.banner('SHE BUILDS DOWN, KING TO ACE — STRIKE A CARD TO SNAP HER RUN', '#f7dc84'); }
      if (!fast && npc.hp < npc.maxHp * 0.5) { fast = true; ctx.banner('SHE LAYS FASTER', '#f7dc84'); ctx.sfx('status-buff'); }

      if (!outAt && time >= nextLay && run.length < RUN) {
        lay(time);
        nextLay = time + (fast ? LAY_FAST_MS : LAY_MS);
      }
      for (const c of run) {
        if (!c.target && landed(c, time)) {
          c.target = ctx.target({ x: c.x, y: c.y, r: 22, passThrough: true, onStruck: () => struck(c) });
          ctx.sfx('trap-set');
        }
      }
      if (!outAt && run.length === RUN && landed(run[RUN - 1], time)) { outAt = time + tk.warn(OUT_WARN); ctx.sfx('beam-charge'); }
      if (outAt && time >= outAt) comeOut(time);

      // Taut threads burn on their own clock and drag at the feet.
      npcOnThread = false;
      for (const f of [player, npc]) {
        if (!alive(f) || nearestThread(f.x, f.y, time).d >= TOUCH) continue;
        if (f === npc) npcOnThread = true; else tk.slowPlayer(0.7, 300);
        if (time - (lastBurn.get(f) ?? -1e9) >= BURN_MS) { lastBurn.set(f, time); ctx.hit(f, BURN, f.x, f.y); }
      }
      for (let i = whips.length - 1; i >= 0; i--) if (time - whips[i].at > SNAP_SHOW) whips.splice(i, 1);
    },

    npcSpeedMult: () => (npcOnThread ? 0.7 : 1),

    npcSeek() {
      const t = now;
      const own = nearestThread(npc.x, npc.y, t);
      // The run is coming out, or she is on a thread: step clear of it.
      if ((outAt && own.d < 80) || own.d < 44) {
        const a = run[own.i - 1], b = run[own.i];
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        const side = (npc.x - a.x) * (-dy / l) + (npc.y - a.y) * (dx / l) >= 0 ? 1 : -1;
        return { x: clamp(npc.x - (dy / l) * 90 * side, 50, W - 50), y: clamp(npc.y + (dx / l) * 90 * side, top + 50, H - 40) };
      }
      // You are across a thread: go and pull a card upstream of it to snap it on you.
      const yours = nearestThread(player.x, player.y, t);
      if (!outAt && yours.d < 40) {
        let best: RunCard | null = null;
        for (let k = 0; k <= yours.i; k++) {
          const c = run[k];
          if (!c.target) continue;
          if (!best || dist(npc.x, npc.y, c.x, c.y) < dist(npc.x, npc.y, best.x, best.y)) best = c;
        }
        if (best && dist(npc.x, npc.y, best.x, best.y) < 280) return { x: best.x, y: best.y };
      }
      return null;
    },

    drawGround(g, time) {
      // The threads: a shadow, the gilt, a bright twist; they hum when taut.
      const warn = outAt ? clamp(1 - (outAt - time) / OUT_WARN, 0, 1) : 0;
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1], b = run[i];
        if (!landed(b, time)) continue;
        const taut = live(i, time);
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        const hum = taut ? Math.sin(time / 26 + i) * (1 + warn * 3) : 6 * (1 - clamp((time - b.layAt - FLY_MS) / TAUT_MS, 0, 1));
        const mx = (a.x + b.x) / 2 + nx * hum, my = (a.y + b.y) / 2 + ny * hum;
        g.lineStyle(5, 0x000000, 0.25); g.lineBetween(a.x + 2, a.y + 3, mx + 2, my + 3); g.lineBetween(mx + 2, my + 3, b.x + 2, b.y + 3);
        const col = warn > 0 ? lit(GILT, warn * 0.8) : GILT;
        g.lineStyle(taut ? 3 + warn * 3 : 2, taut ? col : GILT_DARK, taut ? 1 : 0.6);
        g.lineBetween(a.x, a.y, mx, my); g.lineBetween(mx, my, b.x, b.y);
        if (taut) {
          g.lineStyle(1, GILT_LIT, 0.9); g.lineBetween(a.x, a.y - 1, mx, my - 1); g.lineBetween(mx, my - 1, b.x, b.y - 1);
          // Little heat-shimmer sparks running down the thread.
          for (let s = 0; s < 3; s++) {
            const k = ((time / 700 + s / 3 + i * 0.17) % 1);
            const px = a.x + dx * k + nx * hum * Math.sin(k * Math.PI), py = a.y + dy * k + ny * hum * Math.sin(k * Math.PI);
            glow(g, px, py, 6 + warn * 6, GILT_LIT, 0.12, 2);
          }
        }
      }
      // The cards of the run, each pinned with a brass tack where the thread is tied.
      run.forEach((c, i) => {
        if (!landed(c, time)) return;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(c.x + 2, c.y + 4, CW + 8, CH * 0.5);
        if (warn > 0) glow(g, c.x, c.y, 26, GILT_LIT, 0.08 * warn, 3);
        rankCard(g, c.x, c.y, CW, CH, c.ang, c.rank, c.suit);
        g.fillStyle(GILT_DARK, 1); g.fillCircle(c.x, c.y, 3.4);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(c.x - 0.8, c.y - 0.8, 1.6);
        if (i === run.length - 1 && !outAt) { g.lineStyle(1.5, GILT_LIT, 0.4 + Math.sin(time / 120) * 0.3); g.strokeCircle(c.x, c.y, 26); }
      });
      // The run coming out: a blaze along where the threads were.
      const k = (time - outFlash) / 420;
      if (outFlash && k < 1) glow(g, W / 2, (top + H) / 2, 320 * (0.6 + k), GILT_LIT, 0.05 * (1 - k), 3);
    },

    drawAir(g, time) {
      // Cards in flight from her fingers, spinning, with the line they will land along.
      for (const c of run) {
        const k = (time - c.layAt) / FLY_MS;
        if (k >= 1) continue;
        const prev = run[run.indexOf(c) - 1];
        if (prev) {
          g.lineStyle(1, GILT, 0.45);
          const n = 10;
          for (let s = 0; s < n; s += 2) g.lineBetween(prev.x + (c.x - prev.x) * (s / n), prev.y + (c.y - prev.y) * (s / n), prev.x + (c.x - prev.x) * ((s + 1) / n), prev.y + (c.y - prev.y) * ((s + 1) / n));
        }
        g.lineStyle(1.5, GILT, 0.6); g.strokeCircle(c.x, c.y, 10 + (1 - k) * 18);
        const x = c.fromX + (c.x - c.fromX) * k, y = c.fromY + (c.y - c.fromY) * k - Math.sin(k * Math.PI) * 60;
        g.fillStyle(0x000000, 0.2); g.fillEllipse(c.fromX + (c.x - c.fromX) * k, c.fromY + 20 + (c.y - c.fromY - 20) * k, 20, 8);
        const turn = time / 60;
        rankCard(g, x, y, CW * Math.max(0.15, Math.abs(Math.cos(turn))), CH, c.ang + k * 4, c.rank, c.suit);
      }
      // Snapped threads whip back in a curl and fray.
      for (const w of whips) {
        const k = clamp((time - w.at) / SNAP_SHOW, 0, 1);
        const dx = w.bx - w.ax, dy = w.by - w.ay, l = Math.hypot(dx, dy) || 1;
        const nx = -dy / l, ny = dx / l;
        const reach = 1 - k * 0.8;
        let px = w.ax, py = w.ay;
        for (let s = 1; s <= 8; s++) {
          const t = (s / 8) * reach;
          const curl = Math.sin(t * Math.PI * 2 + k * 6) * 26 * k * w.side;
          const x = w.ax + dx * t + nx * curl, y = w.ay + dy * t + ny * curl;
          g.lineStyle(3 * (1 - k) + 1, GILT_LIT, 1 - k); g.lineBetween(px, py, x, y);
          px = x; py = y;
        }
        g.lineStyle(2, IVORY, 1 - k); g.strokeCircle(px, py, 4 + k * 10);
      }
      // Her deck in hand, waiting: a short squared stack with the next card showing.
      if (alive(npc) && run.length < RUN && !outAt) {
        const hx = npc.x + 22, hy = npc.y - 30;
        for (let s = 0; s < 4; s++) card(g, hx + s * 0.6, hy - s * 0.8, 12, 17, 0.2, { face: false, back: MAHOGANY, cheap: true });
      }
    },

    drawHud(g) {
      // The tableau rail: thirteen slots, king to ace, filled as the run goes down.
      const sw = 22, gap = 4, x0 = W / 2 - (RUN * (sw + gap)) / 2, y0 = top + 8;
      g.fillStyle(MAHOGANY_DARK, 0.85); g.fillRoundedRect(x0 - 10, y0 - 6, RUN * (sw + gap) + 16, 44, 6);
      g.lineStyle(2, GILT_DARK, 1); g.strokeRoundedRect(x0 - 10, y0 - 6, RUN * (sw + gap) + 16, 44, 6);
      g.fillStyle(BAIZE_DEEP, 1); g.fillRect(x0 - 4, y0 - 1, RUN * (sw + gap) + 4, 34);
      for (let i = 0; i < RUN; i++) {
        const x = x0 + i * (sw + gap) + sw / 2, y = y0 + 16;
        const c = run[i];
        if (c) rankCard(g, x, y, sw - 2, 30, 0, c.rank, c.suit);
        else { g.lineStyle(1, GILT_DARK, 0.7); g.strokeRoundedRect(x - sw / 2 + 1, y - 15, sw - 2, 30, 2); g.fillStyle(CARD_BLACK, 0.3); g.fillRoundedRect(x - sw / 2 + 1, y - 15, sw - 2, 30, 2); }
      }
      if (outAt) { g.lineStyle(2, GILT_LIT, 0.6 + Math.sin(now / 50) * 0.4); g.strokeRoundedRect(x0 - 12, y0 - 8, RUN * (sw + gap) + 20, 48, 7); }
    },

    destroy() { for (const c of run) c.target?.remove(); },
  };
}

export const FALLEN_PATIENCE: GimmickDef = {
  id: ID,
  rules: 'She lays a run near you, king to ace, tied by burning gilt threads; at the ace every thread blazes. Strike a card to snap the threads after it.',
  make,
};
